// world2 스트리밍 판정 테이블 테스트.
//
// 현행 `updateStreaming`(101줄·if 25개)에서 실기기까지 나갔던 계열의 버그를 회귀로 못 박는다.
// ① 떠난 파셀의 job이 큐에 남아 뒤늦게 로드됨 ② 반경 상수와 임계가 따로 놀아 원거리 파셀이
// 영영 안 올라옴 ③ 비싼 작업 하나가 큐 앞을 막아 스트리밍이 통째로 멈춤(기아).

import { describe, it, expect } from 'vitest';
import {
  parcelKey, parseKey, computeWant, diffParcels, takeBudget, streamBudgetMs,
  type WantEntry, type ParcelKey,
} from '../web/js/world2/decide/stream.js';
import { DEFAULT_BANDS, type Tier } from '../web/js/world2/decide/lod.js';

const have = (o: Record<string, Tier> = {}) => new Map<ParcelKey, Tier>(Object.entries(o));
const want = (o: Partial<Parameters<typeof computeWant>[0]> = {}) => computeWant({
  cx: 0, cz: 0, dirX: 0, dirZ: 0, have: have(), ...o,
});
const tierOf = (ws: WantEntry[], k: string) => ws.find((w) => w.key === k)?.tier;

describe('parcelKey / parseKey', () => {
  it('왕복한다', () => {
    for (const [px, pz] of [[0, 0], [3, -7], [-12, 40]]) {
      expect(parseKey(parcelKey(px, pz))).toEqual({ px, pz });
    }
  });

  it('형식이 아니면 null — 조용히 0,0으로 떨어뜨리지 않는다', () => {
    // 0,0은 실제 파셀이므로 파싱 실패를 0,0으로 만들면 원점이 오염된다.
    for (const bad of ['', 'x', '1', ',5', '1,', '1.5,2', 'a,b']) {
      expect(parseKey(bad)).toBeNull();
    }
  });
});

describe('computeWant — 정지 시 현행 로드량을 재현한다', () => {
  // 이 수치가 회귀 기준선이다. 밴드를 건드리면 여기가 먼저 깨져야 한다.
  const ws = want();

  it('near 5 · mid 4 · far 4 = 13파셀', () => {
    const byTier = { near: 0, mid: 0, far: 0 };
    for (const w of ws) byTier[w.tier]++;
    expect(byTier).toEqual({ near: 5, mid: 4, far: 4 });
  });

  it('중심과 상하좌우가 near, 대각이 mid — 현행 full5+shell4와 같다', () => {
    expect(tierOf(ws, '0,0')).toBe('near');
    expect(tierOf(ws, '1,0')).toBe('near');
    expect(tierOf(ws, '0,-1')).toBe('near');
    expect(tierOf(ws, '1,1')).toBe('mid');
    expect(tierOf(ws, '-1,1')).toBe('mid');
  });

  it('none은 목록에 담기지 않는다(= 언로드 대상)', () => {
    expect(tierOf(ws, '2,1')).toBeUndefined(); // dist 2.236 > farEnter 2.10
    expect(ws.every((w) => (w.tier as string) !== 'none')).toBe(true);
  });

  it('순회 범위를 farExit에서 유도한다 — 반경 상수 고정이 만든 버그 ②의 회귀', () => {
    // 밴드를 넓히면 그만큼 더 멀리까지 후보에 들어와야 한다. 상수로 박혀 있으면 여기서 잘린다.
    const wide = want({ bands: { ...DEFAULT_BANDS, farEnter: 4.0, farExit: 4.5 } });
    expect(wide.some((w) => w.dist > 3.5)).toBe(true);
  });

  it('prio 오름차순 + 동점은 키 순 — 프레임마다 순서가 흔들리지 않는다', () => {
    for (let i = 1; i < ws.length; i++) {
      const a = ws[i - 1], b = ws[i];
      expect(a.prio <= b.prio).toBe(true);
      if (a.prio === b.prio) expect(a.key < b.key).toBe(true);
    }
  });

  it('중심 파셀이 언제나 첫 번째다', () => {
    expect(ws[0].key).toBe('0,0');
  });
});

describe('computeWant — 방향과 히스테리시스', () => {
  it('이동 방향의 파셀이 반대쪽 같은 거리보다 먼저 온다', () => {
    const ws = want({ dirX: 1, dirZ: 0 });
    const ahead = ws.find((w) => w.key === '2,0')!;
    const behind = ws.find((w) => w.key === '-2,0')!;
    expect(ahead.dist).toBeCloseTo(behind.dist);
    expect(ahead.prio).toBeLessThan(behind.prio);
  });

  it('정지 중이면 방향 보너스가 0 — 사방이 대칭이다', () => {
    const ws = want();
    const p = (k: string) => ws.find((w) => w.key === k)!.prio;
    expect(p('2,0')).toBeCloseTo(p('-2,0'));
    expect(p('0,2')).toBeCloseTo(p('2,0'));
  });

  it('have의 현재 tier를 히스테리시스에 반영한다 — 경계에서 깜빡이지 않는다', () => {
    // (1,0)을 nearEnter(1.15)와 nearExit(1.30) 사이인 dist 1.2에 둔다. 이 여유대역에서는
    // **현재 tier가 무엇이냐**에 따라 답이 갈려야 한다 — 그게 히스테리시스다.
    const band = { cx: -0.2, cz: 0 };
    expect(tierOf(want({ ...band, have: have({ '1,0': 'near' }) }), '1,0')).toBe('near'); // 유지
    expect(tierOf(want({ ...band, have: have() }), '1,0')).toBe('mid');                   // 첫 판정
  });

  it('mid 여유대역에서도 같다 — 규칙이 tier마다 따로 놀지 않는다', () => {
    // midEnter(1.55) < dist 1.6 <= midExit(1.75)
    const band = { cx: -0.6, cz: 0 };
    expect(tierOf(want({ ...band, have: have({ '1,0': 'mid' }) }), '1,0')).toBe('mid');
    expect(tierOf(want({ ...band, have: have() }), '1,0')).toBe('far');
  });
});

