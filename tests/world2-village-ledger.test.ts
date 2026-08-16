// @vitest-environment node
//
// 마을 대장 — **어느 칸이 누구 땅인가.**
//
// ── 이 파일이 지키는 명제 셋 ───────────────────────────────────────────────
// ① **겹침이 조용히 지나가지 않는다** — 같은 칸이 둘이면 앞엣것이 이기고 **사유가 남는다**.
//    조용히 덮어쓰면 증상이 「내 땅이 사라졌다」로만 나타나 원인을 짚을 자리가 없다
// ② **대장이 깨져도 마을은 뜬다** — 어떤 입력에도 `ledger` 를 낸다(던지지 않는다).
//    `backend/README.md` 규약 *"서버가 죽어도 전시를 보는 것만은 되어야 한다"* 의 이 축
// ③ **`isPlotOf` 가 남의 땅을 막는다** — 작가 문서가 자기 칸 밖 파셀을 적어 보내도
//    여기서 걸린다. 막지 않으면 **남의 땅을 덮어쓴다**(S5 의 안전장치)
//
// ⚠ **소유권 검증이 아니다.** 인증이 mock 이므로 대장은 «어느 문서를 그 칸에 그리는가»
// 까지만 말한다 — 그 판단은 `village-ledger.ts` 헤더 한 곳이다.

import { describe, it, expect } from 'vitest';
import {
  LEDGER_VERSION, loadLedger, emptyLedger, ownerAt, plotsOf, owners, isPlotOf,
} from '../frontend/js/world2/decide/village-ledger.js';

/** 정상 대장 하나 */
const OK = {
  version: LEDGER_VERSION,
  plots: [
    { px: 0, pz: 0, owner: 'arthong' },
    { px: 1, pz: 0, owner: 'arthong' },
    { px: -2, pz: 3, owner: 'mara' },
  ],
};

describe('loadLedger — 정상 경로', () => {
  it('배정을 그대로 읽는다', () => {
    const r = loadLedger(OK);
    expect(r.issues).toEqual([]);
    expect(r.ledger.plots).toHaveLength(3);
    expect(r.ledger.version).toBe(LEDGER_VERSION);
  });

  it('소수 좌표는 버리지 않고 접는다 — 격자는 정수다', () => {
    const r = loadLedger({ version: 1, plots: [{ px: 2.4, pz: -1.6, owner: 'a' }] });
    expect(r.ledger.plots[0]).toEqual({ px: 2, pz: -2, owner: 'a' });
    expect(r.issues).toEqual([]);
  });

  it('주인 이름의 공백을 다듬는다', () => {
    const r = loadLedger({ version: 1, plots: [{ px: 0, pz: 0, owner: '  arthong ' }] });
    expect(r.ledger.plots[0].owner).toBe('arthong');
  });
});

describe('★ 겹침 — 앞엣것이 이기고 사유가 남는다', () => {
  const dup = {
    version: 1,
    plots: [
      { px: 5, pz: 5, owner: 'first' },
      { px: 5, pz: 5, owner: 'second' },
      { px: 5.2, pz: 4.8, owner: 'third' },   // 접으면 (5,5) — 같은 칸이다
    ],
  };

  it('★ 나중 것이 앞엣것을 덮지 않는다', () => {
    const r = loadLedger(dup);
    expect(r.ledger.plots).toHaveLength(1);
    expect(ownerAt(r.ledger, 5, 5), '★ 뒤엣것이 이겼다 — 남의 땅을 빼앗는다').toBe('first');
  });

  it('★ 사유가 남는다 — 조용히 버리면 원인을 짚을 자리가 없다', () => {
    const r = loadLedger(dup);
    expect(r.issues).toHaveLength(2);
    expect(r.issues[0]).toMatchObject({ index: 1, reason: 'duplicate', heldBy: 'first', px: 5, pz: 5 });
    expect(r.issues[1], '★ 접어서 겹치는 것도 잡아야 한다')
      .toMatchObject({ index: 2, reason: 'duplicate', heldBy: 'first' });
  });

  it('같은 주인이 여러 칸을 갖는 것은 겹침이 아니다', () => {
    const r = loadLedger(OK);
    expect(plotsOf(r.ledger, 'arthong')).toHaveLength(2);
    expect(r.issues).toEqual([]);
  });
});

