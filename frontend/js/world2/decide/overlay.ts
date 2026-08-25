// world2/decide/overlay.ts — **사용자 배치 오버레이 계약 v2.** 순수 함수만.
//
// ── v2 가 더한 것: «파셀 동결» (감독 판정 2026-08-12) ────────────────────────
// v1 은 «GLB 를 얹는다» 만 담았다. 감독이 **마을 건물·나무도 기즈모로 옮기겠다**고 해서
// 그것을 담을 자리가 필요해졌는데, 여기서 이 계약의 가장 어려운 문제가 나왔다.
//
// **마을 파츠에는 이름이 없다.** `PlacedPart`(`parts/types.ts`)에 `id` 도 `index` 도 없고,
// 후보 키 `(px,pz,kind,i)` 는 **노브 한 번에 무효가 된다.** 실측(2026-08-12, 파셀 (3,-7) near):
//
//     기본        building 3채 · tree 3그루
//     ?bld=2      building 3채(동일) + 1채 추가 · tree **0그루**
//
// 구조적 원인은 `tree.ts` 가 `[...placed, ...out]`(먼저 놓인 것 전부)을 피해 빈 슬롯을 구하고
// 없으면 `break` 하는 것이다 — **건물이 늘면 나무가 전멸**하고, 살아남아도 슬롯 후보 수가
// 바뀌어 같은 난수가 다른 자리를 가리킨다. 즉 «3번 나무» 라는 표시는 슬라이더 한 번에
// **엉뚱한 나무를 가리키거나 아무것도 안 가리키게** 된다.
//
// **감독 판정이 이 문제를 없앴다** — *"손본 구역은 슬라이더에서 빠진다"*.
// 편집한 파셀은 `parcelLayout` 을 부르지 않고 **저장된 배치 배열 전체**를 쓴다. 배열 안에서
// 인덱스가 자기 완결적이므로 **파츠를 가리킬 키가 아예 필요 없다.**
//
// 대가는 정직하다: 그 파셀은 「파라미터가 곧 공간」에서 이탈해 «감독이 만든 것» 이 된다.
// ⚠ **경계는 파셀 단위이고 전역이 아니다.** 동결하지 않은 파셀은 그대로 계산된다.
// ⚠ **동결은 `parcelLayout` «바깥»에서 적용한다** — 그 함수의 출력을 바꾸면 골든 해시
//   (`world2-parcel-layout-golden.test.ts`, 38,241 파츠의 9필드 전체)가 깨진다. 깨지면
//   해시를 갱신할 것이 아니라 **설계가 틀린 것이다.**
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

import type { PlacedPart } from '../parts/types.js';
import { foldAngle } from './angle.js';
import { normalizeArts, type ArtIssueReason, type ArtworkItem } from './artwork.js';
import {
  SURFACE_KINDS, defaultSetting, isSurfaceKind, normalizeSetting,
  type SurfaceKind, type SurfaceSetting,
} from './surface-material.js';

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
   * 균등 스케일. **여전히 기본 배율이다.**
   *
   * ⚠ 이 자리는 오래 *"비균등을 일부러 안 넣었다 … 필요해지면 그 형태로 더한다"* 였고
   * **그 트리거가 발동했다**(감독 카드 판정 2026-08-22 「축별로 늘리기 — 세 방향」).
   * 예고한 대로 `space.ts` 전례와 같은 형태 — 옵션 필드, **생략 = 기존 동작.**
   */
  s: number;
  /**
   * 축별 배율. **`s` 에 곱해진다** — 최종 = `s * (sx ?? 1)`.
   *
   * 대체가 아니라 곱인 이유: ① **버전 불변** — 없으면 `1` 이라 옛 JSON 이 그대로 돈다
   * ② **균등 조작이 여전히 한 손잡이다** — 대체였다면 「비율이 어긋난 상태를 균등하게
   * 키우기」가 불가능해진다 ③ 마을 파츠(`PlacedPart`)의 `sx` 는 **본래 치수**이고
   * 여기 것은 **배수**다 — 그 차이는 `edit/target.ts` 어댑터가 흡수한다.
   *
   * ⚠ 곱을 클램프하지 않는다(최종이 `S_MAX²` 까지 갈 수 있다) — 클램프하면 «어느 쪽을
   * 깎았는지»가 안 보인다. 소비자가 곱한 뒤 자기 한계로 막는 편이 진단이 쉽다.
   */
  sx?: number;
  sy?: number;
  sz?: number;
}

