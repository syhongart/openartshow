// 하늘 베이스 그라디언트의 **양자화 직전 디더** — 그레인과 밴딩은 상충하는 두 축이다.
//
// ── 왜 이 검사가 생겼나 (감독 지시 2026-08-03) ──────────────────────────────
// *"하늘에 노이즈가 왜 이렇게 많아... 깨끗하게 안되나?"* → 별·성운을 줄였더니
// *"하늘 텍스쳐에 노이즈가 있어.."* → *"그레인 노이즈가 보여"*.
//
// 원인은 디더의 **진폭**이 아니라 **넣는 지점**이었다. 옛 판본은 `getImageData` 로 읽은
// **8비트 픽셀**에 ±2~±4 를 더했는데, canvas 의 `createLinearGradient` 는 이미 자체
// 디더를 한다. 그래서 그 노이즈는 디더로서 아무 일도 안 하고 그레인만 남겼다 —
// 디자이너 실측에서 ±2 판본이 **그레인이 가장 크면서 밴딩도 가장 나빴다**(두 축 모두 열등).
//
// ── 이 검사가 없으면 무엇이 새는가 ─────────────────────────────────────────
// 이 저장소는 같은 형태로 두 번 데었다: 물 2겹에서 검사가 전부 **조립 시점 정적 속성**만
// 봐서, 층을 정지시켜도·시간대 분기를 지워도 78건이 전부 통과했다(검수관 반려).
// 여기서도 "상수가 ±0.5 다" 를 확인하는 검사는 아무것도 보증하지 않는다 —
// 디더는 **그려진 픽셀에서** 판정해야 한다. 그래서 `paintBase` 를 실제로 호출한다.
//
// 두 축을 **각각** 재는 것이 핵심이다. 한쪽만 보면 반대쪽 회귀를 통과시킨다 —
// 실제로 "dither 를 그냥 빼면 그레인이 사라진다" 가 참이었지만 낮에 밴딩이 돌아왔다.

import { describe, it, expect } from 'vitest';
import { paintBase } from '../frontend/js/sky.js';

/** `paintBase` 가 쓰는 두 API 만 갖춘 최소 스텁 — 실제 코드를 그대로 돌린다. */
function fakeCtx() {
  let out: { data: Uint8ClampedArray; width: number; height: number } | null = null;
  return {
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: (img: { data: Uint8ClampedArray; width: number; height: number }) => {
      out = img;
    },
    get result() {
      if (!out) throw new Error('putImageData 가 호출되지 않았다 — 페인터가 안 돌았다');
      return out;
    },
  };
}

/** 채널 값 하나를 꺼낸다. c: 0=R 1=G 2=B */
function px(img: { data: Uint8ClampedArray; width: number }, x: number, y: number, c: number) {
  return img.data[(y * img.width + x) * 4 + c];
}

function render(W: number, H: number, stops: [number, number[]][], fog: number[]) {
  const ctx = fakeCtx();
  paintBase(ctx as never, W, H, H / 2, stops as never, fog as never);
  return ctx.result;
}

