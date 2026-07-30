// tests/review-record.test.ts — 검수관 판정 기록 검사의 검출력
//
// 팀장이 이 축을 조건으로 걸며 논거를 이렇게 냈다: *"실제 사고(PR #36)의 형태는 위조가
// 아니라 누락이었다. 자기신고 검사는 위조를 못 막지만 누락은 막는다."*
//
// 그래서 이 테스트는 **막아야 하는 것**과 **막지 못하는 것**을 둘 다 고정한다. 후자를
// 적지 않으면 "판정 기록 검사가 있으니 안전하다" 는 없는 보증이 된다.

import { describe, it, expect } from 'vitest';
import { parseReviewRecord, validateReviewRecord, VERDICTS } from '../scripts/lib/review-record.mjs';

describe('parseReviewRecord — 판정 줄 찾기', () => {
  it('네 가지 판정을 모두 읽는다', () => {
    for (const v of VERDICTS) {
      expect(parseReviewRecord(`검수관 판정: ${v}`).verdict).toBe(v);
    }
  });

  it('본문 중간에 있어도 찾는다', () => {
    const body = '## 요약\n\n어쩌고\n\n검수관 판정: 승인\n\n## 그 외\n저쩌고';
    expect(parseReviewRecord(body).verdict).toBe('승인');
  });

  it('공백 변형을 허용한다', () => {
    expect(parseReviewRecord('  검수관  판정 :  승인  ').verdict).toBe('승인');
  });

  it('CRLF 를 정규화한다', () => {
    expect(parseReviewRecord('머리말\r\n검수관 판정: 승인\r\n').verdict).toBe('승인');
  });

  it('상세를 분리해 담는다', () => {
    const r = parseReviewRecord('검수관 판정: 조건부 (재확인: abc1234)');
    expect(r.verdict).toBe('조건부');
    expect(r.detail).toBe('(재확인: abc1234)');
  });

  it('코드블록 안의 예시를 판정으로 오인하지 않는다', () => {
    // 이 파일의 설명이나 템플릿을 PR 본문에 붙여넣는 일이 실제로 생긴다.
    const body = '형식은 아래와 같다:\n\n```\n검수관 판정: 승인\n```\n\n아직 안 받았다.';
    expect(parseReviewRecord(body).raw).toBeNull();
  });

  it('판정 줄이 여러 개면 마지막을 채택하고 개수를 노출한다', () => {
    const r = parseReviewRecord('검수관 판정: 승인\n\n(재검토 후 갱신)\n검수관 판정: 반려');
    expect(r.count).toBe(2);
    // 첫 매치를 쓰면 '승인' 이 나온다 — 그것이 검수관이 낸 블로커였다.
    expect(r.verdict).toBe('반려');
  });

  it('코드블록 예시는 개수에 세지 않는다 (거짓 FAIL 방지)', () => {
    const body = '형식:\n\n```\n검수관 판정: 승인\n```\n\n검수관 판정: 조건부 (재확인: abc1234)';
    const r = parseReviewRecord(body);
    expect(r.count).toBe(1);
    expect(r.verdict).toBe('조건부');
  });

  it('없으면 raw=null', () => {
    expect(parseReviewRecord('판정 얘기 없음').raw).toBeNull();
    expect(parseReviewRecord('').raw).toBeNull();
    expect(parseReviewRecord(null as unknown as string).raw).toBeNull();
  });
});

