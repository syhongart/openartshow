// 궤도 시점의 산술 — 순수 계층을 **직접 부른다**.
//
// ── 이 파일이 겨누는 것 ─────────────────────────────────────────────────────
// 「도는 동안 대상이 화면 중앙에 남는가」와 「경계에서 조용히 틀어지지 않는가」 둘이다.
// 전자가 깨지면 감독이 드래그하는 내내 대상이 화면 밖으로 흘러가고, 후자는 중심에 서
// 있을 때·반경이 0 일 때처럼 **드물지만 반드시 오는** 상황에서만 드러난다.
//
// ── yaw 규약을 여기서 다시 정하지 않는다 ────────────────────────────────────
// `systems/player.ts` 의 `facing` 이 소유한다. 이 파일은 그것을 **import 해서** 왕복을
// 잰다 — 「궤도가 낸 yaw 로 facing 을 구하면 정말 중심을 향하는가」. 규약을 테스트에
// 베껴 적으면 그 순간 값 미러링이고, `facing` 이 바뀌어도 이 파일은 계속 초록불이다.
//
// ── 여기서 못 재는 것 ───────────────────────────────────────────────────────
// **손맛**이다. 픽셀당 회전량·휠 배수가 적당한지는 감독 화면에서만 갈린다(이 환경은
// 헤드리스라 조작 지연도 WebGPU 룩도 원리적으로 못 잰다).

import { describe, it, expect } from 'vitest';
import {
  orbitStep, yawTo, pitchTo, clampRadius, zoomFactor,
  R_MIN, R_MAX, ZOOM_PER_NOTCH,
} from '../frontend/js/world2/decide/orbit.js';
import { facing } from '../frontend/js/world2/systems/player.js';

/** 그 자리에서 그 yaw 로 봤을 때 실제로 중심을 향하는가 — 코사인 유사도 */
function aimsAt(pose: { x: number; z: number; yaw: number }, cx: number, cz: number): number {
  const f = facing(pose.yaw);
  const dx = cx - pose.x;
  const dz = cz - pose.z;
  const len = Math.hypot(dx, dz);
  if (len === 0) return 1;
  return (f.x * dx + f.z * dz) / len;
}

describe('도는 내내 대상이 화면 중앙에 남는다', () => {
  it('★ 어느 각도로 돌아도 시선이 중심을 향한다 — 이 축이 궤도의 존재 이유다', () => {
    // 규약(`facing`)을 실제로 태워 왕복을 잰다. 부호를 하나 틀리면 대상이 등 뒤에 온다.
    let from = { x: 20, z: 5 };
    for (let i = 0; i < 24; i++) {
      const p = orbitStep(from, 10, 10, Math.PI / 12, 1);
      expect(aimsAt(p, 10, 10), `★ ${i}스텝에서 시선이 중심을 벗어났다`).toBeCloseTo(1, 10);
      from = p;
    }
  });

  it('★ 한 바퀴(2π)를 돌면 제자리로 온다 — 누적 오차가 안 쌓인다', () => {
    const start = { x: 30, z: 10 };
    let p = { ...start, yaw: 0 };
    for (let i = 0; i < 36; i++) p = orbitStep(p, 10, 10, Math.PI / 18, 1);
    expect(p.x).toBeCloseTo(start.x, 8);
    expect(p.z).toBeCloseTo(start.z, 8);
  });

  it('반경이 유지된다 — 도는 것과 다가가는 것은 다른 조작이다', () => {
    const p = orbitStep({ x: 10, z: 30 }, 10, 10, 1.234, 1);
    expect(Math.hypot(p.x - 10, p.z - 10)).toBeCloseTo(20, 10);
  });

  it('반대로 돌면 반대로 간다', () => {
    const a = orbitStep({ x: 30, z: 10 }, 10, 10, 0.5, 1);
    const b = orbitStep({ x: 30, z: 10 }, 10, 10, -0.5, 1);
    expect(a.z).not.toBeCloseTo(b.z, 3);
    // 대칭이어야 한다 — 같은 각을 양쪽으로 돌면 중심 기준 거울상이다.
    expect(a.x).toBeCloseTo(b.x, 10);
    expect(a.z - 10).toBeCloseTo(-(b.z - 10), 10);
  });
});

