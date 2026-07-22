// scripts/smoke/check-refs.mjs — no-undef 스코프(미해결 참조) 정적 검사.
//
// 왜 필요한가(#94, C-3(2) chibi 사건의 산물):
//   web/js 의 분해 모듈 다수가 `// @ts-nocheck` 라 tsc 가 진단을 건너뛰고, eslint 도
//   .ts 를 대상에서 제외(+`no-undef:off`)한다. 그 결과 "정의가 어딘가로 이동했으나
//   cross-module 참조 연결이 끊긴"(export 승격/ import 누락) 케이스가 정적 게이트의
//   사각에 빠진다. chibi 분해 때 비export 상수 3개가 이 경로로 런타임 ReferenceError
//   (아바타 생성 100% 크래시)를 냈고, byte 무결성·vite build·정적 스모크 어느 것도
//   못 잡아 검수관이 수동 no-undef 스코프 활성으로 잡았다. 이 검사를 상시 자동화한다.
//
// 방법: 각 .ts 소스의 억제 지시어(@ts-nocheck/@ts-ignore/@ts-expect-error)를 무력화한
//   메모리 사본으로 TS 프로그램을 만들고, "이름을 찾을 수 없음"류 진단(TS2304/2552/
//   2503/2686)만 추출한다. strict 타입 에러는 무시하고 미해결 식별자(=no-undef)만 본다.
//   → @ts-nocheck 여부와 무관하게 끊긴 cross-module 참조를 검출. 새 의존성 0(tsc 재사용).
//
// 종료코드: 미해결 참조 0 → 0, 하나라도 있으면 1(+ 목록 출력).
// 단독 실행(`node scripts/smoke/check-refs.mjs`) 및 run.mjs 검사0 에서 재사용.

import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'web', 'js');

// 억제 지시어를 무력화(내용은 보존, 지시 효력만 제거)해 진단이 나오게 한다.
const SUPPRESS_RE = /@ts-(nocheck|ignore|expect-error)/g;

// "이름/네임스페이스를 찾을 수 없음" 계열만 관심(= no-undef). 순수 타입 에러는 제외.
const REF_CODES = new Set([
  2304, // Cannot find name 'X'.
  2552, // Cannot find name 'X'. Did you mean 'Y'?
  2503, // Cannot find namespace 'X'.
  2686, // 'X' refers to a UMD global, but the current file is a module.
]);

const COMPILER_OPTIONS = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowJs: true,
  checkJs: false,
  noEmit: true,
  strict: true,
  skipLibCheck: true,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
};

export function findUnresolvedRefs() {
  const tsFiles = fs.readdirSync(SRC).filter((f) => f.endsWith('.ts'));
  const overrides = new Map();
  for (const f of tsFiles) {
    const abs = path.normalize(path.join(SRC, f));
    const code = fs.readFileSync(abs, 'utf8').replace(SUPPRESS_RE, 'ts-$1-OFF');
    overrides.set(abs, code);
  }

  const host = ts.createCompilerHost(COMPILER_OPTIONS);
  const origRead = host.readFile.bind(host);
  host.readFile = (name) => {
    const norm = path.normalize(name);
    return overrides.has(norm) ? overrides.get(norm) : origRead(name);
  };

  const rootNames = tsFiles.map((f) => path.join(SRC, f));
  const program = ts.createProgram(rootNames, COMPILER_OPTIONS, host);

  const hits = [];
  for (const sf of program.getSourceFiles()) {
    if (!sf.fileName.startsWith(SRC)) continue;
    for (const d of program.getSemanticDiagnostics(sf)) {
      if (!REF_CODES.has(d.code) || d.start == null) continue;
      const { line } = d.file.getLineAndCharacterOfPosition(d.start);
      hits.push({
        file: path.basename(d.file.fileName),
        line: line + 1,
        code: d.code,
        msg: ts.flattenDiagnosticMessageText(d.messageText, ' '),
      });
    }
  }
  return { fileCount: tsFiles.length, hits };
}

// run.mjs 등에서 재사용할 수 있게 결과만 반환하는 래퍼.
export function checkRefs() {
  const { fileCount, hits } = findUnresolvedRefs();
  return {
    ok: hits.length === 0,
    fileCount,
    hits,
    evidence: hits.length === 0
      ? `${fileCount}개 .ts 모듈 미해결 참조 0(끊긴 cross-module 참조 없음)`
      : `미해결 참조 ${hits.length}건 — ${hits.slice(0, 4).map((h) => `${h.file}:${h.line} ${h.msg}`).join(' | ')}`,
  };
}

// 단독 실행 진입점.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { fileCount, hits } = findUnresolvedRefs();
  if (hits.length === 0) {
    console.log(`참조 무결성 OK — ${fileCount}개 .ts 모듈, 미해결 참조(no-undef) 0.`);
    process.exit(0);
  }
  console.error(`참조 무결성 FAIL — 미해결 참조 ${hits.length}건(끊긴 cross-module 참조 의심):`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  TS${h.code}  ${h.msg}`);
  process.exit(1);
}
