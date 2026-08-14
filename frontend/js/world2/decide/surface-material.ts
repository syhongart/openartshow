// world2/decide/surface-material.ts — **표면 재질 판정.** 순수 함수만.
//
// ── 감독 지시에서 생겼다 (2026-08-14) ───────────────────────────────────────
// *"땅의 텍스쳐 심리스를 주면 그대로 적용할수있게 하는거지. 그리고 타일링 배율로 촘촘히
// 힐것인지. 조절하고 각도 조절하고. 그러다면 예를들어 땅이라면 유브이가 동일 해야겠지?
// 땅. 잔디. 물속"*
// *"심리스텍스처. 디퓨저맵. 노말맵. 하이라이트. 메탈릭. 러프니스 조절하게 하자"*
//
// 카드로 좁힌 것: 「하이라이트」 = **반짝임·광택** · 범위 = **바닥 + 건물 벽 + 물속** ·
// 각도 = **90° 단위 먼저**.
//
// ── 이 파일이 지키는 것 하나 ────────────────────────────────────────────────
// **이음매가 생기는 값을 애초에 담을 수 없게 만든다.** 아래 `QuarterTurns`·`clampRepeat`
// 가 그 집행이다. 근거는 실측이고 아래 절에 적는다 — 규율이 «fail-closed» 라고 부르는
// 것이고, 검증 등급 판정기가 「판정 불가는 가장 무거운 등급」으로 같은 원리를 쓴다.

import {
  PAINTABLE_KINDS, specFor, type PartKind, type PlacedPart,
} from '../parts/index.js';

/**
 * 물 표면. **파츠가 아니라 `features/ocean.ts` 소관**이라 파츠 레지스트리에 없다.
 *
 * 이 둘만 **월드 좌표 UV** 를 갖는다(`ocean.ts:966` — `vx / PLANE + 0.5`). 그래서 각도
 * 제약을 안 받는다(아래 `isWorldUv`).
 */
export const WATER_SURFACES = ['sea', 'bed'] as const;

/**
 * 칠할 수 있는 표면 전체.
 *
 * ⚠ **마을 파츠 쪽은 손으로 안 적는다 — 파츠가 `paintable` 로 신고하고 여기서 유도한다.**
 * 첫 판본이 목록을 여기 적었고 `tests/world2-parts-registry.test.ts` 가 즉시 잡았다
 * (*"레지스트리 밖에 파츠 목록을 다시 적지 않는다"*). 그 축이 옳다 — 파츠를 추가하면
 * 이 목록이 낡고, 증상은 «새 파츠만 칠할 수 없음» 이라 원인을 짐작하기 어렵다.
 *
 * ⚠⚠ **광장은 목록에 없다.** `parts/plaza.ts` 는 순수 판정 함수뿐이고 포장 파츠가 실재하지
 * 않는다(실측) — 광장 바닥은 `ground` 가 그린다(태스크 #17 이 그 사실을 이미 적었다).
 */
export const SURFACE_KINDS: readonly string[] = [...PAINTABLE_KINDS, ...WATER_SURFACES];

/**
 * 표면 종류. `PartKind` 를 물려받는다 — 좁히려면 여기에 파츠 이름을 다시 적어야 하고
 * 그것이 바로 위가 막는 값 미러링이다.
 *
 * ⚠ **이 타입은 사실상 `string` 이다. 타입 안전을 기대하지 마라.** 각 파츠 파일이
 * `export const building: PartSpec = { kind: 'building', … }` 로 선언해 `kind` 가 이미
 * `string` 으로 넓어져 있고, 그래서 `PartKind` 도 리터럴 유니온이 아니다(실측 —
 * `Record<SurfaceKind, string>` 인 아래 `SURFACE_LABEL` 이 7개만 갖고도 컴파일된다).
 *
 * **방어는 런타임 `isSurfaceKind` 하나뿐이고**, 라벨 누락은 컴파일러가 아니라
 * `tests/world2-surface-material.test.ts` 의 커버리지 축이 잡는다. 이 문장을 «타입이
 * 조금 넓다» 로 줄여 적지 마라 — 다음 사람이 컴파일러를 믿고 확인을 생략한다.
 */
