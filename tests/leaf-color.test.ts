// tests/leaf-color.test.ts — 나무 잎 채도 축 (감독 신고 2026-08-22)
//
// *"나무의 나뭇잎 초록색 채도가 낮은 것 같아."*
//
// ⚠ **이 축에서 나는 반복해서 틀렸다.** `decide/blade-shape.ts` 가 그 이력을 적고
// 있다 — *"«수치상 밝기·채도가 높으면 화면이 잘못된다» 를 세 번 규정했고 세 번 다
// [틀렸다]"*. 그래서 이 검사들은 **어떤 값이 옳은지 판정하지 않는다.** 값은 감독이
// 화면에서 고른다(`?leafsat=`). 여기서 지키는 것은 셋뿐이다:
//   ① 노브를 밀면 채도가 **그 방향으로** 움직이는가
//   ② 채도를 미는데 **밝기가 따라 움직이지 않는가**(두 축이 한 화면에서 갈려야 한다)
//   ③ 계수가 **한 곳에만** 있는가

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LEAF_BASE_A, LEAF_BASE_B, LEAF_SAT, LEAF_SAT_KNOB, LEAF_SAT_MAX, leafTone,
} from '../frontend/js/world2/decide/leaf-color.js';
import { saturateAroundLuma, bladeToneHex, DIRECTOR_TONES } from '../frontend/js/world2/decide/blade-shape.js';

const luma = ([r, g, b]: readonly [number, number, number]): number =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;
/** HSV 의 S. 0 이면 무채색 */
const sat = ([r, g, b]: readonly [number, number, number]): number => {
  const mx = Math.max(r, g, b);
  return mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
};

describe('잎 채도 — 노브가 그 방향으로 움직인다', () => {
  it('1 은 항등원이다 — 신고 이전 화면을 정확히 돌려줄 수 있어야 한다', () => {
    expect(leafTone(LEAF_BASE_A, 1)).toEqual([...LEAF_BASE_A]);
    expect(leafTone(LEAF_BASE_B, 1)).toEqual([...LEAF_BASE_B]);
  });

  it('🔴 올리면 채도가 오른다 — 감독 신고가 「낮다」 였다', () => {
    const base = sat(LEAF_BASE_A);
    expect(sat(leafTone(LEAF_BASE_A, 1.5))).toBeGreaterThan(base);
    expect(sat(leafTone(LEAF_BASE_B, 1.5))).toBeGreaterThan(sat(LEAF_BASE_B));
  });

  it('0 이면 무채색이 된다 — 감독이 양 끝을 봐야 판정이 선다', () => {
    expect(sat(leafTone(LEAF_BASE_A, 0))).toBeCloseTo(0, 9);
  });

  it('🔴 기본값이 항등원보다 크다 — 「죽어 있다」 신고에 대한 응답이다', () => {
    expect(LEAF_SAT, '🔴 기본값이 1 이하 — 신고 이전과 같은 화면이 된다')
      .toBeGreaterThan(1);
    expect(LEAF_SAT).toBeLessThanOrEqual(LEAF_SAT_MAX);
  });
});

describe('🔴 채도를 미는데 밝기가 따라 움직이지 않는다', () => {
  // 이것이 이 축의 핵심 규약이다. 두 축이 함께 움직이면 감독이 한 화면에서 못 가르고,
  // 그러면 「채도가 낮다」인지 「어둡다」인지 판정 자체가 성립하지 않는다.
  it('휘도(Rec.709)가 보존된다 — 채도를 어디로 밀어도', () => {
    const y0 = luma(LEAF_BASE_A);
    for (const s of [0, 0.5, 1, 1.4, 1.6, 2]) {
      expect(luma(leafTone(LEAF_BASE_A, s)), `sat=${s} 에서 휘도가 움직였다`)
        .toBeCloseTo(y0, 9);
    }
  });

  it('클램프에 닿으면 휘도가 흔들릴 수 있다 — 그것을 알고 상한을 정했다', () => {
    // 과포화(채널이 0 또는 1 에 붙는 구간)에서는 보존이 깨진다. 결함이 아니라 클램프의
    // 성질이고, 그래서 위 검사의 표본을 상한(3) 근처까지 넓히지 않았다. 이 검사는 그
    // 사실을 **명시적으로** 남겨 다음 사람이 위 검사를 「모든 구간에서 참」으로 읽지
    // 않게 한다 — 못 잰 것을 통과로 적지 않는다.
    const far = leafTone(LEAF_BASE_A, LEAF_SAT_MAX);
    expect(far.every((c) => c >= 0 && c <= 1), '클램프를 벗어났다').toBe(true);
  });
});

