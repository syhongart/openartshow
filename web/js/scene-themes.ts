// @ts-nocheck — 순수 이동(C-3 scene 분해), strict 타입은 후속 작업.
// scene-themes.js — 테마 프리셋(THEMES)·resolveTheme + 실시간 낮밤 순환(cycle)
//   순수 계산: getLocalPhase·cycleFrameAt·buildCycleTheme·applyCycleFrame 등.
//   leaf(타 scene 모듈 미참조). scene.js에서 분해(C-3 S2).
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// 테마 시스템 — 전시 분위기 프리셋 (작가가 갤러리 JSON에서 선택)
// daylight(기본) / sunset(황혼) / night(야간 개장)
// Three.js r160 물리 광량 단위: PointLight 20~60, SpotLight 80~250, Directional 0.2~3.5
// ---------------------------------------------------------------------------
export const THEMES = {
  daylight: {
    sky: {
      stops: [
        [0.0, '#4a86c8'],
        [0.45, '#7fb2e0'],
        [0.75, '#c8dff0'],
        [1.0, '#e8f1f6'],
      ],
      cloudColor: '255,255,255',
      cloudAlpha: [0.25, 0.55],
      cloudCount: 26,
      stars: 0,
    },
    sun: { pos: [55, 48, 42], color: 0xfff0da, intensity: 3.7 }, // 그림자 대비↑
    fill: { pos: [-20, 16, -14], color: 0xdde8f8, intensity: 0.5 },
    hemi: { sky: 0xbfd9ee, ground: 0x6f8a52, intensity: 0.63 },
    ambient: { color: 0xffffff, intensity: 0.19 },
    fog: { color: 0xdfeaf2, near: 60, far: 420 },
    background: 0xdfeaf2,
    downlight: { color: 0xfff2dd, emissive: 0xffefc8, intensity: 22 },
    sea: { color: 0x3f7396, roughness: 0.12, metalness: 0.25 },
    grassTint: 0xffffff,
    treeUplights: false,
    shadowCamera: { left: -30, right: 45, top: 50, bottom: -28, near: 1, far: 180 },
  },
  sunset: {
    sky: {
      // 천정의 저문 인디고 → 수평선의 뜨거운 주황·골드 (황혼 그라디언트)
      stops: [
        [0.0, '#2c2f5e'],
        [0.32, '#6a4f80'],
        [0.58, '#c96a5e'],
        [0.8, '#f0954f'],
        [1.0, '#ffd9a2'],
      ],
      cloudColor: '255,200,145', // 노을빛이 밴 구름
      cloudAlpha: [0.28, 0.6],
      cloudCount: 24,
      stars: 0,
    },
    // 동쪽 바다 위, 낮은 고도의 주황 태양
    sun: { pos: [140, 14, 30], color: 0xff9552, intensity: 3.0 }, // 그림자 대비↑
    fill: { pos: [-30, 22, -20], color: 0x8a6fb0, intensity: 0.35 },
    hemi: { sky: 0xffb37a, ground: 0x6b4a52, intensity: 0.47 },
    ambient: { color: 0xffcfa0, intensity: 0.19 },
    fog: { color: 0xcf7f62, near: 55, far: 400 },
    background: 0xcf7f62,
    downlight: { color: 0xffd8ae, emissive: 0xffd8ae, intensity: 27 }, // 실내 웜톤 보강
    // 낮은 태양이 만드는 강한 반사 하이라이트 — 낮은 roughness/높은 metalness
    sea: { color: 0x7a5a78, roughness: 0.06, metalness: 0.45 },
    grassTint: 0xe6b98f,
    treeUplights: false,
    shadowCamera: { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 320 },
  },
  night: {
    sky: {
      // 짙은 남색 하늘
      stops: [
        [0.0, '#060814'],
        [0.4, '#0d1330'],
        [0.7, '#161f42'],
        [1.0, '#232c4d'],
      ],
      cloudColor: '150,170,220', // 달빛이 스민 옅은 청회색 구름
      cloudAlpha: [0.05, 0.14],
      cloudCount: 16,
      stars: 760, // 700개 이상, 크기/밝기 랜덤 (makeRand 시드 고정)
    },
    // 낮은 달 — 차갑고 희미한 방향광
    sun: { pos: [-60, 40, -30], color: 0xaec6ff, intensity: 0.4 },
    fill: { pos: [40, 20, 30], color: 0x2a3a66, intensity: 0.12 },
    hemi: { sky: 0x1a2540, ground: 0x0a0c14, intensity: 0.19 },
    ambient: { color: 0x33456e, intensity: 0.1 },
    fog: { color: 0x0a0f22, near: 45, far: 320 },
    background: 0x0a0f22,
    // 다운라이트·작품 스포트라이트가 주인공 — 실내 조도 보강
    downlight: { color: 0xfff0d8, emissive: 0xfff0d8, intensity: 32 },
    sea: { color: 0x0b1830, roughness: 0.2, metalness: 0.25 },
    grassTint: 0x28304a, // 바깥 잔디는 어둡게
    treeUplights: true,  // 중정 나무 아래 업라이트 2개 (웜 스팟)
    shadowCamera: { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 220 },
  },
};

