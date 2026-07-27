import * as THREE from "three";
import { BUILDING } from "./config.js";
import {
  THEMES,
  resolveTheme,
  getLocalPhase,
  buildCycleTheme,
  cycleFrameAt,
  applyCycleFrame,
  CYCLE_DAY_SECONDS
} from "./scene-themes.js";
import { createBuilding, buildContactShadows } from "./scene-building.js";
import {
  createSky,
  createOutdoors,
  createGardenTree,
  createGlobalLights,
  createCreatures,
  updateCreatures
} from "./scene-scenery.js";
let cycleState = null;
let sceneTime = 0;
function sceneTick(delta) {
  sceneTime += delta;
  updateCreatures(sceneTime);
  if (cycleState) {
    cycleState.phase = (cycleState.phase + delta / CYCLE_DAY_SECONDS) % 1;
    applyCycleFrame(cycleState, cycleFrameAt(cycleState.phase));
  }
}
function createMuseum(scene, themeName = "daylight", opts = {}) {
  const fullLights = opts.fullLights !== false;
  const isCycle = themeName === "cycle";
  const initPhase = isCycle ? getLocalPhase() : 0;
  const theme = isCycle ? buildCycleTheme(initPhase) : resolveTheme(themeName);
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
      skyDomes: skyRefs
    };
    lightRefs.sun.shadow.camera.updateProjectionMatrix();
    applyCycleFrame(cycleState, cycleFrameAt(initPhase));
  } else {
    cycleState = null;
  }
  return {
    bounds: {
      minX: BUILDING.minX + 0.6,
      maxX: BUILDING.maxX - 0.6,
      minZ: BUILDING.minZ + 0.6,
      maxZ: BUILDING.maxZ - 0.6
    }
  };
}
export {
  createMuseum,
  sceneTick
};
