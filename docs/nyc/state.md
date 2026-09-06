# 뉴욕 갤러리 거리 — 상태 (state)

지시서 `docs/NYC-GALLERY-WALK.md` §9 의 state.md. **마지막 통과 커밋 · 이번 변경 · 남은 문제 · 다음 행동** 네 칸만 적는다. 이력은 `docs/BOARD.md`.

## 단계: 반복 1 — 형태·빛·구도 (2026-09-06)

| 칸 | 내용 |
|---|---|
| 마지막 통과 커밋 | 32181ad4(월드10 골격) — 거리 GLB 는 이 커밋 뒤 |
| 이번 변경(반복 1) | 생성기 v1(`scripts/asset/nyc/` 5 파일, 부팀장) → `nyc-street.glb` 584KB·tri 7,966·재질 18 · 명세 단언 테스트 12 + 뮤테이션 M-A · 월드10 V1 기본 시작(`V1_START`, pitch −6°) · 헤드리스 캡처 V1/V2/V3(`evidence/iteration-01/`) · 로비 판(문 뒤 검은 구멍 처방) · 지면 판 확장(세계 밖 바다 가림) |
| (Baseline 변경) | 지시서 고정(`NYC-GALLERY-WALK.md`) · Baseline 조사(`baseline.md`) · 합격 조건(`acceptance.md`) · 기준 캡처 2장(`evidence/baseline/`) · 전송량 실측(world8 24.1MB / world2 18.6MB) · 삼각형·draw 실측(world8 470k/168, world2 1.34M/75 — `acceptance.md` §1) · 월드10 골격(`world10.html`·`world10-boot.ts`·`?cam=` 캡처 진입·`options.ts start` 계약·flagged 등록) — 산출 GLB 대기 |
| 남은 문제(반복 1) | ① V1 하늘 비중 ≈40%(상한 35%) — pitch 더 내리면 바닥 30% 상한과 충돌, 건물 높이/카메라 위치로 풀어야 ② 실내 색·조명은 헤드리스로 판단 불가(Lambert + hemi) — 감독 실기기 ③ 작품 슬롯은 빈 노드(작품 0) — 전시 기능(반복 2) ④ 캡처 하네스가 아직 스크래치 스크립트(`scripts/nyc/` 미편입) ⑤ 404 리소스 1건(URL 미확인) |
| (Baseline 남은 문제) | ① 세울 자리 — **팀장 판정 「A」**(world-glb + 월드10, 빌드 시점 산출 GLB, 조건 4 — BOARD 2026-09-06) ② 캡처 진입 `?cam=` — 조건부 허용(봉인 목적·G-W8J 대조 보고 선결) ③ 아트 기준 — 디자이너 작성 중 ④ 프레임 p95 측정 수단 없음(실기기 미확보) ⑤ 업로드 자산 영속(서버 0) — 지시서 §5 «로컬 저장만 되는 기능을 공개 전시 완료로 보고하지 않는다» |
| 다음 행동 | `tasks.md`(소유권 — 팀장 배정 반영) → 반복 1 착수: 생성기 `scripts/asset/nyc/` → 산출 GLB(≤5MB) → 월드10 부트 → `?cam=` 캡처 진입 → 6 시점 캡처 |

## 검증 등급·게이트 (이 저장소 규율)

- 거리 코드가 world-glb(flagged) 에 들어가면 3등급(검수 이연) — 승격 시 누적 검수(`OPERATING-PRINCIPLES.md §10-3`). world2 에 들어가면 1등급(매 PR 검수관).
- 배포는 FAST DEV 규칙(`docs/DEV-MODE.md`) — 화면 확인은 라이브 링크로, 전체 검증은 감독이 «검증해» 라고 할 때.
