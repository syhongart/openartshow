// @ts-nocheck — S0(C-2) 순수 외부화 단계: studio.html 인라인 IIFE를 로직 1바이트 불변으로 이동.
// strict 타입 정합(암시적 any·null 가드·HTMLElement 캐스팅)은 재분해 단계(S1~S4)에서 수행. (C-1 ui-hud 선례)
(function () {
  'use strict';

  var STORAGE_KEY = 'artshow-studio-draft-v1';
  // ---- 플랜 (P2 임시 운영: 결제 대신 활성화 코드 — 랜딩 요금제 섹션에서 등록) ----
  var PLAN_KEY = 'artshow-plan-v1';
  function planIsPremium() {
    try { return localStorage.getItem(PLAN_KEY) === 'premium'; } catch (e) { return false; }
  }
  var PREMIUM = planIsPremium();
  var FREE_THEMES = ['daylight', 'auto'];

  var MAX_ARTWORKS = PREMIUM ? 14 : 6;
  var MAX_FEATURED = PREMIUM ? 2 : 1;
  var THEMES = ['daylight', 'sunset', 'night', 'auto', 'cycle'];

  // 플랜 배지 — 헤더 h1 옆
  (function () {
    var h1 = document.querySelector('h1');
    if (!h1) return;
    var badge = document.createElement('span');
    badge.id = 'planBadge';
    badge.textContent = PREMIUM ? 'PREMIUM' : 'FREE';
    badge.style.cssText = 'font-size:12px;vertical-align:middle;margin-left:10px;padding:3px 10px;border:1px solid #cfc6b8;border-radius:999px;color:#5733FF;letter-spacing:0.08em;';
    h1.appendChild(badge);
    if (!PREMIUM) {
      var up = document.createElement('a');
      up.href = '../#pricing';
      up.textContent = '업그레이드 ↗';
      up.style.cssText = 'font-size:12px;margin-left:8px;color:#5733FF;vertical-align:middle;';
      h1.appendChild(up);
    }
  })();

  var state = {
    id: '',
    name: '',
    description: '',
    theme: 'daylight',
    artworks: []
  };

  var uidCounter = 0;
  function nextUid() { uidCounter += 1; return 'row-' + uidCounter; }

  // ---------- DOM refs ----------
  var $id = document.getElementById('exhibitId');
  var $idMsg = document.getElementById('exhibitIdMsg');
  var $idPreviewInline = document.getElementById('idPreviewInline');
  var $name = document.getElementById('exhibitName');
  var $desc = document.getElementById('exhibitDesc');
  var $themeGrid = document.getElementById('themeGrid');
  var $themeRadios = $themeGrid.querySelectorAll('input[name="theme"]');
  var $list = document.getElementById('artworkList');
  var $addBtn = document.getElementById('addArtworkBtn');
  var $countHint = document.getElementById('artworkCountHint');
  var $downloadBtn = document.getElementById('downloadBtn');
  var $previewBtn = document.getElementById('previewBtn');
  var $downloadStatus = document.getElementById('downloadStatus');
  var $urlPreviewFull = document.getElementById('urlPreviewFull');
  var $saveIndicator = document.getElementById('saveIndicator');
  var $shareLinkBtn = document.getElementById('shareLinkBtn');
  var $shareStatus = document.getElementById('shareStatus');
  var $shareResultWrap = document.getElementById('shareResultWrap');
  var $shareUrlInput = document.getElementById('shareUrlInput');
  var $shareLenMsg = document.getElementById('shareLenMsg');
  var $copyShareBtn = document.getElementById('copyShareBtn');

  var SHARE_URL_WARN_LEN = 6000;

  var ID_RE = /^[a-z0-9-]+$/;

  // ---------- persistence ----------
  var saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        flashSaveIndicator();
      } catch (e) {
        console.warn('로컬 저장 실패:', e);
      }
    }, 300);
  }

  var indicatorTimer = null;
  function flashSaveIndicator() {
    $saveIndicator.classList.add('show');
    clearTimeout(indicatorTimer);
    indicatorTimer = setTimeout(function () {
      $saveIndicator.classList.remove('show');
    }, 1400);
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      state.id = typeof parsed.id === 'string' ? parsed.id : '';
      state.name = typeof parsed.name === 'string' ? parsed.name : '';
      state.description = typeof parsed.description === 'string' ? parsed.description : '';
      state.theme = (typeof parsed.theme === 'string' && THEMES.indexOf(parsed.theme) !== -1) ? parsed.theme : 'daylight';
      state.artworks = Array.isArray(parsed.artworks) ? parsed.artworks.map(function (a) {
        return {
          _uid: nextUid(),
          title: a.title || '',
          artist: a.artist || '',
          year: a.year || '',
          desc: a.desc || '',
          imageUrl: a.imageUrl || '',
          ar: (typeof a.ar === 'number' && isFinite(a.ar) && a.ar > 0) ? a.ar : undefined,
          _srcUrl: typeof a._srcUrl === 'string' ? a._srcUrl : '',
          featured: !!a.featured
        };
      }) : [];
    } catch (e) {
      console.warn('임시 저장 데이터를 불러오지 못했습니다:', e);
    }
  }

  // ---------- validation ----------
  function validateId(showState) {
    var v = state.id.trim();
    var valid = v.length > 0 && ID_RE.test(v);
    if (showState) {
      $id.classList.toggle('invalid', v.length > 0 && !valid);
      if (v.length === 0) {
        $idMsg.textContent = '이 이름이 전시장 주소가 됩니다. (예: index.html?g=' + 'id)';
        $idMsg.className = 'field-msg';
      } else if (!valid) {
        $idMsg.textContent = '영소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.';
        $idMsg.className = 'field-msg error';
      } else {
        $idMsg.textContent = '사용 가능한 ID 입니다.';
        $idMsg.className = 'field-msg ok';
      }
    }
    return valid;
  }

  function featuredCount() {
    return state.artworks.filter(function (a) { return a.featured; }).length;
  }

  function updateUrlPreview() {
    var idVal = state.id.trim() || 'id';
    $idPreviewInline.textContent = idVal;
    $urlPreviewFull.textContent = './index.html?g=' + idVal;
  }

  // ---------- rendering ----------
  function render() {
    $id.value = state.id;
    $name.value = state.name;
    $desc.value = state.description;
    validateId(true);
    updateUrlPreview();
    renderTheme();
    renderArtworks();
    updateActionState();
  }

  function renderTheme() {
    for (var i = 0; i < $themeRadios.length; i++) {
      var radio = $themeRadios[i];
      var selected = radio.value === state.theme;
      radio.checked = selected;
      radio.closest('.theme-card').classList.toggle('selected', selected);
    }
  }

  function renderArtworks() {
    $list.innerHTML = '';

    if (state.artworks.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '등록된 작품이 없습니다. 아래 "+ 작품 추가" 버튼으로 시작하세요.';
      $list.appendChild(empty);
    }

    state.artworks.forEach(function (aw, index) {
      $list.appendChild(buildArtworkRow(aw, index));
    });

    var count = state.artworks.length;
    var fCount = featuredCount();
    var hintParts = [count + ' / ' + MAX_ARTWORKS + '점'];
    hintParts.push('대표작 ' + fCount + ' / ' + MAX_FEATURED);
    $countHint.innerHTML = hintParts.join(' &nbsp;·&nbsp; ');
    $countHint.classList.toggle('warn', count >= MAX_ARTWORKS);

    $addBtn.disabled = count >= MAX_ARTWORKS;
  }

  // ── 작품 이미지: 외부 URL → 브라우저 내장(dataURL) · 실패 시 직접 업로드 폴백 ──
  // builder.html의 canvas 내장 블록(최대 1400px·매트 #efece6·JPEG 0.85)을 studio에 이식.
  // 목적: 원본 URL이 사라져도 전시가 유지되고, 관람객 접속 정보가 외부 호스트로 새지 않음(프라이버시).
  var IMG_MAX = 1400, IMG_MATTE = '#efece6';
  var INFO_TEXT = '이미지 주소를 넣으면 그림을 내려받아 전시 데이터에 함께 담아요. 원본이 사라져도 전시가 그대로 유지되고, 관람객의 접속 정보가 바깥 사이트로 새지 않게 지켜줍니다.';
  var FAIL_TEXT = '이 이미지는 자동으로 가져올 수 없어요(그림이 있는 사이트가 외부 저장을 막아둔 경우예요). 아래 ‘직접 업로드’로 파일을 올려 주세요.';

  function embedFromImageEl(img) {
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
  function downloadImageToDataURL(url, onOk, onFail) {
    var img = new Image(), done = false; // onload/onerror 중복 발화 방어(콜백 1회 보장)
    img.crossOrigin = 'anonymous'; // CORS 허용 서버여야 canvas 내장 가능
    img.onload = function () { if (done) return; done = true; try { onOk(embedFromImageEl(img)); } catch (e) { onFail('tainted'); } };
    img.onerror = function () { if (done) return; done = true; onFail('load'); }; // 404·CSP·네트워크·CORS 거부
    img.src = url;
  }
  function fileToDataURL(file, onOk, onFail) {
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
  // scheme 판별: http(s)·프로토콜상대(//)는 외부 → 다운로드 필요. data:·상대경로·기존 dataURL은 통과.
  function isExternalUrl(u) { return /^https?:\/\//i.test(u) || /^\/\//.test(u); }

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
  function showModal(titleText, bodyText, uploadCb) {
    var m = ensureModal();
    m.title.textContent = titleText;
    m.body.textContent = bodyText;
    m.upBtn.style.display = uploadCb ? '' : 'none';
    _modalUploadCb = uploadCb || null;
    m.ov.style.display = 'flex';
  }
  function hideModal() { if (_modal) _modal.ov.style.display = 'none'; _modalUploadCb = null; }

  function buildArtworkRow(aw, index) {
    var row = document.createElement('div');
    row.className = 'aw-row' + (aw.featured ? ' featured' : '');
    row.dataset.uid = aw._uid;

    var head = document.createElement('div');
    head.className = 'aw-row-head';

    var idxLabel = document.createElement('span');
    idxLabel.className = 'aw-index';
    idxLabel.textContent = '작품 ' + (index + 1);
    if (aw.featured) {
      var tag = document.createElement('span');
      tag.className = 'featured-tag';
      tag.textContent = '★ 대표작';
      idxLabel.appendChild(tag);
    }
    head.appendChild(idxLabel);

    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-danger';
    delBtn.textContent = '삭제';
    delBtn.addEventListener('click', function () {
      state.artworks = state.artworks.filter(function (a) { return a._uid !== aw._uid; });
      renderArtworks();
      updateActionState();
      scheduleSave();
    });
    head.appendChild(delBtn);

    row.appendChild(head);

    var body = document.createElement('div');
    body.className = 'aw-row-body';

    body.appendChild(makeTextField('제목', aw.title, function (v) {
      aw.title = v; scheduleSave();
    }));
    body.appendChild(makeTextField('작가명', aw.artist, function (v) {
      aw.artist = v; scheduleSave();
    }));
    body.appendChild(makeNumberField('연도', aw.year, function (v) {
      aw.year = v; scheduleSave();
    }));

    var descCell = document.createElement('div');
    descCell.className = 'field-cell desc-cell';
    var descLabel = document.createElement('label');
    descLabel.className = 'field-label';
    descLabel.textContent = '설명';
    var descArea = document.createElement('textarea');
    descArea.rows = 2;
    descArea.value = aw.desc;
    descArea.placeholder = '작품에 대한 설명을 입력하세요.';
    descArea.addEventListener('input', function () {
      aw.desc = descArea.value;
      scheduleSave();
    });
    descCell.appendChild(descLabel);
    descCell.appendChild(descArea);
    body.appendChild(descCell);

    var imageCell = document.createElement('div');
    imageCell.className = 'field-cell image-cell';

    var isEmbedded = !!(aw.imageUrl && aw.imageUrl.indexOf('data:') === 0);

    var urlWrap = document.createElement('div');
    var urlLabel = document.createElement('label');
    urlLabel.className = 'field-label';
    urlLabel.textContent = '이미지 URL';
    // 도움말 ⓘ — 데스크탑은 title 툴팁, 모바일은 클릭 시 안내 모달
    var infoBtn = document.createElement('button');
    infoBtn.type = 'button';
    infoBtn.className = 'info-dot';
    infoBtn.textContent = 'ⓘ';
    infoBtn.title = INFO_TEXT;
    infoBtn.setAttribute('aria-label', '이미지 저장 방식 도움말');
    infoBtn.addEventListener('click', function () { showModal('이미지는 이렇게 보관해요', INFO_TEXT, null); });
    urlLabel.appendChild(infoBtn);

    var urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.placeholder = 'https://... 또는 ./assets/파일.png';
    // 내장 완료(dataURL)면 입력창엔 원본 주소를 표시(수만 자 dataURL을 노출하지 않음)
    urlInput.value = isEmbedded ? (aw._srcUrl || '') : (aw.imageUrl || '');
    urlInput.spellcheck = false;

    // 파일 업로드(상시 노출) + 숨은 file input(행 스코프)
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    var uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'btn-upload';
    uploadBtn.textContent = '파일';
    uploadBtn.addEventListener('click', function () { fileInput.click(); });

    var urlRow = document.createElement('div');
    urlRow.className = 'url-row';
    urlRow.appendChild(urlInput);
    urlRow.appendChild(uploadBtn);

    var statusEl = document.createElement('div');
    statusEl.className = 'field-msg img-status';

    urlWrap.appendChild(urlLabel);
    urlWrap.appendChild(urlRow);
    urlWrap.appendChild(statusEl);
    urlWrap.appendChild(fileInput);

    var thumbWrap = document.createElement('div');
    thumbWrap.className = 'thumb-wrap';
    thumbWrap.id = 'thumb-' + aw._uid;

    function setStatus(txt, cls) {
      statusEl.textContent = txt || '';
      statusEl.className = 'field-msg img-status' + (cls ? ' ' + cls : '');
    }
    function refreshThumb() {
      thumbWrap.innerHTML = '';
      var src = (aw.imageUrl && aw.imageUrl.trim()) || urlInput.value.trim();
      if (!src) { thumbWrap.textContent = '미리보기'; return; }
      var img = document.createElement('img');
      img.src = src;
      img.alt = '미리보기';
      img.onerror = function () { thumbWrap.innerHTML = ''; thumbWrap.textContent = '미리보기'; };
      thumbWrap.appendChild(img);
    }
    function markSavedIfEmbedded() {
      if (aw.imageUrl && aw.imageUrl.indexOf('data:') === 0) setStatus('✓ 저장됨 · 원본이 사라져도 전시가 유지돼요', 'ok');
    }
    refreshThumb();
    markSavedIfEmbedded();

    function onEmbedOk(res) {
      aw.imageUrl = res.dataURL;
      aw.ar = res.ar;
      refreshThumb();
      setStatus('✓ 저장됨 · 원본이 사라져도 전시가 유지돼요', 'ok');
      scheduleSave();
    }

    // 파일 선택 → 내장(builder와 동일 경로)
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      fileInput.value = ''; // 같은 파일 재선택 허용
      if (!f) return;
      setStatus('불러오는 중…');
      aw._srcUrl = '';
      urlInput.value = '';
      fileToDataURL(f, onEmbedOk, function () { setStatus('이미지를 열 수 없어요', 'error'); });
    });

    // 타이핑 중: imageUrl만 갱신·미리보기(다운로드는 확정 시)
    urlInput.addEventListener('input', function () {
      aw.imageUrl = urlInput.value.trim();
      aw.ar = undefined;
      aw._srcUrl = '';
      setStatus('');
      refreshThumb();
      scheduleSave();
    });

    // 확정(blur/Enter): 외부 URL이면 다운로드→내장, 아니면 그대로 통과
    urlInput.addEventListener('change', function () {
      var v = urlInput.value.trim();
      if (!v) { aw.imageUrl = ''; aw.ar = undefined; aw._srcUrl = ''; refreshThumb(); scheduleSave(); return; }
      if (!isExternalUrl(v)) { // data:·상대경로(./assets…)는 다운로드 불필요
        aw.imageUrl = v; aw.ar = undefined; aw._srcUrl = ''; refreshThumb(); scheduleSave(); return;
      }
      if (v === aw._srcUrl && aw.imageUrl && aw.imageUrl.indexOf('data:') === 0) return; // 이미 이 원본을 내장함
      aw._srcUrl = v;
      setStatus('불러오는 중…');
      downloadImageToDataURL(v, onEmbedOk, function () {
        setStatus('자동 저장 실패 — 직접 업로드가 필요해요', 'error');
        showModal('이미지를 자동으로 가져올 수 없어요', FAIL_TEXT, function () { fileInput.click(); });
      });
    });

    imageCell.appendChild(urlWrap);
    imageCell.appendChild(thumbWrap);
    body.appendChild(imageCell);

    row.appendChild(body);

    var foot = document.createElement('div');
    foot.className = 'aw-row-foot';

    var checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'checkbox-field';
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!aw.featured;
    checkbox.addEventListener('change', function () {
      if (checkbox.checked && featuredCount() >= MAX_FEATURED) {
        checkbox.checked = false;
        window.alert('대표작은 최대 ' + MAX_FEATURED + '점까지만 지정할 수 있습니다.');
        return;
      }
      aw.featured = checkbox.checked;
      row.classList.toggle('featured', aw.featured);
      idxLabel.innerHTML = '작품 ' + (index + 1);
      if (aw.featured) {
        var tag2 = document.createElement('span');
        tag2.className = 'featured-tag';
        tag2.textContent = '★ 대표작';
        idxLabel.appendChild(tag2);
      }
      renderArtworks();
      scheduleSave();
    });
    var checkboxText = document.createElement('span');
    checkboxText.textContent = '대표작으로 지정 (중앙 가벽 정면)';
    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(checkboxText);

    foot.appendChild(checkboxLabel);
    row.appendChild(foot);

    return row;
  }

  function makeTextField(labelText, value, onChange) {
    var cell = document.createElement('div');
    cell.className = 'field-cell';
    var label = document.createElement('label');
    label.className = 'field-label';
    label.textContent = labelText;
    var input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.addEventListener('input', function () { onChange(input.value); });
    cell.appendChild(label);
    cell.appendChild(input);
    return cell;
  }

  function makeNumberField(labelText, value, onChange) {
    var cell = document.createElement('div');
    cell.className = 'field-cell';
    var label = document.createElement('label');
    label.className = 'field-label';
    label.textContent = labelText;
    var input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    input.addEventListener('input', function () {
      var n = parseInt(input.value, 10);
      onChange(isNaN(n) ? '' : n);
    });
    cell.appendChild(label);
    cell.appendChild(input);
    return cell;
  }

  function updateActionState() {
    var idValid = validateId(false);
    var hasName = state.name.trim().length > 0;
    var ready = idValid && hasName;
    $downloadBtn.disabled = false; // allow click to trigger validation messaging
    if (!ready) {
      $downloadStatus.textContent = '';
      $downloadStatus.className = 'action-status';
    }
  }

  // ---------- events ----------
  $id.addEventListener('input', function () {
    state.id = $id.value.replace(/\s+/g, '');
    validateId(true);
    updateUrlPreview();
    updateActionState();
    scheduleSave();
  });

  $name.addEventListener('input', function () {
    state.name = $name.value;
    updateActionState();
    scheduleSave();
  });

  $desc.addEventListener('input', function () {
    state.description = $desc.value;
    scheduleSave();
  });

  // 무료 플랜 테마 잠금 — 카드에 자물쇠 배지 + 선택 차단
  if (!PREMIUM) {
    var lockCards = document.querySelectorAll('.theme-card');
    for (var ci = 0; ci < lockCards.length; ci++) {
      var themeName = lockCards[ci].getAttribute('data-theme');
      if (FREE_THEMES.indexOf(themeName) === -1) {
        lockCards[ci].style.opacity = '0.45';
        var lockBadge = document.createElement('span');
        lockBadge.textContent = '\uD83D\uDD12 프리미엄';
        lockBadge.style.cssText = 'font-size:11px;color:#6b6459;margin-left:auto;white-space:nowrap;';
        lockCards[ci].appendChild(lockBadge);
        lockCards[ci].querySelector('input').disabled = true;
      }
    }
  }

  for (var ti = 0; ti < $themeRadios.length; ti++) {
    $themeRadios[ti].addEventListener('change', function () {
      if (this.checked) {
        if (!PREMIUM && FREE_THEMES.indexOf(this.value) === -1) {
          this.checked = false;
          window.alert('이 테마는 프리미엄 플랜 전용입니다.\n랜딩 페이지의 요금제에서 활성화 코드를 등록해 주세요.');
          return;
        }
        state.theme = this.value;
        renderTheme();
        scheduleSave();
      }
    });
  }

  $addBtn.addEventListener('click', function () {
    if (state.artworks.length >= MAX_ARTWORKS) {
      window.alert(
        PREMIUM
          ? '작품은 최대 ' + MAX_ARTWORKS + '점까지 등록할 수 있습니다.'
          : '무료 플랜은 작품 ' + MAX_ARTWORKS + '점까지입니다.\n프리미엄(작품 14점 + 대표작 2점 + 모든 테마)은 랜딩의 요금제를 확인해 주세요.'
      );
      return;
    }
    state.artworks.push({
      _uid: nextUid(),
      title: '',
      artist: '',
      year: new Date().getFullYear(),
      desc: '',
      imageUrl: '',
      ar: undefined,
      _srcUrl: '',
      featured: false
    });
    renderArtworks();
    updateActionState();
    scheduleSave();
  });

  function validateForExport() {
    var idValid = validateId(true);
    if (!idValid) {
      $downloadStatus.textContent = '전시장 ID를 올바르게 입력해주세요.';
      $downloadStatus.className = 'action-status error';
      $id.focus();
      return false;
    }
    if (state.name.trim().length === 0) {
      $downloadStatus.textContent = '전시 제목을 입력해주세요.';
      $downloadStatus.className = 'action-status error';
      $name.focus();
      return false;
    }
    if (state.artworks.length === 0) {
      $downloadStatus.textContent = '작품을 1개 이상 추가해주세요.';
      $downloadStatus.className = 'action-status error';
      return false;
    }
    if (featuredCount() > MAX_FEATURED) {
      $downloadStatus.textContent = '대표작은 최대 ' + MAX_FEATURED + '점까지만 지정할 수 있습니다.';
      $downloadStatus.className = 'action-status error';
      return false;
    }
    // 이미지 내장 미완료 차단(프라이버시): imageUrl이 아직 외부 URL(다운로드 진행 중·실패)이면
    // 발행 시 그 URL이 공유물에 새어 관람객 접속 정보가 외부로 유출된다 → 저장 완료(dataURL) 전까지 발행 차단.
    var pendingImg = state.artworks.filter(function (a) { return a.imageUrl && isExternalUrl(a.imageUrl.trim()); });
    if (pendingImg.length > 0) {
      $downloadStatus.textContent = '아직 저장되지 않은 이미지가 있어요. "✓ 저장됨" 표시를 기다리거나, 안 되면 직접 업로드해 주세요.';
      $downloadStatus.className = 'action-status error';
      return false;
    }
    return true;
  }

  // base64url-encode a gallery JSON object for the #gd= share link
  function encodeGalleryData(obj) {
    var json = JSON.stringify(obj);
    var bytes = new TextEncoder().encode(json);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // deflate-raw 압축 발행 (#gz=) — 무압축(#gd=) 대비 URL이 절반 이하로 줄어
  // 메신저의 긴 주소 잘림을 피한다. CompressionStream 미지원 브라우저는
  // 호출부에서 무압축으로 폴백한다. 뷰어(artworks.js)는 두 규약 모두 읽는다.
  function encodeGalleryDataGz(obj) {
    var jsonBytes = new TextEncoder().encode(JSON.stringify(obj));
    var stream = new Blob([jsonBytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      var bin = '';
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    });
  }

  // 공유/미리보기 공용 — 가능하면 압축(#gz=), 아니면 무압축(#gd=) 프래그먼트를 만든다
  function buildShareFragment(json) {
    if (typeof CompressionStream !== 'undefined') {
      return encodeGalleryDataGz(json).then(function (enc) { return '#gz=' + enc; });
    }
    return Promise.resolve('#gd=' + encodeGalleryData(json));
  }

  $downloadBtn.addEventListener('click', function () {
    if (!validateForExport()) return;

    var json = buildGalleryJson();
    var blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = state.id.trim() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

    $downloadStatus.textContent = state.id.trim() + '.json 파일을 다운로드했습니다.';
    $downloadStatus.className = 'action-status ok';
  });

  $previewBtn.addEventListener('click', function () {
    if (!validateForExport()) return;

    var json = buildGalleryJson();
    buildShareFragment(json).then(function (fragment) {
      window.open('./index.html' + fragment, '_blank');
    }).catch(function () {
      $downloadStatus.textContent = '미리보기 링크 생성에 실패했습니다.';
      $downloadStatus.className = 'action-status error';
    });
  });

  $shareLinkBtn.addEventListener('click', function () {
    if (!validateForExport()) return;

    var json = buildGalleryJson();
    buildShareFragment(json).then(function (fragment) {
      var fullUrl;
      try {
        fullUrl = new URL('./index.html' + fragment, window.location.href).href;
      } catch (e) {
        fullUrl = './index.html' + fragment;
      }
      renderShareResult(fullUrl);
    }).catch(function () {
      $shareStatus.textContent = '공유 링크 생성에 실패했습니다.';
      $shareStatus.className = 'action-status error';
    });
  });

  function renderShareResult(fullUrl) {

    $shareUrlInput.value = fullUrl;
    $shareResultWrap.style.display = '';

    if (fullUrl.length > SHARE_URL_WARN_LEN) {
      $shareLenMsg.textContent = '주소 길이 ' + fullUrl.length + '자 — 작품 설명을 줄이거나 JSON 다운로드 방식을 사용하세요.';
      $shareLenMsg.className = 'field-msg error';
    } else {
      $shareLenMsg.textContent = '주소 길이 ' + fullUrl.length + '자';
      $shareLenMsg.className = 'field-msg';
    }

    $shareStatus.textContent = '공유 링크를 생성했습니다.';
    $shareStatus.className = 'action-status ok';
  }

  $copyShareBtn.addEventListener('click', function () {
    var text = $shareUrlInput.value;
    if (!text) return;

    function showCopyFail() {
      $shareStatus.textContent = '복사에 실패했습니다. 주소를 직접 선택해 복사해주세요.';
      $shareStatus.className = 'action-status error';
    }
    function showCopyOk() {
      $shareStatus.textContent = '링크를 복사했습니다.';
      $shareStatus.className = 'action-status ok';
    }
    function fallbackCopy() {
      $shareUrlInput.focus();
      $shareUrlInput.select();
      try {
        if (document.execCommand('copy')) {
          showCopyOk();
        } else {
          showCopyFail();
        }
      } catch (e) {
        showCopyFail();
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showCopyOk, fallbackCopy);
    } else {
      fallbackCopy();
    }
  });

  function buildGalleryJson() {
    var normal = state.artworks.filter(function (a) { return !a.featured; });
    var featured = state.artworks.filter(function (a) { return a.featured; });

    if (normal.length > 12) {
      console.warn('일반 작품이 12점을 초과하여 초과분은 무시됩니다.');
      normal = normal.slice(0, 12);
    }
    if (featured.length > MAX_FEATURED) {
      console.warn('대표작이 ' + MAX_FEATURED + '점을 초과하여 초과분은 무시됩니다.');
      featured = featured.slice(0, MAX_FEATURED);
    }

    var artworks = [];

    normal.forEach(function (a, i) {
      artworks.push(toArtworkEntry(a, 'aw-' + pad2(i + 1), false));
    });
    featured.forEach(function (a, i) {
      artworks.push(toArtworkEntry(a, 'aw-featured-' + pad2(i + 1), true));
    });

    return {
      id: state.id.trim(),
      name: state.name.trim(),
      description: state.description.trim(),
      theme: THEMES.indexOf(state.theme) !== -1 ? state.theme : 'daylight',
      artworks: artworks
    };
  }

  function toArtworkEntry(a, id, featured) {
    var entry = {
      id: id,
      title: a.title.trim(),
      artist: a.artist.trim(),
      year: typeof a.year === 'number' ? a.year : (parseInt(a.year, 10) || new Date().getFullYear()),
      desc: a.desc.trim(),
      // 방어심층: 미내장 외부 URL(http(s)://·//)은 발행물에서 비운다 — validateForExport가 1차 차단하나,
      // 어떤 경로로도 외부 URL이 공유 JSON에 새어 관람객 IP가 유출되지 않게 하는 최후 관문(캡션 폴백).
      imageUrl: isExternalUrl(a.imageUrl.trim()) ? '' : a.imageUrl.trim()
    };
    // 종횡비(내장 시 산출) — 현재 gallery 렌더(artworks.js)는 고정 슬롯이라 미소비이나 미래 호환 위해 보존
    if (typeof a.ar === 'number' && isFinite(a.ar) && a.ar > 0) entry.ar = a.ar;
    if (featured) entry.featured = true;
    return entry;
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // ---------- init ----------
  loadDraft();
  render();
})();
