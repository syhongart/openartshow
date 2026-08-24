// space.ts — 사용자 공간 문서 스키마 (SSOT · "파라미터가 곧 공간")
// -----------------------------------------------------------------------------
// config.js의 BUILDING 청사진(단일 고정 미술관)을 사용자 편집 가능한 "공간 문서"로 일반화.
// chibi.js의 normalizeChibi 패턴을 그대로 계승: 버전 필드 + 기본값 자동채움 + 마이그레이션 →
// 하위호환·저장·공유가 자동.
//
// [B-5-① leaf TS 전환] 순수 스키마 leaf 파일을 strict TypeScript로 전환. 런타임 로직·값은
// 무변경(순수 타입 첨가만). 공개 export 심볼 시그니처·주요 타입(Space/SpacePart/PartSpec)만
// 명시하고 내부 헬퍼는 strict 통과 수준으로만 주석. [리졸브] vite/rollup 빌드 resolver는
// 확장자 명시된 .js import를 .ts로 치환하지 않으므로(tsc Bundler 모드와 상이), 소비자 import는
// 확장자 없는 './space'(resolve.extensions가 .ts로 리졸브)로 통일. 배포기(vite.config) 무수정.
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

// ── 타입 정의 (공개 스키마 계약) ─────────────────────────────────────────────
export type PartCategory = 'structure' | 'exhibit' | 'ambience' | 'finish' | 'event';
export type PartGrid = 'structure' | 'object';

/** 파츠 레지스트리 요소 타입 — PART_TYPES 각 값의 형태. */
export interface PartSpec {
  cat: PartCategory;
  grid: PartGrid;
  solid: boolean;
  size: number[];
  label: string;
  floor?: boolean;
  art?: boolean;
  mats?: string[];
  variants?: string[];
  ratios?: string[];
  sizes?: number[];
}

/** 마감(스와치) 그룹 — FINISH 각 값의 형태. */
export interface FinishGroup {
  ids: string[];
  def: string;
}

/** 정규화된 파츠 인스턴스 — normalizePart 산출·space.parts 요소. */
export interface SpacePart {
  t: string;
  x: number;
  z: number;
  ry: number;
  floor?: number;
  y?: number;
  color?: string;
  frame?: string;
  src?: string;
  featured?: boolean;
  ar?: number;
  ratio?: string;
  variant?: string;
  mat?: string;
  size?: number;
}

/** 층간 경사 밴드 — shell.stairs 요소. */
export interface Stair {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  yFrom: number;
  yTo: number;
}

/** shell 마감 세트 — 정규화 후 형태. */
export interface SpaceFinish {
  wall: string;
  floor: string;
  ceiling: string;
  trim: string;
  featureWall: string;
  featureFinish: string;
}

/** 공간 셸(구조 파라미터) — 정규화 후 형태. */
export interface SpaceShell {
  footprint: string;
  storyH: string;
  wallT: number;
  /** 액자 크기 배율. 생략된 저장분은 1 로 읽힌다(하위호환 — ART_SCALE 주석). */
  artScale: number;
  entries: string[];
  floors: number;
  stairs: Stair[];
  finish: SpaceFinish;
}

/** 공간 문서(SSOT) — normalizeSpace/newSpace 산출 형태. */
export interface Space {
  version: number;
  meta: { name: string; author: string };
  shell: SpaceShell;
  spawn: { x: number; z: number; ry: number };
  parts: SpacePart[];
}

export const SPACE_VERSION = 2;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// ── 파츠 레지스트리 — 디자이너 아트보드 22종(가칭, 카피 확정 전) ──────────────
// grid: 'structure'=1m·90°스냅 / 'object'=0.5m·15°자유회전 (이중 그리드)
// solid: player 충돌 대상 여부.  cat: 팔레트 카테고리 탭.
export const PART_CATEGORIES: PartCategory[] = ['structure', 'exhibit', 'ambience', 'finish', 'event'];

