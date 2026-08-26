// world2/ui/import-notice.ts — **되읽기 결과를 사람 말로 옮긴다.** 순수 함수만, DOM 접촉 0.
//
// ── 왜 떼어냈나 (검수관 조건 C1, 2026-08-25) ────────────────────────────────
// 이 조립이 `export-panel.ts` 의 `onFile` 안에 인라인이었고, 그래서 **어떤 검사도 닿지
// 않았다.** 검수관이 실측으로 못 박았다 — `failed` 판정을 `false` 로 바꾸면 버튼 라벨·
// 고지·경고 세 자리가 **동시에** 실패를 안 말하게 되는데 4,785건 중 **0건**이 깨졌다.
//
// 그 상태가 곧 **감독이 신고한 화면이 그대로 돌아온 것**이다:
//
//     ✓ 28,704개 적용 · ⚠ 재질 이름 형식이 아니다: Material.001
//     (실패했다는 말이 어디에도 없다)
//
// B1 은 애초에 «검사가 없어서 조용했던» 결함이었다. 검사 없이 고치면 같은 경로로
// 돌아온다 — 이 저장소 규율이 *"안 깨지면 게이트가 아니라 장식이다"* 라고 적은 그것이다.
//
// ⚠ **문구 전체를 검사하지 않는다.** 다듬을 때마다 깨지면 그 검사는 곧 무시된다.
// 검사가 보는 것은 **실패 표식이 있는가** 하나다(검수관 GS-B 명세).

/** 되읽기가 무엇을 했는가. `export/imported-scene.ts` 의 `reason` 과 같은 어휘다 */
export interface ImportOutcome {
  /** 되읽은 우리 파츠 수 */
  parts: number;
  /** 씬에 올린 남의 메시 수 */
  foreign: number;
  reason: 'ok' | 'none' | 'no-bin' | 'error' | 'stale';
  /** `error` 일 때의 사유 */
  detail?: string;
}

export interface ImportNotice {
  /** 실패했는가 — 세 문구가 전부 이 판정 위에 선다 */
  failed: boolean;
  /** 사람에게 보일 실패 사유 */
  why: string;
  /** 아무것도 못 읽어 파일을 거절하는가 */
  reject: boolean;
  /** 버튼 라벨(거절일 때) */
  rejectLabel: string;
  /** 고지 문구 */
  note: string;
  /** 경고 목록의 **맨 앞**에 들어갈 것. 실패가 아니면 `null` */
  leadWarning: string | null;
}

/** 대체 범위를 정확히 적는다 — 팀장 판정 (B)로 `?edit=1` 배치는 **유지**된다 */
const TAIL = ' (마을 원장과 편집 화면 배치는 그대로입니다)';

/**
 * 되읽기 결과 → 화면 문구.
 *
 * ⚠ **실패는 파츠가 실렸어도 말한다.** 그것이 B1 의 핵심이다 — 감독이 실제로 고르는
 * 파일은 «우리 파츠 28,704 + 블렌더 추가 오브젝트 1» 이라, `parts > 0` 이면 실패를
 * 삼키던 판본에서 신고된 화면이 그대로 재발했다.
 */
export function importNotice(o: ImportOutcome): ImportNotice {
  const failed = o.reason === 'error' || o.reason === 'no-bin';
  const why = o.reason === 'no-bin'
    ? '파일에 지오메트리 데이터(BIN)가 없다'
    : o.detail ?? '알 수 없는 오류';

  // 아무것도 못 읽었다 — 우리 재질 규약도 없고 올릴 메시도 없다.
  // ⚠ 실패해서 0 인 것을 «형식이 아니다» 로 뭉개지 않는다. 사용자가 파일을 의심하게
  // 되는데 실제로는 우리가 못 읽은 것이다.
  const reject = o.parts === 0 && o.foreign === 0;

  return {
    failed,
    why,
    reject,
    rejectLabel: failed ? `✗ 물건을 못 읽었다 — ${why}` : '✗ 우리 형식이 아니다',
    note: failed
      // 반쯤 적용된 상태를 «성공» 으로 적으면 사용자는 물건이 왜 없는지 영영 모른다.
      ? `⚠ 부품 배치는 적용했지만 추가된 물건은 못 올렸습니다 — ${why}${TAIL}`
      : o.foreign > 0
        ? `이 GLB 의 부품 배치가 마을 편집을 대체하고, 추가된 물건 ${o.foreign.toLocaleString()}개가 함께 올라왔습니다${TAIL}`
        : `이 GLB 가 마을 편집을 대체합니다${TAIL}`,
    // 순서가 곧 우선순위다 — `notes[0]` 만 버튼에 나간다(모바일에서 콘솔을 못 본다).
    leadWarning: failed ? `⚠ 추가된 물건 못 올림 — ${why}` : null,
  };
}
