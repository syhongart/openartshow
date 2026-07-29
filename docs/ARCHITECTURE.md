# OpenArtShow 코드 아키텍처 원칙 (v0.2)

> **이 문서의 지위 — SSOT.** SOLID·의존성 경계·모듈 구조·배포 아키텍처의 *표준 원칙*은
> 여기에 못박는다. `docs/DEVLOG.md`는 "언제·왜 이렇게 됐나"의 **이력**이고, 이 문서는
> "앞으로 이렇게 한다"의 **규칙**이다. 새 기능·새 팀원(에이전트)은 착수 전 이 문서를 먼저 읽는다.
> 조직 운영 규율(게이트·위임·모델 라우팅)은 `docs/OPERATING-PRINCIPLES.md` §8·§10을 따른다 —
> 이 문서는 *코드*를 다룬다.
>
> **충돌 시 우선순위.** 코드 아키텍처 서술에서 이 문서와 `CLAUDE.md`·`README.md`가 어긋나면
> **이 문서가 이긴다.** 어긋남을 발견하면 즉시 타 문서를 이 문서에 맞춰 고친다(에스컬레이션 불요).

**변경 이력**
- v0.2 (2026-07-25): 팀장 채택 판정의 v0.2 권고 2건 반영 — (1) 문서 충돌 우선순위 조항 추가,
  (2) §5에 `.ts`↔`.js` 드리프트 검증을 강제 항목으로 승격.
- v0.1 (2026-07-25): 최초 제정. 이미 실천 중이던 SOLID 불변식·배럴 패턴·배포 파이프라인을
  표준 원칙으로 명문화(감독 지시 — "SOLID를 중요하게 본다, 배포를 염두"). 근거: DEVLOG
  §QA/SOLID 감사(2026-07-18)·C단계 분해(2026-07-22)·MIGRATION 완료(2026-07-13).

---

## 0. 시스템 한 줄

브라우저 기반 3D 가상 미술관(three.js). **정적 호스팅(GitHub Pages)·완전 자기완결**(외부 호스트 0).
핵심 사상 — **"파라미터가 곧 공간/아바타"**: 사용자 전시는 서버에 저장되지 않고 문서 스키마(JSON)로
표현되어 링크·localStorage에 담기고, 렌더는 기기에서 파생된다. 이 무저장·자기완결 성질이 아래
모든 아키텍처 규칙의 토대다.

---

## 1. SOLID — 이 프로젝트 문맥으로의 번역

추상 원칙을 우리 코드의 구체 규칙으로 옮긴다. 인용부호 안이 **실제 강제 대상**이다.

### S — 단일 책임 (SRP)
- **한 파일 = 한 책임.** 초거대 함수·초거대 파일은 분해 대상이다. 기준선: 함수가 여러 관심사(스키마·
  렌더·UI·물리)를 동시에 만지면 쪼갠다.
- 실천 이력: `ui.js`(3,977줄)·`scene.js`(2,059줄)·`studio.html`(인라인) 분해 완료(DEVLOG C단계).
- **예외 — Composition Root.** 진입점(`main.js`·`world.js`)은 "조립"이 책임이므로 큰 것이 자연스럽다.
  크기가 아니라 **책임의 혼재**가 분해 신호다. "모든 큰 파일을 쪼개는 게 SRP가 아니다."

### O — 개방·폐쇄 / DRY (OCP)
- **형상·상수의 이중 보유 금지.** 한쪽만 고치면 정합이 깨지는 수기 중복은 공유 spec으로 승격한다.
  최우선 관리 대상: [space-parts.ts](../frontend/js/space-parts.ts)의 `partGeo`↔`partAccent` 형상 상수.
- **파츠·종족 확장은 데이터/레지스트리로.** 새 소품·아바타 종족을 추가할 때 거대 `switch`나 하드코딩
  문자열을 늘리지 말고 등록 지점(`partGeo`/`partAccent`/`MATS` 3지점, chibi 종족 레지스트리)에
  데이터만 더한다 → 기존 조립 로직 무수정.

### L — 리스코프 치환 (LSP)
- 같은 역할의 파츠·아바타·씬 요소는 **동일 인터페이스로 상호 치환** 가능해야 한다. 특정 타입에만
  통하는 분기(`if type === 'tiger'` 류 특례·死코드)는 인터페이스 누수 신호 — 제거하거나 정식
  다형 지점으로 흡수한다.

