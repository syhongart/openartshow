// @vitest-environment node
//
// **벽에 거는 작품** — 판정 (W8-4).
//
// 감독 요구(2026-08-16): *"glb 건물 벽에 작품을 걸고 안에 조명을 비출수있을까"*
//
// ── 지키는 명제 다섯 ───────────────────────────────────────────────────────
// ① **경로는 작품 전용 계약이다** — `assets/art/`. 표면 텍스처와 공유하지 않는다
// ② **좌표는 기본값으로 메우지 않는다** — 어디 걸렸는지 모르는 액자는 원점에 쌓인다
// ③ **크기는 유도한다** — 저장하는 것은 「가로 + 종횡비」이고 세로는 계산이다
// ④ ★ **수직면만 벽이다** — 지붕 경사면이 벽으로 잡히면 액자가 하늘을 본다
// ⑤ **손실은 말한다** — 내보내기 관문이 *"issues 가 비면 무손실"* 을 약속한다

import { describe, it, expect } from 'vitest';
import {
  isSafeArtSrc, artSrcFor, normalizeArt, normalizeArts, frameSize, wallPose,
  ART_W_MIN, ART_W_MAX, ART_W_DEF, ART_AR_DEF, WALL_GAP, WALL_MAX_TILT,
} from '../frontend/js/world2/decide/artwork.js';
import { isSafeTextureSrc } from '../frontend/js/world2/decide/surface-material.js';
import { validateOverlay, normalizeOverlay, emptyOverlay } from '../frontend/js/world2/decide/overlay.js';

const OK = 'assets/art/hello.png';

describe('★ 작품 경로는 전용 계약이다', () => {
  it('받는 것: `assets/art/` + 이미지 확장자', () => {
    for (const s of ['assets/art/a.png', 'assets/art/b.jpg', 'assets/art/c/d.webp']) {
      expect(isSafeArtSrc(s), s).toBe(true);
    }
  });

  it('★ 커밋할 수 없는 것은 전부 거부한다', () => {
    for (const s of [
      'blob:abc', 'http://x/a.png', 'data:image/png;base64,x', '//host/a.png',
      '/assets/art/a.png', 'assets/art/../../secret.png', 'assets/art/a.PNG',
      'assets/art/a.glb', 'assets/models/a.png', 'assets/art/', 42, null, undefined,
    ]) {
      expect(isSafeArtSrc(s), String(s)).toBe(false);
    }
  });

  it('★ 표면 텍스처 계약과 **서로 통하지 않는다** — 한쪽을 넓혀도 다른 쪽이 안 새게', () => {
    expect(isSafeArtSrc('assets/textures/wall.png'), '★ 작품이 텍스처 경로를 받는다').toBe(false);
    expect(isSafeTextureSrc(OK), '★ 텍스처가 작품 경로를 받는다').toBe(false);
  });

  it('경로 조립기는 통과 못 하면 `null` — 호출부가 사유를 말한다', () => {
    expect(artSrcFor('a.png')).toBe(OK.replace('hello', 'a'));
    expect(artSrcFor('../x.png')).toBeNull();
    expect(artSrcFor('a.exe')).toBeNull();
  });
});

