// 접촉그림자(AO 블롭) **판정** — 크기·그라디언트·격자의 산술.
//
// ── 2026-08-11 2회차: 태양 축 테스트가 통째로 무효가 됐다 ───────────────────
// 감독이 방향성 penumbra 데칼을 폐기하고 빌더의 접촉그림자를 지목했다. 그래서 아래 축을
// 보던 단언들은 **약화된 것이 아니라 대상이 사라진 것**이다:
//   `sunGround`(태양→지면 기저) · `shadowSpan`(길이 = 밑동 + h·cot) · `SHADOW_MAX_LEN`
//   상한 · `decalLocalZ`(방향 좌표 변환) · `penumbraPlan` · `tailAlpha` · `STYLE_PROFILES`.
//
// **그 축들이 검증하던 성질 중 새 구조에도 남는 것은 옮겼다**:
//   ① "굽는 쪽과 놓는 쪽이 같은 상수를 본다"(옛 `SHADOW_PAD`/`DECAL_SCALE` 짝) →
//      `DECAL_SCALE` 이 `BLOB_OUTER_R` 에서 유도되는가 + 행렬로 실측
//   ② "실루엣의 월드 크기가 계약대로다"(옛 `decalLocalZ(1)` 월드 거리) →
//      그라디언트 바깥 반경의 월드 반경 = `r · BLOB_SCALE`
//   ③ 아틀라스 격자·시간대 농도는 구조가 안 바뀌어 그대로 남았다.
//
// ── 이 파일의 핵심은 여전히 「행렬을 실제로 조립하는」 절이다 ────────────────
// 나머지 단언은 순수 계산 안에서 닫힌다. 데칼 평면은 `rotateX(-π/2)` 로 눕혀져 있고,
// 스케일이 **원 지름이 아니라 셀 한 변**이라 `DECAL_SCALE` 을 빠뜨려도 식은 그럴듯하다.
// 증상은 "그림자가 물건보다 7% 크다/작다" 뿐이라 산술만 보는 테스트는 영원히 못 잡는다.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  decalTransform, atlasGrid, densityFor, blobStops, midStopFor, blobRadiusAt,
  DENSITY_BY_TIME, SHADOW_PAD, DECAL_SCALE, BLOB_SCALE,
  BLOB_INNER_R, BLOB_OUTER_R, BLOB_CORE_ALPHA, BLOB_MID_ALPHA, BLOB_MID_STOP,
  MID_STOP_HARD, MID_STOP_SOFT, SHADOW_SOFT, SHADOW_SOFT_MAX, SHADOW_DENSITY,
  SHADOW_DENSITY_MAX,
  // ── 3회차(2026-08-11) 신설 축 — 곱하기 합성 + 형태별 실루엣 ──
  alphaCurve, roundBoxSD, leafNoise, decalTransformRect,
  RECT_CORNER, SHADOW_BLEND, SHADOW_BLENDS,
} from '../frontend/js/world2/decide/shadow-decal.js';

