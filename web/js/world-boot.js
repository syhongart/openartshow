// world-boot.js — 오픈월드(behind-flag) 부트스트랩. world.html 인라인 <script type="module">에서
// 외부 모듈로 추출(보안 선결: CSP 'unsafe-inline' 제거 → script-src 'self'만으로 동작, 해시 불필요·
// 유지보수 우위 — security-officer 29259bf 지적①). module script는 기본 defer라 DOM 로드 후 실행,
// top-level await 정상. DOM 참조·fetch는 문서(world.html) 기준 상대경로 유지, import는 이 파일(web/js/) 기준.
import { genParcel, riverColAt, genStreet, genWalker, genPier, genTetrapods, genLighthouse } from './world-gen.js';
import { createWorld } from './world.js';
import { randomChibiChar } from './chibi.js';
// [神 모드] 하늘 화이트리스트·자동 시간대 — URL 파라미터 살균(SKY_TIMES/SKY_WEATHERS 밖 값 무시)에 사용.
import { SKY_TIMES, SKY_WEATHERS, autoTimeOfDay } from './sky.js';

// ── 월드 매니페스트 로드 → 절차생성 100방 구성 (behind-flag 1단계) ──
// 대지는 world-gen이 시드로 절차생성(결정론=모든 방문자 동일 세계) — 건물/강/오프셋. 입구는 남쪽 문.
// NPC는 매니페스트 home 파셀에 소환. 이름표는 핸들/역할(모델 브랜드명 노출 금지 §6).
// fetch 실패(404·파싱오류) 시 먹통+무피드백 방지 — 오버레이에 가시적 안내(release-reviewer 지적).
let M;
try {
  // Document 기준 절대경로(base 설정과 무관하게 정확한 해석)
  // import.meta.url은 module 번들링 후 절대경로가 되므로, document.location으로부터 계산
  const basePath = import.meta.env.BASE_URL || '/';
  const manifestUrl = basePath.endsWith('/')
    ? basePath.slice(0, -1) + '/app/world/manifest.json'
    : basePath + '/app/world/manifest.json';
  console.log('[world-boot] manifest URL:', manifestUrl);
  const res = await fetch(manifestUrl);
  console.log('[world-boot] manifest response:', res.status, res.ok);
  if (!res.ok) throw new Error('manifest HTTP ' + res.status);
  M = await res.json();
  console.log('[world-boot] manifest loaded, npcs:', M.npcs?.length || 0);
} catch (e) {
  console.error('[world-boot] manifest fetch failed:', e.message);
  const ov = document.getElementById('enter');
  if (ov) { ov.classList.remove('hide'); ov.innerHTML = '<div class="big">월드를 불러오지 못했어요</div><div class="sub">잠시 후 새로고침해 주세요</div>'; }
  throw e;
}
const grid = M.grid;

// remarks 템플릿 문자열 → 함수 (npc.js 계약: (t)=>string). greetings는 순수 문자열.
const toRemarks = (arr) => (arr || []).map((tpl) => (t) => tpl.replace('{t}', t));

// [복셀스] 강 파셀 조회 + 육지 보정 — NPC home·spawn이 강이면 동쪽으로 민다(강은 행당 1칸).
const isRiver = (px, pz) => riverColAt(pz, M.seed, grid) === px;
const fixLand = ([px, pz]) => {
  let x = px;
  while (x < grid.w - 1 && isRiver(x, pz)) x++;
  if (isRiver(x, pz)) { x = px; while (x > 0 && isRiver(x, pz)) x--; }
  return [x, pz];
};

