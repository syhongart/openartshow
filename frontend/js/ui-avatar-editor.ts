// frontend/js/ui-avatar-editor.ts — 아바타(아야모) 편집기 클러스터 (ui.js 분해 C-1 단계3)
// 치비 메이커 모달: 프리뷰 렌더러·자동 연기·카테고리 편집·옷장·저장까지의 편집기 전용
// 코드를 ui.js(→향후 ui-hud)에서 통째로 순수 이동한 것. 로직·값·CSS 클래스 1바이트 무변경.
//
// [순환 차단 = ctx 주입] 편집기는 ui.js(HUD)를 절대 import 하지 않는다. HUD가 필요로
//   하는 것(setStatus·callbacks·els·공유상태)은 createChibiMaker(ctx)로 주입받는다.
//   공유 저장/세션 상태는 중립 leaf ui-chibi-store.js를 직접 import(HUD와 공용).
//   양방향 결합이던 chibiOpen·entered는 ui.js가 소유하는 mutable `uiState`(ctx.state)로
//   풀어, 편집기는 ctx.state.chibiOpen 을 쓰고 HUD는 uiState.chibiOpen 을 읽는다.
//
// [리졸브] vite.config의 .js→.ts 폴백(감독 B안)이 소비자의 확장자 명시 .js import를
//   대응 .ts로 해소하므로, ui.js의 import는 './ui-avatar-editor.js' 그대로 유지한다.

import * as THREE from 'three';
import { createAvatarInstance } from './avatar.js';
import { getProfile as authGetProfile } from './auth.js';
import { el, GOLD } from './ui-dom.js';
import {
  DEFAULT_CHIBI,
  CHIBI_HAIR_STYLES,
  CHIBI_EYE_STYLES,
  CHIBI_MOUTH_STYLES,
  CHIBI_BEARD_STYLES,
  CHIBI_BOTTOM_TYPES,
  CHIBI_ACCESSORIES,
  CHIBI_FACE_SHAPES,
  CHIBI_SPECIES,
  CHIBI_GENDERS,
  CHIBI_TOP_PATTERNS,
  CHIBI_OUTFITS,
  CHIBI_PRESETS,
  CHIBI_PRESET_GROUPS,
  CHIBI_ACTION_DUR,
  SPECIES_PRESET,
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  CHIBI_CLOTH_COLORS,
  encodeChibi,
  normalizeChibi,
} from './chibi.js';
import { setSceneCover } from './render-gate.js';
import { applyPreviewShadowCasters } from './chibi-shadow.js';
import { pickForRandomize, canRandomize } from './random-pick.js';
import {
  LU_CLOSET_MAX,
  currentUserId,
  readActiveChibi,
  readCloset,
  saveCloset,
  saveStoredChibi,
  saveStoredChibiThumb,
  setSessionChibi,
  makeThumbDataUrl,
} from './ui-chibi-store.js';

// ---------------------------------------------------------------------------
// 편집기 전용 상태 — ui.js에서 순수 이동한 모듈 레벨 상태(값 불변).
// chibiOpen·entered 만은 HUD와 공유되므로 ctx.state(uiState)로 분리했다.
// ---------------------------------------------------------------------------
// (구 커스터마이저 잔재 — 현재 미참조지만 순수 이동 원칙상 삭제하지 않고 함께 옮긴다)
let makerActiveTab = 'shape';
let makerRebuildTimer: any = null;    // 파츠 변경 → 프리뷰 재조립 300ms 디바운스
let makerPreviewRAF: number | null = null;
let makerPreviewLastT = 0;
let makerDragging = false;
let makerDragLastX = 0;

// 치비 메이커(#lu-chibi-maker) 모달 상태 — 커스터마이저와 동일 패턴, 탭 없음
let chibiParams: any = null;
let chibiPreviewInstance: any = null;
let chibiPreviewRAF: number | null = null;
let chibiPreviewLastT = 0;
let chibiDragging = false;
let chibiDragLastX = 0;
// 프리뷰 자동 회전: 360도 회전 대신 정면 기준 좌우 스윙 (감독 지시)
let chibiSwingT = 0;
let chibiSwingBase = Math.PI;
const CHIBI_SWING_AMPLITUDE = THREE.MathUtils.degToRad(18); // ±18°
const CHIBI_SWING_SPEED = 0.6; // rad/s, 왕복 주기 ≈10.5초

// ---------------------------------------------------------------------------
// 치비 메이커 모달 — chibi.js(자체 코드 생성기)의 파라미터를 칩/스와치로 편집.
// DCL 커스터마이저와 동일한 모달 CSS(lu-am-*)를 재사용하되 탭 없이 한 화면이다.
// 프리뷰는 createAvatarInstance('chibi:'+JSON)를 그대로 재사용한다.
// 스와치 팔레트(SKIN_TONES/HAIR_COLORS/EYE_COLORS/CHIBI_CLOTH_COLORS)는 chibi.js(SSOT)에서 import.

// (사진→아야모 휴리스틱 분석기는 감독 판단으로 철회 — "색만 맞춰서는 큰 의미가
// 없다". 비전 AI 버전은 백엔드 확보 후 재도전. 구현은 git 이력 b2ff2f3b 참조.)

