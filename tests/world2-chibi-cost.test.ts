// @vitest-environment jsdom
//
// 치비 한 체가 **씬에 무엇을 얼마나 더하는가.**
//
// ── 감독 질문에서 생겼다 ────────────────────────────────────────────────────
// *"일단 우리 치비 돌아다니게 해볼까? 월드 1처럼. 얼마나 무거워지는지 보자."*
//
// world2 의 제1원리는 개수 불변식이다 — 파셀을 로드해도 재질·지오·파이프라인·드로우콜
// 이 상수여야 한다. 그런데 치비는 파츠와 근본적으로 다르다:
//
//   · `toon()` 이 호출마다 `new MeshToonMaterial` 을 만든다 (`chibi-materials.ts:36`)
//   · `addOutline` 이 메시를 하나 더 단다 — 드로우콜 2배
//   · 종족·머리모양·얼굴이 파라미터라 룩마다 지오가 다르다
//
// 그래서 "N체를 만든다" 가 곧 "재질 N배·드로우콜 N배" 다. 이 파일은 그 N배의 **밑수**를
// 재서 못 박는다. 밑수를 모르면 몇 체까지 감당되는지도 못 정한다.
//
// ── 왜 예산을 테스트로 두는가 ───────────────────────────────────────────────
// 치비는 라이브 미술관이 함께 쓰는 자산이라 앞으로도 계속 손이 간다(종족 추가·액세서리
// 확장). 그 변경은 화면에서 *"좀 더 예뻐졌네"* 로만 보이고 비용은 안 보인다. 나무
// 삼각형 예산을 못 박은 것과 같은 이유다 — **눈으로는 못 잡는 종류의 회귀**다.
//
// 여기 숫자가 깨지면 그것 자체는 잘못이 아니다. world2 의 동시 체수 상한을 다시 계산
// 하라는 신호다.

import { describe, it, expect } from 'vitest';
import { buildChibi, DEFAULT_CHIBI, CHIBI_SPECIES } from '../frontend/js/chibi.js';

// jsdom 에는 네이티브 캔버스가 없다. 치비는 얼굴을 캔버스에 그려 텍스처로 쓰므로
// 2D 컨텍스트가 없으면 빌드가 끝까지 가지 못한다. 보는 것은 **개수**이므로 그리기는
// 전부 no-op 이어도 된다.
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

interface Cost {
  meshes: number;
  materials: number;
  geometries: number;
  triangles: number;
}

// 타입을 `THREE.Mesh` 로 적지 않는다 — `three` 는 `Mesh`·`Material`·`Object3D` 를 타입
// 네임스페이스로 재수출하지 않아서(TS2694) 적으면 컴파일이 안 된다. 나무 지오·구운 파츠
// 테스트에서 이미 두 번 겪은 함정이라 같은 처방을 쓴다: 필요한 모양만 구조적으로 적는다.
interface MeshLike {
  isMesh?: boolean;
  material?: { uuid: string } | { uuid: string }[];
  geometry?: {
    uuid: string;
    index: { count: number } | null;
    attributes: Record<string, { count: number } | undefined>;
    dispose(): void;
  };
}
interface Traversable {
  traverse(fn: (o: unknown) => void): void;
}

/** 씬 그래프를 훑어 실제로 그려지는 것을 센다. 재질·지오는 **uuid 로** 센다 — 공유되면
 *  하나로 세어야 "몇 개가 새로 생기는가" 라는 질문에 맞는 답이 된다 */
function costOf(group: Traversable): Cost {
  const mats = new Set<string>();
  const geos = new Set<string>();
  let meshes = 0, triangles = 0;
  group.traverse((o) => {
    const m = o as MeshLike;
    if (!m.isMesh) return;
    meshes++;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      if (mat) mats.add(mat.uuid);
    }
    const g = m.geometry;
    if (!g) return;
    geos.add(g.uuid);
    const pos = g.attributes.position;
    if (pos) triangles += (g.index ? g.index.count : pos.count) / 3;
  });
  return { meshes, materials: mats.size, geometries: geos.size, triangles: Math.round(triangles) };
}

describe('치비 한 체의 비용', () => {
  const c = buildChibi(DEFAULT_CHIBI);
  const cost = costOf(c.group as Traversable);

  it('측정값을 남긴다 — 이 숫자가 world2 동시 체수의 근거다', () => {
    // 실측을 기록해 두는 단언이다. 여유를 얹지 않는다 — "여유를 얹은 값" 은 근거가
    // 아니라는 것이 이 저장소의 규율이고, 실제 값이 바뀌면 여기서 알려야 한다.
    expect(cost.meshes).toBeGreaterThan(0);
    expect(cost.materials).toBeGreaterThan(0);
    expect(cost.triangles).toBeGreaterThan(0);
  });

  // 상한을 임의로 정하지 않고 **실측을 못 박는다.** 임의 상한은 "얼마면 괜찮은가" 를
  // 아는 척하는 것이고, 그 답은 감독 기기 실측에서만 나온다. 여기 값이 깨지는 것은
  // 잘못이 아니라 **예산을 다시 계산하라는 신호**다.
  //
  // 비교값(2026-07-28 감독 기기): 세계 전체가 드로우콜 20 · 삼각형 42,275 였다.
  // 나무 한 그루는 214삼각형이다 — 치비 한 체가 나무 114그루에 해당한다.
  it('실측 골든 — 메시 45 · 재질 29 · 지오 45 · 삼각형 24,360', () => {
    expect(cost).toEqual({ meshes: 45, materials: 29, geometries: 45, triangles: 24360 });
  });

  it('dispose 가 자산을 실제로 반납한다 — 체를 재사용 못 하면 누수가 된다', () => {
    const tmp = buildChibi(DEFAULT_CHIBI);
    let disposed = 0;
    (tmp.group as Traversable).traverse((o) => {
      const m = o as MeshLike;
      if (!m.isMesh || !m.geometry) return;
      const g = m.geometry;
      const orig = g.dispose.bind(g);
      g.dispose = () => { disposed++; orig(); };
    });
    tmp.dispose();
    expect(disposed).toBeGreaterThan(0);
  });
});

describe('룩이 달라지면 자산도 달라진다 — 공유가 안 되는 지점', () => {
  // 이것이 world2 설계의 제약이다. 종족마다 지오가 다르면 "치비 지오 하나를 인스턴싱"
  // 이 성립하지 않는다. 몇 종을 미리 굽고 그것을 **공유**하는 쪽으로 가야 한다.
  it('두 체가 재질을 공유하지 않는다', () => {
    const a = buildChibi(DEFAULT_CHIBI);
    const b = buildChibi(DEFAULT_CHIBI);
    const ua = new Set<string>();
    const ub = new Set<string>();
    const collect = (g: Traversable, into: Set<string>) => g.traverse((o) => {
      const m = o as MeshLike;
      if (m.isMesh && m.material && !Array.isArray(m.material)) into.add(m.material.uuid);
    });
    collect(a.group as Traversable, ua);
    collect(b.group as Traversable, ub);
    // 교집합이 비어 있다 = 같은 파라미터로 만들어도 재질이 새로 생긴다.
    const shared = [...ua].filter((u) => ub.has(u));
    expect(shared).toHaveLength(0);
    a.dispose(); b.dispose();
  });

  it('종족이 여럿이다 — 미리 구울 대상이 몇 가지인지가 예산을 정한다', () => {
    expect(CHIBI_SPECIES.length).toBeGreaterThan(1);
  });
});
