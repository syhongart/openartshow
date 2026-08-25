#!/usr/bin/env node
// world2 GLB 내보내기·되읽기를 **브라우저 경로로** 재고 판정한다.
//
// ── 이 파일이 앞선 판본을 대체한다 (검수관 블로커 1, 2026-08-25) ─────────────
// 여기 `test-glb-export.mjs` 라는 343줄짜리가 있었고 **판정이 하나도 없었다.** 게다가
// GLB 파싱이 스펙 위반이라 **반드시 실패**했는데, 실패를 `console.error` 로 적고 그대로
// 흘러가 항상 `exit 0` 이었다:
//
//     const length1 = buffer1.readUInt32LE(8);   // ← 전체 파일 길이다
//
// glTF 2.0 에서 offset 8 은 **전체 파일 길이**이고 JSON 청크 길이는 **offset 12** 다
// (`three/examples/jsm/exporters/GLTFExporter.js` 가 `setUint32(8, totalByteLength)` 로
// 그렇게 쓴다). 같은 저장소의 `frontend/js/world2/export/import-glb.ts` 는 이것을 옳게
// 하고 있었다 — **규약이 두 곳에 다르게 적혔고 한쪽이 틀렸다.** 여기서는 그 SSOT 를
// 그대로 따른다(`JSON_LEN_OFFSET`).
//
// 그 파일의 진짜 문제는 파싱이 아니라 **판정이 없다는 것**이었다. 측정만 하고 표를
// 찍으면 «못 잰 것이 통과로 적히는» 그 형태가 된다 — 실제로 왕복·충돌 구간 전체가
// 건너뛰어진 채 초록으로 보였다.
//
// ── 왜 `measure-*` 인가 (게이트가 아니다) ───────────────────────────────────
// 이름에 `test-` 가 붙어 `scripts/smoke/` 에 놓이면 다음 사람이 **게이트로 읽는다.**
// 이것은 게이트가 아니다 — 어디에서도 CI 에 물려 있지 않고, 따라서 **배포를 막지
// 않는다.** `measure:invariants`·`measure:sky-warm` 과 같은 지위의 진단 도구다.
// 다만 진단 도구도 **판정은 한다**(FAIL 이면 아래 표를 보고 원인을 찾는다).
//
// CI 에 물릴 것인가는 별개 결정이다 — 브라우저를 띄우므로 소요가 길고, 그 판단은
// 게이트 경계 문제라 팀장 사안이다.
//
// ── 무엇을 판정하는가 (검수관 G-1 명세) ────────────────────────────────────
//   ① GLB JSON 청크 파싱 실패
//   ② **무편집 왕복**에서 nodes/meshes/materials 가 원본↔재출력 불일치
//   ③ console.error 또는 pageerror ≥ 1
//   ④ 되읽기 버튼 라벨이 '✓' 로 시작하지 않음
//   ⑤ **편집 왕복**에서 편집이 반영되지 않음(building 이동 · tree 감소)
//
// 절대값으로 판정하지 않는다 — exporter 버전이 바뀌면 노드 수가 변할 수 있다.
// **원본 대비 동일성**과 **편집 대비 기대값**으로만 본다.
//
// ── 못 잡는 것 (통과가 무엇을 뜻하지 않는지) ────────────────────────────────
// · 화면에 실제로 그려졌는가 — 노드가 있어도 슬롯이 마르면 안 보인다(`starved` 소관).
// · 좌표의 의미론적 정확성 — 도시가 통째로 밀려도 «동일» 이면 통과한다.
// · WebGPU — 헤드리스는 WebGL(swiftshader)이고 감독 실기기는 WebGPU 다.
// · 시각 회귀 · 성능.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { startServer } from './server.mjs';
import { launchBrowser } from './browser-checks.mjs';
import { assembleSiteVite } from './assemble.mjs';
import { SITE_DIR, BASE_PATH } from './config.mjs';

/** glTF 2.0 헤더에서 **JSON 청크 길이**가 있는 자리. offset 8 은 전체 파일 길이다 */
const JSON_LEN_OFFSET = 12;

/** 편집 왕복에서 building 그룹을 옮길 거리(m) */
const MOVE_X = 7.5;

