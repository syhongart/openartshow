// 그림자 데칼을 격자 셀 분할에서 뺀다 — (E) 팀장 재판정 2026-08-27.
//
// ── 무엇을 지키는가 ─────────────────────────────────────────────────────────
// 감독 지시 *"그림자 처리가 다른데? … 똑같이해."* 의 집행이다. world2 는 그림자를
// **지오 8종 × 아틀라스 1재질 = 8벌**로 그리는데(셀 분할 없음), world8 은 `?grid=16`
// 격자가 그림자에도 걸려 **8 × 그림자가 있는 셀 수** 벌이 됐다. 근거·폐기된 제4안·
// 한계는 `systems/glb-instance.js` 의 `SHADOW_MAT_PREFIX` 주석 한 곳이다 — 여기에
// 다시 적지 않는다.
//
// ── 이 파일이 **못 보는 것** (통과로 적지 않는다) ───────────────────────────
// 🔴 **실제 드로우콜.** 여기서 세는 것은 `InstancedMesh` **벌수**이고, 그것이 곧
// 드로우콜이 되는 것은 «전부 시야 안» 일 때뿐이다. 프러스텀 컬링·재질 정렬·투명 패스
// 분리가 실제 draw 를 바꾼다. 전/후 드로우콜은 **브라우저 실측**으로만 판정한다
// (팀장 조건 1). 그 실측 없이 「N분의 1」을 결과로 적지 않는다 — 한 회차 앞에서
// 정확히 그렇게 적었다가 배포 전에 뒤집혔다.
// 🔴 **화면.** 그림자가 항상 전량 그려지는 것의 대가(삼각형 +?%)는 실기기 판정이다.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three/webgpu';
import {
  instanceRepeats, isShadowMaterial, SHADOW_MAT_PREFIX,
} from '../frontend/js/world-glb/systems/glb-instance.js';
import { createGlbStream } from '../frontend/js/world-glb/systems/glb-stream.js';

/** 네 귀퉁이. `GRID`=4 로 자르면 서로 다른 셀에 떨어진다 */
const CORNERS: readonly (readonly [number, number])[] = [
  [-400, -400], [400, -400], [-400, 400], [400, 400],
];
const GRID = 4;

/**
 * 같은 지오·같은 재질을 네 귀퉁이에 놓은 트리.
 *
 * ⚠ **지오와 재질을 공유한다** — 그래야 묶음 키에서 갈리는 것이 «셀 하나뿐» 이 되고,
 * 벌수 차이가 격자 때문임이 확정된다. 지오를 따로 만들면 uuid 가 달라 4벌이 나오는데
 * 그것은 격자와 무관한 이유이고, 그러면 이 검사의 검출력이 0 이 된다.
 */
function build(matName: string) {
  const root = new THREE.Group();
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial();
  mat.name = matName;
  for (const [x, z] of CORNERS) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 0, z);
    root.add(m);
  }
  return root;
}

/**
 * 결과 그룹에서 `InstancedMesh` 벌수.
 *
 * ⚠ `unknown` 으로 받는 이유 — `three/webgpu` 의 `Group` 타입이 `children` 을 노출하지
 * 않아 구조적 타입이 안 맞는다(`glb-emissive-cap.test.ts` 가 TS2694 로 적어 둔 것과 같은
 * 계열이다). **런타임에는 있다** — 실물 three 를 돌려 확인했다.
 */
const bundles = (g: unknown) =>
  (g as { children: { isInstancedMesh?: boolean }[] }).children.filter((c) => c.isInstancedMesh).length;

const tick = (t: number) => ({ dt: 0.016, ageMs: t, frame: 1, hidden: false, resumed: false });

