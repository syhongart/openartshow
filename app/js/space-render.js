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

// ── v2 신재질 프로시저럴 텍스처(자작·외부에셋 0 — §6 IP 게이트 준수) ──────────
// 결정적 시드 PRNG(mulberry32) — 로드마다 동일 결과(프로젝트 결정성 규율·베이크 정합).
function seeded(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function canvasTex(size, draw) {
  const c = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
  if (!c) return null;
  c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
// 잔디 — 2색 스페클(방향성 없는 점 노이즈 → 타일 이음새 최소). 매트.
function grassTexGen() {
  return canvasTex(256, (x, S) => {
    const r = seeded(7); x.fillStyle = '#527f3d'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 5200; i++) { const g = 90 + (r() * 80 | 0); x.fillStyle = `rgba(${44 + (r() * 26 | 0)},${g},${34 + (r() * 24 | 0)},${0.35 + r() * 0.4})`; x.beginPath(); x.arc(r() * S, r() * S, 0.7 + r() * 1.4, 0, 6.29); x.fill(); }
  });
}
// 금계(kintsugi) — 검은 옻칠 바탕 + 금빛 갈라짐 정맥(가지치기). 피처월 1면 전용.
function kintsugiTexGen() {
  return canvasTex(512, (x, S) => {
    const r = seeded(21); x.fillStyle = '#171317'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${28 + (r() * 20 | 0)},${20 + (r() * 12 | 0)},${26 + (r() * 16 | 0)},0.22)`; x.beginPath(); x.arc(r() * S, r() * S, 6 + r() * 42, 0, 6.29); x.fill(); }
    const vein = (px, py, a, steps, w) => {
      for (let s = 0; s < steps; s++) {
        a += (r() - 0.5) * 0.6; const nx = px + Math.cos(a) * (9 + r() * 8), ny = py + Math.sin(a) * (9 + r() * 8);
        x.lineCap = 'round';
        x.strokeStyle = '#c39a4a'; x.lineWidth = w; x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
        x.strokeStyle = 'rgba(244,220,150,0.65)'; x.lineWidth = Math.max(0.5, w * 0.4); x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
        px = nx; py = ny;
        if (r() < 0.11 && w > 1.3 && steps - s > 4) vein(px, py, a + (r() < 0.5 ? 1 : -1) * 0.9, (steps - s) >> 1, w * 0.6);
      }
    };
    for (let k = 0; k < 5; k++) vein(r() * S, r() * S, r() * 6.29, 26 + (r() * 20 | 0), 2.2 + r() * 1.3);
  });
}
// 물(#48 Tier2) — 잔물결 밴드 + 스페클 하이라이트. 가로 방향 정수배 사인이라 타일 이음새 연속.
// 방문자뷰 RAF에서 map.offset 스크롤 → 연속 흐름감. 비-DOM(canvasTex=null)이면 정적 단색 폴백.
function waterTexGen() {
  return canvasTex(256, (x, S) => {
    const r = seeded(53); x.fillStyle = '#20505f'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++) {
      const y = r() * S, amp = 3 + r() * 9, k = 1 + (r() * 2 | 0), a = 0.04 + r() * 0.06;
      x.strokeStyle = `rgba(${150 + (r() * 40 | 0)},${205 + (r() * 40 | 0)},${210 + (r() * 30 | 0)},${a})`;
      x.lineWidth = 1 + r() * 1.6; x.beginPath();
      for (let px = 0; px <= S; px += 8) { const py = y + Math.sin((px / S) * 6.2832 * k) * amp; if (px === 0) x.moveTo(px, py); else x.lineTo(px, py); }
      x.stroke();
    }
    for (let i = 0; i < 1300; i++) { x.fillStyle = `rgba(205,236,240,${0.02 + r() * 0.05})`; x.beginPath(); x.arc(r() * S, r() * S, 0.5 + r() * 1.1, 0, 6.2832); x.fill(); }
  });
}
const _genCache = {};
const genTex = (key, gen) => (key in _genCache ? _genCache[key] : (_genCache[key] = gen()));
// 캐시 텍스처를 clone 후 repeat 설정(공유 캐시 오염 방지 — texMat와 동일 규율)
function cloneRepeat(base, rx, ry) { if (!base) return null; const t = base.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }

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
  walnut:     () => SM({ color: 0x6b5138, roughness: 0.6, metalness: 0 }),  // 벤치 시트(월넛) — 파케 바닥과 분리
  charcoalCloth: () => SM({ color: 0x2c2c30, roughness: 0.95, metalness: 0 }), // 드레이프 딥차콜
  clothInner: () => SM({ color: 0xd6ccb7, roughness: 0.97, metalness: 0 }), // 러그 내부 필드(보더 대비)
  parquet:    () => SM({ color: 0xb98a53, roughness: 0.5, metalness: 0 }),
  terrazzo:   () => SM({ color: 0xd8d2c6, roughness: 0.55, metalness: 0 }),
  concrete:   () => SM({ color: 0x8f8d88, roughness: 0.9, metalness: 0 }),
  grass:      () => SM({ color: 0x5b8746, roughness: 0.96, metalness: 0 }),   // 텍스처 미가용(비-DOM) 폴백
  water:      () => SM({ color: 0x22505f, roughness: 0.1, metalness: 0.18, envMapIntensity: 1.4 }), // Tier1: 정적 반사(스크롤=방문자뷰 플래그)
  darkmatte:  () => SM({ color: 0x26262b, roughness: 0.85, metalness: 0 }),
  wood:       () => SM({ color: 0xb99a6f, roughness: 0.6, metalness: 0 }),
  darkMetal:  () => SM({ color: 0x26241f, roughness: 0.4, metalness: 0.75 }),
  brass:      () => SM({ color: 0xb98d4a, roughness: 0.45, metalness: 0.6 }),
  bronze:     () => SM({ color: 0x3c342a, roughness: 0.35, metalness: 0.55 }), // 진열장 골조(놋쇠보다 어둡고 절제된 금속)
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
  // 이벤트 세트(배치1) 전용 — festive는 잎·꽃·리본·풍선 등 다색 accent 공용(정점색, base는 흰색이라 vertexColors 그대로 노출)
  festive:    () => SM({ color: 0xffffff, roughness: 0.62, metalness: 0.04, vertexColors: true }),
  cakeCream:  () => SM({ color: 0xf6ecd9, roughness: 0.5, metalness: 0 }), // 케이크 프로스팅(버터크림)
  bannerCloth: () => SM({ color: 0xf5efe4, roughness: 0.72, metalness: 0 }), // 배너 면 — 크림/오프화이트(감독 지적: 칙칙한 카키 탈피, 밝고 깨끗하게)
};
// 마감 스와치 → 재질
const FINISH_MAT = {
  wall:    { white: MATS.plasterW, warmsand: MATS.warmsand, charcoal: MATS.charcoal },
  feature: { deepviolet: MATS.deepviolet, charcoal: MATS.charcoal, warmsand: MATS.warmsand }, // kintsugi는 featureMat에서 텍스처 처리
  floor:   { parquet: MATS.parquet, terrazzo: MATS.terrazzo, concrete: MATS.concrete, grass: MATS.grass, water: MATS.water },
  ceiling: { whiteflat: MATS.plasterW, darkmatte: MATS.darkmatte },
};
// 파츠 → 재질 (미술관 재질 매핑)
const PART_MAT = {
  wallPanel: MATS.plaster, floorTile: MATS.parquet, ceilingPanel: MATS.plasterW, pillar: MATS.stone, stair: MATS.stone, arch: MATS.plaster,
  artwork: MATS.frameBlack, pedestal: MATS.matteWhite, screen: MATS.darkScreen, partition: MATS.plaster, vitrine: MATS.bronze, labelStand: MATS.brass,
  trackLight: MATS.darkMetal, pendantLight: MATS.brass, planter: MATS.terracotta, rug: MATS.cloth, bench: MATS.walnut, drape: MATS.charcoalCloth,
  wreath: MATS.brass, cake: MATS.cakeCream, banner: MATS.darkMetal, balloon: MATS.matteWhite,
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
  if (id === 'grass') { // 잔디: 스페클 텍스처 + 매트(비-DOM 폴백=단색 grass)
    const map = cloneRepeat(genTex('grass', grassTexGen), Math.max(2, w / 1.5), Math.max(2, d / 1.5));
    return map ? new THREE.MeshStandardMaterial({ map, roughness: 0.96, metalness: 0 }) : MATS.grass();
  }
  if (id === 'water') { // 물: 스크롤 가능한 잔물결 텍스처(비-DOM 폴백=정적 단색 반사 MATS.water)
    const map = cloneRepeat(genTex('water', waterTexGen), Math.max(2, w / 3), Math.max(2, d / 3));
    return map ? new THREE.MeshStandardMaterial({ map, color: 0x22505f, roughness: 0.12, metalness: 0.18, envMapIntensity: 1.4 }) : MATS.water();
  }
  return finishMat('floor', id); // terrazzo=단색
}
// 피처월 1면 마감 — kintsugi(금계)는 여기에만 존재(스키마 feature 집합) → 구조적 1면 강제.
function featureMat(id, w, h) {
  if (id === 'kintsugi') {
    const map = cloneRepeat(genTex('kintsugi', kintsugiTexGen), Math.max(1, w / 2.6), Math.max(1, h / 2.6));
    if (map) return new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0.2, envMapIntensity: 1.1 });
  }
  return finishMat('feature', id); // deepviolet(기본)·charcoal·warmsand, kintsugi 폴백
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
// 두 점을 잇는 원기둥 — 이젤 다리·X배너 프레임처럼 기울어진 부재를 쿼터니언으로 정확히 정렬.
// (화환/케이크/배너의 다리·리본류에 사용 — 근사 회전 대신 정확 정렬로 "디테일" 품질 확보.)
function alignedCyl(rt, rb, from, to, segs = 8) {
  const len = from.distanceTo(to) || 1e-4;
  const g = cyl(rt, rb, len, segs);
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}
// 정점색 단색 도포 — vertexColors accent(잎·꽃·리본·풍선 등 다색 디테일)를 merge하기 전 호출.
// mergeGeometries는 병합 목록 전원이 동일 attribute 집합을 가져야 하므로(색 없는 지오와 섞으면 실패),
// 같은 merged() 호출 안에서는 전부 paintGeo를 거쳐야 한다(부분 적용 금지).
function paintGeo(g, hex) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return g;
}
// 고대 석주 플루팅 샤프트 — F개 세로 홈(고전 컬럼 몸체 패턴) + 미세 배흘림(엔타시스). 단일 지오메트리(인스턴싱).
function flutedShaft(R, height, { flutes = 16, per = 3, hs = 5, depth = R * 0.1 } = {}) {
  const RS = flutes * per, y0 = -height / 2, pos = [], uv = [], idx = [];
  for (let j = 0; j <= hs; j++) {
    const t = j / hs, y = y0 + t * height;
    const Ry = R * (1 - 0.1 * t + 0.03 * Math.sin(Math.PI * t)); // 상단 수축 + 중앙 볼록(엔타시스)
    for (let i = 0; i <= RS; i++) {
      const th = (i / RS) * Math.PI * 2, groove = 0.5 + 0.5 * Math.cos(flutes * th); // 0=능선,1=홈중심
      const r = Ry - depth * groove;
      pos.push(Math.cos(th) * r, y, Math.sin(th) * r); uv.push(i / RS, t); // 원통 언랩(concreteTex 매핑)
    }
  }
  const stride = RS + 1;
  for (let j = 0; j < hs; j++) for (let i = 0; i < RS; i++) {
    const a = j * stride + i, b = a + 1, c = a + stride, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  // 상/하단 캡 — open tube 방지(근접 저각에서 속 안 보이게, 검수 MINOR)
  const y1 = y0 + height, topBase = hs * stride;
  const cb = pos.length / 3; pos.push(0, y0, 0); uv.push(0.5, 0);
  for (let i = 0; i < RS; i++) idx.push(cb, i, i + 1);                       // 하단(-y)
  const ct = pos.length / 3; pos.push(0, y1, 0); uv.push(0.5, 1);
  for (let i = 0; i < RS; i++) idx.push(ct, topBase + i + 1, topBase + i);   // 상단(+y)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); // box/cyl과 attribute 일치(merge 요건)
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function partGeo(t) {
  const [w, h, d] = PART_TYPES[t].size;
  switch (t) {
    case 'pillar': { // 고대 석주 — 플루팅 샤프트 + 베이스 몰딩 + 에키누스·아바쿠스 캐피탈(감독: 고대 기둥 패턴)
      const R = w * 0.5;
      const shaft = flutedShaft(R * 0.98, h - 0.30, { flutes: 14, per: 3, hs: 5, depth: R * 0.16 }); // 굵고 깊은 세로 홈=패턴 가독(감독)
      return merged([
        [cyl(R * 1.34, R * 1.34, 0.06, 16), [0, -h / 2 + 0.03, 0]],  // 플린스 슬랩
        [cyl(R * 1.04, R * 1.30, 0.09, 16), [0, -h / 2 + 0.105, 0]], // 베이스 토러스 몰딩
        [shaft, [0, 0, 0]],                                          // 플루팅 샤프트
        [cyl(R * 0.92, R * 0.88, 0.03, 16), [0, h / 2 - 0.175, 0]],  // 넥(애뉼릿)
        [cyl(R * 1.30, R * 0.94, 0.1, 16), [0, h / 2 - 0.09, 0]],    // 에키누스(플레어)
        [box(R * 2.70, 0.05, R * 2.70), [0, h / 2 - 0.025, 0]],      // 아바쿠스(사각 처마)
      ]);
    }
    case 'bench': // 챔퍼 시트(월넛) — 다리·스트레처는 accent(다크메탈)
      return merged([
        [box(w - 0.08, 0.02, d - 0.08), [0, h / 2 - 0.01, 0]],
        [box(w, 0.04, d), [0, h / 2 - 0.04, 0]],
        [box(w - 0.08, 0.02, d - 0.08), [0, h / 2 - 0.07, 0]],
      ]);
    case 'pedestal': // 미술관 좌대 — 플린스·캡 챔퍼 몰딩 + 미세 배흘림
      return merged([
        [box(w, 0.05, d), [0, -h / 2 + 0.025, 0]],
        [box(w * 0.88, 0.04, d * 0.88), [0, -h / 2 + 0.07, 0]],
        [box(w * 0.80, 0.36, d * 0.80), [0, -0.18, 0]],
        [box(w * 0.76, 0.36, d * 0.76), [0, 0.18, 0]],
        [box(w * 0.88, 0.04, d * 0.88), [0, h / 2 - 0.07, 0]],
        [box(w, 0.05, d), [0, h / 2 - 0.025, 0]],
      ]);
    case 'stair': { // 단수를 현실적 챌판 높이(~0.19m)에서 파생 — 5단 고정은 계단당 0.84m로 과대(감독 지적)
      const st = []; const n = Math.max(6, Math.min(30, Math.round(h / 0.19)));
      for (let i = 0; i < n; i++) st.push([box(w, h / n, d / n), [0, -h / 2 + (i + 0.5) * (h / n), -d / 2 + (i + 0.5) * (d / n)]]);
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
    case 'pendantLight': { // 코드 + 벨 곡선 갓(Lathe) — 포인트는 Vector2여야(raw 배열=NaN)
      const V = (r, y) => new THREE.Vector2(r, y);
      const shade = new THREE.LatheGeometry([V(0.02, -h * 0.2), V(w * 0.14, -h * 0.2), V(w * 0.44, -h * 0.14), V(w * 0.5, -h * 0.02), V(w * 0.16, h * 0.1), V(0.006, h * 0.3)], 16);
      return merged([[cyl(0.006, 0.006, h * 0.5, 6), [0, h * 0.25, 0]], [shade, null]]);
    }
    case 'planter': // 화분: 풋링 + 테이퍼 본체 + 립(플레어) — 잎은 accent
      return merged([
        [cyl(w * 0.30, w * 0.36, 0.05, 16), [0, -h / 2 + 0.025, 0]],
        [cyl(w * 0.5, w * 0.34, h - 0.10, 16), [0, 0, 0]],
        [cyl(w * 0.52, w * 0.48, 0.06, 16), [0, h / 2 - 0.03, 0]],
      ]);
    case 'vitrine': { // 케이스 골조(브론즈) — 바닥 플린스 + 모서리 기둥 + 상단 레일. 유리는 accent. (기존 공중부양 버그 수정)
      const px = w / 2 - 0.02, pz = d / 2 - 0.02, post = () => box(0.03, h - 0.085, 0.03);
      return merged([
        [box(w, 0.06, d), [0, -h / 2 + 0.03, 0]],
        [post(), [-px, 0.0125, pz]], [post(), [px, 0.0125, pz]], [post(), [-px, 0.0125, -pz]], [post(), [px, 0.0125, -pz]],
        [box(w * 0.94, 0.025, d * 0.94), [0, h / 2 - 0.0125, 0]],
      ]);
    }
    case 'screen': // 슬림 베젤 + 단차(패널이 얹힌 느낌)
      return merged([[box(w, h, 0.05), null], [box(w - 0.06, h - 0.06, 0.02), [0, 0, -0.02]]]);
    case 'artwork': { // 베벨 프로필 액자 프레임(속 빈 링) — 캔버스는 accent가 안쪽에 앉음
      const fW = 0.09, ow = w / 2, oh = h / 2, iw = ow - fW, ih = oh - fW;
      const shape = new THREE.Shape(); shape.moveTo(-ow, -oh); shape.lineTo(ow, -oh); shape.lineTo(ow, oh); shape.lineTo(-ow, oh); shape.lineTo(-ow, -oh);
      const hole = new THREE.Path(); hole.moveTo(-iw, -ih); hole.lineTo(iw, -ih); hole.lineTo(iw, ih); hole.lineTo(-iw, ih); hole.lineTo(-iw, -ih);
      shape.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 1, steps: 1 });
      g.translate(0, 0, -d / 2); return g;
    }
    case 'wreath': { // 개업 축하 화환 — 이젤형 삼각대(브론즈/브라스) + 링 프레임. 잎·꽃·리본은 accent(정점색).
      const A = new THREE.Vector3(0, h * 0.04, -d * 0.10);   // 다리 모이는 지점
      const RC = new THREE.Vector3(0, h * 0.30, -d * 0.05);  // 링 중심
      const feet = [
        new THREE.Vector3(-w * 0.34, -h / 2, d * 0.30),
        new THREE.Vector3(w * 0.34, -h / 2, d * 0.30),
        new THREE.Vector3(0, -h / 2, -d * 0.38),
      ];
      const ring = new THREE.TorusGeometry(w * 0.40, 0.02, 8, 24);
      ring.rotateX(-0.16); // 살짝 뒤로 눕혀 정면 시인성(이젤처럼)
      return merged([
        ...feet.map((f) => [alignedCyl(0.022, 0.03, A, f), null]),
        [cyl(0.038, 0.038, 0.05, 10), [A.x, A.y, A.z]],            // 조인트 캡
        [alignedCyl(0.026, 0.026, A, RC), null],                   // 마운트 포스트
        [ring, [RC.x, RC.y, RC.z]],
      ]);
    }
    case 'cake': { // 2~3단 축하 케이크 — 좌대(pedestal)보다 아담(감독 지정). 크림 톤 단일(body), 스탠드·장식은 accent.
      // plateY(스탠드 상판=티어1 밑면) — accent 'cake' case와 반드시 동일 식 유지(스탠드·케이크 높이 정합, 검수 감독 지적: 삼각대 탈피 후 낮은 케이크 스탠드로 교체)
      const plateY = -h / 2 + h * 0.13;
      const t1H = h * 0.17, t2H = h * 0.14, t3H = h * 0.115;
      const r1 = w * 0.40, r2 = w * 0.29, r3 = w * 0.20;
      const yc1 = plateY + t1H / 2, yc2 = plateY + t1H + t2H / 2, yc3 = plateY + t1H + t2H + t3H / 2;
      return merged([
        [cyl(r1 * 0.94, r1, t1H, 20), [0, yc1, 0]],
        [cyl(r2 * 0.94, r2, t2H, 18), [0, yc2, 0]],
        [cyl(r3 * 0.92, r3, t3H, 16), [0, yc3, 0]],
      ]);
    }
    case 'banner': { // X배너 스탠드 — 교차 다리 프레임(다크메탈). 현수막 면은 accent(천 재질, 텍스트 커스텀은 후속).
      const bl = new THREE.Vector3(-w * 0.46, -h / 2, 0), br = new THREE.Vector3(w * 0.46, -h / 2, 0);
      const tl = new THREE.Vector3(-w * 0.40, h * 0.40, 0), tr = new THREE.Vector3(w * 0.40, h * 0.40, 0);
      const diag = (a, b) => alignedCyl(0.018, 0.018, a, b);
      const footPad = (p) => [box(0.09, 0.02, 0.16), [p.x, p.y + 0.01, 0]];
      return merged([
        [diag(bl, tr), null], [diag(br, tl), null],
        [box(tr.x - tl.x + 0.03, 0.03, 0.03), [0, tr.y, 0]], // 상단 레일
        footPad(bl), footPad(br),
      ]);
    }
    case 'balloon': { // 풍선 아치 — 좌우 베이스·폴은 body(중립), 풍선 군집은 accent(다색). 아치 아래는 통행 가능(solid:false).
      const poleH = h * 0.30, padW = 0.16;
      const bx = w / 2 - padW * 1.1;
      return merged([
        [box(padW * 1.6, 0.05, padW * 1.6), [-bx, -h / 2 + 0.025, 0]],
        [box(padW * 1.6, 0.05, padW * 1.6), [bx, -h / 2 + 0.025, 0]],
        [cyl(0.035, 0.045, poleH, 10), [-bx, -h / 2 + 0.05 + poleH / 2, 0]],
        [cyl(0.035, 0.045, poleH, 10), [bx, -h / 2 + 0.05 + poleH / 2, 0]],
      ]);
    }
    default: return box(w, h, d);
  }
}
// 2색 accent(부속 색면) — 파츠 위에 얹는 장식(픽킹 대상 아님). off는 ry로 회전.
function partAccent(t) {
  const [w, h, d] = PART_TYPES[t].size;
  switch (t) {
    case 'artwork': return { geo: box(w - 0.20, h - 0.20, 0.015), mat: 'paper', off: [0, 0, 0.03] }; // 캔버스=프레임 홀(반폭 0.51/0.71)보다 작게(0.5/0.7)→관통 방지+리빌(검수 BLOCKER)
    case 'screen':  return { geo: box(w - 0.06, h - 0.06, 0.02), mat: 'display', off: [0, 0, 0.035] }; // 슬림 베젤 인셋
    case 'vitrine': { // 골조 사이 유리 케이스(바닥 접지) — off로 프레임 안쪽에 정렬
      const cw = w - 0.06, cd = d - 0.06, cH = h - 0.10;
      return { geo: merged([
        [box(cw, cH, 0.012), [0, 0, cd / 2]], [box(cw, cH, 0.012), [0, 0, -cd / 2]],
        [box(0.012, cH, cd), [cw / 2, 0, 0]], [box(0.012, cH, cd), [-cw / 2, 0, 0]],
        [box(cw, 0.015, cd), [0, cH / 2, 0]],
      ]), mat: 'glass', off: [0, 0.02, 0] };
    }
    case 'planter': { // 늘인 스피어=잎덩이(포도송이 티 제거)
      const leaf = (r, sx, sy, sz) => { const s = new THREE.SphereGeometry(r, 8, 6); s.scale(sx, sy, sz); return s; };
      return { geo: merged([
        [leaf(w * 0.34, 1, 1.5, 1), [0, w * 0.2, 0]],
        [leaf(w * 0.26, 1.3, 1.1, 0.9), [w * 0.24, w * 0.1, w * 0.05]],
        [leaf(w * 0.24, 0.9, 1.2, 1.2), [-w * 0.22, w * 0.14, -w * 0.06]],
        [leaf(w * 0.2, 1.1, 0.9, 1.1), [w * 0.02, w * 0.32, w * 0.2]],
      ]), mat: 'plant', off: [0, h * 0.46, 0] };
    }
    case 'trackLight': return { geo: cyl(w * 0.24, w * 0.24, 0.02, 12), mat: 'lens', off: [0, -w * 0.1, 0] };
    case 'pendantLight': return { geo: cyl(w * 0.13, w * 0.13, 0.015, 12), mat: 'lens', off: [0, -h * 0.19, 0] }; // 갓 하단 웜 렌즈
    case 'pedestal': return { geo: box(w * 0.92, 0.012, d * 0.92), mat: 'brass', off: [0, 0.40, 0] }; // 캡 밑 놋쇠 리빌 라인
    case 'bench': { // 테이퍼 다리 2 + 스트레처 바(다크메탈)
      const lx = w / 2 - 0.1;
      return { geo: merged([
        [box(0.06, 0.37, 0.34), [-lx, -0.04, 0]], [box(0.06, 0.37, 0.34), [lx, -0.04, 0]],
        [box(w - 0.32, 0.03, 0.035), [0, -0.16, 0]],
      ]), mat: 'darkMetal', off: [0, 0, 0] };
    }
    case 'rug': return { geo: box(w - 0.16, 0.021, d - 0.16), mat: 'clothInner', off: [0, 0.006, 0] }; // 내부 필드=보더 대비
    case 'wreath': { // 잎·꽃·리본 — 링 프레임(body) 위에 얹는 다색 오버레이(정점색, 개업 축하 톤 — 성탄 리스 배색 지양)
      const RC = new THREE.Vector3(0, h * 0.30, -d * 0.05);
      const ringR = w * 0.40;
      const leafGreen = 0x3d5a3a;
      const flowerPalette = [0xe7b9ab, 0xf1e4c9, 0xe3d3c3, 0xb9c2a0]; // 블러시·크림·샌드·세이지 파스텔(꽃 위주 — 잎은 사이사이 소량만)
      const ribbon = 0xe0b48a; // 블러시·골드 축하 리본(더스티레드 → 개업 톤으로 교체, 브라스 프레임과 명도 대비로 구분)
      const N = 20, pieces = [];
      let fi = 0;
      for (let i = 0; i < N; i++) { // 외곽 링 — 꽃 75%·잎 25%(개업화환은 꽃 비중이 커야 리스와 구분)
        const a = (i / N) * Math.PI * 2;
        const rx = Math.cos(a) * ringR, ry = Math.sin(a) * ringR * 0.98;
        const isLeaf = i % 4 === 0;
        let s;
        if (isLeaf) { s = new THREE.SphereGeometry(0.048, 6, 5); s.scale(1, 1.6, 0.8); s.rotateZ(a); paintGeo(s, leafGreen); }
        else { s = new THREE.SphereGeometry(0.044 + (i % 3) * 0.007, 7, 6); paintGeo(s, flowerPalette[fi % flowerPalette.length]); fi++; }
        s.translate(rx, ry, isLeaf ? 0.03 : 0.038);
        pieces.push([s, null]);
      }
      for (let j = 0; j < 10; j++) { // 안쪽 보조 링 — 작은 꽃송이를 촘촘히 채워 밀도감(감독: "촘촘히")
        const a = ((j + 0.5) / 10) * Math.PI * 2;
        const rx = Math.cos(a) * ringR * 0.90, ry = Math.sin(a) * ringR * 0.88;
        const s = new THREE.SphereGeometry(0.03 + (j % 2) * 0.006, 6, 5);
        paintGeo(s, flowerPalette[(j + 1) % flowerPalette.length]);
        s.translate(rx, ry, 0.05);
        pieces.push([s, null]);
      }
      const bowKnot = new THREE.SphereGeometry(0.05, 8, 6); bowKnot.scale(1.1, 0.75, 0.7); paintGeo(bowKnot, ribbon);
      pieces.push([bowKnot, [0, ringR * 0.98, 0.03]]);
      [1, -1].forEach((sx) => { // 리본 테일 — 얇고 길게, 아래로 갈수록 살짝 벌어져 나부끼는 느낌
        const st = box(0.03, 0.30, 0.01); st.translate(0, -0.15, 0); st.rotateZ(sx * 0.20); paintGeo(st, ribbon);
        pieces.push([st, [sx * 0.045, ringR * 0.80, 0.028]]);
      });
      const geo = merged(pieces);
      geo.rotateX(-0.16); geo.translate(RC.x, RC.y, RC.z);
      return { geo, mat: 'festive', off: [0, 0, 0] };
    }
    case 'cake': { // 낮은 케이크 스탠드(도자기 화이트+골드 림)·티어 트림 리본·촛불·토퍼 — 전부 정점색 accent(body=크림 케이크 본체)
      // plateY — partGeo 'cake' case와 반드시 동일 식(스탠드 상판=티어1 밑면 높이 정합)
      const plateY = -h / 2 + h * 0.13;
      const t1H = h * 0.17, t2H = h * 0.14, t3H = h * 0.115;
      const r1 = w * 0.40, r2 = w * 0.29, r3 = w * 0.20;
      const topY = plateY + t1H + t2H + t3H;
      const gold = 0xcf9a4a, blush = 0xe7b9ab, candleCream = 0xf1e4c9, flame = 0xffcf7a, porcelain = 0xf2f0ea;
      const pieces = [];
      // 케이크 스탠드 — 삼각대 대신 낮은 굽(발+짧은 스템+넓은 상판), 도자기 화이트 + 골드 림(감독 지적: "공중에 뜬" 느낌 제거)
      const footH = 0.028, footR = w * 0.22;
      const plateH = 0.022, plateR = r1 * 1.15;
      const stemH = Math.max(0.03, h * 0.13 - footH - plateH), stemR = w * 0.09;
      const footCY = -h / 2 + footH / 2, stemCY = -h / 2 + footH + stemH / 2, plateCY = plateY - plateH / 2;
      const foot = cyl(footR * 0.94, footR, footH, 20); paintGeo(foot, porcelain); pieces.push([foot, [0, footCY, 0]]);
      const stem = cyl(stemR * 0.86, stemR, stemH, 16); paintGeo(stem, porcelain); pieces.push([stem, [0, stemCY, 0]]);
      const plate = cyl(plateR, plateR * 1.03, plateH, 24); paintGeo(plate, porcelain); pieces.push([plate, [0, plateCY, 0]]);
      const rim = new THREE.TorusGeometry(plateR * 0.99, 0.008, 6, 24); rim.rotateX(Math.PI / 2); paintGeo(rim, gold);
      pieces.push([rim, [0, plateY - 0.004, 0]]);
      [[r1, plateY], [r2, plateY + t1H], [r3, plateY + t1H + t2H]].forEach(([r, y]) => {
        const trim = new THREE.TorusGeometry(r, 0.012, 6, 20); trim.rotateX(Math.PI / 2); paintGeo(trim, blush);
        pieces.push([trim, [0, y + 0.012, 0]]);
      });
      [-1, 0, 1].forEach((k) => {
        const cx = k * r3 * 0.5;
        const stick = cyl(0.006, 0.006, 0.09, 6); paintGeo(stick, candleCream); pieces.push([stick, [cx, topY + 0.045, 0]]);
        const tip = new THREE.SphereGeometry(0.012, 6, 5); paintGeo(tip, flame); pieces.push([tip, [cx, topY + 0.10, 0]]);
      });
      // 토퍼(작은 골드 젬) — Octahedron/Icosahedron 등 Polyhedron계는 비인덱스라 merge 불가(BLOCKER 회귀 방지: box로 대체)
      const topper = box(0.05, 0.09, 0.05); topper.rotateY(Math.PI / 4); paintGeo(topper, gold);
      pieces.push([topper, [0, topY + 0.15, 0]]);
      return { geo: merged(pieces), mat: 'festive', off: [0, 0, 0] };
    }
    case 'banner': { // 현수막 면 — 프레임(body) 안쪽 팽팽한 천. 크림/오프화이트 기본 마감(감독 지적: 칙칙한 톤 → 밝게), 텍스트 커스텀은 후속 마일스톤
      const topRailY = h * 0.40, bottomEdgeY = -h / 2 + 0.07;
      const bh = topRailY - bottomEdgeY, bw = w * 0.74;
      return { geo: box(bw, bh, 0.014), mat: 'bannerCloth', off: [0, (topRailY + bottomEdgeY) / 2, 0.025] };
    }
    case 'balloon': { // 풍선 군집 — 좌우 폴 사이를 잇는 아치, 크고 작은 구 + 절제된 파스텔 색 변주(정점색)
      const poleH = h * 0.30, padW = 0.16;
      const bx = w / 2 - padW * 1.1;
      const baseY = -h / 2 + 0.05 + poleH, archTop = h * 0.46;
      const palette = [0xd7c3b0, 0xc9a58f, 0x9fae95, 0xa9bfc9, 0xe3d3c3]; // 블러시·테라코타·세이지·더스티블루·샌드(절제된 파스텔)
      const rnd = seeded(88);
      const N = 34, pieces = [];
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const x = THREE.MathUtils.lerp(-bx, bx, t);
        const arcY = baseY + (archTop - baseY) * Math.sin(Math.PI * t * 0.98 + 0.01);
        const jx = (rnd() - 0.5) * 0.10, jy = (rnd() - 0.5) * 0.08, jz = (rnd() - 0.5) * 0.16;
        const r = 0.075 + rnd() * 0.075;
        const s = new THREE.SphereGeometry(r, 9, 7);
        paintGeo(s, palette[(i + (rnd() * palette.length | 0)) % palette.length]);
        s.translate(x + jx, arcY + jy, jz);
        pieces.push([s, null]);
      }
      return { geo: merged(pieces), mat: 'festive', off: [0, 0, 0] };
    }
    default: return null;
  }
}

// 작품 이미지 텍스처 — 파일 업로드 dataURL(data:)을 매트보드 배경 위에 contain(원본 종횡비 유지)으로
// 그려 CanvasTexture로 매핑. 외부 URL 0(자기완결·CSP img-src data: 준수). 이미지 로드는 비동기 —
// 완료 시 texture.needsUpdate + onAsyncTex()로 온디맨드 리렌더(빌더) 유도. 방문자뷰는 연속 루프라 자동 반영.
// dispose: 반환 material을 buildSpaceGroup의 mats에 등록 → disposeSpaceGroup이 map(CanvasTexture)·material 회수.
function artworkImageMaterial(src, faceW, faceH, onAsyncTex) {
  if (typeof document === 'undefined') return MATS.paper(); // 비-DOM 폴백(빈 캔버스 재질)
  const LONG = 1024; // 캔버스를 액자면 종횡비에 맞춰(정사각 왜곡 방지) → UV 1:1 매핑
  const cw = faceW >= faceH ? LONG : Math.max(1, Math.round(LONG * faceW / faceH));
  const ch = faceH >= faceW ? LONG : Math.max(1, Math.round(LONG * faceH / faceW));
  const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  const paintMat = () => { ctx.fillStyle = '#efece6'; ctx.fillRect(0, 0, cw, ch); }; // 매트보드(off-white)
  paintMat();
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex }); // 언릿(작품 이미지는 스포트 영향 없이 원색으로 보이게)
  const img = new Image();
  img.onload = () => {
    paintMat();
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (iw > 0 && ih > 0) { // contain: 액자 안 중앙, 남는 부분=매트보드
      const s = Math.min(cw / iw, ch / ih), dw = iw * s, dh = ih * s;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }
    tex.needsUpdate = true;
    if (onAsyncTex) { try { onAsyncTex(); } catch {} }
  };
  img.onerror = () => { if (onAsyncTex) { try { onAsyncTex(); } catch {} } }; // 로드 실패=매트보드만 유지
  img.src = src;
  return mat;
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
  // shellSurf: 라이트맵 베이크용 내부 표면 기술자(중심·내부법선·업·폭·높이) — 정투영 카메라·uv1 정렬에 사용.
  const shellSurf = [];
  const UP_Y = () => new THREE.Vector3(0, 1, 0);
  const floorM = track(new THREE.Mesh(new THREE.BoxGeometry(fw, 0.1, fd), floorMatTex(space.shell.finish.floor, fw, fd))); floorM.position.set(0, -0.05, 0); floorM.receiveShadow = true; g.add(floorM);
  shellSurf.push({ mesh: floorM, center: new THREE.Vector3(0, 0.001, 0), normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1), width: fw, height: fd });
  if (!opts.hideCeiling) { // 에디터 컷어웨이: 천장 숨김(방 안이 보이게)
    const ceilM = track(new THREE.Mesh(new THREE.BoxGeometry(fw, 0.1, fd), finishMat('ceiling', space.shell.finish.ceiling))); ceilM.position.set(0, H, 0); g.add(ceilM);
    // #54 방문자뷰: 천장이 보이므로 셸 라이트맵 베이크 대상에 포함(내부면=아래 향한 법선).
    // 빌더(hideCeiling:true)에는 이 분기가 안 타므로 shell 미추가 → 기존 베이크 회귀 없음.
    shellSurf.push({ mesh: ceilM, center: new THREE.Vector3(0, H - 0.051, 0), normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1), width: fw, height: fd });
  }
  for (const [x, z, ww, dd] of [[0, -hd, fw, t], [0, hd, fw, t], [-hw, 0, t, fd], [hw, 0, t, fd]]) {
    const wallW = Math.max(ww, dd); // 벽면 가로 길이(N/S=fw, E/W=fd)로 텍스처 반복
    const m = track(new THREE.Mesh(new THREE.BoxGeometry(ww, H, dd), wallMat(space.shell.finish.wall, wallW, H)));
    m.position.set(x, H / 2, z); m.receiveShadow = true; g.add(m);
    const inN = new THREE.Vector3(-x, 0, -z).normalize(); // 방 중심 향한 내부 법선
    shellSurf.push({ mesh: m, center: new THREE.Vector3(x + inN.x * (t / 2), H / 2, z + inN.z * (t / 2)), normal: inN, up: UP_Y(), width: wallW, height: H });
  }
  const fwSide = space.shell.finish.featureWall;
  if (fwSide && fwSide !== 'none') {
    const fwW = (fwSide === 'east' || fwSide === 'west') ? fd - 0.2 : fw - 0.2;
    const fwl = track(new THREE.Mesh(new THREE.BoxGeometry(fw - 0.2, H - 0.2, 0.02), featureMat(space.shell.finish.featureFinish, fwW, H - 0.2)));
    const map = { north: [0, -hd + t / 2 + 0.02, 0], south: [0, hd - t / 2 - 0.02, 0], east: [hw - t / 2 - 0.02, 0, Math.PI / 2], west: [-hw + t / 2 + 0.02, 0, Math.PI / 2] };
    const [px, pz, ry] = map[fwSide] || map.north;
    fwl.position.set(px, H / 2, pz); if (ry) fwl.rotation.y = ry;
    g.add(fwl);
    const fwN = { north: [0, 0, 1], south: [0, 0, -1], east: [-1, 0, 0], west: [1, 0, 0] }[fwSide] || [0, 0, 1];
    shellSurf.push({ mesh: fwl, center: new THREE.Vector3(px + fwN[0] * 0.02, H / 2, pz + fwN[2] * 0.02), normal: new THREE.Vector3(fwN[0], fwN[1], fwN[2]), up: UP_Y(), width: fwW, height: H - 0.2 });
  }

  // 파츠: 타입별 그룹. 인스턴싱 가능 → InstancedMesh, 작품/스크린 → 개별(+자동액자 캔버스).
  const byType = {};
  space.parts.forEach((p, i) => { (byType[p.t] = byType[p.t] || []).push({ p, i }); });
  const partRefs = [];
  // v2 스택: p.y(절대 월드 Y·파츠 중심)가 있으면 그 값, 없으면 타입별 기본 y(바닥/벽걸이).
  const pY = (p, type) => (p.y != null ? p.y : partY(type, H));
  for (const [type, list] of Object.entries(byType)) {
    const geo = partGeo(type), material = partMat(type); geos.push(geo); mats.push(material);
    const canInstance = !UNIQUE_TEX_TYPES.has(type) && list.length > 1 && !opts.pickable;
    if (canInstance) {
      const im = new THREE.InstancedMesh(geo, material, list.length);
      im.castShadow = true; im.receiveShadow = true;
      list.forEach(({ p }, k) => {
        const m4 = new THREE.Matrix4().compose(new THREE.Vector3(p.x, pY(p, type), p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.ry, 0)), new THREE.Vector3(1, 1, 1));
        im.setMatrixAt(k, m4);
      });
      im.instanceMatrix.needsUpdate = true; g.add(im);
    } else {
      for (const { p, i } of list) {
        const mm = new THREE.Mesh(geo, material);
        mm.position.set(p.x, pY(p, type), p.z); mm.rotation.y = p.ry;
        mm.castShadow = true; mm.receiveShadow = true;
        if (opts.pickable) mm.userData.partIndex = i;
        g.add(mm); partRefs.push({ part: p, index: i, object: mm });
      }
    }
    // 2색 accent(작품 캔버스·유리·잎·화면·렌즈) — 픽킹 대상 아님.
    const acc = partAccent(type);
    if (acc) {
      geos.push(acc.geo); // 공유 지오(동일 타입=동일 크기)
      const place = (p) => { const [ox, oy, oz] = acc.off; return { pos: new THREE.Vector3(p.x + Math.cos(p.ry) * ox + Math.sin(p.ry) * oz, pY(p, type) + oy, p.z - Math.sin(p.ry) * ox + Math.cos(p.ry) * oz), ry: p.ry }; };
      if (type === 'artwork') {
        // 작품 캔버스: 이미지(src) 있는 작품만 개별 mesh+개별 CanvasTexture로 분리하고,
        // 이미지 없는 작품은 공유 paper 재질로 InstancedMesh 1개(draw-call 예산 보존).
        // ─ 검수 반영(BLOCKER): accent 전량 개별화 시 80개=166콜(예산 붕괴) → 분리로 회귀 제거.
        const withSrc = list.filter(({ p }) => p.src);
        const noSrc = list.filter(({ p }) => !p.src);
        if (noSrc.length) { // 이미지 없는 작품 = 빈 매트보드(공유 paper) → 인스턴싱
          const paperMat = MATS.paper(); mats.push(paperMat);
          if (noSrc.length > 1) {
            const aim = new THREE.InstancedMesh(acc.geo, paperMat, noSrc.length);
            aim.castShadow = true;
            noSrc.forEach(({ p }, k) => { const pl = place(p); aim.setMatrixAt(k, new THREE.Matrix4().compose(pl.pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pl.ry, 0)), new THREE.Vector3(1, 1, 1))); });
            aim.instanceMatrix.needsUpdate = true; g.add(aim);
          } else {
            const pl = place(noSrc[0].p); const am = new THREE.Mesh(acc.geo, paperMat); am.position.copy(pl.pos); am.rotation.y = pl.ry; am.castShadow = true; g.add(am);
          }
        }
        if (withSrc.length) { // 이미지 있는 작품 = 작품별 고유 텍스처라 개별 mesh 불가피
          const [aw, ah] = PART_TYPES.artwork.size; const faceW = aw - 0.20, faceH = ah - 0.20;
          for (const { p } of withSrc) {
            const m = artworkImageMaterial(p.src, faceW, faceH, opts.onAsyncTex); mats.push(m);
            const pl = place(p);
            const am = new THREE.Mesh(acc.geo, m); am.position.copy(pl.pos); am.rotation.y = pl.ry; am.castShadow = true;
            g.add(am);
          }
        }
      } else {
        const accMat = (MATS[acc.mat] || MATS.paper)(); mats.push(accMat);
        if (list.length > 1) { // 장식 accent는 인스턴싱(텍스처 공유 무해)
          const aim = new THREE.InstancedMesh(acc.geo, accMat, list.length);
          aim.castShadow = true;
          list.forEach(({ p }, k) => { const pl = place(p); aim.setMatrixAt(k, new THREE.Matrix4().compose(pl.pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pl.ry, 0)), new THREE.Vector3(1, 1, 1))); });
          aim.instanceMatrix.needsUpdate = true; g.add(aim);
        } else {
          const pl = place(list[0].p); const am = new THREE.Mesh(acc.geo, accMat); am.position.copy(pl.pos); am.rotation.y = pl.ry; am.castShadow = true; g.add(am);
        }
      }
    }
  }
  g.userData = { dims: { fw, fd, hw, hd, H, t }, partRefs, geos, mats, floor: floorM, shell: shellSurf };
  return g;
}

// ── 방 조명 연출(감독: 제미나이급 "멋짐") ────────────────────────────────────
// group에 (a)작품별 소프트 스포트라이트 (b)천장 다운라이트 (c)접촉그림자 AO를 추가.
// 전부 group 자식으로 붙어 rebuild 시 함께 정리된다. AO 지오/재질은 userData에 등록해
// disposeSpaceGroup이 회수(누수 방지). 라이트는 THREE.Light라 별도 dispose 불필요.
let _aoTex = null;
function aoTexture() {
  if (_aoTex) return _aoTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 60);
  g.addColorStop(0, 'rgba(0,0,0,0.62)'); g.addColorStop(0.55, 'rgba(0,0,0,0.30)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  _aoTex = new THREE.CanvasTexture(c); _aoTex.colorSpace = THREE.SRGBColorSpace; return _aoTex;
}
const AO_GROUNDED = { pedestal: 1.2, pillar: 1.5, bench: 2.0, planter: 1.3, vitrine: 1.4, labelStand: 1.0, stair: 1.6, wreath: 1.1, cake: 1.0, banner: 1.1 }; // balloon 제외: 아치 중심이 허공이라 접촉그림자 부적합
const ART_SPOT_CAP = 10; // 실시간 라이트 상한(편집 모드 대표 조명). 초과분은 베이킹 트랙에서 처리 예정.
export function addRoomLighting(group) {
  const u = group.userData || {}; const dims = u.dims; if (!dims) return;
  const { H, hw, hd } = dims;
  const geos = u.geos || (u.geos = []); const mats = u.mats || (u.mats = []);
  const refs = u.partRefs || [];
  // (c) 접촉그림자 — grounded 파츠 밑 소프트 AO 플레인(거의 0 비용). aoMat 1개 공유.
  const aoMat = new THREE.MeshBasicMaterial({ map: aoTexture().clone(), transparent: true, depthWrite: false });
  aoMat.map.needsUpdate = true; mats.push(aoMat);
  refs.forEach(({ part, object }) => {
    const s = AO_GROUNDED[part.t]; if (!s) return;
    const geo = new THREE.PlaneGeometry(s, s); geos.push(geo);
    const pl = new THREE.Mesh(geo, aoMat); pl.rotation.x = -Math.PI / 2;
    // 스택 파츠(p.y>0)는 접촉그림자를 파츠 밑면(아래 파츠 윗면)에 붙인다 — 바닥 고정 시 스택과 분리(검수 MINOR).
    const baseY = object.position.y - PART_TYPES[part.t].size[1] / 2 + 0.015;
    pl.position.set(object.position.x, Math.max(0.015, baseY), object.position.z); group.add(pl);
  });
  // (a) 작품별 소프트 스포트라이트(부드러운 falloff — 감독 피드백). 상한 내에서만.
  refs.filter(({ part }) => part.t === 'artwork' || part.t === 'screen').slice(0, ART_SPOT_CAP)
    .forEach(({ object }) => {
      const p = object.position;
      const toC = new THREE.Vector3(-p.x, 0, -p.z); if (toC.lengthSq() < 1e-3) toC.set(0, 0, 1); toC.normalize();
      const sl = new THREE.SpotLight(0xffe3ba, 23, 11, 0.72, 1.0, 1.0); // 웜·각도.72·penumbra1.0(소프트)
      sl.position.set(p.x + toC.x * 2.1, H - 0.15, p.z + toC.z * 2.1);
      sl.target.position.set(p.x, p.y, p.z); group.add(sl); group.add(sl.target);
    });
  // (b) 천장 다운라이트 — 바닥에 부드러운 웅덩이(글로시 반사와 함께 '멋짐')
  for (const [dx, dz] of [[-hw * 0.4, -hd * 0.35], [hw * 0.15, hd * 0.1], [hw * 0.5, -hd * 0.1]]) {
    const dl = new THREE.SpotLight(0xffdcb0, 18, 12, 0.6, 1.0, 1.1);
    dl.position.set(dx, H - 0.1, dz); dl.target.position.set(dx, 0, dz); group.add(dl); group.add(dl.target);
  }
}

// ── GPU 셸 라이트맵 베이크(팀장 승인 A: 무저장·결정론·방문 즉시) ──────────────
// 스포트라이트만 셸(바닥·벽·피처월) 표면에 GPU 렌더-투-텍스처로 구움 → material.lightMap(uv1).
// hemi/key는 실시간 유지(파츠도 계속 밝음). 결정론(난수·시간 미사용) → 동일 기기 재베이크 동일.
// 하이브리드: lightMap(정적 스포트)=가산, 실시간 라이트(아바타/물)=directDiffuse 가산.
const LIGHTMAP_INTENSITY = 1.7; // 실시간 스포트 풀 밝기에 맞춘 튜닝
const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : 0);

// 소프트웨어 래스터라이저(SwiftShader/llvmpipe 등) 감지 → 256² 폴백으로 실기기 독립성(#54).
export function detectSoftGPU(renderer) {
  try {
    const gl = renderer && renderer.getContext && renderer.getContext();
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
    return /swiftshader|llvmpipe|softpipe|software|microsoft basic/i.test(r);
  } catch { return false; }
}
const bakeRes = (renderer, opts) => opts.res || (detectSoftGPU(renderer) ? 256 : 512); // 소프트=256², 그 외 512²

// 표면 1개를 라이트맵으로 굽는다(정투영 카메라 RTT + uv1 정렬). 렌더러 상태 저장/복원은 호출부 책임.
function bakeOneSurface(s, renderer, spots, res) {
  const rt = new THREE.WebGLRenderTarget(res, res, { colorSpace: THREE.SRGBColorSpace });
  const bs = new THREE.Scene();
  const white = new THREE.Mesh(s.mesh.geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 }));
  white.position.copy(s.mesh.position); white.quaternion.copy(s.mesh.quaternion); bs.add(white);
  spots.forEach((sp) => { const c = sp.clone(); c.target = sp.target.clone(); bs.add(c); bs.add(c.target); });
  const cam = new THREE.OrthographicCamera(-s.width / 2, s.width / 2, s.height / 2, -s.height / 2, 0.05, 60);
  cam.position.copy(s.center).addScaledVector(s.normal, 20); cam.up.copy(s.up); cam.lookAt(s.center); cam.updateMatrixWorld();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(bs, cam);
  const geo = s.mesh.geometry, pos = geo.attributes.position; s.mesh.updateWorldMatrix(true, false);
  const vpm = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), v = new THREE.Vector3();
  const uv1 = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(s.mesh.matrixWorld).applyMatrix4(vpm); uv1[i * 2] = v.x * 0.5 + 0.5; uv1[i * 2 + 1] = v.y * 0.5 + 0.5; }
  geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
  s.mesh.material.lightMap = rt.texture; s.mesh.material.lightMapIntensity = LIGHTMAP_INTENSITY; s.mesh.material.needsUpdate = true;
  white.material.dispose();
  return rt;
}

// 동기 베이크(빌더 '굽기' 버튼 — 사용자 개시, 즉시). 실기기 독립성: 소프트 GPU면 256² 폴백.
export function bakeShellLightmaps(group, renderer, opts = {}) {
  const shell = group.userData.shell || []; if (!shell.length || !renderer) return { ms: 0, surfaces: 0, res: 0 };
  const res = bakeRes(renderer, opts);
  const spots = []; group.traverse((o) => { if (o.isSpotLight) spots.push(o); });
  const prevRT = renderer.getRenderTarget(), prevTone = renderer.toneMapping, prevClear = new THREE.Color(); renderer.getClearColor(prevClear); const prevAlpha = renderer.getClearAlpha();
  renderer.toneMapping = THREE.NoToneMapping; // 라이트맵=톤매핑 전 선형 조사량
  const rts = [], t0 = perfNow();
  for (const s of shell) rts.push(bakeOneSurface(s, renderer, spots, res));
  renderer.setRenderTarget(prevRT); renderer.toneMapping = prevTone; renderer.setClearColor(prevClear, prevAlpha);
  spots.forEach((sp) => { group.remove(sp); if (sp.target) group.remove(sp.target); });
  group.userData.baked = true; group.userData.bakedRTs = rts;
  return { ms: Math.round(perfNow() - t0), surfaces: shell.length, res };
}

// 비동기 베이크(방문자 첫 입장 — 비차단). 표면을 프레임에 나눠 구워 메인 루프를 막지 않는다(#54).
// 스포트는 시작 시 그룹에서 제거 → 방문자 화면은 hemi/key로 유지되고 표면별 라이트맵이 점진적으로 채워짐
// (이중 조명 없음). { promise, cancel } 반환 — dispose 시 반드시 cancel 호출.
export function bakeShellLightmapsAsync(group, renderer, opts = {}) {
  const shell = group.userData.shell || [];
  if (!shell.length || !renderer) return { promise: Promise.resolve({ ms: 0, surfaces: 0, res: 0 }), cancel() {} };
  const res = bakeRes(renderer, opts);
  const perFrame = Math.max(1, opts.perFrame || 1);
  const spots = []; group.traverse((o) => { if (o.isSpotLight) spots.push(o); });
  spots.forEach((sp) => { group.remove(sp); if (sp.target) group.remove(sp.target); }); // 시작 시 실시간 스포트 제거
  const schedule = (typeof requestAnimationFrame !== 'undefined') ? (fn) => requestAnimationFrame(fn)
    : (typeof setTimeout !== 'undefined') ? (fn) => setTimeout(fn, 0) : (fn) => Promise.resolve().then(fn);
  const rts = []; let i = 0, cancelled = false; const t0 = perfNow();
  const promise = new Promise((resolve) => {
    function step() {
      if (cancelled) { group.userData.bakedRTs = rts; return resolve({ cancelled: true, surfaces: i, res }); }
      const prevRT = renderer.getRenderTarget(), prevTone = renderer.toneMapping, prevClear = new THREE.Color(); renderer.getClearColor(prevClear); const prevAlpha = renderer.getClearAlpha();
      renderer.toneMapping = THREE.NoToneMapping;
      const end = Math.min(shell.length, i + perFrame);
      for (; i < end; i++) rts.push(bakeOneSurface(shell[i], renderer, spots, res));
      renderer.setRenderTarget(prevRT); renderer.toneMapping = prevTone; renderer.setClearColor(prevClear, prevAlpha);
      group.userData.bakedRTs = rts; // 부분 결과도 등록(중도 dispose 회수)
      if (opts.onProgress) { try { opts.onProgress(i, shell.length); } catch {} }
      if (i >= shell.length) { group.userData.baked = true; return resolve({ ms: Math.round(perfNow() - t0), surfaces: shell.length, res }); }
      schedule(step);
    }
    schedule(step);
  });
  return { promise, cancel() { cancelled = true; } };
}

/** group.userData의 geos/mats/렌더타깃 정리 */
export function disposeSpaceGroup(g) {
  const u = g.userData || {};
  (u.geos || []).forEach((x) => x.dispose && x.dispose());
  (u.mats || []).forEach((m) => { // 텍스처 clone(map/normalMap)은 rebuild마다 새로 생기므로 함께 정리(누수 방지)
    if (m.map && m.map.dispose) m.map.dispose();
    if (m.normalMap && m.normalMap.dispose) m.normalMap.dispose();
    m.dispose && m.dispose();
  });
  (u.bakedRTs || []).forEach((rt) => rt.dispose && rt.dispose()); // 라이트맵 렌더타깃 회수
}

/** 팔레트 썸네일용 — 파츠 1개(본체+accent)를 원점에 세운 Group. 아이콘 렌더 후 dispose 호출부 책임. */
export function buildPartPreview(type) {
  const g = new THREE.Group();
  const geo = partGeo(type), m = partMat(type);
  g.add(new THREE.Mesh(geo, m));
  const acc = partAccent(type);
  if (acc) {
    const am = new THREE.Mesh(acc.geo, (MATS[acc.mat] || MATS.paper)());
    const [ox, oy, oz] = acc.off; am.position.set(ox, oy, oz); g.add(am);
  }
  return g;
}

/** 현재 작품+스크린 개수 (80캡 판정용) */
export function uniqueTexCount(space) {
  return space.parts.reduce((n, p) => n + (UNIQUE_TEX_TYPES.has(p.t) ? 1 : 0), 0);
}