// ── G-1: 디더가 실제로 밴딩을 깬다 — 처방의 본체 ───────────────────────────
//
// 밤하늘 실제 스톱과 같은 기울기를 쓴다(R 7→20 을 지평선까지). 디더가 없으면 행 평균이
// **정수 계단**이라 고유값이 색 단계 수만큼(십여 개)뿐이고, 그것이 화면에서 가로 줄무늬로
// 보인다. 디더가 양자화 직전에 들어가면 행마다 반올림 비율이 달라져 평균이 연속에 가까워진다.
describe('베이스 디더가 밴딩을 깬다 (G-1)', () => {
  const W = 512, H = 1024;
  const img = render(W, H, [[0, [7, 10, 22]], [1, [20, 27, 48]]], [20, 27, 48]);

  it('★ 행 평균이 계단이 아니다 — 이 검사가 처방의 본체다', () => {
    // 디더 구간(천정 캡 아래 ~ 지평선 위)만 본다.
    const y0 = ((H / 2) * 0.05) | 0;
    const means = new Set<string>();
    for (let y = y0; y < H / 2 - 1; y++) {
      let s = 0;
      for (let x = 0; x < W; x++) s += px(img, x, y, 0);
      means.add((s / W).toFixed(3));
    }
    // R 이 7→20 이므로 디더가 없으면 고유 행평균은 14 개 남짓이다.
    // (디더를 죽이면 이 단언이 깨진다 — 뮤테이션으로 확인한다.)
    expect(
      means.size,
      `행 평균 고유값이 ${means.size}개 — 계단이 남아 있다(디더가 안 듣는다)`,
    ).toBeGreaterThan(100);
  });

  it('행 평균이 단조 증가한다 — 디더가 그라디언트 자체를 흔들면 안 된다', () => {
    const y0 = ((H / 2) * 0.05) | 0;
    const rowMean = (y: number) => {
      let s = 0;
      for (let x = 0; x < W; x++) s += px(img, x, y, 0);
      return s / W;
    };
    // 인접 행은 노이즈로 뒤집힐 수 있으므로 충분히 떨어진 표본으로 본다.
    let bad = 0;
    for (let y = y0 + 40; y < H / 2 - 1; y += 40) if (rowMean(y) < rowMean(y - 40)) bad++;
    expect(bad, '그라디언트가 뒤집힌 구간이 있다').toBe(0);
  });
});

