#!/usr/bin/env node
// 성능 불변식 상시 게이트 — **개수가 상수인가.** (감독 지시 2026-07-29)
//
// ── 무엇을 지키는 게이트인가 ─────────────────────────────────────────────────
// 감독 지시: *"개발할때 성능 확보, 성능 유지하는게 모니터링하도록 해."*
//
// world1 실기기 CSV 76.5초가 원인을 확정했다. 파이프라인이 **60 → 227 로 단조증가**했고,
// 크게 늘어난 프레임이 곧 프리즈 프레임이었다:
//
//   t=23.8  stage 없음 · stage_ms 0 · pk_tri 7,691   ← 조립도 아니고 삼각형도 적은데
//           render_ms 3,677 · pipe 130→153(+23)      ← 렌더가 3.7초, 새 파이프라인 23개
//
// **"양"이 아니라 "새 조합이 처음 그려지는 것"이 비용이다.** 그래서 world1 에서 시도한
// 열 처방 중 양을 겨눈 여덟이 전부 무효였다(tri 절반 → fps 25→26, 텍스처 -58% → 불변,
// 그림자 OFF → 12회→12회). 들었던 둘은 개수를 고정한 것이었다.
//
// world2 는 부팅 때 전량 사전 할당하고 봉인해서 38 상수다. **이 게이트는 그 상수성이
// 깨지는 순간을 잡는다.** 깨지면 world1 이 겪은 것이 그대로 돌아온다.
//
// ── 왜 회전까지 도는가 ───────────────────────────────────────────────────────
// 같은 CSV 에서, **아무것도 새로 로드하지 않고 카메라만 돌렸을 때** 파이프라인이 늘었다:
//
//   t=40~65  yaw 90 고정   pipe 191 정체   fps 60
//   t=67.2   yaw →171      pipe →209       fps 10
//
// 회전은 스트리밍과 **독립된 증식 축**이다. 걷기만 시뮬하면 통째로 놓친다.
//
// ── 무엇을 안 재는가 (정직하게) ──────────────────────────────────────────────
// **프레임 시간을 재지 않는다.** 헤드리스는 swiftshader 라 절대 시간이 실기기와 무관하고,
// 이 저장소는 그 수치로 실기기를 대신하려다 여러 번 틀렸다(오늘도 예열 비용에서 +21%가
// 실기기 0 이었다). 개수는 백엔드와 무관한 카운터라 헤드리스에서도 유효하다 — **잴 수
// 있는 것만 잰다.** 프레임 판정은 감독 실기기 리포트가 유일한 수단이고 그건 그대로 둔다.
//
// 파이프라인 수는 백엔드 의존이라 **참고값**으로만 찍는다(WebGL 프로그램 ≠ WebGPU 파이프라인).
// 통과·실패는 geometry·texture 로 가른다.
//
// ── 이 게이트가 **못 잡는 것** (뮤테이션으로 확인) ───────────────────────────
// 검출력을 확인하려고 파셀마다 새 지오메트리를 만드는 결함을 일부러 심었다. 두 번 심었고
// **결과가 갈렸다:**
//
//   ① y=200 (화면 밖), frustumCulled 기본  →  PASS (못 잡음)
//   ② 카메라 앞, frustumCulled=false        →  FAIL, geometry +28 (잡음)
//
// 이유는 오늘 예열 작업에서 배운 것과 같다 — three 의 `info.memory` 는 객체를 만들 때가
// 아니라 **처음 그릴 때** 오른다. 그래서 **화면에 한 번도 안 나오는 누수는 이 게이트에
// 안 보인다.** 그런 객체도 CPU 메모리와 GPU 자원을 먹지만 카운터에는 없다.
//
// 실용적으로는 큰 구멍이 아니다 — world1 을 무너뜨린 증식은 전부 화면에 그려지는
// 파츠였고, 안 그려지는 것은 애초에 프레임을 안 먹는다. 다만 **"개수 상수 = 누수 없음"
// 이 아니다.** 메모리 누수는 별도 수단으로 봐야 한다.
//
// 실행: `npm run measure:invariants` (약 2분)

