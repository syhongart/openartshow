// @vitest-environment jsdom
//
// 🔴 **구운 걷기 격자가 「부팅 경로를 지나」 치비에게 도달하는가.**
//
// ── 왜 이 파일이 생겼나 (부팀장 자기신고 2026-09-19 · 팀장 조건 2) ──────────
// 배포된 걷기 격자가 world11 에서 **한 번도 동작한 적이 없었다.** 격자는 `main.ts` 의
// `stream` 단계에서 구워지는데 치비 기능은 그보다 앞선 `pools` 단계에서 조립되고,
// `npc.create` 는 그 시점에 `env.walkGrid()` 를 **한 번 읽고 캐시**했다. 그 값은
// **켠 페이지에서도 언제나 `null`** 이라 걷기가 파셀 32m 격자로 떨어졌고, 치비가
// 맨해튼 건물을 관통했다(감독 신고 *"벽사이를 걸어가네"*).
//
// ⚠ **기존 검사(`world-glb-walkmap.test.ts` ④⑤)는 이것을 원리적으로 못 본다.** 그쪽은
// `npcFeature.create` 에 격자를 **직접 주입**해 돌린다 — 「격자가 소비되는가」는 보지만
// 「그 값이 **손에 들어오는가**」는 재는 축에 없다. 구현자도 검수관도 같은 사각에
// 걸렸다(검수관 승인 뒤에 결함이 살아 있었다). 그래서 이 파일은 **아무것도 쥐여 주지
// 않는다** — `startGlbWorld` 를 실제로 돌려 부팅이 스스로 격자를 만들고 스스로 넘기게 한다.
//
// ── 무엇을 스텁하는가 — **둘뿐이고, 둘 다 우리 판정이 아니다** ──────────────
//   ① `adapters/renderer.js` — 실제 GPU 컨텍스트를 만드는 유일한 자리(선례:
//      `world-glb-main-wiring.test.ts`). 여기서는 **끊지 않고** 가짜 어댑터를 돌려준다.
//   ② `avatars/index.js` — 치비 한 체가 메시 45·삼각형 24,360 이다(선례:
//      `world-glb-walkmap.test.ts` ⑤). 그룹만 있으면 이 검사의 축은 전부 성립한다.
// 그리고 jsdom 에 **없는 브라우저 API 두 개**(canvas 2D 컨텍스트 · `FileReader`)를 채운다
// — 이것은 우리 코드의 대체물이 아니라 환경 결손이다(⚠ 아래 `install2d` 주석).
//
// ── 이 파일이 **못 보는 것** ────────────────────────────────────────────────
//   · 화면. 어댑터가 가짜라 그려지는 것이 없다 — 재는 것은 좌표와 배선뿐이다
//   · 맨해튼 자산. 여기 쓰는 것은 상자 몇 개로 만든 **합성 십자 통로**다(④ 와 같은 세계)
//   · WebGPU 경로. 헤드리스의 그 한계는 이 파일도 그대로 진다
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three/webgpu';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { walkCellSize, walkableAt, cellOf, type WalkGrid } from '../frontend/js/world-glb/decide/walkable.js';
import { DEFAULT_BODY_R } from '../frontend/js/world-glb/systems/collision.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world-glb/parts/types.js';
import { SPAWN_REACH } from '../frontend/js/world-glb/features/npc.js';
import { SPAWN } from '../frontend/js/world-glb/decide/grid.js';

const { cellX } = DEFAULT_LAYOUT;

// `GLTFExporter` 의 binary(GLB) 경로가 `FileReader` 로 Blob 을 읽는다. Node 에는 없다 —
// 근거 전문은 `tests/world-glb-walkmap.test.ts` 머리 한 곳이다.
if (typeof (globalThis as { FileReader?: unknown }).FileReader === 'undefined') {
  (globalThis as { FileReader?: unknown }).FileReader = class {
    result: ArrayBuffer | null = null;
    onloadend: (() => void) | null = null;
    readAsArrayBuffer(blob: Blob): void {
      blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); });
    }
  };
}

/**
 * jsdom 에는 **canvas 2D 컨텍스트가 없다**(네이티브 `canvas` 패키지가 있어야 한다).
 * 파츠 텍스처·그림자 아틀라스가 부팅 중에 그것을 부르므로 최소 셰이프만 채운다.
 *
 * ⚠ **이것은 스텁이 아니라 환경 결손 보충이다** — 우리 판정 코드를 한 줄도 대체하지
 * 않는다. 그래서 여기서 그려진 픽셀은 **아무 단언의 근거도 아니다**(픽셀을 보는 축은
 * 이 파일에 없다). 채우지 않으면 부팅이 `pools` 단계에서 죽어 **재는 것이 0 이 된다.**
 */
