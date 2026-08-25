// @vitest-environment jsdom
//
// 액자 크기 배율 — **작품을 크게 걸었을 때 배치가 따라오는가.**
//
// 감독 지적 2026-08-24: *"작품을 크게 걸고."* 천장을 4.2m 로 올린 직후에 나온 말이다.
//
// ⚠ 이 축의 위험은 **크기와 배치가 따로 노는 것**이다. 액자를 렌더에서만 키우면
// 배치 계산은 작은 폭으로 자리를 잡고, 화면에서는 액자끼리 겹친다. 그래서 여기서 보는
// 것은 「커졌는가」가 아니라 **「같은 값을 배치와 렌더가 함께 쓰는가」** 다.
//
// 그리고 하위호환이 같은 무게로 걸려 있다 — `builder.html` 은 라이브이고 거기 저장분은
// **배치를 다시 계산하지 않는다.** 그 문서에 `artScale` 이 없을 때 1 로 읽히지 않으면
// 이미 만들어 둔 공간의 액자가 전부 커져 벽에서 겹친다.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { artworkSize, partArtSize, normalizeSpace, ART_SCALE, FRAME_RULES, PART_TYPES, DEFAULT_SPACE } from '../frontend/js/space.js';
import { generateSpace, GEN_ART_SCALE, GEN_SCALE_RHYTHM, GEN_FEATURED_SCALE, artScaleOf } from '../frontend/js/space-generate.js';
import { buildSpaceGroup } from '../frontend/js/space-render.js';
import { artworkCanvasDims } from '../frontend/js/space-parts.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// jsdom 에는 네이티브 캔버스가 없다(`tests/space-window.test.ts` 와 같은 처방).
const gradientStub = { addColorStop() {} };
const imageData = (w: number, h: number) => ({
  data: new Uint8ClampedArray(Math.max(4, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0,
});
const ctx2d = new Proxy({} as Record<string, unknown>, {
  get(t, k) {
    if (k in t) return t[k as string];
    const name = String(k);
    if (name === 'createImageData') return imageData;
    if (name.startsWith('create')) return () => gradientStub;
    if (name === 'getImageData') return (_x: number, _y: number, w: number, h: number) => imageData(w, h);
    if (name === 'measureText') return () => ({ width: 0 });
    return () => undefined;
  },
  set(t, k, v) { t[k as string] = v; return true; },
});
(HTMLCanvasElement.prototype as unknown as { getContext: (t: string) => unknown }).getContext =
  (type: string) => (type === '2d' ? ctx2d : null);

const arts = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `a${i}`, title: `작품 ${i}`, imageUrl: '', ar: [0.75, 1, 1.5][i % 3] }));

