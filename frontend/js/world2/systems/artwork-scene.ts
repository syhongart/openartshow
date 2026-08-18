// world2/systems/artwork-scene.ts — **액자와 조명을 씬에 세운다** (W8-4 집행부).
//
// 판정은 전부 순수 쪽이 소유한다 — 크기·벽 자세는 `decide/artwork.ts`, 풀 크기·배정·
// 스포트 자세는 `decide/art-light.ts`. 이 파일은 **그 결과를 three 객체로 옮기는 일**만
// 한다. 여기에 산술을 적으면 노드가 못 도는 자리에 판정이 생긴다.
//
// ── ⚠ 팀장 조건 1 — 개수 불변 절대 ───────────────────────────────────────
// 라이트는 **부팅에 풀 전체를 만들고 세션 중 생성·제거·`visible` 토글을 0회** 한다.
// 끄고 켜는 것은 `intensity` 뿐이다. 근거는 라이브 오픈월드가 이미 검증했다
// (`world.js:296-330`) — `visible=false` 는 three 가 렌더 목록에서 빼면서 셰이더 캐시를
// 흔들고, 그것이 `[7]` 개수 불변식이 잡는 바로 그 증상이다.
//
// ── ⚠ 팀장 조건 5 — `castShadow = false` ─────────────────────────────────
// three r171 에서 `castShadow` 는 `intensity` 와 달리 **캐시키 안**이고
// (`AnalyticLightNode.js:40`), 켜면 라이트마다 텍스처 2장이 생겨 `[7]` 이 FAIL 한다.
// **여기서 `true` 로 바꾸지 마라** — 그림자는 감독 카드로 직행하는 별개 판정이다.
//
// ── three 를 주입받는다 ───────────────────────────────────────────────────
// `edit/types.ts` 의 `OverlayHost.THREE` 와 같은 형태다. 이 저장소에서 three 를 직접
// import 한 파일은 **노드가 못 돌려** 검사가 텍스트로 떨어지고, W8-2 에서 그 형태가
// 진단 계약 셋을 `0 failed` 로 만든 전례가 있다.
//
// ── 재질은 공유한다 ──────────────────────────────────────────────────────
// 액자 테두리 재질은 **전 작품이 하나를 공유**한다. 작품마다 만들면 재질 수가 작품 수에
// 비례해 늘고 `[7]` 이 그것을 증식으로 읽는다. 작품 평면만 텍스처가 달라 개별이다.

import {
  frameSize, type ArtworkItem,
} from '../decide/artwork.js';
import {
  artLightPoolSize, assignArtLights, spotFor, ART_LIGHT_PER_PARCEL, artParcelCount, artParcelXZ,
} from '../decide/art-light.js';
import { artMatSpec, readArtEnv } from '../decide/art-material.js';
import {
  readParcelAnim, scaleAdvance, START_SCALE, type ScaleState,
} from '../decide/lod-fade.js';
/**
 * 계약은 `artwork-types.ts` 가 소유한다 — **여기는 배럴이다**(W8-9 분리).
 * 소비자 경로가 안 바뀌게 전부 재수출한다. 근거는 그 파일 헤더 한 곳이다.
 */
export type {
  ArtThreeNS, ArtNode, ArtMaterial, ArtLight, ArtworkSceneDeps, ArtworkStats, ArtworkScene,
} from './artwork-types.js';
export { FRAME_BORDER, FRAME_DEPTH, LIGHT_ON, LIGHT_COLOR } from './artwork-types.js';

import type {
  ArtThreeNS, ArtNode, ArtLight, ArtMaterial, ArtworkSceneDeps, ArtworkStats, ArtworkScene,
} from './artwork-types.js';
import {
  FRAME_BORDER, FRAME_DEPTH, LIGHT_ON, LIGHT_COLOR,
} from './artwork-types.js';

/**
 * 액자·조명 씬. **`mount` 시점에 라이트 풀이 완성된다** — `place` 는 개수를 안 바꾼다.
 */
