#!/usr/bin/env node
// docs/DEVLOG.md → making/devlog/ 정적 블로그 생성기 (의존성 0)
// 실행: node scripts/build-devlog.mjs   (저장소 루트 기준)
// 산출: making/devlog/index.html, making/devlog/<slug>.html
// BASE_URL 은 `scripts/site-url.mjs` 가 SSOT 다(자체 도메인 구매 시 거기 한 줄만 바꾼다).

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shell, SITE } from './lib/site-shell.mjs';
import { slugFor } from './lib/devlog-slug.mjs';
import { categorize, stripTag, CATEGORIES, FALLBACK } from './lib/devlog-category.mjs';
import { parseEntries } from './lib/devlog-entries.mjs';
import { esc, mdToHtml as mdToHtmlBase } from './lib/md-to-html.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'making', 'devlog');

// ---------- 파싱 ----------
const src = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8');
// 파싱은 SSOT 를 경유한다(`devlog-entries.mjs`). 예전에는 이 파일이 자체 정규식을
// 들고 있었고, ★ 전량 제거와 CRLF 정규화도 여기만 하고 있었다 — 다른 세 파서와
// 어긋난 상태였다. 제목 줄에 **시각을 옵션으로 허용**하면서 그것을 방치할 수 없게
// 됐다: 시각을 모르는 파서는 `## 2026-07-30 08:15 · 제목` 을 매치 실패로 처리해
// **항목을 조용히 버린다.** 개발일지에서 사라지고 아무 게이트도 알려주지 않는다.
const entries = [];
for (const e of parseEntries(src)) {
  const body = e.content.replace(/\n---\s*$/, '').trim();
  const slug = slugFor(e.date, e.title);      // 슬러그 축 (LEGACY_SLUGS + hash6)
  const category = categorize(e.rawTitle);    // 카테고리 축 — ★ 를 봐야 하므로 rawTitle
  // pin 판정을 '★' 접두 대신 카테고리로 옮긴다(감독 지시) — 141개 중 ★ 는 16건이었지만
  // 진짜 철학은 2건뿐이었다. 이제 philosophy 로 분류되는 항목만 최상단 고정된다.
  const isPin = category.id === 'philosophy';
  entries.push({ date: e.date, time: e.time, title: e.title, body, pinned: isPin, slug, category });
}
// 고정(철학) 항목과 일반 로그를 분리 — 고정은 날짜와 무관하게 인덱스 최상단·연대기 nav 제외
const pinned = entries.filter(e => e.pinned);
const logs = entries.filter(e => !e.pinned);

// ---------- 마크다운 → HTML ----------
// 변환 규칙 자체는 `lib/md-to-html.mjs` 가 SSOT 다(라이선스 고지 페이지와 공유).
// 여기 남는 것은 **devlog 사정 하나뿐** — 이미지 경로다.
// `docs/DEVLOG.md` 기준의 `../devlog/img/` 를 산출 위치(`making/devlog/`) 기준
// `./img/` 로 바꾼다. 마크다운 문법이 아니라 이 생성기의 출력 위치 문제라 밖에 둔다.
const mdToHtml = (md) => mdToHtmlBase(md, {
  imageSrc: (src) => src.replace('../devlog/img/', './img/'),
});

