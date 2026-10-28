// 거리를 걷는 사람들의 **경로 판정.** 순수 함수만 — 씬도 치비도 모른다.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"일단 우리 치비 돌아다니게 해볼까? 월드 1처럼."*
//
// world1 의 NPC 는 **작품 앞에 선다**(`npc.js` 의 `getViewingPose`). 오픈월드에는 작품이
// 없으므로 그 행동 모델은 통째로 못 가져온다. 대신 이 세계에 이미 있는 구조를 쓴다 —
// **도로 격자**다.
//
// ── 왜 파셀 중심을 잇는가 ───────────────────────────────────────────────────
// 도로는 파셀 중심에서 네 방향으로 뻗은 십자다(`road-topology.ts`). 그러니 "파셀 중심에서
// 이웃 파셀 중심으로" 가 곧 **도로를 따라가는 것**이고, 교차로에서 방향을 고르는 것이
// 곧 길 찾기다. 별도의 경로망을 만들 필요가 없다.
//
// 이 방식의 좋은 점은 **자기완결**이다. 도로 격자가 바뀌면(슈퍼셀 병합 패턴을 조정하면)
// 사람들이 다니는 길도 저절로 따라간다. 경로를 따로 적어 두면 그때 둘이 어긋난다.
//
// ── 왜 순수 함수인가 ────────────────────────────────────────────────────────
// 걷기 판정에 난수가 들어가는데, 그 난수를 집행부가 쥐고 있으면 "왜 저 사람이 저기로
// 갔나" 를 재현할 수가 없다. 판정을 여기 몰아 두면 시드만 주고 테이블로 검사할 수 있다.

import { inGrid } from './grid.js';
import { parcelWater } from './water.js';
import { roadDirs, type Dir } from '../parts/road-topology.js';

/** 격자 좌표 한 칸 */
export interface Cell {
  px: number;
  pz: number;
}

/**
 * **격자 공급자** — 「어느 칸에서 어디로 갈 수 있는가」를 이 판정이 묻는 유일한 통로.
 *
 * ── 왜 생겼나 (감독 요구 2026-09-19) ────────────────────────────────────────
 * *"블렌더 파일이 계속 바뀔수있자나. **맨하탄이 홍콩이 될수도** 있고. **매번 치비를
 * 수정하지 않아도 자동으로** 다니게."*
 *
 * 위 헤더가 적어 둔 대로 이 파일은 **파셀 도로 격자**를 전제로 쓰였다 — `roadDirs` 로
 * 십자 도로를 읽고 `parcelWater` 로 바다를 거른다. 그 전제는 world2 섬에서만 참이고
 * **GLB 세계에는 파셀이 아예 없다.** 그렇다고 이 파일을 GLB 쪽으로 다시 쓰면 world2 가
 * 깨지고, 두 벌로 복사하면 걷기 규칙이 두 곳에 산다.
 *
 * 그래서 **「격자」를 인자로 뽑는다.** 걷기 규칙(왔던 길을 피한다 · 막다른 길에서는
 * 되돌아간다 · 밴드 안에서 고른다)은 여기 그대로 남고, 「무엇이 길인가」만 공급자가 답한다.
 * 파셀 세계는 `parcelSource` 를, GLB 세계는 `decide/walkable.ts` 의 `walkSource` 를 준다.
 *
 * ⚠ **기존 함수들은 그대로 남는다** — `parcelSource` 로 위임할 뿐이라 동작이 한 글자도
 * 안 바뀐다. 그 불변은 `tests/world-glb-walkmap.test.ts` ② 가 두 경로를 **표로 대조**해
 * 지킨다(기존 단언을 약화시키지 않는다는 뜻이다).
 */
