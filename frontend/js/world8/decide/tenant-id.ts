// world8/decide/tenant-id.ts — **작가 아이디.** 주소에 들어가는 식별자를 판정한다.
//
// ── 감독 요구 (2026-08-16) ─────────────────────────────────────────────────
// *"사용자가 **아이디로 입력해서** 자기 땅. 자기 건물이 있고…"*
// 카드 판정: 진입은 **둘 다** — 주소(`?u=arthong`)에 있으면 그것, 없으면 입력 창.
//
// ── 왜 별명(`mypage/nickname.ts`)과 다른 파일인가 ──────────────────────────
// 별명은 **표시되는 문구**이고 아이디는 **주소에 들어가는 식별자**다. 판정 기준이 다르다:
// 별명은 한글을 받지만 아이디는 안 받는다(URL 인코딩되면 `%EC%95%84…` 가 되어 «주소가
// 곧 이름» 이라는 값어치가 사라진다). 대소문자도 아이디에서는 접는다.
//
// **다만 사칭 방지는 같아야 한다** — `admin` 이 별명에서 막히고 아이디에서 통과하면
// 막은 의미가 없다. 그래서 예약어는 `../../reserved-names.js`(의존 0 leaf)를 **공유**한다.
//
// ── `isSafeSrc` 를 넓히지 않는다 ───────────────────────────────────────────
// `decide/overlay.ts` 의 `isSafeSrc` 는 **자산 경로**를 보는 함수다. 아이디를 거기에
// 끼워 넣으면 한 함수가 두 계약을 지게 되고, 한쪽 요구로 넓히는 순간 다른 쪽 방어가
// 조용히 약해진다. 별도 파일이 그 결합을 막는다.
//
// ── 셋으로 가른다 — 하나로 뭉개지 않는다 ───────────────────────────────────
// 「형식이 틀림」·「예약어」·「비었음」은 사용자가 할 일이 서로 다르다. 하나로 뭉개면
// `.GLB` 대문자 사고(`decide/overlay.ts:172-174` — 확장자 대소문자를 «안전하지 않음» 으로
// 뭉개 원인이 화면에 안 뜬 것)가 재발한다.
//
// ⚠ **소유권이 아니다.** 인증이 100% mock 이므로(`auth.js:19-21`) 이 아이디는 «어느
// 문서를 보는가» 이지 «내가 고칠 권리가 있는가» 가 아니다.

import { isReservedName } from '../../shared/reserved-names.js';

/**
 * 아이디 문자셋 — **영소문자·숫자·하이픈**. `studio.html` 의 전시 ID 규약(`ID_RE`,
 * `studio-form.ts:47`)과 **같은 모양**으로 맞췄다: 사용자가 이미 그 규칙으로 전시 주소를
 * 만들고 있으므로 여기서 다른 규칙을 쓰면 «왜 여긴 안 되지» 가 된다.
 *
 * ⚠ 밑줄(`_`)은 뺐다 — 하이픈과 밑줄을 둘 다 받으면 `art-hong` 과 `art_hong` 이 다른
 * 사람이 되고, 그것은 사칭 통로다.
 */
const ID_RE = /^[a-z0-9-]+$/;

/** 하이픈으로 시작·끝나거나 연달아 오는 것 — 주소에서 읽기 어렵고 오타를 부른다 */
const BAD_HYPHEN_RE = /^-|-$|--/;

/** 최소·최대 길이. 1자는 오타와 구별이 안 되고, 너무 길면 주소가 안 읽힌다 */
export const TENANT_ID_MIN = 2;
export const TENANT_ID_MAX = 32;

export type TenantIdError =
  /** 아무것도 안 적혔다 */
  | 'empty'
  /** 문자셋·하이픈 규칙 위반 */
  | 'charset'
  /** 너무 짧다 */
  | 'too-short'
  /** 너무 길다 */
  | 'too-long'
  /** 운영자·공식 계정 사칭 */
  | 'reserved';

export interface TenantIdResult {
  /** 정규화된 아이디. 실패하면 `null` */
  id: string | null;
  /** 왜 거부됐나. 성공하면 `null` */
  error: TenantIdError | null;
  /** 화면에 그대로 쓸 수 있는 한 줄. **소비자가 문구를 지어내지 않게** 여기서 준다 */
  message: string;
}

function fail(error: TenantIdError, message: string): TenantIdResult {
  return { id: null, error, message };
}

/**
 * 날것을 아이디로 정규화한다. **던지지 않는다.**
 *
 * 대소문자는 **접는다**(`ArtHong` → `arthong`) — 주소는 대소문자를 구별하는 곳과 안 하는
 * 곳이 섞여 있어, 구별하면 «같은 링크인데 다른 사람» 이 성립한다.
 */
export function normalizeTenantId(raw: unknown): TenantIdResult {
  if (typeof raw !== 'string') {
    return fail('empty', '아이디를 입력해 주세요.');
  }
  const v = raw.trim().toLowerCase();
  if (v === '') return fail('empty', '아이디를 입력해 주세요.');

  // **문자셋을 길이보다 먼저 본다.** `한글이름` 처럼 길이는 맞는데 문자가 틀린 경우가
  // 훨씬 흔하고, 그때 «너무 짧다» 를 내면 사용자가 엉뚱한 것을 고친다.
  if (!ID_RE.test(v) || BAD_HYPHEN_RE.test(v)) {
    return fail('charset', '영소문자·숫자·하이픈만 쓸 수 있어요. 하이픈으로 시작·끝나거나 연달아 쓸 수 없습니다.');
  }
  // 코드포인트로 센다 — 여기서는 ASCII 만 통과했으므로 `length` 와 같지만, 규약을
  // 문자셋 규칙에 의존시키지 않는다(문자셋이 넓어지면 조용히 틀려진다).
  const len = Array.from(v).length;
  if (len < TENANT_ID_MIN) return fail('too-short', `${TENANT_ID_MIN}자 이상이어야 해요.`);
  if (len > TENANT_ID_MAX) return fail('too-long', `${TENANT_ID_MAX}자 이하여야 해요.`);

  // 사칭 방지는 별명과 **같은 목록**을 본다 — 한쪽에서 막힌 이름이 다른 쪽에서 통과하면
  // 막은 의미가 없다.
  if (isReservedName(v)) {
    return fail('reserved', '운영자·공식 계정과 혼동될 수 있는 아이디입니다.');
  }

  return { id: v, error: null, message: '' };
}

/**
 * 주소에서 아이디를 읽는다. **없는 것과 틀린 것을 가른다** — 없으면 `null` 을 내고
 * (마을 기본 화면), 틀렸으면 사유를 낸다.
 *
 * @param search `location.search` 같은 질의 문자열. 주입받으므로 테스트가 실제로 돌린다
 */
export function tenantIdFromSearch(search: string): TenantIdResult | null {
  let raw: string | null = null;
  try {
    raw = new URLSearchParams(search).get('u');
  } catch { return null; }        // 해석 불가 = 지정 안 됨과 같게 본다
  if (raw === null || raw.trim() === '') return null;
  return normalizeTenantId(raw);
}
