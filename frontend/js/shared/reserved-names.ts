// shared/reserved-names.ts — **사칭 방지 예약어**와 그 판정. **의존 0 인 leaf 다.**
//
// ── `js/shared/` 는 이 파일과 함께 생겼다 (2026-08-16) ─────────────────────
// **`world-shared/` 와 다르다.** 그쪽은 *"세계 3종(world2·3·5)이 공유하는 것"* 이고,
// 여기는 *"라이브·세계를 가리지 않는 의존 0 leaf"* 다 — 이 파일은 마이페이지(라이브)와
// world2 가 **함께** 쓴다. `world-shared/` 에 두면 이름이 거짓이 되고, R4(라이브는
// 공유 세계 모듈을 안 쓴다)가 지키려는 경계도 흐려진다.
//
// 처음에 `js/` 루트에 두었더니 `tests/world2-boundary.test.ts` 의 경계 게이트가
// **빨간불이 됐다**(world2 밖 참조는 어댑터이거나 공용 접두여야 한다). 규칙을 고쳐
// 통과시키는 대신 **자리를 명시적으로 열고 그 결정을 diff 에 남긴다** — R3 주석이 적은
// *"넓히려면 여기 한 줄을 고치는 결정이 필요하고, 그 결정이 diff 에 남는다"* 와 같은 원리.
//
// ── 왜 내려왔나 (2026-08-16, W8-3 S3) ──────────────────────────────────────
// 이 목록은 `mypage/nickname.ts` 안에 `const` 로 갇혀 있었고, 세계 쪽에서 작가 아이디를
// 판정할 자리(`world2/decide/tenant-id.ts`)가 생기면서 **둘이 같은 목록을 봐야** 하게 됐다.
//
// 두 선택지가 있었고 **둘 다 나빴다**:
// · 목록을 복사한다 → **값 미러링.** 한쪽만 고쳐도 아무도 모른다(이 저장소가 세 번 데인 형태)
// · `nickname.ts` 를 import 한다 → 그 파일이 `./schema.js` 를 끌고 오므로 **world2 청크에
//   mypage 가 딸려온다.** `profile-storage.ts:1-20` 이 그 사고를 실측했다
//   (auth 청크 **1,186B → 12,586B**)
//
// 그래서 **의존 0 인 leaf 로 내린다.** 양쪽이 여기서 받아 쓰면 값도 하나이고 청크도 안 는다.
//
// ⚠ **목록과 정규화를 함께 내렸다.** 목록만 내리면 소비자가 자기 `fold` 를 다시 짜게 되고
// 그것이 곧 두 번째 미러링이다 — 판정이 갈라지면 한쪽에서 막힌 이름이 다른 쪽에서 통과한다.
//
// ⚠⚠ **금칙어(`BANNED`)는 안 내렸다.** 그것은 별명의 «표시되는 문구» 를 보는 축이고,
// 아이디는 «주소에 들어가는 식별자» 라 판정 기준이 다르다(길이·문자셋부터 다르다).
// 필요해지면 그때 내린다 — **지금 안 쓰는 것을 미리 공유하지 않는다.**

/**
 * 예약어 — 운영자·공식 계정 사칭 방지(감독 안). 부분 문자열이 아니라 **정규화 후
 * 완전 일치**로 본다.
 *
 * 왜 부분 일치가 아닌가: `admin` 을 부분 일치로 막으면 `admiral`·`관리자님의친구` 까지
 * 걸린다. 사칭의 위험은 "이름이 그것과 같아 보이는 것" 이지 "그 글자를 포함하는 것" 이
 * 아니다. 대신 정규화에서 밑줄·숫자 치환(`4dmin`·`a_d_m_i_n`)을 걷어내 우회를 좁힌다.
 */
export const RESERVED_NAMES = [
  'admin', 'administrator', 'root', 'system', 'staff', 'support', 'help',
  'official', 'openartshow', 'oas', 'ayamo', 'moderator', 'mod', 'owner',
  'null', 'undefined', 'anonymous', 'guest', 'me', 'you',
  '관리자', '운영자', '운영팀', '공식', '고객센터', '오픈아트쇼', '아야모',
] as const;

/** 사칭 판정용 정규화 — 대소문자·밑줄·흔한 숫자 치환(leet)을 걷어낸다. */
export function foldForReserved(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't');
}

/** 예약어인가. 정규화 후 **완전 일치**만 본다(위 주석의 근거) */
export function isReservedName(value: string): boolean {
  return (RESERVED_NAMES as readonly string[]).includes(foldForReserved(value));
}
