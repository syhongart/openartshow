# 팀 운용 인덱스 — 에이전트 · 스킬

> §10 조직 운영 규율(docs/OPERATING-PRINCIPLES.md)의 실행 파일 목록.
> 역할("누가")은 `.claude/agents/`, 반복 절차("어떻게")는 `.claude/skills/`.
> 감독(🎬 syhongart)은 사람이므로 에이전트로 두지 않는다 — 최종 A는 항상 감독.

## 역할 에이전트 (.claude/agents/)

| 파일 | 역할 | 모델 | 언제 호출 | 하지 않을 일 |
|---|---|---|---|---|
| `team-lead.md` | 🧠 팀장 Fable 5 | fable | 설계 분기·계약직 결과 판정·위험작업 서명·포스트모템 (결정 요청 1개+브리프만, §10-5) | 탐색·grep·구현 |
| `deputy-lead.md` | ⚙️ 부팀장 Opus 5 | opus | 구현·통합·배포·긴급대응·최종 결정, 팀장 부재 시 자율(§8-1) | 서명 없는 위험작업, 셀프 스모크 |
| `executor.md` | 🍃 실행 Haiku 4.5 | haiku | 체크리스트·재빌드·스모크·명단/sitemap 갱신·패턴 스캔 (§10-1 셋 다 아니오) | 판단·임의 수정 |
| `release-reviewer.md` | 🔎 검수관 | sonnet | 중요 변경 교차리뷰·릴리스 승인 (§10-4) | 직접 수정, 직접 스모크 |
| `legal-counsel.md` | ⚖️ 법무팀 | opus↑ | §6 게이트 5종 — 네이밍·라이선스·약관·결제·연동, 결정 전 필수 | 최종 채택 확정(팀장 몫, §8-5) |
| `security-officer.md` | 🛡️ 보안담당자 | opus↑ | 월간 정기 점검(§10-6)·위협모델·P2P/CSP 변경 리뷰 | 직접 패치, 위험 수용 결정 |
| `designer.md` | 🎨 디자이너 | sonnet | VFX·HUD·랜딩·UX 감사 | 브랜드 색·카피 변경 |
| `copywriter.md` | ✍️ 카피라이터 | sonnet | 네이밍 후보·랜딩/UI 문안 | 네이밍 자가 확정(법무 실사 필수) |
| `performance-analyst.md` | ⚡ 성능 전문가 | sonnet | 프레임/렌더링/로딩 측정·진단 | 수치 없는 진단, 설계 개편 |
| `researcher.md` | 🔬 리서처 | sonnet | 지원금·시장·규제 웹 실사 | 법적 해석(법무 이관), 전략 확정 |

모델 배치 근거: §10-1 (팀장 fable / 부팀장 opus / 검수관 sonnet / 실행 haiku / 계약직 기본 sonnet).
법무·보안은 치명 도메인이라 §8-5에 따라 opus 상향 — 단 실행만, **최종 판단은 팀장**.

## 반복 절차 스킬 (.claude/skills/)

| 스킬 | 언제 | 수행자 | 근거 |
|---|---|---|---|
| `smoke-check` | 배포 직전·릴리스 승인 전·롤백 후 | executor (구현자≠검증자) | §10-3, guide.html 404 사고 |
| `risk-op-gate` | force-push·삭제·이력 재작성·gh-pages 강제 직전 | 부팀장 작성 → 팀장 서명 | §10-2 |
| `cross-review` | 중요 변경 배포 전 | release-reviewer | §10-4 |
| `rollback-verify` | 모든 롤백 직후 (스모크보다 먼저) | 부팀장 + 보안 확인 | §10-3 후단, 롤백 패치 유실 사고 |
| `roster-update` | DEVLOG에 새 인원/기여 발생 시 | executor | §10-5 KPI 연동 |

## 표준 릴리스 흐름 (규율 결합)

```
구현(deputy-lead 이하)
  → [위험작업이면] risk-op-gate → team-lead 서명
  → [롤백이었으면] rollback-verify
  → cross-review (release-reviewer) ── smoke-check 재위임 → executor
  → 승인 → 배포(deputy-lead) → DEVLOG 기록
```

## 갱신 규칙
- 인원·역할 변경 시: 이 문서 + `.claude/agents/` + `scripts/build-team.mjs` ROSTER를 함께 갱신 (roster-update 스킬).
- 규율 변경 시: OPERATING-PRINCIPLES.md 버전 갱신이 먼저, 이 파일들이 그다음 (§7-2 준용).
