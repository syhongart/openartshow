// @vitest-environment node
//
// 에셋 라이브러리 — **무엇을 목록에 낼 것인가**와 **놓아도 되는가**.
//
// 감독 지시: *"아셋 라이브러리가 있고 … 진짜 전문 에디터로 만들어줘."*
// 카드 확정 2026-08-14: **마을 파츠부터 노출.**
//
// ── 이 파일이 지키는 것 중 가장 중요한 것 ───────────────────────────────────
// **놓기는 개수를 늘린다.** 마을 파츠를 하나 놓으면 그 파셀의 배치 배열에 항목이 늘고,
// 재빌드가 GPU 인스턴스 슬롯을 하나 더 집는다 — 개수 불변식 `[7]` 과 정면으로 부딪히는
// 자리다. 상한을 새로 만들지 않고 파츠가 이미 신고한 `maxPartsPerParcel(kind)` 를 쓰는데,
// **그 연결이 실제로 서 있는가**를 여기서 본다(연결이 끊기면 화면에서는 «구역이 가끔
// 덜 그려진다» 로만 드러나고, 그건 아무도 원인을 못 찾는 형태다).
//
// ── 라벨 표가 파츠를 다 덮는지도 여기서 본다 ────────────────────────────────
// 빠지면 화면에 영문 `kind` 가 그대로 뜬다. 파츠를 하나 추가하면 이 파일이 빨간불이
// 되는 것이 의도다 — `SHADING_LABEL` 과 같은 처방.

import { describe, it, expect } from 'vitest';
import {
  NOTHING_PICKED, PART_LABEL, canPlacePart, filterAssets, modelAssets, newPart, partAssets,
  pickAsset, placeable,
} from '../frontend/js/world2/decide/asset-library.js';
import { PARTS, maxPartsPerParcel, tonesFor } from '../frontend/js/world2/parts/index.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';

/** 실물 파츠 종류(그림자 제외) — 라이브러리가 받는 것과 같은 입력 */
const REAL_KINDS = PARTS.map((p) => p.kind).filter((k) => !k.startsWith('shadow:'));

function part(kind: string): PlacedPart {
  return newPart(kind, 0, 0, 0);
}

describe('에셋 라이브러리 — 무엇이 목록에 오는가', () => {
  it('모든 실물 파츠에 한국어 이름이 있다', () => {
    // 빠지면 화면에 영문 kind 가 그대로 뜬다. 파츠를 추가하면 여기가 빨간불이 된다.
    for (const k of REAL_KINDS) {
      expect(PART_LABEL[k], `★ 「${k}」 의 한국어 이름이 없다`).toBeTruthy();
    }
  });

  it('바닥 평면은 목록에 안 온다 — 「한 개 더」가 의미를 갖지 않는다', () => {
    // ground·garden·road 는 파셀을 덮는 판이다. `footprint() === 0` 이 그 사실이고,
    // 같은 기준을 겹침 판정(`freeSlots`)과 그림자 캐스터 판정도 쓴다.
    for (const k of ['ground', 'garden', 'road']) {
      expect(placeable(k), `★ 바닥 「${k}」 가 놓을 수 있는 것으로 나온다`).toBe(false);
    }
  });

  it('덩어리가 있는 것은 목록에 온다', () => {
    for (const k of ['building', 'tree', 'lamp']) {
      expect(placeable(k), `★ 「${k}」 를 못 놓는다`).toBe(true);
    }
  });

  it('없는 종류는 놓을 수 없다 — 조용히 true 를 내지 않는다', () => {
    expect(placeable('없는파츠')).toBe(false);
  });

  it('그림자는 목록에 절대 안 온다 — 조회 시점에 유도되는 것이다', () => {
    // `withShadows` 가 만들어 주므로 저장하면 두 벌이 된다.
    const ids = partAssets(PARTS.map((p) => p.kind), tonesFor).map((a) => a.id);
    expect(ids.filter((i) => i.startsWith('shadow:')), '★ 그림자가 팔레트에 떴다').toEqual([]);
  });

  it('파츠 항목은 색 스와치를 들고 온다', () => {
    const items = partAssets(REAL_KINDS, tonesFor);
    expect(items.length, '★ 놓을 수 있는 파츠가 하나도 없다').toBeGreaterThan(0);
    for (const a of items) {
      expect(a.kind).toBe('part');
      expect(a.tone, `★ 「${a.id}」 에 미리보기 색이 없다`).toBeTypeOf('number');
    }
  });

  it('GLB 는 라벨에서 확장자를 떼고 id 는 그대로 둔다', () => {
    // `id` 가 곧 파일명이라 놓을 때 `assets/models/${id}` 로 조립된다 — 여기서 떼면
    // 경로가 깨진다.
    const [a] = modelAssets(['museum.glb']);
    expect(a.label).toBe('museum');
    expect(a.id, '★ id 에서 확장자를 뗐다 — 경로가 깨진다').toBe('museum.glb');
  });
});

