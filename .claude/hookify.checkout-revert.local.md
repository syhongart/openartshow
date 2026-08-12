---
name: 워킹트리를 옛 판본으로 되돌리지 마라
enabled: true
event: bash
action: block
pattern: (?<![-=\w])checkout\s+(?:\S+\s+)*--\s
---

`git checkout [<ref>] -- <path>` 로 되돌리면 **그 경로의 미커밋 작업이 즉시 사라진다.**
되돌린 뒤 복구하지 않으면 이후 모든 측정이 옛 코드를 잰 것이 되고, **그 사실이 보고서에
나타나지 않는다.**

대조군 비교가 필요하면 **별도 worktree/클론**을 쓴다. 뮤테이션이면 스크립트가 **원본
문자열을 변수에 담아 두었다가 되쓴다** — `git` 을 부르지 않는다.

## 실제 사고 4건 — 그중 둘은 이 규칙이 있는데도 났다

① 재게이트 스모크 중 sky 두 파일이 이전 커밋 상태로 되돌아간 채 staged 로 남았다.
② executor 가 미커밋 신규 테스트 파일을 삭제했다.
③ **2026-08-12 오전** — executor 가 `git checkout HEAD -- frontend/js/sky.js` 로 부팀장이
staged 해 둔 검수관 블로커 수정을 날렸다(자백). `git status` 의 `M` 마크를 자기 오염으로
읽고 *"저장소 파일을 수정하지 않는다"* 를 지키려 "복원" 한 것이다 — **금지된 명령으로
규칙을 지키려 했다.**
④ **같은 날 오후** — 부팀장이 뮤테이션을 되돌리려고 `git checkout -- frontend/js/sky.js`
를 써서 수정 본체를 날렸다. **③을 태스크에 적으며 "이 명령들을 이름으로 금지해야 한다"
는 처방까지 쓴 사람이 몇 시간 뒤 같은 명령을 썼다.**

**③④ 는 이 규칙이 이미 존재하는 상태에서 났다.** 패턴이 `[0-9a-f]{7,40}` 으로 **sha
형태만** 보고 있었고, `HEAD` 도 ref 생략도 그 밖이었다. 규칙이 조용했던 것은 안전해서가
아니라 **그 형태를 안 봐서**였다.

⚠ **첫 수정도 한쪽만 열었다 (검수관 블로커 B1, 2026-08-12).** `(\S+\s+)?--\s` 로 넓히고
이 자리에 *"ref 유무·형태와 무관하게 잡는다"* 라고 적었는데 **거짓이었다.** `?` 는 선행
토큰을 **최대 1개**만 허용하므로 **옵션 1개 + ref 1개**가 오면 뚫린다 — 검수관 실측:

    git checkout -f HEAD -- x        → PASSED (미탐)
    git checkout --quiet HEAD -- x   → PASSED
    git checkout -q HEAD~1 -- x      → PASSED
    git checkout --theirs HEAD -- x  → PASSED

스크립트 자동화(`-q` + ref)나 conflict 처리(`--theirs` + ref)에서 실제로 나오는 형태다.
**게이트 유효성에 대한 거짓 진술은 다음 사람이 확인을 생략하게 만든다** — `main`
unprotected 오기가 7일을 잃은 그 형태가 여기서 재발했다.

지금 패턴은 `(?<![-=\w])checkout\s+(?:\S+\s+)*--\s` 다:
- `(?:\S+\s+)*` — 선행 토큰 **0개 이상**(옵션·ref 몇 개가 오든 잡는다)
- `(?<![-=\w])` — **오탐 방지**. 이것이 없으면 `git log --grep=checkout -- CLAUDE.md` 가
  막힌다(`--grep=checkout` 뒤에 ` -- path` 가 이어져 매치한다). 실측으로 잡았고, 이
  규칙들이 과거 검수관의 리뷰 명령을 두 번 막은 전례가 있어 오탐을 특히 좁혔다.

## 이 규칙이 통과시키는 것 (오탐 방지 — 되돌리기가 아니다)

- `git checkout -b <branch>` · `git checkout <branch>` — 브랜치 생성·전환
- `git checkout --track origin/x` · `git checkout --detach` — `--` 뒤에 공백이 없다

## 실측 — 훅은 서브에이전트에도 걸린다 (2026-08-12)

이것을 몰랐다면 "막았다" 가 반쪽 진술이 됐을 것이다. executor 에게 직접 실행시켜 쟀다:

| 명령 | 결과(패턴 확장 **전**) |
|---|---|
| `git checkout db0b70c -- <path>` | **차단**(이 규칙) |
| `git push --force origin <br>` | **차단**(force-push 규칙) |
| `git checkout HEAD -- <path>` | 통과 ← ③의 형태 |
| `git checkout -- <path>` | 통과 ← ④의 형태 |
| `git restore <path>` | 통과 |

즉 **훅 자체는 직원에게도 작동하고, 빠져 있던 것은 패턴이었다.** `restore` 는
`hookify.restore-discard.local.md` 로 따로 막는다.

**오탐이면** — `enabled: false` 로 이 규칙만 임시로 끄고, 왜 껐는지를 남긴다.

## 이 규칙이 **여전히** 못 잡는 것

- **`git -C <path> restore`** — `restore` 규칙이 `git\s+restore` 로 붙어 있어 `-C` 가
  끼면 못 잡는다(이 규칙은 `checkout` 전용이라 애초에 대상 밖). 사각으로 남긴다.
- `git stash` · `git reset --hard` · `git clean -fd` — **일부러 뺐다.** 셋 다 복구 절차에서
  실제로 쓴다(2026-08-12 에 브랜치 ref 가 gh-pages 로 덮어써졌을 때 `reset --hard` 로
  복구했다). 막으면 사고 대응이 막힌다. **오늘 사고를 낸 형태가 아니다.**
- `eval`·변수 치환으로 감싼 형태. 이 장치는 적대적 우회가 아니라 **습관**을 막는다.
- Bash 이외의 경로(파일 편집 도구·MCP 툴).

사각을 모르는 채 통과를 신뢰하면 그 통과가 위험이 된다 — 규칙이 조용한 것은
"안전하다" 가 아니라 "이 형태를 안 본다" 일 수 있다.
