// world-boot.js — 오픈월드(behind-flag) 부트스트랩. world.html 인라인 <script type="module">에서
// 외부 모듈로 추출(보안 선결: CSP 'unsafe-inline' 제거 → script-src 'self'만으로 동작, 해시 불필요·
// 유지보수 우위 — security-officer 29259bf 지적①). module script는 기본 defer라 DOM 로드 후 실행,
// top-level await 정상. DOM 참조·fetch는 문서(world.html) 기준 상대경로 유지, import는 이 파일(web/js/) 기준.
import { genParcel, riverColAt, genStreet, genWalker } from './world-gen.js';
import { createWorld } from './world.js';
import { randomChibiChar } from './chibi.js';

// ── 월드 매니페스트 로드 → 절차생성 100방 구성 (behind-flag 1단계) ──
// 대지는 world-gen이 시드로 절차생성(결정론=모든 방문자 동일 세계) — 건물/강/오프셋. 입구는 남쪽 문.
// NPC는 매니페스트 home 파셀에 소환. 이름표는 핸들/역할(모델 브랜드명 노출 금지 §6).
// fetch 실패(404·파싱오류) 시 먹통+무피드백 방지 — 오버레이에 가시적 안내(release-reviewer 지적).
let M;
try {
  const res = await fetch('./world/manifest.json'); // 문서(world.html) 기준 경로
  if (!res.ok) throw new Error('manifest HTTP ' + res.status);
  M = await res.json();
} catch (e) {
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

// NPC를 home 파셀 키로 그룹핑(같은 건물 여러 명 = 한 crowd)
const npcByHome = new Map();
for (const n of M.npcs) {
  const [hx, hz] = fixLand(n.home);
  const k = hx + ',' + hz;
  if (!npcByHome.has(k)) npcByHome.set(k, []);
  npcByHome.get(k).push({ id: n.id, nickname: n.nickname, char: n.char, color: n.color, greetings: n.greetings, remarks: toRemarks(n.remarks) });
}

// 그리드 순회 → 파셀 100개(대지=절차생성: 건물/강/오프셋). spawn 파셀(육지 보정)을 배열 선두로.
const parcels = [];
const [sx, sz] = fixLand(M.spawn || [0, 0]);
for (let pz = 0; pz < grid.h; pz++) for (let px = 0; px < grid.w; px++) {
  const P = genParcel(px, pz, M.seed, grid, M.cell);
  const roster = P.space ? npcByHome.get(px + ',' + pz) : null;
  const street = genStreet(px, pz, M.seed, grid, M.cell, P); // 거리 가구 배치(결정론) — def.street
  const walker = genWalker(px, pz, M.seed, grid, M.cell, P); // 거리 배회 NPC 후보(결정론) — def.walker
  const parcel = Object.assign({ px, pz }, P, { street }, walker ? { walker } : {}, roster ? { npc: { roster, count: roster.length } } : {});
  if (px === sx && pz === sz) parcels.unshift(parcel); else parcels.push(parcel);
}

// ── 2단계 실시간: 내 아바타(랜덤 방문자) — 같은 월드 접속자끼리 상호 가시성 ──
const nick = '방문자' + Math.floor(Math.random() * 900 + 100);
const PALETTE = ['#7ec8a0', '#8e7dbe', '#6a8caf', '#e0596e', '#ffd166', '#72e6e1', '#95d5b2'];
const myColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];

const canvas = document.getElementById('c');
const V = createWorld({ canvas, parcels, opts: {
  cellX: M.cell.x, cellZ: M.cell.z, preserveDrawingBuffer: true,
  mp: { nickname: nick, color: myColor, char: randomChibiChar() }, // window.Peer 없으면 world.js가 조용히 1인 모드
} });
window.__world = V;

let playerCount = 1;
V.on('players', (n) => { playerCount = n; });

function fit() { V.resize(window.innerWidth, window.innerHeight); }
window.addEventListener('resize', fit); fit();

