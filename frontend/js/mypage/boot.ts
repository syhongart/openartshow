// frontend/js/mypage/boot.ts — mypage.html 의 진입점
//
// `world2-boot.ts`·`studio-main.ts` 와 같은 자리다. HTML 은 `./js/mypage/boot.js` 로
// 참조하고 vite 의 `.js`→`.ts` 폴백이 이 파일로 해소한다(`vite.config.js` 의
// `tsJsFallback`). 확장자를 `.ts` 로 적지 않는 이유는 그 규약이 저장소 전체에 이미
// 깔려 있어서다 — 여기만 다르게 적으면 다음 사람이 둘 중 뭐가 맞는지 알 수 없다.

import { createMyPage } from './app.js';
// 키 배선은 **별도 leaf** 다 — `app.ts` 에 넣으면 키를 만지는 코드가 프로필 스키마·발행
// 경로와 같은 모듈에 살게 되고, 언젠가 누군가 "이왕 여기 있으니" 하고 직렬화에 태운다.
import { wireGeminiPanel } from './gemini-panel.js';

const root = document.querySelector<HTMLElement>('[data-mp="root"]');
if (root) {
  createMyPage(root);
  // 프로필 렌더와 **독립**이다. 키 배선이 실패해도 마이페이지 본체는 산다
  // (`escapeHtml` 스코프 사고로 내비게이션을 통째로 잃은 뒤 세운 원칙).
  try {
    wireGeminiPanel(document);
  } catch (e) {
    console.warn('[mypage] Gemini 키 입력란을 배선하지 못했다', e);
  }
} else {
  // 계약 위반이다. 조용히 아무 일도 안 일어나면 "화면이 안 움직인다" 는 신고만 남고
  // 원인을 찾는 데 한나절이 든다 — 콘솔에 이유를 남긴다.
  console.error('[mypage] [data-mp="root"] 를 찾지 못했다. 마크업 계약이 깨졌다.');
}
