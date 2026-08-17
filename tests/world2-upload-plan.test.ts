// @vitest-environment node
//
// **자기 GLB 건물을 올리는 일** (W8-3 S7).
//
// 감독 지시(2026-08-16, 카드 답): *"특별 프리미엄 사용자는 자기만의 지엘비 건물을 올려서
// 사용할수있게할꺼야."*
//
// ── 지키는 명제 넷 ─────────────────────────────────────────────────────────
// ① **fail-closed** — 등급을 모르면 못 올린다. 「모른다」가 「된다」로 새면 층위가 장식이다
// ② **등급을 이름보다 먼저 본다** — 사용자가 할 일이 없는 사유를 먼저 말한다
// ③ 🔴 **「올렸다」가 아니라 「보낼 준비가 됐다」** — 지금 구조에서 발행은 두 걸음이고,
//    화면이 그것을 숨기면 작가는 라이브의 빈 자리를 보고서야 안다
// ④ **사유·문구를 소비자가 짓지 않는다** — 판정이 소유한다(두 곳에 적으면 갈린다)

import { describe, it, expect } from 'vitest';
import {
  judgeUpload, pendingAssets, pendingNotice, ASSET_PREFIX, ART_PREFIX, NAME_LIMIT,
} from '../frontend/js/world2/decide/upload-plan.js';
import { isSafeSrc } from '../frontend/js/world2/decide/overlay.js';

/** 실제 계약 판정을 태운다 — 검사가 제 사본을 보면 계약이 넓어져도 안 따라온다 */
const safe = (name: string) => isSafeSrc(`${ASSET_PREFIX}${name}`);

describe('★ 누가 올릴 수 있는가', () => {
  it('★ 특별 프리미엄이면 받는다', () => {
    const v = judgeUpload('house.glb', { canUpload: true }, safe('house.glb'));
    expect(v.ok, '★ 특별 프리미엄인데 거부됐다').toBe(true);
    if (v.ok) expect(v.src).toBe('assets/models/house.glb');
  });

  it('★ 아니면 거부하고 **어느 등급에서 열리는지** 말한다', () => {
    const v = judgeUpload('house.glb', { canUpload: false, tierLabel: '프리미엄' }, true);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.reason).toBe('plan');
      expect(v.message, '★ 어디서 열리는지 안 말한다').toContain('특별 프리미엄');
      expect(v.message, '★ 지금 등급을 안 말한다 — 「내가 뭔데?」가 남는다').toContain('프리미엄');
    }
  });

  it('★ 등급 표시명을 모르면 그 문장만 뺀다 — 「지금 등급은 「undefined」」가 뜨지 않게', () => {
    const v = judgeUpload('house.glb', { canUpload: false }, true);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.message).not.toContain('undefined');
  });

  it('★ 등급을 **이름보다 먼저** 본다 — 무료 사용자가 이름만 고치다 끝나지 않게', () => {
    const v = judgeUpload('한글.glb', { canUpload: false }, safe('한글.glb'));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason, '★ 이름 사유가 먼저 나왔다').toBe('plan');
  });

  it('★ 권한이 있어도 계약이 막는 이름은 거부한다 — 커밋할 수 없는 경로다', () => {
    const v = judgeUpload('한글.glb', { canUpload: true }, safe('한글.glb'));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('name');
  });

  it('★ 대문자 확장자도 계약이 거부한다 — 그 판정을 여기서 다시 만들지 않는다', () => {
    // `.GLB` 대문자 사고(`decide/overlay.ts:172-174`)가 이 저장소의 전례다. 여기서는
    // **주입된 계약 판정**이 그대로 흐르는지만 본다.
    expect(safe('House.GLB'), '계약이 대문자를 받게 바뀌었다면 이 검사를 다시 본다').toBe(false);
    const v = judgeUpload('House.GLB', { canUpload: true }, safe('House.GLB'));
    expect(v.ok).toBe(false);
  });
});

