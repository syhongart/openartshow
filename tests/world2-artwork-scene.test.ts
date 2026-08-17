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
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
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
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
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
