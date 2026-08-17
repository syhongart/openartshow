// world2/decide/artwork.ts — **벽에 거는 작품.** 순수 함수만 (W8-4).
//
// ── 감독 요구 (2026-08-16, 이 회차의 출발점) ──────────────────────────────
// *"glb 건물 벽에 작품을 걸고 안에 조명을 비출수있을까"*
//
// 이 파일은 그중 **작품** 쪽이다. 조명은 `decide/art-light.ts` 가 소유한다 — 둘을 한
// 파일에 두면 «액자 크기를 고치려는 사람» 이 라이트 풀 산술을 함께 읽어야 한다.
//
// ── 왜 `rx`/`rz` 를 안 여는가 ─────────────────────────────────────────────
// **수직면만 벽으로 받기 때문이다.** 액자가 기울 일이 없으면 회전은 yaw 하나로 끝나고,
// 계약(`decide/overlay.ts`)의 `OverlayItem` 이 이미 `ry` 만 갖는 것과 형태가 같아진다.
// 축을 더 여는 것은 «천장에 붙이겠다» 같은 요구가 실제로 올 때다 — **여기서 멈춘다.**
//
// ── 왜 `assets/art/` 인가 — 표면 텍스처와 **다른 계약**이다 ────────────────
// `isSafeTextureSrc`(`surface-material.ts`)는 `assets/textures/` 를 본다. 확장자 규칙이
// 지금 같다고 해서 그 함수를 재사용하면, 한쪽 요구로 넓히는 순간 다른 쪽 방어가 조용히
// 약해진다 — 계약 파일이 `isSafeSrc` 를 두고 적어 둔 그 경고이고 `tenant-id.ts` 에서도
// 같은 판정을 했다. 관리 주체도 다르다: 벽 텍스처는 **마을(감독)** 것이고 작품은
// **작가** 것이다.
//
// ── 크기는 종횡비에서 **유도한다** ────────────────────────────────────────
// 저장하는 것은 «긴 변 길이 + 종횡비» 이고 W/H 는 계산한다. 둘 다 저장하면 이미지를
// 바꿨을 때 한쪽만 낡는다(값 미러링). `space.ts:293-297` 의 `ar` 이 같은 규약이다.

import { foldAngle } from './angle.js';

/**
 * 받는 이미지 확장자. **아래 두 정규식이 이 하나에서 나온다** — 경로 계약(`ART_RE`)과
 * 분류(`IMAGE_NAME_RE`). 목록을 각자 적으면 한쪽만 넓혀도 아무도 모른다(값 미러링).
 */
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp'] as const;
const EXT_ALT = IMAGE_EXT.join('|');

/**
 * 작품 이미지 경로. **`assets/art/` 아래 상대경로만.**
 *
 * 검사를 정규식 하나로 끝내지 않는 것은 계약(`decide/overlay.ts:169-183`)이 `isSafeSrc`
 * 에서 실측으로 배운 그대로다 — `.` 을 허용하는 문자군은 `..` 도 통과시킨다.
 */
const ART_RE = new RegExp(`^assets/art/[A-Za-z0-9_\\-./]+\\.(${EXT_ALT})$`);

/** 이름이 이미지처럼 보이는가. **대소문자를 안 가린다** — 아래 함수 주석이 그 이유다 */
const IMAGE_NAME_RE = new RegExp(`\\.(${EXT_ALT})$`, 'i');

/**
 * 이 파일을 **작품으로 다룰 것인가** (W8-4 D2). 확장자만 본다.
 *
 * ⚠ **`isSafeArtSrc` 와 다른 질문이다.** 「무엇으로 다룰 것인가」(분류)와 「쓸 수 있는
 * 이름인가」(계약)를 한 함수로 합치면 `내 그림.png` 를 떨어뜨렸을 때 분류가 실패해
 * **GLB 경로로 흘러가고**, 화면이 *"확장자는 소문자 .glb"* 라는 **엉뚱한 사유**를 말한다.
 * 그래서 여기는 넓게(대소문자 무시) 잡고, 거부 사유는 작품 쪽에서 낸다.
 */