describe('artworkSize — 배율', () => {
  it('배율을 안 주면 예전과 똑같다(하위호환)', () => {
    for (const ar of [0.5, 0.75, 1, 1.5, 2.4]) {
      expect(artworkSize(ar)).toEqual(artworkSize(ar, ART_SCALE.def));
    }
    expect(artworkSize(undefined)).toEqual({ W: PART_TYPES.artwork.size[0], H: PART_TYPES.artwork.size[1] });
  });

  it('배율이 커지면 액자도 커진다(clamp 에 닿기 전까지)', () => {
    const a = artworkSize(1.5, 1.0), b = artworkSize(1.5, 1.4), c = artworkSize(1.5, 1.8);
    expect(b.W).toBeGreaterThan(a.W);
    expect(c.W).toBeGreaterThan(b.W);
    expect(b.H).toBeGreaterThan(a.H);
  });

  it('종횡비는 배율에 안 흔들린다', () => {
    for (const ar of [0.6, 1, 1.8]) {
      const s1 = artworkSize(ar, 1.0), s2 = artworkSize(ar, 1.6);
      expect(s2.W / s2.H).toBeCloseTo(s1.W / s1.H, 6);
    }
  });

  it('범위 밖 배율은 잘라 쓴다', () => {
    expect(artworkSize(1, 99)).toEqual(artworkSize(1, ART_SCALE.max));
    expect(artworkSize(1, 0.01)).toEqual(artworkSize(1, ART_SCALE.min));
  });

  it('배율이 이상한 값이면 기본값으로 버틴다', () => {
    const base = artworkSize(1.5);
    for (const bad of [NaN, 0, -1, Infinity, null, '1.4', {}]) {
      expect(artworkSize(1.5, bad as number)).toEqual(base);
    }
  });

  it('상한은 임의값이 아니다 — 가로장 clamp 와 맞물려 있다', () => {
    // 이 등식이 깨지면 상한 위쪽이 clamp 에 먹혀 노브가 헛돈다.
    expect(1.6 * ART_SCALE.max).toBeCloseTo(FRAME_RULES.landscape.clampW, 6);
  });

  it('⚠ 세로장은 그보다 **먼저** 잘린다 — 상한 근거가 가로장만 본 것이었다', () => {
    // 실측으로 알았다: 세로장은 `1.6 × k = clampH(2.6)`, 즉 **k ≈ 1.625** 에서 이미
    // 걸린다. 상한 2.0 은 가로장 기준이라 그 사이 구간에서는 세로장만 눌린다.
    // 고장이 아니라 상한이 방향마다 다른 것이고, 그 사실을 검사로 남긴다 —
    // 안 남기면 다음 사람이 「배율을 올렸는데 세로 작품만 안 커진다」를 버그로 조사한다.
    const kCut = FRAME_RULES.portrait.clampH / 1.6;
    expect(kCut).toBeLessThan(ART_SCALE.max);
    const below = artworkSize(0.75, kCut - 0.1), at = artworkSize(0.75, kCut + 0.3);
    expect(at.H).toBeCloseTo(FRAME_RULES.portrait.clampH, 6);   // 잘렸다
    expect(below.H).toBeLessThan(FRAME_RULES.portrait.clampH);  // 아직 안 잘렸다
    // 잘려도 종횡비는 지킨다(폭이 함께 줄어든다).
    expect(at.W / at.H).toBeCloseTo(0.75, 6);
  });

  it('폴백 액자(빈 액자)도 clamp 를 탄다', () => {
    // ⚠ 예전에는 폴백이 clamp 를 **건너뛰고** 즉시 반환해 배율만큼 무한정 커졌다.
    // 배율 2.9 에서 높이 3.2m 가 나와 중심 1.6m 기준으로 바닥을 뚫었다(검사가 잡았다).
    for (const k of [1.0, 1.5, 2.0]) {
      const s = artworkSize(undefined, k);
      expect(s.H).toBeLessThanOrEqual(FRAME_RULES.portrait.clampH + 1e-9);
      expect(s.W).toBeLessThanOrEqual(FRAME_RULES.landscape.clampW + 1e-9);
      expect(s.W / s.H).toBeCloseTo(PART_TYPES.artwork.size[0] / PART_TYPES.artwork.size[1], 6);
    }
    // 배율 1 에서는 예전 값 그대로다(하위호환).
    expect(artworkSize(undefined, 1)).toEqual({ W: PART_TYPES.artwork.size[0], H: PART_TYPES.artwork.size[1] });
  });
});

describe('normalizeSpace — artScale 하위호환', () => {
  it('필드가 없는 저장분은 1 로 읽힌다(라이브 빌더 저장분 회귀 0)', () => {
    const doc = JSON.parse(JSON.stringify(DEFAULT_SPACE));
    delete doc.shell.artScale;
    expect(normalizeSpace(doc).shell.artScale).toBe(ART_SCALE.def);
  });

  it('범위 밖·쓰레기 값은 잘리거나 기본이 된다', () => {
    const withScale = (v: unknown) => {
      const doc = JSON.parse(JSON.stringify(DEFAULT_SPACE));
      doc.shell.artScale = v;
      return normalizeSpace(doc).shell.artScale;
    };
    expect(withScale(99)).toBe(ART_SCALE.max);
    expect(withScale(0.01)).toBe(ART_SCALE.min);
    expect(withScale('크게')).toBe(ART_SCALE.def);
    expect(withScale(1.4)).toBeCloseTo(1.4, 6);
  });
});

