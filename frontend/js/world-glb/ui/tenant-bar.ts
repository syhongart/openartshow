// world-glb/ui/tenant-bar.ts — 「누구의 땅을 보고 있는가」 + 다른 작가로 가는 문.
//
// 감독 카드(2026-08-16) 「진입은 **둘 다**」의 입력 창 쪽. `?u=` 는 링크를 받은 사람만
// 쓸 수 있고, 이 바가 **주소를 모르는 방문자**의 경로다.
//
// ── 이 파일은 무엇을 보여줄지 정하지 않는다 ───────────────────────────────
// 문구·표시 여부·목록은 전부 `decide/tenant-entry.ts` 가 판정한 `EntryView` 로 받는다.
// 여기서 조건문을 하나라도 더 두면 그 분기는 **노드가 못 도는 자리**에 생기고, 안 도는
// 코드는 검사되지 않는다(W8-2 에서 진단 계약 셋이 그래서 `0 failed` 였다).
//
// ── 이동은 주소를 바꿔 다시 여는 것이다 ───────────────────────────────────
// 씬을 부분 재구성하지 않는다 — 근거는 `decide/tenant-entry.ts` 헤더 한 곳이다.
// 그래서 이 파일이 하는 일은 **`nav(search)` 를 부르는 것**뿐이고, 그 함수는 주입받는다
// (전역 `location` 을 직접 만지면 테스트가 이 파일을 못 돌린다).
//
// ── 룩은 새로 정하지 않는다 ───────────────────────────────────────────────
// 색·간격은 `#wg-god` 패널의 것을 그대로 따른다(`world2.html` 의 CSS 변수). 감독이
// 부재 중이고 이 화면은 behind-flag 이므로 **새 룩 판단을 열지 않는 것**이 보수적인
// 쪽이다 — 판단이 필요해지면 그때 디자이너에게 간다.

import {
  planEntry, entrySearch, type EntryView, type EntryResolution,
} from '../decide/tenant-entry.js';

export interface TenantBarParts {
  /** 껍데기. `data-show` 를 여기에 쓴다 */
  wrap: HTMLElement;
  /** 지금 보고 있는 것 */
  title: HTMLElement;
  /** 사유 한 줄. 없으면 감춘다 */
  notice: HTMLElement;
  /** 대장에 있는 작가 목록 */
  list: HTMLSelectElement;
  /** 직접 치는 칸 */
  input: HTMLInputElement;
  /** 이동 */
  go: HTMLElement;
  /** 마을 전체로 */
  reset: HTMLElement;
}

export interface TenantBar {
  dispose(): void;
}

/** DOM 이 없으면 `null` — 조립부가 이 바를 몰라도 되게 한다(`findMapDrawer` 와 같은 형태) */
export function findTenantBar(doc: Document): TenantBarParts | null {
  const wrap = doc.getElementById('wg-tenant');
  const title = doc.getElementById('wg-tenant-title');
  const notice = doc.getElementById('wg-tenant-notice');
  const list = doc.getElementById('wg-tenant-list') as HTMLSelectElement | null;
  const input = doc.getElementById('wg-tenant-input') as HTMLInputElement | null;
  const go = doc.getElementById('wg-tenant-go');
  const reset = doc.getElementById('wg-tenant-reset');
  return wrap && title && notice && list && input && go && reset
    ? { wrap, title, notice, list, input, go, reset }
    : null;
}

/**
 * 판정을 화면에 옮기고 이동 배선을 건다.
 *
 * @param nav 갈 곳의 **아이디**(마을 전체면 `null`)를 받는다. 질의 문자열 조립은
 *            `entrySearch` 가 하고 그것은 순수라 테스트가 실제로 돌린다 — 여기서
 *            조립하면 «다른 노브 보존» 이 다시 안 도는 자리로 들어간다.
 */