describe('★ 깨진 입력 — 마을은 뜬다', () => {
  it('무엇을 넣어도 던지지 않고 빈 대장을 낸다', () => {
    for (const bad of [null, undefined, 0, '', 'x', [], true, { }]) {
      const r = loadLedger(bad);
      expect(r.ledger.plots, `${JSON.stringify(bad)} 에서 배정이 나왔다`).toEqual([]);
      expect(Array.isArray(r.issues)).toBe(true);
    }
  });

  it('★ 미래 버전은 읽지 않고 **말한다** — 조용히 삼키면 남의 땅에 내 건물이 선다', () => {
    const r = loadLedger({ version: LEDGER_VERSION + 1, plots: OK.plots });
    expect(r.ledger.plots, '★ 모르는 스키마를 지금 규칙으로 해석했다').toEqual([]);
    expect(r.unreadableVersion, '★ 경고할 자리가 없다 — 태스크 #53 과 같은 사각이다')
      .toBe(LEDGER_VERSION + 1);
  });

  it('버전이 없거나 이상하면 배정 0 — 그래도 던지지 않는다', () => {
    for (const v of [undefined, null, 0, -1, 'one', NaN, {}]) {
      const r = loadLedger({ version: v, plots: OK.plots });
      expect(r.ledger.plots).toEqual([]);
    }
  });

  it('항목별 사유를 자리와 함께 낸다 — 어느 줄이 틀렸는지 말한다', () => {
    const r = loadLedger({
      version: 1,
      plots: [
        null,
        { px: 'a', pz: 0, owner: 'x' },
        { px: 0, pz: 0, owner: '' },
        { px: 1, pz: 1, owner: 'ok' },
      ],
    });
    expect(r.issues.map((i) => [i.index, i.reason])).toEqual([
      [0, 'not-object'], [1, 'bad-coord'], [2, 'bad-owner'],
    ]);
    expect(r.ledger.plots, '멀쩡한 항목은 살아야 한다').toEqual([{ px: 1, pz: 1, owner: 'ok' }]);
  });

  it('plots 가 배열이 아니면 배정 0', () => {
    for (const p of [null, 'x', 3, {}]) {
      expect(loadLedger({ version: 1, plots: p }).ledger.plots).toEqual([]);
    }
  });
});

describe('조회', () => {
  const { ledger } = loadLedger(OK);

  it('ownerAt — 없으면 null. 「비었다」와 「모른다」를 여기서 가르지 않는다', () => {
    expect(ownerAt(ledger, 0, 0)).toBe('arthong');
    expect(ownerAt(ledger, 99, 99)).toBeNull();
  });

  it('ownerAt 이 소수를 접어서 찾는다 — 플레이어 좌표가 정수가 아니다', () => {
    expect(ownerAt(ledger, -1.7, 3.2)).toBe('mara');
  });

  it('owners — 처음 나온 순서를 지킨다 (겹침 판정과 같은 방향)', () => {
    expect(owners(ledger)).toEqual(['arthong', 'mara']);
  });

  it('★ isPlotOf 가 남의 칸을 막는다 — S5 가 파셀을 합칠 때의 관문', () => {
    expect(isPlotOf(ledger, 'arthong', 0, 0)).toBe(true);
    expect(isPlotOf(ledger, 'mara', 0, 0), '★ 남의 칸을 자기 것이라고 통과시켰다').toBe(false);
    expect(isPlotOf(ledger, 'arthong', 42, 42), '★ 배정 없는 칸을 통과시켰다').toBe(false);
  });
});

describe('emptyLedger — 팩토리인 이유', () => {
  it('★ 부른 쪽마다 다른 객체다 — 상수면 한 소비자의 push 가 남에게 보인다', () => {
    const a = emptyLedger();
    const b = emptyLedger();
    a.plots.push({ px: 0, pz: 0, owner: 'x' });
    expect(b.plots, '★ 빈 대장이 공유되고 있다').toEqual([]);
  });
});

describe('대장은 오버레이 계약과 **따로 늙는다** (팀장 조건)', () => {
  it('★ 오버레이 계약을 import 하지 않는다 — 사슬에 편입되면 판정 근거가 죽는다', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      fileURLToPath(new URL('../frontend/js/world2/decide/village-ledger.js', import.meta.url)
        .href.replace('.js', '.ts')),
      'utf8',
    );
    expect(src, '★ 대장이 오버레이 계약을 import 한다 — 별도 normalize 가 아니게 된다')
      .not.toMatch(/from\s+['"]\.\/overlay\.js['"]/);
    expect(src, '★ 자기 버전이 없다').toContain('LEDGER_VERSION');
    // 순수 파일이어야 노드가 실제로 돌린다.
    expect(src, '★ three 를 import 했다 — 순수가 아니다').not.toMatch(/from\s+['"]three/);
  });
});
