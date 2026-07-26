// @ts-nocheck — 순수 이동(C-3 분해). strict 타입 정합은 후속 마일스톤.
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
import { PART_TYPES, FRAME_RULES } from './space.js';
import { createPlasterMaps, createParquetMaps, createConcreteMaps } from './scene.js';

// 미술관(scene.js) 프로시저럴 텍스처+노말맵 계승(감독: 노말맵 필수). 생성기(createPlasterMaps 등)는
// 내부 싱글톤 캐시를 반환 → _texCache[key]는 scene.js 고정 미술관(라이브)과 "같은 base 객체". 절대 mutate 금지.
const _texCache = {};
function baseMaps(gen, key) { return _texCache[key] || (_texCache[key] = gen()); }

// [A-3 텍스처 메모리 최적화] 마감 key당 공유 텍스처 1쌍(map+normalMap)만 세션 전역 유지.
// 과거: texMat이 벽 세그먼트/바닥마다 base.map.clone()+repeat.set() → 같은 마감 벽 5~7면이 각자 독립 512²
// (힙 THREE.Texture 174개·204MB). 개선: 세그먼트별 repeat은 지오 uv attribute에 굽고(bakeUVRepeat), 텍스처는
// repeat=1로 공유 → 마감당 1쌍(3마감=6텍스처, <10MB). uv*=repeat은 map.repeat.set(offset0·rotation0·center0)과
// 수학적으로 동일 연산이라 픽셀 불변. base는 미술관 공유라 무접촉 — clone 1쌍만 space-render 소유(userData.shared).
const _sharedMaps = {};
function sharedMaps(gen, key) {
  if (_sharedMaps[key]) return _sharedMaps[key];
  const base = baseMaps(gen, key);
  const mk = (src) => { // base를 clone 후 repeat=1 초기화(base의 repeat 4×1.5 등을 상속하므로 반드시 리셋). shared 표식.
    const t = src.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); t.offset.set(0, 0);
    t.userData = { ...(t.userData || {}), shared: true }; t.needsUpdate = true;
    return t;
  };
  // normalMap은 마감에 따라 없을 수 있다(파케 — 디자이너 실렌더 판정으로 노멀 기여 육안 0이라 생성 생략).
  return (_sharedMaps[key] = { map: mk(base.map), normalMap: base.normalMap ? mk(base.normalMap) : null });
}
// 세그먼트별 UV 스케일을 지오 uv attribute에 직접 굽는다(=map.repeat과 동등). 지오는 세그먼트마다 개별
// BoxGeometry라 공유 없음 — 그래도 이중 굽기 방어로 1회 가드. 공유 텍스처 오염 없이 세그먼트별 타일 스케일 보존.
export function bakeUVRepeat(geo, rx, ry) {
  if (!geo || !geo.attributes || !geo.attributes.uv) return;
  const ud = geo.userData || (geo.userData = {});
  if (ud.uvRepeatBaked) return;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
  uv.needsUpdate = true; ud.uvRepeatBaked = true;
}
// [world 스폰 워밍] world 초기 로드(로딩 화면 중)에서 1회 호출해 마감 3종 base(512² 절차 베이크)를
// _texCache에 미리 데워둔다. 이렇게 하면 세션 중 그 마감을 "처음" 요구하는 파셀이 로드되는 프레임의
// 동기 베이크(LOAD_BUDGET_MS 예산 밖 실행 → 파셀 경계 히칭)가 사라진다(스폰은 로딩 화면 중이라 히칭 비가시).
// world 전용 경로에서만 호출 → 고정 미술관(방문뷰·빌더) 무영향. 공용 baseMaps 재사용(중복 로직 0). 텍스처 생성 X(캐시만).
export function warmBuildingTexCache() {
  // [방어 가드] 순수 node(비-DOM)에서는 canvas 베이크 불가 → 아무것도 안 하고 반환(폴백 무영향).
  // 호출부(world.js)도 가드하지만, 텍스처 생성기가 document를 전제하므로 내부에서도 이중 방어.
  if (typeof document === 'undefined') return;
  baseMaps(createPlasterMaps, 'plaster');
  baseMaps(createConcreteMaps, 'concrete');
  baseMaps(parquetLite, 'parquet'); // parquetTex와 같은 gen·키 — 캐시 불일치로 1024가 데워지는 일 방지
}
function texMat({ gen, key, tint = 0xffffff, repeat = [2, 2], normalScale = 0.4, roughness = 0.9, metalness = 0 }) {
  const { map, normalMap } = sharedMaps(gen, key); // 마감당 공유 텍스처(repeat=1) — clone 안 함
  const mat = new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(normalScale, normalScale), color: new THREE.Color(tint), roughness, metalness });
  mat.userData.uvRepeat = [repeat[0], repeat[1]]; // 세그먼트 repeat은 track에서 지오 uv에 굽는다(bakeUVRepeat)
  return mat;
}
// 표면 치수 → 텍스처 반복(월 목표 조인트 ~2.5m·바닥 파케 ~2m)
const plasterTex = (tint, w, h) => texMat({ gen: createPlasterMaps, key: 'plaster', tint, repeat: [Math.max(1, w / 2.5), Math.max(1, h / 2.5)], normalScale: 0.32, roughness: 0.92 });
const concreteTex = (tint, w, h) => texMat({ gen: createConcreteMaps, key: 'concrete', tint, repeat: [Math.max(1, w / 2.5), Math.max(1, h / 2.5)], normalScale: 0.55, roughness: 0.9 });
// [사이클 B 텍스처 감량] 파케만 저용량 생성(map 512·normalMap 없음) — 오픈월드 파셀 승격 시 신규 GPU
// 업로드 10.67MB→0.33MB. 디자이너 실렌더 판정: 이 재질 조건(roughness 0.5·normalScale 0.45)에서 노멀
// 기여는 라킹~그레이징 조명 전부 픽셀 diff 육안 0, map 512는 근경 2.2m에서도 결·옹이 손실 없음.
// 미술관(scene-building)은 조건이 달라(roughness 0.4·normalScale 0.7) 무인자 호출로 종전 유지 — 무접촉.
const parquetLite = () => createParquetMaps({ size: 512, normal: false });
const parquetTex = (w, d) => texMat({ gen: parquetLite, key: 'parquet', tint: 0xffffff, repeat: [Math.max(1, w / 2), Math.max(1, d / 2)], normalScale: 0.45, roughness: 0.5 });

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

// 다색 accent 공유 팔레트 — 배치1(화환)에서 만든 파스텔 꽃 팔레트를 배치2(꽃병 부케)도 재사용.
// 초록 계열은 세이지·올리브로 절제(형광 지양, "조용한 럭셔리" §DESIGN.md).
const FESTIVE_FLOWER_PALETTE = [0xe7b9ab, 0xf1e4c9, 0xe3d3c3, 0xb9c2a0]; // 블러시·크림·샌드·세이지
const FOLIAGE_PALETTE = [0x3d5a3a, 0x4c6b46, 0x5e7a52, 0x6f8a5e]; // 딥그린→올리브 그라데이션(잎)
const LOUNGE_PALETTE = [0xb49d85, 0xcdbb9f, 0x8c7860]; // 배치4 — 웜 타프 쿠션(본체) + 라이터 톤(스로우 필로/스툴 패드) + 다크 웰트 트림, 정점색 공용

