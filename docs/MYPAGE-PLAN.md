# 마이페이지 — 설계 계획 (v0.1 초안)

> 감독 지시 2026-08-08: *"파일 구조 별도로 만들어서 진행해. 계획을 먼저 짜봐."*
> 이 문서는 **착수 전 계획**이다. 감독 판정(§11)이 나오기 전에는 코드를 쓰지 않는다.

---

## 0. 한 줄

마이페이지를 "회원정보 수정 화면"이 아니라 **공개 작가 프로필의 편집기**로 설계한다.
감독 지적 그대로다 — *"단순 회원정보 페이지로 먼저 만들어버리면 나중에 공개 작가
페이지를 붙일 때 구조를 다시 뜯을 가능성이 큽니다."*

---

## 1. 현황 실측 — 감독 설계안 대비 갭

착수 전에 **이미 있는 것을 다시 만들지 않기 위해** 저장소를 실측했다.

| 감독 제안 항목 | 현재 상태 | 판정 |
|---|---|---|
| 캐릭터 편집(조합 정보 저장) | **이미 있다.** `chibi-schema.ts`(헤어 10·수염 5·눈 3·입 3·하의 5·상의패턴 4·의상 6·액세서리 4 + 팔레트 SSOT), 편집 UI `ui-avatar-editor.ts`, 저장 `ui-chibi-store.ts`(유저별 네임스페이스 + 옷장 12슬롯 + 레거시 마이그레이션) | **재사용.** 새로 만들지 않는다 |
| 별명 + 중복검사 API | 없음 | 서버 전제 (§3) |
| 프로필 이미지 / 소개 / 활동분야 | 없음 | 신규 |
| SNS·외부 링크 | 없음 | 신규 |
| 작가 프로필(작가명·bio·장르·전시·판매) | 없음 | 신규 |
| 공개 설정 | 없음 | 신규 |
| 공개 프로필 `/@nickname` | 없음 | 서버 전제 (§3) |
| DB(`users`·`user_social_links`) | **백엔드 0.** `backend/`에 README 한 장뿐 | 서버 전제 (§3) |
| 회원 신원 | **mock.** `auth.js`의 OAuth 키 3종이 전부 빈 문자열 → 자동 mock 모드 | §3-③ |

감독의 캐릭터 JSON 예시(`{skin, face, hair, hairColor, ...}`)는 **우리가 이미 하고 있는
방식과 같다.** `ui-chibi-store.ts`는 조합 파라미터를 JSON으로 저장하고 있고, 그래서
아바타는 지금도 HUD·빌더·월드 어디서든 같은 모습으로 다시 렌더된다. 감독이 "향후
메타버스로 확장할 때 유리하다"고 한 그 구조가 이미 라이브에 깔려 있다.

---

## 2. 그래서 이 작업의 실제 크기

새로 만드는 것은 **프로필 데이터 계층 + 마이페이지 화면**이고, 캐릭터는 **연결만** 한다.
감독 우선순위에서 5번(캐릭터 편집)이 가장 싼 항목이다.

---

## 3. 가장 중요한 발견 셋 — 순서를 바꿔야 하는 이유

### ① 감독 설계안의 절반은 서버가 있어야만 성립한다

- **별명 중복검사** = 전역 유일성 = 다른 사용자를 알아야 한다 → 서버
- **`UNIQUE (nickname)`** = DB → 서버
- **`openartshow.com/@arthong`** = 임의 경로 서빙 → 서버(또는 빌드 시 생성)
- **기기 교체 시 프로필 유지** = localStorage로는 불가능

현재 OpenArtShow는 **백엔드 0의 정적 서비스**다(`backend/README.md`가 그렇게 적고 있다).

### ② 그러나 서버부터 짓는 것은 이 순서가 아니다

`backend/README.md`의 규약이 이미 정하고 있다 — *"프론트는 백엔드 없이도 동작해야
한다. 서버가 죽어도 전시를 보는 것만은 되어야 한다."* 개인정보를 서버에 담는 순간
§6 법무 게이트(개인정보 취급방침·보관·삭제권)가 열리고, CSP에 백엔드 origin을 추가해야
하며, 운영 비용과 장애 대응이 생긴다. **되돌리기 비싼 결정**이다.

