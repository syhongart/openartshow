// 도로 — 파셀을 잇는 길.
//
// ── 감독 판정: "도로는 저번 것 별로야" / "바둑판 말고" ──────────────────────
// world1 도로가 밋밋한 회색 슬래브로 보인 원인은 색이 아니라 **텍스처 종횡비 왜곡**이었다.
// `applyGroundTex(..., repeat 3, ...)` 가 양축에 같은 repeat 를 걸어 U축 8m/타일 vs
// V축 0.83m/타일 — **압축비 9.6배**다. 밉맵이 그 방향의 디테일을 지워서 무늬가 사라졌다.
//
// 여기서는 repeat 를 쓰지 않는다. 길을 **정사각형 조각**으로 깔고 조각마다 UV 0~1 을
// 그대로 매핑한다. 조각이 정사각형이므로 왜곡이 구조적으로 0이다.
//
// ── 왜 조각열인가 ────────────────────────────────────────────────────────────
// 길 전체를 파셀마다 다른 모양의 메시로 만들면 지오메트리가 파셀 수만큼 생긴다 —
// 개수 불변식이 깨진다. 대신 **똑같은 정사각형 조각 하나**를 인스턴싱해 늘어놓는다.
// 지오 1개 · 재질 1개 · 드로우콜 1개로 어떤 모양의 길이든 만들어진다.
//
// 파셀당 최대 9조각(네 방향 × 2 + 중심), 평균 5.8조각. 조각당 2삼각형이므로 파셀당
// 12삼각형 남짓이다.

import type { PartSpec, PlacedPart } from './types.js';
import { roadDirs, ROAD_SEG } from './road-topology.js';
import { isPlaza } from './plaza.js';

export const road: PartSpec = {
  kind: 'road',
  // far 까지 그린다. 멀리서 길이 이어져 보이는 것이 "도시 안에 있다"는 인상의 대부분이고,
  // 조각당 2삼각형이라 far 까지 넣어도 삼각형 예산에 거의 영향이 없다.
  tiers: ['near', 'mid', 'far'],
  salt: 0x6c8e9cf5,

  // ⚠️ **텍스처가 있는 파츠의 `tones` 는 색이 아니라 곱셈기다.**
  //
  // `instanceColor` 는 프래그먼트에서 `diffuseColor *= instanceColor` 로 적용된다.
  // 텍스처가 없는 파츠(건물·나무·가로등)는 곱해질 것이 흰색이라 `tones` 가 그대로 색이
  // 되지만, 도로는 아스팔트 텍스처와 **곱해진다.**
  //
  // 처음에 다른 파츠와 같은 방식으로 어두운 회색 두 개(`0x23262b`/`0x25282d`)를 골랐다.
  // 그 값은 텍스처 베이스(`#2a2d33`)와 곱해져 최종 알베도가 선형 0.0003 대 — 표시색으로
  // RGB(6,6,7) 안팎, 사실상 **완전한 검정**이 됐다. 디자이너가 fog 를 끄고 그림자를 꺼도
  // 암전이 그대로인 것으로 원인을 좁혀 잡아냈다. 텍스처는 멀쩡했고 곱셈이 문제였다.
  //
  // 흰색 하나만 둔다. 텍스처가 이미 최종 밝기와 얼룩을 담고 있으므로 곱셈 항등원이 맞다.
  // 파셀별 색 변주도 넣지 않는다 — 길은 이어진 하나로 읽혀야 하고, 파셀마다 미세하게
  // 색이 다르면 그 경계가 이음매로 드러난다.
  tones: [0xffffff],

  // 네 방향 × 조각 2개 + 중심 1개. 중심은 방향이 하나라도 있을 때만 놓으므로 실제
  // 최댓값은 9다.
  // 네 방향 × 2 + 중심 1. 광장은 중심이 빠져 최대 8 이지만, 상한은 최악치로 잡는다.
  maxPerParcel: () => 9,

  // 난수를 쓰지 않는다. 길의 모양은 경계 해시가 정하고, 색은 텍스처가 정한다.
  place: ({ px, pz }) => {
    const dirs = roadDirs(px, pz);
    if (dirs.length === 0) return [];

    const tone = 0;
    const out: PlacedPart[] = [];
    // 지면(두께 0.1, 피벗 위쪽)보다 아주 살짝 위. 같은 높이면 z-fighting 으로 지글거린다.
    const y = 0.06;

    const seg = (x: number, z: number, ry: number) => {
      out.push({ kind: 'road', x, z, y, ry, sx: ROAD_SEG, sy: 1, sz: ROAD_SEG, tone });
    };

    // 중심 — 막다른 길이어도 길머리는 있어야 한다. 다만 **광장에서는 비운다**:
    // 그 자리에 분수대나 시계탑이 선다. 팔은 그대로 남으므로 길은 광장 둘레를 도는
    // 로터리처럼 읽힌다.
    if (!isPlaza(px, pz)) seg(0, 0, 0);

    for (const d of dirs) {
      // 중심에서 변까지 16m 를 8m 조각 둘로 채운다. 조각 중심이 8m·16m 가 아니라
      // 4m·12m 인 것에 주의 — 피벗이 조각 한가운데다.
      for (let i = 1; i <= 2; i++) {
        const t = i * ROAD_SEG - ROAD_SEG / 2;
        if (d === 'north') seg(0, -t, 0);
        else if (d === 'south') seg(0, t, 0);
        else if (d === 'west') seg(-t, 0, Math.PI / 2);
        else seg(t, 0, Math.PI / 2);
      }
    }
    return out;
  },

  asset: (T) => {
    // 평면을 눕힌다. `rotateX(-90°)` 로 지오메트리 자체를 돌려두면 인스턴스 회전(ry)을
    // Y축 회전으로 그대로 쓸 수 있다 — 배치가 회전을 한 축으로만 다루게 하려는 것이다.
    const geometry = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

    return {
      geometry,
      material: new T.MeshStandardMaterial({
        map: asphaltTexture(T),
        roughness: 0.95,
        metalness: 0.0,
      }),
      castShadow: false,
      // 길이 그림자를 받아야 건물이 땅에 붙어 보인다.
      receiveShadow: true,
    };
  },
};

