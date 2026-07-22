// @ts-nocheck — C단계 C-2 S3: studio-main IIFE에서 순수 이동(로직 1바이트 불변).
// 이 모듈이 studio의 영속·발행 SSOT다.
//
// 계약(불변):
//  · STORAGE_KEY = 'artshow-studio-draft-v1' — 로컬 초안 키. 절대 변경 금지.
//  · 갤러리 공유 코덱 wire format — artworks.js(보호파일) 디코더와 바이트 호환:
//      base64url(+→- /→_ ·패딩제거) · deflate-raw · '#gz='(압축)/'#gd='(무압축) 폴백.
//    artworks.js는 수정 금지 — 이 모듈이 인코더 SSOT이나 wire는 고정이다.
//
// 상태의존(scheduleSave/loadDraft/buildGalleryJson)은 createStorage(ctx)가 클로저로
// 반환한다. ctx.state는 단일 참조 — form이 변이한 그 객체를 storage가 같은 참조로 읽는다.

export var STORAGE_KEY = 'artshow-studio-draft-v1';

// scheme 판별: http(s)·프로토콜상대(//)는 외부 → 다운로드 필요. data:·상대경로·기존 dataURL은 통과.
export function isExternalUrl(u) { return /^https?:\/\//i.test(u) || /^\/\//.test(u); }

// ---------- 갤러리 공유 코덱 (artworks.js 디코더와 바이트 호환) ----------
// base64url-encode a gallery JSON object for the #gd= share link
export function encodeGalleryData(obj) {
  var json = JSON.stringify(obj);
  var bytes = new TextEncoder().encode(json);
  var bin = '';
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// deflate-raw 압축 발행 (#gz=) — 무압축(#gd=) 대비 URL이 절반 이하로 줄어
// 메신저의 긴 주소 잘림을 피한다. CompressionStream 미지원 브라우저는
// 호출부에서 무압축으로 폴백한다. 뷰어(artworks.js)는 두 규약 모두 읽는다.
export function encodeGalleryDataGz(obj) {
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
export function buildShareFragment(json) {
  if (typeof CompressionStream !== 'undefined') {
    return encodeGalleryDataGz(json).then(function (enc) { return '#gz=' + enc; });
  }
  return Promise.resolve('#gd=' + encodeGalleryData(json));
}

// ---------- 발행 JSON 조립 (순수) ----------
function pad2(n) {
  return n < 10 ? '0' + n : String(n);
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

// ---------- 상태의존 API (단일 ctx 참조) ----------
// ctx: { state, limits:{MAX_FEATURED,THEMES}, nextUid, scheduleSave, rerender }
// opts: { saveIndicator }  — 저장 인디케이터 DOM
export function createStorage(ctx, opts) {
  var $saveIndicator = opts.saveIndicator;
  var saveTimer = null;
  var indicatorTimer = null;

  function flashSaveIndicator() {
    $saveIndicator.classList.add('show');
    clearTimeout(indicatorTimer);
    indicatorTimer = setTimeout(function () {
      $saveIndicator.classList.remove('show');
    }, 1400);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx.state));
        flashSaveIndicator();
      } catch (e) {
        console.warn('로컬 저장 실패:', e);
      }
    }, 300);
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      var state = ctx.state;
      var THEMES = ctx.limits.THEMES;
      state.id = typeof parsed.id === 'string' ? parsed.id : '';
      state.name = typeof parsed.name === 'string' ? parsed.name : '';
      state.description = typeof parsed.description === 'string' ? parsed.description : '';
      state.theme = (typeof parsed.theme === 'string' && THEMES.indexOf(parsed.theme) !== -1) ? parsed.theme : 'daylight';
      state.artworks = Array.isArray(parsed.artworks) ? parsed.artworks.map(function (a) {
        return {
          _uid: ctx.nextUid(),
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

  function buildGalleryJson() {
    var state = ctx.state;
    var MAX_FEATURED = ctx.limits.MAX_FEATURED;
    var THEMES = ctx.limits.THEMES;
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

  ctx.scheduleSave = scheduleSave;
  return { scheduleSave: scheduleSave, loadDraft: loadDraft, buildGalleryJson: buildGalleryJson };
}
