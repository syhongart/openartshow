// world2 하늘·구름 판정 테스트.
//
// 구름은 InstancedMesh 하나로 고정 개수다. 그래서 "더 만드는" 대신 **순환**하는데,
// 그 순환이 어긋나면 오래 켜 뒀을 때 구름이 저 멀리 사라지거나 한곳에 뭉친다.
// 그건 몇 분 뒤에야 드러나는 종류라 눈으로 잡기 어렵다 — 여기서 못 박는다.

import { describe, it, expect } from 'vitest';
import {
  cloudLayout, cloudTint, driftedX, driftedZ, wrap, skyColorAt, mixHex, validStops,
  CLOUD_FIELD, DEFAULT_CLOUDS, CLOUD_TILT_MAX, worstElevation,
  type CloudSpec, type SkyStop,
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
    // 경계는 고도 범위에서 파생시킨다. 숫자를 손으로 박아두면 minY/maxY가 바뀔 때
    // 한쪽 표본이 조용히 비고, 빈 평균 0이 단언을 통과시켜 버린다(실제로 그랬다).
    const lo = DEFAULT_CLOUDS.minY + (DEFAULT_CLOUDS.maxY - DEFAULT_CLOUDS.minY) * 0.3;
    const hi = DEFAULT_CLOUDS.minY + (DEFAULT_CLOUDS.maxY - DEFAULT_CLOUDS.minY) * 0.7;
    const low = cs.filter((c) => c.y < lo);
    const high = cs.filter((c) => c.y > hi);
    expect(low.length).toBeGreaterThan(0);
    expect(high.length).toBeGreaterThan(0);
    const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
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

// ── cloudTint ────────────────────────────────────────────────────────────────
// 이 함수가 생긴 이유가 곧 이 테스트가 있는 이유다. `cloudLayout`이 구름마다 `alpha`를
// 계산해 뒀는데 집행 쪽이 그 값을 **한 번도 읽지 않아서** 40장이 전부 최대 불투명으로
// 겹쳐 그려졌고, 감독이 실기기에서 "노이즈가 많다"고 보고했다. 계산된 값이 소비되는지는
// 눈으로 코드를 봐도 잘 안 보인다 — 그래서 소비를 여기서 강제한다.
describe('cloudTint', () => {
  const spec = (y: number, alpha: number): CloudSpec =>
    ({ x: 0, z: 0, y, w: 100, h: 50, ry: 0, alpha, tiltX: 0, tiltZ: 0 });

  const BASE = 0x1b2030, RIM = 0xe8c9a0, HORIZON = 0x0b0d12;
  const tint = (y: number, a: number) => cloudTint(spec(y, a), BASE, RIM, HORIZON, 160, 260);

  const lum = (c: number) =>
    0.2126 * ((c >> 16) & 255) + 0.7152 * ((c >> 8) & 255) + 0.0722 * (c & 255);

  it('alpha가 낮을수록 지평선색에 가까워진다 — 이것이 "옅다"의 구현이다', () => {
    const solid = tint(200, 1);
    const faint = tint(200, 0.2);
    // 옅은 쪽이 지평선색에 더 가깝다.
    expect(Math.abs(lum(faint) - lum(HORIZON))).toBeLessThan(Math.abs(lum(solid) - lum(HORIZON)));
  });

  it('alpha=0이면 정확히 지평선색 — 완전히 사라진다', () => {
    expect(tint(200, 0)).toBe(HORIZON);
  });

  it('alpha가 결과를 실제로 바꾼다 — 값이 무시되면 이 테스트가 깨진다', () => {
    expect(tint(200, 1)).not.toBe(tint(200, 0.5));
  });

  it('고도가 높을수록 밝다 — 햇빛을 더 받은 인상', () => {
    expect(lum(tint(260, 1))).toBeGreaterThan(lum(tint(160, 1)));
  });

  it('고도가 범위를 벗어나도 클램프된다', () => {
    expect(tint(9999, 1)).toBe(tint(260, 1));
    expect(tint(-9999, 1)).toBe(tint(160, 1));
  });

  it('alpha가 범위를 벗어나도 클램프된다', () => {
    expect(tint(200, 5)).toBe(tint(200, 1));
    expect(tint(200, -5)).toBe(HORIZON);
  });

  it('NaN이 들어와도 색을 낸다 — 하늘이 검게 죽지 않는다', () => {
    expect(Number.isFinite(tint(NaN, 1))).toBe(true);
    expect(Number.isFinite(tint(200, NaN))).toBe(true);
  });

  it('cloudLayout이 만든 alpha 범위 전체가 지평선색과 구분된다', () => {
    // 배치가 실제로 내놓는 값으로 확인한다 — 합성 입력만 보면 통합 지점이 비어도 통과한다.
    for (const c of cloudLayout({ ...DEFAULT_CLOUDS, minY: 160, maxY: 260 })) {
      expect(cloudTint(c, BASE, RIM, HORIZON, 160, 260)).not.toBe(HORIZON);
    }
  });
});

// ── 구름이 선으로 보이지 않는다 ──────────────────────────────────────────────
// 감독 실기기에서 구름이 판이 아니라 **얇은 금색 선**으로 보였다. 원인은 색이 아니라
// 기하였다 — 수평으로 눕힌 판을 낮은 각도에서 보면 모서리만 보인다. 겉보기 압축률이
// 정확히 sin(앙각)이라, 13° 앙각에서는 판이 23%로 눌려 12:1 실선이 된다.
//
// 여기서 지키는 것은 **최악값**이다. 반구 배치는 "처음 봤을 때의 분포"만 만들고,
// wrap이 x·z를 각 축 독립으로 접기 때문에 시간이 지나면 구름은 정사각 전체에 도로
// 균등해진다. 그래서 보장은 field가 진다 — 누가 field만 키우면 이 테스트가 깨진다.
describe('구름 앙각 — 선으로 보이지 않기 위한 하한', () => {
  /** 겉보기 압축률 하한. 이 아래로 가면 판이 선처럼 읽힌다(약 6:1). */
  const MIN_SIN = 0.30;

  it('wrap 코너에 최저고도 구름이 걸린 최악 위치에서도 하한을 지킨다', () => {
    const e = worstElevation(CLOUD_FIELD, DEFAULT_CLOUDS.minY);
    expect(Math.sin(e)).toBeGreaterThanOrEqual(MIN_SIN);
  });

  it('최악 위치에 최대 기울기까지 겹쳐도 선이 되지는 않는다', () => {
    // 판이 뷰어 반대쪽으로 기울면 유효 앙각이 그만큼 깎인다.
    const e = worstElevation(CLOUD_FIELD, DEFAULT_CLOUDS.minY) - CLOUD_TILT_MAX;
    expect(Math.sin(e)).toBeGreaterThan(0.25);
  });

  it('field를 옛 값(1200)으로 되돌리면 하한이 깨진다 — 두 값은 세트다', () => {
    // 이 단언이 통과한다는 것은 위 테스트가 실제로 field를 지키고 있다는 뜻이다.
    expect(Math.sin(worstElevation(1200, DEFAULT_CLOUDS.minY))).toBeLessThan(MIN_SIN);
  });

  it('배치된 구름 전부가 순환 영역 안이다', () => {
    for (const c of cloudLayout()) {
      expect(Math.abs(c.x)).toBeLessThanOrEqual(CLOUD_FIELD / 2 + 1e-6);
      expect(Math.abs(c.z)).toBeLessThanOrEqual(CLOUD_FIELD / 2 + 1e-6);
    }
  });

  it('기울기가 상한 안이다 — 크게 기울이면 최악 앙각이 다시 깎인다', () => {
    for (const c of cloudLayout()) {
      expect(Math.abs(c.tiltX)).toBeLessThanOrEqual(CLOUD_TILT_MAX + 1e-9);
      expect(Math.abs(c.tiltZ)).toBeLessThanOrEqual(CLOUD_TILT_MAX + 1e-9);
    }
  });

  it('고도가 높은 구름일수록 가까이 온다 — 앙각과 고도를 같은 t로 묶었다', () => {
    const cs = cloudLayout({ ...DEFAULT_CLOUDS, count: 60 });
    const dist = (c: { x: number; z: number }) => Math.hypot(c.x, c.z);
    const low = cs.filter((c) => c.y < 190).map(dist);
    const high = cs.filter((c) => c.y > 235).map(dist);
    const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
    expect(avg(high)).toBeLessThan(avg(low));
  });
});
