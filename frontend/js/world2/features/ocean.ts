// world2/features/ocean.ts — 바다와 강. 감독 확정 "섬. 강", 표현은 "복셀스처럼".
//
// ── 물을 그리지 않고 물을 만든다 ────────────────────────────────────────────
// 이 파일이 하는 일은 **큰 판 셋을 지면보다 낮게 깔아 두는 것**이 전부다 — 해저·바다·강.
// `decide/water.ts`가 물이라 판정한 파셀을 스트리밍이 아예 로드하지 않고, 그 구멍으로 이
// 판들이 비친다.
//
// 그래서 강의 경로를 바꿔도 이 파일은 손댈 것이 없다. **강 모양을 아는 곳은 판정 하나뿐**
// 이고 여기는 "물의 높이"만 안다 — 강 판도 격자 전체를 덮되 강 구멍으로만 드러난다.
//
// ── 왜 판이 둘인가 ──────────────────────────────────────────────────────────
// 감독: *"복셀스처럼 바다, 강을 표현하자고."*
//
// Voxels 물의 성격은 **밝은 반투명**이다 — 물 너머로 바닥이 비치고, 깊어질수록 물빛이
// 바닥을 이긴다. 그 "비침"이 물을 물로 읽히게 한다. 그런데 반투명 판만 깔면 아래에
// 아무것도 없어 **하늘이 비친다.** 물이 아니라 유리 구멍이 된다. 그래서 해저 판을 함께
// 깐다. 처음에 불투명 짙은 물색 판 하나로 만들었던 것을 감독이 잡은 지점이 정확히 여기다.
//
// ── 왜 셰이더가 아니라 UV 스크롤인가 (감독 지시) ────────────────────────────
// 감독: *"복셀은 물이 살랑살랑 진짜 물 느낌이 나. 쉐이더를 기가막히게 쓴듯."*
//
// 맞다. 다만 **우리는 GLSL `ShaderMaterial`을 쓸 수 없다** — `three/webgpu` 빌드에 그
// 렌더 경로가 아예 없고, 감독 실기기가 WebGPU다. 헤드리스(WebGL/swiftshader)에서 통과해도
// 실기기에서 안 뜨는 형태의 사각이라, 여기서 셰이더를 쓰면 검증할 방법 자체가 없다.
//
// 그래서 두 백엔드에서 **똑같이 도는 수단**을 고른다: 노멀맵 두 장을 서로 다른 방향·속도로
// 흘린다. 두 파동이 간섭하며 만드는 무늬는 되풀이 주기가 길어 눈에 안 띄고, 빛이 물결
// 기울기를 따라 미끄러지며 반짝인다 — 일렁임의 정체는 사실 색이 아니라 **법선**이다.
//
// 비용도 성격이 다르다. 매 프레임 바뀌는 것은 `offset` 두 쌍(uniform 4개)뿐이고, 재질도
// 지오도 파이프라인도 그대로다. 개수 불변식에 아무 영향이 없다.
//
// ── 개수 불변식 ──────────────────────────────────────────────────────────────
// 메시 **셋**(해저·바다·강)·재질 둘(바다와 강이 공유)·지오 하나(셋이 공유)·텍스처 셋을
// 부팅 시 만들고 세션 내내 그대로 둔다. 드로우콜 **+3** 고정이다(그림자 패스 없음 —
// `castShadow`/`receiveShadow` 셋 다 끈다).
//
// 강이 셋째 판으로 늘어난 것은 감독이 강과 바다에 **다른 높이**를 지시했기 때문이다
// (강 −0.5 · 바다 −1.0). 재질·지오를 공유하므로 늘어난 것은 드로우콜 하나뿐이고
// 파이프라인 축은 그대로다.
//
// `transparent: true`는 파이프라인 캐시키 축이라 세션 중에 켜고 끄면 전량 재컴파일을
// 부른다. **부팅 시 한 번 정하고 다시 만지지 않는다** — 그래서 안전하다.

import * as THREE from 'three/webgpu';
import { RIVER_Y, SEA_Y, SEABED_Y, WATER_DEPTH, worldHalfExtent, parcelWater, waterGloss, riverFlowAt } from '../decide/water.js';
import type { SkyTime } from '../decide/night.js';
import { GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z } from '../decide/grid.js';
import { DEFAULT_LAYOUT } from '../parts/types.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

