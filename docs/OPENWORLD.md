# 오픈월드 로드맵 — 파셀 그리드 · 지속 세계 · 직원 NPC

> ⚠️ **내부 기획 문서.** behind-flag 실험(`web/world.html`)의 설계 SSOT.
> 배경: 감독이 "디센트럴랜드/복셀식 순수 지속 오픈월드"를 목표로 선택(무저장·무운영비·자기완결
> 철학 완화 감수) + "우리 직원들(AI 팀·마스코트 아야모)을 NPC로 소환". 아키텍처 판단은 부팀장,
> 확장 경로는 `docs/SCALING.md`와 짝 — 2026-07-19.

## 핵심 통찰: 4대 철학 중 실제 포기는 3개

`SCALING.md`가 이미 "작은 방 수천 개 샤딩"을 확장 모델로 못박았다. 디센트럴랜드/복셀식 세계도 내부적으로는
**파셀(구역) 단위 로드·중계**로 쪼갠다. 따라서 **작은방샤딩은 포기 대상이 아니라 오픈월드의 구현 수단**이며,
완화 비용은 **무저장 / 무운영비 / 자기완결** 3개에만, 그마저 단계별로 지연·부분화된다.

목표 아키텍처 = "거대한 단일 방"이 아니라 **작가 단칸 공간(space.js)들을 그리드에 타일링하고 인접분만 스트리밍**.

## 목표 아키텍처

### 파셀 그리드 (자유배치 아님)
- 정수 그리드 좌표 `(px, pz)`. 월드 오프셋 = `(px*CELL, 0, pz*CELL)`. 셀 크기 CELL은 최대 풋프린트 대응
  고정 타일(설계값 32m; 스파이크는 벽 공유 검증을 위해 방 폭=9m로 축소).
- 이웃 참조는 **저장하지 않는다** — `(px±1, pz)`·`(px, pz±1)` 계산으로 조회(그리드의 핵심 이점).
- 배치(px,pz)는 **space 문서에 넣지 않는다** — 공간의 속성이 아니라 월드의 속성. 별도 월드 매니페스트 소관.

### 스키마 (SPACE_VERSION 불변)
- `web/js/space.js`에 **가산 필드 하나**: `shell.entries` = 파셀 경계 개구부 방향 목록(`['north','south','east','west']` 부분집합).
  생략/빈배열 = 사방 폐쇄 = 기존 v2 문서 100% 동일(회귀 0). `p.y`/`p.featured`/`p.ar`과 동일한 옵션 필드 패턴.
- **저작 불변식(1단계 매니페스트 착수 전 강제)**: 인접 파셀 쌍은 대응 방향 entries를 **함께** 선언해야 한다
  (A가 `east`면 동쪽 이웃 B는 `west`). `world.js clampPos`는 현재 파셀의 entries만으로 통과를 허용하므로,
  한쪽만 문을 내면 플레이어가 시각적으로 막힌 벽을 통과하는 불일치가 발생한다.
- 배치·발행은 v1은 정적 매니페스트, v3(지속백엔드)에서 DB 소관.

### 렌더 (다중 셸 스트리밍)
- `web/js/space-render.js` `buildSpaceGroup`은 이미 자기완결 Group을 반환 → 파셀마다 호출해 월드 오프셋에 배치.
  가산: `shell.entries` 방향에 **문틀(좌우 세그먼트+상단 인방)** 개구부, `opts.shellOnly`(원거리/대각 파셀 임포스터 — `ART_SCREEN_CAP=80`이 방당이므로 스트리밍 시 필수).
- `web/js/world.js`(신규): `loaded: Map<"px,pz">` + 3×3 스트리밍(직교=풀디테일, 대각=shell). visit.js의 검증된
  이동·충돌을 파셀 다중으로 확장. `clampPos`가 개구부+이웃로드+문범위일 때만 경계 통과 허용(아니면 벽 clamp).

### 실시간 (2단계: 데모=단일 룸 / 확장=디스트릭트 샤딩)
- **2단계 데모(구현됨, behind-flag)**: 기존 `multiplayer.js`(PeerJS 호스트릴레이)를 무수정 재사용해 **단일 월드 룸**
  (`PEER_ROOM_ID-openworld`)으로 배선. "같은 월드 접속자끼리 아바타 상호 가시성"을 0원(공용 브로커)으로 실증.
  소규모 데모엔 단일 룸이 적정하다(디스트릭트 경계 인스턴스 교체는 복잡·버그 위험 = 조기 최적화, `SCALING.md` 0단계 정신).
- **확장 트리거(동시 접속 증가 시)**: 호스트릴레이는 방당 용량 천장(N≈13~51, `SCALING.md`)·호스트 소멸 한계가 있으므로,
  트래픽이 붙으면 **디스트릭트 샤딩(4×4 파셀=1룸, roomId suffix + 경계 시 mp 인스턴스 교체)** 또는 **Supabase Realtime
  Presence**(서버 중계라 호스트 소멸 없음)로 이행. `multiplayer.js` 검증·레이트리밋·클램프 계약은 그대로 이식.
