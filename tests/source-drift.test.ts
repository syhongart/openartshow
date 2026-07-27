// `.ts` 와 `.js` 가 같은 이름으로 공존하면 안 된다 — 드리프트 게이트.
//
// ── 이 파일이 있는 이유 ──────────────────────────────────────────────────────
// `vite.config.js`의 `tsJsFallback`은 `.js` 가 실재하면 **`.ts` 를 아예 읽지 않는다.**
// 그래서 같은 이름의 두 파일이 나란히 있으면 `.ts` 를 고쳐도 서빙되는 것은 `.js` 이고,
// 그 사실이 아무 데서도 드러나지 않는다. 타입체크는 통과하고, 테스트도 통과하고,
// 배포도 성공한다 — 고친 코드만 실행되지 않는다.
//
// 실제로 그렇게 됐다. 2026-07-23 `73797cf` **"fix: Re-enable Ayamo 2.0 v2 with
// MeshPhongMaterial"** 은 `chibi-shader-v2.ts` · `chibi-builder-v2.ts` 를 GLSL
// `ShaderMaterial` 에서 `MeshPhongMaterial` 로 옮긴 커밋이다. 그런데 같은 날 아침
// `a3ba06e` 가 만들어 둔 `.js` 산출물이 앞을 막고 있어서, **그 수정은 한 번도 배포된 적이
// 없다.** 넉 달 뒤 52쌍을 전수 대조하고서야 드러났다. 드러난 이유도 우연에 가깝다 —
// 아무도 밟지 않은 이유는 `USE_SKINNED_MESH_V2 = false` 였기 때문이지, 안전해서가 아니다.
//
// 그래서 "`.ts` 단독" 은 규율 문서에 적는 것으로는 부족하다. 검사할 수 있으므로 검사한다.
//
// ── 통과 조건 ────────────────────────────────────────────────────────────────
// `frontend/` 아래에 `X.ts` 와 `X.js` 가 함께 있으면 실패. 둘 중 하나만 있으면 통과.
// `.ts` 없이 `.js` 만 있는 파일은 정상이다 — 아직 TS로 옮기지 않은 모듈이 그렇다.

import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const FRONTEND = join(ROOT, 'frontend');

// three 배포본과 서드파티 사본은 우리가 쓰는 소스가 아니다 — 짝이 생길 일도 없다.
const SKIP = new Set(['vendor', 'node_modules']);

function pairs(dir: string, out: string[] = []): string[] {
  const entries = readdirSync(dir);
  const names = new Set(entries);
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (!SKIP.has(e)) pairs(p, out);
    } else if (e.endsWith('.ts') && !e.endsWith('.d.ts') && names.has(`${e.slice(0, -3)}.js`)) {
      out.push(relative(ROOT, p));
    }
  }
  return out;
}

describe('소스 드리프트 — .ts 와 .js 가 같은 이름으로 공존하지 않는다', () => {
  it('frontend/ 에 .ts/.js 쌍이 없다', () => {
    // 실패 메시지에 경로가 그대로 나오도록 배열째 비교한다 — 개수만 보면
    // "몇 개가 늘었다"는 알아도 "무엇이" 는 다시 찾아야 한다.
    expect(pairs(FRONTEND)).toEqual([]);
  });
});
