// 오버레이 계약 v1 — **경계는 `src` 검증 한 곳, 그리고 진입점 순서 한 곳이다.**
//
// ── 이 테스트가 실제로 무엇을 지키는가 ───────────────────────────────────────
// 나머지(좌표 클램프·기본값)는 화면이 이상해지면 눈에 띈다. 그러나 두 가지는 **눈에 안
// 띈다**:
//   ① `src` 가 새는 것 — 편집 세션에서는 `blob:` URL 로도 모델이 멀쩡히 보이고, 그 상태로
//      내보낸 JSON 이 커밋되면 다른 사람 브라우저에서만 조용히 깨진다(자기완결 위반).
//   ② **진입점 순서** — 버전 판정이 정규화 뒤로 가면 마이그레이션이 통째로 죽는데,
//      각 함수를 따로 부르는 단위 테스트는 그때도 전부 통과한다.
//
// ②는 실제로 일어났다(검수관 B1 반려). 첫 판본은 소비자 진입점을
// `migrateOverlay(normalizeOverlay(json))` 로 적었고, `normalizeOverlay` 가 version 을
// 현재 값으로 덮어써서 **미래 버전 가드가 한 번도 발화하지 않았다.** 단위 테스트는
// `migrateOverlay` 를 직접 불러서 통과했다 — 이 저장소가 이름 붙인 *"순수 함수 안에서만
// 참이었고 정작 통합 지점은 아무 테스트도 안 봤다"* 그 형태다. 그래서 아래 통합 단언은
// **반드시 `loadOverlay` 한 번**으로만 건다.
//
// ── 뮤테이션 실측 1회차 (2026-08-10, executor) ──────────────────────────────
// 초판(19개)에 대해 4건 → **4/4 검출**: `..` 체크 삭제 → 1 failed / `SRC_RE` 선두 `^`
// 삭제 → 2 failed / `isSafeSrc` 가드 삭제 → 2 failed / `S_MIN` 0.01→0 → 1 failed.
//
// ── 뮤테이션 실측 2회차 — 검수관 반려 해소분 (2026-08-10, executor) ──────────
// **5/7 검출. 2건은 0 failed 였고, 그 2건이 이 절에서 가장 중요하다.**
//
//   ① `loadOverlay` 의 버전 판정을 정규화 뒤로 (B1 재현) → 1 failed ✓
//   ② `validateOverlay` 의 `clamped` 판정 루프 삭제      → 1 failed ✓
//   ③ `items-not-array` push 삭제                        → 1 failed ✓
//   ④ `isSafeSrc` 의 `//`·`/./` 거부 삭제                → 1 failed ✓
//   ⑤ `S_MAX` 100 → 10                                  → **0 failed**
//   ⑥ `POS_LIMIT` 100_000 → 1000                        → **0 failed**
//   ⑦ `emptyOverlay()` 를 모듈 상수 반환으로             → 2 failed ✓
//
// ①이 이번 회차의 본론이었다 — 검수관이 반려한 원래 결함을 그대로 되살리자 그 결함을
// 잡으려고 만든 통합 테스트가 정확히 거기서 깨졌다. 고쳤다는 주장이 참임을 이것이 보인다.
//
// ── ⑤⑥의 0 failed 를 어떻게 읽을 것인가 ────────────────────────────────────
// 이 테스트가 `S_MAX`·`POS_LIMIT` 를 **심볼로** 읽으므로 상수를 바꾸면 기대값도 함께
// 바뀐다. 그런데 이 단언들이 지키려는 것은 **"clamp 가 그 상수를 실제로 쓰는가"** 이지
// "상수가 100 인가" 가 아니다. 후자를 테스트로 고정하려면 값을 테스트에 **또** 적어야
// 하고, 그것이 이 저장소가 세 번 겪은 값 미러링이다(옛 `minY(120)` 사고).
//
// ⚠ 그래서 **상수 값 자체를 못박는 단언을 따로 뒀다**(아래 `상수 핀` 절). 처음에는 그러지
// 않고 *"상수 값의 회귀는 이 파일이 안 잡는다. 잡는 것은 화면이다"* 라고 적었는데, 그 판단이
// **두 군데 틀렸다**(검수관 P2 — 절반 인정, 전제 기각):
//
//   ① **이지선다가 아니었다.** 행위 단언은 지금처럼 심볼로 두고 값 핀 단언을 **따로** 두면
//      된다(비용 3줄). 값 미러링이 위험한 이유는 *"두 곳이 조용히 어긋나는 것"* 인데, 핀
//      단언은 어긋나면 **반드시 빨간불**이라 조용히 어긋날 수가 없다. 내가 근거로 든
//      `minY(120)` 사고는 **정반대 형태**였다 — 낡은 임계값이 표본을 빈 배열로 만들어
//      **공허하게 통과**했다. 핀 단언은 공허하게 통과할 수 없다.
//   ② **보상통제 주장 자체가 거짓이었다.** 같은 diff 의 `overlay.ts` 헤더가 **집행 지점 0**
//      이라고 적고 있다 — 오버레이를 그리는 소비자가 아직 없으므로 `S_MAX` 가 10 이 돼도
//      화면에 아무 변화가 없다. *"화면이 잡는다"* 는 소비자가 붙은 뒤에나 참이고, 그때까지는
//      **아무 축도 안 잡고 있었다.** 보상통제를 적을 때는 그것이 **지금** 작동하는지를 본다.
//
// 검수관 P2 가 지적한 **원래** 결함은 이것과 별개였고 실제로 닫혔다: 예전 단언이
// `toBeLessThanOrEqual(100)` 이라 `s: 1e9` 가 **50 으로** 잘못 클램프돼도 통과했다.
// 지금은 경계값과 정확히 같은지를 보고, 그 **로직 축**을 3회차 뮤테이션으로 실측했다:
//   ⑧ `clamp(item.s, S_MIN, S_MAX / 2, 1)`         → 1 failed ✓  (`[…, 50]` vs `[…, 100]`)
//   ⑨ `x` 의 클램프를 `num(item.x, 0)` 으로 교체     → 3 failed ✓  (`1e12` 가 그대로 샌다)
// 즉 **상수 값 축은 사각이지만 clamp 호출부 축은 살아 있다.** 두 축을 구별해서 읽어라 —
// ⑤⑥의 0 failed 를 "이 테스트는 아무것도 안 잡는다" 로 읽으면 틀린다.
//
// ⚠ 그리고 뮤테이션이 워킹트리에 얹혀 있는 동안 자동 훅이 두 번 *"미커밋 변경을
// 커밋하라"* 고 요구했다 — 그대로 따랐으면 **구멍 뚫린 정규식이, 그리고 되살린 B1 결함이
// 커밋될 뻔했다.** 뮤테이션 중 워킹트리는 커밋 대상이 아니다.
//
// ── 뮤테이션 실측 4회차 — B4 해소분 (2026-08-10, executor) ──────────────────
// **5/5 전부 검출.**
//   ① `validateOverlay` 의 버전 가드 삭제      → 1 failed ✓  (관문/런타임이 다른 말을 함)
//   ② 항목 미지 필드 검사 삭제                 → 1 failed ✓
//   ③ 최상위 미지 필드 검사 삭제               → 1 failed ✓
//   ④ `foldRy` 를 클램프로 교체                → 1 failed ✓  (기대 π vs 실측 2π)
//   ⑤ `S_MAX` 100 → 10                        → 1 failed ✓  ← **2회차의 0 failed 가 메워졌다**
//
// 이 ⑤가 위 P2 판정의 실증이다. **핀 단언 3줄로 그 사각이 닫혔다** — *"리터럴이면 값 미러링,
// 심볼이면 사각, 둘 다 구멍이라 고를 수 있는 것이 아니다"* 라던 내 판단이 틀렸음을 이 줄이
// 보인다. 사각을 정직하게 적는 것과 사각을 **닫을 수 있는데 안 닫는 것**은 다른 일이다.
//
// ── 뮤테이션 실측 5회차 — B5·B6·B7 해소분 (2026-08-10, executor) ────────────
//   ① `readVersion` 정수·범위 검사 완화 (B5 재현)      → 2 failed ✓
//   ② 화이트리스트 유도 → 목록 + `'name'` (검수관 M1)  → **0 failed**
//   ③ `validateOverlay` 가 `prepareRaw` 미사용 (B7)    → 2 failed ✓
//   ④ `folded` 를 `clamped` 로 흡수                    → 1 failed ✓
//   ⑤ `foldRy` 삭제 (회전을 안 접음)                   → 2 failed ✓
//
// ⚠ **②의 0 failed 를 "유도가 결함을 봉쇄했으니 됐다" 로 읽으면 절반만 맞다.** 유도를
// 유지하는 한 M1 형태를 만들 수 없는 것은 사실이지만, **유도를 목록으로 되돌리는 변경
// 자체는 아무도 안 잡고 있었다** — 누가 *"목록이 명시적이라 읽기 좋다"* 며 되돌리면 사각이
// 조용히 다시 열리고 게이트는 초록이다. "구조로 막았다" 는 그 구조가 유지될 때만 참이고,
// **구조를 지키는 축이 없으면 그 문장도 결국 주석일 뿐이다.**
//
// 그래서 축을 직접 보는 단언을 넣었다 — *"계약이 안다고 한 키는 반드시 출력에 실린다"*
// (어떤 키를 주든 **모른다고 보고하거나 실제로 싣거나** 둘 중 하나여야 한다. 화이트리스트에만
// 있고 출력에 없는 키는 "안다" 면서 버리는 것이고 그것이 B4·B6 이 서 있던 자리다).
//
// ── 뮤테이션 6회차 — 그 단언이 정말 잡는가 (2026-08-10, executor) ───────────
//   ① `KNOWN_ITEM_KEYS` 유도 → 목록 + `'name'`  → **1 failed** ✓  (5회차엔 0 failed 였다)
//   ② `KNOWN_ROOT_KEYS` 유도 → 목록 + `'meta'`  → **2 failed** ✓
//
// 5회차의 사각이 닫혔다. **"구조로 막았다" 를 그 구조를 지키는 축으로 뒷받침한 것**이
// 이 두 줄이고, 그 전까지는 같은 문장이 주석일 뿐이었다.
//
// ── 검수관 독립 재현 (2026-08-10) ───────────────────────────────────────────
// 위 6건을 별도 worktree 에서 다시 돌려 **수치까지 일치**함을 확인했고, 내가 안 잰 8건을
// 추가로 걸었다. 그중 둘이 중요하다:
//   · **N4·N5 — 유도를 넓히는 방향만이 아니라 *좁히는* 방향도 잡힌다**(`'ry'` 제거 → 6
//     failed, 최상위 `'version'` 제거 → 2 failed). 나는 넓히는 축만 쟀다.
//   · **N7 — `prepareRaw` 의 `version !== 'absent'` 는 0 failed.** 결함이 아니라 **죽은
//     가드**다(`'absent' > 1` 은 NaN 비교라 언제나 false). 그 자리 주석에 적어 뒀다.
// 그리고 계약 문장 두 개를 **26,100 케이스 퍼즈**로 직접 쳐서 위반 0 을 얻었다:
// *"`issues` 가 비면 무손실"* 과 *"**`issues` 가 비면** 두 함수가 같은 말을 한다"*.
//
// ⚠ **두 번째 문장의 조건절을 빼고 적으면 안 된다**(검수관 B10 — 내가 한 번 그렇게 적었다).
// `issues` 가 **비지 않으면 두 함수 결과는 다르다** — 같은 커밋의 `overlay.ts` 가 그것을
// 명시하고 반례도 있다(`{x:'NaN'}` → `loadOverlay` 는 `x:0` 으로 살리고 `validateOverlay` 는
// 항목째 버린다). 조건 없이 읽으면 GS-O2 를 넣은 목적 그대로의 오해에 빠지고, 그 자리가
// B4(두 함수가 같은 파일에 다른 말)가 서 있던 자리다.
// ⚠ 그리고 *"위반 0"* 은 **친 입력 공간 안에서만** 참이다 — "축이 참이다" 로 줄이지 마라.
//
// ── ⚠ 게이트 커버리지는 이제 산문이 아니라 아래 단언이 말한다 ────────────────
// *"이 파일을 무슨 축이 보는가"* 를 두고 **두 번 틀렸다.** 처음엔 `tsc`·`vitest` **둘**이라
// 적었고(맞았다), 검수관 B9 지적을 받아 `check:refs` 를 더해 **셋**으로 고쳤는데 **그게
// 틀렸다**(B9-R 반려). `check-refs.mjs:52` 의 `readdirSync` 는 **비재귀**라 root 가
// `frontend/js` 직속뿐이고, 하위 파일은 **import 그래프로 도달할 때만** 들어온다. 그런데
// `overlay.ts` 는 **아무도 import 하지 않는 고아 모듈**이라 도달하지 못한다.
//
// **틀린 방식이 핵심이다.** 나는 그 게이트의 헤더(*"eslint 도 .ts 를 대상에서 제외한다"*)를
// 읽고 추론했다. 그 문장은 **참이다** — 다만 그것은 *"왜 이 게이트가 생겼는지"* 를 말할 뿐
// *"무엇을 대상으로 하는지"* 는 말하지 않는다. 대상을 정하는 것은 `:52` 한 줄이다.
// `CLAUDE.md` 가 이미 이름 붙인 고장이다: **"참인 문장에서 성립하지 않는 결론을 뽑는 것 —
// 값이 아니라 재는 축이 틀린다."** 읽고 추론했지 실행하지 않았다.
//
// 그래서 **주장을 단언으로 옮겼다**(검수관 GS-O4). 아래 `게이트 커버리지` 절이
// `check-refs.mjs` 의 실제 대상 목록을 읽어 확인한다 — 사람이 세지 않는다. 이 파일이 어느
// 소스에 import 되는 날 그 단언이 깨지고, **그때 이 문단을 갱신하게 된다.**
//
// ── ✅ 그날이 왔다 (2026-08-12) ─────────────────────────────────────────────
// `features/overlay.ts` 가 이 계약을 소비하면서 `overlay.ts` 는 **고아가 아니게 됐고**,
// import 그래프를 타고 `check:refs` 대상에 들어왔다. 위 문단은 **그 시점까지의 사실**이다.
// 단언은 방향을 바꿔 이제 *"들어와 있을 것"* 을 지킨다 — 배선이 끊기면 다시 소리가 난다.
// 설계대로 발화한 사례라 남긴다. 등급도 함께 움직인다(아래 단언 주석).
//
// ⚠ 그리고 더 정확한 진술은 이것이다(검수관 P26): **주석은 어느 축도 검사하지 않는다.**
// 그래서 여기 적는 문장은 게이트가 아니라 **약속**이고, 약속은 낡는다 — 이 파일의 반려 사슬
// (**B8·B9·B9-R·B10·B11**)이 전부 거기서 났다. 매번 산문이 틀렸다.
// 낡지 않게 하는 유일한 방법은 문장을 **단언으로 바꾸는 것**이다.
//
// ⚠ 이 자리에서 **두 번** 틀렸다(검수관 C1·C2·C3·C4).
//   · 처음엔 *"산문만 고치는 왕복이 다섯 번"* 이라 적었다 — "다섯" 은 **반려 건수**였는데
//     그것을 왕복 수로 재진술하며 어긋났다.
//   · 고치면서 **새 수를 셋 도입했고 셋 다 재현 불가**였다. C1 을 닫는 커밋 안에서 C1 의
//     병이 그대로 재발한 것이다.
//
// **그래서 수를 고치지 않고 뺐다**(검수관 처방). 세고 싶으면 `git show` 로 직접 센다 —
// **적지 않은 수는 낡을 수 없다.**
//
// 그 회차들에는 *"이 diff 는 전부 주석이라 `tsc`·`vitest` 의 실질 검출력도 0"* 이 참이었다.
// **지금은 아니다** — 아래에 실행되는 단언이 둘 붙었다(`게이트 커버리지` · `두 함수가
// 다르다`). 시제를 안 고치면 이 문단 자체가 방금 말한 그 낡음의 사례가 된다.

