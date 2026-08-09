// world5 네온 발광 — **배선이 실제로 도는가.**
//
// ── 왜 이 파일이 생겼나 (감독 지시 2026-08-08 *"밤에 건물 네온"*) ───────────
// 포크 직후 발광 배선은 `features/sky.ts` 안 클로저에서 **`materialOf('lamp')` 한
// 종류만** 만지고 있었다. 그래서 마천루·광고 타워·다리에 `emissive` 를 넣어도 낮에도
// 밤에도 영원히 꺼진 채 남았다 — 감독 지시가 화면에 하나도 안 나타나는 상태였다.
//
// **그리고 그 클로저는 검사가 불가능했다.** `features/sky.ts` 가 스스로 이렇게 적어
// 두고 있었다:
//
//   *"위 `applyLampGlow` 는 클로저 안이라 테스트가 같은 식을 옆에 다시 쓰고 있고,
//     배선이 사라져도 그 테스트는 초록이다."*
//
// 대상이 넷으로 늘어나는 마당에 검출력 0 인 구조를 키울 수 없어 `systems/neon-glow.ts`
// 로 뺐다(`GroundLift` 와 같은 패턴). 이 파일은 **그 실제 코드를 부른다** — 스텁 풀을
// 넘기고, `NeonGlow` 가 재질을 실제로 만지는지 본다.
//
// 팀장 조건 5(2026-08-08): *"신설 게이트 전부에 뮤테이션 실측 1회. world3 반려 3건이
// 전부 '막았다고 적고 안 막은' 형태였다."* — 그 실측은 별도 executor 가 돌린다.
// 여기서는 **뮤테이션이 실제로 빨간불을 낼 수 있는 형태**로 단언을 짠다.

import { describe, it, expect } from 'vitest';
import { NeonGlow, type MaterialSource } from '../frontend/js/world5/systems/neon-glow.js';
import { NEON_PARTS } from '../frontend/js/world5/parts/index.js';
import { neonGlow, lampGlow, nightness, LAMP_MAX_GLOW } from '../frontend/js/world5/decide/night.js';
import { BLOOM_THRESHOLD } from '../frontend/js/world5/features/postfx-params.js';

/**
 * 스텁 풀. `InstancePools.materialOf` 의 모양만 흉내낸다.
 *
 * **실제보다 관대하면 "테스트만 통과하는 코드" 가 된다.** 그래서 `emissiveIntensity`
 * 가 있는 재질과 없는 재질을 **둘 다** 만들 수 있게 해 뒀다 — 없는 쪽은 `missing` 에
 * 들어가야 하고, 그 경로가 안 돌면 "발광을 신고했는데 아무것도 안 걸린" 상태를
 * 아무도 못 잡는다.
 */
function stubPools(kinds: readonly string[], opts: { glowless?: readonly string[] } = {}): {
  src: MaterialSource;
  mats: Map<string, { emissiveIntensity?: number }>;
} {
  const mats = new Map<string, { emissiveIntensity?: number }>();
  for (const k of kinds) {
    mats.set(k, opts.glowless?.includes(k) ? {} : { emissiveIntensity: 0 });
  }
  return { src: { materialOf: (key: string) => mats.get(key) ?? null }, mats };
}

const KINDS = NEON_PARTS.map((p) => p.kind);