// 재질 팔레트 — 미술관(scene.js)의 MeshStandardMaterial 레시피를 계승해 "한 세계"로.
// (플래스터 rough0.92 · 파케 · 목재 0xb99a6f · 다크메탈 metal0.75 · 놋쇠 metal0.6)
const SM = (o) => new THREE.MeshStandardMaterial(o);
export const MATS = {
  plaster:    () => SM({ color: 0xf1ece2, roughness: 0.92, metalness: 0 }),
  plasterW:   () => SM({ color: 0xffffff, roughness: 0.92, metalness: 0 }),
  warmsand:   () => SM({ color: 0xe6d8bf, roughness: 0.9, metalness: 0 }),
  charcoal:   () => SM({ color: 0x3a3a40, roughness: 0.7, metalness: 0.1 }),
  deepviolet: () => SM({ color: 0x2b2833, roughness: 0.9, metalness: 0 }), // 저채도 딥중립(작품 배경 규율 §3-6·팀장 조건①)
  frameBlack: () => SM({ color: 0x17181c, roughness: 0.88, metalness: 0 }), // 액자=매트 블랙(크롬 금지, 아트디렉션 스펙) — minimal 스타일
  frameWalnut: () => SM({ color: 0x4a3423, roughness: 0.55, metalness: 0.05 }), // classic 스타일 외곽 몰딩(월넛톤, 단순화 채택: 라이너 생략 단일 재질)
  frameShadow: () => SM({ color: 0x1c1c1e, roughness: 0.95 }), // frameless 스타일 백킹(링 없음·매트없음, 그림자 틴트)
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
  // 기둥 재질 배리언트(#56) — concrete(index0)는 concreteTex 유지, 아래 3종은 pillar 전용 단색(디자이너 실측)
  pillarMarble: () => SM({ color: 0xe8e3d8, roughness: 0.22, metalness: 0.05 }),
  pillarStone:  () => SM({ color: 0xc7b89a, roughness: 0.85, metalness: 0 }),
  pillarWood:   () => SM({ color: 0x6b4a30, roughness: 0.55, metalness: 0 }),
  // 러그 인스턴스 틴트(#56) — 흰색 base + InstancedMesh.setColorAt(instanceColor). 색 없으면 sand(#c9bfae) 폴백=기존 cloth와 동색(하위호환)
  rugTint:    () => SM({ color: 0xffffff, roughness: 0.97, metalness: 0 }),
  drapeTint:  () => SM({ color: 0xffffff, roughness: 0.95, metalness: 0 }), // 커튼 인스턴스 틴트(#43) — 흰색 base, 색 없으면 charcoal(#2c2c30) 폴백=기존 charcoalCloth 동색
  panelWood:  () => SM({ color: 0x9c7a4e, roughness: 0.5, metalness: 0 }),  // 벽패널·파티션 wood 배리언트(#43)
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
  // 배치2(식물 다종화) 전용 — foliage는 잎·덩굴·다육 등 초록 계열 다색 accent 공용(정점색, matte)
  foliage:    () => SM({ color: 0xffffff, roughness: 0.82, metalness: 0, vertexColors: true }),
  ceramic:    () => SM({ color: 0xece7dc, roughness: 0.28, metalness: 0.05 }), // 화병 — 유광 세라믹(테라코타 화분과 구분)
  // 배치3(구조·조명·장식) 전용
  velvet:     () => SM({ color: 0x6b2430, roughness: 0.82, metalness: 0 }), // 스탠션 로프 — 더스티 버건디 벨벳(매트 천)
  mirror:     () => SM({ color: 0xdfeaf0, roughness: 0.07, metalness: 0.22 }), // 거울면 — 실반사 없이 밝은 유광 + 살짝 하늘빛(감독 스펙)
  // 배치4(좌석·안내·구조 세트) 전용
  lounge:     () => SM({ color: 0xffffff, roughness: 0.72, metalness: 0, vertexColors: true }), // 라운지 쿠션 — 정점색 패브릭 투톤(LOUNGE_PALETTE), 스툴 패드와 공유
  reception:  () => SM({ color: 0xffffff, roughness: 0.55, metalness: 0, vertexColors: true }),  // 안내데스크 몸체 — 정점색 2톤(스톤 플린스+우드 전면 패널)
  windowGlass: () => SM({ color: 0xe4eef1, roughness: 0.12, metalness: 0.04, transparent: true, opacity: 0.34, emissive: 0xfff0cf, emissiveIntensity: 0.28 }), // 창 유리 — opacity 반투명 + 옅은 emissive("빛 든" 느낌, 실제 THREE.Light 0, transmission 금지)
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
  trackLight: MATS.darkMetal, pendantLight: MATS.brass, planter: MATS.terracotta, rug: MATS.rugTint, bench: MATS.walnut, drape: MATS.drapeTint,
  wreath: MATS.brass, cake: MATS.cakeCream, banner: MATS.darkMetal, balloon: MATS.matteWhite,
  bigplant: MATS.terracotta, palm: MATS.terracotta, hangplant: MATS.wood, succulent: MATS.terracotta, vase: MATS.ceramic,
  floorlamp: MATS.darkMetal, stanchion: MATS.brass, mirror: MATS.brass, sign: MATS.wood, railing: MATS.brass,
  lounge: MATS.walnut, reception: MATS.wood, window: MATS.matteWhite, glasspanel: MATS.brass, stool: MATS.walnut,
};
// partMat(t, opts) — opts.mat: 재질 배리언트(#56). opts 없으면 기존 호출부와 100% 동형(index0=현행 재질).
export const partMat = (t, opts) => {
  const mat = opts && opts.mat;
  if (t === 'pillar') { // concrete(index0)=노출 콘크리트 텍스처(감독), marble/stone/wood=단색 배리언트
    if (mat === 'marble') return MATS.pillarMarble();
    if (mat === 'stone') return MATS.pillarStone();
    if (mat === 'wood') return MATS.pillarWood();
    return concreteTex(0xd2ccbf, 1.2, 1.5);
  }
  if (t === 'wallPanel' || t === 'partition') { // plaster(index0)=현행, wood/metal 배리언트(#43)
    if (mat === 'wood') return MATS.panelWood();
    if (mat === 'metal') return MATS.darkMetal();
    return MATS.plaster();
  }
  if (t === 'stair') return concreteTex(0xd2ccbf, 0.9, 1.3);
  return (PART_MAT[t] || MATS.stone)();
};
export const finishMat = (kind, id) => ((FINISH_MAT[kind] && FINISH_MAT[kind][id]) || MATS.plasterW)();
// 마감 텍스처화(벽 석고·바닥 파케/콘크리트) — 단색 마감은 finishMat 유지
export function wallMat(id, w, h) {
  if (id === 'white') return plasterTex(0xffffff, w, h);
  if (id === 'warmsand') return plasterTex(0xe6d8bf, w, h);
  return finishMat('wall', id); // charcoal/deepviolet=단색
}
export function floorMatTex(id, w, d) {
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
export function featureMat(id, w, h) {
  if (id === 'kintsugi') {
    const map = cloneRepeat(genTex('kintsugi', kintsugiTexGen), Math.max(1, w / 2.6), Math.max(1, h / 2.6));
    if (map) return new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0.2, envMapIntensity: 1.1 });
  }
  return finishMat('feature', id); // deepviolet(기본)·charcoal·warmsand, kintsugi 폴백
}

