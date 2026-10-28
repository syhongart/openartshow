/**
 * 🔴 **사람을 어디에 세우는가** — 스폰 밴드에서 자리를 고르고, 격자가 갈리면 다시 고른다.
 *
 * `features/npc.ts` 에서 떼어냈다(2026-09-22). 이유가 둘이다:
 * ① 이 회차에 붙는 판정 기록이 길고, 그 기록이 사는 자리는 **값 옆**이어야 한다.
 * ② `npc.ts` 가 파일 크기 상한을 넘었다(감독 지시 2026-08-16 *"파일사이즈 폭주 안되고
 *    모듈 관리 잘되게"*). 주석을 깎아 상한을 맞추는 것은 이 저장소가 이미 한 번 한
 *    일이고 **근거 22줄이 통째로 사라졌다**(`filesize-baseline.json` 의 `npc.ts` 항목이
 *    그 경위를 적고 있다). 같은 실수를 반복하지 않는다.
 *
 * ⚠ **밴드를 값으로 안 받는다 — 함수로 받는다.** `src`·`hpx`·`ring`·`reach`·`lanes` 는
 * 전부 공급자가 갈릴 때 함께 갈리는 것이고, 캐시해 넘기면 갈린 뒤 옛 밴드로 고르게 된다.
 * 이 저장소가 바로 그 형태로 데였다(늦게 읽는 클로저 계약 — `features/types.ts`).
 */
import { pickNearbyIn, cellKey, type Cell } from '../decide/npc-walk.js';
import type { Dir } from '../parts/road-topology.js';
import type { WalkSource } from '../decide/npc-walk.js';
import { laneOffset } from '../decide/npc-lane.js';

/** 지금 공급자의 스폰 밴드 한 벌. 호출 때마다 **다시 읽는다** */
export interface SeatBand {
  readonly src: WalkSource;
  /** 밴드의 중심 칸(플레이어 집) */
  readonly hpx: number;
  readonly hpz: number;
  /** 최소 거리(칸). 0 이면 플레이어가 선 칸에도 놓여 눈앞에 튀어나온다 */
  readonly ring: number;
  readonly reach: number;
  /** 이 공급자에서 차선이 성립하는가(`lanesOn`) */
  readonly lanes: boolean;
}

/** 자리를 옮길 수 있는 최소 조건. `Walker` 전체를 요구하지 않는다 */
export interface Seatable {
  cell: Cell;
  /** 걸어온 방향. 새 자리에서는 「온 곳이 없다」로 지운다 */
  from: Dir | null;
  x: number;
  z: number;
  tx: number;
  tz: number;
  ox: number;
  oz: number;
  rx: number;
  rz: number;
  lane: number;
  readonly radius: number;
}

export interface SeatDeps<W extends Seatable> {
  /** 지금 밴드. **매 호출 다시 읽는다** */
  band: () => SeatBand;
  rnd: () => number;
  /** 이미 누가 태어난 칸. 스폰에서만 본다 — 걷기는 자유다 */
  taken: Set<string>;
  /** 새 자리에서 목표를 다시 잡는다(`features/npc.ts` 의 `retarget`) */
  retarget: (w: W) => void;
}

