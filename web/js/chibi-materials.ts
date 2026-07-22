// @ts-nocheck — 순수 이동(C-3 chibi 분해), strict 타입은 후속 작업.
// chibi-materials.js — 툰 셰이딩(_toonRamp 싱글턴·toonRamp 접근자)·채도부스트(vivid/
//   vividSkin)·아웃라인·지오 팩토리(lathe/shirt/fur/muzzle). chibi.js에서 분해(C-3 S5).
//   _toonRamp 싱글턴은 이 모듈 단일 소유 — 타 모듈은 toonRamp() 접근자만 사용(캐시 이중화 금지).
import * as THREE from 'three';
import { mergeVertices } from '../utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// 파츠 빌더
// ---------------------------------------------------------------------------
// 플랫 셀셰이딩 램프 — 레퍼런스(엔젤이)식 "단색 채움 + 그림자 1겹" 룩.
// 2톤(그림자/본색) hard step: 3D 그라디언트를 없애 스티커 일러스트처럼 평면화한다.
// 모듈 1회 생성·공유(개체별 dispose 대상 아님).
let _toonRamp = null;
export function toonRamp() {
  if (_toonRamp) return _toonRamp;
  // 스티커 인쇄물처럼 거의 평면 — 그림자를 아주 얕게(0.9)만 남겨 형태 힌트만.
  const data = new Uint8Array([230, 255]); // 2스텝(RedFormat): 그림자 0.9 / 본색 1.0
  const tex = new THREE.DataTexture(data, 2, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  _toonRamp = tex;
  return tex;
}
// 채도 부스트 — 스티커 톤 유지하며 색만 또렷하게. HSL의 S만 올려 흰/회색(저채도)은
// 거의 그대로, 유채색만 선명해진다(감독: "채도 더 올려"). L·H는 보존.
const SAT_BOOST = 1.5;
export function vivid(color, mul) {
  const c = new THREE.Color(color);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * (mul || SAT_BOOST)), hsl.l);
  return c;
}
export function toon(color, doubleSide) {
  // 회전체(치마/꽁지머리)와 열린 구 세그먼트(뒷머리 커튼)는 프로파일 방향에 따라
  // 법선이 안쪽을 향할 수 있어 DoubleSide가 필수다 — 앞면 컬링으로 "안 보이는
  // 치마" 버그가 났던 실측 교훈.
  return new THREE.MeshToonMaterial({
    color: vivid(color),
    gradientMap: toonRamp(),
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
}

// ---------------------------------------------------------------------------
// 피부 전용 채도 강화(감독 최종 결정 B) — 톤매핑(main.js ACES exposure 0.92)은
// 절대 무변경, "피부만 채도 올려 생기" 요청에 대응. 다른 파츠(머리·옷·눈·
// 아웃라인)는 위 vivid()/toon()의 기본 SAT_BOOST(1.5)를 그대로 쓰고 무영향.
//
// 실측 함정 둘 — 상수는 전부 실제 THREE.Color 계산값으로 보정했다(손계산 sRGB
// 수치와 안 맞아 처음엔 효과가 전혀 안 보였다):
// 1) THREE.Color는 ColorManagement가 기본 on이라 getHSL()/c.r,g,b가 "선형" 공간
//    값을 돌려준다(SRGBColorSpace를 명시해야 눈에 보이는 sRGB 수치가 나옴) — 이
//    코드베이스의 기존 vivid()도 같은 기본값을 쓰므로 일관성을 위해 그대로 둔다.
// 2) 그 선형 공간에서 사람 기본 피부(#ffd9bd)는 L≈0.75인데 S가 이미 1.0으로
//    꽉 차 있다(아주 밝은 파스텔은 RGB 채널의 아주 작은 차이도 HSL 공식상 S=1로
//    튄다 — HSL의 알려진 한계) — 채도만 곱해선 절대 안 바뀐다. 그래서 "실제 RGB
//    채널 폭"(chroma=max-min, HSL S와 달리 안 부풀려짐)을 기준으로 chroma가
//    있는 아주 밝은 색만 그 폭만큼 살짝 중간톤 쪽(L↓)으로 당겨 부스트를 실제로
//    드러낸다. 흰토끼(#fdfaf3 chroma≈0.09)·회코알라(#aeb0b2 chroma≈0.02)·판다·
//    귀신 시트처럼 채널 폭이 거의 없는(chroma<0.10, 이 선형 공간 기준 실측치)
//    무채색은 원본 그대로 반환 — "저채도는 거의 그대로"를 종족별 예외 목록 없이
//    자동으로 만족한다.
const SKIN_SAT_BOOST = 1.6;
const SKIN_ACHROMATIC_GATE = 0.10; // 이 미만 chroma는 사실상 무채색 — 무변경(실측: 흰토끼 0.086은 걸러짐)
export function vividSkin(color) {
  const c = new THREE.Color(color);
  const chroma = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
  if (chroma < SKIN_ACHROMATIC_GATE) return c; // 흰/회색 계열은 손대지 않음
  const hsl = {};
  c.getHSL(hsl);
  let l = hsl.l;
  if (l > 0.65) {
    // 아주 밝은(창백한) 색만 — chroma가 클수록(원래 색기가 뚜렷했을수록) 더 당김
    const pull = Math.min(0.14, (l - 0.65) * 1.0) * Math.min(1, chroma * 3);
    l -= pull;
  }
  c.setHSL(hsl.h, Math.min(1, hsl.s * SKIN_SAT_BOOST), l);
  return c;
}

// 외곽선 전역 두께 배수 — 1=기존, <1 얇게. 감독 지시(조금 얇게)로 하향.
// addOutline의 모든 호출부(월드 단위 thickness)에 일괄 적용된다(SSOT 1지점 조정).
const OUTLINE_SCALE = 0.8;
/**
 * 외곽선 — 법선 방향으로 "고정 두께"만큼 밀어낸 백페이스 셸. 스케일 배수 방식과 달리
 * 파츠 크기와 무관하게 일정한 선 두께를 만들어(스티커 일러스트식 균일 외곽선), 큰 파츠와
 * 작은 파츠의 외곽선이 같은 굵기로 보인다. thickness는 월드 단위(≈0.012 = 굵은 만화 선).
 */
export function addOutline(mesh, thickness, matCollect, geoCollect) {
  thickness *= OUTLINE_SCALE;
  let g = mesh.geometry.clone();
  // 하드에지 저폴리(고깔 등)에서 면법선이 갈라지면 오프셋 셸이 뾰족뾰족 찢어진다.
  // 위치 기준으로 정점을 용접(법선/uv 제거 후 mergeVertices)하고 부드러운 법선을
  // 재계산해, 오프셋 셸이 연속된 매끈한 외곽선이 되도록 한다(마감 정리).
  try {
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    const welded = mergeVertices(g);
    welded.computeVertexNormals();
    g.dispose();       // 용접 성공 시 용접 전 클론은 버린다(GPU/메모리 누수 방지)
    g = welded;
  } catch (_) {
    if (!g.attributes.normal) g.computeVertexNormals();
  }
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  if (nor) {
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) + nor.getX(i) * thickness,
        pos.getY(i) + nor.getY(i) * thickness,
        pos.getZ(i) + nor.getZ(i) * thickness
      );
    }
    pos.needsUpdate = true;
  }
  // 외곽선 색 = 파츠 자기 색을 어둡게(밝기 차등). 흰 얼굴→회색, 파란 옷→짙은 파랑 등.
  // 패턴 상의처럼 재질색이 흰색인 경우 userData.outlineBase 힌트로 실제 옷색을 쓴다.
  const base = mesh.userData && mesh.userData.outlineBase
    ? new THREE.Color(mesh.userData.outlineBase)
    : mesh.material && mesh.material.color ? mesh.material.color.clone() : new THREE.Color('#3f2d22');
  const lum = 0.2126 * base.r + 0.7152 * base.g + 0.0722 * base.b;
  base.multiplyScalar(lum > 0.6 ? 0.5 : lum > 0.3 ? 0.55 : 0.65);
  const mat = new THREE.MeshBasicMaterial({ color: base, side: THREE.BackSide });
  const outline = new THREE.Mesh(g, mat);
  mesh.add(outline);
  matCollect.push(mat);
  if (geoCollect) geoCollect.push(g);
}

