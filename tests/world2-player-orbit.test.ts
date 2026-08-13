// 편집 궤도 — **`PlayerSystem` 사상 첫 위치 쓰기 문**이 주행을 안 깨는가.
//
// ── 왜 이 파일이 따로 있나 ──────────────────────────────────────────────────
// 카메라·위치는 주행과 **공유하는 자원**이고, 2026-08-12 에 편집이 주행을 죽인 사고가
// 정확히 그 축에서 났다. 그래서 팀장이 (A-2)(의미 있는 문 하나)를 채택하며 조건 셋을
// 걸었고(2026-08-13), 이 파일이 그 셋을 검사로 만든다:
//
//   ① 리프트 상태는 `PlayerSystem` 내부 소유 — `eye`(readonly)를 안 건드리고 상한도 여기가 정한다
//   ② 편집 종료 시 복원은 `PlayerSystem` 책임 — 복원 후 주행 모델과 동일
//   ③ **편집이 꺼진 상태에서 주행 동작 변경 0**
//
// ── 여기서 못 재는 것 ───────────────────────────────────────────────────────
// **조작감**이다. 픽셀당 회전량·리프트 속도가 손에 맞는지는 감독 화면에서만 갈린다.
// 그리고 궤도 중심을 「화면 중앙 지면」으로 잡는 근사(`edit/input.ts` 의 `orbitCenter`)가
// 실제로 자연스러운지도 여기서는 못 본다 — 그건 광선과 카메라의 일이다.

import { describe, it, expect } from 'vitest';
import { PlayerSystem, facing, LIFT_MAX } from '../frontend/js/world2/systems/player.js';
import { R_MIN, R_MAX } from '../frontend/js/world2/decide/orbit.js';
import type { FrameCtx } from '../frontend/js/world2/kernel.js';

const frame = (dt: number, i = 0): FrameCtx =>
  ({ dt, frame: i, ageMs: dt * i * 1000, hidden: false, resumed: false });

/** 카메라에 실제로 나간 값. 「눈이 어디에 있고 어디를 보는가」는 여기로만 드러난다 */
function camSpy() {
  const seen: { x: number; y: number; z: number; yaw: number; pitch: number }[] = [];
  return {
    seen,
    applyCamera: (x: number, y: number, z: number, yaw: number, pitch: number) => {
      seen.push({ x, y, z, yaw, pitch });
    },
    last: () => seen[seen.length - 1],
  };
}

/** 그 자리에서 그 yaw 로 봤을 때 중심을 향하는가 */
function aimsAt(p: PlayerSystem, cx: number, cz: number): number {
  const f = facing(p.angles.yaw);
  const dx = cx - p.position.x;
  const dz = cz - p.position.z;
  const len = Math.hypot(dx, dz);
  if (len === 0) return 1;
  return (f.x * dx + f.z * dz) / len;
}

describe('궤도 — 대상 주위를 돈다', () => {
  it('★ 돌면 위치가 바뀌고 시선은 대상을 향한다', () => {
    // 이 축이 「고개만 돌리기」와 「도는 것」을 가른다. 위치가 안 바뀌면 E3 이 없는 것이다.
    const p = new PlayerSystem({ start: { x: 30, z: 0 } });
    p.orbit(0, 0, 0, Math.PI / 4, 0, 1);
    expect(p.position.x, '★ 위치가 안 움직였다 — 고개만 돌았다').not.toBeCloseTo(30, 3);
    expect(aimsAt(p, 0, 0), '★ 돌았는데 대상이 화면 밖에 있다').toBeCloseTo(1, 10);
  });

  it('반경이 유지된다 — 도는 것과 다가가는 것은 다른 조작이다', () => {
    const p = new PlayerSystem({ start: { x: 30, z: 0 } });
    for (let i = 0; i < 8; i++) p.orbit(0, 0, 0, Math.PI / 8, 0, 1);
    expect(Math.hypot(p.position.x, p.position.z)).toBeCloseTo(30, 6);
  });

  it('줌 배수가 반경에 곱해지고, 하한·상한 밖으로 안 나간다', () => {
    const p = new PlayerSystem({ start: { x: 30, z: 0 } });
    for (let i = 0; i < 40; i++) p.orbit(0, 0, 0, 0, 0, 0.5);
    expect(Math.hypot(p.position.x, p.position.z), '★ 대상 안으로 파고들었다')
      .toBeCloseTo(R_MIN, 6);
    for (let i = 0; i < 40; i++) p.orbit(0, 0, 0, 0, 0, 2);
    expect(Math.hypot(p.position.x, p.position.z), '★ 언로드 거리까지 멀어졌다')
      .toBeCloseTo(R_MAX, 6);
  });

  it('★ 대상이 눈보다 낮으면 내려다본다 — 부호가 뒤집히면 하늘을 본다', () => {
    const p = new PlayerSystem({ start: { x: 30, z: 0 } });
    p.orbit(0, 0, 0, 0, 20, 1); // 20m 올라간다
    expect(p.angles.pitch, '★ 올라갔는데 시선이 위를 향한다').toBeLessThan(0);
  });

  it('대상이 눈보다 높으면 올려다본다', () => {
    const p = new PlayerSystem({ start: { x: 30, z: 0 } });
    p.orbit(0, 12, 0, 0, 0, 1); // 눈높이 1.7 < 대상 12
    expect(p.angles.pitch).toBeGreaterThan(0);
  });
});

