// @ts-nocheck — main.js 분해 3차: 도슨트(투어) 컨트롤러 모듈화. strict 타입은 후속.
// main-tour.js — 도슨트 투어를 main.js에서 추출. 사진 군(main-photo.js, 격리 단발
//   함수)과 달리 투어는 animate 게임루프에 매 프레임 결합돼 있어 "상태 소유권 이전"
//   방식으로 분리한다: 투어 상태 5개(touring·tourIndex·tourAutoOn·tourWaiting·
//   tourStayElapsed)와 임계 상수 TOUR_STAY_SECONDS를 이 클로저가 SSOT로 소유하고,
//   게임루프는 tick(delta) 한 줄로 위임한다. main.js에는 해당 let이 남지 않는다.
//
//   ctx 주입 규율(사진 군과 동일): 재대입되는 module-scope let(placedArtworks·player·
//   entered·tween)은 값 캡처가 아니라 ctx의 getter로 매 호출 읽어 stale 참조를 원천
//   차단한다. 안정 참조(startTween·getViewingPose·showTourBar/hideTourBar·setDockActive·
//   isLightboxOpen·isArtworkListOpen·hideArtworkList)는 값으로 주입받는다.
//
//   tween은 컨트롤러가 소유하지 않는다(트윈 파이프라인은 main.js 소유). 읽기는
//   getTween() getter, exitTour의 즉시정지(tween=null 대입)는 clearTween() 위임으로
//   처리한다 — tick 판정식은 원본 animate 블록과 1바이트 동치를 유지한다.

export function createTourController(ctx) {
  const {
    getPlacedArtworks,
    getPlayer,
    isEntered,
    getTween,
    clearTween,
    startTween,
    getViewingPose,
    showTourBar,
    hideTourBar,
    setDockActive,
    isLightboxOpen,
    isArtworkListOpen,
    hideArtworkList,
  } = ctx;

  // --- 투어 상태 SSOT (main.js에서 이전) ---
  let touring = false;
  let tourIndex = 0;
  let tourAutoOn = true;
  let tourWaiting = false; // 목적지 도착 후 머무름 카운트 중인지
  let tourStayElapsed = 0;
  const TOUR_STAY_SECONDS = 6;

  function updateTourBar(art) {
    showTourBar({
      index: tourIndex, // ui.js가 0-based를 받아 +1하여 표시한다 (계약)
      total: getPlacedArtworks().length,
      title: art ? art.title || '' : '',
      autoOn: tourAutoOn,
    });
  }

  function goToTourIndex(index) {
    const art = getPlacedArtworks()[index];
    if (!art) return;
    tourIndex = index;
    tourWaiting = false;
    tourStayElapsed = 0;
    updateTourBar(art);
    const pose = getViewingPose(art);
    startTween(pose, () => {
      getPlayer().setPose(pose);
      tourWaiting = true;
      tourStayElapsed = 0;
    });
  }

  function startTour() {
    if (!isEntered() || isLightboxOpen() || touring) return;
    const arts = getPlacedArtworks();
    if (!arts || arts.length === 0) return;
    if (isArtworkListOpen()) hideArtworkList();
    touring = true;
    setDockActive('tour', true);
    tourAutoOn = true;
    getPlayer().disable();
    goToTourIndex(0);
  }

  function exitTour() {
    if (!touring) return;
    touring = false;
    setDockActive('tour', false);
    tourWaiting = false;
    clearTween(); // 이동 중이었다면 현재 카메라 위치에서 즉시 정지
    hideTourBar();
    const player = getPlayer();
    const state = player.getState();
    player.setPose({ x: state.x, z: state.z, ry: state.ry });
    if (isEntered() && !isLightboxOpen()) player.enable();
  }

  function toggleTour() {
    if (touring) exitTour();
    else startTour();
  }

  function next() {
    const arts = getPlacedArtworks();
    if (!touring || arts.length === 0) return;
    goToTourIndex((tourIndex + 1) % arts.length);
  }

  function prev() {
    const arts = getPlacedArtworks();
    if (!touring || arts.length === 0) return;
    goToTourIndex((tourIndex - 1 + arts.length) % arts.length);
  }

  function toggleAuto() {
    if (!touring) return;
    tourAutoOn = !tourAutoOn;
    tourStayElapsed = 0;
    updateTourBar(getPlacedArtworks()[tourIndex]);
  }

  // 작품 선택(작품 목록 카드 클릭) 공통 경로에서 투어 중일 때의 협조.
  // handleArtworkSelect가 startTween 호출 "전"에 인덱스·대기상태를 맞춘다.
  function syncOnSelect(art) {
    const idx = getPlacedArtworks().indexOf(art);
    if (idx !== -1) tourIndex = idx;
    tourWaiting = false;
  }

  // 위 startTween 도착 콜백에서 투어 중일 때 머무름 카운트를 새로 시작한다.
  function onArrive(art) {
    updateTourBar(art);
    tourWaiting = true;
    tourStayElapsed = 0;
  }

  // 게임루프 위임 — animate 매 프레임 호출. 판정식은 원본과 1바이트 동치:
  //   touring && tourWaiting && tourAutoOn && !tween && !isLightboxOpen()
  // tween·isLightboxOpen만 컨트롤러 비소유(ctx 주입). 프레임 안에서 할당·객체 생성 없음.
  function tick(delta) {
    if (touring && tourWaiting && tourAutoOn && !getTween() && !isLightboxOpen()) {
      tourStayElapsed += delta;
      if (tourStayElapsed >= TOUR_STAY_SECONDS) {
        next();
      }
    }
  }

  return {
    tick,
    startTour,
    exitTour,
    toggleTour,
    next,
    prev,
    toggleAuto,
    syncOnSelect,
    onArrive,
    isTouring: () => touring,
    getIndex: () => tourIndex,
  };
}
