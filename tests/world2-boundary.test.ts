// world2 의 **경계**. world1 을 지우는 날 무엇이 따라 죽는가.
//
// ── 감독 지시에서 생겼다 ────────────────────────────────────────────────────
// *"월드원이 있는 폴더에 있는 거 그냥 끌어다 쓰지 말고… 결국에는 월드투로 갈 거니까
// 월드투에 맞게 파일 정리를 좀 잘 해놔. 나중에 그쪽을 다 날릴 거니까."*
//
// 실제로 그 직전에 `features/npc.ts` 가 `../../chibi.js` 를 직접 잡고 있었다. 편한
// 자리에서 바깥으로 손을 뻗는 것은 **아무 마찰 없이 되는 일**이라, 규율을 문서에만
// 적어 두면 반드시 다시 새어 나간다. 이 저장소가 반복해서 배운 것이 그것이다 —
// *"검사할 수 있는 것은 검사로 만든다."*
//
// ── 무엇을 지키는가 ─────────────────────────────────────────────────────────
// world2 는 자족적이어야 한다. 바깥을 참조해도 되는 것은 두 부류뿐이다:
//
//   ① **공용 라이브러리** — `vendor/`, `utils/`. three·GLTFLoader 처럼 어느 월드의
//      소유도 아닌 것들이라 world1 을 지워도 남는다.
//   ② **명시된 어댑터** — 아래 `ADAPTERS` 목록. world1 자산을 쓰되 **그 자리를 한 곳으로
//      모아 둔 파일**이다. world1 을 지우는 날 갈아 끼울 대상이 정확히 이 목록이다.
//
// 그 외의 파일이 world1 을 참조하면 실패한다. 새 어댑터가 정말 필요하면 목록에 추가하는
// 것이 답인데, **추가하려면 이 주석을 읽게 되므로** 그것 자체가 판단의 순간이 된다.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const W2 = join(ROOT, 'frontend/js/world2');

/**
 * world1 자산을 참조해도 되는 파일들 — **world1 폐기 시 갈아 끼울 목록.**
 *
 * 값이 늘어난다는 것은 폐기 작업이 그만큼 커진다는 뜻이다. 늘리기 전에 "정말 어댑터가
 * 하나 더 필요한가, 아니면 기존 어댑터를 넓히면 되는가" 를 먼저 묻는다.
 */
const ADAPTERS: Record<string, string> = {
  'avatars/chibi.ts': '아야모(치비) — buildChibi/randomChibiLook',
  'systems/sky.ts': '하늘 엔진 — createSkySystem',
};

/** 어느 월드의 소유도 아닌 것들. world1 을 지워도 남는다 */
const SHARED_PREFIXES = ['vendor/', 'utils/'];

/**
 * **빌드 혼합 허용목록** — bare `'three'`(WebGL 빌드)나 `three/addons`·`three/examples`
 * 를 참조해도 되는 파일. `three` 패키지의 `exports` 는 이 둘을 **다른 번들 파일**로
 * 내보낸다(실측 v0.171.0):
 *
 *   `'three'`        → `build/three.module.js`   ← WebGL 빌드
 *   `'three/webgpu'` → `build/three.webgpu.js`   ← WebGPU 빌드
 *
 * 즉 두 경로에서 온 `BufferGeometry` 는 **서로 다른 클래스**다. 섞으면 렌더러가 남의
 * 빌드에서 온 객체를 받는다. `parts/fountain.ts:7-9` 와 `parts/clocktower.ts:7-8` 이
 * 바로 이 이유로 `mergeGeometries`(addons) 를 포기하고 `parts/bake.ts` 를 직접 썼다.
 *
 * **값이 늘어난다는 것은 혼합 지점이 늘어난다는 뜻이다.** 늘리기 전에 "정말 addons 가
 * 필요한가, `three/webgpu`·`three/tsl` 로 되는 일이 아닌가" 를 먼저 묻는다.
 */
