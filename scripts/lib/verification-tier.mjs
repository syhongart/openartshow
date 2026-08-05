// 검증 등급 판정 — **등급표와 판정 규칙의 SSOT**(팀장 조건 6).
//
// 문서는 여기를 가리키기만 한다. 등급표를 문서에 다시 적으면 그것이 값 미러링이고,
// 이 저장소가 색·수치·임계값에서 세 번 겪은 사고가 그것이다.
//
// ── 왜 등급이 필요한가 (감독 지시) ─────────────────────────────────────────
// *"간단한 테스트도 검증을 너무 많이 하는 거 아닐까?"*
//
// 실측: world2 밤하늘 수정(behind-flag 4파일)에 게이트 6종 + 독립 스모크 16종 +
// 뮤테이션 4건 + 오퍼스 검수관 — 검증·대기 **9시간 초과**. 절차가 위험에 비례하지
// 않고 **균일하게** 걸려 있었다.
//
// ── 등급이 줄이는 것과 줄이지 않는 것 (실측 2026-08-05) ────────────────────
// **CI 스모크는 등급과 무관하게 항상 돈다.** `deploy.yml` 의 `verify` 가
// `ci.yml` 전체를 부르고(`uses:`), 그 안에 `smoke` job 이 있다. 재사용 워크플로는 모든
// job 이 성공해야 성공하므로 `deploy: needs: verify` 가 스모크까지 기다린다.
//
//   실측 run 30968482664 — verify job 은 02:09:29 에 끝났는데 deploy 는 그때 안 떴고,
//   smoke job 종료(02:14:15) **2초 뒤**인 02:14:17 에 시작했다.
//
// 그래서 등급이 줄이는 것은 **배포 전 로컬 executor 스모크와 검수관 왕복**이지,
// 자기완결·CSP 검사 자체가 아니다.
//
// ⚠ **단, 이 문장은 조건부다 — 처음에 무조건으로 적었고 그것이 반려됐다(2026-08-05).**
// CSP·외부요청 검사는 페이지 로드 기반이고 `scripts/smoke/config.mjs` 의 `LIVE_PAGES` 를
// 순회한다. **거기 없는 진입점은 CI 스모크도 열지 않는다.** 당시 `visit.html`·`lab-glb.html`
// 이 3등급인데 `LIVE_PAGES` 에 없었다 — 검수관·배포 전 스모크·CI 스모크 **세 겹 모두**
// 그 페이지를 안 보는 상태였다. 팀장 조건 3 이 정확히 그 경우를 막으라고 쓰인 것이다.
//
// 내 문장이 참으로 보였던 이유는 구조가 아니라 **우연**이었다: world2 가 behind-flag 인데도
// `LIVE_PAGES` 에 예외로 들어 있어서다. **예외를 일반 규칙으로 승격해 적었다** — 이 저장소가
// "못 잰 것이 통과로 적히는 경향" 이라 부르는 형태 그대로다.
//
// 지금은 두 페이지를 `LIVE_PAGES` 에 편입해 **조건을 참으로 만들었고**, 그 상태를
// `tests/verification-tier.test.ts` 의 G1 검사가 지킨다(flagged 진입점이 `LIVE_PAGES` 에서
// 빠지면 FAIL). 조건 3 은 **그 게이트가 있는 동안만** 충족된다 — 게이트를 지우면 같이 죽는다.
//
// ── IP 축은 여기 없다 (팀장 조건 3 의 한계) ────────────────────────────────
// 조건 3 은 IP 축도 면제 불가로 적었는데, **IP 검사는 저장소에 존재하지 않는다**
// (`CLAUDE.md`·`ARCHITECTURE.md §6`·`OPERATING-PRINCIPLES.md §6` 의 문서 규율뿐이고
// `scripts/`·`tests/` 에 판정 코드 0건 — 2026-08-05 실측). 없는 검사를 "면제 불가" 로
// 규정하는 것은 성립하지 않으므로, IP 는 **등급 체계 밖의 법무 게이트**로 둔다.
// 새 에셋·텍스트·네이밍이 들어오면 등급과 무관하게 §6 법무 게이트다.
//
// **팀장 판정(2026-08-05): 이 제안으로 조건 3 을 닫는다 — 단 조건 하나가 붙었다.**
// *"경고문으로 끝나면 '문서에만 있고 게이트가 아니면 반복된다' 에 걸린다."* 그래서 IP
// 게이트 신설을 **태스크 #198** 로 등록했다(설계 자체가 팀장 상신 대상). 등록 없이 경고문만
// 남으면 #140 이 비어 있는 구속력과 같은 장식이 된다는 것이 판정 이유다.
//
// 조건 3 의 목적("등급 도입이 기존 검증을 약화시키지 않을 것")은 성립한다 — IP 자동 검사는
// 도입 **전에도** 0건이었으므로 등급 체계가 약화시킨 것이 없고, CLI 상시 경고는 오히려
// 가시성을 더한다.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { LIVE_ENTRIES, FLAGGED_ENTRIES, srcPath } from './entrypoints.mjs';

