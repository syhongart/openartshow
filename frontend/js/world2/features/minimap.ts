// world2/features/minimap.ts — 미니맵. 감독 지시로 world1 것을 world2 에 되살린다.
//
// 감독: *"월드1에서 미니맵 보이게했는데. 그거나오게 해줘. 내위치 알게하고."*
//
// ── 3D 가 아니다 ─────────────────────────────────────────────────────────────
// 2D 캔버스에 그린다. 씬에 아무것도 넣지 않으므로 **드로우콜·재질·지오가 하나도 안 는다** —
// 개수 불변식과 무관하다. world1 도 같은 방식이었다("순수 2D 캔버스, CSP 무영향").
//
// ── 매 프레임 다시 그리지 않는다 ────────────────────────────────────────────
// 지형은 파셀 단위라 파셀을 넘지 않는 한 지도 내용이 안 변한다. 그래서 **배경은 파셀이
// 바뀔 때만** 다시 그리고, 매 프레임 하는 일은 플레이어 마커를 얹는 것뿐이다.
//
// 그마저도 60fps 로 돌릴 이유가 없어 0.1초 간격으로 제한한다. 미니맵이 프레임 예산을
// 먹으면 본말이 뒤집힌다.

import { mapCells, nearestLandmark } from '../decide/minimap.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

/**
 * 지도 반경(파셀). 8 = 17×17 칸 = **±256m**.
 *
 * 섬 반경이 240m 이므로 이 값이면 **섬 전체가 지도 한 장에 들어온다.** 감독 지시
 * *"월드2도 유한세계"* 가 지도에서 읽히려면 끝이 보여야 한다 — 7(±224m)이었을 때는
 * 어느 방향으로 가도 지도 끝까지 육지라 무한한 세계와 구분되지 않았다.
 *
 * 섬이 커지면 여기도 함께 봐야 한다. `ISLAND_R / cell` 로 유도할 수도 있지만 그러면
 * 섬이 커질 때 칸이 자동으로 작아져 길이 안 읽히게 된다 — 그때는 크기가 아니라 표현
 * (전체 지도 / 확대 지도 전환)을 다시 정해야 하므로, 손으로 정하는 편이 정직하다.
 */
const R = 8;
/** 갱신 간격(초). 지도는 정보이지 애니메이션이 아니다 */
const REDRAW_S = 0.1;

const COLOR = {
  bg: '#0d1016',
  land: 'rgba(255,255,255,0.05)',
  road: 'rgba(200,208,220,0.5)',
  // 물과 뭍의 대비가 지도에서 곧 "세계의 끝"이다. 뭍보다 뚜렷하게 칠한다.
  water: 'rgba(46,96,142,0.68)',
  shore: 'rgba(104,132,154,0.34)',
  // 광장 — 감독 지시로 강조한다. 채움 + 테두리 두 겹이라 길 색과 헷갈리지 않는다.
  plaza: 'rgba(240,200,120,0.20)',
  plazaEdge: 'rgba(240,200,120,0.55)',
  fountain: '#7fd4e8',
  clock: '#f0c869',
  me: '#ffffff',
} as const;

