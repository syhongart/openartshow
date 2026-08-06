// world2/features/types.ts — 기능 플러그인 계약.
//
// ── 왜 만드는가 ──────────────────────────────────────────────────────────────
// 감독 지적: *"메타버스 안에 이것도 들어갈 수 있고 저것도 들어갈 수 있는데, 자꾸 한 파일
// 안에 다 넣지 마. 날씨 파일이나 캐릭터 파일은 별도로 만들어서 넣었다 뺐다 할 수 있어야지."*
//
// 커널은 이미 플러그인이었다 — `kernel.add(sys)`로 등록하고 `update(ctx)`만 부른다.
// 문제는 **조립**이었다. `main.ts`가 하늘을 켜려면 다섯 군데를 건드려야 했다:
//
//   ① `pools` 부팅 단계에서 `new SkySystem(...)`  ② `kernel.add(sky!)` (느낌표가 증거다)
//   ③ HUD의 드로우콜 판정 그룹 키                  ④ 진단 훅의 `sky.get()`
//   ⑤ 神 모드 패널 배선
//
// 그래서 하늘을 빼는 것이 "선언 한 줄 지우기"가 아니라 "main.ts 수술"이었다. 바다·NPC·
// 멀티플레이어를 그대로 얹으면 이 하드코딩이 넷으로 늘어난다.
//
// ── 규약: 기능을 빼면 그 기능에 관한 모든 것이 함께 빠진다 ───────────────────
// 각 기능이 **자기에 관한 모든 것을 스스로 들고 있다.** System·진단·HUD 판정 키·정리까지.
// `features/index.ts`의 목록에서 한 줄을 지우면 그 기능의 흔적이 전부 사라진다.
//
// ── 코어와 기능의 경계 ───────────────────────────────────────────────────────
// `player`·`streaming`·`adapt`는 **코어**다. 없으면 월드가 아니다(걸을 수 없거나, 아무것도
// 안 뜨거나, 저사양에서 죽는다). 기능은 "있으면 좋고 없어도 월드인 것"이다 — 하늘·바다·
// NPC·멀티플레이어. 이 경계가 흐려지면 레지스트리는 그냥 다른 모양의 하드코딩이 된다.

// 개별 named type import를 쓴다 — `import type * as THREE from 'three/webgpu'`로 하면
// 내부 네임스페이스 재수출에 걸려 타입이 안 잡힌다(TS2694).
import type { Scene, DirectionalLight, HemisphereLight, Camera } from 'three/webgpu';
import type { SkyTime } from '../decide/night.js';
import type { System } from '../kernel.js';
import type { RendererAdapter } from '../adapters/renderer.js';
import type { InstancePools } from '../systems/instancing.js';
import type { PlayerSystem } from '../systems/player.js';

/**
 * 기능이 조립 시점에 받을 수 있는 것들. **읽기 전용으로 다룬다** — 기능이 이걸 통해 서로의
 * 상태를 만지기 시작하면 커널의 "System은 상태를 공유하지 않는다" 규약이 뒷문으로 깨진다.
 */
export interface FeatureEnv {
  readonly scene: Scene;
  readonly adapter: RendererAdapter;
  readonly player: PlayerSystem;
  /** 슬롯 풀. 이미 `seal()`된 상태다 — 기능이 새 풀을 만들 수 없다(개수 불변식) */
  readonly pools: InstancePools;
  /** 씬 조명. 개수가 고정이라 커널이 소유하고, 기능은 색·강도만 빌려 쓴다 */
  readonly sun: DirectionalLight;
  readonly hemi: HemisphereLight;
  /**
   * 광원을 타깃에서 물릴 거리(m). 조립부가 `decide/shadow.ts` 로 그림자 프러스텀과
   * **함께** 유도한 값이다 — 하늘이 이 값으로 태양을 배치해야 프러스텀과 짝이 맞는다.
   */
  readonly shadowDist: number;
  /** 월드 셀 크기(미터) */
  readonly cell: number;