// 카테고리 내비 아이콘 — 인라인 SVG(외부 에셋 0), currentColor로 탭 색상 상속
// 잎사귀 모티프 — 오리지널 실루엣(눈물방울 잎 + 잎맥 한 줄). 특정 브랜드 아이콘 카피 아님.
const ICON_LEAF = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 19.5C4.5 10 11 4 20 4c0 9-6 15.5-15.5 15.5A1 1 0 0 1 4.5 19.5Z"/><path d="M6.7 17.3C10.2 13.3 14.2 9.3 18 5.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>';
const CHIBI_NAV_CATS = [
  { id: 'species', label: '종족', icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8.3" r="2.1"/><circle cx="12" cy="6.1" r="2.1"/><circle cx="17" cy="8.3" r="2.1"/><path d="M12 11.6c-3.4 0-6.1 2.4-6.1 5.2 0 2 1.8 3.3 3.7 2.6.9-.3 1.7-.3 2.6 0 1.9.7 3.7-.6 3.7-2.6 0-2.8-2.5-5.2-5.9-5.2Z"/></svg>' },
  { id: 'face', label: '얼굴', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><path d="M8.6 14.6c1 1.1 2.1 1.7 3.4 1.7s2.4-.6 3.4-1.7"/></svg>' },
  { id: 'hair', label: '헤어', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12.5C5 8 8.1 4.5 12 4.5s7 3.5 7 8"/><path d="M6.3 12.5v3.2M10.1 12.5v4.2M13.9 12.5v4.2M17.7 12.5v3.2"/></svg>' },
  { id: 'outfit', label: '의상', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8.3 4.2 4.3 7.3l2 3 2-1.1v9.6h7.4V9.2l2 1.1 2-3-4-3.1c-.7 1-1.8 1.6-3.7 1.6s-3-.6-3.7-1.6Z"/></svg>' },
  { id: 'acc', label: '장식', icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.5 3.5 1.7 6.3 5.2 7.6-3.5 1.3-4.7 4.1-5.2 7.6-.5-3.5-1.7-6.3-5.2-7.6C10.3 9.3 11.5 6.5 12 3Z"/><circle cx="19" cy="5.2" r="1.2"/></svg>' },
  { id: 'closet', label: '옷장', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.3"/><path d="M12 5.9v1.8"/><path d="M12 7.7 4.3 13.4h15.4L12 7.7Z"/><path d="M4.3 17.4h15.4"/></svg>' },
];

// ---------------------------------------------------------------------------
// createChibiMaker(ctx) — 편집기 팩토리. ui.js(HUD)가 소유한 것을 ctx로 주입받아
// ui.js를 역참조(import)하지 않고 동작한다(순환 0). 반환 API { open, close }는
// ui.js의 openChibiMaker/closeChibiMaker가 호출한다(기존 인스턴스 API 계약 유지).
//   ctx.els       : HUD DOM 캐시(els.lobby.onChibiSaved 접근용) — 참조 공유
//   ctx.state     : 공유 mutable 상태(uiState) — chibiOpen(편집기가 씀·HUD가 읽음)·entered(HUD가 씀·편집기가 읽음)
//   ctx.callbacks : HUD 콜백 객체(onAvatarChange·onMakerToggle) — 참조 공유
//   ctx.setStatus : HUD 상태표시 함수
// ---------------------------------------------------------------------------
export interface ChibiMakerCtx {
  els: any;
  state: { chibiOpen: boolean; entered: boolean; [k: string]: any };
  callbacks: any;
  setStatus: (text: string) => void;
}

export function createChibiMaker(ctx: ChibiMakerCtx) {
  const { els, state, callbacks, setStatus } = ctx;

  // 상단 액션 — 저장(✓)·닫기(×)를 헤더 한 곳에 통합(감독 지시). 하단 저장 칸을 없애
  // 위아래 분리를 통합, 스크롤 없이 바로 저장·닫기 할 수 있다.
  const saveV = el('button', { id: 'lu-am-save', type: 'button', 'aria-label': '이 캐릭터 사용', title: '이 캐릭터 사용', text: '✓' });
  const closeX = el('button', { id: 'lu-am-close', type: 'button', 'aria-label': '닫기', text: '×' });
  const titleIcon = el('span', { className: 'lu-am-title-icon', 'aria-hidden': 'true' });
  titleIcon.innerHTML = ICON_LEAF;
  const title = el('div', { className: 'lu-am-title' }, [titleIcon, el('span', { text: '캐릭터 디자인' })]);
  const headActions = el('div', { className: 'lu-am-head-actions' }, [saveV, closeX]);
  const head = el('div', { className: 'lu-am-head' }, [title, headActions]);

  // 프리뷰 "무대" — 300×400 백킹 해상도(ensurePreviewRenderer의 setSize와 정합)는 그대로 두고,
  // 바깥 lu-am-preview 프레임을 장식용 여백으로 감싸 게임 캐릭터 크리에이터급 무대감을 낸다.
  const canvas = el('canvas', { width: '300', height: '400' }) as HTMLCanvasElement;
  const stage = el('div', { className: 'lu-am-stage' }, [canvas]);
  // 아바타를 만드는 화면이라 동작 테스트 버튼은 두지 않는다(감독 지시). 대신 캐릭터가
  // 프리뷰 안에서 혼자 신나게 움직인다(자동 연기 — previewFrame 루프에서 랜덤 재생).
  const stageWrap = el('div', { className: 'lu-am-stagewrap' }, [stage]);
  const previewBox = el('div', { className: 'lu-am-preview' }, [stageWrap]);

  // 자동 연기 — 캐릭터가 스스로 밝은 동작을 번갈아 재생한다("혼자 신나게 움직임", 감독
  // 지시). 삐짐·앉기 같은 가라앉는 동작은 빼고 활기찬 것만 고른다. chibiAutoActClock이
  // 0 이하가 되면 랜덤 동작을 재생하고, 동작 길이 + 짧은 휴식만큼 시계를 다시 채운다.
  const CHIBI_AUTO_ACTIONS = ['wave', 'jump', 'clap', 'dance', 'breakdance', 'run', 'jumpingjack', 'heart', 'kick'];
  let chibiAutoActClock = 1.0;


  let previewRenderer: any = null;
  let previewScene: any = null;
  let previewCamera: any = null;
  let previewRotator: any = null;

  // 프리뷰 배경용 세로 그라데이션 텍스처 — 절차 생성(외부 에셋 0, CSP 'self' 준수). 폭 2px로
  // 메모리 최소. NoToneMapping+SRGB 파이프라인이라 colorSpace를 SRGB로 지정해야 딥톤이 밝게 안 뜬다.
  function makePreviewBackdrop(topHex: string, bottomHex: string) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 2; c.height = 256;
    const ctx2d = c.getContext('2d')!;
    const g = ctx2d.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, topHex); g.addColorStop(1, bottomHex);
    ctx2d.fillStyle = g; ctx2d.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // 벽 텍스처 — 톤온톤 세로 줄무늬 벽지(감독 선택 V1 등폭 밴드). 절차 CanvasTexture(외부 에셋 0).
  // non-repeat 큰 캔버스 한 장(벽 전체).
  function makeWallTex(base: string, stripe: string) {
    if (typeof document === 'undefined') return null;
    const w = 512, h = 307, c = document.createElement('canvas'); // 512:307≈벽 plane 10:6 비율(왜곡 방지)
    c.width = w; c.height = h;
    const x = c.getContext('2d')!;
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    const count = 28, period = w / count;   // 세로 밴드 28개(등폭 V1 톤 유지)
    x.fillStyle = stripe;
    for (let i = 0; i < count; i++) x.fillRect(i * period, 0, period / 2, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;                              // repeat 없음(벽 전체 1장)
  }

  function ensurePreviewRenderer() {
    if (previewRenderer) return;
    previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
    previewRenderer.setSize(300, 400, false);
    // 실시간 접지 그림자 — 캐릭터가 자동 연기로 점프·춤을 추면 정적 CSS 그림자는 발과
    // 어긋나 떠 보였다(감독 신고). 저해상도(512) 그림자맵 한 장으로 동작을 따라가는
    // 접지 그림자를 바닥에 실시간으로 뿌린다. 프리뷰는 캐릭터 하나뿐이라 비용이 작다.
    previewRenderer.shadowMap.enabled = true;
    // VSM(분산 그림자맵) — 경계가 딱딱하지 않게 반그림자(penumbra)를 부드럽게 번지게
    // 한다(감독 지시). radius/blurSamples로 흐림 정도를 준다. 접지 그림자에 적합.
    previewRenderer.shadowMap.type = THREE.VSMShadowMap;
    // 정직한 색 프리뷰 — 스와치에서 고른 피부/옷색이 실제로 그 색으로 보이게.
    // (기존 ACES+강한 웜은 어두운 톤을 주황으로 클리핑시켜 팔레트와 어긋났음)
    previewRenderer.toneMapping = THREE.NoToneMapping;
    previewRenderer.toneMappingExposure = 1.0;
    previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    previewScene = new THREE.Scene();
    // 방 배경 — 벽지 벽 뒤/위쪽 여백을 채우는 웜 라이트 그라데(위 밝게→아래 벽 톤). 벽지 방으로
    // 액자 안을 "다른 공간"으로 만든다(감독 지시). 텍스처는 절차 생성(외부 에셋 0, CSP 'self').
    previewScene.background = makePreviewBackdrop('#f0ead9', '#ddd2bd') || new THREE.Color('#ddd2bd');
    // 포그(벽 베이스 근사색)로 바닥·벽 원경을 배경색으로 녹여 이음매를 없앤다. near 5.5는 캐릭터
    // (카메라 거리 ≈4.1) 뒤에서 시작해 본체는 안 잠긴다. 배경 텍스처는 포그 무관.
    previewScene.fog = new THREE.Fog(0xded3bf, 5.5, 10);
    // 프레이밍 — 발이 프레임 바닥(화면 세로 89%)을 딛고, 하트머리 정점(≈1.59m)도
    // 담기게 잡는다. lookAt.y를 0.85로 올려 캐릭터를 화면 아래로 내려 "바닥에 선"
    // 구도를 만든다(구 lookAt 0.64는 발이 세로 80%에 떠 발밑 여백이 넓어 공중부양처럼
    // 보였다 — 감독 신고). FK 투영 실측으로 발 89%/하트머리 상단 15.5%/정장머리 27%
    // 를 만족하는 (dist 4.0, camY 1.0, lookAtY 0.85) 조합 확정.
    previewCamera = new THREE.PerspectiveCamera(30, 300 / 400, 0.1, 20);
    previewCamera.position.set(0, 1.0, 4.0);
    previewCamera.lookAt(0, 0.85, 0);
    // 채도 살린 스튜디오 조명 — 회색 앰비언트를 어둡게 낮춰 색이 바래지 않게 하고,
    // 흰 키라이트로 앞면을 채워 고른 색이 선명하게 그대로 나온다(감독 'B' 확정).
    previewScene.add(new THREE.HemisphereLight(0xfffaf4, 0x241f18, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(0.7, 2.0, 2.6);
    previewScene.add(key);
    const fill = new THREE.DirectionalLight(0xfffdf8, 0.4);
    fill.position.set(-1.8, 1.1, 1.6);
    previewScene.add(fill);
    // 그림자 전용 라이트 — 거의 수직 위에서 내려 발밑에 접지 그림자를 만든다. 빛 기여는
    // 0(캐릭터 색·음영은 위 조명이 담당, 감독 'B' 확정 유지)이고 그림자맵만 생성한다.
    const shadowLight = new THREE.DirectionalLight(0xffffff, 0.0);
    shadowLight.position.set(0.4, 5, 1.0);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(512, 512); // 저해상도 + 큰 blur라야 penumbra가 넓게 번진다
    shadowLight.shadow.camera.near = 0.5;
    shadowLight.shadow.camera.far = 9;
    shadowLight.shadow.camera.left = -1.3;
    shadowLight.shadow.camera.right = 1.3;
    shadowLight.shadow.camera.top = 1.3;
    shadowLight.shadow.camera.bottom = -1.3;
    shadowLight.shadow.radius = 35;        // 반그림자 흐림 크게 — 경계를 더 부드럽게(감독 재요청)
    shadowLight.shadow.blurSamples = 24;   // VSM 흐림 표본 수(큰 반경에 맞춰 늘림)
    shadowLight.shadow.bias = -0.0005;     // VSM은 acne가 적어 작은 바이어스로 충분
    previewScene.add(shadowLight);
    previewScene.add(shadowLight.target); // target 기본 (0,0,0) — 캐릭터 발밑을 향함
    // 우드 바닥(발 최하단 y≈0) — 벽지 웜샌드와 동계. 무광이라 하이라이트 없이 매트한 방 바닥.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshStandardMaterial({ color: 0xb9a06f, roughness: 0.9, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    previewScene.add(ground);
    // 그림자 캐처 — 불투명 바닥은 그림자 라이트 intensity 0이라 그림자가 안 진다(그림자계수×0=0).
    // ShadowMaterial은 라이트 세기를 무시하고 커버리지×opacity로만 칠하므로 intensity 0으로도
    // 접지 그림자가 우드 바닥 위에 다시 뜬다(조명 'B' 무변경 원칙 유지). y 오프셋+polygonOffset으로 z-fighting 회피.
    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.ShadowMaterial({ opacity: 0.3 }),
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = 0.002;
    shadowCatcher.material.polygonOffset = true;
    shadowCatcher.material.polygonOffsetFactor = -1;
    shadowCatcher.receiveShadow = true;
    previewScene.add(shadowCatcher);
    // 뒤 벽 — 톤온톤 세로 줄무늬 벽지(감독 선택 V1). PlaneGeometry 법선이 +Z(카메라 방향)라 회전 불필요.
    const wallpaperTex = makeWallTex('#e2d7bf', '#efe7d3');
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 6),
      new THREE.MeshStandardMaterial({ map: wallpaperTex, roughness: 0.9, metalness: 0 }),
    );
    wall.position.set(0, 2.2, -2.3);
    previewScene.add(wall);
    previewRotator = new THREE.Group();
    // 치비는 +Z 저작 + π 래퍼로 -Z를 본다 — 카메라(+Z)에서 정면이 보이게 π 시작
    previewRotator.rotation.y = Math.PI;
    previewScene.add(previewRotator);
  }

  // 카테고리 내비 — 종족·얼굴·헤어·의상·장식·옷장 섹션 전환(스크롤 지옥 대신 탭 전환)
  let activeCat = 'species';
  const nav = el('div', { className: 'lu-am-nav', role: 'tablist', 'aria-label': '캐릭터 디자인 카테고리' });
  const panel = el('div', { className: 'lu-am-panel' });
  const page = el('div', { className: 'lu-am-tabpage', id: 'lu-am-tabpanel', role: 'tabpanel', tabindex: '0' });
  panel.appendChild(nav);
  panel.appendChild(page);
  // WAI-ARIA tablist 로빙 — ←/→(및 Home/End)로 탭 포커스·활성 이동.
  nav.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = [...nav.querySelectorAll<HTMLElement>('.lu-am-navtab')];
    if (!tabs.length) return;
    const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    let next = cur < 0 ? 0 : cur;
    if (e.key === 'ArrowLeft') next = (cur - 1 + tabs.length) % tabs.length;
    else if (e.key === 'ArrowRight') next = (cur + 1) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    e.preventDefault();
    tabs[next].click();      // 활성 탭 전환(renderNav가 aria-selected·tabindex 갱신)
    const after = nav.querySelectorAll<HTMLElement>('.lu-am-navtab')[next];
    if (after) after.focus();
  });
  const body = el('div', { className: 'lu-am-body' }, [previewBox, panel]);

  // 하단 저장 칸(닫기/저장 버튼 + 회원가입 게이트)은 제거 — 저장·닫기는 상단 헤더(✓/×)로
  // 통합, 회원가입 유도는 캐릭터 화면에서 빼 로비 등으로 옮긴다(감독 지시).
  const card = el('div', { className: 'lu-am-card' }, [head, body]);
  const overlay = el('div', { id: 'lu-chibi-maker', className: 'lu' }, [card]);
  document.body.appendChild(overlay);


  // ── 프리뷰 재조립 지연 ────────────────────────────────────────────────────
  //   칩·스와치를 누르면 원래 이 순서였다: rebuildPreview() → renderPanel().
  //   즉 **캐릭터 45개 메시를 통째로 해체하고 다시 만든 뒤에야** "선택됨" 표시가 그려졌다.
  //   실측 47.9ms — 탭 전환(최대 9.1ms)보다 5~10배 무겁고, 60fps 예산 16.6ms 의 세 배다.
  //
  //   순서를 뒤집고 재조립을 다음 프레임으로 미룬다. 누른 즉시 그려지는 것은 선택 표시
  //   (사용자가 "눌렸다"를 확인하는 신호)이고, 캐릭터가 조금 뒤에 바뀌는 것은 눈에
  //   띄지 않는다 — 반대 순서는 눈에 띄었다.
  //
  //   **정확히는 두 프레임 뒤다**(≈33ms, 검수관 지적). `previewFrame` 은 콜백 맨 앞에서
  //   자기를 재등록하므로, 프레임 N 에서 예약하면 N+1 의 rAF 큐에는 `previewFrame` 이
  //   재조립 콜백보다 **먼저** 들어간다 → N+1 은 옛 캐릭터를 그리고 새 캐릭터는 N+2 에
  //   보인다. 47.9ms 를 즉시 반환하는 것과 맞바꾼 값이라 채택은 유효하지만, "한 프레임"
  //   이라고 적으면 다음 사람이 재조립 지연을 실제보다 싸게 계산한다.
  //
  //   연타는 프레임당 1회로 합쳐진다(코얼레스). 색을 훑듯이 연달아 누를 때 예전에는
  //   누른 횟수만큼 재조립했다.
  let rebuildRAF: number | null = null;

  /** 다음 프레임에 프리뷰를 재조립한다. 이미 예약돼 있으면 합친다. */
  function scheduleRebuild() {
    if (rebuildRAF !== null) return;
    rebuildRAF = requestAnimationFrame(() => { rebuildRAF = null; rebuildPreview(); });
  }

  /**
   * 예약된 재조립을 지금 당장 실행한다.
   *
   * 지연이 만드는 유일한 위험이 여기 있다 — **예약이 남은 채로 화면을 읽으면 옛 모습이
   * 찍힌다.** 그래서 프리뷰 픽셀을 읽는 자리(snapshotThumb)에서 반드시 먼저 부른다.
   * 저장 버튼을 누른 순간의 썸네일이 방금 고른 색과 다른 것은 사용자가 바로 알아챈다.
   */
  function flushRebuild() {
    if (rebuildRAF === null) return;
    cancelAnimationFrame(rebuildRAF);
    rebuildRAF = null;
    rebuildPreview();
  }

  /** 예약을 버린다(재조립하지 않는다). 편집기를 닫을 때 — 아래 close() 주석 참조. */
  function cancelRebuild() {
    if (rebuildRAF === null) return;
    cancelAnimationFrame(rebuildRAF);
    rebuildRAF = null;
  }

  // ── 탭 재클릭 랜덤 ─────────────────────────────────────────────────────────
  //   감독 요청 2026-08-07: *"한번누르면 밑에서 사람이 선택할수있고. 반면에 또 누르면
  //   그 카테고리안에서 랜덤으로 선택되는거였어."*
  //
  //   즉 하단 탭이 두 가지 일을 한다 — **처음 누르면 펴고, 이미 펴진 것을 또 누르면
  //   굴린다.** 그 전까지 같은 탭 재클릭은 `return` 으로 버려지고 있었다(renderNav).
  //
  //   대상 목록을 따로 적지 않는다. `renderPanel` 이 줄을 그리면서 여기에 쌓으므로
  //   **화면에 보이는 것이 곧 랜덤 대상**이다. 카테고리별 키 목록을 상수로 두면
  //   `renderPanel` 의 분기(동물이면 성별·헤어 줄이 사라진다)와 값 미러링이 생기고,
  //   한쪽만 고쳐도 아무도 모른다 — 이 저장소가 반복해 데인 형태다.
  let randomTargets: Array<{ key: string; pick: () => any }> = [];

  /**
   * 파라미터 하나를 적용한다(렌더는 하지 않는다).
   * `setParam`(한 개 즉시 반영)과 카테고리 랜덤(여러 개 모아서 한 번 렌더)이 **같은 규칙**을
   * 쓰도록 분리했다 — 종족 팔레트 연동 같은 규칙이 한쪽에만 적용되면 랜덤 결과만 어색해진다.
   */
  function applyParam(key: string, value: any) {
    chibiParams[key] = value;
    // 종족을 동물로 바꾸면 그 종족 기본 팔레트(털색·포인트색)를 함께 적용 — 사람 피부색이
    // 동물에 남아 어색해지는 걸 방지.
    if (key === 'species' && value !== 'human' && (SPECIES_PRESET as any)[value]) {
      Object.assign(chibiParams, (SPECIES_PRESET as any)[value]);
    }
  }

  function setParam(key: string, value: any) {
    if (!chibiParams) return;
    applyParam(key, value);
    chibiParams = normalizeChibi(chibiParams);
    renderPanel();      // 선택 표시부터 — 이게 사용자가 기다리는 피드백이다
    scheduleRebuild();  // 45메시 재조립은 다음 프레임
  }

  /**
   * 지금 펼쳐진 카테고리를 통째로 굴린다.
   *
   * 대상이 하나도 없으면(옷장 탭 등) 아무 일도 하지 않는다 — 탭을 두 번 눌렀는데 화면이
   * 바뀌지 않는 것은 그 탭에 굴릴 것이 없다는 뜻이고, 그게 맞는 동작이다.
   */
  function randomizeActiveCategory() {
    if (!chibiParams || !randomTargets.length) return;
    // pick 은 **적용 시점의** 현재값을 읽는다(pickForRandomize 가 그것을 후보에서 뺀다).
    // 앞선 적용이 뒤 항목의 현재값을 바꿀 수 있는데(종족→팔레트), 그건 의도된 연쇄다.
    //
    // 알려진 예외 하나(검수관 확인, 영향 없음): 사람 상태로 그려진 화면에서 굴릴 때
    // `gender` 가 대상에 들어가는데, 같은 굴림에서 종족이 동물로 뽑혀도 순서상 그 값이
    // 그대로 적용된다. `normalizeChibi` 는 화이트리스트 방식이라 species 조건부 필드를
    // 지우지 않으므로 상태에 남는다 — 동물에는 성별 UI 가 없어 화면에는 안 나타나고,
    // 다시 사람으로 돌아오면 그 값이 보인다. **"화면 = 랜덤 대상" 원칙의 완전한 예외는
    // 아니고**(그리는 시점엔 실제로 화면에 있었다) 굴림 도중 화면이 바뀌는 데서 온다.
    for (const t of randomTargets) applyParam(t.key, t.pick());
    chibiParams = normalizeChibi(chibiParams);
    renderPanel();
    scheduleRebuild();
  }

  // 프리셋 적용 — 완성 룩을 통째로 로드해 시작점으로. 이후 세부 커스터마이즈 가능.
  function applyPreset(look: any) {
    chibiParams = normalizeChibi(Object.assign({}, look));
    renderPanel();
    scheduleRebuild();
  }

  function presetRow() {
    // 카테고리 섹션 렌더 — 56장 평면 나열은 훑기 어렵다는 감독 피드백으로
    // CHIBI_PRESET_GROUPS(chibi.js SSOT) 순서대로 소제목 + wrap 행을 그린다.
    // cat 미지정 프리셋은 'human'으로 귀속(신규 필드 하위호환).
    for (const grp of CHIBI_PRESET_GROUPS) {
      const items = CHIBI_PRESETS.filter((pre: any) => (pre.cat || 'human') === grp.id);
      if (!items.length) continue;
      page.appendChild(el('div', { className: 'lu-am-section-title', text: `${grp.name} (${items.length})` }));
      const row = el('div', { className: 'lu-am-tabs lu-am-presets' });
      for (const pre of items) {
        const btn = el('button', { type: 'button', className: 'lu-am-tab lu-am-preset' });
        const c1 = pre.look.skin || DEFAULT_CHIBI.skin;
        const c2 = pre.look.top || pre.look.hairColor || DEFAULT_CHIBI.top;
        const dot = el('span', { className: 'lu-am-preset-dot', 'aria-hidden': 'true' });
        dot.style.background = `conic-gradient(${c1} 0deg 180deg, ${c2} 180deg 360deg)`;
        btn.appendChild(dot);
        btn.appendChild(el('span', { className: 'lu-am-preset-label', text: pre.name }));
        btn.addEventListener('click', () => applyPreset(pre.look));
        row.appendChild(btn);
      }
      page.appendChild(row);
    }
  }

  // 종족 한글 라벨 — 옷장 슬롯 자동 이름에 사용.
  function speciesLabel(id: string) {
    const s = CHIBI_SPECIES.find((x: any) => x.id === id);
    return (s && s.name) || '아야모';
  }

  // 내 옷장 — 로그인 사용자 전용. 지금 모습을 여러 벌 저장/불러오기/삭제.
  function closetRow() {
    if (!authGetProfile()) return; // 옷장은 로그인 사용자만
    const uid = currentUserId();
    groupTitle('내 옷장');

    const saveNew = el('button', {
      type: 'button', className: 'lu-am-btn lu-closet-save', text: '＋ 지금 모습 옷장에 저장',
    });
    saveNew.addEventListener('click', () => {
      const list = readCloset(uid);
      if (list.length >= LU_CLOSET_MAX) {
        setStatus(`옷장은 최대 ${LU_CLOSET_MAX}벌까지 저장할 수 있어요`);
        return;
      }
      const slot = {
        id: 'c' + Date.now(),
        name: speciesLabel(chibiParams.species),
        look: JSON.parse(JSON.stringify(chibiParams)),
        thumb: snapshotThumb(120, 160),
        ts: Date.now(),
      };
      list.push(slot);
      if (!saveCloset(list, uid)) {
        setStatus('저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요');
        return;
      }
      renderPanel();
    });
    page.appendChild(saveNew);

    const list = readCloset(uid);
    if (!list.length) {
      page.appendChild(el('div', { className: 'lu-closet-empty', text: '아직 저장한 옷이 없어요. 마음에 드는 모습을 저장해 두세요.' }));
      return;
    }
    const grid = el('div', { className: 'lu-closet-grid' });
    list.forEach((slot: any) => {
      const cell = el('div', { className: 'lu-closet-cell' });
      const load = el('button', {
        type: 'button', className: 'lu-closet-load', title: `${slot.name} 불러오기`, 'aria-label': `${slot.name} 불러오기`,
      });
      if (slot.thumb) load.style.backgroundImage = `url('${slot.thumb}')`;
      load.appendChild(el('span', { className: 'lu-closet-name', text: slot.name }));
      load.addEventListener('click', () => applyPreset(slot.look));
      const del = el('button', {
        type: 'button', className: 'lu-closet-del', text: '×', title: '삭제', 'aria-label': `${slot.name} 삭제`,
      });
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = readCloset(uid).filter((s: any) => s.id !== slot.id);
        saveCloset(next, uid);
        renderPanel();
      });
      cell.appendChild(load);
      cell.appendChild(del);
      grid.appendChild(cell);
    });
    page.appendChild(grid);
  }

  const boolOpts = (a: string, b: string) => [{ id: false, name: a }, { id: true, name: b }];

  function chipRow(labelText: string, options: any[], key: string) {
    page.appendChild(el('div', { className: 'lu-am-section-title', text: labelText }));
    // [탭 재클릭 랜덤] 지금 화면에 그려진 줄만 랜덤 대상이 된다 — 아래 randomTargets 주석.
    if (canRandomize(options.length)) {
      randomTargets.push({ key, pick: () => pickForRandomize(options.map((o) => o.id), chibiParams[key]) });
    }
    const row = el('div', { className: 'lu-am-tabs' });
    options.forEach((opt) => {
      const btn = el('button', {
        type: 'button',
        className: 'lu-am-tab' + (chibiParams[key] === opt.id ? ' lu-selected' : ''),
        text: opt.name,
      });
      btn.addEventListener('click', () => setParam(key, opt.id));
      row.appendChild(btn);
    });
    page.appendChild(row);
  }

  function swatchRow(labelText: string, palette: string[], key: string) {
    page.appendChild(el('div', { className: 'lu-am-section-title', text: labelText }));
    if (canRandomize(palette.length)) {
      randomTargets.push({ key, pick: () => pickForRandomize(palette, chibiParams[key]) });
    }
    const row = el('div', { className: 'lu-swatches' });
    palette.forEach((hex) => {
      const swatch = el('button', {
        type: 'button',
        className: 'lu-swatch' + (chibiParams[key] === hex ? ' lu-selected' : ''),
        style: `background:${hex};`,
        title: hex,
        'aria-label': `${labelText} ${hex}`,
      });
      swatch.addEventListener('click', () => setParam(key, hex));
      row.appendChild(swatch);
    });
    page.appendChild(row);
  }

  function groupTitle(text: string) {
    const row = el('div', { className: 'lu-am-group-title' });
    const icon = el('span', { className: 'lu-am-group-icon', 'aria-hidden': 'true' });
    icon.innerHTML = ICON_LEAF;
    row.appendChild(icon);
    row.appendChild(el('span', { text }));
    page.appendChild(row);
  }

  // 카테고리 내비 재구성 — 매 렌더마다 새로 그리되(기존 전체-리렌더 패턴과 동일 비용),
  // 로그인 여부에 따라 옷장 탭 노출을 즉시 반영한다.
  function renderNav() {
    nav.textContent = '';
    const showCloset = !!authGetProfile();
    const cats = CHIBI_NAV_CATS.filter((c) => c.id !== 'closet' || showCloset);
    if (!cats.some((c) => c.id === activeCat)) activeCat = 'species';
    cats.forEach((cat) => {
      const selected = activeCat === cat.id;
      const btn = el('button', {
        type: 'button',
        role: 'tab',
        id: 'lu-am-tab-' + cat.id,
        className: 'lu-am-navtab' + (selected ? ' lu-selected' : ''),
        'aria-selected': selected ? 'true' : 'false',
        'aria-controls': 'lu-am-tabpanel',
        tabindex: selected ? '0' : '-1',   // 로빙 탭인덱스 — 선택 탭만 Tab 포커스 대상
        // 선택된 탭은 "다시 누르면 랜덤"이 된다. 눈에 보이는 표시가 없는 기능이라
        // 최소한 접근성 이름과 툴팁에는 적어 둔다.
        'aria-label': selected ? `${cat.label} — 다시 누르면 랜덤으로 바뀝니다` : cat.label,
        title: selected ? '다시 누르면 랜덤으로 바뀌어요' : cat.label,
      });
      btn.innerHTML = cat.icon;
      btn.appendChild(el('span', { className: 'lu-am-navtab-label', text: cat.label }));
      btn.addEventListener('click', () => {
        // [탭 재클릭 랜덤] 이미 펴진 탭을 또 누르면 그 카테고리를 굴린다(감독 요청).
        // 그 전까지 이 자리는 그냥 `return` 이라 두 번째 클릭이 버려지고 있었다.
        if (activeCat === cat.id) {
          randomizeActiveCategory();
          return;
        }
        activeCat = cat.id;
        renderPanel();
        page.scrollTop = 0;
      });
      nav.appendChild(btn);
    });
    page.setAttribute('aria-labelledby', 'lu-am-tab-' + activeCat); // 패널 ↔ 활성 탭 연결
  }

  function renderPanel() {
    renderNav();
    page.textContent = '';
    randomTargets = []; // 이번에 그리는 줄들이 다시 채운다(화면 = 랜덤 대상)
    if (!chibiParams) return;
    const isAnimal = chibiParams.species && chibiParams.species !== 'human';

    if (activeCat === 'species') {
      // 프리셋(빠른 시작)을 맨 위에 둔다 — 감독 지시. 피부/털색은 "몸" 속성이라
      // 종족과 같은 탭에 둬 얼굴 탭 6줄 세로 넘침을 해소한다(감독 보고: 얼굴 탭
      // 피부색 줄이 아래에 끼여 잘림).
      presetRow();
      groupTitle(isAnimal ? '종족 · 털색' : '종족 · 성별 · 피부색');
      chipRow('종족', CHIBI_SPECIES, 'species');
      if (!isAnimal) chipRow('성별', CHIBI_GENDERS, 'gender');
      swatchRow(isAnimal ? '털 색' : '피부색', SKIN_TONES, 'skin');
    } else if (activeCat === 'face') {
      groupTitle('얼굴');
      chipRow('얼굴형', CHIBI_FACE_SHAPES, 'face');
      chipRow('눈', CHIBI_EYE_STYLES, 'eyeStyle');
      chipRow('입', CHIBI_MOUTH_STYLES, 'mouth');
      if (!isAnimal) chipRow('수염', CHIBI_BEARD_STYLES, 'beardStyle'); // 사람 전용
      chipRow('볼터치', boolOpts('없음', '있음'), 'blush');
      swatchRow('눈동자 색', EYE_COLORS, 'eyeColor');
    } else if (activeCat === 'hair') {
      if (!isAnimal) {
        groupTitle('헤어');
        chipRow('헤어', CHIBI_HAIR_STYLES, 'hairStyle');
        swatchRow('머리 색', HAIR_COLORS, 'hairColor');
      } else {
        groupTitle('포인트');
        swatchRow('귀·꼬리 색', HAIR_COLORS, 'hairColor');
      }
    } else if (activeCat === 'outfit') {
      groupTitle('의상');
      chipRow('상의 패턴', CHIBI_TOP_PATTERNS, 'pattern');
      chipRow('의상 세트', CHIBI_OUTFITS, 'outfit');
      chipRow('하의', CHIBI_BOTTOM_TYPES, 'bottomType');
      swatchRow('상의 색', CHIBI_CLOTH_COLORS, 'top');
      swatchRow('하의 색', CHIBI_CLOTH_COLORS, 'bottom');
      swatchRow('신발 색', CHIBI_CLOTH_COLORS, 'shoes');
    } else if (activeCat === 'acc') {
      groupTitle('장식');
      chipRow('머리 장식', CHIBI_ACCESSORIES, 'acc');
      chipRow('안경', boolOpts('없음', '착용'), 'glasses');
      chipRow('헤일로', boolOpts('없음', '있음'), 'halo');
      chipRow('날개', boolOpts('없음', '있음'), 'wings');
      chipRow('가슴 하트', boolOpts('없음', '있음'), 'heart');
    } else if (activeCat === 'closet') {
      closetRow();
    }
  }

  // 치비 조립은 동기·저비용이라 디바운스 없이 즉시 재조립한다
  function rebuildPreview() {
    if (!chibiParams || !previewRotator) return;
    if (chibiPreviewInstance) {
      previewRotator.remove(chibiPreviewInstance.group);
      chibiPreviewInstance.dispose();
      chibiPreviewInstance = null;
    }
    // blobShadow:false — 수평 원판 그림자는 프리뷰의 얕은 카메라에서 발에 겹쳐 보였다
    // (감독 신고). 대신 실시간 그림자맵으로 바닥에 접지 그림자를 뿌린다(ensurePreviewRenderer).
    chibiPreviewInstance = createAvatarInstance(encodeChibi(chibiParams), GOLD, ' ', { blobShadow: false });
    // 캐릭터 메쉬가 그림자를 드리우게 한다(그림자맵에 렌더될 대상). 재조립마다 새 그룹이라 매번.
    // **전부** 켜지 않는다 — 아웃라인 셸은 원본을 감싼 복제본이라 그림자에 기여할 수
    // 없다. 판정·수치·기각된 대안은 chibi-shadow.ts 한 곳이다(여기에 다시 적지 않는다).
    applyPreviewShadowCasters(chibiPreviewInstance.group);
    previewRotator.add(chibiPreviewInstance.group);
  }

  function previewFrame(t: number) {
    chibiPreviewRAF = requestAnimationFrame(previewFrame);
    // raw = 실제 경과(벽시계, 초). delta는 애니 진행용으로만 캡한다(큰 프레임드랍 시
    // 위상이 한 번에 너무 많이 튀는 것 방지). 프리뷰는 물리 관성이 없어 캡을 0.1까지
    // 완화해도 안전하고, 저프레임 기기에서 동작이 과하게 느려지지 않는다.
    const raw = chibiPreviewLastT ? (t - chibiPreviewLastT) / 1000 : 0;
    const delta = Math.min(0.1, raw);
    chibiPreviewLastT = t;
    if (!chibiDragging) {
      chibiSwingT += delta;
      previewRotator.rotation.y = chibiSwingBase + Math.sin(chibiSwingT * CHIBI_SWING_SPEED) * CHIBI_SWING_AMPLITUDE;
      // 자동 연기 — 드래그로 돌려보는 중이 아닐 때만. 다음 동작 시점은 벽시계(raw)로 세어
      // 저프레임에서도 제때 트리거된다. 한 동작이 끝나면 잠깐 쉬고 다음 랜덤 동작.
      chibiAutoActClock -= raw;
      if (chibiAutoActClock <= 0 && chibiPreviewInstance && typeof chibiPreviewInstance.playAction === 'function') {
        const name = CHIBI_AUTO_ACTIONS[Math.floor(Math.random() * CHIBI_AUTO_ACTIONS.length)];
        chibiPreviewInstance.playAction(name);
        chibiAutoActClock = ((CHIBI_ACTION_DUR as any)[name] || 1.5) + 0.6 + Math.random() * 0.9;
      }
    }
    if (chibiPreviewInstance) chibiPreviewInstance.update(delta, 0);
    previewRenderer.render(previewScene, previewCamera);
  }
  function startLoop() {
    if (chibiPreviewRAF) return;
    chibiPreviewLastT = 0;
    chibiPreviewRAF = requestAnimationFrame(previewFrame);
  }
  function stopLoop() {
    if (chibiPreviewRAF) cancelAnimationFrame(chibiPreviewRAF);
    chibiPreviewRAF = null;
  }

  // 드래그 회전 — 포인터 캡처로 카드 밖 드래그도 추적
  canvas.addEventListener('pointerdown', (e) => {
    chibiDragging = true;
    chibiDragLastX = e.clientX;
    previewBox.classList.add('lu-dragging');
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!chibiDragging) return;
    previewRotator.rotation.y += (e.clientX - chibiDragLastX) * 0.012;
    chibiDragLastX = e.clientX;
  });
  const endDrag = () => {
    chibiDragging = false;
    previewBox.classList.remove('lu-dragging');
    // 멈춘 각도에서 끊김 없이 좌우 스윙 재개 (sin(0)=0)
    chibiSwingBase = previewRotator.rotation.y;
    chibiSwingT = 0;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  closeX.addEventListener('click', () => close());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  // 현재 프리뷰를 렌더 직후 스냅샷해 축소 썸네일(dataURL)을 만든다.
  // preserveDrawingBuffer:false 대응 — 같은 태스크 안에서 렌더 직후 읽어야 유효.
  function snapshotThumb(w: number, h: number) {
    try {
      if (!previewRenderer) return '';
      flushRebuild(); // 예약된 재조립이 남아 있으면 **한 수 전 모습**이 찍힌다
      previewRenderer.render(previewScene, previewCamera);
      return makeThumbDataUrl(canvas, w, h) || previewRenderer.domElement.toDataURL('image/png');
    } catch (_) { return ''; }
  }

  // 로그인 여부에 따라 상단 저장(✓) 버튼의 접근성 라벨을 갱신한다(로그인=계정 저장, 게스트=세션 적용).
  function syncSaveGate() {
    const loggedIn = !!authGetProfile();
    const label = loggedIn ? '저장하고 사용' : '이 캐릭터 사용';
    saveV.setAttribute('aria-label', label);
    saveV.title = label;
  }

  saveV.addEventListener('click', () => {
    if (!chibiParams) return;
    const look = JSON.parse(JSON.stringify(chibiParams));
    setSessionChibi(look);                     // 항상 이번 세션에 적용(게스트 포함)
    const loggedIn = !!authGetProfile();
    if (loggedIn) {
      const ok = saveStoredChibi(look);        // 계정(유저 네임스페이스)에 저장
      const thumb = snapshotThumb(150, 200);
      if (thumb) saveStoredChibiThumb(thumb);
      if (!ok) setStatus('저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요');
    }
    if (els && els.lobby) els.lobby.onChibiSaved();
    // 입장 후 편집이면 월드의 내 아바타에도 즉시 반영(+멀티플레이 전파)
    if (state.entered && typeof callbacks.onAvatarChange === 'function') {
      callbacks.onAvatarChange(encodeChibi(look));
    }
    // 게스트 안내는 마지막에(성공 토스트에 가려지지 않게)
    if (!loggedIn) setStatus('이 캐릭터로 적용했어요 · 회원가입하면 저장돼요');
    close();
  });

  function open() {
    activeCat = 'species'; // 새로 열 때는 항상 첫 카테고리(종족)부터 — 이전 탭 유지 방지
    chibiParams = normalizeChibi(Object.assign({}, DEFAULT_CHIBI, readActiveChibi() || {}));
    syncSaveGate(); // 로그인 여부에 따라 저장/회원가입 버튼 상태 갱신
    ensurePreviewRenderer();
    previewRotator.rotation.y = Math.PI; // 정면(카메라 쪽)부터 — 얼굴을 꾸미는 화면이므로
    chibiSwingBase = Math.PI; chibiSwingT = 0;
    chibiAutoActClock = 1.0; // 열고 잠깐 뒤 첫 동작(자동 연기)
    rebuildPreview();
    renderPanel();
    overlay.classList.add('lu-open');
    state.chibiOpen = true;
    // [오버레이 렌더 스킵] 이 편집기는 전체화면(position:fixed; inset:0)이라 뒤의 3D
    // 씬은 보이지 않는다 — 그동안 그리지 않는다. 근거·실측·경계는 render-gate.ts 머리말.
    //
    // 왜 main.js 의 onMakerToggle 이 아니라 여기인가: ① main.js 는 보호파일(라이브 미술관
    // 서비스 중)이고 ② 그 콜백은 `if (!entered) return` 뒤에 있어 **로비에서 연 편집기에는
    // 안 걸린다** — 캐릭터를 먼저 꾸미고 입장하는 순서가 오히려 흔하다. 편집기가 자기
    // 상태를 직접 선언하면 두 문제가 같이 없어진다.
    setSceneCover('chibi-maker', true);
    startLoop();
    // 입장 후 편집이면 모달이 화면을 덮는 동안 플레이어 이동·포인터락을 멈춘다
    // (라이트박스/투어와 동일한 확립된 패턴). 로비에서는 이미 비활성이라 main.js가 무시.
    if (typeof callbacks.onMakerToggle === 'function') callbacks.onMakerToggle(true);
  }
  function close() {
    overlay.classList.remove('lu-open');
    state.chibiOpen = false;
    // 반드시 걷는다 — 안 걷으면 미술관이 멈춘 채로 남는다. close()는 ✓(저장)·×(닫기)·
    // ESC 가 모두 지나는 단일 지점이라 여기 한 곳이면 충분하다(경로가 늘면 여기로 모아라).
    setSceneCover('chibi-maker', false);
    stopLoop();
    // 예약된 재조립을 **버린다**(flush 가 아니다). 남겨두면 아래에서 dispose 한 직후에
    // 콜백이 깨어나 새 인스턴스를 만들어 rotator 에 붙인다 — 닫힌 편집기에 캐릭터가
    // 매달린 채 남는 누수다.
    cancelRebuild();
    if (chibiPreviewInstance) {
      previewRotator.remove(chibiPreviewInstance.group);
      chibiPreviewInstance.dispose();
      chibiPreviewInstance = null;
    }
    if (typeof callbacks.onMakerToggle === 'function') callbacks.onMakerToggle(false);
  }
  return { open, close };
}
