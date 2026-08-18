// world2/features/grass.ts — 스타일라이즈드 잔디. **켜지지 않으면 씬을 한 번도 안 만진다.**
//
// 감독 지시 2026-08-18(모바일 게임 광고 화면 참조): *"형태는 단순하게, 색은 강하게,
// 명암은 크게, 움직임은 적당하게."* 판정은 `decide/grass.ts`, 배선은
// `systems/grass-field.ts`, 여기는 **조립**만 한다 — 노브를 읽고, 백엔드를 보고, 지오와
// 재질을 만들어 물린다.
//
// ── 감독이 준 GLSL 을 그대로 쓸 수 없다 ─────────────────────────────────────
// 코멘트에 담긴 정점 셰이더는 GLSL 이고, world2 에서 GLSL `ShaderMaterial` 은 **금지**다
// (`three/webgpu` 빌드에 렌더 경로가 없어 실기기에서 통째로 안 보였다 —
// `decide/water.ts`·`systems/sky.ts`·`features/postfx.ts` 헤더에 같은 사유가 반복돼 있다).
// 같은 **결과**를 TSL 노드로 낸다. 명세의 `uv.y` 가중·밑동 고정은 그대로 살아 있다.

import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';
import { readNum, readNumOpt } from '../url-knob.js';
import { STYLIZED_KNOB, stylizedOn } from '../decide/stylized.js';
import {
  GRASS_RADIUS_MUL_MIN, GRASS_RADIUS_MUL_MAX, MAX_BLADES, ringCounts,
  WIND_AMP, WIND_SPEED, WIND_WAVE_K, WIND_DIR_X, WIND_DIR_Z, WIND_GUST_K, WIND_GUST_T,
  WIND_JITTER_KX, WIND_JITTER_KZ, WIND_JITTER_AMP, WIND_GUST_MIX, WIND_GUST_BASE,
  BLADE_TIP, pickGrassWind, type GrassWindMode,
} from '../decide/grass.js';
import { GrassField } from '../systems/grass-field.js';

/**
 * 풀 한 포기의 지오메트리 — **3단 테이퍼 쿼드**(정점 8 · 삼각형 6).
 *
 * 감독 명세는 *"풀 한 포기당 2~6 triangles 정도면 충분"* 이다. 6 을 고른 이유는 굽힘
 * 때문이다: 바람이 `uv.y` 가중으로 미는데 마디가 적으면 굽은 선이 각져 보인다. 마디
 * 하나를 더 두면 곡선이 읽히고, 그 비용은 포기당 삼각형 2개다.
 *
 * 단 간격이 균등하지 않다(0 · 0.40 · 0.72 · 1.0) — 위로 갈수록 촘촘해야 **많이 휘는
 * 구간의 해상도**가 높다. 균등하면 끝만 각지고 밑동은 남아돈다.
 *
 * 법선을 전부 위(0,1,0)로 세우는 것은 잔디 렌더링의 표준 기법이다. 실제 면 법선을 쓰면
 * 옆을 보는 면이 어두워져 필드가 얼룩덜룩해진다 — 지면과 같은 빛을 받게 해야 한 장으로
 * 읽힌다. 게임풍에서는 이쪽이 정답이다.
 */
