import * as THREE from "three";
import { mergeGeometries } from "../utils/BufferGeometryUtils.js";
import { PART_TYPES, FRAME_RULES } from "./space.js";
import { createPlasterMaps, createParquetMaps, createConcreteMaps } from "./scene.js";
const _texCache = {};
function baseMaps(gen, key) {
  return _texCache[key] || (_texCache[key] = gen());
}
const _sharedMaps = {};
function sharedMaps(gen, key) {
  if (_sharedMaps[key]) return _sharedMaps[key];
  const base = baseMaps(gen, key);
  const mk = (src) => {
    const t = src.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    t.offset.set(0, 0);
    t.userData = { ...t.userData || {}, shared: true };
    t.needsUpdate = true;
    return t;
  };
  return _sharedMaps[key] = { map: mk(base.map), normalMap: base.normalMap ? mk(base.normalMap) : null };
}
function bakeUVRepeat(geo, rx, ry) {
  if (!geo || !geo.attributes || !geo.attributes.uv) return;
  const ud = geo.userData || (geo.userData = {});
  if (ud.uvRepeatBaked) return;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
  uv.needsUpdate = true;
  ud.uvRepeatBaked = true;
}
function warmBuildingTexCache() {
  if (typeof document === "undefined") return;
  baseMaps(createPlasterMaps, "plaster");
  baseMaps(createConcreteMaps, "concrete");
  baseMaps(parquetLite, "parquet");
}
// [P1 재질 캐시] 텍스처는 A-3에서 공유했지만 재질 인스턴스는 호출마다 새로 태어났다. three는 재질 단위로
// 파이프라인을 만들므로 파셀마다 조합이 무한 증식했다(실기기 CSV: 구조 키 35→116 계속 증가, 같은 키
// 재생성은 0~1 = 축출이 아니라 매번 새 키). 동일 파라미터 → 동일 인스턴스로 접는다.
// repeat을 키에 포함하는 이유: uvRepeat이 재질 userData에 실려 space-assembler가 그 값으로 지오 UV를 굽는다.
// 무조건 공유하면 치수가 다른 벽이 남의 repeat으로 구워져 텍스처 스케일이 틀어진다. 같은 파츠 타입은 표준
// 치수라 repeat이 같으므로 파셀 간 공유는 그대로 일어난다 — 지금 문제인 "파셀마다 새로 생성"이 이 지점이다.
const _matCache = {};
function texMat({ gen, key, tint = 16777215, repeat = [2, 2], normalScale = 0.4, roughness = 0.9, metalness = 0 }) {
  const q = (v) => Math.round(v * 1e4) / 1e4; // 부동소수 오차로 캐시가 갈리지 않게 양자화
  const ck = `${key}|${tint}|${q(repeat[0])}|${q(repeat[1])}|${q(normalScale)}|${q(roughness)}|${q(metalness)}`;
  const hit = _matCache[ck];
  if (hit) return hit;
  const { map, normalMap } = sharedMaps(gen, key);
  const mat = new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(normalScale, normalScale), color: new THREE.Color(tint), roughness, metalness });
  mat.userData.uvRepeat = [repeat[0], repeat[1]];
  mat.userData.shared = true; // 파셀 언로드가 파괴하지 않게(공유 텍스처와 같은 규약)
  return (_matCache[ck] = mat);
}
// [P1 후속 · 공유 재질 쓰기 규약] 캐시가 돌려준 공유 인스턴스를 "이 메시 전용"으로 분리한다.
// 라이트맵처럼 표면마다 내용이 달라야 하는 값은 공유 인스턴스에 쓸 수 없다 — 셸 벽은 북/남이 항상
// 같은 폭, 동/서가 항상 같은 폭이라 방 모양과 무관하게 언제나 같은 캐시 키다. 순차로 구우면 마지막
// 표면의 조명 패턴이 전부에 나타난다. map/normalMap 참조는 그대로 공유하므로 텍스처 메모리는 안 는다.
// 분리본은 shared 표식을 떼어 disposeSpaceGroup 회수 대상이 되게 하고, 호출자가 group.userData.mats에
// 등록할 책임을 진다. 새로 분리했을 때만 그 인스턴스를 반환한다(이미 전용이면 null).
function unshareMaterial(mesh) {
  const m = mesh && mesh.material;
  if (!m || !m.userData || !m.userData.shared || !m.clone) return null;
  const c = m.clone();
  c.userData = { ...m.userData, shared: false };
  mesh.material = c;
  return c;
}
const plasterTex = (tint, w, h) => texMat({ gen: createPlasterMaps, key: "plaster", tint, repeat: [Math.max(1, w / 2.5), Math.max(1, h / 2.5)], normalScale: 0.32, roughness: 0.92 });
const concreteTex = (tint, w, h) => texMat({ gen: createConcreteMaps, key: "concrete", tint, repeat: [Math.max(1, w / 2.5), Math.max(1, h / 2.5)], normalScale: 0.55, roughness: 0.9 });
const parquetLite = () => createParquetMaps({ size: 512, normal: false });
const parquetTex = (w, d) => texMat({ gen: parquetLite, key: "parquet", tint: 16777215, repeat: [Math.max(1, w / 2), Math.max(1, d / 2)], normalScale: 0.45, roughness: 0.5 });
function seeded(s) {
  return () => {
    s |= 0;
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function canvasTex(size, draw) {
  const c = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!c) return null;
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function grassTexGen() {
  return canvasTex(256, (x, S) => {
    const r = seeded(7);
    x.fillStyle = "#527f3d";
    x.fillRect(0, 0, S, S);
    for (let i = 0; i < 5200; i++) {
      const g = 90 + (r() * 80 | 0);
      x.fillStyle = `rgba(${44 + (r() * 26 | 0)},${g},${34 + (r() * 24 | 0)},${0.35 + r() * 0.4})`;
      x.beginPath();
      x.arc(r() * S, r() * S, 0.7 + r() * 1.4, 0, 6.29);
      x.fill();
    }
  });
}
function kintsugiTexGen() {
  return canvasTex(512, (x, S) => {
    const r = seeded(21);
    x.fillStyle = "#171317";
    x.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) {
      x.fillStyle = `rgba(${28 + (r() * 20 | 0)},${20 + (r() * 12 | 0)},${26 + (r() * 16 | 0)},0.22)`;
      x.beginPath();
      x.arc(r() * S, r() * S, 6 + r() * 42, 0, 6.29);
      x.fill();
    }
    const vein = (px, py, a, steps, w) => {
      for (let s = 0; s < steps; s++) {
        a += (r() - 0.5) * 0.6;
        const nx = px + Math.cos(a) * (9 + r() * 8), ny = py + Math.sin(a) * (9 + r() * 8);
        x.lineCap = "round";
        x.strokeStyle = "#c39a4a";
        x.lineWidth = w;
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(nx, ny);
        x.stroke();
        x.strokeStyle = "rgba(244,220,150,0.65)";
        x.lineWidth = Math.max(0.5, w * 0.4);
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(nx, ny);
        x.stroke();
        px = nx;
        py = ny;
        if (r() < 0.11 && w > 1.3 && steps - s > 4) vein(px, py, a + (r() < 0.5 ? 1 : -1) * 0.9, steps - s >> 1, w * 0.6);
      }
    };
    for (let k = 0; k < 5; k++) vein(r() * S, r() * S, r() * 6.29, 26 + (r() * 20 | 0), 2.2 + r() * 1.3);
  });
}
function waterTexGen() {
  return canvasTex(256, (x, S) => {
    const r = seeded(53);
    x.fillStyle = "#20505f";
    x.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++) {
      const y = r() * S, amp = 3 + r() * 9, k = 1 + (r() * 2 | 0), a = 0.04 + r() * 0.06;
      x.strokeStyle = `rgba(${150 + (r() * 40 | 0)},${205 + (r() * 40 | 0)},${210 + (r() * 30 | 0)},${a})`;
      x.lineWidth = 1 + r() * 1.6;
      x.beginPath();
      for (let px = 0; px <= S; px += 8) {
        const py = y + Math.sin(px / S * 6.2832 * k) * amp;
        if (px === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.stroke();
    }
    for (let i = 0; i < 1300; i++) {
      x.fillStyle = `rgba(205,236,240,${0.02 + r() * 0.05})`;
      x.beginPath();
      x.arc(r() * S, r() * S, 0.5 + r() * 1.1, 0, 6.2832);
      x.fill();
    }
  });
}
const _genCache = {};
const genTex = (key, gen) => key in _genCache ? _genCache[key] : _genCache[key] = gen();
function cloneRepeat(base, rx, ry) {
  if (!base) return null;
  const t = base.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}
const ART_SCREEN_CAP = 80;
const UNIQUE_TEX_TYPES = /* @__PURE__ */ new Set(["artwork", "screen"]);
const FESTIVE_FLOWER_PALETTE = [15186347, 15852745, 14930883, 12173984];
const FOLIAGE_PALETTE = [4020794, 5008198, 6191698, 7309918];
const LOUNGE_PALETTE = [11836805, 13482911, 9205856];
const SM = (o) => new THREE.MeshStandardMaterial(o);
const MATS = {
  plaster: () => SM({ color: 15854818, roughness: 0.92, metalness: 0 }),
  plasterW: () => SM({ color: 16777215, roughness: 0.92, metalness: 0 }),
  warmsand: () => SM({ color: 15128767, roughness: 0.9, metalness: 0 }),
  charcoal: () => SM({ color: 3816e3, roughness: 0.7, metalness: 0.1 }),
  deepviolet: () => SM({ color: 2828339, roughness: 0.9, metalness: 0 }),
  // 저채도 딥중립(작품 배경 규율 §3-6·팀장 조건①)
  frameBlack: () => SM({ color: 1513500, roughness: 0.88, metalness: 0 }),
  // 액자=매트 블랙(크롬 금지, 아트디렉션 스펙) — minimal 스타일
  frameWalnut: () => SM({ color: 4863011, roughness: 0.55, metalness: 0.05 }),
  // classic 스타일 외곽 몰딩(월넛톤, 단순화 채택: 라이너 생략 단일 재질)
  frameShadow: () => SM({ color: 1842206, roughness: 0.95 }),
  // frameless 스타일 백킹(링 없음·매트없음, 그림자 틴트)
  walnut: () => SM({ color: 7033144, roughness: 0.6, metalness: 0 }),
  // 벤치 시트(월넛) — 파케 바닥과 분리
  charcoalCloth: () => SM({ color: 2894896, roughness: 0.95, metalness: 0 }),
  // 드레이프 딥차콜
  clothInner: () => SM({ color: 14077111, roughness: 0.97, metalness: 0 }),
  // 러그 내부 필드(보더 대비)
  parquet: () => SM({ color: 12159571, roughness: 0.5, metalness: 0 }),
  terrazzo: () => SM({ color: 14209734, roughness: 0.55, metalness: 0 }),
  concrete: () => SM({ color: 9407880, roughness: 0.9, metalness: 0 }),
  grass: () => SM({ color: 5998406, roughness: 0.96, metalness: 0 }),
  // 텍스처 미가용(비-DOM) 폴백
  water: () => SM({ color: 2248799, roughness: 0.1, metalness: 0.18, envMapIntensity: 1.4 }),
  // Tier1: 정적 반사(스크롤=방문자뷰 플래그)
  darkmatte: () => SM({ color: 2500139, roughness: 0.85, metalness: 0 }),
  wood: () => SM({ color: 12163695, roughness: 0.6, metalness: 0 }),
  darkMetal: () => SM({ color: 2499615, roughness: 0.4, metalness: 0.75 }),
  brass: () => SM({ color: 12160330, roughness: 0.45, metalness: 0.6 }),
  bronze: () => SM({ color: 3945514, roughness: 0.35, metalness: 0.55 }),
  // 진열장 골조(놋쇠보다 어둡고 절제된 금속)
  stone: () => SM({ color: 14273974, roughness: 0.7, metalness: 0 }),
  // 기둥 재질 배리언트(#56) — concrete(index0)는 concreteTex 유지, 아래 3종은 pillar 전용 단색(디자이너 실측)
  pillarMarble: () => SM({ color: 15262680, roughness: 0.22, metalness: 0.05 }),
  pillarStone: () => SM({ color: 13088922, roughness: 0.85, metalness: 0 }),
  pillarWood: () => SM({ color: 7031344, roughness: 0.55, metalness: 0 }),
  // 러그 인스턴스 틴트(#56) — 흰색 base + InstancedMesh.setColorAt(instanceColor). 색 없으면 sand(#c9bfae) 폴백=기존 cloth와 동색(하위호환)
  rugTint: () => SM({ color: 16777215, roughness: 0.97, metalness: 0 }),
  drapeTint: () => SM({ color: 16777215, roughness: 0.95, metalness: 0 }),
  // 커튼 인스턴스 틴트(#43) — 흰색 base, 색 없으면 charcoal(#2c2c30) 폴백=기존 charcoalCloth 동색
  panelWood: () => SM({ color: 10254926, roughness: 0.5, metalness: 0 }),
  // 벽패널·파티션 wood 배리언트(#43)
  matteWhite: () => SM({ color: 15328991, roughness: 0.85, metalness: 0 }),
  darkScreen: () => SM({ color: 1315866, roughness: 0.5, metalness: 0.08 }),
  // 다크 매트 베젤(금속광 억제)
  terracotta: () => SM({ color: 10115907, roughness: 0.85, metalness: 0 }),
  plant: () => SM({ color: 4020794, roughness: 0.8, metalness: 0 }),
  cloth: () => SM({ color: 13221806, roughness: 0.97, metalness: 0 }),
  paper: () => SM({ color: 14210252, roughness: 0.9, metalness: 0 }),
  glass: () => SM({ color: 13625066, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.3 }),
  // 케이스 실루엣 가시성↑
  display: () => SM({ color: 1777194, roughness: 0.32, metalness: 0.2, emissive: 1053471, emissiveIntensity: 0.5 }),
  lens: () => SM({ color: 16774102, roughness: 0.3, metalness: 0.1, emissive: 16770736, emissiveIntensity: 0.6 }),
  // 이벤트 세트(배치1) 전용 — festive는 잎·꽃·리본·풍선 등 다색 accent 공용(정점색, base는 흰색이라 vertexColors 그대로 노출)
  festive: () => SM({ color: 16777215, roughness: 0.62, metalness: 0.04, vertexColors: true }),
  cakeCream: () => SM({ color: 16182489, roughness: 0.5, metalness: 0 }),
  // 케이크 프로스팅(버터크림)
  bannerCloth: () => SM({ color: 16117732, roughness: 0.72, metalness: 0 }),
  // 배너 면 — 크림/오프화이트(감독 지적: 칙칙한 카키 탈피, 밝고 깨끗하게)
  // 배치2(식물 다종화) 전용 — foliage는 잎·덩굴·다육 등 초록 계열 다색 accent 공용(정점색, matte)
  foliage: () => SM({ color: 16777215, roughness: 0.82, metalness: 0, vertexColors: true }),
  ceramic: () => SM({ color: 15525852, roughness: 0.28, metalness: 0.05 }),
  // 화병 — 유광 세라믹(테라코타 화분과 구분)
  // 배치3(구조·조명·장식) 전용
  velvet: () => SM({ color: 7021616, roughness: 0.82, metalness: 0 }),
  // 스탠션 로프 — 더스티 버건디 벨벳(매트 천)
  mirror: () => SM({ color: 14674672, roughness: 0.07, metalness: 0.22 }),
  // 거울면 — 실반사 없이 밝은 유광 + 살짝 하늘빛(감독 스펙)
  // 배치4(좌석·안내·구조 세트) 전용
  lounge: () => SM({ color: 16777215, roughness: 0.72, metalness: 0, vertexColors: true }),
  // 라운지 쿠션 — 정점색 패브릭 투톤(LOUNGE_PALETTE), 스툴 패드와 공유
  reception: () => SM({ color: 16777215, roughness: 0.55, metalness: 0, vertexColors: true }),
  // 안내데스크 몸체 — 정점색 2톤(스톤 플린스+우드 전면 패널)
  windowGlass: () => SM({ color: 15003377, roughness: 0.12, metalness: 0.04, transparent: true, opacity: 0.34, emissive: 16773327, emissiveIntensity: 0.28 })
  // 창 유리 — opacity 반투명 + 옅은 emissive("빛 든" 느낌, 실제 THREE.Light 0, transmission 금지)
};
const FINISH_MAT = {
  wall: { white: MATS.plasterW, warmsand: MATS.warmsand, charcoal: MATS.charcoal },
  feature: { deepviolet: MATS.deepviolet, charcoal: MATS.charcoal, warmsand: MATS.warmsand },
  // kintsugi는 featureMat에서 텍스처 처리
  floor: { parquet: MATS.parquet, terrazzo: MATS.terrazzo, concrete: MATS.concrete, grass: MATS.grass, water: MATS.water },
  ceiling: { whiteflat: MATS.plasterW, darkmatte: MATS.darkmatte }
};
const PART_MAT = {
  wallPanel: MATS.plaster,
  floorTile: MATS.parquet,
  ceilingPanel: MATS.plasterW,
  pillar: MATS.stone,
  stair: MATS.stone,
  arch: MATS.plaster,
  artwork: MATS.frameBlack,
  pedestal: MATS.matteWhite,
  screen: MATS.darkScreen,
  partition: MATS.plaster,
  vitrine: MATS.bronze,
  labelStand: MATS.brass,
  trackLight: MATS.darkMetal,
  pendantLight: MATS.brass,
  planter: MATS.terracotta,
  rug: MATS.rugTint,
  bench: MATS.walnut,
  drape: MATS.drapeTint,
  wreath: MATS.brass,
  cake: MATS.cakeCream,
  banner: MATS.darkMetal,
  balloon: MATS.matteWhite,
  bigplant: MATS.terracotta,
  palm: MATS.terracotta,
  hangplant: MATS.wood,
  succulent: MATS.terracotta,
  vase: MATS.ceramic,
  floorlamp: MATS.darkMetal,
  stanchion: MATS.brass,
  mirror: MATS.brass,
  sign: MATS.wood,
  railing: MATS.brass,
  lounge: MATS.walnut,
  reception: MATS.wood,
  window: MATS.matteWhite,
  glasspanel: MATS.brass,
  stool: MATS.walnut
};
const partMat = (t, opts) => {
  const mat = opts && opts.mat;
  if (t === "pillar") {
    if (mat === "marble") return MATS.pillarMarble();
    if (mat === "stone") return MATS.pillarStone();
    if (mat === "wood") return MATS.pillarWood();
    return concreteTex(13814975, 1.2, 1.5);
  }
  if (t === "wallPanel" || t === "partition") {
    if (mat === "wood") return MATS.panelWood();
    if (mat === "metal") return MATS.darkMetal();
    return MATS.plaster();
  }
  if (t === "stair") return concreteTex(13814975, 0.9, 1.3);
  return (PART_MAT[t] || MATS.stone)();
};
const finishMat = (kind, id) => (FINISH_MAT[kind] && FINISH_MAT[kind][id] || MATS.plasterW)();
function wallMat(id, w, h) {
  if (id === "white") return plasterTex(16777215, w, h);
  if (id === "warmsand") return plasterTex(15128767, w, h);
  return finishMat("wall", id);
}
function floorMatTex(id, w, d) {
  if (id === "parquet") return parquetTex(w, d);
  if (id === "concrete") return concreteTex(16777215, w, d);
  if (id === "grass") {
    const map = cloneRepeat(genTex("grass", grassTexGen), Math.max(2, w / 1.5), Math.max(2, d / 1.5));
    return map ? new THREE.MeshStandardMaterial({ map, roughness: 0.96, metalness: 0 }) : MATS.grass();
  }
  if (id === "water") {
    const map = cloneRepeat(genTex("water", waterTexGen), Math.max(2, w / 3), Math.max(2, d / 3));
    return map ? new THREE.MeshStandardMaterial({ map, color: 2248799, roughness: 0.12, metalness: 0.18, envMapIntensity: 1.4 }) : MATS.water();
  }
  return finishMat("floor", id);
}
function featureMat(id, w, h) {
  if (id === "kintsugi") {
    const map = cloneRepeat(genTex("kintsugi", kintsugiTexGen), Math.max(1, w / 2.6), Math.max(1, h / 2.6));
    if (map) return new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0.2, envMapIntensity: 1.1 });
  }
  return finishMat("feature", id);
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
function shellFlatColor(kind, id) {
  const base = (SHELL_FLAT_BASE[kind] && SHELL_FLAT_BASE[kind][id]);
  const c = new THREE.Color(base != null ? base : 13421772);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s * 0.55, hsl.l * 0.82);
  return c;
}
// 계열별 공유 단색 재질(캐시) — 같은 마감의 여러 파셀/표면이 한 재질을 공유(프로그램·메모리 절약).
// userData.shared=true → disposeSpaceGroup이 회수하지 않는다(공유 규약). 조명(hemi/sun)에 실루엣
//   음영이 살도록 Lambert 채택. scene.fog에 자동 반응(MeshLambertMaterial 기본 fog:true).
const _shellFlatCache = /* @__PURE__ */ new Map();
function shellFlatMat(kind, id) {
  const key = kind + ":" + id;
  let m = _shellFlatCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: shellFlatColor(kind, id) });
    m.userData.shared = true;
    _shellFlatCache.set(key, m);
  }
  return m;
}
function partY(t, storyH) {
  const spec = PART_TYPES[t];
  if (t === "artwork" || t === "screen") return 1.6;
  if (t === "trackLight") return storyH - 0.3;
  if (t === "pendantLight") return storyH - 0.7;
  if (t === "hangplant") return storyH - 1;
  if (t === "window") return storyH * 0.58;
  if (t === "rug") return 0.012;
  if (t === "ceilingPanel") return storyH - 0.05;
  return spec.size[1] / 2;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
function merged(list) {
  const gs = list.map(([g, t]) => {
    if (t) g.translate(t[0], t[1], t[2]);
    return g;
  });
  const m = mergeGeometries(gs, false);
  gs.forEach((g) => g.dispose());
  return m;
}
const FRAME_FW = { minimal: 0.045, classic: 0.11, frameless: 0 };
const FRAME_MAT_ID = { minimal: "frameBlack", classic: "frameWalnut", frameless: "frameShadow" };
function artworkSize(ar) {
  const [dw, dh] = PART_TYPES.artwork.size;
  if (!(typeof ar === "number" && isFinite(ar) && ar > 0)) return { W: dw, H: dh };
  const BASE = 1.6, minSize = FRAME_RULES.minSize, clampW = FRAME_RULES.landscape.clampW, clampH = FRAME_RULES.portrait.clampH;
  const cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const r = ar;
  let W, H;
  if (r >= 1) {
    W = BASE;
    H = BASE / r;
  } else {
    H = BASE;
    W = BASE * r;
  }
  const W0 = W, H0 = H;
  W = cl(W, minSize, clampW);
  H = cl(H, minSize, clampH);
  if (W !== W0) H = cl(W / r, minSize, clampH);
  if (H !== H0) W = cl(H * r, minSize, clampW);
  return { W, H };
}
function artworkFrameGeo(style, W, H, d) {
  if (style === "frameless") return box(W, H, 0.02);
  const fW = FRAME_FW[style] || FRAME_FW.minimal;
  const bevel = style === "classic" ? { bevelThickness: 0.02, bevelSize: 0.014, bevelSegments: 2 } : { bevelThickness: 0.01, bevelSize: 8e-3, bevelSegments: 1 };
  const ow = W / 2, oh = H / 2, iw = ow - fW, ih = oh - fW;
  const shape = new THREE.Shape();
  shape.moveTo(-ow, -oh);
  shape.lineTo(ow, -oh);
  shape.lineTo(ow, oh);
  shape.lineTo(-ow, oh);
  shape.lineTo(-ow, -oh);
  const hole = new THREE.Path();
  hole.moveTo(-iw, -ih);
  hole.lineTo(iw, -ih);
  hole.lineTo(iw, ih);
  hole.lineTo(-iw, ih);
  hole.lineTo(-iw, -ih);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, ...bevel, steps: 1 });
  g.translate(0, 0, -d / 2);
  return g;
}
function artworkCanvasDims(style, W, H) {
  const fW = FRAME_FW[style] || 0;
  return { cw: Math.max(0.1, W - 2 * fW - 0.02), ch: Math.max(0.1, H - 2 * fW - 0.02) };
}
function matteMarginFor(style, W, H) {
  if (style === "frameless") return 0;
  return Math.min(0.14, Math.max(0.04, Math.min(W, H) * 0.08));
}
function alignedCyl(rt, rb, from, to, segs = 8) {
  const len = from.distanceTo(to) || 1e-4;
  const g = cyl(rt, rb, len, segs);
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}
function catenaryChain(fromX, toX, topY, sag, segs, r0, r1, seed) {
  const half = (toX - fromX) / 2, a = Math.max(0.12, half * half / (2 * Math.max(0.02, sag))), midX = (fromX + toX) / 2;
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
function paintGeo(g, hex) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(arr, 3));
  return g;
}
function flutedShaft(R, height, { flutes = 16, per = 3, hs = 5, depth = R * 0.1 } = {}) {
  const RS = flutes * per, y0 = -height / 2, pos = [], uv = [], idx = [];
  for (let j = 0; j <= hs; j++) {
    const t = j / hs, y = y0 + t * height;
    const Ry = R * (1 - 0.1 * t + 0.03 * Math.sin(Math.PI * t));
    for (let i = 0; i <= RS; i++) {
      const th = i / RS * Math.PI * 2, groove = 0.5 + 0.5 * Math.cos(flutes * th);
      const r = Ry - depth * groove;
      pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
      uv.push(i / RS, t);
    }
  }
  const stride = RS + 1;
  for (let j = 0; j < hs; j++) for (let i = 0; i < RS; i++) {
    const a = j * stride + i, b = a + 1, c = a + stride, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  const y1 = y0 + height, topBase = hs * stride;
  const cb = pos.length / 3;
  pos.push(0, y0, 0);
  uv.push(0.5, 0);
  for (let i = 0; i < RS; i++) idx.push(cb, i, i + 1);
  const ct = pos.length / 3;
  pos.push(0, y1, 0);
  uv.push(0.5, 1);
  for (let i = 0; i < RS; i++) idx.push(ct, topBase + i + 1, topBase + i);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function drapeSheet(w, h, d, { folds = 6, segsPerFold = 4, hs = 5 } = {}) {
  const RS = folds * segsPerFold, y0 = -h / 2, pos = [], uv = [], idx = [];
  const lerp = (a, b, t) => a + (b - a) * t;
  for (let j = 0; j <= hs; j++) {
    const t = j / hs, y = lerp(y0, h / 2, t), Wt = lerp(1.06, 0.9, t), amp = lerp(1, 0.8, t);
    for (let i = 0; i <= RS; i++) {
      const u = i / RS;
      pos.push((u - 0.5) * w * Wt, y, d * 0.42 * amp * Math.sin(folds * u * Math.PI));
      uv.push(u, t);
    }
  }
  const stride = RS + 1;
  for (let j = 0; j < hs; j++) for (let i = 0; i < RS; i++) {
    const a = j * stride + i, b = a + 1, c = a + stride, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  const topBase = hs * stride;
  const cb = pos.length / 3;
  pos.push(0, y0, 0);
  uv.push(0.5, 0);
  for (let i = 0; i < RS; i++) idx.push(cb, i, i + 1);
  const ct = pos.length / 3;
  pos.push(0, h / 2, 0);
  uv.push(0.5, 1);
  for (let i = 0; i < RS; i++) idx.push(ct, topBase + i + 1, topBase + i);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function partGeo(t, opts) {
  const [w, h, d] = PART_TYPES[t].size;
  switch (t) {
    case "pillar": {
      const R = w * 0.5;
      const shaft = flutedShaft(R * 0.98, h - 0.3, { flutes: 14, per: 3, hs: 5, depth: R * 0.16 });
      return merged([
        [cyl(R * 1.34, R * 1.34, 0.06, 16), [0, -h / 2 + 0.03, 0]],
        // 플린스 슬랩
        [cyl(R * 1.04, R * 1.3, 0.09, 16), [0, -h / 2 + 0.105, 0]],
        // 베이스 토러스 몰딩
        [shaft, [0, 0, 0]],
        // 플루팅 샤프트
        [cyl(R * 0.92, R * 0.88, 0.03, 16), [0, h / 2 - 0.175, 0]],
        // 넥(애뉼릿)
        [cyl(R * 1.3, R * 0.94, 0.1, 16), [0, h / 2 - 0.09, 0]],
        // 에키누스(플레어)
        [box(R * 2.7, 0.05, R * 2.7), [0, h / 2 - 0.025, 0]]
        // 아바쿠스(사각 처마)
      ]);
    }
    case "bench":
      return merged([
        [box(w - 0.08, 0.02, d - 0.08), [0, h / 2 - 0.01, 0]],
        [box(w, 0.04, d), [0, h / 2 - 0.04, 0]],
        [box(w - 0.08, 0.02, d - 0.08), [0, h / 2 - 0.07, 0]]
      ]);
    case "pedestal":
      return merged([
        [box(w, 0.05, d), [0, -h / 2 + 0.025, 0]],
        [box(w * 0.88, 0.04, d * 0.88), [0, -h / 2 + 0.07, 0]],
        [box(w * 0.8, 0.36, d * 0.8), [0, -0.18, 0]],
        [box(w * 0.76, 0.36, d * 0.76), [0, 0.18, 0]],
        [box(w * 0.88, 0.04, d * 0.88), [0, h / 2 - 0.07, 0]],
        [box(w, 0.05, d), [0, h / 2 - 0.025, 0]]
      ]);
    case "stair": {
      const st = [];
      const n = Math.max(6, Math.min(30, Math.round(h / 0.19)));
      for (let i = 0; i < n; i++) st.push([box(w, h / n, d / n), [0, -h / 2 + (i + 0.5) * (h / n), -d / 2 + (i + 0.5) * (d / n)]]);
      return merged(st);
    }
    case "labelStand": {
      const plaque = box(w, 0.02, d * 0.9);
      plaque.rotateX(-0.5);
      return merged([[box(0.04, h, 0.04), null], [plaque, [0, h / 2 - 0.02, 0]]]);
    }
    case "trackLight": {
      const head = cyl(w * 0.5, w * 0.42, w * 0.9, 12);
      head.rotateX(0.5);
      return merged([[box(w * 0.4, w * 0.3, w * 0.4), [0, w * 0.4, 0]], [head, null]]);
    }
    case "pendantLight": {
      const V = (r, y) => new THREE.Vector2(r, y);
      const shade = new THREE.LatheGeometry([V(0.02, -h * 0.2), V(w * 0.14, -h * 0.2), V(w * 0.44, -h * 0.14), V(w * 0.5, -h * 0.02), V(w * 0.16, h * 0.1), V(6e-3, h * 0.3)], 16);
      return merged([[cyl(6e-3, 6e-3, h * 0.5, 6), [0, h * 0.25, 0]], [shade, null]]);
    }
    case "planter":
      return merged([
        [cyl(w * 0.3, w * 0.36, 0.05, 16), [0, -h / 2 + 0.025, 0]],
        [cyl(w * 0.5, w * 0.34, h - 0.1, 16), [0, 0, 0]],
        [cyl(w * 0.52, w * 0.48, 0.06, 16), [0, h / 2 - 0.03, 0]]
      ]);
    case "bigplant": {
      const potH = h * 0.24, potTopY = -h / 2 + potH;
      const trunkTopY = h * 0.05, trunkH = trunkTopY - potTopY, trunkCY = potTopY + trunkH / 2;
      return merged([
        [cyl(w * 0.3, w * 0.38, 0.05, 18), [0, -h / 2 + 0.025, 0]],
        [cyl(w * 0.44, w * 0.34, potH - 0.09, 18), [0, -h / 2 + 0.05 + (potH - 0.09) / 2, 0]],
        [cyl(w * 0.46, w * 0.44, 0.05, 18), [0, potTopY - 0.025, 0]],
        [cyl(0.045, 0.07, trunkH, 10), [0, trunkCY, 0]]
      ]);
    }
    case "palm": {
      const potH = h * 0.14, potTopY = -h / 2 + potH;
      const canes = [
        { x: -w * 0.12, z: w * 0.06, topY: h * 0.4, r: 0.028 },
        { x: w * 0.1, z: -w * 0.08, topY: h * 0.3, r: 0.024 },
        { x: w * 0.02, z: w * 0.14, topY: h * 0.46, r: 0.022 }
      ];
      const parts = [
        [cyl(w * 0.28, w * 0.36, 0.05, 16), [0, -h / 2 + 0.025, 0]],
        [cyl(w * 0.4, w * 0.32, potH - 0.08, 16), [0, -h / 2 + 0.05 + (potH - 0.08) / 2, 0]],
        [cyl(w * 0.42, w * 0.4, 0.05, 16), [0, potTopY - 0.025, 0]]
      ];
      canes.forEach((c) => {
        const from = new THREE.Vector3(c.x * 0.4, potTopY, c.z * 0.4), to = new THREE.Vector3(c.x, c.topY, c.z);
        parts.push([alignedCyl(c.r * 0.8, c.r, from, to, 8), null]);
      });
      return merged(parts);
    }
    case "hangplant": {
      const hookY = h / 2 - 0.02, basketTopY = h / 2 - 0.14, basketH = 0.14;
      return merged([
        [cyl(0.012, 0.012, 0.02, 8), [0, hookY, 0]],
        [alignedCyl(6e-3, 6e-3, new THREE.Vector3(0, hookY - 0.01, 0), new THREE.Vector3(0, basketTopY + 0.02, 0), 6), null],
        [cyl(w * 0.3, w * 0.4, basketH, 16), [0, basketTopY - basketH / 2, 0]],
        [cyl(w * 0.32, w * 0.32, 0.025, 16), [0, basketTopY, 0]]
      ]);
    }
    case "succulent": {
      const footH = 0.025, bodyH = 0.09, rimH = 0.02;
      return merged([
        [cyl(w * 0.34, w * 0.42, footH, 14), [0, -h / 2 + footH / 2, 0]],
        [cyl(w * 0.46, w * 0.4, bodyH, 14), [0, -h / 2 + footH + bodyH / 2, 0]],
        [cyl(w * 0.48, w * 0.46, rimH, 14), [0, -h / 2 + footH + bodyH + rimH / 2, 0]]
      ]);
    }
    case "vase": {
      const vaseH = h * 0.62;
      const V = (r, y) => new THREE.Vector2(r, y);
      const g = new THREE.LatheGeometry([
        V(0.01, -vaseH / 2),
        V(w * 0.22, -vaseH / 2 + 0.02),
        V(w * 0.34, -vaseH * 0.18),
        V(w * 0.3, vaseH * 0.1),
        V(w * 0.14, vaseH * 0.34),
        V(w * 0.17, vaseH * 0.42),
        V(w * 0.15, vaseH * 0.46)
      ], 20);
      g.translate(0, -h / 2 + vaseH / 2, 0);
      return g;
    }
    case "vitrine": {
      const px = w / 2 - 0.02, pz = d / 2 - 0.02, post = () => box(0.03, h - 0.085, 0.03);
      return merged([
        [box(w, 0.06, d), [0, -h / 2 + 0.03, 0]],
        [post(), [-px, 0.0125, pz]],
        [post(), [px, 0.0125, pz]],
        [post(), [-px, 0.0125, -pz]],
        [post(), [px, 0.0125, -pz]],
        [box(w * 0.94, 0.025, d * 0.94), [0, h / 2 - 0.0125, 0]]
      ]);
    }
    case "screen":
      return merged([[box(w, h, 0.05), null], [box(w - 0.06, h - 0.06, 0.02), [0, 0, -0.02]]]);
    case "artwork": {
      const style = opts && opts.style || "minimal";
      const W = opts && opts.w || w, H = opts && opts.h || h, D = opts && opts.d || d;
      return artworkFrameGeo(style, W, H, D);
    }
    case "wreath": {
      const A = new THREE.Vector3(0, h * 0.04, -d * 0.1);
      const RC = new THREE.Vector3(0, h * 0.3, -d * 0.05);
      const feet = [
        new THREE.Vector3(-w * 0.34, -h / 2, d * 0.3),
        new THREE.Vector3(w * 0.34, -h / 2, d * 0.3),
        new THREE.Vector3(0, -h / 2, -d * 0.38)
      ];
      const ring = new THREE.TorusGeometry(w * 0.4, 0.02, 8, 24);
      ring.rotateX(-0.16);
      return merged([
        ...feet.map((f) => [alignedCyl(0.022, 0.03, A, f), null]),
        [cyl(0.038, 0.038, 0.05, 10), [A.x, A.y, A.z]],
        // 조인트 캡
        [alignedCyl(0.026, 0.026, A, RC), null],
        // 마운트 포스트
        [ring, [RC.x, RC.y, RC.z]]
      ]);
    }
    case "cake": {
      const plateY = -h / 2 + h * 0.13;
      const t1H = h * 0.17, t2H = h * 0.14, t3H = h * 0.115;
      const r1 = w * 0.4, r2 = w * 0.29, r3 = w * 0.2;
      const yc1 = plateY + t1H / 2, yc2 = plateY + t1H + t2H / 2, yc3 = plateY + t1H + t2H + t3H / 2;
      return merged([
        [cyl(r1 * 0.94, r1, t1H, 20), [0, yc1, 0]],
        [cyl(r2 * 0.94, r2, t2H, 18), [0, yc2, 0]],
        [cyl(r3 * 0.92, r3, t3H, 16), [0, yc3, 0]]
      ]);
    }
    case "banner": {
      const bl = new THREE.Vector3(-w * 0.46, -h / 2, 0), br = new THREE.Vector3(w * 0.46, -h / 2, 0);
      const tl = new THREE.Vector3(-w * 0.4, h * 0.4, 0), tr = new THREE.Vector3(w * 0.4, h * 0.4, 0);
      const diag = (a, b) => alignedCyl(0.018, 0.018, a, b);
      const footPad = (p) => [box(0.09, 0.02, 0.16), [p.x, p.y + 0.01, 0]];
      return merged([
        [diag(bl, tr), null],
        [diag(br, tl), null],
        [box(tr.x - tl.x + 0.03, 0.03, 0.03), [0, tr.y, 0]],
        // 상단 레일
        footPad(bl),
        footPad(br)
      ]);
    }
    case "balloon": {
      const poleH = h * 0.3, padW = 0.16;
      const bx = w / 2 - padW * 1.1;
      return merged([
        [box(padW * 1.6, 0.05, padW * 1.6), [-bx, -h / 2 + 0.025, 0]],
        [box(padW * 1.6, 0.05, padW * 1.6), [bx, -h / 2 + 0.025, 0]],
        [cyl(0.035, 0.045, poleH, 10), [-bx, -h / 2 + 0.05 + poleH / 2, 0]],
        [cyl(0.035, 0.045, poleH, 10), [bx, -h / 2 + 0.05 + poleH / 2, 0]]
      ]);
    }
    case "floorlamp": {
      const apex = new THREE.Vector3(0, -h / 2 + 0.3, 0);
      const feet = [
        new THREE.Vector3(-w * 0.46, -h / 2, w * 0.32),
        new THREE.Vector3(w * 0.46, -h / 2, w * 0.32),
        new THREE.Vector3(0, -h / 2, -w * 0.5)
      ];
      const poleTop = new THREE.Vector3(0, h * 0.3, 0);
      return merged([
        ...feet.map((f) => [alignedCyl(0.016, 0.024, apex, f, 8), null]),
        [cyl(0.03, 0.03, 0.05, 10), [apex.x, apex.y, apex.z]],
        // 다리 조인트 캡
        [alignedCyl(0.016, 0.016, apex, poleTop, 8), null]
        // 폴
      ]);
    }
    case "stanchion": {
      const px = w / 2 - 0.06;
      const post = (x) => merged([
        [cyl(0.05, 0.056, 0.03, 14), [x, -h / 2 + 0.015, 0]],
        [cyl(0.024, 0.03, h - 0.2, 16), [x, -h / 2 + 0.03 + (h - 0.2) / 2, 0]],
        [cyl(0.032, 0.032, 0.025, 14), [x, h / 2 - 0.155, 0]],
        [new THREE.SphereGeometry(0.042, 12, 10), [x, h / 2 - 0.08, 0]]
      ]);
      return merged([[post(-px), null], [post(px), null]]);
    }
    case "mirror": {
      const mH = h * 0.8, ow = w / 2, oh = mH / 2, fW = 0.045, fd2 = 0.045;
      const frameCY = -h / 2 + 0.12 + oh;
      const baseY = -h / 2 + 0.03;
      const legFrom = new THREE.Vector3(0, -h / 2 + 0.09, -d / 2 * 0.7);
      const legTo = (sx) => new THREE.Vector3(sx * ow * 0.55, frameCY - oh * 0.45, -fd2 / 2 - 0.01);
      return merged([
        [box(w, fW, fd2), [0, frameCY + oh - fW / 2, 0]],
        // 상단 바
        [box(w, fW, fd2), [0, frameCY - oh + fW / 2, 0]],
        // 하단 바
        [box(fW, mH - fW * 2, fd2), [-ow + fW / 2, frameCY, 0]],
        // 좌측 바
        [box(fW, mH - fW * 2, fd2), [ow - fW / 2, frameCY, 0]],
        // 우측 바
        [box(w * 0.5, 0.06, d), [0, baseY, 0]],
        // 베이스 플린스
        [alignedCyl(0.02, 0.024, legFrom, legTo(-1), 8), null],
        // 뒷받침 다리 좌
        [alignedCyl(0.02, 0.024, legFrom, legTo(1), 8), null]
        // 뒷받침 다리 우
      ]);
    }
    case "sign": {
      const apex = new THREE.Vector3(0, h * 0.42, d * 0.06);
      const flFront = new THREE.Vector3(-w * 0.34, -h / 2, d * 0.3), frFront = new THREE.Vector3(w * 0.34, -h / 2, d * 0.3);
      const flBack = new THREE.Vector3(-w * 0.2, -h / 2, -d * 0.34), frBack = new THREE.Vector3(w * 0.2, -h / 2, -d * 0.34);
      return merged([
        [alignedCyl(0.018, 0.024, apex, flFront, 8), null],
        [alignedCyl(0.018, 0.024, apex, frFront, 8), null],
        [alignedCyl(0.016, 0.02, apex, flBack, 8), null],
        [alignedCyl(0.016, 0.02, apex, frBack, 8), null],
        [cyl(0.03, 0.03, 0.04, 10), [apex.x, apex.y, apex.z]],
        // 힌지 캡
        [box(0.03, 0.02, d * 0.5), [0, -h / 2 + 0.01, -d * 0.02]]
        // 안정화 크로스브레이스
      ]);
    }
    case "railing": {
      const postR = 0.024, floorY = -h / 2, topY = h / 2 - 0.02, botY = -h / 2 + h * 0.22;
      const xL = -w / 2 + 0.02, xR = w / 2 - 0.02;
      const parts = [
        [alignedCyl(postR, postR, new THREE.Vector3(xL, floorY, 0), new THREE.Vector3(xL, topY, 0), 10), null],
        [alignedCyl(postR, postR, new THREE.Vector3(xR, floorY, 0), new THREE.Vector3(xR, topY, 0), 10), null],
        [alignedCyl(0.02, 0.02, new THREE.Vector3(xL, topY, 0), new THREE.Vector3(xR, topY, 0), 10), null],
        [alignedCyl(0.015, 0.015, new THREE.Vector3(xL, botY, 0), new THREE.Vector3(xR, botY, 0), 10), null]
      ];
      const N = 5;
      for (let i = 1; i < N; i++) {
        const x = THREE.MathUtils.lerp(xL, xR, i / N);
        parts.push([cyl(0.01, 0.01, topY - floorY - 0.02, 8), [x, (topY + floorY) / 2 + 0.01, 0]]);
      }
      return merged(parts);
    }
    case "lounge": {
      const legH = 0.11, legR = 0.03;
      const lx = w / 2 - 0.09, lz = d / 2 - 0.08;
      const leg = (x, z) => [cyl(legR, legR * 0.72, legH, 10), [x, -h / 2 + legH / 2, z]];
      const armW = 0.14, armH = h * 0.6, armY = -h / 2 + legH + armH / 2;
      const deckY = -h / 2 + legH + 0.03;
      return merged([
        leg(-lx, lz),
        leg(lx, lz),
        leg(-lx, -lz),
        leg(lx, -lz),
        [box(armW, armH, d - 0.04), [-(w / 2 - armW / 2), armY, 0]],
        [box(armW, armH, d - 0.04), [w / 2 - armW / 2, armY, 0]],
        [box(w - armW * 2 + 0.03, 0.05, d - 0.06), [0, deckY, 0]]
        // 쿠션 아래 데크(살짝 보임)
      ]);
    }
    case "reception": {
      const bw = w / 2 - 0.02, bd = d / 2, bow = 0.05;
      const shape = new THREE.Shape();
      shape.moveTo(-bw, -bd);
      shape.quadraticCurveTo(0, -bd - bow, bw, -bd);
      shape.lineTo(bw, bd);
      shape.lineTo(-bw, bd);
      shape.lineTo(-bw, -bd);
      const bodyH = h - 0.09;
      const body = new THREE.ExtrudeGeometry(shape, { depth: bodyH, bevelEnabled: false, steps: 1 });
      body.rotateX(-Math.PI / 2);
      body.translate(0, -h / 2 + 0.04, 0);
      return body;
    }
    case "window": {
      const fW = 0.06, fd2 = d * 0.5, ow = w / 2, oh = h / 2;
      return merged([
        [box(w, fW, fd2), [0, oh - fW / 2, 0]],
        // 상단 바
        [box(w, fW, fd2), [0, -oh + fW / 2, 0]],
        // 하단 바
        [box(fW, h - fW * 2, fd2), [-ow + fW / 2, 0, 0]],
        // 좌측 바
        [box(fW, h - fW * 2, fd2), [ow - fW / 2, 0, 0]],
        // 우측 바
        [box(0.028, h - fW * 2, fd2 * 0.7), null],
        // 세로 멀리언
        [box(w - fW * 2, 0.028, fd2 * 0.7), null],
        // 가로 멀리언
        [box(w + 0.05, fW * 0.75, fd2 * 1.3), [0, -oh - fW * 0.32, 0]]
        // 하단 창틀(sill) — 살짝 돌출
      ]);
    }
    case "glasspanel": {
      const postW = 0.03, railH = 0.04, px = w / 2 - postW / 2;
      return merged([
        [box(postW, h, d), [-px, 0, 0]],
        [box(postW, h, d), [px, 0, 0]],
        [box(w, railH, d), [0, h / 2 - railH / 2, 0]],
        [box(w, railH, d), [0, -h / 2 + railH / 2, 0]]
      ]);
    }
    case "stool": {
      const seatH = 0.05, legR = 0.018;
      const apex = new THREE.Vector3(0, h / 2 - seatH - 0.02, 0);
      const R = w * 0.42;
      const feet = [0, 1, 2].map((i) => {
        const a = i / 3 * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * R, -h / 2, Math.sin(a) * R);
      });
      return merged([
        [cyl(w * 0.5, w * 0.48, seatH, 20), [0, h / 2 - seatH / 2, 0]],
        // 좌판
        ...feet.map((f) => [alignedCyl(legR, legR * 1.3, apex, f, 8), null]),
        [cyl(legR * 1.6, legR * 1.6, 0.035, 10), [apex.x, apex.y, apex.z]]
        // 조인트 캡
      ]);
    }
    case "arch": {
      const jambW = 0.18, halfOpenW = (w - 2 * jambW) / 2, springY = -h / 2 + h * 0.62;
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, -h / 2);
      shape.lineTo(w / 2, -h / 2);
      shape.lineTo(w / 2, h / 2);
      shape.lineTo(-w / 2, h / 2);
      shape.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-halfOpenW, -h / 2);
      hole.lineTo(-halfOpenW, springY);
      hole.absarc(0, springY, halfOpenW, Math.PI, 0, true);
      hole.lineTo(halfOpenW, -h / 2);
      hole.closePath();
      shape.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.01, bevelSegments: 2, steps: 1 });
      g.translate(0, 0, -d / 2);
      return g;
    }
    case "rug": {
      const variant = opts && opts.variant || "rect";
      const pileY = -h / 2 + 0.01 + (h - 0.01) / 2;
      if (variant === "round") {
        const R = Math.min(w, d) / 2;
        return merged([
          [cyl(R, R, 0.01, 32), [0, -h / 2 + 5e-3, 0]],
          [cyl(R - 0.03, R - 0.03, h - 0.01, 32), [0, pileY, 0]]
        ]);
      }
      return merged([
        [box(w, 0.01, d), [0, -h / 2 + 5e-3, 0]],
        [box(w - 0.03, h - 0.01, d - 0.03), [0, pileY, 0]]
      ]);
    }
    case "wallPanel":
      return merged([
        [box(w, 0.03, d), [0, -h / 2 + 0.015, 0]],
        [box(w - 0.02, h - 0.055, d), [0, -h / 2 + 0.03 + (h - 0.055) / 2, 0]],
        [box(w + 0.02, 0.025, d), [0, h / 2 - 0.0125, 0]]
      ]);
    case "floorTile":
      return merged([
        [box(w, h * 0.55, d), [0, -h / 2 + h * 0.275, 0]],
        [box(w - 0.03, h * 0.45, d - 0.03), [0, -h / 2 + h * 0.55 + h * 0.225, 0]]
      ]);
    case "ceilingPanel": {
      const variant = opts && opts.variant || "flat";
      if (variant === "coffer") {
        return merged([
          [box(w, 0.09, d), [0, h / 2 - 0.045, 0]],
          [box(w - 0.2, 0.03, d - 0.2), [0, h / 2 - 0.02, 0]]
        ]);
      }
      return merged([
        [box(w, 0.05, d), [0, h / 2 - 0.025, 0]],
        [box(w - 0.16, 0.03, d - 0.16), [0, h / 2 - 0.015, 0]]
      ]);
    }
    case "partition": {
      const sx = w / 2 - 0.045, ry2 = h / 2 - 0.045;
      return merged([
        [box(0.09, h, d), [-sx, 0, 0]],
        [box(0.09, h, d), [sx, 0, 0]],
        [box(w - 0.18, 0.09, d), [0, ry2, 0]],
        [box(w - 0.18, 0.09, d), [0, -ry2, 0]],
        [box(w - 0.22, h - 0.22, d * 0.55), [0, 0, 0]]
      ]);
    }
    case "drape": {
      const sheet = drapeSheet(w, h, d);
      const pocket = cyl(0.025, 0.025, w * 0.98, 8);
      pocket.rotateZ(Math.PI / 2);
      return merged([[sheet, null], [pocket, [0, h / 2 - 0.03, 0]]]);
    }
    default:
      return box(w, h, d);
  }
}
function partAccent(t, opts) {
  const [w, h, d] = PART_TYPES[t].size;
  switch (t) {
    case "artwork":
      return { geo: box(w - 0.2, h - 0.2, 0.015), mat: "paper", off: [0, 0, 0.03] };
    case "screen":
      return { geo: box(w - 0.06, h - 0.06, 0.02), mat: "display", off: [0, 0, 0.035] };
    case "vitrine": {
      const cw = w - 0.06, cd = d - 0.06, cH = h - 0.1;
      return { geo: merged([
        [box(cw, cH, 0.012), [0, 0, cd / 2]],
        [box(cw, cH, 0.012), [0, 0, -cd / 2]],
        [box(0.012, cH, cd), [cw / 2, 0, 0]],
        [box(0.012, cH, cd), [-cw / 2, 0, 0]],
        [box(cw, 0.015, cd), [0, cH / 2, 0]]
      ]), mat: "glass", off: [0, 0.02, 0] };
    }
    case "planter": {
      const leaf = (r, sx, sy, sz) => {
        const s = new THREE.SphereGeometry(r, 8, 6);
        s.scale(sx, sy, sz);
        return s;
      };
      return { geo: merged([
        [leaf(w * 0.34, 1, 1.5, 1), [0, w * 0.2, 0]],
        [leaf(w * 0.26, 1.3, 1.1, 0.9), [w * 0.24, w * 0.1, w * 0.05]],
        [leaf(w * 0.24, 0.9, 1.2, 1.2), [-w * 0.22, w * 0.14, -w * 0.06]],
        [leaf(w * 0.2, 1.1, 0.9, 1.1), [w * 0.02, w * 0.32, w * 0.2]]
      ]), mat: "plant", off: [0, h * 0.46, 0] };
    }
    case "bigplant": {
      const trunkTopY = h * 0.05;
      const N = 7, pieces = [];
      const rnd = seeded(43);
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2 + rnd() * 0.6;
        const tilt = 0.45 + rnd() * 0.55;
        const len = w * (0.6 + rnd() * 0.22);
        const attachY = trunkTopY + rnd() * (h * 0.1);
        const leaf = new THREE.SphereGeometry(len * 0.5, 8, 6);
        leaf.scale(0.4 + rnd() * 0.08, 1, 0.15);
        leaf.translate(0, len * 0.44, 0);
        leaf.rotateX(tilt);
        leaf.rotateY(a);
        paintGeo(leaf, FOLIAGE_PALETTE[i % FOLIAGE_PALETTE.length]);
        pieces.push([leaf, [0, attachY, 0]]);
      }
      return { geo: merged(pieces), mat: "foliage", off: [0, 0, 0] };
    }
    case "palm": {
      const canes = [
        { x: -w * 0.12, z: w * 0.06, topY: h * 0.4 },
        { x: w * 0.1, z: -w * 0.08, topY: h * 0.3 },
        { x: w * 0.02, z: w * 0.14, topY: h * 0.46 }
      ];
      const pieces = [];
      canes.forEach((c, ci) => {
        const M = 10;
        for (let i = 0; i < M; i++) {
          const a = i / M * Math.PI * 2 + ci * 0.5;
          const len = w * (0.5 + i % 3 * 0.08);
          const blade = box(0.045, len, 0.01);
          blade.translate(0, len * 0.5, 0);
          blade.rotateX(0.9 + i % 2 * 0.15);
          blade.rotateY(a);
          paintGeo(blade, FOLIAGE_PALETTE[(i + ci) % FOLIAGE_PALETTE.length]);
          pieces.push([blade, [c.x, c.topY, c.z]]);
        }
      });
      return { geo: merged(pieces), mat: "foliage", off: [0, 0, 0] };
    }
    case "hangplant": {
      const basketBotY = h / 2 - 0.28;
      const pieces = [];
      const V = 6, rnd = seeded(37);
      for (let v = 0; v < V; v++) {
        const a = v / V * Math.PI * 2 + rnd() * 0.4;
        const r0 = w * 0.22;
        const vineLen = h * 0.6 * (0.75 + rnd() * 0.4);
        const segs = 5;
        let px = Math.cos(a) * r0, py = basketBotY, pz = Math.sin(a) * r0;
        for (let s = 0; s < segs; s++) {
          const t1 = (s + 1) / segs;
          const sway = Math.sin(t1 * 3.1 + v) * 0.05;
          const nx = Math.cos(a) * r0 * (1 - t1 * 0.6) + sway, nz = Math.sin(a) * r0 * (1 - t1 * 0.6) + sway * 0.6;
          const ny = basketBotY - vineLen * t1;
          const stem = alignedCyl(6e-3, 8e-3, new THREE.Vector3(px, py, pz), new THREE.Vector3(nx, ny, nz), 5);
          paintGeo(stem, FOLIAGE_PALETTE[0]);
          pieces.push([stem, null]);
          const leaf = new THREE.SphereGeometry(0.022 + rnd() * 0.012, 6, 5);
          leaf.scale(1, 0.55, 1.3);
          paintGeo(leaf, FOLIAGE_PALETTE[1 + s % (FOLIAGE_PALETTE.length - 1)]);
          leaf.translate(nx + (rnd() - 0.5) * 0.03, ny, nz + (rnd() - 0.5) * 0.03);
          pieces.push([leaf, null]);
          px = nx;
          py = ny;
          pz = nz;
        }
      }
      return { geo: merged(pieces), mat: "foliage", off: [0, 0, 0] };
    }
    case "succulent": {
      const potTopY = -h / 2 + 0.025 + 0.09 + 0.02;
      const pieces = [];
      const rosette = new THREE.SphereGeometry(0.07, 8, 6);
      rosette.scale(1, 0.46, 1);
      paintGeo(rosette, FOLIAGE_PALETTE[2]);
      pieces.push([rosette, [-w * 0.26, potTopY + 0.032, w * 0.12]]);
      const barrelBody = cyl(0.055, 0.06, 0.09, 10);
      paintGeo(barrelBody, FOLIAGE_PALETTE[0]);
      pieces.push([barrelBody, [w * 0.24, potTopY + 0.045, w * 0.1]]);
      const barrelCap = new THREE.SphereGeometry(0.058, 8, 6);
      barrelCap.scale(1, 0.5, 1);
      paintGeo(barrelCap, FOLIAGE_PALETTE[0]);
      pieces.push([barrelCap, [w * 0.24, potTopY + 0.09, w * 0.1]]);
      const spireBody = cyl(0.032, 0.038, 0.17, 8);
      paintGeo(spireBody, FOLIAGE_PALETTE[3]);
      pieces.push([spireBody, [0, potTopY + 0.085, -w * 0.26]]);
      const spireCap = new THREE.SphereGeometry(0.034, 7, 5);
      paintGeo(spireCap, FOLIAGE_PALETTE[3]);
      pieces.push([spireCap, [0, potTopY + 0.17, -w * 0.26]]);
      const bloom = new THREE.SphereGeometry(0.012, 6, 5);
      paintGeo(bloom, FESTIVE_FLOWER_PALETTE[0]);
      pieces.push([bloom, [w * 0.24, potTopY + 0.135, w * 0.1]]);
      return { geo: merged(pieces), mat: "foliage", off: [0, 0, 0] };
    }
    case "vase": {
      const vaseH = h * 0.62, neckTopY = -h / 2 + vaseH * 0.92;
      const pieces = [];
      const N = 11, rnd = seeded(19);
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2;
        const spread = 0.3 + rnd() * 0.4;
        const stemLen = h * (0.16 + rnd() * 0.14);
        const tipDir = new THREE.Vector3(Math.cos(a) * spread, 1, Math.sin(a) * spread).normalize();
        const from = new THREE.Vector3(0, neckTopY, 0);
        const to = new THREE.Vector3().copy(from).addScaledVector(tipDir, stemLen);
        const stem = alignedCyl(5e-3, 7e-3, from, to, 5);
        paintGeo(stem, FOLIAGE_PALETTE[0]);
        pieces.push([stem, null]);
        const bloom = new THREE.SphereGeometry(0.024 + rnd() * 0.012, 7, 6);
        paintGeo(bloom, FESTIVE_FLOWER_PALETTE[i % FESTIVE_FLOWER_PALETTE.length]);
        pieces.push([bloom, [to.x, to.y, to.z]]);
      }
      return { geo: merged(pieces), mat: "festive", off: [0, 0, 0] };
    }
    case "trackLight":
      return { geo: cyl(w * 0.24, w * 0.24, 0.02, 12), mat: "lens", off: [0, -w * 0.1, 0] };
    case "pendantLight":
      return { geo: cyl(w * 0.13, w * 0.13, 0.015, 12), mat: "lens", off: [0, -h * 0.19, 0] };
    case "pedestal":
      return { geo: box(w * 0.92, 0.012, d * 0.92), mat: "brass", off: [0, 0.4, 0] };
    case "bench": {
      const lx = w / 2 - 0.1;
      return { geo: merged([
        [box(0.06, 0.37, 0.34), [-lx, -0.04, 0]],
        [box(0.06, 0.37, 0.34), [lx, -0.04, 0]],
        [box(w - 0.32, 0.03, 0.035), [0, -0.16, 0]]
      ]), mat: "darkMetal", off: [0, 0, 0] };
    }
    case "rug": {
      const variant = opts && opts.variant || "rect";
      if (variant === "round") {
        const R = Math.min(w, d) / 2;
        return { geo: cyl(R - 0.16, R - 0.16, 0.021, 32), mat: "rugTint", off: [0, 6e-3, 0], tint: "rugAccent" };
      }
      return { geo: box(w - 0.16, 0.021, d - 0.16), mat: "rugTint", off: [0, 6e-3, 0], tint: "rugAccent" };
    }
    case "wreath": {
      const RC = new THREE.Vector3(0, h * 0.3, -d * 0.05);
      const ringR = w * 0.4;
      const leafGreen = 4020794;
      const flowerPalette = FESTIVE_FLOWER_PALETTE;
      const ribbon = 14726282;
      const N = 20, pieces = [];
      let fi = 0;
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2;
        const rx = Math.cos(a) * ringR, ry = Math.sin(a) * ringR * 0.98;
        const isLeaf = i % 4 === 0;
        let s;
        if (isLeaf) {
          s = new THREE.SphereGeometry(0.048, 6, 5);
          s.scale(1, 1.6, 0.8);
          s.rotateZ(a);
          paintGeo(s, leafGreen);
        } else {
          s = new THREE.SphereGeometry(0.044 + i % 3 * 7e-3, 7, 6);
          paintGeo(s, flowerPalette[fi % flowerPalette.length]);
          fi++;
        }
        s.translate(rx, ry, isLeaf ? 0.03 : 0.038);
        pieces.push([s, null]);
      }
      for (let j = 0; j < 10; j++) {
        const a = (j + 0.5) / 10 * Math.PI * 2;
        const rx = Math.cos(a) * ringR * 0.9, ry = Math.sin(a) * ringR * 0.88;
        const s = new THREE.SphereGeometry(0.03 + j % 2 * 6e-3, 6, 5);
        paintGeo(s, flowerPalette[(j + 1) % flowerPalette.length]);
        s.translate(rx, ry, 0.05);
        pieces.push([s, null]);
      }
      const bowKnot = new THREE.SphereGeometry(0.05, 8, 6);
      bowKnot.scale(1.1, 0.75, 0.7);
      paintGeo(bowKnot, ribbon);
      pieces.push([bowKnot, [0, ringR * 0.98, 0.03]]);
      [1, -1].forEach((sx) => {
        const st = box(0.03, 0.3, 0.01);
        st.translate(0, -0.15, 0);
        st.rotateZ(sx * 0.2);
        paintGeo(st, ribbon);
        pieces.push([st, [sx * 0.045, ringR * 0.8, 0.028]]);
      });
      const geo = merged(pieces);
      geo.rotateX(-0.16);
      geo.translate(RC.x, RC.y, RC.z);
      return { geo, mat: "festive", off: [0, 0, 0] };
    }
    case "cake": {
      const plateY = -h / 2 + h * 0.13;
      const t1H = h * 0.17, t2H = h * 0.14, t3H = h * 0.115;
      const r1 = w * 0.4, r2 = w * 0.29, r3 = w * 0.2;
      const topY = plateY + t1H + t2H + t3H;
      const gold = 13605450, blush = 15186347, candleCream = 15852745, flame = 16764794, porcelain = 15921386;
      const pieces = [];
      const footH = 0.028, footR = w * 0.22;
      const plateH = 0.022, plateR = r1 * 1.15;
      const stemH = Math.max(0.03, h * 0.13 - footH - plateH), stemR = w * 0.09;
      const footCY = -h / 2 + footH / 2, stemCY = -h / 2 + footH + stemH / 2, plateCY = plateY - plateH / 2;
      const foot = cyl(footR * 0.94, footR, footH, 20);
      paintGeo(foot, porcelain);
      pieces.push([foot, [0, footCY, 0]]);
      const stem = cyl(stemR * 0.86, stemR, stemH, 16);
      paintGeo(stem, porcelain);
      pieces.push([stem, [0, stemCY, 0]]);
      const plate = cyl(plateR, plateR * 1.03, plateH, 24);
      paintGeo(plate, porcelain);
      pieces.push([plate, [0, plateCY, 0]]);
      const rim = new THREE.TorusGeometry(plateR * 0.99, 8e-3, 6, 24);
      rim.rotateX(Math.PI / 2);
      paintGeo(rim, gold);
      pieces.push([rim, [0, plateY - 4e-3, 0]]);
      [[r1, plateY], [r2, plateY + t1H], [r3, plateY + t1H + t2H]].forEach(([r, y]) => {
        const trim = new THREE.TorusGeometry(r, 0.012, 6, 20);
        trim.rotateX(Math.PI / 2);
        paintGeo(trim, blush);
        pieces.push([trim, [0, y + 0.012, 0]]);
      });
      [-1, 0, 1].forEach((k) => {
        const cx = k * r3 * 0.5;
        const stick = cyl(6e-3, 6e-3, 0.09, 6);
        paintGeo(stick, candleCream);
        pieces.push([stick, [cx, topY + 0.045, 0]]);
        const tip = new THREE.SphereGeometry(0.012, 6, 5);
        paintGeo(tip, flame);
        pieces.push([tip, [cx, topY + 0.1, 0]]);
      });
      const topper = box(0.05, 0.09, 0.05);
      topper.rotateY(Math.PI / 4);
      paintGeo(topper, gold);
      pieces.push([topper, [0, topY + 0.15, 0]]);
      return { geo: merged(pieces), mat: "festive", off: [0, 0, 0] };
    }
    case "banner": {
      const topRailY = h * 0.4, bottomEdgeY = -h / 2 + 0.07;
      const bh = topRailY - bottomEdgeY, bw = w * 0.74;
      return { geo: box(bw, bh, 0.014), mat: "bannerCloth", off: [0, (topRailY + bottomEdgeY) / 2, 0.025] };
    }
    case "balloon": {
      const poleH = h * 0.3, padW = 0.16;
      const bx = w / 2 - padW * 1.1;
      const baseY = -h / 2 + 0.05 + poleH, archTop = h * 0.46;
      const palette = [14140336, 13215119, 10464917, 11124681, 14930883];
      const rnd = seeded(88);
      const N = 34, pieces = [];
      for (let i = 0; i < N; i++) {
        const t2 = i / (N - 1);
        const x = THREE.MathUtils.lerp(-bx, bx, t2);
        const arcY = baseY + (archTop - baseY) * Math.sin(Math.PI * t2 * 0.98 + 0.01);
        const jx = (rnd() - 0.5) * 0.1, jy = (rnd() - 0.5) * 0.08, jz = (rnd() - 0.5) * 0.16;
        const r = 0.075 + rnd() * 0.075;
        const s = new THREE.SphereGeometry(r, 9, 7);
        paintGeo(s, palette[(i + (rnd() * palette.length | 0)) % palette.length]);
        s.translate(x + jx, arcY + jy, jz);
        pieces.push([s, null]);
      }
      return { geo: merged(pieces), mat: "festive", off: [0, 0, 0] };
    }
    case "floorlamp": {
      const V = (r, y) => new THREE.Vector2(r, y);
      const shadeH = h * 0.24;
      const shade = new THREE.LatheGeometry([V(0.02, -shadeH * 0.5), V(w * 0.3, -shadeH * 0.5), V(w * 0.34, -shadeH * 0.1), V(w * 0.3, shadeH * 0.4), V(w * 0.26, shadeH * 0.5)], 18);
      return { geo: shade, mat: "lens", off: [0, h * 0.3 + shadeH * 0.48, 0] };
    }
    case "stanchion": {
      const px = w / 2 - 0.06;
      const ropeY = h / 2 - 0.115;
      const pieces = catenaryChain(-px, px, ropeY, 0.11, 14, 0.01, 0.01, 61);
      return { geo: merged(pieces), mat: "velvet", off: [0, 0, 0] };
    }
    case "mirror": {
      const mH = h * 0.8, oh = mH / 2, fW = 0.045, fd2 = 0.045;
      const iw = w / 2 - fW, ih = oh - fW;
      const frameCY = -h / 2 + 0.12 + oh;
      return { geo: box(iw * 2 - 0.01, ih * 2 - 0.01, 0.01), mat: "mirror", off: [0, frameCY, fd2 / 2 - 4e-3] };
    }
    case "sign": {
      const board = box(w * 0.86, h * 0.5, 0.018);
      board.rotateX(-0.18);
      return { geo: board, mat: "bannerCloth", off: [0, h * 0.14, d * 0.24] };
    }
    case "lounge": {
      const legH = 0.11, armW = 0.14;
      const deckTopY = -h / 2 + legH + 0.03 + 0.025;
      const seatH = 0.16, seatD = d - 0.1, seatW = (w - armW * 2 - 0.04) / 2 - 0.01, seatY = deckTopY + seatH / 2;
      const backH = h * 0.58, backD = 0.16, backY = deckTopY + backH / 2;
      const pieces = [];
      [-1, 1].forEach((side) => {
        const cx = side * (seatW / 2 + 0.01);
        const s = box(seatW, seatH, seatD);
        paintGeo(s, LOUNGE_PALETTE[0]);
        pieces.push([s, [cx, seatY, 0.01]]);
        const welt = box(seatW - 0.02, 0.02, 0.02);
        paintGeo(welt, LOUNGE_PALETTE[2]);
        pieces.push([welt, [cx, seatY - seatH / 2 + 0.01, seatD / 2 + 5e-3]]);
        const bk = box(seatW, backH, backD);
        paintGeo(bk, LOUNGE_PALETTE[0]);
        pieces.push([bk, [cx, backY, -d / 2 + backD / 2 + 0.015]]);
        const roll = cyl(backD * 0.42, backD * 0.42, seatW - 0.02, 12);
        roll.rotateZ(Math.PI / 2);
        paintGeo(roll, LOUNGE_PALETTE[0]);
        pieces.push([roll, [cx, backY + backH / 2, -d / 2 + backD / 2 + 0.015]]);
      });
      [-1, 1].forEach((side) => {
        const p = box(0.22, 0.2, 0.09);
        p.rotateY(side * 0.45);
        p.rotateZ(side * 0.1);
        paintGeo(p, LOUNGE_PALETTE[1]);
        pieces.push([p, [side * (w * 0.3), seatY + seatH * 0.5 + 0.06, -d * 0.18]]);
      });
      return { geo: merged(pieces), mat: "lounge", off: [0, 0, 0] };
    }
    case "reception": {
      const plinth = box(w, 0.04, d);
      plinth.translate(0, -h / 2 + 0.02, 0);
      paintGeo(plinth, 14273974);
      const slab = box(w + 0.04, 0.05, d + 0.06);
      slab.translate(0, h / 2 - 0.025, 0.02);
      paintGeo(slab, 12163695);
      return { geo: merged([[plinth, null], [slab, null]]), mat: "reception", off: [0, 0, 0] };
    }
    case "window": {
      const fW = 0.06, iw = w / 2 - fW, ih = h / 2 - fW;
      return { geo: box(iw * 2 - 0.01, ih * 2 - 0.01, 0.01), mat: "windowGlass", off: [0, 0, 0] };
    }
    case "glasspanel":
      return { geo: box(w - 0.08, h - 0.1, 0.012), mat: "glass", off: [0, 0, 0] };
    case "stool": {
      const pad = cyl(w * 0.46, w * 0.46, 0.02, 20);
      paintGeo(pad, LOUNGE_PALETTE[0]);
      return { geo: pad, mat: "lounge", off: [0, h / 2 + 0.01, 0] };
    }
    default:
      return null;
  }
}
function artworkImageMaterial(src, faceW, faceH, onAsyncTex, matteMargin = 0) {
  if (typeof document === "undefined") return MATS.paper();
  const LONG = 1024;
  const cw = faceW >= faceH ? LONG : Math.max(1, Math.round(LONG * faceW / faceH));
  const ch = faceH >= faceW ? LONG : Math.max(1, Math.round(LONG * faceH / faceW));
  const mmx = faceW > 0 ? cw * (matteMargin / faceW) : 0;
  const mmy = faceH > 0 ? ch * (matteMargin / faceH) : 0;
  const availW = Math.max(1, cw - 2 * mmx), availH = Math.max(1, ch - 2 * mmy);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  const paintMat = () => {
    ctx.fillStyle = "#efece6";
    ctx.fillRect(0, 0, cw, ch);
  };
  paintMat();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const img = new Image();
  img.onload = () => {
    paintMat();
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (iw > 0 && ih > 0) {
      const s = Math.min(availW / iw, availH / ih), dw = iw * s, dh = ih * s;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }
    tex.needsUpdate = true;
    if (onAsyncTex) {
      try {
        onAsyncTex();
      } catch {
      }
    }
  };
  img.onerror = () => {
    if (onAsyncTex) {
      try {
        onAsyncTex();
      } catch {
      }
    }
  };
  img.src = src;
  return mat;
}
export {
  ART_SCREEN_CAP,
  FRAME_MAT_ID,
  MATS,
  UNIQUE_TEX_TYPES,
  artworkCanvasDims,
  artworkImageMaterial,
  artworkSize,
  bakeUVRepeat,
  box,
  featureMat,
  finishMat,
  floorMatTex,
  matteMarginFor,
  partAccent,
  partGeo,
  partMat,
  partY,
  shellFlatMat,
  unshareMaterial,
  wallMat,
  warmBuildingTexCache
};
