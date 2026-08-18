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
import { stepJudge, stepReport } from './invariant-judge.mjs';
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

// ── 정착 대기 둘 (W8-2 에서 이름을 줬다 — 본문에 익명으로 박혀 있었다) ────────
// ⚠ **근거를 못 찾았다.** 관례로 굳은 값이고 커밋 이력에도 실측이 없다. 그리고 이 시간
// 대기가 이 파일에 남은 마지막 주사위다 — GLB·VRM·오버레이는 `world2-ready.mjs` 가
// **상태**로 기다리는데 파셀 스트리밍만 그 밖이다. `stream.pending === 0` 으로 바꾸면
// 기준선 시점이 달라져 골든이 통째로 움직인다 — 실측 없이 건드릴 축이 아니다(태스크 #82).
/** 부팅 뒤 초기 파셀 정착(ms). 부팅 중 상승은 정상이므로 **기준선을 그 뒤에** 잡는다 */
const SETTLE_MS = 8000;
/** 멈춘 뒤 마지막 스냅 전 정착(ms). 이동 중 시작된 스트리밍이 끝나야 한다 */
const STOP_SETTLE_MS = 1500;

// ── 커버리지 목표 — **G-COL1** (검수관 반려 B1, 2026-08-08) ──────────────────
//
// 왜 목표가 필요한가: 이 세션은 오래 *"-z 로 6번 전진"* 이었고, 그것을 **주행이라고
// 불렀을 뿐 주행인지 확인한 적이 없다.** 플레이어 충돌(#182)이 붙자 스폰 앞 분수대에서
// 6.9m 만 걷고 멈췄고 — 파셀을 한 칸도 새로 안 밟았는데 — 게이트는 **PASS 로 보고했다.**
// 개수가 늘지 않은 것은 사실이었다. 아무 데도 안 갔으니까.
//
// 그래서 "몇 미터 걸었나" 가 아니라 **"파셀을 몇 개 밟았나"** 를 판정으로 만든다.
// 미터는 배치·속도·프레임률에 흔들리지만 파셀은 스트리밍의 단위 그 자체다 — `[7]` 이
// 잡으려는 증식(슬롯 재사용 실패·재방문 누적)이 정확히 그 경계에서 일어난다.
//
// ⚠ **이 판정은 성능 축이 아니라 하드 실패다.** `SMOKE_PERF_GATES=observe` 에서도
// INFO 로 내려가지 않는다(`run.mjs` 의 `perfStatus` 가 `hard` 로 받는다). observe 의
// 정당화는 *"러너 성능 편차의 거짓 FAIL"* 인데, **세션이 안 움직인 것은 편차가 아니다.**
//

/** 고유 파셀 목표. 3 이면 "출발 칸 + 새 칸 둘" 이다 — 경계를 최소 두 번 넘는다 */
const COVER_UNIQUE = 3;
/** 재방문 목표. 슬롯 반납 실패는 **다시 들어갈 때**만 드러난다 */
const COVER_REVISITS = 1;
/** 이 leg 에서 실제로 움직인 거리(m)가 이보다 작으면 막힌 것으로 본다 */
const STUCK_M = 1.0;
/** 목표를 채우려고 늘릴 수 있는 최대 leg 수. 도달하면 그대로 판정한다(무한 대기 금지) */
const MAX_LEGS = 24;

/**
 * 막혔을 때 어떻게 우회하는가. **사람이 하는 것을 흉내낸다 — 옆으로 비켜서 지나간다.**
 *
 * ── 첫 판본은 90° 회전이었고 제자리를 돌았다 (실측 2026-08-08) ────────────────
 * *"막히면 `look(90°)`"* 로 짰더니 **21 leg·7회 전환에 고유 파셀이 1** 이었다. 당연하다 —
 * 90° 를 네 번 돌면 출발 방향으로 돌아온다. 촘촘한 도시에서 그 사이클은 **사각형을 그리며
 * 같은 칸을 맴도는** 궤적이 된다. "막히면 방향을 튼다" 는 발상은 맞았고 **각도 선택이
 * 틀렸다.**
 *
 * 그래서 먼저 **스트레이프**를 시도한다: 시선을 유지한 채 좌·우 대각으로 전진하면
 * `slide` 의 축분리가 옆 성분을 살려 장애물을 스쳐 지나간다. 방향(시선)이 보존되므로
 * 사이클이 생기지 않는다. 좌우 둘 다 막힐 때만 시선을 튼다 — 그때는 골목 끝이다.
 *
 * `move(x, z)` 의 x 가 좌우 축이고 z 가 전후다(`player.setAxes`).
 *
 * ── 실측 (2026-08-08, 스폰 x=-3.5) ──────────────────────────────────────────
 *   90° 회전판   21 leg · 시선 전환 7회 → 고유 파셀 **1** · 경로 `0,0`
 *   스트레이프판 19 leg · 시선 전환 **0회** → 고유 파셀 **3** · 재방문 2
 *                경로 `0,0 → 0,-1 → 0,-2 → 0,-1 → 0,0`
 * 시선을 한 번도 안 틀고 목표를 채웠다 — 골목 끝(좌우 다 막힘)에 도달한 적이 없다는
 * 뜻이고, 그래서 `TURN_RAD` 는 아직 **한 번도 실행되지 않은 경로**다. 남겨 두는 이유는
 * 배치가 촘촘해지면 필요해지기 때문이지만, **검출력이 0 인 분기임을 알고 남긴다.**
 */
