// @vitest-environment jsdom
//
// **벽 검출** — 화면을 눌러 맞힌 면이 액자 자세가 되기까지 (W8-4 D1).
//
// ── 이 파일이 있는 이유: 경계를 건너는 지점이 무검사였다 ────────────────────
// 이 저장소의 규율이 그 형태를 이미 적어 두었다 — *"판정/집행 분리의 구멍: `decide/` 를
// 순수 함수로 두면 각 쪽은 테스트하기 쉬워지지만 **「계산된 값이 실제로 소비되는가」는
// 양쪽 테스트 어디에도 안 걸린다**."*
//
// 실측: `createPicker` 를 **실제로 돌리는 테스트가 0건**이었다(`grep -rln createPicker
// tests/` → 빈 출력). 그래서 `pickFace` 가 로컬 법선을 그대로 흘려도 순수 쪽
// (`toWorldNormal` 단위 테스트)은 초록이고 화면만 틀린다.
//
// ── 무엇을 재는가 ──────────────────────────────────────────────────────────
// | 축 | 여기서 |
// |---|---|
// | `toWorldNormal` 산술 | ★ 잰다 — 회전 행렬을 넣어 법선이 실제로 돈다 |
// | **월드 변환이 배선에서 일어나는가** | ★ **잰다** — 회전된 객체를 맞혀 결과를 본다 |
// | 면 없는 히트(Line·Points) 건너뛰기 | ★ 잰다 |
// | `wallPose` 와의 연결 | ★ 잰다 — `pickFace` 결과를 그대로 넣어 자세가 나온다 |
// | 실제 GLB 지오메트리·클릭 좌표 | ✗ 못 잰다 — 브라우저 실측 소관 |
//
// ⚠ **`pickFace` 는 「벽인가」를 판정하지 않는다.** 맞힌 면을 그대로 주고 `wallPose` 가
// `null` 로 답한다. 그 경계를 여기서도 지킨다 — 바닥을 맞히면 `pickFace` 는 값을 내고
// `wallPose` 가 거른다.

import { describe, it, expect } from 'vitest';
import { createPicker } from '../frontend/js/world2/edit/pick.js';
import {
  mul3x3, toWorldNormal, wallPose, WALL_GAP, WALL_MAX_TILT,
} from '../frontend/js/world2/decide/artwork.js';
import type { OverlayEntry, OverlayHost } from '../frontend/js/world2/edit/types.js';
import { makeThreeStub, type StubHit } from './helpers/three-stub.js';
import { createEditState } from '../frontend/js/world2/edit/state.js';