export const minimapFeature: Feature = {
  name: 'minimap',

  create(env: FeatureEnv): FeatureInstance | null {
    const doc = env.doc;
    if (!doc) return null;
    const cv = doc.getElementById('w2-map') as HTMLCanvasElement | null;
    if (!cv) return null;
    const g = cv.getContext('2d');
    if (!g) return null;

    const W = cv.width;
    const cell = W / (R * 2 + 1); // 칸 한 변(픽셀)
    let acc = 0;

    const draw = (): void => {
      const { x, z } = env.player.position;
      const { yaw } = env.player.angles;
      const cpx = Math.round(x / env.cell);
      const cpz = Math.round(z / env.cell);

      g.clearRect(0, 0, W, W);
      g.fillStyle = COLOR.bg;
      g.fillRect(0, 0, W, W);

      // 플레이어가 파셀 안 어디에 있는지까지 반영해 지도를 밀어 준다. 이게 없으면
      // 파셀을 넘는 순간 지도가 한 칸씩 툭툭 튄다.
      const offX = ((x / env.cell) - cpx) * cell;
      const offZ = ((z / env.cell) - cpz) * cell;

      for (const c of mapCells(cpx, cpz, R, env.cell, env.cell)) {
        const sx = (c.px - cpx + R) * cell - offX;
        const sz = (c.pz - cpz + R) * cell - offZ;

        // 바닥 — 물/뭍
        g.fillStyle = c.water === 'water' ? COLOR.water
          : c.water === 'shore' ? COLOR.shore
            : c.plaza ? COLOR.plaza : COLOR.land;
        g.fillRect(sx, sz, cell - 1, cell - 1);

        if (c.water === 'water') continue; // 물에는 길이 없다

        // 광장 테두리 — 채움만으로는 작은 화면에서 길 색과 섞인다
        if (c.plaza) {
          g.strokeStyle = COLOR.plazaEdge;
          g.lineWidth = 1;
          g.strokeRect(sx + 0.5, sz + 0.5, cell - 2, cell - 2);
        }

        // 길 — 중심에서 각 방향으로 뻗은 선. 실제 지형과 같은 십자 모양이라
        // 지도와 눈앞이 같은 그림으로 읽힌다.
        if (c.dirs.length) {
          g.strokeStyle = COLOR.road;
          g.lineWidth = Math.max(1.5, cell * 0.28);
          g.lineCap = 'butt';
          const mx = sx + cell / 2;
          const mz = sz + cell / 2;
          for (const d of c.dirs) {
            g.beginPath();
            g.moveTo(mx, mz);
            if (d === 'north') g.lineTo(mx, sz - 0.5);
            else if (d === 'south') g.lineTo(mx, sz + cell);
            else if (d === 'west') g.lineTo(sx - 0.5, mz);
            else g.lineTo(sx + cell, mz);
            g.stroke();
          }
        }

        // 랜드마크 — 광장 한가운데. **색이 아니라 형태로** 가른다. 셀이 11px 남짓이라
        // 색만으로는 작은 화면·색각 차이에서 구분이 안 된다.
        //   분수대 = 둥근 점    시계탑 = 세로로 선 탑
        if (c.landmark) {
          const mx = sx + cell / 2;
          const mz = sz + cell / 2;
          const r = Math.max(2, cell * 0.2);
          g.fillStyle = c.landmark === 'fountain' ? COLOR.fountain : COLOR.clock;
          if (c.landmark === 'fountain') {
            g.beginPath();
            g.arc(mx, mz, r, 0, Math.PI * 2);
            g.fill();
          } else {
            g.fillRect(mx - r * 0.45, mz - r, r * 0.9, r * 2);   // 탑 몸통
            g.beginPath();
            g.arc(mx, mz - r * 1.25, r * 0.5, 0, Math.PI * 2);   // 꼭대기
            g.fill();
          }
        }
      }

      // ── 내 위치 — 한가운데 고정, 시선 방향으로 회전 ──
      // 지도를 돌리지 않고(북쪽 고정) 마커만 돌린다. 지도가 돌면 방향 감각이 오히려
      // 흐려지고, 글자를 넣게 되면 읽을 수 없게 된다.
      const c0 = W / 2;
      g.save();
      g.translate(c0, c0);
      g.rotate(-yaw);
      g.fillStyle = COLOR.me;
      g.beginPath();
      g.moveTo(0, -6);
      g.lineTo(4.5, 5);
      g.lineTo(0, 2.5);
      g.lineTo(-4.5, 5);
      g.closePath();
      g.fill();
      g.restore();

      // 가장 가까운 랜드마크가 지도 밖이면 테두리에 방향만 찍는다. 화면에서 사라지는
      // 순간 잊히는 것을 막는다.
      const near = nearestLandmark(x, z, R, env.cell, env.cell);
      if (near && near.dist > R * env.cell * 0.82) {
        const rr = W / 2 - 5;
        g.fillStyle = near.kind === 'fountain' ? COLOR.fountain : COLOR.clock;
        g.beginPath();
        g.arc(c0 + Math.sin(near.bearing) * rr, c0 - Math.cos(near.bearing) * rr, 2.5, 0, Math.PI * 2);
        g.fill();
      }
    };

    draw();

    return {
      system: {
        name: 'minimap',
        update(ctx) {
          acc += ctx.dt;
          if (acc < REDRAW_S) return;
          acc = 0;
          draw();
        },
      },

      diagnostics() {
        const { x, z } = env.player.position;
        const near = nearestLandmark(x, z, R, env.cell, env.cell);
        return {
          parcel: `${Math.round(x / env.cell)},${Math.round(z / env.cell)}`,
          nearest: near ? `${near.kind} ${near.dist.toFixed(0)}m` : '—',
        };
      },

      // 드로우콜 판정에 참여하지 않는다 — 씬에 아무것도 넣지 않으므로 그릴 것이 없다.
      // `drawGroupKey` 를 두지 않으면 판정 그룹에서 자동으로 빠진다.
    };
  },
};
