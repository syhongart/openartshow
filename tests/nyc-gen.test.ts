// 뉴욕 갤러리 거리 생성기 — **명세(art-direction §2·§3·§6 · tasks.md 노드 규약)를 단언으로 옮긴 것.**
//
// 팀장 조건 1(2026-09-06): 구현이 아니라 명세에서 단언을 만든다. 첫 executor 판본(건물 박스 6 + 도로 1,
// 재질 1, 창·문·슬롯·COLOR_0 없음)은 «완료» 로 보고됐고 그 판본의 테스트는 «박스 6개 배치» 만 봤다 —
// 테스트가 구현을 따라간 형태. 여기 단언은 그 판본이면 전부 빨간불이어야 한다(뮤테이션 M-A: `facade.mjs`
// 의 holes 를 비우고 슬롯을 지우면 «개구부·슬롯·재질 수» 단언이 FAIL — 부팀장 실측, BOARD).
import { describe, it, expect } from 'vitest';
import { buildStreet } from '../scripts/asset/nyc/generate.mjs';
import { layoutBuildings, rhythmOk, galleryRoom, hexToLinear, PALETTE, DIMS } from '../scripts/asset/nyc/layout.mjs';

type Node = { name: string; mesh?: number; translation?: number[]; rotation?: number[]; extras?: Record<string, unknown>; children?: number[] };
type Json = { nodes: Node[]; meshes: { primitives: { attributes: Record<string, number>; material: number; indices: number }[] }[]; materials: { name: string; pbrMetallicRoughness: { baseColorFactor: number[] } }[]; accessors: { count: number }[] };

const built = buildStreet({ seed: 1 }) as { glb: Buffer; json: Json; summary: Record<string, number> };
const names = built.json.nodes.map((n) => n.name);
const byName = (n: string) => built.json.nodes.find((x) => x.name === n);

describe('결정성', () => {
  it('같은 seed 는 바이트 동일, 다른 seed 는 다르다(불 켜진 창 선택이 seed 를 소비한다)', () => {
    const a = buildStreet({ seed: 1 }).glb, b = buildStreet({ seed: 1 }).glb, c = buildStreet({ seed: 7 }).glb;
    expect(Buffer.compare(a, b)).toBe(0);
    expect(Buffer.compare(a, c)).not.toBe(0);
  });
});

describe('배치 판정(순수)', () => {
  const bs = layoutBuildings();
  it('6채 — 북 4 · 남 2, 층수 집합 {3,4,5}, 같은 쪽 인접 폭이 같지 않다', () => {
    expect(bs).toHaveLength(6);
    expect(bs.filter((b) => b.side === 'N')).toHaveLength(4);
    expect(new Set(bs.map((b) => b.stories))).toEqual(new Set([3, 4, 5]));
    expect(rhythmOk(bs)).toBe(true);
  });
  it('갤러리는 bld.2(아이보리 A · 12m · 5층), 비상계단은 1채만', () => {
    const g = bs.find((b) => b.gallery)!;
    expect(g.id).toBe(2); expect(g.faceMat).toBe('ivoryA'); expect(g.width).toBe(12); expect(g.stories).toBe(5);
    expect(bs.filter((b) => b.escape)).toHaveLength(1);
  });
  it('--brick=B 는 벽돌 A 만 바꾼다', () => {
    const b = layoutBuildings({ brick: 'B' });
    expect(b.filter((x) => x.faceMat === 'brickA_B')).toHaveLength(2);
    expect(b.filter((x) => x.faceMat === 'brickB')).toHaveLength(1);
  });
  it('슬롯 4 — 방 안쪽 박스 안에 있고 법선이 방 안쪽을 향한다(중심→슬롯 벡터와 법선의 내적 < 0)', () => {
    const g = bs.find((b) => b.gallery)!;
    const room = galleryRoom(g);
    const cx = (room.inner.x0 + room.inner.x1) / 2, cz = (room.inner.z0 + room.inner.z1) / 2;
    expect(room.slots).toHaveLength(4);
    for (const s of room.slots) {
      expect(s.pos[0]).toBeGreaterThanOrEqual(room.inner.x0); expect(s.pos[0]).toBeLessThanOrEqual(room.inner.x1);
      expect(s.pos[2]).toBeGreaterThanOrEqual(room.inner.z0); expect(s.pos[2]).toBeLessThanOrEqual(room.inner.z1);
      expect(s.pos[1]).toBe(DIMS.SLOT_H);
      const dot = (s.pos[0] - cx) * s.normal[0] + (s.pos[2] - cz) * s.normal[2];
      expect(dot).toBeLessThan(0);
    }
  });
});

