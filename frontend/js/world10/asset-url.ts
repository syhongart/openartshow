// world10/asset-url.ts — **배포 자산의 실제 주소를 만드는 유일한 자리.**
//
// ── 왜 함수 하나를 위해 파일을 만드나 ───────────────────────────────────────
// 표기가 셋이기 때문이다:
//   계약 안        `assets/models/…` · `assets/textures/…`  (상대, 저장 형태)
//   런타임 실제    `<base>/app/assets/…`
//   저장소 안      `frontend/assets/…`
// 셋을 잇는 결합이 **여러 곳에 적히면 한쪽만 고쳐도 아무도 모른다.** `features/overlay.ts`
// 헤더가 이미 *"base 결합은 여기 한 곳이다 — 소비자가 늘 때마다 결합을 다시 적으면 값
// 미러링이 된다"* 라고 적어 두었는데, W7 에서 **소비자가 실제로 늘었다**(표면 텍스처).
// 그래서 그 문장을 참으로 유지하려고 함수를 모듈로 끌어올린다.
//
// ⚠ 상대 경로를 그대로 `img.src` 에 넣어도 **대개는 맞다**(페이지가 `/app/` 아래 있으므로).
// 그것이 이 결합을 빠뜨리기 쉬운 이유다 — 로컬에서는 되고 base 가 붙은 배포에서만 깨진다.

/**
 * 계약의 상대 `src` → 런타임에서 실제로 받아올 주소.
 *
 * `import.meta.env.BASE_URL` 은 vite 가 넣는다. 없으면 `/` 로 본다(정적 서빙·테스트).
 */
export function assetUrl(rel: string): string {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const root = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${root}/app/${rel}`;
}
