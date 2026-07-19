// world-gen.js — 시드 절차적 파셀 생성기 (behind-flag 오픈월드 · 복셀스식 개방 도시)
// -----------------------------------------------------------------------------
// [복셀스 전환] "파셀 = 밀폐된 방" → "파셀 = 하늘 아래 대지(건물 + 마당 + 길)".
// 셀(기본 24m)이 건물 풋프린트보다 크므로 파셀 가장자리가 자연히 길이 되고,
// 인접 건물이 서로 붙지 않아 벽 정합 제약이 소멸 → footprint·층고·층수 전부 자유.
// 강은 시드 랜덤워크 열(riverColAt) — 해당 파셀은 건물·지면 없음(바다 평면 노출) + 다리.
//
// 결정론(seeded PRNG): 모든 방문자가 동일 세계(무저장 유지). Math.random 금지.
// genParcel(px,pz,seed,grid,cell) → { water, space|null, bx, bz }
//   space: 건물 문서(space.js v2 — floors/stairs/entries 가산 필드 사용, 스키마 무수정)
//   bx,bz: 파셀 중심 대비 건물 오프셋(지터 — 스카이라인 리듬)
// 재사용: space-presets SPACE_PRESETS(랜드마크), space.js normalizeSpace(검증·폴백).
// -----------------------------------------------------------------------------
import { normalizeSpace, FOOTPRINT, STORY_H, PART_TYPES } from './space.js';
import { SPACE_PRESETS } from './space-presets.js';

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

// ── 강 경로 — 행(pz)마다 강이 흐르는 열(px). 랜덤워크(행당 ±1, 결정론) ──
export function riverColAt(pz, seed, grid) {
  const r0 = mulberry32(cellSeed(seed ^ 0x517cc1, 7, 0));
  let col = 1 + Math.floor(r0() * Math.max(1, grid.w - 2));
  for (let z = 1; z <= pz; z++) {
    const step = Math.floor(mulberry32(cellSeed(seed ^ 0x517cc1, 7, z))() * 3) - 1; // -1|0|+1
    col = Math.max(1, Math.min(grid.w - 2, col + step));
  }
  return col;
}

const TRIMS = ['brass', 'charcoal'];
const RUG_COLORS = ['#c9bfae', '#e4ddd0', '#a9705a', '#8a9481'];
const pickR = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
const chance = (rng, p) => rng() < p;

