// world-shared/glb-city-visibility.ts — **세운 채가 파셀과 생사를 같이하는 규칙.**
//
// ── 왜 `glb-city.ts` 에서 갈라져 나왔나 (2026-08-20) ─────────────────────────
// 등장 연출(감독 판정 *"자라나는 느낌이 아닌데?"*)을 더하자 본체가 1,141 → 1,235줄이 됐고
// `check:filesize` 가 막았다(감독 지시 2026-08-16 — *"파일사이즈 폭주 안되고 모듈 관리
// 잘되게"*). 게이트가 준 선택지는 **쪼개거나 근거를 대거나**였고, 쪼개는 쪽이 옳았다:
// 여기 있는 것은 **로드·배치와 다른 관심사**다(그쪽은 «어떻게 세우나», 여기는 «세운 것을
// 언제 보이나»). 실제로 이 파일은 three 를 **하나도 안 쓴다** — 그래서 스텁 없이 노드에서
// 그대로 돈다.
//
// ⚠ 소비자는 `glb-city.ts` 의 재수출을 통해 접근한다(배럴). 이 저장소가 `space-render.js`
// 에서 쓰는 형태와 같다 — 옮겼다고 import 경로가 흔들리면 그것 자체가 회귀다.
//
// ⚠⚠ **world2 전용이 아니다.** world3·world5 도 `glb-city.ts` 를 함께 쓰므로 여기에
// `world2/` 를 import 하면 팀장 규칙 R2 위반이다(*"공유 모듈이 특정 세계를 알면 공유가
// 아니다"*). 세계마다 다른 것(등장 연출을 쓰는가)은 **주입**으로만 들어온다.

/**
 * 세운 채 하나 — 노드와 **그 채가 선 파셀**. 파셀과 생사를 맞추려면 둘 다 필요하다
 * (감독 지시 2026-08-19).
 *
 * ⚠ **파셀을 여기서 계산해 들고 있는다.** `holder.position` 에서 매 프레임 나눗셈으로
 * 되짚을 수도 있지만, 그러면 프레임마다 산술이 생기고 배치 규칙(`placementCells`)이
 * 아는 것을 소비 쪽이 다시 유도하게 된다 — 액자가 `placed` 에 `px·pz` 를 들고 있는 것과
 * **같은 처방**이다(`artwork-scene.ts` 의 «걸 때 한 번 계산해 여기 둔다»).
 */
export interface PlacedCopy {
  /**
   * 씬에 붙은 홀더. **`scale` 이 등장 연출의 통로**다 — `placeGrid` 가 이 홀더의 스케일을
   * 건드리지 않으므로(실측: 이 파일에 `scale` 대입이 배치 시점에 0건) 기준은 늘 1 이고,
   * 배수를 그대로 `setScalar` 하면 된다. ⚠ 배치가 스케일을 쓰기 시작하면 이 전제가 깨진다.
   */
  readonly node: { visible: boolean; scale: { setScalar(v: number): void } };
  readonly px: number;
  readonly pz: number;
  /**
   * 🔴 **파셀이 이 채를 원하는가** — `syncVisibility` 가 정하고 `advanceGrow` 가 집행한다.
   *
   * ⚠ **`visible` 과 갈라 놓은 것이 이번 회차의 변경이다**(감독 판정 2026-08-20 —
   * *"자라나는 느낌이 아닌데?"*). 그전에는 `syncVisibility` 가 `visible` 을 **직접**
   * 뒤집었고, 그래서 미술관은 한 프레임에 통째로 나타났다. 마을 파츠·액자는 0 에서
   * 자라는데(`parcel-grow.ts` · W8-10) 미술관만 아니었다.
   *
   * 목표(`want`)와 지금 화면(`node.visible`·`node.scale`)을 갈라야 그 사이를 시간이
   * 채울 수 있다. 판정과 집행의 분리이고, 이 저장소가 `decide/` 로 이미 쓰는 형태다.
   */
  want: boolean;
}

/**
 * 🔴 **세운 채들을 파셀과 맞춘다.** `system.update` 가 프레임마다 이것만 부른다.
 *
 * ── 왜 함수로 뽑았나 ────────────────────────────────────────────────────────
 * `create()` 안의 클로저에 두면 시험할 수 없다 — `create` 는 GLB 로더를 실제로 부르고
 * 그 경로는 노드에서 안 돈다. 밖으로 내면 가짜 노드(`{visible}` 하나)로 실제 동작을 잰다.
 * 이 저장소가 「경계를 건너는 지점은 아무도 안 본다」를 반복 사고로 적어 둔 자리다.
 *
 * ⚠ **첫 판본은 이 이유를 «13.5MB GLB 가 필요해 노드에서 불가능» 이라고 적었고 그것이
 * 이 함수 하나에만 참이었다** — 바로 아래 `placeGrid` 는 three 를 주입받아 **스텁으로
 * 돈다**(검수관 블로커 B1). 근거를 넓게 적어 놓고 그 옆 경계를 무검사로 뒀다.
 *
 * ⚠ **상태가 변할 때만 대입한다** — 매 프레임 무조건 쓰면 «이 값이 언제 바뀌었나» 를
 * 프로파일러에서 못 읽는다. 바뀐 개수를 돌려주는 것도 그래서다(진단·검사가 그것을 센다).
 *
 * @returns 이번 호출에서 **실제로 바뀐** 채의 수
 */
