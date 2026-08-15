// @vitest-environment node
//
// 표면 재질(W7) — **판정과 계약을 함께** 본다.
//
// 감독 지시 2026-08-14: *"심리스텍스처. 디퓨저맵. 노말맵. 하이라이트. 메탈릭. 러프니스
// 조절하게 하자"* · *"타일링 배율로 촘촘히 힐것인지 조절하고 각도 조절하고"* ·
// *"유브이가 동일 해야겠지? 땅. 잔디. 물속"*
//
// ── 이 파일이 지키는 것 ─────────────────────────────────────────────────────
// **이음매가 생기는 값이 계약에 담기지 않는다.** 땅·잔디·건물벽은 파셀 로컬 0~1 UV 라
// (`garden.ts:120` 판 = 셀 크기, `parcel-builder.ts:225` 파셀 원점은 인스턴스 행렬로만
// 들어간다) 연속성이 세 조건에 동시에 걸려 있다 — repeat 정수 · 판 = 셀 크기 ·
// 회전이 90° 배수. 그래서 `QuarterTurns`(0~3 정수)와 `clampRepeat`(정수)이 그 두 조건을
// **타입·클램프 수준에서** 집행한다.
//
// ── 팀장 조건 (2026-08-14) ──────────────────────────────────────────────────
//   c-1 새 수치 필드가 검사에서 빠지면 테스트가 깨져야 한다 — **뮤테이션으로 실증**한다.
//       여기서는 「수치 필드 전부를 순회해 NaN 을 넣는」 축이 그 성질이다(아래).
//   c-2 `surfaces` 가 있는 **정상** JSON 이 `unknown-field` 로 오보되면 안 된다(역방향 함정).
//   c-4 임의 각도를 열려면 UV 월드좌표화가 선결 — 재론 조건은 `surface-material.ts` 주석.

import { describe, it, expect } from 'vitest';
import {
  MAP_SLOTS, PAINTABLE_WATER, SLOT_LABEL, SURFACE_KINDS, SURFACE_LABEL, UV_CENTER,
  REPEAT_MAX, REPEAT_MIN, WATER_SURFACES,
  clamp01, clampRepeat, defaultSetting, glossToRoughness, hasNoMaps, isDefaultSetting,
  isQuarterTurns, isSafeTextureSrc, isSurfaceKind, isWorldUv, normalizeSetting, normalizeTurns,
  roughnessToGloss, settingOf, textureSrcFor, turnsToRadians, upsertSetting,
  type SurfaceKind, type SurfaceSetting,
} from '../frontend/js/world2/decide/surface-material.js';
import { PAINTABLE_KINDS } from '../frontend/js/world2/parts/index.js';
import {
  emptyOverlay, normalizeOverlay, validateOverlay,
} from '../frontend/js/world2/decide/overlay.js';

const SAFE_TEX = 'assets/textures/grass.png';

/** `surfaces` 하나만 든 최소 오버레이 원본 */
function withSurface(row: unknown): unknown {
  return { version: 2, items: [], parcels: [], surfaces: [row] };
}

