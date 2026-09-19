// world-glb/systems/glb-walkmap.ts — **GLB 에서 걸을 수 있는 격자를 굽는다.**
//
// ── 감독 요구 (2026-09-19) ───────────────────────────────────────────────────
// *"우리 치비들이 건물. 길. 벽.을 인식해서 다닐수 있개 하는 것은 무겁나"* ·
// *"**맨하탄이 홍콩이 될수도** 있고. **매번 치비를 수정하지 않아도 자동으로** 다니게."*
//
// 충돌(`glb-collider.ts`)과 지도(`glb-minimap.ts`)는 이미 자동이었다. **치비의 길만
// 아니었다** — `decide/npc-walk.ts` 가 파셀 도로 격자를 따라가는데 GLB 세계에는 그
// 격자가 없다. 그래서 세계에서 격자를 **굽는다.**
//
// 판정은 전부 `decide/walkable.ts` 에 있다. 여기는 **씬을 훑어 두 값을 모으는 일**만
// 한다 — 재질 이름도 노드 이름도 보지 않는다(그 사실을 `tests/world-glb-walkmap.test.ts`
// ⓐ 가 소스 문자열 검사로 못 박는다).
//
// ── 🔴 왜 **삼각형**을 걷는가 — 바운딩 박스로는 성립하지 않는다 (실측 2026-09-19) ──
// 첫 판본은 `glb-minimap.ts` 와 같은 형태로 **메시 바운딩 박스**를 래스터화했다. 이
// 자산에서 그것은 **무너진다**:
//
//     Expanded_street_grid_concrete   bbox 180×180m  (세계 전체)
//     Expanded_street_grid_metal      bbox 116×61m   y[-0.03, 0.93]
//     Urban_furniture_concrete        bbox 109×61m   y[ 0.20, 0.72]
//
// 블렌더가 같은 재질을 **하나로 병합**해 내보내므로 메시 하나의 bbox 가 도시 절반을
// 덮는다. `metal` 하나가 「턱보다 높다」로 판정되면 **116×61m 가 통째로 막힌 칸**이 된다.
// 실측: bbox 래스터의 walkable 이 어떤 해상도에서도 **0.0%** 였다.
//
// 삼각형이면 그 병합이 무해하다 — 맨홀 뚜껑 하나는 맨홀 뚜껑 크기의 삼각형이다.
//
// ── 비용 (node 실측, `manhattan-180m.glb` · 메시 21,286 · 삼각형 1,322,096) ──
//
// **이 파일과 `decide/walkable.ts` 를 그대로 돌려 잰 값**이다(알고리즘을 다시 적어
// 재면 그 재현이 곧 미러링이고, 이 저장소는 그 형태로 이미 세 번 데였다).
//
//   `?walkcell=`  칸(m)   격자        굽기ms  가지치기ms  걸을 수 있는 칸(가지치기 후)
//      ×0.5       0.170  1059×1059     173        22          1,014,044  (90.4%)
//      ×1         0.340   530×530      131         7            250,486  (89.2%)   ← 기본
//      ×1.5       0.510   353×353      119         2            109,714  (88.0%)
//      ×2         0.680   265×265      120         1             46,396  (66.1%)
//
// **삼각형 순회가 지배적이고 해상도는 거의 안 듣는다**(×2→×0.5 에서 44% 증가). 같은
// 자산의 **GLB 파싱이 677~1,544ms** 이므로 기본값의 138ms 는 그 10~20% 다 — 부팅에
// 눈에 띄는 지연이 아니라고 판정했고, 그래서 굽는 시점을 **런타임**에 둔다(빌드 시
// 사전 굽기는 자산마다 산출물이 따라다녀야 해서 「어떤 GLB 가 와도」를 깬다).
//
// ── 🔴 마지막 열이 이 회차의 **미판정 사항**이다 ────────────────────────────
// 칸이 작을수록 **걸을 수 있는 비율이 오른다**(66% → 90%). 나이퀴스트 유도는 「좁은
// 통로가 살아남게」 하는데, 같은 촘촘함이 **벽 옆 틈도 살린다** — 그래서 건물 안쪽이
// 바깥과 이어지고 가지치기가 그것을 못 떼어낸다(×1 에서 잘린 것은 1.9% 뿐이다).
// ×2 에서만 25.3% 가 잘린다(= 벽이 확실히 닫힌다).
//
// **어느 쪽이 화면에서 나은지는 계산으로 안 갈린다** — 「치비가 건물 안에 들어가 있다」와
// 「좁은 골목이 막혀 사람이 안 다닌다」 중 무엇이 더 나쁜가이고, 그것은 감독 판정이다.
// 그래서 `?walkcell=` 로 네 후보를 **동시에** 열어 둔다. 판정이 나면 그 값을 기본으로
// 옮기고 **판정을 이 표 옆에 적는다**(뒤집혔으면 왜 내 유도가 틀렸는지까지).
//
// ⚠ **이 표는 node 실측이다.** 감독 실기기(모바일)는 더 느리다 — 그 배수는 **안 쟀다**.
// 못 잰 것을 통과로 적지 않으므로 그대로 적어 둔다.
//
// ── ⚠ 미니맵과 **따로 걷는다** (팀장 조건: 따로 걸으면 이유와 소요를 여기 적는다) ──
// 팀장 지시는 «21,283 메시를 두 번 걷지 마라 — 한 순회에서 함께 굽는 것이 기본» 이었다.
// 따로 걷기로 했고 근거는 셋이다:
//
//   ① **순회의 깊이가 다르다.** 미니맵은 메시당 bbox 하나(21,286회)이고 walkmap 은
//      삼각형 1,322,096개다. 「한 순회」로 합쳐도 안쪽 루프는 여전히 두 벌이다.
//   ② **소요 차가 작다.** 실측(칸 0.5m): walkmap 단독 **107ms** · 미니맵을 같은
//      `traverse` 안에서 함께 **122ms**. 따로 걸으면 미니맵 12.7ms 가 더해져 **120ms** —
//      합치기로 버는 것이 **13ms** 다. 부팅 총량(파싱 1,544ms) 대비 0.8% 다.
//   ③ **결합의 대가가 그보다 크다.** 미니맵은 기능이 꺼져도 굽고(`main.ts` 가 무조건
//      부른다), walkmap 은 페이지 옵션이 켜야 굽는다. 합치면 한쪽을 끄는 순간 다른
//      쪽이 따라 꺼지거나, 「누가 켰는지」를 보는 분기가 그 안에 생긴다.
//
// ⚠⚠ **세계가 바뀌면 다시 구워야 한다.** 지금 그 문은 없다(부팅 1회). GLB 세계는
// 편집으로 지오메트리가 바뀌지 않으므로 이 회차에서는 사실이 아닌 상태가 안 생긴다.