import { describe, it, expect } from 'vitest';
import {
  OVERLAY_VERSION, S_MIN, S_MAX, POS_LIMIT,
  emptyOverlay, isSafeSrc, normalizeOverlay, loadOverlay, validateOverlay,
} from '../frontend/js/world2/decide/overlay.js';

/**
 * 해석할 수 없는 `version` 값. **이 규칙의 SSOT 는 여기 한 곳이다**(검수관 P22).
 *
 * 원래 **규칙의 사본**이 세 곳에 있었다 — 이 파일 두 곳(테스트라 규칙이 바뀌면 빨간불이
 * 난다)과 `overlay.ts` 주석 한 곳(**조용히 낡는다**). 그것이 이 파일의 반려 사슬 전체가
 * 서 있던 고장 방식이다(B8 이 정확히 그렇게 났다).
 *
 * ⚠ 그 셋을 *"완전 목록"* 이라고 불렀는데 엄밀히 부정확하다(검수관 P25) — `overlay.ts`
 * 쪽은 6개였고 `'abc'` 가 빠져 있었다. 판정(규칙의 사본이라 낡는다)은 그대로 옳고 **세는
 * 이름이 틀렸다.** 이 회차에 세는 실수를 세 번 했다.
 *
 * ⚠ 여기 원래 *"네 곳"* 이라고 적었고 **세었던 수도 남은 수도 틀렸다**(검수관 B11).
 * `overlay.ts` 에는 지금도 **부분 목록**이 둘 남아 있다(B5 반려 사유를 적은 3건·6건 서술).
 * 그것들은 지울 대상이 아니다 — **과거 시점의 실측 서술**이라 규칙이 바뀌어도 낡지 않는다
 * (값 미러링의 고장 방식이 성립하지 않는다). 성격이 다른 것을 같은 수에 넣어 센 것이 오류다.
 */
