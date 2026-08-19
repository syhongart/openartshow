// @vitest-environment node
//
// **걸린 작품의 크기·위치 조절** (W8-11). 감독 지시 2026-08-18:
// *"내가 그림과 액자 크기 위치를 조절할수있는 옵션을 만들어줘"* · 카드 판정
// 「작품 하나씩」·「슬라이더·숫자」.
//
// ── 이 파일이 재는 것 / 못 재는 것 ─────────────────────────────────────────
// | 축 | 여기서 |
// |---|---|
// | 어댑터 순수성(`s` 배수·클램프·사본) | ★ 잰다 |
// | `apply`/`commit` 분리 — **`apply` 가 `place()` 를 안 태운다** | ★ 잰다 |
// | 선택 배타(`artSel` ↔ `selected`·`villageSel`) | ★ 잰다 |
// | 씬 `retarget` 이 실제로 자세를 옮기는가 | ★ 잰다 (three 스텁 주입) |
// | 등장 배수(W8-10)와 **곱해지는가** | ★ 잰다 |
// | 슬라이더 DOM 의 손맛(범위·스텝이 손에 맞는가) | ✗ 감독 체감 |
// | **패널 DOM·배선**(칸이 서는가·클릭이 이어지는가·손 떼면 확정되는가) | → `world2-edit-panel-wiring.test.ts` |
// | WebGPU 실기기 | ✗ 원리적으로 못 잰다 |
//
// ⚠ **이 표의 셋째 줄은 원래 없었고, 그 빠짐이 검수관 반려 B4 였다**(2026-08-19).
// 그때 「못 재는 것」에 *「슬라이더 손맛」* 만 적혀 있어서 **DOM·배선 계층 전부가 안
// 재지고 있다는 사실이 「원리적 한계」처럼 읽혔다.** 검수관이 다섯 뮤테이션을 심어
// 전부 0 failed 임을 실측했고, 이 저장소에는 jsdom 패널 검사 관행이 **이미 셋** 있었다
// — 즉 **「못 잼」이 아니라 「안 잼」**이었다. 그 구분을 지우는 것이 이 저장소가 이름
// 붙인 「못 잰 것이 통과로 적히는 경향」이고, 표는 그것을 **가장 잘 숨기는 자리**다.
//
// ⚠ **위치 축은 스텁이 `position` 을 기록해야 성립한다.** `tests/world2-artwork-scene.
// test.ts` 의 스텁은 `position: { set() { } }` 라 대입이 아무 데도 안 남는다 — 그 파일이
// 위치를 안 재기 때문에 옳은 스텁이지만, **여기서 그것을 그대로 쓰면 이 파일의 핵심 축이
// 구조적으로 0 이 된다.** 그래서 기록하는 스텁을 따로 둔다(대역이 실물의 성질을 안 가지면
// 검출력이 0 이라는 이 저장소의 규율).
//
// ── 검출력 실측 (뮤테이션, `npx vitest run tests/world2-art-edit.test.ts`) ──
//   심은 것                                                      failed
//   M1  `artTarget` 의 `commit()` 을 no-op 으로                        3
//   M2  `s` 세터를 배수가 아니라 **절대값**으로(`cur.w = m`)             2
//   M3  `apply()` 가 `port.set()` 도 부르게(= place 를 태움)            3
//   M4  `select()` 의 `art` 분기에서 `st.selected = null` 을 지움        1
//   M5  `retarget` 의 `p.sizeMul` 곱을 지움(등장 배수만 남김)            3
//   M6  `width.set` 의 범위 검사를 지움                                1
//   M7  **주석 한 줄만 변경(등가 대조군)**                              0
//
// 등가 대조군(M7)을 함께 적는 이유: 「0 failed」가 **검출력 부족**인지 **뮤테이션이 등가**
// 인지 구별하기 위해서다. 직전 회차(W8-10)에 `frames += 0` 을 심고 0 failed 를 본 뒤 검사가
// 약하다고 오판할 뻔했다 — 그 뮤테이션이 동작을 안 바꾼 것이었다.
//
// ⚠ **M3·M5 는 예상 1 이었고 실측 3 이었다.** 표를 「예상」으로 적어 두고 실행을 생략하면
// 그 수는 아무것도 뜻하지 않는다 — 이 저장소는 실행 안 한 표가 거짓이었던 사례를
// 두 번(검수관 B1·블로커) 갖고 있다. 표의 수는 **전부 실행해서 얻은 것**이다.

