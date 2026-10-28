// world2 GLB 내보내기 — 수집기가 화면과 같은 세계를 내는가.
//
// ── 이 파일이 지키는 것 ──────────────────────────────────────────────────────
// `export/collect.ts` 는 런타임 씬을 굽지 않고 **세계를 다시 계산한다**(왜인지는 그
// 파일 헤더에). 다시 계산하는 이상 "화면과 같은가" 는 저절로 성립하지 않는다 —
// 좌표 환산 한 줄이 어긋나면 내보낸 파일이 통째로 밀리고, 그 어긋남은 두 결과를
// 나란히 놓기 전에는 아무 데서도 안 드러난다.
//
// 그래서 **실제 집행 계층을 돌려서 대조한다.** `PooledParcelBuilder` 는 `SlotPool`
// 인터페이스만 요구하므로(three 의존 0) 가짜 풀로 진짜 코드를 돌릴 수 있다. 수집기가
// 낸 좌표와 빌더가 슬롯에 쓴 좌표가 같은지를 본다 — 두 코드가 같은 식을 적었는지가
// 아니라 **같은 값을 내는지**를 본다.
//
// ── 뮤테이션으로 확인한 검출력 ───────────────────────────────────────────────
// `collect.ts` 의 `ox + p.x` 를 `p.x` 로 바꾸면(파셀 원점 가산 누락 — 정확히 실제로
// 나기 쉬운 결함이다) "빌더와 같은 변환" 이 깨진다. 물 파셀 건너뛰기를 지우면 파셀
// 수 단언이 깨지고, `tone` 정규화를 지우면 팔레트 범위 단언이 깨진다.

import { describe, it, expect } from 'vitest';
import { collectWorld, collectWater, comboKey } from '../frontend/js/world2/export/collect.js';
import { PooledParcelBuilder, type SlotPool } from '../frontend/js/world2/systems/parcel-builder.js';
import type { SlotHandle } from '../frontend/js/world2/systems/instancing.js';
import { DEFAULT_LAYOUT, parcelLayout } from '../frontend/js/world2/decide/parcel-layout.js';
import { tonesFor, ALL_KINDS } from '../frontend/js/world2/parts/index.js';
import { GRID_W, GRID_H } from '../frontend/js/world2/decide/grid.js';
import { parcelWater, SEA_Y, waterPlaneSpan } from '../frontend/js/world2/decide/water.js';

const { cellX, cellZ } = DEFAULT_LAYOUT;

/** 빌더가 슬롯에 쓴 변환을 그대로 받아 적는 가짜 풀. 판정하지 않고 기록만 한다 */
function recordingPool() {
  const written: { kind: string; x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number; tone: number }[] = [];
  const byHandle = new Map<SlotHandle, number>();
  let seq = 0;
  const pool: SlotPool = {
    acquire(key) {
      const h: SlotHandle = { key, index: seq++ };
      byHandle.set(h, written.length);
      written.push({ kind: key, x: 0, y: 0, z: 0, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 });
      return h;
    },
    setTransform(h, x, y, z, ry, sx, sy, sz) {
      const i = byHandle.get(h);
      if (i === undefined) return;
      Object.assign(written[i], { x, y, z, ry, sx, sy, sz });
    },
    setTone(h, tone) {
      const i = byHandle.get(h);
      if (i === undefined) return;
      const palette = tonesFor(written[i].kind);
      written[i].tone = palette.length ? tone % palette.length : 0;
    },
    release() {},
  };
  return { pool, written };
}

