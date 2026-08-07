// world2/systems/horizon.ts — 수평선 밴드의 **집행**. 판정은 `decide/horizon.ts` 가 한다.
//
// 왜 계산을 저쪽에 두는가: 여기 있는 것은 전부 three 에 닿아 있어 테스트가 브라우저를
// 필요로 한다. 각도·알파 프로파일을 저쪽 순수 함수로 빼면 테스트가 **실제로 도는 함수**를
// 부를 수 있고, 여기서 다시 계산하지 않으므로 값 미러링도 안 생긴다
// (`systems/night-lights.ts` 가 같은 이유로 갈라져 있다).
//
// ── 두 백엔드에서 같은 수단만 쓴다 ──────────────────────────────────────────
// `ShaderMaterial`(GLSL)은 `three.webgpu` 빌드에 렌더 경로가 아예 없다 — 감독 실기기가
// WebGPU 라 헤드리스 통과가 근거가 되지 못한다. 여기서 쓰는 것은 캔버스 텍스처 +
// `MeshBasicMaterial` 뿐이고, 둘 다 `sky.js` 가 이미 두 백엔드에서 쓰고 있는 수단이다.
//
// ── 개수 불변식 ──────────────────────────────────────────────────────────────
// 메시 1 · 재질 1 · 지오 1 · 텍스처 1 을 부팅 때 만들고 세션 내내 그대로 둔다. 드로우콜
// **+1** 고정이고 그림자 패스는 없다. 매 프레임 바뀌는 것은 `position` 과 `color`
// uniform 뿐 — `color` 가 파이프라인 캐시키 축이 아니라는 것은 실측돼 있다
// (게시판 2026-08-05 · `[7]` 이 회전12·주행6·복귀6 내내 상수).

import * as THREE from 'three/webgpu';
import {
  HORIZON_KNOB, HORIZON_MIN, HORIZON_MAX, HORIZON_DEFAULT,
  horizonBandAngle, horizonAlphaProfile, horizonRadius, horizonFog,
} from '../decide/horizon.js';
import { readNum } from '../url-knob.js';
import type { MutableColor } from './night-lights.js';

/** 수평선 대비 세기(`?hz=`). 0 이면 밴드를 **아예 만들지 않는다** — 지금 화면 그대로다 */
export const HORIZON_STRENGTH = readNum(HORIZON_KNOB, HORIZON_DEFAULT, HORIZON_MIN, HORIZON_MAX);

/**
 * 알파 프로파일 텍셀 수. 밴드가 화면에서 차지하는 세로는 3° 남짓(실측 27px)이므로
 * 64 면 텍셀 하나가 화면 0.4px 이하다 — 계조가 보일 여지가 없다.
 */
const PROFILE_N = 64;
/** 텍스처 가로. 가로 방향으로는 값이 상수라 최소면 되는데, 1 은 밉맵 생성이 백엔드마다
 *  갈리는 자리라 2의 거듭제곱 중 가장 작은 안전값을 쓴다 */
const PROFILE_W = 4;
/**
 * 원둘레 분할 수.
 *
 * 밴드 **위쪽** 가장자리는 다각형이어도 전부 같은 높이(수평면의 원)라 각이 안 보인다 —
 * 수평선이 삐뚤어질 걱정은 구조적으로 없다. 이 값이 정하는 것은 아래쪽 가장자리와 색
 * 보간뿐이라 크게 쓸 이유가 없다.
 */
const RING_SEG = 64;
/** 세로 분할. UV·각도가 둘 다 선형이라 1 이면 충분하지만, 원뿔 근사를 한 단계 줄여 둔다 */
const BAND_SEG = 2;

/**
 * 알파 프로파일을 텍스처로 굽는다. RGB 는 흰색 고정 — **색은 `material.color` 가 낸다.**
 *
 * 색을 텍스처에 굽지 않는 이유: 안개색이 시간대·날씨마다 크로스페이드로 바뀐다. 구우면
 * 매 프레임 다시 구워야 하고, `color` uniform 은 공짜다.
 *
 * `createImageData` 로 픽셀을 직접 쓴다. `fillRect` + `rgba()` 로 그리면 캔버스가
 * premultiply 를 거쳐 알파가 낮은 자리의 RGB 가 흔들린다 — `features/ocean.ts` 의
 * 텍스처들이 같은 이유로 전부 직접 쓰기다.
 */