describe('generateSpace — 배치와 렌더가 같은 배율을 쓴다', () => {
  it('요청한 배율이 셸에 실린다', () => {
    for (const k of [1.0, 1.4, 1.8]) {
      expect(generateSpace(arts(8), { artScale: k }).space.shell.artScale).toBeCloseTo(k, 6);
    }
  });

  it('안 주면 자동생성 기본값을 쓴다', () => {
    expect(generateSpace(arts(8)).space.shell.artScale).toBe(GEN_ART_SCALE);
  });

  it('배율을 올려도 같은 벽에서 액자가 겹치지 않는다', () => {
    // ⚠ 이것이 이 파일의 핵이다. 배치 계산이 배율을 안 보면 여기서 겹친다.
    for (const k of [1.0, 1.4, 2.0]) {
      const r = generateSpace(arts(18), { artScale: k });
      const rows = new Map<string, { u: number; w: number }[]>();
      for (const p of r.space.parts) {
        if (p.t !== 'artwork') continue;
        const vert = Math.abs(Math.sin(p.ry)) > 0.5;
        const key = `${p.ry.toFixed(3)}|${(vert ? p.x : p.z).toFixed(3)}`;
        const w = partArtSize(p, r.space.shell).W;
        (rows.get(key) ?? rows.set(key, []).get(key)!).push({ u: vert ? p.z : p.x, w });
      }
      for (const row of rows.values()) {
        row.sort((a, b) => a.u - b.u);
        for (let i = 1; i < row.length; i++) {
          const gap = (row[i].u - row[i].w / 2) - (row[i - 1].u + row[i - 1].w / 2);
          expect(gap).toBeGreaterThanOrEqual(FRAME_RULES.minGap - 1e-6);
        }
      }
    }
  });

  it('배율을 올려도 작품을 흘리지 않는다(방이 대신 커진다)', () => {
    for (const k of [1.0, 1.4, 2.0]) {
      const r = generateSpace(arts(14), { artScale: k });
      expect(r.dropped).toHaveLength(0);
      expect(r.space.parts.filter((p) => p.t === 'artwork')).toHaveLength(14);
    }
  });

  it('액자가 벽 안에 머문다(천장·바닥을 뚫지 않는다)', () => {
    const r = generateSpace(arts(12), { artScale: ART_SCALE.max });
    const H = 4.2; // grand
    for (const p of r.space.parts) {
      if (p.t !== 'artwork') continue;
      const { H: h } = partArtSize(p, r.space.shell);
      const cy = p.y ?? 1.6;
      expect(cy - h / 2).toBeGreaterThan(0);
      expect(cy + h / 2).toBeLessThan(H);
    }
  });
});

