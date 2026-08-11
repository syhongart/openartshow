// 그림자 데칼 **판정** — 태양에서 자세를 유도하는 산술.
//
// ── 이 파일의 핵심은 「행렬을 실제로 조립하는」 절이다 ──────────────────────
// 나머지 단언은 순수 계산 안에서 닫힌다. 그런데 이 기능이 실제로 틀리는 자리는 계산이
// 아니라 **좌표 규약**이다: 데칼 평면은 `rotateX(-π/2)` 로 눕혀져 있어 UV v축이 로컬 −Z 로
// 가고, 거기에 `CanvasTexture.flipY` 가 한 번 더 겹친다. 부호를 손으로 유도하면 반반
// 확률로 틀리는데 **식은 양쪽 다 그럴듯하고**, 화면 증상은 "그림자가 해 쪽에 있다" 라
// 눈에는 즉시 보인다. 산술만 보는 테스트는 이것을 영원히 못 잡는다.
//
// 그래서 `instancing.ts` 의 `setTransform` 과 **같은 방식으로**(compose + Y축 쿼터니언)
// 행렬을 만들어, 평면 로컬의 「그림자 끝」 점이 정말 태양 반대쪽에 가는지 본다.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  sunGround, shadowSpan, decalTransform, atlasGrid, densityFor,
  SHADOW_MAX_LEN, DENSITY_BY_TIME,
} from '../frontend/js/world2/decide/shadow-decal.js';

/** 실측 태양 방향 — `sky.js` 의 `getSunDir()` 과 같은 식으로 만든다(값 복사 아님) */
function sunDir(azimuth: number, elevation: number) {
  const ce = Math.cos(elevation);
  return { x: Math.sin(azimuth) * ce, y: Math.sin(elevation), z: Math.cos(azimuth) * ce };
}

const DAY_EL = 0.45 * Math.PI * 0.5 + 0.12;    // ≈ 0.827rad ≈ 47.4°
const SUNSET_EL = 0.06 * Math.PI * 0.5 + 0.12; // ≈ 0.214rad ≈ 12.3°

describe('sunGround — 태양에서 지면 기저', () => {
  it('cot 이 고도의 여코탄젠트다 — 낮은 1 언저리, 노을은 4배 넘게 길다', () => {
    const day = sunGround(...Object.values(sunDir(0.78, DAY_EL)) as [number, number, number])!;
    const sunset = sunGround(...Object.values(sunDir(0.78, SUNSET_EL)) as [number, number, number])!;
    expect(day.cot).toBeCloseTo(1 / Math.tan(DAY_EL), 3);
    expect(sunset.cot).toBeCloseTo(1 / Math.tan(SUNSET_EL), 3);
    // 이 배수가 길이 상한이 필요한 이유 그 자체다.
    expect(sunset.cot / day.cot).toBeGreaterThan(4);
  });

  it('방향이 태양의 **반대**다 — 그림자는 해를 등진다', () => {
    const d = sunDir(0.78, DAY_EL);
    const g = sunGround(d.x, d.y, d.z)!;
    // 수평 성분과 내적이 음수 = 반대 방향.
    expect(g.ux * d.x + g.uz * d.z).toBeLessThan(0);
    expect(Math.hypot(g.ux, g.uz)).toBeCloseTo(1, 6);
  });

  it('지평선 아래면 null — 해가 진 순간 세계가 띠로 덮이지 않는다', () => {
    expect(sunGround(0.7, -0.1, 0.7)).toBeNull();
    expect(sunGround(0.7, 0, 0.7)).toBeNull();
  });

  it('정수리 태양은 밑동만 남는다 — 방향이 정의되지 않아도 죽지 않는다', () => {
    const g = sunGround(0, 1, 0)!;
    expect(g.cot).toBe(0);
    expect(Math.hypot(g.ux, g.uz)).toBeCloseTo(1, 6);
  });
});

describe('shadowSpan — 치수', () => {
  const g = (cot: number) => ({ ux: 1, uz: 0, cot });

  it('길이 = 밑동 지름 + 높이×cot', () => {
    const s = shadowSpan(10, 2, g(1.5), 999);
    expect(s.len).toBeCloseTo(4 + 15, 6);
    expect(s.width).toBeCloseTo(4, 6);
    expect(s.blobFrac).toBeCloseTo(4 / 19, 6);
  });

  it('상한이 뻗는 길이를 자른다 — 노을 타워가 275m 가 되지 않는다', () => {
    // 타워 60m × 노을 cot 4.58 ≈ 275m. 상한 32m 면 뻗는 길이는 32 여야 한다.
    const cot = 1 / Math.tan(SUNSET_EL);
    const s = shadowSpan(60, 3, g(cot), SHADOW_MAX_LEN);
    expect(60 * cot).toBeGreaterThan(250);          // 자르지 않으면 이만큼이다
    expect(s.len).toBeCloseTo(6 + SHADOW_MAX_LEN, 6); // 잘린 결과
  });

  it('blobFrac 은 밑동이 전체에서 차지하는 비다 — 정수리면 1', () => {
    expect(shadowSpan(10, 2, g(0), 999).blobFrac).toBeCloseTo(1, 6);
  });
});