// ── [오픈월드 LOD] 원거리 shell 파셀용 단색 임포스터 재질 ──────────────────────
// 배경: fog에 가려진 원경 shell이 벽/바닥 텍스처를 풀로 그려 fill-rate를 낭비(성능팀 실측:
//   텍스처 페치 54회·고유재질 56개). flatShell 모드는 셸 표면을 텍스처·노멀맵 없는 단색으로 대체.
// 색은 각 마감의 원 대표색(위 MATS base와 정합)을 저채도·약간 어둡게 눌러 — 완전 회색이 아니라
//   원 색조를 유지한 채 fog(FOG_COLOR 0xcfe0ee)에 자연스럽게 녹는 실루엣으로 만든다.
// 대표색을 명시 테이블로 두는 이유: 텍스처 재질(parquet/terrazzo/concrete/kintsugi)은 map에 색이
//   있어 material.color만으로는 대표색을 못 얻는다(헤드리스 평균 추출도 불가). MATS base int와 정합.
const SHELL_FLAT_BASE = {
  wall: { white: 16777215, warmsand: 15128767, charcoal: 3816e3 },
  floor: { parquet: 12159571, terrazzo: 14209734, concrete: 9407880, grass: 6257214, water: 2248799 },
  ceiling: { whiteflat: 16777215, darkmatte: 2500139 },
  feature: { deepviolet: 2828339, charcoal: 3816e3, warmsand: 15128767, kintsugi: 2760728 }
};
// 눌림: 채도 0.55배·명도 0.82배 — 색조는 남기되 채도를 죽여 fog에 녹이고, 살짝 어둡게 실루엣화.
// (계수·MeshLambertMaterial vs MeshBasicMaterial 선택은 디자이너 검수 여지 — CLAUDE.md 시각판단 위임)
export function shellFlatColor(kind, id) {
  const base = (SHELL_FLAT_BASE[kind] && SHELL_FLAT_BASE[kind][id]);
  const c = new THREE.Color(base != null ? base : 13421772);
  const hsl: { h: number; s: number; l: number } = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s * 0.55, hsl.l * 0.82);
  return c;
}
// 계열별 공유 단색 재질(캐시) — 같은 마감의 여러 파셀/표면이 한 재질을 공유(프로그램·메모리 절약).
// userData.shared=true → disposeSpaceGroup이 회수하지 않는다(공유 규약). 조명(hemi/sun)에 실루엣
//   음영이 살도록 Lambert 채택. scene.fog에 자동 반응(MeshLambertMaterial 기본 fog:true).
const _shellFlatCache = new Map();
export function shellFlatMat(kind, id) {
  const key = kind + ':' + id;
  let m = _shellFlatCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: shellFlatColor(kind, id) });
    m.userData.shared = true;
    _shellFlatCache.set(key, m);
  }
  return m;
}

/** 파츠 y 배치 규칙 (벽걸이/바닥/천장) */
export function partY(t, storyH) {
  const spec = PART_TYPES[t];
  if (t === 'artwork' || t === 'screen') return 1.6;
  if (t === 'trackLight') return storyH - 0.3;
  if (t === 'pendantLight') return storyH - 0.7;
  if (t === 'hangplant') return storyH - 1.0; // 천장/선반 부착 기본 높이 — p.y로 재배치 가능(v2 스택)
  if (t === 'window') return storyH * 0.58; // 벽 부착(배치4) — 층고 비례로 중앙보다 살짝 위(눈높이~상단)
  if (t === 'rug') return 0.012;
  if (t === 'ceilingPanel') return storyH - 0.05;
  return spec.size[1] / 2;
}
// 합성 지오메트리 헬퍼 — [geo,[x,y,z]] 목록을 하나로 머지(단일 재질·인스턴싱 유지)
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
function merged(list) {
  const gs = list.map(([g, t]) => { if (t) g.translate(t[0], t[1], t[2]); return g; });
  const m = mergeGeometries(gs, false); gs.forEach((g) => g.dispose());
  return m;
}

