// world5(뉴욕 야경) 파츠 자산 계약 — **팔레트 규약 + 파사드 아틀라스.**
//
// ── 이 파일이 왜 생겼나 ─────────────────────────────────────────────────────
// ① `parts/palette.ts` 머리말이 *"`tests/world5-parts-assets.test.ts` 가 `parts/` 안의
//    hex 리터럴을 세어 강제한다"* 라고 적고 있었는데 **그 파일이 없었다.** 게이트
//    유효성에 대한 거짓 진술은 다음 사람이 확인을 생략하게 만든다 — 이 저장소가
//    behind-flag 괄호·hookify 검출력·`main` unprotected 로 세 번 값을 치른 형태다.
//    문장을 고치는 대신 **주장을 참으로 만든다**(GS-3 때와 같은 처방).
// ② 감독 지시(2026-08-08 *"밤에 건물 네온. 건물 외벽 조명도 넣고"*)로 일반 건물에
//    창문·외벽 조명이 들어왔다. 그 코드 경로를 **실제로 돌리는** 검사가 필요하다.
//
// ── 무엇을 여기서 재고 무엇을 저기서 재는가 ─────────────────────────────────
// `tests/world5-neon-glow.test.ts` 의 G3·G3-b 가 **실물 `asset()` × 실물 `NeonGlow`**
// 를 이미 본다(`emissive` 비검정 · `emissiveMap` 존재 · 밤 세기 도달). `neon` 한 줄을
// 신고하면 그 검사들이 자동으로 새 파츠를 집으므로 **여기에 다시 적지 않는다.**
// 여기서 재는 것은 그쪽이 안 덮는 축이다 — 아틀라스 칸의 내용, 면별 UV 배정,
// 삼각형 수 불변, 색의 출처.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as T3 from 'three';

import {
  building, FACADE_CELLS, FACE_CELL, facadeUv, A_WIN_OFF, type MaskPaint,
} from '../frontend/js/world5/parts/building.js';
import { tower } from '../frontend/js/world5/parts/tower.js';
import { V } from '../frontend/js/world5/parts/palette.js';
import { NEON_PARTS } from '../frontend/js/world5/parts/index.js';
import { DEFAULT_LAYOUT, type PlacedPart, type ThreeNS } from '../frontend/js/world5/parts/types.js';

/** vitest 는 프로젝트 루트에서 돈다. `import.meta.url` 은 환경에 따라 다른 곳을 가리킨다 */
const PARTS_DIR = join(process.cwd(), 'frontend/js/world5/parts');

// ══════════════════════════════════════════════════════════════════════════
// §1 색은 palette.ts 한 곳에서만 온다
// ══════════════════════════════════════════════════════════════════════════
//
// 없으면 다음 사람이 편한 자리에 hex 한 줄을 적고, 그 순간부터 *"색은 palette.ts 에
// 있다"* 가 절반만 참이 된다 — world2 가 정확히 그 상태였다(47곳 하드코딩).

