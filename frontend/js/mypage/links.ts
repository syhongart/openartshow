// frontend/js/mypage/links.ts — SNS·외부 링크 정의와 URL 정규화 (순수 함수)
//
// THREE 미참조·DOM 미참조. **서버가 붙으면 이 파일을 서버에서도 그대로 돌린다** —
// 클라이언트 검증과 서버 검증을 각자 적으면 그 순간 값 미러링이고, 한쪽만 고쳐도
// 아무도 모른다(이 저장소가 이미 세 번 덴 형태).
//
// ── 왜 URL 로 저장하는가 ──────────────────────────────────────────────────
// 감독 판단 그대로다 — 아이디만 받으면 플랫폼이 URL 규칙을 바꾸는 순간 저장된 값이
// 쓸모없어진다. 대신 **입력은 아이디로도 받는다**: 작가에게 `@arthong` 을 URL 로
// 바꿔 적으라고 요구하는 것은 우리가 할 일을 사용자에게 미루는 것이다.

/**
 * 플랫폼 정의.
 *
 * @property hosts   이 플랫폼으로 인정하는 호스트(www. 는 정규화 단계에서 벗긴다).
 *                   비어 있으면 호스트를 따지지 않는다(website·other).
 * @property path    핸들 → 경로. `@` 접두 유무가 플랫폼마다 다르다.
 * @property atMark  화면에 핸들을 `@` 와 함께 보여주는가.
 */
export interface Platform {
  id: string;
  name: string;
  hosts: readonly string[];
  path: ((handle: string) => string) | null;
  atMark: boolean;
}

export const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    hosts: ['instagram.com'],
    path: (h: string) => `/${h}`,
    atMark: true,
  },
  {
    // 구 Twitter. 옛 링크가 살아 있으므로 두 호스트를 **둘 다** 인정한다 — 사용자가
    // 예전에 복사해 둔 twitter.com 링크를 "잘못된 주소" 로 되돌려보내지 않는다.
    id: 'x',
    name: 'X (Twitter)',
    hosts: ['x.com', 'twitter.com'],
    path: (h: string) => `/${h}`,
    atMark: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    hosts: ['youtube.com', 'youtu.be'],
    path: (h: string) => `/@${h}`,
    atMark: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    hosts: ['tiktok.com'],
    path: (h: string) => `/@${h}`,
    atMark: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    hosts: ['facebook.com', 'fb.com'],
    path: (h: string) => `/${h}`,
    atMark: false,
  },
  {
    id: 'behance',
    name: 'Behance',
    hosts: ['behance.net'],
    path: (h: string) => `/${h}`,
    atMark: false,
  },
  {
    id: 'artstation',
    name: 'ArtStation',
    hosts: ['artstation.com'],
    path: (h: string) => `/${h}`,
    atMark: false,
  },
  {
    // 개인 홈페이지 — 호스트를 따지지 않는다. 핸들 입력도 받지 않는다(도메인이 곧 값).
    id: 'website',
    name: '홈페이지',
    hosts: [],
    path: null,
    atMark: false,
  },
  {
    id: 'other',
    name: '기타 링크',
    hosts: [],
    path: null,
    atMark: false,
  },
] as const satisfies readonly Platform[];

export type PlatformId = (typeof PLATFORMS)[number]['id'];
export const PLATFORM_IDS: readonly PlatformId[] = PLATFORMS.map((p) => p.id);

export function findPlatform(id: string): Platform | null {
  return PLATFORMS.find((p) => p.id === id) ?? null;
}

// ── 검증 결과 ─────────────────────────────────────────────────────────────
export type LinkErrorCode =
  | 'empty'
  | 'scheme'      // http/https 가 아니다
  | 'malformed'   // URL 로 해석되지 않는다
  | 'host'        // 그 플랫폼의 주소가 아니다
  | 'too-long'
  | 'label';      // 기타 링크인데 이름이 없다

export interface LinkCheck {
  ok: boolean;
  code: LinkErrorCode | null;
  message: string;
}

const OK: LinkCheck = { ok: true, code: null, message: '' };
function fail(code: LinkErrorCode, message: string): LinkCheck {
  return { ok: false, code, message };
}

/** 핸들에 쓸 수 있는 문자. 플랫폼별로 미세하게 다르지만 교집합으로 좁게 잡는다. */
const HANDLE_RE = /^[A-Za-z0-9._-]{1,50}$/;

/** URL 최대 길이. 값은 `limits.ts` 한 곳이다 — 여기 숫자를 다시 적지 않는다.
 *  `schema.ts` 가 아니라 `limits.ts` 에서 받는 것이 요점이다(검수관 P2): schema 는
 *  이 파일의 `PLATFORM_IDS` 를 쓰므로, 여기서 schema 를 되짚으면 순환이 된다. */
