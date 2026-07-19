// world-gen.js — 시드 절차적 방 생성기 (behind-flag 오픈월드 1단계)
// -----------------------------------------------------------------------------
// 100방(10×10)을 손저작 없이 생성한다. 결정론(seeded PRNG)이라 모든 방문자가 동일 세계를
// 본다(무저장 유지). 각 방은 medium(9×7) 통일 — cellX=9/cellZ=7 그리드에서 벽이 정확히
// 맞닿는다(북벽 월드z = pz*7-3.5 = 북쪽 이웃 남벽). 개구부(shell.entries)는 격자 경계로
// 자동 대칭(computeEntries) → "인접 쌍은 대응 방향 문을 함께 선언" 불변식을 구조적 보장.
// 재사용: space-presets의 northArt·SPACE_PRESETS, space.js normalizeSpace(검증·기본값 폴백).
// -----------------------------------------------------------------------------
import { normalizeSpace } from './space.js';
import { northArt, SPACE_PRESETS } from './space-presets.js';

// ── seeded PRNG (mulberry32) — Math.random 금지: 모든 방문자 동일 세계 ──
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 셀별 시드 — 전역 seed와 (px,pz) 정수 해시 결합(부동소수 누적 0 → 브라우저 무관 재현).
export function cellSeed(base, px, pz) {
  return (base ^ Math.imul(px + 1, 73856093) ^ Math.imul(pz + 1, 19349663)) >>> 0;
}

// ── 개구부 자동 대칭 — 격자 경계로 이웃 존재 방향 산출 ──
// A.east 조건(px<w-1) ⟺ 이웃 B(px+1,pz).west 조건(px+1>0) → 대칭이 구조적으로 보장된다.
// world.js clampPos의 방향↔이웃 매핑(east=+x, west=-x, south=+z, north=-z)과 일치.
export function computeEntries(px, pz, grid) {
  const out = [];
  if (pz > 0) out.push('north');           // -z 이웃 존재
  if (pz < grid.h - 1) out.push('south');  // +z 이웃 존재
  if (px > 0) out.push('west');            // -x 이웃 존재
  if (px < grid.w - 1) out.push('east');   // +x 이웃 존재
  return out;
}

// 조화로운 마감 팔레트(space.js FINISH 부분집합 — 큐레이션). 조합 3×4×2×2×4 = 192종.
const WALLS = ['white', 'warmsand', 'charcoal'];
const FLOORS = ['parquet', 'terrazzo', 'concrete', 'grass']; // water는 정적 반사 폴백이라 제외
const CEILS = ['whiteflat', 'darkmatte'];
const TRIMS = ['brass', 'charcoal'];
const FEATS = ['deepviolet', 'kintsugi', 'charcoal', 'warmsand'];
const RUG_COLORS = ['#c9bfae', '#e4ddd0', '#a9705a', '#8a9481'];
const pickR = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

// 랜드마크 방은 medium 프리셋만(좌표가 medium 기준이라 벽 밖 배치 방지). small/large 프리셋 제외.
const MEDIUM_PRESETS = SPACE_PRESETS.filter((p) => p.space.shell.footprint === 'medium');

/**
 * 파셀 (px,pz)의 결정론적 medium 방 문서. seed·grid로 완전 재현.
 * normalizeSpace를 통과해 스키마 검증·기본값 폴백이 자동 적용된다.
 */
export function genRoom(px, pz, seed, grid) {
  const rng = mulberry32(cellSeed(seed, px, pz));
  const entries = computeEntries(px, pz, grid);

  // 랜드마크 방(15%) — medium 프리셋 deep-clone, entries만 격자 대칭으로 덮어씀(다양성 보강).
  if (rng() < 0.15 && MEDIUM_PRESETS.length) {
    const preset = MEDIUM_PRESETS[Math.floor(rng() * MEDIUM_PRESETS.length) % MEDIUM_PRESETS.length];
    const base = JSON.parse(JSON.stringify(preset.space));
    base.shell.entries = entries;
    base.meta = { name: preset.name + ` ${px}-${pz}`, author: '' };
    return normalizeSpace(base);
  }

  // 절차 방 — 마감 조합 + rng 가구 팔레트(방당 파츠 ~10-15, ART_SCREEN_CAP=80 여유).
  const wall = pickR(rng, WALLS);
  const floor = pickR(rng, FLOORS);
  const ceiling = wall === 'charcoal' ? 'darkmatte' : pickR(rng, CEILS); // 어두운 벽엔 어두운 천장
  const trim = pickR(rng, TRIMS);
  const feature = pickR(rng, FEATS);

  const parts = northArt(-3.4); // 북벽 작품 3(featured 중앙) — 프리셋 헬퍼 재사용
  if (rng() < 0.7) parts.push({ t: 'bench', x: 0, z: 1.0, ry: 0, size: 1.8 });
  if (rng() < 0.6) parts.push({ t: 'rug', x: 0, z: 0.2, ry: 0, variant: rng() < 0.5 ? 'rect' : 'round', color: pickR(rng, RUG_COLORS) });
  if (rng() < 0.5) parts.push({ t: 'pedestal', x: rng() < 0.5 ? -1.4 : 1.4, z: -0.4, ry: 0 });
  if (rng() < 0.4) { parts.push({ t: 'planter', x: -3.6, z: 2.2, ry: 0 }); parts.push({ t: 'planter', x: 3.6, z: 2.2, ry: 0 }); }
  for (const x of [-3, 0, 3]) parts.push({ t: 'trackLight', x, z: -3.0, ry: 0 }); // 작품 트랙 조명 고정

  return normalizeSpace({
    version: 2,
    meta: { name: `전시실 ${px}-${pz}`, author: '' },
    shell: {
      footprint: 'medium', storyH: 'gallery', wallT: 0.2,
      entries,
      finish: { wall, floor, ceiling, trim, featureWall: 'north', featureFinish: feature },
    },
    spawn: { x: 0, z: 3.0, ry: 0 }, // 첫 파셀에서만 사용됨(world.js)
    parts,
  });
}