const BUILD_MIX: Record<string, string> = {
  // WebGL 폴백 렌더러를 만드는 것이 이 파일의 존재 이유다. 두 빌드를 아는 유일한 자리로
  // 가둬 두는 것이 설계 의도이므로 여기서의 bare import 는 정당하다.
  'adapters/renderer.ts': 'WebGL 폴백 렌더러 — 두 백엔드를 아는 어댑터',
  // `three/examples/jsm/tsl/display/BloomNode.js`. **전이 의존을 실측했다**(2026-08-02):
  // 그 파일은 `three/webgpu` 와 `three/tsl` 만 import 하고 bare `'three'` 를 끌고 오지
  // 않는다. 경로가 `examples/jsm` 일 뿐 TSL 자산이라 혼합이 아니다.
  'features/postfx.ts': 'BloomNode(TSL) — 실측상 bare three 전이 의존 0',
  // ⚠ **현상 유지이지 안전 판정이 아니다.** `import('three/addons/loaders/GLTFLoader.js')`
  // 를 동적으로 쓰는데, 그 파일은 `GLTFLoader.js:67` 에서 bare `'three'` 를 import 한다.
  // 즉 **GLB 로 들어온 지오메트리는 WebGL 빌드 객체이고 씬은 WebGPU 빌드**다.
  //
  // 헤드리스(WebGL)에서는 양쪽이 같은 빌드라 문제가 드러나지 않는다 — 그리고 이 파일
  // 주석(`:167-171`)에 *"감독 판정이 네 번 왔고 내 처방이 세 번 빗나갔다 […] 셋 다
  // 헤드리스에서는 효과가 있었는데 WebGL 에서는 애초에 문제가 없었다"* 는 이력이 남아
  // 있다. **혼합이 그 증상의 원인인지는 아직 확인하지 않았다**(태스크 #120).
  // 여기 적어 두는 것은 허가가 아니라 **혼합 지점을 세는 것**이다.
  'features/glb-city.ts': 'GLTFLoader(addons) — 혼합 확인됨·원인 미판정(#120)',
  // ⚠ 같은 성격. `vrm.ts:44` 가 `await import('three/examples/jsm/utils/SkeletonUtils.js')`
  // 를 쓰고, 그 파일은 `SkeletonUtils.js:10` 에서 bare `'three'` 를 import 한다.
  //
  // **이 항목은 게이트가 사람보다 먼저 찾았다.** 이 검사를 세우기 전 손으로 grep 할 때
  // `^\s*import` 로 시작하는 줄만 봐서 `await import(…)` 형태를 놓쳤고, 검수관 리뷰도
  // 놓쳤다. 동적 import 를 보게 만든 것이 실제로 값을 했다 — 기록으로 남긴다.
  'avatars/vrm.ts': 'SkeletonUtils.clone(addons) — 혼합 확인됨·영향 미판정',
  // ⚠ `glb-city.ts` 와 **같은 혼합이고 같은 미판정**이다(#120). 여기가 셋째 지점이다.
  // 다른 점은 이쪽이 실험이 아니라 **감독이 배치한 것을 배포하는 경로**라는 것 —
  // 즉 #120 이 판정되면 그 결과를 실제로 짊어지는 자리가 여기다.
  'features/overlay.ts': 'GLTFLoader(addons) — 혼합 확인됨·원인 미판정(#120)',
};

