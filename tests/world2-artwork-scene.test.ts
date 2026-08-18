// @vitest-environment node
//
// **액자·조명 씬** — 집행 (W8-4 C). three 를 **주입받으므로 실제로 돌린다.**
//
// ── 이 파일이 잴 수 있는 것 / 없는 것 ─────────────────────────────────────
// | 팀장 조건 | 여기서 |
// |---|---|
// | 1 개수 불변 절대 | ★ **잰다** — `place` 전/후 라이트 수, 작품을 늘려도 상수인지 |
// | 2 풀 크기 유도 | 순수 쪽(`world2-art-light.test.ts`)이 잰다 |
// | 3 soft 완화 | ★ **잰다 (GS-C)** — 두 세션을 **한 테스트에서** 비교한다 |
// | 4 초과는 라이트 없이 | ★ **잰다** — 액자는 서고 라이트만 안 붙는지 |
// | 5 castShadow=false | ★ **잰다** — 풀 전체를 훑는다 |
// | 6 WebGPU 판정 유보 | ✗ 원리적으로 못 잰다 |
//
// ⚠ **조건 3 행은 오래 거짓이었다**(검수관 블로커 B1, 2026-08-17). 「★ 잰다」라고 적어
// 놓고 실제로는 `perParcel: 1` 세션 **하나만** 만든 뒤 *"풀은 `perParcel` 을 따라 잡히므로
// soft 세션의 풀은 작다"* 라고 **조건 위반을 정상으로 서술**하고 있었다. 순수 쪽의 짝
// 단언은 동어반복이었고, 코드를 조건 문언대로 고치는 뮤테이션에서 **0 failed** 였다.
// 검사표에 대한 거짓 진술은 다음 사람이 확인을 생략하게 만든다 — 이 저장소가 GS-3 을
// 만든 그 형태다. GS-C 로 축을 만들어 문장을 참으로 되돌렸다.
//
// ── 2026-08-18 — 상수가 바뀌자 세 테스트가 깨졌고, **전제를 명시 주입으로 고쳤다** ──
// `ART_LIGHT_PER_PARCEL` 이 4 → 1 로 내려가 GS-C 1건·GS-D 2건이 FAIL 했다. 셋 다
// **목적이 아니라 전제**가 깨진 것이었다 — 「3개가 켜진다」·「2개가 켜진다」는 목적이
// 아니라 기본 상수에 기댄 값이었다(값 미러링). `perParcel` 을 명시 주입해 상수 의존만
// 끊었고 단언은 그대로 뒀다.
//
// ⚠ **테스트를 고쳐 통과시킨 것이 아님을 재서 확인했다** — 이 저장소는 위임 프롬프트에
// *"테스트를 느슨하게 만들지 말 것"* 을 빠뜨려 산술 단언이 전부 null 기대로 바뀐 채 CI 를
// 통과한 전례가 있다. 뮤테이션(`npx vitest run tests/world2-artwork-scene.test.ts`):
//
//   심은 것                                          failed
//   `assignArtLights` 의 cap 무시                        4   ← GS-C 포함
//   `clearPlaced` 가 라이트를 안 끔                       1   ← GS-D
//   `next` 리셋 제거                                    1   ← GS-D
//   **주석 한 줄만 변경(등가 대조군)**                     0
//
// 🔴 **이 표에 다섯째 줄이 있었고 그것은 거짓이었다** (검수관 블로커, 같은 날).
// *"`ART_LIGHT_PER_PARCEL_SOFT` 1 → 2 … 1 failed ← 새 실물 상수 테스트"* 라고 적혀
// 있었는데, **이 파일은 그 뮤테이션을 못 잡는다** — 검수관 재현: 이 파일만 돌리면
// `38 passed · 0 failed` 다. `ART_LIGHT_PER_PARCEL_SOFT` 를 import 만 하고 어떤
// `expect` 에도 안 쓴다. 그 축을 지키는 것은 **`tests/world2-art-light.test.ts`** 다.
//
// **왜 났나**: 표를 쓸 때는 실물 상수 단언이 이 파일에 있었다. 그 직후 «같은 단언이 두
// 파일에 있다» 는 중복을 발견해 `art-light.test.ts` 한 곳으로 옮겼는데, **표는 안 따라
// 고쳤다.** 구조를 바꾸고 그것을 서술한 문장을 안 고친 것이다 — 이 저장소가 반복해서
// 이름 붙인 진술-실물 불일치이고, 이 표가 특히 나쁜 이유는 **다음 사람에게 「이 파일만
// 돌리면 SOFT 역전을 잡는다」고 말하기 때문**이다. 표를 고치는 것보다 **표를 만드는
// 순간과 구조를 바꾸는 순간 사이를 의심하는 것**이 처방이다.
//
// ⚠ **스텁이 실물의 핵심 성질을 갖는가**가 이 검사의 전제다. 그래서 스텁은 «만들어진
// 개수를 센다» — 실물 three 의 관찰 가능한 성질 중 `[7]` 이 보는 바로 그것이다.

import { describe, it, expect } from 'vitest';
import {
  createArtworkScene, mountArtworks, textureLoaderFor, LIGHT_ON,
  type ArtThreeNS, type ArtNode,
} from '../frontend/js/world2/systems/artwork-scene.js';
import {
  artLightPoolSize, ART_LIGHT_PER_PARCEL, ART_LIGHT_PER_PARCEL_SOFT, artParcelXZ, assignArtLights,
} from '../frontend/js/world2/decide/art-light.js';
import type { ArtworkItem } from '../frontend/js/world2/decide/artwork.js';

const CELL = 32;

/**
 * 만들어진 개수를 센다 — `[7]` 개수 불변식이 보는 축과 같은 것.
 *
 * `geoDisposed`·`matDisposed` 는 **정리를 재기 위한 것**이다(검수관 P6). 첫 판본은
 * 지오메트리 스텁에 `dispose` 자체가 없어서 «안 지운다» 와 «지울 것이 없다» 가 구별되지
 * 않았다 — 대역이 실물의 성질을 안 가지면 그 축은 검출력이 0이다.
 */
interface Counts {
  geo: number; mat: number; light: number; mesh: number;
  geoDisposed: number; matDisposed: number;
  /** `mat` 의 **내역**(W8-7). 합만 보면 그림과 테두리가 뒤바뀌어도 통과한다 */
  matStd: number; matBasic: number;
}