// ── 판정 → 집행 경계 ────────────────────────────────────────────────────────
// 배율이 스키마에만 실리고 조립이 그것을 안 읽으면, 위 검사는 전부 통과하면서 화면은
// 그대로다. 그래서 실제 three 로 조립해 **액자 메시가 실제로 커졌는지** 잰다.
describe('space-assembler — 조립이 배율을 읽는다', () => {
  /**
   * 조립 결과에서 **액자 캔버스 판**을 찾는다. 두께로 거르지 않는다 — 그 값을 여기
   * 적으면 값 미러링이고, 실제로 첫 판본이 `0.01` 로 걸러 6장 중 1장도 못 잡았다
   * (실측 두께는 `0.015` 였고 `0.01` 은 전혀 다른 인스턴스 메시였다).
   * 대신 **기대 치수를 SSOT 에서 계산해** 그 폭의 판이 실재하는지 본다.
   *
   * ⚠ 조립은 `src` 유무로 경로가 갈린다 — 빈 액자는 스타일별 **공유 지오**를 쓰고
   * 종횡비 대신 폴백 치수를 받는다(draw-call 예산). 그래서 기대치도 같은 분기를 탄다.
   * 이걸 모르고 짠 첫 판본이 실패했고, 그 실패가 **빈 액자만 배율을 무시하던 결함**을
   * 드러냈다(`PART_TYPES.artwork.size` 를 직접 읽고 있었다).
   */
  const check = (scale: number, withImage: boolean) => {
    const list = arts(6).map((a) => (withImage ? { ...a, imageUrl: `data:,${a.id}` } : a));
    const space = generateSpace(list, { artScale: scale }).space;
    const want = space.parts.filter((p) => p.t === 'artwork').map((p) => {
      const { W, H } = partArtSize(p, space.shell);
      return artworkCanvasDims(p.frame || 'minimal', W, H).cw;
    });
    const g = buildSpaceGroup(space);
    (g as unknown as { updateMatrixWorld(f: boolean): void }).updateMatrixWorld(true);
    const widths: number[] = [];
    (g as unknown as { traverse(fn: (o: unknown) => void): void }).traverse((o) => {
      const m = o as { isMesh?: boolean; isInstancedMesh?: boolean; geometry?: { parameters?: { width?: number } } };
      if (!m.isMesh || m.isInstancedMesh) return;
      const w = m.geometry && m.geometry.parameters && m.geometry.parameters.width;
      if (typeof w === 'number') widths.push(w);
    });
    return { want, found: want.filter((cw) => widths.some((w) => Math.abs(w - cw) < 1e-6)) };
  };

  for (const withImage of [true, false]) {
    const label = withImage ? '이미지 작품(실제 갤러리 경로)' : '빈 액자(공유 지오 경로)';
    it(`조립된 액자 판이 스키마가 정한 치수와 일치한다 — ${label}`, () => {
      for (const scale of [1.0, 1.4, 1.8]) {
        const { want, found } = check(scale, withImage);
        expect(want).toHaveLength(6);                 // 빈 결과를 통과로 읽지 않는다
        expect(found).toHaveLength(want.length);      // 배율이 조립에 안 닿으면 여기서 어긋난다
      }
    });

    it(`배율을 올리면 조립된 판이 실제로 커진다 — ${label}`, () => {
      // ⚠ 배수로 단언하지 않는다. 방 기준에 **작품별 배율이 곱해지므로** 큰 쪽은 clamp
      //   (`FRAME_RULES.portrait.clampH` = 2.6m)에 먼저 닿아 차이가 눌린다 — 그건 정상
      //   동작이고, 배수를 박으면 상한이 있다는 사실 때문에 검사가 깨진다.
      const big = check(1.8, withImage), small = check(1.0, withImage);
      expect(big.found).toHaveLength(6);
      expect(small.found).toHaveLength(6);
      expect(Math.max(...big.want)).toBeGreaterThan(Math.max(...small.want));
      // 대신 clamp 에 안 닿는 구간에서 **비례**를 본다(가로장 하나, 배율 1.0 vs 1.3).
      const a = artworkSize(1.5, 1.0), b = artworkSize(1.5, 1.3);
      expect(b.W / a.W).toBeCloseTo(1.3, 6);
    });
  }

  it('실제 three 로 조립했다(스텁이 아니다)', () => {
    expect(new THREE.Vector3().isVector3).toBe(true);
  });
});