// 반환 타입을 일부러 적지 않는다. `three/webgpu` 는 `CanvasTexture` 를 타입으로
// 재수출하지 않아(TS2694) 이름으로 적을 방법이 없고, 추론이 정확히 같은 타입을 준다 —
// `features/ocean.ts` 의 텍스처 팩토리들이 전부 같은 이유로 타입을 생략한다.
function bakeProfile(alphas: number[]) {
  const cv = document.createElement('canvas');
  cv.width = PROFILE_W;
  cv.height = alphas.length;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(PROFILE_W, alphas.length);
  for (let y = 0; y < alphas.length; y++) {
    const a = Math.round(Math.min(1, Math.max(0, alphas[y])) * 255);
    for (let x = 0; x < PROFILE_W; x++) {
      const i = (y * PROFILE_W + x) * 4;
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  // 흰색만 담긴 텍스처지만 색공간을 명시한다 — 안 주면 기본이 바뀌는 날 조용히 값이
  // 달라지고, 그것이 이 저장소가 하늘 캔버스에서 이미 한 번 겪은 사고다.
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 수평선 밴드.
 *
 * `SkySystem` 이 소유한다 — 안개색을 매 프레임 읽어야 하고, 그 색은 `sky.js` 가
 * `SkySystem.update` 안에서 갱신하기 때문이다. 밖에서 만들면 한 프레임 낡은 색을 쓴다.
 */
export class HorizonBand {
  private readonly mesh: THREE.Mesh;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly tex: ReturnType<typeof bakeProfile>;
  private readonly scene: THREE.Scene;
  /** 밝기 배수 = `1 − 세기`. 매 프레임 곱하지 않고 안개색에서 **새로 만든다**(멱등) */
  private readonly dim: number;

  constructor(scene: THREE.Scene, eyeHeight: number, strength: number) {
    this.scene = scene;
    this.dim = 1 - strength;
    const { near, far } = horizonFog();
    const band = horizonBandAngle(eyeHeight, near);
    this.tex = bakeProfile(horizonAlphaProfile(PROFILE_N, eyeHeight, near, far));
    // 적도(θ=π/2)에서 시작해 아래로 `band` 만큼. `SphereGeometry` 는 이 구간을 UV v
    // 0..1 로 재매핑하므로 프로파일 배열이 그대로 각도에 대응한다(위 = uv.y 1 = 배열 0).
    const geo = new THREE.SphereGeometry(
      horizonRadius(near), RING_SEG, BAND_SEG, 0, Math.PI * 2, Math.PI / 2, band,
    );
    this.mat = new THREE.MeshBasicMaterial({
      map: this.tex,
      // 안에서 본다. 밴드는 카메라를 감싸는 구면의 일부다.
      side: THREE.BackSide,
      transparent: true,
      // 깊이를 쓰면 뒤에 오는 반투명(물 윤슬·비)이 밴드에 막힌다. 밴드는 색만 얹는다.
      depthWrite: false,
      // ⚠ `depthTest` 는 **끄지 않는다.** 반경 유도(`horizonRadius` 독블록)가 전부
      // 이 전제 위에 서 있다 — 끄면 밴드가 건물·나무를 뚫는다.
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.name = 'world2:horizon';
    // 밴드는 늘 카메라를 감싸고 있어 컬링 판정이 의미가 없다(구면의 일부라 바운딩
    // 구가 카메라를 포함한다). 판정을 건너뛰는 편이 싸고, 돔도 같은 이유로 끈다.
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  /**
   * 카메라 눈 위치로 옮기고 색을 안개에서 다시 만든다.
   *
   * ── 왜 눈높이인가 ─────────────────────────────────────────────────────────
   * 돔은 `y=0` 에 두어도 된다(반경 520m 대비 눈높이 1.7m 는 0.19°). 밴드는 반경이
   * 51.2m 라 같은 오프셋이 **1.9°** 이고, 그것은 밴드 폭(3°)의 63% 다. 여기서 y 를
   * 대충 두면 수평선이 실제 수평선과 다른 자리에 그려진다.
   *
   * ── 왜 대입인가 ──────────────────────────────────────────────────────────
   * 매 프레임 도는 함수에서 배수를 **누적**하면 발산한다. `liftNightLights` 주석이
   * 경고하는 그 함정이고, 여기서는 원본(안개색)에서 매번 새로 만들어 멱등을 지킨다.
   */
  update(eye: { x: number; y: number; z: number }, fog: MutableColor | null): void {
    this.mesh.position.set(eye.x, eye.y, eye.z);
    if (!fog) return;
    // `scene.fog.color` 와 `material.color` 는 둘 다 **선형** 채널이다. 같은 공간끼리
    // 곱하므로 여기에 색공간 변환이 끼지 않는다 — 끼면 이 태스크가 찾아낸 밤 안개
    // 하한과 똑같은 형태의 버그가 된다(`decide/horizon.ts` 머리말).
    this.mat.color.setRGB(fog.r * this.dim, fog.g * this.dim, fog.b * this.dim);
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.tex.dispose();
    this.mat.dispose();
  }
}

/** `?hz=0` 이면 `null` — 밴드를 만들지 않는다(대조군이 곧 지금 화면이다) */
export function createHorizonBand(
  scene: THREE.Scene, eyeHeight: number, strength = HORIZON_STRENGTH,
): HorizonBand | null {
  return strength > 0 ? new HorizonBand(scene, eyeHeight, strength) : null;
}
