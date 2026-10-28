// world-glb/systems/player.ts — 이동 입력 → 위치.
//
// 이동 계산은 순수 함수로 떼어 둔다. 현행에서 이동·카메라·충돌이 한 함수에 엉켜
// "대각선이 빠른" 정규화 버그를 오래 못 잡았는데, 그건 계산만 따로 볼 수 없어서였다.
//
// ⚠ 그 순수 함수들은 이제 **`decide/move.ts` 에 있다**(2026-08-19 분해). 이 파일에
// 남은 것은 **상태를 가진 것**뿐이다 — 위치·시선·궤도·물·충돌을 프레임마다 굴리는 일.
// 왜 떼어냈고 왜 더 잘게 안 갈랐는지는 그 파일 헤더 한 곳이다.

import type { FrameCtx, System } from '../kernel.js';
import { stepSubmersion, eyeYAt, underwaterAlpha, swimSpeedMult } from '../decide/swim.js';
import { orbitAt, orbitStep, pitchTo, type ViewPreset } from '../decide/orbit.js';
import type { PlayerOptions } from './player-options.js';
import {
  moveDelta, moveFromAxes, facing, stepBobPhase, bobHeight, clampPitch,
  NO_INPUT, BOB_AMPLITUDE, WALK_SPEED, RUN_MULT, LIFT_MAX, RESTORE_STEP, type MoveInput,
} from '../decide/move.js';
import { flyDelta, clampFlyLift, FLY_SPEED_MULT, type FlyInput } from '../decide/fly.js';

// ── 재수출 — **소비자를 한 곳도 안 고치기 위해서다** ────────────────────────
// 제품 2곳과 테스트 9개가 이 경로로 `moveDelta`·`WALK_SPEED`·`facing` 등을 가져간다.
// 분해가 「행위 불변」이려면 그들이 보는 표면이 그대로여야 하고, 재수출이 그것을
// 컴파일 단계에서 보증한다(빠뜨리면 `tsc` 가 소비자 쪽에서 빨간불을 낸다).
export type { PlayerOptions } from './player-options.js';
export {
  moveDelta, moveFromAxes, facing, stepBobPhase, bobHeight, clampPitch,
  NO_INPUT, BOB_AMPLITUDE, BOB_FREQ, WALK_SPEED, RUN_MULT, LIFT_MAX, RESTORE_STEP,
} from '../decide/move.js';
export type { MoveInput } from '../decide/move.js';

export class PlayerSystem implements System {
  readonly name = 'player';

  private x: number;
  private z: number;
  private yaw = 0;
  private pitch = 0;
  private readonly speed: number;
  private readonly eye: number;
  private readonly bobAmp: number;
  private readonly apply?: PlayerOptions['applyCamera'];
  private input: MoveInput = { ...NO_INPUT };
  /** 아날로그 축(조이스틱). 키보드 입력과 **합산하지 않고** 큰 쪽을 쓴다 */
  private axes = { x: 0, z: 0 };
  /** 실제로 움직인 방향(스트리밍 look-ahead용). 멈추면 마지막 방향을 유지한다 */
  private moveDir = { x: 0, z: 0 };
  /**
   * 실제로 낸 속력 ÷ 걷기 속도, 평활값(0~1). 스트리밍 look-ahead 가 읽는다.
   *
   * **1 로 시작한다** — 아직 한 번도 안 움직인 것은 *"막혔다"* 가 아니다. 0 으로 두면
   * 부팅 직후 가만히 서 있는 동안 look-ahead 가 접혀, 이 필드가 생기기 전의 동작(항상
   * 전개)이 이유 없이 바뀐다.
   */
  private moveFactor = 1;
  /** 헤드밥 위상(rad) */
  private bobPhase = 0;
  /**
   * 헤드밥 강도(0~1). 목표값을 **바로 쓰지 않고 따라가게** 하는 이유는 출발·정지 때문이다 —
   * 속력을 그대로 쓰면 키를 떼는 순간 흔들림이 툭 끊겨 화면이 튄다.
   */
  private bobIntensity = 0;

