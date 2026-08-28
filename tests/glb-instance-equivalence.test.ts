// 낱개 입력과 **접힌 입력**이 같은 세계를 만드는가 — 등가성 계약.
//
// ── 왜 (팀장 조건 1, 2026-08-28) ────────────────────────────────────────────
// GLB 를 `EXT_mesh_gpu_instancing` 으로 접으면 three 로더가 `InstancedMesh` 를 준다.
// 그런데 `instanceRepeats` 는 **낱개 메시를 전제**하고 있었다 — `InstancedMesh` 도
// `isMesh === true` 라 필터를 전부 통과한 뒤 `o.matrixWorld` **하나만** 담긴다.
// 인스턴스 행렬은 읽히지 않고 버려진다(저장소 전체에 `getMatrixAt` 호출 0건이었다).
//
// **결과는 「세계가 통째로 사라지는 것」이다.** 실측: 28,707개 배치가 40개로 줄었고
// **콘솔 에러는 0** 이었다. 그래서 수치만 보면 세 사람이 세 방향으로 오독했다 —
// 실행자는 「최적화됨(99.9% 감소)」, 부팀장은 「그림자 보정이 안 걸림」, 팀장은 그 표를
// 판정 근거로 채택. 셋 다 틀렸다.
//
// ⚠ **이 파일은 수정보다 «먼저» 쓰였다**(팀장 조건 1: *"등가성 검사를 수정 전에 먼저
// 써서 현재 결함으로 FAIL 을 실측하고, 수정 후 PASS 로 돌린다"*). 뮤테이션은 결함을
// 인위로 되살리는 것인데, 여기서는 **실물 결함이 아직 살아 있으므로** 그보다 강한
// 검출력 증명이 공짜로 있다. 실측 결과는 파일 하단.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
// · 화면. 등가성이 성립해도 **보이는 것**이 옳은지는 감독 실기기가 판정한다.
// · GLTFLoader 경로. 여기서 만드는 `InstancedMesh` 는 손으로 조립한 것이라, 로더가
//   확장을 실제로 어떻게 푸는지는 안 본다(그쪽은 헤드리스 A/B 소관).

import { describe, it, expect } from 'vitest';
import * as THREE from 'three/webgpu';
import { instanceRepeats } from '../frontend/js/world-glb/systems/glb-instance.js';
import { mountGlbWorld } from '../frontend/js/world-glb/systems/glb-source.js';

/** 배치 하나 — 위치·회전(도)·스케일 */
type Place = [number, number, number, number, number];

/** 실제 자산의 형태를 축소해 재현한다: 여러 종류 × 여러 벌 + 그림자 데칼 */
function places(n: number, seed: number): Place[] {
  const out: Place[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 37 + seed * 11) % 360;
    out.push([
      (i % 7) * 13 - 40, ((i * 3) % 5) * 2, Math.floor(i / 7) * 11 - 30,
      a, 0.5 + ((i * 17) % 10) / 10,
    ]);
  }
  return out;
}

const matrixOf = (p: Place) => new THREE.Matrix4().compose(
  new THREE.Vector3(p[0], p[1], p[2]),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (p[3] * Math.PI) / 180, 0)),
  new THREE.Vector3(p[4], p[4], p[4]),
);

interface Kind { geo: THREE.BufferGeometry; mat: THREE.Material; places: Place[] }

function kinds(): Kind[] {
  const box = new THREE.BoxGeometry(1, 2, 1);
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 3, 6);
  const plane = new THREE.PlaneGeometry(2, 2);
  return [
    { geo: box, mat: new THREE.MeshBasicMaterial({ name: 'wall' }), places: places(23, 1) },
    { geo: cyl, mat: new THREE.MeshBasicMaterial({ name: 'trunk' }), places: places(17, 2) },
    // ⚠ 그림자 데칼 — 격자에서 **빠지는** 규칙이 접힌 입력에서도 지켜져야 한다.
    { geo: plane, mat: new THREE.MeshBasicMaterial({ name: 'shadow:tree' }), places: places(11, 3) },
  ];
}

