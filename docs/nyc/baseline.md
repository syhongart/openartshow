# 뉴욕 갤러리 거리 — Baseline (2026-09-06)

지시서: `docs/NYC-GALLERY-WALK.md`. 이 파일은 지시서 §2·§10 «Baseline» 의 산출물이다 — **실제 코드로 확인한 것**만 적고, 못 본 것은 «미확인» 으로 남긴다. 조사는 읽기 전용 조사원 둘(렌더·에셋 / 갤러리·작품·계정)이 파일:행 근거로 했고 부팀장이 대조·정리했다.

## 0. 한 줄 결론

- 이 저장소에는 **«거리»도 «건물↔전시실↔슬롯↔작품» 데이터 모델도 없다.** 있는 것은 (a) 파셀 스트리밍 오픈월드 world2(라이브 디폴트), (b) world2 의 전체 포크로 GLB 한 덩어리를 세계로 쓰는 world-glb(월드7·8, flagged), (c) 방 하나짜리 절차 생성 갤러리 space(builder/visit), (d) 고정 미술관 index(보호파일).
- «벽에 건다» 가장 완성된 구현은 world2/world-glb 오버레이(`{src,x,y,z,ry,w,ar}`)이고, space 계열과 **모델이 다르다.** 어댑터 없음.
- 갤러리 입장은 **페이지 전환**(world2 → visit.html)이며 밖의 GLB 외관과 안의 절차 생성 방은 물리적으로 무관하다. GLB 안을 실제로 걷는 경로는 world-glb 에만 있다(광선 1개 콜라이더).
- **서버 0.** 로그인 mock, 저장은 localStorage, 업로드 이미지는 1400px JPEG dataURL(원본 미보존), 자산 영속의 마지막 구간이 끊겨 있다.
- 압축 경로 0(DRACO·KTX2·meshopt 없음), 이미지 아틀라스 0, 후처리는 TSL 블룸 하나, 태양 그림자 기본 꺼짐(`SHADOW_INTENSITY=0`), 프레임 간격 p95 를 재는 장치 없음, 고정 시점 캡처 하네스 없음(`moveTo` 봉인).

## 1. 기준 캡처 (헤드리스 WebGL·swiftshader, 900×560, 감독 캡처는 미제공)

| 파일 | 대상 | 관찰 |
|---|---|---|
| `evidence/baseline/world8-start.png` | 월드8 시작 시점(카드 잎 10·AA 4) | 지시서 §2-4 의 관찰과 일치 — 창·출입구 없는 회색 건물 덩어리, 검은 아스팔트, 반복 잔디 띠, 시계탑 외에 목적지 없음, 하늘 비중 큼. HUD «미술관 1채 · glb/noext» |
| `evidence/baseline/world2-start.png` | 월드2 시작 시점(70초 대기) | 광장·분수·시계탑·가로등·잔디 띠, 건물은 지평선 위 실루엣 0(파셀 정원만), «전시장 들어가기» 버튼이 떠 있음(미술관 GLB 근접 판정). 하늘 비중 큼, 길은 검은 아스팔트 |

전송량(헤드리스 응답 합, 캐시 없음): world8 ≈ 24.1MB, world2 ≈ 18.3MB — **둘 다 지시서 예산(초기 10MiB) 의 2배 안팎.** 프레임 시간은 swiftshader 라 재지 않았다(미검증).

## 2. 렌더·에셋 파이프라인 (조사 A)

