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
import { readGlb } from '../scripts/asset/nyc/glb-write.mjs';
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

// ── `sameAsset` — «커밋 GLB ↔ 생성기» 정합 게이트(G-NYC1)의 축 ─────────────────
//
// ⚠ **왜 «바이트 동일» 이 아닌가 — 실측 2026-09-07 (부팀장).**
// PR #298 의 CI `verify` 가 아래 두 검사에서만 떨어졌다(로컬 Node 22 통과, CI Node 24 FAIL).
// node v24.9.0 을 받아 같은 자리에서 다시 재고 해부한 결과:
//   · 산출 GLB 가 Node 22 3,281,640 B ↔ Node 24 3,281,644 B — **4바이트** 길다.
//   · **BIN 청크는 바이트 동일**이다. 정점·인덱스·PNG 텍스처까지 전부 md5 가 같다.
//   · 갈리는 것은 **JSON 청크의 수 2,540개 중 8개**뿐이고 전부
//     `materials[*].pbrMetallicRoughness.baseColorFactor` 이며 거리는 **정확히 1 ULP** 다
//     (최대 상대오차 1.755e-16). 예: 0.04489375760705065 ↔ 0.044893757607050645.
//   · 출처는 `layout.mjs` `hexToLinear` 의 `Math.pow((s+0.055)/1.055, 2.4)` — V8 12.4
//     (Node 22) 와 V8 13.6(Node 24) 의 결과가 마지막 자리에서 다르다. ECMA-262 는
//     `Math.pow` 를 «구현이 정한 근사» 로 두므로 **V8 의 버그가 아니라 허용된 자유도**다.
//     십진 자릿수가 하나 늘면 JSON 문자열이 길어지고 → 청크 길이 → 파일이 4바이트 밀린다.
//
// 기각한 가설·처방 — 근거를 남긴다(안 남기면 다음 사람이 같은 데를 또 판다):
//   ✗ «zlib 버전 차이로 PNG 압축 바이트가 달라진다»(첫 가설) — **실측으로 틀렸다.**
//     같은 입력의 `deflateSync(level 9·6·0)` 출력이 Node 20·21·22·24 에서 md5 동일이고,
//     애초에 PNG 가 들어 있는 BIN 청크가 위와 같이 바이트 동일이다.
//   ✗ 단언 삭제·`.skip`·`toBe(true)` 완화 — 게이트가 장식이 된다.
//   ✗ Node 24 에서 GLB 를 다시 구워 커밋 — **어느 Node 가 빨간불인지만 바뀐다.**
//   △ 생성기가 JSON 에 쓰는 수를 고정 정밀도로 양자화(=환경 무관 산출) — 이것이 **항구
//     처방**이지만 커밋된 GLB 2장을 다시 구워야 한다(캡처 증거·filesize 기준선에 닿는다).
//     별도 회차로 올린다(게시판 2026-09-07).
//
// 그래서 **축을 바꾼다 — 느슨하게가 아니라, 환경이 못 건드리는 것을 재도록.**
//   ① BIN 청크는 **바이트 동일**. 관용 0. 지오메트리·인덱스·텍스처가 전부 여기 있다.
//   ② JSON 은 **구조·키 순서·문자열 완전 동일**, 수만 **4 ULP** 관용(실측 1 ULP 의 4배).
//      4 ULP ≈ 상대 8.9e-16 — 의미 있는 최소 변화(색 1/255 ≈ 3.9e-3, 좌표 1e-6 m)보다
//      **12자리** 아래다. 곧 «부동소수 마지막 자리» 말고는 아무것도 안 봐준다.
//   실증: `DIMS.WALL_T` 0.12→0.121 뮤테이션에서 이 축은 FAIL 한다(BIN 청크가 갈린다).

/** 이 값 자리의 ULP — «표현 가능한 바로 다음 배정밀도 수» 까지의 거리 */
function ulpAt(x: number): number {
  const b = new ArrayBuffer(8);
  const f = new Float64Array(b);
  const i = new BigInt64Array(b);
  const m = Math.abs(x) || Number.MIN_VALUE;
  f[0] = m;
  i[0] += 1n;
  return f[0] - m;
}