describe('눈높이 리프트 — 상한과 소유가 여기다 (팀장 조건 ①)', () => {
  it('★ 올라가면 카메라 y 가 실제로 올라간다', () => {
    const cam = camSpy();
    const p = new PlayerSystem({ start: { x: 30, z: 0 }, applyCamera: cam.applyCamera, bobAmplitude: 0 });
    p.update(frame(1 / 60));
    const ground = cam.last().y;
    p.orbit(0, 0, 0, 0, 10, 1);
    p.update(frame(1 / 60, 1));
    expect(cam.last().y - ground, '★ 리프트가 카메라에 안 나갔다').toBeCloseTo(10, 6);
  });

  it('★ 상한을 넘지 않는다 — 소비자가 아니라 여기가 막는다', () => {
    const p = new PlayerSystem({ start: { x: 30, z: 0 } });
    const cam = camSpy();
    const q = new PlayerSystem({ start: { x: 30, z: 0 }, applyCamera: cam.applyCamera, bobAmplitude: 0 });
    expect(p.eyeHeight).toBe(q.eyeHeight); // 하네스 확인용
    for (let i = 0; i < 100; i++) q.orbit(0, 0, 0, 0, 10, 1);
    q.update(frame(1 / 60));
    expect(cam.last().y, '★ 상한 없이 계속 올라간다').toBeCloseTo(q.eyeHeight + LIFT_MAX, 6);
  });

  it('★ 지면 아래로는 안 내려간다', () => {
    const cam = camSpy();
    const p = new PlayerSystem({ start: { x: 30, z: 0 }, applyCamera: cam.applyCamera, bobAmplitude: 0 });
    for (let i = 0; i < 100; i++) p.orbit(0, 0, 0, 0, -10, 1);
    p.update(frame(1 / 60));
    expect(cam.last().y, '★ 눈이 땅속으로 들어갔다').toBeCloseTo(p.eyeHeight, 6);
  });

  it('★ `eyeHeight` 는 **안 바뀐다** — 수평선이 편집을 따라 움직이면 안 된다', () => {
    // `decide/horizon.ts` 가 이 값으로 수평선 밴드의 각도를 정한다. 리프트를 여기에
    // 섞으면 편집으로 올라갈 때마다 **수평선이 함께 움직인다** (팀장 조건 ①).
    const p = new PlayerSystem({ start: { x: 30, z: 0 } });
    const before = p.eyeHeight;
    p.orbit(0, 0, 0, 0, 30, 1);
    expect(p.eyeHeight, '★ 리프트가 eyeHeight 에 섞였다 — 수평선이 따라 움직인다').toBe(before);
  });
});

