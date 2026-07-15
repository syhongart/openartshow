// ytembed.js — 유튜브 임베드 안전 계층 (격리 모듈)
// -----------------------------------------------------------------------------
// 감독 결정(2026-07-14): 법무(개인정보처리방침·약관)는 런치 게이트에서 해결, 미해결 시
// 런치 전 제거. 이 모듈은 그 "통째로 빼기"가 쉽도록 유튜브 관련 전부를 한 파일에 격리한다.
//
// 보안(법과 별개 · 처음부터 강제 — 보안담당 실사 반영):
//  - 사용자 URL을 iframe src에 직접 넣지 않는다. 영상 ID(11자 화이트리스트)만 추출·재조립.
//  - youtube-nocookie 도메인 고정, sandbox 최소권한, autoplay=0, 저장은 ID만·재생 직전 재검증.
// 법무 강제조건(런치 전 충족 필요 — 여기 표시만): 개인정보처리방침 선행·클릭투로드·약관 면책.
// -----------------------------------------------------------------------------

export const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** 신뢰불가 입력(URL 또는 ID) → 검증된 11자 영상 ID. 실패 시 null. */
export function youtubeId(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (YT_ID.test(s)) return s;                         // 이미 ID면 통과
  let u; try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'https:') return null;            // http/javascript/data 거부
  const host = u.hostname.toLowerCase();
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (host === 'www.youtube.com' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'www.youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2];
    else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2];
  } else return null;                                  // 그 외 호스트 전면 거부
  return (id && YT_ID.test(id)) ? id : null;
}

/** 검증된 ID → 안전한 nocookie 임베드 URL (우리가 조립, 사용자 문자열 미사용). */
export function embedUrl(id) {
  return YT_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : null;
}

/**
 * 클릭투로드(법무·개인정보 요건): 재생 버튼 누르기 전엔 iframe을 만들지 않는다(로드 시 추적 차단).
 * 반환: { el } — 컨테이너 DOM. 재생 클릭 시에만 샌드박스 iframe 주입.
 * @param {string} rawSrc 저장된 값(ID 기대) — 재생 직전 재검증한다.
 */
export function createYouTubeSurface(rawSrc, { width = 640, height = 360 } = {}) {
  const el = document.createElement('div');
  el.style.cssText = `position:relative;width:${width}px;height:${height}px;background:#0e0e16;overflow:hidden;border-radius:6px`;
  const id = youtubeId(rawSrc);
  if (!id) { el.innerHTML = '<div style="color:#6b6a78;font:13px sans-serif;display:grid;place-items:center;height:100%">영상 없음</div>'; return { el }; }
  // 클릭투로드 플레이스홀더(썸네일 로드도 안 함 = 외부요청 0까지, 재생 시에만 iframe)
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;cursor:pointer;background:#0e0e16;color:#e7e5ee;font:600 14px sans-serif;display:grid;place-items:center;gap:6px';
  btn.innerHTML = '<div style="font-size:34px">▶</div><div>유튜브 영상 재생</div><div style="font:12px sans-serif;color:#9b99a8">클릭하면 YouTube에서 불러옵니다</div>';
  btn.addEventListener('click', () => {
    const id2 = youtubeId(rawSrc); if (!id2) return;   // 재생 직전 재검증
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl(id2) + '&autoplay=1';         // 클릭=사용자 상호작용 후에만 autoplay
    iframe.width = String(width); iframe.height = String(height);
    iframe.style.cssText = 'position:absolute;inset:0;border:0;width:100%;height:100%';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    iframe.setAttribute('allow', 'encrypted-media; fullscreen; picture-in-picture; autoplay');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allowfullscreen', '');   // sandbox 하 전체화면 버튼 동작(검수관 권고)
    iframe.setAttribute('title', 'YouTube video');
    el.replaceChildren(iframe);
  });
  el.appendChild(btn);
  return { el };
}