describe('줌 — 반경만 바꾼다', () => {
  it('배수가 반경에 곱해진다', () => {
    const p = orbitStep({ x: 30, z: 10 }, 10, 10, 0, 1.5);
    expect(Math.hypot(p.x - 10, p.z - 10)).toBeCloseTo(30, 10);
  });

  it('★ 줌만 해도 시선은 중심을 향한 채다', () => {
    const p = orbitStep({ x: 30, z: 10 }, 10, 10, 0, 0.5);
    expect(aimsAt(p, 10, 10)).toBeCloseTo(1, 10);
  });

  it('★ 아무리 당겨도 하한 밖에 남는다 — 대상 **안**으로 들어가지 않는다', () => {
    let p = { x: 30, z: 10, yaw: 0 };
    for (let i = 0; i < 50; i++) p = orbitStep(p, 10, 10, 0, 0.5);
    expect(Math.hypot(p.x - 10, p.z - 10), '★ 건물 안으로 파고들었다').toBeCloseTo(R_MIN, 10);
  });

  it('★ 아무리 밀어도 상한 안에 남는다 — 스트리밍 밖으로 안 나간다', () => {
    let p = { x: 30, z: 10, yaw: 0 };
    for (let i = 0; i < 50; i++) p = orbitStep(p, 10, 10, 0, 2);
    expect(Math.hypot(p.x - 10, p.z - 10), '★ 대상이 언로드될 거리까지 멀어졌다')
      .toBeCloseTo(R_MAX, 10);
  });

  it('휠은 **부호만** 본다 — 단위가 브라우저마다 다르다', () => {
    // 픽셀·줄·페이지 세 단위가 있고 크기를 그대로 쓰면 트랙패드에서 화면 밖으로 날아간다.
    expect(zoomFactor(3)).toBeCloseTo(ZOOM_PER_NOTCH, 10);
    expect(zoomFactor(300)).toBeCloseTo(ZOOM_PER_NOTCH, 10);
    expect(zoomFactor(-3)).toBeCloseTo(1 / ZOOM_PER_NOTCH, 10);
    expect(zoomFactor(0)).toBe(1);
    expect(zoomFactor(NaN)).toBe(1);
  });

  it('★ 위로 굴리면 **가까워진다** — 반대면 조작이 통째로 뒤집힌다', () => {
    expect(zoomFactor(-100), '★ 휠 방향이 뒤집혔다').toBeLessThan(1);
  });
});

describe('경계 — 드물지만 반드시 온다', () => {
  it('★ 중심에 서 있으면 하한 반경으로 **밀려난다**', () => {
    // 반경 0 에서는 회전해도 같은 자리라, 밀어내지 않으면 아무리 드래그해도 화면이
    // 안 움직인다 — 감독은 그것을 「궤도가 고장났다」로 읽는다.
    const p = orbitStep({ x: 10, z: 10 }, 10, 10, 0.5, 1);
    expect(Math.hypot(p.x - 10, p.z - 10), '★ 중심에 갇혔다').toBeCloseTo(R_MIN, 10);
  });

  it('망가진 입력에 자리를 잃지 않는다', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const p = orbitStep({ x: 30, z: 10 }, 10, 10, bad, 1);
      expect(Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.yaw),
        `★ dYaw=${bad} 에서 좌표가 깨졌다 — 카메라가 사라진다`).toBe(true);
    }
    for (const bad of [NaN, 0, -1, Infinity]) {
      const p = orbitStep({ x: 30, z: 10 }, 10, 10, 0, bad);
      expect(Number.isFinite(p.x) && Number.isFinite(p.z), `★ kRadius=${bad} 에서 깨졌다`).toBe(true);
      expect(Math.hypot(p.x - 10, p.z - 10)).toBeGreaterThanOrEqual(R_MIN);
    }
  });

  it('clampRadius — 유한하지 않으면 하한', () => {
    expect(clampRadius(NaN)).toBe(R_MIN);
    expect(clampRadius(-5)).toBe(R_MIN);
    expect(clampRadius(1e9)).toBe(R_MAX);
    expect(clampRadius(20)).toBe(20);
  });
});

describe('시선각 — 같은 자리와 «모른다» 를 가른다', () => {
  it('★ 중심과 같은 자리면 null 이다 — 0 을 내면 «북쪽» 과 구별이 안 된다', () => {
    expect(yawTo({ x: 10, z: 10 }, 10, 10)).toBeNull();
  });

  it('낸 각으로 보면 중심을 향한다', () => {
    const from = { x: 25, z: -3 };
    const yaw = yawTo(from, 10, 10)!;
    expect(yaw).not.toBeNull();
    expect(aimsAt({ ...from, yaw }, 10, 10)).toBeCloseTo(1, 10);
  });
});

describe('내려다보는 각 — **음수가 아래**다', () => {
  // 부호 규약은 `player.ts` 의 `look()` 이 소유한다(`lookBy(-dx*s, -dy*s)`).
  // 여기서 뒤집히면 대상을 고를 때마다 화면이 하늘을 본다.
  it('★ 눈보다 낮은 것을 보면 음수', () => {
    expect(pitchTo(20, 0, 30), '★ 내려다보는데 각이 양수다 — 하늘을 본다').toBeLessThan(0);
  });

  it('★ 눈보다 높은 것을 보면 양수', () => {
    expect(pitchTo(1.7, 12, 10)).toBeGreaterThan(0);
  });

  it('같은 높이면 0', () => {
    expect(pitchTo(5, 5, 30)).toBeCloseTo(0, 10);
  });

  it('★ 바로 발밑이어도 안 터진다 — 수평 거리 0 에서 −90° 로 수렴', () => {
    // 나눗셈으로 쓰면 여기서 Infinity 가 나오고 카메라가 사라진다.
    const p = pitchTo(20, 0, 0);
    expect(Number.isFinite(p)).toBe(true);
    expect(p).toBeCloseTo(-Math.PI / 2, 10);
  });

  it('멀수록 얕아진다 — 각이 거리에 따라 실제로 변한다', () => {
    expect(Math.abs(pitchTo(20, 0, 100))).toBeLessThan(Math.abs(pitchTo(20, 0, 10)));
  });
});