describe('★ 정규화 — 손실을 말한다', () => {
  const at = { src: OK, x: 1, y: 2, z: 3 };

  it('최소 형태가 통과하고 기본값이 채워진다', () => {
    const { item, issues } = normalizeArt(at, 0);
    expect(issues, '★ 생략은 손실이 아니다 — 「생략 = 기존 동작」').toEqual([]);
    expect(item).toEqual({ src: OK, x: 1, y: 2, z: 3, ry: 0, w: ART_W_DEF, ar: ART_AR_DEF });
  });

  it('★ 좌표가 하나라도 수가 아니면 **항목째 버린다** — 원점에 쌓이지 않게', () => {
    for (const bad of [{ ...at, x: 'a' }, { ...at, y: NaN }, { ...at, z: undefined }]) {
      const r = normalizeArt(bad, 0);
      expect(r.item, `★ ${JSON.stringify(bad)} 가 살아남았다`).toBeNull();
      expect(r.issues.map((i) => i.reason)).toEqual(['art-bad-number']);
    }
  });

  it('경로가 안 되면 항목째 버리고 **그 사유**를 낸다', () => {
    const r = normalizeArt({ ...at, src: 'blob:x' }, 3);
    expect(r.item).toBeNull();
    expect(r.issues).toEqual([{ index: 3, reason: 'art-unsafe-src' }]);
  });

  it('객체가 아니면 그 사유다 — 뭉개지 않는다', () => {
    expect(normalizeArt(42, 1).issues).toEqual([{ index: 1, reason: 'art-not-object' }]);
    expect(normalizeArt(null, 0).issues[0].reason).toBe('art-not-object');
  });

  it('★ 범위를 넘으면 자르고 **말한다** — 조용히 고치면 화면과 파일이 달라진다', () => {
    const big = normalizeArt({ ...at, w: 999 }, 0);
    expect(big.item!.w).toBe(ART_W_MAX);
    expect(big.issues.map((i) => i.reason)).toContain('art-clamped');
    const small = normalizeArt({ ...at, w: 0 }, 0);
    expect(small.item!.w).toBe(ART_W_MIN);
    expect(small.issues.map((i) => i.reason)).toContain('art-clamped');
  });

  it('회전은 한 바퀴 접는다 — 계약의 `ry` 와 같은 규약', () => {
    const r = normalizeArt({ ...at, ry: Math.PI * 3 }, 0);
    expect(r.item!.ry).toBeCloseTo(Math.PI, 6);
    expect(normalizeArt({ ...at, ry: -0 }, 0).item!.ry, '음의 0 이 남았다').toBe(0);
  });

  it('배열 통째로 — 깨진 것만 빠지고 나머지가 산다', () => {
    const { items, issues } = normalizeArts([at, 42, { ...at, src: 'x' }, { ...at, x: 9 }]);
    expect(items).toHaveLength(2);
    expect(items[1].x).toBe(9);
    expect(issues.map((i) => i.index)).toEqual([1, 2]);
  });

  it('배열이 아니면 빈 목록 — 던지지 않는다', () => {
    for (const v of [undefined, null, 'nope', {}]) {
      expect(normalizeArts(v).items).toEqual([]);
    }
  });
});

describe('★ 크기는 유도한다 — 두 곳에 저장하지 않는다', () => {
  it('가로 그대로, 세로는 종횡비에서', () => {
    expect(frameSize({ w: 3, ar: 1.5 })).toEqual({ w: 3, h: 2 });
  });

  it('★ 세로 사진도 가로를 맞춘다 — 「긴 변을 맞춘다」로 하면 예측이 안 된다', () => {
    const portrait = frameSize({ w: 2, ar: 0.5 });
    expect(portrait).toEqual({ w: 2, h: 4 });
  });
});

