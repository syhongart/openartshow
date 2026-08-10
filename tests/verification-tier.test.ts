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
import { existsSync, readFileSync } from 'node:fs';
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

  it('behind-flag 여섯 페이지가 flagged 다', () => {
    // `CLAUDE.md` 가 산문으로 적어 둔 것과 코드가 어긋나면 여기서 잡힌다.
    //
    // 목록을 여기 **적어 두는 것**이 이 검사의 요점이다. `FLAGGED_ENTRIES.length` 만
    // 세거나 `exposure` 값의 유효성만 보면, 새 페이지를 flagged 로 넣는 순간 아무도
    // 모르게 통과한다 — 그러면 `CLAUDE.md` 의 산문이 낡는다. 실제로 `builder.html` 이
    // 라이브가 된 뒤에도 세 곳의 주석이 `behind-flag` 로 남아 있었고, 그 사이 라이브
    // 페이지가 회귀 검사에서 빠져 있었다.
    //
    // 그러니 이 배열을 고칠 때는 **`CLAUDE.md` 의 behind-flag 문장도 같이 고친다.**
    // 여기만 고치면 검사는 초록이 되고 산문은 계속 틀린 채로 남는다.
    //
    // 2026-08-08 `mypage.html` 은 여기 있다가 **라이브로 승격**돼 빠졌다(감독 지시 —
    // 랜딩 프로필 메뉴가 링크한다). 승격하는 순간 이 배열과 아래 GS-3 이 함께 빨간불이
    // 됐다 — 그것이 이 두 검사의 존재 이유이고, 설계대로 동작한 실물 사례다.
    //
    // 2026-08-08 `world3.html` 추가 — world2 의 포크(포근마을). 감독 지시로 착수했고
    // 라이브 노출은 감독·팀장 게이트다.
    //
    // 2026-08-08 `world5.html` 추가 — world2 의 두 번째 포크(갤러리 스트리트).
    // **`world4` 는 결번**이다(감독이 "월드5" 로 명시, 팀장 유지 판정). 결번 자체는
    // GS-4 의 `/^world\d+$/` 판정과 무관하다 — 경위는 `entrypoints.mjs` 의 그 줄.
    //
    // 2026-08-09 `editor.html` 추가 — three.js editor 반입(배치 도구). ⚠ **성격이
    // 다르다**: 앞의 다섯은 "채택 판정 전인 실험" 이지만 이것은 감독 지시(*"에디터는
    // 개발용으로만 쓸거니"*)로 **방문자에게 제공할 계획이 없는 도구**다. 즉 `flagged`
    // 가 종착지일 수 있고, 여기서 빠지는 것이 목표가 아니다.
    const flagged = FLAGGED_ENTRIES.map((e) => e.src).sort();
    expect(flagged).toEqual([
      'editor.html', 'lab-glb.html', 'visit.html', 'world2.html', 'world3.html', 'world5.html',
    ]);
  });

  // ── GS-3 (검수관 명세, 블로커 B2) ────────────────────────────────────────
  it('**`CLAUDE.md` 의 behind-flag 문장이 flagged 목록과 일치한다**', () => {
    // ── 왜 생겼나 (2026-08-08) ───────────────────────────────────────────
    // 바로 위 검사 옆에 내가 *"이 문장은 `CLAUDE.md` 와 짝이다 — 한쪽만 고치면 다른
    // 쪽이 빨간불이 된다"* 고 적었다. **거짓이었다.** 검수관이 산문에서 `mypage.html`
    // 만 지우고 게이트 전체를 돌려 **추가 실패 0** 을 실측했다. `CLAUDE.md` 를 읽는
    // 테스트는 `gate.test.ts` 의 보호파일 축 하나뿐이었고, 산문은 어느 코드와도
    // 묶여 있지 않았다.
    //
    // 게이트 유효성에 대한 거짓 진술은 **다음 사람이 확인을 생략하게** 만든다.
    // 이 저장소는 그 대가를 이미 치렀다 — *"`main` 은 unprotected 다"* 가 틀린 채
    // 남아 밸류에이션 봇이 7일 연속 거부당하는 동안 아무도 정책을 의심하지 않았다.
    //
    // 그래서 문장을 고치는 대신 **주장을 참으로 만든다.** 이제 진짜로 짝이다.
    const claudeMd = readFileSync(join(REPO, 'CLAUDE.md'), 'utf8');

    // **문장 범위를 좁힌다**(검수관이 지적한 거짓 FAIL 위험). 파일 전체에서
    // `toContain` 하면 다른 절에 우연히 같은 파일명이 있을 때 통과해 버린다.
    const line = claudeMd
      .split('\n')
      .find((l) => l.includes('**behind-flag**') && l.includes('어디에도 링크하지 않는 페이지는'));
    expect(line, 'CLAUDE.md 에서 behind-flag 문장을 찾지 못했다').toBeTruthy();

    // **목록 부분만 잘라낸다.** 그 줄은 뒤에 해설이 이어지고, 거기에는 라이브 파일명이
    // 일부러 들어 있다(`builder.html` 이 라이브가 된 경위). 줄 전체를 반대 방향으로
    // 검사하면 그 해설 때문에 거짓 FAIL 이 난다 — 실제로 처음 판본이 그렇게 깨졌다.
    const listPart = line!.split('이다(라이브 미노출)')[0];
    expect(listPart, '목록 부분을 잘라내지 못했다 — 문장 형식이 바뀌었다').not.toBe(line);

    for (const e of FLAGGED_ENTRIES) {
      expect(listPart, `${e.src} 가 CLAUDE.md behind-flag 목록에 없다`).toContain(e.src);
    }

    // 반대 방향도 본다 — 목록에만 남은 유령(라이브가 됐는데 안 지운 것).
    // `builder.html` 이 정확히 그 형태로 오래 남아 있었다.
    for (const e of ENTRYPOINTS.filter((x) => x.exposure === 'live')) {
      expect(listPart, `${e.src} 는 라이브인데 behind-flag 목록에 남아 있다`).not.toContain(e.src);
    }
  });

  it('**`viteInput` 이 내는 경로가 실제 파일을 가리킨다** — 개수만 세면 빌드가 죽는다', () => {
    // ⚠ 이 검사는 **사고 뒤에 생겼다**(2026-08-05). 바로 아래 검사가 원래는 키 개수만
    // 봤고, 그래서 `viteInput(r)` 에서 `frontend/` 접두사가 사라진 것을 **게이트 6종이
    // 전부 초록으로 통과시켰다.** 배포 전 독립 스모크가 잡았다:
    //     Could not resolve entry module "landing.html"
    // 개수는 규약이 틀려도 그대로다 — **개수와 유효성은 다른 축**이다.
    const input = viteInput((p: string) => join(REPO, p));
    for (const [key, abs] of Object.entries(input)) {
      expect(existsSync(abs as string), `${key} → ${abs}`).toBe(true);
    }
  });

  it('`viteInput` 은 전부, `htmlRename` 은 재배치되는 것만 낸다', () => {
    const input = viteInput((p: string) => p);
    expect(Object.keys(input)).toHaveLength(ENTRYPOINTS.length);
    const map = htmlRename();
    // 항등 매핑(guide/about)은 들어가면 안 된다 — vite 가 맵에 없는 것은 그대로 둔다.
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

  it('배포 안 되는 경로는 2등급 — **`tests/` 는 예외로 1등급이다**', () => {
    // ⚠ 옛 단언은 `tests/foo.test.ts` → 3등급이었다. **그 단언이 무효가 된 이유**:
    // 검수관 반려 B2(2026-08-05) — "배포되지 않는가" 와 "느슨해지면 누가 잡는가" 는 다른
    // 축이다. 테스트는 배포되지 않지만 **약화되면 CI 가 구조적으로 못 잡는다**(느슨한
    // 테스트는 초록으로 통과한다). 그래서 `ALWAYS_TIER1` 로 올라갔다.
    expect(tierOf('tests/foo.test.ts', ctx([], [])).tier).toBe(1);
    expect(tierOf('docs/BOARD.md', ctx([], [])).tier).toBe(2);
    expect(tierOf('CLAUDE.md', ctx([], [])).tier).toBe(2);
  });

  it('생성기는 문서가 아니라 1등급이다 — 배포물을 만든다', () => {
    // `docs/` 를 고치는 것과 그 문서를 HTML 로 굽는 코드를 고치는 것은 다른 위험이다.
    expect(tierOf('scripts/build-devlog.mjs', ctx([], [])).tier).toBe(1);
  });

  it('최종 등급은 가장 무거운 파일이 정한다 — **`judge()` 를 경유해서 잰다**', () => {
    // ⚠ 원래 이 검사는 `Math.min(...rows.map(...))` 을 **테스트 코드 안에서 직접 계산**했다.
    // 그러면 `judge()` 의 집계를 전혀 재지 않는다 — 검수관 권고 R4 가 "장식" 이라 부른 것이다.
    // 지금은 `judge()` 를 부르므로 거기서 `Math.min` 을 `Math.max` 로 바꾸면 이 검사가 깨진다.
    expect(judge(['docs/BOARD.md']).tier).toBe(2);
    expect(judge(['docs/BOARD.md', 'frontend/js/main.js']).tier).toBe(1);
  });
});

