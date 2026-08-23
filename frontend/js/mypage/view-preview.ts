// frontend/js/mypage/view-preview.ts — Profile Preview 렌더
//
// ── 이 파일의 계약 ────────────────────────────────────────────────────────
// **`Profile` 을 받지 않는다. `PublicProfile` 만 받는다.**
//
// 그게 이 화면의 핵심 약속이다. 편집 중인 원본을 그리면 사용자가 "비공개" 로 꺼 둔
// 항목이 Preview 에 남고, 그러면 Preview 는 "다른 사람이 보는 모습" 이 아니게 된다.
// 함수 시그니처로 그것을 막는다 — `publicView()` 를 통과하지 않은 값은 애초에 여기
// 들어올 수 없다.
//
// 나중에 `/@nickname` 공개 페이지가 생기면 **이 함수를 그대로 쓴다.** 두 벌로 만들면
// 갈라지고, 갈라진 쪽이 공개 페이지면 사용자는 자기가 숨긴 것이 공개된 줄 모른다.
//
// ⚠ 이 머리말은 원래 *"`publicView()` 를 통과하지 않은 값은 애초에 여기 들어올 수 없다"*
// 로 끝났고 **거짓이었다** — 두 번째 인자 `options` 가 그 통로였다(검수관 P1). 지금은
// `options.avatarThumb` 도 `view.visible` 을 따르게 고쳤고 테스트로 고정했다. 앞으로
// `options` 에 무언가를 더할 때는 **그것도 공개 판정을 따르는지** 먼저 본다.

import { GENRES } from './schema.js';
import { PLATFORMS } from './links.js';
import { type PublicProfile, isEmptyPublicView } from './visibility.js';
import { mp, setText, setTextOrHide, setShown, clear } from './dom.js';

export interface PreviewOptions {
  /** 아바타 썸네일 dataURL(`ui-chibi-store` 의 `readStoredChibiThumb`). 없으면 빈 문자열. */
  avatarThumb?: string;
}

const GENRE_NAME = new Map<string, string>(GENRES.map((g) => [g.id, g.name]));
const PLATFORM_NAME = new Map<string, string>(PLATFORMS.map((p) => [p.id, p.name]));

/** 사진도 아바타도 없을 때 쓰는 이니셜. 이름의 첫 글자 하나. */
function initialOf(view: PublicProfile): string {
  const source = view.displayName || view.nickname;
  return source ? Array.from(source)[0] : '?';
}

export function renderPreview(root: ParentNode, view: PublicProfile, options: PreviewOptions = {}): void {
  const card = mp(root, 'preview');
  if (card) card.classList.toggle('is-private', !view.visible);

  // 비공개 안내 — 마스터 스위치가 꺼졌을 때만.
  setShown(mp(root, 'preview-private'), !view.visible);

  // 이름·별명은 비공개여도 남긴다(주소로 도달했을 때 무엇인지는 알려야 한다).
  setText(mp(root, 'preview-name'), view.visible ? view.displayName : (view.nickname || '이름 없음'));
  setTextOrHide(mp(root, 'preview-nickname'), view.nickname ? `@${view.nickname}` : '');
  setTextOrHide(mp(root, 'preview-type'), view.userTypeName ?? '');

  // ── 아바타 ──────────────────────────────────────────────────────────────
  // 우선순위: 프로필 사진 → 아야모 썸네일 → 이니셜.
  //
  // ── `options` 도 공개 판정을 따른다 (검수관 P1, 2026-08-08) ──────────────
  // 이 파일 머리말이 *"publicView() 를 통과하지 않은 값은 애초에 여기 들어올 수 없다"*
  // 고 적었는데 **거짓이었다** — `options.avatarThumb` 가 그 통로였다. 검수관 실측:
  // 마스터 스위치를 끄면 `publicView` 가 `profileImage: null` 로 명시적으로 지우는데,
  // 썸네일이 그 자리를 채워 "프로필을 비공개로 설정했습니다" 안내와 아바타가 **동시에**
  // 떴다.
  //
  // 실질 유출은 아니다(아야모는 미술관에서 이미 보인다). 그러나 **화면이 스스로
  // 모순되는 말을 하면 사용자는 무엇이 공개인지 판단할 수 없게 된다.** 비공개는
  // 비공개로 보여야 한다 — 그것이 이 카드가 존재하는 이유다.
  const img = mp<HTMLImageElement>(root, 'preview-avatar');
  const fallback = mp(root, 'preview-avatar-fallback');
  const src = view.visible ? (view.profileImage || options.avatarThumb || '') : '';
  if (img) {
    if (src) img.src = src;
    else img.removeAttribute('src'); // 빈 src 는 브라우저가 현재 페이지를 다시 요청한다
    img.alt = src ? `${view.displayName || view.nickname} 프로필 이미지` : '';
    setShown(img, Boolean(src));
  }
  if (fallback) {
    setText(fallback, initialOf(view));
    setShown(fallback, !src);
  }

  // ── 텍스트 ──────────────────────────────────────────────────────────────
  setTextOrHide(mp(root, 'preview-bioshort'), view.bioShort);
  setTextOrHide(mp(root, 'preview-bio'), view.bio);
  setTextOrHide(mp(root, 'preview-location'), view.location);

  // ── 장르 칩 ─────────────────────────────────────────────────────────────
  const genreBox = mp(root, 'preview-genres');
  if (genreBox) {
    clear(genreBox);
    for (const id of view.genres) {
      const chip = genreBox.ownerDocument.createElement('span');
      chip.className = 'mp-chip';
      chip.textContent = GENRE_NAME.get(id) ?? id;
      genreBox.appendChild(chip);
    }
    setShown(genreBox, view.genres.length > 0);
  }

  // ── 링크 ────────────────────────────────────────────────────────────────
  const linkBox = mp(root, 'preview-links');
  if (linkBox) {
    clear(linkBox);
    for (const link of view.links) {
      const a = linkBox.ownerDocument.createElement('a');
      a.className = 'mp-preview-link';
      a.href = link.url;
      a.textContent = link.text;
      a.dataset.platform = link.platform;
      // 새 창 + 참조자 차단. `noopener` 가 없으면 열린 페이지가 `window.opener` 로
      // 우리 탭을 조작할 수 있다(탭내빙). 사용자가 넣은 임의 주소를 여는 자리라
      // 이건 선택이 아니다.
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = PLATFORM_NAME.get(link.platform) ?? link.platform;
      linkBox.appendChild(a);
    }
    setShown(linkBox, view.links.length > 0);
  }

  // ── 문의 버튼 ───────────────────────────────────────────────────────────
  setShown(mp(root, 'preview-inquiry'), view.showInquiry);

  // ── 비어 있음 안내 ──────────────────────────────────────────────────────
  // 비공개일 때는 이것 대신 `preview-private` 이 뜬다. 둘이 같이 뜨면 화면이 두 번
  // 사과하는 꼴이다.
  setShown(mp(root, 'preview-empty'), view.visible && isEmptyPublicView(view));
}
