#!/usr/bin/env node
// scripts/smoke/check-review-record.mjs — PR 본문의 검수관 판정 기록 검사 (CI 엔트리)
//
// 판정 로직은 `scripts/lib/review-record.mjs`(순수 함수)에 있다. 여기는 I/O 만 한다 —
// 그래야 로직을 테스트할 수 있다(`tests/review-record.test.ts`).
//
// PR 본문은 워크플로가 `PR_BODY` 환경변수로 넘긴다. 로컬에서도 돌릴 수 있다:
//   PR_BODY="검수관 판정: 승인" node scripts/smoke/check-review-record.mjs

import { validateReviewRecord } from '../lib/review-record.mjs';
import { changedFiles, judge, TIERS } from '../lib/verification-tier.mjs';

const body = process.env.PR_BODY ?? '';

// 본문이 아예 안 넘어온 경우(워크플로 배선 실수)를 **통과로 적지 않는다.**
// 빈 본문은 "판정 기록 없음" 과 같은 결과여야 한다 — 조용히 통과하면 이 검사가 장식이 된다.
if (!process.env.PR_BODY && process.env.PR_BODY !== '') {
  console.error('[FAIL] PR_BODY 환경변수가 없다 — 워크플로 배선을 확인하라.');
  console.error('       (빈 본문과 미배선을 구별한다: 미배선은 검사 자체가 안 돈 것이다)');
  process.exit(2);
}

const { ok, errors, record } = validateReviewRecord(body);

if (ok) {
  // ⚠ `[PASS]` 를 **여기서 찍지 않는다.** 아래 `해당없음` 근거 검사가 FAIL 할 수 있고,
  // 그러면 실패 회차 로그에 `[PASS]` 가 **먼저** 남는다 — 로그를 grep 하는 다음 사람에게
  // 위험한 형태다(검수관 권고 R-c, 2026-08-05). 형식 검사는 중간 단계이므로 `[..]` 로
  // 적고, `[PASS]`/`[FAIL]` 은 **최종 판정에서 한 번만** 찍는다.
  const label = `검수관 판정 기록 — ${record.verdict}${record.detail ? ` ${record.detail}` : ''}`;

  // ── `해당없음` 은 **근거를 검사한다** (검수관 반려 B4, 2026-08-05) ─────────────
  //
  // 검증 등급(#195) 도입 전에는 `해당없음` 이 좁은 예외였다(검수관 트리거에 해당하지 않는
  // 변경). 도입 후에는 **2·3등급의 상시 경로**가 된다 — *"3등급이라 면제"* 라고 적으면
  // 통과하고 그 진위를 아무도 안 봤다. 등급 도입이 **"면제 주장" 이라는 새 누락 형태**를
  // 열었으므로 그에 대응하는 검사가 필요하다.
  //
  // ⚠ 이것은 **게이트가 검증을 면제하는** 구조가 아니다. 방향이 반대다 — 게이트는
  // **면제 주장의 근거**를 검사한다. 판정기 CLI 자체는 여전히 게이트가 아니다(종료코드 0).
  if (record.verdict === '해당없음') {
    console.log(`[..] ${label} — 근거(등급) 확인 중`);
    process.exit(checkExemption());
  }
  console.log(`[PASS] ${label}`);
  process.exit(0);
}

/** `해당없음` 의 근거가 성립하는가. 1등급이면 검수관이 필수이므로 면제가 성립하지 않는다 */
function checkExemption() {
  const base = process.env.PR_BASE_SHA;
  if (!base) {
    // 못 잰 것을 통과로 적지 않는다. 얕은 checkout 이면 `fetch-depth: 0` 이 필요하다.
    console.error('[FAIL] `해당없음` 인데 PR_BASE_SHA 가 없다 — 등급을 판정할 수 없다.');
    console.error('       워크플로에 `fetch-depth: 0` 과 base sha 배선을 확인하라(fail-closed).');
    return 2;
  }
  let files;
  try {
    files = changedFiles(base);
  } catch (e) {
    console.error(`[FAIL] 변경 목록을 못 얻었다(base=${base}): ${e.message}`);
    console.error('       판정 불가는 통과가 아니다(fail-closed).');
    return 2;
  }
  const { tier, rows } = judge(files);
  if (tier === 1) {
    console.error('');
    console.error(`[FAIL] \`해당없음\` 이라 적혔으나 이 변경은 **${TIERS[1].name}** 이다.`);
    console.error('       1등급은 검수관 교차리뷰가 필수다 — 면제 주장이 성립하지 않는다.');
    console.error('');
    for (const r of rows.filter((x) => x.tier === 1).slice(0, 10)) {
      console.error(`  · ${r.file}  ↳ ${r.why}`);
    }
    console.error('');
    console.error('       등급을 직접 보려면: node scripts/verification-tier.mjs --base <base>');
    return 1;
  }
  console.log(`[PASS] 면제 근거 확인 — ${TIERS[tier].name}(변경 ${files.length}건)`);
  return 0;
}

console.error('[FAIL] 검수관 판정 기록 검사');
console.error('');
for (const e of errors) console.error(`  · ${e}`);
console.error('');
console.error('  왜 이 검사가 있나: PR #36 에서 조건부 승인의 블로커를 고치고 재확인 없이');
console.error('  병합했다. 구현자가 "해소했다" 고 판단하면 조건부 승인이 승인과 구별되지 않는다.');
console.error('  상세: .claude/agents/release-reviewer.md 의 "반려의 구속력"');
process.exit(1);
