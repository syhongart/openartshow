// space-generate.test.ts — 공간 자동생성기 불변식.
// -----------------------------------------------------------------------------
// 이 파일이 지키는 것은 "돌아간다"가 아니라 **조용히 틀리지 않는다** 이다. 자동배치는
// 실패해도 화면이 그럴듯하게 나오는 종류의 코드라(작품 몇 점이 겹치거나 벽을 뚫어도
// 렌더는 된다) 눈으로 통과시키기 쉽다. 그래서 기하 불변식을 산술로 못 박는다.
//
// ⚠ 검출력은 뮤테이션으로 확인했다(2026-08-22) — 아래 각 단언은 대응하는 결함을
// 일부러 되살렸을 때 실제로 빨간불이 된다. 회차는 커밋 메시지에 있다.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  generateSpace, GEN_LAYOUTS, GEN_DEFAULT_LAYOUT, genSummary, pickGalleryId,
  type GenArtwork,
} from '../frontend/js/space-generate.js';
import { FOOTPRINT, FRAME_RULES, PART_TYPES, STORY_H, artworkSize, normalizeSpace } from '../frontend/js/space.js';

// ⚠ 겹침 검사는 액자 실치수를 **다시 계산해서** 비교한다. 그러니 `shell.artScale` 을
// 반드시 함께 넘긴다 — 안 넘기면 실제보다 작은 폭으로 재게 되고 검사가 조용히 느슨해진다
// (실측: 배율을 1.0→1.4 로 올려도 40건이 전부 통과했다. 통과가 아니라 안 본 것이다).

const HERE = dirname(fileURLToPath(import.meta.url));
const gallery = JSON.parse(readFileSync(join(HERE, '../frontend/galleries/syhongart.json'), 'utf-8'));

/** 실물 갤러리 14점 — 종횡비가 없는 데이터라 폴백 경로도 함께 탄다. */
const REAL: GenArtwork[] = gallery.artworks.map((a: any) => ({
  id: a.id, title: a.title, imageUrl: a.imageUrl, featured: a.featured,
}));

/** 종횡비가 다양한 합성 입력 — 폭이 작품마다 달라지는 경로를 강제한다. */
const mixed = (n: number): GenArtwork[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `m-${i}`,
    imageUrl: `./a${i}.jpg`,
    ar: [0.6, 1.0, 1.5, 2.4, 0.75][i % 5], // 세로장·정사각·가로장·초가로장 섞기
  }));

const arts = (s: any) => s.parts.filter((p: any) => p.t === 'artwork' || p.t === 'screen');

describe('generateSpace — 작품 보존', () => {
  it('입력 작품은 배치되거나 dropped 에 실명으로 남는다 (조용히 사라지지 않는다)', () => {
    for (const layout of GEN_LAYOUTS) {
      for (const input of [REAL, mixed(3), mixed(40), mixed(120)]) {
        const r = generateSpace(input, { layout });
        expect(r.placed + r.dropped.length).toBe(input.length);
        expect(arts(r.space).length).toBe(r.placed);
      }
    }
  });

  it('실물 갤러리 14점은 세 전략 모두에서 전부 배치된다', () => {
    for (const layout of GEN_LAYOUTS) {
      const r = generateSpace(REAL, { layout });
      expect(r.dropped).toEqual([]);
      expect(r.placed).toBe(REAL.length);
    }
  });

  it('빈 입력·쓰레기 입력에도 유효한 공간이 나온다', () => {
    for (const bad of [[], null as any, [null, undefined, 42, 'x'] as any]) {
      const r = generateSpace(bad);
      expect(r.space.version).toBeGreaterThan(0);
      expect(FOOTPRINT[r.space.shell.footprint]).toBeDefined();
    }
  });
});