### ③ 그리고 서버보다 먼저 필요한 것이 있다 — 로그인이 가짜다

```js
// frontend/js/auth.js
const CONFIG = {
  google: { clientId: '' }, kakao: { jsKey: '' }, naver: { clientId: '' },
};
```

키가 비어 있어서 **자동 mock 모드**로 돈다. 현재 사용자 식별자는
`ui-chibi-store.ts`의 `currentUserId()` → `"google:아트러버"` 같은 **자칭 문자열**이다.

> **신원이 없으면 별명 소유권이 성립하지 않는다.**
> mock 로그인 위에 서버 DB와 `UNIQUE (nickname)`을 올려도, 아무나 아무 이름으로
> 로그인해 남의 별명을 선점할 수 있다. 중복검사가 지키는 것이 아무것도 없다.

그래서 **실제 OAuth 키 발급이 별명 중복검사보다 먼저**다. 그리고 그것은 감독만 할 수
있는 일이다(Google Cloud Console·Kakao Developers·Naver Developers 계정 소유자).

---

## 4. 저장 구조 — 세 갈래

| 안 | 내용 | 오늘의 비용 | 감독 우려(구조 재작업) |
|---|---|---|---|
| **A. 로컬만** | 스키마·UI 전부, 저장은 localStorage. 어댑터 없음 | 0 | **해소 안 됨** — 서버 붙일 때 소비자 전부 수정 |
| **B. 어댑터 + 로컬 구현** | 스키마를 **서버 DB 스키마 그대로** 설계. 저장을 `ProfileStore` 인터페이스 뒤에 두고 이번엔 `LocalProfileStore`만 구현 | 인터페이스 1개 | **해소** — 서버가 붙으면 `RemoteProfileStore` 추가로 끝. 화면 코드 무수정 |
| **C. Cloudflare Workers + D1 즉시** | 진짜 서버·진짜 중복검사·진짜 `/@nickname` | 법무 게이트 + CSP + 운영/비용 + **③의 전제 미충족** | 해소되나 조기 |

**권고: B.**
감독의 우려는 B로 해소된다. C의 값어치는 ③(실제 OAuth)이 없는 동안 대부분 무효다 —
가짜 신원 위의 진짜 DB는 진짜 중복검사가 아니다. B로 만들어 두면, OAuth 키가 나온 뒤
C로 가는 길은 **파일 하나 추가**다.

---

## 5. 파일 구조 (감독 지시: 별도로)

보호 파일(`main.js`·`player.js`·`artworks.js`·`config.js`) **import 0**의 가산형 독립
모듈로 만든다. `visit.js`가 잡아 둔 선례를 그대로 따른다.

```
frontend/
  mypage.html                     ← 새 진입점 (behind-flag 시작: 어디에도 링크하지 않음)
  css/mypage.css
  js/mypage/
    index.ts          ← 배럴(재수출). 소비자는 이 경로로만 접근 (ARCHITECTURE §4)
    schema.ts         ← 프로필 스키마 SSOT. 버전 필드 + normalizeProfile/migrateProfile
                        (space.ts·chibi-schema.ts 계보 — "파라미터가 곧 프로필")
    store.ts          ← ProfileStore 인터페이스 + LocalProfileStore 구현
    nickname.ts       ← 별명 형식검증·금칙어·사칭방지·추천 생성 (순수 함수)
    links.ts          ← SNS 플랫폼 정의 + URL 정규화/검증 (순수 함수)
    visibility.ts     ← 공개 설정 판정 → 공개 프로필 뷰가 그대로 소비 (순수 함수)
    view-preview.ts   ← 상단 Profile Preview (항상 보이는 그 카드)
    view-basic.ts     ← 기본 정보
    view-avatar.ts    ← 캐릭터 — 기존 ui-avatar-editor 연결만
    view-links.ts     ← SNS / 링크
    view-artist.ts    ← 작가 정보
    view-privacy.ts   ← 공개 설정
    app.ts            ← 탭 셸 + 저장 오케스트레이션
tests/
  mypage-schema.test.ts
  mypage-nickname.test.ts
  mypage-links.test.ts
  mypage-visibility.test.ts
```

