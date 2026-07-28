// world2/systems/instancing.ts — 사전 할당 슬롯 풀. **개수 불변식의 심장.**
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
}

export class InstancePools {
  private pools = new Map<string, Pool>();
  private group = new THREE.Group();

  constructor(parent: THREE.Object3D) {
    this.group.name = 'world2:instances';
    parent.add(this.group);
  }

  /**
   * 풀을 만든다. **부팅 중에만** 호출해야 한다 — 세션 도중 풀이 늘면 개수 불변식이 깨진다.
   * 이 규약은 `sealed()`로 강제한다.
   */
  create(spec: PoolSpec): void {
    if (this.sealedAt !== null) {
      throw new Error(`[world2] 풀 생성은 부팅 중에만 허용된다(개수 불변식). key=${spec.key}`);
    }
    if (this.pools.has(spec.key)) throw new Error(`[world2] 중복 풀 키: ${spec.key}`);
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
      spec, mesh, used: 0, owners: new Array(spec.max).fill(null), loRange: 0, hiRange: -1,
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

  /** 슬롯 행렬을 쓴다. 위치·회전·스케일만 — 재질은 절대 만지지 않는다(파이프라인 재생성). */
  setTransform(h: SlotHandle, x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1): void {
    const p = this.pools.get(h.key);
    if (!p) return;
    _v.set(x, y, z);
    _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    _s.set(sx, sy, sz);
    _m.compose(_v, _q, _s);
    p.mesh.setMatrixAt(h.index, _m);
    this.touch(p, h.index);
  }

  /** 인스턴스 색. instanceColor는 파이프라인 캐시키를 늘리지 않는다(구조 신호가 아니다). */
  setColor(h: SlotHandle, color: THREE.Color): void {
    const p = this.pools.get(h.key);
    if (!p) return;
    if (!p.mesh.instanceColor) {
      // 최초 1회만 생성 — 이것도 부팅 중에 미리 깨워두는 게 좋다(warmColors 참조).
      p.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(p.spec.max * 3).fill(1), 3);
    }
    p.mesh.setColorAt(h.index, color);
    if (p.mesh.instanceColor) p.mesh.instanceColor.needsUpdate = true;
  }

  /**
   * 부팅 중에 instanceColor 버퍼를 미리 만든다. 세션 도중 처음 setColor가 불리면
   * 그 프레임에 버퍼가 새로 생겨 업로드 스파이크가 된다 — 그것도 "첫 드로우" 비용이다.
   */
  warmColors(key: string): void {
    const p = this.pools.get(key);
    if (!p || p.mesh.instanceColor) return;
    p.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(p.spec.max * 3).fill(1), 3);
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

  /**
   * 프레임 끝에 부른다. 이번 프레임에 만진 구간만 GPU로 올린다.
   * three r171의 `updateRange`는 요소 단위이므로 행렬 16개분으로 환산한다.
   */
  flush(): void {
    for (const p of this.pools.values()) {
      if (p.hiRange < p.loRange) continue;
      const attr: any = p.mesh.instanceMatrix;
      if (attr.updateRanges) {
        // r171+: updateRanges 배열 방식
        attr.updateRanges.length = 0;
        attr.updateRanges.push({ start: p.loRange * 16, count: (p.hiRange - p.loRange + 1) * 16 });
      } else if (attr.updateRange) {
        attr.updateRange.offset = p.loRange * 16;
        attr.updateRange.count = (p.hiRange - p.loRange + 1) * 16;
      }
      attr.needsUpdate = true;
      p.loRange = 0; p.hiRange = -1;
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