/** 열 우선 4×4 — Y축 회전 `ry` 만. 이동은 법선 변환에 영향이 없다(방향 벡터라서) */
function rotY(ry: number): number[] {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

/** 열 우선 4×4 — 축별 배율. 마을 파츠가 실제로 쓰는 형태다(`parts/building.ts`) */
function scale(sx: number, sy: number, sz: number): number[] {
  return [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1];
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function objWith(m: number[]): unknown {
  return { matrixWorld: { elements: m } };
}

/** 마을 인스턴스 메시 대역. `getMatrixAt` 이 지정한 인스턴스 행렬을 채운다 */
function instMesh(instM: number[], worldM?: number[]): unknown {
  return {
    getMatrixAt(_i: number, t: { elements: number[] }) {
      for (let k = 0; k < 16; k++) t.elements[k] = instM[k];
    },
    ...(worldM ? { matrixWorld: { elements: worldM } } : {}),
  };
}

interface VillageFix {
  hits: StubHit[];
  /** 맞힌 인스턴스의 주인. `null` 이면 «빈 슬롯» */
  owner?: { key: string; index: number } | null;
}

function makePicker(hits: StubHit[], vil?: VillageFix, uiHits: StubHit[] = []) {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    toJSON() { return {}; },
  }) as DOMRect;

  // 마을 레이캐스트 대상. **오버레이와 구별되는 값**이어야 스텁이 두 경로를 가른다.
  const VILLAGE_TARGETS: unknown[] = vil ? [{ tag: 'village-pool' }] : [];

  // ⚠ **오버레이 히트는 「등록된 항목」이어야 한다**(검수관 권고 P1 처방). `pickFace` 가
  // `host.root.children` 전체가 아니라 **`entries()` 의 holder 허용목록**에 쏘도록 바뀌었다
  // — 선택 링·기즈모가 광선을 가로채는 것을 구조적으로 막기 위해서다. 픽스처가 그 구조를
  // 안 가지면 이 파일 전체가 「아무것도 안 맞는 세계」를 재게 된다(실제로 6건이 빨간불이
  // 되어 드러났다). `uiHits` 는 **등록 안 된 채** 광선에만 걸리는 것 — UI 대역이다.
  const entries = hits.map((h) => ({ holder: h.object })) as unknown as OverlayEntry[];
  const host = {
    THREE: makeThreeStub({
      // 편집은 광선을 두 곳에 쏜다. 목록으로 갈라야 «마을을 맞혔다» 가 오버레이 쪽에서
      // 먼저 걸리지 않는다(`three-stub.ts` 의 `hits` 주석이 같은 것을 적고 있다).
      // UI 히트를 **앞에** 붙인다 — 광선이 먼저 맞는 자리다. 허용목록이 제대로 걸러내면
      // 이것들은 `pickFace` 에 안 들어오고, 안 걸러내면 `wallPose` 가 거절해 «벽에 놓아
      // 주세요» 가 뜬다(뒤에 진짜 벽이 있는데도).
      //
      // ⚠ **준 목록으로 거른다 — 그것이 실물 `intersectObjects` 의 성질이다.** 첫 판본은
      // `objs` 를 무시하고 전부 반환해서, 허용목록 처방이 들어간 뒤에도 UI 가 잡혔다.
      // **대역이 실물 성질을 안 가지면 그 축의 검출력은 0이다.**
      hits: (objs) => {
        if (objs[0] === VILLAGE_TARGETS[0]) return vil?.hits ?? [];
        const allowed = new Set(objs);
        return [...uiHits, ...hits].filter((h) => allowed.has(h.object));
      },
    }),
    camera: {} as never,
    canvas,
    doc: document,
    cellX: 32,
    cellZ: 32,
    root: { children: [{}], add(): void { }, remove(): void { } } as never,
    entries: () => entries,
    place: () => Promise.resolve(null),
    lastFailure: () => null,
    remove: () => { },
    apply: () => { },
    toRaw: () => ({ version: 1, items: [] }),
    look: () => { },
    instances: vil ? {
      refreshBounds() { },
      raycastTargets: () => VILLAGE_TARGETS,
      ownerAt: () => (vil.owner === undefined ? { key: 'building', index: 0 } : vil.owner),
    } : null,
    village: null,
    surfaceAt: () => 0,
  } as unknown as OverlayHost;

  const picker = createPicker(host, createEditState());
  picker.castFrom({ clientX: 400, clientY: 300 });
  return picker;
}

describe('★ toWorldNormal — 로컬 법선을 월드로', () => {
  it('회전이 없으면 그대로 (정규화만)', () => {
    const n = toWorldNormal({ x: 0, y: 0, z: 2 }, IDENTITY);
    expect(n).not.toBeNull();
    expect(n!.z).toBeCloseTo(1, 6);
    expect(n!.x).toBeCloseTo(0, 6);
  });

  it('★ 90도 돌면 +Z 법선이 +X 를 본다 — 이 변환이 D1 의 전부다', () => {
    const n = toWorldNormal({ x: 0, y: 0, z: 1 }, rotY(Math.PI / 2));
    expect(n!.x).toBeCloseTo(1, 6);
    expect(n!.z).toBeCloseTo(0, 6);
  });

  it('★ 수직 성분은 Y축 회전에 안 흔들린다 — 바닥이 벽이 되면 안 된다', () => {
    const n = toWorldNormal({ x: 0, y: 1, z: 0 }, rotY(1.234));
    expect(n!.y).toBeCloseTo(1, 6);
  });

  it('길이 0 법선은 null — `wallPose` 와 같은 문턱', () => {
    expect(toWorldNormal({ x: 0, y: 0, z: 0 }, IDENTITY)).toBeNull();
  });

  it('행렬이 짧으면 null — 못 읽은 것을 0 으로 뭉개지 않는다', () => {
    expect(toWorldNormal({ x: 0, y: 0, z: 1 }, [1, 0, 0])).toBeNull();
  });
});