  /**
   * **편집 궤도의 가산 눈높이(m). 주행에서는 언제나 0 이다.**
   *
   * `eye`(위 `readonly`)를 안 건드리는 것이 팀장 조건 1 이다 — 그것은 생성자가 정하는
   * 주행의 값이고, 수평선 밴드(`decide/horizon.ts`)가 `get eyeHeight()` 로 읽어 간다.
   * 편집이 그것을 밀면 **편집 중에 수평선이 따라 움직인다.**
   *
   * 상한을 여기가 소유한다(`LIFT_MAX`) — 소비자가 각자 클램프하면 «휠은 막히는데
   * 드래그는 안 막힌다» 같은 형태가 난다.
   */
  private lift = 0;
  /**
   * **비행의 가산 눈높이(m).** 궤도의 `lift` 와 **칸이 다르다.**
   *
   * 🔴 한 칸을 쓰면 «비행으로 100m 올라간 뒤 궤도를 돌리면 40m 로 툭 떨어진다» 가 된다 —
   * `orbit()` 이 `LIFT_MAX`(40) 로 클램프하기 때문이고, 그 40 은 **궤도의 목적**에서 나온
   * 값이다(`decide/move.ts` 의 `LIFT_MAX` 주석). 비행의 목적은 정확히 그 반대라 상한이
   * 다르고(`decide/fly.ts`), 상한이 다른 둘이 한 칸을 공유할 수는 없다.
   *
   * ⚠ **그래도 팀장 조건 ②의 「`lift` 소비 지점」은 지켜진다** — 칸이 둘이어도 눈높이에
   * 더해지는 자리는 `eyeLift` 하나다(아래). 그 조건이 막으려던 것은 «어디서 눈높이가
   * 더해지는지 모르게 되는 것» 이지 칸 개수가 아니다.
   */
  private flyLift = 0;
  /**
   * 🔴 **이번 프레임에 실제로 날았는가.** `update()` 가 읽고 바로 지운다.
   *
   * ── 왜 필요한가 (검수관 반려 B2) ────────────────────────────────────────
   * 주행 키 리스너는 `main.ts` 가 소유하고 **부팅부터 dispose 까지 산다** — 편집이 켜져도
   * 안 뗀다(`edit/input.ts` 가 *"조작 중에도 WASD 로 걸어다닐 수 있어야 한다"* 로 그것을
   * 의도한다). 비행이 같은 WASD 를 쓰므로 **한 번의 `keydown` 이 걷기와 비행을 동시에**
   * 켰다. 검수관 실측: 수평 속력이 `5 + 15 = 20 m/s` 로 **걷기의 4배**, 상승각이 57.3° →
   * **43.8°** 로 납작해지고, 주행 성분이 `resolveMove` 를 타서 **나는 중에 벽에 막혔다.**
   * 그리고 공중에서 헤드밥이 최대 강도로 돌았다.
   *
   * 그 셋이 각각 문서화된 계약을 거짓으로 만든다 — *"충돌을 안 태운다"*,
   * *"위를 보고 앞으로 가면 올라간다"*, `FLY_SPEED_MULT = 3` 의 유도.
   *
   * ⚠ **해소를 여기서 한다 — 주행 경로에 편집 분기를 심지 않는다.** 팀장 조건 ②의
   * *"편집에서만"* 은 «편집 전용 코드가 주행 경로에 있으면 안 된다» 이고, 이 칸은
   * **비행이 스스로 세우고 주행이 읽어 넘어가는** 형태라 그 경계를 안 넘는다.
   */
  private flew = false;
  /**
   * 궤도를 **시작한 자리**. 없으면 궤도 중이 아니다.
   *
   * 이 자리는 주행으로 도달한 곳이라 **반드시 유효**하고, 그래서 `endOrbit()` 의 충돌
   * 복원이 여기서 출발한다(팀장 조건 3).
   */
  private orbitFrom: { x: number; z: number } | null = null;

  /** 잠김 정도(0~1). `decide/swim.ts` 가 시간으로 진행시킨다 */
  private submersion = 0;
  /**
   * 마지막으로 밟은 물의 수면 높이. 물 밖으로 나오는 **도중**에 쓴다.
   *
   * 물이 아니면 수면 높이가 없는데(`null`), 그렇다고 틴트를 0 으로 끊으면 뭍에 발을
   * 딛는 순간 물속 화면이 툭 사라진다 — 아직 눈이 수면 아래인데도. 마지막 수면을
   * 기억해 두면 눈이 실제로 올라오는 동안 틴트가 자연히 옅어진다.
   */
  private lastSurfaceY: number | null = null;
  private readonly waterSurfaceY?: PlayerOptions['waterSurfaceY'];
  private readonly resolveMove?: PlayerOptions['resolveMove'];
  private readonly seabed: number;
  private readonly onSubmerge?: PlayerOptions['onSubmerge'];

  constructor(opts: PlayerOptions = {}) {
    this.speed = opts.speed ?? WALK_SPEED;
    this.eye = opts.eyeHeight ?? 1.7;
    this.bobAmp = opts.bobAmplitude ?? BOB_AMPLITUDE;
    this.x = opts.start?.x ?? 0;
    this.z = opts.start?.z ?? 0;
    // `?? 0` 이 아니라 조건이다 — 아래 `yaw` 필드 초기값이 0 이고, 여기서 다시 0 을
    // 대입하면 "기본값을 두 곳이 적는" 형태가 된다.
    if (opts.start?.yaw !== undefined) this.yaw = opts.start.yaw;
    if (opts.start?.pitch !== undefined) this.pitch = clampPitch(opts.start.pitch);
    this.apply = opts.applyCamera;
    this.waterSurfaceY = opts.waterSurfaceY;
    this.resolveMove = opts.resolveMove;
    // 기본값을 두지 않는다 — 물 판정을 안 주면 어차피 안 쓰이고, 숫자를 여기 적으면
    // `decide/water.ts` 의 `SEABED_Y` 와 값 미러링이 된다.
    this.seabed = opts.seabedY ?? 0;
    this.onSubmerge = opts.onSubmerge;
  }

  setInput(input: Partial<MoveInput>): void {
    this.input = { ...this.input, ...input };
  }

