// three 앰비언트 선언 — tsc 타입체크 전용(런타임·번들 무영향).
// 배경: 번들은 vite.config가 'three'를 /vendor/three.module.js 별칭으로 해석하고,
// @types/three(방대·버전 민감)는 self-contained/CSP 원칙상 도입하지 않는다. .ts 모듈이
// three를 import 하기 시작하면(C-1 단계3 ui-avatar-editor.ts가 첫 사례) tsc가 타입 선언을
// 못 찾아 TS7016을 낸다. 이를 any 모듈로 선언해 타입체크만 통과시킨다(구 .js checkJs:false
// 시절의 타입 안전성 수준을 그대로 유지 — 기능·값 무변경).
declare module 'three';
