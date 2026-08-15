// world2/features/surface-paint.ts — 표면 재질(심리스 텍스처) **집행**.
//
// 감독 지시 2026-08-14: *"땅의 텍스쳐 심리스를 주면 그대로 적용할수있게 … 타일링 배율로
// 촘촘히 힐것인지 조절하고 각도 조절하고"* / *"디퓨저맵. 노말맵. 하이라이트. 메탈릭.
// 러프니스 조절하게 하자"*
//
// 판정은 `decide/surface-material.ts` 에 있고 여기는 그 명세를 three 재질에 꽂을 뿐이다.
//
// ── 이 파일이 지키는 것 둘 ──────────────────────────────────────────────────
//
// **① 텍스처를 갈아 끼울 때 옛 것을 반드시 회수한다.**
// 조사 실측(2026-08-14): `features/overlay.ts:271-277` 의 `remove()` 는 `dispose()` 가
// **0건**이고 「갈아 끼우기」 경로 자체가 없었다. 그대로 얹으면 교체할 때마다
// `info.memory.textures` 가 **단조증가**한다. 그리고 ②가 겹치면 아무도 못 본다.
//
// **② 그 증가를 보는 게이트가 지금 없다.**
// `[7]` 개수 불변식은 `?edit=1` 을 **안 연다** — `measure-invariants.mjs:342` 가
// `WORLD2_QUERY = '?time=day&weather=clear'` 를 쓰고 편집 페이지는 `LIVE_PAGES` 항목이라
// 로드 시점 검사만 받는다(`config.mjs:221`). 즉 **편집 중 텍스처 증가를 보는 축이 0개다.**
// 그래서 `diagnostics().owned` 를 내고 그 축을 이 회차에 새로 만든다 — 기능만 넣고 미루면
// 조용히 새는 자리가 된다.
//
// ── 되돌리기의 근거는 코드가 아니라 스냅샷이다 ──────────────────────────────
// 감독이 텍스처를 걷으면 지금 화면으로 돌아가야 한다. 「원래 화면」이 무엇인지 코드에 다시
// 적으면 파츠가 값을 바꿀 때 두 곳이 갈라진다(값 미러링) — 그래서 부팅 시점의 실제 재질
// 상태를 `Baseline` 으로 뜬다.
//
// ── ⚠ 1×1 흰 프리셋을 **안 꽂는다** — 첫 계획을 실측이 뒤집었다 ─────────────
// 계획서(2026-08-14)는 무텍스처 파츠에 부팅 시 흰 텍스처를 미리 꽂아 두면 이후 교체가
// 재컴파일 없이 끝난다고 적었다. 그 전제는 맞다(아래 실측 ⓐ). **그런데 대가를 안 셌다.**
//
//   ⓐ `MaterialNode.js:75` — `if (material.map && material.map.isTexture) node = color.mul(…)`.
//      슬롯 **유무가 노드 그래프 구조**다. `null → Texture` 는 그 재질을 재컴파일한다.
//   ⓑ 그런데 꽂아 두면 그 샘플링이 **영구히 셰이더에 남는다.** 맵 슬롯 넷을 다 예약하면
//      땅·잔디처럼 화면을 크게 덮는 재질이 픽셀마다 텍스처 페치를 4회 한다 — **텍스처를
//      한 장도 안 쓰는 방문자 전원이** 그 비용을 낸다.
//   ⓒ 재컴파일은 **감독이 편집 중 처음 얹을 때 한 번**이다. 방문자 세션은 부팅에 오버레이
//      설정을 그대로 받으므로 첫 프레임 전에 끝나 재컴파일 자체가 없다.
//
// 상시 비용을 전원이 내는 것과 1회 히칭을 편집자 한 명이 내는 것 중 후자를 고른다.
// **여기서 멈춘다** — 히칭이 감독 체감으로 문제가 되면 그때 「쓰는 슬롯만 예약」으로 되돌린다
// (슬롯 넷 전부가 아니라). 그 재론 조건을 안 적으면 다음 사람이 같은 고리를 또 돈다.
//
// ── ⚠ `needsUpdate` 를 변환 변경에 세우지 않는다 (실측) ──────────────────────
// `Texture.js:293-300` 의 setter 는 `version++` **그리고 `source.needsUpdate = true`** —
// **이미지 재업로드**다. 배율·각도만 바꿀 때 세우면 슬라이더를 움직일 때마다 텍스처를 GPU 로
// 다시 올린다(4K 면 그대로 히칭이다).
// 안 세워도 반영된다: `TextureNode.js:42` 가 생성자에서 `setUpdateMatrix(uvNode === null)` 로
// **자동 배선된 맵은 항상 true** 이고, `:417-427` 의 `update()` 가 `matrixAutoUpdate` 면
// 매 프레임 `texture.updateMatrix()` 를 부른다. 즉 `repeat`/`rotation`/`center` 는 다음
// 프레임에 저절로 들어간다.
//
// ── 이 환경이 못 재는 것 ────────────────────────────────────────────────────
// 헤드리스는 코어 `WebGLRenderer`(swiftshader)라 실기기 룩을 못 본다. 「무늬가 이어지는가」
// 「배율이 적당한가」는 **감독 실기기가 유일한 판정**이고, 게이트 통과를 그 근거로 쓰지 않는다.

