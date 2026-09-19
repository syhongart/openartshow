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
// ── ❌ **이 축의 감독 카드 판정은 「무효」다** (팀장 결정 2026-09-19, 같은 날 철회) ──
//
// 이 자리에는 *"✅ … **감독이 ×1 로 정했다**"* 가 적혀 있었다. **근거가 없다 — 지우지
// 않고 무효 경위를 남긴다.** 네 후보를 라이브 링크로 드리고 카드로 물은 그 시점의
// world11 은 **구운 격자를 한 번도 소비하지 않고 있었다**(걷기가 조립 시점에 `null` 을
// 캐시했다 — 경위는 `decide/npc-grid.ts` 의 `walkBinding` 절). 노브는 격자를 바꿨지만
// **치비는 넷 다 파셀 32m 격자를 걸었다** — 감독은 **같은 화면 넷**을 비교하신 것이고
// 「×1」 은 선택이 아니라 우연이다. **값은 유지한다**(무효인 것은 근거지 값이 아니다 —
// 유도 `walkCellSize` 가 그대로 기본값의 근거다). 아래 굽기 표도 유효하다.
//
// 🔴 **재론 조건**: **후보 간 결과가 실제로 갈리는지를 먼저 실측하고**(팀장 결정 3
// 셋째 항 — 링크 선결 조건) 다시 카드로 묻는다. **그 실측은 했다**(node, 이 자산,
// 치비 6체 × 60초, 같은 시드) — 순이동 평균/최대(m) · 궤적 1m칸 · 경로길이(m):
//
//   ×0.5  4.2/6.9  124  304 │ ×1  7.1/8.1  191  321 │ ×1.5  8.4/12.5  222  328
//   ×2    9.2/20.2 233  331 │ 후보 간 궤적 겹침(1m 칸 자카드) **6.5~18.5%**
//
// **경로 길이는 넷이 같고 순이동만 2.2배 갈린다** — 후보가 가르는 것은 「멀리 가느냐」가
// 아니라 **「얼마나 갈지자로 걷느냐」**다. 아래 유도가 대가로 예고한 그 축이다.
//
// ⚠ **수정 전에는 넷이 완전히 같았다** — 같은 하네스의 「격자를 끝내 안 넘기는」 대조군은
// 자카드 **100.0%**, 도착 좌표·경로길이·순이동이 전부 동일하다(격자는 후보마다 제대로
// 구워졌고 **소비만 안 됐다**). 네 링크가 같은 화면이었다는 실물 근거가 이 100.0% 다.
//
// ⚠⚠ **한계**: node 실측이고 화면이 아니다 — 「갈지자가 거슬리는가」는 여전히 감독
// 판정이다. 하네스는 텍스처를 벗긴 판본을 읽었다(기하만 보므로 격자는 같다 — ×1 의
// 89.2% 가 아래 표와 일치하는 것이 그 대조다).
//
// ── 아래 표가 말하는 것 (실측은 유효 · 판정은 위 절대로 무효) ────────────────
// 칸이 작을수록 **걸을 수 있는 비율이 오른다**(66% → 90%). 나이퀴스트 유도는 「좁은
// 통로가 살아남게」 하는데, 같은 촘촘함이 **벽 옆 틈도 살린다** — 그래서 건물 안쪽이
// 바깥과 이어지고 가지치기가 그것을 못 떼어낸다(×1 에서 잘린 것은 1.9% 뿐이다).
// ×2 에서만 25.3% 가 잘린다(= 벽이 확실히 닫힌다).
//
// **어느 쪽이 화면에서 나은지는 계산으로 안 갈린다** — 「치비가 건물 안에 있다」와
// 「좁은 골목이 막힌다」 중 무엇이 더 나쁜가이고 그것은 감독 판정인데, **아직 안 받았다**
// (위 ❌ 절). 내 유도도 뒤집히지도 승인되지도 않았다 — 유도는 「좁은 통로가 살아남을
// 상한」만 말하고 벽 옆 틈은 셈에 없었다. **새 자산에서는 균형이 또 달라진다.**
//
// ── 🔴 **여기서 멈춘다** ────────────────────────────────────────────────────
// 「칸을 몇으로 하느냐」로 실내 누수를 더 줄이려 들지 마라. 이 축은 **네 후보를 실측해
// 링크로 드리고 카드로 받는 것**으로 끝난다(그 왕복을 한 번 헛돌았다 — 위 ❌ 절).
// 실내를 제대로 막으려면 칸 크기가 아니라 **「실내」의 정의**가 필요하고(지붕이 있는가 ·
// 천창은 · 어느 높이까지), 그것은 이 회차의 두 축에서 유도되지 않는 **재론 회차**다 —
// 경계 문언은 `decide/walkable.ts` 의 `pruneUnreachable` 한 곳이다. 이 저장소는 밤 지면
// 밝기에서 같은 고리를 **네 바퀴** 돌았고, 그것을 끊은 것도 감독의 한 문장이었다.
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
import {
  blockMargin, judgeCell, pruneUnreachable, walkCellFromKnob, type WalkGrid,
} from '../decide/walkable.js';
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
 * 격자의 **자리**(범위와 눈금). 굽기와 덧칠이 **같은 자리**를 봐야 칸 인덱스가 맞는다.
 * `WalkGrid` 가 이 모양을 포함하므로 구운 격자를 그대로 넘길 수 있다(ISP).
 */