export function createArtworkScene(deps: ArtworkSceneDeps): ArtworkScene {
  const { THREE, scene, cellX, cellZ } = deps;
  const perParcel = deps.perParcel ?? ART_LIGHT_PER_PARCEL;

  const root = new THREE.Group();
  root.name = 'world2:artwork';
  scene.add(root);

  // ── 라이트 풀 — 여기서 전부 만든다(조건 1) ──────────────────────────────
  // ⚠ `place` 안이나 루프 안에서 만들지 마라. 풀 크기 유도는 `art-light.ts` 의
  // `artLightPoolSize` 한 곳이다. 🔴 이 줄은 오래 *"풀 크기는 **작품 수와 무관**"* 이라고
  // 적고 있었고 **조건 2 개정(2026-08-18)으로 부정확해졌다** — 이제 「작품이 걸린 파셀
  // 수」를 상한 안에서 반영한다. **총수와는 여전히 무관하다**(100장이 한 파셀이면 1파셀분).
  //
  // ⚠⚠ **`perParcel` 을 넘기지 마라 — 조건 3 을 깨는 정확한 형태다**(검수관 블로커 B1).
  // 그 사고의 전문·뮤테이션 실측은 `art-light.ts` 의 soft 상수 주석 한 곳이다.
  const pool: ArtLight[] = [];
  // ⚠ `perParcel` 은 안 넘긴다(조건 3 — 넘기면 세션마다 풀이 달라진다, 검수관 B1).
  const poolSize = artLightPoolSize(ART_LIGHT_PER_PARCEL, undefined,
    deps.arts == null ? undefined : artParcelCount(deps.arts, cellX, cellZ));
  for (let i = 0; i < poolSize; i++) {
    const L = new THREE.SpotLight(LIGHT_COLOR, 0);
    L.castShadow = false;      // ⚠ 조건 5 — 파일 헤더 참조
    L.penumbra = 0;
    L.angle = 0.3;
    L.distance = 1;
    // three 의 SpotLight 는 `target` 이 씬에 있어야 방향이 먹는다.
    const t = new THREE.Object3D();
    L.target = t;
    root.add(L);
    root.add(t);
    pool.push(L);
  }

  /**
   * 그림 재질 명세. 노브는 **세션당 한 번만** 읽는다 — `place()` 는 작품마다 도는
   * 자리라 거기서 URL 을 파싱하면 걸 때마다 반복된다. 세션 중에 값이 바뀔 일도 없다
   * (새로고침해야 한다).
   */
  const artSpec = artMatSpec(deps.artEnv ?? readArtEnv());

  /** 등장·소멸 연출. **건물과 같은 것을 본다** — 근거는 `ArtworkSceneDeps.anim` 한 곳 */
  const anim = deps.anim ?? readParcelAnim();

  /** 액자 테두리 재질 — **전 작품이 공유한다**(재질 수를 상수로) */
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.45, metalness: 0.1,
  });
  const artMats: ArtMaterial[] = [];
  /** dispose 대상 지오메트리. `[7]` 이 보는 축이라 재질만 지우면 절반만 정리된다 */
  const artGeos: { dispose?(): void }[] = [];
  /**
   * 세운 액자. **전체 대체가 이것을 지운다**(W8-4 D1.6).
   *
   * 왜 `root.children` 을 훑지 않는가 — 거기에는 **라이트와 그 타깃도 섞여 있다**
   * (`root.add(L)`·`root.add(t)`). 통째로 비우면 풀이 씬에서 빠져 개수 불변식이 깨진다.
   * 액자만 따로 들고 있는 것이 그 사고를 구조로 막는 유일한 방법이다.
   *
   * ── 왜 그룹만이 아니라 «파셀·라이트·표시상태» 까지 드는가 (W8-9) ───────────
   * `update()` 가 프레임마다 돈다. 그때 ① 어느 파셀인지 다시 계산하거나 ② 어느 라이트를
   * 받았는지 되찾으려 하면 **매 프레임 할당·탐색**이 생긴다. 걸 때 한 번 계산해 여기
   * 두면 프레임 비용이 «`loaded()` 한 번 + 비교 한 번» 이 된다.
   *
   * `light` 가 `null` 인 것은 조명을 못 받은 액자다(cap 초과 또는 풀 고갈) — 그 구별은
   * `stats()` 의 `skipped`·`unpowered` 가 이미 세고 있고 여기서는 «끌 것이 있나» 만 본다.
   */
  const placed: {
    readonly g: ArtNode;
    readonly px: number;
    readonly pz: number;
    readonly light: ArtLight | null;
    /** 화면에 내놓고 있는가. `anim.k > 0` 과 짝이지만 **전이에서만** 갱신한다 */
    shown: boolean;
    /** 등장·소멸 진행. 산술은 `decide/lod-fade.ts` 의 `scaleAdvance` 소유다 */
    anim: ScaleState;
  }[] = [];
  let frames = 0;
  let lit = 0;
  let skipped = 0;
  let unpowered = 0;
  let texFailed = 0;
  /** 지금 화면에 내놓은 액자 수. `frames` 와 **다른 값이다** — `ArtworkStats` 헤더 참조 */
  let shown = 0;
  let disposed = false;
  /**
   * 다음에 쓸 풀 슬롯. **인스턴스 상태다 — `place` 안의 지역 변수가 아니다.**
   *
   * 지역 변수였을 때 `place` 를 두 번 부르면 슬롯이 0부터 다시 배정돼 **같은 라이트를
   * 두 작품이 나눠 갖고**(뒤엣것이 이긴다) `lit` 는 둘 다 셌다 — 검수관 P5 실측:
   * 2회 호출 → `frames 4, lit 4` 인데 실제로 켜진 라이트는 **2개**. 지금 호출부가 1회라
   * 잠복해 있었을 뿐이고, W8-4 D(편집에서 작품 걸기)가 열리면 그 즉시 상시 경로가 된다.
   */
  let next = 0;
  /**
   * `place` 세대. **올라가는 일만 있고 리셋되지 않는다** — 재진입한 옛 호출이 자기가
   * 낡았다는 것을 아는 유일한 표식이다. 근거·재현은 `place` 헤더(검수관 블로커 B1).
   */
  let generation = 0;

  /**
   * 이전 `place` 의 흔적을 지운다. **라이트는 안 지운다 — 끈다.**
   *
   * 그 구별이 조건 1(개수 불변 절대)의 전부다: 풀은 부팅에 서고 세션 내내 그대로이며,
   * 여기서 하는 것은 `intensity = 0` 뿐이다. **끄지 않으면 지운 작품 자리에 빛이 남는다**
   * — 액자는 사라졌는데 벽이 밝은 상태이고, 화면에서 원인을 짚기 어려운 형태다.
   */
  function clearPlaced(): void {
    for (const p of placed) root.remove(p.g);
    placed.length = 0;
    for (const m of artMats) m.dispose?.();
    artMats.length = 0;
    for (const geo of artGeos) geo.dispose?.();
    artGeos.length = 0;
    // ⚠ **텍스처는 여기서 안 지운다 — 캐시가 소유한다**(아래 `textureFor`).
    // 재질과 지오는 `place` 마다 새로 만들지만 텍스처는 그림 자체라 재사용이 옳고,
    // 그것이 이 회차에서 실측된 누수의 처방이다.
    for (const L of pool) L.intensity = 0;
    frames = 0; lit = 0; skipped = 0; unpowered = 0; texFailed = 0; next = 0;
    shown = 0;
  }

  /**
   * 캐시 키 → 텍스처(실패는 `null`). **`place` 를 다시 불러도 재로드하지 않는다.**
   *
   * ── 🔴 왜 생겼나 — 팀장 조건 A 실측이 잡은 누수 (2026-08-17) ───────────────
   * `place()` 가 **전체 대체**라 걸 때마다 전부 다시 세우는데, `material.dispose()` 는
   * three 에서 **`map` 을 건드리지 않는다.** 그래서 `clearPlaced` 가 재질·지오는 지워도
   * 텍스처만 남았다. 편집 세션에서 작품을 8회 걸며 잰 실측:
   *
   *   회차   1   2   3   4   5   6   7   8
   *   Δtex   1   2   5   8  12  17  23  30   ← **증가폭이 커진다(N² 신호)**
   *   Δgeo   2   2   4   4   4   4   4   4   ← 멈춘다(dispose 가 듣는다)
   *
   * ⚠ **라이브 영향은 0이다** — 라이브 경로에서 `place` 는 부팅 1회뿐이고, 반복 호출은
   * `?edit=1` 세션에서만 일어난다. 그래도 고치는 이유는 편집이 실사용 경로이기 때문이다.
   *
   * **`null` 도 캐시한다** — 실패를 매 `place` 마다 재시도하면 걸 때마다 느려지고,
   * 없는 파일은 다음에도 없다. 되살아나는 경로(파일이 나중에 생김)는 새로고침이다.
   *
   * ── 경계: 무엇이 남는가 (검수관 권고 P5) ─────────────────────────────────
   * 지운 작품의 텍스처도 세션 끝까지 남는다. 그리고 **같은 파일명을 N회 다시 드롭하면
   * 매번 새 `blob:` 이라 키가 N개 생기고 옛 텍스처는 도달 불가능한 채 남는다**(미리보기
   * 맵이 덮어쓰므로). 선형이고 편집 세션 한정이라 받아들인다 — `dispose()` 가 한 번에
   * 회수한다.
   *
   * ⚠ **그래서 churn 판정선은 「총량 불변」이 아니라 「증가폭 불증가」다.** 총량으로
   * 잡으면 이 정당한 누적 때문에 거짓 FAIL 이 난다(D4 게이트 명세 G3 의 근거).
   */
  const texCache = new Map<string, unknown | null>();
  const keyOf = deps.texKey ?? ((s: string) => s);

  async function textureFor(src: string): Promise<unknown | null> {
    if (!deps.loadTexture) return null;
    const key = keyOf(src);
    const hit = texCache.get(key);
    if (hit !== undefined) return hit;
    let tex: unknown | null = null;
    try { tex = await deps.loadTexture(src); } catch { tex = null; }
    texCache.set(key, tex);
    return tex;
  }

  /**
   * 작품을 놓는다. **전체 대체다** — 부를 때마다 이전 것을 지우고 처음부터 세운다
   * (팀장 판정 2026-08-17 (가)). `village-parcels.ts` 의 `setAll` 과 같은 의미론이다.
   *
   * ── 왜 누적이 아니라 대체인가 ───────────────────────────────────────────
   * 편집은 걸고 **지우는** 것이 짝인데 누적 계약에는 지울 수단이 없었다. 개별 제거 API
   * (`remove(i)`)를 다는 길도 있었지만 팀장이 기각했다 — **슬롯 반환 큐라는 새 상태
   * 기계가 조건 1 의 검사 축을 늘리고**, 아래 cap 버그는 그대로 남기 때문이다.
   *
   * ⚠ **부수 효과가 아니라 이 판정의 절반이다**: `assignArtLights` 의 `used` 맵은 함수
   * 지역이라 **호출마다 파셀 cap 이 초기화**된다. 누적 계약에서는 같은 파셀에 1개씩 두 번
   * 놓으면 `perParcel=1` 이어도 **둘 다 켜졌다.** 전체 대체에서는 매 호출이 전체를 다시
   * 배정하므로 그 지역성이 **정답**이 된다. 팀장 조건 C 가 이것을 명시 테스트로 못 박게 했다
   * — 부수 효과로만 두면 구조를 되돌릴 때 버그가 소리 없이 부활한다.
   */
  async function place(arts: readonly ArtworkItem[]): Promise<void> {
    if (disposed) return;
    // ⚠⚠ **세대 도장 — 재진입에서 옛 호출이 이탈하는 유일한 수단이다**(검수관 블로커 B1).
    //
    // 아래 루프는 `await textureFor` 에서 **제어를 놓는다.** 그 사이 두 번째 `place` 가
    // 들어오면 그쪽이 `clearPlaced()` 로 공유 상태를 비우는데, **1차가 재개해 같은
    // 배열에 계속 push 하고 `root.add` 하고 슬롯을 소비한다.** 검수관이 실제로 재현했다:
    // 문서상 작품 **2개**에 씬에는 액자 **3개** — 그리고 `stats().frames` 는 3 이라고
    // 말한다(팀장 조건 B 가 지목한 «`stats` 가 거짓말하는 형태» 의 두 번째 자리다).
    //
    // 도달 경로가 열려 있다: `edit/input.ts` 의 드롭 분기가 `void deps.art.drop(…)` 로
    // **던지고 안 기다리고**, `edit/artwork-mode.ts` 의 `await measure(url)`(이미지 디코드)이
    // 창을 연다. **작품 두 점을 연달아 거는 것은 전시를 꾸미는 사람의 기본 동작이다.**
    //
    // ⚠ 데이터 손실은 없었다 — `systems/art-port.ts` 의 `items = next` 가 첫 `await` 앞에
    // 있어 lost update 가 성립하지 않는다. 어긋난 것은 **씬과 통계**뿐이다.
    const gen = ++generation;
    clearPlaced();
    const plan = assignArtLights(arts, perParcel, cellX, cellZ);
    skipped += plan.skipped;

    for (let i = 0; i < arts.length; i++) {
      if (disposed || gen !== generation) return;
      const a = arts[i];
      const { w, h } = frameSize(a);

      const g = new THREE.Group();
      g.position.set(a.x, a.y, a.z);
      g.rotation.y = a.ry;

      // 테두리: 작품보다 조금 큰 얇은 판. 4변을 따로 만들지 않는 이유는 드로우콜이
      // 같으면서 지오메트리 수가 1/4 이기 때문이다(`[7]` 이 그 수를 본다).
      const borderGeo = new THREE.BoxGeometry(
        w + FRAME_BORDER * 2, h + FRAME_BORDER * 2, FRAME_DEPTH,
      );
      artGeos.push(borderGeo as { dispose?(): void });
      const border = new THREE.Mesh(borderGeo, frameMat);
      g.add(border);

      // 작품 평면 — 텍스처는 개별이라 재질도 개별이다.
      //
      // ⚠ **텍스처를 먼저 받고 재질을 만든다.** 첫 판본은 재질을 만든 뒤 `mat.map = tex`
      // 를 했고 **브라우저 실측에서 그림이 안 떴다**(`texFailed: 0` 인데 액자가 회색).
      // three 는 재질이 처음 렌더될 때 셰이더를 굽는데, 그 뒤 `map` 을 꽂으면
      // `needsUpdate = true` 없이는 반영되지 않는다.
      //
      // `needsUpdate` 로 고칠 수도 있었지만 그 길은 **셰이더를 다시 굽는다** — 파이프라인
      // 수가 오르내리고 `[7]` 이 그것을 본다. 순서를 바꾸면 처음부터 맞는 셰이더가 한 번만
      // 구워진다. **잰 것이 아니라 구조로 해소한 것**이 요점이다.
      // ⚠ 캐시를 거친다(`textureFor`) — 그것이 없을 때 텍스처가 N² 로 샜다.
      // `texFailed` 는 **캐시 히트에서도 센다** — 「이번 화면에 실패한 액자가 몇 개인가」이지
      // 「이번에 몇 번 실패했는가」가 아니다. 리셋이 `clearPlaced` 에 있는 것과 짝이다.
      const tex = await textureFor(a.src);
      // ⚠ **재개 지점이다 — 세대를 다시 본다.** 여기를 빼면 B1 이 그대로 살아 있다:
      // 이 줄 위에서 만든 `borderGeo` 는 2차의 `clearPlaced` 가 이미 dispose 했는데,
      // 아래로 계속 가면 그 지오로 만든 액자를 `root.add` 해 **유령**이 선다.
      if (disposed || gen !== generation) return;
      if (deps.loadTexture && !tex) texFailed++;
      // ── 🔴 그림은 **주변 환경을 안 받는다** (W8-7, 감독 지시 2026-08-18) ──
      // *"그늘에 있으면 사진이 어두워. 사진은 주변환경에 영향을 안받았으면"*
      // 같은 날 두 번째: *"작품에는 **재질감 전혀없이.** 그냥 **뷰어처럼** 밝기가
      // 보였으면해. 그림자 영역에서도 작품은 그대로. 밝은 곳에서도 그대로."*
      //
      // 예전에는 여기가 `MeshStandardMaterial` 이었고, 그래서 그늘진 벽에 건 사진이
      // 실제로 어두워졌다. 팀장 판정으로 **조명도 톤매핑도 안 받게** 바꿨다 —
      // 「주변환경」에 시간대 노출이 포함된다는 것이 그 판정의 요점이다.
      //
      // ⚠ **판정은 여기 없다.** 어느 재질인지는 `decide/art-material.ts` 가 정하고
      // 여기는 집행뿐이다. (나) `emissiveMap` 을 왜 안 썼는지도 그 파일 헤더 한 곳이다.
      //
      // ⚠⚠ **테두리(`frameMat`)는 Standard 그대로다** — 감독이 "사진은" 이라고
      // 특정했고, 테두리까지 발광시키면 액자가 공간에서 붕 뜬다.
      //
      // 📊 **첫 작품 걸기 계단**(팀장 조건 4)은 `decide/art-material.ts` 의 실측 절에 있다.
      //
      // ⚠ **PBR 인자는 `standard` 에만 넘긴다**(검수관 블로커 B1, 2026-08-18).
      // 첫 판본은 둘 다에 `roughness`/`metalness` 를 넘기며 *"Basic 이 무시한다 —
      // 넘겨도 무해하다"* 라고 적었다. 앞 절은 참이고 **뒷 절은 거짓이었다** — three 는
      // 작품마다 경고 두 줄을 낸다(r171 두 빌드 모두 실측):
      //     THREE.Material: 'roughness' is not a property of THREE.MeshBasicMaterial.
      // 작품 N개면 2N 건이고, 스모크 `[4]` 는 `console.error`·pageerror 만 보므로
      // **어느 게이트도 이것을 안 잡는다.** 그리고 감독 문언이 *"재질감 전혀없이"* 라
      // 넘기지 않는 것이 코드가 말하는 바와도 맞는다.
      const isBasic = artSpec.kind === 'basic';
      const MatCtor = isBasic ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial;
      const mat = new MatCtor({
        ...(tex ? { map: tex } : {}),
        // 대조군(`?artenv=2`)의 룩을 예전 그대로 두려면 이 두 값이 있어야 한다.
        ...(isBasic ? {} : { roughness: 0.85, metalness: 0 }),
        toneMapped: artSpec.toneMapped,
        // ⚠ 안개는 **기본값이 켜짐**이라 안 넘기면 그림이 계속 안개색으로 물든다
        // (팀장 판정 (B)). 근거·실측·재론 트리거는 `ArtMatSpec.fog` 주석 한 곳이다.
        fog: artSpec.fog,
      });
      artMats.push(mat);
      const planeGeo = new THREE.PlaneGeometry(w, h);
      artGeos.push(planeGeo as { dispose?(): void });
      const plane = new THREE.Mesh(planeGeo, mat);
      // 테두리 판 **앞면**에 얹는다. 뒤에 두면 판에 가려 아무것도 안 보인다.
      plane.position.set(0, 0, FRAME_DEPTH / 2 + 0.002);
      g.add(plane);
      root.add(g);
      frames++;

      // 조명 — 배정받은 것만. **풀에서 꺼내 쓸 뿐 새로 만들지 않는다.**
      //
      // ⚠ 배정을 받았는데 슬롯이 없으면 `unpowered` 다. **조용히 넘어가지 않는다** —
      // 그것이 검수관 블로커 B3-1 의 형태였다(어두운 작품 52개가 아무 숫자에도 안 잡혔다).
      let assigned: ArtLight | null = null;
      if (!plan.lit[i]) {
        // cap 초과 — `skipped` 가 이미 셌다(`plan.skipped`)
      } else if (next >= pool.length) {
        unpowered++;
      } else {
        const L = pool[next++];
        const s = spotFor(a);
        L.position.set(s.pos.x, s.pos.y, s.pos.z);
        L.target.position.set(s.target.x, s.target.y, s.target.z);
        L.angle = s.angle;
        L.penumbra = s.penumbra;
        L.distance = s.distance;
        L.intensity = LIGHT_ON;   // ← 켜는 유일한 수단(조건 1)
        lit++;
        assigned = L;
      }

      // ⚠ **다음 `place` 가 이걸로 지운다**(전체 대체). 라이트 배정 **뒤에** 담는 것은
      // `light` 를 함께 들기 위해서다 — 나중에 되찾으려면 프레임마다 탐색이 된다.
      //
      // `shown: true` 로 시작한다. 즉 **걸린 순간에는 보인다** — 걸었는데 한 프레임도
      // 안 보이면 편집에서 «걸었다는데 안 뜬다» 가 되고, 부팅에서는 첫 렌더가 기준선
      // 밖으로 밀려 개수 불변식 `[7]` 의 「복귀 구간 계단」 위험이 열린다. 멀리 있는
      // 것은 다음 `update()` 가 곧바로 끈다.
      // ⚠ `fresh: true` — **걸린 것은 애니메이션 없이 목표로 간다.** 근거(사고 둘)는
      // `decide/lod-fade.ts` 의 `scaleAdvance` 헤더 한 곳이다.
      placed.push({
        g, ...artParcelXZ(a, cellX, cellZ), light: assigned, shown: true,
        anim: { k: 1, up: true, elapsed: 0, from: 1, fresh: true },
      });
      shown++;
    }
  }

  /**
   * 건물과 생사를 맞춘다 (W8-9). 계약·근거는 `ArtworkScene.update` 헤더 한 곳이다.
   *
   * ⚠ **`place()` 를 부르지 않는다.** `clearPlaced()` 가 지오·재질을 `dispose()` 하므로
   * 재방문마다 `info.memory` 가 다시 오르고, 그것이 개수 불변식 `[7]` 의 `settledOk` 를
   * 정확히 깨는 형태다. 여기서 하는 것은 `visible` 과 `intensity` 대입뿐이다 — 둘 다
   * GPU 자원을 만들지도 지우지도 않는다.
   *
   * ── 뮤테이션 실측 (2026-08-18, `world2-artwork-scene` + `art-light` + `art-material`) ──
   * 「테스트 통과는 검출력의 증거가 아니다」 — 결함을 일부러 되살려 깨지는지 봤다.
   *
   *   이 함수를 no-op 으로                                    4 failed
   *   걸린 직후를 `shown: false` 로                            4 failed
   *   라이트 `intensity` 토글 제거                             1 failed
   *   `stats().frames` 를 `shown` 으로 (의미 뒤집기)           1 failed
   *   `artParcelXZ` 만 `floor` 로 갈라놓기(배정은 그대로)      1 failed
   *   **등가 대조군 — 주석만 추가**                           **0 failed**
   *
   * 마지막 줄이 있어야 위 다섯이 「무엇이든 건드리면 빨간불」이 아님을 말한다.
   * ⚠ 첫 판본의 「`frames += 0` 을 넣어 본다」는 **등가 뮤테이션**이었고 0 failed 였다 —
   * 그것을 검출력 부족으로 읽을 뻔했다. 뮤테이션은 **동작을 실제로 바꿔야** 축이 된다.
   */
  function update(loaded: (px: number, pz: number) => boolean, dt: number): void {
    if (disposed) return;
    for (const p of placed) {
      const next = scaleAdvance(p.anim, loaded(p.px, p.pz), dt, anim);
      if (!next) continue;   // 바뀐 것이 없다 — 대입 0
      p.anim = next;
      // **`visible` 은 완전히 줄어든 뒤에만 내린다** — 수축이 보여야 하니까.
      const on = next.k > 0;
      if (on !== p.shown) { p.shown = on; p.g.visible = on; shown += on ? 1 : -1; }
      // z 를 1 로 두는 이유는 `ArtNode.scale` 주석 한 곳이다(그림/테두리 간격 2mm).
      const k = Math.max(START_SCALE, next.k);
      p.g.scale.set(k, k, 1);
      // 라이트는 그룹의 **자식이 아니라서**(월드 좌표에 따로 선다) `scale` 이 안 먹는다.
      // 밝기를 같은 배수로 따로 재운다 — 안 하면 액자만 작아지고 벽의 빛 동그라미가
      // 원래 크기로 남는다.
      if (p.light) p.light.intensity = LIGHT_ON * next.k;
    }
  }

  return {
    place,
    update,
    stats: () => ({ lights: pool.length, frames, lit, skipped, unpowered, texFailed, shown }),
    dispose() {
      disposed = true;
      // ⚠ 라이트는 **끄지 않고 그냥 떠난다** — 씬에서 root 를 빼면 함께 사라진다.
      // 여기서 `intensity = 0` 을 돌면 dispose 중에 개수 축이 흔들린 것처럼 보인다.
      scene.remove(root);
      frameMat.dispose?.();
      for (const m of artMats) m.dispose?.();
      artMats.length = 0;
      // ⚠ 지오메트리도 지운다. 첫 판본은 재질만 지웠고 **`[7]` 이 보는 축의 절반이
      // 남았다**(검수관 P6) — three 의 `info.memory.geometries` 는 재질과 따로 센다.
      for (const geo of artGeos) geo.dispose?.();
      artGeos.length = 0;
      // 텍스처는 캐시가 소유하므로 **떠날 때 여기서 한 번에** 지운다(`clearPlaced` 아님).
      for (const t of texCache.values()) (t as { dispose?(): void } | null)?.dispose?.();
      texCache.clear();
    },
  };
}

