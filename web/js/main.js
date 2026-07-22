// main.js — OpenArtShow Museum 통합 엔트리 포인트
// 소유: 통합 담당. 다른 모듈의 공개 API 계약을 그대로 사용한다.

import * as THREE from 'three';
import { ROOM, EYE_HEIGHT, BUILDING, PEER_ROOM_ID } from './config.js';
import { createMuseum, sceneTick } from './scene.js';
import {
  ensureGalleryLoaded,
  createArtworks,
  getNearbyArtwork,
  getPlacedArtworks,
  getArtworkHitMeshes,
  getViewingPose,
} from './artworks.js';
import { startAmbient } from './ambient.js';
import { PlayerController } from './player.js';
import { createAvatarInstance } from './avatar.js';
import { NpcCrowd } from './npc.js';
import { playOuch } from './hitfx.js';
import { initFly } from './fly.js';
import { ensureCanvasFonts, getCanvasFont } from './fonts.js';
import { loadNotes, saveNotes, mergeNotes, makeNote } from './guestbook.js';
import { GalleryStats } from './stats.js';
import { VisitorLog, PhotoWall } from './feed.js';
import {
  initUI,
  showLoading,
  hideLobby,
  showArtworkInfo,
  hideArtworkInfo,
  addChatMessage,
  setPlayerCount,
  setStatus,
  setFPS,
  showLightbox,
  isLightboxOpen,
  setOnLightboxClose,
  setGalleryTitle,
  initGalleryPicker,
  initArtworkList,
  toggleArtworkList,
  hideArtworkList,
  isArtworkListOpen,
  showTourBar,
  hideTourBar,
  setTourHandlers,
  setActionHandlers,
  initGuestbook,
  toggleGuestbook,
  isGuestbookOpen,
  setGuestbookNotes,
  setGuestbookStats,
  setDockActive,
  showShareModal,
  isShareModalOpen,
  flashShutter,
} from './ui.js';
import { easeInOutCubic, lerpAngle, resolveAutoTheme, djb2 } from './main-math.js';
import { readSpec, PX_BUDGET } from './main-spec.js'; // writeSpec·LITE_*·PX_BUDGET 일부는 perfGovernor로 이동(4차 A군)
import { probeGpu } from './main-gpu.js';
import { createEventHandlers } from './main-events.js';
import { createPhotoController } from './main-photo.js';
import { createTourController } from './main-tour.js';
import { createSelfViewController } from './main-selfview.js';
import { createMultiplayerController } from './main-multiplayer.js';
import { createPerfGovernor } from './main-perf.js';

let renderer = null;
let scene = null;
let camera = null;
let player = null;
let flyController = null; // fly.js 비행 컨트롤러(점프 홀드) — 입장 setup에서 초기화
let multiplayerController = null; // createMultiplayerController(mpCtx) 반환 — init에서 세팅, mp(및 연결 생명주기) SSOT 소유 + connect/tick 위임
let eventHandlers = null; // createEventHandlers(eventsCtx) 반환 — init에서 세팅, 아래 wrapper가 위임
let photoController = null; // createPhotoController(photoCtx) 반환 — init에서 세팅, capturePhoto wrapper가 위임
let tourController = null; // createTourController(tourCtx) 반환 — init에서 세팅, 투어 상태 5개 SSOT 소유 + tick 위임
let selfViewController = null; // createSelfViewController(selfViewCtx) 반환 — init에서 세팅, 셀프뷰 상태 SSOT 소유 + tick 위임
let perfGovernor = null; // createPerfGovernor(perfCtx) 반환 — init에서 세팅, 성능/렌더 상태 9개 SSOT 소유 + tick 위임 (4차 A군)
let npcCrowd = null; // AI 관객 — 호스트가 될 때 npcProvider 안에서 지연 생성
let stats = null; // 작가 리포트 (전시별 방문·감상 통계 — stats.js)
const visitorLog = new VisitorLog(); // 랜딩 "최근 관람객" 피드
// 적응형 저사양(lite) 모드·섀도 재베이크·FPS 집계 상태 9개는 perfGovernor(main-perf.js)가
// SSOT로 소유한다(4차 A군). 게임루프는 perfGovernor.tick(delta) 한 줄로 위임한다.
let gpuInfo = { name: '', soft: false }; // GPU 자가 진단 결과 (init에서 채움) — perfGovernor에 값 주입

// 소프트웨어 렌더링 안내 배너 — 원인은 이 기기의 브라우저 설정이므로,
// 화질을 깎는 대신 사용자가 스스로 고칠 수 있게 경로를 알려준다.
// fatal=true: WebGL 생성 자체가 실패한 경우(Chrome M133+ 블랙리스트).
// ※ 현재는 fatal=true 경로에서만 호출된다 — "느림" 경고(fatal=false)는
//   감상을 가려 감독 지시로 비활성화(호출 제거). 복원 시 포테이토 모드
//   블록에서 showGpuNotice(gpuInfo.name, false) 한 줄을 되살리면 된다.
function showGpuNotice(gpuName, fatal) {
  const box = document.createElement('div');
  box.id = 'lu-gpu-notice';
  box.style.cssText =
    'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:1200;' +
    'max-width:min(92vw,600px);background:linear-gradient(180deg,#fffdf8,#f6f1e4);' +
    'color:#17140f;border:1px solid rgba(95,158,125,0.55);border-radius:14px;' +
    'padding:14px 44px 14px 18px;box-shadow:0 12px 32px rgba(20,15,8,0.35);' +
    `font:13px/1.75 ${getCanvasFont()};`;
  const head = fatal
    ? '<b>이 브라우저에서 3D 그래픽 기능을 사용할 수 없습니다</b><br>'
    : '<b>이 브라우저가 그래픽카드(GPU) 없이 화면을 그리고 있어요</b> — 그래서 몹시 느립니다.<br>';
  box.innerHTML =
    head +
    '<b>Chrome</b>: 설정 → 시스템(<b>chrome://settings/system</b>) → "그래픽 가속 사용" 켜기 → 다시 시작<br>' +
    '<b>Edge</b>: 설정 → 시스템 및 성능 → "그래픽 가속 사용" 켜기 + "효율 모드" 끄기<br>' +
    '<b>Firefox</b>: 설정 → 일반 → 성능 → "권장 성능 설정" 해제 → "하드웨어 가속 사용" 체크<br>' +
    '그래도 느리면: 원격 데스크톱 여부 확인 · 그래픽 드라이버 업데이트 · ' +
    'Windows 설정 → 디스플레이 → 그래픽에서 브라우저를 "고성능" GPU로 지정 · ' +
    '확장프로그램 없는 시크릿 창으로 접속해 비교' +
    (gpuName ? '<div style="margin-top:6px;font-size:11px;color:#8a8172;">감지된 렌더러: ' + gpuName + '</div>' : '');
  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', '닫기');
  close.textContent = '×';
  close.style.cssText =
    'position:absolute;top:8px;right:10px;width:26px;height:26px;border:none;background:none;' +
    'font-size:18px;color:#8a8172;cursor:pointer;';
  close.addEventListener('click', () => box.remove());
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.textContent = '진단 정보 복사';
  copyBtn.style.cssText =
    'display:inline-block;margin-top:8px;padding:5px 14px;border-radius:999px;' +
    'border:1px solid rgba(95,158,125,0.5);background:rgba(95,158,125,0.12);' +
    'color:#17140f;font:600 11px/1 inherit;cursor:pointer;';
  copyBtn.addEventListener('click', () => {
    const report = JSON.stringify({
      renderer: gpuName, ua: navigator.userAgent, dpr: window.devicePixelRatio,
      screen: screen.width + 'x' + screen.height, cores: navigator.hardwareConcurrency || 0,
      mem: navigator.deviceMemory || 0,
    });
    try { navigator.clipboard.writeText(report); copyBtn.textContent = '복사됨!'; } catch (_) { /* 무시 */ }
  });
  box.appendChild(copyBtn);
  box.appendChild(close);
  document.body.appendChild(box);
}