export interface WalkSource {
  /** 칸 한 변(m). 밴드를 **미터에서** 칸으로 환산하는 데 쓴다 */
  readonly cell: number;
  /**
   * 후보를 훑는 보폭(칸). 촘촘한 격자에서 `nearbyCells` 의 (2R+1)² 순회가 폭발하는
   * 것을 막는다. 파셀 격자에서는 1 이라 기존 동작 그대로다(근거는 `walkSource`).
   */
  readonly stride: number;
  /** 이 칸에 **설 수 있는가** — 세계 안이고 바닥이 있는가. 「나갈 길이 있는가」는 안 본다 */
  standable(px: number, pz: number): boolean;
  /** 이 칸에서 **나갈 수 있는** 방향들 */
  dirs(px: number, pz: number): Dir[];
  /** 칸의 월드 좌표(중심) */
  center(px: number, pz: number): { x: number; z: number };
  /** 월드 좌표가 속한 칸 */
  at(x: number, z: number): Cell;
}

/**
 * 파셀 도로 격자 공급자 — **이 파일이 지금까지 해 오던 그것**이다.
 *
 * 한 번 만들어 재사용한다(내부 루프에서 매번 만들면 할당이 후보 수만큼 늘어난다).
 */
export function parcelSource(cellX: number, cellZ: number): WalkSource {
  return {
    cell: cellX,
    // 파셀은 32m 라 몸 지름(0.68m)보다 훨씬 크다 — 보폭을 나눌 여지가 없고, 1 이 곧
    // 기존 동작이다. 여기에 유도식을 적지 않는 이유: 그 유도는 «촘촘한 격자» 의 문제이고
    // 그것을 아는 것은 `decide/walkable.ts` 다.
    stride: 1,
    standable: (px, pz) => inGrid(px, pz) && parcelWater(px, pz, cellX, cellZ) !== 'water',
    dirs(px, pz) {
      const out: Dir[] = [];
      for (const d of roadDirs(px, pz)) {
        const s = stepOf(d);
        const nx = px + s.px;
        const nz = pz + s.pz;
        if (!inGrid(nx, nz)) continue;
        if (parcelWater(nx, nz, cellX, cellZ) === 'water') continue;
        out.push(d);
      }
      return out;
    },
    center: (px, pz) => ({ x: px * cellX, z: pz * cellZ }),
    at: (x, z) => ({ px: Math.round(x / cellX), pz: Math.round(z / cellZ) }),
  };
}

/** 방향이 가리키는 이웃 칸. 여기가 `road-topology` 의 방향 이름과 좌표를 잇는 유일한 지점이다 */
export function stepOf(dir: Dir): Cell {
  if (dir === 'north') return { px: 0, pz: -1 };
  if (dir === 'south') return { px: 0, pz: 1 };
  if (dir === 'west') return { px: -1, pz: 0 };
  return { px: 1, pz: 0 };
}

/** 반대 방향 — "왔던 길" 을 알아보는 데 쓴다 */
export function opposite(dir: Dir): Dir {
  if (dir === 'north') return 'south';
  if (dir === 'south') return 'north';
  if (dir === 'west') return 'east';
  return 'west';
}

/**
 * 이 칸에서 **실제로 갈 수 있는** 방향들.
 *
 * 도로가 있다는 것만으로는 부족하다. 격자 밖이거나 물인 칸으로 이어지는 길은 세상의
 * 끝으로 가는 길이라 걸러야 한다 — 안 그러면 사람이 바다로 걸어 들어간다(플레이어가
 * 그렇게 되는 문제는 아직 남아 있지만, 여기서까지 같은 일이 벌어질 이유는 없다).
 */
export function walkableDirs(px: number, pz: number, cellX: number, cellZ: number): Dir[] {
  return parcelSrc(cellX, cellZ).dirs(px, pz);
}

/**
 * `parcelSource` 를 **셀 크기당 한 벌만** 만든다.
 *
 * 아래 함수들이 내부 루프에서 공급자를 쓰는데, 호출마다 새로 만들면 후보 수만큼 객체가
 * 생긴다(`nearbyCells` 는 (2R+1)² 회 돈다). 캐시는 순수성을 깨지 않는다 — 같은 입력에
 * 같은 값을 주는 객체를 재사용할 뿐이고, 공급자 자체가 상태를 갖지 않는다.
 */