/** 두 수가 «부동소수 마지막 자리» 차이 안인가 (4 ULP, 0 근방은 1e-15 절대 바닥) */
function nearEnough(a: number, b: number): boolean {
  if (Object.is(a, b)) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;   // NaN·무한대는 봐주지 않는다
  const d = Math.abs(a - b);
  return d <= 4 * ulpAt(Math.max(Math.abs(a), Math.abs(b))) || d <= 1e-15;
}

/** glTF JSON 을 훑어 «관용 밖의 차이» 만 사람이 읽을 수 있게 모은다 */
function diffJson(a: unknown, b: unknown, path: string, out: string[]): void {
  if (out.length >= 8) return;   // 앞의 여덟만 — 2,540개를 쏟으면 아무도 안 읽는다
  if (typeof a === 'number' && typeof b === 'number') {
    if (!nearEnough(a, b)) {
      const u = Math.abs(a - b) / ulpAt(Math.max(Math.abs(a), Math.abs(b)));
      out.push(`${path}: 생성기 ${a} ≠ 디스크 ${b} (${u.toExponential(2)} ULP)`);
    }
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) { out.push(`${path}: 배열/비배열이 갈린다`); return; }
    if (a.length !== b.length) { out.push(`${path}: 길이 ${a.length} ≠ ${b.length}`); return; }
    for (let i = 0; i < a.length; i++) diffJson(a[i], b[i], `${path}[${i}]`, out);
    return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    // 키를 **정렬하지 않는다** — 순서까지 같아야 한다(정렬하면 키 재배열을 놓친다)
    const ka = Object.keys(a); const kb = Object.keys(b);
    if (ka.join(' ') !== kb.join(' ')) {
      out.push(`${path}: 키가 갈린다 — 생성기 [${ka}] / 디스크 [${kb}]`);
      return;
    }
    for (const k of ka) {
      diffJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, out);
    }
    return;
  }
  if (!Object.is(a, b)) out.push(`${path}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
}

/**
 * 생성기 산출 GLB 와 디스크 GLB 가 **같은 자산**인가. 다르면 사람이 읽을 사유 목록을,
 * 같으면 빈 배열을 낸다. 바이트가 같으면 그것이 최선이므로 거기서 끝낸다.
 */
function sameAsset(built: Uint8Array, onDisk: Buffer): string[] {
  const a = Buffer.from(built);
  if (a.equals(onDisk)) return [];                       // 바이트 동일 — 더 볼 것이 없다
  const g = readGlb(a) as { json: unknown; bin: Uint8Array };
  const d = readGlb(onDisk) as { json: unknown; bin: Uint8Array };
  const out: string[] = [];
  if (!Buffer.from(g.bin).equals(Buffer.from(d.bin))) {
    out.push(`BIN 청크가 다르다 — 지오메트리 또는 텍스처가 바뀌었다 (${g.bin.length} B / ${d.bin.length} B)`);
  }
  diffJson(g.json, d.json, 'json', out);
  return out;
}

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

  it('기본(«거리 한 장») 모드는 `--cell` 도입으로 **안 바뀐다** — 커밋 GLB ↔ 생성기 정합', () => {
    // 기존 캡처·증거의 기준 자산이 조용히 바뀌는 것을 막는 축이다.
    const built = buildStreet({ seed: 1 }).glb as Uint8Array;
    const onDisk = readFileSync(join(ROOT, 'frontend/assets/worlds/nyc-street.glb'));
    const diffs = sameAsset(built, onDisk);
    expect(diffs, `nyc-street.glb 가 생성기 산출과 갈린다:\n${diffs.join('\n')}`).toEqual([]);
  });

  it('커밋된 `nyc-cell.glb` 가 생성기 산출과 **같은 자산**이다', () => {
    const built = buildStreet({ seed: 1, cell: true }).glb as Uint8Array;
    const onDisk = readFileSync(join(ROOT, 'frontend/assets/worlds/nyc-cell.glb'));
    const diffs = sameAsset(built, onDisk);
    expect(diffs, `nyc-cell.glb 가 생성기 산출과 갈린다:\n${diffs.join('\n')}`).toEqual([]);
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