/** `.ts`·`.js` 소스를 모두 모은다 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|js)$/.test(name)) out.push(p);
  }
  return out;
}

/** import·export 의 모듈 지정자를 뽑는다(정적 구문만 — world2 에 동적 import 는 없다) */
function specifiersOf(src: string): string[] {
  const out: string[] = [];
  const re = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

/** world2 밖으로 나가는가 — `../` 를 타고 `world2/` 를 벗어나면 그렇다 */
function escapesWorld2(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null; // bare specifier(three 등)는 패키지다
  const abs = join(fromFile, '..', spec);
  const rel = relative(W2, abs);
  return rel.startsWith('..') ? relative(join(ROOT, 'frontend'), abs) : null;
}

const FILES = walk(W2);

describe('world2 는 자족적이다 — world1 을 지워도 산다', () => {
  it('소스를 실제로 훑었다 — 표본이 비면 아래 단언이 전부 공허해진다', () => {
    // 실제 사고에서 배운 방어다: 임계값이 안 맞아 표본이 빈 배열이 되고, **빈 평균 0이
    // 단언을 통과시킨** 적이 있다. 표본 크기부터 못 박는다.
    expect(FILES.length).toBeGreaterThan(30);
  });

  it('world2 밖을 참조하는 파일은 어댑터이거나 공용 라이브러리뿐이다', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const rel = relative(W2, file);
      if (rel in ADAPTERS) continue; // 어댑터는 참조가 존재 이유다
      for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
        const outside = escapesWorld2(file, spec);
        if (!outside) continue;
        if (SHARED_PREFIXES.some((p) => outside.startsWith(p))) continue;
        offenders.push(`${rel} → ${spec}`);
      }
    }
    // 실패 메시지가 곧 처방이 되게 한다 — "어디를 어댑터로 옮겨야 하는지" 가 보인다.
    expect(offenders).toEqual([]);
  });

  it('어댑터 목록이 실재하는 파일을 가리킨다 — 죽은 허가는 구멍이다', () => {
    // 어댑터를 지우거나 옮기고 목록만 남으면, 그 경로가 다시 생겼을 때 아무도 안 보고
    // 통과시킨다. 허가는 실물에 붙어 있어야 한다.
    for (const rel of Object.keys(ADAPTERS)) {
      expect(() => statSync(join(W2, rel)), `${rel} 없음`).not.toThrow();
    }
  });

  it('어댑터는 실제로 world1 을 참조한다 — 안 그러면 목록에서 빼야 한다', () => {
    // 어댑터가 world1 참조를 잃었다면 그건 이미 world2 소유가 된 것이다. 목록에 남겨
    // 두면 "여기로는 마음대로 손 뻗어도 된다"는 허가만 떠 있게 된다.
    const idle: string[] = [];
    for (const rel of Object.keys(ADAPTERS)) {
      const file = join(W2, rel);
      const uses = specifiersOf(readFileSync(file, 'utf8'))
        .map((s) => escapesWorld2(file, s))
        .filter((o): o is string => !!o && !SHARED_PREFIXES.some((p) => o.startsWith(p)));
      if (uses.length === 0) idle.push(rel);
    }
    expect(idle).toEqual([]);
  });
});

describe('아바타는 배럴로만 만난다', () => {
  // 치비를 쓰는 곳이 여럿이 되면 어댑터를 하나 갈아 끼워도 누락이 생긴다. 소비자가
  // `avatars/index.ts` 만 보게 해 두면 갈아 끼울 지점이 하나로 유지된다.
  it('avatars/ 바깥에서 chibi.ts·vrm.ts 를 직접 import 하지 않는다', () => {
    const direct: string[] = [];
    for (const file of FILES) {
      const rel = relative(W2, file);
      if (rel.startsWith('avatars/')) continue;
      for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
        if (/avatars\/(chibi|vrm|registry|types)\.js$/.test(spec)) direct.push(`${rel} → ${spec}`);
      }
    }
    expect(direct).toEqual([]);
  });

  it('계약(types.ts)은 아무것도 import 하지 않는다', () => {
    // 계약이 남의 것을 참조하면 그 남의 것을 지울 때 계약도 함께 무너진다.
    const src = readFileSync(join(W2, 'avatars/types.ts'), 'utf8');
    expect(specifiersOf(src)).toEqual([]);
  });
});

