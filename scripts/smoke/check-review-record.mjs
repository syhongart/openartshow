#!/usr/bin/env node
// scripts/smoke/check-review-record.mjs — PR 본문의 검수관 판정 기록 검사 (CI 엔트리)
//
// 판정 로직은 `scripts/lib/review-record.mjs`(순수 함수)에 있다. 여기는 I/O 만 한다 —
// 그래야 로직을 테스트할 수 있다(`tests/review-record.test.ts`).
//
// PR 본문은 워크플로가 `PR_BODY` 환경변수로 넘긴다. 로컬에서도 돌릴 수 있다:
//   PR_BODY="검수관 판정: 승인" node scripts/smoke/check-review-record.mjs

import { validateReviewRecord } from '../lib/review-record.mjs';

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
  console.log(`[PASS] 검수관 판정 기록 — ${record.verdict}${record.detail ? ` ${record.detail}` : ''}`);
  process.exit(0);
}

console.error('[FAIL] 검수관 판정 기록 검사');
console.error('');
for (const e of errors) console.error(`  · ${e}`);
console.error('');
console.error('  왜 이 검사가 있나: PR #36 에서 조건부 승인의 블로커를 고치고 재확인 없이');
console.error('  병합했다. 구현자가 "해소했다" 고 판단하면 조건부 승인이 승인과 구별되지 않는다.');
console.error('  상세: .claude/agents/release-reviewer.md 의 "반려의 구속력"');
process.exit(1);
