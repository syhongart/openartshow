// 오버레이 계약 **v2 — 파셀 동결**. 순수 함수 축.
//
// ── 무엇을 지키는가 ─────────────────────────────────────────────────────────
// v2 는 «마을 건물을 감독이 손으로 옮긴다» 를 담는다. 그런데 마을 파츠에는 **이름이 없고**
// (`PlacedPart` 에 `id`·`index` 가 없다) 후보 키 `(px,pz,kind,i)` 는 노브 한 번에 무효가
// 된다 — 실측(2026-08-12): 파셀 (3,-7) 에서 `?bld=2` 하나로 나무 3그루가 **전멸**했다.
//
// 감독 판정 *"손본 구역은 슬라이더에서 빠진다"* 가 그 문제를 없앴다. 동결된 파셀은 배치
// 배열 **전체**를 저장하므로 파츠를 가리킬 키가 필요 없다.
//
// ── 팀장이 지정한 집행 3축 (2026-08-12 판정) ────────────────────────────────
// 이 예외가 «전역 저장» 으로 확대되는 것을 **문서가 아니라 검사**가 막아야 한다:
//   ① 생성기(`decide/parcel-layout.ts`)가 동결 계약을 import 하지 않는다 — 동결은 생성기
//      **바깥**에서만 적용된다. 생성기 안에 분기가 들어가는 것이 확대의 첫 형태다.
//   ② 골든 해시 불변 + `parcelLayout` 순수성 — ②의 후반부(동결 무관 동일)는 소비자가
//      붙는 W4 에서 성질 테스트로 건다. **지금은 소비자가 없어 걸 대상이 없다.**
//   ③ 스키마가 전역 오버라이드를 **표현할 수 없다** — 최상위는 «파셀 키가 필수인 목록» 이고
//      키 없는 항목은 버려진다. 타입과 normalize 가 확대를 막는다.
//
// ⚠ ②의 후반부를 여기서 «했다» 로 적지 않는다 — 못 잰 것을 통과로 적지 않는다.
//
// ── 뮤테이션 실측 (2026-08-12) ──────────────────────────────────────────────
// 이 파일 작성 직후 6건을 되살려 검출력을 쟀다. 결과는 커밋 메시지와 PR 본문에 있다.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import {
  emptyOverlay, loadOverlay, validateOverlay, normalizeOverlay,
  OVERLAY_VERSION, S_MAX, POS_LIMIT,
  type FrozenParcel,
} from '../frontend/js/world2/decide/overlay.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';

const SRC = 'assets/models/a.glb';

function part(over: Partial<PlacedPart> = {}): PlacedPart {
  return { kind: 'building', x: 1, z: 2, y: 0, ry: 0.5, sx: 3, sy: 4, sz: 5, tone: 1, ...over };
}

function parcel(over: Partial<FrozenParcel> = {}): FrozenParcel {
  return { px: 3, pz: -7, parts: [part()], ...over };
}