describe('computeWant — 월드 경계', () => {
  it('limits 밖은 후보에서 제외한다', () => {
    const ws = want({ limits: { minPx: 0, maxPx: 10, minPz: 0, maxPz: 10 } });
    expect(ws.every((w) => w.px >= 0 && w.pz >= 0)).toBe(true);
    expect(tierOf(ws, '0,0')).toBe('near');
    expect(tierOf(ws, '-1,0')).toBeUndefined();
  });
});

describe('diffParcels — 큐 청소가 필요 없어진다(버그 ①의 회귀)', () => {
  it('없는 것은 load · 사라진 것은 unload · 달라진 것은 retier', () => {
    const ws = want();
    const d = diffParcels(ws, have({ '0,0': 'near', '1,0': 'mid', '9,9': 'near' }));
    expect(d.load.some((w) => w.key === '1,1')).toBe(true);
    expect(d.load.some((w) => w.key === '0,0')).toBe(false); // 이미 있고 tier도 같다
    expect(d.unload).toEqual(['9,9']);
    expect(d.retier).toEqual([{ key: '1,0', from: 'mid', to: 'near', prio: expect.any(Number) }]);
  });

  it('want에서 사라진 파셀은 다음 프레임 결과에 다시 나타나지 않는다', () => {
    // 큐를 보관하지 않으므로 "떠난 파셀이 뒤늦게 로드"될 상태 자체가 없다.
    const far = diffParcels(want({ cx: 50, cz: 50 }), have({ '0,0': 'near' }));
    expect(far.unload).toEqual(['0,0']);
    expect(far.load.some((w) => w.key === '0,0')).toBe(false);
  });

  it('아무것도 안 변했으면 세 목록 모두 빈다', () => {
    const ws = want();
    const cur = new Map<ParcelKey, Tier>(ws.map((w) => [w.key, w.tier as Tier]));
    const d = diffParcels(ws, cur);
    expect(d.load).toHaveLength(0);
    expect(d.unload).toHaveLength(0);
    expect(d.retier).toHaveLength(0);
  });

  it('강등도 retier로 잡는다 — 승격만 보던 현행과 다르다', () => {
    const d = diffParcels(want(), have({ '1,1': 'near' })); // 실제로는 mid여야 하는 자리
    expect(d.retier).toContainEqual({ key: '1,1', from: 'near', to: 'mid', prio: expect.any(Number) });
  });
});

describe('takeBudget — 기아 방지가 규약(버그 ③의 회귀)', () => {
  const cost = (n: number) => n;

  it('예산보다 비싼 작업 하나여도 반드시 통과시킨다', () => {
    const { run, defer } = takeBudget([100], 1, cost);
    expect(run).toEqual([100]);
    expect(defer).toHaveLength(0);
  });

  it('예산이 0이어도 첫 건은 통과한다 — 영원히 멈추지 않는다', () => {
    expect(takeBudget([5, 5], 0, cost).run).toEqual([5]);
  });

  it('예산을 넘는 뒤쪽은 미룬다', () => {
    const { run, defer } = takeBudget([2, 2, 2, 2], 5, cost);
    expect(run).toEqual([2, 2]);
    expect(defer).toEqual([2, 2]);
  });

  it('비싼 작업을 건너뛰고 싼 작업을 앞당기지 않는다 — 우선순위가 뒤집히면 안 된다', () => {
    // prio 순서가 곧 로드 순서다. 여기서 순서를 바꾸면 시야 정면이 뒤로 밀린다.
    const { run, defer } = takeBudget([1, 100, 1], 2, cost);
    expect(run).toEqual([1]);
    expect(defer).toEqual([100, 1]);
  });

  it('빈 입력은 빈 결과', () => {
    expect(takeBudget([], 10, cost)).toEqual({ run: [], defer: [] });
  });
});

describe('streamBudgetMs — 남는 시간을 다 쓰지 않는다', () => {
  it('여유의 절반만 쓴다 — 프레임 균일성이 목적이지 처리량이 아니다', () => {
    expect(streamBudgetMs(10, 16.7)).toBeCloseTo(3.35, 1);
  });

  it('상한이 있다 — 한 프레임에 몰아 처리하면 그 프레임이 통째로 튄다', () => {
    expect(streamBudgetMs(1, 100, 6)).toBe(6);
  });

  it('이미 늦었어도 0이 아니다 — 0이면 영영 못 따라잡는다', () => {
    expect(streamBudgetMs(50, 16.7)).toBe(0.5);
    expect(streamBudgetMs(16.7, 16.7)).toBe(0.5);
  });
});
