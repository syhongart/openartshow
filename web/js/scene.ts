// scene.js — 배럴: 분해된 scene-* 모듈의 표면(원본 8 export)을 명시 재노출.
//   소비자(main.js·space-parts.ts·world.js)는 './scene.js' import 무수정(.js→.ts 폴백 해소).
//   export * 금지 — 전부 명시 named(C-3 scene 완성).
export { THEMES } from './scene-themes.js';
export { createParquetMaps, createPlasterMaps, createConcreteMaps } from './scene-textures.js';
export { buildDetailedTree, bakeGroupByMaterial } from './scene-trees.js';
export { createMuseum, sceneTick } from './scene-assembly.js';
