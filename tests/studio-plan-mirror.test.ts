// @vitest-environment node
//
// 요금제 한도(작품 수·대표작 수)가 **화면에 하드코딩되지 않는가**.
//
// ── 왜 생겼나 — 같은 결함이 세 번째로 나왔다 ───────────────────────────────
// 값의 SSOT 는 `frontend/js/studio-plan.ts` 의 `computeLimits()` 하나다. 그런데 화면들이
// 그 숫자를 **자기 문구에 베껴 적었고**, 베낀 쪽은 «프리미엄» 값만 적어 **무료 사용자에게
// 거짓말**을 했다:
//
//   1회차  랜딩 카피 사실 모순 (`DEVLOG.md:5943`) — 그때 랜딩만 고쳤다
//   2회차  `guide.html:692` *"작품은 최대 14점"* — 2026-08-16 정정
//   3회차  `studio.html:877` *"최대 14점 · 대표작 2점"* — 2026-08-16 정정
//
// 2회차를 고치면서 나는 *"미러링 자체를 막는 축이 없다"* 고 적어 놓고 **정작 세 번째
// 자리를 안 셌다.** 선언과 실측이 어긋난 형태이고, 이 저장소가 이름 붙인
// *"게이트 유효성에 대한 거짓 진술"* 과 같은 뿌리다 — 선언만 하고 검사가 없으면
// 다음 사람이 확인을 생략한다.
//
// 그래서 **문구를 고치는 대신 자리를 비웠다** — `studio.html` 은 빈 `#planLimitHint` 만
// 두고 `studio-form.ts` 가 `limits` 로 채운다. 값이 한 곳에서만 오므로 미러링이 생길
// 자리가 없다. 이 파일은 **그 구조가 유지되는지**를 본다.
//
// ── 이 검사가 아직 **덮지 않는 것** ────────────────────────────────────────
// `guide.html` 과 `landing.html` 은 여전히 숫자를 적고 있다. 둘은 **거짓이 아니다**
// (무료·프리미엄을 함께 적는다) — 위험은 «갈라짐» 이지 «거짓» 이 아니다. 그 둘까지
// 동적화하는 것은 요금제를 **층위**로 넓히는 회차(W8-3 S1)의 일이고, 그때 baseline
// 방식으로 함께 잠근다. **여기서 멈춘다** — 태스크 #80.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p: string) => readFileSync(fileURLToPath(new URL(`../frontend/${p}`, import.meta.url)), 'utf8');

describe('요금제 한도 — 값은 studio-plan.ts 한 곳이 소유한다', () => {
  it('SSOT 가 무료·프리미엄을 **함께** 낸다 — 한쪽만 있으면 화면이 베낄 수밖에 없다', () => {
    const src = read('js/studio-plan.ts');
    expect(src, 'computeLimits 가 없다').toContain('export function computeLimits(');
    // 삼항으로 두 값을 함께 내는 형태. 한쪽 값만 남으면 소비자가 다른 쪽을 지어낸다.
    expect(src).toMatch(/MAX_ARTWORKS:\s*premium\s*\?\s*\d+\s*:\s*\d+/);
    expect(src).toMatch(/MAX_FEATURED:\s*premium\s*\?\s*\d+\s*:\s*\d+/);
  });

  describe('studio.html — 정적 숫자를 두지 않는다', () => {
    const html = read('studio.html');

    it('★ 채울 자리가 비어 있다 — 값이 들어가 있으면 그 순간 미러링이다', () => {
      const m = html.match(/id="planLimitHint"[^>]*>([\s\S]*?)<\/span>/);
      expect(m, '★ `#planLimitHint` 자리가 사라졌다 — 채울 곳이 없으면 정적 문구로 되돌아간다')
        .not.toBeNull();
      expect(m![1].trim(), '★ 자리에 값이 적혀 있다 — 동적으로 채우는 의미가 없어진다').toBe('');
    });

    it('★ 작품 수 문구에 숫자가 없다 — "최대 14점" 이 무료 사용자에게 거짓이었다', () => {
      // ⚠ **주석을 걷어내고 본다.** 이 검사의 첫 판본이 내 정정 주석 안의 **인용문**
      // (*"그전에는 「최대 14점 · 대표작 2점」 이 박혀 있었고…"*)을 잡아 빨간불이 났다.
      // 옛 문구를 값 옆에 인용하는 것은 이 저장소의 규율이 **요구하는** 것이므로, 검사가
      // 그것을 막으면 규율끼리 충돌한다. 그리고 이 축이 재는 것은 **「화면에 거짓이
      // 뜨는가」** 이고 주석은 렌더되지 않는다 — 걷어내는 것이 축에 맞다.
      // (대가: 주석 처리된 옛 마크업의 회귀는 못 본다. 렌더 안 되므로 이 축 밖이다.)
      const visible = html.replace(/<!--[\s\S]*?-->/g, '');
      const hits = [...visible.matchAll(/최대\s*\d+\s*점|작품\s*\d+\s*점|대표작\s*\d+\s*점/g)]
        .map((x) => x[0]);
      expect(hits, `★ 요금제 숫자가 화면에 박혔다: ${hits.join(' / ')}`).toEqual([]);
    });
  });

  it('★ studio-plan 이 그 자리를 실제로 채운다 — 배선이 끊기면 빈칸만 남는다', () => {
    const src = read('js/studio-plan.ts');
    expect(src, '★ `injectPlanLimits` 가 없다').toContain('export function injectPlanLimits(');
    expect(src, "★ `planLimitHint` 를 안 찾는다").toContain("getElementById('planLimitHint')");
    // 값은 반드시 `limits` 에서 온다 — 여기에 리터럴을 쓰면 미러링을 옮겨 심은 것뿐이다.
    const fn = src.slice(src.indexOf('export function injectPlanLimits('));
    const body = fn.slice(0, fn.indexOf('\n}'));
    expect(body, '★ 안내문에 리터럴 숫자를 썼다 — SSOT 를 안 거친다')
      .not.toMatch(/['"][^'"]*\d+\s*점/);
    expect(body).toContain('MAX_ARTWORKS');
    expect(body).toContain('MAX_FEATURED');
  });

  it('★ 엔트리가 그것을 부른다 — 함수만 있고 호출이 없으면 화면은 빈칸이다', () => {
    const main = read('js/studio-main.ts');
    expect(main, '★ `injectPlanLimits` 를 import 안 한다').toContain('injectPlanLimits');
    expect(main, '★ 호출이 없다 — 「계산된 값이 실제로 소비되는가」 축이다')
      .toMatch(/injectPlanLimits\(\s*limits\s*\)/);
  });

  it('guide.html 은 무료·프리미엄을 **함께** 적는다 — 한쪽만 적으면 거짓이 된다', () => {
    // ⚠ 이 페이지는 아직 정적이다(위 헤더의 「덮지 않는 것」). 그래도 **거짓만은** 막는다:
    // 프리미엄 값을 적었으면 무료 값도 같은 문장에 있어야 한다.
    const html = read('guide.html');
    const line = html.split('\n').find((l) => /작품은?\s*(무료|최대)/.test(l)) ?? '';
    expect(line, 'guide 의 작품 수 안내 문장을 못 찾았다').not.toBe('');
    expect(line, '★ 프리미엄 값만 적혀 있다 — 무료 사용자에게 거짓이다').toContain('무료');
    expect(line).toContain('프리미엄');
  });
});