describe('그라디언트 — 빌더 값을 그대로 재현하는가', () => {
  // 감독이 지목한 것이 빌더(`space-assembler.ts` 의 `aoTexture()`)의 그 룩이다. 값이
  // 조용히 흘러가면 지목된 룩이 아닌 것이 된다.

  it('기본값에서 빌더 원본 3스톱이 그대로 나온다', () => {
    const s = blobStops(SHADOW_SOFT, 1);
    expect(s).toHaveLength(3);
    expect(s[0].t).toBe(0);
    expect(s[0].a).toBeCloseTo(BLOB_CORE_ALPHA, 12);   // 0.62
    expect(s[1].t).toBeCloseTo(BLOB_MID_STOP, 12);     // 0.55
    expect(s[1].a).toBeCloseTo(BLOB_MID_ALPHA, 12);    // 0.30
    expect(s[2].t).toBe(1);
    expect(s[2].a).toBe(0);
  });

  it('빌더 원본 값 자체가 안 흘러갔다 — 픽셀비까지', () => {
    // `aoTexture()`: createRadialGradient(64, 64, 4, 64, 64, 60) · 128² 캔버스.
    expect(BLOB_INNER_R).toBeCloseTo(4 / 128, 12);
    expect(BLOB_OUTER_R).toBeCloseTo(60 / 128, 12);
    expect(BLOB_CORE_ALPHA).toBeCloseTo(0.62, 12);
    expect(BLOB_MID_ALPHA).toBeCloseTo(0.30, 12);
    expect(BLOB_MID_STOP).toBeCloseTo(0.55, 12);
  });

  it('농도가 정확히 한 번 곱해진다 — `?shdark` 가 죽지 않는다', () => {
    // 앞 회차의 실패: 겹마다 `globalAlpha = density` 를 걸어 농도가 겹 수만큼 누적됐고
    // (density 0.45 가 알파 248/255 로 구워졌다) `?shdark` 가 사실상 죽었다.
    const half = blobStops(SHADOW_SOFT, 0.5);
    expect(half[0].a).toBeCloseTo(BLOB_CORE_ALPHA * 0.5, 12);
    expect(half[1].a).toBeCloseTo(BLOB_MID_ALPHA * 0.5, 12);
    expect(half[2].a).toBe(0); // 0 은 무엇을 곱해도 0
  });

  it('농도 0 이면 전부 투명 — `?shdec=0` 이 실제로 안 보이게 만든다', () => {
    for (const s of blobStops(SHADOW_SOFT, 0)) expect(s.a).toBe(0);
  });

  it('★ NaN 이 스톱으로 새지 않는다 — `addColorStop` 이 예외를 던진다', () => {
    // 캔버스는 비유한 오프셋에 `IndexSizeError` 를 던지고, 그러면 굽기가 통째로 죽어
    // 화면에서는 "어느 순간부터 그림자가 안 나온다" 로 나타난다. 노브 파서가 이미
    // 거르지만 판정이 그것에 기대면 안 된다 — **이 방어가 없어서 실제로 빨간불이 났다.**
    for (const [soft, d] of [[Number.NaN, 1], [SHADOW_SOFT, Number.NaN], [Number.NaN, Number.NaN]]) {
      for (const s of blobStops(soft, d)) {
        expect(Number.isFinite(s.t), `soft=${soft} d=${d}`).toBe(true);
        expect(Number.isFinite(s.a), `soft=${soft} d=${d}`).toBe(true);
        expect(s.t).toBeGreaterThanOrEqual(0);
        expect(s.t).toBeLessThanOrEqual(1);
      }
    }
  });

  it('농도를 올려도 알파가 1 을 넘지 않는다 — 흰색이 되지 않는다', () => {
    for (const s of blobStops(SHADOW_SOFT, SHADOW_DENSITY_MAX * 5)) {
      expect(s.a).toBeLessThanOrEqual(1);
      expect(s.a).toBeGreaterThanOrEqual(0);
    }
    // 상한까지 밀면 중심이 실제로 진해진다 — 노브가 위쪽으로 살아 있다는 뜻이다.
    expect(blobStops(SHADOW_SOFT, SHADOW_DENSITY_MAX)[0].a)
      .toBeGreaterThan(blobStops(SHADOW_SOFT, 1)[0].a);
  });

  it('알파가 중심에서 바깥으로 단조 감소한다 — 접지 신호가 뒤집히지 않는다', () => {
    for (const soft of [0, 0.3, SHADOW_SOFT, 0.8, 1]) {
      const s = blobStops(soft, 1);
      expect(s[0].a, `soft=${soft}`).toBeGreaterThan(s[1].a);
      expect(s[1].a, `soft=${soft}`).toBeGreaterThan(s[2].a);
      // 스톱 위치도 단조 증가여야 캔버스가 받아들인다.
      expect(s[0].t, `soft=${soft}`).toBeLessThan(s[1].t);
      expect(s[1].t, `soft=${soft}`).toBeLessThan(s[2].t);
    }
  });
});

