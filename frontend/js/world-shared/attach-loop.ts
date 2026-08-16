// world-shared/attach-loop.ts — 여러 개를 씬에 **붙이는 루프**. 순수하고 주입 가능하다.
//
// ── 왜 떼어냈나 (2026-08-16, W8-2) ──────────────────────────────────────────
// 감독 요구: *"작품갯수가 정해진것은 아니잖아. 작가별로 다를 수있고."*
//
// 그 요구의 선결 조건이 **부팅 비용**인데, 그 비용을 **아무도 재고 있지 않았다** —
// `frontend/assets/world2-overlay.json` 이 **34바이트·items 0개**라 이 축이 한 번도
// 측정된 적이 없다(백로그 #45 가 그 사실을 적어 두었다).
//
// **「못 잰 것은 통과가 아니다」가 이 저장소의 규율**이므로, 고치기 전에 재는 축을
// 먼저 만든다. 루프를 순수 함수로 떼면 **브라우저 없이 프레임 넘김 횟수를 셀 수 있다** —
// 헤드리스 4fps 편차가 안 끼고, 전후를 수치로 비교할 수 있다.
//
// ── 무엇이 문제였나 — 두 경로가 함수 하나를 공유했다 ────────────────────────
// `features/overlay.ts` 의 `place()` 는 끝에서 **3프레임**을 쓴다(`nextFrame` 1 +
// `warmUp` 2). 그 비용은 **편집 중 한 개씩 놓는 경로**를 위한 것이고, 근거가 그 자리에
// 적혀 있다(감독 실기기 1,072ms 히칭, 2026-08-12).
//
// **그런데 부팅 루프도 같은 `place()` 를 부른다.** 그래서 부팅이 항목당 3프레임을 무는데,
// 부팅에는 그것이 필요 없다 — 배치마다 프레임을 넘기고 **끝에서 한 번 예열**하면 된다.
//
//   전:  frames(N) = 3N + ⌊N/4⌋ + 2   ≈ 3.25N     (N=100 → 327프레임)
//   후:  frames(N) =      ⌊N/4⌋ + 2   ≈ 0.25N     (N=100 →  27프레임)
//
// **약 13배**다. 그리고 이 처방은 새것이 아니다 — `world-shared/glb-city.ts` 가 이미
// 그렇게 하고 있었다. **한쪽에만 있던 처방을 옮기는 것**이다.
//
// ── 왜 `world-shared/` 인가 ─────────────────────────────────────────────────
// `glb-city` 도 같은 모양의 루프를 갖고 있어 **나중에 이쪽으로 합칠 수 있다**(백로그 #38
// 이 「`ATTACH_BATCH`·`WARMUP_FRAMES` 공유 상수 승격 검토」로 이미 이 자리를 적어 두었다).
// ⚠ **지금 소비자는 오버레이 하나뿐이다** — 공유 모듈인데 소비자가 하나인 것은 어색하지만,
// 여기 두는 이유는 재사용이 아니라 **경계**다: 이 루프는 three 도 씬도 모른다(R2·R3 을
// 자동으로 만족한다). `features/` 에 두면 부수효과 계층에 순수 함수가 섞인다.
//
// ── 이 파일이 **하지 않는 것** ──────────────────────────────────────────────
// · **무엇을 붙이는지 모른다.** GLB 든 작품이든 상관없다 — `place` 를 받아 부를 뿐이다
// · **실패를 판정하지 않는다.** `place` 가 던지면 그대로 올라간다(호출자 몫)
// · **프레임을 만들지 않는다.** `nextFrame` 도 주입받는다 — 그래서 테스트가 셀 수 있다

/**
 * 한 프레임에 붙일 개수. 이보다 자주 넘기면 붙는 속도가 느려지고, 덜 넘기면 그 프레임이 멈춘다.
 *
 * **4 는 미술관 GLB 실측에서 나왔다**(`glb-city.ts` 가 소유하던 값을 여기로 옮겼다):
 * 한 채가 메시 78개라 4채면 프레임당 312개 — 헤드리스에서 프레임 하나가 감당하는 양이다.
 * 1 로 내리면 더 부드럽지만 50채에 50프레임(≈0.8초)이 더 든다.
 */
export const ATTACH_BATCH = 4;

