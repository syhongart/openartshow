// 「걸을 수 있는 격자」 — 굽기 · 자산 독립성 · 걷기 소비의 회귀 게이트.
//
// 감독 요구 2026-09-19: *"우리 치비들이 건물. 길. 벽.을 인식해서 다닐수 있개"* ·
// *"**맨하탄이 홍콩이 될수도** 있고. **매번 치비를 수정하지 않아도 자동으로** 다니게."*
// 팀장 판정: (A) 미니맵 래스터 순회를 재사용해 걸을 수 있는 격자를 굽는다.
//
// ── 이 파일이 지키는 다섯 ────────────────────────────────────────────────────
//   ⓐ 자산 독립성 — 판정·굽기 두 파일에 **재질 이름·노드 이름 참조 0**
//   ② 기존 걷기가 **한 글자도 안 바뀐다**(파셀 공급자 항등)
//   ③ 칸 크기 유도식과 `?walkcell=` 후보 접기
//   ④ **합성 GLB** 로 구운 격자 위를 치비가 걷고 **벽 칸을 밟지 않는다**
//      (= 판정/집행 경계 — 구운 격자가 걷기에 실제로 소비되는지)
//   ⑤ 도달 판정이 칸에서 유도된다(안 하면 걷기가 제자리에서 돈다)
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three/webgpu';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  walkCellSize, walkCellFromKnob, WALK_CELL_MULTIPLES, judgeCell,
  walkSource, walkableAt, cellOf, centerOf, pruneUnreachable, blockMargin, type WalkGrid,
} from '../frontend/js/world-glb/decide/walkable.js';
import {
  bakeWalkGrid, walkableCount, bakeWalkmapFor, blockMesh, blockWalkFor,
} from '../frontend/js/world-glb/systems/glb-walkmap.js';
import {
  parcelSource, walkableDirs, isWalkable, nearbyCells, nextDir,
  isWalkableIn, nearbyCellsIn, nextDirIn, stepOf,
} from '../frontend/js/world-glb/decide/npc-walk.js';
import { DEFAULT_BODY_R } from '../frontend/js/world-glb/systems/collision.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world-glb/parts/types.js';

// Node 에는 `FileReader` 가 없다 — `GLTFExporter` 의 **binary(=GLB) 경로**가 그것으로
// Blob 을 읽는다(`GLTFExporter.js:598`). 없으면 합성 자산을 GLB 로 구울 수가 없고, 그러면
// 이 검사가 「GLB 에서 굽는다」가 아니라 「three 씬에서 굽는다」가 된다 — 로더를 통과한
// 뒤의 실제 형태(인덱스·월드 행렬)를 안 타므로 축이 하나 빠진다. 그래서 채운다.
if (typeof (globalThis as { FileReader?: unknown }).FileReader === 'undefined') {
  (globalThis as { FileReader?: unknown }).FileReader = class {
    result: ArrayBuffer | null = null;
    onloadend: (() => void) | null = null;
    readAsArrayBuffer(blob: Blob): void {
      blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); });
    }
  };
}

const ROOT = new URL('..', import.meta.url).pathname;
const { cellX, cellZ } = DEFAULT_LAYOUT;

// ── ⓐ 자산 독립성 (팀장 조건 3ⓐ) ───────────────────────────────────────────
//
// 🔴 **이 한 곳에서만 소스 문자열 검사가 정당하다.** 이 저장소는 최근 두 회차에 문자열
// 검사가 검수관 블로커였고(「그 글자가 있는가」는 「값이 도달하는가」가 아니다), 그
// 규율은 여기서도 그대로다 — 다른 축은 전부 **실행**한다(아래 ②③④⑤).
// 다만 여기서 재는 것은 **「그 문자열이 없다」 자체가 축**이다: 재질 이름으로 도로를
// 고르는 순간 맨해튼에서만 맞고 홍콩 자산에서는 틀리며, 그것이 감독 요구를 정면으로
// 어긴다(팀장이 안 (B) 를 기각한 사유). 없다는 것은 실행으로 증명할 수 없다.
describe('ⓐ 격자는 **기하만** 본다 — 재질·노드 이름 참조 0', () => {
  const FILES = [
    'frontend/js/world-glb/decide/walkable.ts',
    'frontend/js/world-glb/systems/glb-walkmap.ts',
  ];

  /**
   * 주석·문자열 리터럴·import 를 걷어낸 소스. **이 함수가 이 검사의 검출력 자체다.**
   * 안 걷으면 경계를 설명하는 주석(*"「`asphalt` 재질이면 도로」 같은 규칙은…"*)이 스스로
   * 걸려 **늘 빨간불**이 되고, 그러면 아무도 안 읽는다(`nyc-grid.test.ts` ⑤ 가 같은
   * 균형을 같은 이유로 잡았다). 그 타당성은 아래 뮤테이션 절이 회차마다 증명한다.
   */
  const codeOnly = (src: string): string => src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/^\s*import[\s\S]*?from\s*['"][^'"]*['"];?\s*$/gm, ' ')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');

  /**
   * 「재질/노드 이름을 본다」의 실체. 이름을 **비교하거나 조회하는** 코드다.
   * 값으로 스치는 것(`o.name` 을 로그에 싣기)까지 막으면 검사가 늘 빨간불이 되고,
   * 그러면 아무도 안 읽는다 — 이 저장소가 `nyc-grid.test.ts` ⑤ 에서 배운 그 균형이다.
   */
  const NAME_PROBES: Array<[string, RegExp]> = [
    ['재질 이름 조회', /\bmaterial\s*(\?\.)?\.?\s*name\b/],
    ['노드 이름 조회', /\b(?:o|obj|node|mesh)\s*\.\s*name\b/],
    ['이름 비교', /\bname\s*[!=]==/],
    ['이름 문자열 포함 검사', /\bname\s*\.\s*(?:includes|startsWith|endsWith|match|indexOf)\s*\(/],
    // 이 자산에 실제로 있는 재질 이름들. **코드에 하나라도 적히면** 그것이 (B) 로
    // 미끄러진 순간이다(맨해튼 자산의 실물 이름 — `manhattan-180m.glb` 실측).
    ['맨해튼 재질 이름', /\b(?:asphalt|concrete|limestone|sidewalk|road|street|water|glass|metal)\b/i],
  ];

  it('표본이 비어 있지 않다 — 없으면 아래가 공허하다', () => {
    for (const f of FILES) expect(readFileSync(join(ROOT, f), 'utf8').length).toBeGreaterThan(500);
  });

  it('두 파일에 재질·노드 이름을 보는 코드가 0 이다', () => {
    const hits: string[] = [];
    for (const f of FILES) {
      codeOnly(readFileSync(join(ROOT, f), 'utf8')).split('\n').forEach((line, i) => {
        for (const [label, re] of NAME_PROBES) {
          if (re.test(line)) hits.push(`${f}:${i + 1} [${label}]  ${line.trim()}`);
        }
      });
    }
    expect(
      hits,
      `격자가 자산의 «이름» 을 보기 시작했다 — 맨해튼에서만 맞고 홍콩 자산에서는 틀린다:\n${hits.join('\n')}`,
    ).toEqual([]);
  });
});

