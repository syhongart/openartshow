#!/usr/bin/env node
// scripts/asset/nyc/generate.mjs — 뉴욕 갤러리 거리 **빌드 시점 산출 GLB** 생성기 (팀장 판정 「A」 조건 1).
//
//   node scripts/asset/nyc/generate.mjs [--seed=1] [--out=frontend/assets/worlds/nyc-street.glb]
//                                       [--brick=A|B] [--street-yaw=<deg>] [--cell]
//
// `--cell` 은 **격자 셀 한 장**을 굽는다(팀장 판정 2026-09-06 「C·포크」 C2). «거리 한 장» 과
// 다른 것은 **지면 판을 셀 경계에서 자르는 것 하나뿐**이다 — 건물·게이트·재질·텍스처·노드 이름은
// 전부 같다. 왜 잘라야 하는지(인접 셀 지면 겹침 = 감독 «우글우글» 의 재현)는 `layout.mjs`
// `groundPlan` 헤더 **한 곳**이다. 산출 기본 경로는 `frontend/assets/worlds/nyc-cell.glb` 이고
// world10 이 그것 하나만 받아 **모든 셀이 공유한다**(C3 «텍스처·재질 공용 1회 로드»).
//
// 결정적이다 — 같은 인자면 바이트가 같다(`tests/nyc-gen.test.ts`). seed 는 «불 켜진 상층 창» 선택에만
// 쓰인다. `--street-yaw` 는 루트 노드 하나만 돌린다 — 태양 방위 `SUN_AZ` 가 `sky.js` 에 고정이라
// 거리 축을 돌려 J2(아트 기준 판정 후보)를 비교한다. 노드 이름 규약은 `docs/nyc/tasks.md`.
//
// ⚠ **노드 이름의 구분자는 `_` 다. `.` 로 되돌리지 마라** — three 의 `GLTFLoader` 가 로드 중에
// `.` 을 **지운다**(`bld.2.room.1.light` → `bld2room1light`). 그래서 런타임이 이름으로 노드를
// 알아보는 경로가 전부 조용히 죽는다(2026-09-06 실내 점광 0 사고). 실측 표와 근거는
// `frontend/js/world-glb/decide/glb-nodes.ts` 헤더 **한 곳**이다 — 여기에 다시 적지 않는다.
//
// ⚠ 첫 판본(executor)은 건물 박스 6 + 도로 1, 재질 1, COLOR_0 stride 3(정렬 위반)이었고 보고는
// «완벽» 이었다 — 실측이 보고와 어긋난 사고(BOARD 2026-09-06). 이 판본은 부팀장이 다시 썼다.
import fs from 'node:fs';
import path from 'node:path';
import { CELL, DIMS, PALETTE, ROUGH, layoutBuildings, groundPlan, hexToLinear } from './layout.mjs';
import { box, merge } from './modules.mjs';
import { buildFacade } from './facade.mjs';
import { glbBuilder, quatY } from './glb-build.mjs';
import { brickAlbedo, brickNormal, stuccoNormal, asphaltNormal, walkNormal, textureSetFor } from './textures.mjs';

/** mulberry32 — 결정적 난수 */
function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 재질 이름 → (linear 색, 거칠기, 알파). `<face>Trim` 은 입면색 명도 −8% */
function materialSpec(name) {
  if (name.endsWith('Trim')) {
    const base = name.slice(0, -4);
    return { color: hexToLinear(PALETTE[base], 0.92), rough: base.startsWith('brick') ? ROUGH.brick : ROUGH.ivory, alpha: 1 };
  }
  const hex = PALETTE[name];
  if (!hex) throw new Error(`팔레트에 없는 재질: ${name}`);
  const rough = name.startsWith('brick') ? ROUGH.brick
    : name.startsWith('ivory') ? ROUGH.ivory
    : name === 'metal' ? ROUGH.metal
    : name.startsWith('glass') ? ROUGH.glass
    : name === 'asphalt' ? ROUGH.asphalt
    : name === 'walk' || name === 'curb' ? ROUGH.walk : ROUGH.room;
  return { color: hexToLinear(hex), rough, alpha: name === 'glass1' ? 0.35 : 1 };
}