export interface Seating<W extends Seatable> {
  /**
   * 지금 밴드에서 빈 자리를 하나 고른다. 이미 누가 선 칸은 비켜 앉고, 자리가 동나면
   * 배제 없이 다시 고른다 — 겹쳐서라도 세우는 편이 아예 안 서는 것보다 낫다
   * (그 경우 `reach` 가 이미 최대다).
   */
  pick(): Cell | null;
  /**
   * 🔴 **칸의 뜻이 바뀐 교체에서 몸을 새 자리로 옮긴다** — 스폰이 파셀 격자를 타던
   * 구조 결함의 수정이다.
   *
   * ── 무엇이 결함이었나 (실측 2026-09-22) ─────────────────────────────────
   * 스폰은 `create`(`pools` 단계)에서 끝나는데 그때 `env.walkGrid()` 는 켠 페이지에서도
   * **`null`** 이라 6체 **전부** 파셀 공급자(`cell: 32`)로 자리를 골랐다. 구운 격자가
   * 온 뒤 `reseat` 이 도는데 그쪽 계약은 **「칸만 다시 읽는다」** 라 몸은 옛 자리에
   * 그대로 남는다. 라이브 맨해튼 실측에서 스폰 6좌표가 **전부 32 의 배수**였다 —
   * `(-32,32) (32,32) (-32,-32) (0,32) (32,0) (-32,0)`. 세계가 바뀌어도 격자가
   * 스폰에는 **도달하지 않았다**(걷기에는 도달했다 — 그것이 직전 회차였다).
   *
   * ── 왜 `reseat` 을 넓히지 않고 별도 경로인가 (팀장 조건 C1) ───────────────
   * `reseat` 의 계약은 소비자 셋(`recycle`·`unstick`·공급자 교체)에 걸려 있고 「몸을
   * 옮긴다」의 근거는 **스폰 한 곳**뿐이다. 계약을 넓히면 그 뜻이 저 셋 모두에 번지고,
   * 증상은 원인에서 멀다. 자리를 다시 고르는 일은 이 함수에만 둔다.
   *
   * ── 🔴 판정: 이것 **단독**은 감독이 본 증상을 **악화시킨다** (실측 2026-09-22) ──
   * 감독 신고(*"치비 하나만 보여꼬"*)의 **처방으로 적지 않는다**(팀장 조건 C3) —
   * 「32m 링 → 하나만 보임」 연결은 추론이고, 실측은 반대를 말한다. 맨해튼 격자 위
   * 모바일 세로 390×844 · yaw 36방향 × 시드 8회 · 후보 ×1 기준:
   *
   * | 축 | 적용 전 | 적용 후 | 방향 |
   * |---|---|---|---|
   * | 걷기격자 차폐 후 **0체**인 방향 | 28/36 | 32/36 | **악화** |
   * | 절두체 체수 **중앙값** | 1 | 0 | **악화** |
   * | 절두체 **≤1체**인 방향 | 36/36 | 36/36 | 불변 |
   * | 벽에 **가려진 체** | 4/6 | 5/6 | **악화** |
   *
   * ⚠ **팀장 판정 A-3 의 문구(「두 축 반대 — 효과 불명」)는 이 수치로 대체됐다.**
   * 그 판정의 근거였던 A/B 표는 **가상 갈래**(조립 때부터 격자를 내주는, 구현하지 않은
   * 경로)를 잰 것이었다. 실제 구현은 그 갈래가 아니다 — 스폰은 여전히 파셀 격자에서
   * 일어나고 **첫 프레임에 다시 고른다.** 그래서 난수 소비 순서가 달라 자리 분포가
   * 가상 갈래와 갈리고, 두 축이 **같은 방향(악화)** 으로 모인다. **가상 갈래로 구현을
   * 대신 재면 안 된다** — 이 저장소가 그 형태로 이미 데였다.
   *
   * 그래서 이 수정은 밴드 거리 노브와 **한 회차**에 나간다(팀장 판정 A (나)).
   * 되돌리기 단위는 커밋 둘로 나눠 둔다. **판정은 감독 화면이다.**
   *
   * ⚠⚠ 「후보가 갈린다」와 「화면이 갈린다」는 다른 일이다. 적용 전에는 `?walkcell=`
   * 네 후보의 스폰 좌표가 **2/4 조합만** 달랐고(×1 과 ×0.5 가 **0.00m**, 즉 완전히 같은
   * 화면) 적용 후 **4/4** 가 됐다 — 그러나 후보 간 체별 이동이 **최대 0.77m** 로 칸 한
   * 변 수준이라 **화면에서는 여전히 같은 자리다.** 후보 축이 안 갈리는 것은 밴드가
   * `toCells()` 로 **실거리 기준**이라 격자 해상도를 바꿔도 링의 실반경이 안 변하기
   * 때문이다 — `?walkcell=` 은 원리상 스폰 비교의 축이 될 수 없다.
   *
   * ⚠⚠⚠ **경계 — 여기서 멈춘다.** 「공급자가 갈릴 때마다 몸을 옮긴다」로 넓히지
   * 않는다. 덧칠(`blockWalkFor`)은 제자리 수정이라 참조가 그대로고, 같은 칸 크기의
   * 재굽기는 옛 자리가 여전히 유효하다 — 그 경우 `reseat` 이 맞다. 순간이동은 세션당
   * 한 번(파셀→구운 격자)이면 족하다. 그 판정은 부르는 쪽(`features/npc.ts`)에 있다.
   */
  respawn(w: W): void;
  /**
   * 🔴 **공급자가 갈린 뒤, 몸이 선 자리에서 칸을 다시 읽는다.**
   *
   * 격자가 바뀌면 `w.cell` 은 **옛 공급자의 칸 인덱스**이고 `w.tx`/`w.tz` 는 옛 좌표계의
   * 목표다. 몸의 월드 좌표(`w.x`,`w.z`)만이 두 공급자에서 같은 뜻을 갖는다.
   *
   * ⚠ **`unstick`(갇힘 스냅)을 그대로 못 쓴다** — 그쪽이 부르는 `snapOut` 은 자기 칸을
   * 절대 안 돌려주므로(`npc-walk.ts` 의 `for (let r = 1; …)`) 멀쩡히 선 체까지 한 칸씩
   * 밀어내게 된다. 대신 **새 경로를 만들지 않는다**: 갈아 끼운 프레임의 걷기 루프가
   * 곧바로 `standable` 을 보고, 벽 안이면 그 자리에서 `unstick` 을 부른다(같은
   * 프레임이다). 여기서는 **칸을 다시 읽는 것**만 한다.
   *
   * ⚠⚠ **언제 불리는가가 2026-09-22 에 좁아졌다.** 그전에는 공급자 교체마다 이것이
   * 돌았고, 그래서 「몸이 옛 자리에 남는」 결함이 났다. 지금은 ① `respawn` 이 자리를
   * 못 고른 경우 ② **같은 칸 크기**의 재굽기 — 둘뿐이다.
   */
  reseat(w: W): void;
}

