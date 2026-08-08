// frontend/js/mypage/boot.ts — mypage.html 의 진입점
//
// `world2-boot.ts`·`studio-main.ts` 와 같은 자리다. HTML 은 `./js/mypage/boot.js` 로
// 참조하고 vite 의 `.js`→`.ts` 폴백이 이 파일로 해소한다(`vite.config.js` 의
// `tsJsFallback`). 확장자를 `.ts` 로 적지 않는 이유는 그 규약이 저장소 전체에 이미
// 깔려 있어서다 — 여기만 다르게 적으면 다음 사람이 둘 중 뭐가 맞는지 알 수 없다.

import { createMyPage } from './app.js';

const root = document.querySelector<HTMLElement>('[data-mp="root"]');
if (root) {
  createMyPage(root);
} else {
  // 계약 위반이다. 조용히 아무 일도 안 일어나면 "화면이 안 움직인다" 는 신고만 남고
  // 원인을 찾는 데 한나절이 든다 — 콘솔에 이유를 남긴다.
  console.error('[mypage] [data-mp="root"] 를 찾지 못했다. 마크업 계약이 깨졌다.');
}
