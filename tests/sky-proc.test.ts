// 빌더·방문자뷰 하늘 (#78 트랙A) — **값이 THEMES 를 실제로 거치는지**를 지킨다.
//
// ── 이 파일이 막는 것 ───────────────────────────────────────────────────────
// 디자이너 판정은 "새 하늘색을 만들지 말고 `THEMES.daylight` 를 재사용하라" 였다. 그
// 결정은 코드에 **참조**로 남아야 의미가 있다. 값을 베껴 적으면 미술관 하늘을 바꿀 때
// 빌더만 옛 하늘로 남고, 그 사실은 아무 테스트에도 안 걸린다 — 이 저장소가 이미 낸
// 사고의 형태다(캔버스 `rgba(36,31,28,...)` 가 `HAZE` 상수와 따로 논 건, 구름 고도
// `160`·`260` 이 배치와 색 보간에 각각 하드코딩된 건).
//
// 그래서 여기서는 **THEMES 를 바꿨을 때 따라오는지**를 단언한다. 값을 다시 적지 않는다 —
// 임계값 미러링은 이 규율이 금지하는 바로 그것이고, 옛 `minY` 기준을 박아둔 테스트가
// 빈 배열의 평균 0으로 통과한 전례가 있다.
//
// ── 어떻게 canvas 없이 도는가 ───────────────────────────────────────────────
// jsdom 의 `getContext('2d')` 는 (canvas 패키지 없이는) null 이라 실제 드로잉을 못 돌린다.
// 그래서 ctx 를 스텁으로 갈아 끼우고 **호출을 기록**한다. 돌아가는 것은 실제 `sky-proc`
// 코드다 — 그라디언트에 어떤 색을 넣는지, 무엇을 THEMES 에서 가져오는지 그대로 본다.
// (`tests/world2-ocean.test.ts` 의 "판정과 집행의 경계" 와 같은 접근이다.)

import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { THEMES } from '../frontend/js/scene-themes.js';

/** 그라디언트 스텁 — 관찰 대상은 addColorStop 에 들어온 (offset, color) 뿐이다 */
class FakeGradient {
  stops: Array<[number, string]> = [];
  addColorStop(o: number, c: string) { this.stops.push([o, c]); }
}

type Rect = { x: number; y: number; w: number; h: number; fill: unknown };

class FakeCtx {
  gradients: FakeGradient[] = [];
  rects: Rect[] = [];
  arcs: Array<{ x: number; y: number; r: number; fill: unknown }> = [];
  fillStyle: unknown = null;
  private _pending: { x: number; y: number; r: number } | null = null;

  createLinearGradient() { const g = new FakeGradient(); this.gradients.push(g); return g; }
  createRadialGradient() { const g = new FakeGradient(); this.gradients.push(g); return g; }
  fillRect(x: number, y: number, w: number, h: number) { this.rects.push({ x, y, w, h, fill: this.fillStyle }); }
  beginPath() {}
  arc(x: number, y: number, r: number) { this._pending = { x, y, r }; }
  fill() { if (this._pending) { this.arcs.push({ ...this._pending, fill: this.fillStyle }); this._pending = null; } }
}

const ctxs: FakeCtx[] = [];

beforeAll(async () => {
  // `document.createElement('canvas')` 를 가로챈다. three 의 CanvasTexture 는 이 객체를
  // 그대로 들고만 있으므로(업로드는 렌더 시점) 스텁으로 충분하다.
  (globalThis as Record<string, unknown>).document = {
    createElement: () => {
      const ctx = new FakeCtx();
      ctxs.push(ctx);
      return { width: 0, height: 0, getContext: () => ctx };
    },
  };
});

/** 테스트 대상은 document 스텁이 심긴 뒤에 import 해야 한다(모듈 최상위 부작용 없음 확인 겸). */
async function load() {
  return import('../frontend/js/sky-proc.js');
}

