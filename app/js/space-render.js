// space-render.js — 공간 문서(space.js) → THREE.Group 조립기 (빌더·방문 공용)
// -----------------------------------------------------------------------------
// 성능: 인스턴싱 가능 타입은 InstancedMesh 1개로, 작품/스크린(고유 텍스처)은 개별 Mesh.
// 성능 전문가 실측(2026-07-14): draw call = 15 + (작품+스크린 수). 그래서 작품/스크린만
// 상한(ART_SCREEN_CAP)을 UI가 강제하면 충분(구조/분위기는 draw call 축 제약 사실상 없음).
// [주의] opts.pickable(에디터)이면 파츠 선택을 위해 InstancedMesh를 전면 비활성 → 전 파츠
// 개별 Mesh(draw call 증가). 인스턴싱 이점은 방문자뷰(pickable 없음)에만 적용된다.
// 파츠 지오메트리는 현재 저폴리 프리미티브 프록시 — 디자이너 최종 에셋은 후속 마일스톤에 교체.
// (교체 시 이 파일의 partGeo/PART_COL만 바꾸면 되고, 스키마·빌더 로직은 무영향.)
// -----------------------------------------------------------------------------
import * as THREE from 'three';
import { PART_TYPES, FOOTPRINT, STORY_H } from './space.js';

export const ART_SCREEN_CAP = 80; // 실측 근거: 92개=draw call 100 도달, 80개=95(여유 15%)
export const UNIQUE_TEX_TYPES = new Set(['artwork', 'screen']); // draw call에 1:1로 더해지는 타입

// 마감/파츠 색 (팔레트 B 계열 프록시 — 최종 재질은 디자이너 에셋 단계에서)
const FINISH_COL = { white: '#efe9df', warmsand: '#e6d8bf', charcoal: '#3a3a40', deepviolet: '#2e2542',
  parquet: '#b98a53', terrazzo: '#d8d2c6', concrete: '#8f8d88', whiteflat: '#f2efe8', darkmatte: '#26262b', brass: '#b98d4a' };
const PART_COL = { wallPanel: '#e7e0d4', floorTile: '#b98a53', ceilingPanel: '#f0ede6', pillar: '#d9cdb6', stair: '#c7b48f', arch: '#d8cdbb',
  artwork: '#1c1c20', pedestal: '#e8e6e0', screen: '#101014', partition: '#d9d2c4', vitrine: '#bfe0e6', labelStand: '#cbb98f',
  trackLight: '#2a2a2e', pendantLight: '#b98d4a', planter: '#3d5a3a', rug: '#c9bfae', bench: '#7a5236', drape: '#2f2b3a' };

function mat(c) { return new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.9, metalness: 0.0 }); }

/** 파츠 y 배치 규칙 (벽걸이/바닥/천장) */
export function partY(t, storyH) {
  const spec = PART_TYPES[t];
  if (t === 'artwork' || t === 'screen') return 1.6;
  if (t === 'trackLight') return storyH - 0.3;
  if (t === 'pendantLight') return storyH - 0.7;
  if (t === 'rug') return 0.012;
  if (t === 'ceilingPanel') return storyH - 0.05;
  return spec.size[1] / 2;
}
function partGeo(t) {
  const [w, h, d] = PART_TYPES[t].size;
  if (t === 'pillar') return new THREE.CylinderGeometry(w / 2, w / 2, h, 16);
  if (t === 'planter') return new THREE.CylinderGeometry(w / 2, w / 2 * 0.7, h, 12);
  if (t === 'trackLight' || t === 'pendantLight') return new THREE.SphereGeometry(Math.max(w, h) / 2, 12, 10);
  return new THREE.BoxGeometry(w, h, d);
}

/** 공간 치수 (footprint·storyH 프리셋 해석) */
export function spaceDims(space) {
  const [fw, fd] = FOOTPRINT[space.shell.footprint];
  return { fw, fd, hw: fw / 2, hd: fd / 2, H: STORY_H[space.shell.storyH], t: space.shell.wallT };
}

/**
 * 공간 문서 → THREE.Group. 반환 group.userData:
 *   { dims, partRefs: [{part, index, object}], geos:[], mats:[] } (dispose·픽킹용)
 * opts.pickable: 파츠에 userData.partIndex 부여(빌더 선택용).
 */
