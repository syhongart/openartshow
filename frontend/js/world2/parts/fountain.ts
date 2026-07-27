// 분수대 — 광장 한가운데.
//
// 감독 지시: *"가운데. 분수대있고 시계탑있고."*
//
// ── 지오메트리 하나로 만든다 ─────────────────────────────────────────────────
// 수반과 중앙 기둥을 따로 만들어 합치는 게 자연스러운 접근인데, **병합을 못 쓴다.**
// `utils/BufferGeometryUtils.js` 가 `'three'`(WebGL 빌드)를 import 하는데 world2 는
// `'three/webgpu'` 라, 섞으면 두 빌드의 `BufferGeometry` 가 달라져 렌더러가 처리하지
// 못할 수 있다.
//
// 대신 `LatheGeometry` 를 쓴다. 분수대는 **회전체**라 옆면 프로파일 하나를 축 둘레로
// 돌리면 수반도 기둥도 한 번에 나온다. 병합이 필요 없고 파츠 계약도 그대로다.

import type { PartSpec, PlacedPart } from './types.js';
import { plazaLandmark } from './plaza.js';

/**
 * 옆면 프로파일. `(반지름, 높이)` 를 아래에서 위로.
 *
 * 축(반지름 0)에서 시작해 축으로 돌아오면 위아래가 막힌 입체가 된다. 중간에 축으로
 * 돌아오지 않으므로 수반 안쪽이 실제로 파여 물을 담은 모양이 나온다.
 */
const PROFILE: readonly [number, number][] = [
  [0.0, 0.00],  // 바닥 중심
  [2.4, 0.00],  // 바닥 가장자리
  [2.4, 0.55],  // 외벽
  [2.15, 0.62], // 테두리 안쪽으로 꺾임
  [2.15, 0.18], // 수반 안쪽 벽 — 여기까지가 물이 담기는 깊이
  [0.55, 0.14], // 수반 바닥
  [0.42, 0.30], // 중앙 기둥 시작
  [0.30, 1.35], // 기둥
  [0.62, 1.52], // 상단 접시
  [0.55, 1.62],
  [0.0, 1.70],  // 축으로 돌아와 꼭대기를 막는다
];

export const fountain: PartSpec = {
  kind: 'fountain',
  // mid 까지 그린다(56m).
  //
  // 처음에 near 전용(41.6m)으로 뒀다가 감독이 **"광장 안 보여"** 로 잡았다. 광장은 평균
  // 115m 간격인데 랜드마크 가시 반경이 41.6m 라, 서 있는 자리에서 보일 확률이 11.5% 였다 —
  // 열 번에 아홉 번은 없었다. 디자이너가 "안개(60.8m)의 두 배 거리면 다가가야 드러난다"
  // 는 근거로 간격을 정했는데, 내가 가시 반경을 그 절반 아래로 잡아 리듬 자체를 깼다.
  //
  // 분수대는 높이 1.7m 라 far(76.8m)에서는 어차피 몇 픽셀이다. 안개 경계에서 보이면 된다.
  tiers: ['near', 'mid'],
  salt: 0x1f2e3d4c,
  // 돌 색 셋. 텍스처가 없으므로 `tones` 가 곧 색이다(곱셈 함정 없음).
  tones: [0x8d8577, 0x9a9184, 0x807868],

  // 광장당 하나. 광장이 아닌 파셀은 0개다.
  maxPerParcel: () => 1,

  place: ({ px, pz }) => {
    if (plazaLandmark(px, pz) !== 'fountain') return [];
    const out: PlacedPart[] = [{
      kind: 'fountain',
      // 정확히 파셀 중심. 도로는 광장에서 중심 조각을 비워 자리를 내준다.
      x: 0, z: 0, y: 0, ry: 0,
      sx: 1, sy: 1, sz: 1,
      // 색만 파셀마다 다르다. 크기·회전을 흔들면 광장이 제각각으로 보인다 —
      // 랜드마크는 반복돼야 랜드마크다.
      tone: (px * 7 + pz * 13) & 3 ? ((px + pz) & 1) : 2,
    }];
    return out;
  },

  asset: (T) => {
    const pts = PROFILE.map(([r, y]) => new T.Vector2(r, y));
    // 세그먼트 16 — 원형이 각지지 않으면서 삼각형은 아낀다. 프로파일 11점 × 16 ≈ 320면.
    const geometry = new T.LatheGeometry(pts, 16);
    return {
      geometry,
      material: new T.MeshStandardMaterial({ roughness: 0.8, metalness: 0.05 }),
      castShadow: true,
      receiveShadow: true,
    };
  },
};
