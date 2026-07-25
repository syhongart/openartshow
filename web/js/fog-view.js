// fog-view.js — "플레이어가 바다 원경을 바라보는가" 순수 판정(WebGL 무관, 유닛테스트 가능).
//
// 용도: 오픈월드 fog 자동 전환(평소 프리셋 D / 바다 원경 응시 시 C). 판정만 담당하고
//   fog near/far 보간은 world.js update()가 한다(관심사 분리 → world.js diff 최소화).
//
// 좌표 관례(world.js와 동일): yaw=0 = -Z(북). 전방벡터 fwd = (-sin yaw, -cos yaw)
//   (world.js dirBonus/updateStreaming: fx=-sin(yaw), fz=-cos(yaw)).
// 바다 = 그리드 바깥 전 둘레. 경계 셀(px/pz가 0 또는 w-1/h-1)에서만 바다를 향할 수 있다.
//   바깥 법선: W(px<=0)→(-1,0), E(px>=w-1)→(+1,0), N(pz<=0)→(0,-1), S(pz>=h-1)→(0,+1).
//   코너 셀은 두(이상) 법선 중 시선과 가장 정렬된 것(max 내적)을 쓴다.
// 히스테리시스: 경계 시선이 임계각 근처를 오갈 때 target boolean 진동(깜빡임)을 막기 위해
//   진입은 엄격(반각 45°, cos≈0.707), 유지는 완화(반각 60°, cos=0.5) 임계를 쓴다.

const COS_ENTER = Math.cos(45 * Math.PI / 180); // ≈0.7071 — OFF→ON 진입(엄격)
const COS_EXIT = Math.cos(60 * Math.PI / 180);  // =0.5     — ON 유지(완화)

/**
 * 현재 파셀·시선이 "바다 원경 응시"인지 판정한다.
 * @param {number} px 현재 파셀 x 인덱스(getCurrentParcel)
 * @param {number} pz 현재 파셀 z 인덱스
 * @param {number} yaw 시선 yaw(rad, 0=-Z=북)
 * @param {number} w 그리드 가로 셀 수(manifest grid.w)
 * @param {number} h 그리드 세로 셀 수(grid.h)
 * @param {boolean} wasSea 직전 판정 상태(히스테리시스용)
 * @returns {boolean} 바다 원경 응시면 true
 */
export function isViewingSea(px, pz, yaw, w, h, wasSea) {
  const onW = px <= 0, onE = px >= w - 1, onN = pz <= 0, onS = pz >= h - 1;
  if (!(onW || onE || onN || onS)) return false; // 내부 파셀 → 바다 안 보임(평소 D)
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw); // 전방벡터(world.js 관례)
  let best = -1;
  if (onW) best = Math.max(best, fx * -1); // 서쪽 바다 법선 (-1,0)
  if (onE) best = Math.max(best, fx * 1);  // 동쪽 (+1,0)
  if (onN) best = Math.max(best, fz * -1); // 북쪽 (0,-1)
  if (onS) best = Math.max(best, fz * 1);  // 남쪽 (0,+1)
  return best >= (wasSea ? COS_EXIT : COS_ENTER);
}

// [시야 인지 스트리밍] "파셀이 플레이어 시야 뒤(배후)에 있는가" 판정. world.js updateStreaming의 EXIT
// 반경 축소(배후 언로드)에 쓰인다. isViewingSea와 동형의 각도 히스테리시스 — 진입(정면→배후)은 엄격
// (반각 135°), 유지(배후 상태 지속)는 완화(반각 100°)해 경계 시선 왕복 시 강등/승격 진동을 막는다.
const COS_BEHIND_ENTER = Math.cos(135 * Math.PI / 180); // ≈ -0.7071 — 정면→배후 진입(엄격)
const COS_BEHIND_EXIT = Math.cos(100 * Math.PI / 180);  // ≈ -0.1736 — 배후 유지(완화, 35° 데드존)

/**
 * 파셀이 플레이어 배후(시야 뒤)에 있는지 판정한다(각도 히스테리시스).
 * @param {number} rx 파셀 중심 − 플레이어 x 성분
 * @param {number} rz 파셀 중심 − 플레이어 z 성분
 * @param {number} yaw 시선 yaw(rad, 0=-Z=북)
 * @param {boolean} wasBehind 직전 배후 상태(히스테리시스용)
 * @returns {boolean} 배후면 true
 */
export function isBehind(rx, rz, yaw, wasBehind) {
  const dist = Math.hypot(rx, rz);
  if (dist < 1e-6) return !!wasBehind; // 파셀 중심과 겹침(내적 무의미) → 직전 상태 유지
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw); // 전방벡터(world.js 관례)
  const dot = (rx * fx + rz * fz) / dist;         // 정규화 내적(전방과의 코사인)
  return dot <= (wasBehind ? COS_BEHIND_EXIT : COS_BEHIND_ENTER);
}

