// @vitest-environment jsdom
//
// 차선 오프셋 — **마주 오는 두 사람이 실제로 안 겹치는가.**
//
// ── 감독 지적 (2026-08-03) ───────────────────────────────────────────────────
// *"일단. 치바 끼리 뚫고 지나간다"*
//
// ── 무엇이 문제였나 ─────────────────────────────────────────────────────────
// NPC 끼리의 충돌 판정은 저장소에 하나도 없었다. 그런데 그것만이 원인이 아니었다 —
// **전원이 정확히 같은 선 위를 걸었다.** 목표가 `w.tx = w.cell.px * cellX`, 파셀 중심의
// 정확한 격자점이라 좌우 오프셋이 0 이었다. 그래서 같은 도로를 마주 보고 걷는 두 체는
// **확률이 아니라 필연으로** 정면 관통한다.
//
// ── 이 파일이 지키는 것 (팀장 조건 1·2·3, 2026-08-03) ───────────────────────
//   1. 오프셋이 **두 부등식에서 유도**된다 — "±1m 느낌" 이 아니라.
//   2. 오프셋을 0 으로 되살리면 **깨진다**(뮤테이션을 검사 자신이 증명한다).
//   3. 오프셋을 얹은 좌표가 **도로 판정 안**에 있다 — B1 계열 재발 방지.
//
// ── 왜 함수를 실제로 부르는가 ───────────────────────────────────────────────
// 바로 이번 회차에 같은 형태로 **세 번** 샜다. 소스를 문자열로 읽어 "상수를 참조하는가"
// 만 본 검사가 PASS 했는데 값이 못 쓸 값이었고(B1), 그것을 고치려고 만든 검사는 유도식을
// **복제**해서 실물이 무엇이든 통과했다. 그래서 여기서는 전부 실물을 import 한다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  laneOffset, rightOf, forwardOf, lookAhead, laneTarget, stepLane, relativeTo,
  clampLane, laneLimit, LANE_BOUND, type Ahead,
} from '../frontend/js/world2/decide/npc-lane.js';
import { yawOf } from '../frontend/js/world2/decide/npc-walk.js';
import { onRoad, ROAD_HALF, roadDirs } from '../frontend/js/world2/parts/road-topology.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';

