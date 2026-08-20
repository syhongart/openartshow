// 스모크 세션 예산이 **유도로 남아 있는가**, 그리고 실측을 담고도 남는가.
//
// ── 왜 이 검사가 생겼나 (2026-08-20) ────────────────────────────────────────
// 예산은 오래 `MAX_LEGS = 24` 라는 **개수 상수**였고 아무 테스트도 안 닿았다. 실측(19)에
// 여유를 얹은 값이었는데 환경맵이 붙자 도달당했고, 게이트가 «세션이 안 돌아다녔다» 로
// 떨어졌다 — 원인은 배치가 아니라 예산이었다. 그 형태를 이 저장소는 이미 두 번 겪었다
// (슬롯 예산 `MAX_PARCELS=20` vs 이론 최악치 21 · 그것을 여유 배수 1.25 가 덮은 일).
//
// 그래서 두 축을 못 박는다: ① 유도가 하드코딩으로 되돌아가지 않을 것 ② 유도된 값이
// 관측을 담고도 남을 것. ②가 깨지면 **예산을 올리기 전에 「무엇이 느려졌는가」를 먼저
// 묻는다** — 그것이 `MAX_WALK_MS` 주석의 마지막 문단이다.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  WALK_LEGS, WALK_MS, MAX_WALK_MS, MAX_LEGS,
  COVER_UNIQUE, COVER_REVISITS, STUCK_M, OBSERVED_MAX_LEGS,
} from '../scripts/smoke/session-budget.mjs';

describe('스모크 세션 예산', () => {
  it('★★ MAX_LEGS 는 시간에서 유도된다 — **값 비교로는 못 잡아서 소스를 읽는다**', () => {
    // ── 값 비교만으로는 검출력이 0 이다 (검수관 실측, 2026-08-20) ─────────────
    // 아래 산술 단언이 이 검사의 전부였고, 검수관이 뮤테이션으로 그 구멍을 실증했다:
    // `MAX_LEGS` 를 `40` 으로 **하드코딩만** 하면 그 순간 값이 우연히 같아 **통과한다.**
    // (내가 «유도 제거 뮤테이션» 이라고 보고한 것은 실제로 하드코딩 + `WALK_MS` 변경의
    //  **조합**이었다 — 두 변경이 있어야 값이 갈라지고, 그제야 잡혔다.)
    //
    // 하드코딩은 **그 시점에는 무해하다**(동작이 같다). 위험은 나중에 온다 — 다음 사람이
    // `WALK_MS` 를 바꾸는 순간 구간 예산이 조용히 달라지고, 그 사실은 아무 데도 안 나타
    // 난다. 즉 이 검사가 지켜야 하는 것은 **값이 아니라 유도라는 형태**다.
    //
    // 형태는 값으로 못 본다. 그래서 **소스를 읽는다** — 이 회차에서 `equirectUv` 를
    // three 소스와 맞댄 것과 같은 처방이다(자기 자신과만 대조하면 틀린 채로 초록이 된다).
    const src = fs.readFileSync(
      path.join(process.cwd(), 'scripts/smoke/session-budget.mjs'), 'utf8',
    ).replace(/\s+/g, '');
    expect(src, 'MAX_LEGS 가 MAX_WALK_MS 에서 유도되지 않는다 — 값을 손으로 적었다')
      .toContain('MAX_LEGS=Math.floor(MAX_WALK_MS/WALK_MS)');

    // 산술도 함께 본다. 위 검사는 표기를, 이것은 결과를 본다 — 둘 다 있어야 한다
    // (소스 표기가 맞아도 import 가 엉뚱한 것을 가리킬 수 있다).
    expect(MAX_LEGS, 'MAX_LEGS 값이 유도 결과와 다르다')
      .toBe(Math.floor(MAX_WALK_MS / WALK_MS));
    expect(MAX_WALK_MS, '구간 예산이 한 leg 도 못 담는다').toBeGreaterThan(WALK_MS);
  });

  it('★★ 유도된 예산이 실측을 담고도 남는다 — 관측이 예산에 접근하면 알린다', () => {
    // ── 이 1.5 는 값의 근거가 아니라 **알람의 민감도**다 ──────────────────────
    // 이 구분이 중요하다. `MAX_LEGS` 의 근거는 위 시간 유도이고 이 배수는 거기 관여하지
    // 않는다 — 여기서 하는 일은 *"관측이 예산에 얼마나 다가오면 사람을 부를 것인가"* 를
    // 정하는 것뿐이다. 규율이 경계하는 «실측에 여유를 얹어 **값을 정하는**» 형태와
    // 방향이 반대다(그렇게 정한 것이 예전 `MAX_LEGS = 24` 였고 도달당했다).
    //
    // 1.5 를 고른 근거: CI 가 24 를 소진했을 때 로컬은 21 이었으므로 **CI 는 로컬보다
    // 최소 1.14 배 느리다**(그 이상인지는 못 쟀다 — CI 에서 실제로 필요했던 leg 수는
    // 소진했기 때문에 관측되지 않았다). 1.5 는 그 하한 위에 있으면서, 관측이 그 선을
    // 넘으면 예산을 만지기 전에 **원인을 먼저 묻게** 만드는 자리다.
    expect(MAX_LEGS, `상한 ${MAX_LEGS} 이 관측 ${OBSERVED_MAX_LEGS} 의 1.5배 미만이다`
      + ' — 예산을 올리기 전에 「무엇이 느려졌는가」를 먼저 물어라')
      .toBeGreaterThanOrEqual(OBSERVED_MAX_LEGS * 1.5);
  });

  it('커버리지 목표가 「경계를 넘는다」를 실제로 요구한다', () => {
    // 3 이면 출발 칸 + 새 칸 둘이다. 2 로 내리면 경계를 한 번만 넘어도 통과하고,
    // 1 이면 제자리에서도 통과한다 — 그것이 이 게이트가 처음 놓친 형태다(G-COL1).
    expect(COVER_UNIQUE, '고유 파셀 목표가 경계 두 번을 요구하지 않는다').toBeGreaterThanOrEqual(3);
    expect(COVER_REVISITS, '재방문 없이 통과하면 슬롯 반납 실패가 안 드러난다')
      .toBeGreaterThanOrEqual(1);
    expect(MAX_LEGS, '상한이 목표 leg 수보다 크지 않다').toBeGreaterThan(WALK_LEGS);
    expect(STUCK_M, '막힘 임계가 0 이면 제자리도 「걸었다」가 된다').toBeGreaterThan(0);
  });
});