// [실험 격리 — ablation] URL ?off=ayamo,npc,… 로 요소를 하나씩 꺼 스파이크 원인을 실증 격리(감독 지시).
// 기본(플래그 없음) 빈 Set → 기존 동작 완전 불변(무회귀).
const OFF = new Set((new URLSearchParams(location.search).get('off') || '').split(',').map((s) => s.trim()).filter(Boolean));
// off=npc → 모든 배치 NPC 제외 / off=ayamo → 스폰 안내 NPC(npc-ayamo)만 제외 / walker(거리 배회)는 아래 genWalker에서 별도 억제.
const npcSrc = OFF.has('npc') ? [] : (OFF.has('ayamo') ? M.npcs.filter((n) => n.id !== 'npc-ayamo') : M.npcs);
// NPC를 home 파셀 키로 그룹핑(같은 건물 여러 명 = 한 crowd)
const npcByHome = new Map();
for (const n of npcSrc) {
  const [hx, hz] = fixLand(n.home);
  const k = hx + ',' + hz;
  if (!npcByHome.has(k)) npcByHome.set(k, []);
  npcByHome.get(k).push({ id: n.id, nickname: n.nickname, char: n.char, color: n.color, greetings: n.greetings, remarks: toRemarks(n.remarks) });
}

// 그리드 순회 → 파셀 100개(대지=절차생성: 건물/강/오프셋). spawn 파셀(육지 보정)을 배열 선두로.
const parcels = [];
const [sx, sz] = fixLand(M.spawn || [0, 0]);
// 첫 화면(스폰 3×3 중 풀디테일 = 스폰 파셀 + 직교 인접)에 행인이 반드시 보이도록 walker 강제(확률 무관).
// genWalker 40% 스폰 확률 × 소수 파셀이면 스폰 순간 walker 0명이 나올 수 있어(고객 첫인상 텅 빈 거리) 보정.
const forceWalker = (px, pz) => (Math.abs(px - sx) + Math.abs(pz - sz)) <= 1;
for (let pz = 0; pz < grid.h; pz++) for (let px = 0; px < grid.w; px++) {
  const P = genParcel(px, pz, M.seed, grid, M.cell);
  const roster = P.space ? npcByHome.get(px + ',' + pz) : null;
  const street = genStreet(px, pz, M.seed, grid, M.cell, P); // 거리 가구 배치(결정론) — def.street
  const walker = OFF.has('npc') ? null : genWalker(px, pz, M.seed, grid, M.cell, P, forceWalker(px, pz)); // 거리 배회 NPC 후보(결정론) — def.walker. [ablation] off=npc면 억제
  const pier = genPier(px, pz, M.seed, grid, M.cell, P);     // [해안] 경계 파셀 부두(결정론) — def.pier
  const tetra = genTetrapods(px, pz, M.seed, grid, M.cell, P); // [해안] 경계 파셀 테트라포드 클러스터 — def.tetra
  const lighthouse = genLighthouse(px, pz, M.seed, grid, M.cell, P, pier); // [해안 2단계] 경계 파셀 등대(부두와 배타) — def.lighthouse
  const parcel = Object.assign({ px, pz }, P, { street }, walker ? { walker } : {}, pier ? { pier } : {}, tetra ? { tetra } : {}, lighthouse ? { lighthouse } : {}, roster ? { npc: { roster, count: roster.length } } : {});
  if (px === sx && pz === sz) parcels.unshift(parcel); else parcels.push(parcel);
}

// ── 2단계 실시간: 내 아바타(랜덤 방문자) — 같은 월드 접속자끼리 상호 가시성 ──
const nick = '방문자' + Math.floor(Math.random() * 900 + 100);
const PALETTE = ['#7ec8a0', '#8e7dbe', '#6a8caf', '#e0596e', '#ffd166', '#72e6e1', '#95d5b2'];
const myColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];

