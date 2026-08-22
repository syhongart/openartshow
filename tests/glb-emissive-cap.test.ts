// GLB 발광 세기 상한 — 감독 신고 2026-08-22 *"glb건물 현관의 조명이 너무쎄다"*.
//
// ── 무엇이 문제였나 (실측) ──────────────────────────────────────────────────
// `frontend/assets/models/lab-space.glb` 의 재질 17개 중 `'light'` 하나가
// `emissiveFactor [1,1,1]` + `KHR_materials_emissive_strength: 300` 이다. three 의
// GLTFLoader 가 그것을 `emissiveIntensity` 로 옮기므로 화면 휘도가 **300** 이 된다 —
// 같은 씬의 가로등(0.88)·물 윤슬(0.85) 대비 **340배**이고 블룸 문턱(0.75)을 400배 넘겨
// 흰 덩어리로 뭉갠다.
//
// `noext` 모드가 이것을 안 막은 것은 **의도였다** — `EXT_OFF` 는 실기기에서 화면을 먹는
// 확장만 끄고 *"emissive 는 전부 그대로 둔다"* 가 그 처방의 요점이었다. 그때 문제였던
// 것은 「안 보인다」이고 「너무 밝다」는 이번에 처음 나왔다.
//
// ── 이 파일이 **못 보는 것** (통과로 적지 않는다) ───────────────────────────
// 🔴 **화면.** 상한값 2 가 「조명으로 보이되 안 뭉개지는」 값인지는 톤매핑 뒤에서만
// 판정되고, 블룸은 WebGPU 전용이라 헤드리스에서 아예 안 켜진다. **감독 화면이 유일한
// 판정 수단**이고 그래서 `?glbemis=` 를 노브로 열었다. 여기서 잠그는 것은 **상한이 실제로
// 걸리는가**까지다.

import { describe, it, expect } from 'vitest';
import {
  disableMatExtensions, readEmissiveCap, EMISSIVE_CAP, EMISSIVE_CAP_MAX, EXT_OFF,
} from '../frontend/js/world-shared/glb-material.js';

/** three 재질의 최소 모양. 실물을 안 쓰는 이유는 `night-lights.ts` 와 같다(TS2694) */
type Mat = Record<string, unknown>;
/**
 * `traverse` + `isMesh` + `material` 이 이 함수의 계약이다.
 * ⚠ 처음에 `isMesh` 를 빠뜨려 검사가 전부 빨간불이었다 — **구현이 아니라 스텁이 틀린**
 * 경우이고, 「구현이 틀린 것은 아닌가」를 먼저 본 뒤에야 갈렸다.
 */
function modelWith(...mats: Mat[]) {
  const nodes = mats.map((material) => ({ isMesh: true, material }));
  return { traverse(fn: (o: unknown) => void) { nodes.forEach(fn); } } as never;
}

describe('🔴 GLB 발광 상한 — 현관 조명이 타지 않는다', () => {
  it('🔴 300 이 상한으로 잘린다 — 감독이 본 그 값이다', () => {
    const m: Mat = { emissiveIntensity: 300 };
    disableMatExtensions(modelWith(m));
    expect(m.emissiveIntensity, '🔴 현관 조명이 그대로 300 이다 — 화면에서 뭉개진다')
      .toBe(EMISSIVE_CAP);
  });

  it('🔴 상한은 **대입이 아니라 min** 이다 — 어두운 것을 밝히면 안 된다', () => {
    const dim: Mat = { emissiveIntensity: 0.3 };
    disableMatExtensions(modelWith(dim));
    expect(dim.emissiveIntensity, '🔴 원본이 상한보다 작은데 값이 바뀌었다').toBe(0.3);
  });

  it('발광이 없는 재질은 건드리지 않는다 — 없는 속성을 만들면 안 된다', () => {
    const plain: Mat = { roughness: 0.5 };
    disableMatExtensions(modelWith(plain));
    expect('emissiveIntensity' in plain).toBe(false);
  });

  it('🔴 상한을 인자로 덮을 수 있다 — 노브가 이 경로를 탄다', () => {
    const m: Mat = { emissiveIntensity: 300 };
    disableMatExtensions(modelWith(m), 10);
    expect(m.emissiveIntensity).toBe(10);
  });

  it('🔴 확장 끄기는 그대로다 — 상한을 더하면서 옛 처방을 깨면 실기기가 안 보인다', () => {
    const m: Mat = { sheen: 0.8, clearcoat: 1, ior: 2.2, emissiveIntensity: 300 };
    disableMatExtensions(modelWith(m));
    expect(m.sheen, '🔴 sheen 이 안 꺼졌다').toBe(EXT_OFF.sheen);
    expect(m.clearcoat).toBe(EXT_OFF.clearcoat);
    expect(m.ior).toBe(EXT_OFF.ior);
  });

  it('여러 재질을 한 번에 — 모델 하나에 조명이 여럿일 수 있다', () => {
    const a: Mat = { emissiveIntensity: 300 };
    const b: Mat = { emissiveIntensity: 50 };
    disableMatExtensions(modelWith(a, b));
    expect(a.emissiveIntensity).toBe(EMISSIVE_CAP);
    expect(b.emissiveIntensity).toBe(EMISSIVE_CAP);
  });
});