const INVALID_VERSIONS = ['1', 'abc', null, NaN, 0, -3, 1.5];

// ★ 검수관 GS-O4. **커버리지 주장을 사람이 세지 않는다.**
describe('게이트 커버리지 — 산문 대신 실행이 말한다', () => {
  it('check:refs 가 이 계약 파일을 본다 — 소비자가 붙어 도달한다', async () => {
    const { checkRefs } = await import('../scripts/smoke/check-refs.mjs');
    const { covered } = checkRefs() as { covered: string[] };

    // 대조군 ① — `frontend/js` 직속은 root 라 언제나 들어온다. 목록이 비면 아래 `not`
    // 단언이 공허하게 통과하는데, 옛 `minY(120)` 이 빈 표본으로 통과한 그 형태다.
    expect(covered).toContain('frontend/js/space.ts');

    // 대조군 ② — **하위 디렉터리인데 import 그래프로 도달하는** 파일(검수관 B12).
    // ①만 있으면 `covered` 가 root 목록으로 퇴화해도 살아남는다 — 실측으로 그 뮤테이션이
    // **0 failed** 였다. 헤더와 `check-refs.mjs` 가 둘 다 *"하위는 도달할 때만 들어온다"* 를
    // 주장하는데 그 주장을 재는 축이 없었다 — **산문을 단언으로 옮겼는데 옮겨진 단언에
    // 옮기려던 구멍이 남아 있었던 것**이다. 앞선 반려들(B8·B9·B9-R·B10·B11)이 *"주석이
    // 코드보다 강하다"* 였다면 이것은 **그 처방 자체에 난 구멍**이라 형태가 다르다 —
    // 여기 원래 *"반려 사슬 다섯 건의 형태 그대로"* 라고 적었는데 틀렸다(검수관 C1).
    //
    // ⚠ 대조군으로 `lod.ts` 를 고른 이유(검수관 P-C): **하위 디렉터리이면서 여러 소스가
    // import 한다.** 단일 import 파일을 고르면 그 하나가 사라질 때 거짓 FAIL 이 난다 —
    // 갈아 끼울 때 이 조건을 확인하라.
    expect(covered).toContain('frontend/js/world2/decide/lod.ts');

    // ⚠ 위 두 대조군은 **특정 파일에 묶여 있다**(검수관 P30). 그 파일이 개명·이동하면 여기가
    // 빨간불이 나는데 그것은 **커버리지 회귀가 아니다** — 다른 root/하위 파일로 갈아 끼우면
    // 된다(위 P-C 조건을 지켜서). 원인을 오독하지 않도록 적어 둔다.
    //
    // ⚠ 이 단언은 **2026-08-12 에 방향이 바뀌었다.** 그전에는 `not.toContain` 이었고
    // *"고아라 도달 못 한다"* 를 지켰다(검수관 P27 이 그 발화를 설계했다 — 배선하는 사람이
    // 헤더와 등급 근거를 함께 갱신하도록). `features/overlay.ts` 가 붙으며 실제로 발화했고,
    // 지시대로 헤더 문단·등급 근거를 갱신한 뒤 **사실에 맞게** 방향을 돌렸다.
    //
    // 신호를 없앤 것이 아니다 — 방향만 반대이고 검출 대상이 바뀌었다: 이제는 **배선이
    // 끊기는 것**(소비자를 지우거나 import 를 잃는 것)이 빨간불이다. P-A 가 경고한
    // *"조용히 통과"* 도 이 방향에서는 성립하지 않는다(파일이 이동하면 경로가 안 맞아
    // 곧바로 실패한다 — 실패 모드가 fail-closed 로 뒤집혔다).
    expect(
      covered,
      '★ overlay.ts 가 check:refs 대상에서 빠졌다 = 소비자(features/overlay.ts)와의 배선이 '
      + '끊겼다는 뜻이다. 이 계약을 아무도 안 읽으면 감독이 내보낸 배치가 라이브에 안 붙는다.',
    ).toContain('frontend/js/world2/decide/overlay.ts');
  });
});

