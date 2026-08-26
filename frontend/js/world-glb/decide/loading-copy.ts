// world-glb/decide/loading-copy.ts — 로딩 문구 회전 판정. 순수 함수만, import 0.
//
// ── 규약: 지루함은 느린 기기에서만 생긴다 ────────────────────────────────────
// world2의 부팅은 빠른 기기에서 1~2초다. 문구가 한 번 바뀌기도 전에 끝난다. 그렇다고
// 보여주려고 로딩을 늘리는 건 본말전도다 — 그건 지루함을 없애는 게 아니라 만드는 것이다.
//
// 그래서 이 모듈은 **최소 노출 시간을 강제하지 않는다.** 빠르면 첫 문구 하나만 보이고 끝난다.
// 로테이션은 로딩이 실제로 길어질 때만 돈다. 대책이 필요한 곳에서만 대책이 나타난다.
//
// ── 문구는 데이터다 ──────────────────────────────────────────────────────────
// COPY 배열만 갈아끼우면 문안이 바뀐다. 회전 로직과 문구를 섞지 않는 이유는, 문안이
// 카피 담당의 것이고 로직은 개발의 것이기 때문이다. 서로의 작업이 상대를 건드리지 않는다.

/**
 * 이 시간을 넘겨야 로딩 화면이 "풍성해진다"(감독 지시).
 *
 * 3초 이하면 프로그레스 바만 보인다. 짧은 로딩에서 단계 라벨과 문구가 스쳐 지나가면
 * 읽히지도 않으면서 화면만 산만해진다 — 정보가 아니라 소음이다. 반대로 3초를 넘기면
 * 사용자는 "왜 기다리는지"를 궁금해하기 시작하므로 그때 설명과 읽을거리를 내놓는다.
 */
export const RICH_AFTER_MS = 3000;

/** 문구 교체 주기(ms). 읽고 넘어가기 충분하되 조급하지 않은 간격. */
export const ROTATE_MS = 3200;

/** 페이드 전환에 쓰는 시간(ms). CSS 전이와 맞춘다. */
export const FADE_MS = 400;

/**
 * 로딩 문구. **순서에 의존하지 않는다** — 무작위로 하나만 보일 수도 있으므로 각 문장이
 * 독립적으로 읽혀야 한다. 첫 항목은 "하나만 본다면 이것"에 해당하는 문구다(빠른 기기는
 * 이것만 보고 끝난다).
 *
 * 세 결이 섞여 있다 — 지금 무슨 일이 일어나는지(빛·벽·안개 같은 감각 어휘로만, 기술
 * 용어는 쓰지 않는다), 이 프로젝트가 왜 있는지, 곧 볼 것에 대한 기대.
 */
export const COPY: readonly string[] = [
  '곧 작품 앞에 서게 됩니다',
  '빛과 그림자가 자리를 잡는 중입니다',
  '대관료도 액자값도 없이 여는 전시입니다',
  '잠시 후 낯선 작품과 마주하게 됩니다',
  '벽과 바닥이 하나씩 자리를 잡아갑니다',
  '창고비 걱정 없이 열리는 전시입니다',
  '이 문 너머에 누군가의 이야기가 있습니다',
  '안개와 빛의 결이 맞춰지는 중입니다',
  '이 공간은 어느 작가가 연 창(窓)입니다',
  '작품이 말을 걸어올 시간이 다가옵니다',
  '공간이 하나씩 모습을 드러내는 중입니다',
  '누구나 부담 없이 열 수 있는 전시입니다',
  '곧 이 공간의 첫인상과 마주하게 됩니다',
  '이 공간의 결을 다듬는 중입니다',
];

/**
 * 지금 보여줄 문구의 **인덱스**. 문자열이 아니라 인덱스를 돌려주는 이유는, 호출자가
 * "바뀌었는가"를 싸게 판단해 바뀔 때만 DOM을 만지게 하기 위해서다. 로딩 중에는 메인
 * 스레드가 가장 바쁘므로 불필요한 레이아웃을 한 번이라도 줄이는 편이 낫다.
 *
 * `count`가 0이면 -1(보여줄 것이 없음). 음수 경과는 0으로 다룬다.
 */
export function copyIndexAt(elapsedMs: number, count: number, rotateMs = ROTATE_MS): number {
  if (count <= 0) return -1;
  if (!(rotateMs > 0)) return 0;
  const t = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  return Math.floor(t / rotateMs) % count;
}

/**
 * 문구가 실제로 회전할 만큼 로딩이 길었는가. 계측·판단용이다.
 * 이 값이 거의 항상 false라면 문구 세트를 늘릴 이유가 없다는 뜻이다.
 */
export function didRotate(elapsedMs: number, rotateMs = ROTATE_MS): boolean {
  return Number.isFinite(elapsedMs) && elapsedMs >= rotateMs;
}

/** 로딩 화면의 밀도. `minimal`은 바만, `rich`는 라벨·문구까지. */
export type LoadingDetail = 'minimal' | 'rich';

/**
 * 지금 어느 밀도로 보여줄 것인가.
 *
 * **되돌아가지 않는다** — 한 번 rich가 되면 계속 rich다. 진행률이 빨라졌다고 문구가
 * 사라지면 화면이 깜빡이고, 읽던 문장이 지워진다.
 */
export function loadingDetail(elapsedMs: number, richAfterMs = RICH_AFTER_MS): LoadingDetail {
  if (!Number.isFinite(elapsedMs)) return 'minimal';
  return elapsedMs >= richAfterMs ? 'rich' : 'minimal';
}

/**
 * 지금 보여줄 문구 인덱스. `minimal` 구간에서는 -1(아무것도 안 보인다).
 *
 * 회전 기준점을 rich 진입 시점으로 잡는 이유: 부팅 경과를 그대로 쓰면 3초에 첫 문구가
 * 뜨자마자 0.2초 뒤 두 번째로 넘어간다(ROTATE_MS=3200). 첫 문장을 읽을 시간이 없다.
 */
export function copySlot(
  elapsedMs: number,
  count: number,
  rotateMs = ROTATE_MS,
  richAfterMs = RICH_AFTER_MS,
): number {
  if (loadingDetail(elapsedMs, richAfterMs) === 'minimal') return -1;
  return copyIndexAt(elapsedMs - richAfterMs, count, rotateMs);
}

/**
 * 문구 세트 검증. 부팅 시 한 번 확인해 잘못된 데이터가 조용히 흘러가지 않게 한다.
 * 빈 문자열·중복·과도한 길이는 전부 화면에서 티가 나는 결함이다.
 */
export function validCopy(list: readonly string[], maxLen = 30): boolean {
  if (list.length === 0) return false;
  const seen = new Set<string>();
  for (const s of list) {
    const t = s.trim();
    if (t.length === 0 || t.length > maxLen) return false;
    if (seen.has(t)) return false;
    seen.add(t);
  }
  return true;
}