// ── three 경계 (검수관 조건 B1·B2, 2026-08-02) ──────────────────────────────
//
// 리얼리티 10회 개발 착수 전 조건으로 신설했다. 검수관 판정:
//
//   *"`decide/` 순수성과 `parts/` 런타임 three 0 은 지금 **성립하고 있는데 게이트가
//   하나도 없다.** 리얼리티 개발이 이 두 경계를 정면으로 압박한다."*
//
// **왜 지금까지 안 새고도 위험한가** — 이 규율은 파일 주석에만 있었다(`parts/types.ts:21-25`,
// `decide/stream.ts:1`). 주석은 새 파일을 만드는 사람에게 도달하지 않는다. 지오메트리를
// 만들다 three 가 필요해지는 순간 `import * as THREE from 'three/webgpu'` 한 줄을 적는
// 것은 **아무 마찰 없이 되는 일**이고, 그 순간 `decide/` 의 "three 없이 테스트한다" 가
// 조용히 죽는다. 죽어도 아무것도 빨개지지 않는 것이 핵심 문제다.

/**
 * 주석을 걷어낸 소스.
 *
 * 이 저장소는 주석에 코드 예시를 자주 적는다 — `parts/types.ts:23` 의 `typeof import(...)`,
 * `parts/fountain.ts:7` 의 `` `'three'`(WebGL 빌드) `` 처럼. 걷어내지 않으면 **설명하는
 * 문장이 위반으로 잡힌다.**
 *
 * **한계**: 문자열 리터럴 안의 `/*` 나 `//` 를 주석으로 오인할 수 있다(현재 world2 에
 * 그런 사례 0 — 확인함). 정확히 하려면 파서가 필요한데, 그 비용은 이 검사가 막는 것에
 * 비해 크다.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
}

/**
 * three 계열 모듈 지정자를 **위치(런타임/타입)와 함께** 뽑는다.
 *
 * 기존 `specifiersOf` 를 안 쓰고 새로 만든 이유 둘:
 *   ① 그것은 `from` 이 있는 형태만 본다 — **동적 `import('three/addons/…')` 를 놓친다.**
 *      실제로 `features/glb-city.ts:155` 가 그 형태이고, 기존 검사는 그것을 못 봤다.
 *   ② 런타임/타입 구분이 필요하다. `parts/` 는 타입 위치 three 를 **허용**하고
 *      (`ThreeNS` 주입 계약) 런타임만 금지하므로, 둘을 못 가르면 검사를 쓸 수가 없다.
 */
function threeImports(src: string): { spec: string; runtime: boolean }[] {
  const code = stripComments(src);
  const out: { spec: string; runtime: boolean }[] = [];

  // ① `import … from 'X'` · `export … from 'X'` — `import type` 은 타입 위치다
  const fromRe = /(?:^|\n)(\s*(?:import|export)(?:\s+type)?\b[\s\S]*?from\s*['"]([^'"]+)['"])/g;
  let m: RegExpExecArray | null;
  while ((m = fromRe.exec(code))) {
    out.push({ spec: m[2], runtime: !/^\s*(?:import|export)\s+type\b/.test(m[1]) });
  }

  // ② `import 'X'` — 부수효과 전용. from 이 없어 ①이 못 잡는다. 항상 런타임이다.
  const sideRe = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
  while ((m = sideRe.exec(code))) out.push({ spec: m[1], runtime: true });

  // ③ `import('X')` — 동적. `typeof import('X')` 는 **타입 위치**다(`ThreeNS` 가 이 형태).
  const dynRe = /(typeof\s+)?import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dynRe.exec(code))) out.push({ spec: m[2], runtime: !m[1] });

  return out.filter((i) => i.spec === 'three' || i.spec.startsWith('three/'));
}

const inDir = (file: string, dir: string) => relative(W2, file).startsWith(`${dir}/`);

