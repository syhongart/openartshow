// world-shared/glb-city.ts — **미술관 GLB.** 라이브 랜드마크 1채 + 부하 실험 노브.
//
// ⚠ **world2·world3·world5 가 이 파일 하나를 함께 쓴다**(2026-08-16 통합, 팀장 판정).
// 그전에는 842/865/865 줄 세 벌이 있었고 **차이는 세계 이름 3곳 + `disableMatExtensions`
// 인라인 복제**(백로그 #47)뿐이었다 — 한 곳을 고치면 나머지 둘이 조용히 낡는 형태였다.
// 세계별 차이는 `GlbCityDeps` 주입으로만 들어온다. **이 파일은 어느 세계인지 모른다**(R2).
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"브런치만들어서 테스트로 건물대신 미술관 건물을 올려보자. 얼마나 버벅이나 보고싶다.
//   한개 올리지말고. 50개 올려봐. 미술관 지엘비 파일."* (실험 착수)
// *"glb 건물 기본으로 나오게하자"* (2026-08-02 — 기본 노출로 승격)
//
// ── 실험에서 라이브로 (팀장 판정 2026-08-02) ────────────────────────────────
// 기본 채수는 **1** 이다. 실측이 그렇게 시켰다 — `glb=0` 대비 드로우콜 증가가 채당
// 31~37 이고, 그것이 world2 전체(당시 40 안팎)에 맞먹는다. 즉 **1채로 이미 배가 되고
// 2채는 어느 기준으로도 무리**다. 채수를 늘리려면 메시 병합·LOD 가 먼저다.
//
// (원래 여기에 *"설계 목표가 80"* 이 함께 적혀 있었다. 근거가 없었고 축도 틀렸다 —
//  전말은 아래 "설계 목표 80 을 걷어냈다" 문단 한 곳에만 적는다.)
//
//   채수  draw 총계   증가    geo증가  tex증가  pipe증가  로드(로컬)
//     0      16        —        —       —        —         —
//     1      44      +28       +28     +21       +5      299ms
//     3     122     +106       +78     +22       +6      541ms
//     8     315     +299       +78     +22       +6    1,281ms
//    20     646     +630       +78     +22       +6    2,451ms
//
// geo·tex·pipe 가 3채부터 상수인 것은 `clone()` 이 지오·재질을 참조 공유하기 때문이다.
// **드로우콜만 선형**이고, 그것이 이 자산의 유일한 비용 축이다.
// (고정 시점 측정이라 카메라를 돌렸을 때의 최댓값은 못 쟀다 — 과소평가일 수 있다.)
//
// ── 이 기능은 world2 의 제1원리를 일부러 깬다 ────────────────────────────────
// world2 는 **개수 불변식** 위에 서 있다 — 파츠 종류당 `InstancedMesh` 하나로 재질·지오·
// 드로우콜을 세션 내내 상수로 고정한다. GLB 는 자체 재질·지오를 여럿 들고 오므로 그 틀에
// 접히지 않는다. 그것이 이 실험의 **목적**이다: 접히지 않는 자산을 그대로 세우면 무슨 일이
// 벌어지는지를 수치로 본다.
//
// ⚠ **이 문단은 실험이던 시절의 것이다.** 원래 여기에 *"이 파일은 `?glb=N` 이 없으면
// 아무것도 하지 않는다(`create` 가 `null`)"* 라고 적혀 있었는데, 감독 지시로 기본
// 노출이 되면서(`DEFAULT_COPIES = 1`) **거짓이 됐다.** 승격 커밋에서 헤더 위쪽만
// 고치고 여기를 놓쳤다 — 같은 파일 안에서 두 문장이 서로를 부정하고 있었다.
// (`?glb=0` 을 적으면 여전히 `create` 가 `null` 이다. 끄는 것은 되고, 기본이 꺼짐이
//  아닐 뿐이다.)
//
// ── 실측 (파일 헤더 파싱, 배치 전) ──────────────────────────────────────────
//   파일 12.9MB · primitives 78 · 재질 17 · 텍스처 22 · 삼각형 162,902
//   바닥 17.2 × 24.6m · 높이 7.95m (바닥면이 로컬 y = −0.5)
//
// ⚠ 위 치수는 **한 번 틀린 채로 오래 있었다.** 예전에 "26.3 × 24.1m · 높이 5.8m" 라고
// 적혀 있었고, 같은 파일 아래 `makeBox()` 주석은 처음부터 옳은 값을 담고 있었다. 한
// 파일 안에서 같은 실측이 두 번 적혀 갈라진 것이다(디자이너가 glTF accessor 를 다시
// 파싱해 잡았다, 2026-08-02). 배치 계산을 이 숫자로 하면 파셀을 넘친다 — 그래서 아래
// 배치는 **주석이 아니라 런타임 `Box3` 를 읽는다.**
//
// primitives 가 곧 드로우콜 **후보**다. 50채면 3,900 이고, 고정 미술관이 실증한 상한이
// 255 였다. 즉 예측은 "심하게 버벅인다" 였고, 이 실험은 그것을 확인하러 갔다.
//
// ── ⚠ 여기 있던 "설계 목표 80" 을 걷어냈다 (2026-08-02, 회차 0) ──────────────
// 이 문단과 다른 두 곳에 *"설계 목표가 80"* 이 각각 적혀 있었다. 팀장이 출처 확정을
// 지시해 추적했더니 **저장소 어디에도 근거가 없었다** — 상수 정의도, 유도도, 문서도
// 없이 세 곳에 숫자만 있었다(값 미러링).
//
// 그리고 재보니 **값이 아니라 축이 틀렸다.** 드로우콜은 프러스텀 컬링을 거치므로
// **카메라가 어디를 보느냐에 따라 변한다.** 실측이 그것을 실증했다: 미술관 1채를
// 세웠는데 `geometries` 는 +78 인데 `draw` 는 **+0** 이었다 — 광장 서쪽에 선 미술관이
// 고정 시점의 시야 밖이라 렌더 목록에 아예 안 올랐다. 로드는 됐고 화면에만 없었다.
//
// 즉 고정 숫자를 드로우콜 예산으로 두면 **카메라 방향이 판정을 정한다.** 게이트가
// 아니라 주사위다. 같은 이유로 `decide/telemetry.ts` 는 드로우콜만 "하늘 상태별 그룹"
// 으로 따로 판정한다 — 이 저장소가 이미 아는 사실이었는데 이 파일만 몰랐다.
//
// **대체 축**: 부팅 기준선을 `geometries`·`textures`·`programs` 로 잡는다. 셋 다 부팅
// 시 확정되고 카메라와 무관하다. 값과 골든의 자리는 스모크 쪽이다 — **여기에 숫자를
// 다시 적지 않는다.** 세 곳에 적어 두었던 것이 애초의 문제였다.
//
// ── 복제 방식: 지오·재질을 공유한다 ─────────────────────────────────────────
// `Object3D.clone()` 은 지오메트리와 재질을 **참조로 공유**한다. 그래서 50채를 세워도
// 메모리와 로딩은 1채분이고 **드로우콜만 50배**가 된다. 매번 새로 로드하면 로딩 시간에
// 묻혀 프레임 문제를 못 본다 — 축을 하나만 흔들어야 무엇이 병목인지 갈린다.

import type { Object3D, Scene } from 'three/webgpu';
import { EXT_OFF, disableMatExtensions } from './glb-material.js';
import {
  attachAll, warmUpNode, ATTACH_BATCH, WARMUP_FRAMES, type CullableNode,
} from './attach-loop.js';

// ── 이 모듈은 **어느 세계인지 모른다** (팀장 규칙 R2, 2026-08-16) ────────────
//
// *"`world-shared/` → 세계 코드 import 0. **공유 모듈이 특정 세계를 알면 공유가
//   아니다** — 세계별 차이는 파라미터·훅 주입으로만."*
//
// 그래서 세계의 `FeatureEnv`·`Feature`·`FeatureInstance` 를 import 하지 않고, **이 모듈이
// 실제로 쓰는 것만** 아래에 선언한다. TypeScript 는 구조적 타이핑이라 각 세계의 타입이
// 이 모양을 만족하면 그대로 통과한다 — ISP(`docs/ARCHITECTURE.md` §1)의 실물이다.
//
// ⚠ **실측이 이 좁힘을 가능하게 했다**: 865줄 전체에서 `env.` 사용은 **셋뿐**이다
// (`scene`·`doc`·`cell`). 세계의 `FeatureEnv` 는 world2 457줄 / world3·5 303줄로 서로
// 다른데, **이 모듈은 그 차이를 볼 이유가 없다.**
//
// ⚠⚠ 첫 판본은 여기 `BASE` 도 적었고 **틀렸다** — grep 이 잡은 `env.BASE` 는 코드가
// 아니라 **주석 안의 `import.meta.env.BASE_URL`** 이었다(이 파일 `:174`). tsc 가 잡았다.
// 「grep 히트를 코드로 읽은 것」이고, 이 회차에 같은 형태를 세 번째 저질렀다
// (`assets/gallery/` 를 감독 작품으로 · `sky` 를 3중복으로 · 여기). **검색 결과는 근거가
// 아니라 확인할 자리다.**

