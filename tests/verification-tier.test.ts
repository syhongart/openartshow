// 검증 등급 판정기 — **검출력이 있는가**가 이 파일의 전부다.
//
// 팀장 조건 1: *"검출력은 뮤테이션으로 확인한다 — behind-flag 파일이 공유 모듈을
// import 하는 케이스를 일부러 만들어 1등급 승격이 실제로 일어나는지 본다. 안 깨지면
// 장식이다."*
//
// 등급을 내리는 판정기는 **틀리는 방향이 위험하다** — 1등급이어야 할 것을 3등급으로
// 내리면 검증이 조용히 빠진다. 그래서 여기서 재는 것은 "판정이 맞는가" 가 아니라
// **"내려가면 안 되는 것이 안 내려가는가"** 다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  ENTRYPOINTS, LIVE_ENTRIES, FLAGGED_ENTRIES, viteInput, htmlRename,
} from '../scripts/lib/entrypoints.mjs';
import {
  TIERS, ALWAYS_TIER1, tierOf, judge, reachableFrom,
} from '../scripts/lib/verification-tier.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('진입점 SSOT', () => {
  it('vite 가 목록을 다시 적지 않고 여기서 유도한다', () => {
    // 이 검사가 없으면 두 목록이 갈리고, 실제로 `builder.html` 이 라이브가 된 뒤에도
    // `vite.config.js` 주석만 `// behind-flag` 로 남아 있던 사고가 그것이었다.
    const src = readFileSync(join(REPO, 'vite.config.js'), 'utf8');
    expect(src).toMatch(/from '\.\/scripts\/lib\/entrypoints\.mjs'/);
    expect(src).toMatch(/input: viteInput\(r\)/);
    expect(src).toMatch(/HTML_RENAME = entryRenameMap\(\)/);
    // 목록을 다시 적었으면 여기 걸린다 — input 객체 리터럴이 남아 있으면 안 된다.
    expect(src).not.toMatch(/input:\s*\{/);
  });

  it('노출 상태가 둘 중 하나로만 표시된다 — 빠뜨리면 판정이 조용히 틀린다', () => {
    for (const e of ENTRYPOINTS) {
      expect(['live', 'flagged']).toContain(e.exposure);
    }
    expect(LIVE_ENTRIES.length + FLAGGED_ENTRIES.length).toBe(ENTRYPOINTS.length);
  });

  it('behind-flag 세 페이지가 flagged 다', () => {
    // `CLAUDE.md` 가 산문으로 적어 둔 것과 코드가 어긋나면 여기서 잡힌다.
    const flagged = FLAGGED_ENTRIES.map((e) => e.src).sort();
    expect(flagged).toEqual(['lab-glb.html', 'visit.html', 'world2.html']);
  });

  it('`viteInput` 은 전부, `htmlRename` 은 재배치되는 것만 낸다', () => {
    const input = viteInput((p: string) => p);
    expect(Object.keys(input)).toHaveLength(ENTRYPOINTS.length);
    const map = htmlRename();
    // 항등 매핑(guide/about/design)은 들어가면 안 된다 — vite 가 맵에 없는 것은 그대로 둔다.
    for (const [from, to] of Object.entries(map)) expect(from).not.toBe(to);
    expect(map['landing.html']).toBe('index.html');
    expect(map['world2.html']).toBe('app/world2.html');
  });
});

// ── 판정 — 순수 함수. 인공 그래프로 규칙 자체를 시험한다 ────────────────────

/** `tierOf` 가 받는 그래프 문맥. 실제 파일과 무관하게 규칙만 재려는 것 */
function ctx(live: string[], flagged: string[], liveDynamic: string[] = []) {
  return {
    live: new Set(live),
    flagged: new Set(flagged),
    liveDynamic: new Set(liveDynamic),
  };
}

