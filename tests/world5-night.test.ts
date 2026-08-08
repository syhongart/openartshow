// world5 의 **밤 정합.** 포크가 데려오지 않은 게이트를 채운다.
//
// ── ⚠️ 이 파일은 `tests/world3-night.test.ts` 의 복제다 ──────────────────────
// 검사 로직이 트리 이름과 등불색 상수명만 다르고 동일하다. **아래 주석의 사고
// 이력은 world3 회차(2026-08-08)의 것이고 world5 에서 다시 겪은 것이 아니다.**
// 출처를 밝히지 않으면 그 자체가 거짓 근거가 된다 — 아이러니하게도 이 파일이
// 존재하는 이유가 바로 그 형태의 결함(B1)이다.
//
// **world5 에서 달라진 것 하나**: 여기는 **밤이 기본 시간대**다(감독 카드 선택).
// world3 는 낮이 기본이라 밤 값이 어긋나도 대부분의 방문자는 못 봤지만, 여기서는
// 첫 화면이 밤이다. 그래서 이 검사들의 무게가 world3 보다 무겁고, 팀장이 조건 2 로
// *"미러링 정리를 룩 값 작업보다 선행하라"* 고 못 박은 이유도 그것이다.
//
// ── 원래 왜 생겼나 (world3 회차: 검수관 반려 B1·권고 P4, 2026-08-08) ────────
// `world5/decide/night.ts` 에 이렇게 적혀 있었다:
//
//   *"⚠️ `sky.js` 의 값을 복제한 것이라 미러링이다. 저쪽이 바뀌면 여기가 조용히
//     어긋난다 — 그래서 `tests/world2-night.test.ts` 가 두 값이 같은지 검사한다."*
//
// **world5 에서 그 문장은 거짓이었다.** `world2-night.test.ts` 는
// `frontend/js/world2/decide/night.js` 를 import 한다 — 포크한 트리는 안 본다.
// 즉 포크와 함께 **주장은 왔는데 그 주장을 참으로 만드는 검사는 안 왔다.**
//
// 더 나쁜 것은, 같은 파일 190줄 아래에서 `LAMP_LUMINANCE` 가 **정확히 같은 진단**을
// 내리고 있었다는 점이다(*"world5 에서 그 문장은 거짓이었다 — 포크한 트리에는 그
// 테스트가 없다"*). 한 자리는 고치고 다른 자리는 못 봤다. 검수관이 잡았다.
//
// CLAUDE.md: *"게이트 유효성에 대한 거짓 진술은 다음 사람이 확인을 생략하게 만든다 —
// `main` unprotected 오기가 7일을 잃은 그 형태다."* 문장을 지우는 대신 **검사를 만들어
// 주장을 참으로 되돌린다** — GS-3 이 택한 방식이고 이 파일이 그 두 번째 사례다.
//
// ── 왜 `lightOf()` 를 부르지 않고 소스를 읽는가 ─────────────────────────────
// `world5/sky.js` 는 `LIGHT` 테이블을 export 하지 않고 `three` 를 import 한다. 팔레트
// 한 값을 대조하자고 렌더 라이브러리를 통째로 로드할 이유가 없다. 대신 **파싱이 실패
// 하면 조용히 통과하지 않도록** 표본 검사를 먼저 둔다 — 정규식이 빗나가 `null` 이
// 나왔는데 단언이 통과하는 것이 이 저장소가 반복해 데인 형태다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  NIGHT_FOG, NIGHT_FOG_SCALE, LAMP_LUMINANCE, LAMP_MAX_GLOW,
} from '../frontend/js/world5/decide/night.js';
import { BLOOM_THRESHOLD } from '../frontend/js/world5/features/postfx-params.js';
import { V, luma } from '../frontend/js/world5/parts/palette.js';

const SKY_SRC = readFileSync(
  join(process.cwd(), 'frontend/js/world5/sky.js'), 'utf8',
);

/**
 * `world5/sky.js` 의 `LIGHT[time][weather].fog` 를 소스에서 뽑는다.
 *
 * 못 찾으면 `null` 을 돌려준다 — **호출자가 그것을 실패로 다뤄야 한다.** 기본값을
 * 돌려주면 파싱이 깨진 순간 검사가 조용히 통과한다.
 */
function fogOf(time: string, weather: string): number | null {
  // `night:` 블록을 먼저 좁힌 뒤 그 안에서 날씨 줄을 찾는다. 시간대마다 같은 날씨
  // 키가 있으므로 블록을 안 좁히면 첫 번째(day)를 잡는다.
  const block = new RegExp(`${time}:\\s*\\{([\\s\\S]*?)\\n  \\},`).exec(SKY_SRC);
  if (!block) return null;
  const line = new RegExp(`${weather}:[^\\n]*?fog:\\s*(0x[0-9a-fA-F]{6})`).exec(block[1]);
  return line ? Number(line[1]) : null;
}

