// world2/decide/overlay.ts — **사용자 배치 오버레이 계약 v1.** 순수 함수만.
//
// ── 왜 이 계층이 필요한가 ────────────────────────────────────────────────────
// 감독 요구는 *"월드2를 내가 직접 배치. 튜닝할수있는 편집 툴가능? glb파일을 내가 직접
// 넣고"* 다. 그런데 world2 의 마을은 **저장하지 않는다** — `parcel-layout.ts` 의 불변식
// ①이 *"같은 (px,pz)는 언제나 같은 배치를 낸다. 저장하지 않고 매번 다시 계산한다"* 이고,
// 그게 깨지면 파셀이 언로드/재로드될 때마다 세상이 바뀐다.
//
// 사용자 배치는 본질적으로 **"저장된 임의 배치"** 라 정면 충돌한다. 그래서 기본 배치는
// 그대로 계산하고 **사용자 배치만 가산 레이어**로 얹는다(팀장 판정 2026-08-09, 안 ④(a)).
// `visit.js` 가산형 모듈과 같은 검증된 형태다.
//
// ── 왜 gizmo 보다 계약이 먼저인가 ────────────────────────────────────────────
// 팀장 조건: *"계약 없이 gizmo 부터 만들면 데이터 계층이 틀렸을 때 충돌이 재발한다."*
// 편집 UI 는 이 타입을 만들어 내는 도구일 뿐이고, world2 는 이 타입을 읽을 뿐이다.
// 양쪽 어느 쪽도 상대를 몰라야 한다.
//
// ── 저장 위치 (팀장 승인 2026-08-09) ────────────────────────────────────────
// 배치 SSOT 는 **저장소에 커밋된 JSON** 이고 GLB 도 **저장소에 커밋된 파일**이다.
// 감독 발화 *"에디터는 개발용으로만 쓸거니"* 가 근거다 — 런타임 사용자 저장이 아니므로
// ① 브라우저 저장소(다른 기기·타인에게 안 보인다)의 문제도 ② 방문자 브라우저가 남의
// 서버를 부르는 자기완결 위반도 이 경로에서는 발생하지 않는다.
// ⚠ 이것은 **감독 발화의 해석으로 공백을 메운 판정**이다. 감독이 다르게 판단하면 그것이
// 최종이고, 그때는 `src` 검증 규칙(아래)이 가장 먼저 바뀌는 자리다.

/** 배치 항목 하나. */
export interface OverlayItem {
  /**
   * GLB 자산 경로. **`assets/models/` 아래 상대경로만** 허용한다(`isSafeSrc` 참조).
   *
   * 절대 URL 을 허용하지 않는 것이 이 계약의 유일한 보안 경계다 — 편집 세션은
   * 드래그드롭한 파일을 `blob:` URL 로 들고 있는데, 그것이 내보내기에 그대로 새면
   * **자기완결 위반이 저장소에 커밋된다.** 커밋된 뒤에는 아무도 안 본다.
   */
  src: string;
  x: number;
  y: number;
  z: number;
  /** Y축 회전(라디안). */
  ry: number;
  /**
   * 균등 스케일.
   *
   * 비균등(sx·sy·sz)을 일부러 안 넣었다. 건물·조형물을 놓는 용도라 축별로 늘일 일이
   * 없고, `space.ts` 가 옵션 필드를 나중에 **버전 불변으로** 더해 온 전례가 있다
   * (`shell.entries`·`shell.floors` — 생략 = 기존 동작). 필요해지면 그 형태로 더한다.
   */
  s: number;
}

export interface Overlay {
  version: number;
  items: OverlayItem[];
}

export const OVERLAY_VERSION = 1;

/** 오버레이가 없을 때의 값. `items` 가 비면 world2 는 아무것도 안 얹는다. */
export const EMPTY_OVERLAY: Overlay = { version: OVERLAY_VERSION, items: [] };

// ── 자산 경로 검증 (팀장 조건 c) ─────────────────────────────────────────────
// `assets/models/` 로 시작하는 상대경로 + `.glb` 로 끝날 것. 검사를 **정규식 하나로
// 끝내지 않는다** — `.` 을 허용하는 문자군은 `..` 도 통과시키므로 상위 탈출을 따로 막는다.
// (`:` 를 문자군에서 뺀 것이 `blob:`·`http:` 를 막는 축이고, 선두 고정이 `//host` 를
//  막는 축이다. 두 축 다 아래 테스트에 케이스가 있다.)
const SRC_RE = /^assets\/models\/[A-Za-z0-9_\-./]+\.glb$/;

/** `src` 가 커밋 가능한 저장소 상대경로인가. */
export function isSafeSrc(src: unknown): src is string {
  if (typeof src !== 'string') return false;
  if (src.includes('..')) return false;
  return SRC_RE.test(src);
}

const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

