// @vitest-environment jsdom
//
// ⚠ **환경을 node 에서 jsdom 으로 올렸다**(2026-08-22). node 에서는 `location` 이 아예
// 없어 `url-knob.ts` 가 **무조건 fallback 을 반환**했다 — 즉 「기본값은 1」 검사가 노브를
// 재고 있던 게 아니라 노브가 **꺼진 세계**를 재고 있었다. jsdom 이면 URL 을 실제로 읽으므로
// 같은 단언이 그때 처음으로 「기본값」을 잰다. 순수 함수 검사들은 환경과 무관하다.
//
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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LEAF_BASE_A, LEAF_BASE_B, LEAF_SAT, LEAF_SAT_KNOB, LEAF_SAT_MAX, leafTone,
  leafLift, leafLiftAuto, liftTone, LEAF_LIFT_MAX,
} from '../frontend/js/world2/decide/leaf-color.js';
import { GRASS_TONES } from '../frontend/js/world2/decide/grass.js';
import { saturateAroundLuma, bladeToneHex, DIRECTOR_TONES, BLADE_PALETTE } from '../frontend/js/world2/decide/blade-shape.js';

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
    // ⚠ import 목록이 늘 수 있으므로 **문자열이 아니라 형태**로 본다(2026-08-22).
    // 밝기 축이 같은 파일의 `luma` 를 함께 가져오면서 정확 일치가 깨졌다 — 그때 이
    // 단언의 **목적**(계수를 복사하지 않고 그 파일 것을 실제로 쓴다)은 그대로다.
    expect(src, 'blade-shape 의 saturateAroundLuma 를 import 하지 않는다')
      .toMatch(/import\s*\{[^}]*saturateAroundLuma[^}]*\}\s*from\s*'\.\/blade-shape\.js'/);
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
    // ⚠ **합성을 허용한다**(2026-08-22). 밝기 축이 들어오며 `liftTone(leafTone(...))` 이
    // 됐다 — 이 단언의 목적은 «상수를 직접 박아 두지 않았다» 이고 합성도 그것을 만족한다.
    // **느슨해진 것이 아니다**: 합성 순서(채도 → 밝기)는 아래 「나뭇잎 밝기 축」 절의
    // 선언 정규식이 **더 강하게** 못 박는다. 목적은 그대로 두고 자리를 옮긴 것이다.
    expect(treeSrc, 'LEAF_A 가 leafTone 을 안 거친다 — 상수를 직접 박았다')
      .toMatch(/LEAF_A\s*=[^;]*leafTone\(LEAF_BASE_A/);
    expect(treeSrc, 'LEAF_B 가 leafTone 을 안 거친다 — 상수를 직접 박았다')
      .toMatch(/LEAF_B\s*=[^;]*leafTone\(LEAF_BASE_B/);
    // 옛 하드코딩이 남아 있으면 노브가 절반만 먹는다.
    expect(treeSrc, '🔴 옛 잎 색 리터럴이 남아 있다').not.toMatch(/\[0\.34,\s*0\.52,\s*0\.30\]/);
  });

  it('🔴 노브를 읽어 넘긴다 — 안 읽으면 감독이 후보를 비교할 문이 없다', () => {
    expect(treeSrc).toMatch(/readNum\(LEAF_SAT_KNOB,\s*LEAF_SAT,\s*0,\s*LEAF_SAT_MAX\)/);
    expect(LEAF_SAT_KNOB).toBe('leafsat');
  });
});