let srcCache: WalkSource | null = null;
let srcX = NaN;
let srcZ = NaN;
function parcelSrc(cellX: number, cellZ: number): WalkSource {
  if (!srcCache || srcX !== cellX || srcZ !== cellZ) {
    srcCache = parcelSource(cellX, cellZ);
    srcX = cellX;
    srcZ = cellZ;
  }
  return srcCache;
}

/**
 * 다음에 갈 방향. 갈 곳이 없으면 `null`.
 *
 * ── 왔던 길을 피하는 이유 ──────────────────────────────────────────────────
 * 균등 추첨이면 교차로마다 1/4 확률로 되돌아간다. 그러면 사람이 한 블록을 왕복만 하다
 * 끝나서, 멀리서 보면 제자리에서 떠는 것처럼 보인다. 갈 곳이 있으면 되돌아가지 않는다.
 *
 * **막다른 길에서는 되돌아간다.** 그때까지 금지하면 갈 곳이 없어져 그 자리에 굳는다 —
 * 규칙을 예외 없이 만드는 쪽이 오히려 부자연스러워지는 자리다.
 */
export function nextDir(
  px: number,
  pz: number,
  from: Dir | null,
  rnd: () => number,
  cellX: number,
  cellZ: number,
): Dir | null {
  return nextDirIn(parcelSrc(cellX, cellZ), px, pz, from, rnd);
}

/** 위와 같은 규칙을 **임의 격자**에 적용한다. 규칙은 한 곳(여기)이고 격자만 갈린다 */
export function nextDirIn(
  src: WalkSource,
  px: number,
  pz: number,
  from: Dir | null,
  rnd: () => number,
): Dir | null {
  const all = src.dirs(px, pz);
  if (all.length === 0) return null;
  const back = from ? opposite(from) : null;
  const fwd = back ? all.filter((d) => d !== back) : all;
  const pick = fwd.length > 0 ? fwd : all;
  return pick[Math.floor(rnd() * pick.length) % pick.length];
}

