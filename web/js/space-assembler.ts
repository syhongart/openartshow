// @ts-nocheck — 순수 이동(C-3 분해). strict 타입 정합은 후속 마일스톤.
// space-assembler.ts — 공간 문서 → THREE.Group 조립기·조명(B). space-render.js에서 순수 추출.
import * as THREE from 'three';
import { FOOTPRINT, STORY_H, PART_TYPES, TINT_PALETTES } from './space.js';
import {
  bakeUVRepeat, floorMatTex, finishMat, wallMat, featureMat, partY, MATS, FRAME_MAT_ID,
  artworkCanvasDims, box, partGeo, artworkSize, artworkImageMaterial, matteMarginFor,
  partMat, UNIQUE_TEX_TYPES, partAccent,
} from './space-parts.js';
/** 공간 치수 (footprint·storyH 프리셋 해석) */
export function spaceDims(space) {
  const [fw, fd] = FOOTPRINT[space.shell.footprint];
  const H = STORY_H[space.shell.storyH];
  const floors = Math.max(1, Math.min(4, (space.shell.floors | 0) || 1)); // 다층(가산). 생략=1=단층
  return { fw, fd, hw: fw / 2, hd: fd / 2, H, t: space.shell.wallT, floors, totalH: floors * H };
}

// [오픈월드 다층] shell.stairs 밴드 → 오를 수 있는 경사 램프 지오. 물리(등반 y)는 world.js 밴드가 담당하므로
// 지오는 근사 경사면(밟는 느낌)이면 충분. z0(yFrom)→z1(yTo) 방향으로 기울인 슬래브.
function buildStairRamp(track, s) {
  const w = Math.abs(s.x1 - s.x0);
  const run = Math.hypot(s.z1 - s.z0, s.yTo - s.yFrom); // 경사면 길이
  const geo = new THREE.BoxGeometry(w, 0.18, run);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 0.92, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((s.x0 + s.x1) / 2, (s.yFrom + s.yTo) / 2, (s.z0 + s.z1) / 2);
  mesh.rotation.x = Math.atan2(s.yTo - s.yFrom, s.z1 - s.z0); // z-y 평면 경사
  mesh.castShadow = true; mesh.receiveShadow = true;
  track(mesh); // geo·mat dispose 등록
  return mesh;
}

// 인스턴스 색 틴트(#56/#43) — 서브그룹 분리 없이 InstancedMesh.setColorAt(instanceColor)로 파츠별 색.
// 색 없으면 타입별 기본 폴백(팔레트 index0) = 기존 단색 재질 동색(하위호환). rug 보더는 본체색 35% 화이트 블렌드.
const TINT_TYPES = new Set(['rug', 'drape']);
const TINT_DEFAULT = { rug: TINT_PALETTES.rug[0], drape: TINT_PALETTES.drape[0] }; // 팔레트 SSOT에서 파생
const RUG_ACCENT_DEFAULT = '#d6ccb7'; // 무색(기본) 러그 보더 = 기존 clothInner 고정색(구버전 100% 동일 — 검수 권고②)
const tintColor = (p) => new THREE.Color(p.color || TINT_DEFAULT[p.t] || '#ffffff');
// 색 지정 시 본체색 35% 화이트 블렌드, 무색(기본)이면 기존 고정 보더색 유지(회귀 방지)
const rugAccentColor = (p) => (p.color ? tintColor(p).lerp(new THREE.Color(0xffffff), 0.35) : new THREE.Color(RUG_ACCENT_DEFAULT));

// [오픈월드] 문틀 통로 폭 — world.js clampPos 통과 판정과 공유해 렌더/통과 경계 드리프트 방지.
export const DOOR_W = 2.6;

/**
 * 공간 문서 → THREE.Group. 반환 group.userData:
 *   { dims, partRefs: [{part, index, object}], geos:[], mats:[] } (dispose·픽킹용)
 * opts.pickable: 파츠에 userData.partIndex 부여(빌더 선택용).
 */
