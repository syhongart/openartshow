// world3-boot.ts — world3.html의 진입점. 캔버스를 찾아 조립을 시작한다.
//
// behind-flag: 이 페이지는 어디에도 링크하지 않는다. 존재가 채택을 뜻하지 않으며,
// 라이브 노출은 감독·팀장 게이트를 거친다.
//
// world3 은 world2 의 **포크**다(분기 근거·정책은 `world3/README.md`). world2 파일을
// 한 줄도 import 하지 않는다 — 그 사실은 `tests/world3-independence.test.ts` 가 지킨다.

import { startWorld3 } from './world3/main.js';

const canvas = document.getElementById('w3-canvas');
if (canvas instanceof HTMLCanvasElement) {
  startWorld3(canvas).catch((err) => {
    // startWorld3는 부팅 실패를 로딩 화면에 표시하고 null을 돌려준다. 여기 오는 건
    // 그보다 바깥의 예외이므로 콘솔에 남긴다 — 조용히 삼키면 원인 추적이 불가능해진다.
    console.error('[world3] 진입 실패', err);
  });
} else {
  console.error('[world3] 캔버스(#w3-canvas)를 찾지 못했습니다');
}
