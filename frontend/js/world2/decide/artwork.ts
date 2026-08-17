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
 * **받는** 이미지 확장자 — 이 계약의 SSOT.
 *
 * 아래 셋이 전부 이 하나에서 나온다: 경로 계약(`isSafeArtSrc` 의 소문자 대조) · 분류
 * (`IMAGE_LIKE_EXT` 가 스프레드) · 화면 문구(`artNameHelp` 가 `join`). 목록을 각자 적으면
 * 한쪽만 넓혀도 아무도 모른다(값 미러링).
 *
 * ⚠ **`decide/surface-material.ts` 의 `TEX_RE` 가 같은 4종을 따로 적는 것은 의도다** —
 * 그 파일 주석이 근거를 갖는다(*"합치면 한쪽 요구로 넓히는 순간 다른 쪽 방어가 조용히
 * 약해진다"*). 벽 텍스처는 마을(감독) 것이고 작품은 작가 것이라 관리 주체가 다르다.
 */
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp'] as const;

/**
 * 작품 이미지 경로 접두. **아래 `ART_RE`·`artSrcFor` 와 `decide/upload-plan.ts` 가 이
 * 하나를 본다** (검수관 권고 P2).
 *
 * ⚠ 세 곳에 각각 적혀 있었다. 바로 위 `IMAGE_EXT` 가 **같은 diff 안에서** 확장자 목록에
 * 대해 정확히 이 처방을 하면서 *"목록을 각자 적으면 한쪽만 넓혀도 아무도 모른다"* 라고
 * 적었는데, 접두에는 안 썼다 — 새로 만드는 것만이라도 안 늘린다.
 */
export const ART_PREFIX = 'assets/art/';

/**
 * 작품 이미지 경로의 **줄기**. `assets/art/` 아래 상대경로 + 확장자 한 덩어리.
 *
 * 검사를 정규식 하나로 끝내지 않는 것은 계약(`decide/overlay.ts:169-183`)이 `isSafeSrc`
 * 에서 실측으로 배운 그대로다 — `.` 을 허용하는 문자군은 `..` 도 통과시킨다.
 *
 * ── 🔴 왜 확장자를 정규식에서 **빼냈나** (W8-5, 태스크 #94) ─────────────────
 * 예전에는 `\\.(${EXT_ALT})$` 로 확장자까지 한 정규식이 잡았고, 그래서 **소문자만**
 * 통과했다. 아이폰·캐논·니콘 기본 출력이 `IMG_1234.JPG`·`DSC_1234.JPG` 라 감독이 폰
 * 사진을 하나도 못 걸었다 — 「폰에서 넣기 먼저」(감독 카드 2026-08-17)를 이행하면서
 * 그것을 안 열면 **기능이 형식만 열린다.** 팀장 판정으로 열었다(#94, 2026-08-17).
 *
 * ⚠⚠ **`ART_RE` 전체에 `i` 플래그를 붙이는 길은 금지다.** 그러면 접두까지 무구분이 되어
 * `ASSETS/ART/a.png` 가 통과하고, 그것은 `decide/overlay.ts:197-199` 가 세운 «같은 파일의
 * 철자를 하나로 묶는다» 규약을 깬다. gh-pages 는 리눅스 정적 서빙이라 **경로 대소문자를
 * 구분한다** — 접두 철자가 갈리면 라이브에서만 404 가 난다.
 *
 * JS 정규식에는 인라인 플래그(`(?i:…)`)가 없으므로 **줄기와 확장자를 갈라** 확장자만
 * `toLowerCase()` 로 대조한다(`isSafeArtSrc`). 접두·줄기의 대소문자 구분은 그대로 산다.
 */
const ART_STEM_RE = new RegExp(`^${ART_PREFIX}[A-Za-z0-9_\\-./]+\\.([A-Za-z0-9]+)$`);

/**
 * **분류**용 확장자 — 계약(`IMAGE_EXT`)보다 **일부러 넓다.**
 *
 * ── 🔴 왜 넓히는가 — 좁은 분류는 엉뚱한 사유를 말한다 (W8-5) ────────────────
 * `looksLikeImage` 주석이 *"여기는 넓게 잡고, 거부 사유는 작품 쪽에서 낸다"* 라고 이미
 * 선언하고 있었는데 **코드는 계약과 같은 4종만 잡고 있었다** — 주석이 코드보다 앞서 있던
 * 형태다(이 파일이 `artNameHelp` 헤더에서 «가장 비싸게 배운 형태» 로 부르는 바로 그것).
 *
 * 실물 경로: 아이폰 사진 앱이 「원본 유지」면 **HEIC** 를 낸다. 좁은 분류에서 `photo.heic`
 * 는 이미지로 안 잡혀 **GLB 드롭 경로로 흘러가고**, 화면이 *"확장자는 소문자 .glb"* 라는
 * 엉뚱한 사유를 말한다. 감독은 사진을 떨어뜨렸는데 GLB 이야기를 듣는다.
 *
 * ⚠ **계약을 넓히는 것이 아니다.** `IMAGE_EXT` 는 그대로 4종이고 `heic` 는 **여전히
 * 거절된다** — 바뀌는 것은 **거절 사유가 정확해지는 것**뿐이다(팀장 판정 «확장자 목록
 * 확장은 범위 밖» 을 지킨다: 받는 목록은 안 건드렸다).
 */
const IMAGE_LIKE_EXT = [...IMAGE_EXT, 'heic', 'heif', 'gif', 'bmp', 'avif', 'tif', 'tiff'] as const;
const IMAGE_NAME_RE = new RegExp(`\\.(${IMAGE_LIKE_EXT.join('|')})$`, 'i');

/**
 * 이 파일을 **작품으로 다룰 것인가** (W8-4 D2). 확장자만 본다.
 *
 * ⚠ **`isSafeArtSrc` 와 다른 질문이다.** 「무엇으로 다룰 것인가」(분류)와 「쓸 수 있는
 * 이름인가」(계약)를 한 함수로 합치면 `내 그림.png` 를 떨어뜨렸을 때 분류가 실패해
 * **GLB 경로로 흘러가고**, 화면이 *"확장자는 소문자 .glb"* 라는 **엉뚱한 사유**를 말한다.
 * 그래서 여기는 넓게 잡고(**대소문자 + 확장자 종류 둘 다** — `IMAGE_LIKE_EXT`), 거부 사유는
 * 작품 쪽(`artNameHelp`)에서 낸다. ⚠ 「넓게」의 두 축 중 확장자 종류는 W8-5 에서야 실제로
 * 넓어졌다 — 그전까지 이 문장은 대소문자 축에서만 참이었다(`IMAGE_LIKE_EXT` 헤더).
 */
export function looksLikeImage(fileName: string): boolean {
  return IMAGE_NAME_RE.test(fileName);
}

// 회전 접기는 **계약과 같은 함수**를 쓴다. 첫 판본은 복제했고 규약이 갈렸다 —
// 그 사고와 처방은 `decide/angle.ts` 헤더 한 곳이다.

export function isSafeArtSrc(src: unknown): src is string {
  if (typeof src !== 'string') return false;
  if (src.includes('..')) return false;
  const m = ART_STEM_RE.exec(src);
  // 확장자 **하나만** 대소문자를 무시한다(W8-5). `ART_STEM_RE` 헤더가 왜 정규식 플래그가
  // 아니라 여기서 가르는지를 갖는다 — `i` 를 붙이면 접두까지 새고 라이브에서만 404 가 난다.
  return m !== null && (IMAGE_EXT as readonly string[]).includes(m[1]!.toLowerCase());
}

/** 저장할 경로를 만든다. 통과 못 하면 `null` — 사유는 `artNameHelp` 가 낸다 */
export function artSrcFor(fileName: string): string | null {
  const src = `${ART_PREFIX}${fileName}`;
  return isSafeArtSrc(src) ? src : null;
}

/**
 * 왜 못 쓰는 이름인지 **화면 문구로**. 통과하면 빈 문자열 (검수관 블로커 B2).
 *
 * ── 🔴 왜 생겼나 — 화면이 이미 만족한 조건을 고치라고 말했다 ────────────────
 * `looksLikeImage` 는 대소문자를 안 가리고(`IMAGE_NAME_RE` 에 `i`) `ART_RE` 는 소문자만
 * 받는다. 그 틈에 **`IMG_1234.JPG` 가 작품 경로로 들어와 거절**되는데, 사유가 한 줄뿐이라
 * 화면이 *"영문·숫자·_ - . 만 씁니다"* 라고 말했다 — **`IMG_1234.JPG` 는 이미 그렇다.**
 * 작가는 고칠 것이 없는 것을 고치라는 말을 듣고 진짜 원인(확장자 대문자)은 못 듣는다.
 *
 * 그리고 `looksLikeImage` 주석이 *"거부 사유는 작품 쪽에서 낸다"* 로 **이미 해결됐다고
 * 적고 있었다.** 분류를 넓히는 절반만 했고 사유를 가르는 절반을 안 한 것이다 —
 * 주석이 코드보다 앞서 있는 것이 이 저장소가 가장 비싸게 배운 형태다.
 *
 * ⚠ **문구를 소비자가 짓지 않는다**(`decide/upload-plan.ts` 의 명제 ④와 같은 이유).
 * 두 곳에 적으면 계약이 넓어져도 한쪽이 안 따라온다.
 *
 * ── ⚠⚠ 계약이 넓어졌는데 **이 함수가 살아 있는 이유** (W8-5) ────────────────
 * 대문자 확장자를 열었으므로(#94, 팀장 판정) `IMG_1234.JPG` 는 이제 **그냥 통과한다** —
 * B2 를 낳은 그 증상은 소멸했다. 그래서 처음 계획은 이 함수의 분기를 **지우는 것**이었다.
 *
 * **틀렸다.** 대문자를 여는 순간 `photo.heic`·`a.gif` 가 **정확히 같은 자리**로 들어온다 —
 * 그 이름들은 «영문·숫자·_ - . 만 씁니다» 를 **이미 만족**하는데 확장자 목록 밖이라 떨어진다.
 * 아이폰이 「원본 유지」 설정이면 HEIC 를 내므로 이것은 가정이 아니라 **감독이 바로
 * 부딪히는 경로**다. B2 는 사라진 것이 아니라 **한 칸 옆으로 옮겨간 것**이고, 그래서 분기도
 * 함께 옮겼다: 「소문자로 바꾸면 되는가」 → **「아는 확장자로 바꾸면 되는가」**.
 *
 * 축이 옮겨졌으므로 `tests/world2-artwork-mode.test.ts` 의 G2 도 케이스를 옮긴다
 * (`IMG_1234.JPG` → `photo.heic`). **테스트를 지우는 것이 아니라 재는 대상을 따라가는 것**이다.
 *
 * ⚠⚠⚠ **세 번째 사유는 일부러 접었다**(검수관 권고 P7 — B2 의 잔재가 아니다).
 * `../../etc/passwd.png` 는 `..` 때문에 떨어지는데 문구는 «영문·숫자·_ - . 만 씁니다» 를
 * 말한다 — 그 이름은 그 문자군을 **이미 만족한다**(`/` 와 `.` 이 허용 문자군에 있다).
 * 형태는 B2 와 같지만 **처리가 다른 이유가 둘**이다: ① 브라우저의 `File.name` 은
 * basename 이라 실제 드롭으로는 도달할 수 없다(테스트에서만 닿는다) ② 경로 탈출 시도에
 * **모호하게 답하는 것은 방어로서 의도**다. 다음 사람이 이것을 오간으로 읽고 «사유를
 * 하나 더 가르자» 로 고치지 않도록 적어 둔다.
 */
export function artNameHelp(fileName: string): string {
  if (artSrcFor(fileName) !== null) return '';
  // 확장자를 **아는 것으로 바꿔서** 통과하면 그것이 유일한 위반이다. 둘 다 어긋난 이름
  // (`내 그림.heic`)은 확장자를 고쳐도 안 되므로 문자군 쪽 사유가 맞다.
  // 확장자가 아예 없는 이름(`photo`)도 같은 축이라 붙여서 물어본다.
  const swapped = /\.[^.]+$/.test(fileName)
    ? fileName.replace(/\.[^.]+$/, `.${IMAGE_EXT[0]}`)
    : `${fileName}.${IMAGE_EXT[0]}`;
  // ⚠ **받는 목록을 문구에 직접 적지 않는다** — `IMAGE_EXT` 에서 짓는다. 손으로 적으면
  // 목록이 넓어져도 화면이 안 따라오고, 그것이 이 함수가 존재하는 이유(B2)와 같은 형태다.
  return artSrcFor(swapped) !== null
    ? `확장자를 ${IMAGE_EXT.join(' · ')} 중 하나로 해 주세요`
    : '영문·숫자·_ - . 만 씁니다';
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
 * 열 우선 4×4 두 개의 곱(`a · b`). 회전·스케일(3×3)만 쓴다 — 법선에 이동은 무의미하다.
 *
 * ⚠ **왜 필요한가**: 마을 건물·나무는 `InstancedMesh` 라 면 법선이 **두 변환**을 거친다
 * — 인스턴스 행렬(`getMatrixAt`)과 그 메시의 `matrixWorld`. 하나만 곱하면 파셀이
 * 원점에서 멀수록 액자가 엉뚱한 방향을 본다. 오버레이 GLB 는 변환이 하나뿐이라 이
 * 함수가 필요 없었고, 그래서 W8-4 D1 에는 없었다.
 */
export function mul3x3(a: ArrayLike<number>, b: ArrayLike<number>): number[] | null {
  if (a.length < 11 || b.length < 11) return null;
  const out = new Array<number>(16).fill(0);
  out[15] = 1;
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      // 열 우선: M[행 r][열 c] = m[c * 4 + r]
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2];
    }
  }
  return out;
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
 * ── 🔴 균등 스케일 전제를 버렸다 (2026-08-17, 감독 판정으로 재론 트리거 발동) ──
 * 첫 판본은 회전 성분(3×3)을 그대로 곱했고(three 의 `Vector3.transformDirection`),
 * 주석이 *"균등 스케일 전제이고 이 저장소에서 그것이 성립한다 … 비균등이 열리면 이
 * 함수는 inverse-transpose 가 필요해진다 — **재론 트리거**"* 라고 적어 두었다.
 *
 * **실측으로 그 트리거가 발동했다**: `parts/building.ts:184` 이 `sx: w, sy: h, sz: d` 로
 * 축마다 다른 배율을 쓴다(`road`·`garden`·`ground`·`tower` 도 같다). 마을 건물 벽에
 * 걸겠다는 감독 판정(2026-08-17)이 그 파츠들을 대상으로 만들었으므로 전제가 깨졌다.
 *
 * 그래서 **정규행렬 `(M⁻¹)ᵀ`** 을 쓴다(three 의 `Matrix3.getNormalMatrix` 와 같다).
 * 균등 스케일에서는 두 방법이 **같은 방향**을 낸다 — `(R·sI)⁻ᵀ = R·(1/s)I` 이고 정규화가
 * 배율을 지우기 때문이다. 그래서 기존 오버레이 GLB 동작은 안 바뀐다(테스트가 지킨다).
 * 갈리는 곳은 **로컬 법선이 축과 정렬되지 않은 면**이다: 축정렬 박스 벽면은 어느 쪽으로
 * 계산해도 같지만, 지붕 경사면·원통은 다르다 — 그리고 벽 판정(`WALL_MAX_TILT`)이
 * 통과/거절을 가르는 자리가 정확히 거기다.
 *
 * @param local 로컬 법선
 * @param m 열 우선 4×4(three `Object3D.matrixWorld.elements`, 또는 `mul3x3` 의 결과)
 */
export function toWorldNormal(
  local: { x: number; y: number; z: number },
  m: ArrayLike<number>,
): { x: number; y: number; z: number } | null {
  const { x, y, z } = local;
  if (m.length < 11) return null;
  // 열 우선 4×4 의 좌상단 3×3. 수학 표기 M[행][열] = m[열*4 + 행].
  const a = m[0], b = m[4], c = m[8];
  const d = m[1], e = m[5], f = m[9];
  const g = m[2], h = m[6], i = m[10];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  // 퇴화 행렬(스케일 0 인 축 등)은 «법선이 없다» 와 같다.
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  // `(M⁻¹)ᵀ = cofactor(M) / det`. det 로 나누는 것은 정규화가 지우지만 **부호는 남는다** —
  // 거울 변환(det < 0)에서 법선이 뒤집히는 것이 물리적으로 옳은 결과다.
  const nx = ((e * i - f * h) * x - (d * i - f * g) * y + (d * h - e * g) * z) / det;
  const ny = (-(b * i - c * h) * x + (a * i - c * g) * y - (a * h - b * g) * z) / det;
  const nz = ((b * f - c * e) * x - (a * f - c * d) * y + (a * e - b * d) * z) / det;
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
