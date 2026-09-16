# 맨해튼 180m — blend → GLB 자산 변환 (월드11 1단계)

감독 지시 2026-09-16, 카드 판정 «우리 월드 11 로». 감독이 올린
`Manhattan_180m.blend`(29.4MB zstd / 압축 해제 183MB)를 월드11이 열 수 있는 GLB 로
굽는다. **이 회차는 자산 변환까지**다 — 월드11 페이지·런타임은 다음 단계다.

원본 blend 는 **저장소에 넣지 않는다**(29MB·출처가 감독 업로드). 그래서 산출물을
커밋 자산으로 두고 만든 절차를 이 디렉터리로 남긴다 — world8 의
`frontend/assets/worlds/world2-blender-edit.glb` 와 같은 형태다.

## 파일

| 파일 | 하는 일 | bpy |
|---|---|---|
| `extract.py` | blend 를 열어 GLB + 카메라/라이트 JSON + 실측표를 낸다 | 쓴다 |
| `glb_names.py` | 산출 GLB 의 이름에서 `.` 을 없앤다(`.` → `_`) | 안 쓴다 |
| `verify-blocks.py` | blend 블록을 **직독**해 `extract.py` 의 실측을 대조한다 | **안 쓴다** |
| `verify-glb.mjs` | 산출 GLB 를 실제 `GLTFLoader` 로 통과시켜 판정한다 | 안 쓴다 |

```bash
python3 scripts/asset/manhattan/extract.py --blend <원본.blend> --report /tmp/r.json
python3 scripts/asset/manhattan/verify-blocks.py --blend <원본.blend> --against /tmp/r.json
node   scripts/asset/manhattan/verify-glb.mjs <자산.glb> --cameras <cameras.json>
```

**넷 다 게이트가 아니다** — CI 에서 안 돈다(bpy 휠이 374MB 이고 원본 blend 가 저장소에
없다). 게이트는 `tests/manhattan-glb.test.ts` 다.

## ⚠ 「bpy 로는 못 연다」는 전제는 틀렸다 — 실측으로 정정됨

원본은 **Blender 5.1**(버전코드 501.30)로 저장됐고 설치된 bpy 는 **5.0.1** 이다. 여는
순간 이렇게 뜬다:

```
Warning: File written by newer Blender binary (501.30), expect loss of data!
```

**그 경고 뒤에 유실된 것은 없다**(2026-09-16). bpy 로 읽은 값과, blend 의 SDNA 블록을
직접 읽는 `blender_asset_tracer`(버전 무관)의 값이 **전부 일치한다**:

| 축 | bpy 5.0.1 | BAT(블록 직독) |
|---|---|---|
| 오브젝트 | 21,417 | 21,417 |
| 타입별 | MESH 21,052 · CURVE 140 · FONT 95 · LIGHT 112 · CAMERA 18 | 동일 |
| 메시 | 19,251 | 19,251 |
| 삼각형(씬) | 1,045,716 | 1,045,716 |
| 정점(메시 데이터) | 620,024 | 620,024 |
| 재질 | 46개 이름 전부 | 동일 |

`verify-blocks.py --against` 가 이 대조를 다시 돌린다(diffs 0 · materialsMatch true).

**왜 이것을 적어 두나**: 경고만 보고 「못 연다」로 규정하면 GLB 를 블록에서 손으로
조립하게 되고, 그 경로는 **UV·재질 노드·텍스처·커브·텍스트를 전부 잃는다.** 경고는
측정이 아니다. 5.1 에서 새로 생긴 필드는 5.0 SDNA 에 없어 읽히지 않으므로, 원본이
갱신되면 이 표를 다시 뜬다.

## 실측 — 산출 GLB

`export_yup`(Z-up→Y-up) · `export_apply`(커브·텍스트를 메시로) · 컬렉션을 부모 노드로 ·
accessor 공유. 세 변형을 같은 원본에서 구웠다:

