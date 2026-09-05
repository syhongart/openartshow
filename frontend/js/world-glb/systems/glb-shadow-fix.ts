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
import { eachPlacement, type ThreeMath } from './glb-placement.js';
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
 * GLB 에는 **원형 경로 결과만** 실려 있다(bench 264개가 전부 x=z=1.000). 그래서 사각
 * 규칙을 다시 적용한다 — **캐스터의 스케일·회전을 직접 읽어서**다. 데칼과 캐스터는 같은
 * x·z 에 놓이므로(`decalTransform` 이 `x: casterX, z: casterZ` 를 낸다) 좌표로 찾는다.
 *
 * ⚠ **역산하지 않는다**(검수관 블로커, 2026-08-28). 첫 판본은 원형 결과에서 `t.s` 를
 * 역산하며 «`sx !== sz` 면 손대지 않는다» 는 가드를 뒀는데 **그 가드가 동어반복이었다** —
 * 원형 경로는 `sx === sz` 를 항상 내므로 조건이 늘 참이다. 캐스터 스케일을 직접 쓰면
 * 전제 자체가 없어진다.
 *
 * ⚠ **회전도 복원한다.** 원형은 `ry: 0` 이지만 사각은 캐스터 회전을 따라야 한다
 * (`decalTransformRect` 의 `ry`). 캐스터는 데칼과 같은 x·z 에 있으므로 좌표로 찾는다.
 *
 * ⚠⚠ **world7 안전**(팀장 조건 3): `shadow:` 재질이 없으면 아무것도 안 한다. 치수를
 * 못 구하는 kind(캐스터 메시가 GLB 에 없다)도 **건너뛴다** — 임의 GLB 에서 깨지지 않는다.
 *
 * ⚠⚠⚠ **인스턴스 입력에서도 «하나씩» 고친다**(2026-08-28). 첫 판본은 노드 속성을 직접
 * 만졌고, 그러면 `InstancedMesh` 에서 **그 묶음의 인스턴스가 전부 같이 바뀐다** —
 * 데칼마다 크기가 다른데 한 값으로 뭉개는 것이라 조용히 틀린 모양이 나온다(실측:
 * 8,625개 중 «1개» 만 고쳐진 것으로 세어졌다). `eachPlacement` 가 낱개와 인스턴스를
 * 같은 것으로 넘겨 주므로 이 함수는 그 차이를 모른다.
 */
export function fixBoxDecalScale(
  root: Object3D, THREE: ThreeMath,
): { fixed: number; skipped: number } {
  const { byKind } = shapeByKind();
  // ① 캐스터를 좌표로 색인한다. 재질 이름이 `bench#0` 처럼 오므로 kind 로 자른다.
  // ⚠ **값을 복사한다** — `eachPlacement` 가 넘기는 객체는 재사용되므로 참조를 모아두면
  //    마지막 인스턴스의 값만 남는다(그 파일 주석의 경고 그대로다).
  const casters = new Map<string, { sx: number; sz: number; ry: number }>();
  const dimsOf = new Map<string, { r: number; rx: number; rz: number } | null>();
  eachPlacement(root as never, THREE, (p) => {
    if (!p.geometry) return;
    const nm = p.material?.name;
    if (!nm || nm.startsWith(SHADOW_MAT_PREFIX)) return;
    const kind = nm.replace(/#\d+$/, '');
    if (byKind.get(kind) !== 'box') return;      // 사각 캐스터만 필요하다
    casters.set(key(p.position.x, p.position.z), { sx: p.scale.x, sz: p.scale.z, ry: p.rotation.y });
    if (!dimsOf.has(kind)) {
      try { dimsOf.set(kind, measure({ geometry: p.geometry } as never)); }
      catch { dimsOf.set(kind, null); }
    }
  });

  let fixed = 0, skipped = 0;
  eachPlacement(root as never, THREE, (p) => {
    const m = p.material;
    if (!isShadowMaterial(m)) return;
    const kind = casterKindOf(m!.name!);
    if (byKind.get(kind) !== 'box') return;
    const d = dimsOf.get(kind);
    if (!d) { skipped++; return; }
    // ⚠ **캐스터의 스케일을 직접 읽는다** — 역산하지 않는다(검수관 블로커, 2026-08-28).
    // 첫 판본은 원형 결과에서 `t.s` 를 역산하고 `o.scale.x !== o.scale.z` 면 손대지
    // 않는다고 적었는데, **그 체크가 동어반복이었다**: `decalTransform`(원형)은 구조상
    // `sx === sz` 를 **항상** 반환하므로 조건이 입력과 무관하게 늘 참이고, 캐스터의
    // 이방성(`t.sx ≠ t.sz`)을 결코 감지하지 못한다. 검수관이 그 줄을 통째로 지우는
    // 뮤테이션으로 **12/12 그대로 통과**함을 실측했다.
    //
    // 오늘 화면이 안전했던 것은 그 체크 덕이 아니라 **`box` 프로필이 bench 하나뿐이고
    // bench 가 `sx=sy=sz=1` 로 고정**(`world2/parts/bench.ts:75`)이라 **우연히** 그랬다.
    // 캐스터를 이미 좌표로 찾고 있으므로 그 스케일을 쓰면 전제 자체가 사라진다.
    const caster = casters.get(key(p.position.x, p.position.z));
    if (!caster) { skipped++; return; }
    const t = decalTransformRect(
      p.position.x, p.position.z,
      d.rx * caster.sx, d.rz * caster.sz, caster.ry,
    );
    p.scale.x = t.sx;
    p.scale.z = t.sz;
    p.rotation.y = t.ry;
    p.commit();
    fixed++;
  });
  return { fixed, skipped };
}

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