// ── 테마 — finish 팔레트 + furnish(rng, parts, d). 좌표는 dims 기반(footprint 자유).
// d = { hw, hd, cx, cz, southOk }  (cx/cz=코너존, southOk=남쪽 대형가구 허용 폭)
// 남문 통로 x∈[-1.3,1.3]은 남쪽 절반(z>0)에서 solid 금지 — cx≥1.5 보장, 대형은 southOk 가드.
const THEMES = [
  {
    id: 'gallery', name: '전시실',
    walls: ['white', 'warmsand'], floors: ['parquet', 'terrazzo'], ceils: ['whiteflat'], feats: ['deepviolet', 'kintsugi'],
    furnish(rng, p, d) {
      p.push({ t: 'pedestal', x: -d.cx, z: -d.cz + 0.4, ry: 0 });
      if (chance(rng, 0.6)) p.push({ t: 'pedestal', x: d.cx, z: -d.cz + 0.4, ry: 0 });
      if (chance(rng, 0.7)) p.push({ t: 'rug', x: 0, z: 0.3, ry: 0, variant: 'rect', color: pickR(rng, RUG_COLORS) }); // non-solid 중앙 OK
      if (d.southOk && chance(rng, 0.5)) p.push({ t: 'bench', x: d.cx, z: d.cz, ry: Math.PI / 2, size: 1.2 });
      if (chance(rng, 0.4)) p.push({ t: 'planter', x: -d.cx, z: d.cz, ry: 0 });
    },
  },
  {
    id: 'garden', name: '정원 갤러리',
    walls: ['white', 'warmsand'], floors: ['grass'], ceils: ['whiteflat'], feats: ['warmsand', 'kintsugi'],
    furnish(rng, p, d) {
      p.push({ t: 'planter', x: -d.cx, z: -d.cz, ry: 0 });
      p.push({ t: 'planter', x: d.cx, z: -d.cz, ry: 0 });
      p.push({ t: chance(rng, 0.5) ? 'bigplant' : 'palm', x: -d.cx, z: d.cz, ry: 0 });
      if (chance(rng, 0.7)) p.push({ t: 'succulent', x: d.cx, z: d.cz, ry: 0 });
    },
  },
  {
    id: 'lounge', name: '라운지',
    walls: ['warmsand', 'white'], floors: ['terrazzo', 'parquet'], ceils: ['whiteflat'], feats: ['kintsugi', 'warmsand'],
    furnish(rng, p, d) {
      if (d.southOk) p.push({ t: 'lounge', x: d.cx - 0.3, z: d.cz, ry: -Math.PI / 2 });
      if (chance(rng, 0.7)) p.push({ t: 'stool', x: -d.cx, z: d.cz, ry: 0 });
      if (chance(rng, 0.6)) p.push({ t: 'pendantLight', x: 0, z: 0, ry: 0 }); // 천장 부착(partY)
      if (chance(rng, 0.7)) p.push({ t: 'rug', x: 0, z: 0.6, ry: 0, variant: 'round', color: pickR(rng, RUG_COLORS) });
    },
  },
  {
    id: 'media', name: '미디어룸',
    walls: ['charcoal'], floors: ['concrete'], ceils: ['darkmatte'], feats: ['charcoal', 'deepviolet'],
    furnish(rng, p, d) {
      // 스크린은 non-solid 벽걸이 — 측벽에. (src 빈 문자열 = 플레이스홀더, §6-5 유튜브 게이트 무관)
      p.push({ t: 'screen', x: -(d.hw - 0.2), z: -0.4, ry: Math.PI / 2, ratio: '16:9', src: '' });
      if (chance(rng, 0.6)) p.push({ t: 'screen', x: d.hw - 0.2, z: -0.4, ry: -Math.PI / 2, ratio: '16:9', src: '' });
      if (chance(rng, 0.6)) p.push({ t: 'bench', x: 0, z: -d.cz + 0.6, ry: 0, size: 1.2 }); // 북쪽 절반(통로 밖)
      if (chance(rng, 0.4)) p.push({ t: 'floorlamp', x: d.cx, z: -d.cz, ry: 0 });
    },
  },
  {
    id: 'sculpture', name: '조각실',
    walls: ['white', 'charcoal'], floors: ['concrete', 'terrazzo'], ceils: ['whiteflat', 'darkmatte'], feats: ['charcoal', 'deepviolet'],
    furnish(rng, p, d) {
      p.push({ t: 'pedestal', x: -d.cx, z: -d.cz, ry: 0 });
      p.push({ t: 'pedestal', x: d.cx, z: -d.cz, ry: 0 });
      if (d.southOk && chance(rng, 0.6)) p.push({ t: 'vitrine', x: -d.cx, z: d.cz, ry: 0 }); // small은 통로 폭 부족 → 스킵
      if (d.southOk && chance(rng, 0.5)) p.push({ t: 'stanchion', x: d.cx, z: d.cz, ry: 0 });
    },
  },
  {
    id: 'zen', name: '명상실',
    walls: ['charcoal', 'warmsand'], floors: ['water'], ceils: ['darkmatte'], feats: ['charcoal', 'kintsugi'],
    furnish(rng, p, d) {
      if (chance(rng, 0.8)) p.push({ t: 'succulent', x: -d.cx, z: -d.cz, ry: 0 });
      if (chance(rng, 0.6)) p.push({ t: 'vase', x: d.cx, z: -d.cz, ry: 0 });
    },
  },
];

// 랜드마크 프리셋(주요 좌표가 medium 9×7 기준) — medium 건물에서만 사용.
const MEDIUM_PRESETS = SPACE_PRESETS.filter((p) => p.space.shell.footprint === 'medium');

// 건물 footprint 가중 선택 — 도시 스카이라인 다양성(감독: "방 크기 모두 다르게").
function pickFootprint(rng) {
  const r = rng();
  if (r < 0.35) return 'small';
  if (r < 0.80) return 'medium';
  return 'large';
}

/**
 * 파셀 (px,pz)의 결정론적 대지 정보. seed·grid·cell로 완전 재현.
 * @returns {{ water: boolean, space: object|null, bx: number, bz: number }}
 */
