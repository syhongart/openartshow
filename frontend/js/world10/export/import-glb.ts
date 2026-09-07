// world-glb/export/import-glb.ts — **편집된 GLB 를 배치 목록으로 되돌린다. 순수 함수만, three import 0.**
//
// ── 감독 요청 2026-08-06 ─────────────────────────────────────────────────────
// *"이거 월드2를 내보낸 후 편집해서 다시 적용하는거 가능한거여?"* → 하기로 확정.
//
// ── 지오메트리를 읽지 않는다. 그게 이 파일의 요점이다 ────────────────────────
// GLB 는 헤더 + JSON 청크 + 바이너리 청크다. 되읽기에 필요한 것은 **JSON 청크뿐**이다 —
// 어느 자리에 어떤 종류가 어떤 크기로 서 있는지가 전부 거기 있다. 바이너리(정점·인덱스·
// 텍스처)는 우리가 쓰지 않는다: world2 는 자기 파츠 지오메트리를 이미 갖고 있고, 노드가
// 참조하는 것은 "종류 이름" 이지 삼각형이 아니다.
//
// 그래서 `GLTFLoader` 를 쓰지 않는다. 쓰면 125만 삼각형과 텍스처 5장을 전부 GPU 로 올린
// 뒤 버리게 되고, 빌드 혼합 지점도 하나 더 생긴다(`GLTFExporter` 와 달리 로더는 **남의
// 빌드 객체를 씬에 남긴다** — `tests/world2-boundary.test.ts` 의 `glb-city.ts` 항목이
// 그것 때문에 #120 으로 열려 있다). JSON 파싱은 그 둘 다 피한다.
//
// ── 무엇을 근거로 종류를 아는가 — **재질 이름이다** ──────────────────────────
// 내보낼 때 재질에 `building#2` 처럼 `종류#색조` 를 박아 둔다(`glb.ts` 의 `buildMaterials`).
// 그룹 이름(`building`)도 있지만 그쪽에 기대지 않는다:
//
//   · 블렌더에서 오브젝트를 다른 컬렉션으로 옮기면 **부모가 바뀐다**. 재질은 안 바뀐다.
//   · 복제하면 이름에 `.001` 이 붙는데, 오브젝트 이름은 사용자가 자주 갈아치우고
//     재질 이름은 그대로 두는 편이다.
//
// 그래서 판정은 재질로 하고, 그룹은 참고만 한다. `.001` 접미사는 양쪽 다 벗긴다.
//
// ── 블렌더가 되돌려 주는 파일은 우리가 낸 것과 같지 않다 ────────────────────
// 같은 정보를 다르게 적어 온다. 셋 다 받아야 한다:
//   ① 변환이 `matrix`(4×4) 로 올 수 있다 — 우리는 `trs` 로 냈지만 블렌더는 행렬을 쓴다
//   ② **그룹(Empty)에 변환이 걸릴 수 있다.** 사용자가 "나무 전체를 5m 옮기기" 를 하면
//      부모에 이동이 생긴다 → 자식 좌표에 누적해야 한다
//   ③ 계층 깊이가 달라질 수 있다 — 컬렉션을 만들면 한 겹 더 생긴다. 그래서 **재귀**다

import { ALL_KINDS } from '../parts/index.js';
import { tonesFor } from '../parts/index.js';
import type { ExportNode } from './collect.js';

/** 되읽기 중 만난 문제. 던지지 않고 모아서 돌려준다 — 한 건 때문에 전체가 죽으면 안 된다 */
export interface ImportWarning {
  code: 'unknown-kind' | 'no-material' | 'tilted' | 'bad-node';
  detail: string;
  count: number;
}

export interface ImportResult {
  nodes: ExportNode[];
  warnings: ImportWarning[];
}

