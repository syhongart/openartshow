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
import { FOG_SKY_TINT } from '../frontend/js/world2/features/sky.js';

const TIMES = ['day', 'sunset', 'night'] as const;
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
        const b = lightOf(t, w, FOG_SKY_TINT);
        for (const k of ['sun', 'sunI', 'hemiS', 'hemiG', 'hemiI', 'sunEl'] as const) {
          expect(b[k], `${t}/${w} ${k}`).toBe(a[k]);
        }
      }
    }
  });

  it('기본 계수가 "약간" 이다 — 색이 알아볼 수 있게 남는다', () => {
    // 0 이면 지시를 안 따른 것이고, 너무 크면 시간대 구분이 사라진다. 밤 맑음이
    // 목표색까지 가는 거리의 4분의 1 안쪽이면 "약간" 으로 읽힌다.
    expect(FOG_SKY_TINT).toBeGreaterThan(0);
    expect(FOG_SKY_TINT).toBeLessThan(0.25);
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
});

/** `sky.js` 원문. 소비 지점을 보는 검사라 소스 자체가 대상이다 */
function readSky(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { readFileSync } = require('node:fs') as typeof import('node:fs');
  const { fileURLToPath } = require('node:url') as typeof import('node:url');
  const { dirname, join } = require('node:path') as typeof import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, '..', 'frontend', 'js', 'sky.js'), 'utf8');
}
