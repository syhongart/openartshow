// scripts/smoke/invariant-judge.mjs — `[7]` 개수 불변식의 **판정식 한 곳.**
//
// ── 왜 별도 파일인가 ────────────────────────────────────────────────────────
// 형제 파일 `measure-invariants.mjs` 가 이미 같은 처방을 한 번 받았다. `covOkOf` 문단이
// 그 기록이다 — 임계 비교식이 측정 함수 **안에** 인라인돼 있었고, 검수관이 그것을
// `const covOk = true` 로 고정하는 뮤테이션을 돌렸더니 **테스트 26건이 전부 통과했다.**
// 측정은 §5 가 보고 배선은 §6 이 보는데 **그 사이의 판정식은 아무도 안 봤다.**
//
// 계단 예산 판정도 같은 자리에 있었다. 그래서 같은 처방을 한다 — 순수 함수로 뽑아
// `tests/invariant-judge.test.ts` 가 **합성 표로 두 축의 검출력을 직접 못 박는다.**
// 브라우저 4회차 실측(아래 뮤테이션 표)은 한 번 잰 것이고, 단위 테스트는 **매 커밋마다**
// 다시 잰다. 둘 다 필요하다 — 실측은 실물 체인을 보고 단위 테스트는 회귀를 막는다.
//
// ── 작품 첫 등장 계단 예산 (팀장 판정 (B), 2026-08-18) ─────────────────────
// 액자 하나가 만드는 것: **지오 2**(테두리 판 + 그림 평면) · **텍스처 1**(그림).
// W8-7 계단 실측(작품 0→1)이 그 값을 확정했고, W8-8 이 3장에서 `geo +6 / tex +3` 로
// 재현했다. **실측에 여유를 얹은 값이 아니라 구조에서 유도한 값**이다.
export const ART_GEO_EACH = 2;
export const ART_TEX_EACH = 1;

