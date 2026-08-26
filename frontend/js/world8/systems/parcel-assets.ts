// world8/systems/parcel-assets.ts — 파츠 자산을 실제로 만들고, 슬롯 풀 어댑터를 얹는다.
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
  /**
   * **살아 있는 슬롯의 목표 자세만 바뀌었다.** 구현은 성장을 되감지 않아야 한다.
   * 근거는 `parcel-grow.ts` 의 `retarget` 주석 한 곳(검수관 반려 2026-08-11).
   */
  retarget?(h: SlotHandle, t: {
    x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number;
  }): void;
  release?(h: SlotHandle): void;
  /**
   * 반납을 **가로챈다** — `done` 이 실제 반납이고, 구현이 줄어드는 애니메이션을 끝낸 뒤
   * 부른다. 없으면 즉시 반납(종전 동작). 왜 미루는지는 `parcel-grow.ts` 의 `retire`
   * 주석 한 곳이다.
   */
  retire?(h: SlotHandle, done: () => void): void;
}

/** 자세 하나 */
export interface SlotTransform {
  x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number;
}

/**
 * 배치가 정한 자세를 **다른 자세로 바꾸는 문**. 구현은 `systems/shadow-decal.ts`.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * 접촉그림자 데칼은 캐스터 자세를 복사해 태어나고(`parts/shadow.ts` 의 `place`), 실제
 * 크기는 **캐스터 지오의 bounding box** 에서 나온다. 그런데 배치는 순수 함수라 지오를
 * 볼 수 없다(볼 수 있게 하면 배치 골든이 자산 변경마다 흔들린다). 그래서 변환을 배치가
 * 아니라 **놓는 길목**에서 한다.
 *
 * ⚠ 2026-08-11 2회차에 그림자가 방향성 penumbra 에서 원형 AO 블롭으로 바뀌었지만 이 문은
 * 남는다 — 변환의 **내용**(태양 방위·길이 → 밑동 반경)만 바뀌었고, "배치가 모르는 것으로
 * 자세를 다시 정해야 한다" 는 필요는 그대로다. 이 문을 없애면 그림자 평면이 캐스터 스케일
 * (건물이면 sy 12)을 그대로 뒤집어써 화면이 무너진다.
 *
 * ── 관심 없는 키는 그대로 돌려준다 ──────────────────────────────────────────
 * 이 문은 **모든** 슬롯의 자세를 지나간다. 구현이 키를 안 보고 전부 손대면 건물이 눕는다 —
 * 그것을 `world2-shadow-decal-wiring.test.ts` 가 "캐스터 행렬은 바이트 동일" 로 단언한다.
 */
export interface PoseWarp {
  map(h: SlotHandle, t: SlotTransform): SlotTransform;
  /** 슬롯이 반납된다. 살아있는 핸들 등록부에서 걷을 기회 */
  release?(h: SlotHandle): void;
}

/**
 * `InstancePools` 를 파셀 빌더가 쓰는 좁은 인터페이스로 감싼다.
 * 여기서만 tone 번호 → 팔레트 hex 변환이 일어난다.
 *
 * @param sink 색을 가로챌 문. 생략하면 종전대로 즉시 칠한다(페이드 없음).
 * @param grow 자세를 가로챌 문. 생략하면 종전대로 즉시 완성 크기다(성장 없음).
 * @param warp 자세를 **바꿀** 문. 생략하면 배치가 정한 자세 그대로다(그림자 없음).
 */
