// scripts/lib/site-shell.mjs
// devlog · team · valuation 세 생성기가 각자 들고 있던 셸(head+header+footer)과
// CSS 를 하나로 합친 SSOT. (팀장 조건 ① — "/making/ 서브 허브로 묶으며 셸 3중
// 미러링을 함께 해소한다".) 이 파일은 신설만 한다 — 세 생성기 자체의 배선(shell()
// 호출로 교체하는 작업)은 이 커밋 담당이 아니다.
//
// ── BASE_URL ────────────────────────────────────────────────────────────
// `scripts/site-url.mjs` 가 SSOT. 예전엔 build-team.mjs:11 / build-valuation.mjs:21
// 이 `https://syhongart.github.io/openartshow` 를 각자 하드코딩해 site-url.mjs 와
// 따로 놀았다 — 그 자체가 값 미러링이었다. 여기서는 반드시 import 로만 가져온다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL } from '../site-url.mjs';

// ── 색 SSOT ─────────────────────────────────────────────────────────────
// 원시 팔레트(`--oas-*`)는 `frontend/css/tokens.css` 한 곳에만 있다. 여기서는 그
// 파일을 **빌드 시점에 읽어** 셸 CSS 앞에 붙인다 — 값을 이 파일에 다시 적지 않는다.
//
// 왜 <link> 가 아니라 인라인인가 — 생성 페이지(/making/·/devlog/·/team/·/valuation/)는
// vite 를 타지 않는다. `assemble.mjs` 가 `cp -r making devlog team valuation` 으로
// 통째 복사하므로 vite 의 자산 경로 rewrite 가 안 걸리고, 깊이가 제각각이라
// 상대경로도 한 값으로 못 적는다. 셸은 원래부터 CSS 를 인라인하고 있었으니
// (`<style>${SHELL_CSS}…`) 같은 자리에 얹는 것이 배포 구조를 안 건드리는 길이다.
// 주석·공백을 털면 1.3KB 남짓이라 페이지당 부담도 작다.
const TOKENS_CSS = fs
  .readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'css', 'tokens.css'),
    'utf8',
  )
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const SITE = 'OpenArtShow'; // 세 파일이 각각 하드코딩하던 사이트명. 필수 export 목록엔 없지만
// shell() 내부에서 og:site_name·로고 텍스트에 쓰이므로 여기 한 곳에만 적어 넷째 미러링을 막는다.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── NAV — nav 항목의 SSOT ──────────────────────────────────────────────
// 예전엔 세 파일이 순서·항목이 제각각이었다(개발일지엔 5항목, valuation엔 가이드가
// 빠진 4항목). 새 구조에서는 개발일지·팀·밸류에이션이 모두 `/making/` 아래로
// 들어가므로 `kind:'making'` 으로 표시하고, 가이드·입장하기는 사이트 루트에 남으므로
// `kind:'root'` 로 표시한다. href는 shell() 이 depth 로 계산한다 — 각 생성기가
// 상대경로 문자열을 다시 조립하면 그게 다음 미러링이라 여기서 막는다.
export const NAV = [
  { label: '만드는 이야기', kind: 'making', slug: '' },
  { label: '개발일지', kind: 'making', slug: 'devlog/' },
  { label: '팀', kind: 'making', slug: 'team/' },
  { label: '밸류에이션', kind: 'making', slug: 'valuation/' },
  { label: '가이드', kind: 'root', slug: 'guide.html' },
  { label: '입장하기', kind: 'root', slug: 'app/' },
];

// ── 경로 계산 — depth 가 상대경로를 흡수한다 ───────────────────────────
// depth = 현재 페이지가 사이트 루트로부터 몇 단계 디렉터리 아래에 있는가.
//   /making/index.html                 → depth 1  (허브)
//   /making/devlog/index.html          → depth 2
//   /making/devlog/<slug>.html         → depth 2  (글 페이지도 devlog/ 안이라 동일)
//   /making/team/index.html            → depth 2
//   /making/valuation/index.html       → depth 2
// toRoot(depth)    = 사이트 루트까지 '../' × depth (가이드·입장하기·로고·폰트가 씀)
// toMaking(depth)  = '/making/' 까지의 상대경로. depth=1(허브 자신)이면 './'(자기 자신
//                    디렉터리), depth≥2 면 '../' × (depth-1) — 한 단계는 '<name>/'
//                    안에서 나가는 몫이므로 하나 뺀다.
function toRoot(depth) {
  return '../'.repeat(depth);
}
function toMaking(depth) {
  return depth <= 1 ? './' : '../'.repeat(depth - 1);
}
function navHref(item, depth) {
  return item.kind === 'root' ? `${toRoot(depth)}${item.slug}` : `${toMaking(depth)}${item.slug}`;
}