export function attachTenantBar(
  parts: TenantBarParts,
  view: EntryView,
  nav: (id: string | null) => void,
): TenantBar {
  const { wrap, title, notice, list, input, go, reset } = parts;

  wrap.dataset.show = view.visible ? '1' : '0';
  // 안 보이는 것을 **접근성 트리에서도** 뺀다. `data-show` 는 CSS 만 보므로 스크린리더가
  // 빈 입력 칸을 계속 읽는다.
  wrap.hidden = !view.visible;
  title.textContent = view.title;
  notice.textContent = view.notice;
  notice.hidden = view.notice === '';

  // 목록은 매번 다시 만든다 — 부팅 1회라 비용이 없고, 부분 갱신은 «지운 줄이 남는» 형태다.
  list.textContent = '';
  const head = list.ownerDocument.createElement('option');
  head.value = '';
  head.textContent = view.options.length > 0 ? '작가 고르기…' : '(등록된 작가 없음)';
  list.appendChild(head);
  for (const owner of view.options) {
    const opt = list.ownerDocument.createElement('option');
    opt.value = owner;
    opt.textContent = owner;
    list.appendChild(opt);
  }
  list.disabled = view.options.length === 0;

  reset.hidden = !view.canReset;

  /** 입력 칸의 값으로 간다. **정규화는 안 한다** — 그 판정은 도착한 페이지가 다시 한다 */
  const goTyped = () => {
    const v = input.value.trim();
    if (v !== '') nav(v);
  };

  const onGo = () => goTyped();
  const onKey = (e: Event) => {
    // 엔터로 갈 수 있어야 한다 — 모바일 키보드에서 「이동」 버튼을 찾아 누르는 것은 한 단계 더다.
    if ((e as KeyboardEvent).key === 'Enter') { e.preventDefault(); goTyped(); }
  };
  const onPick = () => {
    const v = list.value;
    if (v !== '') nav(v);
  };
  const onReset = () => nav(null);

  go.addEventListener('click', onGo);
  input.addEventListener('keydown', onKey);
  list.addEventListener('change', onPick);
  reset.addEventListener('click', onReset);

  return {
    dispose() {
      go.removeEventListener('click', onGo);
      input.removeEventListener('keydown', onKey);
      list.removeEventListener('change', onPick);
      reset.removeEventListener('click', onReset);
    },
  };
}

/**
 * 부팅용 진입점 — 찾기·판정·붙이기·이동을 **한 줄로** 묶는다.
 *
 * ⚠ 이 함수가 있는 이유는 편의가 아니라 **`features/overlay.ts` 의 크기**다. 그 파일은
 * `check:filesize` 상한에 붙어 있고(감독 지시 2026-08-16 *"파일사이즈 폭주 안되고 모듈
 * 관리 잘되게"*), 실제로 이 배선을 인라인으로 넣자 **게이트가 커밋을 막았다.** 게이트가
 * 더 나은 자리로 민 것이다 — 이 저장소에서 두 번째 사례다(`studio-plan.ts` 가 첫 번째).
 *
 * @param navigate 최종 주소로 옮기는 함수. 기본은 실제 이동이고, **테스트가 주입한다** —
 *                 주입 가능해야 `entrySearch` 의 「다른 노브 보존」이 실제로 돌아 검사된다
 *                 (jsdom 은 진짜 이동을 구현하지 않아 주입이 없으면 그 축이 통째로 빈다).
 * @returns 마크업이 없으면 `null`. **그래도 세계는 뜬다** — 진입 바는 부속이다
 */
export function mountTenantEntry(
  doc: Document,
  res: EntryResolution,
  navigate?: (href: string) => void,
): TenantBar | null {
  const parts = findTenantBar(doc);
  if (!parts) return null;
  const go = navigate ?? ((href: string) => { doc.defaultView?.location.assign(href); });
  return attachTenantBar(parts, planEntry(res), (id) => {
    const loc = doc.defaultView?.location;
    if (!loc) return;
    go(`${loc.pathname}${entrySearch(loc.search, id)}${loc.hash}`);
  });
}
