// @ts-nocheck — main.js 분해 2차: DOM 이벤트 핸들러 모듈화. strict 타입은 후속.
// main-events.js — DOM 이벤트 핸들러(onKeyDown·onWindowResize·onBeforeUnload)를
//   main.js에서 추출. 순수 이동이 아니라 "핸들러 로직 모듈화 + ctx 주입" 방식:
//   재대입되는 module-scope let(camera·renderer·mp·entered·touring)은 값 캡처가
//   아니라 ctx의 getter로 매 호출 읽어 stale 참조를 원천 차단한다.
//   리스너 등록(addEventListener)은 전부 main.js에 잔류 — 여기선 구현만 제공한다.
//   ⚠️ viewCurrentArtwork·capturePhoto·toggleSelfView·toggleTour·exitTour 등
//   "기능 컨트롤러"는 main.js에 그대로 두고 ctx로 참조만 받는다(3차 이동 대상).
//   키 매핑·조건·분기 순서, 리사이즈 계산, 언로드 정리 순서는 원본과 1바이트 동일.
export function createEventHandlers(ctx) {
  // 키보드 단축키 디스패처
  function onKeyDown(e) {
    if (e.code === 'KeyE') {
      ctx.viewCurrentArtwork();
      return;
    }

    if (e.code === 'KeyM') {
      if (!ctx.isEntered() || ctx.isLightboxOpen()) return;
      ctx.toggleArtworkList();
      return;
    }

    if (e.code === 'KeyT') {
      if (!ctx.isEntered()) return;
      ctx.toggleTour();
      return;
    }

    if (e.code === 'KeyG') {
      if (!ctx.isEntered() || ctx.isLightboxOpen()) return;
      ctx.toggleGuestbook();
      return;
    }

    if (e.code === 'KeyP') {
      // 라이트박스/투어 중에도 촬영 허용 — 캔버스에는 DOM UI가 찍히지 않으므로
      // 지금 보이는 3D 화면 그대로 캡처된다. 공유 모달이 열려 있을 때만 막는다.
      if (!ctx.isEntered() || ctx.isShareModalOpen()) return;
      ctx.flashShutter();
      ctx.capturePhoto();
      return;
    }

    if (e.code === 'KeyV') {
      if (!ctx.isEntered() || ctx.isShareModalOpen()) return;
      ctx.toggleSelfView();
      return;
    }

    if (ctx.isTouring() && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
      if (ctx.isLightboxOpen()) return;
      e.preventDefault();
      if (e.code === 'ArrowLeft') ctx.tourPrev();
      else ctx.tourNext();
      return;
    }

    if (e.code === 'Escape') {
      // 라이트박스/작품목록/방명록은 ui.js가 자체 ESC 핸들러로 닫는다. 셋 다 닫혀 있을 때만
      // 투어 종료를 담당한다 (ui.js ESC 우선순위 규약과 합치).
      if (ctx.isTouring() && !ctx.isLightboxOpen() && !ctx.isArtworkListOpen() && !ctx.isGuestbookOpen()) {
        ctx.exitTour();
      }
    }
  }

  // 카메라 aspect·renderer 크기 갱신 — camera·renderer는 init 시점 재대입 let이라 getter로 읽는다.
  function onWindowResize() {
    const camera = ctx.getCamera();
    const renderer = ctx.getRenderer();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // 페이지 이탈 시 피어 연결 정리 — mp는 입장 시 재대입 let이라 getter로 읽는다.
  function onBeforeUnload() {
    const mp = ctx.getMp();
    if (mp) {
      try {
        mp.dispose();
      } catch (_) {
        /* 무시 */
      }
    }
  }

  return { onKeyDown, onWindowResize, onBeforeUnload };
}
