// world10 «끝없는 격자 도시» — 격자·셀 GLB·포크 경계의 회귀 게이트.
//
// 팀장 판정 2026-09-06 「C·포크」(감독 *"건물만 있으면 안 되지. 오픈월드를 만들어야지."*,
// 카드 «끝없는 격자 도시»)가 만든 축들을 검사로 못 박는다. 경위·조건 C1~C6 은
// `frontend/js/world10/README.md` 한 곳이다 — 여기에 다시 적지 않는다.
//
// ── 이 파일이 지키는 다섯 ────────────────────────────────────────────────────
//   ① 파셀 목록의 **결정성**(같은 좌표 → 같은 값)과 격자 좌표 환산
//   ② 스폰 셀 (0,0) 이 저작 원점, 즉 **오늘의 거리 그 자리**라는 것
//   ③ 런타임 격자 상수 ↔ 생성기 `layout.mjs` `CELL` 의 **값 미러링 방지**
//   ④ `world10-boot` 가 `./world10/` 만 import 한다(=`world-glb` 참조 0)
//   ⑤ **`world-glb/**` 가 이 회차에 한 글자도 안 바뀌었다**(팀장 조건: 계약·파일 diff 0)
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  NYC_CELL, NYC_ANCHOR_X, NYC_ANCHOR_Z, LANDMARK_EVERY,
  cellSeed, nycCellAt, nycCellsAround, parcelOf, toGridPos,
} from '../frontend/js/world10/systems/nyc-parcels.js';
import { collectCellParts, maxCells } from '../frontend/js/world10/systems/nyc-cell-builder.js';
import { CELL as GEN_CELL, groundPlan, DIMS } from '../scripts/asset/nyc/layout.mjs';
import { buildStreet } from '../scripts/asset/nyc/generate.mjs';
import { analyzeStreet } from '../scripts/asset/nyc/coplanar.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

describe('① nyc-parcels — 결정성과 격자 좌표', () => {
  it('같은 seed 는 같은 목록을 낸다 — 3×3 을 두 번 뽑아 통째로 비교한다', () => {
    const a = nycCellsAround(0, 0, 1);
    const b = nycCellsAround(0, 0, 1);
    expect(a).toHaveLength(9);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // **다른 자리에서 본 같은 셀도 같아야 한다** — 「목록을 만든 순서」에 값이 얽히면
    // 되돌아왔을 때 세계가 달라진다(감독이 «끝없는» 이라고 부른 것의 최소 조건이다).
    const fromAfar = nycCellsAround(3, 3, 3).find((c) => c.px === 0 && c.pz === 0);
    expect(fromAfar).toEqual(nycCellAt(0, 0));
  });

  it('seed 가 좌표 대칭이 아니다 — (2,1) 과 (1,2) 가 갈린다(대각선 줄무늬 방지)', () => {
    expect(cellSeed(2, 1)).not.toBe(cellSeed(1, 2));
    expect(cellSeed(5, -3)).not.toBe(cellSeed(-3, 5));
    // 그리고 실제로 흩어진다 — 81×81 격자의 seed 가 **전부** 다르다.
    // ⚠ 이 단언이 첫 판본(`imul(px,A) ^ imul(pz,B)`)을 잡았다: 11×11 에서 이미 121→99 였다.
    // 「대칭이 아니다」만 봤으면 통과했을 결함이다 — 축이 하나 모자랐다.
    const seen = new Set<number>();
    for (let x = -40; x <= 40; x++) for (let z = -40; z <= 40; z++) seen.add(cellSeed(x, z));
    expect(seen.size).toBe(81 * 81);
  });

  it('격자 좌표는 저작 좌표에서 ANCHOR 를 뺀 값이다 — 셀 경계가 ±cell/2 에 온다', () => {
    expect(toGridPos({ x: NYC_ANCHOR_X, z: NYC_ANCHOR_Z })).toEqual({ x: 0, z: 0 });
    // 셀 중심 → (0,0)
    expect(parcelOf({ x: NYC_ANCHOR_X, z: 0 })).toEqual({ px: 0, pz: 0 });
    // 아트 기준 V1 시작점(x=4, z=0)도 스폰 셀 안이다 — 캡처 좌표가 안 어긋났다는 뜻이다
    expect(parcelOf({ x: 4, z: 0 })).toEqual({ px: 0, pz: 0 });
    // 한 칸 옆
    expect(parcelOf({ x: NYC_ANCHOR_X + NYC_CELL, z: 0 })).toEqual({ px: 1, pz: 0 });
    expect(parcelOf({ x: NYC_ANCHOR_X, z: -NYC_CELL })).toEqual({ px: 0, pz: -1 });
    // 경계 바로 안쪽은 아직 이쪽 셀이다
    expect(parcelOf({ x: NYC_ANCHOR_X + NYC_CELL / 2 - 0.01, z: 0 }).px).toBe(0);
  });

  it('스폰 셀 (0,0) 은 셀 GLB 를 **저작 원점**에 놓는다 — 오늘의 거리가 그 자리에 남는다', () => {
    const spawn = nycCellAt(0, 0);
    expect(spawn.x).toBe(0);
    expect(spawn.z).toBe(0);
    // 인접 셀은 정확히 한 셀만큼 옮겨 놓는다(겹치지도 벌어지지도 않는다)
    expect(nycCellAt(1, 0).x).toBe(NYC_CELL);
    expect(nycCellAt(0, -2).z).toBe(-2 * NYC_CELL);
  });

  it('랜드마크는 **좌표 예약뿐**이고 실제로 예약된 셀이 있다 (팀장 조건 C4)', () => {
    const cells = nycCellsAround(0, 0, 6);   // 13×13
    const reserved = cells.filter((c) => c.landmark);
    expect(reserved.length).toBeGreaterThan(0);
    // 예약 규칙이 seed 에서 나온다 — 목록 순서나 호출 횟수와 무관하다
    for (const c of reserved) expect(c.seed % LANDMARK_EVERY).toBe(0);
    // 형태(플레이스홀더 매스)는 §6 법무 판정 뒤다 — 여기서는 «좌표» 밖의 것을 만들지 않는다
    expect(Object.keys(nycCellAt(0, 0)).sort()).toEqual(['landmark', 'px', 'pz', 'seed', 'x', 'z']);
  });
});

