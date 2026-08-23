// 격자 SSOT 테스트 — 세계의 크기와 블록 나눔.
//
// 감독 지시: *"월드 1처럼 격자로 해주고. 가로 30. 세로 30 으로 하자. 칸의 크기는 모두
// 같은 크기가 아니라 조금 달랐으면해. 2개 셀이 한개인것도 있고."*
//
// 여기서 지켜야 할 것이 서로 당긴다. **격자여야 하고**(길이 끊기면 안 된다) 동시에
// **고르지 않아야 한다**(전부 같은 칸이면 바둑판이다). 한쪽만 검사하면 다른 쪽이 조용히
// 무너진다 — `blockPattern` 이 늘 `None` 을 돌려줘도 "격자다" 테스트는 전부 통과한다.

import { describe, it, expect } from 'vitest';
import {
  GRID_W, GRID_H, GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z,
  inGrid, isCentralPlaza as isPlaza, centralPlazaCell, plazaCenter, PLAZA_R, SPAWN,
  blockPattern, gridEdgeX, gridEdgeZ, BlockPattern,
} from '../frontend/js/world2/decide/grid.js';
import { FOUNTAIN_R } from '../frontend/js/world2/parts/fountain.js';
import { blockersOf, blocked, slide } from '../frontend/js/world2/decide/collide.js';
import { parcelLayout, DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { DEFAULT_BODY_R as BODY_R } from '../frontend/js/world2/systems/collision.js';

describe('세계의 크기 — 감독 확정 30×30', () => {
  it('가로세로 30칸이다', () => {
    expect(GRID_W).toBe(30);
    expect(GRID_H).toBe(30);
    expect(GRID_MAX_X - GRID_MIN_X + 1).toBe(GRID_W);
    expect(GRID_MAX_Z - GRID_MIN_Z + 1).toBe(GRID_H);
  });

  // 0-기반(0…29)으로 두면 스폰 지점 `(0,0)` 이 세계의 **모서리**가 된다. 원점이 안쪽
  // 깊숙이 있어야 어느 방향으로 걸어도 세계가 이어진다.
  it('원점이 세계 한복판이다 — 스폰이 모서리면 안 된다', () => {
    expect(inGrid(0, 0)).toBe(true);
    expect(GRID_MIN_X).toBeLessThan(-10);
    expect(GRID_MAX_X).toBeGreaterThan(10);
    expect(GRID_MIN_Z).toBeLessThan(-10);
    expect(GRID_MAX_Z).toBeGreaterThan(10);
  });

  it('경계 바로 밖은 세계가 아니다', () => {
    expect(inGrid(GRID_MIN_X, 0)).toBe(true);
    expect(inGrid(GRID_MIN_X - 1, 0)).toBe(false);
    expect(inGrid(GRID_MAX_X, 0)).toBe(true);
    expect(inGrid(GRID_MAX_X + 1, 0)).toBe(false);
    expect(inGrid(0, GRID_MIN_Z - 1)).toBe(false);
    expect(inGrid(0, GRID_MAX_Z + 1)).toBe(false);
  });

  it('칸 수가 정확히 30×30 이다 — 넉넉히 훑어 센다', () => {
    let n = 0;
    for (let px = -40; px <= 40; px++) for (let pz = -40; pz <= 40; pz++) if (inGrid(px, pz)) n++;
    expect(n).toBe(GRID_W * GRID_H);
  });
});

describe('중앙 광장', () => {
  const CELL = 32;

  it('홀수 변이다 — 짝수면 가운데 칸이 없어 분수대가 중앙에 못 선다', () => {
    const side = PLAZA_R * 2 + 1;
    expect(side % 2).toBe(1);
    let n = 0;
    for (let px = -40; px <= 40; px++) for (let pz = -40; pz <= 40; pz++) if (isPlaza(px, pz)) n++;
    expect(n).toBe(side * side);
  });

  // ── 이 검사가 2×2 의 오류를 잡는다 ────────────────────────────────────────
  // 처음엔 `(-1,0)×(-1,0)` 2×2 로 두고 "그래야 중심이 원점" 이라고 적었다. 파셀
  // `(px,pz)` 의 중심은 `(px·cell, pz·cell)` 이므로 그 2×2 의 한가운데는 (-16,-16) 이다.
  // **분수대가 광장 한복판에 안 선다.** 중심 칸이 존재하고 그 칸의 중심이 원점이어야
  // 오프셋 없이 가운데에 온다.
  it('가운데 칸의 중심이 곧 월드 원점이다 — 분수대가 오프셋 없이 한복판에 선다', () => {
    const c = plazaCenter();
    expect(c.x).toBe(0);
    expect(c.z).toBe(0);
    // 가운데 칸을 찾아 그 칸의 월드 중심이 광장 중심과 같은지 본다
    let found = 0;
    for (let px = -PLAZA_R; px <= PLAZA_R; px++) {
      for (let pz = -PLAZA_R; pz <= PLAZA_R; pz++) {
        if (centralPlazaCell(px, pz) !== 'center') continue;
        found++;
        expect(px * CELL).toBe(c.x);
        expect(pz * CELL).toBe(c.z);
      }
    }
    expect(found).toBe(1); // 표본이 비면 위 단언이 한 번도 안 돈다
  });

  it('이름 붙은 자리가 각각 하나씩, 서로 다른 칸이다', () => {
    // ── 목록을 미리 적지 않는다 ─────────────────────────────────────────────
    // 예전엔 `{ center: [], north: [] }` 로 시작했고, 그래서 `west`(미술관 자리)가
    // 생기자 **단언이 아니라 `at[cell].push` 가 TypeError 로 죽었다.** 테스트가 새 자리를
    // "계약 위반" 이 아니라 "크래시" 로 알린 것이라, 무엇이 틀렸는지가 안 보였다.
    // 발견한 것을 모으고 나서 판정하면 그 실패가 읽히는 형태가 된다.
    const at = new Map<string, string[]>();
    for (let px = -PLAZA_R; px <= PLAZA_R; px++) {
      for (let pz = -PLAZA_R; pz <= PLAZA_R; pz++) {
        const cell = centralPlazaCell(px, pz);
        if (!cell || cell === 'edge') continue;
        const list = at.get(cell) ?? [];
        list.push(`${px},${pz}`);
        at.set(cell, list);
      }
    }
    // **이름 목록 자체가 계약이다.** 자리를 늘리거나 줄이는 것은 의도적 변경이므로
    // 여기도 함께 고쳐야 한다 — 저절로 따라오면 자리가 소리 없이 사라져도 초록이다.
    expect([...at.keys()].sort()).toEqual(['center', 'north', 'west']);
    for (const [name, cells] of at) expect(cells, `${name} 의 칸`).toHaveLength(1);
    const all = [...at.values()].flat();
    expect(new Set(all).size, '두 자리가 같은 칸을 가리킨다').toBe(all.length);
  });

  it('광장 밖에는 자리가 없다 — 중앙이 유일해야 특별하다', () => {
    for (const [px, pz] of [[5, 5], [-9, 2], [0, 7], [12, -12], [PLAZA_R + 1, 0]]) {
      expect(centralPlazaCell(px, pz)).toBeNull();
    }
  });

  // ── 검수관이 잡은 블로커 ──────────────────────────────────────────────────
  // 스폰이 원점이었고 분수대도 원점에 선다. 이 프로젝트에는 플레이어-메시 충돌이 없어
  // 아무것도 밀어내지 않으므로 **부팅 첫 프레임부터 카메라가 분수대 안에** 있었다.
  // 눈높이 1.7m 와 분수대 꼭대기 1.70m 가 소수점까지 겹치기까지 했다.
  //
  // 좌표 판정은 전부 초록이었다 — 광장이 뭍인가, 분수대가 어느 칸에 서는가는 다 맞았다.
  // **계산된 좌표가 실제 지오메트리와 만나는 지점을 아무도 안 봤다.** 그 경계를 여기서
  // 막는다. 분수대를 키우거나 스폰을 옮기면 이 테스트가 먼저 깨진다.
  describe('스폰 안전', () => {
    it('스폰이 분수대 밖이다 — 충돌이 없으므로 좌표로만 지킬 수 있다', () => {
      const d = Math.hypot(SPAWN.x - plazaCenter().x, SPAWN.z - plazaCenter().z);
      // 분수대 밑동에 사람 반경(0.3)과 여유를 더한 만큼은 떨어져야 한다
      expect(d).toBeGreaterThan(FOUNTAIN_R + 1);
    });

    it('스폰이 중앙 광장 안이다 — 첫 화면이 광장이어야 한다', () => {
      const px = Math.round(SPAWN.x / CELL);
      const pz = Math.round(SPAWN.z / CELL);
      expect(isPlaza(px, pz)).toBe(true);
    });

    it('스폰에서 분수대가 화각 안이다 — yaw=0 은 -z 를 본다', () => {
      // facing(0) = (0,-1). 분수대(원점)가 그 방향에 있으려면 스폰 z 가 양수여야 한다.
      expect(SPAWN.z).toBeGreaterThan(0);
      // ⚠ 여기 원래 `expect(SPAWN.x).toBe(plazaCenter().x)` 였고 주석은 *"좌우로 치우치면
      // 정면이 아니다"* 였다. **그 단언이 스폰을 분수대 정면에 못 박고 있었고**, 충돌
      // (#182)이 붙자 그 자리가 6.9m 만 걷고 멈추는 자리가 됐다(검수관 반려 B1).
      // 감독 판정 *"스폰을 옆으로 비킨다"* 로 x 를 옮겼으므로 요건을 **화각**으로 바꾼다 —
      // 지켜야 할 것은 "정중앙" 이 아니라 "첫 화면에 분수대가 보인다" 였다.
      const theta = (Math.atan2(Math.abs(SPAWN.x - plazaCenter().x), SPAWN.z) * 180) / Math.PI;
      expect(theta).toBeLessThan(25); // 카메라 fov 60° → 수평 반각이 이보다 넓다
    });

    // ── 충돌이 붙은 뒤 생긴 요건 둘 (#182) ───────────────────────────────────
    //
    // 위 세 검사는 **좌표 거리**만 본다. 그것으로는 부족하다는 것이 충돌 도입으로
    // 드러났다 — 분수대에서 10m 떨어져 있어도 `slide` 가 옆으로 빼줄 성분이 없으면
    // 앞으로 6.9m 밖에 못 간다. `FOUNTAIN_R + 1` 은 통과하는데 화면에서는 벽 앞이다.
    //
    // 그래서 **실제 충돌 모듈을 돌려** 확인한다. `decide/collide.ts` 는 순수 함수라
    // 브라우저 없이 그대로 부를 수 있다 — 판정/집행 경계를 넘는 검사를 여기서 만든다.
    describe('충돌 이후 요건 — 좌표 거리로는 부족했다', () => {
      // 셀 크기는 `DEFAULT_LAYOUT` 에서 읽는다 — 위 `CELL = 32` 는 이 파일이 예전부터
      // 들고 있는 사본이고, 여기서 그것을 또 쓰면 값 미러링이 한 겹 늘어난다.
      const CX = DEFAULT_LAYOUT.cellX;
      const CZ = DEFAULT_LAYOUT.cellZ;

      /** 스폰 3×3 파셀의 모든 원. `systems/collision.ts` 의 `rebuild` 와 같은 범위다 */
      const blockersNear = (x: number, z: number) => {
        const px = Math.round(x / CX);
        const pz = Math.round(z / CZ);
        const out = [];
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const qx = px + dx;
            const qz = pz + dz;
            out.push(...blockersOf(parcelLayout(qx, qz, 'near', DEFAULT_LAYOUT), qx * CX, qz * CZ));
          }
        }
        return out;
      };

      it('스폰이 어느 원에도 안 걸린다 — 갇힘 가드에 의존하지 않는다', () => {
        expect(blocked(SPAWN.x, SPAWN.z, blockersNear(SPAWN.x, SPAWN.z), BODY_R)).toBe(false);
      });

      it('스폰 둘레에 여유가 2m 넘게 남는다 — 코앞에 물체가 있으면 안 된다', () => {
        let gap = Infinity;
        for (const b of blockersNear(SPAWN.x, SPAWN.z)) {
          gap = Math.min(gap, Math.hypot(SPAWN.x - b.x, SPAWN.z - b.z) - b.r - BODY_R);
        }
        // 실측 2.89m(x=-3.5). 2m 로 잡은 이유는 그 아래로 내려가면 스폰 화면에 물체가
        // 코앞으로 들어오기 때문이고, 스캔에서 x 를 한 칸 더 비키면(-4.5) 1.96m 라
        // **이 검사가 그 칸을 실제로 거른다**(임계가 장식이 아니라는 확인).
        expect(gap).toBeGreaterThan(2);
      });

      it('스폰에서 정면으로 20m 는 걸을 수 있다 — 벽 앞에 세워두지 않는다', () => {
        // **여기서 멈춘다.** 장거리(80m+)를 요구하지 않는다 — `grid.ts` 의 SPAWN 주석에
        // 적은 대로 그 값은 폭 0.4m 짜리 틈에만 존재하는 우연이고, 배치를 만지면 사라진다.
        // 세션이 파셀을 몇 개 건너는가는 주행 쪽(`measure-invariants.mjs`)이 책임진다.
        const step = 0.05;
        // `SPAWN` 이 `as const` 라 리터럴 타입(`-3.5`)이다 — 명시 없이 `let` 으로 받으면
        // 재대입이 타입 에러가 된다.
        let x: number = SPAWN.x;
        let z: number = SPAWN.z;
        let moved = 0;
        for (let i = 0; i < 600; i++) {
          const b = blockersNear(x, z);
          const r = slide(x, z, 0, -step, b, BODY_R);
          moved += Math.hypot(r.x - x, r.z - z);
          x = r.x; z = r.z;
        }
        expect(moved).toBeGreaterThan(20);
      });
    });
  });

  it('광장은 세계 안에 있다', () => {
    for (let px = -PLAZA_R - 1; px <= PLAZA_R + 1; px++) {
      for (let pz = -PLAZA_R - 1; pz <= PLAZA_R + 1; pz++) {
        if (isPlaza(px, pz)) expect(inGrid(px, pz)).toBe(true);
      }
    }
  });
});