- **플래그 해제 전 보안 선결(security-officer 29259bf)**: world.html 인라인 스크립트 sha256 해시 고정(`'unsafe-inline'` 제거),
  P2P IP 노출 UI 고지, `connect-src`를 `wss://0.peerjs.com`로 축소, `openworld` 룸 예약어 등록.

### 지속 백엔드 (CSP 무변경)
- Supabase(Postgres+Auth+RLS+Realtime). 저장: 공간 문서 / 파셀 배치(`(px,pz)` 유니크=중복 점유 방지) / 방명록.
  아바타 위치는 **저장 안 함**(Presence 휘발). 현 CSP `connect-src 'self' https: wss:`가 이미 Supabase REST/Realtime 허용 → **CSP 수정 불필요**.

## 직원 AI NPC (설계 축 6)

**결정적 이점: 클라이언트 결정론(무저장)으로 두면 백엔드·네트워크 0으로 전 단계에서 동작.**

- **엔진 재사용**: 기존 `web/js/npc.js` `NpcCrowd`(상태기계 WALK/VIEW·회피 조향·작품 감상평·근접 인사·짝 대화)를
  그대로 재사용. `artworks.js`의 `getViewingPose(art)`는 순수 함수라, space의 `artwork` 파츠를 art 포맷
  (`{pos, rotY, floorY, title, featured}`)으로 변환하면 계열 A 결합 없이 구동된다.
- **직원 페르소나 주입**: `NpcCrowd` 생성자에 `opts.roster` 가산(미주입 시 기존 익명 관객, 회귀 0).
  roster 원소 `{id, nickname, char, color, remarks, greetings}` — 아바타는 `avatar.js` `createAvatarInstance`(사람과 공용 경로).
- **대사**: 1차 사전 대사 풀(자기완결·무비용·오프라인). LLM 연동은 3단계 서버 프록시(API 키 비노출, 보안 게이트) 도달 시 옵션.
- **앰비언트(비타격)**: 때리기 미포함 → 권위 서버 불필요 → NPC가 4단계를 요구하지 않음.

### 법무 / IP
- 직원 NPC = 자사 AI 페르소나 + 자작 마스코트(아야모). 실존 타인·타사 브랜드 아님 → §6 원칙적 무해.
- **이름표는 핸들/역할**('팀장·부팀장·실행·마스코트 아야모')로 표기 — ROSTER의 `name`(모델 브랜드명)을
  노출하면 타사 상표 소지(§6 + CLAUDE.md "모델 식별자를 아티팩트에 넣지 않는다"). `handle`/`role` 사용.
- 실존 인물 '감독' 페르소나는 본인 승인 시에만 등장. 대사 풀은 자작 원문만.

## 5단계 로드맵 (라이브 미술관 불훼손)

계열 A(main/config/scene/artworks + multiplayer)는 한 줄도 건드리지 않는다. 오픈월드는 계열 B 가산 + 신규 `world.js`/`world.html`, 전 과정 behind-flag.

| 단계 | 내용 | 트리거 | 철학 완화 | 법무 |
|---|---|---|---|---|
| **스파이크** | 정적 2파셀 걷기 + 아야모 등 직원 NPC(클라이언트 결정론) | — | **0** | 없음 |
| **1 정적월드** | ROSTER 전원 NPC + N칸 정적 `manifest.json`(커밋 발행) | 스파이크 성공 | **0** | 없음 |
| **2 실시간** | 디스트릭트 Presence 샤딩 | 동시 회유 수요 | 무운영비만 | 없음(위치 휘발) |
| **3 지속백엔드** | Supabase: 공간·파셀배치·방명록 서버 공유, 런타임 자가 발행 | 공유 기록이 제품가치 | 무저장·자기완결 포기 | **개인정보처리방침 필수(§6)** |
| **4 권위서버** | 조건부(치트방지). 대개 불필요 | 명시 요구 시만 | — | — |

- **NPC는 전 단계에서 로컬 결정론 유지** → 실시간 대역폭 기여 0 (`SCALING.md` "AI가 부하를 콘텐츠로 치환"의 문자적 실현).
- **폴백 지점**: 1단계 정지 = "직원 NPC가 걸어다니는 정적 연속 세계"(철학 4개 전부 보존). 3단계 정지 = 순수 지속 오픈월드의 실질 완성. 4단계는 진입 금지 기본값.

## 스파이크 구현·검증 (2026-07-19)