export function syncVisibility(
  copies: readonly PlacedCopy[],
  loaded: ((px: number, pz: number) => boolean) | undefined,
): number {
  // 판정 수단이 없으면 **아무것도 안 한다.** world3·world5 가 그 경우이고, 그때 이
  // 기능은 예전처럼 늘 보인다 — 결함이 아니라 그 세계의 사실이다.
  if (!loaded) return 0;
  let changed = 0;
  for (const c of copies) {
    const on = loaded(c.px, c.pz);
    // ⚠ **`node.visible` 이 아니라 `want` 다.** 화면 반영은 `advanceGrow` 소관이고,
    // 그 사이의 시간이 등장 연출이 사는 자리다(감독 판정 2026-08-20). 여기서 직접
    // 뒤집으면 그 자리가 없어진다 — 그것이 이 회차 전의 코드였다.
    if (c.want !== on) { c.want = on; changed++; }
  }
  return changed;
}

/**
 * 🔴 **목표(`want`)를 향해 한 걸음 굴리고 화면에 반영한다** (감독 판정 2026-08-20 —
 * *"자라나는 느낌이 아닌데?"*).
 *
 * ── 왜 산술을 여기서 하지 않고 주입받는가 ──────────────────────────────────
 * 등장 배수의 식은 **`world2/decide/lod-fade.ts`** 소유다. 마을 파츠(`parcel-grow.ts`)와 액자(`artwork-scene.ts`)가 **같은 모듈의 같은
 * 노브·같은 이징**을 쓴다 — `?grow=` 는 `readParcelAnim()` 한 곳에서만 읽히고 세 갈래로
 * 흘러간다(`main.ts` → 마을 파츠 / `artwork-scene.ts:98` → 액자 / 이 파일 → 미술관).
 * 그래서 감독이 `?grow=` 로 판정하면 **셋이 함께 변한다.**
 *
 * ⚠ **`scaleAdvance` 를 실제로 호출하는 것은 액자와 미술관뿐이다**(검수관 블로커 C3
 * 실측 — `parcel-grow.ts:27-29` 는 `lod-fade` 에서 **상수·헬퍼만** 가져다 쓰고
 * 자체 루프를 돈다). 첫 판본은 *"마을 파츠와 액자가 이미 그 함수를 쓴다"* 고 적었고
 * **거짓이었다** — `lod-fade.ts` 원문의 *"같은 **식**을 쓴다"* 를 옮겨 적으면서
 * **「같은 함수 호출」로 바뀌었다.** 결론은 우연히 참이었지만 근거가 틀렸고, 그 차이가
 * 중요하다: `scaleAdvance` 의 `fresh`(순간 이동)와 되감기 금지(`from`)는 **마을 파츠에
 * 아예 없는 개념**이라, 다음 사람이 그 문장을 믿고 `scaleAdvance` 를 고치면 마을 파츠는
 * 안 따라온다.
 *
 * 이 파일은
 * world3·world5 도 함께 쓰므로 `world2/` 를 import 할 수 없고(팀장 규칙 R2 —
 * *"공유 모듈이 특정 세계를 알면 공유가 아니다"*), 식을 여기 옮겨 적으면 **값 미러링**이
 * 된다. 그래서 **세계가 함수를 주입**한다. `parcelLoaded` 와 같은 선택적 계약이다.
 *
 * ⚠ **`copyScale` 이 없으면 즉시 반영**한다 — world3·world5 가 그 경우이고, 결과가
 * 이 회차 전과 **정확히 같다**(한 프레임에 on/off). 그 세계들의 룩을 이 변경이 건드리지
 * 않는 것이 요구다.
 *
 * ⚠ **화면 표시는 배수가 정한다**(`k > 0`). 그래서 퇴장 수축도 같은 문으로 들어온다 —
 * 다만 `readParcelAnim()` 의 `shrink` 기본값이 **0** 이라 지금은 즉시 사라진다.
 * 감독이 `?shrink=` 로 켤 수 있고, **켤지 말지는 감독 판정이다**(백로그 `G-ART9`).
 *
 * ⚠ **못 하는 것**: 부분 가시(`G-ART6`) · 실제 GPU 예열 시점 · 프레임 시간.
 *
 * @returns 이번 프레임에 실제로 화면을 바꾼 채의 수
 */
export function advanceGrow(
  copies: readonly PlacedCopy[],
  dt: number,
  copyScale: ((id: number, up: boolean, dt: number) => number | null) | undefined,
): number {
  let changed = 0;
  for (let i = 0; i < copies.length; i++) {
    const c = copies[i]!;
    if (!copyScale) {
      // 연출 없는 세계 — 목표를 그대로 화면으로. **변할 때만 대입**(기존 규약 유지).
      if (c.node.visible !== c.want) { c.node.visible = c.want; changed++; }
      continue;
    }
    const k = copyScale(i, c.want, dt);
    // `null` = 목표에 이미 닿았다. 「변할 때만 대입」을 **산술 쪽이 보증**한다
    // (`scaleAdvance` 의 계약 그대로 — 여기서 다시 비교하지 않는다).
    if (k === null) continue;
    // ⚠ 배수 0 을 그대로 넣지 않는다 — 스케일 0 행렬은 역행렬이 없고, 그 상태로
    // `updateMatrixWorld` 가 도는 자리가 이 트리 안에 있다(`placeGrid` 의 명시적 갱신).
    // 어차피 `visible = false` 라 그려지지 않으므로 눈에 보이는 차이는 없다.
    c.node.scale.setScalar(Math.max(k, MIN_DRAW_SCALE));
    const on = k > 0;
    if (c.node.visible !== on) c.node.visible = on;
    changed++;
  }
  return changed;
}

/**
 * 배수 0 을 대신하는 최솟값. **연출 상수가 아니다** — `START_SCALE`(0.02, 등장이 시작하는
 * 크기)과 목적이 다르므로 그 값을 끌어오지 않는다. 이것은 **행렬 특이점 회피**이고,
 * 눈에 띄면 안 되므로 작을수록 좋다.
 */
const MIN_DRAW_SCALE = 1e-4;
