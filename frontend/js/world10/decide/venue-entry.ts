// world10/decide/venue-entry.ts — **전시장에 들어갈 수 있는가**를 판정한다. 순수.
//
// ── 감독 판정 2026-08-22 ────────────────────────────────────────────────────
// *"들어가는 GLB 건물에 들어가면 저 룸이 나오는데. 꼭 같을 필요는 없잖아."*
// 카드 판정: 진입은 **씬 전환** — 밖(world2)과 안(전시장)이 물리적으로 일치하지 않아도
// 되고, 문을 지나면 안쪽 씬으로 넘어간다.
//
// ── 「주소를 바꿔 다시 여는 것」을 그대로 계승한다 ──────────────────────────
// `decide/tenant-entry.ts` 가 이미 팀장 판정으로 못 박아 뒀다: *"이동은 주소를 바꿔
// 페이지를 다시 여는 것이다. 씬을 부분 재구성하지 않는다"* — `village.setAll` 이
// `index.clear()` 로 시작하는 전체 대체이고 GLB 노드·풀·라이트맵을 일관되게 되돌리는
// 경로가 없기 때문이다. **건물 진입도 같은 처방을 쓴다.** 새 메커니즘을 만들지 않는다.
//
// ── 좌표를 여기서 상수로 갖지 않는다 ───────────────────────────────────────
// GLB 배치는 `world-shared/glb-city.ts` 가 *"주석이 아니라 런타임 `Box3` 를 읽는다"* 고
// 적어 둔 대로 실측으로 정해진다. 그래서 이 파일은 **문 위치를 인자로 받는다** — 여기에
// 좌표를 적으면 그 순간 값 미러링이고, 모델이 바뀌는 날 조용히 어긋난다.
//
// ── 왜 판정이 DOM·three 에서 떨어져 있나 ───────────────────────────────────
// `features/` 는 three 를 import 하므로 노드가 못 돌린다. 거기 판정을 두면 검사는
// 텍스트뿐이고, 텍스트 검사는 「무엇을 말하는가」를 못 본다(W8-2 에서 진단 계약 셋이
// `0 failed` 였던 그 형태).

/** 밖 세계에서 잰 것 — 집행부가 매 프레임 채워 넣는다. */
export interface VenueEntryInput {
  /** 관람객 현재 위치(월드 XZ). y 는 보지 않는다 — 층 개념이 아직 없다. */
  readonly player: { readonly x: number; readonly z: number } | null;
  /**
   * 진입 지점(월드 XZ). **문 좌표가 아니라 「건물의 어디쯤」이다** — 집행부가 GLB 의
   * 런타임 `Box3` 중심을 넘긴다. 문 노드(`door.002`)를 직접 찾지 않는 이유는 그 이름에
   * 의존하면 모델이 바뀌는 날 조용히 `null` 이 되고, 증상이 「안내가 안 뜬다」라 원인에서
   * 먼 자리에 나타나기 때문이다. 반경을 건물 크기로 잡으면 문 정확도 없이도 성립한다.
   * null = 건물이 아직 안 떴다(13.5MB 비동기 로드).
   */
  readonly entry: { readonly x: number; readonly z: number } | null;
  /** 이 거리 안이면 들어갈 수 있다(m). 집행부가 건물 Box3 크기에서 유도해 넘긴다. */
  readonly radius: number;
  /** 주소의 `?u=` 로 정해진 작가. null 이면 **들어갈 곳이 정해지지 않았다**. */
  readonly tenant: string | null;
}

/** 화면이 무엇을 보여줄지. 집행부는 이 값만 읽는다(조건문을 저쪽에 두지 않는다). */
export interface VenueEntryView {
  /** 진입 안내를 띄울 것인가 */
  readonly show: boolean;
  /** 버튼 문구. show 가 false 면 빈 문자열 */
  readonly label: string;
  /** 눌렀을 때 갈 곳(상대 경로). show 가 false 면 null */
  readonly href: string | null;
  /** 진입 지점까지 거리(m). 안내를 안 띄우는 이유를 진단할 때 쓴다. null = 잴 수 없었다 */
  readonly distance: number | null;
}