/** 세계의 바깥 가장자리(미터). 격자에서 유도한다 — 격자를 넓히면 물도 함께 물러난다 */
const EDGE = worldHalfExtent(DEFAULT_LAYOUT.cellX);

/**
 * 물 판의 한 변(미터).
 *
 * **세계 지름의 여러 배**여야 한다. 가장자리에 서서 바깥을 볼 때 물이 끝나고 허공이
 * 보이면 유한 세계가 아니라 부서진 세계로 읽힌다. 안개가 60.8m에서 모든 것을 덮으므로
 * 실제로 필요한 건 `세계 반경 + 안개 거리` 남짓이지만, 판 하나 늘린다고 드는 비용이
 * 삼각형 두 개뿐이라 넉넉히 잡는다.
 */
const PLANE = EDGE * 4;

/** 물결 한 무늬가 덮는 거리(미터). 파셀(32m)의 절반 — 사람 눈높이에서 잔물결로 읽히는 크기 */
const RIPPLE_M = 16;

/**
 * 강물이 흐르는 속력(m/s). 걷는 속도(5 m/s)보다 느려야 **강이 흐르는 것**으로 읽힌다 —
 * 빠르면 급류가 되고, 너무 느리면 고인 물이다. 실개천~완만한 강의 유속대다.
 */
const RIVER_FLOW_MPS = 1.1;

/** 수면 빛깔. 밝은 청록 — 어두우면 반투명이라도 바닥이 안 비쳐 보인다 */
const WATER = 0x8fc9dd;
/** 해저 빛깔. 물빛에 물든 모래. 채도를 낮춰야 물 너머로 보일 때 자연스럽다 */
const BED = 0x9aa89b;
/** 수면 불투명도. 낮추면 바닥이 또렷해 물웅덩이가 되고, 높이면 반투명인 뜻이 없어진다 */
const OPACITY = 0.7;

/**
 * 두 물결층이 흐르는 속도(m/s). **서로 다르고 방향도 어긋나야** 한다.
 *
 * 같은 속도로 같은 방향이면 두 층이 한 덩어리로 미끄러져 "무늬가 흐르는 벽지"가 된다.
 * 어긋나면 겹치는 자리가 계속 바뀌어 물이 살아 있는 것처럼 보인다 — 강이 사인파 둘을
 * 겹쳐 되풀이를 숨긴 것과 같은 원리다.
 *
 * 0.05 m/s 언저리는 잔잔한 호수, 0.2 를 넘으면 강물처럼 흐른다. 도시 안 물이라 잔잔한
 * 쪽으로 잡았다.
 */
const FLOW_A = { x: 0.035, z: 0.021 };
const FLOW_B = { x: -0.019, z: 0.030 };

/**
 * 물결 높이장. 사인파 넷을 겹친다 — 아래 두 텍스처가 이 하나의 함수에서 나온다.
 *
 * 주기가 캔버스 폭의 정수배여야 타일 이음매가 안 보인다 — 네 항 모두 `u`나 `v`가 1 늘 때
 * 위상이 2π의 정수배만큼 도는 계수를 골랐다. 이게 깨지면 물 위에 격자 솔기가 뜬다.
 * 테스트가 그것을 검사하므로 **export 한다**(그 목적 외에 쓰지 않는다). `u`/`v`는 0~1.
 */
export function waveHeight(u: number, v: number): number {
  return (
    // 각 항의 u·v 계수는 **모두 2π의 정수배**여야 한다. 처음에 이 항의 v 계수를 1.4π로
    // 두었다가 테스트가 잡았다 — v 방향으로 위상이 안 맞아 물 위에 가로 솔기가 뜬다.
    Math.sin(u * Math.PI * 2 + v * Math.PI * 6) * 0.5 +
    Math.sin(v * Math.PI * 4 - u * Math.PI * 2) * 0.3 +
    Math.sin((u + v) * Math.PI * 6) * 0.15 +
    Math.sin((u - v) * Math.PI * 8 + 1.1) * 0.1
  );
}

/**
 * 높이장을 노멀맵으로 굽는다. **일렁임의 정체는 색이 아니라 법선이다** — 빛이 기울기를
 * 따라 미끄러지며 반짝이는 것이 물처럼 보이게 한다.
 *
 * 인접 표본의 차분으로 기울기를 구해 접선공간 노멀(RGB)로 적는다.
 */