describe('GLB — 노드 이름 규약(tasks.md)', () => {
  it('bld.1..6 · bld.<n>.door × 6 · bld.2.room.1 · slot.1..4(extras w/h) · gate.1 · ground.* 7', () => {
    for (let i = 1; i <= 6; i++) { expect(names).toContain(`bld.${i}`); expect(names).toContain(`bld.${i}.door`); }
    expect(names).toContain('bld.2.room.1');
    for (let s = 1; s <= 4; s++) {
      const n = byName(`bld.2.room.1.slot.${s}`)!;
      expect(n).toBeDefined();
      expect(typeof n.extras?.w).toBe('number'); expect(typeof n.extras?.h).toBe('number');
      expect(n.translation).toHaveLength(3);
    }
    expect(names).toContain('gate.1');
    expect(names.filter((n) => n.startsWith('ground.'))).toHaveLength(7); // 도로·보도 2·연석 2·뒷마당 2
  });
  it('문 노드는 y=0, 개구 폭 1.8(extras)', () => {
    for (let i = 1; i <= 6; i++) {
      const d = byName(`bld.${i}.door`)!;
      expect(d.translation![1]).toBe(0);
      expect(d.extras?.w).toBe(1.8);
    }
  });
});

describe('GLB — 개구부·모듈·재질·상한', () => {
  const matName = (i: number) => built.json.materials[i].name;
  const meshMats = (prefix: string) => built.json.nodes
    .filter((n) => n.name.startsWith(prefix) && n.mesh !== undefined)
    .map((n) => matName(built.json.meshes[n.mesh!].primitives[0].material));
  it('건물마다 입면·트림·금속(창틀)·유리 메시가 있다 — 창·문이 «있다» 의 증거는 유리·금속 재질의 존재다', () => {
    for (let i = 1; i <= 6; i++) {
      const mats = meshMats(`bld.${i}.`);
      expect(mats.some((m) => m.startsWith('brick') || m.startsWith('ivory'))).toBe(true);
      expect(mats.some((m) => m.endsWith('Trim'))).toBe(true);
      expect(mats).toContain('metal');
      expect(mats.some((m) => m.startsWith('glass'))).toBe(true);
    }
    // 갤러리 1층은 투명 유리(glass1), 실내 3 재질
    expect(meshMats('bld.2.')).toContain('glass1');
    for (const m of ['roomWall', 'roomFloor', 'roomCeil']) expect(meshMats('bld.2.')).toContain(m);
  });
  it('모든 메시에 COLOR_0 이 있고 VEC4 u8 정규화다(정렬 4 — stride 3 은 glTF 위반)', () => {
    const acc = (built.json as unknown as { accessors: { type: string; componentType: number; normalized?: boolean }[] }).accessors;
    for (const m of built.json.meshes) {
      const c = m.primitives[0].attributes.COLOR_0;
      expect(c).toBeDefined();
      expect(acc[c].type).toBe('VEC4'); expect(acc[c].componentType).toBe(5121); expect(acc[c].normalized).toBe(true);
    }
  });
  it('재질 색은 팔레트(linear 변환) 또는 그 −8% 트림 안에 있다, 재질 ≤ 20', () => {
    const pal = new Set<string>();
    for (const hex of Object.values(PALETTE)) { pal.add(hexToLinear(hex).map((v) => v.toFixed(4)).join(',')); pal.add(hexToLinear(hex, 0.92).map((v) => v.toFixed(4)).join(',')); }
    for (const m of built.json.materials) {
      const rgb = m.pbrMetallicRoughness.baseColorFactor.slice(0, 3).map((v) => v.toFixed(4)).join(',');
      expect(pal.has(rgb), m.name).toBe(true);
    }
    expect(built.json.materials.length).toBeLessThanOrEqual(20);
  });
  it('상한 — 삼각형 ≤ 60,000 · 노드 ≤ 2,000 · 바이트 ≤ 5MB(목표 1MB)', () => {
    expect(built.summary.triangles).toBeLessThanOrEqual(60000);
    expect(built.summary.nodes).toBeLessThanOrEqual(2000);
    expect(built.summary.bytes).toBeLessThanOrEqual(5 * 1024 * 1024);
    expect(built.summary.buildings).toBe(6);
  });
  it('--street-yaw 는 루트 노드 하나만 돌린다', () => {
    const r = buildStreet({ seed: 1, streetYaw: 25 }).json as Json;
    const rotated = r.nodes.filter((n) => n.rotation && n.name === 'street');
    expect(rotated).toHaveLength(1);
    expect(r.nodes[0].name).toBe('street');
  });
});
