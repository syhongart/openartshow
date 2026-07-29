// scripts/site-url.mjs
// 배포된 사이트의 절대 URL — **이 저장소의 SSOT**.
//
// 자체 도메인을 사면 여기 한 줄만 바꾼다. 소비처:
//   · scripts/build-devlog.mjs   sitemap·OG·JSON-LD 의 절대 URL
//   · scripts/smoke/verify-live.mjs  배포 후 라이브 URL 검증
//
// 예전에는 `build-devlog.mjs` 안에 상수로 있었고 주석이 "여기 한 곳만 바꾼다"고
// 적혀 있었다. 그 문장이 참이 되려면 다른 소비자가 그것을 import 해야 하는데,
// 생성기는 top-level 에서 파일을 쓰는 부수효과가 있어 import 할 수 없다.
// 그래서 값을 밖으로 뺐다 — 이 저장소가 세 번 데인 **값 미러링**을 만들지 않으려고.
//
// `BASE_PATH`(`/openartshow/`)는 별개다. 그것은 vite 빌드의 base 이고
// `scripts/smoke/config.mjs` 가 갖는다. 여기 값의 경로 부분과 같아 보이지만
// 바뀌는 이유가 다르다(도메인 이전 vs 배포 경로 변경).
export const BASE_URL = 'https://syhongart.github.io/openartshow';