// ---------------------------------------------------------------------------
// 첫 방문 행동 온보딩 (터치 전용, UX 감사 §3 경량판) — 모달 대신 "행동으로
// 배우는" 3단계: 이동 힌트(맥동 링) → 시점 스와이프 힌트 → 투어 안전망 안내.
// 각 단계는 실제 행동(이동/회전)이 감지되면 넘어가며 localStorage로 1회만.
// ---------------------------------------------------------------------------
const ONBOARD_KEY = 'lu-onboard-v1';
let onboardStep = -1; // -1: 비활성
let onboardRing = null;
let onboardPos0 = null;
let onboardYaw0 = 0;
let onboardDoneT = 0;

function startOnboarding() {
  try {
    if (localStorage.getItem(ONBOARD_KEY)) return;
  } catch (_) { /* 접근 불가 시 매번 떠도 무해 */ }
  if (!(typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)) return;
  onboardStep = 0;
  const st = player.getState();
  onboardPos0 = { x: st.x, z: st.z };
  // 맥동하는 조이스틱 프리뷰 링 — 플로팅 조이스틱이라 위치가 달라도 동작 일치
  const styleTag = document.createElement('style');
  styleTag.textContent = '@keyframes lu-ob-pulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} 70%{transform:translate(-50%,-50%) scale(1.25);opacity:0.2;} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} }';
  document.head.appendChild(styleTag);
  onboardRing = document.createElement('div');
  onboardRing.style.cssText =
    'position:fixed;left:24%;bottom:22%;width:110px;height:110px;border-radius:50%;' +
    'border:3px solid rgba(255,253,247,0.85);pointer-events:none;z-index:60;' +
    'transform:translate(-50%,-50%);animation:lu-ob-pulse 1.6s ease-in-out infinite;';
  document.body.appendChild(onboardRing);
  setStatus('왼쪽 화면을 누른 채 밀면 걸어요 🚶');
}

function tickOnboarding() {
  if (onboardStep < 0) return;
  const st = player.getState();
  if (onboardStep === 0) {
    if (Math.hypot(st.x - onboardPos0.x, st.z - onboardPos0.z) > 1.5) {
      onboardStep = 1;
      onboardYaw0 = st.ry;
      if (onboardRing) {
        onboardRing.remove();
        onboardRing = null;
      }
      setStatus('잘했어요! 오른쪽 화면을 쓸면 주위를 둘러봐요 👀');
    }
  } else if (onboardStep === 1) {
    let dy = st.ry - onboardYaw0;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    if (Math.abs(dy) > 0.6) {
      onboardStep = 2;
      onboardDoneT = 0;
      setStatus('작품에 다가가면 설명이 나타나요 — 어려우면 [투어] 버튼을 눌러요 🖼️');
    }
  } else if (onboardStep === 2) {
    onboardDoneT += 1;
    if (onboardDoneT > 420) { // ~7초(60fps 기준) 후 종료
      onboardStep = -1;
      try { localStorage.setItem(ONBOARD_KEY, '1'); } catch (_) { /* 무시 */ }
    }
  }
}

// applyNpcCulling(저사양 시 원거리 NPC 숨김)은 perfGovernor(main-perf.js)로 이전(4차 A군).
// 호출처(lite 진입/이탈·2초 주기)가 전부 컨트롤러 tick 안이라 외부 노출 없이 내부 메서드로 소유.
const photoWall = new PhotoWall(); // 랜딩 "라이브 포토월" 피드
let statsDwellTimer = null;

// ---------------------------------------------------------------------------
// 3인칭 '내 모습 보기' (V키 / 터치 독 '시점' 버튼)
// 구현은 main-selfview.js(createSelfViewController)로 분리(3차 세 번째 군). 셀프뷰
// 상태(thirdPerson·selfAvatar·selfPrev·selfSpeed)와 셀프캠 상수를 컨트롤러가 SSOT로
// 소유하고, animate 게임루프는 tick(delta) 한 줄 + render 분기로 위임한다. main.js에는
// 셀프뷰 상태 let이 남지 않는다. selfInfo(입장 시 캡처)만 main.js가 소유하고 getter로 넘긴다.
// ---------------------------------------------------------------------------
let selfInfo = null;    // { nickname, color, char } — 입장 시 캡처. 컨트롤러가 getSelfInfo()로 읽는다.

// V키/터치 독 '시점' 트리거 위임 wrapper — exports·HUD 콜백 시그니처 불변 유지.
function toggleSelfView() {
  selfViewController.toggle();
}

// 입장 후 꾸미기 창에서 [저장하고 사용]을 누르면 호출 — 월드의 내 아바타를 새 룩으로
// 교체하고 멀티플레이로 전파한다(다른 관람객 화면에도 반영). 저장 자체는 ui.js가 담당.
// selfAvatar는 컨트롤러 소유이므로 재빌드는 selfViewController.rebuildAvatar에 위임한다.
function handleAvatarChange(char) {
  if (!char) return;
  selfInfo = selfInfo ? Object.assign({}, selfInfo, { char }) : { char };
  // 3인칭 아바타가 이미 생성돼 있으면 즉시 재빌드(위치·시점 유지) — 컨트롤러 위임
  selfViewController.rebuildAvatar(char);
  // 멀티플레이 전파 — 접속 중이면 다른 사람 화면에도 새 모습이 퍼진다
  const mp = multiplayerController.getMp();
  if (mp && typeof mp.setChar === 'function') mp.setChar(char);
  setStatus('아야모 모습을 바꿨어요 ✨');
}

