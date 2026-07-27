// @ts-nocheck — 순수 이동(C-3 chibi 분해), strict 타입은 후속 작업.
// chibi-face.js — 2D 캔버스 얼굴 텍스처(왕눈이/입/수염/동물·로봇·유령 페이스).
//   chibi.js에서 분해(C-3 S4). color(shade/shadeAlpha)·materials(vivid) 참조.
import * as THREE from 'three';
import { shade, shadeAlpha } from './chibi-color.js';
import { vivid } from './chibi-materials.js';
import { NONHUMAN } from './chibi-schema.js';

// ---------------------------------------------------------------------------
// 얼굴 캔버스 — 귀여움의 8할. 512² 투명 캔버스에 왕눈이/입/볼터치를 그려
// 머리 구의 전면 캡에 매핑한다.
// ---------------------------------------------------------------------------
function beardColor(p, alpha) {
  let factor = 0.6;
  const hc = new THREE.Color(p.hairColor);
  const sk = new THREE.Color(p.skin);
  const lumHC = 0.2126 * hc.r + 0.7152 * hc.g + 0.0722 * hc.b;
  const lumSK = 0.2126 * sk.r + 0.7152 * sk.g + 0.0722 * sk.b;
  if (Math.abs(lumHC * factor - lumSK) < 0.15) factor = 0.4; // 피부와 대비 부족 시 더 어둡게
  return shadeAlpha(p.hairColor, factor, alpha);
}
// 수염 (사람 전용, 얼굴 캔버스). ouch(피격) 시엔 입이 크게 벌어지므로 호출부에서 끈다.
function drawBeard(ctx, p) {
  if (p.species !== 'human' || !p.beardStyle || p.beardStyle === 'none') return;
  // 하관을 감싸는 연속 수염 — 좌 구레나룻→턱→우 구레나룻(한 덩어리), 윗선은 입 아래로
  // 처져 입을 비운다. 분리된 볼 얼룩이 아니라 "수염"으로 3초 안에 읽히게.
  const drawJawBeard = (alpha) => {
    ctx.fillStyle = beardColor(p, alpha);
    ctx.beginPath();
    ctx.moveTo(256 - 156, 322);
    ctx.quadraticCurveTo(256 - 168, 420, 256 - 78, 462);
    ctx.quadraticCurveTo(256, 480, 256 + 78, 462);
    ctx.quadraticCurveTo(256 + 168, 420, 256 + 156, 322);
    ctx.quadraticCurveTo(256 + 120, 348, 256 + 52, 392); // 윗 경계(입 비우는 아치)
    ctx.quadraticCurveTo(256 + 26, 384, 256, 388);
    ctx.quadraticCurveTo(256 - 26, 384, 256 - 52, 392);
    ctx.quadraticCurveTo(256 - 120, 348, 256 - 156, 322);
    ctx.closePath();
    ctx.fill();
  };
  // 턱수염(goatee) — 소울패치(입 아래)에서 턱까지 좁게 연결된 한 덩어리.
  const drawGoatee = (alpha) => {
    ctx.fillStyle = beardColor(p, alpha);
    ctx.beginPath();
    ctx.moveTo(256 - 34, 392);
    ctx.quadraticCurveTo(256 - 48, 444, 256, 470);
    ctx.quadraticCurveTo(256 + 48, 444, 256 + 34, 392);
    ctx.quadraticCurveTo(256, 404, 256 - 34, 392);
    ctx.closePath();
    ctx.fill();
  };
  const drawMustache = () => {
    ctx.strokeStyle = beardColor(p, 0.92);
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(256 - 34, 344);
    ctx.quadraticCurveTo(256 - 14, 332, 256, 338);
    ctx.quadraticCurveTo(256 + 14, 332, 256 + 34, 344);
    ctx.stroke();
  };
  if (p.beardStyle === 'stubble') {
    ctx.fillStyle = beardColor(p, 0.32);
    for (let row = 0; row < 6; row++) {
      const t = row / 5;
      const y = 392 + t * (448 - 392);
      const halfW = 132 * (1 - t) + 46 * t; // 볼폭132→턱폭46 테이퍼
      const n = 10 - row;
      for (let i = 0; i < n; i++) {
        const jitter = ((i * 7 + row * 13) % 5) - 2;
        const x = 256 - halfW + (2 * halfW) * (n === 1 ? 0.5 : i / (n - 1)) + jitter;
        ctx.beginPath();
        ctx.arc(x, y + jitter * 0.6, 2 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (p.beardStyle === 'mustache') {
    drawMustache();
  } else if (p.beardStyle === 'goatee') {
    drawGoatee(0.85);
    drawMustache();
  } else if (p.beardStyle === 'full') {
    drawJawBeard(0.85);
    drawMustache();
  }
}

// 4쪽 별 반짝임 — 왕눈이 초롱초롱 트윈클
function drawSparkle(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.28, y - r * 0.28);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.28, y + r * 0.28);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.28, y + r * 0.28);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.28, y - r * 0.28);
  ctx.closePath();
  ctx.fill();
}

