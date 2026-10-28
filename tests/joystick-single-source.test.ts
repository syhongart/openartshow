// tests/joystick-single-source.test.ts — **조이스틱 룩의 출처가 하나인가.**
//
// 감독 지시 2026-08-24: *"전부 같게 해라"* (카드 판정 「크림+십자눈금 쪽」).
//
// ── 왜 「대조」가 아니라 「단일 출처」인가 ───────────────────────────────────
// 직전 회차의 `GS-J8` 은 **두 곳을 맞대는** 검사였다 — world2 가 `player.js` 의 값을
// 복사했으므로 갈라지는 것을 잡아야 했다. 이번 회차에 네 소비자가 전부 모듈에서 CSS 를
// **받아 가므로** 맞댈 두 곳이 없다. 값이 같은 것은 이제 **구조가 보증한다.**
//
// 그래서 축이 바뀐다: *"값이 같은가"* → **"복사본이 다시 생기지 않았는가"**.
// 이것이 더 강하다 — 대조는 「내가 아는 두 곳」만 보지만, 이 검사는 **모든 파일**을 훑는다.
//
// ⚠ **직전 회차가 바로 이 구멍에 빠졌다.** 조이스틱을 `lu-joy` 라는 **이름으로** 세어
// *"세 벌"* 이라고 적었는데, `visit.html` 은 이름이 `#joy`/`.nub` 라 집계에 안 잡혔고
// 실제로는 **네 벌**이었다. 감독이 스크린샷을 보내 주기 전까지 아무도 몰랐다.
// **이름으로 세면 이름이 다른 것을 못 센다** — 그래서 이 검사는 이름이 아니라 **값**을 찾는다.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
// · 값을 바꿔서 베낀 복사본(예: `rgba(253,251,245,.4)`) — 같은 룩이 아니므로 그건 새
//   디자인이고, 이 축의 대상이 아니다.
// · 렌더 결과·실기기 색.
// · 조이스틱을 **처음부터 다르게** 만든 다섯 번째(값이 안 겹치면 안 걸린다). 그것을
//   막으려면 「터치 이동 UI 를 만들 때 이 모듈을 쓴다」는 규율이 필요하고, 검사로는
//   여기까지다. 경계를 적어 둔다.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'frontend');
const MODULE = 'js/shared/joystick-look.js';

/**
 * 조이스틱 룩의 **지문**. 모듈 밖에서 발견되면 복사본이다.
 *
 * ⚠ **낱개 색으로는 못 센다** (2026-08-24 실측). 처음에 `95,158,125`(초록)·`#5f9e7d` 같은
 * 색 하나하나를 찾게 했더니 `landing.html`·`about.html`·`ui-hud.ts` 등 **13곳**이 걸렸다 —
 * 전부 사이트 팔레트를 쓰는 정상 코드다. 조이스틱과 무관한 UI 가 같은 초록을 쓰는 것은
 * 복사가 아니다.
 *
 * 그래서 **조합**을 본다. 아래 두 그라디언트는 손잡이 전용이고, 링 크기·테두리는 그 짝이다.
 * 조이스틱을 베끼면 이 조합이 통째로 따라온다 — 실제로 다섯 번째(`lab-glb.js`)가 그랬다.
 *
 * ⚠⚠ **오탐이 0 이라고 적지 않는다.** 이 목록이 잡는 것은 「이 조합을 그대로 옮긴 것」이고,
 * 값을 바꿔서 베낀 복사본은 못 잡는다(그건 다른 룩이므로 이 축의 대상이 아니다).
 */
const LOOK_VALUES = [
  'radial-gradient(circle at 32% 28%, #fffdf8, #e8e2d2)', // 진주 손잡이 — 조이스틱 전용
  'radial-gradient(circle at 32% 28%, #b8e4c9, #5f9e7d)', // 질주 손잡이 — 조이스틱 전용
  '1.5px solid rgba(253,251,245,0.38)',                   // 링 테두리(원본 표기)
  '1px dashed rgba(253,251,245,0.22)',                    // 안쪽 점선 링(원본 표기)
];