describe('decalTransform — 자세', () => {
  const g = sunGround(...Object.values(sunDir(0.78, DAY_EL)) as [number, number, number])!;

  it('데칼 중심이 태양 반대쪽에 있다', () => {
    const span = shadowSpan(12, 2, g, SHADOW_MAX_LEN);
    const p = decalTransform(0, 0, span, g);
    expect(p.x * g.ux + p.z * g.uz).toBeGreaterThan(0); // 그림자 방향으로 밀렸다
  });

  it('스케일이 치수와 같다 — 폭·길이가 따로 놀지 않는다', () => {
    const span = shadowSpan(12, 2, g, SHADOW_MAX_LEN);
    const p = decalTransform(5, -3, span, g);
    expect(p.sx).toBeCloseTo(span.width, 6);
    expect(p.sz).toBeCloseTo(span.len, 6);
  });
});

describe('행렬을 실제로 조립한다 — 좌표 규약이 맞는가', () => {
  // `instancing.ts:171-178` 과 같은 조립: compose(위치, Y축 ry 쿼터니언, 스케일).
  // 눕힌 평면의 지오도 실제로 만들어 로컬 정점을 가져온다.
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

  /** 데칼 평면 로컬 (0, 0, lz) 의 월드 위치. `lz` 는 −0.5(발밑)~+0.5(끝) */
  function worldOf(pose: ReturnType<typeof decalTransform>, lz: number) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(pose.x, 0, pose.z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), pose.ry),
      new THREE.Vector3(pose.sx, 1, pose.sz),
    );
    return new THREE.Vector3(0, 0, lz).applyMatrix4(m);
  }

  it('평면 로컬 +Z(=UV v=0=캔버스 아래쪽=그림자 끝)가 태양 반대쪽으로 간다', () => {
    // 이 단언이 이 파일의 존재 이유다. `ry` 의 부호나 인자 순서가 뒤집히면 여기서만 깨진다.
    const g = sunGround(...Object.values(sunDir(0.78, DAY_EL)) as [number, number, number])!;
    const span = shadowSpan(12, 2, g, SHADOW_MAX_LEN);
    const pose = decalTransform(0, 0, span, g);
    const tip = worldOf(pose, 0.5);
    // 끝점이 그림자 방향에 있고, 캐스터에서 (len − r) 만큼 떨어져 있다.
    expect(tip.x * g.ux + tip.z * g.uz).toBeCloseTo(span.len - span.width / 2, 4);
    // 그림자 방향과 **평행**하다 — 옆으로 새지 않았다.
    expect(tip.x * -g.uz + tip.z * g.ux).toBeCloseTo(0, 6);
  });

  it('평면 로컬 −Z(=캔버스 위쪽=발밑)가 캐스터 중심에 온다', () => {
    // 밑동이 물건에서 떨어져 나오는 결함을 이 단언이 잡는다.
    const g = sunGround(...Object.values(sunDir(2.1, SUNSET_EL)) as [number, number, number])!;
    const span = shadowSpan(8, 1.5, g, SHADOW_MAX_LEN);
    const pose = decalTransform(17, -4, span, g);
    // 밑동 원의 중심은 로컬 z = −0.5 + blobFrac/2 다.
    const foot = worldOf(pose, -0.5 + span.blobFrac / 2);
    expect(foot.x).toBeCloseTo(17, 4);
    expect(foot.z).toBeCloseTo(-4, 4);
  });

  it('눕힌 지오의 로컬 z 부호가 규약대로다 — UV v=1 이 −Z 다', () => {
    // 규약 자체를 못 박는다. three 가 PlaneGeometry 의 UV 규약을 바꾸면 여기서 깨진다.
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    let vTop = -1, zTop = 0;
    for (let i = 0; i < pos.count; i++) {
      if (uv.getY(i) > vTop) { vTop = uv.getY(i); zTop = pos.getZ(i); }
    }
    expect(vTop).toBeCloseTo(1, 6);
    expect(zTop).toBeCloseTo(-0.5, 6); // v=1 → 로컬 −Z
  });
});

describe('atlasGrid — 격자', () => {
  it('셀 수가 늘어도 넘치지 않는다', () => {
    for (const n of [1, 4, 8, 9, 16, 17]) {
      const g = atlasGrid(n, 512);
      const last = g.cellOf(n - 1);
      expect(last.px + last.size).toBeLessThanOrEqual(512);
      expect(last.py + last.size).toBeLessThanOrEqual(512);
    }
  });

  it('UV 가 셀 안쪽으로 물려 있다 — 이웃 셀을 빨아들이지 않는다', () => {
    const g = atlasGrid(8, 512);
    const c = g.cellOf(0);
    expect(c.u0).toBeGreaterThan(c.px / 512);
    expect(c.u1).toBeLessThan((c.px + c.size) / 512);
    expect(c.u1 - c.u0).toBeGreaterThan(0);
    expect(c.v1 - c.v0).toBeGreaterThan(0);
  });

  it('셀끼리 겹치지 않는다', () => {
    const g = atlasGrid(8, 512);
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const c = g.cellOf(i);
      const key = `${c.px},${c.py}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

describe('densityFor — 시간대 농도', () => {
  it('밤이 가장 옅고, 0 은 아니다 — 밤에만 물건이 다시 뜨지 않게', () => {
    expect(densityFor('night', 1)).toBeLessThan(densityFor('sunset', 1));
    expect(densityFor('sunset', 1)).toBeLessThan(densityFor('day', 1));
    expect(densityFor('night', 1)).toBeGreaterThan(0);
  });

  it('1 을 넘지 않는다', () => {
    expect(densityFor('day', 5)).toBe(1);
  });

  it('시간대 배수를 실제로 소비한다', () => {
    // 표를 무시하고 base 를 그대로 돌려주면 깨진다.
    expect(densityFor('night', 0.5)).toBeCloseTo(0.5 * DENSITY_BY_TIME.night, 6);
  });
});