/** 법선(방 안쪽) → 빈 노드의 −z 가 그 법선을 향하는 y 회전 */
function facingQuat(n) {
  const yaw = Math.atan2(-n[0], -n[2]);   // −z 축을 n 으로
  return quatY(yaw);
}

/** 타일 PNG 캐시 — seed 마다 한 번만 그린다(테스트가 buildStreet 를 여러 번 부른다) */
const tileCache = new Map();
function tile(key, seed, make) {
  const k = `${key}@${seed}`;
  if (!tileCache.has(k)) tileCache.set(k, make());
  return tileCache.get(k);
}

/**
 * 메모리에서 거리를 만든다. 테스트가 이 함수를 부른다(파일 I/O 없음). `textures:false` 면 색만(대조군).
 *
 * `cell:true` 면 **격자 셀 한 장**이다. «거리 한 장» 과 갈리는 것은 **지면 판을 셀 경계
 * (`CELL.ANCHOR_X ± CELL.SIZE/2` · `CELL.ANCHOR_Z ± CELL.SIZE/2`)에서 자르는 것 하나뿐**이다.
 *
 * ⚠ **좌표는 옮기지 않는다.** 루트 노드에 변환을 걸어 «셀 중심 = 원점» 으로 만드는 판본을 먼저
 * 써 봤고 두 가지가 걸렸다: ① `coplanar.mjs` 가 조상 변환을 명시적으로 거부한다(월드 좌표 복원
 * 불가) — 즉 감독 «우글우글» 회귀 게이트가 셀 GLB 에 안 돈다 ② 아트 기준 V1~V4 캡처 좌표
 * (`decide/capture-entry.ts`)가 통째로 31.7m 어긋난다. 그래서 저작 좌표를 그대로 두고, 격자
 * 원점 보정은 **런타임 한 곳**(`world10/systems/nyc-parcels.ts`)이 갖는다.
 */
