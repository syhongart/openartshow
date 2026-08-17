// @vitest-environment node
//
// **그림이 주변 환경을 얼마나 받는가** — 감독 지시의 판정을 실행으로 잰다 (W8-7).
//
// ── 감독 지시 (2026-08-18) ────────────────────────────────────────────────
// *"그늘에 있으면 사진이 어두워. **사진은 주변환경에 영향을 안받았으면**"*
// 같은 날 두 번째: *"작품에는 **재질감 전혀없이.** 그냥 **뷰어처럼** 밝기가 보였으면해.
// 그림자 영역에서도 작품은 그대로. 밝은 곳에서도 그대로."*
//
// ── ⚠ 이 파일이 **못 재는 것** ────────────────────────────────────────────
// **화면이 실제로 어떻게 보이는지는 여기서 못 잰다.** 여기서 재는 것은 「어떤 재질이
// 어떤 인자로 만들어지는가」이고, 그것이 실기기에서 원하는 그림으로 이어지는지는
// **감독 화면이 유일한 판정**이다.
//
// ⚠⚠ 이 자리에 원래 *"`toneMapped:false` 가 WebGPU 에서 먹는지는 **이 저장소가
// 원리적으로 못 잰다**"* 라고 적혀 있었고 **거짓이었다** — 검수관이 `grep -c` 두 번으로
// 쟀다(`three.webgpu.js` 의 `toneMapped` 참조 **0건** / WebGL 빌드 4건). 실행 확인과
// **지원 여부**는 다른 일이고, 뒤쪽은 빌드를 열면 알 수 있었다. 결론과 함의는
// `decide/art-material.ts` 헤더의 「백엔드」 절 한 곳이다.
//
// **「원리적으로 못 잰다」는 확인을 생략하는 가장 편한 문장이다** — 쓰기 전에 정말 못
// 재는지를 먼저 재야 한다. 이 파일이 초록인 것도 「감독 요구가 충족됐다」가 아니다.

import { describe, it, expect } from 'vitest';
import {
  artMatSpec, readArtEnv, ART_ENV_DEFAULT, ART_ENV_MAX, ART_ENV_KNOB,
} from '../frontend/js/world2/decide/art-material.js';
import {
  createArtworkScene, textureLoaderFor, type ArtThreeNS, type ArtNode,
} from '../frontend/js/world2/systems/artwork-scene.js';
import type { ArtworkItem } from '../frontend/js/world2/decide/artwork.js';

