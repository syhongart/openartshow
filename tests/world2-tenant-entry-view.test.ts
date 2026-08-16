// @vitest-environment jsdom
//
// **진입 화면** — 입력 창 쪽 (W8-3 S6, 감독 카드 「진입은 둘 다」의 나머지 절반).
//
// ── 왜 jsdom 인가 ─────────────────────────────────────────────────────────
// `ui/tenant-bar.ts` 는 three 를 안 쓰므로 **노드가 실제로 돌릴 수 있다.** 그래서 여기서는
// 텍스트 검사를 하지 않는다 — 실제 DOM 을 만들고, 실제로 붙이고, **눌러 본다.**
// (`features/` 쪽 배선은 three 때문에 텍스트로만 볼 수 있고 그것은 별도 파일이다.)
//
// ── 지키는 명제 다섯 ───────────────────────────────────────────────────────
// ① **빈 마을에서는 안 뜬다** — 지금 라이브가 그 상태다. 빈 입력 칸이 뜨면 하위호환(화면
//    변화 0)이 깨지고 «여기에 뭘 치라는 거지» 가 된다
// ② **사유가 있으면 반드시 뜬다** — 조용히 마을로 떨어지는 것이 `.GLB` 대문자 사고다
// ③ **세 갈래를 각각 다른 문구로** — 「형식 오류」·「없는 작가」·「지정 안 됨」
// ④ ★ **다른 노브를 보존한다** — `?edit=1` 을 잃고 주행 모드로 튕기면 편집이 끊긴다
// ⑤ **제자리로 가는 버튼을 주지 않는다** — 지금 보는 작가는 목록에서 빠진다

import { describe, it, expect } from 'vitest';
import {
  planEntry, entrySearch, resolveEntry, type EntryState,
} from '../frontend/js/world2/decide/tenant-entry.js';
import {
  findTenantBar, attachTenantBar, mountTenantEntry,
} from '../frontend/js/world2/ui/tenant-bar.js';

function state(over: Partial<EntryState> = {}): EntryState {
  return { tenant: null, tenantError: null, tenantMissing: false, owners: [], ...over };
}

describe('★ 판정 — 무엇을 말할 것인가', () => {
  it('★ 빈 마을에서는 안 뜬다 — 지금 라이브가 그 상태다(하위호환)', () => {
    expect(planEntry(state()).visible, '★ 빈 입력 칸이 라이브 화면에 떴다').toBe(false);
  });

  it('작가가 있으면 뜬다', () => {
    const v = planEntry(state({ owners: ['arthong', 'mara'] }));
    expect(v.visible).toBe(true);
    expect(v.title).toBe('마을 전체');
    expect(v.options).toEqual(['arthong', 'mara']);
    expect(v.canReset, '마을 전체인데 「마을 전체로」가 떴다').toBe(false);
  });

  it('★ 지금 보는 작가는 목록에서 뺀다 — 제자리로 가는 버튼은 동작이 아니다', () => {
    const v = planEntry(state({ tenant: 'arthong', owners: ['arthong', 'mara'] }));
    expect(v.options).toEqual(['mara']);
    expect(v.title).toBe('arthong 님의 땅');
    expect(v.canReset).toBe(true);
  });

  it('★ 작가가 0명이어도 **사유가 있으면 뜬다** — 조용히 마을로 떨어지지 않는다', () => {
    const v = planEntry(state({ tenantError: 'charset' }));
    expect(v.visible, '★ 오타를 친 사람이 아무 설명도 못 받는다').toBe(true);
    expect(v.notice).not.toBe('');
  });

  it('★ 세 갈래가 **서로 다른 문구**다 — 뭉개면 사용자가 엉뚱한 것을 고친다', () => {
    const bad = planEntry(state({ tenantError: 'charset' })).notice;
    const missing = planEntry(state({ tenant: 'nobody', tenantMissing: true })).notice;
    const none = planEntry(state({ owners: ['arthong'] })).notice;
    expect(bad).not.toBe(missing);
    expect(none, '지정 안 한 것은 사유가 아니다').toBe('');
    expect(missing, '★ 「없는 작가」가 아이디를 안 말한다').toContain('nobody');
  });

  it('예약어는 사칭 사유를 그대로 말한다', () => {
    expect(planEntry(state({ tenantError: 'reserved' })).notice).toContain('운영자');
  });

  it('★ 「없는 작가」는 제목을 「마을 전체」로 되돌린다 — 안 보이는 땅을 보고 있다고 하면 거짓말이다', () => {
    expect(planEntry(state({ tenant: 'nobody', tenantMissing: true })).title).toBe('마을 전체');
  });
});

