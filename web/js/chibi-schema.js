const USE_SKINNED_MESH_V2 = true;
const CHIBI_HAIR_STYLES = [
  { id: "twintail", name: "\uD2B8\uC708\uD14C\uC77C" },
  { id: "bob", name: "\uB2E8\uBC1C" },
  { id: "ponytail", name: "\uD3EC\uB2C8\uD14C\uC77C" },
  { id: "buns", name: "\uACBD\uB2E8\uBA38\uB9AC" },
  { id: "short", name: "\uC20F\uCEF7" },
  { id: "long", name: "\uB871" },
  { id: "wave", name: "\uC6E8\uC774\uBE0C" },
  { id: "halfup", name: "\uBC18\uBB36\uC74C" },
  { id: "heart", name: "\uD558\uD2B8" },
  { id: "bald", name: "\uB300\uBA38\uB9AC" }
];
const CHIBI_BEARD_STYLES = [
  { id: "none", name: "\uC5C6\uC74C" },
  { id: "stubble", name: "\uAE4C\uCE60" },
  { id: "mustache", name: "\uCF67\uC218\uC5FC" },
  { id: "goatee", name: "\uD131\uC218\uC5FC" },
  { id: "full", name: "\uD48D\uC131" }
];
const CHIBI_EYE_STYLES = [
  { id: "sparkle", name: "\uBC18\uC9DD" },
  { id: "round", name: "\uB3D9\uAE00" },
  { id: "happy", name: "\uC2A4\uB9C8\uC77C" }
];
const CHIBI_MOUTH_STYLES = [
  { id: "smile", name: "\uBBF8\uC18C" },
  { id: "cat", name: "\uACE0\uC591\uC774" },
  { id: "open", name: "\uBC8C\uB9BC" }
];
const CHIBI_BOTTOM_TYPES = [
  { id: "skirt", name: "\uCE58\uB9C8" },
  { id: "pants", name: "\uBC14\uC9C0" },
  { id: "dress", name: "\uC6D0\uD53C\uC2A4" },
  { id: "overall", name: "\uBA5C\uBE75\uBC14\uC9C0" },
  { id: "swimsuit", name: "\uC218\uC601\uBCF5" }
];
const CHIBI_TOP_PATTERNS = [
  { id: "plain", name: "\uBB34\uC9C0" },
  { id: "stripe", name: "\uC904\uBB34\uB2AC" },
  { id: "dot", name: "\uB561\uB561\uC774" },
  { id: "heart", name: "\uD558\uD2B8" }
];
const CHIBI_OUTFITS = [
  { id: "none", name: "\uAE30\uBCF8" },
  { id: "suit", name: "\uC815\uC7A5" },
  { id: "gyoryeon", name: "\uAD50\uB828\uBCF5" },
  { id: "artist", name: "\uD654\uAC00" },
  { id: "hanbok", name: "\uD55C\uBCF5" },
  { id: "hoodie", name: "\uD6C4\uB4DC" }
];
const CHIBI_ACCESSORIES = [
  { id: "none", name: "\uC5C6\uC74C" },
  { id: "ribbon", name: "\uB9AC\uBCF8" },
  { id: "flower", name: "\uAF43" },
  { id: "horns", name: "\uBFD4" }
];
const SKIN_TONES = ["#ffe0c8", "#ffd9bd", "#f0c8a8", "#e0b090", "#c98d66", "#a06844", "#7a4a2f"];
const HAIR_COLORS = ["#2b2b33", "#6b4530", "#8a5a3b", "#c9a227", "#d96c2c", "#8a4be0", "#4a5568", "#d8d3ca"];
const EYE_COLORS = ["#2b2b33", "#7a4a2f", "#3f6f8f", "#4f7a3a", "#b02e2e", "#6a4c93"];
const CHIBI_CLOTH_COLORS = [
  // 파스텔
  "#ff8fab",
  "#ffb3c1",
  "#a9d6e8",
  "#bfe3ec",
  "#c8ecd9",
  "#95d5b2",
  "#ffe08a",
  "#ffd166",
  "#d9c9f5",
  "#b799ff",
  // 선명
  "#5468c4",
  "#7a9cc4",
  "#e0596e",
  "#d96c2c",
  "#4f7a3a",
  // 무채·정장
  "#fffdf7",
  "#c7ccd4",
  "#7d7d54",
  "#39414f",
  "#2c3038"
];
const CHIBI_FACE_SHAPES = [
  { id: "round", name: "\uB3D9\uAE00" },
  { id: "slim", name: "\uAC38\uB984" },
  { id: "square", name: "\uAC01\uC9D0" },
  { id: "vline", name: "\uBE0C\uC774\uB77C\uC778" }
];
const CHIBI_SPECIES = [
  { id: "human", name: "\uC0AC\uB78C" },
  { id: "cat", name: "\uACE0\uC591\uC774" },
  { id: "dog", name: "\uAC15\uC544\uC9C0" },
  { id: "rabbit", name: "\uD1A0\uB07C" },
  { id: "bear", name: "\uACF0" },
  { id: "sheep", name: "\uC591" },
  { id: "fox", name: "\uC5EC\uC6B0" },
  { id: "panda", name: "\uD310\uB2E4" },
  { id: "lion", name: "\uC0AC\uC790" },
  { id: "penguin", name: "\uD3AD\uADC4" },
  { id: "chick", name: "\uBCD1\uC544\uB9AC" },
  { id: "frog", name: "\uAC1C\uAD6C\uB9AC" },
  { id: "hamster", name: "\uD584\uC2A4\uD130" },
  { id: "raccoon", name: "\uB108\uAD6C\uB9AC" },
  { id: "koala", name: "\uCF54\uC54C\uB77C" },
  { id: "pig", name: "\uB3FC\uC9C0" },
  { id: "robot", name: "\uB85C\uBD07" },
  { id: "ghost", name: "\uADC0\uC2E0" }
];
const NONHUMAN = /* @__PURE__ */ new Set(["robot", "ghost"]);
const CHIBI_GENDERS = [
  { id: "girl", name: "\uC5EC\uC544" },
  { id: "boy", name: "\uB0A8\uC544" },
  { id: "neutral", name: "\uC911\uC131" }
];
const SPECIES_PRESET = {
  cat: { skin: "#f5e6c8", hairColor: "#e8a15c" },
  dog: { skin: "#f0c869", hairColor: "#8a5a3b" },
  rabbit: { skin: "#fdfaf3", hairColor: "#ead9d6" },
  bear: { skin: "#d9a066", hairColor: "#f5e6c8" },
  sheep: { skin: "#fdfaf3", hairColor: "#f3d9cf" },
  fox: { skin: "#e8834f", hairColor: "#3a2c22" },
  panda: { skin: "#fbfaf7", hairColor: "#2a2724" },
  lion: { skin: "#e6b25e", hairColor: "#b5732e" },
  penguin: { skin: "#3b4652", hairColor: "#f4a83a" },
  chick: { skin: "#ffe066", hairColor: "#f4a83a" },
  frog: { skin: "#8fce6b", hairColor: "#5fa03f" },
  hamster: { skin: "#f0d6a8", hairColor: "#c98f5a" },
  raccoon: { skin: "#b8b2a6", hairColor: "#3a352f" },
  koala: { skin: "#aeb0b2", hairColor: "#7d7f82" },
  pig: { skin: "#f4b6c2", hairColor: "#e58ba0" },
  robot: { skin: "#aab0ba", hairColor: "#5fd0e0" },
  // 본체 스틸그레이 + 사이언 LED 포인트
  ghost: { skin: "#eef6f5", hairColor: "#bfe3ec" }
  // 반투명 몸체 + 옷단 트림색
};
const GENDER_PRESET = {
  girl: { gender: "girl", hairStyle: "twintail", hairColor: "#6b4530", top: "#ff8fab", bottom: "#5468c4", bottomType: "skirt", acc: "ribbon", eyeStyle: "sparkle" },
  boy: { gender: "boy", hairStyle: "short", hairColor: "#3a2c22", top: "#7ec4cf", bottom: "#3a3f4a", bottomType: "pants", acc: "none", eyeStyle: "round" },
  neutral: { gender: "neutral", hairStyle: "bob", hairColor: "#8a5a3b", top: "#95d5b2", bottom: "#ffd166", bottomType: "pants", acc: "flower", eyeStyle: "happy" }
};
const SPECIES_OUTFIT = {
  cat: { top: "#e0a45c", bottom: "#6b4530" },
  dog: { top: "#5c7fa6", bottom: "#a68a5c" },
  rabbit: { top: "#b7a4d1", bottom: "#f3e6d8" },
  bear: { top: "#4f7a5c", bottom: "#6b4530" },
  sheep: { top: "#8fb8d6", bottom: "#f3e6d8" },
  fox: { top: "#d97b3f", bottom: "#f3e6d8" },
  panda: { top: "#c0392b", bottom: "#39352f" },
  lion: { top: "#3a5faa", bottom: "#f3e6d8" },
  penguin: { top: "#7ec4cf", bottom: "#fbfaf7" },
  chick: { top: "#7ec4cf", bottom: "#fbfaf7" },
  frog: { top: "#ffd166", bottom: "#6b4530" },
  hamster: { top: "#8fd6b4", bottom: "#f3e6d8" },
  raccoon: { top: "#e0a45c", bottom: "#4a6fa5" },
  koala: { top: "#7fa88f", bottom: "#444548" },
  pig: { top: "#8fd6b4", bottom: "#fbead0" },
  robot: { top: "#39414f", bottom: "#2c3038" },
  // 무채 패널 계열(기존 옷색 재사용)
  ghost: { top: "#eef6f5", bottom: "#dcefee" }
  // 실사용 거의 없음(시트가 대체)
};
const _sp = (id, name, extra, cat) => ({ id, name, cat: cat || "animal", look: Object.assign({ species: id, eyeStyle: "happy" }, SPECIES_PRESET[id] || {}, SPECIES_OUTFIT[id] || {}, extra || {}) });
const _spv = (id, species, name, over) => ({ id, name, cat: "variant", look: Object.assign({ species, eyeStyle: "happy" }, SPECIES_PRESET[species] || {}, SPECIES_OUTFIT[species] || {}, over || {}) });
const CHIBI_PRESET_GROUPS = [
  { id: "new", name: "\u2728 \uC2E0\uC791" },
  { id: "human", name: "\uC0AC\uB78C" },
  { id: "animal", name: "\uB3D9\uBB3C \uCE5C\uAD6C" },
  { id: "special", name: "\uB85C\uBD07 \xB7 \uADC0\uC2E0" },
  { id: "variant", name: "\uB3D9\uBB3C \uC0C9 \uBCC0\uD615" }
];
const CHIBI_PRESETS = [
  // ── 사람 완성 룩 ──
  { id: "girl", name: "\uAE30\uBCF8 \uC5EC\uC544", look: {} },
  { id: "boy", name: "\uAE30\uBCF8 \uB0A8\uC544", look: Object.assign({}, GENDER_PRESET.boy) },
  // 신작 룩 — 줄 앞쪽 배치(발견성). 모달 패널은 세로 스크롤이라 뒤쪽 카드는 폴드에
  // 잘려 "새 캐릭터가 없다"로 인지됨(감독 신고) → 기본 2종 바로 뒤가 정위치.
  { id: "long_girl", name: "\uAE34 \uBA38\uB9AC \uC18C\uB140", cat: "new", look: { hairStyle: "wave", hairColor: "#6b4530", top: "#ffb3c1", bottomType: "dress", eyeStyle: "sparkle", acc: "flower" } },
  { id: "long_black", name: "\uD751\uBC1C \uB871", cat: "new", look: { hairStyle: "long", hairColor: "#2b2b33", top: "#a9d6e8", bottom: "#39414f", bottomType: "skirt", eyeStyle: "happy" } },
  { id: "halfup_girl", name: "\uBC18\uBB36\uC74C \uC18C\uB140", cat: "new", look: { hairStyle: "halfup", hairColor: "#8a5a3b", top: "#c8ecd9", bottomType: "skirt", bottom: "#95d5b2", eyeStyle: "happy", acc: "ribbon" } },
  { id: "heart_head", name: "\uD558\uD2B8 \uBA38\uB9AC", cat: "new", look: { hairStyle: "heart", hairColor: "#ff8fab", top: "#fffdf7", bottom: "#95d5b2", bottomType: "skirt", eyeStyle: "happy", mouth: "open" } },
  { id: "heart_head_orange", name: "\uC8FC\uD669 \uD558\uD2B8 \uBA38\uB9AC", cat: "new", look: { hairStyle: "heart", hairColor: "#f0a05c", top: "#ffb3c1", bottom: "#ff8fab", bottomType: "dress", eyeStyle: "happy", mouth: "smile" } },
  { id: "artist", name: "\uD654\uAC00", cat: "new", look: { outfit: "artist", top: "#c7ccd4", bottom: "#39414f", bottomType: "pants", hairStyle: "short", hairColor: "#3a2c22", eyeStyle: "round" } },
  { id: "artist_girl", name: "\uD654\uAC00 \uC18C\uB140", cat: "new", look: { outfit: "artist", top: "#a9d6e8", bottom: "#5468c4", bottomType: "skirt", hairStyle: "wave", hairColor: "#6b4530", eyeStyle: "happy" } },
  { id: "hanbok_f", name: "\uD55C\uBCF5(\uC5EC)", cat: "new", look: { outfit: "hanbok", top: "#c8ecd9", bottom: "#e0596e", bottomType: "dress", hairStyle: "buns", hairColor: "#2b2b33", eyeStyle: "happy", acc: "flower" } },
  { id: "hanbok_m", name: "\uD55C\uBCF5(\uB0A8)", cat: "new", look: { gender: "boy", outfit: "hanbok", top: "#a9d6e8", bottom: "#39414f", bottomType: "pants", hairStyle: "short", hairColor: "#2b2b33", eyeStyle: "round" } },
  { id: "hoodie", name: "\uD6C4\uB4DC", cat: "new", look: { outfit: "hoodie", top: "#5468c4", bottom: "#2c3038", bottomType: "pants", hairStyle: "short", hairColor: "#2a2320", eyeStyle: "round", acc: "none" } },
  { id: "hoodie_pink", name: "\uD551\uD06C \uD6C4\uB4DC", cat: "new", look: { outfit: "hoodie", top: "#ff8fab", bottom: "#39414f", bottomType: "pants", hairStyle: "short", hairColor: "#6b4530", eyeStyle: "happy" } },
  { id: "angel", name: "\uC5D4\uC824\uC774", look: { hairStyle: "bob", hairColor: "#6e4632", skin: "#f7e7d2", eyeStyle: "happy", top: "#a9d6e8", bottom: "#a9d6e8", bottomType: "dress", acc: "none", halo: true, wings: true, heart: true } },
  { id: "angel_pink", name: "\uD551\uD06C \uC5D4\uC824", look: { hairStyle: "twintail", hairColor: "#6b4530", top: "#ffb3c1", bottom: "#ffb3c1", bottomType: "dress", halo: true, wings: true, heart: true, eyeStyle: "happy", acc: "none" } },
  { id: "dots", name: "\uB561\uB561\uC774 \uC6D0\uD53C\uC2A4", look: { top: "#ff8fab", pattern: "dot", bottomType: "dress", eyeStyle: "happy", acc: "ribbon" } },
  { id: "dots_blue", name: "\uD558\uB298 \uB561\uB561\uC774", look: { top: "#a9d6e8", pattern: "dot", bottomType: "skirt", bottom: "#5468c4", hairStyle: "bob", eyeStyle: "sparkle" } },
  { id: "heart_girl", name: "\uD558\uD2B8 \uC18C\uB140", look: { top: "#ff8fab", pattern: "heart", bottomType: "dress", acc: "ribbon", eyeStyle: "happy" } },
  { id: "stripe_girl", name: "\uC904\uBB34\uB2AC \uC18C\uB140", look: { top: "#7ec4cf", pattern: "stripe", bottomType: "skirt", bottom: "#3a3f4a", hairStyle: "twintail", eyeStyle: "sparkle" } },
  { id: "mint_dress", name: "\uBBFC\uD2B8 \uC6D0\uD53C\uC2A4", look: { top: "#c8ecd9", bottomType: "dress", hairStyle: "bob", eyeStyle: "happy", acc: "flower" } },
  { id: "lavender", name: "\uB77C\uBCA4\uB354 \uC18C\uB140", look: { top: "#d9c9f5", bottomType: "skirt", bottom: "#b799ff", hairStyle: "ponytail", acc: "flower", eyeStyle: "happy" } },
  { id: "sunny", name: "\uD587\uC0B4 \uC18C\uB140", look: { top: "#ffd166", bottomType: "skirt", bottom: "#ff8fab", hairStyle: "buns", acc: "ribbon", eyeStyle: "sparkle" } },
  { id: "suit", name: "\uC815\uC7A5", look: { gender: "boy", hairStyle: "short", hairColor: "#2a2320", top: "#39414f", bottom: "#2c3038", bottomType: "pants", outfit: "suit", acc: "none", eyeStyle: "round" } },
  { id: "gyoryeon", name: "\uAD50\uB828\uBCF5", look: { gender: "boy", hairStyle: "short", hairColor: "#2a2320", top: "#7d7d54", bottom: "#6b6b47", bottomType: "pants", outfit: "gyoryeon", acc: "none", eyeStyle: "round" } },
  { id: "overall_boy", name: "\uBA5C\uBE75 \uC18C\uB144", look: { gender: "boy", hairStyle: "short", top: "#ffe08a", bottom: "#7a9cc4", bottomType: "overall", acc: "none", eyeStyle: "round" } },
  { id: "glasses", name: "\uC548\uACBD \uC18C\uB140", look: { glasses: true, eyeStyle: "round", top: "#c8ecd9", bottomType: "skirt" } },
  { id: "glasses_boy", name: "\uC548\uACBD \uC18C\uB144", look: { gender: "boy", hairStyle: "short", top: "#5468c4", bottom: "#2c3038", bottomType: "pants", glasses: true, eyeStyle: "round", acc: "none" } },
  // ── 동물 (기본) ──
  _sp("cat", "\uACE0\uC591\uC774"),
  _sp("dog", "\uAC15\uC544\uC9C0", { mouth: "open" }),
  _sp("rabbit", "\uD1A0\uB07C", { eyeStyle: "sparkle" }),
  _sp("bear", "\uACF0"),
  _sp("sheep", "\uC591"),
  _sp("panda", "\uD310\uB2E4"),
  _sp("fox", "\uC5EC\uC6B0", { mouth: "cat" }),
  _sp("lion", "\uC0AC\uC790"),
  _sp("penguin", "\uD3AD\uADC4"),
  _sp("chick", "\uBCD1\uC544\uB9AC"),
  _sp("frog", "\uAC1C\uAD6C\uB9AC", { mouth: "open" }),
  _sp("hamster", "\uD584\uC2A4\uD130", { eyeStyle: "sparkle" }),
  _sp("raccoon", "\uB108\uAD6C\uB9AC", { eyeStyle: "round" }),
  _sp("koala", "\uCF54\uC54C\uB77C"),
  _sp("pig", "\uB3FC\uC9C0"),
  // ── 제3종족 ──
  _sp("robot", "\uB85C\uBD07", { bottomType: "pants", shoes: "#2c3038", hairStyle: "bald", mouth: "smile" }, "special"),
  _sp("ghost", "\uADC0\uC2E0", { mouth: "open", hairStyle: "bald" }, "special"),
  // ── 동물 색 변형(같은 종 다른 개체) ──
  _spv("cat_black", "cat", "\uAC80\uC740 \uACE0\uC591\uC774", { skin: "#3a352f", hairColor: "#f5e6c8", eyeStyle: "round" }),
  _spv("cat_grey", "cat", "\uD68C\uC0C9 \uACE0\uC591\uC774", { skin: "#c9c3ba", hairColor: "#8a8078" }),
  _spv("cat_calico", "cat", "\uC0BC\uC0C9 \uACE0\uC591\uC774", { skin: "#f0ddc0", hairColor: "#c96b3b", mouth: "cat" }),
  _spv("dog_cream", "dog", "\uD06C\uB9BC \uAC15\uC544\uC9C0", { skin: "#f5ede0", hairColor: "#6b4530", mouth: "open" }),
  _spv("dog_choco", "dog", "\uCD08\uCF54 \uAC15\uC544\uC9C0", { skin: "#a06a44", hairColor: "#5a3a26" }),
  _spv("bear_black", "bear", "\uD751\uACF0", { skin: "#4a3a2c", hairColor: "#c9a876" }),
  _spv("bear_polar", "bear", "\uBC31\uACF0", { skin: "#f2efe8", hairColor: "#d8d0c4" }),
  _spv("rabbit_brown", "rabbit", "\uAC08\uC0C9 \uD1A0\uB07C", { skin: "#d9b48c", hairColor: "#8a5a3b", eyeStyle: "sparkle" }),
  _spv("rabbit_grey", "rabbit", "\uD68C\uC0C9 \uD1A0\uB07C", { skin: "#cfc9c0", hairColor: "#9a9088" }),
  _spv("fox_arctic", "fox", "\uD770 \uC5EC\uC6B0", { skin: "#eef0f2", hairColor: "#c8ccd0", mouth: "cat" }),
  _spv("hamster_grey", "hamster", "\uD68C\uC0C9 \uD584\uC2A4\uD130", { skin: "#cfc7bb", hairColor: "#9a9088" }),
  _spv("pig_choco", "pig", "\uCD08\uCF54 \uB3FC\uC9C0", { skin: "#c98f8f", hairColor: "#b06a6a" })
];
const FACE_SHAPE_DEF = {
  round: { sx: 1, sy: 1, sz: 1, taper: 0, flat: 0 },
  slim: { sx: 0.95, sy: 1.05, sz: 0.98, taper: 0.05, flat: 0 },
  square: { sx: 1.03, sy: 0.97, sz: 1, taper: 0, flat: 0.5 },
  vline: { sx: 0.97, sy: 1.03, sz: 0.98, taper: 0.3, flat: 0 }
};
const SPECIES_HEAD_BASE = {
  human: { sx: 1, sy: 0.95, sz: 0.97, taper: 0, flat: 0 },
  cat: { sx: 1, sy: 0.97, sz: 0.96, taper: 0.14, flat: 0 },
  dog: { sx: 1.02, sy: 0.94, sz: 1.05, taper: 0.08, flat: 0.12 },
  rabbit: { sx: 0.95, sy: 1.07, sz: 0.98, taper: 0.1, flat: 0 },
  bear: { sx: 1.06, sy: 0.96, sz: 1.02, taper: 0, flat: 0.22 },
  sheep: { sx: 1, sy: 0.97, sz: 0.95, taper: 0, flat: 0.18 },
  fox: { sx: 0.96, sy: 1, sz: 1.04, taper: 0.22, flat: 0 },
  panda: { sx: 1.05, sy: 0.98, sz: 0.99, taper: 0, flat: 0.1 },
  lion: { sx: 1.06, sy: 0.94, sz: 1, taper: 0, flat: 0.32 },
  penguin: { sx: 0.95, sy: 1.06, sz: 0.96, taper: 0.05, flat: 0 },
  chick: { sx: 1, sy: 1.02, sz: 0.98, taper: 0, flat: 0 },
  frog: { sx: 1.1, sy: 0.85, sz: 0.93, taper: 0, flat: 0.4 },
  hamster: { sx: 1.04, sy: 0.97, sz: 1, taper: 0, flat: 0.14 },
  raccoon: { sx: 0.98, sy: 0.99, sz: 1.03, taper: 0.14, flat: 0 },
  koala: { sx: 1.07, sy: 0.97, sz: 0.97, taper: 0, flat: 0.1 },
  pig: { sx: 1.03, sy: 0.96, sz: 1, taper: 0, flat: 0.28 },
  robot: { sx: 1.05, sy: 0.97, sz: 1, taper: 0, flat: 0.45 },
  // 각진 금속 두상
  ghost: { sx: 0.97, sy: 1.05, sz: 0.97, taper: 0, flat: 0 }
  // 매끈한 타원(턱선 없음)
};
const DEFAULT_CHIBI = {
  species: "human",
  gender: "girl",
  skin: "#ffd9bd",
  hairStyle: "twintail",
  hairColor: "#6b4530",
  eyeStyle: "sparkle",
  eyeColor: "#7a4a2f",
  mouth: "smile",
  beardStyle: "none",
  face: "round",
  blush: true,
  top: "#ff8fab",
  pattern: "plain",
  outfit: "none",
  bottom: "#5468c4",
  bottomType: "skirt",
  shoes: "#fffdf7",
  acc: "ribbon",
  halo: false,
  wings: false,
  heart: false,
  glasses: false
};
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ID_OF = (list) => new Set(list.map((x) => x.id));
const HAIR_IDS = ID_OF(CHIBI_HAIR_STYLES);
const FACE_IDS = ID_OF(CHIBI_FACE_SHAPES);
const EYE_IDS = ID_OF(CHIBI_EYE_STYLES);
const MOUTH_IDS = ID_OF(CHIBI_MOUTH_STYLES);
const BEARD_IDS = ID_OF(CHIBI_BEARD_STYLES);
const BOTTOM_IDS = ID_OF(CHIBI_BOTTOM_TYPES);
const PATTERN_IDS = ID_OF(CHIBI_TOP_PATTERNS);
const OUTFIT_IDS = ID_OF(CHIBI_OUTFITS);
const ACC_IDS = ID_OF(CHIBI_ACCESSORIES);
const SPECIES_IDS = ID_OF(CHIBI_SPECIES);
const GENDER_IDS = ID_OF(CHIBI_GENDERS);
function normalizeChibi(p) {
  const src = p && typeof p === "object" ? p : {};
  const hex = (v, d) => typeof v === "string" && HEX_RE.test(v) ? v : d;
  const pick = (v, ids, d) => typeof v === "string" && ids.has(v) ? v : d;
  return {
    species: pick(src.species, SPECIES_IDS, DEFAULT_CHIBI.species),
    gender: pick(src.gender, GENDER_IDS, DEFAULT_CHIBI.gender),
    skin: hex(src.skin, DEFAULT_CHIBI.skin),
    hairStyle: pick(src.hairStyle, HAIR_IDS, DEFAULT_CHIBI.hairStyle),
    hairColor: hex(src.hairColor, DEFAULT_CHIBI.hairColor),
    eyeStyle: pick(src.eyeStyle, EYE_IDS, DEFAULT_CHIBI.eyeStyle),
    eyeColor: hex(src.eyeColor, DEFAULT_CHIBI.eyeColor),
    mouth: pick(src.mouth, MOUTH_IDS, DEFAULT_CHIBI.mouth),
    beardStyle: pick(src.beardStyle, BEARD_IDS, DEFAULT_CHIBI.beardStyle),
    face: pick(src.face === "chubby" ? "square" : src.face, FACE_IDS, DEFAULT_CHIBI.face),
    blush: src.blush !== false,
    top: hex(src.top, DEFAULT_CHIBI.top),
    pattern: pick(src.pattern, PATTERN_IDS, DEFAULT_CHIBI.pattern),
    outfit: pick(src.outfit, OUTFIT_IDS, DEFAULT_CHIBI.outfit),
    bottom: hex(src.bottom, DEFAULT_CHIBI.bottom),
    bottomType: pick(src.bottomType, BOTTOM_IDS, DEFAULT_CHIBI.bottomType),
    shoes: hex(src.shoes, DEFAULT_CHIBI.shoes),
    acc: pick(src.acc, ACC_IDS, DEFAULT_CHIBI.acc),
    halo: src.halo === true,
    wings: src.wings === true,
    heart: src.heart === true,
    glasses: src.glasses === true
  };
}
const CHIBI_CHAR_PREFIX = "chibi:";
function encodeChibi(p) {
  return CHIBI_CHAR_PREFIX + JSON.stringify(normalizeChibi(p));
}
function decodeChibi(charId) {
  if (typeof charId !== "string" || !charId.startsWith(CHIBI_CHAR_PREFIX)) return null;
  try {
    return normalizeChibi(JSON.parse(charId.slice(CHIBI_CHAR_PREFIX.length)));
  } catch {
    return null;
  }
}
const _pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function randomChibiLook(opts = {}) {
  const presetBias = typeof opts.presetBias === "number" ? opts.presetBias : 0.66;
  if (!opts.noPreset && CHIBI_PRESETS.length && Math.random() < presetBias) {
    return normalizeChibi(Object.assign({}, _pick(CHIBI_PRESETS).look));
  }
  const species = _pick(CHIBI_SPECIES).id;
  const speciesBase = species === "human" ? {} : Object.assign({}, SPECIES_PRESET[species] || {}, SPECIES_OUTFIT[species] || {});
  return normalizeChibi(Object.assign({
    skin: _pick(SKIN_TONES),
    hairStyle: _pick(CHIBI_HAIR_STYLES).id,
    hairColor: _pick(HAIR_COLORS),
    eyeStyle: _pick(CHIBI_EYE_STYLES).id,
    eyeColor: _pick(EYE_COLORS),
    mouth: _pick(CHIBI_MOUTH_STYLES).id,
    beardStyle: Math.random() < 0.15 ? _pick(CHIBI_BEARD_STYLES).id : "none",
    // 대부분 무수염
    blush: Math.random() < 0.75,
    top: _pick(CHIBI_CLOTH_COLORS),
    bottom: _pick(CHIBI_CLOTH_COLORS),
    bottomType: _pick(CHIBI_BOTTOM_TYPES).id,
    shoes: _pick(CHIBI_CLOTH_COLORS),
    acc: _pick(CHIBI_ACCESSORIES).id
  }, { species }, speciesBase));
}
function randomChibiChar(opts) {
  return CHIBI_CHAR_PREFIX + JSON.stringify(randomChibiLook(opts));
}
export {
  CHIBI_ACCESSORIES,
  CHIBI_BEARD_STYLES,
  CHIBI_BOTTOM_TYPES,
  CHIBI_CHAR_PREFIX,
  CHIBI_CLOTH_COLORS,
  CHIBI_EYE_STYLES,
  CHIBI_FACE_SHAPES,
  CHIBI_GENDERS,
  CHIBI_HAIR_STYLES,
  CHIBI_MOUTH_STYLES,
  CHIBI_OUTFITS,
  CHIBI_PRESETS,
  CHIBI_PRESET_GROUPS,
  CHIBI_SPECIES,
  CHIBI_TOP_PATTERNS,
  DEFAULT_CHIBI,
  EYE_COLORS,
  FACE_SHAPE_DEF,
  GENDER_PRESET,
  HAIR_COLORS,
  NONHUMAN,
  SKIN_TONES,
  SPECIES_HEAD_BASE,
  SPECIES_OUTFIT,
  SPECIES_PRESET,
  USE_SKINNED_MESH_V2,
  decodeChibi,
  encodeChibi,
  normalizeChibi,
  randomChibiChar,
  randomChibiLook
};