describe('sky-proc — THEMES 를 실제로 거친다 (값 미러링 방지)', () => {
  it('수평선 배경색이 THEMES 의 마지막 stop 에서 온다', async () => {
    const { skyHorizonColor } = await load();
    const stops = THEMES.daylight.sky.stops;
    const expected = new THREE.Color(stops[stops.length - 1][1]);
    // 값을 여기 다시 적지 않는다 — THEMES 를 바꾸면 이 단언이 함께 움직여야 한다.
    expect(skyHorizonColor().getHexString()).toBe(expected.getHexString());
  });

  it('fog 색이 THEMES.daylight.fog.color 에서 온다', async () => {
    const { skyFogColor } = await load();
    expect(skyFogColor().getHex()).toBe(new THREE.Color(THEMES.daylight.fog.color).getHex());
  });

  it('수평선색과 fog색은 서로 다른 출처다 — 한쪽으로 뭉개지 않았다', async () => {
    // 둘이 같아지면 "하나를 다른 하나로 대신 쓴" 것이므로 팔레트 변경에 함께 끌려간다.
    const { skyHorizonColor, skyFogColor } = await load();
    expect(skyHorizonColor().getHex()).not.toBe(skyFogColor().getHex());
  });
});

describe('sky-proc — 하늘 돔', () => {
  it('fog 를 받지 않는다 — 받으면 돔이 fog 색으로 통째로 덮인다', async () => {
    const { createSkyDome } = await load();
    const dome = createSkyDome();
    // 방문자뷰 fog 는 방 스케일(fogFar = 대각선×1.5)이고 돔 반경은 450 이다.
    // fog 가 켜지면 돔은 fogFar 밖이라 완전히 fog 색이 된다 → 하늘이 사라진다.
    expect((dome.material as unknown as { fog: boolean }).fog).toBe(false);
  });

  it('안쪽에서 보이도록 BackSide 다', async () => {
    const { createSkyDome } = await load();
    expect((createSkyDome().material as unknown as { side: number }).side).toBe(THREE.BackSide);
  });

  it('레이캐스트에 걸리지 않는다 — 빌더는 클릭으로 파츠를 배치한다', async () => {
    // 돔이 레이캐스트 대상이면 빈 공간 클릭이 "하늘을 맞혔다" 로 잡혀 배치가 깨진다.
    const { createSkyDome } = await load();
    const dome = createSkyDome();
    const hits: unknown[] = [];
    dome.raycast({} as never, hits as never);
    expect(hits).toEqual([]);
  });

  it('수평선이 눈높이 아래에 오도록 내려가 있다', async () => {
    const { createSkyDome } = await load();
    expect(createSkyDome().position.y).toBeLessThan(0);
  });

  it('돔 텍스처를 THEMES.daylight.sky 의 stops 로 그린다', async () => {
    const before = ctxs.length;
    const { createSkyDome } = await load();
    createSkyDome();
    const ctx = ctxs[before];
    expect(ctx, '캔버스가 만들어지지 않았다 — 드로잉 경로가 안 돌았다').toBeDefined();
    // 첫 그라디언트가 하늘 세로 그라디언트다. 넣은 색이 THEMES 와 같아야 한다.
    const drawn = ctx.gradients[0].stops.map(([, c]) => c);
    expect(drawn).toEqual(THEMES.daylight.sky.stops.map(([, c]) => c));
  });

  it('별을 그리지 않는다 — daylight 의 stars 가 0 이므로', async () => {
    // `stars: 0` 인데 별이 그려지면 스펙 소비가 어딘가 어긋난 것이다.
    expect(THEMES.daylight.sky.stars).toBe(0);
    const before = ctxs.length;
    const { createSkyDome } = await load();
    createSkyDome();
    // 별은 흰색 원(arc)으로 그려진다. 구름도 arc 를 쓰지만 구름은 그라디언트 fill 이고
    // 별은 `rgba(255, 255, 255, ...)` 문자열 fill 이다 — 후자가 0건이어야 한다.
    const starLike = ctxs[before].arcs.filter((a) => typeof a.fill === 'string');
    expect(starLike).toEqual([]);
  });
});