// ── [오픈월드 LOD 스윕] ?lod= 프리셋 — 원경 shell 단색 임포스터 + fog 밴드 정렬(감독 실기기 a/b/c 비교용) ──
// 화이트리스트 밖 값은 무시(?sky= 살균 전례와 동형 — 무검증 반영 금지). 파라미터 없으면 a=현행 완전 동일 → 라이브 무해.
//   a: 현행 대조군(shellFlat off, fog 0.9/1.9)  b: 중간(0.7/1.6, 단색 shell)  c: 강하게 당김(0.55/1.4, 단색 shell)
const LOD_PRESETS = {
  a: { fogNearK: 0.9,  fogFarK: 1.9, shellFlat: false },
  b: { fogNearK: 0.7,  fogFarK: 1.6, shellFlat: true },
  c: { fogNearK: 0.55, fogFarK: 1.4, shellFlat: true },
  d: { fogNearK: 0.4,  fogFarK: 1.2, shellFlat: true }, // c보다 더 강하게(near9.6/far28.8) — 원경 임포스터 박스를 안개로 더 확실히 감춤(감독 요청)
};
const lodPreset = LOD_PRESETS[new URLSearchParams(location.search).get('lod')] || LOD_PRESETS.a;
// [바다 조망 fog 자동전환] ?lod= 스윕이 있으면 그 정적 프리셋 그대로(자동 OFF). 없으면(기본 라이브)
// 평소 D + 바다 원경 응시 시 C로 런타임 자동전환(world.js가 opts.fogSea+grid 유무로만 활성).
const hasLod = new URLSearchParams(location.search).has('lod');
const fogOpts = hasLod
  ? lodPreset
  : { ...LOD_PRESETS.d, fogSea: { nearK: LOD_PRESETS.c.fogNearK, farK: LOD_PRESETS.c.fogFarK }, grid: { w: grid.w, h: grid.h } };

const canvas = document.getElementById('c');
console.log('[world-boot] parcels count:', parcels.length, 'canvas:', canvas ? 'OK' : 'MISSING');
let V;
try {
  V = await createWorld({ canvas, parcels, opts: { // WebGPURenderer.init()이 async라 createWorld가 async(module top-level await)
    cellX: M.cell.x, cellZ: M.cell.z, preserveDrawingBuffer: true,
    mp: { nickname: nick, color: myColor, char: randomChibiChar() }, // window.Peer 없으면 world.js가 조용히 1인 모드
    ...fogOpts, // 기본: D 평소+C 바다 자동전환(fogSea·grid 포함). ?lod= 스윕: 정적 프리셋(fogSea 없음→자동 OFF, 무회귀)
  } });
  window.__world = V;
  console.log('[world-boot] createWorld succeeded, world object created');
} catch (err) {
  console.error('[world-boot] createWorld failed:', err.message);
  throw err;
}
if (location.search.includes('debug=perf')) import('./debug-perf.js').then((m) => m.mountPerfHud(V.getRenderer(), 'world')); // ?debug=perf 게이트 뒤 동적 import(behind-flag) — 진입 즉시 프레임 계측(world.js 무접촉)
if (location.search.includes('debug=hud')) import('./debug-hud.js').then((m) => m.mountDebugHud(V)); // ?debug=hud 게이트 뒤 동적 import(behind-flag) — 월드 상태(위치·LOD·fog·FPS) HUD + 복사(world.js 무접촉). 개발자 북마크용

let playerCount = 1;
V.on('players', (n) => { playerCount = n; });

function fit() { V.resize(window.innerWidth, window.innerHeight); }
window.addEventListener('resize', fit); fit();

