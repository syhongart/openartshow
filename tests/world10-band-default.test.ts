// @vitest-environment jsdom
//
// world10 밴드 SSOT — 팀장 판정 2026-09-11 **B1(후자)** 의 회귀 게이트.
//
// ── 축이 옮겨졌다 (팀장 조건 B-3) ────────────────────────────────────────────
// 이 파일은 원래 「부트가 `?band=0.5` 를 선채움하는가」를 지켰다. 그 형태 자체가
// 결함이었다 — `scaleBands` 는 **tier 밴드만** 곱하므로 안개·비행천장·그림자·페이드가
// 배율을 안 탔고, 렌더는 76.8m 에서 끊기는데 안개는 102.4m 에서야 시작해 **세계의 끝이
// 안개 없이 드러났다**(`docs/nyc/evidence/iteration-03-grid/band05-V1.fogbug.png`).
//
// 그래서 밴드는 노브가 아니라 **상수**(`world10/decide/nyc-bands.ts` 의 `NYC_BANDS`)가
// 소유하고, 그 값은 **셀 크기에서 유도**된다. 이 파일이 지키는 것도 그에 맞춰 바뀌었다:
//
//   (ㄱ) **산술** — `NYC_BANDS.farExit × NYC_CELL` 이 world2 라이브와 같은 76.8m 다 (B-2)
//   (ㄴ) **통합** — 다섯 소비처(tier·안개·비행천장·그림자·페이드)가 **같은 밴드에서
//        유도된다.** 실제 모듈을 import 해 네 거리가 한 수로 모이는 것을 단언한다.
//   (ㄷ) `?band=` 는 그 상수 **위에 곱하는 진단 노브**이고 부재 시 배율 1 이다.
//   (ㄹ) 재론 조건의 게이트 — 허용 목록 **밖**에서 `DEFAULT_BANDS` 를 코드로 읽는 자리가
//        생기면 여기서 빨간불이 난다(팀장 재론 조건: 그러면 상신한다).
//
// ── ⚠ 「따라오지 않는다」를 고정하던 옛 단언들은 **삭제됐다** ─────────────────
// 그것들은 결함을 「바람직하지 않지만 현재 상태」로 못 박은 표식이었고, B1 이 그 결함을
// 없앴으므로 지금 남겨 두면 **거짓을 지키는 검사**가 된다. 테스트를 느슨하게 만든 것이
// 아니라 **반대 방향으로 강하게** 바꿨다 — 옛 단언은 «안개 ≠ 렌더» 를 요구했고, 지금
// 단언은 «안개 = 렌더» 를 요구한다.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readNum } from '../frontend/js/world10/url-knob.js';
import { DEFAULT_BANDS, validBands, tierReach, maxLatticePoints } from '../frontend/js/world10/decide/lod.js';
import {
  NYC_BANDS, NYC_CELL, NYC_BAND_SCALE, BAND_REF_CELL_M, scaleBands,
} from '../frontend/js/world10/decide/nyc-bands.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world10/parts/types.js';
import { maxCells } from '../frontend/js/world10/systems/nyc-cell-builder.js';
import { fogBand, FOG_NEAR_CELLS, FOG_FAR_CELLS } from '../frontend/js/world10/decide/fog.js';
import { FLY_CEIL_CELLS, flyLiftMeters } from '../frontend/js/world10/decide/fly.js';
import { shadowFrustum } from '../frontend/js/world10/decide/shadow.js';
import { residualAtSpawn, crossingCells } from '../frontend/js/world10/decide/lod-fade.js';
import { NYC_CELL as NYC_CELL_REEXPORT } from '../frontend/js/world10/systems/nyc-parcels.js';
// 대조군 — **world2 라이브의 같은 판정**. 「world2 와 같은 절대 거리를 되찾았다」는 주장을
// 이 트리 안에서만 검산하면 순환 논증이 된다.
import {
  residualAtSpawn as w2ResidualAtSpawn, crossingCells as w2CrossingCells,
} from '../frontend/js/world2/decide/lod-fade.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const src = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/** `main.ts` 원문에서 `readNum('<key>', fb, lo, hi)` 인자를 뽑는다 — 손으로 적으면 값 미러링이다 */
function knobArgs(key: string): { fb: number; lo: number; hi: number } {
  const re = new RegExp(`readNum\\('${key}',\\s*([A-Za-z_.\\d]+),\\s*([\\d.]+),\\s*([\\d.]+)\\)`);
  const m = re.exec(src('frontend/js/world10/main.ts'));
  expect(m, `world10/main.ts 에서 readNum('${key}', …) 호출을 못 찾았다`).not.toBeNull();
  return { fb: Number(m![1]), lo: Number(m![2]), hi: Number(m![3]) };
}