describe('② 격자 상수 미러링 — 런타임 ↔ 생성기', () => {
  it('격자 상수는 생성기 `layout.mjs` 의 CELL 과 같다 (두 값이 갈리면 여기서 깨진다)', () => {
    expect(NYC_CELL).toBe(GEN_CELL.SIZE);
    expect(NYC_ANCHOR_X).toBe(GEN_CELL.ANCHOR_X);
    expect(NYC_ANCHOR_Z).toBe(GEN_CELL.ANCHOR_Z);
  });

  it('셀 한 변은 지시서 «50~70m 거리 한 블록» 범위 안이고, 거리 내용물을 담는다', () => {
    expect(NYC_CELL).toBeGreaterThanOrEqual(50);
    expect(NYC_CELL).toBeLessThanOrEqual(70);
    // 내용물의 동쪽 끝 = 게이트 인방(GATE_X + 1.4). 셀이 그보다 좁으면 옆 셀을 침범한다.
    const contentEast = DIMS.GATE_X + 1.4;
    expect(NYC_CELL).toBeGreaterThanOrEqual(contentEast);
    expect(GEN_CELL.ANCHOR_X).toBeCloseTo(contentEast / 2, 6);
  });
});

describe('③ 셀 GLB — 경계에서 잘리고, 기본 모드는 안 건드린다', () => {
  it('`--cell` 지면 판이 셀 경계에 정확히 맞는다 — 인접 셀과 «겹치지» 않고 «맞닿는다»', () => {
    const half = GEN_CELL.SIZE / 2;
    const gp = groundPlan({ x0: GEN_CELL.ANCHOR_X - half, x1: GEN_CELL.ANCHOR_X + half, zFar: half });
    for (const [key, p] of Object.entries(gp)) {
      expect(p.x0, `${key} 서쪽 끝`).toBeCloseTo(GEN_CELL.ANCHOR_X - half, 9);
      expect(p.x1, `${key} 동쪽 끝`).toBeCloseTo(GEN_CELL.ANCHOR_X + half, 9);
      expect(Math.abs(p.z0), `${key} 북쪽 끝`).toBeLessThanOrEqual(half + 1e-9);
      expect(Math.abs(p.z1), `${key} 남쪽 끝`).toBeLessThanOrEqual(half + 1e-9);
    }
    // 뒷마당 판이 셀의 z 끝까지 덮는다 — 안 덮으면 셀 사이에 «구멍» 이 나 바다가 보인다
    expect(gp.yardN.z0).toBeCloseTo(-half, 9);
    expect(gp.yardS.z1).toBeCloseTo(half, 9);
  });

  it('기본(«거리 한 장») 모드는 `--cell` 도입으로 **한 바이트도 안 바뀐다**', () => {
    // 기존 캡처·증거의 기준 자산이 조용히 바뀌는 것을 막는 축이다.
    const built = buildStreet({ seed: 1 }).glb as Uint8Array;
    const onDisk = readFileSync(join(ROOT, 'frontend/assets/worlds/nyc-street.glb'));
    expect(Buffer.from(built).equals(onDisk)).toBe(true);
  });

  it('커밋된 `nyc-cell.glb` 가 생성기 산출과 바이트 동일하다', () => {
    const built = buildStreet({ seed: 1, cell: true }).glb as Uint8Array;
    const onDisk = readFileSync(join(ROOT, 'frontend/assets/worlds/nyc-cell.glb'));
    expect(Buffer.from(built).equals(onDisk)).toBe(true);
  });

  it('셀 모드에도 동일 평면·같은 방향 겹침이 0 이다 (감독 «우글우글» 축을 셀에도 건다)', () => {
    const a = analyzeStreet({ seed: 1, cell: true }) as { same: unknown[]; stats: Record<string, number> };
    expect(a.same.length).toBe(0);
    expect(a.stats.unpaired).toBe(0);
    expect(a.stats.nonAxisAligned).toBe(0);
  });
});