describe('★ 주소 조립 — 다른 노브를 보존한다', () => {
  it('★ `?edit=1` 을 잃지 않는다 — 편집 중에 작가를 바꾸면 주행 모드로 튕긴다', () => {
    const next = entrySearch('?edit=1&time=night', 'mara');
    expect(next, '★ 편집 모드가 사라졌다').toContain('edit=1');
    expect(next, '★ 시간대 노브가 사라졌다').toContain('time=night');
    expect(next).toContain('u=mara');
  });

  it('이미 지정돼 있으면 갈아끼운다 — 두 개가 되지 않는다', () => {
    const next = entrySearch('?u=arthong&edit=1', 'mara');
    expect([...new URLSearchParams(next).getAll('u')]).toEqual(['mara']);
  });

  it('★ 마을 전체로 가면 `u` 만 뺀다 — 나머지는 그대로', () => {
    const next = entrySearch('?u=arthong&edit=1', null);
    expect(next).toBe('?edit=1');
  });

  it('남는 값이 없으면 빈 문자열 — `?` 만 남기지 않는다', () => {
    expect(entrySearch('?u=arthong', null)).toBe('');
  });

  it('질의가 없어도 던지지 않는다', () => {
    expect(entrySearch('', 'arthong')).toBe('?u=arthong');
  });
});

// ── DOM ────────────────────────────────────────────────────────────────────

/** `world2.html` 의 마크업과 **같은 id 구성**. 어긋나면 `findTenantBar` 가 null 을 낸다 */
function mount(): Document {
  document.body.innerHTML = `
    <div id="w2-tenant" data-show="0" hidden>
      <div class="row">
        <span id="w2-tenant-title"></span>
        <button id="w2-tenant-reset" type="button" hidden></button>
      </div>
      <p id="w2-tenant-notice" hidden></p>
      <div class="row">
        <select id="w2-tenant-list"></select>
        <input id="w2-tenant-input" type="text">
        <button id="w2-tenant-go" type="button"></button>
      </div>
    </div>`;
  return document;
}

describe('★ 화면 — 실제로 붙이고 눌러 본다', () => {
  it('★ 마크업이 없으면 `null` 을 낸다 — 세계가 죽지 않는다', () => {
    document.body.innerHTML = '';
    expect(findTenantBar(document)).toBeNull();
  });

  it('★ `world2.html` 의 id 구성으로 실제로 찾힌다', () => {
    expect(findTenantBar(mount()), '★ 마크업과 조회 id 가 어긋났다').not.toBeNull();
  });

  it('안 보일 때는 `hidden` 까지 건다 — 스크린리더가 빈 칸을 읽지 않게', () => {
    const doc = mount();
    const parts = findTenantBar(doc)!;
    attachTenantBar(parts, planEntry(state()), () => {});
    expect(parts.wrap.hidden).toBe(true);
    expect(parts.wrap.dataset.show).toBe('0');
  });

  it('★ 작가 목록이 실제 `option` 으로 들어간다', () => {
    const doc = mount();
    const parts = findTenantBar(doc)!;
    attachTenantBar(parts, planEntry(state({ owners: ['arthong', 'mara'] })), () => {});
    expect(parts.wrap.hidden).toBe(false);
    // 첫 줄은 안내이므로 값이 빈 것 하나가 앞에 온다.
    expect([...parts.list.options].map((o) => o.value)).toEqual(['', 'arthong', 'mara']);
    expect(parts.list.disabled).toBe(false);
  });

  it('작가가 0명이면 고르기를 잠근다 — 누를 수 있는데 아무 일도 안 나면 고장으로 읽힌다', () => {
    const doc = mount();
    const parts = findTenantBar(doc)!;
    attachTenantBar(parts, planEntry(state({ tenantError: 'charset' })), () => {});
    expect(parts.list.disabled).toBe(true);
    expect(parts.notice.hidden).toBe(false);
    expect(parts.notice.textContent).not.toBe('');
  });

  it('★ 목록에서 고르면 그 아이디로 간다', () => {
    const doc = mount();
    const parts = findTenantBar(doc)!;
    const went: (string | null)[] = [];
    attachTenantBar(parts, planEntry(state({ owners: ['arthong'] })), (id) => went.push(id));
    parts.list.value = 'arthong';
    parts.list.dispatchEvent(new doc.defaultView!.Event('change'));
    expect(went, '★ 골라도 아무 일이 안 일어난다').toEqual(['arthong']);
  });

  it('★ 직접 쳐서 간다 — 링크를 모르는 방문자의 경로다', () => {
    const doc = mount();
    const parts = findTenantBar(doc)!;
    const went: (string | null)[] = [];
    attachTenantBar(parts, planEntry(state({ owners: ['arthong'] })), (id) => went.push(id));
    parts.input.value = '  MaRa  ';
    (parts.go as HTMLElement).click();
    // 공백만 걷고 **정규화는 안 한다** — 그 판정은 도착한 페이지가 다시 한다.
    expect(went).toEqual(['MaRa']);
  });

  it('엔터로도 간다 — 모바일에서 「이동」을 찾아 누르는 것은 한 단계 더다', () => {
    const doc = mount();
    const parts = findTenantBar(doc)!;
    const went: (string | null)[] = [];
    attachTenantBar(parts, planEntry(state({ owners: ['arthong'] })), (id) => went.push(id));
    parts.input.value = 'mara';
    parts.input.dispatchEvent(new doc.defaultView!.KeyboardEvent('keydown', { key: 'Enter' }));
    expect(went).toEqual(['mara']);
  });

  it('★ 빈 칸으로는 안 간다 — 빈 `?u=` 로 이동하면 사유만 남고 화면이 그대로다', () => {
    const doc = mount();
    const parts = findTenantBar(doc)!;
    const went: (string | null)[] = [];
    attachTenantBar(parts, planEntry(state({ owners: ['arthong'] })), (id) => went.push(id));
    parts.input.value = '   ';
    (parts.go as HTMLElement).click();
    expect(went).toEqual([]);
  });

  it('★ 「마을 전체로」는 `null` 로 간다', () => {
    const doc = mount();
    const parts = findTenantBar(doc)!;
    const went: (string | null)[] = [];
    attachTenantBar(parts, planEntry(state({ tenant: 'arthong', owners: ['arthong'] })), (id) => went.push(id));
    expect(parts.reset.hidden).toBe(false);
    (parts.reset as HTMLElement).click();
    expect(went).toEqual([null]);
  });

  it('★ `dispose` 뒤에는 안 간다 — 떠난 페이지가 이동을 트리거하면 유령이다', () => {
    const doc = mount();
    const parts = findTenantBar(doc)!;
    const went: (string | null)[] = [];
    const bar = attachTenantBar(parts, planEntry(state({ owners: ['arthong'] })), (id) => went.push(id));
    bar.dispose();
    parts.input.value = 'mara';
    (parts.go as HTMLElement).click();
    parts.list.value = 'arthong';
    parts.list.dispatchEvent(new doc.defaultView!.Event('change'));
    expect(went, '★ 리스너가 안 떨어졌다').toEqual([]);
  });
});

