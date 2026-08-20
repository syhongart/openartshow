// @vitest-environment jsdom
// tests/world2-water-env.test.ts — 수면 환경맵. 감독 판정 *"왜 밑 반사는 움직이지 않을까"*
// (2026-08-20, 카드 확인 「반짝이는 점들(윤슬)」)로 생긴 축이다.
//
// ── 이 파일이 실제로 보는 것 ────────────────────────────────────────────────
// ① 픽셀이 **팔레트를 소비하는가** — 천정·지평선·지면·태양색이 각각 결과에 나타나는가
// ② 태양 원반이 **`equirectUv` 가 가리키는 자리**에 뜨는가(두 규약이 갈리면 화면에서
//    태양과 다른 쪽이 반짝인다 — 헤드리스로는 절대 안 보이는 종류의 어긋남이다)
// ③ 밤(태양 세기 0)에 원반이 **아예 없는가** — 감독이 이미 지적한 축(*"밤인데 빛이 이렇게
//    많지 않잖아"*)이라 여기서 새면 그 반려가 재발한다
// ④ `flipY` 기본값 규약 — 행 0 이 천정이다. 뒤집히면 «물이 갈색» 으로만 드러난다
// ⑤ 텍스처가 세션 내내 **같은 객체**인가(개수 불변식 `[7]`)
//
// ── 여기서 **못 보는 것** ───────────────────────────────────────────────────
// · **화면.** 환경맵이 걸렸다는 것과 그것이 윤슬처럼 보인다는 것은 다른 일이다. 게임풍
//   물은 WebGPU 전용이고 이 환경 Chromium 에는 `navigator.gpu` 가 없다 — 판정은 감독
//   실기기가 유일한 축이고, 이 파일의 통과를 «검증됨» 으로 적지 않는다.
// · **three 가 `envMap` 을 실제로 샘플링하는지.** 재질 프로퍼티에 텍스처가 걸린 것까지가
//   여기 범위다(그 배선은 `world2-ocean.test.ts`·`world2-water-style.test.ts`).
// · 태양 각반경 6° 가 화면에서 «점» 으로 읽히는지 — 값 판정은 감독 몫이다.

import { describe, it, expect } from 'vitest';
import {
  ENV_W, ENV_H, SUN_DEG, SUN_GAIN, equirectUv, bakeEnvPixels, type EnvPalette,
} from '../frontend/js/world2/decide/water-env.js';

/** 검사용 팔레트. 세 색을 **서로 확실히 다른 채널**에 몰아 둔다 — 그래야 결과 픽셀만 보고
 *  «어느 입력이 여기 왔는가» 를 가릴 수 있다(회색끼리면 뒤바뀌어도 안 걸린다). */
const PALETTE: EnvPalette = {
  zenith: [0, 0, 1],     // 파랑 = 천정
  horizon: [0, 1, 0],    // 초록 = 지평선
  ground: [1, 0, 0],     // 빨강 = 지면
  sun: [1, 1, 1],
  sunI: 1,
  sunDir: { x: 0.4, y: 0.7, z: 0.2 },
};

function bake(p: Partial<EnvPalette> = {}): Uint8Array {
  const out = new Uint8Array(ENV_W * ENV_H * 4);
  bakeEnvPixels(out, { ...PALETTE, ...p });
  return out;
}

/** 텍셀 색. `u`·`v` 는 텍스처 좌표(v=1 이 천정) */
function at(px: Uint8Array, u: number, v: number): [number, number, number] {
  const i = Math.min(ENV_W - 1, Math.max(0, Math.floor(u * ENV_W)));
  const j = Math.min(ENV_H - 1, Math.max(0, Math.floor((1 - v) * ENV_H)));
  const o = (j * ENV_W + i) * 4;
  return [px[o], px[o + 1], px[o + 2]];
}

const lum = (c: [number, number, number]): number => c[0] + c[1] + c[2];

