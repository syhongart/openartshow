// world2 GLB 내보내기·되읽기 — **배선이 갈라지지 않는가.**
//
// ── 왜 이 파일이 생겼나 (검수관 반려 B1·B2, 2026-08-23) ──────────────────────
// 되읽기를 붙이며 **렌더에는 GLB 오버레이를 물리고 충돌 판정에는 안 물렸다.** 편집한
// 도시를 불러오면 건물은 새 자리에 서는데 막히는 것은 옛 자리다 — «보이는 자리 = 막히는
// 자리» 가 깨진다.
//
// **경고 주석이 두 곳에 있었는데도 났다**(`main.ts` 의 충돌기 생성 바로 위 3줄,
// `systems/collision.ts` 의 반대편 경고). 산문은 이미 실패했으므로 검사로 옮긴다 —
// 검수관이 명세한 GX-1·GX-2 가 이것이다.
//
// ── 왜 소스를 읽는가 ────────────────────────────────────────────────────────
// 이 배선은 `startWorld2()` 안에 있고 그것을 돌리려면 렌더러·DOM·GPU 가 필요하다. 그래서
// **조립 결과가 아니라 조립 코드**를 본다. `world2-boundary.test.ts` 가 같은 방식으로
// import 경계를 지키고 있다(이 저장소의 전례).
//
// 텍스트 비교의 한계를 알고 쓴다: 서식이 바뀌면 오탐이 날 수 있다. 그래서 «문자열이
// 같은가» 가 아니라 **«둘 다 같은 식별자 하나를 넘기는가»** 를 본다 — 표현식을 인라인으로
// 다시 적는 순간(그것이 이 결함의 형태다) 잡히고, 줄바꿈·공백에는 안 흔들린다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectWorld } from '../frontend/js/world2/export/collect.js';
import { buildOverlay } from '../frontend/js/world2/export/overlay.js';
import { createGlbOverlayHost } from '../frontend/js/world2/export/host.js';
import { parcelWater } from '../frontend/js/world2/decide/water.js';
import { GRID_MAX_X } from '../frontend/js/world2/decide/grid.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAIN = readFileSync(join(ROOT, 'frontend/js/world2/main.ts'), 'utf8');

/** `frozenAt:` 에 넘긴 표현식을 전부 모은다. 한 줄짜리 값만 대상이다 */
function frozenAtArgs(src: string): string[] {
  return [...src.matchAll(/frozenAt:\s*([^,\n]+)/g)].map((m) => m[1].trim());
}

describe('GX-1 — 배치 출처가 하나다', () => {
  it('`frozenAt` 을 받는 곳이 둘 이상이다 — 표본이 비면 아래 단언이 공회전한다', () => {
    expect(frozenAtArgs(MAIN).length).toBeGreaterThanOrEqual(2);
  });

  it('전부 **같은 식별자 하나**를 넘긴다 — 인라인으로 다시 적으면 잡힌다', () => {
    // 이 단언이 깨지는 형태가 곧 반려 사유였다: 한쪽은 `layoutSource`, 다른 쪽은
    // `(px, pz, tier) => village.lookup(...)` 처럼 **표현식을 새로 적은** 경우.
    const args = frozenAtArgs(MAIN);
    expect(new Set(args).size).toBe(1);
    // 식별자여야 한다. 화살표 함수를 그대로 넘기면 두 곳이 우연히 같은 문자열일 수는
    // 있어도 **같은 참조**는 아니다 — 한쪽만 고치는 사고가 그대로 살아난다.
    expect(args[0]).toMatch(/^[A-Za-z_$][\w$]*$/);
  });

  it('그 식별자가 GLB 오버레이와 마을 원장을 **둘 다** 탄다', () => {
    const name = frozenAtArgs(MAIN)[0];
    const decl = new RegExp(`const\\s+${name}[^=]*=\\s*\\([^)]*\\)\\s*=>([\\s\\S]{0,200})`);
    const body = MAIN.match(decl)?.[1] ?? '';
    expect(body, '체인 선언을 못 찾았다').not.toBe('');
    expect(body).toContain('glbHost');
    expect(body).toContain('village');
  });
});

