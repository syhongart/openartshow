// @ts-nocheck — 순수 이동(C-3 scene 분해), strict 타입은 후속 작업.
// scene-scenery.js — 하늘돔/HDRI·실외(잔디·바다·숲)·중정 큰나무·생물(나비/새)·
//   전역 조명. creatures[] 배열은 이 모듈 사유(export 금지) — 갱신은 updateCreatures(time)
//   접근자만 노출(assembly의 sceneTick이 위임 호출). scene.js에서 분해(C-3 S5).
import * as THREE from 'three';
import { RGBELoader } from '../vendor/RGBELoader.js';
import {
  makeRand, createGrassMaps, createBarkTexture, createBarkNormal, renderSkyTexture,
} from './scene-textures.js';
import { buildDetailedTree, bakeGroupByMaterial } from './scene-trees.js';
import { THEMES } from './scene-themes.js';

// 움직이는 생물(나비/새) — sceneTick(delta)이 매 프레임 갱신
const creatures = [];

// HDRI 하늘 (Poly Haven CC0, drei-assets 1k 미러) — 프로시저럴 캔버스 하늘을
// 즉시 표시용 플레이스홀더로 쓰고, .hdr 로드가 끝나면 맵만 교체한다
// (로드 실패 시 기존 하늘 유지 — 네트워크 무관 폴백).
const SKY_HDRI = {
  daylight: './assets/sky/day.hdr',
  sunset: './assets/sky/sunset.hdr',
  // 밤: ESO 은하수 4096×2048 파노라마 (CC BY 4.0, ESO/S. Brunier — spacekit 미러)
  night: './assets/sky/night.jpg',
};
function loadHdriInto(mat, key) {
  const url = SKY_HDRI[key];
  const onTex = (tex) => {
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    mat.map = tex;
    mat.needsUpdate = true;
  };
  const onErr = () => { /* 실패 — 프로시저럴 하늘 유지 */ };
  if (url.endsWith('.hdr')) {
    new RGBELoader().load(url, onTex, undefined, onErr);
  } else {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      onTex(tex);
    }, undefined, onErr);
  }
}

export function createSky(scene, theme, isCycle) {
  if (isCycle) {
    // daylight/sunset/night 3장의 텍스처를 미리(딱 한 번) 만들어 겹쳐 놓고,
    // sceneTick에서는 각 돔의 opacity만 블렌드한다 (텍스처 재생성 없음 — 성능 우선)
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
        opacity: 0,
      })
    );
    const domeNight = makeDome(THEMES.night.sky, 450);
    const domeSunset = makeDome(THEMES.sunset.sky, 448);
    const domeDaylight = makeDome(THEMES.daylight.sky, 446);
    for (const d of [domeNight, domeSunset, domeDaylight]) d.position.y = -70; // HDRI 지면부 숨김
    domeNight.renderOrder = -3;
    domeSunset.renderOrder = -2;
    domeDaylight.renderOrder = -1;
    scene.add(domeNight, domeSunset, domeDaylight);
    loadHdriInto(domeDaylight.material, 'daylight');
    loadHdriInto(domeSunset.material, 'sunset');
    loadHdriInto(domeNight.material, 'night');
    return { daylight: domeDaylight, sunset: domeSunset, night: domeNight };
  }

  const themeKey = theme === THEMES.sunset ? 'sunset' : theme === THEMES.night ? 'night' : 'daylight';
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(450, 32, 16),
    new THREE.MeshBasicMaterial({ map: renderSkyTexture(theme.sky), side: THREE.BackSide, fog: false })
  );
  dome.position.y = -70; // HDRI 사진의 지면부가 잔디/바다 라인 아래로 잠기게
  scene.add(dome);
  loadHdriInto(dome.material, themeKey);
  return null;
}