describe('generateSpace — 기하 불변식', () => {
  it('모든 파츠가 방 경계 안에 있다', () => {
    for (const layout of GEN_LAYOUTS) {
      const r = generateSpace(mixed(24), { layout });
      const [fw, fd] = FOOTPRINT[r.space.shell.footprint];
      for (const p of r.space.parts) {
        expect(Math.abs(p.x)).toBeLessThanOrEqual(fw / 2 + 1e-9);
        expect(Math.abs(p.z)).toBeLessThanOrEqual(fd / 2 + 1e-9);
      }
    }
  });

  it('같은 벽·같은 단의 작품은 minGap 이상 떨어진다 (겹침 0)', () => {
    for (const layout of GEN_LAYOUTS) {
      const r = generateSpace(mixed(24), { layout });
      // 벽면 = ry + 고정축 좌표, 단 = y. 이 셋이 같으면 같은 줄에 걸린 것이다.
      const rows = new Map<string, { u: number; w: number }[]>();
      for (const p of arts(r.space)) {
        const vertical = Math.abs(Math.sin(p.ry)) > 0.5;           // 동/서벽은 z축으로 늘어선다
        const key = `${p.ry.toFixed(3)}|${(vertical ? p.x : p.z).toFixed(3)}|${p.y ?? 0}`;
        const u = vertical ? p.z : p.x;
        const w = p.t === 'screen' ? PART_TYPES.screen.size[0] : artworkSize(p.ar, r.space.shell.artScale).W;
        (rows.get(key) ?? rows.set(key, []).get(key)!).push({ u, w });
      }
      for (const row of rows.values()) {
        row.sort((a, b) => a.u - b.u);
        for (let i = 1; i < row.length; i++) {
          const gap = (row[i].u - row[i].w / 2) - (row[i - 1].u + row[i - 1].w / 2);
          expect(gap).toBeGreaterThanOrEqual(FRAME_RULES.minGap - 1e-9);
        }
      }
    }
  });

  it('작품마다 조명이 붙는다', () => {
    const r = generateSpace(mixed(12), { layout: 'perimeter' });
    const lights = r.space.parts.filter((p) => p.t === 'trackLight');
    expect(lights.length).toBe(r.placed);
  });

  it('spawn 은 방 안이고 북벽(피처월)을 본다', () => {
    for (const layout of GEN_LAYOUTS) {
      const r = generateSpace(REAL, { layout });
      const [fw, fd] = FOOTPRINT[r.space.shell.footprint];
      expect(Math.abs(r.space.spawn.x)).toBeLessThan(fw / 2);
      expect(Math.abs(r.space.spawn.z)).toBeLessThan(fd / 2);
      expect(r.space.spawn.z).toBeGreaterThan(0);  // 남쪽에 서서
      expect(r.space.spawn.ry).toBe(0);            // 북쪽을 본다
    }
  });
});

describe('generateSpace — 스키마 계약', () => {
  it('normalizeSpace 가 파츠를 버리지 않는다 (재정규화 멱등)', () => {
    for (const layout of GEN_LAYOUTS) {
      const r = generateSpace(mixed(20), { layout });
      const again = normalizeSpace(r.space);
      expect(again.parts.length).toBe(r.space.parts.length);
      expect(JSON.stringify(again)).toBe(JSON.stringify(r.space));
    }
  });

  it('신규 스키마 필드 0 — 알려진 파츠 타입과 필드만 쓴다', () => {
    const r = generateSpace(mixed(20), { layout: 'partition' });
    for (const p of r.space.parts) expect(PART_TYPES[p.t]).toBeDefined();
  });

  it('ar 이 액자 폭에 실제로 반영된다 (artworkSize SSOT 소비)', () => {
    // 초가로장(2.4)과 세로장(0.5)은 폭이 달라야 한다. 같다면 ar 을 안 쓰고 있는 것이다.
    const wide = generateSpace([{ id: 'w', imageUrl: 'a.jpg', ar: 2.4 }]);
    const tall = generateSpace([{ id: 't', imageUrl: 'a.jpg', ar: 0.5 }]);
    expect(arts(wide.space)[0].ar).toBe(2.4);
    expect(arts(tall.space)[0].ar).toBe(0.5);
    expect(artworkSize(2.4).W).toBeGreaterThan(artworkSize(0.5).W);
  });

  it('피처 강조는 방 전체에 최대 1개', () => {
    for (const layout of GEN_LAYOUTS) {
      const r = generateSpace(mixed(30), { layout });
      expect(arts(r.space).filter((p: any) => p.featured).length).toBeLessThanOrEqual(1);
    }
  });

  it('영상 작품은 screen 파츠로 간다', () => {
    const r = generateSpace([{ id: 'v', videoUrl: 'abcdefghijk' }, { id: 'i', imageUrl: 'a.jpg' }]);
    const types = arts(r.space).map((p: any) => p.t).sort();
    expect(types).toEqual(['artwork', 'screen']);
  });
});

