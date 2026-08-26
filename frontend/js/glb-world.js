// glb-world.js — [실험] **GLB 를 세계로 삼아 걸어다닌다.** behind-flag(라이브 미노출).
//
// ── 이 파일은 **두 페이지**를 섬긴다 ────────────────────────────────────────
//   · `world7.html` — 사용자가 **고른** 파일이 세계가 된다(파일 고르기 + 드래그&드롭)
//   · `world8.html` — `<body data-glb="…">` 로 지정된 **고정 파일**이 부팅 즉시 열린다
//
// 갈리는 것은 **파일이 어디서 오는가** 하나뿐이라 코드를 나누지 않았다 — 268줄을
// 복사하면 그것이 곧 값 미러링이고, 한쪽만 고쳐도 아무도 모른다. 대신 DOM 을
// **있으면 배선하고 없으면 넘어간다**(world8 에는 고르기 버튼이 없다).
//
// ⚠ 파일 이름이 `world7.js` 였다. 한 페이지 전용일 때는 맞는 이름이었지만 world8 이
// 같은 코드를 쓰게 되면서 **이름이 거짓이 됐다.** 역할로 바꿨다(2026-08-26).
//
// ── 감독 지시 2026-08-25 ─────────────────────────────────────────────────────
// *"아까 그 파일을 올려서 월드7로 해봐. 테스트로 보게"*
//
// 감독이 world2 를 GLB 로 내보내 블렌더에서 손본 파일을 **있는 그대로** 보고 싶어 한다.
// world2 의 「편집본 불러오기」는 그것과 다른 일을 한다 — 재질 이름으로 우리 파츠를
// 알아보고 **우리가 가진 모양으로 다시 세운다.** 그래서 블렌더에서 모양·재질을 바꾼
// 것은 화면에 안 나타난다(위치·크기·회전만 따라온다).
//
// 여기는 반대다. **파일이 곧 세계다** — 우리 파츠 규약을 아예 안 본다.
//
// ── 감독 지시 2026-08-26 — world8 ───────────────────────────────────────────
// *"월드8에 그 glb를 올려보자."* 「그 glb」는 감독 PC 의 블렌더 편집본인데 감독이
// *"지금 그파일이 없어서 내가 못올려"* 라고 했다. 그래서 **같은 왕복을 저장소에서
// 재현해** 자산으로 굽고(`scripts/asset/` 두 스크립트), world8 이 그것을 바로 연다.
// 감독은 링크만 열면 된다 — 고를 파일이 없어도 화면이 뜬다.
//
// ── 왜 `lab-glb.js` 를 안 쓰나 ──────────────────────────────────────────────
// 저쪽은 **고정 파일 + 고정 층 + 고정 바운딩**이 전제다(`lab-space.glb` 실사로 얻은
// 상수들이 파일 곳곳에 박혀 있다). 임의 GLB 에는 그 전제가 하나도 안 맞고, 저 파일은
// 이미 509줄이라 파일 크기 상한에 닿아 있다. 여기서 필요한 것만 새로 쓴다.
//
// ── 감독 지시 2026-08-26 — *"월드8에 월드 2의 기본 기능 다 들어가야지"* ──────
// 카드 판정: **「할 수 있는 것은 전부」**. 그래서 아래 「안 하는 것」 목록이 줄었다.
//
// ⚠ 이 헤더는 한때 *"충돌 없음 · 그림자 없음"* 을 설계 결정으로 적고 있었고 지금은
// 거짓이다 — 판단이 틀렸다기보다 **전제가 바뀌었다**(그때는 「잠깐 열어 본다」, 지금은
// 「world2 처럼 돌아다닌다」). 그리고 **world2 의 코드를 옮긴 것이 아니다** — 그쪽
// 충돌은 파츠 목록을 전제한다. 사유는 `glb-collide.js` 헤더 한 곳이다.
//
// ── 지금 **안** 하는 것 (일부러 / 아직) ─────────────────────────────────────
// · **후처리·잔디·TSL 물 · 하늘/시간대 — 아직.** 순서와 근거는 `docs/BOARD.md`
//   「지금 유효한 지시」 2026-08-26 팀장 판정 한 곳이다.
// · **미니맵·NPC·물 배치·편집·저장 — 원리상 안 된다.** 전부 「어디가 도로·물·파츠인가」
//   를 절차적 판정 산출물에서 읽는다. 임의 GLB 에는 그 선언이 없다.
// · 저장 없음 — 고른 파일은 브라우저 안에서만 산다(무저장 원칙).