describe('midStopFor — `?shsoft` 재해석', () => {
  it('기본값이 빌더 원본 스톱을 정확히 재현한다 — 역산이 실제로 소비된다', () => {
    // `SHADOW_SOFT` 를 0.5 로 손수 적어 두면 구간(`MID_STOP_HARD`/`SOFT`)을 조정하는 날
    // 기본 룩이 조용히 바뀐다. 역산이 살아 있는지 여기서 본다.
    expect(midStopFor(SHADOW_SOFT)).toBeCloseTo(BLOB_MID_STOP, 12);
  });

  it('값이 클수록 부드럽다 — 슬라이더 라벨과 방향이 같다', () => {
    // 스톱 위치가 안쪽으로 갈수록 중심에서 급히 떨어지고 긴 완만한 꼬리가 남는다 = 번짐.
    expect(midStopFor(0)).toBeCloseTo(MID_STOP_HARD, 12);
    expect(midStopFor(SHADOW_SOFT_MAX)).toBeCloseTo(MID_STOP_SOFT, 12);
    let prev = Infinity;
    for (let v = 0; v <= SHADOW_SOFT_MAX + 1e-9; v += SHADOW_SOFT_MAX / 20) {
      const s = midStopFor(v);
      expect(s).toBeLessThan(prev);
      prev = s;
    }
  });

  it('노브 전 구간이 살아 있다 — 죽은 구간이 없다', () => {
    // 앞 회차에서 절대비 손잡이의 86% 가 포화로 죽어 있던 것을 실측으로 잡았다.
    // 정규화 손잡이는 그 형태가 원리상 불가능하지만, 그 성질을 검사로 만든다.
    const span = midStopFor(0) - midStopFor(SHADOW_SOFT_MAX);
    for (let k = 0; k < 10; k++) {
      const a = midStopFor(SHADOW_SOFT_MAX * (k / 10));
      const b = midStopFor(SHADOW_SOFT_MAX * ((k + 1) / 10));
      expect(a - b, `구간 ${k}`).toBeCloseTo(span / 10, 9);
    }
  });

  it('범위 밖 값에서 죽지 않는다 — NaN 이 텍스처로 구워지지 않게', () => {
    for (const v of [-5, 0, 1, 99, Number.NaN]) {
      const s = midStopFor(v);
      expect(Number.isFinite(s), `soft=${v}`).toBe(true);
      expect(s).toBeGreaterThanOrEqual(MID_STOP_SOFT - 1e-9);
      expect(s).toBeLessThanOrEqual(MID_STOP_HARD + 1e-9);
    }
  });

  it('구간이 하드 링·얼룩 양극단을 피한다', () => {
    // 0.95 를 넘기면 마지막 5% 구간에서 0.30 → 0 이라 얇은 하드 링이 선다(감독이 앞
    // 회차에 반려한 "딱딱하다"). 0.25 아래면 코어가 사라져 접지 신호가 없어진다.
    expect(MID_STOP_HARD).toBeLessThanOrEqual(0.95);
    expect(MID_STOP_SOFT).toBeGreaterThanOrEqual(0.15);
    expect(MID_STOP_SOFT).toBeLessThan(BLOB_MID_STOP);
    expect(MID_STOP_HARD).toBeGreaterThan(BLOB_MID_STOP); // 기본값이 구간 안이다
  });
});