/**
 * 🔴 **작품 첫 등장 계단은 증식이 아니다** (팀장 판정 (B), 2026-08-18).
 *
 * **틀린 것은 제품이 아니라 재는 축이었다** — 팀장 문언 그대로다.
 *
 * 이 게이트의 목적은 world1 사고(파이프라인 60→227 **단조증가**)의 재발 차단이지
 * 「총량 불변」 자체가 아니다. 그런데 판정식이 `maxGeo <= 0` 이라, 라이브에 작품이
 * 서는 순간(W8-8) 정당한 lazy 렌더까지 빨간불이 됐다.
 *
 * three 의 `info.memory` 는 **객체 생성이 아니라 첫 렌더**에 오른다. 작품은 시야에
 * 처음 들어올 때 그 계단을 밟고 — W8-8 실측에서 회전 210° 에 `+6/+3` 로 오른 뒤
 * **전진 24 · 복귀 24 · 정지까지 미동이 0** 이었다. 증식이면 계속 는다.
 *
 * ── 그래서 두 축으로 가른다 ─────────────────────────────────────────────
 * ① **예산**: 총 증가가 `작품 수 × (지오 2, 텍스처 1)` 이내인가.
 *    ⚠ 실측값을 박지 않는다 — 장면에서 작품 수를 읽어 **계산**한다(팀장 조건 1).
 *    수치를 하드코딩하면 작품이 4장 되는 순간 또 빨간불이고, 그것이 값 미러링이다.
 * ② **복귀 구간 증가 0**: 계단을 다 밟은 뒤에는 +1 도 FAIL 이다(팀장 조건 2).
 *    복귀는 **재방문**이라 처음 보는 것이 없다 — 거기서 느는 것은 순수한 증식이다.
 *    이 축이 「한 번 오르고 상수」와 「천천히 계속 늘어남」을 가르는 선이다.
 *
 * ⚠ **예열(부팅 시 미리 렌더)은 기각됐다** — 하늘 예열 `[8]` 은 유한 자원 풀이라
 * 예열이 상수 비용이지만, 작품은 **무제한 콘텐츠**다(감독 *"작품갯수가 정해진것은
 * 아니잖아"*). 게이트를 초록으로 만들려고 부팅을 작품 수 비례로 무겁게 하는 것은
 * 꼬리가 개를 흔드는 방향이다.
 *
 * 🔴 **재론 조건**: 감독이 실기기에서 **작품 첫 등장 히치를 문제라고 판정하면**
 * 그때 예열을 다시 연다. 지금은 화면 결함의 근거가 0이다(작품당 액자 한 개분).
 *
 * ── 뮤테이션 실측 — **이 개정이 느슨화가 아님을 재서 확인했다** (팀장 조건 3) ──
 * 판정식을 넓히는 개정은 «게이트가 장식이 됐다» 와 «축이 옳아졌다» 가 코드로는
 * 구별되지 않는다. 그래서 브라우저로 네 회차를 돌려 갈랐다(2026-08-18, 회차당 3~4분,
 * `npm run measure:invariants`):
 *
 *   회차   심은 결함                                     예산   소진   결론
 *   기준선  없음                        geo +6/예산 6      ✓     ✓    정상을 빨간불로 안 만든다
 *   M1     `main.ts` move 훅에 leg 마다 지오 1개
 *          (카메라 밖이어도 세지도록 `frustumCulled=false`)
 *                                      geo +56/예산 6     ✗     ✗    **증식이 잡힌다**
 *   M2     `ART_GEO_EACH` 2→0          geo +6/예산 0      ✗     ✓    예산 축 **단독** 검출력
 *   M3     `ART_GEO_EACH` 2→20 + M1 증식 geo +56/예산 60   ✓     ✗    복귀 축 **단독** 검출력
 *
 * M1 표가 단조증가를 그대로 보였다 — 회전 360° +6 → 전진 12 +18 → 복귀 1 +32 →
 * 정지 +56. world1 이 겪은 형태다. 기준선은 회전 210° 에 +6 오른 뒤 **정지까지 미동 0**.
 *
 * ⚠ **M2·M3 를 따로 돈 이유**: 기준선 실측(+6)이 예산(6)을 **정확히 꽉 채운다.**
 * 그래서 M1 하나로는 두 축이 동시에 깨져 **어느 축이 일했는지 안 갈린다** — 한쪽이
 * 죽어 있어도 같은 화면이 나온다. 양방향으로 갈라서야 둘 다 살아 있음이 실측된다.
 *
 * ⚠⚠⚠ **이 네 회차가 못 시험한 형태가 있었다** — 검수관이 찾았다(조건부 승인, 같은 날).
 * M1~M3 는 전부 「leg 마다 계속 늚」이거나 「전 구간 균일 증가」라, **전진→복귀 경계에
 * 국소적으로 걸친** 증식을 통과시켰다. 그 구멍은 아래 `backBase` 문단에서 막았고
 * `tests/invariant-judge.test.ts` 가 회귀를 본다. **실물 실측이 있어도 안 재본 형태는
 * 안 재본 것이다** — 표가 거짓은 아니었지만 표가 덮는 범위를 표가 말해주지 않는다.
 *
 * ⚠⚠ **여유가 0 이라는 것은 성질이지 사고가 아니다.** 액자 구조가 조금이라도 바뀌면
 * (그림자용 메시 추가 등) 즉시 빨간불이다. 그게 이 게이트가 하라는 일이다 — 예산은
 * 실측에 여유를 얹은 값이 아니라 **구조에서 유도한 값**이라, 어긋나면 구조가 바뀐 것이다.
 *
 * @param {{ base: object|null, rows: Array<object>, maxGeo: number, maxTex: number }} inp
 * @returns {{ artCount:number, geoBudget:number, texBudget:number,
 *             backGeo:number, backTex:number, budgetOk:boolean, settledOk:boolean }}
 */
