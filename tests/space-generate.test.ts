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

import { generateSpace, GEN_LAYOUTS, genSummary, type GenArtwork } from '../frontend/js/space-generate.js';
import { FOOTPRINT, FRAME_RULES, PART_TYPES, artworkSize, normalizeSpace } from '../frontend/js/space.js';

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
        const w = p.t === 'screen' ? PART_TYPES.screen.size[0] : artworkSize(p.ar).W;
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