describe('발광 목록은 파츠에서 유도된다 — 손으로 나열하지 않는다', () => {
  it('표본이 비어 있지 않다', () => {
    // 빈 목록은 아래 단언을 **전부 통과시킨다.** 이 저장소가 빈 표본으로 통과한
    // 전례가 여럿이다.
    expect(NEON_PARTS.length).toBeGreaterThan(2);
  });

  it('감독이 지시한 네온 대상이 실제로 신고돼 있다', () => {
    // *"밤에 건물 네온. 건물 외벽 조명도 넣고."* — 마천루·광고 타워·다리가 빠지면
    // 그 지시가 화면에 안 나타난다. 포크 직후가 정확히 그 상태였다.
    expect(KINDS).toContain('lamp');
    expect(KINDS).toContain('tower');
    expect(KINDS).toContain('clock');
    expect(KINDS).toContain('bridge');
  });

  it('세기 값이 유효 범위다 — 음수·역전은 배선을 조용히 깨뜨린다', () => {
    for (const p of NEON_PARTS) {
      expect(p.day, `${p.kind}.day`).toBeGreaterThanOrEqual(0);
      expect(p.night, `${p.kind}.night`).toBeGreaterThanOrEqual(0);
      // 낮이 밤보다 밝은 발광은 이 세계에서 성립하지 않는다. 그런 값이 필요해지면
      // 그것은 발광이 아니라 다른 축이다.
      expect(p.night, `${p.kind}: 낮이 밤보다 밝다`).toBeGreaterThanOrEqual(p.day);
    }
  });
});

describe('`neonGlow` 는 가로등 곡선의 일반화다', () => {
  // 이 동치가 이 설계의 근거다. 가로등만 재던 기존 검사들이 `lampGlow` 를 부르는데,
  // 실제 배선은 이제 `neonGlow` 를 탄다 — 두 함수가 갈리는 순간 그 검사들은 **참인데
  // 아무것도 지키지 않는** 상태가 된다.
  const LAMP = { day: 0, night: LAMP_MAX_GLOW };

  it('lamp 신고로 부르면 `lampGlow` 와 값이 같다', () => {
    for (const t of ['day', 'sunset', 'night']) {
      const n = nightness(t);
      expect(neonGlow(LAMP, n), `time=${t}`).toBeCloseTo(lampGlow(n), 12);
    }
    // 경계 밖도 본다 — 클램프가 양쪽에서 같아야 한다.
    for (const n of [-1, 0, 0.001, 0.5, 1, 2]) {
      expect(neonGlow(LAMP, n), `n=${n}`).toBeCloseTo(lampGlow(n), 12);
    }
  });

  it('파츠에 적힌 lamp 신고가 실제로 그 값이다 — 신고가 바뀌면 위 동치가 깨진다', () => {
    const lamp = NEON_PARTS.find((p) => p.kind === 'lamp')!;
    expect(lamp.day).toBe(0);
    expect(lamp.night).toBe(LAMP_MAX_GLOW);
  });

  it('낮에는 `day` 값 그대로, 밤에는 `night` 값 그대로', () => {
    const spec = { day: 0.25, night: 1 };
    expect(neonGlow(spec, nightness('day'))).toBe(0.25);
    expect(neonGlow(spec, nightness('night'))).toBe(1);
  });

  it('노을에서 이미 절반 넘게 올라온다 — 늦게 켜지면 "늦었다" 는 인상이 남는다', () => {
    const spec = { day: 0, night: 1 };
    const s = neonGlow(spec, nightness('sunset'));
    expect(s).toBeGreaterThan(0.5);
    expect(s).toBeLessThan(1);
  });
});