// ── import 그래프 추적 (팀장 집행 축 ①) ─────────────────────────────────────
// 소스에서 **모듈 지정자 문자열**을 전부 뽑는다. `from '…'` · `import('…')` ·
// `export … from '…'` 이 한 정규식에 잡히고, 줄바꿈이 어디에 있든 상관없다.
function specifiersOf(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/** 상대 지정자를 실제 파일로. 이 저장소는 `.ts` 소스를 `.js` 로 가리킨다 */
function resolvePath(fromDir: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null; // 패키지(three 등)는 따라가지 않는다
  const base = pathResolve(fromDir, spec);
  for (const c of [base.replace(/\.js$/, '.ts'), base, `${base}.ts`, `${base}/index.ts`]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

function listFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((n) => n.endsWith('.ts'))
    .map((n) => `${dir}/${n}`);
}

/** 뿌리에서 **전이적으로** 닿는 소스 전부 */
function reachableFrom(roots: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = roots.map((r) => pathResolve(r));
  while (queue.length > 0) {
    const f = queue.pop()!;
    if (seen.has(f) || !existsSync(f)) continue;
    seen.add(f);
    for (const spec of specifiersOf(f)) {
      const next = resolvePath(dirname(f), spec);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  return seen;
}

describe('v2 · 파셀 동결을 담는다', () => {
  it('빈 오버레이에 parcels 가 있고 비어 있다 — 동결 전에는 v1 과 같게 동작한다', () => {
    const e = emptyOverlay();
    expect(e.version).toBe(OVERLAY_VERSION);
    expect(e.parcels).toEqual([]);
  });

  it('동결 파셀이 라운드트립한다 — 저장→로드가 무손실', () => {
    const src = { version: OVERLAY_VERSION, items: [], parcels: [parcel()] };
    const back = loadOverlay(src);
    expect(back.parcels).toEqual([parcel()]);
  });

  it('두 번 통과시켜도 같다 — 정규화가 값을 조금씩 움직이지 않는다', () => {
    const once = loadOverlay({ version: OVERLAY_VERSION, items: [], parcels: [parcel()] });
    const twice = loadOverlay(once);
    expect(twice).toEqual(once);
  });

  it('파츠 필드가 하나도 사라지지 않는다 — PlacedPart 와 1:1', () => {
    const p = part();
    const back = loadOverlay({ version: OVERLAY_VERSION, items: [], parcels: [parcel({ parts: [p] })] });
    // 키 집합이 같아야 한다. 하나라도 빠지면 그 파셀은 다시 읽을 때 다른 배치가 된다.
    expect(Object.keys(back.parcels[0].parts[0]).sort()).toEqual(Object.keys(p).sort());
  });

  it('비균등 스케일이 살아 있다 — 마을 파츠는 축마다 크기가 다른 것이 기본이다', () => {
    const back = loadOverlay({
      version: OVERLAY_VERSION, items: [],
      parcels: [parcel({ parts: [part({ sx: 2, sy: 7, sz: 0.5 })] })],
    });
    const got = back.parcels[0].parts[0];
    expect([got.sx, got.sy, got.sz]).toEqual([2, 7, 0.5]);
  });

  it('스케일이 상한을 넘으면 잘리고 그것을 보고한다', () => {
    const { overlay, issues } = validateOverlay({
      version: OVERLAY_VERSION, items: [],
      parcels: [parcel({ parts: [part({ sx: 1e9 })] })],
    });
    expect(overlay.parcels[0].parts[0].sx).toBe(S_MAX);
    expect(issues.some((i) => i.reason === 'clamped')).toBe(true);
  });

  it('좌표가 상한을 넘으면 잘린다', () => {
    const back = loadOverlay({
      version: OVERLAY_VERSION, items: [],
      parcels: [parcel({ parts: [part({ x: 1e12 })] })],
    });
    expect(back.parcels[0].parts[0].x).toBe(POS_LIMIT);
  });
});

describe('v2 · 못 쓰는 것은 버리되 버렸다고 말한다', () => {
  it('파셀 좌표가 없으면 버리고 보고한다 — 어느 파셀인지 몰라 얹을 자리가 없다', () => {
    const { overlay, issues } = validateOverlay({
      version: OVERLAY_VERSION, items: [], parcels: [{ parts: [part()] }],
    });
    expect(overlay.parcels).toEqual([]);
    expect(issues.some((i) => i.reason === 'parcel-no-coord')).toBe(true);
  });

  it('파츠 종류를 모르면 그 파츠만 버리고 보고한다', () => {
    const { overlay, issues } = validateOverlay({
      version: OVERLAY_VERSION, items: [],
      parcels: [parcel({ parts: [part(), part({ kind: '' })] })],
    });
    expect(overlay.parcels[0].parts).toHaveLength(1);
    expect(issues.some((i) => i.reason === 'part-no-kind')).toBe(true);
  });

  it('parcels 가 배열이 아니면 보고한다 — 동결이 통째로 사라지는 것을 조용히 넘기지 않는다', () => {
    const { issues } = validateOverlay({ version: OVERLAY_VERSION, items: [], parcels: 'x' });
    expect(issues.some((i) => i.reason === 'parcels-not-array')).toBe(true);
  });

  it('parts 가 배열이 아니면 보고한다', () => {
    const { issues } = validateOverlay({
      version: OVERLAY_VERSION, items: [], parcels: [{ px: 0, pz: 0, parts: 5 }],
    });
    expect(issues.some((i) => i.reason === 'parts-not-array')).toBe(true);
  });

  it('계약이 모르는 파츠 필드가 사라지면 보고한다', () => {
    const { issues } = validateOverlay({
      version: OVERLAY_VERSION, items: [],
      parcels: [parcel({ parts: [{ ...part(), nickname: 'hall' } as unknown as PlacedPart] })],
    });
    expect(issues.some((i) => i.reason === 'unknown-field')).toBe(true);
  });

  // ⚠ 아래 두 축은 **뮤테이션이 사각을 드러내서** 추가된 것이다(2026-08-12).
  // `normalizeOverlay` 의 `if (norm.kind === '') continue;` 를 지웠는데 **0 failed** 였다 —
  // 위 「파츠 종류를 모르면…」 은 `validateOverlay`(관문)만 보고, **런타임 경로가 같은
  // 판단을 하는지는 아무도 안 보고 있었다.** 이 파일이 반려 사슬 내내 싸운 *"두 함수가
  // 같은 파일에 다른 말을 한다"* 가 v2 에서 그대로 재발할 자리였다.
  it('런타임 경로도 kind 빈 파츠를 버린다 — 관문과 같은 말을 해야 한다', () => {
    const back = loadOverlay({
      version: OVERLAY_VERSION, items: [],
      parcels: [parcel({ parts: [part(), part({ kind: '' })] })],
    });
    expect(back.parcels[0].parts).toHaveLength(1);
    expect(back.parcels[0].parts[0].kind).toBe('building');
  });

  it('issues 가 비면 두 경로가 같은 파셀을 낸다', () => {
    const raw = { version: OVERLAY_VERSION, items: [], parcels: [parcel()] };
    const v = validateOverlay(raw);
    expect(v.issues).toEqual([]);
    expect(loadOverlay(raw).parcels).toEqual(v.overlay.parcels);
  });

  it('파츠 수치가 NaN 이면 파셀째 버린다 — 반쯤 깨진 배치를 얹는 것이 더 나쁘다', () => {
    const { overlay, issues } = validateOverlay({
      version: OVERLAY_VERSION, items: [],
      parcels: [parcel({ parts: [part({ x: NaN })] })],
    });
    expect(overlay.parcels).toEqual([]);
    expect(issues.some((i) => i.reason === 'bad-number')).toBe(true);
  });
});

describe('v2 · v1 파일을 무손실로 올려 읽는다', () => {
  const v1 = { version: 1, items: [{ src: SRC, x: 1, y: 2, z: 3, ry: 0.25, s: 1.5 }] };

  it('v1 배치가 한 톨도 안 바뀐다', () => {
    const back = loadOverlay(v1);
    expect(back.items).toEqual(v1.items);
    expect(back.parcels).toEqual([]);
    expect(back.version).toBe(OVERLAY_VERSION);
  });

  it('버전 필드가 아예 없는 손글씨 파일도 올려 읽는다', () => {
    const back = loadOverlay({ items: v1.items });
    expect(back.items).toEqual(v1.items);
    expect(back.version).toBe(OVERLAY_VERSION);
  });

  it('올려 읽었다는 사실을 issues 가 아니라 migrated 로 알린다', () => {
    const { issues, migrated } = validateOverlay(v1);
    // ⚠ issues 에 넣으면 v1 파일을 열 때마다 «손실 있음» 이 떠서 그 경고가 무의미해진다.
    // 배치·값·필드는 하나도 안 바뀌므로 「issues 가 비면 무손실」은 그대로 참이다.
    expect(issues).toEqual([]);
    expect(migrated).toBe(true);
  });

  it('이미 v2 인 파일은 migrated 가 false 다', () => {
    const { migrated } = validateOverlay({ version: OVERLAY_VERSION, items: [], parcels: [] });
    expect(migrated).toBe(false);
  });
});

// ── 팀장 집행 축 ①③ (2026-08-12 판정) ──────────────────────────────────────
describe('파셀 동결 예외가 «전역» 으로 새지 않는다', () => {
  it('① 생성기가 동결 계약에 닿지 않는다 — 전이적으로', () => {
    // ⚠ 첫 판본은 *"`import` 로 시작하는 줄"* 만 문자열로 봤고, 검수관이 **세 형태로
    // 우회됨을 실측**했다(2026-08-12): ① 멀티라인 import(경로가 둘째 줄에 있다)
    // ② barrel 재수출 경유 ③ 동적 `import()` 표현식(줄이 `const` 로 시작한다).
    // 팀장 조건이 *"문서가 아니라 **검사**가 막아야 한다"* 였으므로 가장 정직한 형태만
    // 잡는 검사는 조건을 충족하지 못한다.
    //
    // 그래서 ① **모듈 지정자 문자열 전부**를 보고(멀티라인·동적 import 가 함께 잡힌다)
    // ② **그래프를 따라간다**(barrel 경유가 잡힌다).
    //
    // 범위도 넓혔다 — 팀장 조건 원문은 `parcel-layout.ts` 를 특정했지만 실제 배치를
    // 계산하는 코드는 `parts/*.ts` 에도 있다(검수관 P4). 조건의 **목적**은 «생성기가 동결을
    // 모르게» 이므로 생성기 전부를 뿌리로 둔다.
    const reached = reachableFrom([
      'frontend/js/world2/decide/parcel-layout.ts',
      ...listFiles('frontend/js/world2/parts'),
    ]);
    const contract = resolvePath('frontend/js/world2/decide', './overlay.js');
    expect(contract, '계약 파일 경로가 풀려야 한다 — 안 풀리면 이 검사는 공허하다').not.toBeNull();
    expect([...reached].filter((f) => f.includes('decide/overlay'))).toEqual([]);
  });

  it('③ 스키마가 «파셀 키 없는 오버라이드» 를 표현할 수 없다', () => {
    // 전역 오버라이드를 흉내낸 입력 — 파셀 좌표 없이 파츠만 나열한다.
    const back = normalizeOverlay({
      version: OVERLAY_VERSION, items: [],
      parcels: [{ parts: [part()] }, { px: 0, parts: [part()] }, { pz: 0, parts: [part()] }],
    });
    expect(back.parcels, '좌표 없는 항목은 하나도 살아남지 않는다').toEqual([]);
  });

  it('③ 최상위에 «모든 파셀에 적용» 같은 필드를 넣으면 사라지고 보고된다', () => {
    const { overlay, issues } = validateOverlay({
      version: OVERLAY_VERSION, items: [], parcels: [], applyToAll: { kind: 'building', sy: 9 },
    });
    expect(Object.keys(overlay)).toEqual(Object.keys(emptyOverlay()));
    expect(issues.some((i) => i.reason === 'unknown-field')).toBe(true);
  });
});
