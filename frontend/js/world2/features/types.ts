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
  /** 월드 셀 크기(미터) */
  readonly cell: number;
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
 */
export function combineDrawGroupKey(mounted: readonly MountedFeature[]): string | null {
  const parts: string[] = [];
  for (const m of mounted) {
    if (!m.instance.drawGroupKey) continue;
    const k = m.instance.drawGroupKey();
    if (k === null) return null;
    parts.push(`${m.name}=${k}`);
  }
  parts.sort();
  return parts.join(' ');
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

// ── 결선 뮤테이션(#127) — 의도적 타입 에러. 다음 커밋에서 되돌린다. ──────────
// 게이트는 통과하는 것을 봐서는 게이트인지 알 수 없다. 막히는 것을 봐야 안다.
export const __GATE_MUTATION__: number = '이 줄이 verify 를 떨어뜨려야 한다';