import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
// 반경만 빌린다 — **값이자 감도**라 여기서 다시 적으면 그것이 곧 값 미러링이다.
// 조이스틱 DOM 은 안 쓴다(아래 «반쪽 터치»): 왼쪽 절반이 이동, 오른쪽 절반이 시점이라
// 그릴 손잡이가 없다.
import { JOY_RADIUS } from './shared/joystick-look.js';
// 걷기 판정 — 임의 GLB 에서 지면을 딛고 벽에 막힌다. world2 의 충돌은 파츠 목록을
// 전제하므로 옮길 수 없고, 같은 «결과» 를 임의 씬에서 성립하는 방식으로 새로 짰다.
import { buildColliders, createWalker, groundBelow, RADIUS } from './glb-collide.js';
// 터치 조이스틱 손잡이 — 룩 값은 `shared/joystick-look.js` 한 곳이다.
import { createStick } from './glb-stick.js';
import { instanceRepeats } from './glb-instance.js';
import { setupShadow } from './glb-shadow.js';
import { installDiag } from './glb-diag.js';

const EYE = 1.6;
const WALK = 3.2;         // m/s — 넓은 모델을 훑기에 lab(2.6)보다 조금 빠르게
const RUN = 9.0;          // world2 를 통째로 연 경우 960m 를 건너야 한다
const ACCEL = 10.0;
const MOUSE_SENS = 0.0022;
const TOUCH_SENS = 0.0058;
const PITCH_LIMIT = THREE.MathUtils.degToRad(89);

const canvas = document.getElementById('c');
const pick = document.getElementById('pick');
const pickBtn = document.getElementById('pickBtn');
const fileInput = document.getElementById('file');
const statusEl = document.getElementById('status');
const hud = document.getElementById('hud');
const againBtn = document.getElementById('again');
const toast = document.getElementById('toast');

// 어느 페이지인가 — 로그 접두사와 «고정 파일» 여부가 여기서 갈린다.
// `data-glb` 가 있으면 그 파일이 세계다(world8). 없으면 사용자가 고른다(world7).
const FIXED_GLB = document.body.dataset.glb || '';
const PAGE = document.body.dataset.page || 'glb-world';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fb4d8);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 4000);

// 조명 — 파일이 라이트를 안 들고 오는 경우가 대부분이라(블렌더 기본 내보내기) 최소한을 건다.
scene.add(new THREE.HemisphereLight(0xdfeeff, 0x6b6455, 2.2));
const sun = new THREE.DirectionalLight(0xfff3e0, 1.6);
sun.position.set(80, 140, 60);
scene.add(sun);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ── 상태 ────────────────────────────────────────────────────────────────────
let root = null;
let yaw = 0, pitch = 0;
let vx = 0, vz = 0;
const pos = new THREE.Vector3(0, EYE, 0);
const keys = { f: 0, b: 0, l: 0, r: 0, up: 0, down: 0, run: 0 };
let ready = false;
let walker = null;      // 걷기 판정기 — `place()` 에서 씬마다 새로 만든다
let collisionRoot = null;  // 인스턴싱 **전** 낱개 트리 — 충돌 바운딩의 출처(B2)
let fly = false;        // F 로 토글. 기본은 **걷기**(감독 지시: world2 의 기본 기능)
const stick = createStick(document);   // 마크업이 없으면 null — 그러면 손잡이만 안 그린다

