// 시계탑 — 광장 한가운데. 분수대와 짝이고, 광장마다 둘 중 하나가 선다.
//
// 감독 지시: *"가운데. 분수대있고 시계탑있고."*
//
// ── 지오메트리 하나 + 텍스처 ────────────────────────────────────────────────
// 기둥·시계면·지붕을 따로 만들어 합치는 게 자연스럽지만 **병합을 못 쓴다**
// (`utils/BufferGeometryUtils.js` 가 `'three'` WebGL 빌드를 import 하는데 world2 는
// `'three/webgpu'` 다 — 섞으면 두 빌드의 `BufferGeometry` 가 달라진다).
//
// 대신 **4각 기둥 하나에 텍스처로 그린다.** `CylinderGeometry(r, r, h, 4)` 의 옆면 UV 는
// u 가 둘레, v 가 높이라, 캔버스를 면 비율에 맞춰 그리고 u 로 4번 반복하면 네 면 모두에
// 같은 시계가 걸린다. 도로에서 배운 것이 여기서도 적용된다 — **캔버스 비율을 면 비율에
// 맞춰야** 시계가 타원으로 눌리지 않는다.

import type { PartSpec, PlacedPart } from './types.js';
import { plazaLandmark } from './plaza.js';

/** 탑 높이(미터). 건물이 4~20m 이므로 12m 면 중간 키에 눈에 띈다 */
const H = 12;
/** 외접원 반지름. 4각이므로 한 면 폭은 `R × √2 ≈ 2.0m` */
const R = 1.4;

export const clocktower: PartSpec = {
  kind: 'clock',
  // far 까지 그린다(76.8m). **높이 12m 짜리는 스카이라인에 걸려야 랜드마크다.**
  //
  // near 전용(41.6m)으로 뒀다가 감독이 "시계탑도 안 보이던데" 로 잡았다. 스폰 지점에서
  // 가장 가까운 광장이 91m 라 처음 들어가면 무조건 안 보였다. 멀리서 보여야 다가갈
  // 이유가 생긴다.
  tiers: ['near', 'mid', 'far'],
  salt: 0x5a6b7c8d,
  // 텍스처가 있으므로 `tones` 는 **곱셈기**다 — 흰색 하나만 둔다.
  // (도로에서 어두운 톤을 곱해 길이 검게 나온 사고가 있었다)
  tones: [0xffffff],

  maxPerParcel: () => 1,

  place: ({ px, pz }) => {
    if (plazaLandmark(px, pz) !== 'clock') return [];
    const out: PlacedPart[] = [{
      kind: 'clock',
      x: 0, z: 0, y: 0, ry: 0,
      sx: 1, sy: 1, sz: 1,
      tone: 0,
    }];
    return out;
  },

  asset: (T) => {
    // 위가 살짝 좁은 4각 기둥. 완전한 직육면체보다 탑처럼 보인다.
    // 피벗을 바닥으로 올린다(배치가 y=0 을 "땅에 붙은 상태"로 낸다).
    const geometry = new T.CylinderGeometry(R * 0.86, R, H, 4).translate(0, H / 2, 0);
    return {
      geometry,
      material: new T.MeshStandardMaterial({
        map: towerTexture(T),
        roughness: 0.85,
        metalness: 0.05,
      }),
      castShadow: true,
      receiveShadow: true,
    };
  },
};

/**
 * 탑 외벽 텍스처. 자기완결 원칙대로 캔버스로 굽는다.
 *
 * **캔버스 비율이 면 비율과 같아야 한다.** 면은 폭 2.0m × 높이 12m 라 1:6 이고, 정사각
 * 캔버스를 쓰면 시계가 세로로 여섯 배 늘어난다 — world1 도로가 압축비 9.6배로 무늬를
 * 잃었던 것과 같은 함정이다.
 *
 * v 는 아래가 0, 위가 1 이다. 시계는 꼭대기 근처에 건다.
 */
function towerTexture(T: typeof import('three/webgpu')): InstanceType<typeof import('three/webgpu')['CanvasTexture']> {
  const W = 128;
  const HH = W * 6; // 면 비율 1:6
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = HH;
  const g = cv.getContext('2d')!;

  // ── 석재 벽 ──
  g.fillStyle = '#6e6659';
  g.fillRect(0, 0, W, HH);

  // 가로 줄눈. 층이 쌓인 느낌을 주고, 무늬가 없으면 12m 기둥이 밋밋한 막대가 된다.
  const course = 26;
  g.strokeStyle = 'rgba(40,36,30,0.35)';
  g.lineWidth = 1.5;
  for (let y = course; y < HH; y += course) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
    // 세로 줄눈은 층마다 반 칸씩 엇갈린다 — 벽돌쌓기
    const off = (y / course) % 2 ? W / 4 : 0;
    for (let x = off; x < W; x += W / 2) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + course);
      g.stroke();
    }
  }

  // 얼룩 — 균일한 석재는 인쇄물처럼 보인다
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * W;
    const y = Math.random() * HH;
    const r = 6 + Math.random() * 20;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, Math.random() < 0.5 ? 'rgba(50,45,38,0.20)' : 'rgba(140,132,118,0.14)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // ── 시계면 ── 캔버스 위쪽(= 탑 꼭대기 근처)에 정사각 영역으로
  const cx = W / 2;
  const cy = HH * 0.115;
  const rad = W * 0.34;

  g.fillStyle = '#efe7d4';
  g.beginPath();
  g.arc(cx, cy, rad, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#3a332a';
  g.lineWidth = 4;
  g.stroke();

  // 12개 눈금. 3·6·9·12 는 굵게 — 작게 보일 때 방향이 읽힌다
  g.strokeStyle = '#3a332a';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const major = i % 3 === 0;
    g.lineWidth = major ? 3.5 : 1.8;
    const r0 = rad * (major ? 0.74 : 0.82);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    g.lineTo(cx + Math.cos(a) * rad * 0.92, cy + Math.sin(a) * rad * 0.92);
    g.stroke();
  }

  // 바늘 — 10시 10분. 시계 이미지의 관습이고, 두 바늘이 겹치지 않아 시계로 읽힌다.
  const hand = (angleDeg: number, len: number, w: number) => {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * rad * len, cy + Math.sin(a) * rad * len);
    g.stroke();
  };
  hand(305, 0.5, 5);  // 시침 10시
  hand(60, 0.72, 3.5); // 분침 10분
  g.fillStyle = '#3a332a';
  g.beginPath();
  g.arc(cx, cy, 3.5, 0, Math.PI * 2);
  g.fill();

  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