// ── ② 기존 걷기 불변 (기존 단언을 약화시키지 않는다는 것의 증명) ────────────
describe('② 파셀 공급자는 **항등**이다 — world2·world7·world8 의 걷기가 안 바뀐다', () => {
  const src = parcelSource(cellX, cellZ);

  it('보폭이 1 이다 — 후보 순회가 기존과 같은 칸을 훑는다', () => {
    expect(src.stride).toBe(1);
  });

  it('칸 ↔ 월드 환산이 옛 식(`px * cellX`)과 같다', () => {
    for (const [px, pz] of [[0, 0], [3, -5], [-14, 14]] as const) {
      expect(src.center(px, pz)).toEqual({ x: px * cellX, z: pz * cellZ });
      expect(src.at(px * cellX, pz * cellZ)).toEqual({ px, pz });
    }
  });

  it('`dirs`·`standable` 이 옛 함수와 **격자 전체에서** 같다', () => {
    let checked = 0;
    for (let px = -15; px <= 14; px++) {
      for (let pz = -15; pz <= 14; pz++) {
        expect(src.dirs(px, pz)).toEqual(walkableDirs(px, pz, cellX, cellZ));
        expect(isWalkableIn(src, px, pz)).toBe(isWalkable(px, pz, cellX, cellZ));
        checked++;
      }
    }
    expect(checked).toBe(30 * 30);
  });

  it('`nearbyCells`·`nextDir` 이 공급자 경로와 **같은 표**를 낸다', () => {
    expect(nearbyCellsIn(src, 0, 0, 1, 1)).toEqual(nearbyCells(0, 0, 1, 1, cellX, cellZ));
    expect(nearbyCellsIn(src, 4, -7, 1, 3)).toEqual(nearbyCells(4, -7, 1, 3, cellX, cellZ));
    // 난수를 **같은 시드로** 준다 — 다른 수열을 주면 비교가 성립하지 않는다.
    const seq = [0.1, 0.4, 0.75, 0.9, 0.05];
    const mk = () => { let i = 0; return () => seq[i++ % seq.length]; };
    for (const [px, pz] of [[0, 0], [2, 3], [-6, 8]] as const) {
      expect(nextDirIn(src, px, pz, null, mk())).toBe(nextDir(px, pz, null, mk(), cellX, cellZ));
    }
  });
});

// ── ③ 칸 크기 유도 (팀장 조건 2) ───────────────────────────────────────────
describe('③ 칸 크기는 **유도**된다 — 재서 여유를 얹지 않는다', () => {
  it('유도 상한은 `Collider` 계약의 몸 반경 그대로다', () => {
    // cell ≤ (2 × bodyRadius) / 2 = bodyRadius. 식은 `walkCellSize` 한 곳이다 —
    // 여기에 0.34 를 적으면 그 순간 값 미러링이다.
    expect(walkCellSize(DEFAULT_BODY_R)).toBe(DEFAULT_BODY_R);
    // 몸이 커지면 칸도 커진다(상수가 아니라 유도라는 뜻)
    expect(walkCellSize(1)).toBeGreaterThan(walkCellSize(0.5));
  });

  it('`?walkcell=` 은 **배수**로 받고 후보 밖은 가장 가까운 후보로 접는다', () => {
    const base = walkCellSize(DEFAULT_BODY_R);
    expect(walkCellFromKnob(null, DEFAULT_BODY_R)).toBe(base);          // 지정 없음 = 유도값
    for (const m of WALK_CELL_MULTIPLES) {
      expect(walkCellFromKnob(m, DEFAULT_BODY_R)).toBeCloseTo(base * m, 10);
    }
    expect(walkCellFromKnob(0.9, DEFAULT_BODY_R)).toBeCloseTo(base * 1, 10);   // 1 로 접힌다
    expect(walkCellFromKnob(99, DEFAULT_BODY_R)).toBeCloseTo(base * 2, 10);    // 상한 후보로
    expect(walkCellFromKnob(-1, DEFAULT_BODY_R)).toBe(base);                   // 무효 = 유도값
  });

  it('후보가 **기본값을 포함**하고 그 양쪽으로 열려 있다', () => {
    expect(WALK_CELL_MULTIPLES).toContain(1);
    expect(Math.min(...WALK_CELL_MULTIPLES)).toBeLessThan(1);
    expect(Math.max(...WALK_CELL_MULTIPLES)).toBeGreaterThan(1);
  });

  it('한 칸 판정은 **바닥이 있고 머리 위가 비었다** 두 축뿐이다', () => {
    expect(judgeCell(-Infinity, Infinity, 1.7)).toBe(false);  // 바닥 없음
    expect(judgeCell(0, Infinity, 1.7)).toBe(true);           // 바닥 있고 막는 것 없음
    expect(judgeCell(0, 1.69, 1.7)).toBe(false);              // 키보다 낮은 데 뭔가 있다
    expect(judgeCell(0, 1.7, 1.7)).toBe(true);                // 딱 키만큼이면 지나간다
    // 바닥이 올라오면 같은 천장도 막힌다 — 두 값의 **차**가 축이다
    expect(judgeCell(0.5, 1.9, 1.7)).toBe(false);
  });
});

