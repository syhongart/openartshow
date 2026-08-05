// 지면 알베도 — 판정과 **집행**.
//
// 이 축이 지켜야 할 것은 두 가지다. ① 밤에 지면이 실제로 밝아지는가(감독 지시
// *"정상적으로 밝은 느낌 나게 해"*) ② **대비가 안 바뀌는가.** ②가 이 파일의 핵심이다 —
// 파츠별로 다른 배수를 걸어 대비를 좁힌 첫 판본이 감독 판정으로 철회됐고, 그 실수가
// 다시 들어오는 것을 여기서 막는다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  GROUND_KEYS, DAY_ALBEDO, MAX_LIFT, NIGHT_GROUND_LIFT, srgbLuminance, groundLift,
} from '../frontend/js/world2/decide/ground-albedo.js';
import { GroundLift, type MaterialSource } from '../frontend/js/world2/systems/ground-lift.js';
import { hexCss } from '../frontend/js/world2/parts/color.js';
import { PARTS } from '../frontend/js/world2/parts/index.js';
import { ground } from '../frontend/js/world2/parts/ground.js';
import { ASPHALT_BASE } from '../frontend/js/world2/parts/road.js';

const W2 = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'js', 'world2');

describe('휘도는 감마를 푼다 — 안 풀면 상한이 통째로 틀린다', () => {
  it('sRGB 채널 평균과 확연히 다르다', () => {
    // 아스팔트 `#2a2d33` 의 sRGB 채널 평균은 0.18 인데 선형 휘도는 0.026 이다. 감마를
    // 안 풀면 7배 밝게 계산되고, 그 값에서 나온 상한은 아무 의미가 없다.
    const srgbMean = (0x2a + 0x2d + 0x33) / 3 / 255;
    expect(srgbMean).toBeGreaterThan(0.15);
    expect(srgbLuminance(ASPHALT_BASE)).toBeLessThan(srgbMean / 4);
  });

  it('흰색은 1, 검정은 0', () => {
    expect(srgbLuminance(0xffffff)).toBeCloseTo(1, 6);
    expect(srgbLuminance(0x000000)).toBe(0);
  });

  it('중간 회색은 선형 0.5 가 아니다 — sRGB 는 지각 균등이지 선형이 아니다', () => {
    expect(srgbLuminance(0x808080)).toBeLessThan(0.3);
  });

  it('hexCss 가 자리수를 채운다 — 앞자리 0 이 빠지면 색이 통째로 어긋난다', () => {
    expect(hexCss(0x2a2d33)).toBe('#2a2d33');
    expect(hexCss(0x0a0b0c)).toBe('#0a0b0c');
  });
});

describe('낮 알베도와 물리 상한', () => {
  it('잔디 > 지면 > 도로 순이다', () => {
    expect(DAY_ALBEDO.garden).toBeGreaterThan(DAY_ALBEDO.ground);
    expect(DAY_ALBEDO.ground).toBeGreaterThan(DAY_ALBEDO.road);
  });

  it('도로가 검정에 가깝다 — 이것이 밤에 안 보이는 이유다', () => {
    expect(DAY_ALBEDO.road).toBeLessThan(0.05);
  });

  it('상한은 **가장 밝은 파츠**가 정한다 — 알베도는 1을 넘을 수 없다', () => {
    // 전 파츠에 같은 배수를 거니까 잔디가 1에 닿는 순간이 한계다. 상수로 박지 않고
    // 유도하므로 잔디 색이 바뀌면 상한도 따라 움직인다.
    const brightest = Math.max(...Object.values(DAY_ALBEDO));
    expect(MAX_LIFT).toBeCloseTo(1 / brightest, 12);
    expect(brightest * MAX_LIFT).toBeCloseTo(1, 12);
  });

  it('기본값이 상한 안이고 실제로 일을 한다 — 아니면 이 기능은 죽은 코드다', () => {
    expect(NIGHT_GROUND_LIFT).toBeGreaterThan(1);
    expect(NIGHT_GROUND_LIFT).toBeLessThanOrEqual(MAX_LIFT);
    expect(groundLift(1)).toBeGreaterThan(1.5);
  });
});