// jsdom 에는 네이티브 캔버스가 없다. 치비는 얼굴을 캔버스에 그려 텍스처로 쓰므로 2D
// 컨텍스트가 없으면 빌드가 끝까지 못 간다. 여기서 보는 것은 **몸 크기**뿐이라 그리기는
// 전부 no-op 이어도 된다 — `world2-chibi-cost.test.ts` 와 같은 처방이다.
const ctx2d = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: '', globalAlpha: 1, font: '',
  textAlign: '', textBaseline: '', shadowBlur: 0, shadowColor: '',
  fillRect() {}, clearRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
  arc() {}, ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {}, rect() {},
  fill() {}, stroke() {}, fillText() {}, save() {}, restore() {}, translate() {},
  rotate() {}, scale() {}, clip() {}, setTransform() {}, drawImage() {},
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  putImageData() {},
};
(HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () => ctx2d;

// ── G-1: 유도가 성립하는가 (팀장 조건 1) ────────────────────────────────────
describe('차선 오프셋이 두 부등식에서 유도된다 (G-1)', () => {
  // 몸집을 넓게 훑는다. 한 값만 보면 우연히 통과한다.
  const radii = [0.1, 0.25, 0.4, 0.55, 0.7, 0.9, 1.1, 1.2, 1.24];

  it('① 대향 두 체가 안 겹친다 — 분리 2L 이 몸 폭 합 2r 보다 크다', () => {
    const bad = radii.filter((r) => {
      const L = laneOffset(r);
      return L > 0 && !(2 * L > 2 * r);
    });
    expect(bad, `반경 ${bad.join(',')} 에서 대향이 겹친다`).toEqual([]);
  });

  it('② 차도를 안 벗어난다 — L + r ≤ 차도 반폭', () => {
    const bad = radii.filter((r) => {
      const L = laneOffset(r);
      return L > 0 && L + r > LANE_BOUND;
    });
    expect(bad, `반경 ${bad.join(',')} 에서 차도 밖으로 나간다`).toEqual([]);
  });

  it('창이 비면 0 이다 — 몸집이 차도 1/4 을 넘으면 차선이 성립하지 않는다', () => {
    // 두 부등식을 동시에 만족하는 L 이 **존재하지 않는** 구간이다. 억지로 값을 주면
    // 둘 중 하나를 어기게 되므로 0(= 지금까지의 동작)으로 물러난다.
    expect(laneOffset(LANE_BOUND / 2)).toBe(0);
    expect(laneOffset(LANE_BOUND)).toBe(0);
    expect(laneOffset(99)).toBe(0);
  });

  it('경계 바로 안쪽에서는 성립한다 — 창이 통째로 닫혀 있으면 이 처방은 장식이다', () => {
    expect(laneOffset(LANE_BOUND / 2 - 0.01)).toBeGreaterThan(0);
  });
});

// ── G-2: 실물 아바타로 성립하는가 ───────────────────────────────────────────
//
// 위 부등식이 참이어도 **우리 치비가 그 창 안에 있는지**는 다른 질문이다. 안 들어가면
// 오프셋이 전원 0 이 되어 처방이 통째로 장식이 되는데, 그 사실이 어디에도 안 나타난다.
describe('치비가 차선 창 안에 들어간다 (G-2)', () => {
  it('★ 실측 반경으로 오프셋이 0 이 아니다', async () => {
    const THREE = await import('three');
    const { buildChibi, randomChibiLook } = await import('../frontend/js/chibi.js');

    // 룩마다 몸집이 조금 다르다(종족·머리·액세서리). 한 체만 보면 우연히 통과할 수 있다.
    const radii: number[] = [];
    for (let i = 0; i < 8; i++) {
      const c = buildChibi(randomChibiLook()) as { group: unknown; dispose?: () => void };
      const box = new THREE.Box3().setFromObject(c.group as never);
      radii.push(Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2);
      c.dispose?.();
    }

    const worst = Math.max(...radii);
    expect(
      laneOffset(worst),
      `치비 최대 반경 ${worst.toFixed(2)}m 가 창(< ${(LANE_BOUND / 2).toFixed(2)}m) 밖이다 — 차선이 전원 0 이 된다`,
    ).toBeGreaterThan(0);
  });
});

// ── G-3: 대향 시뮬 — 실제로 안 겹치는가 (팀장 조건 2) ───────────────────────
//
// 부등식이 아니라 **좌표**로 본다. 두 체를 같은 도로에 서로 반대 방향으로 놓고 스쳐
// 지나가게 한 뒤, 그 동안의 최소 접근 거리를 잰다.
//
// yaw 계산(`yawOf`)과 오른쪽 벡터(`rightOf`)를 **둘 다 실물로 import** 한다. 하나라도
// 여기서 다시 적으면 검사가 자기가 만든 값을 검사하게 된다 — 이번 회차에 정확히 그렇게
// 샜다(`Math.floor` 를 `ceil` 로 바꿔도 게이트 1371개가 전부 통과했다).
describe('마주 오는 두 체가 스쳐 지나간다 (G-3)', () => {
  const R = 0.5; // 몸 반경(m). 아래 `minApproach` 가 반환하는 거리와 비교할 값

  /**
   * 두 체가 같은 남북 도로를 서로 반대 방향으로 지나갈 때의 **최소 중심간 거리.**
   *
   * @param lane 두 체가 얹는 차선 오프셋. 0 을 주면 처방 이전의 동작이 된다.
   */
  function minApproach(lane: number): number {
    let min = Infinity;
    for (let t = -6; t <= 6; t += 0.05) {
      // A 는 북으로(-Z), B 는 남으로(+Z). 같은 x=0 선 위를 마주 걷는다.
      const ryA = yawOf(0, -1)!;
      const ryB = yawOf(0, 1)!;
      const rA = rightOf(ryA);
      const rB = rightOf(ryB);
      const ax = rA.x * lane;
      const az = -t + rA.z * lane;
      const bx = rB.x * lane;
      const bz = t + rB.z * lane;
      const d = Math.hypot(ax - bx, az - bz);
      if (d < min) min = d;
    }
    return min;
  }

  it('★ 몸이 안 겹친다 — 최소 거리가 몸 폭 합보다 크다', () => {
    const d = minApproach(laneOffset(R));
    expect(d, `최소 접근 ${d.toFixed(2)}m ≤ 몸 폭 합 ${(2 * R).toFixed(2)}m`).toBeGreaterThan(2 * R);
  });

  it('오프셋 0 이면 이 검사가 깨진다 — 검출력 확인 (팀장 조건 2)', () => {
    // 뮤테이션을 코드로 굳힌다. 손으로 되돌려 보고 "깨졌다" 고 적는 것보다 오래 간다.
    // 처방 이전에는 두 체가 **정확히 같은 점**을 지났다(거리 0).
    expect(minApproach(0)).toBeLessThan(1e-9);
  });

  it('우측통행이다 — 두 체가 서로 다른 쪽에 선다', () => {
    // 부호를 하나 틀리면 전원이 좌측통행이 되는데, 그것만으로는 위 검사가 안 깨진다
    // (분리 거리는 같다). 하지만 **플레이어와 마주칠 때** 어느 쪽으로 비키는지가 달라진다.
    const L = laneOffset(R);
    const a = rightOf(yawOf(0, -1)!); // 북으로 걸을 때 오른쪽 = 동쪽(+X)
    expect(a.x * L).toBeGreaterThan(0);
    expect(Math.abs(a.z * L)).toBeLessThan(1e-9);
  });
});

// ── G-4: 위상 — 오프셋을 얹어도 길 위인가 (팀장 조건 3) ─────────────────────
//
// B1 이 이 축으로 샜다. 스폰 밴드를 안개에서 유도하면서 값이 비정수가 됐고, 격자 판정이
// 통째로 무력화돼 **NPC 가 건물 안쪽을 가로질렀다.** 테스트는 전부 통과했다 — 아무도
// 좌표를 도로 판정에 넣어 보지 않았기 때문이다. 같은 실수를 반복하지 않는다.
describe('차선을 얹은 좌표가 도로 위다 (G-4)', () => {
  const { cellX, cellZ } = DEFAULT_LAYOUT;

  it('★ 네 방향 모두, 파셀을 가로지르는 내내 onRoad 다 — 회피 최대치까지', () => {
    const RADIUS = 0.5;
    // 차선만이 아니라 **회피가 갈 수 있는 끝까지** 훑는다. 회피는 차선을 넘어 좌우로
    // 움직이므로, 차선 하나만 보면 실제로 밟는 좌표의 일부만 검사하게 된다.
    // 여기가 B1 이 샌 축이다 — 아무도 좌표를 도로 판정에 넣어 보지 않아서 NPC 가
    // 건물 안쪽을 가로지르는 동안 테스트는 전부 통과했다.
    const lim = clampLane(1e9, RADIUS); // 도달 가능한 최대 오프셋
    expect(lim, '오프셋 상한이 0 이면 이 검사는 아무것도 안 본다').toBeGreaterThan(0);
    const offs: number[] = [];
    for (let o = -lim; o <= lim + 1e-9; o += lim / 6) offs.push(o);

    // 도로가 사방으로 뻗은 칸을 찾는다. 격자 패턴에 따라 방향 수가 달라서, 네 방향이
    // 다 있는 칸에서 봐야 어느 방향으로 걷든 덮인다.
    let cross: { px: number; pz: number } | null = null;
    for (let px = 0; px < 20 && !cross; px++) {
      for (let pz = 0; pz < 20; pz++) {
        if (roadDirs(px, pz).length === 4) { cross = { px, pz }; break; }
      }
    }
    expect(cross, '사거리 칸을 못 찾았다 — 격자 패턴이 바뀌었다').not.toBeNull();

    const dirs = roadDirs(cross!.px, cross!.pz);
    const off: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const bad: string[] = [];

    for (const [sx, sz] of off) {
      const ry = yawOf(sx * cellX, sz * cellZ)!;
      const r = rightOf(ry);
      for (const L of offs) {
        // 파셀 중심에서 그 방향 경계까지 훑는다(중심 기준 로컬 좌표 = onRoad 의 계약).
        for (let u = 0; u <= 0.5; u += 0.02) {
          const x = sx * cellX * u + r.x * L;
          const z = sz * cellZ * u + r.z * L;
          if (!onRoad(x, z, dirs)) bad.push(`오프셋 ${L.toFixed(2)} → (${x.toFixed(1)},${z.toFixed(1)})`);
        }
      }
    }
    expect(bad.slice(0, 5), `도로 밖 ${bad.length}점`).toEqual([]);
  });

  it('차도 반폭이 도로 판정 반폭보다 좁다 — 그래서 위 검사가 자동으로 성립한다', () => {
    // 이 부등호가 뒤집히면 "차도 위" 와 "길 위" 가 갈라져 사람이 아스팔트 밖을 걷는다.
    expect(LANE_BOUND).toBeLessThan(ROAD_HALF);
  });
});

// ── G-6: 앞사람 회피 (감독 지시 2026-08-03) ─────────────────────────────────
//
// *"앞에 있으면 사람처럼 점점 옆으로 이동하게, 그 옆을 스쳐갔다가 다시 중앙으로 오게."*
//
// 차선만으로는 **대향 정면**밖에 못 덮는다. 같은 방향 추월도, 교차로에서 직각으로 오는
// 것도 남는다. 회피는 그 나머지를 덮는다.
//
// ⚠ **반환값의 의미가 바뀌었다**(검수관 반려 B1). 옛 `dodgeOffset` 은 "얼마나 더 갈까"
// 였고 집행부는 그것을 절대 목표에 더했다 — 기준이 달라 추월에서 필요량의 절반만
// 벌어졌다. 이제 `laneTarget` 이 **어디로 갈까**(절대 목표)를 낸다.
describe('앞을 막는 사람을 비켜 간다 (G-6)', () => {
  const GAP = 1.0; // 두 몸 반경의 합
  const LOOK = 8;
  const R = 0.5; // 몸 반경
  const LANE = laneOffset(R);
  /** 지금 차선 위에 서 있는 체가 이웃들을 보고 정한 목표 */
  const from = (others: Ahead[], cur = LANE) => laneTarget(others, cur, LANE, GAP, LOOK, R);

  it('앞이 비면 차선으로 돌아간다 — "다시 중앙으로" 가 여기서 나온다', () => {
    // 복귀를 별도 상태로 만들지 않았다. 앞이 비면 목표가 차선이 되고 추종이 걸어서
    // 따라간다. 이 단언이 곧 복귀 동작의 근거다.
    expect(from([])).toBeCloseTo(LANE, 9);
    // 이미 옆으로 나가 있어도 차선으로 돌아온다 — 되돌아오는 힘이 실제로 있는가.
    expect(from([], 1.9)).toBeCloseTo(LANE, 9);
  });

  it('★ 뒤에 있어도 가까우면 본다 — 추월 직후 끼어들면 다시 겹친다', () => {
    // 옛 계약은 `ahead <= 0` 을 잘랐다. 그러자 추월한 순간 앞이 비어 곧장 차선으로
    // 돌아갔고, 방금 지나친 사람이 바로 뒤 옆에 있어 다시 겹쳤다(실측 0.502m).
    // 사람도 추월하자마자 끼어들지 않는다.
    const t = from([{ ahead: -2, side: 0 }]);
    expect(t, '바로 뒤 옆에 사람이 있는데 차선으로 돌아간다').not.toBeCloseTo(LANE, 6);
    expect(Math.abs(t - LANE)).toBeGreaterThanOrEqual(GAP - 1e-9);
  });

  it('충분히 멀어지면 차선으로 돌아온다 — 유지가 영구가 되면 안 된다', () => {
    // 앞·뒤 어느 쪽이든 `look` 밖이면 푼다. 비키기 시작하는 거리와 푸는 거리가 같아서
    // 규칙이 하나로 끝난다.
    expect(from([{ ahead: -(LOOK + 1), side: 0 }], 0.3)).toBeCloseTo(LANE, 9);
    expect(from([{ ahead: LOOK + 1, side: 0 }], 0.3)).toBeCloseTo(LANE, 9);
  });

  it('가까운 사람이 아무도 없으면 차선이다 — 복귀의 기본 경로', () => {
    expect(from([{ ahead: LOOK + 5, side: LOOK + 5 }], 1.9)).toBeCloseTo(LANE, 9);
  });

  it('★ 이미 벌어져 있으면 그 자리를 지킨다 — 차선으로 튀면 진동한다', () => {
    // 여기서 `LANE` 으로 돌아가면 다시 가까워지고, 가까워지면 또 비킨다. 그 되먹임의
    // 평형점이 정확히 `gap/2` 라 B1 과 겉보기 증상이 똑같았다(실측 0.502m 두 번).
    expect(from([{ ahead: 3, side: GAP }], 0.3)).toBeCloseTo(0.3, 9);
    expect(from([{ ahead: 3, side: -GAP - 0.5 }], 1.9)).toBeCloseTo(1.9, 9);
  });

  it('★ 목표가 상대와 정확히 gap 만큼 떨어져 있다 — 절대 좌표로 본다', () => {
    // 이것이 B1 이 어긴 성질이다. 옛 구현은 목표가 상대에게서 gap/2 밖에 안 떨어졌다.
    for (const [cur, side] of [[LANE, 0], [LANE, -0.4], [LANE, 0.3], [0, 0.2], [1.8, -0.6]]) {
      const other = cur + side; // 상대의 절대 오프셋
      const t = from([{ ahead: 3, side }], cur);
      // 차도 폭이 허용하는 한 gap 을 확보한다. 잘렸으면 그 사실이 아래 G-10 에 나온다.
      const lim = laneLimit(R);
      const reachable = Math.abs(other + GAP) <= lim || Math.abs(other - GAP) <= lim;
      if (reachable) {
        expect(Math.abs(t - other), `cur=${cur} side=${side} 에서 gap 미달`)
          .toBeGreaterThanOrEqual(GAP - 1e-9);
      }
    }
  });

  it('★ 갈 수 있는 쪽을 고른다 — 자른 뒤에 비교해야 착시가 없다', () => {
    // 추월: 상대가 내 차선 위에 있다. 오른쪽은 `lim − lane` 밖에 안 남아 gap 이 안
    // 나오지만 왼쪽은 넉넉하다. 자르기 **전** 값으로 고르면 오른쪽을 골라 실패한다.
    const t = from([{ ahead: 3, side: 0 }], LANE);
    expect(Math.abs(t - LANE), '추월에서 gap 을 못 벌렸다').toBeGreaterThanOrEqual(GAP - 1e-9);
    expect(t, '왼쪽으로 갔어야 한다').toBeLessThan(LANE);
  });

  it('가장 가까운 사람만 본다 — 여럿을 합치면 서로 상쇄돼 프레임마다 값이 튄다', () => {
    const many: Ahead[] = [
      { ahead: 6, side: 0.2 }, // 멀다
      { ahead: 1.5, side: -0.2 }, // 가장 가깝다 — 이것만 본다
      { ahead: 4, side: 0.1 },
    ];
    const other = LANE - 0.2;
    expect(Math.abs(from(many) - other)).toBeGreaterThanOrEqual(GAP - 1e-9);
  });

  it('목표가 차도 안이다 — 회피가 얼마든 여기서 잘린다', () => {
    const lim = laneLimit(R);
    for (const side of [-0.9, -0.4, 0, 0.3, 0.8]) {
      for (const cur of [-1.9, -0.5, 0, LANE, 1.9]) {
        expect(Math.abs(from([{ ahead: 2, side }], cur))).toBeLessThanOrEqual(lim + 1e-9);
      }
    }
  });
});

// ── G-7: 회피가 도로를 못 벗어난다 ──────────────────────────────────────────
//
// 팀장이 근접 반발을 기각한 사유가 **도로 이탈**이었다. 이 처방은 위치를 안 만지고
// 차선 오프셋만 움직이지만, 그 오프셋도 무한히 크면 결국 인도로 나간다. `clampLane` 이
// 유일한 방벽이고, 그래서 여기서 그것만 본다.
describe('회피량이 얼마든 차도 안이다 (G-7)', () => {
  it('★ 어떤 회피량을 넣어도 |총 오프셋| + 반경 ≤ 차도 반폭', () => {
    const bad: string[] = [];
    for (const r of [0.2, 0.5, 0.9, 1.2]) {
      for (const raw of [-99, -3, -1, 0, 1, 3, 99]) {
        const t = clampLane(raw, r);
        if (t !== 0 && Math.abs(t) + r > LANE_BOUND + 1e-9) bad.push(`r=${r} raw=${raw} → ${t}`);
      }
    }
    expect(bad, `차도 밖 ${bad.length}건`).toEqual([]);
  });

  it('몸이 차도보다 넓으면 0 — 비킬 자리가 없다', () => {
    expect(clampLane(5, LANE_BOUND)).toBe(0);
    expect(clampLane(5, LANE_BOUND + 1)).toBe(0);
    expect(laneLimit(LANE_BOUND + 1)).toBe(0);
  });

  it('여유 안쪽 값은 그대로 통과한다 — 항상 자르면 회피가 장식이 된다', () => {
    expect(clampLane(0.7, 0.5)).toBeCloseTo(0.7, 6);
  });

  it('상한이 자르는 값과 같은 규칙에서 온다 — 둘이 갈리면 판단과 집행이 어긋난다', () => {
    for (const r of [0.2, 0.5, 1.0]) {
      expect(clampLane(1e9, r)).toBeCloseTo(laneLimit(r), 9);
    }
  });
});

// ── G-8: 얼마나 미리 보는가 ─────────────────────────────────────────────────
describe('미리 보는 거리가 유도된다 (G-8)', () => {
  it('느린 사람이 더 일찍 본다 — 비키는 데 오래 걸린다', () => {
    expect(lookAhead(0.8, 2.1)).toBeGreaterThan(lookAhead(1.3, 2.1));
  });

  it('빨리 다가올수록 더 일찍 본다', () => {
    expect(lookAhead(1.0, 3.0)).toBeGreaterThan(lookAhead(1.0, 1.5));
  });

  it('멈춘 사람은 0 — 나눗셈이 폭발하지 않는다', () => {
    expect(lookAhead(0, 2)).toBe(0);
  });

  it('비켜서는 데 걸리는 시간 안에 좁혀지는 거리다 — 코앞에서 알면 못 피한다', () => {
    // 차도 폭을 자기 속도로 건너는 시간 × 접근 속도. 그 시간 안에 상대가 오는 거리보다
    // 짧게 잡으면, 다 비키기 전에 부딪힌다.
    const speed = 1.0;
    const closing = 2.3;
    expect(lookAhead(speed, closing)).toBeCloseTo(((2 * LANE_BOUND) / speed) * closing, 6);
  });
});

// ── G-9: 전방·오른쪽 축이 직교한다 ──────────────────────────────────────────
//
// 두 축이 어긋나면 옆 사람을 앞사람으로 읽어, 아무도 앞에 없는데 계속 비켜 걷는다.
describe('전방과 오른쪽이 같은 관례에서 온다 (G-9)', () => {
  it('내적 0 — 직교한다', () => {
    for (const ry of [0, 0.7, Math.PI / 2, 2.4, Math.PI, -1.1]) {
      const f = forwardOf(ry);
      const r = rightOf(ry);
      expect(f.x * r.x + f.z * r.z, `ry=${ry} 에서 안 직교한다`).toBeCloseTo(0, 9);
    }
  });

  it('둘 다 단위벡터다 — 길이가 1 이 아니면 거리 분해가 왜곡된다', () => {
    for (const ry of [0, 1.2, -2.9]) {
      expect(Math.hypot(forwardOf(ry).x, forwardOf(ry).z)).toBeCloseTo(1, 9);
      expect(Math.hypot(rightOf(ry).x, rightOf(ry).z)).toBeCloseTo(1, 9);
    }
  });
});

// ── G-10: 닫힌 고리 — 실제로 몸이 벌어지는가 (검수관 게이트 명세) ───────────
//
// **이 파일에서 가장 중요한 검사다.** B1 이 여기로 샜다.
//
// 순수 함수는 전부 멀쩡했고 뮤테이션 12건이 전부 깨졌는데도, 목표 산출과 추종을 **합친
// 결과**는 틀려 있었다. 판정 쪽 검사는 반환값을 증분으로 봤고 집행부는 절대 가산항으로
// 썼다 — 둘이 의미에 동의하지 않는데 양쪽 다 통과했다. CLAUDE.md 가 이름 붙인
// *"경계를 건너는 지점은 아무도 안 본다"* 가 정확히 이것이다.
//
// 그래서 여기서는 **집행부와 같은 순서로 같은 함수를 부른다.** `features/npc.ts` 는
// `three/webgpu` 를 끌어와 단위 테스트로 못 돌리므로, 합성 지점을 순수 함수 경계로
// 끌어올렸다(`laneTarget` → `stepLane`). 그 두 함수를 npc.ts 와 같은 순서로 부른다.
describe('두 체가 실제로 스쳐 지나간다 — 닫힌 고리 (G-10)', () => {
  const DT = 1 / 60;
  const R = 0.5;
  const GAP = 2 * R;

  interface Body {
    x: number; z: number; dx: number; dz: number; speed: number;
    ox: number; oz: number; rx: number; rz: number; ry: number;
  }

  const make = (x: number, z: number, dx: number, dz: number, speed: number): Body => ({
    x, z, dx, dz, speed, ox: 0, oz: 0, rx: x, rz: z, ry: yawOf(dx, dz) ?? 0,
  });

  /**
   * `features/npc.ts` 의 per-walker 본문을 **같은 순서로** 돈다.
   * 전진 → yaw → 이웃 분해 → 목표 → 추종 → 그린 자리 기입.
   */
  function run(bodies: Body[], steps: number) {
    let minCenter = Infinity;
    let minAhead = Infinity;
    let maxOff = 0;
    for (let i = 0; i < steps; i++) {
      for (const b of bodies) {
        b.x += b.dx * b.speed * DT;
        b.z += b.dz * b.speed * DT;
        const ry = yawOf(b.dx, b.dz);
        if (ry !== null) b.ry = ry;

        const seen: Ahead[] = [];
        for (const o of bodies) {
          if (o === b) continue;
          seen.push(relativeTo(b.ry, o.rx - b.rx, o.rz - b.rz));
        }
        const target = laneTarget(
          seen,
          relativeTo(b.ry, b.ox, b.oz).side,
          laneOffset(R),
          GAP,
          lookAhead(b.speed, b.speed + 1.3),
          R,
        );
        const next = stepLane(b.ox, b.oz, b.ry, target, b.speed * DT);
        b.ox = next.ox;
        b.oz = next.oz;
        b.rx = b.x + b.ox;
        b.rz = b.z + b.oz;
        maxOff = Math.max(maxOff, Math.hypot(b.ox, b.oz));
        for (const o of seen) minAhead = Math.min(minAhead, o.ahead);
      }
      const [a, c] = bodies;
      minCenter = Math.min(minCenter, Math.hypot(a.rx - c.rx, a.rz - c.rz));
    }
    return { minCenter, minAhead, maxOff };
  }

  it('★ 같은 방향 추월 — B1 이 정확히 여기서 절반만 벌렸다', () => {
    // 뒤차가 빠르다. 둘 다 북(-Z). 앞차를 따라잡아 지나간다.
    const r = run([make(0, -14, 0, -1, 0.8), make(0, 0, 0, -1, 1.3)], 2400);
    // 조우가 실제로 일어났는가 — 안 만났으면 아래 단언이 공허하다(검수관 명세).
    expect(r.minAhead, '두 체가 스쳐 지나가지 않았다 — 검사가 공허하다').toBeLessThanOrEqual(0);
    expect(
      r.minCenter,
      `추월 최소 중심거리 ${r.minCenter.toFixed(3)}m ≤ 몸 폭 합 ${GAP}m`,
    ).toBeGreaterThanOrEqual(GAP - 1e-6);
  });

  it('★ 대향 정면 — 차선만으로도 덮이지만 회피가 망치지 않는지 본다', () => {
    const r = run([make(0, -14, 0, -1, 1.0), make(0, 14, 0, 1, 1.0)], 2400);
    expect(r.minAhead, '두 체가 스쳐 지나가지 않았다').toBeLessThanOrEqual(0);
    expect(
      r.minCenter,
      `대향 최소 중심거리 ${r.minCenter.toFixed(3)}m ≤ 몸 폭 합 ${GAP}m`,
    ).toBeGreaterThanOrEqual(GAP - 1e-6);
  });

  it('오프셋이 상한을 안 넘는다 — 시뮬 내내 (검수관 R1)', () => {
    const r = run([make(0, -14, 0, -1, 0.8), make(0, 0, 0, -1, 1.3)], 2400);
    expect(r.maxOff).toBeLessThanOrEqual(laneLimit(R) + 1e-9);
  });

  it('★ 옛 형태(증분을 차선에 더하기)면 이 검사가 깨진다 — 검출력 확인', () => {
    // B1 을 코드로 굳힌다. 옛 합성은 `clampLane(lane + dodge)` 였고, 그 `dodge` 는
    // 지금 자리 기준 증분이었다. 고정점이 `(lane + p + gap)/2` 라 확보량이 `gap/2` 다.
    const old = (others: Ahead[], cur: number) => {
      let near: Ahead | null = null;
      for (const o of others) {
        if (o.ahead <= 0 || o.ahead > 20) continue;
        if (Math.abs(o.side) >= GAP) continue;
        if (!near || o.ahead < near.ahead) near = o;
      }
      const dodge = !near ? 0 : near.side <= 0 ? near.side + GAP : near.side - GAP;
      void cur;
      return clampLane(laneOffset(R) + dodge, R);
    };
    const bodies = [make(0, -14, 0, -1, 0.8), make(0, 0, 0, -1, 1.3)];
    let minCenter = Infinity;
    for (let i = 0; i < 2400; i++) {
      for (const b of bodies) {
        b.x += b.dx * b.speed * DT;
        b.z += b.dz * b.speed * DT;
        const ry = yawOf(b.dx, b.dz);
        if (ry !== null) b.ry = ry;
        const seen: Ahead[] = [];
        for (const o of bodies) {
          if (o === b) continue;
          seen.push(relativeTo(b.ry, o.rx - b.rx, o.rz - b.rz));
        }
        const next = stepLane(b.ox, b.oz, b.ry, old(seen, 0), b.speed * DT);
        b.ox = next.ox;
        b.oz = next.oz;
        b.rx = b.x + b.ox;
        b.rz = b.z + b.oz;
      }
      const [a, c] = bodies;
      minCenter = Math.min(minCenter, Math.hypot(a.rx - c.rx, a.rz - c.rz));
    }
    expect(minCenter, '옛 형태가 몸을 벌린다 — 이 검사가 무력하다').toBeLessThan(GAP);
  });
});

// ── G-11: 오프셋 노름 불변식 (검수관 R1) ────────────────────────────────────
//
// `clampLane` 은 **목표**만 자른다. 실제로 얹히는 것은 그 목표를 향해 걷는 중인
// `(ox, oz)` 이고, 그것은 어느 검사도 안 봤다. 볼록성으로 안전하지만 — 0 에서 출발해
// 노름 ≤ lim 인 점을 향해 선분 위를 움직이므로 반경 lim 공을 못 벗어난다 — 그 논증이
// 코드에도 검사에도 없었다. 논증 대신 검사를 둔다.
describe('오프셋 노름이 상한 안이다 (G-11)', () => {
  it('★ 90° 전환을 포함한 경로 내내 |(ox,oz)| ≤ lim', () => {
    const R = 0.5;
    const lim = laneLimit(R);
    let ox = 0;
    let oz = 0;
    let worst = 0;
    // 네 방향을 차례로 돈다. 모퉁이에서 `ox` 가 옛 오른쪽 방향에 남아 임의 방향을
    // 가리키는 전이 구간이 생기는데, G-4 는 수직 오프셋만 훑어 이 구간을 못 본다.
    for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const ry = yawOf(dx, dz)!;
      for (let i = 0; i < 40; i++) {
        // 목표를 매번 극단으로 흔든다 — 가장 나쁜 전이를 만든다.
        const target = i % 2 === 0 ? lim : -lim;
        const next = stepLane(ox, oz, ry, target, 1.0 / 60);
        ox = next.ox;
        oz = next.oz;
        worst = Math.max(worst, Math.hypot(ox, oz));
      }
    }
    expect(worst, `노름 ${worst.toFixed(4)} > 상한 ${lim}`).toBeLessThanOrEqual(lim + 1e-9);
  });

  it('목표에 도달하면 멈춘다 — 지나쳐서 진동하면 사람이 떤다', () => {
    const ry = yawOf(0, -1)!;
    let ox = 0;
    let oz = 0;
    for (let i = 0; i < 500; i++) {
      const n = stepLane(ox, oz, ry, 1.0, 0.05);
      ox = n.ox;
      oz = n.oz;
    }
    const r = rightOf(ry);
    expect(ox).toBeCloseTo(r.x * 1.0, 6);
    expect(oz).toBeCloseTo(r.z * 1.0, 6);
  });

  it('걷는 속도를 안 넘는다 — 옆걸음이 앞걸음보다 빠를 이유가 없다', () => {
    const ry = yawOf(0, -1)!;
    const step = 0.02;
    const n = stepLane(0, 0, ry, 99, step);
    expect(Math.hypot(n.ox, n.oz)).toBeCloseTo(step, 9);
  });
});

