---
name: 워킹트리를 옛 판본으로 되돌리지 마라
enabled: true
event: bash
action: block
pattern: checkout\s+[0-9a-f]{7,40}\s+--\s
---

`git checkout <commit> -- <path>` 로 되돌린 뒤 복구하지 않으면 **이후 모든 측정이 옛
코드를 잰 것**이 되고, 그 사실이 보고서에 나타나지 않는다.

실제 사고 2건: ① 재게이트 스모크 중 sky 두 파일이 이전 커밋 상태로 되돌아간 채 staged 로
남았다 ② executor 가 미커밋 신규 테스트 파일을 삭제했다.

대조군 비교가 필요하면 **별도 worktree/클론**을 쓴다.

**오탐이면** — `enabled: false` 로 이 규칙만 임시로 끄고, 왜 껐는지를 남긴다.

**이 규칙이 못 잡는 것** (실측 근거 있음 — 태스크 #219). 지금은 **sha 형태만** 본다:
- `git checkout HEAD~1 -- a.ts` → **통과**
- `git checkout origin/main -- a.ts` → **통과**
- `git restore --source=abc1234 a.ts` → **통과** (`restore` 는 대상 밖)

사각을 모르는 채 통과를 신뢰하면 그 통과가 위험이 된다 — 규칙이 조용한 것은
"안전하다" 가 아니라 "이 형태를 안 본다" 일 수 있다.