/**
 * 이 모듈을 **쓰는** 소비자들.
 *
 * ⚠⚠ **「전부」가 아니다** (검수관 실측 2026-08-24). 저장소의 가상 조이스틱은 **일곱**이고
 * 둘이 이 목록 밖에 있다:
 *
 *     world3.html  `#w3-stick`   흰 반투명 그라디언트 + 보라~청록 손잡이 · z-index 6
 *     world5.html  `#w5-stick`   위와 같은 값(서로 복사본)
 *
 * 색이 아예 달라 아래 `LOOK_VALUES` 지문에도 안 걸린다 — **이 검사가 스스로 「못 잡는
 * 것」으로 적어 둔 경우**(처음부터 다른 룩으로 만든 것)에 정확히 해당한다.
 *
 * 편입을 이번 회차에 **안 했다**: 그 둘은 링이 `fixed` 인데 손잡이는 `absolute`(부모 기준)
 * 라 모듈의 `position` 갈래를 하나 더 열어야 하고, 둘 다 behind-flag 라 감독이 본 적 없는
 * 화면이다. 백로그 `G-UI6`.
 *
 * 🔴 **이 회차에 「다섯이 전부」라고 세 곳에 적었고 그것이 틀렸다** — 직전 회차의 「세 벌」에
 * 이어 **두 번째**다. 두 번 다 원인이 같다: 내가 **아는 이름**으로 세었다. 이번에는 검수관이
 * 잡았고, 그전에는 감독이 스크린샷으로 잡았다. **세는 사람이 목록을 만들면 자기가 아는
 * 것만 센다** — 그래서 이 주석은 「지금 아는 전부」이지 「전부」가 아니다.
 */
const CONSUMERS = [
  'js/player.js',                    // 고정 미술관(라이브 런타임 보호파일)
  'js/world-boot.js',                // 오픈월드(구)
  'visit.html',                      // 개인전 방문자뷰 ← 직전 회차가 빠뜨린 네 번째
  'js/world2/ui/touch-controls.ts',  // 오픈월드(월드2)
  'js/lab-glb.js',                   // GLB 실험실 ← **검사가 찾아낸 다섯 번째**
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'vendor' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|js|html)$/.test(name)) out.push(p);
  }
  return out;
}

const FILES = walk(SRC);