// ── 검수관 반려(2026-08-05) 로 들어온 검사들 ────────────────────────────────
//
// 넷 중 셋이 같은 형태였다: **판정기가 못 본 것을 면제해도 되는 것으로 읽었다.**
// 그래서 여기 검사들은 전부 "안 보이는 것이 조용히 빠지지 않는가" 를 잰다.

describe('G1 — 낮은 등급 진입점이 CI 스모크 대상인가 (블로커 1)', () => {
  it('**모든 behind-flag 진입점이 `LIVE_PAGES` 에 있다** — 없으면 검사가 세 겹 모두 0이 된다', async () => {
    // 실측 사고: `visit.html`·`lab-glb.html` 이 3등급인데 `LIVE_PAGES` 에 없었다. 3등급은
    // 검수관·배포 전 스모크를 면제하고, `LIVE_PAGES` 에 없으면 **CI 스모크도 그 페이지를
    // 열지 않는다** — CSP·외부요청 검사가 실제로 0이 된다. 팀장 조건 3 이 막으라는 것이 이것이다.
    //
    // 이 검사가 없으면 판정기 주석·`OPERATING-PRINCIPLES.md`·CLI 가 입을 모아
    // *"어느 등급에서도 면제되지 않는다"* 고 말하는데 실제로는 면제되는 상태가 성립한다.
    const { LIVE_PAGES } = await import('../scripts/smoke/config.mjs');
    const urls = new Set((LIVE_PAGES as { url: string }[]).map((p) => p.url));
    for (const e of FLAGGED_ENTRIES) {
      expect(urls.has(`/${e.out}`), `${e.src} → /${e.out} 이 LIVE_PAGES 에 없다`).toBe(true);
    }
  });
});

