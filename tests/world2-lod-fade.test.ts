// LOD 디졸브 — 새 파셀이 안개에서 배어 나오는가.
//
// ── 이 파일이 두 층을 함께 보는 이유 ────────────────────────────────────────
// 커브(`decide/lod-fade.ts`)만 시험하면 "계산된 값이 실제로 소비되는가" 가 어디에도
// 안 걸린다. 이 저장소가 이미 그 사각으로 대가를 치렀다 — 구름 `alpha` 미소비는 순수
// 함수 테스트를 통과한 채 통합 지점에서 무시되고 있었다. 그래서 아래 §2 는 **실물
// `InstancePools` 를 세워** 색이 정말 GPU 버퍼에 들어가는지까지 본다.
//
// ── §3 은 회귀 테스트다 ─────────────────────────────────────────────────────
// 슬롯 반납 swap 이 `instanceMatrix` 만 옮기고 `instanceColor` 는 두고 가던 결함
// (태스크 #214). 페이드가 붙으면 "등장 중이라 안개색인 슬롯" 의 색이 살아 있는 건물에
// 얹혀 증폭되므로, 페이드와 같은 diff 에서 고치고 여기서 못 박는다.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three/webgpu';
import {
  EASINGS, FADE_EASES, fadeMix, residualAtSpawn,
  crossingCells, crossingSeconds, FADE_SECONDS, fogFactorAt,
  scaleStep, scaleAdvance, START_SCALE,
} from '../frontend/js/world2/decide/lod-fade.js';
import { DEFAULT_BANDS } from '../frontend/js/world2/decide/lod.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { WALK_SPEED, RUN_MULT } from '../frontend/js/world2/systems/player.js';
import { FOG_FAR_CELLS, fogBand } from '../frontend/js/world2/decide/fog.js';
import { InstancePools } from '../frontend/js/world2/systems/instancing.js';
import { createSlotPool } from '../frontend/js/world2/systems/parcel-assets.js';
import { ParcelFadeSystem } from '../frontend/js/world2/systems/parcel-fade.js';
import { tonesFor } from '../frontend/js/world2/parts/index.js';
import type { FrameCtx } from '../frontend/js/world2/kernel.js';

const frame = (dt: number): FrameCtx =>
  ({ dt, ageMs: 0, frame: 0, hidden: false, resumed: false }) as FrameCtx;

describe('§1 커브 — 나타나다 되돌아가지 않는다', () => {
  for (const name of FADE_EASES) {
    it(`${name}: f(0)=0 · f(1)=1 · 단조증가`, () => {
      const f = EASINGS[name];
      expect(f(0)).toBeCloseTo(0, 6);
      expect(f(1)).toBeCloseTo(1, 6);
      let prev = -1;
      for (let i = 0; i <= 20; i++) {
        const v = f(i / 20);
        expect(v).toBeGreaterThanOrEqual(prev);
        prev = v;
      }
    });
  }

  it('duration 0 은 "끔" 이다 — 기본값으로 되돌리지 않는다', () => {
    // `?nfog=0` 이 하한 0.05 로 조용히 잘려 감독 판정을 한 번 훔친 적이 있다.
    // 0 을 명시하면 페이드가 아예 없어야 한다.
    expect(fadeMix(0, 0)).toBe(1);
    expect(fadeMix(0, -1)).toBe(1);
  });

  it('경과가 시간을 넘겨도 1 을 넘지 않는다', () => {
    expect(fadeMix(10, 0.5, 'lin')).toBe(1);
    expect(fadeMix(-1, 0.5, 'lin')).toBe(0);
  });
});