function drawEye(ctx, cx, cy, p) {
  const EW = 44, EH = 64; // 반지름 (가로/세로) — 대두 리튠에 맞춰 왕눈이 확대
  if (p.eyeStyle === 'happy') {
    // 감은 웃는 눈 (∩) — 엔젤이식, 더 두껍고 둥글게
    ctx.strokeStyle = '#2a2320';
    ctx.lineCap = 'round';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(cx, cy + 26, EW + 6, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    return;
  }
  // 흰자 — 살짝만 (없으면 스티커 같고, 크면 무서움)
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, EW + 7, EH + 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 홍채 — 위가 밝고 아래로 갈수록 짙은 세로 그라디언트
  const grad = ctx.createLinearGradient(cx, cy - EH, cx, cy + EH);
  grad.addColorStop(0, shade(p.eyeColor, 1.25));
  grad.addColorStop(0.55, p.eyeColor);
  grad.addColorStop(1, shade(p.eyeColor, 0.45));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, EW, EH, 0, 0, Math.PI * 2);
  ctx.fill();
  // 동공
  ctx.fillStyle = 'rgba(25,18,14,0.9)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, EW * 0.42, EH * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  // 하이라이트 — 큰 것 좌상 + 작은 것 우하 (생기의 핵심)
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy - 22, 15, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 13, cy + 20, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // 반짝 스타일 — 4쪽 별 트윈클 추가 (초롱초롱)
  if (p.eyeStyle === 'sparkle') drawSparkle(ctx, cx + 21, cy - 34, 7);
  // 윗눈꺼풀 라인 (속눈썹 느낌)
  ctx.strokeStyle = '#2a2320';
  ctx.lineCap = 'round';
  ctx.lineWidth = p.eyeStyle === 'round' ? 9 : 14;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, EW + 9, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

// 동물 코/부리/주둥이 + 수염 — 3D 귀/꼬리와 함께 종족 정체성을 캔버스에서 보강.
function drawAnimalFace(ctx, species, MY) {
  const NY = 302; // 코 y (눈과 입 사이)

  // 부리(병아리·펭귄)·돼지 주둥이는 이제 3D 파츠라 캔버스에선 그리지 않음(겹침 방지).
  if (species === 'chick' || species === 'penguin' || species === 'pig') return;

  // 3D 코끝/주둥이가 붙는 종은 캔버스 코·인중 생략(고양이·코알라도 3D 코로 승격 — 감독 지적).
  const NOSE_3D = species === 'dog' || species === 'fox' || species === 'bear'
    || species === 'raccoon' || species === 'panda' || species === 'rabbit'
    || species === 'cat' || species === 'koala';
  if (!NOSE_3D) {
    const bigNose = species === 'koala';
    const pinkNose = species === 'cat' || species === 'hamster';
    const noseCol = pinkNose ? '#e88ba0' : '#2a2724';
    const nk = bigNose ? 2.0 : 1;
    ctx.fillStyle = noseCol;
    ctx.beginPath();
    ctx.moveTo(256 - 15 * nk, NY - 8 * nk);
    ctx.quadraticCurveTo(256 - 17 * nk, NY + 6 * nk, 256, NY + 15 * nk);
    ctx.quadraticCurveTo(256 + 17 * nk, NY + 6 * nk, 256 + 15 * nk, NY - 8 * nk);
    ctx.quadraticCurveTo(256, NY - 13 * nk, 256 - 15 * nk, NY - 8 * nk);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,58,48,0.5)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(256, NY + 14);
    ctx.lineTo(256, MY - 18);
    ctx.stroke();
  }
  // 호랑이 이마·볼 줄무늬 (몸 털 줄무늬 텍스처와 함께 확실한 호랑이 인상)
  if (species === 'tiger') {
    ctx.strokeStyle = 'rgba(38,26,18,0.85)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 10;
    for (const [x, y1, y2] of [[256 - 44, 148, 196], [256 + 44, 148, 196], [256 - 88, 166, 206], [256 + 88, 166, 206]]) {
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
    }
    ctx.lineWidth = 8;
    for (const s of [-1, 1]) for (const dy of [0, 26]) {
      ctx.beginPath();
      ctx.moveTo(256 + s * 128, 300 + dy);
      ctx.lineTo(256 + s * 172, 296 + dy);
      ctx.stroke();
    }
  }
  // 수염 — 고양이·여우·호랑이
  if (species === 'cat' || species === 'fox' || species === 'tiger') {
    ctx.strokeStyle = 'rgba(70,58,48,0.45)';
    ctx.lineWidth = 4;
    for (const s of [-1, 1]) {
      for (const [dy, len, curve] of [[-10, 96, -14], [4, 104, 0], [18, 96, 14]]) {
        ctx.beginPath();
        ctx.moveTo(256 + s * 30, NY + dy);
        ctx.quadraticCurveTo(256 + s * (30 + len * 0.5), NY + dy + curve * 0.3, 256 + s * (30 + len), NY + dy + curve);
        ctx.stroke();
      }
    }
  }
  // 토끼 앞니 — 입 아래 흰 사각
  if (species === 'rabbit') {
    ctx.fillStyle = '#fffdf7';
    ctx.strokeStyle = 'rgba(70,58,48,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(256 - 13, MY + 2, 26, 22, 5) : ctx.rect(256 - 13, MY + 2, 26, 22);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(256, MY + 2);
    ctx.lineTo(256, MY + 24);
    ctx.stroke();
  }
}

