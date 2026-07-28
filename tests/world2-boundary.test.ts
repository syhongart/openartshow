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
