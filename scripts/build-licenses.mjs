#!/usr/bin/env node
// 오픈소스 고지 페이지 생성기 — THIRD-PARTY-NOTICES.md + LICENSE → making/licenses/index.html
// 실행: node scripts/build-licenses.mjs   (저장소 루트 기준)
//
// ── 왜 이 페이지가 필요한가 (감독 지시 2026-07-31) ──────────────────────────
// 감독: *"홈피에 라이센스 당연히 고지해야지. 그정도 양심은 있어."*
//
// 법무 실사(§6, 2026-07-31)가 짚은 것: 저장소는 적법하다 —
// `frontend/vendor/three.module.js` 헤더에 `@license`·SPDX 가 살아 있고
// `THIRD-PARTY-NOTICES.md` 가 항목별로 적혀 있으며 `LICENSE` 에 vendor 예외 조항도 있다.
// 그런데 **배포되는 사이트에는 그 어느 것도 실리지 않았다.** `deploy.yml` 의 `_site`
// 조립이 두 파일을 복사하지 않고, 어느 페이지에도 크레딧 링크가 없었다.
//
// 실측으로 확인한 것(executor, 2026-07-31): 번들 산출물에는 `@license` 주석이
// **살아남는다**(three 청크 3개 전부 + PeerJS). 즉 법적 최소요건은 이미 만족하고
// 있었다 — 이 페이지는 위반 해소가 아니라 **사람이 찾을 수 있는 고지**를 만드는 것이다.
// 미니파이된 JS 안의 주석은 기계는 읽어도 방문자는 못 읽는다.
//
// ── 왜 마크다운을 소스로 두는가 ────────────────────────────────────────────
// 고지 내용을 HTML 에 다시 적으면 `THIRD-PARTY-NOTICES.md` 와 페이지가 따로 논다.
// 이 저장소가 세 번 데인 값 미러링이다. 마크다운이 SSOT 고 페이지는 그것의 렌더다 —
// 의존성을 추가하면 여기만 고쳐도 페이지가 따라온다.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shell, SITE } from './lib/site-shell.mjs';
import { mdToHtml } from './lib/md-to-html.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'making', 'licenses');

const notices = readFileSync(join(ROOT, 'THIRD-PARTY-NOTICES.md'), 'utf8');
const license = readFileSync(join(ROOT, 'LICENSE'), 'utf8');

// 마크다운 문서의 첫 `# 제목` 은 셸이 `<h1>` 을 따로 그리므로 본문에서 뺀다.
// (안 빼면 h1 이 두 개가 되어 문서 구조가 어긋난다 — 접근성 감사에 걸린다.)
const noticesBody = notices.replace(/^#\s+.*\n/, '');

// `LICENSE` 는 마크다운이 아니라 평문이다. 렌더하지 않고 `<pre>` 로 그대로 싣는다 —
// 라이선스 전문은 **한 글자도 바뀌면 안 되는 텍스트**라 변환을 태우지 않는다.
const escPre = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `
.lic-lead{color:var(--ink-body);font-size:14.5px;line-height:1.75;margin:0 0 30px}
.lic-lead strong{color:var(--ink)}
article h2{font-size:16px;color:var(--g800);margin:36px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
article h3{font-size:14.5px;color:var(--g800);margin:26px 0 10px;padding-left:10px;border-left:3px solid var(--g300)}
article p{color:var(--ink-body);font-size:14px;line-height:1.75}
article ul{margin:0 0 16px;padding-left:20px}
article li{margin:0 0 6px;color:var(--ink-body);font-size:14px}
article strong{color:var(--ink)}
article a{color:var(--gold-text)}
article code{background:var(--paper-deep);border:1px solid var(--line);border-radius:var(--r);padding:1px 5px;font-size:12.5px}
article pre{background:var(--g900);color:#e8efe9;padding:16px 18px;border-radius:var(--r);overflow-x:auto;
font-size:12px;line-height:1.65;white-space:pre-wrap;word-break:break-word}
article pre code{background:none;border:none;color:inherit;padding:0}
article hr{border:0;border-top:1px solid var(--line);margin:34px 0}
.tbl{overflow-x:auto;margin:0 0 16px}
table{border-collapse:collapse;font-size:13px;min-width:420px}
th,td{border:1px solid var(--line);padding:7px 12px;text-align:left;color:var(--ink-body)}
th{background:var(--paper-deep);color:var(--ink);font-weight:600}
.back{display:inline-block;margin-bottom:26px;font-size:13px}
details.own-lic{margin:0 0 10px;border:1px solid var(--line);border-radius:var(--r);background:var(--panel);overflow:hidden}
details.own-lic summary{cursor:pointer;padding:14px 18px;font-size:14px;font-weight:600;color:var(--ink);list-style:revert}
details.own-lic[open] summary{border-bottom:1px solid var(--line)}
details.own-lic .body{padding:16px 18px 4px}
`;

const bodyHtml = `
<a class="back" href="../">← 만드는 이야기</a>
<article>
<div class="eyebrow">Open Source</div>
<h1>오픈소스 고지</h1>
<p class="lic-lead">${SITE}는 아래의 오픈소스 소프트웨어와 에셋 위에 만들어졌습니다.
만든 사람들에게 빚을 지고 있고, 각 라이선스가 요구하는 대로 <strong>저작권 고지를 그대로 싣습니다.</strong><br>
외부 호스트를 쓰지 않는 것이 이 사이트의 원칙이라 모든 파일을 저희가 직접 호스팅하며,
그만큼 <strong>배포되는 사본에 고지를 함께 실을 책임</strong>도 저희에게 있습니다.</p>

${mdToHtml(noticesBody, { headings: true })}

<h2>${SITE} 자체 라이선스</h2>
<details class="own-lic">
<summary>본 프로젝트의 라이선스 전문 보기</summary>
<div class="body"><pre><code>${escPre(license)}</code></pre></div>
</details>
</article>`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'index.html'), shell({
  title: `오픈소스 고지 — ${SITE}`,
  desc: `${SITE}가 사용하는 오픈소스 소프트웨어와 에셋의 저작권 고지 및 라이선스 전문.`,
  path: '/making/licenses/',
  bodyHtml,
  css: CSS,
  depth: 2,
  footerNote: '만든 사람들에게 빚을 지고 있습니다.',
}));

console.log('licenses: THIRD-PARTY-NOTICES.md + LICENSE → making/licenses/');