import { describe, it, expect } from 'vitest';
import { createArtsPort, type ArtPlacer } from '../frontend/js/world2/systems/art-port.js';
import { createArtworkScene, type ArtThreeNS, type ArtNode } from '../frontend/js/world2/systems/artwork-scene.js';
import {
  artTarget, describe as describeTarget, describeShort,
} from '../frontend/js/world2/edit/target.js';
import { createEditState, select } from '../frontend/js/world2/edit/state.js';
import {
  ART_W_MIN, ART_W_MAX, artName, type ArtPose, type ArtworkItem,
} from '../frontend/js/world2/decide/artwork.js';
import { START_SCALE } from '../frontend/js/world2/decide/lod-fade.js';
import type { OverlayHost, OverlayEntry } from '../frontend/js/world2/edit/types.js';

const CELL = 32;

const art = (over: Partial<ArtworkItem> = {}): ArtworkItem => ({
  src: 'assets/art/a.png', x: 1, y: 3, z: 2, ry: 0, w: 2.4, ar: 1.2, ...over,
});

/** 씬을 안 물린 포트 — 어댑터의 순수한 계산만 볼 때 쓴다 */
function bareePort(items: readonly ArtworkItem[]): ReturnType<typeof createArtsPort> {
  const port = createArtsPort((s) => s);
  void port.set(items);
  return port;
}

/**
 * 씬 대신 **호출을 기록**하는 대역. `place`/`retarget` 이 각각 몇 번, 무엇으로 불렸는지가
 * 이 파일의 중심 축이다 — 「미는 동안 `place` 0회」가 이 회차의 성능 판정 전부다.
 */
function spyPlacer(): ArtPlacer & { places: number; targets: (readonly [number, ArtPose])[] } {
  const rec = {
    places: 0,
    targets: [] as (readonly [number, ArtPose])[],
    async place(): Promise<void> { rec.places++; },
    retarget(i: number, t: ArtPose): void { rec.targets.push([i, { ...t }] as const); },
  };
  return rec;
}

// ── 어댑터 ──────────────────────────────────────────────────────────────────