// ── ④ 합성 GLB → 격자 → 치비가 걷는다 (팀장 조건 3ⓑ · 4) ────────────────────
//
// **맨해튼이 아닌 자산**으로 「어떤 GLB 가 와도」의 최소 실물을 만든다. 상자 몇 개로
// 십자 통로를 만들고, 그것을 **GLB 로 굽고 다시 로더로 읽어** 격자를 굽는다 — 로더를
// 통과한 뒤의 실제 형태(인덱스·월드 행렬)를 타지 않으면 「GLB 에서 굽는다」가 아니다.

/** 벽 높이(m). 사람 키보다 확실히 높아야 「머리 위가 막혔다」가 된다 */
const WALL_H = 10;
/** 통로 반폭(m). 치비 몸 지름(0.68m)보다 넉넉해야 이 검사가 격자 해상도를 재지 않는다 */
const HALF = 2.5;
/** 세계 반폭(m) */
const HALF_W = 50;

/** 십자 통로 하나짜리 합성 세계를 **GLB 바이트**로 굽는다 */
async function buildSyntheticGlb(): Promise<ArrayBuffer> {
  const scene = new THREE.Scene();
  const mat = new THREE.MeshBasicMaterial();
  // 바닥 — 얇은 판. 윗면이 정확히 y=0 이다(플레이어가 서는 평면)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF_W, 0.2, 2 * HALF_W), mat);
  floor.position.set(0, -0.1, 0);
  scene.add(floor);
  // 네 사분면을 블록으로 채운다 → 십자 통로만 남는다
  const side = HALF_W - HALF;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(side, WALL_H, side), mat);
      b.position.set(sx * (HALF + side / 2), WALL_H / 2, sz * (HALF + side / 2));
      scene.add(b);
    }
  }
  return new Promise((res, rej) => {
    new GLTFExporter().parse(scene, (out: unknown) => res(out as ArrayBuffer), rej, { binary: true });
  });
}

async function loadSynthetic(): Promise<THREE.Object3D> {
  const bytes = await buildSyntheticGlb();
  const loader = new GLTFLoader();
  const gltf = await new Promise<{ scene: THREE.Object3D }>((res, rej) => loader.parse(bytes, '', res as never, rej));
  return gltf.scene;
}

/** **굽기만** — `main.ts` 의 가지치기 전 상태다(아래 「실내」 검사가 이것을 본다) */
function bakeRaw(root: THREE.Object3D, cell = walkCellSize(DEFAULT_BODY_R)): WalkGrid {
  const g = bakeWalkGrid({ root: root as never, cell, groundY: 0, step: 0.5, head: 1.7 });
  if (!g) throw new Error('격자를 못 구웠다');
  return g;
}

/**
 * **`main.ts` 의 stream 단계와 같은 배선**: 굽고 → 플레이어 자리에서 가지친다.
 * 한쪽만 재현하면 이 검사가 라이브와 다른 것을 재게 된다.
 */
function bakeForTest(root: THREE.Object3D, cell = walkCellSize(DEFAULT_BODY_R)): WalkGrid {
  return pruneUnreachable(bakeRaw(root, cell), 0, 0);
}

/**
 * 통로에서 **걸어서 닿을 수 있는** 칸을 전부 표시한다(BFS).
 *
 * 🔴 이것이 이 기능의 진짜 축이다. 「그 칸이 걸을 수 있는가」만 보면 **속이 빈 건물
 * 안쪽이 참**으로 나온다 — 바닥(지면 판)이 있고 머리 위도 비었으니 두 축이 다 성립한다.
 * 그런데도 치비가 거기 못 들어가는 것은 **벽이 경로를 끊기 때문**이고, 그 사실은 칸
 * 하나를 봐서는 절대 안 보인다. 그래서 이웃 관계로 잰다.
 *
 * ⚠ **이 주석은 처음 «연결 성분 판정을 런타임에 넣는 것은 이 회차의 경계 밖이다» 라고
 *  적고 있었고, 그것은 같은 회차 안에서 거짓이 됐다.** 실측(치비가 블록 안쪽에 스폰)
 *  뒤에 `pruneUnreachable` 이 런타임으로 들어갔고, 팀장 판정 ①(선택지 A 승인, 조건부)이
 *  그것을 추인했다. 이 함수는 여전히 **검사 쪽의 독립 구현**이다 — 라이브 구현을 그대로
 *  불러 쓰면 「구현이 자기 자신과 같다」를 재게 되므로 일부러 따로 짠다.
 */
