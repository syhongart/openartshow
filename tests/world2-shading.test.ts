// @vitest-environment node
//
// 셰이딩 뷰(머티리얼 / 솔리드 / 와이어) — **판정과 집행을 함께** 본다.
//
// 감독 지시 2026-08-13: *"그리고 와이어 프레임 뷰. 솔리드 뷰도 구현해줘."*
//
// ── 왜 순수 축만으로는 모자란가 ─────────────────────────────────────────────
// `decide/shading.ts` 가 옳아도 `features/shading.ts` 가 그 명세를 안 쓰면 아무 테스트도
// 안 깨진다 — 이 저장소가 반복해서 배운 형태다(«판정/집행 경계를 건너는 지점은 아무도 안
// 본다». 구름 `alpha` 미소비가 순수 함수 안에서만 검사됐고 정작 통합 지점은 무방비였다).
// 그래서 스텁 three 로 **실제 기능 코드를 돌려** `scene.overrideMaterial` 을 읽는다
// (`tests/world2-postfx-time.test.ts` 가 세운 방식).
//
// ── 대역이 실물의 핵심 성질을 갖게 만든다 ───────────────────────────────────
// 뮤테이션 `0 failed` 의 네 번째 원인이 **«대역이 실물의 핵심 성질을 안 가짐»** 이었다
// (W5 E3 에서 mock `resolveMove` 가 충돌 캐시 범위를 안 흉내내 42축이 전부 헛돌았다).
// 여기서 실물의 핵심 성질은 둘이고 대역이 **둘 다** 갖는다:
//
//   ① 생성자 파라미터를 실제로 보관한다 → `wireframe: true` 가 전달됐는지 잴 수 있다
//   ② **솔리드용과 와이어용이 서로 다른 클래스다** → 둘을 바꿔치는 뮤테이션이 잡힌다.
//      한 클래스로 두면 `mats.solid` 와 `mats.wire` 를 맞바꿔도 `instanceof` 가 같아
//      이 파일 전체가 그 결함을 통과시킨다
//
// ── 이 파일이 **못** 재는 것 (통과를 근거로 쓰지 않는다) ────────────────────
// 헤드리스는 코어 `WebGLRenderer`(swiftshader)이고 `WebGLPrograms` 캐시키에 `wireframe` 이
// **없다.** 셰이딩 전환이 파이프라인·정점 처리량에 미치는 영향은 **원리적으로 못 잰다** —
// 감독 실기기가 유일한 판정 축이다. 여기서 지키는 것은 «어느 재질이 어느 모드에서 씬에
// 꽂히는가» 라는 정합까지다.

import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  SHADING_LABEL, SHADING_MODES, overrides, safeBack, shadingSpec, toggleWire,
  type ShadingMode,
} from '../frontend/js/world2/decide/shading.js';

// ── three 대역 ──────────────────────────────────────────────────────────────

class FakeMaterial {
  color?: number;
  roughness?: number;
  metalness?: number;
  wireframe?: boolean;
  vertexColors?: boolean;
  disposed = false;
  constructor(p: Record<string, unknown>) { Object.assign(this, p); }
  dispose(): void { this.disposed = true; }
}
/** ⚠ 두 클래스를 **가른다** — 위 헤더 ②. 합치면 바꿔치기 뮤테이션이 통과한다 */
class FakeStandard extends FakeMaterial {}
class FakeBasic extends FakeMaterial {}

vi.mock('three/webgpu', () => ({
  MeshStandardMaterial: FakeStandard,
  MeshBasicMaterial: FakeBasic,
}));

type SceneStub = {
  overrideMaterial: FakeMaterial | null;
  /** 대입 **횟수**. 폴링이 매 프레임 씬을 만지지 않는가를 재는 축 */
  writes: number;
};