describe('★ 액자 어댑터 — 걸린 작품을 `EditTarget` 으로', () => {
  it('★ 범위 밖 인덱스는 `null` — 「골랐는데 아무것도 안 먹는」 상태를 안 만든다', () => {
    const port = bareePort([art()]);
    expect(artTarget(port, -1)).toBeNull();
    expect(artTarget(port, 1)).toBeNull();
    expect(artTarget(port, 0)).not.toBeNull();
  });

  it('★ `x·y·z·ry` 가 왕복한다', () => {
    const t = artTarget(bareePort([art()]), 0)!;
    expect([t.x, t.y, t.z, t.ry]).toEqual([1, 3, 2, 0]);
    t.x = 5; t.y = 1.5; t.z = -4; t.ry = 1;
    expect([t.x, t.y, t.z, t.ry]).toEqual([5, 1.5, -4, 1]);
  });

  it('★ `s` 는 **`w` 에 대한 배수**다 — 절대값이 아니다', () => {
    const t = artTarget(bareePort([art({ w: 2.4 })]), 0)!;
    expect(t.s, '★ 처음은 원래 크기 = ×1').toBe(1);
    t.s = 2;
    expect(t.s, '★ 배수가 왕복 안 된다').toBe(2);
    expect(t.width!.get(), '★ 배수가 실치수로 안 간다 — ×2 는 2.4m → 4.8m').toBeCloseTo(4.8, 6);
  });

  it('★ `s` 가 계약 범위를 벗어나면 **무시**한다 — 조용히 자르지 않는다', () => {
    const t = artTarget(bareePort([art({ w: 2.4 })]), 0)!;
    // 2.4 × 0.01 = 0.024m < ART_W_MIN(0.2)
    t.s = 0.01;
    expect(t.s, '★ 하한 밖 입력이 먹었다').toBe(1);
    // 2.4 × 10 = 24m > ART_W_MAX(12)
    t.s = 10;
    expect(t.s, '★ 상한 밖 입력이 먹었다').toBe(1);
    // 경계 안쪽은 먹어야 한다 — 「전부 무시」로 고쳐도 위 둘은 통과하므로 짝이 필요하다.
    t.s = 2;
    expect(t.s).toBe(2);
  });

  it('★ `width` 는 **실치수**를 내고 범위는 계약이 소유한다', () => {
    const t = artTarget(bareePort([art({ w: 2.4 })]), 0)!;
    expect(t.width!.min).toBe(ART_W_MIN);
    expect(t.width!.max).toBe(ART_W_MAX);
    t.width!.set(6);
    expect(t.width!.get()).toBe(6);
    expect(t.s, '★ 실치수를 밀었는데 배수가 안 따라온다').toBeCloseTo(2.5, 6);
    // 범위 밖은 `s` 세터와 **같은 규약**으로 무시된다 — 두 문이 어긋나면
    // 「슬라이더로는 되는데 숫자칸으로는 안 된다」가 난다.
    t.width!.set(ART_W_MAX + 1);
    expect(t.width!.get()).toBe(6);
    t.width!.set(ART_W_MIN - 0.01);
    expect(t.width!.get()).toBe(6);
  });

  it('★ 실치수 문을 **액자만** 낸다 — 낼 것이 없는 대상이 숫자를 내면 거짓말이다', () => {
    const t = artTarget(bareePort([art()]), 0)!;
    expect(t.width, '★ 액자가 실치수를 안 낸다').toBeDefined();
    expect(t.kind).toBe('art');
  });

  it('★ 이름을 낸다 — 화면 세 곳이 **같게** 부르려면 어댑터가 소유해야 한다', () => {
    const t = artTarget(bareePort([art({ src: 'assets/art/노을.jpg' })]), 0)!;
    expect(t.name).toBe('노을.jpg');
    expect(t.name).toBe(artName('assets/art/노을.jpg'));
    expect(describeTarget(t, null, null)).toContain('노을.jpg');
    expect(describeShort(t, null, null)).toBe('노을.jpg');
  });
});

// ── `apply` / `commit` 분리 — 이 회차의 성능 판정 ────────────────────────────

