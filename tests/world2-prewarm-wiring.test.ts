// 부팅 예열 배선 검사 — **경계를 건너는 지점을 본다.**
//
// `prewarmFeatures` 자체는 `world2-features.test.ts`가 계약으로 검사한다. 그런데 이
// 프로젝트가 반복해서 미끄러진 자리는 계약이 아니라 **계약이 실제로 소비되는 지점**이다:
// 값은 맞게 계산되는데 아무도 안 쓰거나, 순서가 뒤집혀 있거나, 되돌리는 코드가 빠져 있다.
// 양쪽 단위 테스트 어디에도 안 걸린다.
//
// 여기서 보는 배선은 넷이다.
//
//   ① `sky.js`가 `prewarm`을 공개 API로 내놓는가
//   ② 어댑터(`systems/sky.ts`)가 그것을 부르는가
//   ③ 기능(`features/sky.ts`)이 예열 계약으로 노출하는가
//   ④ 부팅(`main.ts`)이 **렌더 앞에서** 켜고 **`finally`에서** 되돌리는가
//
// ④가 특히 중요하다. 렌더 뒤에 켜면 아무것도 안 구워지고(예열이 조용히 no-op가 된다),
// `finally`가 없으면 예열 중 예외 하나에 날씨 레이어가 전부 보이는 하늘로 세션이 시작된다.
// 둘 다 화면이 "그럭저럭 정상"으로 보여서 눈으로는 안 잡힌다.
//
// ── 이 검사가 **못 잡는 것** ─────────────────────────────────────────────────
// `sky.js`의 `prewarm()`이 레이어를 **빠뜨리는 것**은 여기서 못 잡는다. 목록이 그 함수
// 안에 있고, 새 레이어가 늘었는지를 정적으로 알 방법이 없기 때문이다. 그건
// `scripts/smoke/measure-sky-warm.mjs`(헤드리스 실측)가 잡는다 — 예열 뒤에도 개수가
// 오르면 빠뜨린 레이어가 있다는 뜻이다. 못 잡는 것을 잡는다고 적지 않으려고 여기 남긴다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel: string) => readFileSync(
  fileURLToPath(new URL(`../frontend/js/${rel}`, import.meta.url)), 'utf8',
);

describe('부팅 예열 배선', () => {
  it('① sky.js가 prewarm을 공개 API로 내놓는다', () => {
    const src = read('sky.js');
    expect(src).toMatch(/function\s+prewarm\s*\(/);
    // 만들어만 두고 반환 객체에 안 넣으면 소비자가 닿을 수 없다.
    const ret = src.match(/return\s*\{[^}]*SKY_WEATHERS[^}]*\}/);
    expect(ret, 'createSkySystem의 공개 API 반환부를 못 찾았다').not.toBeNull();
    expect(ret![0]).toContain('prewarm');
  });

  it('② 하늘 어댑터가 엔진의 prewarm을 부른다', () => {
    expect(read('world2/systems/sky.ts')).toMatch(/this\.engine\.prewarm/);
  });

  it('③ 하늘 기능이 예열 계약으로 노출한다', () => {
    // `prewarm: () => sky.prewarm()` — 어느 한쪽만 있으면 배선이 끊긴 것이다.
    expect(read('world2/features/sky.ts')).toMatch(/prewarm:\s*\(\)\s*=>\s*sky\.prewarm\(\)/);
  });

  describe('④ 부팅이 렌더를 예열로 감싼다', () => {
    const warmup = (() => {
      const src = read('world2/main.ts');
      const i = src.indexOf('warmup:');
      expect(i, 'main.ts에서 warmup 단계를 못 찾았다').toBeGreaterThan(-1);
      // 다음 단계(`stream:`)까지가 warmup 블록이다.
      const j = src.indexOf('stream:', i);
      expect(j, 'warmup 다음 단계를 못 찾아 블록 경계를 정할 수 없다').toBeGreaterThan(i);
      return src.slice(i, j);
    })();

    it('예열을 켠다', () => {
      expect(warmup).toMatch(/prewarmFeatures\(features\)/);
    });

    it('렌더보다 **앞에서** 켠다 — 뒤에 켜면 아무것도 안 구워진다', () => {
      const on = warmup.indexOf('prewarmFeatures(');
      const render = warmup.indexOf('.render(');
      expect(on).toBeGreaterThan(-1);
      expect(render).toBeGreaterThan(-1);
      expect(on).toBeLessThan(render);
    });

    it('finally에서 되돌린다 — 예외가 나도 켜진 채로 세션에 들어가지 않는다', () => {
      const fin = warmup.match(/finally\s*\{([\s\S]*?)\}/);
      expect(fin, 'warmup에 finally 블록이 없다 — 복구가 예외 경로를 안 탄다').not.toBeNull();
      expect(fin![1]).toMatch(/undoPrewarm\(\)/);
    });
  });
});