// ── G-5: 집행이 실제로 소비하는가 ───────────────────────────────────────────
//
// 판정/집행 경계의 구멍이다 — CLAUDE.md 가 이름 붙인 자리이고, 위 검사는 전부 판정
// 쪽만 본다. `features/npc.ts` 는 `three/webgpu` 를 import 해서 단위 테스트로 못 돌리므로
// 소스를 읽어 배선을 본다. **문자열 검사의 한계를 알고 쓴다** — 이것만으로는 부족해서
// 진단(`lanes`·`minPairDist`)을 함께 냈다.
describe('집행부가 차선을 실제로 얹는다 (G-5)', () => {
  const src = readFileSync('frontend/js/world2/features/npc.ts', 'utf8');

  it('그리는 자리가 경로 좌표가 아니다 — 그대로 그리면 처방이 없는 것과 같다', () => {
    const line = src.split('\n').find((l) => /group\.position\.set\(/.test(l));
    expect(line, '`group.position.set(` 을 못 찾았다 — 구조가 바뀌었다').toBeTruthy();
    // `set(w.x, 0, w.z)` 로 되돌아가면 여기서 잡힌다. 이것이 처방 이전의 코드다.
    expect(line!, '경로 좌표를 그대로 그린다 — 전원이 같은 선 위를 걷는다')
      .not.toMatch(/w\.x|w\.z/);
    expect(line!, '그린 자리를 남기지 않는다 — 진단이 볼 것이 없어진다').toMatch(/w\.rx/);
  });

  it('그린 자리가 오프셋을 포함한다 — rx 가 경로 좌표만이면 처방이 끊긴 것이다', () => {
    // `w.rx =` 는 두 곳이다 — 재배치(오프셋 리셋과 짝, 검수관 R3)와 매 프레임 기입.
    // **매 프레임 쪽**이 오프셋을 얹는지가 관심사다.
    const lines = src.split('\n').filter((l) => /w\.rx\s*=/.test(l));
    expect(lines.length, '`w.rx =` 를 못 찾았다 — 구조가 바뀌었다').toBeGreaterThan(0);
    expect(
      lines.some((l) => /w\.ox/.test(l)),
      `그린 자리에 차선이 안 얹힌다 — 찾은 줄: ${lines.join(' / ')}`,
    ).toBe(true);
  });

  it('오프셋 크기를 npc.ts 가 직접 정하지 않는다 — 유도는 decide 소관이다', () => {
    expect(src, 'laneOffset 을 안 쓴다').toContain('laneOffset');
    // 차도 반폭·차선 거리를 숫자로 적으면 도로가 바뀌어도 안 따라온다. 값뿐 아니라
    // 주석에 적는 것도 미러링이다(이 저장소가 세 번 데인 형태).
    //
    // ⚠ **가드 자체가 미러링이었다**(검수관 R5). 예전에는 `1.25|2.5` 를 정규식에 박아
    // 뒀는데, 그것은 **오늘의 유도값 두 개를 문자열로 베낀 것**이다. `ROAD_SEG` 가
    // 바뀌면 이 가드는 조용히 아무것도 안 지키고 새 하드코딩은 그대로 통과한다.
    // 그래서 **실물에서 금지어를 만든다.**
    // 정수는 뺀다 — `2` 같은 값은 배열 인덱스·나눗셈 등 온갖 곳에 정당하게 나온다.
    // 소수점을 가진 값만이 "이 도메인의 거리" 를 가리킨다.
    const forbidden = [LANE_BOUND, LANE_BOUND / 2, laneLimit(0.5)]
      .map((v) => Number(v.toFixed(6)))
      .filter((v) => !Number.isInteger(v))
      .map((v) => String(v).replace('.', '\\.'));
    expect(forbidden.length, '금지어가 하나도 안 만들어졌다 — 이 검사는 장식이다')
      .toBeGreaterThan(0);
    for (const num of forbidden) {
      expect(src, `차선 거리(${num})를 숫자로 적었다`)
        .not.toMatch(new RegExp(`(?<![\\d.])${num}(?![\\d])`));
    }
  });

  it('★ 목표를 집행부가 조립하지 않는다 — B1 이 그 조립에서 났다', () => {
    // 옛 코드: `const want = clampLane(w.lane + dodge, w.radius)`.
    // 증분(`dodge`)과 절대값(`w.lane`)을 더한 것이 결함이었다. 판정을 집행부가 다시
    // 조립하기 시작하면 같은 자리가 다시 열린다.
    expect(src, 'laneTarget 을 안 쓴다 — 목표를 여기서 만들고 있다').toContain('laneTarget(');
    expect(src, 'stepLane 을 안 쓴다 — 추종을 여기서 적분하고 있다').toContain('stepLane(');
    expect(src, '없앤 함수가 되살아났다').not.toContain('dodgeOffset');
    // 목표에 무언가를 더하는 형태가 돌아오면 잡는다. **코드 줄만 본다** — 주석에 옛
    // 형태를 인용하면(그리고 인용해야 한다, 왜 바뀌었는지가 거기 있으므로) 소스 전체
    // 매칭은 그 인용에 걸린다. 실제로 걸렸다.
    const code = src
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
    expect(code, '목표에 차선을 더하고 있다 — 기준이 다시 갈렸다')
      .not.toMatch(/w\.lane\s*\+/);
  });

  it('이웃 분해를 손으로 하지 않는다 — 같은 값을 두 곳이 다르게 해석한 것이 B1 이다', () => {
    expect(src, 'relativeTo 를 안 쓴다').toContain('relativeTo(');
    // 내적을 직접 쓰면 검사가 보는 축과 집행이 쓰는 축이 갈릴 수 있다.
    expect(src, '진행방향 분해를 손으로 한다').not.toMatch(/f\.x\s*\+.*f\.z/);
  });

  it('앞을 볼 때 자기 자신을 세지 않는다 — 자기 앞에 자기가 있으면 늘 비켜 걷는다', () => {
    // 상대 위치가 (0,0) 이라 `|side| < gap` 이 항상 참이고 `ahead > 0` 이 거짓이라
    // 지금은 우연히 걸러진다. 우연에 기대지 않도록 배선 자체를 못 박는다.
    expect(src, '자기 자신을 이웃 목록에서 안 뺀다').toMatch(/o === w/);
  });

  it('yaw 관례를 npc.ts 가 다시 적지 않는다 — rightOf 가 이 각을 입력으로 받는다', () => {
    // 관례가 두 곳에 있으면 한쪽만 고쳤을 때 사람들이 **왼쪽으로** 비켜선다.
    expect(src, 'atan2 를 직접 부른다 — yawOf 를 경유해야 한다').not.toMatch(/Math\.atan2/);
    expect(src).toContain('yawOf');
  });
});
