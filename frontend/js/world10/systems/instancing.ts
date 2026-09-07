// world-glb/systems/instancing.ts — 사전 할당 슬롯 풀. **개수 불변식의 심장.**
//
// ── 이 파일이 하는 일 ────────────────────────────────────────────────────────
// 부팅 시 (지오·재질·tier) 조합마다 InstancedMesh를 **하나씩** 만들고 최대 인스턴스 수로
// 고정한다. 그 뒤 파셀 로드는 "슬롯 점유", 언로드는 "슬롯 반납"이다. 씬에 객체가 추가되거나
// 제거되는 일이 없으므로 재질·지오·파이프라인·드로우콜 개수가 세션 내내 상수다.
//
// ── 왜 이렇게까지 하는가 ─────────────────────────────────────────────────────
// 지금까지 재컴파일을 근본 제거한 처방은 라이트 풀 하나였다. 조명 **개수**를 상수로 고정한
// 것뿐인데 프로그램 캐시가 경계마다 10→48로 튀던 것이 10→12 상수가 되고, 프레임타임 총량이
// 21,114ms → 2,253ms(10.7%)가 됐다. 같은 원리를 지오·재질까지 밀면 파셀 승격 스파이크의
// 원인 자체가 사라진다.
//
// 그 스파이크의 정체는 실측으로 좁혀져 있다 — 파셀 1개 승격 시 **머티리얼 19개·지오 44개**가
// 새로 태어난다. 그리고 비용은 데이터 크기가 아니라 **새 조합의 개수**에 비례한다. 텍스처를
// 58% 깎아도(24.69MB→10.35MB) 스파이크가 그대로였던 이유가 이것이다 — 같은 파셀이 여전히
// 같은 수의 새 조합을 만들었다.
//
// ── 규약 ─────────────────────────────────────────────────────────────────────
// · 미사용 슬롯은 **0 스케일 행렬**로 밀어낸다. `visible=false`나 `count` 축소를 쓰지 않는다 —
//   three는 visible=false를 renderList 등재 **전에** 컷하므로 그 물체의 GPU 리소스 생성이
//   전부 "처음 보이는 프레임"으로 밀린다. 그게 바로 우리가 없애려는 스파이크다.
// · 슬롯 해제는 **마지막 요소와 swap**한다(단편화 방지). hyperfy Stage가 쓰는 방식인데
//   GPL이라 코드가 아니라 원리만 가져왔다.
// · `instanceMatrix.updateRange`로 부분 갱신한다 — 전체 버퍼 재업로드를 피한다.

import * as THREE from 'three/webgpu';

/** 0 스케일 행렬 — 미사용 슬롯을 화면에서 지우는 유일한 수단 */
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
/** 슬롯 반납 시 색을 옮기는 임시 버퍼 */
const _c = new THREE.Color();

/**
 * 인스턴스 속성의 일부 구간만 GPU 로 올린다.
 *
 * three r171 에서 `updateRange`(단일 객체)가 `updateRanges`(배열)로 바뀌었고, 둘 다
 * **요소 단위**라 인스턴스 인덱스에 요소 폭을 곱해야 한다(행렬 16, 색 3).
 * 이 환산이 두 곳에 흩어져 있으면 한쪽만 고쳐도 아무도 모른다 — 그래서 한 함수다.
 */
function uploadRange(attr: THREE.InstancedBufferAttribute, lo: number, hi: number, stride: number): void {
  const a = attr as unknown as {
    updateRanges?: { start: number; count: number }[];
    updateRange?: { offset: number; count: number };
    needsUpdate: boolean;
  };
  if (a.updateRanges) {
    a.updateRanges.length = 0;
    a.updateRanges.push({ start: lo * stride, count: (hi - lo + 1) * stride });
  } else if (a.updateRange) {
    a.updateRange.offset = lo * stride;
    a.updateRange.count = (hi - lo + 1) * stride;
  }
  a.needsUpdate = true;
}

export interface SlotHandle {
  /** 이 핸들이 속한 풀 키 */
  key: string;
  /** InstancedMesh 안의 인스턴스 인덱스 */
  index: number;
}

