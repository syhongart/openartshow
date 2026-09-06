#!/usr/bin/env node
// scripts/asset/nyc/generate.mjs — 뉴욕 갤러리 거리 **빌드 시점 산출 GLB** 생성기 (팀장 판정 「A」 조건 1).
//
//   node scripts/asset/nyc/generate.mjs [--seed=1] [--out=frontend/assets/worlds/nyc-street.glb]
//                                       [--brick=A|B] [--street-yaw=<deg>]
//
// 결정적이다 — 같은 인자면 바이트가 같다(`tests/nyc-gen.test.ts`). seed 는 «불 켜진 상층 창» 선택에만
// 쓰인다. `--street-yaw` 는 루트 노드 하나만 돌린다 — 태양 방위 `SUN_AZ` 가 `sky.js` 에 고정이라
// 거리 축을 돌려 J2(아트 기준 판정 후보)를 비교한다. 노드 이름 규약은 `docs/nyc/tasks.md`.
//
// ⚠ 첫 판본(executor)은 건물 박스 6 + 도로 1, 재질 1, COLOR_0 stride 3(정렬 위반)이었고 보고는
// «완벽» 이었다 — 실측이 보고와 어긋난 사고(BOARD 2026-09-06). 이 판본은 부팀장이 다시 썼다.
import fs from 'node:fs';
import path from 'node:path';
import { DIMS, PALETTE, ROUGH, layoutBuildings, groundPlan, hexToLinear } from './layout.mjs';
import { box } from './modules.mjs';
import { buildFacade } from './facade.mjs';
import { glbBuilder, quatY } from './glb-build.mjs';

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

/** 메모리에서 거리를 만든다. 테스트가 이 함수를 부른다(파일 I/O 없음) */
export function buildStreet({ seed = 1, brick = 'A', streetYaw = 0 } = {}) {
  const g = glbBuilder();
  const mat = (name) => { const s = materialSpec(name); return g.material(name, s.color, s.rough, s.alpha); };
  const root = g.node({ name: 'street', rotation: streetYaw ? quatY((streetYaw * Math.PI) / 180) : undefined });
  const rng = rngOf(seed);

  // 지면
  const gp = groundPlan();
  for (const [key, p] of Object.entries(gp)) {
    const bottom = p.bottom ?? p.top - 0.3;
    const geo = box(p.x0, bottom, p.z0, p.x1, p.top, p.z1, { ao: key.startsWith('curb') ? { pz: 0.8, nz: 0.8, default: 1 } : 1, omit: ['ny'] });
    const name = { road: 'ground.road', walkN: 'ground.walk.n', walkS: 'ground.walk.s', curbN: 'ground.curb.n', curbS: 'ground.curb.s', yardN: 'ground.yard.n', yardS: 'ground.yard.s' }[key];
    g.node({ name, mesh: g.mesh(name, geo, mat(p.mat)), parent: root });
  }

  // 건물
  const buildings = layoutBuildings({ brick });
  for (const b of buildings) {
    const bn = g.node({ name: `bld.${b.id}`, parent: root });
    const f = buildFacade(b, rng);
    for (const grp of f.groups) {
      const key = `bld.${b.id}.${grp.mat}`;
      g.node({ name: key, mesh: g.mesh(key, grp.geo, mat(grp.mat)), parent: bn });
    }
    // 문 빈 노드 — +z 가 실외를 향한다(북쪽 건물은 그대로, 남쪽은 180°)
    g.node({ name: `bld.${b.id}.door`, translation: [f.door.x, 0, f.door.z], rotation: b.dir > 0 ? undefined : quatY(Math.PI), parent: bn,
      extras: { w: DIMS.DOOR_W, h: DIMS.DOOR_H } });
    if (f.room) {
      const rn = g.node({ name: `bld.${b.id}.room.1`, parent: bn, extras: { inner: f.room.inner } });
      for (const w of ['back', 'left', 'right', 'front']) g.node({ name: `bld.${b.id}.room.1.wall.${w}`, parent: rn });
      for (const s of f.room.slots) {
        g.node({ name: `bld.${b.id}.room.1.slot.${s.id}`, translation: s.pos, rotation: facingQuat(s.normal), parent: rn,
          extras: { w: s.w, h: s.h, wall: s.wall } });
      }
    }
  }

  // 거리 끝 구조물(목적지 실루엣): 기둥 둘 + 인방
  const gx = DIMS.GATE_X, hs = DIMS.GATE_SPAN / 2, gh = DIMS.GATE_H;
  const gate = [
    { geo: box(gx, 0, -hs - 1, gx + 1.2, gh - 1, -hs + 0.2, { omit: ['ny'] }) },
    { geo: box(gx, 0, hs - 0.2, gx + 1.2, gh - 1, hs + 1, { omit: ['ny'] }) },
    { geo: box(gx - 0.2, gh - 1, -hs - 1, gx + 1.4, gh, hs + 1) },
  ];
  const gateGeo = gate.reduce((acc, { geo }) => ({ pos: [...acc.pos, ...geo.pos], nrm: [...acc.nrm, ...geo.nrm], col: [...acc.col, ...geo.col], idx: [...acc.idx, ...geo.idx.map((i) => i + acc.pos.length / 3)] }), { pos: [], nrm: [], col: [], idx: [] });
  g.node({ name: 'gate.1', mesh: g.mesh('gate.1', gateGeo, mat('ivoryB')), parent: root });

  const out = g.finish();
  out.summary.buildings = buildings.length;
  return out;
}

function parseArgs(argv) {
  const o = { seed: 1, out: 'frontend/assets/worlds/nyc-street.glb', brick: 'A', streetYaw: 0 };
  for (const a of argv) {
    const [k, v] = a.split('=');
    if (k === '--seed') o.seed = Number(v);
    else if (k === '--out') o.out = v;
    else if (k === '--brick') o.brick = v === 'B' ? 'B' : 'A';
    else if (k === '--street-yaw') o.streetYaw = Number(v);
  }
  return o;
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const o = parseArgs(process.argv.slice(2));
  const { glb, summary } = buildStreet(o);
  fs.mkdirSync(path.dirname(o.out), { recursive: true });
  fs.writeFileSync(o.out, glb);
  console.log(JSON.stringify({ out: o.out, ...summary }, null, 2));
}
