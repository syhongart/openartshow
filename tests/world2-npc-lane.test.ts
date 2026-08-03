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
import { laneOffset, rightOf, LANE_BOUND } from '../frontend/js/world2/decide/npc-lane.js';
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

  it('★ 네 방향 모두, 파셀을 가로지르는 내내 onRoad 다', () => {
    const L = laneOffset(0.5);
    expect(L, '오프셋이 0 이면 이 검사는 아무것도 안 본다').toBeGreaterThan(0);

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
      // 파셀 중심에서 그 방향 경계까지 훑는다(중심 기준 로컬 좌표 = onRoad 의 계약).
      for (let u = 0; u <= 0.5; u += 0.02) {
        const x = sx * cellX * u + r.x * L;
        const z = sz * cellZ * u + r.z * L;
        if (!onRoad(x, z, dirs)) bad.push(`(${x.toFixed(1)},${z.toFixed(1)})`);
      }
    }
    expect(bad.slice(0, 5), `도로 밖 ${bad.length}점`).toEqual([]);
  });

  it('차도 반폭이 도로 판정 반폭보다 좁다 — 그래서 위 검사가 자동으로 성립한다', () => {
    // 이 부등호가 뒤집히면 "차도 위" 와 "길 위" 가 갈라져 사람이 아스팔트 밖을 걷는다.
    expect(LANE_BOUND).toBeLessThan(ROAD_HALF);
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
    const line = src.split('\n').find((l) => /w\.rx\s*=/.test(l));
    expect(line, '`w.rx =` 를 못 찾았다 — 구조가 바뀌었다').toBeTruthy();
    expect(line!, '그린 자리에 차선이 안 얹힌다').toMatch(/w\.ox/);
  });

  it('오프셋 크기를 npc.ts 가 직접 정하지 않는다 — 유도는 decide 소관이다', () => {
    expect(src, 'laneOffset 을 안 쓴다').toContain('laneOffset');
    expect(src, 'rightOf 를 안 쓴다').toContain('rightOf');
    // 차도 반폭·차선 거리를 숫자로 적으면 도로가 바뀌어도 안 따라온다. 값뿐 아니라
    // 주석에 적는 것도 미러링이다(이 저장소가 세 번 데인 형태).
    expect(src, '차선 거리를 숫자로 적었다').not.toMatch(/(?<![\d.])(1\.25|2\.5)(?![\d])/);
  });

  it('yaw 관례를 npc.ts 가 다시 적지 않는다 — rightOf 가 이 각을 입력으로 받는다', () => {
    // 관례가 두 곳에 있으면 한쪽만 고쳤을 때 사람들이 **왼쪽으로** 비켜선다.
    expect(src, 'atan2 를 직접 부른다 — yawOf 를 경유해야 한다').not.toMatch(/Math\.atan2/);
    expect(src).toContain('yawOf');
  });
});