/** 이 모듈이 요구하는 환경. 각 세계의 `FeatureEnv` 가 이것을 만족한다. */
export interface GlbCityEnv {
  readonly scene: Scene;
  /** ⚠ `null` 이 온다 — 세계의 `FeatureEnv` 가 그렇게 선언한다(헤드리스·테스트 경로).
   *  이 모듈은 이미 `doc?.body` 로 방어하고 있다(배지 생성부). */
  readonly doc: Document | null;
  /** 파셀 한 칸의 월드 크기(m) */
  readonly cell: number;
  /**
   * 🔴 **그 파셀을 스트리밍이 지금 들고 있는가** (감독 지시 2026-08-19 —
   * *"glb건물도 사라지게해서. 가볍게 만들자. 건물이 많아질수있으니"*).
   *
   * 있으면 이 기능이 세운 채들을 파셀과 **생사를 맞춘다**(`visible` 토글). 없으면 늘
   * 보인다 — 그것이 이 인자가 생기기 전의 동작이고, **선택적인 이유**다:
   * world3·world5 의 `FeatureEnv` 에는 이 항목이 **없다**(실측). 필수로 만들면 세 세계가
   * 함께 움직여야 하고, 그 결합은 이 기능이 요구하는 것보다 넓다.
   *
   * ⚠ **거리를 여기서 다시 계산하지 않는다.** 스트리밍이 이미 판정한 것을 그대로 읽는다 —
   * 액자가 `W8-9` 에서 같은 이유로 같은 문을 쓴다(`artwork-scene.ts` 의 `update`).
   * 거리식이 두 곳에 살면 한쪽만 고쳐도 아무도 모른다.
   */
  readonly parcelLoaded?: (px: number, pz: number) => boolean;
}

/**
 * 세계마다 다른 것. **이것만 주입받는다.**
 *
 * ⚠ `plazaWest` 는 지금 세 세계가 전부 `{px: -1, pz: 0}` 로 같다(`PLAZA_R = 1`).
 * **그래도 주입받는다** — 값이 같은 것은 우연이고, 공유 모듈이 그 우연에 기대면
 * 한 세계가 광장을 옮기는 날 **이 파일이 조용히 틀린 자리에 랜드마크를 세운다.**
 * 상수를 여기 복사하는 것은 값 미러링이고, 그것이 이 저장소가 가장 경계하는 형태다.
 *
 * `readNum`/`readEnum` 을 함수로 받는 이유도 같다 — `url-knob.ts` 는 세 벌이 **현재
 * 완전히 동일**하지만(diff 0), 그것을 import 하면 R2 를 어긴다.
 */
export interface GlbCityDeps {
  /** 씬 그룹 이름과 진단 안내에 쓴다 — `'world2'` 같은 값 */
  readonly worldName: string;
  readonly plazaWest: { readonly px: number; readonly pz: number };
  readonly readNum: (key: string, fallback: number, min: number, max: number) => number;
  readonly readEnum: <T extends string>(key: string, fallback: T, allowed: readonly T[]) => T;
  /**
   * 🔴 **채 하나의 등장 배수를 한 걸음 굴린다** (감독 판정 2026-08-20).
   *
   * `id` 는 채 인덱스, `up` 은 파셀이 그것을 원하는가, 반환은 새 배수(0~1) 또는
   * **바뀐 것이 없으면 `null`**. 상태는 **넘기는 쪽이 든다** — 그래야 산술과 상수가
   * `world2/decide/lod-fade.ts` 한 곳에 남는다(위 `advanceGrow` 주석 참조).
   *
   * 없으면 즉시 on/off — world3·world5 가 그 경우다.
   */
  readonly copyScale?: (id: number, up: boolean, dt: number) => number | null;
}

/**
 * 이 모듈이 내는 것. 각 세계의 `FeatureInstance` 가 이 모양을 **포함**한다
 * (세계 쪽이 더 넓어도 된다 — 좁은 쪽을 여기 적는 것이 ISP 다).
 */
export interface GlbCityInstance {
  diagnostics?(): unknown;
  drawGroupKey?(): string | null;
  /** 드로우콜 판정에서 이 표본을 빼는 이유. `FeatureInstance` 와 같은 이름·의미다 */
  readonly drawBlockHint?: string;
  /**
   * 이 기능이 씬에 세운 루트. **레이캐스트 대상으로만** 쓴다(편집의 벽 검출 — 태스크 #112).
   * 아직 안 세워졌거나 `dispose()` 된 뒤면 `null`. 근거는 구현부 주석 한 곳이다.
   *
   * ⚠ **지금 보이는 채가 하나도 없어도 `null`** 이다(2026-08-19). 파셀과 생사를 맞추게
   * 되면서 미술관이 통째로 안 보이는 순간이 생겼는데, three 는 레이캐스트에서 `visible`
   * 을 **안 본다**(`layers` 만 본다 — 이 저장소 실측). 그대로 두면 **안 보이는 벽에
   * 액자가 걸린다.**
   */
  wallRoot?(): Object3D | null;
  /**
   * 프레임마다 도는 훅. **파셀과 생사를 맞추는 데만 쓴다**(감독 지시 2026-08-19).
   *
   * ⚠ 타입을 `System`(각 세계의 `kernel.ts`)으로 적지 않는다 — 공유 모듈이 특정 세계의
   * 커널을 import 하면 R2(빌드 혼합)를 어긴다. 구조적으로 좁게 선언하면 세 세계의
   * `System` 을 **전부** 만족한다(더 적게 요구하는 쪽이 할당 가능하다).
   */
  readonly system?: { readonly name: string; update(ctx: { readonly dt: number }): void };
  dispose?(): void;
}

/** 실험 상한. 이보다 크면 브라우저가 죽는 쪽에 가까워 측정 자체가 안 된다 */
const MAX_COPIES = 200;

/**
 * 기본 채수. **1.** 위 표의 근거로 팀장이 확정했다 — 2채는 draw 예산을 넘는다.
 *
 * `?glb=0` 으로 끌 수 있게 남겨 둔다. 스모크가 대조군을 잡을 때 쓰고, 감독 기기에서
 * 이 자산이 말썽을 부릴 때 URL 하나로 격리하는 경로이기도 하다.
 */
const DEFAULT_COPIES = 1;

/**
 * 랜드마크가 서는 파셀과 방향 (디자이너 판정 2026-08-02).
 *
 * ── 왜 광장 서쪽인가 ────────────────────────────────────────────────────────
 * 이 자산은 바닥이 17.2 × 24.6m 라 32m 파셀을 거의 채운다. 도로 셋백(6.0m)을 지킬 수
 * 있는 일반 파셀이 없어서, 도로 중심 조각이 안 그려지는 **중앙 광장** 칸이 유일한
 * 후보였다. 그중 `center`(분수대)·`north`(시계탑)는 이미 임자가 있다.
 *
 * 남은 칸 중 서쪽 가운데를 고른 것은 거리다 — 스폰(0,10)에서 33.5m 로, 안개 완전가시
 * 거리 60.8m 의 55% 라 또렷하게 보인다. 북쪽 모서리 칸이면 첫 화면에 분수대·시계탑과
 * 함께 걸릴 여지가 있지만 52.8m 라 안개 경계의 87% 여서 뿌옇다. **흐릿하게 걸리는 것보다
 * 가까이서 또렷하게 발견되는 쪽**을 골랐다 — 취향이 섞인 판단이고, 다르게 볼 여지가
 * 있다고 디자이너가 함께 적었다.
 *
 * 결과적으로 스폰 정면(-z)이 아니라 베어링 ~73° 라 **고개를 돌려야 보인다.** 이 자산은
 * 안 보이는 사고를 세 번 냈다(금속 검정화·헛된 투명·WebGPU 확장값) — 첫 화면 정면이
 * 아닌 것이 그 위험도 함께 줄인다.
 *
 * ── 회전 ───────────────────────────────────────────────────────────────────
 * 문(`door.002`)과 차고문이 로컬 +Z 벽에 있다(디자이너가 헤드리스 렌더로 색을 칠해
 * 확인했다 — 추정이 아니다). 광장 서쪽 칸에서 정면이 광장(동쪽)을 보게 하는 값이 π/2 다.
 */
const LANDMARK_RY = Math.PI / 2;

/**
 * 미술관 GLB. `lab-glb.html`(behind-flag 실험 페이지)이 쓰던 것과 같은 파일이다.
 *
 * 경로를 `import.meta.env.BASE_URL` 에서 만든다 — GitHub Pages 는 `/openartshow/` 아래
 * 배포되고 로컬은 `/` 라, 한쪽에 맞춰 적으면 다른 쪽에서 404 가 난다.
 */
function modelUrl(): string {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return (base.endsWith('/') ? base.slice(0, -1) : base) + '/app/assets/models/lab-space.glb';
}

interface Counts {
  /** 실제로 씬에 선 채수 */
  placed: number;
  /** GLB 한 채의 드로우콜 후보(= 메시 수) */
  meshesPer: number;
  /** 한 채의 삼각형 */
  trisPer: number;
  /** 로드 상태 — 못 재고 통과시키지 않으려고 명시한다 */
  state: 'loading' | 'ready' | 'failed';
  error?: string;
  /** 눅인 금속 재질 수. 이게 0 이면 건물이 검게 보인다 */
  tamed?: number;
  /** 불투명으로 되돌린 재질 수. 이게 0 이면 WebGPU 에서 벽이 안 보인다 */
  opaque?: number;
  /** 재질을 손댄 수. `raw` 면 0(원본 유지) */
  swapped?: number;
  /** 어느 재질 축인가 — swap · std · noext · raw. **리포트가 이걸 말해야 판정이 성립한다** */
  mat?: string;
  /** 씬에 실제로 놓인 경계 상자. **계산값이 아니라 결과다** */
  box?: string;
  /** 무엇을 세웠나 — glb · box · flat */
  mode?: string;
}

