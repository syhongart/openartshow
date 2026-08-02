// world2 게이트 공통 — **어디까지 기다려야 "잴 수 있는 상태"인가.**
//
// ── 왜 생겼나 (팀장 판정 2026-08-02, 조건 1) ────────────────────────────────
// 미술관 GLB 가 실험(`?glb=N` 을 적어야 켜짐)에서 **기본 노출**로 바뀌었다. 그때까지
// world2 를 재는 게이트 넷은 URL 에 `?glb=0` 을 **각자 하드코딩**해 GLB 를 배제하고
// 있었다 — 실험을 재면 개수 불변식이 의미를 잃기 때문이었고, 그 시점에는 옳았다.
//
// 기본이 된 지금 그 배제를 남겨 두면 **라이브 자산이 영구히 관측 밖에 남는다.** 게이트는
// 초록인 채로 GLB 회귀를 한 번도 못 본다 — 이 저장소가 이름 붙인 *"못 잰 것이 통과로
// 적히는 경향"* 의 구조적 재생산이다. 그래서 배제를 걷어냈다.
//
// ── 걷어내면 새 함정이 생긴다: 시간 경합 ────────────────────────────────────
// GLB 는 12.9MB 를 비동기로 내려받아 프레임에 걸쳐 씬에 붙인다. 게이트들이 "부팅 뒤 N초"
// 로 기준선을 잡고 있었으므로, 그 N초 **안에** 로드가 끝나면 기준선이 로드후 값을 담고
// 개수 증가가 0 으로 보인다. **밖에서** 끝나면 같은 코드가 위반으로 찍힌다. 즉 판정이
// 러너 속도에 달리고, 그것은 게이트가 아니라 주사위다.
//
// 그래서 시간이 아니라 **상태**로 기다린다. `glbCity.state` 가 `loading` 을 벗어날
// 때까지 기다린 뒤에 기준선을 잡으면, 러너가 빠르든 느리든 같은 것을 잰다.
//
// ── `failed` 를 통과로 넘기지 않는다 ────────────────────────────────────────
// 로드 실패도 `loading` 을 벗어나므로 대기는 풀린다. 그때 조용히 계속하면 **GLB 가 없는
// 세계를 재고 초록불을 켠다** — 배제를 걷어낸 의미가 사라지고, 증상은 "게이트는 통과하는데
// 라이브에는 건물이 없다" 로만 나타난다. 그래서 상태를 호출부에 돌려주고, 호출부가
// 자기 방식(throw · fail() 반환)으로 적는다.
//
// 판정을 여기서 하지 않는 이유: 게이트 넷이 실패를 적는 방식이 서로 다르다
// (`measure-invariants` 는 throw, `measure-submerge` 는 `fail()` 반환). 여기서 던지면
// 그중 셋의 리포트 형식이 깨진다.

/**
 * world2 게이트 공통 URL 쿼리. **`glb` 를 적지 않는다** — 기본값이 곧 라이브 상태이고,
 * 게이트는 라이브 상태를 재야 한다.
 *
 * 여기 하나로 모은 이유는 값 미러링이다. 넷이 각자 적고 있었고, 그래서 `?glb=0` 을
 * 걷어내려면 네 곳을 고쳐야 했다 — 한 곳만 놓치면 그 게이트만 옛 세계를 잰다.
 */
export const WORLD2_QUERY = '?npc=0&vrm=0&time=day&weather=clear';

/** GLB 로드 상한(ms). 로컬 서빙 실측이 1채 299ms 이므로 대부분 여기 근처도 안 간다 */
const GLB_TIMEOUT = 90000;

/**
 * `__world2.stats()` 가 뜨고 **GLB 가 로딩을 끝낼 때까지** 기다린다.
 *
 * @param {import('playwright-core').Page} page
 * @param {{timeout?: number, bootTimeout?: number}} [opt]
 * @returns {Promise<{booted: boolean, glb: {state: string, placed: number,
 *                    want: number, error?: string}|null, reason: string}>}
 *   `glb` 가 `null` 이면 기능이 안 켜진 것이다(`?glb=0`). 그것 자체는 정상일 수 있으므로
 *   판정하지 않고 사실만 돌려준다.
 */
export async function waitForWorld2Ready(page, opt = {}) {
  const bootTimeout = opt.bootTimeout ?? 60000;
  const timeout = opt.timeout ?? GLB_TIMEOUT;

  try {
    await page.waitForFunction(() => !!window.__world2?.stats?.(), null, { timeout: bootTimeout });
  } catch {
    return { booted: false, glb: null, reason: `부팅 실패 — \`__world2.stats()\` 가 ${bootTimeout}ms 안에 안 떴다` };
  }

  try {
    // `glbCity` 키 자체가 없으면 기능이 안 켜진 것이다 — 기다릴 것이 없다.
    await page.waitForFunction(
      () => {
        const g = window.__world2?.stats?.()?.glbCity;
        return !g || g.state !== 'loading';
      },
      null,
      { timeout },
    );
  } catch {
    return {
      booted: true, glb: null,
      reason: `GLB 가 ${timeout}ms 안에 로딩을 못 끝냈다 — state 가 계속 loading 이다`,
    };
  }

  const glb = await page.evaluate(() => {
    const g = window.__world2?.stats?.()?.glbCity;
    return g ? { state: g.state, placed: g.placed, want: g.want, error: g.error } : null;
  });

  if (glb && glb.state !== 'ready') {
    return { booted: true, glb, reason: `GLB state=${glb.state}${glb.error ? ` (${glb.error})` : ''}` };
  }
  // **놓기까지 확인한다.** `ready` 인데 `placed` 가 요청보다 적으면 세운 척만 한 것이다.
  if (glb && glb.placed < glb.want) {
    return { booted: true, glb, reason: `GLB 가 ${glb.want}채 중 ${glb.placed}채만 섰다` };
  }
  return { booted: true, glb, reason: '' };
}