describe('GX-2 — 출처가 바뀌면 무효화가 전량이다', () => {
  it('`applyOverlay` 가 스트리밍 재빌드와 충돌 캐시 무효화를 **둘 다** 부른다', () => {
    // 하나만 부르면 «옛 벽» 이 남는다. 충돌 캐시는 「플레이어가 선 파셀」로만 갱신되므로
    // 제자리에 선 채 도시를 갈아 끼우면 그 파셀이 그대로다.
    const block = MAIN.match(/applyOverlay:\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\n {4}\}/)?.[1] ?? '';
    expect(block, 'applyOverlay 블록을 못 찾았다').not.toBe('');
    expect(block).toMatch(/rebuildAll\(\)/);
    expect(block).toMatch(/collider\.invalidate\(\)/);
  });
});

describe('팀장 조건 2 — 주입된 배치 체인이 실제로 소비된다', () => {
  // 「판정/집행 분리의 구멍」 조항: 주입값이 계산돼도 **소비되는지**는 양쪽 단위 테스트
  // 어디에도 안 걸린다. 여기서 그 경계를 직접 건넌다.
  const MARK: PlacedPart = {
    kind: 'building', tone: 0, x: 1.5, y: 0, z: -2.5, ry: 0, sx: 3, sy: 7, sz: 3,
  };

  it('체인이 답한 파셀은 계산 대신 그 배치가 나간다', () => {
    const seen: string[] = [];
    const out = collectWorld({
      layoutSource: (px, pz) => {
        seen.push(`${px},${pz}`);
        // 한 파셀만 가로챈다 — 전부 가로채면 "계산이 안 돈다" 와 구별되지 않는다.
        return px === 3 && pz === -7 ? [MARK] : null;
      },
    });
    expect(seen.length).toBeGreaterThan(500); // 전 격자를 물어봤는가
    const at = out.nodes.filter((n) => Math.abs(n.x - (3 * 32 + 1.5)) < 1e-9 && Math.abs(n.z - (-7 * 32 - 2.5)) < 1e-9);
    expect(at).toHaveLength(1);
    expect(at[0].kind).toBe('building');
  });

  it('체인이 `null` 이면 계산이 그대로 돈다 — 주입이 세계를 지우지 않는다', () => {
    const injected = collectWorld({ layoutSource: () => null });
    const plain = collectWorld();
    expect(injected.nodes.length).toBe(plain.nodes.length);
  });

  // ⚠ 뮤테이션 실측(팀장 조건 2): `collect.ts` 에서 `opts.layoutSource?.(…) ??` 를 지우고
  // `parcelLayout(...)` 만 남기면 위 첫 케이스가 FAIL 한다(가로챈 건물이 안 나온다).
  // 안 깨졌으면 이 검사는 장식이다 — 보고서에 실측을 적는다.
});

describe('팀장 조건 3 — 비운 파셀이 비운 채로 나간다', () => {
  it('오버레이가 모르는 파셀은 `[]` 다 — `null` 이면 지운 것이 되살아난다', () => {
    const overlay = buildOverlay([]);
    expect(overlay.layoutFor(3, -7)).toEqual([]);
  });

  it('그 `[]` 가 체인을 타고 내보내기까지 이어진다 — 부품 0 으로 나간다', () => {
    // `[]` 가 도중에 `null` 로 접히면 계산이 되살아나 **지운 도시가 그대로 나온다.**
    // 왕복 무손실이 깨지는 지점이 정확히 여기다.
    const overlay = buildOverlay([]);
    const host = createGlbOverlayHost();
    host.set(overlay);
    const out = collectWorld({ layoutSource: (px, pz, tier) => host.lookup(px, pz, tier) });
    expect(out.nodes).toHaveLength(0);
  });

  it('오버레이를 끄면 다시 계산이 답한다 — 원장·계산이 살아 있다', () => {
    const host = createGlbOverlayHost();
    expect(host.active).toBe(false);
    expect(host.lookup(0, 0, 'near')).toBeNull();
    const out = collectWorld({ layoutSource: (px, pz, tier) => host.lookup(px, pz, tier) });
    expect(out.nodes.length).toBeGreaterThan(1000);
  });
});