describe('B2 — 게이트 자신을 낮은 등급에 두지 않는다', () => {
  it('**`tests/` 가 1등급이다** — 테스트 약화는 CI 가 구조적으로 못 잡는다', () => {
    // 느슨해진 테스트는 초록으로 통과한다. 이 저장소에 실물 사고가 있고(산술 단언이 전부
    // null 기대로 바뀐 채 CI 통과) **그것을 잡은 유일한 축이 검수관**이었다.
    expect(judge(['tests/verification-tier.test.ts']).tier).toBe(1);
    expect(judge(['tests/world2-sky-system.test.ts']).tier).toBe(1);
  });

  it('게이트 훅 설치 지점과 위임 SSOT 도 1등급이다 (권고 R1·R2)', () => {
    // `.claude/settings.json` 은 `core.hooksPath` 를 걸어 `.gate-stamp` 대조 pre-commit 을
    // 설치한다 — 비우면 게이트 미실행 커밋을 막는 구조가 사라진다.
    expect(judge(['.claude/settings.json']).tier).toBe(1);
    expect(judge(['docs/DELEGATION.md']).tier).toBe(1);
  });
});

describe('B3 — 인라인 `<script type="module">` 도 그래프에 들어간다', () => {
  it('**인라인 module 로만 진입하는 라이브 파일이 라이브 그래프에 있다**', () => {
    // 실측 사고: `src` 속성만 읽어서 `builder.html:542`·`landing.html:1322` 의 인라인
    // module 진입이 통째로 빠졌고, 그 결과 아래 파일들이 **라이브인데 라이브 그래프 밖**
    // 이었다. 당시 오판정이 0건이었던 것은 fail-closed 덕분이지 구조 덕분이 아니다 —
    // 그 파일이 flagged 그래프에 잡히는 날 3등급이 된다.
    const { seen } = reachableFrom(LIVE_ENTRIES);
    for (const f of ['frontend/js/builder.js', 'frontend/js/auth-modal.js']) {
      expect(seen.has(f), `${f} 가 라이브 그래프에 없다`).toBe(true);
    }
  });

  it('그 파일들이 1등급으로 판정된다 — 이제 "판정 불가" 가 아니라 "라이브 도달" 이다', () => {
    const r = judge(['frontend/js/builder.js']);
    expect(r.tier).toBe(1);
    expect(r.rows[0].why).toMatch(/라이브 그래프에서 도달/);
  });

  // ── 정규식이 **어느 형태를 잡고 어느 형태를 놓치는지** 고정한다 (검수관 권고 R-d) ──
  //
  // 검수관이 11개 변형을 실측해 MISS 셋을 찾았다. 현재 트리에는 그 형태가 **0건**이지만
  // **테스트로 고정돼 있지 않았다** — 그러면 "지금 안 쓰니 괜찮다" 가 근거 없이 유지된다.
  // MISS 를 고치지 않고 **명시**하는 이유: 정규식으로 HTML 을 정확히 파싱할 수 없고,
  // 여기서 무리하면 오히려 오탐이 는다. 대신 **못 잡는 것을 적어 두고 그 형태가 트리에
  // 들어오는 순간 이 표가 근거가 되게** 한다.
  const INLINE_RE = /<script\b(?![^>]*\bsrc\s*=)[^>]*\btype\s*=\s*["']module["'][^>]*>([\s\S]*?)<\/script>/gi;

  /**
   * 느슨 파서 — 인라인 module 후보 개수. **아래 두 검사가 이것 하나를 부른다**(조건 C3).
   *
   * 여기가 갈리면 "감지기" 와 "감지기의 범위를 재는 검사" 가 서로 다른 것을 보게 되고,
   * 그때 후자는 전자를 재는 것이 아니라 **자기 사본을 재게 된다**(실증됨 — 위 주석).
   *
   * - `(?<![-\w])` — `data-src`·`foo_src` 를 `src` 로 오인하지 않는다(조건 C2).
   * - **`i` 플래그** — HTML 속성명은 대소문자 무구분이다. 없으면 `<script TYPE="MODULE"
   *   SRC="./a.js">` 같은 **정상 태그가 거짓 FAIL** 을 만든다(검수관 실측). 엄격 쪽
   *   `INLINE_RE` 는 `gi` 라 이미 대문자 `SRC` 를 제외하는데 느슨 쪽만 못 해서 어긋났다.
   */
  const looseInlineCount = (html: string): number => {
    const loose = /<script\b[^>]*\btype\s*=\s*["']?module["']?[^>]*>/gi;
    return (html.match(loose) ?? []).filter((t) => !/(?<![-\w])src\s*=/i.test(t)).length;
  };
  const CASES: [string, string, boolean][] = [
    ['표준', '<script type="module">import "./a.js";</script>', true],
    ['defer 선행', '<script defer type="module">import "./a.js";</script>', true],
    ['defer 후행', '<script type="module" defer>import "./a.js";</script>', true],
    ['등호 공백', '<script type = "module">import "./a.js";</script>', true],
    ['태그 내 개행', '<script\n  type="module">import "./a.js";</script>', true],
    ['대문자', '<SCRIPT TYPE="MODULE">import "./a.js";</SCRIPT>', true],
    ['홑따옴표', "<script type='module'>import './a.js';</script>", true],
    ['src 있음 — 잡으면 안 된다', '<script type="module" src="./a.js"></script>', false],
    // ↓ **못 잡는 것** — 현재 트리에 0건이고 고치지 않았다
    ['따옴표 없는 type=module', '<script type=module>import "./a.js";</script>', false],
    ['data-src 동반(`\\bsrc` 오탐)', '<script data-src="x" type="module">import "./a.js";</script>', false],
    ['속성값에 > 포함', '<script data-x="a>b" type="module">import "./a.js";</script>', false],
  ];

  it.each(CASES)('인라인 정규식 — %s', (_name, html, shouldMatch) => {
    INLINE_RE.lastIndex = 0;
    expect(INLINE_RE.test(html)).toBe(shouldMatch);
  });

  it('**못 잡는 형태가 실제 트리에 없다** — 있으면 그래프가 조용히 작아진다', () => {
    // 위 표의 MISS 형태가 라이브 HTML 에 들어오면 그 서브그래프가 통째로 빠진다.
    // 그때 이 검사가 FAIL 해서 "정규식을 고칠지, 그 HTML 을 고칠지" 를 판단하게 만든다.
    //
    // ⚠⚠ **첫 판본은 이 검사가 셋 중 하나만 잡았다**(검수관 조건 C2, 2026-08-05).
    // 느슨 쪽 필터가 `!/\bsrc\s*=/` 였는데 `\b` 가 `data-src` 의 `src` 에도 걸린다 —
    // **잡으려는 버그를 대조군에 그대로 복사한 것이다.** 검수관 실측: 같은 import 를
    // `<script data-src="x" type="module">` 로 주입하면 그 파일이 `tier 1`(라이브)에서
    // `tier 3`(검수 이연)으로 떨어지는데 **테스트 38건이 전부 초록이었다.**
    //
    // > **대조군이 대상과 같은 버그를 공유하면 그것은 대조군이 아니다.** 침입 감지·회귀
    // > 대조·뮤테이션 전부 같다. "느슨하게 다시 세어 본다" 를 만들 때는 **느슨한 쪽이
    // > 엄격한 쪽의 코드를 물려받지 않았는지** 먼저 본다. 여기서는 `\bsrc` 다섯 글자였다.
    //
    // **엄격 정규식(`INLINE_RE`)은 일부러 안 고친다** — 넓히면 `type="text/x-module"`
    // 같은 비모듈 태그까지 그래프에 들어와 판정이 오염된다. 넓히는 것은 **느슨한 쪽만**이다.
    //
    // ── 이 검사가 무엇의 집행 수단인가 (검수관 권고 R-g) ──────────────────────────
    // `scripts/lib/verification-tier.mjs` 의 `scriptsOf` 주석이 *"안 보이는 누락은
    // `liveDynamic` 가드도 못 켠다"* 고 적는다. **그 문장을 지키는 것이 이 검사다** —
    // 가드는 라이브 그래프 **안에서 발견된** 파일의 동적 import 만 모으므로, 인라인
    // 파싱이 통째로 누락되면 그 페이지의 비리터럴 `import(x)` 도 안 잡히고 가드가
    // 켜지지 않는다. 즉 **누락을 사후에 알아챌 축이 여기밖에 없다.**
    for (const e of [...LIVE_ENTRIES, ...FLAGGED_ENTRIES]) {
      const html = readFileSync(join(REPO, 'frontend', e.src), 'utf8')
        .replace(/<!--[\s\S]*?-->/g, '');
      const loose = looseInlineCount(html);
      INLINE_RE.lastIndex = 0;
      const strict = (html.match(INLINE_RE) ?? []).length;
      expect(strict, `${e.src}: 느슨 ${loose} vs 엄격 ${strict}`).toBe(loose);
    }
  });

  it('침입 감지가 **어느 형태를 잡고 어느 형태를 못 잡는지** — 대조군 자체를 잰다', () => {
    // 위 검사가 실제로 무엇을 감지하는지 여기서 고정한다. 이것이 없으면 "그 형태가
    // 들어오면 FAIL 한다" 가 **검사가 닿지 않는 범위까지 말하는 문장**이 된다.
    //
    // ⚠⚠ **이 검사는 `looseInlineCount` 를 위 검사와 공유해야 한다**(검수관 조건 C3).
    // 첫 판본은 느슨 정규식과 필터를 **각자 복제**했다. 결함을 공유하진 않았지만
    // **코드를 복제했고 결과는 같았다** — 검수관 뮤테이션: 위 검사의 필터만 옛 결함
    // (`\bsrc`)으로 되돌려도 **39건 전부 초록**이었고, 그 상태에서 `data-src` 를 주입해도
    // 초록이었다. **C2 가 막은 오판정이 통째로 재개방됐는데 "범위를 잰다" 는 이 검사가
    // 조용했다.** 사본을 재고 있었기 때문이다.
    //
    // > **지난 회차 교훈의 일반형**: *"대조군이 대상과 같은 버그를 공유하면 대조군이
    // > 아니다"* → **"대조군이 대상의 코드를 복제해도 대조군이 아니다."** 사본은 처음엔
    // > 옳다. 옳은 채로 갈라지고, 갈라진 것을 아무도 못 본다.
    //
    // 그리고 **처방은 층을 더하는 쪽이 아니라 빼는 쪽이다** — "검사를 재는 검사를 재는
    // 검사" 로 가면 축이 틀린 것이다. 중복을 없애면 이 검사가 저절로 정당해진다.
    const detects = (html: string): boolean => {
      INLINE_RE.lastIndex = 0;
      return (html.match(INLINE_RE) ?? []).length !== looseInlineCount(html); // 불일치 = 감지
    };
    // 잡는다
    expect(detects('<script type=module>import "./a.js";</script>')).toBe(true);
    expect(detects('<script data-src="x" type="module">import "./a.js";</script>')).toBe(true);
    // ⛔ **못 잡는다 — 원리적으로 불가하다.** 느슨·엄격 둘 다 `[^>]*` 라 속성값 안의
    // `>` 를 못 넘는다. 정규식으로는 여기가 끝이고, 고치려면 HTML 파서가 필요하다.
    // 고치라는 것이 아니라 **그렇게 적어 두라는 것**이다(검수관 C2).
    expect(detects('<script data-x="a>b" type="module">import "./a.js";</script>')).toBe(false);
    // 정상 태그는 감지되면 안 된다(거짓 FAIL 방지)
    expect(detects('<script type="module">import "./a.js";</script>')).toBe(false);
    expect(detects('<script type="module" src="./a.js"></script>')).toBe(false);
    // **대문자 속성** — HTML 은 속성명 대소문자를 안 가린다. 느슨 쪽 필터에 `i` 가 없어
    // 무고한 태그가 FAIL 을 만들었다(검수관 실측, 현재 트리 0건이지만 유효한 입력이다).
    expect(detects('<script TYPE="MODULE" SRC="./a.js"></script>')).toBe(false);
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

// ── GS-4 (검수관 명세, 2026-08-08) ─────────────────────────────────────────
//
// **라이브 승격 시 성능 게이트 동반 강제.**
//
// ── 왜 생겼나 ───────────────────────────────────────────────────────────────
// world3(포근마을) 포크를 검수하면서 팀장 조건 5(*"[7][7.6][8] 상당 게이트를 world3
// 에도 건다"*)가 **이연**으로 판정됐다. 근거는 셋이었다: ① world3 는 behind-flag 라
// 라이브 진입점에서 도달 불가 ② 그 게이트들은 CI 에서 `SMOKE_PERF_GATES=observe` 라
// 성능 수치 판정이 종료코드에 영향이 없다 ③ 4코어·GPU 0 환경에서 브라우저 세션을
// 하나 더 늘리는 비용이 크다.
//
// **이연은 면제가 아니다.** 그런데 이연을 산문으로만 남기면 승격하는 날 조용히
// 잊힌다 — CLAUDE.md 가 *"관측은 면제가 아니라 데이터 수집이다. 승격 없이 남으면
// 그때부터 장식이다"* 라고 적은 바로 그 형태다. 그래서 **승격 자체를 조건으로 건다**:
// `flagged` → `live` 로 바꾸는 커밋은 이 검사를 함께 통과해야 한다.
//
// 실측 근거(2026-08-08): `measure-invariants.mjs`·`measure-sky-warm.mjs` 가
// `/app/world2.html` 을 URL 로 하드코딩하고 있어 world3 는 이 축을 전혀 안 받는다.
describe('GS-4 — 라이브 world 진입점은 성능 게이트가 실제로 연다', () => {
  const MEASURE = ['scripts/smoke/measure-invariants.mjs', 'scripts/smoke/measure-sky-warm.mjs'];

  it('측정 스크립트가 실재한다 — 없으면 아래 검사가 공허하다', () => {
    // 표본 검사. 파일이 사라지거나 이름이 바뀌면 `srcOf` 가 빈 문자열을 돌려주고,
    // 그러면 "포함하지 않는다" 가 거짓으로 통과할 수 있다.
    for (const p of MEASURE) expect(existsSync(join(REPO, p)), `${p} 없음`).toBe(true);
  });

  /**
   * 이 게이트의 대상 — **world2 커널 계열 진입점**(`world2`·`world3`·…).
   *
   * ⚠️ `key: 'world'`(라이브 오픈월드, world1)는 **뺀다.** 검수관 명세는 *"key 가
   * `world` 로 시작하는 항목마다"* 였는데, 그대로 넣었더니 즉시 FAIL 했다 — 실측이
   * 드러낸 것은 결함이 아니라 **범위 오류**다: `measure-invariants.mjs` 가 재는
   * 개수 불변식(파이프라인·지오·텍스처 상수성)은 world2 커널이 도입한 개념이고,
   * world1 은 그 구조를 갖고 있지 않다. world1 을 이 게이트에 넣는 것은 "없는 축을
   * 재라" 는 요구가 된다.
   *
   * 그래서 **숫자 접미**로 가른다. `world4` 가 생기면 자동으로 편입된다.
   */
  const isKernelWorld = (key: string) => /^world\d+$/.test(key);

  it('`live` 인 world 커널 진입점을 `[7][7.6]`·`[8]` 측정이 실제로 연다', () => {
    // ⚠️ **거짓 FAIL 위험**: 측정 스크립트가 URL 상수 대신 진입점 목록 순회로
    // 리팩터되면 이 문자열 매칭이 빗나가 정당한 코드를 FAIL 시킨다. 그때는 이 검사를
    // 함께 고치는 것이 정답이다 — 검사를 지우는 것이 아니라.
    //
    // ⚠️ **못 잡는 것**: 스크립트가 그 URL 을 **열기만** 하고 판정을 안 하는 경우.
    // 문자열의 존재는 "그 페이지를 잰다" 를 증명하지 않는다. 승격 때는 항목별
    // PASS 로그를 눈으로 확인하는 것이 함께 필요하다(검수관 선결 조건 (가)).
    const srcs = MEASURE.map((p) => ({ p, src: readFileSync(join(REPO, p), 'utf8') }));
    const missing: string[] = [];
    for (const e of LIVE_ENTRIES) {
      if (!isKernelWorld(e.key)) continue;
      for (const { p, src } of srcs) {
        if (!src.includes(e.out)) missing.push(`${e.key}(${e.out}) ← ${p}`);
      }
    }
    // 실패 메시지가 곧 처방이 된다: "이 진입점을 라이브로 올리려면 저 측정에 넣어라".
    expect(missing).toEqual([]);
  });

  it('**지금은 대상이 0 이다** — 그 사실 자체를 못 박는다', () => {
    // ⚠️ 위 검사는 현재 **빈 루프**다. 라이브 world 커널 진입점이 없기 때문이고,
    // 빈 루프는 언제나 통과한다 — 이 저장소가 빈 표본으로 통과한 전례가 여럿이라
    // 그냥 두면 "게이트가 있다" 는 착각만 남는다.
    //
    // 그래서 **0 이라는 사실을 단언한다.** 이 숫자가 늘어나는 순간(= 승격) 위
    // 검사가 실제로 돌기 시작하고, 그 전에 여기가 먼저 빨간불이 되어 승격하는
    // 사람에게 "성능 게이트를 함께 옮겨라" 를 알린다. **이연이 잊히지 않게 하는
    // 장치가 바로 이 줄이다.**
    expect(LIVE_ENTRIES.filter((e) => isKernelWorld(e.key)).map((e) => e.key)).toEqual([]);
  });

  it('대상 후보가 flagged 에 실재한다 — 목록이 비면 위 두 검사가 공허하다', () => {
    // world2·world3 가 flagged 에서 사라지면(삭제되거나 key 규칙이 바뀌면) 이
    // 게이트 전체가 아무것도 지키지 않게 된다. 후보의 존재를 함께 못 박는다.
    const flaggedKernels = FLAGGED_ENTRIES.filter((e) => isKernelWorld(e.key)).map((e) => e.key);
    expect(flaggedKernels).toContain('world2');
    expect(flaggedKernels).toContain('world3');
    // `world5` — 결번(`world4`)을 건너뛴 숫자도 정규식이 잡는지 함께 못 박는다.
    // 접두 매칭(`startsWith('world')`)이었다면 결번과 무관했겠지만, 숫자 접미로
    // 좁힌 뒤에는 "연속된 숫자만 잡히는 것 아닌가" 가 실제 의문이 된다.
    expect(flaggedKernels).toContain('world5');
  });
});
