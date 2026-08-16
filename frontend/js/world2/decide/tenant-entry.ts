// world2/decide/tenant-entry.ts — **진입 화면이 무엇을 말할지**를 판정한다. 순수.
//
// ── 왜 이 파일이 따로 있나 ─────────────────────────────────────────────────
// 감독 카드(2026-08-16) 「진입은 **둘 다**」의 나머지 절반이다. `?u=` 만 있으면 **링크를
// 받은 사람만** 들어간다 — 주소를 모르는 방문자는 마을에 서서 «다른 작가는 어디 있지» 로
// 끝난다. 그 창(窓)이 `docs/FOUNDING.md` 가 적은 값어치의 절반을 못 연다.
//
// 판정을 DOM 에서 떼는 이유는 이 저장소가 세 번 데인 자리라서다 — `features/` 는 three 를
// import 하므로 **노드가 못 돌린다.** 거기 판정을 두면 검사는 텍스트뿐이고, 텍스트 검사는
// 「무엇을 말하는가」를 못 본다. W8-2 에서 진단 계약 셋이 `0 failed` 였던 것이 그 형태였고
// (등가가 아니라 **축이 비어 있었다**), `decide/overlay-diag.ts` 로 떼어 해소했다.
//
// ── 안 하는 것: 세계를 갈아끼우지 않는다 ───────────────────────────────────
// 이동은 **주소를 바꿔 페이지를 다시 여는 것**이다. 씬을 부분 재구성하지 않는다 —
// `village.setAll` 이 `index.clear()` 로 시작하는 전체 대체이고(실측
// `village-parcels.ts:169-181`), GLB 노드·풀·라이트맵까지 일관되게 되돌리는 경로는 지금
// 없다. 「되돌리기 비용 0」이 팀장 판정 (다)를 고른 근거였고 여기서도 같은 기준을 쓴다.
//
// ⚠ **소유권이 아니다.** 인증이 100% mock 이므로(`auth.js:19-21`) 이 화면이 정하는 것은
// «어느 문서를 보는가» 이지 «내가 고칠 권리가 있는가» 가 아니다.

import { tenantIdFromSearch, type TenantIdError } from './tenant-id.js';

/** 부팅이 관측한 진입 상태. `OverlayDiag` 의 세 필드 + 대장의 전원 */
export interface EntryState {
  /** `?u=` 로 지정된 작가. 없으면 `null`(마을 전체) */
  readonly tenant: string | null;
  /** 아이디 형식이 틀렸다 */
  readonly tenantError: TenantIdError | null;
  /** 형식은 맞는데 대장에 배정이 없다 */
  readonly tenantMissing: boolean;
  /** 대장에 있는 전원(처음 나온 순서) */
  readonly owners: readonly string[];
}

/** 주소 + 대장 → 누구의 문서를 읽을 것인가. `EntryState` 를 그대로 만족한다 */
export interface EntryResolution extends EntryState {
  /** 실제로 문서를 읽을 작가들. 지정이 없으면 전원 */
  readonly who: readonly string[];
}

/**
 * **좁히기 판정.** 주소에 아이디가 있으면 그 작가만, 없으면 대장의 전원.
 *
 * ⚠ 이 함수가 `features/overlay.ts` 안에 인라인으로 있던 것을 여기로 뺐다(2026-08-16).
 * 두 가지가 동시에 해소됐다: ① `features/` 는 three 를 import 해 **노드가 못 돌리므로**
 * 그 자리의 판정은 텍스트로만 볼 수 있었다 ② 그래서 테스트가 같은 식을 **손으로 베낀
 * 헬퍼**를 갖고 있었고, 그것은 이 저장소가 세 번 덴 값 미러링이다.
 *
 * **틀린 아이디로는 좁히지 않는다** — `tenantIdFromSearch` 가 실패 시 `id: null` 을 내는
 * 계약에 기대므로 저절로 전원이 된다. 다만 **사유는 남긴다**(조용히 마을로 떨어지지 않게).
 */
export function resolveEntry(search: string, all: readonly string[]): EntryResolution {
  const wanted = tenantIdFromSearch(search);
  const focus = wanted?.id ?? null;
  const who = focus === null ? all.slice() : all.filter((o) => o === focus);
  return {
    tenant: focus,
    tenantError: wanted?.error ?? null,
    // 형식은 맞는데 대장에 배정이 없다 — 오타(`charset`)와 **다른 사유**다.
    tenantMissing: focus !== null && who.length === 0,
    owners: all,
    who,
  };
}