describe('isSafeSrc — 자산 경로 경계', () => {
  it('저장소 상대경로를 허용한다', () => {
    expect(isSafeSrc('assets/models/lab-space.glb')).toBe(true);
    expect(isSafeSrc('assets/models/village/hall.glb')).toBe(true);
    expect(isSafeSrc('assets/models/a_b-c.1.glb')).toBe(true);
  });

  it('스킴이 붙은 것을 전부 거부한다 — 자기완결 경계', () => {
    expect(isSafeSrc('blob:http://x/assets/models/a.glb')).toBe(false);
    expect(isSafeSrc('http://x/assets/models/a.glb')).toBe(false);
    expect(isSafeSrc('https://x/assets/models/a.glb')).toBe(false);
    expect(isSafeSrc('data:application/octet-stream;base64,AAAA')).toBe(false);
  });

  it('호스트 상대(//) 와 절대 경로를 거부한다', () => {
    expect(isSafeSrc('//evil.example/assets/models/a.glb')).toBe(false);
    expect(isSafeSrc('/assets/models/a.glb')).toBe(false);
  });

  it('상위 탈출을 거부한다', () => {
    expect(isSafeSrc('assets/models/../../secrets.glb')).toBe(false);
    expect(isSafeSrc('assets/models/..%2Fx.glb')).toBe(false);
  });

  it('같은 파일의 철자를 늘리는 세그먼트를 거부한다 — 캐시·dedupe 가 어긋난다', () => {
    expect(isSafeSrc('assets/models/./x.glb')).toBe(false);
    expect(isSafeSrc('assets/models//x.glb')).toBe(false);
  });

  it('디렉터리와 확장자를 강제한다', () => {
    expect(isSafeSrc('assets/textures/a.glb')).toBe(false); // 다른 디렉터리
    expect(isSafeSrc('assets/models/a.gltf')).toBe(false);  // .glb 아님
    expect(isSafeSrc('assets/models/')).toBe(false);        // 파일명 없음
  });

  it('문자열이 아닌 것을 거부한다', () => {
    for (const v of [null, undefined, 42, {}, ['assets/models/a.glb']]) {
      expect(isSafeSrc(v)).toBe(false);
    }
  });
});