  /**
   * 지금 몇 시인가. **조립부가 소유하는 월드 상태다.**
   *
   * ── 왜 계약에 있는가 (감독 발견 2026-07-30 · 팀장 판정 A-2) ────────────────
   * 시간대를 아는 기능이 둘 이상이다 — 하늘(팔레트·가로등)과 후보정(블룸 세기). 그런데
   * 계약에 없었으므로 후보정은 **반구광 세기를 관측해 낮/밤을 추측**했다:
   *
   *   env.hemi.intensity < 0.95 ? 'night' : 'day'
   *
   * 그 문턱의 근거는 "밤 반구광 하한이 0.85" 였는데, 밤을 밝히는 커밋이 그 하한을
   * **1.2** 로 올리면서 밤이 낮으로 읽혔다. 블룸 세기 = `기본값 × nightness('day')` = 0.
   * 감독 화면에서 가로등 번짐이 사라졌고, `?bloom=0` 과 구별조차 되지 않았다.
   *
   * 값이 틀린 것이 아니라 **재는 축이 무효가 됐다** — 밤 하한(1.2)이 낮 값(1.0)보다
   * 커진 뒤로는 어떤 문턱을 골라도 반구광으로 시간대를 가릴 수 없다. 그래서 추측을
   * 없애고 상태를 공식으로 연다.
   *
   * 함수인 것은 **세션 중 변하기 때문**이다(神 모드 패널·URL). 값으로 받으면 조립 시점의
   * 시간대가 영원히 굳는다.
   *
   * 열거형 그대로 여는 것도 의도다 — `isNight` 같은 파생 boolean 으로 좁히면 노을이
   * 사라지고, 그 정보를 각 소비자가 다시 만들면서 `nightness` 와 미러링이 생긴다.
   */
  readonly time: () => SkyTime;

  /**
   * 시간대를 바꾼다. **부르는 자리는 둘뿐이다**(팀장 조건 4):
   *
   *   ① 조립부 초기화 — `?time=` 을 읽어 넣는다
   *   ② `features/sky.ts` — 神 모드 패널이 시간대를 고를 때
   *
   * 세 번째 경로가 열리면 소유가 다시 갈린다. 그래서 패널에는 하늘 엔진의 컨트롤을
   * 그대로 주지 않고 **이 setter 를 거치는 것만** 준다.
   */
  readonly setTime: (t: SkyTime) => void;
  /** UI를 붙일 문서. 없는 환경(테스트)에서는 null */
  readonly doc: Document | null;
  /**
   * 씬을 보는 눈.
   *
   * 오래 비워 두고 *"시선 방향이 필요한 기능이 생기면 그때 넣는다"* 고 적어 두었는데,
   * **후보정이 그때가 됐다** — `pass(scene, camera)` 로 씬을 렌더타깃에 받아야 하므로
   * 카메라 없이는 성립하지 않는다.
   *
   * 씬을 훑어 찾는 방법도 있지만 카메라는 씬의 자식이 아닌 것이 보통이라 실패한다.
   * 계약으로 받는 것이 정직하다.
   *
   * 타입이 `PerspectiveCamera` 가 아니라 `Camera` 인 것은 `three/webgpu` 가 전자를
   * 재수출하지 않아서다(TS2694). 기능이 원근 전용 필드를 만질 일도 없다.
   */
  readonly camera: Camera;
}

/** 조립된 기능 하나. 필요한 것만 제공하면 된다 — 전부 선택이다. */
export interface FeatureInstance {
  /** 커널 파이프라인에 등록할 System. 없으면 등록하지 않는다(UI만 있는 기능 등) */
  readonly system?: System;

  /**
   * 진단 스냅샷. `window.__world2`에 `{ [기능이름]: 여기 반환값 }`으로 합쳐진다.
   * 기능을 빼면 진단에서도 저절로 사라진다 — main.ts에 기능별 분기가 없다.
   */
  diagnostics?(): unknown;

  /**
   * 드로우콜 판정의 그룹 키 조각.
   *
   * 드로우콜은 가시성에 따라 정당하게 변한다(하늘 날씨, 훗날 바다 상태 등). 그래서 성능
   * 리포트는 "같은 상태 안에서 상수"로 판정하는데, 그 **상태가 무엇인지는 기능이 안다.**
   *
   * `null`을 돌려주면 **그 표본을 판정에서 뺀다.** 지금 그리는 것이 논리 상태와 어긋나는
   * 중이라는 뜻이다(예: 하늘 크로스페이드). 뺀 개수는 리포트에 적힌다.
   */
  drawGroupKey?(): string | null;