describe('조이스틱 룩의 출처는 한 곳이다', () => {
  it('★ 소스를 실제로 훑었다 — 표본이 비면 아래 단언이 전부 공허해진다', () => {
    // 이 저장소는 **빈 표본이 단언을 통과시킨** 사고를 겪었다. 표본부터 못 박는다.
    expect(FILES.length).toBeGreaterThan(50);
  });

  it('🔴 룩 값이 모듈 밖에 없다 — 복사본이 다시 생기면 여기서 걸린다', () => {
    const leaks: string[] = [];
    for (const file of FILES) {
      const rel = relative(SRC, file);
      if (rel === MODULE) continue; // 값의 집이다
      const src = readFileSync(file, 'utf8');
      for (const v of LOOK_VALUES) {
        if (src.includes(v)) leaks.push(`${rel} → ${v}`);
      }
    }
    // 실패 메시지가 곧 처방이 되게 한다 — "이 값을 모듈에서 가져와라" 가 보인다.
    expect(leaks, '🔴 조이스틱 룩 값이 모듈 밖에 있다 — `joystickCss()` 로 받아라').toEqual([]);
  });

  it('🔴 네 소비자가 전부 모듈에서 받아 간다', () => {
    const missing: string[] = [];
    for (const rel of CONSUMERS) {
      const src = readFileSync(join(SRC, rel), 'utf8');
      if (!src.includes('joystickCss(')) missing.push(`${rel}: joystickCss 호출 없음`);
      if (!src.includes('joystick-look.js')) missing.push(`${rel}: 모듈 import 없음`);
    }
    expect(missing, '🔴 이 파일이 모듈을 안 쓴다 — 자기 값을 들고 있을 수 있다').toEqual([]);
  });

  it('★ 소비자 목록이 실재하는 파일을 가리킨다 — 죽은 목록은 구멍이다', () => {
    // 파일이 옮겨지거나 사라졌는데 목록만 남으면, 그 경로가 다시 생겼을 때 아무도 안 보고
    // 통과시킨다. 허가가 아니라 **의무** 목록이라 더 그렇다.
    for (const rel of CONSUMERS) {
      expect(() => statSync(join(SRC, rel)), `${rel} 없음`).not.toThrow();
    }
  });

  it('🔴 네 곳이 두 단계를 전부 새긴다 — 「움직이면 초록 / 달리면 더 진하게」', () => {
    // 값을 모듈에서 받아도 **상태를 안 새기면** 색은 영영 안 변한다. 「계산된 값이 실제로
    // 소비되는가」의 집행 쪽이고, 이 저장소가 판정/집행 경계에서 반복해 놓친 자리다.
    const missing: string[] = [];
    for (const rel of CONSUMERS) {
      const src = readFileSync(join(SRC, rel), 'utf8');
      if (!src.includes('leanState(')) missing.push(`${rel}: leanState 판정 없음`);
      // 소비 형태가 **둘**이다. 둘 다 정당하므로 각각 본다:
      //
      //   ⓐ 결과를 그대로 새긴다(world2) — `setAttribute('data-lean', leanState(…))`.
      //      판정이 낸 값이 곧 DOM 이라 **두 단계가 자동으로 따라온다.**
      //   ⓑ 비교해 클래스를 토글한다(나머지 넷) — 그러려면 `LEAN_MOVING` 과
      //      `LEAN_RUNNING` 을 **둘 다** 봐야 한다. 하나만 쓰면 그 단계만 열린다.
      //
      // ⚠ **문자열 유무로 세지 않는다** (2026-08-24 뮤테이션 실측). 첫 판본은
      // `/-lean1\b/` 가 있는지만 봤는데, `lab-glb.js` 에서 **토글 줄을 통째로 지워도
      // 0 failed** 였다 — 뒷정리하는 `remove('lgb-lean1', …)` 이 남아 그 정규식을
      // 만족시켰기 때문이다. 「어딘가에 그 글자가 있다」는 「그 단계가 열린다」가 아니다.
      //
      // ⚠⚠ 접두사(`lu-`·`lgb-`)도 박지 않는다. 첫 판본이 `lu-lean1` 만 찾아
      // `lgb-lean1` 을 놓쳤다 — 이 회차가 다섯 번째 조이스틱을 놓친 것과 **같은 형태의
      // 실수**가 그것을 고치는 검사 안에서 재발했다.
      const body = src.replace(/^import[\s\S]*?from\s*['"][^'"]+['"];/gm, '');
      const attr = /setAttribute\(\s*['"]data-lean['"]/.test(body);
      const both = body.includes('LEAN_MOVING') && body.includes('LEAN_RUNNING');
      const two = attr || both;
      if (!two && !attr) missing.push(`${rel}: 두 단계를 안 새긴다`);
    }
    expect(missing, '🔴 판정은 있는데 화면에 안 새겨진다').toEqual([]);
  });

  // ── 뮤테이션 실측 (2026-08-24) — **이 파일의 검출력** ──────────────────────
  //
  //   visit.html 에 손잡이 그라디언트 복사본 되살리기   → 1 failed ✅
  //   visit.html 을 왼쪽 아래 고정으로 되돌리기          → 1 failed ✅
  //   player.js 가 모듈을 안 쓰게(호출명 변조)           → 1 failed ✅
  //   player.js·world-boot.js·lab-glb.js 토글 한 줄 삭제 → 각 1 failed ✅
  //   world2 판정 새기기 제거 / 상수로 고정              → 각 1 failed ✅
  //
  // ⚠ **첫 판본은 이 중 둘을 놓쳤다.** ① `-lean1` 문자열 유무만 봐서 토글을 지워도
  // 뒷정리 `remove(…)` 가 남으면 통과했고 ② 접두 `lu-` 를 박아 `lgb-lean1` 을 못 봤다.
  // 위 표는 그 둘을 고친 **뒤**의 수치다 — 고치기 전 수치를 근거로 적지 않는다.
  //
  // ⚠⚠ 한 케이스는 **내가 잘못 골라** 무검출로 보였다: world2 의 `setAttribute` 를
  // 바꾼다는 것이 같은 파일의 **초기화 줄**(`LEAN_NONE`)을 건드렸다. 케이스 선택 오류이지
  // 검출력 부재가 아니었고, 정확한 줄로 다시 재서 확인했다. **무검출이 나오면 검사부터
  // 의심하기 전에 케이스가 맞는지 본다** — 반대로 하면 멀쩡한 검사를 뜯게 된다.

  it('🔴 방문자뷰가 「터치한 자리에 뜨는」 방식이다 — 상시 표시로 되돌아가면 걸린다', () => {
    // 이 페이지만 **고정 조이스틱**이었다(왼쪽 아래 `left:20px;bottom:26px`). 감독 지시
    // *"터치해야 조이스틱 나오고"* 와 어긋나 있었고, 그 사실이 직전 회차 집계에서 빠졌다.
    const src = readFileSync(join(SRC, 'visit.html'), 'utf8');
    expect(src, '★ 고정 위치가 되살아났다').not.toMatch(/#joy\{[^}]*left:\s*20px/);
    expect(src, '★ `display` 로 켜면 등장 스프링이 죽는다')
      .not.toMatch(/\.is-touch\s+#joy\{[^}]*display:\s*block/);
    expect(src, '★ 터치 지점으로 옮기는 코드가 없다').toContain('joyPlace(');
  });
});