/**
 * 변환이 있는 부모를 하나 달아 준다 — **좌표계가 항등이면 검사가 조용히 죽는다.**
 *
 * ⚠ 이 헬퍼는 뮤테이션 두 번에서 나왔다. 픽스처가 변환 없는 루트를 쓰면 ① 인스턴스
 * 행렬에 노드 월드변환을 곱하는 코드와 ② 월드 기준 lift 의 부모 스케일 나눗셈이 **둘 다
 * 항등 연산이 되어, 지워도 전부 통과한다.** 실제로 (나)·(다) 두 축이 그렇게 검출력 0
 * 이었다. 두 씬에 **서로 다른** 변환을 주는 이유도 같다 — 같으면 우연히 상쇄될 수 있다.
 */
function holderOf(tx: number, ry: number, sc: number): { holder: THREE.Group; inv: THREE.Matrix4 } {
  const holder = new THREE.Group();
  holder.position.set(tx, 1, -3);
  holder.rotation.set(0, ry, 0);
  holder.scale.setScalar(sc);
  holder.updateMatrixWorld(true);
  return { holder, inv: new THREE.Matrix4().copy(holder.matrixWorld).invert() };
}

/** 낱개 메시로 세운 씬 */
function looseScene(ks: Kind[]): THREE.Group {
  const root = new THREE.Group();
  const { holder, inv } = holderOf(-2, Math.PI / 5, 0.8);
  root.add(holder);
  for (const k of ks) {
    for (const p of k.places) {
      const m = new THREE.Mesh(k.geo, k.mat);
      // 목표 «월드» 배치가 접힌 씬과 같아지도록 부모 변환을 미리 뺀다.
      matrixOf(p).premultiply(inv).decompose(m.position, m.quaternion, m.scale);
      holder.add(m);
    }
  }
  return root;
}

/**
 * 같은 배치를 `InstancedMesh` 로 접은 씬 — 로더가 `EXT_mesh_gpu_instancing` 을 풀면 이 모양이다.
 *
 * ⚠ **부모에 일부러 변환을 준다.** 인스턴스 행렬은 **로컬**이라 노드의 월드 변환을 앞에
 * 곱해야 세계 좌표가 된다. 첫 판본은 `InstancedMesh` 를 변환 없는 루트에 직접 달았고,
 * 그래서 **`premultiply` 를 지워도 5/5 가 통과했다**(뮤테이션 (나) 검출력 **0**). 이
 * 저장소는 같은 형태를 hookify 회차에 이미 겪었다 — 검사가 도는데 그 축만 조용히
 * 비어 있는 것이다. 부모 변환을 넣으면 그 곱셈이 **필수**가 된다.
 */
function packedScene(ks: Kind[]): THREE.Group {
  const root = new THREE.Group();
  // 임의의 «생긴 것 같은» 변환 — 로더가 만드는 노드 계층을 흉내낸다.
  // 낱개 씬과 **다른** 값을 쓴다(위 `holderOf` 주석).
  const { holder, inv } = holderOf(5, Math.PI / 6, 1.5);
  root.add(holder);
  for (const k of ks) {
    const im = new THREE.InstancedMesh(k.geo, k.mat, k.places.length);
    // 목표 «월드» 배치가 낱개 씬과 같아지도록 부모 변환을 미리 빼 둔다.
    k.places.forEach((p, i) => im.setMatrixAt(i, matrixOf(p).premultiply(inv)));
    im.instanceMatrix.needsUpdate = true;
    holder.add(im);
  }
  return root;
}

/**
 * 되묶기 결과에서 **(지오, 재질, 월드행렬) 다중집합**을 뽑는다.
 *
 * ⚠ 격자 분할 때문에 같은 종류가 여러 벌로 나뉘지만, 행렬을 전부 모으므로 그것과
 * 무관하게 비교가 성립한다 — **묶는 방식이 아니라 「무엇이 어디에 있는가」를 본다.**
 */