describe('★ pickFace — 배선이 월드 변환을 실제로 하는가', () => {
  it('★ 회전된 객체의 면은 **월드** 법선으로 나온다 (로컬을 그대로 흘리면 깨진다)', () => {
    // 객체가 +90도 돌아 있고 면 법선은 로컬 +Z. 월드에서는 +X 여야 한다.
    const picker = makePicker([{
      object: objWith(rotY(Math.PI / 2)),
      point: { x: 5, y: 2, z: 3 },
      face: { normal: { x: 0, y: 0, z: 1 } },
    }]);
    const hit = picker.pickFace();
    expect(hit, '★ 면을 못 냈다').not.toBeNull();
    expect(hit!.normal.x, '★ 로컬 법선을 그대로 흘렸다 — 액자가 회전 전 방향을 본다')
      .toBeCloseTo(1, 6);
    expect(hit!.normal.z).toBeCloseTo(0, 6);
    expect(hit!.point).toEqual({ x: 5, y: 2, z: 3 });
  });

  it('★ 면이 없는 히트는 건너뛴다 — 뒤에 있는 벽이 안 가려진다', () => {
    const picker = makePicker([
      { object: objWith(IDENTITY), point: { x: 0, y: 0, z: 0 } },          // face 없음
      { object: objWith(IDENTITY), face: { normal: { x: 1, y: 0, z: 0 } } }, // point 없음
      { object: objWith(IDENTITY), point: { x: 9, y: 1, z: 0 }, face: { normal: { x: 1, y: 0, z: 0 } } },
    ]);
    const hit = picker.pickFace();
    expect(hit, '★ 앞의 못 쓰는 히트에서 멈췄다').not.toBeNull();
    expect(hit!.point.x).toBe(9);
  });

  it('matrixWorld 가 없는 히트도 건너뛴다 — 변환할 수 없는 것을 통과시키지 않는다', () => {
    const picker = makePicker([
      { object: {}, point: { x: 0, y: 0, z: 0 }, face: { normal: { x: 1, y: 0, z: 0 } } },
    ]);
    expect(picker.pickFace()).toBeNull();
  });

  it('아무것도 안 맞으면 null', () => {
    expect(makePicker([]).pickFace()).toBeNull();
  });

  it('★ 🔴 P1 — **선택 링·기즈모가 벽을 가로채지 않는다** (검수관 권고)', () => {
    // 🔴 선택 링(`edit/pick.ts` 의 `marker`)과 기즈모 그룹이 **`host.root` 의 자식**이라
    // `host.root.children` 에 쏘면 그대로 잡힌다. `faceOf` 는 「벽인가」를 판정하지 않고
    // **법선을 계산할 수 있는 첫 면**을 그대로 내므로, 광선 앞에 UI 가 있으면 그 면이
    // 이기고 `wallPose` 가 거절해 **뒤에 진짜 벽이 있는데도** «벽에 놓아 주세요» 가 뜬다.
    //
    // ⚠ **숨은 링도 해당한다** — three r171 은 레이캐스트에서 `visible` 을 안 본다
    // (`layers` 만 본다). `marker.visible = false` 는 보호가 아니다.
    //
    // UI 대역은 **바닥 법선**(눕힌 링)이라 `wallPose` 가 거절하는 값이다. 그것이 이기면
    // 아래 단언이 `null` 을 받는다.
    const ring: StubHit = {
      object: objWith(IDENTITY), distance: 1,
      point: { x: 0, y: 0, z: 0 }, face: { normal: { x: 0, y: 1, z: 0 } },
    };
    const wall: StubHit = {
      object: objWith(IDENTITY), distance: 9,
      point: { x: 4, y: 1, z: 0 }, face: { normal: { x: 1, y: 0, z: 0 } },
    };
    const hit = makePicker([wall], undefined, [ring]).pickFace();
    expect(hit, '★ UI 가 광선을 가로챘다 — 뒤의 벽을 못 본다').not.toBeNull();
    expect(hit!.point.x, '★ 등록 안 된 객체가 벽으로 잡혔다').toBe(4);
    expect(wallPose(hit!), '★ 잡힌 면이 벽이 아니다').not.toBeNull();
  });
});

