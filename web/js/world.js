// world.js — 오픈월드 파셀 스트리밍 워크스루 (behind-flag · 첫 스파이크)
// -----------------------------------------------------------------------------
// 아키텍처(가산형 독립): 라이브 미술관 런타임(main/player/artworks/config)과 방문자뷰
// (visit.js)를 일절 수정하지 않고, 재사용 자산(space-render·avatar·npc)만 소비하는
// 자체 완결 컨트롤러. visit.js의 검증된 이동·충돌 로직을 "여러 파셀(단칸 공간)을 그리드에
// 타일링하고 인접분만 스트리밍"하도록 확장한다. "파라미터가 곧 공간"을 파셀 단위로 확장.
//
// 파셀 모델(복셀스): 파셀 = 하늘 아래 대지. 정수 그리드 (px,pz), 월드 오프셋 = (px*cellX, 0, pz*cellZ).
//   대지 중앙부에 건물(footprint·층고·층수 자유), 가장자리는 길. 이동은 개방(월드 소프트 클램프만),
//   건물 벽 = solid 세그먼트(computeShellSolids, 문 구간 비움) → 출입은 문으로만.
//
// createWorld({ canvas, parcels, opts }) → 스크립트 API(헤드리스 검증 가능):
//   parcels: [{ px, pz, space, npc? }]  (npc: { roster, count } — 그 파셀에 직원 NPC 소환)
//   walk/update/renderOnce/lookDelta/getPosition/getLoadedKeys/dispose/on ...
//   opts.cellX/cellZ: 축별 파셀 셀 크기(m). opts.cell: 정사각 폴백(기본 32). opts.headless: RAF·이벤트 바인딩 비활성.
// -----------------------------------------------------------------------------
import * as THREE from 'three';
import { mergeGeometries } from '../utils/BufferGeometryUtils.js';
import { buildSpaceGroup, disposeSpaceGroup, addRoomLighting, spaceDims, partY, DOOR_W, warmBuildingTexCache } from './space-render.js';
import { PART_TYPES } from './space.js';
import { createAvatarInstance } from './avatar.js';
import { NpcCrowd } from './npc.js';
// [나무 교체] 거리 가로수를 미술관과 동일한 디테일 트리로. scene.js(계열 A)에서 순수 export
// 가산한 트리 빌더·머티리얼별 병합을 재사용(로직 복제 0). 공유 재질(sharedTreeMats)은 scene.js
// 모듈 클로저 소유라 파셀 언로드에서 dispose하지 않는다(병합 지오만 own 배열로 회수).
import { buildDetailedTree, bakeGroupByMaterial } from './scene.js';
import { PEER_ROOM_ID, EYE_HEIGHT } from './config.js';
import { MOBILE_PX_CAP } from './main-spec.js'; // 모바일 pixelRatio 상한(SSOT: main-spec.ts — main.js·main-perf.ts와 동일 상수 재사용, 값 중복 신설 금지)
import { MultiplayerManager } from './multiplayer.js';
// [하늘 엔진] 승인된 독립 모듈(sky.js) — sun/hemi/sky 돔을 주입해 시간대·날씨·이벤트 연출.
// 배선은 3접점(생성·update·getSunDir 태양방위)만, sky.js가 조명·fog·clearColor·크로스페이드를 자기소유로 제어.
import { createSkySystem } from './sky.js';

const EYE = 1.5;            // 시점 높이(m)
const SPEED = 3.0;         // 이동 속도(m/s)
const RADIUS = 0.3;        // 플레이어 반경(충돌 마진)
const PITCH_LIMIT = 1.45;  // 상하 시선 클램프(rad)
const STEP_OVER = 0.12;    // 걸림턱(바닥타일만 통과) — visit.js 계약 계승
const STEP_TOLERANCE = 0.65; // [다층] 프레임당 허용 고저차(계단 등반·추락 방지) — player.js 이식
const GROUND_LERP_RATE = 12; // [다층] 지면 y 추종 보간(계단이 매끄러운 경사로)
// ── [해안 패키지] 바다 단차·해변·부두·테트라포드 상수 ─────────────────────────
// 감독 지시: "바다는 땅과 같은 높이면 어색" → 바다를 지면(0)보다 확실히 낮춰 단차를 만들고,
// 경계 파셀 가장자리를 모래 해변으로 완만히 하강시켜 물가로 이어지게 한다. 강(도시 운하)은
// 얕게 유지(파셀 소유 물타일)해 바다와 분리. 부두·테트라포드는 물가(경계 파셀)에 시드 배치.
const SEA_Y = -1.2;        // 바다 수면 y — 지면 0 대비 1.2m 단차(외해). 강 수면(-0.3)과 분리.
const BEACH_W = 8;         // 경계 파셀 바깥 모래 해변 경사 폭(m). 기울기 1.2/8=0.15 → 도보 하강 매끈.
const BEACH_TOE = -1.35;   // 해변 발끝 y(수면 -1.2 아래 모래 — 물가 첨벙 접지).
const RIVER_Y = -0.3;      // 강(내수면) 수면 y — 기존 sea 높이 계승(도시 운하: 얕게).
const PIER_LEN = 12;       // 부두 데크가 바다로 돌출하는 길이(m).
const PIER_W = 3.2;        // 부두 데크 폭(m).
const PIER_DECK_Y = 0.08;  // 데크 상면 y — 지면 0 대비 STEP_OVER(0.12) 미만이라 걸림 없이 진입.
// DOOR_W(문틀 통로 폭)는 space-render.js에서 import — 렌더/통과 판정 단일 상수(드리프트 방지).

// ── [저사양 방어] GPU 자가 진단 — main.js:83·89 동형 복제 ─────────────────────
// main.js는 라이브 보호 파일이라 import 대신 사본을 둔다(원본 변경 시 이 블록도 동기화).
// 소프트웨어 렌더링(SwiftShader/WARP/llvmpipe 등) 감지 시 오픈월드도 미술관과 동일한
// 포테이토 폴백(AA off·픽셀비율 0.7 캡·섀도 off·무톤매핑·fog null·~30fps 프레임 캡)을 건다.
// 성능 전문가 확정 실측: 이식 전 오픈월드는 4x 스로틀+swiftshader에서 100프레임 420초 미완주(정지 1.4fps).
const SOFT_GPU_RE = /swiftshader|llvmpipe|softpipe|software (?:rasterizer|renderer|adapter)|microsoft basic render|\bwarp\b|gdi generic|mesa offscreen|apple software renderer/i;
// GPU 프로브 — 렌더러 생성 "전"에 1회용 캔버스로 판별(antialias 등 컨텍스트 생성 옵션을 결과에 따라 정해야 함).
// 2차 신호: failIfMajorPerformanceCaveat 컨텍스트가 거부되면 브라우저 스스로 "심각한 성능 제약"을 인정한 것.
function probeGpu() {
  const out = { name: '', soft: false };
  try {
    const c1 = document.createElement('canvas');
    const strict =
      c1.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
      c1.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    const caveat = !strict;

    const c2 = document.createElement('canvas');
    const gl = c2.getContext('webgl2') || c2.getContext('webgl');
    if (!gl) return { name: '', soft: true }; // WebGL 자체 불가 직전 상태
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    out.name = String(
      (ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || ''
    );
    out.soft = SOFT_GPU_RE.test(out.name) || caveat;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext(); // 프로브 컨텍스트 즉시 반납
  } catch (_) { /* 판별 실패 시 정상 GPU로 간주 */ }
  return out;
}

// 빌더/방문자뷰 계승 — 은은한 PMREM 환경 반사(글로시 바닥·재질 깊이).
function makeEnvMap(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  es.add(new THREE.HemisphereLight(0xdfe4f2, 0x3a3630, 1.0));
  const hi = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: 0xffe9c8 })); hi.position.set(0, 5, -6); es.add(hi);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(4, 8), new THREE.MeshBasicMaterial({ color: 0x2a2c3a })); side.position.set(-6, 3, 0); side.rotation.y = Math.PI / 2; es.add(side);
  const tex = pm.fromScene(es, 0.02).texture; pm.dispose();
  [hi, side].forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
  return tex;
}

