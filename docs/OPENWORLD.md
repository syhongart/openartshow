# 오픈월드 로드맵 — 파셀 그리드 · 지속 세계 · 직원 NPC

> ⚠️ **내부 기획 문서.** behind-flag 실험(`frontend/world.html`)의 설계 SSOT.
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
- `frontend/js/space.js`에 **가산 필드 하나**: `shell.entries` = 파셀 경계 개구부 방향 목록(`['north','south','east','west']` 부분집합).
  생략/빈배열 = 사방 폐쇄 = 기존 v2 문서 100% 동일(회귀 0). `p.y`/`p.featured`/`p.ar`과 동일한 옵션 필드 패턴.
- **저작 불변식(1단계 매니페스트 착수 전 강제)**: 인접 파셀 쌍은 대응 방향 entries를 **함께** 선언해야 한다
  (A가 `east`면 동쪽 이웃 B는 `west`). `world.js clampPos`는 현재 파셀의 entries만으로 통과를 허용하므로,
  한쪽만 문을 내면 플레이어가 시각적으로 막힌 벽을 통과하는 불일치가 발생한다.
- 배치·발행은 v1은 정적 매니페스트, v3(지속백엔드)에서 DB 소관.

### 렌더 (다중 셸 스트리밍)
- `frontend/js/space-render.js` `buildSpaceGroup`은 이미 자기완결 Group을 반환 → 파셀마다 호출해 월드 오프셋에 배치.
  가산: `shell.entries` 방향에 **문틀(좌우 세그먼트+상단 인방)** 개구부, `opts.shellOnly`(원거리/대각 파셀 임포스터 — `ART_SCREEN_CAP=80`이 방당이므로 스트리밍 시 필수).
- `frontend/js/world.js`(신규): `loaded: Map<"px,pz">` + 3×3 스트리밍(직교=풀디테일, 대각=shell). visit.js의 검증된
  이동·충돌을 파셀 다중으로 확장. `clampPos`가 개구부+이웃로드+문범위일 때만 경계 통과 허용(아니면 벽 clamp).

### 실시간 (2단계: 데모=단일 룸 / 확장=디스트릭트 샤딩)
- **2단계 데모(구현됨, behind-flag)**: 기존 `multiplayer.js`(PeerJS 호스트릴레이)를 무수정 재사용해 **단일 월드 룸**
  (`PEER_ROOM_ID-openworld`)으로 배선. "같은 월드 접속자끼리 아바타 상호 가시성"을 0원(공용 브로커)으로 실증.
  소규모 데모엔 단일 룸이 적정하다(디스트릭트 경계 인스턴스 교체는 복잡·버그 위험 = 조기 최적화, `SCALING.md` 0단계 정신).
- **확장 트리거(동시 접속 증가 시)**: 호스트릴레이는 방당 용량 천장(N≈13~51, `SCALING.md`)·호스트 소멸 한계가 있으므로,
  트래픽이 붙으면 **디스트릭트 샤딩(4×4 파셀=1룸, roomId suffix + 경계 시 mp 인스턴스 교체)** 또는 **Supabase Realtime
  Presence**(서버 중계라 호스트 소멸 없음)로 이행. `multiplayer.js` 검증·레이트리밋·클램프 계약은 그대로 이식.
- **플래그 해제 전 보안 선결(security-officer 29259bf)** → **완료(아래 "플래그 해제 준비" 절)**: 인라인 스크립트를
  외부 모듈(`js/world-boot.js`)로 추출해 `'unsafe-inline'` 제거(해시 대신 파일 분리 — 유지보수 우위), P2P IP 노출 UI 고지,
  `connect-src`를 `'self' wss://0.peerjs.com`로 축소, `openworld` 룸 예약어 문서 게이트.