export function looksLikeImage(fileName: string): boolean {
  return IMAGE_NAME_RE.test(fileName);
}

// 회전 접기는 **계약과 같은 함수**를 쓴다. 첫 판본은 복제했고 규약이 갈렸다 —
// 그 사고와 처방은 `decide/angle.ts` 헤더 한 곳이다.

export function isSafeArtSrc(src: unknown): src is string {
  if (typeof src !== 'string') return false;
  if (src.includes('..')) return false;
  return ART_RE.test(src);
}

/** 저장할 경로를 만든다. 통과 못 하면 `null` — 호출부가 사유를 말한다 */
export function artSrcFor(fileName: string): string | null {
  const src = `assets/art/${fileName}`;
  return isSafeArtSrc(src) ? src : null;
}

/** 벽에 걸린 작품 하나. **계약(`Overlay.arts`)의 원소다** */
export interface ArtworkItem {
  /** 이미지 경로 */
  src: string;
  /** 액자 중심(월드 좌표). 벽에서 이미 띄운 값이다 */
  x: number;
  y: number;
  z: number;
  /** 벽 바깥을 향하는 yaw(라디안) */
  ry: number;
  /** **긴 변이 아니라 가로** 길이(m). 세로는 `ar` 에서 유도한다 */
  w: number;
  /** 종횡비(가로/세로). `space.ts` 의 `part.ar` 과 같은 규약 */
  ar: number;
}

// ── 값의 범위 — 왜 이 수인가 ───────────────────────────────────────────────

/**
 * 액자 가로 길이(m)의 범위와 기본값.
 *
 * 하한 `0.2` 는 «걸었는데 안 보인다» 를 막는 값이다(1m 밖에서 알아볼 수 있는 최소치).
 * 상한 `12` 는 마을 건물 한 면보다 크지 않게 잡았다 — `parcel-layout` 의 건물 밑동이
 * 3~8m 이므로 그 1.5배까지는 «큰 벽화» 로 성립하고, 그 이상은 벽을 뚫는다.
 * 기본 `2.4` 는 사람 눈높이에서 한눈에 들어오는 크기다.
 *
 * ⚠ **라이브 미술관의 `ART_W`/`ART_H`(2.8×2.0)를 그대로 쓰지 않았다.** 그쪽은 실내
 * 갤러리 벽 기준이고 여기는 마을 건물 외벽·실내가 섞인다. 같은 값을 두 곳에 적으면
 * 한쪽만 고쳐도 아무도 모른다 — **다른 값인 것이 의도다.**
 */
export const ART_W_MIN = 0.2;
export const ART_W_MAX = 12;
export const ART_W_DEF = 2.4;

/** 종횡비 범위. `space.ts:296` 의 `0.1~10` 과 같은 이유(importJSON 우회 값 방어) */
export const ART_AR_MIN = 0.1;
export const ART_AR_MAX = 10;
/** 생략 시 기본. 가로가 조금 긴 사각형 — 세로 사진도 가로 사진도 아닌 중립값 */
export const ART_AR_DEF = 1.2;

function num(v: unknown, min: number, max: number, def: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : def;
  return n < min ? min : n > max ? max : n;
}

export type ArtIssueReason =
  /** 항목이 객체가 아님 */
  | 'art-not-object'
  /** 경로가 커밋 불가 */
  | 'art-unsafe-src'
  /** 좌표가 숫자가 아님 */
  | 'art-bad-number'
  /** 값이 범위로 잘림 */
  | 'art-clamped';

export interface ArtIssue {
  readonly index: number;
  readonly reason: ArtIssueReason;
}

/**
 * 날것 하나를 작품으로 정규화한다. **던지지 않는다.**
 *
 * @returns 정규화된 항목과 **손실 사유**. 항목이 `null` 이면 통째로 버려진 것이다.
 *
 * ⚠ `issues` 를 함께 내는 것이 이 함수의 요점이다 — 내보내기 관문(`edit/export.ts`)이
 * *"issues 가 비면 무손실"* 을 약속하므로, 조용히 값을 고치면 **화면과 파일이 달라진다.**
 */
