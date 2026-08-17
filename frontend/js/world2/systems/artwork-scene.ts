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

/** 이 파일이 쓰는 three 표면. **필요한 것만** — 넓히면 스텁이 실물과 멀어진다 */
export interface ArtThreeNS {
  Group: new () => ArtNode;
  Mesh: new (geo: unknown, mat: unknown) => ArtNode;
  BoxGeometry: new (w: number, h: number, d: number) => unknown;
  PlaneGeometry: new (w: number, h: number) => unknown;
  MeshStandardMaterial: new (o: Record<string, unknown>) => ArtMaterial;
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

export interface ArtMaterial { map?: unknown; dispose?(): void }

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
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.45, metalness: 0.1,
  });
  const artMats: ArtMaterial[] = [];
  /** dispose 대상 지오메트리. `[7]` 이 보는 축이라 재질만 지우면 절반만 정리된다 */
  const artGeos: { dispose?(): void }[] = [];
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

  async function place(arts: readonly ArtworkItem[]): Promise<void> {
    if (disposed) return;
    const plan = assignArtLights(arts, perParcel, cellX, cellZ);
    skipped += plan.skipped;

    for (let i = 0; i < arts.length; i++) {
      if (disposed) return;
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
      let tex: unknown = null;
      if (deps.loadTexture) {
        try {
          tex = await deps.loadTexture(a.src);
          if (disposed) return;
          if (!tex) texFailed++;
        } catch { texFailed++; }
      }
      const mat = new THREE.MeshStandardMaterial({
        ...(tex ? { map: tex } : {}), roughness: 0.85, metalness: 0,
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
  });
}