function reachableFrom(grid: WalkGrid, sx: number, sz: number): Uint8Array {
  const src = walkSource(grid, DEFAULT_BODY_R);
  const start = cellOf(grid, sx, sz);
  const seen = new Uint8Array(grid.nx * grid.nz);
  if (!walkableAt(grid, start.px, start.pz)) return seen;
  const q: Array<{ px: number; pz: number }> = [start];
  seen[start.pz * grid.nx + start.px] = 1;
  while (q.length > 0) {
    const c = q.pop()!;
    for (const d of src.dirs(c.px, c.pz)) {
      const st = stepOf(d);
      const px = c.px + st.px;
      const pz = c.pz + st.pz;
      const k = pz * grid.nx + px;
      if (seen[k]) continue;
      seen[k] = 1;
      q.push({ px, pz });
    }
  }
  return seen;
}

describe('④ 합성 GLB — 상자 몇 개로 만든 십자 통로', () => {
  it('통로는 걸을 수 있고, 블록 안쪽에는 **걸어서 닿을 수 없다**', async () => {
    const grid = bakeForTest(await loadSynthetic());
    const at = (x: number, z: number) => {
      const c = cellOf(grid, x, z);
      return walkableAt(grid, c.px, c.pz);
    };
    // 통로 한가운데 — 남북/동서 양쪽
    expect(at(0, 0)).toBe(true);
    expect(at(0, 30)).toBe(true);
    expect(at(-30, 0)).toBe(true);
    // 벽면 — 블록 껍데기가 지나는 자리는 막힌다
    expect(at(HALF, 26)).toBe(false);
    expect(at(-26, -HALF)).toBe(false);
    // 블록 **안쪽**으로는 걸어서 못 간다(껍데기가 경로를 끊는다)
    const reach = reachableFrom(grid, 0, 0);
    const inside = cellOf(grid, 25, 25);
    expect(reach[inside.pz * grid.nx + inside.px], '건물 안쪽까지 걸어 들어갔다').toBe(0);
    const far = cellOf(grid, -25, 30);
    expect(reach[far.pz * grid.nx + far.px]).toBe(0);
    // 통로 반대편 끝까지는 닿는다(0 이면 위 단언이 「아무 데도 못 간다」로 공허해진다)
    const end = cellOf(grid, 0, 45);
    expect(reach[end.pz * grid.nx + end.px], '통로 끝까지도 못 갔다').toBe(1);
    // 걸을 수 있는 칸이 있긴 하다
    expect(walkableCount(grid)).toBeGreaterThan(100);
  });

  it('🔴 **두 축만으로는 실내가 통과한다** — 가지치기가 그것을 떼어낸다', async () => {
    // 이 검사가 `pruneUnreachable` 의 **검출력 그 자체**다. 축은 「바닥이 있고 머리 위가
    // 비었다」 둘뿐이고, 속이 빈 건물 안쪽은 그 둘을 **만족한다**(지면 판이 건물 밑까지
    // 깔려 있고 지붕은 격자 대역 밖이다). 걷기는 벽을 못 넘지만 **스폰은 밴드 안의 칸을
    // 그냥 고르므로** 그 안에 떨어진다 — 가지치기를 빼면 아래 ⑤ 가 실제로 빨간불이 된다.
    const root = await loadSynthetic();
    const raw = bakeRaw(root);
    const inside = cellOf(raw, 25, 25);
    expect(walkableAt(raw, inside.px, inside.pz), '굽기만으로 실내가 걸러졌다면 이 검사는 공허하다').toBe(true);
    const pruned = pruneUnreachable(raw, 0, 0);
    expect(walkableAt(pruned, inside.px, inside.pz), '가지치기가 실내를 안 떼어냈다').toBe(false);
    // 통로는 그대로 남는다 — 가지치기가 전부를 지우지 않는다
    const on = cellOf(pruned, 0, 30);
    expect(walkableAt(pruned, on.px, on.pz)).toBe(true);
  });

  it('칸 ↔ 월드 환산이 왕복한다 — 중심을 되읽으면 같은 칸이다', async () => {
    const grid = bakeForTest(await loadSynthetic());
    for (const [px, pz] of [[0, 0], [7, 19], [grid.nx - 1, grid.nz - 1]] as const) {
      const w = centerOf(grid, px, pz);
      expect(cellOf(grid, w.x, w.z)).toEqual({ px, pz });
    }
  });

  it('칸을 잘게 해도 **판정이 뒤집히지 않는다** — 통로는 통로, 블록은 블록', async () => {
    const root = await loadSynthetic();
    for (const mult of WALK_CELL_MULTIPLES) {
      const grid = bakeForTest(root, walkCellSize(DEFAULT_BODY_R) * mult);
      const at = (x: number, z: number) => {
        const c = cellOf(grid, x, z);
        return walkableAt(grid, c.px, c.pz);
      };
      expect(at(0, 0), `mult=${mult}`).toBe(true);
      expect(at(HALF, 26), `mult=${mult}`).toBe(false);
      // 그리고 **어느 해상도에서도** 블록 안쪽으로 걸어 들어가지 못한다
      const reach = reachableFrom(grid, 0, 0);
      const inside = cellOf(grid, 25, 25);
      expect(reach[inside.pz * grid.nx + inside.px], `mult=${mult}`).toBe(0);
    }
  });

  it('🔴 **절단 비율이 부팅 로그에 나온다** — 한 섬이 통째로 잘리는 것은 비율로만 보인다', async () => {
    // 팀장 조건 ①-3. 맨해튼의 1.9% 는 「거의 안 잘린다」로 읽히지만 그것은 도로망이
    // 하나로 이어진 자산의 값이다. 도로가 갈린 자산에서는 시작점이 속한 섬만 남는데,
    // 그 형태는 **자산마다 비율을 봐야** 보인다 — 근거는 `walkableCount` 주석 한 곳.
    //
    // 이 검사의 축은 「로그가 있다」가 아니라 **「로그의 수가 실제 절단 수와 같다」** 다.
    // 앞만 보면 숫자를 지어내도 통과한다.
    const root = await loadSynthetic();
    const raw = bakeRaw(root);
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    let baked: WalkGrid | null = null;
    let logged: string[] = [];
    try {
      baked = bakeWalkmapFor(root as never, 1.7, { x: 0, z: 0 });
      // ⚠ `mockRestore()` 는 **기록도 지운다** — 되돌린 뒤에 읽으면 늘 빈 배열이고,
      //    그러면 이 검사가 「로그가 없다」로 항상 빨간불이 된다(첫 판본이 그랬다).
      logged = spy.mock.calls.map((c) => String(c[0]));
    } finally {
      spy.mockRestore();
    }
    expect(baked, '격자를 못 구웠다').not.toBeNull();
    const g = baked as WalkGrid;
    const line = logged.find((t) => t.startsWith('[walkmap]'));
    expect(line, '부팅 로그에 `[walkmap]` 줄이 없다').toBeTruthy();

    const cut = walkableCount(raw) - walkableCount(g);
    expect(cut, '합성 세계에서 잘린 칸이 0 이면 아래 단언이 공허하다').toBeGreaterThan(0);
    expect(line, '로그의 절단 수가 실제와 다르다').toContain(`떼어낸 것 ${cut}`);
    expect(line, '로그에 걸을 수 있는 칸/전체가 없다').toContain(`${walkableCount(g)}/${g.nx * g.nz}`);
  });

  it('공급자의 보폭이 **몸 지름**에서 유도된다 — 기본 칸에서 2', () => {
    const grid: WalkGrid = { minX: 0, minZ: 0, cell: DEFAULT_BODY_R, nx: 4, nz: 4, walk: new Uint8Array(16).fill(1) };
    // ceil(2r / cell) = ceil(0.68 / 0.34) = 2
    expect(walkSource(grid, DEFAULT_BODY_R).stride).toBe(2);
    // 칸이 몸 지름만 하면 1 이다(더 나눌 여지가 없다)
    expect(walkSource({ ...grid, cell: 2 * DEFAULT_BODY_R }, DEFAULT_BODY_R).stride).toBe(1);
  });
});

