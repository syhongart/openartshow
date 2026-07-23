# OpenArtShow 개발일지

개선 작업의 원인 → 분석 → 개선 → 결과를 기록한다. 최신 항목이 위.

---

## 2026-07-23 · 오픈월드 저사양 그림자 강등(C-1) — lite 진입 시 실시간 섀도 샘플링 완전 제거

**원인.** 감독 실기기에서 오픈월드(world)가 9fps로 버벅였다. 성능감사로 주범을 확정했다 —
실시간 `PCFSoftShadowMap` 그림자 샘플링이다. `receiveShadow` 표면이 148개(바닥·모래·다리·도로·강)로
화면 대부분을 덮고, PCFSoft는 매 픽셀 9~25탭을 뽑아 fill-rate 병목을 해상도에 비례해 +70.9% 가중시켰다.
미술관(`space-render`)은 셸 라이트맵 베이크라 이 경로가 아예 없고, world만 실시간 그림자를 썼다.
draw 87·tri 31.7k로 지오메트리는 저폴리인데도 9fps — 전형적 프래그먼트(픽셀) 병목 시그니처다.

**개선.** `web/js/world.js`에 `setShadowLite()`를 도입했다 — 저사양(lite) 진입 시
`renderer.shadowMap.enabled=false`로 그림자를 완전 제거해 섀도 패스 자체를 스킵하고, 고사양 복귀 시
`requestShadowBake`로 재베이크한다. 완전 제거(방식 b)는 디자이너 룩 판정을 거쳤다 — 캐스터가
소품(램프·벤치·플랜터·부두·등대)뿐이고 건물셸·나무는 `castShadow`가 없어, 제거해도 오브젝트가 붕뜨는
이질감이 없고 PCF 1탭 열화보다 오히려 자연스럽다. 고사양은 PCFSoft·1024 그대로 유지. lite 진입/복귀는
기존 `adaptQuality` 히스테리시스(24↔48fps·쿨다운)에 종속시켜 경계 플리커를 막았다. 미술관 경로 무접촉.

**결과.** 독립 executor 스모크 6/6+A~E 통과, 검수관 무조건 승인(강등/복귀 로직·재베이크 정확·플리커
없음·고사양 회귀 0·미술관 무영향을 코드로 확정). 실 저사양 fps 개선의 최종 확정은 감독 실기기
재스크린샷이다.

**교훈.** 오픈월드가 미술관과 달리 라이트맵 베이크 없이 실시간 그림자를 써 무거웠다. `shadowMap.autoUpdate=false`로
그림자맵 "생성"을 베이크로 돌려도 PCFSoft "샘플링"은 매 프레임 상시 프래그먼트 비용이다 — 저사양은
샘플링 자체를 꺼야 한다. 헤드리스(swiftshader)는 fill-rate 병목을 재현하지 못하므로 실기기 계측이 최종
확정 경로다.

---

## 2026-07-23 · 모바일 성능 처방 A+B — spec high·lite ON·px 2.25 충돌 하드가드 + 초기 슈퍼샘플 상한

**원인.** 감독 실기기 HUD(`?debug=perf`) 스크린샷으로 원인을 확정했다 — index(미술관) 모바일에서
**spec high·lite ON·pixelRatio 2.25가 동시에 성립하는 충돌 버그**였다. 저사양 모드(lite)에 진입했는데도
슈퍼샘플 배율이 유지된 것. 구 lite 하한 산식 `max(1, dpr*0.75)`가 아이폰 dpr3에서 2.25로 계산되어,
lite가 spec high가 세팅한 pixelRatio를 못 덮었다. draw 142·tri 59.5k로 지오메트리는 적은데 저FPS —
전형적 픽셀(fill-rate) 병목이다. 헤드리스 4회 측정이 못 잡은 실기기 GPU fill-rate 병목으로, spec 학습값
(localStorage)과 실시간 lite가 pixelRatio를 두 축에서 다투며 하한 산식이 어긋난 결과였다.

**개선.** 3파일(`web/js/main.js`·`main-spec.ts`·`main-perf.ts`)에 `MOBILE_PX_CAP=1.5`를 SSOT 상수로
도입했다. (B) 모바일(`pointer: coarse`) 초기 렌더러 배율에 상한 1.5 적용 — `min(계산값, MOBILE_PX_CAP)`.
(A) lite 진입 시 하드가드로 spec 학습값과 무관하게 pixelRatio ≤1.5 강제 — 기존 `dpr*0.75` 하한이
고DPR 폰에서 캡을 무력화하던 경로를 차단. 추가로 모바일에서 spec 'high' 승급과 샤프닝을 차단해 lite
exit 후 배율이 2.x로 다시 기어오르는 재상승도 막았다. 데스크톱(`pointer: fine`)은 전 경로 무변화 —
캡을 타지 않아 화질 그대로.

**결과.** 헤드리스 vitest 통과(모바일 high+lite 강제 시 px 2.25→1.5 하향, 데스크톱 dpr1→1.0·레티나
dpr2→1.5 기존 동치로 회귀 0, 모바일 high 미기록), 독립 executor 스모크 6/6+A~D, 검수관 승인(하드가드·
lite exit 재상승 방지·데스크톱 회귀 0 코드 확인). 레퍼런스 정합(hyperfy DPR-first). 실 FPS 개선의 최종
확정은 감독 실기기 재스크린샷이다.

**교훈.** 헤드리스(swiftshader)는 GPU fill-rate 병목을 원천 재현하지 못한다 — 실기기 계측 HUD가 원인
확정의 유일 경로였다. spec 학습(localStorage)과 실시간 lite가 pixelRatio를 두 축에서 다투면 하한 산식이
어긋나 저사양인데 슈퍼샘플이 남는다. 캡은 두 축 모두에서 SSOT 상수 하나로 강제해야 한다.

---

## 2026-07-22 · 실기기 성능 계측 HUD(?debug=perf) — 헤드리스 무회귀 수렴의 한계를 실측으로 뚫는다

**원인.** 감독이 실기기에서 버벅임을 제보했다 — index 걷기, world 오픈월드 진입 즉시, builder 로드
구간. 원인 확정을 위해 헤드리스로 4회 측정(저사양·고사양·world·세 페이지 base 정정 `ab60080`)했으나
**전부 리팩토링 무회귀로 수렴**했다. swiftshader 소프트웨어 렌더러는 실기기 GPU 병목과 열 스로틀을
재현하지 못하는 것이 원천 한계 — 렌더 산술·드로우콜·텍스처힙이 변경 전후로 동치여도 실기기 체감은
다를 수 있다. 원인 확정에는 실기기 실수치가 필요하다.

**개선.** `?debug=perf` 게이트로만 켜지는 임시 디버그 HUD(`web/js/debug-perf.js`, 가산형 독립 모듈)를
3진입점(index·world·builder)에 붙였다. FPS(최상단 대형·worst·min)·spec·pixelRatio·lite·드로우콜·
삼각형·텍스처힙을 실기기 화면에 직접 표출한다. 훅은 최소 침습 — `main.js` 1줄·`main-perf.ts` getLite
1줄·world-boot/builder 각 1줄. 플래그 off 시 동적 import가 실행되지 않아 정적 참조 0·네트워크 0(라이브
무영향). + 레퍼런스 분석가(🧭) 상설 역할 신설 — `REFERENCES.md` 4종 지식베이스(hyperfy·Hubs·
Decentraland SDK7·Catalyst)에서 성능 처방 5순위·백엔드 3단계를 도출.

**결과.** 스모크 6/6+A~D, 검수관 승인(off 무영향·보호 런타임 무변경·CSP 빌드 재현 실증). 배포 후
감독 실기기 스크린샷으로 원인을 확정할 예정.

**교훈.** 헤드리스(swiftshader)는 실 GPU 병목·열 스로틀을 원천 재현하지 못한다 — 렌더 산술·드로우콜·
텍스처가 두 지점에서 동치여도 실기기 체감은 다를 수 있어, 실기기 계측 HUD가 유일한 확정 경로다. 그리고
회귀 의심 시 측정 base는 반드시 "진짜 변경 전"(공유 모듈 분해 전 `ab60080`)으로 잡아야 한다 —
`2598e64`는 이미 분해 후라 회귀를 못 잡았다.

---

## 2026-07-22 · P1-⑤ 가변폰트 서브셋 — 첫 방문 폰트 페이로드 1.16MB → 60KB (-95%)

**원인.** 9축 성능점검 톱1 = 첫 방문 폰트 페이로드. Pretendard 6웨이트 개별 woff2 합 1.16MB인데,
각 파일 cmap을 실측하니 **87%(2,350자)가 한글 음절**이었다. 그러나 폰트 정책상 한글은 NanumGothic이
unicode-range로 우선 렌더하므로 Pretendard의 한글 글리프는 **스택상 도달 불가한 죽은 글리프** — 1.16MB의
대부분이 실제로 화면에 한 번도 안 쓰이는 자산이었다.

**개선.** 공식 PretendardVariable(1.3.9, npm 배포·OFL)을 한글 5블록 제외 **비한글 311자**(라틴·숫자·
구두점·통화)로 pyftsubset + **fvar 가변축(wght 45–930) 보존** → 1파일(60,056 bytes). `fonts.css`
@font-face 6→1(`font-weight 45 930`·`display swap`·unicode-range 무명시). **C1 검증**: (구 6파일 cmap
합집합 − 한글 5블록) − 신규 서브셋 cmap = **공집합**(비한글 커버리지 손실 0). 나눔·폰트스택·JS 무변경.

**결과.** 1.16MB → 60,056 bytes(**-95%, −1.11MB**). 전/후 시각 스윕(landing·guide·about·웨이트
래더 300~800, 데스크톱+모바일): 300~700 픽셀 동일, 800만 진짜 렌더(라이브 미사용 잠재 개선), 한글 나눔
유지, 모바일 오버플로 0. THIRD-PARTY-NOTICES §5 갱신. 게이트 전량 통과(팀장 서명·디자이너 검수·executor
스모크 6/6+A~E·검수관 무조건 승인·감독 확인).

**교훈.** 서브셋 커버리지는 파일 cmap이 아니라 **"실제 렌더 스택"으로 판정한다** — 파일이 글리프를
실어도 스택 우선순위상 안 쓰이면 죽은 자산이다. 초기 추정(-60~70%)은 파일이 무엇을 담았는지만 봤고,
cmap 실측이 스택상 도달 불가 글리프를 드러내며 진짜 지렛대(**-95%**)를 열었다. 페이로드 최적화는 담긴
것이 아니라 도달하는 것을 센다.

---

## 2026-07-22 · P1-④ PR-2 — main-* 대형군 8개 @ts-nocheck 소거 · 13개 전량 완료

**원인.** P1-④ 2분할의 두 번째. PR-1(leaf 5)에 이어 게임루프 결합 대형군 8개(`main-photo`·`main-tour`·
`main-selfview`·`main-multiplayer`·`main-perf`·`main-viewfx`·`main-enterflow`·`main-gameloop`) — 라이브
미술관 런타임 전부(게임루프·P2P·셀프뷰·투어)에 걸침. PR-1 절차(dist diff 0·최소 인터페이스)를 적용하되
무변경 절대 우선.

**개선.** 8개 **전량 소거**(무리한 nocheck 잔존 0). three는 vendor js라 타입 정의가 없어 `THREE.Clock/
Vector3` 등을 **실제 호출 메서드만 담은 구조적 인터페이스**로 대체(값 사용은 그대로), ctx는 로컬 최소
인터페이스(`GameLoopCtx`·`MpInstance` 등), config는 `import type {Floor,FloorId}`(P1-③ export 재사용).
**런타임 무변경**: 지역 캐스팅(`as`·non-null `!`)만 — `clock!`·`onboardPos0!`은 대입 직후라 불변식 성립,
`getGalleryInfo()!`은 원본 truthy 패턴, `MpInstance`는 multiplayer.js 공개 멤버와 1:1.

**결과.** 게이트 통과 — 검수관 승인(**"런타임 토큰 무변경: 확인" 별도 명시**, 검수관 자체 재현
`diff -rq dist`=바이트 동일, 지역 캐스팅 각 지점 불변식 검증, 보호 .js·leaf·deploy 미접촉), 독립 스모크
(9/9 — dist diff 0, app/index·world 대형군 소비 콘솔0). test 146.

