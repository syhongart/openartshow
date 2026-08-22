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
    expect(c, '밝기 배율이 노브에서 오지 않는다')
      .toMatch(/constLEAF_LIFT_NOW=readNumOpt\(LEAF_LIFT_KNOB,0,LEAF_LIFT_MAX\)/);
    // 노브를 안 쓰면 **유도**가 온다 — 계산된 상수가 박히면 잔디가 바뀌어도 안 따라온다.
    expect(c, '기본값이 leafLiftAuto() 가 아니다 — 감독 판정이 상수로 굳었다')
      .toMatch(/constLEAF_LIFT_NOW=[^;]*\?\?leafLiftAuto\(\)/);
    // ⚠ `||` 면 `?leaflift=0`(무채색 잎)이 falsy 라 유도값으로 새고 노브 하단이 죽는다.
    expect(c, '`??` 가 아니라 `||` 다 — 0 지정이 유도값으로 샌다')
      .not.toMatch(/constLEAF_LIFT_NOW=[^;]*\|\|leafLiftAuto/);
  });

  it('★★ leafLift 가 잔디에서 유도된다 — 상수로 굳는 것을 막는다', () => {
    const lc = readFileSync(
      join(process.cwd(), 'frontend/js/world2/decide/leaf-color.ts'), 'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '');
    // ⚠ **기준은 `GRASS_TONES` 가 아니다**(검수관, 2026-08-22). 그 배열은 `?gpal=0` 의
    // 끝점이고 기본 화면에는 안 보인다 — `decide/grass.ts` 주석이 스스로 「반려됐다」고
    // 적고 있다. 실제 화면 색은 `bladeToneHex` 가 계산한다.
    // ⚠ **이 소스 검사가 무엇을 못 잡는지 실측했다**(2026-08-22, 검수관 재현이 내 것과
    // 갈려서 두 형태를 나란히 재봤다):
    //   · `return grass / leaf;` **한 줄만** 리터럴로 → 여기는 **통과**한다. 위쪽 유도
    //     산술이 소스에 그대로 남아 있기 때문이다(= 죽은 코드가 답으로 받아들여진다).
    //     아래 값-흐름 검사 2건이 대신 잡는다.
    //   · `leafLift` **본문 전체**를 리터럴 return 으로 → 여기서도 잡힌다(3 failed).
    // 즉 이 검사의 사각은 「유도 산술이 남아 있되 쓰이지 않는 것」이고, 그 자리는 값 축이
    // 덮는다. **뮤테이션을 보고할 때 형태를 안 적으면 재현이 갈린다** — 이번이 그 사례다.
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

  it('★★★ 기본 화면이 **감독 판정 ③** 이다 — 잎 평균 휘도가 잔디 중간 톤과 같다', async () => {
    // ── 이 단언은 「기본값은 1」을 **교체한 것**이다 (2026-08-22) ──────────────
    // 그 단언은 팀장 조건 c2(감독이 고르기 전까지 확정 금지)를 지키던 축이고, 감독이
    // 카드로 ③을 고르면서 역할이 끝났다. `decide/leaf-color.ts` 의 재론 조건이
    // *"지우기만 하는 것은 안 된다 — 기본값을 지키는 축이 0 이 된다"* 라고 적어 둔 대로
    // **판정으로 바꿔 단** 것이다.
    //
    // `leafLiftAuto()` 와 비교하지 않는다 — 그러면 「구현이 그 함수를 불렀는가」를 그
    // 함수로 확인하는 자기참조다. 대신 감독이 고른 **관계**(잎 평균 휘도 = 잔디 중간 톤)를
    // 잔디 쪽에서 독립 산술로 계산해 대조한다.
    const [a, b] = await boot('');
    const g = bladeToneHex(1, GRASS_TONES, BLADE_PALETTE, 1);
    const grass = luma([((g >> 16) & 0xff) / 255, ((g >> 8) & 0xff) / 255, (g & 0xff) / 255]);
    expect((luma(a) + luma(b)) / 2, '기본 화면의 잎 휘도가 잔디와 어긋난다 — 판정이 깨졌다')
      .toBeCloseTo(grass, 10);
    // 수관 명암과 포화는 그 판정의 전제다 — 평균만 맞고 이것이 깨지면 화면이 달라진다.
    expect(luma(a), 'A 가 B 보다 밝지 않다 — 수관 명암이 사라졌다').toBeGreaterThan(luma(b));
    for (const c of [a, b]) for (const v of c) expect(v, '채널이 포화했다').toBeLessThan(1);
  });

  it('★★ `?leaflift=1` 이 밝기 축 이전 화면으로 되돌린다 — 되돌릴 문이 살아 있는가', async () => {
    const [a, b] = await boot('?leaflift=1');
    expect(a, '되돌린 화면에 밝기 축이 남아 있다').toEqual(leafTone(LEAF_BASE_A, LEAF_SAT));
    expect(b, '되돌린 화면에 밝기 축이 남아 있다').toEqual(leafTone(LEAF_BASE_B, LEAF_SAT));
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

  it('★★ `?leaflift=1` 은 기본 화면과 **다르다** — 노브가 조용히 무시되지 않는가', async () => {
    const [base] = await boot('');
    const [off] = await boot('?leaflift=1');
    expect(base[1], '노브를 줬는데 기본 화면과 같다 — 노브가 안 읽힌다')
      .toBeGreaterThan(off[1]);
  });

  it('★★★ `?leaflift=0` 이 화면에서 **0 으로 걸린다** — `??` 를 `||` 로 쓰면 깨진다', async () => {
    // ⚠ 이 검사가 없으면 `||` 로 바꾸는 뮤테이션이 안 잡힌다. `Number('0')` 은 falsy 라
    // `||` 면 유도값으로 새고, **노브의 하단이 통째로 사라진다** — `readNumOpt` 의 머리말이
    // 정확히 그 사고(`?wns=0`)를 적고 있다.
    //
    // 노브 함수만 재면 부족하다(그 함수는 이미 옳다). **화면 값**에서 재야 배선이 걸린다.
    const [a, b] = await boot('?leaflift=0');
    for (const c of [a, b]) for (const v of c) {
      expect(v, '배율 0 인데 잎에 색이 남았다 — 유도값으로 샜다').toBe(0);
    }
  });

  it('숫자 노브도 화면까지 간다 — 감독이 후보를 비교할 수 있어야 한다', async () => {
    const [a] = await boot('?leaflift=1.2');
    expect(a).toEqual(liftTone(leafTone(LEAF_BASE_A, LEAF_SAT), 1.2));
  });

  it('숫자가 아닌 값·범위 밖은 기본 경로를 안 망가뜨린다', async () => {
    const [base] = await boot('');
    // `Number('atuo')` 가 NaN 이라 `readNumOpt` 가 null 을 내고 유도값으로 간다.
    expect(await boot('?leaflift=atuo').then((t) => t[0]), '오타가 화면을 바꿨다').toEqual(base);
    // 상한 밖은 클램프된다 — `LEAF_LIFT_MAX` 를 값으로 다시 적지 않고 상수를 쓴다.
    expect(await boot('?leaflift=99').then((t) => t[0]), '상한이 안 걸린다')
      .toEqual(liftTone(leafTone(LEAF_BASE_A, LEAF_SAT), LEAF_LIFT_MAX));
  });
});
