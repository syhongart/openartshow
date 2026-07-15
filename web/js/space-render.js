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
import { mergeGeometries } from '../utils/BufferGeometryUtils.js';
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
// 합성 지오메트리 헬퍼 — [geo,[x,y,z]] 목록을 하나로 머지(단일 재질·인스턴싱 유지)
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
function merged(list) {
  const gs = list.map(([g, t]) => { if (t) g.translate(t[0], t[1], t[2]); return g; });
  const m = mergeGeometries(gs, false); gs.forEach((g) => g.dispose());
  return m;
}
function partGeo(t) {
  const [w, h, d] = PART_TYPES[t].size;
  switch (t) {
    case 'pillar': // 베이스 + 샤프트 + 캐피탈
      return merged([[cyl(w * 0.62, w * 0.62, 0.12), [0, -h / 2 + 0.06, 0]], [cyl(w / 2, w / 2, h, 20), null], [cyl(w * 0.62, w * 0.62, 0.12), [0, h / 2 - 0.06, 0]]]);
    case 'bench': // 시트 + 다리 2슬랩
      return merged([[box(w, 0.08, d), [0, h / 2 - 0.04, 0]], [box(0.08, h - 0.08, d * 0.8), [-w / 2 + 0.1, -0.04, 0]], [box(0.08, h - 0.08, d * 0.8), [w / 2 - 0.1, -0.04, 0]]]);
    case 'pedestal': // 베이스 + 몸통 + 상판(몰딩)
      return merged([[box(w, 0.06, d), [0, -h / 2 + 0.03, 0]], [box(w * 0.86, h - 0.12, d * 0.86), null], [box(w, 0.05, d), [0, h / 2 - 0.025, 0]]]);
    case 'stair': { // 5단
      const st = []; const n = 5; for (let i = 0; i < n; i++) st.push([box(w, h / n, d / n), [0, -h / 2 + (i + 0.5) * (h / n), -d / 2 + (i + 0.5) * (d / n)]]);
      return merged(st);
    }
    case 'labelStand': { // 포스트 + 경사 플라크
      const plaque = box(w, 0.02, d * 0.9); plaque.rotateX(-0.5);
      return merged([[box(0.04, h, 0.04), null], [plaque, [0, h / 2 - 0.02, 0]]]);
    }
    case 'trackLight': { // 레일 마운트 + 각진 헤드
      const head = cyl(w * 0.5, w * 0.42, w * 0.9, 12); head.rotateX(0.5);
      return merged([[box(w * 0.4, w * 0.3, w * 0.4), [0, w * 0.4, 0]], [head, null]]);
    }
    case 'pendantLight': // 코드 + 갓
      return merged([[cyl(0.006, 0.006, h * 0.5), [0, h * 0.25, 0]], [cyl(w * 0.5, w * 0.12, h * 0.4, 14), [0, -h * 0.2, 0]]]);
    case 'planter': return cyl(w / 2, w / 2 * 0.66, h, 14);   // 화분(테이퍼) — 잎은 accent
    case 'vitrine': return box(w, h * 0.18, d);                // 받침 — 유리는 accent
    case 'screen': return box(w, h, 0.06);                     // 베젤 — 화면은 accent
    default: return box(w, h, d);
  }
}
// 2색 accent(부속 색면) — 파츠 위에 얹는 장식(픽킹 대상 아님). off는 ry로 회전.
function partAccent(t) {
  const [w, h, d] = PART_TYPES[t].size;
  switch (t) {
    case 'artwork': return { geo: box(w - 0.18, h - 0.18, 0.02), color: '#d8d4cc', off: [0, 0, 0.06] };
    case 'screen':  return { geo: box(w - 0.1, h - 0.1, 0.02), color: '#0e0e16', off: [0, 0, 0.04] };
    case 'vitrine': return { geo: box(w * 0.92, h * 0.78, d * 0.92), color: '#bfe0e6', off: [0, h * 0.48, 0], opacity: 0.22 };
    case 'planter': return { geo: merged([[new THREE.SphereGeometry(w * 0.42, 10, 8), null], [new THREE.SphereGeometry(w * 0.3, 10, 8), [w * 0.28, w * 0.22, 0]], [new THREE.SphereGeometry(w * 0.26, 10, 8), [-w * 0.26, w * 0.16, w * 0.12]]]), color: '#3d5a3a', off: [0, h * 0.52, 0] };
    case 'trackLight': return { geo: cyl(w * 0.24, w * 0.24, 0.02, 12), color: '#fff3d6', off: [0, -w * 0.1, 0] };
    default: return null;
  }
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
    // 2색 accent(작품 캔버스·유리·잎·화면·렌즈) — 픽킹 대상 아님. 인스턴싱(장식이라 항상 가능).
    const acc = partAccent(type);
    if (acc) {
      const accMat = acc.opacity != null
        ? new THREE.MeshStandardMaterial({ color: new THREE.Color(acc.color), transparent: true, opacity: acc.opacity, roughness: 0.35, metalness: 0 })
        : mat(acc.color);
      geos.push(acc.geo); mats.push(accMat);
      const place = (p) => { const [ox, oy, oz] = acc.off; return { pos: new THREE.Vector3(p.x + Math.cos(p.ry) * ox + Math.sin(p.ry) * oz, partY(type, H) + oy, p.z - Math.sin(p.ry) * ox + Math.cos(p.ry) * oz), ry: p.ry }; };
      if (list.length > 1) {
        const aim = new THREE.InstancedMesh(acc.geo, accMat, list.length);
        list.forEach(({ p }, k) => { const pl = place(p); aim.setMatrixAt(k, new THREE.Matrix4().compose(pl.pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pl.ry, 0)), new THREE.Vector3(1, 1, 1))); });
        aim.instanceMatrix.needsUpdate = true; g.add(aim);
      } else {
        const pl = place(list[0].p); const am = new THREE.Mesh(acc.geo, accMat); am.position.copy(pl.pos); am.rotation.y = pl.ry; g.add(am);
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