const HIDDEN: VenueEntryView = { show: false, label: '', href: null, distance: null };

/**
 * 실내 페이지 경로. `world2.html` 과 `visit.html` 은 **둘 다 `app/` 아래**에 배포되므로
 * 형제 경로다(`entrypoints.mjs` 의 `out` 이 그렇게 정한다).
 *
 * ⚠ 이 상수가 필요한 이유가 실제 사고다 — 2026-08-22 에 배포 경로를 확인하지 않고
 * `/visit.html` 로 링크를 만들어 감독이 404 를 받았다. 로컬 dev 서버는 `out` 재배치를
 * 하지 않아 그 경로로 열리고, 배포본만 다르다. 그래서 「형제 경로」라는 관계를 코드에
 * 두고 검사로 못 박는다.
 */
export const VENUE_PAGE = 'visit.html';

/**
 * **문 앞** 이 거리 안이면 들어갈 수 있다(m).
 *
 * ── 감독 판정 2026-08-23 ─────────────────────────────────────────────────
 * *"18미터 말고. 3미터로"*.
 *
 * ⚠ 그 판정을 **숫자만 바꿔서는 실현되지 않았다.** 그때 18m 는 **건물 중심**에서 재는
 * 거리였고, 건물이 17×25m 라 중심에서 벽까지가 이미 약 15m 다 — 즉 18m 는 사실상
 * 「벽에서 3m」였다. 거기서 상수만 3 으로 내리면 판정 범위가 **건물 내부**가 되어
 * 안내가 영영 안 뜬다. 감독 의도(가까이 가야 뜬다)를 살리려면 **재는 기준**을 옮겨야
 * 했고, 그래서 진입 지점을 건물 중심에서 **문 노드(`door.002`)** 로 바꿨다.
 *
 * 값이 아니라 축이 문제였던 자리다 — 이 저장소가 «값이 아니라 재는 축이 틀린다» 로
 * 적어 둔 형태이고, 이번에는 그것이 **감독 지시를 그대로 넣으면 동작하지 않는** 모습으로
 * 나타났다. 지시를 거스른 것이 아니라 지시가 뜻한 바를 성립시킨 것이다.
 */
export const VENUE_NEAR_RADIUS = 3;

/**
 * 문 노드를 못 찾았을 때 쓰는 반경(m) — 그때는 **건물 중심**에서 잰다.
 *
 * 이름(`door.002`)에 의존하는 경로라 모델이 바뀌면 조용히 사라질 수 있다. 그 경우
 * 안내가 아예 없어지는 것보다 「건물 근처면 뜬다」로 내려앉는 편이 낫다 — 근거는
 * `lab-glb.js` 실측 바운딩(X[-7.8,9.4]·Z[-17.1,7.5], 중심에서 먼 모서리까지 약 15m)에
 * 문 앞 여유 3m 을 더한 값이다. 어느 경로를 탔는지는 `diagnostics().venue` 로 갈린다.
 *
 * ⚠ 문 노드가 GLB 에 실재하는 것은 확인했다(2026-08-23, `lab-space.glb` 문자열 검사:
 * `"name":"door.002"` · `"name":"garagedoor.001"`). 추정이 아니다.
 */
export const VENUE_FALLBACK_RADIUS = 18;

/** GLB 루트에서 읽는 최소 계약 — three 를 import 하지 않고 구조로만 읽는다. */
export interface VenueRootLike {
  readonly position?: { readonly x: number; readonly z: number };
  getObjectByName?(name: string): { readonly matrixWorld?: { readonly elements?: ArrayLike<number> } } | null | undefined;
}

/** 진입 지점과 반경. 어느 경로로 얻었는지(`from`)가 진단을 가른다. */
export interface VenueAnchor {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly from: 'door' | 'center';
}