describe('크기 — 배수가 유도되는가', () => {
  it('DECAL_SCALE 이 BLOB_OUTER_R 에서 나온다 — 굽는 쪽과 놓는 쪽이 갈라지지 않는다', () => {
    // 1.0667 을 손으로 적어 두면 그라디언트 반경비를 바꿔도 안 따라오고, 증상은
    // "그림자가 실루엣보다 크다/작다" 뿐이라 아무 테스트도 안 걸린다.
    expect(DECAL_SCALE).toBeCloseTo(1 / (2 * BLOB_OUTER_R), 12);
    expect(SHADOW_PAD).toBeCloseTo(0.5 - BLOB_OUTER_R, 12);
    expect(SHADOW_PAD).toBeGreaterThan(0);  // 여백이 0 이면 셀 경계에서 잘린다
    expect(SHADOW_PAD).toBeLessThan(0.25);  // 절반을 넘으면 실루엣이 사라진다
  });

  it('BLOB_SCALE 이 중간 스톱 = 캐스터 밑동 조건에서 나온다', () => {
    // 근거 ①(원리)이 실제로 코드에 있는지 본다. 1.72 를 박아 두면 스톱 위치를 바꿔도
    // 안 따라온다.
    expect(BLOB_SCALE).toBeCloseTo(BLOB_OUTER_R / blobRadiusAt(BLOB_MID_STOP), 12);
    // 빌더 표 실측 중앙값(1.64)과 같은 구간에 있다 — 근거 ②의 대조.
    expect(BLOB_SCALE).toBeGreaterThan(1.4);
    expect(BLOB_SCALE).toBeLessThan(2.0);
  });

  it('`?shsoft` 를 밀어도 그림자 크기는 안 변한다 — 축이 둘로 섞이지 않는다', () => {
    // 배수가 `midStopFor(soft)` 를 보게 만들면 번짐 노브가 크기까지 움직인다.
    const a = decalTransform(0, 0, 2);
    // `decalTransform` 은 soft 를 인자로 받지 않는다 — 그것이 곧 이 성질의 구조적 보장이고,
    // 값으로도 한 번 못 박는다.
    expect(a.sx).toBeCloseTo(2 * 2 * BLOB_SCALE * DECAL_SCALE, 12);
  });

  it('blobRadiusAt 이 두 반경 사이를 선형으로 잇는다', () => {
    expect(blobRadiusAt(0)).toBeCloseTo(BLOB_INNER_R, 12);
    expect(blobRadiusAt(1)).toBeCloseTo(BLOB_OUTER_R, 12);
    expect(blobRadiusAt(0.5)).toBeCloseTo((BLOB_INNER_R + BLOB_OUTER_R) / 2, 12);
  });
});

