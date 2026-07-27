import {
  getProfile as authGetProfile,
  onAuthChange
} from "./auth.js";
const LU_CHIBI_LOOK_PREFIX = "lu-chibi-look::";
const LU_CHIBI_THUMB_PREFIX = "lu-chibi-thumb::";
const LU_CHIBI_CLOSET_PREFIX = "lu-chibi-closet::";
const LU_CHIBI_LEGACY_KEY = "lu-chibi-look-v1";
const LU_CHIBI_LEGACY_THUMB = "lu-chibi-look-thumb-v1";
const LU_CLOSET_MAX = 12;
function currentUserId() {
  const p = authGetProfile();
  return p && p.provider && p.name ? `${p.provider}:${p.name}` : "guest";
}
function chibiLookKey(uid) {
  return LU_CHIBI_LOOK_PREFIX + (uid || currentUserId());
}
function chibiThumbKey(uid) {
  return LU_CHIBI_THUMB_PREFIX + (uid || currentUserId());
}
function chibiClosetKey(uid) {
  return LU_CHIBI_CLOSET_PREFIX + (uid || currentUserId());
}
function migrateLegacyChibi() {
  try {
    const legacy = localStorage.getItem(LU_CHIBI_LEGACY_KEY);
    if (legacy && !localStorage.getItem(chibiLookKey("guest"))) {
      localStorage.setItem(chibiLookKey("guest"), legacy);
      const t = localStorage.getItem(LU_CHIBI_LEGACY_THUMB);
      if (t) localStorage.setItem(chibiThumbKey("guest"), t);
    }
  } catch (_) {
  }
}
migrateLegacyChibi();
function readStoredChibi(uid) {
  try {
    const raw = localStorage.getItem(chibiLookKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}
function saveStoredChibi(params, uid) {
  try {
    localStorage.setItem(chibiLookKey(uid), JSON.stringify(params));
    return true;
  } catch (_) {
    return false;
  }
}
function readStoredChibiThumb(uid) {
  try {
    return localStorage.getItem(chibiThumbKey(uid)) || "";
  } catch (_) {
    return "";
  }
}
function saveStoredChibiThumb(dataUrl, uid) {
  try {
    localStorage.setItem(chibiThumbKey(uid), dataUrl);
  } catch (_) {
  }
}
let sessionChibi = null;
function setSessionChibi(look) {
  sessionChibi = look;
}
function readActiveChibi() {
  return sessionChibi || readStoredChibi();
}
onAuthChange(() => {
  sessionChibi = null;
});
function readCloset(uid) {
  try {
    const raw = localStorage.getItem(chibiClosetKey(uid));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}
function saveCloset(list, uid) {
  try {
    localStorage.setItem(chibiClosetKey(uid), JSON.stringify(list));
    return true;
  } catch (_) {
    return false;
  }
}
function makeThumbDataUrl(sourceCanvas, w, h) {
  try {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.72);
  } catch (_) {
    return "";
  }
}
export {
  LU_CLOSET_MAX,
  currentUserId,
  makeThumbDataUrl,
  readActiveChibi,
  readCloset,
  readStoredChibi,
  readStoredChibiThumb,
  saveCloset,
  saveStoredChibi,
  saveStoredChibiThumb,
  setSessionChibi
};
