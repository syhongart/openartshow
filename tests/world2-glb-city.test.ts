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
import { glbCityFeature, gridCells, tameMetals, makeBadge, MAT_MODES, CARRY_MAPS, EXT_OFF } from '../frontend/js/world2/features/glb-city.js';
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
  it('모드 목록이 넷이고 기본이 swap 이다', () => {
    // 기본을 바꾸는 것은 감독 판정 뒤다. 지금 바꾸면 "보이던 것"이 갑자기 달라진다.
    expect([...MAT_MODES]).toEqual(['swap', 'std', 'noext', 'raw']);
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
