// random-pick.ts — 카테고리 랜덤의 선택 규칙.
//
// ── 무엇을 위한 것인가 (2026-08-07, 감독 요청) ──────────────────────────────
//   감독: *"한번누르면 밑에서 사람이 선택할수있고. 반면에 또 누르면 그 카테고리안에서
//   랜덤으로 선택되는거였어."*
//
//   하단 탭이 두 가지 일을 한다 — 처음 누르면 그 카테고리를 펴고, **이미 펴진 탭을 또
//   누르면 그 카테고리를 통째로 굴린다.**
//
// ── 왜 옵션 수에 따라 규칙이 다른가 ─────────────────────────────────────────
//   **3개 이상은 현재 값을 후보에서 뺀다(반드시 바뀐다).** 순수 균등 추출은 현재 값을
//   다시 뽑을 수 있고, 그러면 화면이 그대로여서 **버튼이 안 먹은 것과 구별되지 않는다.**
//   이 편집기의 옵션 수는 작다 — 눈·입은 3개라 3번에 1번이 "먹통"으로 보인다.
//
//   **2개(있음/없음 짝)는 균등 추출로 둔다.** 여기에도 "반드시 바뀐다"를 적용하면 매번
//   반대로 뒤집혀 **토글과 동작이 같아진다** — 장식 탭을 누를 때마다 안경·헤일로·날개·
//   하트 넷이 **한꺼번에** 켜졌다 꺼졌다 하는 꼴이라 랜덤으로 안 보인다. 50%로 두면
//   어떤 것은 남고 어떤 것은 바뀌어 조합이 매번 달라진다.
//
//   카테고리 전체로 보면 3개 이상인 줄이 하나라도 있으므로 **한 번 누를 때마다 반드시
//   무언가는 바뀐다.** 그게 이 규칙 조합의 목적이다.
//
//   (첫 판본은 2지선다를 랜덤 대상에서 **제외**했다. 그때 설계가 "줄마다 주사위 버튼"
//    이어서, 2지선다 줄의 주사위가 토글과 같아지는 것이 문제였기 때문이다. 설계가
//    카테고리 일괄 랜덤으로 바뀌면서 그 전제가 사라졌다 — 여러 개를 동시에 굴리는
//    맥락에서는 2지선다도 조합의 일부다.)

/** 랜덤 대상이 되는 최소 옵션 수. 1개짜리 줄은 굴릴 것이 없다. */
export const RANDOM_MIN_OPTIONS = 2;

/** 3개 이상일 때 "반드시 바뀐다" 규칙을 적용하는 경계. */
export const FORCE_CHANGE_MIN_OPTIONS = 3;

export function canRandomize(optionCount: number): boolean {
  return optionCount >= RANDOM_MIN_OPTIONS;
}

/**
 * `options` 에서 `current` 를 제외하고 하나를 고른다 — 반드시 달라진다.
 *
 * 후보가 없으면(빈 배열이거나 유일한 값이 곧 current) `current` 를 그대로 돌려준다 —
 * 호출부가 그 경우를 분기하지 않아도 되게. 값 비교는 `===` 다: 이 편집기의 옵션은 전부
 * 문자열 id 이거나 색 문자열이라 참조 비교로 충분하다(객체를 넣지 마라).
 */
export function pickDifferent<T>(options: readonly T[], current: T): T {
  const others = options.filter((o) => o !== current);
  if (!others.length) return current;
  return others[Math.floor(Math.random() * others.length)];
}

/** 균등 추출. 빈 배열이면 `fallback`. */
export function pickAny<T>(options: readonly T[], fallback: T): T {
  if (!options.length) return fallback;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * 카테고리 랜덤이 한 줄에 적용하는 규칙 — 개수에 따라 위 둘 중 하나를 고른다.
 * 호출부(편집기)는 이 함수만 부르면 되고, 경계값을 알 필요가 없다.
 */
export function pickForRandomize<T>(options: readonly T[], current: T): T {
  if (options.length >= FORCE_CHANGE_MIN_OPTIONS) return pickDifferent(options, current);
  return pickAny(options, current);
}
