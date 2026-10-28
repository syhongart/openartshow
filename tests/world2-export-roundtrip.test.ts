// @vitest-environment node
//
// **내보내기 왕복 무손실** — 읽은 것이 그대로 나가는가 (W8-4 D1.5).
//
// ── 왜 이 파일이 생겼나: 「무손실」이라 말하면서 작품을 버리고 있었다 ────────
// `features/overlay.ts` 의 `toRaw()` 반환에 **`arts` 가 없었다**. 그래서:
//
//   1. 작품이 걸린 문서를 읽는다 → 액자가 화면에 선다
//   2. 편집에서 내보낸다 → `reviewOverlay(host.toRaw())` 에 `arts` 가 **없다**
//   3. `validateOverlay` 가 `undefined` 를 **issue 없이** `[]` 로 채운다
//   4. → **`clean === true`. 화면은 「무손실」이라고 말한다.**
//
// 그 코드의 주석은 *"편집을 한 번도 안 했어도 **읽은 것이 그대로 나가야 한다**(왕복
// 무손실)"* 를 **두 번** 적고 있었다. 문장이 거짓이었다.
//
// 직전 회차(W8-3 S7)가 같은 형태를 고쳤다 — 내보내기가 저장소에 없는 GLB 를 가리키며
// *"저장했습니다"* 로 끝나던 것. 그때는 **못 보낸 것이 보낸 것으로 적혔고**, 이번엔
// **보낸 것이 사라진다.** 둘 다 「화면이 성공이라고 말하는데 아니다」이다.
//
// ── 팀장 조건 (2026-08-17) ─────────────────────────────────────────────────
// *"「구버전 데이터 로드는 clean」과 「신버전에서 arts 유실은 not clean」이 **둘 다**
// 성립해야 한다."* — 아래 두 describe 가 각각 그 절반이다. 하나만 있으면 축이 반쪽이다:
// 전자만 보면 유실을 못 잡고, 후자만 보면 구버전 문서가 전부 빨간불이 된다.

import { describe, it, expect } from 'vitest';
import { reviewOverlay } from '../frontend/js/world2/edit/export.js';
import { validateOverlay } from '../frontend/js/world2/decide/overlay.js';

const ART = { src: 'assets/art/a.png', x: 1, y: 2, z: 3, ry: 0, w: 2.4, ar: 1.5 };

/** `toRaw()` 가 내는 형태. **실물과 같은 키 집합**이어야 이 검사가 의미를 갖는다 */
function raw(over: Record<string, unknown> = {}) {
  return { version: 2, items: [], parcels: [], surfaces: [], arts: [], ...over };
}

// ⚠ `surfaces` 는 **배열**이다. 첫 판본이 `{}` 로 적어 모든 케이스가 `surfaces-not-array`
// 로 빨간불이 됐고, 하마터면 「계약이 구버전 문서를 거부한다」로 오진할 뻔했다 —
// **실패 사유를 찍어 보고서야 내 픽스처 결함인 것이 드러났다.** 대역이 실물 형태와
// 다르면 그 검사가 재는 것은 실물이 아니다.

describe('★ 왕복 무손실 — 읽은 작품이 그대로 나간다', () => {
  it('★ `arts` 가 든 문서를 내보내면 **작품 수가 유지된다**', () => {
    const rev = reviewOverlay(raw({ arts: [ART, { ...ART, src: 'assets/art/b.jpg' }] }));
    const out = JSON.parse(rev.json) as { arts?: unknown[] };
    expect(out.arts, '★ 내보낸 JSON 에 arts 가 없다').toBeDefined();
    expect(out.arts!.length, '★ 작품이 사라졌다 — 화면은 「무손실」이라고 말한다').toBe(2);
  });

  it('★ 작품의 값이 보존된다 — 개수만 맞고 내용이 비면 그것도 유실이다', () => {
    const rev = reviewOverlay(raw({ arts: [ART] }));
    const out = JSON.parse(rev.json) as { arts: { src: string; w: number; ar: number }[] };
    expect(out.arts[0].src).toBe('assets/art/a.png');
    expect(out.arts[0].w).toBeCloseTo(2.4, 6);
    expect(out.arts[0].ar).toBeCloseTo(1.5, 6);
  });

  it('★ 작품이 든 문서도 `clean` 이다 — 정상 데이터가 경고를 내면 아무도 안 읽는다', () => {
    expect(reviewOverlay(raw({ arts: [ART] })).clean).toBe(true);
  });
});

describe('★ 팀장 조건 — 두 방향이 **둘 다** 성립한다', () => {
  it('★ 구버전 문서(`arts` 자체가 없음) 로드는 **clean** 이다', () => {
    // 「생략 = 기존 동작」이 이 저장소의 확장 규약이다. 구버전을 열었다고 빨간불이 되면
    // 그 규약이 깨지고, 실제로 라이브 `world2-overlay.json` 이 그 형태다.
    const { arts, ...noArts } = raw();
    void arts;
    const rev = reviewOverlay(noArts);
    expect(rev.clean, '★ 구버전 문서가 빨간불이 됐다').toBe(true);
    expect(JSON.parse(rev.json).arts, '★ 정규화가 빈 배열을 안 채웠다').toEqual([]);
  });

  it('★ 신버전에서 작품이 **유실되면** 그 사실이 드러난다', () => {
    // 이 축이 반쪽이었던 것이 D1.5 결함의 전부다 — `undefined` 와 「있었는데 사라짐」이
    // **구별되지 않아서** 유실이 `clean` 으로 통과했다.
    //
    // 계약은 `undefined` 를 issue 없이 `[]` 로 채운다(구버전 규약). 그러므로 유실을
    // **계약 층에서** 잡을 수는 없다 — 잡는 자리는 **왕복을 실제로 도는 이 검사**다.
    const before = reviewOverlay(raw({ arts: [ART, ART] }));
    const after = reviewOverlay(raw({}));   // 같은 세션인데 arts 가 빠져 나온 상황
    const n = (r: { json: string }) => (JSON.parse(r.json).arts as unknown[]).length;
    expect(n(before), '★ 왕복 전 작품 수가 0 이면 이 검사가 아무것도 안 잰다').toBe(2);
    expect(n(after)).toBe(0);
    expect(n(before) === n(after), '★ 유실이 드러나지 않는다').toBe(false);
  });
});

describe('★ 잘못된 작품은 사유와 함께 걸러진다 — 조용히 삼키지 않는다', () => {
  it('★ 저장소 밖 경로는 거부되고 `clean` 이 false', () => {
    const rev = reviewOverlay(raw({ arts: [{ ...ART, src: 'assets/gallery/aw-01.jpg' }] }));
    expect(rev.clean, '★ 남의 영역 경로가 조용히 통과했다').toBe(false);
    expect(JSON.parse(rev.json).arts).toEqual([]);
  });

  it('★ 사유가 한국어로 나온다 — 숫자만 보면 무엇을 고칠지 모른다', () => {
    const rev = reviewOverlay(raw({ arts: [{ ...ART, src: '../../etc/passwd.png' }] }));
    expect(rev.summary.length, '★ 사유가 비었다').toBeGreaterThan(0);
  });

  it('계약이 `arts` 를 배열이 아닌 값으로 받으면 사유를 낸다', () => {
    const { issues } = validateOverlay(raw({ arts: 'nope' }));
    expect(issues.some((i) => i.reason === 'arts-not-array')).toBe(true);
  });
});