describe('등급 판정 — 내려가면 안 되는 것이 안 내려가는가', () => {
  it('**기본값이 1등급이다** — 이것이 fail-closed 의 전부다', () => {
    // 어느 그래프에도 없고 알려진 경로도 아닌 것. HTML·CSS·이미지·새 종류가 전부 여기다.
    const r = tierOf('frontend/some-new-thing.css', ctx([], []));
    expect(r.tier).toBe(1);
    expect(r.why).toMatch(/판정 불가/);
  });

  it('무조건 1등급 경로가 도달성보다 우선한다', () => {
    // 이것들은 라이브에서 실행되지 않아도 무겁다 — 게이트 자신이거나 되돌리기가 비싸다.
    for (const p of ALWAYS_TIER1) {
      // flagged 그래프에만 있다고 우겨도 1등급이어야 한다.
      expect(tierOf(p, ctx([], [p])).tier).toBe(1);
    }
  });

  it('판정기 자신이 1등급이다 — 스스로를 느슨하게 만들 수 없어야 한다', () => {
    expect(ALWAYS_TIER1).toContain('scripts/lib/verification-tier.mjs');
    expect(ALWAYS_TIER1).toContain('scripts/lib/entrypoints.mjs');
  });

  it('라이브 그래프에 있으면 1등급 — flagged 에도 있어도 그렇다', () => {
    const f = 'frontend/js/sky.js';
    expect(tierOf(f, ctx([f], [f])).tier).toBe(1);
  });

  it('flagged 에만 있으면 3등급', () => {
    const f = 'frontend/js/world2/decide/night.ts';
    const r = tierOf(f, ctx([], [f]));
    expect(r.tier).toBe(3);
    expect(r.why).toMatch(/검수 이연/);
  });

  it('**라이브 그래프가 동적 import 로 끊겨 있으면 3등급이 안 나온다**', () => {
    // 팀장 조건 2 의 핵심. 리터럴이 아닌 `import(x)` 너머는 정적으로 못 본다 —
    // 지금 flagged 로만 보이는 파일이 실은 라이브에서도 쓰일 수 있다.
    // "안 보였다" 를 "없다" 로 읽지 않는다.
    const f = 'frontend/js/world2/decide/night.ts';
    const r = tierOf(f, ctx([], [f], ['frontend/js/loader.js']));
    expect(r.tier).toBe(1);
    expect(r.why).toMatch(/동적 import/);
  });

  it('배포 안 되는 경로 — tests 는 3, 문서는 2', () => {
    expect(tierOf('tests/foo.test.ts', ctx([], [])).tier).toBe(3);
    expect(tierOf('docs/BOARD.md', ctx([], [])).tier).toBe(2);
    expect(tierOf('CLAUDE.md', ctx([], [])).tier).toBe(2);
  });

  it('생성기는 문서가 아니라 1등급이다 — 배포물을 만든다', () => {
    // `docs/` 를 고치는 것과 그 문서를 HTML 로 굽는 코드를 고치는 것은 다른 위험이다.
    expect(tierOf('scripts/build-devlog.mjs', ctx([], [])).tier).toBe(1);
  });

  it('최종 등급은 가장 무거운 파일이 정한다', () => {
    const c = ctx(['a.js'], ['b.ts']);
    const rows = [tierOf('b.ts', c), tierOf('a.js', c)];
    expect(Math.min(...rows.map((r) => r.tier))).toBe(1);
  });
});

// ── 실제 저장소 그래프 — 규칙이 아니라 **이 세계**에서 성립하는가 ──────────

describe('실제 그래프에서의 판정', () => {
  it('behind-flag 진입점이 실제로 그래프를 갖는다 — 비면 3등급이 한 번도 안 나온다', () => {
    // 실측 사고: `.js` 로 import 하고 실재는 `.ts` 인 규약을 안 따라가서 flagged
    // 그래프가 진입점 HTML 3개만 담고 끝났다. 그 상태에서는 판정기가 **장식**이다.
    const { seen } = reachableFrom(FLAGGED_ENTRIES);
    expect(seen.size).toBeGreaterThan(20);
    expect([...seen].some((f) => f.includes('world2/'))).toBe(true);
  });

  it('라이브 진입점 그래프도 비어 있지 않다', () => {
    const { seen } = reachableFrom(LIVE_ENTRIES);
    expect(seen.size).toBeGreaterThan(20);
  });

  it('**world2 전용 파일은 3등급, 공유 모듈은 1등급** (팀장 조건 1 의 검출력)', () => {
    // 이것이 "안 깨지면 장식이다" 라고 팀장이 못 박은 그 케이스다.
    // `sky.js` 는 world2 가 쓰지만 라이브 world1 도 쓴다 → 승격돼야 한다.
    const r = judge([
      'frontend/js/world2/decide/night.ts',
      'frontend/js/sky.js',
    ]);
    const byFile: Record<string, number> = Object.fromEntries(
      r.rows.map((x: { file: string; tier: number }) => [x.file, x.tier]),
    );
    expect(byFile['frontend/js/world2/decide/night.ts']).toBe(3);
    expect(byFile['frontend/js/sky.js']).toBe(1);
    expect(r.tier).toBe(1); // 최종은 무거운 쪽
  });

  it('world2 만 고치면 3등급이 실제로 나온다 — 안 나오면 등급 도입이 무의미하다', () => {
    const r = judge([
      'frontend/js/world2/decide/night.ts',
      'frontend/js/world2/systems/sky.ts',
    ]);
    expect(r.tier).toBe(3);
  });
});

describe('등급표', () => {
  it('세 등급 전부 게이트는 필수다 — 면제되는 것은 왕복이지 검사가 아니다', () => {
    for (const t of Object.values(TIERS)) expect(t.gate).toBe(true);
  });

  it('1등급만 스모크·검수관이 필수다', () => {
    expect(TIERS[1].smoke).toBe(true);
    expect(TIERS[1].reviewer).toBe(true);
    expect(TIERS[2].smoke).toBe(false);
    expect(TIERS[3].smoke).toBe(false);
  });

  it('**재량어가 없다** (팀장 조건 5) — 전부 boolean 이다', () => {
    // *"선택"·"필요시" 가 최종안에 남으면 그 부분은 반려* 라고 팀장이 적었다.
    for (const t of Object.values(TIERS)) {
      for (const k of ['gate', 'smoke', 'reviewer'] as const) {
        expect(typeof t[k]).toBe('boolean');
      }
      expect(t.why).not.toMatch(/선택|필요시/);
    }
  });
});
