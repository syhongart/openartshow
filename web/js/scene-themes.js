import * as THREE from "three";
const THEMES = {
  daylight: {
    sky: {
      stops: [
        [0, "#4a86c8"],
        [0.45, "#7fb2e0"],
        [0.75, "#c8dff0"],
        [1, "#e8f1f6"]
      ],
      cloudColor: "255,255,255",
      cloudAlpha: [0.25, 0.55],
      cloudCount: 26,
      stars: 0
    },
    sun: { pos: [55, 48, 42], color: 16773338, intensity: 3.7 },
    // 그림자 대비↑
    fill: { pos: [-20, 16, -14], color: 14543096, intensity: 0.5 },
    hemi: { sky: 12573166, ground: 7309906, intensity: 0.63 },
    ambient: { color: 16777215, intensity: 0.19 },
    fog: { color: 14674674, near: 60, far: 420 },
    background: 14674674,
    downlight: { color: 16773853, emissive: 16773064, intensity: 22 },
    sea: { color: 4158358, roughness: 0.12, metalness: 0.25 },
    grassTint: 16777215,
    treeUplights: false,
    shadowCamera: { left: -30, right: 45, top: 50, bottom: -28, near: 1, far: 180 }
  },
  sunset: {
    sky: {
      // 천정의 저문 인디고 → 수평선의 뜨거운 주황·골드 (황혼 그라디언트)
      stops: [
        [0, "#2c2f5e"],
        [0.32, "#6a4f80"],
        [0.58, "#c96a5e"],
        [0.8, "#f0954f"],
        [1, "#ffd9a2"]
      ],
      cloudColor: "255,200,145",
      // 노을빛이 밴 구름
      cloudAlpha: [0.28, 0.6],
      cloudCount: 24,
      stars: 0
    },
    // 동쪽 바다 위, 낮은 고도의 주황 태양
    sun: { pos: [140, 14, 30], color: 16749906, intensity: 3 },
    // 그림자 대비↑
    fill: { pos: [-30, 22, -20], color: 9072560, intensity: 0.35 },
    hemi: { sky: 16757626, ground: 7031378, intensity: 0.47 },
    ambient: { color: 16764832, intensity: 0.19 },
    fog: { color: 13598562, near: 55, far: 400 },
    background: 13598562,
    downlight: { color: 16767150, emissive: 16767150, intensity: 27 },
    // 실내 웜톤 보강
    // 낮은 태양이 만드는 강한 반사 하이라이트 — 낮은 roughness/높은 metalness
    sea: { color: 8018552, roughness: 0.06, metalness: 0.45 },
    grassTint: 15120783,
    treeUplights: false,
    shadowCamera: { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 320 }
  },
  night: {
    sky: {
      // 짙은 남색 하늘
      stops: [
        [0, "#060814"],
        [0.4, "#0d1330"],
        [0.7, "#161f42"],
        [1, "#232c4d"]
      ],
      cloudColor: "150,170,220",
      // 달빛이 스민 옅은 청회색 구름
      cloudAlpha: [0.05, 0.14],
      cloudCount: 16,
      stars: 760
      // 700개 이상, 크기/밝기 랜덤 (makeRand 시드 고정)
    },
    // 낮은 달 — 차갑고 희미한 방향광
    sun: { pos: [-60, 40, -30], color: 11454207, intensity: 0.4 },
    fill: { pos: [40, 20, 30], color: 2767462, intensity: 0.12 },
    hemi: { sky: 1713472, ground: 658452, intensity: 0.19 },
    ambient: { color: 3360110, intensity: 0.1 },
    fog: { color: 659234, near: 45, far: 320 },
    background: 659234,
    // 다운라이트·작품 스포트라이트가 주인공 — 실내 조도 보강
    downlight: { color: 16773336, emissive: 16773336, intensity: 32 },
    sea: { color: 727088, roughness: 0.2, metalness: 0.25 },
    grassTint: 2633802,
    // 바깥 잔디는 어둡게
    treeUplights: true,
    // 중정 나무 아래 업라이트 2개 (웜 스팟)
    shadowCamera: { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 220 }
  }
};
function resolveTheme(themeName) {
  return THEMES[themeName] || THEMES.daylight;
}
const CYCLE_DAY_SECONDS = 720;
const CYCLE_ARC_RADIUS = 150;
const CYCLE_SHADOW_CAMERA = {
  left: Math.min(THEMES.daylight.shadowCamera.left, THEMES.sunset.shadowCamera.left, THEMES.night.shadowCamera.left),
  right: Math.max(THEMES.daylight.shadowCamera.right, THEMES.sunset.shadowCamera.right, THEMES.night.shadowCamera.right),
  top: Math.max(THEMES.daylight.shadowCamera.top, THEMES.sunset.shadowCamera.top, THEMES.night.shadowCamera.top),
  bottom: Math.min(THEMES.daylight.shadowCamera.bottom, THEMES.sunset.shadowCamera.bottom, THEMES.night.shadowCamera.bottom),
  near: 1,
  far: Math.max(THEMES.daylight.shadowCamera.far, THEMES.sunset.shadowCamera.far, THEMES.night.shadowCamera.far)
};
const lerpN = (a, b, t) => a + (b - a) * t;
function getLocalPhase() {
  const now = /* @__PURE__ */ new Date();
  return (now.getHours() * 60 + now.getMinutes()) / 1440;
}
function cycleSegment(elev) {
  if (elev > 0.3) return { from: "daylight", to: "daylight", t: 0 };
  if (elev > 0.02) return { from: "daylight", to: "sunset", t: (0.3 - elev) / (0.3 - 0.02) };
  if (elev > -0.12) return { from: "sunset", to: "night", t: (0.02 - elev) / (0.02 - -0.12) };
  return { from: "night", to: "night", t: 0 };
}
function cycleFrameAt(phase) {
  const elev = Math.sin((phase - 0.25) * Math.PI * 2);
  const seg = cycleSegment(elev);
  const { from, to, t } = seg;
  const F = THEMES[from];
  const T = THEMES[to];
  let sunColor, sunIntensity;
  if (to === "night") {
    sunColor = new THREE.Color(F.sun.color);
    sunIntensity = F.sun.intensity * (1 - t);
  } else if (from === "night") {
    sunColor = new THREE.Color(THEMES.sunset.sun.color);
    sunIntensity = 0;
  } else {
    sunColor = new THREE.Color(F.sun.color).lerp(new THREE.Color(T.sun.color), t);
    sunIntensity = lerpN(F.sun.intensity, T.sun.intensity, t);
  }
  let moonIntensity = 0;
  if (from === "sunset" && to === "night") moonIntensity = THEMES.night.sun.intensity * t;
  else if (from === "night" && to === "night") moonIntensity = THEMES.night.sun.intensity;
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
  let domeDay = 0, domeSunset = 0, domeNight = 0;
  if (from === "daylight" && to === "daylight") domeDay = 1;
  else if (from === "daylight" && to === "sunset") {
    domeDay = 1 - t;
    domeSunset = t;
  } else if (from === "sunset" && to === "night") {
    domeSunset = 1 - t;
    domeNight = t;
  } else domeNight = 1;
  return {
    elev,
    seg,
    sunColor,
    sunIntensity,
    sunPos,
    moonIntensity,
    hemiSky,
    hemiGround,
    hemiIntensity,
    ambientColor,
    ambientIntensity,
    fogColor,
    fogNear,
    fogFar,
    bgColor,
    downlightIntensity,
    seaColor,
    domeDay,
    domeSunset,
    domeNight,
    treeUplightIntensity: 150 * domeNight
    // night 가중치에 비례해 중정 업라이트 페이드 인
  };
}
function buildCycleTheme(phase) {
  const frame = cycleFrameAt(phase);
  const { seg } = frame;
  const grassTint = new THREE.Color(THEMES[seg.from].grassTint).lerp(new THREE.Color(THEMES[seg.to].grassTint), seg.t).getHex();
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
      intensity: frame.downlightIntensity
    },
    sea: { color: frame.seaColor.getHex(), roughness: THEMES.daylight.sea.roughness, metalness: THEMES.daylight.sea.metalness },
    grassTint,
    treeUplights: true,
    // cycle에서는 항상 업라이트 픽스처를 만들고 밝기만 동적으로 페이드
    shadowCamera: CYCLE_SHADOW_CAMERA
  };
}
function applyCycleFrame(cs, frame) {
  cs.sunLight.color.copy(frame.sunColor);
  cs.sunLight.intensity = frame.sunIntensity;
  cs.sunLight.position.set(frame.sunPos[0], frame.sunPos[1], frame.sunPos[2]);
  cs.sunLight.castShadow = frame.sunIntensity > 0.01;
  cs.moonLight.intensity = frame.moonIntensity;
  cs.hemiLight.color.copy(frame.hemiSky);
  cs.hemiLight.groundColor.copy(frame.hemiGround);
  cs.hemiLight.intensity = frame.hemiIntensity;
  cs.ambientLight.color.copy(frame.ambientColor);
  cs.ambientLight.intensity = frame.ambientIntensity;
  if (cs.scene.fog) {
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
export {
  CYCLE_DAY_SECONDS,
  THEMES,
  applyCycleFrame,
  buildCycleTheme,
  cycleFrameAt,
  getLocalPhase,
  resolveTheme
};
