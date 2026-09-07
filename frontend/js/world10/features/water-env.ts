// world10/features/water-env.ts — 수면 환경맵의 **집행**. 판정(픽셀·태양 원반·왜 PMREM 이
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
  dispose(): void;
}

function rgb(c: { r: number; g: number; b: number }): Rgb {
  return [c.r, c.g, c.b];
}

/**
 * ⚠ 세기(`envMapIntensity`)는 **여기서 안 건다** — 재질을 아는 것은 호출부이고, 이 모듈이
 * 재질을 받으면 «누가 이 텍스처를 쓰는가» 가 두 곳으로 갈린다(게임풍 물은 자기 재질에
 * 따로 건다). 텍스처만 만들어 주고 배선은 쓰는 쪽이 한다.
 *
 * ── ⚠ **한 번만 굽는다** (검수관 반려 B, 2026-08-20) ────────────────────────
 * 첫 판본은 시간대가 바뀔 때마다 같은 버퍼를 다시 채우고 `needsUpdate` 를 올렸다.
 * **화면에는 아무 일도 일어나지 않는다.** three 는 equirect 환경맵을 PMREM 큐브맵으로
 * 변환해 캐시하고, 그 캐시는 `version`(= `needsUpdate`)이 아니라 `pmremVersion` 을 본다
 * (`nodes/pmrem/PMREMNode.js:136`). 그러니 픽셀만 갈아 봐야 반영되지 않는다 —
 * **커밋 제목이 「시간대 재굽기」였는데 그 재굽기가 렌더에 도달하지 않았다.**
 *
 * `needsPMREMUpdate` 를 올리면 WebGPU 는 재변환되지만 **WebGL 은 그것으로도 안 된다** —
 * 재변환 분기가 `texture.isRenderTargetTexture` 를 요구하는데(`WebGLCubeUVMaps.js:27`)
 * `DataTexture` 는 false 라 캐시된 것을 영원히 돌려준다(이 줄은 검수관도 못 본 축이다).
 *
 * 그래서 **재굽기를 아예 걷었다.** 색조·태양 위치는 부팅 시각에 고정되고, 시간대는
 * `waterGloss(time).envIntensity` 가 **세기로만** 따라간다 — 그쪽 주석이 그 한계와
 * 「그럼에도 밤이 지켜지는 이유」의 SSOT 다. 백로그 `G-STYL28`.
 */
export function createWaterEnv(src: EnvSource): WaterEnv {
  const pixels = new Uint8Array(ENV_W * ENV_H * 4);
  const texture = new THREE.DataTexture(pixels, ENV_W, ENV_H, THREE.RGBAFormat);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  // 밉맵을 안 만든다 — 등장방형 밉은 극점에서 뭉개지고, three 가 어차피 이 텍스처를
  // PMREM 큐브맵으로 변환하면서 자기 밉 체인을 따로 만든다(위 헤더).
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.name = 'water-env';

  {
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
  }

  return { texture, dispose: () => texture.dispose() };
}
