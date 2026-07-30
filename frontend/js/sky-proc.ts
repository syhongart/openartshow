// @ts-nocheck — 신규 모듈이지만 소비자(builder.js·visit.js·space-parts.ts)가 전부
//   @ts-nocheck 계열이고 THREE 객체를 그대로 넘긴다. strict 타입은 후속 작업.
//
// sky-proc.ts — 공간 빌더·방문자뷰의 **하늘 배경과 창밖 풍경**.
//
// ── 왜 이 모듈이 있나 (#78 트랙A, 감독 비전 #77 "공간 대개방") ────────────────
// 빌더는 오빗 카메라가 천장을 숨기고(hideCeiling) 위에서 내려다보므로 **벽 위로
// 배경이 크게 보인다.** 그 자리가 단색 `0x15161a`(거의 검정)여서 "허공에 뜬 방" 으로
// 읽혔다. 작가가 자기 전시를 꾸미는 화면인데 세계가 없는 것처럼 보이는 것이 결함이다.
//
// ── 값은 여기서 만들지 않는다 (값 미러링 금지) ──────────────────────────────
// 하늘 팔레트·구름 밀도·바다색은 **`THEMES.daylight` 를 참조한다.** 디자이너 판정
// (2026-07-30): *"브랜드 하늘색을 새로 만들 이유가 없다. 메인 미술관과 빌더가 같은
// '하늘' 을 공유해야 같은 세계관으로 읽힌다."* 새 값을 여기 적으면 미술관 하늘을
// 바꿀 때 빌더만 옛 하늘로 남는다 — 이 저장소가 이미 낸 사고의 형태다.
//
// import 는 **leaf 모듈 직접**이다(`./scene.js` 배럴 경유 아님). 배럴은 world1 씬
// 조립(`createMuseum`)까지 그래프에 끌어오고, 빌더는 그것이 필요 없다. `scene-themes`
// 와 `scene-textures` 는 둘 다 leaf(타 scene 모듈 미참조)다.
import * as THREE from 'three';
import { THEMES } from './scene-themes.js';
import { renderSkyTexture, makeRand } from './scene-textures.js';

// 빌더·방문자뷰는 **낮 하나**로 고정한다 (디자이너 판정 2026-07-30).
// 근거: builder.js 의 실내 조명(헤미 0xfff3e6/0x241f30·키라이트 0xfff2e0·PMREM 환경맵)이
// 전부 따뜻한 낮 채광 전제로 튜닝돼 있다. 여기에 황혼·야간 하늘만 얹으면 "하늘은 밤인데
// 실내는 대낮" 이라는 **새 불일치**가 생기고, 그것을 없애려면 인테리어 조명도 테마별로
// 다시 튜닝해야 한다 — 트랙A 범위를 벗어난다(한쪽만 고쳐 앞뒤가 안 맞는 패턴).
// 확장은 열려 있다: `THEMES.sunset`·`THEMES.night` 가 이미 같은 형태로 존재한다.
const THEME = THEMES.daylight;

// ---------------------------------------------------------------------------
// 하늘 돔
// ---------------------------------------------------------------------------
// 반경 450 — 방(최대 수십 m)보다 훨씬 크게 두어 카메라가 어디에 있든 배경으로 읽힌다.
// y=-70 으로 내려 수평선이 눈높이 아래에 오게 한다(방 바닥보다 낮은 지평).
const DOME_RADIUS = 450;
const DOME_Y = -70;

/**
 * 하늘 돔 메시. 씬에 add 하면 배경이 된다.
 *
 * **`fog: false` 가 필수다.** 방문자뷰의 `scene.fog` 는 near/far 가 방 스케일로 작게
 * 잡혀 있어(`visit.js` 의 fogNear = min(fw,fd)*0.5), 반경 450 돔은 fogFar 보다 훨씬
 * 멀다 → fog 를 받으면 **돔 전체가 fog 색으로 덮여 안 보인다.** 디자이너가 이 제약을
 * 스펙에 명시했다.
 *
 * `BackSide` — 안쪽에서 보므로 뒷면을 그린다.
 */
