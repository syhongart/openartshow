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
