#!/usr/bin/env node
// /making/architecture/ 아키텍처 페이지 생성기
// 실행: node scripts/build-architecture.mjs   (저장소 루트 기준)
// 산출: making/architecture/index.html
//
// ── 왜 문서가 아니라 생성기인가 (감독 지시 2026-08-06) ──────────────────────
// 감독: *"아키텍쳐 정리해 별도의 페이지에 올려. 파일구조 몇라인이고. 장단점 정리해서."*
//
// 줄 수를 손으로 적으면 **그날로 낡는다.** 이 저장소는 값 미러링으로 반복해서 사고를
// 냈다(같은 값을 두 곳에 적어 한쪽만 고친 것이 세 번). 그래서 수치는 **매 배포마다
// 실측**한다 — `git ls-files` 로 추적 파일을 세고 분류·집계는 `lib/code-metrics.mjs`
// (순수 함수, `tests/code-metrics.test.ts` 가 검사)가 한다.
//
// 반면 **평가(장단점)는 판단이라 여기 글로 적는다.** 자동으로 뽑을 수 없다 — 다만
// 각 항목에 **실측 근거를 붙인다**. 근거 없는 형용사는 이 저장소에서 금지다.
//
// `docs/ARCHITECTURE.md` 와의 관계: 그쪽은 **원칙**("앞으로 이렇게 한다"), 이 페이지는
// **현황과 평가**("지금 이렇게 생겼고 이런 값을 치르고 있다")다. 원칙을 여기 복사하지
// 않는다 — 링크로 보낸다.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shell } from './lib/site-shell.mjs';
import { aggregate, topOwnFiles, testRatio } from './lib/code-metrics.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'making', 'architecture');

// ── 실측 ────────────────────────────────────────────────────────────────────
// 추적 파일만 센다. 생성 산출물(`making/**` 등)은 `.gitignore` 대상이라 애초에 안 잡히고,
// 그래야 "우리가 쓴 것" 의 규모가 된다.
const EXT = /\.(ts|js|mjs|html|css|md|yml|json)$/;
const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter((p) => p && EXT.test(p));

const entries = tracked.map((path) => {
  let lines = 0;
  try {
    const src = readFileSync(join(ROOT, path), 'utf8');
    lines = src.length ? src.split('\n').length : 0;
  } catch (e) {
    // 심볼릭 링크·바이너리 등 — 0 으로 두고 계속한다(한 파일 때문에 전체를 죽이지 않는다).
    // ⚠ **반드시 남긴다**(검수관 비블로커). 조용히 0 이 되면 그 파일이 통계에서 사라진
    //   것을 아무도 모르고, 페이지에는 그럴듯한 총계가 그대로 뜬다 — 이 저장소가 이름
    //   붙인 *"못 잰 것이 통과로 적히는 경향"* 의 데이터판이다.
    //   (`git ls-files` 자체가 실패하면 이 catch 밖이라 생성기가 죽는다 — 그건 CI 가 잡는다.)
    console.warn(`[build-architecture] 줄 수를 못 읽어 0 으로 셌다: ${path} — ${e.message}`);
    lines = 0;
  }
  return { path, lines };
});

const agg = aggregate(entries);
const top = topOwnFiles(entries, 10);
const ratio = testRatio(agg);

const n = (v) => v.toLocaleString('ko-KR');
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ── 평가 — 판단이므로 글로 적되, **각 항목에 실측 근거를 붙인다** ───────────
// 형용사만 적힌 항목은 다음 사람이 검증할 수 없다. "왜 그렇게 판단했나" 가 아니라
// "무엇이 그것을 보여주나" 를 쓴다.
const area = (k) => agg.areas.find((a) => a.key === k) ?? { lines: 0, files: 0 };
/** 특정 파일의 실측 줄 수. **서술 안에 수치를 쓸 때는 반드시 이것을 쓴다** — 손으로 적지 않는다. */
const lineOf = (p) => entries.find((e) => e.path === p)?.lines ?? 0;