**설계 규율**
- 판정(`nickname`·`links`·`visibility`)은 **THREE 미참조 순수 함수**로 분리한다.
  서버가 붙으면 **같은 파일을 서버에서도 돌린다** — 클라이언트 검증과 서버 검증이
  갈라지지 않는다(값 미러링 금지 원칙의 적용).
- 다만 판정/집행 분리의 알려진 구멍(ARCHITECTURE 검증 규율)을 그대로 밟지 않기 위해,
  **"계산된 값이 실제로 화면에 소비되는가"를 보는 통합 테스트를 함께 붙인다.**
  순수 함수 테스트만으로는 통과한다 — 그건 이미 이 저장소에서 사고를 낸 형태다.
- 아바타는 `chibi-schema`·`ui-chibi-store` **배럴 경유**로만 접근한다. 저장 키는
  1바이트도 건드리지 않는다(그 파일 주석의 `[불변]` 조항).

---

## 6. 스키마 초안 — 서버 테이블로 그대로 승격되는 형태

감독이 제시한 `users` / `user_social_links` 2테이블 구조를 **그대로** 클라이언트
스키마로 쓴다. 그래야 서버가 붙을 때 매핑 코드가 생기지 않는다.

```ts
// frontend/js/mypage/schema.ts
export const PROFILE_VERSION = 1;

export interface Profile {
  v: number;                    // 스키마 버전 (migrateProfile의 축)
  nickname: string;             // 2~20자. 전역 유일 — 지금은 로컬 예약, 서버 붙으면 UNIQUE
  displayName: string;          // 작가명 "홍길동 / Hong Gil Dong"
  userType: UserType;           // 'artist' | 'gallery' | 'collector' | 'member'
  avatarRef: AvatarRef;         // { kind: 'chibi' } — 실제 파라미터는 ui-chibi-store 소관
  profileImage: string;         // dataURL(로컬) → 서버 붙으면 R2 키. 빈 문자열 허용
  bioShort: string;             // 한 줄 소개 (≤80)
  bio: string;                  // 소개 (≤500) / 작가는 ≤1500
  location: string;             // 활동 지역
  genres: GenreId[];            // 회화·사진·조각·미디어아트·설치·디지털·기타
  exhibitions: string;          // 주요 전시 (자유 텍스트, v1)
  gallery: string;              // 소속 갤러리
  inquiryOpen: boolean;         // 작품 문의 가능
  saleOpen: boolean;            // 작품 판매 가능
  links: SocialLink[];          // ↓ 별도 테이블에 대응
  visibility: Visibility;       // 항목별 공개 설정
  createdAt: number; updatedAt: number;
}

export interface SocialLink {    // ← user_social_links
  platform: PlatformId;          // instagram | x | youtube | tiktok | facebook
                                 // | behance | artstation | website | other
  url: string;                   // URL로 저장(감독 판단대로 확장성 우위)
  handle: string;                // 표시용 @arthong — instagram 등은 URL에서 유도
  sortOrder: number;
  isVisible: boolean;
}
```

- **`normalizeProfile`/`migrateProfile`은 처음부터 넣는다.** `space.ts`·`chibi-schema.ts`가
  이미 그렇게 살아 있고, 없으면 나중에 필드 하나 추가할 때마다 저장이 깨진다.
- **이메일·로그인 정보는 이 스키마에 들어오지 않는다.** 감독 지시대로 공개 프로필과
  완전히 분리한다(`auth.js` 소관으로 남긴다).

---

## 7. 별명 — 서버 없이 지금 할 수 있는 것 / 없는 것

