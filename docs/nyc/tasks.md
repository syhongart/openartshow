# 뉴욕 갤러리 거리 — 작업표 (tasks)

팀장 배정(BOARD 2026-09-06 「A」). **동일 파일을 두 담당이 동시에 수정하지 않는다.** 판정자 분리: 구현자는 자기 결과의 유일한 평가자가 아니다.

## 담당·소유 파일

| 역할 | 담당(모델) | 소유 파일/경로 | 산출물 | 판정자 |
|---|---|---|---|---|
| 팀장 | team-lead(Fable 5.1) | 없음(Read) | 범위·순서·소유권·상위 문제 3·최종 수용 | — |
| 부팀장 | 이 세션(부팀장 역할) | `frontend/js/world-glb/options.ts`·`main.ts`·`systems/*`·`world10-boot.ts`(신설)·`world10.html`(신설)·`scripts/lib/entrypoints.mjs`·`CLAUDE.md` behind-flag 줄·`tests/verification-tier.test.ts` | 세계 소스 계약·통합 커밋·기술 리뷰·`?cam=` 캡처 진입 | 검수관 |
| 아트 디렉터 | designer(Opus 5) | `docs/nyc/art-direction.md` | 팔레트·비례·조명·6 시점 카메라·모듈·금지 패턴 / 매 반복 캡처 육안 판정(위치 특정 지시) | 감독(카드) |
| 환경 구현 | **부팀장 / deputy-lead(Opus 5)** — 2026-09-06 팀장 추인(executor 산출 명세 미달 사고, BOARD). executor 는 스윕·통계·캡처 수집만 | `scripts/asset/nyc/**`(생성기, node 순수)·`frontend/assets/worlds/nyc-*.glb`(산출)·`tests/nyc-*.test.ts`(생성기 단위) | 건물 6채 매스·완성 입면 3·보도·갤러리 실내 셸·트림시트·베이크 AO(버텍스 색)·산출 GLB ≤5MB | designer(시각)·release-reviewer(구조) |
| 전시 기능 | executor(Haiku) «전시» | `frontend/js/world-glb/nyc/**`(슬롯 레이어 **새 파일**)·`frontend/js/world-glb/store/nyc-*.ts`(신설)·`tests/nyc-slot*.test.ts` | 건물/방/슬롯 id → 오버레이 항목, 업로드·교체·저장·복원(로컬), 종횡비 보존 | release-reviewer |
| QA·성능 | executor(Haiku) «QA» | `scripts/nyc/**`(하네스 — `scripts/smoke/` **밖**)·`docs/nyc/evidence/iteration-XX/**` | 6 시점 캡처·30초 경로 프레임 시퀀스·삼각형/draw/전송량 JSON·콘솔 오류 — **증거 수집만, 판정 없음** | designer·release-reviewer |
| 검수관 | release-reviewer(Sonnet) | 없음 | 구조·게이트·기능/성능 통과 판정, 클론 뮤테이션 | — |

## 공유 인터페이스 (부팀장 확정 — 반복 1 착수 전)

| 항목 | 결정 | 근거 |
|---|---|---|
| 세계 소스 | `options.ts` `source(): Promise<ArrayBuffer>` **무변경**. 월드10 부트는 `assets/worlds/nyc-street.glb` 고정 fetch | 팀장 조건 1 |
| 좌표계·단위 | GLB = m, y-up, 지면 y=0(`glb-collider` 전제). 거리 축 = +x(동), 시작 위치 서쪽 끝 | baseline §3 |
| 건물/문/벽/슬롯 ID | GLB 노드 이름 규약(구분자 **`_`**): `bld_<n>` / `bld_<n>_door` / `bld_<n>_room_<r>_wall_<w>` / `bld_<n>_room_<r>_slot_<s>`(빈 노드, 행렬 = 슬롯 중심·법선·폭 w) — 생성기가 쓰고 슬롯 레이어가 읽는다. ⚠ `.` 을 쓰면 three 로더가 지운다(실측 표·규약 전문은 `decide/glb-nodes.ts` 헤더 한 곳) | 지시서 §5 «미리 정의한 전시 슬롯 먼저» |
| 실내 진입·퇴장 이벤트 | 같은 씬. `nyc/room-sense.ts`(신설)가 문 노드 통과로 `room:enter/leave` 를 낸다 — 라이트맵·조명 프리셋은 그 이벤트 소비 | 지시서 §5 |
| 작품 항목 | world2 오버레이 모델 `{src,x,y,z,ry,w,ar}` 재사용 + `slotId` 필드(선택). 저장 키 `lu-nyc-slots::<bld>` | baseline §3 |
| 품질 프리셋 | 기존 `decide/adapt.ts` 티어 그대로. 월드10 DPR 상한 1.25(플래그 `options.ts`) | 지시서 §7 |
| 저장 인터페이스 | `store/local-store.ts` 계약(`too-large`/`denied` 값 반환) 재사용 | 선례 |

## 단계

| 단계 | 상태 | 담당(착수 시 기재 — 비어 있으면 그 자체가 신호) | 비고 |
|---|---|---|---|
| Baseline | ✅ 8e3b9c35 | 조사원 2(Explore)·부팀장 정리 | 조사·캡처·전송량·합격 조건·팀장 판정 |
| 아트 기준 | ✅ a1ad3f3c | designer | `art-direction.md` |
| 삼각형·draw 기준 실측 | ✅ | 부팀장(스크립트 실행) | `acceptance.md` §1 |
| 반복 1 — 세계 소스·부트·캡처 진입 | ✅ 32181ad4 | 부팀장(트리 공용 계약 — 소유 범위 안) | `options.ts`·`world10-boot.ts`·`capture-entry.ts` |
| 반복 1 — 생성기·산출 GLB | ✅ 83c92fde | ⚠ 부팀장 직접(executor v0 거짓 «완료» 뒤 — 위임 트리거 위반, BOARD 자기신고) | 검수관 승인 |
| 반복 1 — 벽돌 텍스처·노말맵·`?nrm=` | ✅ 86f959f4 | ⚠ 부팀장 직접(위반 2건째 — 감독 지적 *"팀장이 직접하지 말고"*, BOARD 자기신고) | 검수관 리뷰 중 |
| 반복 1 — P1·P3 캡처 스펙 + 방 깊이·리빌 조사 + 하네스 편입(`scripts/nyc/capture.mjs`) + 재캡처 V1~V4 | 진행 중 | **executor «환경/QA»**(2026-09-06 위임) | 팀장 확정, 커밋은 부팀장 |
| 반복 1 — P2 돌출 치수(§6 문서 선행) + GLB 재생성 + 전후 캡처 | 대기 | executor «환경»(P1·P3 커밋 뒤 위임) | 팀장 조건 ③ |
| 반복 1 — 디자이너 재판정(V1~V4) | 대기 | designer | 성립 축 회귀 0 포함 |
| 반복 2 — 슬롯 레이어·업로드·저장·복원 | 대기 | executor «전시» | `frontend/js/world-glb/nyc/**` |