const PROS = [
  {
    t: '외부 호스트 0 — 자기완결',
    d: `CDN·웹폰트·원격 이미지를 하나도 안 쓴다. 남의 서버가 죽어도 이 사이트는 산다.
        스모크가 10개 페이지에서 <b>외부 호스트 요청 0</b>을 매번 확인한다.
        대가는 아래 「값」에 적었다 — 벤더 ${n(agg.vendor.lines)}줄이 저장소 안에 있다.`,
  },
  {
    t: '규율이 문서가 아니라 게이트다',
    d: `린트·타입·참조무결성·테스트가 <code>npm run gate</code> 한 번으로 돌고,
        통과 스탬프가 <b>커밋 훅에서 대조</b>된다 — 게이트를 안 돌리거나 돌린 뒤 파일을
        고치면 커밋 자체가 막힌다. 손으로 조립하던 때 같은 실패를 두 번 하고 구조로 옮겼다.`,
  },
  {
    t: '분해해도 부르는 쪽이 안 깨진다',
    d: `파일을 쪼갤 때 원래 이름을 <b>얇은 재수출 배럴</b>로 남긴다
        (<code>space-render.js</code>·<code>ui.js</code>·<code>chibi.js</code>).
        내부는 자유롭게 재배치하고 소비자의 import 경로는 그대로다.`,
  },
  {
    t: '서버에 저장하지 않는다 — 파라미터가 곧 공간',
    d: `전시 공간과 아바타는 JSON 스키마로 표현되어 링크·localStorage 에만 담긴다.
        렌더는 기기에서 파생된다. 계정 서버도, 유출될 DB 도 없다.`,
  },
  {
    t: `안전망이 두껍다 — 테스트 ${n(area('tests').lines)}줄`,
    d: `구현 대비 ${ratio ? pct(ratio) : '—'} 다. 다만 <b>통과가 검출력의 증거는 아니다</b> —
        결함을 고치면 그 결함을 일부러 되살려 테스트가 실제로 깨지는지(뮤테이션) 확인한다.
        안 깨지면 게이트가 아니라 장식이다.`,
  },
];

const CONS = [
  {
    t: '같은 로직을 .ts 와 .js 두 벌로 들고 있다',
    d: `GitHub Pages 정적 직서빙과 vite 빌드를 <b>동시에</b> 만족시키려는 대가다.
        <code>.ts</code> 가 진실이고 <code>.js</code> 는 산출인데, <b>재생성을 빠뜨리면
        라이브가 옛 로직을 계속 서빙한다.</b> 지금은 사람이 지키는 규율이고 게이트가 아니다.`,
  },
  {
    // ⚠ `world.js` 줄 수를 **손으로 적었다가 고쳤다.** 이 페이지의 존재 이유가 "수치를
    //    손으로 적으면 낡는다" 인데 그 안에서 값 미러링을 만들었다 — 같은 커밋 안에서
    //    같은 형태를 재생산하는 것은 이 저장소가 반복해 온 실수다. 실측에서 뽑는다.
    t: `오픈월드가 두 벌이다 — world1 ${n(lineOf('frontend/js/world.js'))}줄 + world2 ${n(area('world2').lines)}줄`,
    d: `현행(<code>world.js</code>)과 재작성(<code>world2/</code>)이 병존한다. 교체 전까지
        고칠 것이 생기면 <b>두 곳을 보거나, 한쪽을 포기</b>해야 한다. 실제로 오늘도
        하늘 코드를 양쪽이 공유하는 구조 때문에 라이브 무영향 확인이 따로 필요했다.`,
  },
  {
    t: '헤드리스 검증이 감독 실기기를 재현하지 못한다',
    d: `자동 검증은 WebGL(swiftshader)로 돌고 감독 기기는 <b>WebGPU</b>다 — 렌더 경로가
        다르다. 2026-08-06 별 크기 건이 정확히 여기 막혔다: 세 값을 렌더했는데 화면이
        구별되지 않았고, 원인은 <b>헤드리스에 그 별이 아예 안 뜨는 것</b>이었다.
        <b>이 사각은 열려 있다.</b> 시각 판정은 감독 눈이 유일한 수단이다.`,
  },
  {
    t: '성능 게이트가 아직 아무것도 막지 않는다',
    d: `개수 불변식과 하늘 예열은 CI 에서 <b>관측만</b> 한다(종료 코드에서 빠진다) —
        러너 성능 편차의 거짓 실패 위험을 아직 안 재봤기 때문이다.
        <b>관측은 면제가 아니라 데이터 수집이고, 승격 없이 남으면 그때부터 장식이다.</b>`,
  },
  {
    t: '큰 파일이 남아 있다',
    d: `아래 상위 목록이 그것이다. 다만 <b>줄 수는 분해 기준이 아니다</b> — 진입점은
        "조립" 이 책임이라 큰 것이 자연스럽다. 기준은 <b>책임의 혼재</b>이고, 그 판정
        기준을 세우는 일은 아직 열려 있다.`,
  },
];