describe('🔴 `?glbemis=` 노브', () => {
  /** `readNum` 을 주입받는 구조라 URL 없이 잰다 — 그것이 이 설계의 값이다 */
  const fake = (given: number) => (
    (_k: string, _f: number, min: number, max: number) => Math.max(min, Math.min(max, given))
  );

  it('키와 범위를 이 파일이 소유한다 — 호출자가 각자 적으면 미러링이다', () => {
    expect(readEmissiveCap(fake(10))).toBe(10);
  });

  it('🔴 노브가 **없으면** 기본 상한이 걸린다 — 대부분의 방문자가 타는 경로다', () => {
    // ⚠ 위 `fake` 는 주어진 값을 그대로 돌려주므로 **fallback 을 한 번도 안 태운다.**
    // 그래서 기본값을 원본(300)으로 바꿔도 검사가 통과했다(뮤테이션 M-C = 0 failed).
    // 노브 없는 경로가 곧 라이브 기본값이고, 감독이 본 화면이 바로 그 경로였다.
    const noKnob = (_k: string, f: number, min: number, max: number) => Math.max(min, Math.min(max, f));
    expect(readEmissiveCap(noKnob), '🔴 노브 없이 들어온 방문자에게 상한이 안 걸린다')
      .toBe(EMISSIVE_CAP);
  });

  it('🔴 0 이면 발광을 완전히 끈다 — 「조명을 아예 안 켠다」 후보', () => {
    expect(readEmissiveCap(fake(0))).toBe(0);
    const m: Mat = { emissiveIntensity: 300 };
    disableMatExtensions(modelWith(m), 0);
    expect(m.emissiveIntensity).toBe(0);
  });

  it('🔴 상한을 원본까지 열어 둔다 — 되돌릴 문이 없으면 판정을 못 뒤집는다', () => {
    expect(EMISSIVE_CAP_MAX, '🔴 원본(300)을 못 돌려받는다').toBeGreaterThanOrEqual(300);
    expect(readEmissiveCap(fake(300))).toBe(300);
  });

  it('기본값이 블룸 문턱보다 크다 — 조명이 조명으로 보이려면 넘어야 한다', async () => {
    const { BLOOM_THRESHOLD } = await import('../frontend/js/world2/features/postfx-params.js');
    expect(EMISSIVE_CAP).toBeGreaterThan(BLOOM_THRESHOLD);
  });
});

// ── ⚠ 상한이 **안** 걸리는 경로 — 사실을 못 박아 둔다 ────────────────────────
// 이 회차에 나는 `applyMatMode` 의 JSDoc 에 *"`swap`/`std` 는 재질을 갈아 끼워 원본
// 발광이 안 넘어온다"* 라고 적었고 **`std` 에 대해서는 거짓이었다** — `CARRY_MAPS` 가
// `emissiveIntensity` 를 그대로 옮긴다. 화면 영향은 없다(기본이 `noext` 다). 그러나
// 게이트·처방 범위에 대한 거짓 진술은 다음 사람이 확인을 생략하게 만든다 —
// `main` unprotected 오기가 7일을 잃은 그 형태다.
//
// 그래서 **주석을 사실로 되돌리고, 그 사실을 검사로 만든다.** `CARRY_MAPS` 에서
// `emissiveIntensity` 를 빼거나 `std` 에 상한을 거는 날, 이 검사가 그 주석으로
// 데려간다. 「상한을 `std` 에도 걸 것인가」 자체는 별건 판정이다.
describe('상한이 걸리지 않는 경로를 사실대로 적었는가', () => {
  it('std 는 원본 emissiveIntensity 를 그대로 옮긴다 — 상한 밖이다', async () => {
    const { CARRY_MAPS } = await import('../frontend/js/world-shared/glb-city.js');
    expect(
      CARRY_MAPS as readonly string[],
      '🔴 CARRY_MAPS 가 바뀌었다 — applyMatMode 의 JSDoc 이 그 사실을 서술한다',
    ).toContain('emissiveIntensity');
  });

  it('그 사실이 JSDoc 에 적혀 있다 — 코드만 맞고 서술이 거짓이면 다음 사람이 속는다', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('frontend/js/world-shared/glb-city.ts', 'utf8');
    const doc = src.slice(0, src.indexOf('function applyMatMode('));
    const tail = doc.slice(doc.lastIndexOf('@returns 손댄 재질 수'));
    expect(tail, '🔴 std 가 예외라는 사실이 JSDoc 에서 사라졌다').toContain('`std` 는 예외다');
    expect(tail).toContain('CARRY_MAPS');
  });
});
