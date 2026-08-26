// world-glb/features/minimap.ts — 미니맵. 감독 지시로 world1 것을 world2 에 되살린다.
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
const R_VISIBLE = 8;

/**
 * 실제로 훑는 반경(파셀). **화면에 보이는 반경보다 넓다.**
 *
 * 지도가 회전하므로(감독 지시 2026-07-30 heading-up) 정사각형 캔버스를 돌리면 **모서리
 * 바깥이 빈다** — 45° 에서 가장 심하고, 그때 필요한 것은 한 변이 아니라 **대각선**이다.
 *
 * 대각 절반 = 변의 절반 × √2 이므로 `R_VISIBLE × √2` 를 덮으면 어느 각도에서도 구석이
 * 채워진다. 올림해서 정수 칸으로 맞춘다(칸 단위로만 그리므로).
 *
 * **유도로 적는다** — `R_VISIBLE` 을 바꾸면 따라온다. "실측에 여유를 얹은 값" 을 쓰면
 * 전제가 바뀔 때 한쪽만 남고, 이 저장소가 슬롯 예산에서 이미 그 사고를 냈다(이론 최악치
 * 21 을 밟아본 최댓값 17 + 여유로 20 이라 적어 부족을 덮었다).
 */
const R = Math.ceil(R_VISIBLE * Math.SQRT2);

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
    const cv = doc.getElementById('wg-map') as HTMLCanvasElement | null;
    if (!cv) return null;
    const g = cv.getContext('2d');
    if (!g) return null;

    const W = cv.width;
    // 칸 크기는 **보이는** 반경으로 정한다. 훑는 반경(`R`)은 회전 여백까지 넓혀 놨으므로
    // 그것으로 나누면 축척이 작아져 지도가 확 넓어진다 — 감독이 지시한 것은 회전이고
    // 축척 변경이 아니다.
    const cell = W / (R_VISIBLE * 2 + 1); // 칸 한 변(픽셀)
    let acc = 0;

    const draw = (): void => {
      const { x, z } = env.player.position;
      const { yaw } = env.player.angles;
      const cpx = Math.round(x / env.cell);
      const cpz = Math.round(z / env.cell);

      g.clearRect(0, 0, W, W);
      g.fillStyle = COLOR.bg;
      g.fillRect(0, 0, W, W);

      // ── 지도가 돈다 (감독 지시 2026-07-30) ────────────────────────────────
      // *"맵에서 사람이 돌면 화살표가 회전하는게 아니라 맵이 회전하게 하자. 네비게이션
      //   처럼."*
      //
      // 전에는 반대였다 — 북쪽을 위에 고정하고 마커만 돌렸다. 그 선택의 근거를 이 자리
      // 주석이 *"지도가 돌면 방향 감각이 오히려 흐려진다"* 로 적어뒀는데, 감독이 원하는
      // 것은 차량 내비게이션의 **heading-up**(진행방향 상단 고정)이다. 걸어가는 시점에서는
      // "내가 보는 쪽이 화면 위" 가 직관적이고, 그것이 감독 판단이다.
      //
      // **캔버스를 돌리므로 구석이 빈다.** 정사각형을 회전시키면 모서리 바깥이 그려지지
      // 않은 채 드러난다 — 그래서 그리는 범위를 대각선까지 넓혔다(`R` 유도, 아래 참고).
      // 회전은 지도 요소 **전체**를 감싼다. 마커는 이 블록 밖에서 그려 화면 위를 향해
      // 고정된다.
      g.save();
      g.translate(W / 2, W / 2);
      g.rotate(yaw);      // 시선 방향이 위로 오게 — 마커 회전(-yaw)의 반대다
      g.translate(-W / 2, -W / 2);

      // 플레이어가 파셀 안 어디에 있는지까지 반영해 지도를 밀어 준다. 이게 없으면
      // 파셀을 넘는 순간 지도가 한 칸씩 툭툭 튄다.
      const offX = ((x / env.cell) - cpx) * cell;
      const offZ = ((z / env.cell) - cpz) * cell;

      // ── 🔴 **구운 지도를 그린다** (감독 지시 2026-08-26 *"알아서 지도 만들고"*) ──
      //
      // world2 는 여기서 `mapCells(...)` 로 **절차적 파셀 규칙**을 훑어 칸마다 물·도로·
      // 광장을 칠했다. 이 세계에는 그 규칙이 없다 — GLB 한 덩어리가 세계다. 그래서
      // 부팅 때 **씬을 위에서 본 그림으로 한 번 굽고**(`systems/glb-minimap.ts`) 그
      // 이미지에서 지금 자리 주변을 오려 온다. 어떤 GLB 를 올려도 그 파일의 지도가 나온다.
      //
      // ⚠ 아직 안 왔으면(부팅 중) 바탕만 그린다 — 「없는 지도를 그린 척」하지 않는다.
      const baked = env.glbMap();
      if (baked) {
        // 미니맵이 덮는 월드 반경(m). 훑는 반경 `R` 을 쓰는 이유는 **회전 때문**이다 —
        // 정사각형을 돌리면 모서리 바깥이 드러나므로 대각선까지 오려 와야 빈틈이 없다.
        const halfM = R * env.cell;
        const mapSpan = baked.max.x - baked.min.x;
        const px = baked.canvas.width / mapSpan;   // 월드 1m 당 지도 픽셀
        // 오려 올 사각형(지도 픽셀 좌표). 플레이어를 중심에 둔다.
        const sw = halfM * 2 * px;
        const sx = (x - halfM - baked.min.x) * px;
        const sz = (z - halfM - baked.min.z) * px;
        // 캔버스 밖을 오려도 `drawImage` 는 투명으로 채운다 — 세계 가장자리에서
        // 지도가 잘리는 것이 사실이므로 굳이 막지 않는다.
        g.drawImage(baked.canvas, sx, sz, sw, sw, 0, 0, W, W);
      }


      g.restore(); // ← 지도 회전 끝. 아래는 화면에 고정된 것들이다

      // ── 내 위치 — 한가운데 고정, **회전하지 않는다** ──
      // 지도가 도는 방식(heading-up)에서 마커는 늘 위를 향한다 — 내가 보는 쪽이 화면
      // 위이므로, 마커까지 돌리면 두 번 돌아 방향이 어긋난다.
      const c0 = W / 2;
      g.save();
      g.translate(c0, c0);
      g.fillStyle = COLOR.me;
      g.beginPath();
      g.moveTo(0, -6);
      g.lineTo(4.5, 5);
      g.lineTo(0, 2.5);
      g.lineTo(-4.5, 5);
      g.closePath();
      g.fill();
      g.restore();

      // ── ⚠ **랜드마크 표시를 뺐다** (2026-08-26) ────────────────────────────
      // world2 는 여기서 `nearestLandmark(...)` 로 「가장 가까운 분수·시계탑이 어느
      // 쪽인가」를 테두리에 찍었다. 그 함수는 **절차적 파셀 규칙**(`decide/minimap.ts`)
      // 에서 답을 계산한다 — 이 세계에는 그 규칙이 없다.
      //
      // 지금 자산은 world2 를 내보낸 파일이라 **우연히 맞는다.** 그러나 world7 은
      // 사용자가 임의 GLB 를 올리고, 그때 이 표시는 **있지도 않은 분수를 가리킨다.**
      // 「우연히 맞는 것」과 「맞는 것」은 다른 일이고, 지도에서 방향을 거짓으로 가리키는
      // 것은 없는 것보다 나쁘다.
      //
      // → GLB 에서 랜드마크를 뽑는 축(큰 메시·이름 규칙 등)은 별도 회차다. 그때까지는
      //   **안 그린다.** 백로그 `G-W8K`.
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
        const baked = env.glbMap();
        return {
          // 좌표 라벨은 파셀이 아니라 **월드 미터**다 — 이 세계에 파셀이 없다.
          at: `${Math.round(x)},${Math.round(z)}`,
          // 지도가 실제로 구워졌는가. `—` 면 부팅 중이거나 굽기가 실패한 것이다.
          map: baked ? `${baked.painted}개 · ${baked.canvas.width}px` : '—',
        };
      },

      // 드로우콜 판정에 참여하지 않는다 — 씬에 아무것도 넣지 않으므로 그릴 것이 없다.
      // `drawGroupKey` 를 두지 않으면 판정 그룹에서 자동으로 빠진다.
    };
  },
};
