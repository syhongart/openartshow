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

## 공간 빌더 스키마
- `web/js/space.js` = SSOT("파라미터가 곧 공간"). 버전 필드 + `normalizeSpace`/`migrateSpace`(하위호환). 저장은 localStorage/JSON만(URL 인코딩 금지).
- 렌더 조립기 `web/js/space-render.js`(빌더·방문 공용): `buildSpaceGroup`·`addRoomLighting`·`bakeShellLightmaps(Async)`·`partGeo`/`partAccent`/`MATS`.
- 파츠 지오메트리 교체는 `partGeo`/`partAccent`/`MATS` 3지점만 손대면 스키마·빌더 로직 무영향.