// ── G-2: 그레인이 1 LSB 를 넘지 않는다 ──────────────────────────────────────
//
// 감독이 본 그레인의 정체는 **진폭**이다. 옛 판본은 ±2(=최대 4 단계 폭)였다.
// 양자화 직전 ±0.5 디더는 각 픽셀을 `floor(base)` 또는 `floor(base)+1` 로만 보낸다.
describe('그레인이 1 LSB 안이다 (G-2)', () => {
  const W = 512, H = 256;
  // 단색에 가까운 스톱 — 행 안에서 base 가 상수라 흔들림이 곧 디더 진폭이다.
  const img = render(W, H, [[0, [80, 80, 80]], [1, [96, 96, 96]]], [96, 96, 96]);

  it('★ 한 행 안의 값 폭이 1 을 넘지 않는다', () => {
    const y0 = ((H / 2) * 0.05) | 0;
    let worst = 0, worstY = -1;
    for (let y = y0; y < H / 2 - 1; y++) {
      let lo = 255, hi = 0;
      for (let x = 0; x < W; x++) {
        const v = px(img, x, y, 0);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (hi - lo > worst) { worst = hi - lo; worstY = y; }
    }
    expect(worst, `y=${worstY} 에서 값 폭 ${worst} — 1 LSB 를 넘었다`).toBeLessThanOrEqual(1);
  });

  it('★ 3채널이 같은 노이즈를 쓴다 — 따로 뽑으면 색 노이즈가 된다', () => {
    // base 가 R=G=B 이므로 같은 노이즈면 픽셀마다 세 채널이 정확히 같아야 한다.
    const y0 = ((H / 2) * 0.05) | 0;
    let mismatch = 0;
    for (let y = y0; y < H / 2 - 1; y++) {
      for (let x = 0; x < W; x++) {
        const r = px(img, x, y, 0), g = px(img, x, y, 1), b = px(img, x, y, 2);
        if (r !== g || g !== b) mismatch++;
      }
    }
    expect(mismatch, `채널이 어긋난 픽셀 ${mismatch}개 — 색 노이즈가 생긴다`).toBe(0);
  });

  it('알파가 전부 불투명이다 — Uint32 패킹이 엔디언을 틀리면 여기서 드러난다', () => {
    let bad = 0;
    for (let y = 0; y < H; y += 7) for (let x = 0; x < W; x += 13) {
      if (px(img, x, y, 3) !== 255) bad++;
    }
    expect(bad, `알파가 255 가 아닌 표본 ${bad}개`).toBe(0);
  });
});

// ── G-3: 천정 캡에는 디더가 없다 ────────────────────────────────────────────
//
// equirect 극점에서는 픽셀 노이즈가 **방사 부챗살**로 늘어난다(상방 실측). 옛 판본도
// 최상단 5% 를 뺐고, 그 경계를 유지해야 회귀가 아니다.
describe('천정 극점에는 디더가 안 들어간다 (G-3)', () => {
  it('★ 캡 구간의 각 행이 완전 단색이다', () => {
    const W = 256, H = 512;
    const img = render(W, H, [[0, [80, 80, 80]], [1, [96, 96, 96]]], [96, 96, 96]);
    const y0 = ((H / 2) * 0.05) | 0;
    expect(y0, '캡 구간이 비어 있으면 이 검사가 공허해진다').toBeGreaterThan(0);
    let varied = 0;
    for (let y = 0; y < y0; y++) {
      const first = px(img, 0, y, 0);
      for (let x = 1; x < W; x++) if (px(img, x, y, 0) !== first) { varied++; break; }
    }
    expect(varied, `캡 안에서 흔들린 행 ${varied}개 — 극점 부챗살이 돌아온다`).toBe(0);
  });
});

// ── G-4: 노이즈가 행 주기로 반복되지 않는다 ─────────────────────────────────
//
// 난수 LUT 를 인덱스 순회로 쓰면 `LUT크기 / 폭` 행마다 **같은 노이즈 줄이 되풀이된다**
// (65536 / 2048 = 32행). 확대되면 그것이 규칙적 무늬로 보인다. 행마다 위상을 소수만큼
// 밀어 주기를 텍스처 높이 밖으로 내보낸다.
describe('노이즈가 32행 주기로 반복되지 않는다 (G-4)', () => {
  it('★ 32행 떨어진 두 행의 노이즈가 다르다', () => {
    const W = 2048, H = 256; // 실제 돔 폭 — 주기가 여기서만 성립한다
    // base 기울기를 잡아 y 와 y+32 의 base 차가 **정확히 정수**가 되게 한다.
    // (H/2=128 행에 걸쳐 R 이 64 증가 → 행당 0.5 → 32행이면 정확히 16.)
    const img = render(W, H, [[0, [40, 40, 40]], [1, [104, 104, 104]]], [104, 104, 104]);
    // ⚠ **홀수 행을 고른다.** 행당 base 증가가 0.5 이므로 짝수 행은 base 가 정확히 정수가
    //   되고, 그러면 `base + n + 0.5` 가 `n ∈ [−0.5, 0.5)` 전 구간에서 같은 정수로 절단돼
    //   **디더가 아예 안 걸린다.** 첫 판본이 y=20 을 골라 두 행 모두 단색이었고, 일치율
    //   100% 가 "노이즈 반복"이 아니라 "표본이 공허함"을 뜻했다. 아래에서 못 박는다.
    const yA = 21, yB = yA + 32;
    expect(yB, '표본 행이 디더 구간 안이어야 한다').toBeLessThan(H / 2 - 1);
    const varies = (y: number) => {
      const first = px(img, 0, y, 0);
      for (let x = 1; x < W; x++) if (px(img, x, y, 0) !== first) return true;
      return false;
    };
    expect(varies(yA) && varies(yB), '표본 행에 디더가 안 걸렸다 — 아래 단언이 공허해진다')
      .toBe(true);
    // 노이즈가 같으면 두 행의 차가 모든 x 에서 정확히 16 이 된다.
    let same = 0;
    for (let x = 0; x < W; x++) same += px(img, x, yB, 0) - px(img, x, yA, 0) === 16 ? 1 : 0;
    // 무작위라면 일치율이 50% 안팎이다. 90% 를 넘으면 위상이 안 밀린 것이다.
    expect(
      same / W,
      `32행 간격 일치율 ${(same / W * 100).toFixed(1)}% — 노이즈가 되풀이된다`,
    ).toBeLessThan(0.9);
  });
});

// ── G-5: 결정론 ────────────────────────────────────────────────────────────
describe('하늘은 모든 방문자에게 같다 (G-5)', () => {
  it('두 번 그리면 픽셀이 완전히 같다', () => {
    const W = 256, H = 256;
    const stops: [number, number[]][] = [[0, [7, 10, 22]], [0.55, [20, 27, 48]], [1, [35, 44, 70]]];
    const a = render(W, H, stops, [35, 44, 70]);
    const b = render(W, H, stops, [35, 44, 70]);
    let diff = 0;
    for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) diff++;
    expect(diff, `${diff}개 채널이 달라졌다 — 하늘이 방문자마다 달라진다`).toBe(0);
  });
});