function makeScene(): SceneStub {
  const s: SceneStub = { overrideMaterial: null, writes: 0 };
  let v: FakeMaterial | null = null;
  Object.defineProperty(s, 'overrideMaterial', {
    get: () => v,
    set: (next: FakeMaterial | null) => { v = next; s.writes++; },
  });
  return s;
}

/** 기능이 실제로 읽는 것만 채운 `FeatureEnv` 대역 */
function makeEnv(scene: SceneStub, start: ShadingMode) {
  let mode = start;
  return {
    env: {
      scene,
      shading: () => mode,
      setShading: (m: ShadingMode) => { mode = m; },
    } as never,
    set: (m: ShadingMode) => { mode = m; },
  };
}

let shadingFeature: typeof import('../frontend/js/world2/features/shading.js')['shadingFeature'];

beforeAll(async () => {
  ({ shadingFeature } = await import('../frontend/js/world2/features/shading.js'));
});

// ── 판정 ────────────────────────────────────────────────────────────────────

describe('셰이딩 — 재질 명세', () => {
  it('머티리얼은 오버라이드를 안 건다', () => {
    expect(shadingSpec('material').kind, '★ 기본 모드가 오버라이드를 건다').toBe('none');
    expect(overrides('material')).toBe(false);
  });

  it('솔리드는 조명을 받고 와이어는 안 받는다', () => {
    expect(shadingSpec('solid').lit, '★ 솔리드가 조명을 안 받으면 덩어리가 안 보인다').toBe(true);
    // 선의 밝기가 시간대에 따라 변하면 밤에 안 보인다 — 도구는 시간대와 무관해야 한다.
    expect(shadingSpec('wire').lit, '★ 와이어가 조명을 받으면 밤에 사라진다').toBe(false);
  });

  it('와이어만 wireframe 플래그를 켠다', () => {
    expect(shadingSpec('wire').wireframe, '★ 와이어인데 선이 안 그려진다').toBe(true);
    expect(shadingSpec('solid').wireframe, '★ 솔리드가 선으로 그려진다').toBe(false);
    expect(shadingSpec('material').wireframe).toBe(false);
  });

  it('솔리드와 와이어의 색이 서로 다르다', () => {
    // 같으면 «어느 모드인지» 를 화면 색으로 구별할 수 없다.
    expect(shadingSpec('solid').color).not.toBe(shadingSpec('wire').color);
  });

  it('솔리드는 무채색이다 — 색이 남으면 «재질이 아직 있나» 로 읽힌다', () => {
    const c = shadingSpec('solid').color;
    const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
    expect(Math.max(r, g, b) - Math.min(r, g, b), '★ 솔리드 색의 채도가 0이 아니다')
      .toBeLessThanOrEqual(8);
  });

  it('overrides 는 셋 중 둘에만 참이다', () => {
    expect(SHADING_MODES.filter(overrides)).toEqual(['solid', 'wire']);
  });
});

describe('셰이딩 — Shift+Z 토글', () => {
  it('머티리얼에서 누르면 와이어, 다시 누르면 머티리얼', () => {
    const a = toggleWire('material', 'material');
    expect(a.mode).toBe('wire');
    const b = toggleWire(a.mode, a.back);
    expect(b.mode, '★ 와이어에서 돌아오지 않는다').toBe('material');
  });

  it('솔리드에서 갔다 오면 **솔리드**로 돌아온다 — 머티리얼로 튕기지 않는다', () => {
    // 블렌더의 `Shift+Z` 가 «와이어 ↔ 직전» 인 이유. 머티리얼로 튕기면 솔리드로 보던
    // 작업이 매번 끊긴다.
    const a = toggleWire('solid', 'solid');
    expect(a.mode).toBe('wire');
    expect(a.back).toBe('solid');
    const b = toggleWire(a.mode, a.back);
    expect(b.mode, '★ 직전 모드가 아니라 머티리얼로 돌아왔다').toBe('solid');
  });

  it('돌아갈 자리가 wire 가 되는 일은 **구조적으로** 없다', () => {
    // 되면 «와이어에서 토글했더니 또 와이어» 가 된다 — 키가 죽은 것으로 보인다.
    for (const cur of SHADING_MODES) {
      for (const back of SHADING_MODES) {
        expect(toggleWire(cur, back).back, `★ back 이 wire 가 됐다 (cur=${cur} back=${back})`)
          .not.toBe('wire');
      }
    }
  });

  it('와이어로 시작한 세션은 머티리얼로 돌아간다', () => {
    expect(safeBack('wire'), '★ ?shading=wire 세션의 돌아갈 자리가 wire 다').toBe('material');
    expect(safeBack('solid'), '★ 솔리드로 시작했는데 돌아갈 자리가 바뀌었다').toBe('solid');
    expect(safeBack('material')).toBe('material');
  });
});