import * as THREE from 'three/webgpu';
import type { Object3D } from 'three/webgpu';
import { judgeCell, pruneUnreachable, walkCellFromKnob, type WalkGrid } from '../decide/walkable.js';
import { readNumOpt } from '../url-knob.js';
import { DEFAULT_BODY_R, DEFAULT_KNEE_Y } from './collision.js';

export interface BakeWalkOptions {
  /** 훑을 트리 — **인스턴싱 «전»** 원본이어야 한다(묶인 뒤에는 행렬이 속성으로 들어가
   *  `matrixWorld` 하나로 표현되지 않는다). 근거는 `glb-source.ts` 의 `collisionRoot` */
  root: Object3D;
  /** 칸 한 변(m). 유도는 `decide/walkable.ts` 의 `walkCellSize` 가 소유한다 */
  cell: number;
  /**
   * 지면의 y(m). **플레이어가 서는 평면**이어야 한다 — 치비와 플레이어가 같은 바닥에
   * 서야 하고, 이 트리의 플레이어는 `y = 0` 평면을 전제한다(`glb-collider.ts` 의 `kneeY`).
   * 씬 bbox 에서 유도하지 않는 이유가 그것이다(지하 구조물이 있으면 그 축이 어긋난다).
   */
  groundY: number;
  /**
   * 밟을 수 있는 면의 상한(m, `groundY` 기준). 이보다 높이 끝나는 것은 **장애물**이다.
   *
   * **충돌기의 무릎 높이와 같은 값을 받는다.** 충돌기는 그 높이에서 광선을 쏘므로
   * 「그보다 낮게 끝나는 것은 플레이어를 못 막는다」가 이미 집행되고 있다. 같은 경계를
   * 쓰면 치비가 걷는 곳과 플레이어가 걷는 곳이 어긋나지 않는다 — 두 값을 각자 정하면
   * 「치비는 올라가는데 나는 막힌다」가 생기고, 그 증상은 원인에서 가장 멀다.
   */
  step: number;
  /** 머리 위 여유(m). 사람 키다 — 바닥 위로 이만큼 비어야 지나간다 */
  head: number;
}

/**
 * 격자를 굽는다. 씬이 비었거나 범위가 0 이면 `null`(「지도가 없다」가 사실이다).
 *
 * **부팅 1회**용이다. 비용은 위 표.
 */