describe('표면 재질 — 무엇을 칠할 수 있는가', () => {
  it('모든 표면에 한국어 이름이 있다', () => {
    // 빠지면 화면에 영문 kind 가 그대로 뜬다(`clock` 을 그렇게 한 번 놓쳤다).
    for (const k of SURFACE_KINDS) {
      expect(SURFACE_LABEL[k], `★ 「${k}」 의 이름이 없다`).toBeTruthy();
    }
    expect(new Set(SURFACE_KINDS.map((k) => SURFACE_LABEL[k])).size).toBe(SURFACE_KINDS.length);
  });

  it('★ 물만 월드 UV 다 — 이 구분이 각도 제약의 근거다', () => {
    // `ocean.ts:966` 이 `vx / PLANE + 0.5` 로 월드 좌표에서 UV 를 낸다. 마을 파츠는
    // 파셀 로컬 0~1 이라 회전하면 파셀 변마다 이음매가 생긴다.
    //
    // ⚠ 기대값을 **손으로 안 적는다.** 옛 판본은 `['sea','bed']` 를 박아 두었고, 수면이
    // 목록에서 빠지자(아래 축) 그 리터럴이 그대로 낡았다 — 값 미러링이다.
    expect(SURFACE_KINDS.filter(isWorldUv)).toEqual([...PAINTABLE_WATER]);
    // 파츠 쪽에는 월드 UV 가 하나도 없어야 한다 — 있으면 각도 제약의 근거가 무너진다.
    expect(PAINTABLE_KINDS.filter((k) => isWorldUv(k))).toEqual([]);
  });

  it('★ 수면(sea)은 칠할 수 없다 — 텍스처를 얹으면 일렁임이 멈춘다', () => {
    // ── 이 축이 지키는 것 ──────────────────────────────────────────────────
    // 수면의 일렁임은 재질 파라미터가 아니라 **텍스처 `offset` 을 매 프레임 굴리는 것**이다
    // (`ocean.ts` 의 `update()` 가 `normA`·`tint`·`sparkle` 의 offset 을 굴린다). 그 슬롯에
    // 다른 텍스처를 꽂으면 굴러가는 텍스처가 재질에서 떨어져 나가 **물이 멈춘다.**
    //
    // 그래서 계약이 애초에 수면을 못 담게 한다(fail-closed). 이 축을 지우면 그 보호가
    // 통째로 사라지고, 증상은 «물이 안 움직인다» 인데 원인은 계약이라 짚기 어렵다.
    expect(SURFACE_KINDS).not.toContain('sea');
    expect(isSurfaceKind('sea')).toBe(false);
    // 그래도 **월드 UV 라는 성질은 남는다** — 둘은 다른 판정이고, 합치면 수면을 다시 열
    // 때(일렁임과 공존하는 형태를 찾으면) 각도 제약을 처음부터 다시 세워야 한다.
    expect(isWorldUv('sea' as never)).toBe(true);
    expect(WATER_SURFACES).toContain('sea');
  });

  it('모르는 종류를 안 받는다', () => {
    expect(isSurfaceKind('garden')).toBe(true);
    expect(isSurfaceKind('없는표면')).toBe(false);
    expect(isSurfaceKind(3)).toBe(false);
  });
});

describe('표면 재질 — 각도는 90° 단위다 (계약 수준 집행)', () => {
  it('★ 0~3 만 각도로 인정한다', () => {
    for (const v of [0, 1, 2, 3]) expect(isQuarterTurns(v), `★ ${v} 를 거부한다`).toBe(true);
    for (const v of [4, -1, 0.5, '1', null, undefined, NaN]) {
      expect(isQuarterTurns(v), `★ ${String(v)} 를 각도로 받는다`).toBe(false);
    }
  });

  it('★ 모르는 값은 0(안 돌림)이다 — 안 돌리는 쪽이 언제나 이음매가 없다', () => {
    expect(normalizeTurns(0.5)).toBe(0);
    expect(normalizeTurns(Math.PI / 4), '★ 라디안을 그대로 받았다').toBe(0);
    expect(normalizeTurns('2')).toBe(0);
  });

  it('라디안 변환이 90° 배수만 낸다', () => {
    expect([0, 1, 2, 3].map((t) => turnsToRadians(t as 0 | 1 | 2 | 3)))
      .toEqual([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]);
  });

  it('★ 회전 기준점이 UV 한가운데다 — three 기본 (0,0) 이면 배율과 함께 무늬가 밀린다', () => {
    expect(UV_CENTER).toBe(0.5);
  });
});

describe('표면 재질 — 배율은 정수다', () => {
  it('★ 비정수를 정수로 접는다 — 파셀 변마다 하드 심이 생기는 값이다', () => {
    expect(clampRepeat(2.5) % 1, '★ 비정수 배율이 통과한다').toBe(0);
    expect(clampRepeat(3.4)).toBe(3);
    expect(clampRepeat(3.6)).toBe(4);
  });

  it('범위에 가둔다', () => {
    expect(clampRepeat(0)).toBe(REPEAT_MIN);
    expect(clampRepeat(-5)).toBe(REPEAT_MIN);
    expect(clampRepeat(9999)).toBe(REPEAT_MAX);
  });

  it('모르는 값은 1(원본 크기)이다', () => {
    for (const v of [NaN, Infinity, '4', null, undefined, {}]) {
      expect(clampRepeat(v), `★ ${String(v)} 에서 1 이 아니다`).toBe(1);
    }
  });
});

describe('표면 재질 — 반짝임은 러프니스의 반대다', () => {
  it('★ 왕복한다 — 화면 노브 하나가 재질 값 하나를 정확히 가리킨다', () => {
    for (const g of [0, 0.25, 0.5, 1]) {
      expect(roughnessToGloss(glossToRoughness(g))).toBeCloseTo(g, 10);
    }
  });

  it('반짝임 최대가 러프니스 0 이다', () => {
    expect(glossToRoughness(1)).toBe(0);
    expect(glossToRoughness(0)).toBe(1);
  });

  it('범위 밖과 모르는 값을 가둔다', () => {
    expect(glossToRoughness(5)).toBe(0);
    expect(glossToRoughness(-5)).toBe(1);
    expect(glossToRoughness(NaN)).toBe(1);
    expect(clamp01('x', 0.3)).toBe(0.3);
  });
});