// ── SHELL_CSS — 세 CSS 의 공통분 ───────────────────────────────────────
// 대조 결과(scripts/build-devlog.mjs:124-181 · build-team.mjs:130-174 ·
// build-valuation.mjs:116-168):
//
// 1) :root 토큰 — devlog 에는 --g100·--g500 이 없고 team/valuation 에는 있다.
//    값 충돌은 없다(겹치는 토큰은 세 파일 모두 동일값). → 합집합을 취했다.
//    devlog 페이지에 --g100/--g500 이 추가되는 것 자체는 무해하다(선언만 되고
//    안 쓰이는 커스텀 프로퍼티 — 렌더 영향 없음).
//
// 2) body/a/.top·nav/.eyebrow/h1/footer — 세 파일이 문자 그대로 동일. 그대로 공통화.
//
// 3) body { line-height } — devlog 1.75, team/valuation 1.7. 처음엔 "다수결로 1.7 통일"
//    했으나 팀장 지적으로 철회했다 — devlog 는 141개 장문 글이 들어가는 유일한
//    페이지라 넓은 행간이 의도였을 수 있고, 다수결로 뒤집으면 리팩터링이 아니라
//    리디자인이 된다. `.wrap`/`.lead` 와 같은 방법으로 **`--lh` CSS 변수로 뺐다**
//    (기본값 devlog 원본인 1.75). team/valuation 배선 시 `:root{--lh:1.7}` 필요 —
//    이제 세 페이지 다 원본과 문자 그대로 같은 렌더가 된다(이 항목은 더 이상
//    "합쳐서 생기는 렌더 차이"가 아니다). 값을 실제로 통일하고 싶다면 그건 이
//    커밋이 아니라 별도 판단으로 한다.
//
// 4) .wrap { max-width } — 760(devlog) / 900(team) / 840(valuation), 페이지 성격상
//    실제로 달라야 하는 값이라 판단해 **CSS 변수로 뺐다**(요청서가 예시로 든 바로
//    그 케이스). SHELL_CSS 는 devlog 값(760px)을 기본값으로 둔다(§5 — shell()
//    시그니처가 devlog 것을 최대한 따르므로 devlog 가 아무 오버라이드 없이 동작해야
//    한다). team/valuation 을 배선하는 쪽은 각자의 `css`(고유분) 맨 앞에
//    `:root{--wrap-w:900px}` / `:root{--wrap-w:840px}` 를 추가해야 원래 폭이 보존된다
//    — 안 하면 900/840 대신 760px 로 좁아지는 실제 렌더 차이가 난다. 아래 보고서에도
//    동일하게 적는다.
//
// 5) .lead { margin-bottom } — 34px(devlog) / 30px(team) / 28px(valuation), 전부
//    다르다. 이것도 페이지 리듬의 일부로 보고 4)와 같은 방식으로 CSS 변수화했다
//    (`--lead-mb`, 기본값 devlog 의 34px). team/valuation 배선 시
//    `:root{--lead-mb:30px}` / `:root{--lead-mb:28px}` 필요 — 안 하면 다르게 보인다.
//
// 6) 모바일 미디어쿼리 — 셋 다 "`.top nav{gap:12px}`"는 공통이지만 브레이크포인트가
//    520(devlog)/640(team)/560(valuation) 로 **셋 다 다르다**. CSS 는 `@media` 조건에
//    커스텀 프로퍼티(var())를 못 쓰므로 4)/5) 처럼 변수로 못 뺀다 — 하나를 고를 수밖에
//    없다. 640px 를 택했다(team 원본과 동일 + 이 저장소에서 "모바일"의 관용 기준선이
//    640이다 — 디자이너 산출물 스모크 기준도 ≤640px). devlog(520→640)·
//    valuation(560→640) 은 nav gap 이 좁아지기 시작하는 폭이 넓어진다(더 넉넉한
//    범위에서 컴팩트해짐, 방향은 "더 일찍 모바일 레이아웃" 이라 퇴행이 아니라
//    수렴이지만 — 원본과 완전히 동일하진 않다). **이것이 이 파일에서 유일하게 남는
//    렌더 차이이자, 3)/4)/5) 와 성격이 다르다** — 저것들은 "없앨 수 있었는데 CSS
//    변수로 뺀 것"이고, 이건 **CSS 자체의 제약**(`@media` 조건에 `var()`를 못 씀)으로
//    **구조상 못 없앤 것**이다. 판단으로 감수한 게 아니라 감수할 수밖에 없었다.
//    `.grid`/`.lever`/`.hero-n .big` 같은 나머지 미디어쿼리 규칙은 페이지 고유분이므로
//    그대로 각 생성기의 `css` 에 남는다(브레이크포인트도 각자 걸로 유지 가능 —
//    공통화 대상이 아님).
export const SHELL_CSS = `
/* 색: tokens.css 의 원시 팔레트를 셸 이름에 잇는다 — 값을 여기 다시 적지 않는다. */
:root{--gold:var(--oas-green-500);--gold-text:var(--oas-green-text);--paper:var(--oas-paper);
--paper-deep:var(--oas-paper-deep);--panel:var(--oas-panel);
--ink:var(--oas-ink);--ink-body:var(--oas-ink-body);--ink-dim:var(--oas-ink-dim);
--line:var(--oas-border-light);--g100:var(--oas-green-100);--g300:var(--oas-green-300);
--g500:var(--oas-green-500);--g600:var(--oas-green-600);--g700:var(--oas-green-700);
--g800:var(--oas-green-800);--g900:var(--oas-green-900);--r:3px;
--wrap-w:760px;--lead-mb:34px;--lh:1.75}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--app-font);
font-size:15px;line-height:var(--lh);word-break:keep-all;overflow-wrap:break-word;-webkit-font-smoothing:antialiased}
a{color:var(--gold-text);text-decoration:none}
.top{display:flex;flex-wrap:wrap;align-items:center;gap:18px;padding:14px 22px;background:var(--g900);color:#f2f2f0}
.top .logo{font-weight:700;letter-spacing:0.04em;color:#fff;font-size:16px}
.top .logo .dot{color:var(--gold)}
.top nav{margin-left:auto;display:flex;gap:18px;font-size:13px}
.top nav a{color:rgba(242,242,240,0.75)} .top nav a:hover{color:#fff}
.wrap{max-width:var(--wrap-w);margin:0 auto;padding:48px 22px 90px}
.eyebrow{font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:var(--gold-text);font-weight:600}
h1{font-size:clamp(26px,4.5vw,36px);line-height:1.3;margin:10px 0 6px;letter-spacing:-0.01em}
.lead{color:var(--ink-body);margin:0 0 var(--lead-mb)}
footer{border-top:1px solid var(--line);padding:26px 22px;text-align:center;color:var(--ink-dim);font-size:12.5px}
@media(max-width:640px){.top nav{gap:12px}}
`;

