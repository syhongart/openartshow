// world2 GLB 되읽기 — 편집본이 같은 세계로 돌아오는가.
//
// ── 무엇을 지키는가 ──────────────────────────────────────────────────────────
// 되읽기의 계약은 하나다: **내보낸 것을 그대로 되읽으면 같은 세계가 나온다.** 그게
// 성립해야 "편집한 것만 달라진다" 가 의미를 갖는다 — 손대지 않은 부분이 미묘하게
// 움직이면 사용자는 자기가 뭘 잘못했는지 알 수 없다.
//
// ── 왜 GLB 를 합성하는가 ─────────────────────────────────────────────────────
// 진짜 `GLTFExporter` 는 `CanvasTexture` 를 굽느라 DOM 이 필요해서 vitest 에서 못 돈다.
// 그래서 여기서는 **exporter 가 내는 것과 같은 구조를 손으로 조립**해 파서를 시험한다.
// 진짜 왕복(브라우저에서 굽고 되읽기)은 헤드리스가 따로 본다 — 이 파일이 그것을
// 대신한다고 적으면 그게 "못 잰 것을 통과로 적는" 형태다.
//
// 합성이 실제 파일과 어긋날 위험은 남는다. 그래서 구조를 상수로 박지 않고 `glb.ts` 가
// 쓰는 것과 같은 이름 규약(`comboKey`)에서 만든다.

import { describe, it, expect } from 'vitest';
import {
  parseWorldGlb, readGlbJson, parseComboName, stripDupSuffix, localMatrix, decompose, mul,
} from '../frontend/js/world2/export/import-glb.js';
import { collectWorld, comboKey, type ExportNode } from '../frontend/js/world2/export/collect.js';
import { buildOverlay } from '../frontend/js/world2/export/overlay.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { maxPartsPerParcel } from '../frontend/js/world2/parts/index.js';

const { cellX, cellZ } = DEFAULT_LAYOUT;

/** 각도 등가 비교. `atan2` 는 [-π,π] 를 내므로 3π/2 와 -π/2 는 같은 회전이다 */
function sameAngle(a: number, b: number, eps = 1e-6): boolean {
  const d = Math.abs((((a - b) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
  return Math.abs(d - Math.PI) < eps || d < eps;
}

/** Y축 회전 쿼터니언 — `glb.ts` 가 `setFromEuler(0, ry, 0)` 으로 만드는 것과 같다 */
function quatY(ry: number): [number, number, number, number] {
  return [0, Math.sin(ry / 2), 0, Math.cos(ry / 2)];
}

/**
 * `GLTFExporter` 가 내는 것과 같은 모양의 glTF JSON 을 조립한다.
 * 종류별 그룹 → 부품 노드, 재질 이름은 `kind#tone`.
 */
function synthGltf(nodes: readonly ExportNode[], opts: { useMatrix?: boolean; groupOffset?: [number, number, number] } = {}) {
  const materials: { name: string }[] = [];
  const matIndex = new Map<string, number>();
  const meshes: { primitives: { material: number }[] }[] = [];
  const meshIndex = new Map<string, number>();
  const gltfNodes: Record<string, any>[] = [];
  const groups = new Map<string, number>();

  for (const n of nodes) {
    const key = comboKey(n.kind, n.tone);
    let mi = matIndex.get(key);
    if (mi === undefined) { mi = materials.length; materials.push({ name: key }); matIndex.set(key, mi); }
    let me = meshIndex.get(key);
    if (me === undefined) { me = meshes.length; meshes.push({ primitives: [{ material: mi }] }); meshIndex.set(key, me); }

    let gi = groups.get(n.kind);
    if (gi === undefined) {
      gi = gltfNodes.length;
      const group: Record<string, any> = { name: n.kind, children: [] };
      if (opts.groupOffset) group.translation = opts.groupOffset;
      gltfNodes.push(group);
      groups.set(n.kind, gi);
    }

    const node: Record<string, any> = { mesh: me };
    if (opts.useMatrix) {
      node.matrix = localMatrix({ translation: [n.x, n.y, n.z], rotation: quatY(n.ry), scale: [n.sx, n.sy, n.sz] });
    } else {
      node.translation = [n.x, n.y, n.z];
      node.rotation = quatY(n.ry);
      node.scale = [n.sx, n.sy, n.sz];
    }
    gltfNodes[gi].children.push(gltfNodes.length);
    gltfNodes.push(node);
  }

  const rootIdx = gltfNodes.length;
  gltfNodes.push({ name: 'openartshow-world2', children: [...groups.values()] });
  return { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [rootIdx] }], nodes: gltfNodes, meshes, materials };
}

/** glTF JSON 을 GLB 컨테이너로 감싼다 (JSON 청크만 — 되읽기는 바이너리를 안 본다) */
function packGlb(gltf: unknown): ArrayBuffer {
  const json = new TextEncoder().encode(JSON.stringify(gltf));
  const pad = (4 - (json.length % 4)) % 4;
  const chunkLen = json.length + pad;
  const total = 12 + 8 + chunkLen;
  const buf = new ArrayBuffer(total);
  const dv = new DataView(buf);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, chunkLen, true);
  dv.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buf, 20).set(json);
  for (let i = 0; i < pad; i++) new Uint8Array(buf)[20 + json.length + i] = 0x20;
  return buf;
}

