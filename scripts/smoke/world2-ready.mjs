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
 * world2 게이트 공통 URL 쿼리. **켜고 끄는 노브를 하나도 적지 않는다** — 기본값이 곧
 * 라이브 상태이고, 게이트는 라이브 상태를 재야 한다.
 *
 * 여기 하나로 모은 이유는 값 미러링이다. 넷이 각자 적고 있었고, 그래서 `?glb=0` 을
 * 걷어내려면 네 곳을 고쳐야 했다 — 한 곳만 놓치면 그 게이트만 옛 세계를 잰다.
 *
 * ── `npc=0&vrm=0` 을 걷어냈다 (2026-08-02, 리얼리티 회차 0) ──────────────────
 * **이 파일이 자기 주석을 어기고 있었다.** 바로 위에 *"기본값이 곧 라이브 상태이고,
 * 게이트는 라이브 상태를 재야 한다"* 고 적어 놓고 정작 NPC 와 VRM 을 꺼 두었다.
 * `?glb=0` 을 걷어낼 때 같은 줄에 있던 둘을 그냥 지나쳤다 — 문장은 옳게 적혔는데
 * 값이 따라오지 않았고, 아무도 그것을 대조하지 않았다.
 *
 * 즉 게이트 넷이 지금까지 재던 것은 **라이브에 없는 조건의 세계**였고, 그 위에서
 * "개수가 상수다" 를 선언하고 있었다. `?glb=0` 을 걷어낸 이유와 **글자 그대로 같은
 * 이유**다 — *"못 잰 것이 통과로 적히는 경향"* 의 구조적 재생산.
 *
 * (NPC 를 켰을 때 개수가 얼마나 오르는지는 이 커밋과 함께 실측해 아래 골든에 적는다.
 *  여기에 수치를 다시 쓰지 않는다 — 두 곳에 적으면 한쪽만 고쳐도 아무도 모른다.)
 *
 * 시간대·날씨는 남긴다. 그 둘은 켜고 끄는 스위치가 아니라 **측정 조건**이고,
 * 고정하지 않으면 하늘 레이어가 회차마다 달라져 개수 비교 자체가 성립하지 않는다.
 * (`[8]` 하늘 예열 게이트는 12조합을 일부러 순회하므로 이 값을 쓰지 않는다.)
 */
export const WORLD2_QUERY = '?time=day&weather=clear';

/** GLB 로드 상한(ms). 로컬 서빙 실측이 1채 299ms 이므로 대부분 여기 근처도 안 간다 */
const GLB_TIMEOUT = 90000;