  /** 조이스틱 축을 넣는다. x=우, z=앞(음수가 전진 — 화면 위로 민 것). */
  setAxes(x: number, z: number): void {
    this.axes.x = Number.isFinite(x) ? x : 0;
    this.axes.z = Number.isFinite(z) ? z : 0;
  }

  /** 마우스 델타(픽셀)를 시선에 반영한다. 감도를 여기서 곱한다. */
  look(dx: number, dy: number, sensitivity = 0.0025): void {
    this.lookBy(-dx * sensitivity, -dy * sensitivity);
  }

  /**
   * **라디안 델타**를 직접 더한다. 감도를 이미 적용한 호출자(터치 조작)가 쓴다 —
   * `look()`에 넘기면 감도가 두 번 곱해진다.
   */
  lookBy(yawDelta: number, pitchDelta: number): void {
    if (Number.isFinite(yawDelta)) this.yaw += yawDelta;
    if (Number.isFinite(pitchDelta)) this.pitch = clampPitch(this.pitch + pitchDelta);
  }

  // ── 편집 궤도 (W5 E3, 팀장 판정 (A-2)+(D) 2026-08-13) ──────────────────────
  //
  // **이 클래스 사상 첫 위치 쓰기 문이다.** 그전까지 `x`·`z` 는 `update()` 만 움직였고
  // 밖에서는 `get position()` 으로 읽기만 됐다.
  //
  // ── 왜 «좌표» 가 아니라 «중심 + 델타» 인가 (팀장 (A-1) 기각) ────────────────
  // `moveTo(x, z)` 를 열면 **임의 순간이동**이 가능해지고, 그 문은 이번 용도보다 언제나
  // 넓다. 여기서는 편집이 «어디로» 를 정하지 못하고 «이 중심 주위로 얼마나» 만 말한다 —
  // 산술·충돌·복원 책임이 소유자(이 클래스)에 남는다.
  //
  // ── 충돌을 안 태운다 (팀장 판정 3) ─────────────────────────────────────────
  // 궤도의 주 사용례가 **건물 사이·건물 주위**다. 충돌로 원호가 끊기면 도구로서 실패한다
  // (안 넣느니만 못하다). 실해는 «편집을 끄는 순간 갇힘» 하나뿐이므로 매 프레임이 아니라
  // **종료 지점 한 곳**에서 막는다 — `endOrbit()`.
  //
  // ⚠ **주행은 이 문을 안 쓴다.** 편집(`?edit=1`)에서만 불리고, 그것을
  // `tests/world2-player-orbit.test.ts` 의 호출처 축이 지킨다.

  /**
   * 대상을 중심으로 **한 걸음 돈다.** 시선은 늘 그 대상을 향한다.
   *
   * @param cx,cy,cz  궤도 중심(월드). `cy` 는 내려다보는 각을 정한다
   * @param dYaw      이번에 돌 각(rad)
   * @param dHeight   눈높이 증분(m). 위로 올라가면 내려다보게 된다
   * @param kRadius   반경 배수(1 = 그대로)
   */
  /**
   * **편집 비행 한 프레임**(감독 지시 2026-08-19 *"내가 하늘을 날아서 보고 편집하게"*).
   *
   * 궤도와 **같은 규율 3종**(팀장 조건 ②)을 그대로 받는다:
   *   ① **편집에서만 불린다** — 주행 경로에는 호출부가 없다(`edit/` 만 부른다)
   *   ② **`orbitFrom` 을 공유한다** — 그래서 `endOrbit()` 의 걸어서 복원이 비행에도 그대로
   *      걸린다. 따로 두면 «날아간 뒤 편집을 끄면 벽 안에 선다» 를 각자 또 풀어야 한다
   *   ③ **눈높이 소비 지점을 공유한다** — `eyeLift` 하나(위)
   *
   * ⚠ **충돌을 안 태운다** — 궤도와 같다(팀장 판정 3). 나는 중에 벽에 막히면 그것은
   * 비행이 아니다. 지면 아래로 못 가게 막는 것은 `clampFlyLift` 의 하한 0 이다.
   *
   * ⚠⚠ **이 문장은 한동안 거짓이었다**(검수관 반려 B2). 주행이 같은 프레임에 겹쳐 돌았고
   * 그 성분은 `resolveMove` 를 탔다 — 수평의 4분의 1이 벽에 막혔다. 지금은 `flew` 가
   * 주행 적분을 건너뛰게 해서 참이다. **계약을 적는 것과 계약이 성립하는 것은 다른 일이고,
   * 이 회차가 그 차이로 반려를 받았다.**
   *
   * @param maxLiftMeters 고도 상한(**미터**). 셀→미터 변환은 `flyLiftMeters()` 가 하고,
   *   그것을 부르는 것은 세계 크기를 아는 배선 쪽이다 — 이 클래스는 레이아웃을 모른다.
   */
  flyBy(input: FlyInput, dt: number, maxLiftMeters: number): void {
    const d = flyDelta(input, this.yaw, this.pitch, this.speed * FLY_SPEED_MULT, dt, RUN_MULT);
    // 🔴 **변위가 0 이면 아무것도 안 한다 — 특히 `orbitFrom` 을 안 세운다**(검수관 반려 B1).
    //
    // 첫 판본은 이 검사 없이 무조건 세웠다. 그때 하강이 `Shift` 였고 그것은 **주행의
    // 달리기 키이기도** 해서, 편집 중에 그냥 달리기만 해도 루프가 깨어나 여기 들어왔다 —
    // `flyDelta` 가 `NO_DELTA` 를 내는데도 복원 출발점이 섰다.
    //
    // ⚠ **그 「Shift」 부분은 지금 옛말이다**(검수관 반려 B5, 2026-08-19). 하강이 `KeyC` 로
    // 옮겨졌고 `fly-input` 이 수식키를 통째로 거르므로 **그 경로 자체가 없다.** 그런데
    // 이 문장이 그대로 남아 있던 판본에서는 더 나빴다 — 검수관 지적대로 `Shift` 가
    // `down` 이던 회차에는 `dy ≠ 0` 이라 **이 가드를 그냥 통과했고**, 와이어 토글
    // (`Shift+Z`) 한 번이 「편집을 끄면 출발 자리로」 복원을 조용히 무장시켰다.
    //
    // **가드 자체는 유지한다** — 그 경로가 사라졌다고 가드를 빼면, 다음에 비슷한 키가
    // 들어올 때 방어가 없다. 지금 이것이 막는 것은 「입력은 있는데 변위가 0인 프레임」
    // 일반이고, 아래 검사가 그 축을 잰다.
    //
    // 검수관 실측: 벽을 우회해 40m 걸은 뒤 편집을 끄면 **32m 뒤 벽 앞으로 튄다**(비행 키를
    // 한 번도 안 누른 대조 세션은 0m). `endOrbit()` 의 복원은 **직선으로** 걸어가므로 벽에
    // 막히는데, 그 메서드 주석이 *"«편집을 껐더니 딴 데 서 있다» 가 되기 때문"* 이라며
    // 막으려던 바로 그 현상이다. **그 주석을 인용해 만든 배선이 그것을 되살렸다.**
    if (d.dx === 0 && d.dy === 0 && d.dz === 0) return;
    if (this.orbitFrom === null) this.orbitFrom = { x: this.x, z: this.z };
    this.x += d.dx;
    this.z += d.dz;
    this.flyLift = clampFlyLift(this.flyLift + d.dy, maxLiftMeters);
    this.flew = true;
  }