function placementsOf(group: THREE.Object3D): Map<string, number> {
  const out = new Map<string, number>();
  const m = new THREE.Matrix4();
  const q = (v: number) => (Math.round(v * 1e4) / 1e4 + 0).toFixed(4);
  const add = (geo: string, mat: string, mm: THREE.Matrix4) => {
    const key = `${geo}|${mat}|${mm.elements.map(q).join(',')}`;
    out.set(key, (out.get(key) ?? 0) + 1);
  };
  group.updateMatrixWorld(true);
  group.traverse((o: THREE.Object3D) => {
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh) {
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m);
        add(im.geometry.uuid, (im.material as THREE.Material).uuid, m.clone().premultiply(im.matrixWorld));
      }
      return;
    }
    const me = o as THREE.Mesh;
    if (me.isMesh && me.geometry) add(me.geometry.uuid, (me.material as THREE.Material).uuid, me.matrixWorld);
  });
  return out;
}

function diff(a: Map<string, number>, b: Map<string, number>): { missing: number; extra: number } {
  let missing = 0, extra = 0;
  for (const [k, v] of a) missing += Math.max(0, v - (b.get(k) ?? 0));
  for (const [k, v] of b) extra += Math.max(0, v - (a.get(k) ?? 0));
  return { missing, extra };
}

const total = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);

