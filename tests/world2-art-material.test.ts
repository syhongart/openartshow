// @vitest-environment node
//
// **그림이 주변 환경을 얼마나 받는가** — 감독 지시의 판정을 실행으로 잰다 (W8-7).
//
// ── 감독 지시 (2026-08-18) ────────────────────────────────────────────────
// *"그늘에 있으면 사진이 어두워. **사진은 주변환경에 영향을 안받았으면**"*
//
// ── ⚠ 이 파일이 **못 재는 것** — 가장 중요한 것이 여기 있다 ────────────────
// **화면이 실제로 어떻게 보이는지는 여기서 못 잰다.** 여기서 재는 것은 「어떤 재질이
// 어떤 인자로 만들어지는가」이고, 그것이 실기기에서 원하는 그림으로 이어지는지는
// **감독 화면이 유일한 판정**이다(팀장 조건 1·2).
//
// 특히 `toneMapped: false` 가 **WebGPU 경로에서 먹는지**는 이 저장소가 원리적으로 못
// 잰다 — 헤드리스는 swiftshader(WebGL)다. 이 파일이 초록인 것을 「감독 요구가 충족됐다」로
// 적지 않는다.

import { describe, it, expect } from 'vitest';
import {
  artMatSpec, readArtEnv, ART_ENV_DEFAULT, ART_ENV_MAX, ART_ENV_KNOB,
} from '../frontend/js/world2/decide/art-material.js';
import { createArtworkScene, type ArtThreeNS, type ArtNode } from '../frontend/js/world2/systems/artwork-scene.js';
import type { ArtworkItem } from '../frontend/js/world2/decide/artwork.js';

describe('★ 노브 → 재질 명세 (순수 판정)', () => {
  it('★ 🔴 기본값은 **조명도 톤매핑도 안 받는다** — 감독 지시의 직접 이행', () => {
    const s = artMatSpec(ART_ENV_DEFAULT);
    expect(s.kind, '★ 기본값이 조명을 받는다 — 그늘에서 어두워진다').toBe('basic');
    expect(s.toneMapped, '★ 톤매핑을 받는다 — 밤에 같은 불만이 재발한다').toBe(false);
  });

  it('★ 세 값이 **실제로 갈린다** — 노브가 장식이 아니다', () => {
    // ⚠ 픽스처가 두 값을 구별 못 하면 그 축은 검출력 0 이다. 셋이 서로 다른 조합인지를
    // 먼저 못 박는다 — 이 저장소가 「0 failed」로 세 번 데인 그 형태를 막는 자리다.
    const seen = [0, 1, 2].map((m) => JSON.stringify(artMatSpec(m)));
    expect(new Set(seen).size, '★ 두 값이 같은 명세를 낸다 — 비교가 성립하지 않는다').toBe(3);
  });

  it('★ 1 은 조명만 무시(톤매핑은 받음), 2 는 예전 동작(대조군)', () => {
    expect(artMatSpec(1)).toEqual({ kind: 'basic', toneMapped: true });
    expect(artMatSpec(2)).toEqual({ kind: 'standard', toneMapped: true });
  });

  it('★ 🔴 범위 밖은 **기본값**으로 떨어진다 — 오타가 예전 동작을 되살리지 않게', () => {
    // 링크를 손으로 고치다 오타가 나면 감독이 «왜 안 바뀌지» 를 겪는다. 그때 보이는 것이
    // **요구대로 동작하는 기본값**이어야 한다 — 오타로 어두운 사진이 돌아오면 그것이
    // 더 나쁜 오해를 낳는다.
    for (const bad of [-1, 3, 99, NaN]) {
      expect(artMatSpec(bad), `★ ${bad} 가 기본값으로 안 떨어진다`)
        .toEqual(artMatSpec(ART_ENV_DEFAULT));
    }
  });

  it('노브 이름·상한이 노출된다 — 링크를 만드는 쪽이 값을 다시 적지 않게', () => {
    expect(ART_ENV_KNOB).toBe('artenv');
    expect(ART_ENV_MAX).toBe(2);
    // 노드에는 `location` 이 없으므로 기본값이다(그 자체가 계약이다).
    expect(readArtEnv()).toBe(ART_ENV_DEFAULT);
  });
});

// ── 집행 ────────────────────────────────────────────────────────────────────

const CELL = 24;
const art = (over: Partial<ArtworkItem> = {}): ArtworkItem =>
  ({ src: 'assets/art/a.png', x: 1, y: 2, z: 3, ry: 0, w: 2.4, ar: 1.5, ...over });