// ── 미니맵(우상단) — 현재 셀 하이라이트 + NPC home 점 + 방문 셀 음영. 순수 2D 캔버스(CSP 무영향). ──
const mmap = document.getElementById('minimap'), mctx = mmap.getContext('2d');
// [해안] 그리드 주변 바다 여백 1칸 확보(+2) → 경계 셀이 바다에 접한 해안선으로 읽힘.
const CPX = Math.floor(mmap.width / (Math.max(grid.w, grid.h) + 2));
const MOFF = CPX; // 바다 여백 오프셋(그리드 좌상단)
const homes = new Set([...npcByHome.keys()]);
const riverSet = new Set(); for (let z = 0; z < grid.h; z++) riverSet.add(riverColAt(z, M.seed, grid) + ',' + z);
// [해안] 부두 셀 집합 — 미니맵 마커. genPier 결과(def.pier)를 파셀에서 수집.
const pierSet = new Set(); for (const pc of parcels) if (pc.pier) pierSet.add(pc.px + ',' + pc.pz);
const lighthouseSet = new Set(); for (const pc of parcels) if (pc.lighthouse) lighthouseSet.add(pc.px + ',' + pc.pz); // [해안 2단계] 등대 셀
const visited = new Set();
function drawMinimap() {
  const p = V.getCurrentParcel();
  visited.add(p.px + ',' + p.pz);
  // 배경 전체 = 외해(그리드 밖은 바다). 그 위에 육지·강·경계 모래를 그린다.
  mctx.clearRect(0, 0, mmap.width, mmap.height);
  mctx.fillStyle = 'rgba(56,96,140,.5)'; mctx.fillRect(0, 0, mmap.width, mmap.height);
  for (let z = 0; z < grid.h; z++) for (let x = 0; x < grid.w; x++) {
    const k = x + ',' + z, X = MOFF + x * CPX, Y = MOFF + z * CPX;
    const isEdge = (x === 0 || x === grid.w - 1 || z === 0 || z === grid.h - 1);
    let fill;
    if (riverSet.has(k)) fill = 'rgba(90,150,210,.6)';
    else if (isEdge) fill = visited.has(k) ? 'rgba(216,199,154,.55)' : 'rgba(216,199,154,.3)'; // 경계 해안 모래
    else fill = visited.has(k) ? 'rgba(114,230,225,.16)' : 'rgba(255,255,255,.05)';
    mctx.fillStyle = fill;
    mctx.fillRect(X + 1, Y + 1, CPX - 2, CPX - 2);
    if (homes.has(k)) { mctx.fillStyle = 'rgba(139,114,255,.9)'; mctx.beginPath(); mctx.arc(X + CPX / 2, Y + CPX / 2, 2.2, 0, 7); mctx.fill(); }
    if (pierSet.has(k)) { mctx.fillStyle = 'rgba(154,125,85,.95)'; mctx.fillRect(X + CPX / 2 - 1.5, Y + CPX / 2 - 1.5, 3, 3); } // 부두 마커
    if (lighthouseSet.has(k)) { mctx.fillStyle = 'rgba(255,224,138,.98)'; mctx.beginPath(); mctx.arc(X + CPX / 2, Y + CPX / 2, 1.8, 0, 7); mctx.fill(); } // [해안 2단계] 등대 마커(발광색)
  }
  mctx.strokeStyle = '#72E6E1'; mctx.lineWidth = 2;
  mctx.strokeRect(MOFF + p.px * CPX + 1, MOFF + p.pz * CPX + 1, CPX - 2, CPX - 2);
}

// 현재 파셀 표시 + 미니맵 갱신
const pcell = document.getElementById('pcell');
function refreshCell() { const p = V.getCurrentParcel(); pcell.textContent = `파셀 (${p.px},${p.pz}) · ${grid.w}×${grid.h} 월드 · 👤 ${playerCount}`; drawMinimap(); }
setInterval(refreshCell, 300); refreshCell();

// ── 입장 게이트(데스크톱·모바일 공용) — IP 노출 고지 후 사용자 선택으로만 연결 여부 결정 ──
// "함께 둘러보기"에서만 P2P 연결(IP 노출), "혼자 둘러보기"는 외부 연결 0. connect 트리거는 버튼 핸들러 전용
// (lock 이벤트에 걸면 "혼자" 선택자도 연결돼 재발 — security-officer 설계). 모바일은 pointerlock이 없어 버튼 탭이 유일 경로.
const enter = document.getElementById('enter');
const isTouch = (typeof window !== 'undefined') && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0);
V.on('lock', ({ locked }) => { enter.classList.toggle('hide', locked); }); // 오버레이 숨김/표시 전용(데스크톱 pointerlock)
function doEnter(multi) {
  document.body.classList.add('entered');          // 모바일 조이스틱 활성 게이트
  if (multi) V.connectMultiplayer();               // P2P 최초·유일 연결 지점(world.js 내부 1회 가드)
  enter.classList.add('hide');
  if (!isTouch && canvas.requestPointerLock) canvas.requestPointerLock(); // 데스크톱만 포인터락
}
enter.querySelectorAll('button[data-enter]').forEach((b) => {
  b.addEventListener('click', (e) => { e.stopPropagation(); doEnter(b.dataset.enter === 'multi'); });
});