describe('왕복의 경계 — 무손실의 조건은 좌표가 아니라 「실린 칸이 그려지는가」다', () => {
  // ── 이 절이 두 번 고쳐졌다. 두 번째가 진짜였다 (실측 2026-08-25) ─────────
  // ① 처음엔 왕복에서 building 2,053 → 2,001, lamp 3,182 → 3,012 로 줄어 결함처럼
  //    보였고, 격자밖 41+98 · 물파셀 11+72 로 «정확히 일치» 하기에 **정상으로 적었다.**
  //    그 해석 위에서 "격자 안·육지에만 있으면 0" 이라는 검사를 썼다.
  // ② 그 검사가 **원본에서 FAIL 했다** — outsideGrid 196. 램프가 셀 경계에 서기
  //    때문이다(오프셋 z = ±16, 3,182개 전부). 즉 ①의 «정상» 은 틀린 판정이었고,
  //    편집하지 않은 원본을 되읽어도 **340개를 잃고 있었다.**
  //
  // 값이 아니라 **재는 축이 틀렸다.** 「좌표가 세계 안인가」로 재면 경계에 선 부품은
  // 답이 없다(양쪽 파셀이 동률이라 원래 소속이 좌표에 남아 있지 않다). 무손실의 조건은
  // «실린 칸이 그려지는 칸인가» 이고, 그래서 배정을 「그려지는 칸 중 가장 가까운 것」으로
  // 바꿨다. 아래 첫 검사가 그 축이다 — 340 → 0.

  it('원본을 되읽으면 **하나도 안 잃는다** — 이것이 무손실의 축이다', () => {
    // ⚠ 뮤테이션 실측 2회(2026-08-25). `hostParcel` 의 두 처방을 각각 되돌려 봤다:
    //   ① 격자 클램프 제거 → 1건 FAIL(«아주 멀리 옮긴 것도 안 버린다»). 원본은 링
    //      탐색이 대신 구제하므로 이 검사는 **안 깨진다** — 두 처방의 담당이 다르다.
    //   ② 링 탐색 제거      → 3건 FAIL. 이 검사가 **28,704 → 28,560** 으로 깨진다
    //      (물 파셀로 반올림되는 램프 72 + 그림자 72).
    // 둘 다 안 깨졌으면 장식이다. 처방을 고칠 때 이 표를 다시 뜬다.
    const plain = collectWorld();
    const host = createGlbOverlayHost();
    host.set(buildOverlay(plain.nodes));
    const round = collectWorld({ layoutSource: (px, pz, tier) => host.lookup(px, pz, tier) });
    expect(round.nodes).toHaveLength(plain.nodes.length);
  });

  it('월드 좌표까지 그대로다 — 칸이 바뀌어도 화면 위치는 안 변한다', () => {
    // 개수만 보면 «다른 것이 같은 수만큼» 들어와도 통과한다. 좌표 집합으로 못 박는다.
    const plain = collectWorld();
    const host = createGlbOverlayHost();
    host.set(buildOverlay(plain.nodes));
    const round = collectWorld({ layoutSource: (px, pz, tier) => host.lookup(px, pz, tier) });
    const key = (n: { kind: string; x: number; z: number }) => `${n.kind}|${n.x.toFixed(4)}|${n.z.toFixed(4)}`;
    const before = new Set(plain.nodes.map(key));
    expect(round.nodes.filter((n) => !before.has(key(n)))).toHaveLength(0);
  });

  it('정상 파일에서는 손실 경고가 안 뜬다', () => {
    expect(buildOverlay(collectWorld().nodes).stats.dropped).toBe(0);
  });

  it('격자 밖 좌표를 **센다** — 사라지지는 않는다', () => {
    const far = buildOverlay([
      { kind: 'building', tone: 0, x: 40 * 32, y: 0, z: 0, ry: 0, sx: 4, sy: 8, sz: 4 },
      { kind: 'building', tone: 0, x: 0, y: 0, z: 0, ry: 0, sx: 4, sy: 8, sz: 4 },
    ]);
    expect(far.stats.outsideGrid).toBe(1);
    expect(far.stats.dropped).toBe(0);
  });

  it('물 파셀 좌표를 **센다** — 이웃 육지로 실린다', () => {
    // 강 위 좌표를 배치 판정에서 직접 찾는다 — 좌표를 손으로 박으면 강을 옮길 때
    // 이 검사만 안 따라온다.
    let wet: { px: number; pz: number } | null = null;
    for (let px = -14; px <= 14 && !wet; px++) {
      for (let pz = -14; pz <= 14; pz++) {
        if (parcelWater(px, pz, 32, 32) === 'water') { wet = { px, pz }; break; }
      }
    }
    expect(wet, '물 파셀을 못 찾았다 — 표본이 비면 아래 단언이 공회전한다').not.toBeNull();
    const on = buildOverlay([
      { kind: 'building', tone: 0, x: wet!.px * 32, y: 0, z: wet!.pz * 32, ry: 0, sx: 4, sy: 8, sz: 4 },
    ]);
    expect(on.stats.onWater).toBe(1);
    expect(on.stats.outsideGrid).toBe(0);
    // 강은 한두 줄이라 이웃에 뭍이 있다 — 버려지지 않는다.
    expect(on.stats.dropped).toBe(0);
  });

  it('센 것을 버리지는 않는다 — 이웃 칸에 실리되 **월드 좌표가 보존된다**', () => {
    // 여기서 걸러내면 같은 판정이 두 곳에 살게 된다(`collectWorld` 도 격자·물을 본다).
    const X = 40 * 32;
    const far = buildOverlay([
      { kind: 'building', tone: 0, x: X, y: 0, z: 0, ry: 0, sx: 4, sy: 8, sz: 4 },
    ]);
    expect(far.stats.dropped).toBe(0);
    // 격자 동쪽 끝 칸에 실린다. 오프셋이 함께 조정돼 월드 x 는 그대로여야 한다 —
    // 그것이 「칸이 바뀌어도 화면은 안 변한다」의 실체다.
    const placed = far.layoutFor(GRID_MAX_X, 0);
    expect(placed).toHaveLength(1);
    expect(placed[0].x + GRID_MAX_X * 32).toBeCloseTo(X, 9);
  });

  it('아주 멀리 옮긴 것도 안 버린다 — 링 탐색만으로는 못 푸는 자리다', () => {
    // ⚠ 이 검사가 설계 하나를 되돌렸다. 격자 클램프 없이 링 탐색만 돌던 판본은
    // `x = 40·32` 를 **버렸다** — 세계에서 26칸 밖이라 어느 이웃도 격자 안이 아니다.
    // 편집을 왕복 한 번으로 잃는 것이라 클램프를 ① 단계로 되살렸다(`hostParcel`).
    const X = 400 * 32;
    const far = buildOverlay([
      { kind: 'building', tone: 0, x: X, y: 0, z: 0, ry: 0, sx: 4, sy: 8, sz: 4 },
    ]);
    expect(far.stats.dropped).toBe(0);
    expect(far.layoutFor(GRID_MAX_X, 0)[0].x + GRID_MAX_X * 32).toBeCloseTo(X, 9);
  });

  // ⚠ **`dropped > 0` 은 현재 지형에서 도달 불가다** — 클램프가 격자 안을 보장하고,
  // 격자 안에는 뭍이 있으며, 링 상한이 격자 한 변이라 반드시 찾는다. 그래도 `null`
  // 갈래를 남긴 이유는 «찾았다고 치고» 물 칸에 실으면 그 부품이 **조용히** 사라지기
  // 때문이다. 여기서는 최소한 세어서 신고한다. 강 폭을 격자만큼 키우면 살아나는 축이다.
});