### 지속 백엔드 (CSP 무변경)
- Supabase(Postgres+Auth+RLS+Realtime). 저장: 공간 문서 / 파셀 배치(`(px,pz)` 유니크=중복 점유 방지) / 방명록.
  아바타 위치는 **저장 안 함**(Presence 휘발). 현 CSP `connect-src 'self' https: wss:`가 이미 Supabase REST/Realtime 허용 → **CSP 수정 불필요**.

## 직원 AI NPC (설계 축 6)

**결정적 이점: 클라이언트 결정론(무저장)으로 두면 백엔드·네트워크 0으로 전 단계에서 동작.**

- **엔진 재사용**: 기존 `frontend/js/npc.js` `NpcCrowd`(상태기계 WALK/VIEW·회피 조향·작품 감상평·근접 인사·짝 대화)를
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

> ⚠ **이 번호는 이 절 안에서만 유효하다** (2026-08-16 정리). 인프라 확장 단계의 SSOT 는
> **`docs/SCALING.md` 의 「3단계 이전 경로」** 다. 같은 "3단계" 가 여기서는 「Supabase
> 지속백엔드」, `SCALING.md` 에서는 「영속화 백엔드」, `REFERENCES.md` 에서는 「서버권위
> 멀티플레이어」다. **번호로 말하지 말고 이름으로 말한다.**

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
- `frontend/js/world.js` — CELL 스칼라 → **cellX/cellZ**(비정사각 셀). medium(9×7) 통일 시 cellX=9/cellZ=7로 벽 정합(북벽 월드z `pz*7-3.5` = 북쪽 이웃 남벽). `opts.cell` 폴백 유지(스파이크 무회귀).
- `frontend/js/world-gen.js`(신규) — `mulberry32`/`cellSeed`(정수 해시, 브라우저 무관 결정론), `computeEntries`(격자 경계 자동 대칭 — A.east ⟺ 이웃 B.west 구조적 보장), `genRoom`(마감 192조합 + rng 가구 + 15% 랜드마크 프리셋 방, 방당 파츠 ~10-15).
- `frontend/world/manifest.json`(신규) — grid 10×10, cell{9,7}, seed, spawn[4,4], **NPC 10명**(아야모 + 팀장·부팀장·실행[정규직 handle] + 법무팀·보안담당자·디자이너·카피라이터·성능 전문가·리서처[계약직 역할명]). char는 결정론 위해 고정 chibi 문자열, remarks는 `{t}` 템플릿.
- `frontend/world.html` — 하드코딩 → `fetch('./world/manifest.json')` → `genRoom` 100파셀 + home NPC 그룹핑 → `createWorld({cellX,cellZ})`. **미니맵 HUD**(현재 셀·NPC home·방문 셀) 추가.
- `frontend/js/space-presets.js` — `northArt` export(world-gen 재사용).

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

## 거리 연출·물결·거리 NPC 고도화 (2026-07-19)

복셀스 개방 도시에 거리 디테일 3종을 가산(전부 결정론·behind-flag·라이브 무수정).

- **거리 가구**(`world-gen.genStreet` + `world.js buildStreet`): 육지 파셀에 가로수(줄기+2단 캐노피 InstancedMesh, 저채도 녹색 3톤)·
  가로등(진회색 기둥 + 웜톤 emissive 갓, 실제 THREE.Light 0)·벤치·화분(정점색)을 시드 절차 배치. 장식 시드(`STREET_SALT` XOR)로
  건물/강 생성과 독립. 도로 통행 스트립·건물 풋프린트·남문 접근로(3m)·강 회피, 파셀당 ≤6. 배치와 solid를 같은 배열에서 파생(렌더-물리 정합).
- **물결 애니메이션**(`world.js`): `T.water`(강/바다 공용 sea 평면)에 자작 소형 잔물결 캔버스 텍스처 + `update`에서 `map.offset` 스크롤.
  저사양(버텍스 변형·셰이더 0, 드로우콜 증가 0). `space-render.waterTexGen`은 비공개라 라이브 공유파일 무수정 위해 소형 자작.
