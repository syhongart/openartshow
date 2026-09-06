// 동일 평면 겹침(z-fighting) 회귀 게이트 — 감독 실기기 2026-09-06.
//
//   *"이동하면 벽이 우글우글해. 2개의 메쉬가 동시에 붙어있으면 우글우글하잖아"*  (갤러리 1층 창 너머 실내 벽)
//   *"그것뿐 아니라 도로에서도 그런 게 보여"*                                    (보도·연석)
//
// 두 면이 같은 평면에서 **같은 방향**을 보면 깊이값이 같아 프레임마다 승자가 바뀐다. 화면에서 «우글거림» 이다.
// 판정 축·마주보는 쌍을 게이트에서 뺀 근거·한계는 `scripts/asset/nyc/coplanar.mjs` 헤더 **한 곳**이다
// — 여기에 다시 적지 않는다.
//
// ⚠ 이 검사는 **실산출 GLB 를 파싱**한다(픽스처가 아니다). 그래서 지면 판·건물·실내·게이트가 전부
// 자동으로 범위에 들어간다 — 새 부품을 추가해도 검사를 고칠 필요가 없다.
import { describe, it, expect } from 'vitest';
import { analyzeStreet, coplanarPairs, formatPairs, quadsOf } from '../scripts/asset/nyc/coplanar.mjs';
import { buildStreet } from '../scripts/asset/nyc/generate.mjs';

type Quad = { node: string; mat: string; axis: number; coord: number; dir: number; u: number; v: number; u0: number; u1: number; v0: number; v1: number };
const analysis = analyzeStreet({ seed: 1 }) as { same: unknown[]; opposed: unknown[]; quads: Quad[]; stats: Record<string, number> };

describe('동일 평면 겹침 — z-fighting 회귀 게이트', () => {
  it('같은 평면·같은 방향으로 겹치는 면이 0 이다 (감독 실기기 «우글우글» 2026-09-06)', () => {
    const lines = (formatPairs(analysis.same as never[]) as string[]).join('\n');
    expect(analysis.same.length, `동일 평면·같은 방향 겹침이 남아 있다:\n${lines}`).toBe(0);
  });

  it('검사가 지면 판을 실제로 잰다 — ground_* 7개 노드 전부에서 면이 복원된다 (감독 요구 «도로에서도»)', () => {
    const ground = new Set(analysis.quads.filter((q) => q.node.startsWith('ground_')).map((q) => q.node));
    expect([...ground].sort()).toEqual(
      ['ground_curb_n', 'ground_curb_s', 'ground_road', 'ground_walk_n', 'ground_walk_s', 'ground_yard_n', 'ground_yard_s'],
    );
    // 연석·보도의 윗면(y=0, +y)이 둘 다 복원돼야 그 쌍을 비교할 수 있다 — 여기가 감독 지적 지점이다
    const tops = analysis.quads.filter((q) => q.axis === 1 && q.dir > 0 && Math.abs(q.coord) < 1e-9
      && (q.node === 'ground_walk_n' || q.node === 'ground_curb_n'));
    expect(tops.map((q) => q.node).sort()).toEqual(['ground_curb_n', 'ground_walk_n']);
  });

  it('복원이 산출 전체를 덮는다 — 미쌍 0 · 비축정렬 0 · 쿼드×2 = 삼각형', () => {
    expect(analysis.stats.unpaired).toBe(0);
    expect(analysis.stats.nonAxisAligned).toBe(0);
    expect(analysis.quads.length * 2).toBe(analysis.stats.triangles);
    expect(analysis.quads.length).toBeGreaterThan(2000);
  });

  it('마주보는 접촉은 여전히 존재한다 — 0 이면 검출기가 아무것도 재지 않는 것이다', () => {
    expect(analysis.opposed.length).toBeGreaterThan(100);
  });
});

describe('검출기 자신의 검출력', () => {
  const q = (over: Partial<Quad>): Quad => ({ node: 'a', mat: 'm', axis: 0, coord: 7.5, dir: 1, u: 1, v: 2, u0: 0, u1: 1, v0: 0, v1: 1, ...over });

  it('같은 방향·같은 평면·면적 초과 → same 1 · opposed 0', () => {
    const r = coplanarPairs([q({}), q({ node: 'b', u0: 0.5, u1: 1.5 })]) as { same: unknown[]; opposed: unknown[] };
    expect(r.same).toHaveLength(1);
    expect(r.opposed).toHaveLength(0);
  });

  it('법선이 반대면 opposed 로 간다(백페이스 컬링) — same 0', () => {
    const r = coplanarPairs([q({}), q({ node: 'b', dir: -1 })]) as { same: unknown[]; opposed: unknown[] };
    expect(r.same).toHaveLength(0);
    expect(r.opposed).toHaveLength(1);
  });

  it('평면 좌표가 1e-3 만 달라도 쌍이 아니다 · 겹침 면적이 임계 이하여도 쌍이 아니다', () => {
    expect((coplanarPairs([q({}), q({ node: 'b', coord: 7.501 })]) as { same: unknown[] }).same).toHaveLength(0);
    expect((coplanarPairs([q({}), q({ node: 'b', u0: 0.99999 })]) as { same: unknown[] }).same).toHaveLength(0);
  });

  it('축 정렬이 아닌 면은 복원 대상이 아니라 nonAxisAligned 로 센다 — 조용히 빠지지 않는다', () => {
    const built = buildStreet({ seed: 1 }) as { glb: Buffer; json: { meshes: { primitives: { attributes: Record<string, number> }[] }[]; accessors: unknown[] } };
    // 실산출에는 축 정렬이 아닌 면이 없다(전 부품이 축 정렬 박스다) — 그 사실 자체를 못 박는다
    const { stats } = quadsOf(built) as { stats: Record<string, number> };
    expect(stats.nonAxisAligned).toBe(0);
    expect(stats.meshNodes).toBeGreaterThan(20);
  });

  it('메시 노드에 조상 변환이 있으면 예외를 던진다 — 로컬 좌표를 월드로 오인하지 않는다', () => {
    expect(() => quadsOf(buildStreet({ seed: 1, streetYaw: 15 }) as never)).toThrow(/변환이 있다/);
  });
});
