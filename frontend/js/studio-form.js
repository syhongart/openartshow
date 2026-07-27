import { INFO_TEXT, FAIL_TEXT, downloadImageToDataURL, fileToDataURL, showModal } from "./studio-image.js";
import { isExternalUrl, buildShareFragment } from "./studio-storage.js";
function createForm(ctx, deps) {
  var dom = deps.dom;
  var buildGalleryJson = deps.storage.buildGalleryJson;
  var state = ctx.state;
  var scheduleSave = ctx.scheduleSave;
  var nextUid = ctx.nextUid;
  var PREMIUM = ctx.limits.PREMIUM;
  var FREE_THEMES = ctx.limits.FREE_THEMES;
  var MAX_ARTWORKS = ctx.limits.MAX_ARTWORKS;
  var MAX_FEATURED = ctx.limits.MAX_FEATURED;
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
  var SHARE_URL_WARN_LEN = 6e3;
  var ID_RE = /^[a-z0-9-]+$/;
  function validateId(showState) {
    var v = state.id.trim();
    var valid = v.length > 0 && ID_RE.test(v);
    if (showState) {
      $id.classList.toggle("invalid", v.length > 0 && !valid);
      if (v.length === 0) {
        $idMsg.textContent = "\uC774 \uC774\uB984\uC774 \uC804\uC2DC\uC7A5 \uC8FC\uC18C\uAC00 \uB429\uB2C8\uB2E4. (\uC608: index.html?g=id)";
        $idMsg.className = "field-msg";
      } else if (!valid) {
        $idMsg.textContent = "\uC601\uC18C\uBB38\uC790, \uC22B\uC790, \uD558\uC774\uD508(-)\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
        $idMsg.className = "field-msg error";
      } else {
        $idMsg.textContent = "\uC0AC\uC6A9 \uAC00\uB2A5\uD55C ID \uC785\uB2C8\uB2E4.";
        $idMsg.className = "field-msg ok";
      }
    }
    return valid;
  }
  function featuredCount() {
    return state.artworks.filter(function(a) {
      return a.featured;
    }).length;
  }
  function updateUrlPreview() {
    var idVal = state.id.trim() || "id";
    $idPreviewInline.textContent = idVal;
    $urlPreviewFull.textContent = "./index.html?g=" + idVal;
  }
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
      radio.closest(".theme-card").classList.toggle("selected", selected);
    }
  }
  function renderArtworks() {
    $list.innerHTML = "";
    if (state.artworks.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = '\uB4F1\uB85D\uB41C \uC791\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC544\uB798 "+ \uC791\uD488 \uCD94\uAC00" \uBC84\uD2BC\uC73C\uB85C \uC2DC\uC791\uD558\uC138\uC694.';
      $list.appendChild(empty);
    }
    state.artworks.forEach(function(aw, index) {
      $list.appendChild(buildArtworkRow(aw, index));
    });
    var count = state.artworks.length;
    var fCount = featuredCount();
    var hintParts = [count + " / " + MAX_ARTWORKS + "\uC810"];
    hintParts.push("\uB300\uD45C\uC791 " + fCount + " / " + MAX_FEATURED);
    $countHint.innerHTML = hintParts.join(" &nbsp;\xB7&nbsp; ");
    $countHint.classList.toggle("warn", count >= MAX_ARTWORKS);
    $addBtn.disabled = count >= MAX_ARTWORKS;
  }
  function buildArtworkRow(aw, index) {
    var row = document.createElement("div");
    row.className = "aw-row" + (aw.featured ? " featured" : "");
    row.dataset.uid = aw._uid;
    var head = document.createElement("div");
    head.className = "aw-row-head";
    var idxLabel = document.createElement("span");
    idxLabel.className = "aw-index";
    idxLabel.textContent = "\uC791\uD488 " + (index + 1);
    if (aw.featured) {
      var tag = document.createElement("span");
      tag.className = "featured-tag";
      tag.textContent = "\u2605 \uB300\uD45C\uC791";
      idxLabel.appendChild(tag);
    }
    head.appendChild(idxLabel);
    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-danger";
    delBtn.textContent = "\uC0AD\uC81C";
    delBtn.addEventListener("click", function() {
      state.artworks = state.artworks.filter(function(a) {
        return a._uid !== aw._uid;
      });
      renderArtworks();
      updateActionState();
      scheduleSave();
    });
    head.appendChild(delBtn);
    row.appendChild(head);
    var body = document.createElement("div");
    body.className = "aw-row-body";
    body.appendChild(makeTextField("\uC81C\uBAA9", aw.title, function(v) {
      aw.title = v;
      scheduleSave();
    }));
    body.appendChild(makeTextField("\uC791\uAC00\uBA85", aw.artist, function(v) {
      aw.artist = v;
      scheduleSave();
    }));
    body.appendChild(makeNumberField("\uC5F0\uB3C4", aw.year, function(v) {
      aw.year = v;
      scheduleSave();
    }));
    var descCell = document.createElement("div");
    descCell.className = "field-cell desc-cell";
    var descLabel = document.createElement("label");
    descLabel.className = "field-label";
    descLabel.textContent = "\uC124\uBA85";
    var descArea = document.createElement("textarea");
    descArea.rows = 2;
    descArea.value = aw.desc;
    descArea.placeholder = "\uC791\uD488\uC5D0 \uB300\uD55C \uC124\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694.";
    descArea.addEventListener("input", function() {
      aw.desc = descArea.value;
      scheduleSave();
    });
    descCell.appendChild(descLabel);
    descCell.appendChild(descArea);
    body.appendChild(descCell);
    var imageCell = document.createElement("div");
    imageCell.className = "field-cell image-cell";
    var isEmbedded = !!(aw.imageUrl && aw.imageUrl.indexOf("data:") === 0);
    var urlWrap = document.createElement("div");
    var urlLabel = document.createElement("label");
    urlLabel.className = "field-label";
    urlLabel.textContent = "\uC774\uBBF8\uC9C0 URL";
    var infoBtn = document.createElement("button");
    infoBtn.type = "button";
    infoBtn.className = "info-dot";
    infoBtn.textContent = "\u24D8";
    infoBtn.title = INFO_TEXT;
    infoBtn.setAttribute("aria-label", "\uC774\uBBF8\uC9C0 \uC800\uC7A5 \uBC29\uC2DD \uB3C4\uC6C0\uB9D0");
    infoBtn.addEventListener("click", function() {
      showModal("\uC774\uBBF8\uC9C0\uB294 \uC774\uB807\uAC8C \uBCF4\uAD00\uD574\uC694", INFO_TEXT, null);
    });
    urlLabel.appendChild(infoBtn);
    var urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.placeholder = "https://... \uB610\uB294 ./assets/\uD30C\uC77C.png";
    urlInput.value = isEmbedded ? aw._srcUrl || "" : aw.imageUrl || "";
    urlInput.spellcheck = false;
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    var uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "btn-upload";
    uploadBtn.textContent = "\uD30C\uC77C";
    uploadBtn.addEventListener("click", function() {
      fileInput.click();
    });
    var urlRow = document.createElement("div");
    urlRow.className = "url-row";
    urlRow.appendChild(urlInput);
    urlRow.appendChild(uploadBtn);
    var statusEl = document.createElement("div");
    statusEl.className = "field-msg img-status";
    urlWrap.appendChild(urlLabel);
    urlWrap.appendChild(urlRow);
    urlWrap.appendChild(statusEl);
    urlWrap.appendChild(fileInput);
    var thumbWrap = document.createElement("div");
    thumbWrap.className = "thumb-wrap";
    thumbWrap.id = "thumb-" + aw._uid;
    function setStatus(txt, cls) {
      statusEl.textContent = txt || "";
      statusEl.className = "field-msg img-status" + (cls ? " " + cls : "");
    }
    function refreshThumb() {
      thumbWrap.innerHTML = "";
      var src = aw.imageUrl && aw.imageUrl.trim() || urlInput.value.trim();
      if (!src) {
        thumbWrap.textContent = "\uBBF8\uB9AC\uBCF4\uAE30";
        return;
      }
      var img = document.createElement("img");
      img.src = src;
      img.alt = "\uBBF8\uB9AC\uBCF4\uAE30";
      img.onerror = function() {
        thumbWrap.innerHTML = "";
        thumbWrap.textContent = "\uBBF8\uB9AC\uBCF4\uAE30";
      };
      thumbWrap.appendChild(img);
    }
    function markSavedIfEmbedded() {
      if (aw.imageUrl && aw.imageUrl.indexOf("data:") === 0) setStatus("\u2713 \uC800\uC7A5\uB428 \xB7 \uC6D0\uBCF8\uC774 \uC0AC\uB77C\uC838\uB3C4 \uC804\uC2DC\uAC00 \uC720\uC9C0\uB3FC\uC694", "ok");
    }
    refreshThumb();
    markSavedIfEmbedded();
    function onEmbedOk(res) {
      aw.imageUrl = res.dataURL;
      aw.ar = res.ar;
      refreshThumb();
      setStatus("\u2713 \uC800\uC7A5\uB428 \xB7 \uC6D0\uBCF8\uC774 \uC0AC\uB77C\uC838\uB3C4 \uC804\uC2DC\uAC00 \uC720\uC9C0\uB3FC\uC694", "ok");
      scheduleSave();
    }
    fileInput.addEventListener("change", function() {
      var f = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!f) return;
      setStatus("\uBD88\uB7EC\uC624\uB294 \uC911\u2026");
      aw._srcUrl = "";
      urlInput.value = "";
      fileToDataURL(f, onEmbedOk, function() {
        setStatus("\uC774\uBBF8\uC9C0\uB97C \uC5F4 \uC218 \uC5C6\uC5B4\uC694", "error");
      });
    });
    urlInput.addEventListener("input", function() {
      aw.imageUrl = urlInput.value.trim();
      aw.ar = void 0;
      aw._srcUrl = "";
      setStatus("");
      refreshThumb();
      scheduleSave();
    });
    urlInput.addEventListener("change", function() {
      var v = urlInput.value.trim();
      if (!v) {
        aw.imageUrl = "";
        aw.ar = void 0;
        aw._srcUrl = "";
        refreshThumb();
        scheduleSave();
        return;
      }
      if (!isExternalUrl(v)) {
        aw.imageUrl = v;
        aw.ar = void 0;
        aw._srcUrl = "";
        refreshThumb();
        scheduleSave();
        return;
      }
      if (v === aw._srcUrl && aw.imageUrl && aw.imageUrl.indexOf("data:") === 0) return;
      aw._srcUrl = v;
      setStatus("\uBD88\uB7EC\uC624\uB294 \uC911\u2026");
      downloadImageToDataURL(v, onEmbedOk, function() {
        setStatus("\uC790\uB3D9 \uC800\uC7A5 \uC2E4\uD328 \u2014 \uC9C1\uC811 \uC5C5\uB85C\uB4DC\uAC00 \uD544\uC694\uD574\uC694", "error");
        showModal("\uC774\uBBF8\uC9C0\uB97C \uC790\uB3D9\uC73C\uB85C \uAC00\uC838\uC62C \uC218 \uC5C6\uC5B4\uC694", FAIL_TEXT, function() {
          fileInput.click();
        });
      });
    });
    imageCell.appendChild(urlWrap);
    imageCell.appendChild(thumbWrap);
    body.appendChild(imageCell);
    row.appendChild(body);
    var foot = document.createElement("div");
    foot.className = "aw-row-foot";
    var checkboxLabel = document.createElement("label");
    checkboxLabel.className = "checkbox-field";
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!aw.featured;
    checkbox.addEventListener("change", function() {
      if (checkbox.checked && featuredCount() >= MAX_FEATURED) {
        checkbox.checked = false;
        window.alert("\uB300\uD45C\uC791\uC740 \uCD5C\uB300 " + MAX_FEATURED + "\uC810\uAE4C\uC9C0\uB9CC \uC9C0\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
        return;
      }
      aw.featured = checkbox.checked;
      row.classList.toggle("featured", aw.featured);
      idxLabel.innerHTML = "\uC791\uD488 " + (index + 1);
      if (aw.featured) {
        var tag2 = document.createElement("span");
        tag2.className = "featured-tag";
        tag2.textContent = "\u2605 \uB300\uD45C\uC791";
        idxLabel.appendChild(tag2);
      }
      renderArtworks();
      scheduleSave();
    });
    var checkboxText = document.createElement("span");
    checkboxText.textContent = "\uB300\uD45C\uC791\uC73C\uB85C \uC9C0\uC815 (\uC911\uC559 \uAC00\uBCBD \uC815\uBA74)";
    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(checkboxText);
    foot.appendChild(checkboxLabel);
    row.appendChild(foot);
    return row;
  }
  function makeTextField(labelText, value, onChange) {
    var cell = document.createElement("div");
    cell.className = "field-cell";
    var label = document.createElement("label");
    label.className = "field-label";
    label.textContent = labelText;
    var input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.addEventListener("input", function() {
      onChange(input.value);
    });
    cell.appendChild(label);
    cell.appendChild(input);
    return cell;
  }
  function makeNumberField(labelText, value, onChange) {
    var cell = document.createElement("div");
    cell.className = "field-cell";
    var label = document.createElement("label");
    label.className = "field-label";
    label.textContent = labelText;
    var input = document.createElement("input");
    input.type = "number";
    input.value = value;
    input.addEventListener("input", function() {
      var n = parseInt(input.value, 10);
      onChange(isNaN(n) ? "" : n);
    });
    cell.appendChild(label);
    cell.appendChild(input);
    return cell;
  }
  function updateActionState() {
    var idValid = validateId(false);
    var hasName = state.name.trim().length > 0;
    var ready = idValid && hasName;
    $downloadBtn.disabled = false;
    if (!ready) {
      $downloadStatus.textContent = "";
      $downloadStatus.className = "action-status";
    }
  }
  $id.addEventListener("input", function() {
    state.id = $id.value.replace(/\s+/g, "");
    validateId(true);
    updateUrlPreview();
    updateActionState();
    scheduleSave();
  });
  $name.addEventListener("input", function() {
    state.name = $name.value;
    updateActionState();
    scheduleSave();
  });
  $desc.addEventListener("input", function() {
    state.description = $desc.value;
    scheduleSave();
  });
  if (!PREMIUM) {
    var lockCards = document.querySelectorAll(".theme-card");
    for (var ci = 0; ci < lockCards.length; ci++) {
      var themeName = lockCards[ci].getAttribute("data-theme");
      if (FREE_THEMES.indexOf(themeName) === -1) {
        lockCards[ci].style.opacity = "0.45";
        var lockBadge = document.createElement("span");
        lockBadge.textContent = "\u{1F512} \uD504\uB9AC\uBBF8\uC5C4";
        lockBadge.style.cssText = "font-size:11px;color:#6b6459;margin-left:auto;white-space:nowrap;";
        lockCards[ci].appendChild(lockBadge);
        lockCards[ci].querySelector("input").disabled = true;
      }
    }
  }
  for (var ti = 0; ti < $themeRadios.length; ti++) {
    $themeRadios[ti].addEventListener("change", function() {
      if (this.checked) {
        if (!PREMIUM && FREE_THEMES.indexOf(this.value) === -1) {
          this.checked = false;
          window.alert("\uC774 \uD14C\uB9C8\uB294 \uD504\uB9AC\uBBF8\uC5C4 \uD50C\uB79C \uC804\uC6A9\uC785\uB2C8\uB2E4.\n\uB79C\uB529 \uD398\uC774\uC9C0\uC758 \uC694\uAE08\uC81C\uC5D0\uC11C \uD65C\uC131\uD654 \uCF54\uB4DC\uB97C \uB4F1\uB85D\uD574 \uC8FC\uC138\uC694.");
          return;
        }
        state.theme = this.value;
        renderTheme();
        scheduleSave();
      }
    });
  }
  $addBtn.addEventListener("click", function() {
    if (state.artworks.length >= MAX_ARTWORKS) {
      window.alert(
        PREMIUM ? "\uC791\uD488\uC740 \uCD5C\uB300 " + MAX_ARTWORKS + "\uC810\uAE4C\uC9C0 \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." : "\uBB34\uB8CC \uD50C\uB79C\uC740 \uC791\uD488 " + MAX_ARTWORKS + "\uC810\uAE4C\uC9C0\uC785\uB2C8\uB2E4.\n\uD504\uB9AC\uBBF8\uC5C4(\uC791\uD488 14\uC810 + \uB300\uD45C\uC791 2\uC810 + \uBAA8\uB4E0 \uD14C\uB9C8)\uC740 \uB79C\uB529\uC758 \uC694\uAE08\uC81C\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694."
      );
      return;
    }
    state.artworks.push({
      _uid: nextUid(),
      title: "",
      artist: "",
      year: (/* @__PURE__ */ new Date()).getFullYear(),
      desc: "",
      imageUrl: "",
      ar: void 0,
      _srcUrl: "",
      featured: false
    });
    renderArtworks();
    updateActionState();
    scheduleSave();
  });
  function validateForExport() {
    var idValid = validateId(true);
    if (!idValid) {
      $downloadStatus.textContent = "\uC804\uC2DC\uC7A5 ID\uB97C \uC62C\uBC14\uB974\uAC8C \uC785\uB825\uD574\uC8FC\uC138\uC694.";
      $downloadStatus.className = "action-status error";
      $id.focus();
      return false;
    }
    if (state.name.trim().length === 0) {
      $downloadStatus.textContent = "\uC804\uC2DC \uC81C\uBAA9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.";
      $downloadStatus.className = "action-status error";
      $name.focus();
      return false;
    }
    if (state.artworks.length === 0) {
      $downloadStatus.textContent = "\uC791\uD488\uC744 1\uAC1C \uC774\uC0C1 \uCD94\uAC00\uD574\uC8FC\uC138\uC694.";
      $downloadStatus.className = "action-status error";
      return false;
    }
    if (featuredCount() > MAX_FEATURED) {
      $downloadStatus.textContent = "\uB300\uD45C\uC791\uC740 \uCD5C\uB300 " + MAX_FEATURED + "\uC810\uAE4C\uC9C0\uB9CC \uC9C0\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
      $downloadStatus.className = "action-status error";
      return false;
    }
    var pendingImg = state.artworks.filter(function(a) {
      return a.imageUrl && isExternalUrl(a.imageUrl.trim());
    });
    if (pendingImg.length > 0) {
      $downloadStatus.textContent = '\uC544\uC9C1 \uC800\uC7A5\uB418\uC9C0 \uC54A\uC740 \uC774\uBBF8\uC9C0\uAC00 \uC788\uC5B4\uC694. "\u2713 \uC800\uC7A5\uB428" \uD45C\uC2DC\uB97C \uAE30\uB2E4\uB9AC\uAC70\uB098, \uC548 \uB418\uBA74 \uC9C1\uC811 \uC5C5\uB85C\uB4DC\uD574 \uC8FC\uC138\uC694.';
      $downloadStatus.className = "action-status error";
      return false;
    }
    return true;
  }
  $downloadBtn.addEventListener("click", function() {
    if (!validateForExport()) return;
    var json = buildGalleryJson();
    var blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = state.id.trim() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 1e3);
    $downloadStatus.textContent = state.id.trim() + ".json \uD30C\uC77C\uC744 \uB2E4\uC6B4\uB85C\uB4DC\uD588\uC2B5\uB2C8\uB2E4.";
    $downloadStatus.className = "action-status ok";
  });
  $previewBtn.addEventListener("click", function() {
    if (!validateForExport()) return;
    var json = buildGalleryJson();
    buildShareFragment(json).then(function(fragment) {
      window.open("./index.html" + fragment, "_blank");
    }).catch(function() {
      $downloadStatus.textContent = "\uBBF8\uB9AC\uBCF4\uAE30 \uB9C1\uD06C \uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";
      $downloadStatus.className = "action-status error";
    });
  });
  $shareLinkBtn.addEventListener("click", function() {
    if (!validateForExport()) return;
    var json = buildGalleryJson();
    buildShareFragment(json).then(function(fragment) {
      var fullUrl;
      try {
        fullUrl = new URL("./index.html" + fragment, window.location.href).href;
      } catch (e) {
        fullUrl = "./index.html" + fragment;
      }
      renderShareResult(fullUrl);
    }).catch(function() {
      $shareStatus.textContent = "\uACF5\uC720 \uB9C1\uD06C \uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";
      $shareStatus.className = "action-status error";
    });
  });
  function renderShareResult(fullUrl) {
    $shareUrlInput.value = fullUrl;
    $shareResultWrap.style.display = "";
    if (fullUrl.length > SHARE_URL_WARN_LEN) {
      $shareLenMsg.textContent = "\uC8FC\uC18C \uAE38\uC774 " + fullUrl.length + "\uC790 \u2014 \uC791\uD488 \uC124\uBA85\uC744 \uC904\uC774\uAC70\uB098 JSON \uB2E4\uC6B4\uB85C\uB4DC \uBC29\uC2DD\uC744 \uC0AC\uC6A9\uD558\uC138\uC694.";
      $shareLenMsg.className = "field-msg error";
    } else {
      $shareLenMsg.textContent = "\uC8FC\uC18C \uAE38\uC774 " + fullUrl.length + "\uC790";
      $shareLenMsg.className = "field-msg";
    }
    $shareStatus.textContent = "\uACF5\uC720 \uB9C1\uD06C\uB97C \uC0DD\uC131\uD588\uC2B5\uB2C8\uB2E4.";
    $shareStatus.className = "action-status ok";
  }
  $copyShareBtn.addEventListener("click", function() {
    var text = $shareUrlInput.value;
    if (!text) return;
    function showCopyFail() {
      $shareStatus.textContent = "\uBCF5\uC0AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC8FC\uC18C\uB97C \uC9C1\uC811 \uC120\uD0DD\uD574 \uBCF5\uC0AC\uD574\uC8FC\uC138\uC694.";
      $shareStatus.className = "action-status error";
    }
    function showCopyOk() {
      $shareStatus.textContent = "\uB9C1\uD06C\uB97C \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4.";
      $shareStatus.className = "action-status ok";
    }
    function fallbackCopy() {
      $shareUrlInput.focus();
      $shareUrlInput.select();
      try {
        if (document.execCommand("copy")) {
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
  ctx.rerender = render;
  return { render };
}
export {
  createForm
};