import * as THREE_NS from 'three/webgpu';
import {
  SURFACE_KINDS, UV_CENTER, isWorldUv, turnsToRadians,
  type SurfaceKind, type SurfaceSetting,
} from '../decide/surface-material.js';
import type { ThreeNS } from '../parts/types.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

// `three/webgpu` 는 재수출 체인이 깊어 코어 재질 타입이 안 잡힌다(TS2724). 근거와 대안은
// `features/shading.ts` 헤더 한 곳이다 — 여기에 다시 적지 않는다.
const THREE = THREE_NS as unknown as ThreeNS;

/**
 * 집행 대상 — `SURFACE_KINDS` **전부**.
 *
 * ⚠ 이 상수는 한때 `.filter((k) => !isWorldUv(k))` 로 물을 빼고 있었다. 그때는 물 재질에
 * 닿을 문이 없었기 때문이고(파츠 풀 밖이라 `pools.materialOf` 가 못 찾는다), 지금은
 * 조립부 레지스트리가 그 문이다(`env.surfaceMaterial` — 팀장 판정 2026-08-15).
 *
 * **그래서 여기서 물을 가르지 않는다.** 「칠할 수 있는가」는 `SURFACE_KINDS` 가 이미
 * 판정했고(수면은 거기서 빠진다 — `PAINTABLE_WATER` 주석), 집행이 그것을 또 거르면 판정이
 * 두 곳이 된다. 재질이 실제로 없는 종류는 아래 `snapshot` 이 `null` 로 조용히 건너뛴다.
 */
const PAINT_TARGETS: readonly SurfaceKind[] = SURFACE_KINDS as readonly SurfaceKind[];

/**
 * 우리가 만지는 재질에서 실제로 읽고 쓰는 것만.
 *
 * ⚠ **`materialOf` 의 규약을 이 기능이 의도적으로 넘는다.** 그 주석(`instancing.ts:194-198`)은
 * *"`map` 같은 **구조 신호는 절대 바꾸지 않는다**"* 라고 적고 있고, 그것은 **세션 중 매
 * 프레임 만지는 소비자**(밤 가로등 `emissiveIntensity`)를 두고 쓴 문장이다. 이 기능은
 * 감독이 슬라이더를 놓는 **드문 1회**에만 슬롯을 바꾸고, 그때 재컴파일이 나는 것을 알고
 * 낸다(헤더 ⓒ). 규약을 몰라서 넘은 것이 아니라는 것을 여기 적어 둔다 — 다음 사람이 이
 * 파일을 근거로 「구조 신호를 만져도 된다」로 읽으면 안 된다.
 */
