
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
import { readNum, readNumOpt, writeNumOpt, readEnum } from '../url-knob.js';
import { findKnobBar, attachKnobBar } from '../ui/knob-bar.js';
import { STYLIZED_KNOB, STYLIZED_DEFAULT, stylizedOn } from '../decide/stylized.js';
import {
  GRASS_RADIUS_MUL_MIN, GRASS_RADIUS_MUL_MAX, MAX_BLADES, ringCounts,
  WIND_AMP, WIND_SPEED, WIND_WAVE_K, WIND_DIR_X, WIND_DIR_Z,
  WIND_JITTER_KX, WIND_JITTER_KZ, WIND_JITTER_AMP,
  BLADE_TIP, GRASS_TONES, pickGrassWind, type GrassWindMode,
} from '../decide/grass.js';
import {
  GUST_PERIOD, GUST_SHARP, GUST_VARY, GUST_VARY_KX, GUST_VARY_KZ,
  BREEZE, GUST_OSC, GUST_LEAN, STATIC_LEAN, gustWave,
} from '../decide/gust.js';
import {
  BLADE_NODES, BLADE_BELLY, BLADE_CURVE, BLADE_AO, BLADE_NORMAL_SPREAD,
  BLADE_PALETTE, BLADE_SAT, halfWidthProfile, bladeArc, bladeShade, bladeToneHex,
} from '../decide/blade-shape.js';
import { GrassField } from '../systems/grass-field.js';
import {
  GRASS_MODES, GRASS_MODE_DEFAULT, GRASS_LOD_DEFAULT, GRASS_LOD_MAX,
  GRASS_SEG_DEFAULT, GRASS_SEG_MIN, GRASS_SEG_MAX, triPerBlade,
  CARD_BLADES_DEFAULT, CARD_BLADES_MIN, CARD_BLADES_MAX, cardDensityMul,
  ringModes, meshGroups, groupTriangles, type GrassMode,
} from '../decide/grass-mode.js';
import { MASK_ALPHA_TEST, maskTexture, refillMask, flatGeometry } from './grass-flat.js';

/**
 * 모양 축 하나 — URL 노브와 슬라이더가 **같은 상태를 공유**하게 묶는다.
 *
 * `readNum` 을 그대로 쓰지 않는 이유는 «지정됐는가» 를 잃기 때문이다. 슬라이더 UI 는
 * 값과 지정 여부를 따로 묻고(`KnobSpec.overridden`), 되돌리기는 지정을 **해제**해야
 * 한다 — 기본값을 다시 써 넣으면 주소에 기본값이 박혀서 나중에 기본값을 바꿔도 그
 * 링크는 옛 화면을 연다.
 */
interface ShapeAxis {
  readonly key: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  get(): number;
  overridden(): boolean;
  set(v: number | null): void;
}

function shapeAxis(
  key: string, label: string, def: number, min: number, max: number, step: number,
): ShapeAxis {
  let ov = readNumOpt(key, min, max);
  return {
    key, label, min, max, step,
    get: () => ov ?? def,
    overridden: () => ov !== null,
    set: (v) => { ov = v; },
  };
}

/**
 * 풀 한 포기의 지오메트리 — **굽은 란셋형 스트립**(정점 10 · 삼각형 8).
 *
 * 모양을 정하는 값은 전부 `decide/blade-shape.ts` 에 있고 여기는 그것을 정점으로 **굽는
 * 일**만 한다. 넷 다 노브라 감독이 축을 하나씩 되돌려 볼 수 있다 —
 * `?gbelly=0&gcurve=0&gao=0&gnor=0` 이 4차 이전 화면을 **정확히** 재현한다
 * (`bladeArc` 의 `curve→0` 극한이 `{t, 0}`, `bladeShade` 의 `ao=0` 이 정확히 1).
 *
 * ⚠ **`uv.y` 는 이제 높이가 아니라 아크 길이다.** 잎이 휘면 둘이 갈리는데, 바람 가중
 * (`sway = uv.y²`)이 재는 것은 «잎을 따라 얼마나 올라왔나» 이므로 아크 길이가 맞다.
 * 높이로 쓰면 휜 잎의 끝이 덜 흔들린다.
 *
 * ⚠⚠ 정점 컬러를 **AO 로만** 쓴다. 잎 색조는 `instanceColor` 가 따로 싣고, three 는 둘을
 * **곱한다**(r171 `NodeMaterial.setupDiffuseColor` 실측 — `vertexColors` 는
 * `materialColor` 에 곱해지고 그 결과에 `vInstanceColor` 가 또 곱해진다). 두 축이 서로
 * 안 섞이므로 색 팔레트를 바꿔도 AO 가 따라 변하지 않는다.
 */