export function lathePoints(pairs) {
  return pairs.map(([x, y]) => new THREE.Vector2(x, y));
}

// 작은 하트(하트 프린트용)
function drawMiniHeart(x, cx, cy, r) {
  x.beginPath();
  x.moveTo(cx, cy + r * 0.85);
  x.bezierCurveTo(cx - r * 1.4, cy - r * 0.35, cx - r * 0.5, cy - r * 1.2, cx, cy - r * 0.35);
  x.bezierCurveTo(cx + r * 0.5, cy - r * 1.2, cx + r * 1.4, cy - r * 0.35, cx, cy + r * 0.85);
  x.closePath();
  x.fill();
}

// 상의 패턴 텍스처 — bg=옷색, 위에 흰 줄무늬/물방울/하트. 반복 래핑으로 몸통·소매에 감싼다.
export function shirtTexture(topHex, pattern) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = vivid(topHex).getStyle(); // 무지 상의와 동일 채도 부스트
  x.fillRect(0, 0, 128, 128);
  if (pattern === 'stripe') {
    x.fillStyle = 'rgba(255,255,255,0.5)';
    for (let y = 0; y < 128; y += 34) x.fillRect(0, y, 128, 17);
  } else if (pattern === 'dot') {
    x.fillStyle = 'rgba(255,255,255,0.72)';
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cx = (col * 32 + (row % 2 ? 16 : 0) + 16) % 128;
        x.beginPath();
        x.arc(cx, row * 32 + 16, 7, 0, Math.PI * 2);
        x.fill();
      }
    }
  } else if (pattern === 'heart') {
    x.fillStyle = 'rgba(255,255,255,0.82)';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cx = (col * 43 + (row % 2 ? 21 : 0) + 14) % 128;
        drawMiniHeart(x, cx, row * 43 + 22, 8);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.4, 2.4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 호랑이 털 줄무늬 텍스처 — 오렌지 바탕 + 물결 세로 검정 줄. skull·팔·다리·귀에 감긴다.
export function furStripeTexture(baseHex) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = vivid(baseHex).getStyle();
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(46,28,14,0.72)'; // 더 진하게 — 줄무늬가 탁하지 않고 또렷하게(감독 보고)
  // 굵기 변주 세로 줄 5개(살짝 물결). 성기되 대비를 살려 "호랑이"로 확실히 읽히게.
  for (const [bx, w] of [[8, 6], [33, 9], [59, 5], [85, 9], [110, 6]]) {
    x.beginPath();
    x.moveTo(bx, 0);
    x.quadraticCurveTo(bx + 6, 64, bx, 128);
    x.lineTo(bx + w, 128);
    x.quadraticCurveTo(bx + 6 + w, 64, bx + w, 0);
    x.closePath();
    x.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.4, 1.1);
  tex.offset.set(0.2, 0); // 정면 중앙에 줄이 딱 걸리지 않게 오프셋
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 종족별 주둥이 지오메트리 (skull 로컬 좌표, 털색 병합용). 없으면 null.
export function buildMuzzleGeo(species, R) {
  let g = null;
  if (species === 'dog') {
    // 뾰족한 강아지 코 — 얇고 긴 캡슐(taper와 합쳐 더 뾰족)
    g = new THREE.CapsuleGeometry(0.11 * R, 0.34 * R, 4, 10);
    g.rotateX(Math.PI / 2);
    g.translate(0, -0.13 * R, 0.74 * R);
  } else if (species === 'fox') {
    g = new THREE.ConeGeometry(0.15 * R, 0.4 * R, 14);
    g.rotateX(-Math.PI / 2);
    g.translate(0, -0.06 * R, 0.74 * R);
  } else if (species === 'bear') {
    g = new THREE.SphereGeometry(0.24 * R, 16, 12);
    g.scale(1, 0.85, 1.25);
    g.translate(0, -0.1 * R, 0.74 * R);
  } else if (species === 'raccoon') {
    g = new THREE.SphereGeometry(0.2 * R, 14, 12);
    g.scale(0.9, 0.8, 1.2);
    g.translate(0, -0.08 * R, 0.76 * R);
  } else if (species === 'panda') {
    g = new THREE.SphereGeometry(0.14 * R, 12, 10);
    g.scale(1, 0.82, 0.95);
    g.translate(0, -0.05 * R, 0.74 * R);
  }
  return g;
}