describe('generateSpace — 규모 적응', () => {
  it('작품이 많아질수록 footprint 가 커진다 (단조)', () => {
    const keys = Object.keys(FOOTPRINT);
    const idxOf = (k: string) => keys.indexOf(k);
    let prev = -1;
    for (const n of [2, 8, 20, 40]) {
      const r = generateSpace(mixed(n), { layout: 'perimeter' });
      expect(idxOf(r.footprint)).toBeGreaterThanOrEqual(prev);
      prev = idxOf(r.footprint);
    }
  });

  it('genSummary 가 미배치를 감춘 채 성공처럼 읽히지 않는다', () => {
    const r = generateSpace(mixed(400), { layout: 'perimeter' });
    if (r.dropped.length) expect(genSummary(r)).toContain('미배치');
  });
});

describe('generateSpace — 방 크기 노브', () => {
  const keys = Object.keys(FOOTPRINT);
  const idxOf = (k: string) => keys.indexOf(k);

  it('[감독 판정] 기본은 전부 들어가는 최소 크기다', () => {
    // 감독 판정 2026-08-22: "기본은 제일 작은 사이즈로 보여주고".
    // 이 단언이 있는 이유는 회귀 방지가 아니라 **판정 보존**이다 — "좁아 보인다"는
    // 이유로 다음 사람이 기본값을 키우면 이 테스트가 막는다.
    for (const layout of GEN_LAYOUTS) {
      for (const n of [4, 14, 30]) {
        const r = generateSpace(mixed(n), { layout });
        if (r.dropped.length) continue;                       // 넘치는 규모는 최소 개념이 없다
        const smaller = keys[idxOf(r.footprint) - 1];
        if (!smaller) continue;                               // 이미 가장 작은 방
        const tighter = generateSpace(mixed(n), { layout, footprint: smaller });
        expect(tighter.dropped.length).toBeGreaterThan(0);    // 한 단계 작으면 반드시 넘쳐야 한다
      }
    }
  });

  it('roomUp 이 방을 단계만큼 키운다', () => {
    const base = generateSpace(REAL, { layout: 'perimeter' });
    const up1 = generateSpace(REAL, { layout: 'perimeter', roomUp: 1 });
    const up2 = generateSpace(REAL, { layout: 'perimeter', roomUp: 2 });
    expect(idxOf(up1.footprint)).toBe(idxOf(base.footprint) + 1);
    expect(idxOf(up2.footprint)).toBe(idxOf(base.footprint) + 2);
    expect(up1.dropped).toEqual([]);                          // 키웠는데 작품이 빠지면 안 된다
  });

  it('roomUp 은 가장 큰 방에서 멈춘다 (범위 밖으로 나가지 않는다)', () => {
    const r = generateSpace(REAL, { roomUp: 99 });
    expect(r.footprint).toBe(keys[keys.length - 1]);
    expect(r.dropped).toEqual([]);
  });

  it('footprint 명시가 자동 선택을 이긴다', () => {
    for (const key of keys) {
      const r = generateSpace(mixed(5), { footprint: key });
      expect(r.footprint).toBe(key);
    }
  });

  it('명시한 방이 작아 작품이 넘치면 조용히 키우지 않고 보고한다', () => {
    // 요청한 크기를 말없이 무시하는 쪽이 더 나빠 보일 수 있으나, 그러면 작가가
    // "내가 고른 크기"와 다른 방을 보게 된다. 넘침은 dropped 로 드러낸다.
    const r = generateSpace(mixed(40), { footprint: 'small' });
    expect(r.footprint).toBe('small');
    expect(r.dropped.length).toBeGreaterThan(0);
    expect(genSummary(r)).toContain('미배치');
  });

  it('footprint 와 roomUp 을 함께 주면 footprint 가 이긴다', () => {
    const r = generateSpace(REAL, { footprint: 'hall', roomUp: 3 });
    expect(r.footprint).toBe('hall');
  });

  it('알 수 없는 footprint 키는 무시하고 자동 선택으로 돌아간다', () => {
    const auto = generateSpace(REAL, { layout: 'perimeter' });
    for (const bad of ['거대함', '', 'SMALL', null as any, 7 as any]) {
      expect(generateSpace(REAL, { layout: 'perimeter', footprint: bad }).footprint).toBe(auto.footprint);
    }
  });
});

