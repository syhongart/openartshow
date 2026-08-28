// world-glb/systems/glb-shadow-fix.ts — 내보내기가 빠뜨린 AO 데칼 상태를 **런타임에 복원**한다.
//
// ── 무엇을 고치나 (감독 신고 2026-08-27~28) ─────────────────────────────────
// *"그림자 모양은 같은데 울긋불긋하다"* → lift 로 해소 → *"그림자 형태가 8이 동그랗네"*
//
// world2 의 AO 데칼은 `SlotPool` 인스턴스이고 `ShadowDecalSystem` 이 매 배치마다 자세를
// 밀어 넣는다. 그런데 **GLB 로 내보내면 그 상태가 온전히 안 실린다.** 실측한 유실이 셋:
//
//   | 축      | world2 규칙                                  | GLB 실측                    |
//   |---------|----------------------------------------------|-----------------------------|
//   | 띄움    | 지면 + `SHADOW_LIFT`(0.02m)                   | y 고유값 `0.00/0.07/0.14`   |
//   | 크기    | `box` 는 축을 따로 (`decalTransformRect`)      | bench 264개 전부 x=z=1.000  |
//   | 실루엣  | 셀마다 `paintBlob(…, shape)` — box·foliage·round | 8칸 **바이트 동일 원형**    |
//
// 띄움은 `glb-source.ts` 가 고친다(먼저 난 신고라 그쪽에 있다). **이 파일은 나머지 둘이다.**
//
// ── 이것이 자산 문제가 아님을 확인했다 ──────────────────────────────────────
// `extract-world2-glb.mjs` 를 지금 코드로 다시 돌려 블렌더 **전** GLB 를 뽑아 현재 자산과
// 대조했다 — bench 스케일(1.000, 1종) · tree 스케일(1132종) · 데칼 y · 아틀라스가
// **전부 동일**했다. 즉 **블렌더는 무죄이고 자산을 다시 구워도 안 고쳐진다.**
// 원인은 내보내기가 데칼 런타임 상태를 안 담는 것이고, 왜 `bench`·`lamp`·`clock`·
// `fountain` 만 스케일 1.000 인지는 **아직 못 짚었다**(백로그 `G-W8Q`).
//
// ── 경계 — 팀장 판정 2026-08-28 ─────────────────────────────────────────────
// 2026-08-26 판정이 막은 것은 「GLB 메시 → 가상 파츠 슬롯 변환기」, 즉 **동적 시스템
// 재건**이다. 이 파일은 그것이 아니라 **내보내기 결손의 정적 복원**이고, 팀장이 경계를
// 다시 그었다: *"정적 결손 복원까지 허용, 슬롯·시간대 반응 등 동적 시스템 재건은 계속 금지."*
//
// 🔴 **네 번째 보정 축이 필요해지는 순간이 (나)「내보내기를 고친다」의 착수 시점이다.**
// 지금 셋(띄움·크기·실루엣)까지가 이 방식이 감당하는 범위다. 넷째가 나오면 여기에 더하지
// 말고 내보내기 경로를 고쳐 이 파일과 `glb-source.ts` 의 보정을 **전부 걷는다.**
//
// ── 값 미러링을 피한다 (팀장 조건 1) ────────────────────────────────────────
// 규칙을 여기 다시 적지 않는다. `measure`(캐스터 치수) · `decalTransformRect`(사각 자세) ·
// `paintBlob`(실루엣) · `casterProfiles`(kind→shape) · `atlasGrid`(셀 배치)를 **전부
// import** 한다. `measure` 는 이 회차에 export 로 열었고 그 이유가 그 함수 주석에 있다.

import { PARTS } from '../parts/index.js';
import {
  paintBlob, casterProfiles, SHADOW_ATLAS_PX, SHADOW_DRAW_PX,
} from '../parts/shadow.js';
import { atlasGrid, decalTransformRect } from '../decide/shadow-decal.js';
import { measure, defaultOpts } from './shadow-decal.js';
import { isShadowMaterial, SHADOW_MAT_PREFIX } from './glb-instance.js';
import type { Object3D } from 'three/webgpu';

/** three 네임스페이스 — 이 트리의 다른 파일과 같은 방식으로 주입받는다(백엔드 비의존) */
interface ThreeLike {
  CanvasTexture: new (c: unknown) => { colorSpace: unknown; needsUpdate: boolean };
  SRGBColorSpace: unknown;
}

