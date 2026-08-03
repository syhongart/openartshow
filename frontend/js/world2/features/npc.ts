// world2/features/npc.ts — 거리를 걷는 사람들(아야모).
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"일단 우리 치비 돌아다니게 해볼까? 월드 1처럼. 얼마나 무거워지는지 보자."*
//
// ── 먼저 잰 것 ───────────────────────────────────────────────────────────────
// `tests/world2-chibi-cost.test.ts` 실측 — **치비 한 체가 메시 45 · 재질 29 · 지오 45 ·
// 삼각형 24,360** 이다. 감독 실기기에서 세계 전체가 드로우콜 20 · 삼각형 42,275 였으니,
// **한 체가 세계 전체보다 드로우콜이 두 배 많다.**
//
// 그래서 이 기능은 개수 불변식과 정면으로 부딪힌다. 부딪히는 방식을 정확히 적어 둔다:
//
//   · 파셀이 사람을 만들지 않는다 → **불변식은 지켜진다.** 스트리밍이 무엇을 로드하든
//     사람 수는 그대로다. 부팅 때 N체를 만들고 세션 내내 그 N체를 재사용한다.
//   · 다만 **상수가 커진다.** N=6 이면 드로우콜이 20 → 290 대가 된다. 이건 불변식 위반이
//     아니라 예산 문제이고, 감독 기기에서 재봐야 알 수 있는 종류다.
//
// world1 도 같은 벽을 만났고 같은 답을 냈다 — `world.js:1064` 주석이 *"거리 배회
// NPC(createAvatarInstance=buildChibi 무거움). 총원 ≤6"* 이라 적고 있다. 그 상한을 계승한다.
//
// ── 왜 만들어 두고 재사용하는가 ─────────────────────────────────────────────
// world1 은 파셀 로드 시 NPC 를 만들다가 히칭을 겪었다(`world.js:1681`: *"파셀당 최대 7명을
// 한 프레임에 동시 생성하면 buildChibi(절차 지오 105회+병합)가…"*). 여기서는 **부팅 때
// 전부 만든다.** 로딩이 그만큼 길어지지만, 로딩은 기다리는 시간이고 히칭은 놀라는 시간이다.
//
// ── 보이는 범위에만 유지한다 ────────────────────────────────────────────────
// 안개가 시야를 닫는 거리(`decide/fog.ts`) 밖의 사람은 보이지도 않으면서 비용만 낸다. 멀어진
// 사람은 플레이어 앞쪽 도로로 데려온다(`decide/npc-walk.ts` 의 `pickNearby`). 세계 전체에
// 인구를 뿌리는 것이 아니라 **보이는 범위를 채우는** 방식이라, 걸어가면 계속 사람을
// 만나면서도 비용 상한은 고정된다.

import * as THREE from 'three/webgpu';
import { DEFAULT_LAYOUT } from '../parts/types.js';
import {
  nextDir, stepOf, pickNearby, yawOf, reachFor, cellKey, type Cell,
} from '../decide/npc-walk.js';
import { fogBand, FOG_NEAR_CELLS } from '../decide/fog.js';
import {
  laneOffset, lookAhead, laneTarget, stepLane, relativeTo, type Ahead,
} from '../decide/npc-lane.js';
// **아바타는 배럴로만 만난다.** 이 파일은 치비가 world1 에서 오는지, VRM 이 파일에서
// 오는지 모른다 — 감독 지시("월드원 폴더 것을 그냥 끌어다 쓰지 마, 나중에 날릴 거니까")
// 를 지키는 지점이 여기다. 경계는 `tests/world2-boundary.test.ts` 가 감시한다.
import {
  createChibiAvatar, loadVrmAvatar, CHIBI, VRM_MALE, MAX_TOTAL_AVATARS,
  type WalkAvatar,
} from '../avatars/index.js';
import type { Dir } from '../parts/road-topology.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

/** 걷는 속도(m/s). 플레이어(5m/s)보다 확실히 느려야 "산책하는 사람" 으로 보인다 */
const WALK_MIN = 0.8;
const WALK_MAX = 1.3;

/**
 * 이만큼 멀어지면 앞쪽으로 데려온다(셀).
 *
 * **안개 차단보다 밖이어야 한다** — 두 경계가 같아지면 그 자리에서 팝핑이 나고,
 * 뒤집히면 재배치된 체가 즉시 숨겨져 영영 안 보인다. 부등호는 `tests/world2-fog.test.ts`
 * 가 지킨다(`decide/fog.ts` 의 값과 대조). **여기에 안개 배수를 적지 않는다** —
 * 적었다가 그 숫자만 남고 값이 갈라진 것이 이번 회차의 결함이었다.
 */
const RECYCLE_CELLS = 3.2;

