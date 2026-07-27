// world2 순수 판정 계층 테이블 테스트.
//
// 이 파일의 목적은 커버리지가 아니라 **과거에 실기기까지 나간 버그를 회귀로 못 박는 것**이다.
// 현행 오픈월드는 판정과 집행이 같은 줄에 있어(`if(cond){ 렌더러 부수효과; 상태 쓰기; emit }`)
// 이런 테스트를 걸 지점이 없었고, 그래서 아래 케이스들이 전부 감독 기기에서 발견됐다.

import { describe, it, expect } from 'vitest';
import {
  resolutionBands, validResolutionBands, ABS_FLOOR,
  decideResolution, decideFrameCap, decideTierPressure,
  initialController, WARMUP_MS, DEMOTE_FPS, PROMOTE_FPS, PROMOTE_HOLD_TICKS,
  CAP_ENTER_FPS, CAP_SUSTAIN_MS, TRI_BUDGET,
  type AdaptInput,
} from '../frontend/js/world2/decide/adapt.js';
import {
  tierFor, validBands, DEFAULT_BANDS, lookAheadCenter, loadPriority,
  tierReach, maxLatticePoints,
  type Tier,
} from '../frontend/js/world2/decide/lod.js';

const MOBILE_CAP = 1.5;
const input = (o: Partial<AdaptInput> = {}): AdaptInput => ({
  fps: 60, ageMs: WARMUP_MS + 1000, dtMs: 500, streaming: false, hidden: false, ...o,
});

describe('resolutionBands — 과거 no-op 버그 2건의 회귀', () => {
  // 버그 ①: dpr=1 일반 모니터에서 CEIL==FLOOR==1이 되어 긴급강등이 1→1 "강등"이었다.
  // "저사양 데스크톱이 모바일보다 더 버벅이는 직접 원인"으로 기록된 것.
  it('dpr=1에서도 강등 레버가 존재한다', () => {
    const b = resolutionBands(1, MOBILE_CAP);
    expect(b.ceil).toBe(1);
    expect(b.floor).toBeLessThan(b.ceil);
    expect(validResolutionBands(b)).toBe(true);
  });

  // 버그 ②: 고dpr(>2.667)에서 FLOOR > CEIL이 되어 적응계 전체가 no-op였다.
  it.each([1, 1.5, 2, 2.5, 3, 4])('dpr=%s에서 floor < ceil 이 항상 성립한다', (dpr) => {
    const b = resolutionBands(dpr, MOBILE_CAP);
    expect(b.floor).toBeLessThan(b.ceil);
    expect(validResolutionBands(b)).toBe(true);
  });

  it('절대 하한을 넘지 않는다 — dpr에 비례만 하면 저dpr에서 레버가 사라진다', () => {
    for (const dpr of [1, 2, 3]) {
      expect(resolutionBands(dpr, MOBILE_CAP).floor).toBeLessThanOrEqual(ABS_FLOOR);
    }
  });

  it('모바일 캡이 상한을 지배한다', () => {
    expect(resolutionBands(3, MOBILE_CAP).ceil).toBe(MOBILE_CAP);
  });

  it('비정상 dpr(0·NaN)에도 유효한 밴드를 낸다', () => {
    for (const bad of [0, NaN, -1]) {
      expect(validResolutionBands(resolutionBands(bad, MOBILE_CAP))).toBe(true);
    }
  });
});