describe('블록 — "칸의 크기가 조금 달랐으면"', () => {
  it('패턴이 결정론이다 — 같은 슈퍼셀은 언제나 같은 나눔', () => {
    for (let i = -20; i < 20; i++) {
      expect(blockPattern(i, i * 3)).toBe(blockPattern(i, i * 3));
    }
  });

  it('다섯 패턴이 모두 나온다 — 하나라도 안 나오면 그 가지는 죽은 코드다', () => {
    const seen = new Set<number>();
    for (let sx = -30; sx <= 30; sx++) for (let sz = -30; sz <= 30; sz++) seen.add(blockPattern(sx, sz));
    expect(seen.size).toBe(5);
  });

  it('대부분은 나누지 않는다 — 2칸 블록이 흔하면 그것도 규칙적이다', () => {
    let none = 0, n = 0;
    for (let sx = -40; sx <= 40; sx++) for (let sz = -40; sz <= 40; sz++) { if (blockPattern(sx, sz) === BlockPattern.None) none++; n++; }
    expect(none / n).toBeGreaterThan(0.3);  // 설계값 0.4
    expect(none / n).toBeLessThan(0.5);
  });
});

describe('격자 경계 — 이어지되 고르지 않다', () => {
  // 슈퍼셀 **사이**의 경계까지 꺼지면 4칸·6칸짜리 블록이 생겨 격자가 무너진다.
  it('슈퍼셀 사이 경계는 언제나 길이다', () => {
    for (let px = -30; px <= 30; px++) {
      for (let pz = -30; pz <= 30; pz++) {
        // px 가 홀수면 (px, px+1) 이 서로 다른 슈퍼셀이다
        if (Math.abs(px % 2) === 1) expect(gridEdgeX(px, pz)).toBe(true);
        if (Math.abs(pz % 2) === 1) expect(gridEdgeZ(px, pz)).toBe(true);
      }
    }
  });

  it('내부 경계가 실제로 꺼진다 — 안 꺼지면 전부 같은 크기다', () => {
    let offX = 0, offZ = 0;
    for (let px = -30; px <= 30; px++) {
      for (let pz = -30; pz <= 30; pz++) {
        if (!gridEdgeX(px, pz)) offX++;
        if (!gridEdgeZ(px, pz)) offZ++;
      }
    }
    expect(offX).toBeGreaterThan(0);
    expect(offZ).toBeGreaterThan(0);
  });

  // ── 음수 좌표 — 세계의 절반이 걸려 있다 ────────────────────────────────────
  //
  // 이 검사는 **뮤테이션이 만들게 했다.** 처음에는 "음수 쪽에서도 슈퍼셀이 어긋나지
  // 않는다"는 이름으로 `floorMod` 를 겨냥한 것을 두었는데, `floorMod` 를 JS 의 `%` 로
  // 바꾸는 뮤테이션이 **전부 통과했다.** 알고 보니 `floorMod` 는 `=== 0`(짝수인가)
  // 판정에만 쓰여 `%` 와 동치였고, 진짜 위험한 것은 `floorDiv` 였다.
  //
  // `floorDiv(-1,2)` 는 -1 이지만 `Math.trunc(-1/2)` 는 0 이다. 그러면 **홀수 `pz` 에서
  // 위 슈퍼셀이 아래 슈퍼셀의 패턴을 본다.** 증상은 블록이 반쪽만 병합되는 것 —
  // 한 슈퍼셀의 위 행은 병합됐는데 아래 행은 안 된 모습이다.
  //
  // 그것을 잡으려면 **같은 슈퍼셀의 두 행이 같은 패턴에 따라 움직이는지** 봐야 한다.
  it('같은 슈퍼셀의 두 행이 하나의 패턴을 공유한다 — 반쪽 병합이 없다', () => {
    for (let sx = -12; sx <= 12; sx++) {
      for (let sz = -12; sz <= 12; sz++) {
        const px = sx * 2, top = sz * 2, bottom = sz * 2 + 1;
        const p = blockPattern(sx, sz);
        // 가로 병합이면 두 행 중 **정확히 하나만** 꺼져 있어야 한다.
        const offTop = !gridEdgeX(px, top);
        const offBottom = !gridEdgeX(px, bottom);
        if (p === BlockPattern.HorizTop) {
          expect([offTop, offBottom]).toEqual([true, false]);
        } else if (p === BlockPattern.HorizBottom) {
          expect([offTop, offBottom]).toEqual([false, true]);
        } else {
          expect([offTop, offBottom]).toEqual([false, false]);
        }
      }
    }
  });

  it('같은 슈퍼셀의 두 열이 하나의 패턴을 공유한다 — 세로도 마찬가지다', () => {
    for (let sx = -12; sx <= 12; sx++) {
      for (let sz = -12; sz <= 12; sz++) {
        const pz = sz * 2, left = sx * 2, right = sx * 2 + 1;
        const p = blockPattern(sx, sz);
        const offLeft = !gridEdgeZ(left, pz);
        const offRight = !gridEdgeZ(right, pz);
        if (p === BlockPattern.VertLeft) {
          expect([offLeft, offRight]).toEqual([true, false]);
        } else if (p === BlockPattern.VertRight) {
          expect([offLeft, offRight]).toEqual([false, true]);
        } else {
          expect([offLeft, offRight]).toEqual([false, false]);
        }
      }
    }
  });

  it('음수·양수 양쪽에서 블록 병합이 고르게 일어난다', () => {
    const count = (x0: number, x1: number) => {
      let off = 0;
      for (let px = x0; px < x1; px++) for (let pz = x0; pz < x1; pz++) { if (!gridEdgeX(px, pz)) off++; if (!gridEdgeZ(px, pz)) off++; }
      return off;
    };
    const neg = count(-30, 0), pos = count(0, 30);
    // 한쪽만 0이면 음수 나눗셈이 깨진 것이다
    expect(neg).toBeGreaterThan(0);
    expect(pos).toBeGreaterThan(0);
    // 대략 비슷해야 한다 — 2배 넘게 벌어지면 좌표계가 한쪽으로 쏠린 것
    expect(Math.max(neg, pos) / Math.min(neg, pos)).toBeLessThan(2);
  });
});
