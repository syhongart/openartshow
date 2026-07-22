// main-photo-util.js — 사진 캡처 후처리 순수 유틸: dataURL→Blob 동기 변환,
//   하단 워터마크 합성, canvas 자간 렌더, 공유 URL 산출. 인자(ctx/dataUrl)와
//   window.location 조회만 쓰고 렌더러/scene/전역 상태 미접근. main.js에서 추출.
//   ⚠️ capturePhoto 본체(renderer/scene/camera/mp 결합)는 main.js 잔류(1차 제외).
import { getCanvasFont } from './fonts.js';

// dataURL(base64 PNG) → Blob 동기 변환 — toBlob 콜백 미발화 환경 대응
export function dataUrlToBlob(dataUrl: string): Blob {
  const base64 = dataUrl.split(',')[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

// 캡처 이미지 하단에 그라디언트 + 전시명(좌) + OpenArtShow 브랜드/URL(우) 워터마크를 합성한다.
export function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, galleryName: string): void {
  const bandHeight = Math.max(90, Math.round(h * 0.14));
  const grad = ctx.createLinearGradient(0, h - bandHeight, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - bandHeight, w, bandHeight);

  const pad = Math.max(20, Math.round(w * 0.025));
  // 고해상도(레티나 등) 캡처에서도 워터마크가 같은 비율로 보이도록 캔버스 폭 기준 스케일
  const s = Math.max(1, w / 1400);
  ctx.textBaseline = 'alphabetic';

  // 좌하단 — 전시명
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `300 ${Math.round(18 * s)}px ${getCanvasFont()}`;
  ctx.fillText(galleryName || 'OpenArtShow 전시', pad, h - pad - 6 * s);

  // 우하단 — OpenArtShow(골드, letter-spacing) + 사이트 URL
  ctx.fillStyle = '#5f9e7d';
  ctx.font = `300 ${Math.round(16 * s)}px ${getCanvasFont()}`;
  drawLetterSpacedRight(ctx, 'OpenArtShow', w - pad, h - pad - 22 * s, 2.5 * s);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `300 ${Math.round(12 * s)}px ${getCanvasFont()}`;
  ctx.fillText('syhongart.github.io/openartshow', w - pad, h - pad - 4 * s);
}

// canvas 2D는 표준 letter-spacing을 지원하지 않는 브라우저가 많아, 글자를 하나씩
// 그려서 우측 정렬 기준으로 자간을 직접 적용한다.
function drawLetterSpacedRight(ctx: CanvasRenderingContext2D, text: string, rightX: number, y: number, spacing: number): void {
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((sum, cw) => sum + cw, 0) + spacing * (chars.length - 1);

  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  let x = rightX - total;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

// 공유용 URL — 기본은 현재 주소(#gd= 공유 링크 포함). 해시에 인코딩된 전시 데이터가
// 너무 길면(2000자+) SNS 인텐트/미리보기에서 깨지기 쉬우므로 같은 경로의 landing.html로 대체한다.
export function getShareUrl(): string {
  const href = window.location.href;
  if (href.length < 2000) return href;
  return window.location.origin + window.location.pathname.replace(/index\.html$/, 'landing.html');
}
