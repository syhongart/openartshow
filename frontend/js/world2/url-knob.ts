// world2/url-knob.ts — URL 파라미터로 값을 여는 유일한 지점. **외부 의존 0.**
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