/**
 * 공유 구현. **세계는 얇은 래퍼로 이것을 감싼다** — 그래야 `Feature` 타입(세계마다 다르다)이
 * 세계 쪽에 남고 이 파일은 그것을 몰라도 된다(R2). 래퍼는 `features/glb-city.ts` 셋이다.
 */
export const glbCity = {
  create(env: GlbCityEnv, deps: GlbCityDeps): GlbCityInstance | null {
    const want = Math.round(deps.readNum('glb', DEFAULT_COPIES, 0, MAX_COPIES));
    // `?glb=0` 이면 기능 자체가 없는 것과 같다 — 씬도 배지도 진단도 만들지 않는다.
    if (want <= 0) return null;

    const counts: Counts = { placed: 0, meshesPer: 0, trisPer: 0, state: 'loading' };
    let root: Object3D | null = null;
    /**
     * 세운 채들 (감독 지시 2026-08-19 — *"glb건물도 사라지게해서. 가볍게 만들자."*).
     * 아래 `system.update` 가 매 프레임 이 배열만 훑어 파셀과 생사를 맞춘다.
     */
    const copies: PlacedCopy[] = [];
    /**
     * 예열이 끝났는가 (검수관 블로커 B2). `system.update` 가 이것을 보고 토글을 보류한다 —
     * 근거는 그 자리 주석 한 곳이다. **`false` 로 시작하는 것이 fail-closed** 다:
     * 예열을 못 마친 세션(로드 실패·`dispose`)에서는 아무것도 끄지 않는다.
     */
    let warmed = false;
    let disposed = false;

    // ── 상태를 화면에 띄운다 (감독 판정) ──────────────────────────────────
    // *"건물이 안보이던데. 하나도"* / *"tamed 안보이는데"*
    //
    // 진단은 `window.__worldN` 에만 있어서 콘솔을 열어야 보인다. 감독은 폰으로 본다.
    // 50채 로딩이 헤드리스에서 38초였으니 실기기는 더 걸리는데, 그동안 화면에 아무
    // 표시가 없으면 **아직 로딩 중인 것과 실패한 것이 구분되지 않는다.**
    // 실험 기능이므로 배지도 이 파일이 스스로 만들고 스스로 지운다.
    const badge = makeBadge(env.doc);
    badge?.set('미술관 GLB 내려받는 중…');

    // 로더와 three 를 **동적 import** 로 가져온다. `?glb=` 가 없는 세션은 이 코드를
    // 내려받지도 않는다 — 실험이 평상시 번들을 무겁게 만들면 그 자체가 성능 변수가 된다.
    void (async () => {
      try {
        const [{ GLTFLoader }, THREE] = await Promise.all([
          import('three/addons/loaders/GLTFLoader.js'),
          import('three/webgpu'),
        ]);
        if (disposed) return;

        const gltf = await new GLTFLoader().loadAsync(modelUrl());
        if (disposed) return;

        const model = gltf.scene as unknown as Object3D;
        measure(model, counts);
        // ── 모드 (`?glbmode=`) — 추측이 아니라 **이분법으로 좁히는 도구** ────
        // 감독 판정이 네 번 왔고 내 처방이 세 번 빗나갔다(금속·투명·재질교체).
        // 셋 다 헤드리스(WebGL)에서는 효과가 있었는데, **WebGL 에서는 애초에 문제가
        // 없었다** — 헤드리스에서는 처음부터 미술관이 잘 보였다. 나는 문제가 없는
        // 환경에서 세 번 고친 것이다.
        //
        // 그러니 다음 한 발은 처방이 아니라 **측정**이어야 한다. 세 모드를 같은
        // 기기에서 번갈아 보면 원인이 한 번에 좁혀진다:
        //
        //   box  — GLB 를 버리고 같은 자리·같은 크기의 **단순 상자**를 세운다.
        //          이것도 안 보이면 원인은 GLB 가 아니라 배치·씬·렌더 경로다.
        //   flat — GLB 지오는 쓰되 **텍스처 없는 순색** 재질. 보이면 텍스처가 원인.
        //   glb  — 지금 상태(텍스처 포함 교체 재질). 기본값.
        const mode = deps.readEnum('glbmode', 'glb', ['glb', 'box', 'flat'] as const);
        // ── 그림자를 던지고 받게 한다 (감독 지시 2026-08-02) ──────────────────
        // GLB 의 `castShadow`/`receiveShadow` 기본값은 **false** 다. 파츠들은 스펙에서
        // 명시적으로 켜는데(`parts/*.ts` 의 `asset()`) 이 기능은 그 경로를 안 지나므로,
        // 어제 세운 랜드마크만 **그림자가 없는 채로 서 있었다.** 세계에서 가장 큰
        // 구조물이 빛을 안 막으니 "하드라이트가 아니다" 의 한 축이 된다.
        model.traverse((o: Object3D) => { o.castShadow = true; o.receiveShadow = true; });
        const fixed = tameMetals(model as unknown as MetalWalkable);
        counts.tamed = fixed.metals;
        counts.opaque = fixed.opaque;

        // ── 재질 축 (`?glbmat=`) — 다시 이분법이다 ────────────────────────
        // GLB 파일의 재질을 고쳤는데도(metallic 9개 → 0, BLEND 5개 → OPAQUE) 감독
        // 화면에서 원본 재질이 **여전히 안 보인다**. 그러니 금속·투명은 원인이 아니었다.
        //
        // 남은 후보가 둘인데 **서로 다른 처방을 요구한다.** 한 축으로 뭉뚱그리면 또
        // 헛짚는다:
        //
        //   (a) 확장 **값**   — sheen·clearcoat·specular·anisotropy 가 화면을 먹는다
        //   (b) 재질 **클래스** — 확장이 있으면 GLTFLoader 가 `MeshPhysicalMaterial` 을
        //       쓰는데, `three/webgpu` 의 그 노드 재질 경로 자체가 문제일 수 있다
        //
        // (a)면 값만 0으로 하면 되고 텍스처·노멀맵이 전부 살아난다. (b)면 클래스를
        // 바꿔야 하는데, 그때도 **텍스처를 다 옮기면** 룩 손실이 지금보다 훨씬 적다.
        //
        //   raw   — 원본 그대로. 지금 안 보이는 것
        //   noext — 원본 클래스 유지 + 확장 **값만** 0 → 보이면 (a)
        //   std   — MeshStandardMaterial 로 옮기되 **텍스처 전부 이관** → 보이면 (b)
        //   swap  — map·color 만 가져오고 나머지는 버린다(룩 손실 최대)
        //
        // 헤드리스는 WebGL 이라 이 사각을 원리적으로 못 본다 — 감독 화면만 가른다.
        // 그래서 처방이 아니라 **노브**를 배포했다.
        //
        // ── 감독 판정 2026-07-29: **(a) 확장 값이 원인** ──────────────────────
        //   raw 안 보임 / noext 보임 / std 보임 / box 보임
        //
        // `noext` 가 보인다는 것이 결론을 셋으로 좁힌다 — 재질 **클래스**는 멀쩡하고,
        // 텍스처도 멀쩡하고, 씬·조명·카메라도 멀쩡하다(box 가 보였다). `three/webgpu` 가
        // `sheen`·`clearcoat`·`anisotropy`·`ior` 를 처리하다 화면을 먹는다.
        //
        // 그래서 기본을 `noext` 로 옮긴다. **가장 적게 버리는 선택지가 곧 답이었다** —
        // 클래스도 텍스처도 노멀맵도 AO 도 emissive 도 전부 살고, 꺼지는 것은 확장 값뿐이다.
        // 이전 기본(`swap`)은 그 전부를 버리고 있었다.
        //
        // 어느 확장이 범인인지는 아직 모른다(넷을 한꺼번에 껐다). 하나만 범인이면 나머지
        // 광택은 살릴 수 있으므로 좁힐 값어치가 있지만, 그건 감독 판정을 또 한 번 써야
        // 하는 일이라 룩을 보신 뒤로 미룬다. **모른다는 것을 아는 채로 둔다.**
        const matMode = deps.readNum('glbraw', 0, 0, 1) >= 1
          ? 'raw' // 하위호환 — 이미 드린 링크가 살아 있어야 한다
          : deps.readEnum('glbmat', 'noext', MAT_MODES);
        counts.swapped = applyMatMode(
          model, THREE as unknown as ThreeNS, matMode, mode === 'flat',
        );
        counts.mode = mode;
        counts.mat = matMode;

        // 실험 물건을 한 그룹에 모은다 — 정리할 때 하나만 지우면 된다.
        const g = new THREE.Group();
        g.name = `${deps.worldName}:glbCity`;
        // 이전 시도의 잔재를 남기지 않는다 — 재진입이 없다고 가정하지 않는다.
        copies.length = 0;
        env.scene.add(g);
        root = g as unknown as Object3D;

        // 씬에 먼저 붙이고 채워 넣는다. 그래야 세워지는 과정이 화면에 보인다.
        const unit = mode === 'box' ? makeBox(THREE) as unknown as Object3D : model;
        await placeGrid(THREE as unknown as ThreeGroupNS, unit, root, want, env.cell, deps.plazaWest, (done) => {
          counts.placed = done;
          if (!disposed) badge?.set(`미술관 ${done}/${want} 세우는 중…`);
        }, copies);
        if (disposed) return;

        // 예열이 **끝난 뒤에** ready 를 세운다(팀장 조건 1). 순서를 뒤집으면 게이트가
        // 예열 전에 기준선을 잡아 FAIL 이 그대로 재현되고, `ready` 가 뜻하는 것도
        // "다 섰다" 에서 "다 섰지만 아직 GPU 에 안 올라갔다" 로 흐려진다.
        await warmUp(root);
        // 여기부터 토글을 연다 — 예열이 굽지 못한 채가 생기는 창을 아예 안 만든다(B2).
        warmed = true;
        if (disposed) return;

        counts.state = 'ready';
        // ── 실제 씬 좌표를 잰다 (감독 판정 4회 후) ──────────────────────
        // 배지의 "최근접 32m" 는 `gridCells` 의 **계산값**이었다. 계산이 맞아도 씬에
        // 실제로 그 자리에 섰는지는 별개다 — 네 번의 "안 보인다" 동안 나는 계산값만
        // 보고 배치는 맞다고 전제했다. **전제를 재본 적이 없다.**
        //
        // three 가 로드·배치한 결과의 실제 경계 상자를 읽는다. 여기서 y 가 지하이거나
        // 크기가 터무니없으면 렌더가 아니라 배치·스케일 문제다.
        try {
          const box = new (THREE as unknown as { Box3: new () => Box3Like }).Box3().setFromObject(root as never);
          if (box.min.x !== Infinity) {
            counts.box = [box.min, box.max]
              .map((v) => `${v.x.toFixed(0)},${v.y.toFixed(1)},${v.z.toFixed(0)}`)
              .join(' ~ ');
          } else {
            counts.box = '비어 있음(메시 0)';
          }
        } catch (e) {
          counts.box = '측정 실패: ' + (e instanceof Error ? e.message : String(e));
        }

        // 최근접 거리를 함께 띄운다. **"안 보인다" 가 배치 문제인지 렌더 문제인지
        // 이 숫자 하나로 갈린다** — 32m 인데 안 보이면 렌더, 200m 면 배치다.
        // **`gridCells` 가 아니라 실제 배치 목록에서 잰다.** 첫 채가 랜드마크로 고정된
        // 뒤에도 옛 함수를 그대로 두면 배지가 세우지도 않은 자리의 거리를 말한다.
        const first = placementCells(want, env.cell, deps.plazaWest)[0];
        const near = first ? Math.hypot(first.x, first.z) : 0;
        badge?.set(
          // **어느 축으로 보고 있는지를 배지가 말해야 한다.** 감독은 폰으로 보고,
          // 여러 링크를 번갈아 열면 지금 화면이 어느 조합인지 헷갈린다 — 그러면 판정이
          // 엉뚱한 축에 붙는다. 리포트에는 아직 이 값이 안 실리므로 배지가 유일한 표시다.
          `미술관 ${want}채 · ${counts.mode}/${counts.mat}`
          + ` · 최근접 ${near.toFixed(0)}m · 범위 ${counts.box}`,
        );
      } catch (err) {
        // **못 잰 것은 통과가 아니다.** 실패를 조용히 삼키면 진단에 0 이 찍히고 그것이
        // "가볍다" 로 읽힌다. 무엇이 막았는지를 남긴다.
        counts.state = 'failed';
        counts.error = err instanceof Error ? err.message : String(err);
        badge?.set('미술관 GLB 실패: ' + counts.error);
      }
    })();

    return {
      diagnostics: () => ({
        want,
        placed: counts.placed,
        state: counts.state,
        error: counts.error,
        tamed: counts.tamed,
        opaque: counts.opaque,
        swapped: counts.swapped,
        box: counts.box,
        mode: counts.mode,
        meshesPer: counts.meshesPer,
        trisPer: counts.trisPer,
        // 곱해서 함께 보여준다 — 판정에 필요한 것은 1채가 아니라 총량이다.
        meshesTotal: counts.meshesPer * counts.placed,
        trisTotal: counts.trisPer * counts.placed,
        // 🔴 지금 **꺼져 있는** 채. 파셀과 생사를 맞춘 결과다(2026-08-19). `parcelLoaded`
        // 를 안 주는 세계(world3·world5)에서는 늘 0 이고, 그것이 사실이다.
        hidden: copies.length - copies.reduce((n, c) => n + (c.node.visible ? 1 : 0), 0),
      }),

      // 드로우콜 판정에서 **이 표본을 통째로 뺀다.** 이 기능이 켜진 세션은 개수 불변식이
      // 성립하지 않는 세션이고(그게 실험의 요지다), 그 상태로 "불변식 위반" 을 보고하면
      // 리포트가 실험 자체를 결함으로 읽는다.
      drawGroupKey: () => null,
      // 막았으면 **끄는 법까지** 알려준다. 리포트가 이름만 적으면 감독은 노브를 찾으러
      // 코드를 열어야 한다. 이 문자열의 소유자는 노브를 읽는 이 파일이다(`readNum('glb')`).
      drawBlockHint: 'glb=0',

      /**
       * 🔴 **레이캐스트 루트** — 편집이 미술관 벽을 벽 검출 대상에 넣으려고 부른다
       * (태스크 #112, 2026-08-19). 아직 안 세워졌으면 `null`.
       *
       * ── 왜 이 문이 필요했나 ────────────────────────────────────────────────
       * 이 그룹은 `env.scene.add(g)` 로 **씬에 직결**된다. 오버레이 항목도 아니고
       * 인스턴스 슬롯도 아니라, 편집의 `pickFace()` 가 보는 두 목록 어디에도 안 들었다.
       * 증상은 «벽을 겨눴는데 엉뚱한 데 걸린다» 였다 — 광선이 미술관을 **통과해** 뒤편
       * 마을 건물을 맞히고 그쪽이 유효한 벽이라 그대로 걸렸다.
       *
       * ⚠ **읽기 전용으로 다뤄라.** 여기서 내주는 것은 「광선을 쏠 대상」이지 조작 권한이
       * 아니다. 편집이 이 루트의 자식을 옮기거나 지우면 `dispose()` 의 전제가 깨진다.
       *
       * ⚠ **선택적 메서드인 것이 요점이다** — world3·world5 도 이 계약을 쓰는데 그쪽에는
       * 편집이 없다. 필수로 만들면 세 세계가 함께 움직여야 하고, 그 결합은 이 기능이
       * 요구하는 것보다 넓다.
       */
      wallRoot: () => {
        if (!root) return null;
        // 🔴 **보이는 채가 하나도 없으면 벽도 없다** (2026-08-19). three 는 레이캐스트에서
        // `visible` 을 **안 본다**(`layers` 만 본다 — 이 저장소 실측). 그래서 파셀이
        // 내려가 안 보이는 미술관도 광선에는 그대로 걸리고, 그대로 두면 **안 보이는 벽에
        // 액자가 걸린다.**
        //
        // ⚠ **부분적으로 보이는 경우는 못 가른다** — 한 채라도 보이면 루트 전체를 내주므로
        // 그때는 안 보이는 채의 벽도 대상이 된다. 지금 기본 채수가 1(`DEFAULT_COPIES`)이라
        // 실질 위험이 없고, 여러 채가 서로 다른 파셀에 서는 회차에 다시 본다(백로그 `G-ART6`).
        return copies.length === 0 || copies.some((c) => c.node.visible) ? root : null;
      },

      /**
       * 🔴 **파셀과 생사를 맞춘다** (감독 지시 2026-08-19 — *"glb건물도 사라지게해서.
       * 가볍게 만들자. 건물이 많아질수있으니"*).
       *
       * ── 왜 `visible` 토글인가 — `dispose` 가 아니라 ──────────────────────────
       * 액자가 W8-9 에서 **정확히 같은 판단**을 했고 근거도 같다(`artwork-scene.ts` 의
       * `update`): 지오·재질을 버리고 다시 만들면 재방문마다 `info.memory` 가 오르고,
       * 그것이 개수 불변식 `[7]` 의 `settledOk` 를 깨는 형태다. 여기서 하는 것은 **대입
       * 하나**이고 GPU 자원을 만들지도 지우지도 않는다.
       *
       * 얻는 것은 **렌더 비용**이다 — 안 보이는 채는 드로우콜도 삼각형도 내지 않는다.
       * 감독 지시의 «가볍게» 가 그것이고, «건물이 많아질수있으니» 가 이 축이 채수에
       * 비례해 커지는 이유다.
       *
       * ⚠ **`parcelLoaded` 가 없으면 아무 일도 안 한다** — world3·world5 의 `FeatureEnv`
       * 에는 그 항목이 없다(실측). 그때는 이 기능이 예전처럼 늘 보이고, 그것이 **결함이
       * 아니라 그 세계의 사실**이다.
       *
       * ⚠⚠ **상태가 변할 때만 대입한다.** three 의 `visible` 은 단순 필드라 대입 자체는
       * 싸지만, 매 프레임 무조건 쓰면 «이 값이 언제 바뀌었나» 를 프로파일러에서 못 읽는다.
       */
      system: {
        name: 'glbCityVisibility',
        // 🔴 **예열이 끝나기 전에는 토글하지 않는다** (검수관 블로커 B2, 2026-08-19).
        //
        // `warmUpNode` 는 `frustumCulled` 만 되돌리는데, 렌더러의 `visible === false`
        // 단락은 **컬링 판정보다 앞**에 있다(WebGL·WebGPU 양쪽 확인). 즉 **꺼진 채는
        // 예열 프레임에서도 안 그려지고**, 예열이 아무것도 못 굽는다.
        //
        // 순서가 실제로 겹친다: 커널이 이 시스템을 **부팅에 등록**하고, `placeGrid` 는
        // `attachAll` 로 **프레임을 넘기며** 채를 붙인다(같은 rAF). 그래서 `await
        // warmUp(root)` 이 끝나기 전에 이 함수가 이미 여러 번 돈다.
        //
        // 그때 꺼진 채는 나중에 파셀이 올라올 때 지오·텍스처·파이프라인이 **세션 중에
        // 계단으로** 생긴다 — `warmUp` 주석이 막으려고 존재하는 바로 그 사고이고,
        // CLAUDE.md 가 *"만들어 둔 것과 GPU 에 올라간 것은 다른 일"* 로 못 박은 함정이다.
        //
        // ⚠ **계단의 크기는 못 쟀다** — 이 저장소는 프레임 시간을 안 재고 `[7]` 은 CI 에서
        // observe 라 종료코드에서 빠진다. **못 잰 것을 통과로 적지 않는다.** 여기서 하는
        // 것은 「그 창을 아예 안 열기」이고, 그것은 재지 않아도 참이다.
        // ⚠ **판정이 한 프레임 늦다**(검수관 권고 P2). 조립부가 기능 시스템을 스트리밍보다
        // **먼저** 커널에 넣으므로, 건물은 «이전 프레임의 파셀 상태» 로 켜지고 꺼진다.
        // 액자가 같은 사실을 `decide/stream.ts` 헤더에 적어 두었고(검수관 P2 · 태스크 #115)
        // 건물 쪽에는 없었다. 1프레임이라 화면에서는 안 보이지만, **원인을 찾을 때 이
        // 줄이 없으면 엉뚱한 데를 판다.**
        update(ctx) {
          if (!warmed) return;
          // **판정 → 집행 두 걸음이다.** 앞이 목표(`want`)를 정하고 뒤가 화면을 옮긴다.
          // 한 함수로 합치면 등장 연출이 살 자리가 없어진다(2026-08-20 이전이 그랬다).
          syncVisibility(copies, env.parcelLoaded);
          advanceGrow(copies, ctx.dt, deps.copyScale);
        },
      },

      dispose() {
        disposed = true;
        badge?.remove();
        root?.removeFromParent();
        root = null;
        // ⚠ `copies` 도 비운다 (검수관 권고 P3). 위 조립부가 «재진입이 없다고 가정하지
        // 않는다» 며 비우는데 여기만 안 비우면 **비대칭**이고, 남은 참조가 떼어낸 노드를
        // 붙들어 둔다. `warmed` 도 되돌린다 — 안 그러면 재진입 세션이 예열 전에 토글한다.
        copies.length = 0;
        warmed = false;
      },
    };
  },
};