describe('★ 벽 판정 — 수직면만 받는다', () => {
  const pt = { x: 10, y: 3, z: -5 };

  it('★ +X 를 보는 벽: 법선 방향으로 띄우고 그쪽을 향한다', () => {
    const p = wallPose({ point: pt, normal: { x: 1, y: 0, z: 0 } })!;
    expect(p.x).toBeCloseTo(10 + WALL_GAP, 6);
    expect(p.y, '★ 높이를 옮겼다 — 벽에 건 높이가 곧 작품 높이다').toBe(3);
    expect(p.z).toBeCloseTo(-5, 6);
    expect(p.ry).toBeCloseTo(Math.PI / 2, 6);
  });

  it('★ 벽에서 **실제로** 띄운다 — 0 이면 z-fighting 으로 깜빡인다', () => {
    // ⚠ 바로 위 단언은 기대값에 `WALL_GAP` 을 그대로 쓴다. 그래서 **상수를 0 으로 바꿔도
    // 초록이었다**(뮤테이션 A6, 0 failed) — 계산 결과를 기대값으로 되읽는 검사는 그 값이
    // 옳은지 묻지 않는다. 같은 형태를 이 회차에서 이미 한 번 겪었다(`?u=nobody` 폴백).
    //
    // 그래서 축을 **약속**으로 바꾼다: 「띄운다」와 「눈에 띄게 떠 보이지 않는다」.
    // 하한 5mm 는 깊이 버퍼 정밀도에서 의미가 생기는 지점이고, 상한 5cm 는 육안으로
    // «벽에 붙어 있다» 로 읽히는 경계다(그 이상이면 액자가 공중에 뜬다).
    expect(WALL_GAP, '★ 벽에 파묻힌다 — z-fighting').toBeGreaterThan(0.005);
    expect(WALL_GAP, '★ 액자가 벽에서 떠 보인다').toBeLessThan(0.05);
    const p = wallPose({ point: pt, normal: { x: 1, y: 0, z: 0 } })!;
    expect(p.x, '★ 벽면에 그대로 붙었다').toBeGreaterThan(10);
  });

  it('+Z 를 보는 벽은 yaw 0 — three 의 기본 평면 방향이다', () => {
    const p = wallPose({ point: pt, normal: { x: 0, y: 0, z: 1 } })!;
    expect(p.ry).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(-5 + WALL_GAP, 6);
  });

  it('정규화되지 않은 법선도 받는다 — GLB 가 항상 단위벡터를 주지 않는다', () => {
    const p = wallPose({ point: pt, normal: { x: 5, y: 0, z: 0 } })!;
    expect(p.x).toBeCloseTo(10 + WALL_GAP, 6);
  });

  it('★ 바닥·천장은 벽이 아니다 — 받으면 액자가 하늘을 본다', () => {
    expect(wallPose({ point: pt, normal: { x: 0, y: 1, z: 0 } })).toBeNull();
    expect(wallPose({ point: pt, normal: { x: 0, y: -1, z: 0 } })).toBeNull();
  });

  it('★ 지붕 경사면도 거른다 — 임계값 바로 양쪽을 잰다', () => {
    const tilt = (uy: number) => {
      const h = Math.sqrt(Math.max(0, 1 - uy * uy));
      return wallPose({ point: pt, normal: { x: h, y: uy, z: 0 } });
    };
    expect(tilt(WALL_MAX_TILT + 0.02), '★ 경사면이 벽으로 잡혔다').toBeNull();
    expect(tilt(WALL_MAX_TILT - 0.02), '★ 살짝 기운 벽을 거부했다').not.toBeNull();
  });

  it('법선이 0 이거나 수가 아니면 `null` — 던지지 않는다', () => {
    expect(wallPose({ point: pt, normal: { x: 0, y: 0, z: 0 } })).toBeNull();
    expect(wallPose({ point: pt, normal: { x: NaN, y: 0, z: 1 } })).toBeNull();
  });
});

describe('★ 계약에 실제로 꽂혔다 — 계산된 값이 소비되는가', () => {
  it('빈 오버레이가 `arts` 를 갖는다 — `KNOWN_ROOT_KEYS` 가 여기서 유도된다', () => {
    expect(emptyOverlay().arts).toEqual([]);
  });

  it('★ 정규화가 작품을 살린다 — 안 부르면 계약이 통째로 버린다', () => {
    const o = normalizeOverlay({ version: 2, items: [], arts: [{ src: OK, x: 1, y: 2, z: 3 }] });
    expect(o.arts, '★ 작품이 사라졌다').toHaveLength(1);
    expect(o.arts[0].w).toBe(ART_W_DEF);
  });

  it('★ 관문이 작품 사유를 **그대로 옮긴다** — 두 함수가 다른 말을 하면 안 된다', () => {
    const rev = validateOverlay({
      version: 2, items: [], arts: [{ src: 'blob:x', x: 0, y: 0, z: 0 }],
    });
    expect(rev.issues.map((i) => i.reason)).toContain('art-unsafe-src');
    expect(rev.issues.find((i) => i.reason === 'art-unsafe-src')?.art,
      '★ 몇 번째 작품인지 안 말한다').toBe(0);
    expect(rev.overlay.arts, '★ 깨진 작품이 살아남았다').toEqual([]);
  });

  it('★ `arts` 가 배열이 아니면 통째로 사라진다고 말한다', () => {
    const rev = validateOverlay({ version: 2, items: [], arts: 'nope' });
    expect(rev.issues.map((i) => i.reason)).toContain('arts-not-array');
  });

  it('★ 작품이 없는 문서는 **무손실**이다 — 지금 라이브가 그 상태다', () => {
    const rev = validateOverlay({ version: 2, items: [], parcels: [], surfaces: [] });
    expect(rev.issues, '★ 기존 문서에 없던 경고가 생겼다').toEqual([]);
  });

  it('★ `arts` 가 `unknown-field` 로 잡히지 않는다 — 계약이 자기 필드를 모르면 안 된다', () => {
    const rev = validateOverlay({ version: 2, items: [], arts: [] });
    expect(rev.issues.map((i) => i.reason)).not.toContain('unknown-field');
  });
});