// ── 미니맵(우상단) — 현재 셀 하이라이트 + NPC home 점 + 방문 셀 음영. 순수 2D 캔버스(CSP 무영향). ──
const mmap = document.getElementById('minimap'), mctx = mmap.getContext('2d');
const CPX = Math.floor(mmap.width / Math.max(grid.w, grid.h));
const homes = new Set([...npcByHome.keys()]);
const riverSet = new Set(); for (let z = 0; z < grid.h; z++) riverSet.add(riverColAt(z, M.seed, grid) + ',' + z);
const visited = new Set();
function drawMinimap() {
  const p = V.getCurrentParcel();
  visited.add(p.px + ',' + p.pz);
  mctx.clearRect(0, 0, mmap.width, mmap.height);
  for (let z = 0; z < grid.h; z++) for (let x = 0; x < grid.w; x++) {
    const k = x + ',' + z, X = x * CPX, Y = z * CPX;
    mctx.fillStyle = riverSet.has(k) ? 'rgba(90,150,210,.6)' : (visited.has(k) ? 'rgba(114,230,225,.16)' : 'rgba(255,255,255,.05)');
    mctx.fillRect(X + 1, Y + 1, CPX - 2, CPX - 2);
    if (homes.has(k)) { mctx.fillStyle = 'rgba(139,114,255,.9)'; mctx.beginPath(); mctx.arc(X + CPX / 2, Y + CPX / 2, 2.2, 0, 7); mctx.fill(); }
  }
  mctx.strokeStyle = '#72E6E1'; mctx.lineWidth = 2;
  mctx.strokeRect(p.px * CPX + 1, p.pz * CPX + 1, CPX - 2, CPX - 2);
}

// 현재 파셀 표시 + 미니맵 갱신
const pcell = document.getElementById('pcell');
function refreshCell() { const p = V.getCurrentParcel(); pcell.textContent = `파셀 (${p.px},${p.pz}) · ${grid.w}×${grid.h} 월드 · 👤 ${playerCount}`; drawMinimap(); }
setInterval(refreshCell, 300); refreshCell();

// 클릭 유도 오버레이
const enter = document.getElementById('enter');
V.on('lock', ({ locked }) => { enter.classList.toggle('hide', locked); });
enter.addEventListener('click', () => { if (canvas.requestPointerLock) canvas.requestPointerLock(); });

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

// ── 모바일: 터치 감지 → 좌 조이스틱 + 우 드래그 시선 ──
const isTouch = (typeof window !== 'undefined') && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0);
if (isTouch) {
  document.body.classList.add('is-touch');
  const joy = document.getElementById('joy'), nub = document.getElementById('joyNub');
  let joyId = null, jcx = 0, jcy = 0; const JR = 40;
  function joyStart(e) { const t = e.changedTouches[0]; joyId = t.identifier; const r = joy.getBoundingClientRect(); jcx = r.left + r.width / 2; jcy = r.top + r.height / 2; joyMove(e); }
  function joyMove(e) {
    for (const t of e.changedTouches) { if (t.identifier !== joyId) continue;
      let dx = t.clientX - jcx, dy = t.clientY - jcy; const d = Math.hypot(dx, dy) || 1; const cl = Math.min(1, d / JR);
      const ux = dx / d * cl, uy = dy / d * cl; nub.style.transform = `translate(${ux * JR}px,${uy * JR}px)`;
      V.setTouchMove(-uy, ux);
    }
  }
  function joyEnd(e) { for (const t of e.changedTouches) { if (t.identifier !== joyId) continue; joyId = null; nub.style.transform = 'translate(0,0)'; V.setTouchMove(0, 0); } }
  joy.addEventListener('touchstart', (e) => { e.preventDefault(); joyStart(e); }, { passive: false });
  joy.addEventListener('touchmove', (e) => { e.preventDefault(); joyMove(e); }, { passive: false });
  joy.addEventListener('touchend', joyEnd); joy.addEventListener('touchcancel', joyEnd);
  let lookId = null, lx = 0, ly = 0;
  canvas.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; if (t.clientX < window.innerWidth * 0.4) return; lookId = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: true });
  canvas.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) { if (t.identifier !== lookId) continue; V.lookDelta((t.clientX - lx) * 0.004, (t.clientY - ly) * 0.004); lx = t.clientX; ly = t.clientY; } }, { passive: true });
  canvas.addEventListener('touchend', (e) => { for (const t of e.changedTouches) { if (t.identifier === lookId) lookId = null; } });
}
