// 정원 — 건축할 수 있는 땅을 눈에 보이게 하는 것.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"바닥 격자 바닥이 잘 드러나지 않아. 도로는 지금 수준으로. 건축 올릴 수 있는 땅은
//   정원으로 표시해."*
//
// 지시가 셋인데 사실 하나다. 격자가 안 드러나는 이유는 **지면과 도로의 명도 차이가
// 작아서**이고(둘 다 어두운 회청색이다), 도로는 손대지 말라 하셨으니 **땅 쪽을 밝혀야**
// 한다. 그 밝히는 방식이 "정원" 이다 — 색만 바꾸면 그냥 다른 색 바닥이지만, 잔디로
// 읽히면 *"여기는 지을 수 있는 땅"* 이라는 뜻이 함께 전달된다.
//
// ── 왜 사분면 넷인가 ────────────────────────────────────────────────────────
// 도로는 파셀 중심에서 십자로 뻗는다(`road-topology.ts`). 그러니 남는 땅은 **네 귀퉁이**
// 다. 사분면마다 판을 하나씩 깔면 도로를 피하는 판정이 필요 없다 — 셋백(7m) 밖에서
// 시작하면 어느 방향에 길이 나 있든 겹치지 않는다.
//
// 건물도 사분면에 1:1로 배정된다(`building.ts`). 그래서 정원 한 칸이 곧 "건물 한 채가
// 설 자리" 와 같고, 겹쳐도 문제가 없다 — 정원은 바닥이고 건물은 그 위에 선다. 오히려
// 건물 발치가 잔디인 편이 자연스럽다.
//
// ── 광장에는 깔지 않는다 ────────────────────────────────────────────────────
// 광장은 포장된 곳이다. 거기까지 잔디를 깔면 "건축 가능한 땅" 이라는 신호가 흐려지고,
// 무엇보다 중앙 광장은 지을 수 없는 자리다.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { ROAD_HALF } from './road-topology.js';
import { isPlaza } from './plaza.js';

/**
 * 도로와 정원 사이 틈(미터).
 *
 * **`SETBACK`(7m)이 아니라 `ROAD_HALF`(5.5m) 기준이다.** 처음 셋백으로 잡았더니 판이
 * 4.5m 정사각형이 되어 격자를 드러내기엔 너무 작았다 — 셋백은 *건물이 물러서는 선*
 * 이지 땅의 경계가 아니다. 건물과 도로 사이의 인도까지가 다 "지을 수 있는 땅" 이다.
 *
 * 도로 경계에 딱 붙이지 않는 것은 경계가 애매해지기 때문이다. 0.5m 만 띄우면 길과
 * 잔디가 맞닿은 선이 또렷하다.
 */
const KERB = 0.5;

export const garden: PartSpec = {
  kind: 'garden',
  // far 까지 그린다. **격자를 드러내는 것이 이 파츠의 목적**이라 멀리서 보일 때
  // 값어치가 가장 크다 — 가까이서는 어차피 건물과 나무가 자리를 말해 준다.
  tiers: ['near', 'mid', 'far'],
  salt: 0x7a5c3e11,
  // **흰색 근처여야 한다** — 텍스처가 이미 초록을 담고 있고 tones 는 그 위에 곱해진다.
  // 처음엔 여기에 잔디색(0x9fd48a 등)을 적었다가 "tones 는 곱셈기다" 검사에 걸렸다.
  // 옳은 지적이다. 그대로 뒀으면 초록 × 초록으로 정원이 검게 죽었을 것이다.
  //
  // 나무는 정점색이 색을 주므로 텍스처가 회색조였지만, 정원은 정점색이 없어 텍스처가
  // 색을 갖는다. 그래서 tones 는 **밝기 변주**만 맡는다 — 판마다 미세하게 달라야 잔디가
  // 한 장을 복사한 것처럼 안 보인다.
  tones: [0xffffff, 0xf0f4ea, 0xe6efe0],

  maxPerParcel: () => 4,

  place: ({ px, pz, rnd, o, halfX, halfZ }) => {
    if (isPlaza(px, pz)) return [];   // 광장은 포장 — 지을 수 없는 자리다

    // 사분면 한 칸의 크기. 도로 경계 바깥부터 파셀 가장자리 여백 안쪽까지가 전부 땅이다.
    const inner = ROAD_HALF + KERB;
    const w = Math.max(0, halfX - inner);
    const d = Math.max(0, halfZ - inner);
    if (w <= 0 || d <= 0) return [];  // 셀이 작으면 정원이 설 자리가 없다

    // 판 중심은 그 구간의 한가운데
    const cx = inner + w / 2;
    const cz = inner + d / 2;

    const out: PlacedPart[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        out.push({
          kind: 'garden',
          x: sx * cx, z: sz * cz,
          // 지면(y=0) **바로 위**. 같은 높이면 z-파이팅으로 지글거린다. 도로가 0.06 이므로
          // 그보다 낮게 둬서 길이 정원 위를 덮는다 — 둘이 겹치는 구간은 없지만, 순서가
          // 정해져 있으면 나중에 도로 폭을 넓혀도 화면이 안 깨진다.
          y: 0.03,
          ry: 0,
          sx: w, sy: 1, sz: d,
          tone: Math.floor(rnd() * 3),
        });
      }
    }
    return out;
  },

  asset: (T) => ({
    // 도로와 같은 방식 — 평면을 미리 눕혀 두면 인스턴스 회전을 Y축 하나로만 다룬다.
    geometry: new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    material: new T.MeshStandardMaterial({
      map: grassTexture(T),
      roughness: 0.95,
      metalness: 0,
    }),
    castShadow: false,
    receiveShadow: true,   // 건물·나무 그림자가 잔디에 떨어져야 자리가 읽힌다
  }),
};

/**
 * 잔디 텍스처.
 *
 * 단색 판이면 "색칠한 바닥" 이지 잔디가 아니다. 짧은 선을 촘촘히 그어 결을 만든다 —
 * 풀 한 포기를 그리는 게 아니라 **멀리서 봤을 때의 결**을 만드는 것이라, 이 정도
 * 해상도(128²)에서 선 굵기 1px 면 충분하다.
 *
 * **색은 여기서 준다.** 나무 잎은 정점색이 색을 맡아 텍스처가 회색조였지만, 정원은
 * 정점색이 없다. 그래서 초록을 텍스처에 칠하고 `tones` 는 밝기 변주만 맡는다 — 둘 다
 * 색을 가지면 곱해져서 검게 죽는다.
 */
function grassTexture(T: ThreeNS) {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  let a = 0x67a55e;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // 잔디 바탕. 색상 100° 근처의 노랑기 있는 초록 — 순수한 초록(120°)은 인공적이다.
  ctx.fillStyle = 'hsl(102, 34%, 52%)';
  ctx.fillRect(0, 0, S, S);
  // 풀결 — 짧은 선을 위쪽으로 조금 기울여 긋는다. 밝기와 색조를 함께 흔들어야
  // 한 장을 반복해 깐 티가 덜 난다.
  ctx.lineWidth = 1;
  for (let i = 0; i < 900; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const len = 2 + rnd() * 4;
    const lean = (rnd() - 0.5) * 2;
    const h = 96 + rnd() * 16;
    const l = 42 + rnd() * 22;
    ctx.strokeStyle = `hsla(${h}, 38%, ${l}%, 0.6)`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - len);
    ctx.stroke();
  }

  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  // 판마다 크기가 다르므로 반복시켜야 결의 밀도가 일정하다
  tex.wrapS = T.RepeatWrapping;
  tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}