describe('visit.html 배선 — 배율 노브', () => {
  const html = readFileSync(resolve(process.cwd(), 'frontend/visit.html'), 'utf8');

  it('`?art=` 를 읽어 generateSpace 에 넘긴다', () => {
    expect(html).toMatch(/parseFloat\(q\.get\('art'\)\)/);
    expect(html).toMatch(/\{[^}]*artScale[,}]/);
  });

  it('범위를 여기서 다시 자르지 않는다(값 미러링 금지)', () => {
    expect(html).not.toMatch(/artScale[^\n]*Math\.(min|max)/);
  });
});


// ── 감독 판정을 검사로 ───────────────────────────────────────────────────────
// 2026-08-24: *"큰것도 있고 작은 것도 있고 복합적으로 배치. 일괄은 없어."*
// 앞 판본은 방 하나에 배율 하나였고 그것이 반려됐다. 「일괄이 아니다」는 형용사가 아니라
// **세어서 판정할 수 있는 것**이므로 검사로 만든다 — 안 만들면 다음 사람이 리듬을
// 지우고 상수 하나로 되돌려도 아무 일도 안 일어난다.
describe('크기 리듬 — 일괄이 아니다', () => {
  it('한 전시장 안에 **여러 크기**의 액자가 있다', () => {
    const r = generateSpace(arts(12));
    const sizes = new Set(r.space.parts.filter((p) => p.t === 'artwork')
      .map((p) => partArtSize(p, r.space.shell).W.toFixed(4)));
    expect(sizes.size).toBeGreaterThanOrEqual(3);   // 「일괄」이면 1 이다
  });

  it('가장 큰 액자와 가장 작은 액자의 차이가 눈에 띈다', () => {
    const r = generateSpace(arts(12));
    const ws = r.space.parts.filter((p) => p.t === 'artwork').map((p) => partArtSize(p, r.space.shell).W);
    expect(Math.max(...ws) / Math.min(...ws)).toBeGreaterThan(1.4);
  });

  it('같은 갤러리는 항상 같은 전시장이다(무작위가 아니다)', () => {
    const a = generateSpace(arts(10)).space, b = generateSpace(arts(10)).space;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('대표작(featured)이 가장 크다', () => {
    const list = arts(9).map((x, i) => (i === 4 ? { ...x, featured: true } : x));
    expect(artScaleOf(list[4], 4)).toBe(GEN_FEATURED_SCALE);
    for (const k of GEN_SCALE_RHYTHM) expect(GEN_FEATURED_SCALE).toBeGreaterThan(k);
  });

  it('리듬은 큰 것과 작은 것이 번갈아 온다(같은 크기가 연달지 않는다)', () => {
    for (let i = 1; i < GEN_SCALE_RHYTHM.length; i++) {
      expect(GEN_SCALE_RHYTHM[i]).not.toBe(GEN_SCALE_RHYTHM[i - 1]);
      // 한쪽이 1 보다 크면 다음은 1 보다 작다(그 반대도) — 리듬이 한 방향으로 흐르지 않는다.
      expect((GEN_SCALE_RHYTHM[i] - 1) * (GEN_SCALE_RHYTHM[i - 1] - 1)).toBeLessThan(0);
    }
  });

  it('리듬 평균이 1 보다 크다(«작품을 크게 걸고» 가 함께 유지된다)', () => {
    const avg = GEN_SCALE_RHYTHM.reduce((s, v) => s + v, 0) / GEN_SCALE_RHYTHM.length;
    expect(avg).toBeGreaterThan(1);
    expect(GEN_ART_SCALE).toBe(1);   // 방 기준은 중립 — 벌리는 것은 리듬이다
  });

  it('인덱스가 배열을 넘어가도 순환한다', () => {
    const a = arts(1)[0];
    for (const i of [0, 8, 16]) expect(artScaleOf(a, i)).toBe(GEN_SCALE_RHYTHM[0]);
    expect(artScaleOf(a, -1)).toBe(GEN_SCALE_RHYTHM[GEN_SCALE_RHYTHM.length - 1]);
  });
});