/**
 * 금속 재질을 눅인다. **"건물이 하나도 안 보인다" 의 원인이 여기 있었다.**
 *
 * ── 감독 판정 ───────────────────────────────────────────────────────────────
 * *"건물이 안보이던데. 하나도"*
 *
 * 실제로는 그려지고 있었다 — 드로우콜이 14 → 1,563 으로 폭증했다. 다만 **전부 새까맸다.**
 * 이 GLB 는 재질 17개 중 **9개가 `metalness = 1.0`** 인데, 금속 PBR 은 diffuse 가 0 에
 * 수렴하고 반사만 남는다. 반사할 환경(IBL)이 없으면 정의상 검게 렌더된다.
 *
 * ── 같은 결함을 이미 한 번 겪었고, 기록도 있었다 ────────────────────────────
 * `lab-glb.js`(같은 GLB 를 쓰는 실험 페이지)의 주석이 정확히 이렇게 적고 있다 —
 * *"금속류가 environment(IBL) 없이는 반사할 게 없어 완전 검정으로 렌더된다(1차 헤드리스
 * 스크린샷으로 실증)"*. **나는 GLB 파일만 가져오고 그것이 서려면 필요한 조건은 안
 * 가져왔다.** 자산을 옮길 때 옮겨야 하는 것은 파일이 아니라 파일 + 성립 조건이다.
 *
 * ── 왜 환경맵이 아니라 재질인가 ─────────────────────────────────────────────
 * `lab-glb.js` 는 PMREM 환경맵으로 풀었다. 같은 방법을 시도했더니
 * `this._renderer.hasInitialized is not a function` 으로 실패했다 — `three/webgpu` 의
 * PMREMGenerator 는 WebGPU 전용 API 를 요구하는데 헤드리스는 WebGL 폴백이다.
 *
 * 규율이 이 경우를 지시한다: *"백엔드 의존 API 를 쓸 때는 어댑터에 가두거나, 두
 * 백엔드에서 **동일한 수단**을 고른다."* 재질 속성은 백엔드와 무관하다.
 *
 * ── 무엇을 바꾸고 무엇을 안 바꾸는가 ────────────────────────────────────────
 * `metalness` 만 낮춘다. 색·텍스처·거칠기는 그대로다. 금속감은 잃지만 **형태가 보인다** —
 * 이 실험이 답해야 하는 질문("미술관 N 채가 볼 만한가, 얼마나 무거운가")에는 형태가
 * 먼저다. 정식 도입 때는 환경맵을 어댑터에 제대로 넣는 것이 맞다.
 *
 * 재질은 clone 이 **참조 공유**하므로 여기서 한 번 고치면 N 채에 모두 적용된다 —
 * 개수 불변식도 그대로다.
 */