describe('★ `apply` 는 씬만, `commit` 이 목록을 확정한다', () => {
  it('🔴 `apply` 가 `place()` 를 **안 태운다** — 미는 내내 지오·재질이 죽고 태어나면 안 된다', () => {
    const spy = spyPlacer();
    const port = createArtsPort((s) => s);
    port.attach(spy);
    void port.set([art()]);
    const places0 = spy.places;   // `set` 한 번은 정당하다(전체 대체)

    const t = artTarget(port, 0)!;
    for (let i = 0; i < 20; i++) { t.width!.set(1 + i * 0.1); t.apply(); }

    expect(spy.places - places0, '🔴 미는 동안 `place()` 가 돌았다 — `[7]` 이 보는 그 증상이다').toBe(0);
    expect(spy.targets.length, '★ 씬에 자세가 안 갔다 — 미리보기가 죽었다').toBe(20);
    expect(spy.targets[19][0]).toBe(0);
    expect(spy.targets[19][1].w).toBeCloseTo(2.9, 6);
  });

  it('★ `apply` 는 **목록을 안 바꾼다** — 취소할 자리가 남아야 한다', () => {
    const port = bareePort([art({ w: 2.4 })]);
    const t = artTarget(port, 0)!;
    t.x = 99; t.width!.set(7);
    t.apply();
    expect(port.list()[0].x, '★ 확정 전에 목록이 바뀌었다').toBe(1);
    expect(port.list()[0].w).toBe(2.4);
  });

  it('★ `commit` 이 그 자리**만** 갈아 끼운다', async () => {
    const port = bareePort([art({ src: 'a' }), art({ src: 'b', x: 10 })]);
    const t = artTarget(port, 1)!;
    t.x = -3; t.width!.set(5);
    t.commit();
    await Promise.resolve();
    const after = port.list();
    expect(after.length).toBe(2);
    expect(after[0].src, '★ 옆 작품이 딸려 바뀌었다').toBe('a');
    expect(after[0].x).toBe(1);
    expect(after[1].x).toBe(-3);
    expect(after[1].w).toBe(5);
    expect(after[1].ar, '★ 종횡비까지 덮어썼다 — 사람이 만질 값이 아니다').toBe(1.2);
  });

  it('★ `commit` 은 `place()` 를 **한 번** 태운다 — 확정 뒤 테두리가 정확한 치수여야 한다', async () => {
    const spy = spyPlacer();
    const port = createArtsPort((s) => s);
    port.attach(spy);
    void port.set([art()]);
    await Promise.resolve();
    const places0 = spy.places;

    const t = artTarget(port, 0)!;
    t.width!.set(5);
    t.apply();
    t.commit();
    await Promise.resolve();
    expect(spy.places - places0).toBe(1);
  });

  it('★ `remove` 가 그 자리를 뺀다', async () => {
    const port = bareePort([art({ src: 'a' }), art({ src: 'b' }), art({ src: 'c' })]);
    expect(artTarget(port, 1)!.remove()).toBe(true);
    await Promise.resolve();
    expect(port.list().map((a) => a.src)).toEqual(['a', 'c']);
  });

  // ── 🔴 검수관 반려 B1 (2026-08-19) — 확정이 그 사이 걸린 작품을 지웠다 ──────
  //
  // 어댑터가 생성 시점 목록의 **스냅샷**을 되쓰고 있었다. 「A 를 고른 채 B 를 건다」가
  // 전시를 꾸미는 기본 동작이고 미리보기는 `blob:` 이라, 사라지면 되돌릴 수단이 없었다.
  // 아래 셋이 그 형태를 못 박는다 — 처방(`findAt`)의 근거는 `target.ts` 헤더 한 곳이다.

  it('🔴 확정이 **그 사이 걸린 작품**을 안 지운다 — 고른 채 한 장 더 거는 것이 기본 동작이다', async () => {
    const port = bareePort([art({ src: 'a', w: 2.4 })]);
    const t = artTarget(port, 0)!;
    // 고른 채로 한 장 더 건다(드롭·조준·기즈모 어느 경로든 이 형태다).
    await port.set([...port.list(), art({ src: 'b' })]);

    t.width!.set(5);
    t.commit();
    await Promise.resolve();

    expect(port.list().map((a) => a.src), '🔴 그 사이 걸린 작품이 사라졌다').toEqual(['a', 'b']);
    expect(port.list()[0].w, '★ 확정한 값이 안 실렸다').toBe(5);
  });

  it('🔴 삭제가 **목록을 통째로 비우지 않는다** — 스냅샷을 되쓰면 그렇게 된다', async () => {
    const port = bareePort([art({ src: 'a' })]);
    const t = artTarget(port, 0)!;
    await port.set([...port.list(), art({ src: 'b' })]);

    expect(t.remove()).toBe(true);
    await Promise.resolve();
    expect(port.list().map((a) => a.src), '🔴 나중에 건 것까지 지웠다').toEqual(['b']);
  });

  it('🔴 **앞 항목이 지워져 인덱스가 밀려도** 그때 그 작품을 짚는다', async () => {
    const port = bareePort([art({ src: 'a' }), art({ src: 'b', w: 2.4 })]);
    const t = artTarget(port, 1)!;   // b 를 고른다
    // 앞의 a 가 사라진다 — b 는 이제 0번이다.
    await port.set(port.list().slice(1));

    t.width!.set(7);
    t.commit();
    await Promise.resolve();
    const after = port.list();
    expect(after.map((x) => x.src)).toEqual(['b']);
    expect(after[0].w, '🔴 인덱스만 보면 밀려서 엉뚱한 것을 고치거나 아무것도 안 된다').toBe(7);
  });

  it('★ 고른 작품이 이미 지워졌으면 **아무것도 안 한다** — 조용히 되살리지 않는다', async () => {
    const port = bareePort([art({ src: 'a' }), art({ src: 'b' })]);
    const t = artTarget(port, 0)!;
    await port.set(port.list().slice(1));   // a 가 사라진다

    t.width!.set(9);
    t.commit();
    await Promise.resolve();
    expect(port.list().map((x) => x.src), '★ 지워진 작품이 되살아났다').toEqual(['b']);
    expect(t.remove(), '★ 없는 것을 지웠다고 말한다').toBe(false);
    await Promise.resolve();
    expect(port.list().map((x) => x.src)).toEqual(['b']);
  });

  // ── 🔴 검수관 재검수 반려 B-1 (2026-08-19) — **확정을 두 번** 하는 축 ────────
  //
  // 위 네 검사(B1 조치)가 전부 «확정을 **한 번** 한다» 였고, 그 사이로 새 결함이 지나갔다:
  // `commit()` 이 앵커 객체를 목록에서 밀어내는데 재앵커를 안 해서 **2차 확정부터 조용히
  // 죽었다.** 슬라이더 6 → 9 가 6 에 멈추고, 그런데 `apply()` 는 계속 돌아 **화면은 맞고
  // 내보내기 JSON 만 옛 값**이었다 — 원래 결함보다 조용하다.
  //
  // **상태를 바꾸는 함수를 고쳤으면 그 함수를 두 번 부르는 검사를 넣는다.** 아래가 그 축이다.

  it('🔴 확정을 **두 번** 해도 둘 다 실린다 — 슬라이더를 두 번 미는 것이 가장 흔한 조작이다', async () => {
    const port = bareePort([art({ w: 2.4 })]);
    const t = artTarget(port, 0)!;

    t.width!.set(6); t.commit(); await Promise.resolve();
    expect(port.list()[0].w, '★ 1차 확정부터 안 실렸다').toBe(6);

    t.width!.set(9); t.commit(); await Promise.resolve();
    expect(port.list()[0].w, '🔴 2차 확정이 조용히 죽었다').toBe(9);

    t.x = -4; t.commit(); await Promise.resolve();
    expect(port.list()[0].x, '🔴 3차도 죽었다').toBe(-4);
  });

  it('🔴 확정 뒤에도 **크기 배수 기준이 안 바뀐다** — ×2 가 확정할 때마다 ×1 로 튀면 안 된다', async () => {
    const port = bareePort([art({ w: 2 })]);
    const t = artTarget(port, 0)!;
    t.s = 2;
    expect(t.s).toBe(2);
    t.commit(); await Promise.resolve();
    expect(t.s, '🔴 확정했더니 배수 기준이 새 값으로 옮겨갔다').toBe(2);
    expect(t.width!.get()).toBe(4);
  });

  it('🔴 확정 뒤 **삭제**가 된다 — 재앵커를 안 하면 「지울 수 없습니다」가 뜬다', async () => {
    const port = bareePort([art({ src: 'a' }), art({ src: 'b' })]);
    const t = artTarget(port, 0)!;
    t.width!.set(5); t.commit(); await Promise.resolve();
    expect(t.remove(), '🔴 확정한 뒤에는 못 지운다').toBe(true);
    await Promise.resolve();
    expect(port.list().map((x) => x.src)).toEqual(['b']);
  });

  it('🔴 확정 뒤에도 `apply` 가 **같은 액자**를 민다 — 두 앵커가 갈리면 안 된다', async () => {
    const seen: number[] = [];
    const port = createArtsPort((x) => x);
    port.attach({ place: async () => {}, retarget: (i) => { seen.push(i); } });
    await port.set([art({ src: 'a' }), art({ src: 'b', w: 2.4 })]);

    const t = artTarget(port, 1)!;
    t.apply();
    t.width!.set(5); t.commit(); await Promise.resolve();
    t.apply();
    // 앞 항목이 사라져 목록 자리가 밀린 뒤에도 둘이 같이 움직여야 한다.
    await port.set(port.list().slice(1));
    t.width!.set(7); t.commit(); await Promise.resolve();
    t.apply();
    expect(seen, '🔴 확정 뒤 `apply` 가 다른 슬롯을 밀었다').toEqual([1, 1, 0]);
    expect(port.list()[0].w).toBe(7);
  });

  it('🔴 사라진 작품을 만지면 **소비자에게 알린다** — 조용한 no-op 을 남기지 않는다', async () => {
    const port = bareePort([art({ src: 'a' }), art({ src: 'b' })]);
    let told = 0;
    const t = artTarget(port, 0, () => { told++; })!;
    await port.set(port.list().slice(1));   // a 가 사라진다

    t.width!.set(9);
    t.commit(); await Promise.resolve();
    expect(told, '🔴 사라졌는데 아무 말도 안 했다').toBe(1);
    // 두 번째부터는 같은 말을 반복하지 않는다.
    t.commit();
    expect(told, '★ 조작할 때마다 같은 말을 한다').toBe(1);
    expect(port.list().map((x) => x.src)).toEqual(['b']);
  });

  it('★ 씬을 안 물린 포트에서도 어댑터가 산다 — 부팅 순서에 걸려 편집이 죽으면 안 된다', () => {
    const port = bareePort([art()]);
    const t = artTarget(port, 0)!;
    expect(() => { t.x = 4; t.apply(); }).not.toThrow();
    t.commit();
    expect(port.list()[0].x).toBe(4);
  });
});