describe('decideResolution — 판정만 하고 집행하지 않는다', () => {
  const bands = resolutionBands(1, MOBILE_CAP);

  it('저 fps면 하한으로 강등한다', () => {
    const r = decideResolution(initialController(), input({ fps: DEMOTE_FPS - 1 }), bands.ceil, bands);
    expect(r.decision).toEqual({ ratio: bands.floor, reason: 'demote' });
  });

  it('워밍업 중에는 판정하지 않는다 — 부팅 직후 fps는 로딩 잔열이다', () => {
    const r = decideResolution(initialController(), input({ fps: 5, ageMs: WARMUP_MS - 1 }), bands.ceil, bands);
    expect(r.decision).toBeNull();
  });

  // 과거 창 blur 3초만으로 세션 영구 30fps 고착이 났다(비가시 스로틀의 ~4fps를 실 저하로 집계).
  it('문서가 숨겨진 동안은 판정하지 않는다', () => {
    const r = decideResolution(initialController(), input({ fps: 4, hidden: true }), bands.ceil, bands);
    expect(r.decision).toBeNull();
  });

  it('스트리밍 중에는 판정하지 않는다 — 로딩 스파이크는 실 성능 저하가 아니다', () => {
    const r = decideResolution(initialController(), input({ fps: 5, streaming: true }), bands.ceil, bands);
    expect(r.decision).toBeNull();
  });

  it('쿨다운 중에는 재판정하지 않는다', () => {
    const a = decideResolution(initialController(), input({ fps: 10 }), bands.ceil, bands);
    expect(a.decision).not.toBeNull();
    const b = decideResolution(a.next, input({ fps: 10, dtMs: 100 }), bands.floor, bands);
    expect(b.decision).toBeNull();
  });

  it('이미 하한이면 더 내리지 않는다', () => {
    const r = decideResolution(initialController(), input({ fps: 10 }), bands.floor, bands);
    expect(r.decision).toBeNull();
  });

  it('승급은 지속 조건을 채워야 일어난다 — 한 번 좋아졌다고 올리면 진동한다', () => {
    let st = initialController();
    for (let i = 0; i < PROMOTE_HOLD_TICKS - 1; i++) {
      const r = decideResolution(st, input({ fps: PROMOTE_FPS + 10 }), bands.floor, bands);
      expect(r.decision).toBeNull();
      st = r.next;
    }
    const last = decideResolution(st, input({ fps: PROMOTE_FPS + 10 }), bands.floor, bands);
    expect(last.decision).toEqual({ ratio: bands.ceil, reason: 'promote' });
  });

  it('중간 fps에서는 승급 누적이 초기화된다', () => {
    let st = initialController();
    st = decideResolution(st, input({ fps: PROMOTE_FPS + 10 }), bands.floor, bands).next;
    expect(st.upTicks).toBe(1);
    st = decideResolution(st, input({ fps: 35 }), bands.floor, bands).next;
    expect(st.upTicks).toBe(0);
  });

  it('레버가 없는 밴드(floor==ceil)면 조용히 포기한다', () => {
    const degenerate = { ceil: 1, floor: 1 };
    const r = decideResolution(initialController(), input({ fps: 5 }), 1, degenerate);
    expect(r.decision).toBeNull();
  });
});

describe('decideFrameCap — 발열 캡은 지속 조건 + 비가역', () => {
  it('순간 저 fps로는 진입하지 않는다', () => {
    const r = decideFrameCap(initialController(), input({ fps: CAP_ENTER_FPS - 1, dtMs: 500 }), false);
    expect(r.decision).toBeNull();
  });

  it('지속 미달이면 캡에 진입한다', () => {
    let st = initialController();
    let decided = null;
    for (let t = 0; t <= CAP_SUSTAIN_MS; t += 500) {
      const r = decideFrameCap(st, input({ fps: CAP_ENTER_FPS - 1, dtMs: 500 }), false);
      st = r.next;
      if (r.decision) { decided = r.decision; break; }
    }
    expect(decided).toEqual({ capFps: 30 });
  });

  it('이미 캡이면 재판정하지 않는다(비가역)', () => {
    const r = decideFrameCap({ cooldownMs: 0, downTicks: CAP_SUSTAIN_MS, upTicks: 0 }, input({ fps: 5 }), true);
    expect(r.decision).toBeNull();
  });

  // 끊긴 관측을 이어 붙이면 오발화한다 — blur로 인한 4fps가 누적에 섞이면 안 된다.
  it('숨겨진 동안의 관측은 누적을 초기화한다', () => {
    let st = decideFrameCap(initialController(), input({ fps: 10, dtMs: 2000 }), false).next;
    expect(st.downTicks).toBeGreaterThan(0);
    st = decideFrameCap(st, input({ fps: 4, hidden: true, dtMs: 2000 }), false).next;
    expect(st.downTicks).toBe(0);
  });

  it('회복하면 누적이 풀린다', () => {
    let st = decideFrameCap(initialController(), input({ fps: 10, dtMs: 1000 }), false).next;
    expect(st.downTicks).toBe(1000);
    st = decideFrameCap(st, input({ fps: 60, dtMs: 500 }), false).next;
    expect(st.downTicks).toBe(0);
  });
});

