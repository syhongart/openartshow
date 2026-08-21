// world2/url-knob.ts — URL 파라미터로 값을 여는 유일한 지점.
//
// ── 왜 따로 두는가 ──────────────────────────────────────────────────────────
// 같은 대여섯 줄이 `main.ts`(`readNum`)와 `features/postfx.ts`(`num`)에 각각 있었고,
// 이제 밤 조명이 세 번째 소비자가 된다. 세 벌이 되는 순간 한쪽만 고쳐도 아무도 모르는
// 상태가 되고, 그게 이 저장소가 색·수치·임계값에서 세 번 겪은 사고의 형태다.
//
// ── 왜 URL 인가 ─────────────────────────────────────────────────────────────
// **내가 볼 수 없는 것을 감독이 보기 때문이다.** 헤드리스는 WebGL(swiftshader)이고
// 감독 실기기는 WebGPU라 렌더 경로가 다르다. 블룸은 아예 안 켜지고, 밤 밝기는 톤매핑을
// 거치며 백엔드마다 미묘하게 다르다. 값을 찾는 일이 코드 수정 → 스모크 → 배포 왕복이면
// 한 번 맞추는 데 하루가 든다. 노브로 열어 두면 감독이 그 자리에서 고를 수 있다.
//
// 노브는 **디버그 전용이 아니다.** 기본값이 곧 배포값이고, 노브는 그 기본값을 무엇으로
// 정할지 감독·헤드리스 스윕이 함께 찾는 수단이다. 값이 확정되면 기본값으로 옮긴다.
//
// ⚠ 이 머리말은 오래 *"**외부 의존 0.**"* 이라고 적고 있었고 `readLit` 이 그것을 깼다
// (`decide/night.ts` 의 기본 상수 하나를 읽는다). 판정 계층은 아무것도 import 하지
// 않으므로 순환은 없고 `check:cycles` 가 그것을 지킨다 — 다만 **의존이 0 이 아니라는
// 사실**은 적어 둔다(참인 문장 옆에 낡은 단언을 남기지 않는다).
//
// ⚠ 그리고 그 의존은 **양방향이 됐다** — `decide/art-material.ts`·`decide/lod-fade.ts` 는
// 반대로 이 파일을 import 한다. 순환은 아니고(`check:cycles` 실측 0) 파일 단위로 갈려
// 있지만, 판정 계층과 노브 계층이 서로를 부르는 상태라는 것은 적어 둔다(검수관 P12).

import { DAYLIT_LIGHTS } from './decide/night.js';

/**
 * URL 수치 파라미터를 범위 안에서 읽는다. 없거나 숫자가 아니면 `fallback`.
 *
 * 범위를 강제하는 것이 요점이다 — `?nexp=999` 같은 값이 그대로 들어가면 화면이 하얗게
 * 날아가고, 그 상태를 "고장" 으로 오해하게 된다. 클램프는 노브를 안전하게 만든다.
 */