function makeThree(): { THREE: ArtThreeNS; scene: ArtNode; counts: Counts; sceneKids: ArtNode[] } {
  const counts: Counts = {
    geo: 0, mat: 0, matStd: 0, matBasic: 0, light: 0, mesh: 0, geoDisposed: 0, matDisposed: 0,
  };
  const node = (): ArtNode => {
    const kids: ArtNode[] = [];
    return {
      position: { set() { } },
      rotation: { y: 0 },
      children: kids,
      // W8-9 — 액자 가시성 축. 스텁이 이 필드를 안 가지면 `update()` 의 대입이
      // 아무 데도 안 남아 검사가 **구조적으로 0** 이 된다.
      visible: true,
      add(o: ArtNode) { kids.push(o); },
      remove(o: ArtNode) { const i = kids.indexOf(o); if (i >= 0) kids.splice(i, 1); },
    };
  };
  const THREE = {
    Group: class { constructor() { return node(); } },
    Object3D: class { constructor() { return node(); } },
    Mesh: class { constructor() { counts.mesh++; return node(); } },
    BoxGeometry: class { constructor() { counts.geo++; } dispose() { counts.geoDisposed++; } },
    PlaneGeometry: class { constructor() { counts.geo++; } dispose() { counts.geoDisposed++; } },
    // ⚠ **재질 종류를 갈라 센다**(W8-7). `counts.mat` 은 합이라 기존 검사가 그대로
    // 성립하고, `matStd`/`matBasic` 을 읽는 단언은 **아래 「내역이 갈린다」 검사**에
    // 있다 — 합만 보면 그림과 테두리가 뒤바뀌어도 통과한다.
    //
    // ⚠⚠ 첫 판본은 여기에 *"…를 잰다"* 라고 적어 놓고 **읽는 `expect` 를 안 붙였다**
    // (검수관 B2). 세는 것과 재는 것은 다른 일이다.
    MeshStandardMaterial: class {
      toneMapped = true;
      constructor(o?: Record<string, unknown>) {
        counts.mat++; counts.matStd++;
        if (o && 'toneMapped' in o) this.toneMapped = o.toneMapped as boolean;
      }
      dispose() { counts.matDisposed++; }
    },
    MeshBasicMaterial: class {
      toneMapped = true;
      constructor(o?: Record<string, unknown>) {
        counts.mat++; counts.matBasic++;
        if (o && 'toneMapped' in o) this.toneMapped = o.toneMapped as boolean;
      }
      dispose() { counts.matDisposed++; }
    },
    // ⚠ **`visible` 을 접근자로 둔다**(W8-9). 그전에는 스텁이 이 필드를 아예 안 만들어
    // «`undefined` 인가» 로 「안 만졌다」를 판정했는데, 액자 가시성 축이 열리면서
    // `ArtNode` 가 `visible` 을 **필수**로 갖게 됐다 — 기본값이 생기면 그 판정 수단이
    // 통째로 무효가 된다(값이 있는 것과 대입한 것을 구별 못 한다).
    // 그래서 **대입 횟수**를 센다. 이쪽이 원래 재려던 것에 더 가깝다.
    SpotLight: class {
      intensity = 0; angle = 0; penumbra = 0; distance = 0; castShadow = false;
      target = node();
      visSets = 0;
      private vis = true;
      get visible(): boolean { return this.vis; }
      set visible(v: boolean) { this.vis = v; this.visSets++; }
      constructor(_c?: number, i?: number) {
        counts.light++; this.intensity = i ?? 0; Object.assign(this, node());
        // `Object.assign` 이 `node()` 의 `visible: true` 를 setter 로 흘려보낸다 —
        // 그것은 스텁 조립이지 제품 코드의 대입이 아니므로 여기서 0 으로 되돌린다.
        this.visSets = 0;
      }
    },
  } as unknown as ArtThreeNS;
  const scene = node();
  return { THREE, scene, counts, sceneKids: scene.children! };
}

/**
 * 재질 생성 인자를 엿본다. ⚠ **두 재질을 다 가로챈다**(W8-7) — 그림은 `MeshBasicMaterial`,
 * 테두리는 `MeshStandardMaterial` 이라 한쪽만 감싸면 **재질 종류가 바뀌는 순간 축이
 * 조용히 빈다.** 여기서 재는 것은 「어느 재질인가」가 아니라 「생성 **인자**에 텍스처가
 * 들어가는가」이므로 종류와 무관해야 한다.
 */
function spyMaterials(THREE: ArtThreeNS, seen: Record<string, unknown>[]): void {
  const box = THREE as unknown as Record<string, unknown>;
  for (const key of ['MeshStandardMaterial', 'MeshBasicMaterial']) {
    const Base = box[key] as new (o: Record<string, unknown>) => unknown;
    box[key] = class {
      constructor(o: Record<string, unknown>) { seen.push(o); return new Base(o) as object; }
    };
  }
}

const art = (over: Partial<ArtworkItem> = {}): ArtworkItem => ({
  src: 'assets/art/a.png', x: 0, y: 3, z: 0, ry: 0, w: 2.4, ar: 1.2, ...over,
});

/** 풀 안의 라이트를 전부 꺼낸다 — 씬 트리를 실제로 훑는다 */
/**
 * 씬 루트(`world2:artwork` 그룹)의 자식 수. **`stats()` 를 안 믿고 씬을 직접 보는 축**이다.
 *
 * 카운터가 리셋되면 `stats()` 는 옳은 값을 내므로, 「액자를 안 지웠다」 같은 결함이
 * `stats` 만 보는 단언을 전부 통과한다(뮤테이션으로 실측). 라이트·타깃도 여기 자식이라
 * **기준선을 빼고** 델타를 본다.
 */
function rootKids(scene: ArtNode): number {
  return scene.children?.[0]?.children?.length ?? -1;
}

function lightsOf(root: ArtNode): { castShadow: boolean; intensity: number }[] {
  const out: { castShadow: boolean; intensity: number }[] = [];
  const walk = (n: ArtNode) => {
    if (typeof (n as { castShadow?: boolean }).castShadow === 'boolean') {
      out.push(n as unknown as { castShadow: boolean; intensity: number });
    }
    for (const k of n.children ?? []) walk(k);
  };
  walk(root);
  return out;
}

describe('★ 조건 1 — 라이트 개수는 세션 중 절대 안 변한다', () => {
  it('★ 부팅에 풀 전체를 만든다 — 작품이 0개여도', () => {
    const { THREE, scene, counts } = makeThree();
    createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    expect(counts.light, '★ 라이트를 부팅에 안 만든다 — 나중에 만들면 개수가 변한다')
      .toBe(artLightPoolSize());
  });

  it('★ 작품을 놓아도 라이트가 **한 개도 안 는다**', async () => {
    const { THREE, scene, counts } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    const before = counts.light;
    await s.place(Array.from({ length: 12 }, (_, i) => art({ x: i * 40 })));
    expect(counts.light, '★ 세션 중 라이트가 늘었다 — [7] 개수 불변식 위반').toBe(before);
    expect(s.stats().lights).toBe(before);
  });

  it('★ 작품 수를 두 배로 해도 라이트 수는 같다 — 「작품 수 가변」과 충돌하지 않는다', async () => {
    const mk = async (n: number) => {
      const { THREE, scene, counts } = makeThree();
      const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
      await s.place(Array.from({ length: n }, (_, i) => art({ x: i * 40 })));
      return counts.light;
    };
    expect(await mk(4)).toBe(await mk(40));
  });

  it('★ `visible` 을 안 건드린다 — 렌더 목록에서 빼면 셰이더 캐시가 흔들린다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    // 부팅만이 아니라 **걸고 재우고 깨우는 전 구간**을 돈다 — W8-9 로 라이트를 만지는
    // 자리가 하나 늘었고(`update`), 부팅만 보면 그 자리가 축 밖에 남는다.
    await s.place([art({ x: 0, z: 0 }), art({ x: 2 * CELL, z: 0 })]);
    s.update(() => false);
    s.update(() => true);
    for (const L of lightsOf(scene)) {
      expect((L as unknown as { visSets: number }).visSets, '★ 라이트의 visible 을 대입했다')
        .toBe(0);
    }
  });
});

