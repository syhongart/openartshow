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
import { createPlasterMaps, createParquetMaps, createConcreteMaps } from './scene.js';

// 미술관(scene.js) 프로시저럴 텍스처+노말맵 계승(감독: 노말맵 필수). 생성기는 캐시된
// 텍스처를 반환하므로 clone 후 repeat 설정 — 공유 캐시(미술관) 오염 방지.
const _texCache = {};
function baseMaps(gen, key) { return _texCache[key] || (_texCache[key] = gen()); }
function texMat({ gen, key, tint = 0xffffff, repeat = [2, 2], normalScale = 0.4, roughness = 0.9, metalness = 0 }) {
  const base = baseMaps(gen, key);
  const map = base.map.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(repeat[0], repeat[1]);
  const normalMap = base.normalMap.clone(); normalMap.needsUpdate = true; normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping; normalMap.repeat.set(repeat[0], repeat[1]);
  return new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(normalScale, normalScale), color: new THREE.Color(tint), roughness, metalness });
}
// 표면 치수 → 텍스처 반복(월 목표 조인트 ~2.5m·바닥 파케 ~2m)
const plasterTex = (tint, w, h) => texMat({ gen: createPlasterMaps, key: 'plaster', tint, repeat: [Math.max(1, w / 2.5), Math.max(1, h / 2.5)], normalScale: 0.32, roughness: 0.92 });
const concreteTex = (tint, w, h) => texMat({ gen: createConcreteMaps, key: 'concrete', tint, repeat: [Math.max(1, w / 2.5), Math.max(1, h / 2.5)], normalScale: 0.55, roughness: 0.9 });
const parquetTex = (w, d) => texMat({ gen: createParquetMaps, key: 'parquet', tint: 0xffffff, repeat: [Math.max(1, w / 2), Math.max(1, d / 2)], normalScale: 0.45, roughness: 0.5 });

export const ART_SCREEN_CAP = 80; // 실측 근거: 92개=draw call 100 도달, 80개=95(여유 15%)
export const UNIQUE_TEX_TYPES = new Set(['artwork', 'screen']); // draw call에 1:1로 더해지는 타입