export function tameMetals(model: MetalWalkable): { metals: number; opaque: number } {
  let metals = 0;
  let opaque = 0;
  const seen = new Set<unknown>();
  model.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list as MatLike[]) {
      if (!m || seen.has(m)) continue;
      seen.add(m);

      // ── ① 금속 — 반사할 환경이 없으면 검게 나온다 ──────────────────────
      if (typeof m.metalness === 'number' && m.metalness > METAL_THRESHOLD) {
        m.metalness = METAL_TAMED;
        metals++;
      }

      // ── ② 헛된 투명 — **이것이 "안 보인다" 의 본체였다** ────────────────
      // 이 GLB 는 벽 재질 5개(plaster·Sand-Finish·STUCCO-Sand·ARCH-Ridged)가
      // `alphaMode: BLEND` 인데 **알파는 전부 1.0** 이다. 투명일 이유가 없는데
      // 저작 도구가 그렇게 내보냈다.
      //
      // three 는 BLEND 를 `transparent: true` 로 옮기고, 그러면 깊이 쓰기가 꺼지고
      // 그리는 순서가 정렬에 의존한다. **WebGL 은 관대하게 그려 주지만 WebGPU 는
      // 그렇지 않다** — 헤드리스에서는 보이는데 감독 기기(WebGPU)에서만 안 보였던
      // 것이 이것이다. 지표는 정상이었다(삼각형이 182만까지 잡혔다).
      //
      // 완전 불투명한 것만 되돌린다. 진짜 유리(알파 < 1)는 그대로 둔다.
      if (m.transparent === true && (m.opacity === undefined || m.opacity >= 1)) {
        m.transparent = false;
        m.depthWrite = true;
        opaque++;
      }
    }
  });
  return { metals, opaque };
}

/** 이 값을 넘는 금속만 손댄다. 0.6 짜리(DarkMetal)는 원래 의도된 금속감이라 남긴다 */
const METAL_THRESHOLD = 0.9;
/** 눅인 뒤 값. 0 으로 만들면 금속감이 통째로 사라져 벽이 종이처럼 보인다 */
const METAL_TAMED = 0.15;

interface MatLike {
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
}

/** `tameMetals` 가 요구하는 최소 계약. three 전체를 끌어오지 않으려고 좁게 적는다 */
export interface MetalWalkable {
  traverse(cb: (o: { isMesh?: boolean; material?: unknown }) => void): void;
}

/**
 * 실험 상태 배지. **없어도 되는 것이 아니라, 없으면 판정이 불가능한 것이다.**
 *
 * 감독은 폰에서 본다. `window.__worldN` 진단은 콘솔을 열어야 보이므로 없는 것과 같다.
 * 로딩이 수십 초 걸리는데 표시가 없으면 "아직 오는 중" 과 "실패" 가 구분되지 않고,
 * 그 구분이 안 되면 화면 판정 자체가 성립하지 않는다.
 *
 * DOM 이 없는 환경(테스트·헤드리스 일부)에서는 `null` 을 돌려주고 호출부는 `?.` 로
 * 넘긴다 — 배지가 없다고 실험이 안 도는 일은 없어야 한다.
 */
export function makeBadge(doc: Document | null): { set(t: string): void; remove(): void } | null {
  if (!doc?.body) return null;
  const el = doc.createElement('div');
  el.setAttribute('data-glb-city', '');
  // 인라인 스타일을 쓴다. 실험이 CSS 파일을 건드리면 그 자국이 남고, 목록에서 한 줄을
  // 지우는 것으로 사라진다는 규약이 깨진다.
  el.style.cssText = [
        // z-index 7 — 조이스틱(6) 위, 성능 HUD(8) 아래. 50 으로 두었더니 입장
    // 오버레이(10)까지 덮었다. \ 이라 입력은 안 막지만,
    // 실험 표시가 본체 UI 를 가리는 것은 그 자체로 판정을 방해한다.
    'position:fixed', 'left:8px', 'bottom:8px', 'z-index:7',
    'padding:6px 10px', 'border-radius:8px',
    'background:rgba(18,20,24,.82)', 'color:#e8eaee',
    'font:12px/1.4 system-ui,sans-serif', 'pointer-events:none',
    'max-width:70vw', 'white-space:nowrap',
    'overflow:hidden', 'text-overflow:ellipsis',
  ].join(';');
  doc.body.appendChild(el);
  return {
    set(t) { el.textContent = t; },
    remove() { el.remove(); },
  };
}

