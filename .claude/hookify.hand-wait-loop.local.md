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

대기는 `node scripts/await-until.mjs` 로 한다. **probe 종료코드 규약과 쓰는 법은 그 파일
헤더 한 곳이다** — 여기에 다시 적지 않는다(적으면 한쪽만 고쳐도 아무도 모른다).
헤더의 예시를 그대로 쓰되, **조회 실패와 「아직 아님」을 probe 안에서 반드시 갈라라.**

**이 규칙이 못 잡는 것** (실측 근거 있음 — 태스크 #219)
- `while ! curl -sf x; do sleep 5; done` → **통과**. `until` 만 본다.
- `for i in $(seq 60); do …; sleep 10; done` → **통과**.
- 이 규칙이 `until` 을 막아 사람을 `await-until.mjs` 로 몬다는 점에서, **그 파일의 예시가
  틀리면 피해가 여기서 증폭된다.** 실제로 첫 판본 예시가 조회 실패를 「충족」으로 읽었다
  (검수관 반려 B5) — 그래서 `tests/await-until.test.ts` 가 헤더 예시를 파싱해 직접 돌린다.