### I — 인터페이스 분리 (ISP)
- **얇은 배럴(파사드)로 공개면을 좁게.** 분해된 하위 모듈은 소비자에게 통째로 노출하지 않고,
  안정적 재수출 배럴을 통해 필요한 심볼만 공개한다(§4).
- 소비자는 자기가 쓰는 심볼만 import한다. 배럴 하나에서 전부 끌어오는 습관을 피한다.

### D — 의존성 역전 (DIP)
- **모든 상태는 SSOT를 경유한다.** 공간·아바타 데이터는 `normalizeSpace`/`normalizeChibi`를 반드시
  통과해 정규화·마이그레이션된 뒤에만 렌더·저장으로 흐른다. 원시 객체를 렌더러에 직접 넘기지 않는다.
- 렌더·물리·UI는 **구체 저장 형식이 아니라 정규화된 스키마 타입에 의존**한다.

---

## 2. 강제 불변식 (위반 = 교차리뷰 반려)

이미 지켜지고 있으며(DEVLOG QA/SOLID 감사 2026-07-18 "아키텍처 경계·의존구조는 모범"), **앞으로도
불변**이다. release-reviewer 교차리뷰가 이 4개를 확인한다.

1. **보호 파일 → 방문/빌더 모듈로의 import 0.** 라이브 런타임 보호 4파일
   ([main.js](../frontend/js/main.js)·[player.js](../frontend/js/player.js)·[artworks.js](../frontend/js/artworks.js)·[config.js](../frontend/js/config.js))은
   가산형 신규 모듈(`visit.js` 등)을 **역참조하지 않는다**. 신규 기능은 보호 파일에 결합하지 않는
   **독립 가산 모듈**로 짓는다.
2. **순환 의존 0.** 모듈 그래프에 사이클을 만들지 않는다.
3. **SSOT 전량 경유.** 공간/아바타 데이터의 렌더·저장 경로는 예외 없이 `normalizeSpace`/
   `normalizeChibi`를 지난다.
4. **보호 파일 수정은 게이트.** 보호 4파일 변경은 감독·팀장 사전 서명 대상(behind-flag·라이브
   무중단 원칙, `CLAUDE.md`).

---

## 3. 모듈 구조 (SSOT 지도)

| 층 | 파일 | 책임 |
|---|---|---|
| **공간 스키마 SSOT** | [space.ts](../frontend/js/space.ts) | "파라미터가 곧 공간". 버전 필드 + `normalizeSpace`/`migrateSpace`(하위호환). 저장은 localStorage/JSON만. |
| **아바타 스키마 SSOT** | [chibi-schema.js](../frontend/js/chibi-schema.js) | 치비 아바타 정규화·마이그레이션(`normalizeChibi`). space 스키마가 계승한 원형. |
| **파츠 지오메트리** | [space-parts.ts](../frontend/js/space-parts.ts) | `partGeo`·`partAccent`·`MATS` — 파츠 형상/재질의 단일 정의 지점(§1-O). |
| **공간 조립기** | [space-assembler.ts](../frontend/js/space-assembler.ts) | `buildSpaceGroup`(Chunked)·`addRoomLighting`·프리뷰 — 빌더·방문 공용. |
| **렌더 파사드** | [space-render.js](../frontend/js/space-render.js) | 위 3층을 재수출하는 **얇은 배럴**. 소비자는 이 안정 경로로만 접근. |
| **고정 미술관(보호)** | main·player·artworks·config | 서비스 중인 단일 고정 전시. 함부로 수정 금지. |
| **방문자뷰(가산)** | [visit.js](../frontend/js/visit.js) | 보호 파일 미결합 독립 모듈. |
| **오픈월드(현행)** | [world.js](../frontend/js/world.js) 등 | 파셀 스트리밍·NPC·성능 적응계. `space`는 무수정, `space-render`는 **가산 1건 승인됨** — `addRoomLighting(group, opts)`에 `opts.noSpots` 게이트(라이트 풀 도입 시 교차리뷰·감독 승인). 기본 경로(opts 없음)는 라이브 회귀 0을 씬그래프 구조 비교로 입증했다. 그 외 접촉은 여전히 금지. |
| **오픈월드(재작성)** | `frontend/js/world2/` | Kernel + Systems. **개수 불변식**(파셀 로드가 씬의 형태를 바꾸지 않는다) 위에 세운 신설 트랙. 판정은 `decide/`의 순수 함수, 집행은 커널, 계측은 비상주. behind-flag(무링크)로 현행과 병행하며 감독 판정 후 교체. |

---

## 4. 배럴(파사드) 패턴 — 분해와 안정성의 양립