export function stepJudge({ base, rows, maxGeo, maxTex }) {
  const artCount = base?.arts ?? rows.find((r) => r.arts != null)?.arts ?? 0;
  const geoBudget = artCount * ART_GEO_EACH;
  const texBudget = artCount * ART_TEX_EACH;

  // 복귀 구간 — 라벨로 가른다.
  //
  // 🔴 **기준선은 복귀 첫 스냅이 아니라 그 직전 행이다** (검수관 블로커, 2026-08-18).
  // 첫 판본은 `backRows[0]` 을 기준선으로 썼고 **그것이 이 개정이 새로 연 구멍이었다.**
  //
  // `measure-invariants.mjs` 의 복귀 루프는 `move → waitForTimeout(WALK_MS) → snap('복귀 N')`
  // 순서다. 즉 **`복귀 1` 스냅은 첫 복귀 leg 이동을 이미 마친 뒤에 찍힌다.** 자기 자신을
  // 기준선으로 삼으면 「전진 마지막 leg 종료」와 「복귀 1 leg 종료」 사이에 일어난 증가가
  // 기준선 안으로 흡수되어 **영구히 안 보인다.** 검수관 재현:
  //
  //   전진 24  geo 104 (기준선 100 대비 +4 — 예산 6 이내)
  //   복귀 1   geo 106 (경계에서 +2 샜다)           ← 이것이 backBase 가 됐다
  //   복귀 24  geo 106
  //   → backGeo 0 · settledOk true · budgetOk true  ← **두 축 다 통과**
  //
  // ⚠ **옛 판정식(`maxGeo <= 0`)이었다면 이 표는 무조건 FAIL 이었다**(maxGeo 6 > 0).
  // 예산 관용도를 준 것이 이 타이밍의 증식을 **새로** 통과시킨 것이다 — 판정식을 넓히는
  // 개정의 위험이 정확히 이 형태로 나타났다. 브라우저 뮤테이션 M1~M3 는 전부 「leg 마다
  // 계속 늚」이라 이 경계-국소 형태를 시험하지 못했다.
  //
  // 🔴 **이 수정이 여는 반대쪽 위험 — 거짓 FAIL**: 위 ② 문단의 전제는 *"복귀는 재방문이라
  // 처음 보는 것이 없다"* 인데, **되돌아갈 때는 반대 방향 시야**라 벽 반대면의 작품이 그때
  // 처음 그려질 수 있다. 그러면 정당한 계단인데 이 축이 FAIL 을 낸다. 지금 배치에서는
  // 실측상 복귀 구간 증가가 0 이라(작품 3장이 전부 회전 210° 에 밟혔다) 위험이 0 이지만,
  // **작품이 늘거나 배치가 바뀌면 열린다.** 검출력을 먼저 확보하는 쪽(fail-closed)을 골랐다
  // — 거짓 FAIL 은 표를 보면 즉시 드러나지만 안 잡히는 증식은 아무도 모른다.
  // **재론 조건**: 복귀 구간에서 **정당한 첫 등장**이 실제로 관측되면, 이 축을 「복귀 구간
  // 증가가 **예산 잔여** 이내」로 완화할지 팀장 판정을 받는다.
  const backStart = rows.findIndex((r) => r.label.startsWith('복귀') || r.label === '정지');
  const backRows = backStart < 0 ? [] : rows.slice(backStart);
  const backBase = backStart > 0 ? rows[backStart - 1] : (backRows[0] ?? null);
  let backGeo = 0;
  let backTex = 0;
  // ⚠ **한계 (검수관 R1)**: `backBase.geo` 가 `null` 이면 그 축 비교가 **통째로 스킵되고**
  // `backGeo` 는 0 으로 남는다 — 즉 **못 잰 것이 「증가 0」으로 통과한다.** 이 저장소가
  // 「못 잰 것은 통과가 아니다」라고 적어둔 바로 그 형태다. `base`(부팅 기준선)는 `!base`
  // 면 예외를 던지지만(`measure-invariants.mjs`) 여기 `backBase` 에는 그 보호가 없다.
  // 지금은 `__world2.stats()` 가 두 값을 항상 내므로 실현 위험이 0 이라 막지 않았다 —
  // 훅이 부분 실패할 경로가 생기면 이 자리부터 본다.
  for (const r of backRows) {
    if (backBase?.geo != null && r.geo != null) backGeo = Math.max(backGeo, r.geo - backBase.geo);
    if (backBase?.tex != null && r.tex != null) backTex = Math.max(backTex, r.tex - backBase.tex);
  }

  return {
    artCount,
    geoBudget,
    texBudget,
    backGeo,
    backTex,
    budgetOk: maxGeo <= geoBudget && maxTex <= texBudget,
    settledOk: backGeo <= 0 && backTex <= 0,
  };
}

