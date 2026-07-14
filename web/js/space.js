// space.js — 사용자 공간 문서 스키마 (SSOT · "파라미터가 곧 공간")
// -----------------------------------------------------------------------------
// config.js의 BUILDING 청사진(단일 고정 미술관)을 사용자 편집 가능한 "공간 문서"로 일반화.
// chibi.js의 normalizeChibi 패턴을 그대로 계승: 버전 필드 + 기본값 자동채움 + 마이그레이션 →
// 하위호환·저장·공유가 자동.
//
// [저장/공유 계약 — 팀장 재판정 확정] 공간은 수 KB(스타터 실측 930B)라 아바타처럼
// URL(512자)에 담지 않는다. MVP 공유 경로는 **localStorage/JSON 파일만**. URL 공유가
// 나중에 필요하면 별도 분기 재판정 대상(여기서 URL 인코딩 함수 추가 금지).
//
// 소비자 계약(현 BUILDING 4소비자와 동형 유지):
//   scene.js(건축)   : space.parts + space.shell → 지오메트리 조립(구조=머지, 오브젝트=InstancedMesh)
//   player.js(충돌)  : PART_TYPES[t].solid === true 파츠 → 충돌/바닥 판정
//   artworks.js(작품): PART_TYPES[t].art === true 파츠 → 이미지+자동액자, 스포트라이트
//   main.js(스폰)    : space.spawn → 카메라 초기 위치·시선
// 데이터 모델만 정의(렌더/UX는 별건). 스크린 sourceUrl은 예약만(유튜브=§6-5 법무·CSP 게이트).
// -----------------------------------------------------------------------------

export const SPACE_VERSION = 1;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// ── 파츠 레지스트리 — 디자이너 아트보드 22종(가칭, 카피 확정 전) ──────────────
// grid: 'structure'=1m·90°스냅 / 'object'=0.5m·15°자유회전 (이중 그리드)
// solid: player 충돌 대상 여부.  cat: 팔레트 카테고리 탭.
export const PART_CATEGORIES = ['structure', 'exhibit', 'ambience', 'finish'];

export const PART_TYPES = {
  // 구조 6 (structure grid, 대부분 solid)
  wallPanel:    { cat: 'structure', grid: 'structure', solid: true,  size: [1.0, 0.2, 3.6], label: '벽 패널' },
  floorTile:    { cat: 'structure', grid: 'structure', solid: true,  size: [1.0, 0.1, 1.0], label: '바닥 타일', floor: true },
  ceilingPanel: { cat: 'structure', grid: 'structure', solid: false, size: [1.0, 0.1, 1.0], label: '천장 패널', variants: ['flat', 'coffer'] },
  pillar:       { cat: 'structure', grid: 'structure', solid: true,  size: [0.4, 3.6, 0.4], label: '원형 기둥' },
  stair:        { cat: 'structure', grid: 'structure', solid: true,  size: [2.0, 4.2, 3.0], label: '직선 계단' },
  arch:         { cat: 'structure', grid: 'structure', solid: false, size: [2.0, 2.6, 0.2], label: '아치 개구부' },
  // 전시 6 (object grid)
  artwork:      { cat: 'exhibit', grid: 'object', solid: false, size: [1.2, 1.6, 0.1], label: '작품 액자', art: true },
  pedestal:     { cat: 'exhibit', grid: 'object', solid: true,  size: [0.5, 0.9, 0.5], label: '조각 좌대' },
  screen:       { cat: 'exhibit', grid: 'object', solid: false, size: [1.6, 0.9, 0.1], label: '영상 스크린', ratios: ['16:9', '9:16'] },
  partition:    { cat: 'exhibit', grid: 'object', solid: true,  size: [1.2, 2.4, 0.1], label: '파티션 벽' },
  vitrine:      { cat: 'exhibit', grid: 'object', solid: true,  size: [0.8, 1.0, 0.5], label: '진열장' },
  labelStand:   { cat: 'exhibit', grid: 'object', solid: false, size: [0.4, 1.1, 0.3], label: '라벨 스탠드' },
  // 분위기 6 (object grid)
  trackLight:   { cat: 'ambience', grid: 'object', solid: false, size: [0.13, 0.13, 0.13], label: '트랙 조명' },
  pendantLight: { cat: 'ambience', grid: 'object', solid: false, size: [0.4, 0.6, 0.4], label: '펜던트 조명' },
  planter:      { cat: 'ambience', grid: 'object', solid: false, size: [0.6, 1.2, 0.6], label: '화분' },
  rug:          { cat: 'ambience', grid: 'object', solid: false, size: [2.0, 0.02, 3.0], label: '러그', variants: ['rect', 'round'] },
  bench:        { cat: 'ambience', grid: 'object', solid: true,  size: [1.2, 0.45, 0.5], label: '벤치', sizes: [1.2, 1.8] },
  drape:        { cat: 'ambience', grid: 'object', solid: false, size: [1.2, 2.6, 0.1], label: '커튼 드레이프' },
};
export const PART_TYPE_IDS = new Set(Object.keys(PART_TYPES));