describe('밤 보정 판정 — 밝히되 대비는 그대로', () => {
  it('낮에는 정확히 1 — 낮 룩을 건드릴 여지가 없다', () => {
    expect(groundLift(0)).toBe(1);
  });

  it('**대비가 보존된다** — 이것이 철회된 설계와 갈리는 지점이다', () => {
    // 배수가 하나이므로 파츠 사이의 비는 산술적으로 불변이다. 감독이 승인한 대비
    // (지면 대 도로 5.2배)도, 밤에도 초록인 잔디도 그대로여야 한다.
    const dayRatios = GROUND_KEYS.map((k) => DAY_ALBEDO[k] / DAY_ALBEDO.road);
    for (const n of [0, 0.4, 1]) {
      const s = groundLift(n);
      const nightRatios = GROUND_KEYS.map((k) => (DAY_ALBEDO[k] * s) / (DAY_ALBEDO.road * s));
      expect(nightRatios).toEqual(dayRatios);
    }
  });

  it('밤에 도로가 실제로 밝아진다 — 검정에서 꺼내는 것이 목적이다', () => {
    expect(DAY_ALBEDO.road * groundLift(1)).toBeGreaterThan(DAY_ALBEDO.road * 1.5);
  });

  it('어떤 입력에도 알베도가 1을 넘지 않는다 — 지면이 자체발광처럼 뜬다', () => {
    for (const lift of [1, 2, MAX_LIFT, MAX_LIFT + 5, 99]) {
      for (let n = 0; n <= 1.0001; n += 0.05) {
        const s = groundLift(n, lift);
        for (const k of GROUND_KEYS) expect(DAY_ALBEDO[k] * s).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it('**어둡게 하는 방향이 없다** — 배수는 언제나 1 이상이다', () => {
    // 지면을 누르는 것은 철회된 설계다. 노브로도 그쪽으로 갈 수 없어야 한다.
    for (const lift of [-5, 0, 0.3, 0.99]) {
      for (const n of [0, 0.4, 1]) expect(groundLift(n, lift)).toBe(1);
    }
  });

  it('밤 정도에 단조증가한다 — 어두워질수록 더 받쳐 준다', () => {
    let prev = -Infinity;
    for (let n = 0; n <= 1.0001; n += 0.1) {
      const v = groundLift(n);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('노을은 낮과 밤 사이다', () => {
    const s = groundLift(0.4);
    expect(s).toBeGreaterThan(1);
    expect(s).toBeLessThan(groundLift(1));
  });

  it('`?glift=1` 이면 완전한 no-op — 되돌리는 방법이 하나로 끝난다', () => {
    for (const n of [0, 0.4, 1]) expect(groundLift(n, 1)).toBe(1);
  });

  it('범위 밖 밤 정도를 눌러 담는다', () => {
    expect(groundLift(-5)).toBe(1);
    expect(groundLift(9)).toBe(groundLift(1));
  });
});

// ── 집행 — 계산된 값이 실제로 재질에 닿는가 ────────────────────────────────
// 위 단언이 전부 통과해도 아무도 재질에 대입하지 않으면 화면은 그대로다. 여기서
// **실제 배선 코드**(`systems/ground-lift.ts`)를 돌린다.

/** `THREE.Color` 의 필요한 부분만 */
class FakeColor {
  constructor(public r = 1, public g = 1, public b = 1) {}
}

function fakePools(over: Partial<Record<string, unknown>> = {}): MaterialSource & {
  mats: Record<string, { color: FakeColor }>;
} {
  const mats: Record<string, { color: FakeColor }> = {
    ground: { color: new FakeColor() },
    garden: { color: new FakeColor() },
    road: { color: new FakeColor() },
    lamp: { color: new FakeColor() },
  };
  return {
    mats,
    materialOf: (key: string) => (key in over ? over[key] : mats[key] ?? null),
  };
}

describe('지면 재질에 값이 닿는가', () => {
  it('밤이면 지면 재질이 실제로 밝아진다', () => {
    const pools = fakePools();
    new GroundLift(pools).apply('night');
    expect(pools.mats.road.color.g).toBeCloseTo(groundLift(1), 10);
    expect(pools.mats.road.color.g).toBeGreaterThan(1);
  });

  it('세 파츠에 **같은 값**이 걸린다 — 갈리면 대비가 바뀐다', () => {
    const pools = fakePools();
    new GroundLift(pools).apply('night');
    const vals = ['ground', 'garden', 'road'].map((k) => pools.mats[k].color.g);
    expect(new Set(vals).size).toBe(1);
  });

  it('낮에는 한 톨도 안 바뀐다', () => {
    const pools = fakePools();
    const snap = JSON.stringify(pools.mats);
    new GroundLift(pools).apply('day');
    expect(JSON.stringify(pools.mats)).toBe(snap);
  });

  it('밤 → 낮으로 되돌아온다 — 곱셈이라 복원되지 않으면 지면이 밤에 갇힌다', () => {
    const pools = fakePools();
    const t = new GroundLift(pools);
    t.apply('night');
    expect(pools.mats.road.color.g).toBeGreaterThan(1);
    t.apply('day');
    expect(pools.mats.road.color.g).toBe(1);
  });

  it('멱등하다 — 100번 적용해도 1번과 같다', () => {
    // 매 프레임 색에 곱했다면 발산해서 지면이 새하얘진다. 부팅 시점 색에서 매번 다시
    // 계산하는 것이 그 방어다.
    const a = fakePools();
    new GroundLift(a).apply('night');
    const once = a.mats.road.color.g;

    const b = fakePools();
    const t = new GroundLift(b);
    for (let i = 0; i < 100; i++) t.apply('night');
    expect(b.mats.road.color.g).toBe(once);
  });

  it('재질에 원래 색이 있으면 보존한다 — 기준을 1로 가정하지 않는다', () => {
    const pools = fakePools();
    pools.mats.road.color = new FakeColor(0.5, 0.4, 0.3);
    new GroundLift(pools).apply('night');
    const s = groundLift(1);
    expect(pools.mats.road.color.r).toBeCloseTo(0.5 * s, 10);
    expect(pools.mats.road.color.b).toBeCloseTo(0.3 * s, 10);
  });

  it('가로등처럼 대상이 아닌 재질은 안 건드린다', () => {
    const pools = fakePools();
    new GroundLift(pools).apply('night');
    expect(pools.mats.lamp.color.g).toBe(1);
  });

  it('풀에 없는 파츠를 조용히 넘기지 않는다 — 안 그러면 기능이 죽은 줄 모른다', () => {
    const t = new GroundLift(fakePools({ garden: null }));
    expect(t.missing).toContain('garden');
    expect(new GroundLift(fakePools()).missing).toEqual([]);
  });

  it('`color` 없는 재질도 missing 이다 — 있는 척하면 배수가 허공에 걸린다', () => {
    const t = new GroundLift(fakePools({ road: { emissiveIntensity: 0 } }));
    expect(t.missing).toContain('road');
  });

  it('배수를 진단에 남긴다 — 화면으로는 "좀 밝네" 로만 보인다', () => {
    const t = new GroundLift(fakePools());
    expect(t.scale).toBeNull();
    t.apply('night');
    expect(t.scale).toBeCloseTo(groundLift(1), 10);
  });

  it('노브 1 이면 재질을 아예 안 움직인다', () => {
    const pools = fakePools();
    new GroundLift(pools, 1).apply('night');
    expect(pools.mats.road.color.g).toBe(1);
  });
});

// ── 목록과 원천이 레지스트리 한 곳인가 ─────────────────────────────────────
// 상한을 파츠 색에서 **유도**하므로, 파츠가 다른 값을 쓰면 유도 전체가 허구가 된다.

describe('목록과 원천이 레지스트리 한 곳이다', () => {
  it('지면 파츠를 목록으로 적지 않고 레지스트리에서 골라낸다', () => {
    // 처음엔 세 이름을 판정 파일에 적었고 파츠 레지스트리 검사가 그것을 잡았다. 새 지면
    // 파츠가 생기면 그 목록이 조용히 낡고, 증상은 *"그 파츠만 밤에 안 밝아짐"* 이다.
    const declared = PARTS.filter((p) => p.groundBase !== undefined).map((p) => p.kind);
    expect([...GROUND_KEYS]).toEqual(declared);
    expect(GROUND_KEYS.length).toBeGreaterThanOrEqual(3);
  });

  it('모든 지면 파츠가 낮 알베도를 갖는다 — 빠지면 상한이 NaN 이다', () => {
    expect(GROUND_KEYS).toContain(ground.kind);
    for (const k of GROUND_KEYS) {
      expect(Number.isFinite(DAY_ALBEDO[k])).toBe(true);
      expect(DAY_ALBEDO[k]).toBeGreaterThan(0);
    }
  });

  it('텍스처 바탕색이 소스에 다시 적혀 있지 않다', () => {
    // 캔버스 굽기는 DOM 이 필요해 여기서 못 돌린다. 대신 **하드코딩이 없는지**를 본다 —
    // 옛 `hsl(...)`/`#2a2d33` 이 다시 나타나면 상한이 조용히 엉뚱한 색에서 유도된다.
    const g = readFileSync(join(W2, 'parts', 'garden.ts'), 'utf8');
    const r = readFileSync(join(W2, 'parts', 'road.ts'), 'utf8');
    expect(g).toContain('hexCss(GRASS_BASE)');
    expect(g).not.toMatch(/fillStyle\s*=\s*['"]hsl\(102/);
    expect(r).toContain('hexCss(ASPHALT_BASE)');
    expect(r).not.toMatch(/fillStyle\s*=\s*['"]#2a2d33/);
  });

  it('배선이 붙어 있다 — `features/sky.ts` 가 GroundLift 를 실제로 돌린다', () => {
    const sky = readFileSync(join(W2, 'features', 'sky.ts'), 'utf8');
    expect(sky).toMatch(/new GroundLift\(/);
    expect(sky).toMatch(/groundLift\.apply\(/);
  });

  it('**매 프레임** 배선이다 — `update` 안에서 부른다', () => {
    // ── 이 검사는 뮤테이션이 만들었다 (2026-08-05) ──────────────────────────
    // `update(ctx)` 안의 호출 한 줄을 지우는 뮤테이션(M2)이 **안 깨졌다.** 위 검사가
    // 소스 전체에서 그 호출을 찾는데 부팅 호출이 남아 있어 그대로 매치했다. 두 호출은
    // 하는 일이 다르다:
    //
    //   부팅 호출   밤에 들어왔을 때 첫 프레임부터 맞춰 둔다
    //   update 호출 **세션 중 시간대가 바뀔 때 따라간다**(神 모드 패널 경로)
    //
    // update 쪽이 빠지면 증상은 *"시간대를 바꿨는데 지면만 안 변한다"* 다. 그런데
    // 테스트는 전부 초록이었다 — **호출이 있는가**를 봤지 **어디서 부르는가**를 안 봤다.
    //
    // ⚠ 한계: 이것도 소스 문자열 검사다. `update` 를 실제로 돌려 확인하려면
    // `skyFeature.create()` 가 필요하고 그것은 `SkySystem`(three)을 끈다 — 별건이다.
    const sky = readFileSync(join(W2, 'features', 'sky.ts'), 'utf8');
    const body = blockAfter(sky, 'update(ctx)');
    // 표본이 비면 아래 `toContain` 이 무의미해진다 — 이 저장소가 빈 표본으로 단언을
    // 통과시킨 전례가 있다. 블록을 제대로 떴는지 먼저 못 박는다.
    expect(body).toContain('sky.update(ctx)');
    expect(body).toContain('groundLift.apply(');
  });
});

/**
 * `header` 뒤 첫 중괄호 블록의 본문. 중괄호를 세어 뜨므로 들여쓰기에 의존하지 않는다.
 * 못 찾으면 던진다 — 조용히 빈 문자열을 돌려주면 위 단언이 통과해 버린다.
 */
function blockAfter(src: string, header: string): string {
  const i = src.indexOf(header);
  if (i < 0) throw new Error(`블록 머리를 못 찾았다: ${header}`);
  let depth = 0;
  let start = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') { if (depth === 0) start = j + 1; depth++; }
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j); }
  }
  throw new Error(`중괄호가 안 닫혔다: ${header}`);
}