// 반환 타입은 일부러 적지 않는다. `three/webgpu` 는 `CanvasTexture` 를 타입으로
// 재수출하지 않아(TS2305/TS2694) 이름으로 적을 방법이 없고, 추론이 정확히 같은 타입을 준다.
function waveNormalTexture(strength: number, sparkle = false) {
  const N = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(N, N);
  const d = 1 / N;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const v = y / N;
      // 중앙차분. 가장자리는 wrap 으로 이어 붙여야 타일 경계에 솔기가 생기지 않는다
      const dx = (waveHeight((u + d) % 1, v) - waveHeight((u - d + 1) % 1, v)) * strength;
      const dy = (waveHeight(u, (v + d) % 1) - waveHeight(u, (v - d + 1) % 1)) * strength;
      // 접선공간 노멀 = normalize(-dx, -dy, 1) → 0~255
      const len = Math.hypot(dx, dy, 1);
      const i = (y * N + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  // 윤슬은 노멀을 다 구운 **뒤**에 새긴다 — 법선 계산은 그대로 두고 G채널만 점으로
  // 누르므로, 층 B 가 두 번째 파동으로서 하던 일이 유지된다(아래 `engraveSparkle` 주석).
  if (sparkle) engraveSparkle(img, N);
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(PLANE / RIPPLE_M, PLANE / RIPPLE_M);
  return tex;
}

// ── 윤슬 (감독 지시 2026-07-30) ─────────────────────────────────────────────
// *"물 느낌이 잘나왔으면 좋겠는데. 쉐이더 멋진것으로… 윤슬이 보이는 거였으면 좋겠어.
//   실제 반사로 하지말고. 쉐이더 트릭으로 했으면 해."*
//
// 윤슬은 잔물결에 빛이 부서지는 반짝임이다. 그런데 **감독이 이전에 정반대를 지적했다** —
// *"밤 강에서 반사가 어색하네. 밤인데 빛이 이렇게 많지 않잖아."* 그 처방으로
// `normalScale` 과 `roughness` 를 내려 하이라이트를 **넓게 퍼뜨린 은은한 띠**로 만들었다.
//
// 두 요구가 같은 파라미터의 반대 방향이다. 전체를 다시 밝히면 밤 지적이 되살아난다.
// 그래서 **전체 밝기는 그대로 두고 점만 반짝이게** 한다 — 그것이 윤슬의 실제 모습이고
// (넓은 빛무리가 아니라 잔물결 하나하나가 점으로 튄다), 밤에도 물 전체가 밝아지지 않는다.
//
// ── 왜 GLSL 이 아니고 이 방식인가 (팀장 판정 2026-07-30) ────────────────────
// `three/webgpu` 에는 GLSL `ShaderMaterial` 렌더 경로가 없다(이 파일 위쪽 주석). TSL 노드
// 재질은 world2 최초 도입이고 **헤드리스로 검증할 수 없는 축**이 늘어난다(감독 실기기가
// 유일 판정). 팀장이 그 3중 위험을 근거로 기각하고 현행 방식 확장을 지시했다:
// *"반짝임의 정체는 법선 위의 스페큘러이고, 이것은 실제 광원 방향을 따른다."*
//
// **`emissive` 로 내지 않는다**(팀장 조건 4) — 스스로 빛나는 물은 광원과 무관해져 밤
// 지적과 정면 충돌한다. 반짝임은 반드시 광원 의존 경로(roughness 변조)로 낸다.
//
// ── 슬롯을 추가하지 않는다 ──────────────────────────────────────────────────
// three 의 표준 재질은 `roughnessMap` 의 **G채널만** 읽는다. 층 B 노멀맵이 그 슬롯에
// 꽂혀 있는데 R·B 채널은 아무도 안 본다 — 그래서 **G채널에 스파클을 곱해 넣으면** 한 장이
// 두 역할을 한다(텍스처 0장 추가·드로우콜 0·파이프라인 축 무변화 = 개수 불변식 [7] 유지).
const SPARKLE_CELL = 7;      // 스파클 격자 한 칸(px) — 촘촘하면 물이 서리처럼 된다
const SPARKLE_RATE = 0.16;   // 칸당 점이 생길 확률
const SPARKLE_MIN_R = 0.06;  // 점의 거칠기(0에 가까울수록 좁고 세게 튄다)

/**
 * 층 B 노멀맵의 G채널에 윤슬 점을 새긴다. **제자리 변형**이므로 반환값이 없다.
 *
 * G채널이 낮은 자리 = 거칠기가 낮은 자리 = 스페큘러가 좁고 강한 자리다. 물결 법선과
 * 겹쳐 있어 점이 물결을 타고 흐르고, 층 A·B 의 `offset` 이 서로 다른 방향이라 점이
 * 나타났다 사라지며 **명멸**한다 — 윤슬이 반짝이는 이유가 그것이다.
 *
 * 시드를 고정한다. 매 실행 같은 배치여야 스크린샷 비교가 성립한다.
 */
function engraveSparkle(img: ImageData, N: number) {
  let seed = 20260730;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let cy = 0; cy < N; cy += SPARKLE_CELL) {
    for (let cx = 0; cx < N; cx += SPARKLE_CELL) {
      if (rand() > SPARKLE_RATE) continue;
      // 칸 안 임의 위치 — 격자 그대로 두면 점이 줄지어 서 격자무늬로 읽힌다
      const x = cx + Math.floor(rand() * SPARKLE_CELL);
      const y = cy + Math.floor(rand() * SPARKLE_CELL);
      if (x >= N || y >= N) continue;
      // **낮추기만 한다**(`Math.min`). 올리면 물결 법선이 만든 거칠기를 지우게 되고,
      // 그러면 층 B 가 두 번째 파동으로서 하던 일이 사라진다.
      const i = (y * N + x) * 4 + 1; // +1 = G채널
      img.data[i] = Math.min(img.data[i], SPARKLE_MIN_R * 255);
    }
  }
}