describe('collectWorld — 세계 전체 수집', () => {
  const result = collectWorld();

  it('물 파셀을 건너뛰고 육지만 편다 — 합이 격자 전체다', () => {
    expect(result.landParcels + result.waterParcels).toBe(GRID_W * GRID_H);
    expect(result.landParcels).toBeGreaterThan(0);
    // 물이 0이면 강·바다 판정이 죽은 것이다. 세계에 강이 있다는 것이 감독 확정 사양이다.
    expect(result.waterParcels).toBeGreaterThan(0);
  });

  it('건너뛴 파셀은 전부 실제 물 파셀이다', () => {
    // 수집기가 센 물 파셀 수를 SSOT(`parcelWater`)로 독립 재계산해 대조한다.
    let water = 0;
    for (let px = -Math.floor(GRID_W / 2); px < GRID_W - Math.floor(GRID_W / 2); px++) {
      for (let pz = -Math.floor(GRID_H / 2); pz < GRID_H - Math.floor(GRID_H / 2); pz++) {
        if (parcelWater(px, pz, cellX, cellZ) === 'water') water++;
      }
    }
    expect(result.waterParcels).toBe(water);
  });

  // 이 단언이 `collect.ts` 의 `% palette.length` 를 대신하는 진짜 게이트다. 그 나머지
  // 연산은 지금 아무 값도 바꾸지 않는다(뮤테이션으로 확인 — 지워도 전부 통과한다).
  // 파츠가 팔레트보다 큰 tone 을 내기 시작하면 런타임과 파일의 색이 갈리는데, 그 시작을
  // 잡는 것이 여기다.
  it('파츠가 내는 tone 이 애초에 팔레트 범위 안이다 — 정규화가 값을 바꾸지 않는다는 전제', () => {
    // 수집 결과가 아니라 **배치 원본**을 본다. 수집 결과는 이미 정규화를 거쳤으므로
    // 그쪽을 보면 정규화가 있는 한 언제나 통과한다 — 전제를 검증하지 못한다.
    let checked = 0;
    for (let px = -Math.floor(GRID_W / 2); px < GRID_W - Math.floor(GRID_W / 2); px++) {
      for (let pz = -Math.floor(GRID_H / 2); pz < GRID_H - Math.floor(GRID_H / 2); pz++) {
        if (parcelWater(px, pz, cellX, cellZ) === 'water') continue;
        for (const p of parcelLayout(px, pz, 'near', DEFAULT_LAYOUT)) {
          const palette = tonesFor(p.kind);
          expect(palette.length).toBeGreaterThan(0);
          expect(p.tone).toBeLessThan(palette.length);
          expect(p.tone).toBeGreaterThanOrEqual(0);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0); // 표본이 비면 위 단언이 전부 공회전한다
  });

  it('모든 노드의 종류가 등록된 파츠이고 tone 이 팔레트 범위 안이다', () => {
    const kinds = new Set<string>(ALL_KINDS);
    for (const n of result.nodes) {
      expect(kinds.has(n.kind)).toBe(true);
      const palette = tonesFor(n.kind);
      expect(n.tone).toBeGreaterThanOrEqual(0);
      expect(n.tone).toBeLessThan(Math.max(1, palette.length));
    }
  });

  it('노드가 세계 경계 안에 있다', () => {
    const half = (Math.max(GRID_W, GRID_H) / 2) * cellX + cellX;
    for (const n of result.nodes) {
      expect(Math.abs(n.x)).toBeLessThanOrEqual(half);
      expect(Math.abs(n.z)).toBeLessThanOrEqual(half);
    }
  });

  it('combos 가 실제 등장 조합을 빠짐없이 담는다 — 재질 개수의 근거다', () => {
    const seen = new Set(result.nodes.map((n) => comboKey(n.kind, n.tone)));
    expect(new Set(result.combos)).toEqual(seen);
    // 조합 수가 노드 수에 비해 압도적으로 작아야 메시 공유가 의미를 갖는다.
    // 이 비율이 무너지면 GLB 가 지오메트리 복제로 폭발한다.
    expect(result.combos.length).toBeLessThan(result.nodes.length / 100);
  });

  it('결정론 — 두 번 수집하면 같은 세계다', () => {
    const again = collectWorld();
    expect(again.nodes.length).toBe(result.nodes.length);
    expect(again.nodes[0]).toEqual(result.nodes[0]);
    expect(again.nodes[again.nodes.length - 1]).toEqual(result.nodes[result.nodes.length - 1]);
  });
});

describe('수집기와 집행 계층이 같은 변환을 쓴다', () => {
  // 좌표에서 파셀을 역산할 수는 없다 — 부품이 셀 안에서 흩어지고, 건물은 이웃 셀
  // 경계까지 밀린다. 그래서 "빌더가 낸 값이 수집 결과 안에 있는가" 로 본다. 부동소수
  // 비교이므로 소수 6자리 문자열 키로 맞춘다(같은 식이면 비트까지 같지만, 식이
  // 재배열되기만 해도 마지막 자리는 흔들릴 수 있다).
  const key = (n: { kind: string; x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number; tone: number }) =>
    [n.kind, n.x, n.y, n.z, n.ry, n.sx, n.sy, n.sz].map((v) => (typeof v === 'number' ? v.toFixed(6) : v)).join('|') + `|${n.tone}`;

  // 한 번만 수집한다 — 861파셀 순회를 샘플마다 다시 돌 이유가 없다.
  const index = new Set(collectWorld().nodes.map(key));

  // 세계 곳곳에서 뽑는다 — 광장(원점)·도심·외곽·강 근처가 섞이게.
  const SAMPLES: [number, number][] = [[0, 0], [1, 1], [3, -2], [-7, 4], [12, 11], [-14, -13], [5, 0], [0, -9]];

  for (const [px, pz] of SAMPLES) {
    it(`파셀 (${px},${pz}) — 빌더가 쓴 좌표가 수집 결과에 그대로 있다`, () => {
      // 물 파셀은 양쪽 다 건너뛰므로 대조할 것이 없다. 조용히 통과시키지 않고
      // 사양으로 적어 둔다 — 표본이 전부 물이 되면 이 테스트가 빈 채로 초록이 된다.
      expect(parcelWater(px, pz, cellX, cellZ)).not.toBe('water');

      const { pool, written } = recordingPool();
      new PooledParcelBuilder({ pool, cellX, cellZ }).build(px, pz, 'near');

      expect(written.length).toBeGreaterThan(0);
      for (const w of written) expect(index.has(key(w))).toBe(true);
    });
  }
});

describe('collectWater — 물판', () => {
  it('가장 낮은 수면에 놓인다', () => {
    expect(collectWater(cellX).y).toBe(SEA_Y);
  });

  it('세계를 덮고도 남는다 — 어느 방향으로도 수평선까지 물이다', () => {
    const { span } = collectWater(cellX);
    const worldSpan = Math.max(GRID_W, GRID_H) * cellX;
    // 세계 지름의 2배. 가장자리에 서서 바깥을 봐도 물이 끝나지 않아야 한다는 것이
    // `waterPlaneSpan` 의 근거이고, 그 값을 줄이면 여기가 깨진다.
    expect(span).toBeGreaterThanOrEqual(worldSpan * 2);
  });

  it('런타임 바다 판과 같은 식에서 나온다 — 값 미러링 방지', () => {
    // `features/ocean.ts` 의 `PLANE` 도 이 함수를 부른다. 수집기가 자기 식을 따로
    // 갖는 순간 세계를 넓힐 때 내보낸 파일에서만 바다가 모자라게 된다.
    expect(collectWater(cellX).span).toBe(waterPlaneSpan(cellX));
  });
});
