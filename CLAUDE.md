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
- **behind-flag**: `builder.html`·`visit.html`은 어디에도 링크하지 않는다(라이브 미노출). 플래그 제거·라이브 노출은 **감독·팀장 게이트**.
- **배포 게이트(§10)**: 구현 → **독립 executor 스모크**(구현자 아닌 별도 에이전트) → **검수관(release-reviewer) 교차리뷰** → 승인 후에만 push. main push → `deploy.yml` 자동배포 → Actions success 확인.
- **라이브 런타임 보호**: `web/js/main.js`·`player.js`·`artworks.js`·`config.js`는 함부로 수정하지 않는다(고정 미술관 서비스 중). 방문자뷰는 가산형 독립 모듈(`visit.js`).
- **자기완결**: 외부 호스트 0(CDN·폰트·이미지·GLB 금지). CSP `default-src 'self'`. three는 `/vendor/three.module.js`.
- **IP**: 특정 게임/브랜드 트레이드드레스·실존 상호·인물 금지. 파츠 에셋은 자작 지오메트리만(외부 에셋은 §6 법무).
- **커밋**: `git config user.email noreply@anthropic.com` / `user.name Claude`. push는 `-u origin <branch>` + 실패 시 지수백오프 재시도. **모델 식별자를 커밋·PR·코드·아티팩트에 넣지 않는다**(채팅 한정).
- **스크래치**: 임시 파일은 세션 스크래치패드에. 헤드리스 QA 하네스는 `/opt/pw-browsers` 크로미움 + swiftshader.

## 토큰 효율 규율 (재작업·대형응답 차단)
- **브랜치 위생 선제**: 작업 *착수 전* `git fetch origin && git merge origin/main`으로 최신 정렬부터 한다. 낡은 base로 진행하면 라이브 회귀가 섞여 교차리뷰 반려→재게이트(스모크·리뷰·병합검증 전면 재실행)로 토큰이 배로 나간다. 정렬은 착수의 첫 스텝.
- **대형 MCP 응답 차단**: 목록형 조회(`actions_list` 등)는 컨텍스트를 수십만 자로 오염시킨다. 특정 `run_id`로 좁혀 조회하고, 파싱은 Bash/python으로 컨텍스트 밖에서. 가능하면 `minimal_output`·`per_page` 최소화. 거대 결과가 파일로 떨어지면 슬라이스는 서브에이전트에 위임.
- **모델 계층 엄수**: 정형 작업(스모크·재빌드·명단/sitemap 갱신·패턴 스캔)은 executor(haiku) 전용. 상위 모델(팀장·부팀장·검수 계약직)은 판단이 필요한 일에만. 시각 검수 등 무거운 발주는 "필요한 각도·파일만" 스코프를 좁혀 발주한다.
- **hook 소음 억제**: `valuation` 자동 산출물 등 배포와 무관한 자동생성물은 게이트 중 워킹트리에 두지 말고 착수 시 정리(별도 커밋 or checkout)해 uncommitted/서명 경고 반복 누적을 막는다.

## 공간 빌더 스키마
- `web/js/space.js` = SSOT("파라미터가 곧 공간"). 버전 필드 + `normalizeSpace`/`migrateSpace`(하위호환). 저장은 localStorage/JSON만(URL 인코딩 금지).
- 렌더 조립기 `web/js/space-render.js`(빌더·방문 공용): `buildSpaceGroup`·`addRoomLighting`·`bakeShellLightmaps(Async)`·`partGeo`/`partAccent`/`MATS`.
- 파츠 지오메트리 교체는 `partGeo`/`partAccent`/`MATS` 3지점만 손대면 스키마·빌더 로직 무영향.