  /**
   * `drawGroupKey()` 가 `null` 을 낼 때, **이 기능을 빼고 다시 재는 URL 질의 조각.**
   * 예: `'npc=0&vrm=0'`(`?` 는 붙이지 않는다 — 여러 기능 것을 `&` 로 잇는다).
   *
   * ── 왜 리포트가 아니라 여기가 소유하는가 ────────────────────────────────
   * 처음엔 리포트 쪽에 `기능이름 → 노브` 매핑을 뒀는데, 그 자리에서 `npc` 를 `npc=0`
   * 하나로 적었다. **틀린 안내였다** — `npc` 기능은 치비(`?npc=`)와 VRM(`?vrm=`) 두
   * 노브를 읽고 **둘 다 0 일 때만** 꺼진다(`npc.ts` 의 `create`). 감독이 그대로 따라
   * 재면 사람이 남은 채로 또 "측정 안 됨" 이 나온다.
   *
   * 노브를 아는 것은 기능 자신뿐이고, 노브가 바뀌면 이 줄도 같은 파일 안에서 함께
   * 바뀐다. 리포트가 들면 한쪽만 낡는다(값 미러링).
   */
  readonly drawBlockHint?: string;

  /**
   * 부팅 예열에 참여한다 — **평소 숨어 있는 것을 잠시 보이게** 만든다.
   *
   * 예열 프레임은 "지금 씬에 그려지는 것"만 굽는다. 그래서 조건부로만 등장하는 것
   * (날씨 레이어처럼)은 예열을 통과해도 여전히 안 구워진 채 남고, 세션 중 처음 켜지는
   * 순간에 지오·텍스처·파이프라인이 한꺼번에 생긴다. 그게 곧 히칭이다.
   *
   * 무엇이 숨어 있는지는 **기능 자신만 안다.** 조립부가 세면 레이어를 하나 추가할 때마다
   * 조용히 빠진다. 그래서 이 계약이 여기 있다.
   *
   * 반환한 함수가 원상복구다. 되돌릴 것이 없으면 아무것도 반환하지 않아도 된다.
   */
  prewarm?(): (() => void) | void;

  /** 페이지를 떠날 때. 커널 System의 `dispose`와 별개로 UI·리스너를 정리한다 */
  dispose?(): void;
}

/**
 * 기능 선언. `features/index.ts`의 목록에 넣는 것이 곧 "켜는 것"이다.
 *
 * `create`가 `null`을 돌려주면 이번 세션에는 켜지 않는다 — 기능 자신이 판단한다(필요한
 * DOM이 없다, 백엔드가 꺼져 있다, 저사양이다 등). 조립부가 기능별 조건을 알 필요가 없다.
 */
export interface Feature {
  readonly name: string;
  create(env: FeatureEnv): FeatureInstance | null;
}

/** 조립 결과 — 이름을 함께 들고 다닌다(진단 키·오류 보고에 쓴다) */
export interface MountedFeature {
  readonly name: string;
  readonly instance: FeatureInstance;
}

/**
 * 선언 목록을 실제 인스턴스로 조립한다. **순수하지 않다**(기능이 씬을 만진다) — 다만
 * 이 함수 자체에 기능별 분기가 없다는 것이 요점이다.
 *
 * 한 기능이 조립에 실패해도 나머지는 켠다. 하늘이 죽었다고 월드 전체가 안 뜨는 건
 * 과잉이다 — 실패는 `onError`로 보고하고 그 기능만 빠진다.
 */
export function mountFeatures(
  features: readonly Feature[],
  env: FeatureEnv,
  onError?: (name: string, err: unknown) => void,
): MountedFeature[] {
  const out: MountedFeature[] = [];
  for (const f of features) {
    try {
      const instance = f.create(env);
      if (instance) out.push({ name: f.name, instance });
    } catch (err) {
      onError?.(f.name, err);
    }
  }
  return out;
}

/**
 * 켜진 기능들의 드로우콜 그룹 키를 하나로 합친다.
 *
 * 규칙 둘:
 *   · **하나라도 `null`이면 전체가 `null`이다.** 어느 기능이든 "지금 그리는 것이 논리
 *     상태와 어긋난다"고 하면 그 프레임 표본은 못 믿는다.
 *   · 나머지는 `이름=키`를 이름순으로 이어붙인다. 순서를 고정해야 같은 상태가 같은 키를
 *     낸다 — 목록 순서에 의존하면 기능을 재배치하는 것만으로 그룹이 갈라진다.
 *
 * 아무도 키를 제공하지 않으면 `''`(빈 문자열)이다. 그래도 유효한 그룹이라 판정은 돈다.
 *
 * ── ⚠ 누가 막았는지 **이름을 돌려준다** (감독 실기기 2026-08-06) ─────────────
 * 감독 리포트에 `draw - 측정 안 됨(표본 0) — 전 프레임 판정 유예(5019표본 제외)` 가
 * 두 번 찍혔다(#176, 그리고 오늘 또). 표본 5,019개를 다 뽑아 놓고 전부 버린 것이다.
 *
 * **그때 진단이 틀렸다.** 태스크 #176 은 원인을 *"하늘 상태 전이가 안 끝난다"* 로 적었는데
 * 실제로는 `npc`·`glb-city` 가 **조건 없이** `null` 을 낸다(각 파일의 `drawGroupKey: () => null`).
 * 둘 다 기본 켜짐이라 **기본 구성에서는 이 축이 영원히 판정되지 않는다.**
 *
 * 두 기능의 근거 자체는 맞다 — NPC 가 있으면 카메라를 돌리는 것만으로 컬링이 달라져
 * 드로우콜은 **정의상** 상수가 아니다. 틀린 것은 근거가 아니라 **리포트가 그 사실을
 * 말하지 않은 것**이다. "유예됐다" 만 적으면 읽는 사람은 *"곧 재지겠지"* 로 읽고,
 * 실제로는 영원히 안 재진다.
 *
 * 그래서 이름을 돌려준다. 리포트가 `npc·glb-city 가 판정 불가로 표시` 라고 적으면
 * 읽는 즉시 **끄고 다시 재면 된다**는 것을 안다.
 */