// ── 디렉터리 구조 ───────────────────────────────────────────────────────────
// ⚠ 처음엔 `<pre>` 안에서 `padEnd` 로 칸을 맞췄고 **화면에서 깨졌다.** `padEnd` 는
//   문자 **개수**를 세는데 한글은 폭이 2배라 정렬이 어긋나고, 좁은 화면에서는 줄바꿈이
//   일어나 설명이 통째로 딴 데 붙었다. 고정폭 정렬은 한글 UI 에서 성립하지 않는다.
//   표로 바꾼다 — 브라우저가 폭을 계산하게 두는 것이 맞다.
const TREE = [
  { path: 'frontend/', depth: 0, desc: '브라우저에 가는 전부', key: null },
  { path: 'js/', depth: 1, desc: '앱 코어 — 미술관·빌더·아바타', key: 'app' },
  { path: 'world2/', depth: 2, desc: '오픈월드 재작성(커널 + 시스템)', key: 'world2' },
  { path: 'vendor/', depth: 1, desc: 'three.js 등 제3자 — 자기완결의 값', key: 'vendor' },
  { path: '*.html', depth: 1, desc: '진입 페이지', key: 'html' },
  { path: 'scripts/', depth: 0, desc: '빌드·생성기', key: 'scripts' },
  { path: 'smoke/', depth: 1, desc: '헤드리스 검증·게이트', key: 'smoke' },
  { path: 'tests/', depth: 0, desc: '단위·통합 테스트', key: 'tests' },
  { path: 'docs/', depth: 0, desc: '원칙·이력·설계', key: 'docs' },
  { path: '.github/', depth: 0, desc: 'CI·배포 워크플로', key: 'ci' },
];

const treeHtml = TREE.map((t) => {
  const a = t.key ? area(t.key) : null;
  return `    <tr class="d${t.depth}">
      <td><code>${esc(t.path).replace(/\//g, '/<wbr>')}</code></td>
      <td class="num">${a ? n(a.lines) : '—'}</td>
      <td class="num">${a ? a.files : '—'}</td>
      <td class="desc">${esc(t.desc)}</td>
    </tr>`;
}).join('\n');

// ── 마크업 ──────────────────────────────────────────────────────────────────
const statsHtml = [
  [n(agg.own.lines), '자체 코드 줄'],
  [n(agg.own.files), '자체 파일'],
  [n(agg.vendor.lines), '벤더 줄'],
  [ratio ? pct(ratio) : '—', '테스트 / 구현'],
].map(([v, k]) => `  <div class="stat"><span class="n">${v}</span><span class="k">${k}</span></div>`).join('\n');

// ⚠ **막대 폭은 비중이 아니라 최대 행 대비 비율이다**(디자이너 필수 2).
// `--w` 에 실제 비중(예: 31%)을 그대로 넣으면 트랙의 31% 만 차서 **최대 행조차
// 3분의 1 만 찬다** — 막대가 "가장 큰 것" 을 못 보여주고 전부 짧게 뭉친다.
// 읽는 이가 쓰는 정보는 **행 간 비교**이므로 최대를 100% 로 정규화한다.
// 실제 퍼센트는 옆의 `.pv` 텍스트가 그대로 말하므로 값이 왜곡되지 않는다.
const maxShare = Math.max(...agg.areas.map((a) => a.share ?? 0), 0);
const rowsHtml = agg.areas.map((a) => `    <tr>
      <td>${esc(a.label)}</td>
      <td class="num">${n(a.lines)}</td>
      <td class="num">${a.files}</td>
      <td class="pct">${a.share === null
    ? '<span class="pv">축 밖</span>'
    : `<span class="bar" style="--w:${maxShare ? ((a.share / maxShare) * 100).toFixed(1) : 0}%"></span>`
      + `<span class="pv">${pct(a.share)}</span>`}</td>
    </tr>`).join('\n');