/** 재질 종류를 **갈라 센다**. 합만 보면 그림과 테두리가 뒤바뀌어도 통과한다 */
function makeThree() {
  const counts = { std: 0, basic: 0 };
  const made: { kind: string; o: Record<string, unknown> }[] = [];
  const node = (): ArtNode => {
    const kids: ArtNode[] = [];
    return {
      position: { set() {} }, rotation: { y: 0 }, children: kids,
      add(o: ArtNode) { kids.push(o); },
      remove(o: ArtNode) { const i = kids.indexOf(o); if (i >= 0) kids.splice(i, 1); },
    };
  };
  const THREE = {
    Group: class { constructor() { return node(); } },
    Object3D: class { constructor() { return node(); } },
    Mesh: class { constructor() { return node(); } },
    BoxGeometry: class { dispose() {} },
    PlaneGeometry: class { dispose() {} },
    MeshStandardMaterial: class {
      constructor(o: Record<string, unknown> = {}) { counts.std++; made.push({ kind: 'standard', o }); }
      dispose() {}
    },
    MeshBasicMaterial: class {
      constructor(o: Record<string, unknown> = {}) { counts.basic++; made.push({ kind: 'basic', o }); }
      dispose() {}
    },
    SpotLight: class {
      intensity = 0; angle = 0; penumbra = 0; distance = 0; castShadow = false;
      target = node();
      constructor(_c?: number, i?: number) { this.intensity = i ?? 0; Object.assign(this, node()); }
    },
  } as unknown as ArtThreeNS;
  return { THREE, scene: node(), counts, made };
}

/** 그림 평면 재질만 골라낸다 — **`map` 이 든 것**이 그림이다(테두리는 텍스처가 없다) */
const artMatOf = (made: { kind: string; o: Record<string, unknown> }[]) =>
  made.find((m) => 'map' in m.o);

describe('★ 집행 — 판정이 실제로 재질에 닿는가', () => {
  it('★ 🔴 기본 세션의 **그림**은 Basic + toneMapped:false', async () => {
    const { THREE, scene, made } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL, loadTexture: async () => ({ t: 1 }),
    });
    await s.place([art()]);
    const m = artMatOf(made);
    expect(m, '★ 텍스처가 든 재질이 없다 — 그림이 안 만들어졌다').toBeDefined();
    expect(m!.kind, '★ 그림이 조명을 받는 재질이다').toBe('basic');
    expect(m!.o.toneMapped, '★ 그림이 톤매핑을 받는다').toBe(false);
  });

  it('★ 🔴 **테두리는 Standard 그대로다** — 감독이 "사진은" 이라고 특정했다', async () => {
    // 테두리까지 발광시키면 액자가 공간에서 붕 뜬다. 이 검사가 그 경계를 지킨다.
    const { THREE, scene, made, counts } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL, loadTexture: async () => ({ t: 1 }),
    });
    await s.place([art()]);
    expect(counts.std, '★ Standard 재질이 하나도 없다 — 테두리까지 바꿨다')
      .toBeGreaterThan(0);
    const border = made.find((m) => m.kind === 'standard');
    expect(border!.o, '★ 테두리에 텍스처가 붙었다 — 그림과 뒤바뀐 것이다')
      .not.toHaveProperty('map');
  });

  it('★ 노브 2 면 그림도 Standard 로 돌아간다 — 대조군이 실제로 다르다', async () => {
    const { THREE, scene, made } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL, artEnv: 2, loadTexture: async () => ({ t: 1 }),
    });
    await s.place([art()]);
    const m = artMatOf(made);
    expect(m!.kind, '★ 대조군인데 Basic 이다 — 비교가 성립하지 않는다').toBe('standard');
    expect(m!.o.toneMapped).toBe(true);
  });

  it('★ 노브 1 은 Basic 이되 톤매핑을 받는다 — (가)와 (다)가 갈린다', async () => {
    const { THREE, scene, made } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL, artEnv: 1, loadTexture: async () => ({ t: 1 }),
    });
    await s.place([art()]);
    const m = artMatOf(made);
    expect(m!.kind).toBe('basic');
    expect(m!.o.toneMapped, '★ (가)와 (다)가 구별되지 않는다').toBe(true);
  });

  it('★ 텍스처를 못 받아도 재질은 선다 — 그림 하나 때문에 액자가 사라지지 않게', async () => {
    const { THREE, scene, made } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    await s.place([art()]);
    // `loadTexture` 가 없으면 `map` 키 자체를 안 넣는다(빈 map 은 three 경고를 낸다).
    expect(made.some((m) => m.kind === 'basic'), '★ 그림 재질이 아예 안 만들어졌다').toBe(true);
    expect(made.every((m) => !('map' in m.o)), '★ 빈 map 키가 들어갔다').toBe(true);
  });
});