const REPO = resolve(import.meta.dirname, '..', '..');
const FRONTEND = join(REPO, 'frontend');

/**
 * 등급 정의. **번호가 작을수록 무겁다.**
 *
 * `smoke` — 배포 **전** 독립 executor 가 `smoke:vite` 를 돌리는가(§10-3).
 *           `false` 여도 CI 스모크는 돈다(파일 머리 참조).
 * `reviewer` — 검수관 교차리뷰를 부르는가.
 */
export const TIERS = {
  1: {
    name: '1등급(전체)',
    gate: true,
    smoke: true,
    reviewer: true,
    why: '라이브 런타임 또는 판정 불가 — 기본값이다',
  },
  2: {
    name: '2등급(문서)',
    gate: true,
    smoke: false,
    reviewer: false,
    why: '배포되지만 실행 코드가 아니다',
  },
  3: {
    name: '3등급(behind-flag)',
    gate: true,
    smoke: false,
    reviewer: false,
    why: 'behind-flag 진입점에서만 도달한다 — 면제가 아니라 **검수 이연**이다',
  },
};

/**
 * **무조건 1등급인 경로.** 도달성 판정보다 우선한다.
 *
 * 여기 있는 것들은 "라이브에서 실행되는가" 와 무관하게 무거운 이유가 있다 —
 * 게이트 자신이거나(자기 자신을 느슨하게 만들 수 있다), 되돌리기가 비싸거나,
 * 검수관 자신에 관한 것이다.
 */
export const ALWAYS_TIER1 = [
  '.github/workflows/',        // 배포 파이프라인 (§10-4 검수관 무조건 트리거)
  'scripts/smoke/',            // 게이트 자신 (§10-4)
  'scripts/lib/verification-tier.mjs', // **판정기 자신** (팀장 조건 2)
  'scripts/lib/entrypoints.mjs',       // 판정의 입력 — 여기가 틀리면 전부 틀린다
  'scripts/gate.mjs',          // 게이트 러너
  'vite.config.js',            // 배포 조립 레시피
  '.claude/agents/release-reviewer.md', // 검수관 자신 (팀장 판정 소관)
  // ── 아래 셋은 **검수관 반려(2026-08-05)로 들어왔다** ────────────────────────
  // `tests/` — 처음에 3등급으로 뒀는데, **테스트 약화는 CI 가 구조적으로 못 잡는다**
  // (느슨해진 테스트는 초록으로 통과한다). 이 저장소에 실물 사고가 있고(위임 시 산술
  // 단언이 전부 null 기대로 바뀐 채 CI 통과) **그것을 잡은 유일한 축이 검수관**이었다.
  // 게다가 자기모순이었다: `tests/verification-tier.test.ts` 가 *"판정기 자신이 1등급"*
  // 을 단언하는데 그 파일 자신은 3등급이었다 — 자물쇠를 잠그고 열쇠를 옆에 둔 꼴이다.
  'tests/',
  // 게이트 훅 설치 지점. SessionStart 가 `core.hooksPath` 를 걸어 `.gate-stamp` 대조
  // pre-commit 을 설치한다 — 이 파일을 비우면 게이트 미실행 커밋을 막는 구조가 사라진다.
  '.claude/settings.json',
  // 위임 프롬프트 SSOT. *"테스트를 느슨하게 만들지 마라"* 조항이 여기 있고, 그 조항의
  // **부재가 실제 사고를 냈다**(검수관 반려 → 재작업).
  'docs/DELEGATION.md',
  // 라이브 런타임 보호 4파일 — `CLAUDE.md` 가 "함부로 수정하지 않는다" 로 못 박은 것
  'frontend/js/main.js',
  'frontend/js/player.js',
  'frontend/js/artworks.js',
  'frontend/js/config.js',
];