const DODGES = [
  { ax: 1, az: -1, note: '우측 대각' },
  { ax: -1, az: -1, note: '좌측 대각' },
];
/** 좌우 다 막혔을 때 틀 각도. 90° 가 아니라 **소수(素數)에 가까운 각**이라 사이클이 늦다 */
const TURN_RAD = (Math.PI * 2) / 5;

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
      // 걸린 작품 수. **판정 예산을 여기서 유도한다**(아래 `artBudget`) — 실측값에
      // 여유를 얹지 않는다. 작품이 4장이 되면 예산도 저절로 따라온다.
      arts: s.overlay?.art?.frames ?? null,
      // 커버리지 판정용. `null` 이면 훅이 안 열린 것이므로 **측정 실패로 다룬다**.
      px: s.parcel?.px ?? null,
      pz: s.parcel?.pz ?? null,
      wx: s.player?.x ?? null,
      wz: s.player?.z ?? null,
      // 복귀 구간이 출발점으로 재조준할 때 쓴다(아래 `yawToward` 문단).
      yaw: s.player?.yaw ?? null,
    };
  });
}

/**
 * 방문 순서에서 커버리지를 센다.
 *
 * 연속 중복을 먼저 걷어낸다 — 한 파셀 안에서 여러 leg 를 걸은 것은 "재방문" 이 아니다.
 * 압축하지 않으면 **제자리에서 멈춰 있어도 재방문 수가 올라가** 판정이 뒤집힌다(이 게이트가
 * 잡으려는 바로 그 상황이 통과한다).
 */
export function coverageOf(seq) {
  const compact = seq.filter((k, i) => i === 0 || k !== seq[i - 1]);
  const unique = new Set(compact).size;
  return { unique, revisits: compact.length - unique, path: compact };
}

/**
 * 커버리지가 목표를 채웠는가. **`coverageOf` 와 따로 export 하는 이유가 있다.**
 *
 * ── 검수관 조건 1 (2026-08-08) — 뮤테이션이 이 구멍을 실증했다 ────────────────
 * 이 비교식은 원래 `runInvariants` 안에 인라인돼 있었고, 검수관이 `/tmp` 별도 클론에서
 * `const covOk = true` 로 고정하는 뮤테이션을 돌렸더니 **`tests/world2-collide.test.ts`
 * 26건이 전부 그대로 통과했다.** `coverageOf` 자체는 §5 가 단위 검증하고 배선은 §6 이
 * 보는데, **그 둘 사이에 있는 임계 비교식은 아무도 안 봤다.**
 *
 * 이 게이트가 잡으려던 사고가 *"아무 데도 안 갔는데 PASS"* 였는데, **판정식이 죽어도
 * 똑같은 일이 벌어지고 CI 는 초록**이었다 — 이 저장소가 *"판정/집행 분리의 구멍 — 경계를
 * 건너는 지점은 아무도 안 본다"* 로 이미 이름 붙인 형태의 재발이다.
 *
 * 그래서 함수로 뽑아 테스트가 닿게 한다. 임계 상수(`COVER_UNIQUE`·`COVER_REVISITS`)는
 * 여기서만 읽는다 — 두 곳에서 비교하면 한쪽만 고쳐도 아무도 모른다.
 */
export function covOkOf(cov) {
  return cov.unique >= COVER_UNIQUE && cov.revisits >= COVER_REVISITS;
}