describe('generateSpace — 기본 배치와 시작 위치', () => {
  it('[감독 판정] 아무것도 안 고르면 파티션으로 연다', () => {
    // 감독 판정 2026-08-22 — 후보 넷을 평면도로 비교해 뽑힌 값이다.
    expect(GEN_DEFAULT_LAYOUT).toBe('partition');
    expect(generateSpace(REAL).layout).toBe(GEN_DEFAULT_LAYOUT);
    // 알 수 없는 값을 줘도 기본으로 떨어진다(문자열 오타가 조용히 다른 배치를 열지 않게).
    for (const bad of ['둘레', '', 'PERIMETER', null as any, 3 as any]) {
      expect(generateSpace(REAL, { layout: bad }).layout).toBe(GEN_DEFAULT_LAYOUT);
    }
  });

  it('관람객 시작 위치가 solid 파츠와 겹치지 않는다', () => {
    // 겹치면 벤치·좌대 안에서 시작한다. 렌더는 멀쩡해 보이므로 눈으로는 안 잡힌다.
    // 사람 반경은 큰 쪽(lab-glb 0.32)을 기준으로 본다 — 생성기와 같은 기준.
    const R = 0.32;
    for (const layout of GEN_LAYOUTS) {
      for (const n of [1, 6, 14, 30, 60]) {
        const r = generateSpace(mixed(n), { layout });
        const sp = r.space.spawn;
        for (const p of r.space.parts) {
          const spec = PART_TYPES[p.t];
          if (!spec.solid) continue;                       // 러그·조명은 밟아도 된다
          const [sx, , sz] = spec.size;
          const w = (p.t === 'bench' && p.size ? p.size : sx) / 2;
          const d = sz / 2;
          const gapX = Math.abs(sp.x - p.x) - (w + R);
          const gapZ = Math.abs(sp.z - p.z) - (d + R);
          // 한 축이라도 떨어져 있으면 안 겹친다(AABB).
          expect(Math.max(gapX, gapZ)).toBeGreaterThan(0);
        }
      }
    }
  });

  it('벤치를 놓을 자리가 없으면 놓지 않는다 (억지로 밀어넣지 않는다)', () => {
    // ⚠ 표본을 크기 **이름**이 아니라 좁은 방 **지정**으로 잡는다. 처음엔 「실물 14점은
    // small 을 고른다」에 기대고 있었는데, 창문이 요구사항이 되며(2026-08-24) 최소치가
    // medium 으로 올라가 그 전제가 깨졌다. 검사하려던 것은 크기가 아니라 「자리가 없으면
    // 안 놓는다」이므로, 좁은 방을 직접 지정해 그 축만 본다.
    const tight = generateSpace(REAL, { layout: 'partition', footprint: 'small' });
    expect(tight.footprint).toBe('small');
    expect(tight.space.parts.some((p) => p.t === 'bench')).toBe(false);
    // 방을 키우면 자리가 생기므로 벤치가 돌아온다.
    const roomy = generateSpace(REAL, { layout: 'partition', roomUp: 2 });
    expect(roomy.space.parts.some((p) => p.t === 'bench')).toBe(true);
  });
});