// ---------------------------------------------------------------------------
// 실외: 잔디밭 / 바다 / 나무 / 야외 조각
// ---------------------------------------------------------------------------
export function createOutdoors(scene, theme) {
  // 잔디밭 (미술관 바닥 밑까지 넓게 — 미술관 바닥이 위에 얹힘)
  // grassTint: daylight는 흰색(무변화), sunset은 웜톤, night는 어둡게 다운
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({
      map: createGrassMaps().map,
      normalMap: createGrassMaps().normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      color: theme.grassTint,
      roughness: 0.95,
      metalness: 0.0,
    })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.03;
  grass.receiveShadow = true;
  scene.add(grass);

  // 동쪽 바다 (수평선의 외레순 해협) — 테마별 색/거칠기(태양 반사 강도)
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 900),
    new THREE.MeshStandardMaterial({
      color: theme.sea.color,
      roughness: theme.sea.roughness,
      metalness: theme.sea.metalness,
    })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(290, -0.02, 0); // x 90~490
  scene.add(sea);

  // 잔디→바다 경계 모래톤 스트립
  const shore = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 900),
    new THREE.MeshStandardMaterial({ color: 0xc9bb96, roughness: 0.9 })
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(88, -0.025, 0);
  scene.add(shore);

  // ---- 나무 ----
  const rand = makeRand(97531);

  // 감독 지시: 동그란 blob 나무 → 잎 카드가 달린 디테일 트리로 전면 교체.
  // 나무당 76콜(가지 17+잎 카드 59)이라 그대로 두면 드로우콜이 폭발하므로,
  // 전 그루를 forest 그룹에 모아 월드 변환을 굽고 머티리얼별 4콜로 병합한다.
  const forest = new THREE.Group();
  let treeSeed = 40000;
  function makeTree(x, z, scale) {
    treeSeed += 733;
    const dt = buildDetailedTree(treeSeed, {
      trunkLen: 2.6 * scale,
      trunkRad: 0.24 * scale,
      maxLevel: 2,
      leafScale: 0.95 * scale,
    });
    dt.position.set(x, 0, z);
    dt.rotation.y = rand() * Math.PI * 2;
    forest.add(dt);
  }

  // 유리벽 바로 너머의 가까운 나무 — 디테일 트리 (관람자가 자세히 보게 됨)
  const nearDetailSpots = [
    [-12, 30, 1.0], [4, 31, 1.15], [12, 34, 0.9],   // 남쪽 정원
    [34, -18, 1.1], [36, 14, 0.95],                  // 동쪽 잔디
  ];
  nearDetailSpots.forEach(([x, z, s], i) => {
    const dt = buildDetailedTree(60000 + i * 137, {
      trunkLen: 3.2 * s,
      trunkRad: 0.32 * s,
      maxLevel: 2,
      leafScale: 1.1 * s,
    });
    dt.position.set(x + (rand() - 0.5) * 2, 0, z + (rand() - 0.5) * 2);
    dt.rotation.y = rand() * Math.PI * 2;
    forest.add(dt); // 배경 숲과 함께 병합
  });

  // 남쪽 정원 (유리벽 z=+25 너머) — 배경 군락 (로우폴리)
  const southSpots = [
    [-20, 33], [-4, 35], [20, 30],
    [-16, 42], [-6, 45], [6, 43], [16, 46], [0, 52], [-24, 50], [24, 48],
  ];
  for (const [x, z] of southSpots) {
    makeTree(x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3, 1.0 + rand() * 0.9);
  }

  // 동쪽 잔디 (유리벽 x=+25 너머) — 바다 조망을 남기고 드문드문
  const eastSpots = [
    [40, -10], [44, 22], [52, -18], [60, 8], [48, -2],
  ];
  for (const [x, z] of eastSpots) {
    makeTree(x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3, 0.9 + rand() * 0.8);
  }

  // 북서쪽에도 배경 나무 (솔리드 벽 뒤라 살짝만)
  const backSpots = [[-35, -30], [-45, 0], [-38, 20], [-30, 40], [20, -40], [-10, -38]];
  for (const [x, z] of backSpots) {
    makeTree(x + (rand() - 0.5) * 4, z + (rand() - 0.5) * 4, 1.1 + rand() * 1.0);
  }

  // 숲 병합 커밋 — 수피 1콜 + 잎 텍스처별 3콜 (근거리+배경 전 그루)
  for (const m of bakeGroupByMaterial(forest)) scene.add(m);

  // (브론즈 조각은 옥상 테라스로 이전 — createBuilding 참조)

  return { seaMat: sea.material };
}
// ---------------------------------------------------------------------------
// 실내 중정 — 유리로 둘러싸인 정원, 큰 나무가 지붕을 뚫고 자란다
// ---------------------------------------------------------------------------
export function createGardenTree(scene, theme) {
  // 남측 정원의 큰 나무 — 1F 커튼월 너머로 보이는 주인공 조경
  const tree = buildDetailedTree(31415, {
    trunkLen: 4.6,
    trunkRad: 0.42,
    maxLevel: 3,
    leafScale: 1.4,
  });
  tree.position.set(7, 0, 14);
  for (const m of bakeGroupByMaterial(tree)) scene.add(m); // 부품 76+ → 4콜

  const rootFlare = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.72, 0.45, 9),
    new THREE.MeshStandardMaterial({
      map: createBarkTexture(),
      normalMap: createBarkNormal(),
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 0.95,
    })
  );
  rootFlare.position.set(7, 0.22, 14);
  rootFlare.castShadow = true;
  scene.add(rootFlare);

  // night/cycle: 나무 밑 웜 업라이트 2개
  const treeUplights = [];
  if (theme.treeUplights) {
    for (const [ux, uz] of [[5.6, 13], [8.4, 15]]) {
      const spot = new THREE.SpotLight(0xffb066, 150, 15, Math.PI / 5, 0.9, 1.8);
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

// ---------------------------------------------------------------------------
// 생물: 나비 (중정 + 남쪽 정원) / 하늘의 새
// ---------------------------------------------------------------------------
function makeButterfly(scene, opts) {
  const group = new THREE.Group();

  const wingGeoL = new THREE.PlaneGeometry(0.16, 0.12);
  wingGeoL.translate(-0.09, 0, 0);
  const wingGeoR = new THREE.PlaneGeometry(0.16, 0.12);
  wingGeoR.translate(0.09, 0, 0);

  const mat = new THREE.MeshBasicMaterial({
    color: opts.color,
    side: THREE.DoubleSide,
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

      // 진행 방향으로 몸통 회전
      const dx = -Math.sin(t) * opts.rx * opts.speed;
      const dz = Math.cos(t * opts.zRatio) * opts.rz * opts.zRatio * opts.speed;
      group.rotation.y = Math.atan2(dx, dz);

      group.position.set(x, y, z);

      // 날갯짓
      const flap = Math.sin(time * opts.flapSpeed) * 1.1;
      wingL.rotation.y = flap;
      wingR.rotation.y = -flap;
    },
  });
}

function makeBird(scene, opts) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x2a2a2e, side: THREE.DoubleSide });

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

      group.rotation.y = -t - Math.PI / 2; // 원을 따라 진행 방향
      group.position.set(x, y, z);

      const flap = Math.sin(time * opts.flapSpeed + opts.phase) * 0.55;
      wingL.rotation.y = flap;
      wingR.rotation.y = -flap;
    },
  });
}

