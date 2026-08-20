// GLB 미술관이 **기본으로 서고, 끄면 정말 아무것도 아닌가.**
//
// ── 감독 지시에서 생겼다 ────────────────────────────────────────────────────
// *"지엘비 건물 테스트로 넘어가자. 원복할수있게 해."* (실험 착수)
// *"glb 건물 기본으로 나오게하자"* (2026-08-02 — 기본 노출로 승격)
//
// ── 계약이 뒤집혔다 ─────────────────────────────────────────────────────────
// 이 파일은 원래 *"`?glb=` 가 없으면 기능이 스스로 꺼진다"* 를 지키고 있었다. 기본 노출로
// 바뀌면서 그 단언은 **더는 유효하지 않다** — 노브가 없으면 이제 1채가 선다.
//
// 그렇다고 검사를 지우지 않는다. 끌 수 있어야 한다는 요구는 그대로이고(스모크 대조군·
// 감독 기기 격리), 옮겨간 곳이 `?glb=0` 이다. **끄는 경로가 사라진 것이 아니라 이름이
// 바뀐 것**이므로, 단언도 그 자리로 옮긴다.
//
// ── 왜 중요한가 ─────────────────────────────────────────────────────────────
// 이 기능은 world2 의 제1원리(개수 불변식)를 **일부러 깬다.** 기본 노출이 된 지금은 그
// 비용이 상시 발생하므로, 끄는 경로가 실제로 도는지가 전보다 더 중요해졌다.

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EXT_OFF } from '../frontend/js/world-shared/glb-material.js';
// ⚠ **본체는 `world-shared/` 로 옮겼다**(2026-08-16 통합) — world2·3·5 가 한 파일을 쓴다.
// 세계별 래퍼(`world2/features/glb-city.ts`)에는 `glbCityFeature` 만 남는다.
import { glbCityFeature } from '../frontend/js/world2/features/glb-city.js';
import { gridCells, placementCells, tameMetals, makeBadge, MAT_MODES, CARRY_MAPS, syncVisibility, advanceGrow, placeGrid } from '../frontend/js/world-shared/glb-city.js';
import { FEATURES } from '../frontend/js/world2/features/index.js';
import { mountFeatures, type FeatureEnv } from '../frontend/js/world2/features/types.js';
import { PLAZA_WEST, isCentralPlaza } from '../frontend/js/world2/decide/grid.js';
import { plazaOccupied } from '../frontend/js/world2/parts/plaza.js';
import { parcelLayout } from '../frontend/js/world2/decide/parcel-layout.js';

// `create` 는 꺼짐 판정 뒤 배지·비동기 로드로 넘어가는데, 배지는 `doc?.body` 가 없으면
// null 을 돌려주고 로드는 자기 try/catch 안에서 실패한다. 그래서 빈 env 로도 부를 수 있다.
const ENV = {} as FeatureEnv;

/** URL 노브를 흉내낸다. `readNum` 이 `typeof location` 을 보므로 전역에 심으면 읽힌다 */
function withSearch(search: string, fn: () => void): void {
  const g = globalThis as unknown as { location?: unknown };
  const had = 'location' in g;
  const prev = g.location;
  g.location = { search };
  try { fn(); } finally {
    if (had) g.location = prev; else delete g.location;
  }
}

// 스텁이 새면 **뒤에 도는 테스트가 조용히 다른 세계를 본다.** 되돌리기를 강제한다.
afterEach(() => {
  const g = globalThis as unknown as { location?: unknown };
  if (g.location && typeof g.location === 'object' && 'search' in g.location) delete g.location;
});

describe('GLB 미술관은 기본으로 서고 `?glb=0` 으로 꺼진다', () => {
  it('노브가 없으면 켜진다 — 기본 노출(감독 지시 2026-08-02)', () => {
    // 테스트 환경에는 `location` 이 없다. `readNum` 이 그 경우 fallback 을 돌려주므로
    // 이것이 곧 "URL 노브 없이 부팅한 세션" 과 같은 조건이다.
    const inst = glbCityFeature.create(ENV);
    expect(inst).not.toBeNull();
    // 진단이 `want` 를 말해야 채수를 판정할 수 있다. 1 이 아니면 예산을 넘는다.
    const d = inst?.diagnostics?.() as { want: number } | undefined;
    expect(d?.want).toBe(1);
  });

  it('`?glb=0` 이면 create 가 null 이다 — 씬을 만지지 않는다', () => {
    withSearch('?glb=0', () => {
      expect(glbCityFeature.create(ENV)).toBeNull();
    });
  });

  it('기능 목록으로 조립해도 켜진다 — 목록과 실제가 갈리지 않는다', () => {
    // `mountFeatures` 는 `create` 가 null 인 기능을 걸러낸다. **실제 목록으로** 확인한다
    // — 이 파일이 `glbCityFeature` 만 따로 부르고 끝나면 "목록에 넣은 것" 과 "조립되는
    // 것" 사이가 사각으로 남는다.
    const errors: string[] = [];
    const mounted = mountFeatures(FEATURES, ENV, (name) => errors.push(name));
    expect(mounted.map((m) => m.name)).toContain('glbCity');
    // 다른 기능들은 env 가 비어 있어 조립에 실패한다(그게 정상이다 — 씬이 없다).
    // glbCity 가 그 실패 목록에 있으면 **켜진 것이 아니라 던진 것**이다.
    expect(errors).not.toContain('glbCity');
  });

  it('`?glb=0` 이면 조립 결과에서도 사라진다', () => {
    withSearch('?glb=0', () => {
      const mounted = mountFeatures(FEATURES, ENV, () => {});
      expect(mounted.map((m) => m.name)).not.toContain('glbCity');
    });
  });

  it('목록에서 한 줄을 지우는 것이 곧 제거다 — 다른 기능이 이것을 import 하지 않는다', () => {
    // 기능 규약의 핵심이다. 다른 기능이 glbCity 를 import 하면 목록에서 빼도 코드가
    // 남고, 그때부터 "지웠는데 왜 남아 있지" 가 시작된다.
    //
    // ── 검사를 import 로 좁혔다 (2026-08-02) ────────────────────────────────
    // 예전엔 파일 본문에 `glb-city` 라는 **문자열이 있기만 해도** 걸렸다. 그래서
    // `parts/plaza.ts` 가 주석에 *"미술관은 `features/glb-city.ts` 가 세운다"* 라고
    // 근거를 적자 이 검사가 FAIL 했다 — 그 주석은 그 함수가 존재하는 유일한 이유이고,
    // 지우면 다음 사람이 "이 배제는 뭐지" 를 알 길이 없다.
    //
    // **주석은 결합이 아니다.** 코드를 지웠을 때 남는 것은 낡은 주석 한 줄이지 컴파일
    // 오류가 아니다. 반대로 import 는 진짜 결합이라 목록에서 빼도 파일이 살아남는다.
    // 그래서 단언을 느슨하게 한 것이 아니라 **재는 축을 옳은 것으로 바꾼 것**이다 —
    // 아래 뮤테이션이 그 검출력을 확인한다(다른 파일에서 import 를 심으면 깨진다).
    const dir = new URL('../frontend/js/world2/', import.meta.url);
    const importers = filesImporting(dir, 'glb-city');
    // ⚠ **둘이 정상이다**(2026-08-16 통합 이후):
    //   · `features/glb-city.ts` — 얇은 래퍼. `world-shared/glb-city.js` 를 부른다
    //   · `features/index.ts`    — 기능 목록. 그 래퍼를 부른다
    // 이 둘 말고 **세 번째가 나타나면 그때가 결합**이고 이 검사가 깨진다 — 통합으로
    // 항목이 하나 늘었을 뿐 **재는 축은 그대로**다(느슨해진 것이 아니다).
    expect(importers.sort()).toEqual(['features/glb-city.ts', 'features/index.ts']);
  });
});