// ---------------------------------------------------------------------------
// 캐릭터 때리기 — 캔버스 탭/클릭(데스크톱·모바일 공용)으로 아바타를 콕.
// 드래그(시점 회전/이동)와 구분: 이동 7px 미만 + 450ms 미만만 탭으로 인정.
// 명중 판정은 레이캐스트, 사거리 4m — 호스트가 서버 권위로 한 번 더 검증한다.
// ---------------------------------------------------------------------------
const HIT_REACH = 7.0; // 좀 더 멀리서도 콕 — 감독 지시로 4→7m 상향
const _tapRaycaster = new THREE.Raycaster();
const _tapNdc = new THREE.Vector2();
let _tapDown = null;

function bindHitTap(dom) {
  dom.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    _tapDown = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  dom.addEventListener('pointerup', (e) => {
    const down = _tapDown;
    _tapDown = null;
    const mp = multiplayerController.getMp();
    if (!down || !e.isPrimary || !entered || !mp) return;
    if (performance.now() - down.t > 450) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) return;
    const rect = dom.getBoundingClientRect();
    _tapNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    _tapRaycaster.setFromCamera(_tapNdc, camera);
    _tapRaycaster.far = HIT_REACH + selfViewController.getSelfCamDist(); // 3인칭이면 카메라가 뒤로 빠져 있음
    const entries = [...mp.remoteAvatars.entries()];
    if (!entries.length) return;
    const groups = entries.map(([, av]) => av.group);
    const hits = _tapRaycaster.intersectObjects(groups, true);
    if (hits.length) {
      // 아바타 명중 — 콕 찌르기
      let node = hits[0].object;
      while (node && !groups.includes(node)) node = node.parent;
      if (node) {
        const [id] = entries[groups.indexOf(node)];
        mp.sendHit(id);
        return;
      }
    }
    // 아바타 미명중 — 작품 탭이면 그 작품 앞으로 자동 이동 (UX 감사 §4:
    // 이동 조작이 서툰 관람객도 탭 한 번으로 작품에 도달)
    _tapRaycaster.far = 60;
    const artHits = _tapRaycaster.intersectObjects(getArtworkHitMeshes(), false);
    if (artHits.length && artHits[0].object.userData.luArt) {
      handleArtworkSelect(artHits[0].object.userData.luArt);
    }
  });
}
let clock = null;
let myNickname = '게스트'; // 입장 시 갱신 — 채팅 isSelf 판별용
let entered = false; // 로비 통과 여부 — 라이트박스 E키 게이트에 사용
let galleryInfo = null; // ensureGalleryLoaded() 결과 캐시 (전시 디렉터리 picker의 currentId로 사용)
let placedArtworks = []; // getPlacedArtworks() 캐시 — 작품 목록/투어 공용

// 방명록 상태 — 갤러리별 localStorage 키(gbKey) + 현재 렌더 중인 병합본(guestbookNotes) 캐시
let gbKey = 'shared';
let guestbookNotes = [];
// (연결 직후 방명록 1회 동기화 플래그 guestbookSentOnce는 multiplayerController가 소유 — mp 연결 생명주기 전용 상태)

// (FPS 집계 fpsFrames·fpsElapsed는 perfGovernor가 소유 — 4차 A군)

// ---------------------------------------------------------------------------
// 카메라 트윈 (텔레포트/투어 공용) — animate 루프 안에서 매 프레임 갱신된다.
// ---------------------------------------------------------------------------
let tween = null; // { fromX, fromZ, fromRy, toX, toZ, toRy, duration, elapsed, onDone }

const TWEEN_MIN_DURATION = 0.8; // s
const TWEEN_MAX_DURATION = 2.2; // s

// 현재 카메라 pose → 목표 pose로 부드럽게 이동을 시작한다. 이동 중에는
// player.disable()을 유지하고, 완료 시 onDone(목표 pose)을 호출한다.
function startTween(toPose, onDone) {
  const cur = player.getState();
  const toY = typeof toPose.y === 'number' ? toPose.y : cur.y;
  const dx = toPose.x - cur.x;
  const dy = toY - cur.y;
  const dz = toPose.z - cur.z;
  const dist = Math.hypot(dx, dy, dz);
  const duration = THREE.MathUtils.clamp(
    TWEEN_MIN_DURATION + dist * 0.035,
    TWEEN_MIN_DURATION,
    TWEEN_MAX_DURATION
  );
  player.disable();
  tween = {
    fromX: cur.x,
    fromY: cur.y,
    fromZ: cur.z,
    fromRy: cur.ry,
    toX: toPose.x,
    toY: toY,
    toZ: toPose.z,
    toRy: toPose.ry,
    duration,
    elapsed: 0,
    onDone: onDone || null,
  };
}

const tweenEuler = new THREE.Euler(0, 0, 0, 'YXZ');

function updateTween(delta) {
  if (!tween) return;
  tween.elapsed += delta;
  const t = Math.min(1, tween.elapsed / tween.duration);
  const e = easeInOutCubic(t);
  const x = tween.fromX + (tween.toX - tween.fromX) * e;
  const y = tween.fromY + (tween.toY - tween.fromY) * e;
  const z = tween.fromZ + (tween.toZ - tween.fromZ) * e;
  const ry = lerpAngle(tween.fromRy, tween.toRy, e);
  camera.position.set(x, y, z);
  tweenEuler.set(0, ry, 0, 'YXZ');
  camera.quaternion.setFromEuler(tweenEuler);
  if (t >= 1) {
    const done = tween.onDone;
    tween = null;
    if (done) done();
  }
}

// ---------------------------------------------------------------------------
// 도슨트 투어 상태 — main-tour.js(createTourController) 클로저가 SSOT로 소유(3차).
// touring·tourIndex·tourAutoOn·tourWaiting·tourStayElapsed와 임계 상수
// TOUR_STAY_SECONDS는 컨트롤러가 소유하며, main.js는 tourController.isTouring()·
// getIndex() 등 getter로만 투어 상태를 읽는다.
// ---------------------------------------------------------------------------

