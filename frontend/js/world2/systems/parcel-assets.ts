// world2/systems/parcel-assets.ts — 파츠 자산을 실제로 만들고, 슬롯 풀 어댑터를 얹는다.
//
// ── 조합을 여기서 다 세어 둔다 ───────────────────────────────────────────────
// 이 파일이 만드는 (지오, 재질) 쌍의 수가 곧 세션 전체의 파이프라인 조합 수다. 부팅 때
// 한 번 만들고 끝이므로, 파츠 목록이 짧으면 실행 중 증식이 구조적으로 불가능하다.
// world1 에서 파셀 1개 승격에 머티리얼 19개·지오 44개가 새로 태어나던 것과 대비되는 지점.
//
// ── 지오메트리는 여기 없다 ───────────────────────────────────────────────────
// 파츠마다 `asset(THREE)` 가 자기 지오·재질을 만든다(`parts/*.ts`). 이 파일은 three 를
// 넘겨주고 결과를 모을 뿐이다. 그래서 파츠를 추가할 때 이 파일을 열 일이 없다 —
// 예전에는 `TONE_PALETTE` 와 `createPartAssets` 두 곳에 같은 종류를 또 적어야 했다.
//
// ── 색을 재질로 가르지 않는다 ────────────────────────────────────────────────
// 색조(tone)마다 재질을 만들면 조합이 종류×색조로 불어난다. 대신 `instanceColor` 를 쓴다 —
// 인스턴스 색은 파이프라인 캐시키를 늘리지 않는다(구조 신호가 아니다).

import * as THREE from 'three/webgpu';
import type { InstancePools, SlotHandle } from './instancing.js';
import type { SlotPool } from './parcel-builder.js';
import { PARTS, tonesFor, type PartKind } from '../parts/index.js';
import type { PartAsset } from '../parts/types.js';

export type { PartAsset };

/**
 * 파츠 자산을 만든다. **피벗은 모두 바닥**이다 — 배치 판정이 y=0 을 "땅에 붙은 상태"로
 * 내보내므로, 지오메트리 쪽에서 반칸 올려두지 않으면 전부 땅에 반쯤 묻힌다.
 */
export function createPartAssets(): Record<PartKind, PartAsset> {
  const out = {} as Record<PartKind, PartAsset>;
  for (const spec of PARTS) out[spec.kind as PartKind] = spec.asset(THREE);
  return out;
}

/**
 * tone 이 확정한 **최종 색을 가로채는 문**. 없으면 지금까지처럼 즉시 칠한다.
 *
 * ── 인터페이스가 왜 여기(소비자 쪽)에 있는가 ────────────────────────────────
 * 이 문을 실제로 쓰는 것은 `createSlotPool` 이고, 구현은 `systems/parcel-fade.ts` 다.
 * 소비자가 인터페이스를 소유하면 구현을 갈아끼워도 여기가 안 바뀌고, 무엇보다 이
 * 파일이 페이드를 **모른다** — 페이드를 걷어내는 날 `parcel-fade.ts` 만 지우면 된다.
 */
export interface ToneSink {
  /**
   * 슬롯이 최종적으로 가져야 할 색(팔레트 hex). 즉시 칠할지 서서히 칠할지는 구현이 정한다.
   *
   * `x`·`z` 는 **그 부품이 실제로 선 월드 좌표**다. 페이드가 *"여기는 안개가 얼마나
   * 감춰주는가"* 를 알아야 하기 때문에 연다 — 파셀 중심이 아니라 **부품 자리**여야 한다
   * (감독 실기기 2026-08-09 *"가까이 가면 뭔가 건물이 번쩍해"*: 부품은 파셀 중심보다
   * 최대 반 셀 가까이서 태어나고, 그 거리에서는 안개가 0% 다. 근거는 `decide/lod-fade.ts`
   * 의 `fogFactorAt` 주석 한 곳).
   *
   * **없을 수도 있다** — `setTransform` 보다 `setTone` 이 먼저 오는 호출자가 생기면
   * 좌표를 모른다. 그때는 구현이 종전 동작으로 떨어져야 한다(`undefined` 를 넘긴다).
   */
  apply(h: SlotHandle, hex: number, x?: number, z?: number): void;
  /** 슬롯이 반납된다. 진행 중인 상태가 있으면 여기서 버린다 */
  release?(h: SlotHandle): void;
}

/**
 * 배치가 확정된 자세를 받는 문. 구현은 `systems/parcel-grow.ts`(스케일 인).
 * `ToneSink` 와 같은 이유로 **소비자 쪽**에 인터페이스를 둔다 — 걷어내는 날
 * `parcel-grow.ts` 만 지우면 된다.
 */
export interface PlaceSink {
  place(h: SlotHandle, t: {
    x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number;
  }): void;
  release?(h: SlotHandle): void;
}

/**
 * `InstancePools` 를 파셀 빌더가 쓰는 좁은 인터페이스로 감싼다.
 * 여기서만 tone 번호 → 팔레트 hex 변환이 일어난다.
 *
 * @param sink 색을 가로챌 문. 생략하면 종전대로 즉시 칠한다(페이드 없음).
 * @param grow 자세를 가로챌 문. 생략하면 종전대로 즉시 완성 크기다(성장 없음).
 */
export function createSlotPool(pools: InstancePools, sink?: ToneSink, grow?: PlaceSink): SlotPool {
  const c = new THREE.Color();
  // 마지막으로 놓인 자리. `setTone` 이 sink 에 넘겨줄 좌표다.
  //
  // **핸들별로 기억한다** — 한 프레임에 부품 수십 개가 놓이므로 단일 변수로는 섞인다.
  // `WeakMap` 인 이유는 핸들이 죽으면 저절로 사라져야 하기 때문이다(정리 코드가 하나
  // 늘면 그것을 안 부르는 경로가 생긴다).
  //
  // ⚠ **순서에 기대고 있다** — 빌더가 `setTransform` 을 `setTone` 보다 먼저 부른다
  // (`parcel-builder.ts:207-208`). 뒤집히면 좌표를 모르고, 그때는 `undefined` 가 넘어가
  // 페이드가 종전 동작(안개색으로 덮기)으로 떨어진다. **조용히 틀리지 않고 조용히
  // 예전으로 돌아간다** — 그 성질을 테스트가 못 박는다.
  const placed = new WeakMap<SlotHandle, { x: number; z: number }>();
  return {
    acquire: (key) => pools.acquire(key),
    setTransform: (h, x, y, z, ry, sx, sy, sz) => {
      placed.set(h, { x, z });
      pools.setTransform(h, x, y, z, ry, sx, sy, sz);
      // 완성 자세를 쓴 **뒤에** 알린다 — grow 가 곧바로 시작 스케일로 줄여 쓴다.
      // 순서를 뒤집으면 grow 가 줄인 것을 위 줄이 도로 완성 크기로 덮는다.
      grow?.place(h, { x, y, z, ry, sx, sy, sz });
    },
    setTone: (h, tone) => {
      const palette = tonesFor(h.key);
      const hex = palette[tone % palette.length] ?? palette[0];
      if (sink) { const p = placed.get(h); sink.apply(h, hex, p?.x, p?.z); return; }
      c.setHex(hex);
      pools.setColor(h, c);
    },
    release: (h) => {
      // 순서가 중요하다: 풀에 반납하면 핸들이 죽은 표식(index=-1)을 달아 sink 가 자기
      // 항목을 못 찾는다. 먼저 sink 에서 걷고 반납한다.
      sink?.release?.(h);
      grow?.release?.(h);
      pools.release(h);
    },
  };
}
