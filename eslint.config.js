// ESLint flat config (v9) — A단계 baseline.
// 17k줄 기존 코드에 대량 에러를 내지 않도록 관대하게 시작한다: 파싱 에러와
// 명백한 실수(미사용 변수는 경고)만 잡고, no-undef는 끈다(브라우저·three 전역 다수).
// 리팩터/TS 전환이 진행되며 규칙을 점진 강화한다(전환된 .ts는 tsc strict가 커버).
export default [
  { ignores: ['node_modules/**', 'web/vendor/**', '_site/**', '**/*.min.js'] },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'no-const-assign': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'warn',
    },
  },
];