// ── 마감(스와치) — 오브젝트가 아니라 shell 표면에 적용 ───────────────────────
export const FINISH = {
  wall:    { ids: ['white', 'warmsand', 'charcoal', 'deepviolet'], def: 'white' }, // deepviolet=피처월 1면 한정(디자이너 재확정 대상)
  floor:   { ids: ['parquet', 'terrazzo', 'concrete'], def: 'parquet' },
  ceiling: { ids: ['whiteflat', 'darkmatte'], def: 'whiteflat' },
  trim:    { ids: ['brass', 'charcoal'], def: 'brass' },
};

// ── 자동 액자 3스타일 + 비율 규칙 (디자이너 §자동 액자) ──────────────────────
export const FRAME_STYLES = { ids: ['minimal', 'classic', 'frameless'], def: 'minimal' };
export const FRAME_RULES = {
  portrait:  { clampH: 2.6 },   // 세로장: 높이 우선 clamp
  landscape: { clampW: 3.2 },   // 가로장: 폭 우선 clamp
  minSize: 0.6, minGap: 0.4,    // 최소 크기·작품 간 최소 간격
  thickness: 0.1,               // 3스타일 공통 두께(벽 돌출·조명 오프셋 일정)
};

// ── 층고·풋프린트 프리셋 ──────────────────────────────────────────────────
export const STORY_H = { studio: 2.8, gallery: 3.6, grand: 4.2 };
export const FOOTPRINT = { small: [6, 6], medium: [9, 7], large: [14, 10] };

// ── 스타터 방("완성된 방") — 처음 열면 마주하는 완성 공간 ─────────────────────
// 9×7m 미디엄, 3.6m 층고. 북벽 3작품(피처월 1면) + 좌대·스크린·벤치·러그·화분.
// 좌표: 벽 안쪽 기준, 바닥 y=0, 북벽 z<0. (BUILDING 좌표계 계승)
export const DEFAULT_SPACE = Object.freeze({
  version: SPACE_VERSION,
  meta: { name: '나의 전시실', author: '' },
  shell: {
    footprint: 'medium',      // 9×7m
    storyH: 'gallery',        // 3.6m
    wallT: 0.2,
    finish: { wall: 'white', floor: 'parquet', ceiling: 'whiteflat', trim: 'brass', featureWall: 'north' },
  },
  spawn: { x: 0, z: 3.0, ry: 0 }, // 입구 아치 앞, 북벽(작품) 정면
  parts: [
    // 북벽 작품 3 (피처월) — 자동 액자 minimal
    { t: 'artwork', x: -3.0, z: -3.4, ry: 0, frame: 'minimal', src: '' },
    { t: 'artwork', x:  0.0, z: -3.4, ry: 0, frame: 'minimal', src: '', featured: true },
    { t: 'artwork', x:  3.0, z: -3.4, ry: 0, frame: 'minimal', src: '' },
    // 서벽 스크린(영상), 동벽 진열장
    { t: 'screen',  x: -4.4, z: -0.5, ry: Math.PI / 2, ratio: '16:9', src: '' },
    { t: 'vitrine', x:  4.2, z: -1.0, ry: -Math.PI / 2 },
    // 중앙 좌대 + 관람 벤치 + 러그 + 화분
    { t: 'pedestal', x: -1.4, z: -0.6, ry: 0 },
    { t: 'bench',    x:  0.0, z:  0.8, ry: 0, size: 1.8 },
    { t: 'rug',      x:  0.0, z:  0.0, ry: 0, variant: 'rect', color: '#c9bfae' },
    { t: 'planter',  x:  3.6, z:  2.2, ry: 0 },
    // 조명: 북벽 작품 위 트랙 3
    { t: 'trackLight', x: -3.0, z: -3.0, ry: 0 },
    { t: 'trackLight', x:  0.0, z: -3.0, ry: 0 },
    { t: 'trackLight', x:  3.0, z: -3.0, ry: 0 },
  ],
});

// ── 정규화 — 없는 키 기본값 채움, 파츠 검증·클램프 (normalizeChibi 계승) ─────
const clamp = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const pick = (v, ids, d) => (typeof v === 'string' && ids.has(v) ? v : d);
const hex = (v, d) => (typeof v === 'string' && HEX_RE.test(v) ? v : d);
const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

const FIN = (k) => new Set(FINISH[k].ids);
const FRAME_IDS = new Set(FRAME_STYLES.ids);