describe('generateSpace — 벽면 겹침 (2차원)', () => {
  // 위·아래 액자가 붙어 있었다. **그때까지 24개 테스트가 전부 통과하고 있었다** — 겹침
  // 검사가 가로(u)만 봤고 세로(y)를 안 봤기 때문이다. 축이 비어 있으면 통과는 아무것도
  // 보증하지 않는다. 그 사고를 다시 못 내게 두 축을 함께 본다.
  const rectsOnWall = (space: any) => {
    const rows = new Map<string, { u: number; w: number; y: number | null; h: number }[]>();
    for (const p of space.parts) {
      if (p.t !== 'artwork' && p.t !== 'screen') continue;
      const vertical = Math.abs(Math.sin(p.ry)) > 0.5;
      const key = `${p.ry.toFixed(3)}|${(vertical ? p.x : p.z).toFixed(3)}`;
      const size = p.t === 'screen' ? { W: PART_TYPES.screen.size[0], H: PART_TYPES.screen.size[1] } : artworkSize(p.ar, space.shell.artScale);
      const r = { u: vertical ? p.z : p.x, w: size.W, y: p.y ?? null, h: size.H };
      (rows.get(key) ?? rows.set(key, []).get(key)!).push(r);
    }
    return rows;
  };

  it('같은 벽면의 어떤 두 작품도 겹치지 않는다 (가로 × 세로 동시)', () => {
    for (const layout of GEN_LAYOUTS) {
      for (const input of [REAL, mixed(8), mixed(24), mixed(50)]) {
        const r = generateSpace(input, { layout });
        for (const row of rectsOnWall(r.space).values()) {
          for (let i = 0; i < row.length; i++) {
            for (let j = i + 1; j < row.length; j++) {
              const a = row[i], b = row[j];
              const uOverlap = Math.abs(a.u - b.u) < (a.w + b.w) / 2 - 1e-9;
              // y 가 둘 다 없으면 같은 높이 줄이다 → 세로는 겹치는 것으로 본다(가로가 갈라야 한다).
              const vOverlap = (a.y === null || b.y === null)
                ? (a.y === b.y)
                : Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 1e-9;
              expect(uOverlap && vOverlap).toBe(false);
            }
          }
        }
      }
    }
  });


  it('층고를 올린 목적은 2단이 아니다 — 작품은 한 줄로만 걸린다', () => {
    // 감독 판정 2026-08-24: «높이가 높다고. 사진을 그렇게 거는 건 싫다.»
    // 천장을 높인 것은 작품을 크게 걸기 위함이지 위아래로 나누기 위함이 아니었다.
    // 그래서 2단 배치(salon)를 걷어냈고, 이 단언이 그 판정을 지킨다.
    for (const layout of GEN_LAYOUTS) {
      const r = generateSpace(REAL, { layout });
      expect(r.space.parts.every((p) => p.y === undefined)).toBe(true);
    }
    expect(GEN_LAYOUTS).not.toContain('salon');
  });
});

