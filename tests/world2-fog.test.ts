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
import { DEFAULT_BANDS } from '../frontend/js/world2/decide/lod.js';

describe('안개 밴드 — 계약', () => {
  it('안개 차단이 렌더 far 경계에서 유도된다 (검수관 B4)', () => {
    // 둘이 갈라지면 세계의 끝이 드러난다 — LOD 가 안 그리는데 안개가 아직 안 닫혔으면
    // 그 사이가 텅 빈다. 같은 리터럴을 두 파일에 적어두고 "유도" 라고 부르던 자리다.
    expect(FOG_FAR_CELLS).toBe(DEFAULT_BANDS.farExit);
  });

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
    //
    // ⚠ **이 검사가 거짓 PASS 였다**(검수관 B3). `\b` 는 `[A-Za-z0-9_]` 경계라
    // **`76.8m` 을 못 잡는다** — `8` 과 `m` 이 둘 다 워드문자라 경계가 없다. 그래서
    // `npc.ts` 가 안개 거리를 숫자로 적고 있는데도 통과했다. 한글 단위(`2.4셀`)는
    // 한글이 비워드문자라 잡혔고, 그래서 "두 번 잡았다" 는 실적이 반쪽이었다.
    //
    // 뒤 경계를 **숫자가 아닌 것**으로 바꿔 단위문자까지 덮는다.
    const s = src('frontend/js/world2/features/npc.ts');
    expect(s, '안개 배수를 적었다').not.toMatch(/(?<![\d.])(1\.6|2\.4)(?![\d])/);
    expect(s, '안개 거리(m)를 하드코딩했다 — 셀이 바뀌면 어긋난다')
      .not.toMatch(/(?<![\d.])(51\.2|76\.8)(?![\d])/);
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

// ── 스폰 밴드가 안개 시작 안쪽인가 (팀장 조건 A, 본편 ① 2단) ────────────────
//
// 이 부등호가 이번 회차 처방의 본체다. 밖에서 태어난 개체는 **대비가 깎인 채로
// 시작하고 자력으로 회복할 수 없다** — NPC 속도(0.8~1.3m/s)보다 재배치 거리가
// 훨씬 멀어서, 한 번 멀리 나면 계속 멀다.
//
// 디자이너 실측이 그 결과였다: 정지 8조합에서 알아볼 수 있는 사람 0명,
// 화면 픽셀 기여 0.007~0.114%. 세계 지오메트리의 94% 를 쓰면서.
describe('스폰 밴드가 안개 시작 안쪽이다', () => {
  const src = readFileSync('frontend/js/world2/features/npc.ts', 'utf8');

  it('SPAWN_REACH 가 안개 시작에서 유도된다 — 숫자를 다시 적지 않는다', () => {
    const m = /const SPAWN_REACH\s*=\s*(.+);/.exec(src);
    expect(m, 'SPAWN_REACH 를 못 찾았다 — 상수 이름이 바뀌었다').not.toBeNull();
    // 리터럴 숫자면 안개와 갈라진 것이다. `FOG_NEAR_CELLS` 를 거쳐야 한다.
    expect(m![1], '스폰 상한이 안개와 무관한 값이다').toContain('FOG_NEAR_CELLS');
  });

  it('SPAWN_RING 이 SPAWN_REACH 에서 온다 — 상한이 움직이면 따라온다', () => {
    const ring = /const SPAWN_RING\s*=\s*(.+);/.exec(src);
    expect(ring, 'SPAWN_RING 을 못 찾았다').not.toBeNull();
    expect(ring![1], '스폰 하한이 상한과 무관하다 — 상한을 바꿔도 안 따라온다')
      .toContain('SPAWN_REACH');
    // ⚠ 나눗셈은 정수를 깨뜨린다(B1). 실제 정수성은 `world2-spawn-band.test.ts` 가
    // `pickNearby` 를 호출해서 본다 — 여기서는 그 형태가 되살아나는 것만 막는다.
    expect(ring![1], '나눗셈이 되살아났다 — B1 재발 경로다').not.toMatch(/\//);
  });

  it('안개 시작 < 안개 차단 < 재배치 — 세 경계의 순서가 이 처방의 뼈대다', () => {
    // 스폰(≤near) → 은닉(far) → 재배치(그 밖). 순서가 깨지면 어느 하나가
    // 다른 것을 무의미하게 만든다. 예: 은닉이 스폰보다 가까우면 태어나자마자 숨는다.
    const rc = /const RECYCLE_CELLS\s*=\s*([\d.]+)/.exec(src);
    expect(rc).not.toBeNull();
    expect(FOG_NEAR_CELLS).toBeLessThan(FOG_FAR_CELLS);
    expect(FOG_FAR_CELLS).toBeLessThan(Number(rc![1]));
  });
});