// NPC 말풍선 토스트 — 최근 한 건만 부드럽게 표시(3.6초 후 소멸).
const chat = document.getElementById('chat');
V.on('chat', ({ name, text }) => {
  const b = document.createElement('div'); b.className = 'bub';
  b.innerHTML = `<span class="nm"></span><span class="tx"></span>`;
  b.querySelector('.nm').textContent = name; b.querySelector('.tx').textContent = text;
  chat.appendChild(b);
  requestAnimationFrame(() => b.classList.add('on'));
  setTimeout(() => { b.classList.remove('on'); setTimeout(() => b.remove(), 300); }, 3600);
  while (chat.children.length > 3) chat.removeChild(chat.firstChild);
});

// ── 모바일: 터치 감지 → 좌 조이스틱(갤러리 룩·플로팅 이식) + 우 드래그 시선 ──
// 갤러리(web/js/player.js 129-176행 스타일, 214-294행 이벤트)를 오픈월드 전용 DOM 인스턴스로 이식.
// player.js는 수정하지 않는다 — 이 블록은 world-boot.js 전용 클로저 변수(joyBase/joyKnob 등)만 쓰고,
// 클래스명(lu-joy-*)은 player.js와 같은 이름을 재사용해도 두 페이지가 동시에 로드되지 않아 충돌 없음.
// 룩: 상시 표시가 아니라 터치한 자리에 base+knob이 나타났다가(lu-live) 손을 떼면 사라진다(스타일 요소, pointer-events:none).
// 입력 계약(중요): world.js가 기대하는 V.setTouchMove(fwd, right) 시그니처·부호(-uy, ux)는 그대로 유지.
// 데드존 0.14·조이스틱 반경 60px은 갤러리와 동일 값으로 통일(기존 world 쪽 JR=40 반경/데드존 없음에서 이식).
// "달리기"(mag>0.85 임계 링+골드 노브+진동)는 갤러리와 동일한 시각/햅틱 피드백으로 이식하되, world.js의 walk()는
// 항상 이동벡터를 단위벡터로 정규화하고(world.js:1264-1270) tmov 크기(analog magnitude)를 속도에 반영하는
// 경로가 없다 — 즉 오픈월드엔 갤러리식 "아날로그 달리기"(RUN_SPEED 램프) 입력 경로 자체가 없다. world.js를
// 수정하지 않는 게 이번 작업의 경계이므로, 달리기 임계 링은 시각 피드백 전용으로 두고 실제 이동 속도는
// 불변으로 판단(생략보다 갤러리와 동일한 손맛을 주는 편이 UX상 낫고 입력 계약에는 전혀 영향 없음).
if (isTouch) {
  document.body.classList.add('is-touch');

  if (!document.getElementById('lu-joy-style')) {
    const st = document.createElement('style');
    st.id = 'lu-joy-style';
    st.textContent = `
.lu-joy-base { position: fixed; width: 112px; height: 112px; margin: -56px 0 0 -56px;
  border-radius: 50%; border: 1.5px solid rgba(253,251,245,0.38);
  background: radial-gradient(circle, rgba(23,20,15,0.10) 55%, rgba(23,20,15,0.34) 100%);
  box-shadow: 0 2px 12px rgba(10,8,4,0.30), inset 0 0 0 1px rgba(23,20,15,0.20);
  pointer-events: none; z-index: 40; opacity: 0; transform: scale(0.78);
  transition: opacity 0.12s ease, transform 0.16s cubic-bezier(0.34,1.56,0.64,1); }
.lu-joy-base.lu-live { opacity: 1; transform: scale(1); }
.lu-joy-base::before { content: ''; position: absolute; inset: -1.5px; border-radius: 50%;
  background:
    linear-gradient(rgba(253,251,245,0.5), rgba(253,251,245,0.5)) 50% 0 / 2px 8px no-repeat,
    linear-gradient(rgba(253,251,245,0.5), rgba(253,251,245,0.5)) 50% 100% / 2px 8px no-repeat,
    linear-gradient(rgba(253,251,245,0.5), rgba(253,251,245,0.5)) 0 50% / 8px 2px no-repeat,
    linear-gradient(rgba(253,251,245,0.5), rgba(253,251,245,0.5)) 100% 50% / 8px 2px no-repeat; }
.lu-joy-base::after { content: ''; position: absolute; inset: 5px; border-radius: 50%;
  border: 1px dashed rgba(253,251,245,0.22);
  transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.lu-joy-base.lu-run::after { border-color: rgba(95,158,125,0.9); border-style: solid;
  box-shadow: 0 0 10px rgba(95,158,125,0.5), inset 0 0 8px rgba(95,158,125,0.25); }
.lu-joy-knob { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px;
  border-radius: 50%; background: radial-gradient(circle at 32% 28%, #fffdf8, #e8e2d2);
  border: 1px solid rgba(23,20,15,0.28);
  box-shadow: 0 3px 8px rgba(10,8,4,0.40), inset 0 -2px 4px rgba(23,20,15,0.14);
  pointer-events: none; z-index: 41; opacity: 0; transition: opacity 0.12s ease; }
.lu-joy-knob.lu-live { opacity: 1; }
.lu-joy-knob.lu-run { background: radial-gradient(circle at 32% 28%, #b8e4c9, #5f9e7d);
  border-color: rgba(32,74,52,0.55);
  box-shadow: 0 0 0 1px rgba(95,158,125,0.9), 0 0 14px rgba(95,158,125,0.55),
    inset 0 -2px 4px rgba(32,74,52,0.30); }`;
    document.head.appendChild(st);
  }
  const joyBase = document.createElement('div'); joyBase.className = 'lu-joy-base';
  const joyKnob = document.createElement('div'); joyKnob.className = 'lu-joy-knob';
  document.body.appendChild(joyBase);
  document.body.appendChild(joyKnob);

  const JOYSTICK_RADIUS = 60; // 갤러리(player.js JOYSTICK_RADIUS)와 동일 반경(px)
  let moveTouch = null; // { id, startX, startY }
  let lookTouch = null; // { id, lastX, lastY }
  let wasRunning = false;

  function onTouchStart(e) {
    for (const t of e.changedTouches) {
      const half = window.innerWidth * 0.5;
      if (t.clientX < half && moveTouch === null) {
        moveTouch = { id: t.identifier, startX: t.clientX, startY: t.clientY };
        joyBase.style.left = t.clientX + 'px'; joyBase.style.top = t.clientY + 'px';
        joyKnob.style.left = t.clientX + 'px'; joyKnob.style.top = t.clientY + 'px';
        joyBase.classList.add('lu-live'); joyKnob.classList.add('lu-live');
      } else if (t.clientX >= half && lookTouch === null) {
        lookTouch = { id: t.identifier, lastX: t.clientX, lastY: t.clientY };
      }
    }
    if (e.cancelable) e.preventDefault();
  }

  function onTouchMove(e) {
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) {
        const dx = t.clientX - moveTouch.startX, dy = t.clientY - moveTouch.startY;
        const len = Math.hypot(dx, dy);
        const scale = len > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / len : 1;
        let ux = (dx * scale) / JOYSTICK_RADIUS, uy = (dy * scale) / JOYSTICK_RADIUS; // -1~1
        joyKnob.style.left = moveTouch.startX + dx * scale + 'px';
        joyKnob.style.top = moveTouch.startY + dy * scale + 'px';
        const mag = Math.hypot(ux, uy);
        const running = mag > 0.85; // 갤러리 동일 임계 — 시각/햅틱 전용(위 주석: world.js 달리기 입력 경로 없음)
        joyBase.classList.toggle('lu-run', running);
        joyKnob.classList.toggle('lu-run', running);
        if (running && !wasRunning && navigator.vibrate) navigator.vibrate(10);
        wasRunning = running;
        if (mag < 0.14) { ux = 0; uy = 0; } // 데드존(갤러리 동일 0.14) — 엄지 미세 떨림 무시
        V.setTouchMove(-uy, ux); // 입력 계약 불변: world.js setTouchMove(fwd,right) 시그니처·부호 그대로
      } else if (lookTouch && t.identifier === lookTouch.id) {
        V.lookDelta((t.clientX - lookTouch.lastX) * 0.004, (t.clientY - lookTouch.lastY) * 0.004);
        lookTouch.lastX = t.clientX; lookTouch.lastY = t.clientY;
      }
    }
    if (e.cancelable) e.preventDefault();
  }

  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) {
        moveTouch = null; wasRunning = false;
        joyBase.classList.remove('lu-live', 'lu-run');
        joyKnob.classList.remove('lu-live', 'lu-run');
        V.setTouchMove(0, 0);
      } else if (lookTouch && t.identifier === lookTouch.id) {
        lookTouch = null;
      }
    }
  }

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchcancel', onTouchEnd);
}

