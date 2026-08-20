// world2/features/water-env.ts — 수면 환경맵의 **집행**. 판정(픽셀·태양 원반·왜 PMREM 이
// 아닌가)은 `decide/water-env.ts` **한 곳**이다 — 여기에 다시 적지 않는다.
//
// 이 파일이 `features/ocean.ts` 밖에 있는 것은 그 파일이 **줄 수 동결 대상**이기 때문만은
// 아니다(`scripts/smoke/check-filesize.mjs`). 환경맵은 «수면 재질에 거는 텍스처 하나» 라
// 소비자가 늘 수 있고(게임풍 물이 이미 그렇다), 그때 ocean 안의 지역 변수였다면 꺼낼
// 길이 없다.

import * as THREE from 'three/webgpu';
import { ENV_W, ENV_H, bakeEnvPixels, type EnvPalette } from '../decide/water-env.js';
import type { FeatureEnv } from './types.js';

type Rgb = readonly [number, number, number];

/**
 * 필요한 것은 씬의 **조명 상태 셋**뿐이다. 그런데 그것을 구조적 타입(`{ r, g, b }` 등)으로
 * 요구하면 타입 검사가 막힌다 — `three/webgpu` 는 `.d.ts` 가 없어 클래스 모양이 JS 에서
 * 추론되고, 그 추론 결과가 구조 타입에 할당되지 않는다(실측: *"Type 'Base' is missing …
 * color, intensity, position"*). 그래서 `FeatureEnv` 에서 **필드만 좁혀** 받는다 —
 * 같은 선언을 쓰므로 realm 이 갈릴 자리가 없고, 테스트도 이 셋만 채우면 된다.
 */
export type EnvSource = Pick<FeatureEnv, 'scene' | 'sun' | 'hemi'>;

export interface WaterEnv {
  /** 재질의 `envMap` 에 걸 텍스처. 세션 내내 **같은 객체**다(개수 불변식 `[7]`) */
  readonly texture: THREE.Texture;
  /** 씬의 현재 조명으로 픽셀을 다시 채운다. 시간대가 바뀔 때만 부른다 */
  bake(): void;
  dispose(): void;
}

function rgb(c: { r: number; g: number; b: number }): Rgb {
  return [c.r, c.g, c.b];
}

/**
 * `null` 을 돌려주면 «환경맵 없음»(= 2026-08-20 이전 상태)이다. 노브 `?wenv=0` 이 그 자리다.
 *
 * ⚠ 세기(`envMapIntensity`)는 **여기서 안 건다** — 재질을 아는 것은 호출부이고, 이 모듈이
 * 재질을 받으면 «누가 이 텍스처를 쓰는가» 가 두 곳으로 갈린다(게임풍 물은 자기 재질에
 * 따로 건다). 텍스처만 만들어 주고 배선은 쓰는 쪽이 한다.
 */
export function createWaterEnv(src: EnvSource): WaterEnv {
  const pixels = new Uint8Array(ENV_W * ENV_H * 4);
  const texture = new THREE.DataTexture(pixels, ENV_W, ENV_H, THREE.RGBAFormat);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  // 밉맵을 안 만든다 — 등장방형 밉은 극점에서 뭉개지고, 무엇보다 **매 `bake` 마다 다시
  // 만들어야** 해서 시간대 전환 비용이 픽셀 루프 하나로 끝나지 않게 된다.
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.name = 'water-env';

  const bake = (): void => {
    // 안개색이 곧 «먼 지평선» 이다. 없으면(하늘 기능이 아직 안 붙은 순간) 반구광
    // 하늘색으로 대신한다 — 조용한 no-op 대신 **덜 정확한 값이라도 그리는** 쪽을 고른다.
    const fog = src.scene.fog;
    const horizon = fog?.color ? rgb(fog.color) : rgb(src.hemi.color);
    const p: EnvPalette = {
      // 반구광 세기를 곱한다 — 색만 보면 밤에도 낮과 같은 파랑이고, 어두운 것은 세기다.
      zenith: rgb(src.hemi.color).map((v) => v * src.hemi.intensity) as unknown as Rgb,
      horizon,
      ground: rgb(src.hemi.groundColor).map((v) => v * src.hemi.intensity) as unknown as Rgb,
      sun: rgb(src.sun.color),
      sunI: src.sun.intensity,
      sunDir: src.sun.position,
    };
    bakeEnvPixels(pixels, p);
    texture.needsUpdate = true;
  };
  bake();

  return { texture, bake, dispose: () => texture.dispose() };
}