// 라운드 사각 헬퍼 (roundRect 미지원 시 rect 폴백)
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}
// 로봇 눈 — 각진 렌즈(소켓+발광 렌즈+스캔라인+하이라이트). 사이언 hairColor 포인트.
function drawRobotEyes(ctx, p) {
  const EYE_Y = 252, EYE_X = 84;
  for (const s of [-1, 1]) {
    const cx = 256 + s * EYE_X, cy = EYE_Y;
    ctx.fillStyle = shade(p.skin, 0.45);
    rrect(ctx, cx - 38, cy - 46, 76, 92, 16); ctx.fill();
    const g = ctx.createLinearGradient(cx, cy - 38, cx, cy + 38);
    g.addColorStop(0, shade(p.hairColor, 1.3));
    g.addColorStop(1, vivid(p.hairColor).getStyle());
    ctx.fillStyle = g;
    rrect(ctx, cx - 30, cy - 38, 60, 76, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 26, cy); ctx.lineTo(cx + 26, cy); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.ellipse(cx - 12, cy - 20, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
  }
}
// 로봇 입 — 스피커 그릴(가로 슬릿 3줄)
function drawRobotMouth(ctx, p) {
  const MY = 364;
  ctx.fillStyle = shade(p.skin, 0.4);
  for (const y of [MY - 14, MY, MY + 14]) { rrect(ctx, 256 - 26, y - 4, 52, 8, 4); ctx.fill(); }
}
// 귀신 눈 — 흰자 없는 큰 단색 동글눈 + 하이라이트
function drawGhostEyes(ctx) {
  const EYE_Y = 252, EYE_X = 84;
  for (const s of [-1, 1]) {
    const cx = 256 + s * EYE_X;
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath(); ctx.ellipse(cx, EYE_Y, 34, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.ellipse(cx - 10, EYE_Y - 14, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * 얼굴을 캔버스에 그린다. fx로 아픔/상처 상태를 표현한다:
 *   fx.ouch  — 맞은 직후 >_< 표정 (눈·입 오버라이드)
 *   fx.wound — 누적 상처 0~3 (1: 반창고, 2: +멍/처진 눈썹, 3: +눈물)
 */
export function drawFaceInto(canvas, p, fx) {
  const wound = (fx && fx.wound) || 0;
  const ouch = !!(fx && fx.ouch);
  const ctx = canvas.getContext('2d');
  // [사이클 B 텍스처 감량] 이 함수의 모든 드로잉은 512 좌표계다(EYE_Y 252 등 수십 곳 하드코딩).
  // 캔버스 실크기가 그보다 작으면(256 — drawFaceCanvas) 변환행렬로 통째 축소해 그린다 — 좌표계
  // 수정 없이 캔버스 크기만 자유로워진다. 512 캔버스가 들어오면 항등변환이라 종전과 동일.
  const fs = canvas.width / 512;
  ctx.setTransform(fs, 0, 0, fs, 0, 0);
  ctx.clearRect(0, 0, 512, 512);

  const EYE_Y = 252;
  const EYE_X = 84; // 눈 간격 — 살짝 좁혀 유아형 인상 (대두 리튠)
  const isAnimal = p.species && p.species !== 'human' && !NONHUMAN.has(p.species);

  // 호랑이 — 몸통 줄무늬 텍스처가 얼굴 정면까지 번지지 않게, 얼굴 중앙을 깔끔한 주황으로
  // 채운다(가장자리는 투명 → 옆머리 줄무늬가 자연스레 이어짐). 그 위에 이마·볼 줄무늬만.
  if (p.species === 'tiger' && !ouch) {
    const oc = vivid(p.skin).getStyle();
    const g = ctx.createRadialGradient(256, 300, 70, 256, 300, 250);
    g.addColorStop(0, oc);
    g.addColorStop(0.68, oc);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
  }

  // 종족 얼굴 배경 (눈보다 먼저) — 판다 눈패치 / 너구리 밴딧 마스크 / 펭귄 흰 얼굴
  if (!ouch) {
    if (p.species === 'panda') {
      ctx.fillStyle = '#2a2724';
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(256 + s * EYE_X, EYE_Y + 4);
        ctx.rotate(s * 0.32);
        ctx.beginPath();
        ctx.ellipse(0, 0, 58, 72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (p.species === 'raccoon') {
      // 밴딧 마스크 — 눈마다 짙은 패치(콧대는 밝게 비움) + 이마 쪽 살짝 위로
      ctx.fillStyle = '#43392f';
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(256 + s * (EYE_X + 6), EYE_Y);
        ctx.rotate(s * 0.28);
        ctx.beginPath();
        ctx.ellipse(0, 0, 50, 60, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (p.species === 'penguin') {
      // 흰 얼굴 판 — 어두운 머리색(후드) 위에 크게 크림 얼굴을 얹어 "펭귄"으로 확실히
      // 읽히게(감독 보고: 검은 덩어리로 보임). 이마~턱을 넉넉히 덮는다.
      ctx.fillStyle = '#fbfaf7';
      ctx.beginPath();
      ctx.ellipse(256, EYE_Y + 44, 188, 210, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 개구리는 눈이 3D 돌출(머리 위)이라 캔버스 눈을 생략
  const canvasEyes = p.species !== 'frog';
  // ouch >_< 도 캔버스 눈을 쓰는 종만 — 3D 눈(개구리)은 눈 메쉬가 따로 찡긋하므로
  // 여기서 또 그리면 눈이 4개가 된다(감독 지적 버그). canvasEyes로 게이트한다.
  if (ouch && canvasEyes) {
    // >_< 눈 — 아픔의 만국 공통어
    ctx.strokeStyle = '#2a2320';
    ctx.lineCap = 'round';
    ctx.lineWidth = 15;
    for (const s of [-1, 1]) {
      const cx = 256 + s * EYE_X;
      ctx.beginPath();
      ctx.moveTo(cx - s * 34, EYE_Y - 30);
      ctx.lineTo(cx + s * 24, EYE_Y + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 34, EYE_Y + 34);
      ctx.lineTo(cx + s * 24, EYE_Y + 2);
      ctx.stroke();
    }
  } else if (canvasEyes) {
    if (p.species === 'robot') drawRobotEyes(ctx, p);
    else if (p.species === 'ghost') drawGhostEyes(ctx);
    else {
      drawEye(ctx, 256 - EYE_X, EYE_Y, p);
      drawEye(ctx, 256 + EYE_X, EYE_Y, p);
    }
  }

  // 눈썹 — 평소 아치, 상처 2+ 는 팔자(슬픔), 아픔 순간은 안쪽으로 찌푸림.
  // 동물은 원색 눈썹이 어색해 털색(skin) 기준 은은하게, 판다·개구리는 생략.
  if (canvasEyes && !NONHUMAN.has(p.species) && !(p.species === 'panda' && !ouch && !(wound >= 2))) {
    ctx.strokeStyle = isAnimal ? shade(p.skin, 0.55) : shade(p.hairColor, 0.8);
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (ouch) {
        ctx.moveTo(256 + s * 58, EYE_Y - 92);
        ctx.lineTo(256 + s * 112, EYE_Y - 72);
      } else if (wound >= 2) {
        ctx.moveTo(256 + s * 60, EYE_Y - 74);
        ctx.lineTo(256 + s * 112, EYE_Y - 94);
      } else {
        ctx.arc(256 + s * EYE_X, EYE_Y - 58, 36, Math.PI * 1.25, Math.PI * 1.75);
      }
      ctx.stroke();
    }
  }

  // 입 — 대두 리튠에 맞춰 작게(귀여움), 살짝 위로
  const MY = 364;
  ctx.strokeStyle = '#b0605a';
  ctx.lineCap = 'round';
  if (!ouch && p.species === 'robot') {
    drawRobotMouth(ctx, p); // 스피커 그릴
  } else if (ouch) {
    // 크게 벌린 울상
    ctx.fillStyle = '#a14a44';
    ctx.beginPath();
    ctx.ellipse(256, MY, 34, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e58a80';
    ctx.beginPath();
    ctx.ellipse(256, MY + 12, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.mouth === 'cat') {
    ctx.lineWidth = 8;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(256 + s * 12, MY - 6, 13, s === -1 ? 0.15 * Math.PI : 0.35 * Math.PI, s === -1 ? 0.65 * Math.PI : 0.85 * Math.PI);
      ctx.stroke();
    }
  } else if (p.mouth === 'open') {
    ctx.fillStyle = '#a14a44';
    ctx.beginPath();
    ctx.ellipse(256, MY, 19, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e58a80';
    ctx.beginPath();
    ctx.ellipse(256, MY + 7, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, MY - 10, 20, 0.22 * Math.PI, 0.78 * Math.PI);
    ctx.stroke();
  }

  // 동물 코·수염 (사람 아님). 코는 눈과 입 사이, 3D 귀·꼬리와 함께 종족을 읽게 한다.
  if (isAnimal && !ouch) drawAnimalFace(ctx, p.species, MY);

  // 사람 수염 (얼굴 캔버스). 피격 시 입이 크게 벌어지므로 그리지 않는다.
  if (!ouch) drawBeard(ctx, p);

  // 볼터치 — 더 크고 진하게(엔젤이식), 눈 아래 밀착. 로봇은 홍조 어색해서 제외.
  // 감독 결정 B(피부 채도↑ + 생기 강화) — 볼홍조도 한 단계 진하게(더 붉고 더 진하게).
  if (p.blush && !ouch && p.species !== 'robot') {
    ctx.fillStyle = 'rgba(255,105,110,0.6)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(256 + s * 150, 338, 46, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 상처 1+: 오른쪽 볼 반창고
  if (wound >= 1) {
    ctx.save();
    ctx.translate(256 + 152, 326);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#e8c9a0';
    ctx.fillRect(-40, -13, 80, 26);
    ctx.fillStyle = '#d9b88d';
    ctx.fillRect(-15, -13, 30, 26);
    ctx.restore();
  }
  // 상처 2+: 왼쪽 볼 멍
  if (wound >= 2) {
    ctx.fillStyle = 'rgba(110,90,200,0.45)';
    ctx.beginPath();
    ctx.ellipse(256 - 152, 320, 32, 21, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // 상처 3: 그렁그렁 눈물
  if (wound >= 3 && !ouch) {
    ctx.fillStyle = 'rgba(130,185,255,0.85)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(256 + s * 88, EYE_Y + 80, 10, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawFaceCanvas(p) {
  const canvas = document.createElement('canvas');
  // [사이클 B 텍스처 감량] 512→256: GPU 업로드 1.33MB→0.33MB/개체(밉맵 포함). 디자이너 실렌더
  // A/B — 일반 시야(4·8m)·대화거리(1.5m)까지 동일, 0.6m 극단 근접만 미세 소프트닝(실플레이 미발생).
  // 얼굴이 벡터 드로잉(텍스트·잔선 없음)이라 다운스케일에 관대. 드로잉은 drawFaceInto가 512 좌표계를
  // 변환행렬로 축소해 그대로 쓴다 — 좌표 수정 0.
  canvas.width = 256;
  canvas.height = 256;
  drawFaceInto(canvas, p, null);
  return canvas;
}
