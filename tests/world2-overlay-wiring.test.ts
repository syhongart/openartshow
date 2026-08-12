// tests/world2-overlay-wiring.test.ts — 오버레이 소비자·편집 모드의 **배선**을 잰다.
//
// 계약 자체는 `world2-overlay.test.ts` 가 본다. 여기서 보는 것은 그 계약이 실제로
// 소비되는 경로에서만 깨지는 것들이다 — 순수 함수 테스트가 원리상 못 보는 자리.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ndcOf, rayPlaneY, snapTo, parcelOf, scaleBy } from '../frontend/js/world2/decide/edit-pick.js';
import { reviewOverlay } from '../frontend/js/world2/edit/export.js';
import { loadOverlay, validateOverlay } from '../frontend/js/world2/decide/overlay.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('라이브 격리 — `?edit=1` 없는 세션이 편집 코드를 안 받는다', () => {
  // 이 축이 무너지는 방식은 하나다: 누군가 동적 import 를 정적 import 로 "정리"한다.
  // 그러면 편집 모듈이 기본 번들에 들어가고, 그 사실은 **배포 뒤 번들 크기로만** 드러난다.
  it('features/overlay.ts 에 편집 모듈 정적 import 가 없다', () => {
    const src = read('frontend/js/world2/features/overlay.ts');
    const staticImports = [...src.matchAll(/^\s*import\s[^\n]*from\s+'([^']+)'/gm)].map((m) => m[1]);
    const editImports = staticImports.filter((s) => s.includes('/edit/') || s.startsWith('../edit/'));
    // 타입 전용은 번들에 안 남는다 — 값 import 만 문제다.
    const valueEditImports = editImports.filter((s) => {
      const line = src.split('\n').find((l) => l.includes(`from '${s}'`)) ?? '';
      return !/^\s*import\s+type\b/.test(line);
    });
    expect(
      valueEditImports,
      '★ `edit/` 를 값으로 정적 import 하면 편집 코드가 기본 번들에 들어간다.'
      + ' 동적 `await import(...)` 를 유지할 것.',
    ).toEqual([]);
  });

  it('동적 import 자체는 남아 있다 — 게이트가 빈 주장을 하지 않게', () => {
    const src = read('frontend/js/world2/features/overlay.ts');
    expect(src).toMatch(/await import\('\.\.\/edit\/mode\.js'\)/);
  });
});

describe('팔레트 매니페스트는 실제 파일과 짝이다', () => {
  // 손으로 관리하는 목록이라 어긋난다. 어긋나면 팔레트 버튼이 404 를 부르는데, 화면에는
  // "로드 실패" 만 뜨고 원인이 목록이라는 것은 안 보인다.
  it('index.json 의 models 가 assets/models 의 .glb 집합과 같다', () => {
    const manifest = JSON.parse(read('frontend/assets/models/index.json')) as { models: string[] };
    const actual = fs.readdirSync(path.join(ROOT, 'frontend/assets/models'))
      .filter((f) => f.endsWith('.glb')).sort();
    expect([...manifest.models].sort()).toEqual(actual);
  });
});

describe('배포되는 배치 파일이 계약을 통과한다', () => {
  // 감독이 내보낸 JSON 을 내가 커밋하는 흐름이라, 깨진 파일이 들어오면 라이브에서
  // **조용히** 빈 오버레이가 된다(`loadOverlay` 는 던지지 않는다). 커밋 시점에 잡는다.
  it('world2-overlay.json 이 무손실이다', () => {
    const raw = JSON.parse(read('frontend/assets/world2-overlay.json'));
    const { issues } = validateOverlay(raw);
    expect(issues, '★ 커밋된 배치 파일에 손실이 있다 — 편집 화면의 내보내기 관문을 다시 거칠 것.')
      .toEqual([]);
    // 두 함수가 같은 말을 하는지도 본다. 계약 헤더가 *"issues 가 비면 무손실"* 이라고
    // 약속한 그 문장이 이 파일에서 실제로 참인가를 재는 자리다.
    expect(loadOverlay(raw).items.length).toBe(validateOverlay(raw).overlay.items.length);
  });
});