describe('GLB 컨테이너 판정', () => {
  it('매직이 다르면 거부한다 — 사용자가 아무 파일이나 고를 수 있다', () => {
    const buf = new ArrayBuffer(64);
    expect(() => readGlbJson(buf)).toThrow(/GLB 가 아니다/);
  });

  it('너무 짧으면 거부한다', () => {
    expect(() => readGlbJson(new ArrayBuffer(8))).toThrow(/짧다/);
  });

  it('glTF 1.0 은 거부한다', () => {
    const buf = new ArrayBuffer(32);
    const dv = new DataView(buf);
    dv.setUint32(0, 0x46546c67, true);
    dv.setUint32(4, 1, true);
    expect(() => readGlbJson(buf)).toThrow(/2\.0/);
  });
});

describe('이름 규약', () => {
  it('블렌더 중복 접미사를 벗긴다 — 복제가 편집의 기본 동작이다', () => {
    expect(stripDupSuffix('building#2.001')).toBe('building#2');
    expect(stripDupSuffix('building#2')).toBe('building#2');
    // 네 자리는 블렌더 규약이 아니다 — 사용자가 붙인 이름일 수 있으므로 건드리지 않는다.
    expect(stripDupSuffix('building#2.0001')).toBe('building#2.0001');
  });

  it('종류와 색조를 가른다', () => {
    expect(parseComboName('building#2')).toEqual({ kind: 'building', tone: 2 });
    expect(parseComboName('building#2.017')).toEqual({ kind: 'building', tone: 2 });
    expect(parseComboName('water')).toBeNull();
    expect(parseComboName('#3')).toBeNull();
    expect(parseComboName('building#x')).toBeNull();
  });
});

