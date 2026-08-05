// 지면 알베도 — 판정과 **집행**.
//
// 이 축이 생긴 이유는 `decide/night.ts` 가 적어 둔 것이다: 밤 처방이 전부 빛이라
// 알베도에 곱해지고, 알베도가 벌어져 있으면 같은 조명이 한쪽은 형광으로 한쪽은 검정으로
// 만든다. 그러니 여기서 지켜야 할 것은 **값이 아니라 파츠 사이의 관계**다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  GROUND_KEYS, DAY_ALBEDO, GROUND_TINT_STRENGTH, srgbLuminance, groundTint,
} from '../frontend/js/world2/decide/ground-albedo.js';
import { GroundTint, type MaterialSource } from '../frontend/js/world2/systems/ground-tint.js';
import { hexCss } from '../frontend/js/world2/parts/color.js';
import { PARTS } from '../frontend/js/world2/parts/index.js';
import { ground } from '../frontend/js/world2/parts/ground.js';
import { GRASS_BASE } from '../frontend/js/world2/parts/garden.js';
import { ASPHALT_BASE } from '../frontend/js/world2/parts/road.js';

const W2 = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'js', 'world2');

describe('휘도는 감마를 푼다 — 안 풀면 배수가 통째로 틀린다', () => {
  it('sRGB 채널 평균과 확연히 다르다', () => {
    // 아스팔트 `#2a2d33` 의 sRGB 채널 평균은 0.18 인데 선형 휘도는 0.026 이다. 감마를
    // 안 풀면 7배 밝게 계산되고, 그 값으로 나눈 배수는 아무 의미가 없다.
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

describe('낮 알베도 — 문제의 실체', () => {
  it('잔디 > 지면 > 도로 순이다', () => {
    expect(DAY_ALBEDO.garden).toBeGreaterThan(DAY_ALBEDO.ground);
    expect(DAY_ALBEDO.ground).toBeGreaterThan(DAY_ALBEDO.road);
  });

  it('잔디 대 도로가 10배를 넘는다 — 이것이 고치려는 것이다', () => {
    // 이 비가 작아지면(예: 텍스처 베이스색이 바뀌면) 밤 압축의 전제부터 다시 봐야 한다.
    expect(DAY_ALBEDO.garden / DAY_ALBEDO.road).toBeGreaterThan(10);
  });

  it('지면 대 도로 5배는 감독이 승인한 대비다 — 여기는 안 건드린다', () => {
    // *"바닥 격자 바닥이 잘 드러나지 않아"* 의 처방이 정확히 지면을 이 자리까지 밝힌
    // 것이었다. 밤 압축이 이 비를 줄이면 그때 고친 것이 되돌아간다.
    const ratio = DAY_ALBEDO.ground / DAY_ALBEDO.road;
    expect(ratio).toBeGreaterThan(4);
    const night = groundTint(1);
    expect((DAY_ALBEDO.ground * night.ground) / (DAY_ALBEDO.road * night.road))
      .toBeCloseTo(ratio, 10);
  });
});

describe('밤 압축 판정', () => {
  it('낮에는 전부 정확히 1 — 낮 룩을 건드릴 여지가 없다', () => {
    const t = groundTint(0);
    for (const k of GROUND_KEYS) expect(t[k]).toBe(1);
  });

  it('밤에 잔디가 지면 판 알베도까지 정확히 내려온다 — 이것이 유도의 전부다', () => {
    // 임의로 고른 숫자가 아니라는 것을 여기서 못 박는다. `GROUND_TONES` 나 `GRASS_BASE`
    // 를 바꾸면 배수가 저절로 따라오고, 이 단언은 그대로 성립해야 한다.
    const t = groundTint(1);
    expect(DAY_ALBEDO.garden * t.garden).toBeCloseTo(DAY_ALBEDO.ground, 10);
  });

  it('기준보다 어두운 것은 손대지 않는다 — 밤에 지면을 밝히는 방향은 없다', () => {
    const t = groundTint(1);
    expect(t.ground).toBe(1);
    expect(t.road).toBe(1);
  });

  it('어떤 시간대에도 배수가 1을 넘지 않는다', () => {
    for (let n = 0; n <= 1.0001; n += 0.05) {
      const t = groundTint(n);
      for (const k of GROUND_KEYS) expect(t[k]).toBeLessThanOrEqual(1);
    }
  });

  it('밤 정도에 단조감소한다 — 어두워질수록 더 눌린다', () => {
    let prev = Infinity;
    for (let n = 0; n <= 1.0001; n += 0.1) {
      const v = groundTint(n).garden;
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it('노을은 낮과 밤 사이다', () => {
    const s = groundTint(0.4).garden;
    expect(s).toBeLessThan(1);
    expect(s).toBeGreaterThan(groundTint(1).garden);
  });

  it('강도 0 이면 완전한 no-op — 되돌리는 방법이 `?gtint=0` 하나로 끝난다', () => {
    const t = groundTint(1, 0);
    for (const k of GROUND_KEYS) expect(t[k]).toBe(1);
  });

  it('강도 기본값이 실제로 일을 한다 — 아니면 이 기능은 죽은 코드다', () => {
    expect(GROUND_TINT_STRENGTH).toBeGreaterThan(0);
    expect(groundTint(1).garden).toBeLessThan(0.9);
  });

  it('범위 밖 입력을 눌러 담는다', () => {
    expect(groundTint(-5).garden).toBe(1);
    expect(groundTint(9).garden).toBe(groundTint(1).garden);
    expect(groundTint(1, 9).garden).toBe(groundTint(1, 1).garden);
  });
});

// ── 집행 — 계산된 값이 실제로 재질에 닿는가 ────────────────────────────────
// 위 단언이 전부 통과해도 아무도 재질에 대입하지 않으면 화면은 그대로다. 여기서
// **실제 배선 코드**(`systems/ground-tint.ts`)를 돌린다.

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
  it('밤이면 잔디 재질이 실제로 어두워진다', () => {
    const pools = fakePools();
    const t = new GroundTint(pools);
    t.apply('night');
    expect(pools.mats.garden.color.g).toBeCloseTo(groundTint(1).garden, 10);
    expect(pools.mats.garden.color.g).toBeLessThan(1);
  });

  it('낮에는 한 톨도 안 바뀐다', () => {
    const pools = fakePools();
    const snap = JSON.stringify(pools.mats);
    new GroundTint(pools).apply('day');
    expect(JSON.stringify(pools.mats)).toBe(snap);
  });

  it('밤 → 낮으로 되돌아온다 — 곱셈이라 복원되지 않으면 지면이 밤에 갇힌다', () => {
    const pools = fakePools();
    const t = new GroundTint(pools);
    t.apply('night');
    expect(pools.mats.garden.color.g).toBeLessThan(1);
    t.apply('day');
    expect(pools.mats.garden.color.g).toBe(1);
  });

  it('멱등하다 — 100번 적용해도 1번과 같다', () => {
    // 매 프레임 색에 곱했다면 발산해서 지면이 검어진다. 부팅 시점 색에서 매번 다시
    // 계산하는 것이 그 방어다.
    const a = fakePools();
    new GroundTint(a).apply('night');
    const once = a.mats.garden.color.g;

    const b = fakePools();
    const t = new GroundTint(b);
    for (let i = 0; i < 100; i++) t.apply('night');
    expect(b.mats.garden.color.g).toBe(once);
  });

  it('재질에 원래 색이 있으면 보존한다 — 기준을 1로 가정하지 않는다', () => {
    const pools = fakePools();
    pools.mats.garden.color = new FakeColor(0.5, 0.4, 0.3);
    const t = new GroundTint(pools);
    t.apply('night');
    const s = groundTint(1).garden;
    expect(pools.mats.garden.color.r).toBeCloseTo(0.5 * s, 10);
    expect(pools.mats.garden.color.b).toBeCloseTo(0.3 * s, 10);
  });

  it('가로등처럼 대상이 아닌 재질은 안 건드린다', () => {
    const pools = fakePools();
    new GroundTint(pools).apply('night');
    expect(pools.mats.lamp.color.g).toBe(1);
  });

  it('풀에 없는 파츠를 조용히 넘기지 않는다 — 안 그러면 기능이 죽은 줄 모른다', () => {
    const t = new GroundTint(fakePools({ garden: null }));
    expect(t.missing).toContain('garden');
    const full = new GroundTint(fakePools());
    expect(full.missing).toEqual([]);
  });

  it('`color` 없는 재질도 missing 이다 — 있는 척하면 배수가 허공에 걸린다', () => {
    const t = new GroundTint(fakePools({ road: { emissiveIntensity: 0 } }));
    expect(t.missing).toContain('road');
  });

  it('배수를 진단에 남긴다 — 화면으로는 "좀 어둡네" 로만 보인다', () => {
    const t = new GroundTint(fakePools());
    expect(t.scales).toBeNull();
    t.apply('night');
    expect(t.scales?.garden).toBeCloseTo(groundTint(1).garden, 10);
  });
});

// ── 원천이 하나인가 ────────────────────────────────────────────────────────
// 배수를 파츠 색에서 **유도**하므로, 파츠가 다른 값을 쓰면 유도 전체가 허구가 된다.
// 이 저장소가 색·수치·임계값에서 세 번 겪은 그 형태다.

describe('목록과 원천이 레지스트리 한 곳이다', () => {
  it('지면 파츠를 목록으로 적지 않고 레지스트리에서 골라낸다', () => {
    // 처음엔 `['ground','garden','road']` 를 판정 파일에 적었고 파츠 레지스트리 검사가
    // 그것을 잡았다. 새 지면 파츠가 생기면 그 목록이 조용히 낡고, 증상은 *"그 파츠만
    // 밤에 안 어두워짐"* 이라 원인을 짐작하기 어렵다.
    const declared = PARTS.filter((p) => p.groundBase !== undefined).map((p) => p.kind);
    expect([...GROUND_KEYS]).toEqual(declared);
    expect(GROUND_KEYS.length).toBeGreaterThanOrEqual(3);
  });

  it('기준 파츠가 실제로 목록 안에 있다 — 없으면 판정이 통째로 no-op 이 된다', () => {
    // `TINT_REF` 가 가리키는 파츠가 사라지면 `DAY_ALBEDO[ref]` 가 undefined 가 되고,
    // 배수가 전부 1 로 떨어져 **아무 일도 안 일어난다.** 조용한 실패라 화면으로만 안다.
    expect(GROUND_KEYS).toContain(ground.kind);
    expect(groundTint(1).garden).toBeLessThan(1);
  });

  it('모든 지면 파츠가 낮 알베도를 갖는다 — 빠지면 배수가 NaN 이다', () => {
    for (const k of GROUND_KEYS) {
      expect(Number.isFinite(DAY_ALBEDO[k])).toBe(true);
      expect(DAY_ALBEDO[k]).toBeGreaterThan(0);
    }
  });

  it('텍스처 바탕색이 소스에 다시 적혀 있지 않다', () => {
    // 캔버스 굽기는 DOM 이 필요해 여기서 못 돌린다. 대신 **하드코딩이 없는지**를 본다 —
    // `hexCss(GRASS_BASE)` 로 바뀐 자리에 옛 `hsl(...)`/`#2a2d33` 이 다시 나타나면
    // 배수가 조용히 엉뚱한 색을 기준으로 계산된다.
    const g = readFileSync(join(W2, 'parts', 'garden.ts'), 'utf8');
    const r = readFileSync(join(W2, 'parts', 'road.ts'), 'utf8');
    expect(g).toContain('hexCss(GRASS_BASE)');
    expect(g).not.toMatch(/fillStyle\s*=\s*['"]hsl\(102/);
    expect(r).toContain('hexCss(ASPHALT_BASE)');
    expect(r).not.toMatch(/fillStyle\s*=\s*['"]#2a2d33/);
  });

  it('배선이 붙어 있다 — `features/sky.ts` 가 GroundTint 를 실제로 돌린다', () => {
    // 판정도 집행 클래스도 멀쩡한데 아무도 부르지 않으면 화면은 그대로다. 위 가로등
    // 배선이 정확히 그 사각에 있었다(테스트가 배선을 한 줄도 안 돈다).
    const sky = readFileSync(join(W2, 'features', 'sky.ts'), 'utf8');
    expect(sky).toMatch(/new GroundTint\(/);
    expect(sky).toMatch(/groundTint\.apply\(/);
  });

  it('**매 프레임** 배선이다 — `update` 안에서 부른다', () => {
    // ── 이 검사는 뮤테이션이 만들었다 (2026-08-05) ──────────────────────────
    // `update(ctx)` 안의 `groundTint.apply(...)` 한 줄을 지우는 뮤테이션(M2)이 **안
    // 깨졌다.** 위 검사가 소스 전체에서 `groundTint.apply(` 를 찾는데, 부팅 호출이
    // 남아 있어 그대로 매치했기 때문이다. 두 호출은 **하는 일이 다르다**:
    //
    //   부팅 호출   밤에 들어왔을 때 첫 프레임부터 맞춰 둔다
    //   update 호출 **세션 중 시간대가 바뀔 때 따라간다**(神 모드 패널 경로)
    //
    // update 쪽이 빠지면 증상은 *"시간대를 바꿨는데 지면만 안 변한다"* 이고, 부팅
    // 시간대가 낮이면 밤으로 바꿔도 잔디가 형광 그대로다 — 정확히 이번에 고친 그 화면
    // 이다. 그런데 테스트는 전부 초록이었다. **호출이 있는가**를 봤지 **어디서 부르는가**
    // 를 안 봤다.
    //
    // ⚠ 한계: 이것도 소스 문자열 검사다. `update` 를 실제로 돌려 확인하려면
    // `skyFeature.create()` 가 필요하고 그것은 `SkySystem`(three)을 끈다 — 스텁을
    // 세우는 것은 별건이다(태스크 #197 후속). **여기서 재는 것은 "그 자리에 그 호출이
    // 있는가" 까지다.**
    const sky = readFileSync(join(W2, 'features', 'sky.ts'), 'utf8');
    const body = blockAfter(sky, 'update(ctx)');
    // 표본이 비면 아래 `toContain` 이 무의미해진다 — 이 저장소가 빈 표본으로
    // 단언을 통과시킨 전례가 있다. 블록을 제대로 떴는지 먼저 못 박는다.
    expect(body).toContain('sky.update(ctx)');
    expect(body).toContain('groundTint.apply(');
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
