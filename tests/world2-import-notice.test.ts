// 되읽기 결과가 **화면에 실패를 말하는가** — `ui/import-notice.ts`.
//
// ── 왜 이 파일이 생겼나 (검수관 조건 C1, 2026-08-25) ────────────────────────
// 감독이 신고한 화면은 이것이었다:
//
//     이 파일을 편집본 불러오기 했더니. 재질이름형식이 아니라고 나오네.
//
// 뿌리(반환 타입)를 고친 뒤에도 **고지 코드 자체에는 검사가 0이었다.** 검수관이
// 실측으로 못 박았다 — `failed` 판정을 `false` 로 바꾸면 버튼 라벨·고지·경고 세 자리가
// **동시에** 실패를 안 말하게 되는데 **4,785건 중 0건**이 깨졌다. 즉 신고된 화면이
// 그대로 돌아와도 게이트가 통과한다.
//
// B1 은 애초에 «검사가 없어서 조용했던» 결함이다. 검사 없이 고치면 같은 경로로 온다.
//
// ── 무엇을 보는가 ───────────────────────────────────────────────────────────
// **문구 전체가 아니라 실패 표식의 존재**만 본다(검수관 GS-B 명세). 문구를 다듬을
// 때마다 깨지는 검사는 곧 무시되고, 무시되는 검사는 없는 것과 같다.

import { describe, it, expect } from 'vitest';
import { importNotice, type ImportOutcome } from '../frontend/js/world2/ui/import-notice.js';

/** 실패를 말하고 있는가 — 세 자리 중 하나라도 침묵하면 사용자가 모른다 */
function saysFailure(o: ImportOutcome) {
  const n = importNotice(o);
  return {
    flag: n.failed,
    note: /못 올렸|못 읽었/.test(n.note),
    lead: n.leadWarning !== null,
    label: /못 읽었/.test(n.rejectLabel),
  };
}

describe('실패는 **파츠가 실렸어도** 말한다 (감독 신고의 형태)', () => {
  // 감독이 실제로 고르는 파일: 우리 파츠 28,704 + 블렌더에서 추가한 물건 1.
  // `parts > 0` 이라 «성공» 으로 보이지만 물건은 안 올라왔다.
  const REAL: ImportOutcome = { parts: 28_704, foreign: 0, reason: 'error', detail: '망가진 GLB' };

  it('`error` — 고지와 경고 **양쪽**이 실패를 말한다', () => {
    const s = saysFailure(REAL);
    expect(s.flag, 'failed 판정이 죽으면 세 자리가 동시에 침묵한다').toBe(true);
    expect(s.note, '고지가 «대체합니다» 로만 끝나면 신고된 화면 그대로다').toBe(true);
    expect(s.lead, 'notes[0] 만 버튼에 나간다 — 여기 없으면 모바일에서 안 보인다').toBe(true);
  });

  it('`no-bin` — 예외가 아니라 값이라 더 조용했던 갈래다', () => {
    const s = saysFailure({ ...REAL, reason: 'no-bin', detail: undefined });
    expect(s.flag).toBe(true);
    expect(s.note).toBe(true);
    expect(s.lead).toBe(true);
  });

  it('사유가 사람 말이다 — `no-bin` 을 그대로 보여주지 않는다', () => {
    const n = importNotice({ parts: 1, foreign: 0, reason: 'no-bin' });
    expect(n.why).not.toBe('no-bin');
    expect(n.why.length, '빈 사유는 «알 수 없는 오류» 만도 못하다').toBeGreaterThan(4);
  });

  it('`detail` 이 없어도 사유가 빈칸이 아니다', () => {
    expect(importNotice({ parts: 1, foreign: 0, reason: 'error' }).why).toBeTruthy();
  });
});

describe('성공을 실패로 알리지 않는다 — 반대 방향의 같은 실패다', () => {
  it('물건이 올라왔으면 실패 표식이 **없다**', () => {
    const s = saysFailure({ parts: 28_704, foreign: 1, reason: 'ok' });
    expect(s.flag).toBe(false);
    expect(s.note).toBe(false);
    expect(s.lead).toBe(false);
  });

  it('남의 메시가 없는 파일(`none`)은 정상이다 — 우리 파츠만 든 GLB', () => {
    const n = importNotice({ parts: 28_704, foreign: 0, reason: 'none' });
    expect(n.failed).toBe(false);
    expect(n.note).toContain('대체합니다');
  });

  it('올라온 개수를 고지에 적는다 — 감독이 읽는 숫자다', () => {
    // 상수를 박는 결함과 구별되려면 표본이 가변이어야 한다(이 회차의 M7 교훈).
    for (const n of [1, 7, 1234]) {
      expect(importNotice({ parts: 10, foreign: n, reason: 'ok' }).note)
        .toContain(n.toLocaleString());
    }
  });

  it('`stale` 은 실패가 아니다 — 더 새 회차가 화면을 책임진다', () => {
    expect(importNotice({ parts: 10, foreign: 0, reason: 'stale' }).failed).toBe(false);
  });
});

describe('아무것도 못 읽은 파일', () => {
  it('양쪽 다 0 이면 거절한다', () => {
    expect(importNotice({ parts: 0, foreign: 0, reason: 'none' }).reject).toBe(true);
  });

  it('한쪽이라도 있으면 거절하지 않는다 — 파츠 0 + 남의 메시만인 파일도 연다', () => {
    // 감독 지시 *"블랜더의 glb로 내보낸 것은 그대로 올라와야지"* 의 축이다.
    expect(importNotice({ parts: 0, foreign: 3, reason: 'ok' }).reject).toBe(false);
    expect(importNotice({ parts: 5, foreign: 0, reason: 'none' }).reject).toBe(false);
  });

  it('거절 라벨이 **실패와 형식 불일치를 가른다**', () => {
    // 실패해서 0 인 것을 «형식이 아니다» 로 뭉개면 사용자가 파일을 의심한다 —
    // 실제로는 우리가 못 읽은 것이다.
    expect(saysFailure({ parts: 0, foreign: 0, reason: 'no-bin' }).label).toBe(true);
    expect(saysFailure({ parts: 0, foreign: 0, reason: 'none' }).label).toBe(false);
  });
});