// ── 🔴 검수관 P1 — 기반색 자체의 회귀를 이 스위트가 못 잡았다 ────────────────
// 검수관 실측: `LEAF_BASE_A` 를 `[0.40, 0.45, 0.42]`(거의 무채색) 로 바꿔도,
// `[0.30, 0.35, 0.32]`(색조가 다른 값) 로 바꿔도 **11/11 전부 통과**했다. 위 검사들이
// 전부 `sat` **배수의 성질**만 보기 때문이다 — 배수는 어떤 기반색에도 똑같이 작동한다.
//
// 즉 이 축은 「노브가 잘 도는가」는 지키지만 「무엇을 돌리는가」는 안 봤다. 다음에 이
// 값을 만지는 사람의 실수를 잡을 안전망이 0이었다.
//
// ⚠ 그래도 **특정 값을 고정하지는 않는다.** 이 축은 감독이 화면에서 정하는 자리이고,
// 테스트가 값을 박으면 감독 판정마다 테스트를 고쳐야 한다. 대신 **잎이 초록이라는
// 것**만 못 박는다 — 그건 판정이 아니라 전제다.
describe('🔴 기반색이 초록 계열이다 (검수관 P1)', () => {
  const hue = ([r, g, b]: readonly [number, number, number]): number => {
    const mx = Math.max(r, g, b); const mn = Math.min(r, g, b);
    if (mx === mn) return NaN; // 무채색 — hue 가 정의되지 않는다
    const d = mx - mn;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return ((h * 60) % 360 + 360) % 360;
  };

  it.each([['LEAF_BASE_A', LEAF_BASE_A], ['LEAF_BASE_B', LEAF_BASE_B]] as const)(
    '%s 의 색상이 초록 범위(80°~150°)다', (name, base) => {
      const h = hue(base);
      expect(Number.isNaN(h), `🔴 ${name} 이 무채색이 됐다 — 잎이 회색으로 나온다`).toBe(false);
      expect(h, `🔴 ${name} 의 색상이 초록을 벗어났다 (${h.toFixed(1)}°)`)
        .toBeGreaterThanOrEqual(80);
      expect(h).toBeLessThanOrEqual(150);
    },
  );

  it('🔴 기반색이 무채색에 가깝지 않다 — 채도를 곱해도 색이 안 살아난다', () => {
    // 배수는 0 에 무엇을 곱해도 0 이다. 기반이 회색이면 `?leafsat=3` 을 줘도 회색이고,
    // 그러면 감독이 노브를 밀어도 화면이 안 변한다 — 신고가 그대로 되살아난다.
    const s = ([r, g, b]: readonly [number, number, number]): number => {
      const mx = Math.max(r, g, b);
      return mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
    };
    expect(s(LEAF_BASE_A), '🔴 기반 채도가 너무 낮다 — 노브가 먹지 않는다')
      .toBeGreaterThan(0.15);
    expect(s(LEAF_BASE_B)).toBeGreaterThan(0.15);
  });

  it('두 톤이 서로 다르다 — 수관이 단색 덩어리로 보이지 않게 하는 전제', () => {
    expect(LEAF_BASE_A).not.toEqual(LEAF_BASE_B);
  });
});