export function buildSpaceGroup(space, opts = {}) {
  const g = new THREE.Group();
  const geos = [], mats = [];
  const track = (o) => {
    if (o.material && o.material.userData && o.material.userData.uvRepeat && o.geometry) { // 공유 텍스처 마감: 세그먼트 repeat을 지오 uv에 굽기
      const [rx, ry] = o.material.userData.uvRepeat; bakeUVRepeat(o.geometry, rx, ry);
    }
    if (o.geometry) geos.push(o.geometry); if (o.material) mats.push(o.material); return o;
  };
  const { fw, fd, hw, hd, H, t, floors, totalH } = spaceDims(space);

  // shell: 바닥·천장·4벽 + 피처월 오버레이 (미술관 재질 계승)
  // shellSurf: 라이트맵 베이크용 내부 표면 기술자(중심·내부법선·업·폭·높이) — 정투영 카메라·uv1 정렬에 사용.
  const shellSurf = [];
  const UP_Y = () => new THREE.Vector3(0, 1, 0);
  // [다층] 슬래브: f=0 바닥(y=-0.05, 현행 동일) + f>=1 층간 바닥(=아래층 천장 공유). floors=1이면 루프 1회로 현행 합동.
  // Stop B: 슬래브는 통짜(계단 상부 개구부는 후속) — 램프가 관통(시각 클리핑 감수).
  let floorM = null;
  for (let f = 0; f < floors; f++) {
    const sm = track(new THREE.Mesh(new THREE.BoxGeometry(fw, 0.1, fd), floorMatTex(space.shell.finish.floor, fw, fd)));
    sm.position.set(0, f * H - 0.05, 0); sm.receiveShadow = true; g.add(sm);
    shellSurf.push({ mesh: sm, center: new THREE.Vector3(0, f * H + 0.001, 0), normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1), width: fw, height: fd });
    if (f === 0) floorM = sm;
  }
  if (!opts.hideCeiling) { // 에디터 컷어웨이: 천장 숨김(방 안이 보이게). 최상층 천장 y=totalH(floors=1이면 H, 현행 동일).
    const ceilM = track(new THREE.Mesh(new THREE.BoxGeometry(fw, 0.1, fd), finishMat('ceiling', space.shell.finish.ceiling))); ceilM.position.set(0, totalH, 0); g.add(ceilM);
    // #54 방문자뷰: 천장이 보이므로 셸 라이트맵 베이크 대상에 포함(내부면=아래 향한 법선).
    // 빌더(hideCeiling:true)에는 이 분기가 안 타므로 shell 미추가 → 기존 베이크 회귀 없음.
    shellSurf.push({ mesh: ceilM, center: new THREE.Vector3(0, totalH - 0.051, 0), normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1), width: fw, height: fd });
  }
  // 코너 정합(#62): N/S 벽을 두께만큼 양옆 연장(fw+t)해 외곽 빈틈을 덮고, E/W 벽을 fd-t로 줄여
  // 끝이 N/S 내부면(z=±(fd-t)/2)에 정확히 맞닿게 함 → 코너 노치(외곽 빈틈)·겹침(내곽 z-fighting) 동시 제거.
  // 벽 중심(x,z)·내부면 위치 불변 → featureWall·shellSurf·라이트맵 정합 유지.
  // [오픈월드] shell.entries에 든 방향은 통짜 벽 대신 문틀(좌우 세그먼트+상단 인방)로 뚫어 파셀 통행로를 낸다.
  // entries 빈배열(기존 v2 문서 전부)이면 이 분기가 안 타므로 회귀 0. 방향 인덱스 = WALL_DIRS 순서.
  const WALL_DIRS = ['north', 'south', 'west', 'east'];
  const DOOR_H = 2.4;                     // 문틀 통로 높이(m). DOOR_W는 모듈 상수(world.js 공유)
  const wallFin = space.shell.finish.wall;
  // [다층] 4벽을 층별(baseY=f*H, 높이 H)로. 문틀(entries)은 지면층(f=0)만 — 파셀 통행. floors=1이면 현행 합동.
  for (let f = 0; f < floors; f++) {
    const baseY = f * H;
    const openSet = (f === 0) ? new Set(space.shell.entries || []) : new Set();
    [[0, -hd, fw + t, t], [0, hd, fw + t, t], [-hw, 0, t, fd - t], [hw, 0, t, fd - t]].forEach(([x, z, ww, dd], wi) => {
      const wallW = Math.max(ww, dd); // 벽면 가로 길이(N/S=fw, E/W=fd)로 텍스처 반복
      const inN = new THREE.Vector3(-x, 0, -z).normalize(); // 방 중심 향한 내부 법선
      const horiz = ww >= dd;               // N/S=수평(길이축 x) / W/E=수직(길이축 z)
      const len = horiz ? ww : dd, thick = horiz ? dd : ww;
      if (openSet.has(WALL_DIRS[wi]) && len > DOOR_W + 0.8) {
        // 문틀: 좌·우 세그먼트 + 상단 인방(가운데 통로). shellSurf는 세그먼트만(인방 생략 — 베이크 근사).
        const side = (len - DOOR_W) / 2, lintelH = Math.max(0.001, H - DOOR_H), off = DOOR_W / 2 + side / 2;
        for (const s of [-1, 1]) {
          const sw = horiz ? side : thick, sd = horiz ? thick : side;
          const sx = x + (horiz ? s * off : 0), sz = z + (horiz ? 0 : s * off);
          const seg = track(new THREE.Mesh(new THREE.BoxGeometry(sw, H, sd), wallMat(wallFin, side, H)));
          seg.position.set(sx, baseY + H / 2, sz); seg.receiveShadow = true; g.add(seg);
          shellSurf.push({ mesh: seg, center: new THREE.Vector3(sx + inN.x * (t / 2), baseY + H / 2, sz + inN.z * (t / 2)), normal: inN, up: UP_Y(), width: side, height: H });
        }
        const lw = horiz ? DOOR_W : thick, ld = horiz ? thick : DOOR_W;
        const lintel = track(new THREE.Mesh(new THREE.BoxGeometry(lw, lintelH, ld), wallMat(wallFin, DOOR_W, lintelH)));
        lintel.position.set(x, baseY + DOOR_H + lintelH / 2, z); lintel.receiveShadow = true; g.add(lintel);
      } else {
        const m = track(new THREE.Mesh(new THREE.BoxGeometry(ww, H, dd), wallMat(wallFin, wallW, H)));
        m.position.set(x, baseY + H / 2, z); m.receiveShadow = true; g.add(m);
        shellSurf.push({ mesh: m, center: new THREE.Vector3(x + inN.x * (t / 2), baseY + H / 2, z + inN.z * (t / 2)), normal: inN, up: UP_Y(), width: wallW, height: H });
      }
    });
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

  // [다층] 계단 램프 — shell.stairs 밴드를 오를 수 있는 경사로 렌더(물리 등반은 world.js 밴드). 빈배열이면 미생성.
  for (const s of (space.shell.stairs || [])) g.add(buildStairRamp(track, s));

  // 파츠: 타입별 그룹. 인스턴싱 가능 → InstancedMesh, 작품/스크린 → 개별(+자동액자 캔버스).
  // 서브그룹 키 = 타입×variant×mat (#56). color는 키에 넣지 않는다 → 같은 지오/재질 InstancedMesh 공유 + 인스턴스 틴트.
  // [오픈월드] shellOnly: 원거리/대각 파셀 임포스터 — 셸만 그리고 파츠 생략(draw-call 절감,
  // ART_SCREEN_CAP=80이 방당이므로 다중 파셀 스트리밍 시 필수). 빈 목록이면 파츠 루프가 안 돈다.
  const byKey = {};
  (opts.shellOnly ? [] : space.parts).forEach((p, i) => {
    const key = `${p.t}:${p.variant || ''}:${p.mat || ''}`;
    (byKey[key] = byKey[key] || { type: p.t, variant: p.variant, mat: p.mat, list: [] }).list.push({ p, i });
  });
  const partRefs = [];
  // v2 스택: p.y(절대 월드 Y·파츠 중심)가 있으면 그 값, 없으면 타입별 기본 y(바닥/벽걸이).
  const pY = (p, type) => (p.y != null ? p.y : partY(type, H) + (p.floor || 0) * H); // [다층] p.floor 층 오프셋(생략=0=지면층)
  for (const grp of Object.values(byKey)) {
    const { type, variant, mat, list } = grp;
    if (type === 'artwork') {
      // ── 자동 액자: (스타일 × 이미지유무) 세분화. 두께 D·캔버스 z오프셋은 스타일 무관 고정. ──
      const D = PART_TYPES.artwork.size[2];       // 0.1 — 스포트라이트 오프셋 의존
      const ART_OFF_Z = 0.03;                     // 캔버스 accent z오프셋(기존 partAccent off와 동일)
      const canvasPos = (p, cz) => new THREE.Vector3(p.x + Math.sin(p.ry) * cz, pY(p, 'artwork'), p.z + Math.cos(p.ry) * cz);
      const addFrameMesh = (geo, mat, p, i) => {
        const fm = new THREE.Mesh(geo, mat);
        fm.position.set(p.x, pY(p, 'artwork'), p.z); fm.rotation.y = p.ry;
        fm.castShadow = true; fm.receiveShadow = true;
        if (opts.pickable) fm.userData.partIndex = i;
        g.add(fm); partRefs.push({ part: p, index: i, object: fm });
        return fm;
      };
      const byStyle = { minimal: [], classic: [], frameless: [] };
      for (const it of list) (byStyle[it.p.frame] || byStyle.minimal).push(it);
      for (const style of ['minimal', 'classic', 'frameless']) {
        const items = byStyle[style]; if (!items.length) continue;
        const frameMat = (MATS[FRAME_MAT_ID[style]] || MATS.frameBlack)(); mats.push(frameMat);
        const withSrc = items.filter(({ p }) => p.src);
        const noSrc = items.filter(({ p }) => !p.src);
        // 빈 액자(noSrc): 스타일별 공유 지오(고정 1.2×1.6) — draw-call 예산·회귀 없음.
        if (noSrc.length) {
          const [dw, dh] = PART_TYPES.artwork.size;
          const frameGeo = partGeo('artwork', { style, w: dw, h: dh, d: D }); geos.push(frameGeo);
          const { cw, ch } = artworkCanvasDims(style, dw, dh);
          const canvasGeo = box(cw, ch, 0.015); geos.push(canvasGeo);
          const paperMat = MATS.paper(); mats.push(paperMat);
          for (const { p, i } of noSrc) {
            addFrameMesh(frameGeo, frameMat, p, i);
            const cm = new THREE.Mesh(canvasGeo, paperMat); cm.position.copy(canvasPos(p, ART_OFF_Z)); cm.rotation.y = p.ry; cm.castShadow = true; g.add(cm);
          }
        }
        // 이미지 작품(withSrc): 파츠별 개별 지오(ar 크기·고유 텍스처) — geos 등록 필수(누수 방지).
        for (const { p, i } of withSrc) {
          const { W, H } = artworkSize(p.ar);
          const frameGeo = partGeo('artwork', { style, w: W, h: H, d: D }); geos.push(frameGeo); // ★ 개별 프레임 지오 회수 등록
          addFrameMesh(frameGeo, frameMat, p, i);
          const { cw, ch } = artworkCanvasDims(style, W, H);
          const canvasGeo = box(cw, ch, 0.015); geos.push(canvasGeo);                            // ★ 개별 캔버스 지오 회수 등록
          const cMat = artworkImageMaterial(p.src, cw, ch, opts.onAsyncTex, matteMarginFor(style, W, H)); mats.push(cMat);
          const cm = new THREE.Mesh(canvasGeo, cMat); cm.position.copy(canvasPos(p, ART_OFF_Z)); cm.rotation.y = p.ry; cm.castShadow = true; g.add(cm);
        }
      }
      continue;
    }
    const geo = partGeo(type, { variant, mat }), material = partMat(type, { mat }); geos.push(geo); mats.push(material);
    const isTint = TINT_TYPES.has(type); // 인스턴스 색 틴트(rug) — 서브그룹 분리 없이 색만 인스턴스별
    const canInstance = !UNIQUE_TEX_TYPES.has(type) && list.length > 1 && !opts.pickable;
    if (canInstance) {
      const im = new THREE.InstancedMesh(geo, material, list.length);
      im.castShadow = true; im.receiveShadow = true;
      list.forEach(({ p }, k) => {
        const m4 = new THREE.Matrix4().compose(new THREE.Vector3(p.x, pY(p, type), p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.ry, 0)), new THREE.Vector3(1, 1, 1));
        im.setMatrixAt(k, m4);
        if (isTint) im.setColorAt(k, tintColor(p)); // instanceColor(USE_INSTANCING_COLOR 자동) — vertexColors 불필요
      });
      if (isTint && im.instanceColor) im.instanceColor.needsUpdate = true;
      im.instanceMatrix.needsUpdate = true; g.add(im);
    } else {
      for (const { p, i } of list) {
        const useMat = isTint ? material.clone() : material; // 비인스턴싱(에디터/단일): 재질 클론 후 color 폴백
        if (isTint) { useMat.color.copy(tintColor(p)); mats.push(useMat); }
        const mm = new THREE.Mesh(geo, useMat);
        mm.position.set(p.x, pY(p, type), p.z); mm.rotation.y = p.ry;
        mm.castShadow = true; mm.receiveShadow = true;
        if (opts.pickable) mm.userData.partIndex = i;
        g.add(mm); partRefs.push({ part: p, index: i, object: mm });
      }
    }
    // 2색 accent(작품 캔버스·유리·잎·화면·렌즈) — 픽킹 대상 아님.
    // 2색 accent(유리·잎·화면·렌즈 등) — 픽킹 대상 아님. (작품 캔버스는 위 artwork 분기가 전담)
    const acc = partAccent(type, { variant, mat });
    if (acc) {
      geos.push(acc.geo); // 공유 지오(동일 서브그룹=동일 크기)
      const place = (p) => { const [ox, oy, oz] = acc.off; return { pos: new THREE.Vector3(p.x + Math.cos(p.ry) * ox + Math.sin(p.ry) * oz, pY(p, type) + oy, p.z - Math.sin(p.ry) * ox + Math.cos(p.ry) * oz), ry: p.ry }; };
      const accMat = (MATS[acc.mat] || MATS.paper)(); mats.push(accMat);
      const accTint = acc.tint === 'rugAccent'; // 보더 인스턴스 색 틴트(rug)
      if (list.length > 1) { // 장식 accent는 인스턴싱(텍스처 공유 무해)
        const aim = new THREE.InstancedMesh(acc.geo, accMat, list.length);
        aim.castShadow = true;
        list.forEach(({ p }, k) => { const pl = place(p); aim.setMatrixAt(k, new THREE.Matrix4().compose(pl.pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pl.ry, 0)), new THREE.Vector3(1, 1, 1))); if (accTint) aim.setColorAt(k, rugAccentColor(p)); });
        if (accTint && aim.instanceColor) aim.instanceColor.needsUpdate = true;
        aim.instanceMatrix.needsUpdate = true; g.add(aim);
      } else {
        if (accTint) accMat.color.copy(rugAccentColor(list[0].p));
        const pl = place(list[0].p); const am = new THREE.Mesh(acc.geo, accMat); am.position.copy(pl.pos); am.rotation.y = pl.ry; am.castShadow = true; g.add(am);
      }
    }
  }
  g.userData = { dims: { fw, fd, hw, hd, H, t, floors, totalH }, partRefs, geos, mats, floor: floorM, shell: shellSurf };
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
const AO_GROUNDED = { pedestal: 1.2, pillar: 1.5, bench: 2.0, planter: 1.3, vitrine: 1.4, labelStand: 1.0, stair: 1.6, wreath: 1.1, cake: 1.0, banner: 1.1, bigplant: 1.3, palm: 1.2, succulent: 0.5, vase: 0.5, floorlamp: 1.0, stanchion: 1.6, mirror: 1.1, sign: 1.1, railing: 1.3, lounge: 1.9, reception: 2.0, glasspanel: 1.3, stool: 0.55 }; // balloon·hangplant·window 제외: 중심이 허공(아치/천장/벽 부착)이라 접촉그림자 부적합
const ART_SPOT_CAP = 10; // 실시간 라이트 상한(편집 모드 대표 조명). 초과분은 베이킹 트랙에서 처리 예정.
export function addRoomLighting(group, opts = {}) {
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
  // [단계2 라이트 풀] opts.noSpots(오픈월드 전용): SpotLight 생성부(a·b)만 스킵하고 AO 접촉그림자(c)는 유지.
  // 오픈월드는 파셀 경계 통과마다 조명 개수가 급변해 셰이더 프로그램이 매번 재컴파일되던 문제(히칭 총량 급증)를
  // world.js 라이트 풀(개수 고정)로 해소한다 — 스포트 배정은 world.js가 풀에서 수행. 기본값(noSpots 미지정)은
  // 라이브(index/visit/builder) 경로 완전 불변(스포트 배치·개수·색·강도 동일). 라이브 접촉은 이 게이트 1줄뿐.
  if (opts.noSpots) return;
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

/** group.userData의 geos/mats/렌더타깃 정리 */
export function disposeSpaceGroup(g) {
  const u = g.userData || {};
  (u.geos || []).forEach((x) => x.dispose && x.dispose());
  (u.mats || []).forEach((m) => { // 텍스처 정리(누수 방지). 단 공유 텍스처(userData.shared)는 방문뷰·빌더·world 공용이라
    // 여기서 dispose하면 타 그룹이 참조 중인 걸 파괴 → 라이브 회귀. shared는 skip(세션 캐시 영구 유지). kintsugi/water/grass clone은 skip 아님 → 정상 회수.
    if (m.map && m.map.dispose && !(m.map.userData && m.map.userData.shared)) m.map.dispose();
    if (m.normalMap && m.normalMap.dispose && !(m.normalMap.userData && m.normalMap.userData.shared)) m.normalMap.dispose();
    m.dispose && m.dispose();
  });
  (u.bakedRTs || []).forEach((rt) => rt.dispose && rt.dispose()); // 라이트맵 렌더타깃 회수
}

/** 팔레트 썸네일용 — 파츠 1개(본체+accent)를 원점에 세운 Group. 아이콘 렌더 후 dispose 호출부 책임. */
export function buildPartPreview(type) {
  const g = new THREE.Group();
  const geo = partGeo(type), m = partMat(type);
  if (TINT_TYPES.has(type)) m.color.copy(tintColor({ t: type })); // 썸네일=타입 기본 색(rug sand / drape charcoal) — 흰색 base 방지
  g.add(new THREE.Mesh(geo, m));
  const acc = partAccent(type);
  if (acc) {
    const accMat = (MATS[acc.mat] || MATS.paper)();
    if (acc.tint === 'rugAccent') accMat.color.copy(rugAccentColor({ t: type }));
    const am = new THREE.Mesh(acc.geo, accMat);
    const [ox, oy, oz] = acc.off; am.position.set(ox, oy, oz); g.add(am);
  }
  return g;
}

/** 현재 작품+스크린 개수 (80캡 판정용) */
export function uniqueTexCount(space) {
  return space.parts.reduce((n, p) => n + (UNIQUE_TEX_TYPES.has(p.t) ? 1 : 0), 0);
}