// ── 선택 배타 ───────────────────────────────────────────────────────────────

/** `select()` 가 쓰는 최소한의 host. 마을 문은 닫아 둔다(액자 축과 무관하다) */
function fakeHost(): OverlayHost {
  return {
    cellX: CELL, cellZ: CELL,
    apply() { }, remove() { }, surfaceAt: () => 0,
  } as unknown as OverlayHost;
}

describe('★ 선택은 하나다 — 네 칸이 함께 움직인다', () => {
  const entry = { src: 'assets/models/x.glb', x: 0, y: 0, z: 0, ry: 0, s: 1 } as unknown as OverlayEntry;

  it('★ 작품을 고르면 오버레이·마을 선택이 **풀린다**', () => {
    const st = createEditState();
    const host = fakeHost();
    select(st, host, { entry });
    expect(st.selected).not.toBeNull();

    const port = bareePort([art()]);
    select(st, host, { art: { index: 0, target: artTarget(port, 0) } });
    expect(st.artSel, '★ 작품 선택이 안 들어갔다').toBe(0);
    expect(st.selected, '★ 오버레이 선택이 안 풀렸다').toBeNull();
    expect(st.villageSel).toBeNull();
    expect(st.target!.kind).toBe('art');
  });

  it('★ 오버레이를 고르면 작품 선택이 **풀린다** — 반대 방향도 성립해야 한다', () => {
    const st = createEditState();
    const host = fakeHost();
    const port = bareePort([art()]);
    select(st, host, { art: { index: 0, target: artTarget(port, 0) } });
    expect(st.artSel).toBe(0);

    select(st, host, { entry });
    expect(st.artSel, '★ 작품 선택이 남았다 — 패널과 기즈모가 다른 것을 가리킨다').toBeNull();
    expect(st.selected).not.toBeNull();
  });

  it('★ 어댑터가 `null` 이면 **아무것도 안 고른 것**으로 떨어진다 — 마을과 같은 규약', () => {
    const st = createEditState();
    const port = bareePort([art()]);
    select(st, fakeHost(), { art: { index: 9, target: artTarget(port, 9) } });
    expect(st.artSel, '★ 표시만 남고 조작이 안 되는 상태가 됐다').toBeNull();
    expect(st.target).toBeNull();
  });

  it('★ `null` 로 부르면 네 칸이 다 빈다', () => {
    const st = createEditState();
    const port = bareePort([art()]);
    select(st, fakeHost(), { art: { index: 0, target: artTarget(port, 0) } });
    select(st, fakeHost(), null);
    expect([st.selected, st.villageSel, st.artSel, st.target]).toEqual([null, null, null, null]);
  });
});

