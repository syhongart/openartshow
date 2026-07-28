// 도로 조각 겹침 — **z-fighting 은 좌표로 잡는다.**
//
// ── 감독 판정에서 나왔다 ────────────────────────────────────────────────────
// *"길이 겹쳐지는 곳. 사거리? 시선을 밑을 보고 미세하게 움직이면 거기는 왜 텍스처가
//   울어."*
//
// 도로 팔의 시작 공식이 `t = i × SEG − SEG/2` 였다. 첫 조각이 z ∈ [−8, 0] 인데 중심
// 조각이 [−4, 4] 이므로 **[−4, 0] 4m 가 겹쳤다.** 네 방향이 다 그러니 사거리 한복판은
// 판이 다섯 장 포개진다. 같은 높이(y=0.06)의 두 면이 겹치면 어느 쪽이 앞인지 깊이값이
// 못 정해 화면이 지글거린다 — 얕은 각도에서 특히 심하고, "밑을 보고 미세하게 움직이면"
// 이 정확히 그 조건이다.
//
// ── 왜 이 검사가 필요한가 ──────────────────────────────────────────────────
// z-fighting 은 **화면을 봐야만** 보이고, 그것도 특정 각도에서만 보인다. 헤드리스
// 스크린샷으로도 잘 안 잡힌다(정지 화면에서는 한쪽이 이겨서 멀쩡해 보인다).
// 그런데 원인은 순수한 좌표 계산이므로 **여기서 완전히 막을 수 있다.**

import { describe, it, expect } from 'vitest';
import { parcelLayout } from '../frontend/js/world2/decide/parcel-layout.js';

/** 인스턴스 회전(0 또는 90°)을 반영한 월드 축 반폭 */
function extent(p: { ry: number; sx: number; sz: number }) {
  const upright = Math.abs(Math.cos(p.ry)) > 0.5;
  return { x: (upright ? p.sx : p.sz) / 2, z: (upright ? p.sz : p.sx) / 2 };
}

describe('도로 조각 — 같은 높이에 두 장이 겹치면 안 된다', () => {
  it('어느 파셀에서도 겹치는 쌍이 없다', () => {
    const bad: string[] = [];
    let checked = 0;
    for (let px = -8; px <= 8; px++) {
      for (let pz = -8; pz <= 8; pz++) {
        const r = parcelLayout(px, pz, 'near').filter((p) => p.kind === 'road');
        checked += r.length;
        for (let i = 0; i < r.length; i++) {
          for (let j = i + 1; j < r.length; j++) {
            const a = r[i], b = r[j];
            const ea = extent(a), eb = extent(b);
            const ox = ea.x + eb.x - Math.abs(a.x - b.x);
            const oz = ea.z + eb.z - Math.abs(a.z - b.z);
            // 두 축 모두 파고들어야 실제로 면이 겹친다. 경계에서 맞닿는 것(=0)은 정상.
            if (ox > 1e-6 && oz > 1e-6) {
              bad.push(`(${px},${pz}) ${Math.min(ox, oz).toFixed(2)}m`);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(500); // 표본이 비면 아래 단언이 무의미하다
    expect(bad.slice(0, 5)).toEqual([]);  // 실패 시 어느 파셀인지 보이게
  });

  it('길이 파셀 변까지 닿는다 — 물러나면 옆 파셀과 안 이어진다', () => {
    const CELL_HALF = 16;
    let reach = 0;
    for (const p of parcelLayout(0, 0, 'near').filter((q) => q.kind === 'road')) {
      const e = extent(p);
      reach = Math.max(reach, Math.abs(p.z) + e.z, Math.abs(p.x) + e.x);
    }
    expect(reach).toBeCloseTo(CELL_HALF, 6);
  });
});
