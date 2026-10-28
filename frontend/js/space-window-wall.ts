// space-window-wall.ts — **창문이 뚫린 벽을 조각으로 나눈다.** 순수 함수(three 0).
// -----------------------------------------------------------------------------
// 감독 지시 2026-08-24: 창문으로 바깥을 보여줄 것 · 이 기능은 별도 파일로 분리할 것.
//
// ── 왜 계산만 여기 있나 ─────────────────────────────────────────────────────
// `space-assembler.ts` 는 three 를 import 해 노드가 못 돌린다. 거기 산술을 두면 「구멍이
// 제자리에 뚫렸는가」를 검사할 방법이 텍스트뿐이고, 텍스트는 좌표를 못 본다. 여기서
// 조각 목록을 내고 저쪽은 박스로 옮기기만 한다(판정/집행 분리).
//
// ── 무엇이 문제였나 (실측 2026-08-24) ───────────────────────────────────────
// 창문 파츠(`PART_TYPES.window`)는 **벽에 붙는 장식**이라 벽을 뚫지 않는다. 배포물을
// 실제로 렌더해 보니 창은 났는데 유리 뒤가 그대로 벽이었다. 기존 개구부 경로
// (`shell.entries` 문틀)는 **벽 방향 전체**를 여는 것이라 창문에 못 쓴다 — 그것을 쓰면
// 벽 한 면이 통째로 사라진다.
//
// 그래서 벽을 길이축으로 잘라, 창문 구간만 위·아래를 남기고 가운데를 비운다.

/** 벽 조각 하나. u = 길이축 중심, y = 바닥에서 잰 중심 높이. */
export interface WallPiece {
  readonly u: number;
  readonly y: number;
  readonly w: number;   // 길이축 폭
  readonly h: number;   // 높이
}

/** 조각이 이보다 얇으면 만들지 않는다 — z-fighting 과 무의미한 드로우콜을 막는다. */
const MIN_PIECE = 0.02;

/**
 * 창문이 뚫린 벽의 조각 목록.
 *
 * @param len   벽 길이(길이축). 조각의 u 는 −len/2 … +len/2 범위다.
 * @param H     벽 높이(층고).
 * @param wins  창문 중심의 길이축 좌표들. 빈 배열이면 통짜 한 조각을 돌려준다.
 * @param winW  창문 폭, @param winH 창문 높이, @param winY 창문 **중심** 높이.
 *
 * 규약:
 *   · 창문이 벽 밖으로 넘치면 그 창문은 **무시**한다(벽을 잘못 자르느니 안 뚫는다).
 *   · 창문이 서로 겹치면 하나로 합쳐 연다.
 *   · 반환 조각을 모두 더한 넓이 = 벽 넓이 − 뚫린 넓이. 그것을 검사가 확인한다.
 */
export function wallPiecesWithWindows(
  len: number, H: number, wins: readonly number[], winW: number, winH: number, winY: number,
): WallPiece[] {
  const whole: WallPiece[] = [{ u: 0, y: H / 2, w: len, h: H }];
  if (!(len > 0 && H > 0)) return [];
  if (!Array.isArray(wins) || wins.length === 0) return whole;
  if (!(winW > 0 && winH > 0)) return whole;

  const half = len / 2, hw = winW / 2;
  const bottom = winY - winH / 2;
  const top = winY + winH / 2;
  // 창이 바닥·천장을 벗어나면 벽을 자를 수 없다 — 통짜로 둔다(잘못 뚫느니 안 뚫는다).
  if (!(bottom > MIN_PIECE && top < H - MIN_PIECE)) return whole;

  // 벽 안에 온전히 들어오는 창문만, 정렬해서 겹치면 병합.
  const spans: { a: number; b: number }[] = [];
  for (const u of [...wins].sort((p, q) => p - q)) {
    if (!(typeof u === 'number' && isFinite(u))) continue;
    const a = u - hw, b = u + hw;
    if (a < -half + MIN_PIECE || b > half - MIN_PIECE) continue;   // 벽 밖으로 넘친다
    const last = spans[spans.length - 1];
    if (last && a <= last.b) last.b = Math.max(last.b, b);         // 겹치면 합친다
    else spans.push({ a, b });
  }
  if (spans.length === 0) return whole;

  const out: WallPiece[] = [];
  const push = (a: number, b: number, y0: number, y1: number) => {
    const w = b - a, h = y1 - y0;
    if (w > MIN_PIECE && h > MIN_PIECE) out.push({ u: (a + b) / 2, y: (y0 + y1) / 2, w, h });
  };

  let cur = -half;
  for (const s of spans) {
    push(cur, s.a, 0, H);          // 창 사이(또는 벽 끝~첫 창)는 전체 높이
    push(s.a, s.b, 0, bottom);     // 창 아래 (허리벽)
    push(s.a, s.b, top, H);        // 창 위 (인방)
    cur = s.b;
  }
  push(cur, half, 0, H);           // 마지막 창~벽 끝
  return out;
}