/**
 * 🔴 **고른 방향으로 이어서 걷는다** — 「한 번 방향을 정하면 얼마나 가는가」.
 *
 * ── 왜 필요한가 — 안 하면 **제자리 맴돌기**가 된다 (감독 신고 2026-09-19) ────
 * 감독 원문: *"치비 하나만 보여꼬. 길 힌복판에서 1미터. 2미터 영역을 번잡하게
 * 다니고 있어"*
 *
 * 걷기는 「목표 칸에 닿으면 방향을 다시 고른다」이고, 목표는 **이웃 칸 하나**였다.
 * 파셀 격자에서는 그 한 칸이 **32m** 라 한 블록을 곧게 걷는 것이었는데, 구운 격자
 * (`decide/walkable.ts`)는 칸이 **몸 반경**(기본 0.34m)이다 — 같은 코드가 **0.34m
 * 마다 방향을 새로 고르는** 랜덤워크가 됐다. 랜덤워크의 순이동은 √N 으로만 자라므로
 * 아무리 걸어도 제자리다.
 *
 * 🔴 **실측표는 여기 한 곳**이다 — 검사·다른 주석은 이 줄을 가리킨다(값 미러링 금지).
 * 부팅 경로를 끝까지 돌려 잰다(`startGlbWorld` · 합성 십자 통로 · 치비 6체 · 60초).
 * 경로길이·순이동은 **체당 평균**, 효율은 **합산**(순이동 합 ÷ 경로길이 합)이다.
 *
 *     격자                     경로길이  순이동   효율
 *     파셀 32m                  56.3m    41.7m   74.0%   ← world2·7·8·10 (기존)
 *     구운 0.34m · 도입 **전**   53.5m     5.2m    9.7%   ← 감독이 화면에서 본 그것
 *     구운 0.34m · 도입 **후**   56.9m    44.6m   78.4%
 *
 * ⚠ **파셀 대조군은 도입 전후가 한 자리도 안 바뀌었다**(체별 효율 98.9 / 72.4 / 69.5 /
 * 69.6 / 69.6 / 69.8 %, 경로·순이동·끝 좌표 전부 동일) — 그것이 world2·7·8·10 불변의
 * 실물 증거다. 검사로는 `tests/world-glb-walkmap.test.ts` ② 와
 * `tests/world-glb-walkgrid-boot.test.ts` 의 「`walkmap` 을 안 켜면 …」이 본다.
 *
 * ⚠⚠ **맨해튼 자산(`manhattan-180m.glb`)으로는 못 쟀다** — node+jsdom 에서 부팅이
 * 15분 안에 끝나지 않았다(`[walkmap]` 로그가 나오기 전에 타임아웃). 위 표는 합성
 * 세계의 값이고, 반경 50m 라 32m 직진이 벽에 자주 막힌다 — **넓은 세계에서는 효율이
 * 이보다 높게 나온다.** 못 잰 것을 통과로 적지 않기 위해 여기 남긴다.
 *
 * ── 그래서 **거리를 유도한다** ──────────────────────────────────────────────
 * 고쳐야 할 것은 「몇 칸」이 아니라 「얼마나 멀리」다. 칸 수를 숫자로 적으면 칸 크기가
 * 바뀌는 날(`?walkcell=`·`DEFAULT_BODY_R`·다른 자산) 그 거리가 조용히 갈라진다.
 * 그래서 호출부가 **파셀 한 칸 상당 거리**를 칸으로 환산해 넘긴다(`decide/npc-grid.ts`
 * 의 `runCells`) — 파셀 공급자에서는 그 값이 **1** 이라 아래 루프가 한 번 돌고,
 * 그것이 이 함수가 생기기 전의 코드와 **산술적으로 같다.**
 *
 * ── ⚠ 판정은 `standable` 이 아니라 `dirs` 다 ───────────────────────────────
 * 「설 수 있는 칸인가」로 보면 파셀 격자에서 **도로를 벗어난다** — 파셀 공급자의
 * `standable` 은 「세계 안이고 물이 아니다」라서 건물 블록 파셀도 참이고, 「도로가
 * 이어지는가」를 아는 것은 `dirs` 뿐이다(`roadDirs` 를 보는 자리가 거기다). 구운
 * 격자에서는 `dirs` 가 곧 네 이웃의 `standable` 이라 **두 판정이 같은 값**이다 —
 * 즉 엄격한 쪽을 골라도 GLB 세계에서 잃는 것이 없다.
 *
 * ⚠⚠ **막다른 칸에서 굳지 않는다.** 멈춘 칸은 방금 걸어 들어온 칸이므로 되돌아가는
 * 방향이 언제나 열려 있다(`nextDirIn` 이 그때는 되돌아가기를 허용한다).
 *
 * @param dir `src.dirs(from)` 에 **있는** 방향이어야 한다 — 호출부가 `nextDirIn` 으로
 *            고른 것을 넘긴다. 그래서 첫 칸은 언제나 전진한다.
 * @param run 최대 몇 칸까지 이어 갈 것인가. 1 이하면 정확히 한 칸(= 기존 동작)
 */
export function runInto(src: WalkSource, from: Cell, dir: Dir, run: number): Cell {
  const s = stepOf(dir);
  let px = from.px;
  let pz = from.pz;
  const steps = Math.max(1, Math.floor(run));
  for (let i = 0; i < steps; i++) {
    if (!src.dirs(px, pz).includes(dir)) break;
    px += s.px;
    pz += s.pz;
  }
  return { px, pz };
}