**★ P1-④ 완료 — main-* 13개(leaf 5 + 대형 8) 전량 @ts-nocheck 소거.** 9축 점검 P0 "타입 실효 29%"의
핵심 부채를 신규 코드(4차 컨트롤러)부터 닫았다. @ts-expect-error 1곳(main-photo 썸네일 getContext null
가드 부재 — 진짜 결함, 로직 무변경 유예 후 후속 티켓 #105) 외 클린.

**교훈.** 라이브 런타임 전부에 걸친 대형 strict화도 **dist diff 0이 무변경의 유일·최종 심판**이다 —
검수관이 스모크 보고를 신뢰만 하지 않고 자체 재현한 것이 §10 구현자≠검증자의 실천이다. 그리고
vendor(타입 없는) three는 `@types/three`를 끌어오는 대신 **실제 호출 메서드만 담은 구조적 인터페이스**로
타이핑하면 자기완결(외부 의존 0)을 지키며 strict를 통과한다. 진짜 결함은 로직으로 덮지 말고
@ts-expect-error+티켓으로 가시화한다(무변경 보증 > 전량 소거).

---

## 2026-07-22 · P1-④ PR-1 — main-* leaf군 5개 @ts-nocheck 소거 (팀장 2분할 승인)

**원인.** 9축 점검 P0 "@ts-nocheck 70%(실효 타입 29%)". main.js 4차 컨트롤러 13개가 전부 nocheck.
팀장 조건부 서명으로 **2분할**(PR-1 leaf군 5개 → PR-2 게임루프 결합 대형군 8개) — 1PR 수천 줄 diff가
교차리뷰를 형식화시켜 보호파일 준용 취지를 무너뜨리는 것 방지. PR-1이 검증 절차의 템플릿.

**개선.** leaf군 5개(`main-math`·`main-spec`·`main-gpu`·`main-photo-util`·`main-events`) @ts-nocheck
**전량 소거** + strict 타입. 순수 함수라 구조적 타입만으로 무결하게 닫힘(진짜 결함 0·@ts-expect-error 0).
`main-events`는 config/three 구상 타입에 의존하지 않는 **`EventsCtx` 최소 인터페이스**(실제 호출 멤버만)로
저결합 — PR-2 ctx 주입 모듈의 템플릿. **런타임 로직 1바이트 무변경**(타입 주석·interface만).

**결과.** 게이트 통과 — 검수관 승인(**팀장 조건4 "런타임 토큰 무변경: 확인" 별도 명시** — diff가
@ts-nocheck 제거·타입 주석·interface뿐, 실행 토큰 0변경·`as` 캐스팅 0·결함 우회 0, EventsCtx 18멤버가
main.js eventsCtx 리터럴과 정확 일치), 독립 스모크(9/9 — **dist `diff -r` = 0**[청크 해시까지 base와 동일],
app/index·world 콘솔0). 대형군 8개·보호 .js 미접촉, test 146.

**교훈.** @ts-nocheck 소거의 무변경 증명은 config.ts와 같은 **dist diff 0**이 최종 심판이다(청크 해시까지
동일 = esbuild가 타입을 전량 스트립). 그리고 ctx 주입 계약은 config interface를 `import type`으로 끌어오기
보다 **실제 호출 멤버만 담은 로컬 최소 인터페이스**가 결합도가 낮다(main-events의 EventsCtx). 대형군(PR-2)은
구상 타입 의존·재대입 let·null 위험이 있어 이 절차가 그대로 안 통할 수 있으니, 로직 수정 대신
@ts-expect-error/nocheck 잔존을 택해 무변경을 절대 우선한다.

---

## 2026-07-22 · P1-③ 보호4파일 첫 TS 전환 — config.js → config.ts (팀장 서명)

**원인.** 9축 점검 P1. 보호4파일(main·player·artworks·config .js)이 tsc·no-undef·eslint 3중 정적
사각. 그중 **로직 0·순수 상수뿐인 config.js(72줄)**가 가장 안전한 진입점 — 게이트 파이프라인을 검증하며
보호파일에 첫발. 팀장 사전서명(risk-op-gate 5항) + 조건 3개 하 승인.

**개선.** config.js → **config.ts**(git rename). 팀장 조건대로 **interface 명시 타입**(`as const` 금지):
`Room`·`Floor`·`Stair`·`SlabHole`·`ArtworkSlot`·`Spawn`·`Building` + `FloorId`('b1'|'f1'|'f2'|'roof')
유니온을 export — P1-④(main-* 컨트롤러 타입화)가 import할 참조 기반. FloorId를 Floor.id·slabHoles 키
(`Record<FloorId,SlabHole[]>`)·spawn.floor·artworkSlots[].floor에 일관 적용. **런타임 값·export 이름
1바이트 무변경**(타입 주석만, esbuild가 emit에서 제거). 소비자 **9곳**(player·main·multiplayer·world·
artworks·scene-assembly·scene-building·ui-hud·main-viewfx)은 `from './config.js'` 그대로 — vite
tsJsFallback이 .js→.ts 해소.

**결과.** 게이트 통과 — 검수관 승인(팀장 조건 3개 **전항 실증**: 상수 바이트 동일·`as const` 미사용, 
**tsJsFallback 9곳 해소 실증**[config.js 부재에서 build 성공·번들에 config 리터럴 인라인 grep], interface·
FloorId 일관 tsc 0), 독립 스모크(6/6 — **dist 전체 `diff -r` = 0**[base vs 브랜치 바이트 동일], app/index·
world BUILDING 소비 콘솔0). 다른 보호3파일 미접촉, test 146.

**교훈.** 보호4파일 전환의 안전 증명은 소스 diff가 아니라 **빌드 산출물 바이트 동일(`diff -r dist`)**이다 —
타입만 얹었으면 dist가 1바이트도 안 변해야 하고, 그게 상수 오타이핑까지 기계적으로 배제한다. 그리고
`.js`→`.ts` 전환에서 **소비자 무수정의 근거는 "설정에 있다"가 아니라 config.js를 지운 상태에서 실제
빌드가 성공하고 번들에 값이 박히는 것**까지 실증해야 한다(보호 런타임 파일이 그 해소에 걸려 있으므로).
가장 작은 보호파일로 이 파이프라인을 검증했으니, 더 큰 보호파일(#90)로 갈 발판이 섰다.

---

## 2026-07-22 · P1-② 보안 — CSP connect-src 축소 + valuation.yml 액션 SHA핀

**원인.** 9축 점검의 보안축(A 92) 권고 2건. ①미술관(index) CSP `connect-src 'self' https: wss:`가
과도(동일 P2P 쓰는 world.html은 `0.peerjs.com`만으로 타이트) ②valuation.yml 액션 가변태그(공급망 표면).
팀장 판정으로 5번 내부(CSP+SHA핀)는 1PR 허용(워크플로 파일이라 라이브 렌더 격리 무관).

**개선.** ①`web/index.html`의 CSP meta `connect-src`를 `'self' https://0.peerjs.com wss://0.peerjs.com`
로 축소(world.html과 문자열 동일). ②valuation.yml `checkout@v4`·`setup-node@v4`를 deploy.yml·ci.yml과
동일 SHA로 핀(v4.2.2·v4.4.0, 주석 병기). connect 정의는 소스 meta가 SSOT(vite reconcileHtmlCsp는
script-src만 재작성).

**결과.** 게이트 통과 — 검수관 승인(**connect 대상 전수: PeerJS 시그널링만·STUN/TURN은 WebRTC라 CSP
통제 밖·외부 이미지/영상은 img/media-src 관할·galleries fetch는 self·기타 connect API 0건 → 축소가 기능
차단 0**, dist 정합 실측, SHA핀 3워크플로 바이트 일치, 타 CSP 지시어 무변경), 독립 스모크(6/6 — app/index
CSP violation 0, dist index·world connect-src 동일, 콘솔0). 권고(비블로커): LU_PEER_OPTS 셀프호스팅 전환
시 connect-src 갱신(기존 패턴, world.html에도 경고).

**교훈.** CSP 축소는 "무엇을 막느냐"가 아니라 "정상 트래픽 전부를 여전히 허용하느냐"의 전수 증명이다 —
connect-src는 fetch/XHR/WS/EventSource/beacon만 통제하고 WebRTC ICE(STUN/TURN)·이미지(img-src)·비디오
(media-src)는 별도 지시어 관할임을 정확히 구분해야 광역 `https:`를 안전하게 좁힌다. 이미 타이트하게
라이브 동작 중인 대조군(world.html)이 있으면 그게 검증된 정답값이다.

---

## 2026-07-22 · P1-① 접근성 — skip-link + landmark (9축 점검 후속)

**원인.** 9축 종합 점검에서 접근성(C+)의 [중] 결함으로 "skip-link 전 페이지 부재·landmark role 부재"가
지목. 감독이 P1 착수를 지시("무섭다·팀장 신중하게"), 팀장 판정으로 리스크 오름차순 전건 분할 게이트 확정 →
최저위험인 skip-link부터.

**개선.** 라이브 정적 4페이지(landing·guide·about·studio)에 skip-link("본문 바로가기")+`<main id="main">`
landmark+최소 focus-visible. skip-link는 평소 `translateY(-120%)`(화면 밖)·`:focus`에만 노출, 각 페이지
기존 팔레트 B 토큰 재사용(새 색값 0). **기존 `<main>`엔 id만 부여**(landing만 신규 main으로 section 5개
래핑)해 태그 셀렉터 무영향. 3D 미술관(index)은 canvas 전용이라 삽입점 없어 제외. **인라인 script 0**(CSP
무영향).

**결과.** 게이트 통과 — 검수관 승인(레이아웃 회귀 0·중복 landmark 0·깨진 앵커 0·CSP 영향 0·index 제외
타당), 독립 스모크(9/9 — dist CSP violation 0·skip-link 4페이지 포커스 노출·`#main` 점프·가로넘침 0).
about `.essay-cta`가 main 밖에 남은 것은 최소범위 절충으로 후속 P1 티켓.

**교훈.** 접근성 시맨틱 보강은 "기존 시각 1픽셀도 안 바꾸고 의미(landmark)만 얹는다"가 관건 — 기존 `<main>`엔
id만, 신규 래핑은 태그 셀렉터·인접형제 콤비네이터에 안 걸리는 곳만 확인 후. skip-link는 sr-only가 아니라
포커스 시 노출이 정답(키보드 사용자에게만 보이되 실재).

---

## 2026-07-22 · C-1 후속 — ui-hud.ts strict화 (@ts-nocheck 소거 착수)

**원인.** 9축 종합 점검에서 "TS 전환했으나 @ts-nocheck 70%(실효 타입 커버 ~29%)"가 아키텍처 약점으로
지목됐다. 그 소거의 첫 실착수로 초대형 HUD 모듈 ui-hud.ts(1,611줄)를 strict화.

**개선.** @ts-nocheck 제거, 타입오류 182개 → 0. **런타임 로직 1바이트 무변경**이 원칙 — 추가한 것은
타입 주석·지역 캐스팅(`as HTMLInputElement` 등)·콜백 인터페이스(`UICallback`/`TourHandler`/
`ActionHandler`)·null 가드 1건뿐. 2단계 커밋(타입 인프라 → getItem null 방어+@ts-nocheck 제거). 
**el()(ui-dom.ts) 시그니처는 무수정** — 제네릭화하면 소비자 파급이 나므로 ui-hud 지역 캐스팅으로만
닫아 파급 0. 편집기(ui-avatar-editor)는 이미 strict 통과·순수로직 chibi.ts 커버라 제외.

**결과.** 게이트 통과 — 검수관 승인(런타임 로직 무변경 라인 대조·null 가드 동치[`parseFloat(null)`=
`parseFloat('')`=NaN·`Number.isFinite`로 동일 소거]·export 표면 34개 불변·el() 무수정), 독립 스모크
(vitest 146·tsc 0·check:refs 0·smoke 9항·app/index·world HUD 초기화 콘솔0). 라이브 HUD 무회귀.

**교훈.** strict화의 핵심은 "타입만 바뀌고 런타임은 1바이트도 안 바뀜"의 증명이다 — diff가 타입 주석·
캐스팅·null 가드로만 구성됨을 라인 대조하고, null 가드는 기존 동작과 동치임을 각 지점 논증한다.
공유 헬퍼(el())를 제네릭화해 소비자로 파급을 내기보다, 소비 지점 지역 캐스팅으로 파급을 0으로 가둔다.
(남은 @ts-nocheck 33개 중 main-* 13개가 P1 다음 소거 대상.)

---

## 2026-07-22 · 안전망 강화 — no-undef 정적검사 상시 게이트화 (#94 · R2·R5)

**원인.** #87(QA 안전망) 검수관 권고 R2·R5. 3·4차 분해 내내 @ts-nocheck 모듈의 "끊긴 참조"(export
누락 → 런타임 ReferenceError, C-3(2) chibi 사건의 근본 원인)를 **수동 no-undef 스코프 검사**로 잡아왔다.
tsc(checkJs·@ts-nocheck)·eslint(.js는 no-undef:off) 정적 게이트의 사각이라, 이를 자동 상시 게이트로 승격.

**개선.** (R2) `scripts/smoke/check-refs.mjs` — @ts-nocheck/eslint-disable 억제 지시어를 **벗긴 메모리
사본**으로 TS 프로그램을 만들어 TS2304(이름 미해결)류만 추출. 새 의존성 0(기존 typescript 재사용).
스모크 6항의 [0] 참조무결성 + CI 스텝(typecheck 다음·vitest 이전)으로 상시 편입. (R5) 순수함수 테스트
보강(main-math 14 + chibi-schema 12 → vitest 120→**146**). (R1) 별도 렌더 하네스는 목적(끊긴 참조
크래시 방지)을 no-undef 검사 + 헤드리스 실부팅이 이미 커버해 보류. **라이브 미술관 코드 무수정**(변경은
tests·scripts/smoke·package.json·ci.yml 6파일).

**결과.** 게이트 통과 — 검수관 승인(**회귀 유도 실험으로 검출력 실증**: chibi-face의 NONHUMAN import
제거 시 TS2304 정확 검출·오타 시 TS2552 검출·@ts-nocheck 억제 해제 실동작, false positive 0 — window·
THREE 오탐 없음, 테스트 경계값 소스 대조로 껍데기 아님 확인), 독립 스모크(9/0 — 정상 0·음성대조 2건
검출). deploy.yml 무변경(라이브 배포 경로 불변).

**교훈.** `@ts-nocheck`는 tsc·eslint 정적 게이트를 통째로 무력화하는 사각이다 — 분해에서 옮긴 모듈이
export 하나 빠뜨리면 빌드·타입체크·린트 다 통과하고 런타임에서만 죽는다(chibi 사건). 억제 지시어를
**벗긴 사본으로 재검사**하는 이 하네스가 그 사각을 정적으로 닫았고, 수동으로 반복하던 게이트가 CI·스모크
자동화로 승격됐다. (남은 사각: `.js` 모듈은 여전히 no-undef:off — 별도 후속 #100.)

---

## 2026-07-22 · C단계 후속 — 분해 게이트 비블로커 권고 2건 정리

**원인.** 3·4차 분해 게이트에서 검수관이 남긴 비블로커 권고 2건(동작 동일성 리팩터 범위 밖이라 그때는
분리 보류). 완주 후 정리.

**개선.** ① **투어 tick 유닛테스트**(`tests/main-tour.test.js`, 4케이스): 자동진행 판정식의 4분기 —
정상 누적→next, 트윈 진행 중 미누적, 라이트박스 열림 미누적, 대기 아님 미누적 — 을 mock ctx로 검증
(vitest 116→**120**). ② **EnterFlow recordVisit 방어 가드**: `stats.addVisit(id)`→`stats?.addVisit(id)`.
정상 경로(connect 성공→stats 생성 후에만 onVisitor 발생)에선 옵셔널 체이닝이 일반 호출과 1바이트 동치,
connect 실패(혼자 관람·stats=null)에서 콜백이 이론상 도달해도 무해 no-op(방어 심층). stats 소유가 4차
C군에서 EnterFlow로 이전됐으므로 가드 위치도 recordVisit이 정확.

**결과.** 스모크 6/6 + vitest 120 통과, 입장·투어 정상 회귀 없음. 라이브 코드 변경은 recordVisit 1줄뿐,
main.js·게임루프·기타 무수정.

**교훈.** 방어 가드는 "정상 경로 1바이트 동치 + 비정상 경로만 무해화"가 성립할 때만 동작 동일성을 지키며
심층 방어가 된다. 단 null을 조용히 삼키는 트레이드오프(실버그 진단 지연 가능)를 주석에 명시해 뒀다.

---

## 2026-07-22 · ★ C단계 C-4(D) — main.js 4차 게임루프(GameLoop) 분리 · 4차 완결(Composition Root)

**원인.** 4차 마지막이자 심장 단위. `animate` 게임루프 전체(포테이토 프레임 캡·11개 위임 tick·근접 작품
안내·render 분기·try/catch 오류복구·setAnimationLoop 등록)를 옮긴다. 팀장 순서 원칙대로 A·B·C를 먼저
착지시킨 뒤 최후에 밟았다 — animate가 이미 "위임 tick 나열 + render 분기 + try/catch"인 얇은 껍데기라
이관이 기계적 이동에 가까워졌다(A·B·C가 D의 안전판이 된다는 팀장 판단의 실현).

**개선.** `main-gameloop.ts`(`createGameLoop(ctx)` → `{ start }`)로 분리(main.js 919→**867**). 
- **프레임 상태 소유**: `clock`(THREE.Clock)·`potatoAccum`을 GameLoop가 소유(루프 밖 참조 0 → 캡슐화만
  개선). `start()`가 `clock=new Clock()` 후 `renderer.setAnimationLoop(loop)` 등록.
- **ctx 전량 값 주입**: 안정 참조(renderer·scene·camera·player·gpuInfo) + 위임 컨트롤러 6개(fly·tour·
  mp·selfview·viewfx·perf) + UI 함수 — **전부 값**. 근거: 전부 init에서 gameLoop 생성 **전에 1회 대입
  완료·재대입 없음**(grep 전수 확인). 프레임당 getter 0·신규 객체 할당 0.
- **animate→loop 1바이트 동치**: 함수 본문을 공백 제거 후 diff → 함수명 외 **0바이트 차**. tick 순서·
  render 3연속 원자성·try/catch 3연속·포테이토 early-return 전부 verbatim.

**결과.** 게이트 통과 — 검수관 승인(diff 1바이트 동치·**클로저 캡처 stale 없음**·setAnimationLoop 등록/
해제 타이밍·clock 순서·render 원자성 전부 확인, **실제 vite build로 산출물에 setAnimationLoop 2회·
animate 0회 검증**, 블로커 0), 독립 스모크(6/6 — **setAnimationLoop 등록→렌더 루프 실동작**, swiftshader
포테이토 캡 경로 자동 진입, 위임 tick·try/catch 정상). 보호4파일·CSP·index.html 무수정, test 116/116.

**교훈.** 게임루프(심장) 이전의 유일한 새 위험은 render/setAnimationLoop 경계와 **클로저 캡처**다. "안정
참조 값 주입"이 성립하려면 "루프 생성 전 모든 참조가 1회 대입 완료"라는 불변식을 grep으로 **증명**해야
한다(하나라도 뒤에 재대입되면 stale). 그리고 심장의 동작 동일성 증명은 소스 diff 0에 그치지 않고 **실제
빌드 산출물에서 setAnimationLoop 호출 횟수까지 세어** 확인했다 — 심장일수록 증명의 층을 더 쌓는다.

### ★ main.js 분해 4단계 완결 — 1,418 → 867줄 (-551, -38.9%)
- **1차** 순수 유틸 leaf(main-math·spec·gpu·photo-util) → **2차** DOM 이벤트 핸들러(main-events) →
  **3차** 기능 컨트롤러 4군(photo·tour·selfview·multiplayer) → **4차** Composition Root(perf·viewfx·
  enterflow·gameloop).
- main.js는 이제 **순수 조립점**에 근접: 컨트롤러 생성 + ctx 배선 + init 부트스트랩(렌더러·씬·await
  로드) + `gameLoop.start()` + `init().catch()`. 게임루프·기능·성능·입장·뷰보조가 전부 독립 모듈로,
  서로를 모른 채 조립점(main.js)이 getter/값으로 중재한다.
- 전 과정 매 단위 검수관 승인 + 독립 스모크 통과, 보호4파일(player·artworks·config)·CSP·자기완결
  규율 무완화, test 116/116 불변, 라이브 미술관 무중단. 감독 로드맵(SOLID/아키텍처 축) 완주.

---

## 2026-07-22 · C단계 C-4(C) — main.js 4차 입장 세션 셋업(EnterFlow) 분리

**원인.** 4차 세 번째 단위(C). `handleEnter`의 입장 세션 셋업 — roomSuffix 산출·전시 통계(GalleryStats)
생성·2초 dwell 타이머·원격 방문 기록. 게임루프가 아니라 입장 도메인이라 D(심장) 전 저리스크 단계.

**개선.** `main-enterflow.ts`(`createEnterFlow(ctx)`)로 분리(main.js 918→919, **응집 목적이라 라인 +1**).
- **stats 소유 이전**: 참조처 전수 grep 결과 **2곳뿐**(handleEnter 생성+dwellTimer / mpCtx.onVisitor의
  addVisit)이고 위임면이 좁아 EnterFlow가 SSOT로 소유. onVisitor는 콜백 본체(visitorLog.add)는 main
  잔류하고 stats 부분만 `recordVisit` 1개로 위임. (3차 myNickname은 4개 도메인이 읽어 **잔류**했던 것과
  대비 — 소유 이전 판단은 "참조처 위임면의 넓이"로 갈린다.)
- **메서드**: `computeRoomSuffix`(gallery id ∨ djb2 hash — connect roomId·stats 키 공유)·`begin`(stats+
  dwell 타이머, connect 성공 후)·`recordVisit`(onVisitor 위임).
- **handleEnter 잔류**: entered·player.enable·connect·startAmbient·startOnboarding. entered는 게임루프·
  hitTap·floor 다수 게이트가 읽는 전역이자 입장 진입 계약이라 조립점에 남긴다. ambient/onboarding을
  옮기면 EnterFlow가 두 도메인을 더 알게 돼 God 경향 → 잔류.
- **입장 순서 1바이트 보존**: myNickname→selfInfo→entered→hideLobby→player.enable→ambient→onboarding→
  computeRoomSuffix→connect→(실패 시 return)→begin. connect 실패(혼자 관람) 시 begin 미호출로 stats/
  timer 미생성·onVisitor 미발생 → 원본 try/catch와 동치.

**결과.** 게이트 통과 — 검수관 승인(stats 재배선 누락0·입장 순서 동치·connect 실패 경로·dwellTimer
verbatim·**게임루프 무수정**, 블로커 0), 독립 스모크(6/6 — computeRoomSuffix·connect 실패 혼자관람·
begin/dwell 콘솔0). **recordVisit는 P2P 연결 후에만 발생해 헤드리스 단독 사각 → verbatim 논증 의존**.
보호4파일·main-multiplayer.ts·CSP·animate 무수정, test 116/116.

**교훈.** 상태 소유 이전 vs 잔류는 **참조처 위임면의 넓이**가 가른다 — stats처럼 참조처 2곳·위임면 좁으면
이전이 응집을 늘리고, myNickname처럼 다수 도메인이 읽으면 잔류가 결합을 줄인다. 기계적으로 "다 옮긴다"가
아니라 케이스별로 저울질한다.

### 4차 로드맵 진척 (A→B→C 완료, D 최후 남음)
A(PerfGovernor)·B(ViewFx)·C(EnterFlow) 배포 완료. main.js 1,418→919(-35%). 남은 **D(GameLoop 골격 +
잔여 포테이토캡·근접안내 흡수)**는 render 분기·setAnimationLoop·try/catch 오류복구 경계를 다루는 심장·최후
단위 — 팀장 지정 회귀 위험점(setAnimationLoop 등록/해제·오류복구 setStatus)을 검증에 명시해 진행 예정.

---

## 2026-07-22 · C단계 C-4(B) — main.js 4차 카메라 뷰 보조(트윈·온보딩·층안내) 분리

**원인.** 4차 두 번째 단위(B). 게임루프에 흩어진 카메라 뷰 보조 3종 — 트윈(텔레포트/투어 보간)·
층안내(camera.y 판정)·온보딩(터치 힌트). A(PerfGovernor)와 달리 **`tween`이 이미 배포된 tour
컨트롤러와 얽혀** 있다(tour가 getTween/clearTween/startTween을 ctx로 사용) — 셀프뷰↔사진 때처럼
조립점 재배선이 필요.

**개선.** `main-viewfx.ts`(`createViewFx(ctx)`) 1모듈로 분리(main.js 1,033→918, **-115**). 판단:
- **1모듈 응집**: 세 도메인이 "카메라 뷰 보조" 공통결 + 상태가 서로 독립(데이터 의존 0)이라 God object가
  아니다. tour와 얽히는 건 트윈뿐이라 재배선면도 좁다.
- **개별 메서드 위임(단일 tick 아님)**: A군은 3블록이 게임루프에 **연속**이라 tick 하나로 몰았지만,
  B군은 세 항목이 게임루프에 **흩어져**(updateTween=물리 뒤·tour.tick 앞 / updateFloorIndicator / 
  tickOnboarding) 있다. 원문 위치를 1바이트 보존하려 `updateTween`/`updateFloorIndicator`/`tickOnboarding`
  개별 메서드로 노출 — 무리하게 하나로 묶으면 프레임 내 실행 순서가 바뀐다.
- **tween 소유 일원화 + tour 재배선**: tween을 viewfx가 단독 소유하고, tourCtx의 getTween·clearTween·
  startTween을 `()=>viewfxController.<메서드>()`로 재배선. tour tick의 `!getTween()`과 exitTour의
  clearTween이 **동일 tween 인스턴스**를 viewfx 경유로 공유(인스턴스가 갈리면 자동진행 영구대기 회귀).
  **main-tour.ts 무수정**(0바이트 diff 확인).

**결과.** 게이트 통과 — 검수관 승인(상태 이전·tour 재배선 단일참조·startTween 호출처 누락0·게임루프
순서 1바이트 동치·render 골격 무변경·tick verbatim, 블로커 0), 독립 스모크(6/6 — 트윈·투어 자동진행·
exitTour 즉시정지·층안내 콘솔0). **온보딩은 pointer:coarse 터치 전용이라 헤드리스 검증 사각 → verbatim
이식 논증 + 검수관 코드 동치 대조로 방어**(실기기 QA는 후속). 보호4파일·main-tour.ts·CSP 무수정, test 116/116.

**교훈.** "tick 위임"의 형태는 원본 게임루프 구조가 정한다 — 연속 블록은 단일 tick, 흩어진 항목은
개별 메서드다. 하나로 묶으면 깔끔해 보이나 프레임 내 실행 순서가 바뀌어 회귀한다. 그리고 공유 상태
(tween)는 소유를 한 곳에 두고 다른 컨트롤러는 조립점 재배선으로 **같은 인스턴스**를 공유해야 한다 —
값을 복제하면 상태가 갈린다.

---

## 2026-07-22 · C단계 C-4(A) — main.js 4차 착수: 성능/렌더 거버너(PerfGovernor) 분리

**원인.** 4차(Composition Root化) 착수. 감독이 "게임루프까지 완주"를 선택하되 "심장이라 위험하니
설계 먼저·팀장과 수시 상의"를 지시. 부팀장 설계 감사 + 팀장 판정으로 **분해 순서 A→B→C→D 고정,
D(게임루프 골격·render 경계)는 최후, A·B가 D의 안전판** 원칙 확정. 가장 안전한 첫 발이 A(PerfGovernor):
게임루프에서 가장 크고 얽힌 덩어리이나 **render 타이밍과 독립**이고 상태가 자기완결이라 리스크 최저·실익 최대.

**개선.** `main-perf.ts`(`createPerfGovernor(ctx)`)로 분리(main.js 1,108→1,033, **-75**). 게임루프
3블록(#13 FPS집계·lite 히스테리시스·spec 학습·pixelRatio 라이브조정, #14 NPC컬링, #15 섀도 재베이크)을
`perfGovernor.tick(delta)` 한 줄로 위임. 핵심:
- **상태 SSOT 이전 9개**: liteMode·liteToggleCooldown·liteCullAccum·shadowRebakeInterval·
  shadowRebakeAccum·shadowWarmupDone·specFastTicks·fpsFrames·fpsElapsed. `applyNpcCulling`도 이전
  (외부 호출처 0 → 미노출).
- **안정 참조 값 주입**(부팀장 감사 핵심): renderer·camera·gpuInfo는 init에서 1회 대입 후 재대입이
  없어 **값으로** 주입 → 프레임당 getter 오버헤드 0. 동적(entered·mp)만 getter. 3차가 재대입 방지용
  getter를 쓴 것과 달리, 여기선 안정 참조라 값이 더 옳다.
- **tick 1바이트 동치**: lite 임계(ENTER24/EXIT45·쿨다운10s·fps<16→writeSpec('low')·pixelRatio dpr
  하한)·spec 승급(specFastTicks≥20·>55fps·low→null→high·+0.25 샤프닝·!gpuInfo.soft)·컬링(2초·거리정렬·
  상위3)·섀도(재베이크+입장1회 warmup) 전부 조건·순서·부작용 동일. **render 분기(#16)·setAnimationLoop·
  try/catch는 1바이트도 안 건드림**(팀장 조건: D 착수 전까지 render 골격 무수정).
- **entered 1회 캡처**: tick 진입 시 `const entered = isEntered()` — entered는 handleEnter에서만
  동기 전환되고 프레임 실행 중 비동기 변경이 없어 원본(블록마다 재읽기)과 동치.

**결과.** 게이트 통과 — 검수관 승인(상태 이전·tick 동치·entered 캡처·gpuInfo 주입·**render 골격
무변경**·setShadowInterval 결선 전부 통과, 블로커 0), 독립 스모크(6/6 — **swiftshader 저FPS(~4fps)라
오히려 lite 강등/승급·컬링·섀도·writeSpec·setPixelRatio 경로를 실제로 밟고 콘솔0**). 보호4파일·CSP·
index.html 무수정, test 116/116.

**교훈.** 3차 컨트롤러는 "재대입 stale 방지"로 getter를 썼지만, 게임루프가 매 프레임 참조하는
renderer·camera·gpuInfo는 init 1회 대입 후 불변이라 **값 주입이 프레임당 오버헤드도 없고 더 정확**하다
— "무조건 getter"가 아니라 재대입 여부로 판단한다. 그리고 4차는 게임루프를 처음 건드리는 단계라,
**A는 render를 1바이트도 안 건드린다는 선을 명시적 게이트로 세워** 심장(D)과 그 주변(A)을 분리했다.

### 4차 로드맵 (A→B→C→D, D 최후·A·B 안전판)
**A. PerfGovernor(완료)** → B. 트윈·온보딩·층안내 → C. 입장 EnterFlow → D. GameLoop 골격(render·
setAnimationLoop, 심장·최후). A·B 착지 후 animate 잔여가 "얇은 오케스트레이터" 예상과 다르면 팀장 재상신.

---

## 2026-07-22 · C단계 C-3(9) — main.js 3차 멀티플레이어 컨트롤러 (P2P 오케스트레이션 · 3차 완결)

**원인.** 3차 마지막이자 최고위험 군(P2P). 비동기·네트워크·다인 상태라 **헤드리스 스모크로 2인 세션을
재현할 수 없다** — 검증 커버리지가 구조적으로 낮다. `mp`(MultiplayerManager)는 입장(enter) 흐름에서
생성되고 콜백 9종이 배선돼, 입장 로직과 깊게 얽혀 있다. 검증이 약한 만큼 **정적 정확성을 유일 방어선**으로.

**개선.** `main-multiplayer.ts`(`createMultiplayerController(ctx)`)로 오케스트레이션만 분리(main.js
1,104→1,108, **격리가 목적이라 라인은 +4**). 핵심:
- **상태 이전**: `mp`·`guestbookSentOnce`(연결 생명주기 전용)를 컨트롤러 소유. **`myNickname`은 main.js
  잔류** — 이전된 콜백 9종이 하나도 myNickname을 안 쓰고(닉네임은 connect opts로 전달), 채팅·방명록·
  사진 4개 도메인이 쓰므로 컨트롤러로 끌면 결합만 증가. SSOT를 쓰는 쪽(main.js)에 둔다.
- **입장 로직 경계 엄수**: 입장 핵심(selfInfo·player.enable·hideLobby·startAmbient·stats)은 남기고,
  `connect()`·9개 콜백 배선·`mp.connect()`·게임루프 `tick`(sendState+update)만 이전. handleEnter는
  `connect()`를 **호출만** 하고 실패(false) 시 원본 try/catch와 동일하게 stats/timer 미생성.
- **콜백 재배선 누락 0**: onVisitor·onPhoto·onChat·onPlayerCount·onStatus·onGuestbook·onSelfHit·
  onNpcHit·npcProvider 9종을 **원본 대비 1:1 체크리스트로 대조**(문자열 하나 안 바뀜). 조립점 재배선
  (photoCtx·eventsCtx의 `getMp`)으로 main-photo.ts·main-events.ts **무수정**.
- **mp=null 가드 7곳 보존**: 입장 전 tick·beforeunload·sendPhoto·applyNpcCulling·resolveBodyCollisions
  전부 no-op. tick은 `if(!mp) return`.

**결과.** 게이트 통과 — 검수관 **승인**(콜백 9종 누락0·null 가드 7곳 정합·myNickname 판단 타당·두 파일
무수정·계약 보존, 블로커 0), 독립 스모크(**8항**, mp=null 게임루프 안전·입장/connect 경로 크래시0·
PeerJS 콘솔error0). player/artworks/config.js·main-photo.ts·main-events.ts·index.html·CSP 무수정,
test 116/116. **3차(위험도별 분할) 4군 완결.**

**교훈.** 검증이 약한 도메인일수록 정적 정확성이 유일한 방어선이다 — 콜백 재배선은 "누락 0"을 **원본
대비 체크리스트로 증명**해야 한다(조용히 죽는 원격 기능이 최악). 그리고 초기화 순서가 코드상 뒤집혀도
(stats 생성 vs connect 호출) **비동기 특성으로 무해할 수 있으나, 그 판정은 실제 연결 코드까지 읽어야
확증된다** — 검수관이 `multiplayer.js`의 onVisitor가 PeerJS `data` 핸들러(반드시 비동기)임을 소스로
확인해, 동기 발화로 stats=null을 참조할 경로가 원천 부재임을 증명하고 통과시켰다. "동작 동일성"의
증명은 리팩터한 파일이 아니라 그것이 부르는 곳까지 따라가야 완성된다.

### main.js 3차 분해 총괄 (원본 1,418 → 1,108줄, -310 / -22%)
순수유틸(1차) → 이벤트핸들러(2차) → **사진·투어·셀프뷰·멀티플레이어(3차 4군)**. 게임루프 결합 함수는
"위임 wrapper"가 아니라 **상태 소유권 이전 + tick 위임**으로, 컨트롤러 간 의존은 **조립점(main.js)이
getter로 중재**해 분리했다. 남은 4차는 main.js를 **초기화·조립(Composition Root)만** 남기는 단계.

---

## 2026-07-22 · C단계 C-3(8) — main.js 3차 셀프뷰 컨트롤러 (컨트롤러 간 의존을 조립점이 중재)

**원인.** 3차 세 번째 군(3인칭 자기시점). 게임루프 결합이 가장 깊다 — 아바타 위치·회전·`update`가
**매 프레임** 돌고, 이동속도를 EMA로 평활한다. 게다가 **이미 배포된 사진 컨트롤러**(main-photo.ts)가
셀프뷰 상태·함수 4개(`isThirdPerson`·`getSelfAvatar`·`applySelfCamOffset`·`restoreSelfCamOffset`)를
ctx로 쓰고 있어(3인칭 사진의 셀프캠 오프셋), 소유권을 옮기면 사진 컨트롤러 배선까지 흔든다.

**개선.** `main-selfview.ts`(`createSelfViewController(ctx)`)로 분리(main.js 1,158→1,104). 핵심:
- **상태 SSOT 이전**: `thirdPerson`·`selfAvatar`·`selfPrev`·`selfSpeed` + 셀프캠 상수 3개 +
  재사용 THREE 객체 3개(`_selfCamSaved`/`_selfCamBack`/`_selfCamQuatSaved`, 모듈 클로저 1회 생성).
  `selfSpeed`는 외부 주입이 아니라 **tick 내부에서 selfPrev 대비 프레임 이동거리로 자체 EMA 계산**
  → 완전 내부 상태라 컨트롤러가 소유. **tick 본문 내 THREE 신규 할당 0**(프레임 GC 압박 차단).
- **컨트롤러 간 의존은 조립점(main.js)이 중재**: photoCtx의 4개를 `()=>selfViewController.<메서드>()`로
  재배선 → 두 컨트롤러가 서로 직접 import하지 않고 main.js(Composition Root)가 getter로 연결.
  **main-photo.ts 자체는 무수정**(ctx 계약 동일). 4차 "조립만 남기기" 방향과 정합.
- **숨은 교차결합 4건**을 grep이 아니라 사용처 추적으로 발견·처리: `flyController`(비행 중 아바타),
  **`bindHitTap`의 때리기 레이캐스터 사거리**(3인칭 카메라 후퇴분 `SELF_CAM_DIST` 보정 — 명세 밖 결합),
  `onSelfHit`(null 가드), `handleAvatarChange`→`rebuildAvatar` 커맨드 위임.
- 읽기/쓰기 분리: 읽기는 getter(`isThirdPerson`/`getSelfAvatar`), 상수 단방향은 getter(`getSelfCamDist`),
  전체 생명주기 쓰기(생성·scene add/remove·dispose)는 **커맨드 메서드**(`rebuildAvatar`)로.

**결과.** 게이트 통과 — 검수관 **승인**(상태 이전·tick 동일성·photoCtx 재배선·숨은 결합 4건·초기화
순서 전부 통과, `SELF_CAM_DIST=3.0` 사거리 불변·`rebuildAvatar` dispose 순서 1:1 대응 확인, 블로커 0),
독립 스모크(**6/6 + 셀프뷰 3경로** 토글·3인칭이동·3인칭사진 콘솔0). player/artworks/config.js·
main-photo.ts·index.html·CSP 무수정, test 116/116.

**교훈.** 컨트롤러를 여럿 쪼갤 때 서로 직접 참조하게 두면 결합이 그물처럼 얽힌다 — **조립점 하나가
getter로 중재**하면 컨트롤러는 서로를 모른 채 독립적으로 검증·교체된다(Composition Root의 실익).
그리고 리팩터 범위는 **심볼 grep이 아니라 실제 사용처 추적**으로 잡아야 한다: 때리기 사거리가 3인칭
카메라 후퇴를 보정하던 숨은 결합은 `SELF_CAM_DIST` 참조를 따라가야만 드러났다.

---

## 2026-07-22 · C단계 C-3(7) — main.js 3차 투어 컨트롤러 (상태 소유권 이전 + 게임루프 tick 위임)

**원인.** 3차 두 번째 군(도슨트 투어). 사진 군(격리 단발함수)과 달리 투어는 **animate 게임루프에
매 프레임 결합**돼 있다(자동진행 판정 `tourStayElapsed += delta`). 감독 판단으로 남은 기능군(투어·
셀프뷰·멀티플레이어)이 전부 게임루프 결합임이 드러나, "읽기 getter + 위임 wrapper" 패턴이 통하지
않는다. 상태를 write하므로 **상태 소유권을 컨트롤러로 이전**하는 SOLID 정석으로 진행(감독 확정).

**개선.** `main-tour.ts`(`createTourController(ctx)`)로 투어를 분리(main.js 1,191→1,158). 핵심:
- **상태 SSOT 이전**: `touring`·`tourIndex`·`tourAutoOn`·`tourWaiting`·`tourStayElapsed` + 임계
  상수 `TOUR_STAY_SECONDS`를 main.js에서 **제거**하고 컨트롤러 클로저가 유일 소유. 외부는 `isTouring()`·
  `getIndex()` getter로만 조회 → main.js에 투어 상태 코드 참조 0(이중 상태 불가).
- **게임루프 tick 위임**: animate의 자동진행 블록을 `tourController.tick(delta)` 한 줄로 치환.
  판정식(`touring && tourWaiting && tourAutoOn && !getTween() && !isLightboxOpen()`)·delta 누적·
  임계·`next()` 호출 순서 **원본과 1바이트 동치**. `!tween`은 `getTween()` getter로 최신값 재조회
  (stale 방지), **tick 본문 내 객체·클로저 할당 0**(프레임 GC 압박 없음).
- **write 위임**: `exitTour`의 `tween=null` 즉시정지는 getter로 쓰기 불가 → `clearTween()` 함수 주입.
- **공통 경로 협조**: `handleArtworkSelect`의 투어 분기를 `syncOnSelect`(트윈 전 idx·대기 세팅)/
  `onArrive`(도착 콜백 tourBar+대기+카운트리셋)로 위임, startTween 전후 순서 원본 보존.
- exports/HUD 콜백(`onNext:tourNext` 등)은 wrapper 5개로 심볼·시그니처 무변경.

**결과.** 게이트 통과 — 검수관 **승인**(상태 이전 정확·tick 1바이트 동치·clearTween 클로저 정합·
handleArtworkSelect 전이 보존·exports 시그니처·초기화 순서 전부 통과, 블로커 0), 독립 스모크
(**6/6 + 투어 경로 7/7**, app/index·world 실렌더 콘솔0, tick 매 프레임·자동진행·exit·next/prev·
카드 동기화 크래시 0). player/artworks/config.js·index.html·CSP 무수정, test 116/116.

**교훈.** 게임루프 결합 함수의 분리는 "위임 wrapper"가 아니라 **상태 소유권 이전**이 정답이다 —
매 프레임 실행 코드를 컨트롤러 밖에 값 캡처로 두면 stale로 자동진행이 멈춘다. 두 규율을 못 박았다:
①tick 판정식은 원본과 **1바이트 동치**로 증명(게임루프 미묘한 조건 변화가 최악의 회귀). ②컨트롤러가
소유 못 하는 외부 상태(tween)의 **읽기는 getter·쓰기는 함수**로 명확히 나눈다(양방향을 getter 하나로
뭉개면 안 됨). "완전 위임" 리팩터답게 stale 주석(main.js:660 `touring`)도 amend로 정리했다.

---

## 2026-07-22 · C단계 C-3(6) — main.js 점진 분해 3차: 사진 컨트롤러 (위험도별 분할 착수)

**원인.** 감독 로드맵 3단계(기능별 컨트롤러). 3차 함수 14개는 2차 핸들러와 달리 전역 상태를
직접 변이하고 side effect(사진 캡처·투어 전이·P2P)를 낸다. 감독이 **"위험도별 분할"**을 승인 —
한 번에 다 옮기지 않고 가장 안전한 **사진 컨트롤러 1개 군부터** 분리·게이트·배포한다.

**개선.** `main-photo.ts`(`createPhotoController(ctx)`→{capturePhoto})로 `capturePhoto` 본체를
이전(파이프라인 로직 1바이트 불변, main.js 1,231→1,191). 핵심 원칙(2차 승계):
- **재대입 let 8개는 getter 주입**: renderer·scene·camera·thirdPerson·selfAvatar·galleryInfo·
  myNickname·mp 전부 init/토글/입장에서 재대입되는 module let → 값 캡처 시 stale/undefined 참조로
  캡처 시점 크래시. `getX:()=>x` 클로저로 주입. 안정 참조(photoWall const·함수선언·ui import)는 값.
- **capturePhoto는 위임 wrapper로 잔류** → 호출지점(P키·캡처버튼 onCapture·exports 객체) 1바이트
  무변경. 초기화 순서·리스너 등록 횟수 불변(photoController 생성만 eventHandlers 직후 삽입).
- **ctx 이름 충돌 방어**: 주입 `ctx` 파라미터를 모듈 최상단에서 즉시 구조분해해 개별 심볼로 고정 →
  `img.onload` 내부 `const ctx = canvas.getContext('2d')`(캔버스 2D)와 섀도잉 혼선 차단.

**결과.** 게이트 통과 — 검수관 조건부승인(getter 8개 주입정확·wrapper 계약·초기화순서·이름충돌·
파이프라인 인자 동일, 조건=분리로 죽은 import 3개 제거 → 이행), 독립 스모크(**6/6 PASS**, app/index·
world swiftshader 실렌더 콘솔0, capturePhoto 런타임 ReferenceError 없이 위임 호출). player/artworks/
config.js·index.html·CSP 무수정.

**교훈.** side effect 있는 기능함수 분리도 2차의 두 원칙(등록 아닌 구현만 이전, 재대입 let은 getter)이
그대로 방어선이다. 추가로 **"완전 위임" 리팩터는 원본의 죽은 import까지 정리해야 취지가 완결**된다 —
검수관이 base엔 없던 신규 no-unused-vars 3건을 잡아 조건으로 걸었고, 이를 amend로 흡수했다.

---

## 2026-07-22 · C단계 C-3(5) — main.js 점진 분해 2차: DOM 이벤트 핸들러 (ctx 주입)

**원인.** 감독 로드맵 2단계. main.js의 DOM 이벤트 핸들러(onKeyDown·onWindowResize·beforeunload)를
분리. 1차(순수 이동)와 달리 공유 상태를 읽고 쓰므로 순수 이동 불가.

**개선.** `main-events.ts`(90줄, `createEventHandlers(ctx)`→{onKeyDown·onWindowResize·onBeforeUnload})
로 **핸들러 로직만** 추출(main.js 1,256→1,231). 핵심 원칙:
- **리스너 등록은 main.js에 그대로 유지**(addEventListener 8회·순서·핸들러 심볼 1바이트 불변 — 분해
  최다 오류 지점). onKeyDown·onWindowResize는 wrapper 함수선언으로 hoisting·등록라인 보존.
- **ctx 주입 + 재대입 let getter**: camera·renderer·mp·entered·touring은 init에서 재대입되는 module
  let이라 **값 캡처가 아니라 getter 클로저**로 주입(호출 시점 최신 값 재조회 — stale 참조 방지).
- 기능함수 14개(capturePhoto·투어군·셀프뷰 등)는 **3차 대상이라 main.js 잔류**, ctx로 참조만 전달.

**결과.** 게이트 통과 — 검수관 승인(리스너 불변·getter stale 방지·키분기 1바이트 동치·기능함수 잔류
정당·no-undef 0), 독립 스모크(**app/index·world swiftshader 실제 렌더 콘솔0·씬부팅**, addEventListener
8회 불변, 재입장 리스너 중복 없음). player/artworks/config.js·index.html·CSP 무수정, test 116/116.

**교훈.** 이벤트 핸들러 분리의 함정 2가지를 방어했다 — ①리스너 **등록**은 옮기지 않고 **구현**만 옮겨
"등록 횟수·순서 불변"을 지킨다(중복 등록=메모리 누수·이중 반응 방지). ②재대입되는 공유 상태는 값이
아니라 **getter로 주입**해야 stale 참조를 피한다(입장 전 camera=null 캡처 시 리사이즈 크래시 같은
버그 원천 차단). 이 두 원칙이 감독이 지목한 "초기화 순서·이벤트 등록 횟수" 게이트의 실체다.

---

## 2026-07-22 · C단계 C-3(4) — main.js 점진 분해 1차: 순수 유틸 leaf (보호파일, 감독 로드맵)

**원인.** main.js(1,418줄)는 미술관 부트스트랩 진입점(Composition Root)이자 유일한 보호4파일 미분해분.
감사 결과 **코어 분해는 위험≫가치**(export 0=소비자 없음, 공유 let ~40개, 미술관 전체다운 리스크).
감독 결정: 보류가 아니라 **4단계 점진 로드맵** — 1차 순수유틸 → 2차 이벤트핸들러 → 3차 기능컨트롤러
→ 4차 "초기화·조립만 main.js 잔류"(Composition Root 이상형).

**개선(1차, 순수 함수만).** `main-math.ts`(easeInOutCubic·lerpAngle·djb2·resolveAutoTheme)·
`main-spec.ts`(readSpec·writeSpec·품질 상수)·`main-gpu.ts`(probeGpu)·`main-photo-util.ts`(dataUrlToBlob·
drawWatermark·drawLetterSpacedRight·getShareUrl) = 162줄 추출(1,418→1,256). **순수 기준 엄격**: DOM
미수정·모듈 let 미접근·scene/renderer/player 미참조·이벤트 미등록·입력→반환만. **showGpuNotice(DOM
배너)·capturePhoto(렌더러 결합)·specFastTicks(공유 let)는 순수 아니라 잔류**(2차 이후).

**감독의 검증 용어 교정(중요).** "byte 무결성"은 부정확한 표현(파일 분리하면 바이트는 당연히 달라짐)
→ **"동작 동일성(입력·출력·사용자 동작) 회귀 검증"**으로 정정. 실제 게이트 기준을 감독이 명시:
①동작 동일성 ②**초기화 순서·이벤트 등록 횟수 불변**(main.js 분해 최다 오류 지점) ③신규 콘솔 error·
unhandledrejection 0 ④정상/네트워크제한/소프트웨어GPU 3환경 진입·렌더 ⑤추출 기능 결과 동일 ⑥재입장
리스너 중복 없음 ⑦성능 악화 없음. 하나라도 실패 시 롤백. 또 **AI 역할명(팀장 서명 등)의 자기선언은
실질 없음** — 실제 게이트는 "작업 전 범위승인(감독)→작업 후 검증→실패 시 롤백"으로 단순화.

**결과.** 게이트 통과 — 독립 스모크(소프트웨어GPU 헤드리스 렌더 콘솔0·unhandledrejection0, addEventListener
8→8·setAnimationLoop 2→2 불변, 이동 11함수 본문 동일) + 검수관 승인(순수성 전수·동작 동일성·잔류 정당·
no-undef 0). player/artworks/config.js·index.html·CSP 무수정. test 116/116.

**교훈.** 모든 큰 파일을 쪼개는 게 SOLID가 아니다 — 진입점(Composition Root)은 조립 특성상 큰 게
자연스럽다. main.js는 "무조건 분해"가 아니라 **감사로 위험/가치를 재고 → 순수 leaf부터 점진 → 최종
조립만 잔류"라는 정교한 경로를 택했다. 검증은 "소스 보존"이 아니라 **동작 동일성 + 초기화 순서·이벤트
횟수 불변**이 본질(감독 교정).

---

## 2026-07-22 · ★★ C단계 C-3(3) — scene.js(2,059줄) 6분해 = 비보호 초대형 SOLID 완료

**원인.** scene.js = **라이브 미술관(app/index) 씬 핵심**(재질맵·조명·환경·나무·조립). 초대형 SRP
위반. 소비자 3곳: **main.js(보호, createMuseum·sceneTick)**·space-parts.ts(재질맵3)·world.js(나무2).

**개선(6분해 + 배럴, chibi 교훈 방어).** `scene-textures.ts`(529, 재질맵·**캐시8 단일소유**)·
`scene-themes.ts`(277)·`scene-trees.ts`(99)·`scene-building.ts`(603)·`scene-scenery.ts`(483,
creatures[] 사유)·`scene-assembly.ts`(88, createMuseum·sceneTick·cycleState) + 배럴 `scene.ts`(명시
8 re-export). **main.js는 배럴+폴백으로 무수정**(보호4파일 불가침), 순환0(scene은 space 미참조).

**chibi 교훈 방어 적용(핵심).** 직전 chibi에서 비export 상수 cross-module 참조 누락이 런타임 크래시를
냈던 걸 받아, scene은 구현·게이트 양쪽에서 **no-undef 스코프 전수 검사(미해결 참조 0, 음성 대조로
하네스 유효성 확인)** + **createMuseum 4테마 실제 런타임 렌더(ReferenceError 0)**를 필수화. 검수관도
직접 no-undef 0 실증. byte 무결성: top-level 58선언 verbatim 매칭, 유일 차이=의도된 `updateCreatures`
전환 1줄, 캐시 시드·SpotLight 파라미터 1:1.

**결과 — C단계 비보호 초대형 SOLID 분해 완료.** ui(3,977)·studio(1,697)·space-render(1,516)·
chibi(2,678)·scene(2,059) = **총 11,927줄 초대형 5개를 27개 SRP 모듈 + 배럴로 분해**, 전부 라이브
배포. **보호4파일 무수정**(전부 배럴+폴백)·라이브 무회귀·byte/런타임 무결성. 외부 코드평가가 지목한
"구조 급속 복잡화"의 초대형 핫스팟이 사실상 해소됐다.

**남은 것.** 초대형 중 **main.js(1,415, 보호4파일)만 미분해** — 로드맵대로 감사·분해설계 문서만
작성하고 실착수는 팀장 사전서명 + 감독 확인 이중 게이트. 그 외: dead 상수 정리·strict화(#96)·게이트
강화 상시편입(no-undef 스코프·실제 렌더).

**교훈.** 미술관 렌더처럼 회귀 위험 최고인 초대형도 "leaf(캐시·테마) → 중간(나무·건축·환경) →
조립기 → 배럴" 순서 + "캐시 싱글톤 단일소유(분산=힙 2배 회귀)" + "byte 무결성·no-undef·실제 렌더
삼중 게이트"면 라이브 안 깨고 분해된다. C-3는 chibi의 런타임 회귀를 게이트 강화로 흡수해 마지막
scene을 무사고로 착지시킨 학습 사이클이었다.

---

## 2026-07-22 · ★★ C단계 C-3(2) — chibi.js(2,678줄) 6분해 + 검수관이 라이브 크래시 차단

**원인.** chibi.js = 아바타 3D 생성(사람·동물·robot·ghost·의상). 초대형 SRP 위반. 소비자 7곳
(world-gen·world-boot·ui-hud·builder-walk·avatar·npc·ui-avatar-editor) — **보호4파일 무소비**.

**개선(6분해 + 배럴).** `chibi-schema.ts`(390, 저장 look SSOT)·`chibi-color.ts`(16)·`chibi-anim.ts`
(56)·`chibi-materials.ts`(237, `_toonRamp` 싱글턴)·`chibi-face.ts`(475, Canvas2D)·`chibi-builder.ts`
(1,525, buildChibi+update 클로저) + 배럴 `chibi.ts`(명시 31 re-export). 저장 look(DEFAULT_CHIBI·
normalizeChibi·encode/decode·`chibi:` 프리픽스) 1바이트 불변, 순환0, 소비자 무수정.

**★ 검수관이 라이브 아바타 전체 크래시를 사전 차단(핵심 사건).** 분해 시 비export 상수 3개
(`NONHUMAN`·`FACE_SHAPE_DEF`·`SPECIES_HEAD_BASE`)가 **export 승격 누락** → face/builder가 참조하는데
import 안 됨 → `buildChibi()`/`drawFaceCanvas()` **런타임 ReferenceError(아바타 생성 100% 크래시)**.
정의 라인은 이동됐으나 **참조 연결이 끊긴** 케이스라 byte 멀티셋 대조는 통과했다. 결정적으로 이 회귀는
**@ts-nocheck(tsc 스킵) + eslint `no-undef:off` + `vite build` 성공 + 정적 대체 스모크** 어느 것도
못 잡았다 — 검수관이 **6모듈에 no-undef 스코프를 임시 활성**(정확히 6건 검출)하고 **buildChibi를 실제
호출**해 반려로 잡았다. 수정(export 3 + import 2, 로직 무변경)→ no-undef 0·런타임 9/9 재실증→ 재검수
승인→ 배포.

**게이트 규율 강화(이 사건의 산물).** ① **@ts-nocheck 모듈 분해는 no-undef 스코프 전수 검사를 게이트에
편입**(정적 사각 차단). ② **렌더 모듈 스모크는 "정적 대체" 금지 — 실제 buildChibi/씬 생성 런타임 호출**
필수. (이미 배포된 space-render/studio/ui는 실제 헤드리스 렌더 콘솔0 통과 → 이 유형 회귀 없음 확인.
chibi만 스모크가 정적 대체라 놓쳤고 검수관이 잡았다.)

**교훈.** "byte 무결성"은 라인이 어딘가 존재함만 증명하지 **cross-module 참조가 연결됐는지는 증명하지
않는다.** 순수 이동 분해의 진짜 위험은 로직 변조가 아니라 **끊긴 참조** — @ts-nocheck가 그 안전망(tsc)을
끈 상태였다. 제3자 교차검수(구현자≠검증자)가 정적 게이트의 사각을 메운 정확한 실례.

---

## 2026-07-22 · ★★ C단계 C-3(1) — space-render.js(1,516줄) 3분해 (OCP 경계, 라이브 렌더)

**원인.** space-render.js = 빌더·방문·world 공용 렌더 조립기(1,516줄, 초대형). SRP상 지오/재질
팩토리·조립기·라이트맵이 한 파일에 혼재. CLAUDE.md의 OCP 3지점(`partGeo`/`partAccent`/`MATS`)이
자연 분해 경계.

**개선(고도 기준 3분해 + 배럴, S1~S4).**
- **`space-parts.ts`(1,117, leaf)**: 지오/재질 팩토리 — 텍스처 캐시·`MATS`·`partMat`·지오헬퍼·액자·
  **`partGeo`/`partAccent`(OCP 3지점 전부)**. three·space·scene만 의존(assembler/lightmap 미참조).
- **`space-lightmap.ts`(87, leaf)**: 라이트맵 베이크(`bakeShellLightmaps(Async)`·`detectSoftGPU`).
  three만 의존.
- **`space-assembler.ts`(323)**: 조립·조명 — `buildSpaceGroup`·`addRoomLighting`·`disposeSpaceGroup`·
  틴트헬퍼. space-parts를 단방향 import.
- **`space-render.ts`(8, 배럴)**: **명시 named re-export**(export * 금지 — 이름 충돌 조용한 drop
  위험 회피) 14심볼. 소비자 5곳(builder·visit·world·builder-walk·builder.html) `./space-render.js`
  import 유지 → tsJsFallback이 배럴로 해소 → **소비자 무수정**.

**결과.** 게이트 통과(독립 스모크 world/index/studio 콘솔0·CSP0·씬부팅 + 검수관 조건부승인, 블로커0).
검수관 byte 무결성 실증: origin 원본 vs 3모듈 **라인 멀티셋 대조 누락0·SequenceMatcher 순수 재배치**,
**shared 텍스처 skip·addRoomLighting 스포트값(0xffe3ba,23,11,0.72…)·userData 스키마 1바이트 불변**.
순환0(parts leaf), **world.js(스포트 미러 상수 보유) 무수정**, 보호4파일 무변경. test 116/116. 롤백성:
S1~S3은 space-render.js 0-diff 병존, S4만 삭제+배럴(단일 revert 원복).

**남은 C-3.** chibi.js(2,652)·scene.js(2,055) 분해 + **main.js는 보호4파일이라 감사·분해설계 문서만**
(실착수는 팀장 사전서명 + 감독 확인 이중 게이트).

**교훈.** 렌더 조립기처럼 회귀 위험이 큰 초대형도 "고도(팩토리/조립/베이크) + OCP 경계"로 자르고
**byte 무결성(라인 멀티셋 대조)**을 게이트로 삼으면 픽셀비교 없이도 순수 이동을 증명할 수 있다.
배럴은 `export *`가 아니라 명시 재노출 — 병합 시 이름 충돌 조용한 유실을 원천 차단.

---

## 2026-07-22 · ★★ C단계 C-2 — studio.html(1,697줄) 인라인 추출 분해 완성 (SOLID+CSP, 감독)

**원인.** studio.html에 스타일·폼·플랜·저장이 인라인 혼재(SRP 위반) + 인라인 `<script>`가 CSP
`script-src` sha256 핀을 요구. 감독 "C-2→C-3" 지시.

**개선(S0 + S1~S4).**
- **S0(인라인 외부화 + CSP 핀 제거)**: 인라인 `<script>` IIFE(834줄)를 `studio-main.ts`로 통째
  이동 + `<script type=module src>` 1줄 교체. 인라인 실행 script 0 → **CSP `script-src 'self'` 수렴**
  (핀 제거·cspReconcile 자동 재작성). = SRP + CSP 단순화 이중이득.
- **S1~S4(재분해 + DI)**: studio-main.ts(835줄 통째)를 **5모듈로 분해** — `studio-plan.ts`(45,
  플랜·한도)·`studio-image.ts`(71, 내장·모달)·`studio-storage.ts`(166, 저장·**갤러리 코덱 SSOT**)·
  `studio-form.ts`(605, 렌더·이벤트)·`studio-main.ts`(64, 엔트리). **StudioContext DI**로 단일 `state`
  참조 공유(복사0 — form 변이를 storage가 같은 참조로 직렬화).

**⚠️ 로드맵 정정(space.ts 부적합).** 로드맵 C-2 문구는 "저장을 space.ts 계약 재사용"이라 했으나,
실측 결과 space.ts는 **3D 빌더 "공간" 모델**(shell/parts)이고 studio는 **"갤러리 JSON"**(id/name/
artworks)이라 무관 — space.ts import 안 함. **진짜 DRY 대상은 갤러리 코덱**(studio 인코더 ↔
artworks.js 디코더의 `#gz=`/`#gd=` wire format). artworks.js가 **보호4파일**이라 이번엔 studio-storage가
코덱 SSOT를 소유하되 **바이트 호환 계약만 고정**(단위테스트 파리티), 공유 코덱 이관은 보호해제 후 별건.

**결과.** S0 + S1~S4 게이트 전부 통과(독립 스모크 + 검수관, 각 배포). studio.html 1,697줄 인라인
혼재 → **6파일(html+5 .ts)** SRP 분해 + `script-src 'self'`. `STORAGE_KEY`·`PLAN_KEY`·코덱 wire
format **1바이트 불변**(사용자 드래프트·공유링크 보호), **보호4파일(artworks.js 포함) 무변경**. 단위
테스트 108→**116**(+8: 코덱 라운드트립·loadDraft 정규화). 라이브 studio 콘솔0·CSP0.

**후속(비블로커).** studio 5모듈 전부 `@ts-nocheck`(순수 이동+DI 우선, strict화 별도) — C-1 ui-hud와
함께 strict 정리 트랙(#96 계열). 공유 코덱 artworks.js 이관은 보호4파일 개선(C-3/#90)과 결합.

**교훈.** 로드맵 문구도 실측 앞에선 정정 대상 — "space.ts 재사용"을 맹종했으면 무관한 스키마를 억지
결합할 뻔했다. 인라인 추출은 SRP뿐 아니라 CSP 핀 소멸(공격면·유지보수 이중 감소)을 덤으로 준다.

---

## 2026-07-22 · ★★ C단계 C-1 — ui.js(3,977줄) SRP 분해 완성 (SOLID, 감독 "게이트 정비→C")

**원인.** 외부 코드평가가 지목한 최대 SRP 위반 핫스팟 = `ui.js` 단일 파일에 HUD·아바타 편집기·
CSS·저수준 헬퍼가 혼재(실측 3,977줄). 감독(아키텍트 관점) "SOLID가 유지보수의 전제". #94 게이트
정비(회귀 안전망 clean)를 선행한 뒤 착수.

**개선(4단계, 각 독립 커밋·게이트·배포).** ui.js를 **5파일로 분해**하되 **소비자 main.js(보호파일)는
한 번도 안 건드림**(배럴로 export 표면 보존):
- **단계1 `ui-dom.ts`**(1,701줄): `el`·`injectStyles`(CSS-in-JS 1,675줄)·`GOLD` 순수 이동. 검수관이
  CSS 1,670줄 diff 바이트 동일 실증.
- **단계2 `ui-chibi-store.ts`**(108줄): chibi 퍼시스턴스(키생성·read/save·closet). **localStorage 키
  불변**(사용자 저장 유실 방지). ESM live-binding 제약으로 `sessionChibi` 재할당을 setter로 교체.
- **단계3 `ui-avatar-editor.ts`**(687줄, **최고위험**): 편집기 클러스터를 `createChibiMaker(ctx)`
  팩토리화. 양방향 결합(setStatus·callbacks·chibiOpen)을 **ctx 주입 + uiState 객체 승격**으로 풀어
  순환 차단(편집기가 HUD를 import 안 함). 저장/RAF/ESC·c키 배선 보존. three-ambient.d.ts(`declare
  module 'three'`) 신설(빌드타임 타입만·배포 미유출).
- **단계4 배럴**: `ui.js`→`ui-hud.ts` 개명(1,585줄) + `ui.ts` 배럴(`export * from './ui-hud.js'`).
  main.js의 `./ui.js` import를 `tsJsFallback` **2단계 폴백**(→ui.ts→ui-hud.ts)이 해소 → **main.js
  무수정**으로 34 export 표면 보존. negative test로 배럴 필수성 확인.

**결과.** 4단계 전부 게이트 통과(독립 스모크 + 검수관 교차리뷰, 각 배포 Actions success). 보호4파일
무변경(전 단계 diff 공백)·라이브(app/index 미술관) 콘솔0·CSP0·test 108/108·자기완결 유지. ui.js
3,977줄 단일 파일이 **HUD 셸(1,585)/편집기(687)/스토어(108)/DOM(1,701)/배럴(1)** SRP 5파일로 분해.

**게이트 규율 조정(팀장).** leaf TS 전환과 달리 구조 분해는 번들러 모듈 재배치로 "dist 바이트 동일"이
불성립 → **"의미 동등(라이브 스모크 콘솔0·CSP0) 1차 + dist 정규화 diff 리뷰 + 검수관 필수"**로 게이트
완화. 매 단계 검수관 교차리뷰 필수로 안전 담보.

**후속(비블로커).** ①`ui-hud.ts` `@ts-nocheck` — 대형 HUD 셸 strict화는 "순수 개명" 제약상 별도
과제로 보류(로직 무변경 우선). 방치 시 미검사 지대 고착 위험 → strict 정리 티켓 필요. ②chibi.js·
builder-walk.js의 `ui.js` 옛 주석 → `ui-hud.js` 갱신. ③`ui-avatar-editor` 유닛테스트 부재.

**교훈.** 3,977줄 초대형 파일도 **배럴 + 소비자 무수정**이면 보호파일을 안 건드리고 분해할 수 있다.
자연 경계(CSS/편집기/스토어)를 순수 이동으로 먼저 떼고, 마지막에 개명+배럴로 표면을 봉인하는 순서가
"라이브 안 깨는 대분해"의 핵심. 결합(양방향 참조)은 ctx 주입으로 끊어 순환을 원천 차단.

---

## 2026-07-21 · ★ 아키텍처 안정화 B-5단계 — leaf TypeScript 전환 개시 (space.js→.ts, 감독 결정)

**원인.** B-2b(배포 경로 Vite 전환)로 이제 소스가 Vite 번들을 거치므로 .ts 파일 전환이 가능해졌다.
승인 로드맵 B-5: leaf·순수·비보호·소형 모듈부터 파일단위로 점진 전환(각 1커밋·독립배포·파일단위
롤백). 첫 대상은 **`space.js`**(공간 빌더 스키마 SSOT — A-2 단위테스트 29개가 이미 두껍게 감싸
"before" 스냅샷 확보, 하류 타입이득 최대).

**개선(B-5-①).**
- `web/js/space.js` → `web/js/space.ts` 리네임 + strict 타입 첨가. **런타임 로직·값은 1바이트도
  불변**(타입주석·interface·제네릭·`as`·non-null assertion은 tsc가 컴파일 시 제거하는 타입전용 구문).
- **`.js→.ts` 리졸브 이슈**: vite/rollup 빌드 resolver는 확장자 명시된 `.js` import를 `.ts`로 치환
  하지 않는다(tsc Bundler 모드와 상이). 커스텀 resolveId 플러그인은 방금 배포된 배포기 침습이라
  기각 → **대안: 소비자 import를 확장자 없는 `./space`로 통일**(9소비자+2테스트=11곳, 각 1줄 확장자
  제거만). vite.config/tsconfig 무수정 — 배포기 무침습.

**결과.** 게이트 통과 — 독립 스모크 6/6(app/world·app/index 라이브 콘솔0·CSP0)·typecheck 0·
`npm test` 108/108, 검수관 **승인**(블로커0). 검수관 결정적 증거: **origin/main vs 이 브랜치를 각각
`vite build`해 `dist/` 트리 전체 `diff -rq` → 100% 바이트 동일**(해시 파일명·전 청크·모든 HTML) —
space.ts 전환이 배포 산출물에 어떤 영향도 없음을 실증. 감독 GO 후 main 배포(run success).
보호4파일 무변경. **이후 leaf(ytembed·space-presets·stats·guestbook·feed)는 감독 지시로 동일
게이트 통과 시 팀장 재량 연속배포.**

**연속배포 진행(감독 재량 위임).** 동일 패턴으로 후속 leaf 전환·배포:
- **B-5-② `ytembed.js`→`.ts`**(커밋 bcd60aa, run success): 소비자=builder(behind-flag)+테스트만
  → 라이브 영향 0. 경량 게이트(dist 바이트 동일 대조+6항 스모크)로 배포 무영향 실증.
- **B-5-③ `space-presets.js`→`.ts`**: 소비자=builder + **world-gen(→world.html 오픈월드 정식노출
  라이브 소비)** + 테스트. 프리셋은 정규화 전 문서라 `PresetSpace`/`SpacePreset` interface 신설로
  표기. 게이트: **dist 바이트 동일 + app/world 콘솔0·CSP0 회귀0** 실증 → 배포.
- 게이트 경량화 근거: leaf TS 전환은 "타입은 런타임에서 사라진다" → **origin/main vs 브랜치 dist
  `diff -rq` 0(바이트 동일)** 이 배포 무영향의 수학적 증명. 이를 독립 스모크에 통합해 매 leaf 검수관
  풀리뷰를 대체(dist가 예상외로 다르면 검수관 에스컬레이션). typecheck·test 108·보호4파일 무변경 병행.

**B-5-④⑤⑥ `stats`·`guestbook`·`feed` — 보호파일 결합 → 감독 B안(폴백 resolve).** 이 3개는 앞
leaf들과 달리 **라이브 `main.js`(보호4파일)가 직접 소비자**다(방명록·통계·포토월). 대안b(소비자
확장자 제거)를 쓰면 main.js import 3줄을 고쳐야 해 보호파일 게이트에 걸린다. 감독 판정 **B안 채택**:
- **vite `tsJsFallback()` 폴백 플러그인**(vite.config+vitest.config): 상대·`.js`·실재.js없음·대응.ts존재
  4조건 AND에서만 `.js`→`.ts` 리졸브. `existsSync` 순서로 실재 .js 무개입, bare specifier(three·
  peerjs)·node_modules·vendor 제외. → **모든 소비자 import는 `.js` 유지 = main.js 포함 무수정**.
- stats/guestbook/feed 는 .ts 리네임+타입만. **보호4파일 diff 완전 공백**(재작업의 핵심 목표) 실증.
- 게이트: 배포기(vite.config) 수정이라 경량 아닌 **풀 게이트** — 독립 스모크(보호4파일 무변경·라이브
  3페이지 콘솔0·CSP0·dist 청크 런타임 동일) + 검수관 **승인**(폴백 안전성·롤백단위·혼재공존 실증).
- **⚠️ 롤백 단위 = 이 4커밋 전체**(폴백 플러그인 e8f9135 + 3 리네임). 폴백만 revert하면 stats/
  guestbook/feed 소비자가 `.js` 유지+폴백 의존이라 `vite build`가 깨진다(검수관이 worktree revert로
  실증). 파일단위 독립 롤백 불가 — 회귀 시 4커밋(또는 병합 커밋) 전체를 되돌릴 것.

**혼재 부채(#94 이월).** space/ytembed/space-presets(소비자 확장자 **제거**) vs stats/guestbook/feed
(확장자 **유지**+폴백)의 두 리졸브 방식 혼재. 조건 분기(확장자 유/무)로 겹침 0·기능 안전하나
유지보수 부채 → 향후 방식 일원화 검토(#94). B-5 leaf 6개 전환 완료 — 순수 leaf 소진, 초대형·보호
파일은 C단계.

---

## 2026-07-22 · 안전망 #94 게이트 핵심 정비 — E2 폐기 + 리졸브 일원화 (C단계 전 선행)

**원인.** 감독 결정: SOLID(유지보수) 본질인 C단계(초대형 파일 분해) 착수 전, 그 대규모 분해를 잡을
**회귀 안전망(스모크 게이트)부터 정확히**. C-1 ui.js는 3,842줄 — 회귀 위험 최대라 게이트가 헐거우면
분해가 위험하다.

**개선.**
- **E2/E1 동등성 검사 폐기**(`scripts/smoke/equivalence.mjs` 삭제 + run/assemble/config 정리). E2는
  "web직조립(구 라이브) vs vite조립" 동등성으로 Vite 전환을 증명하는 **전환 증명 전용** 검사였는데,
  B-2b 배포로 라이브가 vite가 되고 origin/main 랜딩군이 vite전제라 web직조립이 의도적으로 깨져
  **baseline 무효화 → 항상 FAIL**(매 게이트 소음). 목적 달성했으니 제거. E1(sitemap)도 같은 baseline
  의존이라 함께 제거 — URL 검증은 검사3(핵심파일)·가드B(내부링크 200)가 대체. scripts/smoke는
  _site 미포함 → **라이브 무영향**.
- **리졸브 방식 일원화**(소비자 12파일 `.js` 확장자 재부착). space/ytembed/space-presets 비보호
  소비자의 확장자 없는 import를 `.js`로 통일 → 전 web/js 상대 import가 **확장자 유지+`tsJsFallback`
  폴백 경유**로 일관. 확장자 유지 방향인 이유: main.js(보호파일)가 이 방식이라 **유일하게 보호4파일
  무변경**인 통일 방향(확장자 제거 통일은 main.js 수정 필요=불가).

**결과.** 독립 스모크 — 보호4파일 무변경, **smoke:vite 전항 PASS(FAIL 항목 0** — E2 소음 소멸),
**dist 바이트 동일**(리졸브 일원화 무영향 실증), 라이브 3페이지 콘솔0·CSP0, typecheck 0·test 108/108.
게이트가 clean해져 C단계 대규모 분해의 회귀 감지 신뢰 확보. **다음: C단계 SOLID 분해**(C-1 ui.js
3,842줄 → ui-hud/ui-avatar-editor/ui-dom + 배럴 ui.ts로 main.js 무수정 보존).

**교훈.** "SOLID로 유지보수"를 안전하게 하려면 분해 자체보다 **분해를 검증할 그물**을 먼저 정확히.
낡은 검사(E2)의 만성 FAIL은 진짜 회귀를 가리는 소음 — 목적을 다한 검사는 폐기가 곧 게이트 품질.

**부수 발견(#94 이월).** smoke:vite의 **E2 동등성 검사가 B-2b 배포로 무효화**됐다: E2는 "origin/main
web직조립(=B-2b 이전 라이브) vs vite조립"을 비교하는데, B-2b가 origin/main 랜딩군을 vite전제로
조정해 web직조립이 의도적으로 깨진다(B-2b 설계 근거 그 자체). 즉 "전환 증명" 전용 검사가 전환완료로
baseline을 상실 — 폐기/재정의 필요(검수관이 origin/main worktree 독립 실행으로 사전존재 확인).

**교훈.** leaf 전환의 안전성은 "타입은 런타임에서 사라진다"는 성질에서 나온다 — dist 바이트 동일이
그 수학적 증거. 확장자 리졸브처럼 도구 경계에서 막히면 배포기를 침습하는 커스텀 플러그인보다
소비자측 국소 조정(확장자 생략)이 롤백단위를 작게 유지한다.

---

## 2026-07-21 · ★ 아키텍처 안정화 B-2b단계 — 배포 경로 전면 Vite 전환 (감독 결정)

**원인.** A단계 안전망 위에서 감독 결정(전면 TS+Vite, 장기 서비스 관리성). B-2a에서 Vite가
자기완결·CSP self·인라인0을 지켜 빌드 가능함을 검증기로 실증. B-2b는 그 Vite 산출물을 실제
배포 경로(_site)로 승격 — "소스 직서빙"에서 "빌드 산출물 배포"로 전환하되 라이브 미술관을
한 번도 깨지 않고 URL·자기완결·CSP·보호4파일 규율을 완화하지 않는 것이 핵심 난제.

**개선.**
- **base 절대전환** `'/openartshow/'`: rollup 멀티페이지 공유 `_bundle` 을 깊이 다른 랜딩(루트)·
  앱(app/)이 공유하려면 절대 base 필수. 손으로 쓴 런타임 참조(`fetch("./app/…")`·`href`·og·
  peerjs classic)는 문자열이라 미변경 — 절대 base가 안 깬다(빌드 실측 확인).
- **HTML rename 플러그인**(generateBundle 2-pass): landing→`index.html`, 미술관→`app/index.html`,
  studio/world/builder/visit→`app/*`, guide/design/about→루트 불변. **최종 배포 URL 전부 불변**
  (공유링크·SEO·sitemap 무영향).
- **CSP 자동정합 플러그인**: 인라인 sha256 을 빌드 후단 디스크 실측 재계산→script-src 재작성.
  수작업 핀 관리 폐지(드리프트 소멸). importmap 제거로 미술관/world 핀 dead→`'self'` 수렴.
- **랜딩군 소스 8줄**: 빌드대상(import·link)만 소스경로로 교정, 런타임(fetch·href·og)은 `./app/`
  유지. design.html:549 깨진 `./landing.html`→`./index.html` 교정.
- **deploy.yml 교체**: 소스 재배치 cp 로직 삭제 → `npm ci`+`npx vite build`+`cp -r dist/. _site/`
  +생성기/sitemap/robots. assemble.mjs ASSEMBLE_VITE_SH 와 1:1.

**⚠️ 롤백 단위(중요).** 이 전환의 안전한 롤백 단위는 **B-2b 4커밋 전체(또는 병합 커밋)** 이다.
deploy.yml(85f2880) **단독 revert 는 불충분** — 랜딩군 소스 8줄(`./app/vendor/…`→`./vendor/…`
등)이 vite 전제로 조정돼 있어, deploy 만 web직서빙으로 되돌리면 랜딩군 fonts/import 가 404 로
깨진다(§검수관 지적). 회귀 시 반드시 4커밋(또는 main 병합 커밋) 전체를 되돌릴 것.

**결과.** 게이트 통과 — executor 독립 스모크 기본6항 6/6 + B-2b특화 6/6(smoke:vite 10항: 6항+
가드A/B/C+E1/E2 동등성 전부 PASS, URL회귀0, npm test 108/108), 검수관 cross-review 조건부
승인(블로커0 — 실제 vite build 실행+CSP 해시 디스크 실측 일치 검증). 보호4파일 무변경. 권고
3건(utils 死파일 복사·peerjs 미사용 devDep·three caret 동기화 문서화)은 #94 로 이월.

**교훈.** "빌드 없는 자기완결 직서빙"을 "빌드 산출물 배포"로 옮기는 최대 위험(외부호스트 유입·
CSP 핀 파손·URL 회귀)을, Vite 를 먼저 "검증기"(B-2a)로만 태우고 자기완결·CSP·인라인0 을 실증한
뒤에야 "배포기"(B-2b)로 승격하는 2페이즈 롤인으로 전부 관문 통과시켰다. 롤백 단위를 커밋이 아닌
"원자 변경 집합"으로 인식하는 것이 안전 전환의 핵심.

---

## 2026-07-21 · ★ 아키텍처 안정화 A단계 — 회귀 안전망(테스트·CI·스모크) 도입 (감독 결정)

**원인.** 외부 코드평가가 최대 문제로 "코드 구조 급속 복잡화(ui.js 3,842줄 등)·테스트/CI
부재(수동 검증 의존)"를 지적. 감독(소프트웨어 아키텍트 관점) 결정: **(1) 전면 TypeScript+Vite
전환, (2) 회귀 안전망을 먼저 구축.** team-lead 판정 — 이 평가는 우리 QA/SOLID 트랙(#87~#90)의
시점을 앞당기라는 독립 확인. 리팩터/TS 전환은 회귀를 잡을 그물 없이는 위험하므로 **안전망이
전제**.

**개선(A단계, 소스 로직 무수정·라이브 리스크 0).**
- A-1 인프라: vitest(러너)·eslint(v9 flat, 관대한 baseline)·tsconfig(allowJs·checkJs:false·
  strict, B단계 파일단위 점진 전환용). package.json에 test/lint/typecheck/smoke 스크립트,
  puppeteer·jsdom을 devDependencies로 이동(런타임 배포물 npm 의존 0 유지).
- A-2 단위테스트 **108개**(tests/, web/ 밖 → 배포 오염 방지): space(마이그레이션·정규화·
  라운드트립·스키마 자기정합)·ytembed·guestbook·stats·feed·space-presets. TS 전환의 "before" 스냅샷.
- A-3 스모크 하네스: `npm run smoke` 한 번으로 6항+가드(생성기·파일수·필수파일·console.error·
  가로넘침 320/375/1280·CSP violation·인라인script·내부링크) 자동. skill 대체 아닌 실행 보조.
- A-4 `ci.yml`: lint·typecheck·test 게이트(2스텝 롤인 — 독립 워크플로로 시작, 안정화 후
  deploy에 needs:ci). 최소권한 명시.

**안전망이 착수 즉시 잡은 라이브 버그 3개(수정).** ① avatar 라벨 머티리얼 중복 depthWrite 키
(eslint no-dupe-keys) ② about.html CTA 2개 404 ③ about 폰트 404. ②③ 근본원인은 about이
landing/guide 급 "루트 배포 가정" 상대경로인데 deploy.yml이 app/에만 배포한 불일치 → **about을
루트 배포로 승격**(deploy.yml 1줄 + 폰트경로 정합, about.html 로직 무수정)해 해결.

**결과.** 게이트 통과 — executor 독립 스모크 6/6 + A단계 특화 7/7, 검수관 cross-review 조건부
승인(블로커 0, 권고 5). 검수관이 avatar 건을 "안전망이 실제로 유효함을 보여주는 사례"로 평가.
보호4파일(main/player/artworks/config.js) 무변경. main 배포. **다음: B단계 TS+Vite 전환
(space.js부터 leaf 순차, Vite 산출물이 자기완결·CSP self 유지 — vendor 번들흡수로 importmap
sha256 핀 소멸).** 승인된 로드맵: 3단계(안전망→TS+Vite→SOLID 분해) 3 불변식(소스트리 항상
배포가능·1커밋 롤백·자기완결 불완화).

**교훈.** 리팩터보다 안전망을 먼저 깐 판단이 즉시 회수됐다 — 그물을 치자마자 기존 버그 3개가
걸렸다. "구조 투자는 완성도의 경쟁자가 아니라 가속기"(회귀 공포 없이 전환·실험 가능).

---

## 2026-07-21 · 오픈월드 그래픽·모바일 성능·팝인 개선 (감독 실기기 피드백 루프, 연속 배포)

감독 실기기 피드백을 받아 오픈월드 품질을 주제별로 연속 개선·배포. 모두 `world.js`(오픈월드 전용) 위주,
라이브 미술관(main/player/artworks/config·visit·builder) 무접촉. 각 건 executor 실브라우저 스모크 6/6 +
release-reviewer 교차리뷰 게이트 통과 후 main 배포.

**배포 요약 (run · 커밋 · 담당)**
- **#137** — 정식 승격(`e4c17c1`·`dfb0dd9`, 보안담당 결함발견·부팀장 구현) + 그래픽 1단계(`9a11b04`·`bd71e72`·`dcf1311`, 팀장 직접·디자이너 감사·성능전문가 계측)
- **#140** — 모바일 A-1·A-2(`9778e35`·`086eb1f`, 성능전문가 진단·부팀장 구현): 파셀 첫 로드 히칭 30.8→6.0ms (**80%↓**)
- **#141** — 모바일 B-1(`82863aa`·`61d8f4b`·`b208b1a`, 부팀장 구현·검수관 결함포착): FPS→해상도 실시간 적응
- **#146** — 팝인 완화(`2da9385`·`fba1316`, Explore 진단·부팀장 구현): 가벼운 fog + 조명 0.5초 페이드업
- **#149** — 모바일 A-3(`2c5b2fe`·`df8e53e`, 부팀장 구현·검수관 블로커 포착, 힙 텍스처 **-88%**) + B-2(`a927bee`, 부팀장): 하늘 오버드로우 lite 축소

**이번 세션의 게이트 성과 — 배포 직전 막은 3결함** (전부 스모크[정적 로드]로는 못 잡고 release-reviewer 교차리뷰가 포착)
1. **ui.js 병합누락 회귀**(정식승격): 브랜치가 origin/main보다 14커밋 뒤처져, 감독이 명시 지시·확정한 라이브 UI(액션버튼 제거·'드래그해서 회전' 힌트 제거·실시간 그림자맵)를 되돌릴 뻔 → origin/main 재병합으로 해소.
2. **B-1 고dpr no-op**: `RATIO_FLOOR=dpr*0.75`가 dpr=3(아이폰 Pro·최신 안드로이드)에서 상한을 넘어 FPS 적응이 정작 저FPS 제보 기기에서 완전 무효 → 상한 상대값(`CEIL*0.6`)으로 수정.
3. **A-3 빌더 dispose 파괴**: 빌더가 세션 공유 텍스처를 구 계약대로 직접 dispose해 싱글톤 파괴(런타임 인터랙션에서만 재현) → shared 가드 추가.

운영: 토큰 절약 규율·에스컬레이션 체계(펜딩→부팀장→팀장) 확립, 세션 한도 시 팀장이 직접 Bash 검증으로 갈음.

### 그래픽 1단계 — 지면 절차 텍스처 + 노멀맵 (run #137, 정식 승격과 통합 배포)
- 단색이던 지면(잔디·모래·광장·도로·다리)에 절차 캔버스 diffuse+normalMap 주입(자기완결·외부 이미지 0).
- 디자이너 감사로 타일 시임 결함 발견 → 시임 제거·normalScale 분리(bd71e72). 감독의 타일링(4m 주기 반복
  얼룩) 지적 → 저주파 blob 억제(저주파 명암 표준편차 64~84%↓ 실측) + 파셀별 정점색 미세 변주로 대면적
  반복 은폐(dcf1311). 정점컬러 variant로 프로그램 +1이나 상한 고정(경계 통과 churn 0)·드로우콜 불변 확인.

### 모바일 성능 — 파셀 히칭 + 지속 프레임 (A-1·A-2 run #140, B-1 run #141)
- 성능 전문가 실측 진단: ① 파셀 첫 진입 시 마감 텍스처 베이크(`getImageData`)가 로드 예산 밖에서 동기
  블로킹(히칭), ② `world.js`에 실시간 FPS→해상도 적응 루프 부재(main.js엔 있음) → 저FPS에도 해상도 유지.
- **A-1** `willReadFrequently:true`(리드백 스톨 완화) + **A-2** 스폰 시 마감 텍스처 3종 워밍 → 파셀 첫 로드
  프레임 30.8ms→6.0ms(약 80%↓).
- **A-3** 벽·바닥 마감 텍스처 공유 캐시 → 힙 THREE.Texture **-88%(50→6)**. base(scene.js·미술관 공유 싱글톤)
  무접촉·전용 공유 clone + repeat을 지오메트리 UV에 bake(`uv*=repeat` = `map.repeat.set` 수학적 동일 → 픽셀
  비트 불변 실측). 공유 텍스처 `userData.shared` + `disposeSpaceGroup` skip으로 방문뷰·빌더 공용 dispose 회귀
  차단. 교차리뷰가 빌더 프리뷰 dispose 2곳(구 clone-소유 계약 가정, 공유 싱글톤 직접 파괴) 블로커 포착 →
  shared 가드 추가로 해소. **run #149 배포**(세션 한도로 재게이트 서브에이전트 불가 → 팀장 직접 Bash 재스모크·
  코드 확인으로 갈음).
- **B-2** 하늘 오버드로우 축소 — lite(B-1 FPS 적응 연동) 시 sky.js 강수 draw-range 45%↓·오로라/빛기둥/별
  opacity 하향(재생성·재컴파일 0, 색·움직임 톤 보존, 양만 축소). sky.js는 world 전용(미술관 미사용). run #149 배포.
- **B-1** FPS→pixelRatio 적응 루프 이식(저FPS 강등·회복 승급, 히스테리시스+쿨다운, dpr 비례 하한). 교차리뷰가
  **고dpr no-op 결함** 포착 — `RATIO_FLOOR=dpr*0.75`가 dpr>2.667(아이폰 Pro·최신 안드로이드 dpr=3)에서
  상한(min(2,dpr)=2)을 넘어 강등/승급이 영구 false = 정작 저FPS 제보 기기에서 무효. → `RATIO_FLOOR`를
  상한 상대값(`min(CEIL, max(1, CEIL*0.6))`)으로 수정해 전 dpr 강등 실효 + dpr<1 엣지 no-op까지 구조적 차단.

### 팝인 완화 — 가벼운 fog + 조명 페이드업 (run #146)
- 감독 피드백: 파셀 경계 넘을 때 "건물 불이 확 켜지고 원거리가 그대로 노출". 원인(Explore 2건): shell(외벽·
  무조명)→full(내부+조명 intensity 0→23 스냅)이 한 프레임 하드 스냅 + fog far(81.6m)가 로드 거리(≤50m)보다
  한참 밖이라 팝인(27~36m)을 불투명도 0~17%로 못 가림. soft GPU는 fog 자체가 off였음.
- fog near/far를 로드 경계로 당김(21.6/45.6m, soft/모바일에도 적용) → 원거리 팝인을 안개로 은폐. 조명은
  `_target` lerp로 0→목표 0.5초 페이드업(라이트풀 개수 불변 → 재컴파일 churn 0). "불 확 켜짐" 제거.

### 운영 규율 — 토큰 절약 · 에스컬레이션
- `CLAUDE.md`에 토큰 절약 규율 명문화: 브랜치 위생 선제(착수 전 `git merge origin/main`)·대형 MCP 응답
  회피(단일 run_id·컨텍스트 밖 파싱)·모델 계층 엄수(정형=executor)·hook 소음 억제. (부팀장이 병렬 세션에서
  같은 주제를 먼저 커밋해 중복 → 병합·통합으로 정리 = 브랜치 위생 선제의 실사례.)
- 감독 지시로 에스컬레이션 체계 확립: 진행 중 펜딩 발생 → 부팀장 이관 → 부팀장도 어려우면 팀장. 팝인 게이트에서
  스모크가 world.html 콘솔 404로 막히자 첫 적용 → 부팀장이 **favicon.ico 브라우저 기본 요청(앱 리소스 아님)**
  오탐으로 확정 → favicon 필터 재스모크 6/6 → 배포.

---

## 2026-07-20 · 오픈월드 정식 서비스 승격 — 베타 제거 + 검색 노출 + P2P IP 노출 고지 3결함 수정

감독 결재로 오픈월드를 베타 데모에서 정식 서비스로 승격(랜딩 "베타" 딱지 제거 + sitemap 검색 노출).
승격 직전 보안 재점검(security-officer)이 P2P 동시접속의 IP 노출 고지에서 치명 3결함을 발견 →
팀장·감독 판정으로 "결함 수정 후 승격 배포"로 확정. 노출·문안·프라이버시 게이트 작업이며 라이브
미술관(main/player/artworks/config)·visit·builder·index·sky.js는 무접촉.

### 원인 (치명 3결함)
- **① 모바일 고지 미표시**: `world.html`의 `.is-touch #enter{display:none}`로 터치 기기에서 진입
  게이트·IP 고지가 통째로 숨겨졌다. P2P 연결은 기기 무관 실행 → 모바일 사용자는 IP가 노출되는데 고지를 못 봄.
- **② 동의 이전 노출**: `world.js`에서 월드 생성 직후 `mp.connect()` 자동 호출 → 사용자 클릭 전에
  WebRTC ICE(=IP 노출)가 시작. 1인 둘러보기만 해도 IP가 노출됐다.
- **③ 문안**: "동시 접속 데모라 노출될 수 있어요" — 데모 자칭 + 완화로 정식 서비스에 부적합.

### 개선
- **결함①**: `.is-touch #enter{display:none}` 삭제 → 데스크톱·모바일 공통으로 입장 게이트·IP 고지 표시.
  조이스틱은 입장(`body.entered`) 후에만 노출(`.is-touch.entered #joy`).
- **결함②**: `world.js` 자동 `mp.connect()` 제거 — `mp` 인스턴스만 생성(peer=null → 네트워크 활동 0).
  return에 1회 가드 `connectMultiplayer()`/`isMultiplayer()` 신설. `world-boot.js` 입장 게이트를
  2버튼("함께 둘러보기"=연결 / "혼자 둘러보기"=미연결)으로 재배선. connect 트리거는 버튼 핸들러 전용
  (lock 이벤트에 걸면 "혼자" 선택자도 연결돼 재발 — 설계 주의사항 반영).
- **결함③**: `#enter`를 IP 노출 사실·범위(같은 순간 접속자·외부 시그널링 서버 경유)·무수집/무저장·
  1인 모드 선택을 담은 정식 고지로 교체. 밝은 월드 배경에서도 읽히도록 어두운 플레이트.
- **랜딩**: 오픈월드 카드 "베타" 표기·BETA 배지·`aria-label "오픈월드 베타 입장"` 제거 → 정식 문안
  ("오픈월드 입장"). 미사용 `.ow-badge` CSS 정리. 카드 위치·클래스명 현행 유지.
- **sitemap**: `build-devlog.mjs` urls에 `app/world.html`(lastmod 2026-07-20) 추가 → 검색 노출.

### 결과
헤드리스 CDP 실측(swiftshader): 입장 전 P2P 미연결(0.peerjs.com 요청 0)·"함께"=시그널링 연결 개시
(요청 3)·"혼자"=연결 0·모바일 `is-touch`에서 고지 표시·조이스틱 입장 후 노출, 콘솔 0. 무접촉 라이브
진입점 9파일 바이트 무변경. CSP importmap 해시 무변경(world-boot.js는 외부 모듈). 데스크톱·모바일
게이트 시각 검수 통과.

게이트: security-officer 3결함 해소 설계 → 부팀장 구현 → executor 스모크. release-reviewer 첫 교차리뷰는
**반려(블로커 2건)** — ① 오래된 base 탓의 ui.js 병합누락 회귀(origin/main보다 14커밋 뒤처져, 감독이 명시
지시·확정한 라이브 UI 변경[액션버튼 제거·모바일 세로스택, '드래그해서 회전' 힌트 제거, 실시간 그림자맵]을
되돌릴 위험) ② 미실시 검수를 "블로커 0"으로 선기재한 서술 오류. → origin/main 병합으로 회귀 해소(ui.js
순변경 0 재확인)·서술 정정 → 재게이트(재스모크 6/6 + release-reviewer 승인) 통과 → **2026-07-21 그래픽
1단계와 통합 main 배포 완료(run #137 success)**. 개인정보 고지 법무 검토(legal-counsel)는 별도 트랙.
후속 권고: `world.html` 좌상단 HUD 문구를 신설 게이트 톤에 맞춰 정리(이번 범위 밖).

---

## 2026-07-20 · 오픈월드 해안+히칭 개선 통합 라이브 배포 (감독 승인)

감독 결정("등대까지 하고 배포")에 따라 해안 연출 1+2단계(바다 단차·해변·부두·테트라포드·등대)와
스트리밍 히칭 개선 1+2단계(로드 시간분할 큐·라이트 풀)를 묶어 main 병합·배포.

- 역병합(main→브랜치): main 유입분(web/js/ui.js — 모바일 캐릭터·모달 hotfix)만, 오픈월드 브랜치와
  충돌 파일 0. 생성물 재빌드로 결정론 정합.
- 게이트: executor 배포 스모크 6/6 · 라이브 진입점(main/player/artworks/config/index/visit/builder/
  landing/ui.js) origin/main 대비 **바이트 무변경** 입증 · space-render는 addRoomLighting noSpots 게이트
  1줄 순수 가산(기본경로 불변, 팀장 수용·OPENWORLD.md) · world.html 실화면(부두·등대·야간 스폰) 정상 ·
  히칭 실측(경계통과 프레임 median 1600→15ms·p99 2060→1170·max 2114→1634, 2회 재현) · 결정론 최종집합 불변.
- 병합: --no-ff(단일 revert 롤백 가능) 커밋 08c272a → main push → deploy.yml Actions **success**
  (run 29752408333). 오픈월드는 여전히 behind-flag(어디에도 미링크) — 라이브 미술관 서비스 무영향.

---

## 2026-07-20 · 해안 연출 패키지 2단계 — 등대 (오픈월드 랜드마크)

감독 결정: 등대(해안 2단계)까지 완성 후 해안 전체 + 성능(스트리밍 히칭 개선)을 한 번에 배포. 부두·
테트라포드와 동형 가산 패턴. world.js/world-gen.js/world-boot.js(오픈월드 전용)만 — 라이브 보호·
방문자뷰·빌더·랜딩·하늘(sky.js)·space-render 무접촉.

### 구현
- **world-gen.js** `genLighthouse`: 경계 육지 파셀 ~15%(독립 LIGHTHOUSE_SALT, 기존 salt와 비충돌)에
  등대 배치 결정. **부두 있는 파셀엔 배치 안 함**(랜드마크 중복 방지 우선순위). 시드 결정론(Math.random 0).
- **world.js** `buildLighthouse`: 테이퍼 원통 탑(홍백 줄무늬 정점색) + 갤러리 난간(토러스) + 갓(원뿔)을
  머지(드로우콜 1) + 등롱(유리방 발광 재질) + **회전 서치라이트**. 물가 경계 방향 모서리에 배치, 탑은
  solid(충돌). shellOnly(원경)는 생략(드로우콜 절약).
- **회전 빛(핵심)**: 실제 SpotLight를 추가하면 방금 만든 라이트 풀(조명 개수 불변) 원칙을 훼손하므로,
  **발광 콘 메시(additive·depthWrite false, THREE.Light 0)**로 구현. update 루프에서 y축 회전만(무료).
  야간에 additive로 도드라지고 주간엔 은은. 조명 개수 불변 → 셰이더 재컴파일 0.
- world-boot.js: def.lighthouse 배선(부두 인자 전달) + 미니맵 등대 마커.

### 결과
헤드리스 swiftshader(등대 파셀 스폰): **drawCalls 39(≤255 여유)**, **programs 13**(라이트풀 12 + 등대 재질
1회 컴파일, 조명 개수 불변 — 라이트 풀 원칙 유지), 콘솔 0. 시각 3각도 확인 — 주간 정면(홍백 탑·발광
등롱·갓·회전빔), 야간(별밤 + 발광 등롱 + 바다로 뻗는 회전 서치라이트), 원경 해안 실루엣. 자작 지오·
절차 텍스처만(외부 에셋 0·실존 상표 0). 결정론(시드 기반).

게이트: executor 배포 스모크 6항 · release-reviewer 교차리뷰 · 부팀장 직접 시각/드로우콜 검증. 브랜치
커밋만 — 팀장 검수 후 감독께 스크린샷 상신, 감독 최종 확인 시 해안1+2+성능 묶어 배포.

---

## 2026-07-20 · 오픈월드 스트리밍 히칭 개선 2단계 — 라이트 풀 (셰이더 재컴파일 제거)

단계1(로드 큐) 실측이 방향을 확정했다: 큐가 경계 순간 프레임은 88~99%↓시켰지만, 소프트웨어 렌더에서
전체 소진 총량이 오히려 급증했다. 근본 원인은 처음 진단한 "조명 개수 변동 → 셰이더 재컴파일"이다.
단계1+2를 묶어 배포한다(단계1 단독 배포 금지).

### 원인
space-render `addRoomLighting`은 파셀 로드마다 실제 SpotLight(작품 최대 10 + 다운라이트 3)를 씬에
추가/제거한다. three.js는 씬 조명 개수가 바뀌면 영향 머티리얼 프로그램을 전부 재컴파일한다. 파셀 경계
통과 = 조명 수 급변 → 대량 재컴파일 스톨. 큐(단계1)는 이 빌드를 여러 프레임에 분산하지만, 과도상태를
매 프레임 render해 재컴파일이 오히려 더 자주 일어난다(프로그램 캐시 10→121로 폭증).

### 개선
씬 SpotLight **총개수를 불변 고정**(라이트 풀).
1. **space-render.js 최소 접촉(순수 가산+게이트)**: `addRoomLighting(group, opts={})`에 `opts.noSpots`
   추가. 기본값(미지정)=라이브(index/visit/builder) 경로 완전 불변. `noSpots`면 AO 접촉그림자는 유지하고
   SpotLight 생성부(작품·다운라이트)만 스킵. 라이브 공유파일 접촉은 이 게이트 1줄뿐.
2. **world.js 라이트 풀**: `MAX_FULL*SPOTS_PER`개 SpotLight를 미리 확보(visible=true·intensity=0·개수
   불변). 로드 시 풀에서 배정(작품·다운라이트 위치·색·강도 = space-render 미러), 언로드 시 intensity=0로
   소등·반납. 미사용 라이트도 visible 유지(false면 개수 변동 → 재컴파일 재발). world.js는
   `addRoomLighting(bldGroup,{noSpots:true})` 호출 + `assignParcelLights`로 풀 배정.
3. **soft 방어**: MAX_FULL(soft 3/일반 5)·OW_ART_CAP(soft 4/일반 10) 축소로 조명 바닥 상승 완화.

### 결과
헤드리스 swiftshader 7파셀 동진(경계 6회, streamAsync, 재현 2회 + 결정론 대조):
- **프로그램 캐시(renderer.info.programs.length)가 스폰 후 상수화** — BEFORE 경계마다 증가(10→48),
  단계1(큐만) 폭증(10→121), **단계2(큐+풀) 상수(10→12, 경계 통과에도 불변)**. 재컴파일 근본 제거.
- **소진 총량(전체 프레임타임 합) 21,114ms(BEFORE) / 64,243ms(단계1) → 2,253ms(단계2)** — BEFORE의
  10.7%로 회복(단계1 큐의 부작용까지 역전). 경계 통과 프레임 max 3290 → 46ms.
- 결정론: before/단계1/단계2-큐/단계2-동기 최종 getLoadedKeys() 집합 동일(라이트 배정은 렌더 결과·로드
  집합 무관).

게이트: executor 배포 스모크(라이브 접촉이라 콘솔0·회귀 필수) · release-reviewer 교차리뷰 · 부팀장 직접
벤치(§10-3 팀장승인). 브랜치 커밋만 — 감독 확인 후 단계1+2+해안 묶어 배포. main 병합 보류.

교차리뷰 조건(결함 1건) 해소: 라이트 풀 크기를 `MAX_FULL`(동시 full 파셀 수)로 잡는데 이를 soft에서
3으로 줄여, 실제 동시 로드되는 십자 5파셀(soft 무관)에 대해 풀(3×7=21)이 고갈 → 일부 건물 무조명이
되던 실제 결함. 수정: MAX_FULL은 soft·일반 모두 5(실제 십자 수와 일치)로 고정, 조명 총량 완화는 파셀당
작품 수(OW_ART_CAP soft 4)로만. soft 풀=5×7=35(고갈 0). soft(swiftshader) 5파셀 동시 로드 실측:
before(MAX_FULL 3) 무조명 건물 1·활성스포트 21 → after(5) 무조명 0·활성스포트 34, programs 12 상수
유지·콘솔 0·결정론 불변. DOWNLIGHTS는 다운라이트 팩터 배열 length에서 유도(드리프트 방지).

---

## 2026-07-20 · 오픈월드 스트리밍 히칭 개선 1단계 — 로드 시간분할 큐 (world.js)

감독 보고: 오픈월드를 걷다 LOD로 새 건물·사물이 나타나는 순간 프레임이 확 떨어진다(히칭). 성능
단계1만 우선 적용(space-render 라이트 풀·섀도 디바운스는 단계2·3). world.js(오픈월드 전용) 단독 수정 —
라이브 보호(main/player/artworks/config)·방문자뷰·빌더·랜딩·sky.js·space-render 무접촉.

### 원인
파셀 경계를 넘는 "한 프레임"에 신규 3~5파셀 로드(가로수 buildDetailedTree+병합, addRoomLighting
조명, 섀도 재베이크)를 전부 동기 완결 — 완화장치(큐잉·시간분할) 전무. 경계 통과 프레임만 프레임타임이
수백~수천ms로 급락.

### 개선
로드를 즉시 빌드하지 않고 큐(loadQueue)에 넣어 update()의 renderer.render 직전 processLoadQueue()에서
프레임당 예산(LOAD_BUDGET_MS: soft 2.5ms/일반 6ms) 내에서만 처리. 언로드는 즉시(저비용) 유지.
- updateStreaming(sync): sync·헤드리스 기본은 즉시 동기(빈 화면·결정론 무회귀), 그 외는 enqueue.
  우선순위 prio=맨해튼거리*10 − dirBonus(진행방향 내적>0이면 +5) → 가깝고 향하는 쪽 먼저.
- processLoadQueue(): prio 정렬 후 최소 1개 빌드, 예산 초과 시 중단(soft는 프레임당 1개). 떠난
  파셀(현재 기준 맨해튼>2·LOD 변동)은 빌드 없이 폐기.
- 초기화·setPosition은 updateStreaming(true)로 동기(스폰·텔레포트 빈 화면 방지).
- 계측 게터 getStats()/getQueueLength() 순수 가산. 헤드리스 큐 벤치용 opts.streamAsync 게이트 추가
  (헤드리스 기본은 동기 유지 → 기존 결정론 테스트·getLoadedKeys 계약 무회귀).

### 결과
헤드리스 swiftshader 7파셀 그리드 동진(경계 6회 통과, 2회 재현) 실측:
- **경계통과 프레임타임 median 1600ms → 15ms(약 99%↓), p99 2060 → 1170(43%↓), max 2114 → 1634(23%↓).**
  경계를 넘는 "그 프레임"에 몰리던 5개 파셀 빌드가 1개로 줄고 나머지는 이후 프레임으로 분산.
- 전체 p99는 after가 오히려 높음(183 → 2027ms) — 조명 SpotLight 개수 변동에 따른 셰이더 재컴파일이
  큐로 여러 프레임에 분산된 특성. 큐는 스파이크를 "분산"하고 재컴파일 "제거"는 단계2 라이트 풀 몫
  (계획서 예측대로). swiftshader는 재컴파일 비용이 과대 표현되는 최악 조건이며, 정상 GPU에서는
  재컴파일 비용이 작아 큐 분산이 순수 이득.
- 결정론: 동일 시드·경로에서 before / after-동기 / after-큐 세 경우 최종 getLoadedKeys() 집합 동일
  (큐는 렌더 순서만 변경, 생성 결과 불변).

게이트: executor 배포 스모크 6/6 · release-reviewer 교차리뷰 · 부팀장 직접 벤치(§10-3 팀장승인 예외).
브랜치 커밋만 — main 병합·배포는 감독 확인 후. 단계2(라이트 풀)는 이 효과 확인 후 별도 발주.

부수: 직전 해안 1단계 해변 슬로프 백페이스 결함(quadGeo winding이 4방향 모두 −y 법선 → FrontSide
컬링으로 위에서 해변 미렌더)을 winding 반전으로 수정(커밋 7944560, 법선 24/24 위 방향·스크린샷 입증).

---

## 2026-07-20 · 해안 연출 패키지 1단계 — 바다 단차 + 해변 + 부두 + 테트라포드 (오픈월드)

감독 지시: "바다는 땅과 같은 높이면 어색하다" + 부두·테트라포드·(2단계)등대. 복셀스식 개방 해안 도시.
1단계는 해안 단차·해변·부두·테트라포드. world.js/world-gen.js/world-boot.js(오픈월드 전용)만 수정 —
라이브 보호(main/player/artworks/config)·방문자뷰·빌더·고정 미술관·랜딩·하늘(sky.js) 무접촉.

### 원인
바다는 월드 전체를 덮는 단일 물 평면(sea, y−0.3)이라 지면(0)과 0.3m밖에 차이가 안 나 "같은 높이"로
보였다. 강도 이 평면을 공유해 바다만 낮추면 강이 깊은 협곡이 되는 구조적 결합이 있었다.

### 개선
1. **바다/강 수면 분리**: 바다 sea를 y−1.2로 낮춰 지면과 1.2m 단차. 강은 파셀 소유 물타일(−0.3)을
   따로 렌더해 도시 운하는 얕게 유지(다리·강물 첨벙 물리 계승). 수면 빛반사(waterY)는 바다 기준.
2. **해변 경사**: 경계 육지 파셀 바깥 가장자리에 모래 슬로프(0→−1.35, 폭 8m). 물리는 beachBands
   선형보간(beachGroundAt)으로 STEP_TOLERANCE(0.65) 안에서 걸어 내려가고 올라온다. 해변 없는
   경계는 급락으로 자연 정지(벽 효과) — 해변이 유일한 하선 경로.
3. **부두**: 경계 파셀 시드(~32%)에 목재 데크판+기둥(파일)+난간을 머지해 드로우콜 1. 데크 상면 0.08
   (STEP_OVER 미만 → 걸림 없이 진입), pierGroundAt 도보 물리 + 난간 solid(추락 방지, 끝단은 바다
   급락으로 자연 정지).
4. **테트라포드**: 자작 4발 소파블록(허브 정이십면체 + 정사면체 4방향 원뿔대 다리) 공유 지오를
   InstancedMesh로 물가에 무더기(드로우콜 1). 시드 결정론 클러스터, 반쯤 잠긴 배치(y=SEA_Y+yRel).
5. **미니맵 해안선**: 그리드 밖=바다색, 경계 셀 모래, 부두 셀 마커.

절차생성은 cellSeed 기반 결정론(genPier/genTetrapods 독립 SALT — 건물 절차생성 무영향). 자작 지오·
절차 텍스처만, 외부 에셋 0, CSP 무변경.

### 결과 (헤드리스 swiftshader 검증)
- 스폰 기본 드로우콜 = **200~238**(카메라 각도별, 임계 255 이하). 해안 요소는 모두 경계/강 파셀
  한정이라 스폰 3×3(중앙) 드로우콜에 무영향 — 바다 위치 변경만.
- 시각 검수: 바다 단차·부두(데크·난간·기둥)·테트라포드(4발 반쯤 잠김)·모래 해변 슬로프·강 운하 확인.
- 도보 물리 실측: 해변 왕복(하강 groundY 0→−0.822, 상승 육지 복귀), 부두 데크 진입(0→0.08)·보행·끝 정지.
- 콘솔 0(peerjs/WS 제외). 오류 없음.

수리한 함정: 테트라포드 머지에서 IcosahedronGeometry(non-indexed)와 CylinderGeometry(indexed) 혼합
→ mergeGeometries 실패. 실린더를 toNonIndexed()로 통일해 해소. 또 InstancedMesh.computeBoundingSphere가
지오 boundingSphere를 참조하므로 TETRA_GEO 생성 시 computeBoundingSphere/Box 선계산.

이번 게이트: 독립 executor 스모크 + release-reviewer 교차리뷰를 병렬 발주했으나 회신 지연 —
팀장 승인하에 §10-3 예외로 스모크 직접 재확인(6항 PASS)·리뷰 diff 자체 검토(3파일 국소·물리 실측·
결정론 확인) 요지를 남기고 브랜치 커밋(main 병합 없음, 팀장이 이 위에서 성능 개선 착수).

---

## 2026-07-15 · ★★ 우리가 이걸 왜 만드는가 — 창업 이야기와 개발 동기

> 이 항목과 아래 '철학' 장은 날짜가 지나도 위로 흘려보내지 않는다. **왜**를 잊을 때 돌아오는 자리다.
> 전문(全文)은 [`docs/FOUNDING.md`](./FOUNDING.md) — 팀 온보딩 필독.

감독은 **국제 무대에서 전시해온 작가**이자 **3D 렌더링·머티리얼 파이프라인을 다루는 엔지니어**다.
작가의 아픔을 몸으로 겪었고, 그 아픔을 걷어낼 기술도 안다 — 이 드문 조합이 이 플랫폼의 방향과
완성도 기준의 출처다.

**각성의 순간.** 코로나기, 감독이 가상 공간에 연 개인전에 낯선 아바타가 걸어와 말을 걸었다 —
"나, 네 작품 실제로 봤어. 뉴욕에서." 가상이 실제를 대체한 게 아니라 실제의 관계를 공간을 건너
이어붙인 순간. 다른 작가의 오프닝엔 수십 명이 모여 작품이 거의 다 팔렸다 — 팬데믹 한복판에.

**우리가 푸는 문제.** 대관료·액자·오프닝·운송·창고비·부스비 — 작가가 전시 한 번에 짊어지는 이
부담을 기술로 걷어낸다. "파라미터가 곧 공간"(저장 0·정적 호스팅·기기별 굽기)은 곧 *작가에게 돈
받지 않고 전시를 열어주는* 공학적 토대다. 그리고 목적은 판매가 아니라 작품이 일으키는 **울림**이다.

**왜 비주얼·쾌적함에 집착하나.** 작품은 홀로일 때보다 공간 속에서 더 크게 말한다 — 공간이 작품의
이야기를 함께 해줘야 울림이 커진다. 3D·조명 베이킹·대기 원근·글래스 HUD는 '기능'이 아니라 작품이
제 목소리로 말하게 하는 **무대장치**다. 사람들은 신기함엔 몰려왔다 금방 질려 떠난다 → 첫 90초에
**생기(生氣)**를 증명해야 한다. **그래서 발코딩으로는 끝낼 수 없다. 기준은 "출시하고 싶어지는 완성도".**

**AI 시대의 답.** AI 에이전트가 공간에 살며 감상·비평·큐레이션·창작을 하면 공간이 죽지 않는다.
**비즈니스.** 웬만하면 무료로 쾌적하게 + 지속가능성(영속성)을 위한 과금 — 두 축. **비전.** 뒤처지지
않고 메타버스 붐을 다시 일으키는, 더 큰 무대로 갈 수 있는 플랫폼.

> 흔들릴 때의 한 문장: **작품이 공간에서 말하게 하라.**

---

## 2026-07-14 · ★ OpenArtShow의 철학 — 어둠은 프레임, 즐거움은 콘텐츠

> "밤하늘이 어두운 건 별을 빛나게 하기 위해서다 — 어둠은 우리의 프레임이고, 즐거움은 그 안에서 빛나는 것들(작품·아야모·사람)이다."

이 장은 날짜가 지나도 위로 흘려보내지 않는다. **방향을 잃을 때 돌아오는 자리**다.

### 우리가 선택한 것 — 프리미엄 다크라는 무대
OpenArtShow는 '프리미엄 다크 몰입'을 브랜드의 무대로 삼는다. 몰입 공간(홈·대문·3D)의
앵커는 깊은 남색빛 다크(`#14151A`)다. 다만 이건 **무대의 색이지, 화면을 온통 검정으로
칠하라는 뜻이 아니다.** 읽는 화면(스튜디오·가이드)은 밝은 아이보리로 간다. 시스템은
처음부터 두 모드다.

### 왜 어둠(무대)인가
- **작품이 빛난다.** 어두운 벽 위에서 이미지와 색이 스스로 발광한다. 미술관이 벽을
  어둡게 칠하고 작품에만 빛을 쏘는 것과 같은 원리다.
- **이것이 차별화다.** 대부분의 메타버스는 가볍고 밝고 네온으로 간다. 우리가 정제된
  무대를 선택하는 순간 "이 메타버스는 뭔가 다르다"가 된다.
- **예술을 진지하게 대한다는 약속.** 정제된 무대는 "여기서는 작품이 주인공"이라는 태도다.

### 즐거움은 어디에 사는가 — 무대가 아니라 그 위의 빛
무대를 더 어둡게 만드는 것으로 생기를 얻는 게 아니다. 생기는 **무대 위에서 빛나는
것들**에서 온다:
- **키포인트 컬러** — 코랄·시안·바이올렛이 조우·축하·입장의 순간에 짧고 강하게 터진다.
  상시 밝기가 아니라 순간 채도다(액센트 면적은 절제, 순간엔 과감).
- **아야모(캐릭터)** — 무대 위에서 더 또렷하고 사랑스럽게 튄다.
- **작품과 사람** — 대비가 만든 발광, 함께 걷는 순간.

### 지켜야 할 운영 원칙
- **첫 90초에 생기를 증명한다.** 입장·온보딩의 순간에 아야모와 경쾌한 모션을 최전면에.
  첫인상에서 생명력을 보이면 무대는 '무게'가 아니라 '무대'가 된다.
- **모션은 살아 있어야 한다.** 이징에 탄성·바운스를 허용한다. 럭셔리는 느림이 아니다.
- **즐거움의 순간엔 키포인트 컬러를 순간 투하한다.** 조우·축하·입장에 코랄·시안을
  0.3~0.6초 짧고 강하게.
- **온기의 예외는 함부로 늘리지 않는다.** 꾸미기(캐릭터 디자인) 모달의 따뜻한 무드는
  의도된 예외다.

### 흔들릴 때의 규칙
톤을 바꾸고 싶은 충동이 올 때, 먼저 맨 위의 한 문장으로 우리를 붙잡는다. 방향 전환은
**감이 아니라 데이터로만** 연다 — "무거워서 떠난다"를 실측(첫 세션 이탈률·체류시간)이
보여줄 때 재심한다.

### 이 결정의 출처
2026-07-14, 감독의 물음("다크가 고급스러운데 즐거움엔 무겁지 않을까")에서 출발해
부팀장·디자이너·리서처의 검토를 거쳐 팀장이 판정했다. 어둠은 무대, 화면의 생기는
키포인트 컬러 — 이 둘을 섞지 않는다.

---

## 2026-07-19 · 정문 포털 — 라이브 미술관 남측 입구에서 오픈월드로 (감독 결재, 부팀장 · 브랜치 한정)

### 원인

하늘 엔진 배포 후속 — 고정 라이브 미술관과 오픈월드를 잇는 "정문". 미술관 남측 정문(유리
커튼월 입구 개구부) 앞에 오픈월드 입구 게이트를 세워, 방문자가 걸어서 `world.html`로 넘어가게 한다.
(하늘 발주 때 "정문 포털 별도 발주 예정"으로 스코프 제외했던 그 작업.)

### 분석 — 가산형 독립(라이브 런타임 무변경 사수)

라이브 미술관 런타임(main/player/artworks/config/scene/ui)은 서비스 중이라 함부로 못 건드린다.
유일 접점은 `main.js`의 **순수 노출 1줄** `window.__museum = { scene, camera, renderer }`(§10-4 팀장
게이트 범위) — 앞뒤 로직 무변경. `portal.js`가 이 객체를 폴링해 씬에 게이트만 `scene.add`한다
(기존 오브젝트 변경/제거 0). index.html은 portal.js 로드 1줄 가산.

### 개선

`portal.js` 신규 140줄(가산형 독립 모듈):
- 시안 발광 게이트 프레임 + 야간 도시 스카이라인 프리뷰(절차 텍스처, 외부 리소스 0) + 별·달
- 바닥에 정방향 한글 "오픈월드" 발광 라벨(누워 읽히는 방향)
- 근접 안내(hintEl) + 클릭/통과 시 `location.href = 'world.html'`(상대경로 same-origin, navigated 중복 가드)
- 남측 입구 개구부(x∈[-1.5,1.5])는 유리 없는 구간이라 프리뷰가 유리 뒤에 가리지 않음(scene.js buildSouthFacade 정합)

### 게이트 (§10 — main 병합 금지 상태)

- **executor 독립 스모크: 6/6 PASS**. 단 "ui.js 라이브 진입점 변경" FAIL 보고는 **오탐** —
  ui.js 변경 커밋은 전부 main 계보 꾸미기모달(1dfb51d 등)이고 정문 포털 diff(index/main.js/portal.js)에
  ui.js 없음, 43fc2e7 이후 ui.js 변경 0. executor가 라이브 스냅샷을 기준선으로 잡아 main에 이미
  병합된 변경을 오귀속. release-reviewer의 `origin/main...HEAD` 정밀 diff로 ui.js 바이트 무변경 재확인.
- **release-reviewer 교차리뷰: 조건부 승인**. P0/P1 없음, 라이브 진입점 바이트 무변경·CSP·자기완결·
  배포 매니페스트 이슈 없음. 드로우콜 +3(프레임·프리뷰·라벨; 라벨 DoubleSide 투명 2패스면 실측 +4).
  **P2 조건**: 모바일 이동 조이스틱과 포털 근접 판정이 같은 캔버스 타겟(domElement)을 공유 → 근접 반경
  내 짧은 탭이 오탐 네비게이션을 낼 수 있음. **main 병합 게이트에서 "근접 반경 내 조이스틱 짧은 탭 →
  오탐 미발생" 실측 보강을 필수 조건**으로 남긴다(문제 없으면 승인 전환, 재현 시 identifier 배제 보강).
- **스크린샷 실화면 시각검수 4종**(감독 제출용): 정면(WIP 잔여 "로비 잔상" 해결됨) / 바닥 라벨(정방향
  "오픈월드" 선명) / 근접(도시 프리뷰 클로즈업) / 모바일(세로 뷰포트 정상). 결함 없음.
- **main 병합 금지**(팀장·감독 게이트 + P2 미충족). 이번 종결은 브랜치 보존·기록·보고 한정.

### 배운 것

스모크의 라이브 진입점 규칙은 **기준선을 정확히 잡아야** 오탐이 없다 — "직전 배포(라이브)" 대비로
잡으면 그 사이 main에 정상 병합된 변경(꾸미기모달)을 이번 작업의 위반으로 오귀속한다. 진위는
`origin/main...HEAD`(공통조상 이후 이 브랜치 변경만) 기준으로 갈린다.

---

## 2026-07-19 · 정문 포털 + 하늘 2차 개선 라이브 배포 (감독 승인, 부팀장 병합)

### 개요

감독 라이브 배포 승인 — 정문 포털(고정 미술관 → 오픈월드 입구 게이트)과 하늘 2차 개선(수면 빛반사·
노란 달·별 밝기/색 차등·조각구름)을 main 병합·배포. 라이브 미술관 런타임은 main.js가 `window.__museum`
`{scene,camera,renderer}`를 읽기전용 노출하는 **1줄**만 가산(로직 무변경), `portal.js`는 이를 폴링해 씬에
입구 게이트를 더하는 **가산형 독립 모듈**(자작 지오·절차 텍스처, 외부 에셋 0). index.html은 portal.js 로드 1줄.

### 게이트

- **executor 독립 스모크 6/6**(매니페스트 162→164, CSP·콘솔·가로넘침 OK — portal.js 추가에도 index 콘솔 0)
- **그래픽**: 라이브 진입점 무변경 입증(main.js·index.html 가산만, player/artworks/config/scene/ui/visit/
  builder/landing 바이트 무변경) → visit/builder 픽셀·index 씬그래프 회귀 0. world.html 하늘 4종+기본진입
  야간 실화면 검토. 포털 4컷(정면·근접·바닥라벨·모바일) 실화면 검토 — 시안 발광 프레임·야간도시 프리뷰·
  정방향 바닥라벨("오픈월드")·근접 힌트 정상.
- **드로우콜**: 스폰 기본 야간맑음 **255**(임계 이내), day/sunset 254, 오로라 259(신 모드 이벤트 — 팀장 서명
  예외), 포털 **+4**(예산 +5 이내). sky.js 2차개선으로 기준선 252→255 상승(OPENWORLD 예외 문안 갱신). 콘솔 0.
- **P2(모바일 조이스틱 근접 탭 오탐)**: 재현 불가 확정 — 포털(index)·조이스틱(world)은 **다른 페이지**,
  포털 탭은 near 3.6m + 캔버스 target 한정 + 드래그 8px 배제로 방어. 모바일 375×667 실측 네비 0.

### 결과

`--no-ff` 병합(단일 revert 롤백 유지) `d90458f` → `deploy.yml` Actions **success**. 라이브 배포 완료.
역병합(origin/main 108de62, #8·#9 유입)은 코드 충돌 0, 생성물은 재빌드로 해소.

---

## 2026-07-19 · 오픈월드 하늘 엔진(sky.js) 배선 + 감독 신 모드 패널 (팀장 발주, 부팀장 완결)

### 원인

감독 승인된 하늘 연출 엔진 `sky.js`(시간대×날씨×이벤트 절차 생성)를 오픈월드에 배선하고,
감독 전용 "神 모드" 연출 패널을 다는 발주. 라이브 진입점(world.html/world-boot.js/world.js)
변경이라 §10 배포 게이트(독립 스모크 + 교차리뷰) 대상.

### 분석 — 배선 3접점과 함정

- `sky.js`는 `sun`·`hemi`·`sky`(돔) 3개를 주입받아 조명·fog·clearColor·이중 돔 크로스페이드를
  **자기 소유로 제어**한다. world.js는 최소 침습 배선만 하면 된다.
- **함정 1 — hemi 참조 부재**: world.js는 헤미스피어 라이트를 `scene.add(new …)`로 익명 추가해
  변수 참조가 없었다. sky.js에 주입하려면 참조 확보가 선결 → `const hemi = …; scene.add(hemi)`.
- **함정 2 — 태양 방위 정합**: 기존 `applyPose`는 태양을 고정 오프셋(+34,58,+20 ≈ 거리 70)으로
  플레이어 추종시켰다. sky.js는 그림 속 해·달 방위와 빛 방향을 일치시키는 `getSunDir()`를 제공 →
  거리(70)는 유지하고 방향만 `getSunDir()`로 교체(섀도 카메라 far 130 이내, 추종 유지).
- **함정 3 — dispose 이중 회수**: sky.js가 sky 돔의 지오/맵을 고해상 구·캔버스 텍스처로 교체하고
  `track()`으로 자기 소유. world.js dispose의 기존 `sky.geometry.dispose()`/`map.dispose()`와
  겹치나 three.js dispose는 idempotent라 무해 → skySystem.dispose()를 sky 돔 정리 앞에 배치.
- **soft 분기**: `gpuInfo.soft`를 그대로 전달 — 크로스페이드 스냅·저해상 돔·강수 입자 축소.

### 개선

1. **world.js 배선(5접점, +32줄)**: sky.js import / hemi 참조 확보 / pos 초기화 후 `createSkySystem`
   생성(getPos=()=>({x,z}), soft) / applyPose 태양방위 `getSunDir()×70` / update 루프 `skySystem.update(dt)`
   / dispose 정합 / 반환 객체에 `sky` 노출(패널 제어용).
2. **神 모드 패널(world.html + world-boot.js)**: HUD `.plate` 통일 접이식 패널 — 시간대 3+자동 /
   날씨 4 / 이벤트 2(무지개·오로라) / 광과민성 보호 토글. 활성 상태 시각 표시는 `get()`으로 되읽어
   조합 보정(무지개=주간·일몰 맑음 등) 반영. URL 초기 하늘 `?sky=&weather=&fx=`는 SKY_TIMES/SKY_WEATHERS
   **화이트리스트 검증**(밖 값 무시 — 보안). 로직은 전부 world-boot.js(인라인 스크립트 금지·CSP 무변경).
3. **결함 3건 수정**:
   - (헤드리스 실측) 神 모드 패널이 클릭 유도 오버레이 `#enter`(z30)에 가려 감독이 조작 불가 →
     `.god{z-index:40}`로 오버레이 위에 배치(포인터락 해제 상태에서도 상시 접근).
   - (헤드리스 실측) 스폰이 건물 실내라 하늘이 프레임에 없어 검증 불가 → 하네스를 야외 개활+상방 시선으로 교정해 재촬영.
   - **(교차리뷰 P1 회귀) 섀도 프리즈 고착**: world.js는 `shadowMap.autoUpdate=false`(정적 씬 최적화)라
     섀도 리베이크가 플레이어 8m 이동 전용이었다. 태양 방위를 神 모드/URL로 바꿀 수 있게 되면서, 시간대·날씨
     전환 시 태양·조명색은 즉시 바뀌지만 **그림자는 옛 방향으로 고착**(8m 걷기 전까지)되는 회귀가 생겼다.
     검수관이 vendor three.js `WebGLShadowMap.render`(autoUpdate=false ∧ needsUpdate=false면 스킵)까지 확인해
     적출. → sky.js가 이미 제공하는 `onApply(state,L)` 훅에 `requestShadowBake()`를 연결해 set() 완료 시
     다음 프레임 1회 재베이크(조명-그림자 방위 즉시 정합). 초기 `set(fade0)`의 즉시 onApply가 `shadowBakeAt`(let)
     TDZ를 밟지 않도록 skySystem 생성을 `requestShadowBake` 선언 이후로 재배치. 헤드리스로 시간대/날씨/이벤트
     변경 시 `needsUpdate=true`, 무변경 시 false 유지 확증.

### 결과 (헤드리스 swiftshader 실측)

| 하늘 상태 | 드로우콜 | 임계 255 |
|---|---|---|
| 주간/일몰/야간 맑음, 먹구름 | 252 | ✅ |
| 비, 눈 | 253 | ✅ |
| 무지개(주간·일몰) | 252 | ✅ |
| **오로라(야간맑음)** | **256** | ⚠ +1 (팀장 예외 승인) |

- **배선 회귀 0**: 배선 전 기본 드로우콜도 252(stash 대조 실측) — 하늘 배선이 기본을 안 늘렸다.
  오로라 +4는 승인된 sky.js 2겹 커튼(transparent+DoubleSide 메시당 2패스) 고유 비용.
  → 임계 255는 스폰 기본 상태 기준, 신 모드 이벤트 일시 초과는 **팀장 서명 수용**(OPENWORLD.md 기록).
- **시각 검토 통과**(코드 아닌 실제 화면): 주간(파란 하늘·fBm 조각구름·태양 원반), 일몰(보라~살구
  노을 그라디언트·웜톤 구름), 야간(청보라 밤하늘·은하수 밴드·광망 별), 비(회색 먹구름·사선 빗줄기).
  이음새·조명 불일치·패널 겹침·미니맵 가림 결함 없음. 가로수 잎 색이 시간대별로 정확히 반영(조명 정합).
- **패널 전환**: day→일몰 크로스페이드 완료 확인, 활성 표시 정확, 무지개/광과민성 토글 동작. 콘솔 에러 0(peerjs 제외).

### 게이트 (§10)

- **독립 executor 스모크 6/6 PASS**(생성기·매니페스트·링크·콘솔·가로넘침·CSP).
- **검수관 교차리뷰**: P1 블로커 1건(섀도 고착) 적출 → 수정·재검증 후 해소. P2 권고 2건은 후속:
  ① "神 모드=감독 전용" 라벨과 달리 접근 게이트 없음(로컬 렌더 전용이라 보안 치명 아님 — 라벨/정책은
  감독 확인 사안) ② onApply 향후 가로등·창 발광 연동 여지(P1 수정으로 훅은 이미 배선됨).

### 배운 것

시각검토와 코드 교차리뷰는 **상호 보완**이다. "코드가 맞아 보인다"의 함정 2건(z-index로 패널이 오버레이에
덮임 / 스폰 실내로 하늘 검증 불가)은 diff론 안 잡히고 **실제 화면 스크린샷**에서만 드러났다. 반대로 P1 섀도
고착은 soft 모드에 그림자가 없어 스크린샷으론 안 드러나고 검수관의 **vendor three.js 소스 추적**으로만 잡혔다.
어느 한쪽만으로는 통과시켰을 결함들이다.

### 병합·배포 (감독 결재 2026-07-19)

감독 결재로 **신 모드 전체 공개 + 기본 하늘 야간 맑음**(별하늘) 확정 — 검수관 P2(감독 전용 라벨 vs
접근 게이트 없음)는 "전체 공개"로 해소. 팀장 후속 3건(야간 별하늘 품질 결함 3건 수정 등) 반영해 main
병합. `origin/main` 역병합으로 생성물 충돌(valuation) 선해소(브랜치 최신값 취함 + 재빌드), 병합 전
게이트 재실행 — executor 독립 스모크 6/6, world.html 하늘 4종+기본진입 야간맑음 실화면 시각검토 통과,
라이브 진입점(main/player/artworks/config/visit/builder/ui/index) 바이트 무변경 → visit/builder 픽셀·
index 씬그래프 회귀 0. `--no-ff` 병합(단일 revert 롤백 유지) `43fc2e7` → `deploy.yml` Actions success.

### P2 후속 실측 — 모바일 조이스틱 근접 탭 오탐 (재현 불가, 해소)

팀장 P2 지적(모바일에서 좌하단 조이스틱 조작이 포털 탭으로 오인될 리스크)을 헤드리스 모바일 뷰포트
(375×667, hasTouch)로 재현 시도. 결과: 조이스틱 짧은 탭·드래그 모두 **네비게이션 0·popup 0·URL 불변**,
조이스틱은 정상 작동(전진 드래그 이동 0.60m). 현재 world.html/world-boot.js에 **포털 클릭→네비게이션 판정
코드가 없어** 오탐 경로 자체가 부재 → 재현 불가로 해소(추측 수정 금지 원칙 준수, 코드 무수정). 정문 포털
(별도 발주) 도입 시 조이스틱 히트박스 제외를 함께 설계하도록 OPENWORLD.md 리스크에 선제 메모.

---

## 2026-07-19 · 오픈월드 저사양 방어 이식 — 포테이토 폴백 + 섀도 이벤트 베이크 (팀장 지시, 부팀장 완결)

### 원인
랜딩 베타로 개방된 오픈월드(`world.js`)가 저사양·소프트웨어 렌더링 기기에서 심각한 저성능.
성능 전문가 확정 실측: 4x 스로틀+swiftshader에서 미술관은 walk 100프레임 5초 완주하나
오픈월드는 미완주. 원인 — `world.js`에 미술관 `main.js`의 저사양 방어 3종이 통째로 빠져 있었다.

### 분석
`main.js` 코드 대조: (1) `probeGpu()` 소프트웨어 감지 시 antialias off·픽셀비율 0.7 캡·
shadowMap off·NoToneMapping·fog null·~30fps 프레임 캡, (2) 섀도맵 1회 베이크 후
`autoUpdate=false` 프리즈("프레임 62%가 섀도 패스"). `world.js`엔 전부 부재.

### 개선
`main.js`는 라이브 보호 파일 — 무수정. `probeGpu`/`SOFT_GPU_RE`를 `world.js`에 **동형 복제**
(출처 주석: 원본 변경 시 동기화). soft 감지 시 포테이토 폴백 5종 이식(AA·픽셀비율·톤매핑·fog·프레임캡).
섀도는 오픈월드 태양이 플레이어 추종이라 완전 프리즈 불가 → **이벤트 기반 재베이크**(초기 1회·
파셀 로드/언로드·마지막 베이크에서 8m 이동)로 설계, 하드웨어 GPU 포함 전체 적용. 이동·충돌·지면·
스키마 로직은 한 줄도 미수정(렌더 경로만 손댐).

### 결과 (동일 조건 375×667·dpr2·CPU 4x·swiftshader, `update()` 실사용 경로)

| 지표 | 이식 전 | 이식 후 | 변화 |
|---|---|---|---|
| walk 프레임당 | 458ms (2.2fps) | 19.5ms (51fps) | **−96%** |
| walk 100프레임 | ~45.8초(미완주급) | **1.95초 완주** | 완주 전환 |
| 정지 프레임 | 12.4ms (80fps) | 9.0ms (111fps) | +38% |
| soft 감지 | 없음 | swiftshader→soft ✓ | 신규 |

- 기능 회귀 0: 강 첨벙(groundY −0.4)·계단 등반(groundY 0→3.6)·남문 진입(7.65m) 실측 정상,
  스폰 드로우콜 252, `index`/`visit`/`builder` 콘솔 0.
- 검증 한계: 검증 환경이 swiftshader 전용이라 **하드웨어 GPU의 섀도 프리즈 시각 효과는 실측 불가** →
  코드 정합으로 보증(정상 GPU 경로는 `shadowMap.autoUpdate`만 변경, 나머지는 조건부라 이식 전과 동일).
- `wss://0.peerjs.com` 콘솔 에러는 에이전트 프록시의 P2P 시그널링 차단 노이즈(이식 전에도 동일 발생) —
  이식과 무관, GitHub Pages 실환경 정상.

---

## 2026-07-19 · 오픈월드 — 타당성 스파이크에서 베타 개방까지

고정 미술관(방 하나) 밖으로 걸어 나가 여러 전시가 한 도시처럼 이어지는
"오픈월드"를 타당성 검증부터 라이브 베타 개방까지 한 사이클로 마쳤다.
전 과정 behind-flag(`world.html`을 어디에도 링크하지 않음)로 진행했고,
개방 여부만 감독·팀장 게이트에서 결정했다.

### 걸어온 길

1. **타당성 스파이크** — 파셀(구획) 스트리밍으로 넓은 공간을 나눠 로드·언로드하는
   구조가 정적 호스팅·자기완결 원칙 안에서 성립하는지부터 확인. 스파이크는
   근거리 직교 풀로드 + 원거리 대각 셸(임포스터) LOD.
2. **정적 100방 월드** — 10×10 격자에 직원 NPC 전원 배치. 이어서 방 테마를
   전시·정원·라운지·미디어·조각·젠으로 다양화해 "같은 방 반복" 인상을 걷어냄.
3. **실시간 멀티플레이 데모** — 기존 미술관과 같은 PeerJS 공용 브로커로 "같은
   월드 접속자끼리 아바타 상호 가시성"을 0원으로 실증(아바타 위치는 저장 안 함).
4. **다층·개방 도시 전환** — 층 쌓기(셸 층 루프 + 계단 지면물리)를 얹은 뒤,
   방을 벽으로 가둔 격자에서 하늘·길·강·바다·다양한 건물이 트인 개방 도시로
   전환. 강·바다는 `map.offset` 스크롤만으로 물결을 흘려 드로우콜 증가 0.
5. **거리 연출·보안 선결** — 가로수·가로등·벤치·화분 절차 배치, 거리를 배회하는
   경량 앰비언트 NPC(streetWalkers). 그리고 플래그 해제에 앞서 보안 선결 4건을
   먼저 닫았다.
6. **main 통합·베타 개방** — 라이브 미술관 정비를 브랜치로 역머지해 정합을 맞추고,
   거리 나무를 미술관 디테일 트리로 교체(감독 지시). 감독 결재로 랜딩에
   **오픈월드 (베타)** 진입 카드 하나만 노출 — 이것이 유일한 라이브 접점이다.

### 게이트가 실제로 작동한 두 장면

- **보안 검토의 CSP 블로커 적발.** `world.html`이 앱 로직을 인라인 `<script>`로
  들고 있어 `script-src 'self'` 아래에서 실행이 막히는 것을 플래그 해제 준비 단계에서
  선제 적발. 앱 로직을 `js/world-boot.js` 외부 모듈로 추출해 인라인 없이 동작하도록
  고치고(`three` bare specifier 해석에 필수인 importmap 한 줄만 sha256 해시로 예외 고정),
  PeerJS 시그널링은 `connect-src`를 `0.peerjs.com`만 허용하도록 좁혔다. 라이브
  노출 전에 CSP를 깨는 코드가 걸러졌다.
- **드로우콜 게이트의 병합 중단.** 스폰 직후 드로우콜에 자체 여유 목표 상한 230을
  두고 머지 게이트에서 검사한다. 거리 나무를 미술관 디테일 트리로 교체하자 나무당
  부품이 많아 스폰 드로우콜이 상한을 넘었다 → 게이트가 병합을 세웠다. 팀장 서명으로
  임계를 라이브 실증 근거에 맞춰 상향하고, 파셀 내 잎(알파) 재질 병합으로 값을 다시
  낮춰 실증 상한 이내임을 확인한 뒤에야 통과시켰다.

| 지표 | 값 | 기준 |
|---|---|---|
| 오픈월드 정중앙 5방 풀로드 드로우콜 | 146 | 고정 미술관 255 대비 안전 |
| 나무 교체 후 스폰 드로우콜(미완화) | 263 | 여유 목표 230 초과 → 게이트 중단 |
| 잎 재질 병합(옵션 A) 적용 후 | 251 | 상향 임계 255 이내 → 통과 |
| 게이트 임계 | 230 → 255 | 255 = 고정 라이브 미술관이 실사용 중인 실증 드로우콜 |

### 남긴 규율

- 라이브 공유 파일(`npc.js` 등)을 오픈월드가 함께 쓰는 지점은, 고정 미술관 경로에서
  실제로는 실행되지 않는 가산·무영향임을 코드로 입증하고 씬그래프 구조 비교로 회귀를
  검증한 뒤에만 수용했다(`index.html` 픽셀 비교는 NPC 비결정성으로 요동해 금지, 구조
  비교로 대체). 이후 공유 파일 접촉 시 동일 게이트 의무.
- 플래그 제거·라이브 노출은 언제나 감독·팀장 게이트. 이번엔 랜딩 베타 카드 한 장까지만
  열었고, 오픈월드 본문은 여전히 behind-flag 규율 아래 있다.

---

## 2026-07-19 · ★ 라이브 미술관 정비 — 외부 이미지 자기완결화 + GPU 경고 제거 (감독 지시)

두 건을 라이브 고정 미술관(`syhongart 개인전`)에 반영했다.

### 1) 작품 12점 외부 이미지 → 자작 절차적 로컬 아트 (bbc8290)
**원인.** 작품 aw-01~12가 외부 스톡사진 `https://picsum.photos/...`를 쓰고 있어
"외부 호스트 0"(자기완결)·프라이버시(방문자 브라우저가 외부 도메인으로 직접 요청 →
관람객 접속정보 유출) 규율을 위반. 조사 결과 위반은 picsum 12개가 유일(HDRI·폰트·벤더·
featured 2점은 이미 로컬)이었다.
**개선.** 감독 결정으로 자작 절차적 추상 아트 12점을 캔버스로 생성(각 작품 제목·설명
무드 기반 팔레트 — 능선·강줄기·안개·항구·노을 등, DESIGN.md 팔레트 B 조화). 5단
파이프라인(그라디언트→다중 워시→구조 모티프→그레인→비네트)으로 "한 작가의 연작" 통일감.
`web/assets/gallery/aw-01~12.jpg`(각 ≤180KB). `artworks.js`(폴백)·`syhongart.json`(1순위)
두 파일의 imageUrl을 로컬 상대경로로 동시 교체 — 보호파일 artworks.js는 값·PICSUM 정의
제거만, 로직 무변경.
**교훈.** 공용 함수(비네트)의 방사 감쇠가 구조 약한 1점(aw-05)에서 "중앙 원"으로 노출돼
플레이스홀더처럼 읽혔다 → 공용 함수는 두고 그 호출부만 비대칭 선형으로 교체 + 전용 모티프
추가로 해결(팀장 육안 판정 → 리튠).

### 2) 소프트웨어 렌더링 GPU 경고(모달·배지) 제거 (74058bd·53933a6)
**원인.** GPU 가속 꺼짐/원격데스크톱 등 소프트웨어 렌더링 감지 시 "그래픽카드 없이 그리고
있어요 — 몹시 느립니다" 큰 모달 + 좌하단 "소프트웨어 렌더링 모드" 배지가 작품 감상을 가렸다.
**개선.** 감독 지시로 둘 다 비활성(`showGpuNotice(…,false)` 호출 + `#lu-potato-badge`
생성 블록 제거). **유지**: (a) WebGL 자체 불가 시 치명 안내(fatal=true) — 없애면 3D가 안
뜨는 빈 화면만 남음, (b) `gpuInfo.soft` 기반 저사양 자동 경량화(해상도 배율·그림자 off·
무톤매핑·fog 삭감·potato 모드) — 경고 표시만 껐고 성능 최적화는 그대로.

**게이트(공통).** 감독 승인(보호파일 팀장 서명) → executor 독립 스모크(picsum 외부요청 0·
12액자 로드·배너/배지 미표시·potato 유지·fatal 온전 실측) → 검수관 교차리뷰 승인(보호파일
로직 무변경·2파일 동기화·최적화 무손상) → 팀장 실물 육안(컨택트시트·미술관 액자) → 감독
실물 보고 → deploy Actions success.

---

## 2026-07-18 · ★ 스튜디오 외부 이미지 자동 임베드 + 발행 누수 차단 (감독 지시, 7b360f3)

**원인.** 작가가 작품 이미지를 외부 URL(예: 남의 서버 그림 주소)로 넣으면 두 문제가 생긴다.
(1) 원본 서버가 그림을 내리면 전시가 깨진다(영속성 위반). (2) 방문자 브라우저가 그 외부
주소로 직접 요청 → 관람객 접속 정보가 바깥 사이트로 샌다(프라이버시). "외부 호스트 0" 규율과도
충돌. 감독 결정: **외부 URL을 우리 쪽으로 다운로드해 전시 데이터에 내장(dataURL), 실패하면
직접 업로드 안내**, 그리고 **왜 이렇게 하는지 도움말로 노출**.

**개선.**
- 임베드: URL 확정(blur/Enter) 시 외부 URL이면 `<img crossorigin=anonymous>` → canvas
  (MAX 1400px·매트 `#efece6`·jpeg 0.85) → dataURL로 교체. "✓ 저장됨 · 원본이 사라져도
  전시가 유지돼요" 상태 노출.
- 실패 폴백: CORS 거부·CSP 차단 등으로 캔버스가 오염되면 팝업("이미지를 자동으로 가져올 수
  없어요" + '직접 업로드'/'닫기') → 파일 업로드로 대체.
- 도움말(ⓘ): "이미지는 이렇게 보관해요 — …원본이 사라져도 전시가 유지되고, 관람객의 접속
  정보가 바깥 사이트로 새지 않게 지켜줍니다." 프라이버시 이유까지 설명.
- **발행 누수 차단(이중 관문).** 검수관이 레이스 컨디션을 블로커로 지적: 타이핑 즉시
  `imageUrl`에 외부 URL이 들어가고 다운로드는 완료돼야 교체되므로, "✓ 저장됨" 전에 발행하면
  외부 URL이 공유링크/JSON에 샌다. → (a) `validateForExport`가 외부 URL 잔존 시 발행 차단
  ("아직 저장되지 않은 이미지가 있어요…"), (b) `toArtworkEntry`가 발행 단계에서도 외부 URL이면
  빈 문자열로 방어. 우회 경로 없음을 grep으로 확인.
- CSP: 인라인 스크립트 sha256 핀 재계산(브라우저 위반 리포트가 알려준 정답값 채택 — sed/정규식
  오프바이원 함정 실증), `img-src`에 `https:` 유지(입력 중 미리보기용).

**결과.** 게이트 통과 — executor 독립 스모크 6/6(실브라우저 로드 + blocker 시나리오),
검수관 재리뷰 승인(이중 관문·CSP 해시 실측 재검증). 팀장이 실물 4장 육안 확인(임베드 성공·
실패 팝업·도움말·발행 차단) 후 감독 보고. deploy Actions run #109 success. 변경분은
`web/studio.html` 단일 파일, 보호 4파일·deploy.yml 무변경.

**교훈.** 비동기 상태(다운로드 진행 중)를 최종 산출물에 그대로 흘리면 프라이버시 목적이
무너진다 — 검증 관문은 "완료 상태"만 통과시키고, 최종 직렬화 단계에 방어를 한 겹 더 둔다.

---

## 2026-07-18 · ★★ 빌더 조작 통일 — 걸어서빌드 접고 조망 자유이동으로 (c342319)

감독 방향전환: "걸어서 빌드"(아바타가 공간을 걸으며 배치)를 여러 차례 다듬다(벽 파묻힘·시야각·아바타 반투명·1인칭) 결국 접었다. 아바타를 시야에서 치우고 **조망(orbit) 카메라 자유이동 + 마우스/터치 배치**로 조작을 통일. 걸어서빌드 코드는 진입 버튼(#bWalkToggle)만 숨겨 behind-flag로 보존(플래그 한 줄로 복원 가능).

### 통일된 조작
- **배치**: 마우스(PC)/터치(폰) 클릭 (기존 pickPlacement→addPart 재사용)
- **PC 시점**: 방향키 카메라 팬 + 휠 거리줌 (기존)
- **폰 시점**: 조이스틱 카메라 팬(`orbitJoy` 신규 — 렌더루프 연속 팬) + 핀치 거리줌
- 줌은 PC·폰 모두 거리(rad) 줌으로 통일(FOV 줌 미도입).

### 게이트
팀장 헤드리스 검증(walk 버튼 숨김·orbitJoy 팬·모바일 조이스틱 팔레트 비겹침) + executor 스모크 6/6 + release-reviewer 승인. 라이브 배포 완료.

---

## 2026-07-18 · ★ 보안 종합감사 + 즉시 보완 3건 (감독 지시, 팀장 자율 완결)

security-officer 종합 감사 결과 **블로커·치명 0**. 방어 설계는 견고(P2P 3종 방어선·저장 역직렬화 화이트리스트 재구성·textContent 렌더). 즉시 보완 3건을 게이트 거쳐 배포.

- **A-1 landing 프로필명 XSS 이스케이프** (30cf0db): `renderNav`가 `p.name`·`p.initial`을 `innerHTML`에 직접 삽입 → 같은 파일 갤러리 카드처럼 `escapeHtml()` 적용. 실 OAuth 연동·`lu-auth-profile-v1` localStorage 조작 시의 **잠복(저장형) XSS** 차단(순수 출력 이스케이프, 회귀 없음).
- **A-2 deploy.yml 서드파티 액션 SHA 핀** (8001ade): `actions/checkout`·`actions/setup-node`·`peaceiris/actions-gh-pages`의 태그핀(@v4)을 **커밋 SHA 핀**으로 교체(태그 탈취·강제이동에 의한 배포 파이프라인 오염 차단). 배포 성공으로 무결성 실증.
- **B-3 CSP 메타 5페이지** (9f3c19a): CSP 없던 landing·studio·guide·about·design에 CSP 추가(`default-src 'self'`, 인라인 script는 sha256 핀, `object-src 'none'`·`base-uri 'none'`). 검수관이 studio의 `img-src https:` 누락(작가 외부이미지 미리보기 회귀) blocker를 발견·수정.

**감독 결정 대기(B-1·B-2)**: artworks.js 데모 갤러리의 picsum 외부이미지(B-1, 보호파일), safeMediaUrl의 외부 URL 허용 + index.html CSP `https:` 완화(B-2, 위험수용§8-5) — "외부호스트0" 규율·외부 이미지 정책 변경이라 감독 판정 사안.

---

## 2026-07-18 · ★ QA/SOLID 감사 — 아키텍처 모범 확인, 부채 지도화 (감독 지시)

프런트엔드 SOLID 감사. **아키텍처 경계·의존구조는 모범**(보호↔비보호 import 0·순환 0·`normalizeSpace`/`normalizeChibi` SSOT 전량 경유). 부채는 두 축에 집중.

- **SRP(초거대 함수)**: `chibi.js buildChibi`(1374줄)·`ui.js injectStyles`(CSS 1636줄)·`builder.js createBuilder`(557줄) 등.
- **OCP/DRY(형태 지오메트리)**: `space-render.js partGeo`↔`partAccent`의 **형상 상수 수기 이중보유**(cake·mirror 등 6+쌍, 한쪽만 고치면 정합 붕괴)·거대 switch·chibi 종족 문자열 하드코딩·tiger 死코드.

### 4단계 계획(ROI·리스크 순)
1. **안전망**(선행): 순수함수 단위테스트(normalize·snap·artworkSize 등) + 헤드리스 렌더 스모크 재사용화 — 리팩터 전 회귀 그물.
2. **(A) 저리스크 국소**(비보호): tiger 死코드 제거·이동상수/저장키 SSOT 추출·injectStyles CSS 외부화 등.
3. **(B) 구조**(게이트): partGeo↔partAccent 형상상수 공유 spec(최우선)·switch→디스패치·chibi 종족 레지스트리·createBuilder 분해.
4. **(C) 보호4파일**(감사·사전서명): main.js init/animate 분해·config artworkSlots 좌표 파생화.

---

## 2026-07-16 · 빌더 개방 — 소품 4배치·진입점·모바일 경량 빌더 (부팀장 자율, 감독·팀장 게이트)

빌더를 유저에게 완전히 열었다. 이전엔 behind-flag라 아무도 못 썼는데, 이제 **PC·모바일 모두 프리셋 골라 31종 소품으로 전시장을 만들고 공유**한다. "룸 빌드가 UI에 없다"던 지점이 해소됐다.

### 소품 대확충 4배치 (12→31종)
감독 "전부 순차, 배치별 게이트". 자작 지오메트리·외부에셋 0·정점색 디테일·조명은 emissive만(성능·라이트베이킹 보호).
- **배치1 오프닝 축하**: 화환·케이크·현수막·풍선 아치 (#88)
- **배치2 식물·화분**: 대형관엽·야자·행잉·다육·꽃병 (b27cade)
- **배치3 구조·조명·장식**: 플로어램프·벨벳로프·거울·안내판·난간 (#90)
- **배치4 좌석·안내·구조**: 라운지·안내데스크·창문·유리파티션·스툴 (#91)
각 배치 executor 스모크 + 검수관 교차리뷰 게이트. 감독 룩 피드백(케이크 삼각대→스탠드) 반영. 배치1·2 헬퍼(alignedCyl/paintGeo/seeded)를 3·4가 재사용.

### 빌더 진입점 (behind-flag 제거)
팀장 설계: studio 진입 카드("전시 공간 직접 꾸미기") + builder 첫진입 프리셋 5종 오버레이 + visit 간접 노출. 대문 CTA 불변, 익명 localStorage 유지(auth 무연동). (0f26796)

### 모바일 경량 빌더 (A)
파츠 이동 API 신규(moveMode) + 2손가락 핀치줌/팬(activePointers, size≥2일 때만 분기 → 단일 포인터 데스크탑 흐름 불변) + 모바일 편집 HUD(파츠 팔레트·선택 액션바 ↺↻/이동/삭제·배치취소, mobwarn 전면차단→"가벼운 편집 모드" 완화). 데스크탑 마우스·키보드 회귀 0. (8247f25)

### 교훈 — 판별식 결함 오탐과 직접 재검증
executor 스모크가 `textContent`(script 소스까지 포함)·`offsetParent`(position:fixed에 부적합) 판별식 결함으로 진입점·모바일에서 오탐 2회. 부팀장이 실 DOM(getComputedStyle)·실이벤트(playwright mouse/pointer)로 직접 재검증해 반증. 컨테이너 재시작으로 디자이너 QA가 중단돼도 독립 게이트 재수행으로 커버했다. 라이브 노출 변경은 부팀장 실측을 게이트에 추가한다.

### 실기기 핫픽스 — 카메라 이탈 + UI 압박 (감독 iPhone 발견)
감독이 폰으로 써보고 2건 지적. ① **카메라 공간 이탈**: 모바일 터치(큰 폭)로 카메라가 방 밖으로 나가 회색만 보이던 편집불가 — `clampRad()`로 줌 상한을 공간 크기 비례(resetCamera 초기 rad×1.5)로 묶고 target 여유 +4→+1·pol 하한 0.25→0.35·카메라 리셋 버튼. onWheel·핀치 하드코딩 중복이 원인이라 clampRad 단일 함수로 공용화. (eaddc57) ② **UI 압박**: 하단 팔레트 접기 토글·안내 최초1회+페이드(재열람 `?` 버튼)·배치취소 배너 조건부로 3D 편집영역 확대. (f82a8b5)

### 걸어서 빌드 모드 — 아야모가 공간 걸으며 배치 (감독 아이디어)
감독 "실제 인테리어처럼 사람이 들어서서 가구 놓듯". 팀장 설계: 조망(orbit)과 **병존 토글** + 3인칭 어깨너머 + 신규 `builder-walk.js`(player.js 보호파일 미결합·orbit 미참조). `buildChibi`로 저장 룩 아바타 스폰, WASD/조이스틱 이동, 전방 1.2m 바닥에 기존 `addPart` 재사용. 감독 결정 **A(프리룩)**: 정지 시 우측 드래그로 제자리 둘러보기(camYaw 유지). 감독 지적("몸에 끼임") 반영: solid 파츠 **AABB 충돌**로 아바타가 가구에 안 겹침. executor 스모크 7/7(전진 프레이밍·충돌·프리룩) + 검수관 승인(orbit 격리). (31b37b0, 감독 배포 확인 대기)

## 2026-07-15 · 아야모 심야 세션 — 피부 채도·비행 + 무릎/12액션 (부팀장 자율, 팀장 주도)

감독 지시를 감독 부재(6시간) 중 자율 완결. 전 항목 §10 게이트(독립 executor 스모크 + 검수관 교차리뷰) 통과, **감독 룩 승인 후 배포** 대기.

### 1. 피부 채도 강화 (감독 결정 B — "채도만 올려 생기")
- `chibi.js`에 피부 전용 `vividSkin()`: `SKIN_SAT_BOOST=1.6` + `chroma-gate(0.10)`. 무채색(흰토끼·회코알라·판다·귀신)은 자동 제외, 유채색 살구/갈색만 생기. 아주 밝은(창백) 색만 chroma폭만큼 L 하향해 실제 채도 상승을 드러냄. 볼홍조 `(255,120,120,0.5)→(255,105,110,0.6)`. 톤매핑(ACES 0.92) 무접촉.
- 실측 함정: `THREE.Color` 기본 선형공간이라 손계산 sRGB와 불일치 → 헤드리스 렌더로 상수 보정. 사람 기본 `#ffd9bd`는 이미 S=1.0(파스텔 HSL 한계)이라 채도 곱셈 무효 → chroma 기준 L하향으로 해결.
- 검증: footcheck PASS · 18종족×12액션 NaN 234/234 nonFinite=0 · 걷기 형상 무변화. (커밋 `83f6d07`)

### 2. 점프 홀드 비행 + 날개 펄럭임 (감독 신규 지시 · 팀장 설계)
- 팀장 판정: **하이브리드**(`player.js` 최소훅 3점 + 가산형 `fly.js`). "발밑 지면 위에서 뜨는" 모델 — 지면/벽 해석 그대로 통과라 벽·천장·보이드 관통 원천 불가.
- `player.js`(보호) 3점 훅만: `liftOffset` 필드 + 카메라 y 가산 + setPose 리셋. `liftOffset=0`이면 기존 이동과 수치 완전 동등.
- `fly.js`(신규): 킬스위치 `FLY_ENABLED` + Space홀드/모바일 HUD버튼 + 중력/상승/상한(+2.2m). 멀티는 기존 y채널 무임승차(프로토콜 무변경).
- `chibi.js setFlying(bool)`: 날개종족=날개 펄럭 증폭, 무날개=양팔 날개짓. `flyBlend` 0수렴 시 분기 통째 스킵 = 비-비행 렌더 불변.
- 게이트: executor 스모크 3/3(footcheck·비행 NaN 9종족·18종족 회귀) + 검수관 조건부 승인(회귀계약 6종 PASS). 검수관 권고 2건(setPose 경합 동기화·로비 HUD 숨김) 반영. (커밋 `e143c4e`, `21cbe6c`)

### 3. 무릎 2단 관절 + 12액션 + 무릎볼 (앞선 커밋 77f4acb~3f6e897)
- 이전 세션 구현분, 이번에 피부·비행과 함께 배포 대기.

### 배포 상태
전 항목 로컬 커밋 완료·게이트 통과. 라이브 아바타 룩/이동 변경이라 감독이 실제로 날아보고 색을 확인한 뒤 배포한다. (커밋 서명 미검증은 환경 GPG 키 부재 한계 — push·배포와 무관)

## 2026-07-15 · UX 정비 5종 + 공간 빌더 확장 (부팀장 야간 세션)

원인 → 작가·관람객 여정에 마찰이 흩어져 있었고(진입점 파편화·개발용어 노출·재방문 반복), 공간 빌더는 사이트 진입점이 없고 방이 좁았다. 감독 지시로 UX를 여정 관점에서 정비하고 빌더를 확장했다.

**라이브 배포 (전 항목 스모크 + 검수관 게이트 통과):**
- **작품 이미지 넣기 MVP** — 파일 업로드 → 내장(dataURL) → 액자 자동 매핑(원본 비율 contain). 검수에서 draw-call 회귀(작품 80개 87→166콜)를 잡아, 이미지 없는 작품은 InstancedMesh 유지·이미지 있는 작품만 개별 mesh로 분리해 예산 복원.
- **로그인·회원가입 모달** — 사이트 전역 공용 컴포넌트(`auth-modal.js`). 소셜 3종 + '무가입으로 둘러보기' 대등 병존. 회원가입 동의 UI(약관·개인정보 별개 동의·만 14세 확인·베타 고지) — 현재 mock이라 실제 개인정보 0 수집. 법무 실사 반영 + 실 가입 활성화 선행조건(약관 발행·동의로그 백엔드·OAuth 키 등)을 OWNER-TODO에 launch-blocker로 기록.
- **작가 언어 순화** — `studio.html`에서 'JSON'·'전시장 ID(영문)' 등 개발용어 제거('전시 파일 저장'·'전시장 주소 이름' 등). 기능·주소 규약 불변.
- **대문 단일화** — 링크·sitemap·배포 어디에도 없던 죽은 `home.html` 제거(landing이 유일 대문 확정).
- **재방문 스마트 입장** — 저장 프로필·아바타가 있으면 입장 로비 상단에 '다시 오셨어요 → 바로 입장' 원클릭, 입장 폼은 접어둠('바꾸기'로 펼침). 첫 방문 온보딩·아야모는 현행 유지. 가산형(입장 로직 불변).

**공간 빌더 확장 (behind-flag):**
- **공간 크기 확장** — `FOOTPRINT`에 hall(20×14)·grand(28×18) 추가 + 빌더 '공간 크기' 선택 칩 UI. 크기 변경 시 카메라가 footprint 대각선에 비례해 조망 거리 자동 조절. 감독 '너무 좁아 작품이 다 안 들어감' 대응.

**분석·설계 준비 (감독 검토 대기):** 공간 빌더 파츠 경쟁사 벤치마크(이벤트 소품 화환·케익·현수막·풍선, 화분 다종화, '장식' 독립 축) + 블렌더 임포트·서비스 내부 오픈월드·아야모 액션(춤·점프·인사 등) 기술 타당성 조사 완료. 자기완결 원칙(외부 에셋 0)과의 충돌 지점은 팀장 판정으로 정리해 감독 검토 대기.

결과 → 관람객·작가 진입 마찰 다수 해소, 빌더 공간 제약 완화. 다음 무대는 파츠 대확충과 아야모 액션.

---

## 2026-07-14 · 제너레이티브 캐릭터 대확장 — 완성도 수리 + 새 종족·옵션, 그리고 꼬리 부양 버그

> **제품 방향.** 신규 종족을 늘리기 전에 기존 캐릭터 파츠의 완성도를 먼저 끌어올린다.
> 완성도의 기준은 "짧은 순간에 그 대상이 무엇인지 즉시 읽히는가" — 제너레이티브 아트가
> 대량의 개체를 생성하면서도 각각의 식별성을 유지하는 방식과 같다. 완성도 정비 뒤
> 표현 축을 확장한다: 수염·민머리·수영복, 그리고 신규 종족 로봇·귀신. 완성도 판정은
> 팀장이 맡는다.

### 원인
캐릭터 시스템(`web/js/chibi.js`)은 **파라미터가 곧 아바타**다 — 20축 JSON을 THREE
프리미티브로 동기 조립하고, 뼈 없이 피벗 그룹을 사인파로 움직인다. 종족·옷·색 조합은
많아졌지만, 개별 파츠의 **식별성(짧은 순간에 "저건 여우/펭귄이다"가 읽히는가)** 에
편차가 있었다. 방향은 명확했다 — 종 수 확장에 앞서 기존 파츠의 완성도부터 채운다.

### 분석 — 완성도의 정의
완성도를 **식별성 기준(3초 안에 판별)** 으로 정의했다. 정면·측면·후면·걷기 한 프레임에서
그 종족/옵션이 즉시 읽혀야 통과. 이 기준으로 전 파츠를 감사한 결과:
- 꽃 장식·리본이 머리에 **박혀** 보임(표면 아래로 파묻힘).
- 안경 링이 과대, 사자 갈기가 한 줄이라 빈약, 펭귄이 배(흰색)가 없어 새로 안 읽힘.
- 호랑이 줄무늬 텍스처가 몸을 타고 어긋남 → 품질 기준 미달로 **호랑이 종족 제외**(제품 결정).
- 동물 꼬리가 스윙 시 몸을 뚫음.

### 개선 — 4개 배치, 전부 §10 게이트(디자이너→구현→스모크→검수관→팀장 판정)
우선순위는 완성도 수리 선행, 신규 확장 후행.

1. **배치1 · 완성도 수리** — 꽃/리본을 표면 위로 재배치 + 아웃라인, 안경 축소, 사자
   갈기 2줄 엇갈림, 펭귄 흰 배 추가. 호랑이 종족 제외.
2. **꼬리 관통 수정** — 뿌리를 몸 뒤로 밀고 길이 축소.
3. **배치2 · 신규 옵션** — **수염(5종·새 축)** · **민머리** · **수영복**. 수염은 인코딩
   스키마에 축 하나를 더했는데, `normalizeChibi`가 없는 키를 기본값으로 자동 채우므로
   **기존 저장 캐릭터·구버전 피어가 그대로 호환**된다(마이그레이션 0).
4. **배치3 · 신규 종족** — **로봇**(사각 시안 렌즈·안테나·목 칼라·가슴 패널)과
   **귀신**(반투명 시트·물결 밑단·다리 없이 부양). 사람도 동물도 아닌 **제3의 조립
   분기**를 새로 만들되, 다리 없는 귀신에서 걷기 애니가 예외를 던지지 않도록 가드를 추가.

로봇·귀신·수영복은 **특정 게임/IP를 베끼지 않은 고유 디자인**으로 잡았다(법무 확인).

![종족 로스터 18종 — 사람·동물 15·로봇·귀신](../devlog/img/char-roster.jpg)

![새로 추가된 옵션 — 수염·민머리·수영복·로봇·귀신](../devlog/img/char-new-options.jpg)

### 회귀 — 꼬리 "공중 부양" (모바일 QA에서 발견)
배포 후 모바일 실사용 QA에서 회귀가 드러났다 — 일부 종족의 꼬리가 몸에서 분리돼 공중에
뜬 것처럼 보였다. 앞선 관통 방지 수정에서 꼬리 뿌리를 몸 뒤로 **과하게**(z=−0.28)
밀어낸 것이 원인이었다. 뒤·측면에서 보면 엉덩이
표면(z≈−0.13)보다 한참 뒤에 떠서, 몸과 꼬리 사이가 벌어졌다. 뿌리를 엉덩이 뒷면
(y=0.40·z=−0.13)에 **접하게** 재부착하고, 스윙 클리어런스는 꼬리 곡선이 뒤로 뻗는
형태로 확보했다. 측면·정면 3/4·걷기·치마·수영복 전부 관통 없음(헤드리스 다각도 확인).

![꼬리 부양 수정 — 뿌리를 엉덩이 뒷면에 재부착](../devlog/img/char-tail-fix.jpg)

### 결과
- 로스터 **18종**(사람 + 동물 15 + 로봇 + 귀신) + 신규 축(수염 5·민머리·수영복).
- 스키마 불변이라 기존 저장분·옷장·멀티 원격 아바타가 자동으로 새 룩을 렌더.
- 4개 배치 + 꼬리 회귀 수정 모두 배포 성공(deploy Actions success), 헤드리스 QA로
  18종 조립·콘솔 0·다각도 관통 0 확인.
- **남은 비차단 백로그**(팀장 메모): 로봇 하체 대비·귀신 미사용 머티리얼 정리·호랑이
  사장코드 주석·수염 소형 대비·수영복 하트무늬 오독 여지 — 별도 처리 예정.

> 이 확장의 핵심 강점: 지오메트리만 절차적으로 바꾸고 **인코딩 스키마는 건드리지 않아**,
> 새 옵션이 늘어도 저장·멀티·NPC가 깨지지 않는다. 파라미터가 곧 아바타라는 구조의 배당금.

---

## 2026-07-13 · 히어로/워드마크 재조판 — "길다"는 자간, "무겁다"는 weight (디자이너+카피)

### 원인
- 감독: "OpenArtShow가 영어로 저렇게 있으니 왜 이리 길어… 디자이너·카피와
  다시 고민하고 메인 다시 보자."
- 진단(디자이너): 길고 무거운 진짜 원인은 글자 수가 아니라 조판 —
  h1 자간 0.14em@108px(늘어난 배너), 내비 weight 700 vs 히어로 200(불일치),
  영문 요소 3개 중복(eyebrow·h1·tagline-en).

### 개선 (두 전문가 수렴안)
- **워드마크 톤 분리**: 'Open'을 청자 그린(green-300)으로 빼 두 덩어리로
  파싱 → 체감 길이 축소, 브랜드 정체성 강화. 이름·URL 그대로.
- **자간 0.14→0.02, 크기 108→80**(모바일 96→60): "긴 배너" 직접 해소.
- **내비 로고 weight 700→500, 자간 0.14→0.06**: "무겁다" 해소, 히어로와 한 가족.
- **히어로 5단→3단**: 중복 영문 tagline-en 제거, eyebrow를 기술문구 대신
  "Your Museum, One Link"로, 한글 훅을 위계 위로(18~24px). 한글 태그는
  "링크 하나로, 나만의 미술관." + 보조 1줄로 압축(카피라이터안).

### 결과
- 데스크톱·모바일 가로넘침 0, 한 줄 유지. "OpenArtShow." 두 덩어리로
  가볍고 정제됨. 한국어 우선 + 영문 액센트 원칙과 일치.
- 후속(선택): 파비콘 'O.' 갤러리 플레이트 타일(디자이너 제안).

---

## 2026-07-13 · 브랜드 개명 ARTSHOW → OpenArtShow(오픈아트쇼) (감독 지시)

### 원인
- 감독: "이름을 아트쇼가 아니라 오픈아트쇼!!!" 저장소명(openartshow)과
  브랜드 통일. 보너스: 법무팀이 지적한 'ART SHOW=미술전시' 식별력 거절
  위험이 'Open' 접두어로 완화됨(상표 등록 가능성↑).

### 개선
- 제품 전체 ARTSHOW→OpenArtShow, 아트쇼→오픈아트쇼 (web·scripts·docs·
  README, 60여 곳). 로고·타이틀·OG·생성기 SITE 상수 포함.
- 가이드/앱의 "라이프유니티"는 web 소스엔 없음 확인 — 감독이 본 것은 아직
  리셋 전 옛 라이브 배포. openartshow 리셋 시 OpenArtShow로 갱신됨.

### 결과
- 잔여 'ARTSHOW'/'아트쇼' 0. CSP 해시 유지·부팅 정상·가로넘침 없음.
  히어로 "OpenArtShow." 로고 렌더 확인.
- clean-main에 반영 → openartshow 리셋 한 번에 보안+청소+개명 동시 적용.

---

## 2026-07-13 · 강좌 유니티 잔재 3.1GB 제거 — 제품만 남김 (감독 지적)

### 원인
- 감독: "우리 이름은 openartshow인데 lifeunity 항목이 보인다. 다 찾아 검토."
- 검토 결과: 옛 유니티 강좌 프로젝트가 통째로 저장소에 실려 있었음 —
  제품 108파일 vs 강좌잔재 78,931파일(3.1GB, 전체의 99.9%). openartshow에도
  이전 때 그대로 넘어감.

### 개선
- 삭제: 강좌 챕터 폴더(1-4,3-1~3-3,4-1~4-11), 4-11 유니티 프로젝트(425MB),
  *.unitypackage, 4-10_소스이미지.zip, WEBGL_DEPLOY/QUICKSTART·FINAL_SETUP.md,
  .github/workflows/webgl-build.yml(옛 유니티 빌드=보안 지뢰였던 것).
- 유지: web/·scripts/·docs/·devlog/·team/·valuation/·README·robots·sitemap·
  valuation.yml. (제품 108 + .gitignore + valuation.yml = 110파일)
- 문서 정정: MIGRATION.md 완료 축약, BACKLOG의 artshow→openartshow.

### 결과
- 저장소 79,040→110파일. 문법·생성기·CSP 부팅 QA 전부 통과(제품 무손상).
- webgl-build.yml 제거로 force_orphan 지뢰도 영구 소멸.
- openartshow에도 동일 제거 필요 → OWNER-TODO에 명령과 함께 등록.

---

## 2026-07-13 · [법무/IP] 상표 출원 가이드 — 아야모 셀프 / OpenArtShow 변리사 (지식재산 전문가)

### 원인
- 감독 지시: 상표 출원(OpenArtShow·아야모) 절차 정리 + 감독 할 일 기록.
  보안 검토가 "코드 아닌 브랜드가 진짜 자산"이라 지목한 방어선.

### 분석 (지식재산 전문 계약직 조사, 2025-26 현행)
- **아야모(Ayamo)**: 사전에 없는 조어 → 식별력 문제 낮아 등록 가능성 높음.
  셀프 출원 무난.
- **OpenArtShow**: 'art show=미술 전시'라 41류(전시)에서 성질표시(기술적 표장,
  상표법 §33①3)로 **식별력 거절 위험 실재**. → 변리사 무료상담 후 로고
  결합/조어 보강 전략 권고.
- 니스 분류: **41류(온라인 전시·엔터)+42류(SaaS)가 핵심**, 9류(다운로드
  앱)·35류(판매 중개)는 수익모델 생기면.
- 비용(개인 전자출원·류당): 출원료 46,000원, 등록료 201,000원(등록결정 후),
  우선심사 160,000원. 아야모 문자+도형 각 2류 등록까지 약 99만원.
- 문자+도형 **별도 출원**이 보호범위 최대(이름·그림 각각 방어).
- 심사 ~15개월, 우선심사 2~3개월(사용 증빙 필요).

### 개선
- docs/OWNER-TODO.md §상표 절차에 4단계 체크리스트+비용표+함정 기록,
  상표 항목 상태 갱신(리서치 완료→감독 차례).

### 결과
- 감독 실행 대기: ① KIPRIS 선행검색(행정상태 전체) → ② 41+42류 결정 →
  ③ 특허로 아야모 문자+도형 셀프 출원 → ④ OpenArtShow는 변리사 상담 먼저.
- 출처: KIPRIS(kipris.or.kr), 특허로(patent.go.kr), 특허청 수수료 안내,
  상표법 §33(식별력), 니스 국제상품분류.

---

## 2026-07-13 · 보안 블로커 3종 — P2P 검증·URL 화이트리스트·CSP (보안담당자+팀장 검토)

### 원인
- 감독 "코드 훔쳐간다" 우려 → 보안담당자(계약직) 위협모델 + 팀장(Fable)
  판단. 결론: 코드 은닉은 연극, public 무방. 대규모 공개 전 3개는 블로커.

### 개선
- **multiplayer.js**: 메시지 64KB 상한, peer당 초당 30건 레이트리밋(고정창),
  채팅 표시명을 hello 닉으로 고정(data.name 스푸핑 무시)+300자, 방명록
  정제(이름40·텍스트200·1회20·총500) 후 병합, 좌표 finite+±500 클램프
  (호스트·게스트 양측). hit target/좌표도 정제.
- **artworks.js**: safeMediaUrl 화이트리스트 — #gz=/#gd= 공유링크의 imageUrl/
  videoUrl을 https/http·data:image·data:video·상대경로만 허용, 나머지 제거.
- **index.html**: CSP 메타(script-src 'self'+importmap sha256 해시, object-src
  none, base-uri none). 'unsafe-inline' 없이 인라인 importmap 허용.

### 결과
- QA: 문법 통과, safeMediaUrl 9/9, P2P 헬퍼·레이트리밋 단위테스트 통과,
  CSP+importmap 헤드리스 부팅 성공(위반 0·에러 0).
- 주의: 롤백이 옛 구조 multiplayer.js를 되살려 첫 구현이 옛 버전에 적용됨 —
  발견 후 현재 origin(575줄, NPC·타격·사진 포함)에 재적용·재검증.
- 팀장 판단: 지인 공유 지금 GO, 대규모 공개는 3종 머지 후 GO.

---

## 2026-07-12 · 밸류에이션 모델에 트랙션 입력 + 50억 목표선 (감독 지시)

### 원인
- 감독 질문 "50억 가치 방법은?" → 답을 그래프로 추적 가능하게 만들자.

### 분석
- 50억은 개발일지(만든 것)만으론 불가 — 상한 ~15억. 트랙션(갤러리·
  MAU·매출)이 실현가치를 끌어올리는 유일한 레버. 특히 매출(ARR×8배)이
  월 5,000만이면 ~48억으로 단독 도달.

### 개선
- 모델 확장: 실현가치 = 자산 + 갤러리×30만 + MAU×1만 + 월매출×12×8.
  트랙션은 docs/traction.json(현재 전부 0)에서 읽어 매일 반영.
- 그래프: 50억 목표선(점선) + 진행률 바 + "50억 여는 세 레버" 카드
  (매출/이용자/카테고리) + 목표 대비 % 열. 현재 2.5%(1.24억).
- 백로그에 50억 도달 전략·마일스톤 사다리 기록.

### 결과
- QA: 목표선·밴드·실선·진행바·표 렌더, 모바일 무가로스크롤, 에러 0.
- 트랙션 실측이 traction.json에 들어오면 실선이 목표선을 향해 상승.

---

## 2026-07-12 · 시장가치 추적기 /valuation/ — 매일 04:00 자동 산출 그래프 (감독 지시)

### 원인
- 감독 지시: 매일 새벽 4시에 시장가치를 분석하고 그래프로 표현하라.

### 분석
- 매일 LLM이 밸류를 재추정하면 노이즈가 크다 → **결정론적 공개 모델**이
  더 방어 가능하고 그래프도 매끈하다. 신호는 이미 개발일지에 실측으로 쌓임.
- 스케줄러 선택: cron 도구는 세션 한정 + 7일 만료. 영구 실행은 GitHub
  Actions(기본 브랜치·UTC)가 정답 — 둘 다 건다.

### 개선
- scripts/build-valuation.mjs: 자산가치 = 8,000만 + 개발일지×100만,
  시장범위 = 자산×4~×12(조건부). docs/valuation-history.json에 일자별
  멱등 upsert → valuation/index.html에 인라인 SVG(자산 실선 + 시장범위
  밴드) + 산출 근거 공개 + 면책. dataviz 스킬 기준(단일 시퀀셜 그린,
  텍스트는 잉크 토큰, 격자 recessive).
- 크로스 내비(개발일지·팀·랜딩 푸터)·sitemap·배포 스크립트에 valuation/ 추가.
- 영구 스케줄러 .github/workflows/valuation.yml(04:07 KST=19:07 UTC)
  — artshow 이전·기본 브랜치·Actions 활성 후 발화. 이번 세션엔 cron 도구로
  4시 브리지 실행(세션·7일 한정).

### 결과
- QA: SVG 렌더·데이터점 2·표 2행·모바일 무가로스크롤·JS 에러 0.
- 오늘값: 자산 1.23억 / 시장범위 4.92억~14.76억(개발일지 43건).
- 한계 명시: 자기 추정이며 외부 거래 근거 아님. 시장범위는 트랙션 조건부.

---

## 2026-07-12 · 팀 인사기록 페이지 /team/ — 정규직·계약직 기여도 (감독 지시)

### 원인
- 감독 지시: 사이트에 팀·계약직 인사기록을 남기고, 각자 어느 정도
  일하는지 기여도가 보이게 하자.

### 분석
- "계약직"은 사안마다 고용하는 전문 에이전트(디자이너·법무·카피·성능·
  리서처). 기여 근거는 이미 개발일지 태그·항목에 실측으로 남아 있음 —
  이를 명부로 집계하면 근거 있는 기여도가 된다.

### 개선
- scripts/build-team.mjs(의존성 0) + 명부 데이터: 정규직 3(감독·팀장
  Fable·부팀장 Opus) + 계약직 5. 각 카드에 직급 배지·기여 건수·상대
  막대·대표 실적. 개발일지 갤러리 플레이트 디자인 재사용.
- 기여 건수는 개발일지 실측(법무 4·디자이너 3·카피 2·리서처 2·성능 1).
  막대는 최대 기여자(감독 42) 대비 상대치. 하단에 집계 출처 명시.
- 랜딩 내비(데스크톱·햄버거)·개발일지 상단바에 "팀" 링크, sitemap 등록,
  배포 스크립트에 team/ 추가.

### 결과
- QA: 카드 8·막대·통계·모바일 무가로스크롤·내비 링크·canonical 확인.
- 이후 인원/기여가 늘면 build-team.mjs 명부만 갱신해 재생성.

![팀 인사기록 — 정규직·계약직 명부와 기여도 막대](../devlog/img/team-page.jpg)

---

## 2026-07-12 · 사진→아야모 철회 (감독 판단)

### 원인
- 감독 평가: "사진으로 하는 게 큰 의미가 없어 보이네." — 색상 몇 개
  자동 선택으로는 "비슷하다"는 체감을 못 만든다. 정확한 지적.

### 분석
- 휴리스틱(팔레트 최근접)의 천장: 절약해 주는 건 클릭 몇 번인데
  기대치는 "나를 닮은 아야모". 기대-체감 격차가 큰 기능은 없는 편이
  제품 인상에 낫다.
- 진짜 닮게 하려면 비전 AI가 필요 — API 비용 + 사진 서버 전송(개인정보
  처리방침 필요)이라 백엔드/계정 체계가 생긴 뒤에나 성립.

### 개선
- 📷 사진으로 시작하기 버튼·분석기 전면 제거(구현은 git 이력 b2ff2f3b에
  보존, 자리 주석으로 표기). **얼굴형 파츠 4종은 유지** — 독립 가치.
- 백로그에 "AI 아야모 생성(비전)"을 백엔드 확보 후 프리미엄 후보로 기록.

### 결과
- QA: 버튼·파일 입력 부재, 얼굴형 4칩 정상 동작, JS 에러 0.
- 교훈: 자동화 기능은 "몇 번의 클릭을 줄였나"가 아니라 "기대한 결과가
  나오나"로 판단한다.

---

## 2026-07-12 · 얼굴형 "통통" 폐기 → "각짐" (감독 피드백)

### 원인
- 감독 지시: "뚱뚱하게 하지는 말자. 형태만, 비슷하게." — 통통(두상
  가로 110%)이 살찐 인상을 줌.

### 개선
- 통통 삭제, **각짐** 신설: 살찌는 확대 없이 턱 하단을 눌러 평평한
  턱선(각진 얼굴)을 만든다(가로 103%로 절제). 갸름도 은은하게 완화
  (93%→95%). 전 형태 "은은한 변형만" 원칙을 정의부에 주석으로 고정.
- 저장된 기존 통통 룩은 각짐으로 자동 이관(하위호환 별칭). 사진 분석의
  넓은 얼굴 판정도 각짐으로 연결.

### 결과
- 4형태 정면 비교 캡처 — 서로 구분되지만 어느 것도 뚱뚱하지 않음.
- QA 재통과: 합성 초상 넓은 얼굴 → 각짐 매칭 확인.

![동글·갸름·각짐·브이라인 — 은은한 변형만](../devlog/img/face-shapes.jpg)

---

## 2026-07-12 · 사진 → 아야모 + 얼굴형 파츠 (감독 제안)

### 원인
- 감독 제안: "사진을 넣으면 귀엽게 비슷하게 만들 수 있을까? 얼굴형도 하자."
  제페토/미모지식 사진→아바타의 미니 버전.

### 분석
- 아야모는 부품 조합식이라 "사진과 똑같이"가 아니라 "특징을 읽어 가장
  비슷한 부품을 자동 선택"하는 문제 — 팔레트 최근접 매칭으로 충분.
- 얼굴 사진은 민감정보라 서버 전송 없는 기기 내 분석이 법무상 정답
  (동의·보관 규제 전면 회피). 운영원칙과도 일치.

### 개선
- **얼굴형 파츠 신설**(치비 최초 형태 파라미터): 동글·갸름·통통·브이라인.
  두상 스케일 + 턱 테이퍼(아래 반구 조임)로 구현, 헤어·액세서리는
  hairRoot 스케일 추종으로 두피 뚫림 방지. 구버전 저장 룩은 동글 폴백.
- **📷 사진으로 시작하기**: 꾸미기 창에서 사진 선택 → 320px 캔버스에서
  피부색(볼 밴드 중앙값)·머리색(이마 위 밴드, 피부 제외)·눈동자색(눈
  패치, 피부보다 어두운 픽셀)·헤어 길이(턱 아래 좌우 머리색 픽셀
  비율→숏컷/단발/트윈테일)·얼굴형(얼굴 영역 가로세로비) 추정.
  FaceDetector 지원 브라우저는 정밀 박스, 미지원은 셀피 구도 가정.
- 분석은 전부 브라우저 안 — 안내 문구로 명시("저장·전송되지 않아요").

### 결과
- QA(합성 초상 2종): 밝은 피부·검은 긴머리·갸름 → f0c8a8/2b2b33/트윈테일/
  갸름 ✓, 어두운 피부·주황 숏컷·통통 → 7a4a2f/d96c2c/숏컷/통통 ✓.
- 잡은 버그: 얼굴 비율 계산에서 2px 표본 폭을 두 번 곱해 전원 통통
  판정되던 문제(실측 ar 1.022로 경계 0.98 재조정).

![사진으로 시작하기 버튼과 얼굴형 파츠가 추가된 아야모 꾸미기](../devlog/img/photo-to-ayamo.jpg)

---

## 2026-07-12 · 개발일지 블로그 — 실사 캡처 + 주제 이모티콘 (감독 제안)

### 원인
- 감독 제안: 블로그에 이미지 캡처와 이모티콘도 넣자. 글자만 있는
  목록은 결과물이 안 보인다.

### 개선
- 생성기에 이미지 문법 지원: 일지 원문의 `![캡션](경로)` 한 줄이
  figure+캡션으로 렌더(지연 로딩, 플레이트 테두리).
- 촬영 파이프라인 재구축(롤백으로 소실): 미러에 프리캠·GPU 프로브
  우회·HUD 숨김 훅 주입, 사이클 12프레임 샘플링 후 낮·일몰·밤 선별.
- 대표 7건에 실사 캡처 연결 — 디테일 트리(낮), 은하수(밤), 석양
  사이클, 전시실 내부, 아야모 꾸미기, 모바일 햄버거, 블로그 자신.
- 제목 키워드 → 주제 이모티콘 자동 부여(⚖️법무 ⚡성능 🧸캐릭터
  🌌하늘 🎨디자인 …). 슬러그·SEO 타이틀에는 미포함 — URL 불변.

### 결과
- QA: 카드 38건 전부 이모티콘, 이미지 7장 정상 로드(404 0건),
  본문 figure 렌더·캡션 확인. 이미지 총 ~0.7MB(JPEG 82).
- 이후 규약: 일지 작성 시 QA 캡처를 devlog/img/에 저장하고
  `![캡션](../devlog/img/파일.jpg)`로 참조하면 자동 발행.

---

## 2026-07-12 · 개발일지 공개 블로그 /devlog/ — 37건 일괄 발행 + SEO 기반

### 원인
- 감독 결정: 개발일지를 블로그로 공개하자. 워드프레스·노션·위키 비교 후
  자체 사이트 /devlog/ 채택(0원·자동 발행·브랜드 일관·SEO 가능).

### 분석
- DEVLOG.md가 이미 원인→분석→개선→결과 구조라 변환기만 있으면 전량이
  즉시 콘텐츠. 예창패·문화재단 심사에서 "공개 개발 기록"은 실행력 증빙.
- 검색 노출은 자바스크립트 렌더가 아닌 완성된 정적 HTML이 유리 —
  글별 고유 URL + 메타 + 구조화 데이터가 기본기.

### 개선
- scripts/build-devlog.mjs (의존성 0): DEVLOG.md → devlog/index.html +
  글별 페이지 37건. 슬러그 = 날짜+제목 해시(제목 불변 시 영구 URL).
- SEO: canonical, OG, JSON-LD(Blog/BlogPosting), sitemap.xml, robots.txt.
  BASE_URL 한 곳만 바꾸면 도메인 이전 대응.
- 디자인: 랜딩 갤러리 플레이트 토큰 재사용(종이 배경·백지 카드·청자
  그린 액센트·radius 3px·keep-all). 상단 다크그린 바 + 이전/다음 글 내비.
- 랜딩 내비(데스크톱·햄버거 시트)·푸터에 "개발일지" 링크 추가.
- 배포 스크립트에 devlog/·sitemap·robots 추가 + **guide.html 루트 누락
  회귀 복구**(세션 중 재구성한 스크립트가 빠뜨려 라이브 가이드 404였음).

### 결과
- QA(배포 레이아웃 미러): 카드 37·canonical·JSON-LD·표 렌더·모바일
  가로 스크롤 없음·내비/푸터 링크·sitemap/robots 200 — 전부 통과.
- 이후 운영: 일지 커밋 시 build-devlog.mjs 실행 후 배포하면 자동 발행.
- 잔여: 구글 서치 콘솔·네이버 서치어드바이저 등록(감독), artshow 이전
  후가 적기 — sitemap의 BASE가 artshow 주소 규약(랜딩 OG와 동일).


![개발일지 목록 — 갤러리 플레이트 스타일](../devlog/img/devlog-blog.jpg)
---

## 2026-07-12 · 좌측 스크롤 진행 레일 철회 (감독 피드백)

### 원인
- 감독 판단: 좌측 레일도 없애자. SCROLL 큐 제거는 유지.

### 개선
- `.scroll-rail` 마크업/CSS/`syncScrollRail()` 전부 삭제. 스크롤 리스너는
  상단 CTA 노출 제어(`syncNavCta`)만 남김.

### 결과
- 화면 가장자리 완전 미니멀. QA: 레일 부재·JS 에러 0·CTA 로직 정상 확인.
- 교훈: 스크롤 위치 큐는 브라우저 기본 스크롤바로 충분하다는 판단.

---

## 2026-07-12 · SCROLL 큐 제거 → 좌측 2px 진행 레일 (감독 제안)

### 개선
- 히어로 하단 영문 "SCROLL" 텍스트 큐(+드립 애니메이션) 제거.
- 좌측 가장자리 고정 2px 레일: 트랙은 그린 12% 투명, 채움은 그린
  300→600 세로 그라디언트가 스크롤 진행도만큼 차오름. 텍스트 없이
  위치 감각을 제공 — 국문 페이지에 영문 UI 큐가 섞이는 문제도 해소.

---

## 2026-07-12 · 한국어 조판 정비 — keep-all + 모바일 쉼표 줄바꿈

### 원인
- 감독 제안: 모바일에서 쉼표 다음에 줄을 띄우자. 실기기에서 "서게 됩니다"가
  "서 / 게"로 어절 중간 절단되던 문제도 동반 확인.

### 개선
- 전역 word-break: keep-all + overflow-wrap — 한국어 어절 단위 줄바꿈
  (전 뷰포트, 국문 사이트 표준 조판).
- 핵심 카피 4곳에 <br class="m-only"> — 모바일에서만 쉼표 뒤 개행되어
  구절 단위 호흡("…아니라, / …서게 됩니다."). 데스크톱은 한 줄 유지.

---

## 2026-07-12 · 특징 카드 챕터 룰 제거 — "선이 애매" 해소

### 원인
- 감독 피드백: 카드 상단 그린 그라디언트 선이 애매하게 느껴짐 — 중앙
  구성에서 역할 없는 장식이 됐고, 그라디언트 페이드가 우유부단하게 읽힘.

### 개선
- 특징 카드에서 룰 제거 — 아이콘이 앵커를 전담 (선+아이콘 이중 장식 해소).
  요금제 카드·모달의 좌측 정렬 룰은 챕터 마커로 기능하므로 유지.

---

## 2026-07-12 · 모바일 특징 카드 중앙 정렬 — "왼쪽으로 쏠린 느낌" 해소

### 원인
- 감독 실기기 스크린샷: 1열 전폭 카드에서 룰·아이콘·글이 전부 좌측 기준이라
  오른쪽이 비어 기울어 보임.

### 개선
- 720px 이하에서만 카드 중앙 구성(룰·아이콘·타이포 센터, 아이콘 56px).
  데스크톱 3열의 좌측 정렬(에디토리얼)은 유지 — 정렬은 칼럼 수를 따른다.

---

## 2026-07-12 · 모바일 네비 — 햄버거 메뉴로 교체

### 원인
- 감독 지시: 모바일은 심플한 햄버거 메뉴로.

### 개선
- 기존 가로 스크롤 링크 필로우 → 햄버거 버튼(가로선 3개, 열리면 X로
  변형) + 드롭 시트: 전시/포토월/요금제/가이드 + 로그인·회원가입 +
  포레스트 입장하기 버튼. 링크 탭·항목 선택 시 자동 닫힘.
- 데스크톱 네비는 불변 (720px 경계).


![모바일 햄버거 시트 — 메뉴·로그인·입장하기](../devlog/img/burger-open.jpg)
---

## 2026-07-12 · 상단 입장하기 CTA — 스크롤 노출로 중복 해소

### 원인
- 감독 지적: 상단 네비 "입장하기"가 히어로 "지금 입장하기"와 중복.

### 개선
- 상단 CTA는 히어로 60% 지점을 지나야 페이드 인 — 최상단에서는 CTA 1개,
  스크롤 깊은 곳에서는 상단 CTA가 복귀해 어디서든 입장 가능.

---

## 2026-07-12 · 히어로 배지 제거 + 랜딩 로그인/회원가입

### 원인
- 감독 지시: "베타 오픈 박스 없애자. 메인창에 회원가입·로그인 넣어야지."

### 개선
- 히어로의 "베타 오픈" 배지 제거 (CSS·펄스 키프레임까지 정리).
- 상단 네비에 로그인/회원가입 → 갤러리 플레이트 스타일 소셜 모달
  (Google/카카오/네이버). **앱 auth.js와 동일한 localStorage 규약**
  (lu-auth-profile-v1)을 공유해 랜딩에서 로그인하면 전시장 로비가 그대로
  이어받는다. 로그인 후 네비는 이니셜 칩 + "OO님 · 로그아웃"으로 전환.
- 목업 단계임을 모달 안에 명시("계정 연동 준비 중 — 프로필 미리보기").
  실제 OAuth 키 발급 시 auth.js CONFIG와 함께 SDK 호출로 교체.

### 결과
- QA: 배지 소멸, 모달 열림/카카오 로그인 → 프로필 저장·네비 전환 확인.

---

## 2026-07-12 · 특징 카드 3종 — 설명문에서 실사 스크린샷으로

### 원인
- 감독 피드백: "메인 밑 소개 3박스, 설명충 같은 느낌."

### 분석
- 카드가 아이콘 + 4줄 설명문 구조 — 제품을 말로 증명하려는 형식 자체가
  문제. 처방: "설명하지 말고 보여준다."

### 개선
- 뷰티샷 파이프라인: 헤드리스로 입장 → HUD 전부 숨김 → 정오로 시간 진행 →
  3구도 촬영(실내 전경+메자닌 / 아야모가 작품 앞에 선 컷 / 정원에서 본
  유리 커튼월 외관). QA 환경은 picsum이 막혀 액자가 비므로, 미러 전용
  추상화 목업 6점을 캔버스로 생성해 채운 뒤 촬영.
- 카드 구조: 아이콘·설명문 → 4:3 실사 이미지(호버 시 미세 줌) + 제목 +
  **한 줄 카피** ("지하 미디어관부터 옥상 테라스까지, 걸어서." /
  "낯선 이와 같은 작품 앞에, 나란히." / "가입 없이, 누르는 순간 당신의
  미술관.").
- 함정 수정: 랜딩은 루트, 에셋은 app/ 아래로 배포되므로 이미지 경로는
  ./app/assets/landing/ — 개발 트리 기준 상대경로를 쓰면 배포에서 깨진다.

### 결과
- 스크린샷 검증 — 카드가 제품 화면 그 자체가 됨. 에셋 +292KB(JPG 3장).

### 후속 2 (감독 "큰 아이콘 넣으면 좋을 것 같다")
- 64px 대형 헤어라인 아이콘(획 1.4, 그린-600) 3종 자체 드로잉: 아치 미술관 /
  두 관람객 / 초대장+화살표. 대비 충돌 없이 시각 앵커 확보 — 번호는 아이콘이
  대체. 호버 시 그린-700으로 딥닝.

### 후속 (감독 피드백 "실제 이미지는 넣지 말자 — 대비가 너무 크다")
- 스크린샷의 어두운 천장/명암이 크림 페이지의 차분함을 깨는 문제 — 이미지
  철회, **타이포 주도 미니멀 카드**로 재정리: 그린 룰 + 번호(01/02/03) +
  제목 21px + 한 줄 카피. 설명충으로의 회귀 없이 이미지도 없는 제3의 형태.
  한 줄 카피는 유지(이번 개편의 실질 수확). 뷰티샷 파이프라인은 og.png
  재생성용으로 보존(스크립트만, 에셋 삭제).

---

## 2026-07-12 · 청자 그린 스케일 확장 — "강한 색도, 다양하게"

### 원인
- 감독 피드백: 초록 차분해서 좋다 + 더 강한 색·다양한 톤도 쓰자.

### 개선
- 단색 액센트 → 9단계 그린 스케일 토큰(--green-100~900) 시스템화.
- 강한 톤 배치: 주 CTA·요금제 배지 = 포레스트(--green-800, 흰 글자),
  호버 시 밝아지는 방향(800→600)으로 "눌리면 열리는" 감각.
- 페이지 리듬: 커뮤니티 섹션 배경 심연 그린(--green-900), 리크루트는
  그 사이 계조(#101d16) — 다크 구간이 검정 일변에서 초록 깊이로.
- 카드 챕터 룰 = 딥→하이라이트 그라디언트(700→300), 아이콘 600.

### 결과
- 히어로/특징/요금제/커뮤니티 스크린샷 검증 — 차분함 유지 + 위계 강화.

---

## 2026-07-12 · 브랜드 액센트 골드 → 청자 그린 전환

### 원인
- 감독 결정: "아트는 초록 계열이어서." (A/B 시안 비교 후)

### 개선
- 팔레트: 액센트 #5f9e7d(비취) / 딥 #3f7a5c / 크림 위 텍스트 #3d6b50
  (대비 유지) / 하이라이트 #8fd0ab — 유행 초록이 아닌 청자(celadon) 계열.
- 적용 범위: 랜딩·가이드·스튜디오·앱 HUD(독 캡처 면, 토글 노치, 상단 바
  접속자, 토스트)·조이스틱 달리기 발광·타격 이펙트(스타버스트/의성어/링)·
  GPU 안내 배너 — 브랜드 골드 토큰 19종 × 7파일 일괄 치환(74건).
- **제외(의도)**: 3D 씬의 조명·베이크 데칼·다운라이트(물리적 웜 광원),
  치비 의상 팔레트, 닉네임 라벨 색 배정 — 브랜드 색과 무관한 층.
- 변수명(--gold, GOLD 등)은 하위호환상 유지, 값만 교체 + 주석 명기.

### 결과
- 랜딩 A/B 시안 → 실적용 일치, 모바일 HUD·타격 이펙트 그린 확인.
- 잔여: og.png(공유 썸네일)가 골드 톤 — 재생성 필요 (백로그).

---

## 2026-07-12 · 랜딩 "갤러리 플레이트" 개편 — 라운드박스 현대화 + 타이포 대비 복구

### 원인
- 감독 피드백: "라운드박스가 현대적이지 않다. 글도 박스도 눈에 안 들어온다."

### 분석 (디자이너 3차 감사)
- 낡음의 정체: 라운드 16px + 3px 골드 탑바 + 소프트섀도 + 리프트 호버 =
  2014~2019 부트스트랩/머티리얼 카드 4종 세트. radius 값 무정부(0~999px 7종),
  크림 위 크림 패널이라 그림자가 "면 구분"이 아닌 "스티커 부양"으로 읽힘.
- 안 들어옴의 정체: 웨이트 축 접힘(전부 300, 제목 400), 크기 축 접힘(제목 15
  vs 본문 13.5), 국문 제목에 uppercase 자간 기법(작동 불가), 골드 텍스트
  대비 2.0:1 불합격, 46px 아이콘이 위계 정점.

### 개선 ("갤러리 플레이트" — 미술관 캡션 플레이트의 직각·헤어라인 문법)
- radius 전면 3px 통일(사진 카드 2px 예외), pill 전폐(버튼·배지·칩·인풋).
- 3px 골드 탑바 → 카드 내부 40px 골드 룰(도록 챕터 룰), 호버 시 64px 점등.
- 라이트 섹션 그림자 전면 제거 — features 배경 paper-deep 단색 + 카드 순백
  으로 면 대비 확보. 리프트 호버 → 보더 점등.
- 타이포: body 300→400, 섹션 h2 clamp(30,4.5vw,44)/500, 카드 제목 19px/600
  (uppercase 폐기), 본문 15px/#57503f, 가격 36px/700 tabular, 라이트 배경
  골드 텍스트는 --gold-text(#8a6d23, 대비 4.6:1)로. 아이콘 46→30px 강등.
- 히어로 캡션 직각화, 포토카드 틸트 ±1.4°→0.8°, nav CTA 글로우 제거.

### 결과
- 히어로/특징/요금제 스크린샷 검증 — 플레이트 면 분리 선명, 제목 앵커 생성.
- 로비 카드는 이미 플랫 계열이라 자연 정합 (앱 내부 라운드 정리는 별도 건).

---

## 2026-07-12 · 마스코트 이름 확정 — 아야모(Ayamo) 표기 일괄 적용

### 경위
- 감독 확정. 3라운드 네이밍(카피라이터) × 3회 법무 실사를 거친 유일한
  청신호 이름 — 시그니처 리액션 "아얏!"에서 온 조어.

### 적용
- 화면 표기 교체: 로비 버튼(🧸 아야모), 메이커 제목("아야모 꾸미기"),
  가이드·README. 내부 식별자(chibi.js, 'chibi:' 프로토콜)는 하위호환 유지.
- 가이드의 낡은 안내(제거된 "아바타 색상 선택") → 아야모 꾸미기 안내로 교정.
- 잔재 버그 2건 동반 수정: ① 메이커의 SKIN_TONES 참조가 삭제된 avatarkit을
  가리켜 크래시 — 자체 팔레트 편입 ② 메이커 프리뷰가 뒷모습부터 시작(π 저작
  관례) — open 시 정면 리셋.
- 도메인 DNS 프로브: ayamo.com 등록됨 / .io·.art·.kr·.co.kr 미해석(가용
  가능성 — 등록기관 확인 필요).

### 남은 절차 (감독 몫)
- KIPRIS 유사검색(9/41/42/25/28류) → 도메인·SNS 핸들 선확보 → 상표 출원.


![아야모 꾸미기 — 헤어·표정·의상·팔레트](../devlog/img/ayamo-maker.jpg)
---

## 2026-07-12 · [법무] 네이밍 최종 실사 — 아야모 🟢 청신호 (전 후보 중 유일)

### 판정 종합
볼리 🔴(삼성 Ballie) · 데구리 🔴(포켓몬) · 아야 🟡 · 구르미 🟡 · 아야미 🟡 ·
**아야모 🟢 — 확정 권고**.

- 아야모: 국내 선점 전무, 해외는 비인접 소규모(브라질 식품무역, 일본 모델
  활동명)뿐. 일본에서도 희소한 조어형이라 식별력·SEO 모두 사실상 독점 가능.
  아야메(붓꽃) 군집과는 말미 모음 차이로 호칭 구별 — 차단 사유 아님.
- 아야미: 흔한 일본 여성 인명(연예인 다수) + **국내 서브컬처에 동명 버튜버/
  일러스트레이터 활동 중**(타깃 커뮤니티 겹침) + Castlevania 일러스트레이터
  Ayami Kojima 연상 — 모든 축에서 아야모 하위호환.
- 구르미: '구름이'형 흔한 애칭(선등록 개연성), 화상회의 '구루미' 42류 근접,
  gurumi 완구 준일반명사 — 조건부 가능이나 아야모에 열위.

### 확정 시 절차
KIPRIS 유사검색(9/41/42/25/28류) → ayamo 도메인·핸들 선확보(.com 대안
.io/.art) → 문자·도안 분리 출원 → J-PlatPat(アヤモ)/USPTO 검토.

---

## 2026-07-12 · [법무] 네이밍 3차 실사 — 데구리 폐기, 구르미 1순위 승격

### 판정 (웹 검색 기반 신속 실사)
- **데구리: 🔴 폐기.** 포켓몬 Graveler의 공식 한국어 명칭이 정확히 '데구리'
  (1999년 정발 이래 27년 사용, 국내 스토어에서 봉제인형 판매 중). 카피라이터
  자가 체크("충돌 여백 최대")를 법무 실사가 뒤집은 두 번째 사례 — 자가 체크는
  실사를 대체하지 못한다는 절차 교훈 확정.
- **구르미: 🟡 긍정적 황신호 — 사실상 최종 후보.** 독립 선점 캐릭터·대기업
  충돌 없음. '구르미 그린 달빛'은 제목의 시적 표기일 뿐 상표 장벽 아님(오히려
  친숙한 어감). 해외 gurumi는 뜨개인형 준일반명사 — 우호 연상, 단 28류(완구)
  는 도안결합 출원 권장. 확정 전 관문: KIPRIS 정밀검색(9/41/42류, 화상회의
  '구루미 Gooroomee'와의 42류 근접 확인 포함).

---

## 2026-07-12 · [법무] 마스코트 네이밍 실사 — '볼리' 적신호 폐기

### 경위
- 카피라이터 2차 추천 1순위 '볼리(Bolli)'에 대해 감독 지시로 법무팀(전담
  에이전트) 상표·저작권 실사 수행. 운영원칙 §6 법무 검토 절차의 첫 적용.

### 판정
- **볼리: 🔴 적신호 — 폐기.** 삼성전자 AI 컴패니언 로봇 Ballie의 공식 국문
  표기가 정확히 '볼리'(2024-04 상표 출원, 지정상품 9류 로봇·IoT 인접).
  국내 검색 점유 전멸 + 저명상표 희석화 리스크, 분쟁 상대가 삼성.
- **아야: 🟡 황신호.** 단일 저명 충돌은 없으나 흔한 인명이라 방어력 약함
  (동방프로젝트 아야, Cohere Aya LLM, AYANEO 게임기 인접). 쓴다면 도안
  결합상표 전제.

### 법무 네이밍 가이드 (3차 라운드에 적용)
1. 대기업 테크/AI 제품명과 동일·유사 발음 금지 — 뉴스 검색 첫 페이지에
   대기업 제품이 나오면 즉시 탈락
2. 2음절의 흔한 인명·일반어·감탄사 지양 — 3음절 조어가 강한 상표
3. 유명 게임·애니 캐릭터와 동일명 금지 (고객층이 겹침)

### 확정 후 절차 (요약)
- KIPRIS 정밀 검색 → 도메인/SNS 핸들 선확보 → 문자+도형 각 1건 × 9/41/42류
  출원(관납료 감각 30~40만 원, 심사 12~16개월) → 캐릭터 도안 저작권 등록.
- 이름은 저작권 보호 대상이 아님 — 보호 수단은 상표·부정경쟁방지법.
  도안(치비)은 창작 즉시 보호, 제작 과정 기록 보관 권장.

---

## 2026-07-11 · 서드파티 캐릭터 전면 삭제 — 치비 단일 체제

### 원인
- 에셋 저작권 감사에서 KayKit(CC0·안전)·RPM/DCL(약관 확인 필요) 발견 →
  감독 결정: "치비만 남기고 다른 캐릭터는 완전히 삭제."

### 개선
- avatar.js 1119→289줄 재작성: 치비 전용 디스패처. 구버전 charId('knight',
  'dcl:...', 'rpm:...')는 전부 기본 치비 폴백 — 구클라이언트와 혼재해도 안전.
- ui.js: 프리셋 칩 6종 + DCL 커스터마이저 모달(400줄) 삭제. 로비 캐릭터
  섹션은 치비 버튼 하나(클릭=꾸미기). 치비 메이커는 유지.
- avatarkit.js·SkeletonUtils 벤더·assets/avatars(17MB)·assets/dcl(27MB)·
  assets/anims(RPM 클립) 삭제 — **저장소 51MB → 13MB**.

### 결과
- E2E: 로비 버튼 1개(🧸 치비), 자기 char 치비 인코딩, 구버전 'knight' 원격
  주입 시 치비로 렌더(파츠 25메시), NPC 7명 정상.
- 라이선스 표면: 남은 서드파티는 CC0(하늘)·CC BY(은하수, 표기 완료)·MIT
  (three.js/PeerJS)뿐 — 캐릭터 IP는 100% 자체 보유.

---

## 2026-07-11 · 하늘 HDRI 전환 + 3D 포인트 별 — "별 이상해" 수정

### 원인
- 감독 제보: 별이 이상함 + HDRI 제안. 기존 별은 돔 캔버스 텍스처에 찍은
  점이라 천정 부근 UV 수축으로 찌그러져 보였다.

### 분석
- Poly Haven CDN은 네트워크 정책 차단(403) — pmndrs/drei-assets(GitHub,
  CC0 1k 미러)에서 조달: 낮 immenstadter_horn / 석양 venice_sunset /
  밤 dikhololo_night. RGBELoader(r160) 벤더링.
- 1k HDRI의 별은 뭉개짐 → 별은 HDRI에 의존하지 않고 셀레스철 구 위
  THREE.Points 900개(픽셀 고정 크기, 밝기/웜톤 버텍스 컬러 변주)로 별도
  렌더 — 해상도 무관 또렷함.

### 개선
- 기존 3중 돔 크로스페이드 구조 유지, 맵만 HDR로 교체(프로시저럴 캔버스
  하늘은 즉시 표시 플레이스홀더 + 로드 실패 폴백). ACES 톤매핑과 HDR가
  정합 — 태양 부근 하이라이트가 자연스럽게 탄다.
- 돔 y -20→-70: HDRI 사진의 지면부(베네치아 건물·숲 하단)가 우리 잔디/
  바다 라인 아래로 잠기게. 별 필드도 동일 오프셋.
- cycle: 별 opacity를 밤 가중치(domeNight)에 연동 — 해 지면 별이 떠오른다.

### 결과
- 정오(알프스 하늘+구름)/석양(웜 글로우)/밤(crisp 별) 3시간대 스크린샷 검증.
  자산 +4.9MB(HDR 3장), 드로우콜 +4(돔 3+별 1).

### 후속 (감독 지시 "별을 빼고 은하수 있는 HDRI를 쓰지")
- 포인트 별 제거. 밤 하늘을 **ESO 은하수 4096×2048 파노라마**(CC BY 4.0,
  ESO/S. Brunier — typpo/spacekit GitHub 미러)로 교체. dikhololo_night.hdr
  삭제(-1.7MB, +2.5MB jpg). loadHdriInto가 .hdr(RGBELoader)/.jpg(TextureLoader
  +SRGB)를 확장자로 분기. 밤하늘 별밀도가 실측 사진 수준으로.


![밤 사이클 — 은하수 하늘 아래 불 켜진 미술관](../devlog/img/night-milkyway.jpg)
---

## 2026-07-11 · 기본 전시 cycle 테마 전환 + 잠복 버그 수정 (fog 널 가드)

### 원인
- 감독 지시: 일몰 → "계속 바뀌는" 실시간 낮밤 순환(cycle)으로.

### 분석
- 전환 QA에서 태양이 6초간 미동도 없음을 발견. 모듈 직접 호출로 예외 노출:
  포테이토 모드가 fog를 제거(scene.fog=null)하는데 applyCycleFrame이 fog를
  무조건 갱신 → **매 프레임 TypeError를 animate의 try/catch가 삼켜** cycle
  진행·FPS 집계가 조용히 전멸. 소프트 렌더 기기 + cycle 전시 조합의 잠복 버그.

### 개선
- applyCycleFrame에 fog 널 가드. 기본 전시 테마 sunset → cycle (하루 12분,
  접속 시각 비례 시작 위상).

### 결과
- QA 재실행: 태양 이동 확인 (고도 48.98→41.29, 광량 3.7→3.64 페이드).


![일몰 구간 — 석양 HDRI가 지평선에 비친다](../devlog/img/exterior-sunset.jpg)
---

## 2026-07-11 · 나무 전면 업그레이드 — blob → 디테일 트리, 비용 +2콜

### 원인
- 감독 질문: "동그란 나무를 잎 있는 것으로 다 바꾸면 비용이 올라가려나?"

### 분석
- 실측: 디테일 트리 1그루 = 가지 실린더 17 + 알파 잎 카드 59 ≈ **76 드로우
  오브젝트**. 배경 21그루를 그대로 바꾸면 +1,600콜 — 방금 한 최적화가 무너짐.
- 그러나 천장에 쓴 병합 기법을 쓰면: 나무 재질(수피 1 + 잎 텍스처 3)을 전
  그루가 공유 → 숲 전체를 머티리얼별 4콜로 병합 가능.

### 개선
- sharedTreeMats(): 모든 디테일 트리가 수피/잎 재질 공유.
- bakeGroupByMaterial(): 그룹의 월드 변환을 지오메트리에 굽고 머티리얼별
  병합 (알파 잎은 castShadow 제외 — 투명 그림자 아티팩트 방지).
- 배경 21그루 blob → 디테일 트리 교체 + 근거리 5그루·중정 큰 나무도
  같은 병합 경로로 (기존 개별 76콜×6도 함께 정리).

### 결과
- 드로우콜 255→**257(+2)**, 트라이앵글 +4.4k, renderMs 2.8→3.0.
  "잎 있는 나무 전면 교체"가 사실상 무비용으로 완료.


![잎과 가지가 살아 있는 디테일 트리 — 낮 사이클의 정원](../devlog/img/exterior-day.jpg)
---

## 2026-07-11 · 그림자 강화 — 대비 3층위 상향

### 원인
- 감독 지시: "그림자를 좀 더 진하게 해도 될듯."

### 개선 (그림자만 깊어지고 밝은 면은 유지되는 방향)
- 태양 대비: 전 테마 태양 강도 ↑(3.2→3.7 등) + 채움광(헤미/앰비언트) ↓
  — 그림자 속만 어두워지는 조합.
- 벽-바닥 AO 스트립 0.34→0.44.
- 캐릭터 발밑 블롭 그림자 0.65→0.78.

### 결과
- 정원 나무·건물 그림자가 잔디에 또렷, 실내 무드 유지 스크린샷 확인.

---

## 2026-07-11 · 콕 찌르기 3종 개선 — 사거리 7m + 때린 사람 응시 + "아얏!" 사운드

### 원인
- 감독 지시: ① 좀 더 멀리서도 때릴 수 있게 ② 맞으면 때린 사람을 쳐다보며
  아파하게 ③ "아얏" 사운드.

### 개선
- 사거리 4→7m (탭 레이캐스트 HIT_REACH + 호스트 검증 HIT_RANGE 동시).
- 호스트가 히트 메시지의 타격자 좌표를 NPC 시뮬에 전달 → NPC는 2.5초간
  때린 사람을 최우선 응시(감상 중), 걷던 중이면 1.2초 멈춰 서서 돌아본다.
  연타에도 매번 반응 (아파하는 대사만 쿨다운).
- "아얏!" — WebAudio 합성(에셋 0): "아"(480→760Hz 치솟음 70ms) + "얏!"
  (820→300Hz 급낙하)의 2음절. 레벨이 높을수록 높고 길게, 히트마다 피치
  ±8% 지터로 반복감 제거, 130ms 전역 쿨다운으로 다발 히트 불협화음 방지.
  시각 이펙트(hitfx)와 한 몸이라 모든 클라이언트에서 함께 재생.

### 결과
- E2E QA: 6m 거리(기존 한계 밖) 히트 등록 확인, NPC 응시 방향 오차 0 rad.

---

## 2026-07-11 · 60fps 달성 후 "알리아싱 필요해" — 등급별 픽셀 예산 + 라이브 샤프닝

### 원인
- 감독 실기기 60fps 도달. 남은 불만은 계단(알리아싱).

### 분석
- 픽셀 예산 캡 830만이 모든 등급에 일괄 적용 — 큰 모니터에서는 배율이
  1.0×까지 눌려 MSAA만으로는 계단이 남는다. 캡은 씬이 무겁던 시절 값;
  경량화(renderMs 1/8) 후에는 과잉 방어.
- 승급(high 학습)도 "다음 접속부터"라 이번 세션 화질은 그대로였다.

### 개선
- 픽셀 예산 등급화: low 8.3M / base 11M / high 18M — 큰 모니터도 base에서
  1.15×, high에서 1.47×(4K 기준)까지 허용.
- **라이브 샤프닝**: 55fps+가 10초 지속될 때마다 재접속 없이 배율 +0.25씩
  상향(high 예산 한도, 소프트 렌더 제외). 떨어지면 기존 lite 강등이
  되돌리므로 히스테리시스로 안전. 상향 시 "화질을 한 단계 높였어요 ✨" 토스트.

### 결과
- 강제 검증(승급 임계 0으로 미러 조작): 배율 자동 상향 + high 학습 확인.
  실기기에서는 입장 10초 후부터 계단이 단계적으로 사라진다.

---

## 2026-07-11 · 16fps·뿌옇·계단 제보 — 포테이토 상향 + 진단 가시화

### 원인
- 감독 실기기: 병합 배포 후에도 16fps, 뿌옇고 계단 현상. "ㅠ"

### 분석
- 16fps+블러+계단 3종 조합은 **포테이토 모드의 증상 그대로**(0.5×·AA off·
  20fps 캡) — 그 PC는 "그래픽 가속 사용"을 켰어도 WebGL은 여전히 CPU 렌더링
  중일 가능성이 높다(구형 GPU/드라이버 블랙리스트는 스위치와 무관하게 WebGL
  차단). 원격에서 감으로 추측하는 한계 도달 — 상태 가시화가 필요.

### 개선
- **포테이토 상향** (씬이 renderMs 21.3→2.8로 가벼워진 몫을 반영):
  0.5×→0.7×, 프레임 캡 20→30fps.
- **low 스펙도 AA on** — "AA off+저배율"이 계단+블러를 동시에 만들던 조합
  해체. AA off는 이제 포테이토(소프트 렌더) 전용. PERF_GEN 4 재평가.
- **진단 가시화**: FPS 칩 클릭 → 진단 JSON 복사(GPU명·soft 여부·배율·AA·
  스펙·드로우콜·해상도). 포테이토 중에는 좌하단 상시 배지 "소프트웨어 렌더링
  모드" — 제보에서 모드를 추측하지 않게 한다.

### 결과
- QA(SwiftShader): 배지 표시·0.7×·AA off(포테이토)·진단 칩 배선 확인.
- 다음 제보는 FPS 칩 클릭 한 번으로 정확한 상태가 도착한다.

---

## 2026-07-11 · 가속 후 20fps + 뿌연 화면 — 드로우콜 -62% 병합 + 학습 오염 정리

### 원인
- 감독 실기기: 하드웨어 가속을 켜자 3→20fps로 올랐지만 60에 못 미치고,
  화면이 뿌옇다. "이래서 출시되겠나."

### 분석
- 이제 진짜 GPU 위 씬 비용 문제 — 전문가 지적대로 **드로우콜 676**이 병목.
  구성 계측: 천장 격자 보 247 + 조명 캔 218 + 벌브 218 = **683개가 전부
  개별 드로우콜**(층별 반복 배치). 배경 나무 줄기 21+잎 73도 개별.
- 뿌연 화면: WARP(소프트웨어 렌더링) 세션에서 학습된 'low'(AA off + 배율
  1.25 캡)가 가속을 켠 뒤에도 localStorage에 남음 + 20fps라 lite 모드가
  배율을 1.0으로 강등(OS 배율>1 화면에서는 업스케일 블러).

### 개선
- **지오메트리 병합**(mergeGeometries, 정적이라 무손실): 천장 보·캔·벌브를
  층당 머티리얼별 1콜로(683→9), 배경 나무 줄기 1콜+잎 색상별 4콜(94→5).
- **PERF_GEN 3**: WARP 시절 오염된 low/high 학습 전면 무효화 — 재평가.
- 저사양 '영구 학습'은 16fps 미만에서만(20fps대 기기가 다음 방문부터 계속
  뿌옇게 시작하는 부작용 차단). 라이브 배율 강등에 dpr×0.75 하한(OS 배율
  화면 블러 방지).

### 결과
- 계측: 씬 오브젝트 1605→842, 드로우콜 676→**255**, renderMs 21.3→**2.8**
  (풀 화질 경로·소프트웨어 렌더러 기준 — 실 GPU에선 여유 큼).
- 천장 격자·픽스처·나무 스크린샷 검증 — 시각 무손실.

---

## 2026-07-11 · PC 3fps 최종 진단 — 소프트웨어 렌더링 감지 + 포테이토 모드 (전문가 자문)

### 원인
- 감독 반문: "모바일이 60fps인데 PC가 3fps인 게 이상하다. 씬을 깎아 화질을
  낮추는 건 방향이 틀렸다." — 정확한 지적. 렌더링 전문가(전담 에이전트)를
  고용해 최고 강도로 원인 분석.

### 분석 (전문가 보고 요지)
- 3~4fps = 프레임당 250~330ms는 **소프트웨어 래스터라이저(CPU 렌더링)의 전형
  배율**. 해상도를 낮춰도 안 빨라진 것도 부합 — CPU 렌더는 드로우콜(676)당
  고정비용이 지배적이라 픽셀을 줄여도 상한이 안 오른다. 폰 60fps는 씬의 알리바이.
- 2026년 Chrome/Edge에서 하드웨어 가속을 끄면 SwiftShader가 아니라
  **WARP("Microsoft Basic Render Driver")**로 동작 — 감지 문자열에 필수.
  Chrome M133+는 GPU 블랙리스트 시 WebGL 생성 자체가 실패(전용 안내 필요).
- 원인 후보 순위: 하드웨어 가속 꺼짐 > GPU 블랙리스트/구드라이버 > 원격
  데스크톱 > VM > DevTools CPU 스로틀 잔류 > 안티핑거프린팅 확장.

### 개선
- **GPU 프로브(렌더러 생성 전)**: 1회용 캔버스로 UNMASKED_RENDERER 판독
  (SwiftShader/WARP/llvmpipe/…) + failIfMajorPerformanceCaveat 2차 신호.
- **화질 정책 원상복구**: 다운라이트 15개는 정상 GPU에서 복원(fullLights).
  린 조명·웜 앰비언트는 소프트웨어 렌더링/저사양 학습 기기 전용.
- **포테이토 모드**(소프트 렌더 감지 시): antialias off(생성 시점) ·
  pixelRatio 0.5 · 그림자 off · NoToneMapping · fog 제거 · HUD blur 전면
  해제(.lu-potato — CPU 컴포지팅 절약) · 프레임 캡 20fps(입력 지연 안정).
  예상 10~20fps로 관람 가능.
- **자가 수리 안내 배너**: Chrome/Edge/Firefox별 하드웨어 가속 경로 +
  원격 데스크톱/드라이버/고성능 GPU 지정/시크릿 창 체크리스트 + 감지된
  렌더러 표시 + "진단 정보 복사" 버튼. powerPreference:'high-performance'로
  듀얼 GPU 노트북의 dGPU 선택 유도. WebGL 생성 실패 시 전용 안내.

### 결과
- QA(SwiftShader 환경 = 실전 소프트 렌더): 감지 → 0.5×·그림자 off·조명 5·
  배너(로비 위 노출) 확인. 하드웨어 플래그 강제 시: 1.5×·그림자 on·조명
  19(다운라이트 복원)·배너 없음 — 두 경로 모두 정상.

---

## 2026-07-11 · 데스크톱 3fps 심층 조사 — 조명 19→5 + 섀도맵 프리즈

### 원인
- 픽셀 예산 캡 이후에도 감독 PC에서 여전히 3fps — 해상도(필레이트) 문제가
  아니라는 뜻. 심층 계측 지시.

### 분석 (헤드리스 계측, 기기 독립 지표)
- 조명 **19개**: 다운라이트 PointLight 15 + hemi + ambient + 방향광 2.
  포워드 렌더러는 모든 픽셀 셰이딩에서 조명 전부를 계산 — 15개 포인트가
  픽셀당 비용에 곱해져 약한 GPU를 죽인다.
- 그림자: 태양 4096² PCFSoft 섀도맵을 **정적인 씬인데 매 프레임 재렌더**
  (캐스터 메시 653개). 프레임 시간 분해: 21.3ms 중 섀도 관련 13.3ms(62%).
- 드로우콜 606·트라이앵글 5.5만은 양호 — 병목 아님.

### 개선
- **다운라이트 15개 제거** → 웜 앰비언트 1개(계수 0.022, 스크린샷 대조로
  보정)로 대체. 천장 벌브 emissive·작품 스포트 베이크 데칼이 국소 무드 유지.
  cycle 테마의 시간대별 강도 변화도 웜 앰비언트로 계승.
- **섀도맵 프리즈**: shadowMap.autoUpdate=false — 입장 시 1회 베이크,
  cycle 테마만 2초 주기 재베이크(태양 이동). 아바타는 castShadow 전면
  해제(발밑 블롭 그림자가 접지 담당 — 프리즈 잔상 방지).
- 태양 섀도맵 4096²→2048² (섀도 패스 필레이트 1/4).

### 결과
- 재계측: 조명 19→5, renderMs 21.3→10.6 (2.0배). 소프트웨어 렌더러
  기준이므로 실 GPU에서는 셰이더 단순화 효과가 더 큼.
- 실내 밝기 스크린샷 대조 — 웜 계수 0.012는 천장부가 죽어 0.022로 확정.

---

## 2026-07-11 · 데스크톱 3fps 추락 — 픽셀 예산 캡 + 라이브 강등 + 블러 다이어트

### 원인
- 감독 실기기 제보: 데스크톱에서 3fps.

### 분석
- ① 품질 사다리가 'high'로 학습된 기기에서 슈퍼샘플 2.0×가 화면 크기와
  무관하게 적용 — 4K 모니터면 3840×2160×2² ≈ **3,300만 픽셀**을 매 프레임
  렌더(1080p 기본의 7배). 사다리 설계 당시 화면 픽셀 수를 예산에 안 넣었다.
- ② 새 HUD가 WebGL 캔버스 위에 backdrop-filter blur(16~24px)+saturate 레이어
  다수 — 캔버스 재샘플링 합성이 GPU에 가산. 숨은 HUD(opacity:0)도 컴포지팅에
  남아 있었다.
- ③ 저사양 자동전환(lite)이 관객 컬링+다음 접속 학습만 하고, 이번 세션의
  해상도는 그대로 둬서 3fps인 채로 관람을 계속하게 됨.

### 개선
- **픽셀 예산 캡**: 총 렌더 픽셀 ≤ 830만(1080p×2.0)이 되도록 배율을 화면
  크기에 맞춰 자동 축소 — 4K에서 'high'여도 1.0×로 제한.
- **라이브 강등**: lite 진입(FPS<24) 즉시 setPixelRatio를 1.0 이하로 —
  재접속 없이 이번 세션에서 바로 회복. 복원은 안 함(재추락 깜빡임 방지).
- **블러 다이어트**: blur 16→8px/24→12px, saturate(150%) 전제거, 숨은
  HUD·빈 토스트에 visibility:hidden(컴포지팅 레이어 제거).

### 결과
- QA 재현(4K+high 학습): 배율 2.0→1.0, 33.2M→8.3M px (4배 절감).
  1080p 기본은 1.5× 4.7M px 유지(회귀 없음).

---

## 2026-07-11 · [VFX+HUD 디자이너 동시 감사] 만화 타격 이펙트 + 모바일 HUD 게임급 개편

### 원인
- 감독 지시 ①: 캐릭터 콕 찌를 때 "만화에서 맞았을 때" 같은 시각 리액션이
  없어 타격감 부재. ②: 모바일 HUD가 여전히 조악 — 레퍼런스는 오버워치.

### 분석 (전담 디자이너 2인 보고)
- VFX: 기존 리액션은 >_< 표정+스쿼시뿐. 사운드 없이 타격감을 내려면
  임팩트 프레임(무페이드 등장)·타이밍 계단·스냅 소멸이 핵심.
- HUD 감사 8건: 라운드 값 7종 혼재(실루엣 시스템 부재), 원형 버튼 안 한글
  텍스트(아이콘 0개), 배경 6종·보더 6종 난립, 골드 인플레이션(포인트가
  모든 곳에), 0.15s 물컹한 눌림, 300웨이트 초소형 타이포,
  **viewport-fit=cover 부재로 iOS에서 safe-area env()가 전부 0** (치명).

### 개선
- **hitfx.js 신설**: 공유 캔버스 텍스처 8장(1회 생성) + Sprite clone만으로
  히트당 8~20 스프라이트. 골드 스타버스트(임팩트 프레임, 스냅 소멸) →
  의성어 "콩!/빡!/퍽!!"(+0.03s, easeOutBack, L3 진동 지터) → 방사 스파크
  (1/4 핑크) → 충격 링 → 어질별 궤도 → 발밑 먼지. 레벨 1~3 차등,
  전역 80개 상한 초과 시 축소 모드. 잉크 외곽선(#463a30)으로 치비와 한 그림.
- **Gilded Frame HUD**: 챔퍼 1규칙(7px/14px 대각 컷) + 유리 3토큰
  (glass-1/2 + 크림 종이) + 골드 4규칙(발광 동시 1개). 독 버튼 56px
  스트로크 아이콘+마이크로 라벨, 눌림 0ms/복귀 스프링, 캡처 골드 면+팝.
  조이스틱: 조준선 틱 링 + 달리기 임계 링 점등 + 골드 노브 + 등장 스프링.
  상단 통합 바(전시명+라이브 도트 접속자), FPS는 터치에서 숨김. 토스트
  상단 이동+골드 노치. 더보기 시트 4열 그리드+핸들. 방명록 탭 종이 재질.
  작품 카드 → 하단 좌측 미니 캡션(pointer-events 핵 제거, 카드 전체 탭).
  index.html에 viewport-fit=cover — iOS safe-area 부활.

### 결과
- **후속(감독 피드백 "모서리컷 이상해")**: 챔퍼 clip-path가 보더를 대각선에서
  끊어 모서리가 미완성처럼 보임 → 챔퍼 전면 철회, 라운드 2단계(버튼 10~12px /
  패널 16px / 상단 바 필)로 교체. 유리 토큰·골드 규칙·모션은 유지.
- **후속 2(감독 픽)**: 방명록 책갈피는 종이 재질보다 기존 다크 유리+골드
  라인이 좋다는 피드백 — 원래 디자인으로 복귀(위치 safe-area 대응만 유지).
- 모바일 QA(390×844 터치): 독 아이콘 4종·통합 바·FPS 숨김·시트 핸들 확인,
  조이스틱 lu-live/lu-run 점등, 히트 L2 스프라이트 정확히 14개(스펙 일치),
  L3 버스트 스크린샷에서 링+스파크+퍽!!+먼지 확인, 버스트 자동 정리.
- 데스크톱 회귀 없음(통합 바·FPS 칩·컨트롤 정상).

---

## 2026-07-11 · 캐릭터 몸 충돌 — 통과 방지 + 회피 조향

### 원인
- 감독 제보: 걷는 캐릭터가 다른 캐릭터를 그대로 통과하고, 플레이어도
  NPC/다른 관람객을 뚫고 지나감 — 유령 같은 위화감.

### 분석
- NPC 보행이 목표 직선 이동만 있고 상호 인지가 없음. 플레이어 컨트롤러도
  벽·지면 충돌만 있고 캐릭터 몸은 장애물이 아니었음.

### 개선
- **NPC 회피 조향**(npc.js): 보행 중 반경 0.9m 안의 다른 캐릭터(NPC·사람)에서
  멀어지는 가중 벡터를 목표 방향에 합성 — 완만한 호를 그리며 비켜 간다.
  사람은 가중치 2.2로 더 크게 양보.
- **겹침 하드 해소**(npc.js): 조향으로 못 피한 0.5m 미만 겹침을 직접 밀어냄.
  걷는 쪽이 양보, 감상 중인 쪽은 슬롯 자리 유지. 사람에게는 NPC가 전량 양보.
- **플레이어 몸 충돌**(player.js resolveBodyCollisions): 매 프레임 렌더된
  아바타 위치(mp.getAvatarPositions — 사람+NPC 전부)와 0.6m 분리 유지.
  밀려난 위치도 _tryMove(벽·지면 검증)를 거쳐 2차 벽 관통 차단, 파고드는
  속도 성분 제거로 떨림 방지. 층 구분(발 높이 차 1.2m)으로 위층 캐릭터와
  오충돌하지 않음.

### 결과
- 헤드리스 QA: 15초 시뮬 관찰 NPC 쌍 최소 거리 0.500m(분리 한계 정확 유지),
  플레이어가 NPC를 향해 3초 돌진 시 최소 접근 0.652m — 통과 불가 확인.
- 교훈: SwiftShader 장시간 렌더가 탭을 죽임 — 시뮬 검증은 renderer.render를
  no-op으로 바꾸고 돌리면 안정적.

---

## 2026-07-11 · 비네팅 경계선 제거 (폴오프 스무딩)

### 원인
- 감독 피드백: "비네팅 경계가 살짝 보여" — 화면 가장자리 어두워짐이 시작되는
  지점에 은은한 링(경계)이 감지됨.

### 분석
- 비네팅 그라디언트가 2스톱(투명 58% → 0.34 100%)이라, 58% 지점에서 밝기
  기울기가 0에서 최대치로 **불연속 점프**. 사람 눈은 밝기 자체보다 기울기의
  급변(마하 밴드 효과)에 민감해 스톱 위치가 선처럼 보인다.

### 개선
- DOM 오버레이 그라디언트를 6스톱 이즈드 커브로 교체: 0@50% → 0.03@62% →
  0.09@72% → 0.17@82% → 0.26@91% → 0.34@100% (smoothstep 근사). 시작점도
  58%→50%로 당겨 더 일찍, 더 얕게 시작.
- 사진 캡처(capturePhoto)의 캔버스 radial gradient에도 동일 비율의 중간
  스톱을 추가해 화면과 저장 사진의 무드 일치 유지.

### 결과
- 픽셀 프로파일 검증(흰 배경 위 오버레이 단독 캡처, 중앙→우측 수평 스캔):
  인접 픽셀 밝기 차 최대 1레벨, 기울기 급변 최대 2/255 — 지각 임계 이하.
  인게임 스크린샷에서 링 없이 코너만 자연스럽게 눌림.

---

## 2026-07-11 · 로비(입장 화면) 심플화

### 원인
- 준비 중인 소셜 로그인 3버튼이 최상단 점유, 캐릭터가 텍스트 칩 나열
  (오리지널 치비가 맨 뒤), 입장 버튼이 브랜드 무관 검정 블록 — 첫 화면이
  길고 산만.

### 개선
- 정보 순서 재배치: 닉네임 → 캐릭터 → 색상 → 입장(골드 pill) 순의 한 호흡
  동선. 소셜 로그인은 "소셜 계정 연동 (준비 중)" 구분선 아래로 강등.
- 치비를 캐릭터 1순위 + 신규 방문 기본 선택으로 승격 (1클릭 선택, 재클릭
  꾸미기). 캐릭터 버튼은 캡션 카드 미니어처(라운드 12·웜 보더·호버 리프트).

### 결과
- 스크린샷 검증: 치비 기본 선택·골드 입장 pill·소셜 하단 배치 확인.

---

## 2026-07-11 · [카피+디자인 동시 감사] 랜딩 전면 개편

### 원인
- 감독 지시로 카피라이터·디자이너(전담 에이전트 2인)를 동시 고용해 랜딩 교차 감사.

### 분석 (두 보고서 요지)
- 카피: **사실 모순**(작가 섹션 "작품 14점" ↔ 무료 6점), 최대 USP "가입 불필요"
  전면 부재, 건축 전문용어(우물반자·보이드) 진입장벽, CTA 라벨 불일치, 광고체
  잔존("만끽"), 개발자 관점 문구("서버 업로드 없이").
- 디자인: 한 페이지에 크림 팔레트 3벌 혼재, 카드 4종 스타일 불일치(브랜드
  캡션 카드 모티프를 라이트 섹션이 미구현), .feature-card transition 이중
  선언 버그(호버가 애니메이션 없이 튐), 다크 섹션 2연속 뭉개짐, 모바일에서
  내비 링크 소멸(대체 경로 없음), 요금제 인라인 스타일 부채.

### 개선
- 카피 전면 교체: 히어로 배지 "가입 없이 바로 입장", 비문 교정("작품 사이를
  거닐다"), 기능 카드 3장 감각어 재작성, 작가 섹션 사실 정정(무료 6점 명시)
  + 브랜드 한 문장("작품은 당신이 만들었으니, 미술관은 저희가 지었습니다"),
  CTA 통일(지금 입장하기/내 전시 만들기/무료로 전시 만들기), 빈 상태·에러
  문구 품격화, 폴백 "무제 (Untitled)".
- 디자인: 브랜드 토큰을 앱과 동일한 크림 종이/잉크로 통일, 라이트 카드 전부
  캡션 카드 모티프(라운드 16 + 골드 상단 라인 + 소프트 섀도), transition
  버그 수정, 섹션 리듬 토큰화 + 톤 전환 골드 디바이더, recruit 다크2로 분리,
  요금제 인라인 → 클래스(plan-card 체계), 모바일 내비 가로 스크롤 pill 행
  + 히어로 CTA 풀폭 스택, 히어로에 골드 헤어라인 액자 + 좌하단 라이브 캡션
  카드(열린 전시 수 실시간 표기).

### 결과
- 스크린샷 검증: 히어로 액자·캡션 카드·라이브 카운트("지금 열린 전시 — 1곳"),
  요금제 캡션 카드 2종·골드 체크·pill 입력, 배지/CTA 신규 카피 렌더 확인.

---

## 2026-07-11 · 디자인 리파인 — 방명록·작품 캡션·라이트박스

### 원인
- 감독 피드백: "방명록·작품 설명 화면이 조악하다" — 기능은 갖췄지만 플랫한
  문서 느낌(회색 구분선 리스트, 무장식 헤더, 회색 버튼)으로 미술관 무드와 단절.

### 개선 (크림 종이 + 골드 디자인 시스템으로 통일)
- 작품 정보 패널: 벽면 캡션 카드 은유 — 크림 그라디언트, 라운드 16, 골드
  상단 라인, ARTWORK 아이브로, 볼드 제목, 골드 룰, [크게 보기] pill(호버 시
  골드 필).
- 방명록: 3줄 헤더(GUESTBOOK/방명록/안내문) + 골드 헤어라인, 노트를 종이
  카드화(따옴표 워터마크·닉네임 해시 색점·소프트 섀도), 입력창 라운드+골드
  포커스 링, [남기기] 골드 pill(비활성은 아웃라인), safe-area 대응.
- 라이트박스: 캡션 상단 골드 룰, 제목 웨이트 정돈.
- 랜딩: 피처 카드 라운드 18 + 호버 리프트.

### 결과
- 스크린샷 대조로 세 화면 모두 "갤러리 인쇄물" 톤으로 통일 확인.

---

## 2026-07-11 · [UX 감사] 모바일 독 사망 버그 + 행동 온보딩

### 원인

- "모바일 키 입력을 어떻게 풀지"를 UX/UI 디자이너(전담 에이전트)에게 감사시킨
  결과, 제안 이전에 **치명 버그**가 발견됨: 입장 시 HUD 가시화 목록에서
  모바일 독(dock)과 '?' 조작법 토글이 누락 + `.lu-hud`의 pointer-events:none이
  복구되지 않아, **실기기에서 독 버튼 5개(채팅/목록/투어/시점/캡처)가 투명한
  채 터치도 불가능한 상태로 죽어 있었음**. 방명록 탭만 동작.
- 기존 QA가 못 잡은 이유: JS `element.click()`은 pointer-events와 opacity를
  무시하고 발화 — 실제 입력 경로(터치스크린 좌표 탭)로 검증하지 않았음.

### 분석 (감사 보고서 요지)

- 도달성: 독 5개가 세로 300px로 엄지 호 바깥까지, '?'는 좌상단(최악 사분면),
  safe-area 미대응.
- 발견성: 첫 방문 조작 학습 수단 0(플로팅 조이스틱은 터치 전 어포던스 없음),
  달리기(끝까지 밀기)·탭 드래그·콕 찌르기 전부 숨은 기능.
- 충돌: 작품 정보 카드가 근접 시 오른쪽 시점 드래그 존을 봉쇄(모바일 전용
  회귀), 방명록 탭 기본 위치가 조이스틱 시작점과 겹침.

### 개선

1. **[P0] 독·토글 부활**: hideLobby 가시화 목록에 추가 + 인터랙티브 HUD
   pointer-events 복구 CSS.
2. **작품 카드 터치 통과**: 터치 기기에서 카드 몸통은 pointer-events:none,
   [크게 보기] 버튼만 반응 — 작품 앞에서도 시점 회전 가능.
3. **첫 방문 행동 온보딩**(터치): 모달 없이 3단계 — 맥동 링 "누른 채 밀면
   걸어요" → 이동 1.5m 감지 → "오른쪽을 쓸면 둘러봐요" → 회전 0.6rad 감지 →
   "작품에 다가가면 설명이 — 어려우면 [투어]" → 7초 후 종료(1회, localStorage).
4. 달리기 노브 골드 발광(숨은 기능 가시화), 방명록 탭 기본 38%→20% 상향,
   터치 기기 상태 문구의 키보드 안내 겸용화.

### 결과

- **실제 터치스크린 탭**으로 [캡처] → 공유 모달 오픈 확인 (수정 전 불가).
- 작품 카드 pointer-events none/버튼 auto, 온보딩 링 표시, 탭 위치 상향 검증.
- QA 교훈: 가시성·입력 검증은 JS click()이 아니라 실제 입력 경로(touchscreen
  좌표)로 — 이후 모바일 QA 표준으로 채택.
- 감사 잔여 권고 P2 3종도 같은 날 구현 완료:
  ① 독 IA 개편 — [투어][캡처(골드 강조)][⋯] 3버튼 + 더보기 시트(목록/내 모습/
     채팅/조작법), safe-area 대응, 투어 활성 상태 표시, 채팅 버튼은 접속자
     ≥2일 때만 동적 승격.
  ② 작품 탭 이동 — 화면의 작품을 탭하면 감상 위치로 자동 트윈(레이캐스트 →
     기존 handleArtworkSelect 재사용). 검증: 2층 작품 탭 → 10.4m 층간 자동 이동.
  ③ 라이트박스 감상 제스처 — 핀치 줌(1~4배)·팬·더블탭 줌 토글(2.4배)·
     가로 스와이프 작품 넘김·아래로 쓸어 닫기. 줌 중에는 스와이프가 팬으로
     동작(의도된 모드 분리). 전 항목 실측 통과.

---

## 2026-07-11 · AI 관객 겹침 해소 + 짝 대화 + 드로우콜 병합 + 적응형 저사양 모드

### 원인

- 실기기 제보: 한 작품을 관객 3명이 보는데 전원이 같은 지점에 포개져 서 있음.
- 랜덤 좌우 오프셋(±0.55m)만으로는 충돌 방지가 안 되는 구조였음.
- 관객들이 서로 상호작용 없이 서 있기만 해 생동감이 부족.
- 개발일지 이전 항목의 후속 과제(드로우콜 병합·저사양 관객 축소) 잔존.

### 분석

- 겹침: 같은 작품을 고른 관객끼리 배치 상태를 공유하지 않아 발생 —
  점유 슬롯 개념이 필요.
- 드로우콜: 액자 4변 막대(작품당 4콜)와 치비 뒷머리·앞머리(아바타당 4콜)가
  같은 재질인데도 개별 메시 — 병합 대상.
- 저사양: 프레임 저하의 가변 요인 중 클라이언트가 스스로 조절할 수 있는 것은
  "화면에 그리는 관객 수" — 시뮬레이션은 호스트 소관이므로 로컬 가시성만
  조절하면 다른 접속자에게 영향이 없다.

### 개선

1. **관람 슬롯**: 작품별 점유 슬롯([0,-1,1,-2,2] × 0.62m, 옆 슬롯은 반 발짝
   뒤 지그재그)을 배정 — 같은 작품을 봐도 겹치지 않음.
2. **짝 대화**: 같은 작품 앞 두 관객이 소소한 대화(말 걸기 → 2.5~5초 후 대답,
   대화 중 서로 마주보기, 감상 시간 자동 연장). 꼬마악마가 끼면 까칠하게
   받아친다("흥, 보는 눈은 있으시네요"). 전체 40초 쿨다운.
3. **드로우콜 병합**: 액자 4변 → 1지오메트리(작품 14점 × 3콜 절약),
   치비 커튼+뱅 3개 → 1메시(아바타당 3콜).
4. **적응형 저사양 모드**: 실측 FPS < 24 지속 시 가까운 관객 3명만 렌더
   (10초 히스테리시스, FPS > 45 회복 시 전원 복귀 — 깜빡임 방지).
   상태 안내: "원활한 관람을 위해 먼 곳의 관객을 잠시 숨깁니다".
5. **품질 사다리(AA/SSAA 학습형)**(후속 보강): AA·해상도 배율은 컨텍스트
   생성 시에만 정할 수 있으므로 실측 FPS로 다음 접속의 시작 품질을 학습한다.
   low(AA off·1.25) ↔ 기본(AA on·터치 1.5/데스크톱 최소 1.5× 슈퍼샘플) ↔
   high(AA on + 2.0× 풀 슈퍼샘플). 저사양 모드 발동 시 즉시 low로, FPS 55+
   10초 지속 시 한 단계 승급 — MSAA와 SSAA를 이중으로 걸어 계단 현상을 누른다.

6. **플랫함 보정(접촉 그림자)**(후속 보강): 베이킹 전환 후 남은 균일한
   들뜸을, 벽·바닥 접합부를 따라 층당 4장의 정적 AO 그라디언트 스트립
   (진하게 0.34 → 실내 방향 소멸)으로 접지시켜 회복. 작품 자체발광은
   감독 판단으로 완전 제거 — 작품도 공간 조명을 그대로 받아 시간대 분위기에
   녹아든다. 실시간 비용 0.

7. **모바일 액자 앨리어싱 수정**(실기기 제보): 고DPR(×3) 폰을 배율 1.5로
   캡하던 것이 절반 해상도 확대 = 고대비 직선(액자)의 계단 원인 — 터치 기본
   캡을 2.0으로 상향. 아울러 성능 세대(PERF_GEN) 도입: 대형 최적화 배포 시
   과거의 low/high 학습을 무효화하고 재평가 — 무겁던 시절 low로 굳은 기기가
   최적화 후에도 AA off로 남던 문제 해소.

### 결과

- 같은 작품 강제 배치 검증: 두 관객 슬롯 [-1, 0], 간격 0.77m — 겹침 해소.
- 대화 실측: "저 『Neon Vanitas』 보러 두 번째 와요" → "오… 그 마음 알 것
  같아요" (작품 제목 반영, 순차 발화, 접속자 전원에게 릴레이).
- 저사양 모드: 소프트웨어 렌더 환경(실제 저FPS)에서 자동 발동 —
  관객 7명 중 가까운 3명만 표시 확인.
- 실측 함정 기록: 병합 전후 드로우콜 비교 시 측정 조건(멀티플레이 연결 여부에
  따른 아바타 수)이 달라 단순 비교가 무효였음 — 성능 비교는 동일 씬 구성에서.

---

## 2026-07-11 · 베이크드 라이팅 — 모바일 프레임 개선

### 원인 (무엇이 문제였나)

- 실기기(모바일)에서 "조작이 쉽지 않다"는 제보에 이어, 저사양 폰에서 프레임이
  충분히 나오지 않을 구조적 요인이 확인됨.
- 증상: 최신 폰·데스크톱에서는 55~60fps 예상이나, 보급형·구형 폰과
  고해상도(DPR 3) 기기에서 20~30fps 수준으로 떨어질 위험.

### 분석 (병목 실측)

기기 성능과 무관한 렌더 부하 지표를 헤드리스 브라우저로 실측했다.

| 지표 | 측정값 | 판정 |
|---|---|---|
| 삼각형 | 70,066 | 매우 가벼움 — 병목 아님 |
| 텍스처 | 59장 | 양호 |
| **실시간 조명** | **33개 (SpotLight 14)** | **주 병목** |
| 드로우콜 | 555 | 부 병목 (모바일 기준 높음) |
| 해상도 배율 | 최대 2 캡 | 기존 방어 확인 |

핵심 발견: three.js 포워드 렌더러는 **화면의 모든 픽셀이 씬의 모든 조명을
셰이더에서 계산**한다. 특히 작품마다 달린 SpotLight 14개는 원뿔 각도·페더링
(penumbra) 연산이 픽셀 단위로 반복돼 fill-rate가 약한 모바일 GPU에서 비용이
가장 크다. 반면 지오메트리(삼각형 7만)는 전혀 문제가 아니었다 — "가벼운 씬에
무거운 조명"이 진단.

또한 미술관 조명은 전부 **정적**(움직이지도, 작품 스포트는 테마별로 색이 변하지도
않음 — 전 테마 공통 웜화이트 0xfff4e0)이므로, 매 프레임 실시간 계산은 순수 낭비였다.

### 개선 (무엇을 했나)

전시장이 블렌더 에셋이 아니라 코드 생성 씬이라 오프라인 라이트맵 대신
**디캘 베이킹**을 적용했다.

1. **스포트라이트 14개 전부 제거** → 각 작품에 미리 그린 방사형 그라디언트
   텍스처 2장으로 대체:
   - 벽 글로우(액자 주변 월워셔 워시, 가산 블렌딩, 불투명도 0.42)
   - 바닥 빛 웅덩이(작품 앞 1.15m, 불투명도 0.22)
   - 그라디언트는 256² 캔버스 1장을 앱 수명 동안 공유.
2. **작품 자체발광 보정**: 스포트가 사라지면 작품이 어두워지므로 작품 재질에
   `emissiveMap`(작품 이미지와 동일 텍스처, 강도 0.55)을 미러. 부수 효과로
   새벽·야간 테마에서도 작품이 항상 정확한 색으로 표시된다(실제 미술관의 원칙).
3. **조명기구는 시각 요소로 유지**: 트랙 헤드·발광 렌즈 메시는 그대로 —
   겉모습 변화 최소화.
4. **모바일 렌더 프리셋**(동반 개선): 터치 기기는 antialias off +
   DPR 1.5 캡 — 픽셀 비용 약 40% 추가 절감.
5. 스코프 판단: 천장 다운라이트(PointLight ~15개)는 시간연동(cycle) 테마가
   런타임에 색·강도를 보간하는 기계와 얽혀 있어 이번 베이킹에서 제외.
   (다음 후보 — 테마별 디캘 틴트 갱신 경로를 설계한 뒤 진행.)

과정 중 수리한 함정: 헬퍼 삽입 시 `export function getViewingPose`의
`export`와 `function` 사이가 갈라져 모듈 export가 깨짐 — 부분 문자열 치환의
위험 사례로 기록해 둔다(앵커는 라인 전체로 잡을 것).

### 결과 (수치 검증)

| 지표 | 개선 전 | 개선 후 | 변화 |
|---|---|---|---|
| 실시간 조명 | 33개 | **19개** | −42% |
| SpotLight | 14개 | **0개** | −100% |
| 드로우콜 | 555 | **477** | −14% |
| 시각 품질 | — | 스크린샷 대조로 동등 확인 | 유지 |

- 픽셀당 조명 연산에서 가장 비싼 스포트라이트가 0이 되어, 저사양 폰의
  프레임 개선 폭이 가장 클 것으로 예상. 실기기 FPS 계측(우상단 표시)으로
  후속 확인 예정.
- 남은 개선 후보: ① 다운라이트 15개 베이킹(조명 19→4) ② 액자·치비 파츠
  지오메트리 병합(드로우콜 477→300대) ③ 저사양 감지 시 AI 관객 수 축소.


![2층 발코니에서 내려다본 1층 전시실](../devlog/img/interior-gallery.jpg)
---

## 기록 형식

```
## YYYY-MM-DD · 제목

### 원인 / ### 분석 / ### 개선 / ### 결과
```
