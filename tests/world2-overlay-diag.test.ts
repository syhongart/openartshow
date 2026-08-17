// @vitest-environment node
//
// 오버레이 **진단 계약** — `want` · `failed` 상한 · `failedTotal`.
//
// ── 이 파일은 뮤테이션이 만들게 했다 (2026-08-16, W8-2) ─────────────────────
// W8-2 에서 진단 필드 셋을 넣고 검출력을 실증했더니 **셋 다 `0 failed`** 였다.
// 전체 스위트 3,452개를 돌려도 안 잡혔다:
//
//   D1  `diag.want` 대입 삭제        → 0 failed
//   D3  `failed` 상한 제거(무제한)    → 0 failed
//   D4  `failedTotal++` 삭제         → 0 failed
//
// **등가가 아니었다** — 셋 다 동작이 실제로 달라진다(완주 판정의 분모가 사라지고, 배열이
// 무한히 자라고, 규모를 못 센다). **그 축을 보는 검사가 하나도 없었을 뿐이다.**
//
// 왜 없었나: 그 코드가 `features/overlay.ts` 에 있었고 그 파일은 three 를 import 하므로
// **노드 테스트가 실행할 수 없다.** 그래서 그쪽 검사는 전부 소스 텍스트를 읽는 형태였고,
// 텍스트는 *"이 문자열이 있는가"* 까지만 본다.
//
// 그래서 판정을 `decide/overlay-diag.ts` 로 떼고 **진짜로 돌린다.** 규율이 이미 적어 둔
// 처방이다 — *"테스트 통과는 검출력의 증거가 아니다. 결함을 고쳤으면 뮤테이션으로
// 확인한다. 안 깨지면 게이트가 아니라 장식이다."*
//
// ── 두 축을 함께 둔다 ──────────────────────────────────────────────────────
// 순수 테스트만 두면 **경계를 건너는 지점이 사각으로 남는다**(이 저장소가 이름 붙인
// *"계산된 값이 실제로 소비되는가"*). 그래서 아래 describe 둘이다:
//   ① 판정이 옳은가 — 함수를 실제로 돌린다
//   ② 집행이 그것을 부르는가 — 배선을 소스에서 본다

import { describe, it, expect } from 'vitest';
import {
  newDiag, recordFailure, beginAttach, isComplete, FAILED_KEEP,
  type OverlayDiag,
} from '../frontend/js/world2/decide/overlay-diag.js';