const fails = [];
const fail = (msg) => { fails.push(msg); console.log(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);

function readGlb(file) {
  const buf = fs.readFileSync(file);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const jsonLen = dv.getUint32(JSON_LEN_OFFSET, true);
  const text = new TextDecoder().decode(buf.subarray(20, 20 + jsonLen));
  return { buf, json: JSON.parse(text) };   // 파싱 실패는 던진다 — ①
}

function packGlb(gltf, out) {
  const b = new TextEncoder().encode(JSON.stringify(gltf));
  const pad = (4 - (b.length % 4)) % 4;
  const total = 20 + b.length + pad;
  const o = Buffer.alloc(total);
  o.writeUInt32LE(0x46546c67, 0); o.writeUInt32LE(2, 4); o.writeUInt32LE(total, 8);
  o.writeUInt32LE(b.length + pad, JSON_LEN_OFFSET); o.writeUInt32LE(0x4e4f534a, 16);
  Buffer.from(b).copy(o, 20);
  for (let i = 0; i < pad; i++) o[20 + b.length + i] = 0x20;
  fs.writeFileSync(out, o);
}

const groupOf = (j, name) => {
  const root = j.nodes[j.scenes[j.scene ?? 0].nodes[0]];
  for (const i of root.children ?? []) if (j.nodes[i]?.name === name) return j.nodes[i];
  return null;
};

/** 종류별 노드 수 + building 평균 x + 삼각형 수 */
function summarize(j) {
  const root = j.nodes[j.scenes[j.scene ?? 0].nodes[0]];
  const counts = {};
  let bx = 0, bn = 0, tris = 0;
  for (const gi of root.children ?? []) {
    const g = j.nodes[gi];
    const kids = g.mesh !== undefined ? [gi] : (g.children ?? []);
    counts[g.name ?? '?'] = kids.length;
    for (const ki of kids) {
      const n = j.nodes[ki];
      if (n.mesh === undefined) continue;
      for (const p of j.meshes[n.mesh].primitives) {
        const a = p.indices !== undefined ? j.accessors[p.indices] : j.accessors[p.attributes.POSITION];
        tris += a.count / 3;
      }
      if (g.name === 'building') { bx += (n.translation?.[0] ?? 0) + (g.translation?.[0] ?? 0); bn++; }
    }
  }
  return { counts, buildingAvgX: bn ? bx / bn : 0, tris };
}

async function exportOnce(page, label) {
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 900_000 }),
    page.locator('#w2-export-glb').click({ noWaitAfter: true, timeout: 120_000 }),
  ]);
  const out = path.join(os.tmpdir(), label);
  await dl.saveAs(out);
  return out;
}

async function importFile(page, file) {
  await page.locator('#w2-import-glb-file').setInputFiles(file);
  await page.waitForFunction(
    () => (document.getElementById('w2-import-glb')?.textContent ?? '').startsWith('✓'),
    null, { timeout: 300_000 },
  ).catch(() => {});
  return (await page.locator('#w2-import-glb').textContent()) ?? '';
}

