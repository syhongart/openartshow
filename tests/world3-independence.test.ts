// world3(포근마을)의 **격리**. 이 포크가 존재하는 이유가 곧 이 파일이 지키는 것이다.
//
// ── 감독 지시에서 생겼다 (2026-08-08) ───────────────────────────────────────
// *"지금 있는 world2를 동물의숲으로 만들어봐. … 월드3으로 하고. **파일 다 날릴 수
// 있으니. 독립적으로 해.**"*
//
// 감독이 우려한 것은 world3 를 만들다가 **이미 도는 것을 망가뜨리는 일**이다. 포크는
// 그 우려에 대한 답인데, 포크했다는 사실만으로는 아무것도 보장되지 않는다 —
// world3 파일에서 `../world2/…` 한 줄을 적는 것은 **아무 마찰 없이 되는 일**이고,
// 그 순간 격리는 조용히 죽는다. 죽어도 아무것도 빨개지지 않는 것이 핵심 문제다.
//
// 팀장 판정 2026-08-08 조건 2: *"독립성은 산문이 아니라 게이트로. … 이 저장소는
// 게이트 유효성 거짓 진술로 7일을 잃은 전력이 있다 — '무영향 100%'는 검사가 될 때만
// 참이다."*
//
// ── 왜 `world2-boundary.test.ts` 를 재사용하지 않았나 ───────────────────────
// 저 파일은 **world2 트리를 검사한다.** 여기는 world3 트리다. 두 트리는 의도적으로
// 분기했고(`frontend/js/world3/README.md`) 서로 다른 속도로 움직인다 — 한쪽 허용목록을
// 다른 쪽이 공유하면 world3 에서 파츠를 갈아엎을 때 world2 의 허가가 함께 흔들린다.
// 값 미러링 금지 조항이 막는 것은 **한 진실을 두 곳에 적는 것**이지, 두 트리가 각자
// 자기 자신을 검사하는 것이 아니다.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const FRONTEND = join(ROOT, 'frontend');
const W3 = join(FRONTEND, 'js/world3');
const W2 = join(FRONTEND, 'js/world2');

/**
 * world3 밖을 참조해도 되는 파일 — **world1 자산을 쓰는 자리를 한 곳에 모은 목록.**
 *
 * world2 는 여기에 `systems/sky.ts` 도 갖고 있었다. world3 는 하늘 팔레트를 마을 톤으로
 * 바꿔야 해서 `sky.js` 를 트리 안으로 포크했고(`world3/sky.js`), 그래서 어댑터가 아니다.
 * **그 포크가 없었으면 라이브 world1 의 하늘을 고쳐야 했다** — 감독이 막으라고 한 일이다.
 */
const ADAPTERS: Record<string, string> = {
  'avatars/chibi.ts': '아야모(치비) — buildChibi/randomChibiLook. 체인 4,319줄은 읽기 전용 공유',
};

/** 어느 월드의 소유도 아닌 것들. world1·world2 를 지워도 남는다 */
const SHARED_PREFIXES = ['vendor/', 'utils/', 'js/world-shared/'];

/** `.ts`·`.js` 소스를 모두 모은다 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|js)$/.test(name)) out.push(p);
  }
  return out;
}

/**
 * 주석을 걷어낸 소스. 이 저장소는 주석에 코드·경로를 자주 적는다 — 걷어내지 않으면
 * **설명하는 문장이 위반으로 잡힌다.** 실제로 world3 주석에는 포크 이력 때문에
 * `world2` 라는 낱말이 144곳 남아 있다(README 참고).
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
}

/**
 * 모듈 지정자를 뽑는다 — **정적·부수효과·동적 세 형태 전부.**
 *
 * 동적 형태를 보는 이유는 world2 에서 실측된 사고 때문이다: `^\s*import` 로 시작하는
 * 줄만 보다가 `await import('three/addons/…')` 를 놓쳤고 검수관 리뷰도 놓쳤다
 * (`tests/world2-boundary.test.ts:80-82`). 포크가 그 형태를 그대로 승계했으므로
 * 여기서도 같은 구멍이 열려 있다.
 */
