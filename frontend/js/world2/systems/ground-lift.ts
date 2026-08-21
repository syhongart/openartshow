// 지면 알베도 배수의 **집행**. 판정은 `decide/ground-albedo.ts` 가 한다.
//
// ── 왜 별도 파일인가 ────────────────────────────────────────────────────────
// `systems/night-lights.ts` 와 같은 이유다. 배선을 `features/sky.ts` 안 클로저로 두면
// 테스트가 그 로직을 **다시 적어야** 하고, 그것이 곧 값 미러링이다. 여기로 빼면 테스트가
// **실제로 돌아가는 코드**를 부른다.
//
// ⚠ 이 자리는 오래 *"**실제로 가로등 배선이 그 상태다**"* 라고 **현재형**으로 적고 있었고,
// 2026-08-21 에 그 가로등이 `systems/lamp-glow.ts` 로 나가면서 사실이 아니게 됐다. 그런데
// **그 커밋이 이 문장을 「이 자리를 지목하고 있었다」는 근거로 인용해 놓고 갱신하지
// 않았다**(검수관 C3). 근거로 쓴 문장을 그대로 두면 다음 사람은 가로등이 아직 클로저 안에
// 있다고 읽는다 — 이 저장소가 `main` unprotected 오기로 7일을 잃은 그 형태다.
//
// ── 왜 three 타입을 안 쓰는가 ───────────────────────────────────────────────
// 필요한 모양은 `color.r/g/b` 뿐이다. 구조적 타입으로 두면 테스트가 가벼운 스텁으로
// 실제 코드를 돌릴 수 있고, `three` 와 `three/webgpu` 의 타입 네임스페이스 차이도
// 비껴간다(`night-lights.ts` 가 같은 이유로 그렇게 한다).

import { GROUND_KEYS, NIGHT_GROUND_LIFT, groundLift } from '../decide/ground-albedo.js';
import { nightness } from '../decide/night.js';

/** 채널을 직접 만질 수 있는 색. `THREE.Color` 가 이 모양이다 */
export interface MutableColor { r: number; g: number; b: number }

/** 색을 가진 재질. `MeshStandardMaterial` 이 이 모양이다 */
export interface LiftableMaterial { color?: MutableColor | null }

/** 풀에서 재질을 꺼낼 수 있는 것. `InstancePools` 가 이 모양이다 */
export interface MaterialSource { materialOf(key: string): unknown }

interface Target {
  key: string;
  color: MutableColor;
  /** 부팅 시점의 재질 색. 배수는 **여기에** 곱한다 */
  base: readonly [number, number, number];
}

/**
 * 시간대에 따라 지면 파츠의 `material.color` 에 **같은 배수**를 건다.
 *
 * 배수가 하나이므로 파츠 사이의 비가 산술적으로 보존된다 — 밤에 달라지는 것은 밝기뿐이고
 * 대비는 낮과 동일하다. 그것이 이 클래스가 존재하는 방식이다(파츠별로 다른 배수를 걸어
 * 대비를 좁힌 첫 판본은 감독 판정으로 철회됐다 — `decide/ground-albedo.ts` 머리 참조).
 *
 * ── 왜 곱셈인데도 발산하지 않는가 ───────────────────────────────────────────
 * 매 프레임 곱하는 것이 아니라 **부팅 시점의 색에서 매번 다시 계산**한다. 그래서
 * `apply` 를 몇 번 부르든 결과가 같다(멱등). 밤 조명 하한이 `max` 를 고른 것과 같은
 * 성질이고, 이 성질이 없으면 "언제 적용되는가" 를 정확히 알아야 하는데 그 지식은
 * 언젠가 어긋난다.
 *
 * 기준을 `1` 로 가정하지 않는 것이 중요하다. 지금은 지면 재질들이 `color` 를 명시하지
 * 않아 흰색이지만, 다음 사람이 재질에 색을 주면 그 색이 조용히 지워질 자리다.
 */
export class GroundLift {
  private targets: Target[] = [];
  /** 풀에 없었거나 `color` 가 없던 파츠. 조용히 넘어가면 기능이 죽은 줄 모른다 */
  readonly missing: string[] = [];
  private lastN = -1;
  private applied: number | null = null;

  constructor(src: MaterialSource, private readonly lift = NIGHT_GROUND_LIFT) {
    for (const key of GROUND_KEYS) {
      const mat = src.materialOf(key) as LiftableMaterial | null;
      const c = mat?.color;
      if (!c) { this.missing.push(key); continue; }
      this.targets.push({ key, color: c, base: [c.r, c.g, c.b] });
    }
  }

  /**
   * 시간대를 반영한다. 값이 안 바뀌었으면 아무것도 만지지 않는다 — 매 프레임 같은 수를
   * 대입해도 three 는 조용히 넘어가지만, 만지지 않는 것이 언제나 싸다.
   */
  apply(time: string): void {
    const n = nightness(time);
    if (n === this.lastN) return;
    this.lastN = n;
    const s = groundLift(n, this.lift);
    this.applied = s;
    for (const { color, base } of this.targets) {
      color.r = base[0] * s;
      color.g = base[1] * s;
      color.b = base[2] * s;
    }
  }

  /** 진단용 — 지금 걸린 배수. 화면에서는 "좀 밝네" 로만 보이는 것을 숫자로 남긴다 */
  get scale(): number | null { return this.applied; }
}