// ── ⑤ 판정/집행 경계 — 구운 격자가 **걷기에 실제로 소비되는가** (팀장 조건 4) ──
//
// 🔴 **이 검사가 이 회차의 핵이다.** 굽는 쪽과 걷는 쪽은 서로를 모르고 `env.walkGrid`
// 하나로 이어진다. 그러므로 「격자가 옳다」와 「치비가 그 위를 걷는다」는 양쪽 단위
// 테스트 어디에도 안 걸린다 — CLAUDE.md 가 *"판정/집행 분리의 구멍"* 이라고 이름 붙인
// 자리다. 여기서는 `npcFeature.create()` 를 **실제로 돌리고** 프레임을 진행시킨다.
//
// 아바타만 스텁한다(치비 한 체가 메시 45·삼각형 24,360 이라 실물은 이 검사의 대상이
// 아니다). 스텁이 늘면 재는 것이 사라진다.
vi.mock('../frontend/js/world-glb/avatars/index.js', async () => {
  const T = await import('three/webgpu');
  const make = () => {
    const group = new T.Object3D();
    return { group, update() { /* noop */ }, dispose() { /* noop */ } };
  };
  return {
    createChibiAvatar: make,
    loadVrmAvatar: () => Promise.resolve(null),
    CHIBI: { id: 'chibi', label: 'c', kind: 'builtin', count: 4, cost: { meshes: 0, materials: 0, triangles: 0 } },
    VRM_MALE: { id: 'vrm', label: 'v', kind: 'file', count: 0, url: null, cost: null },
    MAX_TOTAL_AVATARS: 200,
  };
});

/**
 * 기능을 실제로 조립하고 프레임을 돌린다. 밟은 좌표를 전부 돌려준다.
 *
 * ⚠ `describe` **밖**에 있는 것은 ⑤ 와 ⑥ 이 함께 쓰기 때문이다 — 두 벌로 나누면
 * 「같은 배선을 재는가」가 흔들린다.
 *
 * @param onFrame 프레임 사이에 개입하는 훅. ⑥ 이 **걷는 도중에 격자를 고치는** 데 쓴다
 *                (라이브에서 미술관이 붙는 시점이 정확히 그 형태다).
 */
async function walkFrames(
  grid: WalkGrid | null, frames: number, onFrame?: (f: number) => void,
) {
    const { npcFeature } = await import('../frontend/js/world-glb/features/npc.js');
    const scene = new THREE.Scene();
    const env = {
      scene,
      player: { position: { x: 0, y: 1.7, z: 0 } },
      walkGrid: grid ? () => grid : undefined,
      cell: cellX,
    } as never;
    const inst = npcFeature.create(env);
    if (!inst) throw new Error('NPC 기능이 조립되지 않았다 — 아래 단언이 공허해진다');
    const bodies = () => {
      const out: Array<{ x: number; z: number }> = [];
      scene.traverse((o: THREE.Object3D) => {
        if (o.parent?.name === 'wg-npc') out.push({ x: o.position.x, z: o.position.z });
      });
      return out;
    };
    const seen: Array<{ x: number; z: number }> = [];
    const drift: Array<{ cellDrift: number | null; grid: { arrive: number; cell: number } }> = [];
    for (let f = 0; f < frames; f++) {
      onFrame?.(f);
      inst.system!.update({ dt: 1 / 60 } as never);
      seen.push(...bodies());
      drift.push(inst.diagnostics!() as never);
    }
    const placed = bodies().length;
    inst.dispose?.();
    return { seen, placed, drift };
}

