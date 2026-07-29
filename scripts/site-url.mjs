// scripts/site-url.mjs
// 배포 주소의 구성요소 — **이 저장소의 SSOT**.
//
// ── 왜 origin 과 path 를 함께 두는가 (검수관 B3) ─────────────────────────────
// 첫 판본은 `BASE_URL` 만 두고 "`BASE_PATH`(`/openartshow/`)는 별개다. 바뀌는 이유가
// 다르다(도메인 이전 vs 배포 경로 변경)"고 적었다. **그 근거가 틀렸다.**
//
//   시나리오            BASE_URL   BASE_PATH   vite base
//   자체 도메인 구매      변경      `/` 로 변경   `/` 로 변경
//   저장소 이름 변경      변경        변경         변경
//   GitHub 계정 이전      변경        불변         불변
//
// 셋 중 둘이 lockstep 이고, 그중 하나는 첫 판본 주석이 직접 이름을 댄 시나리오다.
// `/openartshow` 라는 경로 세그먼트가 세 파일에 각각 적히면 그것이 값 미러링이다 —
// 값 미러링을 없애려고 만든 파일이 값 미러링을 늘릴 뻔했다.
//
// 그래서 여기서 origin 과 path 를 **함께** 정의하고 `BASE_URL` 을 유도한다.
// 도메인·경로가 바뀌면 이 파일 하나만 본다.
//
// 소비처:
//   · scripts/build-devlog.mjs       sitemap·OG·JSON-LD 절대 URL
//   · scripts/smoke/verify-live.mjs  배포 후 라이브 URL 검증
//   · scripts/smoke/config.mjs       BASE_PATH 재수출(스모크 서브패스 마운트)
//   · vite.config.js                 빌드 base

// 스킴+호스트. 계정·도메인이 바뀌면 여기.
export const BASE_ORIGIN = 'https://syhongart.github.io';

// 서브패스. 저장소 이름이 곧 경로다(GitHub Pages 프로젝트 사이트).
// 자체 도메인으로 옮기면 `/` 가 된다 — 그때 아래 셋이 함께 따라온다.
export const BASE_PATH = '/openartshow/';

// 절대 URL(뒤 슬래시 없음) — 링크를 이어붙이기 좋은 형태.
export const BASE_URL = `${BASE_ORIGIN}${BASE_PATH.replace(/\/$/, '')}`;