/**
 * 편집으로 **동결된 파셀** 하나. 이 파셀은 `parcelLayout` 을 부르지 않고 `parts` 를 쓴다.
 *
 * ⚠ **`parts` 는 `near` 기준 전체 배치다.** tier(far/mid/near)로 줄이는 것은 **소비자 몫**이고
 * 이 계약은 tier 를 담지 않는다. tier 별로 세 벌 저장하면 크기가 3배가 되고, 무엇보다
 * `parcel-layout.ts` 불변식 ②(*"far ⊆ mid ⊆ near 이고 공통 원소의 위치가 동일"*)를 **데이터로
 * 표현하게 되어** 그 성질을 데이터가 깰 수 있다. near 하나만 두면 그 성질은 필터 규칙이
 * 소유한다.
 *
 * ⚠ **`kind` 의 유효성은 이 계약이 판정하지 않는다.** 유효한 파츠 종류 목록은 `parts/` 가
 * 소유하고(`ALL_KINDS`), 계약이 그것을 복사하면 파츠가 늘 때마다 두 곳이 갈라진다 —
 * 이 파일이 반려 사슬 내내 싸운 바로 그 형태다. 여기서는 «비어 있지 않은 문자열» 까지만
 * 보고, **모르는 종류를 어떻게 할지는 소비자가 정하고 화면에 말한다.**
 */
export interface FrozenParcel {
  /** 파셀 격자 좌표(정수) */
  px: number;
  pz: number;
  /** 그 파셀의 배치 전체(near 기준). 빈 배열이면 «아무것도 없는 파셀» 이다 */
  parts: PlacedPart[];
}

export interface Overlay {
  version: number;
  items: OverlayItem[];
  /**
   * 동결된 파셀. v1 파일에는 없고 마이그레이션이 `[]` 로 채운다.
   *
   * 비어 있는 것이 **정상**이다 — 감독이 마을을 손대기 전까지는 계속 `[]` 이고, 그때는
   * world2 가 v1 과 완전히 같게 동작한다.
   */
  parcels: FrozenParcel[];
  /**
   * **표면 재질 설정**(W7). 감독 지시 *"심리스텍스처. 디퓨저맵. 노말맵. 하이라이트.
   * 메탈릭. 러프니스 조절하게 하자"*.
   *
   * ── 왜 배치가 아니라 **최상위**인가 ──────────────────────────────────────
   * 재질은 **종류당 하나를 온 세계가 공유한다**(`systems/parcel-assets.ts:29-31` 이 부팅에
   * 종류마다 딱 한 번 `spec.asset(THREE)` 를 부르고, `parcel-builder.ts` 에 `new Material`
   * 은 0건 — 실측). 그러므로 재질 설정은 «어느 배치» 의 속성이 아니라 «어느 종류» 의
   * 전역 상태다. `PlacedPart` 에 넣으면 같은 값이 파셀 수만큼 복제된다.
   *
   * ── 왜 버전을 안 올리나 (팀장 판정 1, 2026-08-14) ────────────────────────
   * 이 계약이 스스로 세운 확장 원칙을 그대로 따른다 — 위 `OverlayItem.s` 주석이 인용하는
   * `space.ts` 의 「옵션 필드를 버전 불변으로 더한다(생략 = 기존 동작)」 전례 넷.
   * v3 로 올리면 실질 변환이 없는 빈 마이그레이션이 하나 더 생기고, 그것은
   * *"신규 필드는 마이그레이션이 아니라 normalize 가 기본값으로 채운다"* 는 원칙을
   * 계약이 스스로 어기는 것이다.
   *
   * 구버전 코드가 이 필드를 만나면 **조용히 무시하지 않는다** — `KNOWN_ROOT_KEYS` 검사가
   * `unknown-field` 로 보고한다(팀장이 내 브리프의 과장을 정정한 지점이다).
   *
   * ── ⚠ 여러 작가가 살아도 이것은 **마을 것**이다 (감독 카드 2026-08-16, W8-3) ──
   * 작가 문서에 담겨 와도 `decide/multi-overlay.ts` 가 무시하고 `surfaces-ignored` 사유를
   * 낸다(조용히 삼키지 않는다). 근거는 취향이 아니라 **구조**다 — 조회 키가 `kind` 하나로
   * 굳어 `pools.create({key: kind})` → **`pools.seal()`** 로 이어지므로(`main.ts:780-795`),
   * owner 를 키에 넣으면 `seal()` 뒤 생성 불가 · 부팅에 사용자 수 선지식 필요 · 드로우콜
   * kind×owner 증식이 **연쇄한다.** 값이 아니라 구조가 바뀌어 `[7]` 의 델타 판정이 방패가
   * 못 된다. **재론 트리거**: 작가별 바닥·재질 커스텀 요구가 실제로 나오는 날.
   */
  surfaces: SurfaceSetting[];
  /**
   * **벽에 건 작품**(W8-4, 감독 요구 *"glb 건물 벽에 작품을 걸고"*). 판정·범위·유도는
   * 전부 `decide/artwork.ts` 가 소유하고 이 계약은 **부르기만** 한다(`surfaces` 와 같은
   * 형태). 버전을 안 올리는 근거도 위 `surfaces` 주석 그대로다.
   */
  arts: ArtworkItem[];
}