describe('★ 조건 5 — castShadow 는 전부 false', () => {
  it('★ 풀 전체를 훑는다 — 하나라도 켜지면 텍스처 2장이 생겨 [7] 이 FAIL 한다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place([art(), art()]);
    const ls = lightsOf(scene);
    expect(ls.length).toBe(artLightPoolSize());
    expect(ls.every((L) => L.castShadow === false), '★ 그림자를 켠 라이트가 있다').toBe(true);
  });
});

describe('★ 조건 4 — 초과 작품은 **걸리되 라이트 없이**', () => {
  it('★ cap 을 넘어도 액자는 전부 선다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 2 });
    await s.place(Array.from({ length: 5 }, () => art()));   // 같은 파셀 5개
    const st = s.stats();
    expect(st.frames, '★ 초과 작품이 안 걸렸다').toBe(5);
    expect(st.lit).toBe(2);
    expect(st.skipped).toBe(3);
  });

  it('★ 켠 것만 밝기가 오른다 — 나머지는 정확히 0', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 2 });
    await s.place(Array.from({ length: 5 }, () => art()));
    const on = lightsOf(scene).filter((L) => L.intensity > 0);
    expect(on).toHaveLength(2);
    expect(on.every((L) => L.intensity === LIGHT_ON)).toBe(true);
  });
});

// ── 🔴 GS-E — 씬이 작품 목록을 **실제로 소비하는가** (배선 축, 2026-08-18) ──────
//
// 조건 2 개정(풀 = `perParcel × min(작품 파셀 수, 상한)`)을 넣고 뮤테이션을 돌렸더니
// **배선을 끊어도 0 failed** 였다 — `artwork-scene.ts` 가 `deps.arts` 를 무시하도록
// 고쳐도 어떤 테스트도 안 깨졌다.
//
// 순수 함수(`artLightPoolSize`·`artParcelCount`)는 `world2-art-light.test.ts` 가 보고,
// 유도식도 거기서 본다. **그런데 「씬이 그 값을 실제로 쓰는가」는 아무도 안 봤다.**
// 이 저장소가 *"판정/집행 분리의 구멍 — 경계를 건너는 지점은 아무도 안 본다"* 로 이미
// 이름 붙인 형태이고, `covOkOf`·계단 예산 판정식이 각각 같은 처방을 받았다.
//
// **이 축을 넣고 다시 쟀다** (`npx vitest run tests/world2-art-light.test.ts
// tests/world2-artwork-scene.test.ts`):
//
//   심은 것                                              전  후
//   `artwork-scene` 이 `deps.arts` 를 무시 (배선 끊기)      0 → **2**
//   파셀 수 대신 **작품 수**를 넘김 (미묘한 배선 오류)        —    **1**
//
// 순수 함수 쪽 뮤테이션(같은 회차, `art-light.ts`): min 무시 1 · 상한 제거 1 ·
// `artParcelCount` 가 작품 수를 셈 2 · **주석 한 줄만(등가 대조군) 0**.
describe('★ GS-E · 조건 2 개정 — 씬이 작품 목록을 소비한다 (배선)', () => {
  it('★ 작품이 한 파셀뿐이면 풀이 상한보다 작다 — 배선이 끊기면 같아진다', async () => {
    const a = makeThree();
    const few = createArtworkScene({
      THREE: a.THREE, scene: a.scene, cellX: CELL, cellZ: CELL, perParcel: 1,
      arts: [art({ x: 0, z: 0 }), art({ x: 1, z: 1 })],   // 같은 파셀 2장 → 1파셀
    });
    await few.place([art({ x: 0, z: 0 })]);

    const b = makeThree();
    const capped = createArtworkScene({
      THREE: b.THREE, scene: b.scene, cellX: CELL, cellZ: CELL, perParcel: 1,
      // `arts` 생략 = 상한(격자 유도값). 편집 세션이 이 경로다.
    });
    await capped.place([art({ x: 0, z: 0 })]);

    expect(few.stats().lights, '★ 작품 목록이 풀에 반영되지 않았다 — 배선이 끊겼다')
      .toBeLessThan(capped.stats().lights);
    expect(a.counts.light, '★ 실제로 만든 라이트 수도 갈려야 한다')
      .toBeLessThan(b.counts.light);
  });

  it('★ 파셀이 흩어지면 풀이 그만큼 는다 — 「작품 수」가 아니라 「파셀 수」다', async () => {
    const mk = async (arts: { x: number; z: number }[]) => {
      const t = makeThree();
      const s = createArtworkScene({
        THREE: t.THREE, scene: t.scene, cellX: CELL, cellZ: CELL, perParcel: 1, arts,
      });
      await s.place([art({ x: 0, z: 0 })]);
      return s.stats().lights;
    };
    // 같은 파셀 3장 vs 다른 파셀 3장 — 작품 수는 같고 파셀 수만 다르다
    const same = await mk([{ x: 0, z: 0 }, { x: 1, z: 1 }, { x: 2, z: 2 }]);
    const spread = await mk([{ x: 0, z: 0 }, { x: CELL * 3, z: 0 }, { x: CELL * 6, z: 0 }]);
    expect(same, '★ 작품 수로 유도하고 있다 — 파셀 수여야 한다').toBeLessThan(spread);
  });

  it('★ 풀은 여전히 세션 안에서 상수다 — 개정이 조건 1·3 을 깨지 않았다', async () => {
    const { THREE, scene, counts } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 1, arts: [art({ x: 0, z: 0 })],
    });
    const before = counts.light;
    // 부팅 때 안 알려준 파셀에 작품을 걸어도 풀은 안 변한다(초과분은 라이트 없이 — 조건 4)
    await s.place([art({ x: 0, z: 0 }), art({ x: CELL * 9, z: CELL * 9 })]);
    expect(counts.light, '★ place 가 풀을 늘렸다 — 조건 1 위반').toBe(before);
    expect(s.stats().lights).toBe(before);
  });
});

