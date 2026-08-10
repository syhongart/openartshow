// scripts/smoke/measure-click.mjs — G-CLICK: 「보이는데 눌러도 아무 일이 없는 버튼」.
//
// ── 왜 이 축이 따로 필요한가 (실사고 2026-08-10) ───────────────────────────
// 주 메뉴를 후보 B 로 통일하며 임시 노브를 걷었는데, 그 노브가 서브 페이지의
// **로그인·회원가입을 JS 로 만들고 리스너까지 걸고 있었다.** 마크업만 소스로 옮기면
// **버튼이 보이는데 눌러도 아무 일이 없는** 상태가 된다.
//
// **그 상태를 이 저장소의 어떤 게이트도 못 잡는다:**
//   · `browser-checks.mjs` 는 `m.type() === 'error'` 만 담는다. `subnav.js` 의 실패
//     경로는 `console.warn('[subnav] 로그인 모달을 열지 못했다')` 라 **조용히 통과**한다.
//   · `config.mjs` 의 `LIVE_PAGES` 에는 **클릭 상호작용이 0건**이다 — 페이지를 열어
//     보기만 한다.
//   · 색 스냅샷도 못 잡는다. **요소도 있고 색도 맞다.**
// 즉 동적 import 가 배포 번들에서 해소되지 않아도 **콘솔 에러 0 · CSP 통과 · 넘침 0**
// 으로 전부 초록이고, 방문자만 눌리지 않는 버튼을 본다.
//
// ── 판정축을 DOM 단언 하나로 좁힌 근거 (팀장 판정 2026-08-10) ──────────────
// 검수관이 `console.warn` **전면 캡처를 실측으로 기각**했다: `LIVE_PAGES` 13개 중
// **5개가 로드만으로 100% 재현되는 native warn** 을 낸다(swiftshader GL 메시지 3건 ·
// `Failed to create WebGPU Context Provider` 4건 — 저장소 grep 0건, 브라우저가 낸다).
// 화이트리스트를 두면 **그 화이트리스트가 다음 구멍**이다.
//
// 접두사 매칭(`[subnav]`) 보조축도 **팀장이 기각**했다 — 뮤테이션 2형태가 **warn 없이
// DOM 단언만으로 검출됨이 확인**됐으므로 보조축은 검출력을 더하지 않으면서 관리 대상
// (접두사 규약)만 늘린다. 저장소 `console.warn` 74건 중 절반가량은 접두사가 없고
// "폴백으로 정상 동작 지속" 성격이다.
//
// > **여기서 멈춘다 — 재론 조건**: DOM 단언이 **못 잡은 실사고가 실제로 나면** 그때
// > 보조축을 다시 논한다. 경계도 판정이다.
//
// ── 검출력 — 뮤테이션 실측 (executor, `/tmp` 클론) ─────────────────────────
// **이 게이트가 실제로 잡는 것**(빌드 통과 + 클릭 검사 도달 + 4/4 NG):
//   · **M1** `subnav.js` 의 `wireSubnavAuth(...)` 호출 제거 — 리스너가 안 걸린다
//   · **M2b** `about/guide.html` 에서 `<script src="./js/subnav.js">` 제거 —
//     **실사고 형태 그대로**(마크업은 남고 배선만 사라진다)
//
// ⚠ **`import()` 해소 실패는 이 게이트에 도달하지 않는다 — vite 가 먼저 죽인다.**
// 실측 2건: 경로 오타(`./auth-modal-NOPE.js`) · export 이름 불일치 둘 다
// **빌드 단계에서 FAIL** 했고 `[G-CLICK]` 줄이 한 번도 안 나왔다. **좋은 소식이지만
// 이 게이트의 검출력이 아니다** — 종료코드만 보면 구별되지 않으므로, 뮤테이션을
// 인정할 때는 **`[G-CLICK]` 줄이 실제로 나왔는지**를 함께 봐야 한다(직전 회차가
// 그 구분을 안 해서 무효가 됐다).
//
// ── 이 검사가 못 잡는 것 ───────────────────────────────────────────────────
//  · 아래 목록에 없는 새 클릭형 UI(구조적 한계 — `LIVE_PAGES` 와 같다)
//  · z-index 은폐 등 "존재하고 보이지만 실제로는 못 누르는" 회귀
//  · 실기기 터치 · 실제 OAuth 공급자 통신(목업 모드만 본다)
//  · 모달이 열린 **뒤**의 동작(공급자 선택·프로필 전환) — 여는 것까지만 본다
//  · **`import()` 런타임 실패**(위 참조 — 빌드가 먼저 잡으므로 여기 안 온다)
//
// ⚠ **거짓 FAIL 위험 — 셀렉터 결합도**(뮤테이션 M2c 실측). 오버레이 클래스명을
// `oas-auth-overlay-x` 로 바꾸자 **모달은 실제로 떴는데** 게이트가 못 알아보고 4/4 NG
// 를 냈다. 즉 **마크업 리팩터링이 이 게이트를 거짓으로 세운다.** 클래스명을 바꾸는
// 사람은 여기도 함께 고쳐야 한다 — 그것을 알려주는 것이 이 주석의 역할이다.
// 역할 기반 셀렉터(`[role="dialog"]` 등)로 낮출 수 있으나 지금 모달에 그 속성이
// 없고, **속성을 새로 다는 것은 이 게이트의 범위를 넘는다**(라이브 마크업 변경).