export const OVERLAY_VERSION = 2;

/**
 * 빈 오버레이. **상수가 아니라 팩토리인 이유**(검수관 P1): 상수로 두면 한 소비자가
 * `items.push` 한 것이 다른 소비자에게 그대로 보인다. 얼려도 되지만, 얼린 배열을 받은
 * 소비자가 나중에 조용히 실패하는 것보다 매번 새로 주는 편이 안전하다.
 */
export function emptyOverlay(): Overlay {
  // ⚠ `surfaces` 를 여기 넣는 것이 **`KNOWN_ROOT_KEYS` 를 자동으로 따라오게 하는 축**이다
  //   (`:258` 이 `Object.keys(emptyOverlay())` 로 유도한다). 팀장 조건 c-2 가 경계한
  //   «정상 JSON 이 unknown-field 로 오보되는 역방향 함정» 이 이 유도 덕에 구조적으로
  //   안 생긴다 — 그래도 그 케이스를 테스트에 넣는다(조건 c-2 는 축을 요구한다).
  return { version: OVERLAY_VERSION, items: [], parcels: [], surfaces: [], arts: [] };
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
// ⚠ **정의가 `decide/angle.ts` 로 옮겨갔다**(W8-4). 작품이 같은 접기를 복제했다가 규약이
// 갈린 사고가 그 이유이고, 전문은 그 파일 헤더 한 곳이다. 여기서는 이름만 잇는다.
const foldRy = foldAngle;

/** 항목 하나의 수치 정규화. `normalizeOverlay` 와 `validateOverlay` 가 **함께** 쓴다. */
function normalizeItem(item: Record<string, unknown>, src: string): OverlayItem {
  return {
    src,
    x: clamp(item.x, -POS_LIMIT, POS_LIMIT, 0),
    y: clamp(item.y, -POS_LIMIT, POS_LIMIT, 0),
    z: clamp(item.z, -POS_LIMIT, POS_LIMIT, 0),
    ry: foldRy(item.ry),
    s: clamp(item.s, S_MIN, S_MAX, 1),
    // 🔴 **생략은 생략으로 남긴다.** 항상 `1` 을 내면 안 만진 항목까지 키를 달고 나가고,
    // 그러면 「이 항목은 축별을 만졌나」를 구별할 수 없다 — 버전 불변의 요점이 그것이다.
    ...axisScale(item),
  };
}

/**
 * 축별 배율 중 **있는 것만** 낸다. ⚠ `0` 은 `S_MIN` 으로 올린다 — 크기 0 은 편집 툴에서
 * 흔한 입력이고, 그대로 두면 **화면에서 사라진 것**이 「커밋 가능」 판정을 받는다
 * (이 계약이 `s` 에서 이미 겪은 형태다).
 */
function axisScale(item: Record<string, unknown>): Partial<Pick<OverlayItem, 'sx' | 'sy' | 'sz'>> {
  const out: Partial<Pick<OverlayItem, 'sx' | 'sy' | 'sz'>> = {};
  for (const k of ['sx', 'sy', 'sz'] as const) {
    if (item[k] === undefined) continue;
    out[k] = clamp(item[k], S_MIN, S_MAX, 1);
  }
  return out;
}

/** 정수로 접는다. 파셀 좌표는 격자 인덱스라 소수가 의미 없다 */
const int = (v: unknown, d: number): number => {
  const n = num(v, NaN);
  return Number.isFinite(n) ? Math.trunc(n) : d;
};

/**
 * 파츠 하나의 수치 정규화. `PlacedPart` 와 **필드가 1:1이어야 한다** — 아니면 동결 파셀을
 * 다시 읽을 때 조용히 다른 배치가 된다.
 *
 * ⚠ `tone` 은 **팔레트 인덱스**이고 색이 아니다(`parts/types.ts`: *"실제 색은 파츠의 `tones`
 * 가 정한다"*). 자유 색을 허용하면 텍스처가 있는 파츠에서 이 저장소가 이미 겪은 *"길이 안
 * 보였다"* 를 재현한다. 그래서 **0 이상 정수**만 받고 상한은 파츠가 소유한다.
 */
function normalizePart(p: Record<string, unknown>): PlacedPart {
  return {
    kind: typeof p.kind === 'string' ? p.kind : '',
    x: clamp(p.x, -POS_LIMIT, POS_LIMIT, 0),
    z: clamp(p.z, -POS_LIMIT, POS_LIMIT, 0),
    y: clamp(p.y, -POS_LIMIT, POS_LIMIT, 0),
    ry: foldRy(p.ry),
    // 비균등 스케일 — v1 이 *"필요해지면 옵션 필드로 더한다"* 고 이연해 둔 것을 v2 가
    // 해소한다. 마을 파츠는 애초에 비균등이 기본이다(`building.ts` 가 w·d·h 를 각각 뽑는다).
    sx: clamp(p.sx, S_MIN, S_MAX, 1),
    sy: clamp(p.sy, S_MIN, S_MAX, 1),
    sz: clamp(p.sz, S_MIN, S_MAX, 1),
    tone: Math.max(0, int(p.tone, 0)),
  };
}

/**
 * 동결 파셀 객체를 **만드는 유일한 자리.** `KNOWN_PARCEL_KEYS` 가 이 함수의 출력에서 키를
 * 읽으므로 필드가 늘면 여기 한 곳만 고치면 화이트리스트가 따라온다.
 *
 * ⚠ 처음엔 `{ px: 0, pz: 0, parts: [] } satisfies FrozenParcel` 리터럴이었다. 검수관 실측
 * (P2): `satisfies` 는 **필수** 필드 확장만 막고(3곳 컴파일 에러) **선택적** 필드를 더하면
 * 에러 0 이라 화이트리스트가 그 필드를 조용히 놓친다. 유도로 바꾸면 어긋날 자리가 없다.
 */
function makeParcel(px: number, pz: number, parts: PlacedPart[]): FrozenParcel {
  return { px, pz, parts };
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
// ⚠ **옵션 필드가 생기면서 「빈 입력」으로는 부족해졌다**(2026-08-25). `normalizeItem({})`
// 은 `sx·sy·sz` 를 일부러 안 내므로, 빈 입력으로 유도하면 그 셋이 화이트리스트에서 빠지고
// `{sx:2}` 가 `unknown-field` 로 **거부된다** — 위 B4·B6 과 방향만 반대인 같은 어긋남이다.
// 그래서 **「낼 수 있는 키 전부」를 얻는 입력**을 준다(`world2-overlay-axis-scale.test.ts`
// 의 왕복 검사가 이 어긋남을 잡는다).
const KNOWN_ITEM_KEYS = new Set(Object.keys(normalizeItem({ sx: 1, sy: 1, sz: 1 }, '')));
const KNOWN_ROOT_KEYS = new Set(Object.keys(emptyOverlay()));
const KNOWN_PART_KEYS = new Set(Object.keys(normalizePart({})));
// 파셀 껍데기의 키도 같은 원리로 유도한다 — `parts` 는 배열이라 정규화 결과에서 못 뽑으므로
// 최소 형태 하나를 만들어 그 키를 읽는다.
const KNOWN_PARCEL_KEYS = new Set(Object.keys(makeParcel(0, 0, [])));

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

  const rawParcels = Array.isArray(o.parcels) ? o.parcels : [];
  const parcels: FrozenParcel[] = [];
  for (const pc of rawParcels) {
    const parcel = pc as Record<string, unknown> | null;
    if (!parcel || typeof parcel !== 'object') continue;
    // 파셀 좌표가 수가 아니면 **어느 파셀인지 모르는 동결**이라 얹을 자리가 없다 — 버린다.
    if (typeof parcel.px !== 'number' || typeof parcel.pz !== 'number') continue;
    if (!Number.isFinite(parcel.px) || !Number.isFinite(parcel.pz)) continue;

    // ⚠ `parts` 가 배열이 아니면 **파셀째 버린다.** 빈 배열로 살려 두면 관문
    // (`validateOverlay`)은 그 파셀을 버리는데 런타임은 «파츠 0개인 파셀» 로 살려서
    // 화면에 «경고는 떴는데 파셀이 남아 있다» 가 된다(검수관 P3 실측). 이 파일이 B4·B5·B7
    // 로 세 번 반려된 *"두 함수가 같은 파일에 다른 말"* 이 그대로 재발하는 자리다.
    if (!Array.isArray(parcel.parts)) continue;
    const rawParts: unknown[] = parcel.parts;
    const parts: PlacedPart[] = [];
    for (const pt of rawParts) {
      const part = pt as Record<string, unknown> | null;
      if (!part || typeof part !== 'object') continue;
      const norm = normalizePart(part);
      if (norm.kind === '') continue; // 종류를 모르면 그릴 수 없다
      parts.push(norm);
    }
    parcels.push(makeParcel(int(parcel.px, 0), int(parcel.pz, 0), parts));
  }

  // ── 표면 재질 (W7) ────────────────────────────────────────────────────────
  // **종류 하나당 최대 하나**로 접는다. 같은 종류가 두 번 오면 **뒤엣것이 이긴다** —
  // 배열 순서가 곧 «나중에 칠한 것» 이라는 자연스러운 읽기이고, 그렇게 정하지 않으면
  // 「둘 중 어느 것이 화면에 뜨는가」가 소비자마다 갈린다.
  const rawSurfaces = Array.isArray(o.surfaces) ? o.surfaces : [];
  const byKind = new Map<SurfaceKind, SurfaceSetting>();
  for (const s of rawSurfaces) {
    const row = s as Record<string, unknown> | null;
    if (!row || typeof row !== 'object') continue;
    // 모르는 종류는 **버린다** — 칠할 표면이 없으면 설정이 갈 곳이 없다.
    if (!isSurfaceKind(row.kind)) continue;
    byKind.set(row.kind, normalizeSetting(row.kind, row));
  }
  // 선언 순서로 낸다 — 같은 입력이 같은 JSON 을 내야 «내보내기 했더니 순서만 바뀌었다»
  // 가 안 생긴다(`git diff` 가 그것을 실변경으로 읽는다).
  const surfaces = SURFACE_KINDS.filter((k) => byKind.has(k)).map((k) => byKind.get(k)!);

  const arts = normalizeArts(o.arts).items;   // 판정은 `decide/artwork.ts` 소유
  return { version: OVERLAY_VERSION, items, parcels, surfaces, arts };
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
 * 런타임 경로(`loadOverlay`)는 조용하다. 콘솔 경고든 화면이든 **보이게 만들 자리를 정한다** —
 * 태스크 #53. 그때까지 이 선택은 "정했다" 가 아니라 "빚이 있다" 로 읽는다.
 * ⚠ 이 줄은 오래 **태스크 #25** 를 가리키고 있었고 **그 태스크는 이미 끝났다**(오버레이 소비
 * = glb-city 일반화). 링크가 죽으면 빚이 아무 데도 안 걸린 채 잊힌다 — 검수관이 재제출
 * 리뷰에서 잡았다(P-2, 2026-08-13). 빚을 주석에만 적고 태스크로 뽑지 않으면 같은 일이 또 난다.
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
/**
 * v1 → v2. **배치는 한 톨도 안 바뀐다** — `parcels: []` 를 더할 뿐이다.
 *
 * ⚠ *"`normalizeOverlay` 가 어차피 `parcels` 없으면 `[]` 로 채우니 이 함수는 없어도 된다"* 가
 * 맞다. 그래도 두는 이유는 **버전 사슬이 서 있어야 v3 가 생길 때 갈라질 자리가 없기**
 * 때문이다 — 이 파일이 B4·B5·B7 로 세 번 반려된 이유가 전부 «두 함수가 다른 말을 함» 이었고,
 * 그 처방이 *"복사를 그만두고 한 곳으로 뽑았다"* 였다. 사슬의 첫 고리를 비워 두면 다음
 * 사람이 그것을 `loadOverlay` 쪽에만 넣는다.
 */
function migrateV1toV2(raw: unknown): unknown {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return raw;
  return { ...o, version: OVERLAY_VERSION, parcels: Array.isArray(o.parcels) ? o.parcels : [] };
}

function prepareRaw(raw: unknown): { raw: unknown; issues: OverlayIssue[]; migrated: boolean } {
  const version = readVersion(raw);

  if (version === 'invalid') return { raw: null, issues: [{ reason: 'version-invalid' }], migrated: false };

  // 미래 버전(파일이 코드보다 새롭다)은 내용을 신뢰할 수 없다. 빈 것으로 떨어뜨린다 —
  // 부분적으로 해석해 이상한 마을을 보여주는 것보다 아무것도 안 얹는 편이 낫다.
  //
  // ⚠ `version !== 'absent'` 는 **런타임에서 아무것도 안 막는다**(검수관 N7 실측 —
  // 이 절을 지워도 0 failed 다). `'absent' > 1` 은 NaN 비교라 언제나 false 이기 때문이다.
  // TS 타입 내로잉에 필요해서 두는 것이고, *"이 가드가 absent 를 막고 있다"* 로 읽으면
  // 틀린다. 죽은 가드를 살아 있는 것으로 읽으면 다음 사람이 그 축을 검사한 것으로 센다.
  if (version !== 'absent' && version > OVERLAY_VERSION) {
    return { raw: null, issues: [{ reason: 'version-too-new' }], migrated: false };
  }

  // ── 마이그레이션 자리 — **여기 한 곳이다.** ────────────────────────────────
  // `normalizeOverlay` **앞**이라는 것이 조건이다(그 함수가 출력 `version` 을 현재 값으로
  // 덮어쓰므로 순서가 뒤집히면 마이그레이션이 언제나 «이미 최신» 으로 즉시 반환한다 — B1).
  //
  // `'absent'`(버전 필드가 아예 없는 손글씨 파일)도 v1 로 보고 태운다.
  const migrated = version === 'absent' || version < OVERLAY_VERSION;
  if (migrated) raw = migrateV1toV2(raw);

  return { raw, issues: [], migrated };
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
  /** 동결 파셀 인덱스. 파셀 쪽 사유에만 붙는다(`index` 는 `items` 쪽이다) */
  parcel?: number;
  /** 작품 인덱스. 작품 쪽 사유에만 붙는다(W8-4) */
  art?: number;
  reason:
    | 'not-object' | 'unsafe-src' | 'bad-number' | 'clamped' | 'folded'
    | 'items-not-array' | 'version-too-new' | 'version-invalid' | 'unknown-field'
    // ── v2 가 더한 사유 ──────────────────────────────────────────────────────
    /** 동결 파셀의 `px`·`pz` 가 수가 아니다 — 어느 파셀인지 몰라 얹을 자리가 없다 */
    | 'parcel-no-coord'
    /** 루트의 `parcels` 가 있는데 배열이 아니다 — 동결이 통째로 사라진다 */
    | 'parcels-not-array'
    /** 동결 파셀의 `parts` 가 배열이 아니다 */
    | 'parts-not-array'
    /** 파츠의 `kind` 가 비었다 — 무엇을 그릴지 모른다 */
    | 'part-no-kind'
    // ── W7 이 더한 사유 ──────────────────────────────────────────────────────
    /** 루트의 `surfaces` 가 있는데 배열이 아니다 — 표면 설정이 통째로 사라진다 */
    | 'surfaces-not-array'
    /** 루트의 `arts` 가 배열이 아니다(작품이 통째로 사라진다) · 세부는 `ArtIssueReason` */
    | 'arts-not-array' | ArtIssueReason
    /** 표면 종류를 모른다 — 칠할 자리가 없다 */
    | 'surface-unknown-kind'
    /** 표면 텍스처 경로가 안전하지 않다 — 그 맵만 버려진다 */
    | 'surface-unsafe-texture';
  /** 표면 설정 인덱스. 표면 쪽 사유에만 붙는다 */
  surface?: number;
}

/**
 * 표면 설정의 **수치 필드 목록. 손으로 안 적고 유도한다.**
 *
 * ⚠ 팀장 조건 c-1(2026-08-14)이 겨냥한 자리다. 이 파일의 나머지 검사 배열은 전부 손으로
 * 적힌 리터럴이고(`:585`·`:643`·`:655`), 그래서 필드를 더할 때 세 줄을 같이 안 고치면
 * `bad-number`·`clamped` 검출이 **조용히 0** 이 된다 — 이 파일이 세 번 반려된 형태다.
 *
 * `defaultSetting` 의 출력에서 `typeof === 'number'` 인 키를 뽑으면 **필드를 더하는 순간
 * 검사도 따라온다.** 기존 배열을 못 고치는 것은 그쪽이 `PlacedPart`(다른 파일 소유)를
 * 보기 때문이고, 이 새 축에서는 그 제약이 없다.
 */
const SURFACE_NUM_KEYS = Object.entries(defaultSetting('ground'))
  .filter(([, v]) => typeof v === 'number')
  .map(([k]) => k) as readonly (keyof SurfaceSetting)[];

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
export function validateOverlay(
  raw: unknown,
): { overlay: Overlay; issues: OverlayIssue[]; migrated: boolean } {
  // 버전 판정·마이그레이션은 `loadOverlay` 와 **같은 함수**를 쓴다(위 주석 참조).
  const prepared = prepareRaw(raw);
  if (prepared.issues.length > 0) {
    return { overlay: emptyOverlay(), issues: prepared.issues, migrated: false };
  }

  const o = prepared.raw as Record<string, unknown> | null;
  const issues: OverlayIssue[] = [];

  // ⚠ 마이그레이션은 `issues` 에 **넣지 않는다.** 처음엔 넣었고 기존 계약 테스트 10건이
  // 즉시 빨간불이 됐는데, 그 빨간불이 옳았다 — `issues` 는 *"감독이 봐야 할 손실"* 이고
  // 편집 UI 는 그것이 비어야 1차 클릭에서 저장한다. v1 파일을 열 때마다 «손실 있음» 경고가
  // 뜨면 그 경고가 무의미해지고, 진짜 손실이 났을 때 감독이 그것을 무시하게 된다.
  //
  // 그렇다고 숨기지도 않는다 — 계약 문장이 *"의도적 정규화를 넣는다면 그것도 사유로 보고하거나
  // 이 문장을 먼저 고쳐야 한다"* 라고 적어 뒀으므로 **반환값에 `migrated` 를 따로 낸다.**
  // 「issues 가 비면 무손실」은 그대로 참이고(배치·값·필드는 하나도 안 바뀐다), 바뀌는 것은
  // `version` 하나이며 그것은 별도 채널로 알린다.

  if (!o || typeof o !== 'object' || !Array.isArray(o.items)) {
    issues.push({ reason: 'items-not-array' });
    return { overlay: emptyOverlay(), issues, migrated: prepared.migrated };
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

  // ── 동결 파셀 (v2) ────────────────────────────────────────────────────────
  // `items` 와 **같은 규칙**으로 본다: 못 쓰는 것은 버리되 버렸다는 사실을 보고하고,
  // 값이 바뀌었으면 그것도 보고한다. 「issues 가 비면 무손실」은 파셀에도 적용된다.
  const parcels: FrozenParcel[] = [];
  if (o.parcels !== undefined && !Array.isArray(o.parcels)) {
    issues.push({ reason: 'parcels-not-array' });
  } else {
    const rawParcels: unknown[] = Array.isArray(o.parcels) ? o.parcels : [];
    rawParcels.forEach((pc: unknown, parcel: number) => {
      const p = pc as Record<string, unknown> | null;
      if (!p || typeof p !== 'object') { issues.push({ parcel, reason: 'not-object' }); return; }

      const okCoord = typeof p.px === 'number' && typeof p.pz === 'number'
        && Number.isFinite(p.px) && Number.isFinite(p.pz);
      if (!okCoord) { issues.push({ parcel, reason: 'parcel-no-coord' }); return; }
      if (!Array.isArray(p.parts)) { issues.push({ parcel, reason: 'parts-not-array' }); return; }

      const px = int(p.px, 0);
      const pz = int(p.pz, 0);
      // 파셀 좌표는 격자 인덱스라 소수가 잘린다 — 잘렸으면 그것도 변경이다.
      if (px !== p.px || pz !== p.pz) issues.push({ parcel, reason: 'clamped' });

      for (const k of Object.keys(p)) {
        if (!KNOWN_PARCEL_KEYS.has(k)) { issues.push({ parcel, reason: 'unknown-field' }); break; }
      }

      const parts: PlacedPart[] = [];
      for (const pt of p.parts as unknown[]) {
        const part = pt as Record<string, unknown> | null;
        if (!part || typeof part !== 'object') { issues.push({ parcel, reason: 'not-object' }); continue; }

        for (const k of ['x', 'y', 'z', 'ry', 'sx', 'sy', 'sz', 'tone'] as const) {
          const v = part[k];
          if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v))) {
            issues.push({ parcel, reason: 'bad-number' });
            return;
          }
        }

        const norm = normalizePart(part);
        if (norm.kind === '') { issues.push({ parcel, reason: 'part-no-kind' }); continue; }
        parts.push(norm);

        for (const k of ['x', 'y', 'z', 'sx', 'sy', 'sz', 'tone'] as const) {
          if (part[k] !== undefined && part[k] !== norm[k]) { issues.push({ parcel, reason: 'clamped' }); break; }
        }
        if (part.ry !== undefined && part.ry !== norm.ry) issues.push({ parcel, reason: 'folded' });

        for (const k of Object.keys(part)) {
          if (!KNOWN_PART_KEYS.has(k)) { issues.push({ parcel, reason: 'unknown-field' }); break; }
        }
      }

      parcels.push(makeParcel(px, pz, parts));
    });
  }

  // ── 표면 재질 (W7) ────────────────────────────────────────────────────────
  const surfaces: SurfaceSetting[] = [];
  if (o.surfaces !== undefined && !Array.isArray(o.surfaces)) {
    // `parcels-not-array` 와 같은 처방 — 통째로 사라지는 것을 말한다.
    issues.push({ reason: 'surfaces-not-array' });
  } else if (Array.isArray(o.surfaces)) {
    const seen = new Map<SurfaceKind, SurfaceSetting>();
    o.surfaces.forEach((s: unknown, surface: number) => {
      const row = s as Record<string, unknown> | null;
      if (!row || typeof row !== 'object') { issues.push({ surface, reason: 'not-object' }); return; }
      if (!isSurfaceKind(row.kind)) { issues.push({ surface, reason: 'surface-unknown-kind' }); return; }
      const norm = normalizeSetting(row.kind, row);

      // 맵 넷 중 «값은 있는데 정규화가 버린 것» 이 곧 안전하지 않은 경로다.
      for (const k of ['map', 'normalMap', 'metalnessMap', 'roughnessMap'] as const) {
        if (row[k] !== undefined && norm[k] === undefined) {
          issues.push({ surface, reason: 'surface-unsafe-texture' });
          break;
        }
      }
      // 수치는 **유도된 목록**으로 본다(위 `SURFACE_NUM_KEYS` 주석).
      for (const k of SURFACE_NUM_KEYS) {
        const v = row[k];
        if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v))) {
          issues.push({ surface, reason: 'bad-number' });
          break;
        }
      }
      for (const k of SURFACE_NUM_KEYS) {
        if (row[k] !== undefined && row[k] !== norm[k]) {
          issues.push({ surface, reason: 'clamped' });
          break;
        }
      }
      seen.set(row.kind, norm);
    });
    // 정규화와 **같은 순서 규칙**을 쓴다 — 두 함수가 다른 순서를 내면 «내보내기 했더니
    // 순서만 바뀌었다» 가 되고, 그것이 이 파일이 세 번 반려된 «다른 말» 의 한 형태다.
    for (const k of SURFACE_KINDS) { const v = seen.get(k); if (v) surfaces.push(v); }
  }

  // ── 벽에 건 작품 (W8-4) — 사유를 **그대로 옮긴다**(다시 판정하면 두 함수가 갈린다) ──
  let arts: ArtworkItem[] = [];
  if (o.arts !== undefined && !Array.isArray(o.arts)) {
    issues.push({ reason: 'arts-not-array' });
  } else {
    const got = normalizeArts(o.arts);
    arts = got.items;
    for (const a of got.issues) issues.push({ art: a.index, reason: a.reason });
  }

  return {
    overlay: { version: OVERLAY_VERSION, items, parcels, surfaces, arts },
    issues,
    migrated: prepared.migrated,
  };
}
