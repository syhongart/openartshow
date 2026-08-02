// 용도 지대 판정 — 도심이 실제로 도심인가.
//
// ── 왜 이 테스트가 필요한가 ─────────────────────────────────────────────────
// `TOWER_P_CORE`·`TOWER_P_OUTER`·`DOWNTOWN_R` 은 **실측으로 고른 값이 아니다.**
// `PLAZA_P` 는 601×601 격자에 400지점을 샘플링해 "최근접 광장까지 거리 중앙값" 을
// 안개 가시거리와 비교해 골랐는데(`parts/plaza.ts`), 타워는 그 작업을 아직 안 했다.
//
// 그래서 **분포를 여기서 못 박는다.** 값을 바꾸면 이 단언이 깨지므로, 바꾸는 사람이
// "무엇이 달라지는지" 를 보고 바꾸게 된다. 값 자체를 다시 적지 않고 **관계**를 적는다 —
// 그러면 값을 조정해도 의도가 살아 있다.

import { describe, it, expect } from 'vitest';
import {
  isTowerParcel, isDowntown, DOWNTOWN_R, TOWER_P_CORE, TOWER_P_OUTER,
} from '../frontend/js/world2/parts/zoning.js';
import { isPlaza } from '../frontend/js/world2/parts/plaza.js';
import { roadDirs } from '../frontend/js/world2/parts/road-topology.js';
import { isCentralPlaza, GRID_MIN_X, GRID_MAX_X } from '../frontend/js/world2/decide/grid.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';
import { parcelLayout } from '../frontend/js/world2/decide/parcel-layout.js';

const CX = DEFAULT_LAYOUT.cellX;
const CZ = DEFAULT_LAYOUT.cellZ;
const isTower = (px: number, pz: number) => isTowerParcel(px, pz, CX, CZ);

/** 격자 전체를 훑어 타워 파셀을 모은다 — 세계는 30×30 이라 전수 조사가 가능하다 */
function sweep() {
  const core: Array<[number, number]> = [];
  const outer: Array<[number, number]> = [];
  let coreTotal = 0;
  let outerTotal = 0;
  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_X; pz <= GRID_MAX_X; pz++) {
      if (isDowntown(px, pz)) coreTotal++; else outerTotal++;
      if (!isTower(px, pz)) continue;
      (isDowntown(px, pz) ? core : outer).push([px, pz]);
    }
  }
  return { core, outer, coreTotal, outerTotal };
}

describe('도심 판정 — 체비쇼프 거리', () => {
  it('중앙이 도심이다 — 스폰 주변이 도시의 중심이어야 한다', () => {
    expect(isDowntown(0, 0)).toBe(true);
  });

  it('경계가 정확하다 — 반경 안은 포함, 밖은 제외', () => {
    expect(isDowntown(DOWNTOWN_R, 0)).toBe(true);
    expect(isDowntown(DOWNTOWN_R + 1, 0)).toBe(false);
    // 대각선도 같다. 유클리드였다면 (R,R) 이 밖으로 나간다 — 격자가 사각형이므로
    // 도심도 사각형이어야 블록 경계와 어긋나지 않는다.
    expect(isDowntown(DOWNTOWN_R, DOWNTOWN_R)).toBe(true);
  });

  it('부호에 대칭이다 — 도심이 한쪽으로 쏠리지 않는다', () => {
    for (const [x, z] of [[3, 4], [-3, 4], [3, -4], [-3, -4]] as const) {
      expect(isDowntown(x, z)).toBe(true);
    }
  });
});