describe('decalTransform — 자세', () => {
  it('데칼이 캐스터 발밑 그 자리다 — 방향으로 밀리지 않는다', () => {
    // 이번 교체의 실질이 여기다. 옛 `decalTransform` 은 `back = len/2 − width/2` 만큼
    // 태양 반대쪽으로 밀었다.
    const p = decalTransform(17, -4, 1.5);
    expect(p.x).toBe(17);
    expect(p.z).toBe(-4);
  });

  it('회전이 0 이다 — 파츠가 돌아도 그림자는 안 돈다', () => {
    // 빌더가 AO 플레인을 파츠의 자식으로 두지 않는 것과 같은 계약이다
    // (`space-assembler.ts`: 자식화하면 파츠 회전을 따라 그림자도 돈다).
    expect(decalTransform(3, 3, 1).ry).toBe(0);
  });

  it('정사각이다 — 원이 타원으로 찌그러지지 않는다', () => {
    for (const r of [0.05, 0.5, 2, 8]) {
      const p = decalTransform(0, 0, r);
      expect(p.sx, `r=${r}`).toBeCloseTo(p.sz, 12);
    }
  });

  it('반경에 비례한다 — 큰 나무와 작은 나무의 그림자가 같아지지 않는다', () => {
    expect(decalTransform(0, 0, 4).sx).toBeCloseTo(decalTransform(0, 0, 1).sx * 4, 12);
  });

  it('음수·NaN 반경에서 죽지 않는다 — 화면이 검게 덮이지 않는다', () => {
    // NaN 을 그대로 흘리면 인스턴스 행렬이 NaN 이 되고, three 는 그것을 조용히 그린다.
    for (const r of [-3, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
      const p = decalTransform(1, 2, r);
      expect(Number.isFinite(p.sx), `r=${r}`).toBe(true);
      expect(p.sx, `r=${r}`).toBeGreaterThanOrEqual(0);
    }
    expect(decalTransform(0, 0, -3).sx).toBe(0);
    expect(decalTransform(0, 0, Number.NaN).sx).toBe(0);
  });
});

describe('행렬을 실제로 조립한다 — 월드 크기가 계약대로인가', () => {
  // `instancing.ts:171-178` 과 같은 조립: compose(위치, Y축 ry 쿼터니언, 스케일).
  // 눕힌 평면의 지오도 실제로 만들어 로컬 정점을 가져온다.
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

  /** 데칼 평면 로컬 (lx, 0, lz) 의 월드 위치 */
  function worldOf(pose: ReturnType<typeof decalTransform>, lx: number, lz: number) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(pose.x, 0, pose.z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), pose.ry),
      new THREE.Vector3(pose.sx, 1, pose.sz),
    );
    return new THREE.Vector3(lx, 0, lz).applyMatrix4(m);
  }

  it('★ 그라디언트 바깥 반경의 월드 반경이 정확히 r·BLOB_SCALE 이다', () => {
    // 이 단언이 이 파일의 존재 이유다. `DECAL_SCALE` 을 빠뜨리면 여기서만 깨진다
    // (그림자가 6.7% 작아진다 — 화면에서 알아채기 어려운 폭이다).
    const r = 2;
    const pose = decalTransform(11, -6, r);
    // 그라디언트 바깥 원은 평면 로컬 반경 `BLOB_OUTER_R`(셀 한 변 = 1 기준)이다.
    for (const [lx, lz] of [[BLOB_OUTER_R, 0], [0, BLOB_OUTER_R], [-BLOB_OUTER_R, 0]] as const) {
      const w = worldOf(pose, lx, lz);
      const d = Math.hypot(w.x - 11, w.z + 6);
      expect(d, `${lx},${lz}`).toBeCloseTo(r * BLOB_SCALE, 9);
    }
  });

  it('★ 중간 스톱의 월드 반경이 캐스터 밑동 반경과 같다 — BLOB_SCALE 근거 ①의 실측', () => {
    // 주석에 적은 유도("사람이 가장자리로 읽는 것은 중간 스톱이고 그것이 밑동과 맞아야
    // 접지로 읽힌다")를 행렬로 확인한다. 유도가 코드에 안 들어갔으면 여기서 깨진다.
    const r = 3.5;
    const pose = decalTransform(0, 0, r);
    const w = worldOf(pose, blobRadiusAt(BLOB_MID_STOP), 0);
    expect(Math.hypot(w.x, w.z)).toBeCloseTo(r, 9);
  });

  it('평면 중심이 캐스터 중심이다 — 밑동이 물건에서 떨어져 나오지 않는다', () => {
    const pose = decalTransform(17, -4, 1.5);
    const c = worldOf(pose, 0, 0);
    expect(c.x).toBeCloseTo(17, 9);
    expect(c.z).toBeCloseTo(-4, 9);
  });

  it('눕힌 지오가 XZ 평면에 있다 — 서 있으면 그림자가 벽처럼 선다', () => {
    // 규약 자체를 못 박는다. three 가 `PlaneGeometry` 를 바꾸거나 `rotateX` 부호가
    // 뒤집히면 여기서 깨진다.
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) expect(pos.getY(i)).toBeCloseTo(0, 9);
    // 한 변이 1 이다 — 스케일이 곧 월드 한 변이라는 계약.
    let maxX = 0, maxZ = 0;
    for (let i = 0; i < pos.count; i++) {
      maxX = Math.max(maxX, Math.abs(pos.getX(i)));
      maxZ = Math.max(maxZ, Math.abs(pos.getZ(i)));
    }
    expect(maxX).toBeCloseTo(0.5, 9);
    expect(maxZ).toBeCloseTo(0.5, 9);
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

  it('시간대 배수를 실제로 소비한다', () => {
    // 표를 무시하고 base 를 그대로 돌려주면 깨진다.
    expect(densityFor('night', 0.5)).toBeCloseTo(0.5 * DENSITY_BY_TIME.night, 9);
  });

  it('★ 기본 농도가 낮에 배수 1 로 통과한다 — 빌더 룩이 그대로 나온다', () => {
    // ⚠ **옛 단언 `densityFor('day', 5) === 1` 은 무효다.** 이 함수가 1 로 자르던 것은
    // 최종 알파를 낸다는 전제였고, 지금은 **배수**를 낸다(자르는 자리는 `blobStops`).
    // 여기서 1 로 자르면 `?shdark` 의 1 초과 구간이 통째로 죽는다 — 기본값이 이미 1 이라
    // 노브가 한쪽으로만 열린다.
    expect(SHADOW_DENSITY).toBe(1);
    expect(densityFor('day', SHADOW_DENSITY)).toBe(1);
    expect(blobStops(SHADOW_SOFT, densityFor('day', SHADOW_DENSITY))[0].a)
      .toBeCloseTo(BLOB_CORE_ALPHA, 12);
  });

  it('1 초과 구간이 살아 있고 상한에서만 잘린다', () => {
    expect(densityFor('day', 1.3)).toBeCloseTo(1.3, 9);
    expect(densityFor('day', 99)).toBe(SHADOW_DENSITY_MAX);
    expect(densityFor('day', -5)).toBe(0);
  });
});