  /**
   * 편집이 더한 눈높이(m) — **궤도와 비행의 합.** 주행에서는 언제나 0 이다.
   *
   * 두 칸을 더하는 자리를 여기 하나로 좁힌다. 소비처가 셋(`update` 의 눈높이,
   * `orbit`·`orbitTo` 의 pitch 계산)이라 각자 더하면 **한 곳만 고쳐도 아무도 모르는**
   * 그 형태가 된다 — 이 저장소가 값 미러링이라 부르는 것.
   */
  private get eyeLift(): number { return this.lift + this.flyLift; }

  orbit(cx: number, cy: number, cz: number, dYaw: number, dHeight: number, kRadius: number): void {
    // 처음 도는 순간의 자리를 기억한다 — **주행으로 도달한 곳이라 반드시 유효**하고,
    // 그것이 `endOrbit()` 의 복원 출발점이 된다(팀장 조건 3).
    if (this.orbitFrom === null) this.orbitFrom = { x: this.x, z: this.z };

    const p = orbitStep({ x: this.x, z: this.z }, cx, cz, dYaw, kRadius);
    this.x = p.x;
    this.z = p.z;
    this.yaw = p.yaw;

    if (Number.isFinite(dHeight)) {
      this.lift = Math.min(LIFT_MAX, Math.max(0, this.lift + dHeight));
    }

    // 눈의 월드 y — **헤드밥은 뺀다.** 그것은 프레임마다 흔들리는 값이라 넣으면 시선이
    // 떨린다(궤도 중에는 안 걷고 있으므로 실제로도 거의 0 이다).
    const r = Math.hypot(p.x - cx, p.z - cz);
    this.pitch = clampPitch(pitchTo(this.eye + this.eyeLift, cy, r));
  }

  /**
   * **정해진 시점으로 간다** (탑·좌·우·정면, 그리고 `F` 확대). W6, 감독 지시 2026-08-13.
   *
   * ── 왜 `orbit()` 으로 안 되나 ───────────────────────────────────────────
   * 그쪽은 **델타**다 — 「지금 각에서 얼마나 더」. 「탑에서 본다」는 지금 각이 얼마든
   * **같은 자리로 간다** 는 뜻이라 델타로 표현할 수 없다. 편집에 현재 각을 알려 주면
   * 델타를 계산할 수 있지만, 그것은 문을 넓히는 쪽이다(팀장 판정 (A-2) 의 정신은
   * «편집이 어디로 갈지 못 정한다» 였다).
   *
   * **이 문은 오히려 더 좁다** — 편집은 임의 자세를 못 주고 `ViewPreset`(정해진 값)만
   * 고른다. 산술·클램프·충돌 기록은 전부 여기 남는다.
   *
   * ⚠ `orbit()` 과 같은 규율을 따른다: 충돌을 안 태우고, 시작 자리를 기억해
   * `endOrbit()` 이 갇힘을 푼다.
   */
  orbitTo(cx: number, cy: number, cz: number, preset: ViewPreset): void {
    if (this.orbitFrom === null) this.orbitFrom = { x: this.x, z: this.z };

    const p = orbitAt(cx, cz, preset, this.yaw);
    this.x = p.x;
    this.z = p.z;
    this.yaw = p.yaw;
    this.lift = Math.min(LIFT_MAX, Math.max(0, preset.lift));

    const r = Math.hypot(p.x - cx, p.z - cz);
    this.pitch = clampPitch(pitchTo(this.eye + this.eyeLift, cy, r));
  }