describe('변환 분해', () => {
  it('TRS 와 matrix 가 같은 결과를 낸다 — 블렌더는 행렬로 내보낸다', () => {
    const trs = { translation: [12, 3, -40], rotation: quatY(Math.PI / 3), scale: [2, 5, 3] };
    const a = decompose(localMatrix(trs));
    const b = decompose(localMatrix({ matrix: localMatrix(trs) }));
    expect(b.x).toBeCloseTo(a.x, 9);
    expect(b.sy).toBeCloseTo(a.sy, 9);
    expect(sameAngle(a.ry, b.ry)).toBe(true);
  });

  it('Y회전을 복원한다', () => {
    for (const ry of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 0.37]) {
      const d = decompose(localMatrix({ rotation: quatY(ry), scale: [1, 1, 1] }));
      expect(sameAngle(d.ry, ry)).toBe(true);
      expect(d.tilted).toBe(false);
    }
  });

  it('스케일을 복원한다', () => {
    const d = decompose(localMatrix({ rotation: quatY(1.1), scale: [4.5, 12, 3.25] }));
    expect(d.sx).toBeCloseTo(4.5, 9);
    expect(d.sy).toBeCloseTo(12, 9);
    expect(d.sz).toBeCloseTo(3.25, 9);
  });

  it('기울인 것을 tilted 로 잡는다 — 슬롯이 Y회전만 표현한다', () => {
    // X축 30도. 슬롯 풀의 `setTransform` 이 받을 수 없는 회전이다.
    const s = Math.sin(Math.PI / 12), c = Math.cos(Math.PI / 12);
    const d = decompose([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
    expect(d.tilted).toBe(true);
  });

  it('부모 변환을 누적한다 — 그룹째 옮기는 것이 흔한 편집이다', () => {
    const parent = localMatrix({ translation: [100, 0, -50] });
    const child = localMatrix({ translation: [5, 0, 5] });
    const d = decompose(mul(parent, child));
    expect(d.x).toBeCloseTo(105, 9);
    expect(d.z).toBeCloseTo(-45, 9);
  });
});

describe('왕복 — 내보낸 것을 되읽으면 같은 세계다', () => {
  // 전 세계(28,704개)를 합성하면 테스트가 느려지므로 앞쪽 표본을 쓴다. 종류가 골고루
  // 섞이도록 종류별로 몇 개씩 뽑는다 — 앞에서 자르면 ground·road 만 담긴다.
  const all = collectWorld().nodes;
  const perKind = new Map<string, ExportNode[]>();
  for (const n of all) {
    const list = perKind.get(n.kind) ?? [];
    if (list.length < 25) { list.push(n); perKind.set(n.kind, list); }
  }
  const sample = [...perKind.values()].flat();

  it('표본이 모든 종류를 담는다 — 한 종류만 시험하면 매핑 오류를 놓친다', () => {
    expect(perKind.size).toBeGreaterThanOrEqual(10);
    expect(sample.length).toBeGreaterThan(100);
  });

  for (const useMatrix of [false, true]) {
    it(`${useMatrix ? 'matrix' : 'TRS'} 표기로 왕복해도 값이 보존된다`, () => {
      const { nodes } = parseWorldGlb(packGlb(synthGltf(sample, { useMatrix })));
      expect(nodes.length).toBe(sample.length);

      // 순서는 계약이 아니다(그룹으로 묶이므로 종류별로 모인다). 종류+좌표로 맞춘다.
      const key = (n: ExportNode) => `${n.kind}|${n.x.toFixed(4)}|${n.y.toFixed(4)}|${n.z.toFixed(4)}`;
      const back = new Map(nodes.map((n) => [key(n), n]));
      for (const orig of sample) {
        const got = back.get(key(orig));
        expect(got, `${orig.kind} @ ${orig.x},${orig.z}`).toBeDefined();
        expect(got!.tone).toBe(orig.tone);
        expect(got!.sx).toBeCloseTo(orig.sx, 4);
        expect(got!.sy).toBeCloseTo(orig.sy, 4);
        expect(got!.sz).toBeCloseTo(orig.sz, 4);
        expect(sameAngle(got!.ry, orig.ry, 1e-4)).toBe(true);
      }
    });
  }

  it('그룹을 통째로 옮기면 그만큼 옮겨져 돌아온다', () => {
    const { nodes } = parseWorldGlb(packGlb(synthGltf(sample, { groupOffset: [10, 0, -20] })));
    const byKind = nodes.filter((n) => n.kind === sample[0].kind);
    const origFirst = sample.find((n) => n.kind === sample[0].kind)!;
    const moved = byKind.find((n) => Math.abs(n.x - (origFirst.x + 10)) < 1e-4 && Math.abs(n.z - (origFirst.z - 20)) < 1e-4);
    expect(moved).toBeDefined();
  });

  it('복제본(.001)도 같은 종류로 돌아온다', () => {
    const gltf = synthGltf(sample.slice(0, 20));
    for (const m of gltf.materials) m.name = `${m.name}.001`;
    const { nodes, warnings } = parseWorldGlb(packGlb(gltf));
    expect(nodes.length).toBe(20);
    expect(warnings.filter((w) => w.code === 'unknown-kind')).toEqual([]);
  });
});

describe('되읽기가 거르는 것', () => {
  const one = collectWorld().nodes.slice(0, 3);

  it('물판은 조용히 넘긴다 — 정상 파일에서 매번 경고가 뜨면 안 된다', () => {
    const gltf = synthGltf(one);
    gltf.materials.push({ name: 'water' });
    gltf.meshes.push({ primitives: [{ material: gltf.materials.length - 1 }] });
    gltf.nodes[gltf.nodes.length - 1].children.push(gltf.nodes.length);
    gltf.nodes.push({ mesh: gltf.meshes.length - 1, translation: [0, -1.4, 0] });
    const { nodes, warnings } = parseWorldGlb(packGlb(gltf));
    expect(nodes.length).toBe(one.length);
    expect(warnings).toEqual([]);
  });

  it('모르는 종류는 버리고 경고한다 — 남의 모델을 골랐을 때다', () => {
    const gltf = synthGltf(one);
    gltf.materials.push({ name: 'spaceship#0' });
    gltf.meshes.push({ primitives: [{ material: gltf.materials.length - 1 }] });
    gltf.nodes[gltf.nodes.length - 1].children.push(gltf.nodes.length);
    gltf.nodes.push({ mesh: gltf.meshes.length - 1, translation: [0, 0, 0] });
    const { nodes, warnings } = parseWorldGlb(packGlb(gltf));
    expect(nodes.length).toBe(one.length);
    expect(warnings.some((w) => w.code === 'unknown-kind' && w.detail.includes('spaceship'))).toBe(true);
  });

  it('우리 형식이 아닌 GLB 는 빈 결과다 — 적용 전에 호출자가 막을 수 있어야 한다', () => {
    const gltf = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ material: 0 }] }], materials: [{ name: 'Material.001' }] };
    const { nodes } = parseWorldGlb(packGlb(gltf));
    expect(nodes).toEqual([]);
  });

  it('순환 참조가 있어도 멈춘다 — 손으로 편집된 파일은 무엇이든 올 수 있다', () => {
    const gltf = {
      asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
      nodes: [{ children: [1] }, { children: [0] }], meshes: [], materials: [],
    };
    expect(() => parseWorldGlb(packGlb(gltf))).not.toThrow();
  });
});