/**
 * 「걸어다닐 세계」와 「물건」을 가르는 크기(m). 가장 긴 수평 축이 이보다 크면 **안에**
 * 서고, 작으면 **밖에서** 본다.
 *
 * 값의 근거: 사람이 안에서 걸어다니는 것이 말이 되는 최소 공간이다. 방 하나가 대략
 * 5~10m, 건물 한 채가 20~40m, 우리 오픈월드가 1920m 다. 60 은 「방·물건」과 「부지」
 * 사이에 있고, `lab-space.glb`(미술관)도 이 위라 안에 선다.
 * **경계도 판정이다** — 40~80 구간의 모델이 어느 쪽이 나은지는 안 재봤다. 감독이
 * 그 크기 모델로 «이상하다» 고 할 때 다시 연다.
 */
const WALKABLE_SPAN = 60;

/** 씬 전체를 놓아 준다 — 다른 파일을 고르면 이전 것이 그대로 남으면 안 된다 */
function disposeRoot() {
  // 낱개 트리는 **참조만** 놓는다 — 지오·재질은 인스턴스와 공유하므로 아래에서 한 번만
  // dispose 한다(두 번 부르면 three 가 이미 놓은 것을 다시 놓는다).
  collisionRoot = null;
  if (!root) return;
  scene.remove(root);
  root.traverse((o) => {
    // ⚠ `InstancedMesh` 는 `dispose()` 를 따로 불러야 `instanceMatrix` 가 회수된다
    // (three 는 그 이벤트에서만 놓는다 — 검수관 P2. 로드당 약 1.8MB).
    if (o.isInstancedMesh) o.dispose?.();
    o.geometry?.dispose?.();
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || typeof m !== 'object') continue;
      // 슬롯 이름을 나열하지 않는다 — `isTexture` 로 판정하면 three 가 슬롯을 늘려도 따라온다.
      for (const v of Object.values(m)) if (v && v.isTexture) v.dispose?.();
      m.dispose?.();
    }
  });
  root = null;
}

/**
 * 모델을 세우고 **바운딩에서 스폰을 유도한다.**
 *
 * 임의 GLB 라 «어디가 입구인가» 를 알 수 없다.
 *
 * ⚠ **첫 판본은 여기서 감독 신고를 냈다**(2026-08-26 *"스폰 위치도 없고. 걸어다닐수가
 * 없네"*). 그때 이 주석은 *"바운딩 중심의 바닥 높이에 서서 가장 긴 축 바깥에서 안쪽을
 * 보게 둔다 — 무엇이 들어 있든 일단 화면에 담긴다"* 였고 **작은 물건을 전제한 계산**이었다.
 * 1920m 세계에 그것을 쓰니 이렇게 됐다(실측):
 *
 *     pos {x:0, y:-2.5, z:960}   box y:-4.1~110.98 · x/z:-960~960
 *     → z 는 **남쪽 경계**, 정면 496m 앞에 겨우 메시 하나
 *     → y 는 `box.min.y + EYE` = **땅속 2.5m**(최저점은 물 바닥이지 지면이 아니다)
 *
 * **두 전제가 다르다**: 「물건을 본다」는 밖에서 봐야 하고 「세계를 걷는다」는 안에 서야
 * 한다. 크기로 가른다 — `WALKABLE_SPAN` 참조.
 *
 * 그리고 **지면은 바운딩으로 알 수 없다.** 레이캐스트로 찾는다. 임의 지오의 상시
 * 레이캐스트가 비싸다는 것이 이 파일이 충돌을 안 붙인 이유인데, **스폰은 1회**라 그
 * 근거가 여기엔 적용되지 않는다(실측 소요는 아래 주석).
 */