/**
 * 진행 벡터를 **바라볼 각도(yaw)** 로 바꾼다.
 *
 * `yaw=0 → -Z` 관례다(world1 `world.js:1752` 계승). 여기 부호를 하나 틀리면 사람들이
 * 전부 뒤로 걷는다 — 그래서 식을 집행부에 두지 않고 여기 한 곳에 둔다. 차선 오프셋
 * (`decide/npc-lane.ts` 의 `rightOf`)이 이 각을 **입력으로 받으므로**, 관례가 두 곳에
 * 각각 적히면 사람이 오른쪽 대신 왼쪽으로 비켜서게 된다.
 *
 * 길이 0 이면 방향이 정의되지 않는다 — 그때는 각을 바꾸지 않아야 하므로 호출부가
 * 이전 값을 유지한다(여기서 0 을 돌려주면 도착할 때마다 북쪽을 본다).
 */
export function yawOf(dx: number, dz: number): number | null {
  const d = Math.hypot(dx, dz);
  if (d === 0) return null;
  return Math.atan2(-dx / d, -dz / d);
}

/**
 * 걸을 수 있는 칸인가 — 스폰과 재배치가 쓴다.
 *
 * 도로가 하나도 없는 칸은 제외한다. 그런 칸 한가운데 사람을 놓으면 갈 곳이 없어 그대로
 * 서 있게 되고, 그게 "돌아다니는" 것으로 안 보인다.
 */
export function isWalkable(px: number, pz: number, cellX: number, cellZ: number): boolean {
  return isWalkableIn(parcelSrc(cellX, cellZ), px, pz);
}

/**
 * 같은 판정을 **임의 격자**에. 「설 수 있고 **나갈 길이 하나라도 있는가**」다 —
 * 두 조건 중 뒤엣것이 있어야 사람이 그 자리에 굳지 않는다(위 문단).
 */
export function isWalkableIn(src: WalkSource, px: number, pz: number): boolean {
  if (!src.standable(px, pz)) return false;
  return src.dirs(px, pz).length > 0;
}

/**
 * 🔴 **몸이 선 칸이 막혔을 때 빠져나갈 가장 가까운 칸.** 없으면 `null`.
 *
 * ── 왜 필요한가 — 안 하면 **벽 안에서 영원히 서 있는다** (2026-09-19) ────────
 * 격자는 이제 부팅 뒤에도 바뀐다 — 씬에 물건이 붙으면 그 자리가 막힌다
 * (`world-glb/systems/glb-walkmap.ts` 의 `blockWalkFor`). 그 순간 이미 그 안에 있던
 * 체는 **자기 칸이 통행 불가**가 되고, 걷기의 재조준(`nextDirIn`)은 이웃을 보는데
 * 이웃도 전부 막혔으므로 `null` 을 돌려준다 → 목표가 제자리로 고정된다. 화면에서는
 * 「벽 안에 갇힌 사람」이고, 그것은 감독이 즉시 문제라고 부를 형태다.
 *
 * ── 왜 **링을 넓혀 가며** 찾는가 ────────────────────────────────────────────
 * 가장 가까운 칸으로 나와야 순간이동이 눈에 덜 띈다. 반경을 1 부터 키우며 **처음
 * 걸을 수 있는 칸이 나온 반경에서** 그 링 전체를 보고 중심에 가장 가까운 것을 고른다
 * (링 하나 안에서도 모서리와 변은 거리가 다르다).
 *
 * ⚠ **판정은 `isWalkableIn` 이다** — 「설 수 있고 나갈 길이 있는가」. `standable` 만
 * 보면 막다른 한 칸으로 나와 다음 프레임에 다시 굳는다.
 *
 * ⚠⚠ **격자를 안 바꾸는 세계에서는 한 번도 안 불린다** — 파셀 공급자에서 체는 언제나
 * 도로 칸 위에 있고(스폰도 걷기도 그 칸만 고른다) 그 판정이 세션 중에 바뀌지 않는다.
 * 기존 동작 불변이 그 사실 위에 선다.
 *
 * @param maxRing 여기까지 찾고 포기한다. 부르는 쪽이 「그보다 멀면 재배치」를 정한다 —
 *                이 함수는 **어디까지가 근처인가**를 모른다(그것은 세계의 거리 단위다).
 */