export function bakeWalkGrid(opts: BakeWalkOptions): WalkGrid | null {
  const { root, cell, groundY, step, head } = opts;
  if (!(cell > 0)) return null;

  root.updateMatrixWorld(true);
  const world = new THREE.Box3().setFromObject(root as never);
  if (world.isEmpty()) return null;

  const minX = world.min.x;
  const minZ = world.min.z;
  const nx = Math.max(1, Math.ceil((world.max.x - minX) / cell));
  const nz = Math.max(1, Math.ceil((world.max.z - minZ) / cell));

  // 칸마다 두 값만 모은다 — 판정은 `decide/walkable.ts` 의 `judgeCell` 이 한다.
  //   floorTop : 지면 대역 안에서 끝난 면 중 **가장 높은** y (없으면 -Infinity)
  //   obsLow   : 그 위로 솟은 것 중 **가장 낮은** 바닥 y (없으면 +Infinity)
  const floorTop = new Float32Array(nx * nz).fill(-Infinity);
  const obsLow = new Float32Array(nx * nz).fill(Infinity);

  const floorCeil = groundY + step;
  // 관심 대역의 위 끝. 이보다 **아래가 한 점도 없는** 삼각형은 지상 1층 판정에 못 닿는다
  // — 고층부가 격자에 닿을 일이 없으므로 통째로 버린다(이것이 위 표의 「삼각형 순회」가
  // 1,322,096 이면서도 「칸 쓰기」가 그보다 적은 이유다).
  const ceilY = groundY + head;
  // 관심 대역의 아래 끝. 지하는 지상 1층의 바닥이 될 수 없다. 대역 폭을 `head` 로 잡는
  // 것은 「사람 키만큼 아래까지」라는 뜻이고, 별도 상수를 만들지 않으려는 선택이다.
  const floorY = groundY - head;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  root.traverse((o: Object3D) => {
    // `glb-minimap.ts` 와 같은 구조적 읽기다 — three 의 `isMesh` 는 타입 가드가 아니라
    // 런타임 플래그라, 계층 순회에서 메시를 가리려면 이 모양이 된다.
    const m = o as unknown as {
      isMesh?: boolean;
      visible?: boolean;
      geometry?: {
        index: { count: number; getX(i: number): number } | null;
        attributes: { position?: { count: number } };
      };
      matrixWorld: unknown;
    };
    if (!m.isMesh || !m.geometry || m.visible === false) return;
    const pos = m.geometry.attributes.position;
    if (!pos) return;
    const idx = m.geometry.index;
    const mat = m.matrixWorld as Parameters<THREE.Vector3['applyMatrix4']>[0];
    const n = idx ? idx.count : pos.count;
    for (let t = 0; t + 2 < n; t += 3) {
      const i0 = idx ? idx.getX(t) : t;
      const i1 = idx ? idx.getX(t + 1) : t + 1;
      const i2 = idx ? idx.getX(t + 2) : t + 2;
      const attr = pos as Parameters<THREE.Vector3['fromBufferAttribute']>[0];
      a.fromBufferAttribute(attr, i0).applyMatrix4(mat);
      b.fromBufferAttribute(attr, i1).applyMatrix4(mat);
      c.fromBufferAttribute(attr, i2).applyMatrix4(mat);
      const loY = Math.min(a.y, b.y, c.y);
      const hiY = Math.max(a.y, b.y, c.y);
      if (loY > ceilY) continue;   // 머리 위보다 높다 — 지상 1층과 무관
      if (hiY < floorY) continue;  // 지하 — 밟을 바닥이 아니다
      const x0 = Math.min(a.x, b.x, c.x);
      const x1 = Math.max(a.x, b.x, c.x);
      const z0 = Math.min(a.z, b.z, c.z);
      const z1 = Math.max(a.z, b.z, c.z);
      const ix0 = Math.max(0, Math.floor((x0 - minX) / cell));
      const ix1 = Math.min(nx - 1, Math.floor((x1 - minX) / cell));
      const iz0 = Math.max(0, Math.floor((z0 - minZ) / cell));
      const iz1 = Math.min(nz - 1, Math.floor((z1 - minZ) / cell));
      // ⚠ 삼각형을 **축정렬 사각형으로** 칠한다(정확한 클리핑이 아니다). 넘치는 쪽은
      // 언제나 「더 막는다」이므로 치비가 벽을 밟는 방향으로는 틀리지 않는다.
      const isFloor = hiY <= floorCeil;
      for (let j = iz0; j <= iz1; j++) {
        const rowBase = j * nx;
        for (let i = ix0; i <= ix1; i++) {
          const k = rowBase + i;
          if (isFloor) { if (hiY > floorTop[k]) floorTop[k] = hiY; }
          else if (loY < obsLow[k]) obsLow[k] = loY;
        }
      }
    }
  });

  const walk = new Uint8Array(nx * nz);
  for (let k = 0; k < walk.length; k++) {
    if (judgeCell(floorTop[k], obsLow[k], head)) walk[k] = 1;
  }

  return { minX, minZ, cell, nx, nz, walk };
}