function place(gltf) {
  disposeRoot();
  // ── 반복 메시를 다시 묶는다 (감독 신고 «프레임이 느린것같아», 2026-08-26) ──
  // 사유·실측·대가·못 하는 것은 `glb-instance.js` 헤더 한 곳이다.
  // ⚠ **충돌용 바운딩은 묶기 «전» 트리에서 굽는다**(검수관 반려 B2).
  // `InstancedMesh.raycast` 는 자기 바운딩 구로 한 번 거른 뒤 `count` 전부를 순회하는데,
  // 묶인 구는 세계 전체를 감싸므로 「근처 45m」 필터가 **전부 통과시킨다** — 프레임당
  // 3광선 × 28,707 인스턴스가 된다(합성 재현 실측: 0.011ms → **9.945ms**, 937배).
  // 그 비용은 JS 라 swiftshader 와 무관하고 **실기기에 그대로 온다.**
  // 낱개 트리로 바운딩을 구워 두면 충돌 비용이 인스턴싱 이전과 **완전히 같아지고**
  // 렌더 이득만 남는다. three 의 `intersectObjects` 는 대상이 씬 그래프에 붙어 있을
  // 것을 요구하지 않는다 — `matrixWorld` 만 맞으면 된다.
  const tColl = performance.now();
  const colliders = buildColliders(gltf.scene);
  const collMs = Math.round(performance.now() - tColl);
  // 원본 트리를 **참조로 붙잡아 둔다.** 놓으면 위 배열의 메시가 GC 되고 레이캐스트가
  // 조용히 빈다. 씬에는 안 넣는다(그리지 않는다).
  collisionRoot = gltf.scene;
  // 삼각형은 **묶기 전에** 센다 — 묶은 뒤 `traverse` 는 40벌만 만나 357배 작게 나온다
  // (검수관 반려 B3: 감독이 보는 HUD 에 거짓 표시가 됐다).
  let tris = 0, meshes = 0;
  gltf.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    meshes++;
    const g = o.geometry;
    if (g.index) tris += g.index.count / 3;
    else if (g.attributes?.position) tris += g.attributes.position.count / 3;
  });
  {
    const t0 = performance.now();
    const r = instanceRepeats(gltf.scene);
    console.info(`[${PAGE}] 인스턴싱 ${Math.round(performance.now() - t0)}ms`
      + ` — ${r.instances.toLocaleString()}개 → ${r.made}벌 (규약 밖 ${r.skipped})`);
    root = r.group;
  }
  scene.add(root);

  const box = new THREE.Box3().setFromObject(root);
  if (!box.isEmpty()) {
    const size = box.getSize(new THREE.Vector3());
    const mid = box.getCenter(new THREE.Vector3());
    const span = Math.max(size.x, size.z);

    if (span >= WALKABLE_SPAN) {
      // ── 걸어다닐 세계 — **안에 선다** ────────────────────────────────────
      // 중심에서 물러나 중심을 본다. 크기에 비례시키되 **상한을 둔다** — 비례만 쓰면
      // 1920m 세계에서 또 밖으로 나간다(그것이 감독 신고의 절반이었다).
      //
      // 거리 계수는 화면으로 골랐다: `0.04`(→76.8m)는 중앙 구조물이 시야를 절반 가리고
      // 위가 잘렸다. `0.07` 은 상한 120m 에 걸려 FOV 70° 에서 세로 약 168m 를 담는다 —
      // 이 세계의 조형물(약 114m)이 들어온다.
      //
      // **정면이 아니라 대각선으로 선다**: 중심에 구조물이 있으면 정면 접근은 그것이
      // 시야를 막는다. 비껴서면 구조물과 그 너머 풍경이 함께 보인다.
      const back = Math.min(span * 0.07, 120);
      const bx = back * 0.62, bz = back * 0.78;
      pos.set(mid.x + bx, groundBelow(collisionRoot, mid.x + bx, mid.z + bz, box) + EYE, mid.z + bz);
      // `yaw = 0` 이 -z 를 보는 규약이므로 중심 방향은 atan2(bx, bz) 다.
      yaw = Math.atan2(bx, bz);
    } else {
      // ── 물건을 본다 — **밖에서 본다** ────────────────────────────────────
      // 작은 모델은 안에 서면 지오 안에 갇힌다. 전체가 화면에 담기게 물러난다.
      pos.set(mid.x, mid.y, mid.z + span * 0.9 + size.y * 0.5);
      yaw = 0;            // 정면(-z)에 중심이 온다
    }
    // ⚠ 여기에 `yaw = 0; pitch = 0;` 이 함께 있었고 **위에서 정한 yaw 를 덮어썼다.**
    // 두 분기가 각자 yaw 를 정하므로 공통으로 되돌릴 것은 pitch 뿐이다.
    pitch = 0;
    // 아주 큰 모델(world2 는 960m 사방)도 잘리지 않게 far 를 맞춘다.
    camera.far = Math.max(1000, size.length() * 2.5);
    camera.updateProjectionMatrix();
  }

  // DOM 은 **있으면 쓰고 없으면 넘어간다** — world8 에는 고르기 버튼이 없다.
  if (hud) {
    hud.textContent = `메시 ${meshes.toLocaleString()} · 삼각형 ${Math.round(tris).toLocaleString()}`;
    hud.hidden = false;
  }
  if (againBtn) againBtn.hidden = false;   // 다른 파일을 열 문을 남긴다(검수관 권고 P8)
  // ⚠ 성공했으면 «읽는 중…» 을 **지운다**(검수관 권고 P2). 안 지우면 `#pick` 이 숨어서
  // 안 보일 뿐 문구는 남아 있고, CSS 가 바뀌는 순간 거짓 표시가 된다 — 실측 스냅에
  // `{"hud":"메시 28,707…","status":"… 읽는 중…","pickHidden":true}` 로 찍혔다.
  if (statusEl) statusEl.textContent = '';
  // ── 걷기 판정기 — 씬이 바뀌면 다시 굽는다 ────────────────────────────────
  // 부팅 1회 비용이다. 실측 소요는 HUD 옆 `[걷기]` 표시가 뜨는 시점으로 확인한다.
  {
    // ⚠ 타이머는 위 `buildColliders` 를 감싼다(검수관 N2) — 한때 `createWalker` 만
    // 재고 «0ms» 를 찍었고 그것은 클로저만 만들어 **구조적으로 항상 0** 이다.
    // 비용이 사라진 게 아니라 **계측에서 사라진** 것이었는데 개선으로 보고됐다.
    // 「너무 좋은 수치」는 개선이 아니라 계측 붕괴의 신호로 먼저 의심한다.
    walker = createWalker(colliders);
    console.info(`[${PAGE}] 충돌 준비 ${collMs}ms — 낱개 ${colliders.length.toLocaleString()}개`);
  }

  setupShadow(renderer, sun, scene, root, box);

  ready = true;

  // 「어디에 서 있는가」를 재는 축은 `glb-diag.js` 한 곳이다 — 왜 따로 뒀는지도 거기 있다.
  installDiag(() => ({
    pos, yaw, pitch, ready, fly, box, camera, root, walker,
    renderer,
    setYaw: (v) => { yaw = v; return v; },
  }));
  pick?.classList.add('hide');
}

