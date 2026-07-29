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
import { categorize, stripTag } from './lib/devlog-category.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'making', 'devlog');

// ---------- 파싱 ----------
const src = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8').replace(/\r\n/g, '\n'); // CRLF 정규화 — Windows 워킹트리(w/crlf)에서도 `## ` 블록 파싱이 깨지지 않게(git 저장은 LF, CI는 LF라 무영향)
const blocks = src.split(/\n(?=## )/);
const entries = [];
for (const b of blocks) {
  const m = b.match(/^## (\d{4}-\d{2}-\d{2}) · (.+)\n([\s\S]*)$/);
  if (!m) continue;
  const [, date, rawTitle] = m;
  let body = m[3].replace(/\n---\s*$/,'').trim();
  const isPin = rawTitle.trim().startsWith('★');            // '★' 접두 = 최상단 고정
  const title = rawTitle.trim().replace(/^★\s*/, '');
  const slug = slugFor(date, title);                        // 새 모듈: 슬러그 축 (LEGACY_SLUGS + hash6)
  const category = categorize(rawTitle);                    // 새 모듈: 카테고리 축 (emoji 포함)
  entries.push({ date, title, body, pinned: isPin, slug, category });
}
// 고정(철학) 항목과 일반 로그를 분리 — 고정은 날짜와 무관하게 인덱스 최상단·연대기 nav 제외
const pinned = entries.filter(e => e.pinned);
const logs = entries.filter(e => !e.pinned);

// ---------- 마크다운 → HTML (개발일지 서브셋: h3/불릿/표/굵게/코드/링크) ----------
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener" target="_blank">$1</a>');
}
function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let list = null, para = [], table = null, fence = null, quote = null;
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push('<ul>' + list.map(i => `<li>${inline(i.join(' '))}</li>`).join('') + '</ul>'); list = null; } };
  const flushQuote = () => { if (quote) { out.push('<blockquote>' + quote.map(l => inline(l)).join('<br>') + '</blockquote>'); quote = null; } };
  const flushTable = () => {
    if (!table) return;
    const [head, ...rows] = table.filter(r => !/^\|[\s:-]+\|/.test(r));
    const cells = r => r.split('|').slice(1, -1).map(c => c.trim());
    let h = '<div class="tbl"><table><thead><tr>' + cells(head).map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
    for (const r of rows) h += '<tr>' + cells(r).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
    out.push(h + '</tbody></table></div>');
    table = null;
  };
  for (const raw of lines) {
    if (fence !== null) {
      if (/^```/.test(raw)) { out.push(`<pre><code>${esc(fence.join('\n'))}</code></pre>`); fence = null; }
      else fence.push(raw);
      continue;
    }
    if (/^```/.test(raw)) { flushPara(); flushList(); flushQuote(); flushTable(); fence = []; continue; }
    const img = raw.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      flushPara(); flushList(); flushQuote(); flushTable();
      // DEVLOG.md(docs/) 기준 `../devlog/img/` → making/devlog/ 기준 `./img/`
      const isrc = img[2].replace('../devlog/img/', './img/');
      out.push(`<figure class="shot"><img src="${esc(isrc)}" alt="${esc(img[1])}" loading="lazy">` +
        (img[1] ? `<figcaption>${inline(img[1])}</figcaption>` : '') + `</figure>`);
      continue;
    }
    if (/^\|/.test(raw.trim())) { flushPara(); flushList(); flushQuote(); (table ||= []).push(raw.trim()); continue; }
    flushTable();
    const h3 = raw.match(/^### (.+)/);
    if (h3) { flushPara(); flushList(); flushQuote(); out.push(`<h3>${inline(h3[1])}</h3>`); continue; }
    const bq = raw.match(/^>\s?(.*)/);
    if (bq) { flushPara(); flushList(); (quote ||= []).push(bq[1]); continue; }
    const li = raw.match(/^- (.+)/);
    if (li) { flushPara(); flushQuote(); (list ||= []).push([li[1]]); continue; }
    if (/^\s{2,}\S/.test(raw) && list) { list[list.length - 1].push(raw.trim()); continue; }
    if (!raw.trim()) { flushPara(); flushList(); flushQuote(); continue; }
    flushList(); flushQuote(); para.push(raw.trim());
  }
  flushPara(); flushList(); flushQuote(); flushTable();
  return out.join('\n');
}

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
@media(max-width:520px){.top nav{gap:12px}}
`;

// ---------- 생성 ----------
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.html')) unlinkSync(join(OUT, f)); // 슬러그 변경 잔재 제거

function writeEntryPage(e, pn, isPin) {
  const eyebrow = isPin ? 'OpenArtShow · 철학' : e.date;
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

const cards = logs.map(e => `<a class="card" href="./${e.slug}.html">
  <span class="d">${e.date}</span>
  <h2><span class="emo">${e.category.emoji}</span>${esc(stripTag(e.title))}</h2>
  <p>${esc(excerpt(e.body))}</p>
</a>`).join('\n');

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
${cards}`,
}));

// ---------- sitemap 은 build-making.mjs 에서 통합 생성 ----------
// 이 생성기는 devlog 페이지만 산출한다. sitemap·robots 은 build-making.mjs가 담당.

console.log(`devlog: ${entries.length} posts → making/devlog/`);