describe('에셋 라이브러리 — 검색', () => {
  const items = [...partAssets(REAL_KINDS, tonesFor), ...modelAssets(['museum.glb'])];

  it('한국어로 찾힌다', () => {
    expect(filterAssets(items, '나무').map((a) => a.id)).toEqual(['tree']);
  });

  it('영문 id 로도 찾힌다 — 감독이 어느 쪽으로 칠지 모른다', () => {
    expect(filterAssets(items, 'tree').map((a) => a.id)).toEqual(['tree']);
  });

  it('대소문자를 안 가린다', () => {
    expect(filterAssets(items, 'MUSEUM').map((a) => a.id)).toEqual(['museum.glb']);
  });

  it('빈 검색어와 공백은 전부 통과시킨다 — 비면 「고장났다」로 읽힌다', () => {
    expect(filterAssets(items, '')).toHaveLength(items.length);
    expect(filterAssets(items, '   ')).toHaveLength(items.length);
  });

  it('원본을 안 바꾼다 — 목록은 한 번 만들어 재사용한다', () => {
    const before = items.length;
    filterAssets(items, '나무');
    expect(items).toHaveLength(before);
  });
});

describe('에셋 라이브러리 — 고르기 (파츠와 GLB 는 배타다)', () => {
  const tree = partAssets(['tree'], tonesFor)[0]!;
  const bench = partAssets(['bench'], tonesFor)[0]!;
  const glb = modelAssets(['museum.glb'])[0]!;

  it('파츠를 고르면 파츠만 찬다', () => {
    expect(pickAsset(NOTHING_PICKED, tree)).toEqual({ src: null, part: 'tree' });
  });

  it('GLB 를 고르면 GLB 만 찬다', () => {
    expect(pickAsset(NOTHING_PICKED, glb))
      .toEqual({ src: 'assets/models/museum.glb', part: null });
  });

  it('★ GLB 를 고른 뒤 파츠를 고르면 **GLB 가 비워진다**', () => {
    // ⚠ 이 축이 뮤테이션(N4)이 만들어 낸 것이다. 이 로직이 `palette.ts` 안에 있었을 때는
    // 「파츠를 고를 때 `pendingSrc` 를 비운다」를 지워도 `0 failed` 였다 — 그 축이 GLB 를
    // **먼저 고르지 않아서** 애초에 `null` 이었고(축이 빔), 하네스의 GLB 목록이 비어 있어
    // 그 시나리오를 쓸 수조차 없었다(픽스처 한계). 판정을 끌어내니 둘 다 사라졌다.
    const a = pickAsset(NOTHING_PICKED, glb);
    const b = pickAsset(a, tree);
    expect(b.src, '★ 파츠를 골랐는데 GLB 가 남아 있다 — 지면 클릭이 무엇을 놓을지 갈린다')
      .toBeNull();
    expect(b.part).toBe('tree');
  });

  it('★ 파츠를 고른 뒤 GLB 를 고르면 **파츠가 비워진다**', () => {
    const a = pickAsset(NOTHING_PICKED, tree);
    const b = pickAsset(a, glb);
    expect(b.part, '★ GLB 를 골랐는데 파츠가 남아 있다').toBeNull();
    expect(b.src).toBe('assets/models/museum.glb');
  });

  it('★ 어떤 순서로 골라도 둘이 동시에 차지 않는다', () => {
    let cur = NOTHING_PICKED;
    for (const a of [tree, glb, bench, glb, tree, tree, bench]) {
      cur = pickAsset(cur, a);
      expect(cur.src !== null && cur.part !== null, '★ 둘이 동시에 찼다').toBe(false);
    }
  });

  it('같은 것을 다시 고르면 푼다 — 되돌릴 자리가 그것뿐이다', () => {
    expect(pickAsset(pickAsset(NOTHING_PICKED, tree), tree)).toEqual(NOTHING_PICKED);
    expect(pickAsset(pickAsset(NOTHING_PICKED, glb), glb)).toEqual(NOTHING_PICKED);
  });

  it('다른 것을 고르면 갈아탄다 — 푸는 것이 아니다', () => {
    const a = pickAsset(NOTHING_PICKED, tree);
    expect(pickAsset(a, bench).part, '★ 다른 파츠를 골랐는데 해제됐다').toBe('bench');
  });
});