| 변형 | 바이트 | JSON 청크 | 지오메트리 | 이미지 | 판정 |
|---|---:|---:|---:|---:|---|
| `AUTO`(PNG 그대로) | **95,517,512** (91.09 MiB) | 16.63 MB | 62.87 MB | 16.01 MB | 예산 초과 |
| `--image-format WEBP` | **80,025,408** (76.32 MiB) | 16.62 MB | 62.87 MB | **0.53 MB** | 예산 초과 |
| `--draco` | — | — | — | — | **SIGSEGV** |

셋 다 노드 21,306 · 메시 19,482 · 삼각형 1,322,096 으로 **지오메트리는 동일**하다.

* **이미지 압축은 예산 문제를 못 푼다.** WEBP 가 이미지를 16.01 → 0.53 MB(97% 감소)로
  줄여도 총합은 76 MiB 다 — **본질은 지오메트리 62.87 MB** 이고, 그것은 정점
  1,907,224 개 × (POSITION 12B + NORMAL 12B + UV 8B) 다. 정점이 원본 620,024 의 3배인
  것은 exporter 가 **면마다 법선을 끊기 때문**이고(큐브 8정점 → 24정점), 이 세계는
  대부분 각진 박스다. 즉 줄인 것이 아니라 **정직한 크기**다.
* **Draco 는 이 환경에서 못 쓴다.** bpy 5.0.1 번들 인코더가 같은 지점
  (`Sedan_continuous_pressed_body` 근처, 메시 ~19,486개 중 끝무렵)에서 **세그폴트**로
  죽는다 — 2회 시도 2회 모두. 죽기 전까지 찍힌 압축률은 4.6~7.2배이므로 성공했다면
  지오메트리가 ~10MB 로 내려가 총 25MiB 안팎이었을 것이다. **추정이지 실측이 아니다.**
  그리고 Draco 산출은 런타임에 `DRACOLoader` + wasm 디코더를 요구하므로 **자산만으로는
  못 쓴다**(자기완결은 `vendor/` 직서빙으로 지킬 수 있으나 그것은 설계 분기다).

## 이 회차에 자산을 커밋하지 않은 이유

위임 상한이 **50MB** 였고 가장 작은 변형이 **76.32 MiB** 다. 그래서 `frontend/assets/`
에 아무것도 두지 않았다 — 절차와 게이트만 남긴다. 판정거리는 셋이고 전부 설계 분기다:

1. **어디까지 담을 것인가.** 컬렉션별 삼각형이 `Urban_Buildings` 733,948(70%) ·
   `Landmark_Manhattan_Bridge` 190,264(18%) 로 **둘이 88%** 다. 「먼 블록은 빼고
   갤러리 주변만」이 가장 큰 축이다.
2. **드로우콜.** 크기보다 이쪽이 먼저 막힐 수 있다 — 메시 노드가 **21,286개**다.
   재질별 병합(46개 이하)이면 바이트와 드로우콜이 **함께** 내려가지만, 그 순간
   컬렉션·오브젝트 단위 조작(작품 슬롯 12개·차량·간판)을 잃는다.
3. **Draco.** 로더 배선 + 디코더 vendoring + 이 환경의 인코더 세그폴트 회피.

## 검증기가 실제로 잡은 것 — 이름의 **공백**

`verify-glb.mjs` 를 처음 돌렸을 때 `rewritten: ["Scene Collection"]` 1건이 나왔다.
블렌더의 마스터 컬렉션 이름에 **공백**이 있고, three 의 `sanitizeNodeName` 은 공백을
지우는 대신 `_` 로 **바꾼다**(`.` 은 지운다). `glb_names.py` 첫 판본이 `.` 만 봤으므로
그 1건이 통과했다.

이것이 「로드 **후** 이름에서 `.` 찾기」로는 못 잡히는 부류다 — 로더가 이미 고친 뒤라
언제나 0건이 나온다. 그래서 축을 **경계**로 옮겼다: GLB json 의 원 이름과 로드 후
이름을 대조해 「로더가 고쳐 쓴 이름 0개」를 본다. `tests/manhattan-glb.test.ts` 의
M1·M1b 가 그 검출력을 뮤테이션으로 못 박는다.