/**
 * 밝기 무늬. 같은 높이장에서 굽는다 — 물마루가 밝고 골이 어둡다.
 *
 * 색은 넣지 않는다. 재질의 `color`가 색을 정하고 이 텍스처는 곱해질 뿐이라, 여기에 색을
 * 넣으면 두 곳에서 색을 정하는 미러링이 된다(이 프로젝트가 도로에서 이미 겪었다 —
 * 어두운 톤이 텍스처와 곱해져 길이 검게 나왔다).
 */
function waveTintTexture() {
  const N = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // 높이 −1~1 → 밝기 0.82~1.0. 폭을 좁게 잡아야 무늬가 얼룩으로 보이지 않는다
      const s = (waveHeight(x / N, y / N) * 0.5 + 0.5) * 0.18 + 0.82;
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = s * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(PLANE / RIPPLE_M, PLANE / RIPPLE_M);
  return tex;
}

/**
 * 강 판의 지오메트리 — **물 파셀 위에만 깐 쿼드 묶음.**
 *
 * 왜 큰 평면 하나가 아닌지는 아래 `river` 조립부 주석에 적었다(요약: 바다 판과 상시
 * 이중 겹침이 되어 반투명 캘리브레이션이 무효화된다).
 *
 * **어디가 물인지는 `parcelWater` 에만 묻는다.** 강 중심선·반폭을 여기서 다시 계산하면
 * 그것이 값 미러링이고, 판정이 강을 옮겼을 때 물 구멍과 강 판이 어긋난다.
 *
 * 격자 안만 순회하는 것이 중요하다 — `parcelWater` 는 격자 **밖**도 `'water'` 로
 * 돌려주는데(세계의 끝 = 바다) 그쪽은 바다 판이 덮는다. 밖까지 깔면 바다 전체에 강
 * 높이의 판이 한 장 더 생겨 원래 문제로 되돌아간다.
 *
 * UV 는 바다 판(`PlaneGeometry(PLANE, PLANE).rotateX(-π/2)`)과 **같은 규칙**으로 낸다.
 * 그 회전 뒤 `u = x/PLANE + 0.5` · `v = 0.5 − z/PLANE` 가 되므로 그대로 쓴다 — 어긋나면
 * 물결 무늬가 강과 바다에서 다른 크기·다른 방향으로 흐른다(같은 재질이므로 `repeat` 와
 * `offset` 은 저절로 공유된다).
 */