/** GLB 컨테이너에서 JSON 청크만 꺼낸다. 바이너리 청크는 건너뛴다 */
export function readGlbJson(buf: ArrayBuffer): Record<string, any> {
  if (buf.byteLength < 20) throw new Error('GLB 가 아니다 — 파일이 너무 짧다');
  const dv = new DataView(buf);
  // 'glTF' 리틀엔디언. 확장자만 믿지 않는다 — 사용자가 아무 파일이나 고를 수 있다.
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('GLB 가 아니다 — 매직이 다르다');
  const version = dv.getUint32(4, true);
  if (version !== 2) throw new Error(`glTF 2.0 만 읽는다 — 이 파일은 ${version}`);
  const chunkLen = dv.getUint32(12, true);
  const chunkType = dv.getUint32(16, true);
  if (chunkType !== 0x4e4f534a) throw new Error('첫 청크가 JSON 이 아니다');
  const text = new TextDecoder().decode(new Uint8Array(buf, 20, chunkLen));
  return JSON.parse(text);
}

/**
 * 블렌더가 붙이는 중복 접미사를 벗긴다 — `building#2.001` → `building#2`.
 *
 * 복제할 때마다 `.001`·`.002` 가 붙는데, 그것을 안 벗기면 **복제한 건물이 전부 "모르는
 * 종류" 로 떨어진다.** 편집의 가장 흔한 형태가 복제라 이 한 줄이 없으면 기능이 사실상
 * 동작하지 않는다.
 */
export function stripDupSuffix(name: string): string {
  return name.replace(/\.\d{3}$/, '');
}

/** `building#2` → `{ kind: 'building', tone: 2 }`. 형식이 아니면 null */
export function parseComboName(name: string): { kind: string; tone: number } | null {
  const clean = stripDupSuffix(name);
  const at = clean.lastIndexOf('#');
  if (at <= 0) return null;
  const kind = clean.slice(0, at);
  const tone = Number(clean.slice(at + 1));
  if (!Number.isInteger(tone) || tone < 0) return null;
  return { kind, tone };
}

/** 열우선 4×4. glTF `matrix` 와 같은 배치다 */
type Mat4 = number[];

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** a × b (열우선). 부모 변환을 자식에 누적할 때 쓴다 */
export function mul(a: Mat4, b: Mat4): Mat4 {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = s;
    }
  }
  return out;
}