| 검사 | 서버 없이 | 비고 |
|---|---|---|
| 길이 2~20자 | **가능** | `nickname.ts` 순수 함수 |
| 허용 문자(한글·영문·숫자·`_`) | **가능** | |
| 금칙어 | **가능** | 목록은 클라이언트에도 필요 |
| 운영자·공식계정 사칭(`admin`·`openartshow`·`관리자`…) | **가능** | 예약어 목록 |
| 추천 생성(`arthong76`·`art_hong`) | **가능** | |
| **전역 중복** | **불가능** | 서버 필수 |

→ 지금은 **형식·금칙·사칭까지 전부 구현**하고, 중복만 "서버 연결 시" 자리를 비워 둔다.
UI는 세 상태(✓ 사용 가능 / ✕ 규칙 위반 / ⏳ 중복확인은 로그인 연동 후)를 처음부터 갖춘다.

---

## 8. 화면 구조 (감독 안 그대로)

```
MY PAGE
┌─ Profile Preview ────────────  ← 항상 상단 고정. 편집이 즉시 반영된다
│   [아야모 캐릭터]  ART.HONG
│   @arthong · Media Artist
│   빛과 공간, 이미지의 관계를 탐구합니다.
│   Instagram · Website · YouTube
└───────────────────────────────
[기본 정보][캐릭터][소개][SNS·링크][작가 정보][공개 설정][계정]
```

**Preview는 공개 프로필 뷰와 같은 렌더 함수를 쓴다.** 그래야 "다른 사람이 보는 모습"이
정말로 그 모습이다 — 두 벌로 만들면 반드시 갈라진다.

---

## 9. 우선순위 — 감독 안과 다른 지점, 그리고 이유

| | 감독 안 | 제안 | 왜 |
|---|---|---|---|
| P0 | — | **스키마 + 저장 어댑터 + 셸 + Preview** | 여기서 안 정하면 나머지가 전부 재작업 |
| P1 | ①별명 ②사진·소개 | 별명(형식·금칙·사칭) + 소개 + 프로필 이미지 | 중복검사만 뒤로 |
| P1 | ⑤캐릭터 | **캐릭터 (연결만)** | **이미 구현돼 있다.** 가장 싼 항목이 5번에 있었다 |
| P2 | ③SNS | SNS·링크 + 공개 설정 | |
| P3 | ⑥작가 프로필 | 작가 정보 | |
| **P4** | ①중복검사 ④`/@nickname` | **[서버 게이트]** 실제 OAuth → 전역 중복검사 → 공개 프로필 | §3-③ — 신원이 먼저 |
| P5 | ⑦연결 | 작품·전시·컬렉션 연결 | |

감독 순서에서 바뀐 것은 **둘뿐**이다: 캐릭터가 올라오고(이미 있어서), 중복검사·공개
프로필이 서버 게이트 뒤로 간다(신원이 없어서). 나머지는 감독 안 그대로다.

---

## 10. 검증 계획

- **순수 함수 테스트**: `nickname`·`links`·`visibility`·`schema`(migrate 포함)
- **통합 테스트**: 판정 값이 Preview에 실제로 소비되는지 (§5 규율)
- **뮤테이션 확인**: 결함을 일부러 되살려 테스트가 깨지는지 본다. 안 깨지면 장식이다
- **behind-flag**: `mypage.html`은 어디에도 링크하지 않고 시작 → 감독 확인 후 노출
- **배포 게이트**: 새 진입점이므로 `verification-tier` 판정을 받는다. 라이브 노출
  시점에 스모크 대상 목록에 **반드시 추가**한다(`builder.html`이 누락돼 있던 그 구멍)

---

## 11. 감독 판정이 필요한 것

1. **저장 구조** — A(로컬만) / **B(어댑터+로컬, 권고)** / C(Cloudflare 즉시)
2. **이번 사이클 범위** — P0만 / P0+P1 / P0~P3
3. **실제 OAuth 키 발급** — 감독만 가능. 진행 여부와 시점

이 셋이 정해지기 전에는 코드를 쓰지 않는다. 특히 1번은 되돌리기 비싼 분기다.