function riverGeometry(): { geo: THREE.BufferGeometry; baseUv: number[]; flow: number[] } {
  const cellX = DEFAULT_LAYOUT.cellX;
  const cellZ = DEFAULT_LAYOUT.cellZ;
  const pos: number[] = [];
  const uv: number[] = [];
  /** 정점별 흐름 방향(UV 공간, 단위벡터). 매 프레임 UV 를 이 방향으로 민다. */
  const flow: number[] = [];
  const idx: number[] = [];
  let n = 0;

  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      if (parcelWater(px, pz, cellX, cellZ) !== 'water') continue;

      // 파셀이 덮는 범위. 지면 판과 **같은 규칙**이라야 물 구멍에 정확히 들어맞는다.
      const x0 = px * cellX - cellX / 2;
      const x1 = px * cellX + cellX / 2;
      const z0 = pz * cellZ - cellZ / 2;
      const z1 = pz * cellZ + cellZ / 2;

      // y=0 으로 만들고 높이는 메시의 `position.y`(= RIVER_Y)가 준다 — 바다 판과
      // 같은 방식이라 높이를 옮길 때 손댈 곳이 한 군데다.
      pos.push(x0, 0, z0,  x1, 0, z0,  x1, 0, z1,  x0, 0, z1);
      uv.push(
        x0 / PLANE + 0.5, 0.5 - z0 / PLANE,
        x1 / PLANE + 0.5, 0.5 - z0 / PLANE,
        x1 / PLANE + 0.5, 0.5 - z1 / PLANE,
        x0 / PLANE + 0.5, 0.5 - z1 / PLANE,
      );
      // 흐름 방향 — **정점의 x 로** 구한다(파셀 중심이 아니라). 한 파셀 안에서도
      // 좌우 끝의 접선이 달라야 굽이가 부드럽게 이어진다. 월드 (x,z) 를 UV 로 옮길 때
      // v 축이 뒤집히므로(`0.5 - z/PLANE`) z 성분의 부호를 바꾼다.
      for (const [vx] of [[x0], [x1], [x1], [x0]]) {
        const f = riverFlowAt(vx);
        flow.push(f.x, -f.z);
      }
      // 위에서 내려다볼 때 앞면이 되도록 감는다(반시계). 뒤집히면 위에서 안 보인다.
      idx.push(n, n + 2, n + 1, n, n + 3, n + 2);
      n += 4;
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  // 법선은 전부 위쪽 — 수평 판이므로 계산할 것이 없다. `computeVertexNormals` 를 쓰면
  // 같은 값을 삼각형마다 다시 구하는 셈이고, 물결은 노말맵이 낸다.
  g.setAttribute('normal', new THREE.Float32BufferAttribute(
    new Array(n * 3).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3,
  ));
  g.setIndex(idx);
  // 기준 UV 를 따로 들고 있는다. 매 프레임 **기준에서 다시 계산**한다 —
  // 누적하면 부동소수 오차가 쌓여 무늬가 서서히 어긋난다.
  return { geo: g, baseUv: uv.slice(), flow };
}