export function createSlotPool(
  pools: InstancePools, sink?: ToneSink, grow?: PlaceSink, warp?: PoseWarp,
): SlotPool {
  const c = new THREE.Color();
  /** 지금 「연출 없이」 구간인가. 켜고 끄는 것은 빌더다 — 근거는 `setInstant` 주석. */
  let instant = false;
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
      // 워프가 **가장 먼저**다. 뒤에 오는 것들(풀 행렬·페이드 좌표·성장 시작 자세)이 전부
      // 같은 자세를 봐야 한다 — 풀에만 워프를 적용하고 grow 에 원본을 넘기면, grow 가
      // 원본을 "완성 자세" 로 기억해 수축할 때 그리로 튄다.
      const t = warp ? warp.map(h, { x, y, z, ry, sx, sy, sz }) : { x, y, z, ry, sx, sy, sz };
      placed.set(h, { x: t.x, z: t.z });
      pools.setTransform(h, t.x, t.y, t.z, t.ry, t.sx, t.sy, t.sz);
      // 완성 자세를 쓴 **뒤에** 알린다 — grow 가 곧바로 시작 스케일로 줄여 쓴다.
      // 순서를 뒤집으면 grow 가 줄인 것을 위 줄이 도로 완성 크기로 덮는다.
      // ⚠ **즉시 모드면 아예 안 알린다** — 그러면 위 줄이 쓴 완성 자세가 그대로 남는다.
      // 근거는 `setInstant` 주석 한 곳이다.
      if (!instant) grow?.place(h, t);
    },
    retarget: (h, x, y, z, ry, sx, sy, sz) => {
      // `setTransform` 과 **같은 워프**를 탄다 — 태양이 바뀐 만큼 자세가 다시 유도돼야 한다.
      const t = warp ? warp.map(h, { x, y, z, ry, sx, sy, sz }) : { x, y, z, ry, sx, sy, sz };
      placed.set(h, { x: t.x, z: t.z });
      pools.setTransform(h, t.x, t.y, t.z, t.ry, t.sx, t.sy, t.sz);
      // **`place` 가 아니라 `retarget`** 이다. 이 한 줄이 이 경로의 존재 이유다 —
      // `place` 는 "새 배치" 를 뜻해 성장을 START_SCALE 로 되감는다(검수관 반려 2026-08-11).
      grow?.retarget?.(h, t);
    },
    /**
     * **다음 `setTransform`·`release` 를 연출 없이 처리한다** (팀장 판정 (가), 2026-08-20).
     *
     * ── 무엇을 고치나 ──────────────────────────────────────────────────────
     * 편집에서 마을 파츠를 확정하면 `village.freeze` → `streaming.invalidate` 로 그
     * 파셀이 **통째로 버려졌다가 다시 만들어진다.** 그 반납·재생성이 등장/퇴장 연출을
     * 그대로 타서 **0.25s 수축 → 사라짐 → 0.4s 재성장** 이 됐다. 감독 판정
     * 2026-08-20: *"튄다 — 거슬린다."*
     *
     * ── 왜 연출을 끄는 것이 지시 위반이 아닌가 ──────────────────────────────
     * 그 0.25s 는 감독 지시(*"퇴장할때 수축켜줘"*)로 켠 것이다. 그러나 그 지시가 가리킨
     * 것은 **파셀이 멀어져 사라질 때**이고, 편집 확정은 **같은 것을 다시 세우는 갱신**이다.
     * 두 사건에 같은 연출이 걸려 있던 것이고, 가르는 것이 지시를 정확히 집행하는 것이다.
     * 같은 형태의 선례가 이 파일에 이미 있다 — `retarget` 을 `place` 에서 뗀 것
     * (*"`place` 는 «새 배치» 를 뜻해 성장을 되감는다"*, 검수관 반려 2026-08-11).
     *
     * ── 왜 파셀 단위인가 — 전역 「즉시 창」을 기각한 이유 ─────────────────────
     * 팀장이 (나) *"확정 직후 N 프레임 동안 성장·수축을 전부 끔"* 을 기각했다: **새 튜닝
     * 상수**(창 길이)가 생기고 그 값은 화면으로만 판정돼 감독 왕복이 한 번 더 붙는데,
     * 결함 없는 파셀의 정상 등장까지 즉시화한다. 이 스위치는 **빌더가 파셀 하나를
     * 만들거나 반납하는 구간에서만** 켜지므로 그 비용이 없다.
     *
     * ── 경계 (이 결정이 안 고치는 것) ───────────────────────────────────────
     * **재빌드 자체의 비용(ms)은 범위 밖이고 관측이 미해결로 남는다**(게시판 P5).
     * 여기서 없애는 것은 **연출 0.65초**이지 재빌드가 아니다. 그리고 수치칸이 타이핑
     * 한 글자마다 확정하는 축(`edit/panel/inspector.ts:160`)도 그대로다 — 팀장이 (다)로
     * 보류했고, 발화 조건은 **감독이 「즉시 재빌드 반복이 거슬린다」고 말하는 것**이다.
     */
    setInstant: (on: boolean) => { instant = on; },
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
      // 워프도 같은 이유로 먼저 걷는다. 안 걷으면 등록부가 죽은 핸들을 들고 있다가
      // 재베이킹 때 **재사용된 남의 슬롯**을 태양 자세로 덮어쓴다.
      warp?.release?.(h);
      // 수축 훅이 있으면 반납을 **그쪽에 맡긴다** — 줄어드는 애니메이션이 끝난 프레임에
      // `pools.release` 가 불린다. 없으면 종전대로 즉시.
      // ⚠ **즉시 모드면 수축을 건너뛴다.** 그때 `grow.release` 를 부르는 것이 중요하다 —
      // 진행 중인 애니메이션이 남아 있으면 이미 반납한 슬롯(= 재사용된 남의 자리)을
      // 계속 줄인다. `retire` 는 그 정리를 자기가 하지만 이 갈래는 안 탄다.
      if (!instant && grow?.retire) grow.retire(h, () => pools.release(h));
      else { grow?.release?.(h); pools.release(h); }
    },
  };
}