export type SurfaceKind = PartKind | (typeof WATER_SURFACES)[number];

/** 아는 표면인가. 계약 정규화가 모르는 종류를 버리는 축 */
export function isSurfaceKind(v: unknown): v is SurfaceKind {
  return typeof v === 'string' && SURFACE_KINDS.includes(v);
}

/** 화면에 쓰는 이름. `SHADING_LABEL` 과 같은 처방 — 값 미러링을 막는다 */
export const SURFACE_LABEL: Readonly<Record<SurfaceKind, string>> = {
  ground: '지면',
  garden: '잔디',
  road: '길',
  building: '건물 벽',
  tower: '타워',
  sea: '수면',
  bed: '물속 바닥',
};

/**
 * 그 표면의 UV 가 **월드 좌표에서 나오는가**.
 *
 * ── 이 구분이 이 회차 전체의 축이다 (실측 2026-08-14) ──────────────────────
 * 물(바다·강·해저)은 `features/ocean.ts:966` 이 `vx / PLANE + 0.5` 로 **월드 좌표에서**
 * UV 를 낸다 — 판이 하나이고 세계 전체를 덮으므로 이음매가 원리적으로 없다.
 *
 * 마을 파츠는 다르다. 파셀마다 **자기 0~1 UV** 를 갖고(`garden.ts:120` 판 = 셀 크기,
 * `parcel-builder.ts:225` 파셀 원점은 인스턴스 **행렬**로만 들어간다), 인스턴스별 UV
 * 오프셋 속성은 없다(`instancing.ts:274-293` 이 만드는 것은 `instanceColor` 하나).
 *
 * **지금 무늬가 이어져 보이는 것은 설계가 아니라 우연이다** — `repeat = 8`(`garden.ts:168`)
 * 이 정수이고 판이 정확히 셀 크기(32m)라 타일 격자가 파셀 격자에 정렬될 뿐이다.
 * 연속성은 세 조건이 **동시에** 참일 때만 성립한다: ① repeat 정수 ② 판 = 셀 크기
 * ③ 회전이 90° 배수.
 *
 * 그래서 월드 UV 가 아닌 표면에는 아래 두 제약을 **계약 수준에서** 건다.
 */
export function isWorldUv(kind: SurfaceKind): boolean {
  return kind === 'sea' || kind === 'bed';
}

// ── 회전 ────────────────────────────────────────────────────────────────────

/**
 * 90° 를 몇 번 돌렸나. **라디안이 아니다.**
 *
 * ⚠ **이 타입이 이 파일에서 가장 중요한 결정이다.** 임의 각도를 담을 수 없게 하면
 * 「파셀 변마다 사선 이음매가 생기는 값」이 **구조적으로 저장 불가능**해진다. 라디안으로
 * 두면 지금 당장 그 값을 쓸 수 있게 되고, 그것은 감독이 «심리스» 라고 부른 것의 반대다.
 *
 * 나중에 임의 각도를 열 때는 필드를 넓히는 것이 아니라 **UV 를 월드 좌표로 바꾸는 것이
 * 선결**이다. 정수 필드로 두면 그 순서가 계약에 박힌다 — 다음 사람이 «각도만 열면
 * 되겠네» 로 지나갈 수 없다.
 */
export type QuarterTurns = 0 | 1 | 2 | 3;

