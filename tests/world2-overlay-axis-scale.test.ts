// tests/world2-overlay-axis-scale.test.ts — **축별 배율이 계약을 왕복하는가.**
//
// 감독 카드 판정 2026-08-22: 「축별로 늘리기 — 세 방향」.
// 발단은 신고 *"크기 조정은 R 한축만되는것 같은데?"* — 기즈모의 크기 상자가 X 하나뿐이었다.
//
// ── 이 검사가 막는 것 — **옵션 필드의 조용한 소실** ─────────────────────────
// `decide/overlay.ts` 는 값을 정규화하면서 **모르는 필드를 거부**한다(`KNOWN_ITEM_KEYS`).
// 그 목록은 `normalizeItem` 의 출력에서 **유도**되는데, 축별 배율은 「없으면 없는 대로」라
// 빈 입력으로 유도하면 **목록에 안 들어간다.** 그러면 `{sx:2}` 가 `unknown-field` 로 거부된다.
//
// 이 저장소는 그 어긋남을 **방향만 반대로** 이미 겪었다(검수관 B4·B6): 화이트리스트에만
// `name` 을 더하고 정규화를 안 고치자, `{name:'hall'}` 이 `issues: []`(커밋 가능) 판정을
// 받으면서 **출력에서 사라졌다.** 게이트는 초록이었다.
//
// 그래서 이 파일은 **왕복**을 본다 — 넣은 값이 판정을 통과하고 **그대로 나오는가**.
// 한쪽만 고치면 반드시 여기가 깨진다.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
// · 값이 **화면에 실제로 반영되는가**(집행 쪽). 그것은 기즈모·렌더 통합 테스트 몫이다 —
//   이 저장소가 「판정/집행 경계는 아무도 안 본다」로 반복해서 데인 자리다.
// · 곱한 최종 배율이 쓸 만한 값인가(`s * sx` 가 `S_MAX` 를 넘을 수 있다 — 계약이 일부러
//   클램프하지 않는다, 그 이유는 필드 주석에 있다).

import { describe, it, expect } from 'vitest';
import { normalizeOverlay, validateOverlay, S_MIN, S_MAX } from '../frontend/js/world2/decide/overlay.js';
import { readFileSync } from 'node:fs';
import { partOf, handleLabel } from '../frontend/js/world2/decide/gizmo-math.js';

/** 계약이 허용하는 경로 형식(`SRC_RE`) — 아무 문자열이나 쓰면 항목째 버려진다 */
const SRC = 'assets/models/a.glb';

/** 항목 하나짜리 오버레이를 정규화해 그 항목을 돌려준다 */
function item(raw: Record<string, unknown>) {
  const items = normalizeOverlay({ items: [{ src: SRC, ...raw }] }).items;
  // ★ 표본이 비면 아래 단언이 전부 공허해진다 — 이 저장소가 **빈 표본이 단언을 통과시킨**
  // 사고를 겪었다. 경로 형식이 틀리면 항목이 통째로 버려지므로 여기서 먼저 막는다.
  expect(items, '★ 항목이 버려졌다 — `SRC` 가 계약의 경로 형식과 맞는가').toHaveLength(1);
  return items[0]!;
}