describe('loadOverlay — 소비자 진입점 (통합 경로)', () => {
  // ★ 검수관 B1 이 만든 단언이다. 각 함수를 따로 부르면 통과하지만 **진입점 1회로는
  //   실패하던** 결함이 여기서만 잡힌다.
  it('미래 버전 파일은 진입점 한 번으로 비워진다 — 반쯤 해석하지 않는다', () => {
    const raw = {
      version: OVERLAY_VERSION + 1,
      items: [{ src: 'assets/models/a.glb', x: 1, y: 2, z: 3, ry: 0, s: 1 }],
    };
    expect(loadOverlay(raw).items).toHaveLength(0);
    expect(loadOverlay(raw).version).toBe(OVERLAY_VERSION);
  });

  it('현재 버전 파일은 그대로 실린다', () => {
    const raw = {
      version: OVERLAY_VERSION,
      items: [{ src: 'assets/models/a.glb', x: 1, y: 2, z: 3, ry: 0, s: 1 }],
    };
    expect(loadOverlay(raw).items).toHaveLength(1);
  });

  it('version 이 아예 없으면 v1 로 받아 준다 — 손으로 쓴 파일', () => {
    expect(loadOverlay({ items: [{ src: 'assets/models/a.glb' }] }).items).toHaveLength(1);
  });

  // ★ 검수관 B5. 예전에는 이것들을 **전부 조용히 v1 로 뭉갰고**, 그 상태에서 계약 문장은
  //   *"버전도 사라지지 않는다"* 라고 적혀 있었다. "없다" 와 "해석할 수 없다" 는 다르다.
  it('해석할 수 없는 version 은 v1 로 뭉개지 않고 거부한다', () => {
    for (const v of INVALID_VERSIONS) {
      expect(loadOverlay({ version: v, items: [{ src: 'assets/models/a.glb' }] }).items).toHaveLength(0);
    }
  });

  it('쓰레기 입력에도 빈 오버레이를 돌려준다', () => {
    for (const v of [null, undefined, 42, 'x', [], {}]) {
      expect(loadOverlay(v)).toEqual({ version: OVERLAY_VERSION, items: [] });
    }
  });
});

