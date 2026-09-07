// world10/edit/export.ts — 내보내기 관문. **순수 함수다**(DOM·다운로드는 부르는 쪽).
//
// 계약(`decide/overlay.ts`)이 *"issues 가 비면 무손실"* 을 약속하므로, 관문은
// `validateOverlay` 여야 한다 — `loadOverlay` 는 깨진 항목을 조용히 살리거나 버려서
// **화면과 파일이 달라진다.** 그 두 함수가 갈리는 지점을 계약 파일이 직접 경고한다.

import { validateOverlay, type OverlayIssue } from '../decide/overlay.js';

export interface ExportReview {
  /** 저장해도 무손실인가. `false` 면 1차 클릭에서 저장하지 않는다 */
  readonly clean: boolean;
  /** 저장할 내용. `clean` 이 아니어도 채운다 — 2차 클릭에서 그대로 쓴다 */
  readonly json: string;
  readonly issues: readonly OverlayIssue[];
  /** 화면에 띄울 한 줄. 사유별 개수를 센다 */
  readonly summary: string;
  /** 강조할 항목 인덱스(파일 전체 사유는 인덱스가 없다) */
  readonly badIndexes: readonly number[];
}

const REASON_KO: Record<OverlayIssue['reason'], string> = {
  'not-object': '항목이 객체가 아님',
  'unsafe-src': '경로가 커밋 불가',
  'bad-number': '숫자가 아님',
  clamped: '값이 범위로 잘림',
  folded: '회전이 한 바퀴 접힘',
  'items-not-array': 'items 가 배열이 아님',
  'version-too-new': '파일 버전이 코드보다 새로움',
  'version-invalid': '버전을 해석할 수 없음',
  'unknown-field': '계약이 모르는 필드가 사라짐',
  // ── v2 (파셀 동결) ────────────────────────────────────────────────────────
  // ⚠ `migrated` 는 여기 **없다.** 그것은 손실이 아니라 알림이라 `issues` 가 아닌 별도
  // 필드로 온다(`validateOverlay` 의 `migrated`). 사유 목록에 넣으면 v1 파일을 열 때마다
  // «손실 있음» 이 떠서 그 경고 자체가 무의미해진다.
  'parcel-no-coord': '동결 파셀에 좌표가 없음',
  'parcels-not-array': 'parcels 가 배열이 아님',
  'parts-not-array': '동결 파셀의 parts 가 배열이 아님',
  'part-no-kind': '파츠 종류를 알 수 없음',
  // ── W7 (표면 재질) ────────────────────────────────────────────────────────
  // ⚠ 이 표가 `Record<OverlayIssue['reason'], string>` 인 것이 값 미러링을 막는 축이다 —
  // 계약에 사유를 더하면 **컴파일이 여기서 멈춘다.** 실제로 W7 에서 그렇게 멈췄다.
  'surfaces-not-array': 'surfaces 가 배열이 아님',
  'surface-unknown-kind': '칠할 수 없는 표면 종류',
  'surface-unsafe-texture': '텍스처 경로가 커밋 불가',
  // ── W8-4 (벽에 건 작품) ───────────────────────────────────────────────────
  // ⚠ 이 표가 `Record<...>` 인 것이 값 미러링을 막는 축이라고 위에 적혀 있고, W8-4 에서
  // **또 그대로 멈췄다** — 계약에 사유를 더하자 컴파일이 여기서 났다. 두 번째 실물 사례다.
  'arts-not-array': 'arts 가 배열이 아님',
  'art-not-object': '작품 항목이 객체가 아님',
  'art-unsafe-src': '작품 이미지 경로가 커밋 불가',
  'art-bad-number': '작품 좌표가 숫자가 아님',
  'art-clamped': '작품 크기가 범위로 잘림',
};

/**
 * 내보낼 내용을 판정한다. **저장하지 않는다** — 부르는 쪽이 `clean` 을 보고 결정한다.
 *
 * `json` 은 `validateOverlay` 가 정규화한 결과다. 원본을 그대로 쓰지 않는 이유: 관문이
 * *"이 값으로 나간다"* 고 말한 것과 실제로 나가는 것이 다르면 관문이 거짓말을 한 것이 된다.
 */
export function reviewOverlay(raw: unknown): ExportReview {
  const { overlay, issues } = validateOverlay(raw);
  const counts = new Map<string, number>();
  const badIndexes: number[] = [];
  for (const i of issues) {
    counts.set(i.reason, (counts.get(i.reason) ?? 0) + 1);
    if (i.index !== undefined && !badIndexes.includes(i.index)) badIndexes.push(i.index);
  }
  const summary = issues.length === 0
    ? `${overlay.items.length}개 — 무손실`
    : [...counts].map(([r, n]) => `${REASON_KO[r as OverlayIssue['reason']] ?? r} ${n}`).join(' · ');
  return {
    clean: issues.length === 0,
    json: JSON.stringify(overlay, null, 2) + '\n',
    issues,
    summary,
    badIndexes,
  };
}
