// `[7]` 개수 불변식의 **판정식**이 실제로 검출력을 갖는가.
//
// ── 왜 이 파일이 있나 ───────────────────────────────────────────────────────
// 2026-08-18 에 `[7]` 판정식을 `maxGeo <= 0` 에서 「계단 예산 + 복귀 구간 0」으로
// 넓혔다(팀장 판정 (B)). **판정식을 넓히는 개정은 «축이 옳아졌다» 와 «게이트가
// 장식이 됐다» 가 코드로는 구별되지 않는다.** 그래서 팀장이 조건을 달았다:
//
// > 증식 결함을 일부러 심어 새 판정식이 빨간불이 되는 것을 확인하고 기록하라.
// > 안 깨지면 이 개정은 느슨화가 맞고, **그때는 병합 금지다.**
//
// 그 조건은 브라우저 4회차(기준선·M1·M2·M3)로 집행했고 표는 `invariant-judge.mjs`
// 헤더에 있다. **한 번 잰 것은 회귀를 막지 못한다** — 회차당 3~4분이라 매 커밋마다
// 돌 수 없다. 그래서 같은 네 케이스를 합성 표로 여기에 못 박는다.
//
// ⚠ **합성 표는 실물 체인을 대신하지 못한다.** 이 파일은 «판정식이 이런 표를 받으면
// 이렇게 판정하는가» 만 본다. «실제 증식이 그런 표를 만드는가» 는 브라우저 실측
// 소관이고 그것은 헤더 표가 근거다. 둘 다 있어야 한 축이 된다.
//
// ── 이 파일의 검출력 (뮤테이션 실측 2026-08-18) ────────────────────────────
// **테스트 통과는 검출력의 증거가 아니다.** `invariant-judge.mjs` 에 결함을 심어
// 실제로 깨지는지 쟀다(`npx vitest run tests/invariant-judge.test.ts`):
//
//   심은 것                                          failed
//   `backBase` 를 옛 기준(`backRows[0]`)으로 되돌림       2   ← 검수관 블로커의 회귀 축
//   `budgetOk` 를 `true` 로 고정                        4
//   `settledOk` 를 `true` 로 고정                       7
//   진단 분기를 옛 기준(`maxGeo > 0`)으로 되돌림          1   ← 이번 회차에 실제로 났던 결함
//   `ART_GEO_EACH` 2 → 3                               2
//   **주석 한 줄만 변경(등가 대조군)**                    0   ← 아무 변경이나 잡지는 않는다
//
// 등가 대조군을 함께 재는 이유: 뮤테이션이 전부 빨간불이면 «검출력이 있다» 와
// «판정기가 과민하다» 가 구별되지 않는다. 0 failed 가 나와야 축이 성립한다.

import { describe, it, expect } from 'vitest';
import {
  stepJudge, stepReport, ART_GEO_EACH, ART_TEX_EACH,
} from '../scripts/smoke/invariant-judge.mjs';

/** 스냅 한 줄. 하네스가 만드는 모양 그대로다(`counts()` 반환 + 라벨). */
function snap(label: string, geo: number, tex: number, arts: number | null = 3) {
  return { label, geo, tex, arts };
}

/**
 * 회전 → 전진 → 복귀 → 정지 한 세션. `geoAt`/`texAt` 은 **기준선 대비 증가분**을
 * 구간별로 준다. 실측 표와 같은 형태로 합성해야 판정식이 실물에서 하는 일을 잰다.
 */
function session(opts: {
  arts?: number | null;
  spinGeo?: number; spinTex?: number;
  outGeo?: number; outTex?: number;
  /** **전진 마지막 leg 와 복귀 1 leg 사이**에 낀 증가. `복귀 1` 스냅부터 반영된다 */
  edgeGeo?: number; edgeTex?: number;
  backGeo?: number; backTex?: number;
}) {
  const a = opts.arts === undefined ? 3 : opts.arts;
  const g0 = 373;
  const t0 = 46;
  const spinG = opts.spinGeo ?? 0;
  const spinT = opts.spinTex ?? 0;
  const outG = opts.outGeo ?? 0;
  const outT = opts.outTex ?? 0;
  const edgeG = opts.edgeGeo ?? 0;
  const edgeT = opts.edgeTex ?? 0;
  const backG = opts.backGeo ?? 0;
  const backT = opts.backTex ?? 0;
  // ⚠ `복귀 1` 스냅은 **첫 복귀 leg 이동을 이미 마친 뒤**에 찍힌다(하네스의
  // `move → wait → snap` 순서). 그래서 `edgeG` 는 여기부터 반영된다 — 이 타이밍이
  // 검수관 블로커가 가리킨 그 자리다.
  const rows = [
    snap('회전 180°', g0 + spinG, t0 + spinT, a),
    snap('회전 360°', g0 + spinG, t0 + spinT, a),
    snap('전진 12', g0 + spinG + outG, t0 + spinT + outT, a),
    snap('전진 24', g0 + spinG + outG, t0 + spinT + outT, a),
    snap('복귀 1', g0 + spinG + outG + edgeG, t0 + spinT + outT + edgeT, a),
    snap('복귀 24', g0 + spinG + outG + edgeG + backG, t0 + spinT + outT + edgeT + backT, a),
    snap('정지', g0 + spinG + outG + edgeG + backG, t0 + spinT + outT + edgeT + backT, a),
  ];
  const maxGeo = spinG + outG + edgeG + backG;
  const maxTex = spinT + outT + edgeT + backT;
  return { base: snap('기준선', g0, t0, a), rows, maxGeo, maxTex };
}

