// tests/gate.test.ts — 게이트 자체를 게이트로 지킨다.
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────────────
// `npm run gate` 는 "게이트를 손으로 조립하다가 두 번 틀린 것" 을 구조로 없애기 위해
// 만들었다. 그런데 그 스크립트 자신이 조용히 낡으면 같은 문제가 돌아온다:
//
//   · `GATES` 목록의 script 이름을 package.json 에서 지우거나 이름을 바꾸면
//     → `npm run <없는 이름>` 이 에러를 내며 게이트가 **항상 FAIL** 하거나(눈에 띔),
//       npm 버전에 따라 다르게 굴 수 있다
//   · 새 검사(`check:*`)를 package.json 에 추가하고 `GATES` 에 안 넣으면
//     → 그 검사는 **아무도 안 돌린다.** 조용하고, 이게 진짜 위험이다
//
// 후자를 잡는 것이 이 파일의 목적이다. 검사를 만들어놓고 배선을 잊는 것은 이 저장소가
// 여러 번 겪은 형태다(검사2 가 장식이었던 일, 성능 게이트가 observe 로 남은 일).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATES } from '../scripts/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

describe('gate.mjs — 게이트 목록', () => {
  it('import 만으로 게이트가 실행되지 않는다 (실행 가드)', () => {
    // 이 테스트가 **끝난다는 것 자체**가 증거다. 가드가 없으면 import 시점에 게이트가
    // 돌고, 그 게이트가 test 를 부르고, 그 test 가 이 파일을 다시 import 한다.
    expect(Array.isArray(GATES)).toBe(true);
    expect(GATES.length).toBeGreaterThan(0);
  });

  it('모든 게이트가 package.json 의 실제 script 를 가리킨다', () => {
    const missing = GATES.filter((g) => !(g.cmd in (pkg.scripts ?? {})));
    expect(
      missing.map((g) => g.cmd),
      `package.json 에 없는 script 를 가리킨다 — 이름이 바뀌었거나 지워졌다`,
    ).toEqual([]);
  });

  it('package.json 의 check:* 검사가 전부 게이트에 배선돼 있다', () => {
    // **이것이 이 파일의 핵심 단언이다.** 검사를 만들고 배선을 잊으면 그 검사는
    // 장식이 되고, 아무 신호도 나지 않는다.
    const checks = Object.keys(pkg.scripts ?? {}).filter((k) => k.startsWith('check:'));
    const wired = new Set(GATES.map((g) => g.cmd));
    const unwired = checks.filter((c) => !wired.has(c));
    expect(
      unwired,
      `package.json 에 있으나 npm run gate 가 안 돌리는 검사:\n  ${unwired.join('\n  ')}\n`
      + `  scripts/gate.mjs 의 GATES 에 추가하거나, 게이트가 아닌 이유를 여기 적어라.`,
    ).toEqual([]);
  });

  it('lint·typecheck·test 가 포함돼 있다', () => {
    const wired = new Set(GATES.map((g) => g.cmd));
    for (const must of ['lint', 'typecheck', 'test']) {
      expect(wired.has(must), `${must} 가 게이트에 없다`).toBe(true);
    }
  });

  it('스모크는 포함하지 않는다 — §10-3 독립 executor 소관', () => {
    // 구현자가 자기 코드를 스모크하는 습관이 생기면 안 된다(구현자 본인 금지).
    const wired = GATES.map((g) => g.cmd);
    expect(wired.filter((c) => c.startsWith('smoke'))).toEqual([]);
  });

  it('싼 것이 먼저 온다 — test 가 마지막', () => {
    // lint 로 걸릴 것을 test 16초 뒤에 알 이유가 없다.
    expect(GATES[GATES.length - 1].cmd).toBe('test');
  });

  it('gate script 가 package.json 에 등록돼 있다', () => {
    expect(pkg.scripts?.gate).toBe('node scripts/gate.mjs');
  });
});

describe('pre-commit 훅', () => {
  const hook = join(ROOT, 'scripts', 'githooks', 'pre-commit');

  it('파일이 존재한다', () => {
    expect(existsSync(hook)).toBe(true);
  });

  it('실행 권한이 있다', () => {
    // 권한이 없으면 git 이 조용히 무시한다 — 훅이 있는데 안 도는 최악의 상태다.
    // eslint-disable-next-line no-bitwise
    expect((statSync(hook).mode & 0o111) !== 0, 'chmod +x 가 안 돼 있다').toBe(true);
  });

  it('스탬프 경로가 gate.mjs 와 같은 이름을 쓴다', () => {
    // 값 미러링 지점이다. 셸 스크립트라 import 로 없앨 수 없으니 정합을 검사한다.
    const src = readFileSync(hook, 'utf8');
    expect(src).toContain('.gate-stamp');
    expect(readFileSync(join(ROOT, 'scripts', 'gate.mjs'), 'utf8')).toContain('.gate-stamp');
  });

  it('.gate-stamp 가 .gitignore 대상이다', () => {
    // 커밋되면 다른 세션·다른 사람의 스탬프가 섞여 검사가 무의미해진다.
    const ignore = readFileSync(join(ROOT, '.gitignore'), 'utf8');
    expect(ignore).toMatch(/^\/?\.gate-stamp$/m);
  });

  it('SessionStart 훅이 hooksPath 를 설정한다', () => {
    // 세션마다 새 컨테이너다. 수동 설치를 기대하면 훅은 영원히 안 돈다.
    const settings = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));
    type HookEntry = { command?: string };
    const cmds: string[] = (settings.hooks?.SessionStart ?? [])
      .flatMap((g: { hooks?: HookEntry[] }) => g.hooks ?? [])
      .map((h: HookEntry) => h.command ?? '');
    expect(cmds.some((c: string) => c.includes('core.hooksPath')), 'SessionStart 에 hooksPath 설정이 없다').toBe(true);
    expect(cmds.some((c: string) => c.includes('scripts/githooks')), 'hooksPath 가 scripts/githooks 를 가리키지 않는다').toBe(true);
  });
});