import { LIMITS } from './limits.js';

/**
 * 입력을 URL 로 정규화한다. 사용자는 셋 중 아무거나 넣을 수 있다:
 *   `@arthong` · `arthong` · `https://instagram.com/arthong`
 *
 * 반환은 **정규화된 URL 문자열**이거나, 정규화할 수 없으면 빈 문자열이다.
 * 판정(왜 안 되는가)은 `checkLink` 가 한다 — 이 함수는 형태만 맞춘다.
 */
export function normalizeLinkUrl(platformId: string, input: string): string {
  const platform = findPlatform(platformId);
  if (!platform) return '';
  const raw = String(input ?? '').trim();
  if (!raw) return '';

  // 1) 이미 URL 인가. 스킴이 없으면 https 를 붙여 한 번 더 본다.
  //    `//example.com` 같은 프로토콜 상대 주소도 https 로 고정한다 — 배포가 https 이므로
  //    사용자가 의도한 것과 다르지 않고, 스킴을 비워 두면 아래 검사가 통과해 버린다.
  const looksAbsolute = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) || raw.startsWith('//');
  if (looksAbsolute) {
    const withScheme = raw.startsWith('//') ? `https:${raw}` : raw;
    const parsed = parseUrl(withScheme);
    if (!parsed) return '';
    return parsed.toString();
  }

  // 2) 도메인처럼 보이는가(`example.com/path`). 핸들에는 점 뒤 TLD 가 안 온다.
  if (/^[^/\s@]+\.[a-zA-Z]{2,}(\/|$)/.test(raw)) {
    const parsed = parseUrl(`https://${raw}`);
    return parsed ? parsed.toString() : '';
  }

  // 3) 핸들이다. 경로 규칙이 없는 플랫폼(website·other)은 핸들을 받을 수 없다.
  if (!platform.path) return '';
  const handle = raw.replace(/^@+/, '');
  if (!HANDLE_RE.test(handle)) return '';
  return `https://${platform.hosts[0]}${platform.path(handle)}`;
}

/** `URL` 로 파싱하되 http/https 만 통과시킨다. `javascript:`·`data:` 차단 지점. */
function parseUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname) return null;
  return url;
}

/** `www.` 를 벗기고 소문자로. 호스트 비교는 항상 이 형태로 한다. */
export function bareHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, '');
}

/**
 * 저장해도 안전한 URL 인가. 안전하면 **정규화된 URL**, 아니면 빈 문자열.
 *
 * ── 왜 이 함수가 생겼나 (검수관 B1, 2026-08-08) ────────────────────────────
 * `normalizeProfile` 이 링크 URL 의 스킴을 **안 보고 있었다.** 검수관이 실행으로
 * 확인했다 — `javascript:alert(1)` 이 `normalizeProfile` → `publicView` →
 * `renderPreview` 를 지나 `<a href>` 속성에 **그대로 들어갔다.**
 *
 * 당시 터지지 않은 이유는 화면 경로가 `readLinks()` → `checkLink` 라는 DOM 왕복을
 * 거쳤기 때문이다. **그러나 그 방어는 우연이다.** `visibility.ts` 와 `view-preview.ts`
 * 가 *"`/@nickname` 공개 페이지가 이 함수를 그대로 쓴다"* 고 약속했고, 그 경로에는
 * DOM 왕복이 없다. 즉 우리가 계획을 실행하는 순간 저장형 XSS 가 된다.
 *
 * 방어 함수(`parseUrl`)는 이미 있었다 — **정규화 경로가 그것을 안 지날 뿐이었다.**
 * 이 저장소가 이름 붙인 *"계산된 값이 실제로 소비되는가"* 의 구멍이고, 같은 파일이
 * `profileImage` 는 화이트리스트로 막고 있었으니 **한 파일 안의 비대칭**이었다.
 *
 * 호스트 일치까지는 보지 않는다 — 그건 위험이 아니라 부정확이고, 입력 시점에
 * `checkLink` 가 본다. 여기서 지키는 것은 **"실행 가능한 스킴이 저장에 남지 않는다"** 다.
 */
