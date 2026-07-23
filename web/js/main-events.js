function createEventHandlers(ctx) {
  function onKeyDown(e) {
    if (e.code === "KeyE") {
      ctx.viewCurrentArtwork();
      return;
    }
    if (e.code === "KeyM") {
      if (!ctx.isEntered() || ctx.isLightboxOpen()) return;
      ctx.toggleArtworkList();
      return;
    }
    if (e.code === "KeyT") {
      if (!ctx.isEntered()) return;
      ctx.toggleTour();
      return;
    }
    if (e.code === "KeyG") {
      if (!ctx.isEntered() || ctx.isLightboxOpen()) return;
      ctx.toggleGuestbook();
      return;
    }
    if (e.code === "KeyP") {
      if (!ctx.isEntered() || ctx.isShareModalOpen()) return;
      ctx.flashShutter();
      ctx.capturePhoto();
      return;
    }
    if (e.code === "KeyV") {
      if (!ctx.isEntered() || ctx.isShareModalOpen()) return;
      ctx.toggleSelfView();
      return;
    }
    if (ctx.isTouring() && (e.code === "ArrowLeft" || e.code === "ArrowRight")) {
      if (ctx.isLightboxOpen()) return;
      e.preventDefault();
      if (e.code === "ArrowLeft") ctx.tourPrev();
      else ctx.tourNext();
      return;
    }
    if (e.code === "Escape") {
      if (ctx.isTouring() && !ctx.isLightboxOpen() && !ctx.isArtworkListOpen() && !ctx.isGuestbookOpen()) {
        ctx.exitTour();
      }
    }
  }
  function onWindowResize() {
    const camera = ctx.getCamera();
    const renderer = ctx.getRenderer();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  function onBeforeUnload() {
    const mp = ctx.getMp();
    if (mp) {
      try {
        mp.dispose();
      } catch (_) {
      }
    }
  }
  return { onKeyDown, onWindowResize, onBeforeUnload };
}
export {
  createEventHandlers
};