describe('셰이딩 — 라벨', () => {
  it('모든 모드에 이름이 있다', () => {
    // 버튼(`panel/dom.ts`)이 `SHADING_MODES` 를 순회해 라벨을 찾으므로, 하나라도 비면
    // 화면에 `undefined` 버튼이 생긴다.
    for (const m of SHADING_MODES) {
      expect(SHADING_LABEL[m], `★ ${m} 의 이름이 없다`).toBeTruthy();
    }
  });

  it('이름이 서로 다르다', () => {
    expect(new Set(SHADING_MODES.map((m) => SHADING_LABEL[m])).size).toBe(SHADING_MODES.length);
  });
});

// ── 집행 (판정/집행 경계) ───────────────────────────────────────────────────

describe('셰이딩 집행 — 씬에 실제로 꽂히는가', () => {
  it('머티리얼로 부팅하면 오버라이드가 없다', () => {
    const scene = makeScene();
    const { env } = makeEnv(scene, 'material');
    shadingFeature.create(env);
    expect(scene.overrideMaterial, '★ 기본 세션에 오버라이드가 걸렸다').toBeNull();
  });

  it('?shading=wire 로 부팅하면 **첫 프레임 전에** 이미 와이어다', () => {
    // System 의 첫 `update` 를 기다리면 한 프레임 깜빡인다.
    const scene = makeScene();
    const { env } = makeEnv(scene, 'wire');
    shadingFeature.create(env);
    expect(scene.overrideMaterial, '★ 부팅 모드가 즉시 반영되지 않는다').toBeInstanceOf(FakeBasic);
  });

  it('솔리드와 와이어가 **서로 다른 재질**로 간다', () => {
    const scene = makeScene();
    const { env, set } = makeEnv(scene, 'material');
    const inst = shadingFeature.create(env)!;

    set('solid');
    inst.system!.update({} as never);
    const solid = scene.overrideMaterial;
    expect(solid, '★ 솔리드가 표준 재질이 아니다').toBeInstanceOf(FakeStandard);

    set('wire');
    inst.system!.update({} as never);
    expect(scene.overrideMaterial, '★ 와이어가 기본 재질이 아니다').toBeInstanceOf(FakeBasic);
    expect(scene.overrideMaterial, '★ 솔리드와 와이어가 같은 것을 꽂는다').not.toBe(solid);
  });

  it('와이어 재질은 wireframe 이 켜져 있고 솔리드는 꺼져 있다', () => {
    // 렌더러가 `material.wireframe === true` 를 **직접** 읽어 토폴로지를 가른다
    // (`WebGPUUtils.js:72`). 이 플래그가 안 서면 선이 아니라 면이 그려진다.
    const scene = makeScene();
    const { env, set } = makeEnv(scene, 'wire');
    const inst = shadingFeature.create(env)!;
    expect(scene.overrideMaterial!.wireframe, '★ 와이어 재질에 wireframe 이 안 섰다').toBe(true);

    set('solid');
    inst.system!.update({} as never);
    expect(scene.overrideMaterial!.wireframe, '★ 솔리드가 선으로 그려진다').toBeFalsy();
  });

  it('명세의 색을 그대로 쓴다 — 재질이 자기 색을 지어내지 않는다', () => {
    const scene = makeScene();
    const { env, set } = makeEnv(scene, 'solid');
    const inst = shadingFeature.create(env)!;
    expect(scene.overrideMaterial!.color, '★ 솔리드 색이 명세와 다르다')
      .toBe(shadingSpec('solid').color);

    set('wire');
    inst.system!.update({} as never);
    expect(scene.overrideMaterial!.color, '★ 와이어 색이 명세와 다르다')
      .toBe(shadingSpec('wire').color);
  });

  it('정점 색을 끈다 — 안 끄면 «단색» 이 아니게 된다', () => {
    // 벤치·화분이 `vertexColors: true` 이고 인스턴스도 색을 갖는다.
    const scene = makeScene();
    const { env } = makeEnv(scene, 'solid');
    shadingFeature.create(env);
    expect(scene.overrideMaterial!.vertexColors, '★ 솔리드에 파츠 색이 남는다').toBe(false);
  });

  it('머티리얼로 되돌리면 오버라이드를 **지운다**', () => {
    // 이것을 빠뜨리면 한 번 와이어를 켠 세션이 영원히 와이어로 남는다.
    const scene = makeScene();
    const { env, set } = makeEnv(scene, 'wire');
    const inst = shadingFeature.create(env)!;
    set('material');
    inst.system!.update({} as never);
    expect(scene.overrideMaterial, '★ 되돌렸는데 화면이 여전히 와이어다').toBeNull();
  });

  it('모드가 그대로면 씬을 다시 안 만진다 — 폴링이 공짜여야 한다', () => {
    const scene = makeScene();
    const { env } = makeEnv(scene, 'solid');
    const inst = shadingFeature.create(env)!;
    const before = scene.writes;
    for (let i = 0; i < 10; i++) inst.system!.update({} as never);
    expect(scene.writes, '★ 안 바뀌었는데 매 프레임 재질을 다시 꽂는다').toBe(before);
  });

  it('드로우콜 그룹 키가 모드를 구별하고 **null 을 안 낸다**', () => {
    // `null` 을 내면 그 프레임 표본이 판정에서 통째로 빠진다. `npc`·`glb-city` 가 조건
    // 없이 `null` 을 내는 바람에 기본 구성의 draw 축이 영원히 안 재지고 있다 — 그 목록을
    // 늘리지 않는다(`features/types.ts` 의 `drawGroupKeyOf` 헤더).
    const scene = makeScene();
    const { env, set } = makeEnv(scene, 'material');
    const inst = shadingFeature.create(env)!;
    const keys = new Set<string | null>();
    for (const m of SHADING_MODES) {
      set(m);
      inst.system!.update({} as never);
      const k = inst.drawGroupKey!();
      expect(k, `★ ${m} 에서 드로우콜 판정이 유예됐다`).not.toBeNull();
      keys.add(k);
    }
    expect(keys.size, '★ 세 모드가 같은 판정 그룹으로 묶인다').toBe(SHADING_MODES.length);
  });

  it('진단이 지금 모드를 말한다', () => {
    const scene = makeScene();
    const { env, set } = makeEnv(scene, 'material');
    const inst = shadingFeature.create(env)!;
    set('wire');
    inst.system!.update({} as never);
    expect(inst.diagnostics!()).toEqual({ mode: 'wire' });
  });

  it('정리하면 씬에서 떼고 재질을 반납한다', () => {
    const scene = makeScene();
    const { env } = makeEnv(scene, 'wire');
    const inst = shadingFeature.create(env)!;
    const wire = scene.overrideMaterial!;
    inst.dispose!();
    expect(scene.overrideMaterial, '★ 페이지를 떠나는데 오버라이드가 남는다').toBeNull();
    expect(wire.disposed, '★ 와이어 재질이 반납되지 않았다').toBe(true);
  });
});