- **거리 배회 NPC**(`world-gen.genWalker` + `world.js streetWalkers`): 작품 중심 `NpcCrowd`와 별개 경량 앰비언트. 도로 라인(파셀
  가장자리=건물 밖)만 왕복 → 건물 관통·강 침입 구조 차단. 외형은 시드 결정론(`CHIBI_PRESETS` 선택 후 `encodeChibi`), 목표 재설정은 로컬 시뮬.
  `createAvatarInstance` 재사용·빈 닉네임(라벨 없음), 로드 파셀당 0~1명·총원 ≤6, 언로드 시 dispose.
  - **결정론 예외 조항(명문화)**: "무저장·시드 결정론(모든 방문자 동일 세계)" 규율은 **관측 가능한 세계의 구성**에 적용된다 —
    walker의 존재 여부·외형(`CHIBI_PRESETS`)·초기 배치(`genWalker`)는 시드로 완전 결정론이다. 반면 **로컬 전용 앰비언트 이동
    시뮬**(walker의 걷기 목표 `pickWalkerTarget`·정지 타이머)은 각 클라이언트가 `Math.random`으로 독립 진행하는 **결정론 예외**다.
    이는 무저장 원칙과 충돌하지 않는다: 이동 상태는 저장·동기화 대상이 아니고(멀티플레이어 상태에도 미포함), 어느 클라이언트든
    같은 세계·같은 행인 구성을 보되 걸음의 위상만 다를 뿐이다. 시드 결정론이 요구되는 범위(외형·배치)는 유지한다.
  - **스폰 근방 walker 보장**: `genWalker(...,force)` — 스폰 파셀과 직교 인접(맨해튼≤1, world-boot `forceWalker`)에서는 확률
    게이트를 건너뛰고 walker를 무조건 배치(첫 화면 텅 빈 거리 방지). 게이트용 `rng()`는 force여도 동일 소비 → 후속 배치 결정론 무영향.
    강·빈 파셀은 도로가 없어 force여도 제외. 검증 계수용으로 walker 아바타 group에 `userData.isWalker=true` 태그.

**헤드리스 QA(swiftshader)**: 스폰 드로우콜 218(≤230) / genStreet·genWalker 결정론 deep-equal / 가로수 walk 충돌 0.60m /
남문 접근로 진입 성공 / 물 map.offset 3초 Δ(0.024,0.015)·드로우콜 증가 0 / walker 배회 이동·언로드 잔존 0 / 콘솔 0.

## 플래그 해제 준비 · 보안 선결 4건 (2026-07-19)

`security-officer 29259bf` 지적 4건을 해소해 플래그 해제(라이브 노출)의 보안 선결을 마친다. **해제 자체는 감독·팀장 게이트** — 본 절은 준비만.

1. **`'unsafe-inline'` 제거**: world.html 인라인 `<script type="module">`을 `frontend/js/world-boot.js` 신규 외부 모듈로 추출하고
   `<script type="module" src="./js/world-boot.js">`로 로드 → CSP `script-src 'self'`만으로 동작(sha256 해시 대신 파일 분리 — 코드 변경마다 해시
   재계산 불필요, 유지보수 우위). module script는 기본 defer라 DOM 로드 후 실행·top-level await 정상. `style-src 'unsafe-inline'`는 유지(index.html 관행).
2. **P2P IP 고지**: 입장 오버레이(`#enter`)에 1줄 — "동시 접속 데모는 P2P라 접속자 간 네트워크 주소가 노출될 수 있어요."(§6 담백 톤).
3. **`connect-src` 축소**: `'self' https: wss:` → `'self' wss://0.peerjs.com`. STUN/TURN ICE는 WebRTC라 connect-src 통제 밖 → 불필요.
   manifest fetch는 `'self'`로 커버. 셀프호스팅 시그널링 전환(`window.LU_PEER_OPTS`) 시 이 도메인을 실제 시그널링 호스트로 교체(주석 명시).