describe('★ GS-C · 조건 3 — soft 완화는 켜는 수만 줄인다 (풀은 안 줄인다)', () => {
  // ⚠⚠ **이 describe 는 검수관 블로커 B1 이 만들었다**(2026-08-17).
  //
  // 예전 판본은 `perParcel: 1` 세션 **하나만** 만들어 놓고 *"풀은 `perParcel` 을 따라
  // 잡히므로 soft 세션의 풀은 작다"* 라고 적었다 — 즉 **조건 3 을 지키는 검사라면서
  // 조건 3 위반을 정상으로 서술**하고 있었다. 순수 쪽의 짝 단언은
  // `artLightPoolSize(4) === artLightPoolSize(4)` 라 동어반복이었고, 검수관이 코드를
  // 조건 문언대로 **고치는** 뮤테이션을 넣자 **0 failed** 였다.
  //
  // 핵심은 **두 세션을 한 테스트에서 비교하는 것**이다. 한 세션만 보면 그 안의 어떤 수도
  // 「원래 그런 값」으로 읽히고, 어떤 단언도 자기 자신을 확인하는 형태로 무너진다.
  // ⚠ **축을 상수에서 뗐다** (2026-08-18). 첫 판본은 `ART_LIGHT_PER_PARCEL_SOFT` 와
  // `ART_LIGHT_PER_PARCEL` 두 **상수**를 주입해 비교했다. 그런데 같은 날 기본값이
  // 4 → 1 로 내려가 **두 상수가 같아지자** 마지막 단언(`lit` 이 더 적다)이 깨졌다.
  //
  // 이 축이 지키려는 것은 «풀은 같고 켜는 수만 다르다» 이고 **그것은 상수와 무관하다.**
  // 그래서 임의의 두 값(1·4)으로 잰다 — 상수가 어떻게 바뀌어도 축은 산다. 실물 상수
  // 관계는 **아래 별도 테스트**가 본다(안 나누면 「축이 죽은 것」과 「상수가 같아진 것」이
  // 한 실패로 뭉개져 원인이 안 갈린다).
  it('★ soft 세션과 기본 세션의 **라이트 수가 같다** — 켜진 수만 다르다', async () => {
    const SOFT_LIKE = 1;
    const FULL_LIKE = 4;
    const a = makeThree();
    const soft = createArtworkScene({
      THREE: a.THREE, scene: a.scene, cellX: CELL, cellZ: CELL, perParcel: SOFT_LIKE,
    });
    await soft.place(Array.from({ length: 4 }, () => art()));

    const b = makeThree();
    const full = createArtworkScene({
      THREE: b.THREE, scene: b.scene, cellX: CELL, cellZ: CELL, perParcel: FULL_LIKE,
    });
    await full.place(Array.from({ length: 4 }, () => art()));

    expect(a.counts.light, '★ soft 가 풀을 줄였다 — 조건 3 위반')
      .toBe(b.counts.light);
    expect(soft.stats().lights, '★ 두 세션의 풀 크기가 다르다')
      .toBe(full.stats().lights);
    // 그리고 **켜는 수는 실제로 달라야** 한다 — 같으면 완화 축이 배선 안 된 것이고,
    // 그때 위 단언은 「둘 다 아무것도 안 한다」로도 통과한다.
    expect(soft.stats().lit, '★ 완화값이 켜는 수를 안 줄였다')
      .toBeLessThan(full.stats().lit);
  });

  // 실물 상수 관계(`SOFT <= 기본`)는 **`tests/world2-art-light.test.ts` 한 곳**이 본다.
  // 상수의 집이 거기다 — 같은 단언을 두 파일에 두면 한쪽만 고쳐도 아무도 모른다.

  it('★ 세션 안에서도 개수는 상수다 — 두 번째 place 가 라이트를 늘리지 않는다', async () => {
    const { THREE, scene, counts } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 1 });
    await s.place(Array.from({ length: 4 }, () => art()));
    const before = counts.light;
    await s.place(Array.from({ length: 8 }, () => art()));
    expect(counts.light).toBe(before);
  });
});

