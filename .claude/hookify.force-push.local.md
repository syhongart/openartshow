---
name: 강제 푸시는 위험작업 게이트
enabled: true
event: bash
action: block
pattern: push\s+(?!.*--force-with-lease).*(--force|(^|\s)-f($|\s))
---

`--force` 단독 푸시는 §10-2 위험작업(2인 게이트)이다. 이 저장소는 롤백/강제 갱신으로
**이미 사고를 냈다** — 되돌리기가 옛 판본을 되살려 신규 구현과 보안 패치를 유실시켰다.

`--force-with-lease` 는 허용한다(남의 커밋을 덮지 않는다). 진짜 `--force` 가 필요하면
팀장 서명을 받고 그 판정을 기록한 뒤에 한다.