export const PART_TYPES: Record<string, PartSpec> = {
  // 구조 6 (structure grid, 대부분 solid)
  wallPanel:    { cat: 'structure', grid: 'structure', solid: true,  size: [1.0, 0.2, 3.6], label: '벽 패널', mats: ['plaster', 'wood', 'metal'] },
  floorTile:    { cat: 'structure', grid: 'structure', solid: true,  size: [1.0, 0.1, 1.0], label: '바닥 타일', floor: true },
  ceilingPanel: { cat: 'structure', grid: 'structure', solid: false, size: [1.0, 0.1, 1.0], label: '천장 패널', variants: ['flat', 'coffer'] },
  pillar:       { cat: 'structure', grid: 'structure', solid: true,  size: [0.4, 3.6, 0.4], label: '원형 기둥', mats: ['concrete', 'marble', 'stone', 'wood'] },
  stair:        { cat: 'structure', grid: 'structure', solid: true,  size: [2.0, 4.2, 3.0], label: '직선 계단' },
  arch:         { cat: 'structure', grid: 'structure', solid: false, size: [2.0, 2.6, 0.2], label: '아치 개구부' },
  // 전시 6 (object grid)
  artwork:      { cat: 'exhibit', grid: 'object', solid: false, size: [1.2, 1.6, 0.1], label: '작품 액자', art: true },
  pedestal:     { cat: 'exhibit', grid: 'object', solid: true,  size: [0.5, 0.9, 0.5], label: '조각 좌대' },
  screen:       { cat: 'exhibit', grid: 'object', solid: false, size: [1.6, 0.9, 0.1], label: '영상 스크린', ratios: ['16:9', '9:16'] },
  partition:    { cat: 'exhibit', grid: 'object', solid: true,  size: [1.2, 2.4, 0.1], label: '파티션 벽', mats: ['plaster', 'wood', 'metal'] },
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
export const FINISH: Record<'wall' | 'feature' | 'floor' | 'ceiling' | 'trim', FinishGroup> = {
  wall:    { ids: ['white', 'warmsand', 'charcoal'], def: 'white' }, // 4벽 공통 마감(중립 배경 규율 §3-6)
  // feature=피처월 1면 전용 마감. kintsugi(금계)는 여기에만 존재 → 스키마 차원에서 "1면 강제"(팀장 조건).
  feature: { ids: ['deepviolet', 'kintsugi', 'charcoal', 'warmsand'], def: 'deepviolet' },
  floor:   { ids: ['parquet', 'terrazzo', 'concrete', 'grass', 'water'], def: 'parquet' }, // grass·water=v2 신재질(Tier1: water는 정적 반사 폴백, 스크롤은 방문자뷰 플래그)
  ceiling: { ids: ['whiteflat', 'darkmatte'], def: 'whiteflat' },
  trim:    { ids: ['brass', 'charcoal'], def: 'brass' },
};

// ── 인스턴스 틴트 팔레트(#56/#43) — rug·drape 색 UI 퀵픽/기본값 목록(SSOT) ───────
// index0 = 기본색(무색 저장분 폴백 = 기존 단색 재질과 동색, 하위호환 보증).
// 이 목록은 UI 퀵픽 제안·기본값용일 뿐, p.color 자유 hex 입력은 그대로 허용(normalizePart color 검증은 HEX_RE, 팔레트로 제한하지 않음).
export const TINT_PALETTES: Record<string, string[]> = {
  rug:   ['#c9bfae', '#e4ddd0', '#4a4844', '#a9705a', '#8a9481'],           // sand(기본)/ivory/charcoal/terracotta/sage
  drape: ['#2c2c30', '#4a4038', '#242c38', '#4a2b30', '#e4ddd0', '#8a9481'], // charcoal(기본)/taupe/navy/burgundy + ivory·sage(밝은톤 추가, rug와 톤 정합·갤러리 중립)
};

// ── 자동 액자 3스타일 + 비율 규칙 (디자이너 §자동 액자) ──────────────────────
export const FRAME_STYLES: { ids: string[]; def: string } = { ids: ['minimal', 'classic', 'frameless'], def: 'minimal' };
export const FRAME_RULES = {
  portrait:  { clampH: 2.6 },   // 세로장: 높이 우선 clamp
  landscape: { clampW: 3.2 },   // 가로장: 폭 우선 clamp
  minSize: 0.6, minGap: 0.4,    // 최소 크기·작품 간 최소 간격
  thickness: 0.1,               // 3스타일 공통 두께(벽 돌출·조명 오프셋 일정)
};

// ── 작품 종횡비 → 액자 실치수 (FRAME_RULES 소비) ────────────────────────────
// ⚠ 이 함수는 원래 space-parts.ts 에 있었다. 2026-08-22 에 여기(순수 leaf)로 내렸다 —
// space-parts 는 `import * as THREE` 를 하므로, 자동생성기(space-generate.ts)가 거기서
// 이 함수를 가져오면 **순수 스키마 계산에 three 런타임이 딸려온다**. 재구현은 값 미러링
// 금지에 걸리고(같은 공식이 두 곳 → 한쪽만 고쳐도 아무도 모른다), 그래서 이동이 답이다.
// 이 함수가 소비하는 것은 PART_TYPES.artwork.size 와 FRAME_RULES 뿐이라 여기가 제자리다.
// space-parts.ts 는 재수출만 하므로 기존 소비자(space-assembler)는 무수정이다.
/**
 * 액자 크기 배율의 범위. **방 단위 속성**(`shell.artScale`)이고 기본은 1 이다.
 *
 * 감독 지적 2026-08-24: *"작품을 크게 걸고."* 천장을 4.2m 로 올린 뒤 나온 말이다 —
 * 액자 긴 변이 `BASE = 1.6` 으로 고정이라 높아진 층고 대비 작아 보였다.
 *
 * ⚠ **왜 BASE 를 그냥 올리지 않았나.** `builder.html` 은 라이브이고 거기서 저장한
 * 공간은 **배치를 다시 계산하지 않는다** — 액자만 커지면 벽에서 겹친다. 방 단위
 * 속성으로 두면 기존 저장분에는 이 필드가 없어 1 로 읽히고 **회귀가 0** 이다.
 * 자동생성(`space-generate`)은 매번 배치를 다시 재므로 큰 값을 안전하게 쓴다.
 *
 * 상한 2.0 은 임의가 아니다 — `BASE * 2.0 = 3.2` 가 `FRAME_RULES.landscape.clampW`
 * 와 같다. 그보다 키우면 clamp 가 전부 먹어 배율이 화면에 안 나타난다(노브만 헛돈다).
 */
export const ART_SCALE = { min: 0.6, max: 2.0, def: 1 };

// p.ar → 액자 W/H. 디자이너 실측 공식. ar 없으면 레거시 고정 1.2×1.6 폴백.
// scale 은 `shell.artScale`(방 단위) — 소비자가 넘긴다. 여기서 기본값을 다시 적지 않는다.
export function artworkSize(ar?: unknown, scale?: unknown): { W: number; H: number } {
  const k = (typeof scale === 'number' && isFinite(scale) && scale > 0)
    ? Math.min(ART_SCALE.max, Math.max(ART_SCALE.min, scale)) : ART_SCALE.def;
  const [dw, dh] = PART_TYPES.artwork.size; // 폴백(빈 액자·구버전 저장분)
  if (!(typeof ar === 'number' && isFinite(ar) && ar > 0)) return { W: dw * k, H: dh * k };
  const BASE = 1.6 * k, minSize = FRAME_RULES.minSize, clampW = FRAME_RULES.landscape.clampW, clampH = FRAME_RULES.portrait.clampH;
  const cl = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  const r = ar;
  let W: number, H: number;
  if (r >= 1) { W = BASE; H = BASE / r; } else { H = BASE; W = BASE * r; }
  const W0 = W, H0 = H;
  W = cl(W, minSize, clampW); H = cl(H, minSize, clampH);
  if (W !== W0) H = cl(W / r, minSize, clampH); // 폭이 clamp로 잘리면 높이를 비율 재산출
  if (H !== H0) W = cl(H * r, minSize, clampW); // 높이가 clamp로 잘리면 폭을 비율 재산출
  return { W, H };
}

// ── 층고·풋프린트 프리셋 ──────────────────────────────────────────────────
export const STORY_H: Record<string, number> = { studio: 2.8, gallery: 3.6, grand: 4.2 };
export const FOOTPRINT: Record<string, number[]> = { small: [6, 6], medium: [9, 7], large: [14, 10], hall: [20, 14], grand: [28, 18] };

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
const clamp = <T>(v: any, lo: number, hi: number, d: T): number | T => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const pick = <T>(v: any, ids: Set<string>, d: T): string | T => (typeof v === 'string' && ids.has(v) ? v : d);
const hex = <T>(v: any, d: T): string | T => (typeof v === 'string' && HEX_RE.test(v) ? v : d);
const num = (v: any, d: number): number => (typeof v === 'number' && isFinite(v) ? v : d);

const FIN = (k: keyof typeof FINISH): Set<string> => new Set(FINISH[k].ids);
const FRAME_IDS = new Set(FRAME_STYLES.ids);

// [오픈월드 가산 · SPACE_VERSION 불변] shell.entries — 파셀 경계 개구부(문) 방향 목록.
// 생략/빈배열 = 사방 폐쇄(기존 v2 문서 100% 동일 동작). world.js(파셀 스트리밍)가
// 인접 파셀 존재 시 이 방향 벽에 문틀을 뚫어 통과로를 만든다. 단일 공간(visit.js)은
// 소비하지 않으므로 영향 없음(p.y/p.featured/p.ar과 동일한 옵션 필드 패턴).
const ENTRY_DIRS = new Set(['north', 'south', 'east', 'west']);
function normEntries(v: any): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const d of v) { if (ENTRY_DIRS.has(d) && !out.includes(d)) out.push(d); }
  return out;
}