function install2d(): void {
  type Proto = { prototype: Record<string, unknown> };
  const proto = (globalThis as unknown as { HTMLCanvasElement?: Proto }).HTMLCanvasElement?.prototype;
  if (!proto) return;
  const grad = { addColorStop: () => {} };
  const img = (w: number, h: number) =>
    ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h });
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(t, k: string) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'createImageData') return (w: number, h?: number) => img(w, h ?? w);
      if (k === 'getImageData') return (_x: number, _y: number, w: number, h: number) => img(w, h);
      if (k === 'measureText') return () => ({ width: 0 });
      return () => undefined;
    },
    set(t, k: string, v) { t[k] = v; return true; },
  });
  proto.getContext = function getContext(kind: string) { return kind === '2d' ? ctx : null; };
}
install2d();

// ── 🔴 **격자 묶음이 몇 번, 어떤 격자로 만들어졌는가** ──────────────────────
// `walkBinding` 은 「공급자에 딸린 파생값 한 벌」의 유일한 생산 지점이다(`decide/
// npc-grid.ts`). 그것이 **`null` 로 한 번, 그 뒤 진짜 격자로 한 번** 불렸다는 것이 곧
// 「create 는 격자를 못 받았고, 그 뒤 다시 읽어서 받았다」의 실물 증거다.
//
// ⚠ **스파이지 스텁이 아니다** — 원본을 그대로 부르고 인자만 기록한다. 동작이 바뀌면
// 이 검사가 「우리가 만든 가짜」를 재게 된다.
const bindings: Array<{ cell: number | null; grid: WalkGrid | null }> = [];
vi.mock('../frontend/js/world-glb/decide/npc-grid.js', async (orig) => {
  const real = await orig<typeof import('../frontend/js/world-glb/decide/npc-grid.js')>();
  return {
    ...real,
    walkBinding: (...args: Parameters<typeof real.walkBinding>) => {
      bindings.push({ cell: args[0] ? args[0].cell : null, grid: args[0] });
      return real.walkBinding(...args);
    },
  };
});

vi.mock('../frontend/js/world-glb/adapters/renderer.js', async () => {
  const T = await import('three/webgpu');
  return {
    createRendererAdapter: async () => ({
      backend: 'webgl', backendDetail: 'webgl-sw', backendEvidence: { why: 'test' },
      renderer: {},
      makeEnvMap: () => new T.Texture(),
      freezeShadows: () => {}, requestShadowBake: () => {},
      frameStats: () => ({ draw: 0, tri: 0, geometries: 0, textures: 0 }),
      beginFrame: () => {}, pipelineCount: () => -1,
      render: () => {}, setRenderHook: () => {},
      setPixelRatio: () => {}, getPixelRatio: () => 1,
      setSize: () => {}, dispose: () => {},
    }),
  };
});

/** 세워진 아바타 그룹. 치비의 **월드 좌표**를 부팅 밖에서 읽는 유일한 창이다 */
const avatars: THREE.Object3D[] = [];
vi.mock('../frontend/js/world-glb/avatars/index.js', async () => {
  const T = await import('three/webgpu');
  const make = () => {
    const group = new T.Object3D();
    avatars.push(group);
    return { group, update() {}, dispose() {} };
  };
  return {
    createChibiAvatar: make,
    loadVrmAvatar: () => Promise.resolve(null),
    CHIBI: { id: 'chibi', label: 'c', kind: 'builtin', count: 4, cost: { meshes: 0, materials: 0, triangles: 0 } },
    VRM_MALE: { id: 'vrm', label: 'v', kind: 'file', count: 0, url: null, cost: null },
    MAX_TOTAL_AVATARS: 200,
  };
});