SRP로 파일을 쪼개되 **소비자의 import 경로는 깨지 않는다.** 분해 후 원래 파일명은 얇은 재수출
배럴로 남긴다:

- `scene.js` → `scene-themes`·`scene-textures`·`scene-trees`·`scene-assembly` 재수출
- `ui.js` → `export * from "./ui-hud.js"`
- `space-render.js` → `space-parts`·`space-assembler`·`space-lightmap` 재수출
- `chibi.js` → `chibi-schema`·`chibi-builder`·`chibi-animation` 등 재수출(동형)

(주의 — `chibi-color.js`·`main-gpu.js`는 이름이 짧아도 **배럴이 아니다**. 각각 `shade`/`probeGpu`
등 자체 로직을 정의하는 독립 모듈이므로 내부 재배치 시 배럴과 다르게 취급한다.)

**규칙**: 하위 모듈을 새로 나눌 때 (1) 공개 심볼 시그니처를 배럴에서 그대로 유지하고, (2) 소비자는
배럴 경로를 계속 쓰며, (3) 내부 재배치는 배럴 뒤에서 자유롭게 한다. 이것이 ISP(좁은 공개면)와
OCP(내부 변경이 소비자에 안 샘)를 동시에 만족시킨다.

---

## 5. TypeScript 점진 전환

- **leaf-first strict TS.** 순수 스키마·상수 등 말단(leaf) 파일부터 strict TypeScript로 전환한다
  (`space.ts`·`space-parts.ts` 등). 런타임 로직·값은 무변경, 타입만 첨가한다.
- **소스는 `.ts`, 컴파일 `.js`도 커밋.** 정적 직서빙(GitHub Pages가 `.js`를 그대로 서빙)과
  vite 빌드를 동시에 만족시키기 위해 현재는 둘 다 추적한다. `.ts`가 진실의 소스이며 `.js`는 그
  산출이다 — **로직 수정은 `.ts`에서** 하고 `.js`를 손으로 갈라지게 두지 않는다.
- **드리프트 검증 (강제).** 커밋된 `.js`는 대응 `.ts`의 컴파일 산출과 일치해야 한다. `.ts`를 고치고
  `.js` 재생성을 빠뜨리면 라이브(정적 직서빙)가 옛 로직을 계속 서빙한다 — 이건 선의가 아니라
  **검증 대상**이다. release-reviewer 교차리뷰 항목에 "변경된 `.ts`의 `.js` 산출 동기화"를 포함하고,
  가능하면 `typecheck` 단계 또는 배포 전 스모크에 드리프트 체크를 붙인다.
- 검증: `npm run typecheck`(tsc --noEmit) + `npm test`(vitest) + `npm run lint`.

---

## 6. 자기완결·보안 경계

- **외부 호스트 0.** CDN·웹폰트·원격 이미지·원격 GLB 금지. three는 [/vendor/three.module.js](../frontend/vendor/)에서.
- **CSP `default-src 'self'`** — script-src 해시 고정, object-src none. 신규 코드가 인라인 스크립트·
  외부 fetch를 도입하면 CSP 정합이 깨진다(배포 차단). vite.config 플러그인이 CSP 정합을 빌드 시 유지.
- **IP 경계.** 특정 게임/브랜드 트레이드드레스·실존 상호·인물 금지. 파츠 에셋은 자작 지오메트리만
  (외부 에셋 도입은 `OPERATING-PRINCIPLES.md` §6 법무 게이트).

---

## 7. 배포 아키텍처 (현행 — GitHub Pages 정적)

> 범위: **현행 유지**가 확정 방침(감독 2026-07-25). 백엔드·계정·결제 등 스케일 전환은 이 문서
> 범위 밖 — 착수 시 `docs/SCALING.md`·`docs/MIGRATION.md`에서 다룬다.