최종 실측(`verify-glb.mjs`, exit 0):

```
declaredNodeNames 21,306   rewritten 0   bannedInJson 0
nodes 21,313  meshes 21,286  triangles 1,322,096  uniqueNames 21,313 (중복 0)
bbox  min [−90, −2, −90]  max [90, 88.11, 90]  size [180, 90.11, 180]
externalRefs []            cameras 18 / lights 112, 정합 문제 0
sha256 87a52b3574a505c53983c5a285a0ef23621f9acdbd680a82a07776248c6134e5
```

## 좌표계

blend 는 Z-up, glTF 는 Y-up. 변환은 `(x, y, z) → (x, z, −y)` 하나이고 **두 곳**이 그것을
쓴다 — GLB 지오메트리는 exporter 의 `export_yup`, 카메라·라이트 JSON 은 `extract.py` 의
`_YUP` 행렬. 실측으로 맞는 것을 확인했다:

```
원본 bbox(Z-up)  min [−90, −90, −2]    max [90, 90, 88.11]   크기 180 × 180 × 90.11
산출 bbox(Y-up)  min [−90, −2, −90]    max [90, 88.11, 90]   크기 180 × 90.11 × 180
```

`01_DISTRICT_180m` 카메라: blend `[212, −240, 185]` → JSON `position [212, 185, 240]`.

## 이관되지 않은 것 (의도)

* **라이트 112개** — GLB 에 안 넣었다. three 에서 실시간 광원 112개는 성립하지 않는다.
  좌표·색·세기·타입을 `manhattan-180m-cameras.json` 의 `lights` 에 남겼다(AREA 111 ·
  SUN 1). 남기지 않으면 되살릴 방법이 없다.
* **카메라 18개** — 같은 JSON 의 `cameras`. 월드11 의 시점 진입에 쓴다.
* **애니메이션·셰이프키** — 원본에 없다.

## 이관된 것

* **재질 46개 전부**(노드 그래프 → PBR, `KHR_materials_clearcoat` ·
  `KHR_materials_emissive_strength` 포함). 작품 교체 슬롯 `ART_01~12_REPLACE_IMAGE` 도
  그대로 있고, 각각 `ART_01_CANVAS` ~ `ART_12_CANVAS` 오브젝트에 붙어 있다.
* **텍스처 44개 전부 임베드.** 원본에서 44개가 packed 였고 외부 참조는 0 이었다
  (45번째 `Render Result` 는 뷰어 버퍼라 이미지가 아니다). 산출 GLB 의 외부 URI 도 **0**
  이다 — 자기완결 축 통과.
* **커브 140 · 텍스트 95** — `export_apply=True` 가 평가된 메시로 바꿨다(메시
  19,251 → 19,482, +231).
* **컬렉션 20** — 씬그래프의 부모 노드가 됐다. `getObjectByName('Vehicles')` 로 묶음이
  잡힌다.

## 남겨 둔 물음 (이 회차에서 판정하지 않음)

* **간판 문자열의 법무 축.** FONT 오브젝트 95개의 내용은 전부 **가상 상호**다
  (`WEST SIDE STUDIO` · `MANHATTAN ATELIER` · `RIVER COFFEE` · `CITY ARCHIVE` ·
  `HUDSON EDITIONS`). 다만 `TAXI` · `NYC` 로 표시된 노란 차량과 도어 roundel 은 실존
  택시의 트레이드드레스와 겹칠 여지가 있다 — 라이브 승격 전 §6 판단거리다.
**확인된 것(더 이상 물음이 아니다)**: 원본 blend 의 이미지 메타에는 만든 사람의 로컬
경로가 남아 있다(`C:/Users/USER/Documents/Codex/…`). 산출 GLB 의 JSON 을 훑어 실측한
결과 그 문자열은 **0건**이다 — `images[]` 에 남는 키는 `bufferView` · `mimeType` ·
`name` 셋뿐이다. 즉 경로는 blend 안에만 있고 배포물로 새지 않는다.
