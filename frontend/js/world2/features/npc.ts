// world2/features/npc.ts — 거리를 걷는 사람들(아야모).
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"일단 우리 치비 돌아다니게 해볼까? 월드 1처럼. 얼마나 무거워지는지 보자."*
//
// ── 먼저 잰 것 ───────────────────────────────────────────────────────────────
// `tests/world2-chibi-cost.test.ts` 실측 — **치비 한 체가 메시 45 · 재질 29 · 지오 45 ·
// 삼각형 24,360** 이다. 감독 실기기에서 세계 전체가 드로우콜 20 · 삼각형 42,275 였으니,
// **한 체가 세계 전체보다 드로우콜이 두 배 많다.**
//
// 그래서 이 기능은 개수 불변식과 정면으로 부딪힌다. 부딪히는 방식을 정확히 적어 둔다:
//
//   · 파셀이 사람을 만들지 않는다 → **불변식은 지켜진다.** 스트리밍이 무엇을 로드하든
//     사람 수는 그대로다. 부팅 때 N체를 만들고 세션 내내 그 N체를 재사용한다.
//   · 다만 **상수가 커진다.** N=6 이면 드로우콜이 20 → 290 대가 된다. 이건 불변식 위반이
//     아니라 예산 문제이고, 감독 기기에서 재봐야 알 수 있는 종류다.
//
// world1 도 같은 벽을 만났고 같은 답을 냈다 — `world.js:1064` 주석이 *"거리 배회
// NPC(createAvatarInstance=buildChibi 무거움). 총원 ≤6"* 이라 적고 있다. 그 상한을 계승한다.
//
// ── 왜 만들어 두고 재사용하는가 ─────────────────────────────────────────────
// world1 은 파셀 로드 시 NPC 를 만들다가 히칭을 겪었다(`world.js:1681`: *"파셀당 최대 7명을
// 한 프레임에 동시 생성하면 buildChibi(절차 지오 105회+병합)가…"*). 여기서는 **부팅 때
// 전부 만든다.** 로딩이 그만큼 길어지지만, 로딩은 기다리는 시간이고 히칭은 놀라는 시간이다.
//
// ── 보이는 범위에만 유지한다 ────────────────────────────────────────────────
// 안개가 76.8m 에서 시야를 닫으므로 그 밖의 사람은 보이지도 않으면서 비용만 낸다. 멀어진
// 사람은 플레이어 앞쪽 도로로 데려온다(`decide/npc-walk.ts` 의 `pickNearby`). 세계 전체에
// 인구를 뿌리는 것이 아니라 **보이는 범위를 채우는** 방식이라, 걸어가면 계속 사람을
// 만나면서도 비용 상한은 고정된다.

import * as THREE from 'three/webgpu';
import { buildChibi, randomChibiLook } from '../../chibi.js';
import { DEFAULT_LAYOUT } from '../parts/types.js';
import { nextDir, stepOf, pickNearby, isWalkable, type Cell } from '../decide/npc-walk.js';
import type { Dir } from '../parts/road-topology.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

/**
 * 기본 인원. world1 의 거리 배회 상한(≤6)을 계승한다.
 *
 * 이 값이 곧 드로우콜 예산이다 — 치비 한 체가 45 드로우콜이므로 6명이면 270 이다.
 * 감독 기기 실측 전까지는 이 숫자를 근거 있게 올릴 방법이 없다.
 */
export const DEFAULT_NPC_COUNT = 6;

/** 안전 상한. URL 로 아무 값이나 넣어도 여기서 잘린다 — 실수로 60을 넣으면 기기가 멎는다 */
export const MAX_NPC_COUNT = 12;

/** 걷는 속도(m/s). 플레이어(5m/s)보다 확실히 느려야 "산책하는 사람" 으로 보인다 */
const WALK_MIN = 0.8;
const WALK_MAX = 1.3;

/** 이만큼 멀어지면 앞쪽으로 데려온다(셀). 안개 끝(2.4셀)보다 넉넉히 밖이다 */
const RECYCLE_CELLS = 3.2;

/** 재배치 시 플레이어에게서 최소 이만큼 떨어뜨린다(셀) — 눈앞에 튀어나오지 않게 */
const SPAWN_RING = 1;
const SPAWN_REACH = 2;

/** 목표 도달 판정(m) */
const ARRIVE = 0.35;

interface Walker {
  readonly inst: ReturnType<typeof buildChibi>;
  /** 지금 향하는 칸 */
  cell: Cell;
  /** 그 칸으로 들어온 방향 — 왔던 길을 피하는 데 쓴다 */
  from: Dir | null;
  x: number;
  z: number;
  tx: number;
  tz: number;
  ry: number;
  speed: number;
  /** 지금 그려지는가. 안개 밖이면 끈다 */
  shown: boolean;
}

/**
 * URL 의 `?npc=` 를 읽는다. **기능이 스스로 읽는다** — 조립부가 기능별 설정을 알면
 * 기능을 빼도 그 설정 코드가 남는다.
 */
function readCount(): number {
  if (typeof location === 'undefined') return DEFAULT_NPC_COUNT;
  const raw = new URLSearchParams(location.search).get('npc');
  if (raw === null) return DEFAULT_NPC_COUNT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_NPC_COUNT;
  return Math.max(0, Math.min(MAX_NPC_COUNT, Math.floor(n)));
}

