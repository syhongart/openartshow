import * as THREE from "three";
import { RGBELoader } from "../vendor/RGBELoader.js";
import {
  makeRand,
  createGrassMaps,
  createBarkTexture,
  createBarkNormal
} from "./scene-textures.js";
import { buildDetailedTree, bakeGroupByMaterial } from "./scene-trees.js";
import { THEMES } from "./scene-themes.js";
const creatures = [];
function renderSkyTexture(sky) {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  for (const [stop, color] of sky.stops) grad.addColorStop(stop, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  if (sky.stars > 0) {
    const srand = makeRand(90210);
    for (let i = 0; i < sky.stars; i++) {
      const x = srand() * size;
      const y = srand() * size * 0.82;
      const r = 0.4 + srand() * 1.6;
      const bright = 0.35 + srand() * 0.65;
      if (srand() > 0.965) {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
        glow.addColorStop(0, `rgba(255, 255, 255, ${bright * 0.5})`);
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${bright})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const rand = makeRand(13579);
  const [aMin, aMax] = sky.cloudAlpha;
  for (let i = 0; i < sky.cloudCount; i++) {
    const cx = rand() * size;
    const cy = size * (0.3 + rand() * 0.45);
    const scale = 30 + rand() * 90;
    for (let p = 0; p < 7; p++) {
      const px = cx + (rand() - 0.5) * scale * 2.4;
      const py = cy + (rand() - 0.5) * scale * 0.7;
      const pr = scale * (0.35 + rand() * 0.5);
      const cloudGrad = ctx.createRadialGradient(px, py, 0, px, py, pr);
      cloudGrad.addColorStop(0, `rgba(${sky.cloudColor}, ${aMin + rand() * (aMax - aMin)})`);
      cloudGrad.addColorStop(1, `rgba(${sky.cloudColor}, 0)`);
      ctx.fillStyle = cloudGrad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const SKY_HDRI = {
  daylight: "./assets/sky/day.hdr",
  sunset: "./assets/sky/sunset.hdr",
  // 밤: ESO 은하수 4096×2048 파노라마 (CC BY 4.0, ESO/S. Brunier — spacekit 미러)
  night: "./assets/sky/night.jpg"
};
function loadHdriInto(mat, key) {
  const url = SKY_HDRI[key];
  const onTex = (tex) => {
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    mat.map = tex;
    mat.needsUpdate = true;
  };
  const onErr = () => {
  };
  if (url.endsWith(".hdr")) {
    new RGBELoader().load(url, onTex, void 0, onErr);
  } else {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      onTex(tex);
    }, void 0, onErr);
  }
}
function createSky(scene, theme, isCycle) {
  if (isCycle) {
    const makeDome = (sky, radius) => new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 16),
      new THREE.MeshBasicMaterial({
        map: renderSkyTexture(sky),
        side: THREE.BackSide,
        fog: false,
        transparent: true,
        // depthWrite: false → 어떤 돔도 깊이버퍼에 쓰지 않으므로 돔끼리 깊이 비교가 없어 z-fighting 불가.
        // depthTest는 기본값(true)을 유지해야 실내 불투명 지오메트리(벽/바닥/작품)가 하늘을 정상적으로 가린다.
        // (depthTest:false로 두면 투명 패스가 불투명 패스 뒤에 그려지며 하늘이 전시장 전체를 덮어버린다)
        depthWrite: false,
        opacity: 0
      })
    );
    const domeNight = makeDome(THEMES.night.sky, 450);
    const domeSunset = makeDome(THEMES.sunset.sky, 448);
    const domeDaylight = makeDome(THEMES.daylight.sky, 446);
    for (const d of [domeNight, domeSunset, domeDaylight]) d.position.y = -70;
    domeNight.renderOrder = -3;
    domeSunset.renderOrder = -2;
    domeDaylight.renderOrder = -1;
    scene.add(domeNight, domeSunset, domeDaylight);
    loadHdriInto(domeDaylight.material, "daylight");
    loadHdriInto(domeSunset.material, "sunset");
    loadHdriInto(domeNight.material, "night");
    return { daylight: domeDaylight, sunset: domeSunset, night: domeNight };
  }
  const themeKey = theme === THEMES.sunset ? "sunset" : theme === THEMES.night ? "night" : "daylight";
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(450, 32, 16),
    new THREE.MeshBasicMaterial({ map: renderSkyTexture(theme.sky), side: THREE.BackSide, fog: false })
  );
  dome.position.y = -70;
  scene.add(dome);
  loadHdriInto(dome.material, themeKey);
  return null;
}
function createOutdoors(scene, theme) {
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({
      map: createGrassMaps().map,
      normalMap: createGrassMaps().normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      color: theme.grassTint,
      roughness: 0.95,
      metalness: 0
    })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.03;
  grass.receiveShadow = true;
  scene.add(grass);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 900),
    new THREE.MeshStandardMaterial({
      color: theme.sea.color,
      roughness: theme.sea.roughness,
      metalness: theme.sea.metalness
    })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(290, -0.02, 0);
  scene.add(sea);
  const shore = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 900),
    new THREE.MeshStandardMaterial({ color: 13220758, roughness: 0.9 })
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(88, -0.025, 0);
  scene.add(shore);
  const rand = makeRand(97531);
  const forest = new THREE.Group();
  let treeSeed = 4e4;
  function makeTree(x, z, scale) {
    treeSeed += 733;
    const dt = buildDetailedTree(treeSeed, {
      trunkLen: 2.6 * scale,
      trunkRad: 0.24 * scale,
      maxLevel: 2,
      leafScale: 0.95 * scale
    });
    dt.position.set(x, 0, z);
    dt.rotation.y = rand() * Math.PI * 2;
    forest.add(dt);
  }
  const nearDetailSpots = [
    [-12, 30, 1],
    [4, 31, 1.15],
    [12, 34, 0.9],
    // 남쪽 정원
    [34, -18, 1.1],
    [36, 14, 0.95]
    // 동쪽 잔디
  ];
  nearDetailSpots.forEach(([x, z, s], i) => {
    const dt = buildDetailedTree(6e4 + i * 137, {
      trunkLen: 3.2 * s,
      trunkRad: 0.32 * s,
      maxLevel: 2,
      leafScale: 1.1 * s
    });
    dt.position.set(x + (rand() - 0.5) * 2, 0, z + (rand() - 0.5) * 2);
    dt.rotation.y = rand() * Math.PI * 2;
    forest.add(dt);
  });
  const southSpots = [
    [-20, 33],
    [-4, 35],
    [20, 30],
    [-16, 42],
    [-6, 45],
    [6, 43],
    [16, 46],
    [0, 52],
    [-24, 50],
    [24, 48]
  ];
  for (const [x, z] of southSpots) {
    makeTree(x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3, 1 + rand() * 0.9);
  }
  const eastSpots = [
    [40, -10],
    [44, 22],
    [52, -18],
    [60, 8],
    [48, -2]
  ];
  for (const [x, z] of eastSpots) {
    makeTree(x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3, 0.9 + rand() * 0.8);
  }
  const backSpots = [[-35, -30], [-45, 0], [-38, 20], [-30, 40], [20, -40], [-10, -38]];
  for (const [x, z] of backSpots) {
    makeTree(x + (rand() - 0.5) * 4, z + (rand() - 0.5) * 4, 1.1 + rand() * 1);
  }
  for (const m of bakeGroupByMaterial(forest)) scene.add(m);
  return { seaMat: sea.material };
}
function createGardenTree(scene, theme) {
  const tree = buildDetailedTree(31415, {
    trunkLen: 4.6,
    trunkRad: 0.42,
    maxLevel: 3,
    leafScale: 1.4
  });
  tree.position.set(7, 0, 14);
  for (const m of bakeGroupByMaterial(tree)) scene.add(m);
  const rootFlare = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.72, 0.45, 9),
    new THREE.MeshStandardMaterial({
      map: createBarkTexture(),
      normalMap: createBarkNormal(),
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 0.95
    })
  );
  rootFlare.position.set(7, 0.22, 14);
  rootFlare.castShadow = true;
  scene.add(rootFlare);
  const treeUplights = [];
  if (theme.treeUplights) {
    for (const [ux, uz] of [[5.6, 13], [8.4, 15]]) {
      const spot = new THREE.SpotLight(16756838, 150, 15, Math.PI / 5, 0.9, 1.8);
      spot.position.set(ux, 0.35, uz);
      const target = new THREE.Object3D();
      target.position.set(7, 7, 14);
      scene.add(target);
      spot.target = target;
      spot.castShadow = false;
      scene.add(spot);
      treeUplights.push(spot);
    }
  }
  return { treeUplights };
}
function makeButterfly(scene, opts) {
  const group = new THREE.Group();
  const wingGeoL = new THREE.PlaneGeometry(0.16, 0.12);
  wingGeoL.translate(-0.09, 0, 0);
  const wingGeoR = new THREE.PlaneGeometry(0.16, 0.12);
  wingGeoR.translate(0.09, 0, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: opts.color,
    side: THREE.DoubleSide
  });
  const wingL = new THREE.Mesh(wingGeoL, mat);
  const wingR = new THREE.Mesh(wingGeoR, mat);
  wingL.rotation.x = -Math.PI / 2;
  wingR.rotation.x = -Math.PI / 2;
  group.add(wingL);
  group.add(wingR);
  scene.add(group);
  creatures.push({
    update(time) {
      const t = time * opts.speed + opts.phase;
      const x = opts.cx + Math.cos(t) * opts.rx;
      const z = opts.cz + Math.sin(t * opts.zRatio) * opts.rz;
      const y = opts.cy + Math.sin(time * opts.bobSpeed + opts.phase) * opts.bobAmp;
      const dx = -Math.sin(t) * opts.rx * opts.speed;
      const dz = Math.cos(t * opts.zRatio) * opts.rz * opts.zRatio * opts.speed;
      group.rotation.y = Math.atan2(dx, dz);
      group.position.set(x, y, z);
      const flap = Math.sin(time * opts.flapSpeed) * 1.1;
      wingL.rotation.y = flap;
      wingR.rotation.y = -flap;
    }
  });
}
function makeBird(scene, opts) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 2763310, side: THREE.DoubleSide });
  const wingGeoL = new THREE.PlaneGeometry(1.6, 0.35);
  wingGeoL.translate(-0.8, 0, 0);
  const wingGeoR = new THREE.PlaneGeometry(1.6, 0.35);
  wingGeoR.translate(0.8, 0, 0);
  const wingL = new THREE.Mesh(wingGeoL, mat);
  const wingR = new THREE.Mesh(wingGeoR, mat);
  wingL.rotation.x = -Math.PI / 2;
  wingR.rotation.x = -Math.PI / 2;
  group.add(wingL);
  group.add(wingR);
  scene.add(group);
  creatures.push({
    update(time) {
      const t = time * opts.speed + opts.phase;
      const x = opts.cx + Math.cos(t) * opts.radius;
      const z = opts.cz + Math.sin(t) * opts.radius;
      const y = opts.cy + Math.sin(time * 0.3 + opts.phase) * 2;
      group.rotation.y = -t - Math.PI / 2;
      group.position.set(x, y, z);
      const flap = Math.sin(time * opts.flapSpeed + opts.phase) * 0.55;
      wingL.rotation.y = flap;
      wingR.rotation.y = -flap;
    }
  });
}
function createCreatures(scene) {
  const rand = makeRand(86420);
  const butterflyColors = [15241786, 15979338, 15262938, 13070264, 8368864];
  for (let i = 0; i < 5; i++) {
    makeButterfly(scene, {
      cx: 7,
      cz: 14,
      cy: 1.4 + rand() * 3,
      rx: 1 + rand() * 2.2,
      rz: 1 + rand() * 2.2,
      zRatio: 0.7 + rand() * 0.6,
      speed: 0.35 + rand() * 0.4,
      phase: rand() * Math.PI * 2,
      bobSpeed: 1.5 + rand() * 1.5,
      bobAmp: 0.3 + rand() * 0.3,
      flapSpeed: 9 + rand() * 5,
      color: butterflyColors[i % butterflyColors.length]
    });
  }
  for (let i = 0; i < 4; i++) {
    makeButterfly(scene, {
      cx: -14 + i * 10 + rand() * 4,
      cz: 30 + rand() * 8,
      cy: 1.2 + rand() * 2,
      rx: 1.5 + rand() * 3,
      rz: 1.5 + rand() * 3,
      zRatio: 0.6 + rand() * 0.8,
      speed: 0.3 + rand() * 0.35,
      phase: rand() * Math.PI * 2,
      bobSpeed: 1.2 + rand() * 1.6,
      bobAmp: 0.35 + rand() * 0.4,
      flapSpeed: 8 + rand() * 5,
      color: butterflyColors[(i + 2) % butterflyColors.length]
    });
  }
  for (let i = 0; i < 3; i++) {
    makeBird(scene, {
      cx: 20 + rand() * 30,
      cz: -10 + rand() * 40,
      cy: 26 + rand() * 12,
      radius: 55 + rand() * 45,
      speed: 0.04 + rand() * 0.03,
      phase: rand() * Math.PI * 2,
      flapSpeed: 2.2 + rand() * 1.2
    });
  }
}
function createGlobalLights(scene, theme) {
  const hemi = new THREE.HemisphereLight(theme.hemi.sky, theme.hemi.ground, theme.hemi.intensity);
  hemi.position.set(0, 40, 0);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(theme.ambient.color, theme.ambient.intensity);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(theme.sun.color, theme.sun.intensity);
  sun.position.set(...theme.sun.pos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -5e-4;
  sun.shadow.normalBias = 0.02;
  const sc = theme.shadowCamera;
  sun.shadow.camera.left = sc.left;
  sun.shadow.camera.right = sc.right;
  sun.shadow.camera.top = sc.top;
  sun.shadow.camera.bottom = sc.bottom;
  sun.shadow.camera.near = sc.near;
  sun.shadow.camera.far = sc.far;
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight(theme.fill.color, theme.fill.intensity);
  fill.position.set(...theme.fill.pos);
  scene.add(fill);
  return { hemi, ambient, sun, fill };
}
function updateCreatures(time) {
  for (const c of creatures) c.update(time);
}
export {
  createCreatures,
  createGardenTree,
  createGlobalLights,
  createOutdoors,
  createSky,
  updateCreatures
};
