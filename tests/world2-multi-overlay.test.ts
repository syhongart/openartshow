// @vitest-environment node
//
// 여러 작가 문서를 **한 마을로 놓는 계획.**
//
// ── 팀장이 병합 조건으로 건 것 (2026-08-16) ────────────────────────────────
// > *"실패 격리는 계약이 아니라 소비자(로더)가 보장한다. **한 문서를 일부러 깨뜨려
// > 나머지가 렌더되는지 뮤테이션으로 확인하는 테스트**가 없으면 이 보장은 장식이다."*
//
// 이 파일이 그 조건이다. 계획이 **순수**하므로 브라우저 없이 실증된다.
//
// ── 지키는 명제 넷 ─────────────────────────────────────────────────────────
// ① **한 문서가 깨져도 나머지가 산다** — 그리고 **왜 빠졌는지가 남는다**
// ② **남의 땅에 못 앉힌다** — 대장 배정을 통과한 파셀만 합쳐진다
// ③ **`surfaces` 는 버리되 조용히 삼키지 않는다**(감독 카드 「마을 공통」)
// ④ **문서마다 따로 파싱한다** — 한 문서의 `version` 오타가 모두를 날리면 안 된다

import { describe, it, expect } from 'vitest';
import { planMerge, totalItems, type OverlayDoc } from '../frontend/js/world2/decide/multi-overlay.js';
import { loadLedger } from '../frontend/js/world2/decide/village-ledger.js';
import { OVERLAY_VERSION } from '../frontend/js/world2/decide/overlay.js';
import { SURFACE_KINDS } from '../frontend/js/world2/decide/surface-material.js';

// ⚠ **재질 종류를 지어내지 않는다.** `'grass'` 같은 문자열을 손으로 적으면 파츠 목록이
// 바뀔 때 조용히 무효가 되고, 그러면 계약이 먼저 거부해 **내 로직이 한 번도 안 돈다**
// (첫 판본이 그래서 「무시했다는 사유」를 못 봤다 — 픽스처가 계약에서 튕겼을 뿐이다).
// SSOT 에서 받아 쓰면 저절로 따라온다.
const SURFACE_FIXTURE = {
  kind: SURFACE_KINDS[0], repeat: 4, turns: 0, metalness: 0, roughness: 1,
};

const { ledger } = loadLedger({
  version: 1,
  plots: [
    { px: 0, pz: 0, owner: 'arthong' },
    { px: 1, pz: 0, owner: 'arthong' },
    { px: 5, pz: 5, owner: 'mara' },
  ],
});

/** 정상 문서 하나 */
function doc(owner: string, over: Record<string, unknown> = {}): OverlayDoc {
  return {
    owner,
    raw: {
      version: OVERLAY_VERSION,
      items: [{ src: 'assets/models/a.glb', x: 0, y: 0, z: 0 }],
      parcels: [],
      surfaces: [],
      ...over,
    },
  };
}

describe('정상 경로 — 각각 그룹으로 간다', () => {
  it('문서마다 자기 그룹이 생긴다 — 그룹이 곧 격리 단위다', () => {
    const plan = planMerge(ledger, [doc('arthong'), doc('mara')]);
    expect(plan.groups.map((g) => g.owner)).toEqual(['arthong', 'mara']);
    expect(totalItems(plan)).toBe(2);
    expect(plan.issues.filter((i) => i.reason !== 'no-plot')).toEqual([]);
  });

  it('문서가 0개면 빈 계획 — 지금 라이브가 그 상태다', () => {
    const plan = planMerge(ledger, []);
    expect(plan.groups).toEqual([]);
    expect(plan.parcels).toEqual([]);
    expect(totalItems(plan)).toBe(0);
  });

  it('배치가 여럿이면 그대로 센다 — 「작품 수 상한 없음」을 막지 않는다', () => {
    // ⚠ `src` 는 계약의 안전 경로 규칙(`isSafeSrc`)을 통과해야 한다 — `a0.glb` 처럼
    // 적으면 **계약이 먼저 버려** 이 테스트가 0을 세고, 그것을 「상한에 걸렸다」로
    // 오독하게 된다(첫 판본이 그랬다).
    const many = Array.from({ length: 300 }, (_, i) => ({
      src: `assets/models/a${i}.glb`, x: i, y: 0, z: 0,
    }));
    const plan = planMerge(ledger, [doc('arthong', { items: many })]);
    expect(totalItems(plan)).toBe(300);
  });
});

