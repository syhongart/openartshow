// world8-boot.ts — world8.html 의 진입점. 캔버스를 찾아 조립을 시작한다.
//
// behind-flag: 이 페이지는 어디에도 링크하지 않는다. 존재가 채택을 뜻하지 않으며,
// 라이브 노출은 감독·팀장 게이트를 거친다.
//
// world8(블렌더를 거친 세계)은 world2 의 **포크**다(분기 근거·정책은 `world8/README.md`).
// world2 파일을 한 줄도 import 하지 않으며, 그 사실은 `tests/world8-independence.test.ts`
// 의 **`it()` 두 개가 나눠 진다**:
//
//   `it('\`world2/\` 로 향하는 import 가 0 이다 — 포크의 존재 이유')`
//        → **무엇을** 금지하는가
//   `it('**표본이 진입점을 포함한다** — 격리의 첫 관문이 게이트 밖이었다')`
//        → 이 파일이 그 검사의 **사정거리 안에 있는가**
//
// ⚠ **두 번째가 없으면 첫 번째는 통과하면서 이 파일을 안 본다.** 가상의 위험이 아니다 —
// 그 테스트 헤더가 *"처음에는 표본이 `walk(W8)` 뿐이었고 `world8-boot.ts` 는 표본
// 밖이었다"* 를 실제 사고로 적어 둔 자리다(검수관 GS-5). 보증이 여러 단언에 나뉘어
// 있으면 **전부 적는 것**이 관행의 완성형이다(검수관 권고, 2026-08-26).
//
// ⚠ **`it` 제목까지 적는 것이 규율이다**(팀장 조건 2026-08-26). *"이 테스트가 X 를
// 지킨다"* 라고만 쓰면 **파일 이름만 알고 내용을 안 본 채 보증을 주장**하게 된다 —
// `scripts/smoke/config.mjs` 가 이 파일을 지목하며 「world2↔world8 **코드 동일성**을
// 지킨다」고 적었다가 검수관 N4 로 반려됐다. 그 12개 `it()` 은 전부 import 격리·어댑터·
// three 순수성이고 **내용을 비교하는 단언은 0개**다. 제목을 적으려면 파일을 열어야 하고,
// 그 열어봄이 없어서 난 사고다. 백로그 `G-GATE` 의 G-6 이 이것을 검사로 만드는 축이다.
//
// ⚠ **열 파일은 이 스크립트가 정하지 않는다** — `<body data-glb>` 가 가리킨다.
// 그래야 「어느 GLB 가 세계인가」가 페이지의 사실로 남고, 스크립트는 그것을 모른다.

import { startWorld8 } from './world-glb/main.js';

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