  /**
   * 편집을 끝낸다 — **주행 모델로 되돌린다.** 두 가지를 원복한다.
   *
   * ① **눈높이.** 리프트를 걷어 주행과 완전히 같은 상태가 된다.
   * ② **갇힘.** 궤도가 충돌을 무시하므로 벽 안에 서 있을 수 있다. 궤도를 시작한
   *    자리(주행으로 도달했으니 유효)에서 지금 자리로 **걸어가 본다** — 막히면 막힌
   *    자리에 선다. 순간이동으로 되돌리지 않는 이유는 감독이 편집 중에 실제로 이동한
   *    거리를 통째로 무르면 «편집을 껐더니 딴 데 서 있다» 가 되기 때문이다.
   *
   * ⚠ 충돌 판정을 안 받은 구성(`resolveMove` 미주입)에서는 ②가 **no-op** 이다 —
   * 그때는 애초에 벽이 없어 갇힐 수 없다.
   */
  endOrbit(): void {
    this.lift = 0;
    // 비행 고도도 여기서 걷는다 — **편집을 끄면 주행 모델로 완전히 돌아간다**가
    // 이 메서드의 계약이고, 한쪽만 걷으면 «편집을 껐는데 공중에 떠 있다» 가 된다.
    this.flyLift = 0;
    const from = this.orbitFrom;
    this.orbitFrom = null;
    if (from === null || !this.resolveMove) return;

    // ⚠⚠ **한 번에 넣지 않는다 — 검수관 반려(2026-08-13).**
    //
    // 첫 판본은 `resolveMove(from.x, from.z, 전체이동량)` 을 **한 번** 불렀고 그것이
    // 조용히 틀렸다. 충돌 구현(`systems/collision.ts` 의 `Collider.resolve`)은 **첫 인자
    // 자리 기준 3×3 파셀**만 캐시하는데(`rebuild`), 궤도는 최대 반경 80m 라 그 커버를
    // 넘게 움직일 수 있다. 그러면 목표 자리의 건물이 **캐시에 아예 없어** 통과한다.
    //
    // 검수관 실측: 건물 정중앙을 목표로 `resolve(0, 0, 100, 0)` → `{x:100, z:0}`(통과).
    // 같은 건물·같은 이동량인데 캐시가 목표 근처에서 만들어졌으면 완전히 막혔다.
    // **캐시가 어느 자리 기준인가**에 따라 갈린 것이다.
    //
    // 그래서 **걸어간다**: 짧은 걸음으로 나누면 걸음마다 캐시가 따라온다. 주행이 이
    // 전제 위에서 도는 것과 같다(한 프레임 이동량이 작아 문제가 안 됐다) — 궤도만
    // 한 번에 크게 움직여서 그 전제를 깼다.
    let x = from.x;
    let z = from.z;
    const totalX = this.x - x;
    const totalZ = this.z - z;
    const steps = Math.max(1, Math.ceil(Math.hypot(totalX, totalZ) / RESTORE_STEP));
    const sx = totalX / steps;
    const sz = totalZ / steps;
    for (let i = 0; i < steps; i++) {
      const next = this.resolveMove(x, z, sx, sz);
      // 완전히 막혔으면 더 가도 같다 — 남은 걸음의 캐시 재빌드 비용을 아낀다.
      if (next.x === x && next.z === z) break;
      x = next.x;
      z = next.z;
    }
    this.x = x;
    this.z = z;
  }