/**
 * 예열 프레임 수. 첫 렌더에 GPU 자원(지오·텍스처·파이프라인)이 올라가므로, 컬링을 잠시
 * 끄고 몇 프레임 돌려 **화면에 나오기 전에** 올린다.
 *
 * **2 는 실측으로 정해졌다**(`glb-city.ts` 에서 옮겨온 근거) — 이 값으로 개수 불변식이
 * 통과했고, 예열을 아예 빼면 다시 FAIL 한다(뮤테이션 확인). 모자라면 증상은 **다시 FAIL**
 * 이지 조용한 악화가 아니다 — 개수 불변식이 계속 감시한다.
 *
 * ⚠ **오버레이 쪽에는 자기 실측이 없다.** 라이브 배치가 items 0개라 그 경로는 이 축을
 * 한 번도 잰 적이 없다(백로그 #45). 같은 자산(`lab-space.glb`)을 같은 방식으로 붙이므로
 * 같은 값을 쓰지만, **그것은 유추이지 실측이 아니다.** 배치가 늘어나 실측이 가능해지면
 * 그때 갈라야 하는지 다시 본다.
 *
 * (부팅 예열(`world2/main.ts`)의 프레임 수와 다른 것은 **서로 다른 축**이라 그렇고 값
 *  미러링이 아니다 — 한쪽을 고쳐도 다른 쪽이 틀려지지 않는다.)
 */
export const WARMUP_FRAMES = 2;

export interface AttachLoopOptions<T> {
  /** 붙일 것들 */
  readonly items: readonly T[];
  /** 하나를 붙인다. **프레임을 넘기지 않아야 한다** — 넘기는 것은 이 루프의 몫이다 */
  readonly place: (item: T, index: number) => Promise<unknown>;
  /** 한 프레임 넘긴다 */
  readonly nextFrame: () => Promise<void>;
  /** 중단해야 하는가(teardown). 매 항목 뒤에 묻는다 */
  readonly aborted?: () => boolean;
  /** 몇 개마다 프레임을 넘기나. 기본 `ATTACH_BATCH` */
  readonly batch?: number;
}

/**
 * 항목들을 붙인다. **배치마다만 프레임을 넘긴다.**
 *
 * @returns 실제로 붙인 개수(중단되면 그때까지)
 */
export async function attachAll<T>(opts: AttachLoopOptions<T>): Promise<number> {
  const { items, place, nextFrame, aborted } = opts;
  // 0 이하를 받으면 `% batch` 가 나눗셈 오류(0) 나 무한 넘김(음수)이 된다. 계약 수준에서 막는다.
  const batch = Math.max(1, Math.floor(opts.batch ?? ATTACH_BATCH));
  let done = 0;
  for (let i = 0; i < items.length; i++) {
    await place(items[i], i);
    done++;
    if (aborted?.()) return done;
    if ((i + 1) % batch === 0) await nextFrame();
  }
  return done;
}

/**
 * 붙이기가 끝난 뒤 한 번 도는 예열. **컬링을 잠시 끄고** 몇 프레임 돌린다.
 *
 * ⚠ `frustumCulled` 를 **원래 켜져 있던 것만** 되돌린다 — 처음부터 꺼져 있던 것을 켜면
 * 그 물건의 원래 설정을 이 함수가 바꿔 버린다(하늘 돔·바다처럼 일부러 끈 것이 있다).
 *
 * `traverse`·`frustumCulled` 만 쓰므로 three 를 import 하지 않는다 — **최소 구조 타입**만
 * 요구한다(R2·R3).
 */
export interface CullableNode {
  frustumCulled: boolean;
  traverse(fn: (o: CullableNode) => void): void;
}

export async function warmUpNode(
  root: CullableNode,
  nextFrame: () => Promise<void>,
  frames: number = WARMUP_FRAMES,
): Promise<void> {
  const touched: CullableNode[] = [];
  try {
    root.traverse((o) => { if (o.frustumCulled) { o.frustumCulled = false; touched.push(o); } });
    for (let i = 0; i < frames; i++) await nextFrame();
  } finally {
    // `finally` 인 것이 요점이다 — 중간에 던져도 컬링이 꺼진 채 남지 않는다.
    for (const o of touched) o.frustumCulled = true;
  }
}
