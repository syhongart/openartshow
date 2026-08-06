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
      <td><code>${esc(t.path)}</code></td>
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

const rowsHtml = agg.areas.map((a) => `    <tr>
      <td>${esc(a.label)}</td>
      <td class="num">${n(a.lines)}</td>
      <td class="num">${a.files}</td>
      <td>${a.share === null
    ? '<span class="out">축 밖</span>'
    : `<span class="bar" style="--w:${(a.share * 100).toFixed(1)}%"></span><span class="pctv">${pct(a.share)}</span>`}</td>
    </tr>`).join('\n');

const topHtml = top.map((f) => `    <tr><td><code>${esc(f.path)}</code></td><td class="num">${n(f.lines)}</td></tr>`).join('\n');

const listHtml = (items) => items.map((x) => `      <li><b>${esc(x.t)}</b> ${x.d.replace(/\s+/g, ' ').trim()}</li>`).join('\n');

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

<h2>영역별 규모</h2>
<p class="note">비중의 분모는 <b>자체 코드</b>입니다. 벤더를 넣으면 three.js 하나가 3분의 1을
먹어 나머지가 전부 납작해집니다 — 보려는 것은 우리 코드의 분포입니다.</p>
<table class="arch-table">
  <thead><tr><th>영역</th><th class="num">줄</th><th class="num">파일</th><th>비중</th></tr></thead>
  <tbody>
${rowsHtml}
  </tbody>
</table>

<h2>파일 구조</h2>
<table class="arch-table tree">
  <thead><tr><th>경로</th><th class="num">줄</th><th class="num">파일</th><th>책임</th></tr></thead>
  <tbody>
${treeHtml}
  </tbody>
</table>

<h2>강점과 값</h2>
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

<h2>큰 코드 파일 10개</h2>
<p class="note"><b>줄 수는 규모이지 품질이 아닙니다.</b> 진입점은 "조립"이 책임이라 큰 것이
자연스럽고, 분해 신호는 크기가 아니라 <b>책임의 혼재</b>입니다.<br>
문서와 <code>package-lock.json</code>은 뺐습니다 — 큰 것이 정상이라 여기 있으면 오해를 부릅니다.</p>
<table class="arch-table">
  <thead><tr><th>파일</th><th class="num">줄</th></tr></thead>
  <tbody>
${topHtml}
  </tbody>
</table>

<h2>깨지 않는 네 가지</h2>
<div class="arch-rules">
${RULES.map((r, i) => `  <div class="rule"><span class="no">${i + 1}</span><p>${esc(r)}</p></div>`).join('\n')}
</div>
`;

// 디자이너 CSS 를 받기 전 임시 스타일. 배선 후 교체한다.
const CSS = `
.arch-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:28px 0}
.arch-stats .stat{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:16px}
.arch-stats .n{display:block;font-size:26px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}
.arch-stats .k{display:block;font-size:12.5px;color:var(--ink-body);margin-top:4px}
.arch-table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}
.arch-table th,.arch-table td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left}
.arch-table .num{text-align:right;font-variant-numeric:tabular-nums}
.arch-table .bar{display:inline-block;height:7px;width:var(--w);background:var(--g300);border-radius:4px;vertical-align:middle}
.arch-table .pctv{font-size:12px;color:var(--ink-body);margin-left:8px;font-variant-numeric:tabular-nums}
.arch-table .out{font-size:12px;color:var(--ink-body)}
.arch-table.tree .d1 td:first-child{padding-left:22px}
.arch-table.tree .d2 td:first-child{padding-left:40px}
.arch-table.tree .desc{color:var(--ink-body);font-size:13px}
.arch-pros{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:18px 0}
.arch-pros section{border:1px solid var(--line);border-radius:var(--r);padding:18px;background:var(--panel)}
.arch-pros h3{margin:0 0 10px;font-size:15px}
.arch-pros ul{margin:0;padding-left:18px}
.arch-pros li{margin-bottom:12px;font-size:13.5px;line-height:1.65}
.arch-rules{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:16px 0}
.arch-rules .rule{display:flex;gap:12px;border:1px solid var(--line);border-radius:var(--r);padding:14px;background:var(--panel)}
.arch-rules .no{font-weight:700;color:var(--g700);flex:none}
.arch-rules p{margin:0;font-size:13.5px;line-height:1.6}
.note{font-size:13px;color:var(--ink-body);margin:6px 0 12px}
@media(max-width:640px){
  .arch-stats{grid-template-columns:repeat(2,1fr)}
  .arch-pros,.arch-rules{grid-template-columns:1fr}
  .arch-table{font-size:13px}
  .arch-table th,.arch-table td{padding:8px 6px}
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
