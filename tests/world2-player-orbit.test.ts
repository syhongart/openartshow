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
// ── 검출력 실측 (2026-08-13, 별도 클론) ─────────────────────────────────────
// 이 파일 + `tests/world2-orbit.test.ts` 대조군 **41 passed**(실측 시점 `5de8c8a`).
//
//   O-1  `orbitStep` 이 반경 클램프를 통째로 안 한다        → **5 failed**
//   O-2  하한(`R_MIN`)만 제거                             → **4 failed**
//   O-3  시선각을 0.05rad 틀어 낸다                        → **3 failed**
//   O-4  `pitchTo` 부호 뒤집기                            → **5 failed**
//   O-5  `atan2` → `atan`(나눗셈)                         → **0 → 1 failed** ⚠ 아래
//   O-6  휠 방향 뒤집기                                    → **2 failed**
//   O-7  중심에 서 있을 때 안 밀어낸다                      → **1 failed**
//   O-8  리프트가 카메라에 안 나간다                        → **2 failed**
//   O-9  리프트 상한 제거                                  → **2 failed**
//   O-10 `endOrbit` 이 리프트를 안 걷는다                   → **1 failed**
//   O-11 `endOrbit` 이 갇힘을 안 푼다                       → **1 failed**
//   O-12 `endOrbit` 이 `orbitFrom` 을 안 비운다             → **0 → 1 failed** ⚠ 아래
//   O-13 `main.ts` 에 죽은 `player.orbit(...)` 한 줄 추가    → **2 failed**
//
// ⚠ **0 failed 가 둘 나왔고 원인이 서로 달랐다.**
//
// **O-5 는 「거의 등가」였다.** `atan2(y, 0) = ±π/2` 이고 `atan(±∞) = ±π/2` 라 대부분의
// 입력에서 결과가 같다 — **한 점만 빼고.** 눈과 대상이 같은 높이이고 수평거리도 0 이면
// `atan2(0,0) = 0` 인데 `atan(0/0) = NaN` 이다. 「거의 등가」와 「등가」는 다른 일이고,
// 그 한 점을 축으로 만드니 1 failed(재현 확인).
//
// **O-12 는 축이 빈 검사였다 — 그리고 이 회차에 같은 형태를 두 번째로 했다**(앞의 P-C 는
// 파셀 (0,0) 이었다). 두 가지가 겹쳤다: ① 궤도를 `dYaw=0`·`kRadius=1` 로 돌아 **위치가
// 안 변했고** ② 벽이 **절대 좌표 클램프**라 출발점과 무관하게 도착점이 같았다.
// **두 값이 구별될 수 없는 자리에 픽스처를 놓은 것**이다. 경로에 의존하는 벽으로 바꾸고
// 실제로 돌게 하니 1 failed(재현 확인). 좌표가 얽힌 검사에서는 「그 값이 우연히 같아지는
// 자리」를 먼저 의심한다.
//
// ── 검수관 반려 해소분 검출력 실측 (2026-08-13, 별도 클론) ──────────────────
// 대조군 이 파일 25 passed.
//
//   B-1 복원을 예전처럼 **한 번에** (검수관이 찾은 결함 재현)  → **1 failed**
//   B-2 걸음(`RESTORE_STEP`)을 캐시 커버보다 크게 (8 → 200)    → **2 failed**
//
// B-2 가 둘인 것이 요점이다 — 결함 자체(갇힘)와 **그 전제가 깨졌다는 신호**(걸음이
// 커버를 넘는다)가 따로 잡힌다. 전제 축이 없으면 셀 크기가 줄어드는 날 갇힘 축만
// 조용히 빨간불이 되고, 원인을 찾는 데 시간이 든다.
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

  it('★ 편집 세션은 서로 독립이다 — 두 번째가 **첫 자리**로 복원하지 않는다', () => {
    // `orbitFrom` 을 안 비우면 두 번째 편집 세션의 복원이 **첫 세션 출발점**에서
    // 계산된다. 화면에서는 «편집을 두 번 켰다 껐더니 엉뚱한 데 서 있다» 로만 보인다.
    //
    // ⚠ **이 축의 첫 판본은 빈 검사였다**(O-12 뮤테이션, 0 failed). 두 가지가 겹쳤다:
    //   ① 궤도를 `dYaw=0`·`kRadius=1` 로 돌아 **위치가 안 변했다**
    //   ② 벽이 **절대 좌표 클램프**(`Math.min(5, x+dx)`)라 출발점과 무관하게 도착점이
    //      같았다 — `resolveMove` 가 idempotent 면 `orbitFrom` 이 낡아도 결과가 같다
    // 즉 **두 값이 구별될 수 없는 자리에 픽스처를 놓았다.** 이 회차에 같은 형태를 두 번
    // 했다(앞의 P-C 는 파셀 (0,0) 이었다). 좌표가 얽힌 검사에서는 「그 값이 우연히
    // 같아지는 자리」를 먼저 의심한다.
    //
    // 처방: **경로에 의존하는 벽**(한 프레임에 z 로 3m 이상 못 간다)을 쓰고 실제로 돈다.
    const slowZ = (x: number, z: number, dx: number, dz: number) =>
      ({ x: x + dx, z: z + Math.max(-3, Math.min(3, dz)) });

    const p = new PlayerSystem({ start: { x: 0, z: 30 }, resolveMove: slowZ });
    p.orbit(0, 0, 0, Math.PI / 2, 0, 1); // 첫 세션
    p.endOrbit();
    const between = { ...p.position };
    p.orbit(0, 0, 0, Math.PI / 2, 0, 1); // 두 번째 세션
    p.endOrbit();

    // **같은 두 번째 세션을 새 플레이어로 재현**한 것과 같아야 한다. 정상값을 손으로
    // 적으면 그것은 구현 박제이고, 계수를 바꾸는 날 이 축이 이유 없이 빨간불이 된다.
    const q = new PlayerSystem({ start: between, resolveMove: slowZ });
    q.orbit(0, 0, 0, Math.PI / 2, 0, 1);
    q.endOrbit();
    expect(p.position, '★ 두 번째 세션이 첫 세션 출발점에서 복원했다').toEqual(q.position);
  });

  it('★ `endOrbit()` 을 두 번 불러도 자리가 더 안 움직인다', () => {
    // `setEditing(false)` 와 `dispose()` 가 둘 다 부를 수 있는 경로다(`edit/mode.ts`).
    // 두 번째가 또 복원을 돌리면 감독은 «편집을 껐는데 한 번 더 밀렸다» 를 본다.
    const slowZ = (x: number, z: number, dx: number, dz: number) =>
      ({ x: x + dx, z: z + Math.max(-3, Math.min(3, dz)) });
    const p = new PlayerSystem({ start: { x: 0, z: 30 }, resolveMove: slowZ });
    p.orbit(0, 0, 0, Math.PI / 2, 0, 1);
    p.endOrbit();
    const after = { ...p.position };
    p.endOrbit();
    expect(p.position, '★ 두 번째 `endOrbit` 이 자리를 또 밀었다').toEqual(after);
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

// ── 복원이 **실제 충돌 구현**을 상대로 성립하는가 (검수관 반려, 2026-08-13) ──
//
// ⚠ **이 절이 생긴 이유가 위 절들의 한계다.** 위에서 쓴 mock `resolveMove`(`wall`·`slowZ`)
// 는 좌표에만 반응하는 순수 함수라, 실제 `Collider` 의 핵심 성질 — **넘겨받은 자리 기준
// 3×3 파셀만 캐시한다** — 를 전혀 흉내내지 않는다. 그래서 42축이 전부 초록인 채로
// 결함이 살아 있었다.
//
// 검수관 실측: 건물 정중앙을 목표로 `resolve(0, 0, 100, 0)` → `{x:100, z:0}`(통과).
// 같은 건물·같은 이동량인데 캐시가 목표 근처에서 만들어졌으면 완전히 막혔다.
// **캐시가 어느 자리 기준인가**에 따라 통과와 차단으로 갈린 것이다.
//
// 「테스트 통과는 검출력의 증거가 아니다」가 정확히 이 자리다 — 통과한 42축은
// **실제 구현이 아닌 것**을 상대로 통과했다.

import { createCollider, DEFAULT_BODY_R } from '../frontend/js/world2/systems/collision.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { RESTORE_STEP } from '../frontend/js/world2/systems/player.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';

/** 파셀 하나에만 큰 건물을 세운 세계. 나머지는 빈 구역 */
function worldWithBuildingAt(px: number, pz: number) {
  const building: PlacedPart[] = [
    { kind: 'building', x: 0, y: 0, z: 0, ry: 0, sx: 6, sy: 12, sz: 6, tone: 0 },
  ];
  // `frozenAt` 이 `null` 이 아닌 배열을 내면 빌더·충돌이 **계산 대신 그것을** 쓴다.
  return createCollider({
    frozenAt: (qx, qz) => (qx === px && qz === pz ? building : []),
  });
}

describe('복원이 실제 `Collider` 를 상대로 성립한다 (검수관 반려 해소)', () => {
  const CELL = DEFAULT_LAYOUT.cellX;
  /** 건물을 세운 파셀과 그 월드 중심 */
  const PX = 3;
  const CX = PX * CELL;

  it('★ 멀리 궤도를 돌아 건물 한가운데서 편집을 꺼도 **갇히지 않는다**', () => {
    const collider = worldWithBuildingAt(PX, 0);
    const p = new PlayerSystem({
      start: { x: 0, z: 0 },
      resolveMove: (x, z, dx, dz) => collider.resolve(x, z, dx, dz),
    });

    // 건물을 중심으로 궤도를 잡고 끝까지 줌인한다 — 하한 반경(3m)이 건물 반경보다
    // 작아서 **궤도 자체는 건물 안으로 들어간다**(그것이 의도다, 팀장 판정 3).
    p.orbit(CX, 0, 0, 0, 0, 1);
    for (let i = 0; i < 40; i++) p.orbit(CX, 0, 0, 0, 0, 0.5);
    const inside = Math.hypot(p.position.x - CX, p.position.z);
    expect(inside, '하네스 확인 — 궤도가 건물 안까지 들어가야 이 축이 의미가 있다')
      .toBeLessThan(4);
    // 그리고 출발점에서 캐시 커버(3×3 파셀) 밖까지 왔어야 한다.
    expect(Math.hypot(p.position.x, p.position.z),
      '하네스 확인 — 캐시 커버 안에서 끝나면 결함이 재현되지 않는다')
      .toBeGreaterThan(CELL * 1.5);

    p.endOrbit();

    // 이제 건물 밖에 서 있어야 한다. 반경은 `blockersOf` 가 정하므로 여기서 그 수를
    // 다시 적지 않고 **몸 반경보다 멀다**로만 본다 — 갇혔으면 0 에 가깝다.
    const after = Math.hypot(p.position.x - CX, p.position.z);
    expect(after, '★ 편집을 껐는데 건물 안에 갇혔다 — 복원이 충돌 캐시 밖을 봤다')
      .toBeGreaterThan(DEFAULT_BODY_R);
    expect(after, '★ 건물 밖이긴 한데 궤도가 끝난 자리보다 안쪽이다').toBeGreaterThan(inside);
  });

  it('★ 걸음 길이가 충돌 캐시 커버 안에 있다 — 이 전제가 깨지면 위 축이 조용히 죽는다', () => {
    // `RESTORE_STEP` 의 근거가 「캐시가 최소 `cellX` 를 커버한다」이므로, 셀이 줄거나
    // 걸음이 늘면 그 전제가 깨진다. 값을 주석에만 적어 두면 아무도 안 본다.
    expect(RESTORE_STEP, '★ 복원 걸음이 충돌 캐시 커버를 넘는다 — `player.ts` 의'
      + ' `RESTORE_STEP` 주석이 근거로 삼은 전제가 깨졌다').toBeLessThanOrEqual(CELL);
  });

  it('가까운 복원은 예전처럼 한 걸음이다 — 나누기가 짧은 이동을 안 바꾼다', () => {
    const collider = worldWithBuildingAt(99, 99); // 건물은 멀리 — 막을 것이 없다
    const p = new PlayerSystem({
      start: { x: 0, z: 0 },
      resolveMove: (x, z, dx, dz) => collider.resolve(x, z, dx, dz),
    });
    p.orbit(0, 0, 0, 0, 0, 1);              // (0,0) → 하한으로 밀려 (0, 3)
    const at = { ...p.position };
    p.endOrbit();
    expect(p.position.x).toBeCloseTo(at.x, 6);
    expect(p.position.z).toBeCloseTo(at.z, 6);
  });
});