function bladeGeometry(tip: number, belly: number, curve: number, spread: number, ao: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  // 법선을 좌우로 벌려 평면을 원통처럼 읽히게 한다. 굽힘과 달리 **위치는 안 건드린다** —
  // 실루엣이 그대로여야 감독이 «모양» 과 «음영» 을 따로 판정할 수 있다.
  const nx = Math.sin(spread);
  const ny = Math.cos(spread);
  for (const t of BLADE_NODES) {
    const hw = halfWidthProfile(t, tip, belly);
    const a = bladeArc(t, curve);
    const g = bladeShade(t, ao);
    pos.push(-hw, a.y, a.z, hw, a.y, a.z);
    uv.push(0, t, 1, t);
    nor.push(-nx, ny, 0, nx, ny, 0);
    col.push(g, g, g, g, g, g);
  }
  const idx: number[] = [];
  for (let k = 0; k < BLADE_NODES.length - 1; k++) {
    const a = k * 2;
    idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
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
/**
 * 바람 재질과 **돌풍 setter**.
 *
 * 돌풍 두 축을 `uniform` 으로 빼는 것이 요점이다 — 상수로 그래프에 구우면 슬라이더가
 * 재질을 새로 만들어야 하고, 그 순간 WebGPU 파이프라인이 하나 는다(`[8]` 이 잡는 형태).
 * 이 저장소가 바람 세기·속도에 이미 세운 규약이고 여기도 같다.
 */
function windMaterial(
  ampMul: number, speedMul: number, gustMul: number, gustPeriod: number, lean: number,
  alpha: THREE.Texture | null = null,
): {
  material: THREE.Material;
  setGust: (mul: number, period: number) => void;
  setLean: (v: number) => void;
} {
  const { positionLocal, uv, time, uniform, vec3, sin, floor, fract, mx_noise_float } = TSL as any;
  // `vertexColors` 는 AO 를 싣는 통로다 — 잎 색조(`instanceColor`)와 곱해진다.
  const mat = new (THREE as any).MeshLambertNodeMaterial({
    side: THREE.DoubleSide, vertexColors: true,
    // 2D 잎만 마스크를 받는다 — blade 는 정점이 실루엣이라 알파가 필요 없다.
    ...(alpha ? { alphaMap: alpha, alphaTest: MASK_ALPHA_TEST } : {}),
  });
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

  // ── 돌풍: 땅을 훑고 **지나가는** 파면 (감독 지시 2026-08-19) ──────────────
  // 판정·근거·실측은 `decide/gust.ts` 한 곳이다. 여기는 그것을 노드로 옮길 뿐이다.
  //
  // `u` 는 파면 좌표다 — 정수 하나가 파면 하나이고, 시간이 흐르면 `u` 가 커지면서
  // 파면이 바람 방향으로 흘러간다. `fract(u)` 의 톱니는 경계에서 불연속이지만
  // `sin(π·s)` 가 s=0 과 s=1 에서 **둘 다 0** 이라 값은 연속이다. 파면 세기 노이즈도
  // `floor(u)` 라 경계에서 계단인데, 그 지점의 봉우리가 정확히 0 이라 안 보인다.
  const gw0 = gustWave(gustPeriod);
  const gWave = uniform(gw0.waveK);
  const gTime = uniform(gw0.timeK);
  const gMul = uniform(gustMul);
  // 정적 굽힘 — 바람이 0 이어도 남는 항이다. **여기 있어야** 방향이 인스턴스 회전과
  // 무관해진다(`decide/gust.ts` 의 `STATIC_LEAN` — 왜 지오메트리에서 옮겼는지가 거기 있다).
  const gLean = uniform(lean);
  const u = p.x.mul(WIND_DIR_X).add(p.z.mul(WIND_DIR_Z)).mul(gWave)
    .sub(time.mul(gTime));
  const band = floor(u);
  const pulse = sin(fract(u).mul(Math.PI)).pow(GUST_SHARP);
  // 파면마다 세기를 가른다 — 규칙적인 파면만 있으면 시계처럼 보인다. 노이즈를 **여기에만**
  // 쓰는 것이 요점이다: 분포를 몰라도 «몇 초에 한 번» 은 위 산술이 정한다.
  const vary = mx_noise_float(vec3(band.mul(GUST_VARY_KX), band.mul(GUST_VARY_KZ), 0.5))
    .mul(0.5).add(0.5);
  const gust = pulse.mul(vary.mul(GUST_VARY).add(1 - GUST_VARY)).mul(gMul);

  // 두 항으로 나뉜다. **진동**은 살랑임의 진폭이고, **편향**은 잎을 한쪽으로 눕힌다 —
  // 편향이 없으면 돌풍이 «더 빨리 살랑임» 으로만 보인다(`decide/gust.ts` 의 `GUST_LEAN`).
  // 세 항: **정적**(항상 바람 쪽) + 편향(돌풍이 눕힘) + 진동(살랑임).
  // 앞 둘의 합이 진동 진폭보다 크면 부호가 갈릴 수 없다 — `bendFloor` 가 그 조건이다.
  const bend = sin(phase).mul(gust.mul(GUST_OSC).add(BREEZE))
    .add(gust.mul(GUST_LEAN)).add(gLean)
    .mul(amp).mul(sway);
  mat.positionNode = p.add(vec3(bend.mul(WIND_DIR_X), 0, bend.mul(WIND_DIR_Z)));
  return {
    material: mat,
    setGust(mul, period) {
      const gw = gustWave(period);
      gMul.value = mul;
      gWave.value = gw.waveK;
      gTime.value = gw.timeK;
    },
    setLean(v) { gLean.value = v; },
  };
}

export const grassFeature: Feature = {
  name: 'grass',
  create(env: FeatureEnv): FeatureInstance | null {
    const master = readNum(STYLIZED_KNOB, STYLIZED_DEFAULT, 0, 1);
    if (!stylizedOn(master, readNumOpt('grass', 0, 1))) return null;

    const radiusMul = readNum('grad', 1, GRASS_RADIUS_MUL_MIN, GRASS_RADIUS_MUL_MAX);
    const densityMul = readNum('gden', 1, 0, 2);
    const heightMul = readNum('gh', 1, 0.3, 2);
    // 폭·끝 모양은 화면으로만 판정된다 — 감독이 실기기에서 돌려 기본값을 정한다.
    const widthMul = readNum('gw', 1, 0.3, 3);
    const tip = readNum('gtip', BLADE_TIP, 0, 1);
    // ── 잎 모양 4축 (감독 판정 2026-08-18 4차 *"나뭇잎처럼 안보여"*) ────────
    // 넷을 따로 연 것은 어느 축이 원인인지 화면으로만 갈리기 때문이다. 넷 다 0 이
    // 반려된 화면이고, 근거는 `decide/blade-shape.ts` 헤더에 축별로 적혀 있다.
    //
    // 이 넷만 **슬라이더로도** 연다(`ui/knob-bar.ts`). 지금까지 잔디 노브는 URL 뿐이었고,
    // 그래서 감독이 값을 하나 보려면 주소를 손으로 조립해야 했다 — 그러면 확인 자체가
    // 일이 되고, 실제로 3차 회차에서 감독이 비교한 두 링크가 **상한에 눌려 같은 화면**
    // 이었는데 아무도 그것을 몰랐다. 화면에서 밀면 그 사고가 구조적으로 안 난다.
    const axes = [
      shapeAxis('gbelly', '배', BLADE_BELLY, 0, 1, 0.05),
      shapeAxis('gao', '음영', BLADE_AO, 0, 1, 0.05),
      shapeAxis('gnor', '볼륨', BLADE_NORMAL_SPREAD, 0, 1.2, 0.05),
    ] as const;
    const [belly, ao, spread] = axes;
    // ⚠ `?gcurve` 는 **지오메트리에서 셰이더로 옮겼다**(감독 판정 3차 «가위»). 라벨과
    // 키는 그대로 두되 이제 정적 굽힘 uniform 을 민다 — 잎을 다시 굽지 않으므로 아래
    // `rebuild` 통로가 아니라 uniform 통로로 간다.
    const curve = shapeAxis('gcurve', '굽힘', STATIC_LEAN, 0, 1.2, 0.05);
    // ── 색 2축 (감독 판정 5차 *"색뿐 아니라"*) ────────────────────────────
    // 모양 축과 **갈라 둔다.** 둘을 한 다발로 묶으면 감독이 «색이 나아진 것인지 모양이
    // 나아진 것인지» 를 한 화면에서 못 가른다 — 이번 회차 내내 걸린 문제가 그것이다.
    // 돌풍 2축 — 감독 지시 *"간간히 강한바람"*. 세기와 간격은 다른 축이고, 둘 다
    // 화면으로만 판정된다. `?ggust=0` 이 돌풍 없는 산들바람(이 커밋 이전에 가장 가까운
    // 상태)이다 — 다만 평시 세기를 0.35 → 0.28 로 낮췄으므로 완전한 항등원은 아니다.
    const gustMul = shapeAxis('ggust', '돌풍', 1, 0, 2, 0.05);
    const gustPer = shapeAxis('ggper', '간격', GUST_PERIOD, 3, 20, 0.5);
    const palette = shapeAxis('gpal', '팔레트', BLADE_PALETTE, 0, 1, 0.05);
    const sat = shapeAxis('gsat', '채도', BLADE_SAT, 0, 2, 0.05);
    const colorAxes = [palette, sat] as const;
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

    // ── 잎 모드 (`?gmode=` · `?glod=`) — 링마다 모드가 갈리면 메시가 둘이다 ─────
    // 기본(blade · lod 0)이면 그룹이 하나라 아래 경로는 종전과 같다(메시 1·8tri·알파 없음).
    // 근거·후보·판정 절차는 `decide/grass-mode.ts` 헤더 한 곳.
    const mode = readEnum('gmode', GRASS_MODE_DEFAULT, GRASS_MODES);
    const lod = readNum('glod', GRASS_LOD_DEFAULT, 0, GRASS_LOD_MAX);
    const seg = Math.round(readNum('gseg', GRASS_SEG_DEFAULT, GRASS_SEG_MIN, GRASS_SEG_MAX));
    const cardBlades = Math.round(readNum('gcard', CARD_BLADES_DEFAULT, CARD_BLADES_MIN, CARD_BLADES_MAX));
    // 카드 모드는 카드 하나가 잎 N 개 몫 — 활성 밀도를 1/N 로 환산한다. 버퍼(MAX_BLADES)는
    // 그대로이고 활성 수만 준다(팀장 C-2). `mode` 가 card 가 아니면 1 이라 종전과 같다.
    const fieldDensity = densityMul * (mode === 'card' ? cardDensityMul(cardBlades) : 1);
    const groups = meshGroups(ringModes(mode, lod));
    const counts = ringCounts(radiusMul, fieldDensity);
    const count = counts.reduce((a, b) => a + b, 0);
    const mask = groups.some((g) => g.mode !== 'blade') ? maskTexture(mode, tip, belly.get(), cardBlades) : null;
    const geometryFor = (m: GrassMode) => m === 'blade'
      ? bladeGeometry(tip, belly.get(), BLADE_CURVE, spread.get(), ao.get())
      : flatGeometry(m, tip, belly.get(), spread.get(), ao.get(), seg);

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
    const parts = groups.map((group) => {
      const alpha = group.mode === 'blade' ? null : mask;
      const geometry = geometryFor(group.mode);
      const built = wind === 'tsl'
        ? windMaterial(windMul, speedMul, gustMul.get(), gustPer.get(), curve.get(), alpha)
        : null;
      const material = built
        ? built.material
        : new THREE.MeshLambertMaterial({
          side: THREE.DoubleSide, vertexColors: true,
          ...(alpha ? { alphaMap: alpha, alphaTest: MASK_ALPHA_TEST } : {}),
        });
      const groupCount = groups.length === 1 ? count : group.rings.reduce((sum, r) => sum + counts[r], 0);
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, Math.min(MAX_BLADES, groupCount)));
      mesh.name = groups.length === 1 ? 'grass-field' : `grass-field-${group.mode}`;
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
        radiusMul, densityMul: fieldDensity, heightMul, widthMul,
        cell: env.cell,
        playerAt: () => {
          const p = env.player.position;
          return { x: p.x, z: p.z };
        },
        shading: () => env.shading(),
        toneHex: (idx) => bladeToneHex(idx, GRASS_TONES, palette.get(), sat.get()),
        // 그룹이 하나면 링 필터를 안 건다 — 종전 경로와 바이트 단위로 같아야 한다.
        rings: groups.length === 1 ? undefined : group.rings,
      });
      return { group, mesh, material, built, field };
    });

    // 슬라이더가 움직이면 잎을 **다시 굽는다.** 모양 4축은 정점에 구워져 있어 uniform
    // 으로는 못 바꾼다(바람과 다른 점이다).
    //
    // ⚠ 옛 지오메트리를 **반드시 버린다.** 안 버리면 감독이 슬라이더를 한 번 밀 때마다
    // three 의 `info.memory.geometries` 가 하나씩 오르고, 그것이 곧 개수 불변식이 잡는
    // 형태다(`[7]`). 버리고 꽂으면 델타가 0 이라 규율을 어기지 않는다 — 재질은 그대로라
    // WebGPU 파이프라인도 안 는다(attribute 구성이 동일하다). 마스크는 **같은 텍스처를
    // 다시 채운다**(텍스처 개수도 0 델타).
    const rebuild = () => {
      if (mask) refillMask(mask, mode, tip, belly.get(), cardBlades);
      for (const p of parts) {
        const next = geometryFor(p.group.mode);
        p.mesh.geometry.dispose();
        p.mesh.geometry = next;
      }
    };
    const barParts = env.doc ? findKnobBar(env.doc) : null;
    if (barParts) {
      const row = (a: ShapeAxis, apply: () => void) => ({
        key: a.key, label: a.label, min: a.min, max: a.max, step: a.step,
        value: () => a.get(),
        overridden: () => a.overridden(),
        set(v: number) { a.set(v); writeNumOpt(a.key, v); apply(); },
        reset() { a.set(null); writeNumOpt(a.key, null); apply(); },
      });
      // 축마다 **반영 비용이 다르다.** 모양은 잎을 다시 굽고, 색은 인스턴스 색만 덮고,
      // 돌풍은 uniform 두 개만 쓴다. 한 통로로 묶어 전부 rebuild 하면 돌풍 슬라이더가
      // 15만 포기 지오메트리를 매번 다시 만든다.
      const applyGust = () => { for (const p of parts) p.built?.setGust(gustMul.get(), gustPer.get()); };
      const applyLean = () => { for (const p of parts) p.built?.setLean(curve.get()); };
      const recolor = () => { for (const p of parts) p.field.recolor(); };
      attachKnobBar(barParts, [
        ...axes.map((a) => row(a, rebuild)),
        ...[gustMul, gustPer].map((a) => row(a, applyGust)),
        row(curve, applyLean),
        ...colorAxes.map((a) => row(a, recolor)),
      ]);
    }

    return {
      system: { name: 'grass', update: () => { for (const p of parts) p.field.update(); } },
      diagnostics: () => ({
        blades: parts.reduce((s, p) => s + p.field.count, 0),
        buffer: parts.reduce((s, p) => s + p.mesh.count, 0),
        rings: counts,
        // 잎 모드 — 감독이 «어느 링크를 보고 있나» 를 여기서 확인한다.
        mode, lod, seg, cardBlades, fieldDensity,
        groups: groups.map((g) => ({ mode: g.mode, rings: g.rings, triPerBlade: triPerBlade(g.mode, seg) })),
        triangles: groupTriangles(groups, counts, seg),
        radiusMul, densityMul, heightMul, widthMul, tip,
        belly: belly.get(), curve: curve.get(), ao: ao.get(), spread: spread.get(),
        palette: palette.get(), sat: sat.get(),
        gust: gustMul.get(), gustPeriod: gustPer.get(),
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
      // 대조군에 적을 것이 없다 — 적으면 «켜 둔 채 끈 척» 이 된다.
      // ⚠ 근거가 바뀌었다(2026-08-21, 검수관 권고 P1): 예전에는 *"잔디는 기본이 꺼짐이라"*
      // 였는데 `STYLIZED_DEFAULT` 가 1 이 되어 **그 근거는 낡았다.** 지금 대조군에 잔디가
      // 없는 이유는 `WORLD2_QUERY` 가 `grass=0` 을 **명시적으로** 걸기 때문이다. 결과는
      // 같지만 근거가 다르고, 낡은 근거를 두면 다음 사람이 그것을 믿고 판단한다.
      // ⚠ `?glod=` 로 그룹이 둘이면 드로우콜이 2다 — 상태 키는 그대로 하나다(같은 세션 안에서
      // 상수이므로 [7.6] 판정은 성립한다). 그룹 수는 부팅에 정해지고 세션 중 안 변한다.
      drawGroupKey: () => (env.shading() === 'material' ? 'grass:on' : 'grass:hidden'),
      dispose: () => {
        for (const p of parts) {
          env.scene.remove(p.mesh);
          p.mesh.dispose();
          // `geometry` 가 아니라 `mesh.geometry` 다 — 슬라이더가 교체했으면 지역 변수는
          // 이미 버려진 옛 것을 가리킨다(그쪽은 교체 시점에 `dispose` 됐다).
          p.mesh.geometry.dispose();
          p.material.dispose();
        }
        mask?.dispose();
      },
    };
  },
};
