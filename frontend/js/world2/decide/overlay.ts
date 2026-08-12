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
//
// ⚠ **팀장 조건 c 는 아직 충족이 아니라 준비다**(검수관 P6). 조건문은 *"관문은 export
// 시점 한 곳"* 인데 export UI 가 없어 관문이 실제로 서 있는 지점은 **0** 이다. 여기 있는
// 것은 계약 정의뿐이고, 집행은 소비자·편집 UI 가 붙을 때 통합 테스트로 확인한다.
// 이 문장을 *"조건 c 충족"* 으로 줄여 적지 마라 — 다음 사람이 확인을 생략한다.
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
   *
   * ⚠ **여기 적힌 것은 접두가 붙기 전의 값이다.** 런타임 실제 경로는 `/app/assets/models/`
   * 이고(`features/overlay.ts` 의 `assetUrl()`), 저장소 안 위치는 `frontend/assets/models/`
   * 다 — **같은 파일의 표기가 셋**이다. base 결합은 소비자 한 곳에서만 하고 그 지점을
   * 여기 적는다. 세 표기가 각각 굳으면 값 미러링이다(검수관 P3).
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

/**
 * 빈 오버레이. **상수가 아니라 팩토리인 이유**(검수관 P1): 상수로 두면 한 소비자가
 * `items.push` 한 것이 다른 소비자에게 그대로 보인다. 얼려도 되지만, 얼린 배열을 받은
 * 소비자가 나중에 조용히 실패하는 것보다 매번 새로 주는 편이 안전하다.
 */
export function emptyOverlay(): Overlay {
  return { version: OVERLAY_VERSION, items: [] };
}

// ── 자산 경로 검증 (팀장 조건 c) ─────────────────────────────────────────────
// `assets/models/` 로 시작하는 상대경로 + `.glb` 로 끝날 것. 검사를 **정규식 하나로
// 끝내지 않는다** — `.` 을 허용하는 문자군은 `..` 도 통과시키므로 상위 탈출을 따로 막는다.
// (`:` 를 문자군에서 뺀 것이 `blob:`·`http:` 를 막는 축이고, 선두 `^` 가 `//host` 를 막는
//  축이다. 두 축 다 테스트에 케이스가 있고 뮤테이션으로 검출을 실측했다.)
//
// 검수관이 문자열 술어로서 뚫으려 시도한 것 전부 거부됨을 실측(2026-08-10):
//   `blob:`·`http(s):`·`data:` / `//host` / `/절대` / `%2e%2e` / 백슬래시 / 후행 개행 /
//   전각 `．．` / NBSP / `?a=1`·`#f` / `.GLB` 대문자 / `new String(…)` 래퍼.
//   프로토타입 오염 없음, 백트래킹 중첩이 없어 ReDoS 도 없음.
//
// ⚠ `.GLB`(대문자)가 거부되는 것은 **의도**지만, 거부 사유가 `unsafe-src` 한 종류라
// 감독이 대문자 확장자 파일을 넣으면 원인이 대소문자라는 것을 알 수 없다(검수관 P5).
// 편집 UI 가 붙을 때 안내 문구로 메운다 — 여기서 허용 범위를 넓히지는 않는다.
const SRC_RE = /^assets\/models\/[A-Za-z0-9_\-./]+\.glb$/;