describe('B5 — 되읽기가 그림자 유도 규약을 탄다', () => {
  it('캐스터를 주면 그림자가 따라 나온다 — 옮긴 건물의 그림자가 옛 자리에 안 남는다', () => {
    // `decide/parcel-freeze.ts` 가 못 박은 짝: 저장은 캐스터만, 조회는 그림자 재유도.
    // 되읽기가 그것을 안 타면 블렌더에서 옮긴 건물의 그림자만 제자리에 남는다.
    const host = createGlbOverlayHost();
    host.set(buildOverlay([
      { kind: 'building', tone: 0, x: 0, y: 0, z: 0, ry: 0, sx: 4, sy: 8, sz: 4 },
    ]));
    const got = host.lookup(0, 0, 'near') ?? [];
    expect(got.some((p) => p.kind === 'building')).toBe(true);
    expect(got.some((p) => p.kind.startsWith('shadow:')), '그림자가 유도되지 않았다').toBe(true);
  });

  it('그림자가 섞여 들어와도 배로 늘지 않는다 — 파일을 두 번 왕복해도 같다', () => {
    const host = createGlbOverlayHost();
    host.set(buildOverlay([
      { kind: 'building', tone: 0, x: 0, y: 0, z: 0, ry: 0, sx: 4, sy: 8, sz: 4 },
    ]));
    const first = host.lookup(0, 0, 'near') ?? [];
    // 1차 결과(그림자 포함)를 그대로 다시 되읽는다 = 2차 왕복.
    host.set(buildOverlay(first.map((p) => ({
      kind: p.kind, tone: p.tone, x: p.x, y: p.y, z: p.z, ry: p.ry, sx: p.sx, sy: p.sy, sz: p.sz,
    }))));
    const second = host.lookup(0, 0, 'near') ?? [];
    const count = (ps: readonly PlacedPart[]) => ps.filter((p) => p.kind.startsWith('shadow:')).length;
    expect(count(second)).toBe(count(first));
  });
});
