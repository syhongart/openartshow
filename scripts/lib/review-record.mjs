// scripts/lib/review-record.mjs
// PR 본문의 **검수관 판정 기록**을 파싱·검증한다. 순수 함수 — I/O 없음.
//
// ── 왜 자기신고를 게이트로 쓰는가 (팀장 판정 2026-07-30) ─────────────────────
// 부팀장이 처음에 이 축을 기각했다: *"PR 본문 검사는 자기신고라 구현자가 '승인 받음'
// 이라 적으면 통과 → 게이트가 아니다."* 팀장이 그것을 **사고의 실측 형태**로 반박했다:
//
//   *"실제 사고(PR #36)의 형태는 위조가 아니라 누락이었다 — 부팀장은 '재확인 받았다' 고
//   거짓말한 것이 아니라 재확인 절차 자체를 건너뛰었다. 자기신고 검사는 위조를 못 막지만
//   누락은 막는다 — 사고의 실측 형태에는 유효한 집행 수단이다."*
//
// 그리고 위조는 성격이 다르다: "규율을 어김" 이 아니라 **거짓 기록**이고, 그것은 사후에
// PR 이력으로 드러난다. 막는 대상을 정확히 좁히면 이 검사는 장식이 아니다.
//
// ── 무엇을 막고 무엇을 못 막는가 ────────────────────────────────────────────
// 막는다:   판정 기록 **누락** · 형식 오류 · 조건부인데 **재확인 근거 없음** · **반려** 상태 병합
//           · 판정 줄이 여러 개(옛 줄을 남긴 채 덧붙이는 편집 — 검수관 블로커 2026-07-30)
// 못 막는다: 위조("승인" 이라 적었지만 안 받은 경우) · 검수관이 실제로 무엇을 봤는지의 질
//           · **fork PR 이 이 파일 자체를 고쳐 항상 통과하게 만드는 것** — 워크플로가
//             `pull_request` 트리거로 PR head 를 checkout 하므로 검사 코드가 PR 소유다
//             (검수관 권고 2026-07-30). 위조 한계의 연장선이고, 이 저장소는 지금 외부
//             기여자가 없어 실효 위험이 없다 — 열리면 `pull_request_target` 검토 사안이다.

/** 판정 종류. `해당없음` 은 검수관 트리거에 해당하지 않는 변경을 위한 것이다. */
export const VERDICTS = ['승인', '조건부', '반려', '해당없음'];

/**
 * PR 본문에서 판정 기록 줄을 찾는다.
 *
 * 기대 형식(한 줄):
 *   검수관 판정: 승인
 *   검수관 판정: 조건부 (재확인: <커밋 해시 또는 링크>)
 *   검수관 판정: 반려
 *   검수관 판정: 해당없음 (<사유>)
 *
 * @param {string} body PR 본문
 * @returns {{verdict: string|null, detail: string, raw: string|null, count: number}}
 */
export function parseReviewRecord(body) {
  const text = String(body ?? '').replace(/\r\n/g, '\n');
  // 코드블록 안의 예시를 판정으로 오인하지 않게 ``` 구간을 먼저 지운다.
  // (이 파일의 설명을 PR 본문에 붙여넣는 일이 실제로 생긴다.)
  const stripped = text.replace(/```[\s\S]*?```/g, '');

  // ── **모든** 판정 줄을 찾는다 (검수관 블로커 2026-07-30) ────────────────────
  // 첫 판본은 `.match(...)` 로 **첫 매치**만 채택했다. 검수관이 실측으로 사각을 냈다:
  //
  //   "검수관 판정: 승인\n\n(재검토 후 갱신)\n검수관 판정: 반려"  →  ok: true, verdict: 승인
  //
  // PR 본문에 옛 판정 줄을 남긴 채 새 줄을 덧붙이면 **관대한 옛 판정이 이긴다.** 위험이
  // 통과 쪽으로 편향돼 있다(반려 먼저 → 승인 나중은 안전하게 막힌다). 이 검사가 표방한
  // "누락은 막는다" 를 정면으로 비껴가고, 본문을 통짜 교체하지 않고 이어 붙이는 편집은
  // 드문 습관이 아니다.
  //
  // 마지막 매치를 조용히 채택하는 대신 **여러 개면 FAIL** 로 간다(`validateReviewRecord`).
  // 조용히 고르면 "옛 줄을 안 지웠다" 는 사실이 아무 데도 안 나타나고, 어느 것이 최신인지는
  // 본문 순서로 보증되지 않는다. `count` 를 노출해 판정을 호출부로 넘긴다.
  //
  // 앵커를 `^\s*` 에서 `^[ \t]*` 로 좁혔다 — `\s` 는 개행을 포함하므로 `g` 플래그로 반복
  // 매치할 때 앞의 빈 줄을 삼켜 매치 경계가 흐려진다. 판정은 한 줄 형식이다.
  const all = [...stripped.matchAll(/^[ \t]*검수관[ \t]*판정[ \t]*:[ \t]*(.+)$/gm)];
  if (all.length === 0) return { verdict: null, detail: '', raw: null, count: 0 };

  const m = all[all.length - 1];
  const rest = m[1].trim();
  const verdict = VERDICTS.find((v) => rest.startsWith(v)) ?? null;
  const detail = verdict ? rest.slice(verdict.length).trim() : rest;
  return { verdict, detail, raw: m[0].trim(), count: all.length };
}