/** `world2/` 아래에서 주어진 모듈을 **import 하는** 파일들(저장소 상대경로) */
function filesImporting(dir: URL, moduleName: string): string[] {
  const { readdirSync, readFileSync } = require('node:fs') as typeof import('node:fs');
  const { fileURLToPath } = require('node:url') as typeof import('node:url');
  const { join, relative } = require('node:path') as typeof import('node:path');
  const rootDir = fileURLToPath(dir);
  // `from '<경로>/glb-city.js'` · `import('<경로>/glb-city.js')` 둘 다 잡는다.
  const re = new RegExp(`(from|import\\()\\s*['"][^'"]*${moduleName}\\.js['"]`);
  const out: string[] = [];
  const walk = (p: string): void => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const full = join(p, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith('.ts')) continue;
      if (re.test(readFileSync(full, 'utf8'))) {
        out.push(relative(rootDir, full).split('\\').join('/'));
      }
    }
  };
  walk(rootDir);
  return out;
}

// ── 스폰 칸 (감독 실기기 판정) ───────────────────────────────────────────────
// 감독: *"50채 해봤는데. 조이스틱이 안먹는듯."*
//
// 조이스틱은 멀쩡했다. **원점이 곧 플레이어 스폰 지점**인데 거기에 26×24m 미술관을
// 세웠으니 부팅하자마자 건물 한가운데에 갇혔고, 움직여도 사방이 같은 벽이라 입력이
// 안 먹는 것처럼 보였다. 성능 문제가 아니라 배치 결함이었다.
//
// 실기기로만 드러나는 결함을 실기기로만 확인하면 같은 왕복을 반복한다. 자리 계산을
// 순수 함수로 떼어 두었으니 여기서 잡는다.
describe('GLB 배치는 스폰 자리를 비운다', () => {
  const CELL = 32;
  /**
   * 미술관 바닥 **17.2 × 24.6m** 의 대각 반경. 이 안에 들어오면 벽 속이다.
   *
   * 예전엔 `26.3 × 24.1` 이었는데 그 숫자가 **틀렸다**(디자이너가 glTF accessor 재파싱,
   * 2026-08-02). 옛 값이 더 커서 단언은 더 엄격했고 그래서 통과했다 — 즉 이 검사가
   * 틀린 값으로도 초록이었다는 뜻이고, 그 사실 자체가 "치수를 두 곳에 적으면 벌어지는
   * 일" 의 표본이다. 참값으로 고치되, **여기가 세 번째 사본**임을 적어 둔다.
   */
  const MODEL_RADIUS = Math.hypot(17.2, 24.6) / 2;

  for (const n of [1, 10, 50, 100, 200]) {
    it(`${n}채 — 원점에 아무것도 세우지 않는다`, () => {
      const cells = placementCells(n, CELL, PLAZA_WEST);
      expect(cells).toHaveLength(n); // 비운 칸의 몫은 바깥으로 밀릴 뿐 줄지 않는다
      const nearest = Math.min(...cells.map((c) => Math.hypot(c.x, c.z)));
      expect(nearest, `최근접 ${nearest.toFixed(1)}m, 모델 반경 ${MODEL_RADIUS.toFixed(1)}m`)
        .toBeGreaterThan(MODEL_RADIUS);
    });
  }

  it('같은 자리를 두 번 쓰지 않는다 — 겹쳐 서면 측정과 눈이 어긋난다', () => {
    for (const n of [2, 10, 50]) {
      const keys = placementCells(n, CELL, PLAZA_WEST).map((c) => `${c.x},${c.z}`);
      expect(new Set(keys).size, `${n}채에서 중복 자리`).toBe(n);
    }
  });

  it('같은 입력이면 같은 배치다 — 조건 간 비교가 성립하려면 결정론이어야 한다', () => {
    expect(gridCells(50, CELL)).toEqual(gridCells(50, CELL));
    // 채수를 늘려도 앞선 자리는 그대로여야 한다. 안 그러면 10채와 50채가 다른 세상이라
    // "채수만 바꿨다"는 전제가 깨진다.
    expect(gridCells(10, CELL)).toEqual(gridCells(50, CELL).slice(0, 10));
  });

  it('첫 채는 언제나 랜드마크다 — 채수를 올렸다고 사라지면 축이 둘 흔들린다', () => {
    const lm = placementCells(1, CELL, PLAZA_WEST)[0];
    for (const n of [1, 2, 10, 50]) {
      expect(placementCells(n, CELL, PLAZA_WEST)[0], `${n}채의 첫 자리`).toEqual(lm);
    }
    // 랜드마크만 정면을 갖는다. 실험 격자는 방향이 의미 없다.
    expect(lm.ry).not.toBe(0);
    for (const c of placementCells(10, CELL, PLAZA_WEST).slice(1)) expect(c.ry).toBe(0);
  });
});