export interface PoolSpec {
  key: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  max: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

interface Pool {
  spec: PoolSpec;
  mesh: THREE.InstancedMesh;
  /** 사용 중인 슬롯 수. 이 값 뒤쪽은 전부 0 스케일이다 */
  used: number;
  /** index → 그 슬롯을 쥔 핸들. swap 시 핸들의 index를 고쳐주기 위해 필요 */
  owners: (SlotHandle | null)[];
  loRange: number;
  hiRange: number;
  /** 색 갱신 구간. 행렬과 따로 잡는다 — 페이드는 색만 만지고 행렬은 안 만진다 */
  loColor: number;
  hiColor: number;
}

export class InstancePools {
  private pools = new Map<string, Pool>();
  private group = new THREE.Group();

  constructor(parent: THREE.Object3D) {
    this.group.name = 'glb-world:instances';
    parent.add(this.group);
  }

  /**
   * 풀을 만든다. **부팅 중에만** 호출해야 한다 — 세션 도중 풀이 늘면 개수 불변식이 깨진다.
   * 이 규약은 `sealed()`로 강제한다.
   */
  create(spec: PoolSpec): void {
    if (this.sealedAt !== null) {
      throw new Error(`[glb-world] 풀 생성은 부팅 중에만 허용된다(개수 불변식). key=${spec.key}`);
    }
    if (this.pools.has(spec.key)) throw new Error(`[glb-world] 중복 풀 키: ${spec.key}`);
    const mesh = new THREE.InstancedMesh(spec.geometry, spec.material, spec.max);
    // 매 프레임 행렬을 쓰므로 정적 힌트를 주지 않는다.
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = !!spec.castShadow;
    mesh.receiveShadow = !!spec.receiveShadow;
    mesh.frustumCulled = false; // 인스턴스가 넓게 퍼지므로 메시 단위 컬링은 오판만 만든다
    mesh.name = `pool:${spec.key}`;
    // 전 슬롯을 0 스케일로 초기화 — 부팅 프레임에 쓰레기 행렬이 그려지지 않게.
    for (let i = 0; i < spec.max; i++) mesh.setMatrixAt(i, ZERO);
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
    this.pools.set(spec.key, {
      spec, mesh, used: 0, owners: new Array(spec.max).fill(null),
      loRange: 0, hiRange: -1, loColor: 0, hiColor: -1,
    });
  }

  private sealedAt: number | null = null;

  /** 부팅 종료 선언. 이후 풀 생성은 예외다. 봉인 시점의 풀 수를 기록해 검증에 쓴다. */
  seal(): number {
    this.sealedAt = this.pools.size;
    return this.sealedAt;
  }

  get sealedPoolCount(): number | null { return this.sealedAt; }
  get poolCount(): number { return this.pools.size; }

  /** 풀이 있는가 — 소비자가 없는 키를 조용히 무시하지 않게 명시 확인용 */
  has(key: string): boolean { return this.pools.has(key); }

  // ── 레이캐스트 지원 (편집 모드 전용) ────────────────────────────────────
  // 라이브는 이 셋을 안 부른다. `?edit=1` 에서 마을 파츠를 **클릭으로 집기** 위한 문이다.

  /**
   * 레이캐스트 대상 메시들. `intersectObjects` 에 그대로 넘긴다.
   *
   * 씬 그래프를 훑지 않고 여기서 주는 이유: 이 그룹 아래에는 인스턴스 메시만 있고,
   * 소비자가 `scene` 을 뒤지기 시작하면 하늘·지면·GLB 까지 걸려 «집을 수 없는 것을
   * 집었다» 가 된다.
   */
  raycastTargets(): THREE.Object3D[] {
    return [...this.pools.values()].map((p) => p.mesh);
  }

  /**
   * ⚠⚠ **레이캐스트 전에 반드시 부른다.** 안 부르면 «멀리 있는 것이 가끔 안 집힌다» 가
   * **기본 동작**이고 경고도 예외도 없다.
   *
   * 이유: three 의 `InstancedMesh.raycast()` 는 `boundingSphere` 로 먼저 거른 뒤에야
   * 인스턴스를 훑는다. 그런데 그 경계구는 **한 번 계산되면 캐시되고 `setMatrixAt` 이
   * 무효화하지 않는다.** 이 저장소에서는 특히 위험한데, 부팅 때 전 슬롯을 `ZERO` 행렬로
   * 채우므로(`create()`) 첫 계산이 **원점 근처의 작은 구**로 잡힌다 — 그 뒤 파셀이
   * 아무리 멀리 채워져도 광선이 그 구를 안 지나면 **인스턴스를 아예 안 본다.**
   *
   * ⚠ `frustumCulled = false` 는 이것을 안 막는다 — 그것은 **렌더** 컬링만 끈다.
   * 레이캐스트는 별개 경로이고 경계구를 그대로 본다.
   *
   * 비용은 «쓰는 슬롯 수만큼 훑기» 이고 **클릭당 한 번**이라 무시할 만하다. 스트리밍이
   * 계속 도는 세계라 캐시를 살려 둘 방법이 마땅치 않다 — 매번 다시 잡는 쪽이 안전하다.
   */
  refreshBounds(): void {
    for (const p of this.pools.values()) {
      p.mesh.computeBoundingSphere();
    }
  }