async function init() {
  showLoading(true);

  // 1. 렌더러 / 씬 / 카메라
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    55, // 자연 원근 (사람 시야감) — 광각 왜곡 없이 180cm 관람자의 눈으로
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(BUILDING.spawn.x, EYE_HEIGHT, BUILDING.spawn.z);

  // 품질 사다리 적용 — MSAA(antialias) + 슈퍼샘플링(SSAA, 화면보다 크게
  // 렌더 후 축소)으로 계단 현상을 이중으로 누른다.
  const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const spec = readSpec();

  // ---- GPU 자가 진단 (렌더러 생성 전 프로브) -------------------------------
  // "폰 60fps / PC 3fps"는 씬이 아니라 그 PC가 GPU 없이 CPU로 그리고 있다는
  // 신호다 (전문가 진단: 프레임당 250~330ms는 소프트웨어 래스터라이저의 전형
  // 배율이고, 드로우콜 지배적이라 해상도를 낮춰도 안 빨라지는 것까지 부합).
  // 렌더러 생성 "전"에 판별해야 antialias(생성 시점 옵션)를 끌 수 있다.
  gpuInfo = probeGpu();
  console.info('[OpenArtShow] GPU:', gpuInfo.name || '(unknown)', gpuInfo.soft ? '— SOFTWARE RENDERING' : '');
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !gpuInfo.soft, // AA off는 소프트웨어 렌더러 전용 — low 스펙도 씬 경량화 후 MSAA 감당 가능
      powerPreference: 'high-performance',        // 듀얼 GPU 노트북에서 dGPU 선택 유도
    });
  } catch (err) {
    // Chrome M133+는 GPU 블랙리스트 시 소프트웨어 폴백 없이 WebGL 생성이 실패한다
    showGpuNotice('', true);
    throw err;
  }
  bindHitTap(renderer.domElement);
  // 비네팅 — 가장자리를 살짝 눌러 시선을 화면 중앙(작품)으로 모은다.
  // DOM 오버레이라 GPU 비용 0. 사진 캡처에는 capturePhoto가 동일 그라디언트를
  // 캔버스에 합성해 화면과 같은 무드로 저장된다.
  const vignette = document.createElement('div');
  vignette.id = 'lu-vignette';
  vignette.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:5;' +
    'background:radial-gradient(ellipse 72% 62% at 50% 46%,' +
    ' rgba(8,6,4,0) 50%, rgba(8,6,4,0.03) 62%, rgba(8,6,4,0.09) 72%,' +
    ' rgba(8,6,4,0.17) 82%, rgba(8,6,4,0.26) 91%, rgba(8,6,4,0.34) 100%);';
  document.body.appendChild(vignette);

  const dpr = window.devicePixelRatio || 1;
  let ratio;
  if (spec === 'low') {
    ratio = Math.min(dpr, 1.25);
  } else if (spec === 'high') {
    ratio = Math.min(Math.max(dpr, 2), 2.5); // 고사양: 네이티브(최대 2.5)
  } else if (coarsePointer) {
    // 실기기 제보: 고DPR 폰을 1.5로 캡하면 절반 해상도 확대라 액자 모서리
    // 계단이 심함 — 기본을 2.0 캡으로 상향 (베이킹 후 씬이 가벼워져 감당 가능)
    ratio = Math.min(dpr, 2);
  } else {
    ratio = Math.min(Math.max(dpr, 1.5), 2);
  }
  // 픽셀 예산 캡 — 큰 모니터(QHD/4K)에서 슈퍼샘플 배율이 총 픽셀 수를
  // 폭발시키지 않게 등급별 상한으로 배율을 자동 축소한다. 씬 경량화(드로우콜
  // -62%) 후 상향 — 60fps 달성 기기의 "알리아싱 필요해" 제보 반영.
  const budget = spec === 'high' ? PX_BUDGET.high : spec === 'low' ? PX_BUDGET.low : PX_BUDGET.base;
  ratio = Math.min(ratio, Math.sqrt(budget / (window.innerWidth * window.innerHeight)));

  // ---- 포테이토 모드 — 소프트웨어 렌더링에서도 걷게 하는 최후 폴백 --------
  // 원인은 이 기기의 브라우저 설정이지만, "느림" 안내 배너는 감상을 가려
  // 노출하지 않는다(감독 지시). 저해상도·그림자 off·무톤매핑·린 조명·프레임
  // 캡으로 조용히 버틴다. (WebGL 자체 불가 시의 치명 안내는 유지 — 위 catch절.)
  if (gpuInfo.soft) {
    ratio = Math.min(ratio, 0.7); // 지오메트리 병합 후 상향 (0.5는 뿌옇다는 실기기 제보)
    document.documentElement.classList.add('lu-potato'); // HUD blur 해제 (CPU 컴포지팅 절약)
  }

  renderer.setPixelRatio(ratio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !gpuInfo.soft;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // ACES 톤매핑은 프래그먼트당 수십 ALU — CPU 렌더에서는 그대로 비용이라 끈다
  renderer.toneMapping = gpuInfo.soft ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92; // 전체 감광 — 갤러리 무드 (기존 1.1)
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // 2. 갤러리 데이터 로드(1회, 캐시) → 테마 반영 뮤지엄 건축 → 작품 설치
  //    createArtworks() 내부에서도 동일한 캐시된 프로미스를 await하므로 fetch는 1회만 발생한다.
  const ginfo = await ensureGalleryLoaded();
  const resolvedTheme = resolveAutoTheme(ginfo.theme);
  // 다운라이트(포인트 15개)는 정상 GPU에서만 — 화질은 다수를 위해 유지하고,
  // 소프트웨어 렌더링/저사양 학습 기기만 웜 앰비언트 1개로 대체한다.
  createMuseum(scene, resolvedTheme, { fullLights: !gpuInfo.soft && spec !== 'low' });
  // 작품 플라크 텍스처를 굽기 전에 한글(나눔고딕) 폰트 로드를 보장한다 — 캔버스는
  // 그리는 시점에 폰트가 없으면 시스템 폰트로 폴백해 그대로 텍스처에 구워지기 때문.
  await ensureCanvasFonts();
  await createArtworks(scene);
  // [정문 포털] portal.js(가산형 독립)가 씬에 접근하는 유일 훅 — 순수 노출 1줄(팀장 §10-4 게이트).
  // 라이브 런타임 로직은 무변경. portal.js가 이 객체를 폴링해 입구 게이트를 씬에 더한다.
  window.__museum = { scene, camera, renderer };
  if (gpuInfo.soft) scene.fog = null; // 프래그먼트당 fog 연산 삭감 (포테이토 모드)

  // 섀도맵 프리즈 — 씬이 정적(아바타는 블롭 그림자)이므로 그림자를 1회만 굽고
  // 매 프레임 재렌더를 끈다 (실측: 프레임 시간의 62%가 섀도 패스였다).
  // cycle 테마만 태양이 움직이므로 저빈도(2초)로 재베이크한다.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  // 섀도 재베이크 주기(cycle 테마만 2초, 정적은 0)는 perfGovernor 생성 후
  // setShadowInterval()로 결선한다(4차 A군) — resolvedTheme은 init 스코프에서 유효.


  // 전시 제목 표시 + 전시 디렉터리 picker 배선 (ginfo 재사용)
  galleryInfo = ginfo;
  setGalleryTitle(galleryInfo.name);
  loadGalleryDirectory();

  // 방명록 — 갤러리별 로컬 노트 로드 (공유 링크 등 id가 없으면 'shared' 키 사용)
  gbKey = ginfo.id ?? 'shared';
  guestbookNotes = loadNotes(gbKey);
  setGuestbookNotes(guestbookNotes);
  initGuestbook({ onSubmit: handleGuestbookSubmit });

  // 작품 목록 패널 + 도슨트 투어 배선 (createArtworks 완료 후에만 유효)
  placedArtworks = getPlacedArtworks();
  initArtworkList(placedArtworks, handleArtworkSelect);
  setTourHandlers({
    onPrev: tourPrev,
    onNext: tourNext,
    onExit: exitTour,
    onToggleAuto: tourToggleAuto,
  });
  // 터치 기기 액션 독(투어/방명록)·작품 패널 '크게 보기' 버튼 — 키보드 T/E/G의 대체 진입점
  setActionHandlers({
    onSelfView: () => { if (entered && !isShareModalOpen()) toggleSelfView(); },
    onTour: () => { if (entered) toggleTour(); },
    onViewArtwork: viewCurrentArtwork,
    onGuestbook: () => { if (entered && !isLightboxOpen()) toggleGuestbook(); },
    onCapture: () => { if (entered && !isShareModalOpen()) { flashShutter(); capturePhoto(); } },
  });

  // 3. 플레이어 컨트롤러 (로비 동안 비활성)
  // 생성자가 스폰 위치를 z=8로 재설정하므로, 의도한 스폰(z=12)은 생성 후 지정
  player = new PlayerController(camera, renderer.domElement);
  // BUILDING.spawn — 1F 남측 입구 앞, 북쪽(작품 벽)을 바라보고 시작
  const spawnFloor = BUILDING.floors.find((f) => f.id === BUILDING.spawn.floor);
  player.setPose({
    x: BUILDING.spawn.x,
    y: (spawnFloor ? spawnFloor.y : 0) + EYE_HEIGHT,
    z: BUILDING.spawn.z,
    ry: BUILDING.spawn.ry,
  });

  // 비행(점프 홀드) — fly.js가 player.liftOffset 훅 구동 + 셀프 아바타 비행 포즈 토글.
  // selfAvatar는 3인칭 셀프뷰에서 지연 생성되므로 getter로 넘긴다.
  flyController = initFly({ player, getSelfAvatar: () => selfViewController.getSelfAvatar() });
  player.disable();

  // 4. UI 초기화 → 로비 표시
  // 진단 가시화 — FPS 칩 클릭으로 진단 JSON 복사 + 포테이토 모드 상시 배지.
  // "가속을 켰는데도 느리다" 류 제보에서 모드/GPU를 감으로 추측하지 않기 위함.
  setTimeout(() => {
    const chip = document.getElementById('lu-topright');
    if (chip) {
      chip.style.cursor = 'pointer';
      chip.title = '클릭하면 성능 진단 정보가 복사됩니다';
      chip.addEventListener('click', () => {
        const report = JSON.stringify({
          gpu: gpuInfo.name, soft: gpuInfo.soft,
          pixelRatio: renderer ? renderer.getPixelRatio() : 0,
          aa: renderer ? renderer.getContext().getContextAttributes().antialias : null,
          dpr: window.devicePixelRatio, screen: screen.width + 'x' + screen.height,
          inner: window.innerWidth + 'x' + window.innerHeight,
          cores: navigator.hardwareConcurrency || 0, spec: readSpec(),
          calls: renderer ? renderer.info.render.calls : 0,
          ua: navigator.userAgent,
        });
        try {
          navigator.clipboard.writeText(report);
          setStatus('진단 정보가 복사됐어요 — 붙여넣어 보내주세요');
        } catch (_) { console.info('[OpenArtShow diag]', report); }
      });
    }
    // (소프트웨어 렌더링 배지도 감독 지시로 비활성 — 위 '느림' 경고 배너와
    //  같은 취지. potato 모드 최적화(해상도·그림자·톤매핑)는 그대로 작동한다.)
  }, 0);

  initUI({
    onEnter: handleEnter,
    onChatSend: handleChatSend,
    onAvatarChange: handleAvatarChange,
    // 입장 후 꾸미기 모달 열림/닫힘 — 라이트박스·투어와 동일하게 플레이어를 멈춘다.
    // 로비(입장 전)에서 여는 경우는 이미 비활성이므로 무시.
    onMakerToggle: (isOpen) => {
      if (!entered) return;
      if (isOpen) player.disable();
      else if (!tourController.isTouring()) player.enable();
    },
  });
  showLoading(false);

  // 라이트박스가 닫히면(ESC/X/배경 클릭 모두) 플레이어 이동을 재활성화.
  // 단, 투어 진행 중에는 카메라를 투어가 계속 통제해야 하므로 재활성화하지 않는다.
  setOnLightboxClose(() => {
    if (entered && !tourController.isTouring()) player.enable();
  });

  // 멀티플레이어(P2P) 오케스트레이션 컨트롤러 구현은 main-multiplayer.js로 분리(3차 마지막 군).
  // mp(MultiplayerManager 인스턴스)의 생성·콜백 배선·게임루프 tick·연결 직후 방명록 1회 동기화를
  // 이 컨트롤러가 SSOT로 소유한다. main.js에는 mp let이 남지 않는다(getMp()로 읽고 각자 null 가드).
  // 배선만 컨트롤러 책임이고 각 콜백의 도메인 본체(stats·visitorLog·photoWall·npcCrowd·셀프 아바타
  // hit)는 아래 ctx 인라인(main.js 도메인 상태를 클로저로 참조)으로 주입한다 — 컨트롤러가 여러
  // 도메인을 알게 되는 God object가 되지 않도록 경계를 도메인에 둔다. 재대입 let(scene·player)은
  // getter로, 안정 참조(setStatus)와 콜백 본체는 값으로 주입한다. 아래 eventsCtx·photoCtx의
  // getMp가 이 컨트롤러를 참조하므로 그보다 먼저 생성한다(조립점이 mp 소유 이전을 중재).
  multiplayerController = createMultiplayerController({
    getScene: () => scene,
    getPlayer: () => player,
    setStatus,
    getGuestbookNotes: () => guestbookNotes,
    onVisitor: (id, info) => {
      stats.addVisit(id);
      visitorLog.add(info && info.nickname, galleryInfo ? galleryInfo.name : '');
    },
    onPhoto: (item) => {
      photoWall.addRemote(item);
      setStatus(`${item.name || '누군가'}님이 관람 사진을 남겼어요 📸`);
    },
    onChat: (name, text) => addChatMessage(name, text, false),
    onPlayerCount: (n) => setPlayerCount(n),
    onRemoteGuestbook: handleRemoteGuestbook,
    // 내가 맞았을 때 — 상태바 + (3인칭이면) 내 아바타에도 상처 반영
    onSelfHit: (level) => {
      setStatus(level >= 3 ? '아야!! 너무해요 😭' : '아야! 누가 때렸어요 😣');
      const sa = selfViewController.getSelfAvatar();
      if (sa) sa.hit(level); // hitfx가 "아얏" 사운드까지 담당
      else playOuch(level); // 3인칭 아바타가 없어도 소리는 난다
    },
    // NPC가 맞았을 때 — 아파하는 한마디 + 때린 사람 쳐다보기
    onNpcHit: (id, level, hitter) => {
      if (npcCrowd) npcCrowd.onHit(id, level, hitter);
    },
    // AI 관객 — 호스트가 된 클라이언트만 mp.update()가 매 프레임 호출한다.
    // 작품 배치는 입장 전에 끝나므로 getPlacedArtworks()는 여기서 항상 유효하다.
    npcProvider: (delta, humans) => {
      if (!npcCrowd) npcCrowd = new NpcCrowd(getPlacedArtworks());
      const states = npcCrowd.update(delta, humans);
      const remark = npcCrowd.takeChat();
      if (remark) multiplayerController.getMp().sendNpcChat(remark.name, remark.text); // 호스트 화면 표시 포함
      return states;
    },
  });

  // DOM 이벤트 핸들러 구현은 main-events.js로 분리(2차). 공유 상태를 읽고 쓰므로
  // ctx 주입: 재대입되는 let(camera·renderer·entered)은 값 캡처가 아니라 getter로 넘겨
  // stale 참조를 막고, mp는 multiplayerController.getMp() 경유로, 기능 함수는 참조 그대로 전달한다.
  // 리스너 등록(아래 addEventListener 3곳)은 main.js에 그대로 유지 — 등록 지점·횟수·순서 불변.
  const eventsCtx = {
    getCamera: () => camera,
    getRenderer: () => renderer,
    getMp: () => multiplayerController.getMp(),
    isEntered: () => entered,
    isTouring: () => tourController.isTouring(),
    viewCurrentArtwork,
    toggleArtworkList,
    toggleTour,
    toggleGuestbook,
    flashShutter,
    capturePhoto,
    toggleSelfView,
    tourPrev,
    tourNext,
    exitTour,
    isLightboxOpen,
    isShareModalOpen,
    isArtworkListOpen,
    isGuestbookOpen,
  };
  eventHandlers = createEventHandlers(eventsCtx);

  // 셀프뷰(3인칭 자기시점) 컨트롤러 구현은 main-selfview.js로 분리(3차 세 번째 군).
  // 셀프뷰 상태(thirdPerson·selfAvatar·selfPrev·selfSpeed)와 셀프캠 상수를 SSOT로 소유하고,
  // animate 게임루프는 tick(delta) + render 분기로 위임한다. 재대입 let(scene·camera·player·
  // selfInfo·entered)은 getter로, 안정 참조(createAvatarInstance·EYE_HEIGHT·setStatus·
  // setDockActive)는 값으로 주입한다. 아래 photoCtx가 이 컨트롤러의 셀프캠 4개 메서드를
  // 참조하므로 photoController보다 먼저 생성한다(조립점이 컨트롤러 간 의존을 중재).
  const selfViewCtx = {
    getScene: () => scene,
    getCamera: () => camera,
    getPlayer: () => player,
    getSelfInfo: () => selfInfo,
    isEntered: () => entered,
    createAvatarInstance,
    EYE_HEIGHT,
    setStatus,
    setDockActive,
  };
  selfViewController = createSelfViewController(selfViewCtx);

  // 사진(포토 모드) 컨트롤러 구현은 main-photo.js로 분리(3차). eventsCtx와 동일하게
  // 재대입 let(renderer·scene·camera·galleryInfo·myNickname·mp)은 getter로, 안정 참조
  // (photoWall·함수)는 값으로 주입한다. 셀프캠 4개(isThirdPerson·getSelfAvatar·
  // applySelfCamOffset·restoreSelfCamOffset)는 selfViewController 메서드로 재배선한다
  // (셀프뷰 상태가 컨트롤러로 이전됨 — 조립점이 중재, main-photo.js ctx 계약은 불변).
  // 위 capturePhoto wrapper가 이 컨트롤러에 위임하며, 실제 호출(P키/캡처버튼)은 init 완료 후에만 발생한다.
  const photoCtx = {
    getRenderer: () => renderer,
    getScene: () => scene,
    getCamera: () => camera,
    isThirdPerson: () => selfViewController.isThirdPerson(),
    getSelfAvatar: () => selfViewController.getSelfAvatar(),
    applySelfCamOffset: () => selfViewController.applySelfCamOffset(),
    restoreSelfCamOffset: () => selfViewController.restoreSelfCamOffset(),
    getGalleryInfo: () => galleryInfo,
    photoWall,
    getMyNickname: () => myNickname,
    getMp: () => multiplayerController.getMp(),
    showShareModal,
    setStatus,
  };
  photoController = createPhotoController(photoCtx);

  // 도슨트(투어) 컨트롤러 구현은 main-tour.js로 분리(3차). 투어 상태 5개 +
  // 임계 상수를 이 컨트롤러가 SSOT로 소유하고, animate 게임루프는 tick(delta)
  // 한 줄로 위임한다. 재대입 let(placedArtworks·player·entered·tween)은 getter로,
  // tween 즉시정지(exitTour)는 clearTween 위임으로, 안정 참조(startTween·
  // getViewingPose·투어바/독 UI)는 값으로 주입한다. 아래 투어 wrapper 5개와
  // handleArtworkSelect의 투어 분기가 이 컨트롤러에 위임한다.
  const tourCtx = {
    getPlacedArtworks: () => placedArtworks,
    getPlayer: () => player,
    isEntered: () => entered,
    getTween: () => tween,
    clearTween: () => { tween = null; },
    startTween,
    getViewingPose,
    showTourBar,
    hideTourBar,
    setDockActive,
    isLightboxOpen,
    isArtworkListOpen,
    hideArtworkList,
  };
  tourController = createTourController(tourCtx);

  // 성능/렌더 거버너 구현은 main-perf.js로 분리(4차 A군). 저사양(lite) 히스테리시스·
  // NPC 컬링·섀도 재베이크·FPS 집계·spec 학습 상태 9개 + applyNpcCulling을 SSOT로 소유하고,
  // animate 게임루프는 tick(delta) 한 줄로 위임한다. 안정 참조(renderer·camera·gpuInfo)는
  // 값으로(프레임당 getter 회피), 동적(mp·entered)은 getter로 주입한다. render()는 A군 무관.
  // 섀도 초기 주기는 resolvedTheme으로 결선(원본 init의 shadowRebakeInterval 대입 경로 보존).
  perfGovernor = createPerfGovernor({
    renderer,
    camera,
    gpuInfo,
    getMp: () => multiplayerController.getMp(),
    isEntered: () => entered,
    setFPS,
    setStatus,
  });
  perfGovernor.setShadowInterval(resolvedTheme === 'cycle' ? 2 : 0);

  // 리사이즈 대응
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onKeyDown);

  // 렌더 루프 시작
  clock = new THREE.Clock();
  renderer.setAnimationLoop(animate);
}

