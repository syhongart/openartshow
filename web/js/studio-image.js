var IMG_MAX = 1400, IMG_MATTE = "#efece6";
var INFO_TEXT = "\uC774\uBBF8\uC9C0 \uC8FC\uC18C\uB97C \uB123\uC73C\uBA74 \uADF8\uB9BC\uC744 \uB0B4\uB824\uBC1B\uC544 \uC804\uC2DC \uB370\uC774\uD130\uC5D0 \uD568\uAED8 \uB2F4\uC544\uC694. \uC6D0\uBCF8\uC774 \uC0AC\uB77C\uC838\uB3C4 \uC804\uC2DC\uAC00 \uADF8\uB300\uB85C \uC720\uC9C0\uB418\uACE0, \uAD00\uB78C\uAC1D\uC758 \uC811\uC18D \uC815\uBCF4\uAC00 \uBC14\uAE65 \uC0AC\uC774\uD2B8\uB85C \uC0C8\uC9C0 \uC54A\uAC8C \uC9C0\uCF1C\uC90D\uB2C8\uB2E4.";
var FAIL_TEXT = "\uC774 \uC774\uBBF8\uC9C0\uB294 \uC790\uB3D9\uC73C\uB85C \uAC00\uC838\uC62C \uC218 \uC5C6\uC5B4\uC694(\uADF8\uB9BC\uC774 \uC788\uB294 \uC0AC\uC774\uD2B8\uAC00 \uC678\uBD80 \uC800\uC7A5\uC744 \uB9C9\uC544\uB454 \uACBD\uC6B0\uC608\uC694). \uC544\uB798 \u2018\uC9C1\uC811 \uC5C5\uB85C\uB4DC\u2019\uB85C \uD30C\uC77C\uC744 \uC62C\uB824 \uC8FC\uC138\uC694.";
function embedFromImageEl(img) {
  var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  var scale = Math.min(1, IMG_MAX / Math.max(iw, ih, 1));
  var w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
  var cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  var ctx = cv.getContext("2d");
  ctx.fillStyle = IMG_MATTE;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  var dataURL = cv.toDataURL("image/jpeg", 0.85);
  return { dataURL, ar: iw / ih };
}
function downloadImageToDataURL(url, onOk, onFail) {
  var img = new Image(), done = false;
  img.crossOrigin = "anonymous";
  img.onload = function() {
    if (done) return;
    done = true;
    try {
      onOk(embedFromImageEl(img));
    } catch (e) {
      onFail("tainted");
    }
  };
  img.onerror = function() {
    if (done) return;
    done = true;
    onFail("load");
  };
  img.src = url;
}
function fileToDataURL(file, onOk, onFail) {
  var reader = new FileReader();
  reader.onload = function() {
    var img = new Image(), done = false;
    img.onload = function() {
      if (done) return;
      done = true;
      try {
        onOk(embedFromImageEl(img));
      } catch (e) {
        onFail("tainted");
      }
    };
    img.onerror = function() {
      if (done) return;
      done = true;
      onFail("decode");
    };
    img.src = reader.result;
  };
  reader.onerror = function() {
    onFail("read");
  };
  reader.readAsDataURL(file);
}
var _modal = null, _modalUploadCb = null;
function ensureModal() {
  if (_modal) return _modal;
  var ov = document.createElement("div");
  ov.className = "img-modal-overlay";
  var box = document.createElement("div");
  box.className = "img-modal";
  var title = document.createElement("div");
  title.className = "img-modal-title";
  var bodyEl = document.createElement("div");
  bodyEl.className = "img-modal-body";
  var actions = document.createElement("div");
  actions.className = "img-modal-actions";
  var upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.className = "btn-up";
  upBtn.textContent = "\uC9C1\uC811 \uC5C5\uB85C\uB4DC";
  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn-close";
  closeBtn.textContent = "\uB2EB\uAE30";
  upBtn.addEventListener("click", function() {
    var cb = _modalUploadCb;
    hideModal();
    if (cb) cb();
  });
  closeBtn.addEventListener("click", hideModal);
  ov.addEventListener("click", function(e) {
    if (e.target === ov) hideModal();
  });
  actions.appendChild(upBtn);
  actions.appendChild(closeBtn);
  box.appendChild(title);
  box.appendChild(bodyEl);
  box.appendChild(actions);
  ov.appendChild(box);
  document.body.appendChild(ov);
  _modal = { ov, title, body: bodyEl, upBtn };
  return _modal;
}
function showModal(titleText, bodyText, uploadCb) {
  var m = ensureModal();
  m.title.textContent = titleText;
  m.body.textContent = bodyText;
  m.upBtn.style.display = uploadCb ? "" : "none";
  _modalUploadCb = uploadCb || null;
  m.ov.style.display = "flex";
}
function hideModal() {
  if (_modal) _modal.ov.style.display = "none";
  _modalUploadCb = null;
}
export {
  FAIL_TEXT,
  INFO_TEXT,
  downloadImageToDataURL,
  embedFromImageEl,
  fileToDataURL,
  hideModal,
  showModal
};