// ── 판정과 집행이 만나는 자리 (이 저장소가 반복해 데인 곳) ──────────────────
// 미술관이 서는 칸을 `glb-city` 가 정하고, 그 칸을 비우는 일은 `parts/*` 가 한다. 양쪽은
// 서로를 모른 채 각자 테스트하기 쉬운데, **"계산된 자리가 실제로 비워지는가"** 는 그
// 어느 쪽에도 안 걸린다. 여기가 그 경계다.
describe('미술관이 서는 칸은 실제로 비워진다', () => {
  const CELL = 32;

  it('랜드마크 좌표와 소품 배제 판정이 같은 칸을 가리킨다', () => {
    const lm = placementCells(1, CELL, PLAZA_WEST)[0];
    // 좌표를 다시 적지 않는다 — 배치가 쓰는 값에서 **유도**한다. 하드코딩하면 미술관을
    // 옮겨도 이 검사가 옛 칸을 보며 계속 초록이다.
    const px = Math.round(lm.x / CELL);
    const pz = Math.round(lm.z / CELL);
    expect({ px, pz }).toEqual({ px: PLAZA_WEST.px, pz: PLAZA_WEST.pz });
    expect(isCentralPlaza(px, pz)).toBe(true);
    expect(plazaOccupied(px, pz)).toBe(true);
  });

  it('그 칸의 실제 배치 결과에 나무·벤치·화분이 하나도 없다', () => {
    // **순수 판정이 아니라 조립 결과를 본다.** `plazaOccupied` 가 true 를 돌려주는 것과
    // 파츠가 그것을 실제로 소비하는 것은 다른 일이다 — 셋 중 하나가 import 를 빠뜨려도
    // 판정 테스트는 초록이다.
    const parts = parcelLayout(PLAZA_WEST.px, PLAZA_WEST.pz, 'near');
    const props = parts.filter((p) => p.kind === 'tree' || p.kind === 'bench' || p.kind === 'planter');
    expect(props.map((p) => p.kind)).toEqual([]);
  });

  it('다른 광장 칸에는 소품이 그대로 선다 — 배제가 광장 전체로 번지지 않았다', () => {
    // 이 단언이 없으면 "전부 비워버리는" 구현도 위 검사를 통과한다. 광장은 원래 벤치·
    // 화분이 **더 모이는** 자리다(`plaza.ts`) — 그 성질이 살아 있는지 함께 본다.
    let props = 0;
    for (let px = -1; px <= 1; px++) {
      for (let pz = -1; pz <= 1; pz++) {
        if (px === PLAZA_WEST.px && pz === PLAZA_WEST.pz) continue;
        for (const p of parcelLayout(px, pz, 'near')) {
          if (p.kind === 'tree' || p.kind === 'bench' || p.kind === 'planter') props++;
        }
      }
    }
    expect(props).toBeGreaterThan(0);
  });
});

// ── 금속 재질 (감독 판정: "건물이 안보이던데. 하나도") ──────────────────────
// 건물은 그려지고 있었다 — 드로우콜이 14 → 1,563 이었다. 다만 전부 새까맸다. 이 GLB 는
// 재질 17개 중 9개가 `metalness = 1.0` 인데, 금속 PBR 은 diffuse 가 0 에 수렴하고 반사만
// 남아서 반사할 환경(IBL)이 없으면 정의상 검게 렌더된다.
//
// **수치는 전부 정상이었다.** 드로우콜도 삼각형도 늘었고 `state: ready` 였다. 그래서
// 지표로는 안 잡히고 화면으로만 드러난다 — 그 화면 판정을 여기서 대신한다.
describe('금속 재질을 눅여 검게 나오는 것을 막는다', () => {
  /** three 없이 도는 최소 모형. `traverse` 계약만 흉내낸다 */
  const model = (mats: { metalness?: number }[]) => ({
    traverse(cb: (o: { isMesh?: boolean; material?: unknown }) => void) {
      for (const m of mats) cb({ isMesh: true, material: m });
    },
  });

  it('metalness 1.0 을 낮춘다 — 이것이 검정의 원인이었다', () => {
    const mats = [{ metalness: 1.0 }, { metalness: 1.0 }];
    expect(tameMetals(model(mats)).metals).toBe(2);
    for (const m of mats) expect(m.metalness).toBeLessThan(0.5);
  });

  it('의도된 중간 금속(0.6)은 남긴다 — 전부 깎으면 벽이 종이처럼 된다', () => {
    const mats = [{ metalness: 0.6 }, { metalness: 0.78 }];
    expect(tameMetals(model(mats)).metals).toBe(0);
    expect(mats[0].metalness).toBe(0.6);
    expect(mats[1].metalness).toBe(0.78);
  });

  it('같은 재질을 두 번 세지 않는다 — clone 이 재질을 참조 공유한다', () => {
    // 공유 재질을 메시마다 다시 세면 "몇 개를 고쳤나" 가 부풀고, 그 수치로 판단하게 된다.
    const shared = { metalness: 1.0 };
    const m = {
      traverse(cb: (o: { isMesh?: boolean; material?: unknown }) => void) {
        cb({ isMesh: true, material: shared });
        cb({ isMesh: true, material: shared });
      },
    };
    expect(tameMetals(m).metals).toBe(1);
  });

  it('재질 배열도 처리한다 — 멀티머티리얼 메시가 GLB 에 흔하다', () => {
    const a = { metalness: 1.0 }, b = { metalness: 1.0 };
    const m = {
      traverse(cb: (o: { isMesh?: boolean; material?: unknown }) => void) {
        cb({ isMesh: true, material: [a, b] });
      },
    };
    expect(tameMetals(m).metals).toBe(2);
  });
});

// ── 상태 표시 (감독 판정: "tamed 안보이는데") ───────────────────────────────
// 진단을 `window.__world2` 에만 두었더니 감독이 볼 수 없었다. 폰으로 보는 사람에게
// 콘솔 진단은 없는 것과 같다. 50채 로딩이 수십 초인데 화면에 표시가 없으면 **"아직
// 오는 중" 과 "실패" 가 구분되지 않고**, 그 구분이 안 되면 화면 판정 자체가 성립하지
// 않는다.
//
// 배지가 없다고 실험이 안 도는 일은 없어야 한다 — DOM 이 없는 환경에서도 조용히 넘어간다.
describe('상태 배지', () => {
  it('DOM 이 없으면 null 을 돌려준다 — 배지 때문에 실험이 죽지 않는다', () => {
    expect(makeBadge(null)).toBeNull();
    // body 가 아직 없는 문서도 마찬가지다(스크립트가 head 에서 도는 경우).
    expect(makeBadge({ body: null } as unknown as Document)).toBeNull();
  });
});