describe('표면 재질 — 텍스처 경로', () => {
  it('커밋된 텍스처만 통과한다', () => {
    expect(isSafeTextureSrc(SAFE_TEX)).toBe(true);
    expect(isSafeTextureSrc('assets/textures/a/b_c-1.webp')).toBe(true);
  });

  it('★ 절대 URL·상위 탈출·표기 다형성을 막는다 — `isSafeSrc` 와 같은 축이다', () => {
    for (const bad of [
      'https://x.com/a.png', 'blob:abc', 'data:image/png;base64,AA',
      '//host/a.png', '/abs/a.png', 'assets/textures/../../etc/a.png',
      'assets/textures//a.png', 'assets/textures/./a.png',
      'assets/models/a.glb', 'assets/textures/a.glb', 'assets/textures/a.PNG',
      '', null, 42,
    ]) {
      expect(isSafeTextureSrc(bad), `★ 「${String(bad)}」 가 통과한다`).toBe(false);
    }
  });
});

describe('표면 재질 — 기본값은 「손 안 댄 화면」이다', () => {
  it('★ 맵이 하나도 없고 반사가 없다', () => {
    const d = defaultSetting('garden');
    expect(hasNoMaps(d), '★ 기본값에 맵이 붙어 있다').toBe(true);
    expect([d.repeat, d.turns, d.metalness, d.roughness]).toEqual([1, 0, 0, 1]);
  });

  it('안전하지 않은 텍스처는 조용히 버린다 — 던지지 않는 것이 이 계약의 규약이다', () => {
    const s = normalizeSetting('garden', { map: 'https://x.com/a.png', normalMap: SAFE_TEX });
    expect(s.map, '★ 외부 URL 이 살아남았다').toBeUndefined();
    expect(s.normalMap).toBe(SAFE_TEX);
  });
});

// ── 계약 통합 (판정/집행 경계) ──────────────────────────────────────────────