/**
 * 판정 기록을 검증한다.
 *
 * @param {string} body PR 본문
 * @returns {{ok: boolean, errors: string[], record: object}}
 */
export function validateReviewRecord(body) {
  const record = parseReviewRecord(body);
  const errors = [];

  if (record.raw === null) {
    errors.push(
      'PR 본문에 판정 기록이 없다. 다음 중 한 줄을 넣어라:\n'
      + '    검수관 판정: 승인\n'
      + '    검수관 판정: 조건부 (재확인: <커밋 해시 또는 리뷰 링크>)\n'
      + '    검수관 판정: 반려\n'
      + '    검수관 판정: 해당없음 (<사유 — 왜 검수관 트리거가 아닌지>)',
    );
    return { ok: false, errors, record };
  }

  // 판정 줄이 여러 개면 **어느 것이 최신인지 본문 순서로 보증되지 않는다.** 옛 줄을
  // 남긴 채 새 판정을 덧붙이는 편집에서 관대한 쪽이 이길 수 있었다(검수관 블로커).
  // 고르지 않고 지우게 한다 — 사람이 어느 것을 남길지 판단하는 것이 옳다.
  if (record.count > 1) {
    errors.push(
      `판정 기록이 **${record.count}개**다 — 어느 것이 최신인지 알 수 없다.\n`
      + '  옛 판정 줄을 지우고 최신 것 하나만 남겨라. (본문 순서는 최신을 보증하지 않는다.)',
    );
    return { ok: false, errors, record };
  }

  if (record.verdict === null) {
    errors.push(`판정 값을 알 수 없다: "${record.raw}" — ${VERDICTS.join(' / ')} 중 하나여야 한다.`);
    return { ok: false, errors, record };
  }

  // 조건부 승인은 **재확인 근거**가 있어야 한다. 이것이 PR #36 에서 빠진 그 지점이다 —
  // 조건을 고친 것은 맞지만 재확인을 받지 않았고, 그러면 조건부는 승인과 구별되지 않는다.
  if (record.verdict === '조건부') {
    const hasRef = /재확인\s*:\s*\S+/.test(record.detail);
    if (!hasRef) {
      errors.push(
        '조건부 승인인데 **재확인 근거가 없다.** 조건을 해소한 뒤 검수관 재확인을 받고\n'
        + '    검수관 판정: 조건부 (재확인: <커밋 해시 또는 리뷰 링크>)\n'
        + '  형식으로 그 근거를 적어라. 구현자가 "해소했다" 고 판단하는 것으로 갈음하지 않는다.',
      );
    }
  }

  // 반려 상태로는 병합하지 않는다. 고쳐서 재제출하고 판정을 갱신해야 한다.
  if (record.verdict === '반려') {
    errors.push('판정이 **반려**다 — 병합하지 않는다. 블로커를 고쳐 재제출하고 판정을 갱신해라.');
  }

  // '해당없음' 은 사유를 요구한다. 사유 없이 쓰면 검사를 무력화하는 우회로가 된다.
  if (record.verdict === '해당없음' && record.detail.replace(/[()\s]/g, '') === '') {
    errors.push('"해당없음" 은 **사유가 필수**다 — 왜 검수관 트리거에 해당하지 않는지 적어라.');
  }

  return { ok: errors.length === 0, errors, record };
}