/**
 * GLB 재질을 **단순 재질로 갈아끼운다.** 텍스처와 색은 가져오고 확장은 전부 버린다.
 *
 * ── 왜 필요한가 (감독 판정 3회) ────────────────────────────────────────────
 * *"건물이 안보이던데. 하나도"* → 금속을 눅였다 → 여전히 안 보임 → 헛된 투명을
 * 되돌렸다 → **여전히 안 보임.**
 *
 * 두 처방 모두 헤드리스(WebGL)에서는 효과가 있었고 감독 기기(WebGPU)에서는 없었다.
 * 남은 차이는 **재질 확장**이다. 이 GLB 는 다섯을 쓴다 —
 * `KHR_materials_sheen` · `clearcoat` · `specular` · `anisotropy` · `ior`.
 * `three/webgpu` 가 이들을 노드 재질로 옮기다 실패하면 재질이 통째로 안 그려진다.
 * WebGL 경로에는 없는 실패 모드라 헤드리스로는 원리적으로 재현되지 않는다.
 *
 * ── 추측을 처방으로 바꾸지 않기 위해 ───────────────────────────────────────
 * 이것도 아직 가설이다. 그래서 **끄는 노브**(`?glbraw=1`)를 함께 연다. 교체본과 원본을
 * 같은 기기에서 번갈아 보면 확장이 원인인지 **한 번에 갈린다** — 내가 헤드리스로는
 * 영영 못 가르는 것을 감독 화면이 가른다.
 *
 * 재질은 **원본 하나당 하나씩만** 만들어 캐시한다. GLB 는 78개 메시가 17개 재질을
 * 공유하므로, 메시마다 새로 만들면 재질이 78개로 불어나 개수 불변식이 깨진다.
 */
function swapMaterials(model: Object3D, THREE: ThreeNS, flat = false, keepMaps = false): number {
  const cache = new Map<unknown, unknown>();
  let n = 0;
  model.traverse((o: Object3D & { isMesh?: boolean; material?: unknown }) => {
    if (!o.isMesh || !o.material) return;
    const one = (src: SrcMat): unknown => {
      const hit = cache.get(src);
      if (hit) return hit;
      const made = new THREE.MeshStandardMaterial({
        // `flat` 이면 텍스처를 뗀다 — 텍스처가 원인인지 가르는 축이다.
        map: flat ? null : (src?.map ?? null),
        color: src?.color ?? 0xffffff,
        // 원본 거칠기는 살리되 금속은 낮게 고정한다 — 환경맵이 없는 씬이라 높은
        // 금속은 어느 백엔드에서든 검게 나온다.
        roughness: typeof src?.roughness === 'number' ? src.roughness : 0.8,
        metalness: 0.05,
      }) as Record<string, unknown>;
      // ── `keepMaps` — 클래스만 바꾸고 **나머지는 다 가져온다** ──────────────
      // 지금 기본(`swap`)은 map·color 만 옮기고 노멀맵·AO·emissive 를 통째로 버린다.
      // 그게 감독이 본 "원본 룩이 아닌 화면"의 정체다. 클래스가 원인이라면 클래스만
      // 바꾸면 되지, 텍스처까지 버릴 이유가 없다.
      if (keepMaps && !flat) {
        for (const k of CARRY_MAPS) {
          const v = (src as Record<string, unknown>)?.[k];
          if (v !== undefined && v !== null) made[k] = v;
        }
      }
      cache.set(src, made);
      n++;
      return made;
    };
    o.material = Array.isArray(o.material)
      ? (o.material as SrcMat[]).map(one)
      : one(o.material as SrcMat);
  });
  return n;
}

/**
 * 클래스를 바꿔도 따라가야 하는 것들. **`MeshStandardMaterial` 이 이해하는 것만** 적는다 —
 * 확장 전용 속성(sheen·clearcoat 등)은 여기 없다. 그게 이 모드의 정의다.
 */
export const CARRY_MAPS = [
  'normalMap', 'normalScale', 'aoMap', 'aoMapIntensity',
  'emissive', 'emissiveMap', 'emissiveIntensity',
  'roughnessMap', 'metalnessMap', 'alphaMap', 'lightMap', 'lightMapIntensity',
  'side', 'flatShading', 'vertexColors',
] as const;

// `EXT_OFF`·`disableMatExtensions` 는 `systems/glb-material.ts` 가 소유한다 — 오버레이도
// 같은 처방이 필요한데 **다른 기능이 `glb-city` 를 import 하지 않는다**는 규율이 게이트로
// 집행되기 때문이다(아래 `noext` 분기 참조).

export const MAT_MODES = ['swap', 'std', 'noext', 'raw'] as const;
export type MatMode = (typeof MAT_MODES)[number];

/**
 * 재질 축을 적용한다. **네 모드가 서로 다른 가설을 검증한다** — 위 `?glbmat=` 주석 참고.
 *
 * @returns 손댄 재질 수(진단용). `raw` 는 0 이다.
 */
function applyMatMode(model: Object3D, THREE: ThreeNS, mat: MatMode, flat: boolean): number {
  if (mat === 'raw') return 0;
  if (mat === 'swap') return swapMaterials(model, THREE, flat, false);
  if (mat === 'std') return swapMaterials(model, THREE, flat, true);
  return disableMatExtensions(model);
}

interface SrcMat { map?: unknown; color?: unknown; roughness?: number }

/**
 * 동적 import 한 `three/webgpu` 중 이 파일이 쓰는 부분만. 전체 타입을 정적으로 끌어오면
 * 실험 파일이 three 에 묶여, "`?glb=` 없으면 아무것도 안 한다" 는 성질이 흐려진다.
 */
interface ThreeNS {
  MeshStandardMaterial: new (o: Record<string, unknown>) => unknown;
}

/** `Box3` 최소 계약 — 실제 배치를 재는 데만 쓴다 */
interface Box3Like {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  setFromObject(o: never): Box3Like;
}

/** 배치가 쓰는 최소 계약 — 그룹 하나와 경계 상자 하나면 된다 */
interface ThreeGroupNS {
  Group: new () => {
    add(o: never): void;
    position: { set(x: number, y: number, z: number): void };
    rotation: { y: number };
    // 🔴 파셀 생사·등장 연출의 통로 (검수관 블로커 C4). 그전엔 요구·공급 **양쪽이**
    // 캐스팅으로 빠져나가 대조가 0 이었다 — 실측: 스텁에서 `scale` 을 지우면 `tsc` 가 막는다.
    visible: boolean;
    scale: { setScalar(v: number): void };
  };
  Box3: new () => Box3Like;
}

/**
 * 미술관 대신 세울 **단순 상자.** 크기는 GLB 실측 바운즈와 같게 맞춘다.
 *
 * 이것이 보이는데 GLB 가 안 보이면 원인은 **GLB 쪽**(지오·재질·텍스처)이고,
 * 이것도 안 보이면 원인은 **배치·씬·렌더 경로**다. 네 번의 판정 동안 그 둘을 가르는
 * 수단이 없어 매번 GLB 만 의심했다.
 */
function makeBox(THREE: unknown): unknown {
  const T = THREE as {
    Mesh: new (g: unknown, m: unknown) => unknown;
    BoxGeometry: new (w: number, h: number, d: number) => { translate(x: number, y: number, z: number): unknown };
    MeshStandardMaterial: new (o: Record<string, unknown>) => unknown;
  };
  // GLB 실측: 폭 17.2 · 높이 7.9 · 깊이 24.6, 바닥이 y=−0.5
  const geo = new T.BoxGeometry(17, 8, 24);
  geo.translate(0, 3.5, 0);
  return new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xc86432, roughness: 0.9, metalness: 0 }));
}

/** 한 채의 메시 수와 삼각형 수를 센다. 총량은 이 값에 채수를 곱해 얻는다 */
function measure(model: Object3D, out: Counts): void {
  let meshes = 0;
  let tris = 0;
  model.traverse((o: Object3D & { isMesh?: boolean; geometry?: GeoLike }) => {
    if (!o.isMesh || !o.geometry) return;
    meshes++;
    const g = o.geometry;
    if (g.index) tris += g.index.count / 3;
    else if (g.attributes?.position) tris += g.attributes.position.count / 3;
  });
  out.meshesPer = meshes;
  out.trisPer = Math.round(tris);
}

interface GeoLike {
  index?: { count: number } | null;
  attributes?: { position?: { count: number } };
}

/**
 * 파셀 격자에 세운다. 미술관이 26×24m 이고 셀이 32m 라 한 칸에 한 채가 들어간다.
 *
 * 원점에서 **가까운 순으로** 채운다. 채수가 적어도 화면에 보이는 곳부터 서야 실험이
 * 성립한다 — 뒤에 세워 놓고 "안 버벅인다"고 하면 그건 프러스텀 컬링을 잰 것이지 부하를
 * 잰 것이 아니다.
 *
 * ── 스폰 칸은 비운다 (감독 실기기 판정) ─────────────────────────────────────
 * 감독: *"50채 해봤는데. 조이스틱이 안먹는듯."*
 *
 * 조이스틱은 멀쩡했다. **원점이 곧 플레이어 스폰 지점**인데 거기에 26×24m 미술관을
 * 세웠으니, 부팅하자마자 건물 한가운데에 갇힌 것이다. 움직여도 사방이 같은 벽이라
 * 입력이 안 먹는 것처럼 보인다.
 *
 * 실험 설계의 결함이지 성능 문제가 아니었다. 원점 한 칸만 비우면 그 자리에 서서
 * 둘러보게 되고, 부하는 그대로 유지된다 — 비운 칸의 몫은 바깥으로 한 칸 밀린다.
 */