4. **`openworld` 룸 예약어**: 라이브(config/main) 무수정 제약이 있어 코드 등록 대신 **문서 게이트**로 처리한다. `galleryId 'openworld'`는
   **라이브 갤러리 슬러그로 사용 금지**(`world.js`가 `PEER_ROOM_ID + '-openworld'` 룸을 점유 — 동명 갤러리가 생기면 룸 충돌). 갤러리 발행은 저장소 커밋
   경유라 문서 게이트로 충분. 배포 전 스모크에 다음 assert를 추가:
   ```
   node -e "const g=require('./frontend/galleries/index.json'); if(g.some(x=>x.id==='openworld')) throw new Error('openworld 예약어 충돌'); console.log('OK: openworld 예약 준수')"
   ```

**헤드리스 QA(swiftshader)**: world.html 로드 정상(외부 모듈 top-level await) / CSP 위반 콘솔 에러 0 / 오버레이 P2P 고지 렌더 /
미니맵·채팅·조이스틱·__world API 무회귀 / galleries assert 통과.

## 라이브 런타임 접촉 기록 · npc.js (2026-07-19, 팀장 서명 수용)

`npc.js`는 CLAUDE.md 라이브 보호 명시 목록(main·player·artworks·config) **밖**이지만 index.html이
로드하는 라이브 런타임 파일이다. 오픈월드 파셀 스파이크(`8211fff`)가 `NpcCrowd(artworks, count, opts)`에
`opts.roster` 가산 경로(직원 페르소나)를 추가했다. **미주입 시 기존 익명 관객 경로와 동등**하며,
`main.js`는 `new NpcCrowd(getPlacedArtworks())`로 1인자 호출(roster=null)이라 index에서 신규 경로가
실행되지 않음을 머지 게이트에서 검증(런타임 모듈 바이트 동일 + visit/builder diff 0 + 셸 합동 동일).
→ **가산·무영향으로 수용**. 이후 `npc.js` 접촉 시 동일 게이트(index 씬 그래프 구조 비교) 의무.

## 라이브 런타임 접촉 기록 · scene.js (2026-07-19, 감독 지시 수용)

`scene.js`는 CLAUDE.md 라이브 보호 명시 목록(main·player·artworks·config) **밖**이지만 index.html이
로드하는 라이브 미술관 3D 씬 조립 파일이다. 오픈월드 거리 가로수를 미술관과 **동일한 디테일 트리**로
통일하기 위해(감독 지시), scene.js의 `buildDetailedTree`·`bakeGroupByMaterial` 두 함수에 **`export`
키워드만 가산**했다(함수 본문·기존 호출부 로직 변화 0 — `space-presets.js`의 `northArt` export 재사용
전례와 동형). index.html은 이 두 함수를 import하지 않고 내부에서만 호출하므로(`createGardenTree`·정원 숲
병합) 신규 경로가 index 런타임에서 실행되지 않는다 — **런타임 모듈 동작 불변** + index 씬 그래프 구조
동일(main 대비 오브젝트 수·타입 분포 일치) + visit/builder 콘솔 0으로 검증.
→ **가산·무영향으로 수용**. 이후 `scene.js` 접촉 시 동일 게이트(index 씬 그래프 구조 비교) 의무.

`world.js buildStreet`는 옛 가로수(줄기+2단 캐노피 InstancedMesh, 저채도 녹색 3톤)를 대체한다. 파셀의
전 그루를 한 `forest` 그룹에 모아 월드 변환을 굽고 `bakeGroupByMaterial`로 머티리얼별 병합한다. 다만
잎 재질이 3종(`makeLeafMaterials`)이라 그대로 병합하면 파셀당 나무 = 수피 1 + 잎 3 = 최대 4콜이 되어
스폰 드로우콜이 263까지 오른다(옵션 A 미적용 시). 그래서 **옵션 A**: 병합 직전 파셀 내 잎(알파) 재질을
단일 참조로 통일 → 잎 버킷 3→1, 파셀당 나무 = **수피 1 + 잎 1 = 2콜**(옛 InstancedMesh와 동일 비용,
스폰 251). scene.js 무접촉이라 미술관 나무는 3종 유지(파셀 내 잎 색 변주만 단일화 — 원경 가로수라 손실 미미).
외형·회전은 파셀 오프셋⊕인덱스 시드로 결정론(무저장 규율). 병합 지오는 파셀 소유로 언로드 시 `own` 배열에서
dispose하고, 공유 재질(`sharedTreeMats`)·거리 가구 공유 지오/재질은 파셀 간 공유라 `createWorld` dispose에서 일괄 회수한다.

