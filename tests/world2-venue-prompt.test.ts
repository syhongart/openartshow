// @vitest-environment jsdom
// world2-venue-prompt.test.ts — 진입 안내가 **실제로 붙고 눌리는가**.
//
// 판정(`decide/venue-entry.ts`)만 검사하면 배선이 빠져도 전부 초록이다 — 이 저장소가
// `leafLift()` 소비자 0 으로 데인 그 형태다(검수관 발견 E). 그래서 DOM 을 실제로 만들어
// 붙이고, 눌러서 어디로 가는지까지 본다.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountVenuePrompt } from '../frontend/js/world2/ui/venue-prompt.js';
import { VENUE_NEAR_RADIUS } from '../frontend/js/world2/decide/venue-entry.js';

// 환경은 파일 상단 주석으로 jsdom 이다(`vitest.config` 는 node 기본, 파일별 지정 규약).
let doc: Document;
beforeEach(() => { document.body.innerHTML = ''; doc = document; });

const deps = (over: any = {}) => ({
  tenant: 'syhongart',
  player: () => ({ x: 0, z: 0 }),
  venue: () => ({ x: 0, z: 0, radius: VENUE_NEAR_RADIUS }),
  intervalMs: 0, // 타이머 없이 refresh() 로만 돌린다
  ...over,
});

const btn = () => doc.body.querySelector('button');

describe('mountVenuePrompt — 붙고, 보이고, 눌린다', () => {
  it('마운트하면 버튼이 생기고 가까우면 보인다', () => {
    const p = mountVenuePrompt(doc, deps());
    expect(btn()).toBeTruthy();
    expect(btn()!.style.display).toBe('block');
    expect(btn()!.textContent).toBe('전시장 들어가기');
    p.dispose();
  });

  it('멀면 숨고, 다가가면 다시 보인다 (게터를 매번 다시 읽는다)', () => {
    let pos = { x: 100, z: 0 };
    const p = mountVenuePrompt(doc, deps({ player: () => pos }));
    expect(btn()!.style.display).toBe('none');
    pos = { x: 2, z: 0 };
    p.refresh();
    expect(btn()!.style.display).toBe('block');
    p.dispose();
  });

  it('건물이 아직 안 떴으면 숨는다 (13.5MB 비동기 로드)', () => {
    let venue: any = null;
    const p = mountVenuePrompt(doc, deps({ venue: () => venue }));
    expect(btn()!.style.display).toBe('none');
    venue = { x: 0, z: 0, radius: VENUE_NEAR_RADIUS };
    p.refresh();
    expect(btn()!.style.display).toBe('block');
    p.dispose();
  });

  it('갈 곳이 없으면(?u= 없음) 뜨지 않는다', () => {
    const p = mountVenuePrompt(doc, deps({ tenant: null }));
    expect(btn()!.style.display).toBe('none');
    p.dispose();
  });

  it('누르면 그 작가의 전시장 주소로 간다', () => {
    const gone: string[] = [];
    const p = mountVenuePrompt(doc, deps({ navigate: (h: string) => gone.push(h) }));
    btn()!.dispatchEvent(new MouseEvent('click'));
    expect(gone).toEqual(['visit.html?u=syhongart']);
    p.dispose();
  });

  it('숨어 있을 때 누르면 아무 데도 안 간다', () => {
    const gone: string[] = [];
    const p = mountVenuePrompt(doc, deps({ player: () => ({ x: 999, z: 0 }), navigate: (h: string) => gone.push(h) }));
    btn()!.dispatchEvent(new MouseEvent('click'));
    expect(gone).toEqual([]);
    p.dispose();
  });

  it('dispose 하면 버튼이 사라진다', () => {
    const p = mountVenuePrompt(doc, deps());
    p.dispose();
    expect(btn()).toBeNull();
  });
});

describe('overlay 배선 — 안내가 실제로 마운트·정리되는가', () => {
  // 소스 검사다. `features/overlay.ts` 는 three 를 import 하므로 노드에서 못 돌린다 —
  // 그 사실 때문에 배선이 빠져도 위 DOM 검사는 전부 통과한다. 이 한 축이 그 구멍을 막는다.
  it('overlay 가 진입 안내를 붙이고 dispose 에서 정리한다', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('frontend/js/world2/features/overlay.ts', 'utf-8');
    // ⚠ 뮤테이션이 잡아낸 사각(M38). 처음엔 `toContain('mountVenuePrompt')` 였고,
    // 호출을 `if (false)` 로 죽여도 문자열은 남아 **8건이 전부 통과했다.** 소스 검사는
    // 죽은 코드에 뚫린다 — 이 저장소가 이미 두 방향으로 실측한 사각이다(#255 권고 A/N9a).
    // 그래서 **조건까지** 본다: 마운트가 `env.doc` 이 있을 때 실제로 도는가.
    expect(src).toMatch(/if \(env\.doc\)\s*venuePrompt\s*=\s*mountVenuePrompt\(/);
    expect(src).toContain('venuePrompt?.dispose()');
    // 위치·건물을 게터로 넘겨야 한다 — 값으로 넘기면 「마운트 시점에 없어서 영영 안 뜬다」.
    expect(src).toMatch(/player:\s*\(\)\s*=>/);
    expect(src).toMatch(/venue:\s*\(\)\s*=>/);
  });
});

// ⚠ **남는 사각을 「해소됨」으로 적지 않는다.** `features/overlay.ts` 는 three 를
// import 하므로 노드가 못 돌린다 — 위 검사는 전부 **소스 텍스트**이고, 그것이 실제로
// 실행되는지는 브라우저에서만 보인다. 조건을 문자열로 못 박은 것은 M38 형태(죽은 코드)를
// 막을 뿐이고, 예컨대 `env.doc` 이 항상 null 인 경로가 생기면 이 검사는 여전히 초록이다.
// 그 축은 헤드리스 스모크(world2 페이지 로드)나 감독 화면이 유일하다.
