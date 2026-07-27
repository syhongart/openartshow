const SPACE_VERSION = 2;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const PART_CATEGORIES = ["structure", "exhibit", "ambience", "finish", "event"];
const PART_TYPES = {
  // 구조 6 (structure grid, 대부분 solid)
  wallPanel: { cat: "structure", grid: "structure", solid: true, size: [1, 0.2, 3.6], label: "\uBCBD \uD328\uB110", mats: ["plaster", "wood", "metal"] },
  floorTile: { cat: "structure", grid: "structure", solid: true, size: [1, 0.1, 1], label: "\uBC14\uB2E5 \uD0C0\uC77C", floor: true },
  ceilingPanel: { cat: "structure", grid: "structure", solid: false, size: [1, 0.1, 1], label: "\uCC9C\uC7A5 \uD328\uB110", variants: ["flat", "coffer"] },
  pillar: { cat: "structure", grid: "structure", solid: true, size: [0.4, 3.6, 0.4], label: "\uC6D0\uD615 \uAE30\uB465", mats: ["concrete", "marble", "stone", "wood"] },
  stair: { cat: "structure", grid: "structure", solid: true, size: [2, 4.2, 3], label: "\uC9C1\uC120 \uACC4\uB2E8" },
  arch: { cat: "structure", grid: "structure", solid: false, size: [2, 2.6, 0.2], label: "\uC544\uCE58 \uAC1C\uAD6C\uBD80" },
  // 전시 6 (object grid)
  artwork: { cat: "exhibit", grid: "object", solid: false, size: [1.2, 1.6, 0.1], label: "\uC791\uD488 \uC561\uC790", art: true },
  pedestal: { cat: "exhibit", grid: "object", solid: true, size: [0.5, 0.9, 0.5], label: "\uC870\uAC01 \uC88C\uB300" },
  screen: { cat: "exhibit", grid: "object", solid: false, size: [1.6, 0.9, 0.1], label: "\uC601\uC0C1 \uC2A4\uD06C\uB9B0", ratios: ["16:9", "9:16"] },
  partition: { cat: "exhibit", grid: "object", solid: true, size: [1.2, 2.4, 0.1], label: "\uD30C\uD2F0\uC158 \uBCBD", mats: ["plaster", "wood", "metal"] },
  vitrine: { cat: "exhibit", grid: "object", solid: true, size: [0.8, 1, 0.5], label: "\uC9C4\uC5F4\uC7A5" },
  labelStand: { cat: "exhibit", grid: "object", solid: true, size: [0.4, 1.1, 0.3], label: "\uB77C\uBCA8 \uC2A4\uD0E0\uB4DC" },
  // 분위기 6 (object grid)
  trackLight: { cat: "ambience", grid: "object", solid: false, size: [0.13, 0.13, 0.13], label: "\uD2B8\uB799 \uC870\uBA85" },
  pendantLight: { cat: "ambience", grid: "object", solid: false, size: [0.4, 0.6, 0.4], label: "\uD39C\uB358\uD2B8 \uC870\uBA85" },
  planter: { cat: "ambience", grid: "object", solid: true, size: [0.6, 1.2, 0.6], label: "\uD654\uBD84" },
  rug: { cat: "ambience", grid: "object", solid: false, size: [2, 0.02, 3], label: "\uB7EC\uADF8", variants: ["rect", "round"] },
  bench: { cat: "ambience", grid: "object", solid: true, size: [1.2, 0.45, 0.5], label: "\uBCA4\uCE58", sizes: [1.2, 1.8] },
  drape: { cat: "ambience", grid: "object", solid: false, size: [1.2, 2.6, 0.1], label: "\uCEE4\uD2BC \uB4DC\uB808\uC774\uD504" },
  // 이벤트 4 (object grid) — 배치1 "오프닝 축하 세트"(개업·축하 톤, 근조 아님)
  wreath: { cat: "event", grid: "object", solid: true, size: [0.72, 1.95, 0.5], label: "\uCD95\uD558 \uD654\uD658" },
  cake: { cat: "event", grid: "object", solid: true, size: [0.5, 0.85, 0.5], label: "\uCD95\uD558 \uCF00\uC774\uD06C" },
  banner: { cat: "event", grid: "object", solid: true, size: [0.62, 1.85, 0.45], label: "\uBC30\uB108 \uC2A4\uD0E0\uB4DC" },
  balloon: { cat: "event", grid: "object", solid: false, size: [2.2, 2.3, 0.5], label: "\uD48D\uC120 \uC544\uCE58" },
  // 아치 아래 통행 가능(구조 arch와 동형 규율)
  // 식물 5 (object grid) — 배치2 "식물·화분 다종화"(기존 planter와 조화)
  bigplant: { cat: "ambience", grid: "object", solid: true, size: [0.7, 1.6, 0.7], label: "\uB300\uD615 \uAD00\uC5FD \uC2DD\uBB3C" },
  palm: { cat: "ambience", grid: "object", solid: true, size: [0.5, 2.4, 0.5], label: "\uD0A4 \uD070 \uC57C\uC790" },
  hangplant: { cat: "ambience", grid: "object", solid: false, size: [0.42, 1, 0.42], label: "\uD589\uC789 \uD50C\uB79C\uD130" },
  // 천장/선반 부착 — 기본 y는 상단부, p.y로 재배치 가능
  succulent: { cat: "ambience", grid: "object", solid: true, size: [0.3, 0.36, 0.3], label: "\uB2E4\uC721 \uD654\uBD84" },
  vase: { cat: "ambience", grid: "object", solid: true, size: [0.26, 0.55, 0.26], label: "\uAF43\uBCD1 \uBD80\uCF00" },
  // 구조·조명·장식 5 — 배치3 "구조·조명·장식 세트"(카테고리 혼합: 분위기3·전시1·구조1). 조명(floorlamp)은
  // emissive 갓만 사용 — 실제 THREE.Light 0(성능·라이트베이킹 보호, 감독 지시).
  floorlamp: { cat: "ambience", grid: "object", solid: true, size: [0.42, 1.72, 0.42], label: "\uD50C\uB85C\uC5B4 \uC2A4\uD0E0\uB4DC \uC870\uBA85" },
  stanchion: { cat: "ambience", grid: "object", solid: true, size: [1, 1, 0.28], label: "\uBCA8\uBCB3 \uB85C\uD504 \uC2A4\uD0E0\uC158" },
  // 기둥 2개 + catenary 로프(단일 파츠)
  mirror: { cat: "ambience", grid: "object", solid: true, size: [0.62, 1.72, 0.16], label: "\uAC70\uC6B8" },
  // 스탠딩 전신 거울(자립형)
  sign: { cat: "exhibit", grid: "object", solid: true, size: [0.5, 1.05, 0.4], label: "\uC548\uB0B4 \uC2A4\uD0E0\uB4DC" },
  // A자형 이젤(labelStand보다 큰 안내판)
  railing: { cat: "structure", grid: "structure", solid: true, size: [1, 1.05, 0.08], label: "\uB09C\uAC04" },
  // 1m 스냅 세그먼트(구획/발코니 연속 배치)
  // 좌석·안내·구조 5 — 배치4 "좌석·안내·구조 세트". 창문(window)은 벽 부착이라 partY로 별도 높이
  // 배치(space-render.js), 유리는 opacity 반투명(transmission 금지)+옅은 emissive만(실제 THREE.Light 0).
  lounge: { cat: "ambience", grid: "object", solid: true, size: [1.7, 0.8, 0.78], label: "\uB77C\uC6B4\uC9C0 \uC18C\uD30C" },
  reception: { cat: "exhibit", grid: "object", solid: true, size: [1.8, 1.05, 0.62], label: "\uC548\uB0B4\uB370\uC2A4\uD06C" },
  window: { cat: "structure", grid: "structure", solid: false, size: [1.4, 1.5, 0.22], label: "\uCC3D\uBB38" },
  // 벽 부착(partY로 벽 높이 배치)
  glasspanel: { cat: "structure", grid: "structure", solid: true, size: [1, 2.2, 0.06], label: "\uC720\uB9AC \uD30C\uD2F0\uC158" },
  // 1m 스냅 세그먼트, 통행 불가(시각만 반투명, 물리 차단)
  stool: { cat: "ambience", grid: "object", solid: true, size: [0.36, 0.46, 0.36], label: "\uC2A4\uD234" }
};
const PART_TYPE_IDS = new Set(Object.keys(PART_TYPES));
const FINISH = {
  wall: { ids: ["white", "warmsand", "charcoal"], def: "white" },
  // 4벽 공통 마감(중립 배경 규율 §3-6)
  // feature=피처월 1면 전용 마감. kintsugi(금계)는 여기에만 존재 → 스키마 차원에서 "1면 강제"(팀장 조건).
  feature: { ids: ["deepviolet", "kintsugi", "charcoal", "warmsand"], def: "deepviolet" },
  floor: { ids: ["parquet", "terrazzo", "concrete", "grass", "water"], def: "parquet" },
  // grass·water=v2 신재질(Tier1: water는 정적 반사 폴백, 스크롤은 방문자뷰 플래그)
  ceiling: { ids: ["whiteflat", "darkmatte"], def: "whiteflat" },
  trim: { ids: ["brass", "charcoal"], def: "brass" }
};
const TINT_PALETTES = {
  rug: ["#c9bfae", "#e4ddd0", "#4a4844", "#a9705a", "#8a9481"],
  // sand(기본)/ivory/charcoal/terracotta/sage
  drape: ["#2c2c30", "#4a4038", "#242c38", "#4a2b30", "#e4ddd0", "#8a9481"]
  // charcoal(기본)/taupe/navy/burgundy + ivory·sage(밝은톤 추가, rug와 톤 정합·갤러리 중립)
};
const FRAME_STYLES = { ids: ["minimal", "classic", "frameless"], def: "minimal" };
const FRAME_RULES = {
  portrait: { clampH: 2.6 },
  // 세로장: 높이 우선 clamp
  landscape: { clampW: 3.2 },
  // 가로장: 폭 우선 clamp
  minSize: 0.6,
  minGap: 0.4,
  // 최소 크기·작품 간 최소 간격
  thickness: 0.1
  // 3스타일 공통 두께(벽 돌출·조명 오프셋 일정)
};
const STORY_H = { studio: 2.8, gallery: 3.6, grand: 4.2 };
const FOOTPRINT = { small: [6, 6], medium: [9, 7], large: [14, 10], hall: [20, 14], grand: [28, 18] };
const DEFAULT_SPACE = Object.freeze({
  version: SPACE_VERSION,
  meta: { name: "\uB098\uC758 \uC804\uC2DC\uC2E4", author: "" },
  shell: {
    footprint: "medium",
    // 9×7m
    storyH: "gallery",
    // 3.6m
    wallT: 0.2,
    finish: { wall: "white", floor: "parquet", ceiling: "whiteflat", trim: "brass", featureWall: "north", featureFinish: "deepviolet" }
  },
  spawn: { x: 0, z: 3, ry: 0 },
  // 입구 아치 앞, 북벽(작품) 정면
  parts: [
    // 북벽 작품 3 (피처월) — 자동 액자 minimal
    { t: "artwork", x: -3, z: -3.4, ry: 0, frame: "minimal", src: "" },
    { t: "artwork", x: 0, z: -3.4, ry: 0, frame: "minimal", src: "", featured: true },
    { t: "artwork", x: 3, z: -3.4, ry: 0, frame: "minimal", src: "" },
    // 서벽 스크린(영상), 동벽 진열장
    { t: "screen", x: -4.4, z: -0.5, ry: Math.PI / 2, ratio: "16:9", src: "" },
    { t: "vitrine", x: 4.2, z: -1, ry: -Math.PI / 2 },
    // 중앙 좌대 + 관람 벤치 + 러그 + 화분
    { t: "pedestal", x: -1.4, z: -0.6, ry: 0 },
    { t: "bench", x: 0, z: 0.8, ry: 0, size: 1.8 },
    { t: "rug", x: 0, z: 0, ry: 0, variant: "rect", color: "#c9bfae" },
    { t: "planter", x: 3.6, z: 2.2, ry: 0 },
    // 조명: 북벽 작품 위 트랙 3
    { t: "trackLight", x: -3, z: -3, ry: 0 },
    { t: "trackLight", x: 0, z: -3, ry: 0 },
    { t: "trackLight", x: 3, z: -3, ry: 0 }
  ]
});
const clamp = (v, lo, hi, d) => typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
const pick = (v, ids, d) => typeof v === "string" && ids.has(v) ? v : d;
const hex = (v, d) => typeof v === "string" && HEX_RE.test(v) ? v : d;
const num = (v, d) => typeof v === "number" && isFinite(v) ? v : d;
const FIN = (k) => new Set(FINISH[k].ids);
const FRAME_IDS = new Set(FRAME_STYLES.ids);
const ENTRY_DIRS = /* @__PURE__ */ new Set(["north", "south", "east", "west"]);
function normEntries(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const d of v) {
    if (ENTRY_DIRS.has(d) && !out.includes(d)) out.push(d);
  }
  return out;
}
const clampInt = (v, lo, hi, d) => Number.isInteger(v) ? Math.min(hi, Math.max(lo, v)) : d;
function normStairs(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const s of v) {
    if (!s || typeof s !== "object") continue;
    const x0 = num(s.x0, 0), x1 = num(s.x1, 0), z0 = num(s.z0, 0), z1 = num(s.z1, 0);
    const yFrom = clamp(s.yFrom, 0, 20, 0), yTo = clamp(s.yTo, 0, 20, 0);
    if (x0 === x1 || z0 === z1 || yFrom === yTo) continue;
    out.push({ x0, x1, z0, z1, yFrom, yTo });
  }
  return out;
}
function normalizePart(raw) {
  if (!raw || typeof raw !== "object" || !PART_TYPE_IDS.has(raw.t)) return null;
  const spec = PART_TYPES[raw.t];
  const p = {
    t: raw.t,
    x: num(raw.x, 0),
    z: num(raw.z, 0),
    ry: num(raw.ry, 0)
  };
  if (Number.isInteger(raw.floor)) p.floor = raw.floor;
  const y = clamp(raw.y, 0, 20, 0);
  if (y > 0) p.y = y;
  if (raw.color !== void 0) p.color = hex(raw.color, void 0);
  if (spec.art) {
    p.frame = pick(raw.frame, FRAME_IDS, FRAME_STYLES.def);
    p.src = typeof raw.src === "string" ? raw.src : "";
    if (raw.featured) p.featured = true;
    const arv = clamp(raw.ar, 0.1, 10, void 0);
    if (arv !== void 0) p.ar = arv;
  }
  if (raw.t === "screen") {
    p.ratio = pick(raw.ratio, new Set(spec.ratios), spec.ratios[0]);
    p.src = typeof raw.src === "string" ? raw.src : "";
  }
  if (raw.variant !== void 0 && spec.variants) p.variant = pick(raw.variant, new Set(spec.variants), spec.variants[0]);
  if (raw.mat !== void 0 && spec.mats) p.mat = pick(raw.mat, new Set(spec.mats), spec.mats[0]);
  if (raw.size !== void 0 && spec.sizes) p.size = spec.sizes.includes(raw.size) ? raw.size : spec.sizes[0];
  return p;
}
function normalizeSpace(raw) {
  const src = raw && typeof raw === "object" ? migrateSpace(raw) : {};
  const sh = src.shell && typeof src.shell === "object" ? src.shell : {};
  const shf = sh.finish && typeof sh.finish === "object" ? sh.finish : {};
  const sp = src.spawn && typeof src.spawn === "object" ? src.spawn : {};
  const parts = Array.isArray(src.parts) ? src.parts.map(normalizePart).filter(Boolean) : [];
  return {
    version: SPACE_VERSION,
    meta: {
      name: typeof src.meta?.name === "string" && src.meta.name.trim() ? src.meta.name.slice(0, 40) : DEFAULT_SPACE.meta.name,
      author: typeof src.meta?.author === "string" ? src.meta.author.slice(0, 40) : ""
    },
    shell: {
      footprint: pick(sh.footprint, new Set(Object.keys(FOOTPRINT)), DEFAULT_SPACE.shell.footprint),
      storyH: pick(sh.storyH, new Set(Object.keys(STORY_H)), DEFAULT_SPACE.shell.storyH),
      wallT: clamp(sh.wallT, 0.1, 0.4, DEFAULT_SPACE.shell.wallT),
      entries: normEntries(sh.entries),
      // 오픈월드 파셀 개구부(생략=빈배열=폐쇄, 하위호환)
      floors: clampInt(sh.floors, 1, 4, 1),
      // 오픈월드 다층(생략=1=단층, 하위호환)
      stairs: normStairs(sh.stairs),
      // 층간 경사 밴드(생략=빈배열)
      finish: {
        wall: pick(shf.wall, FIN("wall"), FINISH.wall.def),
        floor: pick(shf.floor, FIN("floor"), FINISH.floor.def),
        ceiling: pick(shf.ceiling, FIN("ceiling"), FINISH.ceiling.def),
        trim: pick(shf.trim, FIN("trim"), FINISH.trim.def),
        featureWall: pick(shf.featureWall, /* @__PURE__ */ new Set(["none", "north", "south", "east", "west"]), "north"),
        featureFinish: pick(shf.featureFinish, FIN("feature"), FINISH.feature.def)
        // 피처월 1면 전용(kintsugi 포함)
      }
    },
    spawn: { x: num(sp.x, DEFAULT_SPACE.spawn.x), z: num(sp.z, DEFAULT_SPACE.spawn.z), ry: num(sp.ry, DEFAULT_SPACE.spawn.ry) },
    parts
  };
}
function migrateSpace(doc) {
  let d = doc;
  const v = typeof d.version === "number" ? d.version : 0;
  if (v > SPACE_VERSION) {
    const e = new Error("space version " + v + " > supported " + SPACE_VERSION);
    e.code = "SPACE_VERSION_AHEAD";
    throw e;
  }
  if (v === 0) d = { ...d, version: 1 };
  if (d.version === 1) {
    const sh = d.shell && typeof d.shell === "object" ? d.shell : null;
    const f = sh && sh.finish && typeof sh.finish === "object" ? sh.finish : null;
    if (f && f.wall === "deepviolet") {
      d = { ...d, shell: { ...sh, finish: { ...f, wall: "white", featureFinish: f.featureFinish || "deepviolet" } } };
    }
    d = { ...d, version: 2 };
  }
  return d;
}
const SPACE_PREFIX = "space:";
function encodeSpace(p) {
  return SPACE_PREFIX + JSON.stringify(normalizeSpace(p));
}
function decodeSpace(str) {
  if (typeof str !== "string" || !str.startsWith(SPACE_PREFIX)) return null;
  try {
    return normalizeSpace(JSON.parse(str.slice(SPACE_PREFIX.length)));
  } catch {
    return null;
  }
}
function newSpace() {
  return normalizeSpace(DEFAULT_SPACE);
}
export {
  DEFAULT_SPACE,
  FINISH,
  FOOTPRINT,
  FRAME_RULES,
  FRAME_STYLES,
  PART_CATEGORIES,
  PART_TYPES,
  PART_TYPE_IDS,
  SPACE_PREFIX,
  SPACE_VERSION,
  STORY_H,
  TINT_PALETTES,
  decodeSpace,
  encodeSpace,
  migrateSpace,
  newSpace,
  normalizeSpace
};