export function resolveTheme(themeName) {
  return THEMES[themeName] || THEMES.daylight;
}

// ---------------------------------------------------------------------------
// 'cycle' 테마 — 실시간 낮밤 순환 (담당 A)
// THEMES.daylight/sunset/night 3종을 키프레임으로 재사용해 매 프레임 보간한다.
// 무거운 리소스(캔버스 텍스처)는 createMuseum 시점에 딱 한 번만 만들고,
// sceneTick에서는 색/광량/투명도 등 가벼운 숫자만 갱신한다 (성능 우선).
// ---------------------------------------------------------------------------
export const CYCLE_DAY_SECONDS = 720;   // 하루 길이 (12분)
const CYCLE_ARC_RADIUS = 150;    // 태양이 그리는 동-서 원호 반지름

// 그림자 카메라 프러스텀: 세 정적 테마의 프러스텀을 모두 포함하는 합집합
// (태양이 움직이는 동안 프레임마다 재계산하지 않고 한 번만 넉넉히 잡는다)
const CYCLE_SHADOW_CAMERA = {
  left: Math.min(THEMES.daylight.shadowCamera.left, THEMES.sunset.shadowCamera.left, THEMES.night.shadowCamera.left),
  right: Math.max(THEMES.daylight.shadowCamera.right, THEMES.sunset.shadowCamera.right, THEMES.night.shadowCamera.right),
  top: Math.max(THEMES.daylight.shadowCamera.top, THEMES.sunset.shadowCamera.top, THEMES.night.shadowCamera.top),
  bottom: Math.min(THEMES.daylight.shadowCamera.bottom, THEMES.sunset.shadowCamera.bottom, THEMES.night.shadowCamera.bottom),
  near: 1,
  far: Math.max(THEMES.daylight.shadowCamera.far, THEMES.sunset.shadowCamera.far, THEMES.night.shadowCamera.far),
};

const lerpN = (a, b, t) => a + (b - a) * t;

// 현지 시각(시+분)을 0..1 위상으로 (0=자정, 0.5=정오)
export function getLocalPhase() {
  const now = new Date();
  return (now.getHours() * 60 + now.getMinutes()) / 1440;
}

// 위상 → 두 인접 키프레임 + 그 사이 보간 비율
// elev > 0.3 → daylight / 0.3~0.02 → daylight↔sunset / 0.02~-0.12 → sunset↔night / 그 이하 → night
function cycleSegment(elev) {
  if (elev > 0.3) return { from: 'daylight', to: 'daylight', t: 0 };
  if (elev > 0.02) return { from: 'daylight', to: 'sunset', t: (0.3 - elev) / (0.3 - 0.02) };
  if (elev > -0.12) return { from: 'sunset', to: 'night', t: (0.02 - elev) / (0.02 - -0.12) };
  return { from: 'night', to: 'night', t: 0 };
}