// 전시 디렉터리 로드 — 실패 시(파일 없음, #gd= 공유 링크 접속 등) 조용히 스킵.
// #gd= 공유 링크로 접속한 경우 ensureGalleryLoaded() 결과의 id가 null이므로 currentId도
// null로 전달되며, ui.js가 이를 '공유된 전시 관람 중'으로 처리한다.
function loadGalleryDirectory() {
  fetch('./galleries/index.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((list) => {
      if (!Array.isArray(list)) return;
      const currentId = galleryInfo ? galleryInfo.id : null;
      initGalleryPicker(list, currentId, (id) => {
        window.location.href = './index.html?g=' + id;
      });
    })
    .catch(() => {
      // 디렉터리가 없거나 로드에 실패해도 로비/관람에는 영향 없음
    });
}

// 전역 키 입력 — E(라이트박스) / M(작품 목록) / T(투어) / ←→(투어 이전·다음) / ESC(투어 종료).
// 채팅 입력창 포커스 중에는 ui.js의 입력 핸들러가 keydown을 stopPropagation하므로
// 여기까지 도달하지 않는다.
// 현재 층 판정/안내 — 카메라 y가 어느 층 대역에 있는지 (계단 중간은 아래층 유지)
let currentFloorId = null;
function updateFloorIndicator() {
  if (!entered) return;
  const y = camera.position.y - EYE_HEIGHT;
  let best = null;
  for (const f of BUILDING.floors) {
    if (y >= f.y - 0.9 && (best === null || f.y > best.y)) best = f;
  }
  if (!best) return;
  if (currentFloorId === null) {
    currentFloorId = best.id; // 스폰 층은 조용히 기록
    return;
  }
  if (best.id !== currentFloorId) {
    currentFloorId = best.id;
    setStatus(best.name);
  }
}

