// @ts-nocheck — C단계 C-2: studio.html 외부화(S0) + SRP 재분해(S1~S4). 로직 1바이트 불변.
// 이 파일은 엔트리다 — DOM refs 수집 · 단일 state/StudioContext 생성 · 모듈 배선 · init.
// 실제 기능은 studio-plan(플랜)·studio-image(이미지/모달)·studio-storage(영속·코덱 SSOT)·
// studio-form(렌더·폼·이벤트)에 있다. strict 타입 정합은 별도 후속(studio strict화).
import { readPlan, computeLimits, injectPlanBadge, injectPlanLimits } from './studio-plan.js';
import { createStorage } from './studio-storage.js';
import { createForm } from './studio-form.js';

(function () {
  'use strict';

  // ---- 플랜(studio-plan.ts): 한도/테마 상수 계산 + 배지 주입 ----
  var plan = readPlan();
  var limits = computeLimits(plan.premium);
  injectPlanBadge(limits.PREMIUM);
  // 한도 안내도 여기서 채운다 — HTML 에 숫자를 적으면 무료/프리미엄 한쪽이 거짓이 된다.
  injectPlanLimits(limits);

  // ---- 단일 state 참조 ----
  // form이 변이하고 storage가 직렬화하는 그 하나의 객체. 아래 StudioContext로 참조 주입(복사 금지).
  var state = {
    id: '',
    name: '',
    description: '',
    theme: 'daylight',
    artworks: []
  };

  var uidCounter = 0;
  function nextUid() { uidCounter += 1; return 'row-' + uidCounter; }

  // ---- DOM refs ----
  var dom = {
    $id: document.getElementById('exhibitId'),
    $idMsg: document.getElementById('exhibitIdMsg'),
    $idPreviewInline: document.getElementById('idPreviewInline'),
    $name: document.getElementById('exhibitName'),
    $desc: document.getElementById('exhibitDesc'),
    $themeRadios: document.getElementById('themeGrid').querySelectorAll('input[name="theme"]'),
    $list: document.getElementById('artworkList'),
    $addBtn: document.getElementById('addArtworkBtn'),
    $countHint: document.getElementById('artworkCountHint'),
    $downloadBtn: document.getElementById('downloadBtn'),
    $previewBtn: document.getElementById('previewBtn'),
    $downloadStatus: document.getElementById('downloadStatus'),
    $urlPreviewFull: document.getElementById('urlPreviewFull'),
    $saveIndicator: document.getElementById('saveIndicator'),
    $shareLinkBtn: document.getElementById('shareLinkBtn'),
    $shareStatus: document.getElementById('shareStatus'),
    $shareResultWrap: document.getElementById('shareResultWrap'),
    $shareUrlInput: document.getElementById('shareUrlInput'),
    $shareLenMsg: document.getElementById('shareLenMsg'),
    $copyShareBtn: document.getElementById('copyShareBtn')
  };

  // ---- StudioContext: state 단일 참조로 각 모듈에 주입(복사 금지) ----
  // scheduleSave는 storage가, rerender는 form이 여기에 채운다.
  var ctx = { state: state, limits: limits, nextUid: nextUid, scheduleSave: null, rerender: null };

  var storage = createStorage(ctx, { saveIndicator: dom.$saveIndicator });
  createForm(ctx, { dom: dom, storage: storage });

  // ---- init ----
  storage.loadDraft();
  ctx.rerender();
})();
