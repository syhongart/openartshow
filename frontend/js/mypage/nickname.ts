// frontend/js/mypage/nickname.ts — 별명 검증·추천 (순수 함수)
//
// THREE 미참조·DOM 미참조·저장 미참조. 서버가 붙으면 **이 파일을 서버에서도 돌린다**.
//
// ── 지금 할 수 있는 것과 없는 것 ──────────────────────────────────────────
// 길이·문자·금칙어·사칭은 전부 여기서 판정한다. **전역 중복만** 서버가 필요하다
// (다른 사용자를 알아야 하므로). 그래서 이 파일은 중복을 판정하지 않고, `checkNickname`
// 이 받은 `taken` 집합만 본다 — 그 집합을 로컬에서 채우든 서버에서 받아오든 이 파일은
// 모른다. 서버가 붙는 날 바뀌는 것은 집합을 채우는 쪽이지 판정이 아니다.
//
// ── 그리고 지금은 중복검사가 지키는 것이 없다 ────────────────────────────
// `auth.js` 의 OAuth 키가 전부 비어 있어 mock 으로 돈다. 사용자 식별자가 자칭
// 문자열(`"google:아트러버"`)인 동안에는, 서버에 `UNIQUE (nickname)` 을 걸어도 아무나
// 남의 별명을 선점할 수 있다. **실제 OAuth 가 중복검사의 전제**다(감독 보고 2026-08-08,
// 판정: mock 유지 · 중복검사는 서버 게이트 뒤로).

import { LIMITS } from './schema.js';
import { isReservedName } from '../shared/reserved-names.js';

export type NicknameErrorCode =
  | 'empty'
  | 'too-short'
  | 'too-long'
  | 'charset'    // 허용하지 않는 문자
  | 'jamo'       // 한글 자모 단독(ㄱ, ㅏ …)
  | 'edge'       // 밑줄로 시작/끝
  | 'numeric'    // 숫자로만 이루어짐
  | 'banned'     // 금칙어
  | 'reserved'   // 운영자·공식 사칭
  | 'taken';     // 이미 사용 중

export interface NicknameCheck {
  ok: boolean;
  code: NicknameErrorCode | null;
  message: string;
  /** 서버 중복검사가 아직 없어 '중복 아님' 을 보증하지 못하는 상태. UI 가 ⏳ 로 쓴다. */
  pendingUniqueness: boolean;
}

// ── 허용 문자 ─────────────────────────────────────────────────────────────
// 한글 완성형(가-힣) · 영문 · 숫자 · 밑줄. 감독 안 그대로다.
//
// 자모 단독(ㄱ-ㅎ, ㅏ-ㅣ)은 **일부러 뺐다**. 폰트·플랫폼에 따라 조합이 깨져 보이고,
// 검색·정렬이 완성형과 섞이지 않는다. 다만 그것을 'charset'(쓸 수 없는 문자)으로
// 뭉개면 사용자는 무엇이 문제인지 모른다 — 그래서 별도 코드('jamo')로 가른다.
const ALLOWED_RE = /^[가-힣A-Za-z0-9_]+$/;
const JAMO_RE = /[ㄱ-ㆎ]/;

/**
 * 금칙어. 부분 문자열로 검사한다.
 *
 * 이 목록은 **최소 방어선**이지 완결된 필터가 아니다. 우회는 언제나 가능하고, 그것을
 * 정규식으로 쫓는 것은 지는 싸움이다. 실제 방어는 신고·정지이며 그것은 서버 몫이다.
 * 여기서 막는 것은 "실수로 만들어지는 것" 과 "대놓고 만들어지는 것" 까지다.
 */
const BANNED = [
  '시발', '씨발', '병신', '지랄', '좆', '씹', '개새끼', '새끼', '보지', '자지',
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'nigger', 'faggot',
  '섹스', 'sex', 'porn', '야동',
] as const;

// ⚠ 예약어 목록과 그 정규화는 **`../reserved-names.js` 가 소유한다**(2026-08-16).
// 그전에는 여기 `const` 로 있었고, 세계 쪽에서 작가 아이디를 판정할 자리가 생기면서
// 둘이 같은 목록을 봐야 하게 됐다. 복사하면 값 미러링이고, 이 파일을 세계가 import 하면
// `./schema.js` 까지 딸려가 청크가 는다(`profile-storage.ts:1-20` 의 실측 사고).
// 그래서 **의존 0 인 leaf 로 내렸다** — 왜 그 형태인지는 그 파일 헤더 한 곳이다.

/** 코드포인트 기준 길이. 한글·이모지가 섞여도 사용자가 세는 것과 같게 센다. */
export function nicknameLength(value: string): number {
  return Array.from(value).length;
}

function make(code: NicknameErrorCode | null, message: string, pending = false): NicknameCheck {
  return { ok: code === null, code, message, pendingUniqueness: pending };
}

export interface CheckOptions {
  /** 이미 쓰이고 있는 별명(소문자 정규화된 집합). 로컬이든 서버든 채우는 쪽은 자유. */
  taken?: ReadonlySet<string>;
  /**
   * `taken` 이 **전역**을 담고 있는가. 로컬 저장만 보고 있다면 false —
   * 그때 통과는 "중복이 아니다" 가 아니라 "아직 모른다" 이고, UI 가 그렇게 말해야 한다.
   * 못 잰 것을 통과로 적지 않는다는 이 저장소의 규율이 여기에도 적용된다.
   */
  uniquenessAuthoritative?: boolean;
  /** 자기 자신의 현재 별명. 편집 중 자기 이름에 걸리지 않게 한다. */
  self?: string;
}

