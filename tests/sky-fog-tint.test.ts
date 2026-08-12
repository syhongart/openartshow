// 안개 하늘색 틴트 — **한쪽만 가면 안 된다.**
//
// ── 감독 지시에서 생겼다 ────────────────────────────────────────────────────
// *"안개를 약간 하늘색으로 하면 어떨까."*
//
// ── 왜 이 검사가 필요한가 ───────────────────────────────────────────────────
// 안개색은 `scene.fog` 만의 것이 아니다. `sky.js` 는 하늘 돔의 **지평선도 같은 색으로**
// 칠한다(주석 ⑨ *"지평선 = fog색 — 이음새 제거의 핵"*). 두 곳이 같은 값을 봐야 원경이
// 하늘에 녹아든다.
//
// 바로 이 정합을 한 번 깨뜨렸다. 밤이 어둡다는 지적에 `NIGHT_FOG_SCALE` 로 안개만 밝혔고,
// 지평선은 그대로여서 원경이 하늘보다 밝은 띠로 떴다 — 감독 판정 *"안개가 안보여"*.
//
// 그래서 이번에는 **팔레트 단계**에서 옮긴다. `lightOf()` 하나를 두 소비자가 함께
// 거치게 하고, 이 파일이 그 "함께"를 지킨다.

import { describe, it, expect } from 'vitest';
import { lightOf, FOG_SKY } from '../frontend/js/sky.js';
import {
  FOG_SKY_TINT_DAY, FOG_SKY_TINT_SUNSET, FOG_SKY_TINT_NIGHT,
} from '../frontend/js/world2/features/sky.js';

const TIMES = ['day', 'sunset', 'night'] as const;
/** 기본 계수를 시간대별로 — 이 맵은 상수에서 **유도**한다(값을 다시 적지 않는다) */
const TINT = {
  day: FOG_SKY_TINT_DAY, sunset: FOG_SKY_TINT_SUNSET, night: FOG_SKY_TINT_NIGHT,
} as const;
const WEATHERS = ['clear', 'overcast', 'rain', 'snow'] as const;

const ch = (hex: number) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