describe('타워 파셀 — 배제 조건', () => {
  it('중앙 광장에는 서지 않는다 — 스폰 지점을 60m 짜리로 막으면 안 된다', () => {
    for (let px = -1; px <= 1; px++) {
      for (let pz = -1; pz <= 1; pz++) {
        if (!isCentralPlaza(px, pz)) continue;
        expect(isTower(px, pz), `중앙광장 (${px},${pz}) 에 타워가 섰다`).toBe(false);
      }
    }
  });

  it('★ 광장에는 서지 않는다 — 트인 곳이 목적인 자리다', () => {
    const { core, outer } = sweep();
    for (const [px, pz] of [...core, ...outer]) {
      expect(isPlaza(px, pz), `광장 (${px},${pz}) 에 타워가 섰다`).toBe(false);
    }
  });

  it('★ 길이 닿지 않는 파셀에는 서지 않는다 — 갈 수 없는 랜드마크', () => {
    const { core, outer } = sweep();
    for (const [px, pz] of [...core, ...outer]) {
      expect(roadDirs(px, pz).length, `고립 파셀 (${px},${pz}) 에 타워가 섰다`)
        .toBeGreaterThan(0);
    }
  });
});

describe('타워 분포 — 도심이 도심으로 읽히는가', () => {
  it('★ 도심 밀도가 외곽보다 확연히 높다 — 이 차이가 곧 스카이라인이다', () => {
    const { core, outer, coreTotal, outerTotal } = sweep();
    const coreRate = core.length / coreTotal;
    const outerRate = outer.length / outerTotal;
    // 배수를 못 박는다. 값(0.12/0.01)을 다시 적으면 그것이 값 미러링이고, 확률을
    // 조정할 때마다 여기도 손대야 한다. **관계**만 본다 — 도심이 최소 3배는 빽빽해야
    // 걸어 들어갈 때 "여기가 중심이구나" 가 읽힌다.
    expect(coreRate, `도심 ${(coreRate * 100).toFixed(1)}% vs 외곽 ${(outerRate * 100).toFixed(1)}%`)
      .toBeGreaterThan(outerRate * 3);
  });

  it('★ 도심에 타워가 실제로 선다 — 확률이 낮아 0 이 되면 도심이 없는 것이다', () => {
    const { core } = sweep();
    // 하한만 본다. 몇 개인지는 확률·격자·도로 패턴이 함께 정하므로 숫자를 박으면
    // 그 셋 중 하나만 바뀌어도 거짓 실패가 난다.
    expect(core.length, '도심에 타워가 하나도 없다').toBeGreaterThanOrEqual(5);
  });

  it('외곽에도 아주 가끔 선다 — 0 이면 도시의 끝이 뚝 끊긴다', () => {
    const { outer } = sweep();
    expect(outer.length, '외곽 타워가 0 이다 — TOWER_P_OUTER 가 죽었는가').toBeGreaterThan(0);
  });

  it('★ 세계를 타워로 덮지 않는다 — 희소해야 랜드마크다', () => {
    const { core, outer, coreTotal, outerTotal } = sweep();
    const all = (core.length + outer.length) / (coreTotal + outerTotal);
    // 전체의 5% 를 넘으면 스무 파셀에 하나꼴이라 "가끔 만나는 것" 이 아니게 된다.
    expect(all, `전체 타워 비율 ${(all * 100).toFixed(1)}%`).toBeLessThan(0.05);
  });

  it('확률 상수가 도심 > 외곽 관계를 유지한다 — 뒤집히면 도심이 뒤바뀐다', () => {
    expect(TOWER_P_CORE).toBeGreaterThan(TOWER_P_OUTER);
    expect(TOWER_P_OUTER).toBeGreaterThan(0);
  });
});

describe('결정론 — 같은 파셀은 언제 물어도 같은 답', () => {
  it('여러 번 불러도 답이 안 바뀐다 — 난수 스트림이 아니라 좌표 해시다', () => {
    // 파셀은 tier 마다 다시 계산되고 재방문 시에도 다시 계산된다. 순서 의존이면
    // 걸어갔다 돌아올 때마다 타워가 나타났다 사라진다.
    for (const [px, pz] of [[3, 4], [-7, 2], [11, -9], [0, 5]] as const) {
      const first = isTower(px, pz);
      for (let i = 0; i < 5; i++) expect(isTower(px, pz)).toBe(first);
    }
  });
});