// 현재 감상 대상 작품을 라이트박스로 — E키와 터치 '크게 보기' 버튼이 공유하는 진입점.
// 투어 중에는 정차 중인 작품을 그대로 대상으로 삼는다 (감상 포즈는 근접 판정
// 거리보다 살짝 멀 수 있어 직접 지정).
function viewCurrentArtwork() {
  if (!entered || isLightboxOpen()) return;
  const art = tourController.isTouring() ? placedArtworks[tourController.getIndex()] : getNearbyArtwork(camera.position);
  if (!art) return;
  showLightbox(art);
  player.disable();
}

// ---------------------------------------------------------------------------
// SNS 공유 — 포토 모드 (P키 / 터치 독 '캡처' 버튼)
// ---------------------------------------------------------------------------

// 구현은 main-photo.js(createPhotoController)로 이동(3차). 이 함수선언은 호출 지점
// (onCapture·eventsCtx)을 1바이트도 바꾸지 않기 위해 capturePhoto 심볼을 유지하는
// 위임 wrapper다 — 실제 캡처 파이프라인은 photoController.capturePhoto가 담당.
function capturePhoto() {
  photoController.capturePhoto();
}

// 구현은 main-events.js(createEventHandlers)로 이동. 이 함수선언은 keydown 리스너
// 등록 지점을 1바이트도 바꾸지 않기 위해 onKeyDown 심볼을 유지하는 위임 wrapper다
// — 실제 키 분기 로직은 eventHandlers.onKeyDown이 담당.
function onKeyDown(e) {
  eventHandlers.onKeyDown(e);
}