describe('GLB 되묶기 — 낱개 입력과 접힌 입력의 등가성', () => {
  it('⭐ 접힌 입력이 낱개 입력과 **같은 배치**를 낸다', () => {
    const ks = kinds();
    const expected = ks.reduce((s, k) => s + k.places.length, 0);

    const fromLoose = placementsOf(instanceRepeats(looseScene(ks), 4).group);
    const fromPacked = placementsOf(instanceRepeats(packedScene(ks), 4).group);

    // 먼저 낱개 경로가 온전한지 — 이쪽이 깨졌으면 비교 자체가 무의미하다.
    expect(total(fromLoose), '낱개 경로에서 배치가 사라졌다').toBe(expected);

    const d = diff(fromLoose, fromPacked);
    expect(
      { ...d, packed: total(fromPacked), expected },
      '접힌 입력에서 배치가 사라졌다 — `InstancedMesh` 의 인스턴스 행렬을 안 읽고 있다',
    ).toEqual({ missing: 0, extra: 0, packed: expected, expected });
  });

  it('⭐ 그림자 데칼은 접힌 입력에서도 격자에서 빠진다', () => {
    // 격자에 넣으면 세계 곳곳의 데칼이 셀마다 쪼개져 「근처만」 그려진다. world2 는
    // 그림자를 통째로 그리므로 여기도 전 맵 1벌이어야 한다(`glb-instance.js` 의 (E)).
    const ks = kinds();
    const shadowCount = ks.find((k) => (k.mat as THREE.Material).name.startsWith('shadow:'))!.places.length;
    const g = instanceRepeats(packedScene(ks), 4).group;
    let shadowBundles = 0, shadowInstances = 0;
    g.traverse((o: THREE.Object3D) => {
      const im = o as THREE.InstancedMesh;
      if (!im.isInstancedMesh) return;
      if (!(im.material as THREE.Material).name?.startsWith('shadow:')) return;
      shadowBundles++; shadowInstances += im.count;
    });
    expect(shadowInstances, '그림자 데칼이 사라졌다').toBe(shadowCount);
    expect(shadowBundles, '그림자가 격자로 쪼개졌다 — 전 맵 1벌이어야 한다').toBe(1);
  });

  it('⭐ 섞여 들어와도 된다 — world7 은 임의 GLB 를 받는다', () => {
    // 실제로 들어오는 파일은 일부만 접혀 있을 수 있다(도구·블렌더 설정에 따라).
    const ks = kinds();
    const mixed = new THREE.Group();
    // 첫 종류는 낱개로, 나머지는 접어서
    for (const p of ks[0]!.places) {
      const m = new THREE.Mesh(ks[0]!.geo, ks[0]!.mat);
      matrixOf(p).decompose(m.position, m.quaternion, m.scale);
      mixed.add(m);
    }
    for (const k of ks.slice(1)) {
      const im = new THREE.InstancedMesh(k.geo, k.mat, k.places.length);
      k.places.forEach((p, i) => im.setMatrixAt(i, matrixOf(p)));
      mixed.add(im);
    }
    const got = placementsOf(instanceRepeats(mixed, 4).group);
    const want = placementsOf(instanceRepeats(looseScene(ks), 4).group);
    expect(diff(want, got), '섞인 입력에서 배치가 어긋났다').toEqual({ missing: 0, extra: 0 });
  });

  it('⭐ 진단 수치가 접힌 입력에서도 **같은 세계를 말한다**', () => {
    // 팀장 조건 2. 이 수치는 화면(체크리스트)과 보고서에 그대로 나간다 — 접힌 입력에서
    // 노드 수만 세면 「28,707 → 40」 같은 거짓이 뜨고, 실제로 그 형태로 **세 사람이
    // 오독한 회차**가 있었다(`glb-source.ts` 의 해당 주석 참조).
    const ks = kinds();
    const want = ks.reduce((s2, k) => s2 + k.places.length, 0);
    const shadowWant = ks.find((k) => (k.mat as THREE.Material).name.startsWith('shadow:'))!.places.length;

    const a = mountGlbWorld(new THREE.Scene(), looseScene(ks), { castShadow: false, grid: 4 });
    const b = mountGlbWorld(new THREE.Scene(), packedScene(ks), { castShadow: false, grid: 4 });

    expect(a.meshes, '낱개 경로의 계수가 이미 틀렸다').toBe(want);
    expect(b.meshes, '접힌 입력을 노드 수로 셌다 — 화면에 거짓이 뜬다').toBe(want);
    expect(b.triangles, '삼각형이 인스턴스를 반영하지 않는다').toBe(a.triangles);
    expect(b.shadowDecals, '그림자 데칼 수가 인스턴스를 반영하지 않는다').toBe(shadowWant);
    expect(a.shadowDecals).toBe(shadowWant);
  });

  it('⭐ **그림자 보정까지 거친 «최종» 배치**가 같다 — 이 파일에서 가장 강한 축', () => {
    // 앞의 검사들은 `instanceRepeats` 만 본다. 그런데 `mountGlbWorld` 는 그 «전» 에
    // 데칼을 띄우고(`SHADOW_LIFT`) 크기를 복원한다 — 둘 다 노드 속성을 만지던 코드라
    // 인스턴스 입력에서 **묶음 전체가 같이 움직이거나 카운트만 세어졌다**(실측: 8,625개
    // 중 「8」·「1」). 여기서는 그 후처리까지 통과한 결과를 통째로 대조한다.
    const ks = kinds();
    const shadowWant = ks.find((k) => (k.mat as THREE.Material).name.startsWith('shadow:'))!.places.length;

    const a = mountGlbWorld(new THREE.Scene(), looseScene(ks), { castShadow: false, grid: 4 });
    const b = mountGlbWorld(new THREE.Scene(), packedScene(ks), { castShadow: false, grid: 4 });

    expect(a.liftedDecals, '낱개 경로의 띄움 계수가 이미 틀렸다').toBe(shadowWant);
    expect(b.liftedDecals, '인스턴스 데칼을 «노드» 수만큼만 올렸다 — 화면에 거짓이 뜬다')
      .toBe(shadowWant);

    const pa = placementsOf(a.root as unknown as THREE.Object3D);
    const pb = placementsOf(b.root as unknown as THREE.Object3D);
    expect(diff(pa, pb), '후처리를 거친 최종 배치가 어긋났다').toEqual({ missing: 0, extra: 0 });
  });

  it('인스턴스가 «격자로» 나뉜다 — 컬링이 셀 단위로 살아 있어야 한다', () => {
    // 접힌 입력을 그대로 통과시키면 종류당 1벌이 되어 프러스텀·거리 컬링이 죽는다.
    // `glb-instance.js` 헤더 실측: 격자 없이 묶었을 때 99.999%가 매 프레임 그려졌다.
    const r = instanceRepeats(packedScene(kinds()), 4);
    // 그림자(전 맵 1벌)를 뺀 나머지가 종류 수보다 많아야 격자가 실제로 나눈 것이다.
    let nonShadow = 0;
    r.group.traverse((o: THREE.Object3D) => {
      const im = o as THREE.InstancedMesh;
      if (im.isInstancedMesh && !(im.material as THREE.Material).name?.startsWith('shadow:')) nonShadow++;
    });
    expect(nonShadow, '격자 분할이 없다 — 종류당 1벌로 뭉쳤다').toBeGreaterThan(2);
  });
});