export interface GridSpan {
  readonly minX: number;
  readonly minZ: number;
  readonly cell: number;
  readonly nx: number;
  readonly nz: number;
}

/** 지면 대역의 세 경계. **굽기와 덧칠이 같은 축을 쓴다**(뜻이 갈리면 두 건물이 달라진다) */
export interface WalkBand {
  readonly groundY: number;
  readonly step: number;
  readonly head: number;
}

/**
 * 🔴 **트리 하나를 삼각형 단위로 훑어 칸마다 두 값을 모은다.** 굽기(`bakeWalkGrid`)와
 * 덧칠(`blockMesh`)의 **공통 몸통**이다.
 *
 * ⚠ **일부러 한 벌이다.** 덧칠용 순회를 따로 짜면 두 건물이 서로 다른 규칙으로 판정되고,
 * 그 어긋남은 「미술관에서만 문이 안 열린다」처럼 원인에서 가장 먼 증상으로 나온다.
 * 이 저장소가 값 미러링으로 세 번 데인 것과 같은 형태다.
 *
 *   floorTop : 지면 대역 안에서 끝난 면 중 **가장 높은** y (없으면 -Infinity)
 *   obsLow   : 그 위로 솟은 것 중 **가장 낮은** 바닥 y (없으면 +Infinity)
 *
 * @param obsMargin **장애물**을 칠할 때 xz 로 더 넓힐 폭(m). 굽기는 0 이고, 덧칠만
 *                  감독 지시(*"벽이 있는 라인에 딱 붙게 말고 여백을 두면"*)로 쓴다.
 *                  ⚠ **바닥에는 안 먹인다** — 바닥을 넓히면 벽 밖으로 번져 오히려 연다.
 */
