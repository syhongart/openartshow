// 가로등 — 밤의 거리감을 만드는 것.
//
// ⚠️ 현재는 **플레이스홀더**다. 기둥(원기둥) 하나뿐이고 빛나는 헤드가 없다. world2 는
// 야간이 기본이라 가로등이 룩에 미치는 영향이 큰데, 지금은 어두운 막대기다. 디자이너
// 권고는 기둥 + emissive 헤드 + 방사형 그라디언트 글로우 스프라이트 3종이다(단색 균일
// 알파로 글로우를 만들면 각진 사각형 아티팩트가 보인다 — 캔버스 그라디언트가 필요하다).
//
// 크기 편차를 두지 않는다. 가로등이 제각각이면 자연물이 아니라 인공물이라 눈에 띈다.

import type { PartSpec } from './types.js';

export const lamp: PartSpec = {
  kind: 'lamp',
  tiers: ['near'], // 가까이서만. 이 한 줄이 슬롯 예산을 far 의 1/3로 줄인다
  salt: 0x94d049bb,
  tones: [0xc9b47a],

  maxPerParcel: (o) => o.maxLamps,

  place: ({ rnd, o, halfX, halfZ }) => {
    const n = Math.floor(rnd() * (o.maxLamps + 1));
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = (rnd() * 2 - 1) * halfX;
      const z = (rnd() * 2 - 1) * halfZ;
      const ry = Math.floor(rnd() * 4) * (Math.PI / 2);
      out.push({ kind: 'lamp', x, z, y: 0, ry, sx: 1, sy: 1, sz: 1, tone: 0 });
    }
    return out;
  },

  // 자체발광을 살짝 줘서 밤에도 형태가 읽히게 한다. 실제 광원은 아니다 —
  // 조명 개수는 상수여야 하므로(개수 불변식) 가로등마다 라이트를 달 수 없다.
  asset: (T) => ({
    geometry: new T.CylinderGeometry(0.08, 0.12, 4.2, 6).translate(0, 2.1, 0),
    material: new T.MeshStandardMaterial({ emissive: 0x2a2415, roughness: 0.6, metalness: 0.05 }),
    castShadow: false,
    receiveShadow: false,
  }),
};
