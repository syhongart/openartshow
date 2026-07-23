import * as THREE from "three";
import { createAvatarInstance } from "./avatar.js";
import { getProfile as authGetProfile } from "./auth.js";
import { el, GOLD } from "./ui-dom.js";
import {
  DEFAULT_CHIBI,
  CHIBI_HAIR_STYLES,
  CHIBI_EYE_STYLES,
  CHIBI_MOUTH_STYLES,
  CHIBI_BEARD_STYLES,
  CHIBI_BOTTOM_TYPES,
  CHIBI_ACCESSORIES,
  CHIBI_FACE_SHAPES,
  CHIBI_SPECIES,
  CHIBI_GENDERS,
  CHIBI_TOP_PATTERNS,
  CHIBI_OUTFITS,
  CHIBI_PRESETS,
  CHIBI_PRESET_GROUPS,
  CHIBI_ACTION_DUR,
  SPECIES_PRESET,
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  CHIBI_CLOTH_COLORS,
  encodeChibi,
  normalizeChibi
} from "./chibi.js";
import {
  LU_CLOSET_MAX,
  currentUserId,
  readActiveChibi,
  readCloset,
  saveCloset,
  saveStoredChibi,
  saveStoredChibiThumb,
  setSessionChibi,
  makeThumbDataUrl
} from "./ui-chibi-store.js";
let makerActiveTab = "shape";
let makerRebuildTimer = null;
let makerPreviewRAF = null;
let makerPreviewLastT = 0;
let makerDragging = false;
let makerDragLastX = 0;
let chibiParams = null;
let chibiPreviewInstance = null;
let chibiPreviewRAF = null;
let chibiPreviewLastT = 0;
let chibiDragging = false;
let chibiDragLastX = 0;
let chibiSwingT = 0;
let chibiSwingBase = Math.PI;
const CHIBI_SWING_AMPLITUDE = THREE.MathUtils.degToRad(18);
const CHIBI_SWING_SPEED = 0.6;
const ICON_LEAF = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 19.5C4.5 10 11 4 20 4c0 9-6 15.5-15.5 15.5A1 1 0 0 1 4.5 19.5Z"/><path d="M6.7 17.3C10.2 13.3 14.2 9.3 18 5.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>';
const CHIBI_NAV_CATS = [
  { id: "species", label: "\uC885\uC871", icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8.3" r="2.1"/><circle cx="12" cy="6.1" r="2.1"/><circle cx="17" cy="8.3" r="2.1"/><path d="M12 11.6c-3.4 0-6.1 2.4-6.1 5.2 0 2 1.8 3.3 3.7 2.6.9-.3 1.7-.3 2.6 0 1.9.7 3.7-.6 3.7-2.6 0-2.8-2.5-5.2-5.9-5.2Z"/></svg>' },
  { id: "face", label: "\uC5BC\uAD74", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><path d="M8.6 14.6c1 1.1 2.1 1.7 3.4 1.7s2.4-.6 3.4-1.7"/></svg>' },
  { id: "hair", label: "\uD5E4\uC5B4", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12.5C5 8 8.1 4.5 12 4.5s7 3.5 7 8"/><path d="M6.3 12.5v3.2M10.1 12.5v4.2M13.9 12.5v4.2M17.7 12.5v3.2"/></svg>' },
  { id: "outfit", label: "\uC758\uC0C1", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8.3 4.2 4.3 7.3l2 3 2-1.1v9.6h7.4V9.2l2 1.1 2-3-4-3.1c-.7 1-1.8 1.6-3.7 1.6s-3-.6-3.7-1.6Z"/></svg>' },
  { id: "acc", label: "\uC7A5\uC2DD", icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.5 3.5 1.7 6.3 5.2 7.6-3.5 1.3-4.7 4.1-5.2 7.6-.5-3.5-1.7-6.3-5.2-7.6C10.3 9.3 11.5 6.5 12 3Z"/><circle cx="19" cy="5.2" r="1.2"/></svg>' },
  { id: "closet", label: "\uC637\uC7A5", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.3"/><path d="M12 5.9v1.8"/><path d="M12 7.7 4.3 13.4h15.4L12 7.7Z"/><path d="M4.3 17.4h15.4"/></svg>' }
];
function createChibiMaker(ctx) {
  const { els, state, callbacks, setStatus } = ctx;
  const saveV = el("button", { id: "lu-am-save", type: "button", "aria-label": "\uC774 \uCE90\uB9AD\uD130 \uC0AC\uC6A9", title: "\uC774 \uCE90\uB9AD\uD130 \uC0AC\uC6A9", text: "\u2713" });
  const closeX = el("button", { id: "lu-am-close", type: "button", "aria-label": "\uB2EB\uAE30", text: "\xD7" });
  const titleIcon = el("span", { className: "lu-am-title-icon", "aria-hidden": "true" });
  titleIcon.innerHTML = ICON_LEAF;
  const title = el("div", { className: "lu-am-title" }, [titleIcon, el("span", { text: "\uCE90\uB9AD\uD130 \uB514\uC790\uC778" })]);
  const headActions = el("div", { className: "lu-am-head-actions" }, [saveV, closeX]);
  const head = el("div", { className: "lu-am-head" }, [title, headActions]);
  const canvas = el("canvas", { width: "300", height: "400" });
  const stage = el("div", { className: "lu-am-stage" }, [canvas]);
  const stageWrap = el("div", { className: "lu-am-stagewrap" }, [stage]);
  const previewBox = el("div", { className: "lu-am-preview" }, [stageWrap]);
  const CHIBI_AUTO_ACTIONS = ["wave", "jump", "clap", "dance", "breakdance", "run", "jumpingjack", "heart", "kick"];
  let chibiAutoActClock = 1;
  let previewRenderer = null;
  let previewScene = null;
  let previewCamera = null;
  let previewRotator = null;
  function makePreviewBackdrop(topHex, bottomHex) {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 256;
    const ctx2d = c.getContext("2d");
    const g = ctx2d.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, topHex);
    g.addColorStop(1, bottomHex);
    ctx2d.fillStyle = g;
    ctx2d.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function makeWallTex(base, stripe) {
    if (typeof document === "undefined") return null;
    const w = 512, h = 307, c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.fillStyle = base;
    x.fillRect(0, 0, w, h);
    const count = 28, period = w / count;
    x.fillStyle = stripe;
    for (let i = 0; i < count; i++) x.fillRect(i * period, 0, period / 2, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function ensurePreviewRenderer() {
    if (previewRenderer) return;
    previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(Math.min(2, typeof window !== "undefined" && window.devicePixelRatio || 1));
    previewRenderer.setSize(300, 400, false);
    previewRenderer.shadowMap.enabled = true;
    previewRenderer.shadowMap.type = THREE.VSMShadowMap;
    previewRenderer.toneMapping = THREE.NoToneMapping;
    previewRenderer.toneMappingExposure = 1;
    previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    previewScene = new THREE.Scene();
    previewScene.background = makePreviewBackdrop("#f0ead9", "#ddd2bd") || new THREE.Color("#ddd2bd");
    previewScene.fog = new THREE.Fog(14603199, 5.5, 10);
    previewCamera = new THREE.PerspectiveCamera(30, 300 / 400, 0.1, 20);
    previewCamera.position.set(0, 1, 4);
    previewCamera.lookAt(0, 0.85, 0);
    previewScene.add(new THREE.HemisphereLight(16775924, 2367256, 0.65));
    const key = new THREE.DirectionalLight(16777215, 1.4);
    key.position.set(0.7, 2, 2.6);
    previewScene.add(key);
    const fill = new THREE.DirectionalLight(16776696, 0.4);
    fill.position.set(-1.8, 1.1, 1.6);
    previewScene.add(fill);
    const shadowLight = new THREE.DirectionalLight(16777215, 0);
    shadowLight.position.set(0.4, 5, 1);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(512, 512);
    shadowLight.shadow.camera.near = 0.5;
    shadowLight.shadow.camera.far = 9;
    shadowLight.shadow.camera.left = -1.3;
    shadowLight.shadow.camera.right = 1.3;
    shadowLight.shadow.camera.top = 1.3;
    shadowLight.shadow.camera.bottom = -1.3;
    shadowLight.shadow.radius = 35;
    shadowLight.shadow.blurSamples = 24;
    shadowLight.shadow.bias = -5e-4;
    previewScene.add(shadowLight);
    previewScene.add(shadowLight.target);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshStandardMaterial({ color: 12165231, roughness: 0.9, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    previewScene.add(ground);
    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = 2e-3;
    shadowCatcher.material.polygonOffset = true;
    shadowCatcher.material.polygonOffsetFactor = -1;
    shadowCatcher.receiveShadow = true;
    previewScene.add(shadowCatcher);
    const wallpaperTex = makeWallTex("#e2d7bf", "#efe7d3");
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 6),
      new THREE.MeshStandardMaterial({ map: wallpaperTex, roughness: 0.9, metalness: 0 })
    );
    wall.position.set(0, 2.2, -2.3);
    previewScene.add(wall);
    previewRotator = new THREE.Group();
    previewRotator.rotation.y = Math.PI;
    previewScene.add(previewRotator);
  }
  let activeCat = "species";
  const nav = el("div", { className: "lu-am-nav", role: "tablist", "aria-label": "\uCE90\uB9AD\uD130 \uB514\uC790\uC778 \uCE74\uD14C\uACE0\uB9AC" });
  const panel = el("div", { className: "lu-am-panel" });
  const page = el("div", { className: "lu-am-tabpage", id: "lu-am-tabpanel", role: "tabpanel", tabindex: "0" });
  panel.appendChild(nav);
  panel.appendChild(page);
  nav.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const tabs = [...nav.querySelectorAll(".lu-am-navtab")];
    if (!tabs.length) return;
    const cur = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    let next = cur < 0 ? 0 : cur;
    if (e.key === "ArrowLeft") next = (cur - 1 + tabs.length) % tabs.length;
    else if (e.key === "ArrowRight") next = (cur + 1) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    e.preventDefault();
    tabs[next].click();
    const after = nav.querySelectorAll(".lu-am-navtab")[next];
    if (after) after.focus();
  });
  const body = el("div", { className: "lu-am-body" }, [previewBox, panel]);
  const card = el("div", { className: "lu-am-card" }, [head, body]);
  const overlay = el("div", { id: "lu-chibi-maker", className: "lu" }, [card]);
  document.body.appendChild(overlay);
  function setParam(key, value) {
    if (!chibiParams) return;
    chibiParams[key] = value;
    if (key === "species" && value !== "human" && SPECIES_PRESET[value]) {
      Object.assign(chibiParams, SPECIES_PRESET[value]);
    }
    chibiParams = normalizeChibi(chibiParams);
    rebuildPreview();
    renderPanel();
  }
  function applyPreset(look) {
    chibiParams = normalizeChibi(Object.assign({}, look));
    rebuildPreview();
    renderPanel();
  }
  function presetRow() {
    for (const grp of CHIBI_PRESET_GROUPS) {
      const items = CHIBI_PRESETS.filter((pre) => (pre.cat || "human") === grp.id);
      if (!items.length) continue;
      page.appendChild(el("div", { className: "lu-am-section-title", text: `${grp.name} (${items.length})` }));
      const row = el("div", { className: "lu-am-tabs lu-am-presets" });
      for (const pre of items) {
        const btn = el("button", { type: "button", className: "lu-am-tab lu-am-preset" });
        const c1 = pre.look.skin || DEFAULT_CHIBI.skin;
        const c2 = pre.look.top || pre.look.hairColor || DEFAULT_CHIBI.top;
        const dot = el("span", { className: "lu-am-preset-dot", "aria-hidden": "true" });
        dot.style.background = `conic-gradient(${c1} 0deg 180deg, ${c2} 180deg 360deg)`;
        btn.appendChild(dot);
        btn.appendChild(el("span", { className: "lu-am-preset-label", text: pre.name }));
        btn.addEventListener("click", () => applyPreset(pre.look));
        row.appendChild(btn);
      }
      page.appendChild(row);
    }
  }
  function speciesLabel(id) {
    const s = CHIBI_SPECIES.find((x) => x.id === id);
    return s && s.name || "\uC544\uC57C\uBAA8";
  }
  function closetRow() {
    if (!authGetProfile()) return;
    const uid = currentUserId();
    groupTitle("\uB0B4 \uC637\uC7A5");
    const saveNew = el("button", {
      type: "button",
      className: "lu-am-btn lu-closet-save",
      text: "\uFF0B \uC9C0\uAE08 \uBAA8\uC2B5 \uC637\uC7A5\uC5D0 \uC800\uC7A5"
    });
    saveNew.addEventListener("click", () => {
      const list2 = readCloset(uid);
      if (list2.length >= LU_CLOSET_MAX) {
        setStatus(`\uC637\uC7A5\uC740 \uCD5C\uB300 ${LU_CLOSET_MAX}\uBC8C\uAE4C\uC9C0 \uC800\uC7A5\uD560 \uC218 \uC788\uC5B4\uC694`);
        return;
      }
      const slot = {
        id: "c" + Date.now(),
        name: speciesLabel(chibiParams.species),
        look: JSON.parse(JSON.stringify(chibiParams)),
        thumb: snapshotThumb(120, 160),
        ts: Date.now()
      };
      list2.push(slot);
      if (!saveCloset(list2, uid)) {
        setStatus("\uC800\uC7A5 \uACF5\uAC04\uC774 \uBD80\uC871\uD574\uC694 \u2014 \uC637\uC7A5\uC5D0\uC11C \uBA87 \uBC8C\uC744 \uC9C0\uC6CC \uC8FC\uC138\uC694");
        return;
      }
      renderPanel();
    });
    page.appendChild(saveNew);
    const list = readCloset(uid);
    if (!list.length) {
      page.appendChild(el("div", { className: "lu-closet-empty", text: "\uC544\uC9C1 \uC800\uC7A5\uD55C \uC637\uC774 \uC5C6\uC5B4\uC694. \uB9C8\uC74C\uC5D0 \uB4DC\uB294 \uBAA8\uC2B5\uC744 \uC800\uC7A5\uD574 \uB450\uC138\uC694." }));
      return;
    }
    const grid = el("div", { className: "lu-closet-grid" });
    list.forEach((slot) => {
      const cell = el("div", { className: "lu-closet-cell" });
      const load = el("button", {
        type: "button",
        className: "lu-closet-load",
        title: `${slot.name} \uBD88\uB7EC\uC624\uAE30`,
        "aria-label": `${slot.name} \uBD88\uB7EC\uC624\uAE30`
      });
      if (slot.thumb) load.style.backgroundImage = `url('${slot.thumb}')`;
      load.appendChild(el("span", { className: "lu-closet-name", text: slot.name }));
      load.addEventListener("click", () => applyPreset(slot.look));
      const del = el("button", {
        type: "button",
        className: "lu-closet-del",
        text: "\xD7",
        title: "\uC0AD\uC81C",
        "aria-label": `${slot.name} \uC0AD\uC81C`
      });
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        const next = readCloset(uid).filter((s) => s.id !== slot.id);
        saveCloset(next, uid);
        renderPanel();
      });
      cell.appendChild(load);
      cell.appendChild(del);
      grid.appendChild(cell);
    });
    page.appendChild(grid);
  }
  const boolOpts = (a, b) => [{ id: false, name: a }, { id: true, name: b }];
  function chipRow(labelText, options, key) {
    page.appendChild(el("div", { className: "lu-am-section-title", text: labelText }));
    const row = el("div", { className: "lu-am-tabs" });
    options.forEach((opt) => {
      const btn = el("button", {
        type: "button",
        className: "lu-am-tab" + (chibiParams[key] === opt.id ? " lu-selected" : ""),
        text: opt.name
      });
      btn.addEventListener("click", () => setParam(key, opt.id));
      row.appendChild(btn);
    });
    page.appendChild(row);
  }
  function swatchRow(labelText, palette, key) {
    page.appendChild(el("div", { className: "lu-am-section-title", text: labelText }));
    const row = el("div", { className: "lu-swatches" });
    palette.forEach((hex) => {
      const swatch = el("button", {
        type: "button",
        className: "lu-swatch" + (chibiParams[key] === hex ? " lu-selected" : ""),
        style: `background:${hex};`,
        title: hex,
        "aria-label": `${labelText} ${hex}`
      });
      swatch.addEventListener("click", () => setParam(key, hex));
      row.appendChild(swatch);
    });
    page.appendChild(row);
  }
  function groupTitle(text) {
    const row = el("div", { className: "lu-am-group-title" });
    const icon = el("span", { className: "lu-am-group-icon", "aria-hidden": "true" });
    icon.innerHTML = ICON_LEAF;
    row.appendChild(icon);
    row.appendChild(el("span", { text }));
    page.appendChild(row);
  }
  function renderNav() {
    nav.textContent = "";
    const showCloset = !!authGetProfile();
    const cats = CHIBI_NAV_CATS.filter((c) => c.id !== "closet" || showCloset);
    if (!cats.some((c) => c.id === activeCat)) activeCat = "species";
    cats.forEach((cat) => {
      const selected = activeCat === cat.id;
      const btn = el("button", {
        type: "button",
        role: "tab",
        id: "lu-am-tab-" + cat.id,
        className: "lu-am-navtab" + (selected ? " lu-selected" : ""),
        "aria-selected": selected ? "true" : "false",
        "aria-controls": "lu-am-tabpanel",
        tabindex: selected ? "0" : "-1",
        // 로빙 탭인덱스 — 선택 탭만 Tab 포커스 대상
        "aria-label": cat.label
      });
      btn.innerHTML = cat.icon;
      btn.appendChild(el("span", { className: "lu-am-navtab-label", text: cat.label }));
      btn.addEventListener("click", () => {
        if (activeCat === cat.id) return;
        activeCat = cat.id;
        renderPanel();
        page.scrollTop = 0;
      });
      nav.appendChild(btn);
    });
    page.setAttribute("aria-labelledby", "lu-am-tab-" + activeCat);
  }
  function renderPanel() {
    renderNav();
    page.textContent = "";
    if (!chibiParams) return;
    const isAnimal = chibiParams.species && chibiParams.species !== "human";
    if (activeCat === "species") {
      presetRow();
      groupTitle(isAnimal ? "\uC885\uC871 \xB7 \uD138\uC0C9" : "\uC885\uC871 \xB7 \uC131\uBCC4 \xB7 \uD53C\uBD80\uC0C9");
      chipRow("\uC885\uC871", CHIBI_SPECIES, "species");
      if (!isAnimal) chipRow("\uC131\uBCC4", CHIBI_GENDERS, "gender");
      swatchRow(isAnimal ? "\uD138 \uC0C9" : "\uD53C\uBD80\uC0C9", SKIN_TONES, "skin");
    } else if (activeCat === "face") {
      groupTitle("\uC5BC\uAD74");
      chipRow("\uC5BC\uAD74\uD615", CHIBI_FACE_SHAPES, "face");
      chipRow("\uB208", CHIBI_EYE_STYLES, "eyeStyle");
      chipRow("\uC785", CHIBI_MOUTH_STYLES, "mouth");
      if (!isAnimal) chipRow("\uC218\uC5FC", CHIBI_BEARD_STYLES, "beardStyle");
      chipRow("\uBCFC\uD130\uCE58", boolOpts("\uC5C6\uC74C", "\uC788\uC74C"), "blush");
      swatchRow("\uB208\uB3D9\uC790 \uC0C9", EYE_COLORS, "eyeColor");
    } else if (activeCat === "hair") {
      if (!isAnimal) {
        groupTitle("\uD5E4\uC5B4");
        chipRow("\uD5E4\uC5B4", CHIBI_HAIR_STYLES, "hairStyle");
        swatchRow("\uBA38\uB9AC \uC0C9", HAIR_COLORS, "hairColor");
      } else {
        groupTitle("\uD3EC\uC778\uD2B8");
        swatchRow("\uADC0\xB7\uAF2C\uB9AC \uC0C9", HAIR_COLORS, "hairColor");
      }
    } else if (activeCat === "outfit") {
      groupTitle("\uC758\uC0C1");
      chipRow("\uC0C1\uC758 \uD328\uD134", CHIBI_TOP_PATTERNS, "pattern");
      chipRow("\uC758\uC0C1 \uC138\uD2B8", CHIBI_OUTFITS, "outfit");
      chipRow("\uD558\uC758", CHIBI_BOTTOM_TYPES, "bottomType");
      swatchRow("\uC0C1\uC758 \uC0C9", CHIBI_CLOTH_COLORS, "top");
      swatchRow("\uD558\uC758 \uC0C9", CHIBI_CLOTH_COLORS, "bottom");
      swatchRow("\uC2E0\uBC1C \uC0C9", CHIBI_CLOTH_COLORS, "shoes");
    } else if (activeCat === "acc") {
      groupTitle("\uC7A5\uC2DD");
      chipRow("\uBA38\uB9AC \uC7A5\uC2DD", CHIBI_ACCESSORIES, "acc");
      chipRow("\uC548\uACBD", boolOpts("\uC5C6\uC74C", "\uCC29\uC6A9"), "glasses");
      chipRow("\uD5E4\uC77C\uB85C", boolOpts("\uC5C6\uC74C", "\uC788\uC74C"), "halo");
      chipRow("\uB0A0\uAC1C", boolOpts("\uC5C6\uC74C", "\uC788\uC74C"), "wings");
      chipRow("\uAC00\uC2B4 \uD558\uD2B8", boolOpts("\uC5C6\uC74C", "\uC788\uC74C"), "heart");
    } else if (activeCat === "closet") {
      closetRow();
    }
  }
  function rebuildPreview() {
    if (!chibiParams || !previewRotator) return;
    if (chibiPreviewInstance) {
      previewRotator.remove(chibiPreviewInstance.group);
      chibiPreviewInstance.dispose();
      chibiPreviewInstance = null;
    }
    chibiPreviewInstance = createAvatarInstance(encodeChibi(chibiParams), GOLD, " ", { blobShadow: false });
    chibiPreviewInstance.group.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    previewRotator.add(chibiPreviewInstance.group);
  }
  function previewFrame(t) {
    chibiPreviewRAF = requestAnimationFrame(previewFrame);
    const raw = chibiPreviewLastT ? (t - chibiPreviewLastT) / 1e3 : 0;
    const delta = Math.min(0.1, raw);
    chibiPreviewLastT = t;
    if (!chibiDragging) {
      chibiSwingT += delta;
      previewRotator.rotation.y = chibiSwingBase + Math.sin(chibiSwingT * CHIBI_SWING_SPEED) * CHIBI_SWING_AMPLITUDE;
      chibiAutoActClock -= raw;
      if (chibiAutoActClock <= 0 && chibiPreviewInstance && typeof chibiPreviewInstance.playAction === "function") {
        const name = CHIBI_AUTO_ACTIONS[Math.floor(Math.random() * CHIBI_AUTO_ACTIONS.length)];
        chibiPreviewInstance.playAction(name);
        chibiAutoActClock = (CHIBI_ACTION_DUR[name] || 1.5) + 0.6 + Math.random() * 0.9;
      }
    }
    if (chibiPreviewInstance) chibiPreviewInstance.update(delta, 0);
    previewRenderer.render(previewScene, previewCamera);
  }
  function startLoop() {
    if (chibiPreviewRAF) return;
    chibiPreviewLastT = 0;
    chibiPreviewRAF = requestAnimationFrame(previewFrame);
  }
  function stopLoop() {
    if (chibiPreviewRAF) cancelAnimationFrame(chibiPreviewRAF);
    chibiPreviewRAF = null;
  }
  canvas.addEventListener("pointerdown", (e) => {
    chibiDragging = true;
    chibiDragLastX = e.clientX;
    previewBox.classList.add("lu-dragging");
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!chibiDragging) return;
    previewRotator.rotation.y += (e.clientX - chibiDragLastX) * 0.012;
    chibiDragLastX = e.clientX;
  });
  const endDrag = () => {
    chibiDragging = false;
    previewBox.classList.remove("lu-dragging");
    chibiSwingBase = previewRotator.rotation.y;
    chibiSwingT = 0;
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  closeX.addEventListener("click", () => close());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  function snapshotThumb(w, h) {
    try {
      if (!previewRenderer) return "";
      previewRenderer.render(previewScene, previewCamera);
      return makeThumbDataUrl(canvas, w, h) || previewRenderer.domElement.toDataURL("image/png");
    } catch (_) {
      return "";
    }
  }
  function syncSaveGate() {
    const loggedIn = !!authGetProfile();
    const label = loggedIn ? "\uC800\uC7A5\uD558\uACE0 \uC0AC\uC6A9" : "\uC774 \uCE90\uB9AD\uD130 \uC0AC\uC6A9";
    saveV.setAttribute("aria-label", label);
    saveV.title = label;
  }
  saveV.addEventListener("click", () => {
    if (!chibiParams) return;
    const look = JSON.parse(JSON.stringify(chibiParams));
    setSessionChibi(look);
    const loggedIn = !!authGetProfile();
    if (loggedIn) {
      const ok = saveStoredChibi(look);
      const thumb = snapshotThumb(150, 200);
      if (thumb) saveStoredChibiThumb(thumb);
      if (!ok) setStatus("\uC800\uC7A5 \uACF5\uAC04\uC774 \uBD80\uC871\uD574\uC694 \u2014 \uC637\uC7A5\uC5D0\uC11C \uBA87 \uBC8C\uC744 \uC9C0\uC6CC \uC8FC\uC138\uC694");
    }
    if (els && els.lobby) els.lobby.onChibiSaved();
    if (state.entered && typeof callbacks.onAvatarChange === "function") {
      callbacks.onAvatarChange(encodeChibi(look));
    }
    if (!loggedIn) setStatus("\uC774 \uCE90\uB9AD\uD130\uB85C \uC801\uC6A9\uD588\uC5B4\uC694 \xB7 \uD68C\uC6D0\uAC00\uC785\uD558\uBA74 \uC800\uC7A5\uB3FC\uC694");
    close();
  });
  function open() {
    activeCat = "species";
    chibiParams = normalizeChibi(Object.assign({}, DEFAULT_CHIBI, readActiveChibi() || {}));
    syncSaveGate();
    ensurePreviewRenderer();
    previewRotator.rotation.y = Math.PI;
    chibiSwingBase = Math.PI;
    chibiSwingT = 0;
    chibiAutoActClock = 1;
    rebuildPreview();
    renderPanel();
    overlay.classList.add("lu-open");
    state.chibiOpen = true;
    startLoop();
    if (typeof callbacks.onMakerToggle === "function") callbacks.onMakerToggle(true);
  }
  function close() {
    overlay.classList.remove("lu-open");
    state.chibiOpen = false;
    stopLoop();
    if (chibiPreviewInstance) {
      previewRotator.remove(chibiPreviewInstance.group);
      chibiPreviewInstance.dispose();
      chibiPreviewInstance = null;
    }
    if (typeof callbacks.onMakerToggle === "function") callbacks.onMakerToggle(false);
  }
  return { open, close };
}
export {
  createChibiMaker
};