// ── 자동 액자: 3스타일 + 종횡비 자동비율(디자이너 §자동 액자) ──────────────────
// fW=프레임 변폭(스타일별). 두께 d는 3스타일 공통 0.1 — 실값은 액자 조립부의 D=PART_TYPES.artwork.size[2]에서 하드코딩.
// FRAME_RULES.thickness(=0.1)와 값은 우연히 일치하나 코드는 이 필드를 참조하지 않는다. accent z오프셋·
// 스포트라이트 오프셋이 이 두께에 의존하므로 스타일 무관 고정. frameless는 링 없음(fW=0).
const FRAME_FW = { minimal: 0.045, classic: 0.11, frameless: 0 };
export const FRAME_MAT_ID = { minimal: 'frameBlack', classic: 'frameWalnut', frameless: 'frameShadow' };
// p.ar → 액자 W/H. 디자이너 실측 공식(FRAME_RULES 소비). ar 없으면 레거시 고정 1.2×1.6 폴백.
export function artworkSize(ar) {
  const [dw, dh] = PART_TYPES.artwork.size; // 폴백(빈 액자·구버전 저장분)
  if (!(typeof ar === 'number' && isFinite(ar) && ar > 0)) return { W: dw, H: dh };
  const BASE = 1.6, minSize = FRAME_RULES.minSize, clampW = FRAME_RULES.landscape.clampW, clampH = FRAME_RULES.portrait.clampH;
  const cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const r = ar;
  let W, H;
  if (r >= 1) { W = BASE; H = BASE / r; } else { H = BASE; W = BASE * r; }
  const W0 = W, H0 = H;
  W = cl(W, minSize, clampW); H = cl(H, minSize, clampH);
  if (W !== W0) H = cl(W / r, minSize, clampH); // 폭이 clamp로 잘리면 높이를 비율 재산출
  if (H !== H0) W = cl(H * r, minSize, clampW); // 높이가 clamp로 잘리면 폭을 비율 재산출
  return { W, H };
}
// 액자 프레임 지오 — style별 분기. 캔버스(accent)는 partAccent가 안쪽에 앉음.
// minimal/classic: 속 빈 사각 베벨 링(기존 단일 링 기법 재사용, fW·베벨만 스타일별).
// frameless: 링 없이 얇은 백킹 박스만(매트보드 없음).
function artworkFrameGeo(style, W, H, d) {
  if (style === 'frameless') return box(W, H, 0.02); // 링 없음·백킹만(box 중심원점)
  const fW = FRAME_FW[style] || FRAME_FW.minimal;
  const bevel = style === 'classic'
    ? { bevelThickness: 0.02, bevelSize: 0.014, bevelSegments: 2 }  // classic: 두꺼운 몰딩·부드러운 라운드
    : { bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 1 }; // minimal: 슬림
  const ow = W / 2, oh = H / 2, iw = ow - fW, ih = oh - fW;
  const shape = new THREE.Shape(); shape.moveTo(-ow, -oh); shape.lineTo(ow, -oh); shape.lineTo(ow, oh); shape.lineTo(-ow, oh); shape.lineTo(-ow, -oh);
  const hole = new THREE.Path(); hole.moveTo(-iw, -ih); hole.lineTo(iw, -ih); hole.lineTo(iw, ih); hole.lineTo(-iw, ih); hole.lineTo(-iw, -ih);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, ...bevel, steps: 1 });
  g.translate(0, 0, -d / 2); return g;
}
// 액자 캔버스(accent) 치수 — 프레임 홀 안쪽. 3중 인셋: 홀(W-2fW) → 캔버스(홀-0.01/변, 관통방지).
// 매트margin은 텍스처 내부 여백으로 표현(artworkImageMaterial). frameless는 fW=0(백킹 전면).
export function artworkCanvasDims(style, W, H) {
  const fW = FRAME_FW[style] || 0;
  return { cw: Math.max(0.1, W - 2 * fW - 0.02), ch: Math.max(0.1, H - 2 * fW - 0.02) };
}
// 매트보드 여백(변당). frameless는 매트 없음(0). 디자이너 실측.
export function matteMarginFor(style, W, H) {
  if (style === 'frameless') return 0;
  return Math.min(0.14, Math.max(0.04, Math.min(W, H) * 0.08));
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
// 늘어진 로프/체인 — catenary(y=a·cosh(x/a)) 근사를 세그먼트 체인(alignedCyl N개)으로 표현.
// a는 목표 처짐(sag)에서 역산(얕은 처짐 근사식). seed 지정 시 세그먼트 두께를 결정적으로 미세
// 변주(수제 로프 느낌) — 배치3 스탠션 로프에 사용, 다른 늘어짐 표현에도 재사용 가능.
function catenaryChain(fromX, toX, topY, sag, segs, r0, r1, seed) {
  const half = (toX - fromX) / 2, a = Math.max(0.12, (half * half) / (2 * Math.max(0.02, sag))), midX = (fromX + toX) / 2;
  const rnd = seed != null ? seeded(seed) : null;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, x = THREE.MathUtils.lerp(fromX, toX, t), xr = x - midX;
    pts.push(new THREE.Vector3(x, topY - a * (Math.cosh(xr / a) - 1), 0));
  }
  const pieces = [];
  for (let i = 0; i < segs; i++) {
    const j = rnd ? 1 + (rnd() - 0.5) * 0.16 : 1;
    pieces.push([alignedCyl(r0 * j, r1 * j, pts[i], pts[i + 1], 6), null]);
  }
  return pieces;
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
// 주름 커튼 시트(#43) — flutedShaft 수기 BufferGeometry를 폭방향 사인파로 치환. folds 겹주름 + 바닥 개더(Wt)·상단 진폭감쇠(amp).
function drapeSheet(w, h, d, { folds = 6, segsPerFold = 4, hs = 5 } = {}) {
  const RS = folds * segsPerFold, y0 = -h / 2, pos = [], uv = [], idx = [];
  const lerp = (a, b, t) => a + (b - a) * t;
  for (let j = 0; j <= hs; j++) {
    const t = j / hs, y = lerp(y0, h / 2, t), Wt = lerp(1.06, 0.90, t), amp = lerp(1.0, 0.8, t);
    for (let i = 0; i <= RS; i++) {
      const u = i / RS;
      pos.push((u - 0.5) * w * Wt, y, d * 0.42 * amp * Math.sin(folds * u * Math.PI)); // 폭 사인파=주름
      uv.push(u, t);
    }
  }
  const stride = RS + 1;
  for (let j = 0; j < hs; j++) for (let i = 0; i < RS; i++) {
    const a = j * stride + i, b = a + 1, c = a + stride, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  // 상/하단 캡(오픈 가장자리 팬) — 열린 시트 뒷면 관통 방지(flutedShaft 캡 계승)
  const topBase = hs * stride;
  const cb = pos.length / 3; pos.push(0, y0, 0); uv.push(0.5, 0);
  for (let i = 0; i < RS; i++) idx.push(cb, i, i + 1);
  const ct = pos.length / 3; pos.push(0, h / 2, 0); uv.push(0.5, 1);
  for (let i = 0; i < RS; i++) idx.push(ct, topBase + i + 1, topBase + i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); // box/cyl과 attribute 일치(merge 요건)
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
export function partGeo(t, opts) {
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
    case 'bigplant': { // 대형 관엽 화분 — 화분+굵은 줄기(단일 테라코타), 잎은 accent(정점색 그린 그라데이션)
      const potH = h * 0.24, potTopY = -h / 2 + potH;
      const trunkTopY = h * 0.05, trunkH = trunkTopY - potTopY, trunkCY = potTopY + trunkH / 2;
      return merged([
        [cyl(w * 0.30, w * 0.38, 0.05, 18), [0, -h / 2 + 0.025, 0]],
        [cyl(w * 0.44, w * 0.34, potH - 0.09, 18), [0, -h / 2 + 0.05 + (potH - 0.09) / 2, 0]],
        [cyl(w * 0.46, w * 0.44, 0.05, 18), [0, potTopY - 0.025, 0]],
        [cyl(0.045, 0.07, trunkH, 10), [0, trunkCY, 0]],
      ]);
    }
    case 'palm': { // 키 큰 야자/드라세나 — 화분+캐인 3(높이 변주, 단일 테라코타), 잎다발은 accent(정점색)
      const potH = h * 0.14, potTopY = -h / 2 + potH;
      const canes = [
        { x: -w * 0.12, z: w * 0.06, topY: h * 0.40, r: 0.028 },
        { x: w * 0.10, z: -w * 0.08, topY: h * 0.30, r: 0.024 },
        { x: w * 0.02, z: w * 0.14, topY: h * 0.46, r: 0.022 },
      ];
      const parts = [
        [cyl(w * 0.28, w * 0.36, 0.05, 16), [0, -h / 2 + 0.025, 0]],
        [cyl(w * 0.40, w * 0.32, potH - 0.08, 16), [0, -h / 2 + 0.05 + (potH - 0.08) / 2, 0]],
        [cyl(w * 0.42, w * 0.40, 0.05, 16), [0, potTopY - 0.025, 0]],
      ];
      canes.forEach((c) => {
        const from = new THREE.Vector3(c.x * 0.4, potTopY, c.z * 0.4), to = new THREE.Vector3(c.x, c.topY, c.z);
        parts.push([alignedCyl(c.r * 0.8, c.r, from, to, 8), null]);
      });
      return merged(parts);
    }
    case 'hangplant': { // 행잉 플랜터 — 고리+체인+바스켓(단일 라탄톤), 늘어지는 덩굴은 accent(정점색)
      const hookY = h / 2 - 0.02, basketTopY = h / 2 - 0.14, basketH = 0.14;
      return merged([
        [cyl(0.012, 0.012, 0.02, 8), [0, hookY, 0]],
        [alignedCyl(0.006, 0.006, new THREE.Vector3(0, hookY - 0.01, 0), new THREE.Vector3(0, basketTopY + 0.02, 0), 6), null],
        [cyl(w * 0.30, w * 0.40, basketH, 16), [0, basketTopY - basketH / 2, 0]],
        [cyl(w * 0.32, w * 0.32, 0.025, 16), [0, basketTopY, 0]],
      ]);
    }
    case 'succulent': { // 미니 다육 화분 — 작은 테라코타 포트(단일), 다육·선인장 군집은 accent(정점색)
      const footH = 0.025, bodyH = 0.09, rimH = 0.02;
      return merged([
        [cyl(w * 0.34, w * 0.42, footH, 14), [0, -h / 2 + footH / 2, 0]],
        [cyl(w * 0.46, w * 0.40, bodyH, 14), [0, -h / 2 + footH + bodyH / 2, 0]],
        [cyl(w * 0.48, w * 0.46, rimH, 14), [0, -h / 2 + footH + bodyH + rimH / 2, 0]],
      ]);
    }
    case 'vase': { // 화병 — Lathe 프로필(단일 유광 세라믹), 부케는 accent(정점색, 화환 꽃 팔레트 재사용)
      const vaseH = h * 0.62;
      const V = (r, y) => new THREE.Vector2(r, y);
      const g = new THREE.LatheGeometry([
        V(0.01, -vaseH / 2), V(w * 0.22, -vaseH / 2 + 0.02), V(w * 0.34, -vaseH * 0.18),
        V(w * 0.30, vaseH * 0.10), V(w * 0.14, vaseH * 0.34), V(w * 0.17, vaseH * 0.42), V(w * 0.15, vaseH * 0.46),
      ], 20);
      g.translate(0, -h / 2 + vaseH / 2, 0);
      return g;
    }
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
    case 'artwork': { // 자동 액자: style·동적 W/H(opts). opts 없으면 minimal·고정 1.2×1.6(팔레트 썸네일 폴백)
      const style = (opts && opts.style) || 'minimal';
      const W = (opts && opts.w) || w, H = (opts && opts.h) || h, D = (opts && opts.d) || d;
      return artworkFrameGeo(style, W, H, D);
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
    case 'floorlamp': { // 플로어 스탠드 조명 — 트라이포드 다리 + 폴(다크메탈). 갓은 accent(emissive, 실제 광원 0).
      const apex = new THREE.Vector3(0, -h / 2 + 0.30, 0);
      const feet = [
        new THREE.Vector3(-w * 0.46, -h / 2, w * 0.32),
        new THREE.Vector3(w * 0.46, -h / 2, w * 0.32),
        new THREE.Vector3(0, -h / 2, -w * 0.50),
      ];
      const poleTop = new THREE.Vector3(0, h * 0.30, 0);
      return merged([
        ...feet.map((f) => [alignedCyl(0.016, 0.024, apex, f, 8), null]),
        [cyl(0.03, 0.03, 0.05, 10), [apex.x, apex.y, apex.z]], // 다리 조인트 캡
        [alignedCyl(0.016, 0.016, apex, poleTop, 8), null],    // 폴
      ]);
    }
    case 'stanchion': { // 벨벳 로프 스탠션 — 브라스 기둥 2개(베이스+테이퍼 샤프트+넥칼라+볼 피니얼). 로프는 accent(벨벳, catenary).
      const px = w / 2 - 0.06;
      const post = (x) => merged([
        [cyl(0.05, 0.056, 0.03, 14), [x, -h / 2 + 0.015, 0]],
        [cyl(0.024, 0.030, h - 0.20, 16), [x, -h / 2 + 0.03 + (h - 0.20) / 2, 0]],
        [cyl(0.032, 0.032, 0.025, 14), [x, h / 2 - 0.155, 0]],
        [new THREE.SphereGeometry(0.042, 12, 10), [x, h / 2 - 0.08, 0]],
      ]);
      return merged([[post(-px), null], [post(px), null]]);
    }
    case 'mirror': { // 스탠딩 전신 거울 — 브라스 프레임(4바 박스 링 — ExtrudeGeometry는 non-indexed라 box/cyl과 merge 불가, BLOCKER 회피) + 뒷받침 다리. 거울면은 accent.
      const mH = h * 0.80, ow = w / 2, oh = mH / 2, fW = 0.045, fd2 = 0.045;
      const frameCY = -h / 2 + 0.12 + oh; // 베이스 플린스(0.12) 위에 프레임 하단이 얹힘 — accent 'mirror'와 반드시 동일 식
      const baseY = -h / 2 + 0.03;
      const legFrom = new THREE.Vector3(0, -h / 2 + 0.09, -d / 2 * 0.7);
      const legTo = (sx) => new THREE.Vector3(sx * ow * 0.55, frameCY - oh * 0.45, -fd2 / 2 - 0.01);
      return merged([
        [box(w, fW, fd2), [0, frameCY + oh - fW / 2, 0]],              // 상단 바
        [box(w, fW, fd2), [0, frameCY - oh + fW / 2, 0]],              // 하단 바
        [box(fW, mH - fW * 2, fd2), [-ow + fW / 2, frameCY, 0]],       // 좌측 바
        [box(fW, mH - fW * 2, fd2), [ow - fW / 2, frameCY, 0]],        // 우측 바
        [box(w * 0.5, 0.06, d), [0, baseY, 0]],                       // 베이스 플린스
        [alignedCyl(0.02, 0.024, legFrom, legTo(-1), 8), null],       // 뒷받침 다리 좌
        [alignedCyl(0.02, 0.024, legFrom, legTo(1), 8), null],        // 뒷받침 다리 우
      ]);
    }
    case 'sign': { // 안내 스탠드 — A자형 이젤(우드). 사인 보드는 accent(크림).
      const apex = new THREE.Vector3(0, h * 0.42, d * 0.06);
      const flFront = new THREE.Vector3(-w * 0.34, -h / 2, d * 0.30), frFront = new THREE.Vector3(w * 0.34, -h / 2, d * 0.30);
      const flBack = new THREE.Vector3(-w * 0.20, -h / 2, -d * 0.34), frBack = new THREE.Vector3(w * 0.20, -h / 2, -d * 0.34);
      return merged([
        [alignedCyl(0.018, 0.024, apex, flFront, 8), null], [alignedCyl(0.018, 0.024, apex, frFront, 8), null],
        [alignedCyl(0.016, 0.020, apex, flBack, 8), null], [alignedCyl(0.016, 0.020, apex, frBack, 8), null],
        [cyl(0.03, 0.03, 0.04, 10), [apex.x, apex.y, apex.z]],        // 힌지 캡
        [box(0.03, 0.02, d * 0.5), [0, -h / 2 + 0.01, -d * 0.02]],    // 안정화 크로스브레이스
      ]);
    }
    case 'railing': { // 난간 — 1m 세그먼트 발루스터(브라스): 양끝 포스트 + 상/중 레일 + 세로 살 4.
      const postR = 0.024, floorY = -h / 2, topY = h / 2 - 0.02, botY = -h / 2 + h * 0.22;
      const xL = -w / 2 + 0.02, xR = w / 2 - 0.02;
      const parts = [
        [alignedCyl(postR, postR, new THREE.Vector3(xL, floorY, 0), new THREE.Vector3(xL, topY, 0), 10), null],
        [alignedCyl(postR, postR, new THREE.Vector3(xR, floorY, 0), new THREE.Vector3(xR, topY, 0), 10), null],
        [alignedCyl(0.020, 0.020, new THREE.Vector3(xL, topY, 0), new THREE.Vector3(xR, topY, 0), 10), null],
        [alignedCyl(0.015, 0.015, new THREE.Vector3(xL, botY, 0), new THREE.Vector3(xR, botY, 0), 10), null],
      ];
      const N = 5;
      for (let i = 1; i < N; i++) { const x = THREE.MathUtils.lerp(xL, xR, i / N); parts.push([cyl(0.010, 0.010, topY - floorY - 0.02, 8), [x, (topY + floorY) / 2 + 0.01, 0]]); }
      return merged(parts);
    }
    case 'lounge': { // 라운지 소파 — 월넛 프레임(다리4+팔걸이 윙2+베이스 데크). 쿠션은 accent(정점색 패브릭, 아래 lDeck 상수는 accent와 동일해야 함).
      const legH = 0.11, legR = 0.030;
      const lx = w / 2 - 0.09, lz = d / 2 - 0.08;
      const leg = (x, z) => [cyl(legR, legR * 0.72, legH, 10), [x, -h / 2 + legH / 2, z]];
      const armW = 0.14, armH = h * 0.60, armY = -h / 2 + legH + armH / 2;
      const deckY = -h / 2 + legH + 0.03;
      return merged([
        leg(-lx, lz), leg(lx, lz), leg(-lx, -lz), leg(lx, -lz),
        [box(armW, armH, d - 0.04), [-(w / 2 - armW / 2), armY, 0]],
        [box(armW, armH, d - 0.04), [(w / 2 - armW / 2), armY, 0]],
        [box(w - armW * 2 + 0.03, 0.05, d - 0.06), [0, deckY, 0]], // 쿠션 아래 데크(살짝 보임)
      ]);
    }
    case 'reception': { // 안내데스크 — 전면 패널(우드, Shape+Extrude로 살짝 볼록). 플린스·상판은 accent(box 2톤 — Extrude는 box와 merge 불가라 분리, mirror 부재와 동일 회피 규율).
      const bw = w / 2 - 0.02, bd = d / 2, bow = 0.05; // bow=전면 볼록량
      const shape = new THREE.Shape();
      shape.moveTo(-bw, -bd); shape.quadraticCurveTo(0, -bd - bow, bw, -bd);
      shape.lineTo(bw, bd); shape.lineTo(-bw, bd); shape.lineTo(-bw, -bd);
      const bodyH = h - 0.09; // 상판(0.05, accent)+베이스 플린스(0.04, accent) 제외
      const body = new THREE.ExtrudeGeometry(shape, { depth: bodyH, bevelEnabled: false, steps: 1 });
      body.rotateX(-Math.PI / 2); body.translate(0, -h / 2 + 0.04, 0);
      return body;
    }
    case 'window': { // 벽걸이 창 — 네모 프레임(4바)+십자 멀리언+하단 창틀(sill), 전부 box(화이트 트림). 유리는 accent(opacity+옅은 emissive).
      const fW = 0.06, fd2 = d * 0.5, ow = w / 2, oh = h / 2;
      return merged([
        [box(w, fW, fd2), [0, oh - fW / 2, 0]],                          // 상단 바
        [box(w, fW, fd2), [0, -oh + fW / 2, 0]],                         // 하단 바
        [box(fW, h - fW * 2, fd2), [-ow + fW / 2, 0, 0]],                // 좌측 바
        [box(fW, h - fW * 2, fd2), [ow - fW / 2, 0, 0]],                 // 우측 바
        [box(0.028, h - fW * 2, fd2 * 0.7), null],                      // 세로 멀리언
        [box(w - fW * 2, 0.028, fd2 * 0.7), null],                      // 가로 멀리언
        [box(w + 0.05, fW * 0.75, fd2 * 1.3), [0, -oh - fW * 0.32, 0]], // 하단 창틀(sill) — 살짝 돌출
      ]);
    }
    case 'glasspanel': { // 유리 파티션 — 얇은 브라스 프레임(양끝 포스트+상하 레일), 1m 세그먼트. 유리는 accent(반투명 opacity, transmission 금지).
      const postW = 0.03, railH = 0.04, px = w / 2 - postW / 2;
      return merged([
        [box(postW, h, d), [-px, 0, 0]], [box(postW, h, d), [px, 0, 0]],
        [box(w, railH, d), [0, h / 2 - railH / 2, 0]],
        [box(w, railH, d), [0, -h / 2 + railH / 2, 0]],
      ]);
    }
    case 'stool': { // 스툴 — 원형 좌판(월넛) + 3다리 트라이포드(살짝 벌어짐). 패드는 accent(정점색, 라운지 팔레트 공유).
      const seatH = 0.05, legR = 0.018;
      const apex = new THREE.Vector3(0, h / 2 - seatH - 0.02, 0);
      const R = w * 0.42;
      const feet = [0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * R, -h / 2, Math.sin(a) * R); });
      return merged([
        [cyl(w * 0.5, w * 0.48, seatH, 20), [0, h / 2 - seatH / 2, 0]], // 좌판
        ...feet.map((f) => [alignedCyl(legR, legR * 1.3, apex, f, 8), null]),
        [cyl(legR * 1.6, legR * 1.6, 0.035, 10), [apex.x, apex.y, apex.z]], // 조인트 캡
      ]);
    }
    case 'arch': { // 통행 아치 개구부(#43) — 사각 outer + 반원머리 hole ExtrudeGeometry(artworkFrameGeo 계열 재사용)
      const jambW = 0.18, halfOpenW = (w - 2 * jambW) / 2, springY = -h / 2 + h * 0.62; // apex = springY + halfOpenW(absarc 반경으로 자동)
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2); shape.lineTo(-w / 2, h / 2); shape.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-halfOpenW, -h / 2);
      hole.lineTo(-halfOpenW, springY);
      hole.absarc(0, springY, halfOpenW, Math.PI, 0, true); // 반원머리(왼→apex→오른, 위로 볼록)
      hole.lineTo(halfOpenW, -h / 2);
      hole.closePath();
      shape.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.01, bevelSegments: 2, steps: 1 });
      g.translate(0, 0, -d / 2); return g;
    }
    case 'rug': { // 러그(#56) — underlay + pile 머지(body). 색은 인스턴스 틴트(setColorAt), 보더는 partAccent.
      const variant = (opts && opts.variant) || 'rect';
      const pileY = -h / 2 + 0.010 + (h - 0.010) / 2;
      if (variant === 'round') {
        const R = Math.min(w, d) / 2;
        return merged([
          [cyl(R, R, 0.010, 32), [0, -h / 2 + 0.005, 0]],
          [cyl(R - 0.03, R - 0.03, h - 0.010, 32), [0, pileY, 0]],
        ]);
      }
      return merged([
        [box(w, 0.010, d), [0, -h / 2 + 0.005, 0]],
        [box(w - 0.03, h - 0.010, d - 0.03), [0, pileY, 0]],
      ]);
    }
    case 'wallPanel': // 무릎높이 커브 프로파일(#43) — base/body/cap 3단(cap 양옆 오버행 립)
      return merged([
        [box(w, 0.03, d), [0, -h / 2 + 0.015, 0]],
        [box(w - 0.02, h - 0.055, d), [0, -h / 2 + 0.03 + (h - 0.055) / 2, 0]],
        [box(w + 0.02, 0.025, d), [0, h / 2 - 0.0125, 0]],
      ]);
    case 'floorTile': // 그라우트 조인트(0.015 마진) + 베벨탑(#43)
      return merged([
        [box(w, h * 0.55, d), [0, -h / 2 + h * 0.275, 0]],
        [box(w - 0.03, h * 0.45, d - 0.03), [0, -h / 2 + h * 0.55 + h * 0.225, 0]],
      ]);
    case 'ceilingPanel': { // flat/coffer(#43) — 스텝박스 겹침으로 리세스 착시(아래에서만 보임, Extrude+hole 불필요)
      const variant = (opts && opts.variant) || 'flat';
      if (variant === 'coffer') {
        return merged([
          [box(w, 0.09, d), [0, h / 2 - 0.045, 0]],
          [box(w - 0.20, 0.03, d - 0.20), [0, h / 2 - 0.02, 0]],
        ]);
      }
      return merged([
        [box(w, 0.05, d), [0, h / 2 - 0.025, 0]],
        [box(w - 0.16, 0.03, d - 0.16), [0, h / 2 - 0.015, 0]],
      ]);
    }
    case 'partition': { // 프레임(stile×2 + rail×2) + 인셋 패널(#43)
      const sx = w / 2 - 0.045, ry2 = h / 2 - 0.045;
      return merged([
        [box(0.09, h, d), [-sx, 0, 0]], [box(0.09, h, d), [sx, 0, 0]],
        [box(w - 0.18, 0.09, d), [0, ry2, 0]], [box(w - 0.18, 0.09, d), [0, -ry2, 0]],
        [box(w - 0.22, h - 0.22, d * 0.55), [0, 0, 0]],
      ]);
    }
    case 'drape': { // 주름 커튼(#43) — 파형 시트 + 로드포켓(x축 원통). 색은 인스턴스 틴트.
      const sheet = drapeSheet(w, h, d);
      const pocket = cyl(0.025, 0.025, w * 0.98, 8); pocket.rotateZ(Math.PI / 2);
      return merged([[sheet, null], [pocket, [0, h / 2 - 0.03, 0]]]);
    }
    default: return box(w, h, d);
  }
}
// 2색 accent(부속 색면) — 파츠 위에 얹는 장식(픽킹 대상 아님). off는 ry로 회전.
// opts.variant/opts.mat: 배리언트별 accent 분기(#56 rug round/rect 등).
export function partAccent(t, opts) {
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
    case 'bigplant': { // 넓은 파들형 잎 — 줄기 상단을 따라 높이·각도를 흩어 부착(정점색 그린 그라데이션).
      // seeded 지터로 비대칭 배치 — 균등 방사(로제트/꽃 형태로 오독)를 피하고 자연스러운 관엽 캐노피로.
      const trunkTopY = h * 0.05;
      const N = 7, pieces = [];
      const rnd = seeded(43);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + rnd() * 0.6;
        const tilt = 0.45 + rnd() * 0.55;               // 26°~57° — 어린잎(꼿꼿)·늘어진 잎 혼재
        const len = w * (0.60 + rnd() * 0.22);
        const attachY = trunkTopY + rnd() * (h * 0.10);  // 부착 높이도 변주(단일점 방사 방지)
        const leaf = new THREE.SphereGeometry(len * 0.5, 8, 6); leaf.scale(0.40 + rnd() * 0.08, 1, 0.15);
        leaf.translate(0, len * 0.44, 0); leaf.rotateX(tilt); leaf.rotateY(a);
        paintGeo(leaf, FOLIAGE_PALETTE[i % FOLIAGE_PALETTE.length]);
        pieces.push([leaf, [0, attachY, 0]]);
      }
      return { geo: merged(pieces), mat: 'foliage', off: [0, 0, 0] };
    }
    case 'palm': { // 캐인 상단마다 뾰족한 잎다발(스트랩형) 버스트 — 정점색 세이지 그라데이션
      const canes = [
        { x: -w * 0.12, z: w * 0.06, topY: h * 0.40 },
        { x: w * 0.10, z: -w * 0.08, topY: h * 0.30 },
        { x: w * 0.02, z: w * 0.14, topY: h * 0.46 },
      ];
      const pieces = [];
      canes.forEach((c, ci) => {
        const M = 10;
        for (let i = 0; i < M; i++) {
          const a = (i / M) * Math.PI * 2 + ci * 0.5;
          const len = w * (0.5 + (i % 3) * 0.08);
          const blade = box(0.045, len, 0.01);
          blade.translate(0, len * 0.5, 0); blade.rotateX(0.9 + (i % 2) * 0.15); blade.rotateY(a);
          paintGeo(blade, FOLIAGE_PALETTE[(i + ci) % FOLIAGE_PALETTE.length]);
          pieces.push([blade, [c.x, c.topY, c.z]]);
        }
      });
      return { geo: merged(pieces), mat: 'foliage', off: [0, 0, 0] };
    }
    case 'hangplant': { // 바스켓 밑에서 늘어지는 덩굴 6가닥 — 마디마다 작은 잎(정점색), seeded로 결정론적 변주
      const basketBotY = h / 2 - 0.28;
      const pieces = [];
      const V = 6, rnd = seeded(37);
      for (let v = 0; v < V; v++) {
        const a = (v / V) * Math.PI * 2 + rnd() * 0.4;
        const r0 = w * 0.22;
        const vineLen = (h * 0.60) * (0.75 + rnd() * 0.4);
        const segs = 5;
        let px = Math.cos(a) * r0, py = basketBotY, pz = Math.sin(a) * r0;
        for (let s = 0; s < segs; s++) {
          const t1 = (s + 1) / segs;
          const sway = Math.sin(t1 * 3.1 + v) * 0.05;
          const nx = Math.cos(a) * r0 * (1 - t1 * 0.6) + sway, nz = Math.sin(a) * r0 * (1 - t1 * 0.6) + sway * 0.6;
          const ny = basketBotY - vineLen * t1;
          const stem = alignedCyl(0.006, 0.008, new THREE.Vector3(px, py, pz), new THREE.Vector3(nx, ny, nz), 5);
          paintGeo(stem, FOLIAGE_PALETTE[0]); pieces.push([stem, null]);
          const leaf = new THREE.SphereGeometry(0.022 + rnd() * 0.012, 6, 5); leaf.scale(1, 0.55, 1.3);
          paintGeo(leaf, FOLIAGE_PALETTE[1 + (s % (FOLIAGE_PALETTE.length - 1))]);
          leaf.translate(nx + (rnd() - 0.5) * 0.03, ny, nz + (rnd() - 0.5) * 0.03);
          pieces.push([leaf, null]);
          px = nx; py = ny; pz = nz;
        }
      }
      return { geo: merged(pieces), mat: 'foliage', off: [0, 0, 0] };
    }
    case 'succulent': { // 로제트·배럴·스파이어 3종 군집 + 작은 꽃 포인트(정점색)
      const potTopY = -h / 2 + 0.025 + 0.09 + 0.02;
      const pieces = [];
      // 3종을 좌·우·중앙뒤(더 큰 원주형)로 벌리고 색도 뚜렷이 갈라 정면에서도 셋이 구분되게
      // (검수: 스파이어가 배럴과 색·위치 둘 다 비슷해 하나로 오독 — 색 대비·간격 확대로 수정)
      const rosette = new THREE.SphereGeometry(0.07, 8, 6); rosette.scale(1, 0.46, 1); paintGeo(rosette, FOLIAGE_PALETTE[2]);
      pieces.push([rosette, [-w * 0.26, potTopY + 0.032, w * 0.12]]);
      const barrelBody = cyl(0.055, 0.06, 0.09, 10); paintGeo(barrelBody, FOLIAGE_PALETTE[0]);
      pieces.push([barrelBody, [w * 0.24, potTopY + 0.045, w * 0.10]]);
      const barrelCap = new THREE.SphereGeometry(0.058, 8, 6); barrelCap.scale(1, 0.5, 1); paintGeo(barrelCap, FOLIAGE_PALETTE[0]);
      pieces.push([barrelCap, [w * 0.24, potTopY + 0.09, w * 0.10]]);
      const spireBody = cyl(0.032, 0.038, 0.17, 8); paintGeo(spireBody, FOLIAGE_PALETTE[3]); // 밝은 올리브 — 배럴(진초록)과 색 대비
      pieces.push([spireBody, [0, potTopY + 0.085, -w * 0.26]]);
      const spireCap = new THREE.SphereGeometry(0.034, 7, 5); paintGeo(spireCap, FOLIAGE_PALETTE[3]);
      pieces.push([spireCap, [0, potTopY + 0.17, -w * 0.26]]);
      const bloom = new THREE.SphereGeometry(0.012, 6, 5); paintGeo(bloom, FESTIVE_FLOWER_PALETTE[0]);
      pieces.push([bloom, [w * 0.24, potTopY + 0.135, w * 0.10]]);
      return { geo: merged(pieces), mat: 'foliage', off: [0, 0, 0] };
    }
    case 'vase': { // 화병목에서 방사하는 조화 부케 — 줄기(초록)+파스텔 꽃송이(배치1 화환 팔레트 재사용)
      const vaseH = h * 0.62, neckTopY = -h / 2 + vaseH * 0.92;
      const pieces = [];
      const N = 11, rnd = seeded(19);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const spread = 0.30 + rnd() * 0.40;
        const stemLen = h * (0.16 + rnd() * 0.14);
        const tipDir = new THREE.Vector3(Math.cos(a) * spread, 1, Math.sin(a) * spread).normalize();
        const from = new THREE.Vector3(0, neckTopY, 0);
        const to = new THREE.Vector3().copy(from).addScaledVector(tipDir, stemLen);
        const stem = alignedCyl(0.005, 0.007, from, to, 5); paintGeo(stem, FOLIAGE_PALETTE[0]);
        pieces.push([stem, null]);
        const bloom = new THREE.SphereGeometry(0.024 + rnd() * 0.012, 7, 6);
        paintGeo(bloom, FESTIVE_FLOWER_PALETTE[i % FESTIVE_FLOWER_PALETTE.length]);
        pieces.push([bloom, [to.x, to.y, to.z]]);
      }
      return { geo: merged(pieces), mat: 'festive', off: [0, 0, 0] };
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
    case 'rug': { // 러그 보더(#56) — variant 분기(rect box / round cyl) + 인스턴스 색 틴트(본체색 35% 화이트 블렌드)
      const variant = (opts && opts.variant) || 'rect';
      if (variant === 'round') {
        const R = Math.min(w, d) / 2;
        return { geo: cyl(R - 0.16, R - 0.16, 0.021, 32), mat: 'rugTint', off: [0, 0.006, 0], tint: 'rugAccent' };
      }
      return { geo: box(w - 0.16, 0.021, d - 0.16), mat: 'rugTint', off: [0, 0.006, 0], tint: 'rugAccent' };
    }
    case 'wreath': { // 잎·꽃·리본 — 링 프레임(body) 위에 얹는 다색 오버레이(정점색, 개업 축하 톤 — 성탄 리스 배색 지양)
      const RC = new THREE.Vector3(0, h * 0.30, -d * 0.05);
      const ringR = w * 0.40;
      const leafGreen = 0x3d5a3a;
      const flowerPalette = FESTIVE_FLOWER_PALETTE; // 블러시·크림·샌드·세이지 파스텔(꽃 위주 — 잎은 사이사이 소량만). 배치2 vase와 공유.
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
    case 'floorlamp': { // 벨(드럼) 갓 — Lathe, emissive 'lens' 재질로 "켜진" 느낌(실제 THREE.Light 0).
      const V = (r, y) => new THREE.Vector2(r, y);
      const shadeH = h * 0.24;
      const shade = new THREE.LatheGeometry([V(0.02, -shadeH * 0.5), V(w * 0.30, -shadeH * 0.5), V(w * 0.34, -shadeH * 0.10), V(w * 0.30, shadeH * 0.40), V(w * 0.26, shadeH * 0.5)], 18);
      return { geo: shade, mat: 'lens', off: [0, h * 0.30 + shadeH * 0.48, 0] }; // poleTop(h*0.30) 바로 위 — partGeo 'floorlamp'와 정합
    }
    case 'stanchion': { // 로프 — catenary 처짐(볼 피니얼 바로 아래 부착). 기둥 x/높이 식은 partGeo 'stanchion'과 반드시 동일.
      const px = w / 2 - 0.06;
      const ropeY = h / 2 - 0.115; // 피니얼(중심 h/2-0.08, 반경 0.042) 바로 아래
      const pieces = catenaryChain(-px, px, ropeY, 0.11, 14, 0.010, 0.010, 61);
      return { geo: merged(pieces), mat: 'velvet', off: [0, 0, 0] };
    }
    case 'mirror': { // 거울면 — 프레임 홀 안쪽(실제 반사 없이 밝은 유광+하늘빛). frameCY 식은 partGeo 'mirror'와 반드시 동일.
      const mH = h * 0.80, oh = mH / 2, fW = 0.045, fd2 = 0.045;
      const iw = w / 2 - fW, ih = oh - fW;
      const frameCY = -h / 2 + 0.12 + oh;
      return { geo: box(iw * 2 - 0.01, ih * 2 - 0.01, 0.01), mat: 'mirror', off: [0, frameCY, fd2 / 2 - 0.004] };
    }
    case 'sign': { // 사인 보드 — 이젤 다리 사이, 살짝 기울여(가독성) 크림 마감(배너와 동일 재질 재사용).
      const board = box(w * 0.86, h * 0.5, 0.018); board.rotateX(-0.18);
      return { geo: board, mat: 'bannerCloth', off: [0, h * 0.14, d * 0.24] };
    }
    case 'lounge': { // 좌석 쿠션2+웰트 트림 + 등받이 쿠션2(롤톱 볼스터) + 스로우 필로2 — 정점색 패브릭(LOUNGE_PALETTE). legH/armW은 partGeo와 반드시 동일.
      const legH = 0.11, armW = 0.14;
      const deckTopY = -h / 2 + legH + 0.03 + 0.025; // 데크(partGeo) 상면
      const seatH = 0.16, seatD = d - 0.10, seatW = (w - armW * 2 - 0.04) / 2 - 0.01, seatY = deckTopY + seatH / 2;
      const backH = h * 0.58, backD = 0.16, backY = deckTopY + backH / 2; // 등받이는 좌석보다 높게(팔걸이보다도 살짝 높게 — 실제 소파 비례)
      const pieces = [];
      [-1, 1].forEach((side) => {
        const cx = side * (seatW / 2 + 0.01);
        const s = box(seatW, seatH, seatD); paintGeo(s, LOUNGE_PALETTE[0]);
        pieces.push([s, [cx, seatY, 0.01]]);
        const welt = box(seatW - 0.02, 0.02, 0.02); paintGeo(welt, LOUNGE_PALETTE[2]); // 앞단 웰트(피핑) 트림
        pieces.push([welt, [cx, seatY - seatH / 2 + 0.01, seatD / 2 + 0.005]]);
        const bk = box(seatW, backH, backD); paintGeo(bk, LOUNGE_PALETTE[0]); // 등받이 쿠션(좌석과 동일 폭 정렬)
        pieces.push([bk, [cx, backY, -d / 2 + backD / 2 + 0.015]]);
        const roll = cyl(backD * 0.42, backD * 0.42, seatW - 0.02, 12); roll.rotateZ(Math.PI / 2); paintGeo(roll, LOUNGE_PALETTE[0]); // 롤톱 볼스터(푹신함 디테일)
        pieces.push([roll, [cx, backY + backH / 2, -d / 2 + backD / 2 + 0.015]]);
      });
      [-1, 1].forEach((side) => { // 스로우 필로 — 백코너에 기대어 살짝 회전(디테일, 라이터 톤)
        const p = box(0.22, 0.20, 0.09); p.rotateY(side * 0.45); p.rotateZ(side * 0.10); paintGeo(p, LOUNGE_PALETTE[1]);
        pieces.push([p, [side * (w * 0.30), seatY + seatH * 0.5 + 0.06, -d * 0.18]]);
      });
      return { geo: merged(pieces), mat: 'lounge', off: [0, 0, 0] };
    }
    case 'reception': { // 상판(우드)+베이스 플린스(스톤) — 정점색 2톤(box만 merge, Extrude 전면 패널은 body에서 별도)
      const plinth = box(w, 0.04, d); plinth.translate(0, -h / 2 + 0.02, 0); paintGeo(plinth, 0xd9cdb6); // 스톤
      const slab = box(w + 0.04, 0.05, d + 0.06); slab.translate(0, h / 2 - 0.025, 0.02); paintGeo(slab, 0xb99a6f); // 우드(전면 볼록보다 살짝 오버행)
      return { geo: merged([[plinth, null], [slab, null]]), mat: 'reception', off: [0, 0, 0] };
    }
    case 'window': { // 유리 — opacity 반투명 + 옅은 emissive("빛 든" 느낌). fW은 partGeo와 반드시 동일.
      const fW = 0.06, iw = w / 2 - fW, ih = h / 2 - fW;
      return { geo: box(iw * 2 - 0.01, ih * 2 - 0.01, 0.01), mat: 'windowGlass', off: [0, 0, 0] };
    }
    case 'glasspanel': // 유리 면 — 반투명 opacity(케이스 vitrine과 동일 'glass' 재질 재사용, transmission 금지)
      return { geo: box(w - 0.08, h - 0.10, 0.012), mat: 'glass', off: [0, 0, 0] };
    case 'stool': { // 좌판 위 패브릭 패드 — 정점색(LOUNGE_PALETTE 공유, 라운지 세트와 통일감). 좌판 윗면(h/2)은 partGeo와 반드시 동일.
      const pad = cyl(w * 0.46, w * 0.46, 0.02, 20); paintGeo(pad, LOUNGE_PALETTE[0]);
      return { geo: pad, mat: 'lounge', off: [0, h / 2 + 0.01, 0] };
    }
    default: return null;
  }
}