export function normalizeArt(raw: unknown, index: number): {
  item: ArtworkItem | null;
  issues: ArtIssue[];
} {
  const issues: ArtIssue[] = [];
  if (raw === null || typeof raw !== 'object') {
    return { item: null, issues: [{ index, reason: 'art-not-object' }] };
  }
  const r = raw as Record<string, unknown>;
  if (!isSafeArtSrc(r.src)) {
    return { item: null, issues: [{ index, reason: 'art-unsafe-src' }] };
  }
  // 좌표는 **기본값으로 메우지 않는다** — 어디에 걸렸는지 모르는 액자는 원점에 겹쳐
  // 쌓인다. 하나라도 숫자가 아니면 항목을 버리고 사유를 낸다.
  for (const k of ['x', 'y', 'z'] as const) {
    if (typeof r[k] !== 'number' || !Number.isFinite(r[k])) {
      return { item: null, issues: [{ index, reason: 'art-bad-number' }] };
    }
  }
  const w = num(r.w, ART_W_MIN, ART_W_MAX, ART_W_DEF);
  const ar = num(r.ar, ART_AR_MIN, ART_AR_MAX, ART_AR_DEF);
  // 「잘렸다」는 손실이므로 말한다. 「생략돼 기본값이 들어갔다」는 손실이 아니다 —
  // 계약의 확장 규약(「생략 = 기존 동작」)이 그것을 정상으로 정의한다.
  if (r.w !== undefined && r.w !== w) issues.push({ index, reason: 'art-clamped' });
  if (r.ar !== undefined && r.ar !== ar) issues.push({ index, reason: 'art-clamped' });

  return {
    item: {
      src: r.src,
      x: r.x as number, y: r.y as number, z: r.z as number,
      ry: foldAngle(r.ry), w, ar,
    },
    issues,
  };
}

/** 배열 통째로. 계약이 이것만 부른다 — 원소 순회를 두 곳에 적지 않는다 */
export function normalizeArts(raw: unknown): { items: ArtworkItem[]; issues: ArtIssue[] } {
  if (!Array.isArray(raw)) return { items: [], issues: [] };
  const items: ArtworkItem[] = [];
  const issues: ArtIssue[] = [];
  raw.forEach((one, i) => {
    const got = normalizeArt(one, i);
    issues.push(...got.issues);
    if (got.item) items.push(got.item);
  });
  return { items, issues };
}

/**
 * 액자의 실제 치수. **저장하지 않고 매번 유도한다.**
 *
 * 세로가 가로보다 길어도(세로 사진) 그대로 둔다 — 「긴 변을 맞춘다」로 하면 세로 사진과
 * 가로 사진이 화면에서 다른 크기로 보이고, 그것을 작가가 예측할 수 없다.
 */
export function frameSize(item: Pick<ArtworkItem, 'w' | 'ar'>): { w: number; h: number } {
  return { w: item.w, h: item.w / item.ar };
}

// ── 벽에 붙이기 ────────────────────────────────────────────────────────────

/**
 * 벽에서 띄우는 거리(m).
 *
 * 라이브 미술관이 `0.051` 을 쓴다(`artworks.js`). **그 값을 베끼지 않고 유도한다**:
 * z-fighting 은 깊이 버퍼 정밀도 문제이고 world2 의 카메라 `near` 가 라이브와 다르므로
 * 같은 값이 같은 안전을 주지 않는다. 5cm 는 육안으로 «벽에 붙어 있다» 로 읽히는 상한이고
 * (그 이상이면 떠 보인다), 1mm 는 swiftshader 에서 이미 깜빡였다.
 */
export const WALL_GAP = 0.03;

/**
 * 「이 면을 벽으로 볼 것인가」의 판정. 법선의 **수직 성분**으로 가른다.
 *
 * `0.35` 는 약 **69도** 이상 선 면만 받는다(`cos 69° ≈ 0.35`). 왜 90도가 아닌가 —
 * GLB 건물의 벽이 정확히 수직인 보장이 없고(모델러가 살짝 기울인 외벽이 흔하다),
 * 완전 수직만 받으면 «벽을 눌렀는데 안 걸린다» 가 난다. 반대로 이보다 느슨하면
 * 지붕 경사면이 벽으로 잡혀 액자가 하늘을 본다.
 */