/**
 * 실패를 화면에 띄운다. **`#pick` 밖**이라 첫 성공 뒤에도 보인다.
 *
 * ⚠ 사유를 `#status` 에만 적던 판본은 그 요소가 숨겨진 `#pick` 안에 있어서, 드롭으로
 * 연 두 번째 파일이 실패하면 **화면에 아무것도 안 나왔다**(검수관 권고 P8).
 */
function say(msg) {
  if (statusEl) statusEl.textContent = msg;    // 첫 화면에서는 여기가 보인다
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(say._t);
  say._t = setTimeout(() => { toast.hidden = true; }, 8000);
}

// ── 불러오기 ────────────────────────────────────────────────────────────────
const loader = new GLTFLoader();

/**
 * URL 하나를 열어 세계로 세운다. 고른 파일(blob URL)과 고정 파일(같은 오리진)이
 * **같은 경로**를 탄다 — 갈라 놓으면 한쪽만 고쳐지는 자리가 생긴다.
 *
 * ⚠ 실패를 **던지지 않는다.** 화면에 적고 `false` 를 돌려준다 — 부팅 시 고정 파일이
 * 실패했을 때 예외가 위로 올라가면 그 뒤의 조작 배선이 통째로 안 걸린다.
 */
async function loadFromUrl(url, label) {
  say(`${label} 읽는 중…`);
  try {
    const gltf = await loader.loadAsync(url, (ev) => {
      // 큰 파일은 몇십 초가 걸린다 — 빈 화면은 「안 된다」와 구별되지 않는다.
      if (!ev?.lengthComputable || !ev.total) return;
      say(`${label} 읽는 중… ${Math.round((ev.loaded / ev.total) * 100)}%`);
    });
    place(gltf);
    if (toast) toast.hidden = true;            // 성공했으면 «읽는 중» 을 지운다
    return true;
  } catch (err) {
    // 조용히 삼키지 않는다 — 무엇이 잘못됐는지 화면에 적는다.
    console.error(`[${PAGE}] GLB 로드 실패`, err);
    // ⚠ 고르기 UI 가 없는 페이지(world8)는 여기서 **복구 수단이 0** 이다 — 「✗ 못 읽었다」
    // 만 남고 `ready` 가 false 라 조작도 안 먹는다(검수관 권고 P3). 다시 시도할 길을
    // 한 줄로 알린다. 고르기 UI 가 있으면 그 버튼이 곧 복구 수단이라 덧붙이지 않는다.
    const retry = fileInput ? '' : ' — 새로고침하면 다시 시도합니다.';
    say(`✗ 못 읽었다: ${err instanceof Error ? err.message : err}${retry}`);
    return false;
  }
}