// 작품 목록 카드 클릭 → 트윈 텔레포트. 도착 후 player.setPose로 확정하고,
// 투어 중이 아니면 이동을 재활성화한다. 투어 중이면 투어 인덱스를 선택한
// 작품에 맞춰 갱신하고 머무름 카운트를 새로 시작한다.
function handleArtworkSelect(art) {
  if (!art || !entered) return;
  const pose = getViewingPose(art);
  const wasTouring = tourController.isTouring();
  // 투어 중이면 트윈 "전"에 인덱스·대기상태를 컨트롤러에 동기화(원본 순서 보존).
  if (wasTouring) tourController.syncOnSelect(art);
  startTween(pose, () => {
    player.setPose(pose);
    if (wasTouring) {
      tourController.onArrive(art);
    } else if (entered && !isLightboxOpen()) {
      player.enable();
    }
  });
}

// ---------------------------------------------------------------------------
// 도슨트 투어 오케스트레이션 — 구현은 main-tour.js(createTourController)로 이동(3차).
// 아래 함수선언들은 호출 지점(setTourHandlers·setActionHandlers·eventsCtx의 콜백
// 계약)을 1바이트도 바꾸지 않기 위해 심볼을 유지하는 위임 wrapper다. updateTourBar·
// goToTourIndex·startTour는 외부 호출부가 없어(컨트롤러 내부 전용) 완전히 이동했다.
// ---------------------------------------------------------------------------

function exitTour() {
  tourController.exitTour();
}

function toggleTour() {
  tourController.toggleTour();
}

function tourNext() {
  tourController.next();
}

function tourPrev() {
  tourController.prev();
}

function tourToggleAuto() {
  tourController.toggleAuto();
}

function handleEnter({ nickname, color, char }) {
  myNickname = nickname;
  selfInfo = { nickname, color, char };
  entered = true;
  hideLobby();
  player.enable();

  // 새소리·바람 앰비언트 (사용자 제스처 안에서 시작해야 autoplay 허용됨)
  startAmbient();
  startOnboarding();

  // 전시별 멀티플레이 룸 — 같은 전시 링크로 들어온 사람끼리만 만난다.
  // 디렉터리 전시는 id, 공유 링크(#gd=/#gz=) 전시는 해시 데이터의 djb2 요약을 쓴다.
  const roomSuffix = (galleryInfo && galleryInfo.id) || 'link-' + djb2(window.location.hash || '');
  // mp 생성·콜백 배선·피어 연결은 multiplayerController가 담당(오케스트레이션 이전).
  // 실패 시 false를 반환 — 통계/타이머를 세우지 않고 '혼자 관람 모드'로 안내한다(원본 catch 경로 동치).
  const connected = multiplayerController.connect({
    nickname, color, char, roomId: `${PEER_ROOM_ID}-${roomSuffix}`,
  });
  if (!connected) {
    setStatus('멀티플레이어 연결에 실패했습니다. 혼자 관람 모드로 진행합니다.');
    return;
  }
  // 작가 리포트 — 방문자·인기작(체류) 통계. 전시 키는 룸 suffix와 동일 규약.
  // (mp 오케스트레이션이 아닌 별개 도메인이라 main.js 잔류 — mp 데이터는 getMp()로 읽는다.)
  stats = new GalleryStats(roomSuffix);
  if (statsDwellTimer) clearInterval(statsDwellTimer);
  statsDwellTimer = setInterval(() => {
    const mp = multiplayerController.getMp();
    if (!mp || !stats) return;
    const humans = [];
    for (const [rid, av] of mp.remoteAvatars) {
      if (!rid.startsWith('npc-')) humans.push({ x: av.group.position.x, z: av.group.position.z });
    }
    stats.addDwell(humans, getPlacedArtworks(), 2);
    setGuestbookStats(stats.summary(guestbookNotes.length));
  }, 2000);
}

