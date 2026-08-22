// 나뭇잎 밝기가 **잔디에서 유도되는가**. 값이 아니라 형태를 지킨다.
//
// ── 왜 이 검사가 생겼나 (감독 지시 2026-08-21) ──────────────────────────────
// 감독: *"나뭇잎 밝기가 어두운데. 초록이 어두운 초록이야."* 실측하니 잎 두 톤의 평균
// 휘도(0.419)가 같은 화면의 잔디 중간 톤(0.611)보다 확연히 낮았다 — 한 화면의 두 초록이
// 다른 밝기대에 있었다.
//
// 고친 방식은 «밝은 값을 적기» 가 아니라 «잔디에서 유도하기» 다. 그래야 잔디를 만질 때
// 나무가 저절로 따라오고 `GRASS_TONES` 를 두 곳에 적지 않는다. **그 유도가 나중에 상수로
// 굳는 것을 막는 것이 이 파일의 일이다** — 이 회차에서 `MAX_LEGS`·`equirectUv` 가 정확히
// 그 형태로 뚫렸고, 값 비교만으로는 «하드코딩 + 값 우연일치» 를 못 잡는다.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GRASS_TONES } from '../frontend/js/world2/decide/grass.js';

const lum = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const src = (): string => fs.readFileSync(
  path.join(process.cwd(), 'frontend/js/world2/parts/tree.ts'), 'utf8',
);
/** 주석을 걷어낸 소스 — 위조 주석으로 형태 검사를 우회하지 못하게(검수관 실증 2026-08-20) */
const code = (): string => src()
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '');

describe('나뭇잎 밝기', () => {
  it('★★ 잔디에서 유도한다 — 값을 손으로 적으면 깨진다', () => {
    const c = code();
    expect(c, '잎 색이 `lift(...)` 를 안 거친다 — 배율이 사라졌다')
      .toMatch(/constLEAF_A:[^=]*=lift\(/);
    expect(c, 'LEAF_B 도 같은 배율을 거쳐야 한다').toMatch(/constLEAF_B:[^=]*=lift\(/);
    expect(c, '배율이 GRASS_TONES 에서 유도되지 않는다 — 잔디를 밝혀도 나무가 안 따라온다')
      .toContain('GRASS_TONES[1]');
    // `GRASS_TONES` 의 값을 이 파일에 다시 적는 것을 막는다(값 미러링).
    for (const t of GRASS_TONES) {
      expect(c, `GRASS_TONES 값 0x${t.toString(16)} 이 tree.ts 에 직접 적혀 있다`)
        .not.toContain(t.toString(16));
    }
  });

  it('★★ 두 톤의 **평균** 휘도가 잔디 중간 톤과 같다 — 각각 맞추면 수관 명암이 죽는다', async () => {
    const { LEAF_TONES_FOR_TEST } = await import('../frontend/js/world2/parts/tree.js');
    const [a, b] = LEAF_TONES_FOR_TEST;
    const g = GRASS_TONES[1];
    const grass = lum(((g >> 16) & 0xff) / 255, ((g >> 8) & 0xff) / 255, (g & 0xff) / 255);
    expect((lum(...a) + lum(...b)) / 2, '평균 휘도가 잔디와 어긋난다').toBeCloseTo(grass, 5);
    // 대비가 남아 있어야 «단색 덩어리» 가 안 된다 — 원래 주석이 지키던 것이다.
    expect(lum(...a), 'A 가 B 보다 밝지 않다 — 수관 명암이 사라졌다').toBeGreaterThan(lum(...b));
  });

  it('채널이 포화하지 않는다 — 잘리면 색이 틀어진다', async () => {
    const { LEAF_TONES_FOR_TEST } = await import('../frontend/js/world2/parts/tree.js');
    for (const c of LEAF_TONES_FOR_TEST) {
      for (const v of c) expect(v, `채널이 1 에 닿았다(${c.join(', ')})`).toBeLessThan(1);
    }
  });
});
