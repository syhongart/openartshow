---
name: 조건 판정용 curl 에 --fail 을 붙여라
enabled: true
event: bash
action: warn
pattern: curl\s+(?!.*(--fail|-[a-zA-Z]*f))[^|]*\|\s*(python3|jq|grep)
---

`curl` 은 HTTP 403·404 에도 **exit 0** 을 낸다. 그 출력을 파이프로 판정에 쓰면 "못 물어본
것" 과 "물어봤는데 아니다" 가 구별되지 않는다 — 대기 루프에서 10분을 잃은 그 구멍이다.

실측(2026-08-07, 이 환경): `curl → api.github.com` = **403**, `curl → syhongart.github.io`
= **403**, `git ls-remote` = 통과. GitHub 상태 조회는 MCP 툴로만 가능하다.

**첫 판본은 오탐이 있었다** — `-f\b` 로만 봐서 `-sf` 처럼 **묶어 쓴 플래그**를 못 알아보고
`--fail` 이 있는데도 경고했다. 규칙을 넣고 **실제로 돌려보지 않았으면** 그 오탐이 계속
울렸을 것이고, 늑대소년이 된 경고는 곧 무시된다. 규칙도 검출력을 재야 한다.

⚠ 그런데 **그 검출력조차 한동안 0이었다**(검수관 반려 B4, 2026-08-08). `action: warn` 은
종료코드를 안 바꾸는데 테스트가 종료코드만 봐서, **이 파일을 통째로 지워도** 게이트가
초록이었다. 지금은 `tests/hookify-guard.test.ts` 가 stderr 접두(`주의`)와 발화한 규칙
파일명까지 본다 — 파일이 사라지면 깨진다.

**이 규칙이 못 잡는 것** (실측 근거 있음 — 태스크 #219)
- `curl -s https://x/some-file | jq .state` → **경고 없음**. URL 안의 `-f`(`some-file`)를
  `--fail` 로 오인한다. 즉 URL 에 `-…f` 가 들어간 경우 이 규칙은 조용하다.
- `| node`·`| sed`·`| awk` 는 대상 목록 밖이다(현재 `python3|jq|grep` 만 본다).
- `curl -o file && jq … file` 처럼 파이프를 안 쓰고 파일을 거치는 형태.