describe('§1-3 페이드 시간과 통과 시간의 관계 — 근거를 게이트로', () => {
  // ── 왜 이 절이 있는가 (검수관 지적 2026-08-07) ─────────────────────────
  // `FADE_SECONDS` 의 유도가 처음에는 **주석의 숫자**였고 그 숫자가 이미 폐기된
  // `speed 9` 였다. 결론(0.45 가 안전)은 오히려 여유가 커지는 방향이라 안 흔들렸고,
  // 그래서 아무도 근거를 검산하지 않았다. **결론이 맞으면 근거는 검증되지 않는다.**
  // 여기서 실제 상수를 넣어 관계를 못 박는다 — 속도가 바뀌어 여유가 사라지면 깨진다.

  it('기본 페이드가 통과 시간 안에 넉넉히 끝난다', () => {
    const t = crossingSeconds(DEFAULT_LAYOUT.cellX, WALK_SPEED, RUN_MULT);
    expect(t).toBeGreaterThan(FADE_SECONDS * 2);
  });

  it('빨라질수록 통과 시간이 줄어든다(단조) — 여유가 잠식되는 방향을 안다', () => {
    const slow = crossingSeconds(DEFAULT_LAYOUT.cellX, WALK_SPEED, RUN_MULT);
    const fast = crossingSeconds(DEFAULT_LAYOUT.cellX, WALK_SPEED * 2, RUN_MULT);
    expect(fast).toBeLessThan(slow);
  });

  it('등장을 안개 밖으로 밀면 통과 구간이 0 이 아니라 늘어난다', () => {
    const pushed = { ...DEFAULT_BANDS, farEnter: 3.0, farExit: 3.3 };
    expect(crossingCells(pushed)).toBeGreaterThan(crossingCells());
  });

  it('나아가지 않는 입력은 Infinity 다 — NaN·음수를 흘리지 않는다', () => {
    // ── 첫 판본은 `speed=0` 하나만 봤고, 검출력이 0 이었다 (검수관 실측 2026-08-07)
    // JS 는 `양수/0` 을 가드 없이도 `Infinity` 로 낸다. 그래서 `crossingSeconds` 의
    // `if (!(v > 0)) return Infinity;` 를 **통째로 지워도 19건이 전부 통과했다.**
    // 단언 문장 자체는 참이었다(속도 0 이면 실제로 Infinity 다) — 참인데 아무것도
    // 검사하지 않는 것, 그게 이 저장소가 "장식" 이라 부르는 상태다.
    //
    // 가드가 실제로 갈리는 자리는 셋이다. 전부 넣는다.
    const cell = DEFAULT_LAYOUT.cellX;
    expect(crossingSeconds(cell, 0, RUN_MULT)).toBe(Infinity);        // 0 — 가드 없이도 같다
    expect(crossingSeconds(cell, -5, RUN_MULT)).toBe(Infinity);       // 음수 — 없으면 음의 시간
    expect(crossingSeconds(cell, Number.NaN, RUN_MULT)).toBe(Infinity); // NaN — 없으면 NaN 전파
  });
});

describe('§1-2 등장 지점의 잔여 대비 — "팍" 의 크기', () => {
  it('기본 밴드에서 37.5% 가 드러난 채 태어난다', () => {
    // 이 수가 감독이 "팍" 이라고 부른 것이다. 리터럴을 박는 이유는 밴드나 안개 배수를
    // 만졌을 때 **이 테스트가 깨져서 알려주기** 위해서다 — 값을 따라 계산하면 아무것도
    // 검사하지 않는 테스트가 된다.
    expect(residualAtSpawn()).toBeCloseTo(0.375, 6);
  });

  it('등장을 안개 밖으로 밀면 0 이 된다 — 페이드 대신 밴드를 미는 선택지의 근거', () => {
    const pushed = { ...DEFAULT_BANDS, farEnter: FOG_FAR_CELLS, farExit: FOG_FAR_CELLS + 0.3 };
    expect(residualAtSpawn(pushed)).toBe(0);
  });

  it('안개가 더 일찍 닫힐수록 잔여가 줄어든다(단조)', () => {
    const near = { ...DEFAULT_BANDS, farEnter: 1.8 };
    const far = { ...DEFAULT_BANDS, farEnter: 2.3 };
    expect(residualAtSpawn(near)).toBeGreaterThan(residualAtSpawn(far));
  });
});

