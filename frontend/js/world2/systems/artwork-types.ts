// world2/systems/artwork-types.ts — **액자 씬의 계약**(타입 + 룩 상수).
//
// ── 왜 갈라졌나 (W8-9) ────────────────────────────────────────────────────
// `artwork-scene.ts` 가 파일 크기 상한(532줄)에 부딪혔다. 감독 지시 2026-08-16 —
// *"파일사이즈 폭주 안되고 모듈 관리 잘되게"*. 「거는 일」과 「계약」은 바뀌는 이유가
// 다르다: 계약은 소비자(오버레이·편집·테스트)가 읽고, 집행은 three 를 만진다.
//
// ⚠ **소비자 경로는 안 바뀐다** — `artwork-scene.ts` 가 전부 재수출한다(배럴 패턴,
// `ARCHITECTURE.md §2`). 여기를 직접 import 하지 마라. 한쪽만 고치면 두 경로가 갈린다.
//
// ⚠ **여기에 산술을 적지 마라.** 판정은 `decide/artwork.ts`·`decide/art-light.ts`·
// `decide/art-material.ts` 소유다. 여기 있는 상수 넷은 **룩**이지 판정이 아니다.

import type { ArtworkItem } from '../decide/artwork.js';

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
  /**
   * 화면에 그릴 것인가 (W8-9). **액자 그룹에만 쓴다 — 라이트에는 절대 쓰지 마라.**
   *
   * three 는 라이트 목록이 바뀌면 셰이더를 **재컴파일**하고, 그것이 곧 파이프라인
   * 증식이다(`[7]` 이 보는 바로 그 축). 라이트를 끄는 유일한 수단은 `intensity = 0`
   * 이고 그것은 `clearPlaced` 가 이미 쓰는 길이다.
   */
  visible: boolean;
}

export interface ArtMaterial {
  map?: unknown; toneMapped?: boolean; fog?: boolean; dispose?(): void;
}

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
  /** 부팅 시점 작품 목록 — **풀 크기 유도에만.** 생략 = 격자 상한(편집). 근거: `art-light.ts` */
  readonly arts?: readonly { readonly x: number; readonly z: number }[];
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
  /**
   * **지금 화면에 내놓은** 액자 수 (W8-9). `frames` 중 파셀이 로드된 것들이다.
   *
   * ⚠⚠ **`frames` 와 갈라 둔 것이 요점이다.** `frames` 는 개수 불변식 `[7]` 의 **예산
   * 분모**다(`invariant-judge.mjs` 의 `artCount × ART_GEO_EACH`). 그 의미를 「보이는
   * 수」로 바꾸면 재워둔 회차에서 분모가 0 이 되고 **기존 계단조차 예산 초과 FAIL** 이
   * 된다. `frames` 는 «놓은 개수» 로 영원히 남는다.
   */
  readonly shown: number;
}

export interface ArtworkScene {
  place(arts: readonly ArtworkItem[]): Promise<void>;
  /**
   * **건물과 생사를 맞춘다** (W8-9). 감독 지시 2026-08-18:
   * *"멀리떨어졌을때 건물이 사라질때 같이 사라지고 나왔으면해"*.
   *
   * `loaded(px, pz)` 는 «스트리밍이 그 파셀을 지금 들고 있는가» 다 — 액자는 거리를
   * **안 잰다.** 왜 그런지는 `decide/art-light.ts` 의 `artParcelXZ` 헤더 한 곳이다.
   *
   * 프레임마다 불린다. 할당 0 이고 상태가 **변할 때만** 대입한다.
   */
  update(loaded: (px: number, pz: number) => boolean): void;
  stats(): ArtworkStats;
  dispose(): void;
}
