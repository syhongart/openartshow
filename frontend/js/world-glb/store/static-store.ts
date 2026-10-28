// world-glb/store/static-store.ts — **배포된 JSON 을 읽는다.** 지금 라이브가 쓰는 경로.
//
// ── 이것이 「서버 0」의 실체다 ─────────────────────────────────────────────
// 감독 카드: **서버 0 · 비용 0.** 그러므로 작가 문서는 **저장소에 커밋되어 정적 호스팅으로
// 배포된 파일**이다. 작가가 편집한 결과는 파일로 내보내고, 감독이 저장소에 넣으면 라이브가
// 된다(S7).
//
// ⚠ **이것은 아직 SaaS 가 아니다 — 작가 본인이 스스로 못 올린다.** 그 사실을 코드 옆에
// 적는 것이 「구조만 먼저」의 정확한 뜻이다. 서버가 붙는 날 **이 파일 옆에 하나가 더 생기고
// 호출부는 안 바뀐다.**
//
// ── 경로 규약 ──────────────────────────────────────────────────────────────
// 기존 단일 문서(`assets/world2-overlay.json`)를 **그대로 둔다** — 지금 라이브가 그것을
// 읽고 있고, 대장이 없으면 그 파일이 곧 「마을 전체」다(하위호환).
// 작가별 문서는 `assets/world2/<owner>.json`.
//
// base 결합은 `asset-url.ts` **한 곳**이다 — 소비자가 늘 때마다 결합을 다시 적으면
// 값 미러링이 된다(그 파일 헤더가 같은 규율을 적었다).

import { assetUrl } from '../asset-url.js';
import { type OverlayStore, type LoadResult, loaded, failed } from './types.js';

/** 대장. 없으면 배정 0 인 마을 — 그것 자체가 정상 상태다 */
export const LEDGER_JSON = 'assets/world2-ledger.json';

/** 대장이 없을 때 읽는 단일 문서. **기존 라이브 경로 그대로** */
export const LEGACY_OVERLAY_JSON = 'assets/world2-overlay.json';

/** 작가별 문서. `owner` 는 `decide/tenant-id.ts` 를 통과한 것만 온다 */
export function overlayPathOf(owner: string): string {
  return `assets/world2/${owner}.json`;
}

/**
 * 한 번 받아 온다. **던지지 않고 사유를 낸다.**
 *
 * 404 와 네트워크 실패를 **가른다** — 전자는 «그런 문서가 없다»(새 작가이거나 오타),
 * 후자는 «못 물어봤다». 화면이 다르게 말해야 하고, 뭉개면 오타가 장애처럼 보인다.
 */
async function fetchJson(path: string): Promise<LoadResult> {
  let res: Response;
  try {
    res = await fetch(assetUrl(path), { cache: 'no-cache' });
  } catch {
    return failed('unreachable');
  }
  if (res.status === 404) return failed('not-found');
  if (!res.ok) return failed('unreachable');
  try {
    return loaded(await res.json());
  } catch {
    // 200 인데 JSON 이 아니다 — 정적 호스팅이 404 를 index.html 로 돌려주는 흔한 형태가
    // 여기로 온다(그때 `not-found` 로 뭉개면 「배포가 깨졌다」를 「없다」로 읽게 된다).
    return failed('malformed');
  }
}

/**
 * 배포된 JSON 저장소. **읽기 전용** — `saveOverlay` 가 없다.
 *
 * 없는 것이 곧 계약이다: 화면은 `saveOverlay` 유무를 보고 «이 화면에서 저장이 되는가» 를
 * 말한다(있는 척하고 실패하는 것보다 낫다 — 「실패를 말하는 형태로」).
 */
export function createStaticStore(): OverlayStore {
  return {
    name: 'static',
    // 배포물은 **모든 방문자가 같은 것을 본다** — 여기 없으면 정말로 없다.
    authoritativeList: true,
    loadLedger: () => fetchJson(LEDGER_JSON),
    loadOverlay: (owner: string) => fetchJson(overlayPathOf(owner)),
  };
}

/**
 * 대장이 없을 때 읽는 **단일 문서** 저장소(하위호환).
 *
 * ⚠ 이것이 지금 라이브 동작이다 — 대장·작가 문서가 하나도 배포되지 않은 상태에서
 * **세계가 지금과 똑같이 떠야 한다.** 그 보장이 없으면 이 회차는 라이브 회귀다.
 */
export function loadLegacyOverlay(): Promise<LoadResult> {
  return fetchJson(LEGACY_OVERLAY_JSON);
}