describe('★ 경계를 건넌다 — pickFace 결과가 wallPose 에 그대로 들어간다', () => {
  it('★ 돌아간 벽을 눌러도 액자가 그 벽을 향한다', () => {
    const picker = makePicker([{
      object: objWith(rotY(Math.PI / 2)),
      point: { x: 5, y: 2, z: 3 },
      face: { normal: { x: 0, y: 0, z: 1 } },
    }]);
    const pose = wallPose(picker.pickFace()!);
    expect(pose, '★ 벽으로 안 받았다').not.toBeNull();
    // 월드 법선이 +X 이므로 액자는 +X 로 `WALL_GAP` 만큼 떠야 하고 yaw 는 +X 를 본다.
    expect(pose!.x).toBeCloseTo(5 + WALL_GAP, 6);
    expect(pose!.z).toBeCloseTo(3, 6);
    expect(pose!.ry).toBeCloseTo(Math.PI / 2, 6);
    expect(pose!.y).toBe(2);
  });

  it('★ 바닥을 누르면 pickFace 는 값을 내고 **wallPose 가** 거른다 — 사유가 한 곳이다', () => {
    const picker = makePicker([{
      object: objWith(IDENTITY),
      point: { x: 0, y: 0, z: 0 },
      face: { normal: { x: 0, y: 1, z: 0 } },
    }]);
    const hit = picker.pickFace();
    expect(hit, '★ 배선이 벽 판정을 대신했다 — 사유가 두 곳으로 갈린다').not.toBeNull();
    expect(wallPose(hit!), '★ 바닥이 벽으로 통과했다').toBeNull();
  });
});

// ── 비균등 스케일 (감독 판정 2026-08-17 로 재론 트리거 발동) ────────────────