  /**
   * 레이캐스트가 맞힌 (메시, 인스턴스 번호) → 그 슬롯을 쥔 핸들. 없으면 `null`.
   *
   * `owners` 는 슬롯 반납 때 **swap-remove** 로 재배치되므로(`release`), 여기서 얻은
   * 핸들은 **그 순간의 것**이다. 오래 들고 있으면 다른 파츠를 가리키게 된다 — 집은
   * 즉시 «어느 파셀의 무엇인가» 로 환원하고 핸들 자체를 보관하지 마라.
   */
  ownerAt(mesh: THREE.Object3D, instanceId: number): SlotHandle | null {
    for (const p of this.pools.values()) {
      if (p.mesh !== mesh) continue;
      if (instanceId < 0 || instanceId >= p.owners.length) return null;
      return p.owners[instanceId];
    }
    return null;
  }

  /**
   * 그 종류의 재질. 없으면 `null`.
   *
   * ── 무엇을 만져도 되는가 ───────────────────────────────────────────────
   * **uniform 값만** 만진다 — 색·강도처럼 셰이더에 숫자로 들어가는 것들이다.
   * `map`·`transparent`·`vertexColors` 같은 **구조 신호는 절대 바꾸지 않는다.** 그것들은
   * `getProgramCacheKey` 의 축이라, 세션 도중에 바꾸면 그 재질을 쓰는 모든 것이 다시
   * 컴파일된다. 이 저장소가 라이트 풀로 겨우 상수로 만든 그 숫자다.
   *
   * 밤에 가로등을 켜는 것이 첫 소비자다(`emissiveIntensity` — uniform 이다).
   */
  materialOf(key: string): THREE.Material | null {
    return this.pools.get(key)?.spec.material ?? null;
  }

  /**
   * 슬롯을 하나 점유한다. 풀이 꽉 찼으면 null — **조용히 늘리지 않는다.**
   * 여기서 max를 키우면 그 순간 개수 불변식이 깨지고, 그게 우리가 없애려는 스파이크다.
   * 꽉 찬 건 설계 예산이 틀렸다는 신호이므로 호출자가 알아야 한다.
   */
  acquire(key: string): SlotHandle | null {
    const p = this.pools.get(key);
    if (!p) return null;
    if (p.used >= p.spec.max) return null;
    const index = p.used++;
    const h: SlotHandle = { key, index };
    p.owners[index] = h;
    return h;
  }

  /**
   * 슬롯 행렬을 쓴다. 위치·회전·스케일만 — 재질은 절대 만지지 않는다(파이프라인 재생성).
   *
   * ⚠ **죽은 핸들 가드는 2026-08-13 에 붙었다** — 그전까지 `setColor`(아래)에만 있고
   * 여기에는 없는 **비대칭**이었다. 그 비대칭이 조용했던 이유는 이 메서드를 부르는 곳이
   * 빌더의 `acquire` 직후(항상 살아 있다)와 `retarget` 체인(그쪽에 이미 자기 가드가
   * 있다)뿐이었기 때문이다. 즉 **동작 변경 0** 이고, 여는 것은 새 소비자를 위한 안전이다.
   *
   * 편집이 조작 중 매 프레임 이것을 타면서 창이 열린다: 조작하는 동안 카메라가 멀어지면
   * 스트리밍이 그 파셀을 반납하고 핸들이 죽는다(`release` 가 `index = -1` 을 박는다).
   * 가드가 없으면 `setMatrixAt(-1, …)` 과 `touch(p, -1)` 이 불려 **업로드 구간(`loRange`)이
   * 음수로 오염된다.**
   *
   * ⚠⚠ 이 가드는 버퍼 오염만 막는다 — **조작 대상이 사라진 것을 화면이 말하는 일은
   * 별개다**(팀장 조건, 2026-08-13). 조용히 no-op 만 남기면 «가끔 안 움직인다» 가 된다.
   * 그 축은 편집 쪽(`edit/target.ts` 의 `onDetach`)이 소유한다.
   */
  setTransform(h: SlotHandle, x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1): void {
    const p = this.pools.get(h.key);
    if (!p) return;
    if (h.index < 0) return; // 죽은 핸들 — 남의 슬롯을 밀지 않는다(`setColor` 와 짝)
    _v.set(x, y, z);
    _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    _s.set(sx, sy, sz);
    _m.compose(_v, _q, _s);
    p.mesh.setMatrixAt(h.index, _m);
    this.touch(p, h.index);
  }