describe('(E) 그림자는 격자 셀 분할에서 빠진다', () => {
  it('(가) 네 셀에 흩어진 그림자 데칼이 **1벌**로 묶인다', () => {
    const { group } = instanceRepeats(build(`${SHADOW_MAT_PREFIX}tree#0`), GRID);
    expect(bundles(group), '그림자가 셀별로 갈렸다 — 격자 제외가 안 걸렸다').toBe(1);
  });

  it('(나) 대조군 — **같은 배치의 비그림자**는 네 벌로 갈린다', () => {
    // 이 단언이 없으면 (가)의 `1` 이 「격자가 아예 안 도는 것」과 구별되지 않는다.
    const { group } = instanceRepeats(build('tree'), GRID);
    expect(bundles(group), '격자 셀 분할 자체가 안 돌고 있다').toBe(4);
  });

  it('(다) `shadow:` 재질이 없는 GLB 에서는 **no-op** — world7 은 임의 파일을 받는다', () => {
    // 재질 이름을 그림자처럼 «보이게» 하되 접두는 아닌 것들. 하나라도 걸리면 격자가
    // 통째로 무력해지고, world7 사용자의 GLB 가 컬링을 잃는다.
    for (const name of ['shadow', 'Shadow:tree', 'my-shadow:tree', 'shadows:tree', '']) {
      const { group } = instanceRepeats(build(name), GRID);
      expect(bundles(group), `"${name}" 이 그림자로 오인돼 격자에서 빠졌다`).toBe(4);
    }
  });

  it('(라) **세계 안 어디에 서 있어도** 그림자는 켜져 있다 — 계산된 반경이 실제로 소비된다', () => {
    // 판정/집행 경계를 건너는 지점이다. `cellRadius` 를 옳게 계산해도 `glb-stream` 이
    // 그것을 안 읽으면 그림자가 꺼진다 — 그 구멍은 양쪽 단위 테스트 어디에도 안 걸린다.
    //
    // ⚠ **「무조건 켜짐」이 아니다.** 판정식이 `hypot(중심−나) − 반지름 ≤ 반경` 이므로
    // 세계 **바깥** 아득히 먼 곳에서는 그림자도 꺼진다(첫 판본이 그 조건으로 재서
    // 빨간불이 났고, 틀린 것은 구현이 아니라 **내가 고른 축**이었다). 실전에서 플레이어는
    // 세계 안에 있고, 밖으로 나가면 다른 셀도 전부 꺼지므로 동작이 일관된다.
    const shadow = instanceRepeats(build(`${SHADOW_MAT_PREFIX}lamp#0`), GRID).group;
    const plain = instanceRepeats(build('lamp'), GRID).group;

    // 세계 한 귀퉁이에 선다. 반대편 귀퉁이까지 1,131m 이고 컬링 반경은 50m 다 —
    // 격자를 타는 것은 그 거리에서 **반드시** 꺼진다.
    const corner = { x: 400, z: 400 };
    for (const g of [shadow, plain]) {
      const s = createGlbStream({ root: g as never, getPosition: () => corner, radius: 50 });
      s.update(tick(1000) as never);
    }
    const vis = (g: unknown) =>
      (g as { children: { visible: boolean }[] }).children.filter((c) => c.visible).length;
    expect(vis(shadow), '세계 안에 서 있는데 그림자가 꺼졌다').toBe(1);
    // 대조군이 「전부 켜짐」이면 컬링이 안 도는 것이고, 이 검사의 검출력이 0 이 된다.
    expect(vis(plain), '대조군 네 벌이 다 켜져 있다 — 거리 컬링 자체가 안 돌고 있다').toBeLessThan(4);
  });

  it('(마) 그림자 벌의 반경이 **인스턴스 전체를 감싼다** — 어느 하나도 밖으로 새지 않는다', () => {
    const { group } = instanceRepeats(build(`${SHADOW_MAT_PREFIX}bench#0`), GRID);
    const im = group.children[0] as unknown as {
      userData: { cellCenter: { x: number; z: number }; cellRadius: number };
    };
    const { cellCenter: c, cellRadius: r } = im.userData;
    // ⚠ **중심이 원점일 것을 요구하지 않는다.** three 의 `computeBoundingSphere` 는
    // 기하 중심을 내지 않는다(이 배치에서 x≈69 가 나온다). 요건은 중심 위치가 아니라
    // **전부 감싸는가** 이고, 첫 판본은 그것을 「원점 근처」로 잘못 옮겨 적었다.
    //
    // ⚠⚠ **그래서 이 검사는 `cellCenter` 의 «정확성» 을 못 본다**(검수관 권고 P2).
    // 반경이 `hypot(bs.center − cellCenter) + bs.radius` 라 **삼각부등식에 의해**
    // `cellCenter` 가 무슨 값이든 전체를 감싸는 반경이 자동으로 나온다. 검수관이 실측으로
    // 확인했다 — `cellCenter` 를 `{0,0}` 으로 고정해도 **6/6 통과**한다.
    // 즉 이 검사가 잠그는 것은 «반경 계산식의 로직» 까지이고, 「자기 바운딩 중심을 쓴다」는
    // 주석의 진술은 **어느 검사도 안 본다.** 기능상 무해하지만(반경이 보정하므로) 그
    // 사실을 적어 둔다 — 검사가 조용한 것은 안전해서가 아니라 그 축을 안 보기 때문이다.
    //
    // ⚠⚠⚠ executor 가 보고한 M2(「3건 깨짐」)는 **검출력이 아니라 크래시**였다.
    // 실제 diff 는 이랬다 — `b.cell` 이 `null` 일 때 `.split` 이 TypeError 를 낸다:
    //
    //     -    const [cx, cz] = b.cell ? b.cell.split('|').map(Number) : [NaN, NaN];
    //     -    im.userData.cellCenter = b.cell
    //     -      ? { x: box.min.x + (cx + 0.5) * cw, z: box.min.z + (cz + 0.5) * ch }
    //     -      : { x: im.boundingSphere ? im.boundingSphere.center.x : 0,
    //     -          z: im.boundingSphere ? im.boundingSphere.center.z : 0 };
    //     +    const [cx, cz] = b.cell.split('|').map(Number);
    //     +    im.userData.cellCenter = { x: box.min.x + (cx + 0.5) * cw, z: box.min.z + (cz + 0.5) * ch };
    //
    // 검수관의 M2(값만 바꾸기)가 더 정확한 뮤테이션이고 그것은 **안 깨졌다.**
    // 두 결과는 모순이 아니라 **다른 뮤테이션**이다 — 서술만 남기면 다음 사람이 구별
    // 못 하므로 diff 를 그대로 보존한다(검수관 권고 P2).
    for (const [x, z] of CORNERS) {
      expect(Math.hypot(x - c.x, z - c.z), `귀퉁이 (${x},${z}) 가 반경 밖이다`).toBeLessThanOrEqual(r);
    }
  });

  it('(바) 판정 SSOT — 접두 문자열을 두 곳에 적지 않는다', () => {
    expect(isShadowMaterial({ name: `${SHADOW_MAT_PREFIX}tree#0` })).toBe(true);
    expect(isShadowMaterial({ name: 'tree' })).toBe(false);
    expect(isShadowMaterial(null)).toBe(false);
    expect(isShadowMaterial({})).toBe(false);
    // `glb-source.ts` 의 `shadowDecals` 계수가 이 함수를 쓴다 — 접두가 바뀌면 둘이
    // 함께 움직인다. 그 파일이 문자열을 다시 적고 있으면 이 단언은 못 잡는다(구조로
    // 막았다: 그쪽 import 가 `isShadowMaterial` 이다).
    expect(SHADOW_MAT_PREFIX).toBe('shadow:');
  });
});