// ── 파일 고르기 — **있는 페이지에서만** 배선한다 (world7) ───────────────────
if (fileInput) {
  pickBtn?.addEventListener('click', () => fileInput.click());
  againBtn?.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    // blob URL — 로더가 URL 만 받는다. CSP 가 `blob:` 을 허용한다(이 페이지 헤더).
    const url = URL.createObjectURL(f);
    try {
      await loadFromUrl(url, f.name);
    } finally {
      URL.revokeObjectURL(url);
      fileInput.value = '';        // 같은 파일을 다시 고를 수 있게
    }
  });

  // 드래그&드롭도 받는다 — 블렌더에서 갓 내보낸 파일을 창에 던지는 것이 가장 빠르다.
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change'));
  });
}

// ── 고정 파일 — 부팅 즉시 연다 (world8) ─────────────────────────────────────
// 상대경로를 문서 기준으로 푼다: 배포에서 이 페이지는 `/openartshow/app/` 아래에
// 있고 자산은 그 옆 `assets/` 다. `location.href` 기준이라 base 경로가 바뀌어도 따라온다.
if (FIXED_GLB) {
  const name = FIXED_GLB.split('/').pop() || FIXED_GLB;
  loadFromUrl(new URL(FIXED_GLB, location.href).href, name);
}