export function isQuarterTurns(v: unknown): v is QuarterTurns {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

/** 모르는 값은 0(안 돌림)으로 본다 — 안 돌리는 쪽이 언제나 이음매가 없다 */
export function normalizeTurns(v: unknown): QuarterTurns {
  return isQuarterTurns(v) ? v : 0;
}

/** three 의 `texture.rotation` 에 넣을 라디안 */
export function turnsToRadians(t: QuarterTurns): number {
  return (t * Math.PI) / 2;
}

/**
 * 회전의 기준점. **`(0.5, 0.5)` 로 세운다.**
 *
 * three 의 기본 `center` 는 `(0,0)`(`Texture.js:53-55`)이라 UV 좌하단을 축으로 돈다.
 * 배율을 함께 만지면 무늬가 크게 밀려 «각도만 바꿨는데 위치가 튄다» 가 된다.
 * 값이 아니라 **이유**를 여기 적어 두는 것이 요점 — 집행 쪽에서 이 상수를 안 쓰면
 * 화면에서만 드러난다.
 */
export const UV_CENTER = 0.5;

// ── 배율 ────────────────────────────────────────────────────────────────────

/**
 * 타일링 배율의 범위. **정수만 받는다.**
 *
 * 비정수(2.5 등)는 `u = 1` 이 타일 중간에 떨어지고 이웃 파셀이 0 에서 재시작해
 * **파셀 변마다 하드 심(32m 격자)** 이 생긴다. 월드 UV 표면(물)은 그 제약이 없지만
 * **판정을 하나로 유지한다** — 표면마다 다른 규칙을 쓰면 「이 값이 왜 여기서만 되나」가
 * 화면에서만 드러나는 형태가 된다.
 *
 * 상한 64: 32m 판에서 타일 1장 = 0.5m 다. 그보다 촘촘하면 밉맵·이방성으로도 아른거림을
 * 못 잡는다(이 상한은 **유도가 아니라 판단**이다 — 감독이 더 촘촘한 것을 원하면 올린다).
 */
export const REPEAT_MIN = 1;
export const REPEAT_MAX = 64;

/** 정수로 접고 범위에 가둔다. 모르는 값은 1(원본 크기) */
export function clampRepeat(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 1;
  return Math.min(REPEAT_MAX, Math.max(REPEAT_MIN, n));
}

// ── 반짝임 ──────────────────────────────────────────────────────────────────

/**
 * 「반짝임」 ↔ 러프니스.
 *
 * ── 화면에 노브를 **하나만** 내는 이유 ──────────────────────────────────────
 * 감독이 고른 「하이라이트」는 «젖은 도로나 대리석처럼 빛이 반사되는 정도» 다. 그런데
 * `MeshStandardMaterial` 은 **메탈릭-러프니스 워크플로**라 `specular` 슬롯이 **없다** —
 * 반짝임은 러프니스의 반대편으로만 표현된다.
 *
 * 그래서 노브는 하나이고 이름만 감독이 읽기 쉬운 쪽(「반짝임」)으로 낸다. **화면에 둘을
 * 보여주면 그것이 거짓 UI 다** — 하나를 움직이면 다른 하나가 따라 움직이는 것을 감독이
 * 보게 되고, 그때부터 두 노브 다 못 믿는다.
 *
 * 진짜 별도 축(`MeshPhysicalMaterial` 의 `specularIntensity`)이 필요해지는 조건은
 * «금속과 젖은 비금속을 동시에 다르게» 이고, 그때는 재질 계열이 바뀌어 파츠 12곳과
 * 셰이딩 뷰 전제에 파급되므로 **감독·팀장 판단**이다.
 */
export function glossToRoughness(gloss: number): number {
  const g = Number.isFinite(gloss) ? Math.min(1, Math.max(0, gloss)) : 0;
  return 1 - g;
}

export function roughnessToGloss(roughness: number): number {
  const r = Number.isFinite(roughness) ? Math.min(1, Math.max(0, roughness)) : 1;
  return 1 - r;
}

/** 0~1 로 가둔다. 모르는 값은 `fallback` */
export function clamp01(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.min(1, Math.max(0, v))
    : fallback;
}

// ── 텍스처 경로 ─────────────────────────────────────────────────────────────

/**
 * 커밋된 텍스처만 통과시킨다.
 *
 * ⚠ **`decide/overlay.ts` 의 `isSafeSrc`(`.glb` 전용)를 넓히지 않고 나란히 둔다.**
 * 하나로 합치면 「이 src 가 모델인가 텍스처인가」를 부르는 쪽이 알 수 없어지고, 계약이
 * 명시한 «절대 URL 금지가 유일한 보안 경계» 가 흐려진다. 검사 자체는 같은 원리다 —
 * 화이트리스트이고, `..`·`//`·`/./` 를 거부해 표기 다형성을 없앤다.
 */
const TEX_RE = /^assets\/textures\/[A-Za-z0-9_\-./]+\.(png|jpg|jpeg|webp)$/;

export function isSafeTextureSrc(src: unknown): src is string {
  if (typeof src !== 'string') return false;
  if (src.includes('..') || src.includes('//') || src.includes('/./')) return false;
  return TEX_RE.test(src);
}

// ── 재질 명세 ───────────────────────────────────────────────────────────────

/**
 * 한 표면의 재질 설정. **집행이 이것만 보고 재질을 만든다.**
 *
 * 맵 넷은 전부 선택이다 — 생략하면 그 슬롯을 안 건드린다(지금 화면 그대로).
 * ⚠ r171 은 `map`·`normalMap`·`metalnessMap`·`roughnessMap` 이 **전부 UV1 을 쓴다**
 * (`Texture.js:38` `channel = 0`, `WebGLPrograms.js:261-291` 이 슬롯을 동일 처리).
 * `PlaneGeometry`/`BoxGeometry` 기본 UV 만으로 넷 다 동작한다 — UV2 를 안 만들어도 된다.
 */
export interface SurfaceSetting {
  readonly kind: SurfaceKind;
  readonly map?: string;
  readonly normalMap?: string;
  readonly metalnessMap?: string;
  readonly roughnessMap?: string;
  readonly repeat: number;
  readonly turns: QuarterTurns;
  readonly metalness: number;
  readonly roughness: number;
}

/**
 * 기본값 — **「손대지 않은 것과 같은 화면」**이어야 한다.
 *
 * `roughness: 1`·`metalness: 0` 은 반사를 지운 상태이고, 맵이 전부 없으므로 집행 쪽이
 * 재질을 아예 안 건드린다. 즉 이 값으로 채워도 지금 화면이 그대로다 — 그것이 「생략 =
 * 지금 동작」이라는 계약 규약의 집행이다.
 */
export function defaultSetting(kind: SurfaceKind): SurfaceSetting {
  return { kind, repeat: 1, turns: 0, metalness: 0, roughness: 1 };
}

/** 아무 맵도 안 붙은 설정인가 — 집행이 «건드릴 것이 없다» 를 빨리 판정하는 축 */
export function hasNoMaps(s: SurfaceSetting): boolean {
  return s.map === undefined && s.normalMap === undefined
    && s.metalnessMap === undefined && s.roughnessMap === undefined;
}

/**
 * 임의 입력을 설정으로 정규화한다. **모르는 값은 기본값으로 떨어진다.**
 *
 * 안전하지 않은 텍스처 경로는 **조용히 버린다** — 던지지 않는 것은 `decide/overlay.ts` 가
 * 세운 규약이다(`:265-269`). 다만 무엇이 버려졌는지는 검증(`reviewSurfaces`)이 말한다.
 */
export function normalizeSetting(kind: SurfaceKind, raw: unknown): SurfaceSetting {
  const d = defaultSetting(kind);
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const tex = (v: unknown): string | undefined => (isSafeTextureSrc(v) ? v : undefined);
  return {
    kind,
    map: tex(r.map),
    normalMap: tex(r.normalMap),
    metalnessMap: tex(r.metalnessMap),
    roughnessMap: tex(r.roughnessMap),
    repeat: clampRepeat(r.repeat),
    turns: normalizeTurns(r.turns),
    metalness: clamp01(r.metalness, d.metalness),
    roughness: clamp01(r.roughness, d.roughness),
  };
}
