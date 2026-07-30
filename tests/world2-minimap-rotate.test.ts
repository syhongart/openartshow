// @vitest-environment jsdom
//
// 미니맵이 **네비게이션처럼 돈다** (감독 지시 2026-07-30).
//
// *"맵에서 사람이 돌면 화살표가 회전하는게 아니라 맵이 회전하게 하자. 네비게이션처럼."*
//
// ── 이 파일이 막는 것 ───────────────────────────────────────────────────────
// 회전은 **부호를 뒤집어도 "돌기는 한다"** — 지도가 반대로 돌면 오른쪽으로 갈 때 지도가
// 왼쪽으로 기울어 방향이 정확히 거꾸로 읽힌다. 그런데 캔버스에는 아무 에러가 없고
// 스크린샷도 "지도가 회전 중" 으로 보인다. 눈으로 오래 보거나 실제로 걸어봐야 안다.
//
// 그래서 `ctx.rotate` 에 들어온 **각도 자체**를 관찰한다. 그리고 마커는 그 회전 **밖**에서
// 그려져야 한다 — 안에서 그리면 두 번 돌아 화살표가 엉뚱한 데를 가리킨다.
//
// 회전 여백도 함께 지킨다. 정사각형을 돌리면 모서리가 비므로 훑는 반경이 대각선까지
// 넓어야 하는데, 그 사실은 **구석이 검게 남는 것**으로만 드러나고 테스트 없이는 잡히지 않는다.

import { describe, it, expect, vi, beforeAll } from 'vitest';

/** ctx 스텁 — 관찰 대상은 변환(rotate/translate)의 **순서와 값**이다 */
interface Op { op: string; args: number[] }

const ops: Op[] = [];
let depth = 0;
/** save/restore 깊이를 함께 기록한다 — "회전 안에서 그렸는가" 를 그것으로 판별한다 */
const drawDepths: number[] = [];

function makeCtx() {
  const rec = (op: string, ...args: number[]) => { ops.push({ op, args }); };
  return {
    canvas: { width: 192, height: 192 },
    save() { depth++; rec('save'); },
    restore() { depth--; rec('restore'); },
    translate(x: number, y: number) { rec('translate', x, y); },
    rotate(a: number) { rec('rotate', a); },
    clearRect() { rec('clearRect'); },
    fillRect(x: number, y: number) { drawDepths.push(depth); rec('fillRect', x, y); },
    strokeRect() { drawDepths.push(depth); rec('strokeRect'); },
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() {},
    arc(x: number, y: number) { drawDepths.push(depth); rec('arc', x, y); },
    fill() { rec('fill'); },
    set fillStyle(_v: unknown) {}, set strokeStyle(_v: unknown) {},
    set lineWidth(_v: unknown) {}, set lineCap(_v: unknown) {},
  };
}

let ctx = makeCtx();

beforeAll(() => {
  vi.stubGlobal('document', {
    getElementById: (id: string) => (id === 'w2-map'
      ? { width: 192, height: 192, getContext: () => ctx }
      : null),
  });
});

const { minimapFeature } = await import('../frontend/js/world2/features/minimap.js');

/** yaw 를 주고 한 번 그린 뒤 기록을 돌려준다 */
function drawAt(yaw: number) {
  ops.length = 0; drawDepths.length = 0; depth = 0;
  ctx = makeCtx();
  const env = {
    doc: document,
    cell: 32,
    player: { position: { x: 0, z: 0 }, angles: { yaw, pitch: 0 } },
    scene: { add() {}, remove() {} },
  };
  minimapFeature.create(env as never);
  return { ops: [...ops], drawDepths: [...drawDepths] };
}