/** `src` 가 커밋 가능한 저장소 상대경로인가. */
export function isSafeSrc(src: unknown): src is string {
  if (typeof src !== 'string') return false;
  if (src.includes('..')) return false;
  // `./` 와 `//` 는 탈출이 아니지만 **같은 파일의 철자를 무한하게** 만든다 — 나중에 `src`
  // 로 캐시·dedupe 를 하면 어긋난다(검수관 P4). 정규화 대신 거부해 표기를 하나로 묶는다.
  if (src.includes('//') || src.includes('/./')) return false;
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
//
// **export 하는 이유**(검수관 P2): 테스트가 `100` 같은 리터럴로 단언하면 상수를 **낮추는**
// 방향의 변경에 검출력이 0이 된다(`POS_LIMIT` 를 1000 으로 낮춰도 `<= 100000` 은 참).
// 옛 `minY(120)` 사고와 같은 형태라 값을 한 곳에서만 읽게 한다.
export const S_MIN = 0.01;
export const S_MAX = 100;

// 좌표 상·하한. world2 는 무한 격자를 스트리밍하지만 배치가 실수로 1e9 에 찍히면
// 부동소수 정밀도가 무너져 모델이 떨린다. 마을 규모(파셀 수백 칸) 대비 넉넉하되
// 정밀도가 살아 있는 범위로 자른다.
export const POS_LIMIT = 100_000;

/**
 * 회전은 **주기적이라 클램프하지 않고 접는다.** `POS_LIMIT` 의 근거(1e9 에 찍히면 부동
 * 소수 정밀도가 무너진다)가 회전에도 같이 적용되는데(검수관 P12), 클램프하면 3π 가
 * 2π(=0)로 잘려 **π 여야 할 회전이 0이 된다.** `%` 는 부호를 보존하며 주기만 접는다
 * (`-3π` → `-π`, `-0.5` → `-0.5`, `-0` 오탐 없음 — 검수관 실측).
 *
 * ⚠ 여기 원래 *"그래서 `clamped` 오탐이 안 난다"* 라고 적었는데 **정상 범위에서만 참**이다
 * (검수관 P17). `|ry| ≥ 2π` 면 값이 실제로 바뀌므로 보고는 되어야 한다 — 다만 그것은
 * 잘린 것이 아니라 접힌 것이라 `validateOverlay` 가 `folded` 로 사유를 나눈다.
 */
const foldRy = (v: unknown): number => num(v, 0) % (Math.PI * 2);

/** 항목 하나의 수치 정규화. `normalizeOverlay` 와 `validateOverlay` 가 **함께** 쓴다. */
function normalizeItem(item: Record<string, unknown>, src: string): OverlayItem {
  return {
    src,
    x: clamp(item.x, -POS_LIMIT, POS_LIMIT, 0),
    y: clamp(item.y, -POS_LIMIT, POS_LIMIT, 0),
    z: clamp(item.z, -POS_LIMIT, POS_LIMIT, 0),
    ry: foldRy(item.ry),
    s: clamp(item.s, S_MIN, S_MAX, 1),
  };
}

// ── 계약이 아는 키 — **목록을 적지 않고 유도한다** (검수관 B6) ────────────────
// 처음에는 `new Set(['src','x','y','z','ry','s'])` 라고 **따로 적었다.** 값 미러링이고,
// 위험한 방향은 소실 쪽이었다. 검수관 뮤테이션 실측 — 화이트리스트에만 `'name'` 을 더하고
// `normalizeItem` 은 그대로 두자 **0 failed** 였는데, 그 상태에서 `{name:'hall'}` 이
// `issues: []`("커밋 가능") 판정을 받으며 출력에서 사라졌다. **B4 가 그대로 재발하는데
// 게이트가 초록이었다.**
//
// 유도하면 어긋날 자리가 없다. `normalizeItem` 은 `function` 선언이라 hoisting 되지만
// ⚠️ **그 함수가 참조하는 `POS_LIMIT`·`S_MIN`·`S_MAX`·`foldRy` 는 `const` 라 TDZ 다.**
// 그래서 이 두 줄은 **반드시 `normalizeItem` 과 그 상수들보다 아래**에 있어야 한다 —
// 이 저장소는 `Sidebar.Scene.js` 에서 정확히 그 TDZ 로 부팅을 한 번 죽였다.
const KNOWN_ITEM_KEYS = new Set(Object.keys(normalizeItem({}, '')));
const KNOWN_ROOT_KEYS = new Set(Object.keys(emptyOverlay()));

/**
 * 임의의 입력을 유효한 `Overlay` 로 만든다. **던지지 않는다.**
 *
 * 던지지 않는 것이 요점이다 — 이 데이터는 감독이 손으로 편집할 수 있는 JSON 이고,
 * 한 항목이 깨졌다고 마을 전체가 안 뜨면 원인을 못 찾는다. **깨진 항목만 조용히
 * 버린다.** 무엇이 버려졌는지 알아야 하면 `validateOverlay` 를 쓴다.
 *
 * ⚠ **소비자는 이 함수를 직접 부르지 않는다. `loadOverlay` 를 쓴다** — 이 함수는 출력
 * `version` 을 현재 값으로 덮어쓰므로, 버전 판정보다 **먼저** 부르면 그 판정이 죽는다.
 */
export function normalizeOverlay(raw: unknown): Overlay {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return emptyOverlay();

  const src = Array.isArray(o.items) ? o.items : [];
  const items: OverlayItem[] = [];
  for (const it of src) {
    const item = it as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') continue;
    if (!isSafeSrc(item.src)) continue; // 경로가 안전하지 않으면 항목째 버린다
    items.push(normalizeItem(item, item.src));
  }
  return { version: OVERLAY_VERSION, items };
}

/**
 * 버전 필드를 읽어 **세 갈래**로 나눈다 — `'absent'`(필드가 아예 없다) · `'invalid'`(있는데
 * 해석할 수 없다) · 숫자. **`'absent'` 만 v1 로 받아 준다**(손으로 쓴 파일 관용).
 *
 * ⚠ 여기 원래 *"없거나 숫자가 아니면 v1 로 본다"* 라고 적혀 있었고 **B5 를 고친 그 커밋에서
 * 거짓이 됐다**(검수관 B8). 이 파일의 반려 사슬이 전부 *"주석이 코드보다 강한"* 형태였는데,
 * 그것을 고친 커밋이 같은 자리에 같은 형태를 하나 남겼다 — 이번엔 방향이 반대로 **주석이
 * 코드보다 관대**했다. 고친 자리 바로 옆이 가장 위험한 자리다.
 *
 * ── 왜 `'invalid'` 를 v1 로 관용하지 않는가 (검수관 P21) ─────────────────────
 * **이 선택에는 대가가 있다.** `"version": "1"` 같은 따옴표 오타 하나로 **마을 전체가
 * 런타임에서 조용히 사라진다**(`loadOverlay` → 빈 오버레이, 경고 없음). 그리고 그것은 이
 * 파일이 몇 줄 아래에 적은 철학과 정면으로 충돌한다 — *"한 항목이 깨졌다고 마을 전체가 안
 * 뜨면 원인을 못 찾는다. 깨진 항목만 조용히 버린다."*
 *
 * 그래도 fail-closed 를 고른 이유는 **형제 함수 일치**다. 관용하면 `validateOverlay` 는
 * *"이 파일은 v1 이다"* 라고 판정하는데 파일에 적힌 것은 `"1"` 이고, 나중에 v2 마이그레이션이
 * 그 파일을 무엇으로 볼지는 아무도 모른다. **해석할 수 없는 것을 해석한 척하는 것이 조용한
 * 소실보다 나쁘다** — B5 가 정확히 그 형태였다.
 *
 * ⚠ **미해결**: 경고할 자리가 없다. `validateOverlay` 는 `version-invalid` 사유를 내지만
 * 런타임 경로(`loadOverlay`)는 조용하다. 소비자가 붙을 때(태스크 #25) 콘솔 경고든 화면이든
 * **보이게 만들 자리를 정한다.** 그때까지 이 선택은 "정했다" 가 아니라 "빚이 있다" 로 읽는다.
 */
function readVersion(raw: unknown): number | 'invalid' | 'absent' {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object' || !('version' in o)) return 'absent';
  const v = o.version;
  // 정수 + 1 이상만 버전이다. 해석할 수 없는 값들은 **"v1" 이 아니라 거부**다 — 예전에는
  // 전부 조용히 v1 로 뭉갰고 그것이 B5 반려 사유였다.
  // (거부되는 값의 **완전 목록은 여기 적지 않는다.** `tests/world2-overlay.test.ts` 의
  //  `INVALID_VERSIONS` 한 곳이고, 목록을 주석에 복사하면 규칙이 바뀔 때 조용히 낡는다 —
  //  검수관 P22. 이 파일의 반려 사슬이 전부 그 형태였다.
  //  ⚠ 이 파일 아래쪽에 값이 몇 개 나열된 곳이 둘 있는데 그것은 **과거 시점의 실측 반례**
  //  서술이지 규칙의 사본이 아니다 — 규칙이 바뀌어도 낡지 않으므로 이 문장과 충돌하지
  //  않는다. 둘을 구별하지 않으면 다음 사람이 두 문장 사이에서 멈춘다(검수관 P23).)
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) return 'invalid';
  return v;
}

