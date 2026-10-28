// @vitest-environment node
//
// **편집 패널 CSS 의 문자열 축** — 검수관 재검수 명세 G3 (2026-08-19).
//
// ── 왜 생겼나 ───────────────────────────────────────────────────────────────
// 커밋 `21b6aca` 가 화면에서만 드러난 결함(`hidden` 이 실제로 안 감춘다)을 고쳤는데
// **검사를 하나도 안 붙였다.** 검수관이 그 줄을 통째로 지우고 전체 스위트를 돌렸더니
// **추가 실패 0** — *"결함을 고쳤으면 뮤테이션으로 확인한다. 안 깨지면 게이트가 아니라
// 장식이다"* 라는 이 저장소 규율에 그대로 걸렸다.
//
// 🔴 **그리고 이것은 jsdom 한계가 아니다.** `CSS` 는 템플릿 리터럴 **문자열**이고,
// 문자열은 문자열로 잰다. 「픽셀 레이아웃은 못 잰다」와 「이 규칙이 파일에 있는가」는
// 다른 물음인데, 앞의 것을 이유로 뒤의 것까지 안 쟀다.
//
// ── 이 파일이 **못** 재는 것 (통과를 그 근거로 쓰지 않는다) ─────────────────
// · **실제 렌더** — 규칙이 파일에 있다는 것과 브라우저가 그렇게 그린다는 것은 다르다.
//   구체성·상속·UA 스타일시트·인라인 `style` 은 여기서 못 본다.
// · **픽셀** — 폭 212px 넘침, `sticky` 의 실제 동작, 탭 넷이 한 줄인지.
// · **미디어 쿼리 분기** — JS 는 폭을 모르고 이 검사도 마찬가지다.

import { describe, it, expect } from 'vitest';
import { CSS } from '../frontend/js/world2/edit/panel/css.js';

/**
 * 🔴 **주석을 걷어낸 CSS.** 이 검사의 첫 판본이 `CSS` 를 그대로 훑었고, 정규식이
 * **주석 안에 적힌 예시**(`… [hidden]{display:none} 을 둔다`)를 먼저 잡아 빨간불이 됐다.
 *
 * 주석은 사람에게 하는 말이고 브라우저는 안 읽는다 — **규칙이 있는가**를 재려면 규칙만
 * 봐야 한다. 안 걷어내면 주석 문구를 바꾸는 것만으로 검사가 통과하거나 깨지고, 그것은
 * 이 저장소가 「진술과 실물의 불일치」라고 이름 붙인 그 형태다.
 */
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

describe('★ `[hidden]` 이 실제로 감춘다 — 순서에 기대지 않는다', () => {
  it('🔴 `[hidden]` 규칙이 있다 (지우면 이 검사가 빨간불)', () => {
    expect(RULES, '🔴 hidden 을 감추는 규칙이 사라졌다').toMatch(/\[hidden\]\s*\{[^}]*display\s*:\s*none/);
  });

  it('🔴 `!important` 로 **순서 의존을 없앴다**', () => {
    // ⚠ 첫 처방은 「파일 뒤쪽에 두면 이긴다」였고 **절반만 맞았다** — 그 뒤에도 같은
    // 구체성(1,1,0)으로 `display` 를 세우는 규칙이 여덟 개 더 있었다(검수관 B-2).
    // 순서를 지키라는 규율보다 순서가 무의미한 구조가 낫다.
    const m = RULES.match(/\[hidden\]\s*\{([^}]*)\}/);
    expect(m, '★ hidden 규칙을 못 찾았다').not.toBeNull();
    expect(m![1], '🔴 순서 의존이 남았다 — 뒤에 오는 레이아웃 클래스가 이길 수 있다')
      .toMatch(/display\s*:\s*none\s*!important/);
  });

  it('★ 이 저장소가 `hidden` 을 실제로 쓴다 — 안 쓰면 위 규칙이 장식이다', async () => {
    // 규칙만 있고 아무도 `hidden` 을 안 세우면 이 축 전체가 무의미하다. 조립이 그것을
    // 쓰는지는 `world2-edit-panel-wiring.test.ts` 가 행위로 재고, 여기서는 존재만 본다.
    const { readFileSync } = await import('node:fs');
    const dom = readFileSync('frontend/js/world2/edit/panel/dom.ts', 'utf8');
    expect(dom, '★ 패널이 hidden 을 안 쓴다').toMatch(/\.hidden\s*=/);
  });
});

describe('★ 탭 스타일이 개편의 전제를 지킨다', () => {
  it('★ 안 고른 탭 칸이 감춰진다', () => {
    expect(RULES).toMatch(/\.pane\[data-on="0"\]\s*\{[^}]*display\s*:\s*none/);
  });

  it('★ 탭 넷이 폭을 **똑같이** 나눈다 — 자리 기억이 탭 값어치의 절반이다', () => {
    // `flex:1 1 auto` 면 글자 길이대로 폭이 갈려 손이 «표면은 세 번째» 를 못 외운다.
    const m = RULES.match(/\.tabbar button\s*\{([^}]*)\}/);
    expect(m, '★ 탭 버튼 규칙이 없다').not.toBeNull();
    expect(m![1]).toMatch(/flex\s*:\s*1\s+1\s+0/);
  });
});
