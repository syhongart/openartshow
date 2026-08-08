// hookify 규칙이 **실제로 막는가.**
//
// ── 왜 규칙에 테스트가 필요한가 ─────────────────────────────────────────────
// `.claude/hookify.*.local.md` 는 마크다운이라 아무 검사도 안 받는다. 정규식 한 글자가
// 깨지면 **보호가 조용히 사라지고 아무도 모른다** — 이 저장소가 "장식" 이라 부르는 상태다.
// 실제로 첫 판본의 `curl --fail` 규칙은 `-sf` 처럼 묶어 쓴 플래그를 못 알아보고 오탐했다.
// 넣자마자 돌려보지 않았으면 계속 잘못 울렸을 것이고, 늑대소년이 된 경고는 곧 무시된다.
//
// 여기서 검사하는 것은 **훅 스크립트의 종료코드**다(0=허용 · 2=차단). 규칙 파일과 훅을
// 함께 지나므로, 둘 중 어느 쪽이 깨져도 잡힌다.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const HOOK = 'scripts/hooks/guard-bash.mjs';

/** 훅을 실제로 돌린다 — 정규식을 테스트가 다시 적지 않는다(값 미러링 금지) */
function guard(command: string): { code: number; err: string } {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  return { code: r.status ?? -1, err: r.stderr ?? '' };
}

describe('hookify 규칙 — 차단해야 하는 것', () => {
  // 각 케이스는 **실제로 낸 사고**에서 왔다. 규칙 파일 본문에 그 경위가 적혀 있다.
  const BLOCK: Array<[string, string]> = [
    ['게이트 우회', 'git commit --no-verify -m x'],
    ['강제 푸시', 'git push --force origin main'],
    ['손으로 짠 대기 루프', 'until [ "$(curl -s x)" = done ]; do sleep 5; done'],
    ['워킹트리를 옛 판본으로', 'git checkout db0b70c -- frontend/js/a.ts'],
  ];
  for (const [name, cmd] of BLOCK) {
    it(`${name} — exit 2 로 막는다`, () => {
      const { code, err } = guard(cmd);
      expect(code, `막지 못했다: ${cmd}`).toBe(2);
      // 왜 막혔는지 사람이 읽을 수 있어야 한다 — 이유 없는 차단은 우회를 부른다.
      expect(err.length).toBeGreaterThan(40);
    });
  }
});

describe('hookify 규칙 — 통과시켜야 하는 것 (오탐 방지)', () => {
  const PASS: string[] = [
    'npm run gate',
    'git push --force-with-lease origin main', // 남의 커밋을 안 덮는다 — 허용이 규약
    'curl -sf https://x/y | python3 -c "print(1)"', // 묶은 플래그도 --fail 로 친다
    'git checkout -b claude/새-브랜치', // 브랜치 생성은 되돌리기가 아니다
    // 히어독 **본문**은 셸이 데이터로 넘기는 것이지 실행하지 않는다. 이 훅을 넣은
    // 커밋의 메시지가 규칙을 설명하다가 자기 자신에게 막혔다(실측) — 태스크 #141 과
    // 같은 형태이고, 여기서는 구조로 막았다.
    `git commit -F - <<'EOF'\n설명: --no-verify 는 금지다\nEOF`,
  ];
  for (const cmd of PASS) {
    it(`통과: ${cmd.slice(0, 42)}`, () => {
      expect(guard(cmd).code, `잘못 막았다: ${cmd}`).toBe(0);
    });
  }
});

describe('hookify 규칙 파일 자체의 정합', () => {
  const DIR = '.claude';
  const files = existsSync(DIR)
    ? readdirSync(DIR).filter((f) => f.startsWith('hookify.') && f.endsWith('.local.md'))
    : [];

  it('규칙 파일이 실재한다 — 0건이면 보호가 통째로 없는 것이다', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const f of files) {
    it(`${f} — 프런트매터가 파싱되고 정규식이 유효하다`, () => {
      const text = readFileSync(path.join(DIR, f), 'utf8');
      const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
      expect(m, '프런트매터 구분자를 못 찾았다').not.toBeNull();
      const meta = Object.fromEntries(
        m![1].split('\n').map((l) => /^([A-Za-z_]+):\s*(.*)$/.exec(l.trim()))
          .filter(Boolean).map((kv) => [kv![1], kv![2].trim()]),
      );
      expect(meta.pattern, 'pattern 이 없다').toBeTruthy();
      expect(() => new RegExp(meta.pattern), '정규식이 깨졌다').not.toThrow();
      expect(['warn', 'block']).toContain(meta.action);
      // 본문이 비면 차단 이유를 모른다 — 이유 없는 규칙은 우회당한다.
      expect(m![2].trim().length, '본문(왜 막는가)이 비어 있다').toBeGreaterThan(60);
    });
  }
});
