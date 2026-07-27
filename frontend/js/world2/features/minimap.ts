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

/** 지도 반경(파셀). 7 = 15×15 칸 = ±224m — 렌더 반경(76.8m)의 약 3배다 */
const R = 7;
/** 갱신 간격(초). 지도는 정보이지 애니메이션이 아니다 */
const REDRAW_S = 0.1;

const COLOR = {
  bg: '#0d1016',
  land: 'rgba(255,255,255,0.045)',
  road: 'rgba(200,208,220,0.5)',
  water: 'rgba(58,104,150,0.55)',
  shore: 'rgba(96,120,140,0.30)',
  plaza: 'rgba(255,255,255,0.14)',
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

        // 랜드마크 — 광장 한가운데. 분수대와 시계탑을 색으로 가른다.
        if (c.landmark) {
          g.fillStyle = c.landmark === 'fountain' ? COLOR.fountain : COLOR.clock;
          g.beginPath();
          g.arc(sx + cell / 2, sz + cell / 2, Math.max(2, cell * 0.22), 0, Math.PI * 2);
          g.fill();
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