describe('★ 노브 → 재질 명세 (순수 판정)', () => {
  it('★ 🔴 기본값은 **조명·톤매핑·안개 셋 다 안 받는다** — 감독 지시의 직접 이행', () => {
    const s = artMatSpec(ART_ENV_DEFAULT);
    expect(s.kind, '★ 기본값이 조명을 받는다 — 그늘에서 어두워진다').toBe('basic');
    expect(s.toneMapped, '★ 톤매핑을 받는다 — 밤에 같은 불만이 재발한다').toBe(false);
    // ⚠ 안개가 셋째 축이다(팀장 판정 (B)). `MeshBasicMaterial.fog` 는 **기본이 켜짐**이라
    // 조명·톤매핑을 다 떼어내고도 안개는 그대로 받고 있었다 — 밤 안개색은 거의 검정이다.
    expect(s.fog, '★ 안개를 받는다 — 먼 작품이 안개색으로 물든다').toBe(false);
  });

  it('★ 세 값이 **실제로 갈린다** — 노브가 장식이 아니다', () => {
    // ⚠ 픽스처가 두 값을 구별 못 하면 그 축은 검출력 0 이다. 셋이 서로 다른 조합인지를
    // 먼저 못 박는다 — 이 저장소가 「0 failed」로 세 번 데인 그 형태를 막는 자리다.
    const seen = [0, 1, 2].map((m) => JSON.stringify(artMatSpec(m)));
    expect(new Set(seen).size, '★ 두 값이 같은 명세를 낸다 — 비교가 성립하지 않는다').toBe(3);
  });

  it('★ 1 은 조명만 무시(톤매핑·안개는 받음), 2 는 예전 동작(대조군)', () => {
    expect(artMatSpec(1)).toEqual({ kind: 'basic', toneMapped: true, fog: true });
    expect(artMatSpec(2)).toEqual({ kind: 'standard', toneMapped: true, fog: true });
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
  it('★ 🔴 기본 세션의 **그림**은 Basic + toneMapped:false + fog:false', async () => {
    const { THREE, scene, made } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL, loadTexture: async () => ({ t: 1 }),
    });
    await s.place([art()]);
    const m = artMatOf(made);
    expect(m, '★ 텍스처가 든 재질이 없다 — 그림이 안 만들어졌다').toBeDefined();
    expect(m!.kind, '★ 그림이 조명을 받는 재질이다').toBe('basic');
    expect(m!.o.toneMapped, '★ 그림이 톤매핑을 받는다').toBe(false);
    expect(m!.o.fog, '★ 그림이 안개를 받는다 — 먼 작품이 안개색으로 물든다').toBe(false);
  });

  it('★ 🔴 Basic 에는 **PBR 인자를 안 넘긴다** — three 가 작품마다 경고 2줄을 낸다', async () => {
    // 검수관 블로커 B1(2026-08-18). 첫 판본은 두 재질 모두에 넘기며 *"Basic 이 무시한다 —
    // 넘겨도 무해하다"* 라고 적었고 **뒷 절이 거짓이었다**:
    //     THREE.Material: 'roughness' is not a property of THREE.MeshBasicMaterial.
    // 작품 N개면 2N 건인데 스모크 `[4]` 는 `console.error` 만 보므로 **아무 게이트도
    // 이것을 안 잡는다.** 감독 문언(*"재질감 전혀없이"*)과도 맞는 쪽이 안 넘기는 것이다.
    const { THREE, scene, made } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL, loadTexture: async () => ({ t: 1 }),
    });
    await s.place([art()]);
    const m = artMatOf(made);
    expect(m!.o, '★ Basic 에 roughness 를 넘긴다 — three 경고').not.toHaveProperty('roughness');
    expect(m!.o, '★ Basic 에 metalness 를 넘긴다 — three 경고').not.toHaveProperty('metalness');
  });

  it('★ 대조군(2)에는 PBR 인자가 **그대로 간다** — 예전 룩이 보존된다', async () => {
    // 위 검사만 있으면 «두 값을 통째로 지운다» 는 뮤테이션이 안 잡힌다. 대조군이
    // 예전 동작과 같아야 비교가 성립하므로 그쪽은 넘어가는 것을 함께 못 박는다.
    const { THREE, scene, made } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL, artEnv: 2, loadTexture: async () => ({ t: 1 }),
    });
    await s.place([art()]);
    const m = artMatOf(made);
    expect(m!.o.roughness, '★ 대조군의 룩이 바뀌었다').toBe(0.85);
    expect(m!.o.metalness, '★ 대조군의 룩이 바뀌었다').toBe(0);
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

  it('★ 노브 1 은 Basic 이되 톤매핑·안개를 받는다 — (가)와 (다)가 갈린다', async () => {
    const { THREE, scene, made } = makeThree();
    const s = createArtworkScene({
      THREE, scene, cellX: CELL, cellZ: CELL, artEnv: 1, loadTexture: async () => ({ t: 1 }),
    });
    await s.place([art()]);
    const m = artMatOf(made);
    expect(m!.kind).toBe('basic');
    expect(m!.o.toneMapped, '★ (가)와 (다)가 구별되지 않는다').toBe(true);
    expect(m!.o.fog, '★ (가)가 안개까지 껐다 — 대조군이 아니게 된다').toBe(true);
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

// ── 텍스처 색공간 ───────────────────────────────────────────────────────────
//
// 감독 지시 2026-08-18 두 번째: *"그냥 **뷰어처럼** 밝기가 보였으면해"*.
//
// 재질을 아무리 환경에서 떼어내도 **텍스처를 잘못 해석하면 원본이 아니다.** three r152+
// 의 `TextureLoader` 는 `colorSpace` 를 설정하지 않는데(기본 = 선형 취급) 사진 파일은
// sRGB 인코딩이라, 표시를 안 하면 셰이더가 값을 선형으로 잘못 읽고 출력에서 변환이 한 번
// 더 걸려 **원본보다 밝고 색이 바랜다.** 이 저장소의 다른 색 텍스처는 전부 표시를 주는데
// (`horizon`·`garden`·`tree`·`road`·`shadow`·`surface-paint`) **작품만 빠져 있었다.**
describe('★ 작품 텍스처의 색공간', () => {
  /** three 대역. `colorSpace` 를 **안 건드린 상태**로 시작한다(three 기본값 재현) */
  function fakeThree(loaded: Record<string, unknown>) {
    return {
      SRGBColorSpace: 'srgb',
      TextureLoader: class {
        async loadAsync(_u: string) { return loaded; }
      },
    };
  }

  it('★ 🔴 받은 텍스처에 **sRGB 를 표시한다** — 안 하면 원본보다 밝게 나온다', async () => {
    const tex: Record<string, unknown> = {};
    const load = textureLoaderFor(fakeThree(tex), (s) => s);
    expect(load, '★ 로더가 안 만들어졌다').toBeTypeOf('function');
    const got = await load!('assets/art/a.png');
    expect(got, '★ 텍스처를 안 돌려줬다').toBe(tex);
    expect(tex.colorSpace, '★ 색공간을 안 표시한다 — 「뷰어처럼」이 성립하지 않는다')
      .toBe('srgb');
  });

  it('★ 값을 **직접 적지 않고** three 가 가진 상수를 얹는다 — 값 미러링 회피', async () => {
    // three 가 상수를 바꾸면 저절로 따라와야 한다. 문자열 `'srgb'` 를 우리가 적어 두면
    // 그날 조용히 어긋난다 — 이 저장소가 색·수치 미러링으로 세 번 데인 형태다.
    const tex: Record<string, unknown> = {};
    const ns = fakeThree(tex);
    (ns as { SRGBColorSpace: unknown }).SRGBColorSpace = 'SENTINEL-없는값';
    const load = textureLoaderFor(ns, (s) => s);
    await load!('a.png');
    expect(tex.colorSpace, '★ three 상수가 아니라 우리가 적은 값을 쓴다')
      .toBe('SENTINEL-없는값');
  });

  it('로드가 실패하면 null 이고, 그때 색공간을 만지지 않는다', async () => {
    const ns = {
      SRGBColorSpace: 'srgb',
      TextureLoader: class { async loadAsync() { throw new Error('404'); } },
    };
    const load = textureLoaderFor(ns, (s) => s);
    await expect(load!('none.png')).resolves.toBeNull();
  });

  it('`TextureLoader` 가 없는 대역이면 로더 자체를 안 만든다(undefined)', () => {
    expect(textureLoaderFor({ SRGBColorSpace: 'srgb' }, (s) => s)).toBeUndefined();
  });
});
