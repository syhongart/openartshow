// @ts-nocheck — C단계 C-2 S4: studio-main IIFE에서 순수 이동(로직 1바이트 불변).
// UI 렌더·폼 필드·검증·이벤트 배선·공유결과/복사. studio strict화는 별도 후속.
//
// DI: createForm(ctx, {dom, storage}) — ctx.state는 단일 참조(main 생성)로,
// form이 변이한 그 객체를 storage가 같은 참조로 직렬화한다(복사 금지).
// isExternalUrl은 storage(코덱 SSOT)가 소유하고 form이 import한다.
import { INFO_TEXT, FAIL_TEXT, downloadImageToDataURL, fileToDataURL, showModal } from './studio-image.js';
import { isExternalUrl, buildShareFragment } from './studio-storage.js';

// ctx: { state, limits:{PREMIUM,FREE_THEMES,MAX_ARTWORKS,MAX_FEATURED,THEMES}, nextUid, scheduleSave, rerender }
// deps: { dom: {...refs}, storage: { buildGalleryJson } }
export function createForm(ctx, deps) {
  var dom = deps.dom;
  var buildGalleryJson = deps.storage.buildGalleryJson;

  var state = ctx.state;
  var scheduleSave = ctx.scheduleSave;
  var nextUid = ctx.nextUid;
  var PREMIUM = ctx.limits.PREMIUM;
  var FREE_THEMES = ctx.limits.FREE_THEMES;
  var MAX_ARTWORKS = ctx.limits.MAX_ARTWORKS;
  var MAX_FEATURED = ctx.limits.MAX_FEATURED;

  // ---------- DOM refs ----------
  var $id = dom.$id;
  var $idMsg = dom.$idMsg;
  var $idPreviewInline = dom.$idPreviewInline;
  var $name = dom.$name;
  var $desc = dom.$desc;
  var $themeRadios = dom.$themeRadios;
  var $list = dom.$list;
  var $addBtn = dom.$addBtn;
  var $countHint = dom.$countHint;
  var $downloadBtn = dom.$downloadBtn;
  var $previewBtn = dom.$previewBtn;
  var $downloadStatus = dom.$downloadStatus;
  var $urlPreviewFull = dom.$urlPreviewFull;
  var $shareLinkBtn = dom.$shareLinkBtn;
  var $shareStatus = dom.$shareStatus;
  var $shareResultWrap = dom.$shareResultWrap;
  var $shareUrlInput = dom.$shareUrlInput;
  var $shareLenMsg = dom.$shareLenMsg;
  var $copyShareBtn = dom.$copyShareBtn;

  var SHARE_URL_WARN_LEN = 6000;

  var ID_RE = /^[a-z0-9-]+$/;

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
        // 색은 토큰으로 — `#6b6459` 는 `--oas-ink-dim` 의 원값 복사였다(값은 맞고
        // 자리가 틀렸다). 같은 사각에 있던 `studio-plan.ts` 의 폐기 바이올렛과 함께
        // 정리했다. `var()` 는 인라인 스타일에서도 해소된다 — 경위는 그 파일 주석.
        lockBadge.style.cssText = 'font-size:11px;color:var(--ink-dim);margin-left:auto;white-space:nowrap;';
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

  // render를 컨텍스트에 노출 — main init(loadDraft 후)과 각 모듈이 재렌더에 사용.
  ctx.rerender = render;
  return { render: render };
}
