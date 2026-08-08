---
name: 강제 푸시는 위험작업 게이트
enabled: true
event: bash
action: block
pattern: push(?!.*--force-with-lease).*(\s--force(\s|$)|\s-[a-zA-Z]*f(\s|$))
---

`--force` 단독 푸시는 §10-2 위험작업(2인 게이트)이다. 이 저장소는 롤백/강제 갱신으로
**이미 사고를 냈다** — 되돌리기가 옛 판본을 되살려 신규 구현과 보안 패치를 유실시켰다.

`--force-with-lease` 는 허용한다(남의 커밋을 덮지 않는다). 진짜 `--force` 가 필요하면
팀장 서명을 받고 그 판정을 기록한 뒤에 한다.

**오탐이면** — `enabled: false` 로 이 규칙만 임시로 끄고, 왜 껐는지를 커밋 메시지나
게시판에 남긴다. 조용히 끄고 잊으면 다음 사람에게는 보호가 처음부터 없던 것과 같다.

> **첫 판본이 `git push -f` 를 못 막았다 (검수관 반려 B1, 2026-08-08).**
> `push\s+(?!…).*(--force|(^|\s)-f($|\s))` — 앞의 `push\s+` 가 유일한 공백을 삼켜서
> `(^|\s)-f` 의 `\s` 가 매치할 자리를 잃었다(`^` 는 `/m` 없이 문자열 시작만 본다).
> 실측: `git push -f origin main` → **exit 0(통과)**, `git push -uf …` → **exit 0**,
> 그런데 `git push origin main -f` → exit 2. **위치에 따라 달라졌다.**
> 같은 커밋의 `curl` 규칙은 묶은 플래그(`-sf`) 교훈을 이미 반영했는데 여기엔 적용하지
> 않았다 — 규칙마다 따로 생각하면 따로 틀린다. 그래서 `\s-[a-zA-Z]*f` 로 통일했다.
> 이 사각은 `tests/hookify-guard.test.ts` 의 BLOCK 케이스 4행이 지킨다.