// [오픈월드 다층 가산 · SPACE_VERSION 불변] shell.floors(층수 1~4) · shell.stairs(층간 경사 밴드).
// 생략 = floors:1 / stairs:[] = 기존 단층 100% 동일(visit·builder 무영향). stairs는 config.js
// BUILDING.stairs와 동형({x0,x1,z0,z1,yFrom,yTo}): x0..x1 밴드에서 z0(yFrom)→z1(yTo) 선형 상승.
// world.js가 지면 후보로 소비(등반), space-render가 램프 지오/슬래브 개구부 생성.
const clampInt = (v: any, lo: number, hi: number, d: number): number => (Number.isInteger(v) ? Math.min(hi, Math.max(lo, v)) : d);
function normStairs(v: any): Stair[] {
  if (!Array.isArray(v)) return [];
  const out: Stair[] = [];
  for (const s of v) {
    if (!s || typeof s !== 'object') continue;
    const x0 = num(s.x0, 0), x1 = num(s.x1, 0), z0 = num(s.z0, 0), z1 = num(s.z1, 0);
    const yFrom = clamp(s.yFrom, 0, 20, 0), yTo = clamp(s.yTo, 0, 20, 0);
    if (x0 === x1 || z0 === z1 || yFrom === yTo) continue; // 퇴화 밴드 폐기
    out.push({ x0, x1, z0, z1, yFrom, yTo });
  }
  return out;
}