// ── 3회차(2026-08-11): 곱하기 합성 + 형태별 실루엣 ──────────────────────────
//
// 감독 지시 둘(*"포토샵 합성 기능으로 적용"* · *"형태가 사각형이면 사각형그림자"*)의 산술
// 부분이다. 픽셀로 실제 굽는 것은 배선 테스트가 본다 — 여기서는 그 픽셀이 타는 **식**만.

describe('⑤ 사각 실루엣의 거리 함수', () => {
  const H = 0.5;

  it('중심에서 0, 경계에서 반폭 — 원의 hypot 과 같은 척도다', () => {
    // `paintShaped` 가 `rad = OUTER_R + SD` 로 원과 같은 알파 곡선을 태운다. 그 전제가
    // "중심 SD = −반폭, 경계 SD = 0" 이다. 이게 깨지면 사각만 페이드가 어긋나고,
    // 증상은 "벤치 그림자만 진하다/옅다" 로만 드러난다.
    expect(roundBoxSD(0, 0, H, H, 0)).toBeCloseTo(-H, 9);
    expect(roundBoxSD(H, 0, H, H, 0)).toBeCloseTo(0, 9);
    expect(roundBoxSD(0, H, H, H, 0)).toBeCloseTo(0, 9);
    // 모서리 반경이 있어도 변의 중점은 여전히 경계다.
    expect(roundBoxSD(H, 0, H, H, H * 0.85)).toBeCloseTo(0, 9);
  });

  it('★ 모서리를 둥글리면 대각선 방향이 안쪽으로 들어온다 (감독: "많이 둥글게")', () => {
    // 이것이 "둥글다" 의 조작적 정의다. 각진 사각은 대각선 꼭짓점이 `√2·H` 까지 뻗지만,
    // 둥글리면 그보다 가까워진다. 반대로 **변의 중점은 안 움직인다** — 그래야 길쭉한
    // 알약이지 타원이 아니다.
    const sharpCorner = roundBoxSD(H, H, H, H, 0);
    const roundCorner = roundBoxSD(H, H, H, H, H * RECT_CORNER);
    expect(roundCorner).toBeGreaterThan(sharpCorner);
    // 변 중점은 반경과 무관하게 경계(0)다.
    expect(roundBoxSD(H, 0, H, H, H * RECT_CORNER)).toBeCloseTo(0, 9);
  });

  it('모서리 반경이 반폭을 넘어도 뒤집히지 않는다 — 짧은 변 기준으로 잘린다', () => {
    // `RECT_CORNER` 를 1 초과로 올리는 날 여기가 먼저 걸린다. 자르지 않으면 SD 가
    // 양수 영역으로 접혀 **중심이 바깥으로 판정**되고, 그림자가 도넛이 된다.
    const wide = roundBoxSD(0, 0, 1.0, 0.2, 99);
    expect(wide).toBeLessThan(0);
    expect(wide).toBeCloseTo(-0.2, 9);
  });

  it('가로세로가 다르면 긴 축으로 늘어난다 — 벤치가 알약이 되는 근거', () => {
    // 벤치 밑면 1.4×0.44(3.2:1). 짧은 축 경계가 긴 축 경계보다 훨씬 가깝다.
    const hx = 0.7; const hz = 0.22;
    expect(roundBoxSD(hx, 0, hx, hz, hz * RECT_CORNER)).toBeCloseTo(0, 9);
    expect(roundBoxSD(hz, 0, hx, hz, hz * RECT_CORNER)).toBeLessThan(0);
  });
});