  update(ctx: FrameCtx): void {
    // 조이스틱이 기울어져 있으면 그것을 쓰고, 아니면 키보드를 쓴다. 둘을 더하지 않는
    // 이유: 합산하면 키보드+조이스틱 동시 입력에서 길이가 2에 가까워져 클램프가 걸리고,
    // 그 순간 조이스틱의 미세 조작이 통째로 무시된다.
    const stick = Math.hypot(this.axes.x, this.axes.z);
    // 물속에서는 무겁다. **직전 프레임의 잠김**을 쓴다 — 이번 프레임 잠김은 이동한
    // 뒤에야 정해지고(새 위치에서 판정한다), 한 프레임 지연은 화면에 안 보인다.
    const speed = this.speed * swimSpeedMult(this.submersion);
    // 🔴 **날았으면 걷지 않는다**(검수관 반려 B2 — 근거는 `flew` 주석 한 곳).
    // 플래그는 **읽는 즉시 지운다** — 안 지우면 키를 뗀 뒤에도 한 프레임이 아니라 영원히
    // 주행이 죽는다. 그리고 이 자리에서 `d` 를 0 으로 만들면 아래가 전부 따라온다:
    // 이동 0 · `moveDir` 유지 · `moved = 0` → **헤드밥도 0**(공중에서 흔들리지 않는다).
    const flew = this.flew;
    this.flew = false;
    const d = flew
      ? { dx: 0, dz: 0 }
      : stick > 0
        ? moveFromAxes(this.axes.x, this.axes.z, this.yaw, speed, ctx.dt, this.input.fast)
        : moveDelta(this.input, this.yaw, speed, ctx.dt);
    // **실제로 간 거리**를 따로 잡는다. 충돌이 붙은 뒤로 `d`(가려던 양)와 실제가 갈린다.
    let mx = 0;
    let mz = 0;
    // **가려고 했는가.** 아래 진행 계수가 이것을 본다 — "안 눌러서 안 감" 과 "눌렀는데
    // 못 감" 은 이동량만으로는 구별되지 않는다(둘 다 0 이다).
    const wanted = d.dx !== 0 || d.dz !== 0;
    if (wanted) {
      // 충돌을 안 주면 그대로 간다 — 예전 동작이 기본값이다.
      const next = this.resolveMove
        ? this.resolveMove(this.x, this.z, d.dx, d.dz)
        : { x: this.x + d.dx, z: this.z + d.dz };
      mx = next.x - this.x;
      mz = next.z - this.z;
      this.x = next.x;
      this.z = next.z;
      const l = Math.hypot(mx, mz);
      // 완전히 막혔으면 방향을 **갱신하지 않는다**. 0 으로 나누면 NaN 이 나가고,
      // 마지막으로 향하던 쪽을 유지하는 편이 화면에서도 자연스럽다.
      if (l > 0) this.moveDir = { x: mx / l, z: mz / l };
    }

    // 헤드밥 — 걷기 속도를 1로 본 비율로 흔든다.
    //
    // **이동량에서 역산한다**(입력 플래그가 아니라). 벽에 막혀 입력은 있는데 못 움직이는
    // 상황에서 제자리 흔들림이 남으면 그게 더 어색하다. 예전 이 주석은 *"지금은 충돌이
    // 없지만 나중에 붙어도 이 식은 그대로 맞다"* 라고 적고 있었는데 **절반만 맞았다** —
    // 식은 맞지만 `d`(가려던 양)를 넣고 있어서, 충돌이 붙는 순간 벽에 붙어 제자리 흔들림이
    // 남았을 것이다. 충돌을 붙이면서 **실제 이동량**으로 바꿔 그 문장을 참으로 만들었다.
    const moved = ctx.dt > 0 ? Math.hypot(mx, mz) / ctx.dt : 0;
    const ratio = this.speed > 0 ? moved / this.speed : 0;
    this.bobPhase = stepBobPhase(this.bobPhase, ratio, ctx.dt);
    // 지수 접근. dt 를 곱해 프레임레이트가 달라도 같은 시간에 같은 만큼 따라간다.
    this.bobIntensity += (Math.min(1, ratio) - this.bobIntensity) * Math.min(1, ctx.dt * 8);

    // ── 스트리밍용 진행 계수 (감독 실기기 2026-08-08) ──────────────────────────
    //
    // **헤드밥과 같은 원천에서 나오지만 별도 필드로 둔다.** 값이 같아 보인다고 공유하면
    // 다음에 한쪽 감각을 만질 때 다른 쪽이 조용히 딸려간다 — 이 저장소가 "값 미러링" 으로
    // 이름 붙인 것의 반대 형태(의도가 다른 둘이 한 값을 쓰는 것)다.
    //
    // 시상수를 헤드밥(dt×8)보다 **느리게**(dt×3, ~0.33초) 잡는다. 헤드밥은 걸음에 붙어야
    // 즉각적이어야 하지만, 스트리밍 판정은 급할수록 손해다 — 빨리 따라갈수록 경계에서
    // 자주 흔들린다.
    //
    // ⚠ **입력이 없으면 갱신하지 않는다 — 직전 값을 그대로 얼린다** (검수관 반려 B2).
    // 첫 판본은 입력 유무를 안 보고 `ratio` 만 먹였고, 그것이 **손을 뗀 정상 상태까지
    // "막혔다" 로 취급**했다. 그러면 `direction` getter 가 문서에 적어 둔 기능 — *"서서
    // 둘러볼 때 그쪽을 미리 올린다"* — 이 약 1초 만에 죽는다(τ=1/(3dt), 직접 계산).
    // 헤드밥은 반대로 **꺼져야** 맞으므로(제자리 흔들림) 위 `bobIntensity` 는 그대로 둔다.
    // 두 필드를 따로 둔 판단(바로 위 문단)이 여기서 값을 한다.
    //
    // 얼리는 것이 0/1 로 튀는 것보다 나은 이유: 끼인 채 눌렀다 뗐다 하면 목표를 1 로
    // 복원하는 설계는 look-ahead 를 0↔0.5셀(16m) 로 왕복시켜 **감독이 보고한 깜빡임을
    // 그대로 되살린다.** 얼리면 끼임 중에는 접힌 채 유지되고, 실제로 다시 걸어지는
    // 순간에만 회복된다.
    if (wanted) {
      this.moveFactor += (Math.min(1, ratio) - this.moveFactor) * Math.min(1, ctx.dt * 3);
    }

    // ── 물 (감독 지시 *"강에 사람이 빠지게해줘"*) ──────────────────────────────
    // **이동한 뒤에** 판정한다. 이동 전 좌표로 물어보면 물가를 넘어선 프레임에 아직
    // 뭍으로 읽혀, 잠김이 한 프레임 늦게 시작한다.
    const surface = this.waterSurfaceY?.(this.x, this.z) ?? null;
    if (surface !== null) this.lastSurfaceY = surface;
    this.submersion = stepSubmersion(this.submersion, surface !== null, ctx.dt);

    // 뭍에서의 눈높이(헤드밥 포함)를 만들어 넘긴다. 잠길수록 이 값의 기여가 줄어
    // **헤드밥이 저절로 잦아든다** — 물속에서 흔들림을 따로 끄는 코드가 필요 없다.
    // ⚠ **`lift` 를 여기서만 더한다.** `eyeYAt` 의 마지막 인자에는 안 넣는다 — 그것은
    // 물속에서 눈이 어디에 잠기는가를 정하는 값이고, 편집 궤도는 물 위 40m 를 다루므로
    // 잠김이 0 이라 관측 가능한 차이가 없다. 두 곳에 더하면 «떠 있는데 물속 틴트가
    // 걸린다» 같은 형태가 열린다.
    const groundEye = this.eye + this.eyeLift
      + bobHeight(this.bobPhase, this.bobIntensity, this.bobAmp);
    const eyeY = eyeYAt(this.submersion, groundEye, this.seabed, this.eye);

    this.apply?.(this.x, eyeY, this.z, this.yaw, this.pitch);
    // 물에 한 번도 안 닿았으면 수면이 없다 — 그때는 알파를 계산할 것도 없이 0 이다.
    this.onSubmerge?.(this.lastSurfaceY === null ? 0 : underwaterAlpha(eyeY, this.lastSurfaceY));
  }