function specifiersOf(src: string): string[] {
  const code = stripComments(src);
  const out: string[] = [];
  let m: RegExpExecArray | null;

  const fromRe = /(?:^|\n)\s*(?:import|export)(?:\s+type)?\b[\s\S]*?from\s*['"]([^'"]+)['"]/g;
  while ((m = fromRe.exec(code))) out.push(m[1]);

  const sideRe = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
  while ((m = sideRe.exec(code))) out.push(m[1]);

  const dynRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dynRe.exec(code))) out.push(m[1]);

  return out;
}

/** 상대 지정자가 가리키는 실제 위치를 `frontend/` 기준 경로로. bare 는 null */
function resolveOut(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  return relative(FRONTEND, join(fromFile, '..', spec));
}

/** world3 트리를 벗어나는가 */
function escapesW3(fromFile: string, spec: string): string | null {
  const out = resolveOut(fromFile, spec);
  if (out === null) return null;
  const abs = join(FRONTEND, out);
  return relative(W3, abs).startsWith('..') ? out : null;
}

/**
 * 진입점 파일. **트리 밖에 있지만 격리의 첫 관문이다.**
 *
 * ── ⚠️ 이것이 빠져 있었다 (검수관 블로커 B2, 2026-08-08) ────────────────────
 * 처음에는 표본이 `walk(W3)` 뿐이었다. `world3-boot.ts` 는 `frontend/js/` **직속**
 * 이라 `frontend/js/world3/` 하위를 훑는 `walk` 에 걸리지 않는다. 검수관이 `walk`
 * 로직을 재현해 실측했다:
 *
 *     walk(W3) 표본 크기: 81
 *     world3-boot.ts 가 표본에 포함되는가: false
 *     world3.html 이 표본에 포함되는가: false
 *
 * 그래서 `world3-boot.ts` 에 `import { startWorld2 } from './world2/main.js'` 한
 * 줄을 넣어도 **아래 단언이 전부 통과했다.** 역방향도 같았다 — `world2-boot.ts` 가
 * world3 를 참조해도 표본 밖이다.
 *
 * executor 의 뮤테이션 7종이 "전부 탐지" 로 나온 것이 이 구멍을 가렸다. 뮤테이션이
 * 전부 **트리 안에서** 이뤄졌기 때문이다 — 표본에 없는 파일은 뮤테이션 케이스로
 * 떠오르지도 않는다. *"테스트 통과는 검출력의 증거가 아니다"* 가 그대로 적용된다.
 *
 * **개수로 세지 말고 이름으로 못 박는다**(검수관 명세 GS-5). 개수 단언은 다음
 * 리팩터에서 또 조용히 빠진다.
 */
const W3_ENTRY = join(FRONTEND, 'js/world3-boot.ts');
const W2_ENTRY = join(FRONTEND, 'js/world2-boot.ts');
const W3_HTML = join(FRONTEND, 'world3.html');

const FILES = [...walk(W3), W3_ENTRY];
const W2_FILES = [...walk(W2), W2_ENTRY];