describe('⑥ 알파 곡선 — 사각·얼룩이 원과 같은 페이드를 탄다', () => {
  it('스톱 셋을 그대로 재현한다 — 원형 그라디언트와 어긋나면 한 화면에 두 페이드가 산다', () => {
    const soft = SHADOW_SOFT; const dens = 1;
    const stops = blobStops(soft, dens);
    const curve = alphaCurve(soft, dens);
    for (const s of stops) expect(curve(s.t)).toBeCloseTo(s.a, 9);
  });

  it('스톱 사이를 선형 보간한다 — 캔버스 그라디언트가 하는 것과 같다', () => {
    const curve = alphaCurve(SHADOW_SOFT, 1);
    const mid = midStopFor(SHADOW_SOFT);
    const half = curve(mid * 0.5);
    expect(half).toBeCloseTo((BLOB_CORE_ALPHA + BLOB_MID_ALPHA) / 2, 6);
  });

  it('구간 밖을 자른다 — 음수·1 초과·NaN 이 알파로 새지 않는다', () => {
    const curve = alphaCurve(SHADOW_SOFT, 1);
    expect(curve(-1)).toBeCloseTo(BLOB_CORE_ALPHA, 9);
    expect(curve(2)).toBe(0);
    // NaN 은 0(=중심)으로 떨어진다. 그대로 흘리면 `addColorStop`·ImageData 가 깨진다.
    expect(Number.isFinite(curve(NaN))).toBe(true);
  });

  it('농도 0 이면 전 구간 0 — `?shdec=0` 이 실제로 투명하다', () => {
    const curve = alphaCurve(SHADOW_SOFT, 0);
    for (const s of [0, 0.3, 0.7, 1]) expect(curve(s)).toBe(0);
  });
});