// ── 스폰 밴드는 **안개 시작 안쪽**이다 (팀장 조건 A, 2026-08-02 본편 ①) ──────
//
// 전에는 1~2셀 고정이었고, 그것이 이 회차가 찾아낸 결함의 절반이다.
// 스폰 상한이 안개 시작보다 멀어서 **밴드의 절반이 이미 안개 안에서 태어났다.**
//
// 디자이너 실측이 결과를 보여줬다 — 화면 픽셀 높이는 거리의 종속변수이고
// (`px ≈ 832 / d`), 스폰 최소 1셀은 태어나는 순간 26px 다. NPC 속도는 0.8~1.3m/s
// 인데 재배치는 그보다 훨씬 먼 데서만 걸리므로 **자력으로 가까워질 수 없다.**
// 결과: 정지 8조합에서 알아볼 수 있는 사람 **0명**, 화면 기여 0.007~0.114%.
//
// 그래서 상한을 **안개 시작**에 묶는다. 그 밖은 정의상 대비가 깎이기 시작하는
// 구간이고, 거기서 태어난 개체는 회복할 수단이 없다.
//
// 밴드는 **한 겹 링**이다(ring = reach). 처음엔 형태(1:2)를 보존하려 했으나 그것이
// B1 을 낳았다 — 나눗셈이 정수를 깨뜨렸다. 링이면 후보가 8칸으로 줄지만 **코너까지
// 안개 시작 안쪽**이라 조건이 실제로 성립한다(체비셰프 박스는 `reach × √2` 까지 나간다).
//
// **여기에 셀 배수를 숫자로 적지 않는다**(팀장 조건 1). 적었다가 값이 갈라진 것이
// 바로 위 `RECYCLE_CELLS` 주석이 기록한 사고다.
//
// ── ⚠ B1 — 이 자리에서 **라이브 회귀**를 한 번 냈다 (검수관 반려, 2026-08-02) ──
// 처음엔 `SPAWN_REACH = FOG_NEAR_CELLS`(비정수) · `SPAWN_RING = REACH / 2` 로 썼다.
// 그런데 소비자 `decide/npc-walk.ts` 의 `pickNearby` 는 **정수 셀 인덱스**가 계약이다
// (`for (let dx = -reach; dx <= reach; dx++)`). 비정수를 넣으니 후보 12개 중 정수
// 좌표가 **0개**가 됐고, 그것이 격자 판정을 통째로 무력화했다 — `floorMod(px,2) !== 0`
// 이 비정수에서 **항상 참**이라 `roadDirs` 가 언제나 4방향을 반환하고, NPC 가 도로
// 위상을 무시하고 블록·건물 안쪽을 가로질렀다.
//
// **테스트는 전부 통과했다.** 검사가 소스 문자열만 봤기 때문이다 — `FOG_NEAR_CELLS`
// 를 포함하는지는 봤고 **그 값이 소비자 계약을 만족하는지는 안 봤다.** CLAUDE.md 가
// 이름 붙인 *"계산된 값이 실제로 소비되는가는 양쪽 테스트 어디에도 안 걸린다"* 의
// 교과서적 사례다. 그래서 `tests/world2-spawn-band.test.ts` 는 문자열이 아니라
// **`pickNearby` 를 실제로 호출**한다.

/**
 * 스폰 최대(셀). **정수여야 한다** — 아래 B1 전말 참조.
 *
 * 값은 `fogBand` 에서 **유도하되 정수로 내린다.** 체비셰프 박스라 코너가
 * `reach × √2` 까지 나가므로, **그 코너까지** 안개 시작 안쪽이어야 조건이 성립한다.
 *
 * ⚠ 처음엔 `Math.floor(FOG_NEAR_CELLS)` 로 쓰고 *"floor 가 그것을 보장한다"* 고
 * 적었다. **보장하지 않는다**(검수관 조건 2, 반례 6/8): near 2.0 이면 reach 2 이고
 * 코너는 2.83 이라 안개 밖이다. 현재 값에서 성립한 것은 near 가 `[√2, 2)` 라는
 * 좁은 구간에 있어서였다 — **우연히 참인 문장**이었다.
 *
 * 그래서 √2 로 나눈 뒤 내린다. 이러면 어떤 near 에도 코너가 안쪽이다.
 * (`near < √2` 면 어떤 정수 reach 로도 불가능하다 — 그때는 `Math.max(1, …)` 가
 *  1 을 주고 코너가 안개를 넘는다. 그 경우 밴드가 아니라 안개를 다시 봐야 한다.)
 *
 * **`export` 인 이유**: 테스트가 이 값을 import 해서 검사한다. 예전에는 테스트가
 * 같은 유도식을 **복제**했고, 그래서 `floor`→`ceil` 한 글자를 바꿔도 저장소 전체
 * 게이트가 하나도 안 깨졌다(검수관 뮤테이션 실증). **식을 복제하는 것도 미러링이다.**
 */
export const SPAWN_REACH = Math.max(1, Math.floor(FOG_NEAR_CELLS / Math.SQRT2));

/**
 * 스폰 최소(셀). `reach` 와 같으면 **한 겹 링**이 된다 — 후보가 8칸으로 줄지만
 * 전부 안개 시작 안쪽이다(코너 포함).
 *
 * `reach / 2` 로 두었다가 **비정수가 나와 격자를 깨뜨렸다**(B1). 나눗셈은 정수를
 * 보존하지 않으므로 여기서는 쓰지 않는다.
 */
export const SPAWN_RING = SPAWN_REACH;

/**
 * 인원이 많을 때 밴드를 넓힐 수 있는 **상한**(셀).
 *
 * 세계 한 변이 30 파셀이므로 그 절반이면 어디에 서 있든 세계 전체가 후보에 든다.
 * 더 키워도 후보가 안 늘고 루프만 길어진다 — 그래서 여기서 멈춘다.
 * (`decide/grid.ts` 가 격자 밖을 걸러 주므로 넘겨도 안전하지만, 무의미한 순회다.)
 */
const MAX_SPAWN_REACH = 15;

/** 목표 도달 판정(m) */
const ARRIVE = 0.35;