/** 결정론 난수 — 같은 시드면 같은 도시가 된다("파라미터가 곧 공간") */
function rngFrom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const npcFeature: Feature = {
  name: 'npc',

  create(env: FeatureEnv): FeatureInstance | null {
    const count = readCount();
    if (count <= 0) return null; // `?npc=0` 이면 아예 켜지 않는다 — 대조군 측정용

    const { cellX, cellZ } = DEFAULT_LAYOUT;
    const rnd = rngFrom(0x9e3779b9);
    const group = new THREE.Group();
    group.name = 'w2-npc';
    env.scene.add(group);

    const home = env.player.position;
    const hpx = Math.round(home.x / cellX);
    const hpz = Math.round(home.z / cellZ);

    const walkers: Walker[] = [];
    for (let i = 0; i < count; i++) {
      const start = pickNearby(hpx, hpz, SPAWN_RING, SPAWN_REACH, rnd, cellX, cellZ);
      if (!start) break; // 걸을 곳이 없는 세계 — 있을 수 없지만 조용히 멈춘다
      const inst = buildChibi(randomChibiLook());
      group.add(inst.group);
      const w: Walker = {
        inst,
        cell: start,
        from: null,
        x: start.px * cellX,
        z: start.pz * cellZ,
        tx: start.px * cellX,
        tz: start.pz * cellZ,
        ry: 0,
        speed: WALK_MIN + rnd() * (WALK_MAX - WALK_MIN),
        shown: true,
      };
      retarget(w);
      walkers.push(w);
    }

    /** 다음 칸을 정하고 목표 좌표를 세운다. 갈 곳이 없으면 제자리에 둔다 */
    function retarget(w: Walker) {
      const d = nextDir(w.cell.px, w.cell.pz, w.from, rnd, cellX, cellZ);
      if (!d) { w.tx = w.x; w.tz = w.z; return; }
      const s = stepOf(d);
      w.cell = { px: w.cell.px + s.px, pz: w.cell.pz + s.pz };
      w.from = d;
      w.tx = w.cell.px * cellX;
      w.tz = w.cell.pz * cellZ;
    }

    /** 플레이어 근처 도로로 데려온다. 자리를 못 찾으면 그대로 둔다(다음 프레임에 다시 본다) */
    function recycle(w: Walker, px: number, pz: number) {
      const c = pickNearby(px, pz, SPAWN_RING, SPAWN_REACH, rnd, cellX, cellZ);
      if (!c) return;
      w.cell = c;
      w.from = null;
      w.x = w.tx = c.px * cellX;
      w.z = w.tz = c.pz * cellZ;
      retarget(w);
    }

    const system = {
      name: 'npc',
      update(ctx: { dt: number }) {
        const dt = Math.min(ctx.dt, 0.1); // 탭 복귀 시 한 프레임에 순간이동하지 않게
        const p = env.player.position;
        const ppx = Math.round(p.x / cellX);
        const ppz = Math.round(p.z / cellZ);
        const far = RECYCLE_CELLS * cellX;

        for (const w of walkers) {
          // ── 멀어졌으면 앞쪽으로 ─────────────────────────────────────────
          if (Math.hypot(w.x - p.x, w.z - p.z) > far) recycle(w, ppx, ppz);

          // ── 목표로 걷는다 ───────────────────────────────────────────────
          const dx = w.tx - w.x;
          const dz = w.tz - w.z;
          const dist = Math.hypot(dx, dz);
          let moving = 0;
          if (dist > ARRIVE) {
            const step = Math.min(dist, w.speed * dt);
            w.x += (dx / dist) * step;
            w.z += (dz / dist) * step;
            // yaw=0 → -Z 관례(world1 `world.js:1752` 와 같다). 여기를 부호 하나 틀리면
            // 사람들이 전부 뒤로 걷는다.
            w.ry = Math.atan2(-dx / dist, -dz / dist);
            moving = w.speed;
          } else {
            retarget(w);
          }

          // ── 안개 밖이면 끈다 ────────────────────────────────────────────
          // `visible=false` 는 three 가 renderList 등재 **전에** 컷하므로 드로우콜이 실제로
          // 준다. 개수 불변식에는 영향이 없다 — 객체는 그대로 있고 그리지만 않는다.
          const show = Math.hypot(w.x - p.x, w.z - p.z) <= far;
          if (show !== w.shown) {
            w.shown = show;
            w.inst.group.visible = show;
          }

          if (!show) continue; // 안 보이는 사람의 애니메이션까지 돌릴 이유가 없다
          w.inst.group.position.set(w.x, 0, w.z);
          w.inst.group.rotation.y = w.ry;
          w.inst.update(dt, moving);
        }
      },
      dispose() {},
    };

    return {
      system,

      diagnostics: () => ({
        count: walkers.length,
        shown: walkers.filter((w) => w.shown).length,
        // 한 체의 실측 비용(테스트가 못 박은 값)을 곱해 보여 준다 — 화면에서 "사람이 좀
        // 늘었네" 로만 보이는 비용을 숫자로 드러내는 것이 이 항목의 목적이다.
        drawEach: 45,
        triEach: 24360,
      }),

      // 보이는 사람 수가 바뀌면 드로우콜도 바뀐다. 그것은 정당한 변화이므로 **상태를
      // 키에 넣어** 같은 상태끼리만 비교하게 한다. 안 그러면 성능 리포트가 "드로우콜이
      // 흔들린다" 고 오판한다.
      drawGroupKey: () => `n${walkers.filter((w) => w.shown).length}`,

      dispose() {
        for (const w of walkers) {
          w.inst.group.removeFromParent();
          w.inst.dispose();
        }
        walkers.length = 0;
        group.removeFromParent();
      },
    };
  },
};