describe('pickGalleryId — 어느 갤러리를 열어도 되는가 (보안 경계)', () => {
  // 이 함수는 주소에서 온 값으로 파일 경로를 만드는 자리다. 화이트리스트가 뚫리면
  // `./galleries/<u>.json` 의 <u> 로 무엇이든 들어간다. 그래서 검사받는 자리에 뒀다.
  const INDEX = [
    { id: 'syhongart', name: 'syhongart 개인전', artist: 'syhongart', count: 14 },
    { id: 'other-artist', name: '다른 전시', artist: 'x', count: 3 },
  ];

  it('목록에 있는 id 만 통과한다', () => {
    expect(pickGalleryId(INDEX, 'syhongart')).toBe('syhongart');
    expect(pickGalleryId(INDEX, 'other-artist')).toBe('other-artist');
  });

  it('목록에 없는 값은 전부 거절한다', () => {
    for (const bad of ['nobody', 'SYHONGART', 'syhongart ', ' syhongart', 'syhongart.json']) {
      expect(pickGalleryId(INDEX, bad)).toBeNull();
    }
  });

  it('경로 조작 시도를 거절한다', () => {
    for (const evil of [
      '../../etc/passwd', '../galleries/index', './syhongart', 'syhongart/../../secret',
      '%2e%2e%2fetc', '..%2F..%2Fetc', 'a\u0000b', '/etc/passwd', 'https://evil.example/x',
    ]) {
      expect(pickGalleryId(INDEX, evil)).toBeNull();
    }
  });

  it('프로토타입 상속 속성을 id 로 인정하지 않는다', () => {
    for (const key of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      expect(pickGalleryId(INDEX, key)).toBeNull();
    }
    // id 를 상속으로만 가진 객체도 통과하면 안 된다.
    const inherited = Object.create({ id: 'syhongart' });
    expect(pickGalleryId([inherited], 'syhongart')).toBeNull();
  });

  it('타입이 다른 id 를 느슨한 비교로 통과시키지 않는다', () => {
    // ⚠ 뮤테이션이 잡아낸 사각(M29). `id === u` 를 `id == u` 로 바꿔도 32개가 전부
    // 통과했다 — 숫자 id 와 문자열 u 를 짝지은 표본이 없었기 때문이다. 통과하면
    // **숫자가 반환되어** `./galleries/7.json` 을 열고, 문자열을 준다는 계약도 깨진다.
    expect(pickGalleryId([{ id: 7 }], '7')).toBeNull();
    expect(pickGalleryId([{ id: 0 }], '')).toBeNull();
    expect(pickGalleryId([{ id: true }], 'true')).toBeNull();
    expect(pickGalleryId([{ id: ['syhongart'] }], 'syhongart')).toBeNull();
    expect(pickGalleryId([{ id: null }], '')).toBeNull();
  });

  it('빈 id 는 목록에 있어도 열지 않는다', () => {
    // ⚠ 뮤테이션이 잡아낸 사각(M30). `u === ''` 검사를 빼도 전부 통과했다 — 목록에
    // 빈 id 가 있는 표본이 없어서다. 통과하면 `./galleries/.json` 을 연다.
    expect(pickGalleryId([{ id: '' }], '')).toBeNull();
    expect(pickGalleryId([{ id: 'syhongart' }, { id: '' }], '')).toBeNull();
  });

  it('망가진 입력에도 null 을 돌려준다 (throw 하지 않는다)', () => {
    for (const idx of [null, undefined, {}, 'not-array', 42, [null, undefined, 1, 'x'], [{}], [{ id: 7 }]]) {
      expect(pickGalleryId(idx as any, 'syhongart')).toBeNull();
    }
    for (const u of [null, undefined, '', 0, {}, [], true]) {
      expect(pickGalleryId(INDEX, u as any)).toBeNull();
    }
  });
});

describe('generateSpace — 천장 높이', () => {
  it('[감독 판정] 층고는 스키마 최대치를 쓴다', () => {
    // 감독 판정 2026-08-24: «작가갤러리 지금 골방같아. 천장 높게 안될까?»
    // 이 단언이 있는 이유는 회귀 방지가 아니라 **판정 보존**이다 — 「기본은 작게」(방 넓이)와
    // 「천장은 높게」가 다른 축이라, 앞엣것을 이유로 뒤엣것을 되돌리는 일이 없게 못 박는다.
    const h = STORY_H[generateSpace(REAL).space.shell.storyH];
    expect(h).toBe(Math.max(...Object.values(STORY_H)));
    expect(h).toBeGreaterThan(STORY_H.gallery);   // 이전 값보다 확실히 높다
  });

  it('천장이 높아져도 방 넓이는 여전히 「전부 들어가는 최소」다', () => {
    // 감독 판정 2026-08-22 「기본은 제일 작은 사이즈로」는 그대로 유효하다.
    // ⚠ 다만 **크기 이름을 박지 않는다**. 창문이 요구사항이 되며(2026-08-24) 최소치가
    // 한 단계 올라갔는데, 그것은 「최소를 고르지 않게 된 것」이 아니라 「전부」에 창문이
    // 들어온 것이다. 이름을 박으면 요구가 늘 때마다 이 검사가 판정을 배신한다.
    const keys = Object.keys(FOOTPRINT);
    const r = generateSpace(REAL);
    const smaller = keys[keys.indexOf(r.footprint) - 1];
    if (smaller) {
      // 한 단계 작으면 작품이든 창문이든 못 담아야 「최소」다.
      const tighter = generateSpace(REAL, { footprint: smaller });
      const winsNow = r.space.parts.filter((p) => p.t === 'window').length;
      const winsTight = tighter.space.parts.filter((p) => p.t === 'window').length;
      expect(tighter.dropped.length > 0 || winsTight < winsNow).toBe(true);
    }
  });
});