export interface EntryView {
  /**
   * 화면에 띄울까.
   *
   * ⚠ **아무 작가도 없고 사유도 없으면 안 띄운다.** 지금 라이브가 정확히 그 상태다
   * (대장 0명·`?u=` 없음) — 거기서 빈 입력 칸이 뜨면 «여기에 뭘 치라는 거지» 가 되고,
   * 그것은 하위호환(화면 변화 0)도 깬다.
   */
  readonly visible: boolean;
  /** 지금 무엇을 보고 있는가 */
  readonly title: string;
  /** 왜 그렇게 됐는가. 없으면 `''` — **뭉개지 않는다**(세 갈래 구별) */
  readonly notice: string;
  /** 골라 갈 수 있는 작가들 */
  readonly options: readonly string[];
  /** 「마을 전체로」를 보일까 — 이미 전체면 보일 이유가 없다 */
  readonly canReset: boolean;
}

/** 형식 오류 다섯 갈래를 **각각** 말한다. 하나로 뭉개면 사용자가 엉뚱한 것을 고친다 */
const ERROR_NOTICE: Record<TenantIdError, string> = {
  empty: '주소의 작가 아이디가 비어 있어 마을 전체를 보여 드립니다.',
  charset: '주소의 작가 아이디에 쓸 수 없는 문자가 있습니다 — 영소문자·숫자·하이픈만 됩니다.',
  'too-short': '주소의 작가 아이디가 너무 짧습니다.',
  'too-long': '주소의 작가 아이디가 너무 깁니다.',
  reserved: '운영자·공식 계정과 혼동될 수 있는 아이디입니다.',
};

/**
 * 진입 상태 → 화면이 말할 것.
 *
 * **어느 갈래에서도 마을은 뜬다** — `backend/README.md` 규약 *"서버가 죽어도 전시를 보는
 * 것만은 되어야 한다"* 의 이 축에서의 형태다. 이 판정이 정하는 것은 **문구**뿐이고,
 * 좁히기 자체는 이미 `features/overlay.ts` 가 끝냈다.
 */
export function planEntry(state: EntryState): EntryView {
  const { tenant, tenantError, tenantMissing, owners } = state;

  // 사유를 **한 갈래만** 고른다. 형식 오류가 있으면 `tenant` 는 애초에 null 이므로
  // 「없는 작가」와 동시에 성립하지 않는다(`tenant-id.ts` 의 `fail()` 계약).
  let notice = '';
  if (tenantError) notice = ERROR_NOTICE[tenantError];
  else if (tenantMissing) notice = `「${tenant}」 작가의 땅을 아직 찾을 수 없습니다. 마을을 둘러보세요.`;

  const title = tenant !== null && !tenantMissing
    ? `${tenant} 님의 땅`
    : '마을 전체';

  return {
    // 사유가 있으면 **반드시** 띄운다 — 조용히 마을로 떨어지는 것이 `.GLB` 대문자 사고다.
    visible: notice !== '' || owners.length > 0,
    title,
    notice,
    // 지금 보고 있는 작가는 목록에서 뺀다 — 제자리로 가는 버튼은 동작이 아니다.
    options: owners.filter((o) => o !== tenant),
    canReset: tenant !== null,
  };
}

/**
 * 이동할 주소의 질의 문자열을 만든다. **다른 노브를 보존한다.**
 *
 * ⚠ 이것이 이 파일에서 가장 틀리기 쉬운 자리다 — `?u=` 만 새로 쓰고 끝내면 편집 중에
 * 작가를 바꾼 감독이 `?edit=1` 을 잃고 **주행 모드로 튕긴다.** 같은 이유로 `?time=`·
 * 슬라이더 노브(`?wns=`…)도 전부 살려야 한다. 그래서 기존 질의를 **읽어서 갈아끼운다**.
 *
 * @param search 지금 주소의 질의 문자열(`location.search`)
 * @param id 갈 작가. `null` 이면 마을 전체(= `u` 를 뺀다)
 * @returns `?` 로 시작하는 질의 문자열. 남는 값이 없으면 `''`
 */
export function entrySearch(search: string, id: string | null): string {
  let params: URLSearchParams;
  try { params = new URLSearchParams(search); } catch { params = new URLSearchParams(); }
  if (id === null) params.delete('u');
  else params.set('u', id);
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
}
