// world2 부팅 판정 테스트.
//
// 진행바가 지켜야 할 성질을 회귀로 못 박는다. 이 성질들은 미관이 아니라 신뢰의 문제다 —
// 100%를 보여준 뒤 화면이 안 뜨거나 바가 뒤로 가면, 사용자는 그 다음부터 진행바를 믿지 않는다.

import { describe, it, expect } from 'vitest';
import {
  BOOT_STAGES, bootProgress, monotonic, nextStage, stageLabel, stageSpec,
  isSlowBoot, estimateRemainMs, SLOW_BOOT_MS, type BootStage,
} from '../web/js/world2/decide/boot.js';

describe('BOOT_STAGES — 단계 정의', () => {
  it('ready가 마지막이고 폭이 0이다', () => {
    const last = BOOT_STAGES[BOOT_STAGES.length - 1];
    expect(last.id).toBe('ready');
    expect(last.weight).toBe(0);
  });

  it('무거운 단계가 실제로 무겁다 — 균등 분할이면 바가 튄다', () => {
    const w = (id: BootStage) => stageSpec(id).weight;
    expect(w('stream')).toBeGreaterThan(w('renderer') + w('pools'));
    expect(w('warmup')).toBeGreaterThan(w('pools'));
  });

  it('모든 단계에 한국어 문구가 있다', () => {
    for (const s of BOOT_STAGES) expect(s.label.length).toBeGreaterThan(0);
  });

  it('없는 단계를 물으면 던진다 — 조용히 0으로 떨어지지 않는다', () => {
    expect(() => stageSpec('nope' as BootStage)).toThrow();
  });

  it('nextStage가 순서대로 끝까지 간 뒤 null', () => {
    const seen: BootStage[] = ['renderer'];
    let cur: BootStage | null = 'renderer';
    while ((cur = nextStage(cur!)) !== null) seen.push(cur);
    expect(seen).toEqual(['renderer', 'pools', 'warmup', 'stream', 'ready']);
  });
});

describe('bootProgress — 100%는 거짓말하지 않는다', () => {
  it('ready에서만 1.0이 나온다', () => {
    expect(bootProgress('ready')).toBe(1);
    expect(bootProgress('stream', 1)).toBeLessThan(1);
    expect(bootProgress('stream', 1)).toBeCloseTo(0.99);
  });

  it('첫 단계 시작은 0', () => {
    expect(bootProgress('renderer', 0)).toBe(0);
  });

  it('단계가 진행될수록 커진다', () => {
    const seq = BOOT_STAGES.map((s) => bootProgress(s.id, 0));
    for (let i = 1; i < seq.length; i++) expect(seq[i]).toBeGreaterThan(seq[i - 1]);
  });

  it('sub가 범위를 벗어나도 안전하다 — wanted가 줄면 실제로 1을 넘는다', () => {
    expect(bootProgress('stream', 1.8)).toBeCloseTo(0.99);
    expect(bootProgress('stream', -3)).toBe(bootProgress('stream', 0));
    expect(bootProgress('stream', NaN)).toBe(bootProgress('stream', 0));
  });

  it('같은 단계 안에서 sub에 비례한다', () => {
    const a = bootProgress('warmup', 0);
    const b = bootProgress('warmup', 0.5);
    const c = bootProgress('warmup', 1);
    expect(b - a).toBeCloseTo(c - b, 5);
  });

  it('알 수 없는 단계는 0', () => {
    expect(bootProgress('nope' as BootStage, 0.5)).toBe(0);
  });
});

describe('monotonic — 바가 뒤로 가지 않는다', () => {
  it('내려가는 값을 무시한다', () => {
    expect(monotonic(0.7, 0.4)).toBe(0.7);
  });

  it('올라가는 값은 받는다', () => {
    expect(monotonic(0.4, 0.7)).toBe(0.7);
  });

  it('1을 넘지 않는다', () => {
    expect(monotonic(0.9, 5)).toBe(1);
  });

  it('플레이어 이동으로 wanted가 늘어도 바는 유지된다(이 함수의 존재 이유)', () => {
    // stream sub = loaded/wanted. 이동하면 분모가 늘어 비율이 내려간다.
    let shown = 0;
    for (const sub of [0.2, 0.6, 0.35, 0.8, 0.5, 1]) {
      shown = monotonic(shown, bootProgress('stream', sub));
    }
    expect(shown).toBeCloseTo(0.99);
  });
});

describe('isSlowBoot — 알리되 막지 않는다', () => {
  it('빠르면 조용하다', () => {
    expect(isSlowBoot(2_000, 0.5)).toBe(false);
  });

  it('오래 걸리고 진척도 없으면 알린다', () => {
    expect(isSlowBoot(SLOW_BOOT_MS + 1, 0.3)).toBe(true);
  });

  it('오래 걸려도 거의 끝났으면 알리지 않는다 — 곧 뜰 걸 겁줄 이유가 없다', () => {
    expect(isSlowBoot(SLOW_BOOT_MS + 5_000, 0.95)).toBe(false);
  });
});

describe('estimateRemainMs — 못 믿을 추정은 내지 않는다', () => {
  it('초반에는 null — 표본이 적어 엉뚱한 값이 나온다', () => {
    expect(estimateRemainMs(300, 0.01)).toBeNull();
  });

  it('경과 0에서는 null', () => {
    expect(estimateRemainMs(0, 0.5)).toBeNull();
  });

  it('절반이면 경과만큼 남았다고 본다', () => {
    expect(estimateRemainMs(4_000, 0.5)).toBe(4_000);
  });

  it('끝나면 0', () => {
    expect(estimateRemainMs(4_000, 1)).toBe(0);
  });
});