/** 실물 풀 하나를 세운다. 렌더러 없이 CPU 버퍼만 쓴다 */
function scaffold(opts: { duration: number; gate: boolean; fogAt?: (x: number, z: number) => number }) {
  const parent = new THREE.Object3D();
  const pools = new InstancePools(parent);
  pools.create({
    key: 'building',
    geometry: new THREE.BoxGeometry(1, 1, 1),
    material: new THREE.MeshBasicMaterial(),
    max: 8,
  });
  pools.warmColors('building');
  pools.seal();

  const fadeFrom = new THREE.Color(0x000000);
  const fade = new ParcelFadeSystem({
    pools,
    duration: opts.duration,
    ease: 'lin',
    fadeColor: () => fadeFrom,
    gate: () => opts.gate,
    fogAt: opts.fogAt,
  });
  const slot = createSlotPool(pools, fade.sink());
  const target = new THREE.Color(tonesFor('building')[0]);
  return { pools, fade, slot, target, parent };
}

/** 풀 메시에서 인스턴스 색을 직접 읽는다 — 버퍼까지 들어갔는지 보려는 것이다 */
function colorAt(parent: THREE.Object3D, index: number): THREE.Color {
  const group = parent.children[0];
  const mesh = group.children
    .find((o: THREE.Object3D) => o.name === 'pool:building') as THREE.InstancedMesh;
  const c = new THREE.Color();
  mesh.getColorAt(index, c);
  return c;
}

describe('§2 집행 — 계산된 값이 실제로 인스턴스 색이 되는가', () => {
  it('태어난 순간은 안개색이고, 시간이 지나면 자기 색이 된다', () => {
    const { fade, slot, target, parent } = scaffold({ duration: 1, gate: true });
    const h = slot.acquire('building')!;
    slot.setTone(h, 0);

    // ① 첫 프레임을 기다리지 않고 지금 덮는다 — 안 그러면 그 한 프레임에 팝인이 보인다.
    const born = colorAt(parent, h.index);
    expect(born.r).toBeCloseTo(0, 5);
    expect(born.g).toBeCloseTo(0, 5);
    expect(born.b).toBeCloseTo(0, 5);
    expect(fade.pending).toBe(1);

    // ② 절반 — lin 커브이므로 정확히 절반이다(검정에서 출발했으므로 target × 0.5).
    fade.update(frame(0.5));
    const mid = colorAt(parent, h.index);
    expect(mid.r).toBeCloseTo(target.r * 0.5, 4);
    expect(mid.g).toBeCloseTo(target.g * 0.5, 4);
    expect(mid.b).toBeCloseTo(target.b * 0.5, 4);

    // ③ 끝 — 보간 오차가 남지 않게 끝값을 정확히 박는다.
    fade.update(frame(0.5));
    const done = colorAt(parent, h.index);
    expect(done.r).toBeCloseTo(target.r, 6);
    expect(done.g).toBeCloseTo(target.g, 6);
    expect(done.b).toBeCloseTo(target.b, 6);
    expect(fade.pending).toBe(0);
  });

  it('초기 충전 중(gate 닫힘)에는 페이드하지 않는다', () => {
    // 로딩이 끝나는 순간 파셀 수백 개가 한꺼번에 태어난다. 그때 페이드를 걸면 세계
    // **전체**가 서서히 뜨는 다른 연출이 된다 — 감독 지시는 "건물들이 나타날때" 다.
    const { fade, slot, target, parent } = scaffold({ duration: 1, gate: false });
    const h = slot.acquire('building')!;
    slot.setTone(h, 0);
    expect(colorAt(parent, h.index).r).toBeCloseTo(target.r, 6);
    expect(fade.pending).toBe(0);
  });

  it('?lodfade=0 이면 종전 동작 그대로다', () => {
    const { fade, slot, target, parent } = scaffold({ duration: 0, gate: true });
    const h = slot.acquire('building')!;
    slot.setTone(h, 0);
    expect(colorAt(parent, h.index).g).toBeCloseTo(target.g, 6);
    expect(fade.pending).toBe(0);
  });

  it('페이드 도중 반납되면 목록에서 빠진다 — 죽은 핸들을 계속 칠하지 않는다', () => {
    const { fade, slot } = scaffold({ duration: 1, gate: true });
    const h = slot.acquire('building')!;
    slot.setTone(h, 0);
    expect(fade.pending).toBe(1);
    slot.release(h);
    expect(fade.pending).toBe(0);
    fade.update(frame(0.5)); // 죽은 핸들을 만지지 않고 조용히 지나야 한다
    expect(fade.pending).toBe(0);
  });
});