describe('④ 포크 경계 — world10 은 자기 트리만 연다', () => {
  it('`world10-boot.ts` 의 import 가 `./world10/` 뿐이다 — `world-glb` import 0', () => {
    const src = readFileSync(join(ROOT, 'frontend/js/world10-boot.ts'), 'utf8');
    const imports = [...src.matchAll(/^\s*import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(0);
    for (const spec of imports) {
      expect(spec, `world10-boot 가 트리 밖을 import 한다: ${spec}`).toMatch(/^\.\/world10\//);
    }
    // 주석에는 `world-glb` 가 나온다(경위 설명) — **import 줄에만** 없어야 한다.
    expect(imports.join('\n')).not.toContain('world-glb');
  });

  it('`world10/` 트리 안에서 `world-glb` 를 import 하는 파일이 0 이다', () => {
    // `git grep` 은 **못 찾으면 exit 1** 이다 — 그것이 여기서는 «통과» 다.
    // try 를 안 두면 통과 경로에서 예외가 나 검사가 늘 빨갛다(그러면 아무도 안 읽는다).
    let out = '';
    try {
      out = execFileSync('git', ['grep', '-l', '-E', "from '[^']*world-glb", '--', 'frontend/js/world10/'], {
        cwd: ROOT, encoding: 'utf8',
      }).trim();
    } catch (e) {
      const err = e as { status?: number; stdout?: string };
      if (err.status !== 1) throw e;   // 1 = 매치 0. 그 밖은 진짜 실패다
      out = (err.stdout ?? '').trim();
    }
    expect(out, `world10 트리가 world-glb 를 import 한다:\n${out}`).toBe('');
  });

  it('`world10.html` 이 여는 세계는 **격자 셀 한 장**이다', () => {
    const html = readFileSync(join(ROOT, 'frontend/world10.html'), 'utf8');
    expect(html).toContain('data-glb="./assets/worlds/nyc-cell.glb"');
  });
});

describe('⑤ `world-glb/**` 는 이 회차에 한 글자도 안 바뀐다 (팀장 조건: 계약·파일 diff 0)', () => {
  it('작업 트리의 `frontend/js/world-glb/` 변경 파일이 0 이다', () => {
    // ⚠ **워킹트리 + 인덱스 둘 다** 본다. `git add` 뒤에 검사가 조용히 통과하면
    // 그 순간 이 게이트는 장식이 된다(스테이징이 곧 «곧 커밋된다» 이므로 더 위험하다).
    const args = ['diff', 'HEAD', '--name-only', '--', 'frontend/js/world-glb/'];
    const out = execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
    expect(out, `world-glb 가 바뀌었다 — 포크 조건 위반:\n${out}`).toBe('');
  });
});

describe('⑥ 셀 빌더 — 예산과 슬롯 명세', () => {
  it('동시 셀 예산은 밴드에서 «유도» 된다 — 상수를 박지 않는다', () => {
    const narrow = maxCells({ nearEnter: 0.5, nearExit: 0.6, midEnter: 0.9, midExit: 1.0, farEnter: 1.4, farExit: 1.5 });
    const wide = maxCells({ nearEnter: 0.5, nearExit: 0.6, midEnter: 0.9, midExit: 1.0, farEnter: 2.9, farExit: 3.0 });
    expect(wide).toBeGreaterThan(narrow);
    // 3×3(스폰 + 인접 링)은 어떤 밴드에서도 최소 요구다
    expect(narrow).toBeGreaterThanOrEqual(9);
  });

  it('셀 템플릿의 메시가 항등 변환이 아니면 **던진다** (판정 불가 = 멈춤)', () => {
    const bad = {
      updateMatrixWorld() { /* noop */ },
      traverse(cb: (o: unknown) => void) {
        cb({
          isMesh: true, geometry: {}, material: {}, name: 'tilted',
          // 열 우선 16개 중 마지막 행에 평행이동이 있다 — 슬롯 풀이 표현할 수 없는 상태다
          matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 0, 0, 1] },
        });
      },
    };
    expect(() => collectCellParts(bad as never)).toThrow(/변환이 있다/);
  });
});