// ── 헛된 투명 (감독 실기기 판정) ─────────────────────────────────────────────
// 이 GLB 는 벽 재질 5개가 `alphaMode: BLEND` 인데 **알파는 전부 1.0** 이다. three 는 이를
// `transparent: true` 로 옮기고, 그러면 깊이 쓰기가 꺼져 그리는 순서가 정렬에 의존한다.
// **WebGL 은 관대하게 그려 주지만 WebGPU 는 그렇지 않다** — 헤드리스에서는 보이는데
// 감독 기기에서만 안 보였던 원인이 이것이다.
//
// 지표는 끝까지 정상이었다(삼각형 182만이 잡혔다). **백엔드가 갈리는 결함이라 헤드리스
// 스크린샷으로는 영영 못 잡는다** — 그래서 화면이 아니라 **재질 상태를 직접** 검사한다.
describe('헛된 투명을 되돌린다 — WebGPU 에서 벽이 사라지던 것', () => {
  const model = (mats: unknown[]) => ({
    traverse(cb: (o: { isMesh?: boolean; material?: unknown }) => void) {
      for (const m of mats) cb({ isMesh: true, material: m });
    },
  });

  it('알파 1.0 인데 transparent 인 재질을 불투명으로 되돌린다', () => {
    const mats = [{ transparent: true, opacity: 1 }, { transparent: true }];
    expect(tameMetals(model(mats)).opaque).toBe(2);
    for (const m of mats as { transparent?: boolean; depthWrite?: boolean }[]) {
      expect(m.transparent).toBe(false);
      expect(m.depthWrite).toBe(true);
    }
  });

  it('진짜 반투명(알파 < 1)은 건드리지 않는다 — 유리는 유리여야 한다', () => {
    const glass = { transparent: true, opacity: 0.4 };
    expect(tameMetals(model([glass])).opaque).toBe(0);
    expect(glass.transparent).toBe(true);
    expect(glass.opacity).toBe(0.4);
  });

  it('금속과 투명을 한 번에 처리한다 — 같은 재질이 둘 다일 수 있다', () => {
    const wall = { metalness: 1, transparent: true, opacity: 1 };
    const r = tameMetals(model([wall]));
    expect(r).toEqual({ metals: 1, opaque: 1 });
    expect(wall.metalness).toBeLessThan(0.5);
    expect(wall.transparent).toBe(false);
  });
});

// ── 재질 축 (`?glbmat=`) ──────────────────────────────────────────────────────
// GLB 파일의 재질을 고쳤는데도(metallic 9개 → 0, BLEND 5개 → OPAQUE) 감독 화면에서
// 원본 재질이 여전히 안 보였다. 금속·투명은 원인이 아니었던 것이다.
//
// 남은 후보 둘이 **서로 다른 처방을 요구한다** — 확장 값이냐, 재질 클래스냐. 한 축으로
// 뭉뚱그리면 또 헛짚는다. 네 모드가 그 둘을 가른다.
describe('재질 축 — 네 모드가 서로 다른 가설을 검증한다', () => {
  it('모드 목록이 넷이다', () => {
    expect([...MAT_MODES]).toEqual(['swap', 'std', 'noext', 'raw']);
  });

  it('기본이 noext 다 — 감독 판정으로 확정된 값', () => {
    // raw 안 보임 / noext 보임 / std 보임 / box 보임 (2026-07-29 실기기).
    // `noext` 는 재질 클래스·텍스처·노멀맵·AO·emissive 를 전부 살리고 확장 값만 끈다.
    // **가장 적게 버리는 선택지가 곧 답이었다.** 소스에서 직접 확인한다 — 기본값이
    // 조용히 바뀌면 감독이 보던 화면이 달라지고, 그 사실이 아무 데도 안 적힌다.
    // ⚠ **본체가 `world-shared/` 로 옮겨졌다**(2026-08-16 통합) — world2·3·5 가 이 파일
    // 하나를 쓰므로, 이 단언은 이제 **세 세계의 기본값을 동시에** 지킨다.
    const src = readFileSync(
      fileURLToPath(new URL('../frontend/js/world-shared/glb-city.ts', import.meta.url)),
      'utf8',
    );
    // `deps.` 는 주입 경로다(공유 모듈은 `url-knob` 을 직접 import 하지 않는다 — R2).
    expect(src).toMatch(/deps\.readEnum\('glbmat',\s*'noext',\s*MAT_MODES\)/);
  });

  it('CARRY_MAPS 에 확장 전용 속성이 없다 — 그게 std 모드의 정의다', () => {
    // `std` 는 `MeshStandardMaterial` 로 옮기는 모드다. 확장 속성을 여기 넣으면 그
    // 클래스가 모르는 필드를 대입하게 되고, 조용히 무시되면서 "옮겼다"고 착각한다.
    const extOnly = ['sheen', 'clearcoat', 'specularIntensity', 'anisotropy', 'iridescence', 'transmission', 'ior'];
    for (const k of extOnly) expect(CARRY_MAPS).not.toContain(k);
  });

  it('CARRY_MAPS 가 룩의 핵심을 담는다 — 지금 기본이 버리고 있던 것들', () => {
    // 감독이 본 "원본 룩이 아닌 화면"의 정체가 이 셋이 빠진 것이다.
    for (const k of ['normalMap', 'aoMap', 'emissiveMap']) expect(CARRY_MAPS).toContain(k);
  });

  it('specularIntensity 는 0 이 아니라 1 로 끈다', () => {
    // 0 은 반사를 아예 죽여서 "확장 없음"과 다른 상태가 된다. 그러면 noext 가 검증하려던
    // 가설(확장 값이 원인인가)이 다른 변화에 오염된다.
    expect(EXT_OFF.specularIntensity).toBe(1);
    expect(EXT_OFF.ior).toBe(1.5); // glTF 기본값
    expect(EXT_OFF.sheen).toBe(0);
    expect(EXT_OFF.clearcoat).toBe(0);
  });
});