describe('§3 슬롯 반납 swap 이 색을 함께 옮긴다 (#214 회귀)', () => {
  it('이사 온 인스턴스가 빈자리의 옛 색을 물려받지 않는다', () => {
    // 뮤테이션: `instancing.ts` 의 release 에서 getColorAt/setColorAt 두 줄을 지우면
    // 이 단언이 깨진다(이사 온 슬롯이 A 색을 그대로 쓴다).
    const parent = new THREE.Object3D();
    const pools = new InstancePools(parent);
    pools.create({
      key: 'building',
      geometry: new THREE.BoxGeometry(1, 1, 1),
      material: new THREE.MeshBasicMaterial(),
      max: 4,
    });
    pools.warmColors('building');
    pools.seal();

    const A = new THREE.Color(0xff0000);
    const B = new THREE.Color(0x00ff00);
    const h0 = pools.acquire('building')!;
    const h1 = pools.acquire('building')!;
    pools.setColor(h0, A);
    pools.setColor(h1, B);
    expect(h1.index).toBe(1);

    pools.release(h0); // h1 이 index 0 으로 이사한다

    expect(h1.index).toBe(0);
    const moved = colorAt(parent, 0);
    expect(moved.r).toBeCloseTo(B.r, 5);
    expect(moved.g).toBeCloseTo(B.g, 5);
  });

  it('죽은 핸들로는 남의 슬롯을 칠할 수 없다', () => {
    const parent = new THREE.Object3D();
    const pools = new InstancePools(parent);
    pools.create({
      key: 'building',
      geometry: new THREE.BoxGeometry(1, 1, 1),
      material: new THREE.MeshBasicMaterial(),
      max: 4,
    });
    pools.warmColors('building');
    pools.seal();

    const h0 = pools.acquire('building')!;
    const h1 = pools.acquire('building')!;
    pools.setColor(h1, new THREE.Color(0x00ff00));
    pools.release(h0); // h0.index = -1
    pools.setColor(h0, new THREE.Color(0xff0000));

    const survivor = colorAt(parent, 0);
    expect(survivor.r).toBeCloseTo(0, 5); // 빨강이 얹히지 않았다
    expect(survivor.g).toBeCloseTo(1, 5);
    expect(h1.index).toBe(0);
  });
});

// ── §4 안개가 0% 인 거리에서는 덮지 않는다 (감독 실기기 2026-08-09) ─────────────
//
// *"가까이 가면 뭔가 건물이 번쩍해"* — 페이드가 **거리와 무관하게** 안개색(거의 검정)으로
// 덮고 있었다. 안개는 51.2m 부터인데 부품은 50.07m·20.22m 에서도 태어난다. 근거와 실측
// 표는 `decide/lod-fade.ts` 의 `fogFactorAt` 주석 한 곳이다 — 여기에 다시 적지 않는다.
describe('§4 fogFactorAt — 그 거리에서 안개가 얼마나 감춰주는가', () => {
  const band = fogBand(DEFAULT_LAYOUT.cellX);

  it('안개 시작 전은 0 — 하나도 안 감춰준다', () => {
    expect(fogFactorAt(0, band)).toBe(0);
    expect(fogFactorAt(band.near - 0.001, band)).toBe(0);
    expect(fogFactorAt(band.near, band)).toBe(0);
  });

  it('안개가 닫힌 뒤는 1', () => {
    expect(fogFactorAt(band.far, band)).toBe(1);
    expect(fogFactorAt(band.far * 10, band)).toBe(1);
  });

  it('사이는 선형이다 — 중간이 0.5', () => {
    expect(fogFactorAt((band.near + band.far) / 2, band)).toBeCloseTo(0.5, 9);
  });

  it('밴드가 뒤집혔거나 폭이 0 이어도 NaN 을 내지 않는다', () => {
    const flat = { near: 50, far: 50 };
    expect(fogFactorAt(10, flat)).toBe(0);
    expect(fogFactorAt(50, flat)).toBe(1);
  });
});