/**
 * 작품 이미지를 받는 로더. `createArtworkScene` 의 `loadTexture` 에 그대로 넣는다.
 *
 * ⚠ **로더를 한 번만 만든다.** 첫 배선은 작품마다 `new TextureLoader()` 를 했고, three 의
 * 로더는 매니저·캐시를 들고 있어 벌마다 캐시가 갈린다 — 같은 이미지를 두 번 거는 문서에서
 * 같은 파일을 두 번 받는다.
 *
 * 실패는 **값으로** 돌려준다(`null`). 던지면 뒤 작품이 통째로 안 걸린다 — 액자는 서고
 * 그림만 비는 것이 「로드 실패」의 정직한 표시다.
 *
 * ── 🔴 `colorSpace` 를 반드시 준다 (감독 지시 2026-08-18 두 번째) ────────────
 * *"그냥 **뷰어처럼** 밝기가 보였으면해"* — 뷰어는 원본을 원본대로 낸다.
 *
 * three r152+ 의 `TextureLoader` 는 `colorSpace` 를 **설정하지 않는다**(기본
 * `NoColorSpace` = 선형 취급). 그런데 사진 파일은 **sRGB 인코딩**이다. 표시를 안 하면
 * 셰이더가 sRGB 값을 선형으로 잘못 읽고, 출력에서 선형→sRGB 변환이 한 번 더 걸려
 * **원본보다 밝고 색이 바래** 나온다. 「뷰어처럼」의 반대다.
 *
 * ⚠ 이 저장소의 **다른 색 텍스처는 전부 이것을 준다** — `horizon.ts:89` ·
 * `garden.ts:210` · `tree.ts:250` · `road.ts:283` · `shadow.ts:200` ·
 * `surface-paint.ts:246`. **작품 텍스처만 빠져 있었다**(W8-4 부터 W8-7 B1 까지).
 * 화면을 픽셀로 안 보고 액자 **개수**만 확인해 온 것이 이것을 놓친 직접 원인이다.
 *
 * ⚠⚠ **순색으로는 이 결함을 못 잡는다.** sRGB 변환은 극값(0·255)을 그대로 두므로,
 * 마젠타 `rgb(255,0,255)` 같은 순색 픽스처는 고쳐도 안 고쳐도 같은 값을 낸다 —
 * 대역이 실물의 성질을 안 가지는 그 형태다. **중간 회색으로 재야 갈린다.**
 *
 * @param resolve 계약의 `src` → 실제 URL. base 결합은 `asset-url.ts` 한 곳이 소유한다
 */