// 재질 팔레트 — 미술관(scene.js)의 MeshStandardMaterial 레시피를 계승해 "한 세계"로.
// (플래스터 rough0.92 · 파케 · 목재 0xb99a6f · 다크메탈 metal0.75 · 놋쇠 metal0.6)
const SM = (o) => new THREE.MeshStandardMaterial(o);
const MATS = {
  plaster:    () => SM({ color: 0xf1ece2, roughness: 0.92, metalness: 0 }),
  plasterW:   () => SM({ color: 0xffffff, roughness: 0.92, metalness: 0 }),
  warmsand:   () => SM({ color: 0xe6d8bf, roughness: 0.9, metalness: 0 }),
  charcoal:   () => SM({ color: 0x3a3a40, roughness: 0.7, metalness: 0.1 }),
  deepviolet: () => SM({ color: 0x2b2833, roughness: 0.9, metalness: 0 }), // 저채도 딥중립(작품 배경 규율 §3-6·팀장 조건①)
  frameBlack: () => SM({ color: 0x17181c, roughness: 0.88, metalness: 0 }), // 액자=매트 블랙(크롬 금지, 아트디렉션 스펙)
  walnut:     () => SM({ color: 0x6b5138, roughness: 0.6, metalness: 0 }),  // 진열장 받침(파케 바닥과 분리)
  charcoalCloth: () => SM({ color: 0x2c2c30, roughness: 0.95, metalness: 0 }), // 드레이프 딥차콜
  clothInner: () => SM({ color: 0xd6ccb7, roughness: 0.97, metalness: 0 }), // 러그 내부 필드(보더 대비)
  parquet:    () => SM({ color: 0xb98a53, roughness: 0.5, metalness: 0 }),
  terrazzo:   () => SM({ color: 0xd8d2c6, roughness: 0.55, metalness: 0 }),
  concrete:   () => SM({ color: 0x8f8d88, roughness: 0.9, metalness: 0 }),
  darkmatte:  () => SM({ color: 0x26262b, roughness: 0.85, metalness: 0 }),
  wood:       () => SM({ color: 0xb99a6f, roughness: 0.6, metalness: 0 }),
  darkMetal:  () => SM({ color: 0x26241f, roughness: 0.4, metalness: 0.75 }),
  brass:      () => SM({ color: 0xb98d4a, roughness: 0.45, metalness: 0.6 }),
  stone:      () => SM({ color: 0xd9cdb6, roughness: 0.7, metalness: 0 }),
  matteWhite: () => SM({ color: 0xe9e6df, roughness: 0.85, metalness: 0 }),
  darkScreen: () => SM({ color: 0x14141a, roughness: 0.5, metalness: 0.08 }), // 다크 매트 베젤(금속광 억제)
  terracotta: () => SM({ color: 0x9a5b43, roughness: 0.85, metalness: 0 }),
  plant:      () => SM({ color: 0x3d5a3a, roughness: 0.8, metalness: 0 }),
  cloth:      () => SM({ color: 0xc9bfae, roughness: 0.97, metalness: 0 }),
  paper:      () => SM({ color: 0xd8d4cc, roughness: 0.9, metalness: 0 }),
  glass:      () => SM({ color: 0xcfe6ea, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.3 }), // 케이스 실루엣 가시성↑
  display:    () => SM({ color: 0x1b1e2a, roughness: 0.32, metalness: 0.2, emissive: 0x10131f, emissiveIntensity: 0.5 }),
  lens:       () => SM({ color: 0xfff3d6, roughness: 0.3, metalness: 0.1, emissive: 0xffe6b0, emissiveIntensity: 0.6 }),
};
// 마감 스와치 → 재질
const FINISH_MAT = {
  wall:    { white: MATS.plasterW, warmsand: MATS.warmsand, charcoal: MATS.charcoal, deepviolet: MATS.deepviolet },
  floor:   { parquet: MATS.parquet, terrazzo: MATS.terrazzo, concrete: MATS.concrete },
  ceiling: { whiteflat: MATS.plasterW, darkmatte: MATS.darkmatte },
};
// 파츠 → 재질 (미술관 재질 매핑)
const PART_MAT = {
  wallPanel: MATS.plaster, floorTile: MATS.parquet, ceilingPanel: MATS.plasterW, pillar: MATS.stone, stair: MATS.stone, arch: MATS.plaster,
  artwork: MATS.frameBlack, pedestal: MATS.matteWhite, screen: MATS.darkScreen, partition: MATS.plaster, vitrine: MATS.walnut, labelStand: MATS.brass,
  trackLight: MATS.darkMetal, pendantLight: MATS.brass, planter: MATS.terracotta, rug: MATS.cloth, bench: MATS.wood, drape: MATS.charcoalCloth,
};
const partMat = (t) => {
  if (t === 'pillar') return concreteTex(0xd2ccbf, 1.2, 1.5);  // 노출 콘크리트 기둥(감독)
  if (t === 'stair') return concreteTex(0xd2ccbf, 0.9, 1.3);
  return (PART_MAT[t] || MATS.stone)();
};
const finishMat = (kind, id) => ((FINISH_MAT[kind] && FINISH_MAT[kind][id]) || MATS.plasterW)();
// 마감 텍스처화(벽 석고·바닥 파케/콘크리트) — 단색 마감은 finishMat 유지
function wallMat(id, w, h) {
  if (id === 'white') return plasterTex(0xffffff, w, h);
  if (id === 'warmsand') return plasterTex(0xe6d8bf, w, h);
  return finishMat('wall', id); // charcoal/deepviolet=단색
}
function floorMatTex(id, w, d) {
  if (id === 'parquet') return parquetTex(w, d);
  if (id === 'concrete') return concreteTex(0xffffff, w, d);
  return finishMat('floor', id); // terrazzo=단색
}

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
    case 'pillar': // 베이스 + 샤프트 + 캐피탈 (칼라 반경↑=몰딩 가독)
      return merged([[cyl(w * 0.85, w * 0.85, 0.12), [0, -h / 2 + 0.06, 0]], [cyl(w / 2, w / 2, h, 20), null], [cyl(w * 0.85, w * 0.85, 0.12), [0, h / 2 - 0.06, 0]]]);
    case 'bench': // 시트만(목재) — 다리는 accent(다크메탈)로 분리
      return merged([[box(w, 0.08, d), [0, h / 2 - 0.04, 0]]]);
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
    case 'artwork': return { geo: box(w - 0.18, h - 0.18, 0.02), mat: 'paper', off: [0, 0, 0.06] };
    case 'screen':  return { geo: box(w - 0.1, h - 0.1, 0.02), mat: 'display', off: [0, 0, 0.04] };
    case 'vitrine': return { geo: box(w * 0.92, h * 0.78, d * 0.92), mat: 'glass', off: [0, h * 0.48, 0] };
    case 'planter': return { geo: merged([[new THREE.SphereGeometry(w * 0.42, 10, 8), null], [new THREE.SphereGeometry(w * 0.3, 10, 8), [w * 0.28, w * 0.22, 0]], [new THREE.SphereGeometry(w * 0.26, 10, 8), [-w * 0.26, w * 0.16, w * 0.12]]]), mat: 'plant', off: [0, h * 0.52, 0] };
    case 'trackLight': return { geo: cyl(w * 0.24, w * 0.24, 0.02, 12), mat: 'lens', off: [0, -w * 0.1, 0] };
    case 'bench': return { geo: merged([[box(0.08, h - 0.08, d * 0.8), [-w / 2 + 0.1, -0.04, 0]], [box(0.08, h - 0.08, d * 0.8), [w / 2 - 0.1, -0.04, 0]]]), mat: 'darkMetal', off: [0, 0, 0] };
    case 'rug': return { geo: box(w - 0.16, 0.021, d - 0.16), mat: 'clothInner', off: [0, 0.006, 0] }; // 내부 필드=보더 대비
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

  // shell: 바닥·천장·4벽 + 피처월 오버레이 (미술관 재질 계승)
  const floorM = track(new THREE.Mesh(new THREE.BoxGeometry(fw, 0.1, fd), floorMatTex(space.shell.finish.floor, fw, fd))); floorM.position.set(0, -0.05, 0); floorM.receiveShadow = true; g.add(floorM);
  if (!opts.hideCeiling) { // 에디터 컷어웨이: 천장 숨김(방 안이 보이게)
    const ceilM = track(new THREE.Mesh(new THREE.BoxGeometry(fw, 0.1, fd), finishMat('ceiling', space.shell.finish.ceiling))); ceilM.position.set(0, H, 0); g.add(ceilM);
  }
  for (const [x, z, ww, dd] of [[0, -hd, fw, t], [0, hd, fw, t], [-hw, 0, t, fd], [hw, 0, t, fd]]) {
    const wallW = Math.max(ww, dd); // 벽면 가로 길이(N/S=fw, E/W=fd)로 텍스처 반복
    const m = track(new THREE.Mesh(new THREE.BoxGeometry(ww, H, dd), wallMat(space.shell.finish.wall, wallW, H)));
    m.position.set(x, H / 2, z); m.receiveShadow = true; g.add(m);
  }
  const fwSide = space.shell.finish.featureWall;
  if (fwSide && fwSide !== 'none') {
    const fwl = track(new THREE.Mesh(new THREE.BoxGeometry(fw - 0.2, H - 0.2, 0.02), MATS.deepviolet()));
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
    const geo = partGeo(type), material = partMat(type); geos.push(geo); mats.push(material);
    const canInstance = !UNIQUE_TEX_TYPES.has(type) && list.length > 1 && !opts.pickable;
    if (canInstance) {
      const im = new THREE.InstancedMesh(geo, material, list.length);
      im.castShadow = true; im.receiveShadow = true;
      list.forEach(({ p }, k) => {
        const m4 = new THREE.Matrix4().compose(new THREE.Vector3(p.x, partY(type, H), p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.ry, 0)), new THREE.Vector3(1, 1, 1));
        im.setMatrixAt(k, m4);
      });
      im.instanceMatrix.needsUpdate = true; g.add(im);
    } else {
      for (const { p, i } of list) {
        const mm = new THREE.Mesh(geo, material);
        mm.position.set(p.x, partY(type, H), p.z); mm.rotation.y = p.ry;
        mm.castShadow = true; mm.receiveShadow = true;
        if (opts.pickable) mm.userData.partIndex = i;
        g.add(mm); partRefs.push({ part: p, index: i, object: mm });
      }
    }
    // 2색 accent(작품 캔버스·유리·잎·화면·렌즈) — 픽킹 대상 아님. 인스턴싱(장식이라 항상 가능).
    const acc = partAccent(type);
    if (acc) {
      const accMat = (MATS[acc.mat] || MATS.paper)();
      geos.push(acc.geo); mats.push(accMat);
      const place = (p) => { const [ox, oy, oz] = acc.off; return { pos: new THREE.Vector3(p.x + Math.cos(p.ry) * ox + Math.sin(p.ry) * oz, partY(type, H) + oy, p.z - Math.sin(p.ry) * ox + Math.cos(p.ry) * oz), ry: p.ry }; };
      if (list.length > 1) {
        const aim = new THREE.InstancedMesh(acc.geo, accMat, list.length);
        aim.castShadow = true;
        list.forEach(({ p }, k) => { const pl = place(p); aim.setMatrixAt(k, new THREE.Matrix4().compose(pl.pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pl.ry, 0)), new THREE.Vector3(1, 1, 1))); });
        aim.instanceMatrix.needsUpdate = true; g.add(aim);
      } else {
        const pl = place(list[0].p); const am = new THREE.Mesh(acc.geo, accMat); am.position.copy(pl.pos); am.rotation.y = pl.ry; am.castShadow = true; g.add(am);
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
  (u.mats || []).forEach((m) => { // 텍스처 clone(map/normalMap)은 rebuild마다 새로 생기므로 함께 정리(누수 방지)
    if (m.map && m.map.dispose) m.map.dispose();
    if (m.normalMap && m.normalMap.dispose) m.normalMap.dispose();
    m.dispose && m.dispose();
  });
}

/** 현재 작품+스크린 개수 (80캡 판정용) */
export function uniqueTexCount(space) {
  return space.parts.reduce((n, p) => n + (UNIQUE_TEX_TYPES.has(p.t) ? 1 : 0), 0);
}
