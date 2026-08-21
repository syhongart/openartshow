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
import fs from 'node:fs';
import path from 'node:path';
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
  it('★★ three 소스와 대조한다 — 라운드트립만으로는 **틀린 규약도 통과한다**', () => {
    // ── 이 검사가 생긴 이유 (검수관 반려 A, 2026-08-20) ──────────────────────
    // 첫 판본은 아래 라운드트립 하나로 이 축을 지킨다고 적었다. **틀렸다.** 라운드트립은
    // `equirectUv` 와 `bakeEnvPixels` 의 역변환이 서로 맞는지만 보는데, 둘 다 같은
    // 부호를 쓰므로 그 부호가 three 와 반대여도 언제나 통과한다. 실제로 그랬고 —
    // `atan2(z,-x)` 로 **경도가 미러링된 채** 모든 검사가 초록이었다. 더 나쁜 것은
    // 뮤테이션 M6(올바른 공식으로 되돌리기)가 «3 failed» 로 나왔다는 것이다: 검출력이
    // 거꾸로 걸려 있었다.
    //
    // **외부 라이브러리의 규약을 재현하는 순수 함수는 그 라이브러리와 맞대야 한다.**
    // 그래서 three 소스를 직접 읽는다. 경로나 표기가 바뀌면 이 검사가 깨지는데, 그것이
    // 곧 «규약을 다시 확인해야 한다» 는 신호다 — 조용히 어긋나는 것보다 낫다.
    const src = (rel: string): string =>
      fs.readFileSync(path.join(process.cwd(), 'node_modules/three/src', rel), 'utf8');

    // ① WebGL(GLSL) — 고전 경로. 공백 표기는 three 포맷터가 바꿀 수 있으므로 전부 지운다.
    const glsl = src('renderers/shaders/ShaderChunk/common.glsl.js').replace(/\s+/g, '');
    expect(glsl, 'three 의 GLSL equirectUv 가 `atan(dir.z,dir.x)` 가 아니다 — 규약이 바뀌었다')
      .toContain('atan(dir.z,dir.x)');
    expect(glsl, '`atan(dir.z,-dir.x)` 형태가 three 에 있다 — 이 검사의 전제가 무너졌다')
      .not.toContain('atan(dir.z,-dir.x)');

    // ② WebGPU(TSL) — 감독 실기기가 도는 경로다. 둘이 갈리면 백엔드마다 태양이 다른 데 뜬다.
    const tsl = src('nodes/utils/EquirectUVNode.js').replace(/\s+/g, '');
    expect(tsl, 'three 의 TSL equirectUV 가 `dir.z.atan2(dir.x)` 가 아니다')
      .toContain('dir.z.atan2(dir.x)');

    // ③ 우리 구현이 그 식과 **수치로** 같은가. 위 둘은 표기를, 이것은 결과를 본다.
    for (const d of [
      { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: -1, y: 0, z: 0 },
      { x: 0.4, y: 0.7, z: 0.2 }, { x: -0.3, y: -0.5, z: 0.81 },
    ]) {
      const len = Math.hypot(d.x, d.y, d.z);
      const three = {
        u: Math.atan2(d.z / len, d.x / len) / (2 * Math.PI) + 0.5,
        v: Math.asin(d.y / len) / Math.PI + 0.5,
      };
      const ours = equirectUv(d);
      expect(ours.u, `u 가 three 공식과 다르다 (${JSON.stringify(d)})`).toBeCloseTo(three.u, 12);
      expect(ours.v, `v 가 three 공식과 다르다 (${JSON.stringify(d)})`).toBeCloseTo(three.v, 12);
    }
  });

  it('★ 방향 ↔ UV 가 왕복한다 — 라운드트립. **위 대조 검사와 짝으로만** 뜻이 있다', () => {
    // `bakeEnvPixels` 안의 (u,v)→방향 과 `equirectUv` 의 방향→(u,v) 는 **서로 역이어야**
    // 한다. 둘이 갈리면 코드는 멀쩡히 돌고 그림도 나오는데 **태양만 다른 쪽에서 반짝인다**
    // — 헤드리스로는 잡을 길이 없고 감독 화면에서만 드러나는 종류다. 그래서 성질로 본다.
    for (const [u, v] of [[0.1, 0.7], [0.5, 0.5], [0.9, 0.9], [0.33, 0.2], [0.77, 0.61]]) {
      const lon = (u - 0.5) * 2 * Math.PI;
      const lat = (v - 0.5) * Math.PI;
      const cosLat = Math.cos(lat);
      const dir = { x: Math.cos(lon) * cosLat, y: Math.sin(lat), z: Math.sin(lon) * cosLat };
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
  const SRC = {
    scene: { fog: { color: { r: 0.7, g: 0.8, b: 0.9 } } },
    sun: { color: { r: 1, g: 1, b: 1 }, intensity: 2, position: { x: 1, y: 0.05, z: 0 } },
    hemi: {
      color: { r: 0.5, g: 0.7, b: 1 }, groundColor: { r: 0.3, g: 0.3, b: 0.2 }, intensity: 1,
    },
  };
  const pixelsOf = (t: unknown): Uint8Array =>
    ((t as { image: { data: Uint8Array } }).image).data;

  it('★★ 색을 이 코드가 갖고 있지 않다 — 씬 조명이 바뀌면 결과가 바뀐다', async () => {
    const { createWaterEnv } = await import('../frontend/js/world2/features/water-env.js');
    // 팔레트를 파일에 적으면 하늘 팔레트의 복사본이 생기고, 한쪽만 고치면 물만 옛 하늘을
    // 반사한다. 그래서 **두 인스턴스를 다른 조명으로** 굽고 결과가 갈리는지 본다.
    const zen = (t: unknown): number => {
      const px = pixelsOf(t);
      const o = (0 * ENV_W + Math.floor(ENV_W / 2)) * 4;   // 행 0 = 천정
      return px[o] + px[o + 1] + px[o + 2];
    };
    const day = createWaterEnv(SRC as never);
    const night = createWaterEnv({
      ...SRC, hemi: { ...SRC.hemi, intensity: 0.08 },
    } as never);
    expect(zen(night.texture), '반구광 세기를 12배 낮췄는데 환경맵이 그대로다')
      .toBeLessThan(zen(day.texture) * 0.5);
  });

  it('★★ 재굽기 API 를 두지 않는다 — 있으면 다음 사람이 그것을 부르면 된다고 믿는다', async () => {
    // ── 검수관 반려 B (2026-08-20) ───────────────────────────────────────────
    // 첫 판본에는 `bake()` 가 있었고 시간대마다 불렸다. **화면에는 아무 일도 안 일어난다** —
    // three 는 equirect 환경맵을 PMREM 큐브맵으로 변환해 캐시하고 그 캐시는 `version` 이
    // 아니라 `pmremVersion` 을 본다. 그런데 그때 테스트는 «픽셀이 바뀌었는가» 까지만 봐서
    // 전부 초록이었다 — 판정/집행 경계가 **한 겹 더** 있었던 것이다.
    //
    // 고친 방식은 「재굽기를 제대로 하기」가 아니라 「재굽기를 걷기」다. 근거는
    // `features/water-env.ts` 헤더(WebGL 은 `needsPMREMUpdate` 로도 안 된다)이고,
    // 시간대는 `waterGloss().envIntensity` 가 세기로 따라간다. **그 결정을 여기서 못
    // 박는다** — API 가 되살아나면 이 검사가 깨지고, 그때 위 근거를 다시 읽게 된다.
    const { createWaterEnv } = await import('../frontend/js/world2/features/water-env.js');
    const env = createWaterEnv(SRC as never) as unknown as Record<string, unknown>;
    expect(env.bake, '`bake()` 가 되살아났다 — PMREM 캐시 한계를 다시 읽어라').toBeUndefined();
    expect(Object.keys(env).sort(), '공개 표면이 늘었다').toEqual(['dispose', 'texture']);
  });

  it('★ 밤 세기가 낮보다 확실히 낮다 — 텍스처가 낮에 고정되므로 **이것이 밤을 지킨다**', async () => {
    const { waterGloss } = await import('../frontend/js/world2/decide/water.js');
    const day = waterGloss('day').envIntensity;
    const night = waterGloss('night').envIntensity;
    expect(day, '낮 세기가 0 이면 환경맵이 아예 안 보인다').toBeGreaterThan(0);
    // 기준을 지어내지 않는다 — 밤을 이미 통과한 축(`sparkle`)의 비율을 그대로 요구한다.
    const sparkRatio = waterGloss('night').sparkle / waterGloss('day').sparkle;
    expect(night / day, '밤 환경맵이 `sparkle` 보다 덜 줄었다 — 물이 밤에 밝아진다')
      .toBeLessThanOrEqual(sparkRatio + 1e-9);
    expect(waterGloss('sunset').envIntensity, '노을이 낮보다 밝다').toBeLessThan(day);
  });

  it('등장방형 매핑·sRGB 로 건다 — 매핑이 틀리면 반사가 통째로 어긋난다', async () => {
    const THREE = await import('three/webgpu');
    const { createWaterEnv } = await import('../frontend/js/world2/features/water-env.js');
    const env = createWaterEnv(SRC as never);
    expect(env.texture.mapping).toBe(THREE.EquirectangularReflectionMapping);
    expect(env.texture.colorSpace).toBe(THREE.SRGBColorSpace);
    // ⚠ 이 매핑이 곧 «three 가 PMREM 으로 변환한다» 는 뜻이다(`WebGLCubeUVMaps.js:16`·
    // `PMREMNode`). 그래서 밉맵을 우리가 만들 이유가 없다 — three 가 자기 것을 만든다.
    expect(env.texture.generateMipmaps, '밉맵은 PMREM 이 만든다 — 우리가 만들면 낭비다')
      .toBe(false);
  });
});