// 경로에 `<wbr>` 를 넣는다 — 없으면 360px 에서 `frontend/js/main.` / `js` 처럼
// 엉뚱한 데서 갈라진다(디자이너 실측). `word-break:break-all` 로 푸는 것이 아니라
// **줄바꿈 기회를 주는 것**이 맞다: body 의 `word-break:keep-all` 은 한글 규칙이라
// 슬래시 경로에 기회를 하나도 안 만든다.
const topHtml = top.map((f) => `    <tr><td><code>${esc(f.path).replace(/\//g, '/<wbr>')}</code></td><td class="num">${n(f.lines)}</td></tr>`).join('\n');

// ⚠ 서술 안의 `<b>` 를 `<strong>` 으로 바꾼다. 디자이너 CSS 가 `.arch-pros li b` 를
// **항목 제목**으로 규정해 `display:block` 을 걸기 때문이다 — 안 바꾸면 본문 중간의
// 강조가 전부 줄바꿈돼 문장이 토막난다(화면에서 실제로 그렇게 나왔다).
// 의미도 이쪽이 맞다: 제목은 이름표(`<b>`), 본문 강조는 중요도(`<strong>`)다.
const listHtml = (items) => items.map((x) => {
  const body = x.d.replace(/\s+/g, ' ').trim()
    .replace(/<b>/g, '<strong>').replace(/<\/b>/g, '</strong>');
  return `      <li><b>${esc(x.t)}</b> ${body}</li>`;
}).join('\n');

const RULES = [
  '보호 파일(라이브 미술관 4개)을 새 기능이 역참조하지 않는다. 신규는 독립 가산 모듈로 짓는다.',
  '모듈 그래프에 순환 의존이 없다.',
  '공간·아바타 데이터는 예외 없이 정규화 함수(SSOT)를 지나서만 렌더·저장으로 흐른다.',
  '보호 파일 수정은 사전 서명 대상이다 — 라이브 무중단이 우선한다.',
];

const bodyHtml = `
<div class="eyebrow">Architecture</div>
<h1>코드 구조</h1>
<p class="lead">이 페이지의 숫자는 <b>배포할 때마다 다시 잽니다.</b> 손으로 적은 값이 아니라
<code>git ls-files</code> 실측이라 낡지 않습니다.<br>
원칙과 규칙은 <a href="https://github.com/syhongart/openartshow/blob/main/docs/ARCHITECTURE.md">ARCHITECTURE.md</a>에 있고,
여기는 <b>지금 이렇게 생겼고 이런 값을 치르고 있다</b>를 적습니다.</p>

<div class="arch-stats">
${statsHtml}
</div>

<h2 class="sec">영역별 규모</h2>
<p class="note">비중의 분모는 <b>자체 코드</b>입니다. 벤더를 넣으면 three.js 하나가 3분의 1을
먹어 나머지가 전부 납작해집니다 — 보려는 것은 우리 코드의 분포입니다.</p>
<table class="arch-table">
  <thead><tr><th>영역</th><th class="num">줄</th><th class="num">파일</th><th>비중</th></tr></thead>
  <tbody>
${rowsHtml}
  </tbody>
</table>

<h2 class="sec">파일 구조</h2>
<table class="arch-table layers">
  <thead><tr><th>경로</th><th class="num">줄</th><th class="num">파일</th><th>책임</th></tr></thead>
  <tbody>
${treeHtml}
  </tbody>
</table>

<h2 class="sec">강점과 값</h2>
<p class="note">모든 선택에는 값이 따릅니다. 좋은 점만 적으면 다음 사람이 무엇을 조심해야
하는지 모릅니다.</p>
<div class="arch-pros">
  <section class="pro">
    <h3>강점</h3>
    <ul>
${listHtml(PROS)}
    </ul>
  </section>
  <section class="con">
    <h3>치르는 값</h3>
    <ul>
${listHtml(CONS)}
    </ul>
  </section>
</div>

<h2 class="sec">큰 코드 파일 10개</h2>
<p class="note"><b>줄 수는 규모이지 품질이 아닙니다.</b> 진입점은 "조립"이 책임이라 큰 것이
자연스럽고, 분해 신호는 크기가 아니라 <b>책임의 혼재</b>입니다.<br>
문서와 <code>package-lock.json</code>은 뺐습니다 — 큰 것이 정상이라 여기 있으면 오해를 부릅니다.</p>
<table class="arch-table">
  <thead><tr><th>파일</th><th class="num">줄</th></tr></thead>
  <tbody>
${topHtml}
  </tbody>
</table>

<h2 class="sec">깨지 않는 네 가지</h2>
<div class="arch-rules">
${RULES.map((r, i) => `  <div class="rule"><span class="no">${i + 1}</span><p>${esc(r)}</p></div>`).join('\n')}
</div>
`;