describe('⑦ 잎 노이즈 — 결정론이어야 무늬가 안 춤춘다', () => {
  it('★ 같은 좌표면 언제나 같은 값이다 (굽기를 반복해도 무늬 불변)', () => {
    // `Math.random` 을 쓰면 감독이 농도 슬라이더를 미는 내내 나무 그림자가 바뀐다.
    for (const [u, v] of [[0.3, -1.7], [0, 0], [12.5, 8.25]] as const) {
      expect(leafNoise(u, v)).toBe(leafNoise(u, v));
    }
  });

  it('0~1 을 벗어나지 않는다 — 알파를 깎는 계수라 범위를 넘으면 부호가 뒤집힌다', () => {
    for (let i = 0; i < 400; i++) {
      const u = (i % 20) * 0.37 - 3.7;
      const v = Math.floor(i / 20) * 0.53 - 5.3;
      const n = leafNoise(u, v);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });

  it('★ 상수가 아니다 — 얼룩이 실제로 얼룩진다', () => {
    // 해시가 깨져 상수를 뱉으면 나무가 그냥 조금 옅은 원이 되고, 화면에서만 드러난다.
    const vals = new Set<number>();
    for (let i = 0; i < 60; i++) vals.add(leafNoise(i * 0.7, i * 1.3));
    expect(vals.size).toBeGreaterThan(30);
  });

  it('격자 경계에서 튀지 않는다 — smoothstep 이 이어 준다', () => {
    // 보간이 빠지면 칸 경계가 격자무늬로 보인다. 아주 가까운 두 점의 값 차가 작아야 한다.
    const a = leafNoise(2 - 1e-4, 3.3);
    const b = leafNoise(2 + 1e-4, 3.3);
    expect(Math.abs(a - b)).toBeLessThan(0.01);
  });
});

describe('⑧ 사각 데칼 자세 — 축별 반경 + 캐스터 회전', () => {
  it('축마다 다른 크기가 나온다 — 정사각으로 뭉개면 벤치가 벤치로 안 보인다', () => {
    const p = decalTransformRect(3, -4, 0.7, 0.22, 0);
    expect(p.x).toBe(3);
    expect(p.z).toBe(-4);
    expect(p.sx / p.sz).toBeCloseTo(0.7 / 0.22, 9);
    // 원형과 **같은 배수 계약**을 쓴다. 어긋나면 벤치 그림자만 크기가 튄다.
    expect(p.sx).toBeCloseTo(2 * 0.7 * BLOB_SCALE * DECAL_SCALE, 9);
  });

  it('★ 캐스터 회전을 따라간다 — 원형이 `ry:0` 인 것과 짝이다', () => {
    expect(decalTransformRect(0, 0, 1, 0.3, 1.234).ry).toBeCloseTo(1.234, 9);
    // 원형은 여전히 안 돈다(그 계약이 살아 있는지 함께 본다).
    expect(decalTransform(0, 0, 1).ry).toBe(0);
  });

  it('NaN·음수 반경을 0 으로 떨어뜨린다 — 인스턴스 행렬이 NaN 이면 화면이 검게 덮인다', () => {
    const p = decalTransformRect(0, 0, NaN, -3, NaN);
    expect(p.sx).toBe(0);
    expect(p.sz).toBe(0);
    expect(p.ry).toBe(0);
  });
});

describe('⑨ 합성 모드 상수', () => {
  it('★ 기본은 `normal` 이다 — 감독이 화면으로 뒤집었다 (2026-08-11)', () => {
    // ⚠ **이 단언은 뒤집혔다.** 직전 판본은 `toBe('multiply')` 였고 근거는 감독 지시
    // *"포토샵 합성 기능으로 적용"* 이었다. 배포 후 두 링크를 비교한 감독의 판정은
    // 반대였다 — *"2번이 자연스러운데."*(`?shblend=normal`).
    //
    // **수치가 맞는 것과 화면이 맞는 것은 다른 일이다.** 곱하기 산술은 여전히 옳고
    // (`⑦` 절이 두 모드가 같은 밝기를 냄을 픽셀로 확인한다), 그래서 경로는 남겼다.
    // 기본값만 화면 판정을 따른다.
    expect(SHADOW_BLEND).toBe('normal');
  });

  it('★ 되돌림 경로가 열려 있다 — WebGPU 에서 깨졌을 때의 유일한 수단', () => {
    // 이 저장소에는 `MultiplyBlending` 을 헤드리스로 검증할 축이 없다(확정 한계).
    // `normal` 이 목록에서 빠지면 감독 화면이 깨졌을 때 되돌릴 방법이 재배포뿐이 된다.
    expect(SHADOW_BLENDS).toContain('normal');
    expect(SHADOW_BLENDS).toContain('multiply');
  });
});