/**
 * `facing(yaw) = (-sin yaw, -cos yaw)`(`systems/player.ts`)의 역함수 — 이 월드 방향을
 * 보려면 yaw 가 얼마여야 하는가.
 *
 * **복귀 구간이 이것을 필요로 한다.** 예전에는 `look(π)`(뒤돌기) 한 번으로 왕복을
 * 만들었는데, 우회가 붙자 **갈 때 경로가 직선이 아니게 되어 그 대칭이 깨졌다.**
 * 스모크 실측(2026-08-08): 경로 `0,0 → 0,-1 → 1,-1 → 2,-1` — 대각으로 흘러 +x 로 두 칸
 * 이동했고, 거기서 뒤돌면 원래 경로가 아닌 새 칸으로 간다. 재방문 **0** 으로 FAIL 했다.
 *
 * 그래서 "뒤돌기" 를 **"출발점을 향해 재조준"** 으로 바꾼다. 매 leg 마다 다시 조준하므로
 * 중간에 우회로 흘러도 목표를 잃지 않는다.
 */
export function yawToward(from, to) {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

/** 최단 회전량으로 정규화. 안 하면 350° 를 왼쪽으로 도는 대신 오른쪽으로 한 바퀴 돈다 */
export function shortestTurn(fromYaw, toYaw) {
  let d = toYaw - fromYaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
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
    // 초기 파셀이 다 붙을 때까지. 근거는 `SETTLE_MS` 선언 자리 한 곳이다.
    await page.waitForTimeout(SETTLE_MS);

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

    // ── ② 주행 — **파셀을 밟는다.** 미터를 세지 않는다 ───────────────────────
    //
    // 여기 원래 *"-z 로 6번 전진"* 이 박혀 있었다. 도시에 충돌이 없던 동안은 그것이
    // 곧 주행이었지만, 충돌이 붙은 뒤로는 **앞에 무엇이 있느냐에 따라 0m 일 수도 있는
    // 명령**이 됐다. 막히면 방향을 튼다 — 사람이 도시에서 하는 그것이다.
    //
    // 방향 전환은 **관측한 결과로만** 한다(움직인 거리 < `STUCK_M`). "여기쯤에서 틀어라"
    // 를 미리 적으면 그것이 곧 배치의 값 미러링이고, 배치를 만지는 날 조용히 어긋난다.
    const visits = [];
    const keyOf = (c) => (c?.px == null || c?.pz == null ? null : `${c.px},${c.pz}`);
    let prev = await counts(page);
    if (!keyOf(prev)) throw new Error('stats().parcel 이 없다 — 커버리지를 잴 수 없다(측정 실패)');
    visits.push(keyOf(prev));
    /** 출발 좌표. 복귀 구간이 **이 지점을 향해 매 leg 재조준한다** */
    const start = { wx: prev.wx, wz: prev.wz };

    log('[2] 주행 — 고유 파셀 목표 ' + COVER_UNIQUE + '…');
    let legs = 0;
    let turns = 0;
    let dodge = -1;        // -1 = 곧장 전진, 0·1 = 좌우 대각
    for (; legs < MAX_LEGS; legs++) {
      const d = dodge < 0 ? { ax: 0, az: -1 } : DODGES[dodge];
      await drive(page, 'move', d.ax, d.az);
      await page.waitForTimeout(WALK_MS);
      const c = await snap(`전진 ${legs + 1}`);
      const moved = (prev.wx == null || c.wx == null)
        ? null : Math.hypot(c.wx - prev.wx, c.wz - prev.wz);
      visits.push(keyOf(c));
      prev = c;
      if (coverageOf(visits).unique >= COVER_UNIQUE && legs + 1 >= WALK_LEGS) break;
      if (moved != null && moved < STUCK_M) {
        // 막혔다. 좌 → 우 → (둘 다 막히면) 시선을 튼다. 회전은 **개수 축과 독립된
        // 증식원**이므로(위 ①의 근거) 여기서 도는 것도 그대로 판정 대상이다 — 표에 남는다.
        dodge += 1;
        if (dodge >= DODGES.length) {
          dodge = -1;
          await drive(page, 'look', TURN_RAD, 0);
          await page.waitForTimeout(STEP_MS);
          turns++;
        }
      } else if (dodge >= 0) {
        // 우회가 통했다 — 다시 곧장 전진으로 돌아간다(대각으로만 계속 가면 사선으로 흐른다).
        dodge = -1;
      }
    }
    await drive(page, 'move', 0, 0);
    const outLegs = legs + 1;

    // ── ③ 되돌아오기 — 언로드된 파셀을 다시 로드한다 ────────────────────────
    //
    // **재방문이 핵심이다.** 슬롯 반납이 제대로 안 되면 여기서 개수가 오른다.
    //
    // ── `look(π)` 뒤돌기를 버렸다 (스모크 실측 2026-08-08) ─────────────────────
    // 예전에는 뒤돌아 같은 leg 수만큼 걸으면 왕복이 됐다. **우회가 붙자 그 대칭이
    // 깨졌다** — 갈 때 대각으로 흘러 경로가 직선이 아니면 뒤돌기는 원래 길이 아니다.
    // 스모크 실측: 경로 `0,0 → 0,-1 → 1,-1 → 2,-1`(+x 로 두 칸 흘렀다) → 거기서 뒤돌면
    // 새 칸으로 가서 **재방문 0** 으로 FAIL 했다. 내 로컬 회차는 우연히 직선이라 통과했고,
    // 그래서 **로컬 PASS 가 스모크 PASS 를 보증하지 못했다.**
    //
    // 그러므로 방향을 **매 leg 마다 출발점으로 재조준한다.** 중간에 우회로 흘러도 목표를
    // 잃지 않는다 — "돌아간다" 를 회전량이 아니라 **목표 좌표**로 정의한 것이다.
    // 종료 조건도 leg 수가 아니라 **재방문 달성**이다(상한은 무한 대기 방지선).
    log('[3] 되돌아오기(재방문) — 출발점으로 재조준…');
    let back = 0;
    let backDodge = -1;
    for (; back < MAX_LEGS; back++) {
      // ── 왜 `back >= outLegs` 를 함께 요구하는가 (검수관 비블로커, 2026-08-08) ──
      // 재방문 조건만 두면 **첫 leg 에 끝날 수 있다** — 출발점 바로 옆 칸에서 되돌아서면
      // 한 걸음에 원래 칸을 다시 밟는다. 그러면 "갔다가 돌아왔다" 가 아니라 경계에서
      // 한 번 흔든 것이고, 정작 재보려던 것(멀리 가서 **언로드된** 파셀을 다시 로드)이
      // 일어나지 않는다. 갈 때 쓴 leg 만큼은 돌아오게 해서 **언로드가 실제로 걸린
      // 거리**를 왕복하게 만든다.
      if (coverageOf(visits).revisits >= COVER_REVISITS && back >= outLegs) break;
      if (prev.yaw != null && prev.wx != null) {
        const want = yawToward({ x: prev.wx, z: prev.wz }, { x: start.wx, z: start.wz });
        const turn = shortestTurn(prev.yaw, want);
        // 미세 오차로 매 leg 마다 흔드는 것을 막는다 — 3° 미만이면 조준 그대로 둔다.
        if (Math.abs(turn) > 0.05) {
          await drive(page, 'look', turn, 0);
          await page.waitForTimeout(STEP_MS);
          turns++;
        }
      }
      const d = backDodge < 0 ? { ax: 0, az: -1 } : DODGES[backDodge];
      await drive(page, 'move', d.ax, d.az);
      await page.waitForTimeout(WALK_MS);
      const c = await snap(`복귀 ${back + 1}`);
      const moved = (prev.wx == null || c.wx == null)
        ? null : Math.hypot(c.wx - prev.wx, c.wz - prev.wz);
      visits.push(keyOf(c));
      prev = c;
      if (moved != null && moved < STUCK_M) {
        backDodge += 1;
        // 좌우 다 막혔으면 재조준에 맡긴다(다음 회차 첫 줄이 다시 출발점을 향한다).
        if (backDodge >= DODGES.length) backDodge = -1;
      } else if (backDodge >= 0) {
        backDodge = -1;
      }
    }
    await drive(page, 'move', 0, 0);
    await page.waitForTimeout(STOP_SETTLE_MS);
    const last = await snap('정지');
    visits.push(keyOf(last));

    const cov = coverageOf(visits);
    const covOk = covOkOf(cov);

    // ── 판정 ────────────────────────────────────────────────────────────────
    log('\n[결과] 기준선 대비 증가분 — 하나라도 + 면 증식이다\n');
    // 좌표·파셀 칸을 함께 찍는다 — 개수만 보면 "세션이 어디에 있었나" 를 알 수 없고,
    // 커버리지 FAIL 이 났을 때 어느 구간에서 멈췄는지 짚을 수단이 표 안에 없었다.
    log('  구간              geo   tex  pipe   draw  파셀        위치        칸');
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
        + `${show(r.draw).padStart(6)} ${show(r.parcels).padStart(5)}`
        + `  ${r.wx == null ? '     ?,?    ' : `${r.wx.toFixed(1).padStart(6)},${r.wz.toFixed(1).padStart(6)}`}`
        + `  ${r.px == null ? '?' : `${r.px},${r.pz}`}`,
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

    // ── G-COL1 — **세션이 실제로 돌아다녔는가** ──────────────────────────────
    log('\n  커버리지  고유 파셀 ' + cov.unique + `/${COVER_UNIQUE}`
      + `  재방문 ${cov.revisits}/${COVER_REVISITS}`
      + `  (전진 ${outLegs} · 복귀 ${back} leg · 조준·전환 ${turns}회)`);
    log(`            경로 ${cov.path.join(' → ')}`);
    if (!covOk) {
      log('\n  ✗ FAIL — 세션이 목표만큼 돌아다니지 못했다. **개수 판정은 무의미하다.**');
      log('    아무 데도 안 갔으면 아무것도 안 늘어난다 — 그 PASS 는 게이트가 아니라 착시다.');
      // **두 원인을 가른다** (검수관 비블로커, 2026-08-08). 첫 판본은 무조건 *"막힌 자리를
      // 보라"* 고만 적었는데, leg 상한을 다 쓰고 끝난 것과 실제로 벽에 갇힌 것은 처방이
      // 다르다 — 전자는 하네스 예산 문제(상한을 올리거나 목표를 낮춘다)이고 후자만 배치·
      // 스폰 문제다. 안 가르면 다음 사람이 매번 배치부터 뒤진다.
      const spent = outLegs >= MAX_LEGS || back >= MAX_LEGS;
      if (spent) {
        log(`    원인 후보 ①: **leg 상한(${MAX_LEGS})을 소진했다** — 전진 ${outLegs}·복귀 ${back}.`);
        log('      느린 러너에서 leg 당 이동이 줄면 여기 걸린다. 하네스 예산(MAX_LEGS·WALK_MS)을 먼저 본다.');
      }
      log(`    원인 후보 ${spent ? '②' : '①'}: **실제로 막혔다** — 마지막 칸이 위 경로의 끝이다.`);
      log('      배치(#149)나 스폰(`decide/grid.ts`)을 본다. 상한을 안 쓰고 끝났으면 이쪽이다.');
    }

    // 계단 예산·계단 소진 판정. **판정식은 `invariant-judge.mjs` 한 곳이다** — 근거·뮤테이션
    // 실측표·재론 조건이 전부 거기 있다. 여기서 값을 다시 계산하지 않는다(검수관 조건 1 의
    // `covOkOf` 와 같은 처방 — 인라인 임계식은 아무 테스트도 안 닿는다).
    const judged = stepJudge({ base, rows, maxGeo, maxTex });

    // 통과·실패는 백엔드 무관 카운터로만 가른다.
    // `draw` 는 **대조군에서만** 판정에 넣는다 — 기본 세션에서는 NPC 절두체 컬링 때문에
    // 정의상 상수가 아니고, 거기서 판정하면 게이트가 아니라 오탐 발생기가 된다.
    //
    // `covOk` 를 곱하는 이유는 위 G-COL1 문단 그대로다 — **못 잰 것은 통과가 아니다.**
    const pass = judged.budgetOk && judged.settledOk && (!judgeDraw || maxDraw <= 0)
      && errors.length === 0 && covOk;
    // 진단문도 `invariant-judge.mjs` 소관이다 — 판정식과 같은 축을 읽어야 하는데 두 파일에
    // 흩어지면 한쪽만 고쳐도 아무도 모른다(그 형태가 실제로 이 회차에 한 번 났다).
    for (const line of stepReport({
      judgement: judged, maxGeo, maxTex, maxPipe, maxDraw, judgeDraw, cov, pass,
    })) log(line);

    log(`\n  콘솔 에러 ${errors.length}건${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
    await context.close();
    return { pass, maxGeo, maxTex, maxPipe, maxDraw, rows, errors, base, baselineNote, cov, covOk };
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

// argv 로 파일명을 보고 판별한다.
// ⚠ 원래 적혀 있던 근거 *"`import.meta.main` 은 Node 20 에 없다"* 는 **낡았다** —
// 실측 2026-08-08: Node 22·24 둘 다 `import.meta.main` 이 있다(저장소는 24 로 옮겼다).
// 코드는 그대로 둔다(동작에 문제가 없다). 근거가 바뀌면 근거를 고쳐 적는다 —
// 낡은 근거를 남겨두면 다음 사람이 그것을 읽고 틀린 판단을 한다. (검수관 P1)
if (process.argv[1] && process.argv[1].endsWith('measure-invariants.mjs')) {
  cli().catch((e) => { console.error(`측정 실패(판정 아님): ${e.message}`); process.exit(2); });
}