describe('validateReviewRecord — 막아야 하는 것', () => {
  it('판정 기록 누락 → 실패 (이것이 PR #36 의 형태다)', () => {
    const r = validateReviewRecord('## 요약\n어쩌고');
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('판정 기록이 없다');
  });

  it('빈 본문 → 실패', () => {
    expect(validateReviewRecord('').ok).toBe(false);
  });

  it('조건부인데 재확인 근거 없음 → 실패 (핵심 단언)', () => {
    // PR #36 에서 빠진 정확히 그 지점이다. 조건을 고친 것은 맞지만 재확인을 받지
    // 않았고, 그러면 조건부 승인이 승인과 구별되지 않는다.
    const r = validateReviewRecord('검수관 판정: 조건부');
    expect(r.ok).toBe(false);
    expect(r.errors.join('')).toContain('재확인 근거가 없다');
  });

  it('반려 → 실패 (병합 금지)', () => {
    const r = validateReviewRecord('검수관 판정: 반려');
    expect(r.ok).toBe(false);
    expect(r.errors.join('')).toContain('반려');
  });

  it('해당없음에 사유가 없으면 실패 — 검사를 무력화하는 우회로를 막는다', () => {
    expect(validateReviewRecord('검수관 판정: 해당없음').ok).toBe(false);
    expect(validateReviewRecord('검수관 판정: 해당없음 ()').ok).toBe(false);
  });

  it('판정 줄 2개 → 실패 (검수관 블로커 2026-07-30)', () => {
    // ── 실측된 사각이다 ──────────────────────────────────────────────────
    // 첫 판본은 첫 매치만 채택해서 아래가 `ok: true, verdict: 승인` 이었다. 옛 판정 줄을
    // 남긴 채 새 줄을 덧붙이면 **관대한 옛 판정이 이겼다.** 위험이 통과 쪽으로 편향돼
    // 있었다 — 이 검사가 표방한 "누락은 막는다" 를 정면으로 비껴간다.
    const r = validateReviewRecord('검수관 판정: 승인\n\n(재검토 후 갱신)\n검수관 판정: 반려');
    expect(r.ok).toBe(false);
    expect(r.errors.join('')).toContain('2개');
  });

  it('판정 줄 2개는 순서와 무관하게 실패 — 통과 쪽으로 새지 않는다', () => {
    // 반대 순서(반려 먼저 → 승인 나중)도 막는다. "마지막을 채택" 만으로 고치면 이쪽이
    // 통과하는데, 어느 것이 최신인지 본문 순서로 보증되지 않으므로 둘 다 막아야 한다.
    const r = validateReviewRecord('검수관 판정: 반려\n\n검수관 판정: 승인');
    expect(r.ok).toBe(false);
    expect(r.errors.join('')).toContain('2개');
  });

  it('알 수 없는 판정 값 → 실패', () => {
    const r = validateReviewRecord('검수관 판정: 아마도 괜찮음');
    expect(r.ok).toBe(false);
    expect(r.errors.join('')).toContain('판정 값을 알 수 없다');
  });
});

describe('validateReviewRecord — 통과해야 하는 것 (거짓 FAIL 방지)', () => {
  it('승인', () => {
    expect(validateReviewRecord('검수관 판정: 승인').ok).toBe(true);
  });

  it('조건부 + 재확인 커밋 해시', () => {
    expect(validateReviewRecord('검수관 판정: 조건부 (재확인: 5a83401)').ok).toBe(true);
  });

  it('조건부 + 재확인 링크', () => {
    const body = '검수관 판정: 조건부 (재확인: https://github.com/x/y/pull/1#issuecomment-1)';
    expect(validateReviewRecord(body).ok).toBe(true);
  });

  it('해당없음 + 사유', () => {
    expect(validateReviewRecord('검수관 판정: 해당없음 (오탈자 수정만)').ok).toBe(true);
  });

  it('실제 PR 본문 모양에서도 통과한다', () => {
    const body = [
      '감독 지시로 X 를 했다.',
      '',
      '## 검증',
      '게이트 6종 exit 0 · test 1090.',
      '',
      '검수관 판정: 조건부 (재확인: 5a83401)',
      '',
      '🤖 Generated with Claude Code',
    ].join('\n');
    expect(validateReviewRecord(body).ok).toBe(true);
  });
});

describe('못 막는 것 — 통과로 적지 않는다', () => {
  it('**위조는 막지 못한다** — 안 받은 승인을 적어도 통과한다', () => {
    // 이것이 이 검사의 근본 한계다. 팀장 판정: 위조는 "규율을 어김" 이 아니라 **거짓
    // 기록**이고 성격이 다른(더 무거운) 위반이며, 사후에 PR 이력으로 드러난다.
    // 막는 대상을 누락으로 좁혔기 때문에 이 검사가 장식이 아닌 것이다.
    expect(validateReviewRecord('검수관 판정: 승인').ok).toBe(true);
    // ↑ 검수관을 부른 적이 없어도 통과한다. 이 단언은 **한계를 고정하는 것**이고
    //   깨지면 "위조도 막게 됐다" 는 뜻이므로 그때 이 주석을 고쳐야 한다.
  });

  it('검수관이 실제로 무엇을 봤는지의 질은 검사 대상이 아니다', () => {
    // 형식만 본다. 리뷰의 깊이·범위는 사람(감독)이 판단한다.
    expect(validateReviewRecord('검수관 판정: 조건부 (재확인: 아무거나)').ok).toBe(true);
  });
});