export function genParcel(px, pz, seed, grid, cell = { x: 24, z: 24 }) {
  // 강 파셀 — 건물·지면 없음(월드 바다 평면 노출) + 다리(world.js가 렌더/물리)
  if (riverColAt(pz, seed, grid) === px) return { water: true, space: null, bx: 0, bz: 0 };

  const rng = mulberry32(cellSeed(seed, px, pz));

  // ── 건물 파라미터: footprint·층고·층수 전부 자유(개방 세계 = 벽 정합 제약 소멸) ──
  const fpId = pickFootprint(rng);
  const [fw, fd] = FOOTPRINT[fpId];
  const hw = fw / 2, hd = fd / 2;
  const storyId = pickR(rng, ['studio', 'gallery', 'grand']);
  const H = STORY_H[storyId];
  const floors = chance(rng, 0.35) ? 2 : 1; // 1층 65% / 2층 35% → 스카이라인 2.8~8.4m

  // 건물 오프셋 지터(파셀 내, 도로 2.5m 확보) — 거리 리듬. 남쪽은 입구 앞 길 여유.
  const jx = Math.max(0, (cell.x - fw) / 2 - 3);
  const jz = Math.max(0, (cell.z - fd) / 2 - 3);
  const bx = (rng() * 2 - 1) * Math.min(2.5, jx);
  const bz = -rng() * Math.min(2.5, jz); // 북쪽 치우침(남쪽 마당·길 넓게)

  // ── 랜드마크(medium 12%) — 프리셋 그대로, 입구만 남쪽 ──
  if (fpId === 'medium' && chance(rng, 0.12) && MEDIUM_PRESETS.length) {
    const preset = MEDIUM_PRESETS[Math.floor(rng() * MEDIUM_PRESETS.length) % MEDIUM_PRESETS.length];
    const base = JSON.parse(JSON.stringify(preset.space));
    base.shell.entries = ['south'];
    base.meta = { name: preset.name + ` ${px}-${pz}`, author: '' };
    // 프리셋은 남문 없던 시절 설계 — 남쪽 통로(x∈[-1.3,1.3], z>0.3)를 막는 solid 파츠만 제거.
    base.parts = (base.parts || []).filter((p) => {
      const spec = PART_TYPES[p.t];
      if (!spec || !spec.solid || !(p.z > 0.3)) return true;
      return Math.abs(p.x) - Math.max(spec.size[0], spec.size[2]) / 2 >= 1.31;
    });
    return { water: false, space: normalizeSpace(base), bx, bz };
  }

  // ── 테마 건물 — 좌표는 dims 기반(footprint 자유) ──
  const theme = THEMES[Math.floor(rng() * THEMES.length) % THEMES.length];
  const finish = {
    wall: pickR(rng, theme.walls),
    floor: pickR(rng, theme.floors),
    ceiling: pickR(rng, theme.ceils),
    trim: pickR(rng, TRIMS),
    featureWall: 'north',
    featureFinish: pickR(rng, theme.feats),
  };
  const artZ = -(hd - 0.1);              // 북벽 벽걸이(footprint 무관)
  const ax = Math.min(3, fw / 3);        // 작품 x 간격
  const d = { hw, hd, cx: hw - 1.3, cz: hd - 1.3, southOk: hw >= 3.5 };

  const parts = [
    { t: 'artwork', x: -ax, z: artZ, ry: 0, frame: 'minimal', src: '' },
    { t: 'artwork', x: 0, z: artZ, ry: 0, frame: 'minimal', src: '', featured: true },
    { t: 'artwork', x: ax, z: artZ, ry: 0, frame: 'minimal', src: '' },
  ];
  for (const x of [-ax, 0, ax]) parts.push({ t: 'trackLight', x, z: artZ + 0.4, ry: 0 });

  // 다층: 서벽 안쪽 계단(남→중앙 상승, 남문 통로 x∈[-1.3,1.3] 밖) + 상층 동벽 작품.
  let stairs = [];
  if (floors > 1) {
    const sx0 = -(hw - 0.4), sx1 = sx0 + 1.2; // 폭 1.2 — small에서도 x1=-1.4 < -1.3(통로 밖)
    stairs = [{ x0: sx0, x1: sx1, z0: hd - 0.6, z1: 0.6, yFrom: 0, yTo: H }];
    for (const z of [-fd / 5, fd / 5]) parts.push({ t: 'artwork', x: hw - 1.1, z, ry: -Math.PI / 2, floor: 1, frame: 'minimal', src: '' });
    parts.push({ t: 'trackLight', x: hw - 1.3, z: 0, ry: 0, floor: 1 });
  } else {
    theme.furnish(rng, parts, d); // 단층만 가구(계단 경로·통로 보호)
  }

  const space = normalizeSpace({
    version: 2,
    meta: { name: `${theme.name} ${px}-${pz}${floors > 1 ? ' ▲2F' : ''}`, author: '' },
    shell: { footprint: fpId, storyH: storyId, wallT: 0.2, entries: ['south'], floors, stairs, finish },
    spawn: { x: 0, z: hd - 1.0, ry: 0 },
    parts,
  });
  return { water: false, space, bx, bz };
}