export function readNum(key: string, fallback: number, min: number, max: number): number {
  if (typeof location === 'undefined') return fallback;
  const raw = new URLSearchParams(location.search).get(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/**
 * URL 문자열 파라미터를 **허용 목록 안에서만** 읽는다. 목록 밖이면 `fallback`.
 *
 * 목록을 요구하는 이유는 소비처가 대부분 `sky.js` 처럼 정해진 키를 기대하기 때문이다.
 * `?time=밤` 이 그대로 넘어가면 팔레트 조회가 `undefined` 가 되고, 그 실패는 화면이
 * 검게 나오는 것으로만 드러나 원인을 찾기 어렵다.
 */
export function readEnum<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  if (typeof location === 'undefined') return fallback;
  const raw = new URLSearchParams(location.search).get(key);
  if (raw === null) return fallback;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/**
 * URL 숫자 파라미터를 **지정됐을 때만** 읽는다. 없으면 `null`.
 *
 * ── 왜 `readNum` 으로 안 되는가 (감독 지시 2026-07-31 "URL로 값 조절할 수 있게 열어둬") ──
 * `readNum` 은 fallback 을 강제하므로 **"지정 안 됨" 과 "기본값과 같은 값을 지정함" 을
 * 구별할 수 없다.** 대부분의 노브는 그래도 되지만, 기본값이 **상황에 따라 다른** 값이면
 * 얘기가 달라진다.
 *
 * 수면 광택이 그렇다 — 기본값이 시간대별로 다르다(낮 0.9 / 노을 0.7 / 밤 0.35).
 * `readNum('wns', 0.9, ...)` 로 쓰면 낮 기본값이 밤에도 걸려 **시간대 분기가 통째로
 * 죽는다.** 그것은 바로 이 브랜치가 고친 버그의 재발이다.
 *
 * `null` 로 갈라내면 소비처가 `override ?? 시간대값` 으로 쓸 수 있다 — 노브를 안 쓰면
 * 시간대 분기가 그대로 살아 있고, 쓰면 그 순간만 덮는다.
 *
 * @param key URL 파라미터 이름
 * @param min 하한 (클램프)
 * @param max 상한 (클램프)
 * @returns 지정된 유한수를 [min,max] 로 클램프한 값, 없거나 숫자가 아니면 `null`
 */
/**
 * 복합씬 점등 세기(`?lit=`). **소비자가 둘이라 여기에 둔다.**
 *
 * 「불이 켜져있다」(감독 2026-08-21)를 화면에서 만드는 것은 **두 축의 합**이다 —
 * 가로등 `emissiveIntensity`(`systems/lamp-glow.ts`)와 그 등이 블룸 문턱을 넘는가
 * (`features/postfx.ts`). 한쪽만 노브를 타면 감독이 `?lit=` 를 밀어도 절반만 움직인다.
 *
 * 그런데 두 배선이 각자 `readNum('lit', DAYLIT_LIGHTS, 0, 1)` 을 적으면 **키 문자열과
 * 범위가 미러링**이다. 상수(`DAYLIT_LIGHTS`)는 한 곳이어도 `'lit'`·`0`·`1` 이 두 벌이
 * 되고, 범위를 넓히는 날 한쪽만 넓어진다. 그래서 읽기 자체를 여기 한 곳으로 모은다.
 *
 * 상한이 1 인 것은 `nightness` 의 정의역이 0~1 이기 때문이다(밤이 1).
 */
export function readLit(): number {
  return readNum('lit', DAYLIT_LIGHTS, 0, 1);
}

export function readNumOpt(key: string, min: number, max: number): number | null {
  if (typeof location === 'undefined') return null;
  const raw = new URLSearchParams(location.search).get(key);
  if (raw === null) return null;
  // 빈 값(`?k=`)은 지정이 아니다. `Number('')` 가 **0** 이라 이 줄이 없으면
  // 주소창에서 값을 지우다 만 상태가 "0 을 지정함" 으로 읽힌다 — 0 이 유효한
  // 지정값인 노브(`?wns=0`)에서는 그 오독을 되돌릴 방법이 없다.
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

/**
 * 주소창의 노브 값을 갱신한다. `null` 이면 파라미터를 **지운다**.
 *
 * ── 왜 화면 UI 가 URL 을 건드리는가 (감독 지시 2026-07-31 "유아이 바를 만들어봐") ──
 * 슬라이더만 있으면 감독이 좋은 값을 찾아도 **그 값이 화면 안에 갇힌다.** 나에게
 * 전하려면 숫자 셋을 눈으로 읽어 옮겨 적어야 하고, 그 옮겨 적는 구간이 이 프로젝트가
 * 이미 데인 자리다(relay 훼손 — 사람이 옮기는 구간에서 값이 다듬어졌다).
 *
 * 주소를 함께 갱신하면 **주소 자체가 값이 된다.** 감독은 주소를 통째로 보내면 되고,
 * 나는 그 주소를 열면 같은 화면을 본다. 옮겨 적을 것이 없으면 훼손될 것도 없다.
 *
 * `pushState` 가 아니라 `replaceState` 다 — 슬라이더를 한 번 미는 동안 입력이 수십 번
 * 들어오므로, 히스토리를 쌓으면 뒤로가기가 수십 번 눌려야 페이지를 벗어나게 된다.
 *
 * `readNumOpt` 의 짝이다. 읽기가 `null` 로 "지정 안 됨"을 표현하므로 쓰기도 같은
 * 어휘를 쓴다 — 되돌리기(기본값 복귀)가 곧 `null` 쓰기다.
 */
export function writeNumOpt(key: string, v: number | null): void {
  if (typeof location === 'undefined' || typeof history === 'undefined') return;
  const url = new URL(location.href);
  if (v === null) url.searchParams.delete(key);
  else url.searchParams.set(key, String(v));
  // 검색 파라미터가 하나도 안 남으면 `?` 만 남는 주소가 된다. 보기에도 나쁘고
  // "값이 지정돼 있다"는 인상을 준다.
  history.replaceState(history.state, '', url.search ? `${url.pathname}${url.search}${url.hash}` : `${url.pathname}${url.hash}`);
}
