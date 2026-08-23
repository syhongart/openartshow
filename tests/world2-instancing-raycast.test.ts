// 인스턴스 레이캐스트 — **「가끔 안 집힌다」가 기본 동작인 지뢰**를 실증하고, 처방이
// 실제로 그것을 없애는지 본다.
//
// ── 왜 이 축이 필요한가 ─────────────────────────────────────────────────────
// three 의 `InstancedMesh.raycast()` 는 `boundingSphere` 로 먼저 거른 뒤에야 인스턴스를
// 훑는다. 그 경계구는 **한 번 계산되면 캐시되고 `setMatrixAt` 이 무효화하지 않는다.**
// 이 저장소는 부팅 때 전 슬롯을 `ZERO` 행렬로 채우므로 첫 계산이 **원점 근처의 작은 구**로
// 잡히고, 그 뒤 파셀이 아무리 멀리 채워져도 광선이 그 구를 안 지나면 인스턴스를 아예 안 본다.
//
// **경고도 예외도 없다.** 그래서 처방(`refreshBounds()`)을 넣었다는 말만 남기면 다음
// 사람이 그것을 지워도 아무 일이 안 일어난다 — 화면에서 «어떤 건물은 안 집힌다» 로만
// 드러나고, 그 형태는 재현이 어렵다.
//
// ⚠ `frustumCulled = false` 는 이것을 안 막는다 — 그것은 **렌더** 컬링만 끈다.
// 아래 첫 축이 그 사실 자체를 실측으로 못 박는다.

import { describe, it, expect, afterEach } from 'vitest';
import * as THREE from 'three/webgpu';
import { InstancePools } from '../frontend/js/world2/systems/instancing.js';

let pools: InstancePools | null = null;
afterEach(() => { pools?.dispose(); pools = null; });

/** 원점에서 멀리 떨어진 자리 — 부팅 시 경계구(원점 근처) 밖이다 */
const FAR_X = 400;

function setup() {
  const scene = new THREE.Scene();
  const p = new InstancePools(scene);
  pools = p;
  p.create({
    key: 'building',
    geometry: new THREE.BoxGeometry(4, 8, 4),
    material: new THREE.MeshBasicMaterial(),
    max: 16,
  });
  return p;
}

/** 위에서 아래로 내려꽂아 그 자리를 맞힌다 */
function castDown(p: InstancePools, x: number, z: number) {
  const ray = new THREE.Raycaster();
  ray.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
  return ray.intersectObjects(p.raycastTargets(), false);
}

describe('인스턴스 레이캐스트 — 경계구 캐시 지뢰', () => {
  it('★ `refreshBounds()` 없이는 멀리 있는 인스턴스가 안 잡힌다 — 지뢰 실증', () => {
    const p = setup();
    // 부팅 직후 전 슬롯이 ZERO 라 여기서 경계구가 원점 근처로 굳는다.
    p.raycastTargets()[0].traverse(() => { });
    (p.raycastTargets()[0] as THREE.InstancedMesh).computeBoundingSphere();

    const h = p.acquire('building');
    expect(h, '슬롯을 못 얻으면 이 축이 공허해진다').not.toBeNull();
    p.setTransform(h!, FAR_X, 4, 0);
    p.flush();

    const hits = castDown(p, FAR_X, 0);
    expect(
      hits.length,
      '★ 이 축이 초록이 되면 three 가 경계구를 스스로 무효화하기 시작한 것이다 —'
      + ' 그러면 `refreshBounds()` 의 존재 이유가 사라지므로 그것을 다시 판정하라.',
    ).toBe(0);
  });

  it('★ `refreshBounds()` 를 부르면 잡힌다 — 처방이 실제로 듣는다', () => {
    const p = setup();
    (p.raycastTargets()[0] as THREE.InstancedMesh).computeBoundingSphere();

    const h = p.acquire('building')!;
    p.setTransform(h, FAR_X, 4, 0);
    p.flush();
    p.refreshBounds();

    expect(castDown(p, FAR_X, 0).length, '★ 처방을 걸었는데도 안 잡힌다').toBeGreaterThan(0);
  });

  it('맞힌 인스턴스에서 슬롯 핸들을 되찾는다', () => {
    const p = setup();
    const h = p.acquire('building')!;
    p.setTransform(h, FAR_X, 4, 0);
    p.flush();
    p.refreshBounds();

    const hit = castDown(p, FAR_X, 0)[0];
    expect(hit, '맞은 것이 있어야 한다').toBeTruthy();
    expect(hit.instanceId, 'InstancedMesh 는 instanceId 를 준다').toBeTypeOf('number');

    const owner = p.ownerAt(hit.object, hit.instanceId!);
    expect(owner, '★ 역인덱스가 핸들을 못 돌려준다 — 어느 파츠인지 알 수 없다').not.toBeNull();
    expect(owner!.key).toBe('building');
    expect(owner!.index).toBe(h.index);
  });

  it('모르는 메시·범위 밖 번호는 null — 조용히 엉뚱한 것을 돌려주지 않는다', () => {
    const p = setup();
    const h = p.acquire('building')!;
    p.setTransform(h, 0, 0, 0);
    p.flush();
    expect(p.ownerAt(new THREE.Object3D(), 0), '남의 메시').toBeNull();
    expect(p.ownerAt(p.raycastTargets()[0], 9999), '범위 밖 번호').toBeNull();
  });

  it('레이캐스트 대상은 인스턴스 메시뿐이다 — 하늘·지면이 섞이면 못 집을 것을 집는다', () => {
    const p = setup();
    const targets = p.raycastTargets();
    expect(targets.length).toBe(1);
    expect(targets[0]).toBeInstanceOf(THREE.InstancedMesh);
  });
});

