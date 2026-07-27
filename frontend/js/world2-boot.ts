// world2-boot.ts — world2.html의 진입점. 캔버스를 찾아 조립을 시작한다.
//
// behind-flag: 이 페이지는 어디에도 링크하지 않는다. 존재가 채택을 뜻하지 않으며,
// 라이브 노출은 감독·팀장 게이트를 거친다.

import { startWorld2 } from './world2/main.js';

const canvas = document.getElementById('w2-canvas');
if (canvas instanceof HTMLCanvasElement) {
  startWorld2(canvas).catch((err) => {
    // startWorld2는 부팅 실패를 로딩 화면에 표시하고 null을 돌려준다. 여기 오는 건
    // 그보다 바깥의 예외이므로 콘솔에 남긴다 — 조용히 삼키면 원인 추적이 불가능해진다.
    console.error('[world2] 진입 실패', err);
  });
} else {
  console.error('[world2] 캔버스(#w2-canvas)를 찾지 못했습니다');
}
