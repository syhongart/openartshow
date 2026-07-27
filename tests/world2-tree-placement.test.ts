// 나무 배치 — 비율과 크기.
//
// ── 감독 판정에서 나왔다 ────────────────────────────────────────────────────
// *"나무가 위로 길쭉해. 포토샵으로 위로 길게 늘린 느낌. 그리고 나무 크기를 똑같이
//   할 필요는 없지."*
//
// 원인은 `sy = s × (1.2~1.8)` 이었다. 세로만 항상 더 늘리고 있었고, 코드 주석은
// *"밑동 굵기와 높이를 따로 뽑는다 — 같은 배율을 쓰면 전부 닮은꼴이 된다"* 고 그
// 처방을 정당화하고 있었다. **틀린 처방이다** — 세로만 늘리면 다양해지는 게 아니라
// 전부 늘어난다. 게다가 잎 평면까지 함께 찌그러져 나뭇잎이 세로 타원이 된다.
//
// 이 종류는 **숫자로만 잡힌다.** 화면에서는 "나무가 좀 길쭉하네" 로 보이고, 코드에서는
// 주석이 그럴듯해서 읽고 지나간다. 지오메트리 테스트도 못 잡는다 — 지오 자체는
// 멀쩡하고 인스턴스 스케일이 문제이기 때문이다.

import { describe, it, expect } from 'vitest';
import { parcelLayout } from '../frontend/js/world2/decide/parcel-layout.js';

/** 여러 파셀에서 나무만 모은다. 한 파셀은 표본이 너무 적다 */
function trees() {
  const out = [];
  for (let px = -6; px <= 6; px++) {
    for (let pz = -6; pz <= 6; pz++) {
      for (const p of parcelLayout(px, pz, 'near')) {
        if (p.kind === 'tree') out.push(p);
      }
    }
  }
  return out;
}

const T = trees();

describe('나무 배치 — 비율', () => {
  it('표본이 충분하다 — 비면 아래 단언이 한 번도 안 돈다', () => {
    expect(T.length).toBeGreaterThan(100);
  });

  it('밑동이 정사각이다 — x 와 z 가 다르면 나무가 납작해진다', () => {
    for (const p of T) expect(p.sz).toBeCloseTo(p.sx, 9);
  });

  // ── 이 검사가 감독이 잡은 결함을 막는다 ──────────────────────────────────
  it('세로로 늘어나지 않는다 — 포토샵으로 늘린 느낌이 된다', () => {
    let maxRatio = 0;
    for (const p of T) maxRatio = Math.max(maxRatio, p.sy / p.sx);
    // 실패했던 값은 1.8 이었다. 1.1 을 넘으면 눈에 띄게 늘어나 보인다.
    expect(maxRatio).toBeLessThan(1.1);
  });

  it('세로로 눌리지도 않는다 — 반대 방향도 막는다', () => {
    let minRatio = Infinity;
    for (const p of T) minRatio = Math.min(minRatio, p.sy / p.sx);
    expect(minRatio).toBeGreaterThan(0.9);
  });
});

describe('나무 배치 — 크기 (감독: "똑같이 할 필요는 없지")', () => {
  const sizes = T.map((p) => p.sx);

  it('크기가 실제로 다양하다 — 가장 큰 나무가 가장 작은 것의 두 배는 된다', () => {
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    expect(max / min).toBeGreaterThan(2);
  });

  it('한 값에 몰려 있지 않다 — 평균 근처만 나오면 다양한 게 아니다', () => {
    const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    // 평균에서 20% 넘게 떨어진 나무가 최소 4분의 1은 있어야 한다
    const far = sizes.filter((s) => Math.abs(s - avg) / avg > 0.2).length;
    expect(far / sizes.length).toBeGreaterThan(0.25);
  });

  it('회전이 자유롭다 — 90° 단위면 같은 지오가 네 모습뿐이다', () => {
    // 90° 배수가 아닌 각도가 대부분이어야 한다. 나무는 인공물이 아니다.
    const offGrid = T.filter((p) => {
      const q = p.ry / (Math.PI / 2);
      return Math.abs(q - Math.round(q)) > 0.01;
    }).length;
    expect(offGrid / T.length).toBeGreaterThan(0.9);
  });
});