describe('🔴 GLB 건물이 파셀과 생사를 같이한다 — 감독 지시 2026-08-19', () => {
  // ── 감독 지시 ──────────────────────────────────────────────────────────────
  // *"glb건물도 사라지게해서. 가볍게 만들자. 건물이 많아질수있으니"*
  //
  // 그전에는 이 기능이 `env.scene.add(g)` 로 **씬에 직결**돼 스트리밍과 무관하게 늘 서
  // 있었다. 그래서 두 가지가 동시에 걸렸다:
  //   ① **가볍지 않다** — 멀어져도 드로우콜과 삼각형이 그대로 나간다. 채수가 늘면 비례해
  //      커진다(감독이 «건물이 많아질수있으니» 라고 짚은 축).
  //   ② 그 벽에 건 **작품만** 파셀과 함께 사라져 «미술관은 있는데 그림만 없다» 가 된다
  //      (`G-ART2`). 건물이 함께 사라지면 이 결함은 **저절로 없어진다** — 작품과 건물이
  //      같은 파셀 규칙을 따르기 때문이다.
  //
  // ⚠ **`dispose` 가 아니라 `visible` 토글이다.** 액자가 W8-9 에서 같은 판단을 했고 근거도
  // 같다 — 지오·재질을 버리고 다시 만들면 재방문마다 `info.memory` 가 올라 개수 불변식
  // `[7]` 의 `settledOk` 를 깬다.
  //
  // ⚠ **첫 판본은 여기에 «자산이 13.5MB 라 노드에서 불가능» 이라고 적었고 거짓이었다**
  // (검수관 블로커 B1). `placeGrid` 는 three 를 **주입받으므로**(`ThreeGroupNS` 는
  // `Group`·`Box3` 둘뿐) 스텁으로 돈다 — 아래 GS-V1 블록이 그것을 실제로 한다.
  // 막고 있던 것은 자산도 브라우저도 아니라 `export` 키워드 하나였다.
  //
  // ⚠⚠ **여전히 못 잡는 것**: 실제 GLB 의 피벗·스케일, 화면상 소멸/복귀, WebGPU 실기기.

  const copy = (px: number, pz: number, visible = true) => {
    const scale = { k: 1, setScalar(v: number) { scale.k = v; } };
    return { node: { visible, scale }, px, pz, want: visible };
  };

  /**
   * 판정 → 집행 **한 프레임**. `system.update` 가 하는 것과 같은 순서다.
   *
   * ⚠ **이 헬퍼가 이번 회차에 생겼다**(감독 판정 2026-08-20 — *"자라나는 느낌이
   * 아닌데?"*). 그전에는 `syncVisibility` 하나가 `node.visible` 을 직접 뒤집어서
   * 아래 검사들이 그 함수만 불러도 됐다. 지금은 **목표(`want`)와 화면이 갈렸고**,
   * 그 사이를 시간이 채우는 것이 등장 연출이다.
   *
   * **단언을 약화시킨 것이 아니라 경로가 길어진 것이다** — 검사가 보는 것(「로드된
   * 파셀의 채가 화면에 보이는가」)은 그대로다. `copyScale` 을 `undefined` 로 주므로
   * 연출 없는 세계(world3·world5)의 경로를 타고, 그 결과는 회차 전과 **같아야 한다**.
   */
  const frame = (
    cs: ReturnType<typeof copy>[],
    loaded: ((px: number, pz: number) => boolean) | undefined,
  ) => {
    syncVisibility(cs, loaded);
    advanceGrow(cs, 1 / 60, undefined);
  };

  it('★ 로드된 파셀의 채는 켜지고, 안 된 파셀의 채는 꺼진다', () => {
    const cs = [copy(-1, 0), copy(3, 3)];
    frame(cs, (px, pz) => px === -1 && pz === 0);
    expect(cs[0]!.node.visible, '🔴 로드된 파셀인데 꺼졌다').toBe(true);
    expect(cs[1]!.node.visible, '🔴 안 로드된 파셀인데 켜져 있다 — 안 가벼워진다').toBe(false);
  });

  it('★ 다시 로드되면 돌아온다 — 영구 손실이 아니다', () => {
    const cs = [copy(-1, 0, false)];
    frame(cs, () => true);
    expect(cs[0]!.node.visible).toBe(true);
  });

  it('🔴 **변할 때만** 대입한다 — 매 프레임 쓰면 언제 바뀌었는지 못 읽는다', () => {
    const cs = [copy(-1, 0, true), copy(3, 3, true)];
    // 첫 호출: 두 번째 채만 바뀐다
    expect(syncVisibility(cs, (px) => px === -1)).toBe(1);
    // 두 번째 호출: 이미 맞춰져 있으므로 **0**
    expect(syncVisibility(cs, (px) => px === -1), '🔴 안 바뀌었는데 다시 썼다').toBe(0);
  });

  it('🔴 `parcelLoaded` 가 없으면 **아무것도 안 한다** — world3·world5 가 그 경우다', () => {
    // 그 세계들의 `FeatureEnv` 에는 이 항목이 없다(실측). 늘 보이는 것이 그쪽의 사실이고,
    // 여기서 뭔가 하면 **편집이 없는 세계의 룩을 이 회차가 조용히 바꾼다.**
    const cs = [copy(-1, 0, true), copy(3, 3, true)];
    expect(syncVisibility(cs, undefined)).toBe(0);
    // 집행까지 돌려도 화면이 그대로여야 한다 — `want` 가 `true` 로 남기 때문이다.
    advanceGrow(cs, 1 / 60, undefined);
    expect(cs.every((c) => c.node.visible), '🔴 판정 수단이 없는데 껐다').toBe(true);
  });

  it('★ 채가 하나도 없으면 0 — 로드 실패·`?glb=0` 세션에서 던지지 않는다', () => {
    expect(syncVisibility([], () => false)).toBe(0);
  });

  it('🔴 배선 — `system.update` 가 그 함수를 부르고, `wallRoot` 가 가시성을 본다', () => {
    // 정적 텍스트 축이다(같은 이유: 실제 채를 세우는 경로를 노드에서 못 돈다). 약한 것을
    // 알고 쓰지만 **0 보다는 낫다** — 이 배선이 빠지면 「가볍게」가 통째로 사라지고,
    // 그 증상은 감독 화면에서만(그것도 프레임으로만) 드러난다.
    const src = readFileSync(
      fileURLToPath(new URL('../frontend/js/world-shared/glb-city.ts', import.meta.url)),
      'utf8',
    ).replace(/\s+/g, ' ');
    // ⚠ **본문을 통째로 못 박지 않는다** — 예열 보류(B2)가 들어오며 이 단언이 한 번
    // 깨졌고, 그것이 정상이다. **축을 둘로 나눈다**: 「토글을 부르는가」와 「예열 전에
    // 보류하는가」. 각각이 다른 결함을 잡는다.
    expect(src, '🔴 프레임 훅이 토글을 안 부른다').toContain('syncVisibility(copies, env.parcelLoaded)');
    expect(src, '🔴 예열 전 보류가 사라졌다 — 꺼진 채는 예열이 아무것도 못 굽는다(B2)')
      .toContain('if (!warmed) return;');
    expect(src, '🔴 안 보이는 미술관 벽이 여전히 벽 검출 대상이다')
      .toContain('copies.some((c) => c.node.visible)');
  });

  it('🔴 **GS-V3** — 예열이 끝난 **뒤에만** 토글이 열린다 (검수관 명세, 블로커 B4)', () => {
    // ── 왜 이 검사가 따로 필요한가 ────────────────────────────────────────────
    // 바로 위 배선 검사가 `if (!warmed) return;` **가드의 존재**를 본다. 그런데 그것은
    // B2 조치의 **절반**이다 — 나머지 절반은 `warmed` 가 **언제 켜지는가**이고, 그쪽은
    // 아무도 안 보고 있었다.
    //
    // 실측(검수관 블로커 B4, 2026-08-20): `warmed = true` 를 `await warmUp(root)` **앞으로
    // 한 줄 옮기면** 예열 전 보류가 통째로 무효인데 **0 failed / 4094**. 가드를 *지우는*
    // 형태만 시험했고 *되살리는* 형태는 안 시험한 결과다.
    //
    // **배운 것**: *"결함을 고쳤으면 그 결함을 일부러 되살려 테스트가 깨지는지 본다"* 는
    // 규율에서, **되살리는 형태가 하나뿐이라고 가정하면 안 된다.** 여기서는 「지운다」와
    // 「옮긴다」 둘이었고, 잡히는 쪽만 시험했다.
    //
    // ⚠ **왜 정적 축이어도 값이 있는가**: 이 회귀는 `[7]` 개수 불변식으로만 드러나는데
    // 그것은 CI 에서 `observe` 라 **종료코드에 안 나타난다.** 0 보다 낫다는 판단이 이
    // 파일 전체의 전제와 같다.
    //
    // ⚠ **못 잡는 것**(통과로 적지 않는다): ⓐ **런타임의 실제 순서** — `warmed` 를 다른
    // 경로에서 켜거나 `await` 체인을 재배치하면 소스 순서는 그대로인 채 의미가 바뀐다
    // ⓑ 예열이 실제로 GPU 에 구웠는지(헤드리스는 WebGL swiftshader, 배포본은 WebGPU —
    // 원리적 사각) ⓒ **계단의 크기**(이 저장소는 프레임 시간을 안 잰다).
    const src = readFileSync(
      fileURLToPath(new URL('../frontend/js/world-shared/glb-city.ts', import.meta.url)),
      'utf8',
    ).replace(/\s+/g, ' ');
    const count = (t: string) => src.split(t).length - 1;

    // ⚠ **등장 횟수를 먼저 못 박는다** — 토큰이 둘 이상이 되면 `indexOf` 비교가 «어느
    // 쪽인지» 를 잃고 조용히 무의미해진다. 늘어난 순간 빨간불이 되는 것이 **의도**이고,
    // 그때는 이 검사를 갱신하라는 신호다(예: `warmUp` 호출부를 헬퍼로 감쌌다면).
    expect(count('warmed = true'), '🔴 `warmed = true` 가 1곳이 아니다 — 순서 판정이 무의미해진다').toBe(1);
    expect(count('await warmUp(root)'), '🔴 `await warmUp(root)` 가 1곳이 아니다 — 순서 판정이 무의미해진다').toBe(1);
    expect(
      src.indexOf('warmed = true') > src.indexOf('await warmUp(root)'),
      '🔴 예열보다 **먼저** 토글을 열었다 — 꺼진 채는 예열이 아무것도 못 굽고, 나중에 파셀이 올라올 때 계단이 난다(B2)',
    ).toBe(true);
  });

  it('★ `dispose` 가 토글 상태를 되돌린다 — 재진입이 예열 전에 토글하지 않게 (검수관 P3·P4)', () => {
    // 검수관이 P3 로 요청해서 넣었는데 **확인은 안 한 상태**였다(P4, 실측 0 failed / 4094).
    // 지금은 재진입 경로가 없어 무해하지만, 「요청받아 넣은 것」과 「지켜지는 것」은 다르다.
    //
    // ⚠ **등장 횟수로 잰다** — 두 토큰 다 조립부에도 있어(`copies.length = 0` 은 재진입
    // 대비, `warmed = false` 는 선언) `toContain` 은 dispose 쪽이 통째로 사라져도 통과한다.
    // 실측: 정규화 후 각각 **2회**.
    //
    // ⚠ **검수관 권고가 여기서 실측으로 뒤집혔다** — 권고 P4 는 *"문자열 단언 한 줄이면
    // 닫힌다"* 였는데, 그것은 **토큰 등장 횟수를 세어 보지 않고 쓴 문장**이었다. 검수관이
    // 재확인에서 스스로 그 사실을 확인했다. **지시하는 쪽이 안 해 보고 적으면 구현자가
    // 그대로 집행하고, 그때 사각은 아무도 안 본다.**
    //
    // ⚠ **못 잡는 것 — 위치를 안 본다**(검수관 권고 R2). 등장 «횟수» 만 보므로, dispose
    // 정리를 지우고 조립부에 같은 줄을 복제해 2회를 유지하면 **통과한다**(검수관 실측
    // M15 = **0 failed / 65**). 위치까지 보려면 `dispose()` 본문을 잘라내 그 안에서 세야
    // 하고, 그것은 이 파일이 지금 쓰는 정적 축보다 한 단계 무겁다.
    //
    // ⚠ **거짓 FAIL 이 나는 경우와 그때 할 일**(검수관 권고 R3). 선언 형태가 바뀌면
    // (`let warmed=false;` 처럼 공백만 달라져도) 횟수가 1 로 떨어져 오탐이 난다. 그때는
    // **단언을 지우지 말고** 새 형태에 맞춰 토큰을 옮기고 **왜 옮겼는지를 이 자리에
    // 적는다.** 처방을 안 적어 두면 다음 사람이 단언을 지운다 — **이번 회차에 `wallRoot`
    // 축이 사라진 경로가 정확히 그것이다**(블로커 B3).
    const src = readFileSync(
      fileURLToPath(new URL('../frontend/js/world-shared/glb-city.ts', import.meta.url)),
      'utf8',
    ).replace(/\s+/g, ' ');
    const count = (t: string) => src.split(t).length - 1;
    expect(count('copies.length = 0'), '🔴 `copies` 를 비우는 자리가 둘이 아니다 — 조립부/dispose 중 하나가 빠졌다').toBe(2);
    expect(count('warmed = false'), '🔴 `warmed = false` 가 둘이 아니다 — 선언과 dispose 중 하나가 빠졌다').toBe(2);
  });
});