function bladeGeometry(tip: number): THREE.BufferGeometry {
  // 5단 — 4단은 굽힘이 각져 보였다(감독 *"인공적으로 보여"* 의 한 축).
  // 위로 갈수록 촘촘한 것은 그대로다: 많이 휘는 구간의 해상도가 높아야 곡선이 산다.
  const ys = [0, 0.30, 0.56, 0.80, 1.0];
  // 반폭 — **곡선 테이퍼**다. `(1-t)^1.6` 이라 밑동에서 천천히, 끝으로 갈수록 급하게
  // 좁아진다. 선형(첫 판본)은 옆면이 곧은 삼각형이라 «칼» 처럼 보였다.
  const hw = ys.map((t) => 0.5 * (tip + (1 - tip) * Math.pow(1 - t, 1.6)));
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  for (let k = 0; k < ys.length; k++) {
    pos.push(-hw[k], ys[k], 0, hw[k], ys[k], 0);
    uv.push(0, ys[k], 1, ys[k]);
    nor.push(0, 1, 0, 0, 1, 0);
  }
  const idx: number[] = [];
  for (let k = 0; k < ys.length - 1; k++) {
    const a = k * 2;
    idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/**
 * 바람이 실린 노드 재질. **WebGPU 에서만 불린다**(`pickGrassWind` 가 걸렀다).
 *
 * `positionNode` 안에서 읽는 `positionLocal` 은 **이미 인스턴스 변환이 끝난 좌표**다
 * (three r171 `NodeMaterial` 이 `instancedMesh(...)` 를 `positionNode` 대입보다 먼저
 * append 한다 — 소스 실측). 그래서 그 값이 곧 월드 xz 이고, 바람 위상을 넣으려고 별도
 * 어트리뷰트를 만들 필요가 없다. 포기마다 위상이 갈리는 것이 여기서 공짜로 나온다.
 *
 * 세기·속도를 `uniform` 으로 여는 것은 노브가 **셰이더를 다시 짜지 않고** 먹게 하려는
 * 것이다(`ocean-tsl.ts` 의 `setTime` 이 같은 이유로 uniform 을 쓴다).
 *
 * ⚠ 반환 타입이 `Material` 인 것은 **`three/webgpu` 의 타입 선언이 노드 재질을 재수출하지
 * 않기 때문**이다(TS2694 — 런타임에는 있다, 실측). `FeatureEnv.camera` 가 같은 이유로
 * `PerspectiveCamera` 가 아니라 `Camera` 인 것과 같은 자리다. 여기서 필요한 것은
 * `positionNode` 대입 하나뿐이라 좁혀 받아도 잃는 것이 없다.
 */
function windMaterial(ampMul: number, speedMul: number): THREE.Material {
  const { positionLocal, uv, time, uniform, vec3, sin, mx_noise_float } = TSL as any;
  const mat = new (THREE as any).MeshLambertNodeMaterial({ side: THREE.DoubleSide });
  const amp = uniform(WIND_AMP * ampMul);
  const spd = uniform(WIND_SPEED * speedMul);
  const p = positionLocal;
  // 밑동 고정 · 끝만 흔들림. 감독 명세는 `uv.y` 였고 여기서는 **제곱**이다 —
  // 선형이면 밑동도 눈에 띄게 밀려 포기 전체가 기우는 것처럼 보인다.
  const sway = uv().y.mul(uv().y);
  // ── 위상 = 물결 + **개별 잎 지터** ────────────────────────────────────────
  // 지터가 «흔들리는 잔디» 의 핵심이다(감독 판정 2026-08-18). 위상이 위치만의 함수이면
  // 수 cm 떨어진 이웃 잎이 **같은 각도로** 기울어, 필드가 잔디밭이 아니라 천 한 장처럼
  // 움직인다. 고주파 항을 더해 잎마다 위상을 갈라 놓는다.
  const jitter = sin(p.x.mul(WIND_JITTER_KX).add(p.z.mul(WIND_JITTER_KZ))).mul(WIND_JITTER_AMP);
  const phase = p.x.mul(WIND_WAVE_K).add(p.z.mul(WIND_WAVE_K * 0.7))
    .add(time.mul(spd)).add(jitter);
  // 돌풍 — 저주파 노이즈로 «지금 이 구역이 세게 불린다» 를 만든다. 이것이 없으면
  // 필드 전체가 한 박자로 흔들려 기계적으로 보인다.
  // 돌풍이 **세기를 물결치게** 한다 — 감독이 원한 «바람에 흔들린다» 는 방향이 아니라
  // 세기가 오르내리는 것이다. 어떤 구역은 거의 멈춰 있고(0.35) 어떤 구역은 크게 눕는다(1.1).
  const gust = mx_noise_float(vec3(p.x.mul(WIND_GUST_K), p.z.mul(WIND_GUST_K), time.mul(WIND_GUST_T)));
  const bend = sin(phase).mul(amp).mul(sway).mul(gust.mul(WIND_GUST_MIX).add(WIND_GUST_BASE));
  mat.positionNode = p.add(vec3(bend.mul(WIND_DIR_X), 0, bend.mul(WIND_DIR_Z)));
  return mat;
}

export const grassFeature: Feature = {
  name: 'grass',
  create(env: FeatureEnv): FeatureInstance | null {
    const master = readNum(STYLIZED_KNOB, 0, 0, 1);
    if (!stylizedOn(master, readNumOpt('grass', 0, 1))) return null;

    const radiusMul = readNum('grad', 1, GRASS_RADIUS_MUL_MIN, GRASS_RADIUS_MUL_MAX);
    const densityMul = readNum('gden', 1, 0, 2);
    const heightMul = readNum('gh', 1, 0.3, 2);
    // 폭·끝 모양은 화면으로만 판정된다 — 감독이 실기기에서 돌려 기본값을 정한다.
    const widthMul = readNum('gw', 1, 0.3, 3);
    const tip = readNum('gtip', BLADE_TIP, 0, 1);
    const windMul = readNum('gwind', 1, 0, 2);
    const speedMul = readNum('gwspd', 1, 0, 3);

    // 바람은 백엔드가 정한다. 요청은 «세기 0 이 아니면 켠다» 이고, 실제 채택은
    // 화이트리스트가 판정한다.
    const requested: GrassWindMode = windMul > 0 ? 'tsl' : 'off';
    const wind = pickGrassWind(requested, env.adapter.backend);
    if (requested === 'tsl' && wind === 'off') {
      // ⚠ **조용히 폴백하지 않는다.** 감독이 바람 없는 화면을 보고 룩을 판정하면 이
      // 노브를 연 목적이 통째로 무효가 된다(`decide/grass.ts` 의 `pickGrassWind` 주석).
      console.warn(
        `[grass] 바람은 WebGPU 에서만 켜진다 — 지금 백엔드는 ${env.adapter.backend}`
        + `(${env.adapter.backendDetail}). 풀은 정적으로 선다.`,
      );
    }

    const counts = ringCounts(radiusMul, densityMul);
    const count = counts.reduce((a, b) => a + b, 0);
    const geometry = bladeGeometry(tip);
    const material = wind === 'tsl'
      ? windMaterial(windMul, speedMul)
      : new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });

    // 버퍼는 **상한으로 잡는다.** 활성 수만 노브가 바꾸고 나머지는 0 스케일로 눕는다 —
    // 버퍼 크기가 노브에 따라 변하면 개수 불변식의 baseline 이 노브마다 달라진다.
    // ⚠ `?gden=0` 이면 활성 수가 0 인데 버퍼는 1 로 잡힌다 — three 가 0 짜리 인스턴스
    // 버퍼를 받지 않기 때문이다.
    //
    // ⚠⚠ 첫 판본은 그 1개가 *"영행렬로 남는다 — 화면에 아무것도 안 그린다"* 라고 적었고
    // **거짓이었다**(검수관 블로커 C5). three 는 생성자에서 `instanceMatrix` 를 **항등**
    // 으로 채우므로, 그냥 두면 `frustumCulled=false` 인 기본 크기 블레이드가 월드 원점에
    // 실제로 그려진다(WebGPU 면 바람에 흔들리기까지 한다). 그래서 `GrassField` 생성자가
    // **잉여 슬롯 `[active, count)` 를 명시적으로 영행렬로 눕힌다.**
    // 같은 사실을 `systems/grass-field.ts` 는 「항등」이라 옳게 적고 있었다 — 두 파일이
    // 같은 사실을 반대로 진술하고 있었고, 그것이 이 저장소가 세 번 겪은 값 미러링이다.
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, Math.min(MAX_BLADES, count)));
    mesh.name = 'grass-field';
    // 컬링을 끄는 이유는 슬롯 풀과 같다(`systems/instancing.ts`) — 인스턴스가 플레이어를
    // 따라다니므로 부팅 시점의 바운딩 구가 의미를 잃고, 컬링이 걸리면 드로우콜이 시야에
    // 따라 흔들려 `[7.6]` 판정이 불가능해진다.
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    // 그림자를 받게 하면 1.4만 인스턴스가 그림자 맵 샘플링을 타고, 얻는 것은 풀 사이의
    // 미세한 음영뿐이다. 게임풍은 명암이 큰 편이 좋으므로 지면 그림자로 충분하다.
    mesh.receiveShadow = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    env.scene.add(mesh);

    const field = new GrassField({
      mesh: mesh as any,
      matrix: new THREE.Matrix4(),
      color: new THREE.Color(),
      radiusMul, densityMul, heightMul, widthMul,
      cell: env.cell,
      playerAt: () => {
        const p = env.player.position;
        return { x: p.x, z: p.z };
      },
      shading: () => env.shading(),
    });

    return {
      system: { name: 'grass', update: () => field.update() },
      diagnostics: () => ({
        blades: field.count,
        buffer: mesh.count,
        rings: counts,
        radiusMul, densityMul, heightMul, widthMul, tip,
        wind,
        // 감독이 «바람이 이 모양이냐» 로 판정하기 전에 이것을 먼저 본다.
        windActive: wind === 'tsl',
        backend: env.adapter.backendDetail,
      }),
      // 상태가 둘뿐이다 — 보이거나(부팅에 만든 드로우콜 1개) 숨거나(셰이딩 오버라이드).
      // `null` 을 내지 않는다: `null` 은 표본을 통째로 버려 판정을 못 하게 만든다.
      // ⚠ `drawBlockHint` 는 **일부러 안 낸다.** 그 힌트는 `drawGroupKey()` 가 `null` 을
      // 낼 때 «무엇을 꺼야 다시 잴 수 있는가» 를 알려주는 것이고, 잔디는 null 을 안 낸다.
      // 힌트를 선언하면 `tests/draw-blockers.test.ts` 가 대조군 쿼리에 그 노브를 요구하는데,
      // 잔디는 기본이 꺼짐이라 대조군에 적을 것이 없다 — 적으면 «켜 둔 채 끈 척» 이 된다.
      drawGroupKey: () => (env.shading() === 'material' ? 'grass:on' : 'grass:hidden'),
      dispose: () => {
        env.scene.remove(mesh);
        mesh.dispose();
        geometry.dispose();
        material.dispose();
      },
    };
  },
};