describe('🔴 채도 계수가 한 곳에만 있다 (값 미러링)', () => {
  it('leaf-color 가 blade-shape 의 함수를 실제로 쓴다 — 계수를 복사하지 않았다', () => {
    // ⚠ 첫 판본은 *"계수를 다시 적지 않고 공유 함수를 쓴다"* 라고 **주석에 적어 놓고
    // 계수를 복사한 자체 구현**을 두고 있었다. 문장이 참이 아니었다.
    const src = readFileSync(
      join(process.cwd(), 'frontend/js/world2/decide/leaf-color.ts'), 'utf8',
    );
    expect(src, '🔴 Rec.709 계수가 leaf-color 에 다시 나타났다 — 미러링이다')
      .not.toMatch(/0\.7152|0\.2126|0\.0722/);
    expect(src).toContain("import { saturateAroundLuma } from './blade-shape.js'");
  });

  it('공유 함수가 두 척도에서 같은 식을 낸다 — 잔디(0~255)와 잎(0~1)', () => {
    // 같은 색을 두 척도로 넣고 같은 채도를 밀면 결과가 255배 차이여야 한다.
    const asUnit = saturateAroundLuma([0.34, 0.52, 0.30], 1.5, 1);
    const asByte = saturateAroundLuma([0.34 * 255, 0.52 * 255, 0.30 * 255], 1.5, 255);
    asUnit.forEach((c, i) => expect(asByte[i] / 255).toBeCloseTo(c, 9));
  });

  it('잔디 축이 그대로다 — 공유 함수로 바꾸며 회귀시키지 않았다', () => {
    // `bladeToneHex` 를 리팩터했으므로 끝점(팔레트 1 · 채도 1)이 감독 원안 그대로인지
    // 본다. 여기가 흔들리면 감독이 2026-08-18 에 준 팔레트가 바뀐 것이다.
    for (let i = 0; i < DIRECTOR_TONES.length; i++) {
      expect(bladeToneHex(i, [...DIRECTOR_TONES], 1, 1)).toBe(DIRECTOR_TONES[i]);
    }
  });
});

describe('🔴 나무가 이 판정을 실제로 소비한다', () => {
  const treeSrc = readFileSync(
    join(process.cwd(), 'frontend/js/world2/parts/tree.ts'), 'utf8',
  );

  it('정점색을 `leafTone` 으로 만든다 — 상수를 직접 박아 두지 않았다', () => {
    expect(treeSrc).toMatch(/LEAF_A\s*=\s*leafTone\(LEAF_BASE_A/);
    expect(treeSrc).toMatch(/LEAF_B\s*=\s*leafTone\(LEAF_BASE_B/);
    // 옛 하드코딩이 남아 있으면 노브가 절반만 먹는다.
    expect(treeSrc, '🔴 옛 잎 색 리터럴이 남아 있다').not.toMatch(/\[0\.34,\s*0\.52,\s*0\.30\]/);
  });

  it('🔴 노브를 읽어 넘긴다 — 안 읽으면 감독이 후보를 비교할 문이 없다', () => {
    expect(treeSrc).toMatch(/readNum\(LEAF_SAT_KNOB,\s*LEAF_SAT,\s*0,\s*LEAF_SAT_MAX\)/);
    expect(LEAF_SAT_KNOB).toBe('leafsat');
  });
});