describe('진단 판정 — 실제로 돌린다', () => {
  it('초기 상태가 loading 이다 — idle 은 밖에서 관측될 수 없어 없앴다', () => {
    const d = newDiag(false);
    expect(d.state).toBe('loading');
    expect(d).toMatchObject({ want: 0, placed: 0, failed: [], failedTotal: 0, edit: false });
    // 타입에서 뺐다는 것을 값으로도 못 박는다 — 문자열 유니온은 런타임에 안 남는다.
    expect(Object.keys(d)).not.toContain('idle');
  });

  it("★ `failed` 는 상한을 넘지 않는다 — 무제한 push 면 화면에 안 보이는 누수다", () => {
    const d = newDiag(true);
    for (let i = 0; i < 500; i++) recordFailure(d, `a${i}.glb: boom`);
    expect(d.failed.length, '★ 상한이 없다 — 편집 세션에서 이 배열만 계속 자란다')
      .toBe(FAILED_KEEP);
    // **앞에서** 자른다 — 처음 실패가 원인에 가장 가깝다.
    expect(d.failed[0]).toBe('a0.glb: boom');
    expect(d.failed.at(-1)).toBe(`a${FAILED_KEEP - 1}.glb: boom`);
  });

  it('★ 자르되 몇 번이었는지는 센다 — 4번과 400번이 같은 값이면 진단을 잃는다', () => {
    const d = newDiag(true);
    for (let i = 0; i < 400; i++) recordFailure(d, 'x.glb: boom');
    expect(d.failedTotal, '★ 총계가 없으면 규모를 알 수 없다').toBe(400);
    expect(d.failed.length).toBe(FAILED_KEEP);
  });

  it('상한 아래에서는 전부 담는다 — 흔한 경우가 잘리면 안 된다', () => {
    const d = newDiag(false);
    recordFailure(d, 'one');
    recordFailure(d, 'two');
    expect(d.failed).toEqual(['one', 'two']);
    expect(d.failedTotal).toBe(2);
  });

  it('상한은 주입할 수 있다 — 값이 계약에 박혀 있지 않다', () => {
    const d = newDiag(false);
    for (let i = 0; i < 10; i++) recordFailure(d, `${i}`, 2);
    expect(d.failed.length).toBe(2);
    expect(d.failedTotal).toBe(10);
  });

  describe('완주 판정 — `want` 가 있어야 성립한다', () => {
    /** `beginAttach` 를 거친 정상 상태 */
    function afterAttach(want: number, placed: number, state: OverlayDiag['state']): OverlayDiag {
      const d = newDiag(false);
      beginAttach(d, want);
      d.placed = placed;
      d.state = state;
      return d;
    }

    it('★ 다 놓았을 때만 완주다', () => {
      expect(isComplete(afterAttach(10, 10, 'ready'))).toBe(true);
      expect(isComplete(afterAttach(10, 4, 'ready')), '★ 절반만 놓였는데 완주로 셌다').toBe(false);
    });

    it('★ `beginAttach` 를 안 거치면 「절반만」이 완주로 통과한다 — D1 이 잡던 것', () => {
      // `want` 대입을 지우면 분모가 0으로 남는다. 그러면 **무엇을 놓았든 완주**가 된다.
      const broken = newDiag(false);
      broken.placed = 4;          // 10개 중 4개만 섰다고 하자
      broken.state = 'ready';
      expect(isComplete(broken), '★ 분모가 0이면 「세운 척」이 초록불이 된다').toBe(true);
      // 같은 상태라도 `want` 가 적혀 있으면 잡힌다.
      expect(isComplete(afterAttach(10, 4, 'ready'))).toBe(false);
    });

    it('배치 0개도 완주다 — 지금 라이브가 그 상태다', () => {
      expect(isComplete(afterAttach(0, 0, 'ready'))).toBe(true);
    });

    it('더 놓은 것은 정상이다 — 편집으로 추가하면 placed > want 가 된다', () => {
      expect(isComplete(afterAttach(2, 5, 'ready'))).toBe(true);
    });

    it('ready 가 아니면 완주가 아니다', () => {
      expect(isComplete(afterAttach(3, 3, 'loading'))).toBe(false);
      expect(isComplete(afterAttach(3, 3, 'failed'))).toBe(false);
    });
  });
});

describe('집행 배선 — 계산된 값이 실제로 소비되는가', () => {
  // ⚠ 순수 테스트만으로는 **`features/overlay.ts` 가 이 함수들을 부르는지** 알 수 없다.
  // 부르지 않으면 위 판정은 전부 초록인 채 라이브만 옛 동작으로 돌아간다.
  const src = (() => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { fileURLToPath } = require('node:url') as typeof import('node:url');
    return readFileSync(
      fileURLToPath(new URL('../frontend/js/world2/features/overlay.ts', import.meta.url)),
      'utf8',
    );
  })();

  it('★ 진단을 손으로 만들지 않는다 — 인라인 리터럴로 되돌아가면 상한이 사라진다', () => {
    expect(src, '★ `newDiag` 를 안 쓴다').toContain('newDiag(');
    expect(src, '★ 진단 객체 리터럴이 되살아났다 — 상한·총계가 그 자리에서 빠진다')
      .not.toMatch(/state:\s*'loading'\s*,\s*want:/);
  });

  it('★ 실패 기록이 `recordFailure` 를 지난다 — 직접 push 하면 상한이 안 걸린다', () => {
    expect(src, '★ `recordFailure` 를 안 쓴다').toContain('recordFailure(diag,');
    expect(src, '★ `diag.failed.push` 가 되살아났다 — 무제한 성장 경로다')
      .not.toMatch(/diag\.failed\.push\(/);
  });

  it('★ `want` 를 붙이기 **전에** 적는다 — 뒤면 거짓 통과 창이 열린다', () => {
    const begin = src.indexOf('beginAttach(diag,');
    const attach = src.indexOf('attachAll({');
    expect(begin, '★ `beginAttach` 호출이 없다 — 완주 판정의 분모가 안 채워진다')
      .toBeGreaterThan(-1);
    expect(attach, 'attachAll 호출을 못 찾았다').toBeGreaterThan(-1);
    expect(begin, '★ `want` 를 붙인 뒤에 적으면 그 사이 관측이 `placed >= want` 를 거짓 통과시킨다')
      .toBeLessThan(attach);
  });
});
