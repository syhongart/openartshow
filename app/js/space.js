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

export const SPACE_VERSION = 2;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// ── 파츠 레지스트리 — 디자이너 아트보드 22종(가칭, 카피 확정 전) ──────────────
// grid: 'structure'=1m·90°스냅 / 'object'=0.5m·15°자유회전 (이중 그리드)
// solid: player 충돌 대상 여부.  cat: 팔레트 카테고리 탭.
export const PART_CATEGORIES = ['structure', 'exhibit', 'ambience', 'finish', 'event'];

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
  labelStand:   { cat: 'exhibit', grid: 'object', solid: true,  size: [0.4, 1.1, 0.3], label: '라벨 스탠드' },
  // 분위기 6 (object grid)
  trackLight:   { cat: 'ambience', grid: 'object', solid: false, size: [0.13, 0.13, 0.13], label: '트랙 조명' },
  pendantLight: { cat: 'ambience', grid: 'object', solid: false, size: [0.4, 0.6, 0.4], label: '펜던트 조명' },
  planter:      { cat: 'ambience', grid: 'object', solid: true,  size: [0.6, 1.2, 0.6], label: '화분' },
  rug:          { cat: 'ambience', grid: 'object', solid: false, size: [2.0, 0.02, 3.0], label: '러그', variants: ['rect', 'round'] },
  bench:        { cat: 'ambience', grid: 'object', solid: true,  size: [1.2, 0.45, 0.5], label: '벤치', sizes: [1.2, 1.8] },
  drape:        { cat: 'ambience', grid: 'object', solid: false, size: [1.2, 2.6, 0.1], label: '커튼 드레이프' },
  // 이벤트 4 (object grid) — 배치1 "오프닝 축하 세트"(개업·축하 톤, 근조 아님)
  wreath:       { cat: 'event', grid: 'object', solid: true,  size: [0.72, 1.95, 0.5],  label: '축하 화환' },
  cake:         { cat: 'event', grid: 'object', solid: true,  size: [0.5, 0.85, 0.5],   label: '축하 케이크' },
  banner:       { cat: 'event', grid: 'object', solid: true,  size: [0.62, 1.85, 0.45], label: '배너 스탠드' },
  balloon:      { cat: 'event', grid: 'object', solid: false, size: [2.2, 2.3, 0.5],    label: '풍선 아치' }, // 아치 아래 통행 가능(구조 arch와 동형 규율)
  // 식물 5 (object grid) — 배치2 "식물·화분 다종화"(기존 planter와 조화)
  bigplant:     { cat: 'ambience', grid: 'object', solid: true,  size: [0.7, 1.6, 0.7],   label: '대형 관엽 식물' },
  palm:         { cat: 'ambience', grid: 'object', solid: true,  size: [0.5, 2.4, 0.5],   label: '키 큰 야자' },
  hangplant:    { cat: 'ambience', grid: 'object', solid: false, size: [0.42, 1.0, 0.42], label: '행잉 플랜터' }, // 천장/선반 부착 — 기본 y는 상단부, p.y로 재배치 가능
  succulent:    { cat: 'ambience', grid: 'object', solid: true,  size: [0.3, 0.36, 0.3],  label: '다육 화분' },
  vase:         { cat: 'ambience', grid: 'object', solid: true,  size: [0.26, 0.55, 0.26], label: '꽃병 부케' },
  // 구조·조명·장식 5 — 배치3 "구조·조명·장식 세트"(카테고리 혼합: 분위기3·전시1·구조1). 조명(floorlamp)은
  // emissive 갓만 사용 — 실제 THREE.Light 0(성능·라이트베이킹 보호, 감독 지시).
  floorlamp:    { cat: 'ambience', grid: 'object', solid: true,  size: [0.42, 1.72, 0.42], label: '플로어 스탠드 조명' },
  stanchion:    { cat: 'ambience', grid: 'object', solid: true,  size: [1.0, 1.0, 0.28],   label: '벨벳 로프 스탠션' }, // 기둥 2개 + catenary 로프(단일 파츠)
  mirror:       { cat: 'ambience', grid: 'object', solid: true,  size: [0.62, 1.72, 0.16], label: '거울' }, // 스탠딩 전신 거울(자립형)
  sign:         { cat: 'exhibit',  grid: 'object', solid: true,  size: [0.5, 1.05, 0.4],   label: '안내 스탠드' }, // A자형 이젤(labelStand보다 큰 안내판)
  railing:      { cat: 'structure', grid: 'structure', solid: true, size: [1.0, 1.05, 0.08], label: '난간' }, // 1m 스냅 세그먼트(구획/발코니 연속 배치)
  // 좌석·안내·구조 5 — 배치4 "좌석·안내·구조 세트". 창문(window)은 벽 부착이라 partY로 별도 높이
  // 배치(space-render.js), 유리는 opacity 반투명(transmission 금지)+옅은 emissive만(실제 THREE.Light 0).
  lounge:       { cat: 'ambience',  grid: 'object',    solid: true,  size: [1.7, 0.80, 0.78],  label: '라운지 소파' },
  reception:    { cat: 'exhibit',   grid: 'object',    solid: true,  size: [1.8, 1.05, 0.62],  label: '안내데스크' },
  window:       { cat: 'structure', grid: 'structure', solid: false, size: [1.4, 1.5, 0.22],   label: '창문' }, // 벽 부착(partY로 벽 높이 배치)
  glasspanel:   { cat: 'structure', grid: 'structure', solid: true,  size: [1.0, 2.2, 0.06],   label: '유리 파티션' }, // 1m 스냅 세그먼트, 통행 불가(시각만 반투명, 물리 차단)
  stool:        { cat: 'ambience',  grid: 'object',    solid: true,  size: [0.36, 0.46, 0.36], label: '스툴' },
};
export const PART_TYPE_IDS = new Set(Object.keys(PART_TYPES));