function gatherSurfaces(
  root: Object3D, span: GridSpan, band: WalkBand, obsMargin: number,
): { floorTop: Float32Array; obsLow: Float32Array } {
  const { minX, minZ, cell, nx, nz } = span;
  const { groundY, step, head } = band;
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
      // ⚠ 삼각형을 **축정렬 사각형으로** 칠한다(정확한 클리핑이 아니다). 넘치는 쪽은
      // 언제나 「더 막는다」이므로 치비가 벽을 밟는 방향으로는 틀리지 않는다.
      const isFloor = hiY <= floorCeil;
      const pad = isFloor ? 0 : obsMargin;
      const ix0 = Math.max(0, Math.floor((Math.min(a.x, b.x, c.x) - pad - minX) / cell));
      const ix1 = Math.min(nx - 1, Math.floor((Math.max(a.x, b.x, c.x) + pad - minX) / cell));
      const iz0 = Math.max(0, Math.floor((Math.min(a.z, b.z, c.z) - pad - minZ) / cell));
      const iz1 = Math.min(nz - 1, Math.floor((Math.max(a.z, b.z, c.z) + pad - minZ) / cell));
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

  return { floorTop, obsLow };
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
  // **여백은 0** 이다: 세계를 구울 때 벽을 부풀리면 골목이 통째로 사라진다(감독이 고른
  // ×1 의 근거인 「좁은 길을 살린다」와 정면으로 충돌한다). 여백은 덧칠 전용이다.
  const span: GridSpan = { minX, minZ, cell, nx, nz };
  const { floorTop, obsLow } = gatherSurfaces(root, span, { groundY, step, head }, 0);

  const walk = new Uint8Array(nx * nz);
  for (let k = 0; k < walk.length; k++) {
    if (judgeCell(floorTop[k], obsLow[k], head)) walk[k] = 1;
  }

  return { ...span, walk };
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


// ── 🔴 여기서부터 — **세계 GLB 밖에서 씬에 붙는 물건**을 격자에 반영한다 ────────
//
// ── 감독 신고 → 감독 지시 (2026-09-19) ───────────────────────────────────────
// ① *"벽사이를 걸어가네"* — 치비가 미술관 벽을 통과해 걸었다.
// ② *"벽이 있는 라인에 딱 붙게 말고 **여백을 두면**. 큰 문제 없고 가볍지 않을까"*
// ③ *"그리고. **문은 만들어야지** / 11에 치비들어갈 문 있게 방법을 찾아보고.
//    **다른 glb일때도 대응되게** 해"*
//
// ── 원인은 미술관 한 채가 아니라 **「세계 = GLB 한 덩어리」라는 전제**다 ────────
// 위 `bakeWalkmapFor` 가 훑는 것은 `glb-source.ts` 의 `collisionRoot`, 즉 **세계 GLB
// 트리 하나**다. `world-shared/glb-city.ts` 의 미술관은 `env.scene.add(g)` 로 **씬에
// 직결**되어 그 트리의 자식이 아니다 — 그래서 격자에서 그 자리는 **빈 땅**이다.
// 씬에 물건이 붙을 때마다 같은 결함이 재발하므로 고치는 자리는 「미술관을 아는 코드」가
// 아니라 **「붙는 시점에 알리는 일반 문」**이다(팀장 판정 (B), 조건 7).
//
// ── 🔴 왜 **삼각형**인가 — bbox 로도 막을 수는 있었다 ──────────────────────
// bbox 는 이 물건에서 **성립한다**(미술관은 씬에 개별로 놓인 한 덩어리라 bbox 가 곧 그
// 건물이다 — 맨해튼처럼 병합 메시 하나가 180×180m 가 되는 형태가 아니다).
// **채택하지 않은 이유는 성립하지 않아서가 아니라 문을 못 만들어서다**(감독 지시 ③).
// 개구부는 「바닥 있음 + 머리 위 빔」 두 축이 찾아내고, **bbox 는 그 축을 볼 수가 없다.**
//
// ── 🔴 그래서 **문을 우리가 만들지 않는다** — 두 축이 찾아낸다 ────────────────
// 문 개구부는 「바닥이 있고 머리 위가 비어 있는」 자리이고 그것이 정확히 이 격자의 판정
// 축이다. 벽은 머리 위가 막혀 걸러지고 문은 안 걸러진다 — **삼각형을 훑기만 하면 문이
// 저절로 열린다.** 재질 이름도 노드 이름도 「문」이라는 개념도 코드에 없으므로 감독의
// *"다른 glb일때도 대응되게"* 가 **새 개념 0 으로** 충족된다. 홍콩이 와도 같다.
//
// ── ⚠ 그러므로 **두 건물이 같은 규칙으로 돈다** ─────────────────────────────
// 세계 GLB 쪽은 이미 이 순회다(실내 누수 1.9% 가 그 관측이다). 미술관도 **같은
// `gatherSurfaces`** 를 타므로 「세계 건물은 들어가지는데 미술관만 안 된다」가 성립할
// 수 없다. 순회를 두 벌로 나누면 그 순간 그 어긋남이 가능해진다.
//
// ── ⑦ 소요와 실측 (node, 2026-09-19 · 맨해튼 530×530 = 280,900 칸) ──────────
// **이 파일을 그대로 돌려 잰 값**이다(알고리즘을 다시 적어 재면 그 재현이 곧 미러링이다).
// 미술관 `lab-space.glb` — 메시 78 · 삼각형 162,902(세계 1,322,096 의 12.3%).
//
//   덧칠 `blockMesh`                     29 ms
//   재가지치기 `pruneUnreachable`        17 ms
//   되쓰기 `Uint8Array.set`               2 ms
//   ────────────────────────────────────────
//   합계                                 48 ms   (같은 회차의 세계 굽기 158ms 의 30%)
//
//   걸을 수 있는 칸  250,486 → 247,700 (막은 것 2,786)
//   여백을 0 으로 두면 247,921 — **여백이 더 막은 것은 221칸**(막은 것의 7.9%)
//
// 부팅 중 **세운 채수만큼** 불린다(기본 1채). ⚠ node 실측이고 **모바일 배수는 안 쟀다.**
//
// ── 🔴 문이 실제로 열렸는가 — 같은 회차 실측 ────────────────────────────────
// 미술관 월드 bbox 안쪽에서 걸을 수 있는 칸, **가지치기 뒤**:
//
//   벽면에서 0.5m 안쪽   3,231 → 616 / 3,479칸
//   벽면에서 2m   안쪽   2,309 → 286 / 2,440칸
//   벽면에서 3m   안쪽   1,786 → 200 / 1,904칸
//
// 가지치기는 **시작점(플레이어가 선 자리)에서 걸어서 닿는 칸만** 남긴다. 그러므로 3m
// 안쪽에 200칸이 남았다는 것이 곧 **「문으로 들어갈 수 있다」**이고, 격자가 무향이라
// **「들어간 치비가 나올 수 있다」가 같은 사실**이다(도달 가능성이 대칭이다).
//
// ── ⚠ 미술관에는 **밟을 바닥 메시가 없다** (실측) ───────────────────────────
// 미술관만으로 격자를 구우면 걸을 수 있는 칸이 **0 / 3,723** 이다 — 이 자산에는 지면
// 대역(y ≤ groundY+step)에서 끝나는 면이 없고, 실내를 걷게 하는 바닥은 **세계 GLB 의
// 지면**이다. `blockMesh` 가 `Math.max(groundY, floorTop)` 으로 바닥을 세우는 이유가
// 이것이다 — 물건 자신의 바닥만 봤다면 미술관은 문까지 통째로 막혔다.
//
// ── ⚠ 가시성과 격자는 **다른 축이다** (팀장 조건 4) ──────────────────────────
// `glb-city-visibility.ts` 가 거리로 채를 숨겨도 **격자는 지우지 않는다.** 격자가 보는
// 것은 「물리적으로 거기 있는가」이고 보임/안 보임은 렌더 축이다 — 플레이어 충돌기가
// `visible` 을 안 보는 것과 같은 원칙이다. 그래서 이 문은 **붙는 시점에 한 번**만 불린다.

/**
 * **씬에 붙은 물건 하나를 걷기 격자에 반영한다.** 새 격자를 낸다(입력은 안 바꾼다).
 *
 * **막기만 한다** — 이 물건이 덮은 칸 중 「사람이 못 지나가는」 칸을 0 으로 내린다.
 * 원래 0 이던 칸을 1 로 올리지 않는다(물건이 세계를 여는 일은 없다).
 *
 * **멱등이다** — 같은 물건을 두 번 칠해도 격자가 같다(칸을 덮어쓸 뿐 세거나 뒤집지
 * 않는다). 팀장 조건 1 이 요구한 성질이고 `tests/world-glb-walkmap.test.ts` ⑥ 이 본다.
 *
 * @param object **씬에 개별로 놓인 한 덩어리.** 최종 변환이 확정된 뒤에 넘겨라 —
 *               등장 연출 중간 배수로 부르면 벽 두께가 틀린다.
 * @param margin 장애물을 xz 로 더 넓힐 폭(m). 유도는 `decide/walkable.ts` 의 `blockMargin`.
 */
export function blockMesh(
  grid: WalkGrid, object: Object3D, band: WalkBand, margin: number,
): WalkGrid {
  object.updateMatrixWorld(true);
  const { floorTop, obsLow } = gatherSurfaces(object, grid, band, margin);
  const walk = new Uint8Array(grid.walk);
  for (let k = 0; k < walk.length; k++) {
    // 이 물건이 그 칸에 **막을 것을 안 뒀으면** 건너뛴다.
    // ⚠ **이 줄은 판정을 바꾸지 않는다 — 순회 비용을 줄일 뿐이다.** 첫 판본은 여기
    // *"이 검사가 없으면 물건이 없는 칸이 「바닥이 없다」로 읽혀 격자가 통째로 0 이 된다"*
    // 라고 적었고 **거짓이었다**(뮤테이션 M3 실측 2026-09-19: 이 줄을 지워도 30 검사가
    // 전부 통과했다). 아래 `Math.max(groundY, …)` 가 이미 바닥을 세우고 `obsLow` 가
    // `Infinity` 면 판정이 어차피 통과하기 때문이다. 게이트·판정 유효성에 대한 거짓
    // 진술은 다음 사람이 확인을 생략하게 만들어서 그대로 두지 않는다.
    if (!Number.isFinite(obsLow[k])) continue;
    // 밟을 바닥은 **둘 중 높은 쪽**이다: 물건이 제 바닥을 깔았으면 그 위를, 안 깔았으면
    // 세계의 지면을 밟는다. 세계의 바닥 높이는 여기서 안 보이지만, 이 격자가 이미
    // 「걸을 수 있다」고 판정한 칸이므로 거기 바닥이 있고 그것이 `groundY` 평면이다
    // (그 전제는 `bakeWalkmapFor` 의 `groundY: 0` 한 곳이 소유한다).
    if (!judgeCell(Math.max(band.groundY, floorTop[k]), obsLow[k], band.head)) walk[k] = 0;
  }
  return { ...grid, walk };
}

/**
 * **조립부가 부르는 한 줄.** 덧칠하고 → 다시 가지친다 → **제자리에 반영한다.**
 *
 * ── 🔴 왜 **제자리**인가 — 새 객체를 내면 아무 데도 안 닿는다 ───────────────
 * 구운 격자는 부팅 때 **한 번** 공급자로 나간다(`features/npc.ts` 가 `create` 에서
 * `env.walkGrid?.()` 를 읽어 `walkSource(g, …)` 로 감싼다). 그 공급자는 **그 객체의
 * `walk` 배열**을 클로저로 든다. 여기서 새 `WalkGrid` 를 만들어 돌려주면 조립부의 변수만
 * 바뀌고 **걷기는 옛 격자를 계속 본다** — 이 저장소가 *"판정/집행 분리의 구멍 — 경계를
 * 건너는 지점은 아무도 안 본다"* 라고 이름 붙인 바로 그 자리다. 그래서 계산은 순수
 * 함수로 하고 **결과만 같은 배열에 되쓴다.** 반환도 같은 객체다.
 *
 * ── ④ 덧칠 뒤 **반드시** 다시 가지친다 (팀장 조건 1) ────────────────────────
 * 덧칠이 구역을 끊을 수 있다 — 막힌 물건 너머가 섬이 되면 그쪽 치비는 영영 못 돌아온다.
 * 기준점은 **플레이어가 선 자리**다(`bakeWalkmapFor` 와 같은 근거 — 자산 이름을 안 본다).
 *
 * @param start 가지치기 시작점. **플레이어가 선 자리**를 그대로 받는다.
 * @param head  사람 키(m). 조립부의 눈높이를 그대로 받는다 — 굽기와 **같은 값**이어야
 *              두 건물이 같은 규칙으로 판정된다.
 * @returns 입력과 **같은 객체**. 편의를 위한 반환이지 새 격자가 아니다.
 */
export function blockWalkFor(
  grid: WalkGrid,
  object: Object3D,
  head: number,
  start: { readonly x: number; readonly z: number },
): WalkGrid {
  const before = walkableCount(grid);
  // 대역은 **굽기와 같은 인자**다(`bakeWalkmapFor` 한 곳에서 유도된 값을 그대로 쓴다).
  const band: WalkBand = { groundY: 0, step: DEFAULT_KNEE_Y, head };
  const blocked = blockMesh(grid, object, band, blockMargin(DEFAULT_BODY_R));
  const pruned = pruneUnreachable(blocked, start.x, start.z);
  grid.walk.set(pruned.walk);   // 같은 배열에 되쓴다 — 위 「왜 제자리인가」 절
  const after = walkableCount(grid);
  // 덧칠이 **아무것도 안 막았으면** 그것도 사실이다(물건이 격자 밖이거나 이미 벽 위다).
  // 조용히 0 을 넘기지 않는다 — 「막았다고 적혔는데 안 막혔다」가 가장 찾기 어렵다.
  console.info(
    `[walkmap] 덧칠 — 걸을 수 있는 칸 ${before} → ${after}`
    + ` (막은 것 ${before - after}, 가지치기 포함)`,
  );
  return grid;
}