// ── G-6: 스톱과 지평선이 실제로 재현된다 ────────────────────────────────────
//
// 디더에만 눈이 가면 **색이 맞는지**를 아무도 안 본다. 옛 판본은 canvas gradient 였고
// 새 판본은 직접 보간이라, 보간 규칙이 어긋나면 하늘색이 통째로 바뀐다.
describe('그라디언트 색과 지평선이 맞는다 (G-6)', () => {
  const W = 64, H = 512;
  const stops: [number, number[]][] = [[0, [7, 10, 22]], [0.5, [20, 27, 48]], [1, [35, 44, 70]]];
  const fog = [35, 44, 70];
  const img = render(W, H, stops, fog);

  it('천정(y=0)이 첫 스톱 색이다 — 캡 구간이라 디더도 없다', () => {
    expect([px(img, 0, 0, 0), px(img, 0, 0, 1), px(img, 0, 0, 2)]).toEqual([7, 10, 22]);
  });

  it('★ 지평선 아래가 fog 단색이다 — 이음새가 보이는 자리다', () => {
    const edge = H / 2 - 1;
    for (const y of [edge, edge + 1, H - 1]) {
      expect(
        [px(img, 0, y, 0), px(img, 0, y, 1), px(img, 0, y, 2)],
        `y=${y} 가 fog 색이 아니다`,
      ).toEqual(fog);
    }
  });

  it('중간 스톱이 ±1 안에서 재현된다 — 보간 규칙이 어긋나면 하늘색이 통째로 바뀐다', () => {
    const y = ((H / 2) * 0.5) | 0; // t=0.5 → 두 번째 스톱
    for (let c = 0; c < 3; c++) {
      expect(Math.abs(px(img, 0, y, c) - stops[1][1][c]), `채널 ${c} 가 어긋났다`)
        .toBeLessThanOrEqual(1);
    }
  });

  // ★ 4-스톱(낮 팔레트)도 본다 — 검수관 권고 R2.
  // 위 3-스톱만 보면 구간 탐색 `while (k < stops.length - 2 && …)` 의 **중간 구간 전진**이
  // 한 번도 안 돈다. 실제 `day` 스톱은 4개(0 / 0.62 / 0.93 / 1)이고, 거기서만 `k` 가 1 을
  // 넘어간다 — 검사가 안 도는 경로에 코드가 있으면 그것은 검사되지 않은 코드다.
  it('★ 4-스톱에서 모든 중간 스톱이 재현된다 — 구간 탐색이 실제로 전진한다', () => {
    const day: [number, number[]][] = [
      [0, [63, 134, 200]], [0.62, [140, 186, 224]], [0.93, [189, 214, 234]], [1, [200, 220, 240]],
    ];
    const im = render(64, 512, day, [200, 220, 240]);
    for (let s = 1; s < day.length - 1; s++) {
      const y = ((512 / 2) * day[s][0]) | 0;
      for (let c = 0; c < 3; c++) {
        expect(
          Math.abs(px(im, 0, y, c) - day[s][1][c]),
          `스톱 ${s}(t=${day[s][0]}) 채널 ${c} 가 어긋났다 — 구간 탐색이 틀렸다`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  it('4-스톱에서 구간 사이 값이 두 스톱 사이에 놓인다 — 엉뚱한 구간을 고르면 벗어난다', () => {
    const day: [number, number[]][] = [
      [0, [63, 134, 200]], [0.62, [140, 186, 224]], [0.93, [189, 214, 234]], [1, [200, 220, 240]],
    ];
    const im = render(64, 512, day, [200, 220, 240]);
    const y = ((512 / 2) * 0.775) | 0; // 0.62 와 0.93 의 중간 — 두 번째 구간 한가운데
    const lo = day[1][1][0], hi = day[2][1][0];
    const v = px(im, 0, y, 0);
    expect(v, `R=${v} 가 [${lo}, ${hi}] 밖이다`).toBeGreaterThanOrEqual(lo);
    expect(v).toBeLessThanOrEqual(hi);
  });
});
