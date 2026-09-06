# 뉴욕 갤러리 거리 — 상태 (state)

지시서 `docs/NYC-GALLERY-WALK.md` §9 의 state.md. **마지막 통과 커밋 · 이번 변경 · 남은 문제 · 다음 행동** 네 칸만 적는다. 이력은 `docs/BOARD.md`.

## 단계: Baseline (2026-09-06)

| 칸 | 내용 |
|---|---|
| 마지막 통과 커밋 | (아직 없음 — 거리 코드 0줄) |
| 이번 변경 | 지시서 고정(`NYC-GALLERY-WALK.md`) · Baseline 조사(`baseline.md`) · 합격 조건(`acceptance.md`) · 기준 캡처 2장(`evidence/baseline/`) · 전송량 실측(world8 24.1MB / world2 18.6MB) · 삼각형·draw 실측(진행 중) |
| 남은 문제 | ① 세울 자리 — **팀장 판정 「A」**(world-glb + 월드9, 빌드 시점 산출 GLB, 조건 4 — BOARD 2026-09-06) ② 캡처 진입 `?cam=` — 조건부 허용(봉인 목적·G-W8J 대조 보고 선결) ③ 아트 기준 — 디자이너 작성 중 ④ 프레임 p95 측정 수단 없음(실기기 미확보) ⑤ 업로드 자산 영속(서버 0) — 지시서 §5 «로컬 저장만 되는 기능을 공개 전시 완료로 보고하지 않는다» |
| 다음 행동 | `tasks.md`(소유권 — 팀장 배정 반영) → 반복 1 착수: 생성기 `scripts/asset/nyc/` → 산출 GLB(≤5MB) → 월드9 부트 → `?cam=` 캡처 진입 → 6 시점 캡처 |

## 검증 등급·게이트 (이 저장소 규율)

- 거리 코드가 world-glb(flagged) 에 들어가면 3등급(검수 이연) — 승격 시 누적 검수(`OPERATING-PRINCIPLES.md §10-3`). world2 에 들어가면 1등급(매 PR 검수관).
- 배포는 FAST DEV 규칙(`docs/DEV-MODE.md`) — 화면 확인은 라이브 링크로, 전체 검증은 감독이 «검증해» 라고 할 때.