/**
 * 걸을 수 있는 칸 수 — 진단용. 0 이면 격자가 비었다는 뜻이고 그것은 사실이 아니어야 한다.
 *
 * ── 왜 이 수를 **부팅 로그로 내보내는가** (팀장 조건 ①-3, 2026-09-19) ──────────
 * 가지치기가 맨해튼에서 떼어낸 것은 **1.9%** 뿐이고, 그 수치만 보면 「거의 안 잘린다」로
 * 읽힌다. 그러나 그것은 **도로망이 하나로 이어진 자산**의 값이다. 도로가 강·고가로 갈린
 * 세계(홍콩이 들어오는 날)에서는 시작점이 속한 섬만 남고 **나머지가 통째로 잘린다** —
 * 화면에서는 「저쪽 동네에 사람이 아예 없다」이고, 1.9% 라는 실측 하나로는 그 형태를
 * 절대 못 본다. 자산마다 다시 재는 회차를 만들지 않으려고 `bakeWalkmapFor` 가 **항상**
 * 비율을 적는다.
 */
export function walkableCount(g: WalkGrid): number {
  let n = 0;
  for (let k = 0; k < g.walk.length; k++) if (g.walk[k] === 1) n++;
  return n;
}

/**
 * **조립부가 부르는 한 줄.** 굽고 → 가지친다.
 *
 * ── 왜 조립부가 아니라 여기인가 ─────────────────────────────────────────────
 * 「어떤 인자로 굽는가」는 전부 이 기능의 판단이다 — 노브 이름(`?walkcell=`) · 지면이
 * y=0 이라는 전제 · 밟을 수 있는 면의 상한이 충돌기의 무릎과 **같아야 한다는 것** ·
 * 가지치기 시작점이 **플레이어가 서는 자리**여야 한다는 것. 그 넷이 조립부에 흩어지면
 * 격자를 고칠 때마다 `main.ts` 를 읽어야 하고, 조립부는 기능 하나의 유도식을 진다.
 *
 * @param head  사람 키(m). 조립부의 눈높이(`?eye=`)를 그대로 받는다 — 여기에 1.7 을
 *              적으면 그 순간 값 미러링이다.
 * @param start **플레이어가 선 자리.** 거기서 걸어갈 수 없는 데는 사람도 못 간다.
 *              부팅 중에는 곧 스폰 지점이고(입력이 아직 없다), 스폰을 옮겨도 따라온다 —
 *              좌표를 따로 적으면 그날 격자가 옛 자리에서 잘려 「사람이 안 보이는 구역」이 생긴다.
 */
export function bakeWalkmapFor(
  root: Object3D,
  head: number,
  start: { readonly x: number; readonly z: number },
): WalkGrid | null {
  const g = bakeWalkGrid({
    root,
    // `?walkcell=` — 유도 상한의 배수. 판정·후보표는 `decide/walkable.ts` 한 곳이다.
    cell: walkCellFromKnob(readNumOpt('walkcell', 0.1, 4), DEFAULT_BODY_R),
    // 지면은 y=0 평면이다 — 플레이어가 서는 그 평면이어야 치비와 높이가 맞는다.
    groundY: 0,
    step: DEFAULT_KNEE_Y,
    head,
  });
  if (!g) return null;
  // 걸어서 닿을 수 없는 칸을 떼어낸다. 안 하면 사람이 건물 안에서 태어난다.
  // 근거·팀장 판정·**경계**는 `decide/walkable.ts` 의 `pruneUnreachable` 한 곳이다.
  const before = walkableCount(g);
  const pruned = pruneUnreachable(g, start.x, start.z);
  const after = walkableCount(pruned);
  // ── 팀장 조건 ①-3 — **절단 비율을 측정값으로 노출한다** ────────────────────
  // 1.9% 라는 실측은 도로망이 하나로 이어진 맨해튼의 수치다. 도로가 갈린 자산에서는
  // 시작점이 속한 섬만 남고 나머지가 통째로 잘리는데, 그 형태는 비율을 **자산마다**
  // 봐야 보인다. 그래서 감독 재실측이나 별도 스크립트 없이 부팅 로그에 항상 적는다.
  // 이유는 바로 위 `walkableCount` 주석 한 곳이다.
  const total = g.nx * g.nz;
  const pct = (n: number): string => ((n / total) * 100).toFixed(1);
  console.info(
    `[walkmap] 칸 ${g.cell.toFixed(3)}m · 격자 ${g.nx}×${g.nz}`
    + ` · 걸을 수 있는 칸 ${after}/${total} (${pct(after)}%)`
    + ` · 가지치기가 떼어낸 것 ${before - after} (${pct(before - after)}%)`,
  );
  return pruned;
}