interface PaintTarget {
  map?: unknown;
  normalMap?: unknown;
  metalnessMap?: unknown;
  roughnessMap?: unknown;
  metalness?: number;
  roughness?: number;
  needsUpdate?: boolean;
}

/** three 텍스처에서 우리가 쓰는 것만 */
interface TexLike {
  repeat: { set(x: number, y: number): void };
  center: { set(x: number, y: number): void };
  rotation: number;
  wrapS: number;
  wrapT: number;
  colorSpace: string;
  needsUpdate: boolean;
  dispose(): void;
}

/** 맵 슬롯 넷. **한 곳에서만 적는다** — 늘리면 여기만 고치면 된다 */
const MAP_SLOTS = ['map', 'normalMap', 'metalnessMap', 'roughnessMap'] as const;
type MapSlot = (typeof MAP_SLOTS)[number];

/**
 * 부팅 시점의 재질 상태. **되돌리기의 유일한 근거다.**
 *
 * `original` 에 담기는 것은 **파츠가 만든 텍스처**(도로 아스팔트·잔디 노이즈 등)이고
 * 우리 것이 아니다 — 그래서 절대 `dispose` 하지 않는다. 회수 대상은 `owned` 뿐이다.
 */
interface Baseline {
  readonly metalness: number;
  readonly roughness: number;
  readonly original: Partial<Record<MapSlot, unknown>>;
}

/** 우리가 만든 텍스처 하나. `src` 를 함께 들고 있어야 «같은 그림인가» 를 판정한다 */
interface Owned {
  readonly src: string;
  readonly tex: TexLike;
}