**파이프라인** ([.github/workflows/deploy.yml](../.github/workflows/deploy.yml)): `main` push →
0. **`verify` — 검증 게이트**(`uses: ./.github/workflows/ci.yml`). lint·typecheck·참조무결성·
   단위테스트 + 헤드리스 렌더 스모크. `deploy` 가 `needs: verify` 로 이어져 있어 **여기가
   빨간불이면 아래 단계가 아예 뜨지 않는다**(2026-07-29 결선, #127).
1. `npm ci` (브라우저 다운로드 억제 — 배포엔 불요). **생성기보다 앞이다** — 생성기가 npm
   의존을 얻는 순간 스모크와 실행 환경이 갈리기 때문.
2. **생성기 3종**: `build-devlog`·`build-team`·`build-valuation` → devlog/team/valuation·sitemap·robots
3. **`vite build`** → `dist/`(base = `scripts/site-url.mjs` 의 `BASE_PATH`). HTML rename·CSP 정합·
   자기완결을 vite 플러그인이 수행
4. **`_site` 조립**: `dist/` + 생성기 산출 + 정적(sitemap·robots) + `_deploy-sha.txt` + `.nojekyll`
5. `peaceiris/actions-gh-pages` → `gh-pages` 브랜치 → GitHub Pages 자동 갱신 (**main 한정** —
   `if: github.ref` 가드가 방어심층으로 걸려 있다)
6. **`verify-live` — 배포된 URL 을 실제로 열어본다**(`needs: deploy`, main 한정, #128).
   HTTP 200 · 자산 실패 0 · 콘솔 에러 0 · `_deploy-sha.txt` 판본 일치.

> **6단계 빨간불 ≠ 배포 실패.** `verify-live` 는 publish **뒤에** 도는 알림이다. 여기서 FAIL 이
> 나도 배포는 이미 나갔고 이 job 이 되돌리지 않는다. 따라서 `CLAUDE.md` 의 "Actions success
> 확인"은 1~5단계를 뜻한다.
>
> **FAIL 시 런북** — 먼저 리포트의 판정 줄을 본다.
> · `판정 불가 — 전 페이지 도달 실패` → 라이브 상태는 **알 수 없다**. 러너 egress·DNS 문제이지
>   배포 문제가 아니다. 재실행으로 확인한다.
> · `배포 판본 미반영`(라이브 SHA ≠ 이번 커밋) → Pages 반영 지연이거나 publish 가 실패한 것.
>   `gh-pages` head 를 확인한다.
> · 특정 페이지 FAIL(404·자산 실패) → **배포물 결함이다.** 조립 레시피(`deploy.yml` ↔
>   `scripts/smoke/assemble.mjs`)가 어긋났는지 먼저 보고, 필요하면 §10 롤백 절차로 간다.
> 어느 경우든 **원인을 기록한다.** 못 잰 것을 통과로도, 배포 실패로도 적지 않는다.

**배포 매핑**: `landing.html` → 루트 `index.html` / `guide.html` → 루트 / `index.html`·`studio.html`
→ `app/`. (재배치는 vite 플러그인이 수행 — 수동 cp 폐지.)

**배포 게이트**(`OPERATING-PRINCIPLES.md` §10): 구현 → **독립 executor 스모크**(구현자 ≠ 검증자) →
**release-reviewer 교차리뷰** → 승인 → push. main push 후 Actions success 확인까지가 배포 완결.

**공급망 위생**: 모든 GitHub Action은 SHA 핀 고정(보안 §10-6 상시 점검 대상).

---

## 8. 신규 코드 체크리스트 (착수 전 자문)

- [ ] 이 변경의 **책임은 하나**인가? 여러 관심사면 파일을 나눴는가? (SRP)
- [ ] 상수·형상을 **복붙**하지 않고 단일 정의 지점에 뒀는가? (OCP/DRY)
- [ ] 데이터는 `normalize*` **SSOT를 경유**하는가? (DIP)
- [ ] **보호 4파일을 import·수정**하지 않는가? 필요하면 게이트를 받았는가? (불변식 1·4)
- [ ] 파일을 나눴다면 **배럴로 공개 경로를 유지**했는가? (ISP)
- [ ] 외부 호스트·인라인 스크립트를 **도입하지 않아** CSP가 유지되는가?
- [ ] `.ts`(소스)에서 고쳤고 `typecheck`·`test`·`lint`가 통과하는가?
- [ ] 배포 게이트(스모크→교차리뷰→승인)를 거쳤는가?

---

## 관련 문서

- 조직 운영·게이트·모델 라우팅 — [OPERATING-PRINCIPLES.md](./OPERATING-PRINCIPLES.md)
- 작업 지침(언어·보호파일·배포 규율 요약) — [../CLAUDE.md](../CLAUDE.md)
- 개발 이력(원인→분석→개선→결과) — [DEVLOG.md](./DEVLOG.md)
- 시각 디자인 시스템 — [DESIGN.md](./DESIGN.md)
- 오픈월드 설계 — [OPENWORLD.md](./OPENWORLD.md)
- 스케일·이전(범위 밖) — [SCALING.md](./SCALING.md) · [MIGRATION.md](./MIGRATION.md)
