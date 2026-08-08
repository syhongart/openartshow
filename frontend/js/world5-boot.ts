// world5-boot.ts — world5.html의 진입점. 캔버스를 찾아 조립을 시작한다.
//
// behind-flag: 이 페이지는 어디에도 링크하지 않는다. 존재가 채택을 뜻하지 않으며,
// 라이브 노출은 감독·팀장 게이트를 거친다.
//
// world5(갤러리 스트리트)는 world2 의 **포크**다(분기 근거·정책은 `world5/README.md`).
// world2 파일을 한 줄도 import 하지 않으며, 그 사실은 `tests/world5-independence.test.ts`
// 가 지킨다 — 포크의 존재 이유가 격리이므로 산문이 아니라 검사로 둔다.

import { startWorld5 } from './world5/main.js';

const canvas = document.getElementById('w5-canvas');
if (canvas instanceof HTMLCanvasElement) {
  startWorld5(canvas).catch((err) => {
    // startWorld5는 부팅 실패를 로딩 화면에 표시하고 null을 돌려준다. 여기 오는 건
    // 그보다 바깥의 예외이므로 콘솔에 남긴다 — 조용히 삼키면 원인 추적이 불가능해진다.
    console.error('[world5] 진입 실패', err);
  });
} else {
  console.error('[world5] 캔버스(#w5-canvas)를 찾지 못했습니다');
}