export function createWorld({ canvas, parcels = [], opts = {} } = {}) {
  const headless = !!opts.headless;
  // 비정사각 셀(cellX/cellZ) — 복셀스 개방 도시는 정사각 24×24(셀 > 건물 → 가장자리가 길).
  // opts.cell(스칼라) 폴백 유지 → 스파이크(createWorld({cell:9}))·정사각 그리드 무회귀.
  const CELLX = opts.cellX || opts.cell || 32;
  const CELLZ = opts.cellZ || opts.cell || 32;
  const CELL_MAX = Math.max(CELLX, CELLZ); // fog 스케일 대표값

  // [저사양 방어] 렌더러 생성 "전" GPU 프로브 — antialias는 생성 시점 옵션이라 결과를 먼저 알아야 한다(main.js:555).
  const gpuInfo = probeGpu();
  // [C-2a] pointer:coarse(터치) 판정 — main.js:272 동형. 모바일 DPR 상한 캡(스폰·적응)의 공통 게이트.
  const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (typeof console !== 'undefined') console.info('[OpenArtShow/World] GPU:', gpuInfo.name || '(unknown)', gpuInfo.soft ? '— SOFTWARE RENDERING' : '');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !gpuInfo.soft, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
  // 픽셀비율 상한 — 정상 GPU는 최대 2, 소프트웨어 렌더는 0.7 캡(main.js:604 동형).
  const dprBase = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  // [C-2a 모바일 DPR 캡] pointer:coarse는 진입 직후 스폰 배율도 MOBILE_PX_CAP(1.5)로 상한 —
  // world는 자체 적응이라 A+B(main.js:328)의 모바일 캡이 미적용인 사각이었다(진입 직후 실측 px 2.00 노출).
  // 데스크톱(pointer:fine)은 캡 미적용 → 화질 무변화. gpuInfo.soft는 이미 0.7 캡이라 캡이 무영향.
  let spawnRatio = gpuInfo.soft ? Math.min(dprBase, 0.7) : Math.min(2, dprBase);
  if (coarsePointer) spawnRatio = Math.min(spawnRatio, MOBILE_PX_CAP);
  renderer.setPixelRatio(spawnRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // ACES 톤매핑은 프래그먼트당 수십 ALU — 소프트웨어 렌더에서는 그대로 비용이라 끈다(main.js:613).
  renderer.toneMapping = gpuInfo.soft ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = !gpuInfo.soft; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // [섀도 프리즈] 정적 씬 — 섀도맵을 매 프레임이 아니라 이벤트 기반으로만 재베이크(하드웨어 GPU 포함 전체 적용).
  // 미술관(main.js:634)은 완전 프리즈지만 오픈월드는 태양이 플레이어 추종이라 완전 프리즈 불가 →
  // 초기 1회·파셀 로드/언로드·마지막 베이크에서 8m 이상 이동에만 1프레임 재베이크(needsUpdate).
  // 움직이는 캐스터는 아바타뿐이고 아바타 그림자는 blob이라 섀도맵과 무관 → 정적 씬 품질 손실 경미.
  renderer.shadowMap.autoUpdate = false;

  // [복셀스] 야외 낮 씬 — 하늘색 헤미 + 태양 디렉셔널(플레이어 추종 타이트 섀도) + 스카이돔.
  const scene = new THREE.Scene();
  // [하늘 엔진] hemi 참조를 보관 — sky.js가 시간대/날씨에 따라 색·강도를 직접 제어(주입 대상).
  const hemi = new THREE.HemisphereLight(0xcfe4f7, 0x8fa385, 1.0); // 그림자 대비 완화(야외 앰비언트)
  scene.add(hemi);
  scene.environment = makeEnvMap(renderer);
  const sun = new THREE.DirectionalLight(0xfff2dc, 0.95);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0005;
  { const c = sun.shadow.camera; c.left = -22; c.right = 22; c.top = 22; c.bottom = -22; c.near = 0.5; c.far = 130; c.updateProjectionMatrix(); }
  scene.add(sun); scene.add(sun.target);

  // ── [단계2 라이트 풀] 셰이더 재컴파일 제거 — 씬 SpotLight 총개수 고정 ──────────────
  // space-render addRoomLighting은 파셀 로드마다 실제 SpotLight(작품+다운라이트)를 씬에 추가/제거해,
  // three.js가 조명 개수 변동 시 영향 머티리얼 프로그램을 전부 재컴파일 → 경계 통과 히칭 총량이 급증
  // (단계1 큐가 순간 스파이크는 분산했으나, 과도상태를 매 프레임 render해 재컴파일 총량은 오히려 증가).
  // 대책: MAX_FULL*SPOTS_PER개 SpotLight를 미리 확보(개수 불변). 로드 시 풀에서 배정(위치·색·강도 설정),
  // 언로드 시 intensity=0으로 끄고 반납. 미사용 라이트도 visible=true 유지(false면 개수 변동→재컴파일).
  // placement 상수는 space-render.js addRoomLighting 스포트 생성부(1338·1344 근처)의 미러 — 드리프트 시 동기화.
  // [교차리뷰 결함 수정] MAX_FULL은 soft·일반 모두 5 — 실제 동시 로드되는 full 파셀 수(3×3 직교인접
  // 맨해튼≤1 = 십자 5개)와 반드시 일치해야 풀 고갈(무조명 파셀)이 없다. soft 축소는 조명 총량을
  // 파셀당 작품 수(OW_ART_CAP)로만 완화한다(풀 파셀 수 MAX_FULL을 줄이면 5파셀 로드 시 고갈).
  const MAX_FULL = 5;                        // 동시 full 파셀 수(십자 5) — soft·일반 동일(고갈 방지).
  const OW_ART_CAP = gpuInfo.soft ? 4 : 10; // 파셀당 작품 스포트 상한(space-render ART_SPOT_CAP=10 미러). soft 축소=조명 총량 완화.
  // 천장 다운라이트 위치 팩터(hw/hd에 곱). space-render addRoomLighting (b) 미러. 개수는 배열에서 유도(드리프트 방지).
  const DOWNLIGHT_FACTORS = [[-0.4, -0.35], [0.15, 0.1], [0.5, -0.1]];
  const DOWNLIGHTS = DOWNLIGHT_FACTORS.length;
  const SPOTS_PER = OW_ART_CAP + DOWNLIGHTS; // soft 7(4+3)·일반 13(10+3) → 풀 soft 35·일반 65(둘 다 5파셀 고갈 0).
  // [팝인 완화 — 조명 페이드업] shell→full 승격 시 조명 intensity가 0→23을 한 프레임에 하드 스냅해
  // "불이 확 켜지는" 팝인이 됐다. sl._target(목표강도)로 두고 매 프레임 intensity를 목표로 lerp한다.
  // FADE_K=6 → 시상수 ≈1/6초, 목표 근접(≈98%)까지 ≈0.65초. visible·풀 개수는 불변이라 셰이더 재컴파일 churn 없음.
  // 페이드다운(꺼짐)은 생략 — 풀이 정확히 5파셀분(MAX_FULL=5, 고갈0 설계)이라 언로드-로드 겹침 시 풀 고갈
  // 위험이 있고, 언로드는 3×3 밖(등 뒤·원거리)이라 즉시 꺼도 보이지 않는다.
  const FADE_K = 6; // 조명 페이드업 계수(초당). 클수록 빠르게 켜짐. 팀장 실기 튜닝 여지.
  const lightPool = [];
  for (let i = 0; i < MAX_FULL * SPOTS_PER; i++) {
    const sl = new THREE.SpotLight(0xffffff, 0, 11, 0.72, 1.0, 1.0);
    sl.visible = true; sl._inUse = false;   // visible 항상 true(개수 고정), intensity=0로 소등.
    sl._target = 0;                         // 페이드 목표강도(미사용 라이트는 0·intensity 0이라 무해).
    scene.add(sl); scene.add(sl.target);
    lightPool.push(sl);
  }
  const takeLight = () => { for (const sl of lightPool) if (!sl._inUse) { sl._inUse = true; return sl; } return null; };
  const releaseLight = (sl) => { sl.intensity = 0; sl._target = 0; sl._inUse = false; }; // 소등·목표0·반납(개수 불변).
  // 파셀 건물 조명 배정 — addRoomLighting(noSpots)이 AO만 만들고, 스포트는 여기서 풀 라이트로 설정.
  // bx,bz=건물 월드 오프셋, dims=userData.dims, refs=userData.partRefs(로컬 위치). 반환=배정 라이트(언로드 반납).
  function assignParcelLights(bx, bz, dims, refs) {
    const { H, hw, hd } = dims;
    const out = [];
    // (a) 작품 스포트 — space-render addRoomLighting (a) 미러(색 0xffe3ba·강도23·거리11·각0.72·penumbra1·decay1).
    const arts = refs.filter(({ part }) => part.t === 'artwork' || part.t === 'screen').slice(0, OW_ART_CAP);
    for (const { object } of arts) {
      const sl = takeLight(); if (!sl) break; // 풀 고갈(soft 방어) → 조명 스킵
      const p = object.position;
      const toC = new THREE.Vector3(-p.x, 0, -p.z); if (toC.lengthSq() < 1e-3) toC.set(0, 0, 1); toC.normalize();
      sl.color.setHex(0xffe3ba); sl._target = 23; sl.intensity = 0; sl.distance = 11; sl.angle = 0.72; sl.penumbra = 1.0; sl.decay = 1.0; // [팝인 완화] 0에서 시작해 update에서 목표23으로 페이드업(하드 스냅 제거).
      sl.position.set(bx + p.x + toC.x * 2.1, H - 0.15, bz + p.z + toC.z * 2.1);
      sl.target.position.set(bx + p.x, p.y, bz + p.z); sl.target.updateMatrixWorld();
      out.push(sl);
    }
    // (b) 천장 다운라이트 — space-render addRoomLighting (b) 미러(색 0xffdcb0·강도18·거리12·각0.6·penumbra1·decay1.1).
    for (const [fx, fz] of DOWNLIGHT_FACTORS) {
      const dx = hw * fx, dz = hd * fz;
      const sl = takeLight(); if (!sl) break;
      sl.color.setHex(0xffdcb0); sl._target = 18; sl.intensity = 0; sl.distance = 12; sl.angle = 0.6; sl.penumbra = 1.0; sl.decay = 1.1; // [팝인 완화] 0에서 시작해 update에서 목표18으로 페이드업.
      sl.position.set(bx + dx, H - 0.1, bz + dz);
      sl.target.position.set(bx + dx, 0, bz + dz); sl.target.updateMatrixWorld();
      out.push(sl);
    }
    return out;
  }

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 900);

  // 하늘 — 캔버스 그라디언트 스카이돔(자기완결·외부 텍스처 0, fog 미적용) + 밝은 대기 fog.
  const FOG_COLOR = 0xcfe0ee;
  // [팝인 완화] fog near/far를 로드경계로 당겨 파셀 shell→full 승격(팝인·원거리 노출)을 은은한 안개로 덮는다.
  // 기존 far=CELL_MAX*3.4(≈109m)는 로드거리(≤50m)보다 한참 밖이라 팝인(경계 통과 27~36m대)을 전혀 못 가렸다.
  // near=인접 파셀 경계 안쪽부터 은은히 시작, far=3×3 대각 shell 거리 부근에서 완전 안개 → 팝인대를 안개 안으로.
  // near/far를 명명 상수로 노출 — 팀장 실기기 스윕 튜닝용. 실기 피드백에 따라 계수만 조정하면 된다.
  const FOG_NEAR = CELL_MAX * 0.9; // 인접 파셀 경계 안쪽부터 페이드 시작(가벼운 안개, 근경은 선명 유지)
  const FOG_FAR  = CELL_MAX * 1.9; // 3×3 대각 shell 거리 부근 완전 안개 — 팝인·원거리 하드 노출 은폐
  // soft GPU에도 fog 적용(기존 `if(!gpuInfo.soft)` 가드 제거) — 선형 fog는 프래그먼트당 저비용이고,
  // 팝인은 soft 실기에서 특히 두드러진다. 스카이돔은 fog:false라 하늘은 그대로, sky.js:679는 scene.fog
  // 존재 시 fog.color만 시간대별로 갱신(near/far 불변)하므로 무충돌.
  scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
  renderer.setClearColor(FOG_COLOR, 1);
  function makeSkyDome() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const x = c.getContext('2d');
    const grd = x.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#5f9fd6'); grd.addColorStop(0.55, '#a8cbe8'); grd.addColorStop(0.8, '#dbe8f2'); grd.addColorStop(1, '#e9eef2');
    x.fillStyle = grd; x.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
    const m = new THREE.Mesh(new THREE.SphereGeometry(520, 24, 12), mat);
    m.renderOrder = -1;
    return m;
  }
  const sky = makeSkyDome(); scene.add(sky);
  // [하늘 엔진] skySystem은 pos 초기화 이후 생성(getPos가 pos 참조). SUN_DIST=기존 태양 거리(√(34²+58²+20²)≈70).
  // applyPose가 이 거리를 getSunDir() 방향으로 곱해 태양을 배치 → 하늘 그림의 해·달 방위와 조명 방향 일치.
  let skySystem = null;
  const SUN_DIST = 70;

  // 물 잔물결 텍스처(자작 소형·자기완결 — space-render waterTexGen 비공개라 라이브 공유파일
  // 무수정 위해 world.js에 소형 자작). 가로 정수배 사인이라 타일 이음새 연속 → update에서
  // map.offset 스크롤로 잔잔한 흐름(저사양: 버텍스 변형·셰이더 0, 드로우콜 증가 0). 비-DOM 폴백=단색.
  function makeWaterTex() {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); if (!x) return null;
    let s = 53; const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    x.fillStyle = '#3f6f8f'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 44; i++) {
      const y = rnd() * 128, amp = 2 + rnd() * 6, k = 1 + (rnd() * 2 | 0), a = 0.05 + rnd() * 0.07;
      x.strokeStyle = `rgba(${175 + (rnd() * 40 | 0)},${212 + (rnd() * 35 | 0)},${216 + (rnd() * 30 | 0)},${a})`;
      x.lineWidth = 1 + rnd() * 1.4; x.beginPath();
      for (let px = 0; px <= 128; px += 6) { const py = y + Math.sin((px / 128) * 6.2832 * k) * amp; if (px === 0) x.moveTo(px, py); else x.lineTo(px, py); }
      x.stroke();
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
    return tex;
  }

  // ── [그래픽 향상 1단계] 절차 지면 텍스처 + 노멀맵 (감독 지시: "AO·노멀·땅 재질이 밋밋") ──
  // 자기완결(외부 이미지 0) — sky.js처럼 캔버스 절차 생성. diffuse(색·패턴) + 높이맵→노멀맵(요철 라이팅).
  // 생성 1회(런타임 0), 타일 repeat. 저사양은 텍스처 128(정상 256). 비-DOM 폴백=null(단색 유지).
  function heightToNormal(hc, S, strength) {
    const hx = hc.getContext('2d'); const src = hx.getImageData(0, 0, S, S).data;
    const out = document.createElement('canvas'); out.width = out.height = S; const ox = out.getContext('2d');
    const dst = ox.createImageData(S, S);
    const h = (x, y) => src[((((y % S) + S) % S) * S + (((x % S) + S) % S)) * 4] / 255; // R=높이, wrap(타일 이음새 연속)
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dhx = (h(x + 1, y) - h(x - 1, y)) * strength, dhy = (h(x, y + 1) - h(x, y - 1)) * strength;
      let nx = -dhx, ny = -dhy, nz = 1; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const i = (y * S + x) * 4;
      dst.data[i] = (nx * 0.5 + 0.5) * 255; dst.data[i + 1] = (ny * 0.5 + 0.5) * 255; dst.data[i + 2] = (nz * 0.5 + 0.5) * 255; dst.data[i + 3] = 255;
    }
    ox.putImageData(dst, 0, 0); return out;
  }
  function makeGroundTex(kind, seed, repeat) {
    if (typeof document === 'undefined') return null;
    const S = gpuInfo.soft ? 128 : 256;
    let s = seed | 0; const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const dc = document.createElement('canvas'); dc.width = dc.height = S; const d = dc.getContext('2d');
    const hc = document.createElement('canvas'); hc.width = hc.height = S; const h = hc.getContext('2d', { willReadFrequently: true }); // heightToNormal이 이 캔버스를 getImageData 리드백 → willReadFrequently
    h.fillStyle = '#808080'; h.fillRect(0, 0, S, S); // 높이 중립(회색)
    let strength = 2.2;
    // [P1] 3×3 토러스 중복 드로우 — 프리미티브를 (dx,dy)∈{-S,0,S} 오프셋으로 겹쳐 그려 RepeatWrapping 타일 이음새 제거. 생성 1회라 9배 비용 무관.
    const tile = (fn) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) fn(dx, dy); };
    const blob = (ctx, x, y, r, col) => tile((ox, oy) => { const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, 7); ctx.fill(); }); // [P1] blob도 seamless(잔디·모래·광장 공용)
    const strokeSeam = (ctx, x1, y1, x2, y2) => tile((ox, oy) => { ctx.beginPath(); ctx.moveTo(x1 + ox, y1 + oy); ctx.lineTo(x2 + ox, y2 + oy); ctx.stroke(); }); // [P1] 선분 seamless
    const rectSeam = (ctx, x, y, w, hh) => tile((ox, oy) => ctx.fillRect(x + ox, y + oy, w, hh)); // [P1] 반점·알갱이 seamless
    if (kind === 'grass') {
      d.fillStyle = '#7fa46a'; d.fillRect(0, 0, S, S);
      // [타일링 저감] 저주파 blob 반경·대비·alpha 축소(개수 90 유지 → rnd 소비 순서 보존). 베이스(127,164,106)에 근접시켜 "얼룩"→"은은한 변주". 고주파 풀결은 아래 유지.
      for (let i = 0; i < 90; i++) { const t = rnd(); blob(d, rnd() * S, rnd() * S, S * (0.03 + rnd() * 0.04), t < 0.5 ? `rgba(${110 + (rnd() * 20 | 0)},${142 + (rnd() * 18 | 0)},${96 + (rnd() * 16 | 0)},0.26)` : `rgba(${136 + (rnd() * 20 | 0)},${172 + (rnd() * 18 | 0)},${114 + (rnd() * 14 | 0)},0.22)`); }
      for (let i = 0; i < 420; i++) { const x = rnd() * S, y = rnd() * S, a = rnd() * 6.28, ln = 2 + rnd() * 4, x2 = x + Math.cos(a) * ln, y2 = y + Math.sin(a) * ln; // 풀 결
        d.strokeStyle = `rgba(${70 + (rnd() * 60 | 0)},${110 + (rnd() * 60 | 0)},${64 + (rnd() * 40 | 0)},0.6)`; d.lineWidth = 1.15; strokeSeam(d, x, y, x2, y2); // [P1]seamless [P2]선명도 lineWidth 0.8→1.15·alpha 0.5→0.6
        h.strokeStyle = `rgba(255,255,255,${0.12 + rnd() * 0.12})`; h.lineWidth = 0.8; strokeSeam(h, x, y, x2, y2); } // height stroke 현행 유지
      strength = 1.6;
    } else if (kind === 'sand') {
      d.fillStyle = '#d8c79a'; d.fillRect(0, 0, S, S);
      // [타일링 저감] 모래 blob 반경·대비·alpha 축소(개수 60 유지 → rnd 소비 순서 보존). 고주파 알갱이는 아래 유지.
      for (let i = 0; i < 60; i++) blob(d, rnd() * S, rnd() * S, S * (0.04 + rnd() * 0.05), rnd() < 0.5 ? `rgba(206,190,146,0.22)` : `rgba(222,206,166,0.20)`);
      for (let i = 0; i < 1400; i++) { const x = rnd() * S, y = rnd() * S, br = rnd(); // 알갱이
        d.fillStyle = br < 0.5 ? `rgba(180,164,120,0.5)` : `rgba(240,228,190,0.5)`; rectSeam(d, x, y, 1, 1); // [P1] 알갱이 seamless
        h.fillStyle = `rgba(255,255,255,${(br * 0.3).toFixed(2)})`; rectSeam(h, x, y, 1, 1); }
      strength = 1.2;
    } else if (kind === 'plaza') {
      d.fillStyle = '#cac3b6'; d.fillRect(0, 0, S, S);
      for (let i = 0; i < 40; i++) blob(d, rnd() * S, rnd() * S, S * (0.06 + rnd() * 0.1), `rgba(${180 + (rnd() * 30 | 0)},${174 + (rnd() * 26 | 0)},${160 + (rnd() * 24 | 0)},0.35)`);
      const tiles = 4, ts = S / tiles; // 타일 격자(이음새 홈)
      d.strokeStyle = 'rgba(120,114,104,0.5)'; d.lineWidth = 1.5; h.strokeStyle = 'rgba(60,60,60,0.9)'; h.lineWidth = 2.2;
      for (let i = 0; i <= tiles; i++) { const p = i * ts; d.beginPath(); d.moveTo(p, 0); d.lineTo(p, S); d.moveTo(0, p); d.lineTo(S, p); d.stroke(); h.beginPath(); h.moveTo(p, 0); h.lineTo(p, S); h.moveTo(0, p); h.lineTo(S, p); h.stroke(); }
      strength = 2.6;
    } else if (kind === 'road') {
      d.fillStyle = '#5b5e66'; d.fillRect(0, 0, S, S);
      for (let i = 0; i < 2000; i++) { const x = rnd() * S, y = rnd() * S, br = rnd(); // 아스팔트 반점
        d.fillStyle = br < 0.5 ? `rgba(70,72,80,0.5)` : `rgba(108,112,120,0.4)`; rectSeam(d, x, y, 1, 1); // [P1] 반점 seamless
        h.fillStyle = `rgba(${br < 0.5 ? '40,40,40' : '210,210,210'},0.25)`; rectSeam(h, x, y, 1, 1); }
      // [P3] 저대비 크랙선 6~8개(약간 구부러진 폴리라인) — diffuse+height, tile()로 seamless
      const nCrack = 6 + (rnd() * 3 | 0);
      for (let i = 0; i < nCrack; i++) {
        const segs = 3 + (rnd() * 3 | 0); let cx = rnd() * S, cy = rnd() * S, ang = rnd() * 6.28; const pts = [[cx, cy]];
        for (let j = 0; j < segs; j++) { ang += (rnd() - 0.5) * 1.2; const len = 6 + rnd() * 14; cx += Math.cos(ang) * len; cy += Math.sin(ang) * len; pts.push([cx, cy]); }
        const crack = (ctx, style, lw) => { ctx.strokeStyle = style; ctx.lineWidth = lw; tile((ox, oy) => { ctx.beginPath(); ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy); for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0] + ox, pts[k][1] + oy); ctx.stroke(); }); };
        crack(d, 'rgba(38,40,46,0.5)', 1); crack(h, 'rgba(30,30,30,0.5)', 1.5); // 어두운 저대비 = 얕은 파임
      }
      // [P3] 타이어 자국 띠 2개(세로, 아주 옅은 명도차) — 세로 전체라 x축 3중 오프셋만(dy 중복 시 alpha 누적 방지)
      for (let i = 0; i < 2; i++) {
        const bx = (0.22 + i * 0.4 + rnd() * 0.16) * S, bw = S * (0.05 + rnd() * 0.03);
        d.fillStyle = 'rgba(40,42,48,0.13)'; for (const ox of [-S, 0, S]) d.fillRect(bx + ox, 0, bw, S);
        h.fillStyle = 'rgba(40,40,40,0.10)'; for (const ox of [-S, 0, S]) h.fillRect(bx + ox, 0, bw, S);
      }
      strength = 1.8; // [P3] 형태감 보강 1.4→1.8
    } else if (kind === 'bridge') {
      d.fillStyle = '#8a7a64'; d.fillRect(0, 0, S, S);
      const planks = 5, pw = S / planks; // 판자 세로 줄
      for (let i = 0; i < planks; i++) { const x0 = i * pw; d.fillStyle = `rgba(${130 + (rnd() * 30 | 0)},${112 + (rnd() * 26 | 0)},${88 + (rnd() * 20 | 0)},0.5)`; d.fillRect(x0, 0, pw, S);
        for (let j = 0; j < 40; j++) { const yy = rnd() * S; d.strokeStyle = `rgba(90,76,56,0.3)`; d.lineWidth = 0.6; d.beginPath(); d.moveTo(x0 + 1, yy); d.lineTo(x0 + pw - 1, yy + (rnd() - 0.5) * 4); d.stroke(); } }
      h.strokeStyle = 'rgba(40,40,40,0.9)'; h.lineWidth = 2; // 판자 사이 홈
      for (let i = 0; i <= planks; i++) { const p = i * pw; h.beginPath(); h.moveTo(p, 0); h.lineTo(p, S); h.stroke(); }
      strength = 2.4;
    } else { d.fillStyle = '#888'; d.fillRect(0, 0, S, S); }
    const map = new THREE.CanvasTexture(dc); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = gpuInfo.soft ? 1 : 4;
    const nMap = new THREE.CanvasTexture(heightToNormal(hc, S, strength)); nMap.wrapS = nMap.wrapT = THREE.RepeatWrapping; nMap.anisotropy = gpuInfo.soft ? 1 : 4;
    if (repeat) { map.repeat.set(repeat, repeat); nMap.repeat.set(repeat, repeat); }
    return { map, normalMap: nMap };
  }
  // 지면 재질에 텍스처 주입(kind별 repeat = 24m 셀 / 타일 미터). 실패(비-DOM)면 단색 유지.
  function applyGroundTex(mat, kind, seed, repeat, nScale) {
    const t = makeGroundTex(kind, seed, repeat); if (!t) return;
    const ns = (nScale == null) ? 0.8 : nScale; // [P4] kind별 normalScale(기본 0.8 유지)
    mat.map = t.map; mat.normalMap = t.normalMap; mat.normalScale = new THREE.Vector2(ns, ns); mat.needsUpdate = true;
  }

  // 지면·도로·물·다리 공유 재질(파셀 복제 방지) — dispose()에서 일괄 회수.
  const T = {
    // [타일링 저감] vertexColors=파셀별 지면 색 미세 변주(대면적 통짜 반복 은폐). 재질 공유·드로우콜 불변.
    // 사용처는 대지 박스 gm(loadParcel) 단 한 곳 — 모든 gm에 color attribute 주입(정점색 누락 시 검은 지면 회귀 방지).
    grass: new THREE.MeshStandardMaterial({ color: 0x7fa46a, vertexColors: true, roughness: 1.0, metalness: 0 }),
    plaza: new THREE.MeshStandardMaterial({ color: 0xcac3b6, vertexColors: true, roughness: 0.95, metalness: 0 }),
    road: new THREE.MeshStandardMaterial({ color: 0x5b5e66, roughness: 0.98, metalness: 0 }),
    bridge: new THREE.MeshStandardMaterial({ color: 0x8a7a64, roughness: 0.9, metalness: 0 }),
    water: new THREE.MeshStandardMaterial({ color: 0x3f6f8f, roughness: 0.32, metalness: 0.12, transparent: true, opacity: 0.92 }),
    // [해안] 모래 해변(경계 파셀 경사) — 따뜻한 베이지, 완전 무광. dispose()에서 일괄 회수.
    sand: new THREE.MeshStandardMaterial({ color: 0xd8c79a, roughness: 1.0, metalness: 0 }),
    // [부두] 목재 데크·기둥·난간 공용 — 잔교 목조 톤(가로등 진회색과 대비). vertexColors로 판/기둥 명암 변주.
    pierWood: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 }),
    // [테트라포드] 회색 콘크리트 소파블록 — 거친 무광. InstancedMesh 단일 재질(드로우콜 1).
    concrete: new THREE.MeshStandardMaterial({ color: 0x9ea3a6, roughness: 0.95, metalness: 0 }),
    // 거리 가구 공유 재질 — 파스텔 중채도(치비 세계관). dispose()에서 일괄 회수.
    // (가로수 수피/잎 재질은 scene.js sharedTreeMats가 소유 — 여기서 만들지 않는다.)
    lampPost: new THREE.MeshStandardMaterial({ color: 0x353842, roughness: 0.6, metalness: 0.3 }), // 진회색 기둥
    lampHead: new THREE.MeshStandardMaterial({ color: 0x6b5836, roughness: 0.5, metalness: 0.2, emissive: 0xffcf8a, emissiveIntensity: 0.8 }), // 웜톤 갓(실제 THREE.Light 0 — 라이브 규율 계승)
    benchWood: new THREE.MeshStandardMaterial({ color: 0x9a8461, roughness: 0.85, metalness: 0 }),
    planterVC: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }), // 테라코타 화분 + 녹색 관목(정점색)
    // [해안 2단계 등대] 탑 홍백 줄무늬(정점색) · 등롱 유리방(발광) · 회전 서치라이트 콘(가산 발광, 조명 0).
    lighthouseVC: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 }),
    lantern: new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe08a, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0 }),
    // 회전 빛 = 발광 콘 메시(additive·depthWrite false) — 실제 THREE.Light 0(라이트 풀 개수 불변 원칙 계승, 재컴파일 0).
    beam: new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.20, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  };
  // [그래픽 1단계] 지면 절차 텍스처+노멀 주입 — repeat = 24m 셀 / 타일 미터(잔디 4m·모래 4m·광장 6m·도로 8m).
  // 도로 strip(24×2.5)은 폭 방향 왜곡이 있으나 아스팔트라 방향성 약해 무해(스크린샷 확인). 색은 텍스처가 대체.
  applyGroundTex(T.grass, 'grass', 0x6721a, 6, 1.0);   // [P4] 잔디 요철 강조
  applyGroundTex(T.plaza, 'plaza', 0x51b3c, 4, 0.7);   // [P4] 광장 매끈
  applyGroundTex(T.road, 'road', 0x3d0e7, 3, 0.9);     // [P4]
  applyGroundTex(T.sand, 'sand', 0x9a44c, 6, 0.9);     // [P4]
  applyGroundTex(T.bridge, 'bridge', 0x8a7c1, 2, 0.8); // [P4]
  T.grass.color.setHex(0xffffff); T.plaza.color.setHex(0xffffff); T.road.color.setHex(0xffffff); T.sand.color.setHex(0xffffff); T.bridge.color.setHex(0xffffff); // 텍스처가 색 담당(color=흰=텍스처 원색)
  // [A-2 스폰 워밍] 지면 텍스처 준비와 같은 초기 로드(로딩 화면 중) 구간에서 건물 마감 3종(plaster/concrete/parquet)
  // base 텍스처를 미리 베이크해 space-render _texCache를 데워둔다. → 세션 중 그 마감을 처음 요구하는 파셀 로드
  // 프레임의 동기 512² 베이크(예산 밖 히칭)를 제거. 비-DOM(순수 node)에서는 캔버스 생성 불가라 스킵(폴백 무영향).
  if (typeof document !== 'undefined') warmBuildingTexCache();
  // 거리 가구 공유 지오메트리(파셀 간 재사용 — InstancedMesh/개별 Mesh가 참조). createWorld dispose에서 회수.
  const paintGeo = (g, hex) => {
    const c = new THREE.Color(hex), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3)); return g;
  };
  // [타일링 저감] 파셀 지면 정점색 미세 변주 — 흰(1,1,1) 근처 RGB 스케일을 지오 전체에 균일 주입(map 색과 곱).
  // 파셀 (px,pz) 좌표 해시 시드 → mulberry32(결정론·Math.random 금지). 잔디는 초록쪽 살짝 편향.
  const tintGeo = (g, r, gg, b) => {
    const n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = r; arr[i * 3 + 1] = gg; arr[i * 3 + 2] = b; }
    g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3)); return g;
  };
  const parcelTint = (px, pz, isPlaza) => {
    let s = (Math.imul(px, 374761393) ^ Math.imul(pz, 668265263)) >>> 0; // 좌표 해시(음수 px/pz 안전)
    const rn = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const base = 0.95 + rn() * 0.10; // 전체 밝기 0.95~1.05
    let r = base + (rn() - 0.5) * 0.06, g = base + (rn() - 0.5) * 0.06, b = base + (rn() - 0.5) * 0.06; // 채널 미세차 → 대략 0.92~1.08
    if (!isPlaza) { g += 0.03; b -= 0.02; } // 잔디 초록 편향
    return [r, g, b];
  };
  // [등대] 높이(y) 밴드 정점색 — 홍백 줄무늬(band 짝/홀 hexA/hexB). 머지 호환 위해 color 속성 부여.
  const paintBandsY = (g, y0, bandH, hexA, hexB) => {
    const ca = new THREE.Color(hexA), cb = new THREE.Color(hexB), pos = g.attributes.position, n = pos.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const band = Math.floor((pos.getY(i) - y0) / bandH); const c = (band % 2 === 0) ? ca : cb; arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3)); return g;
  };
  const SG = (() => {
    const lampPost = new THREE.CylinderGeometry(0.06, 0.09, 3.0, 8); lampPost.translate(0, 1.5, 0);
    const lampHead = new THREE.SphereGeometry(0.22, 10, 8); lampHead.scale(1, 0.8, 1); lampHead.translate(0, 3.06, 0);
    const seat = new THREE.BoxGeometry(1.4, 0.09, 0.44); seat.translate(0, 0.45, 0);
    const bLegL = new THREE.BoxGeometry(0.12, 0.42, 0.4); bLegL.translate(-0.58, 0.21, 0);
    const bLegR = new THREE.BoxGeometry(0.12, 0.42, 0.4); bLegR.translate(0.58, 0.21, 0);
    const bench = mergeGeometries([seat, bLegL, bLegR]); [seat, bLegL, bLegR].forEach((g) => g.dispose());
    const pot = new THREE.CylinderGeometry(0.28, 0.2, 0.42, 12); pot.translate(0, 0.21, 0);
    const bush = new THREE.SphereGeometry(0.3, 10, 8); bush.scale(1, 0.92, 1); bush.translate(0, 0.62, 0);
    const planter = mergeGeometries([paintGeo(pot, 0x9a5b43), paintGeo(bush, 0x4c6b42)]); pot.dispose(); bush.dispose();
    return { lampPost, lampHead, bench, planter };
  })();

  // [테트라포드] 방파제 소파블록 공유 지오 — 중심 허브(정이십면체) + 정사면체 4방향 다리(원뿔대).
  // 실물 테트라포드처럼 4발이 서로 109.5° 벌어진다(정사면체 꼭지점 방향). InstancedMesh가 이 단일
  // 지오를 위치·회전·스케일 변주로 대량 배치 → 드로우콜 1(파셀당). 자작 지오·자기완결(외부 에셋 0).
  const TETRA_GEO = (() => {
    const dirs = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((v) => new THREE.Vector3(v[0], v[1], v[2]).normalize());
    const parts = [new THREE.IcosahedronGeometry(0.44, 0)]; // 중심 허브
    const up = new THREE.Vector3(0, 1, 0);
    for (const d of dirs) {
      const len = 1.15;
      // toNonIndexed — 허브(Icosahedron)는 non-indexed, Cylinder는 indexed라 머지 호환 위해 통일.
      const leg = new THREE.CylinderGeometry(0.17, 0.34, len, 6).toNonIndexed(); // 끝 가늘게·뿌리 굵게
      leg.translate(0, len / 2, 0);                              // 뿌리를 원점에
      const q = new THREE.Quaternion().setFromUnitVectors(up, d); // +Y → 다리 방향
      leg.applyQuaternion(q);
      parts.push(leg);
    }
    const g = mergeGeometries(parts); parts.forEach((p) => p.dispose());
    g.computeBoundingSphere(); g.computeBoundingBox(); // InstancedMesh.computeBoundingSphere가 지오 bound를 참조
    return g; // 발끝~발끝 반경 ~1.3m
  })();

  // 거리 가구 배치 배열(def.street) → 렌더 Mesh + solid AABB(같은 데이터 파생 = 렌더-물리 정합).
  // shellOnly(대각 임포스터) 파셀은 생략(원거리 draw call 절약). 반환: 회수 대상 Mesh 배열.
  function buildStreet(street, group, ox, oz, solids, own) {
    const meshes = [];
    // 가로수 — 미술관과 동일한 디테일 트리(scene.js buildDetailedTree: 수피 텍스처 + 재귀 가지
    // + 알파 잎 클러스터). 나무당 부품이 많아 그대로 두면 드로우콜이 폭발하므로, 파셀의 전 그루를
    // 한 forest 그룹에 모아 월드 변환을 굽고 머티리얼별(수피 1 + 잎 최대 3)로 병합한다
    // (scene.js 숲 병합 기법 재사용). 병합 지오는 파셀 소유 → own에 담아 언로드에서 dispose.
    const trees = street.filter((s) => s.kind === 'tree');
    if (trees.length) {
      const forest = new THREE.Group();
      trees.forEach((s, i) => {
        // 외형·회전 시드 결정론(파셀 오프셋 ⊕ 인덱스) — 모든 방문자 동일 세계(무저장 규율).
        const tseed = (((ox * 73856093) ^ (oz * 19349663) ^ ((i + 1) * 83492791)) >>> 0);
        const dt = buildDetailedTree(tseed, { trunkLen: 2.6, trunkRad: 0.22, maxLevel: 2, leafScale: 0.85 });
        dt.position.set(ox + s.x, 0, oz + s.z);
        dt.rotation.y = (tseed % 6283) / 1000; // 0~2π 결정론
        forest.add(dt);
        solids.push({ x: ox + s.x, z: oz + s.z, ex: 0.25, ez: 0.25, bottom: 0, top: 2.0 }); // 줄기 충돌
      });
      // 드로우콜 절감: 파셀 내 잎(알파 재질)을 단일 참조로 통일 → bakeGroupByMaterial의 잎 버킷
      // 3→1(파셀당 나무 = 수피 1 + 잎 1). 파셀 간·나무 간 형태 다양성은 시드로 유지되고, 잎 색 변주만
      // 파셀 내에서 단일화(원경 가로수라 손실 미미). scene.js 무접촉 — 공유 잎 재질(sharedTreeMats)의
      // 참조를 world.js가 좁힐 뿐이라 미술관 나무는 3종 유지(팀장 서명: 옵션 A).
      let leafMat = null;
      forest.traverse((o) => {
        if (o.isMesh && o.material && o.material.alphaTest > 0) { // 잎(alphaTest 0.35) — 수피(bark)는 alphaTest 없음
          if (!leafMat) leafMat = o.material; else o.material = leafMat;
        }
      });
      // 파셀 단위 재질별 병합 → 파셀당 수피 1 + 잎 1 드로우콜(나무 그루수와 무관).
      for (const m of bakeGroupByMaterial(forest)) {
        group.add(m); meshes.push(m); own.push(m.geometry); // 병합 지오 = 파셀 소유(언로드 dispose)
      }
    }
    for (const s of street) {
      if (s.kind === 'lamp') {
        const post = new THREE.Mesh(SG.lampPost, T.lampPost); post.position.set(ox + s.x, 0, oz + s.z); post.castShadow = true;
        const head = new THREE.Mesh(SG.lampHead, T.lampHead); head.position.set(ox + s.x, 0, oz + s.z);
        group.add(post, head); meshes.push(post, head);
        solids.push({ x: ox + s.x, z: oz + s.z, ex: 0.22, ez: 0.22, bottom: 0, top: 3.0 }); // 기둥 충돌
      } else if (s.kind === 'bench') {
        const b = new THREE.Mesh(SG.bench, T.benchWood); b.position.set(ox + s.x, 0, oz + s.z); b.rotation.y = s.ry || 0;
        b.castShadow = true; b.receiveShadow = true; group.add(b); meshes.push(b);
        const c = Math.abs(Math.cos(s.ry || 0)), sn = Math.abs(Math.sin(s.ry || 0));
        solids.push({ x: ox + s.x, z: oz + s.z, ex: 0.7 * c + 0.22 * sn, ez: 0.7 * sn + 0.22 * c, bottom: 0, top: 0.5 }); // top 0.5 > STEP_OVER
      } else if (s.kind === 'planter') {
        const p = new THREE.Mesh(SG.planter, T.planterVC); p.position.set(ox + s.x, 0, oz + s.z); p.castShadow = true;
        group.add(p); meshes.push(p);
        solids.push({ x: ox + s.x, z: oz + s.z, ex: 0.3, ez: 0.3, bottom: 0, top: 0.9 });
      }
    }
    return meshes;
  }

  // ── [해안 패키지] 해변·부두·테트라포드 빌더 (경계 파셀 물가) ────────────────────
  // 공통: 파셀 로컬 좌표(원점=파셀 중심)에 ox/oz를 더해 월드 배치. dir ∈ {N,S,E,W} = 바깥 경계 방향.
  const edgeSign = (dir) => (dir === 'S' || dir === 'E') ? 1 : -1;      // 바깥 방향 부호
  const edgeHoriz = (dir) => (dir === 'N' || dir === 'S');             // 가장자리가 x축과 평행(경사=z)

  // 위 향한 quad(A,B 안쪽 y=0 / C,D 바깥 y낮음) → 두 삼각형. computeVertexNormals로 조명·그림자.
  // [교차리뷰 결함 수정] winding [A,C,B]+[A,D,C] — 기존 [A,B,C]+[A,C,D]는 4방향(N/S/E/W) 모두
  // 아래(-y) 법선을 생성(three computeVertexNormals 공식 (C-B)×(A-B)로 검산: sign>0 (0,-192,-32.4)
  // / sign<0 (0,-192,32.4), y음수). T.sand는 FrontSide라 위에서 보면 백페이스 컬링으로 해변 슬로프가
  // 렌더되지 않았다. quad는 평면이라 삼각형 winding 반전 = 법선 반전 → 4방향 모두 +y(위) 법선.
  function quadGeo(A, B, C, D) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...A, ...C, ...B, ...A, ...D, ...C]), 3));
    g.computeVertexNormals();
    return g;
  }

  // [해안] 경계 파셀 바깥 가장자리 모래 해변 — 지면(0)에서 물가(BEACH_TOE)로 완만히 하강.
  // 지오는 파셀 소유(own) 머지(T.sand), 물리는 beachBands가 소유(groundGroundAt 참조 — 도보 하강/상승).
  function buildBeach(edges, group, ox, oz, own, beachBands) {
    const geos = [];
    for (const dir of edges) {
      const horiz = edgeHoriz(dir), sign = edgeSign(dir);
      if (horiz) {
        const ez = oz + sign * CELLZ / 2, outZ = ez + sign * BEACH_W, x0 = ox - CELLX / 2, x1 = ox + CELLX / 2;
        // winding: 위(+y) 법선이 나오도록 sign에 따라 정점 순서 뒤집기.
        geos.push(sign > 0
          ? quadGeo([x0, 0, ez], [x1, 0, ez], [x1, BEACH_TOE, outZ], [x0, BEACH_TOE, outZ])
          : quadGeo([x1, 0, ez], [x0, 0, ez], [x0, BEACH_TOE, outZ], [x1, BEACH_TOE, outZ]));
        beachBands.push({ horiz: true, sign, lo: x0, hi: x1, edge: ez, width: BEACH_W });
      } else {
        const ex = ox + sign * CELLX / 2, outX = ex + sign * BEACH_W, z0 = oz - CELLZ / 2, z1 = oz + CELLZ / 2;
        geos.push(sign > 0
          ? quadGeo([ex, 0, z1], [ex, 0, z0], [outX, BEACH_TOE, z0], [outX, BEACH_TOE, z1])
          : quadGeo([ex, 0, z0], [ex, 0, z1], [outX, BEACH_TOE, z1], [outX, BEACH_TOE, z0]));
        beachBands.push({ horiz: false, sign, lo: z0, hi: z1, edge: ex, width: BEACH_W });
      }
    }
    if (!geos.length) return null;
    const merged = geos.length > 1 ? mergeGeometries(geos) : geos[0];
    if (geos.length > 1) geos.forEach((g) => g.dispose());
    const m = new THREE.Mesh(merged, T.sand); m.receiveShadow = true;
    group.add(m); own.push(merged);
    return m;
  }

  // [부두] 목재 데크가 바다로 돌출 — 데크판 + 기둥(파일) + 양옆 난간. 전부 머지 → 드로우콜 1.
  // 데크 위 도보(pierDecks 물리), 난간은 solid(추락 방지, 끝단은 열려 바다 급락으로 자연 정지).
  function buildPier(dir, group, ox, oz, own, solids, pierDecks) {
    const horiz = edgeHoriz(dir), sign = edgeSign(dir);
    const edge = horiz ? CELLZ / 2 : CELLX / 2;
    // 데크 중심(파셀 로컬) — 가장자리에서 바깥으로 PIER_LEN/2.
    const dcx = horiz ? 0 : sign * (edge + PIER_LEN / 2);
    const dcz = horiz ? sign * (edge + PIER_LEN / 2) : 0;
    const spanW = horiz ? PIER_W : PIER_LEN;  // x폭
    const spanD = horiz ? PIER_LEN : PIER_W;  // z폭
    const parts = [];
    // 데크판 — 상면 PIER_DECK_Y, 두께 0.16.
    const deck = new THREE.BoxGeometry(spanW, 0.16, spanD); deck.translate(dcx, PIER_DECK_Y - 0.08, dcz);
    parts.push(paintGeo(deck, 0x9a7d55));
    // 기둥(파일) — 데크 양옆 세로줄, 바다바닥(SEA_Y-0.6)까지. 길이축으로 4쌍.
    const railHalf = (horiz ? spanW : spanD) / 2 - 0.18; // 난간/기둥 반폭(데크 가장자리 안쪽)
    const pileTop = PIER_DECK_Y, pileBot = SEA_Y - 0.6, pileH = pileTop - pileBot;
    const along = PIER_LEN, N = 4;
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N; // 0..1 데크 길이 위치
      const a = -PIER_LEN / 2 + t * PIER_LEN; // 로컬 길이축(중심 기준)
      for (const s of [-1, 1]) {
        const px2 = horiz ? (dcx + s * railHalf) : (dcx + a);
        const pz2 = horiz ? (dcz + a) : (dcz + s * railHalf);
        const pile = new THREE.CylinderGeometry(0.13, 0.15, pileH, 6);
        pile.translate(px2, pileBot + pileH / 2, pz2);
        parts.push(paintGeo(pile, 0x6f5636));
        // 난간 세로기둥(데크 위 1.0m)
        const post = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 5);
        post.translate(px2, PIER_DECK_Y + 0.5, pz2);
        parts.push(paintGeo(post, 0x8a6f4c));
      }
    }
    // 난간 가로레일 — 양옆 상단(데크 위 0.95). 길이축 방향 긴 박스.
    for (const s of [-1, 1]) {
      const rx = horiz ? (dcx + s * railHalf) : dcx;
      const rz = horiz ? dcz : (dcz + s * railHalf);
      const rail = new THREE.BoxGeometry(horiz ? 0.08 : along, 0.08, horiz ? along : 0.08);
      rail.translate(rx, PIER_DECK_Y + 0.95, rz);
      parts.push(paintGeo(rail, 0x8a6f4c));
      // 난간 solid(추락 방지) — 데크 상면부터 위로. 끝단은 열림.
      solids.push({
        x: ox + rx, z: oz + rz,
        ex: (horiz ? 0.12 : along / 2), ez: (horiz ? along / 2 : 0.12),
        bottom: PIER_DECK_Y, top: PIER_DECK_Y + 1.05,
      });
    }
    const merged = mergeGeometries(parts); parts.forEach((p) => p.dispose());
    const m = new THREE.Mesh(merged, T.pierWood); m.castShadow = true; m.receiveShadow = true;
    m.position.set(ox, 0, oz); group.add(m); own.push(merged);
    // 데크 도보 물리 — AABB(끝단 여유 -0.2로 난간 안쪽만 걷도록).
    pierDecks.push({ cx: ox + dcx, cz: oz + dcz, ex: spanW / 2, ez: spanD / 2, y: PIER_DECK_Y });
    return m;
  }

  // [테트라포드] 물가 방파제 클러스터 — 단일 지오(TETRA_GEO)를 InstancedMesh로 대량(드로우콜 1).
  // 배치 배열(def.tetra)은 world-gen이 시드 결정론으로 산출(위치·회전·스케일). 반쯤 잠긴 배치(팀장).
  function buildTetrapods(arr, group, ox, oz) {
    const inst = new THREE.InstancedMesh(TETRA_GEO, T.concrete, arr.length);
    inst.castShadow = true; inst.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
    arr.forEach((t, i) => {
      e.set(t.rx || 0, t.ry || 0, t.rz || 0); q.setFromEuler(e);
      // world-gen은 바다수면 대비 상대 y(yRel)를 넘김 → SEA_Y를 더해 절대 배치(SEA_Y 단일 소스, 드리프트 방지).
      sv.set(t.s || 1, t.s || 1, t.s || 1); pv.set(ox + t.x, SEA_Y + (t.yRel || 0), oz + t.z);
      m.compose(pv, q, sv); inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    group.add(inst);
    return inst;
  }

  // [해안 2단계 등대] 물가 육지 모서리에 랜드마크 — 테이퍼 원통 탑(홍백 줄무늬) + 갤러리 난간 + 갓 +
  // 등롱(유리방 발광) + 회전 서치라이트 콘. 정적부는 머지(드로우콜 1), 등롱·회전빔은 별도 재질.
  // 회전 빛은 발광 콘 메시(additive)라 실제 THREE.Light 0 → 라이트 풀 개수 불변 원칙 훼손 없음(재컴파일 0).
  // dir = 접한 바다 경계 방향. 자작 지오·자기완결(외부 에셋 0). 반환: { beam }(update 회전 대상).
  function buildLighthouse(dir, group, ox, oz, own, solids) {
    const horiz = edgeHoriz(dir), sign = edgeSign(dir);
    // 경계(물가) 가장자리 안쪽 2.4m에 배치 — 탑 발치가 육지, 등롱이 바다를 향한다.
    const lx = ox + (horiz ? 0 : sign * (CELLX / 2 - 2.4));
    const lz = oz + (horiz ? sign * (CELLZ / 2 - 2.4) : 0);
    const TH = 9, botR = 1.5, topR = 1.0;         // 탑 높이·하단/상단 반경(테이퍼)
    const parts = [];
    // 탑(측벽만 open-ended) — 홍백 줄무늬(밴드 1.5m). heightSegments로 밴드 경계 정점 확보.
    const tower = new THREE.CylinderGeometry(topR, botR, TH, 16, 12, true); tower.translate(0, TH / 2, 0);
    parts.push(paintBandsY(tower, 0, 1.5, 0xd94b4b, 0xf4f0ea));
    // 갤러리 바닥 디스크(등롱 받침)
    const gallery = new THREE.CylinderGeometry(topR + 0.55, topR + 0.55, 0.22, 16); gallery.translate(0, TH + 0.11, 0);
    parts.push(paintGeo(gallery, 0x3c4048));
    // 갤러리 난간(토러스 링)
    const rail = new THREE.TorusGeometry(topR + 0.5, 0.06, 6, 20); rail.rotateX(Math.PI / 2); rail.translate(0, TH + 0.7, 0);
    parts.push(paintGeo(rail, 0x2a2d34));
    // 갓(원뿔 지붕) — 등롱 위
    const roof = new THREE.ConeGeometry(topR + 0.35, 1.3, 16); roof.translate(0, TH + 2.75, 0);
    parts.push(paintGeo(roof, 0x8a2f2f));
    const merged = mergeGeometries(parts); parts.forEach((p) => p.dispose());
    const body = new THREE.Mesh(merged, T.lighthouseVC); body.castShadow = true; body.receiveShadow = true;
    body.position.set(lx, 0, lz); group.add(body); own.push(merged);
    // 등롱(유리방 발광) — 별도 재질(emissive)
    const lanternGeo = new THREE.CylinderGeometry(topR, topR, 1.5, 16); own.push(lanternGeo);
    const lantern = new THREE.Mesh(lanternGeo, T.lantern); lantern.position.set(lx, TH + 1.55, lz); group.add(lantern);
    // 회전 서치라이트 콘 — 옆으로 누운 발광 콘(등롱에서 수평 방출). update에서 y축 회전(무료).
    // 길이 26m(감독: 바다 멀리 뻗는 등대감) — ConeGeometry 꼭지점 수렴이라 끝으로 갈수록 자연 페이드.
    // 지오 1개 스케일이라 드로우콜·programs 불변(THREE.Light 0 — 라이트 풀 원칙 유지).
    const beamGeo = new THREE.ConeGeometry(1.9, 26, 4, 1, true); beamGeo.rotateZ(Math.PI / 2); beamGeo.translate(13, 0, 0); own.push(beamGeo);
    const beam = new THREE.Mesh(beamGeo, T.beam); beam.position.set(lx, TH + 1.55, lz); beam.renderOrder = 2; group.add(beam);
    // solid(탑 충돌) — 원통 근사 AABB
    solids.push({ x: lx, z: lz, ex: botR, ez: botR, bottom: 0, top: TH });
    return { beam };
  }

  // ── 파셀 인덱스 / 로드 상태 ──
  const keyOf = (px, pz) => px + ',' + pz;
  const index = new Map();  // "px,pz" → def({px,pz,space,npc?})
  for (const d of parcels) index.set(keyOf(d.px, d.pz), d);
  const loaded = new Map(); // "px,pz" → { group, def, ox, oz, dims, solids, crowd, avatars, lod }
  let mp = null; // 실시간 멀티플레이어(opts.mp 지정 + window.Peer 존재 시 생성)
  let mpConnected = false; // [프라이버시 게이트] 사용자가 "함께 둘러보기" 입장 동의 전엔 connect 금지 → peer=null, IP 노출 0

  // ── [스트리밍 큐] 로드 시간분할(성능 단계1) — 히칭 완화 상태 ─────────────────────
  // 파셀 경계 통과 프레임에 신규 로드(나무·조명·섀도 재베이크)를 몰지 않고 큐에 넣어 update()
  // 프레임당 예산 내에서만 처리 → 스파이크 분산. 언로드는 즉시(저비용) 유지. 스폰·텔레포트·헤드리스
  // (기본)는 동기 즉시(빈 화면·결정론 테스트·getLoadedKeys 계약 무회귀). 큐는 렌더 순서만 바꾸고
  // 생성 결과는 동일 → 결정론 무영향(동기 경로의 최종 로드집합과 일치).
  const loadQueue = [];        // 지연 로드 job [{ k, px, pz, lod, prio }]
  const queued = new Set();    // 큐 중복 방지(파셀 키)
  const LOAD_BUDGET_MS = gpuInfo.soft ? 2.5 : 6; // 프레임당 큐 처리 예산(ms). 소프트웨어 렌더는 보수적.
  // 헤드리스는 기본 동기(결정론 무회귀). opts.streamAsync=true면 헤드리스도 큐 경로(성능 벤치 측정용 게이트).
  const streamAsync = !!opts.streamAsync;
  const perfNow = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  function parcelArts(def, ox, oz) {
    // NPC는 지면층 작품만 감상(상층 p.floor>0 제외 — NPC 단층 고정 계약)
    return (def.space.parts || []).filter((p) => p.t === 'artwork' && !(p.floor > 0)).map((p) => ({
      pos: { x: ox + p.x, y: 0, z: oz + p.z }, rotY: p.ry || 0, floorY: 0,
      title: (def.space.meta && def.space.meta.name) || '작품', featured: !!p.featured,
    }));
  }
  // [복셀스] 건물 4벽 → solid AABB 세그먼트(entries 방향은 문 폭 비움) — "방에 가두기"에서
  // "벽이 막기"로 반전. buildSpaceGroup의 벽 배열·문틀 분할과 동일 수식(렌더-물리 정합).
  function computeShellSolids(dims, entries, cx, cz) {
    const { fw, fd, hw, hd, t, totalH } = dims;
    const out = [], open = new Set(entries), DIRS = ['north', 'south', 'west', 'east'];
    [[0, -hd, fw + t, t], [0, hd, fw + t, t], [-hw, 0, t, fd - t], [hw, 0, t, fd - t]].forEach(([x, z, ww, dd], wi) => {
      const horiz = ww >= dd;
      const len = horiz ? ww : dd, thick = horiz ? dd : ww;
      if (open.has(DIRS[wi]) && len > DOOR_W + 0.8) {
        const side = (len - DOOR_W) / 2, off = DOOR_W / 2 + side / 2;
        for (const s of [-1, 1]) {
          const sx = x + (horiz ? s * off : 0), sz = z + (horiz ? 0 : s * off);
          out.push({ x: cx + sx, z: cz + sz, ex: (horiz ? side : thick) / 2, ez: (horiz ? thick : side) / 2, bottom: 0, top: totalH });
        }
        // [다층] 문은 지면층(f=0)에만 렌더됨(buildSpaceGroup) — 문 상공의 상층 벽(H~totalH)을 물리에도 복제(렌더-물리 정합, 검증 MINOR).
        if (dims.floors > 1) out.push({ x: cx + x, z: cz + z, ex: (horiz ? DOOR_W : thick) / 2, ez: (horiz ? thick : DOOR_W) / 2, bottom: dims.H, top: totalH });
      } else {
        out.push({ x: cx + x, z: cz + z, ex: ww / 2, ez: dd / 2, bottom: 0, top: totalH });
      }
    });
    return out;
  }
  // solid 파츠 → 월드 XZ AABB (visit.js solids 규칙을 파셀 오프셋으로 확장)
  function computeSolids(def, ox, oz, dims) {
    return (def.space.parts || []).filter((p) => PART_TYPES[p.t] && PART_TYPES[p.t].solid).map((p) => {
      const [w, h, d] = PART_TYPES[p.t].size;
      const c = Math.abs(Math.cos(p.ry || 0)), s = Math.abs(Math.sin(p.ry || 0));
      const ex = (w / 2) * c + (d / 2) * s, ez = (w / 2) * s + (d / 2) * c;
      const cy = (p.y != null) ? p.y : partY(p.t, dims.H) + (p.floor || 0) * dims.H; // [다층] p.floor 층 오프셋
      return { x: ox + p.x, z: oz + p.z, ex, ez, bottom: cy - h / 2, top: cy + h / 2 };
    });
  }

  function loadParcel(px, pz, lod) {
    const k = keyOf(px, pz); const def = index.get(k); if (!def) return;
    const ex = loaded.get(k);
    if (ex) { if (ex.lod === lod) return; unloadParcel(k); } // LOD 변경 시 재로드
    const ox = px * CELLX, oz = pz * CELLZ;
    const shellOnly = lod === 'shell';
    // [복셀스] 파셀 루트 = 지면(또는 다리) + 건물(있으면). own = 파셀 소유 지오(공유 재질 제외 회수).
    const group = new THREE.Group();
    const own = [];
    if (def.water) {
      // [해안] 강(내수면) — 파셀 소유 얕은 물타일(상면 RIVER_Y=-0.3). 바다(sea, SEA_Y=-1.2)와 분리해
      // 도시 운하는 얕게 유지(다리 0·강물 첨벙 -0.4 물리 정합). 재질은 바다와 공용(T.water 잔물결).
      const wg = new THREE.BoxGeometry(CELLX, 0.1, CELLZ); own.push(wg);
      const wm = new THREE.Mesh(wg, T.water); wm.position.set(ox, RIVER_Y - 0.05, oz); wm.receiveShadow = true; group.add(wm);
      const bg = new THREE.BoxGeometry(CELLX, 0.12, 3); own.push(bg); // 동서 다리(강 z 중앙)
      const bm = new THREE.Mesh(bg, T.bridge); bm.position.set(ox, -0.02, oz); bm.receiveShadow = true; group.add(bm);
    } else {
      const gg = new THREE.BoxGeometry(CELLX, 0.1, CELLZ); own.push(gg); // 대지(잔디/광장 — 결정론 믹스)
      const isPlaza = ((px * 7 + pz * 13) % 4 === 0);
      const tc = parcelTint(px, pz, isPlaza); tintGeo(gg, tc[0], tc[1], tc[2]); // [타일링 저감] 파셀별 색조 변주(정점색·map과 곱)
      const gm = new THREE.Mesh(gg, isPlaza ? T.plaza : T.grass);
      gm.position.set(ox, -0.056, oz); gm.receiveShadow = true; group.add(gm);
      const rgS = new THREE.BoxGeometry(CELLX, 0.1, 2.5); own.push(rgS); // 남 가장자리 도로(이웃 북측과 5m 도로망)
      const rs = new THREE.Mesh(rgS, T.road); rs.position.set(ox, -0.05, oz + CELLZ / 2 - 1.25); rs.receiveShadow = true; group.add(rs);
      const rgE = new THREE.BoxGeometry(2.5, 0.1, CELLZ); own.push(rgE); // 동 가장자리 도로
      const re = new THREE.Mesh(rgE, T.road); re.position.set(ox + CELLX / 2 - 1.25, -0.05, oz); re.receiveShadow = true; group.add(re);
    }
    let bldGroup = null, bld = null, dims = null, solids = [], floorsY = [0], stairBands = [], crowd = null, parcelLights = null;
    const avatars = new Map();
    if (def.space) {
      const bx = ox + (def.bx || 0), bz = oz + (def.bz || 0);
      bldGroup = buildSpaceGroup(def.space, { shellOnly, onAsyncTex: () => { if (!disposed) renderOnce(); } });
      bldGroup.position.set(bx, 0, bz);
      // [단계2 라이트 풀] AO 접촉그림자는 addRoomLighting(noSpots)이, 작품·다운라이트 스포트는 풀에서 배정
      // (씬 SpotLight 개수 고정 → 셰이더 재컴파일 0). 배정 라이트는 언로드 시 반납.
      if (!shellOnly) { addRoomLighting(bldGroup, { noSpots: true }); parcelLights = assignParcelLights(bx, bz, bldGroup.userData.dims, bldGroup.userData.partRefs || []); }
      group.add(bldGroup);
      dims = spaceDims(def.space);
      bld = { cx: bx, cz: bz, hw: dims.hw, hd: dims.hd }; // 건물 내부 판정용(지면 후보)
      floorsY = []; for (let f = 0; f < dims.floors; f++) floorsY.push(f * dims.H);
      stairBands = (def.space.shell.stairs || []).map((s) => ({
        xMin: bx + Math.min(s.x0, s.x1), xMax: bx + Math.max(s.x0, s.x1),
        z0: bz + s.z0, z1: bz + s.z1, yFrom: s.yFrom, yTo: s.yTo,
      }));
      solids = (shellOnly ? [] : computeSolids(def, bx, bz, dims))
        .concat(computeShellSolids(dims, def.space.shell.entries || [], bx, bz)); // 벽=충돌(문 구간 비움)
      if (!shellOnly && def.npc) {
        const arts = parcelArts(def, bx, bz);
        if (arts.length) crowd = new NpcCrowd(arts, def.npc.count || null, { roster: def.npc.roster });
      }
    }
    // 거리 가구 — 풀디테일 파셀만(대각 shell 임포스터는 생략). 배치·solid 동일 데이터 파생.
    let streetMeshes = null;
    if (!shellOnly && def.street && def.street.length) streetMeshes = buildStreet(def.street, group, ox, oz, solids, own);
    // [해안 패키지] 경계 파셀 물가 연출 — 해변(모든 경계방향, shell 포함해 원경 단차 연속) /
    //   부두·테트라포드(full 파셀만, 원경 shell은 드로우콜 절약 위해 생략). 배치는 시드 결정론(def.pier/tetra).
    let tetraMesh = null, lighthouse = null;
    const beachBands = [], pierDecks = [];
    if (!def.water) {
      const edges = [];
      if (px === minPx) edges.push('W');
      if (px === maxPx) edges.push('E');
      if (pz === minPz) edges.push('N');
      if (pz === maxPz) edges.push('S');
      if (edges.length) {
        buildBeach(edges, group, ox, oz, own, beachBands);
        if (!shellOnly && def.pier && edges.includes(def.pier.dir)) buildPier(def.pier.dir, group, ox, oz, own, solids, pierDecks);
        if (!shellOnly && def.tetra && def.tetra.length) tetraMesh = buildTetrapods(def.tetra, group, ox, oz);
        // [해안 2단계] 등대 — full 파셀만(원경 shell은 드로우콜 절약). 접한 경계 방향에만 배치.
        if (!shellOnly && def.lighthouse && edges.includes(def.lighthouse.dir)) lighthouse = buildLighthouse(def.lighthouse.dir, group, ox, oz, own, solids);
      }
    }
    // 거리 배회 NPC — 풀디테일 파셀 + 총원 ≤6. 라벨 없음(빈 닉네임 규약). 외형 시드 결정론.
    let walker = null;
    if (!shellOnly && def.walker && walkerTotal() < 6) {
      const wd = def.walker;
      const inst = createAvatarInstance(wd.char, '#ffffff', ''); // 빈 닉네임 → 라벨 미생성
      inst.group.position.set(ox + wd.x, 0, oz + wd.z);
      inst.group.userData.isWalker = true; // 검증·계수용 태그(스폰 시 walker 실측 등)
      scene.add(inst.group);
      walker = { inst, line: wd.line, ox, oz, x: ox + wd.x, z: oz + wd.z, tx: ox + wd.x, tz: oz + wd.z, ry: 0, state: 'walk', timer: 0, speed: 0.7 + Math.random() * 0.3 };
      pickWalkerTarget(walker);
    }
    scene.add(group);
    loaded.set(k, { group, bldGroup, own, def, ox, oz, dims, bld, solids, floorsY, stairBands, crowd, avatars, streetMeshes, walker, lod, px, pz, beachBands, pierDecks, tetraMesh, lights: parcelLights, lighthouse });
    requestShadowBake(); // [섀도 프리즈] 파셀 로드로 씬 지오가 바뀜 → 다음 프레임 1회 재베이크
  }

  function unloadParcel(k) {
    const L = loaded.get(k); if (!L) return;
    if (L.lights) for (const sl of L.lights) releaseLight(sl); // [단계2 라이트 풀] 스포트 소등·반납(개수 불변 — 재컴파일 0)
    if (L.crowd) { for (const a of L.avatars.values()) { scene.remove(a.inst.group); a.inst.dispose(); } }
    if (L.walker) { scene.remove(L.walker.inst.group); L.walker.inst.dispose(); } // 거리 배회 NPC 정리(씬 잔존 0)
    scene.remove(L.group);
    if (L.bldGroup) disposeSpaceGroup(L.bldGroup);
    // 거리 가구/가로수 정리: 씬 그래프에서 떼는 건 scene.remove(L.group)이 부모째 처리.
    // 병합 나무 메시·개별 가구(lamp/bench/planter)는 THREE.Mesh(Object3D)라 dispose 메서드가 없어
    // 아래 루프는 no-op 가드로 건너뛴다 — 나무 병합 BufferGeometry는 파셀 소유라 L.own에서 dispose하고,
    // 가구 공유 지오(SG)·재질(T·나무 sharedTreeMats)은 파셀 간 공유라 여기서 건드리지 않는다(createWorld dispose 일괄).
    if (L.streetMeshes) for (const sm of L.streetMeshes) if (sm.dispose) sm.dispose();
    // [테트라포드] InstancedMesh — instanceMatrix 버퍼만 회수(지오 TETRA_GEO·재질 concrete는 파셀 간 공유).
    if (L.tetraMesh) L.tetraMesh.dispose();
    for (const g of L.own) g.dispose(); // 파셀 소유 지오(해변·부두 머지 포함, 공유 재질 T는 dispose에서 일괄)
    loaded.delete(k);
    if (!disposed) requestShadowBake(); // [섀도 프리즈] 파셀 언로드도 씬 변화 → 재베이크(dispose 일괄 정리 중엔 불필요)
  }

  // ── [복셀스] 바다(월드 전체 아래 고정 물 평면 — 월드 밖·강 파셀에서 드러남) + 월드 소프트 경계 ──
  let minPx = Infinity, maxPx = -Infinity, minPz = Infinity, maxPz = -Infinity;
  for (const d of parcels) { minPx = Math.min(minPx, d.px); maxPx = Math.max(maxPx, d.px); minPz = Math.min(minPz, d.pz); maxPz = Math.max(maxPz, d.pz); }
  if (!parcels.length) { minPx = maxPx = minPz = maxPz = 0; }
  const seaGeo = new THREE.BoxGeometry((maxPx - minPx + 40) * CELLX, 0.1, (maxPz - minPz + 40) * CELLZ);
  const sea = new THREE.Mesh(seaGeo, T.water);
  // [해안] 바다(외해)를 지면 0보다 SEA_Y(-1.2)만큼 낮춰 확실한 단차(감독: "바다=땅 높이 어색").
  // 상면 = SEA_Y+0.05. 강(내수면)은 파셀 소유 물타일(RIVER_Y)로 분리 — loadParcel에서 렌더.
  sea.position.set(((minPx + maxPx) / 2) * CELLX, SEA_Y, ((minPz + maxPz) / 2) * CELLZ);
  scene.add(sea);
  // 강/바다 공용 재질(T.water=sea 평면 하나) — 잔물결 텍스처 붙이고 offset 스크롤로 흐름 연출.
  const waterTex = makeWaterTex();
  if (waterTex) {
    // 타일 ~6m. 축별로 셀 크기가 다른 비정사각 월드(CELLX≠CELLZ) 대비 U·V 반복을 각각 산출(정사각이면 동일).
    const wrx = Math.max(12, Math.round(((maxPx - minPx + 40) * CELLX) / 6));
    const wrz = Math.max(12, Math.round(((maxPz - minPz + 40) * CELLZ) / 6));
    waterTex.repeat.set(wrx, wrz);
    T.water.map = waterTex; T.water.color.set(0xffffff); T.water.needsUpdate = true;
  }
  const wMinX = (minPx - 0.9) * CELLX, wMaxX = (maxPx + 0.9) * CELLX;
  const wMinZ = (minPz - 0.9) * CELLZ, wMaxZ = (maxPz + 0.9) * CELLZ;
  const clampWorld = (x, z) => ({ x: Math.max(wMinX, Math.min(wMaxX, x)), z: Math.max(wMinZ, Math.min(wMaxZ, z)) });

  // ── 플레이어 상태 — 첫 파셀 건물 남문 앞 길에서 시작(건물을 바라봄) ──
  const first = parcels[0] || null;
  const pos = new THREE.Vector3(0, EYE, 0);
  let yaw = 0, pitch = 0;
  let groundY = 0; // 발이 딛는 지면 y(거리 0 / 건물 층 f*H / 강 -0.4). 카메라 y = groundY + EYE.
  if (first) {
    const bx = first.px * CELLX + (first.bx || 0), bz = first.pz * CELLZ + (first.bz || 0);
    const hd = first.space ? spaceDims(first.space).hd : 0;
    pos.set(bx, EYE, bz + hd + 2.2); yaw = 0; // 남쪽 길, 북쪽 건물 정면
  }

  function applyPose() {
    // [복셀스] 태양·스카이돔 플레이어 추종 — 모든 렌더 경로(walk/renderOnce/setPosition)에서 조명 정합.
    // [하늘 엔진] 태양 방향은 sky.js getSunDir()가 결정(그림 속 해·달 방위와 빛 방향 일치). 거리·플레이어 추종은 유지.
    if (skySystem) {
      const sd = skySystem.getSunDir();
      sun.position.set(pos.x + sd.x * SUN_DIST, sd.y * SUN_DIST, pos.z + sd.z * SUN_DIST);
    } else {
      sun.position.set(pos.x + 34, 58, pos.z + 20);
    }
    sun.target.position.set(pos.x, 0, pos.z); sun.target.updateMatrixWorld();
    sky.position.set(pos.x, 0, pos.z);
    camera.position.set(pos.x, pos.y, pos.z);
    const cp = Math.cos(pitch);
    const dir = new THREE.Vector3(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
    camera.lookAt(pos.x + dir.x, pos.y + dir.y, pos.z + dir.z);
  }

  const currentParcel = () => ({ px: Math.round(pos.x / CELLX), pz: Math.round(pos.z / CELLZ) });

  // ── [섀도 프리즈] 섀도맵 1프레임 재베이크 요청 ──
  // needsUpdate=true는 다음 렌더 1회만 섀도 패스를 돌리고 three.js가 자동으로 false 복귀(autoUpdate=false 조건).
  // soft 모드는 shadowMap.enabled=false라 이 호출이 사실상 no-op(섀도 패스 자체가 스킵됨).
  let shadowBakeAt = null; // 마지막 재베이크 시점의 플레이어 XZ(8m 이동 트리거 기준점)
  function requestShadowBake() {
    renderer.shadowMap.needsUpdate = true;
    shadowBakeAt = { x: pos.x, z: pos.z };
  }
  // 마지막 베이크에서 8m 이상 이동했으면 재베이크(태양이 플레이어 추종 → 그림자 방향/범위 갱신).
  function maybeRebakeShadow() {
    if (!shadowBakeAt) return;
    const ddx = pos.x - shadowBakeAt.x, ddz = pos.z - shadowBakeAt.z;
    if (ddx * ddx + ddz * ddz > 64) requestShadowBake(); // 8m² = 64
  }

  // ── [C-1 저사양 그림자 강등] ──────────────────────────────────────────────
  // 성능감사: world 저FPS 주범은 실시간 PCFSoftShadowMap 샘플링 — receiveShadow가 148개(바닥·모래·
  // 다리·도로·강, 화면 대부분)라 매픽셀 9~25탭이 그대로 fill-rate 오버헤드(해상도 비례 +70.9%).
  // gpuInfo.soft(SW렌더)는 이미 114에서 shadowMap.enabled=false로 시작하지만, 그건 "소프트웨어 렌더"
  // 판정 1회성이고 — 실GPU인데 지속 저FPS인 기기는 adaptQuality가 liteMode(해상도↓·하늘 축소)만 켜고
  // 그림자는 그대로 PCFSoft라 정작 가장 큰 비용은 안 줄어든다. 이 축을 lite 진입/복귀에 연동한다
  // (새 판정 만들지 않고 기존 liteMode 신호 재사용).
  // [방식 선택 — 룩 검수 결론] (a)PCFShadowMap 1탭+512 vs (b)shadowMap.enabled=false 완전 제거 중 (b) 채택.
  // 근거: 이 씬의 castShadow 캐스터는 램프포스트·벤치·플랜터·부두목재·등대 등 소품뿐(건물·나무는 애초
  // castShadow 미설정 — 481·475·485·587·636행). 즉 지금도 화면을 지배하는 큰 그림자는 없고 소품 발치의
  // 옅은 블롭 수준이라 완전 제거해도 "붕 뜬" 느낌이 거의 없는 반면, 512 해상도 1탭 하드섀도는 벤치
  // 다리처럼 얇은 형상 경계에서 계단 앨리어싱이 오히려 더 도드라져 "조용한 럭셔리" 톤에 이질적이다.
  // 완전 제거가 fill-rate 절감도 최대(섀도 패스 자체가 스킵 — 873행 주석과 동일 근거)이고 코드도
  // 최소침습(mapSize/type 불변, dispose 불필요)이라 채택.
  // shadowMap.enabled 토글은 receiveShadow 머티리얼의 프로그램 캐시키(USE_SHADOWMAP)를 바꿔 셰이더
  // 재컴파일을 유발한다 → liteMode enter/exit(히스테리시스 24↔48fps + 10초 쿨다운)에서만 호출해
  // 매프레임 재호출을 원천 차단(idempotent 가드로 이중 방어).
  function setShadowLite(lite) {
    const want = !lite;
    if (renderer.shadowMap.enabled === want) return; // 이미 목표 상태 — 재컴파일 재유발 방지(1회성 보장)
    renderer.shadowMap.enabled = want;
    if (want) requestShadowBake(); // 그림자 복귀 시 1프레임 재베이크(lite 동안 이동한 플레이어 위치로 정합)
  }

  // [하늘 엔진] 생성 — sun/hemi/sky 주입. 생성자가 돔을 고해상 구로 교체하고 set(day/clear,{fade:0})을
  // 내부 수행하며 조명·fog·clearColor를 덮는다(world.js 고정 fog/clearColor는 초기 프레임용, 덮여도 무방 — 지시 §작업1-4).
  // soft: 소프트웨어 렌더는 크로스페이드 스냅·저해상 돔·강수 입자 축소(sky.js 내부 분기).
  // [P1 교차리뷰] onApply=섀도 리베이크 훅 — 섀도 프리즈(autoUpdate=false)라 神 모드/URL로 시간대·날씨를
  // 바꿔 태양 방위가 바뀌어도 8m 걷기 전엔 그림자가 옛 방향에 고착된다. sky.js set() 완료 시 onApply가
  // requestShadowBake()를 호출해 다음 프레임 1회 재베이크 → 조명-그림자 방위 즉시 정합(회귀 방어).
  // requestShadowBake/shadowBakeAt 선언 이후에 생성해야 초기 set(fade0)의 즉시 onApply가 TDZ를 피한다.
  skySystem = createSkySystem({
    scene, renderer, sun, hemi, sky,
    getPos: () => ({ x: pos.x, z: pos.z }),
    soft: gpuInfo.soft,
    onApply: () => requestShadowBake(),
    waterY: SEA_Y + 0.05, // [해안] 바다 상면 — 수면 빛반사(달빛·노을·태양) 활성화(외해 기준, 넓은 면).
  });

  // ── 스트리밍: 현재 파셀 3×3. 직교 인접(맨해튼≤1)=풀디테일, 대각=shell 임포스터. ──
  // 진행방향 보너스 — 플레이어가 향하는 쪽(kmov/tmov ⊕ yaw 월드벡터)과 파셀 상대방향 내적>0이면
  // 우선순위 가산(먼저 로드). 정지 시 0. (kmov/tmov/yaw는 런타임 참조라 정의 시점 TDZ 무관.)
  function dirBonus(rx, rz) {
    const f = kmov.fwd + tmov.fwd, r = kmov.right + tmov.right;
    if (!f && !r) return 0;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rgx = Math.cos(yaw), rgz = -Math.sin(yaw);
    const mvx = f * fx + r * rgx, mvz = f * fz + r * rgz;
    return (mvx * rx + mvz * rz) > 0 ? 5 : 0;
  }
  // sync=true(스폰·텔레포트) 또는 헤드리스 기본(streamAsync 미설정)은 즉시 동기 로드. 그 외는 큐잉.
  function updateStreaming(sync = false) {
    const { px, pz } = currentParcel();
    const want = new Map();
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const k = keyOf(px + dx, pz + dz);
      if (!index.has(k)) continue;
      want.set(k, (Math.abs(dx) + Math.abs(dz)) <= 1 ? 'full' : 'shell');
    }
    // 언로드는 즉시(저비용) — 기존대로. 큐에 남은 불필요분(떠난 방향)도 함께 제거.
    for (const k of Array.from(loaded.keys())) if (!want.has(k)) unloadParcel(k);
    for (let i = loadQueue.length - 1; i >= 0; i--) {
      if (!want.has(loadQueue[i].k)) { queued.delete(loadQueue[i].k); loadQueue.splice(i, 1); }
    }
    const immediate = sync || (headless && !streamAsync);
    for (const [k, lod] of want) {
      const ex = loaded.get(k);
      if (ex && ex.lod === lod) continue; // 이미 정확 LOD → skip
      const [qx, qz] = k.split(',').map(Number);
      if (immediate) { loadParcel(qx, qz, lod); continue; }
      // 큐잉 — 우선순위 = 맨해튼거리*10 - 진행방향보너스(작을수록 먼저).
      const prio = (Math.abs(qx - px) + Math.abs(qz - pz)) * 10 - dirBonus(qx - px, qz - pz);
      if (queued.has(k)) {
        const job = loadQueue.find((j) => j.k === k); // 이미 큐에 있으면 LOD·우선순위 갱신(shell→full 승격 등)
        if (job) { job.lod = lod; job.prio = prio; }
      } else {
        loadQueue.push({ k, px: qx, pz: qz, lod, prio });
        queued.add(k);
      }
    }
  }
  // [스트리밍 큐] 프레임당 예산 내에서 큐 소진 — update()의 renderer.render 직전에 호출.
  // prio 오름차순 정렬 후 최소 1개 빌드, 이후 예산(LOAD_BUDGET_MS) 초과 시 중단. soft는 프레임당 1개.
  // 떠난 파셀(현재 기준 맨해튼>2 또는 LOD 조건 변동) job은 빌드 없이 폐기 — 다음 updateStreaming이 재평가.
  function processLoadQueue() {
    if (!loadQueue.length) return;
    const { px, pz } = currentParcel();
    loadQueue.sort((a, b) => a.prio - b.prio);
    const t0 = perfNow();
    let built = 0;
    while (loadQueue.length) {
      const job = loadQueue[0];
      const man = Math.abs(job.px - px) + Math.abs(job.pz - pz);
      const wantLod = man <= 1 ? 'full' : 'shell';
      if (man > 2 || wantLod !== job.lod) { loadQueue.shift(); queued.delete(job.k); continue; } // 떠난 파셀 폐기
      const exist = loaded.get(job.k);
      if (exist && exist.lod === job.lod) { loadQueue.shift(); queued.delete(job.k); continue; } // 이미 로드됨
      loadParcel(job.px, job.pz, job.lod);
      loadQueue.shift(); queued.delete(job.k);
      built++;
      if (gpuInfo.soft) break;                       // soft: 프레임당 엄격 1개
      if (perfNow() - t0 > LOAD_BUDGET_MS) break;    // 최소 1개 빌드 후 예산 초과 시 중단
    }
  }

  // ── [다층] 지면 해석 (player.js stairGroundAt/groundCandidatesAt/resolveGround 이식, 파셀 오프셋 인지) ──
  function stairGroundAt(x, z) {
    for (const L of loaded.values()) for (const s of L.stairBands) {
      if (x < s.xMin || x > s.xMax) continue;
      const zMin = Math.min(s.z0, s.z1), zMax = Math.max(s.z0, s.z1);
      if (z < zMin || z > zMax) continue;
      const t = Math.max(0, Math.min(1, (z - s.z0) / (s.z1 - s.z0)));
      return s.yFrom + t * (s.yTo - s.yFrom); // 경사 밴드 선형 보간
    }
    return null;
  }
  // [해안] 해변 경사 지면 — 경계 파셀 바깥 가장자리 스트립에서 지면(0)→물가(BEACH_TOE) 선형보간.
  // stairGroundAt과 동형(전 로드 파셀 순회) — 플레이어가 파셀 밖(미로드) 스트립에 있어도 인접 경계 파셀이 커버.
  function beachGroundAt(x, z) {
    for (const L of loaded.values()) for (const b of L.beachBands) {
      if (b.horiz) {
        if (x < b.lo || x > b.hi) continue;
        const t = (z - b.edge) * b.sign;              // 바깥으로 0..width
        if (t < 0 || t > b.width) continue;
        return BEACH_TOE * (t / b.width);             // 0 → BEACH_TOE
      } else {
        if (z < b.lo || z > b.hi) continue;
        const t = (x - b.edge) * b.sign;
        if (t < 0 || t > b.width) continue;
        return BEACH_TOE * (t / b.width);
      }
    }
    return null;
  }
  // [부두] 데크 도보 지면 — 데크 AABB 안이면 데크 상면(PIER_DECK_Y). 전 로드 파셀 순회(데크는 파셀 밖으로 돌출).
  function pierGroundAt(x, z) {
    for (const L of loaded.values()) for (const d of L.pierDecks) {
      if (Math.abs(x - d.cx) <= d.ex && Math.abs(z - d.cz) <= d.ez) return d.y;
    }
    return null;
  }
  // [복셀스+해안] 지면 후보: 부두 데크 / 해변 경사 / 거리·마당 0 / 건물 층 슬래브 / 강 다리 0·강물 -0.4 /
  //   미로드·월드 밖 = 바다 SEA_Y(첨벙) 단, 해변 스트립이 커버하면 그 경사값 우선.
  function groundCandidatesAt(x, z) {
    const c = [];
    const sy = stairGroundAt(x, z); if (sy !== null) c.push(sy);
    const py = pierGroundAt(x, z); if (py !== null) c.push(py);   // 부두 데크 위(최우선 지면)
    const by = beachGroundAt(x, z); if (by !== null) c.push(by);  // 해변 경사
    const L = loaded.get(keyOf(Math.round(x / CELLX), Math.round(z / CELLZ)));
    if (!L) { if (by === null) c.push(SEA_Y); return c; }         // 미로드=바다(해변 스트립이면 by가 이미 담김)
    if (L.def.water) {
      c.push(Math.abs(z - L.oz) < 1.5 ? 0 : -0.4); // 다리 폭 3m / 그 밖은 강물(첨벙, RIVER_Y 수면)
    } else if (L.bld && Math.abs(x - L.bld.cx) < L.bld.hw && Math.abs(z - L.bld.cz) < L.bld.hd) {
      for (const fy of L.floorsY) c.push(fy);      // 건물 내부: 각 층 슬래브 상면
    } else {
      c.push(0);                                    // 거리·마당
    }
    return c;
  }
  // 후보 중 현재 지면 + STEP_TOLERANCE 안 넘는 최고. 급락(추락)은 null(이동 취소).
  function resolveGround(x, z, cur) {
    const cands = groundCandidatesAt(x, z);
    let best = null;
    for (const v of cands) if (v <= cur + STEP_TOLERANCE && (best === null || v > best)) best = v;
    if (best === null) return null;
    if (cur - best > STEP_TOLERANCE) return null;
    return best;
  }

  // ── 충돌 — solid AABB(파츠 + 건물 벽 세그먼트). 개방 세계라 파셀 경계 clamp 없음. ──
  function blocked(x, z) {
    for (const L of loaded.values()) for (const b of L.solids) {
      if (b.top <= groundY + STEP_OVER) continue;   // 현재 발높이 기준 걸림턱(바닥타일 통과)
      if (b.bottom >= groundY + 1.7) continue;      // 머리 위 스택은 이동 무영향
      if (Math.abs(x - b.x) <= b.ex + RADIUS && Math.abs(z - b.z) <= b.ez + RADIUS) return true;
    }
    return false;
  }
  /** [복셀스] yaw 기준 전/우 이동 — 개방 세계: 월드 소프트 클램프 + 벽·파츠 solid 충돌(축분리 슬라이딩). */
  function walk(fwdAmt, rightAmt, dt) {
    dt = Math.min(0.05, Math.abs(dt) || 0); // 공개 API 보호: 큰 dt로 벽 터널링 방지(RAF 경로와 동일 클램프 — 검증 MINOR)
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let dx = fwdAmt * fx + rightAmt * rx, dz = fwdAmt * fz + rightAmt * rz;
    const len = Math.hypot(dx, dz);
    if (len > 1e-6) { dx /= len; dz /= len; } else return;
    dx *= SPEED * dt; dz *= SPEED * dt;
    let c = clampWorld(pos.x + dx, pos.z);
    if (!blocked(c.x, pos.z) && resolveGround(c.x, pos.z, groundY) !== null) pos.x = c.x;
    c = clampWorld(pos.x, pos.z + dz);
    if (!blocked(pos.x, c.z) && resolveGround(pos.x, c.z, groundY) !== null) pos.z = c.z;
    const g = resolveGround(pos.x, pos.z, groundY); // 지면 갱신(계단·강 첨벙, 급턱이면 유지)
    if (g !== null) groundY = g;
    updateStreaming();
    applyPose();
  }

  function lookDelta(dx, dy) {
    yaw -= dx;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch - dy));
    applyPose();
  }

  // ── NPC 렌더/보간 (사람과 완전히 동일한 avatar 경로) ──
  function stepNpcs(d) {
    for (const L of loaded.values()) {
      if (!L.crowd) continue;
      const humans = [{ x: pos.x, z: pos.z }]; // y 생략 → NpcCrowd 회피·인사 정상(단층)
      const states = L.crowd.update(d, humans);
      for (const id in states) {
        const s = states[id];
        let a = L.avatars.get(id);
        if (!a) {
          const inst = createAvatarInstance(s.char, s.color, s.nickname);
          inst.group.position.set(s.x, 0, s.z); inst.group.rotation.y = s.ry; // floorY=0 발바닥
          scene.add(inst.group); a = { inst }; L.avatars.set(id, a);
        } else {
          const dxm = s.x - a.inst.group.position.x, dzm = s.z - a.inst.group.position.z;
          const spd = Math.hypot(dxm, dzm) / Math.max(1e-3, d);
          a.inst.group.position.set(s.x, 0, s.z);
          a.inst.group.rotation.y = s.ry;
          a.inst.update(d, spd);
        }
      }
      let chat; while ((chat = L.crowd.takeChat())) emit('chat', chat);
    }
  }

  // ── 거리 배회 NPC(streetWalkers) — 작품 중심 NpcCrowd와 별개의 경량 앰비언트 시스템. ──
  // 도로 라인(파셀 가장자리 = 건물 밖)만 왕복 → 건물 관통·강 침입 없음. 외형은 시드 결정론
  // (def.walker), 목표 재설정은 로컬 시뮬(Math.random 허용 — 앰비언트). 총원 ≤6(성능).
  function walkerTotal() { let n = 0; for (const L of loaded.values()) if (L.walker) n++; return n; }
  function pickWalkerTarget(w) {
    const roadS = w.oz + CELLZ / 2 - 1.25, roadE = w.ox + CELLX / 2 - 1.25, t = Math.random();
    if (w.line === 'south') { w.tx = w.ox - CELLX / 2 + 2.5 + t * (CELLX - 5); w.tz = roadS; }
    else { w.tx = roadE; w.tz = w.oz - CELLZ / 2 + 2.5 + t * (CELLZ - 5); }
  }
  function stepWalkers(d) {
    for (const L of loaded.values()) {
      const w = L.walker; if (!w) continue;
      if (w.state === 'pause') {
        w.timer -= d; if (w.timer <= 0) { w.state = 'walk'; pickWalkerTarget(w); }
        w.inst.update(d, 0); continue;
      }
      const dx = w.tx - w.x, dz = w.tz - w.z, dist = Math.hypot(dx, dz);
      if (dist < 0.15) { w.state = 'pause'; w.timer = 1.4 + Math.random() * 2.6; w.inst.update(d, 0); continue; }
      const step = Math.min(dist, w.speed * d);
      w.x += (dx / dist) * step; w.z += (dz / dist) * step;
      w.ry = Math.atan2(-dx / dist, -dz / dist); // yaw=0 → -Z 관례
      w.inst.group.position.set(w.x, 0, w.z);
      w.inst.group.rotation.y = w.ry;
      w.inst.update(d, w.speed);
    }
  }

  // [해안 2단계 등대] 회전 서치라이트 — 발광 콘 y축 회전(무료, 조명 개수 불변). 야간에 additive로 도드라진다.
  function stepLighthouses(d) {
    for (const L of loaded.values()) if (L.lighthouse) L.lighthouse.beam.rotation.y += d * 0.8;
  }

  // ── 입력(키/터치) ──
  const kmov = { fwd: 0, right: 0 }, tmov = { fwd: 0, right: 0 }, keys = {};
  function recomputeKeyMove() {
    kmov.fwd = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
    kmov.right = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  }
  const listeners = {};
  const emit = (ev, d) => (listeners[ev] || []).forEach((f) => f(d));

  // ── [FPS 적응] 실시간 해상도 스케일링 (오픈월드 전용 · 세션 한정 비저장) ──────────────
  // 감독 실기기 제보: 모바일 오픈월드가 "매끄럽지 않다"(지속 저FPS). 스폰 시 setPixelRatio를
  // 1회(109-110) 고정만 해서, 프레임이 떨어져도 해상도가 유지돼 회복 기회가 없다. main.js:1300-1360
  // 적응 루프를 이식하되 — main.js는 writeSpec(SPEC_KEY 'lu-spec-v2')로 영구 학습하지만, world는
  // (1) 그 키가 고정 미술관과 공유돼 오픈월드 세션 성능이 미술관 시작 품질을 오염시키고,
  // (2) 파셀 스트리밍이라는 부하 구조 자체가 미술관과 달라 학습 이전이 부적절하므로 —
  // 저장을 쓰지 않고 이 세션 한정으로만 배율을 조정한다(비저장 단순화). gpuInfo.soft(SwiftShader 등)는
  // 이미 포테이토 고정(0.7 캡·30fps 프레임 캡)이라 적응 대상에서 제외한다.
  const ADAPT_ENTER_FPS = 24;   // 이 밑 → 즉시 강등(main.js LITE_ENTER_FPS 계승)
  // 이 위 지속 → 단계 승급. 데스크톱은 48(스트리밍 여유). 모바일(coarse)은 42 — 아래 프레임 캡(45fps)
  // 밑으로 둬야 캡 상태에서도 fps가 승급 임계에 도달해 하한에 영구히 갇히지 않는다(캡↔승급 정합).
  const ADAPT_EXIT_FPS = coarsePointer ? 42 : 48;
  const ADAPT_COOLDOWN = 10;    // 재전환 쿨다운(초) — 깜빡임/배율 진동 방지(main.js 동일).
  const ADAPT_UP_STEP = 0.25;   // 승급 폭(+0.25씩, main.js 동일).
  const ADAPT_UP_HOLD = 20;     // 승급 전 고FPS 연속 틱(0.5s 집계 × 20 = 10초 지속).
  const ADAPT_WARMUP = 3;       // 스폰 후 이 초 동안 강등 보류(파셀/텍스처 로딩 스파이크 오판 방지).
  // [그림자 조기 적응] 그림자(실시간 PCFSoftShadowMap)는 이 씬 저FPS의 지배 요인(fill-rate, 895-896)
  // 이라 해상도 강등(ADAPT_ENTER_FPS=24)보다 이른 임계에서 그림자만 먼저 끈다. 실기기 로그의 25~27fps
  // "낀 구간"(tri를 절반 깎아도 fps가 안 오르던 프래그먼트 병목 — 해상도 강등엔 미달하나 여전히 버벅임)을
  // 이것으로 뚫는다. 복원(EXIT)은 승급 임계(48)보다 살짝 낮게 둬 그림자를 해상도보다 먼저 되살리고,
  // 갭 16 + 각 방향 지속 틱 + 쿨다운으로 경계 왕복 셰이더 재컴파일(USE_SHADOWMAP 캐시키 변동, 908행)을
  // 3중 방어한다. liteMode 구간은 기존 토글(1255·1263 계열)이 이미 그림자를 관리하므로 이 블록은 그
  // 사이 중간대(24~48fps)만 담당한다.
  const SHADOW_LITE_ENTER = 30; // 이 밑 1초 지속 → 그림자만 강등(해상도 유지)
  // 이 위 10초 지속 → 그림자 복원(승급보다 먼저). 데스크톱 46. 모바일은 40 — 프레임 캡(45) 밑이자
  // 승급(42) 밑으로 둬 캡 상태에서 그림자가 해상도보다 먼저 복원되고, ENTER 30과 갭 10을 유지한다.
  const SHADOW_LITE_EXIT = coarsePointer ? 40 : 46;
  const dprAdapt = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  // 상한 = 스폰 초기값(109-110과 동일식, 비soft는 min(2,dpr)로 캡). 하한 = 상한의 60%(단 최소 1.0)
  // — 1.0 밑돌면 뿌옇다는 감독 제보로 하한을 1.0 이상 고정하되, dpr*0.75로 잡으면 dpr>2.667(아이폰
  // Pro·최신 안드로이드 dpr=3 등)에서 하한이 상한(2)을 넘어 강등·승급 게이트가 영구 false가 되어
  // 적응이 no-op가 된다(교차리뷰 지적). 상한 상대값(≤2 캡)으로 잡아 모든 dpr에서 하한<상한을 보장.
  const ratioCeilBase = gpuInfo.soft ? Math.min(dprAdapt, 0.7) : Math.min(2, dprAdapt);
  // [C-2a] pointer:coarse는 적응 상한에도 MOBILE_PX_CAP(1.5)을 씌운다 — 스폰 캡(110)과 정합해
  // 승급 루프가 배율을 다시 2.0으로 끌어올리지 못하게 한다. 데스크톱(fine)은 캡 미적용(무변화).
  const RATIO_CEIL = coarsePointer ? Math.min(ratioCeilBase, MOBILE_PX_CAP) : ratioCeilBase;
  // 하한은 캡 "전" 상한(ratioCeilBase) 기준으로 산정 — RATIO_FLOOR(dpr≥2에서 1.20)를 무변경 유지
  // (팀장 확정: 하한 인하 금지·캡과 독립). min(base, …)로 감싸 dpr<1에서도 FLOOR≤CEIL 구조 보장(교차리뷰 권고).
  const RATIO_FLOOR = Math.min(ratioCeilBase, Math.max(1, ratioCeilBase * 0.6));
  // [열 감안 프레임 캡] 모바일(coarse)은 45fps로 상한을 둔다. 60fps 풀가동은 GPU 듀티사이클을 100%로
  // 유지해 발열을 계속 쌓고, 결국 스로틀(장시간 세션에서 삼각형 수와 무관한 fps 저하 — 감독 실기기 로그)로
  // 추락한다. 45캡은 프레임마다 GPU에 여유(~7ms)를 남겨 발열·스로틀을 선제적으로 완화한다(모바일 3D의
  // 표준 관행 — 30~45fps 캡). 데스크톱(fine)은 여유가 있어 무캡. soft(SwiftShader)는 별도 30fps 캡
  // (step 내부)이 이미 담당하므로 이 캡은 실GPU 모바일 전용. 승급/그림자 복원 임계(42·40)를 이 캡 밑으로
  // 정합해 캡 상태에서도 적응이 갇히지 않는다.
  const FRAME_CAP_S = coarsePointer ? (1 / 45) : 0; // 프레임 최소 간격(초). 0=무캡
  let liteMode = false;
  let adaptFrames = 0, adaptElapsed = 0, adaptCooldown = 0, adaptUpTicks = 0, adaptAge = 0;
  let shadowDownTicks = 0, shadowUpTicks = 0; // [그림자 조기 적응] 방향별 연속 저/고FPS 틱(0.5s 집계 단위)

  // ── RAF ──
  let raf = 0, last = 0, disposed = false, potatoAccum = 0, capAccum = 0;
  function step(now) {
    // RAF 재예약을 먼저 — 프레임 캡 return 후에도 루프가 끊기지 않게 한다(미술관 main.js는
    // setAnimationLoop이라 return해도 다음 프레임이 오지만, RAF 재귀 경로는 명시 재예약이 필요).
    raf = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame(step) : 0;
    const t = now || 0;
    let dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    // [저사양 방어] 포테이토 프레임 캡(~30fps) — 소프트웨어 렌더는 프레임 시간이 널뛰어 일정 캡이
    // 오히려 입력 지연 체감이 낫다. 건너뛴 시간은 누적해 다음 delta로 넘긴다(시뮬 시간 보존, main.js:1236 동형).
    if (gpuInfo.soft) {
      potatoAccum += dt;
      if (potatoAccum < 0.034) return; // ~30fps 캡
      dt = potatoAccum;
      potatoAccum = 0;
    } else if (FRAME_CAP_S > 0) {
      // [열 감안 프레임 캡] 모바일 45fps 상한(위 FRAME_CAP_S 주석). 건너뛴 시간은 누적해 다음 delta로
      // 넘겨 시뮬 시간을 보존한다(soft 포테이토 캡과 동형 — 물리·애니메이션이 캡 때문에 느려지지 않음).
      capAccum += dt;
      if (capAccum < FRAME_CAP_S) return;
      dt = capAccum;
      capAccum = 0;
    }
    update(dt);
  }
  function update(dt) {
    const d = (typeof dt === 'number' && isFinite(dt)) ? dt : 0.016;
    // 물결 흐름 — map.offset 스크롤(잔잔하게). 강/바다 공용이라 한 곳만.
    // 감독 지시: 물결이 "옆으로" 흐르지 않게 — 무늬(가로 사인 줄)와 수직인 z방향으로만 전진.
    // 줄무늬가 앞으로 밀려오는 파도감 + 강(남북 열)은 순류 방향과 정합. x 스크롤은 제거.
    if (waterTex) { waterTex.offset.y = (waterTex.offset.y + 0.012 * d) % 1; }
    const f = kmov.fwd + tmov.fwd, r = kmov.right + tmov.right;
    if (f || r) walk(f, r, d);
    // 카메라 y를 groundY 추종(계단·강 경사 부드럽게). 태양·스카이 추종은 applyPose 안.
    pos.y += ((groundY + EYE) - pos.y) * Math.min(1, GROUND_LERP_RATE * d);
    applyPose();
    if (skySystem) skySystem.update(d); // [하늘 엔진] 크로스페이드·강수·오로라·번개 진행(조명·clearColor 갱신)
    // [팝인 완화 — 조명 페이드업] 라이트풀 intensity를 목표(_target)로 lerp. 갓 배정된 스포트(intensity 0)는
    // 목표23/18로 부드럽게 켜지고, 미사용/반납(_target 0)은 이미 0이라 무변. 개수·visible 불변(재컴파일 0).
    for (const sl of lightPool) sl.intensity += (sl._target - sl.intensity) * Math.min(1, d * FADE_K);
    maybeRebakeShadow(); // [섀도 프리즈] 8m 이동 시 그림자 재베이크(태양 추종 정합)
    stepNpcs(d);
    stepWalkers(d); // 거리 배회 NPC 앰비언트 시뮬
    stepLighthouses(d); // [해안 2단계] 등대 서치라이트 회전
    // 원격 아바타 발바닥 = groundY(다층·강 반영). 원격 간 충돌은 데모 스코프 아웃.
    if (mp) { mp.sendState({ x: pos.x, y: groundY + EYE_HEIGHT, z: pos.z, ry: yaw }); mp.update(d); }
    processLoadQueue(); // [스트리밍 큐] 프레임 예산 내 지연 로드 소진(렌더 직전 — 이번 프레임 빌드분 반영)
    renderer.render(scene, camera);
    adaptQuality(d); // [FPS 적응] 실측 프레임률로 해상도 배율 조정(soft 제외 — 아래에서 자체 가드)
  }
  // [FPS 적응] 0.5초마다 FPS를 집계해 저FPS→즉시 강등(하한까지), 고FPS 지속→단계 승급(+0.25).
  // 히스테리시스(ENTER 24 ↔ EXIT 48) + 10초 쿨다운으로 배율 진동을 막는다. main.js:1300-1360 이식.
  // d는 update의 clamp(min 0.05)된 delta라 최저 20fps로 측정된다 — 강등 임계 24fps는 이 상한보다
  // 높아 트리거는 정상 작동하고(실측 5~20fps는 모두 20fps로 보여 즉시 강등엔 충분), 승급 임계 48fps는
  // clamp에 걸리지 않아 정확하다. soft는 이미 포테이토 고정이라 여기서 제외한다.
  function adaptQuality(d) {
    if (gpuInfo.soft) return;
    adaptAge += d; adaptFrames += 1; adaptElapsed += d;
    if (adaptElapsed < 0.5) return;
    const fpsNow = adaptFrames / adaptElapsed;
    adaptFrames = 0; adaptElapsed = 0;
    adaptCooldown = Math.max(0, adaptCooldown - 0.5);
    emit('fps', Math.round(fpsNow)); // 순수 가산 계측(HUD/디버그·헤드리스 검증)
    const cur = renderer.getPixelRatio();
    const streaming = loadQueue.length > 0; // 파셀 스트리밍 중 스파이크는 강등 판단에서 배제

    // [해상도 긴급 강등] 최우선·쿨다운 무관. fps가 강등 임계(24) 밑으로 떨어지면 그림자 조기 적응이나
    // 공유 쿨다운에 밀리지 않고 즉시 하한(RATIO_FLOOR)까지 내려 사용자를 보호한다(그림자도 함께 끔).
    // cur>RATIO_FLOOR에서만 발동해 하한 도달로 자연 종료하므로 쿨다운 없이도 연속 발동·진동이 없다.
    // (교차리뷰 블로커 수정: 그림자 블록이 adaptCooldown을 세팅해 같은 tick의 긴급 강등이 굶던
    //  starvation 제거 — 긴급 강등을 그림자·쿨다운 게이트보다 앞에 두고 처리 후 즉시 return.)
    if (fpsNow < ADAPT_ENTER_FPS && adaptAge >= ADAPT_WARMUP && !streaming && cur > RATIO_FLOOR) {
      renderer.setPixelRatio(RATIO_FLOOR);
      liteMode = true; adaptCooldown = ADAPT_COOLDOWN; adaptUpTicks = 0;
      shadowDownTicks = 0; shadowUpTicks = 0; // 그림자 조기 적응 상태 리셋 — lite 진입이 그림자를 인수(1286)
      if (skySystem) skySystem.setLite(true); // [하늘 엔진] B-2 하늘 투명 레이어 오버드로우 축소
      setShadowLite(true); // [C-1] 저사양 그림자 강등 — lite 진입과 연동(shadowMap.enabled=false)
      emit('adapt', { mode: 'lite', ratio: RATIO_FLOOR, fps: Math.round(fpsNow) });
      return; // 긴급 강등 처리 완료 — 이 tick의 그림자/승급 판정 불필요
    }

    // [그림자 조기 적응] 해상도 긴급 강등(24)에 해당하지 않는 중간대(24~30fps)에서 그림자만 먼저 양보
    // (위 SHADOW_LITE_* 주석). liteMode 구간은 제외(그림자는 lite 진입/해제가 관리). 해상도 쿨다운을
    // 공유해 그림자·해상도가 번갈아 진동하지 않게 하고, 파셀 스트리밍 스파이크는 배제한다. 긴급 강등이
    // 위에서 return으로 먼저 처리되므로 이 블록은 fps≥24이거나 이미 하한인 경우에만 도달한다.
    if (!liteMode && adaptCooldown <= 0 && adaptAge >= ADAPT_WARMUP && !streaming) {
      if (renderer.shadowMap.enabled && fpsNow < SHADOW_LITE_ENTER) {
        shadowDownTicks += 1; shadowUpTicks = 0;
        if (shadowDownTicks >= 2) { // 연속 2틱(1초) 지속 — 순간 스파이크 오판 방지
          setShadowLite(true); shadowDownTicks = 0; adaptCooldown = ADAPT_COOLDOWN;
          emit('adapt', { mode: 'shadow-lite', fps: Math.round(fpsNow) });
        }
      } else if (!renderer.shadowMap.enabled && fpsNow > SHADOW_LITE_EXIT) {
        shadowUpTicks += 1; shadowDownTicks = 0;
        if (shadowUpTicks >= ADAPT_UP_HOLD) { // 10초 지속 — 켜기(셰이더 재컴파일)는 매우 보수적으로만
          setShadowLite(false); shadowUpTicks = 0; adaptCooldown = ADAPT_COOLDOWN;
          emit('adapt', { mode: 'shadow-up', fps: Math.round(fpsNow) });
        }
      } else {
        if (fpsNow >= SHADOW_LITE_ENTER) shadowDownTicks = 0;
        if (fpsNow <= SHADOW_LITE_EXIT) shadowUpTicks = 0;
      }
    }

    if (adaptCooldown > 0) return;   // 승급은 쿨다운 존중(진동 방지)
    if (fpsNow > ADAPT_EXIT_FPS) {
      // 승급 — 고FPS가 ADAPT_UP_HOLD틱(10초) 지속돼야 +0.25씩 상한까지(느린 승급).
      adaptUpTicks += 1;
      if (adaptUpTicks >= ADAPT_UP_HOLD && cur < RATIO_CEIL) {
        renderer.setPixelRatio(Math.min(RATIO_CEIL, cur + ADAPT_UP_STEP));
        adaptCooldown = ADAPT_COOLDOWN; adaptUpTicks = 0;
        if (renderer.getPixelRatio() >= RATIO_CEIL - 1e-6) { liteMode = false; shadowDownTicks = 0; shadowUpTicks = 0; if (skySystem) skySystem.setLite(false); setShadowLite(false); } // 상한 복귀 시 lite 해제(하늘 레이어·그림자 복원)
        emit('adapt', { mode: 'up', ratio: renderer.getPixelRatio(), fps: Math.round(fpsNow) });
      }
    } else {
      adaptUpTicks = 0; // 중간대(24~48fps) — 승급 카운트 리셋(안정 유지)
    }
  }
  function renderOnce() { applyPose(); maybeRebakeShadow(); renderer.render(scene, camera); }

  // ── 포인터락 + 이벤트(데스크톱) ──
  let locked = false;
  function onMouseMove(e) { if (locked) lookDelta((e.movementX || 0) * 0.0025, (e.movementY || 0) * 0.0025); }
  function onLockChange() { locked = (typeof document !== 'undefined') && document.pointerLockElement === canvas; emit('lock', { locked }); }
  function onCanvasClick() { if (canvas.requestPointerLock) canvas.requestPointerLock(); }
  function onKeyDown(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys[k] = true; recomputeKeyMove(); e.preventDefault(); }
  }
  function onKeyUp(e) { const k = e.key.toLowerCase(); if (k in keys) { keys[k] = false; recomputeKeyMove(); } }

  if (!headless && typeof window !== 'undefined') {
    canvas.addEventListener('click', onCanvasClick);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / (h || 1); camera.updateProjectionMatrix(); }

  // ── 실시간 멀티플레이어(2단계) — 같은 월드 접속자끼리 아바타 상호 가시성 ──
  // 기존 multiplayer.js(PeerJS 호스트릴레이) 재사용. 단일 월드 룸(디스트릭트 샤딩은 확장 시).
  // window.Peer(vendor/peerjs) 없으면(헤드리스 등) 조용히 미배선 — 오픈월드는 1인 모드로 정상 동작.
  if (opts.mp && typeof window !== 'undefined' && window.Peer) {
    mp = new MultiplayerManager(scene, { nickname: opts.mp.nickname, color: opts.mp.color, char: opts.mp.char, roomId: PEER_ROOM_ID + '-openworld' });
    mp.onStatus = (s) => emit('mpstatus', s);
    mp.onPlayerCount = (n) => emit('players', n);
    mp.onChat = (name, text) => emit('chat', { name, text });
    // [프라이버시 게이트] 자동 연결 금지 — mp 인스턴스만 생성(peer=null이라 네트워크 활동 0).
    // 실제 connect()는 사용자가 "함께 둘러보기"로 입장 동의한 뒤 connectMultiplayer()에서만 1회 실행.
  }

  // 초기 로드 — 첫 파셀 주변 스트리밍(스폰은 동기 즉시: 빈 화면 방지·결정론 무회귀)
  updateStreaming(true);
  applyPose();
  requestShadowBake(); // [섀도 프리즈] 초기 1회 베이크 + 8m 이동 기준점 설정
  if (!headless) {
    resize((typeof window !== 'undefined' ? window.innerWidth : 1280), (typeof window !== 'undefined' ? window.innerHeight : 720));
    raf = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame(step) : 0;
  }

  return {
    walk, update, renderOnce, resize, lookDelta,
    // [프라이버시 게이트] 사용자 입장 동의("함께 둘러보기") 시에만 호출 — 내부 1회 가드로 중복 connect(ESC→재입장 등) 봉쇄.
    connectMultiplayer: () => { if (mp && !mpConnected) { mpConnected = true; mp.connect(); } return mpConnected; },
    isMultiplayer: () => mpConnected,
    sky: skySystem, // [하늘 엔진] 신 모드 패널이 set()/get()으로 시간대·날씨·이벤트 제어
    getSkyState: () => (skySystem ? skySystem.get() : null),
    setTouchMove: (fwd, right) => { tmov.fwd = fwd || 0; tmov.right = right || 0; },
    setKey: (k, v) => { keys[String(k).toLowerCase()] = !!v; recomputeKeyMove(); },
    getPosition: () => pos.clone(),
    setPosition: (x, y, z) => { pos.set(x, y == null ? EYE : y, z); groundY = 0; updateStreaming(true); applyPose(); }, // 순간이동=지면층 리셋 + 동기 로드(빈 화면 방지)
    getYaw: () => yaw, setYaw: (v) => { yaw = v; applyPose(); },
    getGroundY: () => groundY, // [다층] 현재 발 높이(검증·디버그용)
    getPitch: () => pitch,
    getCurrentParcel: () => currentParcel(),
    getGpuInfo: () => ({ ...gpuInfo }), // [저사양 방어] 검증·디버그용 프로브 결과
    // [FPS 적응] 현재 적응 상태(검증·HUD 디버그용 순수 가산) — 강등/승급·하한·쿨다운 준수 확인.
    getAdaptState: () => ({ liteMode, pixelRatio: renderer.getPixelRatio(), floor: RATIO_FLOOR, ceil: RATIO_CEIL, cooldown: adaptCooldown }),
    // [스트리밍 큐] 계측 게터(순수 가산) — 히칭 벤치·HUD 디버그. 드로우콜·프로그램 수·로드/큐 상태.
    getStats: () => {
      let loadedFull = 0, loadedShell = 0;
      for (const L of loaded.values()) { if (L.lod === 'shell') loadedShell++; else loadedFull++; }
      return { drawCalls: renderer.info.render.calls, programs: renderer.info.programs.length, loadedFull, loadedShell, queue: loadQueue.length };
    },
    getQueueLength: () => loadQueue.length,
    getLoadedKeys: () => Array.from(loaded.keys()),
    isLocked: () => locked,
    on: (ev, f) => { (listeners[ev] = listeners[ev] || []).push(f); },
    get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; },
    getScene: () => scene, getCamera: () => camera, getRenderer: () => renderer,
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (!headless && typeof window !== 'undefined') {
        canvas.removeEventListener('click', onCanvasClick);
        document.removeEventListener('pointerlockchange', onLockChange);
        document.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      }
      if (mp) { mp.dispose(); mp = null; }
      for (const k of Array.from(loaded.keys())) unloadParcel(k);
      for (const sl of lightPool) { scene.remove(sl); scene.remove(sl.target); } // [단계2 라이트 풀] 씬 회수(Light는 dispose 불필요)
      // [하늘 엔진] 강수·무지개·오로라·페이드돔·교체된 고해상 돔 지오/텍스처 회수(sky 돔 자식 fadeDome 포함).
      if (skySystem) { skySystem.dispose(); skySystem = null; }
      // [복셀스] 하늘·바다·공유 재질 회수(skySystem이 교체·소유한 지오/맵은 이미 dispose됨 — 재호출은 무해 idempotent)
      scene.remove(sky); sky.geometry.dispose(); if (sky.material.map) sky.material.map.dispose(); sky.material.dispose();
      scene.remove(sea); seaGeo.dispose();
      if (T.water.map) T.water.map.dispose(); // 물결 텍스처(재질 dispose는 map 미회수)
      // [그래픽 1단계] 지면 절차 텍스처+노멀 회수(재질 dispose는 map/normalMap 미회수) — 공유 1장씩이라 여기서 일괄.
      for (const k of ['grass', 'plaza', 'road', 'sand', 'bridge']) { if (T[k].map) T[k].map.dispose(); if (T[k].normalMap) T[k].normalMap.dispose(); }
      for (const key3 in SG) SG[key3].dispose(); // 거리 가구 공유 지오
      TETRA_GEO.dispose(); // [테트라포드] 공유 지오(InstancedMesh들이 참조 — 파셀 dispose는 instance 버퍼만 회수)
      for (const key2 in T) T[key2].dispose();
      if (scene.environment) { scene.environment.dispose(); scene.environment = null; }
      renderer.dispose();
    },
  };
}