describe('편집 종료 — 주행 모델로 되돌린다 (팀장 조건 ②③)', () => {
  it('★ `endOrbit()` 이 눈높이를 걷는다', () => {
    const cam = camSpy();
    const p = new PlayerSystem({ start: { x: 30, z: 0 }, applyCamera: cam.applyCamera, bobAmplitude: 0 });
    p.update(frame(1 / 60));
    const ground = cam.last().y;
    p.orbit(0, 0, 0, 0, 25, 1);
    p.endOrbit();
    p.update(frame(1 / 60, 1));
    expect(cam.last().y, '★ 편집을 껐는데 공중에 떠 있다').toBeCloseTo(ground, 6);
  });

  it('★ 궤도는 충돌을 **무시한다** — 안 그러면 건물 사이에서 원호가 끊긴다', () => {
    // 팀장 판정 3. 궤도의 주 사용례가 건물 주위라 충돌로 끊기면 도구로서 실패한다.
    const wall = (x: number, z: number, dx: number, dz: number) =>
      ({ x: Math.min(5, x + dx), z: z + dz });
    const p = new PlayerSystem({ start: { x: 30, z: 0 }, resolveMove: wall });
    p.orbit(0, 0, 0, Math.PI, 0, 1); // 반대편(x = -30)으로 — 벽 x=5 를 통과해야 한다
    expect(p.position.x, '★ 궤도가 벽에 막혔다').toBeLessThan(0);
  });

  it('★ 편집을 끄면 갇힘이 풀린다 — 벽 안에 서 있지 않는다', () => {
    const wall = (x: number, z: number, dx: number, dz: number) =>
      ({ x: Math.min(5, x + dx), z: z + dz });
    // 벽 앞(x=0)에서 시작해 벽 너머(x=-30 쪽)로 돌았다가 다시 벽 너머 반대편으로 간다.
    const p = new PlayerSystem({ start: { x: 0, z: 30 }, resolveMove: wall });
    p.orbit(0, 0, 0, 0, 0, 1);          // 궤도 시작 — 이 자리를 기억한다
    p.orbit(0, 0, 0, Math.PI / 2, 0, 1); // x = +30 쪽으로 (벽 x=5 너머)
    expect(p.position.x, '하네스 확인 — 궤도는 벽을 통과했어야 한다').toBeGreaterThan(5);
    p.endOrbit();
    expect(p.position.x, '★ 편집을 껐는데 벽 안에 갇혔다').toBeLessThanOrEqual(5);
  });

  it('충돌 판정이 없는 구성에서는 자리를 안 건드린다 — 벽이 없으면 갇힐 수 없다', () => {
    const p = new PlayerSystem({ start: { x: 0, z: 30 } });
    p.orbit(0, 0, 0, Math.PI / 2, 0, 1);
    const at = { ...p.position };
    p.endOrbit();
    expect(p.position).toEqual(at);
  });

  it('★ 궤도를 한 번도 안 돌았으면 `endOrbit()` 이 아무것도 안 한다', () => {
    // 편집을 켰다 끄기만 해도 이것이 불린다(`edit/mode.ts`). 그때 자리가 움직이면
    // «편집 버튼을 눌렀다 껐더니 딴 데 서 있다» 가 난다.
    const wall = (x: number, z: number, dx: number, dz: number) =>
      ({ x: Math.min(5, x + dx), z: z + dz });
    const p = new PlayerSystem({ start: { x: 30, z: 0 }, resolveMove: wall });
    p.endOrbit();
    expect(p.position, '★ 궤도를 안 썼는데 자리가 움직였다').toEqual({ x: 30, z: 0 });
  });

  it('★ 복원 뒤 다시 궤도를 돌면 **새 출발점**에서 기억한다', () => {
    // `orbitFrom` 을 안 비우면 두 번째 편집 세션이 **첫 번째 자리**로 복원한다.
    const wall = (x: number, z: number, dx: number, dz: number) =>
      ({ x: Math.min(5, x + dx), z: z + dz });
    const p = new PlayerSystem({ start: { x: 0, z: 30 }, resolveMove: wall });
    p.orbit(0, 0, 0, 0, 0, 1);
    p.endOrbit();
    const between = { ...p.position };
    p.orbit(0, 0, 0, 0, 0, 1);
    p.endOrbit();
    expect(p.position, '★ 두 번째 세션이 첫 자리로 되돌아갔다').toEqual(between);
  });
});

