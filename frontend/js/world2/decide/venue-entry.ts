// world2/decide/venue-entry.ts — **전시장에 들어갈 수 있는가**를 판정한다. 순수.
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
 * 건물에 「다가왔다」고 볼 거리(m).
 *
 * 근거는 `lab-glb.js` 헤더의 실측 바운딩이다 — 월드 X[-7.8, 9.4] · Z[-17.1, 7.5],
 * 즉 대략 17×25m 이고 중심에서 가장 먼 모서리까지가 약 15m 다. 진입 지점으로 건물
 * **중심**을 쓰므로(문 노드에 의존하지 않는 이유는 `VenueEntryInput.entry` 주석) 반경이
 * 건물을 덮어야 하고, 거기에 「벽 앞에 서면 뜬다」를 위한 여유를 더해 18m 로 잡았다.
 *
 * ⚠ **이 값은 화면 판정 전이다.** 너무 크면 광장 건너에서도 뜨고, 너무 작으면 벽에
 * 붙어야 뜬다 — 둘 다 수치가 아니라 걸어 보고 갈린다. 감독 확정 후 이 자리에 판정을
 * 적는다. 되돌릴 문은 `?venuer=` 가 아니라 이 상수 하나다(노브를 열 만큼 축이 넓지 않다).
 *
 * ⚠⚠ 실측 두 줄을 여기 옮겨 적었다 — `lab-glb.js` 는 실험 페이지라 import 대상이
 * 아니고(순수 leaf 가 실험 페이지를 끌면 결합이 거꾸로 선다), 그래서 값이 아니라
 * **유도 과정**을 적어 둔다. 모델이 바뀌면 여기 근거부터 다시 읽어야 한다.
 */
export const VENUE_NEAR_RADIUS = 18;

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
    href: `${VENUE_PAGE}?u=${encodeURIComponent(tenant)}`,
    distance,
  };
}