/**
 * 부팅 직후 **컬링을 끄고 전부 그리는** 프레임 수.
 *
 * ── 감독 성능 리포트에서 생겼다 ────────────────────────────────────────────
 * `geometry` 가 세션 내내 늘었다 — 86 → 129 → 170 → 282. 증가폭 +43·+41 이 치비 한
 * 체(45 지오)와 거의 같다.
 *
 * 원인은 `info.memory.geometries` 가 **씬에 있는 수가 아니라 GPU 에 업로드된 수**라는
 * 것이다. 부팅 때 체를 다 만들어도 업로드는 그 메시가 **처음 그려질 때** 일어난다.
 * 앞서 "파셀이 사람을 만들지 않으니 불변식은 지켜진다" 고 보고했는데, 객체 생성과
 * GPU 업로드가 다른 시점이라는 것을 놓쳤다.
 *
 * 히칭은 안 났지만 그냥 둘 문제가 아니다 — "업로드 스파이크가 **언제** 날지 모른다"는
 * 뜻이고, 그것이 이 아키텍처가 없애려는 바로 그 종류다.
 *
 * 처방: 처음 몇 프레임만 절두체 컬링을 끈다. 시야 밖 체까지 렌더 목록에 올라가
 * 업로드가 끝나고, 그 뒤 컬링을 되돌리면 드로우콜은 원래대로 돌아온다. 로딩 직후라
 * 그 몇 프레임의 드로우콜 증가는 화면에 드러나지 않는다.
 *
 * 3프레임인 이유: 1프레임이면 그 프레임에 렌더가 걸러질 여지(탭 비활성 등)가 있고,
 * 많이 줄수록 초기 드로우콜이 높은 구간만 길어진다.
 */
const WARM_FRAMES = 3;

interface Walker {
  /**
   * 무엇으로 그려지는가. **치비든 VRM 이든 이동 로직은 모른다** — 둘 다 `group`·
   * `update(dt, speed)`·`dispose()` 만 노출하는 같은 계약이라, 아바타 종류가 늘어도
   * 걷기 코드는 그대로다.
   */
  readonly inst: WalkAvatar;
  /** 진단에 종류를 적기 위한 표시 */
  readonly kind: 'chibi' | 'vrm';
  /** 지금 향하는 칸 */
  cell: Cell;
  /** 그 칸으로 들어온 방향 — 왔던 길을 피하는 데 쓴다 */
  from: Dir | null;
  x: number;
  z: number;
  tx: number;
  tz: number;
  ry: number;
  speed: number;
  /**
   * 이 체가 걸을 차선 오프셋(m). 진행방향 **오른쪽**으로 이만큼 비켜선다.
   *
   * 체마다 들고 있는 이유: 몸집이 다르면 차선이 성립하지 않을 수 있다(치비와 VRM 은
   * 크기가 다르다). 성립하지 않으면 0 이고, 그때 그 체는 지금까지처럼 길 한가운데를
   * 걷는다 — 기능이 없어지는 것이지 깨지는 것이 아니다.
   */
  lane: number;
  /**
   * 몸의 XZ 반경(m). 부팅 때 한 번 실측한다.
   *
   * 차선 계산에도 쓰고, **앞사람과 벌려야 할 간격**(두 반경의 합)에도 쓴다. 체마다 들고
   * 있어야 하는 이유가 후자다 — 치비끼리와 치비-VRM 은 벌릴 폭이 다르다.
   */
  radius: number;
  /**
   * 지금 실제로 얹고 있는 오프셋(m). 목표(`lane × 오른쪽`)로 **걸어서** 따라간다.
   *
   * 목표를 그대로 쓰면 모퉁이에서 방향이 90° 꺾이는 순간 오프셋도 튀어 사람이 옆으로
   * 순간이동한다. 따라가는 속도는 자기 걷는 속도로 묶는다 — 옆걸음이 앞걸음보다 빠를
   * 이유가 없고, 그러면 여기에 새 상수를 만들지 않아도 된다.
   */
  ox: number;
  oz: number;
  /**
   * 마지막으로 **실제 그린 자리**(= `group.position` 에 넣은 값).
   *
   * 진단이 이것을 읽는다. `w.x + w.ox` 를 진단 쪽에서 다시 계산하면 식이 두 곳에 생기고
   * (값 미러링), 그러면 집행이 오프셋을 안 얹어도 진단만 얹은 값을 보여 준다 —
   * 정확히 그 자리를 보려고 만든 진단이 그 자리를 못 보게 된다.
   *
   * 아바타 계약(`WalkAvatar`)의 `position` 은 `set()` 만 노출한다. 읽기를 계약에 넣으면
   * 소비자가 위치를 직접 만지기 시작하므로, 넓히는 대신 **넣은 값을 여기 남긴다**.
   */
  rx: number;
  rz: number;
  /** 지금 그려지는가. 안개 밖이면 끈다 */
  shown: boolean;
}

/**
 * URL 의 `?npc=` 를 읽는다. **기능이 스스로 읽는다** — 조립부가 기능별 설정을 알면
 * 기능을 빼도 그 설정 코드가 남는다.
 */
/**
 * VRM 을 몇 체 세울 것인가 (`?vrm=N`).
 *
 * 감독 지시: *"치비는 정상이야. 치비는 빼고. vrm만 많이 많이 깔아줘. 테스트버전으로"*
 *
 * 걷기가 이상한 쪽이 VRM 이라 여러 체를 나란히 세워야 관찰이 된다. 한 체는 지나가면
 * 끝이지만 여럿이면 같은 동작이 반복돼 무엇이 어긋났는지 보인다.
 *
 * 기존 `?vrm=0`(끄기)과 호환된다 — 0 이면 그대로 안 켠다.
 */
function readVrmCount(): number {
  if (typeof location === 'undefined') return VRM_MALE.count;
  const raw = new URLSearchParams(location.search).get('vrm');
  if (raw === null) return VRM_MALE.count;
  const n = Number(raw);
  if (!Number.isFinite(n)) return VRM_MALE.count;
  return Math.max(0, Math.min(MAX_TOTAL_AVATARS, Math.floor(n)));
}

