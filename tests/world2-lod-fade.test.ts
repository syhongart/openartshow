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
  crossingCells, crossingSeconds, FADE_SECONDS,
} from '../frontend/js/world2/decide/lod-fade.js';
import { DEFAULT_BANDS } from '../frontend/js/world2/decide/lod.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { WALK_SPEED, RUN_MULT } from '../frontend/js/world2/systems/player.js';
import { FOG_FAR_CELLS } from '../frontend/js/world2/decide/fog.js';
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

  it('속도가 0 이면 영원히 안 닿는다 — 0 나눗셈을 NaN 으로 흘리지 않는다', () => {
    expect(crossingSeconds(DEFAULT_LAYOUT.cellX, 0, RUN_MULT)).toBe(Infinity);
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
function scaffold(opts: { duration: number; gate: boolean }) {
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