describe('★ 비균등 스케일 — 정규행렬이 아니면 **반대로 답한다**', () => {
  // 🔴 D1 의 `toWorldNormal` 은 *"균등 스케일 전제이고 이 저장소에서 그것이 성립한다"* 로
  // 3×3 을 그대로 곱했고, 주석에 **재론 트리거**를 적어 두었다. 실측으로 발동했다 —
  // `parts/building.ts:184` 가 `sx: w, sy: h, sz: d` 를 쓴다. 마을 건물 벽에 걸겠다는
  // 감독 판정이 그 파츠를 대상으로 만들었으므로 전제가 깨졌다.
  //
  // 아래 픽스처가 **두 방식이 서로 다른 판정을 내는** 자리다. 45도 로컬 법선에
  // `diag(1, 4, 1)` 을 걸면:
  //   3×3 그대로   (1, 4, 0) → 정규화 (0.243, 0.970, 0) · |uy| 0.970 → **거절**
  //   정규행렬     (1, 0.25, 0) → 정규화 (0.970, 0.243, 0) · |uy| 0.243 → **통과**
  // 물리적으로 옳은 것은 후자다: y 를 4배 늘리면 그 경사면은 **더 가팔라져** 벽이 된다.
  const DIAG = Math.SQRT1_2;   // 45도 로컬 법선 (1,1,0)/√2

  it('★ y 를 4배 늘린 면은 **벽이 된다** — 3×3 그대로면 바닥 취급된다', () => {
    const n = toWorldNormal({ x: DIAG, y: DIAG, z: 0 }, scale(1, 4, 1));
    expect(n, '★ 법선을 못 냈다').not.toBeNull();
    expect(n!.y, '★ 3×3 을 그대로 곱했다 — 가팔라진 면이 바닥으로 읽힌다')
      .toBeCloseTo(0.2425, 3);
    expect(Math.abs(n!.y) < WALL_MAX_TILT, '★ 벽 판정이 뒤집혔다').toBe(true);
  });

  it('★ x 를 4배 늘린 면은 **벽이 아니게 된다** — 반대 방향도 성립해야 축이 참이다', () => {
    // 한 방향만 재면 「상수를 하나 맞춘 것」과 구별되지 않는다.
    const n = toWorldNormal({ x: DIAG, y: DIAG, z: 0 }, scale(4, 1, 1));
    expect(n!.y).toBeCloseTo(0.9701, 3);
    expect(Math.abs(n!.y) < WALL_MAX_TILT, '★ 완만해진 면이 벽으로 통과했다').toBe(false);
  });

  it('★ **균등 스케일에서는 결과가 안 바뀐다** — 기존 오버레이 GLB 동작 보존', () => {
    // `(R·sI)⁻ᵀ = R·(1/s)I` 이고 정규화가 배율을 지운다. 이 단언이 없으면 「D1 동작을
    // 바꿨는가」가 검사 밖에 남는다.
    //
    // ⚠ **진술되지 않은 전제가 하나 있다**(검수관 권고 P3). 이 단언은 문자 그대로는
    // **새 판본의 스케일 불변성**만 잰다. 「옛 동작(raw 3×3 곱) 보존」이 따라 나오는 것은
    // `a` 의 행렬이 **순수 회전**이고 **직교행렬에서 `(R⁻¹)ᵀ = R`** 라 그 지점에서 신·구가
    // 같아지기 때문이다. 실측으로도 그렇다 — 옛 판본을 되살린 뮤테이션에서 **이 테스트는
    // 통과했다**(깨진 것은 비균등 3건). 누가 나중에 `a` 에 전단을 섞으면 이 축은 소리
    // 없이 사라진다. 다른 테스트가 커버하므로 단언은 그대로 두고 전제만 적어 둔다.
    const a = toWorldNormal({ x: 0, y: 0, z: 1 }, rotY(0.7));
    const b = toWorldNormal({ x: 0, y: 0, z: 1 }, mul3x3(rotY(0.7), scale(3, 3, 3))!);
    expect(b!.x).toBeCloseTo(a!.x, 9);
    expect(b!.y).toBeCloseTo(a!.y, 9);
    expect(b!.z).toBeCloseTo(a!.z, 9);
  });

  it('축이 0 으로 눌린 행렬은 null — 못 읽은 것을 0 으로 뭉개지 않는다', () => {
    expect(toWorldNormal({ x: 0, y: 0, z: 1 }, scale(1, 1, 0))).toBeNull();
  });

  it('★ **거의** 눌린 행렬도 null — 유한하다고 통과시키면 방향이 수치 잡음이다', () => {
    // 🔴 뮤테이션 N10(`Math.abs(det) < 1e-12` 가드 삭제)이 **0 failed** 였다(2026-08-17).
    // 위 `scale(1,1,0)` 케이스는 det 이 정확히 0 이라 `0/0 = NaN`·`x/0 = Infinity` 가 되고
    // **뒤의 `Number.isFinite(len)` 가드가 같은 일을 대신 한다** — 그래서 그 축에서는
    // 두 판본이 등가다. 갈리는 곳은 **0 이 아니지만 문턱 아래**인 구간이다:
    // det = 1e-13 이면 뮤테이션 판본은 `1/1e-13 = 1e13` 이라는 **유한한 쓰레기 값**을
    // 정규화해 통과시킨다. 「못 잰 것을 통과로 적지 않는다」가 산술에서 성립하는 자리다.
    expect(toWorldNormal({ x: 0, y: 0, z: 1 }, scale(1, 1, 1e-13))).toBeNull();
  });

  it('★ 거울 변환(det < 0)에서는 법선이 **뒤집힌다** — 절댓값으로 나누면 안 된다', () => {
    // 🔴 뮤테이션 N9(`/ det` → `/ Math.abs(det)`)가 **0 failed** 였다 — 거울 픽스처가
    // 아예 없었으므로 **축이 비어 있었다**(검사가 약한 것과 다른 원인이다).
    //
    // x 를 뒤집으면 +X 를 보던 면은 −X 를 본다. GLB 모델러가 미러링한 파츠에서 실제로
    // 나오는 형태이고, 부호를 잃으면 액자가 **벽 안쪽을 향해** 걸린다.
    const n = toWorldNormal({ x: 1, y: 0, z: 0 }, scale(-1, 1, 1));
    expect(n, '★ 거울 변환에서 법선을 못 냈다').not.toBeNull();
    expect(n!.x, '★ det 부호를 버렸다 — 액자가 벽 안쪽을 본다').toBeCloseTo(-1, 6);
  });
});

