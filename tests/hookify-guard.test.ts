// hookify 규칙이 **실제로 막는가.**
//
// ── 왜 규칙에 테스트가 필요한가 ─────────────────────────────────────────────
// `.claude/hookify.*.local.md` 는 마크다운이라 아무 검사도 안 받는다. 정규식 한 글자가
// 깨지면 **보호가 조용히 사라지고 아무도 모른다** — 이 저장소가 "장식" 이라 부르는 상태다.
//
// ── 첫 판본은 그 주장을 스스로 어겼다 (검수관 반려 B1·B4, 2026-08-08) ───────
// 이 파일의 첫 판본은 *"훅을 실제로 돌려 차단/통과를 못 박는다"* 고 적었고, 그 문장이
// **거짓이었다.** 검수관이 뮤테이션으로 실측했다:
//
//   · M5  force-push 규칙에서 `-f` 대안 제거      → 0 failed (사각)
//   · M6  curl 규칙을 첫 판본 오탐형으로 되돌림   → 0 failed
//   · M8  curl 규칙 **파일을 통째로 삭제**        → 0 failed
//
// 원인은 둘이었다. ① BLOCK 목록이 규칙당 한 형태만 봐서 `git push -f` 같은 변종을
// 안 지났다(그 사이 실제 정규식은 `git push -f origin main` 을 **통과시키고** 있었다).
// ② `action: warn` 규칙은 종료코드를 안 바꾸는데 테스트가 **종료코드만** 봤다 —
// warn 축은 검출력이 구조적으로 0이었다.
//
// 그래서 이 판본은 세 가지를 더 본다:
//   · stderr 접두(`차단`/`주의`)  → warn 규칙도 회귀가 드러난다
//   · 규칙 파일별 BLOCK 케이스 수 → 새 규칙을 케이스 없이 못 들인다
//   · cwd 를 바꿔 재실행         → 위치에 따라 보호가 사라지지 않는다

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HOOK = path.resolve('scripts/hooks/guard-bash.mjs');
const DIR = '.claude';

interface Verdict {
  code: number;
  err: string;
  /** 차단됐는가 — 종료코드와 stderr 접두가 **함께** 맞아야 한다 */
  blocked: boolean;
  /** 막지는 않았지만 경고가 났는가. `action: warn` 축은 이것으로만 보인다 */
  warned: boolean;
  /** 발화한 규칙 파일들 — 어느 규칙이 걸렸는지까지 본다 */
  files: string[];
}

/** 훅을 실제로 돌린다 — 정규식을 테스트가 다시 적지 않는다(값 미러링 금지) */
function guard(command: string, cwd = process.cwd()): Verdict {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
    cwd,
  });
  const err = r.stderr ?? '';
  return {
    code: r.status ?? -1,
    err,
    blocked: (r.status ?? -1) === 2 && err.startsWith('차단'),
    warned: (r.status ?? -1) === 0 && err.startsWith('주의'),
    files: [...err.matchAll(/\((hookify\.[^)]+\.local\.md)\)/g)].map((m) => m[1]),
  };
}

// ── 차단 ────────────────────────────────────────────────────────────────────
// 각 케이스는 **실제로 낸 사고**이거나 **검수관이 실측한 사각**에서 왔다.
// `[규칙파일, 명령]` — 어느 규칙이 잡아야 하는지까지 단언한다. 규칙 A 의 구멍을
// 규칙 B 가 우연히 덮고 있는 상태를 통과로 적지 않기 위해서다.
const BLOCK: Array<[rule: string, name: string, cmd: string]> = [
  ['hookify.no-verify.local.md', '게이트 우회', 'git commit --no-verify -m x'],
  ['hookify.no-verify.local.md', '게이트 우회(단축 -n)', 'git commit -n -m x'],
  ['hookify.no-verify.local.md', '게이트 우회(-n 뒤에)', 'git commit -m x -n'],
  // ↓ 검수관 B1 이 실측한 사각 3형태. 첫 판본은 앞의 둘을 **통과시켰다**.
  ['hookify.force-push.local.md', '강제 푸시(-f 선두)', 'git push -f origin main'],
  ['hookify.force-push.local.md', '강제 푸시(묶음 끝에 f)', 'git push -uf origin main'],
  ['hookify.force-push.local.md', '강제 푸시(-f 후미)', 'git push origin main -f'],
  ['hookify.force-push.local.md', '강제 푸시(긴 플래그)', 'git push --force origin main'],
  // ↓ 그 고침이 **또 한쪽만 열었다**(검수관 NB1). `f` 가 묶음의 마지막일 때만 잡아서
  //   `-fu`·`-fq` 가 통과했다 — 둘 다 git 이 실제로 받는 유효 명령이다.
  //   G-H1(규칙당 2케이스)은 수만 강제하고 **변종은 못 강제한다**. 그 한계대로 뚫렸다.
  ['hookify.force-push.local.md', '강제 푸시(묶음 앞에 f)', 'git push -fu origin main'],
  ['hookify.force-push.local.md', '강제 푸시(묶음 가운데 f)', 'git push -vfq origin main'],
  ['hookify.hand-wait-loop.local.md', '손으로 짠 대기 루프', 'until [ "$(curl -sf x)" = done ]; do sleep 5; done'],
  ['hookify.hand-wait-loop.local.md', '손으로 짠 대기 루프(sleep)', 'until grep -q ok /tmp/log; do sleep 10; done'],
  ['hookify.checkout-revert.local.md', '워킹트리를 옛 판본으로', 'git checkout db0b70c -- frontend/js/a.ts'],
  ['hookify.checkout-revert.local.md', '워킹트리를 옛 판본으로(짧은 sha)', 'git checkout 1a71c8e -- scripts/x.mjs'],
];