describe('🔴 미술관이 땅에서 자라나며 나타난다 — 감독 판정 2026-08-20', () => {
  // ── 감독 판정 ──────────────────────────────────────────────────────────────
  // *"자라나는 느낌이 아닌데?"*
  //
  // 파셀 생사(2026-08-19)는 `visible` 토글 **하나**였다. 그래서 미술관은 한 프레임에
  // 통째로 나타났는데, 마을 파츠(`parcel-grow.ts`)와 액자(W8-10)는 0 에서 자란다 —
  // **셋 중 하나만 어긋나 있었다.**
  //
  // ⚠ **산술은 여기 없다.** `world2/decide/lod-fade.ts` 의 `scaleAdvance` 가 SSOT 이고
  // (마을 파츠·액자가 이미 그것을 쓴다) 이 공유 모듈은 그것을 **주입받는다** — world3·
  // world5 도 이 파일을 쓰므로 `world2/` 를 import 할 수 없기 때문이다(팀장 규칙 R2).
  // 그래서 여기서 재는 것은 **식이 아니라 통로**다: 주입된 값이 화면에 닿는가.
  //
  // ⚠⚠ **못 잡는 것**: 실제로 자라 보이는지(사람 눈), 프레임 시간, WebGPU 실기기,
  // `scaleAdvance` 자체의 산술(그쪽은 `tests/world2-lod-fade.test.ts` 소관이다).

  const copy = (px: number, pz: number, visible = true) => {
    const scale = { k: 1, setScalar(v: number) { scale.k = v; } };
    return { node: { visible, scale }, px, pz, want: visible };
  };

  it('🔴 주입된 배수가 **스케일에 닿는다** — 이 통로가 끊기면 연출이 통째로 죽는다', () => {
    const cs = [copy(0, 0, false)];
    cs[0]!.want = true;
    advanceGrow(cs, 1 / 60, () => 0.25);
    expect(cs[0]!.node.scale.k, '🔴 배수가 스케일에 안 실렸다').toBeCloseTo(0.25, 6);
    expect(cs[0]!.node.visible, '🔴 배수가 0 보다 큰데 안 보인다').toBe(true);
  });

  it('🔴 **배수가 화면 표시를 정한다** — 0 이면 사라지고, 0 보다 크면 보인다', () => {
    const cs = [copy(0, 0, true)];
    advanceGrow(cs, 1 / 60, () => 0);
    expect(cs[0]!.node.visible, '🔴 배수 0 인데 그려진다 — 안 가벼워진다').toBe(false);
    // ⚠ 스케일에는 **0 이 아니라 최솟값**이 들어간다. 스케일 0 행렬은 역행렬이 없고
    // 이 트리 안에서 `updateMatrixWorld` 가 돈다. 안 보이므로 눈에는 차이가 없다.
    expect(cs[0]!.node.scale.k, '🔴 스케일 0 을 그대로 넣었다').toBeGreaterThan(0);
    expect(cs[0]!.node.scale.k, '🔴 최솟값이 눈에 띄게 크다').toBeLessThan(0.01);
  });

  it('🔴 `null` 이면 **아무것도 안 만진다** — 「변할 때만 대입」을 산술 쪽이 보증한다', () => {
    const cs = [copy(0, 0, true)];
    cs[0]!.node.scale.setScalar(0.7);
    expect(advanceGrow(cs, 1 / 60, () => null), '🔴 안 바뀌었는데 바꿨다고 셌다').toBe(0);
    expect(cs[0]!.node.scale.k, '🔴 null 인데 스케일을 덮어썼다').toBeCloseTo(0.7, 6);
    expect(cs[0]!.node.visible).toBe(true);
  });

  it('🔴 채 **인덱스**와 **목표**가 그대로 전달된다 — 상태를 채별로 들 수 있어야 한다', () => {
    const seen: Array<{ id: number; up: boolean; dt: number }> = [];
    const cs = [copy(0, 0), copy(1, 1), copy(2, 2)];
    cs[0]!.want = true; cs[1]!.want = false; cs[2]!.want = true;
    advanceGrow(cs, 0.25, (id, up, dt) => { seen.push({ id, up, dt }); return null; });
    // 인덱스가 섞이면 **한 채의 성장 상태가 다른 채에 실린다** — 화면에서는 「엉뚱한
    // 건물이 자란다」로 나오고, 그 원인을 여기 말고는 볼 자리가 없다.
    expect(seen.map((x) => x.id), '🔴 채 인덱스가 어긋났다').toEqual([0, 1, 2]);
    expect(seen.map((x) => x.up), '🔴 목표가 안 넘어갔다').toEqual([true, false, true]);
    expect(seen.map((x) => x.dt), '🔴 dt 가 안 넘어갔다').toEqual([0.25, 0.25, 0.25]);
  });

  it('🔴 연출이 **없는 세계**는 회차 전과 같다 — world3·world5 의 룩을 안 건드린다', () => {
    // 그 세계들은 `copyScale` 을 안 넘긴다. 그때 목표가 곧 화면이어야 하고, 스케일은
    // **손대지 않아야** 한다(1 그대로).
    const cs = [copy(0, 0, true), copy(1, 1, true)];
    cs[1]!.want = false;
    advanceGrow(cs, 1 / 60, undefined);
    expect(cs[0]!.node.visible).toBe(true);
    expect(cs[1]!.node.visible, '🔴 목표가 꺼짐인데 안 껐다').toBe(false);
    expect(cs.map((c) => c.node.scale.k), '🔴 연출이 없는데 스케일을 건드렸다').toEqual([1, 1]);
  });

  it('🔴 배선 — world2 가 `scaleAdvance` 를 주입한다 (산술을 복제하지 않았는가)', () => {
    // 정적 텍스트 축이다. 이 배선이 빠지면 **연출이 조용히 사라지고** 증상은 감독
    // 화면에서만 드러난다 — 이번 회차가 정확히 그렇게 신고됐다.
    const src = readFileSync(
      fileURLToPath(new URL('../frontend/js/world2/features/glb-city.ts', import.meta.url)),
      'utf8',
    ).replace(/\s+/g, ' ');
    expect(src, '🔴 `copyScale` 주입이 사라졌다 — 미술관이 다시 툭 나타난다')
      .toContain('copyScale: (id, up, dt) =>');
    expect(src, '🔴 산술 SSOT(`scaleAdvance`)를 안 쓴다')
      .toContain('scaleAdvance(st, up, dt, anim)');
    // ⚠ **노브도 같은 곳에서 읽어야 한다.** 감독이 `?grow=` 로 판정할 때 건물·액자·
    // 미술관이 함께 변하지 않으면 **어긋난 화면으로 판정**하게 된다(W8-10 이 액자를
    // 이 SSOT 로 끌어온 이유가 그것이다).
    expect(src, '🔴 `?grow=` 를 미술관이 안 읽는다 — 감독 판정이 어긋난 화면 위에서 난다')
      .toContain('readParcelAnim()');
  });

  it('🔴 프레임 훅이 **판정과 집행을 둘 다** 부른다 — 한쪽만 있으면 화면이 안 움직인다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../frontend/js/world-shared/glb-city.ts', import.meta.url)),
      'utf8',
    ).replace(/\s+/g, ' ');
    expect(src, '🔴 집행이 프레임 훅에서 빠졌다 — 목표만 바뀌고 화면은 그대로다')
      .toContain('advanceGrow(copies, ctx.dt, deps.copyScale)');
  });
});