async function main() {
  console.log('=== world2 GLB 왕복 측정 ===\n[1] 조립');
  assembleSiteVite(SITE_DIR);
  const html = fs.readFileSync(`${SITE_DIR}/app/world2.html`, 'utf8');
  const missing = [...new Set(html.match(/_bundle\/[A-Za-z0-9_-]+\.js/g) ?? [])]
    .filter((f) => !fs.existsSync(`${SITE_DIR}/${f}`));
  if (missing.length) { console.error('조립 미완 — MISSING:', missing.join(', ')); process.exit(1); }

  const { origin, close } = await startServer(SITE_DIR, BASE_PATH);
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [], perrs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => perrs.push(String(e)));

  try {
    console.log('[2] 부팅');
    await page.goto(`${origin}${BASE_PATH}/app/world2.html`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForFunction(() => !!window.__world2, null, { timeout: 180_000 });
    await page.locator('#w2-god-toggle').click({ noWaitAfter: true, timeout: 120_000 });
    await page.locator('#w2-export-glb').waitFor({ state: 'visible', timeout: 120_000 });

    console.log('[3] 내보내기(원본)');
    const fileA = await exportOnce(page, 'w2-roundtrip-A.glb');
    const A = readGlb(fileA);                       // ① 여기서 던지면 파싱 실패다
    const sumA = summarize(A.json);
    console.log(`    ${(fs.statSync(fileA).size / 1048576).toFixed(2)}MB · 노드 ${A.json.nodes.length}`
      + ` / 메시 ${A.json.meshes.length} / 재질 ${A.json.materials.length}`
      + ` / 이미지 ${A.json.images?.length ?? 0} · 삼각형 ${Math.round(sumA.tris).toLocaleString()}`);

    // ── ② 무편집 왕복 — 손대지 않은 파일을 되읽고 다시 내보낸다 ──────────────
    // 「원본 왕복 무손실」의 브라우저 축이다. 단위 테스트는 같은 것을 보지만 실제 GLB
    // 인코딩·파싱을 안 탄다 — 이 경로에서만 나는 손실이 있을 수 있다.
    console.log('\n[4] 무편집 왕복');
    const labelPlain = await importFile(page, fileA);
    if (!labelPlain.startsWith('✓')) fail(`되읽기 라벨이 ✓ 가 아니다: ${labelPlain}`);   // ④
    const fileP = await exportOnce(page, 'w2-roundtrip-P.glb');
    const P = readGlb(fileP);
    const sumP = summarize(P.json);
    for (const [k, v] of [['노드', 'nodes'], ['메시', 'meshes'], ['재질', 'materials']]) {
      if (A.json[v].length === P.json[v].length) ok(`${k} ${A.json[v].length} 불변`);
      else fail(`${k} ${A.json[v].length} → ${P.json[v].length} (무편집인데 바뀌었다)`);
    }
    for (const kind of Object.keys(sumA.counts)) {
      const a = sumA.counts[kind], b = sumP.counts[kind] ?? 0;
      if (a !== b) fail(`${kind} ${a} → ${b} (무편집인데 바뀌었다)`);
    }

    // ── ⑤ 편집 왕복 — 블렌더에서 만질 법한 두 가지를 흉내낸다 ────────────────
    console.log('\n[5] 편집 왕복 (building +7.5m · tree 절반)');
    const edited = JSON.parse(JSON.stringify(A.json));
    const bg = groupOf(edited, 'building');
    const tg = groupOf(edited, 'tree');
    if (!bg || !tg) { fail('building/tree 그룹을 못 찾았다 — 그룹 이름 규약이 바뀌었나'); }
    else {
      bg.translation = [(bg.translation?.[0] ?? 0) + MOVE_X, bg.translation?.[1] ?? 0, bg.translation?.[2] ?? 0];
      const keep = Math.floor(tg.children.length / 2);
      tg.children = tg.children.slice(0, keep);
      const fileE = path.join(os.tmpdir(), 'w2-roundtrip-E.glb');
      packGlb(edited, fileE);

      const labelEdit = await importFile(page, fileE);
      if (!labelEdit.startsWith('✓')) fail(`편집본 되읽기 라벨이 ✓ 가 아니다: ${labelEdit}`);
      const fileB = await exportOnce(page, 'w2-roundtrip-B.glb');
      const sumB = summarize(readGlb(fileB).json);

      const dx = sumB.buildingAvgX - sumA.buildingAvgX;
      if (Math.abs(dx - MOVE_X) < 0.01) ok(`building 이동 ${dx.toFixed(3)}m`);
      else fail(`building 이동 ${dx.toFixed(3)}m (기대 ${MOVE_X})`);

      if (sumB.counts.tree === keep) ok(`tree ${sumA.counts.tree} → ${keep}`);
      else fail(`tree ${sumB.counts.tree} (기대 ${keep})`);

      // 편집하지 않은 종류는 그대로여야 한다 — 편집이 옆으로 번지지 않았는가.
      // ⚠ `treepit`·`shadow:tree` 는 나무에서 **유도**되므로 함께 줄어드는 것이 정상이다.
      const derived = new Set(['tree', 'treepit', 'shadow:tree', 'building', 'shadow:building']);
      for (const kind of Object.keys(sumA.counts)) {
        if (derived.has(kind)) continue;
        if (sumA.counts[kind] !== (sumB.counts[kind] ?? 0)) {
          fail(`${kind} ${sumA.counts[kind]} → ${sumB.counts[kind] ?? 0} (편집이 번졌다)`);
        }
      }
    }
  } finally {
    await browser.close();
    await close();
  }

  // ── ③ 페이지 오류 — 성능 편차와 무관한 축이라 항상 판정한다 ────────────────
  console.log('');
  if (errs.length) fail(`콘솔 에러 ${errs.length}건 | ${errs.slice(0, 3).join(' | ')}`);
  else ok('콘솔 에러 0');
  if (perrs.length) fail(`pageerror ${perrs.length}건 | ${perrs.slice(0, 3).join(' | ')}`);
  else ok('pageerror 0');

  console.log(`\n판정: ${fails.length ? `FAIL (${fails.length}건)` : 'PASS'}`);
  if (fails.length) { for (const f of fails) console.log(`  · ${f}`); process.exit(1); }
}

main().catch((e) => { console.error('측정 실패:', e); process.exit(1); });