/**
 * 버전 판정 + 마이그레이션. **`loadOverlay` 와 `validateOverlay` 가 이것만 부른다.**
 *
 * ⚠ 이 함수가 없던 판본이 **두 번 반려됐다.**
 *   · B4 — `loadOverlay` 에만 버전 가드를 두어 `validateOverlay` 가 미래 버전 파일을
 *     *"커밋 가능"* 으로 통과시켰다. 두 함수가 같은 파일에 **다른 말**을 했다.
 *   · B5·B7 — 가드를 양쪽에 복사했더니 이번엔 ① `> OVERLAY_VERSION` **한 방향만** 봐서
 *     `{version: 0}`·`{version: '1'}`·`{version: null}` 이 issues 0 으로 통과하며 버전이
 *     소실됐고(계약 문장은 *"버전도 사라지지 않는다"* 라고 적고 있었다) ② 마이그레이션
 *     자리가 `loadOverlay` 에만 있어 **v2 가 생기는 순간 두 함수가 또 갈라지도록** 예약돼
 *     있었다.
 *
 * 그래서 복사를 그만두고 **한 곳으로 뽑았다.** 갈라질 자리가 없으면 갈라지지 않는다.
 * 새 버전을 만들 때 손댈 곳도 여기 하나다.
 */
function prepareRaw(raw: unknown): { raw: unknown; issues: OverlayIssue[] } {
  const version = readVersion(raw);

  if (version === 'invalid') return { raw: null, issues: [{ reason: 'version-invalid' }] };

  // 미래 버전(파일이 코드보다 새롭다)은 내용을 신뢰할 수 없다. 빈 것으로 떨어뜨린다 —
  // 부분적으로 해석해 이상한 마을을 보여주는 것보다 아무것도 안 얹는 편이 낫다.
  //
  // ⚠ `version !== 'absent'` 는 **런타임에서 아무것도 안 막는다**(검수관 N7 실측 —
  // 이 절을 지워도 0 failed 다). `'absent' > 1` 은 NaN 비교라 언제나 false 이기 때문이다.
  // TS 타입 내로잉에 필요해서 두는 것이고, *"이 가드가 absent 를 막고 있다"* 로 읽으면
  // 틀린다. 죽은 가드를 살아 있는 것으로 읽으면 다음 사람이 그 축을 검사한 것으로 센다.
  if (version !== 'absent' && version > OVERLAY_VERSION) {
    return { raw: null, issues: [{ reason: 'version-too-new' }] };
  }

  // ── 마이그레이션 자리. v1 뿐이라 아직 비어 있다. ──────────────────────────
  // v2 를 만들 때 **여기 한 곳**에 넣는다. `normalizeOverlay` 앞이라는 것이 조건이다
  // (그 함수가 출력 `version` 을 현재 값으로 덮어쓰므로 순서가 뒤집히면 죽는다 — B1).
  //   if (version !== 'absent' && version < 2) raw = migrateV1toV2(raw);

  return { raw, issues: [] };
}

