// world2-stylized-boot.ts — world2-stylized.html의 진입점.
//
// ── 이 페이지의 정체: **코드 포크가 아니라 노브 기본값 프리셋이다** ──────────
// world3·world5 는 world2 를 통째로 복사한 포크지만 이 페이지는 다르다. 실행되는 코드는
// `world2/main.ts` **그대로**이고, 다른 것은 URL 에 미리 채워 넣는 노브 기본값 하나뿐이다.
// 그래서 world2 를 고치면 이 페이지도 같이 고쳐진다 — 포크가 지는 no-sync 부채가 없다.
//
// ── 왜 `startWorld2` 에 옵션을 넘기지 않는가 ────────────────────────────────
// 두 가지가 막는다. ① `main.ts` 는 `check:filesize` 동결 목록에 있어 한 줄도 못 늘린다.
// ② 설령 늘릴 수 있어도 노브 소비처가 20군데라 옵션을 거기까지 전파해야 하고, 그러면
// «노브를 읽는 곳» 이 URL 과 옵션 둘이 된다 — 값 미러링이다.
//
// URL 을 채우는 쪽은 부수효과가 오히려 좋다: **주소창이 곧 값이 된다.** 감독이 화면에서
// 슬라이더를 돌린 뒤 주소를 통째로 보내면 내가 그 주소를 열어 같은 화면을 본다
// (`url-knob.ts` 의 `writeNumOpt` 가 세운 가치 그대로다).

import { startWorld2 } from './world2/main.js';
import { STYLIZED_KNOB } from './world2/decide/stylized.js';

/**
 * 이 페이지가 켜 두는 기본값. **URL 에 이미 있는 키는 건드리지 않는다** —
 * 감독이 `?styl=0` 으로 열어 «원본과 같은 화면» 을 보는 것이 A/B 의 한쪽이기 때문이다.
 *
 * ── `at=river` 가 왜 기본값인가 (검수관 블로커 C6, 2026-08-18) ──────────────
 * 첫 판본은 `styl=1` 하나뿐이었고 **그러면 감독이 잔디 0포기 화면을 먼저 본다.**
 * 실측(저장소 판정 함수를 그대로 실행):
 *
 *     ?at=default → (-3.5, 10.0)   심을 수 있는 자리     0 / 18,432
 *     ?at=river   → ( 0.0,-71.0)                     7,169 / 18,432
 *     ?at=sea     → ( 0.0, 463.0)                    5,012 / 18,432
 *
 * 기본 스폰 주변 3×3 파셀이 전부 광장·도로라 `surfaceY` 가 잔디 높이를 한 번도 안 낸다.
 * 그 화면은 **WebGL 폴백(바람 없음)과 구별되지 않는다** — 감독이 «안 켜졌나» 로 읽는다.
 *
 * `river` 를 고른 이유는 개수만이 아니다: 물가 스폰이라 **잔디·물·지형 셋이 한 화면에
 * 온다**(이 페이지가 보여주려는 것 전부). 그리고 `decide/spawn-spot.ts` 가 물가 스폰에는
 * `yaw` 까지 물 쪽으로 잡아 주므로 열자마자 손으로 돌릴 일이 없다 — 그 노브가 생긴 이유가
 * *"확인 자체가 일이 되면 확인이 덜 일어난다"* 였고 여기 그대로 적용된다.
 *
 * ⚠ 이것은 **링크의 기본값이지 룩의 판정이 아니다.** 감독이 `?at=default` 로 열면
 * 기본 스폰 그대로 보인다.
 */
const DEFAULTS: Readonly<Record<string, string>> = { [STYLIZED_KNOB]: '1', at: 'river' };

const url = new URL(location.href);
let touched = false;
for (const [k, v] of Object.entries(DEFAULTS)) {
  if (!url.searchParams.has(k)) { url.searchParams.set(k, v); touched = true; }
}
// `startWorld2` **전에** 갱신해야 한다 — `url-knob.ts` 는 호출 시점의 `location.search` 를
// 읽으므로, 조립이 시작된 뒤에 고치면 이미 읽어 간 노브에는 반영되지 않는다.
//
// ⚠ **그것만으로는 충분하지 않다**(검수관 권고 P5, 2026-08-18). ES 모듈은 `import` 평가가
// 본문보다 **먼저** 돌므로, 위 `import` 시점에 world2 모듈 그래프의 **모듈 스코프**
// `readNum` 이 이미 실행된다. 실물이 있다 — `features/ocean.ts` 의
// `const SEA_PATCH_ON = readNum('wpatch', ...)`. 지금 이 부트가 동작하는 것은 **세
// 스타일라이즈드 기능이 전부 `create()` **안에서만** 노브를 읽기 때문**이고, 누군가
// 모듈 스코프에서 `STYLIZED_KNOB` 을 읽는 순간 이 프리셋이 조용히 멈춘다.
// `pushState` 가 아니라 `replaceState` 인 것은 뒤로가기를 한 번에 벗어나게 하려는 것이다.
if (touched) history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);

const canvas = document.getElementById('w2-canvas');
if (canvas instanceof HTMLCanvasElement) {
  startWorld2(canvas).catch((err) => {
    console.error('[world2-stylized] 진입 실패', err);
  });
} else {
  console.error('[world2-stylized] 캔버스(#w2-canvas)를 찾지 못했습니다');
}