describe('★ GS-D — 어두운 작품은 **전부** 어느 한 숫자에 잡힌다', () => {
  // ⚠ 검수관 블로커 B3-1. `skipped` 가 「조명을 못 받은 작품 수」라고 선언하면서
  // **파셀 cap 초과분만** 셌다. 실측(20파셀 × 4작품 = 80점):
  //
  //     stats {"lights":28,"frames":80,"lit":28,"skipped":0}   ← 실제로 어두운 것은 52개
  //
  // 원인은 분모 불일치다 — 풀은 「동시에 보이는 방」(near 7파셀)에서 유도하는데
  // `assignArtLights` 는 **문서 전체의 작품**에 돈다. 그래서 풀 고갈분(`unpowered`)이
  // 아무 숫자에도 안 잡혔다. 항등식으로 못 박으면 새 구멍이 생기는 즉시 깨진다.
  it('★ frames === lit + skipped + unpowered — 풀이 고갈돼도 성립한다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    // 파셀을 넉넉히 흩어 cap 에 안 걸리게 하고 **풀만** 고갈시킨다.
    const many = Array.from({ length: 60 }, (_, i) =>
      art({ x: (i % 30) * CELL * 3, z: Math.floor(i / 30) * CELL * 3 }));
    await s.place(many);
    const st = s.stats();
    expect(st.frames).toBe(60);
    expect(st.unpowered, '★ 풀 고갈분이 0 으로 보고된다 — 어두운 작품이 숨는다')
      .toBeGreaterThan(0);
    expect(st.lit + st.skipped + st.unpowered, '★ 항등식이 깨졌다 — 어디에도 안 잡히는 작품이 있다')
      .toBe(st.frames);
    expect(st.lit, '★ 풀보다 많이 켰다').toBeLessThanOrEqual(st.lights);
  });

  it('★ cap 초과와 풀 고갈이 **섞여도** 항등식이 성립한다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 2 });
    // ⚠ **파셀 20개 × 작품 4개.** 첫 판본은 작품마다 파셀을 달리해서 cap 초과가 0이었고,
    // 그러면 이 검사가 「섞였을 때」를 한 번도 안 태운다 — 위 단언이 그것을 잡았다.
    // 같은 파셀에 여럿을 넣어야 cap 이 실제로 걸린다.
    const mixed = Array.from({ length: 80 }, (_, i) =>
      art({ x: Math.floor(i / 4) * CELL * 3, z: 0 }));
    await s.place(mixed);
    const st = s.stats();
    expect(st.skipped, '★ cap 초과가 안 생겼다 — 픽스처가 두 축을 구별 못 한다')
      .toBeGreaterThan(0);
    expect(st.unpowered, '★ 풀 고갈이 안 생겼다 — 두 축이 섞이지 않았다')
      .toBeGreaterThan(0);
    expect(st.lit + st.skipped + st.unpowered).toBe(st.frames);
  });

  it('★ `place` 는 **전체 대체**다 — 두 번째 호출이 첫 번째를 지운다', async () => {
    // ⚠ **이 단언은 뒤집혔다.** 예전 제목은 *"두 번 불러도 진단이 **누적**된다"* 였고
    // 그때는 그것이 맞았다 — `place` 가 누적이었기 때문이다. **팀장 판정(2026-08-17)이
    // 계약을 전체 대체로 바꿨다**(`village-parcels.ts` 의 `setAll` 과 같은 의미론).
    //
    // 왜 바뀌었나: 편집은 걸고 **지우는** 것이 짝인데 누적 계약에 지울 수단이 없었다.
    // 개별 제거 API 는 **슬롯 반환 큐라는 새 상태 기계**를 들여 조건 1 의 검사 축을
    // 늘리고, 아래 cap 버그도 남긴다 — 그래서 기각됐다.
    //
    // 옛 단언(누적)을 그대로 두면 **바뀐 계약을 검사가 막는다.** 약속이 달라졌으므로
    // 단언도 달라진다 — 다만 그 사실을 여기 적어 다음 사람이 「왜 뒤집혔나」를 안다.
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 2 });

    await s.place([art(), art(), art()]);
    expect(s.stats().frames, '★ 1회차가 안 섰다 — 이 검사가 아무것도 안 잰다').toBe(3);

    const far = { x: CELL * 5, z: 0 };
    await s.place([art(far), art(far)]);
    const st = s.stats();
    expect(st.frames, '★ 1회차 액자가 남았다 — 전체 대체가 아니다').toBe(2);
    expect(st.skipped, '★ 카운터가 안 지워졌다 — `stats` 가 옛 회차를 말한다').toBe(0);
    const on = lightsOf(scene).filter((L) => L.intensity > 0);
    expect(st.lit, '★ lit 이 실제 켜진 라이트 수와 다르다').toBe(on.length);
    expect(st.lit + st.skipped + st.unpowered).toBe(st.frames);
  });

  it('★ 지운 자리에 **빛이 안 남는다** — 액자만 지우고 라이트를 안 끄면 벽이 밝다', async () => {
    const { THREE, scene } = makeThree();
    // ⚠ `perParcel` 을 **명시 주입한다** (2026-08-18). 첫 판본은 기본값에 기대어 「3개가
    // 켜진다」를 단언했는데, 기본값이 4 → 1 로 내려가자 같은 파셀의 세 작품 중 **1개만**
    // 켜져 깨졌다. 이 테스트의 목적은 「지우면 빛이 0 이 된다」이고 **3 은 목적이 아니라
    // 전제**다. 전제를 상수에 기대는 것이 값 미러링이다.
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 3 });
    await s.place([art(), art(), art()]);
    expect(lightsOf(scene).filter((L) => L.intensity > 0).length).toBe(3);
    await s.place([]);   // 전부 지운다
    expect(lightsOf(scene).filter((L) => L.intensity > 0).length, '★ 빈 벽이 밝다').toBe(0);
    expect(s.stats().frames).toBe(0);
  });

  it('★ 라이트 풀은 전체 대체에도 **개수가 그대로다** — 조건 1', async () => {
    const { THREE, scene, counts } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    const before = counts.light;
    await s.place([art(), art()]);
    await s.place([]);
    await s.place(Array.from({ length: 9 }, () => art()));
    expect(counts.light, '★ 풀이 변했다 — `clearPlaced` 가 라이트를 지웠다').toBe(before);
    expect(s.stats().lights).toBe(before);
  });

  // ── 팀장 조건 B — 정리 경로를 **각각** 잡는다 ──────────────────────────
  //
  // ⚠ **첫 판본은 9건 중 4건만 잡았다.** 카운터가 리셋되면 `stats()` 는 맞는 값을 내므로
  // 「액자를 안 지운다」·「재질을 안 지운다」가 **stats 만 보는 단언을 전부 통과**했다.
  // 팀장 조건이 *"리셋 하나가 빠지면 `stats` 가 거짓말하는 형태"* 를 지목한 이유가 이것이다
  // — `stats` 를 믿는 검사는 `stats` 의 거짓말을 못 잡는다. **씬을 직접 본다.**
  it('★ 씬에서 액자가 실제로 빠진다 — `stats` 만 보면 안 지워도 통과한다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    const base = rootKids(scene);          // 라이트 풀 + 타깃(액자 0)
    await s.place([art(), art(), art()]);
    expect(rootKids(scene) - base, '★ 액자가 씬에 안 붙었다').toBe(3);
    await s.place([art()]);
    expect(rootKids(scene) - base, '★ 옛 액자가 씬에 남았다 — 화면에 유령이 선다').toBe(1);
    await s.place([]);
    expect(rootKids(scene) - base).toBe(0);
  });

  it('★ 🔴 G1 — **겹친 `place` 가 유령 액자를 세우지 않는다** (검수관 블로커 B1)', async () => {
    // 🔴 검수관이 재현한 결함이다. `place()` 는 `await textureFor` 에서 **제어를 놓는데**,
    // 그 사이 두 번째 `place` 가 들어와 `clearPlaced()` 로 공유 상태를 비워도 **1차가
    // 재개해 같은 배열에 계속 push 하고 `root.add` 하고 슬롯을 소비했다.**
    // 실측: 문서상 작품 **2개**에 씬에는 액자 **3개**, 그리고 `stats().frames` 는 3.
    //
    // 도달 경로: `edit/input.ts` 의 드롭 분기가 `void deps.art.drop(…)` 로 던지고 안
    // 기다리고, `edit/artwork-mode.ts` 의 `await measure(url)`(이미지 디코드)이 창을 연다.
    // **작품 두 점을 연달아 거는 것은 전시를 꾸미는 사람의 기본 동작이다.**
    //
    // ⚠ **`stats()` 와 씬 트리를 둘 다 본다.** 카운터만 보면 「액자를 안 지웠다」가 통과한다
    // — 팀장 조건 B 가 `rootKids` 를 만들게 한 그 형태이고, 여기가 두 번째 자리다.
    const { THREE, scene } = makeThree();
    /** 1차를 텍스처 대기에 **세워 두는** 문. 열어야 진행한다 */
    let release: (() => void) | null = null;
    let gateUsed = false;
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL,
      loadTexture: async (src) => {
        if (!gateUsed) {
          gateUsed = true;
          await new Promise<void>((r) => { release = r; });
        }
        return { fake: src };
      },
    });
    const base = rootKids(scene);
    // 1차: 작품 3개. 첫 텍스처에서 멈춘다.
    const first = s.place([art(), art({ src: 'assets/art/b.png' }), art({ src: 'assets/art/c.png' })]);
    await new Promise((r) => setTimeout(r, 0));
    expect(release, '★ 게이트가 안 걸렸다 — 이 검사가 겹침을 못 만든다').not.toBeNull();
    // 2차: 작품 2개. 1차가 멈춰 있는 동안 통째로 완주한다.
    const second = s.place([art(), art({ src: 'assets/art/b.png' })]);
    await second;
    release!();                       // 1차를 풀어 준다 — 여기서 유령이 섰었다
    await first;

    expect(s.stats().frames, '★ 겹친 옛 호출이 계속 세었다').toBe(2);
    expect(rootKids(scene) - base, '★ 씬에 유령 액자가 남았다 — `stats` 는 맞다고 말한다')
      .toBe(2);
    expect(s.stats().lit, '★ 옛 호출이 라이트 슬롯을 더 먹었다').toBeLessThanOrEqual(2);
  });

  it('★ 🔴 **텍스처는 재대체마다 다시 로드하지 않는다** — 그것이 N² 누수였다', async () => {
    // 🔴 팀장 조건 A 실측(2026-08-17)이 잡은 결함이다. `material.dispose()` 는 three 에서
    // **`map` 을 건드리지 않으므로** `clearPlaced` 가 재질·지오를 지워도 텍스처만 남았다.
    // 편집 세션에서 작품을 8회 걸며 잰 실측:
    //
    //   회차   1   2   3   4   5   6   7   8
    //   Δtex   1   2   5   8  12  17  23  30   ← **증가폭이 커진다(N² 신호)**
    //   Δgeo   2   2   4   4   4   4   4   4   ← 멈춘다(dispose 가 듣는다)
    //
    // 재는 축은 **로드 횟수**다 — 「텍스처 객체가 몇 개 살아 있나」는 스텁이 못 세지만,
    // 「같은 그림을 몇 번 받아 왔나」는 셀 수 있고 그것이 누수의 원인이다.
    const { THREE, scene } = makeThree();
    let loads = 0;
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL,
      loadTexture: async (src) => { loads++; return { fake: src }; },
    });
    await s.place([art()]);
    expect(loads, '★ 첫 회차가 안 받았다 — 이 검사가 헛돈다').toBe(1);
    // 같은 작품을 든 채로 4번 더 대체한다(편집에서 옆 작품을 걸 때마다 일어나는 일).
    for (let i = 0; i < 4; i++) await s.place([art()]);
    expect(loads, '★ 재대체마다 텍스처를 다시 받는다 — 이전 것이 GPU 에 남는다').toBe(1);
    // 새 그림은 당연히 새로 받는다 — 캐시가 «아무것도 안 받는다» 가 되면 그림이 안 바뀐다.
    await s.place([art(), art({ src: 'assets/art/b.png' })]);
    expect(loads, '★ 새 작품을 안 받았다 — 캐시가 너무 넓다').toBe(2);
  });

  it('★ 미리보기 URL 이 바뀌면 **다시 받는다** — 안 그러면 「바꿨는데 안 바뀐다」', async () => {
    // 편집에서 같은 파일명을 다시 떨어뜨리면 `blob:` 이 새로 생긴다. `src` 를 캐시 키로
    // 쓰면 낡은 그림이 그대로 남는다 — 그래서 키가 **실제 URL**(`texKey`)이다.
    const { THREE, scene } = makeThree();
    let loads = 0;
    let url = 'blob:one';
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL,
      loadTexture: async () => { loads++; return { fake: url }; },
      texKey: () => url,
    });
    await s.place([art()]);
    await s.place([art()]);
    expect(loads, '★ 같은 URL 인데 다시 받았다').toBe(1);
    url = 'blob:two';                       // 같은 파일명을 다시 드롭한 상황
    await s.place([art()]);
    expect(loads, '★ 새 미리보기를 안 받았다 — 화면이 옛 그림을 계속 보여 준다').toBe(2);
  });

  it('★ 떠날 때 텍스처를 지운다 — 캐시가 소유하므로 여기서 안 지우면 아무도 안 지운다', async () => {
    const { THREE, scene } = makeThree();
    let disposed = 0;
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL,
      loadTexture: async () => ({ dispose() { disposed++; } }),
    });
    await s.place([art(), art({ src: 'assets/art/b.png' })]);
    expect(disposed, '★ 살아 있는데 지웠다').toBe(0);
    s.dispose();
    expect(disposed, '★ 떠났는데 텍스처가 GPU 에 남는다').toBe(2);
  });

  it('★ 재대체가 옛 재질·지오를 dispose 한다 — 안 하면 `[7]` 이 증식으로 읽는다', async () => {
    const { THREE, scene, counts } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place([art(), art()]);
    expect(counts.matDisposed, '★ 첫 배치에서 이미 뭔가 지워졌다').toBe(0);
    await s.place([art()]);
    expect(counts.matDisposed, '★ 옛 재질이 안 지워졌다').toBe(2);   // 평면 2
    expect(counts.geoDisposed, '★ 옛 지오가 안 지워졌다').toBe(4);   // 테두리2 + 평면2
  });

  it('★ `texFailed` 가 회차를 넘어 남지 않는다 — 성공한 회차가 실패로 보고된다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL, loadTexture: async () => null,
    });
    await s.place([art(), art()]);
    expect(s.stats().texFailed, '★ 픽스처가 실패를 안 만든다 — 이 검사가 헛돈다').toBe(2);
    await s.place([]);
    expect(s.stats().texFailed, '★ 옛 실패가 남았다').toBe(0);
  });

  it('★ `unpowered`·`next` 가 회차를 넘어 남지 않는다 — 풀을 고갈시켜 잰다', async () => {
    // `next` 리셋이 빠지면 **두 번째 회차가 슬롯을 이어서 쓴다.** 풀이 넉넉하면 결과가
    // 같아 등가로 통과하므로, **1회차에 풀을 고갈시켜** 두 값이 갈리게 만든다.
    const { THREE, scene } = makeThree();
    // ⚠ `perParcel: 2` 를 **명시 주입한다** (2026-08-18) — 아래 `lit` 2 단언의 전제다.
    // 기본값에 기대면 상수가 바뀔 때마다 깨진다(실제로 4 → 1 에서 깨졌다). 목적은
    // 「`next` 가 회차를 넘어 안 남는가」이고 2 는 그 목적을 재기 위한 전제다.
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 2 });
    const many = Array.from({ length: 60 }, (_, i) =>
      art({ x: (i % 30) * CELL * 3, z: Math.floor(i / 30) * CELL * 3 }));
    await s.place(many);
    expect(s.stats().unpowered, '★ 풀이 안 고갈됐다 — 이 검사가 두 값을 구별 못 한다')
      .toBeGreaterThan(0);

    await s.place([art(), art()]);
    const st = s.stats();
    expect(st.unpowered, '★ 옛 고갈이 남았다').toBe(0);
    expect(st.lit, '★ 슬롯이 이어져 새 작품이 불을 못 받았다 — `next` 가 안 지워졌다').toBe(2);
  });

  it('★ 팀장 조건 C — 같은 파셀에 1개씩 **2회** 놓아도 cap 을 넘지 않는다', async () => {
    // 🔴 **누적 계약의 실제 버그였다.** `assignArtLights` 의 `used` 맵이 **함수 지역**이라
    // 호출마다 파셀 cap 이 초기화된다. 누적이면 같은 파셀에 1개씩 두 번 놓았을 때
    // `perParcel = 1` 인데도 **둘 다 켜졌다.**
    //
    // 전체 대체에서는 매 호출이 전체를 다시 배정하므로 그 지역성이 **정답**이 된다.
    // ⚠ 팀장 조건: **부수 효과로만 두지 마라** — 명시 테스트가 없으면 구조를 되돌릴 때
    // 이 버그가 소리 없이 부활한다.
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 1 });
    const spot = { x: 0, z: 0 };
    await s.place([art(spot)]);
    await s.place([art(spot)]);
    const on = lightsOf(scene).filter((L) => L.intensity > 0);
    expect(on.length, '★ 같은 파셀에 cap 을 넘겨 켜졌다 — 호출 간 cap 이 샜다').toBe(1);
    expect(s.stats().lit).toBe(1);
  });
});

