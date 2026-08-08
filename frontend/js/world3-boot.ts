// world3-boot.ts — world3.html의 진입점. 캔버스를 찾아 조립을 시작한다.
//
// behind-flag: 이 페이지는 어디에도 링크하지 않는다. 존재가 채택을 뜻하지 않으며,
// 라이브 노출은 감독·팀장 게이트를 거친다.
//
// world3 은 world2 의 **포크**다(분기 근거·정책은 `world3/README.md`). world2 파일을
// 한 줄도 import 하지 않는다 — 그 사실은 `tests/world3-independence.test.ts` 가 지킨다.

import { startWorld3 } from './world3/main.js';
import { createVillageBgm } from './world3/audio/village-bgm.js';

// ── 배경음 배선 ────────────────────────────────────────────────────────────
// 월드 부팅과 **독립이다.** 렌더가 실패해도 소리 버튼은 살아 있어야 하고, 반대로
// 소리가 안 되는 브라우저라고 월드가 안 뜰 이유도 없다. 그래서 `startWorld3` 의
// 성공 여부를 기다리지 않고 여기서 바로 붙인다.
const bgmBtn = document.getElementById('w3-bgm');
if (bgmBtn instanceof HTMLButtonElement) {
  const bgm = createVillageBgm();
  bgmBtn.addEventListener('click', () => {
    // `toggle()` 은 제스처 안에서 불려야 `AudioContext.resume()` 이 허용된다 —
    // 클릭 핸들러 안에서 `await` 앞에 두는 것이 그 조건이다.
    void bgm.toggle().then((on) => {
      bgmBtn.dataset.on = on ? '1' : '0';
      bgmBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }).catch((err) => {
      // 소리는 곁들임이라 실패해도 페이지를 세우지 않는다. 다만 조용히 삼키면
      // "눌러도 아무 일이 없다" 의 원인을 못 찾는다.
      console.warn('[world3] 배경음 토글 실패', err);
    });
  });
}

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
