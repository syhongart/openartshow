// scripts/smoke/snapshot-styles.mjs
//
// CSS 색 리팩터의 "화면이 안 바뀌었다"를 눈이 아니라 기계가 보증한다.
//
// 왜 스크린샷이 아니라 computed style 인가 —
//   ① 픽셀 비교는 안티에일리어싱·폰트 힌팅·스크롤 위치에 흔들려 거짓 차이를 낸다.
//   ② 반대로 "1픽셀도 안 겹치는 요소의 색이 바뀐 것"은 스크린샷에 안 잡힌다
//      (화면 밖·hover 전용·조건부 표시). 실제로 이 저장소는 "화면에 안 나오는 것은
//      못 잡는다" 는 한계로 한 번 데었다(info.memory 누수 건).
//   getComputedStyle 은 브라우저가 최종 확정한 값이라 두 문제가 다 없다.
//
// 두 축을 함께 뜬다 — 한 축만으로는 구멍이 난다(실측으로 확인했다):
//   [A] 요소별 computed style — 최종 적용 결과. 실제로 보이는 것.
//   [B] 커스텀 프로퍼티 확정값 — 토큰 그 자체. 소비 여부와 무관하게 값 변화를 잡는다.
//
// 왜 [B] 가 필요한가 — [A] 만 두고 뮤테이션했더니 **통과했다.** design.html 의
// `--green-500` 은 유일한 소비처가 `.demo-card:hover` 인데, computed style 은 의사클래스
// 상태를 재현하지 않아 값이 틀려도 [A] 에 안 나타난다. [B] 는 토큰 값을 직접 비교하므로
// hover 전용이든 아무도 안 쓰는 죽은 토큰이든 전부 잡힌다.
//
// 검출력 실측(2026-07-31, design.html) — 셋 다 잡혔다:
//   · hover 전용 토큰 `--green-500` 1비트 변조(#5f9e7d→#5f9e7e) → [B] 2건
//   · 하드코딩 rgba 1비트 변조(31,214,119→31,214,120)          → [A] 8건
//   · 토큰 참조 바꿔치기 var(--accent)→var(--gold)              → [A] 20건
//
// 한계 — 정직하게 적는다:
//   · **DOM 만 본다.** <canvas> 내부(3D 씬·절차 텍스처)는 이 도구의 사각이다.
//     builder.html·world*.html 의 캔버스 안 색은 여기서 안 잡힌다.
//   · **:hover/:active/:focus 의 최종 렌더는 [A] 에 안 잡힌다.** 그 상태에서만 쓰이는
//     색을 **토큰을 거치지 않고** 리터럴로 바꾸면 두 축 다 놓친다([B] 는 토큰만 본다).
//   · 스크립트가 나중에 주입하는 스타일은 채취 시점에 달렸다(SETTLE_MS 뒤).
//   · 레이아웃(위치·크기)은 안 본다 — 색 리팩터 전용 도구다.
//   · 규칙 원문은 담지 않는다. 인라인 <style> → 외부 CSS 이동에서는 원문이 바뀌는 것이
//     정상이라, 담으면 전량 FAIL 이 나 신호가 죽는다.
//
// 사용:
//   node scripts/smoke/snapshot-styles.mjs --save <라벨> [페이지...]
//   node scripts/smoke/snapshot-styles.mjs --compare <기준라벨> [페이지...]
//   페이지 생략 시 DEFAULT_PAGES. 라벨은 OUT_DIR 아래 <라벨>.json 으로 남는다.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
import { ROOT, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS, PAGE_TIMEOUT_MS } from './config.mjs';

// 색이 실릴 수 있는 속성 전부. background-image 는 그라디언트가, box-shadow 는 글로우 틴트가
// 여기 실린다 — 토큰 교체에서 가장 잘 빠뜨리는 두 자리라 반드시 포함한다.
const COLOR_PROPS = [
  'color',
  'background-color',
  'background-image',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'box-shadow',
  'text-shadow',
  'text-decoration-color',
  'caret-color',
  'column-rule-color',
  'fill',
  'stroke',
  '-webkit-text-fill-color',
  'accent-color',
];

// 색은 아니지만 토큰 파일을 잘못 옮기면 같이 무너지는 것들(레이아웃 토큰이 섞여 있는 :root 라서).
const LAYOUT_PROPS = ['font-family', 'font-weight', 'font-size', 'letter-spacing', 'line-height', 'border-radius'];