- **트리 구조**: world2 와 world-glb 는 거의 완전 동일 포크(`adapters/renderer.ts` 316줄 중 1행, `decide/adapt.ts` 1행 diff). 갈리는 축: 세계 소스(GLB) · DPR 상한 · `sky.js` 존재 · postfx 내용.
- **렌더러** `adapters/renderer.ts`: WebGPU 프로브 성공 시 WebGPU, 아니면 WebGL(`:128-159`, `?forceWebGL`). 헤드리스는 항상 WebGL. antialias 양쪽 true(`:157-158`). 톤매핑 ACESFilmic 고정(`:169`), 노출은 밤에만 `systems/night-lights.ts:84` 가 덮어씀(`NIGHT_EXPOSURE=1.4`). 출력 sRGB 명시(`:168`), `ColorManagement.enabled` 명시 0(three 기본 true 의존). DPR: world2 `min(dpr,2)`(`world2/main.ts:749`), world-glb `min(dpr,1.5)`(`world-glb/main.ts:33,676`), 런타임 적응 `systems/adapt.ts:97`(`ABS_FLOOR=0.85`). 그림자: `PCFSoftShadowMap` 2048², **그러나 `SHADOW_INTENSITY` 기본 0 → 캐스터 0**(`main.ts:158,763`). 광원 Directional 1 + Hemisphere 1.
- **후처리**: EffectComposer 0. `three/webgpu` `PostProcessing` + TSL bloom 하나(`features/postfx.ts:38-40,191-198`, `STRENGTH=1.15`, `RADIUS=0.07`), **헤드리스(WebGL)에서는 안 켜짐**(`:182-184`). SSAO/SSR/DoF 0.
- **색 관리**: 작품 텍스처 `SRGBColorSpace`(`systems/artwork-mount.ts:80-81`), albedo 류는 `map` 슬롯만 sRGB 규약(개별 지정 — `horizon.ts:89`, `surface-paint.ts:269`, `parts/*.ts`). 규약 강제 게이트 없음.
- **로더**: GLTFLoader 동적 import(`world-glb/main.ts:889`, `features/overlay.ts:147`). **DRACO 0 · KTX2/Basis 0 · meshopt 0.** `scripts/asset/pack-instances.mjs`(EXT_mesh_gpu_instancing)는 CI 미연결(백로그). GLB: `assets/worlds/world2-blender-edit.glb` 4.96MB(JSON 4.35MB!, 노드 28,728, 고유 메시 40), `assets/models/lab-space.glb` 13.5MB(미술관 1채, primitives 78·재질 17·텍스처 22·삼각형 162,902).
- **인스턴싱·LOD·컬링**: `systems/instancing.ts` — (지오·재질·tier) 조합마다 `InstancedMesh` **부팅 시 최대치 사전 할당**, 0-스케일로 재움, `frustumCulled=false`. 세션 중 `new Geometry/Material` 금지가 사실상 계약(`systems/parcel-builder.ts:4`). `glb-source.ts` 는 GLB 반복 메시를 런타임에 InstancedMesh 로 되묶음. `glb-stream.ts`(월드7·8)는 거리 기반 셀 on/off 만(LOD 아님, 메모리 안 줄임, 실기기 삼각형 2,110,989). `decide/adapt.ts`: `TRI_BUDGET=60000`(관측 전용), 압력은 fps<24 AND tri>60k 동시. `mergeGeometries`·`THREE.LOD` 실사용 0.
- **하늘·시간대**: `decide/night.ts:110 TIMES=['day','sunset','night','daylit']`, 광량 상수 `daylight.ts:52,99`·`night.ts:261,263,309`, 지면 리프트 `ground-albedo.ts:152 NIGHT_GROUND_LIFT=2.4`, 지면 안개 `world-shared/ground-fog.ts`(기본 강도 0), 거리 안개 `?fogd`, 램프 글로우 `night.ts:456,475`. 월드7·8은 레거시 `world-glb/sky.js`(929줄) 추가 — 어느 쪽 우선인지 **미확인**.
- **잔디**: 월드8 기본 card·잎 10·AA 4(`decide/grass-mode.ts`).
- **성능 장치**: `[7]` 개수 불변식(geo/tex), `[7.6]` draw 대조군(사람·GLB 끈 세계), `[8]` 하늘 예열. `measure-tri-quadrant.mjs` 가 삼각형·draw 중앙값. **프레임 간격 p95 스크립트 없음**(swiftshader 라 절대 시간 무의미 — `measure-invariants.mjs:29`).
- **텍스처**: `frontend/assets/` 31MB. 상위: `sky/night.jpg` 4096×2048 2.5MB, `neon-vanitas.png` 1080² 1.7MB, `sky/*.hdr` 1.4~1.7MB, `gallery/aw-*.jpg` 1200×900 83~175KB. ktx2/basis/webp 0. 이미지 아틀라스 0(런타임 캔버스 아틀라스 `parts/tree-atlas.ts` 만).
- **캡처 하네스**: 없음. `screenshot` 0건. `PlayerSystem.moveTo` 의도적 봉인(`systems/player.ts:177`), 좌표·yaw 노브 0. 열린 것은 `?edit=1` 궤도/비행 델타뿐.

