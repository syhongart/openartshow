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
 */
const DEFAULTS: Readonly<Record<string, string>> = { [STYLIZED_KNOB]: '1' };

const url = new URL(location.href);
let touched = false;
for (const [k, v] of Object.entries(DEFAULTS)) {
  if (!url.searchParams.has(k)) { url.searchParams.set(k, v); touched = true; }
}
// `startWorld2` **전에** 갱신해야 한다 — `url-knob.ts` 는 호출 시점의 `location.search` 를
// 읽으므로, 조립이 시작된 뒤에 고치면 이미 읽어 간 노브에는 반영되지 않는다.
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