describe('★ 재질·지오는 작품 수에 비례하되 **테두리는 공유한다**', () => {
  it('★ 테두리 재질이 하나다 — 작품마다 만들면 재질 수가 증식한다', async () => {
    const { THREE, scene, counts } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    const base = counts.mat;    // 테두리 재질 1개
    expect(base).toBe(1);
    await s.place([art(), art(), art()]);
    // 작품 평면 재질만 는다(텍스처가 개별이라 불가피).
    expect(counts.mat - base, '★ 테두리 재질이 작품마다 생긴다').toBe(3);
  });

  it('★ 🔴 **내역이 갈린다** — 테두리 1(Standard) · 그림 3(Basic)', async () => {
    // ⚠ 이 검사가 없는 동안 `matStd`/`matBasic` 은 **검출력 0** 이었다(검수관 블로커 B2,
    // 2026-08-18). 필드를 만들며 주석에 *"「그림은 Basic · 테두리는 Standard」를 잰다"*
    // 라고 적었는데 **그 둘을 읽는 `expect` 가 0건**이었다 — 실측으로 확인됐다:
    // `counts.matBasic++` 를 지워도, `counts.matStd++` 를 지워도 **0 failed**.
    //
    // 「축을 만들려던 자리에서 축이 비는」 형태다. 합(`counts.mat`)만 보는 위 검사는
    // **그림과 테두리가 통째로 뒤바뀌어도 통과한다** — 그것을 막으려고 만든 필드였다.
    const { THREE, scene, counts } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place([art(), art(), art()]);
    expect(counts.matStd, '★ Standard 가 테두리 1개가 아니다 — 그림까지 Standard 다')
      .toBe(1);
    expect(counts.matBasic, '★ Basic 이 작품 수만큼이 아니다 — 그림이 Basic 이 아니다')
      .toBe(3);
  });

  it('액자 하나당 메시 둘 — 테두리 + 작품 평면', async () => {
    const { THREE, scene, counts } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place([art(), art()]);
    expect(counts.mesh).toBe(4);
  });
});