export const WALL_MAX_TILT = 0.35;

export interface WallHit {
  /** 광선이 맞힌 점(월드) */
  readonly point: { x: number; y: number; z: number };
  /** 그 면의 법선(월드, 정규화돼 있다고 가정하지 않는다) */
  readonly normal: { x: number; y: number; z: number };
}

/**
 * 레이캐스트가 준 **로컬** 법선을 월드로 옮긴다 (W8-4 D).
 *
 * ⚠ **이 변환을 빠뜨리면 증상이 「안 걸린다」가 아니라 「엉뚱한 데를 본다」다.**
 * three 의 `Intersection.face.normal` 은 맞힌 지오메트리의 **로컬 좌표계** 값이다.
 * 건물이 `ry` 로 돌아가 있으면(오버레이 GLB 는 대부분 그렇다) 로컬 법선을 그대로
 * `wallPose` 에 넣는 순간 액자가 **회전 전 방향**을 향한다 — 화면에는 «벽을 뚫고 선
 * 액자» 로 보이고, 벽 판정(`WALL_MAX_TILT`)도 엉뚱한 면에서 통과한다.
 *
 * 회전 성분(3×3)만 곱하고 정규화한다 — three 의 `Vector3.transformDirection` 과 같다.
 * **균등 스케일 전제**이고 이 저장소에서 그것이 성립한다: 계약의 `OverlayItem.s` 는
 * **스칼라 하나**라 축별로 다른 배율이 나올 수 없다. 비균등이 열리면 이 함수는
 * inverse-transpose 가 필요해진다 — **재론 트리거**를 여기 적어 둔다.
 *
 * @param local 로컬 법선
 * @param m 열 우선 4×4(three `Object3D.matrixWorld.elements`)
 */
export function toWorldNormal(
  local: { x: number; y: number; z: number },
  m: ArrayLike<number>,
): { x: number; y: number; z: number } | null {
  const { x, y, z } = local;
  if (m.length < 11) return null;
  const nx = m[0] * x + m[4] * y + m[8] * z;
  const ny = m[1] * x + m[5] * y + m[9] * z;
  const nz = m[2] * x + m[6] * y + m[10] * z;
  const len = Math.hypot(nx, ny, nz);
  // 길이 0 은 «법선이 없다» 와 같다. `wallPose` 도 같은 문턱으로 거른다.
  if (!Number.isFinite(len) || len < 1e-6) return null;
  return { x: nx / len, y: ny / len, z: nz / len };
}

/**
 * 벽 히트 → 액자 자세. **벽이 아니면 `null`** 이고 호출부가 «벽을 눌러 주세요» 를 말한다.
 *
 * yaw 는 `atan2(nx, nz)` 다 — three 의 기본 평면은 +Z 를 향하므로, 법선 방향을 보게
 * 하려면 그 각을 그대로 쓴다. 액자를 벽 **바깥쪽**으로 띄우는 것도 같은 법선을 쓴다.
 */
export function wallPose(hit: WallHit): { x: number; y: number; z: number; ry: number } | null {
  const { x: nx, y: ny, z: nz } = hit.normal;
  const len = Math.hypot(nx, ny, nz);
  if (!Number.isFinite(len) || len < 1e-6) return null;
  const ux = nx / len, uy = ny / len, uz = nz / len;
  if (Math.abs(uy) > WALL_MAX_TILT) return null;   // 바닥·천장·지붕 경사면
  // 수평 성분만으로 방향을 잡는다 — 살짝 기운 벽에서도 액자는 똑바로 선다.
  const hlen = Math.hypot(ux, uz);
  if (hlen < 1e-6) return null;
  const hx = ux / hlen, hz = uz / hlen;
  return {
    x: hit.point.x + hx * WALL_GAP,
    y: hit.point.y,
    z: hit.point.z + hz * WALL_GAP,
    ry: Math.atan2(hx, hz),
  };
}
