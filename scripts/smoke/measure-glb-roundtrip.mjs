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
// · **로더 호환성.** ⚠ 이 항목이 한때 *"`packGlb` 는 BIN 청크를 안 쓴다 … 되읽기
//   경로를 재는 데는 충분하다"* 였고 **그 전제가 무너졌다**(2026-08-25). 되읽기가
//   남의 메시를 GLTFLoader 로 올리게 되면서 BIN 이 필요해졌고, BIN 없는 편집본은
//   로더를 `null.slice` 로 죽인다. 즉 이 스크립트는 **감독이 블렌더에서 낸 파일을
//   재현하지 못하고 있었다.** 지금은 원본 BIN 을 그대로 옮긴다.
//   그래도 블렌더 출력 자체는 아니다 — 노드 계층·재질 이름·확장을 블렌더가 어떻게
//   바꾸는지는 이 스크립트가 흉내내지 않는다.

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

/** 원본 GLB 에서 BIN 청크의 바이트 범위를 찾는다. 없으면 `null` */
function findBin(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let at = 20 + dv.getUint32(JSON_LEN_OFFSET, true);
  while (at + 8 <= buf.length) {
    const len = dv.getUint32(at, true);
    if (dv.getUint32(at + 4, true) === 0x004e4942) return buf.subarray(at + 8, at + 8 + len);
    at += 8 + len;
  }
  return null;
}

/**
 * 편집본을 조립한다. **원본 BIN 을 반드시 옮긴다.**
 *
 * ⚠ 이 함수가 오래 BIN 을 **안 붙이고 있었다.** 검수관이 권고 P-b 로 그 한계를 적어
 * 뒀는데(«우리 `import-glb.ts` 는 JSON 만 읽으므로 무해하지만 「블렌더가 낸 파일」의
 * 충실도는 아니다») 되읽기가 GLTFLoader 를 쓰게 되면서 **실제 결함으로 물렸다** —
 * 버퍼를 약속하고 BIN 이 없는 GLB 는 로더가 `null.slice` 로 죽는다.
 *
 * 그래서 이 스크립트가 만든 편집본은 **감독이 블렌더에서 낸 파일을 재현하지 못했고**,
 * 통과한 회차가 실제로는 그 경로를 안 밟은 것이었다. 「못 잰 것이 통과로 적히는」 형태다.
 */
function packGlb(gltf, out, srcBin) {
  const b = new TextEncoder().encode(JSON.stringify(gltf));
  const pad = (4 - (b.length % 4)) % 4;
  const jsonLen = b.length + pad;
  const binLen = srcBin ? srcBin.length + ((4 - (srcBin.length % 4)) % 4) : 0;
  const total = 20 + jsonLen + (srcBin ? 8 + binLen : 0);
  const o = Buffer.alloc(total);
  o.writeUInt32LE(0x46546c67, 0); o.writeUInt32LE(2, 4); o.writeUInt32LE(total, 8);
  o.writeUInt32LE(jsonLen, JSON_LEN_OFFSET); o.writeUInt32LE(0x4e4f534a, 16);
  Buffer.from(b).copy(o, 20);
  for (let i = 0; i < pad; i++) o[20 + b.length + i] = 0x20;
  if (srcBin) {
    const at = 20 + jsonLen;
    o.writeUInt32LE(binLen, at); o.writeUInt32LE(0x004e4942, at + 4);
    srcBin.copy(o, at + 8);
  }
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
    // **키 합집합**으로 돈다(검수관 권고 P-c) — `sumA` 키만 돌면 «재출력에만 생긴
    // 종류» 를 못 본다. 무편집 왕복에서 종류가 새로 생기는 것도 결함이다.
    for (const kind of new Set([...Object.keys(sumA.counts), ...Object.keys(sumP.counts)])) {
      const a = sumA.counts[kind] ?? 0, b = sumP.counts[kind] ?? 0;
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
      packGlb(edited, fileE, findBin(A.buf));

      const labelEdit = await importFile(page, fileE);
      if (!labelEdit.startsWith('✓')) fail(`편집본 되읽기 라벨이 ✓ 가 아니다: ${labelEdit}`);
      const fileB = await exportOnce(page, 'w2-roundtrip-B.glb');
      const sumB = summarize(readGlb(fileB).json);

      const dx = sumB.buildingAvgX - sumA.buildingAvgX;
      if (Math.abs(dx - MOVE_X) < 0.01) ok(`building 이동 ${dx.toFixed(3)}m`);
      else fail(`building 이동 ${dx.toFixed(3)}m (기대 ${MOVE_X})`);

      if (sumB.counts.tree === keep) ok(`tree ${sumA.counts.tree} → ${keep}`);
      else fail(`tree ${sumB.counts.tree} (기대 ${keep})`);

      // ── 나무를 지우면 무엇이 따라 주는가 (검수관 조건 3, 2026-08-25) ────────
      // ⚠ 여기 *"`treepit`·`shadow:tree` 는 나무에서 **유도**되므로 함께 줄어드는 것이
      // 정상이다"* 라고 적혀 있었고 **`treepit` 에 대해 거짓이었다.** 그리고 그 거짓
      // 진술이 제외 목록의 근거로 쓰여 **검사가 그 종류를 아무것도 안 봤다** — 블로커
      // 였던 판본과 정확히 같은 형태다(진술이 검사를 무력화한다).
      //
      // 실측: 나무를 절반으로 줄이면 `shadow:tree` 만 따라 줄고 `treepit` 은 **전량
      // 그대로**다. 되읽기가 재유도하는 것은 `withShadows` 뿐이고(`host.ts`), pit 은
      // GLB 노드로 실려 오기 때문이다.
      //
      // 그것이 설계와 일관된다 — GLB 는 **세계 전체 대체** 모델이라 파일에 있는 노드가
      // 곧 세계다. 블렌더에서 나무만 지우고 pit 을 남긴 것은 사용자의 선택이고, pit 도
      // 지우면 함께 사라진다. 그러므로 여기서는 「함께 준다」가 아니라 **「원본 전량
      // 그대로」를 단언**할 수 있다 — 제외가 아니라 검사다.
      if (sumB.counts.treepit === sumA.counts.treepit) ok(`treepit ${sumA.counts.treepit} 전량 유지(재유도 대상 아님)`);
      else fail(`treepit ${sumA.counts.treepit} → ${sumB.counts.treepit ?? 0} (GLB 노드 그대로 실려야 한다)`);

      if (sumB.counts['shadow:tree'] === keep) ok(`shadow:tree ${keep} (캐스터 따라 재유도)`);
      else fail(`shadow:tree ${sumB.counts['shadow:tree'] ?? 0} (기대 ${keep} — withShadows 재유도)`);

      // 남은 종류는 편집이 옆으로 번지지 않았는지만 본다. 위에서 개별 단언한 것만 뺀다.
      // ⚠ **키 합집합**으로 돈다(검수관 권고 P-c) — 원본에 없고 재출력에만 생긴 종류도
      // 결함이다. `sumA` 키만 돌면 그것을 못 본다.
      const asserted = new Set(['tree', 'treepit', 'shadow:tree', 'building', 'shadow:building']);
      for (const kind of new Set([...Object.keys(sumA.counts), ...Object.keys(sumB.counts)])) {
        if (asserted.has(kind)) continue;
        if ((sumA.counts[kind] ?? 0) !== (sumB.counts[kind] ?? 0)) {
          fail(`${kind} ${sumA.counts[kind] ?? 0} → ${sumB.counts[kind] ?? 0} (편집이 번졌다)`);
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
