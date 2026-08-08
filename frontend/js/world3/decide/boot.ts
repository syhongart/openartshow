// world2/decide/boot.ts — 부팅 단계 판정. 순수 함수만, import 0.
//
// ── 진행률이 판정인 이유 ─────────────────────────────────────────────────────
// 로딩 진행률은 화면에 숫자를 뿌리는 장식이 아니라 **사용자가 기다릴지 말지 결정하는 근거**다.
// 그래서 지켜야 할 성질이 있고(단조 증가, 100%는 진짜 끝), 그건 시험 가능한 규약이다.
// 현행 오픈월드는 진행률 자체가 없어서 검은 화면이 몇 초 지속됐고, 그게 "멈춘 것"과
// 구별되지 않았다.
//
// ── 가중치를 두는 이유 ───────────────────────────────────────────────────────
// 단계를 균등 분할하면 바가 튄다 — 렌더러 생성은 수 ms인데 파셀 충전은 수 초다. 균등이면
// 앞 25%가 순식간에 지나고 뒤에서 멈춘 것처럼 보인다. 실측 비중을 가중치로 준다.

export type BootStage = 'renderer' | 'pools' | 'warmup' | 'stream' | 'ready';

export interface StageSpec {
  id: BootStage;
  /** 전체 부팅에서 이 단계가 차지하는 비중(상대값) */
  weight: number;
  /** 로딩 화면에 보일 문구 */
  label: string;
}

/**
 * 부팅 단계와 가중치. 순서가 곧 실행 순서다.
 *
 * 가중치 근거: 셰이더 예열(warmup)과 초기 파셀 충전(stream)이 부팅 시간의 대부분이다.
 * 렌더러·풀 생성은 합쳐도 한 자릿수 %다. `ready`는 폭이 0인 종점 표식이다.
 */
export const BOOT_STAGES: readonly StageSpec[] = [
  { id: 'renderer', weight: 4, label: '렌더러 준비' },
  { id: 'pools', weight: 6, label: '공간 뼈대 만드는 중' },
  { id: 'warmup', weight: 30, label: '셰이더 예열' },
  { id: 'stream', weight: 60, label: '전시 공간 불러오는 중' },
  { id: 'ready', weight: 0, label: '완료' },
] as const;

const TOTAL_WEIGHT = BOOT_STAGES.reduce((s, x) => s + x.weight, 0);

export function stageSpec(id: BootStage): StageSpec {
  const s = BOOT_STAGES.find((x) => x.id === id);
  if (!s) throw new Error(`[world3] 알 수 없는 부팅 단계: ${id}`);
  return s;
}

export function stageLabel(id: BootStage): string { return stageSpec(id).label; }

/** 다음 단계. 마지막이면 null. */
export function nextStage(cur: BootStage): BootStage | null {
  const i = BOOT_STAGES.findIndex((x) => x.id === cur);
  if (i < 0 || i >= BOOT_STAGES.length - 1) return null;
  return BOOT_STAGES[i + 1].id;
}

/**
 * 진행률 0~1. `sub`는 현재 단계 안에서의 진척(0~1).
 *
 * 규약 ①: **1.0은 `ready`에서만 나온다.** stream이 sub=1이어도 0.99에서 멈춘다 —
 * 100%를 보여준 뒤에도 화면이 안 뜨면 그건 사용자에게 거짓말이고, 진행바 자체의 신뢰를 깎는다.
 *
 * 규약 ②: sub는 클램프한다. 호출자가 loaded/wanted 같은 비율을 넘기는데, 그 분모가
 * 순간적으로 줄면 1을 넘는 값이 들어온다(파셀이 시야에서 빠질 때 실제로 생긴다).
 *
 * NaN을 따로 막는 이유: `Math.max(0, NaN)`은 NaN을 그대로 통과시킨다. wanted가 0인
 * 첫 프레임에 `0/0`이 실제로 들어오고, 그게 그대로 나가면 진행바 폭이 `NaN%`가 되어
 * 스타일이 통째로 무시된다 — 바가 사라진 것처럼 보인다.
 */
export function bootProgress(cur: BootStage, sub = 0): number {
  if (cur === 'ready') return 1;
  const i = BOOT_STAGES.findIndex((x) => x.id === cur);
  if (i < 0) return 0;
  let done = 0;
  for (let k = 0; k < i; k++) done += BOOT_STAGES[k].weight;
  const s = Number.isFinite(sub) ? Math.min(1, Math.max(0, sub)) : 0;
  const p = (done + BOOT_STAGES[i].weight * s) / TOTAL_WEIGHT;
  return Math.min(0.99, p);
}

/**
 * 진행률을 단조 증가로 고정한다.
 *
 * 왜 필요한가: stream 단계의 sub는 `loaded/wanted`인데, 플레이어가 움직이면 wanted가
 * 늘어 비율이 **내려간다**. 바가 뒤로 가면 사용자는 뭔가 잘못됐다고 읽는다. 실제 값은
 * 로그로 남기고 화면에는 최고치를 보여준다.
 */
export function monotonic(prev: number, next: number): number {
  return next > prev ? Math.min(1, next) : prev;
}

/**
 * 부팅이 비정상적으로 느린가 — 경고 문구를 띄울지 판정한다.
 *
 * 이 판정이 있는 이유: 소프트웨어 래스터라이저(swiftshader) 기기에서 부팅이 수십 초 걸린
 * 사례가 실측됐다. 그때 사용자에게 아무 말도 안 하면 고장으로 읽힌다. 다만 **막지는 않는다** —
 * 느린 기기도 결국 뜨기 때문이다. 알리기만 한다.
 */
export const SLOW_BOOT_MS = 12_000;

export function isSlowBoot(elapsedMs: number, progress: number): boolean {
  return elapsedMs > SLOW_BOOT_MS && progress < 0.9;
}

/**
 * 남은 시간 추정(ms). 진행률과 경과로 선형 외삽한다. 못 재면 null.
 *
 * 초반(progress<0.05)에는 추정을 내지 않는다 — 표본이 적어 "23분 남음" 같은 값이 나오고,
 * 그건 없느니만 못하다.
 */
export function estimateRemainMs(elapsedMs: number, progress: number): number | null {
  if (!(progress > 0.05) || !(elapsedMs > 0)) return null;
  if (progress >= 1) return 0;
  return Math.round(elapsedMs * (1 - progress) / progress);
}
