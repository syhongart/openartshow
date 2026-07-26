# OpenArtShow — 작업 지침 (Claude Code)

## ⚠️ 언어 — 반드시 한국어

- **사고과정(thinking/reasoning)을 한국어로 작성한다.** 감독이 사고 흐름을 한국어로 읽는다. 영어로 생각을 전개하지 말 것.
- 감독·팀 응답도 한국어로 작성한다.
- 커밋 메시지·개발일지(DEVLOG)·문서도 한국어.
- 예외: 코드·식별자·라이브러리명 등 원래 영어인 것은 그대로. (그 외 서술은 전부 한국어)

## 프로젝트 한 줄
브라우저 기반 3D 가상 미술관(three.js) — 작가가 대관료·액자·창고비 없이 자기 전시를 여는 "창(窓)".
GitHub Pages 정적 호스팅. "파라미터가 곧 공간/아바타" (무저장·기기별 렌더). 왜 만드는지는 `docs/FOUNDING.md`.

## 핵심 개발 규율
- **behind-flag**: 어디에도 링크하지 않는 페이지는 `visit.html`·`lab-glb.html`·`world2.html`이다(라이브 미노출). 플래그 제거·라이브 노출은 **감독·팀장 게이트**. — `builder.html`은 감독·팀장 게이트를 거쳐 이미 라이브다(`studio.html`이 "전시 공간 직접 꾸미기(베타)" 카드로 링크). 이 줄이 오래 `builder.html`을 behind-flag로 적고 있었고 스모크 대상에서도 빠져 있었다(회귀 게이트 구멍).
- **배포 게이트(§10)**: 구현 → **독립 executor 스모크**(구현자 아닌 별도 에이전트) → **검수관(release-reviewer) 교차리뷰** → 승인 후에만 push. main push → `deploy.yml` 자동배포 → Actions success 확인.
- **라이브 런타임 보호**: `web/js/main.js`·`player.js`·`artworks.js`·`config.js`는 함부로 수정하지 않는다(고정 미술관 서비스 중). 방문자뷰는 가산형 독립 모듈(`visit.js`).
- **자기완결**: 외부 호스트 0(CDN·폰트·이미지·GLB 금지). CSP `default-src 'self'`. three는 `/vendor/three.module.js`.
- **IP**: 특정 게임/브랜드 트레이드드레스·실존 상호·인물 금지. 파츠 에셋은 자작 지오메트리만(외부 에셋은 §6 법무).
- **커밋**: `git config user.email noreply@anthropic.com` / `user.name Claude`. push는 `-u origin <branch>` + 실패 시 지수백오프 재시도. **모델 식별자를 커밋·PR·코드·아티팩트에 넣지 않는다**(채팅 한정).
- **스크래치**: 임시 파일은 세션 스크래치패드에. 헤드리스 QA 하네스는 `/opt/pw-browsers` 크로미움 + swiftshader. **작업 종료 시 스크래치 임시 파일(스크립트·스크린샷·로그)은 즉시 정리한다**(매 턴 재주입·컨텍스트 누적 방지).

## 토큰·컨텍스트 절약 (부팀장 운영 규율)
- **혼자 파고들지 말고 위임**: 시각·인터랙션 판단(그림자·프레이밍·룩)은 **디자이너(🎨)**, 반복 정형 작업(헤드리스 QA·스크린샷 스윕·생성기 재빌드·스모크)은 **executor(🍃)** 에 맡긴다. 서브에이전트는 **결론만 텍스트로** 반환하므로 스크린샷·로그가 메인 컨텍스트에 쌓이지 않는다. 부팀장은 분해·위임·통합·게이트만.
- **스크린샷을 메인에서 직접 열지 않는다**: 이미지는 토큰이 크다. 육안 판정은 위임하고 결론만 받는다.
- **검증은 한 발에**: 헤드리스 환경 한계(swiftshader ~4fps, `preserveDrawingBuffer:false`, 비네트 오버레이)를 전제로 맞는 방법(예: 채도 분리)으로 바로 간다. 무효 검증 시행착오 금지.
- **미세 조정은 배치**: 파라미터 후보(예: 그림자 radius)는 스윕으로 한 번에 비교해 **최종값 1커밋/1PR·게이트 1회**. 조금씩 여러 PR로 쪼개 게이트를 반복하지 않는다.
- **거대 MCP 결과 회피**: `actions_list`처럼 수십만 자를 뱉는 조회는 단일 `run_id` 조회로 좁히거나 executor에 위임한다. 파싱은 Bash/python으로 컨텍스트 밖에서(`minimal_output`·`per_page` 최소화).
- **브랜치 위생 선제**: 작업 *착수 전* `git fetch origin && git merge origin/main`으로 최신 정렬부터 한다. 낡은 base로 진행하면 라이브 회귀가 섞여 교차리뷰 반려→재게이트(스모크·리뷰·병합검증 전면 재실행)로 토큰이 배로 나간다. 정렬은 착수의 첫 스텝.
- **hook 소음 억제**: `valuation` 자동 산출물 등 배포와 무관한 자동생성물은 게이트 중 워킹트리에 두지 말고 착수 시 정리(별도 커밋 or checkout)해 uncommitted/서명 경고 반복 누적을 막는다.

## 코드 아키텍처
- **SSOT는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — SOLID 원칙·강제 불변식(보호파일 import 0·순환 0·SSOT 경유)·배럴 패턴·모듈 지도·배포 파이프라인. 새 기능 착수 전 먼저 읽는다.

## 공간 빌더 스키마
- `web/js/space.ts`(소스, `.js`는 산출) = SSOT("파라미터가 곧 공간"). 버전 필드 + `normalizeSpace`/`migrateSpace`(하위호환). 저장은 localStorage/JSON만(URL 인코딩 금지).
- 렌더 조립: `web/js/space-render.js`는 얇은 **배럴**(재수출)이고, 실제 정의는 `space-parts.ts`(`partGeo`/`partAccent`/`MATS`)·`space-assembler.ts`(`buildSpaceGroup`·`addRoomLighting`)·`space-lightmap.js`(`bakeShellLightmaps(Async)`)에 있다. 소비자는 배럴 경로로 접근.
- 파츠 지오메트리 교체는 `space-parts.ts`의 `partGeo`/`partAccent`/`MATS` 3지점만 손대면 스키마·빌더 로직 무영향.