// ── 합성 세계 — ④ 와 **같은 십자 통로**다 ───────────────────────────────────
/**
 * 통로 반폭(m). 치비 몸 지름(0.68m)보다 넉넉해야 이 검사가 격자 해상도를 재지 않는다.
 *
 * ── 🔴 **플레이어 스폰이 이 통로 안에 있어야 한다** (실측으로 알게 됐다) ────
 * `bakeWalkmapFor` 의 가지치기 시작점은 **플레이어가 선 자리**(`main.ts` 의
 * `player.position`, 부팅 시점엔 `decide/grid.ts` 의 `SPAWN`)다. ④⑤ 가 쓰는 반폭
 * 2.5m 로는 스폰(x=−3.5)이 **블록 안쪽**에 떨어져, 가지치기가 통로를 전부 떼어내고
 * **블록 하나의 속**만 남겼다(실측: 19,182/87,025 칸 = 블록 한 채 넓이). 검사는
 * 「치비가 건물 안을 걷는다」로 빨간불이 났고 **그 빨간불이 옳았다.**
 *
 * ⚠ ④⑤ 가 그 함정에 안 빠진 것은 그쪽이 `pruneUnreachable(g, 0, 0)` 을 **손으로**
 * 부르기 때문이다 — 부팅 경로를 지나지 않으면 「시작점이 어디인가」가 안 보인다.
 * 이 파일이 생긴 이유가 정확히 그것이다.
 *
 * 아래 `it` 들이 이 전제를 단언으로 지킨다(스폰이 옮겨지면 빨간불).
 */
const HALF = 5;
/** 세계 반폭(m) */
const HALF_W = 50;
/** 벽 높이(m). 사람 키보다 확실히 높아야 「머리 위가 막혔다」가 된다 */
const WALL_H = 10;

/** 십자 통로 하나짜리 합성 세계를 **GLB 바이트**로 굽는다 */
async function syntheticGlb(): Promise<ArrayBuffer> {
  const scene = new THREE.Scene();
  const mat = new THREE.MeshBasicMaterial();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF_W, 0.2, 2 * HALF_W), mat);
  floor.position.set(0, -0.1, 0);
  scene.add(floor);
  const side = HALF_W - HALF;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(side, WALL_H, side), mat);
      b.position.set(sx * (HALF + side / 2), WALL_H / 2, sz * (HALF + side / 2));
      scene.add(b);
    }
  }
  return new Promise((res, rej) => {
    new GLTFExporter().parse(scene, (o: unknown) => res(o as ArrayBuffer), rej, { binary: true });
  });
}

let bytes: ArrayBuffer | null = null;

type Npc = {
  grid: { arrive: number; cell: number };
  chibi: number;
  cellDrift: number | null;
  spawnReach: number;
};
type Stats = { npc?: Npc };
type Handle = { kernel: { stop(): void; tick(t: number): void }; dispose(): void };

/**
 * **부팅을 끝까지 돌린다.** 여기서 쥐여 주는 것은 GLB 바이트와 `walkmap` 플래그뿐이다 —
 * 격자는 부팅이 스스로 굽고 스스로 넘긴다(그것이 이 파일이 재는 축이다).
 *
 * @param frames 부팅 뒤 직접 돌릴 프레임 수. rAF 대신 `kernel.tick` 으로 결정론적으로 돈다
 */
async function boot(walkmap: boolean, frames = 0) {
  if (!bytes) bytes = await syntheticGlb();
  const src = bytes;
  const { startGlbWorld } = await import('../frontend/js/world-glb/main.js');
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const start = startGlbWorld as unknown as (c: unknown, o: unknown) => Promise<Handle | null>;
  const handle = await start(canvas, { tag: 'walkgrid-test', source: async () => src, walkmap });
  if (!handle) throw new Error('부팅이 실패했다 — 아래 단언이 전부 공허해진다');
  // rAF 루프를 멈추고 직접 돈다. 프레임 수가 환경 속도에 좌우되면 이 검사가 매번 다른
  // 것을 재게 된다.
  handle.kernel.stop();
  const hook = (window as unknown as { __glbWorld?: { stats(): Stats } }).__glbWorld;
  const seen: Array<{ x: number; z: number }> = [];
  /** 프레임마다의 `npc` 진단. `cellDrift` 는 **몸과 목표 칸의 어긋남**을 보는 유일한 창이다 */
  const diag: Npc[] = [];
  for (let f = 1; f <= frames; f++) {
    handle.kernel.tick(f * (1000 / 60));
    for (const a of avatars) seen.push({ x: a.position.x, z: a.position.z });
    const d = hook?.stats().npc;
    if (d) diag.push(d);
  }
  const stats = hook ? hook.stats() : null;
  const placed = avatars.length;
  handle.dispose();
  canvas.remove();
  return { stats, seen, placed, diag };
}

