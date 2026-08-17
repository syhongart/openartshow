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
  artLightPoolSize, assignArtLights, spotFor, ART_LIGHT_PER_PARCEL,
} from '../decide/art-light.js';
import { artMatSpec, readArtEnv } from '../decide/art-material.js';

/** 이 파일이 쓰는 three 표면. **필요한 것만** — 넓히면 스텁이 실물과 멀어진다 */
export interface ArtThreeNS {
  Group: new () => ArtNode;
  Mesh: new (geo: unknown, mat: unknown) => ArtNode;
  BoxGeometry: new (w: number, h: number, d: number) => unknown;
  PlaneGeometry: new (w: number, h: number) => unknown;
  MeshStandardMaterial: new (o: Record<string, unknown>) => ArtMaterial;
  // ⚠ **그림 평면 전용이다**(W8-7). 테두리는 계속 Standard 를 쓴다 — 근거는
  // `decide/art-material.ts` 헤더 한 곳이다.
  MeshBasicMaterial: new (o: Record<string, unknown>) => ArtMaterial;
  SpotLight: new (color?: number, intensity?: number) => ArtLight;
  Object3D: new () => ArtNode;
}

export interface ArtNode {
  name?: string;
  position: { set(x: number, y: number, z: number): void };
  rotation: { y: number };
  add(o: ArtNode): void;
  remove(o: ArtNode): void;
  children?: ArtNode[];
}

export interface ArtMaterial { map?: unknown; toneMapped?: boolean; dispose?(): void }

export interface ArtLight extends ArtNode {
  intensity: number;
  angle: number;
  penumbra: number;
  distance: number;
  castShadow: boolean;
  target: ArtNode;
}

/** 액자 테두리 두께·깊이(m). 작품 크기와 무관한 고정값 — 액자는 굵기로 알아본다 */
export const FRAME_BORDER = 0.06;
export const FRAME_DEPTH = 0.05;

/** 켤 때의 밝기. 끌 때는 정확히 `0` 이다(`visible` 을 안 건드리는 것이 조건 1) */
export const LIGHT_ON = 2.4;
/** 조명 색 — 약간 따뜻한 백색. 순백은 작품 색을 차갑게 보이게 한다 */
export const LIGHT_COLOR = 0xfff2e0;

export interface ArtworkSceneDeps {
  readonly THREE: ArtThreeNS;
  /**
   * 그림이 환경 영향을 얼마나 받는가(W8-7). **생략하면 URL 노브를 읽는다** — 이
   * 저장소의 확장 규약(「생략 = 기존 동작」)이고, 테스트는 값을 넣어 세 분기를 다 돈다.
   */
  readonly artEnv?: number;
  readonly scene: ArtNode;
  /** 파셀 격자. 조명 배정이 파셀 단위라 필요하다 */
  readonly cellX: number;
  readonly cellZ: number;
  /** 파셀당 켜는 조명 수. soft 완화가 이 값을 낮춘다(풀 크기는 안 바뀐다) */
  readonly perParcel?: number;
  /**
   * 작품 이미지를 텍스처로. **주입받는다** — 로더를 여기서 만들면 노드가 못 돌린다.
   * 실패하면 `null` 을 내고 액자는 그대로 선다(빈 액자가 «로드 실패» 의 표시다).
   */
  loadTexture?(src: string): Promise<unknown | null>;
  /**
   * 텍스처 캐시 키. **같은 `src` 라도 미리보기 URL 이 바뀌면 다시 로드해야 한다** —
   * 편집에서 같은 파일명을 다시 떨어뜨리면 `blob:` 이 새로 생기는데, `src` 를 키로 쓰면
   * 캐시가 **낡은 그림**을 준다(«바꿨는데 안 바뀐다»). 생략하면 `src` 를 그대로 쓴다.
   */
  texKey?(src: string): string;
}

export interface ArtworkStats {
  /** 풀에 만들어 둔 라이트 수. **세션 중 절대 안 변한다** */
  readonly lights: number;
  /** 세운 액자 수 */
  readonly frames: number;
  /** 실제로 켠 라이트 수 */
  readonly lit: number;
  /**
   * **파셀 cap 초과**로 조명을 못 받은 작품 수(팀장 조건 4 — 걸리되 라이트 없이).
   *
   * ⚠ 이것은 «어두운 작품의 총수» 가 **아니다.** 풀이 고갈돼 못 켠 것은 `unpowered` 다 —
   * 검수관 블로커 B3-1 이 그 혼동을 실측으로 잡았다: 20파셀 × 4작품에서
   * `frames 80 · lit 28 · skipped 0` 이었는데 **실제로 어두운 것은 52개**였다.
   * 이름이 「못 받은 수」라고 말하면서 절반만 세는 것이 이 저장소가 GS-3 을 만든 그 형태다.
   */
  readonly skipped: number;
  /**
   * **풀 고갈**로 조명을 못 받은 작품 수. 배정은 받았는데 슬롯이 없었다.
   *
   * 왜 이 축이 따로 필요한가 — `skipped` 와 원인이 다르고 처방도 다르다. cap 초과는
   * `perParcel` 을 올리면 되지만 풀 고갈은 **풀이 「동시에 보이는 방」(near 7파셀)에서
   * 유도되는데 배정은 문서 전체의 작품에 도는** 분모 불일치다. 둘을 한 숫자로 뭉개면
   * 어느 쪽을 만져야 하는지 화면에서 구별이 안 된다.
   */
  readonly unpowered: number;
  /** 텍스처 로드 실패 수 */
  readonly texFailed: number;
}