  /**
   * 인스턴스 색. instanceColor는 파이프라인 캐시키를 늘리지 않는다(구조 신호가 아니다).
   *
   * ── 매 프레임 불릴 수 있다 ─────────────────────────────────────────────
   * LOD 페이드(`systems/parcel-fade.ts`)가 등장 중인 슬롯 색을 프레임마다 고쳐 쓴다.
   * 그래서 행렬과 **같은 방식으로 구간만** 올린다 — 예전에는 여기서 곧장
   * `needsUpdate = true` 를 세워 풀 전체(max×3 float)를 매번 재업로드했다.
   *
   * ── usage 는 Dynamic 이어야 한다 (#216 해소, 감독 마크 실측 2026-08-11) ──
   * 이 버퍼는 오래 기본값(StaticDrawUsage)으로 만들어지고 있었다 — 갱신 빈도는 위
   * 문단대로 "매 프레임"인데 선언은 "안 바뀐다"였다(행렬만 Dynamic 인 비대칭, 검수관
   * 성능 권고 #216). WebGPU 백엔드는 이 선언을 업로드 전략에 쓰므로, static 선언
   * 버퍼가 갱신되는 프레임에 **재할당된 GPU 버퍼(0 초기화 = 검정)가 한 프레임
   * 그려질 수 있다.** 감독 실기기 마크(전진 중 "회색 건물이 순간 검정→본색")의
   * ±2.5s 창에서 앞쪽 사건이 파셀생성(색 일괄 setTone) 하나뿐이었고, 그림자 off·
   * GLB off·색 페이드 off 에서도 남았다 — 이 비대칭이 마지막 용의자였다.
   * **확정** — Dynamic 전환 배포 후 감독 실기기 "정확히 개선 되었어"(2026-08-11).
   * 이 setUsage 를 지우면 WebGPU 실기기에서만 재발하고 헤드리스는 못 잡는다.
   */
  setColor(h: SlotHandle, color: THREE.Color): void {
    const p = this.pools.get(h.key);
    if (!p) return;
    if (h.index < 0) return; // 죽은 핸들 — 남의 슬롯을 칠하지 않는다
    if (!p.mesh.instanceColor) {
      // 최초 1회만 생성 — 이것도 부팅 중에 미리 깨워두는 게 좋다(warmColors 참조).
      p.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(p.spec.max * 3).fill(1), 3);
      p.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    p.mesh.setColorAt(h.index, color);
    this.touchColor(p, h.index);
  }

  /**
   * 부팅 중에 instanceColor 버퍼를 미리 만든다. 세션 도중 처음 setColor가 불리면
   * 그 프레임에 버퍼가 새로 생겨 업로드 스파이크가 된다 — 그것도 "첫 드로우" 비용이다.
   */
  warmColors(key: string): void {
    const p = this.pools.get(key);
    if (!p || p.mesh.instanceColor) return;
    p.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(p.spec.max * 3).fill(1), 3);
    // 행렬(위 setUsage)과 같은 이유 + 같은 실측 — usage 는 생성 직후 여기서만 정한다.
    p.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    p.mesh.instanceColor.needsUpdate = true;
  }

