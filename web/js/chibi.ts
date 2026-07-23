// chibi.js — 배럴: 분해된 chibi-* 모듈의 표면(원본 31 export)을 명시 재노출.
//   소비자(world-gen/world-boot/ui-hud/builder-walk/avatar/npc/ui-avatar-editor)는
//   './chibi.js' import 무수정. export * 금지 — 전부 명시 named(C-3 chibi 완성).
export {
  CHIBI_HAIR_STYLES, CHIBI_BEARD_STYLES, CHIBI_EYE_STYLES, CHIBI_MOUTH_STYLES, CHIBI_BOTTOM_TYPES, CHIBI_TOP_PATTERNS, CHIBI_OUTFITS, CHIBI_ACCESSORIES,
  SKIN_TONES, HAIR_COLORS, EYE_COLORS, CHIBI_CLOTH_COLORS, CHIBI_FACE_SHAPES, CHIBI_SPECIES, CHIBI_GENDERS, SPECIES_PRESET,
  GENDER_PRESET, SPECIES_OUTFIT, CHIBI_PRESET_GROUPS, CHIBI_PRESETS, DEFAULT_CHIBI, normalizeChibi, CHIBI_CHAR_PREFIX, encodeChibi,
  decodeChibi, randomChibiLook, randomChibiChar,
} from './chibi-schema.ts';
export { CHIBI_ACTION_DUR, CHIBI_ACTIONS, CHIBI_ACTION_LABELS } from './chibi-anim.ts';
export { buildChibi } from './chibi-builder.ts';

// Ayamo 2.0: 저폴리 스킨드 메시 캐릭터
export { buildChibiV2 } from './chibi-builder-v2.ts';
export { createChibiShaderMaterial, assignPartColor, initializeVertexColors, PART_SKIN, PART_HAIR, PART_CLOTH, PART_ACCESSORY } from './chibi-shader-v2.ts';
export { ChibiLODManager, ChibiLODGroup, LODStats, DEFAULT_LOD_CONFIG } from './chibi-lod.ts';
export { ChibiAnimationV2 } from './chibi-animation-v2.ts';