// ── 셋백 실패 가지 — 죽은 분기를 죽은 채 두지 않는다 (검수관 R4) ────────────
//
// `tower.place()` 는 파셀 중앙에 세워도 도로 셋백을 못 지키면 `[]` 를 돌려준다.
// 현재 `DEFAULT_LAYOUT`(cell 32) 에서는 그 조건이 **도달 불가능**하다:
//
//   16 − (SETBACK 6.0 + LAMP_CLEARANCE 0.9) − EAVE 0.6 = 8.5m  >  MAX_SIDE/2 = 6.5m
//
// 그대로 두면 파셀 크기나 셋백을 줄이는 변경이 왔을 때 **조용히 깨진다** — 타워가
// 소리 없이 사라지고, 그 실패는 `starved` 에도 안 잡힌다.
//
// ── 첫 판본은 이 가지를 못 쟀다 (뮤테이션이 드러냈다) ────────────────────────
// 처음에는 기본 셀에서 타워 파셀을 찾은 뒤 **그 좌표에** 좁은 셀을 넘겨 `[]` 인지
// 봤다. 통과했다. 그런데 셋백 가드를 통째로 지우는 뮤테이션(M8)을 넣어도 **안
// 깨졌다** — 좁은 셀은 물 판정(`parcelWater`)까지 바꾸므로 그 좌표가 애초에 타워
// 파셀이 아니게 되고, 가드에 **도달조차 안 했다.**
//
// 테스트는 초록이었고 아무것도 안 재고 있었다. 이 저장소가 이름 붙인 그 형태다 —
// *"테스트 통과는 검출력의 증거가 아니다."* 뮤테이션이 아니었으면 몰랐다.
//
// 그래서 **좁은 셀 기준으로 타워 파셀을 다시 찾는다.** 그러면 배제 조건은 통과하고
// 셋백 가드만 남아, 그 한 줄을 겨눌 수 있다.
describe('셋백 실패 — 좁은 파셀에서는 안 세운다', () => {
  /** 셋백·가로등·처마를 빼고 남는 반폭. 음수면 어떤 크기도 못 들어간다 */
  const TIGHT = 14;

  it('★ 파셀이 좁으면 타워를 세우지 않는다 — 조용히 겹치는 것보다 낫다', () => {
    const tight = { ...DEFAULT_LAYOUT, cellX: TIGHT, cellZ: TIGHT };
    // **좁은 셀 기준으로** 타워 파셀을 찾는다. 기본 셀에서 찾으면 물 판정이 달라져
    // 배제 조건에 걸리고, 셋백 가드는 실행되지도 않는다(위 주석의 그 함정).
    let target: [number, number] | null = null;
    for (let px = -20; px < 20 && !target; px++) {
      for (let pz = -20; pz < 20; pz++) {
        if (isTowerParcel(px, pz, TIGHT, TIGHT)) { target = [px, pz]; break; }
      }
    }
    expect(target, '좁은 셀에서 타워 파셀을 못 찾았다 — 이 검사가 아무것도 안 본다')
      .not.toBeNull();
    const [px, pz] = target!;

    // 여기까지 왔다는 것은 배제 조건(광장·도로·물)을 **전부 통과**했다는 뜻이다.
    // 그러므로 타워가 안 서는 이유는 셋백 가드 하나뿐이다.
    const narrow = parcelLayout(px, pz, 'near', tight).filter((p) => p.kind === 'tower');
    expect(narrow.length, '좁은 파셀인데 타워가 섰다 — 도로를 덮는다').toBe(0);
  });

  it('넓은 셀에서는 같은 판정이 타워를 세운다 — 위 검사가 항상 0 인 것이 아니다', () => {
    // 위 단언만 있으면 "어떤 이유로든 0" 이어도 통과한다. 대조군을 둔다.
    let target: [number, number] | null = null;
    for (let px = -20; px < 20 && !target; px++) {
      for (let pz = -20; pz < 20; pz++) {
        if (isTowerParcel(px, pz, CX, CZ)) { target = [px, pz]; break; }
      }
    }
    expect(target).not.toBeNull();
    const [px, pz] = target!;
    const normal = parcelLayout(px, pz, 'near').filter((p) => p.kind === 'tower');
    expect(normal.length, '기본 셀에서도 타워가 안 선다 — 파츠가 통째로 죽었는가').toBe(1);
  });
});