// 주어진 위상의 전체 조명/색 스냅샷 계산 (초기 건축 + 매 프레임 갱신이 공유하는 단일 소스)
export function cycleFrameAt(phase) {
  const elev = Math.sin((phase - 0.25) * Math.PI * 2);
  const seg = cycleSegment(elev);
  const { from, to, t } = seg;
  const F = THEMES[from];
  const T = THEMES[to];

  // 태양 — daylight/sunset 구간에서만 밝기를 가지며, night로 넘어갈수록 사그라든다
  let sunColor, sunIntensity;
  if (to === 'night') {
    // sunset → night: 색은 노을에 고정한 채 밝기만 0으로 페이드
    sunColor = new THREE.Color(F.sun.color);
    sunIntensity = F.sun.intensity * (1 - t);
  } else if (from === 'night') {
    sunColor = new THREE.Color(THEMES.sunset.sun.color);
    sunIntensity = 0;
  } else {
    sunColor = new THREE.Color(F.sun.color).lerp(new THREE.Color(T.sun.color), t);
    sunIntensity = lerpN(F.sun.intensity, T.sun.intensity, t);
  }

  // 달 — 고정 위치/색(night 파라미터), night 가중치에 비례해 밝기만 블렌드 인
  let moonIntensity = 0;
  if (from === 'sunset' && to === 'night') moonIntensity = THEMES.night.sun.intensity * t;
  else if (from === 'night' && to === 'night') moonIntensity = THEMES.night.sun.intensity;

  // 태양 위치 — 동→서 원호 (위상 기반 방위각, 반지름 ~150, 고도는 elev 비례)
  const arcAngle = (phase - 0.25) * Math.PI * 2;
  const sunPos = [Math.cos(arcAngle) * CYCLE_ARC_RADIUS, elev * CYCLE_ARC_RADIUS, 0];

  const hemiSky = new THREE.Color(F.hemi.sky).lerp(new THREE.Color(T.hemi.sky), t);
  const hemiGround = new THREE.Color(F.hemi.ground).lerp(new THREE.Color(T.hemi.ground), t);
  const hemiIntensity = lerpN(F.hemi.intensity, T.hemi.intensity, t);

  const ambientColor = new THREE.Color(F.ambient.color).lerp(new THREE.Color(T.ambient.color), t);
  const ambientIntensity = lerpN(F.ambient.intensity, T.ambient.intensity, t);

  const fogColor = new THREE.Color(F.fog.color).lerp(new THREE.Color(T.fog.color), t);
  const fogNear = lerpN(F.fog.near, T.fog.near, t);
  const fogFar = lerpN(F.fog.far, T.fog.far, t);

  const bgColor = new THREE.Color(F.background).lerp(new THREE.Color(T.background), t);

  const downlightIntensity = lerpN(F.downlight.intensity, T.downlight.intensity, t);

  const seaColor = new THREE.Color(F.sea.color).lerp(new THREE.Color(T.sea.color), t);

  // 하늘 돔 3장의 오퍼시티 가중치 (텍스처는 재생성하지 않고 opacity만 블렌드)
  let domeDay = 0, domeSunset = 0, domeNight = 0;
  if (from === 'daylight' && to === 'daylight') domeDay = 1;
  else if (from === 'daylight' && to === 'sunset') { domeDay = 1 - t; domeSunset = t; }
  else if (from === 'sunset' && to === 'night') { domeSunset = 1 - t; domeNight = t; }
  else domeNight = 1;

  return {
    elev, seg,
    sunColor, sunIntensity, sunPos,
    moonIntensity,
    hemiSky, hemiGround, hemiIntensity,
    ambientColor, ambientIntensity,
    fogColor, fogNear, fogFar,
    bgColor,
    downlightIntensity,
    seaColor,
    domeDay, domeSunset, domeNight,
    treeUplightIntensity: 150 * domeNight, // night 가중치에 비례해 중정 업라이트 페이드 인
  };
}