describe('hookify 규칙 — 차단해야 하는 것', () => {
  for (const [rule, name, cmd] of BLOCK) {
    it(`${name} — exit 2 로 막고, 잡은 규칙이 ${rule} 이다`, () => {
      const v = guard(cmd);
      expect(v.blocked, `막지 못했다(exit ${v.code}): ${cmd}`).toBe(true);
      // 어느 규칙이 잡았는지까지 본다 — 옆 규칙이 우연히 덮는 것은 그 규칙의 검출력이 아니다.
      expect(v.files, `다른 규칙이 잡았다: ${v.files.join(',')}`).toContain(rule);
      // 왜 막혔는지 사람이 읽을 수 있어야 한다 — 이유 없는 차단은 우회를 부른다.
      expect(v.err.length).toBeGreaterThan(40);
      // 오탐일 때 할 일이 적혀 있어야 한다. 첫 판본에는 탈출로가 문서 어디에도 없었고
      // (grep 0건), 그 상태에서 규칙이 검수관의 리뷰 명령을 두 번 막았다(반려 B2).
      //
      // **안내문 고유 문자열로 좁힌다** (검수관 권고 R1). `enabled: false` 로 보면 일부
      // 규칙은 **본문에도** 그 글자가 있어서, 훅이 안내를 통째로 잃어도 통과했다 —
      // 뮤테이션 실측으로 11케이스 중 4건만 깨졌다. 이 문자열은 훅만 만든다.
      expect(v.err, '탈출로 안내가 없다').toMatch(/임시 해제/);
    });
  }
});

// ── 통과 ────────────────────────────────────────────────────────────────────
describe('hookify 규칙 — 통과시켜야 하는 것 (오탐 방지)', () => {
  const PASS: string[] = [
    'npm run gate',
    'git push --force-with-lease origin main', // 남의 커밋을 안 덮는다 — 허용이 규약
    'git push -u origin claude/my-branch', // `-u` 에는 f 가 없다
    'git checkout -b claude/새-브랜치', // 브랜치 생성은 되돌리기가 아니다
    // ↓ 검수관 B2 가 실측한 오탐 2건. **이 두 명령이 실제로 리뷰를 멈춰 세웠다.**
    'grep -n commit CLAUDE.md',
    'git log -n 3 | grep commit',
    // 히어독 **본문**은 셸이 데이터로 넘기는 것이지 실행하지 않는다. 이 훅을 넣은
    // 커밋의 메시지가 규칙을 설명하다가 자기 자신에게 막혔다(실측) — 태스크 #141 과
    // 같은 형태이고, 여기서는 구조로 막았다.
    `git commit -F - <<'EOF'\n설명: --no-verify 는 금지다\nEOF`,
  ];
  for (const cmd of PASS) {
    it(`통과: ${cmd.slice(0, 42)}`, () => {
      const v = guard(cmd);
      expect(v.code, `잘못 막았다(${v.files.join(',')}): ${cmd}`).toBe(0);
      expect(v.blocked).toBe(false);
    });
  }
});

// ── warn 축 (G-H2) ──────────────────────────────────────────────────────────
// `action: warn` 은 종료코드를 안 바꾼다. 그래서 **종료코드만 보는 테스트에게 warn 규칙은
// 존재하지 않는 것과 같다** — 첫 판본에서 curl 규칙은 파일째 삭제해도 초록이었다(M8).
// 여기서는 stderr 접두를 판정에 넣어 그 축을 되살린다.
describe('hookify 규칙 — 경고(warn)도 회귀가 드러나야 한다', () => {
  it('--fail 없는 curl 파이프는 경고가 난다 (막지는 않는다)', () => {
    const v = guard('curl -s https://x/y | python3 -c "print(1)"');
    expect(v.warned, `경고가 안 났다(exit ${v.code}, stderr=${v.err.slice(0, 80)})`).toBe(true);
    expect(v.files).toContain('hookify.curl-fail.local.md');
  });

  it('묶은 플래그 -sf 는 --fail 로 친다 — 경고가 나면 안 된다', () => {
    // 첫 판본의 오탐이 정확히 여기였다. 늑대소년이 된 경고는 곧 무시된다.
    const v = guard('curl -sf https://x/y | python3 -c "print(1)"');
    expect(v.warned, `오탐: ${v.err.slice(0, 120)}`).toBe(false);
    expect(v.code).toBe(0);
  });

  it('--fail 을 길게 쓴 것도 경고가 나면 안 된다', () => {
    expect(guard('curl --fail -s https://x/y | jq .state').warned).toBe(false);
  });
});

