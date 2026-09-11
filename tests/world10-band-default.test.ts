// @vitest-environment jsdom
//
// world10 기본 밴드 0.5 — 팀장 판정 2026-09-11 처방 (a) 의 회귀 게이트.
//
// ── 왜 이 파일이 있는가 ──────────────────────────────────────────────────────
// 밴드는 `world10/main.ts` 가 `readNum('band', 1, …)` 로 읽고 **기본값은 부트가
// 채운다**(`world10-boot.ts` DEFAULTS — hemig 선례). 즉 「이 페이지의 실효 밴드」는
// 두 파일에 걸쳐 있고, 어느 한쪽만 읽으면 답이 안 나온다:
//   · 부트만 보면 → main 이 그 문자열을 어떻게 클램프하는지 모른다
//   · main 만 보면 → 기본값이 1.0 으로 보인다(실제로는 0.5 다)
// 「판정/집행 경계는 아무도 안 본다」가 이 저장소의 상시 구멍이라, 여기서는 **부트를
// 실제로 실행해** 주소창에 찍힌 값을 `readNum` 에 그대로 먹인다.
//
// ── 무엇을 지키는가 ──────────────────────────────────────────────────────────
//   ① 기본 밴드가 0.5 다 (M-B1: '1' 로 되돌리면 여기서 깨진다)
//   ② `?band=1` 이 옛 값을 그대로 재현한다 (C-a2 — 노브를 죽이지 않았다)
//   ③ 이 변경이 world2·world7·world8 로 새지 않는다 (world10 전용 트리·전용 부트)
//   ④ C-a3 — 슬롯 예산은 밴드에서 **유도**되어 따라오고, 안개·비행천장·그림자는
//      **안 따라온다**(미해결·팀장 상신). 뒤쪽은 결함을 «정상» 으로 박는 것이 아니라,
//      고치는 사람이 이 기록을 반드시 지나가게 하는 표식이다.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readNum } from '../frontend/js/world10/url-knob.js';
import {
  DEFAULT_BANDS, scaleBands, validBands, tierReach, maxLatticePoints,
} from '../frontend/js/world10/decide/lod.js';
import { maxCells } from '../frontend/js/world10/systems/nyc-cell-builder.js';
import { FOG_NEAR_CELLS, FOG_FAR_CELLS } from '../frontend/js/world10/decide/fog.js';
import { FLY_CEIL_CELLS } from '../frontend/js/world10/decide/fly.js';
import { residualAtSpawn, crossingCells } from '../frontend/js/world10/decide/lod-fade.js';
import { NYC_CELL } from '../frontend/js/world10/systems/nyc-parcels.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const src = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/** 부트를 **실제로 실행**하고, 그 결과 주소창에 남은 `?band=` 를 돌려준다. */
async function runBoot(initialSearch: string): Promise<string | null> {
  // `startGlbWorld` 는 three/webgpu 를 끌어온다 — 부트가 무엇을 «채우는가» 만 보는
  // 검사라 렌더러는 필요 없다. 막지 않으면 이 검사가 재는 축이 GPU 가용성이 된다.
  vi.doMock('../frontend/js/world10/main.js', () => ({
    startGlbWorld: () => Promise.resolve(),
  }));
  vi.resetModules();
  window.history.replaceState(null, '', `/app/world10.html${initialSearch}`);
  await import('../frontend/js/world10-boot.js');
  return new URL(window.location.href).searchParams.get('band');
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
});