import { chromium } from 'playwright';

import { assembleSiteVite } from './assemble.mjs';
import { BASE_PATH, CHROMIUM_ARGS, CHROMIUM_EXECUTABLE, SITE_DIR } from './config.mjs';
import { startServer } from './server.mjs';

/**
 * 클릭 대상. **배포 URL 기준**이고 `LIVE_PAGES` 와 같은 규약이다.
 *
 * ⚠ **`_site` 조립본에서만 판정한다** — baseline 직서빙과 배포 번들은 **동적 import
 * 해소 여부가 다르다.** 이번 실사고 자체가 그 차이에서 났다(소스 테스트는 전부
 * 통과하고 라이브에서만 죽는 형태).
 */
const TARGETS = [
  { name: 'about',  url: '/about.html' },
  { name: 'guide',  url: '/guide.html' },
];

/** 데스크톱·모바일 양쪽을 본다 — 감독은 모바일로 보신다. */
const WIDTHS = [1280, 390];

const BUTTON = '.topnav button[data-auth-mode="login"]';
const OVERLAY = 'div.oas-auth-overlay';

/**
 * 로그인 버튼을 **실제로 눌러** 모달이 뜨는지 본다.
 *
 * 가시성은 `checkVisibility({opacityProperty, visibilityProperty})` 로 판정한다 —
 * `getBoundingClientRect` + 자기 `opacity` 로 재면 **닫힌 오버레이를 열린 것으로
 * 오판한다**(`display:block; opacity:0` 인 조상 아래에서 자식 rect 는 살아 있고 자식
 * 자신의 opacity 는 1 이다. 디자이너가 실제로 그 함정에 빠졌다).
 */
export async function runClick({ browser, origin, basePath, log = console.log }) {
  const rows = [];
  const errors = [];

  for (const t of TARGETS) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`${t.name}@${width}: ${m.text()}`); });
      page.on('pageerror', (e) => errors.push(`${t.name}@${width}: ${e.message}`));

      const label = `${t.name}@${width}`;
      try {
        await page.goto(`${origin}${basePath}${t.url.replace(/^\//, '')}`, {
          waitUntil: 'networkidle', timeout: 30000,
        });

        const btn = await page.$(BUTTON);
        if (!btn) {
          rows.push({ label, ok: false, why: '로그인 버튼을 못 찾았다' });
          await context.close();
          continue;
        }

        const before = await page.$$eval(OVERLAY, (els) => els.length).catch(() => 0);
        await btn.click();

        // 모달은 동적 import 뒤에 뜬다 — 명시적으로 기다린다(고정 대기는 플레이크다).
        let visible = false;
        try {
          await page.waitForSelector(OVERLAY, { state: 'attached', timeout: 8000 });
          visible = await page.$eval(OVERLAY, (el) =>
            el.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
        } catch {
          visible = false;
        }

        const after = await page.$$eval(OVERLAY, (els) => els.length).catch(() => 0);
        rows.push({
          label, ok: visible,
          why: visible ? `오버레이 ${before}→${after} 보임` : `오버레이 ${before}→${after} 안 보임`,
        });
      } catch (e) {
        rows.push({ label, ok: false, why: `측정 실패: ${(e.message || String(e)).slice(0, 80)}` });
      }
      await context.close();
    }
  }

  const failed = rows.filter((r) => !r.ok);
  const pass = failed.length === 0 && rows.length === TARGETS.length * WIDTHS.length;
  if (log !== null) log(`[G-CLICK] ${rows.map((r) => `${r.label}=${r.ok ? 'ok' : 'NG'}`).join(' · ')}`);
  return {
    pass,
    rows,
    errors,
    summary: pass
      ? `${rows.length}조합 전부 모달 열림`
      : `${failed.length}/${rows.length} 실패 — ${failed.map((r) => `${r.label}(${r.why})`).join(', ')}`,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  await assembleSiteVite();
  // 둘째 인자가 **`BASE_PATH` strip** 이다 — 안 넘기면 `/openartshow/about.html` 을
  // 그대로 파일 경로로 찾아 404 가 된다. 형제 측정기가 이것을 빠뜨려 "부팅 실패" 로
  // 두 회차를 날린 전례가 있다(`measure-collide.mjs` 주석).
  const server = await startServer(SITE_DIR, BASE_PATH);
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE,
    args: CHROMIUM_ARGS,
  });
  try {
    const r = await runClick({ browser, origin: server.origin, basePath: BASE_PATH });
    if (!r.pass) console.error(`\nFAIL — ${r.summary}`);
    if (r.errors.length) console.error(`콘솔 에러 ${r.errors.length}건:\n  ${r.errors.join('\n  ')}`);
    process.exitCode = r.pass ? 0 : 1;
  } finally {
    await browser.close();
    await server.close();
  }
}
