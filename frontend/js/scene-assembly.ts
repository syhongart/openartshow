// @ts-nocheck — 순수 이동(C-3 scene 분해), strict 타입은 후속 작업.
// scene-assembly.js — 공개 조립기 createMuseum·프레임 훅 sceneTick.
//   cycleState·sceneTime 모듈상태는 여기 국한. sceneTick은 updateCreatures(scenery)와
//   applyCycleFrame(themes)를 둘 다 호출한다. scene.js에서 분해(C-3 S6).
import * as THREE from 'three';
import { BUILDING } from './config.js';
import {
  THEMES, resolveTheme, getLocalPhase, buildCycleTheme,
  cycleFrameAt, applyCycleFrame, CYCLE_DAY_SECONDS,
} from './scene-themes.js';
import { createBuilding, buildContactShadows } from './scene-building.js';
import {
  createSky, createOutdoors, createGardenTree, createGlobalLights,
  createCreatures, updateCreatures,
} from './scene-scenery.js';

// 활성 cycle 상태 (정적 테마일 땐 null → sceneTick에서 사이클 코드 실행 안 함)
let cycleState = null;

// sceneTick — main.js 렌더 루프에서 매 프레임 호출
let sceneTime = 0;
export function sceneTick(delta) {
  sceneTime += delta;
  updateCreatures(sceneTime);

  // 정적 테마일 땐 cycleState가 null이라 아래 코드가 실행되지 않는다
  if (cycleState) {
    cycleState.phase = (cycleState.phase + delta / CYCLE_DAY_SECONDS) % 1;
    applyCycleFrame(cycleState, cycleFrameAt(cycleState.phase));
  }
}

export function createMuseum(scene, themeName = 'daylight', opts = {}) {
  const fullLights = opts.fullLights !== false;
  const isCycle = themeName === 'cycle';
  // cycle 시작 위상: 관람객 현지 시각(시+분) 비례 — 접속 즉시 "지금" 시각의 하늘로 시작
  const initPhase = isCycle ? getLocalPhase() : 0;
  const theme = isCycle ? buildCycleTheme(initPhase) : resolveTheme(themeName);

  // 안개: 실내는 또렷, 먼 풍경은 대기원근으로 옅어짐 (테마별 색/거리)
  scene.background = new THREE.Color(theme.background);
  scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far);

  const skyRefs = createSky(scene, theme, isCycle);
  const outdoorRefs = createOutdoors(scene, theme);
  buildContactShadows(scene);

  const buildingRefs = createBuilding(scene, theme, fullLights);
  const gardenRefs = createGardenTree(scene, theme);
  const downlightRefs = buildingRefs.downlights;
  const lightRefs = createGlobalLights(scene, theme);
  createCreatures(scene);

  if (isCycle) {
    // 달 — night 테마의 고정 위치/색을 그대로 재사용, 밝기만 매 프레임 블렌드
    const moon = new THREE.DirectionalLight(THEMES.night.sun.color, 0);
    moon.position.set(...THEMES.night.sun.pos);
    scene.add(moon);
    scene.add(moon.target);

    cycleState = {
      scene,
      phase: initPhase,
      sunLight: lightRefs.sun,
      hemiLight: lightRefs.hemi,
      ambientLight: lightRefs.ambient,
      moonLight: moon,
      seaMat: outdoorRefs.seaMat,
      downlights: downlightRefs,
      treeUplights: gardenRefs.treeUplights,
      skyDomes: skyRefs,
    };
    // 태양이 움직이므로 넉넉한 합집합 프러스텀을 실제로 반영 (새 라이트에만 영향 — 정적 테마 불변)
    lightRefs.sun.shadow.camera.updateProjectionMatrix();
    applyCycleFrame(cycleState, cycleFrameAt(initPhase)); // 첫 프레임부터 정확한 상태로 시작
  } else {
    cycleState = null; // 정적 테마로 재생성 시 이전 cycle 참조를 폐기
  }

  return {
    bounds: {
      minX: BUILDING.minX + 0.6,
      maxX: BUILDING.maxX - 0.6,
      minZ: BUILDING.minZ + 0.6,
      maxZ: BUILDING.maxZ - 0.6,
    },
  };
}