describe('`NeonGlow` 가 재질을 실제로 만진다', () => {
  // ⚠️ 이 자리에 **항진명제**가 있었다 (검수관 블로커 B3, 2026-08-08).
  //
  //     const { src } = stubPools(KINDS);   // KINDS = NEON_PARTS.map(p => p.kind)
  //     expect(g.wired).toBe(NEON_PARTS.length);
  //     expect(g.missing).toEqual([]);
  //
  // 스텁을 `NEON_PARTS` 로 만들어 놓고 "`NEON_PARTS` 전부가 배선됐다" 를 단언했으니
  // **구성상 반드시 참**이다. 검출력 0 이었다.
  //
  // 정작 막아야 할 것 — *"파츠가 `neon` 을 신고했는데 그 파츠의 **실제 재질**에
  // `emissiveIntensity` 가 없다"* — 는 아무 검사도 안 봤다. 그러면 `NeonGlow.missing`
  // 에 들어가 **조용히 안 빛나고**, 그것이 정확히 이 파일이 고치겠다고 선언한 사고다.
  //
  // 실물을 보는 검사는 아래 "발광 신고와 실제 자산이 맞는다" 로 옮겼다.
  it('스텁이 신고 목록을 덮으면 전부 배선된다 — 배선 로직 자체의 정상 경로', () => {
    // 이것은 **`NeonGlow` 의 생성자 로직**을 보는 검사이지 파츠를 보는 검사가 아니다.
    // 그 구분을 이름에 적어 둔다 — 안 적으면 다음 사람이 다시 "파츠가 다 배선됐다" 로
    // 읽는다(B3 이 정확히 그 오독이었다).
    const { src } = stubPools(KINDS);
    const g = new NeonGlow(src);
    expect(g.wired).toBe(NEON_PARTS.length);
    expect(g.missing).toEqual([]);
  });

  it('밤에 세기가 올라간다 — 이것이 감독 지시가 화면에 나타나는 지점이다', () => {
    const { src, mats } = stubPools(KINDS);
    const g = new NeonGlow(src);
    g.apply('night');
    for (const p of NEON_PARTS) {
      expect(mats.get(p.kind)!.emissiveIntensity, `${p.kind} 밤`).toBeCloseTo(p.night, 12);
    }
  });

  it('낮에는 `day` 값으로 떨어진다 — 광고 스크린은 낮에도 켜져 있다', () => {
    const { src, mats } = stubPools(KINDS);
    const g = new NeonGlow(src);
    g.apply('day');
    for (const p of NEON_PARTS) {
      expect(mats.get(p.kind)!.emissiveIntensity, `${p.kind} 낮`).toBeCloseTo(p.day, 12);
    }
    // 광고 타워는 낮에 꺼지면 검은 판때기가 된다 — 0 이 아니어야 한다.
    expect(mats.get('clock')!.emissiveIntensity).toBeGreaterThan(0);
    // 가로등은 반대다. 낮에 켜져 있으면 점으로 뜬다.
    expect(mats.get('lamp')!.emissiveIntensity).toBe(0);
  });

  it('멱등하다 — 몇 번 불러도 결과가 같다', () => {
    // 매 프레임 곱하는 구조였다면 발산한다. 시간대에서 매번 다시 계산하는지 본다.
    const { src, mats } = stubPools(KINDS);
    const g = new NeonGlow(src);
    g.apply('night');
    const once = mats.get('tower')!.emissiveIntensity;
    for (let i = 0; i < 5; i++) g.apply('night');
    expect(mats.get('tower')!.emissiveIntensity).toBe(once);
  });

  it('시간대를 오가도 값이 정확히 돌아온다', () => {
    const { src, mats } = stubPools(KINDS);
    const g = new NeonGlow(src);
    g.apply('night');
    g.apply('day');
    g.apply('night');
    const tower = NEON_PARTS.find((p) => p.kind === 'tower')!;
    expect(mats.get('tower')!.emissiveIntensity).toBeCloseTo(tower.night, 12);
  });

  it('**재질이 없거나 발광 못 하는 파츠는 `missing` 에 남는다** — 조용히 넘어가지 않는다', () => {
    // 이것이 포크 직후의 실제 상태다: 신고는 있는데 배선이 닿지 않아 영원히 꺼져
    // 있었고, 화면에서는 "그냥 좀 어두운" 것으로만 보였다.
    const { src } = stubPools(KINDS, { glowless: ['tower'] });
    const g = new NeonGlow(src);
    expect(g.missing).toContain('tower');
    expect(g.wired).toBe(NEON_PARTS.length - 1);
  });

  it('풀에 아예 없는 파츠도 `missing` 이다', () => {
    const { src } = stubPools(KINDS.filter((k) => k !== 'bridge'));
    const g = new NeonGlow(src);
    expect(g.missing).toContain('bridge');
  });
});

