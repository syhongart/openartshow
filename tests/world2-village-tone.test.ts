// tests/world2-village-tone.test.ts — 마을 파츠 **색(tone) 어댑터** (`G-EDIT7`).
//
// 팀장 판정 2026-08-21 로 축별 크기(sx·sy·sz)보다 **먼저** 열린 문이다. 계약은 `tone` 을
// 이미 담고 있었는데(`decide/overlay.ts` 의 `normalizePart`) 그것을 만질 문이 0건이었다.
//
// ── 여기서 재는 것 ──────────────────────────────────────────────────────────
// 어댑터가 **계약대로 접는가**. 색은 팔레트 인덱스이고 상한을 파츠가 소유하므로,
// 어긋나면 «견본에 보이는 색과 화면의 색이 다르다» 가 된다 — 그 어긋남은 화면에서만
// 드러나고 헤드리스로는 못 본다. 그래서 산술로 잡는다.
//
// ── 여기서 **못** 재는 것 ───────────────────────────────────────────────────
// ⚠ **그 색이 화면에서 실제로 어떻게 보이는가.** `tones` 는 색이 아니라 **곱셈기**라
// (`parts/types.ts`) 텍스처가 있는 파츠는 팔레트끼리 차이가 아주 작다 — 실측:
// `tree` = #ffffff · #e8f0e0 · #f2ece0 (거의 같다), `building` = #8892a0 ~ #737d8a
// (명도가 눈에 띈다). **파츠마다 다르고, 그 판정은 감독 눈뿐이다.**

import { describe, it, expect } from 'vitest';
import { villageTarget } from '../frontend/js/world2/edit/target.js';
import { tonesFor } from '../frontend/js/world2/parts/index.js';
import type { OverlayHost, VillagePick } from '../frontend/js/world2/edit/types.js';

/** 파츠 하나. `kind` 가 팔레트를 정하므로 그것이 이 하네스의 축이다 */
const part = (kind: string, tone = 0) =>
  ({ kind, x: 1, z: 2, y: 0, ry: 0, sx: 1, sy: 1, sz: 1, tone });

function host(parts: readonly unknown[], freezes = { n: 0 }): OverlayHost {
  return {
    doc: globalThis.document,
    cellX: 32,
    cellZ: 32,
    entries: () => [],
    apply() {},
    remove() {},
    surfaceAt: () => 0,
    village: { partsAt: () => parts, freeze: () => { freezes.n++; }, isFrozen: () => false },
    retargetSlot: () => {},
  } as unknown as OverlayHost;
}

const pick = (kind: string): VillagePick =>
  ({ px: 0, pz: 0, index: 0, kind, x: 1, y: 0, z: 2, frozen: false, slot: null }) as VillagePick;

// ── GS-T1 — 문을 낼지 말지는 **팔레트가 정한다** ────────────────────────────
describe('GS-T1 — 색 문은 고를 것이 있을 때만 열린다', () => {
  it('색이 여럿인 파츠(tree=3)는 문을 내고 개수가 팔레트와 같다', () => {
    const t = villageTarget(host([part('tree')]), pick('tree'));
    expect(t?.tone, '🔴 팔레트가 3색인데 색 문이 없다').toBeTruthy();
    expect(t!.tone!.count).toBe(tonesFor('tree').length);
    expect(t!.tone!.count).toBeGreaterThan(1);
  });

  it('🔴 색이 하나뿐인 파츠(road=1)는 문을 **안** 낸다 — 눌러도 안 바뀌는 견본은 거짓 UI다', () => {
    expect(tonesFor('road').length, '전제가 깨졌다 — road 가 다색이 되면 이 검사를 다시 짠다')
      .toBe(1);
    const t = villageTarget(host([part('road')]), pick('road'));
    expect(t, '어댑터 자체는 서야 한다').toBeTruthy();
    expect(t!.tone, '🔴 고를 것이 하나뿐인데 견본 줄을 냈다').toBeUndefined();
  });

  it('견본 색은 파츠가 소유한 그 값이다 — 편집이 색을 지어내지 않는다', () => {
    const pal = tonesFor('building');
    const t = villageTarget(host([part('building')]), pick('building'));
    for (let i = 0; i < pal.length; i++) expect(t!.tone!.swatch(i)).toBe(pal[i]);
  });
});

// ── GS-T2 — 접기와 버리기 ───────────────────────────────────────────────────
describe('GS-T2 — 범위 밖은 버리고, 저장된 값은 접어서 읽는다', () => {
  it('고른 색이 파츠에 남는다', () => {
    const p = part('tree');
    const t = villageTarget(host([p]), pick('tree'));
    t!.tone!.set(2);
    expect(p.tone).toBe(2);
    expect(t!.tone!.get()).toBe(2);
  });

  it('🔴 범위 밖·정수 아님은 **버린다** — 조용히 접어 넣으면 고른 칸과 화면이 갈린다', () => {
    const p = part('tree', 1);
    const t = villageTarget(host([p]), pick('tree'));
    for (const bad of [-1, 3, 99, 1.5, NaN, Infinity]) {
      t!.tone!.set(bad);
      expect(p.tone, `🔴 ${bad} 를 받아들였다`).toBe(1);
    }
  });

  it('🔴 저장된 값이 팔레트를 넘으면 **접어서** 읽는다 — parcel-assets 의 setTone 과 같은 접기', () => {
    // 계약(`normalizePart`)은 「0 이상 정수」만 보장하고 상한은 파츠가 소유한다.
    // 밀도 노브가 바뀌어 파츠 종류가 갈리면 옛 `tone` 이 팔레트보다 클 수 있다.
    const pal = tonesFor('tree');
    const t = villageTarget(host([part('tree', pal.length + 1)]), pick('tree'));
    expect(t!.tone!.get()).toBe(1);
    expect(t!.tone!.get()).toBeLessThan(pal.length);
  });
});