describe('밤 안개 하한이 하늘 팔레트와 어긋나지 않는다', () => {
  it('파싱이 실제로 값을 찾았다 — 못 찾으면 아래 단언이 공허하다', () => {
    // 표본 검사. 정규식이 빗나가면 여기서 먼저 죽는다.
    expect(SKY_SRC.length).toBeGreaterThan(1000);
    expect(fogOf('night', 'clear'), 'night.clear.fog 를 못 찾았다').not.toBeNull();
    // 다른 시간대도 잡히는지 — 블록 좁히기가 실제로 동작하는지 본다. day 와 night 의
    // fog 가 같은 값이면 블록 좁히기가 안 먹은 것이다.
    expect(fogOf('day', 'clear'), 'day.clear.fog 를 못 찾았다').not.toBeNull();
    expect(fogOf('day', 'clear')).not.toBe(fogOf('night', 'clear'));
  });

  it('`NIGHT_FOG` 가 `sky.js` 의 `night.clear.fog` 와 같다', () => {
    // 이것이 B1 이 주장하던 바로 그 검사다. `night.ts` 는 이 값을 채널별 0~1 로
    // 쪼개 들고 있으므로, 팔레트 hex 를 같은 방식으로 쪼개 대조한다.
    const fog = fogOf('night', 'clear')!;
    const want = [(fog >> 16) & 0xff, (fog >> 8) & 0xff, fog & 0xff].map((c) => c / 255);
    expect(NIGHT_FOG.length).toBe(3);
    for (let i = 0; i < 3; i++) {
      expect(NIGHT_FOG[i], `채널 ${i}`).toBeCloseTo(want[i], 6);
    }
  });

  it('하한이 꺼져 있는 동안에도 정합을 지킨다 — 켜는 날 어긋나 있으면 늦다', () => {
    // `NIGHT_FOG_SCALE = 0` 이라 지금 런타임 영향은 0 이다. 그래서 위 검사가
    // "지금은 안 쓰는 값" 을 지키는 셈인데, **그것이 이 검사의 요점이다** —
    // `?nfog=` 로 되살리는 날 값이 이미 어긋나 있으면 그때는 원인을 밤 화면에서
    // 거꾸로 짚어야 한다. 지금 0 이라는 사실 자체를 못 박아 둔다.
    expect(NIGHT_FOG_SCALE).toBe(0);
  });
});

describe('가로등이 블룸 문턱을 넘는다 — 넘지 못하면 블룸이 돌아도 화면이 그대로다', () => {
  // ── 왜 이 검사가 필요한가 (검수관 권고 P4) ────────────────────────────────
  // 감독 지적 *"가로등 똑같은데"* 의 원인이 이 축이었다. 등불 휘도 0.805 에 문턱을
  // 0.85 로 잡아서 **블룸이 정상 동작하는데 걸리는 픽셀이 0** 이었다. 코드도 설정도
  // 멀쩡한데 결과만 없는, 원인을 짚기 가장 어려운 형태다.
  //
  // 미러링을 없애면서(`LAMP_LUMINANCE = luma(V.lampGlow)`) 이 축에 **새 연결이
  // 생겼다**: 이제 팔레트에서 등불색을 어둡게 조정하면 블룸이 조용히 죽는다.
  // world2 는 `tests/world2-night.test.ts` 가 이 축을 지키는데 world5 에는 없었다.

  it('발광을 얹은 등불 휘도가 문턱을 넘는다', () => {
    expect(LAMP_LUMINANCE * LAMP_MAX_GLOW).toBeGreaterThan(BLOOM_THRESHOLD);
  });

  it('여유가 실재한다 — 문턱에 겨우 닿는 값은 다음 조정에서 죽는다', () => {
    // 0.805 × 1.8 = 1.448 vs 문턱 0.75. 1.2배 여유를 하한으로 둔다. 이 아래로
    // 내려오면 "지금은 통과" 가 아니라 "다음 한 걸음에 깨진다" 로 읽어야 한다.
    expect(LAMP_LUMINANCE * LAMP_MAX_GLOW).toBeGreaterThan(BLOOM_THRESHOLD * 1.2);
  });

  it('휘도가 팔레트에서 유도된다 — 손으로 베낀 값이면 조용히 어긋난다', () => {
    // 미러링이 되살아나는 것을 막는다. 누군가 `LAMP_LUMINANCE` 를 상수로 되돌리면
    // 이 검사는 통과하지만(값이 같으므로), 그 뒤 팔레트만 고치는 순간 깨진다.
    // 그래서 **팔레트를 기준으로** 대조한다.
    expect(LAMP_LUMINANCE).toBeCloseTo(luma(V.lampGlow), 12);
  });

  it('등불이 밤에만 켜지는 전제가 유지된다 — 배수가 1 이하면 발광이 없다', () => {
    expect(LAMP_MAX_GLOW).toBeGreaterThan(1);
  });
});
