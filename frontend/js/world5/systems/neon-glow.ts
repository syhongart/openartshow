// 네온 발광의 **집행**. 판정은 `decide/night.ts` 의 `neonGlow` 가, 목록은
// `parts/index.ts` 의 `NEON_PARTS` 가 한다.
//
// ── 왜 별도 파일인가 ────────────────────────────────────────────────────────
// `systems/ground-lift.ts` 와 같은 이유다. 배선을 `features/sky.ts` 안 클로저로 두면
// 테스트가 그 로직을 **다시 적어야** 하고, 그것이 곧 값 미러링이다.
//
// **그 파일이 스스로 그렇게 경고하고 있었다**: *"위 `applyLampGlow` 는 클로저 안이라
// 테스트가 같은 식을 옆에 다시 쓰고 있고, 배선이 사라져도 그 테스트는 초록이다."*
// 감독 지시(*"밤에 건물 네온"*)로 발광 대상이 넷으로 늘어나는 마당에 검출력 0 인
// 구조를 하나 더 만들 이유가 없다 — 여기로 빼면 테스트가 **실제로 돌아가는 코드**를
// 부른다.
//
// ── 무엇을 고쳤나 (2026-08-08) ──────────────────────────────────────────────
// 포크 직후 배선은 `materialOf('lamp')` **한 종류만** 만졌다. 그래서 마천루·광고 타워·
// 다리에 `emissive` 를 넣어도 **낮에도 밤에도 영원히 꺼진 채** 남았다 — 디자이너가
// 발견하고 세 파츠를 상시 점등(`1`)으로 두면서 *"미봉이지 완성이 아니다"* 라고
// 보고했다. 정확한 진단이고, 이 파일이 그 미봉을 걷어낸다.
//
// ── 왜 three 타입을 안 쓰는가 ───────────────────────────────────────────────
// 필요한 모양은 `emissiveIntensity` 하나뿐이다. 구조적 타입으로 두면 테스트가 가벼운
// 스텁으로 실제 코드를 돌릴 수 있고, `three` 와 `three/webgpu` 의 타입 네임스페이스
// 차이도 비껴간다(`ground-lift.ts`·`night-lights.ts` 가 같은 이유로 그렇게 한다).

import { NEON_PARTS } from '../parts/index.js';
import { neonGlow, nightness } from '../decide/night.js';

/** 자체발광 세기를 가진 재질. `MeshStandardMaterial` 이 이 모양이다 */
export interface GlowMaterial { emissiveIntensity?: number }

/** 풀에서 재질을 꺼낼 수 있는 것. `InstancePools` 가 이 모양이다 */
export interface MaterialSource { materialOf(key: string): unknown }

interface Target {
  kind: string;
  mat: GlowMaterial;
  day: number;
  night: number;
}

/**
 * 시간대에 따라 발광 파츠의 `emissiveIntensity` 를 정한다.
 *
 * ── 왜 색이 아니라 세기만 만지는가 ──────────────────────────────────────────
 * `emissive` **색**을 매 프레임 바꾸지 않는다. 색은 그대로 두고 스칼라 하나만 흔들면
 * 만질 것이 최소가 되고, 낮에 정확히 `day` 값으로 떨어진다. 그리고 맵의 유무·색 같은
 * **구조 신호**를 건드리면 그 순간 전량 재컴파일이다(`lamp.ts` 주석).
 *
 * ── 멱등이다 ────────────────────────────────────────────────────────────────
 * 매 프레임 곱하는 것이 아니라 시간대에서 **매번 다시 계산**한다. `apply` 를 몇 번
 * 부르든 결과가 같다 — 밤 조명 하한이 `max` 를 고른 것과 같은 성질이고, 이 성질이
 * 없으면 "언제 적용되는가" 를 정확히 알아야 하는데 그 지식은 언젠가 어긋난다.
 */
export class NeonGlow {
  private targets: Target[] = [];
  /**
   * 신고는 했는데 풀에 없었거나 재질을 못 꺼낸 파츠.
   *
   * **조용히 넘어가면 기능이 죽은 줄 모른다** — 그리고 이 기능은 죽어도 화면이
   * "그냥 좀 어두운" 것으로만 보인다. 정확히 그 형태로 포크 직후에 셋이 꺼져 있었다.
   */
  readonly missing: string[] = [];
  private lastN = -1;
  /** 진단용 — 마지막으로 건 값. 화면에서는 "좀 밝네" 로만 보이는 것을 숫자로 남긴다 */
  private applied = new Map<string, number>();

  constructor(src: MaterialSource) {
    for (const spec of NEON_PARTS) {
      const mat = src.materialOf(spec.kind) as GlowMaterial | null;
      // `emissiveIntensity` 가 없는 재질이면 발광 신고가 거짓이다. 값을 새로 만들어
      // 붙이지 않는다 — 그러면 맵도 없는 재질이 통째로 빛나고, 그것은 조용히 틀린
      // 화면이다(`PartSpec.neon` 주석의 ⚠ 참고).
      if (!mat || typeof mat.emissiveIntensity !== 'number') {
        this.missing.push(spec.kind);
        continue;
      }
      this.targets.push({ kind: spec.kind, mat, day: spec.day, night: spec.night });
    }
  }

  /**
   * 시간대를 반영한다. 값이 안 바뀌었으면 아무것도 만지지 않는다 — 매 프레임 같은
   * 수를 대입해도 three 는 조용히 넘어가지만, 만지지 않는 것이 언제나 싸다.
   */
  apply(time: string): void {
    const n = nightness(time);
    if (n === this.lastN) return;
    this.lastN = n;
    for (const t of this.targets) {
      const g = neonGlow({ day: t.day, night: t.night }, n);
      t.mat.emissiveIntensity = g;
      this.applied.set(t.kind, g);
    }
  }

  /** 지금 걸린 세기. 진단 패널과 테스트가 읽는다 */
  intensityOf(kind: string): number | undefined { return this.applied.get(kind); }

  /** 실제로 배선된 파츠 수. 0 이면 이 시스템은 아무것도 안 하고 있다 */
  get wired(): number { return this.targets.length; }
}