export const surfacePaintFeature: Feature = {
  name: 'surface',
  create(env: FeatureEnv): FeatureInstance | null {
    /** 종류별 부팅 스냅샷. `PAINT_TARGETS` 중 재질이 실재하는 것만 담긴다 */
    const base = new Map<SurfaceKind, Baseline>();
    /**
     * **우리가 만든 텍스처만.** 회수 대상의 유일한 근거다 — 파츠가 만든 것을 여기 넣으면
     * 세션 중에 남의 것을 dispose 한다. 키는 `종류:슬롯`.
     */
    const owned = new Map<string, Owned>();
    /** 마지막으로 반영한 설정. 참조가 같으면 아무것도 안 한다 */
    let applied: readonly SurfaceSetting[] = [];

    /**
     * ⚠ **`env.pools` 를 직접 안 본다.** 조립부가 파츠 풀과 레지스트리를 합쳐 답하므로,
     * 이 기능은 «이게 파츠인가 물인가» 를 모른다 — 그 구분이 여기 새면 표면이 늘 때마다
     * 분기가 하나씩 는다(팀장 판정 2026-08-15).
     */
    function materialOf(kind: SurfaceKind): PaintTarget | null {
      return (env.surfaceMaterial(kind) ?? null) as PaintTarget | null;
    }

    /**
     * 그 종류의 부팅 스냅샷. **없으면 지금 뜬다.**
     *
     * ⚠ **이 지연이 검수관 블로커 B1 의 해소다**(2026-08-15). 그전에는 `create()` 의 부팅
     * 루프가 `base` 의 **유일한** 기록 지점이었고, `applyOne`/`reset` 은 `base` 가 비면 즉시
     * 반환했다. 즉 그 시점에 재질이 아직 없던 표면(늦게 등록되는 물 같은 것)은 «다음 프레임에
     * 폴링이 잡는다» 가 아니라 **세션 전체에서 영구히** 칠할 수도 되돌릴 수도 없었다.
     *
     * 지금 동작하는 이유가 `FEATURES` 배열 순서가 우연히 맞아서(ocean 이 surface 보다 앞)
     * 라는 것이 문제였다 — `FeatureEnv.registerSurfaceMaterial` 주석이 그 순서 의존을
     * 모르는 사람에게 «안전망이 있다» 고 약속하고 있었다. 주석을 약하게 고치는 대신 **그
     * 문장이 참이 되게** 만든다(GS-3 전례와 같은 처방).
     *
     * **늦게 떠도 안전한 이유**: `base` 가 비어 있다는 것은 우리가 그 표면을 **한 번도 안
     * 만졌다**는 뜻이다(만지려면 `base` 가 있어야 한다). 그러니 지금 뜨는 상태가 곧 원래
     * 상태다 — 우리 텍스처를 «원래» 로 오인할 경로가 없다.
     */
    function baseOf(kind: SurfaceKind): Baseline | null {
      const hit = base.get(kind);
      if (hit) return hit;
      const snap = snapshot(kind);
      if (snap) base.set(kind, snap);
      return snap;
    }

    function snapshot(kind: SurfaceKind): Baseline | null {
      const m = materialOf(kind);
      if (!m) return null;
      const original: Partial<Record<MapSlot, unknown>> = {};
      for (const s of MAP_SLOTS) original[s] = m[s] ?? null;
      return { metalness: m.metalness ?? 0, roughness: m.roughness ?? 1, original };
    }

    /**
     * 이미지를 텍스처로. **로드는 비동기이고 실패하면 조용히 검게 남는다.**
     *
     * 로드 실패를 화면이 어떻게 말할 것인가는 **UI 단계(다음)의 판정**이다 — 여기서 정하면
     * 감독이 못 본 채로 규약이 굳는다. `decide/surface-material.ts` 의 `isSafeTextureSrc` 를
     * 이미 통과한 경로만 오므로 실패는 «커밋된 파일이 실제로 없다» 뿐이다.
     *
     * ⚠ **주소는 `env.textureUrl` 이 만든다** — 여기서 `src` 를 그대로 넣지 않는다. 그 함수가
     * base 결합(`asset-url.ts`)과 **드롭 미리보기**(감독이 방금 떨어뜨렸고 아직 커밋 안 된
     * 파일 → `blob:`)를 한 자리에서 흡수한다. 상대 경로를 그대로 써도 대개는 맞아서 빠뜨리기
     * 쉬운 자리이고, 로컬에서는 되고 base 가 붙은 배포에서만 깨진다.
     *
     * ⚠⚠ **`map` 만 sRGB 다.** 노말·메탈릭·러프니스는 색이 아니라 수치라 선형으로 읽어야
     * 한다 — sRGB 로 읽으면 굴곡과 광택이 전부 어긋나고, 증상이 «텍스처가 좀 이상하다» 라
     * 원인을 짚기 어렵다(`parts/garden.ts:210` 이 색 텍스처에만 sRGB 를 세우는 것과 같은 규약).
     */
    function load(src: string, slot: MapSlot): TexLike {
      const img = new Image();
      const tex = new THREE.Texture(img) as unknown as TexLike;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      if (slot === 'map') tex.colorSpace = THREE.SRGBColorSpace;
      img.onload = () => { tex.needsUpdate = true; };
      img.src = env.textureUrl(src);
      return tex;
    }

    /**
     * 텍스처 변환(배율·회전)을 세운다.
     *
     * ⚠ `center` 를 `(0.5, 0.5)` 로 세우는 것이 요점이다 — three 기본은 `(0,0)` 이라
     * UV 좌하단을 축으로 돌고, 배율을 함께 만지면 무늬가 크게 밀린다. 근거는
     * `decide/surface-material.ts` 의 `UV_CENTER` 주석 한 곳이다.
     *
     * ⚠⚠ **`needsUpdate` 를 세우지 않는다.** 이유는 헤더 실측 절 한 곳이다.
     */
    function setTransform(t: TexLike, s: SurfaceSetting): void {
      t.repeat.set(s.repeat, s.repeat);
      t.center.set(UV_CENTER, UV_CENTER);
      t.rotation = turnsToRadians(s.turns);
    }

    /** 우리가 그 슬롯에 들고 있던 것을 회수한다. 없으면 아무 일도 안 한다 */
    function release(key: string): void {
      const prev = owned.get(key);
      if (!prev) return;
      prev.tex.dispose();
      owned.delete(key);
    }

    /**
     * 한 표면에 설정을 반영한다.
     *
     * ⚠ **슬롯 구성이 바뀐 경우에만 `needsUpdate` 를 세운다.** 같은 슬롯에 다른 그림을
     * 꽂는 것은 노드 그래프가 그대로라 재컴파일이 필요 없다(헤더 ⓐ) — 매번 세우면 슬라이더를
     * 만질 때마다 그 재질이 다시 컴파일된다.
     */
    function applyOne(s: SurfaceSetting): void {
      const m = materialOf(s.kind);
      const b = baseOf(s.kind);
      if (!m || !b) return;

      let structural = false;
      for (const slot of MAP_SLOTS) {
        const key = `${s.kind}:${slot}`;
        const src = s[slot];
        const prev = owned.get(key);

        if (src === undefined) {
          // 이 슬롯이 걷혔다 — 우리 것을 회수하고 부팅 상태로 되돌린다.
          // `||=` 다 — 앞 슬롯이 세운 값을 뒤 슬롯이 덮으면 안 된다(검수관 P1). 아래 두
          // 자리는 `= true` 인데 여기만 대입이라 형태가 어긋나 있었다.
          if (prev) { release(key); structural ||= m[slot] !== b.original[slot]; }
          m[slot] = b.original[slot] ?? null;
          continue;
        }
        if (prev && prev.src === src) { setTransform(prev.tex, s); continue; }

        // 갈아 끼우기 — **여기가 ①의 집행 지점이다.** 옛 것을 먼저 회수한다.
        release(key);
        const tex = load(src, slot);
        setTransform(tex, s);
        owned.set(key, { src, tex });
        if (!m[slot]) structural = true; // 없던 슬롯이 생긴다 = 그래프가 바뀐다
        m[slot] = tex;
      }

      m.metalness = s.metalness;
      m.roughness = s.roughness;
      if (structural) m.needsUpdate = true;
    }

    /** 그 종류를 부팅 상태로 완전히 되돌린다. **우리가 만든 것만 회수한다** */
    function reset(kind: SurfaceKind): void {
      const m = materialOf(kind);
      const b = baseOf(kind);
      if (!m || !b) return;
      let structural = false;
      for (const slot of MAP_SLOTS) {
        const key = `${kind}:${slot}`;
        if (owned.has(key)) { release(key); structural = true; }
        m[slot] = b.original[slot] ?? null;
      }
      m.metalness = b.metalness;
      m.roughness = b.roughness;
      if (structural) m.needsUpdate = true;
    }

    // ── 부팅 ────────────────────────────────────────────────────────────────
    // 부팅에 뜰 수 있는 것은 지금 뜬다. **못 뜬 것은 `baseOf` 가 나중에 뜬다** — 그것이
    // 위 B1 해소의 요점이고, 이 루프가 유일한 기록 지점이 아니게 된 이유다.
    for (const kind of PAINT_TARGETS) baseOf(kind);
    applied = env.surfaces();
    for (const s of applied) applyOne(s);

    return {
      system: {
        name: 'surface',
        update() {
          const want = env.surfaces();
          if (want === applied) return; // 참조가 같으면 아무것도 안 바뀌었다
          // **목록에서 통째로 빠진 표면은 되돌린다.** 이것이 없으면 감독이 한 표면의 설정을
          // 지웠을 때 화면에만 남고, 내보낸 JSON 과 화면이 갈린다.
          const now = new Set(want.map((s) => s.kind));
          for (const s of applied) if (!now.has(s.kind)) reset(s.kind);
          applied = want;
          for (const s of want) applyOne(s);
        },
      },

      diagnostics: () => ({
        surfaces: applied.length,
        // **우리가 들고 있는 텍스처 수.** 회수가 서 있으면 교체해도 안 는다 —
        // 편집 세션 개수 축이 이 값을 읽는다.
        owned: owned.size,
      }),

      dispose() {
        for (const kind of base.keys()) reset(kind);
        for (const o of owned.values()) o.tex.dispose();
        owned.clear();
      },
    };
  },
};
