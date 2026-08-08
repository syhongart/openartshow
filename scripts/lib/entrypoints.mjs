// 배포되는 HTML 진입점과 **그 노출 상태** — 한 곳.
//
// ── 왜 생겼나 (태스크 #195, 팀장 조건 2·6) ──────────────────────────────────
// 검증 등급을 "라이브 진입점에서 도달 가능한가" 로 기계 판정하려면 **라이브 진입점이
// 무엇인지가 코드에 있어야 한다.** 조사해 보니 없었다 — behind-flag 라는 사실이 주석
// 다섯 곳에 흩어진 산문이었다:
//
//   CLAUDE.md            "어디에도 링크하지 않는 페이지는 …이다" (산문)
//   vite.config.js       `HTML_RENAME` 값 옆 줄 주석 `// behind-flag`
//   vite.config.js       `input` 항목 옆 `// [실험] … 어디에도 링크하지 않는다`
//   scripts/smoke/config.mjs  `LIVE_PAGES` 위 주석
//   docs/ARCHITECTURE.md 모듈 지도 표
//
// 다섯 곳 중 **어느 것도 기계가 읽을 수 없고**, 정합을 검사하는 축도 없었다. 실제로
// `vite.config.js` 의 `builder.html` 주석은 오랫동안 `// behind-flag` 였는데 그 사이
// builder 는 라이브가 돼 있었다(같은 파일 다른 줄이 그 사고를 이미 기록해 뒀다).
//
// ── `LIVE_PAGES` 를 쓰면 안 된다 ────────────────────────────────────────────
// `scripts/smoke/config.mjs` 의 `LIVE_PAGES` 는 이름과 달리 **"라이브 노출 목록" 이
// 아니라 "검증 대상 목록"** 이다 — behind-flag 인 world2 가 거기 들어 있다(그 파일이
// *"링크 노출 여부와 검증 여부는 별개다"* 라고 적어 뒀다). 등급 판정이 그것을 노출
// 판정에 쓰면 **틀린 축을 재게 된다.**
//
// ── 이 파일이 SSOT 다 ───────────────────────────────────────────────────────
// `vite.config.js` 가 여기서 `input` 과 `HTML_RENAME` 을 **유도**한다. 목록을 저쪽에도
// 적으면 그 순간 값 미러링이고, 위에 적은 사고가 그대로 재현된다.

/**
 * 배포되는 HTML 진입점.
 *
 * @property key  vite `rollupOptions.input` 키. 번들 파일명에 쓰이므로 바꾸면 산출물
 *                경로가 바뀐다.
 * @property src  `frontend/` 기준 소스 경로.
 * @property out  배포 구조에서의 경로. `src` 와 같으면 재배치 없음.
 * @property exposure
 *   `live`    — 사이트 어딘가에서 링크된다. 방문자가 도달한다.
 *   `flagged` — **어디에도 링크하지 않는다**(behind-flag). 단 **배포는 되고 URL 직접
 *               접근이 가능하다** — 그래서 자기완결·CSP 는 여기에도 걸린다(팀장 조건 3).
 *               라이브 노출은 감독·팀장 게이트다(`CLAUDE.md`).
 */