function excerpt(body, n = 120) {
  const line = body.split('\n').map(l => l.replace(/^[-#>\s]+/, '').trim()).find(l => l.length > 10) || '';
  const t = line.replace(/\*\*|`/g, '');
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

// ---------- 고유 CSS — devlog 고유분만 (셸은 site-shell.mjs에서) ----------
const CSS = `
.card{display:block;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:20px 22px;margin:0 0 14px;
transition:border-color .2s,transform .2s}
.card:hover{border-color:var(--g300);transform:translateY(-1px)}
.card .d{font-size:12px;letter-spacing:0.12em;color:var(--gold-text);font-weight:600}
.card h2{font-size:17px;margin:6px 0 6px;color:var(--ink);line-height:1.45}
.card p{margin:0;font-size:13.5px;color:var(--ink-body)}
.emo{margin-right:6px}
/* 고정 철학 카드 — 최상단 강조(방향 앵커). 현행 톤 유지 */
.pin-card{display:block;background:linear-gradient(135deg,var(--paper-deep),var(--panel));border:1px solid var(--gold);
border-radius:var(--r);padding:24px 24px;margin:0 0 26px;transition:transform .2s,box-shadow .2s}
.pin-card:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(20,38,29,.12)}
.pin-card .pin-tag{display:inline-flex;align-items:center;gap:6px;font-size:11px;letter-spacing:0.16em;
text-transform:uppercase;color:var(--gold-text);font-weight:700;margin-bottom:10px}
.pin-card h2{font-size:19px;margin:0 0 8px;color:var(--ink);line-height:1.35}
.pin-card p{margin:0;font-size:14px;color:var(--ink-body)}
.shot{margin:22px 0}
.shot img{display:block;width:100%;border:1px solid var(--line);border-radius:var(--r)}
.shot figcaption{margin-top:8px;font-size:12.5px;color:var(--ink-dim);text-align:center}
article h3{font-size:15px;color:var(--g800);margin:34px 0 10px;padding-left:10px;border-left:3px solid var(--g300)}
article ul{margin:0 0 16px;padding-left:20px}
article li{margin:0 0 6px;color:var(--ink-body)}
article p{color:var(--ink-body)}
article strong{color:var(--ink)}
article blockquote{margin:0 0 22px;padding:16px 20px;border-left:3px solid var(--gold);background:var(--paper-deep);
border-radius:var(--r);color:var(--ink);font-size:16px;line-height:1.7}
article code{background:var(--paper-deep);border:1px solid var(--line);border-radius:var(--r);padding:1px 5px;font-size:12.5px}
article pre{background:var(--g900);color:#e8efe9;padding:14px 16px;border-radius:var(--r);overflow-x:auto;font-size:12.5px;line-height:1.6}
article pre code{background:none;border:none;color:inherit;padding:0}
.tbl{overflow-x:auto;margin:0 0 16px}
table{border-collapse:collapse;font-size:13px;min-width:420px}
th,td{border:1px solid var(--line);padding:7px 12px;text-align:left;color:var(--ink-body)}
th{background:var(--paper-deep);color:var(--ink);font-weight:600}
.meta{color:var(--ink-dim);font-size:13px;margin:0 0 30px}
.pn{display:flex;gap:12px;margin-top:50px;flex-wrap:wrap}
.pn a{flex:1;min-width:220px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;font-size:13px}
.pn a:hover{border-color:var(--g300)}
.pn .lbl{display:block;font-size:11px;letter-spacing:0.14em;color:var(--ink-dim);margin-bottom:4px}
.back{display:inline-block;margin-bottom:26px;font-size:13px}
/* 카테고리 TOC — 칩(앵커)이 아래 <details> 섹션으로 스크롤한다. 넘침 방지는
   flex-wrap:wrap 하나로 충분하다(모바일에서 칩이 줄바꿈되지 축 밖으로 안 밀린다). */
.cat-toc{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px}
.cat-toc a{display:inline-flex;align-items:center;gap:5px;background:var(--panel);
border:1px solid var(--line);border-radius:var(--r);padding:6px 12px;font-size:12.5px;color:var(--ink-body)}
.cat-toc a:hover{border-color:var(--g300);color:var(--ink)}
.cat-toc a b{color:var(--gold-text);font-weight:700}
/* 카테고리 섹션 — 기본 닫힘(<details> 네이티브 토글, JS 0). 카드 자체는 기존 .card 그대로 재사용 */
.cat-sec{border:1px solid var(--line);border-radius:var(--r);margin:0 0 12px;background:var(--panel);overflow:hidden}
.cat-sec summary{cursor:pointer;padding:14px 18px;font-size:14px;font-weight:600;color:var(--ink);list-style:revert}
.cat-sec summary .cnt{color:var(--ink-dim);font-weight:400;font-size:12.5px;margin-left:8px}
.cat-sec[open] summary{border-bottom:1px solid var(--line)}
.cat-body{padding:16px 16px 4px}
@media(max-width:520px){.top nav{gap:12px}}
`;

// ---------- 생성 ----------
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.html')) unlinkSync(join(OUT, f)); // 슬러그 변경 잔재 제거

function writeEntryPage(e, pn, isPin) {
  // 하드코딩 '철학' 대신 카테고리 label 에서 받는다 — pin 판정 자체가 이제 category.id
  // === 'philosophy' 라 지금은 결과가 같지만, 값을 두 곳(판정·표시)에 따로 적지 않는다.
  const eyebrow = isPin ? `OpenArtShow · ${e.category.label}` : e.date;
  const meta = isPin
    ? `방향을 잃을 때 돌아오는 자리 — 새겨둔 날 ${e.date}`
    : 'OpenArtShow 개발일지 — 원인 · 분석 · 개선 · 결과';
  const displayTitle = `${e.category.emoji} ${stripTag(e.title)}`;  // 새 모듈에서 이모지와 정제 제목
  const body = `
<a class="back" href="./">← 개발일지 전체</a>
<article>
<div class="eyebrow">${eyebrow}</div>
<h1>${esc(displayTitle)}</h1>
<p class="meta">${meta}</p>
${mdToHtml(e.body)}
</article>
${pn && pn.length ? `<div class="pn">${pn.join('')}</div>` : ''}`;
  const cleanTitle = stripTag(e.title);  // 명시 태그 제거
  writeFileSync(join(OUT, `${e.slug}.html`), shell({
    title: `${cleanTitle} — ${SITE}`,
    desc: excerpt(e.body, 150),
    path: `/making/devlog/${e.slug}.html`,
    og: 'article',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: cleanTitle, datePublished: e.date,
      author: { '@type': 'Organization', name: 'OpenArtShow' },
      mainEntityOfPage: `https://syhongart.github.io/openartshow/making/devlog/${e.slug}.html`,
      inLanguage: 'ko',
    },
    css: CSS,
    depth: 2,
    bodyHtml: body,
  }));
}