/**
 * **소비자 진입점. 이것 하나만 쓴다.**
 *
 * ⚠ 순서가 이 함수의 전부다 — **버전 판정이 정규화보다 앞에 있어야 한다.**
 * 처음에는 소비자가 `migrateOverlay(normalizeOverlay(json))` 를 부르도록 적었고 **그것은
 * 작동하지 않았다**(검수관 B1 반려): `normalizeOverlay` 가 출력 `version` 을 항상 현재
 * 값으로 덮어써서, 뒤에 오는 마이그레이션이 언제나 *"이미 최신"* 으로 즉시 반환했다.
 * 실측 — `migrate(normalize({version:999, …}))` 는 미래 버전 내용을 **그대로 해석**했고,
 * 같은 입력을 `migrate` 에 직접 넣으면 items 0 이었다.
 *
 * 그때 단위 테스트는 통과하고 있었다. `migrateOverlay` 를 **직접** 불렀기 때문이다 —
 * 이 저장소가 이름 붙인 *"순수 함수 안에서만 참이었고 정작 통합 지점은 아무 테스트도 안
 * 봤다"* 그 형태다. 그래서 진입점을 **함수 하나로 좁히고** 테스트도 이 함수로 건다.
 */
export function loadOverlay(raw: unknown): Overlay {
  return normalizeOverlay(prepareRaw(raw).raw);
}