// ── 조작 ────────────────────────────────────────────────────────────────────
const KEY = {
  KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b',
  KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r',
  Space: 'up', KeyQ: 'down', ShiftLeft: 'run', ShiftRight: 'run',
};
addEventListener('keydown', (e) => { const k = KEY[e.code]; if (k) { keys[k] = 1; e.preventDefault(); } });
addEventListener('keyup', (e) => { const k = KEY[e.code]; if (k) keys[k] = 0; });
// F — 걷기 ↔ 비행. 기본은 **걷기**다(감독 지시). 비행은 「위에서 내려다보기」용으로 남긴다.
addEventListener('keydown', (e) => {
  if (e.code !== 'KeyF' || !ready) return;
  fly = !fly;
  say(fly ? '✈ 비행 — Space/Q 로 위아래 · F 로 되돌리기' : '🚶 걷기 — 지면을 딛고 벽에 막힙니다');
});

canvas.addEventListener('click', () => { if (ready) canvas.requestPointerLock?.(); });
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  yaw -= e.movementX * MOUSE_SENS;
  pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch - e.movementY * MOUSE_SENS));
});

// ── 터치 — 왼쪽 절반은 이동, 오른쪽 절반은 시점 ─────────────────────────────
// `pruneStale` 규약을 따른다(`lab-glb.js` 헤더): 메인스레드가 길게 블록되면 `touchend`
// 가 유실돼 손을 뗐는데도 계속 걷는다. 매 이벤트마다 **지금 실제로 닿아 있는 것**으로
// 청소한다. 큰 GLB 를 로드하는 이 페이지에서 특히 잘 난다.
let moveTouch = null, lookTouch = null;
const stale = (list) => {
  const live = new Set([...list].map((t) => t.identifier));
  if (moveTouch && !live.has(moveTouch.id)) { moveTouch = null; stick?.hide(); }
  if (lookTouch && !live.has(lookTouch.id)) lookTouch = null;
};
addEventListener('touchstart', (e) => {
  stale(e.touches);
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth / 2) {
      if (!moveTouch) {
        moveTouch = { id: t.identifier, x0: t.clientX, y0: t.clientY, ux: 0, uz: 0 };
        stick?.show(t.clientX, t.clientY);   // 누른 자리에 손잡이가 뜬다
      }
    }
    else if (!lookTouch) lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
  }
}, { passive: true });
addEventListener('touchmove', (e) => {
  stale(e.touches);
  for (const t of e.changedTouches) {
    if (moveTouch && t.identifier === moveTouch.id) {
      const dx = t.clientX - moveTouch.x0, dy = t.clientY - moveTouch.y0;
      const len = Math.hypot(dx, dy) || 1;
      const s = Math.min(1, len / JOY_RADIUS);
      moveTouch.ux = (dx / len) * s;
      moveTouch.uz = (dy / len) * s;
      stick?.move(moveTouch.ux, moveTouch.uz, s);
    } else if (lookTouch && t.identifier === lookTouch.id) {
      yaw -= (t.clientX - lookTouch.x) * TOUCH_SENS;
      pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch - (t.clientY - lookTouch.y) * TOUCH_SENS));
      lookTouch.x = t.clientX; lookTouch.y = t.clientY;
    }
  }
}, { passive: true });
addEventListener('touchend', (e) => stale(e.touches), { passive: true });
addEventListener('touchcancel', (e) => stale(e.touches), { passive: true });