export function createSeating<W extends Seatable>(d: SeatDeps<W>): Seating<W> {
  const pick = (): Cell | null => {
    const b = d.band();
    return pickNearbyIn(b.src, b.hpx, b.hpz, b.ring, b.reach, d.rnd, d.taken)
      ?? pickNearbyIn(b.src, b.hpx, b.hpz, b.ring, b.reach, d.rnd);
  };
  const reseat = (w: W): void => {
    const b = d.band();
    w.cell = b.src.at(w.x, w.z);
    w.from = null;
    // 차선 오프셋과 그린 자리를 되돌린다 — `recycle`·`unstick` 의 같은 두 줄과 근거가
    // 같고, 여기에는 **하나가 더 있다.** 구운 격자에서는 차선이 꺼지므로(`lanesOn`)
    // 걷기 루프가 `w.ox` 를 **다시는 안 만진다** — 안 되돌리면 파셀 격자에서 얻은
    // 오프셋(최대 1.25m)이 세션 내내 얹힌 채 남아 몸이 걸을 수 있는 칸에서 그만큼
    // 밀려난다. 그리고 그 방향은 **벽 쪽일 수 있다**(`lanesOn` 이 차선을 끈 이유가
    // 정확히 그것이다).
    //
    // ⚠ **이 네 줄이 도달하는지는 지금 미지다.** 2026-09-19 의 뮤테이션 M-C 는 「도달
    // 불가」를 실측했지만(지워도 39 검사 통과) 그때는 공급자 교체가 **언제나** 이 함수로
    // 왔다. 이제는 위 `respawn` 이 먼저 받고 이쪽은 두 갈래(자리 고갈 · 같은 칸 크기
    // 재굽기)로만 온다 — **옛 실측을 그대로 인용하면 안 된다.** 재측정 전까지 지우지
    // 않는다. 증상이 「치비가 벽에 붙어 걷는다」라 원인에서 가장 멀다.
    w.ox = 0;
    w.oz = 0;
    w.rx = w.x;
    w.rz = w.z;
    d.retarget(w);
  };
  return {
    pick,
    reseat,
    respawn(w: W): void {
      const seat = pick();
      // 새 격자에 설 곳이 없다 — 옛 처리로 되돌린다(자리를 잃는 것보다 낫다)
      if (!seat) { reseat(w); return; }
      const b = d.band();
      d.taken.add(cellKey(seat.px, seat.pz));
      const at = b.src.center(seat.px, seat.pz);
      w.cell = seat;
      w.from = null;
      w.x = at.x;
      w.z = at.z;
      w.tx = at.x;
      w.tz = at.z;
      w.ox = 0;
      w.oz = 0;
      w.rx = at.x;
      w.rz = at.z;
      // 차선은 공급자마다 성립 여부가 다르다(`lanesOn`) — 옛 공급자에서 얻은 오프셋을
      // 물려받지 않는다. 구운 격자에서는 0 이 나온다.
      w.lane = laneOffset(w.radius, b.lanes ? undefined : 0);
      d.retarget(w);
    },
  };
}