describe('⑤ 치비가 **구운 격자 위를** 걷는다 — 벽 칸을 밟지 않는다', () => {
  it('격자를 주면 **그 격자의 걸을 수 있는 칸**만 밟는다', async () => {
    const grid = bakeForTest(await loadSynthetic());
    const { seen, placed } = await walkFrames(grid, 240);
    expect(placed, '치비가 한 체도 안 섰다 — 아래 단언이 공허하다').toBeGreaterThan(0);
    expect(seen.length).toBeGreaterThan(100);
    const bad = seen.filter((p) => {
      const c = cellOf(grid, p.x, p.z);
      return !walkableAt(grid, c.px, c.pz);
    });
    expect(
      bad.slice(0, 5),
      `치비가 벽 칸을 밟았다(${bad.length}/${seen.length} 표본) — 격자가 소비되지 않았거나 걷기가 격자를 벗어난다`,
    ).toEqual([]);
    // **화면에서 감독이 보는 것과 같은 축**: 십자 통로 밖으로는 한 번도 안 나간다.
    // 위 단언(칸 판정)은 실내를 통과시키지만 이것은 안 통과시킨다 — 두 축이 다르다.
    const off = seen.filter((p) => Math.abs(p.x) > HALF + 0.5 && Math.abs(p.z) > HALF + 0.5);
    expect(off.slice(0, 5), `치비가 통로를 벗어났다(${off.length}/${seen.length})`).toEqual([]);
  });

  it('치비가 **실제로 움직인다** — 제자리에서 돌면 위 단언이 공허하다', async () => {
    const grid = bakeForTest(await loadSynthetic());
    const { seen } = await walkFrames(grid, 240);
    const first = seen[0];
    const moved = seen.some((p) => Math.hypot(p.x - first.x, p.z - first.z) > 1);
    expect(moved, '치비가 제자리에서 돈다').toBe(true);
  });

  it('🔴 **목표 칸이 몸보다 앞서 달리지 않는다** — `arriveFor` 유도를 지키는 축', async () => {
    // ⚠ 「움직이는가」로는 **안 잡힌다**(뮤테이션 M2 실측: `arrive` 를 상수 0.35 로
    // 되돌려도 검사 18개가 전부 통과했다). 도달 판정이 칸보다 크면 몸은 결국 따라가되
    // `cell` 이 한 칸씩 앞서 달리므로, 잡히는 것은 **그 어긋남**뿐이다.
    const grid = bakeForTest(await loadSynthetic());
    const { drift } = await walkFrames(grid, 240);
    const d0 = drift[0];
    // 도달 판정이 칸에서 유도됐다(칸보다 작다) — 유도가 실제로 소비되는지 본다
    expect(d0.grid.cell).toBeCloseTo(walkCellSize(DEFAULT_BODY_R), 10);
    expect(d0.grid.arrive, '도달 판정이 칸 한 변보다 크다 — 걷기가 격자를 앞질러 간다')
      .toBeLessThan(d0.grid.cell);
    // 목표는 언제나 **이웃 칸**이다. 「한 칸 + 도달 판정」을 넘으면 앞서 달린 것이다.
    const bound = d0.grid.cell + d0.grid.arrive;
    const worst = drift.reduce((m, d) => Math.max(m, d.cellDrift ?? 0), 0);
    expect(worst, `목표 칸이 몸에서 ${worst}m 앞섰다(상한 ${bound}m)`).toBeLessThanOrEqual(bound);
  });

  it('격자를 **안 주면** 파셀 경로 그대로다 — world7·world8 이 안 바뀐다', async () => {
    const { seen, placed } = await walkFrames(null, 60);
    expect(placed).toBeGreaterThan(0);
    // 파셀 격자는 32m 칸이라 좌표가 32 의 배수 근처에 놓인다. 구운 격자(0.34m 칸,
    // 원점이 세계 bbox 모서리)와는 자릿수부터 다르다 — 「다른 격자를 탄다」의 실물 증거.
    const onParcelGrid = seen.every((p) => {
      const near = Math.min(Math.abs(p.x % cellX), cellX - Math.abs(p.x % cellX));
      return near < 2;   // 파셀 중심선에서 2m 안쪽
    });
    expect(onParcelGrid, '격자를 안 줬는데 파셀 중심선을 벗어났다').toBe(true);
  });
});

// ── ⑥ 씬에 **나중에 붙는 물건**을 격자에 반영한다 ───────────────────────────
//
// 감독 신고 2026-09-19 *"벽사이를 걸어가네"* → 감독 지시 *"벽이 있는 라인에 딱 붙게 말고
// 여백을 두면"* · *"그리고. 문은 만들어야지 / 11에 치비들어갈 문 있게 방법을 찾아보고.
// 다른 glb일때도 대응되게 해"*.
//
// 재는 것 넷: **벽은 막히고 문은 열린다** · 여백이 유도에서 온다 · 멱등 · 제자리 반영.
//
// ⚠ 여기서는 덧칠 대상을 **GLB 로 굽지 않는다.** 라이브에서 미술관은 이미 로더를 통과해
// **씬 노드**로 들어와 있고(`glb-city.ts` 의 `placeGrid` 가 세운 홀더), 이 함수가 받는
// 것도 그 노드다 — 세계 쪽(④)이 GLB 왕복을 타는 것과 재는 축이 다르다.