describe('계단 예산 — 작품 수에서 유도한다 (하드코딩 아님)', () => {
  it('예산은 작품 수 × 액자당 비용이다', () => {
    for (const n of [0, 1, 3, 4, 17]) {
      const j = stepJudge(session({ arts: n, spinGeo: 0, spinTex: 0 }));
      expect(j.artCount).toBe(n);
      expect(j.geoBudget).toBe(n * ART_GEO_EACH);
      expect(j.texBudget).toBe(n * ART_TEX_EACH);
    }
  });

  it('작품이 0장이면 예산도 0 — 옛 판정식(증가 0)과 같아진다', () => {
    // 회귀 방지. W8-8 이전 상태(라이브 작품 0)에서 이 개정이 게이트를 느슨하게
    // 만들지 않았음을 못 박는다. 작품이 없으면 어떤 증가도 여전히 FAIL 이다.
    expect(stepJudge(session({ arts: 0, spinGeo: 1 })).budgetOk).toBe(false);
    expect(stepJudge(session({ arts: 0, spinTex: 1 })).budgetOk).toBe(false);
    expect(stepJudge(session({ arts: 0 })).budgetOk).toBe(true);
  });

  it('`base.arts` 가 없으면 스냅에서 찾는다 — 훅이 늦게 열려도 예산이 0이 되지 않는다', () => {
    const s = session({ arts: 3, spinGeo: 6, spinTex: 3 });
    const j = stepJudge({ ...s, base: { label: '기준선', geo: 373, tex: 46, arts: null } });
    expect(j.artCount).toBe(3);
    expect(j.budgetOk).toBe(true);
  });
});

// ── 브라우저 4회차와 같은 네 케이스 ────────────────────────────────────────
// 표는 `invariant-judge.mjs` 헤더에 있다. 여기서는 **판정 결과만** 대조한다 —
// 수치를 두 곳에 적으면 한쪽만 고쳐도 아무도 모른다.
describe('뮤테이션 등가 — 두 축이 각각 살아 있는가', () => {
  it('기준선: 작품 3장이 +6/+3 계단을 밟고 복귀에서 상수 → 두 축 다 통과', () => {
    const j = stepJudge(session({ spinGeo: 6, spinTex: 3 }));
    expect(j.budgetOk).toBe(true);
    expect(j.settledOk).toBe(true);
  });

  it('M1(증식): leg 마다 늘면 두 축 다 빨간불', () => {
    const j = stepJudge(session({ spinGeo: 6, spinTex: 3, outGeo: 26, backGeo: 24 }));
    expect(j.budgetOk).toBe(false);
    expect(j.settledOk).toBe(false);
  });

  it('M2(예산 축 단독): 계단이 예산을 +1 넘으면 예산만 빨간불', () => {
    // 🔴 이 케이스가 **양방향 뮤테이션**이다. 두 축이 동시에 깨지는 표만 보면
    // 한쪽이 죽어 있어도 같은 결과가 나온다 — 실제로 브라우저 실측에서 기준선이
    // 예산을 정확히 꽉 채워(+6/예산 6) M1 하나로는 갈리지 않았다.
    const j = stepJudge(session({ spinGeo: 7, spinTex: 3 }));
    expect(j.budgetOk).toBe(false);
    expect(j.settledOk).toBe(true);
  });

  it('M3(복귀 축 단독): 예산 안에서라도 복귀에서 늘면 복귀 축만 빨간불', () => {
    // 작품 5장(예산 geo 10)에서 총 +8 — 예산은 통과한다. 그런데 그 +8 중 3이
    // **복귀 구간**에서 늘었다. 복귀는 재방문이라 처음 보는 것이 없다.
    const j = stepJudge(session({ arts: 5, spinGeo: 5, outGeo: 0, backGeo: 3 }));
    expect(j.budgetOk).toBe(true);
    expect(j.settledOk).toBe(false);
  });

  it('복귀 축은 텍스처에도 걸린다 — 지오만 보는 축이 아니다', () => {
    const j = stepJudge(session({ arts: 5, spinTex: 1, backTex: 1 }));
    expect(j.budgetOk).toBe(true);
    expect(j.settledOk).toBe(false);
  });

  it('🔴 전진→복귀 **경계**에 낀 증식을 잡는다 (검수관 블로커, 2026-08-18)', () => {
    // 첫 판본은 `backRows[0]`(= `복귀 1` 스냅)을 복귀 구간의 기준선으로 썼다. 그런데
    // 그 스냅은 **첫 복귀 leg 이동을 이미 마친 뒤**에 찍히므로, 경계에서 샌 증가가
    // 자기 기준선 안으로 흡수되어 **영구히 안 보였다.**
    //
    // ⚠ 이 케이스가 위험한 이유: **옛 판정식(`maxGeo <= 0`)이었다면 무조건 FAIL 이었다.**
    // 예산 관용도를 준 이번 개정이 이 타이밍의 증식을 **새로** 통과시킨 것이다 —
    // 판정식을 넓히는 개정의 위험이 정확히 이 형태로 나타났다.
    //
    // 브라우저 뮤테이션 M1~M3 는 전부 「leg 마다 계속 늚」이라 이 경계-국소 형태를
    // 시험하지 못했다. 실물 실측이 있어도 안 재본 형태는 안 재본 것이다.
    const j = stepJudge(session({ arts: 3, spinGeo: 4, edgeGeo: 2 }));
    expect(j.budgetOk).toBe(true);        // 총 +6 은 예산(6) 이내라 예산 축은 통과한다
    expect(j.settledOk).toBe(false);      // 복귀 축이 단독으로 잡아야 한다
  });

  it('경계 증식은 텍스처에서도 잡힌다', () => {
    const j = stepJudge(session({ arts: 3, spinTex: 2, edgeTex: 1 }));
    expect(j.budgetOk).toBe(true);
    expect(j.settledOk).toBe(false);
  });

  it('「정지」 스냅도 복귀 구간이다 — 마지막에 한 개 새면 잡힌다', () => {
    const s = session({ spinGeo: 6, spinTex: 3 });
    s.rows[s.rows.length - 1].geo += 1;
    s.maxGeo += 1;
    expect(stepJudge(s).settledOk).toBe(false);
  });
});