/**
 * 배포되지 않는(따라서 방문자에게 닿지 않는) 경로.
 *
 * `docs/` 는 **원본**이다 — 생성기가 `devlog/`·`making/` HTML 을 만들어 배포하지만,
 * 그 생성기(`scripts/build-*.mjs`)는 여기 없으므로 판정 불가로 1등급에 남는다.
 * 문서를 고치는 것과 생성기를 고치는 것은 다른 위험이고, 그 구분이 여기서 난다.
 */
// `tests/` 는 여기 없다 — `ALWAYS_TIER1` 이 먼저 걸어 1등급으로 보낸다(검수관 반려 B2).
// 남겨 두면 **죽은 항목**이고, `ALWAYS_TIER1` 에서 빠지는 날 조용히 2등급으로 떨어지는
// 함정이 된다(권고 R-b).
const NOT_DEPLOYED = ['docs/', '.claude/', 'devlog/img/'];

/** 저장소 루트의 규율 문서. 배포물에 안 실린다 */
const ROOT_DOCS = /^[^/]+\.md$/;

/** 실행 코드로 취급하는 확장자. 이외는 그래프로 추적하지 않는다 */
const CODE_EXT = ['.ts', '.js', '.mjs'];

/**
 * HTML 에서 참조하는 스크립트 경로를 뽑는다.
 *
 * ⚠ **정규식이다.** 정확히 하려면 HTML 파서가 필요하다.
 *
 * ⚠⚠ **틀리는 방향이 안전하지 않다 — 이 주석은 원래 그렇다고 적고 있었고 틀렸다**
 * (검수관 권고 R-a, 2026-08-05). *"못 찾으면 1등급(기본값)으로 남는다"* 는 **그 파일이
 * 어느 그래프에도 없을 때만** 참이다. **라이브 쪽 파싱이 누락됐는데 그 파일이 flagged
 * 그래프에는 잡히면 3등급으로 떨어진다** — 아래 `tierOf` 가 `live` 를 먼저 보고 없으면
 * `flagged` 로 가기 때문이다. 실측(2026-08-05): 두 그래프의 **교집합이 29 파일**이다.
 * 그래서 인라인 module 파싱 누락(B3)이 블로커였다.
 *
 * 진짜 fail-closed 인 것은 **`liveDynamic` 가드**다 — 라이브 그래프가 끊긴 것이 *보이면*
 * 3등급 판정 자체를 막는다. 안 보이는 누락은 그 가드도 못 켠다.
 */
function scriptsOf(htmlPath) {
  if (!existsSync(htmlPath)) return { files: [], dynamic: false };
  const html = readFileSync(htmlPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  let dynamic = false;
  const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const src = m[1];
    if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) continue; // 외부는 그래프 밖
    const abs = src.startsWith('/') ? join(FRONTEND, src.slice(1)) : resolve(dirname(htmlPath), src);
    const real = realFile(abs);
    if (real) out.push(real);
  }

  // ── 인라인 `<script type="module">` — **여기가 사각이었다** (검수관 반려 B3) ──────
  //
  // `src` 속성만 보면 **HTML 안에서 import 로 진입하는 페이지가 통째로 그래프 밖**이 된다.
  // 실측(2026-08-05): `builder.html:542`·`landing.html:1322,1394`·`visit.html:110` 이 그렇고,
  // 그 결과 `frontend/js/builder.js`·`builder-walk.js`·`auth-modal.js`·`ytembed.ts` 4개가
  // **라이브인데 라이브 그래프에 없었다.**
  //
  // 당시 오판정은 0건이었다 — 넷 다 어느 그래프에도 없어 fail-closed 로 1등급에 남았기
  // 때문이다. 그러나 안전했던 이유가 **구조가 아니라 우연**이었다: 그 파일이 flagged
  // 그래프에 잡히는 순간(world2 가 빌더 모듈을 쓰기 시작하면) 3등급으로 떨어진다.
  // 더 나쁜 것은 `liveDynamic` fail-closed 가드도 안 켜진다는 점이다 — 가드는 라이브
  // 그래프 **안에서 발견된** 파일의 동적 import 만 수집하는데, 서브그래프가 통째로 밖이면
  // 수집될 기회가 없다. 팀장 조건 2 의 안전망이 진입점 8개 중 2개에서 뚫려 있었다.
  const inlineRe = /<script\b(?![^>]*\bsrc\s*=)[^>]*\btype\s*=\s*["']module["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = inlineRe.exec(html)) !== null) {
    const { specs, dynamic: dyn } = specsFromSource(m[1]);
    if (dyn) dynamic = true;
    for (const s of specs) {
      const real = resolveSpec(htmlPath, s);
      if (real) out.push(real);
    }
  }
  return { files: out, dynamic };
}