export const oceanFeature: Feature = {
  name: 'ocean',

  create(env: FeatureEnv): FeatureInstance | null {
    // 캔버스가 없는 환경(테스트·헤드리스 조립)에서는 켜지 않는다. 기능이 스스로 판단하고
    // 조립부는 물을 모른다 — `Feature.create`가 null을 돌려줄 수 있게 한 이유다.
    if (!env.doc) return null;

    // 세그먼트 1 — 물결은 정점이 아니라 법선으로 낸다. 정점을 쪼개면 삼각형만 늘고,
    // 실제 파도 진폭이 없는 지금은 보이는 차이가 0이다.
    const geo = new THREE.PlaneGeometry(PLANE, PLANE, 1, 1).rotateX(-Math.PI / 2);

    const bedMat = new THREE.MeshStandardMaterial({ color: BED, roughness: 0.95 });
    const bed = new THREE.Mesh(geo, bedMat);
    bed.position.y = SEABED_Y;

    // 층 A는 법선 + 밝기, 층 B는 법선만. 둘의 `offset`이 따로 흐른다.
    const normA = waveNormalTexture(2.2);
    const normB = waveNormalTexture(1.4, true); // 윤슬 — G채널에 점(감독 지시)
    const tint = waveTintTexture();

    const seaMat = new THREE.MeshStandardMaterial({
      color: WATER,
      map: tint,
      normalMap: normA,
      // 두 번째 층은 `roughnessMap` 자리에 태운다. three 의 표준 재질에 노멀맵 슬롯이
      // 하나뿐이라, 남는 스칼라 맵으로 "거칠기가 물결을 따라 변하는" 두 번째 파동을 만든다.
      // 반짝임이 물결과 함께 흘러 층이 둘로 읽힌다.
      roughnessMap: normB,
      // ── 반짝임 세기 (감독 지적) ─────────────────────────────────────────
      // *"밤 강에서 반사가 어색하네. 밤인데 빛이 이렇게 많지 않잖아. 달빛이나 주변
      // 가로등."*
      //
      // 예전 값(normalScale 0.85 · roughness 0.28)은 **한낮 바다**의 것이었다. 거친
      // 물결 법선에 좁은 스페큘러가 얹혀, 수면 곳곳에 흰 덩어리가 떠 있었다.
      //
      // 두 축을 함께 내린다:
      //   · `normalScale` — 물결 기울기를 낮춰 빛이 튀는 각도 자체를 줄인다
      //   · `roughness`   — 하이라이트를 넓게 퍼뜨려 **덩어리 대신 은은한 띠**로 만든다
      //
      // 좁고 밝은 점을 그냥 어둡게만 하면 "약한 점"이 될 뿐 여전히 점이다. 달빛이
      // 물에 비치는 모습은 넓게 번지는 쪽이라, 퍼뜨리는 것이 세기를 줄이는 것보다
      // 중요하다.
      //
      // 시간대로 분기하지 않는다. 낮에도 이 정도가 과하지 않고, 분기를 넣으면
      // 바다가 하늘의 상태를 알아야 해서 기능 사이에 결합이 생긴다.
      // 광택은 **시간대가 정한다**(`decide/water.ts` 의 `waterGloss`). 여기서 값을
      // 다시 적지 않는다 — 예전에 밤을 위해 낮춘 전역값이 낮의 반짝임을 죽였고,
      // 그 값이 이 자리에 하드코딩돼 있었다(감독 지시 2026-07-31 "반짝임부터 살려봐").
      normalScale: new THREE.Vector2(1, 1),  // 아래 applyGloss 가 즉시 덮는다
      roughness: 0.5,                         // 〃
      metalness: 0.05,
      transparent: true,
      opacity: OPACITY,
      // 반투명 판이 깊이를 기록하면, 같은 물 위에 훗날 무엇을 띄우든 정렬이 꼬인다.
      depthWrite: false,
    });
    // 광택을 시간대에 맞춘다. 판정은 `waterGloss` 가 하고 여기는 집행만 한다 —
    // **경계를 건너는 지점**이라 통합 테스트로 따로 본다(`tests/world2-water-gloss.test.ts`).
    // 값이 재질에 실제로 닿는지는 순수 함수 테스트로는 알 수 없다.
    const applyGloss = (time: SkyTime): void => {
      const g = waterGloss(time);
      seaMat.normalScale.set(g.normalScale, g.normalScale);
      seaMat.roughness = g.roughness;
      seaMat.needsUpdate = true;
    };
    let glossTime = env.time();
    applyGloss(glossTime);

    const sea = new THREE.Mesh(geo, seaMat);
    sea.position.y = SEA_Y;
    // 해저보다 늦게 그려야 그 위에 비친다.
    sea.renderOrder = 1;

    // ── 강 판 (감독 지시 2026-07-30) ────────────────────────────────────────
    // *"강은 땅보다 50 cm 밑, 바다는 땅보다 1미터 밑에 있게해."*
    //
    // 두 높이를 요구하므로 판이 하나일 수 없다. **재질은 바다와 공유한다** — 같은
    // 물이고, 재질을 따로 만들면 물빛·윤슬·불투명도가 두 곳에 적히는 미러링이 된다.
    //
    // ── 지오는 공유하지 않는다 (검수관 블로커) ──────────────────────────────
    // 처음에는 지오도 공유했다(둘 다 세계보다 큰 `PLANE` 판). 그러면 **강이 보이는 모든
    // 곳에서 두 판이 겹쳐 그려진다** — 격자 안에서 물인 곳은 강뿐이므로 "겹치는 구역"이
    // 국지적인 게 아니라 물이 보이는 전 구간이 그 상태였다.
    //
    // 반투명 두 장이 겹치면 실효 불투명도가 `1 − (1 − 0.7)² = 0.91` 로 올라간다.
    // `WATER_DEPTH` 는 **단일 반투명 층**을 전제로 고른 값이므로(물가에서 바닥이 어렴풋이
    // 비치는 깊이) 그 캘리브레이션이 무효가 된다. 값이 아니라 전제가 깨진 형태다.
    //
    // 그래서 강 판을 **물 파셀 위에만** 깐다. `parcelWater` 가 'water' 로 분류한 칸에
    // 정확히 그 칸 크기의 쿼드를 놓는다 — 판정과 렌더가 **같은 해상도**를 쓰므로 틈도
    // 초과도 없다. 강 폭에 맞춰 리본을 그리는 방법도 있지만, 그러면 판정(파셀 단위)과
    // 렌더(미터 단위)의 해상도가 달라 강 가장자리에 바다가 비치는 띠가 생긴다.
    //
    // 강 모양을 이 파일이 정하지는 않는다 — `decide/water.ts` 에 묻는다. 판정이 강 경로를
    // 바꾸면 이 지오가 따라온다(이 파일 머리말이 지키려는 성질 그대로다).
    //
    // 강이 바다보다 위에 있으므로 더 늦게 그린다. 하구에는 50cm 단차가 생기는데 1차는
    // 그대로 둔다(팀장 판정: *"감독은 폭포를 지시하지 않았다 — 지시 안 한 연출을 추측으로
    // 메우지 않는다"*). 안개가 60.8m 에서 덮으므로 멀리서는 보이지 않는다.
    const { geo: riverGeo, baseUv: riverBaseUv, flow: riverFlow } = riverGeometry();
    const river = new THREE.Mesh(riverGeo, seaMat);
    // 매 프레임 쓸 UV 속성을 붙잡아 둔다 — `getAttribute` 를 프레임마다 부르면
    // 문자열 조회가 반복된다(작지만, 이 루프는 초당 60번 돈다).
    const riverUvAttr = riverGeo.getAttribute('uv');
    river.position.y = RIVER_Y;
    river.renderOrder = 2;

    for (const m of [bed, sea, river]) {
      m.castShadow = false;
      m.receiveShadow = false;
      // 프러스텀 컬링을 끈다. 판이 워낙 커서 바운딩 스피어 중심(원점)이 시야 밖으로
      // 나가는 각도에서 통째로 사라질 수 있다 — 그 순간 세계 바닥에 구멍이 뚫린 것처럼 보인다.
      m.frustumCulled = false;
      env.scene.add(m);
    }
    bed.name = 'seabed';
    sea.name = 'ocean';
    river.name = 'river';

    let t = 0;

    return {
      system: {
        name: 'ocean',
        update(ctx) {
          t += ctx.dt;

          // ── 시간대가 바뀌면 광택을 다시 건다 ──────────────────────────────
          // **바뀔 때만** 건다. 매 프레임 대입하면 three 가 유니폼을 계속 갱신하고,
          // 무엇보다 "왜 바뀌었나" 를 리포트에서 추적할 수 없다.
          const now = env.time();
          if (now !== glossTime) { glossTime = now; applyGloss(now); }
          // UV 단위로 환산해서 흘린다. 한 무늬가 RIPPLE_M 미터를 덮으므로
          // `초당 미터 / RIPPLE_M`이 초당 UV 이동량이다 — 화면 속도가 실제 m/s와 맞는다.
          const a = t / RIPPLE_M;
          normA.offset.set(FLOW_A.x * a, FLOW_A.z * a);
          tint.offset.copy(normA.offset);
          normB.offset.set(FLOW_B.x * a, FLOW_B.z * a);

          // ── 강만 제 방향으로 흐른다 (감독 지시 "물살로 보이고") ──────────────
          // 위 `offset` 은 텍스처 하나에 걸리므로 **씬 전체가 한 방향**이다. 바다는
          // 방향이 없으니 그것으로 족하지만, 강은 굽이를 따라 흘러야 강으로 읽힌다.
          // 그래서 강만 **UV 를 정점별로** 민다 — 정점마다 접선이 다르고 래스터라이저가
          // 그 사이를 보간하므로, 파셀(32m) 해상도의 flow map 이 공짜로 생긴다.
          //
          // **기준 UV 에서 매번 다시 계산한다**(누적하지 않는다). 누적하면 부동소수
          // 오차가 쌓여 무늬가 서서히 어긋나고, 그 어긋남은 오래 봐야 보여서 잡기 어렵다.
          //
          // `phase` 를 타일 하나(`RIPPLE_M`)로 되감는다. 흐름 벡터가 **전부 단위벡터**라
          // (`riverFlowAt` 이 보증한다) 모든 정점이 같은 순간에 되감기고, 무늬가 주기
          // 경계에서 정확히 겹쳐 되감기가 눈에 안 보인다.
          const phase = ((t * RIVER_FLOW_MPS) % RIPPLE_M) / PLANE;
          const uvArr = riverUvAttr.array as Float32Array;
          for (let i = 0; i < uvArr.length; i += 2) {
            uvArr[i]     = riverBaseUv[i]     + riverFlow[i]     * phase;
            uvArr[i + 1] = riverBaseUv[i + 1] + riverFlow[i + 1] * phase;
          }
          riverUvAttr.needsUpdate = true;
        },
      },

      diagnostics() {
        const { x, z } = env.player.position;
        return {
          // 높이가 둘로 갈렸으므로 둘 다 보고한다. 하나만 내보내면 "어느 판을 본
          // 것인지" 를 밖에서 구별할 수 없다.
          y: SEA_Y,
          riverY: RIVER_Y,
          depth: `${WATER_DEPTH.toFixed(1)}m`,
          riverDepth: `${(RIVER_Y - SEABED_Y).toFixed(1)}m`,
          // 강 판이 덮은 파셀 수. **0 이면 강이 아예 안 보인다** — 판정이 강을 옮겼거나
          // 격자 순회가 어긋나면 조용히 빈 지오가 되고, 화면에는 "바다만 보이는 강"으로
          // 나타난다. 에러도 경고도 없으므로 셀 수 있게 내보낸다.
          riverParcels: riverGeo.index ? riverGeo.index.count / 6 : 0,
          // 세계의 끝에 얼마나 가까운지. 격자가 사각형이므로 **가장 가까운 변**까지의
          // 거리다 — 원형이던 시절의 `반경 − 중심거리` 를 그대로 두면 모서리 근처에서
          // 음수가 나와 "밖에 있다"고 잘못 읽힌다.
          fromEdge: `${(EDGE - Math.max(Math.abs(x), Math.abs(z))).toFixed(0)}m`,

          // ── 물결이 실제로 흐르는가 ─────────────────────────────────────────
          // 감독이 요구한 것은 "살랑살랑"이고, 그 정체는 이 두 offset 이 매 프레임
          // 움직이는 것이다. 그런데 헤드리스에서 그것을 확인할 길이 없어 스모크가
          // 두 번 연속 "측정 불가"로 남겼다 — 검증기의 잘못이 아니라 측정 지점을
          // 안 만들어 둔 잘못이다(이 파일 위쪽 진단 훅 주석이 같은 말을 한다).
          //
          // **텍스처에서 직접 읽는다.** `t`나 `FLOW_A * a` 를 되돌려주면 "계산은
          // 했는데 텍스처에 안 꽂혔다"를 못 잡는다 — 구름 `alpha` 미소비가 정확히
          // 그 형태였고, 판정과 집행 사이의 그 구멍이 이 프로젝트의 상시 위험이다.
          //
          // 두 층을 다 내보내는 이유: 하나만 보면 "둘이 같은 방향으로 흐르는"
          // 결함(= 흐르는 벽지)을 밖에서 판별할 수 없다.
          flowA: [normA.offset.x, normA.offset.y],
          flowB: [normB.offset.x, normB.offset.y],
        };
      },

      dispose() {
        // 세 판을 다 뗀다. `river` 가 빠져 있었다 — 판을 늘리면서 이 목록을 안 늘렸고,
        // 씬에 남은 메시는 재질이 해제된 뒤에도 렌더 목록에 올라 있다.
        env.scene.remove(bed);
        env.scene.remove(sea);
        env.scene.remove(river);
        geo.dispose();
        riverGeo.dispose(); // 강은 자기 지오를 갖는다(파셀 단위 쿼드 묶음)
        bedMat.dispose();
        seaMat.dispose();
        normA.dispose();
        normB.dispose();
        tint.dispose();
      },
    };
  },
};