// ── 씬 집행 — 판정과 집행의 경계 ────────────────────────────────────────────

interface Rec { x: number; y: number; z: number }

/**
 * 스텁이 기록한 좌표를 읽는다. 계약(`ArtNode`)의 `position`·`scale` 은 **쓰기 문만**
 * 낸다(`set(x,y,z)`) — 제품 코드가 읽을 일이 없어서 그렇게 좁힌 것이고 그것이 옳다.
 * 읽는 것은 이 검사의 사정이므로 **여기서** 캐스트한다(계약을 검사 편의로 넓히지 않는다).
 */
function xyz(v: unknown): Rec {
  return v as Rec;
}

/**
 * **위치를 기록하는** three 스텁. 파일 헤더가 적은 이유로 기존 스텁을 안 쓴다.
 * 재는 것은 세 가지뿐이다 — 위치·회전·스케일. 개수 축은 다른 파일 소관이다.
 */
function makeThree(): { THREE: ArtThreeNS; scene: ArtNode } {
  const node = (): ArtNode => {
    const kids: ArtNode[] = [];
    const pos: Rec = { x: 0, y: 0, z: 0 };
    const sc = { x: 1, y: 1, z: 1, set(x: number, y: number, z: number) { sc.x = x; sc.y = y; sc.z = z; } };
    return {
      position: Object.assign(pos, {
        set(x: number, y: number, z: number) { pos.x = x; pos.y = y; pos.z = z; },
      }),
      rotation: { y: 0 },
      children: kids,
      scale: sc,
      visible: true,
      add(o: ArtNode) { kids.push(o); },
      remove(o: ArtNode) { const i = kids.indexOf(o); if (i >= 0) kids.splice(i, 1); },
    } as unknown as ArtNode;
  };
  const THREE = {
    Group: class { constructor() { return node(); } },
    Object3D: class { constructor() { return node(); } },
    Mesh: class { constructor() { return node(); } },
    BoxGeometry: class { dispose() { } },
    PlaneGeometry: class { dispose() { } },
    MeshStandardMaterial: class { dispose() { } },
    MeshBasicMaterial: class { dispose() { } },
    SpotLight: class {
      intensity = 0; angle = 0; penumbra = 0; distance = 0; castShadow = false;
      target = node();
      visible = true;
      constructor(_c?: number, i?: number) { this.intensity = i ?? 0; Object.assign(this, node()); }
    },
  } as unknown as ArtThreeNS;
  return { THREE, scene: node() };
}