// 파셀 생사·등장 연출은 **`glb-city-visibility.ts` 소유**(2026-08-20 분리, 근거는 그 파일 헤더).
// 재수출은 소비자 경로용, `import` 는 이 파일에서 쓰기용 — 둘 다 필요하다.
export { syncVisibility, advanceGrow, type PlacedCopy } from './glb-city-visibility.js';
import { syncVisibility, advanceGrow, type PlacedCopy } from './glb-city-visibility.js';


/**
 * 🔴 **export 인 것은 시험을 위해서다** (검수관 블로커 B1, 2026-08-19).
 *
 * 이 함수는 three 를 **주입받는다**(`THREE: ThreeGroupNS` — `Group`·`Box3` 둘뿐이고,
 * `nextFrame()` 은 노드에서 `setTimeout` 으로 떨어진다). 즉 **25줄짜리 스텁이면 브라우저도
 * GLB 도 없이 돈다.**
 *
 * ⚠ 나는 이 자리에 *"13.5MB GLB 를 실제로 로드해야 하고 **노드에서는 불가능하다**"* 라고
 * 적었고 **거짓이었다.** 막고 있던 것은 자산도 브라우저도 아니라 `export` 키워드 하나였다.
 * 검수관이 PoC 로 증명했고(4ms · 2 tests), 그 구멍의 대가가 실측으로 드러났다 —
 * `out.push({…})` 를 **통째로 지워도 4,090 테스트가 전부 초록**이었다. 감독 지시
 * (*"glb건물도 사라지게해서"*)가 통째로 미구현인 상태가 아무 데도 안 나타난다는 뜻이다.
 *
 * **직전 회차에 같은 형태로 두 번 지적받고 처방까지 적었다** — *"「안 한다」를 적을 때는
 * 안 되는 것을 한 번 해 보고 적는다"*(`G-ART3`). 그 다음 회차에 또 했다. 처방을 하나
 * 더한다: **「시험할 방법이 없다」를 적기 전에 그 함수의 시그니처가 이미 주입식인지 본다.**
 */
export async function placeGrid(
  THREE: ThreeGroupNS,
  model: Object3D,
  root: Object3D,
  n: number,
  cell: number,
  plazaWest: { readonly px: number; readonly pz: number },
  onStep: (done: number) => void,
  /** 세운 채가 여기 쌓인다. 호출부가 파셀 토글에 쓴다 */
  out: PlacedCopy[],
): Promise<void> {
  // ⚠ **이름을 하나 더 둔다** — 아래 `place: async (cell, i)` 의 `cell` 이 `Placement`
  // 라서 바깥의 `cell`(파셀 한 변, m)을 **가린다.** 콜백 안에서 파셀 좌표를 유도하려면
  // 가려지지 않는 이름이 필요하다.
  const cellSize = cell;
  const cells = placementCells(n, cell, plazaWest);
  // ── 피벗 보정 — **주석의 치수가 아니라 실물을 잰다** ──────────────────────
  // 이 자산은 로컬 XZ 중심이 노드 원점에서 벗어나 있고 바닥도 y=0 이 아니다. 파셀
  // 중심에 그냥 `position.set` 하면 시각적 중심이 밀려 셀 경계를 1m 남짓 넘고, 바닥은
  // 지면에 반쯤 묻힌다.
  //
  // 오프셋을 상수로 적지 않는 이유: 이 파일 헤더의 치수가 **실제로 틀린 채 오래
  // 있었다**(26.3×24.1 로 적혀 있었고 참값은 17.2×24.6). GLB 를 교체하면 다시 틀린다.
  // 런타임에 `Box3` 로 재면 자산이 바뀌어도 저절로 따라온다.
  const box = new THREE.Box3().setFromObject(model as never);
  const fix = box.min.x === Infinity
    ? { x: 0, y: 0, z: 0 }   // 메시가 없다 — 보정할 것도 없다
    : { x: -(box.min.x + box.max.x) / 2, y: -box.min.y, z: -(box.min.z + box.max.z) / 2 };

  // ── 루프는 `attach-loop.ts` 가 소유한다 (2026-08-16, W8-2 — 백로그 #38 완결) ──
  // 그전에는 여기와 `world2/features/overlay.ts` 에 **같은 모양의 루프가 따로** 있었고,
  // 검수관이 *"`ATTACH_BATCH`·`WARMUP_FRAMES` 공유 상수 승격 검토"* 로 그 자리를 이미
  // 지목했다. 공유하면 얻는 것이 상수 통일보다 크다 — **순수 함수라 프레임 넘김 횟수를
  // 브라우저 없이 셀 수 있다**(`tests/world-shared-attach-loop.test.ts`). 이 파일의 루프는
  // 그전까지 그 축을 재는 수단이 하나도 없었다.
  //
  // `onStep` 은 배치 경계에서 불려야 하므로 `nextFrame` 을 감싸 그 자리에서 낸다 —
  // 공유 루프에 진행 보고 콜백을 더하지 않는다(그 계약은 «붙이고 프레임을 넘긴다» 하나다).
  let placed = 0;
  await attachAll({
    items: cells,
    nextFrame: async () => {
      onStep(placed);
      await nextFrame();
    },
    batch: ATTACH_BATCH,
    place: async (cell, i) => {
      // ── 회전은 **바깥 그룹**이 한다 ───────────────────────────────────────
      // 보정 오프셋은 모델의 로컬 좌표계 값이다. 같은 객체에 회전과 보정을 함께 주면
      // 보정까지 회전해 자리가 어긋난다. 안쪽에서 보정하고 바깥에서 돌리면 순서가
      // 분리된다. 그룹은 드로우콜을 만들지 않으므로 개수 축에는 무해하다.
      const holder = new THREE.Group();
      const copy = model.clone(true);
      copy.position.set(fix.x, fix.y, fix.z);
      holder.add(copy as never);
      holder.position.set(cell.x, 0, cell.z);
      holder.rotation.y = cell.ry;
      root.add(holder as never);
      // ── 월드 행렬을 **명시적으로** 갱신한다 ──────────────────────────────
      // 감독 판정 네 번 동안 미술관이 안 보였고, 다섯 번째에 갑자기 보였다. 그 사이
      // 내가 넣은 것은 **진단 코드뿐**이다 — `Box3().setFromObject(root)`.
      //
      // 그 호출은 부작용으로 자식 전체의 월드 행렬을 강제 갱신한다. 즉 **진단이
      // 우연히 고쳤을 가능성이 높다.** three 는 보통 렌더 직전에 씬 전체를 갱신하지만,
      // 여기서는 부착을 프레임에 걸쳐 나눠 하므로 갱신 시점과 어긋날 수 있다.
      // 행렬이 낡으면 프러스텀 컬링이 **원점 기준**으로 판정해 32m 앞 건물도 화면
      // 밖으로 취급한다 — 삼각형은 잡히는데 화면에는 없던 증상과 정확히 맞는다.
      //
      // 원인을 확정하지는 못했다(헤드리스는 WebGL 이라 이 증상이 재현되지 않는다).
      // 다만 **진단이 부작용으로 고치는 상태를 남겨 둘 수는 없다.** 진단을 빼면
      // 다시 깨지고, 그때는 아무도 이유를 모른다.
      //
      // 갱신은 **씬에 붙은 쪽**(그룹)에서 건다 — 복제본에서 걸면 그룹의 회전·위치가
      // 아직 안 반영된 행렬로 자식만 갱신된다.
      (holder as unknown as Object3D).updateMatrixWorld(true);
      // ── 파셀 좌표 — **역산이고, 그 한계를 실측했다** (검수관 권고 P1) ──────────
      // 정방향은 `placementCells` 가 안다(`x = px × cell`). 여기서 되짚는 것은 역함수라
      // 값 미러링의 사촌이다. 검수관이 «`placementCells` 가 `px·pz` 를 함께 반환하면
      // 역산이 사라진다» 고 권고했고, **해 보니 그것으로 안 끝난다:**
      //
      //   `gridCells` 는 `x = (i − half) × cell`, `half = (side − 1) / 2` 로 자리를 잡는데
      //   **`side` 가 짝수면 `half` 가 반정수**다(`side = ceil(√(n+1)) + 1`). 실측:
      //   **n=4·8 → 1.5 · n=20 → 2.5** / n=1·2·3 → 1 · **n=50 → 4**(정수). 중심에 안 선다.
      //
      // 그러면 `px` 라는 정수 좌표 자체가 성립하지 않고, 아래 `Math.round` 는 그 채를
      // **이웃 파셀로 뭉갠다.** 정방향에 `px` 를 심어도 같은 문제가 그쪽으로 옮겨갈 뿐이다.
      //
      // **기본값(n=1)에서는 정확하다** — 랜드마크 한 채가 `plazaWest`(정수 파셀)에 선다.
      // 어긋나는 것은 `?glb=4` 이상의 실험 세션뿐이다. 격자를 파셀 정렬로 바꾸는 것은
      // 배치 규칙의 설계 변경이라 이번 범위 밖이고, 재론 조건은 백로그 `G-ART7` 이다.
      // ⚠ `visible` 로 좁혀 담는다 — `PlacedCopy` 가 그 필드 **하나만** 요구하는 것이
      // 요점이다. 노드 전체를 들면 토글 함수가 씬 그래프를 만질 수 있게 되고, 그러면
      // 가짜 노드로 시험하는 길도 함께 막힌다.
      out.push({
        // ⚠ `want: true` — world3·world5 는 이 값을 안 바꾸고 「늘 보임」이 사실이다(C2·GS-G2ⓐ).
        want: true,
        node: holder,
        px: Math.round(cell.x / cellSize),
        pz: Math.round(cell.z / cellSize),
      });
      // 한 프레임에 다 붙이면 그 프레임이 통째로 멈춘다 — 감독 실기기에서 **1,072ms**
      // 히칭 1회가 그것이었다. 배치마다 프레임을 넘기면 같은 총량이 여러 프레임에 흩어져
      // 화면이 계속 돈다. 총 시간은 오히려 조금 늘지만 **멈추지 않는다.**
      // (넘기는 것은 `attachAll` 의 몫이다 — 여기서 넘기면 배치가 무의미해진다.)
      placed = i + 1;
    },
  });
  onStep(cells.length);
}

