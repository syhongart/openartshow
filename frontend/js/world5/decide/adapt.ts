// world2/decide/adapt.ts — 적응 품질 판정. 순수 함수만, import 0.
//
// ── 이 파일이 존재하는 이유 (이 세션에서 같은 자리에서 두 번 다쳤다) ──────────────
//
// 현행 `adaptQuality`는 101줄 한 함수에 제어기 4개가 들어 있고, 그 넷이 `adaptCooldown`
// 하나와 `liteMode` 하나를 공유한다. 거기서 버그가 두 번 났고 두 번 다 봉합으로 끝났다:
//
//   ① 적응계 자기모순 — `liteMode` 하나에 해상도와 그림자를 같이 매달아, fps<24인 최악
//      프레임에 `shadowMap.enabled`를 토글해 씬 전체 파이프라인을 재생성했다(실기기 CSV
//      render 2,639ms). 느려서 화질을 낮추는 코드가 그 순간 전면 재컴파일을 일으켰다.
//      → 처방은 플래그를 하나 더 추가한 것이었다.
//   ② 쿨다운 starvation — 그림자 블록이 `adaptCooldown`을 세워 같은 tick의 긴급 강등이
//      굶었다. → 처방은 순서를 바꿔 조기 return한 것이었다.
//
// 둘 다 원인이 "공유 상태"인데 처방은 상태를 늘렸다. 그래서 여기서는 **제어기마다 자기
// 상태를 갖고, 판정만 반환한다**(렌더러를 만지지 않는다). 집행은 커널의 몫이다. 그러면
// 두 제어기가 서로의 쿨다운을 굶길 방법이 구조적으로 없고, fps 시퀀스를 넣어 결정 시퀀스를
// 확인하는 테이블 테스트가 가능해진다.
//
// 그리고 **그림자 제어기를 두지 않는다.** 헤드리스 축 격리에서 그림자는 프레임에 기여가
// 없었다(현행 1,061ms / receiveShadow 126면 해제 1,104ms / 섀도맵 통째 off 1,133ms).
// 그런데 끄는 순간 WebGL 프로그램이 21→34로 늘었다 — `shadowMap.enabled`가 셰이더 캐시
// 키라 씬 전체가 재컴파일된다. 이득 0에 히칭만 만드는 강등이므로 처음부터 만들지 않는다.

/** 워밍업 — 부팅 직후 fps는 로딩 잔열이라 판정에 쓰지 않는다. */
export const WARMUP_MS = 3000;

// ── 해상도 제어기 ────────────────────────────────────────────────────────────
//
// 과거 이 산정식에서 no-op 버그가 **두 번** 났다. 둘 다 3줄 테스트로 잡혔을 것이다:
//   · dpr=1 일반 모니터에서 CEIL==FLOOR==1 → 긴급강등이 발동해도 1→1 "강등"(부하경감 0).
//     "저사양 데스크톱이 모바일보다 더 버벅이는 직접 원인"이었다.
//   · 고dpr(dpr>2.667)에서 FLOOR > CEIL → 하한이 상한을 넘어 적응계 전체가 no-op.
// 그래서 밴드 산정을 순수 함수로 떼고, `validResolutionBands`를 불변식으로 둔다.

export interface ResolutionBands {
  /** 평상시 목표 배율(=상한) */
  ceil: number;
  /** 위기 시 하한. dpr과 무관한 **절대** 하한을 함께 적용한다 */
  floor: number;
}

/** dpr 무관 절대 하한 — 이 값이 없으면 dpr=1 기기에서 강등 레버가 사라진다. */
export const ABS_FLOOR = 0.85;

export function resolutionBands(dpr: number, mobileCap: number): ResolutionBands {
  const d = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const ceil = Math.min(d, mobileCap);
  // 비율 하한과 절대 하한 중 **낮은 쪽**을 택해 항상 여유를 남긴다.
  // 그리고 ceil을 넘지 못하게 클램프 — 이게 고dpr에서 FLOOR>CEIL이 되던 것의 차단막이다.
  const floor = Math.min(ceil, Math.min(d * 0.6, ABS_FLOOR));
  return { ceil, floor };
}

/** 강등 레버가 실제로 존재하는가. floor < ceil 이 아니면 적응계는 no-op다. */
export function validResolutionBands(b: ResolutionBands): boolean {
  return Number.isFinite(b.ceil) && Number.isFinite(b.floor)
    && b.floor > 0 && b.ceil > 0 && b.floor < b.ceil;
}

export interface ControllerState {
  /** 남은 쿨다운(ms). 제어기마다 **독립**이다 — 공유 금지가 이 파일의 존재 이유다. */
  cooldownMs: number;
  /** 연속 하락/상승 관측 횟수(승급을 성급하게 하지 않기 위한 지속 조건) */
  downTicks: number;
  upTicks: number;
}

export const initialController = (): ControllerState => ({ cooldownMs: 0, downTicks: 0, upTicks: 0 });

export interface AdaptInput {
  fps: number;
  /** 부팅 후 경과(ms). WARMUP_MS 이전엔 판정하지 않는다 */
  ageMs: number;
  /** 판정 간격(ms) — 쿨다운 감쇠에 쓴다 */
  dtMs: number;
  /** 파셀 로딩 중인가. 로딩 스파이크를 실 성능 저하로 오진하지 않기 위한 게이트 */
  streaming: boolean;
  /** 문서가 숨겨졌는가. 비가시 스로틀의 인위적 저 fps를 집계하면 안 된다 —
   *  과거 창 blur 3초만으로 세션 영구 30fps 고착이 났다(배포 전 게이트가 잡았다) */
  hidden: boolean;
}