describe('★ mul3x3 — 두 변환을 잇는다', () => {
  it('단위행렬과 곱하면 그대로', () => {
    const m = mul3x3(IDENTITY, rotY(0.9))!;
    for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) {
      expect(m[i]).toBeCloseTo(rotY(0.9)[i], 9);
    }
  });

  it('★ 회전 두 번은 각이 더해진다 — 순서를 바꾸면 이 단언이 깨진다', () => {
    const m = mul3x3(rotY(0.3), rotY(0.4))!;
    expect(m[0]).toBeCloseTo(Math.cos(0.7), 9);
    expect(m[8]).toBeCloseTo(Math.sin(0.7), 9);
  });

  it('★ 회전 × 스케일은 **교환되지 않는다** — 인자 순서가 이 함수의 계약이다', () => {
    const rs = mul3x3(rotY(Math.PI / 2), scale(2, 1, 1))!;
    const sr = mul3x3(scale(2, 1, 1), rotY(Math.PI / 2))!;
    expect(rs[2], '★ 두 순서가 같은 값을 낸다 — 곱셈이 틀렸다').not.toBeCloseTo(sr[2], 6);
  });

  it('짧은 행렬은 null', () => {
    expect(mul3x3([1, 0, 0], IDENTITY)).toBeNull();
    expect(mul3x3(IDENTITY, [1, 0, 0])).toBeNull();
  });
});

// ── 마을 파츠 벽 (감독 판정 2026-08-17) ──────────────────────────────────────