describe('★ 「보낼 준비가 됐다」 — 아직 라이브가 아닌 것을 센다', () => {
  const doc = (srcs: string[]) => JSON.stringify({
    version: 2, items: srcs.map((src) => ({ src, x: 0, y: 0, z: 0 })),
  });

  it('로컬 전용이 없으면 아무 말도 안 한다 — 할 일이 없으면 침묵이다', () => {
    expect(pendingAssets(doc(['assets/models/a.glb']), new Set())).toEqual([]);
    expect(pendingNotice([])).toBe('');
  });

  it('★ 드롭한 GLB 를 잡는다 — **계약은 이것을 깨끗하다고 판정한다**', () => {
    const local = new Set(['assets/models/mine.glb']);
    const got = pendingAssets(doc(['assets/models/a.glb', 'assets/models/mine.glb']), local);
    expect(got, '★ 저장소에 없는 파일이 조용히 통과했다').toEqual(['assets/models/mine.glb']);
  });

  it('★ 같은 파일을 여러 개 놓아도 한 번만 센다 — 「3개를 보내세요」가 거짓이 된다', () => {
    const local = new Set(['assets/models/mine.glb']);
    const many = doc(['assets/models/mine.glb', 'assets/models/mine.glb', 'assets/models/mine.glb']);
    expect(pendingAssets(many, local)).toHaveLength(1);
  });

  it('★ **내보낼 문서**를 잰다 — 관문이 걸러낸 항목까지 세면 개수가 어긋난다', () => {
    // 로컬에 있어도 문서에 안 실렸으면 보낼 필요가 없다.
    const local = new Set(['assets/models/dropped-then-deleted.glb']);
    expect(pendingAssets(doc(['assets/models/a.glb']), local)).toEqual([]);
  });

  it('깨진 JSON·items 없음에도 던지지 않는다 — 저장 자체가 막히면 안 된다', () => {
    const local = new Set(['assets/models/mine.glb']);
    expect(pendingAssets('{{{', local)).toEqual([]);
    expect(pendingAssets('{"items":"nope"}', local)).toEqual([]);
    expect(pendingAssets('null', local)).toEqual([]);
  });

  it('★ 문구가 「올렸다」가 아니라 「아직 라이브가 아니다」라고 말한다', () => {
    const msg = pendingNotice(['assets/models/mine.glb']);
    expect(msg, '★ 라이브가 아니라는 사실을 안 말한다').toContain('아직 라이브가 아닙니다');
    expect(msg, '★ 무엇을 보내야 하는지 안 말한다').toContain('mine.glb');
    expect(msg, '★ 경로 접두가 그대로 나온다 — 작가가 볼 것은 파일 이름이다')
      .not.toContain(ASSET_PREFIX);
  });

  it('★ 많으면 몇 개만 적고 나머지는 센다 — 한 줄이 화면을 덮지 않게', () => {
    const many = Array.from({ length: NAME_LIMIT + 2 }, (_, i) => `${ASSET_PREFIX}m${i}.glb`);
    const msg = pendingNotice(many);
    expect(msg).toContain(`${many.length}개`);
    expect(msg).toContain(`외 ${many.length - NAME_LIMIT}개`);
    expect(msg, '★ 이름을 다 적었다').not.toContain(`m${NAME_LIMIT}.glb`);
  });
});

describe('★ 작품 이미지도 센다 (W8-4 D3)', () => {
  // 🔴 이 축이 0이던 동안 **편집으로 건 작품이 이 안내에 안 잡혔다.** 화면은
  // «저장했습니다» 로 끝나고 그 이미지는 저장소에 없으니 라이브가 빈 액자가 된다 —
  // GLB 가 W8-3 S7 에서 겪은 그 침묵의 재발이다. `items` 만 훑던 것이 원인이었다.
  const both = (items: string[], arts: string[]) => JSON.stringify({
    version: 2,
    items: items.map((src) => ({ src, x: 0, y: 0, z: 0 })),
    arts: arts.map((src) => ({ src, x: 0, y: 0, z: 0, ry: 0, w: 1, ar: 1 })),
  });

  it('★ 드롭한 이미지를 잡는다 — `items` 만 보면 여기가 통째로 안 잡힌다', () => {
    const local = new Set([`${ART_PREFIX}mine.png`]);
    expect(pendingAssets(both([], [`${ART_PREFIX}a.png`, `${ART_PREFIX}mine.png`]), local))
      .toEqual([`${ART_PREFIX}mine.png`]);
  });

  it('★ GLB 와 작품을 **함께** 센다 — 한 종류만 세면 나머지가 조용히 빠진다', () => {
    const local = new Set([`${ASSET_PREFIX}mine.glb`, `${ART_PREFIX}mine.png`]);
    expect(pendingAssets(both([`${ASSET_PREFIX}mine.glb`], [`${ART_PREFIX}mine.png`]), local))
      .toEqual([`${ART_PREFIX}mine.png`, `${ASSET_PREFIX}mine.glb`]);
  });

  it('★ `arts` 가 없는 구버전 문서에도 던지지 않는다', () => {
    const local = new Set([`${ART_PREFIX}mine.png`]);
    expect(pendingAssets('{"items":[]}', local)).toEqual([]);
    expect(pendingAssets('{"arts":"nope"}', local)).toEqual([]);
  });

  it('★ 작품 이름이 **안 잘린다** — 접두 길이를 고정으로 자르면 글자가 날아간다', () => {
    // `slice(ASSET_PREFIX.length)` 였을 때 `assets/art/a.png` 가 `png` 로 나왔다.
    // 「무엇을 보내야 하는지」가 파일 이름이 아니면 안내가 아니다.
    const msg = pendingNotice([`${ART_PREFIX}a.png`]);
    expect(msg, '★ 이름이 잘렸다').toContain('a.png');
    expect(msg, '★ 경로 접두가 그대로 나온다').not.toContain(ART_PREFIX);
  });

  it('★ 문구가 GLB 만 말하지 않는다 — 이제 이미지도 이 줄에 실린다', () => {
    expect(pendingNotice([`${ART_PREFIX}a.png`]), '★ 이미지를 GLB 라고 부른다')
      .not.toContain('GLB');
  });
});