describe('★ 실패 격리 — 팀장 병합 조건', () => {
  it('★ 한 문서를 못 읽어도 나머지가 선다', () => {
    const plan = planMerge(ledger, [
      doc('arthong'),
      { owner: 'broken', raw: null, failure: 'not-found' },
      doc('mara'),
    ]);
    expect(plan.groups.map((g) => g.owner), '★ 깨진 문서가 나머지를 죽였다')
      .toEqual(['arthong', 'mara']);
    expect(totalItems(plan)).toBe(2);
  });

  it('★ 빠진 이유가 남는다 — 조용히 없어지면 원인을 못 짚는다', () => {
    const plan = planMerge(ledger, [{ owner: 'broken', raw: null, failure: 'unreachable' }]);
    expect(plan.issues).toContainEqual({
      owner: 'broken', reason: 'doc-unreadable', detail: 'unreachable',
    });
  });

  it('★ 깨진 문서가 **여럿**이어도 멀쩡한 것은 전부 산다', () => {
    const plan = planMerge(ledger, [
      { owner: 'b1', raw: null },
      doc('arthong'),
      { owner: 'b2', raw: undefined },
      doc('mara'),
      { owner: 'b3', raw: null },
    ]);
    expect(plan.groups.map((g) => g.owner)).toEqual(['arthong', 'mara']);
    expect(plan.issues.filter((i) => i.reason === 'doc-unreadable')).toHaveLength(3);
  });

  it('★ 미래 버전 문서 하나가 **모두를 날리지 않는다** — 문서마다 따로 파싱하는 이유', () => {
    const plan = planMerge(ledger, [
      { owner: 'future', raw: { version: OVERLAY_VERSION + 99, items: [{ src: 'assets/models/x.glb' }] } },
      doc('arthong'),
    ]);
    // 미래 버전은 계약이 **빈 오버레이**로 돌려준다 — 그 문서만 비고 나머지는 그대로다.
    const art = plan.groups.find((g) => g.owner === 'arthong');
    expect(art?.items, '★ 남의 버전 오타가 내 배치를 지웠다').toHaveLength(1);
  });

  it('쓰레기 입력도 나머지를 안 죽인다', () => {
    for (const junk of [0, '', 'x', [], true, { items: 'no' }]) {
      const plan = planMerge(ledger, [{ owner: 'junk', raw: junk }, doc('arthong')]);
      expect(plan.groups.some((g) => g.owner === 'arthong'), `${JSON.stringify(junk)}`).toBe(true);
    }
  });
});

describe('★ 남의 땅에 못 앉힌다', () => {
  const mine = { px: 0, pz: 0, parts: [] };
  const yours = { px: 5, pz: 5, parts: [] };
  const nowhere = { px: 9, pz: 9, parts: [] };

  it('★ 자기 칸은 통과, 남의 칸은 버린다', () => {
    const plan = planMerge(ledger, [doc('arthong', { parcels: [mine, yours] })]);
    expect(plan.parcels, '★ 남의 칸이 통과했다').toEqual([mine]);
    expect(plan.issues).toContainEqual({
      owner: 'arthong', reason: 'parcel-not-owned', px: 5, pz: 5,
    });
  });

  it('★ 배정 없는 칸도 버린다 — 대장에 없으면 아무의 땅도 아니다', () => {
    const plan = planMerge(ledger, [doc('arthong', { parcels: [nowhere] })]);
    expect(plan.parcels).toEqual([]);
    expect(plan.issues.some((i) => i.reason === 'parcel-not-owned')).toBe(true);
  });

  it('★ 파셀은 **합쳐진다** — `setAll` 이 전체 대체라 문서마다 부르면 마지막 것만 남는다', () => {
    const plan = planMerge(ledger, [
      doc('arthong', { parcels: [mine] }),
      doc('mara', { parcels: [yours] }),
    ]);
    expect(plan.parcels, '★ 파셀이 합쳐지지 않았다 — 한 작가 것만 남는다')
      .toEqual([mine, yours]);
  });

  it('대장이 비어 있으면 어떤 파셀도 안 앉는다 — fail-closed', () => {
    const { ledger: empty } = loadLedger({ version: 1, plots: [] });
    const plan = planMerge(empty, [doc('arthong', { parcels: [mine] })]);
    expect(plan.parcels).toEqual([]);
  });
});

describe('★ surfaces — 버리되 말한다 (감독 카드 「마을 공통」)', () => {
  it('★ 작가 문서의 재질은 계획에 안 실린다', () => {
    const plan = planMerge(ledger, [doc('arthong', { surfaces: [SURFACE_FIXTURE] })]);
    expect(Object.keys(plan)).not.toContain('surfaces');
  });

  it('★ 무시했다는 사실이 남는다 — 조용히 삼키면 「왜 내 잔디가 안 바뀌지」가 된다', () => {
    const plan = planMerge(ledger, [doc('arthong', { surfaces: [SURFACE_FIXTURE] })]);
    expect(plan.issues).toContainEqual({ owner: 'arthong', reason: 'surfaces-ignored' });
  });

  it('재질이 없으면 사유도 없다 — 흔한 경우에 잡음을 내지 않는다', () => {
    const plan = planMerge(ledger, [doc('arthong')]);
    expect(plan.issues.some((i) => i.reason === 'surfaces-ignored')).toBe(false);
  });
});

describe('배정 없는 작가', () => {
  it('★ 문서는 읽혔는데 땅이 없으면 말한다 — 건물은 서지만 동결은 안 먹는다', () => {
    const plan = planMerge(ledger, [doc('stranger')]);
    expect(plan.groups.map((g) => g.owner), '배치 자체는 서야 한다').toEqual(['stranger']);
    expect(plan.issues).toContainEqual({ owner: 'stranger', reason: 'no-plot' });
  });

  it('배정이 있으면 그 사유가 안 난다', () => {
    const plan = planMerge(ledger, [doc('arthong')]);
    expect(plan.issues.some((i) => i.reason === 'no-plot')).toBe(false);
  });
});

describe('경계 — 계약을 바꾸지 않는다 (팀장 판정 다)', () => {
  it('★ 문서마다 `loadOverlay` 를 지난다 — 마이그레이션·검증이 그대로 돌아야 한다', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      fileURLToPath(new URL('../frontend/js/world2/decide/multi-overlay.ts', import.meta.url)),
      'utf8',
    );
    expect(src, '★ 계약 진입점을 안 쓴다 — normalize 를 우회하면 검증이 사라진다')
      .toContain('loadOverlay(doc.raw)');
    // 저장소(I/O)를 알면 방향이 거꾸로다 — 순수 판정이 어디서 왔는지 몰라야 한다.
    const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    expect(imports.filter((i) => i.includes('store/')), '★ decide 가 store 를 안다').toEqual([]);
    expect(imports.filter((i) => i.includes('three')), '★ 순수가 아니다').toEqual([]);
  });
});
