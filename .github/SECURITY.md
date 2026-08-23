# 보안 — 비밀값 취급과 회전

> **왜 `.github/` 에 있나**: GitHub 이 저장소 "Security" 탭에서 **자동으로 링크하는
> 유일한 경로**다. `docs/` 에 두면 게시판 항목이 「올라온 것」으로 밀려나듯 안 읽힌다.
> 키가 새는 날 찾을 문서는 **찾기 쉬운 자리**에 있어야 한다.
>
> 신설 근거: 보안담당 점검 2026-08-13 — *"저장소에 `SECURITY.md` 가 없다. 키 회전
> 절차를 적을 자리가 없다."* 첫 secret(`GEMINI_API_KEY`) 도입과 같은 회차다.

## 이 저장소가 가진 비밀값

| 이름 | 자리 | 쓰는 곳 | 없으면 |
|---|---|---|---|
| `GEMINI_API_KEY` | GitHub repository secret | `.github/workflows/generate-image.yml` 만 | 그 워크플로가 exit 2 로 죽는다. 다른 것은 안 멈춘다 |
| `GITHUB_TOKEN` | GitHub 자동 발급 | `deploy.yml`·`valuation.yml`·`generate-image.yml` | — (플랫폼 제공) |

**서비스 자체에는 비밀값이 없다.** 무저장·자기완결 설계라 서버도 계정 DB 도 없다
(`CLAUDE.md`). 위 키는 **빌드 시점**에만 쓰이고 방문자 브라우저에는 가지 않는다.

⚠ `GEMINI_API_KEY` 는 **repository 레벨**이라 `.github/workflows/` 의 **어떤 워크플로든**
참조할 수 있다. 그리고 `ci.yml` 의 push 트리거가 `claude/**` 다 — **에이전트가 상시
push 하는 네임스페이스**다. 즉 현실적인 유출 경로는 외부 공격이 아니라 **우리가 secret 을
찍는 스텝을 실수로 넣고 push 하는 것**이다. Environment + required reviewers 로 좁히는
것이 보안담당 권고이고, **감독이 GitHub 설정에서 environment 를 만든 뒤** 워크플로에
붙인다(먼저 붙이면 GitHub 이 보호규칙 없는 environment 를 자동 생성해 *"방어가 있는 것처럼
보이는 0"* 이 된다).

## 키가 샜다고 판단되면 — 순서대로

**1. 먼저 폐기한다. GitHub Secret 교체보다 먼저다.**
[Google AI Studio](https://aistudio.google.com/apikey) 에서 해당 키를 삭제한다.
노출된 키는 **이미 복제됐다고 가정한다** — 교체만 하고 옛 키를 살려두면 그것이 계속 돈다.

**2. 새 키를 발급해 등록한다.**
저장소 → Settings → Secrets and variables → Actions → `GEMINI_API_KEY` 갱신.

**3. 노출 지점을 센다. 지울 수 있는 것과 없는 것을 구별한다.**

| 지점 | 지워지나 |
|---|---|
| Actions run 로그 | run 삭제로 지워진다 |
| PR 본문 | 편집·삭제된다 |
| **커밋 메시지** | **안 지워진다.** force-push 해도 GitHub 이 dangling commit 을 보관해 SHA URL 로 열린다 |
| 커밋된 파일 내용 | 파일을 지워도 **blob 이 히스토리에 남는다** |
| 생성 이미지 메타데이터 | 위와 같다 |

**그래서 "실수로 적었으니 지우면 된다" 가 성립하지 않는다.** 3번에서 할 수 있는 일은
지우는 것이 아니라 **1번을 했는지 확인하는 것**이다.

**4. 노출 기간의 사용량을 본다.** Google AI Studio / Cloud 콘솔에서 폐기 전까지의 요청량을
확인한다. 우리가 안 부른 호출이 있으면 그것이 피해 규모다.

## 사고를 안 내려면 — 지금 걸려 있는 장치

- 키는 **헤더**로만 보낸다(`x-goog-api-key`). URL 쿼리에 넣으면 `set -x`·에러 로그·프로세스
  목록에 남는다.
- 키는 **환경변수**로만 받는다. 명령줄 인자는 프로세스 목록에 노출된다.
- 에러 메시지는 **키 값 자체로 치환**한다(`maskSecrets`). 형식(`AIza…`)을 추측하지 않는다 —
  추측에 의존했다가 `sk-proj-…` 형태 토큰이 평문 통과한 실측이 있다.
- **GitHub 의 `***` 마스킹을 방어로 세지 않는다.** 변형되면 못 가린다(base64·URL 인코딩·
  부분 문자열). 그래서 애초에 본문을 통째로 안 찍는다.
- 검사는 `tests/generate-image.test.ts` 의 `G-KEY` 절이고, **뮤테이션으로 검출력을 확인**했다.

## 감독이 해야 하는 것 (저장소 밖이라 우리가 못 한다)

- **Google 콘솔에서 이 키에 일일 요청 상한과 예산 알림을 건다.** 저장소 쪽 장치로는
  요금 폭주를 못 막는다 — `workflow_dispatch` 전용은 *외부인*의 소진만 막는다.
- **Settings → Collaborators 에서 write 권한자를 확인한다.** `workflow_dispatch` 를 누를 수
  있는 사람이 곧 이 키를 쓸 수 있는 사람이다.

## 취약점을 발견했다면

이 저장소 이슈에 **재현 방법을 적지 말고** 먼저 저장소 소유자에게 알린다. 공개 저장소라
이슈 본문이 곧 공개다.
