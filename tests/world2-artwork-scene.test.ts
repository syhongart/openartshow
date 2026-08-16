// @vitest-environment node
//
// **액자·조명 씬** — 집행 (W8-4 C). three 를 **주입받으므로 실제로 돌린다.**
//
// ── 이 파일이 잴 수 있는 것 / 없는 것 ─────────────────────────────────────
// | 팀장 조건 | 여기서 |
// |---|---|
// | 1 개수 불변 절대 | ★ **잰다** — `place` 전/후 라이트 수, 작품을 늘려도 상수인지 |
// | 2 풀 크기 유도 | 순수 쪽(`world2-art-light.test.ts`)이 잰다 |
// | 3 soft 완화 | ★ **잰다** — 켜는 수만 줄고 풀은 그대로인지 |
// | 4 초과는 라이트 없이 | ★ **잰다** — 액자는 서고 라이트만 안 붙는지 |
// | 5 castShadow=false | ★ **잰다** — 풀 전체를 훑는다 |
// | 6 WebGPU 판정 유보 | ✗ 원리적으로 못 잰다 |
//
// ⚠ **스텁이 실물의 핵심 성질을 갖는가**가 이 검사의 전제다. 그래서 스텁은 «만들어진
// 개수를 센다» — 실물 three 의 관찰 가능한 성질 중 `[7]` 이 보는 바로 그것이다.

import { describe, it, expect } from 'vitest';
import {
  createArtworkScene, mountArtworks, textureLoaderFor, LIGHT_ON,
  type ArtThreeNS, type ArtNode,
} from '../frontend/js/world2/systems/artwork-scene.js';
import { artLightPoolSize, ART_LIGHT_PER_PARCEL } from '../frontend/js/world2/decide/art-light.js';
import type { ArtworkItem } from '../frontend/js/world2/decide/artwork.js';

const CELL = 32;

/** 만들어진 개수를 센다 — `[7]` 개수 불변식이 보는 축과 같은 것 */
interface Counts { geo: number; mat: number; light: number; mesh: number }

function makeThree(): { THREE: ArtThreeNS; scene: ArtNode; counts: Counts; sceneKids: ArtNode[] } {
  const counts: Counts = { geo: 0, mat: 0, light: 0, mesh: 0 };
  const node = (): ArtNode => {
    const kids: ArtNode[] = [];
    return {
      position: { set() { } },
      rotation: { y: 0 },
      children: kids,
      add(o: ArtNode) { kids.push(o); },
      remove(o: ArtNode) { const i = kids.indexOf(o); if (i >= 0) kids.splice(i, 1); },
    };
  };
  const THREE = {
    Group: class { constructor() { return node(); } },
    Object3D: class { constructor() { return node(); } },
    Mesh: class { constructor() { counts.mesh++; return node(); } },
    BoxGeometry: class { constructor() { counts.geo++; } },
    PlaneGeometry: class { constructor() { counts.geo++; } },
    MeshStandardMaterial: class { constructor() { counts.mat++; } dispose() { } },
    SpotLight: class {
      intensity = 0; angle = 0; penumbra = 0; distance = 0; castShadow = false;
      target = node();
      constructor(_c?: number, i?: number) { counts.light++; this.intensity = i ?? 0; Object.assign(this, node()); }
    },
  } as unknown as ArtThreeNS;
  const scene = node();
  return { THREE, scene, counts, sceneKids: scene.children! };
}

const art = (over: Partial<ArtworkItem> = {}): ArtworkItem => ({
  src: 'assets/art/a.png', x: 0, y: 3, z: 0, ry: 0, w: 2.4, ar: 1.2, ...over,
});

/** 풀 안의 라이트를 전부 꺼낸다 — 씬 트리를 실제로 훑는다 */
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

  it('★ `visible` 을 안 건드린다 — 렌더 목록에서 빼면 셰이더 캐시가 흔들린다', () => {
    const { THREE, scene } = makeThree();
    createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    for (const L of lightsOf(scene)) {
      expect((L as { visible?: unknown }).visible, '★ visible 을 만졌다').toBeUndefined();
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

describe('★ 조건 3 — soft 완화는 켜는 수만 줄인다', () => {
  it('★ 풀 크기는 그대로, 켜는 수만 준다', async () => {
    const { THREE, scene, counts } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 1 });
    await s.place(Array.from({ length: 4 }, () => art()));
    expect(s.stats().lit).toBe(1);
    // ⚠ 풀은 `perParcel` 을 따라 잡히므로 soft 세션의 풀은 작다 — 그러나 **그 세션 안에서
    // 상수**인 것이 조건 1 이다. 세션 중에 바뀌지 않는다는 것을 여기서 못 박는다.
    const before = counts.light;
    await s.place(Array.from({ length: 8 }, () => art()));
    expect(counts.light).toBe(before);
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