/** 문 높이(m). 사람 키(1.7)보다 확실히 높아야 「머리 위가 비었다」가 된다 */
const DOOR_H = 2.5;
/** 문 폭(m). 여백 두 겹(2 × bodyRadius = 0.68)을 빼고도 몸 지름이 남아야 한다 */
const DOOR_W = 1.5;
/** 건물 한 변(m) — 십자 통로(반폭 2.5m) 안에 들어가야 한다 */
const HUT = 4;
/** 건물 중심 z(m) */
const HUT_Z = 20;

/** 남쪽 면에 문이 뚫린 작은 건물. `door=false` 면 그 자리도 벽이다(대조군) */
function makeHut(door: boolean): THREE.Object3D {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial();
  const H = 3;
  const t = 0.2;
  const add = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    g.add(m);
  };
  const half = HUT / 2;
  // 동·서·북 벽
  add(t, H, HUT, -half, H / 2, HUT_Z);
  add(t, H, HUT, half, H / 2, HUT_Z);
  add(HUT, H, t, 0, H / 2, HUT_Z + half);
  // 남쪽 벽 — 문 양옆 기둥
  const side = (HUT - DOOR_W) / 2;
  add(side, H, t, -(DOOR_W + side) / 2, H / 2, HUT_Z - half);
  add(side, H, t, (DOOR_W + side) / 2, H / 2, HUT_Z - half);
  // 문 자리 — 인방만(문이 열린 경우) 또는 바닥까지 꽉 찬 벽(대조군)
  if (door) add(DOOR_W, H - DOOR_H, t, 0, (H + DOOR_H) / 2, HUT_Z - half);
  else add(DOOR_W, H, t, 0, H / 2, HUT_Z - half);
  g.updateMatrixWorld(true);
  return g;
}

describe('⑥ 씬에 나중에 붙는 물건 — 벽은 막고 **문은 연다**', () => {
  const BAND = { groundY: 0, step: 0.5, head: 1.7 };
  const MARGIN = blockMargin(DEFAULT_BODY_R);
  /** 세계 격자 + 그 안에 선 건물. 덧칠 후 가지치기까지 `main.ts` 배선과 같은 순서 */
  async function world() {
    return bakeForTest(await loadSynthetic());
  }
  const at = (g: WalkGrid, x: number, z: number) => {
    const c = cellOf(g, x, z);
    return walkableAt(g, c.px, c.pz);
  };

  it('전제 — 덧칠 **전에는** 건물 안팎이 둘 다 걸을 수 있다(아니면 아래가 공허하다)', async () => {
    const g = await world();
    expect(at(g, 0, HUT_Z), '건물 안쪽이 애초에 못 걷는 자리다').toBe(true);
    expect(at(g, 0, HUT_Z - HUT / 2 - 1), '문 앞이 애초에 못 걷는 자리다').toBe(true);
  });

  it('🔴 **벽은 막히고 문은 안 막힌다** — 두 축이 개구부를 찾아낸다', async () => {
    const g = await world();
    const b = blockMesh(g, makeHut(true) as never, BAND, MARGIN);
    // 문 한가운데(남쪽 벽면) — 머리 위가 인방까지 2.5m 라 지나간다
    expect(at(b, 0, HUT_Z - HUT / 2), '문이 막혔다').toBe(true);
    // 같은 벽면의 문 옆 기둥 — 바닥부터 막혀 있다
    expect(at(b, HUT / 2 - 0.4, HUT_Z - HUT / 2), '벽이 안 막혔다').toBe(false);
    // 동쪽 벽
    expect(at(b, HUT / 2, HUT_Z), '벽이 안 막혔다').toBe(false);
  });

  it('🔴 **문으로 들어간 자리가 바깥과 이어져 있다** — 가지치기 뒤에도 남는다', async () => {
    const g = await world();
    const b = pruneUnreachable(blockMesh(g, makeHut(true) as never, BAND, MARGIN), 0, 0);
    // `pruneUnreachable` 은 시작점(0,0)에서 **걸어서 닿는** 칸만 남긴다. 그러므로 여기
    // 남아 있다는 것이 곧 「문이 열려 있고, 들어간 치비가 나올 수도 있다」이다
    // (무향 격자라 도달 가능성이 대칭이다).
    expect(at(b, 0, HUT_Z), '문으로 들어간 안쪽이 바깥과 안 이어졌다').toBe(true);
  });

  it('🔴 **문이 없으면 안쪽이 사라진다** — 위 검사가 「그냥 안 막은 것」이 아니다', async () => {
    const g = await world();
    const b = pruneUnreachable(blockMesh(g, makeHut(false) as never, BAND, MARGIN), 0, 0);
    expect(at(b, 0, HUT_Z), '사방이 막힌 건물 안쪽이 걸을 수 있는 채로 남았다').toBe(false);
    // 건물 **밖**은 그대로다 — 덧칠이 세계를 통째로 지우지 않는다
    expect(at(b, 0, HUT_Z - HUT / 2 - 1)).toBe(true);
  });

  it('여백이 **유도에서 온다** — 몸이 굵어지면 더 막히고, 문 폭을 넘으면 닫힌다', async () => {
    const g = await world();
    const hut = makeHut(true);
    const count = (m: number) => walkableCount(blockMesh(g, hut as never, BAND, m));
    // 여백이 커질수록 단조로 더 막힌다
    expect(count(0)).toBeGreaterThan(count(MARGIN));
    expect(count(MARGIN)).toBeGreaterThan(count(2 * MARGIN));
    // 유도 자체 — 여백은 몸 반경이다(숫자를 여기 적지 않는다)
    expect(blockMargin(DEFAULT_BODY_R)).toBeCloseTo(DEFAULT_BODY_R, 10);
    // 여백 두 겹이 문 폭을 넘으면 **문이 닫힌다**: 그 경계가 실재한다는 실물
    const wide = blockMesh(g, hut as never, BAND, DOOR_W);
    expect(at(wide, 0, HUT_Z - HUT / 2), '여백이 문보다 넓은데 문이 열려 있다').toBe(false);
    // 그리고 기본 여백에서는 **닫히지 않는다** — 문 폭이 여백 두 겹보다 넓다
    expect(2 * MARGIN).toBeLessThan(DOOR_W);
  });

  it('**멱등**이다 — 같은 물건을 두 번 칠해도 격자가 같다 (팀장 조건 1)', async () => {
    const g = await world();
    const hut = makeHut(true);
    const once = blockMesh(g, hut as never, BAND, MARGIN);
    const twice = blockMesh(once, hut as never, BAND, MARGIN);
    expect(Array.from(twice.walk)).toEqual(Array.from(once.walk));
    // 입력은 안 바뀐다 — 순수 함수라는 계약
    expect(walkableCount(g)).toBeGreaterThan(walkableCount(once));
  });

  it('🔴 `blockWalkFor` 는 **제자리에 반영**한다 — 이미 나간 공급자가 그것을 본다', async () => {
    const g = await world();
    // 걷기가 부팅 때 하는 것과 **같은 순서**: 공급자를 먼저 만들고, 나중에 덧칠한다
    const src = walkSource(g, DEFAULT_BODY_R);
    const inside = cellOf(g, 0, HUT_Z);
    expect(src.standable(inside.px, inside.pz), '전제가 틀렸다 — 덧칠 전에 이미 못 걷는다').toBe(true);
    const wallCell = cellOf(g, HUT / 2, HUT_Z);
    expect(src.standable(wallCell.px, wallCell.pz)).toBe(true);

    const out = blockWalkFor(g, makeHut(true) as never, BAND.head, { x: 0, z: 0 });
    expect(out, '새 객체를 돌려줬다 — 그러면 이미 나간 공급자에 안 닿는다').toBe(g);
    // **공급자를 다시 만들지 않았는데** 벽이 보인다
    expect(src.standable(wallCell.px, wallCell.pz), '덧칠이 공급자에 안 닿았다').toBe(false);
    // 문은 그대로 열려 있고, 안쪽도 이어져 있다(재가지치기를 통과했다)
    expect(src.standable(inside.px, inside.pz)).toBe(true);
  });

  it('덧칠 뒤 **다시 가지친다** — 끊긴 구역이 남지 않는다 (팀장 조건 1)', async () => {
    const g = await world();
    const before = walkableCount(g);
    blockWalkFor(g, makeHut(false) as never, BAND.head, { x: 0, z: 0 });
    // 사방이 막힌 건물 안쪽은 **덧칠만으로는 살아남는다**(바닥 있고 머리 위 빔).
    // 가지치기가 돌아야 사라진다 — 그 차이가 이 단언이다.
    expect(at(g, 0, HUT_Z)).toBe(false);
    expect(walkableCount(g)).toBeLessThan(before);
  });
});