const DEFAULT_PAGES = ['design.html', 'landing.html', 'guide.html', 'about.html', 'studio.html', 'builder.html'];

// 라이트/다크 양쪽을 뜬다 — about·guide 는 prefers-color-scheme 로 값이 갈린다.
// 한쪽만 뜨면 나머지 한쪽의 회귀가 통째로 안 보인다.
const SCHEMES = ['light', 'dark'];
const VIEWPORT = { width: 1280, height: 900 };
const SETTLE_MS = 600;

const OUT_DIR = process.env.SNAPSHOT_DIR
  || path.join(process.env.TMPDIR || '/tmp', 'oas-style-snapshots');

// 페이지 안에서 도는 채취 함수. 요소마다 DOM 경로를 키로 삼아 색 속성을 뽑는다.
function collectInPage({ colorProps, layoutProps }) {
  // 요소를 가리키는 안정적인 키. id 가 있으면 그것으로 끊고, 없으면 tag:nth 체인.
  // 리팩터가 DOM 을 안 건드리는 전제이므로 경로는 전후 동일해야 한다 — 다르면 그 자체가 신호다.
  function pathOf(el) {
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
      if (cur.id) { parts.unshift('#' + cur.id); break; }
      const parent = cur.parentElement;
      if (!parent) { parts.unshift(cur.tagName.toLowerCase()); break; }
      const tag = cur.tagName.toLowerCase();
      const sibs = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
      parts.unshift(sibs.length > 1 ? `${tag}[${sibs.indexOf(cur) + 1}]` : tag);
      cur = parent;
    }
    return parts.join('>');
  }

  // ── [A] 요소별 computed style ────────────────────────────────────────────
  const elements = {};
  const all = [document.documentElement, ...document.querySelectorAll('*')];
  for (const el of all) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'link' || tag === 'title') continue;
    const cs = getComputedStyle(el);
    const rec = {};
    for (const p of colorProps) {
      const v = cs.getPropertyValue(p);
      // 'none'/빈값은 기록하지 않는다 — 스냅샷이 의미 없이 커진다.
      if (v && v !== 'none' && v !== 'normal') rec[p] = v.trim();
    }
    for (const p of layoutProps) {
      const v = cs.getPropertyValue(p);
      if (v) rec[p] = v.trim();
    }
    const key = pathOf(el);
    // 같은 경로가 두 번 나오면(이론상 없어야 한다) 뒤엣것에 인덱스를 붙여 덮어쓰기를 막는다.
    let k = key; let n = 1;
    while (k in elements) k = `${key}~${++n}`;
    elements[k] = rec;
  }

  // ── [B] 커스텀 프로퍼티 확정값 ───────────────────────────────────────────
  // 토큰 **이름**은 스타일 원문(인라인 <style> + CSSOM)에서 긁고, **값**은 :root 기준
  // 확정값으로 조회한다. 이 축이 [A] 의 구멍을 메운다 — hover 에서만 쓰이는 토큰도,
  // 아무도 안 쓰는 죽은 토큰도 값 그대로 비교되기 때문이다.
  // (실측: [A] 만 두고 --green-500 을 변조했더니 통과했다. 유일 소비처가
  //  `.demo-card:hover` 라 computed style 에 안 나타난다.)
  //
  // 이름 수집에 CSSOM 이 아니라 **원문 텍스트**를 쓰는 이유: CSSOM 순회는 shorthand·
  // 중첩 그룹 처리에서 조용히 빠뜨렸다(규칙 89개 중 8개만 담겼다). 정규식으로 원문을
  // 긁으면 선언이든 var() 참조든 전부 걸린다.
  //
  // 규칙 원문 자체는 스냅샷에 담지 않는다 — 인라인 <style> 을 외부 CSS 로 옮기는
  // 리팩터에서는 원문이 바뀌는 것이 정상이라, 담으면 전량 FAIL 이 나 신호가 죽는다.
  const styleText = [];
  for (const el of document.querySelectorAll('style')) styleText.push(el.textContent || '');
  let unreadableSheets = 0;
  const walk = (list) => {
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.cssRules) { walk(r.cssRules); continue; }
      if (r.cssText) styleText.push(r.cssText);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { walk(sheet.cssRules); } catch { unreadableSheets++; }
  }

  const customNames = new Set();
  for (const text of styleText) {
    for (const m of String(text).matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) customNames.add(m[1]);
    for (const m of String(text).matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) customNames.add(m[1]);
  }
  const tokens = {};
  const rootCS = getComputedStyle(document.documentElement);
  for (const name of Array.from(customNames).sort()) {
    tokens[name] = rootCS.getPropertyValue(name).trim();
  }

  return { elements, tokens, meta: { unreadableSheets, tokenCount: customNames.size } };
}

