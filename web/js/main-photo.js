import { dataUrlToBlob, drawWatermark, getShareUrl } from "./main-photo-util.js";
function createPhotoController(ctx) {
  const {
    getRenderer,
    getScene,
    getCamera,
    isThirdPerson,
    getSelfAvatar,
    applySelfCamOffset,
    restoreSelfCamOffset,
    getGalleryInfo,
    photoWall,
    getMyNickname,
    getMp,
    showShareModal,
    setStatus
  } = ctx;
  function capturePhoto() {
    const renderer = getRenderer();
    const scene = getScene();
    const camera = getCamera();
    if (!renderer || !scene || !camera) return;
    try {
      if (isThirdPerson() && getSelfAvatar()) applySelfCamOffset();
      renderer.render(scene, camera);
      if (isThirdPerson() && getSelfAvatar()) restoreSelfCamOffset();
      const rawDataUrl = renderer.domElement.toDataURL("image/png");
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx2 = canvas.getContext("2d");
        if (!ctx2) return;
        ctx2.drawImage(img, 0, 0);
        const vg = ctx2.createRadialGradient(
          canvas.width / 2,
          canvas.height * 0.46,
          Math.min(canvas.width, canvas.height) * 0.4,
          canvas.width / 2,
          canvas.height * 0.46,
          Math.max(canvas.width, canvas.height) * 0.72
        );
        vg.addColorStop(0, "rgba(8,6,4,0)");
        vg.addColorStop(0.24, "rgba(8,6,4,0.03)");
        vg.addColorStop(0.44, "rgba(8,6,4,0.09)");
        vg.addColorStop(0.64, "rgba(8,6,4,0.17)");
        vg.addColorStop(0.82, "rgba(8,6,4,0.26)");
        vg.addColorStop(1, "rgba(8,6,4,0.34)");
        ctx2.fillStyle = vg;
        ctx2.fillRect(0, 0, canvas.width, canvas.height);
        drawWatermark(ctx2, canvas.width, canvas.height, getGalleryInfo() ? getGalleryInfo().name : "");
        const outDataUrl = canvas.toDataURL("image/png");
        try {
          const tw = 360;
          const th = Math.round(canvas.height / canvas.width * tw);
          const thumbCanvas = document.createElement("canvas");
          thumbCanvas.width = tw;
          thumbCanvas.height = th;
          thumbCanvas.getContext("2d").drawImage(canvas, 0, 0, tw, th);
          const thumb = thumbCanvas.toDataURL("image/jpeg", 0.72);
          const item = photoWall.addLocal(getMyNickname(), getGalleryInfo() ? getGalleryInfo().name : "", thumb);
          if (item && getMp()) getMp().sendPhoto(item);
        } catch (err) {
          console.warn("\uD3EC\uD1A0\uC6D4 \uC378\uB124\uC77C \uC0DD\uC131 \uC2E4\uD328 (\uCEA1\uCC98 \uC790\uCCB4\uB294 \uC815\uC0C1):", err);
        }
        showShareModal({
          blob: dataUrlToBlob(outDataUrl),
          dataUrl: outDataUrl,
          galleryName: getGalleryInfo() && getGalleryInfo().name || "OpenArtShow \uC804\uC2DC",
          shareUrl: getShareUrl()
        });
      };
      img.onerror = () => {
        setStatus("\uC0AC\uC9C4 \uCD2C\uC601\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      };
      img.src = rawDataUrl;
    } catch (err) {
      console.error("\uC0AC\uC9C4 \uCD2C\uC601 \uC2E4\uD328:", err);
      setStatus("\uC0AC\uC9C4 \uCD2C\uC601\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    }
  }
  return { capturePhoto };
}
export {
  createPhotoController
};