function normalizePart(raw: any): SpacePart | null {
  if (!raw || typeof raw !== 'object' || !PART_TYPE_IDS.has(raw.t)) return null; // 미지 타입 폐기
  const spec = PART_TYPES[raw.t];
  const p: SpacePart = {
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
    p.ratio = pick(raw.ratio, new Set(spec.ratios), spec.ratios![0]);
    p.src = typeof raw.src === 'string' ? raw.src : '';      // 유튜브 영상ID(빌더가 ytembed.youtubeId로 검증한 11자만 기록, 재생 직전 재검증). 공개 노출은 §6-5 법무(개인정보처리방침) 선행.
  }
  if (raw.variant !== undefined && spec.variants) p.variant = pick(raw.variant, new Set(spec.variants), spec.variants[0]);
  if (raw.mat !== undefined && spec.mats) p.mat = pick(raw.mat, new Set(spec.mats), spec.mats[0]); // 재질 배리언트(index0=현행 고정 재질 → 구버전 저장분 하위호환)
  if (raw.size !== undefined && spec.sizes) p.size = spec.sizes.includes(raw.size) ? raw.size : spec.sizes[0];
  return p;
}

export function normalizeSpace(raw: any): Space {
  const src = raw && typeof raw === 'object' ? migrateSpace(raw) : {};
  const sh = src.shell && typeof src.shell === 'object' ? src.shell : {};
  const shf = sh.finish && typeof sh.finish === 'object' ? sh.finish : {};
  const sp = src.spawn && typeof src.spawn === 'object' ? src.spawn : {};
  const parts = Array.isArray(src.parts) ? src.parts.map(normalizePart).filter(Boolean) as SpacePart[] : [];
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
      artScale: clamp(sh.artScale, ART_SCALE.min, ART_SCALE.max, ART_SCALE.def), // 생략=1(하위호환)
      entries: normEntries(sh.entries), // 오픈월드 파셀 개구부(생략=빈배열=폐쇄, 하위호환)
      floors: clampInt(sh.floors, 1, 4, 1), // 오픈월드 다층(생략=1=단층, 하위호환)
      stairs: normStairs(sh.stairs),        // 층간 경사 밴드(생략=빈배열)
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
export function migrateSpace(doc: any): any {
  let d = doc;
  const v = typeof d.version === 'number' ? d.version : 0;
  if (v > SPACE_VERSION) {
    const e: Error & { code?: string } = new Error('space version ' + v + ' > supported ' + SPACE_VERSION);
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
export function encodeSpace(p: any): string { return SPACE_PREFIX + JSON.stringify(normalizeSpace(p)); }
export function decodeSpace(str: unknown): Space | null {
  if (typeof str !== 'string' || !str.startsWith(SPACE_PREFIX)) return null;
  try { return normalizeSpace(JSON.parse(str.slice(SPACE_PREFIX.length))); } catch { return null; } // 버전초과/파손 → null
}
export function newSpace(): Space { return normalizeSpace(DEFAULT_SPACE); }
