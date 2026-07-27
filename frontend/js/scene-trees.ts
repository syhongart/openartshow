// @ts-nocheck — 순수 이동(C-3 scene 분해), strict 타입은 후속 작업.
// scene-trees.js — 디테일 나무 빌더(buildDetailedTree)·머티리얼별 병합
//   (bakeGroupByMaterial). scene-textures의 makeRand·sharedTreeMats 소비.
//   world.js(계열 B)도 재사용. scene.js에서 분해(C-3 S3).
import * as THREE from 'three';
import { mergeGeometries } from '../utils/BufferGeometryUtils.js';
import { makeRand, sharedTreeMats } from './scene-textures.js';

// 그룹의 모든 메시를 월드 변환으로 구워 머티리얼별 병합 메시로 반환.
// 나무처럼 "많은 부품 × 공유 재질" 정적 구조 전용 — 원본 그룹은 버린다.
// [순수 export 가산] world.js(오픈월드, 계열 B)가 거리 나무 파셀 병합에 재사용
// (northArt 전례와 동형: export 외 동작 변경 0). docs/OPENWORLD.md 수용 기록 참조.
export function bakeGroupByMaterial(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  const meshes = [];
  for (const [mat, geos] of buckets) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = !(mat.alphaTest > 0); // 알파 잎은 그림자 생략 (아티팩트 방지)
    meshes.push(m);
    // mergeGeometries는 독립된 새 BufferGeometry를 반환하므로 입력 clone(16행에서 파츠마다 clone)은
    // 더 이상 참조되지 않는다. 병합 직후 폐기해 world.js의 다른 병합부(buildPier·buildLighthouse 등)의
    // dispose 관행과 정합시킨다 — 오픈월드는 파셀 로드마다 이 경로를 반복(나무 최대 4그루/파셀)해
    // clone들이 파셀당 수백 개 단위로 순간 쌓이던 JS힙 버스트(파셀 로드 히칭 pcl 마커 가중 요인)를 제거.
    // 공유 재질(mat, sharedTreeMats)은 건드리지 않는다.
    for (const g of geos) g.dispose();
  }
  return meshes;
}

// 재귀 분기 나무: level이 깊어질수록 가늘고 짧아지며, 말단에 잎 클러스터
// [순수 export 가산] world.js(오픈월드, 계열 B)가 거리 가로수로 재사용
// (sharedTreeMats·bark/leaf 재질 함수는 이 모듈 클로저로 딸려옴 — 추가 export 불필요).
export function buildDetailedTree(seed, opts) {
  const rand = makeRand(seed);
  const { bark: barkMat, leaves: leafMats } = sharedTreeMats();
  const maxLevel = opts.maxLevel;
  const leafScale = opts.leafScale;

  function addLeafCluster(parent, y, s) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.3 * s, 1.8 * s),
        leafMats[Math.floor(rand() * leafMats.length)]
      );
      plane.position.set(
        (rand() - 0.5) * 0.7 * s,
        y + (rand() - 0.5) * 0.6 * s,
        (rand() - 0.5) * 0.7 * s
      );
      plane.rotation.set(
        (rand() - 0.5) * 1.0,
        rand() * Math.PI,
        (rand() - 0.5) * 0.7
      );
      // 알파 잎은 그림자 생략 (투명 그림자 아티팩트 방지)
      parent.add(plane);
    }
  }

  function branch(level, len, rad) {
    const g = new THREE.Group();

    const geo = new THREE.CylinderGeometry(rad * 0.62, rad, len, 7);
    geo.translate(0, len / 2, 0);
    const limb = new THREE.Mesh(geo, barkMat);
    limb.castShadow = true;
    g.add(limb);

    if (level < maxLevel) {
      const kids = 2 + (rand() > 0.45 ? 1 : 0);
      for (let k = 0; k < kids; k++) {
        const child = branch(
          level + 1,
          len * (0.6 + rand() * 0.18),
          rad * 0.6
        );
        child.position.y = len * (0.8 + rand() * 0.18);
        // 첫 분기는 완만하게(수관이 개구부 안에 머물도록), 깊을수록 크게 벌어짐
        const tiltBase = level === 0 ? 0.24 : 0.4 + level * 0.12;
        child.rotation.z = tiltBase + rand() * 0.3;
        child.rotation.y = (k / kids) * Math.PI * 2 + rand() * 0.9;
        g.add(child);
      }
      // 중간 가지에도 드문드문 잎
      if (level >= 1 && rand() > 0.45) {
        addLeafCluster(g, len * 0.75, leafScale * 0.7);
      }
    } else {
      addLeafCluster(g, len * 0.9, leafScale);
      if (rand() > 0.5) addLeafCluster(g, len * 0.55, leafScale * 0.8);
    }

    return g;
  }

  return branch(0, opts.trunkLen, opts.trunkRad);
}
