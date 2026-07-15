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
  walnut:     () => SM({ color: 0x6b5138, roughness: 0.6, metalness: 0 }),  // 진열장 받침(파케 바닥과 분리)
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
  wall:    { white: MATS.plasterW, warmsand: MATS.warmsand, charcoal: MATS.charcoal },
  feature: { deepviolet: MATS.deepviolet, charcoal: MATS.charcoal, warmsand: MATS.warmsand }, // kintsugi는 featureMat에서 텍스처 처리
  floor:   { parquet: MATS.parquet, terrazzo: MATS.terrazzo, concrete: MATS.concrete, grass: MATS.grass, water: MATS.water },
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
function partGeo(t) {
  const [w, h, d] = PART_TYPES[t].size;
  switch (t) {
    case 'pillar': // 베이스 + 샤프트 + 캐피탈 (칼라 반경↑=몰딩 가독)
      return merged([[cyl(w * 0.85, w * 0.85, 0.12), [0, -h / 2 + 0.06, 0]], [cyl(w / 2, w / 2, h, 20), null], [cyl(w * 0.85, w * 0.85, 0.12), [0, h / 2 - 0.06, 0]]]);
    case 'bench': // 시트만(목재) — 다리는 accent(다크메탈)로 분리
      return merged([[box(w, 0.08, d), [0, h / 2 - 0.04, 0]]]);
    case 'pedestal': // 베이스 + 몸통 + 상판(몰딩)
      return merged([[box(w, 0.06, d), [0, -h / 2 + 0.03, 0]], [box(w * 0.86, h - 0.12, d * 0.86), null], [box(w, 0.05, d), [0, h / 2 - 0.025, 0]]]);
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
    // 2색 accent(작품 캔버스·유리·잎·화면·렌즈) — 픽킹 대상 아님. 인스턴싱(장식이라 항상 가능).
    const acc = partAccent(type);
    if (acc) {
      const accMat = (MATS[acc.mat] || MATS.paper)();
      geos.push(acc.geo); mats.push(accMat);
      const place = (p) => { const [ox, oy, oz] = acc.off; return { pos: new THREE.Vector3(p.x + Math.cos(p.ry) * ox + Math.sin(p.ry) * oz, pY(p, type) + oy, p.z - Math.sin(p.ry) * ox + Math.cos(p.ry) * oz), ry: p.ry }; };
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
const AO_GROUNDED = { pedestal: 1.2, pillar: 1.5, bench: 2.0, planter: 1.3, vitrine: 1.4, labelStand: 1.0, stair: 1.6 };
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
export function bakeShellLightmaps(group, renderer, opts = {}) {
  const shell = group.userData.shell || []; if (!shell.length || !renderer) return { ms: 0, surfaces: 0 };
  const res = opts.res || 512;
  const spots = []; group.traverse((o) => { if (o.isSpotLight) spots.push(o); });
  const prevRT = renderer.getRenderTarget(), prevTone = renderer.toneMapping, prevClear = new THREE.Color(); renderer.getClearColor(prevClear); const prevAlpha = renderer.getClearAlpha();
  renderer.toneMapping = THREE.NoToneMapping; // 라이트맵=톤매핑 전 선형 조사량
  const rts = [], t0 = (typeof performance !== 'undefined' ? performance.now() : 0);
  const vpm = new THREE.Matrix4(), v = new THREE.Vector3();
  for (const s of shell) {
    const rt = new THREE.WebGLRenderTarget(res, res, { colorSpace: THREE.SRGBColorSpace }); rts.push(rt);
    const bs = new THREE.Scene();
    const white = new THREE.Mesh(s.mesh.geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 }));
    white.position.copy(s.mesh.position); white.quaternion.copy(s.mesh.quaternion); bs.add(white);
    spots.forEach((sp) => { const c = sp.clone(); c.target = sp.target.clone(); bs.add(c); bs.add(c.target); });
    const cam = new THREE.OrthographicCamera(-s.width / 2, s.width / 2, s.height / 2, -s.height / 2, 0.05, 60);
    cam.position.copy(s.center).addScaledVector(s.normal, 20); cam.up.copy(s.up); cam.lookAt(s.center); cam.updateMatrixWorld();
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(bs, cam);
    const geo = s.mesh.geometry, pos = geo.attributes.position; s.mesh.updateWorldMatrix(true, false);
    vpm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    const uv1 = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(s.mesh.matrixWorld).applyMatrix4(vpm); uv1[i * 2] = v.x * 0.5 + 0.5; uv1[i * 2 + 1] = v.y * 0.5 + 0.5; }
    geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    s.mesh.material.lightMap = rt.texture; s.mesh.material.lightMapIntensity = LIGHTMAP_INTENSITY; s.mesh.material.needsUpdate = true;
    white.material.dispose();
  }
  renderer.setRenderTarget(prevRT); renderer.toneMapping = prevTone; renderer.setClearColor(prevClear, prevAlpha);
  spots.forEach((sp) => { group.remove(sp); if (sp.target) group.remove(sp.target); });
  group.userData.baked = true; group.userData.bakedRTs = rts;
  return { ms: Math.round((typeof performance !== 'undefined' ? performance.now() : 0) - t0), surfaces: shell.length };
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