/**
 * 아스팔트 텍스처. **자기완결 원칙**대로 외부 이미지를 쓰지 않고 캔버스로 굽는다.
 *
 * 방향성 있는 무늬(차선 등)를 넣지 않는다. 조각이 네 방향으로 깔리는데 무늬에 방향이
 * 있으면 교차로에서 어긋나고, 그걸 맞추려면 조각 종류를 늘려야 한다(= 개수 불변식과
 * 부딪힌다). 무방향 거친 면이면 어느 방향으로 놓아도 이어져 보인다.
 *
 * 조각 경계가 드러나지 않게 **가장자리를 어둡게 하지 않는다** — 조각마다 테두리가 지면
 * 길이 타일 바닥처럼 보인다.
 */
function asphaltTexture(T: typeof import('three/webgpu')): InstanceType<typeof import('three/webgpu')['CanvasTexture']> {
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;

  g.fillStyle = '#2a2d33';
  g.fillRect(0, 0, S, S);

  // 자갈 알갱이. 크기와 밝기를 섞어 균일한 노이즈로 보이지 않게 한다 — 한 종류만 뿌리면
  // 사포처럼 보이고, 멀어지면 밉맵이 평균 내버려 다시 단색이 된다.
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * S;
    const z = Math.random() * S;
    const r = Math.random() < 0.15 ? 1.6 : 0.7;
    const v = 28 + Math.random() * 46;
    g.fillStyle = `rgba(${v},${v + 2},${v + 6},${0.25 + Math.random() * 0.5})`;
    g.beginPath();
    g.arc(x, z, r, 0, Math.PI * 2);
    g.fill();
  }

  // 얼룩 — 아스팔트는 보수 자국과 기름때로 얼룩덜룩하다. 이게 없으면 알갱이만 남아
  // 균일한 회색으로 읽힌다.
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * S;
    const z = Math.random() * S;
    const r = 8 + Math.random() * 22;
    const grad = g.createRadialGradient(x, z, 0, x, z, r);
    const dark = Math.random() < 0.5;
    grad.addColorStop(0, dark ? 'rgba(20,21,24,0.35)' : 'rgba(70,73,80,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, z - r, r * 2, r * 2);
  }

  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