export function snapOut(
  src: WalkSource, px: number, pz: number, maxRing: number,
): Cell | null {
  for (let r = 1; r <= maxRing; r++) {
    let best: Cell | null = null;
    let bestD = Infinity;
    for (let dz = -r; dz <= r; dz++) {
      // 링의 **테두리만** 본다 — 안쪽은 이미 앞 반경에서 봤다.
      const edge = Math.abs(dz) === r;
      for (let dx = -r; dx <= r; dx += edge ? 1 : 2 * r) {
        const cx = px + dx;
        const cz = pz + dz;
        if (!isWalkableIn(src, cx, cz)) continue;
        const d = dx * dx + dz * dz;
        if (d < bestD) { bestD = d; best = { px: cx, pz: cz }; }
      }
    }
    if (best) return best;
  }
  return null;
}

/**
 * 플레이어 주변에서 걸을 수 있는 칸을 고른다. 없으면 `null`.
 *
 * ── 왜 "주변" 인가 ─────────────────────────────────────────────────────────
 * 세계는 30×30 인데 안개가 시야를 닫는 거리(`decide/fog.ts`)는 그보다 훨씬 짧다. 그 밖의 사람은 **보이지도
 * 않으면서 비용만 낸다.** 치비 한 체가 드로우콜 45·삼각형 24,360 이라 그 낭비가 크다.
 *
 * 그래서 사람들을 플레이어 근처에 묶어 두고, 멀어지면 다시 앞쪽으로 데려온다. 세계
 * 전체에 인구를 뿌리는 것이 아니라 **보이는 범위에만 유지**하는 것이다. 걸어가면 계속
 * 사람을 만나므로 체감은 "도시에 사람이 산다" 쪽이고, 비용은 상한이 고정된다.
 *
 * `ring` 은 최소 거리다. 0 이면 플레이어가 선 칸에도 놓일 수 있어 눈앞에 사람이 튀어나온다.
 */
export function pickNearby(
  centerPx: number,
  centerPz: number,
  ring: number,
  reach: number,
  rnd: () => number,
  cellX: number,
  cellZ: number,
  taken?: ReadonlySet<string>,
): Cell | null {
  return pickNearbyIn(parcelSrc(cellX, cellZ), centerPx, centerPz, ring, reach, rnd, taken);
}

/** 같은 고르기를 **임의 격자**에 */
export function pickNearbyIn(
  src: WalkSource,
  centerPx: number,
  centerPz: number,
  ring: number,
  reach: number,
  rnd: () => number,
  taken?: ReadonlySet<string>,
): Cell | null {
  const cands = nearbyCellsIn(src, centerPx, centerPz, ring, reach, taken);
  if (cands.length === 0) return null;
  return cands[Math.floor(rnd() * cands.length) % cands.length];
}

/** 칸의 신원. 점유 집합의 유일한 표기 — 두 곳에서 다르게 만들면 안 맞는다 */
export function cellKey(px: number, pz: number): string {
  return `${px},${pz}`;
}

/**
 * 밴드 안에서 걸을 수 있는 칸 **전부**. `pickNearby` 가 고르는 후보와 같은 집합이다.
 *
 * 따로 뽑을 수 있게 한 이유: **몇 명을 세울 수 있는지 미리 알아야** 한다. 인원이
 * 후보보다 많으면 같은 칸에 겹쳐 태어나는데, 그 사실이 어디에도 안 나타난다.
 *
 * @param taken 이미 쓴 칸(`cellKey`). 스폰이 서로를 비켜 앉는 데 쓴다
 */
export function nearbyCells(
  centerPx: number,
  centerPz: number,
  ring: number,
  reach: number,
  cellX: number,
  cellZ: number,
  taken?: ReadonlySet<string>,
): Cell[] {
  return nearbyCellsIn(parcelSrc(cellX, cellZ), centerPx, centerPz, ring, reach, taken);
}