describe('① 기본 밴드 0.5 — 팀장 판정 2026-09-11 (a)', () => {
  it('부트가 주소창에 band=0.5 를 채운다 [M-B1: 이 값을 1 로 되돌리면 깨진다]', async () => {
    expect(await runBoot('')).toBe('0.5');
  });

  it('부트가 채운 값이 main.ts 의 readNum 을 통과해 실효 0.5 가 된다', async () => {
    await runBoot('');
    // 읽기 인자(키·fallback·범위)를 여기 다시 적지 않는다 — `main.ts` 원문에서 뽑아
    // 그대로 먹인다. 손으로 적으면 범위를 넓히는 날 한쪽만 넓어진다(값 미러링).
    const call = /readNum\('band',\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/.exec(src('frontend/js/world10/main.ts'));
    expect(call, 'world10/main.ts 에서 readNum(\'band\', …) 호출을 못 찾았다').not.toBeNull();
    const [, fb, lo, hi] = call!;
    expect(readNum('band', Number(fb), Number(lo), Number(hi))).toBe(0.5);
    // 클램프 하한에 걸려 우연히 0.5 가 된 것이 아니어야 한다 — 하한이 0.5 인 것은
    // 사실이므로, 「채워진 값 그대로」인지 별도로 확인한다.
    expect(Number(lo)).toBeLessThanOrEqual(0.5);
  });

  it('실효 밴드 0.5 가 히스테리시스 불변식을 깨지 않는다', () => {
    expect(validBands(scaleBands(DEFAULT_BANDS, 0.5))).toBe(true);
  });
});

describe('② ?band=1 — 옛 값 재현 (C-a2)', () => {
  it('부트는 URL 에 이미 있는 band 를 덮지 않는다', async () => {
    expect(await runBoot('?band=1')).toBe('1');
  });

  it('?band=1 의 실효 밴드가 DEFAULT_BANDS 원본과 동일하다', async () => {
    await runBoot('?band=1');
    expect(readNum('band', 1, 0.5, 4)).toBe(1);
    // `scaleBands(b, 1)` 은 원본 객체를 그대로 돌려준다 — 배율 1 이 no-op 이라는 것이
    // 「옛 값 재현」의 근거다.
    expect(scaleBands(DEFAULT_BANDS, 1)).toBe(DEFAULT_BANDS);
  });

  it('다른 기본값(glb·grass·hemig)도 URL 값을 덮지 않는다 — 선채움 가드가 band 전용이 아니다', async () => {
    vi.doMock('../frontend/js/world10/main.js', () => ({ startGlbWorld: () => Promise.resolve() }));
    vi.resetModules();
    window.history.replaceState(null, '', '/app/world10.html?glb=1&grass=1&band=2');
    await import('../frontend/js/world10-boot.js');
    const q = new URL(window.location.href).searchParams;
    expect([q.get('glb'), q.get('grass'), q.get('band')]).toEqual(['1', '1', '2']);
  });
});

describe('③ world10 전용 — 다른 페이지로 새지 않는다', () => {
  it('world7·world8 부트에는 band 기본값이 없다 (공유 트리 world-glb 는 무영향)', () => {
    for (const f of ['frontend/js/world7-boot.ts', 'frontend/js/world8-boot.ts']) {
      expect(src(f), `${f} 가 band 를 선채움하고 있다`).not.toMatch(/band\s*:/);
    }
  });

  it('world-glb·world2 트리의 band fallback 은 1 그대로다', () => {
    for (const f of ['frontend/js/world-glb/main.ts', 'frontend/js/world2/main.ts']) {
      expect(src(f), `${f} 의 band fallback 이 1 이 아니다`).toMatch(/readNum\('band',\s*1,/);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ④ C-a3 — 밴드 변경에 무엇이 따라오고 무엇이 안 따라오는가
// ════════════════════════════════════════════════════════════════════════════
describe('④-a 따라온다 — 슬롯 예산은 밴드에서 유도된다', () => {
  const B1 = DEFAULT_BANDS;
  const B05 = scaleBands(DEFAULT_BANDS, 0.5);

  it('maxCells = maxLatticePoints(tierReach(far)) — 21 → 6', () => {
    expect(maxCells(B1)).toBe(21);
    expect(maxCells(B05)).toBe(6);
    // 상수를 적은 것이 아니라 유도식이라는 것 자체를 못 박는다 — 여기가 끊기면
    // 밴드를 넓혀도 슬롯이 안 따라오고, 그 부족은 조용하다(`MAX_PARCELS=20` 사고).
    expect(maxCells(B05)).toBe(maxLatticePoints(tierReach('far', B05)));
  });

  it('near·mid 풀 상한도 같은 식으로 따라온다 — 7→2 · 12→4', () => {
    expect([maxLatticePoints(tierReach('near', B1)), maxLatticePoints(tierReach('mid', B1))]).toEqual([7, 12]);
    expect([maxLatticePoints(tierReach('near', B05)), maxLatticePoints(tierReach('mid', B05))]).toEqual([2, 4]);
  });

  it('물리 반경이 절반이 된다 — farExit 153.6m → 76.8m (셀 64m)', () => {
    expect(NYC_CELL * B1.farExit).toBeCloseTo(153.6, 6);
    expect(NYC_CELL * B05.farExit).toBeCloseTo(76.8, 6);
  });
});

describe('④-b ⚠ 안 따라온다 — 안개·비행천장은 DEFAULT_BANDS 에 고정 (미해결·팀장 상신)', () => {
  const B05 = scaleBands(DEFAULT_BANDS, 0.5);

  // ⚠⚠ 아래 셋은 **바람직한 상태를 단언하는 것이 아니다.** `scaleBands` 헤더가
  // *"안개는 이 배율을 따라가지 않는다 — 진단 전용이고, 상시 값으로 쓰려면 안개·그림자
  // 밴드와 함께 설계해야 한다"* 고 미리 적어 둔 그 구멍이 **기본 경로로 들어왔다**는
  // 사실을 고정한다. 연동을 설계하는 회차에 이 세 검사가 깨지고, 깨진 사람은 이 주석을
  // 지나간다 — 그것이 이 검사들의 목적이다(근거는 `world10-boot.ts` 판정 기록 ⑤).
  it('안개는 배율과 무관하게 2.40셀 = 153.6m 에 남는다', () => {
    expect(FOG_FAR_CELLS).toBe(DEFAULT_BANDS.farExit);
    expect(FOG_FAR_CELLS).not.toBe(B05.farExit);
  });

  it('그래서 렌더가 끊기는 지점(76.8m)의 안개 진행률이 0% 다 — 세계 끝이 그대로 드러난다', () => {
    // `THREE.Fog` 는 near~far 선형이다. 진행률 t = (d − near)/(far − near).
    const t = (B05.farExit - FOG_NEAR_CELLS) / (FOG_FAR_CELLS - FOG_NEAR_CELLS);
    expect(Math.min(1, Math.max(0, t))).toBe(0);
    // 밴드 1.0 에서는 정확히 1(완전히 닫힘)이었다 — 그것이 `fog.ts` 가 세운 규약이다.
    const t1 = (DEFAULT_BANDS.farExit - FOG_NEAR_CELLS) / (FOG_FAR_CELLS - FOG_NEAR_CELLS);
    expect(t1).toBe(1);
  });

  it('등장 팝인이 0.375 → 1.0 으로, 페이드 구간이 0.5 → 0 셀로 간다', () => {
    expect(residualAtSpawn(DEFAULT_BANDS)).toBeCloseTo(0.375, 6);
    expect(residualAtSpawn(B05)).toBe(1);
    expect(crossingCells(DEFAULT_BANDS)).toBeCloseTo(0.5, 6);
    expect(crossingCells(B05)).toBe(0);
  });

  it('비행 천장도 원본 밴드에 고정돼 있다', () => {
    expect(FLY_CEIL_CELLS).toBe(DEFAULT_BANDS.farExit);
  });

  it('그림자 밴드 fallback 도 DEFAULT_BANDS.farExit 라 배율을 안 탄다', () => {
    expect(src('frontend/js/world10/main.ts')).toMatch(/readNum\('shband',\s*DEFAULT_BANDS\.farExit/);
  });
});

describe('④-c 판정 기록이 값 옆에 남아 있다', () => {
  it('world10-boot.ts 가 팀장 판정·재론 조건·경계·동반 결함을 함께 적는다', () => {
    const boot = src('frontend/js/world10-boot.ts');
    for (const mark of ['팀장 판정 2026-09-11', '재론 조건', '여기서 멈춘다', '동반 결함']) {
      expect(boot, `world10-boot.ts 에 「${mark}」 기록이 없다`).toContain(mark);
    }
  });
});
