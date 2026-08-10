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
  HORIZON_KNOB, HORIZON_MIN, HORIZON_MAX,
  horizonBandAngle, horizonAlphaProfile, horizonRadius, horizonFog, horizonStrength,
} from '../decide/horizon.js';
// 전 시간대를 순회해 "어디서도 안 켜지는가" 를 판정한다 — `createHorizonBand` 독블록.
import { TIMES } from '../decide/night.js';
import { readNumOpt } from '../url-knob.js';
import type { MutableColor } from './night-lights.js';

/**
 * `?hz=` 로 **지정된** 세기. 없으면 `null` — 그때는 시간대 기본값을 쓴다.
 *
 * `readNum` 이 아니라 `readNumOpt` 인 것이 요점이다. 기본값이 시간대마다 다르므로
 * (`decide/horizon.ts` 의 `horizonStrength`), fallback 을 강제하는 `readNum` 으로는
 * **"지정 안 됨" 과 "기본값과 같은 값을 지정함" 을 구별할 수 없다** — 밤 기본값을
 * 낮에도 걸어 시간대 분기가 통째로 죽는다. 수면 광택(`?wns=`)이 같은 함정을 이미
 * 한 번 밟았고, `url-knob.ts` 의 `readNumOpt` 독블록이 그 전말을 소유한다.
 */
export const HORIZON_OVERRIDE = readNumOpt(HORIZON_KNOB, HORIZON_MIN, HORIZON_MAX);

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

  constructor(scene: THREE.Scene, eyeHeight: number) {
    this.scene = scene;
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
    this.mesh.name = 'world5:horizon';
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
   *
   * ── 세기를 매 프레임 받는다 (생성자 고정이었다) ──────────────────────────
   * 세기가 **시간대마다 다르다**(`decide/horizon.ts` 의 `horizonStrength`). 생성자에
   * 굳혀 두면 神 모드 패널로 시간대를 바꿔도 밴드만 부팅 시각의 세기에 남고, 그
   * 어긋남은 화면에만 나타난다 — 가로등이 `emissiveIntensity` 를 매 프레임 맞추는
   * 것과 같은 이유다.
   *
   * @param strength 0..1. `1 − strength` 가 안개색에 곱해진다
   */
  update(eye: { x: number; y: number; z: number }, fog: MutableColor | null, strength: number): void {
    this.mesh.position.set(eye.x, eye.y, eye.z);
    if (!fog) return;
    const dim = 1 - Math.max(0, Math.min(1, strength));
    // `scene.fog.color` 와 `material.color` 는 둘 다 **선형** 채널이다. 같은 공간끼리
    // 곱하므로 여기에 색공간 변환이 끼지 않는다 — 끼면 이 태스크가 찾아낸 밤 안개
    // 하한과 똑같은 형태의 버그가 된다(`decide/horizon.ts` 머리말).
    this.mat.color.setRGB(fog.r * dim, fog.g * dim, fog.b * dim);
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.tex.dispose();
    this.mat.dispose();
  }
}

/**
 * 세기가 **어느 시간대에서도 0** 이면 `null` — 밴드를 만들지 않는다.
 *
 * ── *"세기 0 은 화면상 무해하다"* 가 거짓이었다 (검수관 지적 2026-08-07) ────
 * 이 자리에는 *"명시적 `?hz=0` 만 끈다. 세기 0 은 `dim = 1` 이라 안개색을 그대로
 * 덧그리므로 **화면상 무해하다**"* 라고 적혀 있었다. **그 문장이 거짓이다.**
 *
 * 이 재질은 `fog: false` 다 — three 의 씬 안개 시스템에 **연결돼 있지 않다.** 그래서
 * 밴드는 `scene.fog` 가 무엇이든(꺼져 있어도) **팔레트 안개색을 감쇠 없이 계속
 * 칠한다.** 주변이 안개 감쇠를 받는 동안에는 우연히 같은 색이라 안 보였을 뿐이고,
 * `?fogd=0` 으로 안개를 끄면 **밴드만 안개색으로 남아 전에 없던 띠가 된다.**
 * "무해" 는 안개가 켜져 있다는 전제 위에서만 참이었고, 그 전제는 이제 노브로 깨진다.
 *
 * ── 개수 불변식은 그대로 지킨다 ────────────────────────────────────────────
 * 옛 주석이 든 우려 — *"만들고 안 만들고를 시간대에 걸면 세션 중 메시가 생겼다
 * 사라졌다 한다"* — 는 **여전히 유효하고, 여기서 그것을 하지 않는다.** 판정을 *지금
 * 시간대* 가 아니라 **전 시간대의 최대 세기**로 하기 때문이다. 그 값은 부팅 시
 * 상수이므로 세션 중 바뀌지 않는다 — 시간대를 아무리 돌려도 메시 존재 여부는 그대로다.
 *
 * 되살리려면 `?hz=0.3` 처럼 **0 이 아닌 값**을 주면 된다(override 가 이기므로 전
 * 시간대에서 생성된다). 감독이 밴드를 다시 쓰기로 하면 시간대 상수를 올리면 된다.
 */
export function createHorizonBand(
  scene: THREE.Scene, eyeHeight: number, override = HORIZON_OVERRIDE,
): HorizonBand | null {
  return bandExists(override) ? new HorizonBand(scene, eyeHeight) : null;
}

/**
 * 밴드 메시를 만들 것인가. **판정만 하는 순수 함수**라 테스트가 값으로 본다.
 *
 * `createHorizonBand` 안에 인라인으로 두면 이 판정을 검증하려고 `HorizonBand` 를 실제로
 * 생성해야 하고, 그 생성자는 `document.createElement('canvas')` 를 거쳐 node 에서
 * 막힌다 — 즉 판정이 **테스트할 수 없는 자리**에 갇힌다. 그래서 뺀다.
 *
 * @param override `?hz=` 지정값. `null` 이면 미지정
 */
export function bandExists(override: number | null): boolean {
  // 노브가 지정되면 그것이 전 시간대를 덮으므로 시간대를 볼 필요가 없다.
  if (override !== null) return override > 0;
  // 미지정이면 **전 시간대 중 하나라도** 켜지는지 본다. 부팅 시 상수다.
  return TIMES.some((t) => horizonStrength(t) > 0);
}

/** 지금 프레임의 세기. 노브가 지정됐으면 그것이, 아니면 시간대 기본값이 이긴다 */
export function bandStrength(time: string): number {
  return horizonStrength(time, HORIZON_OVERRIDE);
}