describe('상수 핀 — 값이 바뀌면 소리가 나야 한다', () => {
  // 아래 다른 단언들은 상수를 **심볼로** 읽으므로 값이 바뀌면 기대값도 함께 움직인다.
  // 그 축이 지키는 것은 "clamp 가 상수를 쓰는가" 이고, "상수가 얼마인가" 는 여기서만 잡힌다.
  // 값을 바꿀 정당한 이유가 생기면 이 줄도 함께 고치면 된다 — 요점은 **조용히** 바뀌지
  // 않는 것이다.
  it('경계 상수는 이 값이다', () => {
    expect(S_MIN).toBe(0.01);
    expect(S_MAX).toBe(100);
    expect(POS_LIMIT).toBe(100_000);
  });
});

describe('emptyOverlay — 공유되지 않는다', () => {
  it('호출할 때마다 새 객체를 준다 — 한 소비자의 push 가 다른 소비자에게 보이면 안 된다', () => {
    const a = emptyOverlay();
    a.items.push({ src: 'assets/models/x.glb', x: 0, y: 0, z: 0, ry: 0, s: 1 });
    expect(emptyOverlay().items).toHaveLength(0);
  });
});

describe('normalizeOverlay — 던지지 않고 정규화한다', () => {
  it('안전하지 않은 src 를 가진 항목만 버리고 나머지는 살린다', () => {
    const out = normalizeOverlay({
      version: 1,
      items: [
        { src: 'assets/models/ok.glb', x: 1, y: 2, z: 3, ry: 0.5, s: 2 },
        { src: 'blob:http://x/a.glb', x: 9, y: 9, z: 9, ry: 0, s: 1 },
        { src: 'assets/models/ok2.glb', x: 0, y: 0, z: 0, ry: 0, s: 1 },
      ],
    });
    expect(out.items.map((i) => i.src)).toEqual(['assets/models/ok.glb', 'assets/models/ok2.glb']);
    expect(out.items[0]).toEqual({ src: 'assets/models/ok.glb', x: 1, y: 2, z: 3, ry: 0.5, s: 2 });
  });

  it('빠진 수치는 기본값으로 채운다', () => {
    const out = normalizeOverlay({ items: [{ src: 'assets/models/a.glb' }] });
    expect(out.items[0]).toEqual({ src: 'assets/models/a.glb', x: 0, y: 0, z: 0, ry: 0, s: 1 });
  });

  // 상수를 리터럴로 미러링하지 않는다(검수관 P2). `toBeLessThanOrEqual(100)` 로 적으면
  // 상수를 **낮추는** 변경에 검출력이 0이다 — 정확히 경계값과 같은지를 본다.
  it('스케일을 정확히 경계값으로 클램프한다 — 0·음수는 모델을 사라지게 하거나 뒤집는다', () => {
    const out = normalizeOverlay({
      items: [
        { src: 'assets/models/a.glb', s: 0 },
        { src: 'assets/models/b.glb', s: -5 },
        { src: 'assets/models/c.glb', s: 1e9 },
      ],
    });
    expect(out.items.map((i) => i.s)).toEqual([S_MIN, S_MIN, S_MAX]);
  });

  it('좌표를 정확히 경계값으로 클램프하고 NaN·Infinity 를 기본값으로 떨어뜨린다', () => {
    const out = normalizeOverlay({
      items: [{ src: 'assets/models/a.glb', x: 1e12, y: NaN, z: Infinity }],
    });
    expect(out.items[0].x).toBe(POS_LIMIT);
    expect(out.items[0].y).toBe(0);
    expect(out.items[0].z).toBe(0);
  });

  it('음수 방향 좌표도 경계값으로 클램프한다', () => {
    const out = normalizeOverlay({ items: [{ src: 'assets/models/a.glb', x: -1e12 }] });
    expect(out.items[0].x).toBe(-POS_LIMIT);
  });

  // 회전만 클램프가 아니라 주기 접기다(검수관 P12). 클램프하면 3π 가 2π(=0)로 잘려
  // **π 여야 할 회전이 0** 이 된다 — 좌표와 달리 회전은 주기적이라 축이 다르다.
  it('회전은 주기를 접는다 — 3π 는 π 이고 정상 입력은 안 건드린다', () => {
    const out = normalizeOverlay({
      items: [
        { src: 'assets/models/a.glb', ry: Math.PI * 3 },
        { src: 'assets/models/b.glb', ry: -0.5 },
        { src: 'assets/models/c.glb', ry: 1e12 },
      ],
    });
    expect(out.items[0].ry).toBeCloseTo(Math.PI);
    expect(out.items[1].ry).toBe(-0.5);
    expect(Math.abs(out.items[2].ry)).toBeLessThan(Math.PI * 2);
  });

  it('항목이 객체가 아니면 건너뛴다', () => {
    const out = normalizeOverlay({ items: [null, 'x', 42, { src: 'assets/models/a.glb' }] });
    expect(out.items).toHaveLength(1);
  });

  it('출력 version 은 항상 현재 버전이다 — 그래서 버전 판정은 이 함수보다 앞이어야 한다', () => {
    expect(normalizeOverlay({ version: 999, items: [] }).version).toBe(OVERLAY_VERSION);
  });
});