// 로그 페이지 — 연대기 이전/다음 nav은 logs 안에서만(고정 철학은 제외)
logs.forEach((e, i) => {
  const newer = logs[i - 1], older = logs[i + 1];
  const pn = [];
  if (older) pn.push(`<a href="./${older.slug}.html"><span class="lbl">← 이전 기록</span>${esc(stripTag(older.title))}</a>`);
  if (newer) pn.push(`<a href="./${newer.slug}.html" style="text-align:right"><span class="lbl">다음 기록 →</span>${esc(stripTag(newer.title))}</a>`);
  writeEntryPage(e, pn, false);
});
// 고정 철학 페이지 — 연대기 nav 없음
pinned.forEach(e => writeEntryPage(e, null, true));

const pinCards = pinned.map(e => `<a class="pin-card" href="./${e.slug}.html">
  <span class="pin-tag">${e.category.emoji} ${e.category.label} · 고정</span>
  <h2>${esc(stripTag(e.title))}</h2>
  <p>${esc(excerpt(e.body))}</p>
</a>`).join('\n');

// ── 카테고리 필터 (인덱스 전용) ──────────────────────────────────────────
// 감독 지적("복잡함")의 나머지 절반은 141개가 한 줄로 나열되는 것이었다. 고를 수
// 있는 순수 CSS/HTML 수단은 앵커+TOC, <details>, :target, 그리드 재배치였는데
// 이 콘텐츠(11카테고리·모바일 비중 높음·CSP 인라인 스크립트 금지)엔 앵커+<details>가
// 맞다고 판단했다:
//  · <details>는 브라우저 기본 토글이라 JS 0으로 "펼치기/접기"가 된다 — 스모크 [6]
//    (CSP·인라인 스크립트 금지)을 건드릴 필요가 아예 없다.
//  · :target 은 "한 번에 하나만 보이기"엔 맞지만 "카테고리 여러 개를 각자 접고 펼치기"
//    엔 안 맞는다(전역 target 하나로 여러 섹션 상태를 표현 못 한다).
//  · 칩(TOC)은 앵커라서 클릭하면 그 카테고리 위치로 스크롤한다. 최신 브라우저는
//    앵커 대상이 닫힌 <details> 안에 있으면 자동으로 펼치기도 하지만(fragment
//    navigation reveal), 이걸 지원 안 하는 구형 브라우저에서도 "그 위치로 스크롤 +
//    탭 한 번으로 펼침"으로 열화할 뿐 깨지지 않는다 — 의존하지 않고 덤으로 받는다.
//  · 기본 상태는 전부 닫힘이다. 141개 중 137개(고정 2건 제외)가 카테고리 요약
//    11줄로 접혀 첫 화면이 압축된다 — 이게 "복잡함" 완화의 핵심이다.
//  · 칩에 건수를 같이 보여준다("어디에 무엇이 얼마나 있는지가 곧 지도"라는 지시).
// 가로 넘침 방지: 칩 컨테이너는 flex-wrap:wrap — 안 들어가면 다음 줄로 밀리지,
// flex 기본 동작(축소 시도 후 넘침)으로 넘치지 않는다. 카드는 기존 .card 그대로라
// 디자인 시스템 변경 없음.
const byCat = new Map();
for (const e of logs) {
  if (!byCat.has(e.category.id)) byCat.set(e.category.id, []);
  byCat.get(e.category.id).push(e);
}
const catOrder = [...CATEGORIES, FALLBACK].filter(c => byCat.has(c.id)); // CATEGORIES 순서를 그대로 따른다(우선순위=표시순위, 카테고리 모듈과 동일 축)