/**
 * 한 모듈이 import 하는 것들. **정적 import 만** 본다.
 *
 * ⚠ **동적 `import(...)` 는 일부러 따라가지 않는다.** 대신 그것이 있는 파일을
 * `dynamic` 으로 표시해 호출자가 fail-closed 판정에 쓴다 — 변수·문자열 조립 경로는
 * 정적으로 해석할 수 없고, "해석 못 한 것을 도달 안 함으로 치는 것" 이 정확히 팀장
 * 조건 2 가 막으라는 형태다.
 */
function importsOf(file) {
  return specsFromSource(readFileSync(file, 'utf8'));
}

/**
 * JS 소스 문자열에서 import 지정자를 뽑는다.
 *
 * **파일이 아니라 문자열을 받는 이유**: HTML 안의 인라인 `&lt;script type="module"&gt;` 에도
 * 같은 규칙을 적용해야 하기 때문이다. 그것을 안 읽어서 라이브 파일 4개
 * (`builder.js`·`builder-walk.js`·`auth-modal.js`·`ytembed.ts`)가 라이브 그래프 밖에
 * 있었다 — 검수관 반려 B3(2026-08-05).
 */
function specsFromSource(raw) {
  const src = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const specs = [];
  let dynamic = false;
  const staticRe = /(?:^|[\s;}])(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']/g;
  let m;
  while ((m = staticRe.exec(src)) !== null) specs.push(m[1]);
  const bareRe = /(?:^|[\s;}])import\s*["']([^"']+)["']/g;
  while ((m = bareRe.exec(src)) !== null) specs.push(m[1]);
  const dynRe = /\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g;
  while ((m = dynRe.exec(src)) !== null) specs.push(m[2]);
  // 리터럴이 아닌 동적 import — 여기서 그래프가 끊긴다는 사실 자체를 신호로 남긴다.
  if (/\bimport\s*\(\s*[^"')\s]/.test(src)) dynamic = true;
  return { specs, dynamic };
}

/**
 * 절대 경로 후보 → 실재하는 파일.
 *
 * **`.js` 로 쓰고 실재는 `.ts` 인 규약**을 따라간다 — `vite.config.js` 의 `tsJsFallback`
 * 플러그인이 빌드에서 하는 일과 같다. 이걸 빼면 `world2.html` 이 참조하는
 * `./js/world2-boot.js`(실재는 `.ts`)에서 그래프가 끊겨 **behind-flag 그래프가 통째로
 * 비고, 3등급이 한 번도 안 나온다**(실측으로 그렇게 됐다).
 */
function realFile(abs) {
  const cands = [abs, abs.replace(/\.js$/, '.ts'), `${abs}.ts`, `${abs}.js`, join(abs, 'index.ts'), join(abs, 'index.js')];
  return cands.find((c) => existsSync(c) && !c.endsWith('/')) ?? null;
}

/** 모듈 지정자 → 실재 파일 절대경로. bare specifier(three 등)는 `null` */
function resolveSpec(fromFile, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  const abs = spec.startsWith('/') ? join(FRONTEND, spec.slice(1)) : resolve(dirname(fromFile), spec);
  return realFile(abs);
}

/**
 * 진입점 집합에서 도달 가능한 파일(저장소 상대 경로) 집합.
 * `dynamicHits` 에는 동적 import 를 가진 파일이 담긴다 — 그래프가 끊긴 자리다.
 */
export function reachableFrom(entries) {
  const seen = new Set();
  const dynamicHits = new Set();
  const queue = [];
  for (const e of entries) {
    // 접두사는 `srcPath` 가 붙인다 — 여기서 `join(FRONTEND, e.src)` 로 다시 적으면
    // 같은 규약이 두 곳에 있게 되고, 그 미러링이 실제로 vite 쪽을 깨뜨렸다(2026-08-05).
    const html = join(REPO, srcPath(e));
    const rel = relative(REPO, html);
    seen.add(rel);
    // 인라인 module 안의 **비리터럴** 동적 import 도 그래프가 끊기는 자리다 — HTML 을
    // `dynamicHits` 에 넣어야 fail-closed 가드가 그 진입점에 대해서도 켜진다(B3).
    const { files, dynamic } = scriptsOf(html);
    if (dynamic) dynamicHits.add(rel);
    queue.push(...files);
  }
  while (queue.length) {
    const file = queue.pop();
    if (!file || !existsSync(file)) continue;
    const rel = relative(REPO, file);
    if (seen.has(rel)) continue;
    seen.add(rel);
    if (!CODE_EXT.some((x) => file.endsWith(x))) continue;
    const { specs, dynamic } = importsOf(file);
    if (dynamic) dynamicHits.add(rel);
    for (const s of specs) {
      const r = resolveSpec(file, s);
      if (r) queue.push(r);
    }
  }
  return { seen, dynamicHits };
}

/**
 * 파일 하나의 등급과 그 근거.
 *
 * **기본값이 1등급이다.** 등급이 내려가려면 명시적으로 판정돼야 한다 — 그것이
 * fail-closed 이고, 새 종류의 파일이 생겼을 때 조용히 면제되지 않는 유일한 방법이다.
 */
export function tierOf(file, ctx) {
  if (ALWAYS_TIER1.some((p) => file === p || file.startsWith(p))) {
    return { tier: 1, why: `무조건 1등급 경로(${file})` };
  }
  if (ctx.live.has(file)) return { tier: 1, why: '라이브 그래프에서 도달 — 라이브 런타임' };

  if (ctx.flagged.has(file)) {
    // ⚠ **라이브 그래프가 끊겨 있으면 3등급으로 내리지 않는다.** 라이브 쪽에 리터럴이
    // 아닌 동적 import 가 있으면 그 너머는 정적으로 못 본다 — 지금 flagged 로만 보이는
    // 파일이 실은 라이브에서도 쓰일 수 있다. "안 보였다" 를 "없다" 로 읽지 않는 것이
    // 팀장 조건 2 다.
    if (ctx.liveDynamic.size > 0) {
      return {
        tier: 1,
        why: `라이브 그래프가 동적 import 로 끊겨 있다(${[...ctx.liveDynamic][0]} 외 ${ctx.liveDynamic.size - 1}건) — 도달 판정 불가`,
      };
    }
    return { tier: 3, why: 'behind-flag 진입점에서만 도달 — 검수 이연' };
  }
  if (NOT_DEPLOYED.some((p) => file.startsWith(p))) {
    // `tests/` 는 위 `ALWAYS_TIER1` 에서 이미 걸린다 — 여기에 3등급 분기를 두면
    // 그것이 곧 죽은 코드이자 함정이다(목록에서 빠지는 날 조용히 3등급이 된다).
    return { tier: 2, why: `배포되지 않는 경로(${file})` };
  }
  if (ROOT_DOCS.test(file)) return { tier: 2, why: '루트 규율 문서 — 배포물에 안 실린다' };
  // 여기까지 왔다는 것은 **어느 그래프에도 안 잡혔다**는 뜻이다. 도달 못 함이 아니라
  // 판정 못 함으로 읽는다(HTML·CSS·이미지·생성기·새 종류 전부 여기로 온다).
  return { tier: 1, why: '판정 불가 — fail-closed 기본값' };
}

/** `git diff --name-only` 로 변경 파일을 얻는다. 실패하면 던진다(조용히 빈 목록 금지) */
export function changedFiles(base) {
  const out = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
    cwd: REPO, encoding: 'utf8',
  });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

/** 변경 파일 목록 → 최종 등급 + 파일별 근거 */
export function judge(files) {
  const liveR = reachableFrom(LIVE_ENTRIES);
  const flagR = reachableFrom(FLAGGED_ENTRIES);
  const ctx = {
    live: liveR.seen,
    liveDynamic: liveR.dynamicHits,
    flagged: flagR.seen,
  };
  const rows = files.map((f) => ({ file: f, ...tierOf(f, ctx) }));
  const tier = rows.length ? Math.min(...rows.map((r) => r.tier)) : 1;
  return { tier, rows, ctx };
}
