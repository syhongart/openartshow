// portal.js — 정문 포털(고정 미술관 → 오픈월드 입구). 가산형 독립 모듈.
// -----------------------------------------------------------------------------
// 라이브 미술관 런타임(main/player/artworks/config)을 일절 수정하지 않고, main.js가 노출한
// window.__museum({scene,camera,renderer})만 소비해 남쪽 정문(유리 커튼월 z=+8) 앞 중앙에
// 시안 발광 프레임 게이트를 더한다. 프레임 안엔 절차 생성 야간 도시 프리뷰(기본 하늘=야간맑음과 정합),
// 프레임 앞 바닥엔 정방향 한글 "오픈월드" 발광 라벨. 근접 안내 + 클릭/통과로 라이브 오픈월드(`OPENWORLD_PAGE`) 이동.
// 전부 자작 지오메트리·절차 텍스처(외부 에셋 0). CSP 무변경(로컬 모듈·같은 오리진 링크).
import * as THREE from 'three';
import { mergeGeometries } from '../utils/BufferGeometryUtils.js';

// 배치(config.js BUILDING 실측 기반): 남쪽 벽 z=8, 입구 개구부 x[-1.5,1.5] 폭3m, 바닥 y=0, clearH 3.6.
const PX = 0, PZ = 7.5, BASE_Y = 0;         // 정문 안쪽 중앙(플레이어 이동 상한 z=7.4 부근)
const W = 3.3, H = 3.5, T = 0.18, D = 0.2;  // 프레임 외곽 폭/높이/테두리/깊이
const CYAN = 0x72e6e1;
const NEAR = 3.6, PASS = 1.15;              // 근접 안내 거리 / 자동 통과 이동 거리
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;

// ── 야간 도시 프리뷰 텍스처(절차·자기완결) — 별·달·건물 실루엣·창문 불빛 ──
function cityTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  let s = 0x51c7; const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#070a16'); g.addColorStop(0.55, '#111a34'); g.addColorStop(1, '#1b2748');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 140; i++) { const px = rnd() * 512, py = rnd() * 310, big = rnd() < 0.08; x.fillStyle = `rgba(235,240,255,${(0.28 + rnd() * 0.6).toFixed(2)})`; x.fillRect(px, py, big ? 2 : 1, big ? 2 : 1); }
  const mg = x.createRadialGradient(398, 88, 0, 398, 88, 36); mg.addColorStop(0, 'rgba(236,239,232,0.9)'); mg.addColorStop(0.5, 'rgba(226,232,224,0.42)'); mg.addColorStop(1, 'rgba(226,232,224,0)');
  x.fillStyle = mg; x.beginPath(); x.arc(398, 88, 36, 0, 7); x.fill();
  x.fillStyle = 'rgba(240,243,236,0.95)'; x.beginPath(); x.arc(398, 88, 15, 0, 7); x.fill();
  let bx = 0;
  while (bx < 512) {
    const bw = 26 + rnd() * 48, bh = 130 + rnd() * 250, by = 512 - bh;
    x.fillStyle = `rgb(${10 + (rnd() * 8 | 0)},${16 + (rnd() * 10 | 0)},${34 + (rnd() * 14 | 0)})`;
    x.fillRect(bx, by, bw, bh);
    for (let wy = by + 12; wy < 506; wy += 15) for (let wx = bx + 6; wx < bx + bw - 6; wx += 12) {
      if (rnd() < 0.52) continue;
      x.fillStyle = rnd() < 0.72 ? 'rgba(120,220,225,0.85)' : 'rgba(255,207,138,0.85)';
      x.fillRect(wx, wy, 4, 6);
    }
    bx += bw + 2 + rnd() * 8;
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── 바닥 라벨 텍스처(정방향 "오픈월드" 발광 시안) — 목업 거울반전을 정방향으로 교정 ──
function labelTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const x = c.getContext('2d'); x.clearRect(0, 0, 512, 160);
  x.font = '700 92px "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(114,230,225,0.95)'; x.shadowBlur = 30;
  x.fillStyle = 'rgba(175,244,240,0.96)'; x.fillText('오픈월드', 256, 86);
  x.shadowBlur = 0; x.fillStyle = 'rgba(224,252,250,0.92)'; x.fillText('오픈월드', 256, 86);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── 포털 조립 — 발광 프레임(4 bar 병합=1콜) + 프리뷰 평면(1콜) + 바닥 라벨(1콜) = +3콜 ──
function buildPortal() {
  const grp = new THREE.Group();
  const bars = [
    new THREE.BoxGeometry(W, T, D).translate(0, T / 2, 0),                 // 하단
    new THREE.BoxGeometry(W, T, D).translate(0, H - T / 2, 0),             // 상단
    new THREE.BoxGeometry(T, H, D).translate(-(W - T) / 2, H / 2, 0),      // 좌
    new THREE.BoxGeometry(T, H, D).translate((W - T) / 2, H / 2, 0),       // 우
  ];
  const frameGeo = mergeGeometries(bars); bars.forEach((b) => b.dispose());
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0b3d3a, emissive: CYAN, emissiveIntensity: 1.5, roughness: 0.4, metalness: 0.1 });
  grp.add(new THREE.Mesh(frameGeo, frameMat));

  // 프리뷰 — 프레임 뒤쪽(바깥 z+), 법선을 플레이어(-z)로 향하게
  const preview = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 2 * T, H - 2 * T),
    new THREE.MeshBasicMaterial({ map: cityTex(), toneMapped: false })
  );
  preview.position.set(0, H / 2, 0.11); preview.rotation.y = Math.PI;
  grp.add(preview);

  // 바닥 라벨 — 프레임 앞(플레이어쪽 -z) 바닥. 정방향: rotation.x=+π/2로 텍스트 상단을 먼쪽(+z)에,
  // scale.x=-1로 좌우를 플레이어 시점 정방향에 맞춘다(양면 렌더).
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.75),
    new THREE.MeshBasicMaterial({ map: labelTex(), transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide })
  );
  label.rotation.x = Math.PI / 2; label.scale.x = -1; label.position.set(0, 0.02, -1.0);
  grp.add(label);

  grp.position.set(PX, BASE_Y, PZ);
  grp.userData = { frameMat, label };
  return grp;
}

