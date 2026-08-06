// tests/code-metrics.test.ts — 아키텍처 페이지의 수치를 만드는 분류·집계.
//
// 왜 검사하나: 이 수치가 **감독이 보는 페이지에 그대로 실린다.** 분류가 틀리면 화면에는
// 그럴듯한 숫자가 뜨고 아무도 틀린 줄 모른다 — 이 저장소가 반복해서 당한 형태
// (*"못 잰 것이 통과로 적히는 경향"*)의 데이터판이다.

import { describe, it, expect } from 'vitest';
import { AREAS, classify, aggregate, topOwnFiles, testRatio } from '../scripts/lib/code-metrics.mjs';

describe('영역 분류', () => {
  it('★ 좁은 규칙이 넓은 규칙보다 앞에 온다 — 순서가 뒤집히면 world2 가 통째로 사라진다', () => {
    // `frontend/js/world2/x.ts` 는 `frontend/js/` 규칙에도 맞는다. 배열 순서가 유일한
    // 구분 수단이므로 **순서 자체를 단언**한다. 값 비교로는 이 결함이 안 잡힌다 —
    // 순서가 뒤집혀도 두 규칙 다 "매치" 이기 때문이다.
    const idx = (k: string) => AREAS.findIndex((a) => a.key === k);
    expect(idx('vendor')).toBeLessThan(idx('app'));
    expect(idx('world2')).toBeLessThan(idx('app'));
    expect(idx('app')).toBeLessThan(idx('front-etc'));
    expect(idx('smoke')).toBeLessThan(idx('scripts'));
    expect(idx('etc')).toBe(AREAS.length - 1); // catch-all 은 마지막
  });

  it('실제 경로들이 의도한 영역으로 간다', () => {
    expect(classify('frontend/js/world2/systems/sky.ts')).toBe('world2');
    expect(classify('frontend/js/sky.js')).toBe('app');
    expect(classify('frontend/vendor/three.module.js')).toBe('vendor');
    expect(classify('frontend/utils/BufferGeometryUtils.js')).toBe('vendor');
    expect(classify('frontend/landing.html')).toBe('html');
    expect(classify('scripts/smoke/run.mjs')).toBe('smoke');
    expect(classify('scripts/build-devlog.mjs')).toBe('scripts');
    expect(classify('tests/x.test.ts')).toBe('tests');
    expect(classify('docs/ARCHITECTURE.md')).toBe('docs');
    expect(classify('CLAUDE.md')).toBe('docs');
    expect(classify('.github/workflows/deploy.yml')).toBe('ci');
    expect(classify('package.json')).toBe('etc');
  });

  it('분류되지 않는 경로가 없다 — catch-all 이 살아 있다', () => {
    for (const p of ['', 'x', 'a/b/c/d.zzz', '../weird']) {
      expect(typeof classify(p)).toBe('string');
    }
  });
});

const FIXTURE = [
  { path: 'frontend/vendor/three.module.js', lines: 50000 },
  { path: 'frontend/js/world2/main.ts', lines: 600 },
  { path: 'frontend/js/world2/systems/sky.ts', lines: 400 },
  { path: 'frontend/js/sky.js', lines: 1000 },
  { path: 'tests/a.test.ts', lines: 500 },
];

describe('집계', () => {
  it('영역별 합계와 파일 수', () => {
    const a = aggregate(FIXTURE);
    const get = (k: string) => a.areas.find((x) => x.key === k);
    expect(get('world2')!.lines).toBe(1000);
    expect(get('world2')!.files).toBe(2);
    expect(get('app')!.lines).toBe(1000);
    expect(get('vendor')!.lines).toBe(50000);
  });

  it('★ 비중의 분모는 자체 코드다 — 벤더를 넣으면 나머지가 전부 납작해진다', () => {
    const a = aggregate(FIXTURE);
    // 자체 = 1000(world2) + 1000(app) + 500(tests) = 2500
    expect(a.own.lines).toBe(2500);
    expect(a.vendor.lines).toBe(50000);
    expect(a.total.lines).toBe(52500);
    // world2 는 자체의 40% 다. 전체(52500) 기준이면 1.9% 가 돼 화면에서 사라진다.
    expect(a.areas.find((x) => x.key === 'world2')!.share).toBeCloseTo(0.4, 6);
  });

  it('★ 벤더 행의 share 는 0 이 아니라 null 이다 — "작다" 와 "이 축 밖" 은 다르다', () => {
    const a = aggregate(FIXTURE);
    expect(a.areas.find((x) => x.key === 'vendor')!.share).toBeNull();
  });

  it('큰 순으로 정렬된다', () => {
    const a = aggregate(FIXTURE);
    for (let i = 1; i < a.areas.length; i++) {
      expect(a.areas[i - 1].lines).toBeGreaterThanOrEqual(a.areas[i].lines);
    }
  });

  it('빈 입력에서 0 나누기가 안 난다', () => {
    const a = aggregate([]);
    expect(a.total.lines).toBe(0);
    expect(a.areas).toEqual([]);
    expect(testRatio(a)).toBeNull();
  });
});

describe('상위 파일 · 테스트 비율', () => {
  it('★ 상위 목록에서 벤더를 뺀다 — 안 빼면 three.js 가 목록을 먹는다', () => {
    const top = topOwnFiles(FIXTURE, 3);
    expect(top.some((f: { path: string }) => f.path.includes('vendor'))).toBe(false);
    expect(top[0].path).toBe('frontend/js/sky.js'); // 1000 이 자체 최대
  });

  it('테스트 비율은 구현 대비다(자기 자신을 분모에서 뺀다)', () => {
    const a = aggregate(FIXTURE);
    // 테스트 500 / 구현(2500-500=2000) = 0.25
    expect(testRatio(a)).toBeCloseTo(0.25, 6);
  });

  it('구현이 0이면 비율을 만들지 않는다 — 무한대를 화면에 내보내지 않는다', () => {
    expect(testRatio(aggregate([{ path: 'tests/only.test.ts', lines: 10 }]))).toBeNull();
  });
});
