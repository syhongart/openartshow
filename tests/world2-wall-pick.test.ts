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
import { toWorldNormal, wallPose, WALL_GAP } from '../frontend/js/world2/decide/artwork.js';
import type { OverlayEntry, OverlayHost } from '../frontend/js/world2/edit/types.js';
import { makeThreeStub, type StubHit } from './helpers/three-stub.js';
import { createEditState } from '../frontend/js/world2/edit/state.js';

/** 열 우선 4×4 — Y축 회전 `ry` 만. 이동은 법선 변환에 영향이 없다(방향 벡터라서) */
function rotY(ry: number): number[] {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function objWith(m: number[]): unknown {
  return { matrixWorld: { elements: m } };
}

function makePicker(hits: StubHit[]) {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    toJSON() { return {}; },
  }) as DOMRect;

  const entries: OverlayEntry[] = [];
  const host = {
    THREE: makeThreeStub({ hits: () => hits }),
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
    instances: null,
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
