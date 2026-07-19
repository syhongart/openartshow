---
name: smoke-check
description: 배포 전 스모크 검증(§10-3). 트리거 — main 푸시/배포 직전, 릴리스 승인 전, 롤백 직후. 반드시 구현자가 아닌 별도 executor(haiku) 에이전트가 실행한다. 체크리스트 6항 고정 — 임의 추가/생략 금지.
---

# 배포 전 스모크 (구현자 ≠ 검증자)

전제: 이 절차는 변경을 만든 세션이 아닌 **별도 executor 에이전트**가 실행한다.
근거 사고: guide.html 루트 누락 라이브 404.

## 체크리스트 (6항 고정, 각 항목 PASS/FAIL + 증거 1줄)

1. **생성기 통과** — 저장소 루트에서 실행, 종료코드 0 확인:
   ```
   node scripts/build-devlog.mjs && node scripts/build-team.mjs && node scripts/build-valuation.mjs
   ```
2. **배포 매니페스트 파일수 diff** — deploy.yml의 `_site` 조립 레시피를 로컬 재현:
   ```
   rm -rf /tmp/_site && mkdir -p /tmp/_site/app
   cp web/landing.html /tmp/_site/index.html && cp web/guide.html /tmp/_site/guide.html
   cp -r web/. /tmp/_site/app/ && cp -r devlog team valuation /tmp/_site/
   cp sitemap.xml robots.txt /tmp/_site/
   find /tmp/_site -type f | wc -l
   ```
   직전 배포 대비 파일수 증감을 보고 — **예상 못한 감소는 즉시 FAIL** (파일 누락 신호).
3. **핵심 링크 200** — 조립 결과에 필수 파일 존재: `index.html`, `guide.html`, `app/index.html`, `devlog/index.html`, `team/index.html`, `valuation/index.html`, `sitemap.xml`. 배포 후에는 라이브 URL(`https://syhongart.github.io/openartshow/` + 위 경로) curl로 200 확인.
4. **콘솔 에러 0** — 헤드리스 브라우저 가용 시 index.html·app/ 로드 후 console error 0 확인. 불가 시 "도구 부재로 정적 검사 대체" 명기하고 스크립트 문법 검사(`node --check` 가능한 파일)로 대체.
5. **가로넘침 0** — 헤드리스 가용 시 **375px와 320px 두 뷰포트**에서 `document.documentElement.scrollWidth <= innerWidth` 확인. 320px(iPhone SE 1세대급 초소형)를 반드시 포함 — 모달·버튼 wrap이 좁은 폭에서 넘치는 케이스를 잡기 위함(2026-07-19 꾸미기 모달 반응형 회귀 교훈). 불가 시 변경된 CSS/HTML에서 고정폭(px) 신규 도입 여부 grep으로 대체 검사.
6. **CSP 부팅** — web/index.html의 CSP 메타 존재 + `script-src` 해시·`object-src 'none'`·`base-uri 'none'` 잔존 확인 (보안패치 유실 사고 재발 방지):
   ```
   grep -c "Content-Security-Policy" web/index.html
   ```

## 판정
- 6항 전부 PASS → `스모크: 통과 6/6` 보고 → release-reviewer/부팀장에게 전달
- 1개라도 FAIL → 배포 중단, 실패 증거를 부팀장에게 보고 (수정은 검증자가 하지 않는다)
- 롤백 직후라면 이 스킬 전에 rollback-verify를 먼저 완료해야 한다
