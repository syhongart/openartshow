// world-gen.js — 시드 절차적 방 생성기 (behind-flag 오픈월드)
// -----------------------------------------------------------------------------
// 100방+를 손저작 없이 생성한다. 결정론(seeded PRNG)이라 모든 방문자가 동일 세계를
// 본다(무저장 유지). 각 방은 medium(9×7) 통일 — cellX=9/cellZ=7 그리드에서 벽이 정확히
// 맞닿는다(북벽 월드z = pz*7-3.5 = 북쪽 이웃 남벽). 개구부(shell.entries)는 격자 경계로
// 자동 대칭(computeEntries) → "인접 쌍은 대응 방향 문을 함께 선언" 불변식을 구조적 보장.
//
// 테마: medium 통일을 유지하면서 finish(마감) 편향 + 파츠 팔레트로 방 성격을 부여한다
// (전시실/정원/라운지/미디어/조각/젠). **solid 파츠는 중앙 십자 통로(문 폭) 밖 코너존에만**
// 배치해 어느 방향 문으로도 통행이 막히지 않게 한다(SAFE 좌표 규칙).
//
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

const TRIMS = ['brass', 'charcoal'];
const RUG_COLORS = ['#c9bfae', '#e4ddd0', '#a9705a', '#8a9481'];
const pickR = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
const chance = (rng, p) => rng() < p;

// medium(hw=4.5, hd=3.5) 안전 코너존 — |x|≥1.5 & |z|≥1.5 → 중앙 십자(문 폭 2.6) 통로 밖.
// solid 파츠는 이 좌표들만 사용해 어느 문으로도 통행이 막히지 않게 한다.
const CORNER = { nw: [-2.7, -1.9], ne: [2.7, -1.9], sw: [-2.7, 1.9], se: [2.7, 1.9] };
const NWALL = { l: [-2.7, -1.5], r: [2.7, -1.5] }; // 북벽 작품 아래 좌대 위치(통로 밖)

// ── 테마 — finish 팔레트 + 파츠 furnish(rng, parts). medium 통일 유지. ──
const THEMES = [
  {
    id: 'gallery', name: '전시실',
    walls: ['white', 'warmsand'], floors: ['parquet', 'terrazzo'], ceils: ['whiteflat'], feats: ['deepviolet', 'kintsugi'],
    furnish(rng, p) {
      p.push({ t: 'pedestal', x: NWALL.l[0], z: NWALL.l[1], ry: 0 });
      if (chance(rng, 0.6)) p.push({ t: 'pedestal', x: NWALL.r[0], z: NWALL.r[1], ry: 0 });
      if (chance(rng, 0.7)) p.push({ t: 'rug', x: 0, z: 0.3, ry: 0, variant: 'rect', color: pickR(rng, RUG_COLORS) }); // non-solid 중앙 OK
      if (chance(rng, 0.5)) p.push({ t: 'bench', x: CORNER.se[0], z: CORNER.se[1], ry: Math.PI / 2, size: 1.2 });
      if (chance(rng, 0.4)) p.push({ t: 'planter', x: CORNER.sw[0], z: CORNER.sw[1], ry: 0 });
    },
  },
  {
    id: 'garden', name: '정원 갤러리',
    walls: ['white', 'warmsand'], floors: ['grass'], ceils: ['whiteflat'], feats: ['warmsand', 'kintsugi'],
    furnish(rng, p) {
      p.push({ t: 'planter', x: CORNER.nw[0], z: CORNER.nw[1], ry: 0 });
      p.push({ t: 'planter', x: CORNER.ne[0], z: CORNER.ne[1], ry: 0 });
      p.push({ t: chance(rng, 0.5) ? 'bigplant' : 'palm', x: CORNER.sw[0], z: CORNER.sw[1], ry: 0 });
      if (chance(rng, 0.7)) p.push({ t: 'succulent', x: CORNER.se[0], z: CORNER.se[1], ry: 0 });
      if (chance(rng, 0.5)) p.push({ t: 'bench', x: 0, z: 1.0, ry: 0, size: 1.2 }); // 짧은 벤치, 통로폭 여유
    },
  },
  {
    id: 'lounge', name: '라운지',
    walls: ['warmsand', 'white'], floors: ['terrazzo', 'parquet'], ceils: ['whiteflat'], feats: ['kintsugi', 'warmsand'],
    furnish(rng, p) {
      p.push({ t: 'lounge', x: CORNER.se[0] - 0.2, z: CORNER.se[1], ry: -Math.PI / 2 });
      if (chance(rng, 0.7)) p.push({ t: 'stool', x: CORNER.sw[0], z: CORNER.sw[1], ry: 0 });
      if (chance(rng, 0.6)) p.push({ t: 'pendantLight', x: 0, z: 0, ry: 0 }); // 천장 부착(partY)
      if (chance(rng, 0.7)) p.push({ t: 'rug', x: 0, z: 0.6, ry: 0, variant: 'round', color: pickR(rng, RUG_COLORS) });
    },
  },
  {
    id: 'media', name: '미디어룸',
    walls: ['charcoal'], floors: ['concrete'], ceils: ['darkmatte'], feats: ['charcoal', 'deepviolet'],
    furnish(rng, p) {
      // 스크린은 non-solid 벽걸이 — 측벽에. (src 빈 문자열 = 검은 화면 플레이스홀더, §6-5 유튜브 게이트 무관)
      p.push({ t: 'screen', x: -4.3, z: -0.4, ry: Math.PI / 2, ratio: '16:9', src: '' });
      if (chance(rng, 0.6)) p.push({ t: 'screen', x: 4.3, z: -0.4, ry: -Math.PI / 2, ratio: '16:9', src: '' });
      if (chance(rng, 0.6)) p.push({ t: 'bench', x: 0, z: 1.2, ry: 0, size: 1.2 });
      if (chance(rng, 0.4)) p.push({ t: 'floorlamp', x: CORNER.ne[0], z: CORNER.ne[1], ry: 0 });
    },
  },
  {
    id: 'sculpture', name: '조각실',
    walls: ['white', 'charcoal'], floors: ['concrete', 'terrazzo'], ceils: ['whiteflat', 'darkmatte'], feats: ['charcoal', 'deepviolet'],
    furnish(rng, p) {
      p.push({ t: 'pedestal', x: CORNER.nw[0], z: CORNER.nw[1], ry: 0 });
      p.push({ t: 'pedestal', x: CORNER.ne[0], z: CORNER.ne[1], ry: 0 });
      if (chance(rng, 0.6)) p.push({ t: 'vitrine', x: CORNER.sw[0], z: CORNER.sw[1], ry: 0 });
      if (chance(rng, 0.5)) p.push({ t: 'stanchion', x: CORNER.se[0], z: CORNER.se[1], ry: 0 });
    },
  },
  {
    id: 'zen', name: '명상실',
    walls: ['charcoal', 'warmsand'], floors: ['water'], ceils: ['darkmatte'], feats: ['charcoal', 'kintsugi'],
    furnish(rng, p) {
      if (chance(rng, 0.8)) p.push({ t: 'succulent', x: CORNER.nw[0], z: CORNER.nw[1], ry: 0 });
      if (chance(rng, 0.6)) p.push({ t: 'vase', x: CORNER.ne[0], z: CORNER.ne[1], ry: 0 });
      if (chance(rng, 0.5)) p.push({ t: 'bench', x: 0, z: 1.0, ry: 0, size: 1.2 });
    },
  },
];