// ── 神 모드 연출 패널(전체 공개 — 감독 결재 2026-07-19) — 하늘 시간대/날씨/이벤트/광과민성 제어 + URL 초기 하늘 ──
// 방문자 누구나 조작 가능. 변경은 자기 화면(로컬 렌더)에만 적용되어 타 방문자 무영향.
// V.sky = sky.js skySystem(set/get). 조합 보정(무지개=주간·일몰 맑음, 오로라=야간 맑음 등)은 sky.js가
// 내부 강제하므로 UI는 요청만 보내고 반영 결과는 get()으로 되읽어 활성 표시(요청≠반영 드리프트 방지).
const SKY = V.sky;
if (SKY) {
  // URL 초기 하늘: ?sky=sunset&weather=rain&fx=aurora,rainbow — 화이트리스트 밖 값은 무시(보안: 무검증 반영 금지).
  // 서비스 기본 하늘 = 야간 맑음(은하수·별·달 — 감독 확정 2026-07-19). URL 파라미터가 있으면 그것이 우선.
  const q = new URLSearchParams(location.search);
  const qTime = q.get('sky'), qWeather = q.get('weather');
  const qFx = (q.get('fx') || '').split(',').map((s) => s.trim());
  const init = { time: 'night', weather: 'clear' };
  if (SKY_TIMES.includes(qTime)) init.time = qTime;
  if (SKY_WEATHERS.includes(qWeather)) init.weather = qWeather;
  const initFx = {};
  if (qFx.includes('rainbow')) initFx.rainbow = true;
  if (qFx.includes('aurora')) initFx.aurora = true;
  if (Object.keys(initFx).length) init.fx = initFx;
  SKY.set(init, { fade: 0 }); // 첫 진입은 스냅(크로스페이드 없이 즉시)

  const panel = document.getElementById('godPanel');
  const toggle = document.getElementById('godToggle');
  const body = document.getElementById('godBody');

  // 접이식 — 헤더 클릭으로 펼침/접힘(기본 접힘, 모바일에서도 작게 접근)
  toggle.addEventListener('click', () => {
    const open = panel.getAttribute('data-open') === '1';
    panel.setAttribute('data-open', open ? '0' : '1');
    toggle.setAttribute('aria-expanded', String(!open));
    body.hidden = open;
  });

  // 활성 상태 시각 표시 — 반영된 상태(get)로 버튼 .on 갱신. 조합 보정으로 무시된 이벤트는 켜지지 않음.
  function syncGod() {
    const s = SKY.get();
    panel.querySelectorAll('button[data-time]').forEach((b) => b.classList.toggle('on', b.dataset.time === s.time));
    panel.querySelectorAll('button[data-weather]').forEach((b) => b.classList.toggle('on', b.dataset.weather === s.weather));
    panel.querySelectorAll('button[data-fx]').forEach((b) => b.classList.toggle('on', !!s.fx[b.dataset.fx]));
    panel.querySelectorAll('button[data-flash]').forEach((b) => b.classList.toggle('on', !!s.flashSafe));
  }

  // 버튼 위임 — fx/flash는 현재 상태 기준 토글. 시간대/날씨는 크로스페이드(sky.js 기본 1.8s).
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-time],button[data-auto],button[data-weather],button[data-fx],button[data-flash]');
    if (!b) return;
    const s = SKY.get();
    if (b.dataset.time) SKY.set({ time: b.dataset.time });
    else if (b.dataset.auto) SKY.set({ time: autoTimeOfDay() });
    else if (b.dataset.weather) SKY.set({ weather: b.dataset.weather });
    else if (b.dataset.fx) SKY.set({ fx: { [b.dataset.fx]: !s.fx[b.dataset.fx] } });
    else if (b.dataset.flash) SKY.set({ flashSafe: !s.flashSafe });
    syncGod();
  });

  syncGod();
}