describe('§4-2 집행 — 안개 0% 자리는 페이드가 아무 일도 안 한다', () => {
  it('fogAt 이 0 이면 첫 프레임부터 목표색이다 — 검정에서 출발하지 않는다', () => {
    const { slot, target, parent } = scaffold({ duration: 1, gate: true, fogAt: () => 0 });
    const h = slot.acquire('building')!;
    slot.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    slot.setTone(h, 0);
    // `begin` 이 즉시 덮는 그 순간을 본다(update 전).
    const c = colorAt(parent, h.index);
    expect(c.r).toBeCloseTo(target.r, 5);
    expect(c.g).toBeCloseTo(target.g, 5);
    expect(c.b).toBeCloseTo(target.b, 5);
  });

  it('fogAt 이 1 이면 종전대로 안개색에서 출발한다', () => {
    const { slot, parent } = scaffold({ duration: 1, gate: true, fogAt: () => 1 });
    const h = slot.acquire('building')!;
    slot.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    slot.setTone(h, 0);
    const c = colorAt(parent, h.index);
    expect(c.r).toBeCloseTo(0, 5); // fadeColor 는 scaffold 에서 검정
    expect(c.g).toBeCloseTo(0, 5);
    expect(c.b).toBeCloseTo(0, 5);
  });

  it('fogAt 을 안 주면 항상 1 — **종전 동작이 기본값이다**', () => {
    const { slot, parent } = scaffold({ duration: 1, gate: true });
    const h = slot.acquire('building')!;
    slot.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    slot.setTone(h, 0);
    expect(colorAt(parent, h.index).r).toBeCloseTo(0, 5);
  });

  it('중간값이면 그만큼만 섞는다 — 출발색이 목표색과 안개색 사이다', () => {
    const { slot, target, parent } = scaffold({ duration: 1, gate: true, fogAt: () => 0.5 });
    const h = slot.acquire('building')!;
    slot.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    slot.setTone(h, 0);
    const c = colorAt(parent, h.index);
    expect(c.r).toBeCloseTo(target.r * 0.5, 5);
  });

  it('좌표를 모르면 종전으로 떨어진다 — 조용히 틀리지 않고 조용히 예전이 된다', () => {
    // `setTransform` 없이 `setTone` 만 부른다(호출 순서가 뒤집힌 미래의 호출자).
    const { slot, parent } = scaffold({ duration: 1, gate: true, fogAt: () => 0 });
    const h = slot.acquire('building')!;
    slot.setTone(h, 0);
    expect(colorAt(parent, h.index).r).toBeCloseTo(0, 5);
  });

  it('슬롯마다 자기 출발색을 지킨다 — 한 색을 모두에게 쓰지 않는다', () => {
    // 가까운 것(안개 0)과 먼 것(안개 1)을 함께 띄우고 update 를 한 번 돌린다.
    const near = 0, far = 999;
    const { slot, fade, target, parent } = scaffold({
      duration: 1, gate: true, fogAt: (x) => (x === far ? 1 : 0),
    });
    const a = slot.acquire('building')!;
    slot.setTransform(a, near, 0, 0, 0, 1, 1, 1);
    slot.setTone(a, 0);
    const b = slot.acquire('building')!;
    slot.setTransform(b, far, 0, 0, 0, 1, 1, 1);
    slot.setTone(b, 0);
    fade.update(frame(0.1));
    const ca = colorAt(parent, a.index);
    const cb = colorAt(parent, b.index);
    expect(ca.r).toBeCloseTo(target.r, 5);                 // 안개 0 — 이미 제 색
    expect(cb.r).toBeCloseTo(target.r * 0.1, 5);           // 안개 1 — 10% 만 왔다
    expect(cb.r).toBeLessThan(ca.r);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// W8-10 — 등장·소멸 배수. **건물과 액자가 같은 식을 쓴다**
// ═══════════════════════════════════════════════════════════════════════════

describe('W8-10 — scaleStep / scaleAdvance', () => {
  const anim = { grow: 0.4, shrink: 0.25, ease: 'lin' as const, shrinkEase: 'lin' as const };
  const fresh = (up: boolean) => ({ k: up ? 1 : 0, up, elapsed: 0, from: up ? 1 : 0, fresh: true });

  it('★ 성장은 from 에서 1 로, 끝값이 **정확히** 1 이다', () => {
    expect(scaleStep(true, START_SCALE, 0, anim).k).toBeCloseTo(START_SCALE, 6);
    expect(scaleStep(true, 0, 0.2, anim).k).toBeCloseTo(0.5, 6);
    const end = scaleStep(true, 0, 0.4, anim);
    expect(end, '★ 끝값이 정확히 1 이 아니다 — Math.max 가 있는 한 이 줄만이 보증이다')
      .toEqual({ k: 1, done: true });
  });

  it('★ 수축은 from 에서 0 으로, 끝값이 **정확히** 0 이다', () => {
    expect(scaleStep(false, 1, 0.125, anim).k).toBeCloseTo(0.5, 6);
    expect(scaleStep(false, 1, 0.25, anim)).toEqual({ k: 0, done: true });
  });

  it('★ 배수는 START_SCALE 아래로 안 내려간다 — 노멀 행렬 특이행렬 회피', () => {
    expect(scaleStep(true, 0, 0.0001, anim).k).toBe(START_SCALE);
  });

  it('★ 시간이 0 이면 즉시 완료 — `?grow=0` 이 종전 동작(팝)이다', () => {
    const off = { ...anim, grow: 0, shrink: 0 };
    expect(scaleStep(true, 0, 0, off)).toEqual({ k: 1, done: true });
    expect(scaleStep(false, 1, 0, off)).toEqual({ k: 0, done: true });
  });

  it('🔴 첫 걸음은 **목표로 순간 이동**한다 — place 가 애니메이션을 시작하지 않는 자리', () => {
    expect(scaleAdvance(fresh(true), true, 0.016, anim))
      .toEqual({ k: 1, up: true, elapsed: 0, from: 1, fresh: false });
    // 멀리 있는 채로 걸렸으면 0 으로 스냅 — 「떠올랐다 쪼그라드는」 연출이 안 생긴다
    expect(scaleAdvance(fresh(true), false, 0.016, anim))
      .toEqual({ k: 0, up: false, elapsed: 0, from: 0, fresh: false });
  });

  it('★ 목표에 닿았으면 `null` — 「변할 때만 대입」을 산술이 보증한다', () => {
    expect(scaleAdvance({ k: 1, up: true, elapsed: 9, from: 0, fresh: false }, true, 0.016, anim))
      .toBeNull();
    expect(scaleAdvance({ k: 0, up: false, elapsed: 9, from: 1, fresh: false }, false, 0.016, anim))
      .toBeNull();
  });

  it('🔴 방향이 뒤집히면 **지금 배수에서** 다시 시작한다 — 되감지 않는다', () => {
    // 성장 중간(0.5)에 멀어졌다
    const mid = { k: 0.5, up: true, elapsed: 0.2, from: 0, fresh: false };
    const back = scaleAdvance(mid, false, 0.125, anim)!;
    expect(back.from, '★ from 이 1 로 튀었다 — 액자가 커졌다가 줄어든다').toBe(0.5);
    expect(back.elapsed).toBeCloseTo(0.125, 6);
    expect(back.k, '★ 0.5 에서 절반이면 0.25').toBeCloseTo(0.25, 6);
  });

  it('★ 다시 뒤집혀도 같은 규약 — 왕복이 튀지 않는다', () => {
    let st = { k: 0.25, up: false, elapsed: 0.125, from: 0.5, fresh: false };
    st = scaleAdvance(st, true, 0.1, anim)!;
    expect(st.from).toBe(0.25);
    expect(st.k, '★ 0.25 + (1−0.25)×0.25').toBeCloseTo(0.4375, 6);
  });

  it('★ 이어서 진행하면 elapsed 가 누적된다', () => {
    let st = { k: 0, up: true, elapsed: 0, from: 0, fresh: false };
    st = scaleAdvance(st, true, 0.1, anim)!;
    st = scaleAdvance(st, true, 0.1, anim)!;
    expect(st.elapsed).toBeCloseTo(0.2, 6);
    expect(st.k).toBeCloseTo(0.5, 6);
  });
});