describe('수면 환경맵 — 등장방형 판정', () => {
  it('★ 방향 ↔ UV 가 왕복한다 — 태양이 엉뚱한 자리에 뜨는 것을 막는 유일한 축', () => {
    // `bakeEnvPixels` 안의 (u,v)→방향 과 `equirectUv` 의 방향→(u,v) 는 **서로 역이어야**
    // 한다. 둘이 갈리면 코드는 멀쩡히 돌고 그림도 나오는데 **태양만 다른 쪽에서 반짝인다**
    // — 헤드리스로는 잡을 길이 없고 감독 화면에서만 드러나는 종류다. 그래서 성질로 본다.
    for (const [u, v] of [[0.1, 0.7], [0.5, 0.5], [0.9, 0.9], [0.33, 0.2], [0.77, 0.61]]) {
      const lon = (u - 0.5) * 2 * Math.PI;
      const lat = (v - 0.5) * Math.PI;
      const cosLat = Math.cos(lat);
      const dir = { x: -Math.cos(lon) * cosLat, y: Math.sin(lat), z: Math.sin(lon) * cosLat };
      const back = equirectUv(dir);
      expect(back.u, `u 가 왕복하지 않는다 (${u},${v})`).toBeCloseTo(u, 6);
      expect(back.v, `v 가 왕복하지 않는다 (${u},${v})`).toBeCloseTo(v, 6);
    }
  });

  it('★ 위/아래 규약 — 행 0 이 천정이다 (`flipY` 기본값)', () => {
    const px = bake({ sunI: 0 });
    // 천정(v=1)은 파랑, 나딜(v=0)은 빨강. 뒤집히면 이 둘이 맞바뀐다.
    const top = at(px, 0.5, 1 - 1e-6);
    const bottom = at(px, 0.5, 0);
    expect(top[2], '천정이 파랑(zenith)이 아니다 — 세로가 뒤집혔다').toBeGreaterThan(200);
    expect(bottom[0], '나딜이 빨강(ground)이 아니다 — 세로가 뒤집혔다').toBeGreaterThan(200);
  });

  it('지평선에서 두 색이 만난다 — 보간이 실제로 돈다', () => {
    const px = bake({ sunI: 0 });
    // v=0.5 는 초록(horizon). 위아래로 갈수록 초록이 빠진다.
    expect(at(px, 0.25, 0.5)[1], '지평선이 horizon 색이 아니다').toBeGreaterThan(200);
    expect(at(px, 0.25, 0.9)[1], '천정 쪽에 horizon 이 그대로 남아 있다 — 보간이 없다')
      .toBeLessThan(120);
  });

  it('★ 태양 원반이 `equirectUv` 가 가리키는 자리에 있다', () => {
    const px = bake();
    const s = equirectUv(PALETTE.sunDir);
    const sun = at(px, s.u, s.v);
    // 같은 위도의 반대편 경도(태양에서 180° 떨어진 곳)와 비교한다 — 위도가 같으므로
    // 하늘 그라디언트 몫은 동일하고, 차이는 **오직 태양 원반**에서 온다.
    const away = at(px, (s.u + 0.5) % 1, s.v);
    expect(lum(sun), '태양 자리가 반대편보다 밝지 않다 — 원반이 없거나 자리가 어긋났다')
      .toBeGreaterThan(lum(away) + 60);
  });

  it('★ 밤에는 원반이 아예 없다 — 감독 *"밤인데 빛이 이렇게 많지 않잖아"*', () => {
    const px = bake({ sunI: 0 });
    const s = equirectUv(PALETTE.sunDir);
    expect(at(px, s.u, s.v), '세기 0 인데 태양 자리가 다르다')
      .toEqual(at(px, (s.u + 0.5) % 1, s.v));
  });

  it('원반 크기가 `SUN_DEG` 를 따른다 — 상수를 여기 다시 적지 않는다', () => {
    const px = bake();
    const s = equirectUv(PALETTE.sunDir);
    // 각반경 바깥(2배 거리)은 하늘과 같아야 하고, 안쪽 중심은 밝아야 한다. 경도 방향
    // 이동량을 각도에서 유도한다 — 위도가 0 에 가깝지 않으므로 `cos(lat)` 로 나눈다.
    const lat = Math.asin(PALETTE.sunDir.y / Math.hypot(
      PALETTE.sunDir.x, PALETTE.sunDir.y, PALETTE.sunDir.z,
    ));
    const dU = (deg: number) => (deg / 360) / Math.cos(lat);
    const outside = at(px, s.u + dU(SUN_DEG * 2.5), s.v);
    const far = at(px, (s.u + 0.5) % 1, s.v);
    expect(lum(outside), `각반경 ${SUN_DEG}° 의 2.5배 밖인데 아직 밝다 — 원반이 잘리지 않는다`)
      .toBeCloseTo(lum(far), -1);
  });

  it('세기가 결과에 곱해진다 — `SUN_GAIN`·`sunI` 를 아무도 안 쓰면 깨진다', () => {
    const s = equirectUv(PALETTE.sunDir);
    const weak = at(bake({ sunI: 0.05 }), s.u, s.v);
    const strong = at(bake({ sunI: 1 }), s.u, s.v);
    expect(lum(strong), '세기를 20배 올렸는데 안 밝아진다').toBeGreaterThan(lum(weak) + 60);
    expect(SUN_GAIN, '전제: 원반은 하늘보다 확실히 밝아야 «점» 으로 읽힌다').toBeGreaterThan(1);
  });

  it('알파는 전부 불투명 — 환경맵에 구멍이 나면 반사가 끊긴다', () => {
    const px = bake();
    for (let o = 3; o < px.length; o += 4) {
      if (px[o] !== 255) throw new Error(`알파가 255 가 아니다 (offset ${o}: ${px[o]})`);
    }
  });
});

