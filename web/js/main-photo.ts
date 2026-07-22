// main-photo.js — capturePhoto(현재 3D 화면 캡처 → 비네팅·워터마크 합성 → 포토월
//   전파 → 공유 모달)를 main.js에서 추출. 2차(main-events.js)와 동일한 ctx 주입 방식:
//   재대입되는 module-scope let(renderer·scene·camera·thirdPerson·selfAvatar·
//   galleryInfo·myNickname·mp)은 값 캡처가 아니라 ctx의 getter로 매 호출 읽어
//   stale 참조를 원천 차단한다. 안정 참조(photoWall·함수)는 값으로 주입받는다.
//   순수 후처리 leaf(drawWatermark·dataUrlToBlob·getShareUrl)는 main-photo-util에서
//   직접 import한다(ctx 경유 불필요). 캡처 파이프라인 로직은 원본과 1바이트 동일.
//   ⚠️ 주입 param을 ctx로 두면 img.onload 안의 canvas 2D 컨텍스트 지역변수 ctx와
//   이름이 충돌(그림자)하므로, 최상단에서 구조분해해 접근자를 별도 심볼로 고정한다.
import { dataUrlToBlob, drawWatermark, getShareUrl } from './main-photo-util.js';

// main.js의 photoCtx가 주입하는 계약(사용 멤버만 최소 선언 — three/config 구상 타입 비의존).
interface PhotoRenderer {
  domElement: { toDataURL(type?: string): string };
  render(scene: object, camera: object): void;
}
interface PhotoCtx {
  getRenderer(): PhotoRenderer | null;
  getScene(): object | null;
  getCamera(): object | null;
  isThirdPerson(): boolean;
  getSelfAvatar(): unknown;
  applySelfCamOffset(): void;
  restoreSelfCamOffset(): void;
  getGalleryInfo(): { name: string } | null;
  photoWall: { addLocal(nickname: string, galleryName: string, thumb: string): unknown };
  getMyNickname(): string;
  getMp(): { sendPhoto(item: unknown): void } | null;
  showShareModal(payload: { blob: Blob; dataUrl: string; galleryName: string; shareUrl: string }): void;
  setStatus(msg: string): void;
}

export function createPhotoController(ctx: PhotoCtx) {
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
    setStatus,
  } = ctx;

  // 현재 3D 화면을 캡처해 워터마크를 합성한 뒤 공유 모달을 연다.
  // WebGL 컨텍스트는 preserveDrawingBuffer:false이므로, renderer.render() 직후
  // 같은 동기 흐름 안에서 toDataURL을 호출해야 화면이 지워지기 전에 픽셀을 읽을 수 있다.
  function capturePhoto() {
    const renderer = getRenderer();
    const scene = getScene();
    const camera = getCamera();
    if (!renderer || !scene || !camera) return;
    try {
      if (isThirdPerson() && getSelfAvatar()) applySelfCamOffset();
      renderer.render(scene, camera);
      if (isThirdPerson() && getSelfAvatar()) restoreSelfCamOffset();
      const rawDataUrl = renderer.domElement.toDataURL('image/png');

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        // 화면과 동일한 비네팅을 사진에도 — 라이브 무드 그대로 저장
        const vg = ctx.createRadialGradient(
          canvas.width / 2, canvas.height * 0.46, Math.min(canvas.width, canvas.height) * 0.4,
          canvas.width / 2, canvas.height * 0.46, Math.max(canvas.width, canvas.height) * 0.72
        );
        vg.addColorStop(0, 'rgba(8,6,4,0)');
        vg.addColorStop(0.24, 'rgba(8,6,4,0.03)');
        vg.addColorStop(0.44, 'rgba(8,6,4,0.09)');
        vg.addColorStop(0.64, 'rgba(8,6,4,0.17)');
        vg.addColorStop(0.82, 'rgba(8,6,4,0.26)');
        vg.addColorStop(1, 'rgba(8,6,4,0.34)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawWatermark(ctx, canvas.width, canvas.height, getGalleryInfo() ? getGalleryInfo()!.name : '');

        // canvas.toBlob은 일부 환경에서 콜백이 오지 않는 사례가 있어,
        // 어차피 미리보기용으로 만드는 dataURL에서 동기적으로 Blob을 만든다.
        const outDataUrl = canvas.toDataURL('image/png');

        // 포토월 썸네일(360px JPEG) — 랜딩 피드 + 같은 방 전원에게 전파
        try {
          const tw = 360;
          const th = Math.round((canvas.height / canvas.width) * tw);
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = tw;
          thumbCanvas.height = th;
          // @ts-expect-error 원본 무변경 보존: getContext('2d')는 CanvasRenderingContext2D|null이나
          //   원본은 null 가드 없이 즉시 .drawImage 호출(진짜 결함 — 로직 수정 금지 조건이라 타입만 유예).
          thumbCanvas.getContext('2d').drawImage(canvas, 0, 0, tw, th);
          const thumb = thumbCanvas.toDataURL('image/jpeg', 0.72);
          const item = photoWall.addLocal(getMyNickname(), getGalleryInfo() ? getGalleryInfo()!.name : '', thumb);
          if (item && getMp()) getMp()!.sendPhoto(item);
        } catch (err) {
          console.warn('포토월 썸네일 생성 실패 (캡처 자체는 정상):', err);
        }
        showShareModal({
          blob: dataUrlToBlob(outDataUrl),
          dataUrl: outDataUrl,
          galleryName: (getGalleryInfo() && getGalleryInfo()!.name) || 'OpenArtShow 전시',
          shareUrl: getShareUrl(),
        });
      };
      img.onerror = () => {
        setStatus('사진 촬영에 실패했습니다.');
      };
      img.src = rawDataUrl;
    } catch (err) {
      console.error('사진 촬영 실패:', err);
      setStatus('사진 촬영에 실패했습니다.');
    }
  }

  return { capturePhoto };
}