describe('world3 는 world2 를 한 줄도 참조하지 않는다', () => {
  it('소스를 실제로 훑었다 — 표본이 비면 아래 단언이 전부 공허해진다', () => {
    // 이 저장소가 실제로 당한 형태다: 임계값이 안 맞아 표본이 빈 배열이 되고 **빈 평균
    // 0 이 단언을 통과**했다. 표본 크기부터 못 박는다. world3 는 포크 시점에 60여 파일.
    expect(FILES.length).toBeGreaterThan(50);
  });

  it('**표본이 진입점을 포함한다** — 격리의 첫 관문이 게이트 밖이었다', () => {
    // 개수가 아니라 **이름**으로 못 박는다(검수관 GS-5). 개수 단언은 리팩터에서
    // 조용히 빠지고, 실제로 빠져 있었다 — 위 `W3_ENTRY` 주석 참고.
    expect(FILES, 'world3-boot.ts 가 표본 밖이다').toContain(W3_ENTRY);
    expect(W2_FILES, 'world2-boot.ts 가 역방향 표본 밖이다').toContain(W2_ENTRY);
    // 진입점이 실재하지 않으면 위 `toContain` 은 통과하면서 아무 파일도 안 읽는다.
    expect(existsSync(W3_ENTRY), 'world3-boot.ts 없음').toBe(true);
    expect(existsSync(W2_ENTRY), 'world2-boot.ts 없음').toBe(true);
  });

  it('HTML 이 world3 트리 밖 스크립트를 불러오지 않는다', () => {
    // 파일 참조는 JS import 만으로 새지 않는다. `world3.html` 이 `world2-boot.js` 를
    // 가리키면 트리는 완벽히 격리돼 있는데 **페이지는 world2 를 띄운다** — 그리고
    // 위 검사들은 전부 초록이다. 진입은 HTML 에서 시작하므로 여기도 본다.
    const html = readFileSync(W3_HTML, 'utf8');
    const srcs = [...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/g)].map((m) => m[1]);
    expect(srcs.length, '스크립트 태그가 하나도 없다 — 표본이 비면 아래가 공허하다')
      .toBeGreaterThan(0);
    const stray = srcs.filter((s) => !/(^|\/)world3-boot\.js$/.test(s));
    expect(stray, `world3.html 이 world3 밖 스크립트를 부른다`).toEqual([]);
  });

  it('`world2/` 로 향하는 import 가 0 이다 — 포크의 존재 이유', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
        const out = escapesW3(file, spec);
        if (out && out.startsWith('js/world2/')) offenders.push(`${relative(W3, file)} → ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('**역방향도 0 이다** — world2 가 world3 를 참조하지 않는다', () => {
    // 이쪽이 감독 우려의 정확한 형태다. world3 를 만들다 편의로 world2 에서 world3 것을
    // 끌어 쓰면, world3 를 지우거나 갈아엎는 순간 **라이브 직전인 world2 가 함께 죽는다.**
    // 포크는 한 방향만 막아서는 격리가 되지 않는다.
    const offenders: string[] = [];
    for (const file of W2_FILES) {
      for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
        if (!spec.startsWith('.')) continue;
        const out = relative(FRONTEND, join(file, '..', spec));
        if (out.startsWith('js/world3/')) offenders.push(`${relative(W2, file)} → ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('원본 `sky.js` 를 참조하지 않는다 — 하늘은 트리 안으로 포크했다', () => {
    // `js/sky.js` 는 라이브 오픈월드(world1)와 공유하는 파일이다. world3 가 그것을 잡고
    // 있으면 마을 하늘색을 바꾸는 순간 라이브가 함께 바뀐다 — 포크한 이유가 그것이다.
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
        const out = escapesW3(file, spec);
        if (out === 'js/sky.js') offenders.push(`${relative(W3, file)} → ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('포크한 하늘이 실재하고 실제로 쓰인다 — 죽은 포크는 구멍이다', () => {
    // 파일만 두고 아무도 안 쓰면 위 검사는 통과하면서 하늘은 여전히 공유본을 탄다…가
    // 아니라, 아예 하늘이 없다. 실물과 배선을 함께 못 박는다.
    expect(existsSync(join(W3, 'sky.js')), 'world3/sky.js 없음').toBe(true);
    const src = readFileSync(join(W3, 'systems/sky.ts'), 'utf8');
    expect(specifiersOf(src)).toContain('../sky.js');
  });
});

describe('world3 는 자족적이다 — world1·world2 를 지워도 산다', () => {
  it('world3 밖을 참조하는 파일은 어댑터이거나 공용 라이브러리뿐이다', () => {
    // 라이브 보호 4파일(main·player·artworks·config)도 이 검사가 함께 막는다 —
    // 개별 이름을 나열하지 않는 이유는, 보호 대상이 늘 때 여기를 고치는 것을
    // 아무도 기억하지 못하기 때문이다. **밖은 전부 막고 어댑터만 연다.**
    const offenders: string[] = [];
    for (const file of FILES) {
      const rel = relative(W3, file);
      if (rel in ADAPTERS) continue;
      for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
        const out = escapesW3(file, spec);
        if (!out) continue;
        if (SHARED_PREFIXES.some((p) => out.startsWith(p))) continue;
        offenders.push(`${rel} → ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('어댑터 목록이 실재하는 파일을 가리킨다 — 죽은 허가는 구멍이다', () => {
    for (const rel of Object.keys(ADAPTERS)) {
      expect(existsSync(join(W3, rel)), `${rel} 없음`).toBe(true);
    }
  });

  it('어댑터는 실제로 밖을 참조한다 — 안 그러면 목록에서 빼야 한다', () => {
    // 참조를 잃은 어댑터를 목록에 남겨 두면 "여기로는 마음대로 손 뻗어도 된다"는
    // 허가만 떠 있게 된다.
    const idle: string[] = [];
    for (const rel of Object.keys(ADAPTERS)) {
      const file = join(W3, rel);
      const uses = specifiersOf(readFileSync(file, 'utf8'))
        .map((s) => escapesW3(file, s))
        .filter((o): o is string => !!o && !SHARED_PREFIXES.some((p) => o.startsWith(p)));
      if (uses.length === 0) idle.push(rel);
    }
    expect(idle).toEqual([]);
  });
});

describe('포크가 승계한 계층 경계 — 룩을 갈아엎어도 여기는 안 무너진다', () => {
  const inDir = (file: string, dir: string) => relative(W3, file).startsWith(`${dir}/`);

  /** three 계열 지정자를 **위치(런타임/타입)와 함께** 뽑는다 */
  function threeImports(src: string): { spec: string; runtime: boolean }[] {
    const code = stripComments(src);
    const out: { spec: string; runtime: boolean }[] = [];
    let m: RegExpExecArray | null;

    const fromRe = /(?:^|\n)(\s*(?:import|export)(?:\s+type)?\b[\s\S]*?from\s*['"]([^'"]+)['"])/g;
    while ((m = fromRe.exec(code))) {
      out.push({ spec: m[2], runtime: !/^\s*(?:import|export)\s+type\b/.test(m[1]) });
    }
    const sideRe = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
    while ((m = sideRe.exec(code))) out.push({ spec: m[1], runtime: true });
    const dynRe = /(typeof\s+)?import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = dynRe.exec(code))) out.push({ spec: m[2], runtime: !m[1] });

    return out.filter((i) => i.spec === 'three' || i.spec.startsWith('three/'));
  }

  it('`decide/` 는 three 를 참조하지 않는다 — 런타임이든 타입이든', () => {
    const DECIDE = FILES.filter((f) => inDir(f, 'decide'));
    expect(DECIDE.length).toBeGreaterThan(15);
    const offenders: string[] = [];
    for (const file of DECIDE) {
      for (const i of threeImports(readFileSync(file, 'utf8'))) {
        offenders.push(`${relative(W3, file)} → ${i.spec}${i.runtime ? '' : ' (타입)'}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('`parts/` 는 three 를 인자로 받는다 — 런타임 import 0', () => {
    // **이 검사가 Phase 1 을 지킨다.** 마을 파츠를 새로 그리다 보면 지오메트리를 만들려고
    // `import * as THREE` 를 적고 싶어지는데, 그 한 줄이 `decide/` 순수성까지 함께
    // 무너뜨린다 — `decide/` 는 `parts/` 에서 배치 스펙을 가져오므로 그 import 를 타고
    // three 를 끌게 되고, 위 검사는 **직접 import 만 보므로 그것을 못 잡는다.**
    const PARTS = FILES.filter((f) => inDir(f, 'parts'));
    expect(PARTS.length).toBeGreaterThan(10);
    const offenders: string[] = [];
    for (const file of PARTS) {
      for (const i of threeImports(readFileSync(file, 'utf8'))) {
        if (i.runtime) offenders.push(`${relative(W3, file)} → ${i.spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
