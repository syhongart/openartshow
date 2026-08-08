---
name: 손으로 짠 대기 루프 금지
enabled: true
event: bash
action: block
pattern: until\s+.*(curl|sleep\s)
---

**감독 지시 2026-08-07**: *"시간이 오래 걸리면 문제가 있다고 인식하고 원인을 빨리 파악하고
해결 후 다시 돌려야지. 끝도없이 기다리면 안되지"*

PR CI 를 `until [ "$(curl … | python3 -c '… except: print("wait")')" = done ]` 로 기다리다
**10분을 통째로 잃었다.** CI 가 느린 게 아니라 프록시가 `api.github.com` 을 403 으로
거부해 **한 번도 못 물어본 것**인데, `except: print('wait')` 이 모든 실패를 "아직 안 됐다"
로 뭉갰다.

대기는 `node scripts/await-until.mjs` 로 한다 — probe 종료코드 0=충족 / 1=아직 /
**그 외=못 물어봤다(즉시 중단)**. 규약은 그 파일 헤더 한 곳이다.
