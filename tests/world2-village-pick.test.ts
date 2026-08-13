// 인스턴스 → 배치 인덱스 환원 — **순수 산술.**
//
// 이 위층(클릭 한 번이 무엇을 고르는가)은 `world2-edit-listeners.test.ts` 의
// 「마을 파츠를 클릭으로 고른다」 절이 실제 세션으로 본다. 여기서는 그 아래 산술만
// 재고, 그래서 three 도 DOM 도 필요 없다.

import { describe, it, expect } from 'vitest';
import { matchPart, PICK_EPS } from '../frontend/js/world2/decide/village-pick.js';
import { parcelOf } from '../frontend/js/world2/decide/edit-pick.js';
import { parcelKey } from '../frontend/js/world2/decide/stream.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';

const p = (kind: string, x: number, z: number): PlacedPart =>
  ({ kind, x, y: 0, z, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 } as PlacedPart);

const PARTS: PlacedPart[] = [
  p('tree', -9, -9),
  p('building', 5, 3),
  p('tree', 5.4, 3.2), // 건물 바로 옆 — 종류가 다르면 헷갈리면 안 된다
  p('building', -12, 8),
];

describe('matchPart — 위치로 배치 인덱스를 되짚는다', () => {
  it('정확히 같은 자리를 찾는다', () => {
    expect(matchPart(PARTS, 'building', 5, 3)?.index).toBe(1);
    expect(matchPart(PARTS, 'building', -12, 8)?.index).toBe(3);
    expect(matchPart(PARTS, 'tree', -9, -9)?.index).toBe(0);
  });

  it('★ 종류가 다르면 아무리 가까워도 안 잡는다', () => {
    // 건물과 나무가 0.45m 떨어져 있다. 종류를 안 보면 서로를 집는다.
    expect(matchPart(PARTS, 'tree', 5, 3), '★ 옆에 있는 다른 종류를 집었다').toBeNull();
    expect(matchPart(PARTS, 'building', 5.4, 3.2)).toBeNull();
  });

  it('★ float32 왕복 오차는 흡수한다 — 인스턴스 행렬이 그 정밀도다', () => {
    // 실제 경로: `Float32Array` 에 담긴 좌표를 읽어 온다. 정확 비교였다면 **아무것도
    // 안 집힌다** — 그리고 그것은 «가끔 안 집힌다» 가 아니라 «늘 안 집힌다» 다.
    const f = new Float32Array([5 + 1200, 3 - 800]);
    // 파셀 원점을 더했다 뺀 왕복까지 흉내낸다.
    expect(matchPart(PARTS, 'building', f[0] - 1200, f[1] + 800)?.index).toBe(1);
  });

  it('★ 허용 오차를 넘으면 실패한다 — 조용한 오답보다 낫다', () => {
    // 「가장 가까운 것」만 쓰면 파셀을 잘못 구했을 때도 **언제나 무언가를 집는다.**
    // 그러면 감독이 클릭한 것과 다른 건물이 골라진 채로 편집이 진행된다.
    expect(matchPart(PARTS, 'building', 5 + PICK_EPS * 3, 3)).toBeNull();
    expect(matchPart(PARTS, 'building', 999, 999)).toBeNull();
  });

  it('경계값 — eps 안이면 잡고 밖이면 못 잡는다', () => {
    expect(matchPart(PARTS, 'building', 5 + PICK_EPS * 0.9, 3)).not.toBeNull();
    expect(matchPart(PARTS, 'building', 5 + PICK_EPS * 1.1, 3)).toBeNull();
  });

  it('빈 배치·없는 종류는 null', () => {
    expect(matchPart([], 'building', 0, 0)).toBeNull();
    expect(matchPart(PARTS, 'lamp', 5, 3)).toBeNull();
  });

  it('★ 같은 자리에 둘이면 앞의 것 — 인덱스가 흔들리지 않는다', () => {
    // 마을 계산 배치에서는 충돌 검사 때문에 안 생기지만, **동결 배열은 손으로 편집된
    // 것**이라 겹칠 수 있다. 그때 클릭할 때마다 다른 것이 잡히면 «움직이는 게 안 잡힌다»
    // 가 된다.
    const dup = [p('building', 1, 1), p('building', 1, 1)];
    expect(matchPart(dup, 'building', 1, 1)?.index).toBe(0);
    expect(matchPart(dup, 'building', 1, 1)?.index).toBe(0);
  });
});

describe('parcelOf 와 짝이 맞는다 — 월드 좌표에서 곧바로 이어진다', () => {
  it('★ 파셀 원점을 뺀 로컬 좌표가 배치의 x·z 다', () => {
    // 이 축이 깨지면 환원 전체가 무너진다. 빌더가 `ox + p.x` 로 놓으므로
    // (`parcel-builder.ts` 의 `fill`) 역은 `wx - px*cellX` 여야 한다.
    const CELL = 40;
    const px = 3, pz = -7;
    const local = p('building', 5, 3);
    const wx = px * CELL + local.x;
    const wz = pz * CELL + local.z;

    const at = parcelOf(wx, wz, CELL, CELL);
    expect(at.px).toBe(px);
    expect(at.pz).toBe(pz);
    expect(matchPart([local], 'building', at.lx, at.lz)?.index).toBe(0);
  });

  it('음수 파셀에서도 성립한다 — 반올림 경계', () => {
    const CELL = 40;
    for (const [px, pz] of [[-1, -1], [-3, 5], [0, -12]] as const) {
      const local = p('tree', -13.5, 17.25);
      const at = parcelOf(px * CELL + local.x, pz * CELL + local.z, CELL, CELL);
      // ⚠ `toEqual`/`toBe` 를 안 쓰는 이유는 바로 아래 축이다 — `-0` 이 나온다.
      expect(at.px === px && at.pz === pz, `파셀 (${px},${pz}) 를 못 구했다`).toBe(true);
      expect(matchPart([local], 'tree', at.lx, at.lz), `파셀 (${px},${pz})`).not.toBeNull();
    }
  });

  it('★ 파셀 인덱스가 `-0` 일 수 있다 — 키와 표시가 그것을 접는다', () => {
    // 실측(이 테스트를 쓰다 드러났다): `Math.round(-13.5 / 40)` = `Math.round(-0.3375)`
    // = **`-0`**. 산술 비교(`===`)에서는 `0` 과 같지만 `Object.is` 는 다르다고 본다.
    //
    // **무해한 이유를 여기 못 박는다.** 파셀 인덱스가 흘러가는 곳은 둘이고 둘 다 `-0` 을
    // 접는다: ① 키 생성(`${px},${pz}` — JS 의 `String(-0)` 은 `"0"`) ② 화면 표시(같은
    // 변환). 그래서 «동결이 `-0,5` 에 걸렸는데 조회는 `0,5` 로 온다» 가 **안 일어난다.**
    // 이 성질이 깨지는 날(예: 키를 배열이나 비트 연산으로 바꾸는 날) 이 축이 알려 준다.
    const at = parcelOf(-13.5, -12 * 40, 40, 40);
    expect(Object.is(at.px, -0), '전제가 바뀌었다 — 이제 -0 이 안 나온다').toBe(true);
    expect(`${at.px},${at.pz}`).toBe('0,-12');
    expect(parcelKey(at.px, at.pz)).toBe(parcelKey(0, -12));
  });
});