function normalizePart(raw) {
  if (!raw || typeof raw !== 'object' || !PART_TYPE_IDS.has(raw.t)) return null; // 미지 타입 폐기
  const spec = PART_TYPES[raw.t];
  const p = {
    t: raw.t,
    x: num(raw.x, 0),
    z: num(raw.z, 0),
    ry: num(raw.ry, 0),
  };
  // [floor 예약 필드 의미론 — 팀장 재판정 확정] 0-기반 층 인덱스. 생략=0(1층).
  // v1 소비자는 무시(단일 룸). v2 다층에서 이 의미로 재해석(재정의 아님).
  if (Number.isInteger(raw.floor)) p.floor = raw.floor;
  if (raw.color !== undefined) p.color = hex(raw.color, undefined);
  if (spec.art) {                                            // 작품: 자동 액자
    p.frame = pick(raw.frame, FRAME_IDS, FRAME_STYLES.def);
    p.src = typeof raw.src === 'string' ? raw.src : '';      // 이미지 URL/데이터(업로드=백엔드 게이트)
    if (raw.featured) p.featured = true;
  }
  if (raw.t === 'screen') {
    p.ratio = pick(raw.ratio, new Set(spec.ratios), spec.ratios[0]);
    p.src = typeof raw.src === 'string' ? raw.src : '';      // [예약] 유튜브/영상 = §6-5 법무·CSP 게이트 전 미구현
  }
  if (raw.variant !== undefined && spec.variants) p.variant = pick(raw.variant, new Set(spec.variants), spec.variants[0]);
  if (raw.size !== undefined && spec.sizes) p.size = spec.sizes.includes(raw.size) ? raw.size : spec.sizes[0];
  return p;
}

export function normalizeSpace(raw) {
  const src = raw && typeof raw === 'object' ? migrateSpace(raw) : {};
  const sh = src.shell && typeof src.shell === 'object' ? src.shell : {};
  const shf = sh.finish && typeof sh.finish === 'object' ? sh.finish : {};
  const sp = src.spawn && typeof src.spawn === 'object' ? src.spawn : {};
  const parts = Array.isArray(src.parts) ? src.parts.map(normalizePart).filter(Boolean) : [];
  return {
    version: SPACE_VERSION,
    meta: {
      name: (typeof src.meta?.name === 'string' && src.meta.name.trim()) ? src.meta.name.slice(0, 40) : DEFAULT_SPACE.meta.name,
      author: typeof src.meta?.author === 'string' ? src.meta.author.slice(0, 40) : '',
    },
    shell: {
      footprint: pick(sh.footprint, new Set(Object.keys(FOOTPRINT)), DEFAULT_SPACE.shell.footprint),
      storyH: pick(sh.storyH, new Set(Object.keys(STORY_H)), DEFAULT_SPACE.shell.storyH),
      wallT: clamp(sh.wallT, 0.1, 0.4, DEFAULT_SPACE.shell.wallT),
      finish: {
        wall: pick(shf.wall, FIN('wall'), FINISH.wall.def),
        floor: pick(shf.floor, FIN('floor'), FINISH.floor.def),
        ceiling: pick(shf.ceiling, FIN('ceiling'), FINISH.ceiling.def),
        trim: pick(shf.trim, FIN('trim'), FINISH.trim.def),
        featureWall: pick(shf.featureWall, new Set(['none', 'north', 'south', 'east', 'west']), 'north'),
      },
    },
    spawn: { x: num(sp.x, DEFAULT_SPACE.spawn.x), z: num(sp.z, DEFAULT_SPACE.spawn.z), ry: num(sp.ry, DEFAULT_SPACE.spawn.ry) },
    parts,
  };
}

// ── 마이그레이션 — 버전 업그레이드 경로 (되돌리기 힘든 스키마의 안전장치) ──────
// [팀장 재판정 확정] 상향(v0→현재)만 보장. 상위 버전(v>현재) 문서는 조용히 파싱하지
// 않고 거부한다 — 하향 마이그레이션은 불가능하고, 조용히 열면 필드 유실·오해석 사고가 난다.
// 호출부(decodeSpace)가 catch해 "이 버전으로는 못 여는 공간" 안내로 처리한다.
export function migrateSpace(doc) {
  let d = doc;
  const v = typeof d.version === 'number' ? d.version : 0;
  if (v > SPACE_VERSION) {
    const e = new Error('space version ' + v + ' > supported ' + SPACE_VERSION);
    e.code = 'SPACE_VERSION_AHEAD';
    throw e;
  }
  if (v === 0) d = { ...d, version: 1 };   // v0(무버전) → v1: 필드명 불변, 버전만 부여
  // 이후 버전: if (d.version === 1) { ...→2; d.version = 2 } 형태로 누적 상향 추가
  return d;
}

// ── 인코딩 — localStorage/파일 (URL 아님: 저장/공유 계약 주석 참조) ────────────
export const SPACE_PREFIX = 'space:';
export function encodeSpace(p) { return SPACE_PREFIX + JSON.stringify(normalizeSpace(p)); }
export function decodeSpace(str) {
  if (typeof str !== 'string' || !str.startsWith(SPACE_PREFIX)) return null;
  try { return normalizeSpace(JSON.parse(str.slice(SPACE_PREFIX.length))); } catch { return null; } // 버전초과/파손 → null
}
export function newSpace() { return normalizeSpace(DEFAULT_SPACE); }