// ── 죽은 핸들 (W5 E2.5 선결, 팀장 조건 (나)-1) ──────────────────────────────
//
// 편집이 조작 중 **매 프레임** 슬롯 자세를 다시 쓰게 되면서 창이 하나 열렸다:
// 조작하는 동안 카메라가 멀어지면 스트리밍이 그 파셀을 반납하고, 편집이 쥔 핸들이
// 그 순간 죽는다. 그 뒤 호출이 `index = -1` 로 들어간다.
//
// ⚠ **이 절이 그 창을 실제로 재현한다** — 「부재를 grep 으로 판정하지 않는다」(W4 반려
// B1 의 교훈)이므로, 「그런 경로가 있을 것이다」가 아니라 **핸들을 쥔 채 반납이 일어나고
// 그 핸들이 죽는다**를 실물 `InstancePools` 로 보인다.
//
// 재는 것은 **업로드 구간의 오염**이다. `setMatrixAt(-1, …)` 자체는 Float32Array 의
// 음수 인덱스 쓰기라 조용히 버려지지만, 짝인 `touch(p, -1)` 은 `loRange` 를 -1 로
// 낮추고 그것이 `flush()` 에서 `start: -16` 으로 GPU 에 나간다.
describe('죽은 핸들에 자세를 쓰지 않는다 — setColor 와 대칭', () => {
  it('★ 핸들을 쥔 채 반납이 일어나고, 그 핸들은 죽는다 (창의 실재)', () => {
    const p = setup();
    const h = p.acquire('building')!;
    p.setTransform(h, FAR_X, 0, 0);
    expect(h.index, '점유 직후에는 살아 있다').toBeGreaterThanOrEqual(0);
    // 스트리밍이 그 파셀을 걷는다 — 편집은 이 호출을 모른다(다른 System 이다).
    p.release(h);
    expect(h.index, '★ 반납해도 핸들이 살아 있는 것처럼 보인다 — 그러면 남의 슬롯을 민다')
      .toBe(-1);
  });

  it('★ 죽은 핸들로 자세를 쓰면 업로드 구간이 오염되지 않는다', () => {
    const p = setup();
    const live = p.acquire('building')!;
    const dead = p.acquire('building')!;
    p.setTransform(live, FAR_X, 0, 0);
    p.release(dead);

    // 살아 있는 슬롯 하나를 정상적으로 민다 — 여기까지가 정상 구간이다.
    p.setTransform(live, FAR_X + 1, 0, 0);
    // 그리고 편집이 죽은 핸들로 한 번 더 민다(조작 중 반납된 그 프레임).
    p.setTransform(dead, FAR_X + 2, 0, 0);
    p.flush();

    const attr = p.raycastTargets()[0] as THREE.InstancedMesh;
    const a = attr.instanceMatrix as unknown as {
      updateRanges?: { start: number; count: number }[];
      updateRange?: { offset: number; count: number };
    };
    const start = a.updateRanges?.[0]?.start ?? a.updateRange?.offset ?? 0;
    expect(start, '★ 업로드 구간이 음수로 시작한다 — 죽은 핸들(-1)이 loRange 를 낮췄다')
      .toBeGreaterThanOrEqual(0);
  });

  it('★ 죽은 핸들이 살아 있는 슬롯의 자세를 덮지 않는다', () => {
    const p = setup();
    const live = p.acquire('building')!;
    const dead = p.acquire('building')!;
    p.setTransform(live, FAR_X, 7, 0);
    p.release(dead);
    p.setTransform(dead, -999, -999, -999);

    const mesh = p.raycastTargets()[0] as THREE.InstancedMesh;
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(live.index, m);
    expect(m.elements[13], '★ 죽은 핸들이 남의 슬롯을 밀었다').toBeCloseTo(7, 6);
  });

  it('★ 반납 swap 은 이사 온 핸들의 index 를 **제자리** 고친다 — 편집이 쥔 채로 산다', () => {
    // E2.5 가 이것에 의존한다: 편집이 고를 때 받은 핸들을 조작 내내 들고 있는데,
    // 그 사이 **다른** 파셀이 반납되면 swap 이 일어나 내 인스턴스가 이사할 수 있다.
    // 핸들이 제자리 갱신되지 않으면 그때부터 남의 슬롯을 민다.
    const p = setup();
    const a = p.acquire('building')!;
    const b = p.acquire('building')!;
    p.setTransform(a, 10, 1, 0);
    p.setTransform(b, 20, 2, 0);
    const bWas = b.index;
    p.release(a); // 마지막(b)이 a 자리로 이사한다

    expect(b.index, '★ 이사 온 핸들의 index 가 안 고쳐졌다').not.toBe(bWas);
    const mesh = p.raycastTargets()[0] as THREE.InstancedMesh;
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(b.index, m);
    expect(m.elements[13], '★ 핸들이 가리키는 자리에 그 파츠가 없다').toBeCloseTo(2, 6);
  });
});