// ── 마감(스와치) — 오브젝트가 아니라 shell 표면에 적용 ───────────────────────
export const FINISH = {
  wall:    { ids: ['white', 'warmsand', 'charcoal'], def: 'white' }, // 4벽 공통 마감(중립 배경 규율 §3-6)
  // feature=피처월 1면 전용 마감. kintsugi(금계)는 여기에만 존재 → 스키마 차원에서 "1면 강제"(팀장 조건).
  feature: { ids: ['deepviolet', 'kintsugi', 'charcoal', 'warmsand'], def: 'deepviolet' },
  floor:   { ids: ['parquet', 'terrazzo', 'concrete', 'grass', 'water'], def: 'parquet' }, // grass·water=v2 신재질(Tier1: water는 정적 반사 폴백, 스크롤은 방문자뷰 플래그)
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
export const FOOTPRINT = { small: [6, 6], medium: [9, 7], large: [14, 10], hall: [20, 14], grand: [28, 18] };

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
    finish: { wall: 'white', floor: 'parquet', ceiling: 'whiteflat', trim: 'brass', featureWall: 'north', featureFinish: 'deepviolet' },
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
  // [y — v2 스택 배치] 절대 월드 Y(파츠 중심). 생략=0=렌더러 기본 y(바닥/벽걸이 규칙).
  // "위에 쌓기"는 아래 파츠 윗면 + 내 절반높이를 y로 기록. 0은 무의미(바닥에 묻힘)라 직렬화 생략.
  // 상한 20m: 최대 층고(grand 4.2m) 대비 넉넉한 스택 여유 + importJSON 천장관통 값 방어(검수 MINOR).
  const y = clamp(raw.y, 0, 20, 0);
  if (y > 0) p.y = y;
  if (raw.color !== undefined) p.color = hex(raw.color, undefined);
  if (spec.art) {                                            // 작품: 자동 액자
    p.frame = pick(raw.frame, FRAME_IDS, FRAME_STYLES.def);
    p.src = typeof raw.src === 'string' ? raw.src : '';      // 이미지 URL/데이터(업로드=백엔드 게이트)
    if (raw.featured) p.featured = true;
    // [ar — 종횡비 자동비율] 업로드 이미지 naturalWidth/naturalHeight 비(iw/ih). 옵션필드(p.featured/p.y 패턴).
    // 렌더러(space-render buildSpaceGroup)가 소비해 액자 W/H를 산출. 생략=레거시 고정 1.2×1.6 폴백.
    // 하한/상한 0.1~10으로 극단 방어(importJSON 우회 값). SPACE_VERSION 불변(완전 하위호환).
    const arv = clamp(raw.ar, 0.1, 10, undefined);
    if (arv !== undefined) p.ar = arv;
  }
  if (raw.t === 'screen') {
    p.ratio = pick(raw.ratio, new Set(spec.ratios), spec.ratios[0]);
    p.src = typeof raw.src === 'string' ? raw.src : '';      // 유튜브 영상ID(빌더가 ytembed.youtubeId로 검증한 11자만 기록, 재생 직전 재검증). 공개 노출은 §6-5 법무(개인정보처리방침) 선행.
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
        featureFinish: pick(shf.featureFinish, FIN('feature'), FINISH.feature.def), // 피처월 1면 전용(kintsugi 포함)
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
  if (d.version === 1) {
    // v1 → v2: 스택(y)·피처월 마감(featureFinish)·신재질(grass/water) 추가. 기존 필드 불변 —
    // 신규 필드는 normalizeSpace가 기본값 자동채움(y 생략=바닥, featureFinish=deepviolet).
    // [명시 규칙] deepviolet은 v1 주석부터 "피처월 1면 한정" 의도였으나 wall 집합에 섞여 있었다.
    // v2에서 wall→feature 집합으로 이관하므로, v1의 wall:'deepviolet' 문서는 조용히 white로
    // 대체(유실)하지 않고 wall=중립(white) + featureFinish=deepviolet로 의도를 명시 이관한다.
    const sh = d.shell && typeof d.shell === 'object' ? d.shell : null;
    const f = sh && sh.finish && typeof sh.finish === 'object' ? sh.finish : null;
    if (f && f.wall === 'deepviolet') {
      d = { ...d, shell: { ...sh, finish: { ...f, wall: 'white', featureFinish: f.featureFinish || 'deepviolet' } } };
    }
    d = { ...d, version: 2 };
  }
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