describe('lightOf — 안개만 옮기고 나머지는 손대지 않는다', () => {
  it('tint 0 이면 팔레트 객체를 그대로 돌려준다 (라이브 무변경 보장)', () => {
    // 사본조차 만들지 않아야 한다. `world.js` 는 이 옵션을 안 넘기므로, 여기서
    // 동일성(identity)이 깨지면 라이브 하늘이 이 변경에 노출된다.
    for (const t of TIMES) {
      for (const w of WEATHERS) {
        expect(lightOf(t, w, 0), `${t}/${w}`).toBe(lightOf(t, w, 0));
        expect(lightOf(t, w), `${t}/${w} 기본값`).toBe(lightOf(t, w, 0));
      }
    }
  });

  it('tint 를 걸면 안개가 하늘색 쪽으로 간다 — 파랑이 오르고 빨강이 내린다', () => {
    for (const t of TIMES) {
      for (const w of WEATHERS) {
        const [r0, g0, b0] = ch(lightOf(t, w).fog);
        const [r1, g1, b1] = ch(lightOf(t, w, 0.5).fog);
        const [sr, , sb] = ch(FOG_SKY);
        // 목표색보다 붉고 덜 푸른 팔레트라면 그 방향으로 움직여야 한다. 팔레트마다
        // 시작점이 달라 절대 부등호를 못 박을 수 없으므로 **목표 쪽으로 가까워졌는지**를
        // 본다 — 이것이 "섞는다"의 정의 그대로다.
        expect(Math.abs(r1 - sr), `${t}/${w} R`).toBeLessThanOrEqual(Math.abs(r0 - sr));
        expect(Math.abs(b1 - sb), `${t}/${w} B`).toBeLessThanOrEqual(Math.abs(b0 - sb));
        expect(g1).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('tint 1 이면 목표색에 정확히 닿는다 — 보간의 양 끝이 맞다', () => {
    expect(lightOf('night', 'clear', 1).fog).toBe(FOG_SKY);
  });

  it('안개 말고는 아무것도 안 바뀐다 — 조명은 밤 밝기 튜닝의 영역이다', () => {
    for (const t of TIMES) {
      for (const w of WEATHERS) {
        const a = lightOf(t, w);
        // 0.5 로 고정한다 — 기본 계수를 쓰면 밤이 0 이라 `a === b` 가 되어 이 검사가
        // 밤에서만 **아무것도 안 보게** 된다(통과하지만 검출력 0).
        const b = lightOf(t, w, 0.5);
        for (const k of ['sun', 'sunI', 'hemiS', 'hemiG', 'hemiI', 'sunEl'] as const) {
          expect(b[k], `${t}/${w} ${k}`).toBe(a[k]);
        }
      }
    }
  });

  // ⚠ 여기 있던 *"기본 계수가 「약간」 이다"* 검사를 지웠다. 그 단언(`0 < tint < 0.25`)은
  // 감독 판정 **이전의 내 해석**을 못 박은 것이었고, 2026-08-12 에 감독이 낮을 1 로
  // 확정하면서 뒤집혔다(*"주간일때는 흰색말고 하늘색어때"*). 판정이 바뀌었는데 검사만
  // 남으면 그 검사는 옳은 값을 막는 벽이 된다. 아래 검사가 **새 판정**을 대신 못 박는다.

  it('★ 시간대별 계수 — 낮만 걸고 밤은 팔레트 원본 그대로 (감독 판정 2026-08-12)', () => {
    // *"야간은 원래가 좋아. 연기 파란거 말고. 주간/야간 따로 가야해."*
    //
    // 밤은 **동일성(identity)** 까지 본다 — 색이 우연히 같은 것과 틴트 경로를 아예 안
    // 타는 것은 다른 일이고, 후자여야 "원래 그대로" 가 참이다.
    for (const w of WEATHERS) {
      expect(lightOf('night', w, TINT), `night/${w}`).toBe(lightOf('night', w, 0));
      expect(lightOf('day', w, TINT).fog, `day/${w}`).not.toBe(lightOf('day', w, 0).fog);
    }
  });

  it('★ 한 시간대를 켜도 다른 시간대는 안 움직인다 — 노브가 서로 새지 않는다', () => {
    // 노브를 셋으로 가른 이유가 이것이다. 하나가 다른 시간대로 새면 감독이 낮을
    // 고칠 때 밤이 함께 움직이고, 그러면 어느 쪽 판정인지 갈리지 않는다.
    for (const on of TIMES) {
      for (const t of TIMES) {
        const got = lightOf(t, 'clear', { [on]: 1 });
        if (t === on) expect(got.fog, `${on} 켬 → ${t}`).toBe(FOG_SKY);
        else expect(got, `${on} 켬 → ${t} 는 무변경`).toBe(lightOf(t, 'clear', 0));
      }
    }
  });

  it('숫자 계수는 전 시간대 공통이다 — 축약형의 뜻이 유지된다', () => {
    // 라이브 `world.js` 와 world3·world5 가 아직 숫자를 넘긴다. 객체를 도입하면서
    // 이 경로가 조용히 0 이 되면 그쪽 화면이 통째로 바뀐다.
    for (const t of TIMES) expect(lightOf(t, 'clear', 1).fog, t).toBe(FOG_SKY);
  });

  it('상수가 감독 판정과 같은 방향이다 — 낮은 켜고, 밤은 끈다', () => {
    expect(FOG_SKY_TINT_DAY).toBeGreaterThan(0);
    expect(FOG_SKY_TINT_NIGHT).toBe(0);
    // 노을은 **감독 미판정**이다. 값을 못 박지 않고 범위만 본다 — 판정 없는 값을
    // 단언으로 굳히면 그것이 판정처럼 읽힌다.
    expect(FOG_SKY_TINT_SUNSET).toBeGreaterThanOrEqual(0);
    expect(FOG_SKY_TINT_SUNSET).toBeLessThanOrEqual(1);
  });
});

describe('지평선과 안개가 같은 값을 본다 — 정합이 이 변경의 본체다', () => {
  // ── 왜 색만 비교하지 않는가 ────────────────────────────────────────────────
  // `lightOf` 가 옳아도 **소비자 한쪽이 그것을 안 거치면** 정합은 깨진다. 실제로 그렇게
  // 깨졌고, 그때 순수 함수는 멀쩡했다. 그러니 검사할 것은 함수가 아니라 **소비 지점**이다.
  //
  // 돔 페인팅은 캔버스가 필요해 여기서 돌릴 수 없다. 대신 `sky.js` 소스를 읽어 팔레트
  // 조회가 전부 `lightOf` 를 거치는지, 그리고 돔 페인터에 계수가 실제로 전달되는지를
  // 본다 — 정적 검사지만 **경계를 건너는 지점**을 정확히 겨눈다.
  const src = readSky();

  it('팔레트 직접 조회(LIGHT[...][...])가 안개 소비 경로에 남아 있지 않다', () => {
    // `getSunDir`·달 방위는 안개를 안 쓰므로 직접 조회해도 무해하다. 문제가 되는 것은
    // **fog 를 꺼내 쓰는** 두 지점이다.
    const lines = src.split('\n');
    const bad: string[] = [];
    lines.forEach((ln, i) => {
      if (!/LIGHT\[[^\]]+\]\[[^\]]+\]/.test(ln)) return;
      // `lightOf` 자신은 테이블을 읽어야 한다 — 틴트를 거는 **그 함수**다.
      if (/function lightOf/.test(lines.slice(Math.max(0, i - 3), i).join(' '))) return;
      // 이 줄 또는 이어지는 3줄 안에서 fog 를 쓰면 틴트를 우회한 것이다.
      const window = lines.slice(i, i + 4).join(' ');
      if (/\bfog\b/.test(window) || /asVec\(/.test(window)) bad.push(`${i + 1}: ${ln.trim()}`);
    });
    expect(bad, '안개를 쓰면서 팔레트를 직접 조회하는 줄').toEqual([]);
  });

  it('돔 페인터에 계수가 전달된다 — 안 넘기면 지평선만 옛 색으로 남는다', () => {
    // `paintSky` 는 `opts.fogTint` 를 읽는다. 그것을 만드는 `pOpts` 에 계수가 없으면
    // 지평선은 `undefined` → 0 으로 계산돼 **안개만** 옮겨 간다. 정확히 감독이 본 그림이다.
    expect(src).toMatch(/const L = lightOf\(time, weather, opts\.fogTint\)/);
    expect(src).toMatch(/const pOpts = \{[^}]*fogTint[^}]*\}/);
  });

  it('createSkySystem 이 계수를 받고 기본이 0 이다 — 라이브는 무변경', () => {
    expect(src).toMatch(/export function createSkySystem\(\{[^}]*fogTint = 0[^}]*\}\)/);
  });

  it('★ world2 조립부가 세 노브를 전부 넘긴다 — 하나라도 빠지면 그 시간대가 죽는다', () => {
    // 순수 함수(`lightOf`)가 시간대를 갈라도 **조립부가 숫자 하나를 넘기면** 분기가
    // 통째로 무의미해진다. 그 경계는 위 단언 어디에도 안 걸린다 — 이 저장소가 구름
    // `alpha` 미소비로 이미 값을 치른 자리다.
    const f = readSrc('frontend/js/world2/features/sky.js');
    const block = /fogTint:\s*\{([^}]*)\}/.exec(f);
    expect(block, 'features/sky.ts 의 fogTint 객체 리터럴').not.toBeNull();
    for (const [key, knob] of [['day', 'fogsky'], ['sunset', 'fogskys'], ['night', 'fogskyn']]) {
      expect(block![1], `${key} 배선`).toMatch(new RegExp(`${key}:\\s*readNum\\('${knob}'`));
    }
  });
});

/** 저장소 루트 기준 상대경로로 원문을 읽는다. 소비 지점을 보는 검사라 소스가 대상이다 */
function readSrc(rel: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { readFileSync } = require('node:fs') as typeof import('node:fs');
  const { fileURLToPath } = require('node:url') as typeof import('node:url');
  const { dirname, join } = require('node:path') as typeof import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  // `.js` 로 오면 `.ts` 원본을 먼저 본다 — 소비 배선이 사는 곳이 그쪽이다(산출 `.js` 는
  // 빌드 시점에만 존재할 수 있고, 없으면 이 검사가 조용히 빈 문자열을 보게 된다).
  const abs = join(here, '..', rel);
  const ts = abs.replace(/\.js$/, '.ts');
  const { existsSync } = require('node:fs') as typeof import('node:fs');
  return readFileSync(existsSync(ts) ? ts : abs, 'utf8');
}

/** `sky.js` 원문 */
function readSky(): string {
  return readSrc('frontend/js/sky.js');
}