describe('decideTierPressure — fps와 tri가 동시에 나빠야 한다', () => {
  it('저 fps여도 tri가 예산 안이면 압력을 걸지 않는다 (tri 지배 ≠ tri 병목)', () => {
    const r = decideTierPressure(initialController(), input({ fps: 10 }), TRI_BUDGET - 1, false);
    expect(r.decision).toBeNull();
  });

  it('tri가 넘쳐도 fps가 괜찮으면 걸지 않는다', () => {
    const r = decideTierPressure(initialController(), input({ fps: 60 }), TRI_BUDGET * 2, false);
    expect(r.decision).toBeNull();
  });

  it('둘 다 나쁠 때만 압력을 건다', () => {
    const r = decideTierPressure(initialController(), input({ fps: 10 }), TRI_BUDGET * 2, false);
    expect(r.decision).toEqual({ scale: 0.8 });
  });

  it('이미 적용됐으면 중복 적용하지 않는다', () => {
    const r = decideTierPressure(initialController(), input({ fps: 10 }), TRI_BUDGET * 2, true);
    expect(r.decision).toBeNull();
  });
});

describe('제어기 독립성 — 이 세션 버그 ②의 회귀', () => {
  // 현행은 5개 제어기가 `adaptCooldown` 하나를 공유해, 그림자 블록이 쿨다운을 세우면
  // 같은 tick의 긴급 강등이 굶었다. 제어기가 독립 상태를 가지면 이게 구조적으로 불가능하다.
  it('한 제어기의 쿨다운이 다른 제어기를 굶기지 않는다', () => {
    const bands = resolutionBands(1, MOBILE_CAP);
    const res = decideResolution(initialController(), input({ fps: 10 }), bands.ceil, bands);
    expect(res.decision).not.toBeNull();
    expect(res.next.cooldownMs).toBeGreaterThan(0);

    // 해상도 제어기가 쿨다운에 들어간 상태에서, tier 압력 제어기는 자기 상태로 정상 판정한다.
    const tier = decideTierPressure(initialController(), input({ fps: 10 }), TRI_BUDGET * 2, false);
    expect(tier.decision).not.toBeNull();
  });
});

describe('tierFor — 히스테리시스로 경계 깜빡임을 막는다', () => {
  it('기본 밴드가 ENTER < EXIT 불변식을 만족한다', () => {
    expect(validBands(DEFAULT_BANDS)).toBe(true);
  });

  it('밴드가 뒤집히면 무효로 판정한다', () => {
    expect(validBands({ ...DEFAULT_BANDS, nearExit: DEFAULT_BANDS.nearEnter - 0.1 })).toBe(false);
  });

  it('첫 판정은 ENTER 기준을 쓴다', () => {
    expect(tierFor(1.0, null)).toBe('near');
    expect(tierFor(1.4, null)).toBe('mid');
    expect(tierFor(1.9, null)).toBe('far');
    expect(tierFor(9.9, null)).toBe('none');
  });

  // 핵심: ENTER와 EXIT 사이 구간에 있으면 현재 tier를 유지해야 한다.
  // 이게 없으면 경계에 선 파셀이 매 프레임 tier를 오가며 슬롯 이적을 반복한다.
  it('ENTER~EXIT 사이에서는 현재 tier를 유지한다', () => {
    const mid = (DEFAULT_BANDS.nearEnter + DEFAULT_BANDS.nearExit) / 2;
    expect(tierFor(mid, 'near')).toBe('near');
    expect(tierFor(mid, 'mid')).toBe('mid'); // 아직 nearEnter를 못 넘었으므로 승격 안 함
  });

  it('EXIT를 넘으면 한 단계만 내린다 — 급락은 그 자체로 스파이크다', () => {
    expect(tierFor(99, 'near')).toBe('mid');
    expect(tierFor(99, 'mid')).toBe('far');
    expect(tierFor(99, 'far')).toBe('none');
  });

  it('ENTER를 넘으면 즉시 승격한다(안쪽은 지연시키지 않는다)', () => {
    expect(tierFor(0.5, 'none')).toBe('near');
  });

  it('경계를 왕복해도 진동하지 않는다', () => {
    let t: Tier = 'near';
    const seen = new Set<Tier>();
    // nearExit 바로 안쪽에서 흔들리는 시나리오
    for (let i = 0; i < 20; i++) {
      t = tierFor(DEFAULT_BANDS.nearExit - 0.01 + (i % 2) * 0.005, t);
      seen.add(t);
    }
    expect([...seen]).toEqual(['near']);
  });
});

describe('lookAheadCenter / loadPriority', () => {
  it('정지 상태면 위치를 그대로 쓴다', () => {
    expect(lookAheadCenter(3, 4, 0, 0)).toEqual({ x: 3, z: 4 });
  });

  it('이동방향으로 중심을 당긴다(입력 정규화 불필요)', () => {
    const c = lookAheadCenter(0, 0, 10, 0, 0.5);
    expect(c.x).toBeCloseTo(0.5);
    expect(c.z).toBeCloseTo(0);
  });

  it('가까운 쪽이 먼저다', () => {
    expect(loadPriority(1, 0)).toBeLessThan(loadPriority(2, 0));
  });

  it('진행방향 파셀이 같은 거리에서 우선한다', () => {
    expect(loadPriority(2, 1)).toBeLessThan(loadPriority(2, 0));
  });

  it('등 뒤 파셀에는 보너스를 주지 않는다', () => {
    expect(loadPriority(2, -1)).toBe(loadPriority(2, 0));
  });
});

