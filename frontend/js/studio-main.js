import { readPlan, computeLimits, injectPlanBadge } from "./studio-plan.js";
import { createStorage } from "./studio-storage.js";
import { createForm } from "./studio-form.js";
(function() {
  "use strict";
  var plan = readPlan();
  var limits = computeLimits(plan.premium);
  injectPlanBadge(limits.PREMIUM);
  var state = {
    id: "",
    name: "",
    description: "",
    theme: "daylight",
    artworks: []
  };
  var uidCounter = 0;
  function nextUid() {
    uidCounter += 1;
    return "row-" + uidCounter;
  }
  var dom = {
    $id: document.getElementById("exhibitId"),
    $idMsg: document.getElementById("exhibitIdMsg"),
    $idPreviewInline: document.getElementById("idPreviewInline"),
    $name: document.getElementById("exhibitName"),
    $desc: document.getElementById("exhibitDesc"),
    $themeRadios: document.getElementById("themeGrid").querySelectorAll('input[name="theme"]'),
    $list: document.getElementById("artworkList"),
    $addBtn: document.getElementById("addArtworkBtn"),
    $countHint: document.getElementById("artworkCountHint"),
    $downloadBtn: document.getElementById("downloadBtn"),
    $previewBtn: document.getElementById("previewBtn"),
    $downloadStatus: document.getElementById("downloadStatus"),
    $urlPreviewFull: document.getElementById("urlPreviewFull"),
    $saveIndicator: document.getElementById("saveIndicator"),
    $shareLinkBtn: document.getElementById("shareLinkBtn"),
    $shareStatus: document.getElementById("shareStatus"),
    $shareResultWrap: document.getElementById("shareResultWrap"),
    $shareUrlInput: document.getElementById("shareUrlInput"),
    $shareLenMsg: document.getElementById("shareLenMsg"),
    $copyShareBtn: document.getElementById("copyShareBtn")
  };
  var ctx = { state, limits, nextUid, scheduleSave: null, rerender: null };
  var storage = createStorage(ctx, { saveIndicator: dom.$saveIndicator });
  createForm(ctx, { dom, storage });
  storage.loadDraft();
  ctx.rerender();
})();
