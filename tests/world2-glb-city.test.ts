// GLB 실험이 **꺼져 있을 때 정말 아무것도 아닌가.**
//
// ── 감독 지시에서 생겼다 ────────────────────────────────────────────────────
// *"지엘비 건물 테스트로 넘어가자. 원복할수있게 해."*
//
// 원복 경로는 둘이다.
//   ① `git revert` — 실험이 **단일 커밋 · 순수 가산**(181줄 추가, 0줄 삭제)이라 한 번에
//      완전히 사라진다.
//   ② 되돌리지 않아도 안전 — `?glb=` 가 없으면 기능이 스스로 꺼진다.
//
// ①은 git 이 보장하지만 ②는 **코드가 지켜야 하는 약속**이고, 약속은 검사가 없으면
// 지켜지지 않는다. 이 파일이 ②를 검사로 만든다.
//
// ── 왜 중요한가 ─────────────────────────────────────────────────────────────
// 이 기능은 world2 의 제1원리(개수 불변식)를 **일부러 깬다.** 실험이 평상시 경로에 조금이라도
// 새면 그 순간 world2 의 성능 판정이 통째로 오염된다 — 그리고 그 오염은 "요즘 좀 무거운데"
// 같은 형태로만 드러나 원인을 찾기가 매우 어렵다.

import { describe, it, expect } from 'vitest';
import { glbCityFeature, gridCells, tameMetals } from '../frontend/js/world2/features/glb-city.js';
import { FEATURES } from '../frontend/js/world2/features/index.js';
import { mountFeatures, type FeatureEnv } from '../frontend/js/world2/features/types.js';

// `create` 가 첫 줄에서 꺼짐을 판정하고 나가므로 env 를 만질 일이 없다. 진짜 env 를
// 조립하려면 three 씬이 필요한데, 그것을 요구하는 순간 이 검사가 무거워져 안 돌게 된다.
const ENV = {} as FeatureEnv;

describe('GLB 실험은 꺼져 있을 때 존재하지 않는다', () => {
  it('`?glb=` 가 없으면 create 가 null 이다 — 씬을 만지지 않는다', () => {
    // 테스트 환경에는 `location` 이 없다. `readNum` 이 그 경우 fallback(0)을 돌려주므로
    // 이것이 곧 "URL 노브 없이 부팅한 세션" 과 같은 조건이다.
    expect(glbCityFeature.create(ENV)).toBeNull();
  });

  it('기능 목록에 들어 있어도 조립 결과에 안 나타난다', () => {
    // `mountFeatures` 는 `create` 가 null 인 기능을 걸러낸다. 그 계약이 유지되는지를
    // **실제 목록으로** 확인한다 — 이 파일이 `glbCityFeature` 만 따로 부르고 끝나면
    // "목록에 넣은 것" 과 "조립되는 것" 사이가 사각으로 남는다.
    const errors: string[] = [];
    const mounted = mountFeatures(FEATURES, ENV, (name) => errors.push(name));
    expect(mounted.map((m) => m.name)).not.toContain('glbCity');

    // 다른 기능들은 env 가 비어 있어 조립에 실패한다(그게 정상이다 — 씬이 없다).
    // 그 실패 목록에 glbCity 가 있으면 안 된다. **던져서 빠진 것과 스스로 꺼진 것은
    // 다르다** — 전자는 언젠가 env 가 갖춰지면 켜지고, 후자만 진짜 꺼짐이다.
    expect(errors).not.toContain('glbCity');
  });

  it('목록에서 한 줄을 지우는 것이 곧 제거다 — 다른 기능이 이것을 참조하지 않는다', () => {
    // 기능 규약의 핵심이다. 다른 기능이 glbCity 를 import 하면 목록에서 빼도 코드가
    // 남고, 그때부터 "지웠는데 왜 남아 있지" 가 시작된다.
    const dir = new URL('../frontend/js/world2/', import.meta.url);
    const referrers = filesReferencing(dir, 'glb-city');
    // 자기 자신과 선언 목록만 알아야 한다.
    expect(referrers.sort()).toEqual(['features/glb-city.ts', 'features/index.ts']);
  });
});

/** `world2/` 아래에서 주어진 이름을 언급하는 파일들(저장소 상대경로) */
function filesReferencing(dir: URL, needle: string): string[] {
  const { readdirSync, readFileSync } = require('node:fs') as typeof import('node:fs');
  const { fileURLToPath } = require('node:url') as typeof import('node:url');
  const { join, relative } = require('node:path') as typeof import('node:path');
  const rootDir = fileURLToPath(dir);
  const out: string[] = [];
  const walk = (p: string): void => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const full = join(p, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith('.ts')) continue;
      if (readFileSync(full, 'utf8').includes(needle)) {
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
  /** 미술관 바닥 26.3 × 24.1m 의 대각 반경. 이 안에 들어오면 벽 속이다 */
  const MODEL_RADIUS = Math.hypot(26.3, 24.1) / 2;

  for (const n of [1, 10, 50, 100, 200]) {
    it(`${n}채 — 원점에 아무것도 세우지 않는다`, () => {
      const cells = gridCells(n, CELL);
      expect(cells).toHaveLength(n); // 비운 칸의 몫은 바깥으로 밀릴 뿐 줄지 않는다
      const nearest = Math.min(...cells.map((c) => c.d));
      expect(nearest, `최근접 ${nearest.toFixed(1)}m, 모델 반경 ${MODEL_RADIUS.toFixed(1)}m`)
        .toBeGreaterThan(MODEL_RADIUS);
    });
  }

  it('같은 입력이면 같은 배치다 — 조건 간 비교가 성립하려면 결정론이어야 한다', () => {
    expect(gridCells(50, CELL)).toEqual(gridCells(50, CELL));
    // 채수를 늘려도 앞선 자리는 그대로여야 한다. 안 그러면 10채와 50채가 다른 세상이라
    // "채수만 바꿨다"는 전제가 깨진다.
    expect(gridCells(10, CELL)).toEqual(gridCells(50, CELL).slice(0, 10));
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
    expect(tameMetals(model(mats))).toBe(2);
    for (const m of mats) expect(m.metalness).toBeLessThan(0.5);
  });

  it('의도된 중간 금속(0.6)은 남긴다 — 전부 깎으면 벽이 종이처럼 된다', () => {
    const mats = [{ metalness: 0.6 }, { metalness: 0.78 }];
    expect(tameMetals(model(mats))).toBe(0);
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
    expect(tameMetals(m)).toBe(1);
  });

  it('재질 배열도 처리한다 — 멀티머티리얼 메시가 GLB 에 흔하다', () => {
    const a = { metalness: 1.0 }, b = { metalness: 1.0 };
    const m = {
      traverse(cb: (o: { isMesh?: boolean; material?: unknown }) => void) {
        cb({ isMesh: true, material: [a, b] });
      },
    };
    expect(tameMetals(m)).toBe(2);
  });
});