describe('🔴 축별 배율 — 계약 왕복', () => {
  it('★ 안 주면 키가 아예 안 생긴다 — 「생략 = 기존 동작」이 버전 불변의 요점이다', () => {
    const it0 = item({});
    // ⚠ `undefined` 인지가 아니라 **키 자체가 없는지**를 본다. `sx: undefined` 로 나오면
    // 내보낸 JSON 에 그 키가 실리고(`JSON.stringify` 는 빼지만 `Object.keys` 는 센다),
    // 「이 항목은 축별을 만졌나」를 구별할 수 없게 된다.
    expect(Object.keys(it0), '★ 안 만진 항목에 축별 키가 생겼다')
      .toEqual(['src', 'x', 'y', 'z', 'ry', 's']);
  });

  it('🔴 준 것만 살아서 나온다 — 셋 중 하나만 만지는 것이 「축별」의 요점이다', () => {
    const it1 = item({ sx: 2, sz: 0.5 });
    expect(it1.sx, '★ sx 가 안 왔다').toBe(2);
    expect(it1.sz, '★ sz 가 안 왔다').toBe(0.5);
    expect('sy' in it1, '★ 안 만진 sy 가 생겼다').toBe(false);
  });

  it('🔴 「모르는 필드」로 거부되지 않는다 — 화이트리스트가 유도를 따라온다', () => {
    // 🔴 이 검사가 이 파일의 **본체**다. `KNOWN_ITEM_KEYS` 를 빈 입력으로 유도하면
    // 여기가 `unknown-field` 로 빨간불이 된다(2026-08-25 실측으로 확인).
    // ⚠ `issues` 는 `normalizeOverlay` 가 아니라 **`validateOverlay`** 가 낸다.
    const { issues } = validateOverlay({ items: [{ src: SRC, sx: 2, sy: 3, sz: 4 }] });
    expect(issues, '★ 축별 배율이 모르는 필드로 거부됐다').toEqual([]);
  });

  it('★ 범위는 `s` 와 같다 — 0 이나 음수로 물건을 지울 수 없다', () => {
    // 크기 0 은 편집 툴에서 흔한 입력이고, 그대로 두면 **화면에서 사라진 것**이
    // 「커밋 가능」 판정을 받는다 — 이 계약이 `s` 에서 이미 겪은 형태다.
    expect(item({ sx: 0 }).sx, '★ 0 이 통과했다').toBe(S_MIN);
    expect(item({ sy: -5 }).sy, '★ 음수가 통과했다').toBe(S_MIN);
    expect(item({ sz: 1e9 }).sz, '★ 상한이 안 걸렸다').toBe(S_MAX);
    expect(item({ sx: 'abc' }).sx, '★ 숫자가 아닌 값이 기본으로 안 떨어졌다').toBe(1);
  });

  it('🔴 `s` 를 대체하지 않는다 — 균등 조작이 여전히 한 손잡이다', () => {
    // 축별을 만져도 `s` 는 그대로 있어야 한다. 대체 설계였다면 「비율이 어긋난 상태를
    // 균등하게 키우는 것」이 불가능해진다(필드 주석의 이유 ②).
    const it2 = item({ s: 3, sx: 2 });
    expect(it2.s, '★ 축별을 만졌더니 `s` 가 바뀌었다').toBe(3);
    expect(it2.sx).toBe(2);
  });

  it('★ 옛 JSON 이 그대로 돈다 — 버전 불변', () => {
    // `s` 만 있는 옛 데이터가 새 코드에서 **같은 값**으로 나와야 한다.
    const old = item({ x: 1, y: 2, z: 3, ry: 0.5, s: 2 });
    expect(old, '★ 옛 형태가 달라졌다').toEqual({ src: SRC, x: 1, y: 2, z: 3, ry: 0.5, s: 2 });
  });
});

// ── 🔴 판정 ↔ 집행 경계 ──────────────────────────────────────────────────────
//
// 위 검사들은 **계약**만 본다. 그런데 이 저장소가 반복해서 놓친 것은 값이 아니라
// **경계**다 — *"계산된 값이 실제로 소비되는가"* 는 판정 쪽 테스트에도 집행 쪽 테스트에도
// 안 걸린다(구름 `alpha` 미소비가 순수 함수 안에서만 참이었던 형태).
//
// 축별 배율의 경로는 **넷**이고 하나만 끊겨도 감독 화면에서 아무 일이 안 일어난다:
//
//   ① 파일 → 씬     `features/overlay.ts` 의 `place()` 가 `at.sx` 를 받아 entry 에 싣는가
//   ② entry → 화면  `applyEntry` 가 `scale.setScalar` 가 아니라 **세 축**을 미는가
//   ③ 기즈모 → 값   `edit/gizmo.ts` 가 `target.axes.set` 을 부르는가
//   ④ 씬 → 파일     `toRaw()` 가 `sx` 를 담는가 (안 담으면 **저장할 때 사라진다** —
//                   이 파일이 `arts` 누락으로 이미 겪었고 그때 검증은 「무손실」이라 했다)
//
// ⚠ **소스를 텍스트로 읽어 확인한다.** 이 넷은 전부 three 에 의존해 헤드리스로 못 돌린다.
// 텍스트 검사라 「브라우저가 실제로 그렇게 그리는가」는 못 보지만, **경로가 끊긴 것**은
// 이 축이 유일하게 잡는다. 정규식이 빗나가면 거짓 FAIL 이 나므로 그때는 검사를 지우지
// 말고 함께 고친다.
// 뮤테이션 실측 (2026-08-25) — **이 describe 의 검출력, 8/8**:
//   ② 화면 반영을 `setScalar(e.s)` 로 되돌림 → 1 failed ✅  ← 이 회차의 급소
//   ④ 내보내기에서 축별 누락               → 1 failed ✅  (`arts` 사고와 같은 형태)
//   ① 부팅 경로가 `sx` 를 안 넘김           → 1 failed ✅
//   ③ 기즈모가 `axes.set` 을 안 부름        → 1 failed ✅
//   ③ 균등 상자 제거                        → 1 failed ✅
//   어댑터 둘 중 하나 제거 (각각)           → 각 1 failed ✅
//   `partOf` 의 축별 구별 제거              → 1 failed ✅
//
// ⚠ 어댑터 케이스는 **처음에 0 failed 였다.** `/axes:\s*\{/g` 가 `xaxes:` 도 물어 개수가
// 그대로였기 때문이다 — 이 회차에만 「글자가 있는 것을 그 선언이 있는 것으로 읽는」 실수가
// 또 나왔다(조이스틱 회차에서 세 번, 여기서 한 번). 단어 경계를 박고 재실측했다.