describe('에셋 라이브러리 — 놓기 판정 (개수 불변식과 부딪히는 자리)', () => {
  it('빈 파셀에는 놓을 수 있다', () => {
    expect(canPlacePart('tree', [], maxPartsPerParcel('tree')).ok).toBe(true);
  });

  it('★ 상한에 닿으면 거절하고 **이유를 말한다**', () => {
    // 조용한 no-op 은 «가끔 안 놓인다» 가 되고, 그것이 이 저장소에서 가장 비쌌던 형태다.
    const cap = maxPartsPerParcel('tree');
    const full = Array.from({ length: cap }, () => part('tree'));
    const v = canPlacePart('tree', full, cap);
    expect(v.ok, '★ 상한을 넘겨 놓을 수 있다 — 구역이 조용히 덜 그려진다').toBe(false);
    expect(v.reason, '★ 거절하면서 아무 말도 안 한다').toContain('나무');
    expect(v.reason, '★ 몇 개까지인지 안 알려준다').toContain(String(cap));
  });

  it('★ 상한은 **파츠가 신고한 값**이다 — 여기서 새로 정하지 않는다', () => {
    // 판정이 `cap` 인자를 실제로 소비하는지 본다. 안 보고 상수를 쓰면 밀도·레이아웃
    // 전제가 바뀔 때 한쪽만 낡는다(슬롯 예산에서 이미 겪은 사고).
    const one = [part('tree')];
    expect(canPlacePart('tree', one, 1).ok, '★ cap=1 인데 둘째가 들어간다').toBe(false);
    expect(canPlacePart('tree', one, 2).ok, '★ cap=2 인데 둘째가 막힌다').toBe(true);
  });

  it('다른 종류는 서로의 자리를 안 먹는다 — 상한이 종류별이다', () => {
    const trees = Array.from({ length: maxPartsPerParcel('tree') }, () => part('tree'));
    expect(canPlacePart('bench', trees, maxPartsPerParcel('bench')).ok,
      '★ 나무가 꽉 찼다고 벤치까지 막힌다').toBe(true);
  });

  it('「가득 찼다」와 「원래 못 놓는다」를 갈라 말한다', () => {
    // 감독이 취할 행동이 다르다 — 전자는 다른 구역으로, 후자는 다른 종류로.
    const full = canPlacePart('tree', [part('tree')], 1).reason ?? '';
    const never = canPlacePart('ground', [], 1).reason ?? '';
    expect(full).not.toBe(never);
    expect(never, '★ 못 놓는 이유가 「바닥」이라고 안 나온다').toContain('바닥');
  });

  it('★ 상한이 0 인 종류는 「규칙에 없다」로 거절한다', () => {
    expect(canPlacePart('tree', [], 0).ok).toBe(false);
    expect(canPlacePart('tree', [], 0).reason, '★ 상한 0 과 초과를 같은 말로 거절한다')
      .toContain('배치 규칙');
  });
});

describe('에셋 라이브러리 — 새 배치', () => {
  it('좌표를 그대로 쓰고 기본 자세로 놓는다', () => {
    const p = newPart('tree', 3, -4, 0.07);
    expect([p.x, p.z, p.y]).toEqual([3, -4, 0.07]);
    expect([p.ry, p.sx, p.sy, p.sz], '★ 기본 자세가 아니다').toEqual([0, 1, 1, 1]);
  });

  it('★ 색이 **결정적**이다 — 놓을 때마다 달라지면 「내가 고른 것」이 아니다', () => {
    const a = newPart('tree', 0, 0, 0);
    const b = newPart('tree', 9, 9, 0);
    expect(a.tone, '★ 새 배치의 색이 놓는 자리에 따라 달라진다').toBe(b.tone);
  });
});
