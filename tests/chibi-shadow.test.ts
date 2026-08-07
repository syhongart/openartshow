// @vitest-environment jsdom
//
// 치비 프리뷰의 그림자 caster 선별 테스트.
//
// ── 왜 이 파일이 필요한가 ────────────────────────────────────────────────────
// 캐릭터 편집기 프리뷰가 **모든 메시**에 `castShadow=true` 를 걸어 그림자맵이 캐릭터를
// 통째로 한 번 더 그리고 있었다(프레임당 98 draw 중 45가 그림자 depth pass). 아웃라인
// 셸 20개를 빼서 25로 줄였다 — 근거와 기각된 대안은 `frontend/js/chibi-shadow.ts`
// 머리말 한 곳이다(여기에 다시 적지 않는다).
//
// 지키는 것은 **성질**이지 값이 아니다. 셸이 caster 가 아니어야 하는 이유는 실측이
// 아니라 기하이고(원본을 감싼 복제본이라 새로 기여할 것이 없다), 그래서 룩이 늘어도
// 계속 참이어야 한다. 값을 못 박는 테스트였다면 종족을 하나 추가할 때마다 깨졌을 것이다.
//
// ── 이 파일이 한 번 값을 했다 ───────────────────────────────────────────────
// 원래 권고안은 "셸 제외 + 반지름 0.08 미만 제외"(-33.7%)였고, 근거는 *"파츠 반지름이
// 0.075 다음 0.1025 로 뛴다"* 는 갭이었다. 임계 근처 밴드를 검사하는 테스트를 붙이자마자
// **세 룩 전부 실패**했다 — 전 룩을 합치면 0.077·0.0815 가 그 갭을 메워, 0.08 은 갭이
// 아니라 파츠 6개가 몰린 자리 한복판이었다. 그 갭은 사람 기본 룩에만 있었다.
// 임계 기준은 그래서 채택되지 않았고, 아래 「분포 진단」이 그 판정을 다시 열 때 쓰는
// 도구로 남는다.

import { describe, it, expect } from 'vitest';
import { buildChibi, DEFAULT_CHIBI, CHIBI_SPECIES } from '../frontend/js/chibi.js';
import {
  isOutlineShell,
  shouldCastShadow,
  countShadowCasters,
  applyPreviewShadowCasters,
} from '../frontend/js/chibi-shadow.js';