describe('내보내기 관문 — 손실이 있으면 clean 이 아니다', () => {
  const ok = { version: 1, items: [{ src: 'assets/models/a.glb', x: 1, y: 0, z: 2, ry: 0, s: 1 }] };

  it('무손실이면 clean', () => {
    const r = reviewOverlay(ok);
    expect(r.clean).toBe(true);
    expect(r.badIndexes).toEqual([]);
    expect(JSON.parse(r.json).items).toHaveLength(1);
  });

  it('값이 잘리면 clean 이 아니고 그 항목을 가리킨다', () => {
    const r = reviewOverlay({ version: 1, items: [ok.items[0], { ...ok.items[0], s: 0 }] });
    expect(r.clean).toBe(false);
    expect(r.badIndexes).toEqual([1]);
    expect(r.summary).toContain('잘림');
  });

  it('경로가 안전하지 않으면 clean 이 아니다 — blob 이 커밋되는 경로', () => {
    const r = reviewOverlay({ version: 1, items: [{ src: 'blob:http://x/y', x: 0, y: 0, z: 0, ry: 0, s: 1 }] });
    expect(r.clean).toBe(false);
    expect(r.summary).toContain('커밋 불가');
  });

  it('관문을 loadOverlay 로 바꾸면 죽는 축 — 깨진 항목이 조용히 살아난다', () => {
    // 계약 헤더 GS-O2 가 경고한 그 갈림이다. `loadOverlay` 는 `x:'NaN'` 을 0 으로
    // **살리고** `validateOverlay` 는 항목째 버린다. 관문이 전자면 화면과 파일이 달라진다.
    const bad = { version: 1, items: [{ src: 'assets/models/a.glb', x: 'NaN', y: 0, z: 0, ry: 0, s: 1 }] };
    expect(loadOverlay(bad).items).toHaveLength(1);
    expect(reviewOverlay(bad).clean).toBe(false);
  });
});

describe('편집 좌표 산술', () => {
  it('NDC — 캔버스 중앙이 0,0 이고 폭이 0 이면 null', () => {
    const rect = { left: 0, top: 0, width: 200, height: 100 };
    // `-0` 이 나오는 자리다(`-(0)`). 레이캐스터에는 무해하므로 부호 0 은 안 가른다.
    const mid = ndcOf(100, 50, rect)!;
    expect(mid.x).toBeCloseTo(0, 12);
    expect(mid.y).toBeCloseTo(0, 12);
    expect(ndcOf(200, 0, rect)).toEqual({ x: 1, y: 1 });
    expect(ndcOf(0, 0, { left: 0, top: 0, width: 0, height: 100 })).toBeNull();
  });

  it('광선 ∩ 지면 — 카메라 뒤쪽 교차는 버린다', () => {
    const down = { ox: 0, oy: 10, oz: 0, dx: 0, dy: -1, dz: 0 };
    expect(rayPlaneY(down, 0)).toEqual({ x: 0, z: 0 });
    // 위를 보는 광선은 y=0 을 **뒤에서** 만난다. 안 거르면 등 뒤에 물건이 쌓인다.
    expect(rayPlaneY({ ...down, dy: 1 }, 0)).toBeNull();
    // 수평 광선은 평면과 평행이다.
    expect(rayPlaneY({ ...down, dy: 0, dx: 1 }, 0)).toBeNull();
  });

  it('스냅 — step 이 0 이하면 그대로', () => {
    expect(snapTo(1.3, 0.5)).toBe(1.5);
    expect(snapTo(1.3, 0)).toBe(1.3);
    expect(snapTo(-1.3, 0.5)).toBe(-1.5);
  });

  it('파셀 변환이 parcel-builder 의 ox = px*cellX 와 짝이다', () => {
    // 원점은 파셀 (0,0) 의 중심이다.
    expect(parcelOf(0, 0, 32, 32)).toEqual({ px: 0, pz: 0, lx: 0, lz: 0 });
    // 셀 하나를 넘어가면 인덱스가 오르고 로컬은 다시 0 근처로 돌아온다.
    expect(parcelOf(32, 0, 32, 32)).toEqual({ px: 1, pz: 0, lx: 0, lz: 0 });
    expect(parcelOf(20, 0, 32, 32)).toEqual({ px: 1, pz: 0, lx: -12, lz: 0 });
    expect(parcelOf(-20, 0, 32, 32)).toEqual({ px: -1, pz: 0, lx: 12, lz: 0 });
  });

  it('크기는 곱셈이라 작은 물건과 큰 물건의 손맛이 같다', () => {
    expect(scaleBy(1, 2)).toBe(2);
    expect(scaleBy(0.05, 2)).toBeCloseTo(0.1, 10);
    // 0 이나 음수가 되는 곱은 무시한다 — 지오메트리가 뒤집히거나 사라진다.
    expect(scaleBy(1, 0)).toBe(1);
    expect(scaleBy(1, -1)).toBe(1);
  });
});

describe('기능 등록', () => {
  it('features/index.ts 가 overlay 를 켠다', () => {
    const src = read('frontend/js/world2/features/index.ts');
    expect(src).toMatch(/import \{ overlayFeature \} from '\.\/overlay\.js'/);
    expect(src).toMatch(/^\s*overlayFeature,\s*$/m);
  });
});