/**
 * 같은 순회를 **임의 격자**에. 보폭(`src.stride`)만큼 건너뛰며 훑는다.
 *
 * ⚠ **파셀 격자에서는 보폭이 1 이라 기존 순회 그대로다.** 보폭이 필요한 것은 칸이
 * 사람 몸보다 작은 격자(GLB walkmap)뿐이고, 그 유도는 `decide/walkable.ts` 가 소유한다.
 */
export function nearbyCellsIn(
  src: WalkSource,
  centerPx: number,
  centerPz: number,
  ring: number,
  reach: number,
  taken?: ReadonlySet<string>,
): Cell[] {
  const out: Cell[] = [];
  const step = Math.max(1, Math.floor(src.stride));
  for (let dx = -reach; dx <= reach; dx += step) {
    for (let dz = -reach; dz <= reach; dz += step) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) < ring) continue;
      const px = centerPx + dx;
      const pz = centerPz + dz;
      if (taken?.has(cellKey(px, pz))) continue;
      if (isWalkableIn(src, px, pz)) out.push({ px, pz });
    }
  }
  return out;
}

/**
 * 이 인원을 **겹치지 않게** 세우려면 밴드를 얼마나 넓혀야 하는가(셀).
 *
 * ── 왜 필요한가 (감독 지시 2026-08-03) ──────────────────────────────────────
 * *"사람을 백 명을 깔아줘. 그래야지 내가 확인 하지."*
 *
 * 스폰 밴드는 **안개 시작 안쪽**으로 묶여 있다(한 겹 링, 후보 평균 7.37칸). 그 안에
 * 100 명을 넣으면 한 칸에 열댓 명이 겹쳐 태어난다 — 확인하려고 늘린 인원이 확인을
 * 방해한다. 그래서 인원이 수용력을 넘으면 **필요한 만큼만** 넓힌다.
 *
 * 기하로 계산하지 않고 **실제로 세는** 이유: 밴드 칸 중 걸을 수 있는 비율은 격자
 * 패턴·물·경계에 따라 다르다. 비율을 가정하면 그 가정이 곧 미러링이 된다.
 *
 * ⚠ **인원이 많으면 안개 시작을 넘는다.** 안개 안에 든 칸 수가 유한하므로 피할 수
 * 없다. 이 함수는 "넓혀도 되는가" 를 판단하지 않고 **필요한 값을 돌려줄 뿐**이고,
 * 기본 인원에서는 `min` 이 그대로 나와 기존 동작이 유지된다(그 불변은 테스트가 본다).
 *
 * @param min 최소 reach. 인원이 적으면 이 값 그대로다(= 기존 동작)
 * @param max 안전 상한. 여기까지 넓혀도 모자라면 그냥 멈춘다 — 무한히 커지지 않는다
 */
export function reachFor(
  count: number,
  centerPx: number,
  centerPz: number,
  ring: number,
  min: number,
  max: number,
  cellX: number,
  cellZ: number,
): number {
  return reachForIn(parcelSrc(cellX, cellZ), count, centerPx, centerPz, ring, min, max);
}

/**
 * 같은 넓히기를 **임의 격자**에.
 *
 * ⚠ **한 칸씩 넓히지 않는다** — 보폭이 있는 격자에서는 `r` 이 보폭보다 적게 늘면 후보
 * 집합이 **한 칸도 안 변해** 같은 값을 `max - min` 번 다시 세게 된다(칸이 0.34m 이고
 * 상한이 수백이면 그 헛수고가 그대로 부팅 시간이다). 보폭 단위로 넓힌다.
 */
export function reachForIn(
  src: WalkSource,
  count: number,
  centerPx: number,
  centerPz: number,
  ring: number,
  min: number,
  max: number,
): number {
  const step = Math.max(1, Math.floor(src.stride));
  for (let r = min; r < max; r += step) {
    if (nearbyCellsIn(src, centerPx, centerPz, ring, r).length >= count) return r;
  }
  return max;
}