export const ENTRYPOINTS = [
  // ── 랜딩군(루트 배포) ────────────────────────────────────────────────────
  { key: 'landing', src: 'landing.html', out: 'index.html', exposure: 'live' },
  { key: 'guide', src: 'guide.html', out: 'guide.html', exposure: 'live' },
  { key: 'about', src: 'about.html', out: 'about.html', exposure: 'live' },
  // design 은 배포되지만 `LIVE_PAGES` 에는 없다 — 어느 스모크도 크롤링하지 않는다
  // (검수관 권고 5, 태스크 #169). **노출 상태와 검증 대상은 다른 축**이므로 여기서는
  // 노출만 적는다: 링크되어 있으므로 `live` 다. 검증 편입은 그 태스크 소관.
  { key: 'design', src: 'design.html', out: 'design.html', exposure: 'live' },

  // ── 앱군(app/ 배포) ──────────────────────────────────────────────────────
  { key: 'index', src: 'index.html', out: 'app/index.html', exposure: 'live' },
  { key: 'studio', src: 'studio.html', out: 'app/studio.html', exposure: 'live' },
  { key: 'world', src: 'world.html', out: 'app/world.html', exposure: 'live' },
  // 라이브다 — `studio.html` 이 "전시 공간 직접 꾸미기(베타)" 카드로 링크한다.
  { key: 'builder', src: 'builder.html', out: 'app/builder.html', exposure: 'live' },

  // ── behind-flag ─────────────────────────────────────────────────────────
  { key: 'visit', src: 'visit.html', out: 'app/visit.html', exposure: 'flagged' },
  // [실험] GLB 공간 워크스루 — 반입 판정 전이므로 존재가 채택을 뜻하지 않는다.
  { key: 'lab-glb', src: 'lab-glb.html', out: 'app/lab-glb.html', exposure: 'flagged' },
  // [실험] 오픈월드 커널 재작성 — 빌드에 넣는 것은 실증(타입·번들 회귀 감지)을 위해서다.
  { key: 'world2', src: 'world2.html', out: 'app/world2.html', exposure: 'flagged' },
  // 마이페이지(프로필 편집 + 공개 프로필 미리보기). 감독 지시 2026-08-08 로 착수했고,
  // 라이브 노출은 감독·팀장 게이트다. 지금 링크가 0 인 이유는 미완이어서가 아니라
  // **로그인이 아직 mock 이기 때문**이다 — 사용자 신원이 자칭 문자열인 동안에는 별명
  // 소유권이 성립하지 않아 "내 프로필" 이라는 말이 절반만 참이다(docs/MYPAGE-PLAN.md §3).
  { key: 'mypage', src: 'mypage.html', out: 'app/mypage.html', exposure: 'flagged' },
];

/** 링크되어 방문자가 도달하는 진입점 */
export const LIVE_ENTRIES = ENTRYPOINTS.filter((e) => e.exposure === 'live');

/** 어디에도 링크하지 않는 진입점. 배포는 되므로 URL 직접 접근은 가능하다 */
export const FLAGGED_ENTRIES = ENTRYPOINTS.filter((e) => e.exposure === 'flagged');

/**
 * 소스 루트. `src` 는 **여기 기준 상대경로**다.
 *
 * ⚠ 처음에는 이 상수를 두지 않고 *"이 파일은 경로 규약(`frontend/` 접두사)을 모르는 편이
 * 낫다 — 호출자가 준다"* 고 적었다. **그 판단이 틀렸다는 것이 배포 전 스모크에서 실증됐다**
 * (2026-08-05): `vite.config.js` 가 `viteInput(r)` 로 받으면서 접두사가 사라져
 * `Could not resolve entry module "landing.html"` 로 빌드가 죽었다. 규약을 소비자에게
 * 맡기면 **소비자 수만큼 틀릴 자리가 생긴다** — 실제로 판정기(`verification-tier.mjs`)는
 * `join(FRONTEND, e.src)` 로 제대로 붙이고 있었고 vite 쪽만 틀렸다. 두 소비자가 같은
 * 규약을 각자 적고 있었으니 그것이 곧 값 미러링이었다.
 */
export const SRC_ROOT = 'frontend';

/** 저장소 루트 기준 소스 경로. **접두사를 소비자가 붙이지 않는다** (위 주석 참조) */
export function srcPath(entry) {
  return `${SRC_ROOT}/${entry.src}`;
}

/**
 * vite 의 `rollupOptions.input` 형태로. `resolve` 는 호출자가 준다 —
 * **저장소 루트 기준** 경로를 절대경로로 바꾸는 함수여야 한다.
 */
export function viteInput(resolve) {
  return Object.fromEntries(ENTRYPOINTS.map((e) => [e.key, resolve(srcPath(e))]));
}

/**
 * emit 파일명 → 배포 경로. **재배치가 필요한 것만** 담는다(vite 가 맵에 없는 것은
 * 그대로 두므로, 항등 매핑을 넣으면 그것이 곧 노이즈다).
 */
export function htmlRename() {
  return Object.fromEntries(
    ENTRYPOINTS.filter((e) => e.src !== e.out).map((e) => [e.src, e.out]),
  );
}