describe('★ 텍스처 로드가 실패해도 액자는 선다', () => {
  it('★ 빈 액자가 「로드 실패」의 표시다 — 통째로 사라지면 원인을 못 짚는다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL,
      loadTexture: async () => null,
    });
    await s.place([art(), art()]);
    expect(s.stats().frames).toBe(2);
    expect(s.stats().texFailed, '★ 실패를 안 센다').toBe(2);
  });

  it('로더가 던져도 세계가 안 죽는다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL,
      loadTexture: async () => { throw new Error('boom'); },
    });
    await expect(s.place([art()])).resolves.toBeUndefined();
    expect(s.stats().texFailed).toBe(1);
  });

  it('로더를 안 주면 텍스처를 안 받는다 — 실패도 0', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place([art()]);
    expect(s.stats().texFailed).toBe(0);
  });
});

describe('★ 정리', () => {
  it('떠날 때 루트를 씬에서 뺀다', async () => {
    const { THREE, scene, sceneKids } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place([art()]);
    expect(sceneKids).toHaveLength(1);
    s.dispose();
    expect(sceneKids, '★ 루트가 씬에 남았다').toHaveLength(0);
  });

  it('★ 지오메트리도 지운다 — 재질만 지우면 `[7]` 이 보는 축의 절반이 남는다', async () => {
    // 검수관 P6. three 의 `info.memory` 는 geometries 와 (재질이 물고 있는) textures 를
    // **따로** 센다 — 재질만 dispose 하면 지오메트리는 그대로 GPU 에 남는다.
    const { THREE, scene, counts } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place([art(), art(), art()]);
    expect(counts.geo, '★ 액자당 지오 둘(테두리 + 평면)이 아니다').toBe(6);
    expect(counts.geoDisposed).toBe(0);
    s.dispose();
    expect(counts.geoDisposed, '★ 지오메트리가 안 지워졌다').toBe(6);
    expect(counts.matDisposed, '★ 재질이 안 지워졌다').toBe(4);   // 테두리 공유 1 + 평면 3
  });

  it('★ dispose 뒤 `place` 는 아무것도 안 한다 — 떠난 뒤 씬을 만지면 유령이다', async () => {
    const { THREE, scene, counts } = makeThree();
    // ⚠ **cap 을 넘는 작품으로 부른다.** 처음에는 2개를 넘겼고 `skipped` 가 0→0 이라
    // 두 값이 구별되지 않아 뮤테이션 C6 이 통과했다 — 픽스처가 축을 못 태운 형태다.
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 1 });
    s.dispose();
    const before = counts.mesh;
    const snap = s.stats();
    await s.place([art(), art(), art()]);
    expect(counts.mesh).toBe(before);
    // ⚠ **진단까지 본다.** 메시 수만 보면 「앞 가드를 지워도 루프 가드가 막는다」가
    // 등가로 통과한다(뮤테이션 C6, 0 failed) — 그때 `skipped` 는 조용히 갱신되고 있었다.
    // 떠난 세션의 진단이 움직이는 것은 그 자체가 유령이다.
    expect(s.stats(), '★ dispose 뒤에 진단이 바뀌었다').toEqual(snap);
  });

  it('기본 파셀당 상한이 계약값과 같다 — 두 곳에 적으면 갈린다', () => {
    const { THREE, scene, counts } = makeThree();
    createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    expect(counts.light).toBe(artLightPoolSize(ART_LIGHT_PER_PARCEL));
  });
});

describe('★ 부팅 진입점 — 로더가 실제로 붙는다', () => {
  it('★ `mountArtworks` 가 텍스처 로더를 배선한다 — 안 붙으면 액자만 서고 그림이 없다', async () => {
    const { THREE, scene } = makeThree();
    const asked: string[] = [];
    // 스텁 three 에 `TextureLoader` 를 심어 «로더가 실제로 불리는가» 를 잰다.
    (THREE as unknown as Record<string, unknown>).TextureLoader = class {
      async loadAsync(u: string) { asked.push(u); return { tex: u }; }
    };
    const s = mountArtworks(THREE, scene, { cellX: CELL, cellZ: CELL }, (src) => `/app/${src}`);
    await s.place([art({ src: 'assets/art/one.png' })]);
    expect(asked, '★ 작품 이미지를 안 받는다').toEqual(['/app/assets/art/one.png']);
    expect(s.stats().texFailed).toBe(0);
  });

  it('★ 로더를 **한 번만** 만든다 — 벌마다 캐시가 갈리면 같은 파일을 두 번 받는다', async () => {
    const { THREE, scene } = makeThree();
    let made = 0;
    (THREE as unknown as Record<string, unknown>).TextureLoader = class {
      constructor() { made++; }
      async loadAsync(u: string) { return { tex: u }; }
    };
    const s = mountArtworks(THREE, scene, { cellX: CELL, cellZ: CELL }, (s2) => s2);
    await s.place([art(), art(), art()]);
    expect(made, '★ 작품마다 로더를 새로 만든다').toBe(1);
  });

  it('three 에 `TextureLoader` 가 없으면 로더 없이 간다 — 던지지 않는다', () => {
    const { THREE } = makeThree();
    expect(textureLoaderFor(THREE, (s2) => s2)).toBeUndefined();
  });
});

