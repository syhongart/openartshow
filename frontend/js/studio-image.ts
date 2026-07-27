// @ts-nocheck — C단계 C-2 S2: studio-main IIFE에서 순수 이동(로직 1바이트 불변).
// 무상태 — 콜백(onOk/onFail·uploadCb)만. 모달 DOM은 모듈 내부 최초 1회 생성(싱글턴).
//
// ── 작품 이미지: 외부 URL → 브라우저 내장(dataURL) · 실패 시 직접 업로드 폴백 ──
// builder.html의 canvas 내장 블록(최대 1400px·매트 #efece6·JPEG 0.85)을 studio에 이식.
// 목적: 원본 URL이 사라져도 전시가 유지되고, 관람객 접속 정보가 외부 호스트로 새지 않음(프라이버시).

var IMG_MAX = 1400, IMG_MATTE = '#efece6';
export var INFO_TEXT = '이미지 주소를 넣으면 그림을 내려받아 전시 데이터에 함께 담아요. 원본이 사라져도 전시가 그대로 유지되고, 관람객의 접속 정보가 바깥 사이트로 새지 않게 지켜줍니다.';
export var FAIL_TEXT = '이 이미지는 자동으로 가져올 수 없어요(그림이 있는 사이트가 외부 저장을 막아둔 경우예요). 아래 ‘직접 업로드’로 파일을 올려 주세요.';

export function embedFromImageEl(img) {
  // 성공 시 {dataURL, ar} 반환. tainted(CORS 거부) canvas면 toDataURL이 throw → 호출부 catch.
  var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  var scale = Math.min(1, IMG_MAX / Math.max(iw, ih, 1));
  var w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
  var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  var ctx = cv.getContext('2d');
  ctx.fillStyle = IMG_MATTE; ctx.fillRect(0, 0, w, h); // 투명 PNG 매트 프리필(space-render와 동일)
  ctx.drawImage(img, 0, 0, w, h);
  var dataURL = cv.toDataURL('image/jpeg', 0.85); // tainted면 SecurityError throw
  return { dataURL: dataURL, ar: iw / ih };
}
export function downloadImageToDataURL(url, onOk, onFail) {
  var img = new Image(), done = false; // onload/onerror 중복 발화 방어(콜백 1회 보장)
  img.crossOrigin = 'anonymous'; // CORS 허용 서버여야 canvas 내장 가능
  img.onload = function () { if (done) return; done = true; try { onOk(embedFromImageEl(img)); } catch (e) { onFail('tainted'); } };
  img.onerror = function () { if (done) return; done = true; onFail('load'); }; // 404·CSP·네트워크·CORS 거부
  img.src = url;
}
export function fileToDataURL(file, onOk, onFail) {
  var reader = new FileReader();
  reader.onload = function () {
    var img = new Image(), done = false;
    img.onload = function () { if (done) return; done = true; try { onOk(embedFromImageEl(img)); } catch (e) { onFail('tainted'); } };
    img.onerror = function () { if (done) return; done = true; onFail('decode'); };
    img.src = reader.result;
  };
  reader.onerror = function () { onFail('read'); };
  reader.readAsDataURL(file);
}

// 공용 모달(도움말 · 실패 안내) — DOM은 최초 1회 JS로 생성(CSP: 인라인 핸들러 없음, addEventListener만).
var _modal = null, _modalUploadCb = null;
function ensureModal() {
  if (_modal) return _modal;
  var ov = document.createElement('div'); ov.className = 'img-modal-overlay';
  var box = document.createElement('div'); box.className = 'img-modal';
  var title = document.createElement('div'); title.className = 'img-modal-title';
  var bodyEl = document.createElement('div'); bodyEl.className = 'img-modal-body';
  var actions = document.createElement('div'); actions.className = 'img-modal-actions';
  var upBtn = document.createElement('button'); upBtn.type = 'button'; upBtn.className = 'btn-up'; upBtn.textContent = '직접 업로드';
  var closeBtn = document.createElement('button'); closeBtn.type = 'button'; closeBtn.className = 'btn-close'; closeBtn.textContent = '닫기';
  upBtn.addEventListener('click', function () { var cb = _modalUploadCb; hideModal(); if (cb) cb(); });
  closeBtn.addEventListener('click', hideModal);
  ov.addEventListener('click', function (e) { if (e.target === ov) hideModal(); });
  actions.appendChild(upBtn); actions.appendChild(closeBtn);
  box.appendChild(title); box.appendChild(bodyEl); box.appendChild(actions);
  ov.appendChild(box); document.body.appendChild(ov);
  _modal = { ov: ov, title: title, body: bodyEl, upBtn: upBtn };
  return _modal;
}
export function showModal(titleText, bodyText, uploadCb) {
  var m = ensureModal();
  m.title.textContent = titleText;
  m.body.textContent = bodyText;
  m.upBtn.style.display = uploadCb ? '' : 'none';
  _modalUploadCb = uploadCb || null;
  m.ov.style.display = 'flex';
}
export function hideModal() { if (_modal) _modal.ov.style.display = 'none'; _modalUploadCb = null; }