## 3. 갤러리·작품·계정·이동 (조사 B)

- **Space 스키마** `frontend/js/space.ts`: `{version, meta, shell, spawn, parts[]}`(`:105-111`), `SPACE_VERSION=2`, `normalizeSpace/migrateSpace`(`:413,451`). 파츠 36종, `artwork` 는 좌표 자유 배치 파츠(`:131`) — **슬롯 개념 없음, 파츠 `id` 없음(배열 인덱스)**. 셸: FOOTPRINT 5·STORY_H 3·FINISH·피처월 1면·`shell.entries`(4방향 문)·`floors 1~4`. **건물↔전시실 다중 관계 없음(한 문서 = 방 하나).** 액자 치수 `artworkSize(ar, scale)`(`:249`)·`partArtSize`(`:284`), 액자 3종. 조립 `space-assembler.ts`(`DOOR_W=2.6`, `buildSpaceGroup`, `addRoomLighting`), 파츠 `space-parts.ts`(걸이 높이 1.6m `:343`, `UNIQUE_TEX_TYPES={artwork,screen}` → **작품 1점 = 드로우콜 +1**). 라이트맵 `space-lightmap.ts`(동기/비동기, 소프트 GPU 256²).
- **작품 저장 두 갈래**: ① studio → `studio-storage.ts`(localStorage `'artshow-studio-draft-v1'`, `#gz=` 발행, 외부 URL 차단 `:63`, 12점 상한, `ar` 보존) ② builder → `builder.js:15 SAVE_KEY='openartshow.space.v1'`, `setArtworkImage(index, dataURL, ar)` — **dataURL 을 space 에 넣는다 → quota 가 채수에 비례해 터짐.** 업로드 = `studio-image.ts` 최장변 1400px JPEG 0.85 dataURL, **원본 미보존.** ③ world2 오버레이 `store/local-store.ts`(`lu-w2-overlay::<id>`, 200k 자 상한, 바이트 안 담음) — 거리 규모 저장의 **선례는 이쪽**(배치만 담고 자산은 경로).
- **«벽에 건다» 페이지별**: index(고정 슬롯 풀 `artworks.js:218-231`, 보호파일), studio(폼→dataURL→`#gz=`), builder(라이브, 🖼 이미지), visit(관람 전용), **world2/world-glb(이미지 드롭 → 그 자리 벽 — `edit/artwork-mode.ts`, `systems/art-port.ts`, `artwork-scene.ts`, `artwork-mount.ts`; 계약 `artwork-types.ts:155-197`)**. world2 드롭 이미지는 `assets/art/<이름>` 경로 + 세션 `blob:` — 발행은 수동 2걸음(`decide/upload-plan.ts:9-23` «보낼 준비가 됐다»). **새로고침 뒤 그 그림은 안 뜬다.**
- **입장/퇴장**: index→world2 는 `portal.js`(`OPENWORLD_PAGE='world2.html'`). world2→갤러리는 `decide/venue-entry.ts`(순수 판정, GLB `door.002` 앵커, 반경 3m, 목적지 `visit.html?u=<tenant>`) + `ui/venue-prompt.ts`(검은 베일 → `location.href`). **같은 씬 진입 아님.** 밖의 미술관 GLB 는 `world-shared/glb-city.ts`(`lab-space.glb` 1채, 채당 draw +28~37)이고 **충돌 대상 아님**(`decide/collide.ts:35-36` — 통과 가능). 실내는 `visit.js` 가 space 문서를 새로 조립(벽·바닥·천장·조명·안개·라이트맵·충돌 r0.3). **퇴장(visit→world2) 코드 미확인.** world-glb 의 GLB 실내: `glb-source.ts`·`glb-placement.ts`·`glb-collider.ts`(무릎 높이 레이 1개, y=0 평면 전제).
- **이동**: `systems/player.ts` 두 트리 동일 552줄, `moveTo` 봉인(`:177`). 충돌 ① 파셀 파츠 원형 footprint(`collision.ts`, 높이·회전·터널링 방어 없음) ② GLB 레이캐스트. 모바일 HUD `ui/touch-controls.ts` + 공용 `shared/joystick-look.js`.
- **계정**: `backend/README.md` «아직 비어 있다 … 저장은 전부 localStorage … 업로드 없음». `auth.js` mock(키 3종 빈 문자열, `MOCK_NAMES`), 로그인 없는 관람이 기본, 소유권 증명 불가(백로그 G-MP1). `mypage/store.ts` LocalProfileStore 하나, fetch 0. CSP `connect-src` 페이지별(`'self'`/peerjs/`blob:`), 외부 `img-src https:` 는 index·studio 만 — **새 페이지에서 외부 작품 이미지 직접 로드는 닫혀 있다.**
- **하늘 UI**: HUD «하늘» 드롭다운(`world2.html:518`, `world7.html:574`, `ui/sky-panel.ts`). visit 는 `?time=&weather=` 읽지만 world2→visit 전환이 값을 안 실음(`venue-entry.ts:164-176` 미완 경계 — «밤에 들어가도 창밖은 낮»).
- **멀티플레이어**: PeerJS(`multiplayer.js` 661줄), 소비 페이지 index·world(flagged)뿐.
- **관련 테스트**: space.*·studio-*·world2-artwork*·world2-art-*·world2-venue-*·world2-tenant-*·world2-overlay-*·world2-export-*·world2-upload-*·world2-edit-*·world2-parcel-slots·world2-slot-budget·mypage-*·csp-inline-pins·glb-*·world-glb-independence.