export function createSkyDome() {
  const geo = new THREE.SphereGeometry(DOME_RADIUS, 32, 16);
  const mat = new THREE.MeshBasicMaterial({
    map: renderSkyTexture(THEME.sky),
    side: THREE.BackSide,
    fog: false,
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.position.y = DOME_Y;
  dome.name = 'skyDome';
  // 항상 배경이므로 그림자·레이캐스트에서 뺀다(빌더는 클릭 배치라 레이캐스트가 잦다).
  dome.castShadow = false;
  dome.receiveShadow = false;
  dome.raycast = () => {};
  return dome;
}

/** 첫 프레임 안전망용 배경색 — 돔이 화면을 채우기 전 한 프레임에만 보인다. */
export function skyHorizonColor() {
  // 하늘 그라디언트의 **마지막 stop(수평선)** 에서 뽑는다. 값을 적어두면 팔레트를
  // 바꿀 때 여기만 옛 색으로 남는다.
  const stops = THEME.sky.stops;
  return new THREE.Color(stops[stops.length - 1][1]);
}

/** 방문자뷰 fog 색 — 하늘과 이어지는 톤. 이것도 THEMES 에서 가져온다. */
export function skyFogColor() {
  // 기존 `visit.js` 의 `0x20232b`(어두운 중성회색)를 그대로 두면 하늘은 밝은 파랑인데
  // **먼 벽이 어두운 회색 안개로 사라지는 이음매 불일치**가 생긴다(디자이너 지적).
  return new THREE.Color(THEME.fog.color);
}

// ---------------------------------------------------------------------------
// 창밖 풍경 텍스처
// ---------------------------------------------------------------------------
// 벽을 뚫지 않는다. 창 유리(`MATS.windowGlass`)에 하늘+수평선+바다를 그린 텍스처를
// 얹는 트롱프뢰유다 — 실제 구멍·transmission 없음, 라이트맵 무영향.
//
// **유리는 `opacity: 0.34` 반투명이고 뒤에 벽 마감이 그대로 있다.** 표준 알파 블렌딩은
//   최종색 = 유리색 × 0.34 + 벽색 × 0.66
// 이라 `map` 만 쓰면 66% 가 벽색이라 텍스처가 거의 안 보인다 — 디자이너가 실측으로
// 확인했다(흰 벽에서 "밋밋한 회색 사각형"). 그래서 **같은 텍스처를 `emissiveMap` 으로도
// 물려** 자기발광시킨다. emissive 는 씬 조명에 곱해지지 않으므로 벽 마감(흰·warmsand·
// 차콜)이 무엇이든 같은 밝기로 뚫고 나온다. 3종 벽 전부에서 판독 확인.
const SCENERY_SIZE = 512;
const HORIZON_RATIO = 0.62; // 하늘 62% : 바다 38%
const GLOW_SPAN = 34;       // 수평선 글로우 반폭(px)
const GLOW_PEAK = 0.55;
const SEA_BOTTOM_SCALE = 0.55; // 먼 바다(밝음) → 가까운 바다(어둡게) 유도 배율

let _sceneryTex = null;

/**
 * 창밖 풍경 CanvasTexture. **세션당 1회 생성해 모든 창이 공유한다** — 정적 배경화라
 * 파츠별 고유성이 필요 없고, 창 개수만큼 512² 텍스처를 만들면 힙이 그만큼 늘어난다
 * (빌더의 `makeEnvMap` 공유 패턴과 같은 이유).
 */
export function getWindowSceneryTexture() {
  if (_sceneryTex) return _sceneryTex;

  const size = SCENERY_SIZE;
  const horizonY = size * HORIZON_RATIO;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // ① 하늘 — 돔과 **같은 stops** 를 0~horizonY 구간에 리매핑한다.
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  for (const [stop, color] of THEME.sky.stops) skyGrad.addColorStop(stop, color);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, size, horizonY);

  // ② 바다 — 위(수평선 쪽)는 `THEMES.daylight.sea.color` 그대로, 아래는 그것을 어둡게
  //    **유도한다.** 두 번째 색을 적어두면 바다색을 바꿀 때 한쪽만 남는다.
  const seaTop = new THREE.Color(THEME.sea.color);
  const seaBottom = seaTop.clone().multiplyScalar(SEA_BOTTOM_SCALE);
  const seaGrad = ctx.createLinearGradient(0, horizonY, 0, size);
  seaGrad.addColorStop(0, `#${seaTop.getHexString()}`);
  seaGrad.addColorStop(1, `#${seaBottom.getHexString()}`);
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, horizonY, size, size - horizonY);

  // ③ 수평선 글로우 — 하늘과 바다의 접합을 부드럽게. 색은 유리의 기존 emissive
  //    (`0xfff0cf`, "빛 든 느낌")와 같은 톤이어야 재질과 싸우지 않는다.
  const glow = ctx.createLinearGradient(0, horizonY - GLOW_SPAN, 0, horizonY + GLOW_SPAN);
  glow.addColorStop(0, 'rgba(255, 240, 207, 0)');
  glow.addColorStop(0.5, `rgba(255, 240, 207, ${GLOW_PEAK})`);
  glow.addColorStop(1, 'rgba(255, 240, 207, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizonY - GLOW_SPAN, size, GLOW_SPAN * 2);

  // ④ 원경 구름 — 돔과 같은 radial blob 기법이지만 덩이당 파티클 5개(돔은 7개)로
  //    밀도를 낮춘다. 512² 작은 화면이라 돔 밀도를 그대로 쓰면 뭉개진다.
  const rand = makeRand(4242);
  for (let i = 0; i < 3; i++) {
    const cx = rand() * size;
    const cy = horizonY * (0.65 + rand() * 0.3); // 수평선 위쪽 대역
    const scale = 26 + rand() * 34;
    for (let p = 0; p < 5; p++) {
      const px = cx + (rand() - 0.5) * scale * 2.2;
      const py = cy + (rand() - 0.5) * scale * 0.6;
      const pr = scale * (0.4 + rand() * 0.5);
      const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, `rgba(255,255,255,${0.18 + rand() * 0.14})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _sceneryTex = new THREE.CanvasTexture(canvas);
  // **색공간 명시 필수** — 누락이 하늘을 3배 밝힌 실제 사고가 있다(팀장 조건).
  _sceneryTex.colorSpace = THREE.SRGBColorSpace;

  // ── `shared` 플래그가 없으면 dispose 에 파괴된다 ────────────────────────
  // `disposeSpaceGroup` 은 재질의 `map` 을 회수하는데, **`userData.shared` 인 것만
  // 건너뛴다**(`space-assembler.ts` 의 dispose 루프). 이 텍스처는 세션당 1개를 모든
  // 창이 공유하므로, 플래그가 없으면 **공간 하나를 언로드할 때 파괴되어 남은/다음
  // 공간의 창이 깨진다.** 그 파일 주석이 같은 시나리오를 이미 경고하고 있다:
  //   "한 파셀 언로드가 그것을 dispose하면 남은 파셀의 렌더가 깨지고 다음 사용 시
  //    파이프라인이 재생성된다"
  // 스모크는 페이지를 한 번 열 뿐이라 이 결함을 통과시킨다 — 공간 전환이 있어야 난다.
  _sceneryTex.userData.shared = true;
  return _sceneryTex;
}

/**
 * 창 유리 재질에 창밖 풍경을 얹는 emissive 세기.
 *
 * 기존 `0.28` → `0.8`. 디자이너 실측: 0.6/0.95/1.3 세 배율을 3종 벽 마감 앞에서 비교해
 * 0.8 이 여유 있게 판독됨을 확인했다. **이것은 THREE.Light 의 물리 광량 단위가 아니다** —
 * 재질 배율이므로 `THEMES` 의 `intensity`(PointLight 20~60 등)와 섞어 읽지 말 것.
 */
export const WINDOW_EMISSIVE_INTENSITY = 0.8;