const clamp = (v: unknown, lo: number, hi: number, d: number): number => {
  const n = num(v, NaN);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

// 스케일 상·하한. 0 이나 음수는 지오메트리를 뒤집거나 사라지게 하고, 그 화면은 "고장"
// 으로 보인다 — 노브를 클램프하는 것과 같은 이유다(`url-knob.ts`: *"`?nexp=999` 같은
// 값이 그대로 들어가면 화면이 하얗게 날아가고, 그 상태를 '고장'으로 오해하게 된다"*).
const S_MIN = 0.01;
const S_MAX = 100;

// 좌표 상·하한. world2 는 무한 격자를 스트리밍하지만 배치가 실수로 1e9 에 찍히면
// 부동소수 정밀도가 무너져 모델이 떨린다. 마을 규모(파셀 수백 칸) 대비 넉넉하되
// 정밀도가 살아 있는 범위로 자른다.
const POS_LIMIT = 100_000;

/**
 * 임의의 입력을 유효한 `Overlay` 로 만든다. **던지지 않는다.**
 *
 * 던지지 않는 것이 요점이다 — 이 데이터는 감독이 손으로 편집할 수 있는 JSON 이고,
 * 한 항목이 깨졌다고 마을 전체가 안 뜨면 원인을 못 찾는다. **깨진 항목만 조용히
 * 버린다.** 무엇이 버려졌는지 알아야 하면 `normalizeOverlay` 대신 `validateOverlay`
 * 를 쓴다(편집 UI 의 내보내기 관문이 그쪽이다).
 */
export function normalizeOverlay(raw: unknown): Overlay {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return { version: OVERLAY_VERSION, items: [] };

  const src = Array.isArray(o.items) ? o.items : [];
  const items: OverlayItem[] = [];
  for (const it of src) {
    const item = it as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') continue;
    if (!isSafeSrc(item.src)) continue; // 경로가 안전하지 않으면 항목째 버린다
    items.push({
      src: item.src,
      x: clamp(item.x, -POS_LIMIT, POS_LIMIT, 0),
      y: clamp(item.y, -POS_LIMIT, POS_LIMIT, 0),
      z: clamp(item.z, -POS_LIMIT, POS_LIMIT, 0),
      ry: num(item.ry, 0),
      s: clamp(item.s, S_MIN, S_MAX, 1),
    });
  }
  return { version: OVERLAY_VERSION, items };
}

/**
 * 마이그레이션. v1 뿐이라 지금은 통과시키는 것 외에 할 일이 없다.
 *
 * **그래도 지금 만든다.** `space.ts` 가 v1→v2 를 겪고 나서야 이 함수를 갖췄고, 그 사이의
 * 데이터는 손으로 고쳤다. 소비자가 `migrateOverlay(normalizeOverlay(json))` 하나만
 * 알면 되도록 진입점을 지금 고정해 둔다 — 나중에 v2 가 생겨도 소비자 코드는 안 바뀐다.
 */
export function migrateOverlay(o: Overlay): Overlay {
  if (o.version === OVERLAY_VERSION) return o;
  // 미래 버전(파일이 코드보다 새롭다)은 내용을 신뢰할 수 없다. 빈 것으로 떨어뜨린다 —
  // 부분적으로 해석해서 이상한 마을을 보여주는 것보다 아무것도 안 얹는 편이 낫다.
  if (o.version > OVERLAY_VERSION) return { version: OVERLAY_VERSION, items: [] };
  return { ...o, version: OVERLAY_VERSION };
}

/** `validateOverlay` 가 돌려주는 거부 사유. */
export interface OverlayIssue {
  index: number;
  reason: 'not-object' | 'unsafe-src' | 'bad-number';
}

/**
 * 내보내기 관문. `normalizeOverlay` 와 달리 **무엇이 왜 거부됐는지**를 함께 돌려준다.
 *
 * 편집 UI 는 이것을 쓴다. 조용히 버리면 감독이 배치한 것이 내보내기에서 사라지는데
 * 화면에는 남아 있어서, 커밋하고 배포한 뒤에야 없어진 것을 알게 된다.
 */
export function validateOverlay(raw: unknown): { overlay: Overlay; issues: OverlayIssue[] } {
  const o = raw as Record<string, unknown> | null;
  const issues: OverlayIssue[] = [];
  if (!o || typeof o !== 'object' || !Array.isArray(o.items)) {
    return { overlay: { version: OVERLAY_VERSION, items: [] }, issues };
  }
  o.items.forEach((it: unknown, index: number) => {
    const item = it as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') { issues.push({ index, reason: 'not-object' }); return; }
    if (!isSafeSrc(item.src)) { issues.push({ index, reason: 'unsafe-src' }); return; }
    for (const k of ['x', 'y', 'z', 'ry', 's'] as const) {
      const v = item[k];
      if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v))) {
        issues.push({ index, reason: 'bad-number' });
        return;
      }
    }
  });
  return { overlay: normalizeOverlay(raw), issues };
}