import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
import {
  SITE_DIR, BASE_PATH, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS, ROOT,
} from './config.mjs';
import { assembleSiteVite } from './assemble.mjs';
import { WORLD2_QUERY, waitForWorld2Ready } from './world2-ready.mjs';
import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 부팅 기준선을 회차별로 남기고 **직전 회차와의 차이**를 출력한다.
 *
 * ── 임계는 실측이 아니라 유도다 ─────────────────────────────────────────────
 * 치비 한 체의 **메시 수**(`CHIBI.cost.meshes`)를 **런타임에서 읽어** 임계로 쓴다.
 * 실측값(32·39)을 박거나 거기에 여유를 얹으면 두 규율에 동시에 걸린다 —
 * *"실측에 여유를 얹은 값은 근거가 아니다"* 와 *"값 미러링"* 이다. 레지스트리에서
 * 읽으면 아바타 구성이 바뀔 때 임계가 **저절로 따라온다.**
 *
 * 왜 하필 한 체 분량인가: 세션 간 흔들림의 정체가 "한 체가 잡히거나 안 잡히거나" 였다.
 * 그보다 큰 도약은 그 흔들림으로 설명되지 않는 것이고, 그때가 봐야 할 순간이다.
 *
 * ⚠ **재는 양과 유도한 양이 정확히 같지는 않다** (검수관 R4). 비교 대상은
 * `info.memory.geometries` 인데 임계는 **메시 수**다. 지오메트리를 공유하는 메시가
 * 있으면 geometries ≤ meshes 이므로 임계가 실제보다 **느슨한 쪽**으로 어긋난다.
 * 방향이 안전한 쪽이라 이대로 두되, 정확히 하려면 레지스트리가 지오 축을 함께
 * 들어야 한다. **"한 체 분량" 이라는 뭉뚱그린 말로 덮지 않는다** — 이 저장소가
 * *"값이 아니라 재는 축이 틀린다"* 로 이름 붙인 형태가 여기 남아 있다.
 *
 * ── 이 축이 **못 보는 것** (검수관 S2 — 적지 않으면 관측이 장식이 된다) ──────
 * 잔여 잡음이 32 이고 임계가 45 다. 그 사이, 즉 **45 미만의 실제 부팅 증가는 잡음과
 * 구별되지 않아 영구히 안 보인다.** 리얼리티 회차가 매번 30 안팎씩 늘리면 이 축은
 * 한 번도 안 울린다. 알고 쓰는 한계이지 해결된 문제가 아니다.
 *
 * ── 기록 파일은 커밋하지 않는다 ────────────────────────────────────────────
 * `docs/valuation-history.json` 이 스모크 부산물로 매번 워킹트리를 더럽혀 손으로
 * 되돌리는 일이 반복됐다(태스크 #168). 같은 것을 또 만들지 않는다.
 * 그래서 CI 처럼 매번 새 러너인 곳에서는 직전 값이 없고, 그 사실을 그대로 적는다 —
 * **"첫 기록" 을 "변화 없음" 으로 적지 않는다.**
 */
const BASELINE_LOG = join(ROOT, '.smoke-baseline.jsonl');

async function trackBaseline(base, page, log) {
  // 임계를 못 읽으면 비교를 하지 않는다. 임의의 기본값을 넣으면 그 순간 유도가 아니다.
  const each = await page.evaluate(() => window.__world2?.stats?.()?.npc?.chibiEach ?? null);
  const limit = each && typeof each.meshes === 'number' ? each.meshes : null;

  let prev = null;
  if (existsSync(BASELINE_LOG)) {
    const lines = readFileSync(BASELINE_LOG, 'utf8').trim().split('\n').filter(Boolean);
    if (lines.length) { try { prev = JSON.parse(lines[lines.length - 1]); } catch { prev = null; } }
  }

  // 리포트로 **되돌려 준다.** 여기 `log` 는 `run.mjs` 에서 `quiet` 로 들어오므로
  // 화면에 안 나온다 — 파일에만 남기면 사람이 못 읽고, 그 순간 관측은 장식이 된다
  // (팀장 조건 3: 회차 리포트에 필수 필드로 둔다).
  let note;
  log('[기준선 추이] 부팅 시 확정값 — 아래 판정(델타)이 못 보는 축이다');
  if (!prev) {
    log('  직전 기록 없음 — 이번이 첫 회차다(비교 불가, 변화 없음이 아니다)');
    note = '첫 회차(비교 불가 — 변화 없음이 아니다)';
  } else {
    const d = (k) => (base[k] == null || prev[k] == null ? null : base[k] - prev[k]);
    const [dg, dt, dp] = [d('geo'), d('tex'), d('pipe')];
    const fmt = (v) => (v == null ? '?' : `${v >= 0 ? '+' : ''}${v}`);
    log(`  직전 대비  geo ${fmt(dg)}  tex ${fmt(dt)}  pipe ${fmt(dp)}`);
    const d3 = `직전 대비 geo ${fmt(dg)} tex ${fmt(dt)} pipe ${fmt(dp)}`;
    if (limit == null) {
      log('  ⚠ 임계를 못 읽었다(`npc.chibiEach.meshes` 부재) — 판정 생략. 추측으로 메우지 않는다');
      note = `${d3} · 임계 미확인(판정 생략)`;
    } else if (dg != null && Math.abs(dg) >= limit) {
      log(`  ⚠ WARN — geo 변화 ${fmt(dg)} 가 치비 한 체의 메시 수(${limit}) 이상이다.`);
      log('    세션 간 편차로 설명되지 않는 크기다. 이 회차에 무엇을 늘렸는지 확인하라.');
      note = `⚠ WARN — ${d3} · geo 변화가 치비 한 체(${limit}) 이상`;
    } else {
      log(`  변화가 치비 한 체의 메시 수(${limit}) 미만 — 세션 간 편차 범위다`);
      note = `${d3} · 한 체(${limit}) 미만`;
    }
  }
  // ── 기록 실패가 판정을 죽이지 않게 한다 (검수관 BL-2, 2026-08-02) ───────────
  // 원래 여기 *"판정에 영향을 주지 않는다(종료코드 무관)"* 라고만 적혀 있었고 `try` 가
  // 없었다. **그 보증이 거짓이었다** — `run.mjs` 가 `runInvariants` 의 예외를 잡아
  // `[7]` 을 FAIL 로 적고, 그 catch 는 observe 모드에서도 FAIL 로 남긴다(페이지 에러와
  // 같은 취급이다). 즉 **파일 쓰기 실패 하나가 성능 게이트를 빨갛게 만들 수 있었다.**
  //
  // 이 저장소가 반복해서 잡아온 *"못 잰 것이 통과로 적힌다"* 의 거울상이다 —
  // **영향 있는 것이 무관으로 적혔다.** 보증을 적었으면 그 보증이 참이어야 한다.
  try {
    appendFileSync(BASELINE_LOG, `${JSON.stringify({ geo: base.geo, tex: base.tex, pipe: base.pipe })}\n`);
  } catch (e) {
    log(`  기록 실패 — ${e.message} (판정은 계속한다. 다음 회차는 "첫 기록" 으로 뜬다)`);
    note = `${note} · 기록 실패(${e.message})`;
  }
  return note;
}

/** 회전 스텝 — 360°를 이 수로 나눠 돈다 */
const SPIN_STEPS = 12;
/** 한 스텝 뒤 렌더가 실제로 일어나게 기다리는 시간(ms). 헤드리스는 ~4fps다 */
const STEP_MS = 700;
/** 직진 구간 수. 파셀 경계를 여러 번 넘어야 스트리밍 증식이 드러난다 */
const WALK_LEGS = 6;
const WALK_MS = 1500;

const show = (v) => (v === undefined || v === null ? '측정실패(값 없음)' : String(v));

async function counts(page) {
  return page.evaluate(() => {
    const s = window.__world2?.stats?.();
    if (!s) return null;
    return {
      geo: s.frame?.geometries ?? null,
      tex: s.frame?.textures ?? null,
      pipe: s.pipelines ?? null,
      draw: s.frame?.draw ?? null,
      parcels: s.stream?.loaded ?? null,
      built: s.stream?.built ?? null,
    };
  });
}

/** `__world2` 조작 훅. 없으면 **측정 실패**다 — 조작 못 한 것을 통과로 적지 않는다. */
async function drive(page, fn, ...args) {
  const ok = await page.evaluate(
    ([name, a]) => {
      const w = window.__world2;
      if (!w || typeof w[name] !== 'function') return false;
      w[name](...a);
      return true;
    },
    [fn, args],
  );
  if (!ok) throw new Error(`__world2.${fn}() 를 못 불렀다 — 조작 훅이 없어 세션 시뮬이 성립하지 않는다`);
}

/**
 * 드로우콜 대조군 쿼리 — **사람과 GLB 를 끈 세계.**
 *
 * ── 왜 별도 세션인가 (태스크 #208) ──────────────────────────────────────────
 * 기본 세션에서는 `draw` 를 **판정할 수 없다.** `npc`·`glb-city` 가 조건 없이
 * `drawGroupKey: () => null` 을 내고, 그 근거가 맞기 때문이다 — NPC 가 있으면 카메라를
 * 돌리는 것만으로 절두체 컬링이 달라져 드로우콜은 **정의상** 상수가 아니다.
 *
 * 그래서 감독 리포트에 `draw - 측정 안 됨(표본 0)` 이 두 번 찍혔고(#176), 그동안
 * **draw 만 늘어나는 회귀는 아무도 못 잡았다.** 다른 세 축(geo·tex·pipe)이 상수라
 * 위험이 낮아 보였을 뿐이다.
 *
 * ⚠ **이 쿼리로 기본 세션을 대체하지 않는다.** 이 파일의 형제인 `world2-ready.mjs` 가
 * 정확히 그 실수를 기록하고 있다 — 게이트 넷이 `npc=0&vrm=0` 을 켜 둔 채
 * *"개수가 상수다"* 를 선언했고, 그것은 **라이브에 없는 조건의 세계**였다. 대조군은
 * draw 축 하나를 열려고 **추가**하는 것이고, 라이브 상태 판정은 기본 세션이 그대로 한다.
 *
 * `npc=0` 만으로는 안 꺼진다 — `npc.ts` 의 `create` 가 `count<=0 && vrmCount<=0` 일 때만
 * `null` 을 낸다. 이 문자열의 근거는 각 기능의 `drawBlockHint` 다.
 */
export const DRAW_CONTROL_QUERY = `${WORLD2_QUERY}&npc=0&vrm=0&glb=0`;

/**
 * 게이트 본체. **브라우저·서버를 주입받는다** — 스모크 하네스가 이미 세워 둔 것을 다시
 * 세우면 vite 빌드가 한 번 더 돌고, 그 시간이 곧 "게이트를 안 돌리는 이유"가 된다.
 *
 * @param {{browser: import('playwright-core').Browser, origin: string, basePath: string,
 *          log?: (s: string) => void, query?: string, judgeDraw?: boolean}} env
 *   `query` 는 접속 URL 쿼리(기본 = 라이브 상태). `judgeDraw` 는 드로우콜을 **판정에
 *   포함**할지 — 대조군에서만 true 다(기본 세션에서는 정의상 상수가 아니라 무의미하다).
 * @returns {Promise<{pass: boolean, maxGeo: number, maxTex: number, maxPipe: number,
 *                    maxDraw: number, rows: unknown[], errors: string[], base: unknown}>}
 */
export async function runInvariants({
  browser, origin, basePath, log = console.log,
  query = WORLD2_QUERY, judgeDraw = false,
}) {
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 640 } });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));

    // GLB 가 기본 노출로 바뀐 뒤 게이트도 기본 상태를 재야 한다. 대기는 world2-ready.mjs 소유.
    const url = `${origin}${basePath}app/world2.html${query}`;
    log(`접속: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    const ready = await waitForWorld2Ready(page);
    if (ready.reason) throw new Error(ready.reason);
    // 초기 파셀이 다 붙을 때까지. 부팅 중 개수가 오르는 것은 정상이므로 **기준선을
    // 그 뒤에 잡는다** — 안 그러면 정상 상승이 위반으로 찍힌다.
    await page.waitForTimeout(8000);

    const base = await counts(page);
    if (!base) throw new Error('stats() 를 못 읽었다 — 측정이 성립하지 않는다');
    log(`\n기준선  geo=${show(base.geo)} tex=${show(base.tex)} pipe=${show(base.pipe)} 파셀=${show(base.parcels)}\n`);

    // ── 부팅 기준선의 회차 추이 (팀장 판정 2026-08-02, 회차 0) ─────────────────
    //
    // **이 검사가 못 보는 것을 메우는 자리다.** 아래 판정은 base **대비 델타**만 본다
    // (`maxGeo = r.geo - base.geo`). 그래서 부팅 때 만들어 둔 것은 base 에 흡수되고
    // 증가로 안 잡힌다 — 그런데 리얼리티 개발이 늘리는 것은 거의 전부 부팅 시 추가다.
    //
    // 골든으로 고정하지 못한 이유: 실측상 세션 간 폭이 **32** 다(6회, VRM 대기를 붙인
    // 뒤). 변하는 값을 골든으로 박으면 게이트가 아니라 주사위가 된다. 세션 **내부**는
    // 폭 0 이 6/6 으로 확인됐으므로(회전·보행·복귀 포함) 그쪽은 아래 판정이 이미 본다.
    //
    // 그래서 **막지 않고 추이를 남긴다.** 한계는 분명하다 — 기록은 사람이 읽어야
    // 효과가 있고, 안 읽으면 장식이다. 그 위험을 줄이려고 임계를 넘으면 WARN 으로
    // 올린다(팀장 조건).
    const baselineNote = await trackBaseline(base, page, log);

    const rows = [];
    const snap = async (label) => {
      const c = await counts(page);
      rows.push({ label, ...c });
      return c;
    };

    // ── ① 제자리 회전 — world1 이 여기서 무너졌다 ────────────────────────────
    log('[1] 제자리 360° 회전…');
    const stepRad = (Math.PI * 2) / SPIN_STEPS;
    for (let i = 0; i < SPIN_STEPS; i++) {
      await drive(page, 'look', stepRad, 0);
      await page.waitForTimeout(STEP_MS);
      await snap(`회전 ${Math.round(((i + 1) * 360) / SPIN_STEPS)}°`);
    }

    // ── ② 직진 — 파셀 경계를 여러 번 넘는다 ─────────────────────────────────
    log('[2] 직진 주행…');
    for (let i = 0; i < WALK_LEGS; i++) {
      await drive(page, 'move', 0, -1); // 전진
      await page.waitForTimeout(WALK_MS);
      await snap(`전진 ${i + 1}`);
    }
    await drive(page, 'move', 0, 0);

    // ── ③ 되돌아오기 — 언로드된 파셀을 다시 로드한다 ────────────────────────
    // **재방문이 핵심이다.** 슬롯 반납이 제대로 안 되면 여기서 개수가 오른다.
    log('[3] 되돌아오기(재방문)…');
    await drive(page, 'look', Math.PI, 0);
    await page.waitForTimeout(STEP_MS);
    for (let i = 0; i < WALK_LEGS; i++) {
      await drive(page, 'move', 0, -1);
      await page.waitForTimeout(WALK_MS);
      await snap(`복귀 ${i + 1}`);
    }
    await drive(page, 'move', 0, 0);
    await page.waitForTimeout(1500);
    await snap('정지');

    // ── 판정 ────────────────────────────────────────────────────────────────
    log('\n[결과] 기준선 대비 증가분 — 하나라도 + 면 증식이다\n');
    log('  구간              geo   tex  pipe   draw  파셀');
    let maxGeo = 0, maxTex = 0, maxPipe = 0, maxDraw = 0;
    for (const r of rows) {
      const d = (b, v) => (b == null || v == null ? '  ?' : (v - b > 0 ? `+${v - b}` : '  '));
      if (base.geo != null && r.geo != null) maxGeo = Math.max(maxGeo, r.geo - base.geo);
      if (base.tex != null && r.tex != null) maxTex = Math.max(maxTex, r.tex - base.tex);
      if (base.pipe != null && r.pipe != null) maxPipe = Math.max(maxPipe, r.pipe - base.pipe);
      if (base.draw != null && r.draw != null) maxDraw = Math.max(maxDraw, r.draw - base.draw);
      log(
        `  ${r.label.padEnd(16)} ${show(r.geo).padStart(4)}${d(base.geo, r.geo)} `
        + `${show(r.tex).padStart(4)}${d(base.tex, r.tex)} `
        + `${show(r.pipe).padStart(4)}${d(base.pipe, r.pipe)} `
        + `${show(r.draw).padStart(6)} ${show(r.parcels).padStart(5)}`,
      );
    }

    log('\n[판정]\n');
    log(`  geometry  최대 증가 ${maxGeo >= 0 ? '+' : ''}${maxGeo}`);
    log(`  texture   최대 증가 ${maxTex >= 0 ? '+' : ''}${maxTex}`);
    log(`  pipeline  최대 증가 ${maxPipe >= 0 ? '+' : ''}${maxPipe}  (참고 — 백엔드 의존)`);
    log(
      `  draw      최대 증가 ${maxDraw >= 0 ? '+' : ''}${maxDraw}`
      + `  ${judgeDraw ? '← 대조군이므로 **판정에 포함**' : '(참고 — 기본 세션에서는 컬링으로 정당하게 변한다)'}`,
    );

    // 통과·실패는 백엔드 무관 카운터로만 가른다.
    // `draw` 는 **대조군에서만** 판정에 넣는다 — 기본 세션에서는 NPC 절두체 컬링 때문에
    // 정의상 상수가 아니고, 거기서 판정하면 게이트가 아니라 오탐 발생기가 된다.
    const pass = maxGeo <= 0 && maxTex <= 0 && (!judgeDraw || maxDraw <= 0) && errors.length === 0;
    if (pass) {
      log('\n  ✓ PASS — 회전·주행·재방문 내내 개수가 상수다.');
    } else if (judgeDraw && maxDraw > 0 && maxGeo <= 0 && maxTex <= 0) {
      log('\n  ✗ FAIL — 대조군에서 **드로우콜만** 늘었다.');
      log('    지오·텍스처는 그대로인데 draw 가 늘었다는 것은 **같은 자원을 더 많은 호출로**');
      log('    그린다는 뜻이다 — 배칭이 깨졌거나(인스턴싱 해제·재질 분화), 숨어 있던 것이');
      log('    보이게 됐다. 대조군에는 사람도 GLB 도 없으므로 컬링 변동으로 설명되지 않는다.');
    } else if (maxGeo > 0 || maxTex > 0) {
      log('\n  ✗ FAIL — 세션 중 개수가 늘었다. **world1 이 겪은 증식이 돌아왔다.**');
      log('    위 표에서 어느 구간에 + 가 붙었는지가 원인 지점이다:');
      log('      회전 구간   → 시야에 따라 새 조합이 생긴다(재질 변종·LOD tier 등)');
      log('      전진 구간   → 스트리밍이 객체를 새로 만든다(슬롯 방식이 깨짐)');
      log('      복귀 구간   → 슬롯 반납이 안 되어 재방문마다 쌓인다');
    }
    if (maxPipe > 0 && maxGeo <= 0 && maxTex <= 0) {
      // 이 조합은 "지오·텍스처는 그대로인데 파이프라인만 늘었다" — 재질 **구조**가
      // 바뀌는 경로가 생겼다는 뜻이다. WebGL 에서도 잡히면 실기기(WebGPU)에서는 더 크다.
      log('\n  ⚠ 경고 — geometry·texture 는 상수인데 pipeline 이 늘었다.');
      log('    재질 구조 신호(맵 유무·transparent·조명 수)가 런타임에 바뀌는 경로가 있다.');
      log('    world1 을 무너뜨린 것이 정확히 이 축이다. FAIL 은 아니지만 반드시 본다.');
    }

    log(`\n  콘솔 에러 ${errors.length}건${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
    await context.close();
    return { pass, maxGeo, maxTex, maxPipe, maxDraw, rows, errors, base, baselineNote };
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
// 단독 실행(`npm run measure:invariants`)일 때만 자기가 빌드·서버·브라우저를 세운다.
// 스모크 하네스에서 부를 때는 위 `runInvariants` 를 직접 쓴다.
async function cli() {
  // `--control` 은 드로우콜 대조군 세션이다(사람·GLB 없음, draw 를 판정에 포함).
  const control = process.argv.includes('--control');
  console.log(`=== 성능 불변식 게이트 (개수 상수성)${control ? ' — 드로우콜 대조군' : ''} ===\n`);
  assembleSiteVite(SITE_DIR);
  const { origin, close: closeServer } = await startServer(SITE_DIR, BASE_PATH);
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS, headless: true,
  });
  try {
    const r = await runInvariants({
      browser,
      origin,
      basePath: BASE_PATH,
      ...(control ? { query: DRAW_CONTROL_QUERY, judgeDraw: true } : {}),
    });
    process.exitCode = r.pass ? 0 : 1;
  } finally {
    await browser.close();
    await closeServer();
  }
}

// `import.meta.main` 은 Node 20 에 없다. argv 로 판별한다.
if (process.argv[1] && process.argv[1].endsWith('measure-invariants.mjs')) {
  cli().catch((e) => { console.error(`측정 실패(판정 아님): ${e.message}`); process.exit(2); });
}