describe('네온이 블룸 문턱을 넘는다 — 넘지 못하면 켜도 화면이 그대로다', () => {
  // world3 회차에서 이 축이 실제로 죽어 있었다: 문턱 0.85 에 휘도 0.805 라 **블룸이
  // 정상 동작하면서 걸리는 픽셀이 0** 이었고, 감독 화면에는 *"가로등 똑같은데"* 로만
  // 나타났다. 코드도 설정도 멀쩡한데 결과만 없는 형태다.
  //
  // ⚠️ **못 재는 것**: 여기서 보는 것은 `emissiveIntensity` 이지 최종 화면 휘도가
  // 아니다. 실제로 걸리는 픽셀 수는 톤매핑·색공간·백엔드를 거친 뒤에 정해지고,
  // **헤드리스는 WebGL·감독 실기기는 WebGPU** 라 그 경로가 다르다. 이 검사는
  // "세기가 문턱 아래로 내려가는 것"을 막을 뿐, 켜졌다는 증명이 아니다.
  it('밤 세기가 문턱보다 크다', () => {
    for (const p of NEON_PARTS) {
      const lit = neonGlow(p, nightness('night'));
      expect(lit, `${p.kind}: 밤 세기가 블룸 문턱 이하다`).toBeGreaterThan(BLOOM_THRESHOLD);
    }
  });

  it('여유가 실재한다 — 문턱에 겨우 닿는 값은 다음 조정에서 죽는다', () => {
    for (const p of NEON_PARTS) {
      const lit = neonGlow(p, nightness('night'));
      expect(lit, `${p.kind}: 여유 없음`).toBeGreaterThan(BLOOM_THRESHOLD * 1.2);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// G3 — **실물 재질을 굽는다.** 스텁 풀은 배선 로직만 보고 파츠는 안 본다
// ══════════════════════════════════════════════════════════════════════════
//
// 위 검사들은 전부 `stubPools` 로 만든 가짜 재질을 만진다. 그것이 검증하는 것은
// `NeonGlow` 의 **로직**이고, 파츠가 실제로 발광 가능한 재질을 굽는지는 **하나도 안
// 본다**. 검수관 블로커 B3 가 지적한 자리다 — 스텁을 `NEON_PARTS` 로 만들어 놓고
// "`NEON_PARTS` 전부가 배선됐다" 를 단언하면 구성상 반드시 참이라 검출력이 0 이다.
//
// 실제로 깨질 수 있는 형태는 이것이다: 파츠가 `neon` 을 신고했는데 `asset()` 이
// `emissive` 를 안 넣거나, `emissiveIntensity` 를 빼먹거나, `emissiveMap` 없이 굽는다.
// 그러면 런타임에서 `NeonGlow` 는 재질을 찾아 값을 쓰지만 **화면은 그대로다**
// (`emissive` 가 검정이면 세기를 곱해도 검정이고, 맵이 없으면 면 전체가 균일하게 뜬다).
//
// 그래서 여기서는 **실제 three 로 `asset(T)` 를 돌린다.** 캔버스만 스텁이다 —
// jsdom 에 네이티브 canvas 가 없어 2D 컨텍스트를 흉내내야 하는데, 파츠가 캔버스에
// 무엇을 그리는지는 이 게이트의 관심사가 아니다(색 축은 팔레트 이설 검증이 봤다).
import * as T3 from 'three';
import { PARTS } from '../frontend/js/world5/parts/index.js';
import type { ThreeNS } from '../frontend/js/world5/parts/types.js';

/** 2D 컨텍스트 스텁 — 호출을 받아 넘기기만 한다. 그린 결과는 이 게이트의 축이 아니다 */
function stubCanvas() {
  const ctx: Record<string, unknown> = {
    fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1, font: '', textAlign: '',
    textBaseline: '', globalCompositeOperation: 'source-over',
  };
  for (const m of [
    'fillRect', 'strokeRect', 'clearRect', 'beginPath', 'closePath', 'moveTo', 'lineTo',
    'arc', 'ellipse', 'rect', 'fill', 'stroke', 'save', 'restore', 'translate', 'rotate',
    'scale', 'setTransform', 'fillText', 'strokeText', 'drawImage', 'quadraticCurveTo',
    'bezierCurveTo', 'clip', 'setLineDash',
  ]) ctx[m] = () => {};
  ctx.createLinearGradient = () => ({ addColorStop: () => {} });
  ctx.createRadialGradient = () => ({ addColorStop: () => {} });
  ctx.measureText = () => ({ width: 10 });
  ctx.getImageData = () => ({ data: new Uint8ClampedArray(4) });
  ctx.putImageData = () => {};
  return { width: 1, height: 1, getContext: () => ctx };
}

/**
 * `asset()` 을 부르는 동안만 `document.createElement('canvas')` 를 스텁으로 돌린다.
 * 전역을 영구히 바꾸면 다른 테스트 파일이 그것을 물려받아, 이 파일을 지워도 남는다.
 */
function withCanvas<R>(fn: () => R): R {
  const g = globalThis as { document?: unknown };
  const had = 'document' in g;
  const prev = g.document;
  g.document = { createElement: (tag: string) => (tag === 'canvas' ? stubCanvas() : {}) };
  try {
    return fn();
  } finally {
    if (had) g.document = prev; else delete g.document;
  }
}

describe('G3 — 발광을 신고한 파츠가 실제로 발광 가능한 재질을 굽는다', () => {
  // `NEON_PARTS` 는 kind 만 들고 있다. 실물 스펙을 찾아 `asset` 을 부른다.
  const specs = NEON_PARTS.map((n) => {
    const spec = PARTS.find((p) => p.kind === n.kind);
    if (!spec) throw new Error(`발광 신고 파츠 '${n.kind}' 가 PARTS 에 없다`);
    return { n, spec };
  });

  it('표본이 `NEON_PARTS` 전부를 덮는다', () => {
    expect(specs.length).toBe(NEON_PARTS.length);
    expect(specs.length).toBeGreaterThan(0);
  });

  for (const { n, spec } of specs) {
    it(`${n.kind} — emissive 가 검정이 아니고 세기가 숫자이며 맵이 있다`, () => {
      const built = withCanvas(() => spec.asset(T3 as unknown as ThreeNS));
      const mat = built.material as unknown as {
        emissive?: { getHex(): number };
        emissiveIntensity?: number;
        emissiveMap?: unknown;
      };

      // ⚠️ ① 자리에 **또 항진명제가 있었다** — `expect(typeof mat.emissiveIntensity)
      //    .toBe('number')`. B3 를 고치면서 같은 형태를 한 칸 옆에 다시 만든 것이다.
      //
      //    뮤테이션 실측이 잡았다(2026-08-08): `bridge.ts` 의 `emissiveIntensity: 1,`
      //    줄을 통째로 지워도 **안 깨졌다.** 원인은 three 다 —
      //    `new MeshStandardMaterial({})` 의 `emissiveIntensity` 기본값이 **1**이라
      //    (실측: `emissive` 는 `0x000000`, `emissiveMap` 은 `null`), 파츠가 무엇을
      //    하든 이 단언은 항상 참이다. 검출력이 구조적으로 0 이었다.
      //
      //    그리고 그 뮤테이션은 **결함도 아니었다** — 기본값이 1 이므로 명시하든 말든
      //    화면이 같다. 즉 이 축은 실물 재질에서 잴 것이 없다. 스텁 재질(`{}`)에서만
      //    의미가 있고, 그것은 위 `missing` 검사가 이미 본다.
      //
      //    잴 것이 없는 축을 지우는 대신 **잴 것이 있는 축으로 바꾼다** — 아래 별도
      //    describe 가 실물 재질을 실물 `NeonGlow` 에 물려 값이 실제로 들어가는지 본다.
      //    `emissive`·`emissiveMap` 은 기본값이 각각 검정·null 이라 아래 두 단언은
      //    파츠가 실제로 넣어야만 통과한다(뮤테이션 M9·M10 이 둘 다 잡았다).

      // ② `emissive` 색이 검정이 아니다. 검정이면 세기를 아무리 올려도 곱해서 0 이다 —
      //    "값은 올라갔는데 화면은 그대로" 라는 가장 잡기 어려운 형태가 된다.
      expect(mat.emissive).toBeDefined();
      expect(mat.emissive!.getHex()).not.toBe(0x000000);

      // ③ 발광 **맵**이 있다. 이 세계의 네온은 전부 "재질 하나 · 텍셀로 부위를 가른다"
      //    기법이라(`tower.ts`·`bridge.ts`·`clocktower.ts` 주석), 맵이 없으면 창문만
      //    빛나야 할 것이 벽 전체로 번진다.
      expect(mat.emissiveMap).toBeTruthy();
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// G3-b — **실물 재질 × 실물 `NeonGlow`.** 위 두 층이 각각 옳아도 안 이어질 수 있다
// ══════════════════════════════════════════════════════════════════════════
//
// 위 `stubPools` 검사는 `NeonGlow` 의 로직만 보고, G3 검사는 파츠가 굽는 재질만 본다.
// **둘을 잇는 지점은 어느 쪽도 안 본다** — 이 저장소가 "판정/집행 경계는 아무도 안
// 본다" 로 이미 데인 자리다(`CLAUDE.md` 검증 규율).
//
// 여기서는 파츠가 실제로 구운 재질을 `NeonGlow` 에 물려 **밤에 신고한 값이 그 재질에
// 들어가는지**를 본다. `emissiveIntensity` 는 three 기본값이 1 이라 "숫자인가" 로는
// 아무것도 못 재지만, "밤에 **신고한 night 값**이 되는가" 는 파츠·신고·배선 셋이 전부
// 이어져야만 참이 된다.
describe('G3-b — 실물 재질이 `NeonGlow` 로 실제로 켜진다', () => {
  it('밤에 모든 신고 파츠의 세기가 신고한 night 값이 된다', () => {
    const mats = new Map<string, { emissiveIntensity?: number }>();
    withCanvas(() => {
      for (const n of NEON_PARTS) {
        const spec = PARTS.find((p) => p.kind === n.kind)!;
        mats.set(n.kind, spec.asset(T3 as unknown as ThreeNS).material as unknown as {
          emissiveIntensity?: number;
        });
      }
    });
    const g = new NeonGlow({ materialOf: (k: string) => mats.get(k) ?? null });
    g.apply('night');

    // 실물 재질은 전부 발광 가능하므로 `missing` 이 비어야 한다. 하나라도 남으면
    // 그 파츠는 런타임에서 영원히 안 빛난다 — 감독 지시가 화면에 안 나타나는 상태다.
    expect(g.missing).toEqual([]);
    expect(g.wired).toBe(NEON_PARTS.length);

    for (const n of NEON_PARTS) {
      expect(mats.get(n.kind)!.emissiveIntensity).toBeCloseTo(n.night, 6);
    }
  });

  it('낮으로 되돌리면 day 값으로 정확히 내려간다', () => {
    const mats = new Map<string, { emissiveIntensity?: number }>();
    withCanvas(() => {
      for (const n of NEON_PARTS) {
        const spec = PARTS.find((p) => p.kind === n.kind)!;
        mats.set(n.kind, spec.asset(T3 as unknown as ThreeNS).material as unknown as {
          emissiveIntensity?: number;
        });
      }
    });
    const g = new NeonGlow({ materialOf: (k: string) => mats.get(k) ?? null });
    g.apply('night');
    g.apply('day');
    for (const n of NEON_PARTS) {
      expect(mats.get(n.kind)!.emissiveIntensity).toBeCloseTo(n.day, 6);
    }
  });
});
