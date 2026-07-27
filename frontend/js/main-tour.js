function createTourController(ctx) {
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
    hideArtworkList
  } = ctx;
  let touring = false;
  let tourIndex = 0;
  let tourAutoOn = true;
  let tourWaiting = false;
  let tourStayElapsed = 0;
  const TOUR_STAY_SECONDS = 6;
  function updateTourBar(art) {
    showTourBar({
      index: tourIndex,
      // ui.js가 0-based를 받아 +1하여 표시한다 (계약)
      total: getPlacedArtworks().length,
      title: art ? art.title || "" : "",
      autoOn: tourAutoOn
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
    setDockActive("tour", true);
    tourAutoOn = true;
    getPlayer().disable();
    goToTourIndex(0);
  }
  function exitTour() {
    if (!touring) return;
    touring = false;
    setDockActive("tour", false);
    tourWaiting = false;
    clearTween();
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
  function syncOnSelect(art) {
    const idx = getPlacedArtworks().indexOf(art);
    if (idx !== -1) tourIndex = idx;
    tourWaiting = false;
  }
  function onArrive(art) {
    updateTourBar(art);
    tourWaiting = true;
    tourStayElapsed = 0;
  }
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
    getIndex: () => tourIndex
  };
}
export {
  createTourController
};