  /**
   * 슬롯을 반납한다. 마지막 사용 슬롯을 이 자리로 옮기고(swap) 꼬리를 0 스케일로 지운다.
   * 옮겨온 슬롯의 핸들 index를 **제자리에서 고쳐준다** — 호출자가 쥔 핸들이 살아있어야 한다.
   */
  release(h: SlotHandle): void {
    const p = this.pools.get(h.key);
    if (!p) return;
    const last = p.used - 1;
    if (last < 0 || h.index > last) return; // 이미 반납됨 — 이중 해제 안전
    if (h.index !== last) {
      p.mesh.getMatrixAt(last, _m);
      p.mesh.setMatrixAt(h.index, _m);
      // ── 색도 함께 옮긴다 ──────────────────────────────────────────────
      // 오래 빠져 있던 부분이다. 행렬만 옮기면 이사 온 인스턴스가 **그 자리에 남아
      // 있던 옛 색**을 물려받는다. tone 팔레트가 같은 종류 안에서 서로 비슷해 눈에 잘
      // 안 띄었을 뿐이고, LOD 페이드가 붙으면 "등장 중이라 안개색인 슬롯" 의 색이
      // 살아 있는 건물에 얹혀 증폭된다. 뮤테이션(이 줄들을 지우면 깨지는가)은
      // `tests/world2-lod-fade.test.ts` §3 이 본다.
      if (p.mesh.instanceColor) {
        p.mesh.getColorAt(last, _c);
        p.mesh.setColorAt(h.index, _c);
        this.touchColor(p, h.index);
      }
      const moved = p.owners[last];
      if (moved) { moved.index = h.index; p.owners[h.index] = moved; }
      this.touch(p, h.index);
    }
    p.mesh.setMatrixAt(last, ZERO);
    p.owners[last] = null;
    p.used = last;
    this.touch(p, last);
    h.index = -1; // 죽은 핸들 표식 — 재사용 시 조용히 남의 슬롯을 만지지 않게
  }

  /** 갱신 구간을 넓힌다. 프레임 끝에 한 번만 업로드한다. */
  private touch(p: Pool, index: number): void {
    if (p.hiRange < p.loRange) { p.loRange = index; p.hiRange = index; return; }
    if (index < p.loRange) p.loRange = index;
    if (index > p.hiRange) p.hiRange = index;
  }

  /** 색 갱신 구간. 행렬과 나눠 두는 이유는 페이드가 색만 만지기 때문이다 */
  private touchColor(p: Pool, index: number): void {
    if (p.hiColor < p.loColor) { p.loColor = index; p.hiColor = index; return; }
    if (index < p.loColor) p.loColor = index;
    if (index > p.hiColor) p.hiColor = index;
  }

  /**
   * 프레임 끝에 부른다. 이번 프레임에 만진 구간만 GPU로 올린다.
   * three r171의 `updateRange`는 요소 단위이므로 행렬 16개분으로 환산한다.
   */
  flush(): void {
    for (const p of this.pools.values()) {
      if (p.hiRange >= p.loRange) {
        uploadRange(p.mesh.instanceMatrix, p.loRange, p.hiRange, 16);
        p.loRange = 0; p.hiRange = -1;
      }
      // 색은 행렬과 **따로** 올린다. 페이드 중에는 색만 바뀌므로, 한 구간으로 묶으면
      // 안 바뀐 행렬까지 매 프레임 재업로드한다.
      if (p.hiColor >= p.loColor && p.mesh.instanceColor) {
        uploadRange(p.mesh.instanceColor, p.loColor, p.hiColor, 3);
        p.loColor = 0; p.hiColor = -1;
      }
    }
  }

  /** 불변식 검사·HUD용 스냅샷. 판정하지 않고 사실만 돌려준다. */
  stats(): { pools: number; meshes: number; used: number; capacity: number; byKey: Record<string, { used: number; max: number }> } {
    let used = 0, capacity = 0;
    const byKey: Record<string, { used: number; max: number }> = {};
    for (const [k, p] of this.pools) {
      used += p.used; capacity += p.spec.max;
      byKey[k] = { used: p.used, max: p.spec.max };
    }
    return { pools: this.pools.size, meshes: this.group.children.length, used, capacity, byKey };
  }

  /**
   * 페이지를 떠날 때만 부른다. 세션 도중 호출하면 개수 불변식이 깨진다.
   * 지오·재질은 **공유 자산일 수 있으므로 여기서 dispose하지 않는다** — P1 사고가 정확히
   * 그것이었다(캐시된 공유 재질을 소비자가 dispose해 다른 소비자를 깨뜨렸다).
   * 소유권이 없는 것을 정리하지 않는 게 이 클래스의 규약이다.
   */
  dispose(): void {
    for (const p of this.pools.values()) {
      this.group.remove(p.mesh);
      p.mesh.dispose(); // InstancedMesh 자신의 instanceMatrix만 회수한다
    }
    this.pools.clear();
    this.group.parent?.remove(this.group);
  }
}
