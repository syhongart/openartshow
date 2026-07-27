// world2 하늘·구름 판정 테스트.
//
// 구름은 InstancedMesh 하나로 고정 개수다. 그래서 "더 만드는" 대신 **순환**하는데,
// 그 순환이 어긋나면 오래 켜 뒀을 때 구름이 저 멀리 사라지거나 한곳에 뭉친다.
// 그건 몇 분 뒤에야 드러나는 종류라 눈으로 잡기 어렵다 — 여기서 못 박는다.

import { describe, it, expect } from 'vitest';
import {
  cloudLayout, driftedX, driftedZ, wrap, skyColorAt, mixHex, validStops,
  CLOUD_FIELD, DEFAULT_CLOUDS, type SkyStop,
} from '../web/js/world2/decide/sky.js';

describe('cloudLayout — 결정론적 배치', () => {
  it('같은 설정이면 같은 하늘 — 새로고침해도 변하지 않는다', () => {
    expect(cloudLayout()).toEqual(cloudLayout());
  });

  it('요청한 개수만큼 만든다', () => {
    expect(cloudLayout({ ...DEFAULT_CLOUDS, count: 12 })).toHaveLength(12);
  });

  it('전부 영역 안에 있다', () => {
    for (const c of cloudLayout()) {
      expect(Math.abs(c.x)).toBeLessThanOrEqual(CLOUD_FIELD / 2);
      expect(Math.abs(c.z)).toBeLessThanOrEqual(CLOUD_FIELD / 2);
    }
  });

  it('고도가 지정 범위 안이다', () => {
    for (const c of cloudLayout()) {
      expect(c.y).toBeGreaterThanOrEqual(DEFAULT_CLOUDS.minY);
      expect(c.y).toBeLessThanOrEqual(DEFAULT_CLOUDS.maxY);
    }
  });

  it('크기와 불투명도가 양수다 — 0이면 안 보이는 구름이 슬롯만 먹는다', () => {
    for (const c of cloudLayout()) {
      expect(c.w).toBeGreaterThan(0);
      expect(c.h).toBeGreaterThan(0);
      expect(c.alpha).toBeGreaterThan(0);
      expect(c.alpha).toBeLessThanOrEqual(1);
    }
  });

  it('한곳에 뭉치지 않는다 — 해시가 나쁘면 겹쳐 보인다', () => {
    const cs = cloudLayout();
    const keys = new Set(cs.map((c) => `${Math.round(c.x)},${Math.round(c.z)}`));
    expect(keys.size).toBe(cs.length);
  });

  it('높은 구름일수록 작고 옅다 — 원근이 어긋나면 하늘이 낮아 보인다', () => {
    const cs = cloudLayout({ ...DEFAULT_CLOUDS, count: 60 });
    const low = cs.filter((c) => c.y < 160);
    const high = cs.filter((c) => c.y > 220);
    const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
    expect(avg(high.map((c) => c.alpha))).toBeLessThan(avg(low.map((c) => c.alpha)));
  });
});

describe('wrap — 순환의 핵심', () => {
  it('안쪽 값은 그대로', () => {
    expect(wrap(10, 0, 100)).toBe(10);
  });

  it('오른쪽으로 넘으면 왼쪽으로 감긴다', () => {
    expect(wrap(60, 0, 100)).toBeCloseTo(-40, 6);
  });

  it('왼쪽으로 넘어도 감긴다 — 음수 나머지 보정', () => {
    expect(wrap(-60, 0, 100)).toBeCloseTo(40, 6);
  });

  it('아무리 멀어도 항상 구간 안이다 — 오래 켜 둬도 구름이 사라지지 않는다', () => {
    for (const v of [1e4, -1e4, 1e7, -1e7]) {
      const w = wrap(v, 0, 100);
      expect(Math.abs(w)).toBeLessThanOrEqual(50 + 1e-6);
    }
  });

  it('중심을 옮기면 그 주변으로 감긴다 — 어디로 걸어가든 하늘이 비지 않는다', () => {
    const w = wrap(0, 5000, 100);
    expect(Math.abs(w - 5000)).toBeLessThanOrEqual(50 + 1e-6);
  });

  it('이상한 입력에 안전하다', () => {
    expect(wrap(NaN, 7, 100)).toBe(7);
    expect(wrap(10, 7, 0)).toBe(7);
  });
});

describe('drift — 바람', () => {
  it('시간이 지나면 움직인다', () => {
    const a = driftedX(0, 0, 3, 0);
    const b = driftedX(0, 10, 3, 0);
    expect(a).not.toBeCloseTo(b, 3);
  });

  it('아주 오래 지나도 영역 안에 있다', () => {
    for (const t of [1e3, 1e5, 1e7]) {
      expect(Math.abs(driftedX(0, t, 3, 0))).toBeLessThanOrEqual(CLOUD_FIELD / 2 + 1e-6);
      expect(Math.abs(driftedZ(0, t, 1, 0))).toBeLessThanOrEqual(CLOUD_FIELD / 2 + 1e-6);
    }
  });

  it('바람이 0이면 제자리', () => {
    expect(driftedX(25, 999, 0, 0)).toBeCloseTo(25, 6);
  });
});

describe('skyColorAt — 그라디언트', () => {
  const stops: SkyStop[] = [
    { at: 0, color: 0x000000 },
    { at: 0.5, color: 0x808080 },
    { at: 1, color: 0xffffff },
  ];

  it('양 끝에서 정확한 색', () => {
    expect(skyColorAt(stops, 0)).toBe(0x000000);
    expect(skyColorAt(stops, 1)).toBe(0xffffff);
  });

  it('구간 사이를 보간한다', () => {
    expect(skyColorAt(stops, 0.25)).toBe(0x404040);
  });

  it('범위를 벗어난 입력을 클램프한다', () => {
    expect(skyColorAt(stops, -5)).toBe(0x000000);
    expect(skyColorAt(stops, 5)).toBe(0xffffff);
    expect(skyColorAt(stops, NaN)).toBe(0x000000);
  });

  it('중간 정지점에서 그 색이 나온다', () => {
    expect(skyColorAt(stops, 0.5)).toBe(0x808080);
  });
});

describe('validStops — 잘못된 색 데이터를 조용히 고치지 않는다', () => {
  it('정상 데이터를 통과시킨다', () => {
    expect(validStops([{ at: 0, color: 1 }, { at: 1, color: 2 }])).toBe(true);
  });

  it('순서가 어긋나면 거부 — 조용히 재정렬하면 의도와 다른 하늘이 나온다', () => {
    expect(validStops([{ at: 1, color: 1 }, { at: 0, color: 2 }])).toBe(false);
  });

  it('양 끝을 덮지 않으면 거부', () => {
    expect(validStops([{ at: 0.2, color: 1 }, { at: 0.8, color: 2 }])).toBe(false);
  });

  it('정지점이 하나뿐이면 거부 — 그라디언트가 아니다', () => {
    expect(validStops([{ at: 0, color: 1 }])).toBe(false);
  });
});

describe('mixHex', () => {
  it('양 끝', () => {
    expect(mixHex(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixHex(0x000000, 0xffffff, 1)).toBe(0xffffff);
  });

  it('채널별로 섞는다', () => {
    expect(mixHex(0xff0000, 0x00ff00, 0.5)).toBe(0x808000);
  });

  it('범위 밖 계수를 클램프한다', () => {
    expect(mixHex(0x000000, 0xffffff, 9)).toBe(0xffffff);
  });
});