/** 노드의 지역 변환. `matrix` 가 있으면 그것이 이기고(glTF 규약), 없으면 TRS 를 합성한다 */
export function localMatrix(node: Record<string, any>): Mat4 {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return node.matrix.slice();
  const t = node.translation ?? [0, 0, 0];
  const q = node.rotation ?? [0, 0, 0, 1];
  const s = node.scale ?? [1, 1, 1];
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

/**
 * 4×4 를 위치·Y회전·스케일로 분해한다.
 *
 * ── 왜 Y회전만인가 (한계를 여기 적는다) ─────────────────────────────────────
 * 슬롯 풀의 `setTransform` 이 받는 것이 `(x,y,z, ry, sx,sy,sz)` 다 — **Y축 회전 하나**뿐.
 * 인스턴스 행렬을 그렇게 합성하기로 한 것이 world2 의 기존 결정이고(`systems/instancing.ts`),
 * 되읽기 때문에 그것을 넓히지 않는다. 그러면 인스턴스 버퍼 레이아웃이 바뀐다.
 *
 * 그래서 블렌더에서 건물을 **기울이면 그 기울기는 버려진다.** 조용히 버리지 않고
 * `tilted` 경고로 센다 — 화면에서 "옮긴 건 됐는데 기울인 건 안 됐다" 로 보이면 원인을
 * 짐작하기 어렵다.
 *
 * 기울어졌는지는 **Y basis 로 판정한다.** 순수 Y회전이면 Y basis 가 정확히 위를 가리키고
 * (0, sy, 0), 다른 축 회전이 섞이면 눕는다. 스케일이 섞여 있어도 방향은 남으므로
 * 정규화해서 본다.
 */
export function decompose(m: Mat4): { x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number; tilted: boolean } {
  const len = (a: number, b: number, c: number) => Math.hypot(a, b, c);
  const sx = len(m[0], m[1], m[2]);
  const sy = len(m[4], m[5], m[6]);
  const sz = len(m[8], m[9], m[10]);
  // Y basis 가 위를 향하지 않으면 Y축 외 회전이 섞인 것이다. 1도(cos≈0.99985)까지 봐준다 —
  // 블렌더 왕복에서 부동소수 오차로 완전히 0 이 되지는 않는다.
  const upDot = sy > 1e-9 ? m[5] / sy : 1;
  const tilted = upDot < 0.99985;
  // 열우선에서 X basis 의 z 성분이 `-sin`, x 성분이 `cos` 이다(`makeRotationY` 참조).
  const ry = Math.atan2(-m[2], m[0]);
  return { x: m[12], y: m[13], z: m[14], ry, sx, sy, sz, tilted };
}

/**
 * 편집된 GLB 를 배치 목록으로 되돌린다.
 *
 * 계층을 재귀로 훑으며 부모 변환을 누적한다 — 사용자가 그룹째 옮겼을 수도, 컬렉션을
 * 만들어 한 겹 더 넣었을 수도 있다. 우리가 낸 파일의 모양에 기대지 않는 이유다.
 */
export function parseWorldGlb(buf: ArrayBuffer): ImportResult {
  const g = readGlbJson(buf);
  const nodes: ExportNode[] = [];
  const known = new Set<string>(ALL_KINDS);
  const warn = new Map<string, ImportWarning>();
  const bump = (code: ImportWarning['code'], detail: string) => {
    const key = `${code}|${detail}`;
    const found = warn.get(key);
    if (found) found.count++;
    else warn.set(key, { code, detail, count: 1 });
  };

  const gltfNodes: Record<string, any>[] = g.nodes ?? [];
  const gltfMeshes: Record<string, any>[] = g.meshes ?? [];
  const gltfMaterials: Record<string, any>[] = g.materials ?? [];

  /** 이 메시가 쓰는 재질 이름. 프리미티브가 여럿이면 첫 번째로 판단한다 */
  const materialNameOf = (meshIndex: number): string | null => {
    const mesh = gltfMeshes[meshIndex];
    const prim = mesh?.primitives?.[0];
    if (!prim || prim.material === undefined) return null;
    return gltfMaterials[prim.material]?.name ?? null;
  };

  // 방문 표시 — glTF 는 노드 그래프라 원칙적으로 한 노드가 여러 부모를 가질 수 없지만,
  // 손으로 편집된 파일이 순환을 만들면 여기서 무한 재귀가 난다.
  const seen = new Set<number>();

  const walk = (index: number, parent: Mat4): void => {
    if (seen.has(index)) return;
    seen.add(index);
    const node = gltfNodes[index];
    if (!node) { bump('bad-node', `노드 ${index} 가 없다`); return; }

    const world = mul(parent, localMatrix(node));

    if (node.mesh !== undefined) {
      const matName = materialNameOf(node.mesh);
      if (!matName) {
        bump('no-material', `이름 있는 재질이 없는 메시 노드(${node.name ?? index})`);
      } else {
        const combo = parseComboName(matName);
        if (!combo) {
          // 물판은 재질 이름이 `water` 라 여기로 온다. 파츠가 아니므로 조용히 넘긴다 —
          // 경고로 세면 정상 파일에서도 매번 경고가 뜬다.
          if (stripDupSuffix(matName) !== 'water') bump('unknown-kind', `재질 이름 형식이 아니다: ${matName}`);
        } else if (!known.has(combo.kind)) {
          bump('unknown-kind', `모르는 종류: ${combo.kind}`);
        } else {
          const d = decompose(world);
          if (d.tilted) bump('tilted', `Y축 외 회전은 버린다: ${combo.kind}`);
          const palette = tonesFor(combo.kind);
          nodes.push({
            kind: combo.kind,
            tone: palette.length ? combo.tone % palette.length : 0,
            x: d.x, y: d.y, z: d.z, ry: d.ry, sx: d.sx, sy: d.sy, sz: d.sz,
          });
        }
      }
    }

    for (const child of node.children ?? []) walk(child, world);
  };

  // 씬이 여럿일 수 있다. 기본 씬만 본다 — 블렌더가 여러 씬을 내보내면 사용자가 어느
  // 것을 의도했는지 알 방법이 없고, 전부 합치면 도시가 겹쳐 나온다.
  const scene = g.scenes?.[g.scene ?? 0];
  for (const root of scene?.nodes ?? []) walk(root, IDENTITY);

  return { nodes, warnings: [...warn.values()] };
}