// ── 진단문 — 이 회차에 실제로 난 결함의 회귀 방지 ──────────────────────────
describe('stepReport — 진단이 판정식과 같은 축을 읽는가', () => {
  const rep = (j: ReturnType<typeof stepJudge>, over: Record<string, unknown> = {}) =>
    stepReport({
      judgement: j, maxGeo: 0, maxTex: 0, maxPipe: 0, maxDraw: 0,
      judgeDraw: false, cov: { unique: 3, revisits: 1 }, pass: false, ...over,
    }).join('\n');

  it('🔴 두 축이 다 통과했으면 「증식이 돌아왔다」를 찍지 않는다', () => {
    // 실제로 난 결함이다. `pass` 만 새 축으로 고치고 진단 분기는 옛 기준
    // (`maxGeo > 0`)을 그대로 둬서, **계단 예산 ✓ · 계단 소진 ✓ 인 회차에**
    // 커버리지 탈락으로 FAIL 이 나자 *"증식이 돌아왔다"* 가 찍혔다.
    // 그 로그를 본 다음 사람은 있지도 않은 증식을 찾으러 간다.
    const j = stepJudge(session({ spinGeo: 6, spinTex: 3 }));
    const out = rep(j, { maxGeo: 6, maxTex: 3, pass: false }); // pass=false 는 커버리지 탈락
    expect(out).not.toContain('증식이 돌아왔다');
    expect(out).toContain('계단 예산');
    expect(out).toContain('✓');
  });

  it('예산만 깨지면 「예산 초과」만 찍는다', () => {
    const j = stepJudge(session({ spinGeo: 7, spinTex: 3 }));
    const out = rep(j, { maxGeo: 7, maxTex: 3 });
    expect(out).toContain('예산 초과');
    expect(out).not.toContain('계단이 안 끝난다');
  });

  it('복귀만 깨지면 「계단이 안 끝난다」만 찍는다', () => {
    const j = stepJudge(session({ arts: 5, spinGeo: 5, backGeo: 3 }));
    const out = rep(j, { maxGeo: 8, maxTex: 0 });
    expect(out).toContain('계단이 안 끝난다');
    expect(out).not.toContain('예산 초과');
  });

  it('통과하면 PASS 한 줄 — 커버리지 수치를 함께 적는다', () => {
    const j = stepJudge(session({ spinGeo: 6, spinTex: 3 }));
    const out = rep(j, { maxGeo: 6, maxTex: 3, pass: true });
    expect(out).toContain('✓ PASS');
    expect(out).toContain('파셀 3개·재방문 1');
  });
});
