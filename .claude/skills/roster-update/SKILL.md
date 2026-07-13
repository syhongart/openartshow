---
name: roster-update
description: 인사기록 갱신 절차. 트리거 — docs/DEVLOG.md에 새 인원이 등장하거나 기존 인원의 기여 항목이 추가됐을 때. scripts/build-team.mjs의 ROSTER 갱신 + 재빌드. executor(haiku) 수행 가능.
---

# 인사기록(ROSTER) 갱신

원칙: 기여 건수는 **docs/DEVLOG.md의 실제 태그·항목에서 집계한 값만** 쓴다. 추정 금지.

## 절차

1. **집계** — DEVLOG에서 대상 인원의 신규 기여 항목을 추출 (항목 원문과 날짜 확보).
2. **ROSTER 갱신** — `scripts/build-team.mjs`의 `ROSTER` 객체만 수정:
   - 기존 인원: `works` 건수 증가 + `items` 배열에 대표 기여 추가 (items는 대표작 위주 3~5개 유지)
   - 신규 인원: `fulltime`/`contract` 분류 (§10-6: 신규 정규직은 두지 않는다 — 계약직 기본), emoji·name·role·tier·joined·note·items 작성
   - `updated` 날짜를 오늘로 갱신
3. **재빌드** — `node scripts/build-team.mjs` 실행, 종료코드 0 + `team/index.html` 갱신 확인.
4. **정합 확인** — 페이지의 누적 기여 건수·인원수가 ROSTER와 일치하는지, 신규 인원이 렌더링됐는지 grep으로 확인.
5. **보고** — 변경 요약(누구, 몇 건 → 몇 건)을 부팀장에게 반환. 커밋·배포는 부팀장이 스모크 후 진행.

## KPI 주의 (§10-5)
갱신 시 기여 비중을 확인한다 — **Fable 비중이 커지는 추세면 그 자체를 보고**한다 (§8-4: 팀장이 잔업에 붙으면 결함).