// ── 루프 ────────────────────────────────────────────────────────────────────
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  // ⚠ 클램프가 0.05 였고 **프레임이 느리면 시간이 사라졌다.** 헤드리스 실측: W 를
  // 2초 눌러 **0.23m** 이동(기대 ~6m). 4fps 면 실제 dt 는 0.25s 인데 0.05 로 잘려
  // 시간의 20%만 흐른다 — 「입력이 안 먹는다」로 보인다. 모바일에서 5MB GLB 를 그리다
  // fps 가 떨어지면 같은 일이 난다.
  // 0.1 로 넓힌다. ⚠ 이 주석은 한때 *"이 페이지는 충돌이 없어 한 프레임에 멀리 가도
  // 통과할 벽이 없다"* 를 근거로 들었고 **그 전제는 2026-08-26 에 사라졌다**(충돌 신설).
  // 지금 0.1 이 안전한 근거는 다르다: 최고 속도 RUN(9m/s) × 0.1s = **0.9m** 이고
  // 벽 검사가 `RADIUS + 이동거리` 를 앞서 보므로 그 한 걸음도 검사 범위 안이다.
  // 값을 더 키우면 그 관계가 깨진다 — 키울 거면 `blocked` 의 `dist` 를 같이 본다.
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (ready) {
    let ix = keys.r - keys.l;
    let iz = keys.b - keys.f;
    if (moveTouch && !ix && !iz) {
      ix = moveTouch.ux; iz = moveTouch.uz;
      if (Math.hypot(ix, iz) < 0.14) { ix = 0; iz = 0; }    // 데드존 — world2 와 같은 값
    }
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    const speed = keys.run ? RUN : WALK;
    // ── 시점 기준 이동 ──────────────────────────────────────────────────
    // `yaw = 0` 이 **-z 를 보는** 규약이다(three 카메라 기본 시선). 그러면
    //   시선  = (-sin, -cos)      오른쪽 = (cos, -sin)
    // 이고, 전진(W)은 `iz = -1` 이므로 `iz` 를 시선에 **그대로** 곱해야 한다.
    //
    // ⚠ **첫 판본은 두 항의 부호가 뒤집혀 W 가 뒤로 갔다**(2026-08-26 실측: 벽으로
    // 밀었는데 중심에서 14m → 17.45m 로 **멀어졌다**). 그전 회차 검사가 이것을
    // 놓친 이유는 「걸어서 움직였다」만 보고 **방향을 안 봤기** 때문이다 — 거리는
    // 늘었으니 초록이었다. 감독이 *"걸어다닐수가 없네"* 라고 한 것의 한 갈래다.
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const tx = (ix * cos + iz * sin) * speed;
    const tz = (-ix * sin + iz * cos) * speed;
    // 지수 감쇠 — 즉시 최고속이 아니라 붙었다 떨어지는 손맛(`player.js` 와 같은 방식).
    const k = 1 - Math.exp(-ACCEL * dt);
    vx += (tx - vx) * k;
    vz += (tz - vz) * k;

    const stepX = vx * dt, stepZ = vz * dt;
    if (fly || !walker) {
      // 자유 비행 — 예전 동작 그대로. 「위에서 내려다보기」가 이쪽 몫이 됐다.
      pos.x += stepX;
      pos.z += stepZ;
      pos.y += (keys.up - keys.down) * speed * dt;
    } else {
      walker.refresh(pos, now);
      // ── 벽 — **축을 따로 본다.** 함께 보면 벽에 스치기만 해도 완전히 멈추는데,
      // 따로 보면 막힌 축만 죽고 나머지가 살아 **미끄러진다**(벽을 따라 걷는 느낌).
      const knee = EYE - 0.5;   // 눈이 아니라 무릎에서 쏜다 — 난간·연석을 놓치지 않게
      if (walker.blocked(pos.x, pos.y, pos.z, stepX, 0, Math.abs(stepX) + RADIUS, knee)) vx = 0;
      else pos.x += stepX;
      if (walker.blocked(pos.x, pos.y, pos.z, 0, stepZ, Math.abs(stepZ) + RADIUS, knee)) vz = 0;
      else pos.z += stepZ;

      // ── 지면 — 딛고 선다. 계단·경사는 보간으로 부드럽게 따라간다.
      const g = walker.ground(pos.x, pos.y, pos.z);
      if (g !== null) {
        // ⚠ 못 찾으면 **그대로 둔다**(떨어뜨리지 않는다). 임의 GLB 에는 바닥이 없는
        // 자리가 흔하고, 거기서 중력을 주면 무한 낙하가 된다 — 되돌릴 길이 없다.
        pos.y += ((g + EYE) - pos.y) * Math.min(1, dt * 12);
      }
    }

    camera.position.copy(pos);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