describe('오버레이 계약 — surfaces', () => {
  it('빈 오버레이에 surfaces 가 있다 — KNOWN_ROOT_KEYS 가 여기서 유도된다', () => {
    expect(emptyOverlay().surfaces).toEqual([]);
  });

  it('★ (c-2) surfaces 가 있는 **정상** JSON 은 unknown-field 를 안 낸다', () => {
    // 역방향 함정: `emptyOverlay()` 에 필드를 안 넣으면 정상 JSON 이 오보된다.
    const { issues } = validateOverlay(withSurface({ kind: 'garden', map: SAFE_TEX }));
    expect(issues.filter((i) => i.reason === 'unknown-field'),
      '★ 정상 surfaces 가 「모르는 필드」로 보고된다').toEqual([]);
  });

  it('★ (c-1) **수치 필드 전부**가 검사를 받는다 — 유도 목록이라 필드가 늘면 따라온다', () => {
    // 이 축이 팀장 조건 c-1 의 집행이다. `SURFACE_NUM_KEYS` 를 손으로 적었다면 새 필드가
    // 그 배열에서 빠져도 아무 축이 안 깨진다 — 여기서는 기본값의 수치 키를 **순회**하므로
    // 필드를 더하는 순간 이 축이 그것도 검사한다.
    const numKeys = Object.entries(defaultSetting('garden'))
      .filter(([, v]) => typeof v === 'number').map(([k]) => k);
    expect(numKeys.length, '★ 수치 필드가 하나도 없다').toBeGreaterThan(0);

    for (const k of numKeys) {
      const { issues } = validateOverlay(withSurface({ kind: 'garden', [k]: 'x' }));
      expect(issues.some((i) => i.reason === 'bad-number'),
        `★ 「${k}」 에 숫자가 아닌 값을 넣었는데 안 잡힌다`).toBe(true);
    }
  });

  it('★ 범위 밖 수치가 clamped 로 보고된다', () => {
    const { issues } = validateOverlay(withSurface({ kind: 'garden', repeat: 9999 }));
    expect(issues.some((i) => i.reason === 'clamped')).toBe(true);
  });

  it('★ 모르는 표면 종류를 사유와 함께 거절한다', () => {
    const { overlay, issues } = validateOverlay(withSurface({ kind: '없는표면' }));
    expect(overlay.surfaces).toEqual([]);
    expect(issues.some((i) => i.reason === 'surface-unknown-kind')).toBe(true);
  });

  it('★ 안전하지 않은 텍스처를 사유와 함께 말한다 — 조용히 버리지 않는다', () => {
    const { issues } = validateOverlay(withSurface({ kind: 'garden', map: 'https://x.com/a.png' }));
    expect(issues.some((i) => i.reason === 'surface-unsafe-texture'),
      '★ 외부 URL 을 버리면서 아무 말도 안 한다').toBe(true);
  });

  it('★ surfaces 가 배열이 아니면 말한다 — 통째로 사라지는 것이다', () => {
    const { issues } = validateOverlay({ version: 2, items: [], parcels: [], surfaces: 3 });
    expect(issues.some((i) => i.reason === 'surfaces-not-array')).toBe(true);
  });

  it('같은 종류가 둘이면 뒤엣것이 이긴다', () => {
    const o = normalizeOverlay({
      version: 2,
      surfaces: [
        { kind: 'garden', repeat: 2 },
        { kind: 'garden', repeat: 5 },
      ],
    });
    expect(o.surfaces).toHaveLength(1);
    expect(o.surfaces[0].repeat).toBe(5);
  });

  it('★ 순서가 선언 순으로 고정된다 — 안 그러면 내보내기마다 diff 가 난다', () => {
    const reversed = [...SURFACE_KINDS].reverse().map((kind) => ({ kind }));
    const o = normalizeOverlay({ version: 2, surfaces: reversed });
    expect(o.surfaces.map((s) => s.kind)).toEqual([...SURFACE_KINDS]);
  });

  it('★ 정규화와 검증이 **같은 순서**를 낸다 — 두 함수가 다른 말을 하면 안 된다', () => {
    // 이 파일이 세 번 반려된 형태가 「두 함수가 같은 파일에서 다른 말」이다.
    //
    // ⚠ **입력을 온전하게 준다.** 첫 판본은 `{ version, surfaces }` 만 줬고 빨간불이 났는데
    //   그 빨간불은 결함이 아니라 **내 오해**였다: `validateOverlay` 는 내보내기 관문이라
    //   `items` 가 배열이 아니면 `items-not-array` 로 **조기 반환**하고(`:586-589`),
    //   `normalizeOverlay` 는 런타임이라 관대하다. 두 함수의 그 차이는 의도된 설계이고
    //   파일 주석이 설명한다 — 여기서 재려는 것은 **온전한 입력에서의 순서 일치**다.
    const raw = {
      version: 2,
      items: [],
      parcels: [],
      surfaces: [...SURFACE_KINDS].reverse().map((kind) => ({ kind })),
    };
    const a = normalizeOverlay(raw).surfaces.map((s) => s.kind);
    const b = validateOverlay(raw).overlay.surfaces.map((s) => s.kind);
    expect(a).toEqual(b);
    expect(a, '★ 선언 순서가 아니다').toEqual([...SURFACE_KINDS]);
  });

  it('surfaces 를 안 준 옛 JSON 이 그대로 유효하다 — 「생략 = 지금 동작」', () => {
    const o = normalizeOverlay({ version: 2, items: [], parcels: [] });
    expect(o.surfaces).toEqual([]);
  });

  it('★ 라디안 각도를 담으려 해도 0 으로 떨어진다 — 이음매 값이 계약에 못 들어간다', () => {
    const o = normalizeOverlay(withSurface({ kind: 'garden', turns: Math.PI / 4 }));
    expect(o.surfaces[0].turns, '★ 임의 각도가 저장됐다').toBe(0);
  });

  it('모든 표면 종류가 계약을 통과한다', () => {
    const o = normalizeOverlay({
      version: 2,
      surfaces: SURFACE_KINDS.map((kind: SurfaceKind) => ({ kind, map: SAFE_TEX, repeat: 4 })),
    });
    expect(o.surfaces).toHaveLength(SURFACE_KINDS.length);
  });
});

// ── 맵 슬롯 목록이 계약과 어긋나지 않는가 ──────────────────────────────────