describe('🔴 축별 배율 — 판정이 화면까지 간다', () => {
  const read = (p: string) => readFileSync(`frontend/js/world2/${p}`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')   // 블록 주석
    .replace(/^\s*\/\/.*$/gm, '');       // 줄 주석 — 설명에 든 같은 글자를 세지 않는다

  it('🔴 ① 파일에서 읽은 축별이 씬 항목에 실린다', () => {
    const src = read('features/overlay.ts');
    expect(src, '★ `place()` 가 축별을 안 받는다').toMatch(/at:\s*\{[^}]*sx\?:/);
    expect(src, '★ entry 에 축별을 안 싣는다').toMatch(/at\.sx === undefined/);
    expect(src, '★ 부팅 경로가 축별을 안 넘긴다').toMatch(/sx:\s*it\.sx/);
  });

  it('🔴 ② 화면 반영이 균등이 아니라 세 축이다 — 여기가 이 회차의 급소다', () => {
    const src = read('features/overlay.ts');
    // `setScalar(e.s)` 가 남아 있으면 계약·기즈모를 다 고쳐도 **아무것도 안 움직인다.**
    expect(src, '★ 아직 균등으로만 민다 — `setScalar(e.s)` 가 남아 있다')
      .not.toMatch(/scale\.setScalar\(e\.s\)/);
    expect(src, '★ 세 축을 각각 미는 코드가 없다')
      .toMatch(/scale\.set\(\s*e\.s \* \(e\.sx \?\? 1\)/);
  });

  it('🔴 ③ 기즈모가 축별 문을 부른다 — 상자만 늘리고 값을 안 밀면 장식이다', () => {
    const src = read('edit/gizmo.ts');
    expect(src, '★ 축별 상자를 안 만든다').toMatch(/kind:\s*'scale',\s*axis/);
    expect(src, '★ 축별 값을 안 민다').toMatch(/target\.axes\.set\(axis/);
    // 균등이 사라지지 않았는가 — 「전체를 키운다」가 가장 흔한 조작이다.
    expect(src, '★ 균등 상자가 사라졌다').toMatch(/addPart\(even,\s*\{\s*kind:\s*'scale'\s*\}\)/);
  });

  it('🔴 ④ 내보낼 때 축별이 담긴다 — 안 담으면 저장하면서 사라진다', () => {
    const src = read('features/overlay.ts');
    expect(src, '★ `toRaw()` 가 축별을 안 담는다').toMatch(/e\.sx === undefined/);
  });

  it('🔴 어댑터 둘이 축별 문을 낸다 — 대상에 따라 되고 안 되면 「조용한 no-op」이다', () => {
    const src = read('edit/target.ts');
    // 팀장 판정 2026-08-25 의 근거 ③ — village 만 열면 GLB 를 골랐을 때 상자가 보이는데
    // 안 움직인다. 이 파일이 `onDetach` 주석에서 이미 금지한 형태다.
    // ⚠ **단어 경계를 박는다** (2026-08-25 뮤테이션 실측). 첫 판본은 `/axes:\s*\{/g` 였고
    // `axes` 를 `xaxes` 로 바꿔도 **0 failed** 였다 — 부분 문자열이라 개수가 그대로였다.
    // 이 회차에만 「글자가 있는 것을 그 선언이 있는 것으로 읽는」 실수가 또 나왔다.
    expect(src.match(/(?<![A-Za-z])axes:\s*\{/g) ?? [], '★ 어댑터 둘 다 안 낸다').toHaveLength(2);
    // 마을은 **본래 치수**를 배수로 환산해야 한다 — 그대로 노출하면 소비자가 둘을 섞는다.
    expect(src, '★ 마을이 배수 환산을 안 한다').toMatch(/axisMul\[a\]/);
    expect(src, '★ 최종식이 한 곳이 아니다').toMatch(/base\.sx \* mul \* axisMul\.x/);
  });

  it('🔴 축별 상자 넷이 서로 다른 파트다 — 함께 밝아지면 「어느 축」이 안 보인다', () => {
    // 감독이 얹기 강조를 요구한 이유가 *"마우스를 대면 그 축이 변화가 바로 생겼으면해"* 다.
    // 넷이 같은 파트를 공유하면 하나에 얹어도 넷이 다 밝아진다.
    expect(partOf({ kind: 'scale' })).toBe('scale');
    expect(partOf({ kind: 'scale', axis: 'x' })).toBe('scale:x');
    expect(partOf({ kind: 'scale', axis: 'y' })).toBe('scale:y');
    expect(partOf({ kind: 'scale', axis: 'z' })).toBe('scale:z');
    const all = new Set(['scale', 'scale:x', 'scale:y', 'scale:z']);
    expect(all.size, '★ 파트가 겹친다').toBe(4);
  });

  it('★ 글자로도 갈린다 — 상자 넷이 비슷하게 생겼다', () => {
    expect(handleLabel({ kind: 'scale' })).toBe('전체 크기');
    expect(handleLabel({ kind: 'scale', axis: 'y' })).toContain('크기');
    expect(handleLabel({ kind: 'scale', axis: 'y' }))
      .not.toBe(handleLabel({ kind: 'scale' }));
  });
});
