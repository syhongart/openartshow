// space-render.ts — 분해 배럴(C-3). space-render.js(1,516줄)를 leaf/조립기/베이크 3모듈로 순수 분해한 뒤
// 명시적 named re-export로 기존 공개 표면(14심볼)을 1바이트도 늘리거나 줄이지 않고 보존한다.
// (export * 금지 — 심볼 충돌이 조용히 drop될 위험. 재노출은 반드시 명시.)
// 소비자(builder.js·visit.js·world.js·builder.html·builder-walk.js)는 './space-render.js' import를 그대로
// 유지 → 번들러 tsJsFallback이 이 space-render.ts로 해소한다(소비자 무수정).
export { partY, warmBuildingTexCache, ART_SCREEN_CAP, UNIQUE_TEX_TYPES } from './space-parts.js';
export { spaceDims, DOOR_W, buildSpaceGroup, addRoomLighting, disposeSpaceGroup, buildPartPreview, uniqueTexCount } from './space-assembler.js';
export { detectSoftGPU, bakeShellLightmaps, bakeShellLightmapsAsync } from './space-lightmap.js';
