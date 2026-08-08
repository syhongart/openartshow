# world3 — 포근마을 (world2 의 포크)

## 분기 사실

- **분기 기준 커밋**: `2ba0ae9440343f72c7bcdc2e2d938f2b043341b3`
- **분기 일자**: 2026-08-08
- **원본**: `frontend/js/world2/` 전체 + `frontend/js/sky.js`(→ `world3/sky.js`)
- **착수 근거**: 감독 지시 2026-08-08 — *"지금 있는 world2를 동물의숲으로 만들어봐.
  귀욤 뽕짝으로. … 월드3으로 하고. 파일 다 날릴 수 있으니. 독립적으로 해."*
- **판정**: 팀장 2026-08-08 — 전체 포크 채택(조건 5항). 이 README 는 그 조건 1이다.

## 왜 포크인가 — "테마만 교체" 가 불가능했다

조사 실측(2026-08-08):

| 축 | 실측 |
|---|---|
| 중앙 팔레트 | **없다.** `parts/color.ts` 는 포맷터(`hexCss`) 하나뿐이고 색 hex 는 파츠 13개 파일에 **47곳 하드코딩** |
| 레지스트리 주입 | **없다.** `parts/index.ts` 의 `PARTS`/`ALL_KINDS` 를 13개 모듈이 **정적 import**(`systems/parcel-assets.ts`·`parcel-builder.ts`·`decide/` 7종·`features/ocean·npc`) |
| 진입 옵션 | `startWorld2(canvas)` 에 옵션 인자 0. URL 노브는 기존 값의 배수·스위치일 뿐 팔레트 교체 통로가 아니다 |
| 하늘 팔레트 | `LIGHT` 테이블이 **라이브 공유 `frontend/js/sky.js`** 에 있고 미export — 고치면 라이브 world1 이 흔들린다 |
| DOM | `world2.html` 의 `w2-` id 를 `ui/knob-bar·sky-panel·map-drawer` 가 하드코딩 조회 |

즉 "world2 를 안 건드리면서 룩만 바꾸는" 경로가 다섯 축 전부에서 막혀 있었다.
감독의 *"파일 다 날릴 수 있으니 독립적으로"* 가 정확히 이 위험을 가리킨다.

## 동기화 정책 — **no-sync 가 기본**

world2 의 후속 개선은 **자동으로 반영하지 않는다.** 정기 동기화 의무도 두지 않는다 —
그것이야말로 미러링 부담을 만든다(팀장 판정).

필요한 개선이 생기면 **개별 체리픽**하고, 아래 표에 그 사실을 적는다.
표가 비어 있다는 것은 분기 이후 아무것도 가져오지 않았다는 뜻이다.

| 날짜 | 원본 커밋 | 가져온 것 | 이유 |
|---|---|---|---|
| — | — | — | — |

## 무엇이 격리를 지키는가 — 산문이 아니라 검사다

`tests/world3-independence.test.ts` 가 **world3 코드에서 다음의 import 0** 을 강제한다:

- `frontend/js/world2/**`
- `frontend/js/sky.js`(원본 — world3 는 자기 포크 `world3/sky.js` 를 쓴다)
- 라이브 보호 4파일(`main.js`·`player.js`·`artworks.js`·`config.js`)

이 저장소는 **게이트 유효성에 대한 거짓 진술로 7일을 잃은 전력**이 있다(`CLAUDE.md` 의
`main` unprotected 오기). *"world2 에 무영향"* 은 검사가 될 때만 참이다.

## 의도적으로 **공유**하는 것

- `frontend/js/chibi*.ts` 체인(4,319줄) — 아바타 빌더. **읽기 전용으로 쓴다.**
  포크하지 않은 이유는 실익 대비 분량이다. world3 의 아바타 룩 조정은
  `world3/avatars/chibi.ts` 어댑터에서 빌더 결과를 후처리하는 선까지만 한다.
  **빌더 자체를 고쳐야 할 일이 생기면 그때 체인을 포크한다** — 공유 파일을 고치는
  것은 곧 world1 을 고치는 것이고, 그게 감독이 막으라고 한 바로 그 일이다.
- `frontend/vendor/**` — three, GLTFLoader, 폰트. 런타임 벤더는 원래 공유 자산이다.

## 주석 속 `world2` 는 이력이다

포크한 파일들의 주석에는 world2 시절의 실측·사고 기록이 그대로 남아 있다.
**지우지 않았다** — 그 값들이 왜 그 값인지가 거기 적혀 있고, 지우면 다음 사람이
같은 고리를 다시 돈다. 식별자(`startWorld3`·`__world3`·`w3-`·`[world3]`)만 바꿨다.