/**
 * 판정 결과 → **화면에 찍을 줄들.** 진단문을 순수 함수로 두는 이유가 있다.
 *
 * ⚠ **진단 분기 조건은 판정식과 같은 축이어야 한다** (뮤테이션 기준선에서 실측, 2026-08-18).
 * 첫 판본은 `pass` 만 `budgetOk && settledOk` 로 고치고 진단 분기는 옛 기준
 * (`maxGeo > 0 || maxTex > 0`)을 그대로 뒀다. 그래서 **계단 예산 ✓ · 계단 소진 ✓ 인데도
 * *"증식이 돌아왔다"* 가 찍혔다** — 커버리지만 떨어진 회차에서 다음 사람이 증식을
 * 찾으러 간다. 판정식을 고치면 **그것을 읽는 자리를 전부** 같이 고쳐야 하는데, 두 곳에
 * 흩어져 있으면 한쪽만 고쳐도 아무도 모른다. 그래서 같은 파일에 둔다.
 *
 * @returns {string[]}
 */
export function stepReport({
  judgement: j, maxGeo, maxTex, maxPipe, maxDraw, judgeDraw, cov, pass,
}) {
  const out = [
    `\n  계단 예산  작품 ${j.artCount}장 → geo ≤ +${j.geoBudget} · tex ≤ +${j.texBudget}`
      + `  (실측 geo +${maxGeo} · tex +${maxTex}) ${j.budgetOk ? '✓' : '✗ 초과'}`,
    `  계단 소진  복귀 구간 증가 geo +${j.backGeo} · tex +${j.backTex} ${j.settledOk ? '✓' : '✗ 아직 는다'}`,
  ];

  if (pass) {
    out.push(`\n  ✓ PASS — 계단 예산 안에서 한 번 오르고 그 뒤 상수다`
      + ` (파셀 ${cov.unique}개·재방문 ${cov.revisits}).`);
  } else if (judgeDraw && maxDraw > 0 && j.budgetOk && j.settledOk) {
    out.push('\n  ✗ FAIL — 대조군에서 **드로우콜만** 늘었다.');
    out.push('    지오·텍스처는 그대로인데 draw 가 늘었다는 것은 **같은 자원을 더 많은 호출로**');
    out.push('    그린다는 뜻이다 — 배칭이 깨졌거나(인스턴싱 해제·재질 분화), 숨어 있던 것이');
    out.push('    보이게 됐다. 대조군에는 사람도 GLB 도 없으므로 컬링 변동으로 설명되지 않는다.');
  } else if (!j.budgetOk || !j.settledOk) {
    out.push('\n  ✗ FAIL — 세션 중 개수가 늘었다. **world1 이 겪은 증식이 돌아왔다.**');
    if (!j.budgetOk) {
      out.push(`    **예산 초과** — 작품 ${j.artCount}장으로 설명되는 양(geo +${j.geoBudget}·tex +${j.texBudget})을`);
      out.push(`    넘었다(실측 geo +${maxGeo}·tex +${maxTex}). 작품이 아닌 무언가가 늘고 있다.`);
    }
    if (!j.settledOk) {
      out.push(`    **계단이 안 끝난다** — 복귀 구간에서 geo +${j.backGeo}·tex +${j.backTex} 더 늘었다.`);
      out.push('    복귀는 **재방문**이라 처음 보는 것이 없다 — 여기서 느는 것은 순수한 증식이다.');
      out.push('    이 축이 「한 번 오르고 상수」와 「천천히 계속 늘어남」을 가르는 선이다.');
    }
    out.push('    위 표에서 어느 구간에 + 가 붙었는지가 원인 지점이다:');
    out.push('      회전 구간   → 시야에 따라 새 조합이 생긴다(재질 변종·LOD tier 등)');
    out.push('      전진 구간   → 스트리밍이 객체를 새로 만든다(슬롯 방식이 깨짐)');
    out.push('      복귀 구간   → 슬롯 반납이 안 되어 재방문마다 쌓인다');
  }

  // 이 조합은 "지오·텍스처는 그대로인데 파이프라인만 늘었다" — 재질 **구조**가 바뀌는
  // 경로가 생겼다는 뜻이다. WebGL 에서도 잡히면 실기기(WebGPU)에서는 더 크다.
  if (maxPipe > 0 && maxGeo <= 0 && maxTex <= 0) {
    out.push('\n  ⚠ 경고 — geometry·texture 는 상수인데 pipeline 이 늘었다.');
    out.push('    재질 구조 신호(맵 유무·transparent·조명 수)가 런타임에 바뀌는 경로가 있다.');
    out.push('    world1 을 무너뜨린 것이 정확히 이 축이다. FAIL 은 아니지만 반드시 본다.');
  }
  return out;
}