describe('sky-proc — 창밖 풍경 텍스처', () => {
  it('세션당 1회만 만든다 — 창 개수만큼 512² 를 만들지 않는다', async () => {
    const { getWindowSceneryTexture } = await load();
    const a = getWindowSceneryTexture();
    const b = getWindowSceneryTexture();
    expect(a).toBe(b);
  });

  it('shared 플래그가 있다 — 없으면 공간 언로드가 공유 텍스처를 파괴한다', async () => {
    // ── 실측된 결함이다 ──────────────────────────────────────────────────
    // `disposeSpaceGroup` 은 재질의 `map` 을 회수하되 `userData.shared` 인 것만 건너뛴다
    // (`space-assembler.ts` dispose 루프). 이 텍스처는 세션당 1개를 모든 창이 공유하므로
    // 플래그가 없으면 **공간 하나를 언로드할 때 파괴되어 다음 공간의 창이 깨진다.**
    //
    // 스모크는 페이지를 한 번 열 뿐이라 이것을 통과시켰다 — 공간 전환이 있어야 나는
    // 결함이고, 그래서 "스모크 PASS" 가 근거가 되지 못한다.
    const { getWindowSceneryTexture } = await load();
    expect(getWindowSceneryTexture().userData.shared).toBe(true);
  });

  it('색공간을 명시한다 — 누락이 하늘을 3배 밝힌 사고가 있다', async () => {
    const { getWindowSceneryTexture } = await load();
    expect(getWindowSceneryTexture().colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it('바다 상단이 THEMES.daylight.sea.color 다 — 실외 바다와 같은 색', async () => {
    // 창으로 보이는 바다가 실외 바다와 다른 색이면 "다른 세계" 로 읽힌다(디자이너).
    const { getWindowSceneryTexture } = await load();
    getWindowSceneryTexture();
    const seaHex = new THREE.Color(THEMES.daylight.sea.color).getHexString();
    const all = ctxs.flatMap((c) => c.gradients).flatMap((g) => g.stops.map(([, col]) => col));
    expect(all.some((c) => typeof c === 'string' && c.toLowerCase() === `#${seaHex}`)).toBe(true);
  });

  it('바다 하단은 상단에서 **유도**한다 — 두 번째 색을 적어두지 않았다', async () => {
    const { getWindowSceneryTexture } = await load();
    getWindowSceneryTexture();
    const seaTop = new THREE.Color(THEMES.daylight.sea.color);
    // 바다 그라디언트를 찾는다: stop 0 이 seaTop 인 것.
    const seaGrad = ctxs
      .flatMap((c) => c.gradients)
      .find((g) => g.stops.length === 2 && g.stops[0][1].toLowerCase() === `#${seaTop.getHexString()}`);
    expect(seaGrad, '바다 그라디언트를 못 찾았다').toBeDefined();
    const bottom = new THREE.Color(seaGrad!.stops[1][1]);
    // 유도값이므로 seaTop 보다 어둡고, **채널 비율이 하나의 배율로 일정**하다.
    // 색을 손으로 골랐다면 세 채널이 제각각 움직여 비율이 흩어진다.
    expect(bottom.r).toBeLessThan(seaTop.r);
    const ratios = [bottom.r / seaTop.r, bottom.g / seaTop.g, bottom.b / seaTop.b];

    // ── 허용 오차는 **유도한다** ──────────────────────────────────────────
    // 색이 `#rrggbb` 문자열을 거치므로 각 채널이 8비트로 양자화된다(절대오차 ≤ 1/255).
    // 비율의 오차는 그것을 채널값으로 나눈 것이라 **가장 작은 채널에서 가장 크다**:
    //     비율오차 ≤ (1/255) / min(채널)
    // 두 비율을 비교하면 그 두 배가 상한이다. "실측에 여유를 얹은 값" 을 쓰지 않는다 —
    // 전제(바다색)가 바뀌면 이 상한도 저절로 따라온다.
    const tol = 2 * (1 / 255) / Math.min(seaTop.r, seaTop.g, seaTop.b);
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(tol);
  });
});

describe('sky-proc — 창 유리 emissive 세기', () => {
  it('기존 0.28 보다 크다 — 그 값으로는 반투명 유리에서 텍스처가 안 읽혔다', async () => {
    // 디자이너 실측: `opacity 0.34` 라 최종색의 66% 가 벽색이고, emissive 0.28 로는
    // 흰 벽에서 "밋밋한 회색 사각형" 이었다. 0.6/0.95/1.3 비교 후 0.8 채택.
    const { WINDOW_EMISSIVE_INTENSITY } = await load();
    expect(WINDOW_EMISSIVE_INTENSITY).toBeGreaterThan(0.28);
  });

  it('THREE.Light 물리 광량 범위와 섞이지 않았다 — 재질 배율이다', async () => {
    // `THEMES` 의 intensity 는 PointLight 20~60 · SpotLight 80~250 단위다. 재질
    // emissiveIntensity 를 그 축으로 착각해 20 같은 값을 넣으면 화면이 하얗게 탄다.
    const { WINDOW_EMISSIVE_INTENSITY } = await load();
    expect(WINDOW_EMISSIVE_INTENSITY).toBeLessThan(2);
  });
});
