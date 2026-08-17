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
// ⚠ **스텁이 실물의 핵심 성질을 갖는가**가 이 검사의 전제다. 그래서 스텁은 «만들어진
// 개수를 센다» — 실물 three 의 관찰 가능한 성질 중 `[7]` 이 보는 바로 그것이다.

import { describe, it, expect } from 'vitest';
import {
  createArtworkScene, mountArtworks, textureLoaderFor, LIGHT_ON,
  type ArtThreeNS, type ArtNode,
} from '../frontend/js/world2/systems/artwork-scene.js';
import {
  artLightPoolSize, ART_LIGHT_PER_PARCEL, ART_LIGHT_PER_PARCEL_SOFT,
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
}

function makeThree(): { THREE: ArtThreeNS; scene: ArtNode; counts: Counts; sceneKids: ArtNode[] } {
  const counts: Counts = {
    geo: 0, mat: 0, light: 0, mesh: 0, geoDisposed: 0, matDisposed: 0,
  };
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
    BoxGeometry: class { constructor() { counts.geo++; } dispose() { counts.geoDisposed++; } },
    PlaneGeometry: class { constructor() { counts.geo++; } dispose() { counts.geoDisposed++; } },
    MeshStandardMaterial: class { constructor() { counts.mat++; } dispose() { counts.matDisposed++; } },
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
  it('★ soft 세션과 기본 세션의 **라이트 수가 같다** — 켜진 수만 다르다', async () => {
    const a = makeThree();
    const soft = createArtworkScene({
      THREE: a.THREE, scene: a.scene, cellX: CELL, cellZ: CELL,
      perParcel: ART_LIGHT_PER_PARCEL_SOFT,
    });
    await soft.place(Array.from({ length: 4 }, () => art()));

    const b = makeThree();
    const full = createArtworkScene({
      THREE: b.THREE, scene: b.scene, cellX: CELL, cellZ: CELL,
      perParcel: ART_LIGHT_PER_PARCEL,
    });
    await full.place(Array.from({ length: 4 }, () => art()));

    expect(a.counts.light, '★ soft 가 풀을 줄였다 — 조건 3 위반')
      .toBe(b.counts.light);
    expect(soft.stats().lights, '★ 두 세션의 풀 크기가 다르다')
      .toBe(full.stats().lights);
    // 그리고 **켜는 수는 실제로 달라야** 한다 — 같으면 완화 축이 배선 안 된 것이고,
    // 그때 위 단언은 「둘 다 아무것도 안 한다」로도 통과한다.
    expect(soft.stats().lit, '★ soft 가 켜는 수를 안 줄였다')
      .toBeLessThan(full.stats().lit);
  });

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

  it('★ place 를 두 번 불러도 슬롯이 겹치지 않고 **진단이 누적된다**', async () => {
    // 검수관 P5. `next` 가 `place` 지역 변수였을 때 2회 호출 → `lit 4` 인데 실제로 켜진
    // 라이트는 **2개**였다(같은 슬롯을 두 작품이 나눠 갖고 뒤엣것이 이겼다).
    //
    // ⚠ **두 회차 모두 cap 을 넘겨야 한다.** 여기서 두 번 틀렸고 둘 다 같은 원인이다 —
    // 픽스처가 «누적» 과 «치환» 을 구별할 수 있어야 하는데:
    //   1차 판본: 회차마다 cap 딱 맞춤 → skipped 0 → 0.  `0+0` 과 `0` 이 같다
    //   2차 판본: 1회차 0, 2회차 2   → `0+2` 와 `2` 가 **여전히 같다**
    // 구별되려면 **1회차 skipped 가 0이 아니어야** 한다. 그래야 `+=` 는 1+2=3,
    // `=` 는 2 로 갈린다. 「cap 을 넘기면 된다」로 뭉뚱그린 것이 두 번째 실패의 원인이다.
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL, perParcel: 2 });

    await s.place([art(), art(), art()]);                // 1회차: 3개 중 1개 초과 → skipped 1
    expect(s.stats().skipped, '★ 1회차가 cap 을 안 넘었다 — 픽스처가 누적을 검사할 수 없다')
      .toBe(1);

    const far = { x: CELL * 5, z: 0 };
    await s.place([art(far), art(far), art(far), art(far)]);  // 2회차: 4개 중 2개 초과
    const on = lightsOf(scene).filter((L) => L.intensity > 0);
    expect(s.stats().lit, '★ lit 이 실제 켜진 라이트 수와 다르다').toBe(on.length);
    expect(s.stats().skipped, '★ skipped 가 누적되지 않았다 — 회차마다 덮어쓰고 있다').toBe(3);
    expect(s.stats().lit + s.stats().skipped + s.stats().unpowered).toBe(s.stats().frames);
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
    const Base = (THREE as unknown as { MeshStandardMaterial: new (o: Record<string, unknown>) => unknown })
      .MeshStandardMaterial;
    (THREE as unknown as Record<string, unknown>).MeshStandardMaterial =
      class { constructor(o: Record<string, unknown>) { seen.push(o); return new Base(o) as object; } };

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
    const Base = (THREE as unknown as { MeshStandardMaterial: new (o: Record<string, unknown>) => unknown })
      .MeshStandardMaterial;
    (THREE as unknown as Record<string, unknown>).MeshStandardMaterial =
      class { constructor(o: Record<string, unknown>) { seen.push(o); return new Base(o) as object; } };

    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place([art()]);
    expect(seen.some((o) => 'map' in o), '★ 빈 map 키가 들어갔다').toBe(false);
  });
});