describe('★ 마을 건물 벽에도 걸린다', () => {
  const WALL_N = { normal: { x: 0, y: 0, z: 1 } };

  it('★ 인스턴스 면이 벽으로 나온다 — 이 경로가 없으면 마을에는 못 건다', () => {
    const picker = makePicker([], {
      hits: [{
        object: instMesh(IDENTITY), instanceId: 3,
        point: { x: 1, y: 2, z: 3 }, face: WALL_N.normal ? WALL_N : null,
      }],
    });
    const hit = picker.pickFace();
    expect(hit, '★ 마을 파츠에서 면을 못 냈다').not.toBeNull();
    expect(hit!.normal.z).toBeCloseTo(1, 6);
    expect(hit!.point).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('★ **인스턴스 행렬과 matrixWorld 를 둘 다 · 그 순서로** 곱한다', () => {
    // 🔴 **첫 판본은 뮤테이션 N2(곱 순서 뒤바꾸기)를 못 잡았다**(0 failed, 2026-08-17).
    // 원인은 검사가 약한 것이 아니라 **픽스처가 두 값을 구별 못 한 것**이었다 — 인스턴스와
    // 메시월드에 **같은 회전**(rotY 90°)을 줬으니 순서를 바꿔도 같은 답이 나온다. 이
    // 저장소가 뮤테이션 `0 failed` 의 네 원인 중 세 번째로 이미 두 번 데인 형태다.
    //
    // 축이 서게 픽스처를 바꿨다: **y축 회전과 x축 스케일은 교환되지 않는다.**
    //   inst = rotY(90°) · world = scale(2,1,1) · 로컬 법선 (0, 1, 1)/√2
    //   올바른 순서 `mul3x3(world, inst)` → S⁻¹·R·n = (0.354, 0.707, 0) → (0.447, 0.894, 0)
    //   뒤바뀐 순서                        → R·S⁻¹·n = (0.707, 0.707, 0) → (0.707, 0.707, 0)
    //   변환 하나만(N3)                    → R·n     = 같은 (0.707, 0.707, 0)
    // 한 픽스처가 N2·N3 를 **둘 다** 잡는다.
    const D = Math.SQRT1_2;
    const picker = makePicker([], {
      hits: [{
        object: instMesh(rotY(Math.PI / 2), scale(2, 1, 1)), instanceId: 0,
        point: { x: 0, y: 1, z: 0 }, face: { normal: { x: 0, y: D, z: D } },
      }],
    });
    const hit = picker.pickFace();
    expect(hit!.normal.x, '★ 곱 순서가 틀렸거나 변환 하나를 빠뜨렸다').toBeCloseTo(0.4472, 3);
    expect(hit!.normal.y).toBeCloseTo(0.8944, 3);
    expect(hit!.normal.z).toBeCloseTo(0, 6);
  });

  it('★ 빈 슬롯(주인 없음)은 건너뛴다 — 지워진 자리에 액자가 걸리면 안 된다', () => {
    const picker = makePicker([], {
      owner: null,
      hits: [{
        object: instMesh(IDENTITY), instanceId: 0,
        point: { x: 0, y: 1, z: 0 }, face: { normal: { x: 0, y: 0, z: 1 } },
      }],
    });
    expect(picker.pickFace()).toBeNull();
  });

  it('★ 그림자 데칼은 벽이 아니다 — 지면 근처 드롭이 거기서 끝나면 안 된다', () => {
    const picker = makePicker([], {
      // ⚠ 접두가 `shadow:` 다(`systems/shadow-decal.ts` 의 `isShadowKey`). 첫 판본은
      // `'shadow'` 로 적어 빨간불이 났고 — **픽스처가 실물 형태를 안 가지면 그 축은
      // 아무것도 안 잰다.** 검사가 잡아서 드러났다.
      owner: { key: 'shadow:building', index: 0 },
      hits: [{
        object: instMesh(IDENTITY), instanceId: 0,
        point: { x: 0, y: 0, z: 0 }, face: { normal: { x: 0, y: 0, z: 1 } },
      }],
    });
    expect(picker.pickFace(), '★ 그림자 데칼이 벽으로 잡혔다').toBeNull();
  });

  it('`instanceId` 가 없는 히트는 건너뛴다 — 인스턴스가 아니면 행렬을 못 읽는다', () => {
    const picker = makePicker([], {
      hits: [{
        object: instMesh(IDENTITY),
        point: { x: 0, y: 1, z: 0 }, face: { normal: { x: 0, y: 0, z: 1 } },
      }],
    });
    expect(picker.pickFace()).toBeNull();
  });

  it('마을 문이 안 열린 소비자에서는 예전대로 오버레이만 본다', () => {
    const picker = makePicker([{
      object: objWith(IDENTITY), point: { x: 7, y: 1, z: 0 },
      face: { normal: { x: 1, y: 0, z: 0 } },
    }]);
    expect(picker.pickFace()!.point.x).toBe(7);
  });
});

describe('★ 오버레이와 마을 중 **가까운 것**을 고른다', () => {
  // ⚠ `pick()`/`pickVillage()` 는 «오버레이 먼저» 인데 그것은 **고르기**의 규약이다.
  // 벽은 다르다 — 광선이 실제로 먼저 맞은 면에 걸려야 한다. 우선순위로 하면 마을 건물
  // 앞에 서서 드롭했는데 뒤편 오버레이 GLB 에 액자가 걸리고, 화면에서는 «걸었다는데
  // 안 보인다» 로만 보인다.
  const OV = (d: number): StubHit => ({
    object: objWith(IDENTITY), distance: d,
    point: { x: 100, y: 1, z: 0 }, face: { normal: { x: 1, y: 0, z: 0 } },
  });
  const VI = (d: number): StubHit => ({
    object: instMesh(IDENTITY), instanceId: 0, distance: d,
    point: { x: 200, y: 1, z: 0 }, face: { normal: { x: 1, y: 0, z: 0 } },
  });

  it('★ 마을이 더 가까우면 **마을**이 이긴다', () => {
    expect(makePicker([OV(50)], { hits: [VI(10)] }).pickFace()!.point.x)
      .toBe(200);
  });

  it('★ 오버레이가 더 가까우면 **오버레이**가 이긴다', () => {
    expect(makePicker([OV(10)], { hits: [VI(50)] }).pickFace()!.point.x)
      .toBe(100);
  });

  it('거리를 모르면(스텁 생략) 진다 — 「못 잰 것」이 이기면 안 된다', () => {
    const noDist: StubHit = {
      object: objWith(IDENTITY),
      point: { x: 100, y: 1, z: 0 }, face: { normal: { x: 1, y: 0, z: 0 } },
    };
    expect(makePicker([noDist], { hits: [VI(999)] }).pickFace()!.point.x).toBe(200);
  });
});