// ── 밝기 축 (PR #246 에서 이식, 팀장 조건 c1·c4) ────────────────────────────
//
// 감독이 같은 나뭇잎을 보고 두 세션에 각각 말했다 — 이쪽은 「채도가 낮다」, 저쪽은
// 「어둡다」. 두 세션이 서로 모른 채 각자 설계했고 팀장 판정 ⓐ 로 이 파일에 합쳐졌다.
//
// ⚠ **이 검사들은 PR #246 에서 검수관이 실제로 뚫은 사각을 막는다.** 그 우회는
// `leafLift()` 를 **죽은 코드**로 남기고 배율을 계산된 상수로 하드코딩하는 것이었고,
// 값도 문자열도 그대로라 3건이 전부 통과했다. 그래서 **선언 자체**를 본다.
describe('나뭇잎 밝기 축', () => {
  const src = (): string => readFileSync(
    join(process.cwd(), 'frontend/js/world2/parts/tree.ts'), 'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '');

  it('★★ 두 축이 순서대로 합성된다 — 선언을 본다(값·문자열로는 못 본다)', () => {
    const c = src();
    // 채도가 **먼저**, 밝기가 **나중**. 순서가 바뀌면 `leafTone` 의 휘도 보존이 밝아진
    // 휘도를 기준으로 돌아 두 축이 서로를 먹는다.
    expect(c, 'LEAF_A 가 leafTone → liftTone 순서로 합성되지 않는다')
      .toMatch(/constLEAF_A=liftTone\(leafTone\(LEAF_BASE_A,/);
    expect(c, 'LEAF_B 도 같은 순서여야 한다')
      .toMatch(/constLEAF_B=liftTone\(leafTone\(LEAF_BASE_B,/);
    // 배율이 노브에서 온다 — 상수로 굳으면 감독이 화면에서 못 고른다.
    //
    // ⚠ **형태를 넓혔다**(2026-08-22, `?leaflift=auto` 신설). 예전 단언은
    // `constLEAF_LIFT_NOW=readNum\(` 정확일치였고 분기가 들어오며 깨졌다. **목적은 그대로**
    // — 숫자 갈래가 노브에서 오는 것과, auto 갈래가 유도 함수를 **실제로 부르는 것**을
    // 둘 다 본다(후자가 없으면 `leafLift()` 소비자가 0 이 된다 — 검수관 발견 E).
    // 느슨화가 아니라는 근거: 아래 「노브가 화면 값에 도달한다」가 같은 것을 **값으로**
    // 재고, 두 축이 **서로 다른 우회를 잡는다**.
    //
    // ⚠ **첫 판본은 여기에 *"그쪽이 이 문자열 검사보다 강하다"* 라고 적었고 실측으로
    // 반증됐다**(검수관 권고 A, 2026-08-22 독립 재현). `? leafLiftAuto()` 를 **그 함수가
    // 실제로 반환하는 값과 같은 리터럴**(1.4338000959125525)로 바꾸는 뮤테이션에서
    // **값 검사는 통과하고 이 소스 검사만 잡았다**(1 failed, 여기).
    //
    // 당연하다 — 값 검사는 「결과가 맞는가」를 묻지 「유도가 살아 있는가」를 묻지 않는다.
    // 상수는 오늘의 결과와 같으므로 통과하고, 잔디가 바뀌는 날 조용히 틀린다. 이 회차에
    // 문자열 검사가 다섯 번 뚫려 값 축으로 옮겼는데, **값 축도 뚫린다**는 것이 이번 실측
    // 이다. 어느 한쪽이 다른 쪽을 대체하지 않는다.
    expect(c, '숫자 갈래의 밝기 배율이 노브에서 오지 않는다')
      .toMatch(/constLEAF_LIFT_NOW=[^;]*readNum\(LEAF_LIFT_KNOB,1,0,LEAF_LIFT_MAX\)/);
    expect(c, 'auto 갈래가 leafLiftAuto() 를 부르지 않는다 — 유도가 화면에 못 간다')
      .toMatch(/constLEAF_LIFT_NOW=[^;]*leafLiftAuto\(\)/);
  });

  it('★★ leafLift 가 잔디에서 유도된다 — 상수로 굳는 것을 막는다', () => {
    const lc = readFileSync(
      join(process.cwd(), 'frontend/js/world2/decide/leaf-color.ts'), 'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '');
    // ⚠ **기준은 `GRASS_TONES` 가 아니다**(검수관, 2026-08-22). 그 배열은 `?gpal=0` 의
    // 끝점이고 기본 화면에는 안 보인다 — `decide/grass.ts` 주석이 스스로 「반려됐다」고
    // 적고 있다. 실제 화면 색은 `bladeToneHex` 가 계산한다.
    expect(lc, 'leafLift 가 실제 화면 잔디 색(bladeToneHex)을 안 쓴다')
      .toMatch(/bladeToneHex\(1,GRASS_TONES,BLADE_PALETTE,1\)/);
    expect(lc, 'leafLift 가 두 톤의 **평균**을 쓰지 않는다 — 각각 맞추면 수관 명암이 죽는다')
      .toMatch(/luma\(LEAF_BASE_A\)\+luma\(LEAF_BASE_B\)\)\/2/);
  });

  it('★★★ 잔디 톤을 바꾸면 배율이 따라온다 — **소스가 아니라 값의 흐름을 잰다**', () => {
    // ── 이 검사가 앞의 소스 정규식보다 강하다 ────────────────────────────────
    // 이 회차에 「유도가 상수로 굳는 것」을 문자열로 막으려다 **네 번 뚫렸다**(마지막은
    // `leafLift()` 안에서 조기 return 으로 상수를 반환하는 것 — 문자열도 값도 그대로라
    // 3건이 전부 통과했다). 소스 검사는 죽은 코드·주석을 답으로 받는다.
    //
    // 그래서 **다른 잔디 톤을 넣어 본다.** 유도가 살아 있으면 결과가 따라오고, 상수를
    // 반환하는 구현은 여기서 즉시 들통난다. 형태를 지키려면 형태를 묻지 말고 **값이
    // 흐르는지**를 물어야 한다.
    const dark = leafLift(0x203018);   // 어두운 잔디 → 배율이 작아져야 한다
    const bright = leafLift(0xd8f0b0); // 밝은 잔디  → 배율이 커져야 한다
    expect(dark, '어두운 잔디를 줘도 배율이 그대로다 — 유도가 상수로 굳었다')
      .toBeLessThan(leafLift());
    expect(bright, '밝은 잔디를 줘도 배율이 그대로다 — 유도가 상수로 굳었다')
      .toBeGreaterThan(leafLift());
    // 산술도 확인한다 — 방향만 맞고 값이 틀릴 수 있다.
    const leaf = (luma(LEAF_BASE_A) + luma(LEAF_BASE_B)) / 2;
    expect(bright).toBeCloseTo(luma([0xd8 / 255, 0xf0 / 255, 0xb0 / 255]) / leaf, 10);
  });

  it('유도된 배율이 실제로 잔디 밝기를 맞춘다', () => {
    const lift = leafLift();
    // 기준은 **기본 화면의** 잔디 중간 톤이다 — `GRASS_TONES` 원본이 아니라 팔레트
    // 혼합을 거친 값(`BLADE_PALETTE = 1` 이면 감독 원안).
    const g = bladeToneHex(1, GRASS_TONES, BLADE_PALETTE, 1);
    const grass = luma([((g >> 16) & 0xff) / 255, ((g >> 8) & 0xff) / 255, (g & 0xff) / 255]);
    const a = liftTone(LEAF_BASE_A, lift);
    const b = liftTone(LEAF_BASE_B, lift);
    expect((luma(a) + luma(b)) / 2, '평균 휘도가 잔디와 어긋난다').toBeCloseTo(grass, 5);
    expect(luma(a), 'A 가 B 보다 밝지 않다 — 수관 명암이 사라졌다').toBeGreaterThan(luma(b));
    for (const c of [a, b]) for (const v of c) expect(v, '채널이 포화했다').toBeLessThan(1);
  });
});

// ── 노브가 화면 값에 도달한다 — 「소비자 0」을 구조로 막는다 ────────────────────
//
// ⚠ **검수관 발견 E (2026-08-22).** 첫 판본은 화면 배율로 노브 **원값**을 썼고
// `leafLift()` 를 부르는 곳이 **테스트뿐**이었다. 그 상태에서는 위의 문자열·산술 검사가
// 아무리 많아도 **화면과 무관한 함수를 검사하고 있는 것**이고, 테스트가 자기 자신의
// 정당성을 증명하는 자기참조가 된다(`equirectUv` 가 자기 역함수와만 대조해 부호 오류를
// 통과시킨 그 형태). 같은 회차에 내가 `makeEnvMap` 에서 찾아 고친 것도 같은 것이었다.
//
// 그래서 **모듈을 실제로 부팅해** `LEAF_TONES_FOR_TEST` 를 본다. 소스 문자열이 아니라
// **URL → 화면 색**의 흐름을 재므로, 죽은 코드·조기 return·값이 다른 상수 대입이 여기서
// 걸린다(이 회차에 문자열 검사가 다섯 번 뚫렸고 매번 그 셋 중 하나였다).
//
// ⚠ **다만 「값이 같은 상수 대입」은 이 축이 못 잡는다**(검수관 권고 A, 실측). 유도 함수가
// 오늘 내는 값을 그대로 리터럴로 박으면 결과가 같아 통과하고, 잔디가 바뀌는 날 조용히
// 틀린다. 그것은 위 소스 정규식이 잡는다 — **두 축은 대체 관계가 아니라 상호보완이다.**
describe('밝기 노브가 화면 값에 도달한다', () => {
  const TREE = '../frontend/js/world2/parts/tree.js';
  /** 잎 정점색은 **모듈 최상위**에서 한 번 계산된다 — 매번 다시 부팅해야 노브가 읽힌다 */
  const boot = async (query: string) => {
    vi.resetModules();
    window.history.replaceState({}, '', `/world2.html${query}`);
    const { LEAF_TONES_FOR_TEST } = await import(TREE);
    return LEAF_TONES_FOR_TEST as readonly [number, number, number][];
  };
  beforeEach(() => { vi.resetModules(); window.history.replaceState({}, '', '/world2.html'); });

  it('기본값은 1 — 감독 판정 전까지 밝기를 확정하지 않는다(팀장 조건 c2)', async () => {
    const [a, b] = await boot('');
    // 노브 없이 뜨면 채도 축만 적용된 상태여야 한다 — 두 축이 동시에 걸리면 감독이
    // 어느 것이 무엇인지 못 가른다.
    expect(a, '기본 화면에 밝기 축이 이미 걸려 있다').toEqual(leafTone(LEAF_BASE_A, LEAF_SAT));
    expect(b, '기본 화면에 밝기 축이 이미 걸려 있다').toEqual(leafTone(LEAF_BASE_B, LEAF_SAT));
  });

  it('★★★ `?leaflift=auto` 가 유도 배율을 화면에 태운다 — **`leafLift()` 를 안 부르고 잰다**', async () => {
    // ── 왜 `leafLift()` 와 비교하지 않는가 ──────────────────────────────────
    // 그러면 「구현이 그 함수를 불렀는가」를 그 함수로 확인하는 자기참조가 된다. 대신
    // **목적이 달성됐는지**를 독립 산술로 본다 — auto 의 목적은 *"잎 두 톤의 평균 휘도를
    // 잔디 중간 톤에 맞춘다"* 이므로, 잔디 휘도를 여기서 따로 계산해 대조한다.
    // 상수를 반환하는 구현·죽은 코드·조기 return 은 이 등식을 못 맞춘다.
    const [a, b] = await boot('?leaflift=auto');
    const g = bladeToneHex(1, GRASS_TONES, BLADE_PALETTE, 1);
    const grass = luma([((g >> 16) & 0xff) / 255, ((g >> 8) & 0xff) / 255, (g & 0xff) / 255]);
    // 채도 축이 걸려 있어도 성립한다 — `leafTone` 이 휘도를 보존하기 때문이다(위 검사들).
    expect((luma(a) + luma(b)) / 2, 'auto 인데 화면 잎 휘도가 잔디와 안 맞는다')
      .toBeCloseTo(grass, 10);
    // 실측 2026-08-22: 배율 1.4338 · 채널 최대 0.792 — 상한(2)과 포화(1) 둘 다 안 걸린다.
    // 걸리기 시작하면 위 등식이 먼저 깨지므로 이 검사가 그 경계도 지킨다.
    for (const c of [a, b]) for (const v of c) expect(v, '채널이 포화했다').toBeLessThan(1);
  });

  it('★★ 유도값이 상한을 넘으면 클램프된다 — 지금 값으로는 못 재는 축이다', () => {
    // ⚠ **이 검사가 없으면 클램프의 검출력이 0 이다**(2026-08-22 뮤테이션 실측: 지웠는데
    // 0 failed). 기본 잔디에서 유도값이 1.4338 이라 상한 2 가 아무 일도 안 하기 때문이다.
    // 그래서 **상한을 넘기는 잔디를 인자로 넣어** 클램프 자체를 잰다.
    expect(leafLiftAuto(0xffffff), '흰 잔디를 줘도 상한이 안 걸린다')
      .toBe(LEAF_LIFT_MAX);
    expect(leafLift(0xffffff), '전제가 깨졌다 — 흰 잔디의 유도값이 상한 아래다')
      .toBeGreaterThan(LEAF_LIFT_MAX);
    // 상한 아래에서는 클램프가 값을 안 건드린다(항등) — 지금 화면이 그 경우다.
    expect(leafLiftAuto(), '상한 아래인데 클램프가 값을 바꿨다').toBe(leafLift());
  });

  it('★★ auto 는 기본값과 **다른 화면**이다 — 노브가 조용히 무시되지 않는가', async () => {
    const [base] = await boot('');
    const [auto] = await boot('?leaflift=auto');
    expect(auto[1], 'auto 를 줬는데 기본 화면과 같다 — 분기가 죽었다')
      .toBeGreaterThan(base[1]);
  });

  it('숫자 노브도 화면까지 간다 — 감독이 후보를 비교할 수 있어야 한다', async () => {
    const [a] = await boot('?leaflift=1.2');
    expect(a).toEqual(liftTone(leafTone(LEAF_BASE_A, LEAF_SAT), 1.2));
  });

  it('허용목록 밖·범위 밖은 기본 경로를 안 망가뜨린다', async () => {
    const [base] = await boot('');
    // 오타(`atuo`)는 enum 에서 걸러지고 `Number('atuo')` 가 NaN 이라 fallback 1 로 간다.
    expect(await boot('?leaflift=atuo').then((t) => t[0]), '오타가 화면을 바꿨다').toEqual(base);
    // 상한 밖은 클램프된다 — `LEAF_LIFT_MAX` 를 값으로 다시 적지 않고 상수를 쓴다.
    expect(await boot('?leaflift=99').then((t) => t[0]), '상한이 안 걸린다')
      .toEqual(liftTone(leafTone(LEAF_BASE_A, LEAF_SAT), LEAF_LIFT_MAX));
  });
});
