var STORAGE_KEY = "artshow-studio-draft-v1";
function isExternalUrl(u) {
  return /^https?:\/\//i.test(u) || /^\/\//.test(u);
}
function encodeGalleryData(obj) {
  var json = JSON.stringify(obj);
  var bytes = new TextEncoder().encode(json);
  var bin = "";
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function encodeGalleryDataGz(obj) {
  var jsonBytes = new TextEncoder().encode(JSON.stringify(obj));
  var stream = new Blob([jsonBytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Response(stream).arrayBuffer().then(function(buf) {
    var bytes = new Uint8Array(buf);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  });
}
function buildShareFragment(json) {
  if (typeof CompressionStream !== "undefined") {
    return encodeGalleryDataGz(json).then(function(enc) {
      return "#gz=" + enc;
    });
  }
  return Promise.resolve("#gd=" + encodeGalleryData(json));
}
function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}
function toArtworkEntry(a, id, featured) {
  var entry = {
    id,
    title: a.title.trim(),
    artist: a.artist.trim(),
    year: typeof a.year === "number" ? a.year : parseInt(a.year, 10) || (/* @__PURE__ */ new Date()).getFullYear(),
    desc: a.desc.trim(),
    // 방어심층: 미내장 외부 URL(http(s)://·//)은 발행물에서 비운다 — validateForExport가 1차 차단하나,
    // 어떤 경로로도 외부 URL이 공유 JSON에 새어 관람객 IP가 유출되지 않게 하는 최후 관문(캡션 폴백).
    imageUrl: isExternalUrl(a.imageUrl.trim()) ? "" : a.imageUrl.trim()
  };
  if (typeof a.ar === "number" && isFinite(a.ar) && a.ar > 0) entry.ar = a.ar;
  if (featured) entry.featured = true;
  return entry;
}
function createStorage(ctx, opts) {
  var $saveIndicator = opts.saveIndicator;
  var saveTimer = null;
  var indicatorTimer = null;
  function flashSaveIndicator() {
    $saveIndicator.classList.add("show");
    clearTimeout(indicatorTimer);
    indicatorTimer = setTimeout(function() {
      $saveIndicator.classList.remove("show");
    }, 1400);
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx.state));
        flashSaveIndicator();
      } catch (e) {
        console.warn("\uB85C\uCEEC \uC800\uC7A5 \uC2E4\uD328:", e);
      }
    }, 300);
  }
  function loadDraft() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      var state = ctx.state;
      var THEMES = ctx.limits.THEMES;
      state.id = typeof parsed.id === "string" ? parsed.id : "";
      state.name = typeof parsed.name === "string" ? parsed.name : "";
      state.description = typeof parsed.description === "string" ? parsed.description : "";
      state.theme = typeof parsed.theme === "string" && THEMES.indexOf(parsed.theme) !== -1 ? parsed.theme : "daylight";
      state.artworks = Array.isArray(parsed.artworks) ? parsed.artworks.map(function(a) {
        return {
          _uid: ctx.nextUid(),
          title: a.title || "",
          artist: a.artist || "",
          year: a.year || "",
          desc: a.desc || "",
          imageUrl: a.imageUrl || "",
          ar: typeof a.ar === "number" && isFinite(a.ar) && a.ar > 0 ? a.ar : void 0,
          _srcUrl: typeof a._srcUrl === "string" ? a._srcUrl : "",
          featured: !!a.featured
        };
      }) : [];
    } catch (e) {
      console.warn("\uC784\uC2DC \uC800\uC7A5 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4:", e);
    }
  }
  function buildGalleryJson() {
    var state = ctx.state;
    var MAX_FEATURED = ctx.limits.MAX_FEATURED;
    var THEMES = ctx.limits.THEMES;
    var normal = state.artworks.filter(function(a) {
      return !a.featured;
    });
    var featured = state.artworks.filter(function(a) {
      return a.featured;
    });
    if (normal.length > 12) {
      console.warn("\uC77C\uBC18 \uC791\uD488\uC774 12\uC810\uC744 \uCD08\uACFC\uD558\uC5EC \uCD08\uACFC\uBD84\uC740 \uBB34\uC2DC\uB429\uB2C8\uB2E4.");
      normal = normal.slice(0, 12);
    }
    if (featured.length > MAX_FEATURED) {
      console.warn("\uB300\uD45C\uC791\uC774 " + MAX_FEATURED + "\uC810\uC744 \uCD08\uACFC\uD558\uC5EC \uCD08\uACFC\uBD84\uC740 \uBB34\uC2DC\uB429\uB2C8\uB2E4.");
      featured = featured.slice(0, MAX_FEATURED);
    }
    var artworks = [];
    normal.forEach(function(a, i) {
      artworks.push(toArtworkEntry(a, "aw-" + pad2(i + 1), false));
    });
    featured.forEach(function(a, i) {
      artworks.push(toArtworkEntry(a, "aw-featured-" + pad2(i + 1), true));
    });
    return {
      id: state.id.trim(),
      name: state.name.trim(),
      description: state.description.trim(),
      theme: THEMES.indexOf(state.theme) !== -1 ? state.theme : "daylight",
      artworks
    };
  }
  ctx.scheduleSave = scheduleSave;
  return { scheduleSave, loadDraft, buildGalleryJson };
}
export {
  STORAGE_KEY,
  buildShareFragment,
  createStorage,
  encodeGalleryData,
  encodeGalleryDataGz,
  isExternalUrl
};