// ── shell() ──────────────────────────────────────────────────────────
// 기존 build-devlog.mjs:183-220 시그니처를 그대로 유지하고 `css`·`depth`를
// 추가했다(요청서 §5). 여기에 `footerNote` 하나를 더 추가했다 — 요청서엔 없던
// 파라미터지만, footer 문구가 세 파일에서 실제로 전부 다르다(devlog "만드는 과정을
// 기록합니다" / team "사람과 AI가 함께 만드는 미술관" / valuation "매일 04:00 KST
// 자동 산출 · 목표 50억 · 최종 {날짜}" — valuation 쪽은 매일 바뀌는 동적 값이라
// 아예 하드코딩할 수 없다). footer 문구를 하나로 고정하면 카피 손실이자 디자인
// 변경이라 "리팩터링이지 리디자인이 아니다"라는 전제를 어긴다. 기본값은 devlog
// 원문으로 두어 depth 처럼 "devlog 는 오버라이드 없이 그대로 동작"을 지킨다.
// jsonld 는 선택값이다 — valuation 원본은 애초에 ld+json 스크립트가 없었으므로
// (devlog·team만 있었다) undefined 면 태그 자체를 생략해 그 페이지의 기존 상태를
// 그대로 보존한다.
export function shell({ title, desc, path, og, jsonld, bodyHtml, css = '', depth = 2,
  footerNote = '만드는 과정을 기록합니다.' }) {
  const url = `${BASE_URL}${path}`;
  const root = toRoot(depth);
  const navHtml = NAV.map((item) => `    <a href="${navHref(item, depth)}">${esc(item.label)}</a>`).join('\n');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${og}">
<meta property="og:site_name" content="${SITE}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n` : ''}<link rel="stylesheet" href="${root}app/vendor/fonts/fonts.css">
<style>${TOKENS_CSS}${SHELL_CSS}${css}</style>
</head>
<body>
<header class="top">
  <a class="logo" href="${root}">${SITE}<span class="dot">.</span></a>
  <nav>
${navHtml}
  </nav>
</header>
<div class="wrap">
${bodyHtml}
</div>
<footer>&copy; 2026 ${SITE}. — ${footerNote}<br><a href="${toMaking(depth)}licenses/">오픈소스 고지</a></footer>
</body>
</html>
`;
}