// ── 런타임 — window.__museum 폴링 → 포털 생성 + 발광 펄스 + 근접 안내 + 이동 ──
let museum = null, portal = null, hintEl = null, near = false, navigated = false;
let downX = 0, downY = 0;

function ensureHint() {
  if (hintEl) return;
  hintEl = document.createElement('div');
  hintEl.id = 'portal-hint';
  hintEl.textContent = isTouch ? '탭하여 오픈월드로 이동 →' : '클릭하거나 다가가면 오픈월드로 이동 →';
  hintEl.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:40;'
    + 'padding:9px 16px;border-radius:999px;background:rgba(11,30,29,0.82);color:#c9fbf8;'
    + 'font:600 13px/1 "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;letter-spacing:-.01em;'
    + 'border:1px solid rgba(114,230,225,0.5);box-shadow:0 6px 20px -6px rgba(0,0,0,0.6);'
    + '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;opacity:0;'
    + 'transition:opacity .25s;white-space:nowrap';
  document.body.appendChild(hintEl);
}

// ── 목적지 — 라이브 오픈월드 **한 곳**을 가리킨다 (2026-09-04) ──────────────
// 2026-08-23 PR #260 이 랜딩의 «오픈월드 입장» 을 `world2.html` 로 바꾸며 `world.html`
// (world1)을 flagged 로 강등했는데, **이 정문 포털은 그대로 world1 을 가리키고 있었다.**
// 그래서 방문자가 랜딩에서 들어가면 world2, 미술관 안에서 정문으로 나가면 world1 로
// 갈라졌고, 그 world1 코드는 검증 등급 판정기가 3등급(검수 이연)으로 내려 앞으로의
// 수정이 검수를 안 타는 상태였다 — 라이브 도달 코드가 이연 등급인 구멍.
// 팀장 조건 C5(2026-09-04): 승격과 무관하게 지금 꿴다. 되돌리기는 이 문자열 한 줄.
// 왜 검사가 못 잡았나: GS-3 은 CLAUDE.md 산문 ↔ flagged 배열만 대조하고 **실제 href /
// location 대입은 안 본다.** 그 검사는 백로그 등재(같은 회차) — 여기 다시 적지 않는다.
const OPENWORLD_PAGE = 'world2.html';
function go() { if (navigated) return; navigated = true; if (hintEl) hintEl.style.opacity = '0'; location.href = OPENWORLD_PAGE; }

function tick() {
  requestAnimationFrame(tick);
  if (!museum) {
    museum = window.__museum || null;
    if (!museum) return;
    portal = buildPortal(); museum.scene.add(portal); ensureHint();
  }
  const t = performance.now() / 1000;
  const pulse = 1.3 + Math.sin(t * 2.2) * 0.35;
  portal.userData.frameMat.emissiveIntensity = pulse;
  portal.userData.label.material.opacity = 0.78 + Math.sin(t * 2.2) * 0.2;
  const cam = museum.camera;
  const dist = Math.hypot(cam.position.x - PX, cam.position.z - PZ);
  const wasNear = near; near = dist < NEAR;
  if (near !== wasNear && hintEl) hintEl.style.opacity = near ? '1' : '0';
  if (dist < PASS) go(); // 통과 자동 이동
}
requestAnimationFrame(tick);

// 클릭/탭 — 근접 상태에서 캔버스를 짧게 탭(드래그 회전 배제)하면 이동. UI 요소 클릭은 제외.
addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; }, true);
addEventListener('pointerup', (e) => {
  if (!near || navigated || !museum) return;
  if (e.target !== museum.renderer.domElement) return;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
  go();
}, true);