describe('맵 슬롯', () => {
  it('★ MAP_SLOTS 가 계약의 텍스처 필드 전부다 — 손목록이 낡는 것을 막는다', () => {
    // 목록을 손으로 적을 수밖에 없는 자리다(맵은 전부 선택 필드라 기본값 객체에 안 나온다).
    // 그래서 **정규화 결과에서 유도한 집합**과 대조한다 — 런타임 유도라 낡지 않는다.
    //
    // 이 축이 없으면 슬롯을 늘렸을 때 집행(`features/surface-paint.ts`)과 화면
    // (`edit/panel/surface.ts`)이 새 슬롯을 못 보고, 증상은 «그 슬롯만 안 먹는다» 다.
    const all = Object.fromEntries(MAP_SLOTS.map((s) => [s, SAFE_TEX]));
    const norm = normalizeSetting('garden', all) as unknown as Record<string, unknown>;
    const actual = Object.keys(norm).filter((k) => norm[k] === SAFE_TEX).sort();
    expect(actual).toEqual([...MAP_SLOTS].sort());
  });

  it('슬롯마다 한국어 이름이 있고 서로 다르다', () => {
    for (const s of MAP_SLOTS) expect(SLOT_LABEL[s], `★ 「${s}」 이름 없음`).toBeTruthy();
    expect(new Set(Object.values(SLOT_LABEL)).size).toBe(MAP_SLOTS.length);
  });

  it('hasNoMaps 가 슬롯을 하나도 안 빠뜨린다', () => {
    // 슬롯마다 그것 **하나만** 채워 본다 — `hasNoMaps` 가 어느 하나를 안 보면 여기서 걸린다.
    for (const s of MAP_SLOTS) {
      const one = normalizeSetting('garden', { [s]: SAFE_TEX });
      expect(hasNoMaps(one), `★ ${s} 만 붙었는데 «맵 없음» 이라고 한다`).toBe(false);
    }
    expect(hasNoMaps(defaultSetting('garden'))).toBe(true);
  });
});

// ── 화면이 쓰는 목록 조작 ──────────────────────────────────────────────────

describe('목록 다루기', () => {
  it('목록에 없는 표면은 기본값으로 읽힌다 — 화면이 «안 만진 것» 도 보여줘야 한다', () => {
    expect(settingOf([], 'garden')).toEqual(defaultSetting('garden'));
  });

  it('★ upsert 는 언제나 새 배열이다 — 참조 동등성이 집행의 판정 축이다', () => {
    const before: readonly SurfaceSetting[] = [];
    const after = upsertSetting(before, 'garden', { map: SAFE_TEX });
    expect(after).not.toBe(before);
    // 제자리 수정이 아니라는 것을 원본으로도 확인한다
    expect(before).toHaveLength(0);
  });

  it('같은 표면을 두 번 고쳐도 항목이 하나다', () => {
    let list = upsertSetting([], 'garden', { map: SAFE_TEX });
    list = upsertSetting(list, 'garden', { repeat: 8 });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: 'garden', map: SAFE_TEX, repeat: 8 });
  });

  it('★ 기본값으로 되돌리면 목록에서 빠진다 — 파일과 화면이 다른 말을 하지 않게', () => {
    let list = upsertSetting([], 'garden', { map: SAFE_TEX, repeat: 8 });
    expect(list).toHaveLength(1);
    list = upsertSetting(list, 'garden', { map: undefined, repeat: 1 });
    expect(list, '★ 빈 항목이 남았다 — 다시 읽으면 «설정이 있다» 로 보인다').toHaveLength(0);
  });

  it('다른 표면은 안 건드린다', () => {
    let list = upsertSetting([], 'garden', { map: SAFE_TEX });
    list = upsertSetting(list, 'road', { map: SAFE_TEX });
    list = upsertSetting(list, 'garden', { map: undefined });
    expect(list.map((s) => s.kind)).toEqual(['road']);
  });

  it('isDefaultSetting 이 네 수치를 다 본다', () => {
    // 하나씩만 바꿔 본다 — 어느 하나를 안 보면 여기서 걸린다.
    expect(isDefaultSetting(defaultSetting('garden'))).toBe(true);
    for (const patch of [{ repeat: 2 }, { turns: 1 as const }, { metalness: 1 }, { roughness: 0 }]) {
      const s = { ...defaultSetting('garden'), ...patch };
      expect(isDefaultSetting(s), `★ ${JSON.stringify(patch)} 를 안 본다`).toBe(false);
    }
  });
});

describe('드롭한 파일 이름 → 계약의 src', () => {
  it('평범한 이름은 assets/textures/ 아래로 간다', () => {
    expect(textureSrcFor('grass.png')).toBe('assets/textures/grass.png');
    expect(textureSrcFor('wall_01.jpg')).toBe('assets/textures/wall_01.jpg');
  });

  it('★ 위험한 이름은 null — 몰래 고쳐 주지 않는다', () => {
    // 고쳐 주면 감독이 커밋할 파일명과 어긋난다. 그래서 거절하고 **왜인지 화면이 말한다**.
    for (const bad of ['../secret.png', 'a//b.png', 'x.exe', 'x.PNG', '한글.png', 'a/./b.png']) {
      expect(textureSrcFor(bad), `★ 「${bad}」 가 통과했다`).toBeNull();
    }
  });
});