// 디자이너 산출(2026-08-06). 대비비는 이 CSS 헤더 주석이 실측표로 갖고 있다.
// ⚠ `<pre>` 트리를 표로 바꾸면서 `.arch-tree*` 규칙은 소비자가 0 이 되어 뺐다 —
//   쓰지 않는 CSS 를 남기면 다음 사람이 그것을 살아 있는 규칙으로 읽는다.
// ⚠⚠ **이 아래는 JS 템플릿 리터럴이다.** CSS 안에서 백틱(`)이나 `${` 를 쓰려면 반드시
//     역슬래시로 이스케이프해야 한다 — 안 하면 파서가 문자열을 그 자리에서 끊고
//     **SyntaxError 로 즉시 죽는다**(실제로 디자이너 CSS 주석의 백틱 6개에서 났다).
//     조용히 깨지는 자리는 아니다(생성기가 안 돌면 CI 검사1 이 바로 FAIL 한다) —
//     다만 처음 보는 사람은 "CSS 를 고쳤을 뿐인데 왜 죽지" 로 시간을 버린다.
const CSS = `
/* /making/architecture/ 고유 CSS
 *
 * 셸(scripts/lib/site-shell.mjs)의 TOKENS_CSS + SHELL_CSS 가 이 앞에 붙는다.
 * 색을 새로 만들지 않는다 — 셸이 이미 이어 놓은 이름(--g100..--g900 · --gold-text ·
 * --ink/--ink-body/--ink-dim · --paper/--paper-deep/--panel · --line · --r)만 쓴다.
 *
 * 라이트 전용이다. 셸에 prefers-color-scheme 분기가 한 곳도 없고(.top 은 --g900,
 * body 는 --paper 고정) 본문만 다크로 뒤집으면 헤더·푸터와 어긋난다. 다크 대응은
 * 셸 차원의 판단이지 이 페이지가 단독으로 열 축이 아니다 — 여기서 멈춘다.
 *
 * ── 대비 실측(WCAG 2.x, 이 파일이 쓰는 조합 전부) ─────────────────────────
 *   [텍스트 · 기준 4.5:1]
 *     본문 ink/paper            17.75    표 본문 inkBody/paper        7.73
 *     표 숫자 ink/paper         17.75    표 헤더 ink/paper-deep      16.29
 *     스탯 숫자 g700/panel       4.98 ←최저   스탯 라벨 inkDim/panel   5.75
 *     섹션 g800/paper            7.85    강점 제목 g800/panel         7.99
 *     대가 제목 inkBody/panel    7.88    + 마커 g700/panel            4.98
 *     − 마커 inkDim/panel        5.75    규칙 본문 inkBody/paper-deep 7.10
 *     규칙 번호 g100/g800        6.87    트리 본문 g100/g900         13.41
 *     트리 주석 g300/g900        8.89
 *   [비텍스트 UI · 기준 3:1]
 *     막대 시작 g600/paper-deep  3.60    막대 끝 g800/paper-deep      7.20
 *     강점 테두리 g600/panel     4.00    대가 테두리 inkDim/panel     5.75
 *     th 하단선 g600/paper-deep  3.60
 *   최저 텍스트가 4.98 이므로 AA 전항 통과. 계산기는 상대휘도 정의식 그대로다.
 *   기준 미달로 **기각한 후보**도 남긴다(다음 사람이 같은 값을 또 고를 자리다):
 *     g300/paper-deep 1.58 · warm-gray-500/panel 2.73 · g500/paper-deep 2.79.
 */
:root{--wrap-w:840px;--lead-mb:28px;--lh:1.7}

/* 섹션 제목 — team·valuation 의 h2.sec 와 문자 그대로 같은 규칙이다.
 * 표가 두 개 연달아 나오는 페이지라 제목 없이는 무슨 표인지 읽히지 않는다. */
h2.sec{font-size:15px;color:var(--g800);margin:38px 0 14px;padding-left:10px;
border-left:3px solid var(--g300);letter-spacing:0.02em}

/* ── ① 요약 스탯 ────────────────────────────────────────────────────────
 * team 의 .stat-row/.stat 과 같은 형태지만 flex 가 아니라 grid 다 — flex:1+min-width
 * 는 4칸이 3+1 로 접히는 폭 구간이 생기고, 그 구간에서 마지막 칸만 전폭이 된다.
 * grid 는 2열/4열 두 상태만 갖는다. */
.arch-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:0 0 34px}
.arch-stats .stat{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);
padding:15px 16px;min-width:0}
/* min-width:0 — grid 아이템의 기본 min-width:auto 는 내용보다 작아지길 거부한다.
 * 숫자에 tabular-nums+nowrap 이 걸려 있으므로 이게 없으면 칸이 트랙을 밀어내
 * 그리드 전체가 컨테이너를 넘는다(가로넘침이 실제로 나는 자리). */
.arch-stats .stat .n{display:block;font-size:clamp(19px,3.4vw,26px);font-weight:600;
color:var(--g700);line-height:1.15;letter-spacing:-0.015em;
font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}
.arch-stats .stat .k{display:block;font-size:12px;color:var(--ink-dim);margin-top:6px;
letter-spacing:0.03em;line-height:1.4}

/* ── ②④ 표 ─────────────────────────────────────────────────────────────
 * devlog·valuation·licenses 의 md 표는 4변 격자(border:1px solid var(--line))다.
 * 여기서는 가로선만 남겼다 — 저 표들은 본문 흐름 속 인용이고 이 표는 페이지의 주
 * 콘텐츠라 행이 길게 이어진다. 좁은 폭에서 세로선은 셀마다 padding 을 한 번 더
 * 요구해 4열이 컨테이너를 넘기고, 그것이 요청서가 지목한 태스크 #16 과 같은 사고다.
 * 구조는 헤더 하단선을 g600 으로 굵혀 남긴다(3.60:1).
 * table-layout 은 일부러 auto 다 — fixed 로 열 폭을 내가 정하면 첫 열 라벨이
 * 길어질 때마다 CSS 를 다시 만져야 하고, 그 값이 곧 마크업과의 값 미러링이 된다. */
.arch-table{width:100%;border-collapse:collapse;font-size:13px;margin:0 0 26px}
.arch-table th,.arch-table td{padding:9px 10px;text-align:left;vertical-align:baseline;
border-bottom:1px solid var(--line);color:var(--ink-body)}
.arch-table th{background:var(--paper-deep);color:var(--ink);font-weight:600;font-size:12px;
letter-spacing:0.03em;white-space:nowrap;border-bottom:1px solid var(--g600)}
.arch-table tbody tr:last-child td{border-bottom:0}
.arch-table td:first-child{color:var(--ink)}
/* 숫자가 주인공이다 — 자릿수 정렬(tabular-nums) + 오른끝 정렬로 자릿수를 눈으로 센다.
 * font-feature-settings 는 tabular-nums 를 무시하는 구형 엔진용 이중 지정이다. */
.arch-table .num{text-align:right;white-space:nowrap;color:var(--ink);
font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}

/* 비중 막대. --w 로 폭을 받고, 값 자체는 옆의 .pv 텍스트가 말한다.
 *
 * 채움을 g300→g600(저장소 관례: valuation .goalbar · team .m-bar)이 아니라
 * g600→g800 으로 내렸다. 그 관례는 **채움이 긴 막대**를 전제한 값이다 — 이 표의
 * 비중은 한 자릿수부터 30% 대까지라 짧은 막대에서는 그라디언트 시작색만 보이는데,
 * g300 은 트랙(paper-deep) 위에서 1.58:1 로 비텍스트 기준 3:1 에 한참 못 미친다.
 * g600 시작이면 3.60:1 이다. 관례를 깬 것이 아니라 관례가 성립하는 전제(긴 채움)가
 * 여기엔 없다.
 * **여기서 멈춘다** — 더 어둡게(g700 시작) 가면 막대가 본문 글자보다 무거워져
 * "숫자가 주인공" 이라는 이 페이지의 전제가 뒤집힌다.
 *
 * 트랙은 장식이다(paper 위 1.28:1 로 거의 안 보인다). 값을 .pv 가 전달하므로
 * 트랙 가시성은 요구조건이 아니고, 트랙을 진하게 만들면 표의 가로선보다 무거워진다. */
.arch-table .pct{width:26%;white-space:nowrap}
/* 막대와 숫자를 **한 줄에** 둔다. 세로로 쌓으면 행 높이가 두 배가 되고, 그러면
 * 표가 성겨져 행끼리 비교가 안 된다 — 이 표의 목적이 행 간 비교다(1280px 실측). */
.arch-table .pct .bar{display:inline-block;vertical-align:middle;
width:calc(100% - 42px);min-width:40px;height:7px;border-radius:2px;
background:var(--paper-deep);position:relative;overflow:hidden}
.arch-table .pct .bar::before{content:"";position:absolute;left:0;top:0;bottom:0;
/* 하한 3px — 한 자릿수 비중이 0px 로 사라지면 "값이 없다" 와 구별되지 않는다.
 * 3px 은 트랙 높이(7px)보다 작아 막대가 아니라 눈금으로 읽히므로 과장이 아니다. */
width:max(var(--w,0%),3px);border-radius:2px;
background:linear-gradient(90deg,var(--g600),var(--g800));
transform-origin:left center;animation:arch-grow .5s cubic-bezier(.22,.9,.3,1) both}
.arch-table .pct .pv{display:inline-block;vertical-align:middle;width:38px;
text-align:right;font-size:11.5px;color:var(--ink-dim);
font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}
@keyframes arch-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* 층 구조 표는 2열이라 첫 열이 파일 경로다. 경로는 등폭이 읽기 쉽다. */
.arch-table.layers td:first-child{width:38%;font-weight:600;
font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
font-size:12px;overflow-wrap:anywhere}
/* overflow-wrap:anywhere 이지 word-break:break-all 이 아니다. break-all 을 먼저 썼다가
 * 360px 실측에서 \`frontend/js/main.\` / \`js\` 로 갈라지는 것을 보고 물렸다 — break-all 은
 * **줄바꿈 기회가 있어도** 임의 위치에서 자른다. anywhere 는 정상 기회(마크업의 <wbr>)를
 * 먼저 쓰고 넘칠 때만 자른다. 그래서 경로에 <wbr> 를 넣어 달라고 요청했다(보고 §3).
 * body 의 word-break:keep-all 은 한글 규칙이라 슬래시 경로에 아무 기회도 안 만든다. */

/* ── ⑤ 장단점 ──────────────────────────────────────────────────────────
 * 강점/대가를 색으로만 가르지 않는다 — 색각 이상에서 그린과 웜 뉴트럴은 붙는다.
 * 형태 축을 셋 겹친다:
 *   ① 왼쪽 테두리   solid(강점) / dashed(대가)
 *   ② 제목 앞 사각형 채움(강점) / 윤곽(대가)
 *   ③ 항목 마커     +(강점) / −(대가)
 * 색은 넷째 축이지 유일한 축이 아니다. 흑백 인쇄에서도 셋 다 남는다.
 * 대가 쪽을 --warn(코랄)으로 칠하지 않은 것은 의도다 — 대가는 경고가 아니고,
 * 기능 신호색을 서술에 쓰면 빌더의 미저장 경고와 같은 색 어휘를 낭비한다. */
.arch-pros{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0 0 30px;align-items:start}
.arch-pros>section{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);
padding:16px 18px;min-width:0}
.arch-pros .pro{border-left:4px solid var(--g600)}
.arch-pros .con{border-left:4px dashed var(--ink-dim)}
.arch-pros h3{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;
margin:0 0 12px;letter-spacing:0.02em}
.arch-pros .pro h3{color:var(--g800)}
.arch-pros .con h3{color:var(--ink-body)}
.arch-pros h3::before{content:"";flex:0 0 auto;width:9px;height:9px;border-radius:1px}
.arch-pros .pro h3::before{background:var(--g600)}
.arch-pros .con h3::before{border:2px solid var(--ink-dim)}
.arch-pros ul{list-style:none;margin:0;padding:0}
.arch-pros li{position:relative;padding-left:18px;margin:0 0 12px;font-size:13px;
color:var(--ink-body);line-height:1.65}
.arch-pros li:last-child{margin-bottom:0}
.arch-pros li b{display:block;color:var(--ink);font-weight:600;margin-bottom:1px}
.arch-pros li::before{position:absolute;left:0;top:0;font-weight:700;line-height:1.65}
.arch-pros .pro li::before{content:"+";color:var(--g700)}
.arch-pros .con li::before{content:"−";color:var(--ink-dim)}
/* content 의 alt 텍스트(\`/ ""\`)는 스크린리더가 "더하기/빼기" 를 읽지 않게 한다.
 * 미지원 엔진은 **선언 전체를 버리므로** 위 두 줄을 폴백으로 먼저 두고 여기서
 * 덮어쓴다 — 한 줄로 합치면 미지원 브라우저에서 마커가 통째로 사라진다. */
.arch-pros .pro li::before{content:"+" / ""}
.arch-pros .con li::before{content:"−" / ""}

/* ── ⑥ 불변식 카드 ─────────────────────────────────────────────────────
 * 번호를 절대배치 배지로 빼고 본문에 왼쪽 padding 을 준다 — flex 로 번호와 문단을
 * 나란히 두면 문단이 두 줄 이상일 때 번호가 세로 가운데로 떠서 목록으로 안 읽힌다. */
.arch-rules{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:0 0 8px}
.arch-rules .rule{position:relative;background:var(--paper-deep);border:1px solid var(--line);
border-radius:var(--r);padding:14px 16px 14px 44px;min-width:0}
.arch-rules .rule .no{position:absolute;left:14px;top:13px;width:20px;height:20px;
border-radius:50%;background:var(--g800);color:var(--g100);
display:flex;align-items:center;justify-content:center;
font-size:11px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.arch-rules .rule p{margin:0;font-size:13px;color:var(--ink-body);line-height:1.6}
.arch-rules .rule p b,.arch-rules .rule p strong{color:var(--ink);font-weight:600}

/* ── 모바일 ≤640px ─────────────────────────────────────────────────────
 * 640 을 고른 이유: 셸이 이미 640 에서 nav gap 을 줄인다(site-shell.mjs 의 유일한
 * 미디어쿼리). 브레이크포인트를 하나 더 만들면 그 값이 두 파일에 흩어진 값
 * 미러링이 되고, 한쪽만 고쳤을 때 헤더와 본문이 다른 폭에서 접힌다.
 * 이 저장소가 "모바일" 로 부르는 선도 같은 640 이다(디자이너 산출물 스모크 기준). */
@media(max-width:640px){
  .arch-stats{grid-template-columns:repeat(2,1fr);gap:10px}
  .arch-stats .stat{padding:13px 14px}
  .arch-pros{grid-template-columns:1fr;gap:12px}
  .arch-rules{grid-template-columns:1fr}
  .arch-table{font-size:12.5px}
  .arch-table th,.arch-table td{padding:8px 6px}
  .arch-table th:first-child,.arch-table td:first-child{padding-left:0}
  .arch-table th:last-child,.arch-table td:last-child{padding-right:0}
  /* 막대를 지운다. 같은 값을 .pv 숫자가 이미 말하므로 **잃는 정보가 0** 이고,
   * 4열을 3열분 폭에 넣는 가장 싼 방법이다. 표를 가로 스크롤 래퍼에 넣지 않는
   * 이유이기도 하다 — 스크롤 래퍼는 넘침을 감추지 열을 읽게 해주지 않는다. */
  .arch-table .pct{width:auto}
  .arch-table .pct .bar{display:none}
  .arch-table .pct .pv{width:auto;font-size:12.5px;color:var(--ink)}
  .arch-table.layers td:first-child{width:42%}
  h2.sec{margin:30px 0 12px}
}

/* 움직임은 막대 하나뿐이고, 그마저 값을 읽는 장치다(길이 비교를 눈에 태운다).
 * reduce 면 animation 자체를 끈다 — scaleX 기본값이 1 이라 최종 상태는 동일하다. */
@media(prefers-reduced-motion:reduce){
  .arch-table .pct .bar::before{animation:none}
}
`;

const html = shell({
  title: '코드 구조 — OpenArtShow',
  desc: '파일 구조·규모 실측과 아키텍처의 강점·치르는 값.',
  path: '/making/architecture/',
  og: 'article',
  css: CSS,
  bodyHtml,
  depth: 2,
});

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'index.html'), html);
console.log(`making/architecture/index.html — 자체 ${n(agg.own.lines)}줄 / ${agg.own.files}파일, 영역 ${agg.areas.length}`);