// [fog 연동 배후 EXIT 하한 클램프] 배후 EXIT 축소(위 isBehind 소비처)는 원래 고정 ×0.75였는데, 프리셋별
// fog 도달거리(FOG_FAR)가 제각각이라(?lod=a 45.6m ~ d 28.8m) 축소 EXIT가 fog.far보다 안쪽이면 파셀
// 강등/소멸이 "안개 밖"에서 일어나 눈에 보인다. 각도 마진은 화면비 의존(16:9 수평 반FOV≈46.9° > 배후
// 임계 45°)이라 방어선이 못 된다 → 거리로 막는다.
const BEHIND_EXIT_K = 0.75;   // 기존 고정 축소 계수 — fog 미상용 시 폴백값이자 축소량 상한(=반경 하한)
const FULL_FOG_MARGIN = 0.85; // FULL→SHELL은 shell 실루엣이 잔존해 "펑 사라짐"이 아니므로 fog보다 살짝 안쪽 허용

/**
 * 배후 파셀의 EXIT 반경(full 유지 / shell 유지)을 현재 fog 도달거리로 클램프해 산출한다.
 *
 * 채택 기준: **완전 소멸 단계(SHELL→UNLOAD)의 EXIT ≥ 활성 fog.far** — 언로드가 항상 안개 안에서
 * 일어나도록 상수로 보장한다(프리셋 무관). FULL→SHELL은 강등 후에도 shell이 남으므로 fog.far의
 * 85%까지 완화한다.
 *
 * - **하한**(`Math.max`): 안개보다 안쪽에서 소멸/강등하지 않게 — 위 채택 기준 충족.
 * - **상한**(`Math.min`, 정상 EXIT): 배후 EXIT가 정상 EXIT를 넘으면 "배후인데 정면보다 더 오래 유지"라는
 *   모순이 생겨 축소 취지가 뒤집힌다. 동시에 이 상한 덕에 fog가 아주 옅은 프리셋(a)에선 축소량이 0으로
 *   수렴해 **변경 전 동작과 완전히 동일**해진다 → 이 변경으로 인한 신규 노출 0이 보장된다.
 *
 * fog가 없거나(null·포테이토 폴백) far가 비정상이면 기존 ×0.75 고정값으로 폴백한다(방어).
 *
 * @param {number} fullExit 정상 full 유지 반경(STREAM_FULL_EXIT)
 * @param {number} shellExit 정상 shell 유지 반경(STREAM_SHELL_EXIT)
 * @param {number} fogFar 현재 활성 fog 도달거리(scene.fog.far). 비유한·비양수면 폴백
 * @returns {{full:number, shell:number}} 배후 파셀에 적용할 EXIT 반경
 */
export function behindExitRadii(fullExit, shellExit, fogFar) {
  const floorFull = fullExit * BEHIND_EXIT_K, floorShell = shellExit * BEHIND_EXIT_K;
  if (!Number.isFinite(fogFar) || fogFar <= 0) return { full: floorFull, shell: floorShell }; // fog 없음 → 기존 고정 축소
  return {
    full: Math.min(fullExit, Math.max(floorFull, fogFar * FULL_FOG_MARGIN)),
    shell: Math.min(shellExit, Math.max(floorShell, fogFar)),
  };
}

// [시야 인지 스트리밍] 배후 강등 쿨다운 판정 — 강등 직후 같은 파셀이 곧바로 재강등되는 스래싱을 막는다
// (승격측 PROMOTE_COOLDOWN과 대칭). world.js updateStreaming의 tryDemote가 호출한다.
//
// 분리 기준: tryDemote의 게이트는 둘인데 성격이 다르다. 프레임 예산(MAX_DEMOTE_PER_FRAME)은 프레임마다
// 리셋되는 **가변 카운터**라 world.js에 남기고, 상태 없는 **시간 비교만** 여기로 옮겨 단위테스트 가능하게 했다.
// (헤드리스 계측으로는 쿨다운 창을 재현할 수 없어 — swiftshader RAF가 JS 스레드를 점유해 요청 지연이
//  실측과 한 자릿수 어긋난다 — 환경 무관한 상수 증명으로 갈음한다.)
//
// 동작 불변 근거 — 추출 전 world.js 원식은 **거부** 조건이었다:
//   `if (at !== undefined && nowMs - at < DEMOTE_COOLDOWN_MS) return false;`
// 이 함수는 그 정확한 부정(= 허용 조건)이다:
//   `at === undefined || now - at >= cooldownMs`
// 따라서 경과 === cooldownMs인 경계는 **허용**(원식 `<`가 거짓 → 거부 안 됨)이다. 부정 시 `<` → `>=`,
// `&&` → `||`로 뒤집히는 점에 주의(드모르간).
/**
 * 같은 파셀의 재강등이 쿨다운 창을 벗어나 허용되는지 판정한다.
 * @param {number|undefined} lastAt 이 파셀의 직전 강등 시각(ms). undefined = 한 번도 강등된 적 없음
 * @param {number} now 현재 시각(ms, perfNow)
 * @param {number} cooldownMs 재강등 억제 창 길이(DEMOTE_COOLDOWN_MS)
 * @returns {boolean} 강등 허용이면 true. 쿨다운 창 안이면 false
 */
export function canDemoteByCooldown(lastAt, now, cooldownMs) {
  if (lastAt === undefined) return true;  // 첫 강등 — 억제할 직전 기록이 없다
  return now - lastAt >= cooldownMs;      // 경계(경과 === cooldownMs)는 허용 — 원식 `< cooldownMs`(거부)의 부정
}