const catToc = `<nav class="cat-toc" aria-label="카테고리로 이동">
${catOrder.map(c => `<a href="#cat-${c.id}">${c.emoji} ${esc(c.label)} <b>${byCat.get(c.id).length}</b></a>`).join('\n')}
</nav>`;

const catSections = catOrder.map(c => {
  const items = byCat.get(c.id);
  const cardsHtml = items.map(e => `<a class="card" href="./${e.slug}.html">
  <span class="d">${e.date}</span>
  <h2><span class="emo">${e.category.emoji}</span>${esc(stripTag(e.title))}</h2>
  <p>${esc(excerpt(e.body))}</p>
</a>`).join('\n');
  return `<details class="cat-sec" id="cat-${c.id}">
<summary>${c.emoji} ${esc(c.label)}<span class="cnt">${items.length}건</span></summary>
<div class="cat-body">
${cardsHtml}
</div>
</details>`;
}).join('\n');

writeFileSync(join(OUT, 'index.html'), shell({
  title: `개발일지 — ${SITE}`,
  desc: 'OpenArtShow를 만드는 과정의 공개 기록. 웹 3D 미술관의 성능·디자인·법무·브랜드 결정을 원인-분석-개선-결과로 남깁니다.',
  path: '/making/devlog/',
  og: 'website',
  jsonld: {
    '@context': 'https://schema.org', '@type': 'Blog',
    name: `${SITE} 개발일지`, url: `https://syhongart.github.io/openartshow/making/devlog/`, inLanguage: 'ko',
    blogPost: logs.slice(0, 10).map(e => ({ '@type': 'BlogPosting', headline: stripTag(e.title), datePublished: e.date, url: `https://syhongart.github.io/openartshow/making/devlog/${e.slug}.html` })),
  },
  css: CSS,
  depth: 2,
  bodyHtml: `
<div class="eyebrow">Devlog</div>
<h1>개발일지</h1>
<p class="lead">링크 하나로 열리는 3D 미술관을 만드는 과정 — ${logs.length}건의 기록.<br>
문제의 원인, 분석, 개선, 결과를 그대로 남깁니다.</p>
${pinCards}
${catToc}
${catSections}`,
}));

// ---------- sitemap 은 build-making.mjs 에서 통합 생성 ----------
// 이 생성기는 devlog 페이지만 산출한다. sitemap·robots 은 build-making.mjs가 담당.

console.log(`devlog: ${entries.length} posts → making/devlog/`);