export function createCreatures(scene) {
  const rand = makeRand(86420);
  const butterflyColors = [0xe8923a, 0xf3d34a, 0xe8e4da, 0xc76fb8, 0x7fb2e0];

  // 정원 큰 나무 주위 나비 5마리
  for (let i = 0; i < 5; i++) {
    makeButterfly(scene, {
      cx: 7,
      cz: 14,
      cy: 1.4 + rand() * 3.0,
      rx: 1.0 + rand() * 2.2,
      rz: 1.0 + rand() * 2.2,
      zRatio: 0.7 + rand() * 0.6,
      speed: 0.35 + rand() * 0.4,
      phase: rand() * Math.PI * 2,
      bobSpeed: 1.5 + rand() * 1.5,
      bobAmp: 0.3 + rand() * 0.3,
      flapSpeed: 9 + rand() * 5,
      color: butterflyColors[i % butterflyColors.length],
    });
  }

  // 남쪽 정원 나비 4마리 (유리벽 너머로 보임)
  for (let i = 0; i < 4; i++) {
    makeButterfly(scene, {
      cx: -14 + i * 10 + rand() * 4,
      cz: 30 + rand() * 8,
      cy: 1.2 + rand() * 2.0,
      rx: 1.5 + rand() * 3.0,
      rz: 1.5 + rand() * 3.0,
      zRatio: 0.6 + rand() * 0.8,
      speed: 0.3 + rand() * 0.35,
      phase: rand() * Math.PI * 2,
      bobSpeed: 1.2 + rand() * 1.6,
      bobAmp: 0.35 + rand() * 0.4,
      flapSpeed: 8 + rand() * 5,
      color: butterflyColors[(i + 2) % butterflyColors.length],
    });
  }

  // 하늘의 새 3마리 (먼 원을 그리며 활공)
  for (let i = 0; i < 3; i++) {
    makeBird(scene, {
      cx: 20 + rand() * 30,
      cz: -10 + rand() * 40,
      cy: 26 + rand() * 12,
      radius: 55 + rand() * 45,
      speed: 0.04 + rand() * 0.03,
      phase: rand() * Math.PI * 2,
      flapSpeed: 2.2 + rand() * 1.2,
    });
  }
}
export function createGlobalLights(scene, theme) {
  // 하늘빛 반구광 (하늘색 + 지면 반사광) — 테마별 색/광량
  const hemi = new THREE.HemisphereLight(theme.hemi.sky, theme.hemi.ground, theme.hemi.intensity);
  hemi.position.set(0, 40, 0);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(theme.ambient.color, theme.ambient.intensity);
  scene.add(ambient);

  // 태양(daylight/sunset) 또는 달(night) — 유리벽을 통해 실내로 들어오는 주 방향광
  const sun = new THREE.DirectionalLight(theme.sun.color, theme.sun.intensity);
  sun.position.set(...theme.sun.pos);
  sun.castShadow = true;
  // 4096² → 2048²: 섀도 패스 필레이트 1/4. 소프트 필터(PCFSoft)가 계단을 뭉개
  // 주고, 정적 씬은 아래 main.js의 섀도맵 프리즈로 매 프레임 재렌더도 안 한다.
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  // 실내 + 근처 실외(정원/조각)까지 그림자 커버 (테마별 태양 각도에 맞춰 조정)
  const sc = theme.shadowCamera;
  sun.shadow.camera.left = sc.left;
  sun.shadow.camera.right = sc.right;
  sun.shadow.camera.top = sc.top;
  sun.shadow.camera.bottom = sc.bottom;
  sun.shadow.camera.near = sc.near;
  sun.shadow.camera.far = sc.far;
  scene.add(sun);
  scene.add(sun.target);

  // 필 라이트 (반대쪽 차가운/보조 광 — 그림자 없음)
  const fill = new THREE.DirectionalLight(theme.fill.color, theme.fill.intensity);
  fill.position.set(...theme.fill.pos);
  scene.add(fill);

  return { hemi, ambient, sun, fill };
}

// creatures[] 는 이 모듈 사유 — assembly의 sceneTick(delta)이 아래 접근자로 위임 갱신.
// (원본 sceneTick 내 `for (const c of creatures) c.update(sceneTime)` 루프를 그대로 이관)
export function updateCreatures(time) {
  for (const c of creatures) c.update(time);
}