/** 캐스터 kind → 실루엣. `casterProfiles` 가 소유하고 여기서는 읽기만 한다 */
function shapeByKind() {
  const base = PARTS.filter((p) => !p.kind.startsWith(SHADOW_MAT_PREFIX));
  const cells = casterProfiles(base);
  return { cells, byKind: new Map(cells.map((c) => [c.kind, c.shape])) };
}

/** `shadow:bench#0` → `bench` */
function casterKindOf(matName: string): string {
  return matName.slice(SHADOW_MAT_PREFIX.length).replace(/#\d+$/, '');
}

/**
 * 종류별 실루엣이 든 아틀라스를 **다시 굽는다.**
 *
 * ⚠ **셀 배치는 GLB 와 이미 맞다** — 실측으로 확인했다. `casterProfiles(PARTS)` 순서를
 * `atlasGrid` 에 넣은 좌표가 GLB 의 UV 와 1:1 로 일치한다(3×3, 예: bench = 좌·하 =
 * `px 0, py 340` ↔ UV `u[0.001..0.331] v[0.005..0.335]`). 그래서 **UV 를 안 건드리고
 * 텍스처만 갈아 끼우면 된다.**
 *
 * @returns 새 텍스처. 캔버스를 못 만들면 `null`(테스트·비브라우저 환경).
 */
export function rebakeShadowAtlas(THREE: ThreeLike): { texture: unknown; painted: number } | null {
  if (typeof document === 'undefined') return null;
  const { cells } = shapeByKind();
  if (cells.length === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = SHADOW_ATLAS_PX;
  canvas.height = SHADOW_ATLAS_PX;
  const ctx = canvas.getContext('2d');
  const scratch = document.createElement('canvas');
  scratch.width = SHADOW_DRAW_PX;
  scratch.height = SHADOW_DRAW_PX;
  const sctx = scratch.getContext('2d');
  if (!ctx || !sctx) return null;

  // ⚠ **합성 모드는 GLB 재질에 맞춘다.** glTF 의 `alphaMode: BLEND` 는 `NormalBlending`
  // 으로 오므로 굽는 쪽도 `normal` 이어야 한다 — 어긋나면 화면이 전면 검정이 되거나
  // 그림자가 통째로 사라진다(`bakeAtlas` 주석의 그 짝이다). GLB 재질은 바꿀 수 없으니
  // **굽는 쪽을 맞춘다.**
  const o = { ...defaultOpts(), res: SHADOW_DRAW_PX, blend: 'normal' as const };
  const grid = atlasGrid(cells.length, SHADOW_ATLAS_PX);
  ctx.clearRect(0, 0, SHADOW_ATLAS_PX, SHADOW_ATLAS_PX);
  for (let i = 0; i < cells.length; i++) {
    const cell = grid.cellOf(i);
    paintBlob(sctx, SHADOW_DRAW_PX, o, cells[i]!.shape);
    ctx.drawImage(scratch, 0, 0, SHADOW_DRAW_PX, SHADOW_DRAW_PX, cell.px, cell.py, cell.size, cell.size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  // 캔버스 텍스처는 반드시 sRGB 다 — 이 저장소는 이 한 줄을 빠뜨려 밴딩 사고를 냈다.
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { texture, painted: cells.length };
}

interface MeshLike {
  isMesh?: boolean;
  name?: string;
  material?: { name?: string; map?: unknown } | { name?: string; map?: unknown }[];
  geometry?: unknown;
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotation: { y: number };
  updateMatrix(): void;
}

/** 좌표를 키로 — 데칼과 캐스터는 **같은 x·z** 에 놓인다(`decalTransform` 이 그렇게 만든다) */
const key = (x: number, z: number) => `${x.toFixed(3)}|${z.toFixed(3)}`;

/**
 * `box` 실루엣 캐스터의 데칼을 **축별 반폭으로 다시 늘린다.**
 *
 * world2 규칙(`ShadowDecalSystem.poseOf`):
 * ```
 *   box  → decalTransformRect(x, z, d.rx * t.sx, d.rz * t.sz, t.ry)   축 따로
 *   그 외 → decalTransform(x, z, d.r * max(t.sx, t.sz))               한 축
 * ```
 * GLB 에는 **원형 경로 결과만** 실려 있다(bench 264개가 전부 x=z=1.000). 두 식이 같은
 * 상수 `2·BLOB_SCALE·DECAL_SCALE` 를 곱하므로, 원형 결과에 `rx/r`·`rz/r` 를 곱하면
 * 사각 결과가 된다 — **단 `t.sx === t.sz` 일 때만.** 그래서 아래에서 그 조건을 확인하고
 * 어긋나면 **건드리지 않는다**(조용히 틀리느니 원형으로 남는 편이 낫다).
 *
 * ⚠ **회전도 복원한다.** 원형은 `ry: 0` 이지만 사각은 캐스터 회전을 따라야 한다
 * (`decalTransformRect` 의 `ry`). 캐스터는 데칼과 같은 x·z 에 있으므로 좌표로 찾는다.
 *
 * ⚠⚠ **world7 안전**(팀장 조건 3): `shadow:` 재질이 없으면 아무것도 안 한다. 치수를
 * 못 구하는 kind(캐스터 메시가 GLB 에 없다)도 **건너뛴다** — 임의 GLB 에서 깨지지 않는다.
 */
export function fixBoxDecalScale(root: Object3D): { fixed: number; skipped: number } {
  const { byKind } = shapeByKind();
  // ① 캐스터를 좌표로 색인한다. 재질 이름이 `bench#0` 처럼 오므로 kind 로 자른다.
  const casters = new Map<string, MeshLike>();
  const dimsOf = new Map<string, { r: number; rx: number; rz: number } | null>();
  (root as unknown as { traverse(f: (o: MeshLike) => void): void }).traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    const nm = m?.name;
    if (!nm || nm.startsWith(SHADOW_MAT_PREFIX)) return;
    const kind = nm.replace(/#\d+$/, '');
    if (byKind.get(kind) !== 'box') return;      // 사각 캐스터만 필요하다
    casters.set(key(o.position.x, o.position.z), o);
    if (!dimsOf.has(kind)) {
      try { dimsOf.set(kind, measure({ geometry: o.geometry } as never)); }
      catch { dimsOf.set(kind, null); }
    }
  });

  let fixed = 0, skipped = 0;
  (root as unknown as { traverse(f: (o: MeshLike) => void): void }).traverse((o) => {
    if (!o.isMesh) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!isShadowMaterial(m)) return;
    const kind = casterKindOf(m!.name!);
    if (byKind.get(kind) !== 'box') return;
    const d = dimsOf.get(kind);
    if (!d) { skipped++; return; }
    // 원형 결과에서 `t.s` 를 역산한다. `sx !== sz` 면 전제가 깨지므로 손대지 않는다.
    if (Math.abs(o.scale.x - o.scale.z) > 1e-6) { skipped++; return; }
    const s = o.scale.x / (2 * d.r * SIDE_K);
    if (!Number.isFinite(s) || s <= 0) { skipped++; return; }
    const caster = casters.get(key(o.position.x, o.position.z));
    const p = decalTransformRect(o.position.x, o.position.z, d.rx * s, d.rz * s, caster ? caster.rotation.y : 0);
    o.scale.x = p.sx;
    o.scale.z = p.sz;
    o.rotation.y = p.ry;
    o.updateMatrix();
    fixed++;
  });
  return { fixed, skipped };
}

/**
 * `decalTransform` 이 반경에 곱하는 상수 — **역산에만 쓴다.**
 *
 * ⚠ 값을 여기 적지 않는다. 같은 함수에 반경 `0.5` 를 넣어 나온 변에서 **유도**한다:
 * `side = 2 · r · K` 이므로 `K = side / (2 · 0.5) = side`. 상수를 복사하면 `BLOB_SCALE`
 * 이나 `DECAL_SCALE` 이 바뀌었을 때 여기만 옛 값으로 남는다.
 */
const SIDE_K = decalTransformRect(0, 0, 0.5, 0.5, 0).sx / (2 * 0.5);

/** 아틀라스 텍스처를 모든 `shadow:` 재질에 물린다. 바꾼 재질 수를 돌려준다 */
export function applyAtlas(root: Object3D, texture: unknown): number {
  let n = 0;
  const seen = new Set<unknown>();
  (root as unknown as { traverse(f: (o: MeshLike) => void): void }).traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!isShadowMaterial(m) || seen.has(m)) continue;
      seen.add(m);
      (m as { map: unknown; needsUpdate?: boolean }).map = texture;
      (m as { map: unknown; needsUpdate?: boolean }).needsUpdate = true;
      n++;
    }
  });
  return n;
}