/** `validateOverlay` 가 돌려주는 거부·변경 사유. */
export interface OverlayIssue {
  /** 항목 인덱스. 파일 전체에 대한 사유(`items-not-array`·`version-*`)에는 없다. */
  index?: number;
  reason:
    | 'not-object' | 'unsafe-src' | 'bad-number' | 'clamped' | 'folded'
    | 'items-not-array' | 'version-too-new' | 'version-invalid' | 'unknown-field';
}

/**
 * 내보내기 관문. `loadOverlay` 와 달리 **무엇이 왜 거부·변경됐는지**를 함께 돌려준다.
 *
 * 편집 UI 는 이것을 쓴다. 조용히 버리면 감독이 배치한 것이 내보내기에서 사라지는데
 * 화면에는 남아 있어서, 커밋하고 배포한 뒤에야 없어진 것을 알게 된다.
 *
 * ⚠ **버려진 것만이 아니라 `clamped`(값이 바뀐 것)도 보고한다.** 처음에는 안 그랬고
 * 주석만 *"조용히 값을 바꾼 것도 보여야 한다"* 라고 적혀 있었다(검수관 B2 반려). 실측 —
 * `{s: 0, x: 1e9}` 가 `issues: []` 로 **"커밋 가능"** 판정을 받으면서 값은 `s: 0.01,
 * x: 100000` 으로 바뀌어 나갔다. `s: 0` 은 편집 툴에서 흔한 입력이고, 그러면 **화면과
 * 파일이 달라진다.** `items` 가 배열이 아닌 입력이 `issues: []` 로 통과하던 것도 같은
 * 축이었다 — 편집 UI 가 *"issues 0 = 안전"* 으로 읽으면 **전부 사라진 파일을 안전하다고
 * 표시**한다.
 *
 * 즉 이 함수의 계약은 **`issues` 가 비면 무손실**이다 — 값도, 버전도, 이 계약이 모르는
 * 필드도 조용히 사라지지 않는다. 나중에 의도적 정규화(예: 경로 정규화)를 넣는다면 그것도
 * 사유로 보고하거나 이 문장을 먼저 고쳐야 한다.
 *
 * ⚠ **그 문장은 두 번 거짓이었다.**
 *   · B4 — `version` 을 아예 안 읽어 `{version: 999}` 가 *"커밋 가능"* 판정을 받으며 999 가
 *     소실되고 미래 버전 내용이 그대로 해석됐다. `loadOverlay` 는 같은 입력에 items 0 을
 *     냈으니 **두 함수가 같은 파일에 다른 말**을 한 것이다. 미지 필드도 같았다 —
 *     `normalizeItem` 이 6키 화이트리스트라 `sx`·`name` 이 조용히 버려졌다.
 *   · B5 — 그것을 고치며 문장에 *"버전도"* 를 **새로 써넣었는데**, 가드는
 *     `> OVERLAY_VERSION` **한 방향만** 봤다. 실측 반례 6건: `{version: 0}`·`{-3}`·`{'1'}`·
 *     `{'abc'}`·`{null}`·`{NaN}` 이 전부 `issues: []` 로 통과하며 버전이 v1 로 덮였다.
 *     **한쪽만 고치고 문장은 전체를 주장한** B1→B4 와 똑같은 형태를, 문장을 넓히면서 했다.
 *
 * 지금은 버전 처리를 `prepareRaw` **한 곳**에 두고 `loadOverlay` 와 이 함수가 그것만
 * 부른다 — 갈라질 자리가 없으면 갈라지지 않는다.
 *
 * ── ⚠ 소비자가 반드시 읽을 것 (검수관 GS-O2) ────────────────────────────────
 * **두 함수가 같은 말을 하는 것은 `issues` 가 빌 때뿐이다.** 비지 않으면 결과가 다르다 —
 * 예를 들어 `{src: 'assets/models/a.glb', x: 'NaN'}` 은 `loadOverlay` 가 `x: 0` 으로
 * **살리고** 이 함수는 `bad-number` 로 **항목째 버린다.**
 *
 * 그래서 편집 UI 의 화면 미리보기가 `loadOverlay` 를 쓰면 **화면에 있는 모델이 내보내기에서
 * 사라진다.** 미리보기와 내보내기가 같은 함수를 보게 하거나, 다르다는 것을 화면에 표시해야
 * 한다 — 소비자(태스크 #25·#26)가 정할 자리다. 여기 적어 두는 이유는 그 판단이 **이 파일을
 * 읽지 않는 사람에게 필요하기** 때문이다.
 */
