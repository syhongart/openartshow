# OpenArtShow 디자인 시스템

> 브랜드·폰트·색·타이포·인터랙션 결정의 단일 기준 문서. 새 화면·컴포넌트는 여기 토큰을
> 재사용한다. 원칙: **한국어 우선, 영문은 액센트.** `word-break: keep-all`(어절 보존).

---

## 1. 폰트 정책 (2026-07-13 감독 결정)

| 구분 | 폰트 | weight | 라이선스 | 비고 |
|---|---|---|---|---|
| **한글** | **나눔고딕 NanumGothic** | 400 / 700 / 800 | SIL OFL 1.1 | `unicode-range`로 한글에만 적용 |
| **영문·숫자** | **Pretendard** | 200~700 | SIL OFL 1.1 | 로고·얇은 weight 완성도 |
| 폴백 | 시스템 스택 | — | — | `Helvetica Neue…Apple SD Gothic Neo…` |

- **적용 스택**: `font-family: 'NanumGothic', 'Pretendard', "Helvetica Neue", Helvetica, Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;`
  - 나눔고딕 @font-face에 `unicode-range: U+1100-11FF, U+3130-318F, U+A960-A97F, U+AC00-D7A3, U+D7B0-D7FF`(한글) → **한글은 나눔고딕**, 라틴은 unicode-range 밖이라 **Pretendard**로 자동 폴백.
- **self-host**: `web/vendor/fonts/*.woff2`. 앱 CSP(`default-src 'self'`)와 정합(외부 CDN 미사용). `font-display: swap`(FOUT — 텍스트 즉시 표시 후 폰트 교체).
- **성능**: 상용(KS X 1001 2350자) 서브셋으로 용량 최소화.
- **한계(인지)**: 나눔고딕은 굵기가 Regular/Bold/ExtraBold뿐이라, 얇은~중간 한글 weight(200/300/500/600)는 나눔에서 400/700로 근사된다. 영문은 Pretendard라 전 weight 유지.
- 배포 경로 주의: 파일 위치별 상대경로 다름 — 루트(landing/guide)=`./app/vendor/fonts/`, 앱(index/studio/ui.js)=`./vendor/fonts/`, 생성기(team/valuation/devlog)=`../app/vendor/fonts/`.

## 2. 색 — 청자 그린 시스템

크림 페이퍼 배경 + 청자 그린 액센트 + 골드(그린) 강조. CSS 커스텀 프로퍼티로 관리.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--green-100` | #e3efe7 | 연한 워시 |
| `--green-300` | #8fd0ab | 하이라이트(워드마크 'Open') |
| `--green-500` / `--gold` | #5f9e7d | 기본 액센트 |
| `--green-700` | #3f7a5c | 딥 |
| `--green-800` | #2c5844 | 포레스트(버튼) |
| `--green-900` | #14261d | 심연(다크 섹션) |
| `--gold-text` | #3d6b50 | 크림 위 그린 텍스트(대비 4.6:1) |
| `--paper` / `--paper-deep` | #fdfbf5 / #f6f1e4 | 배경 |
| `--ink` / `--ink-body` / `--ink-dim` | #17140f / #57503f / #6b6459 | 잉크 |

## 3. 타이포 스케일 (landing 기준 토큰)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--fs-h1` | clamp(34px, 8.5vw, 60px) | 히어로 표제 |
| `--fs-h2` | clamp(30px, 4.5vw, 42px) | 섹션 표제 (h1과 ~1.43배 대비) |
| `--fs-body-lg` / `--fs-body` | 17px / 15px | 리드 문단 / 본문 |
| `--fs-label` / `--fs-caption` | 13px / 12px | 라벨 / 캡션 |
| line-height | `--lh-body` 1.7 · `--lh-body-loose` 1.85 · `--lh-h2` 1.2 | |

## 4. 형태 · 인터랙션

- **radius**: `--r-card: 3px` — 갤러리 플레이트 모티프(유일한 radius). 각진 센터 모달은 "플레이트" 컨벤션.
- **카드 hover**: 통일된 상승 `translateY(-4px)` + `--shadow-card-hover`(`0 16px 32px rgba(20,38,29,.08)`). featured는 더 깊게.
- **버튼**: hover `translateY(-2px)`+그림자, active `translateY(1px) scale(.98)`.
- **접근성**: `:focus-visible` 아웃라인(라이트 `--gold-text` / 다크 `--green-300`). `prefers-reduced-motion`에서 hover/active transform 무력화.

## 5. 로고 · 브랜드

- 워드마크: **OpenArtShow.** — `Open`(청자 그린 `--green-300`) + `ArtShow` + `.`(골드). 마크업 `<span class="w-lead">Open</span>ArtShow<span class="dot">.</span>`.
- 상표: **OpenArtShow™ · 아야모™(Ayamo™)** (미등록, 출원 준비 중 — ® 사용 금지).
- 저작권: © 2026 홍성용 (Hong Sungyong).

## 6. 마스코트 — 아야모(Ayamo)

- 자체 제작 3D 치비 캐릭터(외부 에셋 0, `web/js/chibi.js`). 헤어·얼굴형·눈·입·의상·색 커스터마이즈.
- 꾸미기 모달: 옵션을 얼굴/헤어/의상 3그룹(스티키 헤더)으로. 프리뷰는 좌우 ±18° 스윙(드래그 수동 회전 가능), 카메라 여백 확보.

---

*변경 이력*: 2026-07-13 최초 — 폰트 정책(한글 나눔고딕 + 영문 Pretendard) 확정 기록.
