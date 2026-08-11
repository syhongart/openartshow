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
  decalLocalZ, penumbraPlan, tailAlpha, styleOf,
  SHADOW_MAX_LEN, DENSITY_BY_TIME, SHADOW_PAD, DECAL_SCALE,
  SHADOW_STYLES, SHADOW_STYLE, SHADOW_SOFT_MAX, STYLE_PROFILES,
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

  it('스케일이 치수 × DECAL_SCALE 이다 — 여백을 상쇄한다', () => {
    // ⚠ **옛 단언은 `sx === span.width` 였다.** 약화한 것이 아니라 계약이 바뀌었다:
    // 2026-08-11 룩 재설계에서 실루엣이 캔버스 안쪽으로 `SHADOW_PAD` 만큼 물러났고
    // (그래야 알파가 0 으로 내려갈 자리가 생겨 가장자리가 안 끊긴다), 평면을 그만큼
    // 키워야 **실루엣의 월드 크기가 예전과 같아진다.** 아래 「행렬을 실제로 조립한다」
    // 절이 그 등가성을 실측으로 못 박는다 — 거기 단언값은 재설계 전과 **한 글자도 같다**.
    const span = shadowSpan(12, 2, g, SHADOW_MAX_LEN);
    const p = decalTransform(5, -3, span, g);
    expect(p.sx).toBeCloseTo(span.width * DECAL_SCALE, 6);
    expect(p.sz).toBeCloseTo(span.len * DECAL_SCALE, 6);
    // 폭·길이가 **같은 배수**로 커졌다 — 한쪽만 곱하면 실루엣이 찌그러진다.
    expect(p.sz / p.sx).toBeCloseTo(span.len / span.width, 6);
  });

  it('여백을 0 으로 두면 배수가 1 이다 — 상수가 실제로 소비된다', () => {
    // `DECAL_SCALE` 이 `SHADOW_PAD` 에서 유도됐는지 본다. 1.316 을 손으로 적어 두면
    // 여백을 바꿔도 안 따라오고, 증상은 "그림자가 실루엣보다 크다/작다" 뿐이다.
    expect(DECAL_SCALE).toBeCloseTo(1 / (1 - 2 * SHADOW_PAD), 12);
    expect(SHADOW_PAD).toBeGreaterThan(0); // 여백이 0 이면 재설계 전 결함으로 되돌아간다
    expect(SHADOW_PAD).toBeLessThan(0.25); // 절반을 넘으면 실루엣이 사라진다
  });
});

describe('decalLocalZ — 여백 좌표 변환', () => {
  it('실루엣 양 끝이 여백만큼 안쪽이다', () => {
    expect(decalLocalZ(0)).toBeCloseTo(SHADOW_PAD - 0.5, 12);
    expect(decalLocalZ(1)).toBeCloseTo(0.5 - SHADOW_PAD, 12);
  });

  it('단조 증가하고 중점이 0 이다 — 여백이 대칭이라는 계약', () => {
    expect(decalLocalZ(0.5)).toBeCloseTo(0, 12);
    expect(decalLocalZ(0.3)).toBeLessThan(decalLocalZ(0.7));
  });

  it('밑동 중심 오프셋이 여백과 무관하다 — decalTransform 이 back 을 안 고치는 근거', () => {
    // 이 등식이 깨지면 `decalTransform` 의 `back` 에도 여백 보정이 필요해진다.
    // 주석의 유도(`(0.5−pad)/(1−2pad) = 0.5`)를 산술로 다시 확인한다.
    for (const bf of [0.05, 0.21, 0.5, 1]) {
      const got = decalLocalZ(bf / 2) * DECAL_SCALE;
      expect(got).toBeCloseTo(-0.5 + bf / 2, 12);
    }
  });
});