## 라이브 런타임 접촉 기록 · space-render.js (2026-07-20, 팀장 판정 수용)

`space-render.js`는 CLAUDE.md 라이브 보호 명시 목록(main·player·artworks·config) **밖**이지만 index/visit/
builder가 로드하는 라이브 공유 렌더 파일이다. 오픈월드 스트리밍 히칭 개선 2단계(라이트 풀)가
`addRoomLighting(group)` → `addRoomLighting(group, opts={})`로 서명을 확장하고, AO 접촉그림자 블록 뒤에
`if (opts.noSpots) return;` **순수 가산 게이트**를 넣었다. 기본값(noSpots 미지정)이면 함수 앞부분 AO 블록과
이후 SpotLight 생성부(작품·다운라이트)가 기존과 완전 동일 — `visit.js:53`·`builder.js:99`는 opts 없이
호출하므로 라이브 픽셀/씬그래프 회귀 0. `noSpots:true`(world.js 전용)일 때만 SpotLight 생성을 스킵하고,
조명은 world.js 라이트 풀이 개수 고정으로 배정한다(파셀 경계 통과 시 셰이더 재컴파일 제거가 목적).
→ **가산·무영향으로 수용**(release-reviewer 교차리뷰 승인 + 감독 성능계획 승인 — `npc.js`·`scene.js`
순수 export 가산 전례와 동형). 이후 `space-render.js` 접촉 시 동일 게이트(기본경로 불변·교차리뷰) 의무.

**게이트 임계 조정(팀장 서명)**: 스폰 드로우콜 상한을 **230 → 255**로 상향한다. 근거 — 255는 고정 라이브
미술관의 실증 드로우콜(고객이 문제없이 사용 중인 검증 수준, 위 1단계 QA "고정 미술관 255" 참조)이고, 230은
자체 여유 목표였다. 디테일 트리 교체 후 옵션 A 적용 스폰값 251은 이 실증 상한 이내다.

**신 모드 이벤트 일시 초과 수용(팀장 서명 2026-07-19)**: 드로우콜 임계 255는 **스폰 기본 상태** 기준이다.
신 모드에서 감독이 명시적으로 켜는 이벤트 연출(오로라 +4 등)의 일시 초과는 팀장 서명으로 수용한다.
근거 — 오로라 +4는 승인된 sky.js 오로라 2겹 커튼(transparent+DoubleSide 메시당 2패스)의 고유 비용이며 하늘 배선의
회귀가 아니다. ※ sky.js 2차 개선(수면 빛반사·노란 달·별 차등·조각구름, 감독 지시) 후 기준선이 상승했다(실측 2026-07-19:
스폰 기본 **야간맑음 255**·day/sunset 254 — 전부 임계 이내, 비/눈 253. 오로라 259 = 기본 255 + 오로라 +4). 스폰 기본은
255 이내를 유지하되 임계에 도달했으므로, 이후 하늘 개선은 기준선 여유를 함께 관리한다(초과 시 지오 병합·LOD로 흡수).

## 하늘 연출 엔진 sky.js (2026-07-19, 팀장 직접 구현 · 감독 승인)