export interface ArtworkScene {
  place(arts: readonly ArtworkItem[]): Promise<void>;
  stats(): ArtworkStats;
  dispose(): void;
}

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
  // ⚠ `place` 안이나 루프 안에서 만들지 마라. 풀 크기는 **작품 수와 무관**하게
  // `artLightPoolSize()` 가 정한다(조건 2).
  //
  // ⚠⚠ **`perParcel` 을 여기 넘기지 마라 — 그것이 조건 3 을 깨는 정확한 형태다.**
  // 첫 판본이 `artLightPoolSize(perParcel)` 였고, `art-light.ts:50-53` 이 *"풀 크기는 이
  // 값으로 줄이지 않는다"* 라고 적어 둔 바로 그 줄과 **정면으로 모순**이었다(검수관 블로커
  // B1). soft(1)를 넘기면 풀이 28 → **7** 로 줄어 세션마다 개수가 달라진다.
  //
  // 그때 이것을 «잰다» 던 단언은 `artLightPoolSize(4) === artLightPoolSize(4)` 라
  // **동어반복**이었고, 검수관이 코드를 조건 문언대로 고치는 뮤테이션을 넣자 **0 failed**
  // 였다(대조로 조건 1·2·4·5 는 각각 4·1·6·1 failed). 다섯 중 하나만 장식이었고
  // 나는 다섯 다 있다고 보고했다 — 축을 `tests/world2-artwork-scene.test.ts` 의
  // 「★ GS-C」로 옮겨 **두 세션의 라이트 수를 한 테스트에서 비교**하게 했다.
  const pool: ArtLight[] = [];
  const poolSize = artLightPoolSize(ART_LIGHT_PER_PARCEL);
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

  /** 액자 테두리 재질 — **전 작품이 공유한다**(재질 수를 상수로) */
  // 노브는 **세션당 한 번만** 읽는다 — `place()` 는 작품마다 도는 자리라 여기서
  // URL 을 파싱하면 걸 때마다 반복된다. 세션 중에 값이 바뀔 일도 없다(새로고침해야 한다).
  const artSpec = artMatSpec(deps.artEnv ?? readArtEnv());

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.45, metalness: 0.1,
  });
  const artMats: ArtMaterial[] = [];
  /** dispose 대상 지오메트리. `[7]` 이 보는 축이라 재질만 지우면 절반만 정리된다 */
  const artGeos: { dispose?(): void }[] = [];
  /**
   * 세운 액자 그룹. **전체 대체가 이것을 지운다**(W8-4 D1.6).
   *
   * 왜 `root.children` 을 훑지 않는가 — 거기에는 **라이트와 그 타깃도 섞여 있다**
   * (`root.add(L)`·`root.add(t)`). 통째로 비우면 풀이 씬에서 빠져 개수 불변식이 깨진다.
   * 액자만 따로 들고 있는 것이 그 사고를 구조로 막는 유일한 방법이다.
   */
  const frameGroups: ArtNode[] = [];
  let frames = 0;
  let lit = 0;
  let skipped = 0;
  let unpowered = 0;
  let texFailed = 0;
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
    for (const g of frameGroups) root.remove(g);
    frameGroups.length = 0;
    for (const m of artMats) m.dispose?.();
    artMats.length = 0;
    for (const geo of artGeos) geo.dispose?.();
    artGeos.length = 0;
    // ⚠ **텍스처는 여기서 안 지운다 — 캐시가 소유한다**(아래 `textureFor`).
    // 재질과 지오는 `place` 마다 새로 만들지만 텍스처는 그림 자체라 재사용이 옳고,
    // 그것이 이 회차에서 실측된 누수의 처방이다.
    for (const L of pool) L.intensity = 0;
    frames = 0; lit = 0; skipped = 0; unpowered = 0; texFailed = 0; next = 0;
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
      //
      // 예전에는 여기가 `MeshStandardMaterial` 이었고, 그래서 그늘진 벽에 건 사진이
      // 실제로 어두워졌다. 팀장 판정으로 **조명도 톤매핑도 안 받게** 바꿨다 —
      // 「주변환경」에 시간대 노출이 포함된다는 것이 그 판정의 요점이다.
      //
      // ⚠ **판정은 여기 없다.** 어느 재질인지는 `decide/art-material.ts` 가 정하고
      // (노브로 세 상태를 연다 — 감독이 밤 화면을 보고 고른다), 여기는 집행뿐이다.
      // (나) `emissiveMap` 을 왜 안 썼는지도 그 파일 헤더 한 곳이다.
      //
      // ⚠⚠ **테두리(`frameMat`)는 Standard 그대로다** — 감독이 "사진은" 이라고
      // 특정했고, 테두리까지 발광시키면 액자가 공간에서 붕 뜬다.
      //
      // 📊 **첫 작품 걸기 계단**(팀장 조건 4, 2026-08-18 헤드리스 실측). 작품 0→1:
      //   artenv=0  geo +2 · tex +1 · pipe **+2** · draw +2
      //   artenv=1  geo +2 · tex +1 · pipe +1 · draw +2
      //   artenv=2  geo +2 · tex +1 · pipe +1 · draw +2
      // `[8]` 하늘 예열이 잡았던 것과 **같은 부류**(`info.memory` 는 첫 렌더에 오른다)이고
      // 크기가 다르다 — 하늘은 세 축이 동시에 뛰었고 여기는 액자 한 개분이다. 예열을
      // 넣지 않은 것은 **팀장 판정 3**(*"계단을 재기 전의 예열은 추측 구현이다"*)이고,
      // 재고 나서도 이 크기면 별건을 열 근거가 안 된다. 라이브 작품은 아직 0개다.
      const MatCtor = artSpec.kind === 'basic'
        ? THREE.MeshBasicMaterial
        : THREE.MeshStandardMaterial;
      const mat = new MatCtor({
        ...(tex ? { map: tex } : {}),
        // `roughness`/`metalness` 는 Basic 이 무시한다 — 넘겨도 무해하고, 분기를 하나
        // 줄이는 편이 «어느 쪽에 무엇이 붙는지» 를 읽기 쉽게 한다.
        roughness: 0.85, metalness: 0,
        toneMapped: artSpec.toneMapped,
      });
      artMats.push(mat);
      const planeGeo = new THREE.PlaneGeometry(w, h);
      artGeos.push(planeGeo as { dispose?(): void });
      const plane = new THREE.Mesh(planeGeo, mat);
      // 테두리 판 **앞면**에 얹는다. 뒤에 두면 판에 가려 아무것도 안 보인다.
      plane.position.set(0, 0, FRAME_DEPTH / 2 + 0.002);
      g.add(plane);
      root.add(g);
      frameGroups.push(g);   // ⚠ 다음 `place` 가 이걸로 지운다(전체 대체)
      frames++;

      // 조명 — 배정받은 것만. **풀에서 꺼내 쓸 뿐 새로 만들지 않는다.**
      //
      // ⚠ 배정을 받았는데 슬롯이 없으면 `unpowered` 다. **조용히 넘어가지 않는다** —
      // 그것이 검수관 블로커 B3-1 의 형태였다(어두운 작품 52개가 아무 숫자에도 안 잡혔다).
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
      }

    }
  }

  return {
    place,
    stats: () => ({ lights: pool.length, frames, lit, skipped, unpowered, texFailed }),
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
 * @param resolve 계약의 `src` → 실제 URL. base 결합은 `asset-url.ts` 한 곳이 소유한다
 */
export function textureLoaderFor(
  THREE: unknown,
  resolve: (src: string) => string,
): ((src: string) => Promise<unknown | null>) | undefined {
  const TL = (THREE as { TextureLoader?: new () => { loadAsync(u: string): Promise<unknown> } })
    .TextureLoader;
  if (!TL) return undefined;
  const loader = new TL();
  return async (src: string) => {
    try { return await loader.loadAsync(resolve(src)); } catch { return null; }
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
): ArtworkScene {
  return createArtworkScene({
    THREE: THREE as ArtThreeNS,
    scene,
    cellX: layout.cellX,
    cellZ: layout.cellZ,
    perParcel,
    loadTexture: textureLoaderFor(THREE, resolve),
    // 캐시 키를 **실제 URL**로 잡는다 — 같은 `src` 에 새 `blob:` 이 붙으면(같은 파일명을
    // 다시 드롭) 키가 달라져 자동으로 다시 로드된다. `src` 를 키로 쓰면 낡은 그림이 남는다.
    texKey: resolve,
  });
}
