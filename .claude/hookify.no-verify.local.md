---
name: 게이트 우회 금지
enabled: true
event: bash
action: block
pattern: (--no-verify|-n\s+.*commit|commit\s+.*\s-n\b)
---

`git commit --no-verify` 는 pre-commit 훅을 건너뛴다. 그 훅이 하는 일은 **`npm run gate`
스탬프 대조**이고, 그것이 이 저장소에서 "게이트를 손으로 조립하다 매번 다르게 틀리는" 것을
없앤 유일한 구조다(CLAUDE.md).

게이트가 실패하면 우회하지 말고 **실패한 이유를 고쳐라.** 통과 못 한 것을 통과로 만드는
것이 이 저장소가 반복해서 당한 사고 형태다.