export function textureLoaderFor(
  THREE: unknown,
  resolve: (src: string) => string,
): ((src: string) => Promise<unknown | null>) | undefined {
  const NS = THREE as {
    TextureLoader?: new () => { loadAsync(u: string): Promise<unknown> };
    SRGBColorSpace?: unknown;
  };
  const TL = NS.TextureLoader;
  if (!TL) return undefined;
  const loader = new TL();
  return async (src: string) => {
    try {
      const tex = await loader.loadAsync(resolve(src));
      // 값을 여기에 적지 않는다 — three 가 소유한 상수를 그대로 얹는다(값 미러링 회피).
      if (tex && NS.SRGBColorSpace !== undefined) {
        (tex as { colorSpace?: unknown }).colorSpace = NS.SRGBColorSpace;
      }
      return tex;
    } catch { return null; }
  };
}

/**
 * 부팅용 진입점 — 씬 생성과 로더 배선을 **한 줄로** 묶는다.
 *
 * ⚠ 이 함수가 있는 이유는 편의가 아니라 **`features/overlay.ts` 의 크기**다. 그 파일은
 * `check:filesize` 상한에 붙어 있고(감독 지시 *"파일사이즈 폭주 안되고 모듈 관리 잘되게"*),
 * 배선을 인라인으로 넣자 게이트가 커밋을 막았다 — W8-3 의 `mountTenantEntry` 와 같은 형태다.
 *
 * @param resolve 계약의 `src` → 실제 URL(`asset-url.ts` 의 `assetUrl`)
 */
export function mountArtworks(
  THREE: unknown,
  scene: ArtNode,
  layout: { cellX: number; cellZ: number },
  resolve: (src: string) => string,
  perParcel?: number,
  /** 부팅 시점 작품 목록 — 풀 크기 유도용. 생략하면 격자 상한을 쓴다(편집 세션) */
  arts?: readonly { readonly x: number; readonly z: number }[],
): ArtworkScene {
  return createArtworkScene({
    THREE: THREE as ArtThreeNS,
    scene,
    cellX: layout.cellX,
    cellZ: layout.cellZ,
    perParcel,
    arts,
    loadTexture: textureLoaderFor(THREE, resolve),
    // 캐시 키를 **실제 URL**로 잡는다 — 같은 `src` 에 새 `blob:` 이 붙으면(같은 파일명을
    // 다시 드롭) 키가 달라져 자동으로 다시 로드된다. `src` 를 키로 쓰면 낡은 그림이 남는다.
    texKey: resolve,
  });
}