describe('overlay — 월드 좌표를 파셀로 되돌린다', () => {
  const nodes = collectWorld().nodes;
  const overlay = buildOverlay(nodes);

  it('모든 노드가 어느 파셀엔가 담긴다', () => {
    let total = 0;
    for (let px = -20; px <= 20; px++) for (let pz = -20; pz <= 20; pz++) total += overlay.layoutFor(px, pz).length;
    expect(total).toBe(nodes.length);
  });

  it('파셀 오프셋을 다시 더하면 원래 월드 좌표다 — `fill()` 이 그렇게 더한다', () => {
    // 이 단언이 깨지면 되읽은 도시가 통째로 밀린다.
    let checked = 0;
    for (let px = -3; px <= 3; px++) {
      for (let pz = -3; pz <= 3; pz++) {
        for (const p of overlay.layoutFor(px, pz)) {
          const wx = px * cellX + p.x;
          const wz = pz * cellZ + p.z;
          const hit = nodes.some((n) => n.kind === p.kind && Math.abs(n.x - wx) < 1e-9 && Math.abs(n.z - wz) < 1e-9);
          expect(hit).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  // ── 이 검사가 두 번 뒤집혔다. 세 번째가 맞다 (실측 2026-08-25) ─────────────
  // ① 원래 «원본은 예산 안» 이었고 참이었다.
  // ② 물·격자 밖으로 반올림되는 부품을 이웃 칸으로 비키게 하면서 **거짓이 됐다** —
  //    그 이웃이 자기 몫 4개에 비켜온 4개를 더 받아 램프 peak 이 8 이 됐다. 그때
  //    나는 이것을 «파일 무손실을 산 대가» 로 적고 기대값을 8 로 고쳤다.
  // ③ **그 트레이드오프가 애초에 필요 없었다**(검수관 권고 P1). 원인은 «경계 부품은
  //    소속을 복원할 수 없다» 가 아니라 `Math.round` 가 **동점을 위로 올린다**는 것
  //    하나였다. 반 칸 경계에 선 부품은 전 격자·전 tier 에서 램프 계열뿐이고 전부
  //    `+16` 이다(`-16` 은 0개) — 동점을 아래로 보내면 **전원이 제자리로 돌아온다.**
  //
  // 그래서 지금은 ①로 되돌아왔고, 이번에는 그것이 **유도된 결과**다:
  //   원본 왕복 손실 0 · outsideGrid 0 · onWater 0 · dropped 0 · overBudget 없음.
  // 클램프·링 탐색은 남아 있지만 **원본에서는 아예 안 탄다** — 편집된 파일 전용이다.
  //
  // ⚠ 내가 ②에서 «61개 파셀 272개가 잘린다» 를 근거로 적었던 것은 그 수치 자체도
  // 틀렸다(검수관 P2): `overBudget` 은 파셀당 예산과 비교하지만 실제 잘림은 **전역
  // 슬롯 풀**이 정한다. 근거로 쓸 수 없는 수치를 판단 근거로 적었다.
  it('원본 되읽기는 예산을 넘지 않는다 — 배정이 계산 배치와 같은 칸이면 넘을 수가 없다', () => {
    expect(overlay.stats.overBudget).toEqual([]);
  });

  it('파셀에 부품을 몰아넣으면 예산 초과를 신고한다', () => {
    // 편집으로 흔히 나는 일이다 — 한 칸에 건물을 잔뜩 복제하는 것.
    const budget = maxPartsPerParcel('building', DEFAULT_LAYOUT);
    const packed: ExportNode[] = [];
    for (let i = 0; i <= budget; i++) {
      packed.push({ kind: 'building', tone: 0, x: i * 0.1, y: 0, z: 0, ry: 0, sx: 4, sy: 8, sz: 4 });
    }
    const over = buildOverlay(packed);
    expect(over.stats.overBudget).toHaveLength(1);
    expect(over.stats.overBudget[0].kind).toBe('building');
    expect(over.stats.overBudget[0].peak).toBe(budget + 1);
  });

  it('빈 파셀은 빈 배열 — 스트리밍이 그것을 정상으로 다룬다', () => {
    expect(overlay.layoutFor(999, 999)).toEqual([]);
  });
});