describe('미니맵 회전 — 지도가 돌고 마커는 고정된다', () => {
  it('시선 각도만큼 지도를 회전시킨다', () => {
    const yaw = 0.7;
    const r = drawAt(yaw).ops.filter((o) => o.op === 'rotate');
    expect(r.length, 'rotate 호출이 없다 — 지도가 돌지 않는다').toBeGreaterThan(0);
    // **부호가 핵심이다.** `-yaw` 면 지도가 반대로 돌아 방향이 거꾸로 읽힌다 —
    // 화면상 "돌기는 하므로" 스크린샷으로는 구별되지 않는다.
    expect(r[0].args[0], '회전 방향이 뒤집혔다 — 오른쪽으로 갈 때 지도가 왼쪽으로 기운다').toBe(yaw);
  });

  it('회전이 캔버스 중심을 기준으로 걸린다', () => {
    // 중심을 옮기지 않고 돌리면 지도가 좌상단 모서리를 축으로 휘둘린다.
    const r = drawAt(0.4).ops;
    const i = r.findIndex((o) => o.op === 'rotate');
    const before = r[i - 1];
    const after = r[i + 1];
    expect(before.op).toBe('translate');
    expect(before.args).toEqual([96, 96]);   // W/2
    expect(after.op).toBe('translate');
    expect(after.args).toEqual([-96, -96]);  // 되돌리기
  });

  it('마커는 회전 밖에서 그린다 — 안에서 그리면 두 번 돌아 엉뚱한 곳을 가리킨다', () => {
    const { ops: o } = drawAt(1.1);
    const rotAt = o.findIndex((x) => x.op === 'rotate');
    // 회전 블록을 닫는 restore 를 찾는다
    let d = 0; let closeAt = -1;
    for (let i = rotAt; i < o.length; i++) {
      if (o[i].op === 'save') d++;
      else if (o[i].op === 'restore') { d--; if (d < 0) { closeAt = i; break; } }
    }
    expect(closeAt, '회전 블록이 닫히지 않았다').toBeGreaterThan(rotAt);
    // 그 뒤에 rotate 가 또 나오면 마커까지 돌린 것이다
    const after = o.slice(closeAt);
    expect(after.some((x) => x.op === 'rotate'), '회전을 닫은 뒤에도 rotate 가 있다 — 마커가 함께 돈다').toBe(false);
    // 그리고 마커를 그리기 위한 중심 이동이 회전 밖에 있어야 한다
    expect(after.some((x) => x.op === 'translate' && x.args[0] === 96 && x.args[1] === 96)).toBe(true);
  });

  it('yaw 가 바뀌면 회전 각이 따라온다 — 상수로 박아두지 않았다', () => {
    const a = drawAt(0).ops.find((o) => o.op === 'rotate')!.args[0];
    const b = drawAt(1.57).ops.find((o) => o.op === 'rotate')!.args[0];
    expect(a).not.toBe(b);
    expect(b).toBe(1.57);
  });
});

describe('회전 여백 — 돌려도 구석이 비지 않는다', () => {
  it('훑는 범위가 캔버스 대각선을 덮는다', () => {
    // 45° 로 돌린 상태에서, 그려진 칸들이 캔버스 네 모서리를 모두 덮어야 한다.
    // 덮지 못하면 그 자리가 배경색으로 남아 **검은 삼각형**이 보인다.
    const { ops: o } = drawAt(Math.PI / 4);
    const rects = o.filter((x) => x.op === 'fillRect' && x.args.length === 2);
    const xs = rects.map((r) => r.args[0]);
    const ys = rects.map((r) => r.args[1]);
    const W = 192;
    // 대각 절반 = (W/2)*√2 ≈ 135.8 → 중심에서 그만큼 밖까지 칸이 있어야 한다.
    // 값을 적어두지 않고 **유도**한다(캔버스 크기가 바뀌면 따라온다).
    const need = (W / 2) * Math.SQRT2;
    expect(Math.min(...xs), '왼쪽 여백이 부족하다 — 회전 시 구석이 빈다').toBeLessThan(W / 2 - need + 1);
    expect(Math.min(...ys), '위쪽 여백이 부족하다').toBeLessThan(W / 2 - need + 1);
    expect(Math.max(...xs), '오른쪽 여백이 부족하다').toBeGreaterThan(W / 2 + need - 1 - 12);
    expect(Math.max(...ys), '아래쪽 여백이 부족하다').toBeGreaterThan(W / 2 + need - 1 - 12);
  });

  it('축척은 그대로다 — 감독이 지시한 것은 회전이고 확대가 아니다', () => {
    // 중심 파셀이 캔버스 한가운데에 오고, 칸 크기가 **보이는** 반경(8 → 17칸)에서 나온다.
    // 훑는 반경으로 나눴다면 칸이 작아져 지도가 확 넓어진다.
    const { ops: o } = drawAt(0);
    const rects = o.filter((x) => x.op === 'fillRect' && x.args.length === 2);
    const W = 192;
    const cell = W / 17;
    // 중심 칸의 좌상단 = W/2 - cell/2. 그 좌표를 가진 칸이 있어야 한다.
    const cx = W / 2 - cell / 2;
    expect(
      rects.some((r) => Math.abs(r.args[0] - cx) < 0.01 && Math.abs(r.args[1] - cx) < 0.01),
      `중심 칸이 캔버스 중앙에 없다 — 축척이나 정렬이 어긋났다(cell=${cell.toFixed(2)})`,
    ).toBe(true);
  });
});