function readCount(): number {
  if (typeof location === 'undefined') return CHIBI.count;
  const raw = new URLSearchParams(location.search).get('npc');
  if (raw === null) return CHIBI.count;
  const n = Number(raw);
  if (!Number.isFinite(n)) return CHIBI.count;
  return Math.max(0, Math.min(MAX_TOTAL_AVATARS, Math.floor(n)));
}

/** 결정론 난수 — 같은 시드면 같은 도시가 된다("파라미터가 곧 공간") */
function rngFrom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const npcFeature: Feature = {
  name: 'npc',

  create(env: FeatureEnv): FeatureInstance | null {
    const count = readCount();
    const vrmCount = readVrmCount();
    // 둘 다 0 일 때만 끈다. 예전에는 치비 수만 봐서 `?npc=0` 이 VRM 까지 껐고,
    // 그러면 **"치비는 빼고 VRM 만"** 이라는 조합 자체가 불가능했다.
    if (count <= 0 && vrmCount <= 0) return null; // 대조군 측정용

    const { cellX, cellZ } = DEFAULT_LAYOUT;
    const rnd = rngFrom(0x9e3779b9);
    const group = new THREE.Group();
    group.name = 'w2-npc';
    env.scene.add(group);

    const home = env.player.position;
    const hpx = Math.round(home.x / cellX);
    const hpz = Math.round(home.z / cellZ);

    const walkers: Walker[] = [];
    /** 페이지를 떠난 뒤 VRM 로드가 끝나는 경우가 있다. 그때 씬에 붙이면 누수가 된다 */
    let disposed = false;

    // ── 인원에 맞춰 스폰 밴드를 넓힌다 (감독 지시 2026-08-03) ──────────────
    // *"사람을 백 명을 깔아줘. 그래야지 내가 확인 하지."*
    //
    // 밴드는 안개 시작 안쪽 한 겹 링이라 후보가 8칸 남짓이다. 거기 100 명을 넣으면
    // 한 칸에 열댓이 겹쳐 태어나 **확인하려고 늘린 인원이 확인을 방해한다.**
    //
    // 그래서 필요한 만큼만 넓힌다. 기본 인원에서는 `SPAWN_REACH` 가 그대로 나오므로
    // **기존 동작이 안 바뀐다** — 그 불변은 `tests/world2-spawn-band.test.ts` 가 본다.
    // 인원이 많으면 안개 시작을 넘는데, 안개 안 칸 수가 유한하므로 피할 수 없다.
    // 넘는다는 사실을 진단(`spawnReach`)으로 내보내 감춰지지 않게 한다.
    const wanted = count + vrmCount;
    const spawnReach = reachFor(
      wanted,
      hpx,
      hpz,
      SPAWN_RING,
      SPAWN_REACH,
      MAX_SPAWN_REACH,
      cellX,
      cellZ,
    );
    /**
     * 이미 누가 태어난 칸. **스폰에서만** 본다 — 걷기는 그대로 자유다.
     *
     * 팀장이 셀 점유 배제를 기각한 사유는 *"후보 7.37칸에 개체 7 이라 고갈이 산술적으로
     * 성립한다"* 였다. 위에서 후보를 인원 이상으로 확보하므로 **그 사유가 성립하지
     * 않는다.** 그래도 고갈에 대비해 `pickNearby` 가 `null` 을 주면 배제 없이 다시
     * 고른다 — 겹쳐서라도 세우는 편이 아예 안 서는 것보다 낫다.
     */
    const taken = new Set<string>();

    /**
     * 이 아바타의 XZ 반경(m)을 **실측한다.**
     *
     * 차선 오프셋이 이 값에서 유도되므로(`decide/npc-lane.ts`) 숫자를 적어 두면 아바타를
     * 갈아 끼우는 순간 갈라진다 — 이 저장소가 세 번 데인 형태다. 치비와 VRM 은 몸집이
     * 다르고, 감독 지시대로 둘 다 나중에 교체될 수 있다.
     *
     * 체당 한 번, 부팅 때만 잰다. 걷는 동안 팔다리가 움직여 폭이 조금 변하지만, 차선
     * 판정은 그 정도 흔들림에 좌우되지 않는다(창의 폭이 그보다 훨씬 넓다).
     */
    function bodyRadiusOf(inst: WalkAvatar): number {
      const box = new THREE.Box3().setFromObject(inst.group as unknown as THREE.Object3D);
      if (box.isEmpty()) return 0; // 잴 것이 없다 — 차선은 성립하지 않고, 그건 0 이 답한다
      return Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    }

    /** 걷는 사람 하나를 거리에 세운다. 아바타 종류는 여기서만 갈린다 */
    function spawn(inst: WalkAvatar, kind: Walker['kind']): boolean {
      // 이미 누가 선 칸은 비켜 앉는다. 자리가 동나면 배제 없이 다시 골라 — 겹쳐서라도
      // 세우는 편이 아예 안 서는 것보다 낫다(그 경우 위 `spawnReach` 가 이미 최대다).
      const start =
        pickNearby(hpx, hpz, SPAWN_RING, spawnReach, rnd, cellX, cellZ, taken)
        ?? pickNearby(hpx, hpz, SPAWN_RING, spawnReach, rnd, cellX, cellZ);
      if (!start) return false; // 걸을 곳이 없는 세계 — 있을 수 없지만 조용히 멈춘다
      taken.add(cellKey(start.px, start.pz));
      group.add(inst.group as unknown as THREE.Object3D);
      const radius = bodyRadiusOf(inst);
      const w: Walker = {
        inst,
        kind,
        cell: start,
        from: null,
        x: start.px * cellX,
        z: start.pz * cellZ,
        tx: start.px * cellX,
        tz: start.pz * cellZ,
        ry: 0,
        speed: WALK_MIN + rnd() * (WALK_MAX - WALK_MIN),
        // 우측통행 — **전원 같은 규칙**이다. 체마다 무작위로 갈라 두면 같은 방향으로
        // 걷는 두 체가 서로 반대 차선에 놓여 오히려 마주치고, 대향이 같은 차선에 놓인다.
        lane: laneOffset(radius),
        radius,
        ox: 0,
        oz: 0,
        rx: start.px * cellX,
        rz: start.pz * cellZ,
        shown: true,
      };
      retarget(w);
      walkers.push(w);
      return true;
    }

    for (let i = 0; i < count; i++) {
      if (!spawn(createChibiAvatar(), 'chibi')) break;
    }

    // ── VRM 은 비동기다 ───────────────────────────────────────────────────────
    // 파일을 fetch 해야 하므로 조립 시점에 준비되지 않는다. 로드가 끝나면 그때 거리에
    // 합류시킨다 — 그동안 치비들은 이미 걷고 있다. 실패해도 월드는 그대로다.
    let vrmCost: unknown = null;
    let vrmBones: unknown = null;
    let vrmError: string | null = null;
    /** 실제로 선 VRM 체 수. 복제가 중간에 실패하면 요청보다 적다 — 진단에 싣는다 */
    let vrmPlaced = 0;
    if (vrmCount > 0) {
      loadVrmAvatar(VRM_MALE.url!, (err) => { vrmError = String(err); })
        .then((r) => {
          if (!r || disposed) { r?.avatar.dispose(); return; }
          vrmCost = r.cost;
          // 본 매칭 결과를 진단에 싣는다. 못 찾으면 T-포즈로 미끄러지는데, 화면을 보기
          // 전까지 알 수 없었던 것이 실제 사고였다(감독이 스크린샷으로 잡았다).
          vrmBones = r.bones;

          /** 세우고 예열까지 걸어 준다. 원본과 복제본이 **같은 경로**를 타야 한다 */
          const place = (inst: WalkAvatar): boolean => {
            if (!spawn(inst, 'vrm')) { inst.dispose(); return false; }
            // VRM 은 비동기라 예열 창을 이미 지났을 수 있다. 합류하는 체만 다시 연다.
            setCulling(walkers[walkers.length - 1], false);
            vrmPlaced++;
            return true;
          };

          if (!place(r.avatar)) return;
          // ── 나머지는 **복제**다 ─────────────────────────────────────────
          // 파일을 다시 로드하면 GLTFLoader 가 매번 파싱해 지오·재질이 체 수만큼
          // 늘어난다 — 개수 불변식이 그 자리에서 깨지고, 그게 성능 리포트를 통째로
          // 오염시킨다. `clone` 은 뼈대만 새로 만들고 지오·재질은 공유한다.
          for (let i = 1; i < vrmCount; i++) {
            const c = r.clone();
            if (!c) break; // 복제 불가 — 있는 만큼만. 그 사실은 진단의 vrmPlaced 에 남는다
            if (!place(c)) break;
          }
          warmLeft = Math.max(warmLeft, WARM_FRAMES);
        })
        .catch((err) => { vrmError = String(err); });
    }

    /** 다음 칸을 정하고 목표 좌표를 세운다. 갈 곳이 없으면 제자리에 둔다 */
    function retarget(w: Walker) {
      const d = nextDir(w.cell.px, w.cell.pz, w.from, rnd, cellX, cellZ);
      if (!d) { w.tx = w.x; w.tz = w.z; return; }
      const s = stepOf(d);
      w.cell = { px: w.cell.px + s.px, pz: w.cell.pz + s.pz };
      w.from = d;
      w.tx = w.cell.px * cellX;
      w.tz = w.cell.pz * cellZ;
    }

    /** 플레이어 근처 도로로 데려온다. 자리를 못 찾으면 그대로 둔다(다음 프레임에 다시 본다) */
    function recycle(w: Walker, px: number, pz: number) {
      // 재배치도 같은 밴드를 쓴다 — 인원이 많으면 넓어진 밴드로 돌아와야 그 인원이
      // 다시 한 줌에 몰리지 않는다. 여기서는 점유를 안 본다(스폰과 달리 상시 벌어지는
      // 일이라, 자리 다툼으로 재배치가 실패하면 그 체가 영영 멀리 남는다).
      const c = pickNearby(px, pz, SPAWN_RING, spawnReach, rnd, cellX, cellZ);
      if (!c) return;
      w.cell = c;
      w.from = null;
      w.x = w.tx = c.px * cellX;
      w.z = w.tz = c.pz * cellZ;
      // 차선 오프셋도 되돌린다. 재배치는 위치가 통째로 바뀌는 일이라, 이전 진행방향에서
      // 얻은 오프셋을 들고 가면 새 길에서 엉뚱한 쪽에 서 있게 된다. 0 에서 다시 붙는다.
      w.ox = 0;
      w.oz = 0;
      // **그린 자리도 같이 옮긴다**(검수관 R3). 이 프레임에 이미 처리된 이웃은 이 체의
      // `rx` 를 보고 회피를 정하는데, 그 값이 순간이동 **전** 좌표면 아무도 없는 자리를
      // 피하게 된다. 은닉 중인 체도 `rx` 가 얼어 있어 재등장 프레임에 같은 창이 열린다.
      w.rx = w.x;
      w.rz = w.z;
      retarget(w);
    }

    /** 이 아바타의 모든 메시에 절두체 컬링을 켜고 끈다 */
    function setCulling(w: Walker, on: boolean): void {
      w.inst.group.traverse((o) => {
        const m = o as { isMesh?: boolean; isSkinnedMesh?: boolean; frustumCulled?: boolean };
        // VRM 은 스킨드라 이미 컬링이 꺼져 있다(본이 움직이면 바운딩이 어긋나 몸이
        // 통째로 사라진다). 거기까지 켜면 안 되므로 일반 메시만 되돌린다.
        if (m.isSkinnedMesh) return;
        if (m.isMesh) m.frustumCulled = on;
      });
    }

    /**
     * 지금 화면에 있는 두 체 중 가장 가까운 거리(m). 두 체 미만이면 `null`.
     *
     * **실제로 그린 자리(`w.rx`)를 본다** — 경로 좌표(`w.x`)가 아니다. 차선 오프셋이
     * 실제로 얹혔는지를 보는 것이 목적이므로, 얹기 전 값을 보면 아무 의미가 없다.
     *
     * 진단이 호출될 때만 돈다(체 7이면 21쌍).
     *
     * ⚠ 여기 *"프레임 루프에 넣지 않는다 — 이 처방이 매 프레임 쌍 검사를 피하려고 고른
     * 것"* 이라 적혀 있었다. **틀린 문장이라 지운다**(검수관 R2, 2026-08-03). 앞사람
     * 회피가 들어오면서 프레임 루프도 이웃을 훑는다(7체면 42쌍/프레임). 피한 것은 쌍
     * 검사가 아니라 **위치를 밀어내는 것**이었다 — 도로 이탈이 기각 사유였으니까.
     * 비용은 n=7 이라 무시 가능하다. 틀린 주석을 남기면 다음 사람이 같은 판단을 한다.
     */
    function minPairDistance(): number | null {
      const on = walkers.filter((w) => w.shown);
      if (on.length < 2) return null;
      let min = Infinity;
      for (let i = 0; i < on.length; i++) {
        for (let j = i + 1; j < on.length; j++) {
          const a = on[i];
          const b = on[j];
          const d = Math.hypot(a.rx - b.rx, a.rz - b.rz);
          if (d < min) min = d;
        }
      }
      return Number(min.toFixed(2));
    }

    for (const w of walkers) setCulling(w, false);
    let warmLeft = WARM_FRAMES;

    const system = {
      name: 'npc',
      update(ctx: { dt: number }) {
        const dt = Math.min(ctx.dt, 0.1); // 탭 복귀 시 한 프레임에 순간이동하지 않게

        // ── GPU 업로드 예열 ─────────────────────────────────────────────
        // 컬링을 끈 채 몇 프레임 지나면 모든 메시가 한 번씩 렌더 목록에 올라 업로드가
        // 끝난다. 그 뒤 되돌리면 `geometry` 가 세션 내내 상수가 된다.
        //
        // ⚠ **컬링만 꺼서는 안 된다** (2026-08-02, 회차 0 실측 + 팀장 판정 A).
        // 아래 안개 은닉이 쓰는 `visible=false` 는 절두체보다 **앞단**이라, 컬링을
        // 꺼도 그 체들은 렌더 목록에 아예 안 올라간다. 그래서 예열이 안개 안쪽 체만
        // 굽고 있었다 — NPC 는 걸어다니므로 부팅 순간의 안개 안/밖 분포가 세션마다
        // 다르고, `geometries` 가 358~403 으로 흔들렸다(3회×3라운드 실측).
        //
        // 이 사각은 CLAUDE.md 검증 규율이 이미 이름 붙여 둔 것이다 — *"`info.memory`
        // 는 객체 생성이 아니라 **첫 렌더**에 오른다. 재워둔(`visible=false`) 메시는
        // 렌더 목록에 안 올라 GPU 자원이 아예 없다."* 그런데 바로 아래 은닉 코드의
        // 주석은 *"개수 불변식에는 영향이 없다"* 고 적고 있었다. **그 문장이 틀렸고,
        // 이 커밋에서 함께 고친다**(틀린 주석을 남기면 다음 사람이 같은 판단을 한다).
        //
        // `warming` 을 `--warmLeft` **앞에서** 읽는 이유: 컬링을 되돌리는 프레임까지
        // 표시를 유지해야 세 프레임이 온전히 예열 구간이 된다. 뒤에서 읽으면 마지막
        // 프레임에 은닉이 먼저 걸려 한 프레임을 잃는다.
        const warming = warmLeft > 0;
        if (warmLeft > 0 && --warmLeft === 0) {
          for (const w of walkers) setCulling(w, true);
        }
        const p = env.player.position;
        const ppx = Math.round(p.x / cellX);
        const ppz = Math.round(p.z / cellZ);
        // 재배치 임계와 **은닉 임계는 다른 값이다**(팀장 판정 2026-08-02, 본편 ①).
        // 오래 하나로 썼고 그것이 이번 회차가 찾아낸 결함이다 — 아래 `show` 주석 참조.
        const recycleFar = RECYCLE_CELLS * cellX;
        const fogFar = fogBand(cellX).far;

        for (const w of walkers) {
          // ── 멀어졌으면 앞쪽으로 ─────────────────────────────────────────
          if (Math.hypot(w.x - p.x, w.z - p.z) > recycleFar) recycle(w, ppx, ppz);

          // ── 목표로 걷는다 ───────────────────────────────────────────────
          const dx = w.tx - w.x;
          const dz = w.tz - w.z;
          const dist = Math.hypot(dx, dz);
          let moving = 0;
          if (dist > ARRIVE) {
            const step = Math.min(dist, w.speed * dt);
            w.x += (dx / dist) * step;
            w.z += (dz / dist) * step;
            // yaw 관례(`yaw=0 → -Z`)는 `decide/npc-walk.ts` 가 소유한다. 차선 오프셋이
            // 이 각을 입력으로 받으므로, 식이 두 곳에 있으면 사람이 반대쪽으로 비켜선다.
            const ry = yawOf(dx, dz);
            if (ry !== null) w.ry = ry;
            moving = w.speed;
          } else {
            retarget(w);
          }

          // ── 안개 밖이면 끈다 ────────────────────────────────────────────
          // `visible=false` 는 three 가 renderList 등재 **전에** 컷하므로 드로우콜이 실제로
          // 준다.
          //
          // ⚠ 여기 *"개수 불변식에는 영향이 없다 — 객체는 그대로 있고 그리지만
          // 않는다"* 고 적혀 있었다. **틀린 문장이라 지운다**(2026-08-02).
          // 객체가 있는 것과 GPU 에 올라간 것은 다른 일이다 — `info.memory` 는 **첫
          // 렌더**에 오르므로, 한 번도 그려지지 않은 체의 지오메트리는 카운트에 아예
          // 없다. 그래서 이 한 줄이 위쪽 예열을 무력화하고 있었다.
          //
          // 예열 중에는 거리를 보지 않는다. 그래야 안개 밖 체까지 한 번씩 그려져
          // 업로드가 끝나고, `geometries` 가 부팅 순간의 배치와 무관해진다.
          // ⚠ **임계가 재배치 거리였다 — 주석은 안개를 말하는데 값은 딴 것이었다.**
          // 재배치 거리가 안개 차단보다 멀어서 그 사이 구간의 체를 계속 그렸다. 안개
          // 밖은 **정의상 화면 기여 0** 이므로 그만큼이 통째로 버려졌다. 디자이너 실측
          // (2026-08-02): 정지 8조합에서 NPC 화면 픽셀 기여 0.007~0.114%, 알아볼 수
          // 있는 사람 **0명**. 그 상태로 드로우콜 +100 을 냈다.
          //
          // 그리고 이 값이 `shown` 진단으로 나가 **내 판정을 한 번 오도했다** —
          // `shown=7` 을 "안개 안 7체" 로 읽고 *"멀어서 안 보인다는 배제됐다"* 고 적었다.
          //
          // 이제 안개 SSOT 에서 유도한다(`decide/fog.ts`). **거리 숫자를 여기 적지
          // 않는다** — 주석에 적는 것도 미러링이고 이번 사고가 정확히 그 형태였다.
          const show = warming || Math.hypot(w.x - p.x, w.z - p.z) <= fogFar;
          if (show !== w.shown) {
            w.shown = show;
            w.inst.group.visible = show;
          }

          if (!show) continue; // 안 보이는 사람의 애니메이션까지 돌릴 이유가 없다

          // ── 차선으로 비켜선다 (감독 지적 2026-08-03, 팀장 판정 A) ────────
          // 경로(`w.x`,`w.z`)는 파셀 중심을 잇는 **정확한 격자선**이다. 그 선을 그대로
          // 밟으면 마주 오는 두 체가 확률이 아니라 **필연으로** 겹친다 — 감독이 본
          // "치비끼리 뚫고 지나간다" 가 그것이다. 경로는 그대로 두고 **그리는 자리만**
          // 오른쪽으로 옮긴다(우측통행). 걷기 판정·격자 위상은 손대지 않는다.
          //
          // 목표로 **걸어서** 간다 — 모퉁이에서 방향이 90° 꺾이는 순간 오프셋을 그냥
          // 갈아 끼우면 사람이 옆으로 순간이동한다. 속도를 자기 걷는 속도로 묶으면
          // 새 상수를 만들지 않고도 자연스러운 폭이 나온다(옆걸음이 앞걸음보다 빠를
          // 이유가 없다).
          // ── 앞사람을 미리 비킨다 (감독 지시 2026-08-03) ──────────────────
          // *"앞에 있으면 사람처럼 점점 옆으로 이동하게, 그 옆을 스쳐갔다가 다시
          // 중앙으로 오게 해줘."*
          //
          // 비키는 것은 **차선 오프셋뿐**이다 — 경로(`w.x`,`w.z`)는 안 만진다. 그래서
          // 격자 위상이 어떤 경우에도 안 깨진다(팀장이 근접 반발을 기각한 사유가
          // 도로 이탈이었고, 이 형태에는 그 사유가 성립하지 않는다). 총량은
          // `clampLane` 이 차도 안에 가둔다.
          //
          // **"다시 중앙으로" 는 따로 만들지 않았다.** 앞이 비면 회피량이 0 이 되고,
          // 아래 추종이 그 목표를 걷는 속도로 따라가므로 저절로 차선으로 돌아온다.
          // 복귀를 별도 상태로 두면 "지금 복귀 중인가" 를 관리해야 하고, 그 상태가
          // 틀어지는 순간 사람이 길 옆에 붙어 굳는다.
          //
          // ⚠ **판정을 여기서 조립하지 않는다** (검수관 반려 B1·B2, 2026-08-03).
          // 처음에는 목표를 여기서 만들었다 — 회피량(지금 선 자리 기준의 **증분**)을
          // 차선(**절대 위치**)에 더했다. 두 기준을 섞은 것이라 비켜설수록 목표가
          // 물러났고, 추월에서 필요량의 **정확히 절반**만 벌어졌다. 검사는 같은 값을
          // 증분으로 검증해서 **양쪽 다 통과**했다.
          // 이제 `laneTarget` 이 **절대 목표**를 내고 여기서는 더할 것이 없다.
          const seen: Ahead[] = [];
          for (const o of walkers) {
            if (o === w || !o.shown) continue;
            seen.push(relativeTo(w.ry, o.rx - w.rx, o.rz - w.rz));
          }
          // 벌릴 간격은 유도한다. 상대 반경은 이웃마다 다르지만, 가장 큰 체를 기준으로
          // 잡으면 어느 조합에서도 부족하지 않다.
          const widest = walkers.reduce((m, o) => (o.radius > m ? o.radius : m), 0);
          const target = laneTarget(
            seen,
            relativeTo(w.ry, w.ox, w.oz).side, // 지금 얹고 있는 오프셋의 오른쪽 성분
            w.lane,
            w.radius + widest,
            lookAhead(w.speed, w.speed + WALK_MAX),
            w.radius,
          );
          const next = stepLane(w.ox, w.oz, w.ry, target, w.speed * dt);
          w.ox = next.ox;
          w.oz = next.oz;
          w.rx = w.x + w.ox;
          w.rz = w.z + w.oz;
          w.inst.group.position.set(w.rx, 0, w.rz);
          w.inst.group.rotation.y = w.ry;
          w.inst.update(dt, moving);
        }
      },
      dispose() {},
    };

    return {
      system,

      diagnostics: () => ({
        chibi: walkers.filter((w) => w.kind === 'chibi').length,
        vrm: walkers.filter((w) => w.kind === 'vrm').length,
        shown: walkers.filter((w) => w.shown).length,
        // 한 체의 실측 비용. 화면에서 "사람이 좀 늘었네" 로만 보이는 비용을 숫자로
        // 드러내는 것이 이 항목의 목적이다. 값은 레지스트리가 들고 있다(값 미러링 금지).
        chibiEach: CHIBI.cost,
        // VRM 은 로드해 봐야 아는 값이라 실측을 그대로 싣는다.
        vrmCost,
        // found < wanted 면 그만큼 관절이 굳어 있다. 0 이면 T-포즈다.
        vrmBones,
        // 요청한 체 수와 실제로 선 수. 다르면 복제가 중간에 실패했다는 뜻이고,
        // 그 사실이 어디에도 안 남으면 "왜 세 체만 있지" 를 추적할 수가 없다.
        vrmWant: vrmCount,
        vrmPlaced,
        vrmError,
        // ── 차선이 실제로 소비되는가 (감독 지적 2026-08-03) ──────────────────
        // 이 둘은 **집행 쪽을 보는 유일한 창**이다. `decide/npc-lane.ts` 의 순수 함수는
        // 테스트가 직접 부르지만, "계산된 값이 실제로 `group.position` 에 얹히는가" 는
        // 양쪽 테스트 어디에도 안 걸린다 — CLAUDE.md 가 이름 붙인 판정/집행 경계의
        // 구멍이고, 이번 회차에 B1 이 정확히 그 자리로 샜다.
        //
        // `lanes` 는 체별 오프셋(0 이면 그 몸집에 차선이 성립하지 않았다는 뜻).
        // `minPairDist` 는 **실제 렌더 좌표** 기준 가장 가까운 두 체의 거리다 —
        // 오프셋이 계산만 되고 안 얹히면 대향 순간에 0 으로 떨어진다.
        //
        // ⚠ **게이트가 아니라 관측이다.** 대향이 언제 생길지는 확률이라, 이 값이 큰
        // 것이 처방이 들었다는 증거가 못 된다. 작으면 볼 것이 생긴다는 뜻일 뿐이다.
        lanes: walkers.map((w) => Number(w.lane.toFixed(3))),
        minPairDist: minPairDistance(),
        // 인원에 맞춰 넓힌 스폰 밴드(셀). 기본값(`SPAWN_REACH`)보다 크면 **안개 시작을
        // 넘어 태어난 체가 있다**는 뜻이다 — 인원이 많을 때는 피할 수 없지만, 그
        // 사실이 감춰지면 본편 ① 이 고친 결함과 구별되지 않는다.
        spawnReach,
        spawnReachBase: SPAWN_REACH,
      }),

      /**
       * **드로우콜 판정을 유예한다**(`null`).
       *
       * ── 왜 상태 키로는 안 되는가 (감독 리포트가 알려줬다) ──────────────────
       * 처음에는 보이는 체 수를 키에 넣었다(`c6v1`). 그런데 리포트에서 같은 키 안에서
       * draw 가 **28~121 로 흔들렸다.**
       *
       * `shown` 은 **안개 거리** 기준인데, 실제로 그려질지는 **절두체**가 정한다.
       * 카메라를 돌리는 것만으로 치비 한 체(45 드로우콜)가 들락날락하므로, 거리로 만든
       * 키는 실제 변동 요인을 담지 못한다. 카메라 방향을 키에 넣을 수는 없다 — 연속값
       * 이라 그룹이 무한히 갈라진다.
       *
       * 그래서 사람이 있는 동안에는 draw 표본을 **판정에서 뺀다.** 계약이 그 용도로
       * `null` 을 두고 있고, 뺀 개수는 리포트에 적힌다.
       *
       * 잃는 것이 없다: 세계(파츠)의 드로우콜이 상수인지는 `?npc=0` 대조군에서 정확히
       * 판정된다. 그것이 원래 이 불변식이 지키려던 것이고, 사람을 섞은 표본으로 "위반"
       * 을 띄우는 것은 오탐일 뿐이다.
       */
      drawGroupKey: () => null,

      dispose() {
        disposed = true;
        for (const w of walkers) {
          w.inst.group.removeFromParent();
          w.inst.dispose();
        }
        walkers.length = 0;
        group.removeFromParent();
      },
    };
  },
};