**파일**: `space.js`(shell.entries 가산) · `space-render.js`(문틀 개구부 + shellOnly) · `npc.js`(roster 주입 옵션) · `world.js`(신규) · `world.html`(신규, behind-flag). 셀=9m, 프리셋 2개(미니멀 화이트/금계 라운지)를 파셀 (0,0)/(1,0)에 공유 벽으로 배치, 직원 NPC 3명(아야모·팀장·부팀장)을 (0,0)에 소환.

**헤드리스 QA(swiftshader) 결과**:
- 초기 파셀 로드 `['0,0','1,0']` / NPC 스프라이트 3 / 콘솔 에러 0
- 문 통과: 파셀 0↔1 왕복 성공 / 문 밖(z=2.5) 동진 시 벽 clamp(파셀 0 유지) — 개구부·충돌 정확
- 회귀: `visit.html`·`builder.html` 콘솔 에러 0

## 1단계 구현 · 정적 10×10 = 100방 (2026-07-19)

스파이크 위에 **손저작 없는 100방 세계**를 얹었다. 방은 시드 절차생성(결정론=무저장 유지), 개구부는 격자 경계로 자동 대칭, 직원 10명을 중앙 로비에 소환. 동시 로드는 여전히 **3×3(9방)뿐**이라 부하는 스파이크와 동일.

**파일**:
- `web/js/world.js` — CELL 스칼라 → **cellX/cellZ**(비정사각 셀). medium(9×7) 통일 시 cellX=9/cellZ=7로 벽 정합(북벽 월드z `pz*7-3.5` = 북쪽 이웃 남벽). `opts.cell` 폴백 유지(스파이크 무회귀).
- `web/js/world-gen.js`(신규) — `mulberry32`/`cellSeed`(정수 해시, 브라우저 무관 결정론), `computeEntries`(격자 경계 자동 대칭 — A.east ⟺ 이웃 B.west 구조적 보장), `genRoom`(마감 192조합 + rng 가구 + 15% 랜드마크 프리셋 방, 방당 파츠 ~10-15).
- `web/world/manifest.json`(신규) — grid 10×10, cell{9,7}, seed, spawn[4,4], **NPC 10명**(아야모 + 팀장·부팀장·실행[정규직 handle] + 법무팀·보안담당자·디자이너·카피라이터·성능 전문가·리서처[계약직 역할명]). char는 결정론 위해 고정 chibi 문자열, remarks는 `{t}` 템플릿.
- `web/world.html` — 하드코딩 → `fetch('./world/manifest.json')` → `genRoom` 100파셀 + home NPC 그룹핑 → `createWorld({cellX,cellZ})`. **미니맵 HUD**(현재 셀·NPC home·방문 셀) 추가.
- `web/js/space-presets.js` — `northArt` export(world-gen 재사용).

**개구부 자동 대칭**: 100방 손저작 불가 → `computeEntries`가 격자 경계로 이웃 존재 방향을 산출해 `shell.entries`에 주입. "인접 쌍은 대응 방향 문을 함께 선언" 불변식(위 스키마 절)이 코드로 구조적 보장됨.

**성능 논증**: `updateStreaming`은 현재 파셀 3×3만 순회 → 100방이든 10000방이든 동시 로드 최대 9방(맨해튼≤1 풀 5 + 대각 shell 4). 대각은 `shellOnly` 임포스터로 파츠 생략.

**헤드리스 QA(swiftshader)**: 스폰 [4,4] 3×3=9방 로드 / NPC 5명(full 5방의 home — 대각 4방은 shell라 미스폰, 정확) / (9,9) 모서리 로드셋 4(≤9 상한) / 대각선 종주 (0,0)→(9,9) 에러 0 / 정중앙 5-full 드로우콜 **146**(고정 미술관 255 대비 안전) / 문 통과 [4,4]→[5,4] / `genRoom` 결정론 deep-equal / 미니맵 렌더 / 콘솔 에러 0. **회귀**: `index.html`(고정 미술관·npc.js 공유)·`visit.html`·`builder.html` 콘솔 에러 0.

## 다층 구현 · 층 쌓기 (2026-07-19)

방을 위로 여러 층 쌓는다. **불변식 "floors=1이면 기존과 바이트 동일"** 로 라이브 방문자뷰·빌더(space-render 공유) 회귀를 봉쇄한다. 계단은 `parts`가 아니라 **`shell.stairs[]` 밴드**(config.js `BUILDING.stairs`·player.js `stairGroundAt`과 동형)로 정의해 검증된 지면물리를 그대로 이식한다.