export function safeLinkUrl(platformId: string, urlText: string): string {
  const normalized = normalizeLinkUrl(platformId, String(urlText ?? '').trim());
  if (!normalized || normalized.length > LIMITS.linkUrl.max) return '';
  // ── 이 줄은 **심층방어**다. 지금 막는 것이 없다 (검수관 R1, 실측) ──────────
  // `normalizeLinkUrl` 의 분기 하나(핸들 → URL 조립)가 `parseUrl` 을 안 거치는 것은
  // 참이다. 그러나 **거기서 위험한 값이 나오지는 않는다** — `HANDLE_RE` 가 `:` 와 `/`
  // 를 금지하므로 그 분기의 결과는 항상 `https://` 리터럴로 시작한다.
  //   실측: handle="javascript:x" → ""  ·  handle="a:b" → ""  ·  handle="@arthong" → https://…
  // 그래서 이 줄을 지워도 **아무 테스트도 안 깨진다.** 그것이 정상이고, 장식이라는
  // 뜻이 아니다.
  //
  // **언제 값을 하는가**: `HANDLE_RE` 를 넓히거나 `PLATFORMS[].path` 가 다른 모양의
  // 문자열을 만들게 되는 날이다. 그때 이 줄이 유일한 방어가 된다.
  // (조건을 안 적으면 다음 사람이 "안 깨지니 장식" 으로 읽고 뜯는다 — 이 저장소가
  //  이름 붙인 *"참인 문장에서 성립하지 않는 결론을 뽑는 것"* 의 반대편 위험이다.)
  return parseUrl(normalized) ? normalized : '';
}

/**
 * 링크 하나를 판정한다. 입력은 **정규화 전 원문**이어도 되고 정규화된 URL 이어도 된다 —
 * 안에서 한 번 더 정규화한다. 화면과 저장이 같은 판정을 쓰게 하기 위해서다.
 */
export function checkLink(platformId: string, input: string, label = ''): LinkCheck {
  const platform = findPlatform(platformId);
  if (!platform) return fail('malformed', '알 수 없는 플랫폼입니다.');

  const raw = String(input ?? '').trim();
  if (!raw) return fail('empty', '주소를 입력해 주세요.');
  if (raw.length > LIMITS.linkUrl.max) {
    return fail('too-long', `주소가 너무 깁니다(${LIMITS.linkUrl.max}자까지).`);
  }

  // 위험 스킴은 정규화 전에 먼저 잡아 **이유를 정확히** 알려준다. 정규화만 거치면
  // 빈 문자열이 되어 'malformed'(주소 형식이 아닙니다)로 뭉개진다.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) && !/^https?:/i.test(raw)) {
    return fail('scheme', 'http 또는 https 주소만 넣을 수 있습니다.');
  }

  const normalized = normalizeLinkUrl(platformId, raw);
  if (!normalized) {
    return platform.path
      ? fail('malformed', '주소나 아이디(@계정명)를 확인해 주세요.')
      : fail('malformed', '주소를 확인해 주세요. (예: https://example.com)');
  }
  if (normalized.length > LIMITS.linkUrl.max) {
    return fail('too-long', `주소가 너무 깁니다(${LIMITS.linkUrl.max}자까지).`);
  }

  const url = parseUrl(normalized);
  if (!url) return fail('malformed', '주소를 확인해 주세요.');

  if (platform.hosts.length > 0) {
    const host = bareHost(url);
    const match = platform.hosts.some((h) => host === h || host.endsWith(`.${h}`));
    if (!match) return fail('host', `${platform.name} 주소가 아닙니다.`);
  }

  if (platform.id === 'other' && !label.trim()) {
    return fail('label', '링크 이름을 입력해 주세요.');
  }

  return OK;
}

/**
 * URL 에서 표시용 핸들을 뽑는다. 못 뽑으면 빈 문자열 — 그때 화면은 호스트명을 쓴다.
 *
 * 유튜브의 `/channel/UC…`·`/c/이름` 처럼 핸들이 아닌 경로는 일부러 비워 둔다.
 * 그 문자열을 `@` 와 함께 보여주면 존재하지 않는 핸들을 만들어내는 셈이다.
 */
export function handleFromUrl(platformId: string, urlText: string): string {
  const platform = findPlatform(platformId);
  if (!platform || !platform.path) return '';
  const url = parseUrl(urlText);
  if (!url) return '';

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '';

  const first = segments[0];
  if (platform.id === 'youtube') {
    // 유튜브만 `@` 접두가 경로에 실제로 들어 있다. 없으면 핸들이 아니다.
    return first.startsWith('@') && HANDLE_RE.test(first.slice(1)) ? first.slice(1) : '';
  }
  if (platform.id === 'tiktok') {
    return first.startsWith('@') && HANDLE_RE.test(first.slice(1)) ? first.slice(1) : '';
  }
  const candidate = first.replace(/^@+/, '');
  return HANDLE_RE.test(candidate) ? candidate : '';
}

/** 화면에 보여줄 문자열. 핸들이 있으면 `@handle`, 없으면 호스트명. */
export function linkDisplayText(platformId: string, urlText: string, label = ''): string {
  const platform = findPlatform(platformId);
  if (!platform) return urlText;
  if (platform.id === 'other' && label.trim()) return label.trim();

  const handle = handleFromUrl(platformId, urlText);
  if (handle) return platform.atMark ? `@${handle}` : handle;

  const url = parseUrl(urlText);
  return url ? bareHost(url) : urlText;
}
