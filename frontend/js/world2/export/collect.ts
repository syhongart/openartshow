// world2/export/collect.ts — **월드 전체를 노드 목록으로 편다. 순수 함수만, three import 0.**
//
// ── 왜 이 파일이 필요한가 ────────────────────────────────────────────────────
// 감독 질문 2026-08-06: *"오픈 월드 맵을 파일로 내보낼수있어?"* → GLB 확정.
//
// 그런데 **내보낼 원본이 없다.** world2 는 "파라미터가 곧 공간" 이라 맵이 어디에도
// 저장돼 있지 않고, 좌표 해시에서 매번 다시 계산된다(`decide/parcel-layout.ts`). 게다가
// 런타임 씬을 그대로 넘길 수도 없다 — 세 가지가 전부 걸린다:
//
//   ① **스트리밍** — 살아 있는 파셀은 카메라 주변 20칸 남짓이다. 씬을 그대로 구우면
//      "지금 서 있는 곳 주변" 만 나온다. 861개 육지 파셀 중 대부분이 빠진다.
//   ② **0 스케일 슬롯** — `InstancePools` 는 미사용 슬롯을 0 스케일 행렬로 밀어낸다
//      (`systems/instancing.ts`). 지우지 않고 찌그러뜨리는 것이므로, 그대로 내보내면
//      원점에 겹쳐 앉은 빈 인스턴스가 수만 개 딸려 나온다.
//   ③ **tier 혼재** — 가까운 파셀은 near, 먼 파셀은 far 로 그려진다. 그 상태를 구우면
//      한 파일 안에서 도시 절반만 가로등이 있다.
//
// 셋 다 "지금 화면" 의 성질이지 세계의 성질이 아니다. 그래서 **화면을 굽지 않고 세계를
// 다시 계산한다.** 배치가 순수 함수라 이게 가능하다 — 렌더러도, GPU 도, 스트리밍도
// 필요 없다. 같은 입력이면 같은 세계가 나온다는 그 불변식(`parcel-layout.ts` 불변식 ①)이
// 여기서 그대로 값을 한다.
//
// ── 집행 쪽과 같은 변환을 쓴다 ───────────────────────────────────────────────
// 월드 좌표 환산은 `systems/parcel-builder.ts` 의 `fill()` 과 **한 글자도 다르면 안 된다**
// (`ox + p.x, p.y, oz + p.z`). 다르면 내보낸 파일이 화면과 어긋나고, 그 어긋남은 둘을
// 나란히 놓고 보기 전에는 드러나지 않는다. `tests/world2-export-collect.test.ts` 가 실제
// 빌더와 같은 변환인지를 대조한다.

import { GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z } from '../decide/grid.js';
import { parcelWater, SEA_Y, waterPlaneSpan } from '../decide/water.js';
import { parcelLayout, DEFAULT_LAYOUT } from '../decide/parcel-layout.js';
import { tonesFor } from '../parts/index.js';
import type { LayoutOptions, ResolvedLayout } from '../parts/types.js';
import type { Tier } from '../decide/lod.js';

/**
 * 내보낼 부품 하나. `PlacedPart` 와 닮았지만 **월드 좌표**이고 `tone` 이 팔레트 길이로
 * 정규화돼 있다.
 *
 * ── 그 정규화는 지금 아무 값도 바꾸지 않는다 (뮤테이션으로 확인) ────────────
 * `% palette.length` 를 통째로 지워도 테스트가 전부 통과한다 — 현재 어떤 파츠도 자기
 * 팔레트보다 큰 `tone` 을 내지 않기 때문이다. 그래도 남기는 이유는 방어가 아니라
 * **런타임과 같은 규칙을 쓰기 위해서**다: `systems/parcel-assets.ts` 의 `setTone` 이
 * 실제로 `palette[tone % palette.length]` 를 한다. 한쪽만 나머지 연산을 하면, 파츠가
 * 팔레트 밖 tone 을 내는 날 화면은 감싸고 파일은 팔레트[0]으로 떨어져 **색이 갈린다.**
 *
 * 그 전제("파츠가 내는 tone 은 팔레트 범위 안") 자체는 테스트가 직접 단언한다 —
 * 검출력이 없는 줄을 방어선인 척 남겨두지 않으려면 그쪽이 진짜 게이트여야 한다.
 */
export interface ExportNode {
  kind: string;
  /** 팔레트 인덱스. `tonesFor(kind)` 범위 안이 보장된다 */
  tone: number;
  x: number;
  y: number;
  z: number;
  /** Y축 회전(라디안) */
  ry: number;
  sx: number;
  sy: number;
  sz: number;
}