시간대 3(day/sunset/night) × 날씨 4(clear/overcast/rain/snow) + 이벤트(무지개·오로라·번개/천둥)를
전부 절차 생성(외부 이미지·오디오 0, 시드 결정론)으로 그리는 독립 모듈. 신 모드(감독 연출 패널)의
엔진부. 조합 보정 규칙: 무지개=주간·일몰 맑음만 / 오로라=야간 맑음만 / 별·은하수=야간 맑음.
API: `createSkySystem({scene,renderer,sun,hemi,sky,getPos,soft,onApply})` → `set/get/update/getSunDir/dispose`.

구현 중 하네스 실측으로 잡은 핵심(코드 리뷰만으론 못 잡는 것들):
- 돔=완전 구 → equirect **v0.5가 지평선**(v1은 v1.0 가정이라 해가 지면 아래에 그려짐).
- 구 UV 방위 정합 실측: **텍스처 u의 월드 yaw = u·2π − π/2**(`azWorld`) — 그림 속 해와 조명 방향 일치.
- 저폴리 돔(24×12)은 위도 링 UV 절곡으로 마하 밴드 원호 발생 → 48×32 교체 방어.
- 수평 하드엣지(fillRect 층운)는 돔에서 위도 원호로 도드라짐 → 납작 타원 radial.
- 구름은 원반 붓질 금지(동그라미 뭉침=파레이돌리아·에어브러시 인위성, 감독 지적) →
  **값 노이즈 fBm 밀도장 + 상하 밀도차 자기음영**(`paintCloudLayer`), 수평 주기 격자 모듈로 wrap.
- 시점 보정: 눈높이 카메라가 보는 하늘은 대부분 저고도(v 0.5~1) — 구름 분포·헤이즈를 거기에 맞춘다.

**신 모드 운영 정책(감독 확정 2026-07-19)**: 패널은 **전체 공개** — 방문자 누구나 조작 가능
(변경은 자기 화면 로컬 렌더에만 적용, 타 방문자 무영향이라 보안 무해 — 검수관 P2 지적 해소).
**서비스 기본 하늘 = 야간 맑음**(은하수·별·달, URL `?sky=`/`?weather=` 파라미터가 있으면 우선).

**그래픽 품질 기준(감독 확정 — "앞으로 최소 이 정도 수준으로")**: 시각 요소 구현은
①독립 하네스로 **전 조합 스크린샷 실측** → ②팀장(또는 구현 책임자) 시각 검토로 결함 목록화 →
③수정 후 재촬영 반복 → ④결함 소진 시에만 커밋. "코드가 맞아 보인다"는 통과 사유가 아니다.
원인 불명의 시각 결함은 추측 수정 금지 — 텍스처 덤프·픽셀 분석 등으로 **원인 확정 후** 수정한다.

## 리스크

- **드로우콜**: 파셀 9개 풀로드 시 `ART_SCREEN_CAP=80` 초과 → `shellOnly` 임포스터 LOD로 완화(스파이크는 직교 풀/대각 shell).
- **파셀 점유 경쟁·백엔드 SPOF**: 3단계 사안 — 유니크 제약 + 정적 매니페스트를 read-only 폴백으로 상시 유지.
- **버전 파편화**: `migrateSpace` 상위 버전 거부 → 클라이언트 버전 스큐 시 이웃 공간 로드 실패. 오픈월드 발행 시 버전 하한 협상 필요.
- **모바일 조이스틱 ↔ 정문 포털 탭 충돌(선제)**: 현재 world는 포털 클릭→네비게이션 판정이 없어 조이스틱 근접 탭
  오탐은 없다(모바일 375×667 실측 2026-07-19: 좌하단 #joy 짧은 탭·드래그 모두 네비 0·popup 0·URL 불변, 조이스틱
  이동 0.60m 정상). **정문 포털(별도 발주) 도입 시** 탭 판정에서 #joy 히트박스·드래그 중 입력을 제외하거나 포털
  클릭을 "화면 중앙부 조준 탭"으로 한정할 것 — 좌하단 조이스틱과 포털 클릭이 겹치면 이동 조작이 오네비게이션이 된다.