// 작품 이미지 텍스처 — 파일 업로드 dataURL(data:)을 매트보드 배경 위에 contain(원본 종횡비 유지)으로
// 그려 CanvasTexture로 매핑. 외부 URL 0(자기완결·CSP img-src data: 준수). 이미지 로드는 비동기 —
// 완료 시 texture.needsUpdate + onAsyncTex()로 온디맨드 리렌더(빌더) 유도. 방문자뷰는 연속 루프라 자동 반영.
// dispose: 반환 material을 buildSpaceGroup의 mats에 등록 → disposeSpaceGroup이 map(CanvasTexture)·material 회수.
export function artworkImageMaterial(src, faceW, faceH, onAsyncTex, matteMargin = 0) {
  if (typeof document === 'undefined') return MATS.paper(); // 비-DOM 폴백(빈 캔버스 재질)
  const LONG = 1024; // 캔버스를 액자면(캔버스mesh) 종횡비에 맞춰(왜곡 방지) → UV 1:1 매핑
  const cw = faceW >= faceH ? LONG : Math.max(1, Math.round(LONG * faceW / faceH));
  const ch = faceH >= faceW ? LONG : Math.max(1, Math.round(LONG * faceH / faceW));
  // 매트 여백(월드 길이)을 캔버스 픽셀로 환산 → 이미지는 안쪽 가용영역에만 contain(사방 매트지 노출).
  const mmx = faceW > 0 ? cw * (matteMargin / faceW) : 0;
  const mmy = faceH > 0 ? ch * (matteMargin / faceH) : 0;
  const availW = Math.max(1, cw - 2 * mmx), availH = Math.max(1, ch - 2 * mmy);
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
    if (iw > 0 && ih > 0) { // contain: 매트 안쪽 가용영역 중앙, 남는 부분=매트보드
      const s = Math.min(availW / iw, availH / ih), dw = iw * s, dh = ih * s;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }
    tex.needsUpdate = true;
    if (onAsyncTex) { try { onAsyncTex(); } catch {} }
  };
  img.onerror = () => { if (onAsyncTex) { try { onAsyncTex(); } catch {} } }; // 로드 실패=매트보드만 유지
  img.src = src;
  return mat;
}