describe('decide/ 는 순수하다 — three 없이 돈다', () => {
  const DECIDE = FILES.filter((f) => inDir(f, 'decide'));

  it('표본이 비어 있지 않다', () => {
    // 빈 배열은 아래 `toEqual([])` 를 **전부 통과시킨다.** 이 저장소가 실제로 당했다 —
    // 임계값이 안 맞아 표본이 비고, 빈 평균 0 이 단언을 통과했다.
    expect(DECIDE.length).toBeGreaterThan(15);
  });

  it('three 를 참조하지 않는다 — 런타임이든 타입이든', () => {
    // `decide/` 의 존재 이유가 "three 없이 검사할 수 있다" 이다(`decide/shadow.ts:22`).
    // 타입 위치도 막는 이유: 타입으로 들어온 것은 다음 사람이 값으로 바꾸기 쉽고,
    // 그 변경은 diff 한 줄이라 리뷰에서 눈에 안 띈다.
    const offenders: string[] = [];
    for (const file of DECIDE) {
      for (const i of threeImports(readFileSync(file, 'utf8'))) {
        offenders.push(`${relative(W2, file)} → ${i.spec}${i.runtime ? '' : ' (타입)'}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('parts/ 는 three 를 인자로 받는다 — import 하지 않는다', () => {
  const PARTS = FILES.filter((f) => inDir(f, 'parts'));

  it('표본이 비어 있지 않다', () => {
    expect(PARTS.length).toBeGreaterThan(15);
  });

  it('런타임 three import 가 0 이다 — 타입 위치(`ThreeNS`)만 허용', () => {
    // `parts/types.ts:21-25` 가 적은 계약: 지오메트리는 three 가 필요하지만 배치는 순수
    // 판정이라, 둘을 한 파일에 두려고 **three 를 인자로 받는다**(`asset(T)`).
    //
    // **이것이 `decide/` 순수성의 전제조건이다.** `decide/` 는 `parts/` 에서 배치 스펙을
    // 6곳에서 가져온다(`decide/parcel-layout.ts` 등). `parts/` 가 런타임 three 를 얻는
    // 순간 그 import 를 타고 `decide/` 도 three 를 끌게 되고, 위 검사는 **직접 import 만
    // 보므로 그것을 못 잡는다.** 두 검사는 함께여야 성립한다.
    const offenders: string[] = [];
    for (const file of PARTS) {
      for (const i of threeImports(readFileSync(file, 'utf8'))) {
        if (i.runtime) offenders.push(`${relative(W2, file)} → ${i.spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('빌드를 섞지 않는다 — WebGL 빌드와 WebGPU 빌드는 다른 파일이다', () => {
  /** 섞이면 안 되는 경로. `three/webgpu`·`three/tsl` 은 같은 빌드라 대상이 아니다 */
  const isMixed = (spec: string) =>
    spec === 'three' || spec.startsWith('three/addons') || spec.startsWith('three/examples');

  it('허용목록 밖에서 bare `three`·addons·examples 를 참조하지 않는다', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const rel = relative(W2, file);
      if (rel in BUILD_MIX) continue;
      for (const i of threeImports(readFileSync(file, 'utf8'))) {
        if (isMixed(i.spec)) offenders.push(`${rel} → ${i.spec}`);
      }
    }
    // 실패 메시지가 처방이 되게 한다: 대개 `three/webgpu` 로 바꾸면 되고, 정말 addons 가
    // 필요하면 BUILD_MIX 에 이유와 함께 올리는 것이 답이다 — 그러려면 위 주석을 읽게 된다.
    expect(offenders).toEqual([]);
  });

  it('허용목록이 실재하고 실제로 혼합한다 — 죽은 허가는 구멍이다', () => {
    // 파일이 사라지거나 혼합을 그만뒀는데 목록만 남으면, 그 경로가 다시 생겼을 때
    // 아무도 안 보고 통과시킨다. `ADAPTERS` 가 같은 방어를 하고 있고 같은 이유다.
    const idle: string[] = [];
    for (const rel of Object.keys(BUILD_MIX)) {
      const file = join(W2, rel);
      expect(() => statSync(file), `${rel} 없음`).not.toThrow();
      if (!threeImports(readFileSync(file, 'utf8')).some((i) => isMixed(i.spec))) idle.push(rel);
    }
    expect(idle).toEqual([]);
  });
});