// 방명록 입력창 제출(ui.js initGuestbook의 onSubmit) — 노트 생성 → 로컬 병합/저장/렌더 →
// 연결돼 있으면 상대에게도 전파.
function handleGuestbookSubmit(text) {
  if (!text) return;
  const note = makeNote(myNickname, text);
  guestbookNotes = mergeNotes(guestbookNotes, [note]);
  saveNotes(gbKey, guestbookNotes);
  setGuestbookNotes(guestbookNotes);
  const mp = multiplayerController.getMp();
  if (mp) {
    try {
      mp.sendGuestbook([note]);
    } catch (err) {
      console.error('방명록 전송 실패:', err);
    }
  }
}

// mp.onGuestbook — 원격(다른 접속자)에서 전파된 노트를 로컬과 병합해 저장/렌더한다.
function handleRemoteGuestbook(notes) {
  guestbookNotes = mergeNotes(guestbookNotes, notes);
  saveNotes(gbKey, guestbookNotes);
  setGuestbookNotes(guestbookNotes);
}

function handleChatSend(text) {
  if (!text) return;
  // 내 메시지는 항상 로컬에 즉시 표시 (원격 에코는 senderId 필터로 차단됨)
  addChatMessage(myNickname, text, true);
  const mp = multiplayerController.getMp();
  if (mp) {
    try {
      mp.sendChat(text);
    } catch (err) {
      console.error('채팅 전송 실패:', err);
      setStatus('채팅 전송에 실패했습니다.');
    }
  }
}

let potatoAccum = 0;

function animate() {
  let delta = clock.getDelta();

  // 포테이토 모드 프레임 캡(~20fps) — 소프트웨어 렌더는 프레임 시간이 널뛰어
  // 입력 지연 체감이 더 나쁘다. 일정한 20fps가 오히려 안정적으로 걸린다.
  // 건너뛴 시간은 누적해 다음 프레임의 delta로 넘긴다(시뮬 시간 보존).
  if (gpuInfo.soft) {
    potatoAccum += delta;
    if (potatoAccum < 0.034) return; // ~30fps 캡 (씬 경량화 후 상향)
    delta = potatoAccum;
    potatoAccum = 0;
  }

  try {
    // 비행 입력 → player.liftOffset 갱신(카메라 y 조립 전에 실행). fly 미탑재면 no-op.
    if (flyController) flyController.update(delta);
    // 이동/회전 (트윈/투어 중에는 player.disable 상태이므로 update는 사실상 no-op)
    player.update(delta);
    // 몸 충돌 — 다른 캐릭터(사람+NPC)를 뚫고 지나가지 못하게 밀어낸다
    const mp = multiplayerController.getMp();
    if (mp) player.resolveBodyCollisions(mp.getAvatarPositions());

    // 카메라 트윈(텔레포트/투어) 갱신 — 별도 루프 없이 기존 animate 루프에 포함
    updateTween(delta);

    // 도슨트 투어 자동진행 — 목적지 도착 후 머무름 중 && 라이트박스가 닫혀 있고
    // 새 트윈이 진행 중이 아닐 때만 카운트한다 (라이트박스 여는 동안 일시정지).
    // 판정식·임계·delta 누적·다음전환 호출은 컨트롤러 tick이 원본과 1바이트 동치로 소유.
    tourController.tick(delta);

    // 나비·새 애니메이션
    sceneTick(delta);

    // 층 이동 안내 — 카메라 y로 현재 층 판정, 바뀔 때 1회 표시
    updateFloorIndicator();

    // 멀티플레이어 (입장 후에만) — 트윈/투어 중에도 카메라 기준으로 계속 전송.
    // mp 생성·null 가드·sendState/update는 컨트롤러 tick이 원본과 동치로 소유(mp=null이면 no-op).
    multiplayerController.tick(delta);

    tickOnboarding();

    // 3인칭 자기 아바타 — 눈 위치/yaw를 발밑 기준으로 반영 + 속도 평활 (컨트롤러 tick 위임)
    selfViewController.tick(delta);

    // 근접 작품 안내 — ui.js가 중복 렌더를 막으므로 매 프레임 호출해도 안전
    const nearby = getNearbyArtwork(camera.position);
    if (nearby) {
      showArtworkInfo(nearby);
    } else {
      hideArtworkInfo();
    }

    // 성능/렌더 거버너 — FPS 집계+저사양 히스테리시스+spec 학습+pixelRatio 라이브 조정,
    // NPC 컬링(2초), 섀도 재베이크+입장 warmup을 perfGovernor.tick이 원본과 1바이트 동치로
    // 소유(4차 A군). render()는 여기서 건드리지 않는다(아래 분기가 그대로 소유).
    perfGovernor.tick(delta);

    if (selfViewController.isThirdPerson() && selfViewController.getSelfAvatar()) {
      selfViewController.applySelfCamOffset();
      renderer.render(scene, camera);
      selfViewController.restoreSelfCamOffset();
    } else {
      renderer.render(scene, camera);
    }
  } catch (err) {
    console.error('렌더 루프 오류:', err);
    renderer.setAnimationLoop(null);
    setStatus('오류가 발생했습니다. 페이지를 새로고침해 주세요.');
  }
}

// 구현은 main-events.js로 이동. resize 리스너 등록 지점을 불변으로 유지하기 위해
// onWindowResize 심볼을 유지하는 위임 wrapper — aspect·setSize 계산은 eventHandlers.onWindowResize가 담당.
function onWindowResize() {
  eventHandlers.onWindowResize();
}

// 페이지 이탈 시 피어 연결 정리 — 등록 지점·횟수·순서 불변, 콜백 구현만 main-events.js로 위임.
// 초기화 극초기 이탈(eventHandlers 미설정) 시 옵셔널 체이닝으로 no-op(원본은 mp=null이라 no-op과 동일).
window.addEventListener('beforeunload', () => {
  eventHandlers?.onBeforeUnload();
});

init().catch((err) => {
  console.error('초기화 실패:', err);
  try {
    setStatus('초기화 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.');
  } catch (_) {
    // ui.js 조차 로드되지 않은 경우 최소한의 안내
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-family:${getCanvasFont()};font-size:16px;text-align:center;">초기화 중 오류가 발생했습니다.<br>페이지를 새로고침해 주세요.</div>`
    );
  }
});