// ── 검출력 실측 (2026-08-28) ────────────────────────────────────────────────
//
// **① 수정 «전» 실물 FAIL** (팀장 조건 1: *"등가성 검사를 수정 전에 먼저 써서 현재
// 결함으로 FAIL 을 실측하고, 수정 후 PASS 로 돌린다"*):
//
//   수정 전 → **4/4 FAIL**. 「섞여 들어와도 된다」가 `missing: 28` 로, 접힌 두 종류
//   (17+11)가 통째로 사라지는 것을 그대로 보여줬다. 수정 후 → 6/6 PASS.
//
// 뮤테이션은 결함을 인위로 되살리는 것인데 여기서는 **실물 결함이 아직 살아 있었으므로**
// 그보다 강한 증명이 공짜로 있었다.
//
// **② 되묶기 축 뮤테이션 6케이스** (`instanceRepeats`·진단):
//
//   (가) 인스턴스 행렬을 아예 안 읽음 (원래 결함)      → 4 failed
//   (나) 노드 월드변환을 안 곱함 (로컬 행렬만)         → 1 failed
//   (다) 셀 판정을 행렬마다 안 하고 노드 하나로        → 1 failed
//   (라) 진단이 인스턴스 수를 안 곱함(`meshes`)        → 1 failed
//   (마) 삼각형만 안 곱함                              → 1 failed
//   (바) 그림자 데칼만 안 곱함                         → 1 failed
//
// **③ 후처리 축 뮤테이션 5케이스** (`eachPlacement`·lift):
//
//   (가) lift 를 월드 보정 없이 로컬에 더함 (원래 결함) → 1 failed
//   (나) 인스턴스 lift 의 부모 스케일 나눗셈 제거       → 1 failed
//   (다) 낱개 lift 의 부모 스케일 나눗셈 제거           → 1 failed
//   (라) lift 후 `commit()` 을 안 부름                  → 1 failed
//   (마) 인스턴스 경로가 첫 인스턴스만 순회             → 1 failed
//
// **④ 🔴 검출력 0 이 «두 번» 났고 원인이 같다.** 픽스처의 좌표계가 항등이면 그 위에서
// 도는 연산이 전부 무의미해진다:
//   · 첫 번째 — `packedScene` 이 변환 없는 루트를 써서 `premultiply(o.matrixWorld)` 를
//     **지워도 통과**했다(위 ② (나)).
//   · 두 번째 — `looseScene` 이 같은 이유로 낱개 lift 의 나눗셈을 **지워도 통과**했다
//     (위 ③ (다)).
// 두 씬에 **서로 다른** 변환을 가진 부모를 달아 둘 다 살렸다(`holderOf`). 같은 값을 쓰면
// 우연히 상쇄될 수 있어서 일부러 다르게 준다. **뮤테이션을 안 돌렸으면 둘 다 못 봤다** —
// 검사는 19건이 초록으로 돌고 있었다.
//
// **⑤ 이 검사가 «원래 코드의» 결함을 하나 더 찾았다.** ③(가)는 뮤테이션이 아니라 실물
// 이었다 — `p.position.y += SHADOW_LIFT` 가 **로컬 좌표** 기준이라 부모에 스케일이 있으면
// 그만큼 왜곡된다(1.5배면 0.02 가 0.03 이 된다). 원본 자산은 그룹 노드 21개가 변환을
// 안 가져서 **우연히** 안전했고, 그래서 오래 안 보였다. world7 은 임의 GLB 를 받는다.