**파일**:
- `space.js` — `shell.floors`(1~4)·`shell.stairs`(`{x0,x1,z0,z1,yFrom,yTo}` 밴드) 가산(entries 패턴, SPACE_VERSION 불변, 생략=단층).
- `space-render.js` — `buildSpaceGroup` 셸 층 루프: 슬래브 `f*H-0.05`, 천장 `totalH`, 4벽 `baseY=f*H`(문틀은 지면층 f=0만 = 파셀 통행), 피처월 f=0, 계단 램프 지오. `spaceDims`에 `floors/totalH`, `pY`에 `p.floor` 오프셋. **floors=1이면 f=0 1회로 현행 합동**.
- `world.js` — 지면물리 이식(player.js): `stairGroundAt`/`groundCandidatesAt`/`resolveGround`/`groundY`, `blocked`·`walk`를 groundY 상대로, 카메라 y가 계단 경사 추종(`GROUND_LERP_RATE`), `setPosition` 지면 리셋. floors=1이면 groundY=0 → 현행 수치 동일.
- `world-gen.js` — 20% 방을 2층(SW 서벽 계단 + 상층 동벽 작품, 계단-파츠 충돌 회피 위해 furnish 생략).

**Stop B/C 수준**: 계단으로 실제 등반. 슬래브는 통짜(계단 상부 개구부 없음 → 램프가 슬래브 관통, 시각 클리핑 감수). 중앙 보이드(내려다보기)·NPC 다층 인식·원격 플레이어 다층은 스코프 아웃(후속).

**헤드리스 QA(swiftshader)**: floors=1 자식 7개(=현행)·floors=2 자식 13/totalH 7.2 / visit·builder 콘솔 에러 0(회귀) / 계단 등반 groundY 0→3.6 / 단층 groundY 0 유지 / 문 통과 12/12 / 결정론.

## 복셀스 전환 · 개방 도시 월드 (2026-07-19, 감독 방향 전환)

감독 피드백 "밀폐된 방의 연속은 답답하다 — voxels.com처럼 길·다양한 크기/층고·하늘·바다·강" → **"파셀=방"을 "파셀=하늘 아래 대지"로 전환**. 핵심 통찰: 방 크기를 통일했던 유일한 이유(인접 벽 정합)가 개방 세계에선 소멸 → **footprint·층고·층수 전부 자유**.

- **월드**: 셀 24×24m, 10×10=240×240m 도시. 파셀 중앙부 건물 + 가장자리 도로 스트립(남·동, 이웃과 5m 도로망). 건물 오프셋 지터로 거리 리듬.
- **건물**: footprint small/medium/large 가중 + storyH 3종 + 1~2층 → 스카이라인 2.8~8.4m. 입구는 남쪽 문틀(`entries:['south']`). 내부는 기존 테마·작품·계단 유지(좌표는 dims 기반 일반화).
- **하늘/물**: 캔버스 그라디언트 스카이돔(자기완결) + 태양 디렉셔널(플레이어 추종 섀도) + 밝은 fog. 바다=월드 아래 고정 물 평면(y=-0.3). 강=시드 랜덤워크 열(`riverColAt`, 행당 ±1) — 지면 생략으로 바다 노출 + 동서 다리. 물 지반 -0.4(첨벙 가능, STEP_TOLERANCE 이내 복귀).
- **충돌 반전**: "방에 가두기"(clampPos) 제거 → "벽이 막기". 건물 4벽을 solid AABB 세그먼트(`computeShellSolids`, 문 구간 비움)로 등록해 기존 `blocked()`가 처리. 월드는 소프트 클램프만.
- **원격 아바타**: sendState y=groundY+EYE_HEIGHT (다층·강 반영 — 기존 단층 TODO 해소).
- 파일: `world-gen.js`(genParcel/riverColAt/좌표 일반화), `world.js`(스카이·지면·다리·바다·shellSolids·개방 이동), `world.html`(강 회피 fixLand·미니맵 강), `manifest.json`(cell 24). **space-render/space.js 무수정**(라이브 공유 리스크 0).

**헤드리스 QA(swiftshader)**: 거리 자유 이동(파셀 전환, clamp 없음) / 남문 진입(로컬 z=-2.6) / 북벽 차단(z=-3.4 정지) / 강 첨벙 groundY -0.4·다리 0 / 2층 계단 등반 3.6 / NPC 5 스폰 / 하늘 렌더 / 콘솔 0. world-gen 전수 assert: footprint 3종 배치 안전(통로·벽 안) 0건, 강 연속성(행당 ±1), 결정론.

## 리스크

- **드로우콜**: 파셀 9개 풀로드 시 `ART_SCREEN_CAP=80` 초과 → `shellOnly` 임포스터 LOD로 완화(스파이크는 직교 풀/대각 shell).
- **파셀 점유 경쟁·백엔드 SPOF**: 3단계 사안 — 유니크 제약 + 정적 매니페스트를 read-only 폴백으로 상시 유지.
- **버전 파편화**: `migrateSpace` 상위 버전 거부 → 클라이언트 버전 스큐 시 이웃 공간 로드 실패. 오픈월드 발행 시 버전 하한 협상 필요.