// ── 위치 독립 (G-H4) ────────────────────────────────────────────────────────
// 첫 판본은 `join(process.cwd(), '.claude')` 였다. 하위 디렉터리에서 작업하면 규칙을
// 못 찾고 **exit 0 · stderr 빈 채로** 통과했다 — 보호가 통째로, 조용히 사라진다(반려 B3).
describe('hookify 규칙 — cwd 가 어디든 같게 막는다', () => {
  const SUB = ['frontend', 'scripts', 'tests'].filter((d) => existsSync(d));

  for (const d of SUB) {
    it(`cwd=${d} 에서도 차단된다`, () => {
      const v = guard('git commit --no-verify -m x', path.resolve(d));
      expect(v.blocked, `${d} 에서 보호가 사라졌다(exit ${v.code})`).toBe(true);
    });
  }

  it('저장소 밖(cwd=임시 디렉터리)에서도 차단된다', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'guard-cwd-'));
    try {
      expect(guard('git push --force origin main', tmp).blocked).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ── 규칙 파일 자체 ──────────────────────────────────────────────────────────
describe('hookify 규칙 파일 자체의 정합', () => {
  const files = existsSync(DIR)
    ? readdirSync(DIR).filter((f) => f.startsWith('hookify.') && f.endsWith('.local.md'))
    : [];

  it('규칙 파일이 실재한다 — 0건이면 보호가 통째로 없는 것이다', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  const meta = (f: string) => {
    const text = readFileSync(path.join(DIR, f), 'utf8');
    const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
    expect(m, `${f}: 프런트매터 구분자를 못 찾았다`).not.toBeNull();
    const kv = Object.fromEntries(
      m![1].split('\n').map((l) => /^([A-Za-z_]+):\s*(.*)$/.exec(l.trim()))
        .filter(Boolean).map((p) => [p![1], p![2].trim()]),
    );
    return { kv, body: m![2].trim() };
  };

  for (const f of files) {
    it(`${f} — 프런트매터가 파싱되고 정규식이 유효하다`, () => {
      const { kv, body } = meta(f);
      expect(kv.pattern, 'pattern 이 없다').toBeTruthy();
      expect(() => new RegExp(kv.pattern), '정규식이 깨졌다').not.toThrow();
      expect(['warn', 'block']).toContain(kv.action);
      // 본문이 비면 차단 이유를 모른다 — 이유 없는 규칙은 우회당한다.
      expect(body.length, '본문(왜 막는가)이 비어 있다').toBeGreaterThan(60);
    });
  }

  // ── G-H1: 규칙당 최소 케이스 수 ───────────────────────────────────────────
  // 검수관 M5 가 드러낸 것 — force-push 규칙은 BLOCK 케이스가 **한 형태**뿐이었고,
  // 그 한 형태만 지나는 정규식이 나머지 변종을 전부 통과시켰다. 규칙 하나에 형태
  // 둘 이상을 요구하면 "한 케이스에 맞춘 정규식" 이 초록으로 남을 수 없다.
  //
  // **이 게이트가 못 하는 것**: 어떤 변종을 고를지는 사람이 정한다. `-uf` 를
  // 안 떠올리면 게이트도 못 떠올린다. 수를 강제할 뿐 상상력을 강제하지는 못한다.
  it('block 규칙마다 차단 케이스가 2개 이상이다', () => {
    const blockRules = files.filter((f) => meta(f).kv.action === 'block');
    const counted = new Map<string, number>();
    for (const [rule] of BLOCK) counted.set(rule, (counted.get(rule) ?? 0) + 1);
    const thin = blockRules.filter((f) => (counted.get(f) ?? 0) < 2);
    expect(thin, `차단 케이스가 2개 미만인 규칙: ${thin.join(', ')}`).toEqual([]);
  });

  // ── G-H3: 규칙을 못 읽었으면 그 사실을 말한다 ─────────────────────────────
  // "규칙에 안 걸렸다" 와 "규칙이 아예 없었다" 는 다른 일이다. 뭉개면 보호가 사라진 것을
  // 아무도 모른다 — 규율 *"못 잰 것은 통과가 아니다"* 의 훅 판본이다.
  it('규칙 디렉터리를 못 읽으면 stderr 에 사유가 남는다', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'guard-norules-'));
    try {
      // 훅 사본만 두고 `.claude` 는 두지 않는다 → 규칙 0건 상황을 만든다.
      const solo = path.join(tmp, 'scripts', 'hooks');
      spawnSync('mkdir', ['-p', solo]);
      spawnSync('cp', [HOOK, path.join(solo, 'guard-bash.mjs')]);
      const r = spawnSync('node', [path.join(solo, 'guard-bash.mjs')], {
        input: JSON.stringify({ tool_input: { command: 'git commit --no-verify -m x' } }),
        encoding: 'utf8',
        cwd: tmp,
      });
      // 막지는 못한다(규칙이 없으니). 그러나 **침묵하면 안 된다.**
      expect(r.stderr ?? '', '규칙이 0건인데 아무 말도 안 했다').toMatch(/guard/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
