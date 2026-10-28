/**
 * 🔴 **스폰 밴드 거리 배율(`?spawnband=`)** — 판정과 **집행**을 함께 본다.
 *
 * 이 저장소의 상시 위험이 *"계산된 값이 실제로 소비되는가는 양쪽 테스트 어디에도 안
 * 걸린다"* 이고, 이 회차에 그 형태로 두 번 데였다(격자가 치비에게 도달하지 않았다 ·
 * 스폰이 파셀 격자를 탔다). 그래서 판정 함수만 재는 검사를 만들지 않는다 — **파셀
 * 불변은 `bandCells` 를 실제로 부르고**, 노브 도달은 `startGlbWorld` 부팅으로 본다.
 *
 * ⚠ 노브가 값을 바꾸는 것과 화면이 갈리는 것은 다른 일이다. 여기서 보는 것은 앞쪽뿐이고
 * 뒤쪽은 감독 화면이다 — 그 경계를 적어 둔다(2026-09-19 에 `?walkcell=` 네 링크가
 * 같은 화면이었고, 노브는 제대로 동작하고 있었다).
 */
import { describe, it, expect } from 'vitest';
import {
  SPAWN_BAND_CANDIDATES, SPAWN_BAND_DEFAULT, spawnBandFromKnob,
} from '../frontend/js/world-glb/decide/npc-band.js';
import { bandCells } from '../frontend/js/world-glb/decide/npc-grid.js';
import { walkCellSize } from '../frontend/js/world-glb/decide/walkable.js';
import { DEFAULT_BODY_R } from '../frontend/js/world-glb/systems/collision.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world-glb/parts/types.js';
import { SPAWN_RING, SPAWN_REACH } from '../frontend/js/world-glb/features/npc.js';
import type { WalkSource } from '../frontend/js/world-glb/decide/npc-walk.js';

/** `bandCells` 가 보는 것은 `src.cell` 하나다 — 그 한 값만 가진 최소 공급자 */
const srcOf = (cell: number) => ({ cell } as unknown as WalkSource);

describe('`?spawnband=` 판정', () => {
  it('지정이 없으면 기본값이다', () => {
    expect(spawnBandFromKnob(null)).toBe(SPAWN_BAND_DEFAULT);
  });

  it('후보는 그대로 통과한다', () => {
    for (const c of SPAWN_BAND_CANDIDATES) expect(spawnBandFromKnob(c)).toBe(c);
  });

  it('🔴 후보 밖은 **클램프가 아니라 기본값으로 접는다**', () => {
    // 클램프하면 `?spawnband=0.4` 가 0.25 로 조용히 바뀌어 감독이 「0.4 를 봤다」고
    // 믿게 된다 — 화면 판정을 쓰는 이 프로젝트에서 그 오독은 되돌릴 방법이 없다.
    expect(spawnBandFromKnob(0.4)).toBe(SPAWN_BAND_DEFAULT);
    expect(spawnBandFromKnob(0)).toBe(SPAWN_BAND_DEFAULT);
    expect(spawnBandFromKnob(99)).toBe(SPAWN_BAND_DEFAULT);
  });

  it('기본값은 후보 안에 있다 — 후보표 밖의 기본값은 노브로 되돌아갈 수 없다', () => {
    expect(SPAWN_BAND_CANDIDATES as readonly number[]).toContain(SPAWN_BAND_DEFAULT);
  });
});

describe('🔴 집행 — 파셀 세계는 **산술적으로 불변**이다 (world2·7·8·10)', () => {
  const cellX = DEFAULT_LAYOUT.cellX;

  it('어떤 후보를 골라도 파셀 링이 지금과 같다', () => {
    // 🔴 판정 함수가 아니라 **실제 소비자**(`bandCells`)를 부른다. 이 검사가 문자열이나
    // 유도식 복제를 보면 B1 을 다시 낸다 — 그때 검사가 소스만 봐서 라이브 회귀를
    // 통과시켰다(2026-08-02).
    const base = bandCells(srcOf(cellX), SPAWN_RING, cellX);
    for (const b of SPAWN_BAND_CANDIDATES) {
      expect(
        bandCells(srcOf(cellX), SPAWN_RING * b, cellX),
        `배율 ${b} 이 파셀 링을 바꿨다 — world2·7·8·10 이 함께 움직인다`,
      ).toBe(base);
      expect(bandCells(srcOf(cellX), SPAWN_REACH * b, cellX)).toBe(base);
    }
  });

  it('밴드 칸은 **정수**다 — B1 이 난 자리다', () => {
    for (const b of SPAWN_BAND_CANDIDATES) {
      const n = bandCells(srcOf(walkCellSize(DEFAULT_BODY_R)), SPAWN_RING * b, cellX);
      expect(Number.isInteger(n), `배율 ${b} 에서 밴드가 비정수 ${n} 다`).toBe(true);
      // 0 이면 플레이어가 선 칸에 사람이 놓여 눈앞에 튀어나온다
      expect(n).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('🔴 집행 — 구운 격자에서는 **실거리가 갈린다**', () => {
  const cellX = DEFAULT_LAYOUT.cellX;
  const cell = walkCellSize(DEFAULT_BODY_R);
  const metersOf = (b: number) => bandCells(srcOf(cell), SPAWN_RING * b, cellX) * cell;

  it('후보마다 서로 다른 실거리를 낸다 — 같은 값이 둘 있으면 후보가 아니다', () => {
    const m = SPAWN_BAND_CANDIDATES.map(metersOf);
    expect(new Set(m.map((v) => v.toFixed(3))).size, `실거리가 겹친다: ${m.join(' · ')}`)
      .toBe(SPAWN_BAND_CANDIDATES.length);
  });

  it('🔴 후보 간 차이가 **사람 몸보다 훨씬 크다** — 화면에서 구별될 최소 조건', () => {
    // `?walkcell=` 이 빠진 함정이 이것이다: 네 후보가 「서로 다른 좌표」였지만 차이가
    // 최대 0.77m 로 칸 한 변 수준이라 **화면에서는 같은 자리**였다(실측 2026-09-22).
    // 이 검사는 「갈린다」의 하한을 못 박는다 — 충분조건은 아니고, 판정은 감독 화면이다.
    const m = SPAWN_BAND_CANDIDATES.map(metersOf).sort((a, b) => a - b);
    for (let i = 1; i < m.length; i++) {
      expect(
        m[i] - m[i - 1],
        `후보 ${m[i - 1].toFixed(1)}m 와 ${m[i].toFixed(1)}m 가 너무 가깝다`,
      ).toBeGreaterThan(DEFAULT_BODY_R * 4);
    }
  });

  it('배율을 줄이면 가까워진다 — 방향이 뒤집히면 노브의 뜻이 반대가 된다', () => {
    const sorted = [...SPAWN_BAND_CANDIDATES].sort((a, b) => a - b);
    const m = sorted.map(metersOf);
    for (let i = 1; i < m.length; i++) expect(m[i]).toBeGreaterThan(m[i - 1]);
  });
});