describe('행렬을 실제로 조립한다 — 좌표 규약이 맞는가', () => {
  // `instancing.ts:171-178` 과 같은 조립: compose(위치, Y축 ry 쿼터니언, 스케일).
  // 눕힌 평면의 지오도 실제로 만들어 로컬 정점을 가져온다.
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

  /**
   * 데칼 평면 로컬 (0, 0, lz) 의 월드 위치.
   *
   * ⚠ `lz` 는 **평면 좌표**(−0.5 ~ +0.5)다. 실루엣 좌표(0=발밑, 1=끝)를 쓰려면
   * `decalLocalZ` 를 통과시켜야 한다 — 재설계 후 그 둘이 여백만큼 갈렸다.
   */
  function worldOf(pose: ReturnType<typeof decalTransform>, lz: number) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(pose.x, 0, pose.z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), pose.ry),
      new THREE.Vector3(pose.sx, 1, pose.sz),
    );
    return new THREE.Vector3(0, 0, lz).applyMatrix4(m);
  }

  it('실루엣 끝(캔버스 아래쪽=그림자 끝)이 태양 반대쪽으로 간다', () => {
    // 이 단언이 이 파일의 존재 이유다. `ry` 의 부호나 인자 순서가 뒤집히면 여기서만 깨진다.
    //
    // ⚠ **단언값은 재설계 전과 같다** — 바뀐 것은 `0.5` → `decalLocalZ(1)` 뿐이고,
    // 그것이 곧 "여백은 실루엣의 월드 크기를 바꾸지 않는다" 는 계약이다. 여백만 넣고
    // `DECAL_SCALE` 을 빠뜨리면 여기서 잡힌다(그림자가 24% 짧아진다).
    const g = sunGround(...Object.values(sunDir(0.78, DAY_EL)) as [number, number, number])!;
    const span = shadowSpan(12, 2, g, SHADOW_MAX_LEN);
    const pose = decalTransform(0, 0, span, g);
    const tip = worldOf(pose, decalLocalZ(1));
    // 끝점이 그림자 방향에 있고, 캐스터에서 (len − r) 만큼 떨어져 있다.
    expect(tip.x * g.ux + tip.z * g.uz).toBeCloseTo(span.len - span.width / 2, 4);
    // 그림자 방향과 **평행**하다 — 옆으로 새지 않았다.
    expect(tip.x * -g.uz + tip.z * g.ux).toBeCloseTo(0, 6);
  });

  it('실루엣 폭이 월드에서 span.width 그대로다 — 여백이 폭을 안 바꾼다', () => {
    // 세로만 보면 `sx` 에 `DECAL_SCALE` 을 안 곱해도 위 단언이 통과한다. 가로를 따로 본다.
    const g = sunGround(...Object.values(sunDir(0.78, DAY_EL)) as [number, number, number])!;
    const span = shadowSpan(12, 2, g, SHADOW_MAX_LEN);
    const pose = decalTransform(0, 0, span, g);
    // 실루엣 좌우 끝은 평면 로컬 x = ±(0.5 − SHADOW_PAD) 다(가로 여백도 같은 비).
    const half = (0.5 - SHADOW_PAD) * pose.sx;
    expect(half * 2).toBeCloseTo(span.width, 6);
  });

  it('실루엣 발밑 끝(캔버스 위쪽)이 캐스터 중심에서 반지름만큼 앞이다', () => {
    // 밑동이 물건에서 떨어져 나오는 결함을 이 단언이 잡는다.
    const g = sunGround(...Object.values(sunDir(2.1, SUNSET_EL)) as [number, number, number])!;
    const span = shadowSpan(8, 1.5, g, SHADOW_MAX_LEN);
    const pose = decalTransform(17, -4, span, g);
    // 밑동 원의 중심은 실루엣 좌표 t = blobFrac/2 다.
    const foot = worldOf(pose, decalLocalZ(span.blobFrac / 2));
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

// ── 룩 재설계(2026-08-11) — 감독 반려 *"딱딱하고 실제 그림자와 너무 달라"* ──────────
//
// 여기서 보는 것은 **룩이 예쁜가**가 아니다(그것은 화면 판정이고 감독 실기기가 유일한 축이다).
// 재설계가 겨눈 **네 결함이 원리상 되살아날 수 없는가**를 본다:
//   ① 확산이 여백을 넘으면 캔버스에서 잘려 하드컷이 돌아온다     → `spreadPx` 상한
//   ② 꼬리 끝 알파가 0 이 아니면 그 자리에서 뚝 끊긴다            → `tailAlpha(1) = 0`
//   ③ 알파가 선형이면 접지감이 안 산다                            → `tailPow` 소비
//   ④ 후보 셋이 실제로 다른 것을 주장하는가                      → 프로필 대조

describe('penumbraPlan — 반그림자 설계', () => {
  const RES = 128;
  /** 대표 밑동 반경 — 여백을 뺀 실루엣의 절반 */
  const RX = RES * (1 - 2 * SHADOW_PAD) * 0.5;
  const ALL = SHADOW_STYLES.map((n) => [n, styleOf(n)] as const);

  it('블러 꼬리(2σ)가 여백을 넘지 않는다 — ①이 되살아나지 않는다', () => {
    // 넘으면 블러가 캔버스에서 잘리고, 잘린 자리가 곧 감독이 반려한 하드컷이다.
    // 최외곽 등고선은 원본 실루엣과 같으므로(바깥 확장 없음) 여백 전체가 블러 몫이다.
    const room = SHADOW_PAD * RES;
    for (const [name, sp] of ALL) {
      for (const soft of [0, 0.05, 0.2, SHADOW_SOFT_MAX, SHADOW_SOFT_MAX * 2]) {
        const p = penumbraPlan(soft, RES, RX, sp);
        expect(2 * p.blur, `${name} soft=${soft}`).toBeLessThanOrEqual(room + 1e-9);
      }
    }
  });

  it('블러가 등고선 간격을 실제로 메운다 — 계단이 경계로 읽히지 않는다', () => {
    // 첫 판본은 블러가 간격의 27%뿐이라 겹 계단이 그대로 보였고, 그것이 확대 렌더에서
    // "밑동 좌우가 직선" 으로 나타났다. 블러 σ 가 간격의 절반은 되어야 한다.
    for (const [name, sp] of ALL) {
      const p = penumbraPlan(SHADOW_SOFT_MAX, RES, RX, sp);
      const step = p.inner / (Math.round(sp.layers) - 1);
      expect(p.blur, `${name}`).toBeGreaterThan(step * 0.5);
    }
  });

  it('반그림자가 실루엣의 상당 폭을 차지한다 — 첫 판본이 실패한 이유를 못 박는다', () => {
    // 첫 판본은 여백에서만 반그림자를 냈고 4.6px(셀의 3.6%)뿐이라 눈에 안 들어왔다.
    // 안쪽으로 쓰면 예산이 실루엣 크기에 비례해 여백을 늘리지 않고도 넓어진다.
    for (const [name, sp] of ALL) {
      const p = penumbraPlan(SHADOW_SOFT_MAX, RES, RX, sp);
      expect(p.inner / RX, name).toBeGreaterThan(0.2);   // 실루엣 반경의 20% 이상
      expect(p.inner, name).toBeGreaterThan(SHADOW_PAD * RES); // 여백보다도 넓다
    }
  });

  it('soft 가 손잡이 전 구간에서 살아 있다 — 노브가 죽지 않는다', () => {
    const sp = styleOf('soft');
    const at = (v: number) => penumbraPlan(v, RES, RX, sp).inner;
    expect(at(0)).toBe(0); // 0 이면 하드 실루엣
    expect(at(SHADOW_SOFT_MAX * 0.25)).toBeGreaterThan(0);
    expect(at(SHADOW_SOFT_MAX * 0.5)).toBeGreaterThan(at(SHADOW_SOFT_MAX * 0.25) * 1.5);
    expect(at(SHADOW_SOFT_MAX)).toBeGreaterThan(at(SHADOW_SOFT_MAX * 0.5) * 1.5);
    // soft=0 이면 블러도 없다 — 완전한 하드 실루엣으로 되돌아간다.
    expect(penumbraPlan(0, RES, RX, sp).blur).toBe(0);
  });

  it('해상도에 비례한다 — `?shres` 를 낮춰도 상대적 룩이 같다', () => {
    const sp = styleOf('soft');
    const half = penumbraPlan(0.3, 64, RX / 2, sp);
    const full = penumbraPlan(0.3, 128, RX, sp);
    expect(half.inner * 2).toBeCloseTo(full.inner, 9);
    expect(half.blur * 2).toBeCloseTo(full.blur, 9);
  });

  it('코어를 완전히 지우지 않는다 — 등고선 스택이 무너지지 않게', () => {
    for (const [name, sp] of ALL) {
      // `penumbra` 를 1 이상으로 잘못 적어도 코어가 남아야 한다.
      expect(penumbraPlan(SHADOW_SOFT_MAX, RES, 50, { ...sp, penumbra: 5 }).inner, name)
        .toBeLessThan(50);
      expect(penumbraPlan(SHADOW_SOFT_MAX, RES, 50, sp).inner, name).toBeLessThan(50);
    }
  });

  it('반경 0 에서 죽지 않는다 — NaN 이 텍스처로 구워지지 않게', () => {
    const p = penumbraPlan(0.3, RES, 0, styleOf('soft'));
    expect(Number.isFinite(p.inner)).toBe(true);
    expect(Number.isFinite(p.blur)).toBe(true);
  });
});

describe('tailAlpha — 꼬리 감쇠', () => {
  it('끝에서 정확히 0 이다 — ②가 되살아나지 않는다', () => {
    // `shtail` 이 무엇이든 끝이 0 이어야 한다. 옛 판본은 `tail` 값 그대로 끊겼다.
    for (const tail of [0, 0.2, 0.5, 1]) {
      expect(tailAlpha(1, tail, 1.6), `tail=${tail}`).toBe(0);
      expect(tailAlpha(0.999, tail, 1.6)).toBeLessThan(0.02);
    }
  });

  it('밑동에서 1 이고 단조 감소한다', () => {
    expect(tailAlpha(0, 0.2, 1.6)).toBeCloseTo(1, 9);
    let prev = Infinity;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = tailAlpha(t, 0.2, 1.6);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      prev = v;
    }
  });

  it('tailPow 를 실제로 소비한다 — ③ 선형 감쇠로 되돌아가지 않는다', () => {
    // 지수를 무시하면 두 값이 같아진다. 큰 지수일수록 중간에서 더 옅어야 한다.
    const gentle = tailAlpha(0.4, 0, 1);
    const steep = tailAlpha(0.4, 0, 2.6);
    expect(steep).toBeLessThan(gentle * 0.75);
    // 지수 1 은 (페이드 구간 밖에서) 선형이다 — 기준점을 못 박는다.
    expect(tailAlpha(0.4, 0, 1)).toBeCloseTo(0.6, 9);
  });

  it('tail 바닥값을 실제로 소비한다', () => {
    // 바닥이 높으면 같은 지점에서 더 진하다. 인자를 버리면 두 값이 같아진다.
    expect(tailAlpha(0.5, 0.6, 1.6)).toBeGreaterThan(tailAlpha(0.5, 0, 1.6));
  });
});

describe('룩 후보 셋 — 서로 다른 것을 주장하는가', () => {
  it('목록·기본값이 서로 맞는다', () => {
    expect(SHADOW_STYLES).toContain(SHADOW_STYLE);
    for (const n of SHADOW_STYLES) expect(STYLE_PROFILES[n]).toBeDefined();
    expect(Object.keys(STYLE_PROFILES).sort()).toEqual([...SHADOW_STYLES].sort());
  });

  it('알 수 없는 이름은 기본 룩으로 떨어진다 — 화면이 조용히 비지 않는다', () => {
    expect(styleOf('없는룩')).toBe(STYLE_PROFILES[SHADOW_STYLE]);
    expect(styleOf('')).toBe(STYLE_PROFILES[SHADOW_STYLE]);
  });

  it('셋이 축에서 실제로 갈린다 — 이름만 다른 같은 값이 아니다', () => {
    const s = styleOf('soft'), c = styleOf('contact'), d = styleOf('diffuse');
    // `contact` 는 접지부를 가장 조인다(= 발밑이 가장 또렷하다).
    expect(c.contactTight).toBeLessThan(s.contactTight);
    // `diffuse` 는 접지부와 끝이 같은 폭이다(= 완전그늘이 없다).
    expect(d.contactTight).toBeGreaterThanOrEqual(1);
    // `contact` 는 꼬리가 가장 빨리 사라진다.
    expect(c.tailPow).toBeGreaterThan(s.tailPow);
    expect(s.tailPow).toBeGreaterThan(d.tailPow);
    // `diffuse` 가 가장 옅다.
    expect(d.core).toBeLessThan(s.core);
    expect(s.core).toBeLessThanOrEqual(c.core);
  });

  it('모든 룩의 값이 정의역 안이다 — 화면이 아니라 여기서 잡는다', () => {
    for (const n of SHADOW_STYLES) {
      const p = styleOf(n);
      expect(p.layers, n).toBeGreaterThanOrEqual(2);
      expect(p.core, n).toBeGreaterThan(0);
      expect(p.core, n).toBeLessThanOrEqual(1);
      expect(p.umbraTaper, n).toBeGreaterThanOrEqual(0);
      expect(p.umbraTaper, n).toBeLessThanOrEqual(1);
      expect(p.tailPow, n).toBeGreaterThan(0);
      expect(p.blurK, n).toBeGreaterThanOrEqual(0);
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