// createMuseum(scene, 'cycle') 건축 시 필요한 '정적' 테마 형태로 초기 프레임을 감싼다.
// (grassTint/fill/downlight 색/sea 재질값 등 프레임마다 갱신 대상이 아닌 값은 daylight를 기본으로 삼는다)
export function buildCycleTheme(phase) {
  const frame = cycleFrameAt(phase);
  const { seg } = frame;
  const grassTint = new THREE.Color(THEMES[seg.from].grassTint)
    .lerp(new THREE.Color(THEMES[seg.to].grassTint), seg.t)
    .getHex();

  return {
    sun: { pos: frame.sunPos, color: frame.sunColor.getHex(), intensity: frame.sunIntensity },
    fill: THEMES.daylight.fill,
    hemi: { sky: frame.hemiSky.getHex(), ground: frame.hemiGround.getHex(), intensity: frame.hemiIntensity },
    ambient: { color: frame.ambientColor.getHex(), intensity: frame.ambientIntensity },
    fog: { color: frame.fogColor.getHex(), near: frame.fogNear, far: frame.fogFar },
    background: frame.bgColor.getHex(),
    downlight: {
      color: THEMES.daylight.downlight.color,
      emissive: THEMES.daylight.downlight.emissive,
      intensity: frame.downlightIntensity,
    },
    sea: { color: frame.seaColor.getHex(), roughness: THEMES.daylight.sea.roughness, metalness: THEMES.daylight.sea.metalness },
    grassTint,
    treeUplights: true, // cycle에서는 항상 업라이트 픽스처를 만들고 밝기만 동적으로 페이드
    shadowCamera: CYCLE_SHADOW_CAMERA,
  };
}

// 매 프레임: cycleFrameAt() 스냅샷을 실제 조명/재질/돔에 반영
export function applyCycleFrame(cs, frame) {
  cs.sunLight.color.copy(frame.sunColor);
  cs.sunLight.intensity = frame.sunIntensity;
  cs.sunLight.position.set(frame.sunPos[0], frame.sunPos[1], frame.sunPos[2]);
  // 밤에는 광량 0인 태양의 4096² 섀도맵 렌더를 건너뛴다 (성능)
  cs.sunLight.castShadow = frame.sunIntensity > 0.01;

  cs.moonLight.intensity = frame.moonIntensity;

  cs.hemiLight.color.copy(frame.hemiSky);
  cs.hemiLight.groundColor.copy(frame.hemiGround);
  cs.hemiLight.intensity = frame.hemiIntensity;

  cs.ambientLight.color.copy(frame.ambientColor);
  cs.ambientLight.intensity = frame.ambientIntensity;

  if (cs.scene.fog) {
    // 포테이토 모드(소프트 렌더)는 fog를 제거하므로 널 가드 필수 — 없으면
    // 매 프레임 예외로 cycle 전체(태양 이동·FPS 집계)가 조용히 죽는다 (실측)
    cs.scene.fog.color.copy(frame.fogColor);
    cs.scene.fog.near = frame.fogNear;
    cs.scene.fog.far = frame.fogFar;
  }
  cs.scene.background.copy(frame.bgColor);

  if (cs.downlights) {
    if (cs.downlights.warm) cs.downlights.warm.intensity = frame.downlightIntensity * 0.022;
    for (const light of cs.downlights.lights) light.intensity = frame.downlightIntensity;
    cs.downlights.bulbMat.emissiveIntensity = 2.5 * (frame.downlightIntensity / 22);
  }

  if (cs.seaMat) cs.seaMat.color.copy(frame.seaColor);

  for (const spot of cs.treeUplights) spot.intensity = frame.treeUplightIntensity;

  if (cs.skyDomes) {
    cs.skyDomes.daylight.material.opacity = frame.domeDay;
    cs.skyDomes.sunset.material.opacity = frame.domeSunset;
    cs.skyDomes.night.material.opacity = frame.domeNight;
  }
}