/** 물판 한 장. 강·바다를 개별로 나누지 않는 이유는 `collectWater` 주석에 있다 */
export interface ExportWater {
  y: number;
  /** 정사각 물판의 한 변(미터) */
  span: number;
}

export interface CollectResult {
  nodes: ExportNode[];
  water: ExportWater;
  /** 부품이 놓인 육지 파셀 수 */
  landParcels: number;
  /** 통째로 물이라 건너뛴 파셀 수 */
  waterParcels: number;
  /** 실제로 등장한 (종류, 색조) 조합 — 재질을 몇 개 만들지가 여기서 나온다 */
  combos: string[];
}

export interface CollectOptions {
  layout?: LayoutOptions;
  /**
   * 어느 상세도로 구울 것인가. 기본 `near` — **파일로 내보내는 목적이 곧 최대 상세**다.
   * mid·far 를 여는 것은 용량을 줄이려는 경우를 위한 것이지 기본이 아니다.
   */
  tier?: Exclude<Tier, 'none'>;
}

/** `(kind, tone)` 조합 키. 재질 하나에 대응한다 */
export function comboKey(kind: string, tone: number): string {
  return `${kind}#${tone}`;
}

/**
 * 세계 전체를 편다.
 *
 * 물 파셀은 **건너뛴다** — 스트리밍이 하는 것과 같다(`decide/stream.ts` 의 차단 판정).
 * 그 구멍으로 물판이 보이는 것이 이 세계의 구조이고, 여기서 굳이 지면을 채우면 화면과
 * 다른 파일이 나온다.
 */
export function collectWorld(opts: CollectOptions = {}): CollectResult {
  const layout: ResolvedLayout = { ...DEFAULT_LAYOUT, ...opts.layout };
  const tier = opts.tier ?? 'near';
  const { cellX, cellZ } = layout;

  const nodes: ExportNode[] = [];
  const combos = new Set<string>();
  let landParcels = 0;
  let waterParcels = 0;

  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      if (parcelWater(px, pz, cellX, cellZ) === 'water') { waterParcels++; continue; }
      landParcels++;
      // 파셀 원점 가산은 `parcel-builder.ts` 의 `fill()` 과 같은 식이어야 한다.
      const ox = px * cellX;
      const oz = pz * cellZ;
      for (const p of parcelLayout(px, pz, tier, layout)) {
        const palette = tonesFor(p.kind);
        const tone = palette.length ? p.tone % palette.length : 0;
        nodes.push({
          kind: p.kind, tone,
          x: ox + p.x, y: p.y, z: oz + p.z,
          ry: p.ry, sx: p.sx, sy: p.sy, sz: p.sz,
        });
        combos.add(comboKey(p.kind, tone));
      }
    }
  }

  return { nodes, water: collectWater(cellX), landParcels, waterParcels, combos: [...combos].sort() };
}

/**
 * 물판 한 장.
 *
 * ── 왜 강과 바다를 나누지 않는가 ────────────────────────────────────────────
 * 런타임도 나누지 않는다. 물 파셀이 아예 로드되지 않고 그 구멍으로 **한 장의 판**이
 * 비치는 구조다(`features/ocean.ts`). 강과 바다의 수면 높이가 다른 것은 맞지만
 * (`RIVER_Y` ≠ `SEA_Y`), 그 차이는 판을 둘로 만들어서가 아니라 육지 판의 두께로
 * 표현된다 — `parts/ground.ts` 가 해저까지 내려가는 박스인 이유가 그것이다.
 *
 * 그래서 여기서도 **가장 낮은 수면(`SEA_Y`) 한 장**이다. 강 자리에서 수면이 50cm 낮게
 * 나오지만, 그 위를 덮는 것이 아무것도 없으므로 열어보면 물이 이어져 보인다. 강 높이를
 * 따로 굽는 것은 강 폭 판정(`isRiver` 는 지면 해상도로 내림했다)까지 GLB 로 옮기는
 * 일이라, 얻는 것에 비해 옮길 것이 많다. **여기서 멈춘다.**
 *
 * 판 크기는 **런타임 바다 판과 같다**(`waterPlaneSpan`). 런타임 판은 카메라를 따라다니고
 * 이 판은 고정이지만, 크기까지 다르게 잡을 이유는 없다 — 그 크기를 정한 근거(가장자리에
 * 서서 바깥을 봐도 물이 끝나지 않을 것)가 정적 파일에도 그대로 적용된다.
 */
export function collectWater(cell: number): ExportWater {
  return { y: SEA_Y, span: waterPlaneSpan(cell) };
}