async function snapshot(pages) {
  const server = await startServer(path.join(ROOT, 'frontend'));
  const browser = await chromium.launch({ executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS });
  const result = {};
  const failures = [];
  try {
    for (const page of pages) {
      for (const scheme of SCHEMES) {
        const ctx = await browser.newContext({ viewport: VIEWPORT, colorScheme: scheme });
        const p = await ctx.newPage();
        const key = `${page}::${scheme}`;
        try {
          const resp = await p.goto(`${server.origin}/${page}`, {
            waitUntil: 'load', timeout: PAGE_TIMEOUT_MS,
          });
          if (!resp || !resp.ok()) throw new Error(`HTTP ${resp ? resp.status() : 'no-response'}`);
          await p.waitForTimeout(SETTLE_MS);
          result[key] = await p.evaluate(collectInPage, { colorProps: COLOR_PROPS, layoutProps: LAYOUT_PROPS });
        } catch (e) {
          // 못 잰 것을 조용히 생략하지 않는다 — 무엇이 막았는지 스냅샷에 남긴다.
          failures.push(`${key}: ${e.message}`);
          result[key] = { __error__: { message: String(e.message) } };
        } finally {
          await ctx.close();
        }
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  return { result, failures };
}

// 이름→선언맵 두 개를 비교한다([A][B] 가 같은 모양이라 한 함수로 처리된다).
function diffSection(base, cur, page, axis, changes) {
  const names = new Set([...Object.keys(base || {}), ...Object.keys(cur || {})]);
  for (const name of names) {
    const b = base?.[name]; const c = cur?.[name];
    if (b === undefined) { changes.push({ page, axis, el: name, kind: 'added' }); continue; }
    if (c === undefined) { changes.push({ page, axis, el: name, kind: 'removed' }); continue; }
    // [B] 토큰은 값이 문자열이고, [A][C] 는 선언 객체다.
    if (typeof b === 'string' || typeof c === 'string') {
      if (b !== c) changes.push({ page, axis, el: name, kind: 'prop', prop: '(값)', from: b, to: c });
      continue;
    }
    const props = new Set([...Object.keys(b), ...Object.keys(c)]);
    for (const prop of props) {
      if (b[prop] !== c[prop]) {
        changes.push({ page, axis, el: name, kind: 'prop', prop, from: b[prop] ?? '(없음)', to: c[prop] ?? '(없음)' });
      }
    }
  }
}

// 두 스냅샷의 차이를 낸다. 축별로 구분해 돌려준다.
function diff(base, cur) {
  const changes = [];
  const keys = new Set([...Object.keys(base), ...Object.keys(cur)]);
  for (const pageKey of keys) {
    const b = base[pageKey];
    const c = cur[pageKey];
    if (!b) { changes.push({ page: pageKey, kind: 'page-added' }); continue; }
    if (!c) { changes.push({ page: pageKey, kind: 'page-removed' }); continue; }
    if (b.__error__ || c.__error__) {
      changes.push({
        page: pageKey, kind: 'page-error',
        detail: `기준=${b.__error__ ? b.__error__.message : 'ok'} / 현재=${c.__error__ ? c.__error__.message : 'ok'}`,
      });
      continue;
    }
    diffSection(b.tokens, c.tokens, pageKey, 'B:토큰', changes);
    diffSection(b.elements, c.elements, pageKey, 'A:요소', changes);
    if (b.meta?.unreadableSheets !== c.meta?.unreadableSheets) {
      changes.push({
        page: pageKey, axis: 'C:규칙', el: '(읽지 못한 스타일시트 수)', kind: 'prop', prop: 'unreadableSheets',
        from: String(b.meta?.unreadableSheets), to: String(c.meta?.unreadableSheets),
      });
    }
  }
  return changes;
}

function labelPath(label) { return path.join(OUT_DIR, `${label}.json`); }

// 축별 채취량 — "몇 개를 실제로 쟀는가" 를 보고에 그대로 쓸 수 있게 센다.
function tally(result) {
  let elements = 0; let tokens = 0;
  for (const p of Object.values(result)) {
    if (p.__error__) continue;
    elements += Object.keys(p.elements || {}).length;
    tokens += Object.keys(p.tokens || {}).length;

  }
  return `요소 ${elements} · 토큰 ${tokens}`;
}

async function main() {
  const argv = process.argv.slice(2);
  const mode = argv[0];
  const label = argv[1];
  const pages = argv.slice(2).length ? argv.slice(2) : DEFAULT_PAGES;

  if ((mode !== '--save' && mode !== '--compare') || !label) {
    console.error('사용법: snapshot-styles.mjs --save <라벨> [페이지...] | --compare <기준라벨> [페이지...]');
    process.exit(2);
  }

  console.log(`[스냅샷] 페이지 ${pages.length}개 × 스킴 ${SCHEMES.length}종 채취 중…`);

  // 검수관 권고 P4 — 한계가 주석에만 있으면 실행 결과를 읽는 사람에게 안 닿는다.
  // 3D 페이지가 목록에 있으면 "이 페이지도 검증됐다" 는 오독을 로그에서 미리 끊는다.
  const canvasPages = pages.filter((p) => /^(builder|world|world2|visit|lab-glb|index)\.html$/.test(p));
  if (canvasPages.length) {
    console.log(`  ⚠ ${canvasPages.join(', ')} — DOM(UI 크롬)만 본다. 캔버스 안 3D 씬(재질·조명)은 미검증이다.`);
  }

  const { result, failures } = await snapshot(pages);

  if (failures.length) {
    console.error(`\n[경고] 채취 실패 ${failures.length}건 — 못 잰 것은 통과가 아니다:`);
    failures.forEach((f) => console.error(`  · ${f}`));
  }

  // 검수관 권고 P2 — diff 는 기준·현재의 unreadableSheets 가 **다를 때만** 잡는다.
  // 처음부터 못 읽던 시트는 계속 같은 개수라 영원히 조용하다. 채취 시점에 알린다.
  const unread = Object.entries(result)
    .filter(([, p]) => (p.meta?.unreadableSheets || 0) > 0)
    .map(([k, p]) => `${k}: ${p.meta.unreadableSheets}개`);
  if (unread.length) {
    console.error(`\n[경고] 읽지 못한 스타일시트가 있다 — 그 시트의 토큰은 [B]축에서 빠진다:`);
    unread.forEach((u) => console.error(`  · ${u}`));
  }

  if (mode === '--save') {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(labelPath(label), JSON.stringify(result, null, 1));
    const n = tally(result);
    console.log(`[저장] ${labelPath(label)} — ${n}`);
    process.exit(failures.length ? 1 : 0);
  }

  const basePath = labelPath(label);
  if (!fs.existsSync(basePath)) {
    console.error(`[FAIL] 기준 스냅샷이 없다: ${basePath}`);
    process.exit(2);
  }
  const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
  const changes = diff(base, result);

  if (!changes.length && !failures.length) {
    const n = tally(result);
    console.log(`[PASS] 차이 0 — ${n} 전부 동일 (기준: ${label})`);
    process.exit(0);
  }

  console.error(`\n[FAIL] 차이 ${changes.length}건 (기준: ${label})`);
  const SHOW = 60;
  for (const c of changes.slice(0, SHOW)) {
    const head = `  ${c.page}${c.axis ? ` [${c.axis}]` : ''}`;
    if (c.kind === 'prop') {
      console.error(`${head}\n    ${c.el}\n      ${c.prop}: ${c.from}  →  ${c.to}`);
    } else {
      console.error(`${head}${c.el ? '\n    ' + c.el : ''} [${c.kind}]${c.detail ? ' ' + c.detail : ''}`);
    }
  }
  // 축별 집계 — 어느 축이 잡았는지가 원인 추적의 첫 단서다.
  const byAxis = {};
  for (const c of changes) byAxis[c.axis || '(페이지)'] = (byAxis[c.axis || '(페이지)'] || 0) + 1;
  console.error(`\n  축별: ${Object.entries(byAxis).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
  if (changes.length > SHOW) console.error(`  … 그리고 ${changes.length - SHOW}건 더`);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(2); });
