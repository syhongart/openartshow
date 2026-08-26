// world8/systems/glb-collider.ts — **`Collider` 계약을 GLB 레이캐스트로 구현한다.**
//
// ── 왜 world2 의 `collision.ts` 를 그대로 못 쓰나 ────────────────────────────
// 저쪽은 **파츠별 원형 footprint** 를 배치 목록(`frozenAt` 체인)에서 읽는다 — 「어디에
// 무엇이 서 있는가」가 절차적 배치에서 나온다. GLB 에는 그 목록이 **없다.**
//
// 그래서 여기서 갈린다. 다만 **갈리는 것은 구현뿐이고 계약은 같다** — `Collider`
// 인터페이스(`resolve`·`count`·`invalidate`)를 그대로 만족시키므로 조립부(`main.ts`)의
// 배선은 한 줄만 바뀌고, 플레이어·입력·조이스틱은 이 파일의 존재를 모른다.
// 그것이 포크에서 「세계 소스 한 축」을 지키는 방식이다.
//
// ⚠ **이 파일은 「세계 소스」 축이다** — 파셀 footprint 전제를 GLB 로 바꾸는 자리이고,
// 팀장 조건 2 가 명시적으로 연 세 자리 중 하나다. 나머지(그림자·치비·하늘·조이스틱·
// 입력)를 고치고 싶어지면 그것은 재에스컬레이션 트리거다.
//
// ⚠⚠ **못 하는 것**: 삼각형 단위 정밀 판정이 아니라 광선 하나다 — 아주 얇은 기둥
// 사이는 지나갈 수 있다. 근처 목록이 `REFRESH_MS` 동안 낡는 것도 그대로다(경위는
// `glb-collide.js` 헤더 한 곳).

import type { Object3D } from 'three/webgpu';
import { buildColliders, createWalker } from './glb-collide.js';
import type { Collider } from './collision.js';

export interface GlbColliderOptions {
  /** 충돌이 볼 트리 — **인스턴싱 전** 원본이어야 한다(근거는 `glb-source.ts`) */
  root: Object3D;
  /** 플레이어 몸 반경(m). 조립부가 world2 와 같은 값을 넘긴다 */
  bodyRadius: number;
  /**
   * 광선을 쏘는 높이(m). **눈높이가 아니라 무릎**이다 — 눈높이에서 쏘면 난간·연석처럼
   * 낮은 것을 광선이 넘어가 «보이는데 안 막히는» 자리가 생긴다.
   *
   * ⚠ **지면 추종을 안 두는 이유**: 이 세계의 GLB 는 world2 를 내보낸 것이고 world2 의
   * 지면은 **완전평면(y=0)** 이다(`systems/player.ts` 가 그 전제로 눈높이를 계산한다).
   * 그러므로 발밑 레이캐스트 없이도 world2 와 **같은 높이로 걷는다** — 지면 추종을
   * 넣는 것은 그 자체로 플레이어 계약을 바꾸는 일이고, 포크 규율상 안 건드린다.
   * 지면이 평면이 아닌 GLB(world7 의 임의 파일)를 이 골격에 얹는 회차에 다시 볼 자리다.
   */
  kneeY: number;
  /** 지금 시각(ms). 근처 목록 갱신 주기 판정에 쓴다(테스트 주입) */
  now?: () => number;
}

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * GLB 를 걷는 충돌기. `y` 를 안 받는 이유는 `Collider` 계약이 평면 해석이기 때문이다 —
 * 높이는 조립부가 별도로 관리한다(`glbGround`).
 */
export function createGlbCollider(opts: GlbColliderOptions): Collider {
  const now = opts.now ?? defaultNow;
  let all = buildColliders(opts.root as never) as Array<unknown>;
  let walker = createWalker(all as never) as {
    refresh(pos: { x: number; y: number; z: number }, now: number): void;
    ground(x: number, y: number, z: number): number | null;
    blocked(x: number, y: number, z: number, dx: number, dz: number, dist: number, kneeDrop: number): boolean;
    nearCount(): number;
  };

  return {
    resolve(x, z, dx, dz) {
      walker.refresh({ x, y: opts.kneeY, z }, now());
      // ── 축을 나눠 푼다 — 벽을 따라 «미끄러진다» ─────────────────────────
      // 한 번에 (dx, dz) 로 쏘면 벽에 닿는 순간 **완전히 선다.** 축을 나누면 막힌 축만
      // 0 이 되고 나머지 축은 살아 벽을 따라 흐른다. world2 의 원형 footprint 해석도
      // 같은 결과를 내므로 **몸의 느낌이 같다.**
      const r = opts.bodyRadius;
      let ox = dx;
      let oz = dz;
      // `kneeDrop` 을 0 으로 넘긴다 — 이미 무릎 높이를 직접 주고 있다.
      if (ox !== 0 && walker.blocked(x, opts.kneeY, z, ox, 0, Math.abs(ox) + r, 0)) ox = 0;
      if (oz !== 0 && walker.blocked(x, opts.kneeY, z, 0, oz, Math.abs(oz) + r, 0)) oz = 0;
      return { x: x + ox, z: z + oz };
    },
    count: () => walker.nearCount(),
    invalidate() {
      all = buildColliders(opts.root as never) as Array<unknown>;
      walker = createWalker(all as never) as typeof walker;
    },
  };
}