describe('★ 텍스처는 재질을 만들기 **전에** 받는다 (브라우저 실측이 잡은 결함)', () => {
  it('★ 재질 생성 인자에 `map` 이 들어간다 — 나중에 꽂으면 화면에 안 뜬다', async () => {
    // 🔴 첫 판본은 재질을 만든 뒤 `mat.map = tex` 를 했고, 실측에서 `texFailed: 0` 인데
    // 액자가 회색이었다. three 는 재질이 처음 렌더될 때 셰이더를 굽고, 그 뒤 `map` 을
    // 꽂으면 `needsUpdate` 없이는 반영되지 않는다. 순서로 해소했다(셰이더 재컴파일 0).
    const { THREE, scene } = makeThree();
    const seen: Record<string, unknown>[] = [];
    spyMaterials(THREE, seen);

    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL,
      loadTexture: async () => ({ fake: 'tex' }),
    });
    await s.place([art()]);
    const withMap = seen.filter((o) => o.map !== undefined);
    expect(withMap, '★ 재질이 텍스처 없이 만들어진다 — 그림이 안 뜬다').toHaveLength(1);
  });

  it('★ 텍스처가 없으면 `map` 키 자체를 안 넣는다 — `undefined` 를 넣으면 경고가 난다', async () => {
    const { THREE, scene } = makeThree();
    const seen: Record<string, unknown>[] = [];
    spyMaterials(THREE, seen);

    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place([art()]);
    expect(seen.some((o) => 'map' in o), '★ 빈 map 키가 들어갔다').toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// W8-9 — 건물과 생사를 맞춘다
//
// 감독 지시 2026-08-18: *"멀리떨어졌을때 건물이 사라질때 같이 사라지고 나왔으면해"*.
//
// ⚠ **이 축은 그전까지 검사가 0개였다.** 위 조건 1 의 «`visible` 을 안 건드린다» 는
// `lightsOf()` 를 쓰는데 그 헬퍼가 `castShadow` 가 boolean 인 노드만 고른다 — 즉
// **라이트만** 본다. 액자 그룹의 `visible` 은 어느 단언도 안 읽고 있었다.
// ═══════════════════════════════════════════════════════════════════════════

describe('W8-9 — 작품이 건물과 함께 사라진다', () => {
  /** 액자 그룹만 골라낸다. 라이트·타깃은 `castShadow`/`intensity` 로 구별된다 */
  function framesOf(scene: ArtNode): ArtNode[] {
    const root = scene.children?.[0];
    return (root?.children ?? []).filter(
      (n) => typeof (n as { castShadow?: boolean }).castShadow !== 'boolean'
        && (n.children?.length ?? 0) > 0,
    );
  }

  /** 두 작품을 **서로 다른 파셀**에 놓는다 — 파셀 (0,0) 과 (2,0) */
  const twoParcels = (): ArtworkItem[] => [art({ x: 0, z: 0 }), art({ x: 2 * CELL, z: 0 })];

  it('★ 파셀 판정이 조명 배정과 **같은 함수**다 — 갈리면 불만 켜진 유령 액자가 생긴다', () => {
    // 같은 파셀 두 장 + 다른 파셀 한 장. `assignArtLights` 는 파셀당 1개까지 켠다.
    const arts = [art({ x: 0, z: 0 }), art({ x: 4, z: 4 }), art({ x: 2 * CELL, z: 0 })];
    const keys = arts.map((a) => {
      const p = artParcelXZ(a, CELL, CELL);
      return `${p.px},${p.pz}`;
    });
    expect(keys, '★ 파셀 환산이 어긋났다').toEqual(['0,0', '0,0', '2,0']);
    // 교차 확인 — 같은 파셀로 본 둘 중 하나만 켜진다(cap 1)
    const { lit } = assignArtLights(arts, 1, CELL, CELL);
    expect(lit, '★ 두 판정이 다른 파셀을 보고 있다').toEqual([true, false, true]);
  });

  it('★ 파셀 환산은 **중심 기준 반올림**이다 — 경계와 음수', () => {
    expect(artParcelXZ({ x: 0, z: 0 }, CELL, CELL)).toEqual({ px: 0, pz: 0 });
    expect(artParcelXZ({ x: CELL / 2, z: 0 }, CELL, CELL)).toEqual({ px: 1, pz: 0 });
    expect(artParcelXZ({ x: CELL / 2 - 0.01, z: 0 }, CELL, CELL)).toEqual({ px: 0, pz: 0 });
    expect(artParcelXZ({ x: -CELL, z: -2 * CELL }, CELL, CELL)).toEqual({ px: -1, pz: -2 });
    // 라이브 좌표(건물 남쪽 벽) — 파셀 (1,2) 여야 한다
    expect(artParcelXZ({ x: 20.71, z: 50.13 }, CELL, CELL)).toEqual({ px: 1, pz: 2 });
  });

  it('★ 언로드된 파셀의 액자만 숨는다 — 로드된 것은 그대로 보인다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place(twoParcels());
    const fr = framesOf(scene);
    expect(fr.length, '★ 액자 두 개를 못 찾았다 — 헬퍼가 낡았다').toBe(2);
    expect(fr.map((f) => f.visible), '★ 걸린 직후에는 보여야 한다').toEqual([true, true]);

    // 파셀 (0,0) 만 로드된 상태
    s.update((px, pz) => px === 0 && pz === 0);
    expect(fr.map((f) => f.visible), '★ 언로드된 파셀의 액자가 안 숨었다').toEqual([true, false]);
  });

  it('★ 숨은 액자의 조명이 꺼진다 — 안 끄면 허공에 빛 동그라미가 남는다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place(twoParcels());
    const on = () => lightsOf(scene).filter((L) => L.intensity > 0).length;
    expect(on(), '★ 두 파셀이니 둘 다 켜져 있어야 한다').toBe(2);

    s.update((px) => px === 0);
    expect(on(), '★ 숨겼는데 조명이 남았다').toBe(1);

    s.update(() => true);
    expect(on(), '★ 되돌아왔는데 조명이 안 켜졌다').toBe(2);
  });

  // ⚠ 「조명에 `visible` 을 안 쓴다」는 위 **조건 1** 의 검사가 본다(대입 횟수 0).
  // 여기 같은 단언을 또 쓰지 않는다 — 두 곳에 있으면 한쪽만 고쳐도 아무도 모른다.

  it('★ `frames` 는 안 변하고 `shown` 만 변한다 — `frames` 는 [7] 의 예산 분모다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place(twoParcels());
    expect(s.stats()).toMatchObject({ frames: 2, shown: 2 });

    s.update((px) => px === 0);
    expect(s.stats().frames, '★ frames 가 가시성을 따라갔다 — [7] 예산이 0 이 된다').toBe(2);
    expect(s.stats().shown).toBe(1);

    s.update(() => false);
    expect(s.stats()).toMatchObject({ frames: 2, shown: 0 });

    s.update(() => true);
    expect(s.stats(), '★ 왕복이 안 닫힌다 — 카운터가 새고 있다').toMatchObject({ frames: 2, shown: 2 });
  });

  it('🔴 `update` 는 지오·재질을 **다시 만들지도 지우지도 않는다** — [7] settledOk 의 전부', async () => {
    const { THREE, scene, counts } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place(twoParcels());
    const before = { geo: counts.geo, mat: counts.mat, geoD: counts.geoDisposed, matD: counts.matDisposed };

    // 멀어졌다 → 돌아왔다 를 여러 번
    for (let i = 0; i < 5; i++) { s.update(() => false); s.update(() => true); }

    expect({
      geo: counts.geo, mat: counts.mat, geoD: counts.geoDisposed, matD: counts.matDisposed,
    }, '★ `update` 가 `place` 를 탔다 — 재방문마다 info.memory 가 다시 오른다').toEqual(before);
  });

  it('★ `place` 를 다시 부르면 가시성 상태도 함께 리셋된다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place(twoParcels());
    s.update(() => false);
    expect(s.stats().shown).toBe(0);

    await s.place(twoParcels());
    expect(s.stats().shown, '★ 새로 건 액자가 숨은 채로 시작했다').toBe(2);
    expect(framesOf(scene).map((f) => f.visible)).toEqual([true, true]);
  });

  it('★ 작품 0개에서도 `update` 가 던지지 않는다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place([]);
    expect(() => s.update(() => false)).not.toThrow();
    expect(s.stats().shown).toBe(0);
  });

  it('★ `dispose` 뒤 `update` 는 아무 일도 안 한다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place(twoParcels());
    const fr = framesOf(scene);
    s.dispose();
    s.update(() => false);
    expect(fr.map((f) => f.visible), '★ 떠난 씬을 계속 만진다').toEqual([true, true]);
  });
});
