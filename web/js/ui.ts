// web/js/ui.ts — HUD/셸 배럴(barrel)
//
// C단계 C-1 단계4의 산출물. ui.js 분해(단계1~3에서 ui-dom·ui-chibi-store·
// ui-avatar-editor 추출 완료)의 마지막으로, 잔여 셸+HUD+Public API 는
// ui-hud.ts 로 개명되고, 소비자(main.js)의 진입 표면은 이 배럴이 유지한다.
//
// 왜 배럴인가: 라이브 보호파일 main.js 는 `import { … } from './ui.js'` 를
// 무수정으로 둔다. tsJsFallback(vite.config.js) 이 실재 `ui.js` 부재를 보고
// 이 `ui.ts`(배럴)로 1차 폴백 → 배럴의 `./ui-hud.js` 가 다시 `ui-hud.ts` 로
// 2차 폴백한다. main.js 가 필요로 하는 34 심볼 전체를 아래 재노출로 보존한다.
//
// ui-hud.ts 에 default export 는 없으므로 `export *` 만으로 34 named export 가
// 전부 재노출된다(누락 0). default 가 추가되면 여기서 명시 재export 할 것.
export * from './ui-hud.js';
