// world8-boot.ts — world8.html 의 진입점. 캔버스를 찾아 조립을 시작한다.
//
// behind-flag: 이 페이지는 어디에도 링크하지 않는다. 존재가 채택을 뜻하지 않으며,
// 라이브 노출은 감독·팀장 게이트를 거친다.
//
// world8(블렌더를 거친 세계)은 world2 의 **포크**다(분기 근거·정책은 `world8/README.md`).
// world2 파일을 한 줄도 import 하지 않으며, 그 사실은 `tests/world8-independence.test.ts`
// 가 지킨다 — 포크의 존재 이유가 격리이므로 산문이 아니라 검사로 둔다.
//
// ⚠ **열 파일은 이 스크립트가 정하지 않는다** — `<body data-glb>` 가 가리킨다.
// 그래야 「어느 GLB 가 세계인가」가 페이지의 사실로 남고, 스크립트는 그것을 모른다.

import { startWorld8 } from './world8/main.js';

const canvas = document.getElementById('w8-canvas');
if (canvas instanceof HTMLCanvasElement) {
  startWorld8(canvas).catch((err) => {
    // startWorld8은 부팅 실패를 로딩 화면에 표시하고 null을 돌려준다. 여기 오는 건
    // 그보다 바깥의 예외이므로 콘솔에 남긴다 — 조용히 삼키면 원인 추적이 불가능해진다.
    console.error('[world8] 진입 실패', err);
  });
} else {
  console.error('[world8] 캔버스(#w8-canvas)를 찾지 못했습니다');
}
