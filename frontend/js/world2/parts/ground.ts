// 지면 — 파셀 한 칸을 통째로 덮는 판.
//
// 유일하게 개수가 고정(1)이고 위치도 고정이다. 그래서 난수를 색조 하나에만 쓴다.
// 여기에 틈이 생기면 아래 허공이 보이므로 셀 크기를 **정확히** 덮는다(여백 적용 안 함).

import type { PartSpec } from './types.js';

export const ground: PartSpec = {
  kind: 'ground',
  tiers: ['near', 'mid', 'far'], // 지면이 없으면 파셀이 구멍으로 보인다
  salt: 0x9e3779b9,
  // ── 낮 팔레트로 (감독 실기기 판정) ──────────────────────────────────────────
  // 예전 값은 `0x2a3140` 계열의 짙은 남색이었다. **도로 텍스처 베이스가 `#2a2d33`
  // 이므로 명도 차이가 3% 밖에 안 났다** — 길과 땅이 사실상 같은 색이었고, 그것이
  // 감독이 말한 *"바닥 격자 바닥이 잘 드러나지 않아"* 의 정확한 원인이다.
  //
  // 정원을 넣은 것은 증상 완화였다. 초록 판이 검은 바닥에 스티커처럼 떠 있었고,
  // 실기기 화면이 그 모습이었다. 원인은 지면 자체가 **야간 팔레트**인데 하늘은
  // 낮이라는 것이었다.
  //
  // 도로는 손대지 말라는 지시대로 두고 땅만 밝힌다. 명도 40% 대의 따뜻한 회갈색이면
  // 아스팔트(17%)와 확실히 갈리면서 잔디(정원)와도 어울린다.
  tones: [0x6b6659, 0x746f61, 0x625e52],

  maxPerParcel: () => 1,

  place: ({ rnd, o }) => [{
    kind: 'ground',
    x: 0, z: 0, y: 0, ry: 0,
    sx: o.cellX, sy: 0.1, sz: o.cellZ,
    tone: Math.floor(rnd() * 3),
  }],

  // 지면만 피벗이 위쪽이다 — 판이 y=0 **아래로** 깔려야 그 위를 걷는다.
  asset: (T) => ({
    geometry: new T.BoxGeometry(1, 1, 1).translate(0, -0.5, 0),
    material: new T.MeshStandardMaterial({ roughness: 0.95, metalness: 0.05 }),
    castShadow: false,
    receiveShadow: true,
  }),
};