describe('수면 환경맵 — 텍스처 집행', () => {
  it('★ 같은 텍스처를 다시 굽는다 — 개수 불변식 [7]', async () => {
    const { createWaterEnv } = await import('../frontend/js/world2/features/water-env.js');
    const src = {
      scene: { fog: { color: { r: 0.7, g: 0.8, b: 0.9 } } },
      sun: { color: { r: 1, g: 1, b: 1 }, intensity: 2, position: { x: 0, y: 1, z: 0 } },
      hemi: {
        color: { r: 0.5, g: 0.7, b: 1 }, groundColor: { r: 0.3, g: 0.3, b: 0.2 }, intensity: 1,
      },
    };
    const env = createWaterEnv(src as never);
    const first = env.texture;
    env.bake();
    env.bake();
    expect(env.texture, 'bake 마다 텍스처가 새로 나면 세션 중 누수다').toBe(first);
  });

  it('★ 씬 조명을 바꾸면 픽셀이 따라온다 — 색을 이 코드가 갖고 있지 않다는 증거', async () => {
    const { createWaterEnv } = await import('../frontend/js/world2/features/water-env.js');
    // `intensity` 하나만 낮춘다. 이 값이 소비되지 않으면(색만 읽으면) 밤에도 낮처럼
    // 밝은 하늘이 반사되고, 그것이 감독이 이미 반려한 화면이다.
    const hemi = {
      color: { r: 0.5, g: 0.7, b: 1 }, groundColor: { r: 0.3, g: 0.3, b: 0.2 }, intensity: 1,
    };
    const src = {
      scene: { fog: null },
      // ⚠ 태양을 **천정에서 치운다.** 낮 세기에서는 원반이 흰색으로 포화하므로(그것이
      // 의도다 — 아래 `SUN_GAIN` 주석), 천정에 두면 이 단언이 재는 것이 하늘이 아니라
      // 태양이 되어 «반구광을 소비하는가» 축이 통째로 사라진다.
      sun: { color: { r: 1, g: 1, b: 1 }, intensity: 2, position: { x: 1, y: 0.05, z: 0 } },
      hemi,
    };
    const env = createWaterEnv(src as never);
    // three 의 `DataTexture` 는 `image` 가 `{ data, width, height }` 다 — 배열 자체가
    // 아니다. 이 한 줄을 틀리면 단언이 `NaN < NaN` 이 되어 **조용히 통과할 뻔했다.**
    const image = (env.texture.image as unknown as { data: Uint8Array }).data;
    const zenithLum = () => {
      const o = (0 * ENV_W + Math.floor(ENV_W / 2)) * 4;   // 행 0 = 천정
      return image[o] + image[o + 1] + image[o + 2];
    };
    const day = zenithLum();
    hemi.intensity = 0.08;
    env.bake();
    expect(zenithLum(), '반구광 세기를 12배 낮췄는데 환경맵이 그대로다')
      .toBeLessThan(day * 0.5);
  });

  it('등장방형 매핑·sRGB 로 건다 — 매핑이 틀리면 반사가 통째로 어긋난다', async () => {
    const THREE = await import('three/webgpu');
    const { createWaterEnv } = await import('../frontend/js/world2/features/water-env.js');
    const env = createWaterEnv({
      scene: { fog: null },
      sun: { color: { r: 1, g: 1, b: 1 }, intensity: 1, position: { x: 0, y: 1, z: 0 } },
      hemi: {
        color: { r: 1, g: 1, b: 1 }, groundColor: { r: 0, g: 0, b: 0 }, intensity: 1,
      },
    } as never);
    expect(env.texture.mapping).toBe(THREE.EquirectangularReflectionMapping);
    expect(env.texture.colorSpace).toBe(THREE.SRGBColorSpace);
    // 밉맵을 만들면 `bake` 마다 다시 만들어야 한다 — 시간대 전환 비용이 픽셀 루프로
    // 끝나지 않게 되고, 그것이 이 설계의 전제였다.
    expect(env.texture.generateMipmaps, '밉맵을 켜면 재굽기 비용 전제가 깨진다').toBe(false);
  });
});