/**
 * 액자 그룹만 골라낸다 — 라이트·타깃이 **같은 루트에** 산다.
 *
 * ⚠ 「스케일과 회전을 가진 자식」으로 거르면 안 된다 — 스포트라이트 스텁도 그 둘을
 * 갖는다(실물 three 도 그렇다). 첫 판본이 그랬고 라이트 위치를 액자로 읽어 FAIL 했다.
 * 라이트 풀은 **부팅에 완성**되고 그 뒤로 개수가 안 변하므로(팀장 조건 1), `place` 전
 * 자식 수를 기준선으로 잡고 **그 뒤에 붙은 것**을 액자로 본다.
 */
function framesAfter(scene: ArtNode, base: number): ArtNode[] {
  const root = scene.children![0];
  return (root.children ?? []).slice(base);
}

/** 액자를 걸기 **전** 루트 자식 수 = 라이트 풀 크기 */
function poolSize(scene: ArtNode): number {
  return scene.children![0].children?.length ?? 0;
}

describe('★ 씬이 자세를 실제로 옮긴다 — 판정/집행 경계', () => {
  it('★ `retarget` 이 위치·회전을 민다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    const base = poolSize(scene);
    await s.place([art({ x: 1, y: 3, z: 2, ry: 0 })]);
    const g = framesAfter(scene, base)[0];

    s.retarget(0, { x: -7, y: 1.25, z: 8, ry: 1.5, w: 2.4 });
    expect([xyz(g.position).x, xyz(g.position).y, xyz(g.position).z]).toEqual([-7, 1.25, 8]);
    expect(g.rotation!.y).toBe(1.5);
  });

  it('🔴 `w` 는 **스케일 배수**로 간다 — 걸 때의 `w` 대비 비율이다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    const base = poolSize(scene);
    await s.place([art({ w: 2 })]);
    // 등장 연출이 끝난 상태로 만든다 — 안 그러면 배수가 성장 중 값과 섞인다.
    s.update(() => true, 10);
    const g = framesAfter(scene, base)[0];
    const k0 = xyz(g.scale).x;

    s.retarget(0, { x: 0, y: 3, z: 0, ry: 0, w: 3 });
    expect(xyz(g.scale).x / k0, '🔴 실치수 3m / 걸 때 2m = ×1.5 가 아니다').toBeCloseTo(1.5, 6);
    // z 는 고정이다 — 균등 배수를 주면 그림/테두리 간격이 줄어 먼 거리에서 명멸한다
    // (근거는 `artwork-scene.ts` 의 `update` 주석 한 곳).
    expect(xyz(g.scale).z).toBe(1);
  });

  it('🔴 등장 배수(W8-10)와 **곱해진다** — 각각 대입하면 나중 것이 앞것을 지운다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    const base = poolSize(scene);
    await s.place([art({ w: 2 })]);
    const g = framesAfter(scene, base)[0];

    // ⚠ **`place()` 직후는 이미 다 자란 상태다** — 엔트리가 `k:1, fresh:true` 로 나고,
    // 그것이 «걸린 것은 애니메이션 없이 목표로 간다» 는 W8-10 의 판정이다. 그래서
    // 성장 중 상태는 **파셀을 걷었다가 다시 넣어** 만든다(그것이 실제 경로이기도 하다).
    // 첫 판본은 place 직후를 「안 자란 상태」로 읽어 FAIL 했다.
    s.update(() => false, 1);   // 건물이 멀어져 사라진다(소멸 0초 — 라이브 실효값)
    s.update(() => true, 0);    // 다시 들어와 **자라기 시작**한다

    // 자라는 중에 크기를 두 배로 민다.
    s.retarget(0, { x: 0, y: 3, z: 0, ry: 0, w: 4 });
    const growing = xyz(g.scale).x;
    expect(growing, '★ 등장 배수가 통째로 사라졌다 — 자라지 않고 즉시 뜬다').toBeLessThan(2);
    expect(growing, '🔴 크기 배수가 무시됐다').toBeGreaterThanOrEqual(START_SCALE * 2);

    // 다 자란 뒤에도 크기 배수가 살아 있어야 한다.
    s.update(() => true, 10);
    expect(xyz(g.scale).x, '🔴 자라고 나니 크기 배수가 지워졌다').toBeCloseTo(2, 6);
  });

  it('★ 범위 밖 인덱스는 아무 일도 안 한다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    const base = poolSize(scene);
    await s.place([art()]);
    const g = framesAfter(scene, base)[0];
    const before = [xyz(g.position).x, xyz(g.position).y, xyz(g.position).z];
    expect(() => { s.retarget(5, { x: 9, y: 9, z: 9, ry: 9, w: 9 }); }).not.toThrow();
    expect(() => { s.retarget(-1, { x: 9, y: 9, z: 9, ry: 9, w: 9 }); }).not.toThrow();
    expect([xyz(g.position).x, xyz(g.position).y, xyz(g.position).z]).toEqual(before);
  });

  it('★ 포트가 씬으로 **위임**한다 — 배선이 끊기면 미리보기가 통째로 죽는다', async () => {
    const { THREE, scene } = makeThree();
    const s = createArtworkScene({ THREE, scene, cellX: CELL, cellZ: CELL });
    const port = createArtsPort((x) => x);
    port.attach(s);
    const base = poolSize(scene);
    await port.set([art({ w: 2 })]);
    s.update(() => true, 10);
    const g = framesAfter(scene, base)[0];

    port.retarget(0, { x: 4, y: 2, z: -1, ry: 0.5, w: 4 });
    expect([xyz(g.position).x, xyz(g.position).y, xyz(g.position).z]).toEqual([4, 2, -1]);
    expect(g.rotation!.y).toBe(0.5);
    expect(xyz(g.scale).x).toBeCloseTo(2, 6);
  });
});