/** 부트를 **실제로 실행**하고, 그 결과 주소창에 남은 키를 돌려준다. */
async function runBoot(initialSearch: string, key: string): Promise<string | null> {
  // `startGlbWorld` 는 three/webgpu 를 끌어온다 — 부트가 무엇을 «채우는가» 만 보는
  // 검사라 렌더러는 필요 없다. 막지 않으면 이 검사가 재는 축이 GPU 가용성이 된다.
  vi.doMock('../frontend/js/world10/main.js', () => ({
    startGlbWorld: () => Promise.resolve(),
  }));
  vi.resetModules();
  window.history.replaceState(null, '', `/app/world10.html${initialSearch}`);
  await import('../frontend/js/world10-boot.js');
  return new URL(window.location.href).searchParams.get(key);
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
});

// ════════════════════════════════════════════════════════════════════════════
// (ㄱ) 산술 — 밴드는 셀 크기에서 **유도**된다 (팀장 조건 B-2)
// ════════════════════════════════════════════════════════════════════════════
describe('(ㄱ) NYC_BANDS 는 기준 셀 ÷ 이 세계의 셀 에서 유도된다', () => {
  it('farExit × NYC_CELL = 76.8m — world2 라이브가 지키는 그 반경이다 [M-F2: BAND_REF_CELL_M 을 64 로 바꾸면 깨진다]', () => {
    expect(NYC_BANDS.farExit * NYC_CELL).toBeCloseTo(76.8, 6);
    // 그리고 그 76.8 은 **기준 셀 세계의 같은 수**다 — 우연히 맞은 것이 아니라 보존된 것이다.
    expect(NYC_BANDS.farExit * NYC_CELL).toBeCloseTo(DEFAULT_BANDS.farExit * BAND_REF_CELL_M, 9);
  });

  it('배율이 리터럴이 아니라 유도값이다 — 소스에 0.5 를 적지 않았다', () => {
    const s = src('frontend/js/world10/decide/nyc-bands.ts');
    // 코드 줄만 본다(주석에는 «0.5» 가 경위로 등장한다).
    const code = s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(code, '배율을 0.5 로 적어 두면 셀을 바꿔도 안 따라온다').not.toMatch(/NYC_BAND_SCALE\s*=\s*0?\.5/);
    expect(code).toMatch(/NYC_BAND_SCALE\s*=\s*BAND_REF_CELL_M\s*\/\s*NYC_CELL/);
    expect(NYC_BAND_SCALE).toBeCloseTo(BAND_REF_CELL_M / NYC_CELL, 12);
  });

  it('기준 셀 32m 가 `DEFAULT_LAYOUT.cellX` 와 같다 — 두 값이 갈리면 여기서 깨진다', () => {
    // `BAND_REF_CELL_M` 은 「`DEFAULT_BANDS` 의 배수가 전제한 셀」이고, 그 수는 이 트리에
    // `DEFAULT_LAYOUT.cellX` 로도 들어와 있다. 미러링이므로 대조한다(hemig ↔ PALETTE.curb 선례).
    expect(BAND_REF_CELL_M).toBe(DEFAULT_LAYOUT.cellX);
  });

  it('셀 상수는 한 곳이 소유하고 격자 모듈은 재수출한다', () => {
    expect(NYC_CELL_REEXPORT).toBe(NYC_CELL);
    expect(src('frontend/js/world10/systems/nyc-parcels.ts'))
      .toMatch(/import \{ NYC_CELL \} from '\.\.\/decide\/nyc-bands\.js'/);
  });

  it('유도된 밴드가 히스테리시스 불변식(ENTER<EXIT)을 깨지 않는다', () => {
    expect(validBands(NYC_BANDS)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// (ㄴ) 통합 — 다섯 소비처가 **같은 밴드**에서 유도된다 (팀장 조건 B1 본체)
// ════════════════════════════════════════════════════════════════════════════
describe('(ㄴ) 다섯 소비처가 한 밴드를 읽는다 — 거리가 하나로 모인다', () => {
  /** 이 세계가 그리기를 멈추는 거리(m). 나머지 넷이 전부 이 수를 가리켜야 한다 */
  const RENDER_REACH_M = NYC_BANDS.farExit * NYC_CELL;

  it('① tier 스트리밍 — 노브 없는 기본 배율이 1 이라 실효 밴드가 NYC_BANDS 그대로다', () => {
    const { fb, lo, hi } = knobArgs('band');
    expect(readNum('band', fb, lo, hi), '부트가 값을 안 채우므로 fallback 이 곧 실효 배율이다').toBe(1);
    // `scaleBands(b, 1)` 은 원본 객체를 그대로 돌려준다 — 배율 1 이 no-op 이라는 것이
    // 「기본 = NYC_BANDS」의 근거다.
    expect(scaleBands(NYC_BANDS, 1)).toBe(NYC_BANDS);
    expect(src('frontend/js/world10/main.ts'), '조립부가 NYC_BANDS 를 안 읽는다')
      .toMatch(/scaleBands\(NYC_BANDS,\s*readNum\('band'/);
    expect(tierReach('far', NYC_BANDS) * NYC_CELL).toBeCloseTo(RENDER_REACH_M, 9);
  });

  it('② 안개 — far 가 렌더가 끊기는 거리와 **정확히 같다** [M-F1: fog.ts 만 DEFAULT_BANDS 로 되돌리면 깨진다]', () => {
    expect(FOG_FAR_CELLS).toBe(NYC_BANDS.farExit);
    expect(fogBand(NYC_CELL).far).toBeCloseTo(RENDER_REACH_M, 9);
    // 그리고 안개는 그보다 **먼저** 시작해야 한다 — 이것이 뒤집히면(near > far) 안개가
    // 성립하지 않고, `FOG_FAR_CELLS` 만 밴드에 물렸을 때 실제로 일어나는 일이다.
    expect(fogBand(NYC_CELL).near).toBeLessThan(fogBand(NYC_CELL).far);
    expect(fogBand(NYC_CELL).near).toBeCloseTo(FOG_NEAR_CELLS * NYC_CELL, 9);
  });

  it('②-b 세계 끝의 안개 진행률이 100% 다 — «끝이 드러나는» 결함의 직접 반대 단언', () => {
    // `THREE.Fog` 는 near~far 선형. 진행률 t = (d − near)/(far − near).
    const { near, far } = fogBand(NYC_CELL);
    const t = (RENDER_REACH_M - near) / (far - near);
    expect(t).toBeCloseTo(1, 9);
    // 렌더 반경 바로 안쪽에서도 이미 대부분 닫혀 있다(빈 공간이 안 드러난다).
    const tInside = (RENDER_REACH_M * 0.95 - near) / (far - near);
    expect(tInside).toBeGreaterThan(0.5);
  });

  it('③ 비행 천장 — 안개 100% 선과 같은 수다 [M-F3: fly.ts 만 되돌리면 깨진다]', () => {
    expect(FLY_CEIL_CELLS).toBe(NYC_BANDS.farExit);
    expect(flyLiftMeters(FLY_CEIL_CELLS, NYC_CELL)).toBeCloseTo(RENDER_REACH_M, 9);
  });

  it('④ 그림자 — 반폭이 렌더 반경과 같다(경계가 «파셀이 사라지는 거리» 에 붙는다)', () => {
    const { fb } = { fb: NYC_BANDS.farExit };
    const f = shadowFrustum(NYC_CELL, fb, 60, 2048);
    expect(f.half).toBeCloseTo(RENDER_REACH_M, 9);
    // 조립부가 **셀과 밴드를 둘 다** 이 세계 것으로 넘기는지 본다 — 한쪽만 바꾸면
    // 반폭이 절반이 되고, 그 어긋남은 화면에서 «후진할 때 밝기가 튄다» 로만 보인다.
    const m = src('frontend/js/world10/main.ts');
    expect(m, "shband fallback 이 NYC_BANDS 가 아니다").toMatch(/readNum\('shband',\s*NYC_BANDS\.farExit/);
    expect(m.replace(/\s+/g, ' '), '그림자 프러스텀이 세계 셀이 아닌 값을 받는다')
      .toContain('CELL_X, SHADOW_BAND, TOWER_MAX_H, SHADOW_MAP,');
  });

  it('⑤ 페이드 — 기본 인자가 NYC_BANDS 라 팝인·페이드 구간이 world2 와 같은 값으로 돌아온다', () => {
    // 인자를 안 넘긴 호출(= 제품 코드의 기본 경로)과 명시 호출이 같아야 한다.
    expect(residualAtSpawn()).toBe(residualAtSpawn(NYC_BANDS));
    expect(crossingCells()).toBe(crossingCells(NYC_BANDS));
    // 배율이 안개에도 걸려 있으므로 **비율이 보존**된다 — world2 라이브와 같은 수다.
    // ⚠ 대조군은 **world2 트리의 같은 함수**다. 이 트리에서 `residualAtSpawn(DEFAULT_BANDS)`
    // 를 부르면 안개(이 세계 것)와 밴드(기준 셀 것)가 섞여 아무 뜻도 없는 수가 나온다 —
    // 첫 판본이 그렇게 적어 즉시 빨간불이 났다. 단위가 다른 두 수를 같은 자리에 넣는 형태다.
    expect(residualAtSpawn(NYC_BANDS)).toBeCloseTo(w2ResidualAtSpawn(), 9);
    expect(residualAtSpawn(NYC_BANDS)).toBeCloseTo(0.375, 6);
    // 페이드가 끝날 구간이 **존재한다**(0 이면 페이드가 원리적으로 불가능하다).
    expect(crossingCells(NYC_BANDS)).toBeGreaterThan(0);
    // 그 구간의 **절대 길이**가 world2 와 같다(0.25셀×64m = 0.50셀×32m = 16m).
    expect(crossingCells(NYC_BANDS) * NYC_CELL).toBeCloseTo(w2CrossingCells() * BAND_REF_CELL_M, 9);
  });

  it('🔴 네 거리가 **한 수**다 — 하나라도 다른 밴드를 읽으면 여기서 갈린다', () => {
    const reaches = {
      tier: tierReach('far', NYC_BANDS) * NYC_CELL,
      fog: fogBand(NYC_CELL).far,
      fly: flyLiftMeters(FLY_CEIL_CELLS, NYC_CELL),
      shadow: shadowFrustum(NYC_CELL, NYC_BANDS.farExit, 60, 2048).half,
    };
    for (const [name, m] of Object.entries(reaches)) {
      expect(m, `★ ${name} 이 다른 거리를 본다`).toBeCloseTo(RENDER_REACH_M, 6);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// (ㄷ) `?band=` 는 진단 노브로 복귀했다 (팀장 조건 B-3)
// ════════════════════════════════════════════════════════════════════════════
describe('(ㄷ) ?band= — NYC_BANDS 위에 곱하는 진단 노브', () => {
  it('부트가 band 를 더 이상 선채움하지 않는다', async () => {
    expect(await runBoot('', 'band')).toBeNull();
    expect(src('frontend/js/world10-boot.ts'), '부트 DEFAULTS 에 band 가 남아 있다')
      .toMatch(/DEFAULTS[^=]*=\s*\{\s*glb: '0', grass: '0', hemig: '[0-9a-f]{6}'\s*\}/);
  });

  it('나머지 기본값(glb·grass·hemig)은 그대로 채우고 URL 값을 덮지 않는다', async () => {
    vi.doMock('../frontend/js/world10/main.js', () => ({ startGlbWorld: () => Promise.resolve() }));
    vi.resetModules();
    window.history.replaceState(null, '', '/app/world10.html?glb=1');
    await import('../frontend/js/world10-boot.js');
    const q = new URL(window.location.href).searchParams;
    expect([q.get('glb'), q.get('grass'), q.get('hemig')]).toEqual(['1', '0', '8a857c']);
  });

  it('?band=2 가 기준 셀 세계의 원본 반경(153.6m)을 재현한다 — 노브가 죽지 않았다', async () => {
    expect(await runBoot('?band=2', 'band')).toBe('2');
    const { fb, lo, hi } = knobArgs('band');
    expect(readNum('band', fb, lo, hi)).toBe(2);
    expect(scaleBands(NYC_BANDS, 2).farExit * NYC_CELL)
      .toBeCloseTo(DEFAULT_BANDS.farExit * NYC_CELL, 9);
  });

  it('노브 범위가 유효 밴드를 벗어나지 않는다', () => {
    const { lo, hi } = knobArgs('band');
    for (const k of [lo, 1, hi]) expect(validBands(scaleBands(NYC_BANDS, k)), `배율 ${k}`).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// (ㄹ) 재론 조건의 게이트 — 「다섯 소비처 밖에서 DEFAULT_BANDS 를 읽는 자리」
// ════════════════════════════════════════════════════════════════════════════
describe('(ㄹ) DEFAULT_BANDS 를 코드로 읽는 자리가 허용 목록과 정확히 같다', () => {
  // 팀장 재론 조건(2026-09-11 B1): *"다섯 소비처 밖에서 `DEFAULT_BANDS` 를 직접 읽는 자리가
  // 또 나오면 상신한다."* 손 규율로 두면 안 지켜지므로(이 저장소의 실측) 목록으로 고정한다.
  // 새 파일이 읽기 시작하면 **여기서 빨간불**이 나고, 그 사람은 이 주석을 지나간다.
  const ALLOWED = new Set([
    // 정의 자리 — world2 계보, diff 0 조건(팀장 조건 B-1)
    'frontend/js/world10/decide/lod.ts',
    // 유도 자리 — 이 세계의 밴드를 여기서 만든다
    'frontend/js/world10/decide/nyc-bands.ts',
    // 아래 셋은 **기본 인자**로만 읽고, 제품 경로에서는 조립부가 `TIER_BANDS` 를 넘긴다.
    // world2 계보라 diff 0 이 조건이고, 넘기는 쪽은 (ㄴ)-① 이 본다.
    'frontend/js/world10/decide/stream.ts',
    'frontend/js/world10/systems/parcel-builder.ts',
    // ⚠ 가시 거리가 아니라 **라이트 풀 크기** 축이다(world2 도 같은 예외를 적어 두었다 —
    // `tests/world2-overlay-wiring.test.ts`). 호출처가 bands 를 안 넘기므로 기준 셀 밴드를
    // 쓴다 — 이 회차에서 건드리지 않았고 **재론 조건의 관찰 대상**이다.
    'frontend/js/world10/decide/art-light.ts',
  ]);

  function walk(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|js)$/.test(e)) out.push(p);
    }
    return out;
  }

  it('허용 목록 밖의 파일은 DEFAULT_BANDS 를 코드로 읽지 않는다', () => {
    const found: string[] = [];
    for (const abs of walk(join(ROOT, 'frontend/js/world10'))) {
      const rel = relative(ROOT, abs);
      const code = readFileSync(abs, 'utf8').split('\n')
        .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
      if (/\bDEFAULT_BANDS\b/.test(code)) found.push(rel);
    }
    expect([...found].sort()).toEqual([...ALLOWED].sort());
  });
});

// ════════════════════════════════════════════════════════════════════════════
// (ㅁ) 슬롯 예산은 밴드에서 유도된다 · 이 변경이 다른 페이지로 새지 않는다
// ════════════════════════════════════════════════════════════════════════════
describe('(ㅁ) 예산·격리', () => {
  it('maxCells 가 밴드에서 유도된다 — 상수를 적어 둔 것이 아니다', () => {
    expect(maxCells(NYC_BANDS)).toBe(maxLatticePoints(tierReach('far', NYC_BANDS)));
    // 기준 셀 밴드(= 옛 `?band=1`)와는 값이 다르다 — 유도가 실제로 작동한다는 뜻이다.
    expect(maxCells(NYC_BANDS)).toBeLessThan(maxCells(DEFAULT_BANDS));
  });

  it('near·mid 풀 상한도 같은 식으로 따라온다', () => {
    for (const t of ['near', 'mid', 'far'] as const) {
      expect(maxLatticePoints(tierReach(t, NYC_BANDS)))
        .toBeLessThanOrEqual(maxLatticePoints(tierReach(t, DEFAULT_BANDS)));
    }
  });

  it('world7·world8 부트에는 band 기본값이 없다 (공유 트리 world-glb 는 무영향)', () => {
    for (const f of ['frontend/js/world7-boot.ts', 'frontend/js/world8-boot.ts']) {
      expect(src(f), `${f} 가 band 를 선채움하고 있다`).not.toMatch(/band\s*:/);
    }
  });

  it('world-glb·world2 트리의 band fallback 은 1 그대로이고 NYC_BANDS 를 모른다', () => {
    for (const f of ['frontend/js/world-glb/main.ts', 'frontend/js/world2/main.ts']) {
      expect(src(f), `${f} 의 band fallback 이 1 이 아니다`).toMatch(/readNum\('band',\s*1,/);
      expect(src(f), `${f} 가 world10 밴드를 읽는다`).not.toContain('NYC_BANDS');
    }
    // `lod.ts` 의 원본 값도 불변이다(팀장 조건 B-1).
    expect(DEFAULT_BANDS).toEqual({
      nearEnter: 1.15, nearExit: 1.30, midEnter: 1.55, midExit: 1.75, farEnter: 2.10, farExit: 2.40,
    });
  });

  it('판정 기록이 남아 있다 — 팀장 판정·draw 미해결·재론 조건·경계', () => {
    const boot = src('frontend/js/world10-boot.ts');
    for (const mark of ['팀장 판정 2026-09-11', '재론 조건', '여기서 멈춘다', '측정 축', '미해결']) {
      expect(boot, `world10-boot.ts 에 「${mark}」 기록이 없다`).toContain(mark);
    }
    // A1: 철회된 진술이 되살아나지 않는다.
    expect(boot, '철회된 «셋 다 예산 안» 이 되살아났다').not.toContain('| 셋 다 예산 안');
    const bands = src('frontend/js/world10/decide/nyc-bands.ts');
    for (const mark of ['팀장 판정 2026-09-11 B1', '재론 조건', '여기서 멈춘다']) {
      expect(bands, `nyc-bands.ts 에 「${mark}」 기록이 없다`).toContain(mark);
    }
  });
});
