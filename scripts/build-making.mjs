#!/usr/bin/env node
// /making/ 허브 인덱스 생성기
// 실행: node scripts/build-making.mjs   (저장소 루트 기준)
// 산출: making/index.html, 리다이렉트 스텁 3개(devlog/team/valuation), sitemap.xml, robots.txt

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shell } from './lib/site-shell.mjs';
import { calculateTeamComposition } from './lib/devlog-contributors.mjs';
import { countEntries, parseEntries } from './lib/devlog-entries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_HUB = join(ROOT, 'making');

// 개발일지 · 팀 정보
const devlogSrc = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8');
const devlogCount = countEntries(devlogSrc); // SSOT
const teamComposition = calculateTeamComposition(devlogSrc); // SSOT

// 고유 CSS (허브는 간단한 카드만)
const CSS = `
/* 카드 수가 늘어도 빈 칸이 안 생기게 auto-fit. 3개일 때 3열이던 것을 4개(코드 구조
   추가)에서 고정 3열로 두면 마지막 줄에 한 칸이 뜬다 — 개수를 세는 대신 브라우저가
   맞추게 한다(카드가 또 늘어도 이 줄을 안 고쳐도 된다). */
.hub-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px;margin:30px 0}
.hub-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:24px;
transition:border-color .2s,transform .2s;text-decoration:none;color:inherit;display:flex;flex-direction:column}
.hub-card:hover{border-color:var(--g300);transform:translateY(-1px)}
.hub-card .icon{font-size:32px;margin-bottom:8px}
.hub-card h2{font-size:18px;margin:0 0 8px;color:var(--ink);font-weight:600}
.hub-card p{margin:0;font-size:13.5px;color:var(--ink-body)}
.hub-card .count{font-size:24px;font-weight:700;color:var(--g700);margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
@media(max-width:640px){.hub-cards{grid-template-columns:1fr}}
`;

// 허브 인덱스 페이지 바디
const bodyHtml = `
<div class="eyebrow">Making Hub</div>
<h1>만드는 이야기</h1>
<p class="lead">OpenArtShow를 만드는 과정을 기록하고 공개합니다.<br>
성능·디자인·법무·브랜드에서 마주친 문제의 원인, 분석, 개선, 결과를 남깁니다.</p>

<div class="hub-cards">
  <a href="./devlog/" class="hub-card">
    <div class="icon">📝</div>
    <h2>개발일지</h2>
    <p>링크 하나로 열리는 3D 미술관을 만드는 과정. 원인 · 분석 · 개선 · 결과.</p>
    <div class="count">${devlogCount}개 기록</div>
  </a>
  <a href="./team/" class="hub-card">
    <div class="icon">👥</div>
    <h2>팀</h2>
    <p>감독과 AI, 그리고 전문 계약직이 함께 만듭니다. 인사기록과 기여도 추적.</p>
    <div class="count">${teamComposition.total}명 (창업자 ${teamComposition.founder} · 정규직 ${teamComposition.staff} · 계약직 ${teamComposition.contract})</div>
  </a>
  <a href="./valuation/" class="hub-card">
    <div class="icon">📈</div>
    <h2>밸류에이션</h2>
    <p>결과물과 트랙션으로 매일 자동 산출. 50억 목표까지의 경로를 추적합니다.</p>
    <div class="count">매일 갱신</div>
  </a>
  <a href="./architecture/" class="hub-card">
    <div class="icon">🧱</div>
    <h2>코드 구조</h2>
    <p>파일 구조와 규모를 배포할 때마다 다시 잽니다. 아키텍처의 강점과 치르는 값을 함께 적습니다.</p>
    <div class="count">매 배포 실측</div>
  </a>
</div>
`;

mkdirSync(OUT_HUB, { recursive: true });

// 허브 인덱스
writeFileSync(join(OUT_HUB, 'index.html'), shell({
  title: '만드는 이야기 — OpenArtShow',
  desc: 'OpenArtShow를 만드는 과정의 개발일지, 팀 인사기록, 시장가치 추적.',
  path: '/making/',
  og: 'website',
  css: CSS,
  depth: 1,
  bodyHtml,
}));

// 리다이렉트 스텁 3개 — 개별 글 URL(141개)은 비용 대비 실익이 없어 생성하지 않음.
// 이는 의도한 손실이고, 대신 리다이렉트 스텁으로 메인 인덱스 경로만 덮는다.
const redirectHtml = (newPath) => `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=../making/${newPath}/">
<link rel="canonical" href="https://syhongart.github.io/openartshow/making/${newPath}/">
<title>리다이렉트</title>
</head>
<body>
<p><a href="../making/${newPath}/">이 페이지는 <code>making/${newPath}/</code>로 옮겨졌습니다.</a></p>
</body>
</html>`;

mkdirSync(join(ROOT, 'devlog'), { recursive: true });
mkdirSync(join(ROOT, 'team'), { recursive: true });
mkdirSync(join(ROOT, 'valuation'), { recursive: true });

writeFileSync(join(ROOT, 'devlog/index.html'), redirectHtml('devlog'));
writeFileSync(join(ROOT, 'team/index.html'), redirectHtml('team'));
writeFileSync(join(ROOT, 'valuation/index.html'), redirectHtml('valuation'));

// sitemap — 모든 페이지를 통합 생성
const baseUrl = 'https://syhongart.github.io/openartshow';
// 파싱은 SSOT 경유(`devlog-entries.mjs`) — 자체 정규식을 두면 제목 줄의 시각을
// 모르는 파서가 되고, 그 순간 항목을 조용히 버려 sitemap 의 lastmod 가 낡는다.
const devlogEntries = parseEntries(devlogSrc);

const lastDate = devlogEntries.length > 0 ? devlogEntries[0].date : new Date().toISOString().slice(0, 10);

const urls = [
  { loc: `${baseUrl}/`, mod: lastDate },
  { loc: `${baseUrl}/making/`, mod: lastDate },
  { loc: `${baseUrl}/making/devlog/`, mod: lastDate },
  { loc: `${baseUrl}/making/team/`, mod: lastDate },
  { loc: `${baseUrl}/making/valuation/`, mod: lastDate },
  { loc: `${baseUrl}/guide.html`, mod: lastDate },
  // 🔴 2026-08-23 `app/world.html` → `app/world2.html` (감독 지시 «월드 1로 승격»).
  // 랜딩의 «오픈월드 입장» 이 가리키는 곳과 **같아야** 한다 — 색인된 주소와 실제 진입점이
  // 갈리면 검색으로 온 방문자만 강등된 페이지를 본다. 노출 상태의 SSOT 는
  // `scripts/lib/entrypoints.mjs` 의 `exposure` 다.
  // ⚠ `mod` 는 **이번 승격일**로 갱신한다. 예전 값(2026-07-20)은 world1 의 승격일이라
  // 다른 페이지의 날짜를 물려받는 셈이 된다.
  { loc: `${baseUrl}/app/world2.html`, mod: '2026-08-23' },
  // 개별 글 URL(devlog/<slug>.html)은 의도한 손실 — 141건의 비용 대비 실익 없음.
  // 리다이렉트 스텁(devlog/index.html, team/index.html, valuation/index.html)도 색인 제외.
];

writeFileSync(join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.mod}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`);

writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`);

console.log(`making: 허브 인덱스 + 리다이렉트 스텁 3개 + sitemap.xml + robots.txt`);