// ── AO 데칼을 지면에서 띄운다 (감독 신고 2026-08-27 «울긋불긋») ──────────────
//
// world2 는 접촉그림자 AO 평면을 «캐스터 발밑 + `SHADOW_LIFT`» 에 놓는데 **GLB 에는 그
// lift 가 없었다.** 실측: 데칼 노드 월드 y 고유값이 `0.00 / 0.07 / 0.14` 셋뿐이고
// 지오메트리도 평면(`y ∈ [-0.0000, 0.0000]`)인데, 지면(`ground#*`)은 정점
// `y ∈ [-1.0000, 0.0000]` 이라 윗면이 정확히 월드 y = 0 이다 — **같은 평면**이다.
// 경위·처방은 `systems/glb-source.ts` 의 해당 블록 한 곳이다.
//
// 🔴 **이 검사가 못 보는 것**: 「울긋불긋이 해소됐는가」. 그것은 WebGPU 실기기에서만
// 판정된다(헤드리스는 swiftshader). 여기서 잠그는 것은 **lift 가 실제로 걸리는가**까지다.
describe('AO 데칼 지면 띄움', () => {
  it('(사) `shadow:` 메시만 `SHADOW_LIFT` 만큼 올라간다 — 나머지는 그대로', async () => {
    const { mountGlbWorld } = await import('../frontend/js/world-glb/systems/glb-source.js');
    const { SHADOW_LIFT } = await import('../frontend/js/world-glb/decide/shadow-decal.js');

    const src = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1, 1);
    const mk = (name: string, y: number) => {
      const mat = new THREE.MeshBasicMaterial(); mat.name = name;
      const m = new THREE.Mesh(geo, mat); m.position.set(0, y, 0); src.add(m); return m;
    };
    const decal = mk(`${SHADOW_MAT_PREFIX}tree#0`, 0);
    const ground = mk('ground#0', 0);

    const scene = new THREE.Scene();
    const r = mountGlbWorld(scene as never, src as never, { castShadow: false, grid: GRID }) as unknown as
      { shadowDecals: number; liftedDecals: number };

    expect(r.liftedDecals, 'lift 가 한 번도 안 걸렸다').toBe(1);
    expect(r.liftedDecals, '데칼 수와 lift 수가 다르다 — 일부가 빠졌다').toBe(r.shadowDecals);
    expect(decal.position.y, '데칼이 안 올라갔다').toBeCloseTo(SHADOW_LIFT, 6);
    // 대조군이 없으면 「전부 올린 것」과 구별되지 않는다.
    expect(ground.position.y, '지면까지 올라갔다').toBe(0);
  });

  it('(아) 지면과 **같은 평면이 아니게** 된다 — 그것이 처방의 목적이다', async () => {
    const { mountGlbWorld } = await import('../frontend/js/world-glb/systems/glb-source.js');
    const { SHADOW_LIFT } = await import('../frontend/js/world-glb/decide/shadow-decal.js');
    const src = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial(); mat.name = `${SHADOW_MAT_PREFIX}lamp#0`;
    const d = new THREE.Mesh(geo, mat); d.position.set(0, 0, 0); src.add(d);
    mountGlbWorld(new THREE.Scene() as never, src as never, { castShadow: false, grid: GRID });
    // 지면 윗면은 월드 y = 0 이다(실측). 데칼이 그보다 **위**여야 깊이 테스트가 갈리지 않는다.
    expect(d.position.y, '데칼이 지면 평면 위로 올라오지 않았다').toBeGreaterThan(0);
    expect(SHADOW_LIFT, 'lift 가 0 이면 이 처방 전체가 무의미하다').toBeGreaterThan(0);
  });

  it('(자) **실제로 그려지는 인스턴스**에 lift 가 구워진다 — 되묶기 순서를 잡는다', async () => {
    // ⚠ **이 검사가 없으면 (사)(아)는 순서 회귀를 못 잡는다**(검수관 블로커, 실측).
    // `instanceRepeats` 는 `updateMatrixWorld(true)` 뒤 `matrixWorld` 를 인스턴스에 **굽고**
    // 원본 트리는 씬에 다시 안 넣는다 — 반환된 `group` 만 그려진다. 그런데 (사)(아)는
    // 함수 밖에 남은 **원본 노드의 로컬 `position.y`** 를 본다. lift 를 되묶기 **뒤**로
    // 옮겨도 원본 로컬 좌표는 똑같이 바뀌므로 **8/8 그대로 통과**했다(검수관 뮤테이션 B).
    // 화면에 나가는 것은 인스턴스 행렬이므로 **그쪽을 본다.**
    const { mountGlbWorld } = await import('../frontend/js/world-glb/systems/glb-source.js');
    const { SHADOW_LIFT } = await import('../frontend/js/world-glb/decide/shadow-decal.js');

    const src = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1, 1);
    const mk = (name: string) => {
      const mat = new THREE.MeshBasicMaterial(); mat.name = name;
      const m = new THREE.Mesh(geo, mat); m.position.set(0, 0, 0); src.add(m);
    };
    mk(`${SHADOW_MAT_PREFIX}tree#0`);
    mk('ground#0');

    const r = mountGlbWorld(new THREE.Scene() as never, src as never,
      { castShadow: false, grid: GRID }) as unknown as { root: unknown };

    // 인스턴스 이름은 `inst:<재질명>×<개수>` 다(`glb-instance.js`).
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
    const q = new THREE.Quaternion(), s = new THREE.Vector3();
    const ys: Record<string, number> = {};
    (r.root as { traverse: (f: (o: never) => void) => void }).traverse((o: never) => {
      const im = o as unknown as {
        isInstancedMesh?: boolean; name: string;
        getMatrixAt: (i: number, m: THREE.Matrix4) => void;
      };
      if (!im.isInstancedMesh) return;
      im.getMatrixAt(0, m4); m4.decompose(v, q, s);
      ys[im.name] = v.y;
    });

    const shadowKey = Object.keys(ys).find((k) => k.includes(SHADOW_MAT_PREFIX));
    const groundKey = Object.keys(ys).find((k) => k.includes('ground'));
    expect(shadowKey, `그림자 인스턴스를 못 찾았다 — 이름: ${Object.keys(ys).join(', ')}`).toBeTruthy();
    expect(groundKey, `지면 인스턴스를 못 찾았다 — 이름: ${Object.keys(ys).join(', ')}`).toBeTruthy();
    expect(ys[shadowKey!], '그려지는 그림자 인스턴스에 lift 가 안 구워졌다 — 되묶기 «뒤» 에 올렸는가').toBeCloseTo(SHADOW_LIFT, 6);
    // 대조군. 이것이 없으면 「전부 올린 것」과 구별되지 않는다.
    expect(ys[groundKey!], '지면까지 올라갔다').toBeCloseTo(0, 6);
  });
});