  get position(): { x: number; z: number } { return { x: this.x, z: this.z }; }
  /**
   * 발바닥에서 눈까지(m). **읽기 전용으로 내주는 이유**: 수평선 밴드의 각도가 이 값에서
   * 나온다(`decide/horizon.ts`). 소비자가 `?eye=` 를 다시 읽으면 그 순간 값 미러링이고,
   * 감독이 눈높이를 바꾸는 날 수평선만 옛 높이에 남는다.
   *
   * **현재 눈의 월드 y 가 아니다** — 그것은 잠김에 따라 움직이므로 카메라에서 읽는다.
   */
  get eyeHeight(): number { return this.eye; }
  /**
   * 스트리밍이 "어느 쪽을 미리 올릴까" 에 쓰는 방향.
   * **소스는 `moveDir` 하나다** — 마지막으로 실제로 간 방향. 근거는 아래 본문.
   *
   * ⚠ 이 주석은 오래 *"소스가 둘이고 그 사이를 오간다 … 여기를 고치는 대신 진행 계수로
   * look-ahead 자체를 줄이는 쪽을 골랐다"* 라고 적고 있었다. 그 선택이 **틀렸다**(2026-08-09).
   * 당시 근거였던 감독 실기기 2026-08-08 *"분수대에 끼일때. 멀리있는 lod가 나왔다가
   * 안나왔다가 해"* 는 지금도 참이고, 그때 진단한 기전(어긋난 방향이 `lookAheadCenter` 를
   * 통해 판정 중심을 최대 1.0셀=32m 흔들어 LOD 히스테리시스 0.15~0.30셀을 압도한다)도 참이다.
   * **틀린 것은 처방이다** — 통로(look-ahead)를 좁혔을 뿐 원인(소스 이원화)을 남겼고,
   * 그래서 후진에서 같은 증상이 더 크게 재현됐다. 기록을 지우지 않고 여기 남긴다:
   * 다음에 "여기를 고치는 대신" 이 떠오르면 그것이 통로인지 원인인지부터 가른다.
   */
  get direction(): { x: number; z: number } {
    // ── 폴백을 없앴다 — **소스는 `moveDir` 하나다** (감독 지시 + 팀장 판정 2026-08-09) ──
    //
    // 원래 `(keys || stick) ? this.moveDir : facing(this.yaw)` 였고, 그 폴백의 명분은
    // 위 주석의 *"서서 둘러볼 때 그쪽을 미리 올린다"* 였다. **그 기능이 결함의 원인이었다.**
    //
    // 감독 실기기: *"지금 다 뒤로 후진했다가. 놓으면 앞이 갑자기 나타나"* ·
    // *"뒤로 뺄때 더빨리 lod가 동작하는 것 같기도해"*
    //
    // **후진은 두 소스가 정반대가 되는 유일한 조작이다.** 후진 중 `moveDir` 는 뒤를
    // 가리키다가 손을 떼는 순간 `facing` 이 앞을 가리킨다. 그 한 프레임의 뒤집힘이
    // **두 경로로 동시에** 새어 나갔다:
    //   ① `lookAheadCenter`(`systems/streaming.ts`) — 판정 중심이 1.0셀(32m) 점프
    //   ② `computeWant` 의 진행방향 보너스(`decide/stream.ts` 의 `toward`) — 로드 **우선순위** 역전
    //      (줄 번호를 안 적는다 — 검수관이 잡은 대로 이미 한 번 어긋났고, 줄 번호는
    //       고칠 사람이 없는 값 미러링이다)
    // ②는 처음에 못 봤다. look-ahead 만 끄는 처방을 먼저 집행했는데 그것은 ①만 막고
    // ②를 남기는 **반쪽**이었다(팀장이 확인하라고 지목해서 찾았다).
    //
    // ── 실측 (2026-08-09, 헤드리스 swiftshader, `?time=day&weather=clear`) ─────
    // 같은 probe 를 두 판본에 돌렸다 — 이 커밋(`98ab9f3`)과 그 부모(`d282b10`, 폴백 있음).
    // 각각 전진 2회·후진 2회, 4초 주행 뒤 손을 떼고 관찰한다.
    // **jump = 손 뗀 직후 800ms 의 교체 합**이고, 결함이 나타나는 자리가 여기다.
    //
    //   판본                  | 전진 jump retier | 후진 jump retier | 후진 jump 강등
    //   폴백 있음(d282b10)    |        0         |    **6**(3+3)    |   3+3 (전부 강등)
    //   폴백 없음(이 커밋)    |        0         |    **0**         |     0
    //
    // 후진 2회가 3·3 으로 **동일하게 재현**됐고 전진은 양쪽 다 0 이다. 교체가 전부
    // **강등**이라는 것이 결정적이다 — 손 떼는 순간 방향이 앞으로 뒤집혀 뒤쪽 파셀이
    // 내려간 것이고, 위 기전과 부호가 맞는다.
    //
    // ⚠ **push(주행) 구간은 두 판본을 직접 비교할 수 없다.** 전진 push retier 가
    // 폴백 있음 2 · 없음 16 으로 뒤집혀 있는데, 이건 회귀가 아니라 **출발 상태가 다른**
    // 것이다: 폴백이 있으면 부팅 직후 서 있는 동안에도 `facing` 이 앞을 가리켜 앞쪽
    // 파셀이 미리 승격돼 있고, 없으면 `moveDir={0,0}` 이라 발밑만 올라와 있다. 그래서
    // 걷기 시작할 때 승격이 몰린다(승10/강6 대 승1/강0, built 는 4 대 1 로 작다).
    // **화면에서 문제인지는 확인 못 했다** — 감독이 지적한 적 없는 축이고, 여기서 새
    // 축을 열지 않는다. 처방 후보(초기 `moveDir` 를 스폰 yaw 로 1회 설정)와 함께
    // 태스크로 남긴다.
    //
    // ⚠ 이 자리에 원래 *"폴백 있음 **후진 125 · 전진 4**"* 가 적혀 있었다. 그 수치를
    // 낸 스크립트는 스크래치 정리와 함께 사라져 **재현할 수 없어** 지웠다. 재현 못 하는
    // 수를 근거로 남기면 다음 사람이 그것과 새 실측을 비교하려 든다.
    //
    // ── 왜 look-ahead 를 끄지 않고 여기를 고쳤나 ────────────────────────────
    // 감독 반문: *"뒤로 가도 예측로딩 하면 안되나?"* — **맞는 지적이다.** 후진 중 뒤쪽을
    // 미리 올리는 것은 정상 동작이고, 그것까지 끄는 것은 원인이 아니라 **원인이 드러나는
    // 통로**를 막는 일이었다. 여기를 고치면 전·후진 예측 로딩을 **둘 다 지키면서**
    // 점프만 없앤다.
    //
    // ── 여기서 멈춘다 ──────────────────────────────────────────────────────
    // **"정지 중 시선 예측" 은 다시 넣지 않는다.** 그것이 이 고리의 시작이었다. 서서
    // 두리번거릴 때 보는 쪽을 미리 올리고 싶어지면, 방향을 갈아끼우는 방식이 아니라
    // 별도 축으로 설계한다 — 그때 이 문단을 먼저 읽어라.
    //
    // 부팅 직후 `moveDir` 는 `{0,0}` 이고 `lookAheadCenter` 가 그대로 발밑을 낸다.
    return this.moveDir;
  }

  /**
   * 실제 진행 정도(0~1). **가려던 양이 아니라 간 양**에서 나온다.
   *
   * 스트리밍 look-ahead 가 이것을 곱한다 — 막혀 있으면 0 에 가까워져 판정 중심이 발밑에
   * 고정된다. look-ahead 의 목적이 *"가려는 쪽 파셀을 미리 올린다"* 이므로, 못 가는
   * 동안 앞을 당겨 보는 것은 목적에 어긋난 채 경계만 흔드는 일이다.
   *
   * **입력이 없는 동안은 얼어 있다**(위 `update` 참조) — 손을 뗀 것은 막힌 것이 아니다.
   */
  get speedFactor(): number { return this.moveFactor; }
  get angles(): { yaw: number; pitch: number } { return { yaw: this.yaw, pitch: this.pitch }; }
  /** 잠김 정도(0~1). 0 = 마른 땅, 1 = 완전히 가라앉음 */
  get submerged(): number { return this.submersion; }
}