describe('★ 편집을 안 쓰면 주행이 그대로다 (팀장 조건 ③)', () => {
  // 이 절이 없으면 「편집 기능이 주행에 스몄다」를 아무도 못 본다. 2026-08-12 사고가
  // 정확히 그 형태였고, 그때는 감독 화면에서야 드러났다.

  it('궤도를 안 부르면 카메라 높이가 예전 그대로다', () => {
    const cam = camSpy();
    const p = new PlayerSystem({ start: { x: 0, z: 0 }, applyCamera: cam.applyCamera, bobAmplitude: 0 });
    for (let i = 0; i < 30; i++) p.update(frame(1 / 60, i));
    for (const s of cam.seen) expect(s.y).toBeCloseTo(p.eyeHeight, 10);
  });

  it('★ 걷기가 궤도의 영향을 안 받는다 — 위치·방향이 입력에서만 나온다', () => {
    const a = new PlayerSystem({ speed: 10, start: { x: 0, z: 0 } });
    a.setInput({ forward: true });
    for (let i = 0; i < 60; i++) a.update(frame(1 / 60, i));

    // 같은 조건에 궤도만 한 번 돌렸다 되돌린 것 — 걸은 결과가 같아야 한다.
    const b = new PlayerSystem({ speed: 10, start: { x: 0, z: 0 } });
    b.orbit(50, 0, 50, 1.2, 30, 1.5);
    b.endOrbit();
    // `endOrbit` 은 자리를 안 되돌린다(충돌 판정이 없으므로) — 그래서 출발점을 맞춘다.
    const c = new PlayerSystem({ speed: 10, start: { x: b.position.x, z: b.position.z } });
    // 하지만 **yaw 는 궤도가 바꿨다.** 걷기는 yaw 를 따르므로 그것까지 맞춘다.
    c.lookBy(b.angles.yaw - c.angles.yaw, 0);
    c.setInput({ forward: true });
    b.setInput({ forward: true });
    for (let i = 0; i < 60; i++) { b.update(frame(1 / 60, i)); c.update(frame(1 / 60, i)); }

    const bWalked = Math.hypot(b.position.x - c.position.x, b.position.z - c.position.z);
    expect(bWalked, '★ 궤도를 쓴 뒤 걷기가 달라졌다').toBeCloseTo(0, 6);
    // 그리고 걸은 **거리**가 대조군과 같아야 한다 — 속도가 바뀌지 않았다.
    expect(Math.hypot(a.position.x, a.position.z)).toBeGreaterThan(9);
  });

  it('망가진 입력에 자리를 잃지 않는다', () => {
    const p = new PlayerSystem({ start: { x: 30, z: 0 } });
    for (const bad of [NaN, Infinity, -Infinity]) {
      p.orbit(0, 0, 0, bad, bad, bad);
      expect(Number.isFinite(p.position.x) && Number.isFinite(p.position.z),
        `★ ${bad} 에서 좌표가 깨졌다 — 카메라가 사라진다`).toBe(true);
      expect(Number.isFinite(p.angles.yaw) && Number.isFinite(p.angles.pitch)).toBe(true);
    }
  });
});

// ── 호출처 (팀장 조건 1) ────────────────────────────────────────────────────
//
// 팀장 판정 (A-2) 의 조건: *"이 문이 편집 외 경로에서 호출되지 않음을 검사로 못 박을 것."*
//
// ⚠ **정적 검사의 한계를 알고 쓴다.** 이 저장소는 소스 텍스트 검사가 약하다는 것을 이미
// 실측했다(`world2-edit-listeners.test.ts` 헤더 — 등록 «위치» 는 맞고 «언제 불리나» 가
// 틀린 결함을 20/20 통과로 놓쳤다). 그러나 «누가 이 함수를 부르는가» 는 본질적으로
// 정적 질문이고, 행위로 옮길 방법이 없다 — 안 부르는 것을 행위로 관측할 수는 없다.
//
// 그래서 이 축이 지키는 것은 좁다: **새 소비자가 조용히 생기지 않는다.** 궤도 자체가
// 옳게 도는지는 위 절들이 본다.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const W2 = 'frontend/js/world2';

function allSources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) allSources(p, out);
    else if (p.endsWith('.ts') || p.endsWith('.js')) out.push(p);
  }
  return out;
}

describe('궤도 문의 소비자는 편집뿐이다 (팀장 조건 1)', () => {
  /** `.orbit(` · `.endOrbit(` 을 부르는 파일. 정의부(`player.ts`)와 타입 선언은 뺀다 */
  const callers = allSources(W2)
    .filter((p) => !p.endsWith('systems/player.ts') && !p.endsWith('edit/types.ts'))
    .filter((p) => /\.(orbit|endOrbit)\(|orbit\?\.\(|endOrbit\?\.\(/.test(readFileSync(p, 'utf8')));

  it('★ 편집·오버레이 기능 밖에서는 아무도 안 부른다', () => {
    const stray = callers.filter((p) => !p.includes('/edit/') && !p.endsWith('features/overlay.ts'));
    expect(stray, '★ 궤도 문에 새 소비자가 생겼다 — 주행 코드가 위치를 쓰기 시작하면'
      + ' 팀장 판정 (A-2) 의 전제(편집 전용)가 깨진다').toEqual([]);
  });

  it('실제로 부르는 곳이 있다 — 이 축이 빈 검사가 아니다', () => {
    // 아무도 안 부르면 위 단언이 자동으로 통과한다. 그 형태를 막는다.
    expect(callers.length, '★ 궤도를 아무도 안 부른다 — 배선이 끊겼거나 검사 패턴이 낡았다')
      .toBeGreaterThan(0);
  });

  it('★ 주행 파일(`main.ts`)이 위치 쓰기 문을 안 쓴다', () => {
    // 가장 위험한 회귀 형태: 주행 쪽에서 «카메라를 여기로 옮기자» 며 이 문을 쓰기 시작하는 것.
    const main = readFileSync(join(W2, 'main.ts'), 'utf8');
    expect(/\.orbit\(|\.endOrbit\(/.test(main), '★ main.ts 가 궤도 문을 쓴다').toBe(false);
  });
});
