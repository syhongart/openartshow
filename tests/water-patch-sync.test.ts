// tests/water-patch-sync.test.ts — 세 세계의 바다 패치 수식이 **갈라지지 않는가.**
//
// ── 왜 이 파일이 필요했나 (검수관 블로커, 2026-08-20) ──────────────────────
// world2 에서 «층2 패치 정점의 `+ LIFT_AMP` 리프트가 평균 수면을 진폭만큼 밀어 올린다»
// 를 고쳤는데, `world3`·`world5` 의 같은 자리에 **같은 버그가 그대로 남아 있었다.**
// `world2/features/ocean.ts` 자신의 헤더가 *"이 파일은 world3 과 사실상 쌍둥이다 …
// 여기를 고치면 저쪽도 고쳐야 한다 — 안 그러면 조용히 갈라진다"* 를 이미 명문화하고
// 있었는데도 놓쳤다. 문장으로 적힌 규율은 놓칠 수 있고, 실제로 놓쳤다.
//
// ── 이 검사가 **못 하는 것**을 먼저 적는다 ────────────────────────────────
// 이것은 소스 문자열 검사다. world3·world5 는 **물 기능을 마운트하는 테스트 하네스가
// 아예 없어서**(`tests/` 에 world3 물 테스트 0개, `world5-water.test.ts` 에 메시 위치
// 단언 0개) 실행 축으로는 아무것도 못 잰다. 그러니 이 검사가 보장하는 것은 좁다:
//   ✔ 고친 수식이 **되돌아가는 것**을 막는다
//   ✘ 그 수식이 실제로 그 세계에서 도는지는 **안 본다**(못 잰 것은 통과가 아니다)
// 실행 축이 필요해지면 world3/world5 를 라이브로 승격할 때 하네스부터 세운다.
//
// 검사 대상을 «코드 라인» 으로 좁힌 이유: 정정 주석에도 `+ LIFT_AMP` 라는 글자가
// 들어간다(그것이 왜 걷혔는지를 그 자리에 적었으므로). 주석과 코드를 못 가르는 검사는
// 오탐만 내는 장식이 된다 — hookify 회차에서 실측으로 확인된 형태다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TWINS = ['world3', 'world5'] as const;
const read = (w: string) => readFileSync(
  join(process.cwd(), `frontend/js/${w}/features/ocean.ts`), 'utf8',
);

describe('바다 패치 — world3·world5 가 world2 와 갈라지지 않는가', () => {
  for (const w of TWINS) {
    it(`${w}: 패치 정점에 진폭 리프트를 다시 더하지 않는다`, () => {
      const src = read(w);
      // 코드 라인만 본다 — 주석에는 이 대입 형태가 없다.
      expect(src, '리프트가 되살아났다 — 진폭이 평균 수면을 민다').not.toMatch(
        /p\[i \+ 1\] = 0\.01 \+ LIFT_AMP \+ surfaceLift\(/,
      );
      expect(src, '패치 갱신 자체가 사라졌다').toMatch(
        /p\[i \+ 1\] = 0\.01 \+ surfaceLift\(/,
      );
    });

    it(`${w}: 층1이 패치의 골 밑으로 내려가 있다`, () => {
      // 리프트를 걷으면 골이 아래 층 아래로 내려간다 — 반투명 두 판이 교차하면 그
      // 교차선이 수면 위에 선으로 드러난다. 그 몫을 아래 층을 내려서 낸다.
      // 패치가 없는 경로(`?wpatch=0`)에서는 내릴 골이 없으므로 `SEA_Y` 그대로여야 한다.
      expect(read(w)).toMatch(
        /sea\.position\.y = patchGeo \? SEA_Y - LIFT_AMP : SEA_Y;/,
      );
    });
  }
});