// jsdom 에는 네이티브 캔버스가 없다. 치비는 얼굴을 캔버스에 그려 텍스처로 쓰므로 2D
// 컨텍스트가 없으면 빌드가 끝까지 가지 못한다. 보는 것은 **개수**이므로 그리기는 전부
// no-op 이어도 된다(world2-chibi-cost.test.ts 와 같은 처방).
const ctx2d = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: '', globalAlpha: 1, font: '',
  textAlign: '', textBaseline: '', shadowBlur: 0, shadowColor: '',
  fillRect() {}, clearRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
  arc() {}, ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {}, rect() {},
  fill() {}, stroke() {}, fillText() {}, save() {}, restore() {}, translate() {},
  rotate() {}, scale() {}, clip() {}, setTransform() {}, drawImage() {},
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  putImageData() {},
};
(HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () => ctx2d;

interface Traversable { traverse(fn: (o: unknown) => void): void }

/** 첫 비인간 종족 — 동물 룩은 귀·꼬리가 붙어 메시 구성이 사람과 다르다. */
const ANIMAL = (CHIBI_SPECIES as { id: string }[]).find((s) => s.id !== 'human');

/** 검사할 룩들. 장식은 실루엣을 크게 바꾸므로 반드시 넣는다(날개·헤일로). */
const LOOKS: { name: string; params: Record<string, unknown> }[] = [
  { name: '사람 기본', params: { ...DEFAULT_CHIBI } },
  { name: '동물', params: { ...DEFAULT_CHIBI, species: ANIMAL ? ANIMAL.id : 'human' } },
  {
    name: '장식 풀(날개·헤일로·안경·하트)',
    params: { ...DEFAULT_CHIBI, wings: true, halo: true, glasses: true, heart: true },
  },
];

describe('치비 그림자 caster 선별', () => {
  it.each(LOOKS)('$name — 아웃라인 셸은 caster 가 아니다', ({ params }) => {
    const group = buildChibi(params).group as Traversable;
    applyPreviewShadowCasters(group);

    let shells = 0;
    group.traverse((o) => {
      const m = o as { isMesh?: boolean; castShadow?: boolean };
      if (!m.isMesh || !isOutlineShell(o as never)) return;
      shells++;
      expect(m.castShadow).toBe(false);
    });
    // 셸이 0이면 이 테스트는 아무것도 안 본 것이다 — 통과가 아니라 측정 실패다.
    expect(shells).toBeGreaterThan(0);
  });

  it.each(LOOKS)('$name — 셸이 아닌 메시는 전부 caster 다', ({ params }) => {
    const group = buildChibi(params).group as Traversable;
    applyPreviewShadowCasters(group);

    group.traverse((o) => {
      const m = o as { isMesh?: boolean; castShadow?: boolean };
      if (!m.isMesh || isOutlineShell(o as never)) return;
      // 셸 외에는 아무것도 거르지 않는다 — 거르는 순간 룩 손실이 생기고, 그때는
      // 육안 비교와 임계 근거가 함께 있어야 한다(chibi-shadow.ts 머리말 참조).
      expect(m.castShadow).toBe(true);
    });
  });

  it.each(LOOKS)('$name — caster 가 셸 개수만큼 정확히 줄어든다', ({ params }) => {
    const group = buildChibi(params).group as Traversable;
    const { meshes, shells, casters } = countShadowCasters(group);
    expect(shells).toBeGreaterThan(0);
    expect(casters).toBe(meshes - shells);
    // 셸이 전체의 상당 부분이라는 것이 이 최적화의 크기다. 이 비율이 무너지면
    // (예: 아웃라인을 안 쓰는 파츠가 늘면) 얻는 것이 줄었다는 신호다.
    expect(shells / meshes).toBeGreaterThan(0.3);
  });

  // ── 분포 진단 — 반지름 기준을 다시 열 때 쓰는 도구 ────────────────────────

  it('파츠 반지름 분포를 관찰할 수 있다 (임계 판정을 다시 열 때의 근거)', () => {
    const group = buildChibi({ ...DEFAULT_CHIBI }).group as Traversable;
    const { radii } = countShadowCasters(group);
    expect(radii.length).toBeGreaterThan(0);
    expect(radii.every((r) => r > 0)).toBe(true);
    // 반지름이 전부 같으면 크기 기준 자체가 성립하지 않는다 — 분포가 있다는 확인.
    expect(new Set(radii.map((r) => r.toFixed(4))).size).toBeGreaterThan(1);
  });

  // ── 단위 — 판정 함수 자체 ───────────────────────────────────────────────

  it('부모가 메시가 아니면 셸이 아니다 (BackSide 만으로 판정하지 않는다)', () => {
    const backSideMat = { side: 1 }; // THREE.BackSide === 1
    expect(isOutlineShell({ parent: null, material: backSideMat } as never)).toBe(false);
    expect(isOutlineShell({ parent: { isMesh: false }, material: backSideMat } as never)).toBe(false);
    expect(isOutlineShell({ parent: { isMesh: true }, material: backSideMat } as never)).toBe(true);
  });

  it('BackSide 가 아니면 셸이 아니다 (부모가 메시인 것만으로 판정하지 않는다)', () => {
    expect(isOutlineShell({ parent: { isMesh: true }, material: { side: 0 } } as never)).toBe(false);
  });

  it('메시가 아니면 caster 가 아니다', () => {
    expect(shouldCastShadow({ isMesh: false } as never)).toBe(false);
  });
});