/** 6자리 hex 만 색으로 본다. `salt`(8자리)는 난수 시드지 색이 아니다 — 자릿수로 갈린다 */
const HEX6 = /0x[0-9a-fA-F]{6}\b(?![0-9a-fA-F])/g;
/** CSS 문자열 색. 캔버스가 `fillStyle` 에 쓰는 형태 */
const CSS_HEX = /['"]#[0-9a-fA-F]{3,8}['"]/g;

/**
 * 검사에서 빼는 **줄**. 파일 통째 면제보다 구멍이 작다.
 *
 * `garden.ts` 의 `GRASS_NOISE_SEED = 0x67a55e` 가 유일한 대상이다 — 6자리라 색으로
 * 읽히지만 난수 시드다(그 파일 주석이 *"`0x67a55e` 를 초록색으로 읽고 팔레트로 옮기려는"*
 * 오독을 이미 경고한다). 파일 단위로 면제하면 `garden.ts` 의 **진짜** 색 리터럴까지
 * 통과하므로 줄 단위로 좁힌다.
 */
const EXEMPT_LINE = /NOISE_SEED/;

/**
 * 주석을 걷어낸다. **줄 끝 주석까지 걷는다** — 검수관 조건 C3(2026-08-09).
 *
 * ── 왜 고쳤나: 게이트가 정답을 벌주고 있었다 ────────────────────────────────
 * 처음에는 `/^\s*\/\//`, 즉 **줄 전체가 주석인 것만** 걷었다. 그래서 이런 줄이 위반으로
 * 잡혔다(검수관 실측 재현):
 *
 *     const A_ROOF = 0.18; // 예전 값은 0x8892a0 톤이었다
 *
 * 이 저장소의 핵심 규율이 *"판정을 값 **옆에** 기록한다 — 왜 그 값인지, 실측 표, 그리고
 * 판정이 뒤집혔으면 왜 틀렸는지까지"* 다. 옛 색을 값 옆에 적는 것은 **규율이 시키는
 * 일**인데 게이트가 그것을 FAIL 로 만들었다. 2026-08-08 `node-version-file` 조건 1 과
 * 같은 형태다.
 *
 * ⚠️ **문자열 안의 `//` 도 함께 걷힌다.** URL(`http://`)이 파츠 코드에 있으면 그 뒤가
 * 잘린다. 지금은 자기완결 규율(외부 호스트 0)이라 파츠에 URL 이 없고, 있으면 그것이
 * 먼저 문제다 — 즉 이 한계는 **다른 규율이 막아 준다.** 걷어낸 뒤 남는 것에만 색
 * 정규식을 돌리므로, 잘려서 놓치는 것이 있다면 그건 문자열 안의 색이고 그건 애초에
 * 팔레트로 가야 할 값이다(놓치는 방향이 안전한 쪽이다).
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .filter((l) => !EXEMPT_LINE.test(l))
    .join('\n');
}

/** 위반 목록. **순수 함수로 빼 둔 것이 요점이다** — 검출기 자신을 시험할 수 있다 */
function findColorLiterals(src: string): string[] {
  const code = stripComments(src);
  return [...(code.match(HEX6) ?? []), ...(code.match(CSS_HEX) ?? [])];
}

describe('§1 색은 palette.ts 한 곳에서만 온다', () => {
  /** 검사에서 빼는 파일과 그 이유. **이유 없는 예외가 쌓이면 검사가 서서히 무력해진다** */
  const EXEMPT: Record<string, string> = {
    'palette.ts': '팔레트 자신 — 색의 출처',
    'color.ts': 'hex→CSS 포맷터와 마스크 강도. 색을 담지 않는다',
    'bake.ts': 'hex→정점색 변환 유틸. 색을 담지 않는다',
  };

  const files = readdirSync(PARTS_DIR).filter((f) => f.endsWith('.ts'));

  it('표본이 비어 있지 않다 — 빈 목록은 아래를 전부 통과시킨다', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  // 뮤테이션: 어느 파츠에든 `const X = 0xabcdef;` 를 넣으면 깨진다.
  it('파츠 파일에 색 리터럴이 없다', () => {
    const offenders: string[] = [];
    for (const f of files) {
      if (f in EXEMPT) continue;
      for (const m of findColorLiterals(readFileSync(join(PARTS_DIR, f), 'utf8'))) {
        offenders.push(`${f}: ${m}`);
      }
    }
    // 실패 메시지가 곧 처방이 되게 한다 — "이 색에 이름을 붙여 palette.ts 로 옮겨라".
    expect(offenders).toEqual([]);
  });

  // ⚠️ **검출기 자신을 시험한다.** 이 저장소는 규칙 파일의 정규식이 조용히 깨져 검출력이
  // 0 이 된 사고를 이미 겪었다(hookify `curl` 규칙 — 파일을 통째로 지워도 0 failed).
  // 위 검사는 "위반 0" 을 단언하므로 **검출기가 죽어도 초록**이다. 그 구멍을 여기서 막는다.
  //
  // 뮤테이션: `HEX6` 나 `CSS_HEX` 를 깨뜨리면(예: `{6}` → `{9}`) 이 검사가 깨진다.
  it('검출기가 살아 있다 — 위반 0 은 검출기가 죽어도 참이다', () => {
    expect(findColorLiterals('const x = 1;')).toEqual([]);
    expect(findColorLiterals('const x = 0xabcdef;')).toEqual(['0xabcdef']);
    expect(findColorLiterals("g.fillStyle = '#ff00aa';")).toEqual(["'#ff00aa'"]);
    // 주석 안의 hex 는 설명이지 위반이 아니다 — 안 걷어내면 이 저장소의 주석 규율과
    // 충돌해 검사가 곧 꺼진다.
    expect(findColorLiterals('// 예전 값은 0xabcdef 였다')).toEqual([]);
    expect(findColorLiterals('/* 0xabcdef */\nconst x = 1;')).toEqual([]);
    // ★ **줄 끝 주석**도 걷어야 한다 (검수관 C3). 이 저장소는 판정을 값 옆에 적는 것이
    //   규율이라, 안 걷으면 게이트가 규율을 따른 코드를 벌준다. 아래가 그 실측 재현이다.
    expect(findColorLiterals('const A_ROOF = 0.18; // 예전 값은 0x8892a0 톤이었다')).toEqual([]);
    expect(findColorLiterals("const x = 1; // '#ff00aa' 였다")).toEqual([]);
    // 그러면서 **같은 줄의 코드 쪽 위반은 여전히 잡아야 한다** — 주석을 붙이면 통과하는
    //   구멍이 되면 그것이 더 나쁘다.
    expect(findColorLiterals('const c = 0xabcdef; // 왜 이 색인지')).toEqual(['0xabcdef']);
    // 8자리는 시드다.
    expect(findColorLiterals('const salt = 0x7f4a7c15;')).toEqual([]);
    // 줄 면제가 실제로 걸린다.
    expect(findColorLiterals('const GRASS_NOISE_SEED = 0x67a55e;')).toEqual([]);
    // ⚠️ 그리고 그 면제가 **너무 넓지 않다** — 이름이 다르면 그대로 잡혀야 한다.
    expect(findColorLiterals('const GRASS_TINT = 0x67a55e;')).toEqual(['0x67a55e']);
  });

  it('면제 목록이 실재하는 파일을 가리킨다 — 죽은 예외는 구멍이다', () => {
    for (const f of Object.keys(EXEMPT)) expect(files, `${f} 없음`).toContain(f);
  });

  it('팔레트가 실제로 소비된다 — 아무도 안 쓰면 위 검사는 공허하다', () => {
    const users = files
      .filter((f) => !(f in EXEMPT))
      .filter((f) => /from '\.\/palette\.js'/.test(readFileSync(join(PARTS_DIR, f), 'utf8')));
    expect(users.length).toBeGreaterThan(files.length / 2);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// §2 파사드 아틀라스 — 창문과 외벽 조명은 **다른 물건이다**
// ══════════════════════════════════════════════════════════════════════════
//
// 감독은 둘을 따로 지시했다 — *"밤에 건물 네온. 건물 외벽 조명도 넣고."* 창은 안에서
// 새어 나오는 빛이고 외벽 조명은 밖에서 벽을 비추는 빛이다. 둘이 같은 것이 되면 지시
// 하나가 조용히 사라진다.

const SIDE_CELLS = 4;
const CELL_ROOF = 4;
const CELL_UNDER = 5;
const CELL_W = 32;
const CELL_H = 64;

const sides = FACADE_CELLS.slice(0, SIDE_CELLS);
const byRole = (paints: readonly MaskPaint[], role: MaskPaint['role']) =>
  paints.filter((p) => p.role === role);

/** 칠 하나의 세로 구간 [y, y+h) */
const span = (p: MaskPaint): [number, number] => [p.y, p.y + p.h];

describe('§2 파사드 아틀라스', () => {
  it('표본이 실재한다 — 칸이 비면 아래 단언이 전부 공허해진다', () => {
    expect(FACADE_CELLS.length).toBe(6);
    for (let i = 0; i < SIDE_CELLS; i++) {
      expect(FACADE_CELLS[i].paints.length, `측면 ${i}`).toBeGreaterThan(20);
    }
    expect(FACADE_CELLS[CELL_ROOF].paints.length).toBeGreaterThan(0);
  });

  // 뮤테이션: 바닥 칸에 칠을 하나라도 넣으면 깨진다. 바닥이 빛나면 건물이 땅에서 뜬다.
  it('바닥 칸은 발광 0 이다', () => {
    expect(FACADE_CELLS[CELL_UNDER].paints).toEqual([]);
  });

  // ⭐ 이 회차의 핵심 요구다 — *"같은 창문 배열이 도시 전체에 반복되면 그것이 가장 먼저
  //    눈에 띄는 인공물이다."*
  //
  // ⚠️ **첫 판본은 `new Set(서명).size === 4` 였고 검출력이 부족했다.** 뮤테이션 M1
  // (셀 시드를 인덱스와 무관하게 = `lcg(FACADE_SEED)`)에 **안 깨졌다.** 셀마다 다른
  // 것이 시드만이 아니라 점등률·따뜻함 비율이기도 해서, 같은 난수열이어도 임계값이
  // 달라 서명은 달라진다. 그러나 그때 네 면은 **포함관계**가 된다 — 점등률이 큰 면이
  // 작은 면의 상위집합이라, 화면에서는 같은 배열의 농담 차이로 보인다.
  //
  // 그래서 "다르다" 가 아니라 **"양쪽으로 다르다"** 를 잰다. 포함관계면 한 방향
  // 차집합이 0 이 되어 깨진다.
  // 뮤테이션: 셀 시드를 인덱스 무관하게 만들면 깨진다(M1 재실측으로 확인).
  it('네 측면의 켜진 창 배열이 서로 포함관계가 아니다 — 여섯 쌍 전부', () => {
    const litSet = sides.map((c) =>
      new Set(byRole(c.paints, 'window').filter((p) => p.a !== A_WIN_OFF)
        .map((p) => `${p.x},${p.y}`)));
    for (const s of litSet) expect(s.size, '켜진 창 표본이 비었다').toBeGreaterThan(10);
    for (let a = 0; a < SIDE_CELLS; a++) {
      for (let b = a + 1; b < SIDE_CELLS; b++) {
        const only = (x: Set<string>, y: Set<string>) => [...x].filter((k) => !y.has(k)).length;
        const total = Math.max(litSet[a].size, litSet[b].size);
        // 10% 는 독립 난수의 기대 차이(≈30%)와 포함관계(0%) 사이에 넉넉히 든다.
        expect(only(litSet[a], litSet[b]), `면 ${a} 에만 있는 창`).toBeGreaterThan(total * 0.1);
        expect(only(litSet[b], litSet[a]), `면 ${b} 에만 있는 창`).toBeGreaterThan(total * 0.1);
      }
    }
  });

  // 뮤테이션: 업라이트 구간(`UPLIGHT_Y`)을 창문 구간 안으로 옮기면 깨진다.
  //           = 감독이 따로 지시한 두 가지가 한 가지로 합쳐지는 회귀.
  it('창문 텍셀과 외벽 조명 텍셀이 겹치지 않는다', () => {
    for (let i = 0; i < SIDE_CELLS; i++) {
      const win = byRole(sides[i].paints, 'window').map(span);
      const wall = (['uplight', 'cornice', 'sign'] as const)
        .flatMap((r) => byRole(sides[i].paints, r)).map(span);
      expect(win.length, `측면 ${i} 창문 표본`).toBeGreaterThan(0);
      expect(wall.length, `측면 ${i} 외벽 조명 표본`).toBeGreaterThan(0);
      for (const [a0, a1] of win) {
        for (const [b0, b1] of wall) {
          expect(a0 < b1 && b0 < a1, `측면 ${i}: 창 [${a0},${a1}) 과 외벽 [${b0},${b1}) 가 겹친다`)
            .toBe(false);
        }
      }
    }
  });

  // 뮤테이션: `WIN_COLS` 를 7 로 늘리면 마지막 열이 셀 밖으로 나가 깨진다.
  //           칸을 넘는 칠은 **이웃 칸을 오염시킨다** — 화면에서는 옥상 조명이 벽에
  //           묻어나는 형태로 나타나고, 원인을 짚기 어렵다.
  it('모든 칠이 자기 칸 안에 있다', () => {
    for (const [i, c] of FACADE_CELLS.entries()) {
      for (const p of c.paints) {
        expect(p.x, `칸 ${i} x`).toBeGreaterThanOrEqual(0);
        expect(p.y, `칸 ${i} y`).toBeGreaterThanOrEqual(0);
        expect(p.x + p.w, `칸 ${i} 우변`).toBeLessThanOrEqual(CELL_W);
        expect(p.y + p.h, `칸 ${i} 하변`).toBeLessThanOrEqual(CELL_H);
      }
    }
  });

  // 뮤테이션: 업라이트 루프 · 코니스 · 간판 중 무엇을 지워도 깨진다.
  //           = 감독 지시 *"건물 외벽 조명도 넣고"* 가 화면에서 사라지는 것을 막는다.
  it('외벽 조명 세 종류가 각 측면에 실재한다', () => {
    for (let i = 0; i < SIDE_CELLS; i++) {
      expect(byRole(sides[i].paints, 'uplight').length, `측면 ${i} 업라이트`).toBeGreaterThan(2);
      expect(byRole(sides[i].paints, 'cornice').length, `측면 ${i} 코니스`).toBe(1);
      expect(byRole(sides[i].paints, 'sign').length, `측면 ${i} 간판`).toBe(1);
    }
  });

  // 뮤테이션: 그라데이션 방향을 뒤집으면(`1 - k`) 깨진다. 밖에서 비추는 빛은 밑동이
  //           가장 밝다 — 뒤집히면 벽 중턱이 밝은 "떠 있는 띠" 가 된다.
  it('업라이트는 아래로 갈수록 밝다', () => {
    for (let i = 0; i < SIDE_CELLS; i++) {
      const up = [...byRole(sides[i].paints, 'uplight')].sort((a, b) => a.y - b.y);
      for (let k = 1; k < up.length; k++) {
        expect(up[k].a, `측면 ${i} 줄 ${k}`).toBeGreaterThan(up[k - 1].a);
      }
    }
  });

  // 뮤테이션: 점등률을 1(전부 켜짐) 이나 0(전부 꺼짐) 으로 하면 깨진다.
  //           전부 켜지면 인쇄된 무늬가 되고, 전부 꺼지면 폐건물이 된다.
  //
  // ⚠️ **첫 판본은 꺼진 창을 "알파 최솟값" 으로 정의했고 검출력이 없었다.** 뮤테이션
  // M9(점등률 전부 1)에 안 깨졌다 — 전부 켜져도 warm 과 cool 의 알파가 달라서 cool 이
  // "최솟값 = 꺼짐" 으로 세어졌다. 그래서 기준을 `A_WIN_OFF` 로 못 박는다.
  it('켜진 창과 꺼진 창이 둘 다 있고, 켜진 쪽이 밝다', () => {
    for (let i = 0; i < SIDE_CELLS; i++) {
      const win = byRole(sides[i].paints, 'window');
      const off = win.filter((p) => p.a === A_WIN_OFF);
      const on = win.filter((p) => p.a !== A_WIN_OFF);
      expect(on.length, `측면 ${i} 켜진 창`).toBeGreaterThan(win.length * 0.2);
      expect(off.length, `측면 ${i} 꺼진 창`).toBeGreaterThan(win.length * 0.2);
      expect(Math.min(...on.map((p) => p.a))).toBeGreaterThan(A_WIN_OFF);
    }
  });

  // 뮤테이션: 어느 칠에든 팔레트 밖 hex 를 쓰면 깨진다.
  //           §1 은 **텍스트**를 보고 이것은 **값**을 본다 — `V.x` 라고 적어 놓고
  //           산술로 색을 만드는 경로는 §1 이 못 잡는다.
  it('모든 칠의 색이 팔레트 값이다', () => {
    const palette = new Set<number>(Object.values(V));
    for (const [i, c] of FACADE_CELLS.entries()) {
      for (const p of c.paints) {
        expect(palette.has(p.hex), `칸 ${i}: 0x${p.hex.toString(16)} 는 팔레트에 없다`).toBe(true);
      }
    }
  });

  // 뮤테이션: 세기 상수 중 하나를 순서가 뒤집히게 바꾸면 깨진다.
  //           `A_UP_MAX` 를 `A_WIN_WARM` 위로 올리면 벽이 형광판이 된다.
  it('세기 순서가 고정돼 있다 — 뒤집히면 룩이 무너진다', () => {
    const maxOf = (role: MaskPaint['role']) =>
      Math.max(...sides.flatMap((c) => byRole(c.paints, role)).map((p) => p.a));
    const cornice = maxOf('cornice');
    const sign = maxOf('sign');
    const win = maxOf('window');
    const up = maxOf('uplight');
    const roof = Math.max(...byRole(FACADE_CELLS[CELL_ROOF].paints, 'rooftop')
      .filter((p) => p.hex !== V.aviationRed).map((p) => p.a));
    expect(cornice).toBeGreaterThan(sign);
    expect(sign).toBeGreaterThan(win);
    expect(win).toBeGreaterThan(up);
    expect(up).toBeGreaterThan(roof);
  });

  // ⭐ **일반 건물이 마천루보다 어두워야 한다.** 세기 신고(`neon.night`)는 0.95 대 1 로
  //    5% 차이뿐이라, 실제 격차는 마스크 알파가 만든다.
  // 뮤테이션: `A_WIN_WARM` 을 0.5 이상으로 올리면 깨진다(= 스카이라인 주인공 역전).
  it('건물 창이 마천루 창보다 어둡다', () => {
    const winMax = Math.max(...sides.flatMap((c) => byRole(c.paints, 'window')).map((p) => p.a));
    // 0.50 은 `tower.ts` 의 `put(M.winWarm, V.windowWarm, 0.50)` 이다. **미러링이다** —
    // 저쪽 값을 export 하지 않으므로 여기 적는 수밖에 없고, 그래서 이 검사가 저쪽
    // 값을 올릴 때 함께 봐야 할 자리라는 것을 이 주석이 알린다.
    expect(winMax).toBeLessThan(0.5);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// §3 면별 UV 배정 — **실물 지오를 굽는다**
// ══════════════════════════════════════════════════════════════════════════

/** 2D 컨텍스트 스텁. jsdom·node 어느 쪽에도 네이티브 canvas 가 없다 */
function stubCanvas() {
  const ctx: Record<string, unknown> = { fillStyle: '', globalAlpha: 1 };
  for (const m of ['fillRect', 'clearRect', 'save', 'restore']) ctx[m] = () => {};
  return { width: 1, height: 1, getContext: () => ctx };
}

/** `asset()` 을 부르는 동안만 `document` 를 스텁으로. 전역을 영구히 바꾸지 않는다 */
function withCanvas<R>(fn: () => R): R {
  const g = globalThis as { document?: unknown };
  const had = 'document' in g;
  const prev = g.document;
  g.document = { createElement: (tag: string) => (tag === 'canvas' ? stubCanvas() : {}) };
  try {
    return fn();
  } finally {
    if (had) g.document = prev; else delete g.document;
  }
}

/**
 * ⚠️ **`describe` 본문에서 굽지 않는다.** 첫 판본은 여기서 한 번 구워 상수로 뒀는데,
 * `asset()` 이 던지는 뮤테이션(M8 — 박스 세그먼트를 늘려 정점 수 가드를 깨뜨림)에서
 * **수집 자체가 실패해 §3 전체가 한 번도 안 돌았다.** 게이트는 빨간불이었으므로 사고는
 * 아니지만, 다른 결함이 이 축을 통째로 가릴 수 있는 형태다 — 이 저장소가
 * *"못 잰 것이 통과로 적히는 경향"* 을 상시 위험으로 적어 둔 그 자리다.
 */
function bakeBuilding() {
  const built = withCanvas(() => building.asset(T3 as unknown as ThreeNS));
  return {
    built,
    geo: built.geometry as unknown as {
      index: { count: number } | null;
      attributes: { uv: { count: number; getX(i: number): number; getY(i: number): number } };
    },
  };
}

describe('§3 박스 여섯 면이 아틀라스의 서로 다른 칸을 읽는다', () => {

  // 뮤테이션: `FACE_CELL` 의 항목을 하나라도 중복시키면 깨진다.
  it('여섯 면이 여섯 칸에 1:1로 배정된다', () => {
    expect(FACE_CELL.length).toBe(6);
    expect(new Set(FACE_CELL).size).toBe(6);
  });

  // ⭐ **핵심 통합 검사.** 판정(`facadeUv`)과 집행(`facadeBox`)을 잇는 지점은 어느 쪽
  //    단위 검사도 안 본다 — 이 저장소가 *"경계를 건너는 지점은 아무도 안 본다"* 로
  //    이미 데인 자리다.
  // 뮤테이션: `facadeBox` 의 UV 리매핑 루프를 지우면 여섯 면이 전부 [0,1]² 가 되어
  //           **아래 두 단언이 모두** 깨진다.
  it('각 면의 UV 가 자기 칸 사각형과 정확히 일치한다', () => {
    const uv = bakeBuilding().geo.attributes.uv;
    expect(uv.count).toBe(24);
    for (let f = 0; f < 6; f++) {
      const want = facadeUv(FACE_CELL[f]);
      const us: number[] = [];
      const vs: number[] = [];
      for (let k = 0; k < 4; k++) {
        us.push(uv.getX(f * 4 + k));
        vs.push(uv.getY(f * 4 + k));
      }
      expect(Math.min(...us), `면 ${f} u0`).toBeCloseTo(want.u0, 6);
      expect(Math.max(...us), `면 ${f} u1`).toBeCloseTo(want.u1, 6);
      expect(Math.min(...vs), `면 ${f} v0`).toBeCloseTo(want.v0, 6);
      expect(Math.max(...vs), `면 ${f} v1`).toBeCloseTo(want.v1, 6);
    }
  });

  // 위 검사는 구현과 같은 `facadeUv` 를 본다. 이 검사는 **그 함수와 무관하게** 성립하는
  // 성질을 잰다 — 여섯 영역이 실제로 안 겹치는가. 둘을 함께 둬야 한쪽이 틀려도 잡힌다.
  it('여섯 면의 UV 영역이 서로 겹치지 않는다', () => {
    const uv = bakeBuilding().geo.attributes.uv;
    const box = (f: number) => {
      const us: number[] = []; const vs: number[] = [];
      for (let k = 0; k < 4; k++) { us.push(uv.getX(f * 4 + k)); vs.push(uv.getY(f * 4 + k)); }
      return [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)] as const;
    };
    for (let a = 0; a < 6; a++) {
      for (let b = a + 1; b < 6; b++) {
        const [ax0, ax1, ay0, ay1] = box(a);
        const [bx0, bx1, by0, by1] = box(b);
        const overlap = ax0 < bx1 && bx0 < ax1 && ay0 < by1 && by0 < ay1;
        expect(overlap, `면 ${a} 와 ${b} 의 UV 가 겹친다`).toBe(false);
      }
    }
  });

  // ⭐ **참고안이 못 박은 규율**: *"창문은 텍스처. 지오메트리 절대 금지."*
  // 뮤테이션: 창 하나라도 지오로 추가하면 깨진다.
  // ⚠️ 이 규약을 지키는 스모크 게이트(`[7]`·`[7.6]`)는 `world2.html` 을 보므로 world5
  //    변경으로는 **안 깨진다.** 지금 이 규약을 지켜 주는 것은 이 단언 하나뿐이다.
  it('삼각형 수가 단색 박스 시절 그대로다 — 창을 지오로 만들지 않았다', () => {
    const { geo } = bakeBuilding();
    expect(geo.index).not.toBeNull();
    expect(geo.index!.count).toBe(36); // 12 삼각형
  });

  it('파츠당 지오 하나 · 재질 하나', () => {
    const { built } = bakeBuilding();
    expect(built.geometry).toBeTruthy();
    expect(built.material).toBeTruthy();
    expect(Array.isArray(built.material)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// §4 인스턴스 다양성이 기대는 축
// ══════════════════════════════════════════════════════════════════════════
//
// UV 는 지오메트리 attribute 라 인스턴스마다 다르게 줄 수 없다(계약을 안 깨고는 불가능 —
// 판정 경위는 `building.ts` 의 「고른 길」 주석). 그래서 화면의 다양성은 **회전**이
// 만든다: 어느 면이 카메라 쪽에 오는지가 채마다 갈린다.
//
// 그 의존을 여기서 못 박는다. `ry` 가 상수가 되는 날 창문 다양성은 **조용히 0** 이 되고,
// 화면에서는 "왜인지 도시가 반복돼 보인다" 로만 나타난다.
describe('§4 회전이 인스턴스 다양성을 만든다', () => {
  // 뮤테이션: `place` 의 `ry` 를 0 고정으로 바꾸면 깨진다.
  it('`place` 가 뽑는 `ry` 가 여러 값이다', () => {
    const out: PlacedPart[] = [];
    for (let px = -6; px <= 6; px++) {
      for (let pz = -6; pz <= 6; pz++) {
        let s = (px * 73856093) ^ (pz * 19349663) ^ 0x5bd1e995;
        const rnd = () => {
          s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
          return s / 4294967296;
        };
        out.push(...building.place({
          px, pz, rnd, o: DEFAULT_LAYOUT,
          halfX: DEFAULT_LAYOUT.cellX / 2 - DEFAULT_LAYOUT.margin,
          halfZ: DEFAULT_LAYOUT.cellZ / 2 - DEFAULT_LAYOUT.margin,
          placed: [], radiusOf: () => 0,
        }));
      }
    }
    // 표본이 비면 아래 단언이 공허하다 — 광장·타워·공원 파셀은 건물을 안 낸다.
    expect(out.length, '배치 표본이 비었다').toBeGreaterThan(50);
    expect(new Set(out.map((p) => p.ry)).size, '회전이 사실상 고정이다').toBeGreaterThan(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// §5 발광 신고 — 스카이라인의 주인공은 마천루다
// ══════════════════════════════════════════════════════════════════════════
//
// 블룸 문턱 여유·배선 도달·낮밤 값은 `tests/world5-neon-glow.test.ts` 가 `NEON_PARTS`
// 순회로 이미 본다. **여기서 다시 적지 않는다.** 그쪽이 안 보는 것은 파츠들 **사이의**
// 서열이다.
describe('§5 건물 발광 신고', () => {
  const b = NEON_PARTS.find((p) => p.kind === 'building');

  // 뮤테이션: `building.ts` 에서 `neon` 줄을 지우면 깨진다.
  //           = 감독 지시가 화면에 하나도 안 나타나는 그 상태로 되돌아간다.
  it('건물이 발광을 신고한다 — 이것이 없으면 배선이 건물을 아예 안 집는다', () => {
    expect(b, 'building 이 NEON_PARTS 에 없다').toBeDefined();
  });

  // 뮤테이션: `building.neon.night` 를 1 이상으로 올리면 깨진다.
  it('마천루보다 밝지 않다 — 밝으면 스카이라인의 주인공이 뒤집힌다', () => {
    expect(tower.neon).toBeDefined();
    expect(b!.night).toBeLessThan(tower.neon!.night);
    expect(b!.day).toBeLessThan(tower.neon!.day);
  });

  // 뮤테이션: `day` 를 0 으로 내리면 깨진다. 0 은 "구조적으로 꺼짐" 이라 낮 화면이
  //           이 변경 전과 완전히 같아진다(민무늬 박스).
  it('낮에 완전히 꺼져 있지는 않다 — 도시는 낮에도 실내등이 있다', () => {
    expect(b!.day).toBeGreaterThan(0);
  });
});