/** 중복 검사용 키. 대소문자만 다른 별명을 다른 것으로 치지 않는다. */
export function nicknameKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * 별명을 판정한다.
 *
 * 통과해도 `pendingUniqueness` 가 true 면 **아직 중복을 모르는 상태**다.
 * 화면은 그때 ✓ 가 아니라 ⏳ 를 보여야 한다.
 */
export function checkNickname(input: string, options: CheckOptions = {}): NicknameCheck {
  const value = String(input ?? '').trim();
  const { min, max } = LIMITS.nickname;

  if (!value) return make('empty', '별명을 입력해 주세요.');

  const len = nicknameLength(value);
  if (len < min) return make('too-short', `${min}자 이상 입력해 주세요.`);
  if (len > max) return make('too-long', `${max}자까지 쓸 수 있습니다.`);

  if (JAMO_RE.test(value)) {
    return make('jamo', '한글 자음·모음 하나만 쓸 수는 없습니다. (예: ㄱ, ㅏ)');
  }
  if (!ALLOWED_RE.test(value)) {
    return make('charset', '한글·영문·숫자·밑줄(_)만 쓸 수 있습니다.');
  }
  if (value.startsWith('_') || value.endsWith('_')) {
    return make('edge', '밑줄(_)로 시작하거나 끝날 수 없습니다.');
  }
  if (/^[0-9]+$/.test(value)) {
    // 숫자만으로 된 별명은 나중에 사용자 ID 와 구별되지 않는다. `/@12345` 가 별명인지
    // 내부 번호인지 알 수 없게 되는 것을 지금 막는다.
    return make('numeric', '숫자로만 만들 수는 없습니다.');
  }

  const lower = value.toLowerCase();
  for (const word of BANNED) {
    if (lower.includes(word)) return make('banned', '사용할 수 없는 단어가 들어 있습니다.');
  }

  if (isReservedName(value)) {
    return make('reserved', '운영자·공식 계정과 혼동될 수 있는 별명입니다.');
  }

  const selfKey = options.self ? nicknameKey(options.self) : '';
  const key = nicknameKey(value);
  if (options.taken && key !== selfKey && options.taken.has(key)) {
    return make('taken', '이미 사용 중인 별명입니다.');
  }

  // 여기까지 왔으면 형식·금칙·사칭은 통과다. 남은 것은 전역 중복뿐이고, 그것은
  // `uniquenessAuthoritative` 가 true 일 때만 확인된 것이다.
  const pending = options.uniquenessAuthoritative !== true;
  return make(
    null,
    pending ? '쓸 수 있는 형식입니다. (중복 확인은 로그인 연동 후)' : '사용 가능한 별명입니다.',
    pending,
  );
}

/**
 * 대체 별명 후보. 감독 안의 `arthong76` · `art_hong` 형태를 그대로 만든다.
 *
 * **시계도 난수도 쓰지 않는다** — 같은 입력에 같은 후보가 나와야 테스트가 성립하고,
 * 사용자도 화면을 다시 열 때마다 추천이 바뀌면 고르던 것을 잃는다. 숫자 후보는
 * 입력 문자열에서 유도한다.
 */
export function suggestNicknames(input: string, options: CheckOptions = {}, count = 3): string[] {
  const raw = String(input ?? '').trim();
  if (!raw) return [];

  // 후보의 씨앗은 "허용 문자만 남긴 것". 금칙·사칭에 걸린 입력이면 씨앗 자체가
  // 못 쓰는 것이므로 후보를 만들지 않는다 — 금칙어에 숫자만 붙여 권하는 꼴이 된다.
  const seed = Array.from(raw).filter((ch) => ALLOWED_RE.test(ch)).join('').replace(/^_+|_+$/g, '');
  if (!seed) return [];
  const seedCheck = checkNickname(seed, { uniquenessAuthoritative: true });
  if (!seedCheck.ok && (seedCheck.code === 'banned' || seedCheck.code === 'reserved')) return [];

  const { max } = LIMITS.nickname;
  const clip = (s: string) => Array.from(s).slice(0, max).join('');

  // 입력에서 유도한 결정적 숫자. 같은 이름이면 같은 후보가 나온다.
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.codePointAt(0)!) % 9973;

  const candidates: string[] = [];
  const push = (value: string) => {
    const v = clip(value);
    if (!v || candidates.includes(v)) return;
    const check = checkNickname(v, options);
    if (check.ok) candidates.push(v);
  };

  // ① 숫자 꼬리 — arthong76
  push(`${seed}${hash % 100}`);
  // ② 밑줄 분절 — art_hong (앞쪽 3~5자 뒤에서 끊는다)
  const chars = Array.from(seed);
  if (chars.length >= 4) {
    const cut = Math.min(4, chars.length - 1);
    push(`${chars.slice(0, cut).join('')}_${chars.slice(cut).join('')}`);
  }
  // ③ 접미 — arthong_art / arthong_studio
  push(`${seed}_art`);
  push(`${seed}_studio`);
  // ④ 그래도 모자라면 숫자를 늘려 간다(결정적).
  for (let i = 1; candidates.length < count && i <= 20; i += 1) {
    push(`${seed}${(hash + i * 7) % 1000}`);
  }

  return candidates.slice(0, count);
}
