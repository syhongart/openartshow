// 가로등 점등의 **집행**. 판정은 `decide/night.ts` 의 `lampGlow` 가 한다.
//
// ── 왜 이 파일이 생겼나 (검수관 반려 B3′, 2026-08-21) ───────────────────────
// 이 배선은 `features/sky.ts` 의 클로저(`applyLampGlow`) 안에 있었다. 그래서 테스트가
// 같은 식을 **옆에 다시 쓰고 있었고**, 뮤테이션으로 확인됐다: 복합씬 점등을 끄는 변경
// (`lampGlow(nightness(env.time(), 0))`)을 넣어도 **전체 스위트 추가 실패 0** 이었다.
//
// 더 나쁜 것은 **그 사실이 이미 적혀 있었다**는 점이다 — `systems/ground-lift.ts` 머리말이
// *"실제로 가로등 배선이 그 상태다 … 배선이 사라져도 그 테스트는 초록이다"* 라고 지목하고
// 있었고, 새 노브(`?lit=`)가 정확히 그 자리에 들어갔다. **알려진 사각에 새 기능을 얹으면
// 그 기능은 처음부터 검사받지 않는다.**
//
// 그래서 `GroundLift` 와 같은 형태로 뺀다. 여기로 나오면 테스트가 **실제로 돌아가는
// 코드**를 부른다.
//
// ── 왜 three 타입을 안 쓰는가 ───────────────────────────────────────────────
// 필요한 모양은 `emissiveIntensity` 하나다. 구조적 타입이면 테스트가 가벼운 스텁으로
// 실제 코드를 돌릴 수 있고 `three` / `three/webgpu` 의 타입 네임스페이스 차이도 비껴간다
// (`night-lights.ts`·`ground-lift.ts` 가 같은 이유로 그렇게 한다).

import { lampGlow, nightness } from '../decide/night.js';

/** 발광 세기를 가진 재질. `MeshStandardMaterial` 이 이 모양이다 */
export interface GlowMaterial { emissiveIntensity?: number }

/** 풀에서 재질을 꺼낼 수 있는 것. `InstancePools` 가 이 모양이다 */
export interface MaterialSource { materialOf(key: string): unknown }

/** 가로등 재질의 풀 키 */
export const LAMP_KEY = 'lamp';

/**
 * 시간대에 따라 가로등 `emissiveIntensity` 를 맞춘다.
 *
 * **만지는 것은 그 값 하나뿐이다.** uniform 이라 파이프라인 캐시키에 안 들어가므로 매
 * 프레임 바꿔도 재컴파일이 없다 — `emissive` 색이나 `map` 유무 같은 구조 신호를 건드리면
 * 그 순간 전량 재컴파일이 된다.
 *
 * ⚠ **시간대는 접기 전 원값을 받는다.** 점등은 「밝기를 따라가는 축」이 아니라 **이 씬의
 * 정체**다(감독 2026-08-21 *"주간인데. 불이 켜져있고"*) — `decide/night.ts` 의
 * `paletteTime` 주석이 접는 축과 안 접는 축을 가른다.
 */
export class LampGlow {
  private readonly mat: GlowMaterial | null;
  /** 마지막으로 쓴 값. 같은 수를 다시 대입하지 않으려는 것 */
  private last = -1;
  /** 재질을 못 찾았는가. 조용히 넘어가면 기능이 죽은 줄 모른다 */
  readonly missing: boolean;

  /** @param lit 복합씬 점등 세기(`?lit=`). 배선이 읽어 넘긴다 — 판정은 URL 을 모른다 */
  constructor(pools: MaterialSource, private readonly lit: number) {
    const m = pools.materialOf(LAMP_KEY) as GlowMaterial | null;
    this.mat = m && typeof m === 'object' ? m : null;
    this.missing = !this.mat;
  }

  /** 지금 걸려 있는 발광 세기. 안 걸렸으면 `-1` */
  get glow(): number { return this.last; }

  apply(time: string): void {
    if (!this.mat) return;
    const g = lampGlow(nightness(time, this.lit));
    if (g === this.last) return;
    this.last = g;
    this.mat.emissiveIntensity = g;
  }
}