describe('tierReach — 예산의 기준은 ENTER가 아니라 EXIT다', () => {
  it('각 tier의 EXIT를 돌려준다', () => {
    expect(tierReach('near')).toBe(DEFAULT_BANDS.nearExit);
    expect(tierReach('mid')).toBe(DEFAULT_BANDS.midExit);
    expect(tierReach('far')).toBe(DEFAULT_BANDS.farExit);
  });

  // 히스테리시스가 있으므로 ENTER를 넘긴 파셀도 EXIT까지는 그 tier로 남는다. 예산을
  // ENTER로 잡으면 딱 그 대역에 있는 파셀만큼 슬롯이 조용히 모자란다.
  it('EXIT 대역에 있는 파셀은 실제로 그 tier를 유지한다 — 예산이 덮어야 할 구간', () => {
    for (const t of ['near', 'mid', 'far'] as const) {
      const r = tierReach(t);
      expect(tierFor(r, t)).toBe(t);
    }
  });

  it('밴드를 넘겨받으면 그걸 쓴다', () => {
    const b = { ...DEFAULT_BANDS, nearExit: 2.0 };
    expect(tierReach('near', b)).toBe(2.0);
  });
});

describe('maxLatticePoints — 슬롯 예산의 분모', () => {
  /**
   * 독립 검증. 중심을 촘촘히 훑어 세는 **다른 방법**으로 같은 답이 나오는지 본다.
   * 스캔은 최적점을 통째로 건너뛸 수 있으므로 정답의 하한만 준다 — 그래서 방향이 있는
   * 부등식(scan ≤ exact)과, 알려진 반경에서의 일치를 함께 본다. 두 방법이 다른 값을
   * 내면 둘 중 하나가 틀린 것이고, 어느 쪽이든 이 테스트가 깨진다.
   */
  const scanMax = (r: number, N = 200): number => {
    const reach = Math.ceil(r) + 1;
    let best = 0;
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const cx = (i / N) * 0.5;
        const cz = (j / N) * 0.5;
        let n = 0;
        for (let px = -reach; px <= reach; px++) {
          for (let pz = -reach; pz <= reach; pz++) {
            if (Math.hypot(px - cx, pz - cz) <= r + 1e-12) n++;
          }
        }
        if (n > best) best = n;
      }
    }
    return best;
  };

  it('스캔이 찾은 값을 밑돌지 않는다 (near·mid·far EXIT)', () => {
    for (const t of ['near', 'mid', 'far'] as const) {
      const r = tierReach(t);
      expect(maxLatticePoints(r)).toBeGreaterThanOrEqual(scanMax(r));
    }
  });

  it('현행 밴드의 실제 값 — 이 숫자가 곧 슬롯 예산이다', () => {
    expect(maxLatticePoints(DEFAULT_BANDS.nearExit)).toBe(7);
    expect(maxLatticePoints(DEFAULT_BANDS.midExit)).toBe(12);
    // 21이다. 예전 `MAX_PARCELS` 상수는 20이었다 — 이미 모자랐고, 예산에 곱해둔
    // 여유 배수 1.25가 그 부족을 덮어 `starved`를 0으로 보이게 하고 있었다.
    expect(maxLatticePoints(DEFAULT_BANDS.farExit)).toBe(21);
  });

  it('손으로 셀 수 있는 작은 반경에서 정확하다', () => {
    expect(maxLatticePoints(0)).toBe(1);          // 격자점 하나
    expect(maxLatticePoints(0.5)).toBe(2);        // 두 점 사이 정중앙
    expect(maxLatticePoints(Math.SQRT1_2)).toBe(4); // 정사각형 네 꼭짓점의 외접원
    expect(maxLatticePoints(1)).toBe(5);          // 십자
  });

  it('반경이 커지면 단조증가한다', () => {
    let prev = 0;
    for (let r = 0; r <= 3; r += 0.25) {
      const n = maxLatticePoints(r);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });

  it('음수·NaN에는 0을 돌려준다 — 예산이 NaN으로 새지 않게', () => {
    expect(maxLatticePoints(-1)).toBe(0);
    expect(maxLatticePoints(NaN)).toBe(0);
  });
});