/**
 * `__world2.stats()` 가 뜨고 **GLB 가 로딩을 끝낼 때까지** 기다린다.
 *
 * ── `ready` 의 뜻이 넓어졌다 (2026-08-02) ───────────────────────────────────
 * 처음에는 "다 세웠다" 였다. 지금은 **"다 세우고 GPU 에 올라갔다"** 다 — `glb-city.ts`
 * 가 배치 뒤 컬링을 잠시 꺼 최초 렌더까지 마친 다음에야 `ready` 를 세운다.
 *
 * 그 순서가 이 헬퍼에 중요한 이유: 예열 전에 `ready` 가 서면 기준선이 GPU 업로드 **전**에
 * 잡히고, 카메라를 돌리는 순간 개수가 오르는 것이 "증식" 으로 찍힌다. 실제로 그렇게
 * FAIL 했다. 이 헬퍼는 시간이 아니라 상태를 보므로 `ready` 가 몇 프레임 늦게 서는 것
 * 자체는 아무 문제가 없다 — **늦게 서야 맞다.**
 *
 * @param {import('playwright-core').Page} page
 * @param {{timeout?: number, bootTimeout?: number}} [opt]
 * @returns {Promise<{booted: boolean, glb: {state: string, placed: number,
 *                    want: number, error?: string}|null,
 *                    overlay?: {state: string, want: number, placed: number,
 *                    failed?: string[], error?: string}|null, reason: string}>}
 *   `glb`·`overlay` 가 `null` 이면 그 기능이 안 켜진 것이다(`?glb=0`·`?overlay=0`).
 *   그것 자체는 정상일 수 있으므로 판정하지 않고 사실만 돌려준다.
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

  // ── VRM 도 기다린다 (2026-08-02, 팀장 판정 — 회차 0 마지막 축) ──────────────
  // **같은 함정을 세 번째로 밟고 있었다.** GLB 에 대해서는 위에서 "시간이 아니라 상태로
  // 기다린다" 를 이미 했는데, VRM 은 그 처방 밖에 있었다 — `features/npc.ts` 가
  // `loadVrmAvatar(...).then(...)` 으로 비동기 로드하는데 여기서는 `glbCity` 만 봤다.
  //
  // 증상: 부팅 기준선 `geometries` 가 세션마다 360~399 로 흔들렸다(폭 39). 팀장이
  // 그 39 를 **NPC 한 체당 지오(실측 유도 42~48)와 같은 자릿수**라고 짚었다 — 여러
  // 원인이 섞인 잡음이 아니라 **한 체가 잡히거나 안 잡히거나**의 계단이라는 뜻이다.
  //
  // 즉 이 폭은 "몇 체가 새는가" 가 아니라 **"몇 체가 로드된 시점에 쟀는가"** 다.
  // 제품의 증식이 아니라 계측 하네스의 결함이고, 하네스를 고치지 않은 채 세운 골든은
  // **무엇을 재는지 모르는 골든**이 된다.
  const npc = await page.evaluate(() => {
    const n = window.__world2?.stats?.()?.npc;
    return n && typeof n === 'object' ? { want: n.vrmWant, placed: n.vrmPlaced, error: n.vrmError } : null;
  });
  // 기능이 꺼졌거나(`?npc=0&vrm=0`) VRM 을 요청하지 않았으면 기다릴 것이 없다.
  if (npc && npc.want > 0) {
    try {
      await page.waitForFunction(
        (want) => {
          const n = window.__world2?.stats?.()?.npc;
          // 로드 실패도 대기를 풀어야 한다 — 안 그러면 타임아웃 메시지가 원인을 가린다.
          return !!n && (n.vrmPlaced >= want || !!n.vrmError);
        },
        npc.want,
        { timeout },
      );
    } catch {
      return { booted: true, glb, reason: `VRM 이 ${timeout}ms 안에 ${npc.want}체를 못 세웠다` };
    }
    const after = await page.evaluate(() => {
      const n = window.__world2?.stats?.()?.npc;
      return { placed: n?.vrmPlaced, error: n?.vrmError };
    });
    // GLB 와 같은 규약 — 실패를 조용히 통과시키지 않는다. 그러면 VRM 없는 세계를 재고
    // 초록불을 켜게 되고, 증상은 "게이트는 통과하는데 라이브에는 사람이 없다" 로만 난다.
    if (after.error) return { booted: true, glb, reason: `VRM 로드 실패 — ${after.error}` };
    if (after.placed < npc.want) {
      return { booted: true, glb, reason: `VRM 이 ${npc.want}체 중 ${after.placed}체만 섰다` };
    }
  }

  // ── 오버레이도 기다린다 (2026-08-16, W8-2 — **같은 함정을 네 번째로** ) ─────
  // GLB → VRM 에 대해서는 이미 *"시간이 아니라 상태로 기다린다"* 를 했는데 **오버레이만
  // 그 처방 밖에 있었다** — 이 파일 전문에 `overlay` 가 **0건**이었다.
  //
  // 그것이 왜 문제인가: `features/overlay.ts` 는 배치 GLB 를 비동기로 받아 **프레임에
  // 걸쳐** 붙인다(`attachAll` 이 `ATTACH_BATCH` 마다 프레임을 넘긴다). 게이트가 그 도중에
  // 기준선을 찍으면 **정상적인 부착 상승이 「증식」으로 찍힌다** — `[7]` 개수 불변식이
  // 러너 속도에 달린 주사위가 된다. `?glb=0` 배제를 걷어낼 때 겪은 것과 글자 그대로 같다.
  //
  // ⚠ **지금은 이 대기가 사실상 즉시 풀린다** — 라이브 `world2-overlay.json` 이 items 0개라
  // 붙일 것이 없다. 즉 **이 축은 아직 실물로 검증되지 않았다**(백로그 #45 가 같은 사실을
  // 적어 두었다). 그래도 지금 넣는 이유는, 작품·배치가 늘어나는 그 회차에 이 대기가
  // 없으면 **증상이 「가끔 FAIL 하는 게이트」로만 나타나** 원인을 짚는 데 회차를 쓰기
  // 때문이다. 순서는 뒤집을 수 없다 — 데이터가 먼저 늘면 그때는 이미 늦다.
  const ov = await page.evaluate(() => {
    const o = window.__world2?.stats?.()?.overlay;
    return o && typeof o === 'object' ? { state: o.state } : null;
  });
  // 키 자체가 없으면 기능이 안 켜진 것이다(`?overlay=0`). 기다릴 것이 없다.
  if (ov) {
    try {
      await page.waitForFunction(
        () => {
          const o = window.__world2?.stats?.()?.overlay;
          return !o || o.state !== 'loading';
        },
        null,
        { timeout },
      );
    } catch {
      return {
        booted: true, glb, overlay: ov,
        reason: `오버레이가 ${timeout}ms 안에 로딩을 못 끝냈다 — state 가 계속 loading 이다`,
      };
    }
    const after = await page.evaluate(() => {
      const o = window.__world2?.stats?.()?.overlay;
      return o ? { state: o.state, want: o.want, placed: o.placed, failed: o.failed, error: o.error } : null;
    });
    // GLB 와 같은 규약. 실패를 조용히 통과시키면 **배치 없는 세계를 재고 초록불을 켠다.**
    if (after && after.state !== 'ready') {
      return {
        booted: true, glb, overlay: after,
        reason: `오버레이 state=${after.state}${after.error ? ` (${after.error})` : ''}`,
      };
    }
    // `ready` 인데 덜 놓였으면 세운 척만 한 것이다. `want` 는 W8-2 에서 이 판정을 가능하게
    // 하려고 열었다 — 그전에는 `placed` 뿐이라 「다 놓았다」와 「절반만」이 같은 값이었다.
    if (after && after.placed < after.want) {
      const why = after.failed?.length ? ` — 실패: ${after.failed.join(', ')}` : '';
      return {
        booted: true, glb, overlay: after,
        reason: `오버레이가 ${after.want}개 중 ${after.placed}개만 섰다${why}`,
      };
    }
    return { booted: true, glb, overlay: after, reason: '' };
  }

  return { booted: true, glb, overlay: null, reason: '' };
}