/**
 * GLB 루트 → 진입 지점.
 *
 * 문(`door.002`)을 찾으면 그 **월드 위치**를 쓴다 — `matrixWorld.elements` 의 [12]=x,
 * [14]=z 다. `Vector3`·`getWorldPosition` 을 안 쓰는 것은 소비자(`features/overlay.ts`)에
 * three import 가 없기 때문이고, 행렬 원소는 순수 숫자라 구조로 읽힌다. 행렬은 렌더
 * 루프가 매 프레임 갱신하므로 최신이다.
 *
 * ⚠ **이 파일이 소유하는 이유**는 응집이 아니라 검사다. overlay 는 three 를 import 해
 * 노드가 못 돌린다 — 거기 두면 이 유도가 영영 검사되지 않는다. 여기 있으면 순수 함수라
 * 표본을 넣어 돌릴 수 있다(그리고 실제로 `overlay.ts` 가 크기 상한에 붙어 있었다 —
 * `mountTenantEntry` 와 같은 처방이다).
 */
export function venueAnchorOf(root: VenueRootLike | null | undefined, doorRadius: number, fallbackRadius: number): VenueAnchor | null {
  if (!root || typeof root !== 'object') return null;
  const e = root.getObjectByName?.('door.002')?.matrixWorld?.elements;
  if (e && typeof e[12] === 'number' && isFinite(e[12]) && typeof e[14] === 'number' && isFinite(e[14])) {
    return { x: e[12], z: e[14], radius: doorRadius, from: 'door' };
  }
  const p = root.position;
  if (p && typeof p.x === 'number' && isFinite(p.x) && typeof p.z === 'number' && isFinite(p.z)) {
    return { x: p.x, z: p.z, radius: fallbackRadius, from: 'center' };
  }
  return null;
}

/**
 * 밖에서 잰 것 → 진입 안내가 무엇을 말할지.
 *
 * 안 띄우는 경우가 넷이고 전부 다른 이유다 — 뭉개면 «왜 안 뜨지» 를 못 가른다:
 *   · 건물이 아직 안 떴다(door === null)
 *   · 관람객 위치를 모른다(player === null)
 *   · 들어갈 곳이 정해지지 않았다(tenant === null — 주소에 `?u=` 가 없다)
 *   · 아직 멀다(distance > radius)
 */
export function venueEntryView(input: VenueEntryInput): VenueEntryView {
  const { player, entry, radius, tenant } = input;
  if (!entry || !player) return HIDDEN;
  if (!(typeof radius === 'number' && isFinite(radius) && radius > 0)) return HIDDEN;

  const dx = player.x - entry.x;
  const dz = player.z - entry.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  if (!isFinite(distance)) return HIDDEN;

  // 거리는 재졌지만 들어갈 곳이 없으면 **거리는 돌려준다** — 진단이 갈려야 한다.
  if (!tenant) return { show: false, label: '', href: null, distance };
  if (distance > radius) return { show: false, label: '', href: null, distance };

  return {
    show: true,
    label: '전시장 들어가기',
    // ⚠ **여기서 멈췄다 — 다음 사람을 위해 경계를 적어 둔다.**
    // 감독 판정 2026-08-24 «이건 설정된 오픈월드 환경으로 맞춰서 해야지» 를 받아 전시장
    // 창밖 하늘을 `sky.js` 팔레트로 갈아끼웠고, **기본값**을 오픈월드 기본(day+clear)과
    // 맞춰 두었다. 그래서 「같은 세계」는 성립한다.
    //
    // 그러나 오픈월드에서 **밤에** 문으로 들어가도 창밖은 낮이다 — 지금 시간대·날씨를
    // 이 주소에 실어 보내지 않기 때문이다. 실으려면 `visit.html` 이 이미 읽는
    // `?time=`·`?weather=` 에 값을 붙이면 되고(어휘를 일부러 world2 와 같게 뒀다),
    // 남은 일은 **그 값을 여기까지 가져오는 배선**이다: 이 함수는 순수 판정이라 입력으로
    // 받아야 하고, 부르는 쪽(`features/overlay.ts`)이 `SkySystem` 상태에 닿아야 한다.
    // overlay 는 파일 크기 상한에 붙어 있어(579/593) 그 배선이 작은 일이 아니다.
    // 안 하고 남긴 이유는 그것이 **추가 개선**이고, 감독은 지금 화면을 기다린다는 것이다.
    href: `${VENUE_PAGE}?u=${encodeURIComponent(tenant)}`,
    distance,
  };
}