export function validateOverlay(raw: unknown): { overlay: Overlay; issues: OverlayIssue[] } {
  // 버전 판정·마이그레이션은 `loadOverlay` 와 **같은 함수**를 쓴다(위 주석 참조).
  const prepared = prepareRaw(raw);
  if (prepared.issues.length > 0) return { overlay: emptyOverlay(), issues: prepared.issues };

  const o = prepared.raw as Record<string, unknown> | null;
  const issues: OverlayIssue[] = [];

  if (!o || typeof o !== 'object' || !Array.isArray(o.items)) {
    issues.push({ reason: 'items-not-array' });
    return { overlay: emptyOverlay(), issues };
  }

  for (const k of Object.keys(o)) {
    if (!KNOWN_ROOT_KEYS.has(k)) { issues.push({ reason: 'unknown-field' }); break; }
  }

  const items: OverlayItem[] = [];
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

    const norm = normalizeItem(item, item.src);
    items.push(norm);

    // 값이 바뀌었으면 그것도 사유다 — "관문 통과 = 무손실" 이어야 편집 UI 가 믿을 수 있다.
    for (const k of ['x', 'y', 'z', 's'] as const) {
      if (item[k] !== undefined && item[k] !== norm[k]) { issues.push({ index, reason: 'clamped' }); break; }
    }

    // 회전만 사유를 나눈다(검수관 P17). 3π → π 는 **잘린 것이 아니라 접힌 것**이고 같은
    // 회전이다. `clamped` 로 묶으면 편집 UI 가 *"잘렸다"* 고 표시해 감독이 값을 잃은 줄
    // 안다. 보고는 하되 이름이 원인을 가리지 않게 한다.
    if (item.ry !== undefined && item.ry !== norm.ry) issues.push({ index, reason: 'folded' });

    // 계약이 모르는 필드는 출력에서 사라진다 — 사라진다는 사실 자체가 보고 대상이다.
    for (const k of Object.keys(item)) {
      if (!KNOWN_ITEM_KEYS.has(k)) { issues.push({ index, reason: 'unknown-field' }); break; }
    }
  });

  return { overlay: { version: OVERLAY_VERSION, items }, issues };
}
