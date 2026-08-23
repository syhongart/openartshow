// frontend/js/mypage/view-links.ts — SNS·링크 편집 행 관리
//
// 개수가 동적인 유일한 영역이라 따로 뒀다. 행 마크업은 디자이너가 만든
// `<template data-mp="link-row">` 에서 복제한다 — 여기서 HTML 문자열을 조립하면
// 룩이 두 곳(마크업·JS)에 생기고, 디자이너가 고칠 수 없는 자리가 된다.

import { LIMITS, type SocialLink } from './schema.js';
import { PLATFORMS, checkLink, normalizeLinkUrl, handleFromUrl, type PlatformId } from './links.js';
import { q, qa, mp, setText, setShown, setStateClass, readValue, writeValue, readChecked, writeChecked, clear } from './dom.js';
import { FEEDBACK_CLASSES } from './view-form.js';

const ROW_SELECTOR = '[data-mp-link-row]';

function linkPart<T extends HTMLElement = HTMLElement>(row: ParentNode, name: string): T | null {
  return q<T>(row, `[data-mp-link="${name}"]`);
}

/** 행 하나를 만든다. `<template>` 이 없으면 아무것도 못 한다 — 계약 위반이므로 null. */
function createRow(root: ParentNode): HTMLElement | null {
  const tpl = q<HTMLTemplateElement>(root, 'template[data-mp="link-row"]');
  if (!tpl) return null;
  const frag = tpl.content.cloneNode(true) as DocumentFragment;
  const row = frag.firstElementChild;
  if (!(row instanceof HTMLElement)) return null;
  row.setAttribute('data-mp-link-row', '');

  // 플랫폼 옵션은 여기서 채운다. 마크업에 적으면 `PLATFORMS` 와 두 곳에 같은 목록이
  // 생기고, 플랫폼을 추가할 때 한쪽만 고치게 된다.
  const select = linkPart<HTMLSelectElement>(row, 'platform');
  if (select) {
    clear(select);
    for (const platform of PLATFORMS) {
      const opt = select.ownerDocument.createElement('option');
      opt.value = platform.id;
      opt.textContent = platform.name;
      select.appendChild(opt);
    }
  }

  const url = linkPart(row, 'url');
  if (url instanceof HTMLInputElement) url.maxLength = LIMITS.linkUrl.max;
  const label = linkPart(row, 'label');
  if (label instanceof HTMLInputElement) label.maxLength = LIMITS.linkLabel.max;

  return row;
}

export interface LinksHandlers {
  /** 행이 바뀔 때(입력·삭제·추가). 호출자가 Preview 를 다시 그린다. */
  onChange: () => void;
}

/** 행 하나에 이벤트를 건다. 추가·복원 양쪽이 같은 함수를 거치게 한다. */
function bindRow(root: ParentNode, row: HTMLElement, handlers: LinksHandlers): void {
  const notify = () => {
    reflectRow(row);
    handlers.onChange();
  };
  for (const name of ['platform', 'url', 'label', 'visible']) {
    const el = linkPart(row, name);
    if (!el) continue;
    el.addEventListener('input', notify);
    el.addEventListener('change', notify);
  }
  const remove = linkPart(row, 'remove');
  remove?.addEventListener('click', () => {
    row.remove();
    handlers.onChange();
  });
  reflectRow(row);
}

/**
 * 한 행의 상태를 화면에 반영한다 — 「기타 링크」일 때만 이름 칸을 보이고, 판정 문구를 낸다.
 *
 * 빈 행은 판정하지 않는다. 사용자가 링크를 막 추가한 순간 "주소를 입력해 주세요" 가
 * 빨갛게 뜨면 자기가 뭘 잘못한 줄 안다 — 아직 아무것도 안 했을 뿐이다.
 */