export interface ResolutionDecision {
  ratio: number;
  reason: 'demote' | 'promote';
}

export const DEMOTE_FPS = 24;
export const PROMOTE_FPS = 45;
export const COOLDOWN_MS = 1500;
/** 승급 지속 조건 — 한 번 좋아졌다고 바로 올리면 진동한다 */
export const PROMOTE_HOLD_TICKS = 30;

/**
 * 해상도 판정. 부수효과 0 — 결정과 다음 상태만 돌려준다.
 * `current`는 지금 적용 중인 배율(커널이 소유).
 */
export function decideResolution(
  st: ControllerState, input: AdaptInput, current: number, bands: ResolutionBands,
): { next: ControllerState; decision: ResolutionDecision | null } {
  const next: ControllerState = {
    cooldownMs: Math.max(0, st.cooldownMs - input.dtMs),
    downTicks: st.downTicks,
    upTicks: st.upTicks,
  };
  // 판정을 아예 하지 않는 조건들. 여기서 걸러야 인위적 저 fps가 상태를 오염시키지 않는다.
  if (input.hidden || input.ageMs < WARMUP_MS || input.streaming) return { next, decision: null };
  if (next.cooldownMs > 0) return { next, decision: null };
  if (!validResolutionBands(bands)) return { next, decision: null }; // 레버 없음 — 조용히 포기

  if (input.fps < DEMOTE_FPS && current > bands.floor) {
    next.downTicks++; next.upTicks = 0; next.cooldownMs = COOLDOWN_MS;
    return { next, decision: { ratio: bands.floor, reason: 'demote' } };
  }
  if (input.fps > PROMOTE_FPS && current < bands.ceil) {
    next.upTicks++;
    if (next.upTicks >= PROMOTE_HOLD_TICKS) {
      next.upTicks = 0; next.cooldownMs = COOLDOWN_MS;
      return { next, decision: { ratio: bands.ceil, reason: 'promote' } };
    }
    return { next, decision: null };
  }
  next.upTicks = 0;
  return { next, decision: null };
}

// ── 프레임 캡 제어기 ─────────────────────────────────────────────────────────
//
// 발열 기인 후반 저하를 막는다. 근거는 실측된 열 스로틀 지문 — 진입 0.4초에 tri 82,972에서
// 18.9fps였는데, 40초 뒤 tri가 9,524(1/9)로 줄었는데도 13.3fps, 68초에 7.6fps였다.
// 부하와 무관하게 시간에 따라 떨어지는 건 스로틀이다. GPU 듀티사이클을 낮추는 게 답이다.
//
// **비가역**으로 둔다. 캡을 넣다 뺐다 하면 그 자체가 진동이고, 발열은 되돌아오지 않는다.

export interface FrameCapDecision { capFps: number }

export const CAP_ENTER_FPS = 34;
/** 이 시간(ms) 동안 지속 미달이면 캡 진입 */
export const CAP_SUSTAIN_MS = 3000;
export const DESKTOP_CAP_FPS = 30;

export function decideFrameCap(
  st: ControllerState, input: AdaptInput, capped: boolean, capFps = DESKTOP_CAP_FPS,
): { next: ControllerState; decision: FrameCapDecision | null } {
  const next: ControllerState = { ...st, cooldownMs: Math.max(0, st.cooldownMs - input.dtMs) };
  if (capped || input.hidden || input.ageMs < WARMUP_MS || input.streaming) {
    // 판정 대상이 아니면 누적을 되돌린다 — 끊긴 관측을 이어 붙이면 오발화한다.
    next.downTicks = 0;
    return { next, decision: null };
  }
  if (input.fps < CAP_ENTER_FPS) {
    next.downTicks = st.downTicks + input.dtMs;
    if (next.downTicks >= CAP_SUSTAIN_MS) {
      next.downTicks = 0;
      return { next, decision: { capFps } };
    }
    return { next, decision: null };
  }
  next.downTicks = 0;
  return { next, decision: null };
}

// ── LOD 압력 제어기 ──────────────────────────────────────────────────────────
//
// fps만 보면 fill 병목인지 geometry 병목인지 못 가른다. 과거 여기서 축을 잘못 골랐다 —
// tri를 84,526에서 41k로 절반 깎았는데 fps는 25→26이었다(tri 지배 ≠ tri 병목).
// 그래서 **fps가 낮고 동시에 tri가 예산을 넘을 때만** tier를 바깥으로 당긴다.
// Decentraland SDK7의 원칙을 따른다 — 예산은 총 자산량이 아니라 "임의 순간 화면에 올라오는
// 삼각형 수"다. 총량 축소가 아니라 동시성 축소가 정답이다.

export interface TierPressureDecision {
  /** tier 밴드에 곱할 축소 계수(<1). 1이면 무압력 */
  scale: number;
}

export const TRI_BUDGET = 60000;
export const PRESSURE_SCALE = 0.8;

export function decideTierPressure(
  st: ControllerState, input: AdaptInput, triAvg: number, applied: boolean,
): { next: ControllerState; decision: TierPressureDecision | null } {
  const next: ControllerState = { ...st, cooldownMs: Math.max(0, st.cooldownMs - input.dtMs) };
  if (applied || input.hidden || input.ageMs < WARMUP_MS || input.streaming) return { next, decision: null };
  if (next.cooldownMs > 0) return { next, decision: null };
  // 두 조건이 **동시에** 성립할 때만 — 이게 축을 잘못 고르지 않기 위한 장치다.
  if (input.fps < DEMOTE_FPS && triAvg > TRI_BUDGET) {
    next.cooldownMs = COOLDOWN_MS;
    return { next, decision: { scale: PRESSURE_SCALE } };
  }
  return { next, decision: null };
}
