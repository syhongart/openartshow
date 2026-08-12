---
name: git restore 는 미커밋 작업을 지운다
enabled: true
event: bash
action: block
pattern: git\s+restore\b
---

`git restore <path>` 는 **그 경로의 미커밋 변경을 즉시 버린다.** `git checkout -- <path>`
와 같은 일을 하는 새 이름이고, 그래서 같은 사고를 낸다.

`--staged` 를 붙인 형태도 막는다 — 워킹트리는 남지만 **staged 상태가 사라진다.**
2026-08-12 에 실제로 지워진 것이 staged 편집이었다(`hookify.checkout-revert.local.md` 의
사고 ③).

## 왜 별도 파일인가

`checkout-revert` 규칙 본문이 오래 *"`git restore --source=abc1234 a.ts` → **통과**
(`restore` 는 대상 밖)"* 라고 **사각을 정확히 적어 두고 있었다.** 적어만 두고 닫지
않았고, 그 사이 같은 계열의 사고가 두 번 더 났다. 사각을 아는 것과 막는 것은 다른 일이다.

실측(2026-08-12, executor 가 직접 실행) — 패턴 신설 **전** `git restore <path>` 는
**통과**했다. 훅 자체는 서브에이전트 Bash 에 걸린다는 것도 같은 회차에 확인했다
(`git checkout <sha> --` 와 `git push --force` 는 차단됐다).

## 되돌리고 싶으면

- 뮤테이션이면 스크립트가 **원본 문자열을 변수에 담아 두었다가 되쓴다** — `git` 을 안 쓴다.
- 대조군 비교면 **별도 worktree/클론**을 쓴다.
- 정말 버려야 하면 **먼저 커밋하거나 백업을 뜬 뒤** 이 규칙을 `enabled: false` 로 끈다.
  커밋되지 않은 것은 복구 수단이 없다.

**오탐이면** — `enabled: false` 로 이 규칙만 임시로 끄고, 왜 껐는지를 남긴다.

## 못 잡는 것

- `git stash` · `git reset --hard` · `git clean -fd` — 일부러 뺐다(복구 절차에서 쓴다).
  근거는 `hookify.checkout-revert.local.md` 의 같은 절.
- `eval`·변수 치환. Bash 이외의 경로.
