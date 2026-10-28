// world-glb/boot.ts — 부팅 파이프라인 집행.
//
// ── 프레임 양보가 계약인 이유 ────────────────────────────────────────────────
// 부팅 작업을 한 덩어리로 돌리면 브라우저가 그 사이 아무것도 그리지 못한다. 그러면 진행바를
// 아무리 잘 만들어도 **0%에서 얼어 있다가 갑자기 사라진다** — 진행바가 없는 것보다 나쁘다
// (사용자는 멈춘 걸로 읽는다). 그래서 단계 사이마다 반드시 양보한다. 이건 성능 최적화가
// 아니라 로딩 화면이 작동하기 위한 전제 조건이다.
//
// 감독 보고로 올라온 "로딩이 끝났는데 화면이 빈 채로 남는" 문제도 같은 계열이었다 —
// 그래서 커널이 첫 프레임을 캡과 무관하게 그리도록 계약을 박았고, 여기서는 그 첫 프레임이
// 실제로 올 때까지 로딩 화면을 걷지 않는다.
//
// ── 실패를 삼키지 않는다 ─────────────────────────────────────────────────────
// 한 단계가 던지면 부팅을 멈추고 그 사실을 보고한다. 조용히 계속 가면 반쯤 만들어진 월드가
// 뜨고, 그 뒤에 나는 오류는 원인에서 한참 떨어진 곳에서 터진다.

import {
  type BootStage, bootProgress, monotonic, nextStage, stageLabel,
  isSlowBoot, estimateRemainMs,
} from './decide/boot.js';

export interface BootReport {
  stage: BootStage;
  label: string;
  /** 화면에 보여줄 진행률(단조 증가 보정 후) 0~1 */
  progress: number;
  elapsedMs: number;
  /** 남은 시간 추정(ms). 초반에는 null */
  remainMs: number | null;
  /** 비정상적으로 느린가 — 안내 문구를 띄울 신호 */
  slow: boolean;
}

/** 한 단계의 실행 내용. `report(sub)`로 단계 내부 진척(0~1)을 알린다. */
export type StageRunner = (
  report: (sub: number) => void,
  yieldFrame: () => Promise<void>,
) => void | Promise<void>;

export interface BootOptions {
  /** 단계별 실행자. 없는 단계는 즉시 통과한다(예: 예열이 필요 없는 백엔드) */
  steps: Partial<Record<Exclude<BootStage, 'ready'>, StageRunner>>;
  onProgress?: (r: BootReport) => void;
  onError?: (stage: BootStage, err: unknown) => void;
  /** 프레임 양보(테스트 주입). 없으면 rAF + 매크로태스크 */
  yieldFrame?: () => Promise<void>;
  now?: () => number;
}

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * 한 프레임 양보한다.
 *
 * rAF **한 번으로는 부족하다.** rAF 콜백은 페인트 직전에 돌므로, 여기서 바로 다음 작업을
 * 이어가면 브라우저가 그 프레임을 그리기 전에 다시 메인 스레드를 뺏긴다. rAF로 프레임
 * 시작을 잡은 뒤 매크로태스크로 한 번 더 넘겨야 페인트가 실제로 끝난다.
 */
function defaultYield(): Promise<void> {
  return new Promise<void>((resolve) => {
    const after = () => setTimeout(resolve, 0);
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(after);
    else setTimeout(after, 0);
  });
}

/**
 * 부팅을 끝까지 돌린다. 성공하면 true, 어느 단계에서 실패하면 false.
 *
 * 진행률은 항상 단조 증가한다(monotonic) — 실제 sub가 내려가도 화면 값은 유지한다.
 */
export async function runBoot(opts: BootOptions): Promise<boolean> {
  const now = opts.now ?? defaultNow;
  const yieldFrame = opts.yieldFrame ?? defaultYield;
  const t0 = now();
  let shown = 0;

  const emit = (stage: BootStage, sub: number) => {
    const raw = bootProgress(stage, sub);
    shown = monotonic(shown, raw);
    const elapsedMs = now() - t0;
    opts.onProgress?.({
      stage,
      label: stageLabel(stage),
      progress: shown,
      elapsedMs,
      remainMs: estimateRemainMs(elapsedMs, shown),
      slow: isSlowBoot(elapsedMs, shown),
    });
  };

  let stage: BootStage | null = 'renderer';
  while (stage && stage !== 'ready') {
    emit(stage, 0);
    // 단계를 시작하기 **전에** 양보한다. 그래야 방금 갱신한 라벨·진행률이 화면에 그려진 뒤
    // 무거운 작업이 시작된다. 순서가 반대면 사용자는 이전 단계 라벨을 보며 기다린다.
    await yieldFrame();

    const run = opts.steps[stage as Exclude<BootStage, 'ready'>];
    if (run) {
      const cur = stage;
      try {
        await run((sub) => emit(cur, sub), yieldFrame);
      } catch (err) {
        opts.onError?.(cur, err);
        return false;
      }
    }
    emit(stage, 1);
    stage = nextStage(stage);
  }

  emit('ready', 1);
  return true;
}

/**
 * 조건이 참이 될 때까지 프레임을 양보하며 기다린다. 스트리밍 충전처럼 **커널이 돌아야
 * 진행되는** 단계에 쓴다 — 여기서 블로킹 루프를 돌면 커널이 영원히 못 돌아 교착한다.
 *
 * `timeoutMs`를 넘기면 포기하고 false. 부팅이 영영 안 끝나는 것보다 불완전하게라도 뜨는
 * 편이 낫다 — 파셀 하나가 안 올라온다고 미술관 전체를 막을 이유가 없다.
 */
export async function waitUntil(
  done: () => boolean,
  progress: () => number,
  report: (sub: number) => void,
  yieldFrame: () => Promise<void>,
  timeoutMs = 30_000,
  now: () => number = defaultNow,
): Promise<boolean> {
  const t0 = now();
  while (!done()) {
    if (now() - t0 > timeoutMs) return false;
    report(progress());
    await yieldFrame();
  }
  report(1);
  return true;
}