/**
 * **최초 렌더 예열.** 잠시 컬링을 끄고 두 프레임 돌린 뒤 원상복구한다.
 *
 * ── 왜 필요한가 (스모크가 잡았다, 2026-08-02) ───────────────────────────────
 * three 의 `info.memory` 는 객체를 **만들 때가 아니라 처음 렌더되는 프레임에** 오른다.
 * 이 자산은 광장 서쪽(스폰 기준 베어링 ~73°)에 서므로 기본 시선(-z)에서 시야 밖이고,
 * 프러스텀 컬링에 걸려 렌더 목록에 안 오른다. 그래서 **고개를 돌리는 순간** geo +78 ·
 * tex +22 · pipe +6 계단이 난다 — 개수 불변식 게이트는 그것을 "증식" 으로 읽었다.
 *
 * 증식이 아니었다. 실측으로 갈랐다: 기준선 **전에** 카메라를 한 바퀴 돌리면 기준선이
 * 22→100 으로 오르고 그 뒤 증가분은 정확히 0 이다. **지연된 최초 예열**이다.
 *
 * 이 저장소가 날씨에서 이미 겪은 것과 같은 축이고(#114 "날씨 첫 등장 비용을 부팅
 * 예열로 이동"), CLAUDE.md 가 *"만들어 둔 것과 GPU 에 올라간 것은 다른 일이다"* 로
 * 적어 둔 함정이다. 아는 함정을 그대로 밟았다.
 *
 * ── 왜 정식 `prewarm()` 훅이 아닌가 ────────────────────────────────────────
 * 그 훅은 부팅 시퀀스의 한 지점에서 불린다. GLB 는 **비동기 로드**라 그때 씬에 아직
 * 없다 — 훅에 붙이면 아무것도 안 구워진다. 그래서 발상만 같고(*"평소 숨어 있는 것을
 * 잠시 보이게"*) 자리는 로드 완료 지점이다.
 *
 * ── 원복은 `finally` 다 (팀장 조건 2) ───────────────────────────────────────
 * 원복이 빠지면 이 자산이 **영구히 컬링에서 빠져** 안 보일 때도 드로우콜 78 을 낸다.
 * 그리고 **그것을 잡는 지표가 없다**(예산 축 이야기는 파일 헤더 한 곳에) — 개수
 * 불변식은 통과하고(상수니까) 드로우콜 예산 게이트는 존재하지 않는다. 조용히 나빠지는
 * 형태라 예외 경로까지 원복을 보장한다.
 *
 * ── 백그라운드 탭은 위험이 아니다 (검수관 확인 2026-08-02) ──────────────────
 * 처음에 *"탭이 백그라운드로 가면 `nextFrame()` 이 안 깨어나 `finally` 도 안 돌고,
 * 컬링이 꺼진 채 남는다"* 를 열린 위험으로 적었다. **코드로 답이 나 있었다** — 커널의
 * 렌더 루프(`kernel.ts`)도 여기와 **같은 전역 `requestAnimationFrame`** 을 쓴다.
 * 브라우저가 그것을 멈추면 렌더 루프도 함께 멎으므로, 컬링이 꺼져 있는 동안 애초에
 * 드로우콜이 나가지 않는다. 조사해서 닫은 질문이니 "못 잰 것" 으로 남기지 않는다.
 *
 * 원래부터 `frustumCulled === false` 인 것은 건드리지 않는다 — 만졌다가 되돌리면 그
 * 객체의 원래 뜻을 덮어쓴다. (그런 객체는 어차피 첫 프레임부터 렌더되어 기준선에
 * 이미 들어가 있으므로 예열 대상이 아니다.)
 *
 * **못 잰 것**: 헤드리스는 WebGL 이고 감독 실기기는 WebGPU 다. 컬링을 껐다 켜는 것이
 * WebGPU 에서 같은 효과인지 여기서는 확인할 수 없다(팀장 조건 4).
 */
async function warmUp(root: Object3D): Promise<void> {
  // 구현은 `attach-loop.ts` 가 소유한다(2026-08-16, W8-2). 위 문단들이 **왜** 예열하는지의
  // 근거이고 — 광장 서쪽 베어링 ~73°, geo +78·tex +22·pipe +6 계단, `finally` 원복 —
  // 그것들은 이 자산 고유의 실측이라 여기 남는다. 옮긴 것은 **어떻게** 뿐이다.
  //
  // ⚠ `WARMUP_FRAMES = 2` 의 실측 근거도 그 파일로 함께 옮겼다 — 값과 근거가 갈라지면
  // 다음 사람이 값만 보고 고친다.
  await warmUpNode(root as unknown as CullableNode, nextFrame, WARMUP_FRAMES);
}

/** 다음 프레임까지 양보한다. `requestAnimationFrame` 이 없는 환경(테스트)에서도 돈다 */
function nextFrame(): Promise<void> {
  return new Promise((res) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => res());
    else setTimeout(res, 0);
  });
}

/**
 * 세울 자리 목록. **순수 함수라 검사할 수 있다** — 스폰 칸을 비우는 것이 이 실험의
 * 사용 가능 여부를 가르는데(감독 실기기에서 한 번 막혔다), three 없이는 못 재는 곳에
 * 두면 다시 화면으로만 확인하게 된다.
 */
export function gridCells(n: number, cell: number): { x: number; z: number; d: number }[] {
  // 스폰 칸을 빼야 하므로 한 칸 여유를 두고 격자를 잡는다.
  const side = Math.ceil(Math.sqrt(n + 1)) + 1;
  const half = (side - 1) / 2;

  const cells: { x: number; z: number; d: number }[] = [];
  for (let i = 0; i < side; i++) {
    for (let j = 0; j < side; j++) {
      const x = (i - half) * cell;
      const z = (j - half) * cell;
      const d = Math.hypot(x, z);
      if (d < cell * 0.5) continue; // 스폰 칸 — 여기 세우면 플레이어가 벽 속에서 시작한다
      cells.push({ x, z, d });
    }
  }
  // 가까운 순. 같은 거리면 좌표순으로 갈라 **결정론**을 지킨다 — 정렬이 흔들리면 같은
  // URL 이 매번 다른 세상을 만들고, 그러면 조건 간 비교가 성립하지 않는다.
  cells.sort((a, b) => a.d - b.d || a.x - b.x || a.z - b.z);
  return cells.slice(0, n);
}

/** 세울 자리 하나 — 격자 좌표에 **방향**이 붙는다. 랜드마크만 정면을 갖는다 */
export interface Placement { x: number; z: number; ry: number }

/**
 * 실제로 세우는 자리 목록. **첫 채는 언제나 랜드마크**이고 나머지는 부하 실험 격자다.
 *
 * ── 왜 둘을 한 함수에 두는가 ────────────────────────────────────────────────
 * 기본(1채)과 실험(N채)이 같은 노브(`?glb=`)를 쓰기 때문이다. "1이면 랜드마크, 2 이상이면
 * 격자" 로 가르면 채수를 하나 올리는 순간 랜드마크가 **사라진다** — 실험하려고 2를 넣었는데
 * 라이브에서 보던 것이 없어지는 것은 축을 두 개 흔드는 일이다. 첫 채를 고정하면 실험은
 * "랜드마크 + 추가 N−1채" 가 되어 비교가 성립한다.
 *
 * 격자 자리 중 랜드마크와 같은 칸은 뺀다. 안 빼면 두 채가 같은 자리에 겹쳐 서고, 그러면
 * 드로우콜은 두 채인데 화면에는 한 채로 보여 **측정과 눈이 어긋난다.**
 */
export function placementCells(
  n: number,
  cell: number,
  /** 광장 서쪽 칸. **기본값을 주지 않는다** — 세계마다 다를 수 있고, 기본값을 두면
   *  안 넘긴 호출부가 조용히 틀린 자리에 랜드마크를 세운다(fail-closed). */
  plazaWest: { readonly px: number; readonly pz: number },
): Placement[] {
  if (n <= 0) return [];
  const lm = { x: plazaWest.px * cell, z: plazaWest.pz * cell, ry: LANDMARK_RY };
  if (n === 1) return [lm];
  // `gridCells(n)` 이 n 개를 주므로, 랜드마크 칸이 그 안에 있어 하나 빠져도 n−1 개가 남는다.
  const rest = gridCells(n, cell)
    .filter((c) => !(c.x === lm.x && c.z === lm.z))
    .slice(0, n - 1)
    .map((c) => ({ x: c.x, z: c.z, ry: 0 }));
  return [lm, ...rest];
}
