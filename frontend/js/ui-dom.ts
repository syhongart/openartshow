// frontend/js/ui-dom.ts — 저수준 DOM/CSS 헬퍼 (ui.js 분해 C-1 단계1)
// 순수 무상태: el() DOM 빌더 + GOLD 브랜드 상수. (CSS 는 css/gallery.css 로 나갔다)
// ui.js에서 로직·값·CSS 텍스트 무변경으로 통째 이동(export만 추가, el에 최소 시그니처).
// [리졸브] vite.config의 .js→.ts 폴백(감독 B안)이 소비자의 확장자 명시 .js import를
// 대응 .ts로 해소하므로, ui.js의 import는 './ui-dom.js' 그대로 유지한다.

export const GOLD = '#5f9e7d'; // 브랜드 액센트 — 청자(비취) 그린 (2026-07-12 감독 결정, 구 골드)

// ---------------------------------------------------------------------------
// CSS 주입 — 여기 없다. frontend/css/gallery.css 다.
// ---------------------------------------------------------------------------
// 이 자리에 injectStyles() 가 CSS 1,665줄을 JS 템플릿 문자열로 들고 있었고, 런타임에
// <style id="lu-styles"> 를 만들어 head 에 꽂았다. index.html 의 <link> 로 옮긴 이유는
// 성능이 아니라 **만질 수 있게 하기 위해서**다 — .ts 안 문자열은 디자이너가 못 열고,
// tokens.css 체계와 이어붙일 수도 없다. 옮기면서 룩은 한 줄도 바꾸지 않았다(시각 무변경이
// 이 단계의 합격 조건이다. 룩 변경과 섞으면 회귀가 났을 때 원인을 못 가른다).
//
// GOLD 는 아래 export 로 남는다 — ui-avatar-editor.ts 가 three 머티리얼 색으로 쓰는데,
// 그건 CSS 가 닿지 않는 자리다.

// ---------------------------------------------------------------------------
// DOM 빌드 헬퍼
// ---------------------------------------------------------------------------
export function el(
  tag: string,
  props: Record<string, string> = {},
  children: Node[] = [],
): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'className') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) node.appendChild(child);
  return node;
}