export interface DrawBlocker {
  /** 막은 기능 이름 */
  readonly name: string;
  /** 그 기능을 빼는 URL 질의 조각(`?` 없이). 기능이 안 알려주면 없다 */
  readonly hint?: string;
}

export interface DrawGroupKeyResult {
  /** 합쳐진 키. `null` 이면 이 프레임 표본은 판정에서 뺀다. */
  readonly key: string | null;
  /** `null` 을 낸 기능들. 비어 있으면 정상 판정이다. 이름순 정렬. */
  readonly blockedBy: readonly DrawBlocker[];
}

/** 이름까지 필요한 소비자용. 기존 `combineDrawGroupKey` 는 이것의 `key` 만 쓴다. */
export function drawGroupKeyOf(mounted: readonly MountedFeature[]): DrawGroupKeyResult {
  const parts: string[] = [];
  const blockedBy: DrawBlocker[] = [];
  for (const m of mounted) {
    if (!m.instance.drawGroupKey) continue;
    const k = m.instance.drawGroupKey();
    // ⚠ `null` 을 만나도 **즉시 return 하지 않는다.** 먼저 만난 하나만 보고하면
    //   그것을 끈 뒤에야 다음 원인을 알게 되어 감독이 두 번 재야 한다.
    if (k === null) {
      blockedBy.push(m.instance.drawBlockHint
        ? { name: m.name, hint: m.instance.drawBlockHint }
        : { name: m.name });
      continue;
    }
    parts.push(`${m.name}=${k}`);
  }
  parts.sort();
  blockedBy.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { key: blockedBy.length > 0 ? null : parts.join(' '), blockedBy };
}

export function combineDrawGroupKey(mounted: readonly MountedFeature[]): string | null {
  return drawGroupKeyOf(mounted).key;
}

/**
 * 켜진 기능들을 **한꺼번에 예열 자세로** 만든다. 반환 함수가 전체 원상복구다.
 *
 * 여기에도 기능별 분기가 없다 — 무엇을 켤지는 각 기능이 안다. 기능을 목록에서 빼면
 * 예열에서도 저절로 빠진다.
 *
 * 한 기능의 예열이 실패해도 나머지는 켠다. 예열은 최적화이지 정합성이 아니다 — 실패하면
 * 그 기능만 첫 등장 비용을 세션 중에 내고, 부팅은 계속된다. 복구도 같은 이유로 개별
 * 보호한다. 하나가 던져서 나머지가 켜진 채 남으면 **날씨 레이어가 전부 보이는 하늘**이
 * 되는데, 그건 예열을 안 한 것보다 나쁘다.
 */
export function prewarmFeatures(mounted: readonly MountedFeature[]): () => void {
  const undos: (() => void)[] = [];
  for (const m of mounted) {
    if (!m.instance.prewarm) continue;
    try {
      const undo = m.instance.prewarm();
      if (typeof undo === 'function') undos.push(undo);
    } catch { /* 이 기능만 예열에서 빠진다 */ }
  }
  return () => { for (const u of undos) { try { u(); } catch { /* 나머지는 되돌린다 */ } } };
}

/** 켜진 기능들의 진단을 `{ 이름: 값 }`으로 모은다. 진단을 안 내는 기능은 빠진다. */
export function collectDiagnostics(mounted: readonly MountedFeature[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const m of mounted) {
    if (!m.instance.diagnostics) continue;
    try { out[m.name] = m.instance.diagnostics(); } catch { out[m.name] = '(진단 실패)'; }
  }
  return out;
}