describe('🔴 GS-V1 — 배치가 토글에 넘기는 경계 (검수관 명세, 블로커 B1)', () => {
  // ── 왜 이 블록이 생겼나 ────────────────────────────────────────────────────
  // `syncVisibility` 는 뮤테이션 6종으로 촘촘한데, **그 함수를 화면에 도달시키는 경로가
  // 통째로 무검사**였다. 검수관이 전체 스위트(4,090 tests)로 실측한 결과:
  //
  //   `px` ↔ `pz` 뒤바꾸기            0 failed / 4090
  //   `out.push({…})` **통째 제거**   0 failed / 4090   ← 감독 지시가 통째로 미구현
  //   `cellSize = 1` 로               0 failed / 4090
  //
  // 두 번째가 핵이다 — `copies` 가 영구히 빈 배열이 되어 *"glb건물도 사라지게해서"* 가
  // 하나도 구현되지 않은 상태로 전부 초록이다. 이 저장소가 이름 붙인
  // **「판정/집행 분리의 구멍 — 경계를 건너는 지점은 아무도 안 본다」** 그대로다.
  //
  // ⚠ 그리고 그 구멍을 «노드에서 불가능» 이라는 **거짓 근거**로 정당화하고 있었다.
  // 실제로는 `placeGrid` 가 three 를 주입받아 아래 스텁 하나로 돈다.

  /** `ThreeGroupNS` 를 만족하는 최소 스텁. 필요한 것은 `Group` 과 `Box3` 둘뿐이다 */
  function stubThree() {
    class G {
      visible = true;
      children: unknown[] = [];
      position = { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } };
      rotation = { y: 0 };
      add(o: unknown): void { this.children.push(o); }
      updateMatrixWorld(): void { /* 스텁 — 행렬은 이 축에서 안 본다 */ }
    }
    class Box3 {
      min = { x: 0, y: 0, z: 0 };
      max = { x: 0, y: 0, z: 0 };
      setFromObject(): this { return this; }
    }
    return { Group: G, Box3 } as never;
  }

  /** `model.clone(true)` 만 하면 된다 — 붙는 쪽은 자리만 잡는다 */
  const stubModel = () => ({
    clone: () => ({ position: { set() { /* 보정 오프셋 — 이 축에서 안 본다 */ } } }),
  }) as never;

  it('★ 세운 채가 `out` 에 쌓이고, 파셀 좌표가 배치 자리와 맞는다', async () => {
    const root = { add() { /* 스텁 */ } } as never;
    const out: Parameters<typeof syncVisibility>[0][number][] = [];
    await placeGrid(stubThree(), stubModel(), root, 1, 32, PLAZA_WEST, () => { }, out as never);

    expect(out.length, '🔴 채를 세웠는데 `copies` 가 비었다 — 토글이 영영 안 돈다').toBe(1);
    // 기본 1채는 랜드마크이고 `plazaWest` 칸에 선다. 그 값이 곧 파셀 좌표여야 한다.
    expect(out[0]!.px, '🔴 파셀 x 가 배치 자리와 다르다').toBe(PLAZA_WEST.px);
    expect(out[0]!.pz, '🔴 파셀 z 가 배치 자리와 다르다').toBe(PLAZA_WEST.pz);
  });

  it('🔴 **그 좌표로 실제로 꺼진다** — 배치와 토글이 같은 파셀을 말하는가', async () => {
    // 이것이 경계를 건너는 지점이다. 위 검사는 「값이 맞다」이고, 이것은 「그 값이 실제로
    // 소비된다」다. 둘 중 하나만 있으면 CLAUDE.md 가 적어 둔 그 구멍이 그대로 남는다.
    const root = { add() { /* 스텁 */ } } as never;
    const out: Parameters<typeof syncVisibility>[0][number][] = [];
    await placeGrid(stubThree(), stubModel(), root, 1, 32, PLAZA_WEST, () => { }, out as never);

    // ⚠ **경로가 한 걸음 길어졌다**(감독 판정 2026-08-20 — 등장 연출). `syncVisibility` 는
    // 이제 목표(`want`)만 정하고 화면은 `advanceGrow` 가 옮긴다. **약화가 아니다** — 이
    // 검사가 보는 것(「배치가 넘긴 좌표로 그 채가 실제로 꺼지는가」)은 그대로이고,
    // `copyScale` 을 `undefined` 로 주므로 연출 없는 세계의 즉시 반영 경로를 탄다.
    const step = (loaded: (px: number, pz: number) => boolean) => {
      syncVisibility(out, loaded);
      advanceGrow(out, 1 / 60, undefined);
    };

    // 그 파셀만 로드 안 됐다고 하면 그 채가 꺼져야 한다.
    step((px, pz) => !(px === PLAZA_WEST.px && pz === PLAZA_WEST.pz));
    expect(out[0]!.node.visible, '🔴 파셀이 내려갔는데 건물이 그대로 서 있다').toBe(false);

    // 돌아오면 켜진다 — 영구 손실이 아니다.
    step(() => true);
    expect(out[0]!.node.visible).toBe(true);
  });

  it('★ 셀 크기가 파셀 좌표에 실제로 쓰인다 — 상수로 굳으면 엉뚱한 파셀을 본다', async () => {
    const root = { add() { /* 스텁 */ } } as never;
    const out: Parameters<typeof syncVisibility>[0][number][] = [];
    // 셀을 64 로 주면 `x = px × 64` 이므로 되짚은 `px` 는 그대로여야 한다.
    await placeGrid(stubThree(), stubModel(), root, 1, 64, PLAZA_WEST, () => { }, out as never);
    expect(out[0]!.px, '🔴 셀 크기를 안 쓰거나 상수로 굳었다').toBe(PLAZA_WEST.px);
  });
});
