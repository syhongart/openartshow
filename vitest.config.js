import { defineConfig } from 'vitest/config';
import { tsJsFallback } from './vite.config.js';

// 단위테스트 — 순수함수/스키마 로직 전용. 렌더·헤드리스 검증은 Playwright 스모크가 담당.
// 테스트는 frontend/ 밖 tests/에 둔다(deploy.yml `cp -r frontend/. _site/app/`로 배포물에 섞이지 않게).
//
// [B-5 리졸브] vitest.config 가 존재하면 vitest 는 vite.config 를 로드하지 않으므로,
// tests/*.test.js 의 `../frontend/js/stats.js`(확장자 명시) import 가 .ts 로 해소되도록
// 동일 폴백 플러그인을 여기서도 재사용한다(배포기 정의를 그대로 import — 단일 출처).
export default defineConfig({
  plugins: [tsJsFallback()],
  test: {
    include: ['tests/**/*.test.{js,mjs,ts}'],
    // 기본은 node(순수함수). localStorage/DOM 의존 테스트는 파일 상단에
    // `// @vitest-environment jsdom` 주석으로 파일별 지정(jsdom은 devDep).
    environment: 'node',
    globals: false,
  },
});