describe('validateOverlay — 내보내기 관문', () => {
  it('무엇이 왜 거부됐는지 인덱스와 함께 돌려준다', () => {
    const { overlay, issues } = validateOverlay({
      items: [
        { src: 'assets/models/ok.glb' },
        { src: 'blob:http://x/a.glb' },
        null,
        { src: 'assets/models/ok2.glb', x: 'NaN' },
      ],
    });
    // 3번은 `src` 가 안전하므로 `overlay` 에는 안 실리지만(bad-number 로 조기 반환)
    // 0번만 살아남는다. 즉 issues 에 오르는 것과 버려지는 것은 **같지 않다**.
    expect(overlay.items.map((i) => i.src)).toEqual(['assets/models/ok.glb']);
    expect(issues).toEqual([
      { index: 1, reason: 'unsafe-src' },
      { index: 2, reason: 'not-object' },
      { index: 3, reason: 'bad-number' },
    ]);
  });

  // ★ 검수관 B2 가 만든 단언. 관문이 "커밋 가능" 이라 말하면서 값을 바꾸면 화면과 파일이
  //   달라지고, 감독은 배포한 뒤에야 안다.
  it('클램프로 값이 바뀌면 그것도 사유로 보고한다 — 관문 통과 = 무손실', () => {
    const { overlay, issues } = validateOverlay({
      items: [{ src: 'assets/models/a.glb', x: 1e9, y: 0, z: 0, ry: 0, s: 0 }],
    });
    expect(issues).toEqual([{ index: 0, reason: 'clamped' }]);
    expect(overlay.items[0].s).toBe(S_MIN);
    expect(overlay.items[0].x).toBe(POS_LIMIT);
  });

  it('items 가 배열이 아니면 사유로 보고한다 — "issues 0 = 안전" 이 거짓이면 안 된다', () => {
    for (const raw of [null, undefined, 42, {}, { items: 'x' }, { items: null }]) {
      const { overlay, issues } = validateOverlay(raw);
      expect(overlay).toEqual({ version: OVERLAY_VERSION, items: [] });
      expect(issues).toEqual([{ reason: 'items-not-array' }]);
    }
  });

  // ★ 검수관 B4 가 만든 단언 둘. 진입점(`loadOverlay`)만 좁히고 **같은 `raw` 를 받는
  //   형제 함수에는 가드를 안 둔 것**이 B1 을 고치며 생긴 사각이었다.
  it('미래 버전은 관문에서도 사유로 보고한다 — 두 함수가 같은 파일에 같은 말을 해야 한다', () => {
    const raw = { version: OVERLAY_VERSION + 1, items: [{ src: 'assets/models/a.glb', x: 1 }] };
    const { overlay, issues } = validateOverlay(raw);
    expect(issues).toEqual([{ reason: 'version-too-new' }]);
    expect(overlay.items).toHaveLength(0);
    // 관문이 "커밋 가능" 이라 했는데 런타임은 안 얹는 상태가 되면 안 된다.
    expect(loadOverlay(raw).items).toHaveLength(0);
  });

  it('계약이 모르는 항목 필드가 사라지면 사유로 보고한다 — v2 파일을 v1 이 검증할 때', () => {
    const { overlay, issues } = validateOverlay({
      items: [{ src: 'assets/models/a.glb', x: 1, y: 0, z: 0, ry: 0, s: 1, sx: 5, name: 'hall' }],
    });
    expect(issues).toEqual([{ index: 0, reason: 'unknown-field' }]);
    expect(Object.keys(overlay.items[0]).sort()).toEqual(['ry', 's', 'src', 'x', 'y', 'z']);
  });

  // ★ 유도(`KNOWN_ITEM_KEYS = Object.keys(normalizeItem(…))`)를 **목록으로 되돌리는 변경**
  //   자체를 막는 단언. 유도 구조가 M1 결함 클래스를 봉쇄하는 것은 맞지만, **그 구조를
  //   되돌리는 것은 아무도 안 잡았다** — 5회차 뮤테이션 ②가 0 failed 였던 이유다
  //   ("읽기 좋다" 며 목록으로 되돌리면 사각이 조용히 다시 열린다).
  //
  //   불변식: 어떤 키를 주든 **모른다고 보고하거나(unknown-field) 실제로 출력에 싣거나**
  //   둘 중 하나여야 한다. 화이트리스트에만 있고 출력에는 없는 키는 *"안다"* 고 해놓고
  //   버리는 것이고, 그것이 B4·B6 이 서 있던 자리다.
  it('계약이 안다고 한 키는 반드시 출력에 실린다 — 화이트리스트만 늘리는 변경을 막는다', () => {
    for (const k of ['name', 'sx', 'sy', 'tag', 'color', 'id', 'meta']) {
      const { overlay, issues } = validateOverlay({
        items: [{ src: 'assets/models/a.glb', [k]: 1 }],
      });
      const flagged = issues.some((i) => i.reason === 'unknown-field');
      const present = k in (overlay.items[0] as unknown as Record<string, unknown>);
      expect(flagged || present).toBe(true);
    }
  });

  it('최상위도 같다 — 안다고 한 키는 출력에 실린다', () => {
    for (const k of ['meta', 'author', 'notes']) {
      const { overlay, issues } = validateOverlay({ version: OVERLAY_VERSION, items: [], [k]: 1 });
      const flagged = issues.some((i) => i.reason === 'unknown-field');
      const present = k in (overlay as unknown as Record<string, unknown>);
      expect(flagged || present).toBe(true);
    }
  });

  it('최상위 미지 필드도 본다', () => {
    const { issues } = validateOverlay({ version: OVERLAY_VERSION, items: [], meta: { author: 'x' } });
    expect(issues).toEqual([{ reason: 'unknown-field' }]);
  });

  it('해석할 수 없는 version 을 사유로 보고한다 — 조용히 v1 로 덮지 않는다', () => {
    for (const v of INVALID_VERSIONS) {
      const { overlay, issues } = validateOverlay({
        version: v, items: [{ src: 'assets/models/a.glb' }],
      });
      expect(issues).toEqual([{ reason: 'version-invalid' }]);
      expect(overlay.items).toHaveLength(0);
    }
  });

  it('회전이 접히면 clamped 가 아니라 folded 로 보고한다 — 잘린 게 아니다', () => {
    const { issues } = validateOverlay({
      items: [{ src: 'assets/models/a.glb', ry: Math.PI * 3 }],
    });
    expect(issues).toEqual([{ index: 0, reason: 'folded' }]);
  });

  // ★ 검수관 G-1. 계약 문장(*"issues 가 비면 무손실"*)을 케이스로 강제한다 — version 도
  //   키도 값도. `Object.is` 인 것은 `-0`/`+0` 오탐을 막기 위해서다(검수관 지정).
  it('issues 가 비면 라운드트립이 무손실이다 — version·키·값 전부', () => {
    const cases: Array<Record<string, unknown>> = [
      { version: OVERLAY_VERSION, items: [{ src: 'assets/models/a.glb', x: 1, y: 2, z: 3, ry: 0.5, s: 2 }] },
      { items: [{ src: 'assets/models/b.glb', x: -7.5, y: 0, z: 12, ry: -1.25, s: 0.5 }] },
      { version: OVERLAY_VERSION, items: [] },
    ];
    for (const raw of cases) {
      const { overlay, issues } = validateOverlay(raw);
      expect(issues).toEqual([]);
      if ('version' in raw) expect(overlay.version).toBe(raw.version);
      const inItems = raw.items as Array<Record<string, unknown>>;
      inItems.forEach((item, i) => {
        const out = overlay.items[i] as unknown as Record<string, unknown>;
        for (const k of Object.keys(item)) expect(Object.is(out[k], item[k])).toBe(true);
      });
    }
  });

  // ★ 검수관 G-3. 개수만 비교하면 부족하다 — 값까지 같아야 "같은 말" 이다.
  it('issues 가 비면 loadOverlay 와 items 가 값까지 같다', () => {
    const raw = { items: [{ src: 'assets/models/a.glb', x: 1, y: 2, z: 3, ry: 0.5, s: 2 }] };
    const { overlay, issues } = validateOverlay(raw);
    expect(issues).toEqual([]);
    expect(loadOverlay(raw).items).toEqual(overlay.items);
  });

  // ★ 검수관 GS-O3 의 나머지 절반. 위 단언만 있으면 *"두 함수는 언제나 같다"* 로 읽히고,
  //   그 오독이 B10 반려 사유였다. **다르다는 것도 단언으로 못박는다** — 그래야 나중에
  //   설계를 "완전 일치" 로 바꿀 때 이 줄이 빨간불로 알린다.
  //
  //   ⚠ 이 단언이 깨지는 것은 고장이 아니라 **설계가 바뀌었다는 신호**다. 그때는
  //   `overlay.ts` 의 `validateOverlay` JSDoc 에 있는 *"소비자가 반드시 읽을 것"* 절도
  //   함께 거짓이 되므로 **둘을 같이 고쳐라. 단언만 지우고 지나가지 마라.**
  it('issues 가 비지 않으면 두 함수 결과가 다르다 — 미리보기와 내보내기의 함정', () => {
    const raw = { items: [{ src: 'assets/models/a.glb', x: 'NaN' }] };
    const { overlay, issues } = validateOverlay(raw);

    expect(issues).toEqual([{ index: 0, reason: 'bad-number' }]);
    expect(overlay.items).toHaveLength(0); // 관문은 항목째 버린다
    expect(
      loadOverlay(raw).items,
      '★ 이 단언이 깨진 것은 설계가 바뀌었다는 신호다 — 두 함수를 완전 일치시켰다면 '
      + 'overlay.ts 의 validateOverlay JSDoc "소비자가 반드시 읽을 것" 절도 함께 거짓이 된다. '
      + '단언만 지우고 지나가지 말고 둘을 같이 고쳐라.',
    ).toHaveLength(1); // 런타임은 x:0 으로 살린다
    expect(loadOverlay(raw).items[0].x).toBe(0);
  });

  it('전부 정상이면 issues 가 비어 있다 — 이것이 커밋 가능 조건이다', () => {
    const { issues } = validateOverlay({
      version: OVERLAY_VERSION,
      items: [{ src: 'assets/models/a.glb', x: 1, y: 0, z: 2, ry: 0, s: 1 }],
    });
    expect(issues).toEqual([]);
  });

  it('issues 가 비면 수치가 입력 그대로다 — 무손실 계약의 실제 단언', () => {
    const raw = { items: [{ src: 'assets/models/a.glb', x: 12.5, y: -3, z: 7, ry: 1.25, s: 0.5 }] };
    const { overlay, issues } = validateOverlay(raw);
    expect(issues).toEqual([]);
    expect(overlay.items[0]).toEqual({ src: 'assets/models/a.glb', ...{ x: 12.5, y: -3, z: 7, ry: 1.25, s: 0.5 } });
  });
});
