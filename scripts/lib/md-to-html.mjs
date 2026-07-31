// 마크다운 → HTML (이 저장소가 쓰는 서브셋: h2/h3·불릿·표·인용·코드펜스·굵게·인라인코드·링크·이미지)
//
// ── 왜 lib 으로 옮겼나 ──────────────────────────────────────────────────────
// 원래 `build-devlog.mjs` 안에만 있었다. 라이선스 고지 페이지(`build-licenses.mjs`)가
// `THIRD-PARTY-NOTICES.md` 를 같은 방식으로 렌더해야 해서 승격했다.
//
// 복사해서 두 벌로 두지 않은 이유는 이 저장소 규율 그대로다 — **같은 값을 두 곳에 적으면
// 한쪽만 고쳐도 아무도 모른다.** 렌더 규칙도 값이다. devlog 표가 깨지는 수정을 하면
// 라이선스 페이지에서도 똑같이 깨져야 하고, 그래야 한 번에 발견된다.
//
// ── 호출부가 달라지는 지점은 옵션으로만 ────────────────────────────────────
// devlog 는 `docs/DEVLOG.md` 기준의 이미지 경로(`../devlog/img/`)를 산출 위치 기준
// (`./img/`)으로 바꿔야 한다. 그건 devlog 사정이지 마크다운 문법이 아니므로
// `imageSrc` 콜백으로 밖에 둔다 — 기본값은 무변환이다.

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener" target="_blank">$1</a>');
}

/**
 * @param {string} md 마크다운 원문
 * @param {{ imageSrc?: (src: string) => string, headings?: boolean }} [opts]
 *   - `imageSrc`: 이미지 경로 변환(기본 무변환)
 *   - `headings`: `##` 도 제목으로 볼지(기본 false — devlog 는 `##` 를 항목 구분자로 쓰므로
 *     기존 동작을 바꾸지 않는다. 라이선스 문서는 `##` 가 실제 소제목이라 true 로 켠다)
 * @returns {string} HTML
 */
export function mdToHtml(md, opts = {}) {
  const imageSrc = opts.imageSrc || ((s) => s);
  const wantH2 = opts.headings === true;

  const lines = String(md).split('\n');
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
  const flushAll = () => { flushPara(); flushList(); flushQuote(); flushTable(); };

  for (const raw of lines) {
    if (fence !== null) {
      if (/^```/.test(raw)) { out.push(`<pre><code>${esc(fence.join('\n'))}</code></pre>`); fence = null; }
      else fence.push(raw);
      continue;
    }
    if (/^```/.test(raw)) { flushAll(); fence = []; continue; }
    const img = raw.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      flushAll();
      const isrc = imageSrc(img[2]);
      out.push(`<figure class="shot"><img src="${esc(isrc)}" alt="${esc(img[1])}" loading="lazy">` +
        (img[1] ? `<figcaption>${inline(img[1])}</figcaption>` : '') + `</figure>`);
      continue;
    }
    if (/^\|/.test(raw.trim())) { flushPara(); flushList(); flushQuote(); (table ||= []).push(raw.trim()); continue; }
    flushTable();
    const h3 = raw.match(/^### (.+)/);
    if (h3) { flushPara(); flushList(); flushQuote(); out.push(`<h3>${inline(h3[1])}</h3>`); continue; }
    if (wantH2) {
      const h2 = raw.match(/^## (.+)/);
      if (h2) { flushPara(); flushList(); flushQuote(); out.push(`<h2>${inline(h2[1])}</h2>`); continue; }
      // `---` 구분선. 라이선스 문서가 항목 사이에 쓴다.
      if (/^-{3,}\s*$/.test(raw)) { flushPara(); flushList(); flushQuote(); out.push('<hr>'); continue; }
    }
    const bq = raw.match(/^>\s?(.*)/);
    if (bq) { flushPara(); flushList(); (quote ||= []).push(bq[1]); continue; }
    const li = raw.match(/^- (.+)/);
    if (li) { flushPara(); flushQuote(); (list ||= []).push([li[1]]); continue; }
    if (/^\s{2,}\S/.test(raw) && list) { list[list.length - 1].push(raw.trim()); continue; }
    if (!raw.trim()) { flushPara(); flushList(); flushQuote(); continue; }
    flushList(); flushQuote(); para.push(raw.trim());
  }
  flushAll();
  return out.join('\n');
}
