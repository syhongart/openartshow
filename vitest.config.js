import { defineConfig } from 'vitest/config';

// 단위테스트 — 순수함수/스키마 로직 전용. 렌더·헤드리스 검증은 Playwright 스모크가 담당.
// 테스트는 web/ 밖 tests/에 둔다(deploy.yml `cp -r web/. _site/app/`로 배포물에 섞이지 않게).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,mjs,ts}'],
    // 기본은 node(순수함수). localStorage/DOM 의존 테스트는 파일 상단에
    // `// @vitest-environment jsdom` 주석으로 파일별 지정(jsdom은 devDep).
    environment: 'node',
    globals: false,
  },
});