// 랜드마크 방은 medium 프리셋만(좌표가 medium 기준이라 벽 밖 배치 방지). small/large 프리셋 제외.
const MEDIUM_PRESETS = SPACE_PRESETS.filter((p) => p.space.shell.footprint === 'medium');

/**
 * 파셀 (px,pz)의 결정론적 medium 방 문서. seed·grid로 완전 재현.
 * normalizeSpace를 통과해 스키마 검증·기본값 폴백이 자동 적용된다.
 */
export function genRoom(px, pz, seed, grid) {
  const rng = mulberry32(cellSeed(seed, px, pz));
  const entries = computeEntries(px, pz, grid);

  // 랜드마크 방(12%) — medium 프리셋 deep-clone, entries만 격자 대칭으로 덮어씀.
  if (rng() < 0.12 && MEDIUM_PRESETS.length) {
    const preset = MEDIUM_PRESETS[Math.floor(rng() * MEDIUM_PRESETS.length) % MEDIUM_PRESETS.length];
    const base = JSON.parse(JSON.stringify(preset.space));
    base.shell.entries = entries;
    base.meta = { name: preset.name + ` ${px}-${pz}`, author: '' };
    return normalizeSpace(base);
  }

  // 테마 방 — 테마별 finish 팔레트 + 파츠 furnish(코너존 solid, 중앙 십자 통로 보존).
  const theme = THEMES[Math.floor(rng() * THEMES.length) % THEMES.length];
  const finish = {
    wall: pickR(rng, theme.walls),
    floor: pickR(rng, theme.floors),
    ceiling: pickR(rng, theme.ceils),
    trim: pickR(rng, TRIMS),
    featureWall: 'north',
    featureFinish: pickR(rng, theme.feats),
  };
  const parts = northArt(-3.4);                                  // 북벽 작품 3(featured 중앙)
  for (const x of [-3, 0, 3]) parts.push({ t: 'trackLight', x, z: -3.0, ry: 0 }); // 작품 트랙 조명
  // [다층] 20% 방은 2층 — SW 서벽 계단(z 남→중앙, 문 통로 z≈0 무간섭) + 상층 동벽 작품 2.
  // 다층 방은 theme.furnish를 건너뛴다(코너 파츠가 계단 경로를 막지 않도록). 단층은 기존대로.
  let floors = 1, stairs = [];
  if (rng() < 0.2) {
    floors = 2;
    stairs = [{ x0: -4.0, x1: -2.6, z0: 3.0, z1: 0.5, yFrom: 0, yTo: 3.6 }];
    for (const z of [-1.4, 1.4]) parts.push({ t: 'artwork', x: 3.4, z, ry: -Math.PI / 2, floor: 1, frame: 'minimal', src: '' });
    parts.push({ t: 'trackLight', x: 3.0, z: 0, ry: 0, floor: 1 });
  } else {
    theme.furnish(rng, parts);                                   // 단층: 테마 파츠(코너존)
  }

  return normalizeSpace({
    version: 2,
    meta: { name: `${theme.name} ${px}-${pz}${floors > 1 ? ' ▲2F' : ''}`, author: '' },
    shell: { footprint: 'medium', storyH: 'gallery', wallT: 0.2, entries, floors, stairs, finish },
    spawn: { x: 0, z: 3.0, ry: 0 }, // 첫 파셀에서만 사용됨(world.js)
    parts,
  });
}