// ── ⑦ 격자가 **걷는 도중에** 바뀌어도 치비가 벽 안에 갇히지 않는다 ────────────
describe('⑦ 갇힘 — 덧칠이 발밑을 막아도 빠져나온다', () => {
  /** 통로를 가로질러 막는 벽. 그 구간에 있던 체는 발밑이 통행 불가가 된다 */
  function crossWall(): THREE.Object3D {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF_W, 6, 8), new THREE.MeshBasicMaterial());
    m.position.set(0, 3, 12);
    g.add(m);
    g.updateMatrixWorld(true);
    return g;
  }

  it('🔴 걷는 도중 발밑이 막혀도 **모든 체가 걸을 수 있는 칸**에 있다', async () => {
    const grid = bakeForTest(await loadSynthetic());
    let blocked = false;
    const { seen, placed } = await walkFrames(grid, 260, (f) => {
      // 60프레임쯤 걷게 둔 뒤 덧칠한다 — 라이브에서 미술관이 붙는 그 형태다
      if (f === 60 && !blocked) {
        blocked = true;
        blockWalkFor(grid, crossWall() as never, 1.7, { x: 0, z: 0 });
      }
    });
    expect(blocked, '덧칠이 한 번도 안 일어났다 — 아래가 공허하다').toBe(true);
    expect(placed, '치비가 한 체도 안 섰다').toBeGreaterThan(0);
    // **마지막 60프레임**만 본다(덧칠 직후 한두 프레임은 빠져나오는 중이다)
    const tail = seen.slice(-placed * 60);
    const stuck = tail.filter((p) => {
      const c = cellOf(grid, p.x, p.z);
      return !walkableAt(grid, c.px, c.pz);
    });
    expect(
      stuck.slice(0, 5),
      `덧칠 뒤 치비가 벽 칸에 남았다(${stuck.length}/${tail.length}) — 갇힘 처리가 안 돌았다`,
    ).toEqual([]);
  });

  it('덧칠 뒤에도 **움직인다** — 「벽 안에 서 있다」가 위 단언을 통과하지 못하게', async () => {
    const grid = bakeForTest(await loadSynthetic());
    const { seen, placed } = await walkFrames(grid, 260, (f) => {
      if (f === 60) blockWalkFor(grid, crossWall() as never, 1.7, { x: 0, z: 0 });
    });
    const tail = seen.slice(-placed * 60);
    const first = tail[0];
    expect(
      tail.some((p) => Math.hypot(p.x - first.x, p.z - first.z) > 1),
      '덧칠 뒤 치비가 제자리에서 돈다',
    ).toBe(true);
  });
});