export function buildStreet({ seed = 1, brick = 'A', streetYaw = 0, textures = true, cell = false } = {}) {
  const g = glbBuilder();
  const mat = (name) => {
    const s = materialSpec(name);
    const set = textures ? textureSetFor(name) : null;
    if (!set) return g.material(name, s.color, s.rough, s.alpha);
    const maps = { normalScale: set.normalScale };
    if (set.albedo) {
      // 벽돌: 색은 텍스처에 굽고 factor 는 흰색 — 줄눈이 벽돌색으로 물들지 않게(textures.mjs 헤더)
      maps.baseColor = g.texture(set.albedo, tile(set.albedo, seed, () => brickAlbedo(seed, PALETTE[name])));
    }
    const makers = { 'brick.n': brickNormal, 'stucco.n': stuccoNormal, 'asphalt.n': asphaltNormal, 'walk.n': walkNormal };
    maps.normal = g.texture(set.normal, tile(set.normal, seed, () => makers[set.normal](seed)));
    return g.material(name, set.albedo ? [1, 1, 1] : s.color, s.rough, s.alpha, maps);
  };
  const root = g.node({ name: 'street', rotation: streetYaw ? quatY((streetYaw * Math.PI) / 180) : undefined });
  const rng = rngOf(seed);

  // 지면
  const half = CELL.SIZE / 2;
  const gp = groundPlan(cell
    ? { x0: CELL.ANCHOR_X - half, x1: CELL.ANCHOR_X + half, zFar: half }
    : {});
  for (const [key, p] of Object.entries(gp)) {
    const bottom = p.bottom ?? p.top - 0.3;
    const geo = box(p.x0, bottom, p.z0, p.x1, p.top, p.z1, { ao: key.startsWith('curb') ? { pz: 0.8, nz: 0.8, default: 1 } : 1, omit: ['ny'] });
    const name = { road: 'ground_road', walkN: 'ground_walk_n', walkS: 'ground_walk_s', curbN: 'ground_curb_n', curbS: 'ground_curb_s', yardN: 'ground_yard_n', yardS: 'ground_yard_s' }[key];
    g.node({ name, mesh: g.mesh(name, geo, mat(p.mat)), parent: root });
  }

  // 건물
  const buildings = layoutBuildings({ brick });
  for (const b of buildings) {
    const bn = g.node({ name: `bld_${b.id}`, parent: root });
    const f = buildFacade(b, rng);
    for (const grp of f.groups) {
      const key = `bld_${b.id}_${grp.mat}`;
      g.node({ name: key, mesh: g.mesh(key, grp.geo, mat(grp.mat)), parent: bn });
    }
    // 문 빈 노드 — +z 가 실외를 향한다(북쪽 건물은 그대로, 남쪽은 180°)
    g.node({ name: `bld_${b.id}_door`, translation: [f.door.x, 0, f.door.z], rotation: b.dir > 0 ? undefined : quatY(Math.PI), parent: bn,
      extras: { w: DIMS.DOOR_W, h: DIMS.DOOR_H } });
    if (f.room) {
      const rn = g.node({ name: `bld_${b.id}_room_1`, parent: bn, extras: { inner: f.room.inner } });
      for (const w of ['back', 'left', 'right', 'front']) g.node({ name: `bld_${b.id}_room_1_wall_${w}`, parent: rn });
      for (const s of f.room.slots) {
        g.node({ name: `bld_${b.id}_room_1_slot_${s.id}`, translation: s.pos, rotation: facingQuat(s.normal), parent: rn,
          extras: { w: s.w, h: s.h, wall: s.wall } });
      }
      // 방 중앙 라이트 노드 — 천장 아래 0.3m
      const lx = (f.room.inner.x0 + f.room.inner.x1) / 2;
      const lz = (f.room.inner.z0 + f.room.inner.z1) / 2;
      g.node({ name: `bld_${b.id}_room_1_light`, translation: [lx, DIMS.ROOM_H - 0.3, lz], parent: rn });
    }
  }

  // 거리 끝 구조물(목적지 실루엣): 기둥 둘 + 인방
  const gx = DIMS.GATE_X, hs = DIMS.GATE_SPAN / 2, gh = DIMS.GATE_H;
  const gate = [
    { geo: box(gx, 0, -hs - 1, gx + 1.2, gh - 1, -hs + 0.2, { omit: ['ny'] }) },
    { geo: box(gx, 0, hs - 0.2, gx + 1.2, gh - 1, hs + 1, { omit: ['ny'] }) },
    { geo: box(gx - 0.2, gh - 1, -hs - 1, gx + 1.4, gh, hs + 1) },
  ];
  const gateGeo = merge(gate);
  g.node({ name: 'gate_1', mesh: g.mesh('gate_1', gateGeo, mat('ivoryB')), parent: root });

  const out = g.finish();
  out.summary.buildings = buildings.length;
  out.summary.textures = out.json.textures.length;
  return out;
}

function parseArgs(argv) {
  const o = { seed: 1, out: null, brick: 'A', streetYaw: 0, textures: true, cell: false };
  for (const a of argv) {
    const [k, v] = a.split('=');
    if (k === '--seed') o.seed = Number(v);
    else if (k === '--out') o.out = v;
    else if (k === '--brick') o.brick = v === 'B' ? 'B' : 'A';
    else if (k === '--street-yaw') o.streetYaw = Number(v);
    else if (k === '--no-tex') o.textures = false;
    else if (k === '--cell') o.cell = true;
  }
  // 기본 산출 경로는 모드가 정한다 — 셀을 `nyc-street.glb` 위에 덮어쓰면 기존 캡처·증거의
  // 기준 자산이 조용히 바뀐다(그 형태의 사고가 이 저장소에 있다).
  if (o.out === null) o.out = o.cell ? 'frontend/assets/worlds/nyc-cell.glb' : 'frontend/assets/worlds/nyc-street.glb';
  return o;
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const o = parseArgs(process.argv.slice(2));
  const { glb, summary } = buildStreet(o);
  fs.mkdirSync(path.dirname(o.out), { recursive: true });
  fs.writeFileSync(o.out, glb);
  console.log(JSON.stringify({ out: o.out, ...summary }, null, 2));
}
