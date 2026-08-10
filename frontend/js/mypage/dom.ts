// frontend/js/mypage/dom.ts — DOM 조회·갱신 헬퍼
//
// 화면 코드가 `querySelector` 문자열을 각자 조립하면 오타가 런타임까지 산다(그리고
// 조용히 아무 일도 안 일어난다 — 가장 찾기 어려운 종류의 결함이다). 계약 속성
// (`data-mp*`)을 다루는 지점을 여기 한 곳으로 모은다.
//
// 마크업은 디자이너가 만들고 로직은 여기서 붙인다. 그래서 **계약에 없는 요소는
// 없을 수 있다** — 모든 조회가 `null` 을 정상 반환으로 다룬다. 요소 하나가 빠졌다고
// 페이지 전체가 죽으면 안 된다.

export function q<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T | null {
  return root.querySelector<T>(selector);
}

export function qa<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** `[data-mp="name"]` */
export function mp<T extends HTMLElement = HTMLElement>(root: ParentNode, name: string): T | null {
  return q<T>(root, `[data-mp="${name}"]`);
}

/** `[data-mp-field="name"]` — 라디오 그룹처럼 여러 개일 수 있어 배열로 준다. */
export function fields<T extends HTMLElement = HTMLElement>(root: ParentNode, name: string): T[] {
  return qa<T>(root, `[data-mp-field="${name}"]`);
}

/** 단일 입력 필드. 라디오·체크박스 그룹이면 `fields` 를 쓴다. */
export function field<T extends HTMLElement = HTMLElement>(root: ParentNode, name: string): T | null {
  return q<T>(root, `[data-mp-field="${name}"]`);
}

/** `[data-mp-error="name"]` */
export function errorSlot(root: ParentNode, name: string): HTMLElement | null {
  return q(root, `[data-mp-error="${name}"]`);
}

/** `[data-mp-count="name"]` */
export function countSlot(root: ParentNode, name: string): HTMLElement | null {
  return q(root, `[data-mp-count="${name}"]`);
}

export function setText(el: HTMLElement | null, text: string): void {
  if (!el) return;
  // textContent 다. innerHTML 을 쓰면 사용자가 적은 소개가 마크업으로 실행된다 —
  // 프로필은 남이 보는 화면이므로 그건 그대로 저장형 XSS 다. 이 파일에 innerHTML 을
  // 쓰는 함수를 만들지 않는 것이 그 규율의 집행 수단이다.
  el.textContent = text;
}

/**
 * 보이기/숨기기. `hidden` 속성으로 한다.
 *
 * ⚠ `display:flex`·`grid` 자식은 `hidden` 을 **무시한다**(레이아웃 display 가 이긴다).
 * 그래서 CSS 쪽에 `[hidden]{display:none!important}` 가 한 번 있어야 한다 —
 * 디자이너 위임 명세에 그 조항을 넣었다. 여기서 인라인 스타일로 덮지 않는 이유는,
 * 그러면 CSS 가 요소의 표시 방식을 정할 수 없게 되기 때문이다.
 */
export function setShown(el: HTMLElement | null, shown: boolean): void {
  if (!el) return;
  el.hidden = !shown;
}

/** 값이 있으면 채우고 보이고, 없으면 숨긴다. Preview 가 거의 이 한 줄로 돈다. */
export function setTextOrHide(el: HTMLElement | null, text: string | null | undefined): void {
  if (!el) return;
  const value = text ?? '';
  setText(el, value);
  setShown(el, value !== '');
}

/** 클래스 셋 중 하나만 켠다(`is-ok`/`is-error`/`is-pending` 처럼 배타적인 상태). */
export function setStateClass(el: HTMLElement | null, all: readonly string[], active: string | null): void {
  if (!el) return;
  for (const cls of all) el.classList.toggle(cls, cls === active);
}

/** `<input>`·`<textarea>`·`<select>` 의 값을 읽는다. 없으면 빈 문자열. */
export function readValue(el: HTMLElement | null): string {
  if (!el) return '';
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el.value;
  }
  return '';
}

export function writeValue(el: HTMLElement | null, value: string): void {
  if (!el) return;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    el.value = value;
  }
}

export function readChecked(el: HTMLElement | null): boolean {
  return el instanceof HTMLInputElement ? el.checked : false;
}

export function writeChecked(el: HTMLElement | null, checked: boolean): void {
  if (el instanceof HTMLInputElement) el.checked = checked;
}

/**
 * 라디오 그룹의 선택값. `<select>` 하나여도 동작한다 — 디자이너가 어느 쪽을 골랐는지
 * 로직이 몰라도 되게 한다(명세에서 둘 다 허용했다).
 */
export function readGroup(els: HTMLElement[]): string {
  if (els.length === 1 && els[0] instanceof HTMLSelectElement) return els[0].value;
  for (const el of els) {
    if (el instanceof HTMLInputElement && el.checked) return el.value;
  }
  return '';
}

export function writeGroup(els: HTMLElement[], value: string): void {
  if (els.length === 1 && els[0] instanceof HTMLSelectElement) {
    els[0].value = value;
    return;
  }
  for (const el of els) {
    if (el instanceof HTMLInputElement) el.checked = el.value === value;
  }
}

/** 체크박스 그룹에서 켜진 value 들. 장르 선택이 이것을 쓴다. */
export function readCheckedValues(els: HTMLElement[]): string[] {
  return els
    .filter((el): el is HTMLInputElement => el instanceof HTMLInputElement && el.checked)
    .map((el) => el.value);
}

export function writeCheckedValues(els: HTMLElement[], values: readonly string[]): void {
  const set = new Set(values);
  for (const el of els) {
    if (el instanceof HTMLInputElement) el.checked = set.has(el.value);
  }
}

/** 컨테이너를 비운다. `innerHTML = ''` 보다 안전하고 의도가 분명하다. */
export function clear(el: HTMLElement | null): void {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}
