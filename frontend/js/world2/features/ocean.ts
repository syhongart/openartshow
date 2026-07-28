// world2/features/ocean.ts — 바다와 강. 감독 확정 "섬. 강", 표현은 "복셀스처럼".
//
// ── 물을 그리지 않고 물을 만든다 ────────────────────────────────────────────
// 이 파일이 하는 일은 **큰 판 둘을 지면보다 낮게 깔아 두는 것**이 전부다. 바다도 강도
// 따로 만들지 않는다 — `decide/water.ts`가 물이라 판정한 파셀을 스트리밍이 아예 로드하지
// 않고, 그 구멍으로 이 판들이 비친다.
//
// 그래서 강의 경로를 바꿔도 이 파일은 손댈 것이 없다. 강 모양을 아는 곳은 판정 하나뿐이고
// 여기는 "물의 높이"만 안다.
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
// 메시 둘·재질 둘·지오 하나(둘이 공유)·텍스처 셋을 부팅 시 만들고 세션 내내 그대로 둔다.
// 드로우콜 **+2** 고정이다(그림자 패스 없음 — `castShadow`/`receiveShadow` 둘 다 끈다).
//
// `transparent: true`는 파이프라인 캐시키 축이라 세션 중에 켜고 끄면 전량 재컴파일을
// 부른다. **부팅 시 한 번 정하고 다시 만지지 않는다** — 그래서 안전하다.

import * as THREE from 'three/webgpu';
import { SEA_Y, SEABED_Y, worldHalfExtent } from '../decide/water.js';
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
function waveNormalTexture(strength: number) {
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
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(PLANE / RIPPLE_M, PLANE / RIPPLE_M);
  return tex;
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
    const normB = waveNormalTexture(1.4);
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
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.62,
      metalness: 0.05,
      transparent: true,
      opacity: OPACITY,
      // 반투명 판이 깊이를 기록하면, 같은 물 위에 훗날 무엇을 띄우든 정렬이 꼬인다.
      depthWrite: false,
    });
    const sea = new THREE.Mesh(geo, seaMat);
    sea.position.y = SEA_Y;
    // 해저보다 늦게 그려야 그 위에 비친다.
    sea.renderOrder = 1;

    for (const m of [bed, sea]) {
      m.castShadow = false;
      m.receiveShadow = false;
      // 프러스텀 컬링을 끈다. 판이 워낙 커서 바운딩 스피어 중심(원점)이 시야 밖으로
      // 나가는 각도에서 통째로 사라질 수 있다 — 그 순간 세계 바닥에 구멍이 뚫린 것처럼 보인다.
      m.frustumCulled = false;
      env.scene.add(m);
    }
    bed.name = 'seabed';
    sea.name = 'ocean';

    let t = 0;

    return {
      system: {
        name: 'ocean',
        update(ctx) {
          t += ctx.dt;
          // UV 단위로 환산해서 흘린다. 한 무늬가 RIPPLE_M 미터를 덮으므로
          // `초당 미터 / RIPPLE_M`이 초당 UV 이동량이다 — 화면 속도가 실제 m/s와 맞는다.
          const a = t / RIPPLE_M;
          normA.offset.set(FLOW_A.x * a, FLOW_A.z * a);
          tint.offset.copy(normA.offset);
          normB.offset.set(FLOW_B.x * a, FLOW_B.z * a);
        },
      },

      diagnostics() {
        const { x, z } = env.player.position;
        return {
          y: SEA_Y,
          depth: `${(SEA_Y - SEABED_Y).toFixed(1)}m`,
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
        env.scene.remove(bed);
        env.scene.remove(sea);
        geo.dispose();
        bedMat.dispose();
        seaMat.dispose();
        normA.dispose();
        normB.dispose();
        tint.dispose();
      },
    };
  },
};