## 4. 지시서 요구 대비 «있다 / 없다 / 다르다»

| 지시서 요구 | 상태 | 근거 |
|---|---|---|
| 거리(여러 채) | **없다** | Space = 방 하나, world2 = 파셀(정원·도로·미술관 1채), world-glb = GLB 한 덩어리 |
| 건물·전시실·벽/슬롯·작품 ID 관계 | **없다** | `SpacePart` 에 id 없음, 슬롯은 `artworks.js`(보호)에만 |
| 입장 가능한 1층(문·바닥·벽·천장·충돌) | **다르다** | visit 는 실재하나 페이지 전환·외관과 무관; world-glb 는 GLB 안을 걷지만 콜라이더 광선 1개 |
| 업로드→크기·위치·액자→저장→복원 | **부분** | builder 에 있으나 dataURL 을 space 에 넣음(quota), world2 는 자산 영속 단절 |
| 원본 종횡비·잘림 없음 | **있다** | `ar` 보존, `artworkSize(ar)` |
| 액자·작품 교체(GLB 재생성 없이) | **있다(world2 오버레이)** | `ArtworkScene.retarget` |
| 서버 저장·권한 | **없다** | backend 0, mock auth |
| 작품 전용 색 경로(톤매핑·블룸 격리) | **없다** | ACES 고정, 블룸 전역, 작품은 sRGB 텍스처로만 |
| 시간대·태양·베이크 정합 | **부분** | 시간대 4종·리프트·안개 노브 있음, 태양 그림자 기본 0, 라이트맵은 방 단위 베이크 |
| KTX2·DRACO·아틀라스 | **없다** | 로더 0, 이미지 아틀라스 0 |
| DPR 상한 | **있다** | world2 2, world-glb 1.5 + 적응 |
| 프레임 p95·draw·삼각형 측정 | **부분** | 삼각형·draw 중앙값만, p95 없음, 헤드리스 절대 시간 무의미 |
| 6 시점 고정 캡처 | **없다** | 스크린샷 유틸 0, 카메라 배치 API 0(`moveTo` 봉인) |
| 실기기 | **없음** | 감독 실기기(WebGPU) 링크 확인이 유일한 축 |

## 5. 미확인 목록 (합본)

렌더: `postfx.ts` 두 트리 차이 내용 · `features/sky.ts` 태양 방향 수식 위치 · `world-glb/sky.js` vs `features/sky.ts` 우선순위 · `decide/lod*.ts` 임계 · `world2-blender-edit.glb` 내부(삼각형·재질·실내 유무) · png 10개 해상도 · `run.mjs` 전체 게이트 목록.
갤러리: visit→world2 퇴장 경로 · `?u=` 갤러리 데이터 원산지(`galleries/` 인덱스) · `space-generate.ts Slot` 직렬화 여부 · OverlayItem↔SpacePart 어댑터(없을 가능성) · `mypage` 필드·공개 범위 · `touch-controls.ts` 버튼 구성 · `main.js` 부팅·`window.__museum` · `galleries/` JSON 수.