export function reflectRow(row: HTMLElement): void {
  const platform = readValue(linkPart(row, 'platform')) || 'other';
  const url = readValue(linkPart(row, 'url')).trim();
  const label = readValue(linkPart(row, 'label')).trim();

  const labelEl = linkPart(row, 'label');
  const labelBox = labelEl?.closest('[data-mp-link-labelbox]') ?? labelEl;
  setShown(labelBox instanceof HTMLElement ? labelBox : null, platform === 'other');

  const slot = linkPart(row, 'error');
  if (!slot) return;
  if (!url) {
    setText(slot, '');
    setStateClass(slot, FEEDBACK_CLASSES, null);
    setShown(slot, false);
    return;
  }
  const check = checkLink(platform, url, label);
  if (check.ok) {
    // 통과하면 "이렇게 저장됩니다" 를 보여준다. 아이디로 입력한 사람에게는 이게
    // 유일한 확인 수단이다 — 저장 후에야 URL 로 바뀐 것을 알면 놀란다.
    const normalized = normalizeLinkUrl(platform, url);
    setText(slot, normalized && normalized !== url ? `저장 주소: ${normalized}` : '확인했습니다.');
    setStateClass(slot, FEEDBACK_CLASSES, 'is-ok');
  } else {
    setText(slot, check.message);
    setStateClass(slot, FEEDBACK_CLASSES, 'is-error');
  }
  setShown(slot, true);
}

/** 저장된 링크로 편집 영역을 다시 그린다. */
export function writeLinks(root: ParentNode, links: readonly SocialLink[], handlers: LinksHandlers): void {
  const list = mp(root, 'links-list');
  if (!list) return;
  clear(list);
  for (const link of links) {
    const row = createRow(root);
    if (!row) return;
    writeValue(linkPart(row, 'platform'), link.platform);
    writeValue(linkPart(row, 'url'), link.url);
    writeValue(linkPart(row, 'label'), link.label);
    writeChecked(linkPart(row, 'visible'), link.isVisible);
    list.appendChild(row);
    bindRow(root, row, handlers);
  }
}

/** 빈 행 하나를 붙인다. 상한에 걸리면 아무것도 하지 않고 false. */
export function addLinkRow(root: ParentNode, handlers: LinksHandlers): boolean {
  const list = mp(root, 'links-list');
  if (!list) return false;
  if (qa(list, ROW_SELECTOR).length >= LIMITS.links.max) return false;
  const row = createRow(root);
  if (!row) return false;
  writeChecked(linkPart(row, 'visible'), true); // 새 링크는 공개가 기본이다
  list.appendChild(row);
  bindRow(root, row, handlers);
  return true;
}

/**
 * 편집 영역에서 링크를 읽는다.
 *
 * **판정에 실패한 행과 빈 행은 버린다.** 잘못된 URL 을 저장해 두면 공개 프로필에
 * 깨진 링크가 뜨고, 그건 프로필을 보는 사람에게만 보인다(주인은 모른다).
 * 버렸다는 사실은 `dropped` 로 돌려줘 화면이 알릴 수 있게 한다 — 조용히 사라지면
 * 사용자는 저장이 된 줄 안다.
 */
export function readLinks(root: ParentNode): { links: SocialLink[]; dropped: number } {
  const list = mp(root, 'links-list');
  if (!list) return { links: [], dropped: 0 };

  const links: SocialLink[] = [];
  let dropped = 0;
  for (const row of qa(list, ROW_SELECTOR)) {
    const platform = (readValue(linkPart(row, 'platform')) || 'other') as PlatformId;
    const raw = readValue(linkPart(row, 'url')).trim();
    const label = readValue(linkPart(row, 'label')).trim();
    if (!raw) continue; // 빈 행은 실수가 아니라 "아직 안 적음" 이다 — 경고 대상이 아니다
    if (!checkLink(platform, raw, label).ok) {
      dropped += 1;
      continue;
    }
    const url = normalizeLinkUrl(platform, raw);
    if (!url) {
      dropped += 1;
      continue;
    }
    links.push({
      platform,
      url,
      handle: handleFromUrl(platform, url),
      label: platform === 'other' ? label : '',
      sortOrder: links.length,
      isVisible: readChecked(linkPart(row, 'visible')),
    });
    if (links.length >= LIMITS.links.max) break;
  }
  return { links, dropped };
}
