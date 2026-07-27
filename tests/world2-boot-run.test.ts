// world2 부팅 파이프라인 집행 테스트.
//
// 여기서 지키는 계약은 하나로 요약된다: **로딩 화면이 실제로 움직여야 한다.**
// 부팅을 한 덩어리로 돌리면 브라우저가 그 사이 그리지 못해 진행바가 0%에서 얼었다가
// 갑자기 사라진다 — 진행바가 없는 것보다 나쁘다(사용자는 멈춘 걸로 읽는다).

import { describe, it, expect } from 'vitest';
import { runBoot, waitUntil, type BootReport } from '../web/js/world2/boot.js';
import type { BootStage } from '../web/js/world2/decide/boot.js';

/** 양보 횟수를 세는 가짜 — 실제로는 rAF + 매크로태스크 */
function harness() {
  let yields = 0;
  const reports: BootReport[] = [];
  let clock = 0;
  return {
    yieldFrame: async () => { yields++; clock += 16; },
    onProgress: (r: BootReport) => { reports.push(r); },
    now: () => clock,
    tick: (ms: number) => { clock += ms; },
    get yields() { return yields; },
    reports,
    stages: () => reports.map((r) => r.stage),
    progresses: () => reports.map((r) => r.progress),
  };
}

describe('runBoot — 단계 순서', () => {
  it('정해진 순서로 끝까지 간다', async () => {
    const h = harness();
    const order: BootStage[] = [];
    const mark = (s: BootStage) => () => { order.push(s); };
    const ok = await runBoot({
      steps: { renderer: mark('renderer'), pools: mark('pools'), warmup: mark('warmup'), stream: mark('stream') },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    expect(ok).toBe(true);
    expect(order).toEqual(['renderer', 'pools', 'warmup', 'stream']);
  });

  it('없는 단계는 건너뛴다 — 예열이 불필요한 백엔드가 있다', async () => {
    const h = harness();
    let ran = 0;
    const ok = await runBoot({
      steps: { stream: () => { ran++; } },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    expect(ok).toBe(true);
    expect(ran).toBe(1);
    expect(h.stages()).toContain('ready');
  });

  it('마지막 보고는 ready 100%다', async () => {
    const h = harness();
    await runBoot({ steps: {}, onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now });
    const last = h.reports[h.reports.length - 1];
    expect(last.stage).toBe('ready');
    expect(last.progress).toBe(1);
  });
});

describe('runBoot — 프레임 양보(이 파이프라인의 존재 이유)', () => {
  it('단계마다 양보한다 — 한 덩어리로 돌지 않는다', async () => {
    const h = harness();
    await runBoot({
      steps: { renderer: () => {}, pools: () => {}, warmup: () => {}, stream: () => {} },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    expect(h.yields).toBeGreaterThanOrEqual(4);
  });

  it('작업 시작 전에 라벨을 먼저 그린다 — 이전 단계 라벨을 보며 기다리지 않게', async () => {
    const h = harness();
    const seenAtStart: string[] = [];
    await runBoot({
      steps: {
        warmup: () => { seenAtStart.push(h.reports[h.reports.length - 1].label); },
      },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    // warmup 실행 시점에 이미 warmup 라벨이 보고돼 있어야 한다.
    expect(seenAtStart[0]).toBe('셰이더 예열');
  });

  it('단계 실행자에게 양보 함수를 넘긴다 — 긴 작업을 스스로 쪼갤 수 있게', async () => {
    const h = harness();
    const before = h.yields;
    await runBoot({
      steps: {
        stream: async (_report, yieldFrame) => { await yieldFrame(); await yieldFrame(); },
      },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    expect(h.yields).toBeGreaterThan(before + 2);
  });
});

describe('runBoot — 진행률', () => {
  it('단조 증가한다 — 절대 뒤로 가지 않는다', async () => {
    const h = harness();
    await runBoot({
      steps: {
        // 일부러 들쭉날쭉하게 보고한다(플레이어 이동으로 wanted가 느는 상황).
        stream: (report) => { for (const s of [0.4, 0.1, 0.7, 0.3, 0.9]) report(s); },
      },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    const ps = h.progresses();
    for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeGreaterThanOrEqual(ps[i - 1]);
  });

  it('ready 이전에는 1.0에 닿지 않는다 — 100%는 거짓말하면 안 된다', async () => {
    const h = harness();
    await runBoot({
      steps: { stream: (report) => { report(1); } },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    for (const r of h.reports) {
      if (r.stage !== 'ready') expect(r.progress).toBeLessThan(1);
    }
  });

  it('단계 내부 보고가 화면 값에 반영된다', async () => {
    const h = harness();
    await runBoot({
      steps: { stream: (report) => { report(0.5); } },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    const mid = h.reports.filter((r) => r.stage === 'stream').map((r) => r.progress);
    expect(new Set(mid).size).toBeGreaterThan(1);
  });

  it('느린 부팅을 알린다 — 다만 막지는 않는다', async () => {
    const h = harness();
    const ok = await runBoot({
      steps: { warmup: () => { h.tick(20_000); } },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    expect(ok).toBe(true); // 느려도 부팅은 완료된다
    expect(h.reports.some((r) => r.slow)).toBe(true);
  });
});

describe('runBoot — 실패를 삼키지 않는다', () => {
  it('단계가 던지면 멈추고 false를 돌려준다', async () => {
    const h = harness();
    const after: string[] = [];
    const ok = await runBoot({
      steps: {
        pools: () => { throw new Error('풀 생성 실패'); },
        warmup: () => { after.push('warmup'); },
      },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    expect(ok).toBe(false);
    expect(after).toHaveLength(0); // 반쯤 만들어진 월드로 계속 가지 않는다
  });

  it('실패한 단계와 원인을 보고한다', async () => {
    const h = harness();
    let got: { stage: BootStage; msg: string } | null = null;
    const boom = new Error('WebGPU 어댑터 없음');
    await runBoot({
      steps: { renderer: () => { throw boom; } },
      onError: (stage, err) => { got = { stage, msg: (err as Error).message }; },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    expect(got).toEqual({ stage: 'renderer', msg: 'WebGPU 어댑터 없음' });
  });

  it('비동기 거부도 잡는다', async () => {
    const h = harness();
    const ok = await runBoot({
      steps: { stream: async () => { throw new Error('네트워크'); } },
      onProgress: h.onProgress, yieldFrame: h.yieldFrame, now: h.now,
    });
    expect(ok).toBe(false);
  });
});

describe('waitUntil — 커널이 돌아야 진행되는 단계', () => {
  const yieldFrame = async () => {};

  it('조건이 참이 되면 끝난다', async () => {
    let n = 0;
    const subs: number[] = [];
    const ok = await waitUntil(
      () => ++n > 3, () => n / 4, (s) => subs.push(s), yieldFrame,
    );
    expect(ok).toBe(true);
    expect(subs[subs.length - 1]).toBe(1);
  });

  it('타임아웃이 있다 — 파셀 하나 때문에 미술관 전체를 막지 않는다', async () => {
    let clock = 0;
    const ok = await waitUntil(
      () => false, () => 0.5, () => { clock += 100; }, yieldFrame,
      1_000, () => clock,
    );
    expect(ok).toBe(false);
  });

  it('이미 끝나 있으면 즉시 반환한다', async () => {
    let polls = 0;
    const ok = await waitUntil(
      () => true, () => { polls++; return 1; }, () => {}, yieldFrame,
    );
    expect(ok).toBe(true);
    expect(polls).toBe(0);
  });

  it('기다리는 동안 프레임을 양보한다 — 블로킹 루프면 커널이 못 돌아 교착한다', async () => {
    let n = 0, yields = 0;
    await waitUntil(
      () => ++n > 3, () => n / 4, () => {},
      async () => { yields++; },
    );
    expect(yields).toBeGreaterThanOrEqual(3);
  });
});
