// 안개 밴드 — **"안개 밖" 을 말하는 코드가 실제로 안개를 보는가.**
//
// ── 이 검사가 서 있는 배경 ──────────────────────────────────────────────────
// `features/npc.ts` 의 은닉 임계가 재배치 거리(`RECYCLE_CELLS × cell`)였는데 그 옆
// 주석은 *"안개 밖이면 끈다"* 라고 적고 있었다. **문장은 옳았고 값이 딴 것을 가리켰다.**
// 재배치 거리가 안개 차단보다 멀어서, 그 사이 구간의 NPC 를 계속 그렸다 — 화면에 한
// 픽셀도 기여하지 못하면서 체당 45 드로우콜을 냈다.
//
// 디자이너 실측(2026-08-02)이 결과를 확정했다: 정지 8조합에서 NPC 의 화면 픽셀 기여가
// 0.007~0.114%, 알아볼 수 있는 사람 **0명**. 그 상태로 드로우콜 +100.
//
// ── 왜 테스트로 만드는가 (팀장 조건 2) ──────────────────────────────────────
// *"임계를 옛 값으로 되돌렸을 때 깨지는 게이트가 있어야 한다. 안 깨지면 이번 결함은
// 다시 난다 — 같은 자리에서 이미 한 번 났다."*
//
// 주석은 이미 옳았는데도 값이 어긋난 채 오래 있었다. 즉 **주석으로는 못 막는다는 것이
// 실증된 자리**다. 그래서 검사로 옮긴다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fogBand, FOG_NEAR_CELLS, FOG_FAR_CELLS } from '../frontend/js/world2/decide/fog.js';

describe('안개 밴드 — 계약', () => {
  it('near < far — 뒤집히면 안개가 성립하지 않는다', () => {
    expect(FOG_NEAR_CELLS).toBeLessThan(FOG_FAR_CELLS);
    const b = fogBand(32);
    expect(b.near).toBeLessThan(b.far);
  });

  it('셀에 비례한다 — 세계가 커지면 시야도 커진다', () => {
    const a = fogBand(32);
    const b = fogBand(64);
    expect(b.near).toBe(a.near * 2);
    expect(b.far).toBe(a.far * 2);
  });

  it('순수 함수다 — 몇 번 불러도 같다', () => {
    expect(fogBand(32)).toEqual(fogBand(32));
  });
});

// ── 소비자가 SSOT 를 경유하는가 (팀장 조건 1·2) ─────────────────────────────
//
// 값 자체가 아니라 **누가 그 값을 어디서 얻는가**를 본다. 소비자가 배수를 자기 파일에
// 다시 적으면 한쪽만 고쳐도 아무도 모른다 — 이 저장소가 세 번 데인 형태이고, 이번
// 결함도 그중 하나였다.
describe('안개 소비자가 SSOT 를 경유한다', () => {
  const src = (p: string) => readFileSync(p, 'utf8');

  it('main.ts 가 배수를 다시 적지 않는다', () => {
    const s = src('frontend/js/world2/main.ts');
    expect(s, 'fogBand 를 안 쓴다 — 안개 거리가 다시 갈라졌다').toContain('fogBand');
    // `CELL_X * 1.6` / `CELL_X * 2.4` 형태가 되살아나면 잡는다.
    expect(s).not.toMatch(/CELL_X\s*\*\s*(1\.6|2\.4)/);
  });

  it('npc.ts 의 은닉 임계가 안개에서 온다 — 재배치 거리가 아니다', () => {
    const s = src('frontend/js/world2/features/npc.ts');
    expect(s, 'fogBand 를 안 쓴다').toContain('fogBand');

    // 은닉(`show`)이 재배치 거리를 쓰면 이번 결함의 재발이다. 두 값은 **다른 뜻**이고
    // 재배치 쪽이 더 멀어야 한다(경계 팝핑 방지) — 그래서 하나로 합칠 수 없다.
    const showLine = s.split('\n').find((l) => /const show\s*=/.test(l));
    expect(showLine, '`const show =` 줄을 못 찾았다 — 구조가 바뀌었다').toBeTruthy();
    expect(showLine!, '은닉이 재배치 거리를 쓴다 — 안개 밖을 그리게 된다')
      .not.toMatch(/recycleFar|RECYCLE_CELLS/);
    expect(showLine!).toMatch(/fogFar/);
  });

  it('npc.ts 가 안개 배수를 숫자로 적지 않는다', () => {
    // 주석에 적는 것도 미러링이다(팀장 조건 1). 코드·주석 구별 없이 본다 —
    // 이번 사고가 정확히 "주석은 안개를 말하는데 값은 딴 것" 이었다.
    const s = src('frontend/js/world2/features/npc.ts');
    expect(s).not.toMatch(/\b(1\.6|2\.4)\b/);
    expect(s, '안개 거리(m)를 하드코딩했다 — 셀이 바뀌면 어긋난다').not.toMatch(/\b(51\.2|76\.8)\b/);
  });
});

// ── 재배치 > 은닉 (팀장 조건 C — 히스테리시스) ──────────────────────────────
//
// 켜지는 경계와 재배치 경계가 같아지면 그 자리에서 팝핑이 난다. 부등호가 뒤집히면
// 재배치된 체가 즉시 숨겨져 **영영 안 보이는 상태**가 될 수도 있다.
describe('재배치 거리가 은닉 거리보다 멀다', () => {
  it('RECYCLE_CELLS > FOG_FAR_CELLS — 뒤집히면 경계에서 팝핑이 난다', () => {
    const s = readFileSync('frontend/js/world2/features/npc.ts', 'utf8');
    const m = /const RECYCLE_CELLS\s*=\s*([\d.]+)/.exec(s);
    expect(m, 'RECYCLE_CELLS 를 못 찾았다 — 상수 이름이 바뀌었다').not.toBeNull();
    expect(Number(m![1]), '재배치가 안개 차단보다 가깝다').toBeGreaterThan(FOG_FAR_CELLS);
  });
});
