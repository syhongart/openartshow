// 미니맵 책갈피 — **기본이 접힘**이고, 그 값이 두 곳에서 일치한다.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"월드2에서 캡쳐하면 지도, HUD때문에 안보일테니깐. 책갈피로 감춰지게하자."*
//
// ── 이 파일이 막는 것 — 값 미러링 ───────────────────────────────────────────
// 초기 상태가 **두 곳**에 적혀 있다:
//   ① `world2.html` 의 `#w2-mapwrap[data-open]` — 첫 페인트를 결정한다
//   ② `map-drawer.ts` 의 `attachMapDrawer(parts, startOpen)` 기본값 — 부팅 후를 결정한다
//
// 한쪽만 고치면 **아무도 안 죽는다.** 대신 첫 페인트에 지도가 펼쳐진 채 뜨고 스크립트가
// 접으면서 번쩍인다(FOUC). 캡처가 이 화면의 목적이므로 그 한 프레임이 그대로 담길 수도
// 있다. 이 저장소가 값 미러링으로 이미 사고를 낸 형태이므로 검사로 만든다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachMapDrawer } from '../frontend/js/world2/ui/map-drawer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 최소 DOM 스텁 — jsdom 없이 `attachMapDrawer` 의 실제 코드를 돌린다 */
function fakeParts() {
  const mk = () => {
    const attrs: Record<string, string> = {};
    return {
      dataset: {} as Record<string, string>,
      textContent: '',
      setAttribute(k: string, v: string) { attrs[k] = v; },
      getAttribute(k: string) { return attrs[k] ?? null; },
      addEventListener() {},
      removeEventListener() {},
    };
  };
  return { wrap: mk(), tab: mk() };
}

describe('world2 미니맵 책갈피 — 기본 접힘', () => {
  it('attachMapDrawer 의 기본값이 접힘이다', () => {
    const parts = fakeParts();
    // 인자를 주지 않는다 — `main.ts` 가 그렇게 호출하므로 기본값이 곧 실제 동작이다.
    const drawer = attachMapDrawer(parts as never);
    expect(drawer.open, '지도가 기본 펼침이다 — 캡처마다 화면 왼쪽이 UI 로 먹힌다').toBe(false);
  });

  it('접힌 상태를 DOM 과 접근성 속성에 반영한다', () => {
    const parts = fakeParts();
    attachMapDrawer(parts as never);
    expect(parts.wrap.dataset.open).toBe('0');
    expect(parts.tab.getAttribute('aria-expanded')).toBe('false');
    // 화살표는 **누르면 일어날 일**을 가리킨다 — 접혀 있으면 "펼치기"다.
    expect(parts.tab.getAttribute('aria-label')).toBe('지도 펼치기');
  });

  it('토글이 양방향으로 동작한다 — 감출 수만 있으면 기능이 반이다', () => {
    const parts = fakeParts();
    const drawer = attachMapDrawer(parts as never);
    drawer.toggle();
    expect(drawer.open).toBe(true);
    expect(parts.wrap.dataset.open).toBe('1');
    expect(parts.tab.getAttribute('aria-label')).toBe('지도 접기');
    drawer.toggle();
    expect(drawer.open).toBe(false);
  });

  it('world2.html 의 초기 data-open 이 attachMapDrawer 기본값과 일치한다', () => {
    // **값 미러링 검사다.** 어긋나면 첫 페인트에 지도가 번쩍이고, 그 프레임이 캡처에
    // 담길 수 있다. 두 값을 각각 적어두지 않고 **서로 비교**한다.
    const html = readFileSync(join(ROOT, 'frontend', 'world2.html'), 'utf8');
    const m = html.match(/id="w2-mapwrap"\s+data-open="([01])"/);
    expect(m, '#w2-mapwrap 의 data-open 속성을 못 찾았다 — 마크업이 바뀌었다').not.toBeNull();

    const drawer = attachMapDrawer(fakeParts() as never);
    const fromScript = drawer.open ? '1' : '0';
    expect(
      m![1],
      `world2.html 의 data-open="${m![1]}" 이 attachMapDrawer 기본값("${fromScript}")과 다르다.\n`
      + '  첫 페인트와 부팅 후 상태가 어긋나 지도가 번쩍인다 — 두 곳을 같이 고쳐라.',
    ).toBe(fromScript);
  });

  it('성능 패널(#w2-hud)도 기본 접힘이다', () => {
    // 지도만 접고 HUD 가 열려 있으면 캡처 목적이 반만 달성된다. 원래 접혀 있었고
    // 그 상태가 유지되는지 본다(누가 열어두면 이 단언이 잡는다).
    const html = readFileSync(join(ROOT, 'frontend', 'world2.html'), 'utf8');
    expect(html).toMatch(/id="w2-hud"\s+data-open="0"/);
  });
});
