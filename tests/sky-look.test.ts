// 하늘 룩 판정 — 파란 하늘(`dayStops`) · 둥근 지구의 구름(`cloudElev`)
//
// 감독 지시 2026-08-12: *"파란 하늘 만들어보자. 지금 하늘 색이 파랗지 않아."*
// + *"실제로는 지구는 둥글고 구름은 지구를 중심으로 구형으로 있어서. 하늘의 구름이
// 지금과 다르게 보여."*
//
// ⚠ **이 파일은 순수 판정만 본다.** 굽는 쪽(`paintSky`·`paintCloudLayer`)은 캔버스가
// 필요해 여기서 못 돌린다 — 즉 *"판정한 값이 실제로 소비되는가"* 는 **이 파일이 안 보는
// 축**이다. 그 경계는 이 저장소가 이미 한 번 값을 치른 자리이므로(구름 `alpha` 미소비 —
// 순수 함수 안에서만 참인 테스트를 넣고 통합 지점은 아무도 안 봤다) **숨기지 않고 적는다.**
// 감독 화면 판정이 먼저라는 지시(2026-08-12 *"일단 내가 확인하고 괜찮으면 검증돌리자"*)에
// 따라 집행 축은 확정 후 붙인다.

import { describe, it, expect } from 'vitest';
import { cloudElev, dayStops } from '../frontend/js/sky.js';

const rgb = (n: number) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const FOG = rgb(0xe9eef2); // 낮·맑음 팔레트의 안개색

describe('cloudElev — 구름 원근', () => {
  it('★ curve=0 이면 옛 동작(v/2)과 정확히 같다 — 되돌림 링크의 근거', () => {
    // `?cloudcurve=0` 이 "옛 화면 그대로" 라고 주석·PR 에 적었다. 그 문장을 참으로
    // 만드는 것이 이 단언이다. 근사가 아니라 **정확히** 같아야 한다.
    for (let i = 0; i <= 64; i++) {
      const v = i / 64;
      expect(cloudElev(v, 0)).toBe(v / 2);
    }
  });

  it('양 끝(천정·지평선)은 곡률과 무관하게 일치한다', () => {
    // 곡률은 중간 고도를 지평선 쪽으로 미는 것이지 하늘의 범위를 바꾸는 것이 아니다.
    // 끝이 어긋나면 돔 극점에서 이음매가 생긴다.
    expect(cloudElev(0, 1)).toBeCloseTo(0, 12);
    expect(cloudElev(1, 1)).toBeCloseTo(0.5, 6);
  });

  it('★ 중간 고도가 지평선 쪽으로 밀린다 — 이것이 룩의 핵이다', () => {
    // 고도 45°(v=0.5)에서 구름층까지 수평거리는 구름 고도의 약 1배인데 지평선까지는
    // 약 80배다. 즉 각도로 절반인 자리가 거리로는 1/80 이다 — 곡률 좌표가 선형보다
    // **훨씬 작아야** 한다. 이 부등호가 뒤집히면 구름이 반대로 천정에 몰린다.
    for (const v of [0.3, 0.5, 0.7, 0.85]) {
      expect(cloudElev(v, 1)).toBeLessThan(v / 2);
    }
  });

  it('단조증가한다 — 뒤집히면 구름장이 접힌다', () => {
    let prev = -1;
    for (let i = 0; i <= 256; i++) {
      const y = cloudElev(i / 256, 1);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });

  it('curve 는 두 경로 사이를 잇는다 — 중간값이 양쪽 사이에 있다', () => {
    // 노브가 0/1 만 의미 있으면 그것은 토글이지 강도가 아니다. 감독이 "얼마나 둥글게"
    // 를 고를 수 있어야 하므로 중간값이 실제로 중간이어야 한다.
    for (const v of [0.4, 0.6, 0.8]) {
      const lin = cloudElev(v, 0), full = cloudElev(v, 1), half = cloudElev(v, 0.5);
      expect(half).toBeLessThan(lin);
      expect(half).toBeGreaterThan(full);
    }
  });

  it('curve 가 1 을 넘어도 완전 곡률에서 멈춘다', () => {
    expect(cloudElev(0.5, 2)).toBe(cloudElev(0.5, 1));
  });
});

describe('dayStops — 낮 하늘 파랑', () => {
  it('★ blue=0 이면 옛 스톱과 바이트 동일 — 되돌림 링크의 근거', () => {
    const s = dayStops(0, FOG);
    expect(s).toEqual([
      [0, rgb(0x3f86c8)],
      [0.62, rgb(0x8cbae0)],
      [0.93, rgb(0xbdd6ea)],
      [1, FOG],
    ]);
  });

  it('마지막 스톱은 언제나 안개색이다 — 지평선 이음새 제거의 핵', () => {
    for (const b of [0, 0.5, 1, 1.5]) {
      const s = dayStops(b, FOG);
      expect(s[s.length - 1]).toEqual([1, FOG]);
    }
  });

  it('★ blue=1 이 실제로 더 파랗다 — 채도가 아니라 청-적 차이로 잰다', () => {
    // 하늘이 "파랗다" 를 재는 축은 **파랑 채널이 빨강보다 얼마나 큰가** 다. 밝기만
    // 낮추면 어두워질 뿐 파래지지 않으므로 그 축으로는 판정이 안 된다.
    const old = dayStops(0, FOG), neo = dayStops(1, FOG);
    for (let i = 0; i < 3; i++) {
      const a = old[i][1] as number[], b = neo[i][1] as number[];
      expect(b[2] - b[0]).toBeGreaterThan(a[2] - a[0]);
    }
  });

  it('★ 시야에 들어오는 대역(중·저고도)이 특히 파래진다 — 처방의 실질', () => {
    // 눈높이에서 사람이 보는 하늘은 대부분 v=0.5~1 이다. 천정만 진해지면 화면은
    // 그대로다 — 그것이 옛 값의 실패였다. 0.62·0.93 스톱의 개선폭이 천정보다
    // 작지 않아야 한다.
    const d = (b: number, i: number) => {
      const c = dayStops(b, FOG)[i][1] as number[];
      return c[2] - c[0];
    };
    const gainZenith = d(1, 0) - d(0, 0);
    expect(d(1, 1) - d(0, 1)).toBeGreaterThanOrEqual(gainZenith);
    expect(d(1, 2) - d(0, 2)).toBeGreaterThanOrEqual(gainZenith);
  });

  it('blue>1 은 외삽이라 더 진해진다 — 감독이 고를 여지', () => {
    const one = dayStops(1, FOG)[0][1] as number[];
    const over = dayStops(1.5, FOG)[0][1] as number[];
    expect(over[2] - over[0]).toBeGreaterThan(one[2] - one[0]);
  });

  it('채널이 0..255 를 벗어나지 않는다 — 외삽이 색을 깨뜨리지 않게', () => {
    for (const b of [0, 1, 1.5, 3]) {
      for (const [, c] of dayStops(b, FOG)) {
        for (const v of c as number[]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(255);
          expect(Number.isInteger(v)).toBe(true);
        }
      }
    }
  });
});