// ── 크기·실루엣 복원 (감독 신고 2026-08-28 «형태가 8이 동그랗네») ─────────────
//
// 유실이 셋이고 위 (사)~(자)는 그중 «띄움» 이다. 나머지 둘 — `box` 캐스터의 축별 크기와
// 종류별 실루엣 — 은 `systems/glb-shadow-fix.ts` 가 복원한다. 근거·경계는 그 파일 헤더.
//
// 🔴 **이 파일이 못 보는 것**: 아틀라스의 **픽셀**. `rebakeShadowAtlas` 는
// `document.createElement('canvas')` 를 쓰는데 vitest 환경에는 없어 `null` 을 돌려준다
// (그 가드 자체는 아래 (차)가 본다). 실루엣이 실제로 사각·얼룩으로 그려졌는지는
// **브라우저 실측**(`glb.atlasPainted`)과 **감독 화면**이 판정한다.
describe('AO 데칼 크기·실루엣 복원', () => {
  it('(차) 실루엣 배정이 world2 규칙 그대로다 — 벤치=사각, 나무=얼룩', async () => {
    const { PARTS } = await import('../frontend/js/world-glb/parts/index.js');
    const { casterProfiles } = await import('../frontend/js/world-glb/parts/shadow.js');
    const base = PARTS.filter((p: { kind: string }) => !p.kind.startsWith(SHADOW_MAT_PREFIX));
    const cells = casterProfiles(base as never);
    const byKind = new Map(cells.map((c: { kind: string; shape: string }) => [c.kind, c.shape]));
    // 2026-08-11 감독 지시 *"형태가 사각형이면 사각형그림자. 원형이면 원형 그림자면 해"*.
    expect(byKind.get('bench'), '벤치가 사각이 아니다').toBe('box');
    expect(byKind.get('tree'), '나무가 얼룩이 아니다').toBe('foliage');
    // 대조군 — 전부 box 면 이 검사의 검출력이 0 이다.
    expect(byKind.get('fountain')).toBe('round');
    expect(byKind.get('lamp')).toBe('post');
    // 종류가 하나뿐이면 아틀라스를 다시 그려도 원형 8개가 나온다(지금 자산의 상태다).
    expect(new Set(cells.map((c: { shape: string }) => c.shape)).size,
      '실루엣이 한 종류뿐 — 다시 그려도 지금과 같아진다').toBeGreaterThan(1);
  });

  it('(카) `box` 캐스터의 데칼만 축별로 늘어난다 — 대조군은 그대로', async () => {
    const { fixBoxDecalScale } = await import('../frontend/js/world-glb/systems/glb-shadow-fix.js');
    const root = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1, 1);
    const put = (name: string, g: THREE.BufferGeometry, x = 0) => {
      const mat = new THREE.MeshBasicMaterial(); mat.name = name;
      const m = new THREE.Mesh(g, mat); m.position.set(x, 0, 0); root.add(m); return m;
    };
    // 캐스터 — 벤치를 가로로 긴 상자로. `measure` 가 이 bbox 에서 rx·rz 를 읽는다.
    put('bench#0', new THREE.BoxGeometry(2.8, 0.4, 0.88));
    put('planter#0', new THREE.BoxGeometry(1, 1, 1), 10);   // round 캐스터(대조군)
    const benchDecal = put(`${SHADOW_MAT_PREFIX}bench#0`, geo);
    const roundDecal = put(`${SHADOW_MAT_PREFIX}planter#0`, geo, 10);
    benchDecal.scale.set(1, 1, 1);
    roundDecal.scale.set(1, 1, 1);

    const r = fixBoxDecalScale(root as never);
    expect(r.fixed, 'box 데칼이 한 건도 안 고쳐졌다').toBe(1);
    expect(r.skipped, '고칠 수 있는데 건너뛰었다').toBe(0);
    // 벤치는 2.8 × 0.88 이므로 x 가 z 보다 뚜렷하게 길어야 한다.
    expect(benchDecal.scale.x / benchDecal.scale.z, '벤치 데칼이 여전히 정사각이다').toBeGreaterThan(2);
    // 대조군이 안 변해야 「전부 늘린 것」과 구별된다.
    expect(roundDecal.scale.x, 'round 데칼까지 건드렸다').toBe(1);
    expect(roundDecal.scale.z, 'round 데칼까지 건드렸다').toBe(1);
  });

  it('(타) world7 안전 — `shadow:` 재질이 없으면 no-op, 캐스터가 없으면 건너뛴다', async () => {
    const { fixBoxDecalScale, rebakeShadowAtlas, applyAtlas } =
      await import('../frontend/js/world-glb/systems/glb-shadow-fix.js');
    // ① 그림자 재질이 아예 없는 임의 GLB
    const plain = new THREE.Group();
    const g = new THREE.PlaneGeometry(1, 1);
    for (const n of ['wall', 'shadow', 'my-shadow:x', '']) {
      const mat = new THREE.MeshBasicMaterial(); mat.name = n;
      plain.add(new THREE.Mesh(g, mat));
    }
    const a = fixBoxDecalScale(plain as never);
    expect(a.fixed + a.skipped, '그림자가 없는데 무언가를 건드렸다').toBe(0);
    expect(applyAtlas(plain as never, {}), '그림자가 없는데 재질을 바꿨다').toBe(0);

    // ② 데칼은 있는데 **캐스터 메시가 없는** GLB — 치수를 못 구한다
    const orphan = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial(); mat.name = `${SHADOW_MAT_PREFIX}bench#0`;
    const d = new THREE.Mesh(g, mat); d.scale.set(1, 1, 1); orphan.add(d);
    const b = fixBoxDecalScale(orphan as never);
    expect(b.fixed, '치수도 없는데 크기를 바꿨다 — 임의 GLB 가 깨진다').toBe(0);
    expect(b.skipped, '건너뛴 것으로 세지 않았다').toBe(1);
    expect(d.scale.x, '건너뛰었는데 스케일이 변했다').toBe(1);

    // ③ 캔버스가 없는 환경(vitest)에서 조용히 null — 던지면 부팅이 죽는다
    expect(rebakeShadowAtlas({} as never), '캔버스 없는 환경에서 null 이 아니다').toBeNull();
  });
});
