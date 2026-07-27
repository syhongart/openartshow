import { AVATAR_COLORS } from "./config.js";
import { getPlacedArtworks } from "./artworks.js";
import {
  DEFAULT_CHIBI,
  encodeChibi
} from "./chibi.js";
import {
  PROVIDERS as AUTH_PROVIDERS,
  MOCK_NAMES as AUTH_MOCK_PREFILL,
  loginWith as authLoginWith,
  logout as authLogout,
  getProfile as authGetProfile,
  onAuthChange
} from "./auth.js";
import { el, injectStyles } from "./ui-dom.js";
import {
  readStoredChibi,
  readStoredChibiThumb,
  readActiveChibi
} from "./ui-chibi-store.js";
import { createChibiMaker } from "./ui-avatar-editor.js";
const MAX_CHAT_MESSAGES = 8;
const MAX_NICKNAME_LEN = 12;
let els = null;
let callbacks = { onEnter: null, onChatSend: null, onAvatarChange: null, onMakerToggle: null };
let selectedColor = AVATAR_COLORS[0];
const uiState = { chibiOpen: false, entered: false };
let currentArtworkId = null;
let initialized = false;
let lightboxOpen = false;
let onLightboxClose = null;
let lightboxCloseTimer = null;
let artworkListOpen = false;
let onArtworkSelect = null;
let guestbookOpen = false;
let onGuestbookSubmit = null;
let pendingGuestbookNotes = null;
const MAX_GUESTBOOK_TEXT = 120;
let tourHandlers = { onPrev: null, onNext: null, onExit: null, onToggleAuto: null };
const IS_TOUCH = typeof window !== "undefined" && "ontouchstart" in window || typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
let actionHandlers = { onTour: null, onViewArtwork: null, onGuestbook: null, onCapture: null, onSelfView: null };
let shareModalOpen = false;
let shareData = { blob: null, dataUrl: "", galleryName: "", shareUrl: "" };
let shareCopyTimer = null;
let pendingGalleryTitle = null;
let pendingPicker = null;
let pendingArtworkList = null;
function buildLoading() {
  const overlay = el("div", { id: "lu-loading", className: "lu" }, [
    el("div", { className: "lu-spinner" }),
    el("div", { className: "lu-loading-text", text: "MUSEUM LOADING..." })
  ]);
  document.body.appendChild(overlay);
  return overlay;
}
function buildLobby() {
  const title = el("div", { className: "lu-lobby-title", text: "OpenArtShow MUSEUM" });
  const sub = el("div", { className: "lu-lobby-sub", text: "VIRTUAL EXHIBITION" });
  const rule = el("div", { className: "lu-lobby-rule" });
  const authBox = el("div", { id: "lu-auth" });
  const socialWrap = el("div", { className: "lu-social-wrap" });
  const loggedWrap = el("div", { className: "lu-logged-wrap" });
  const buildSocialButtons = () => {
    socialWrap.textContent = "";
    for (const key of Object.keys(AUTH_PROVIDERS)) {
      const p = AUTH_PROVIDERS[key];
      const btn = el("button", {
        className: `lu-social-btn lu-social-${key}`,
        type: "button"
      }, [
        el("span", { className: "lu-social-badge", text: p.short }),
        el("span", { text: p.label })
      ]);
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.classList.add("lu-social-busy");
        try {
          await authLoginWith(key);
        } catch (_) {
        }
        btn.disabled = false;
        btn.classList.remove("lu-social-busy");
      });
      socialWrap.appendChild(btn);
    }
    socialWrap.appendChild(el("div", {
      className: "lu-social-note",
      text: "\uACC4\uC815 \uC5F0\uB3D9 \uC900\uBE44 \uC911 \u2014 \uC9C0\uAE08\uC740 \uD504\uB85C\uD544 \uBBF8\uB9AC\uBCF4\uAE30\uB85C \uB3D9\uC791\uD569\uB2C8\uB2E4"
    }));
  };
  const buildLoggedChip = (p) => {
    loggedWrap.textContent = "";
    const avatar = el("span", { className: "lu-logged-avatar", text: p.initial || p.name.slice(0, 1) });
    const name = el("span", { className: "lu-logged-name", text: `${p.name}\uB2D8` });
    const via = el("span", { className: "lu-logged-via", text: AUTH_PROVIDERS[p.provider] ? AUTH_PROVIDERS[p.provider].short : "" });
    const logoutBtn = el("button", { className: "lu-logout-btn", type: "button", text: "\uB85C\uADF8\uC544\uC6C3" });
    logoutBtn.addEventListener("click", () => authLogout());
    loggedWrap.appendChild(el("div", { className: "lu-logged-chip" }, [avatar, name, via, logoutBtn]));
  };
  const syncAuthUI = (p) => {
    if (p) {
      buildLoggedChip(p);
      socialWrap.style.display = "none";
      loggedWrap.style.display = "";
      nickInput.value = p.name.slice(0, MAX_NICKNAME_LEN);
    } else {
      socialWrap.style.display = "";
      loggedWrap.style.display = "none";
      if (!nickInput.value || Object.values(AUTH_MOCK_PREFILL).includes(nickInput.value)) {
        nickInput.value = "\uAC8C\uC2A4\uD2B8";
      }
    }
    syncChibiButtonVisual();
  };
  buildSocialButtons();
  authBox.appendChild(socialWrap);
  authBox.appendChild(loggedWrap);
  const orDivider = el("div", { className: "lu-auth-or" }, [
    el("span", { text: "\uC18C\uC15C \uACC4\uC815 \uC5F0\uB3D9 (\uC900\uBE44 \uC911)" })
  ]);
  const nickLabel = el("label", { className: "lu-field-label", for: "lu-nickname", text: "\uB2C9\uB124\uC784" });
  const nickInput = el("input", {
    id: "lu-nickname",
    type: "text",
    maxlength: String(MAX_NICKNAME_LEN),
    value: "\uAC8C\uC2A4\uD2B8",
    autocomplete: "off",
    spellcheck: "false"
  });
  const nickHint = el("div", { className: "lu-field-hint", text: `\uCD5C\uB300 ${MAX_NICKNAME_LEN}\uC790 \xB7 \uBE44\uC6CC\uB450\uBA74 '\uAC8C\uC2A4\uD2B8'\uB85C \uC785\uC7A5\uD569\uB2C8\uB2E4` });
  const charLabel = el("div", { className: "lu-field-label", text: "\uCE90\uB9AD\uD130", style: "margin-top:26px;" });
  const designBtn = el("button", {
    id: "lu-char-design",
    className: "lu-char-design-btn",
    type: "button",
    "aria-label": "\uCE90\uB9AD\uD130 \uB514\uC790\uC778 \u2014 \uB098\uB9CC\uC758 \uC544\uC57C\uBAA8 \uB9CC\uB4E4\uAE30"
  });
  function syncChibiButtonVisual() {
    const thumb = readStoredChibiThumb();
    designBtn.textContent = "";
    const media = el("span", { className: "lu-char-design-media" });
    if (thumb) {
      media.classList.add("lu-has-thumb");
      media.style.backgroundImage = `url('${thumb}')`;
    } else {
      media.textContent = "\u{1F3A8}";
    }
    const txt = el("span", { className: "lu-char-design-txt" }, [
      el("b", { text: "\uCE90\uB9AD\uD130 \uB514\uC790\uC778" }),
      el("span", { text: thumb ? "\uB0B4 \uC544\uC57C\uBAA8 \uD3B8\uC9D1\uD558\uAE30" : "\uB098\uB9CC\uC758 \uC544\uC57C\uBAA8 \uB9CC\uB4E4\uAE30 (\uC120\uD0DD)" })
    ]);
    designBtn.append(media, txt, el("span", { className: "lu-char-design-arrow", text: "\u203A" }));
  }
  syncChibiButtonVisual();
  designBtn.addEventListener("click", () => openChibiMaker());
  const enterBtn = el("button", { id: "lu-enter-btn", type: "button", text: "\uC785\uC7A5\uD558\uAE30" });
  const pickerBox = el("div", { id: "lu-picker" });
  const divider = el("div", { className: "lu-lobby-divider" });
  const studioLink = el("a", {
    className: "lu-studio-link",
    href: "./studio.html",
    target: "_blank",
    rel: "noopener noreferrer",
    text: "\uC791\uAC00 \uC2A4\uD29C\uB514\uC624\uC5D0\uC11C \uB098\uB9CC\uC758 \uC804\uC2DC \uB9CC\uB4E4\uAE30 \u2192"
  });
  const formWrap = el("div", { className: "lu-lobby-form" }, [
    nickLabel,
    nickInput,
    nickHint,
    charLabel,
    designBtn,
    enterBtn,
    orDivider,
    authBox
  ]);
  const quickEnter = el("div", { className: "lu-quick-enter" });
  function buildQuickEnter() {
    quickEnter.textContent = "";
    const prof = authGetProfile();
    const thumb = readStoredChibiThumb();
    const avatar = el("span", { className: "lu-quick-avatar" });
    if (thumb) avatar.style.backgroundImage = `url('${thumb}')`;
    else avatar.textContent = "\u{1F642}";
    const greet = el("div", { className: "lu-quick-greet" }, [
      el("b", { text: (prof ? `${prof.name}\uB2D8, ` : "") + "\uB2E4\uC2DC \uC624\uC168\uC5B4\uC694" }),
      el("span", { text: "\uC800\uC7A5\uD55C \uBAA8\uC2B5\uC73C\uB85C \uBC14\uB85C \uC785\uC7A5\uD560 \uC218 \uC788\uC5B4\uC694" })
    ]);
    const goBtn = el("button", { className: "lu-quick-btn", type: "button", text: "\uBC14\uB85C \uC785\uC7A5" });
    goBtn.addEventListener("click", submit);
    const changeBtn = el("button", { className: "lu-quick-change", type: "button", text: "\uB2C9\uB124\uC784\xB7\uCE90\uB9AD\uD130 \uBC14\uAFB8\uAE30" });
    changeBtn.addEventListener("click", () => {
      formWrap.classList.remove("lu-collapsed");
      quickEnter.style.display = "none";
      try {
        nickInput.focus();
      } catch (_) {
      }
    });
    quickEnter.append(avatar, greet, goBtn, changeBtn);
  }
  const isReturning = !!(authGetProfile() || readStoredChibi());
  if (isReturning) {
    buildQuickEnter();
    formWrap.classList.add("lu-collapsed");
  } else {
    quickEnter.style.display = "none";
  }
  const card = el("div", { className: "lu-lobby-card" }, [
    title,
    sub,
    rule,
    quickEnter,
    formWrap,
    pickerBox,
    divider,
    studioLink
  ]);
  const overlay = el("div", { id: "lu-lobby", className: "lu" }, [card]);
  document.body.appendChild(overlay);
  syncAuthUI(authGetProfile());
  onAuthChange(syncAuthUI);
  function submit() {
    let nickname = nickInput.value.trim().slice(0, MAX_NICKNAME_LEN);
    if (!nickname) nickname = "\uAC8C\uC2A4\uD2B8";
    let colorHash = 0;
    for (let i = 0; i < nickname.length; i++) colorHash = colorHash * 31 + nickname.charCodeAt(i) >>> 0;
    selectedColor = AVATAR_COLORS[colorHash % AVATAR_COLORS.length];
    const char = encodeChibi(Object.assign({}, DEFAULT_CHIBI, readActiveChibi() || {}));
    if (typeof callbacks.onEnter === "function") {
      callbacks.onEnter({ nickname, color: selectedColor, char });
    }
  }
  enterBtn.addEventListener("click", submit);
  nickInput.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") submit();
  });
  nickInput.addEventListener("keyup", (e) => e.stopPropagation());
  function onChibiSaved() {
    syncChibiButtonVisual();
  }
  return { overlay, nickInput, pickerBox, onChibiSaved };
}
function buildControls() {
  const rows = IS_TOUCH ? [
    ["\uC67C\uCABD \uB4DC\uB798\uADF8", "\uC774\uB3D9"],
    ["\uC624\uB978\uCABD \uB4DC\uB798\uADF8", "\uC2DC\uC810 \uD68C\uC804"],
    ["\uCE90\uB9AD\uD130 \uD0ED", "\uCF55 \uCC0C\uB974\uAE30"],
    ["\uC791\uD488 \uCE74\uB4DC", "\uD0ED\uD558\uC5EC \uD06C\uAC8C \uBCF4\uAE30"]
  ] : [
    ["\uB9C8\uC6B0\uC2A4 \uB4DC\uB798\uADF8", "\uC2DC\uC810 \uD68C\uC804"],
    ["W A S D", "\uC774\uB3D9"],
    ["Shift", "\uB2EC\uB9AC\uAE30"],
    ["Enter", "\uCC44\uD305"],
    ["M", "\uC791\uD488 \uBAA9\uB85D"],
    ["T", "\uD22C\uC5B4"],
    ["G", "\uBC29\uBA85\uB85D"],
    ["V", "\uB0B4 \uBAA8\uC2B5 \uBCF4\uAE30"],
    ["C", "\uCE90\uB9AD\uD130 \uB514\uC790\uC778"],
    ["P", "\uC0AC\uC9C4 \uCD2C\uC601"],
    ["\uD074\uB9AD", "\uCE90\uB9AD\uD130 \uCF55 \uCC0C\uB974\uAE30"]
  ];
  const panel = el("div", { id: "lu-controls", className: "lu lu-hud" });
  panel.appendChild(el("div", { className: "lu-controls-title", text: "CONTROLS" }));
  rows.forEach(([key, desc]) => {
    const row = el("div", {}, [
      el("span", { className: "lu-key", text: key }),
      el("span", { text: desc })
    ]);
    panel.appendChild(row);
  });
  document.body.appendChild(panel);
  if (IS_TOUCH) {
    panel.classList.add("lu-collapsed");
    const toggle = el("button", {
      id: "lu-controls-toggle",
      className: "lu lu-hud",
      type: "button",
      "aria-label": "\uC870\uC791\uBC95 \uBCF4\uAE30",
      text: "?"
    });
    toggle.addEventListener("click", () => {
      panel.classList.toggle("lu-collapsed");
    });
    document.body.appendChild(toggle);
  }
  return panel;
}
function buildMobileDock() {
  if (!IS_TOUCH) return null;
  function toggleChat() {
    const wrap = els && els.chat && els.chat.wrap;
    if (!wrap) return;
    const collapsed = wrap.classList.toggle("lu-chat-collapsed");
    if (!collapsed && els.chat.input) els.chat.input.focus();
    else if (els.chat.input) els.chat.input.blur();
    chatBtn.classList.toggle("lu-on", !collapsed);
  }
  const ICONS = {
    chat: '<path d="M20 15a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',
    tour: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z"/>',
    capture: '<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',
    more: '<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    list: '<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',
    self: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',
    help: '<path d="M9.2 9a2.9 2.9 0 1 1 4.2 2.6c-.9.45-1.4 1.05-1.4 2.1"/><circle cx="12" cy="17.4" r="1" fill="currentColor" stroke="none"/>',
    dress: '<path d="M9 4l3 3 3-3M9 4l-1.5 5 4.5 3 4.5-3L18 4M7.5 9l-2 8h13l-2-8"/>'
  };
  function svgIcon(name) {
    const span = document.createElement("span");
    span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + "</svg>";
    return span.firstChild;
  }
  function dockBtn(cls, aria, icon, label) {
    const b = el("button", { className: cls, type: "button", "aria-label": aria });
    b.appendChild(svgIcon(icon));
    b.appendChild(el("span", { className: "lu-dock-label", text: label }));
    const wrap = el("div", { className: "lu-dock-wrap" }, [b]);
    return { b, wrap };
  }
  const chat = dockBtn("lu-dock-btn", "\uCC44\uD305 \uC5F4\uAE30/\uB2EB\uAE30", "chat", "\uCC44\uD305");
  const chatBtn = chat.b;
  chat.wrap.style.display = "none";
  chatBtn.addEventListener("click", toggleChat);
  const tour = dockBtn("lu-dock-btn", "\uD22C\uC5B4 \uC2DC\uC791/\uC885\uB8CC", "tour", "\uD22C\uC5B4");
  const tourBtn = tour.b;
  tourBtn.addEventListener("click", () => {
    if (typeof actionHandlers.onTour === "function") actionHandlers.onTour();
  });
  const capture = dockBtn("lu-dock-btn lu-gold", "\uC0AC\uC9C4 \uCD2C\uC601", "capture", "\uCEA1\uCC98");
  const captureBtn = capture.b;
  captureBtn.addEventListener("click", () => {
    captureBtn.classList.remove("lu-cap-pop");
    void captureBtn.offsetWidth;
    captureBtn.classList.add("lu-cap-pop");
    if (typeof actionHandlers.onCapture === "function") actionHandlers.onCapture();
  });
  const more = dockBtn("lu-dock-btn", "\uB354\uBCF4\uAE30", "more", "\uBA54\uB274");
  const moreBtn = more.b;
  const backdrop = el("div", { id: "lu-more-backdrop" });
  const sheet = el("div", { id: "lu-more-sheet" });
  function closeSheet() {
    sheet.classList.remove("lu-open");
    backdrop.classList.remove("lu-open");
  }
  function sheetBtn(icon, label, fn) {
    const b = el("button", { className: "lu-sheet-btn", type: "button" });
    b.appendChild(svgIcon(icon));
    b.appendChild(el("span", { text: label }));
    b.addEventListener("click", () => {
      closeSheet();
      fn();
    });
    return b;
  }
  const grid = el("div", { className: "lu-sheet-grid" }, [
    sheetBtn("list", "\uC791\uD488 \uBAA9\uB85D", () => toggleArtworkList()),
    sheetBtn("self", "\uB0B4 \uBAA8\uC2B5", () => {
      if (typeof actionHandlers.onSelfView === "function") actionHandlers.onSelfView();
    }),
    sheetBtn("dress", "\uCE90\uB9AD\uD130 \uB514\uC790\uC778", () => openChibiMaker()),
    sheetBtn("chat", "\uCC44\uD305", toggleChat),
    sheetBtn("help", "\uC870\uC791\uBC95", () => {
      const panel = document.getElementById("lu-controls");
      if (panel) panel.classList.toggle("lu-collapsed");
    })
  ]);
  sheet.append(el("div", { className: "lu-sheet-handle" }), grid);
  backdrop.addEventListener("click", closeSheet);
  moreBtn.addEventListener("click", () => {
    const open = sheet.classList.toggle("lu-open");
    backdrop.classList.toggle("lu-open", open);
  });
  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
  const dock = el("div", { id: "lu-dock", className: "lu lu-hud" }, [chat.wrap, tour.wrap, capture.wrap, more.wrap]);
  document.body.appendChild(dock);
  dockRefs = { chatBtn, chatWrap: chat.wrap, tourBtn, selfBtn: null, dock };
  return dock;
}
let dockRefs = null;
function setDockActive(key, on) {
  if (!dockRefs) return;
  if (key === "tour" && dockRefs.tourBtn) dockRefs.tourBtn.classList.toggle("lu-on", !!on);
}
function buildTopRight() {
  const fps = el("span", { text: "--" });
  const fpsStat = el("div", { className: "lu-stat" });
  fpsStat.append("FPS ");
  const fpsB = el("b");
  fpsB.appendChild(fps);
  fpsStat.appendChild(fpsB);
  const wrap = el("div", { id: "lu-topright", className: "lu lu-hud" }, [fpsStat]);
  document.body.appendChild(wrap);
  return { wrap, fps, count: el("span"), countWrap: null };
}
function buildStatus() {
  const bar = el("div", { id: "lu-status", className: "lu lu-hud" });
  document.body.appendChild(bar);
  return bar;
}
function buildChat() {
  const log = el("div", { id: "lu-chat-log" });
  const input = el("input", {
    id: "lu-chat-input",
    type: "text",
    maxlength: "120",
    placeholder: IS_TOUCH ? "\uD0ED\uD558\uC5EC \uCC44\uD305\u2026" : "Enter \uD0A4\uB85C \uCC44\uD305\u2026",
    autocomplete: "off",
    spellcheck: "false"
  });
  const wrap = el("div", { id: "lu-chat", className: "lu lu-hud" }, [log, input]);
  if (IS_TOUCH) wrap.classList.add("lu-chat-collapsed");
  document.body.appendChild(wrap);
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      const text = input.value.trim();
      input.value = "";
      input.blur();
      if (text && typeof callbacks.onChatSend === "function") {
        callbacks.onChatSend(text);
      }
    } else if (e.key === "Escape") {
      input.value = "";
      input.blur();
    }
  });
  input.addEventListener("keyup", (e) => e.stopPropagation());
  input.addEventListener("keypress", (e) => e.stopPropagation());
  return { wrap, log, input };
}
function buildArtworkPanel() {
  const eyebrow = el("div", { className: "lu-art-eyebrow", text: "ARTWORK" });
  const title = el("div", { className: "lu-art-title" });
  const meta = el("div", { className: "lu-art-meta" });
  const rule = el("div", { className: "lu-art-rule" });
  const desc = el("div", { className: "lu-art-desc" });
  const hint = el("button", { className: "lu-art-hint", type: "button" });
  if (IS_TOUCH) {
    hint.appendChild(document.createTextNode("\uD06C\uAC8C \uBCF4\uAE30"));
  } else {
    hint.appendChild(el("span", { className: "lu-key", text: "E" }));
    hint.appendChild(document.createTextNode(" \u2014 \uD06C\uAC8C \uBCF4\uAE30"));
  }
  hint.addEventListener("click", (e) => {
    e.stopPropagation();
    if (typeof actionHandlers.onViewArtwork === "function") actionHandlers.onViewArtwork();
  });
  const panel = el("div", { id: "lu-artwork", className: "lu" }, [eyebrow, title, meta, rule, desc, hint]);
  if (IS_TOUCH) {
    panel.addEventListener("click", () => {
      if (typeof actionHandlers.onViewArtwork === "function") actionHandlers.onViewArtwork();
    });
  }
  document.body.appendChild(panel);
  return { panel, title, meta, desc };
}
function buildGalleryTitle() {
  const title = el("span", { className: "lu-topbar-title" });
  const count = el("b", { text: "1" });
  const countWrap = el("span", { className: "lu-topbar-count" });
  countWrap.appendChild(count);
  countWrap.append(" \uBA85");
  const bar = el("div", { id: "lu-topbar", className: "lu lu-hud lu-cut-s lu-empty" }, [
    title,
    el("span", { className: "lu-topbar-sep" }),
    countWrap
  ]);
  document.body.appendChild(bar);
  bar._count = count;
  bar._countWrap = countWrap;
  return bar;
}
function buildLightbox() {
  const closeBtn = el("button", {
    id: "lu-lightbox-close",
    type: "button",
    "aria-label": "\uB2EB\uAE30",
    text: "\xD7"
  });
  const stage = el("div", { className: "lu-lightbox-stage" });
  const titleEl = el("div", { className: "lu-lightbox-title" });
  const metaEl = el("div", { className: "lu-lightbox-meta" });
  const ruleEl = el("div", { className: "lu-lightbox-rule" });
  const descEl = el("div", { className: "lu-lightbox-desc" });
  const caption = el("div", { className: "lu-lightbox-caption" }, [titleEl, metaEl, ruleEl, descEl]);
  const overlay = el("div", { id: "lu-lightbox", className: "lu" }, [closeBtn, stage, caption]);
  document.body.appendChild(overlay);
  closeBtn.addEventListener("click", () => hideLightbox());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target === stage) hideLightbox();
  });
  const pointers = /* @__PURE__ */ new Map();
  let zScale = 1;
  let zTx = 0;
  let zTy = 0;
  let pinch0 = 0;
  let scale0 = 1;
  let lastTapT = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let swipe0 = null;
  function mediaEl() {
    return stage.querySelector(".lu-lightbox-media");
  }
  function applyZoom() {
    const media = mediaEl();
    if (media) media.style.transform = `translate(${zTx}px, ${zTy}px) scale(${zScale})`;
  }
  function resetZoom() {
    zScale = 1;
    zTx = 0;
    zTy = 0;
    applyZoom();
  }
  overlay.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) swipe0 = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
      scale0 = zScale;
    }
  });
  overlay.addEventListener("pointermove", (e) => {
    const pt = pointers.get(e.pointerId);
    if (!pt) return;
    const dx = e.clientX - pt.x;
    const dy = e.clientY - pt.y;
    pt.x = e.clientX;
    pt.y = e.clientY;
    if (pointers.size === 2 && pinch0 > 0) {
      const [a, b] = [...pointers.values()];
      zScale = Math.min(4, Math.max(1, scale0 * (Math.hypot(a.x - b.x, a.y - b.y) / pinch0)));
      if (zScale === 1) {
        zTx = 0;
        zTy = 0;
      }
      applyZoom();
    } else if (pointers.size === 1 && zScale > 1) {
      zTx += dx;
      zTy += dy;
      applyZoom();
    }
  });
  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size !== 0 || !swipe0) return;
    const dt = performance.now() - swipe0.t;
    const dx = e.clientX - swipe0.x;
    const dy = e.clientY - swipe0.y;
    swipe0 = null;
    if (zScale === 1 && dt < 600) {
      if (Math.abs(dx) > 64 && Math.abs(dy) < 56) {
        navLightbox(dx < 0 ? 1 : -1);
        return;
      }
      if (dy > 84 && Math.abs(dx) < 60) {
        hideLightbox();
        return;
      }
    }
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 350) {
      const now = performance.now();
      if (now - lastTapT < 320 && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 44) {
        if (zScale > 1) {
          resetZoom();
        } else {
          zScale = 2.4;
          applyZoom();
        }
        lastTapT = 0;
        return;
      }
      lastTapT = now;
      lastTapX = e.clientX;
      lastTapY = e.clientY;
    }
  }
  overlay.addEventListener("pointerup", endPointer);
  overlay.addEventListener("pointercancel", (e) => pointers.delete(e.pointerId));
  return { overlay, closeBtn, stage, title: titleEl, meta: metaEl, rule: ruleEl, desc: descEl, resetZoom };
}
let lightboxCurrentArt = null;
function navLightbox(dir) {
  const list = getPlacedArtworks();
  if (!lightboxCurrentArt || list.length < 2) return;
  const idx = list.indexOf(lightboxCurrentArt);
  const next = list[((idx === -1 ? 0 : idx) + dir + list.length) % list.length];
  showLightbox(next);
}
const ARTLIST_THUMB_FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#eaeae6"/></svg>'
);
function renderArtworkList(artworks) {
  const body = els.artworkList.body;
  body.innerHTML = "";
  if (!Array.isArray(artworks) || artworks.length === 0) {
    body.appendChild(el("div", { className: "lu-artlist-empty", text: "\uD45C\uC2DC\uD560 \uC791\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }));
    return;
  }
  artworks.forEach((art) => {
    const thumb = el("img", {
      className: "lu-artlist-thumb",
      src: art.imageUrl || ARTLIST_THUMB_FALLBACK,
      alt: art.title || "",
      loading: "lazy"
    });
    thumb.addEventListener("error", () => {
      thumb.src = ARTLIST_THUMB_FALLBACK;
    }, { once: true });
    const info = el("div", { className: "lu-artlist-info" }, [
      el("div", { className: "lu-artlist-name", text: art.title || "" }),
      el("div", { className: "lu-artlist-artist", text: art.artist || "" })
    ]);
    const card = el("button", { type: "button", className: "lu-artlist-card" }, [thumb, info]);
    card.addEventListener("click", () => {
      hideArtworkList();
      if (typeof onArtworkSelect === "function") onArtworkSelect(art);
    });
    body.appendChild(card);
  });
}
function buildArtworkList() {
  const closeBtn = el("button", { id: "lu-artlist-close", type: "button", "aria-label": "\uB2EB\uAE30", text: "\xD7" });
  const head = el("div", { id: "lu-artlist-head" }, [
    el("div", { id: "lu-artlist-title", text: "\uC791\uD488 \uBAA9\uB85D" }),
    closeBtn
  ]);
  const body = el("div", { id: "lu-artlist-body" });
  const panel = el("div", { id: "lu-artlist", className: "lu" }, [head, body]);
  document.body.appendChild(panel);
  closeBtn.addEventListener("click", () => hideArtworkList());
  return { panel, body };
}
function formatRelativeTime(ts) {
  const now = Date.now();
  const diffMs = Math.max(0, now - ts);
  const min = Math.floor(diffMs / 6e4);
  if (min < 1) return "\uBC29\uAE08 \uC804";
  if (min < 60) return `${min}\uBD84 \uC804`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}\uC2DC\uAC04 \uC804`;
  const d = new Date(ts);
  const n = new Date(now);
  const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(n) - startOfDay(d)) / 864e5);
  if (dayDiff <= 1) return "\uC5B4\uC81C";
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}
function renderGuestbookNotes(notes) {
  const body = els.guestbook.body;
  body.innerHTML = "";
  if (!Array.isArray(notes) || notes.length === 0) {
    body.appendChild(el("div", { className: "lu-gbook-empty", text: "\uCCAB \uBC29\uBA85\uB85D\uC744 \uB0A8\uACA8\uBCF4\uC138\uC694" }));
    return;
  }
  const DOT_COLORS = ["#e07a5f", "#81b29a", "#5f9e7d", "#8e7dbe", "#6a8caf", "#d68fb8"];
  notes.forEach((note) => {
    const name = note.name || "\uAC8C\uC2A4\uD2B8";
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = hash * 31 + name.charCodeAt(i) >>> 0;
    const dot = el("span", { className: "lu-gbook-dot" });
    dot.style.background = DOT_COLORS[hash % DOT_COLORS.length];
    const head = el("div", {}, [
      dot,
      el("span", { className: "lu-gbook-name", text: name }),
      el("span", { className: "lu-gbook-time", text: formatRelativeTime(note.ts) })
    ]);
    const text = el("div", { className: "lu-gbook-text", text: note.text || "" });
    body.appendChild(el("div", { className: "lu-gbook-note" }, [head, text]));
  });
}
function buildGuestbookPanel() {
  const closeBtn = el("button", { id: "lu-guestbook-close", type: "button", "aria-label": "\uB2EB\uAE30", text: "\xD7" });
  const head = el("div", { id: "lu-guestbook-head" }, [
    el("div", { id: "lu-guestbook-title" }, [
      el("span", { className: "lu-gb-eyebrow", text: "GUESTBOOK" }),
      el("span", { className: "lu-gb-main", text: "\uBC29\uBA85\uB85D" }),
      el("span", { className: "lu-gb-sub", text: "\uB2E4\uB140\uAC04 \uB9C8\uC74C\uC744 \uD55C \uC904 \uB0A8\uACA8 \uC8FC\uC138\uC694" })
    ]),
    closeBtn
  ]);
  const body = el("div", { id: "lu-guestbook-body" });
  const input = el("textarea", {
    id: "lu-gbook-input",
    rows: "3",
    maxlength: String(MAX_GUESTBOOK_TEXT),
    placeholder: "\uC804\uC2DC\uC5D0 \uD55C \uC904 \uBA54\uBAA8\uB97C \uB0A8\uACA8\uBCF4\uC138\uC694\u2026",
    spellcheck: "false"
  });
  const count = el("span", { className: "lu-gbook-count", text: `0/${MAX_GUESTBOOK_TEXT}` });
  const submitBtn = el("button", { id: "lu-gbook-submit", type: "button", text: "\uB0A8\uAE30\uAE30" });
  submitBtn.disabled = true;
  const footerRow = el("div", { className: "lu-gbook-footer-row" }, [count, submitBtn]);
  const statsLine = el("div", {
    id: "lu-gbook-stats",
    style: "font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.45);padding:6px 2px 0;"
  });
  const footer = el("div", { id: "lu-guestbook-footer" }, [input, footerRow, statsLine]);
  const tab = el("button", {
    id: "lu-gbtab",
    type: "button",
    "aria-label": "\uBC29\uBA85\uB85D \uC5F4\uAE30/\uB2EB\uAE30 (\uC704\uC544\uB798\uB85C \uB4DC\uB798\uADF8\uD574 \uC704\uCE58 \uC774\uB3D9)",
    title: "\uB4DC\uB798\uADF8\uD574\uC11C \uC704\uCE58\uB97C \uC62E\uAE38 \uC218 \uC788\uC5B4\uC694",
    text: "\uBC29\uBA85\uB85D"
  });
  const GBTAB_TOP_KEY = "lu-gbtab-top-v1";
  try {
    const saved = parseFloat(localStorage.getItem(GBTAB_TOP_KEY) ?? "");
    if (Number.isFinite(saved)) tab.style.top = clampTabTop(saved) + "px";
  } catch (_) {
  }
  function clampTabTop(px) {
    const max = Math.max(80, (window.innerHeight || 800) - 140);
    return Math.min(max, Math.max(60, px));
  }
  let tabDrag = null;
  tab.addEventListener("pointerdown", (e) => {
    const rect = tab.getBoundingClientRect();
    tabDrag = { startY: e.clientY, startTop: rect.top, moved: false };
    tab.setPointerCapture(e.pointerId);
  });
  tab.addEventListener("pointermove", (e) => {
    if (!tabDrag) return;
    const dy = e.clientY - tabDrag.startY;
    if (Math.abs(dy) > 6) tabDrag.moved = true;
    if (tabDrag.moved) tab.style.top = clampTabTop(tabDrag.startTop + dy) + "px";
  });
  const endTabDrag = () => {
    if (tabDrag && tabDrag.moved) {
      try {
        localStorage.setItem(GBTAB_TOP_KEY, String(parseFloat(tab.style.top)));
      } catch (_) {
      }
    }
    setTimeout(() => {
      tabDrag = null;
    }, 0);
  };
  tab.addEventListener("pointerup", endTabDrag);
  tab.addEventListener("pointercancel", endTabDrag);
  tab.addEventListener("click", () => {
    if (tabDrag && tabDrag.moved) return;
    toggleGuestbook();
  });
  const panel = el("div", { id: "lu-guestbook", className: "lu" }, [head, body, footer, tab]);
  document.body.appendChild(panel);
  closeBtn.addEventListener("click", () => hideGuestbook());
  function updateCount() {
    const len = input.value.length;
    count.textContent = `${len}/${MAX_GUESTBOOK_TEXT}`;
    submitBtn.disabled = input.value.trim().length === 0;
  }
  function submit() {
    const text = input.value.trim().slice(0, MAX_GUESTBOOK_TEXT);
    if (!text) return;
    input.value = "";
    updateCount();
    input.blur();
    if (typeof onGuestbookSubmit === "function") onGuestbookSubmit(text);
  }
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      input.value = "";
      updateCount();
      input.blur();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  });
  input.addEventListener("keyup", (e) => e.stopPropagation());
  input.addEventListener("keypress", (e) => e.stopPropagation());
  input.addEventListener("input", updateCount);
  submitBtn.addEventListener("click", submit);
  return { panel, body, input, count, submitBtn, tab };
}
function buildTourBar() {
  const prevBtn = el("button", { type: "button", "aria-label": "\uC774\uC804 \uC791\uD488", text: "\u25C0 \uC774\uC804" });
  const sep1 = el("span", { className: "lu-tour-sep" });
  const countEl = el("span", { className: "lu-tour-count" });
  const titleEl = el("span", { className: "lu-tour-title" });
  const sep2 = el("span", { className: "lu-tour-sep" });
  const nextBtn = el("button", { type: "button", "aria-label": "\uB2E4\uC74C \uC791\uD488", text: "\uB2E4\uC74C \u25B6" });
  const sep3 = el("span", { className: "lu-tour-sep" });
  const autoBtn = el("button", { type: "button", className: "lu-tour-auto" });
  const sep4 = el("span", { className: "lu-tour-sep" });
  const exitBtn = el("button", { id: "lu-tourbar-exit", type: "button", "aria-label": "\uD22C\uC5B4 \uC885\uB8CC", text: "\u2715 \uC885\uB8CC" });
  const bar = el("div", { id: "lu-tourbar", className: "lu" }, [
    prevBtn,
    sep1,
    countEl,
    titleEl,
    sep2,
    nextBtn,
    sep3,
    autoBtn,
    sep4,
    exitBtn
  ]);
  document.body.appendChild(bar);
  prevBtn.addEventListener("click", () => {
    if (tourHandlers.onPrev) tourHandlers.onPrev();
  });
  nextBtn.addEventListener("click", () => {
    if (tourHandlers.onNext) tourHandlers.onNext();
  });
  exitBtn.addEventListener("click", () => {
    if (tourHandlers.onExit) tourHandlers.onExit();
  });
  autoBtn.addEventListener("click", () => {
    if (tourHandlers.onToggleAuto) tourHandlers.onToggleAuto();
  });
  return { bar, prevBtn, nextBtn, autoBtn, exitBtn, countEl, titleEl };
}
function buildShutter() {
  const overlay = el("div", { id: "lu-shutter", className: "lu" });
  document.body.appendChild(overlay);
  return overlay;
}
function buildShareModal() {
  const closeBtn = el("button", { id: "lu-share-close", type: "button", "aria-label": "\uB2EB\uAE30", text: "\xD7" });
  const title = el("div", { className: "lu-share-title", text: "\uC804\uC2DC \uACF5\uC720\uD558\uAE30" });
  const preview = el("img", { className: "lu-share-preview", alt: "\uCEA1\uCC98\uD55C \uC804\uC2DC \uD654\uBA74" });
  const deviceBtn = el("button", { className: "lu-share-btn lu-share-btn-primary", type: "button", text: "\uAE30\uAE30\uB85C \uACF5\uC720" });
  const saveBtn = el("button", { className: "lu-share-btn", type: "button", text: "\uC774\uBBF8\uC9C0 \uC800\uC7A5" });
  const xBtn = el("button", { className: "lu-share-btn", type: "button", text: "X\uC5D0 \uACF5\uC720" });
  const threadsBtn = el("button", { className: "lu-share-btn", type: "button", text: "Threads\uC5D0 \uACF5\uC720" });
  const copyBtn = el("button", { className: "lu-share-btn", type: "button", text: "\uB9C1\uD06C \uBCF5\uC0AC" });
  const actions = el("div", { className: "lu-share-actions" }, [deviceBtn, saveBtn, xBtn, threadsBtn, copyBtn]);
  const hint = el("div", {
    className: "lu-share-hint",
    text: "\uC778\uC2A4\uD0C0\uADF8\uB7A8\uC740 \uC774\uBBF8\uC9C0\uB97C \uC800\uC7A5\uD558\uAC70\uB098 \uAE30\uAE30\uB85C \uACF5\uC720\uD55C \uB4A4 \uC571\uC5D0\uC11C \uC62C\uB824\uC8FC\uC138\uC694"
  });
  const card = el("div", { className: "lu-share-card" }, [closeBtn, title, preview, actions, hint]);
  const overlay = el("div", { id: "lu-share", className: "lu" }, [card]);
  document.body.appendChild(overlay);
  closeBtn.addEventListener("click", () => hideShareModal());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideShareModal();
  });
  deviceBtn.addEventListener("click", async () => {
    if (!shareData.blob || typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    try {
      const file = new File([shareData.blob], "artshow.png", { type: "image/png" });
      await navigator.share({
        files: [file],
        title: shareData.galleryName || "OpenArtShow",
        text: `${shareData.galleryName || "OpenArtShow"} \u2014 OpenArtShow 3D \uC804\uC2DC`
      });
    } catch (_) {
    }
  });
  saveBtn.addEventListener("click", () => {
    if (!shareData.dataUrl) return;
    const a = document.createElement("a");
    a.href = shareData.dataUrl;
    a.download = "artshow.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
  xBtn.addEventListener("click", () => {
    const text = `${shareData.galleryName || "OpenArtShow"} \u2014 OpenArtShow 3D \uC804\uC2DC`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareData.shareUrl || "")}`;
    window.open(url, "_blank", "noopener");
  });
  threadsBtn.addEventListener("click", () => {
    const text = `${shareData.galleryName || "OpenArtShow"} \u2014 OpenArtShow 3D \uC804\uC2DC ${shareData.shareUrl || ""}`;
    const url = `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener");
  });
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareData.shareUrl || "");
      if (shareCopyTimer) clearTimeout(shareCopyTimer);
      copyBtn.textContent = "\uBCF5\uC0AC\uB428";
      copyBtn.classList.add("lu-share-btn-copied");
      shareCopyTimer = setTimeout(() => {
        copyBtn.textContent = "\uB9C1\uD06C \uBCF5\uC0AC";
        copyBtn.classList.remove("lu-share-btn-copied");
        shareCopyTimer = null;
      }, 1600);
    } catch (_) {
    }
  });
  return { overlay, card, title, preview, deviceBtn, saveBtn, xBtn, threadsBtn, copyBtn };
}
function openChibiMaker() {
  if (!els || !els.chibiMaker) return;
  if (uiState.chibiOpen || lightboxOpen || shareModalOpen || guestbookOpen || artworkListOpen) return;
  els.chibiMaker.open();
}
function closeChibiMaker() {
  if (els && els.chibiMaker) els.chibiMaker.close();
}
function bindGlobalKeys() {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (uiState.chibiOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeChibiMaker();
        return;
      }
      if (shareModalOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        hideShareModal();
        return;
      }
      if (lightboxOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        hideLightbox();
        return;
      }
      if (artworkListOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        hideArtworkList();
        return;
      }
      if (guestbookOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        hideGuestbook();
        return;
      }
      return;
    }
    if (lightboxOpen || shareModalOpen) return;
    if (!uiState.entered) return;
    const active = document.activeElement;
    const typing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
    if (typing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      els.chat.input.focus();
    } else if ((e.key === "c" || e.key === "C" || e.key === "\u314A") && !uiState.chibiOpen) {
      e.preventDefault();
      e.stopPropagation();
      openChibiMaker();
    }
  });
}
function initUI({ onEnter, onChatSend, onAvatarChange, onMakerToggle } = {}) {
  if (initialized) {
    callbacks.onEnter = onEnter || callbacks.onEnter;
    callbacks.onChatSend = onChatSend || callbacks.onChatSend;
    callbacks.onAvatarChange = onAvatarChange || callbacks.onAvatarChange;
    callbacks.onMakerToggle = onMakerToggle || callbacks.onMakerToggle;
    return;
  }
  initialized = true;
  callbacks.onEnter = onEnter || null;
  callbacks.onChatSend = onChatSend || null;
  callbacks.onAvatarChange = onAvatarChange || null;
  callbacks.onMakerToggle = onMakerToggle || null;
  injectStyles();
  els = {
    loading: buildLoading(),
    lobby: buildLobby(),
    controls: buildControls(),
    topRight: buildTopRight(),
    status: buildStatus(),
    chat: buildChat(),
    artwork: buildArtworkPanel(),
    galleryTitle: buildGalleryTitle(),
    lightbox: buildLightbox(),
    artworkList: buildArtworkList(),
    guestbook: buildGuestbookPanel(),
    tourBar: buildTourBar(),
    dock: buildMobileDock(),
    shutter: buildShutter(),
    share: buildShareModal()
  };
  els.chibiMaker = createChibiMaker({ els, state: uiState, callbacks, setStatus });
  els.topRight.count = els.galleryTitle._count;
  els.topRight.countWrap = els.galleryTitle._countWrap;
  bindGlobalKeys();
  if (pendingGalleryTitle !== null) applyGalleryTitle(pendingGalleryTitle);
  if (pendingPicker) applyGalleryPicker(pendingPicker.galleries, pendingPicker.currentId, pendingPicker.onPick);
  if (pendingArtworkList) renderArtworkList(pendingArtworkList);
  if (pendingGuestbookNotes) renderGuestbookNotes(pendingGuestbookNotes);
}
function showLoading(show) {
  if (!els) return;
  els.loading.classList.toggle("lu-hidden", !show);
}
function hideLobby() {
  if (!els) return;
  uiState.entered = true;
  els.lobby.overlay.classList.add("lu-hidden");
  els.controls.classList.add("lu-visible");
  els.topRight.wrap.classList.add("lu-visible");
  els.status.classList.add("lu-visible");
  els.chat.wrap.classList.add("lu-visible");
  els.galleryTitle.classList.add("lu-visible");
  els.guestbook.tab.classList.add("lu-visible");
  if (els.dock) els.dock.classList.add("lu-visible");
  const controlsToggle = document.getElementById("lu-controls-toggle");
  if (controlsToggle) controlsToggle.classList.add("lu-visible");
}
function showArtworkInfo(art) {
  if (!els || !art) return;
  if (currentArtworkId === art.id && els.artwork.panel.classList.contains("lu-open")) {
    return;
  }
  currentArtworkId = art.id;
  els.artwork.title.textContent = art.title || "";
  els.artwork.meta.textContent = [art.artist, art.year].filter(Boolean).join(" \xB7 ");
  els.artwork.desc.textContent = art.desc || "";
  els.artwork.panel.classList.add("lu-open");
}
function hideArtworkInfo() {
  if (!els) return;
  currentArtworkId = null;
  els.artwork.panel.classList.remove("lu-open");
}
function addChatMessage(name, text, isSelf) {
  if (!els) return;
  const msg = el("div", { className: "lu-chat-msg" + (isSelf ? " lu-self" : "") }, [
    el("span", { className: "lu-chat-name", text: name }),
    el("span", { text })
  ]);
  els.chat.log.appendChild(msg);
  while (els.chat.log.children.length > MAX_CHAT_MESSAGES) {
    els.chat.log.removeChild(els.chat.log.firstChild);
  }
}
function setPlayerCount(n) {
  if (!els) return;
  const prev = els.topRight.count.textContent;
  els.topRight.count.textContent = String(n);
  if (prev !== String(n) && els.topRight.countWrap) {
    els.topRight.countWrap.classList.remove("lu-tick");
    void els.topRight.countWrap.offsetWidth;
    els.topRight.countWrap.classList.add("lu-tick");
  }
  if (dockRefs && dockRefs.chatWrap) dockRefs.chatWrap.style.display = n >= 2 ? "" : "none";
}
function setStatus(text) {
  if (!els) return;
  els.status.textContent = text || "";
}
function setFPS(n) {
  if (!els) return;
  els.topRight.fps.textContent = String(Math.round(n));
}
function applyGalleryTitle(name) {
  els.galleryTitle.querySelector(".lu-topbar-title").textContent = name || "";
  els.galleryTitle.classList.toggle("lu-empty", !name);
}
function setGalleryTitle(name) {
  pendingGalleryTitle = name || "";
  if (!els) return;
  applyGalleryTitle(pendingGalleryTitle);
}
function applyGalleryPicker(galleries, currentId, onPick) {
  const box = els.lobby.pickerBox;
  box.innerHTML = "";
  if (!Array.isArray(galleries) || galleries.length === 0) return;
  const label = el("div", {
    className: "lu-field-label",
    text: "\uC804\uC2DC \uC120\uD0DD",
    style: "margin-top:26px;"
  });
  box.appendChild(label);
  if (currentId === null || currentId === void 0) {
    box.appendChild(el("div", { className: "lu-picker-note", text: "\uACF5\uC720\uB41C \uC804\uC2DC \uAD00\uB78C \uC911" }));
  }
  const list = el("div", { className: "lu-picker-list" });
  galleries.forEach((g) => {
    const isCurrent = g.id === currentId;
    const item = el("button", {
      type: "button",
      className: "lu-picker-item" + (isCurrent ? " lu-picker-current" : "")
    }, [
      el("div", { className: "lu-picker-name", text: g.name || g.id }),
      el("div", {
        className: "lu-picker-meta",
        text: [g.artist, typeof g.count === "number" ? `${g.count}\uC810` : null].filter(Boolean).join(" \xB7 ")
      })
    ]);
    if (isCurrent) item.disabled = true;
    item.addEventListener("click", () => {
      if (isCurrent) return;
      if (typeof onPick === "function") onPick(g.id);
    });
    list.appendChild(item);
  });
  box.appendChild(list);
}
function initGalleryPicker(galleries, currentId, onPick) {
  pendingPicker = { galleries, currentId: currentId ?? null, onPick };
  if (!els) return;
  applyGalleryPicker(pendingPicker.galleries, pendingPicker.currentId, pendingPicker.onPick);
}
function clearLightboxMedia() {
  const stage = els.lightbox.stage;
  const media = stage.firstChild;
  if (media && media.tagName === "VIDEO") {
    media.pause();
    media.removeAttribute("src");
    media.load();
  }
  stage.innerHTML = "";
}
function showLightbox(art) {
  if (!els || !art) return;
  lightboxCurrentArt = art;
  if (els.lightbox.resetZoom) els.lightbox.resetZoom();
  if (lightboxCloseTimer) {
    clearTimeout(lightboxCloseTimer);
    lightboxCloseTimer = null;
  }
  clearLightboxMedia();
  let media;
  if (art.videoUrl) {
    media = el("video", {
      className: "lu-lightbox-media",
      src: art.videoUrl,
      controls: "controls",
      autoplay: "autoplay",
      loop: "loop",
      muted: "muted",
      playsinline: "playsinline"
    });
    media.muted = true;
  } else {
    media = el("img", {
      className: "lu-lightbox-media",
      src: art.imageUrl || "",
      alt: art.title || ""
    });
  }
  els.lightbox.stage.appendChild(media);
  els.lightbox.title.textContent = art.title || "";
  els.lightbox.meta.textContent = [art.artist, art.year].filter(Boolean).join(" \xB7 ");
  els.lightbox.desc.textContent = art.desc || "";
  lightboxOpen = true;
  els.lightbox.overlay.classList.add("lu-open");
}
function hideLightbox() {
  if (!els || !lightboxOpen) return;
  lightboxOpen = false;
  els.lightbox.overlay.classList.remove("lu-open");
  if (lightboxCloseTimer) clearTimeout(lightboxCloseTimer);
  lightboxCloseTimer = setTimeout(() => {
    clearLightboxMedia();
    lightboxCloseTimer = null;
  }, 340);
  if (typeof onLightboxClose === "function") onLightboxClose();
}
function isLightboxOpen() {
  return lightboxOpen;
}
function setOnLightboxClose(cb) {
  onLightboxClose = typeof cb === "function" ? cb : null;
}
function initArtworkList(artworks, onSelect) {
  onArtworkSelect = typeof onSelect === "function" ? onSelect : null;
  pendingArtworkList = artworks;
  if (!els) return;
  renderArtworkList(pendingArtworkList);
}
function toggleArtworkList() {
  if (!els) return;
  if (artworkListOpen) {
    hideArtworkList();
  } else {
    artworkListOpen = true;
    els.artworkList.panel.classList.add("lu-open");
  }
}
function hideArtworkList() {
  if (!els || !artworkListOpen) return;
  artworkListOpen = false;
  els.artworkList.panel.classList.remove("lu-open");
}
function isArtworkListOpen() {
  return artworkListOpen;
}
function showTourBar({ index, total, title, autoOn } = {}) {
  if (!els) return;
  const t = els.tourBar;
  const pos = Number.isFinite(index) ? index + 1 : 1;
  const tot = Number.isFinite(total) ? total : 0;
  t.countEl.textContent = `\u25CF ${pos} / ${tot}`;
  t.titleEl.textContent = ` \u2014 ${title || ""}`;
  t.autoBtn.textContent = autoOn ? "\uC790\uB3D9\uC9C4\uD589 ON" : "\uC790\uB3D9\uC9C4\uD589 OFF";
  t.autoBtn.classList.toggle("lu-tour-on", !!autoOn);
  t.bar.classList.add("lu-open");
}
function hideTourBar() {
  if (!els) return;
  els.tourBar.bar.classList.remove("lu-open");
}
function setActionHandlers({ onTour, onViewArtwork, onGuestbook, onCapture, onSelfView } = {}) {
  actionHandlers = {
    onTour: typeof onTour === "function" ? onTour : null,
    onViewArtwork: typeof onViewArtwork === "function" ? onViewArtwork : null,
    onGuestbook: typeof onGuestbook === "function" ? onGuestbook : null,
    onCapture: typeof onCapture === "function" ? onCapture : null,
    onSelfView: typeof onSelfView === "function" ? onSelfView : null
  };
}
function showShareModal({ blob, dataUrl, galleryName, shareUrl } = {}) {
  if (!els) return;
  shareData = {
    blob: blob || null,
    dataUrl: dataUrl || "",
    galleryName: galleryName || "",
    shareUrl: shareUrl || (typeof window !== "undefined" ? window.location.href : "")
  };
  els.share.preview.src = shareData.dataUrl;
  let canDeviceShare = false;
  if (shareData.blob && typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function") {
    try {
      const file = new File([shareData.blob], "artshow.png", { type: "image/png" });
      canDeviceShare = navigator.canShare({ files: [file] });
    } catch (_) {
      canDeviceShare = false;
    }
  }
  els.share.deviceBtn.style.display = canDeviceShare ? "" : "none";
  if (shareCopyTimer) {
    clearTimeout(shareCopyTimer);
    shareCopyTimer = null;
  }
  els.share.copyBtn.textContent = "\uB9C1\uD06C \uBCF5\uC0AC";
  els.share.copyBtn.classList.remove("lu-share-btn-copied");
  shareModalOpen = true;
  els.share.overlay.classList.add("lu-open");
}
function hideShareModal() {
  if (!els || !shareModalOpen) return;
  shareModalOpen = false;
  els.share.overlay.classList.remove("lu-open");
}
function isShareModalOpen() {
  return shareModalOpen;
}
function flashShutter() {
  if (!els) return;
  const s = els.shutter;
  s.style.transition = "none";
  s.style.opacity = "1";
  void s.offsetWidth;
  s.style.transition = "opacity 0.25s ease";
  s.style.opacity = "0";
}
function setTourHandlers({ onPrev, onNext, onExit, onToggleAuto } = {}) {
  tourHandlers = {
    onPrev: typeof onPrev === "function" ? onPrev : null,
    onNext: typeof onNext === "function" ? onNext : null,
    onExit: typeof onExit === "function" ? onExit : null,
    onToggleAuto: typeof onToggleAuto === "function" ? onToggleAuto : null
  };
}
function setGuestbookStats(text) {
  const line = document.getElementById("lu-gbook-stats");
  if (line) line.textContent = text || "";
}
function initGuestbook({ onSubmit } = {}) {
  onGuestbookSubmit = typeof onSubmit === "function" ? onSubmit : null;
}
function toggleGuestbook() {
  if (!els) return;
  if (guestbookOpen) {
    hideGuestbook();
  } else {
    guestbookOpen = true;
    els.guestbook.panel.classList.add("lu-open");
  }
}
function hideGuestbook() {
  if (!els || !guestbookOpen) return;
  guestbookOpen = false;
  els.guestbook.panel.classList.remove("lu-open");
}
function isGuestbookOpen() {
  return guestbookOpen;
}
function setGuestbookNotes(notes) {
  pendingGuestbookNotes = Array.isArray(notes) ? notes : [];
  if (!els) return;
  renderGuestbookNotes(pendingGuestbookNotes);
}
export {
  addChatMessage,
  flashShutter,
  hideArtworkInfo,
  hideArtworkList,
  hideGuestbook,
  hideLightbox,
  hideLobby,
  hideShareModal,
  hideTourBar,
  initArtworkList,
  initGalleryPicker,
  initGuestbook,
  initUI,
  isArtworkListOpen,
  isGuestbookOpen,
  isLightboxOpen,
  isShareModalOpen,
  setActionHandlers,
  setDockActive,
  setFPS,
  setGalleryTitle,
  setGuestbookNotes,
  setGuestbookStats,
  setOnLightboxClose,
  setPlayerCount,
  setStatus,
  setTourHandlers,
  showArtworkInfo,
  showLightbox,
  showLoading,
  showShareModal,
  showTourBar,
  toggleArtworkList,
  toggleGuestbook
};