export function buildSpaceGroup(space, opts = {}) {
  const g = new THREE.Group();
  const geos = [], mats = [];
  const track = (o) => { if (o.geometry) geos.push(o.geometry); if (o.material) mats.push(o.material); return o; };
  const { fw, fd, hw, hd, H, t } = spaceDims(space);

  // shell: 바닥·천장·4벽 + 피처월 오버레이
  const floorM = track(new THREE.Mesh(new THREE.BoxGeometry(fw, 0.1, fd), mat(FINISH_COL[space.shell.finish.floor]))); floorM.position.set(0, -0.05, 0); g.add(floorM);
  if (!opts.hideCeiling) { // 에디터 컷어웨이: 천장 숨김(방 안이 보이게)
    const ceilM = track(new THREE.Mesh(new THREE.BoxGeometry(fw, 0.1, fd), mat(FINISH_COL[space.shell.finish.ceiling]))); ceilM.position.set(0, H, 0); g.add(ceilM);
  }
  for (const [x, z, ww, dd] of [[0, -hd, fw, t], [0, hd, fw, t], [-hw, 0, t, fd], [hw, 0, t, fd]]) {
    const m = track(new THREE.Mesh(new THREE.BoxGeometry(ww, H, dd), mat(FINISH_COL[space.shell.finish.wall])));
    m.position.set(x, H / 2, z); g.add(m);
  }
  const fwSide = space.shell.finish.featureWall;
  if (fwSide && fwSide !== 'none') {
    const fwl = track(new THREE.Mesh(new THREE.BoxGeometry(fw - 0.2, H - 0.2, 0.02), mat(FINISH_COL.deepviolet)));
    const map = { north: [0, -hd + t / 2 + 0.02, 0], south: [0, hd - t / 2 - 0.02, 0], east: [hw - t / 2 - 0.02, 0, Math.PI / 2], west: [-hw + t / 2 + 0.02, 0, Math.PI / 2] };
    const [px, pz, ry] = map[fwSide] || map.north;
    fwl.position.set(px, H / 2, pz); if (ry) fwl.rotation.y = ry;
    g.add(fwl);
  }

  // 파츠: 타입별 그룹. 인스턴싱 가능 → InstancedMesh, 작품/스크린 → 개별(+자동액자 캔버스).
  const byType = {};
  space.parts.forEach((p, i) => { (byType[p.t] = byType[p.t] || []).push({ p, i }); });
  const partRefs = [];
  for (const [type, list] of Object.entries(byType)) {
    const geo = partGeo(type), material = mat(PART_COL[type]); geos.push(geo); mats.push(material);
    const canInstance = !UNIQUE_TEX_TYPES.has(type) && list.length > 1 && !opts.pickable;
    if (canInstance) {
      const im = new THREE.InstancedMesh(geo, material, list.length);
      list.forEach(({ p }, k) => {
        const m4 = new THREE.Matrix4().compose(new THREE.Vector3(p.x, partY(type, H), p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.ry, 0)), new THREE.Vector3(1, 1, 1));
        im.setMatrixAt(k, m4);
      });
      im.instanceMatrix.needsUpdate = true; g.add(im);
    } else {
      for (const { p, i } of list) {
        const mm = new THREE.Mesh(geo, material);
        mm.position.set(p.x, partY(type, H), p.z); mm.rotation.y = p.ry;
        if (opts.pickable) mm.userData.partIndex = i;
        g.add(mm); partRefs.push({ part: p, index: i, object: mm });
      }
    }
    if (type === 'artwork') { // 자동 액자(프록시): 밝은 캔버스 오버레이
      for (const { p } of list) {
        const [w, h] = PART_TYPES.artwork.size;
        const cv = track(new THREE.Mesh(new THREE.BoxGeometry(w - 0.18, h - 0.18, 0.02), mat('#d8d4cc')));
        cv.position.set(p.x + Math.sin(p.ry) * 0.06, partY('artwork', H), p.z + Math.cos(p.ry) * 0.06);
        cv.rotation.y = p.ry; g.add(cv);
      }
    }
  }
  g.userData = { dims: { fw, fd, hw, hd, H, t }, partRefs, geos, mats };
  return g;
}

/** group.userData의 geos/mats 정리 */
export function disposeSpaceGroup(g) {
  const u = g.userData || {};
  (u.geos || []).forEach((x) => x.dispose && x.dispose());
  (u.mats || []).forEach((x) => x.dispose && x.dispose());
}

/** 현재 작품+스크린 개수 (80캡 판정용) */
export function uniqueTexCount(space) {
  return space.parts.reduce((n, p) => n + (UNIQUE_TEX_TYPES.has(p.t) ? 1 : 0), 0);
}
