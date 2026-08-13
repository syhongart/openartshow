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
