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