describe('generateSpace — 창문', () => {
  // 감독 지적 2026-08-24: «창문이 없으니 답답해».
  const wins = (sp: any) => sp.parts.filter((p: any) => p.t === 'window');

  it('모든 배치에서 창문이 난다', () => {
    for (const layout of GEN_LAYOUTS) {
      for (const n of [3, 14, 30]) {
        expect(wins(generateSpace(mixed(n), { layout }).space).length).toBeGreaterThan(0);
      }
    }
  });

  it('창문이 방 경계 안에 있다', () => {
    for (const layout of GEN_LAYOUTS) {
      const r = generateSpace(REAL, { layout });
      const [fw, fd] = FOOTPRINT[r.footprint];
      for (const w of wins(r.space)) {
        expect(Math.abs(w.x)).toBeLessThanOrEqual(fw / 2 + 1e-9);
        expect(Math.abs(w.z)).toBeLessThanOrEqual(fd / 2 + 1e-9);
      }
    }
  });

  it('창문이 작품 자리를 뺏지 않는다 (용량에서 먼저 뗐다)', () => {
    // 창문을 넣느라 작품이 밀려나면 안 된다 — 벽 용량에서 미리 뺐으므로 둘 다 들어간다.
    for (const layout of GEN_LAYOUTS) {
      const r = generateSpace(REAL, { layout });
      expect(r.dropped).toEqual([]);
      expect(r.placed).toBe(REAL.length);
    }
  });

  it('창문과 작품이 같은 벽에서 겹치지 않는다', () => {
    for (const layout of GEN_LAYOUTS) {
      const r = generateSpace(REAL, { layout });
      const rows = new Map<string, { u: number; w: number }[]>();
      for (const p of r.space.parts) {
        if (p.t !== 'artwork' && p.t !== 'screen' && p.t !== 'window') continue;
        const vert = Math.abs(Math.sin(p.ry)) > 0.5;
        const key = `${p.ry.toFixed(3)}|${(vert ? p.x : p.z).toFixed(3)}`;
        const w = p.t === 'window' ? PART_TYPES.window.size[0]
          : p.t === 'screen' ? PART_TYPES.screen.size[0] : artworkSize(p.ar, r.space.shell.artScale).W;
        (rows.get(key) ?? rows.set(key, []).get(key)!).push({ u: vert ? p.z : p.x, w });
      }
      for (const row of rows.values()) {
        row.sort((a, b) => a.u - b.u);
        for (let i = 1; i < row.length; i++) {
          const gap = (row[i].u - row[i].w / 2) - (row[i - 1].u + row[i - 1].w / 2);
          expect(gap).toBeGreaterThanOrEqual(-1e-9);
        }
      }
    }
  });

  it('창밖 풍경은 별도 파일이고 창문이 있을 때만 붙는다 (감독 지시)', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    expect(existsSync('frontend/js/space-outside.ts')).toBe(true);
    const html = readFileSync('frontend/visit.html', 'utf-8');
    expect(html).toContain("from './js/space-outside.js'");
    expect(html).toMatch(/some\(\(p\) => p && p\.t === 'window'\)/);   // 조건부 부착
    // 방 조립(space-assembler)이 바깥을 모르는 것이 분리의 요점이다.
    const asm = readFileSync('frontend/js/space-assembler.ts', 'utf-8');
    expect(asm).not.toContain('space-outside');
  });
});
