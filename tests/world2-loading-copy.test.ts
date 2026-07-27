// world2 로딩 문구 회전 판정 테스트.
//
// 핵심 규약: **문구를 보여주려고 로딩을 늘리지 않는다.** 빠른 기기에서는 첫 문구 하나만
// 보이고 끝나야 하고, 로테이션은 로딩이 실제로 길어질 때만 돈다.

import { describe, it, expect } from 'vitest';
import {
  COPY, ROTATE_MS, RICH_AFTER_MS, copyIndexAt, didRotate, validCopy,
  loadingDetail, copySlot,
} from '../web/js/world2/decide/loading-copy.js';

describe('copyIndexAt — 회전', () => {
  it('시작 직후에는 첫 문구', () => {
    expect(copyIndexAt(0, 6)).toBe(0);
    expect(copyIndexAt(ROTATE_MS - 1, 6)).toBe(0);
  });

  it('빠른 부팅(1.4초)에서는 첫 문구에서 끝난다 — 억지로 넘기지 않는다', () => {
    // world2 실측 부팅이 1.4초다. 이 구간에서 문구가 바뀌면 읽기도 전에 사라진다.
    expect(copyIndexAt(1_400, 6)).toBe(0);
  });

  it('주기마다 다음으로 넘어간다', () => {
    expect(copyIndexAt(ROTATE_MS, 6)).toBe(1);
    expect(copyIndexAt(ROTATE_MS * 2, 6)).toBe(2);
  });

  it('끝까지 가면 처음으로 돌아온다', () => {
    expect(copyIndexAt(ROTATE_MS * 6, 6)).toBe(0);
    expect(copyIndexAt(ROTATE_MS * 7, 6)).toBe(1);
  });

  it('문구가 하나뿐이면 항상 그것', () => {
    for (const t of [0, 5_000, 60_000]) expect(copyIndexAt(t, 1)).toBe(0);
  });

  it('문구가 없으면 -1 — 0을 돌려주면 없는 항목을 읽는다', () => {
    expect(copyIndexAt(1_000, 0)).toBe(-1);
  });

  it('이상한 입력에 안전하다', () => {
    expect(copyIndexAt(-500, 6)).toBe(0);
    expect(copyIndexAt(NaN, 6)).toBe(0);
    expect(copyIndexAt(1_000, 6, 0)).toBe(0); // 주기 0이면 고정
  });

  it('항상 유효한 인덱스를 돌려준다', () => {
    for (let t = 0; t < 60_000; t += 137) {
      const i = copyIndexAt(t, COPY.length);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(COPY.length);
    }
  });
});

describe('loadingDetail — 3초 게이트 (감독 지시)', () => {
  it('3초 이하는 minimal — 프로그레스 바만', () => {
    for (const t of [0, 1_400, RICH_AFTER_MS - 1]) expect(loadingDetail(t)).toBe('minimal');
  });

  it('3초부터 rich', () => {
    expect(loadingDetail(RICH_AFTER_MS)).toBe('rich');
    expect(loadingDetail(10_000)).toBe('rich');
  });

  it('이상한 입력은 minimal로 — 화면이 갑자기 풍성해지는 쪽으로 틀리지 않는다', () => {
    expect(loadingDetail(NaN)).toBe('minimal');
  });
});

describe('copySlot — 3초 게이트 + 회전', () => {
  it('3초 전에는 -1 — 문구가 아예 없다', () => {
    for (const t of [0, 1_400, RICH_AFTER_MS - 1]) expect(copySlot(t, 6)).toBe(-1);
  });

  it('3초 시점에 첫 문구', () => {
    expect(copySlot(RICH_AFTER_MS, 6)).toBe(0);
  });

  it('첫 문구를 읽을 시간을 준다 — 뜨자마자 넘어가지 않는다', () => {
    // 회전 기준이 부팅 경과였다면 3초에 떠서 3.2초에 바로 넘어간다(0.2초).
    expect(copySlot(RICH_AFTER_MS + ROTATE_MS - 1, 6)).toBe(0);
    expect(copySlot(RICH_AFTER_MS + ROTATE_MS, 6)).toBe(1);
  });

  it('rich 진입 후 주기대로 돈다', () => {
    expect(copySlot(RICH_AFTER_MS + ROTATE_MS * 2, 6)).toBe(2);
    expect(copySlot(RICH_AFTER_MS + ROTATE_MS * 6, 6)).toBe(0);
  });

  it('문구가 없으면 -1', () => {
    expect(copySlot(RICH_AFTER_MS + 5_000, 0)).toBe(-1);
  });
});

describe('didRotate — 문구 세트가 필요한지 판단할 근거', () => {
  it('짧은 로딩에서는 회전하지 않았다', () => {
    expect(didRotate(1_400)).toBe(false);
  });

  it('긴 로딩에서는 회전했다', () => {
    expect(didRotate(ROTATE_MS + 1)).toBe(true);
  });
});

describe('validCopy — 잘못된 문안이 조용히 흘러가지 않게', () => {
  it('정상 세트를 통과시킨다', () => {
    expect(validCopy(['가나다', '라마바'])).toBe(true);
  });

  it('실제 COPY가 규약을 지킨다', () => {
    expect(validCopy(COPY)).toBe(true);
  });

  it('빈 목록은 거부', () => {
    expect(validCopy([])).toBe(false);
  });

  it('빈 문자열·공백만은 거부 — 화면에 빈 줄이 뜬다', () => {
    expect(validCopy(['정상', ''])).toBe(false);
    expect(validCopy(['정상', '   '])).toBe(false);
  });

  it('중복은 거부 — 같은 문구가 연달아 보이면 멈춘 것처럼 읽힌다', () => {
    expect(validCopy(['같은 문구', '같은 문구'])).toBe(false);
  });

  it('너무 긴 문구는 거부 — 한 줄을 넘치면 레이아웃이 흔들린다', () => {
    expect(validCopy(['가'.repeat(31)])).toBe(false);
    expect(validCopy(['가'.repeat(30)])).toBe(true);
  });
});

describe('COPY 데이터 규약', () => {
  it('충분한 개수가 있다 — 긴 로딩에서 같은 문구가 금방 돌아오지 않게', () => {
    expect(COPY.length).toBeGreaterThanOrEqual(4);
  });

  it('느낌표를 쓰지 않는다 — 조용한 럭셔리 톤', () => {
    for (const s of COPY) expect(s).not.toMatch(/[!！]/);
  });

  it('순서에 의존하지 않는다 — 각 문구가 독립적으로 읽힌다', () => {
    // 접속사로 시작하면 앞 문구를 전제하게 된다.
    for (const s of COPY) expect(s).not.toMatch(/^(그리고|그래서|하지만|또한|그런데)/);
  });
});