describe('★ 부팅 진입점 — 찾기·판정·이동이 한 줄로 묶여 실제로 돈다', () => {
  // ⚠ 이 묶음이 있어야 **주소 조립이 실행 축으로** 검사된다. `features/overlay.ts` 는
  // three 때문에 노드가 못 돌리므로, 거기 인라인으로 두면 「다른 노브 보존」은 텍스트로만
  // 볼 수 있다 — 그리고 텍스트는 «`?edit=1` 이 살아남는가» 를 못 본다.

  it('★ 마크업이 없으면 `null` — 세계는 그대로 뜬다', () => {
    document.body.innerHTML = '';
    expect(mountTenantEntry(document, resolveEntry('', ['arthong']))).toBeNull();
  });

  it('★ 목록에서 고르면 **다른 노브를 보존한** 주소로 옮긴다', () => {
    const doc = mount();
    doc.defaultView!.history.replaceState({}, '', '/world2.html?edit=1&time=night');
    const hrefs: string[] = [];
    const bar = mountTenantEntry(
      doc, resolveEntry(doc.defaultView!.location.search, ['arthong', 'mara']),
      (h) => hrefs.push(h),
    );
    expect(bar).not.toBeNull();
    const parts = findTenantBar(doc)!;
    parts.list.value = 'mara';
    parts.list.dispatchEvent(new doc.defaultView!.Event('change'));

    expect(hrefs, '★ 옮기지 않았다').toHaveLength(1);
    expect(hrefs[0], '★ 편집 모드를 잃었다 — 편집 중에 작가를 바꾸면 주행으로 튕긴다')
      .toContain('edit=1');
    expect(hrefs[0], '★ 시간대 노브를 잃었다').toContain('time=night');
    expect(hrefs[0]).toContain('u=mara');
    expect(hrefs[0], '★ 경로가 바뀌었다 — 다른 페이지로 간다').toContain('/world2.html');
  });

  it('★ 지정된 채로 열면 그 작가의 땅이라고 말한다 — 진단과 화면이 같은 판정을 본다', () => {
    const doc = mount();
    doc.defaultView!.history.replaceState({}, '', '/world2.html?u=arthong');
    const res = resolveEntry(doc.defaultView!.location.search, ['arthong', 'mara']);
    mountTenantEntry(doc, res, () => {});
    const parts = findTenantBar(doc)!;
    expect(res.who).toEqual(['arthong']);
    expect(parts.title.textContent).toBe('arthong 님의 땅');
    expect(parts.reset.hidden).toBe(false);
  });

  it('★ 틀린 아이디로 열면 사유가 화면에 뜬다 — 조용히 마을로 떨어지지 않는다', () => {
    const doc = mount();
    doc.defaultView!.history.replaceState({}, '', '/world2.html?u=%EC%95%84%ED%8A%B8');
    const res = resolveEntry(doc.defaultView!.location.search, []);
    mountTenantEntry(doc, res, () => {});
    const parts = findTenantBar(doc)!;
    expect(res.tenantError).toBe('charset');
    expect(parts.wrap.hidden, '★ 오타를 친 사람이 아무 설명도 못 받는다').toBe(false);
    expect(parts.notice.textContent).not.toBe('');
  });
});