describe('🔴 구운 격자가 **부팅 경로를 지나** 치비에게 도달한다', () => {
  beforeEach(() => { bindings.length = 0; avatars.length = 0; });

  it('전제 — 조립(`create`) 시점의 `walkGrid()` 는 **`null` 이다**', async () => {
    await boot(true, 5);
    expect(bindings.length, '걷기 묶음이 한 번도 안 만들어졌다 — 아래가 전부 공허하다')
      .toBeGreaterThan(0);
    // 🔴 이 한 줄이 이 회차 결함의 **구조**다: 조립은 `pools` 단계이고 격자는 `stream`
    // 단계에서 생긴다. 그러므로 첫 묶음은 언제나 격자 없이 만들어진다.
    expect(bindings[0].cell, '조립 시점에 격자가 이미 있었다 — 이 검사의 전제가 바뀌었다')
      .toBeNull();
  });

  it('🔴 조립 **뒤에** 구운 격자로 다시 묶인다 — 늦게 읽는 계약', async () => {
    await boot(true, 5);
    const baked = bindings.filter((b) => b.cell !== null);
    expect(
      baked.length,
      `격자로 다시 묶인 적이 없다(묶음 ${bindings.length}회, 전부 격자 없음) — `
      + '`npc.update` 가 `env.walkGrid()` 를 다시 읽지 않는다',
    ).toBeGreaterThan(0);
    expect(baked[0].cell).toBeCloseTo(walkCellSize(DEFAULT_BODY_R), 10);
  });

  it('🔴 걷기가 **구운 칸**을 쓴다 — 진단이 파셀 32m 가 아니라 0.34m 를 낸다', async () => {
    const { stats } = await boot(true, 5);
    expect(stats?.npc, '`npc` 진단이 없다 — 기능이 조립되지 않았다').toBeDefined();
    expect(stats!.npc!.grid.cell, '걷기가 여전히 파셀 격자다 — 구운 격자가 도달하지 않았다')
      .toBeCloseTo(walkCellSize(DEFAULT_BODY_R), 10);
    // 도달 판정도 그 칸에서 유도된 값이어야 한다(한쪽만 갈리면 목표가 몸보다 앞선다)
    expect(stats!.npc!.grid.arrive).toBeLessThan(stats!.npc!.grid.cell);
  });

  it('🔴 치비가 **십자 통로를 벗어나지 않는다** — 감독이 화면에서 보는 그 축', async () => {
    // 전제 — 스폰이 통로 안이어야 가지치기가 통로를 남긴다(위 `HALF` 주석의 실측).
    expect(
      Math.min(Math.abs(SPAWN.x), Math.abs(SPAWN.z)),
      '플레이어 스폰이 합성 통로 밖이다 — 가지치기가 통로를 떼어내 이 검사가 뒤집힌다',
    ).toBeLessThan(HALF);
    const { seen, placed } = await boot(true, 240);
    expect(placed, '치비가 한 체도 안 섰다 — 아래 단언이 공허하다').toBeGreaterThan(0);
    expect(seen.length).toBeGreaterThan(100);
    // 파셀 격자를 타면 사람들이 32m 배수 칸(예: 32,32)으로 걸어간다 — 블록 **안쪽**이다.
    const off = seen.filter((p) => Math.abs(p.x) > HALF + 0.5 && Math.abs(p.z) > HALF + 0.5);
    expect(
      off.slice(0, 5),
      `치비가 통로 밖(=건물 안)으로 나갔다(${off.length}/${seen.length} 표본)`,
    ).toEqual([]);
  });

  it('🔴 치비가 밟은 자리가 전부 **구운 격자의 걸을 수 있는 칸**이다', async () => {
    // ⑤ 와 같은 축이지만 격자를 **손에 쥐여 주지 않는다** — 여기 쓰는 격자는 부팅이
    // 스스로 구워 걷기에 넘긴 바로 그 객체다(스파이가 인자를 그대로 잡는다).
    const { seen } = await boot(true, 240);
    const grid = bindings.map((b) => b.grid).filter((g): g is WalkGrid => g !== null)[0];
    expect(grid, '부팅이 걷기에 격자를 한 번도 안 넘겼다 — 아래가 공허하다').toBeDefined();
    const bad = seen.filter((p) => {
      const c = cellOf(grid, p.x, p.z);
      return !walkableAt(grid, c.px, c.pz);
    });
    expect(
      bad.slice(0, 5),
      `치비가 벽 칸을 밟았다(${bad.length}/${seen.length} 표본)`,
    ).toEqual([]);
  });

  it('🔴 공급자가 갈린 **첫 프레임부터** 몸과 목표 칸이 안 어긋난다', async () => {
    // 🔴 **이것이 「재착석(`reseat`)」을 보는 축이다.** 공급자가 갈리면 `w.cell` 은 옛
    // 좌표계의 칸 인덱스이고 `w.tx`/`w.tz` 는 옛 목표다. 몸만 두 공급자에서 같은 뜻을
    // 갖는다 — 칸을 다시 읽지 않으면 목표 칸이 세계 반대편(격자 원점 근처)에 남고,
    // 치비는 그쪽으로 **벽을 뚫고** 직선으로 걸어간다.
    //
    // ⚠ 「밟은 자리가 walkable 인가」로는 **놓칠 수 있다** — 옛 목표로 가는 직선이
    // 우연히 통로 안이면 통과한다. 어긋남은 그 우연과 무관하게 즉시 보인다.
    const { diag } = await boot(true, 240);
    expect(diag.length, '진단을 한 프레임도 못 읽었다 — 아래가 공허하다').toBeGreaterThan(0);
    const bound = diag[0].grid.cell + diag[0].grid.arrive;
    const worst = diag.reduce((m, d) => Math.max(m, d.cellDrift ?? 0), 0);
    expect(worst, `목표 칸이 몸에서 ${worst}m 떨어졌다(상한 ${bound}m) — 공급자 교체 뒤 칸을 다시 안 읽었다`)
      .toBeLessThanOrEqual(bound);
  });

  it('🔴 스폰 밴드도 **새 공급자 단위로** 환산된다 — 미터로 재면 같은 거리다', async () => {
    // 공급자가 갈리면 「칸」의 뜻이 32m 에서 0.34m 로 바뀐다. 밴드는 **안개에서 유도한
    // 미터 거리**이므로(`SPAWN_REACH`), 칸 수는 바뀌어도 **미터는 보존돼야 한다.**
    // 환산을 빠뜨리면 밴드가 100배 좁아지고, 증상은 「재배치된 사람이 눈앞에 튀어나온다」
    // 라서 원인에서 멀다. ⚠ 이 축은 `walkBinding` 밖(집행부의 `rebind`)에 있어서
    // **따로 보지 않으면 아무 검사에도 안 걸린다**(뮤테이션 M-E 로 실증했다).
    const { stats } = await boot(true, 5);
    const npc = stats!.npc!;
    const meters = npc.spawnReach * npc.grid.cell;
    // 인원이 많으면 `reachForIn` 이 넓힌다 — 그러므로 하한만 본다. 반올림 한 칸 여유.
    expect(
      meters,
      `스폰 밴드가 ${meters.toFixed(2)}m 다 — 파셀 기준 ${(SPAWN_REACH * cellX).toFixed(2)}m 에서 환산이 빠졌다`,
    ).toBeGreaterThanOrEqual(SPAWN_REACH * cellX - npc.grid.cell);
  });

  it('치비가 **실제로 움직인다** — 제자리에 굳으면 위 단언이 공허하다', async () => {
    const { seen } = await boot(true, 240);
    const first = seen[0];
    const moved = seen.some((p) => Math.hypot(p.x - first.x, p.z - first.z) > 1);
    expect(moved, '치비가 제자리에서 돈다 — 재배치가 걷기를 대신하고 있다').toBe(true);
  });

  it('`walkmap` 을 안 켜면 **파셀 격자 그대로다** — world7·world8 이 안 바뀐다', async () => {
    const { stats } = await boot(false, 5);
    expect(stats!.npc!.grid.cell, '격자를 안 굽는 페이지의 걷기가 바뀌었다').toBeCloseTo(cellX, 10);
    expect(bindings.every((b) => b.cell === null), '격자가 없는데 묶음이 격자로 갈렸다').toBe(true);
    // 🔴 **한 번만** 묶인다. 「참조 동일성 비교」가 매 프레임 재계산으로 새면 여기서 잡힌다
    // (팀장 조건 1 — 매 프레임 파생값 재계산 금지).
    expect(bindings.length, `격자가 없는데 묶음이 ${bindings.length}회 만들어졌다`).toBe(1);
  });

  it('🔴 격자가 있어도 묶음은 **딱 두 번**이다 — 매 프레임 재계산이 아니다', async () => {
    await boot(true, 240);
    expect(
      bindings.length,
      `240프레임에 묶음이 ${bindings.length}회 — 참조 동일성 비교가 아니라 매 프레임 재계산이다`,
    ).toBe(2);
  });
});
