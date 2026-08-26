// sky.js — 오픈월드 하늘 연출 시스템 v2 (감독 신 모드 · 팀장 직접 재설계)
// -----------------------------------------------------------------------------
// [감독] "하늘 엔진 절대 대충하지 마라. 하늘이 저급하면 다 저급해진다."
// v2 재설계 핵심(팀장 자체 검토 10항 반영):
//   ① 방위 시스템 — 태양·달이 하늘의 실제 위치에 그려지고(일몰=지평선 글로우), 조명 방향과 일치
//   ② 밴딩 제거 — 고해상 돔(2048×1024, 저사양 1024×512) + 노이즈 디더링
//   ③ 구름 2패스 음영(평탄 밑면+상부 하이라이트) + 원경 층운 / 먹구름 층 밴드
//   ④ 은하수 — 암흑대(dark rift)·웜 코어/쿨 엣지·밝은 별 십자 광망 / 달 크레이터+위상
//   ⑤ 비 = LineSegments 빗줄기(점 아님) / 눈 = Points 유지
//   ⑥ 무지개 — 부드러운 스펙트럼 + 알렉산더 밴드 + 희미한 2차 무지개
//   ⑦ 오로라 — 수직 스트리크 텍스처 × 버텍스 색(하단 그린 엣지→상단 퍼플 소멸)
//   ⑧ 전환 — 이중 돔 크로스페이드(기본 1.8s) + 조명·fog lerp(신 모드 조정이 영화적으로)
//   ⑨ 지평선 정합 — 돔 최하단색 = fog색 = clear색 강제 일치(이음새 제거)
//   ⑩ 시간대 훅 — onApply(state, L) 콜백으로 가로등·창 발광·envMap 강도를 배선측에서 연동
// 전부 절차 생성(외부 이미지·오디오 0). 결정론(시드 고정) — 모든 방문자 동일 하늘.
//
//   createSkySystem({ scene, renderer, sun, hemi, sky, getPos, soft, onApply })
//     → { set(state, {fade}), get(), update(dt), getSunDir(), setLite(on), bolt(),
//         prewarm(), dispose, SKY_TIMES, SKY_WEATHERS }
// 조합 보정: 무지개=주간·일몰×비강수만 / 오로라=야간 맑음만 / 은하수·별=야간 맑음(먹구름 가림).
// -----------------------------------------------------------------------------
import * as THREE from 'three';

export const SKY_TIMES = ['day', 'sunset', 'night'];
export const SKY_WEATHERS = ['clear', 'overcast', 'rain', 'snow'];

// 태양 방위(정규화 0..1, 돔 텍스처 u축과 일치) — 서쪽 하늘에 걸리는 노을(고정 연출값).
const SUN_AZ = 0.78;
const MOON_AZ = 0.30;
// 구(SphereGeometry) UV 정합 실측: 텍스처 u가 그려지는 월드 방위 yaw = u·2π − π/2.
// (하네스 스윕으로 실측 검증 — getSunDir·무지개 배치는 반드시 이 변환을 거친다.)
const azWorld = (u) => u * Math.PI * 2 - Math.PI / 2;

// 시간대×날씨 → 조명·안개 테이블. fog는 ⑨규칙에 따라 돔 최하단색과 동일하게 유지할 것.
const LIGHT = {
  day: {
    clear:    { sun: 0xfff2dc, sunI: 0.95, hemiS: 0xcfe4f7, hemiG: 0x8fa385, hemiI: 1.0,  fog: 0xe9eef2, sunEl: 0.45 },
    overcast: { sun: 0xdfe3e8, sunI: 0.35, hemiS: 0xb9c2cc, hemiG: 0x7d8578, hemiI: 0.9,  fog: 0xc3cad2, sunEl: 0.45 },
    rain:     { sun: 0xc9d2dc, sunI: 0.25, hemiS: 0x9fa9b5, hemiG: 0x6d7570, hemiI: 0.85, fog: 0xa7b0ba, sunEl: 0.45 },
    snow:     { sun: 0xe8ecf2, sunI: 0.4,  hemiS: 0xcdd6e0, hemiG: 0x9aa39c, hemiI: 0.95, fog: 0xd4dbe3, sunEl: 0.45 },
  },
  sunset: {
    clear:    { sun: 0xffa25e, sunI: 0.9,  hemiS: 0xe8b48a, hemiG: 0x7a6a58, hemiI: 0.85, fog: 0xf2c9a2, sunEl: 0.06 },
    overcast: { sun: 0xc9a284, sunI: 0.3,  hemiS: 0xa8968a, hemiG: 0x6d635a, hemiI: 0.8,  fog: 0xb5a292, sunEl: 0.06 },
    rain:     { sun: 0xb08a74, sunI: 0.22, hemiS: 0x8d7f76, hemiG: 0x5d554e, hemiI: 0.75, fog: 0x97887c, sunEl: 0.06 },
    snow:     { sun: 0xd8b49a, sunI: 0.35, hemiS: 0xc0aa9a, hemiG: 0x847a6e, hemiI: 0.85, fog: 0xd0b9a5, sunEl: 0.06 },
  },
  night: {
    clear:    { sun: 0xaebfe0, sunI: 0.24, hemiS: 0x39445c, hemiG: 0x232a24, hemiI: 0.55, fog: 0x3d4762, sunEl: 0.5, moon: true },
    overcast: { sun: 0x6d7890, sunI: 0.12, hemiS: 0x2c3340, hemiG: 0x1d211d, hemiI: 0.5,  fog: 0x272d3a, sunEl: 0.5, moon: true },
    rain:     { sun: 0x5d6880, sunI: 0.1,  hemiS: 0x272d3a, hemiG: 0x191d1a, hemiI: 0.48, fog: 0x1f2530, sunEl: 0.5, moon: true },
    snow:     { sun: 0x8894b0, sunI: 0.16, hemiS: 0x333b4c, hemiG: 0x242923, hemiI: 0.55, fog: 0x2e3547, sunEl: 0.5, moon: true },
  },
};

// ── 안개 하늘색 틴트 (감독 지시: *"안개를 약간 하늘색으로 하면 어떨까"*) ──────────
//
// 안개색은 위 테이블이 SSOT 이고, ⑨ 규칙에 따라 **돔 최하단(지평선)도 같은 색**이다.
// 그래서 `scene.fog.color` 만 나중에 바꾸면 지평선과 어긋나 원경이 하늘보다 밝게 뜬다 —
// world2 에서 실제로 그렇게 깨뜨렸고 감독이 *"안개가 안보여"* 로 잡았다. 색을 옮기려면
// **팔레트 단계에서** 옮겨야 둘이 함께 움직인다.
//
// 이 파일은 라이브 `world.js` 와 공유하므로 테이블을 직접 고치지 않는다. 계수를 **주입**
// 받고 기본값 0 이면 원본을 그대로 돌려준다 — 옵션을 안 넘기는 소비자는 무변경이다.

/** 안개가 수렴하는 목표색. 원거리 대기가 레일리 산란으로 푸르게 보이는 것의 근사 */
export const FOG_SKY = 0x7fb2e5;

/** 두 hex 색을 `k`(0..1) 만큼 섞는다. 채널별 선형 보간 */
function mixHex(a, b, k) {
  const m = (sh) => {
    const av = (a >> sh) & 255, bv = (b >> sh) & 255;
    return Math.round(av + (bv - av) * k) & 255;
  };
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

/**
 * 안개 하늘색 계수 — 숫자면 전 시간대 공통, 객체면 시간대별.
 *
 * 이 파일은 `.js` 라 타입이 **기본값에서 추론된다** — `tint = 0` 만 두면 TS 가 `number`
 * 로 굳혀 객체를 넘기는 호출부가 전부 에러가 된다(실제로 그렇게 났다). 그래서 별칭을
 * 명시한다. 값 목록(`day`·`sunset`·`night`)을 여기 적지 않는 것은 `LIGHT` 테이블이
 * 시간대의 SSOT 이기 때문이다 — 여기에 적으면 시간대가 늘어나는 날 이 줄만 남는다.
 *
 * @typedef {number | { [k: string]: number | undefined }} FogTintArg
 */

/**
 * `tint` 를 **그 시간대의 계수**로 푼다.
 *
 * @param {FogTintArg} tint
 * @param {string} time
 * @returns {number}
 *
 * 숫자면 전 시간대에 같은 값(옛 뜻 — 이 인자의 첫 판본이 그랬고 라이브 `world.js` 는
 * 지금도 아무것도 안 넘긴다). 객체면 `{ day, sunset, night }` 중 그 시간대의 값이다.
 *
 * ⚠ **뜻이 둘이 아니다.** 이 인자의 뜻은 언제나 *"시간대별 계수"* 이고 숫자는 그것의
 * 축약형이다 — 세 시간대에 같은 값을 적는 것과 같다. 뜻이 둘이면 다음 사람이 어느
 * 쪽인지 매번 되짚어야 하고, 그것이 값 미러링과 같은 형태의 사고를 만든다.
 */
function tintAt(tint, time) {
  if (typeof tint === 'number') return tint;
  return tint?.[time] ?? 0;
}

/**
 * 시간대×날씨 팔레트. `tint`만큼 안개를 `FOG_SKY` 쪽으로 민다.
 *
 * `tint` 가 0(기본)이면 **테이블 객체를 그대로** 돌려준다 — 사본조차 만들지 않으므로
 * 기존 소비자의 동작이 한 톨도 달라지지 않는다.
 *
 * ── 왜 시간대별인가 (감독 판정 2026-08-12) ──────────────────────────────────
 * 이 인자는 처음에 **스칼라**였고, 그 옆 주석(`FOG_SKY_TINT`)이 이렇게 적고 있었다:
 *
 *   *"물리적으로도 이 방향이 맞다 — 원거리 대기는 레일리 산란으로 푸르게 수렴한다.
 *   그래서 시간대를 가리지 않고 전 팔레트에 같은 계수를 건다. 밤만 손대면 낮·노을과
 *   톤이 갈리고, 그건 '약간 하늘색'이 아니라 '밤만 다른 세계'가 된다."*
 *
 * **감독이 화면을 보고 정확히 그 반대로 판정했다** — *"주간일때는 흰색말고 하늘색어때"*
 * → 확인 후 *"야간은 원래가 좋아. 연기 파란거 말고. 주간/야간 따로 가야해."*
 *
 * 내 규정이 왜 틀렸나: 레일리 산란이 푸른 것은 **햇빛이 대기를 통과할 때**다. 밤에는
 * 그 광원이 없다 — 밤하늘이 검은 것과 같은 이유다. 그러니 밤 안개를 하늘색으로 미는
 * 것은 물리의 연장이 아니라 **물리를 시간대에 상관없이 적용한 오류**였다. 화면에서는
 * 그것이 감독 표현대로 *"파란 연기"* 로 읽혔다. "톤이 갈린다" 는 걱정도 빗나갔다 —
 * 낮과 밤은 애초에 팔레트가 통째로 다르고, 갈리는 것이 정상이다.
 *
 * **경계**: 노을(`sunset`)은 감독이 판정하지 않았다. 기본을 0 으로 두는 것은 밤의
 * 근거를 준용한 것이다(해가 지평선에 걸린 시간대의 정체성은 따뜻한 주황이고, 거기에
 * 하늘색을 섞으면 그 축이 탁해진다 — 밤에서 잡힌 것과 같은 형태). 화면 판정이
 * 필요하면 `?fogskys=` 로 켠다. 이 값을 추측으로 채우지 않는다.
 *
 * @param {string} time
 * @param {string} weather
 * @param {FogTintArg} [tint]
 */
export function lightOf(time, weather, tint = 0) {
  const L = LIGHT[time][weather];
  const k = tintAt(tint, time);
  if (!(k > 0)) return L;
  return { ...L, fog: mixHex(L.fog, FOG_SKY, Math.min(1, k)) };
}

const seeded = (s0) => { let s = s0 | 0; return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

// ── 돔 페인터 서브루틴 ────────────────────────────────────────────────────────

// 수평 wrap 대응 radial glow — 양끝 이음새가 없도록 x-W·x·x+W 세 번 그린다.
function glowWrapped(ctx, W, x, y, r, stops) {
  for (const ox of [-W, 0, W]) {
    const g = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, r);
    for (const [t, c] of stops) g.addColorStop(t, c);
    ctx.fillStyle = g; ctx.fillRect(x + ox - r, y - r, r * 2, r * 2);
  }
}

// 지수 감쇠 글로우 스톱 생성 — 스톱 2~3개짜리 그라디언트가 만드는 마하 밴딩(동심원 호) 방지.
// c0(중심색)→c1(가장자리색)으로 색을 보간하며 알파를 (1-t)^gamma로 촘촘히 감쇠.
function glowStops(c0, c1, a0, gamma = 2.2, n = 10) {
  const st = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = (c0[0] + (c1[0] - c0[0]) * t) | 0, g = (c0[1] + (c1[1] - c0[1]) * t) | 0, b = (c0[2] + (c1[2] - c0[2]) * t) | 0;
    st.push([t, `rgba(${r},${g},${b},${(a0 * Math.pow(1 - t, gamma)).toFixed(3)})`]);
  }
  return st;
}

// ── 절차 노이즈(값 노이즈 fBm) ────────────────────────────────────────────────
// 원반(radial) 붓질 구름은 동그라미 뭉침이 얼굴처럼 보이고(파레이돌리아) 에어브러시처럼
// 인위적이라는 감독 지적 — 프랙탈 노이즈 밀도장 기반으로 근본 교체. 수평 주기는 격자
// 인덱스 모듈로로 정확히 wrap(u=0/1 이음새 0).
function makeNoise(rnd, size) {
  const g = new Float32Array(size * size);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (x, y, xper) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const i0 = ((xi % xper) + xper) % xper, i1 = (i0 + 1) % xper;
    const j0 = ((yi % size) + size) % size, j1 = (j0 + 1) % size;
    const a = g[j0 * size + (i0 % size)], b = g[j0 * size + (i1 % size)];
    const c = g[j1 * size + (i0 % size)], d = g[j1 * size + (i1 % size)];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
// u∈[0,1) 가로 1회 wrap 기준 fBm. P = 기본 옥타브의 격자 주기(정수 — 이음새 보장).
function fbm(n, u, v, oct, P) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let o = 0; o < oct; o++) { s += amp * n(u * P * f, v * P * f, P * f); norm += amp; amp *= 0.5; f *= 2; }
  return s / norm;
}

// ── 구름 원근: 지구는 둥글다 (감독 지시 2026-08-12) ──────────────────────────
//
// 감독: *"실제로는 지구는 둥글고 구름은 지구를 중심으로 구형으로 있어서. 하늘의 구름이
// 지금과 다르게 보여."*
//
// 옛 구름장은 노이즈를 **각도 좌표에 그대로** 그렸다 — 고도 10°든 60°든 구름 알갱이가
// 같은 크기다. 실제 하늘은 구름이 고도 `h` 의 **층**에 깔려 있고, 시선이 낮아질수록 그
// 층을 얕게 자르므로 같은 각도 안에 훨씬 먼 거리가 담긴다. 그래서 구름이 지평선 쪽으로
// 갈수록 촘촘히 압축되며 수렴한다.
//
// **곡률이 결정적인 이유**: 땅이 평평하면 수평거리가 `h/tanθ` 라 θ→0 에서 **발산**한다
// (지평선에서 구름이 무한히 뭉개진다). 둥근 지구에서는 시선이 구름 구면과 반드시 만나므로
// 유한한 값 `√(2Rh)` 에 **수렴**한다 — 실제 하늘에서 구름장이 지평선에 닿아 딱 끊기며
// 가장자리를 만드는 것이 이것이다. 감독이 화면에서 없다고 한 것도 그 끊김이다.
//
// 시선(고도각 θ)과 구름 구면(반지름 R+h)의 교점까지 거리:
//     d = −R·sinθ + √(R²sin²θ + 2Rh + h²)
// 그 지점의 수평 오프셋 `x = d·cosθ` 를 노이즈 좌표로 쓴다. `ε = h/R` 로 무차원화하면
// R 이 소거되어 **구름 고도비 하나**가 룩을 정한다.
//
// ⚠ **세로(고도)만 휜다.** 가로도 같은 배수로 압축하는 것이 물리적으로 맞지만, `u` 는
// 방위각이라 equirect 돔에서 **360° 로 감겨야 한다**(`wrapS = RepeatWrapping`). 스케일을
// 곱하면 이음매가 갈라진다. 그래서 가로 압축은 **못 한다** — 룩의 핵인 "지평선으로 층이
// 몰리는 것"은 세로 축이 만들고, 가로는 그대로 둔다. 이 한계를 지우지 마라.
// 구름 고도 / 지구 반경.
//
// ⚠ **실제 값(적운 2km / 6371km = 3.1e-4)을 그대로 쓰면 화면이 깨진다** — 감독 실기기
// 2026-08-12: *"구름이 뒤로... 쭉 늘어진. 구름 형태야."* 물리적으로는 맞다. 지평선까지가
// 구름 고도의 **√(2/ε) ≈ 80배**라 고도 45° 의 구름조차 전체 스케일의 1/80 자리로 밀리고,
// 그 구간의 2D 노이즈가 세로로 **80배 확대**되어 줄무늬가 된다.
//
// 실제 하늘이 그렇게 안 보이는 이유는 구름이 **3D 볼륨**이라 확대돼도 형태가 유지되기
// 때문이다. 우리는 2D 노이즈를 늘리므로 같은 배수에서 룩이 무너진다 — **물리가 맞아도
// 화면이 틀리면 그것은 틀린 것이다**(감독이 잔디 형광 때 이미 가르쳐 준 축이다).
//
// 그래서 기본값을 **체감 고도**로 올린다. 작을수록 지평선이 멀어 보이고(늘어짐 ↑),
// 클수록 완만하다. 실제 값은 `?cloudh=0.0003` 으로 여전히 볼 수 있다.
const CLOUD_EPS = 0.05;

/**
 * 구름 노이즈의 **세로 샘플 좌표**. `v` 는 0=천정 → 1=지평선.
 *
 * `curve=0` 이면 옛 동작(`v/2`, 각도에 선형)과 **정확히 같다** — 되돌림 링크의 근거다.
 * `curve=1` 이면 위 구면 교차로 완전히 휜다. 양 끝(천정·지평선)은 두 경로가 일치하고
 * 중간 고도만 지평선 쪽으로 밀린다.
 *
 * @param {number} v 0=천정, 1=지평선
 * @param {number} curve 0..1 곡률 강도
 * @returns {number} 노이즈 세로 좌표(옛 코드의 `yl` 과 같은 범위 0..0.5)
 */
export function cloudElev(v, curve, eps = CLOUD_EPS) {
  const lin = v / 2;
  if (!(curve > 0)) return lin;
  const th = (1 - v) * Math.PI / 2;
  const s = Math.sin(th), e = eps > 0 ? eps : CLOUD_EPS;
  const x = (-s + Math.sqrt(s * s + 2 * e + e * e)) * Math.cos(th) / e;
  const xMax = Math.sqrt(2 * e + e * e) / e; // θ=0 — 지평선까지 √(2Rh)/h
  const cur = (x / xMax) * 0.5;
  return lin + (cur - lin) * Math.min(1, curve);
}

// ── 낮 하늘 파랑 (감독 지시 2026-08-12: *"지금 하늘 색이 파랗지 않아"*) ────────
//
// 옛 스톱은 천정에만 파랑이 있었다: `#3f86c8` → 0.62 `#8cbae0` → 0.93 `#bdd6ea` → 안개색.
// **화면에 실제로 보이는 하늘은 대부분 v=0.5~1 구간**이고(눈높이에서 위를 거의 안 본다),
// 그 대역이 이미 흰기 지배라 하늘이 파랗게 읽히지 않았다. 옛 주석은 *"파랑을 지평선
// 가까이까지 끌어내려"* 라고 적고 있었으나 값이 그 문장을 따라오지 않았다.
//
// ⚠ **채도를 올리는 것이 아니라 파랑을 낮은 고도까지 유지하는 것**이 처방이다. 천정만
// 더 진하게 만들면 화면에서 보이지도 않는 자리가 바뀌고 시야 대역은 그대로다.
const DAY_STOPS_OLD = [[0, 0x3f86c8], [0.62, 0x8cbae0], [0.93, 0xbdd6ea]];
// ⚠ 첫 판본은 `[0x2f6fb8, 0x69a6da, 0xa8cae6]` 이었고 **테스트가 반려했다** — 옛 색과
// 청-적 차이가 137 로 **똑같았다.** 세 채널을 나란히 낮춰 그냥 어두워졌을 뿐이고,
// "밝기만 낮추면 파래지지 않는다" 는 이 저장소가 이미 적어 둔 문장을 그대로 밟았다.
// 지금 값은 **빨강을 낮추고 파랑은 지킨다** — 청-적 차이 137→167 / 84→125 / 45→78.
const DAY_STOPS_BLUE = [[0, 0x2678cd], [0.62, 0x5fa0dc], [0.93, 0x96bee4]];

/**
 * 낮·맑음 하늘의 수직 그라디언트 스톱.
 *
 * `blue=0` 이면 옛 값과 **바이트 단위로 같다**(되돌림 링크의 근거). `blue=1` 이 새 기본,
 * `blue>1` 은 외삽이라 더 진해진다 — 감독이 화면에서 고르는 축이다.
 *
 * @param {number} blue 0..1.5
 * @param {number[]} fogRGB 지평선 스톱(안개색) — 이음새 제거의 핵이라 그대로 둔다
 */
export function dayStops(blue, fogRGB) {
  const k = Math.max(0, blue);
  const out = DAY_STOPS_OLD.map(([t, oldHex], i) => {
    const a = rgb(oldHex), b = rgb(DAY_STOPS_BLUE[i][1]);
    return [t, a.map((c, j) => Math.max(0, Math.min(255, Math.round(c + (b[j] - c) * k))))];
  });
  out.push([1, fogRGB]);
  return out;
}

// 노이즈 구름장 — 저해상 밀도장(D)을 만들고 상하 밀도차로 자기음영(위가 옅으면 = 구름
// 윗면 = 밝음)한 뒤 돔 상반부에 확대 합성. mode: 'cumulus'(맑은 하늘 조각구름 밴드) /
// 'layer'(먹구름·눈구름 전천 구조).
function paintCloudLayer(ctx, rnd, W, Hh, o) {
  const LW = o.soft ? 256 : 512, LH = LW >> 1;
  const n = makeNoise(rnd, 64);
  const D = new Float32Array(LW * LH);
  for (let y = 0; y < LH; y++) {
    const v = y / LH; // 0=천정 → 1=지평선
    // 종 모양 분포 — 시점에서 실제로 보이는 중간 고도(v 0.3~0.75)에 구름이 오도록.
    // 천정 15%(고도 76°+)는 비움 — 극점 수렴으로 구름이 부챗살·체크무늬로 뭉개진다(상방 실측).
    const prof = o.mode === 'cumulus'
      ? Math.min(1, Math.max(0, (v - 0.15) / 0.2)) * (1 - Math.max(0, (v - 0.9) / 0.1) * 0.55)
      : (1 - Math.max(0, (v - 0.78) / 0.22) * 0.85) * Math.min(1, Math.max(0, (v - 0.02) / 0.1));
    if (prof <= 0) continue;
    // ⚠ y 루프에서 **한 번만** 계산한다. x 루프 안에 두면 512×256 = 131k 회가 되고,
    // 값은 x 에 의존하지 않으므로 전부 같은 수를 다시 구하는 것이다.
    const yl = cloudElev(v, o.curve ?? 0, o.eps);
    for (let x = 0; x < LW; x++) {
      const u = x / LW;
      let field;
      if (o.mode === 'cumulus') {
        const mask = fbm(n, u, yl + 37, 3, 6);  // 저주파 — 구름 덩어리 배치(중형 다수)
        const det = fbm(n, u, yl, 5, 11);       // 고주파 — 가장자리 디테일(더 잘게 부숴 조각감)
        // 저고도 커버리지 보너스 축소 — 지평선을 다 덮어 "뭉친" 느낌 주던 것(감독 지적) 완화.
        field = mask * 0.64 + det * 0.36 + Math.max(0, v - 0.45) * 0.05;
      } else {
        field = fbm(n, u, yl, 5, 5);
      }
      let d = Math.max(0, Math.min(1, (field - o.thr) / o.softEdge));
      d = d * d * (3 - 2 * d);
      D[y * LW + x] = d * prof;
    }
  }
  const off = document.createElement('canvas'); off.width = LW; off.height = LH;
  const octx = off.getContext('2d');
  const im = octx.createImageData(LW, LH);
  const px = im.data;
  for (let y = 0; y < LH; y++) {
    const yu = Math.max(0, y - 2);
    for (let x = 0; x < LW; x++) {
      const i = y * LW + x, here = D[i];
      if (here <= 0.003) continue;
      const light = Math.max(0, Math.min(1, 0.55 + (here - D[yu * LW + x]) * 2.6));
      const j = i * 4;
      px[j] = o.shade[0] + (o.tint[0] - o.shade[0]) * light;
      px[j + 1] = o.shade[1] + (o.tint[1] - o.shade[1]) * light;
      px[j + 2] = o.shade[2] + (o.tint[2] - o.shade[2]) * light;
      px[j + 3] = Math.min(255, here * o.alphaMax * 255);
    }
  }
  octx.putImageData(im, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, 0, 0, LW, LH, 0, 0, W, Hh);
  ctx.restore();
}

// ── ② 밴딩 파괴 — **양자화 직전** 디더 (감독 "그레인 노이즈가 보여", 2026-08-03) ──────
//
// 예전 판본은 `getImageData` 로 읽어들인 **8비트 픽셀에 ±2~±4 를 더했다.** 그것이 틀린
// 지점이었다. canvas 의 `createLinearGradient` 는 **이미 자체 디더를 하고 있다** — 그래서
// 양자화가 끝난 값에 노이즈를 얹으면 디더로서는 아무 일도 안 하고 **그레인만 남는다.**
//
// 디자이너 실측(배경 면만·모바일 780×1688 dpr2·밤 맑음)이 그것을 수치로 보였다:
//
//   판본            중주파 그레인   저주파 얼룩   밴딩 B_row
//   ±2 (직전 배포)     0.4204       0.3921       0.0936   ← 그레인 최대인데 밴딩도 최악
//   dither 제거        0.1128       0.0784       0.0778
//   **이 판본**        0.1222       0.1090       **0.0463**
//
// 즉 직전 배포는 **두 축 모두에서 열등**했다. 노이즈를 더 넣고도 밴딩이 더 나빴다.
// 진폭을 낮추는 문제가 아니라 **넣는 지점**의 문제다 — 양자화 **전** float 값에 더하면
// 필요 진폭이 1 LSB(±0.5)로 떨어지고, 그레인이 1/3.4 가 되면서 밴딩은 절반이 된다.
//
// 단순 제거(가운데 행)를 안 고른 이유: **낮에 밴딩이 돌아온다.** 가로 정렬도가
// 0.1189 → 0.5209 로 뛰고 6배 증폭에서 줄무늬가 눈에 보인다. 밤만 보고 고르면 회귀다.
//
// 비용은 **줄어든다** — `getImageData`(GPU→CPU 리드백) 왕복이 사라지기 때문이다.
// 페인트 중앙값(15회): 밤 49.6→45.7ms · 낮 29.9→18.8ms · 흐림 78.6→51.6ms.

/** 0xRRGGBB → [r,g,b]. 색 리터럴을 원래 표기 그대로 두려고 둔다(`hex()` 의 역방향). */
const rgb = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];

// 난수 LUT — `seeded()` 를 픽셀마다 부르면 그것만으로 200ms 가 붙는다(실측 249→79ms).
const DITHER_LUT_N = 65536;
let ditherLut = null;
function ditherNoise() {
  if (ditherLut) return ditherLut;
  // ★ 시드를 **분리한다.** 이 페인터는 `paintSky` 맨 앞에서 도는데 여기서 공용 `rnd` 를
  //   소비하면 뒤따르는 별·성운·달 배치가 **전부 이동한다**(옛 `dither` 는 마지막 줄이라
  //   그 위험이 없었다). 전역 1회 생성이라 시간대·날씨와도 무관해야 한다.
  const r = seeded(0xd17e);
  ditherLut = new Float32Array(DITHER_LUT_N);
  for (let i = 0; i < DITHER_LUT_N; i++) ditherLut[i] = r() - 0.5; // ±0.5 LSB (RPDF)
  return ditherLut;
}

/**
 * 베이스 수직 그라디언트를 **직접** 그린다(천정→지평선, 그 아래는 fog 단색).
 *
 * @param stops `[[t, [r,g,b]], …]` — t 는 0..1 (0=천정, 1=지평선). sRGB 값 공간 선형 보간
 *   으로 canvas gradient 와 같은 규칙을 쓴다(실측으로 색 일치 확인: luma 차 ±1 이내).
 */
export function paintBase(ctx, W, H, Hh, stops, fogRGB) {
  const img = ctx.createImageData(W, H);
  const u32 = new Uint32Array(img.data.buffer); // 채널별 4회 store → 1회 (118.5→30.1ms)
  const lut = ditherNoise();
  // 천정 극점 부근은 디더에서 뺀다 — 극점 수렴으로 픽셀 노이즈가 **방사 부챗살**이 된다
  // (상방 실측, 옛 판본과 같은 경계를 유지해 회귀를 만들지 않는다).
  const yDither = (Hh * 0.05) | 0;
  const edge = Hh - 1; // 이 아래는 fog 단색 — 옛 두 번째 `fillRect` 가 이 줄부터였다
  let li = 0;
  for (let y = 0; y < H; y++) {
    let r, g, b;
    if (y >= edge) { [r, g, b] = fogRGB; } else {
      const t = y / Hh;
      let k = 0;
      while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
      const [t0, c0] = stops[k], [t1, c1] = stops[k + 1];
      const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
      r = c0[0] + (c1[0] - c0[0]) * f;
      g = c0[1] + (c1[1] - c0[1]) * f;
      b = c0[2] + (c1[2] - c0[2]) * f;
    }
    const row = y * W;
    if (y < yDither || y >= edge) { // 디더 없이 — 단색 구간과 극점 캡
      const p = 0xff000000 | ((b + 0.5) | 0) << 16 | ((g + 0.5) | 0) << 8 | ((r + 0.5) | 0);
      for (let x = 0; x < W; x++) u32[row + x] = p;
      continue;
    }
    for (let x = 0; x < W; x++) {
      // 3채널이 **같은** 노이즈를 쓴다 — 채널별로 뽑으면 색 노이즈가 된다(옛 판본도 모노였다).
      const n = lut[li++ & (DITHER_LUT_N - 1)];
      // `r+n+0.5 >= 0` 이 보장되므로(r≥0, n≥−0.5) `|0` 절단이 곧 반올림이다. 상한만 막는다.
      let R = (r + n + 0.5) | 0; if (R > 255) R = 255;
      let G = (g + n + 0.5) | 0; if (G > 255) G = 255;
      let B = (b + n + 0.5) | 0; if (B > 255) B = 255;
      u32[row + x] = 0xff000000 | (B << 16) | (G << 8) | R;
    }
    // ★ 행마다 LUT 위상을 소수만큼 민다. 안 밀면 `65536 / W` 행 주기로 **같은 노이즈 줄이
    //   반복**된다(W=2048 이면 32행마다 — 확대되면 보인다). 61 과 65536 은 서로소라
    //   주기가 텍스처 높이를 넘어간다.
    li += 61;
  }
  ctx.putImageData(img, 0, 0);
}

// ── 하늘돔 리페인트 ──
// 돔은 완전 구(equirect): v=0 천정, v=0.5 지평선, v=1 천저. 하늘은 상반부(0..Hh)에만
// 그리고 하반부는 fog색 단색(지면에 가려 안 보이지만 지평선 이음새 방지 ⑨). — 실측 교정.
// `export` 인 이유는 `paintBase` 와 같다 — **집행을 밖에서 볼 수 있어야 하기 때문이다.**
// 순수 판정(`dayStops`·`cloudElev`)만 테스트하면 *"판정한 값이 실제로 소비되는가"* 가
// 아무 데도 안 걸린다. 이 저장소는 그 구멍으로 이미 값을 치렀고(구름 `alpha` 미소비),
// 이번에도 *"캔버스가 필요해 못 돌린다"* 로 넘어가려다 검수관에게 반려당했다 —
// `tests/world2-ocean.test.ts` 가 `getContext` 를 스텁해 굽기 코드를 그대로 돌리는
// 선례를 이미 갖고 있었다.
export function paintSky(ctx, W, H, time, weather, opts) {
  const rnd = seeded(0xa17c + SKY_TIMES.indexOf(time) * 7 + SKY_WEATHERS.indexOf(weather) * 31);
  // 지평선(⑨)과 `scene.fog` 가 **같은 팔레트 조회**를 거쳐야 정합이 유지된다.
  const L = lightOf(time, weather, opts.fogTint);
  const Hh = H * 0.5; // 지평선(수평선) 텍스처 y
  // 눈도 구름 하늘 — 밤 눈 오는데 은하수가 보이는 모순 제거(눈구름은 먹구름보다 밝은 회백 톤)
  const cloudy = weather !== 'clear';
  // ⑨ 지평선 = fog색 — 이음새 제거의 핵. `paintBase` 가 스톱 마지막에 이 색을 넣는다.

  // 구름 하늘 톤(그라디언트·구름장 공용)
  const snowy = weather === 'snow';
  const cloudK = weather === 'rain' ? 0.8 : 1.0;
  const snowTop = { day: [168, 176, 186], sunset: [172, 150, 136], night: [40, 46, 58] };
  const cloudTop = !cloudy ? null : snowy ? snowTop[time]
    : time === 'night' ? [22, 26, 36] : time === 'sunset' ? [110, 96, 88] : [118, 128, 140];

  // 1) 베이스 수직 그라디언트(천정→지평) + 하반부 fog색.
  //    스톱 배열이 SSOT 다 — `paintBase` 가 이것을 보간하면서 **양자화 직전에** 디더를
  //    넣는다(위 주석). 색 리터럴은 옛 `addColorStop` 과 같은 값 그대로다.
  const fogRGB = rgb(L.fog);
  const stops = cloudy
    ? [[0, cloudTop.map((v) => (v * cloudK) | 0)],
       [0.62, cloudTop.map((v) => (v * cloudK * 1.22) | 0)],
       [1, fogRGB]]
    // 파랑을 지평선 가까이까지 끌어내려 하늘이 비어 보이지 않게 — 흰 헤이즈가 이르면
    // 저고도(시점에서 보이는 대부분의 하늘)에서 흰 구름이 배경에 묻힌다
    // 낮 파랑은 `dayStops` 가 소유한다(감독 지시 2026-08-12). 여기에 색을 다시 적으면
    // 그것이 값 미러링이다 — `blue=0` 이 옛 값과 바이트 동일인 것이 되돌림의 근거다.
    : time === 'day' ? dayStops(opts.blue ?? 0, fogRGB)
    // 베이스는 차분하게 — 타오르는 부분은 태양 방위 글로우가 담당(방위 비대칭 ①)
    : time === 'sunset' ? [[0, rgb(0x2e3d6b)], [0.45, rgb(0x6a5a8e)], [0.72, rgb(0xa06a74)], [1, fogRGB]]
    : [[0, rgb(0x070a16)], [0.55, rgb(0x141b30)], [0.85, rgb(0x232c46)], [1, fogRGB]];
  paintBase(ctx, W, H, Hh, stops, fogRGB);

  // 2) 태양 방위 연출 ① — 일몰: 지평선에 걸린 해 + 타오르는 글로우 + 반대편 지구그림자
  const sunX = SUN_AZ * W;
  if (!cloudy && time === 'sunset') {
    const sy = Hh * 0.96;
    // 반경을 넉넉히(천정 너머) 잡고 감마를 낮춰 8bit 알파 계단의 "끝자락 호"를 관심 영역 밖으로 민다
    glowWrapped(ctx, W, sunX, sy, Hh * 1.9, glowStops([255, 190, 110], [230, 110, 90], 0.42, 1.8, 28));
    glowWrapped(ctx, W, sunX, sy, Hh * 0.42, glowStops([255, 235, 190], [255, 190, 120], 0.85, 2.0));
    // 해 원반(지평선에 살짝 걸침)
    const sr = Hh * 0.06;
    const sg = ctx.createRadialGradient(sunX, sy, 0, sunX, sy, sr * 2.6);
    sg.addColorStop(0, 'rgba(255,244,214,1)'); sg.addColorStop(0.42, 'rgba(255,214,150,0.85)'); sg.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, sy, sr * 2.6, 0, 7); ctx.fill();
    // 반대편 하늘 — 지구 그림자 벨트(차분한 청보라 밴드, 노을의 "진짜" 디테일)
    // 벨트 반경은 태양 쪽 하늘을 침범하지 않게 좁게(가장자리 호가 노을 위에 겹쳐 보이는 것 방지)
    const bx = ((SUN_AZ + 0.5) % 1) * W;
    glowWrapped(ctx, W, bx, Hh * 0.97, Hh * 0.55, glowStops([70, 80, 140], [90, 90, 150], 0.24, 1.6, 20));
  }
  if (!cloudy && time === 'day') {
    // equirect 위도 보정 — 고도가 높을수록 가로가 압축되므로 텍스처엔 가로 타원으로
    // 그려야 화면에서 원형(안 하면 태양이 세로로 길쭉한 기둥처럼 보인다).
    const sy = Hh * (1 - L.sunEl);
    const stretch = 1 / Math.max(0.35, Math.cos(L.sunEl * Math.PI / 2));
    ctx.save();
    ctx.translate(sunX, sy); ctx.scale(stretch, 1);
    const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, Hh * 0.55);
    for (const [t, c] of glowStops([255, 252, 240], [255, 248, 220], 0.85, 3.2)) gg.addColorStop(t, c);
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, Hh * 0.55, 0, 7); ctx.fill();
    const sr = Hh * 0.04;
    ctx.fillStyle = 'rgba(255,253,244,0.98)'; ctx.beginPath(); ctx.arc(0, 0, sr, 0, 7); ctx.fill();
    ctx.restore();
  }

  // 3) 밤하늘 ④ — 별밭·은하수(암흑대)·광망 별·달(크레이터+위상)
  if (time === 'night' && !cloudy) {
    // 별밭 — 균등 분포 + 천정 왜곡 보정.
    // pow 편향으로 천정에 별을 몰면 equirect 확대율이 최대인 천정에서 별이 눈송이 같은
    // 보케로 뭉개진다(실화면 상방 시선 검수에서 적출). 균등 분포로 두고 천정 근처는
    // 화면 확대에 맞춰 크기·알파를 줄인다. 저해상 돔(soft 512)은 확대 뭉개짐이 심해
    // "성기고 또렷한 별" 방향: 개수 1/3, 소프트 도트(사각 픽셀 방지), 천정 감쇠 강화.
    // 별밭(정적) — 어두운/중간 별. 밝은 별(십자 스파이크)은 트윙클 레이어로 분리되어 반짝인다.
    // 밝기 2등급 차등(감독: "밝기 동일하게 하지 말고") + 색온도 다양화(starColor).
    const starN = opts.lowRes ? 500 : 1100;
    const yMin = opts.lowRes ? 0.12 : 0.06, zcDen = opts.lowRes ? 0.5 : 0.35;
    for (let i = 0; i < starN; i++) {
      const x = rnd() * W, y = Hh * (yMin + rnd() * (0.92 - yMin));
      const zc = Math.min(1, y / (Hh * zcDen)); // 0=천정 → 1=중간 고도 이하
      const mid = rnd() > 0.72;
      // 어두운 등급의 **하한**만 올린다(0.14→0.22 / 0.5→0.62). 알파 0.14 · 반경 0.5px 는
      // 별이 아니라 뿌연 먼지였다 — 화면 확대 + AA 로 뭉개져 "지저분함" 에만 기여했다.
      const a = (mid ? 0.5 + rnd() * 0.3 : 0.22 + rnd() * 0.26) * (0.35 + 0.65 * zc);
      const r = (mid ? 0.9 + rnd() * 0.5 : 0.62 + rnd() * 0.5) * (0.45 + 0.55 * zc);
      const [cr, cg, cb] = starColor(rnd);
      const cc = `${cr},${cg},${cb}`;
      if (opts.lowRes) { // 저해상 돔은 소프트 도트(사각 픽셀 방지)
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.4);
        g.addColorStop(0, `rgba(${cc},${Math.min(1, a * 1.15).toFixed(2)})`); g.addColorStop(1, `rgba(${cc},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${cc},${a.toFixed(2)})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
    }
    // 은하수 밴드(대각) — 웜 코어/쿨 엣지 + 암흑대 균열.
    // 천정 상부는 클립 — 극점에 닿으면 equirect 수렴으로 방사 줄무늬가 된다(상방 실측).
    ctx.save();
    ctx.beginPath(); ctx.rect(0, Hh * 0.14, W, Hh * 0.86); ctx.clip();
    ctx.translate(W * 0.5, Hh * 0.66); ctx.rotate(-0.42);
    // ── 성운 얼룩 — **개수↓ 반경↑ 알파↓** (감독 노이즈 지적, 2026-08-03) ──────────
    // 여기가 감독이 본 "흐릿하게 번진 뿌연 점" 의 정체다. 디자이너가 층을 하나씩 꺼서
    // 분리했다(개수 0 이 아니라 draw 만 스킵 — `rnd()` 스트림을 보존해야 다른 층의 별이
    // 한 픽셀도 안 움직이는 정확한 A/B 가 된다): 성운을 끄면 중주파 얼룩이 **29% 사라지고**,
    // 미세 별을 꺼도 얼룩은 **95% 그대로 남았다.** 미세 별은 얼룩이 아니라 점이었다.
    //
    // 바로 위 줄의 옛 주석이 "작고 많게(큰 반경은 흐린 보케 원반처럼 보인다)" 였는데
    // **반대였다.** 작고 많은 것이 보케 원반이 된다 — 화면 확대 때문이다. 데스크톱
    // 1280×720/FOV70 이 세로 1.81배, **모바일은 390×844 CSS + dpr 2 라 4.2배**여서
    // 반경 4~17px 가 화면 지름 34~143px 원반이 된다(감독 실기기가 이 조건이다).
    // 크고 옅게 가면 개별 원반이 서로 융합해 **저주파 광휘**가 되고, 그래야 은하수로 읽힌다.
    // 알파는 반경² 증가분을 상쇄하도록 낮춘다 — 총 광량(`알파 × r² × N`)을 보존한다.
    // ⚠ `lowRes` 쪽 값(370/1.7)은 **실측이 아니라 비율 스케일**이다 — 이 분기는 실행되지
    //   않는다(`:941` 이 `lowRes: false` 를 하드코딩하는 유일한 소비처다). 되살릴 때 실측
    //   없이 쓰지 마라. 태스크 #194.
    const nebN = opts.lowRes ? 370 : 560, nebK = opts.lowRes ? 1.7 : 2.4;
    for (let i = 0; i < nebN; i++) {
      const bx = (rnd() - 0.5) * W * 1.35;
      const by = (rnd() - 0.5) * Hh * 0.34 * (1 + Math.cos((bx / W) * 3.1) * 0.45);
      const rr = (4 + rnd() * 13) * nebK, aa = 0.005 + rnd() * 0.0115;
      const core = Math.abs(by) < Hh * 0.09;
      const huv = core ? (rnd() < 0.45 ? '235,220,200' : '228,225,240') : (rnd() < 0.3 ? '185,175,225' : '205,210,240');
      const g2 = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
      g2.addColorStop(0, `rgba(${huv},${(aa * (core ? 2.6 : 1.8)).toFixed(3)})`); g2.addColorStop(1, `rgba(${huv},0)`);
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(bx, by, rr, 0, 7); ctx.fill();
    }
    // 밴드 내 미세 별 — 1600→900, 알파 하한 0.1→0.18. "많고 흐릿하게" → "성기고 또렷하게".
    // ⚠ 좌표를 `Math.round` 로 정수 정렬해 AA 흐림을 없애려는 시도는 **무효다**(실측).
    //   이 루프는 `ctx.rotate(-0.42)` 아래라 로컬 정수가 비정수 디바이스 좌표로 되돌아간다
    //   — 픽셀은 4,874개 바뀌지만 또렷함은 그대로였다(피크 상위10% 20.71 → 20.75).
    //   또렷하게 만드는 실효 수단은 알파 하한뿐이다.
    for (let i = 0; i < 900; i++) {
      const bx = (rnd() - 0.5) * W * 1.3, by = (rnd() - 0.5) * Hh * 0.28;
      ctx.fillStyle = `rgba(238,240,255,${(0.18 + rnd() * 0.42).toFixed(2)})`;
      ctx.fillRect(bx, by, 1, 1);
    }
    // ④ 암흑대(dark rift) — 밴드 중심을 가르는 검은 균열(구불구불한 어두운 얼룩 사슬)
    let rx = -W * 0.62, ry0 = -Hh * 0.024;
    while (rx < W * 0.62) {
      // 성운이 옅어지면 암흑대가 **검은 구슬 사슬**로 도드라진다(후보 C4 에서 실제로 났다).
      // 두 층이 서로를 가려주고 있었다 — 한쪽만 밀면 다른 쪽이 새 얼룩이 된다.
      // 그래서 함께 키우고(반경) 함께 낮춘다(알파).
      const rr = 14 + rnd() * 34;
      const g3 = ctx.createRadialGradient(rx, ry0, 0, rx, ry0, rr);
      g3.addColorStop(0, 'rgba(8,10,22,0.29)'); g3.addColorStop(0.7, 'rgba(8,10,22,0.12)'); g3.addColorStop(1, 'rgba(8,10,22,0)');
      ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(rx, ry0, rr, 0, 7); ctx.fill();
      rx += rr * (0.6 + rnd() * 0.5); ry0 += (rnd() - 0.5) * Hh * 0.04;
    }
    ctx.restore();
    // (광망 별은 별밭 3등급에 통합 — 위 bright 등급이 글로우 헤일로+색 스파이크를 그린다)
    // 천정 캡 — 극점 부근 성분(별·은하수 자락)을 하늘 top색 소프트 페이드로 덮어
    // equirect 극점 수렴이 만드는 방사 스트릭을 봉인(상방 실측). 달(y 0.46Hh)은 안 걸린다.
    const cap = ctx.createLinearGradient(0, 0, 0, Hh * 0.2);
    cap.addColorStop(0, 'rgba(7,10,22,1)'); cap.addColorStop(0.55, 'rgba(7,10,22,0.7)'); cap.addColorStop(1, 'rgba(7,10,22,0)');
    ctx.fillStyle = cap; ctx.fillRect(0, 0, W, Hh * 0.2);

    // 달 ④ — 원반 + 크레이터 + 위상 터미네이터 + 넓은 글로우.
    // 낮 태양과 동일한 equirect 위도 보정(가로 타원) — 안 하면 상방 시선에서 타원 접시로 왜곡.
    const mx = MOON_AZ * W, my = Hh * 0.46, mr = Hh * 0.055;
    const mel = (1 - my / Hh) * Math.PI / 2;
    const mst = 1 / Math.max(0.35, Math.cos(mel));
    ctx.save();
    ctx.translate(mx, my); ctx.scale(mst, 1);
    // 감독 지시: 달을 흰색이 아니라 "진짜 노란색"으로 — 따뜻한 버터/골드 톤 + 노란 헤일로.
    const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, mr * 5.5);
    for (const [t, c] of glowStops([255, 224, 140], [255, 210, 120], 0.34, 2.2)) mg.addColorStop(t, c);
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(0, 0, mr * 5.5, 0, 7); ctx.fill();
    // 원반 — 살짝 방사 그라디언트(가장자리로 갈수록 톤 짙어져 구체감)
    const md = ctx.createRadialGradient(-mr * 0.25, -mr * 0.25, 0, 0, 0, mr);
    md.addColorStop(0, 'rgba(255,246,204,0.99)'); md.addColorStop(0.68, 'rgba(249,228,156,0.98)'); md.addColorStop(1, 'rgba(232,200,124,0.97)');
    ctx.fillStyle = md; ctx.beginPath(); ctx.arc(0, 0, mr, 0, 7); ctx.fill();
    // 표면 무늬 — 원반 안쪽으로 클립해 밖으로 새지 않게
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, mr, 0, 7); ctx.clip();
    for (let i = 0; i < 5; i++) { // 마리아(달의 바다) — 큰 저채도 황회색 패치(실제 달 무늬)
      const a = rnd() * 6.28, dd = rnd() * mr * 0.55, mrr = mr * (0.24 + rnd() * 0.3);
      const cx = Math.cos(a) * dd, cy = Math.sin(a) * dd;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, mrr);
      g.addColorStop(0, `rgba(206,178,120,${0.28 + rnd() * 0.14})`); g.addColorStop(0.7, 'rgba(206,178,120,0.08)'); g.addColorStop(1, 'rgba(206,178,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, mrr, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 11; i++) { // 크레이터 — 입체(어두운 우묵 + 광원쪽 밝은 림)
      const a = rnd() * 6.28, dd = rnd() * mr * 0.82, cr = mr * (0.05 + rnd() * 0.13);
      const cx = Math.cos(a) * dd, cy = Math.sin(a) * dd;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      cg.addColorStop(0, `rgba(198,166,104,${0.4 + rnd() * 0.2})`); cg.addColorStop(0.8, 'rgba(210,180,120,0.12)'); cg.addColorStop(1, 'rgba(210,180,120,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,248,214,${0.22 + rnd() * 0.16})`; ctx.lineWidth = 0.7; // 상단 밝은 림
      ctx.beginPath(); ctx.arc(cx, cy, cr * 0.86, Math.PI * 1.15, Math.PI * 1.95); ctx.stroke();
    }
    for (let i = 0; i < 90; i++) { // 표면 미세 알갱이(레골리스 질감)
      const a = rnd() * 6.28, dd = rnd() * mr * 0.96;
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? '255,250,220' : '200,170,110'},${(0.05 + rnd() * 0.1).toFixed(2)})`;
      ctx.fillRect(Math.cos(a) * dd, Math.sin(a) * dd, 1, 1);
    }
    ctx.restore();
    // 위상 — 한쪽 가장자리를 살짝 덮는 터미네이터(과하면 잘린 원판처럼 보인다)
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, mr + 0.5, 0, 7); ctx.clip();
    ctx.fillStyle = 'rgba(10,14,26,0.62)';
    ctx.beginPath(); ctx.arc(-mr * 1.25, 0, mr * 1.06, 0, 7); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // 4) 맑음 뭉게구름은 여기서 그리지 않는다 — 별도 레이어(paintClearClouds)에서 그려 바람에
  //    흐르게 한다(감독 지시: "구름도 절차 캔버스라 저비용으로 움직이게"). 여기선 흐림/비/눈만.
  if (cloudy) {
    // ③ 구름층 — fBm 전천 구조(밝은 틈·어두운 밑면이 노이즈 밀도장에서 자연 발생)
    const lit = cloudTop.map((v) => Math.min(255, (v * cloudK * 1.45 + 26) | 0));
    const shd = cloudTop.map((v) => (v * cloudK * 0.5) | 0);
    paintCloudLayer(ctx, rnd, W, Hh, { mode: 'layer', thr: 0.34, softEdge: 0.3, alphaMax: snowy ? 0.6 : 0.66, tint: lit, shade: shd, soft: opts.soft, curve: opts.curve ?? 0, eps: opts.cloudH });
    if (weather === 'rain') { // 지평선 비 커튼(사선 얼룩)
      ctx.save(); ctx.globalAlpha = 0.1;
      for (let i = 0; i < 9; i++) {
        const x = rnd() * W, w2 = 30 + rnd() * 60;
        const g = ctx.createLinearGradient(x, Hh * 0.62, x + 14, Hh);
        g.addColorStop(0, 'rgba(160,172,186,0)'); g.addColorStop(0.4, 'rgba(160,172,186,0.5)'); g.addColorStop(1, 'rgba(160,172,186,0)');
        ctx.fillStyle = g; ctx.fillRect(x, Hh * 0.62, w2, Hh * 0.38);
      }
      ctx.restore();
    }
  }

  // ② 밴딩 파괴는 `paintBase`(1단계)가 양자화 직전에 한다 — 여기서 사후 디더를 얹던
  //    옛 판본이 그레인의 원인이었다. `opts.soft` 분기도 없앴다: 새 경로가 더 싸고,
  //    저사양 기기는 화면이 저해상이라 밴딩이 **더** 잘 보인다(디자이너 판정).
}

// 별 색온도 팔레트(항성 실제 색) — 흰색 다수 + 따뜻한/차가운 별 소수.
function starColor(rnd) {
  const t = rnd();
  return t < 0.14 ? [255, 198, 152] : t < 0.30 ? [255, 228, 190]
    : t < 0.74 ? [246, 248, 255] : t < 0.90 ? [200, 214, 255] : [168, 196, 255];
}

// 반짝이는 밝은 별(십자 스파이크) 전용 페인터 — 홀짝으로 두 캔버스에 나눠 그린다.
// 두 레이어를 반대 위상으로 opacity 진동시키면 별이 "생겼다 사라졌다" 반짝인다(감독 지시).
// 위치·색은 결정론(시드 고정) — 시간대 무관 동일, opacity만 런타임 제어.
//
// ── ⚠ 이 텍스처의 픽셀은 **각도다** (감독 실기기 2026-08-06) ──────────────────
// 돔은 `W`(=2048) 픽셀로 방위 360°를 덮는다. 그래서:
//
//     1px = 360° / 2048 = 0.1758°
//
// `scale=1`(옛 고정값)에서 십자 전체 길이는 `2·(5 + r·3.4)`, r 최대 2.4 이므로
// **26.3px = 4.63°** 다. 보름달이 0.52° 이므로 **보름달의 8.9배**이고, 중심 광구도
// 지름 11.5px = 2.02°(보름달 3.9배)다. 실제 밤하늘에서는 가장 밝은 별도 맨눈 번짐이
// 0.1° 미만이다.
//
// **이것이 감독이 *"별이 보이는 게 아니라 바로 앞에 있는 벽지가 보이는 것 같아"* 로
// 잡은 증상의 정체다.** 보름달 9배짜리 광원이 34개 떠 있으면 그것은 별이 아니라 무늬로
// 읽힌다 — 뇌가 "이건 하늘이 아니라 가까운 표면"으로 판정한다.
//
// ⚠⚠ **돔 반경으로는 절대 안 고쳐진다 — 실측으로 확인했다.** 돔이 카메라를 따라오면
// 반경은 **카메라 중심 스케일 변환**이고, 원근 투영에서 그것은 화면 각도를 하나도
// 바꾸지 않는다. 텍스처는 UV 로 매핑되므로 각도당 텍셀 수도 반경과 무관하다.
// 감독이 `dome=520` 과 `dome=6000` 스크린샷 두 장을 나란히 올려 *"현재 같은데?"* 로
// 잡았고, 두 화면은 실제로 구별되지 않았다. **`?dome=` 은 화면에 대해 죽은 노브다.**
//
// 내가 `sky.ts` 주석에 *"반경은 시차에 영향을 주지 않는다"* 까지 써 놓고 *"그래도 천장
// 높이감은 바뀐다"* 를 덧붙였는데 그 덧붙인 절이 거짓이었고, 그 거짓 위에서 감독께
// 높이 후보 링크를 다섯 개 드렸다. **참인 문장에서 성립하지 않는 결론을 뽑는 것** 의
// 또 한 사례다(`CLAUDE.md` 가 이름 붙인 그 형태).
//
// ── 개수가 크기에 반비례하는 이유 ────────────────────────────────────────────
// 각크기만 줄이면 하늘이 휑해진다 — 34개는 "크게 그렸을 때" 화면을 채우던 수다.
// 실제 밤하늘은 **밝은 별이 적고 어두운 별이 많다**. `scale` 을 줄일 때 개수를 그 역수로
// 늘리면 그 분포에 가까워지고, 화면 총 광량도 대략 보존된다(면적 ∝ scale² 이므로 완전
// 보존은 아니다 — 의도적이다. 작아질수록 어두워지는 것이 맞다).
//
// 비용은 **캔버스 1회 페인트**뿐이다. 지오메트리·텍스처·머티리얼 개수가 전부 그대로라
// `[7]` 개수 불변식과 무관하다(메시는 `mkTwk()` 두 개로 고정).
//
// ── ⚠ 이 함수를 export 하는 이유 — **헤드리스로는 이 축을 못 잰다** ──────────
// `?star=` 를 넣고 헤드리스(swiftshader/WebGL)로 `star=1` 과 `star=0.2` 를 렌더해
// 비교했더니 **두 화면이 구별되지 않았다.** 그러나 그것은 "노브가 죽었다"는 뜻이 아니다 —
// 헤드리스 화면에는 감독 실기기에 보이는 **큰 십자 별 자체가 나타나지 않았다.**
// 감독 기기는 WebGPU + 블룸이고 헤드리스는 WebGL 이라 렌더 경로가 다르다
// (`CLAUDE.md` 가 열어 둔 사각 그대로다). **못 잰 것을 통과로도, 실패로도 적지 않는다.**
//
// 그래서 화면 인상은 감독 판정으로 남기고, **노브가 코드에 도달하는지**만 여기서
// 잠근다 — `tests/sky-star-scale.test.ts` 가 페이크 ctx 로 이 함수를 직접 돌려
// 그리기 좌표가 `scale` 을 따라 움직이는지 본다. `?dome=` 이 배선은 멀쩡한데 화면에
// 아무 영향이 없었던 것과 **정확히 반대 방향의 실패**(배선이 끊겨 화면이 안 바뀌는 것)를
// 막는 축이다. 둘 다 증상은 "화면이 같다" 로 똑같이 보이므로 구별할 수단이 필요하다.
export const TWK_BASE_COUNT = 34;
export const TWK_MAX_COUNT = 300; // 페인트 비용 상한 — scale 0.1 이면 340 이 되므로 자른다
export function paintTwinkleStars(ctxA, ctxB, W, Hh, scale = 1) {
  const rnd = seeded(0x7a1e);
  ctxA.clearRect(0, 0, W, Hh * 2); ctxB.clearRect(0, 0, W, Hh * 2);
  const count = Math.min(TWK_MAX_COUNT, Math.round(TWK_BASE_COUNT / Math.max(0.1, scale)));
  for (let i = 0; i < count; i++) {
    const ctx = (i % 2 === 0) ? ctxA : ctxB;
    const x = rnd() * W, y = Hh * (0.06 + rnd() * 0.62);
    const zc = Math.min(1, y / (Hh * 0.35));
    const rBase = (1.5 + rnd() * 0.9) * (0.5 + 0.5 * zc);
    const r = rBase * scale;
    const a = 0.85 + rnd() * 0.15;
    const [cr, cg, cb] = starColor(rnd); const cc = `${cr},${cg},${cb}`;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
    g.addColorStop(0, `rgba(${cc},${a.toFixed(2)})`); g.addColorStop(0.35, `rgba(${cc},${(a * 0.5).toFixed(2)})`); g.addColorStop(1, `rgba(${cc},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(${cc},${(a * 0.6).toFixed(2)})`; ctx.lineWidth = Math.max(0.4, 0.8 * scale);
    // ⚠ **상수항 5 도 함께 곱한다** — `rBase` 를 쓰고 전체에 `scale` 을 건다.
    // `5 + r*3.4`(= 5 + rBase·3.4·scale) 로 두면 `scale` 을 아무리 줄여도 십자가
    // **1.76° 아래로 안 내려간다**(5px 이 바닥이다). 노브를 열어 놓고 축이 안 움직이는
    // 것 — 방금 `?dome=` 으로 겪은 것과 정확히 같은 형태다.
    const s = (5 + rBase * 3.4) * scale;
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
  }
}

// 맑음 뭉게구름 전용 페인터 — 투명 배경 캔버스에 구름만. 흐르는 구름 레이어(가로 스크롤)용.
// 시드를 시간대 무관 고정(0xC10D) → 낮↔일몰 전환 시 구름 형태 유지되고 톤만 바뀌어 자연스럽다.
function paintClearClouds(ctx, W, Hh, time, soft, curve = 0, eps = 0) {
  ctx.clearRect(0, 0, W, Hh * 2);
  const rnd = seeded(0xc10d);
  const tint = time === 'sunset' ? [255, 216, 182] : [255, 255, 255];
  const shade = time === 'sunset' ? [172, 126, 132] : [138, 154, 172];
  // thr 상향(구름 면적 축소 — 파란 하늘이 조각구름 사이로 보이게, 감독 "뭉쳐진 느낌" 해소)
  paintCloudLayer(ctx, rnd, W, Hh, { mode: 'cumulus', thr: 0.56, softEdge: 0.13, alphaMax: 0.92, tint, shade, soft, curve, eps });
  for (let i = 0; i < 5; i++) { // 원경 층운
    const y = Hh * (0.74 + rnd() * 0.16), len = W * (0.1 + rnd() * 0.16), x = rnd() * W;
    const hgt = 2.4 + rnd() * 3;
    for (const ox of [-W, 0, W]) {
      ctx.save();
      ctx.translate(x + ox, y); ctx.scale(len / 2, hgt);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(${tint.join(',')},0.11)`); g.addColorStop(0.7, `rgba(${tint.join(',')},0.045)`); g.addColorStop(1, `rgba(${tint.join(',')},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
}

/** 섬광 화이트닝 목표색. Color 인스턴스 하나 — 조명·재질·메시가 아니라 개수 불변식 무관. */
const WHITE = new THREE.Color(1, 1, 1);

// ── WebAudio 합성 천둥(파일 0) ──
function synthThunder(delayS) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = synthThunder._ctx || (synthThunder._ctx = new AC());
    if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
    const t0 = ctx.currentTime + delayS;
    const dur = 2.2 + Math.random() * 1.4;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < d.length; i++) {
      brown += (Math.random() * 2 - 1) * 0.02; brown *= 0.996;
      const t = i / d.length;
      const env = Math.pow(1 - t, 1.6) * (t < 0.06 ? t / 0.06 : 1) * (0.7 + 0.3 * Math.sin(t * 40 + Math.random()));
      d[i] = brown * env * 3.2;
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const gain = ctx.createGain(); gain.gain.value = 0.5;
    src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
    src.start(t0);
  } catch (_) { /* 무음 폴백 */ }
}

// ── `fogTint` 의 기본값에 캐스트가 붙어 있는 이유 (검수관 블로커 B1, 2026-08-12) ──
// 이 파일은 `.js` 라 인자 타입이 **기본값에서만** 추론된다. `fogTint = 0` 이면 `number`
// 로 굳어 시간대별 객체를 넘기는 world2 조립부가 에러가 난다. 그래서 기본값 표현식
// 자체에 타입을 붙인다 — 그 인자 하나만 넓어지고 나머지는 추론 그대로다.
//
// ⚠ **첫 판본은 `@param {{fogTint?: FogTintArg} & Record<string, any>} opts` 였고 그것이
// 블로커였다.** 인터섹션의 인덱스 시그니처가 `fogTint` 외 **모든 키를 `any` 로 넓혀**,
// world2 호출부에서 `soft`·`waterY`·`starScale`·`skyBlue`·`cloudCurve`·`cloudH` 여섯의
// 타입 검사가 통째로 사라졌다. 검수관이 base(`a170350`) 대비 오타입 뮤테이션으로
// **6/6 미검출**을 실측했다 — 주석은 *"`fogTint` 만 타입을 명시한다"* 라고 적고 있었고
// 그 문장이 거짓이었다. 게이트가 조용히 사라지는 이 저장소의 상습 사고 형태 그대로다.
//
// `@param {FogTintArg} [opts.fogTint]` 점 표기 단독도 안 된다(검수관 실측 — 오히려
// 전 필드가 `number` 로 오판정됐다). 전체를 typedef 로 다시 적는 길은 값 미러링이라
// 택하지 않았다. 이 캐스트가 실제로 일곱 인자를 지키는지는 뮤테이션으로 잰다(7/7 검출).
export function createSkySystem({ scene, renderer, sun, hemi, sky, getPos, soft = false, onApply = null, waterY = null, fogTint = /** @type {FogTintArg} */ (0), starScale = 1,
  // 감독 지시 2026-08-12 — 화면에서 고르는 두 축. 기본 0 은 **옛 화면 그대로**다.
  // 새 값을 기본으로 삼는 것은 world2 쪽(`systems/sky.ts`)이고, 여기서 0 인 이유는
  // world1 을 비롯한 다른 소비자의 화면을 이 파일이 말없이 바꾸지 않기 위해서다.
  // `cloudH = 0` 은 "지정 안 함" 이다 — `cloudElev` 가 0 을 `CLOUD_EPS` 로 되돌린다.
  // ⚠ `skyBlue` 는 **숫자 또는 함수**다. 함수인 쪽이 world2 복합씬 경로다 — 아래 별과
  // 같은 이유이고, 값으로만 받으면 **부팅 시각에 굳어** 시간대를 바꿔도 하늘 농도가 안
  // 따라온다(검수관 반려 B1′: 패널 「복합」 버튼이 진한 하늘에 도달하지 못했다). 숫자
  // 기본값은 옛 소비자 그대로다.
  skyBlue = /** @type {number | (() => number)} */ (0), cloudCurve = 0, cloudH = 0,
  // 🔴 **별을 시간대 밖에서 켜는 문** (world2 복합씬, 2026-08-21). 매 `apply()` 마다 묻는다.
  // 시간대 문자열로는 못 켠다 — `SKY_TIMES` 는 셋뿐이고 `LIGHT` 키와 짝이라 늘릴 수 없어,
  // 넷째 값을 넘기면 `normalize()` 가 **조용히 버리고** 이전 값으로 되돌린다(그렇게 만들
  // 었다가 죽은 코드가 됐다 — 검수관 반려 B1). **함수**인 것은 위 `skyBlue` 와 같은 이유다.
  // 안 주면 `null` 이고 `?.()` 가 `undefined` 라 야간 판정만 남는다 — world1 무영향.
  wantStars = /** @type {(() => boolean) | null} */ (null) }) {
  const state = { time: 'day', weather: 'clear', fx: { rainbow: false, aurora: false }, flashSafe: false, precip: 1 };
  // ── B-2 저사양 오버드로우 축소 ──
  // 모바일 타일드 GPU는 불투명 오브젝트의 오버드로우는 제거하지만 transparent·가산블렌딩 레이어
  // (강수·오로라·수면 빛기둥·반짝이 별)는 그 최적화가 무력화돼 fill 비용이 그대로 쌓인다.
  // world.js의 liteMode 진입 시 setLite(true)로 이 레이어들의 "양"만 축소한다 — 강수는
  // draw-range(그리는 입자 수)를, 보조 투명 레이어는 opacity를 낮춘다. 연출 톤(색·움직임)과
  // 개수·재질은 그대로 두고(재생성·재컴파일 0) draw-range/opacity로만 제어(팀장 설계 톤 보존).
  let lite = false;
  const LITE_PRECIP_MUL = 0.45; // 강수(비·눈) 그리는 입자 비율
  const LITE_AUR_MUL = 0.5;     // 오로라 opacity 배수
  const LITE_GLINT_MUL = 0.55;  // 수면 빛기둥 opacity 배수
  const LITE_TWK_MUL = 0.5;     // 반짝이 별 opacity 배수
  const AUR_BASE_OPACITY = 0.5; // 오로라 기준 opacity(생성값 — 복원 기준)
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };
  // 돔 텍스처는 전 기기 2048 고정. ①저해상(512) 하늘은 별이 화면 확대로 뭉개지고(실측)
  // ②캔버스 크기를 도중에 바꾸면 three가 텍스처를 불변 스토리지로 잡아 needsUpdate로도
  // 재업로드되지 않는다(전환 후 하늘이 안 바뀌는 버그 — 진단 실측). soft 절약은 구름
  // 밀도장 저해상·별 개수 축소로 충분하고, 페인트는 전환 시 1회 비용이다.
  // (여기 "디더 스킵" 이라 적혀 있었는데 그 분기는 없앴다 — `paintBase` 가 양자화 직전에
  //  넣는 새 디더는 사후 패스가 아니라 페인트 자체이고, 오히려 옛 경로보다 싸다.)
  const DOME_W = 2048, DOME_H = 1024;

  // 저폴리 돔(24×12)은 위도 링을 따라 UV 보간이 절곡돼 그라디언트에 마하 밴드 원호가 생긴다
  // (하네스 실측). 주입받은 돔의 지오메트리를 고해상 구로 교체 — 정점 ~1.6k, 비용 무시 가능.
  if (sky.geometry && sky.geometry.parameters && (sky.geometry.parameters.widthSegments || 0) < 48) {
    const old = sky.geometry;
    sky.geometry = track(new THREE.SphereGeometry(old.parameters.radius || 520, 48, 32));
    old.dispose();
  }

  // ⑧ 이중 돔 크로스페이드 — 주 돔(sky, 주입) + 페이드 돔(복제, 위에 겹쳐 opacity 0→1 후 스왑)
  const mkDomeTex = () => { const c = document.createElement('canvas'); c.width = DOME_W; c.height = DOME_H; return { c, ctx: c.getContext('2d', { willReadFrequently: true }), tex: track(new THREE.CanvasTexture(c)) }; };
  const domeA = mkDomeTex(), domeB = mkDomeTex();
  domeA.tex.colorSpace = domeB.tex.colorSpace = THREE.SRGBColorSpace;
  const oldMap = sky.material.map;
  sky.material.map = domeA.tex; sky.material.needsUpdate = true;
  if (oldMap) oldMap.dispose();
  const fadeDome = new THREE.Mesh(sky.geometry, track(new THREE.MeshBasicMaterial({ map: domeB.tex, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true, opacity: 0 })));
  fadeDome.renderOrder = -0.9; fadeDome.visible = false;
  sky.add(fadeDome); // sky가 카메라 추종이므로 자식으로 두면 자동 동행

  // ── 흐르는 구름 레이어(감독 지시) — 맑음 뭉게구름 전용 캔버스를 하늘돔 안쪽 구에 붙이고
  //    가로 offset 스크롤로 바람에 흐르게(물결과 동일 원리: 셰이더·버텍스변형 0, 드로우콜 +1).
  //    돔 텍스처에서 분리했으므로 crossfade는 하늘 배경만, 구름은 자체 opacity로 페이드. ──
  const cloudRadius = (sky.geometry.parameters && sky.geometry.parameters.radius || 520) * 0.94;
  const cloudCanvas = document.createElement('canvas'); cloudCanvas.width = DOME_W; cloudCanvas.height = DOME_H;
  const cloudCtx = cloudCanvas.getContext('2d');
  const cloudTex = track(new THREE.CanvasTexture(cloudCanvas));
  cloudTex.colorSpace = THREE.SRGBColorSpace; cloudTex.wrapS = THREE.RepeatWrapping;
  const cloudMesh = new THREE.Mesh(track(new THREE.SphereGeometry(cloudRadius, 48, 32)),
    track(new THREE.MeshBasicMaterial({ map: cloudTex, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false })));
  cloudMesh.renderOrder = -0.95; cloudMesh.visible = false;
  sky.add(cloudMesh);
  const cloudFade = { from: 0, to: 0 }; // crossfade 동안 opacity 보간(하늘 배경과 병렬)

  // ── 반짝이는 별 레이어(감독 지시) — 밝은 별 2세트를 반대 위상 opacity 진동 → 트윙클 ──
  const twkR = (sky.geometry.parameters && sky.geometry.parameters.radius || 520) * 0.97;
  const mkTwk = () => {
    const c = document.createElement('canvas'); c.width = DOME_W; c.height = DOME_H;
    const tex = track(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(track(new THREE.SphereGeometry(twkR, 40, 24)),
      track(new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })));
    m.renderOrder = -0.92; m.visible = false; sky.add(m);
    return { c, ctx: c.getContext('2d'), tex, mesh: m };
  };
  const twk = [mkTwk(), mkTwk()];
  // 결정론 1회 페인트. `starScale` 기본 1 = 옛 고정값 — **라이브 world1 은 무영향**이다.
  paintTwinkleStars(twk[0].ctx, twk[1].ctx, DOME_W, DOME_H / 2, starScale);
  twk[0].tex.needsUpdate = twk[1].tex.needsUpdate = true;
  let twkBase = 0, twkTarget = 0; // 야간 맑음=1로 lerp, 그 외 0(별 반짝임 페이드)

  // 조명 lerp 상태(⑧) — from→to를 fade 동안 보간
  const lerpState = { t: 1, dur: 0, from: null, to: null };
  const asVec = (L) => ({ sun: new THREE.Color(L.sun), hemiS: new THREE.Color(L.hemiS), hemiG: new THREE.Color(L.hemiG), fog: new THREE.Color(L.fog), sunI: L.sunI, hemiI: L.hemiI });

  // ── 강수 — ⑤ 비=LineSegments 빗줄기 / 눈=Points ──
  const R_COUNT = soft ? 300 : 900;
  const rainGeo = track(new THREE.BufferGeometry());
  const rPos = new Float32Array(R_COUNT * 6); // 선분당 2정점
  const rSeed = new Float32Array(R_COUNT);
  const RBOX = { x: 42, y: 22, z: 42 };
  { const r = seeded(77); for (let i = 0; i < R_COUNT; i++) { const x = (r() - 0.5) * RBOX.x, y = r() * RBOX.y, z = (r() - 0.5) * RBOX.z; rPos[i * 6] = x; rPos[i * 6 + 1] = y; rPos[i * 6 + 2] = z; rPos[i * 6 + 3] = x; rPos[i * 6 + 4] = y - 0.55; rPos[i * 6 + 5] = z; rSeed[i] = r() * 6.28; } }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  const rain = new THREE.LineSegments(rainGeo, track(new THREE.LineBasicMaterial({ color: 0xaebfd4, transparent: true, opacity: 0.4 })));
  rain.visible = false; rain.frustumCulled = false; scene.add(rain);

  const S_COUNT = soft ? 260 : 700;
  // 낙하 물리 상태(월드 좌표). 예전에는 이 배열이 그대로 BufferGeometry의 position
  // attribute였으나, 아래 사유로 InstancedMesh로 바뀌면서 순수 상태 배열이 됐다.
  const sPos = new Float32Array(S_COUNT * 3); const sSeed = new Float32Array(S_COUNT);
  { const r = seeded(78); for (let i = 0; i < S_COUNT; i++) { sPos[i * 3] = (r() - 0.5) * RBOX.x; sPos[i * 3 + 1] = r() * RBOX.y; sPos[i * 3 + 2] = (r() - 0.5) * RBOX.z; sSeed[i] = r() * 6.28; } }

  // 원형 스프라이트 — 사각 텍셀 그대로면 눈송이가 네모로 보인다
  const snowSprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(16, 16, 16, 0, 7); x.fill();
    const t = track(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  // ── 눈은 Points가 아니라 InstancedMesh다 (2026-07-27, 감독 실기기 발견) ──────
  // 예전에는 `THREE.Points` + `PointsMaterial({ size: 0.16 })`이었다. WebGL에서는 잘
  // 보였지만 **WebGPU에서는 눈이 통째로 안 보였다.**
  //
  // 원인은 백엔드 차이다. WGSL에는 `gl_PointSize`에 대응하는 수단이 없고, WebGPU는
  // point-list 토폴로지의 점을 **항상 1픽셀**로 그린다. three의 `PointsNodeMaterial`도
  // `sizeNode`만 볼 뿐 `size`를 읽는 경로가 없다(`materialPointSize` 0건). 즉 0.16이
  // 조용히 무시되어, DPR 3 화면에서 1픽셀 흰 점 = 사실상 안 보이는 상태였다.
  //
  // 비(`LineSegments`)는 선분 자체에 길이가 있어 멀쩡했고, 그래서 "비는 되는데 눈만
  // 안 된다"로 나타났다.
  //
  // 교차 평면인 이유: 주입 API에 camera가 없어 빌보드(카메라를 향해 돌리기)를 만들 수
  // 없다. 평면 2장을 90°로 교차시키면 어느 각도에서 봐도 한쪽이 보인다. 눈송이는
  // 화면에서 몇 픽셀이라 삼각형 4개/입자는 무시할 만하다.
  const snowGeo = track((() => {
    const g = new THREE.BufferGeometry();
    const h = 0.5;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -h, -h, 0, h, -h, 0, h, h, 0, -h, h, 0,   // XY 평면
      0, -h, -h, 0, -h, h, 0, h, h, 0, h, -h,   // YZ 평면
    ]), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1,
    ]), 2));
    // ── `normal` 은 이 재질이 안 쓴다. 그런데 **없으면 WebGPU 가 경고를 찍는다** ──────
    // 감독 실기기 콘솔 2026-08-12: `TSL.NormalNode: Vertex attribute "normal" not found
    // on geometry.` **2건**.
    //
    // 원인이 정확히 여기다. three 의 노드 파이프라인(`three.webgpu`)은 재질이 조명을
    // 안 받아도 `normalLocal` 을 빌드하고, 그 안에서 `geometry.hasAttribute('normal')`
    // 이 false 면 경고 후 `vec3(0,1,0)` 로 폴백한다. **렌더는 정상이고 화면 영향은 0**
    // 이지만(Basic 재질이라 이 값을 안 쓴다) 콘솔에 매번 남는다.
    //
    // **2건인 이유는 `side: DoubleSide` 다.** WebGPU 는 앞/뒤면을 파이프라인 둘로 굽고
    // (실측: 같은 지오메트리가 `side:0` 과 `side:1` 로 각각 한 번씩 보고됐다), 경고
    // 캐시가 파이프라인 단위라 두 번 난다.
    //
    // **언제 뜨는가는 소비자마다 다르다** — 이 파일은 world2·world3·world5 와 라이브
    // `world.js` 가 함께 쓴다:
    //   · world2/3/5 — `prewarm()` 이 부팅에 잠든 강수 레이어를 잠시 켜 파이프라인을
    //     미리 굽는다. 그래서 **눈이 안 보이는 밤 맑음 화면에서도** 콘솔에 남는다.
    //   · 라이브 `world.js` — prewarm 을 안 쓰고 날씨가 `clear` 고정이라 **기본 로드로는
    //     안 뜬다.** 방문자가 神 모드 패널로 눈을 켜거나 `?weather=snow` 를 줄 때만 뜬다.
    // ⚠ 이 구분은 검수관이 실측으로 잡았다(2026-08-12) — 첫 판본은 *"기본 화면에서도
    // 뜬다"* 라고만 적어 라이브까지 그런 것처럼 읽혔다.
    //
    // 값은 교차 평면 각각의 **와인딩 기준** 면법선이다(XY 판 → `+Z`, YZ 판 → `-X`).
    // ⚠ YZ 는 첫 판본에서 `+X` 로 적었고 **부호가 틀렸다**(검수관 실측 → `Triangle`
    // 로 재계산, 나도 인덱스 `[4,5,6]` 의 외적으로 독립 검산해 `(-1,0,0)` 확인).
    // **이 재질에서는 화면이 안 변하므로 어떤 검사로도 안 잡힌다** — 그래서 값을 손으로
    // 적을 때 와인딩을 따지지 않으면 조용히 틀린 채로 남는다. 다음에 이 판을 늘리거나
    // 조명 재질로 바꾸면 그때 뒤집혀 보인다.
    //
    // 8정점 × 3 = 96바이트라 개수 불변식[7]·메모리에 영향이 없고(검수관 실측:
    // geometries·textures·drawCalls·triangles 전부 불변, 스크린샷 md5 동일),
    // WebGL 경로는 이 속성을 아예 안 본다.
    //
    // ⚠ **헤드리스 기본 설정으로는 이 결함을 못 잡는다** — `three.webgpu` 가 WebGL 로
    // 폴백하면 이 경로가 통째로 안 돈다(실측: 조립본 · `?weather=snow`/`rain` 강제
    // 포함 전부 0건). 재현하려면 크로미움에 `--enable-unsafe-webgpu
    // --use-webgpu-adapter=swiftshader` 를 줘야 한다. 그 조건에서 **고치기 전 2건 →
    // 고친 뒤 0건 → normal 을 다시 지우면 2건**을 실측했다(뮤테이션까지 확인).
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,      // XY 평면 → +Z
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,  // YZ 평면 → -X (와인딩 기준. 위 ⚠ 참조)
    ]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    return g;
  })());
  /** 눈송이 한 변(월드 미터). 옛 `size: 0.16`은 화면 픽셀 스케일이라 그대로 못 쓴다. */
  const FLAKE = 0.075;
  // InstancedMesh 자체도 track한다 — Points와 달리 instanceMatrix 버퍼를 소유하므로
  // 지오/재질만 반납하면 그 버퍼가 남는다.
  const snow = track(new THREE.InstancedMesh(snowGeo, track(new THREE.MeshBasicMaterial({
    color: 0xffffff, map: snowSprite, transparent: true, opacity: 0.9,
    depthWrite: false, side: THREE.DoubleSide,
  })), S_COUNT));
  snow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  snow.visible = false; snow.frustumCulled = false; scene.add(snow);
  // 인스턴스 행렬 조립용 재사용 객체 — 매 프레임 700개를 새로 만들지 않는다.
  const _sM = new THREE.Matrix4();
  const _sP = new THREE.Vector3();
  const _sQ = new THREE.Quaternion();
  const _sS = new THREE.Vector3(FLAKE, FLAKE, FLAKE);

  // ── 무지개 ⑥ — 링 지오메트리(planar UV) × 방사형 스펙트럼 텍스처 ──
  // 주 무지개 + 알렉산더 밴드(어두운 사이 띠) + 색 역순 2차 무지개를 그라디언트 한 장·메시 1개로.
  // (토러스는 UV가 튜브 둘레를 돌아 스펙트럼 절반만 보였다 — 실측 후 재설계.)
  const RB_IN = 150, RB_OUT = 232;
  function rainbowTexture() {
    const S = 512, c = document.createElement('canvas'); c.width = S; c.height = S;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(S / 2, S / 2, (RB_IN / RB_OUT) * (S / 2), S / 2, S / 2, S / 2);
    const t = (r) => Math.min(1, Math.max(0, (r - RB_IN) / (RB_OUT - RB_IN)));
    const stops = [
      [150, 'rgba(138,91,192,0)'],
      [158, 'rgba(138,91,192,0.36)'],  // 보라(안쪽)
      [163, 'rgba(74,144,208,0.44)'],  // 파랑
      [168, 'rgba(91,184,93,0.46)'],   // 초록
      [173, 'rgba(230,194,41,0.48)'],  // 노랑
      [178, 'rgba(232,133,58,0.48)'],  // 주황
      [183, 'rgba(229,72,77,0.44)'],   // 빨강(바깥 — 실제 무지개 색 순서)
      [189, 'rgba(229,72,77,0)'],
      [193, 'rgba(46,62,92,0.055)'],   // ⑥ 알렉산더 밴드 — 주·2차 사이의 살짝 어두운 하늘
      [204, 'rgba(46,62,92,0.055)'],
      [208, 'rgba(229,72,77,0)'],
      [211, 'rgba(229,72,77,0.16)'],   // 2차 무지개(색 역순·희미)
      [215, 'rgba(230,194,41,0.17)'],
      [219, 'rgba(74,144,208,0.16)'],
      [223, 'rgba(138,91,192,0.14)'],
      [229, 'rgba(138,91,192,0)'],
    ];
    for (const [r, col] of stops) g.addColorStop(t(r), col);
    x.fillStyle = g; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 7); x.fill();
    const tex = track(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const rainbowGrp = new THREE.Group();
  rainbowGrp.add(new THREE.Mesh(
    track(new THREE.RingGeometry(RB_IN, RB_OUT, 96, 1, 0, Math.PI)),
    track(new THREE.MeshBasicMaterial({ map: rainbowTexture(), transparent: true, opacity: 0.85, depthWrite: false, fog: false, side: THREE.DoubleSide }))
  ));
  rainbowGrp.visible = false; scene.add(rainbowGrp);

  // ── 오로라 ⑦ — 수직 스트리크 텍스처 × 버텍스 색 커튼 ──
  function auroraTexture() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d'); const r = seeded(913);
    // 수직 빛살: 랜덤 세로 라인 다발(하단 밝고 상단 소멸)
    for (let i = 0; i < 240; i++) {
      const px = r() * 512, w2 = 1 + r() * 3, a = 0.05 + r() * 0.22;
      const g = x.createLinearGradient(0, 128, 0, 0);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.45, `rgba(255,255,255,${a * 0.55})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(px, 0, w2, 128);
    }
    const tex = track(new THREE.CanvasTexture(c)); tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }
  const AUR_SEG = soft ? 28 : 56;
  const auroraTex = auroraTexture();
  function makeAurora(zOff, phase) {
    const geo = track(new THREE.PlaneGeometry(560, 110, AUR_SEG, 1));
    const colors = new Float32Array((AUR_SEG + 1) * 2 * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = track(new THREE.MeshBasicMaterial({ map: auroraTex, vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, 155, zOff); m.visible = false; m.renderOrder = -0.6;
    m.userData = { phase };
    scene.add(m);
    return m;
  }
  const auroras = [makeAurora(-300, 0), makeAurora(-345, 2.4)];

  // ── 수면 빛반사(글린트) — 달빛 띠·노을 반사·태양 글리터(감독 지시) ──
  // 광원 방위로 뻗는 수면 위 가산합성 띠 1장(드로우콜 +1). 지면(y=0)이 수면(waterY)보다
  // 높아 depth 테스트로 자연 차폐 → 바다·강 수면에서만 보인다. waterY 미주입 시 비활성.
  const GLINT_LEN = 340, GLINT_W = 9; // 수평선(fog 원단)까지 닿는 빛기둥
  let glint = null;
  if (waterY !== null && typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const gx = c.getContext('2d'); const gr = seeded(4171);
    const img = gx.createImageData(64, 256);
    // 텍스처 v0=플레인 로컬 +z(광원 쪽) — flipY 기본이라 캔버스 하단(yy=255)이 v0.
    // 실제 반사 띠는 광원 아래 수평선 쪽이 가장 밝고 관찰자 근처에서 잔물결로 부서져 소멸한다
    // (반대로 하면 발밑이 밝은 안개처럼 보임 — 실측 적출).
    for (let yy = 0; yy < 256; yy++) {
      const toSrc = yy / 256;                       // 0=관찰자 근경 → 1=광원(수평선) 쪽
      // 중경(10~60m)까지 걸치는 완만한 프로파일 — 원단에만 집중하면 수평선 몇 픽셀로
      // 사라져 기둥이 안 보인다(실측). 원근이 원단 폭을 자연히 좁혀 기둥 형태를 만든다.
      const fall = 0.5 + 0.5 * Math.pow(toSrc, 1.3);
      const nearFade = Math.min(1, yy / 52);        // 발밑 완전 소멸
      const farFade = 1 - Math.max(0, (toSrc - 0.93) / 0.07) * 0.9; // 원단 끝 서서히(끊김 라인 방지)
      const row = 0.3 + gr() * 0.7;                 // 행별 랜덤 세기 — 잔물결에 부서지는 끊김
      for (let xx = 0; xx < 64; xx++) {
        const lat = Math.pow(Math.max(0, 1 - Math.abs(xx - 32) / 30), 1.6); // 중심 밝고 가장자리 소멸
        const i = (yy * 64 + xx) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = 255 * fall * nearFade * farFade * lat * row;
      }
    }
    gx.putImageData(img, 0, 0);
    const gtex = track(new THREE.CanvasTexture(c));
    gtex.wrapT = THREE.RepeatWrapping; // offset.y 스크롤(끊김 무늬 흐름)용
    const ggeo = track(new THREE.PlaneGeometry(GLINT_W, GLINT_LEN));
    ggeo.rotateX(-Math.PI / 2); // 수평(XZ) — 길이축=로컬 z, 텍스처 v=길이 방향
    { // 원단(광원 쪽) 폭 보상 — 원근 축소로 수평선에서 기둥이 소멸하지 않게 사다리꼴화
      const pa = ggeo.attributes.position;
      for (let i = 0; i < pa.count; i++) if (pa.getZ(i) > 0) pa.setX(i, pa.getX(i) * 2.6);
      pa.needsUpdate = true;
    }
    glint = new THREE.Mesh(ggeo, track(new THREE.MeshBasicMaterial({
      map: gtex, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending,
      depthWrite: false, fog: false, color: 0xffffff,
    })));
    // renderOrder 양수 — 바다 평면(transparent, order 0)보다 나중에 그려야 한다.
    // 음수로 먼저 그리면 92% 불투명 수면이 위에 덮여 반사가 안 보인다(실측 적출).
    glint.visible = false; glint.renderOrder = 2;
    scene.add(glint);
  }
  // 시간대별 반사 스타일 — 야간=달빛 은백 띠 / 일몰=노을 금빛 기둥 / 주간=옅은 태양 글리터
  function glintStyle() {
    if (!glint) return;
    glint.visible = state.weather === 'clear'; // 흐림·강수는 반사 없음
    if (!glint.visible) return;
    const conf = state.time === 'night' ? { col: 0xd8e0ee, op: 0.42, len: 1 }
      : state.time === 'sunset' ? { col: 0xffae62, op: 0.62, len: 1.1 }
        : { col: 0xfff3d0, op: 0.3, len: 0.6 };
    glint.material.color.set(conf.col);
    glint.material.opacity = conf.op * (lite ? LITE_GLINT_MUL : 1); // B-2 저사양 축소
    glint.scale.set(1, 1, conf.len);
  }

  // ── 번개 ──────────────────────────────────────────────────────────────────
  // 감독: "번개가 너무너무 짧은 것 같아." 실측상 밝기는 충분했다(hemiI 0.48→2.88,
  // 6배). 문제는 지속과 파형이었다 — 0.3초는 인간 반응속도(0.2~0.3초)와 겹쳐
  // 인지되기 전에 끝나고, 최대/25% 두 계단은 잔광 없이 뚝 끊긴다.
  //
  // 디자이너 재설계(2026-07-27): 총 0.9초 · 3스트로크(강·약·약) + 소강 구간 +
  // 지수 감쇠 꼬리. 실제 번개도 리턴스트로크가 여러 번 오고 첫 번째가 가장 강하다.
  let boltTimer = 8;
  /** 섬광 경과시간(초). **음수면 비활성** — 예전엔 남은시간 카운트다운이었다. */
  let flashT = -1;
  /**
   * 재발동 최소 간격(초). 이 안의 요청은 무시한다.
   *
   * 디자이너 초안은 0.15였다(주섬광을 끝까지 보여주는 최소 보장). 그런데 그 값이면
   * **⚡ 버튼을 연타할 때 주섬광이 0.15초마다 반복되어 초당 6.7회**가 된다 — 단일
   * 스트라이크 내부는 2.2Hz로 안전한데 연타 경로가 그 보호를 무너뜨린다.
   *
   * WCAG의 명멸 상한은 3Hz 미만이므로 0.34초 이상이어야 한다. 여유를 둬 0.40으로
   * 잡았다(2.5Hz). 사람이 누르는 감각으로는 여전히 "즉시"다.
   */
  const BOLT_DEBOUNCE = 0.40;

  /**
   * 광과민성 보호 모드의 강도 계수.
   *
   * 디자이너는 0.22 유지(전체가 세지면 보호도 비례해 세짐)와 0.13(절대 밝기 동결)
   * 두 안을 주고 정책 판단으로 남겼다. **0.13을 택한다** — 강도 델타가 2.4→4.0으로
   * 오르면서 0.22를 그대로 두면 보호 모드 피크가 1.008→1.36으로 **35% 세진다.**
   * 보호를 켠 사람에게 "전보다 밝아졌다"가 되는 것은 그 기능의 계약에 어긋난다.
   * 0.13은 4.0×0.13 ≈ 2.4×0.22가 되도록 역산한 값이다(절대 피크 동결).
   */
  const BOLT_KK_SAFE = 0.13;

  /** 지수 감쇠: k=0에서 a, k=1에서 b 근처. 선형보다 초반이 빠르고 꼬리가 남는다. */
  const decayTo = (a, b, k) => b + (a - b) * Math.exp(-3.5 * k);

  /**
   * 섬광 배수(0~1). 경과시간 t(초)에 대한 파형.
   *
   * `safe`(광과민성 보호)는 **강도만 줄이는 게 아니라 파형을 바꾼다.** 예전에는
   * 깜빡임 패턴을 그대로 두고 진폭만 22%로 낮췄는데, WCAG의 핵심은 "초당 3회 이상
   * 명멸 금지"이지 강도가 아니다. 단봉으로 만들면 깜빡임 자체가 없어져 더 안전하고
   * 더 자연스럽다(디자이너 지적).
   */
  function boltMult(t, safe) {
    if (t < 0) return 0;
    if (safe) {
      if (t < 0.05) return t / 0.05;          // 완만한 상승
      if (t < 0.30) return decayTo(1, 0, (t - 0.05) / 0.25);
      return 0;
    }
    if (t < 0.04) return 1;                                              // 주섬광
    if (t < 0.11) return decayTo(1, 0.12, (t - 0.04) / 0.07);            // 급락
    if (t < 0.17) return 0.12;                                           // 소강
    if (t < 0.21) return 0.12 + (0.80 - 0.12) * ((t - 0.17) / 0.04);     // 2차 상승
    if (t < 0.30) return decayTo(0.80, 0.10, (t - 0.21) / 0.09);         // 2차 감쇠
    if (t < 0.37) return 0.10;                                           // 소강
    if (t < 0.40) return 0.10 + (0.45 - 0.10) * ((t - 0.37) / 0.03);     // 3차 상승
    if (t < 0.55) return decayTo(0.45, 0.06, (t - 0.40) / 0.15);         // 3차 감쇠
    if (t < 0.90) return 0.06 * (1 - (t - 0.55) / 0.35);                 // 산란 잔광
    return 0;
  }
  const boltDur = (safe) => (safe ? 0.30 : 0.90);

  /** 실제 발동. 디바운스에 걸리면 false. */
  function strike() {
    if (flashT >= 0 && flashT < BOLT_DEBOUNCE) return false;
    flashT = 0;
    synthThunder(0.8 + Math.random() * 2.2);
    return true;
  }
  const cur = asVec(lightOf('day', 'clear', fogTint)); // 현재 적용값(플래시 기준·lerp 결과 보관)

  function applyLighting(vals) {
    sun.color.copy(vals.sun); sun.intensity = vals.sunI;
    hemi.color.copy(vals.hemiS); hemi.groundColor.copy(vals.hemiG); hemi.intensity = vals.hemiI;
    if (scene.fog) scene.fog.color.copy(vals.fog);
    renderer.setClearColor(vals.fog, 1);
  }

  /** ① 태양(밤=달) 방향 벡터 — 배선측이 디렉셔널 위치·섀도에 사용(하늘 그림과 조명 일치).
   *  azWorld()로 구 UV 정합 실측치를 반영 — 그림 속 해·달 방위와 빛 방향이 일치한다. */
  function getSunDir() {
    const L = LIGHT[state.time][state.weather];
    const az = azWorld(L.moon ? MOON_AZ : SUN_AZ);
    const el = L.moon ? 0.9 : L.sunEl * Math.PI * 0.5 + 0.12;
    return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  }

  function normalize(s) {
    const time = SKY_TIMES.includes(s.time) ? s.time : state.time;
    const weather = SKY_WEATHERS.includes(s.weather) ? s.weather : state.weather;
    const fx = Object.assign({}, state.fx, s.fx || {});
    if (time === 'night') fx.rainbow = false;
    if (weather === 'rain' || weather === 'snow') fx.rainbow = false;
    if (!(time === 'night' && weather === 'clear')) fx.aurora = false;
    return { time, weather, fx };
  }

  // ── B-2 저사양 오버드로우 축소 API ──
  // 강수는 draw-range로 그리는 입자 수를 줄인다(물리 풀·버퍼는 전체 유지 — update는 전 입자를
  // 계속 굴려 lite 해제 시 즉시 정상 복원). 보조 투명 레이어(오로라·빛기둥·반짝이 별)는 opacity만
  // 낮춘다. 반환값은 검증·계측용 스냅샷(draw-range·opacity 실측).
  function applyPrecipDrawRange() {
    // 비: LineSegments(선분당 2정점) — 앞쪽 N선분만 그린다(짝수 정점 보장).
    const rSeg = lite ? Math.floor(R_COUNT * LITE_PRECIP_MUL) : R_COUNT;
    rainGeo.setDrawRange(0, rSeg * 2);
    // 눈: InstancedMesh — 그리는 인스턴스 수를 줄인다(버퍼·물리는 전체 유지).
    snow.count = lite ? Math.floor(S_COUNT * LITE_PRECIP_MUL) : S_COUNT;
  }
  function liteSnapshot() {
    return {
      lite,
      rainDraw: rainGeo.drawRange.count, rainMax: R_COUNT * 2,
      snowDraw: snow.count, snowMax: S_COUNT,
      auroraOpacity: auroras[0].material.opacity,
      glintMul: lite ? LITE_GLINT_MUL : 1,
      twkMul: lite ? LITE_TWK_MUL : 1,
    };
  }
  function setLite(on) {
    on = !!on;
    if (on === lite) return liteSnapshot(); // idempotent
    lite = on;
    applyPrecipDrawRange();
    // 오로라 — 기준 opacity에 배수 적용(update가 opacity를 안 건드리므로 여기서 확정·복원).
    for (const a of auroras) a.material.opacity = AUR_BASE_OPACITY * (lite ? LITE_AUR_MUL : 1);
    glintStyle(); // 빛기둥 — lite 배수 반영해 재적용
    // 흐르는 구름 — lite 상태를 visible에 즉시 반영(크로스페이드 중이라도 boolean visible만 갱신 —
    // opacity 보간은 update가 계속 담당하므로 무해). phase!==1로 가드하면 크로스페이드 중 lite 해제가
    // 완료 분기(update)의 비대칭 때문에 구름이 영구 은닉되던 회귀(교차리뷰 블로커)라 무조건 반영으로 차단.
    cloudMesh.visible = cloudFade.to > 0 && !lite;
    // 반짝이 별(twk 2겹 AdditiveBlending 풀돔) — 구름과 동일 게이트로 lite 시 visible=false로 숨겨
    // 실제 fill을 던다(opacity 배수만으론 픽셀 셰이딩·블렌딩 비용이 그대로 남는다). 해제 시 want 상태로 복원.
    const twkVis = (twkTarget > 0 || twkBase > 0.01) && !lite;
    for (const w of twk) w.mesh.visible = twkVis;
    return liteSnapshot();
  }

  let phase = 0; // 크로스페이드 진행(0=없음)
  function set(s = {}, o = {}) {
    const n = normalize(s);
    const changedDome = n.time !== state.time || n.weather !== state.weather;
    state.time = n.time; state.weather = n.weather; state.fx = n.fx;
    if (typeof s.flashSafe === 'boolean') state.flashSafe = s.flashSafe;
    const L = lightOf(state.time, state.weather, fogTint);
    const fade = (o.fade === undefined ? 1.8 : o.fade) * (soft ? 0 : 1); // 저사양은 스냅
    // `fogTint` 를 돔 페인터에도 넘긴다 — 안 넘기면 지평선만 원래 색으로 남아 ⑨ 가 깨진다.
    // `blue` 를 **여기서** 푼다 — 함수면 매 페인트마다 묻는다(옵션 주석). 이 줄이 돔을
    // 굽는 유일한 자리라, 여기서 풀면 전환 경로가 자동으로 따라온다.
    const pOpts = { soft, lowRes: false, fogTint, blue: typeof skyBlue === 'function' ? skyBlue() : skyBlue, curve: cloudCurve, cloudH }; // 돔 2048 고정(위 주석) — 저해상 별 경로 사용 안 함
    if (changedDome && fade > 0) {
      paintSky(domeB.ctx, DOME_W, DOME_H, state.time, state.weather, pOpts);
      domeB.tex.needsUpdate = true;
      fadeDome.material.map = domeB.tex; fadeDome.material.opacity = 0; fadeDome.visible = true;
      lerpState.from = { ...cur, sun: cur.sun.clone(), hemiS: cur.hemiS.clone(), hemiG: cur.hemiG.clone(), fog: cur.fog.clone() };
      lerpState.to = asVec(L); lerpState.t = 0; lerpState.dur = fade;
      phase = 1;
    } else {
      paintSky(domeA.ctx, DOME_W, DOME_H, state.time, state.weather, pOpts);
      domeA.tex.needsUpdate = true;
      Object.assign(cur, asVec(L)); applyLighting(cur);
      lerpState.t = 1; phase = 0;
    }
    rain.visible = state.weather === 'rain';
    snow.visible = state.weather === 'snow';
    rainbowGrp.visible = !!state.fx.rainbow;
    for (const a of auroras) a.visible = !!state.fx.aurora;
    boltTimer = 6 + Math.random() * 8;
    glintStyle(); // 수면 빛반사 — 시간대·날씨에 맞는 색·강도로

    // 흐르는 구름 레이어 — 맑은 낮/일몰만. 시간대 바뀌면 재페인트(시드 고정→형태 유지·톤만 변경).
    const wantCloud = state.weather === 'clear' && state.time !== 'night';
    // [B-2 오버드로우 축소 — 팀장 재판정/부팀장] lite(저사양 위기)에선 구름을 숨긴다(visible=false).
    // opacity 배수는 alpha-blend fill을 못 줄이지만(픽셀은 그대로 셰이딩·블렌딩) visible=false는 이 대형
    // 상반부 레이어를 아예 안 그려 실제 fill을 던다. 위기 한정이라 평상시 룩 무영향, 해제 시 setLite가 복원.
    if (wantCloud) { paintClearClouds(cloudCtx, DOME_W, DOME_H / 2, state.time, soft, cloudCurve, cloudH); cloudTex.needsUpdate = true; cloudMesh.visible = !lite; }
    cloudFade.from = cloudMesh.material.opacity;
    cloudFade.to = wantCloud ? 1 : 0;
    if (phase !== 1) { cloudMesh.material.opacity = cloudFade.to; cloudMesh.visible = cloudFade.to > 0 && !lite; }

    // 별 반짝임 — 야간 맑음, **그리고 `wantStars` 가 참일 때**(옵션 주석 참조).
    // ⚠ world1 은 그 옵션을 안 주므로 `?.()` 가 `undefined` → 동작 바이트 동일이다.
    const wantTwk = (state.time === 'night' || wantStars?.() === true) && state.weather === 'clear';
    twkTarget = wantTwk ? 1 : 0;
    for (const w of twk) w.mesh.visible = (wantTwk || twkBase > 0.01) && !lite; // lite 시 별 레이어 숨김(구름과 동형 게이트)
    if (soft) twkBase = twkTarget; // 저사양은 스냅
    if (onApply) { try { onApply(get(), L); } catch (_) {} } // ⑩ 가로등·창·envMap 연동 훅
    return get();
  }
  /**
   * `settling`: **지금 그려지는 것이 논리 상태와 아직 일치하지 않는가.**
   *
   * `set()`이 불리는 즉시 `state.time`/`state.weather`는 새 값이 되지만, 실제로 화면에
   * 올라가는 메시 집합은 잠시 다르다. 그 어긋난 구간을 소비자가 알아야 한다 — world2 성능
   * 리포트가 드로우콜을 하늘 상태별로 판정하는데, 이 구간을 구별하지 못하면 하늘을 바꿀
   * 때마다 오탐이 난다.
   *
   * ── 소비자가 축을 세지 않게 한다 ──────────────────────────────────────────
   * 이 판정을 소비자 쪽에 두었다가 **세 번 연속으로 축을 빠뜨렸다**: 크로스페이드 돔,
   * `lite`, 그리고 별 반짝임 감쇠 꼬리. 축을 세는 책임이 바깥에 있는 한 네 번째가 온다.
   * 그래서 `sky.js`가 스스로 답한다.
   *
   * **비동기 가시성 축은 아래가 전부다. `.visible` 대입을 새로 추가하면 여기를 갱신하라.**
   *   ① 돔 크로스페이드(`phase === 1`) — `fadeDome`이 하나 더 그려지고, 그동안
   *      `cloudMesh.visible` 갱신도 `phase !== 1` 가드로 멈춰 이전 구름이 남는다.
   *   ② 별 반짝임 감쇠 꼬리 — `wantTwk`는 즉시 꺼지는데 `twk[].visible`은 `twkBase`가
   *      0.01 밑으로 떨어질 때까지 유지된다. **①과 완전히 독립된 시계로 돈다.**
   *
   * ②를 따로 세야 하는 이유: 지금은 감쇠가 1.5초, 크로스페이드가 1.8초라 꼬리가 ① 안에
   * 통째로 들어가 안 터진다. 그런데 그 0.3초 마진은 **설계가 아니라 우연**이다 — `fade`
   * 기본값(1.8)·감쇠율(3)·문턱(0.01)이 서로 다른 세 곳에 독립적으로 박힌 상수라, `fade`를
   * 1.2초로 줄이는 정상적인 튜닝만으로 역전된다. 상수 관계를 테스트로 못 박는 대신 상태를
   * 직접 보는 이유가 이것이다 — 상수가 바뀌어도 저절로 옳다.
   *
   * `rain`·`snow`·`rainbowGrp`·오로라·`glint`는 `state.weather`/`fx`에서 동기 즉시
   * 결정되고 별도 감쇠 시계가 없다. 번개는 조명 강도·색만 바꾸고 메시를 안 건드린다.
   */
  const settling = () => phase === 1 || (twkTarget === 0 && twkBase > 0.01);

  // `lite`는 `settling`이 아니라 **키에 들어가야 할 축**이다 — 전이가 아니라 다른 상태이고,
  // 켜지면 구름·별 레이어를 아예 끈다. 아직 world2에 배선돼 있지 않지만 지금 노출해 둔다.
  // "배선할 때 잊지 말라"는 메모보다 값을 지금 내주는 편이 확실하다.
  const get = () => ({
    time: state.time, weather: state.weather, fx: Object.assign({}, state.fx),
    flashSafe: state.flashSafe, settling: settling(), lite,
  });

  let t = 0;
  function update(dt) {
    t += dt;
    const pos = getPos();
    // ⑧ 크로스페이드 진행 — 돔 opacity + 조명 lerp, 완료 시 A/B 스왑
    if (phase === 1) {
      lerpState.t = Math.min(1, lerpState.t + dt / lerpState.dur);
      const k = lerpState.t * lerpState.t * (3 - 2 * lerpState.t); // smoothstep
      fadeDome.material.opacity = k;
      cur.sun.lerpColors(lerpState.from.sun, lerpState.to.sun, k);
      cur.hemiS.lerpColors(lerpState.from.hemiS, lerpState.to.hemiS, k);
      cur.hemiG.lerpColors(lerpState.from.hemiG, lerpState.to.hemiG, k);
      cur.fog.lerpColors(lerpState.from.fog, lerpState.to.fog, k);
      cur.sunI = lerpState.from.sunI + (lerpState.to.sunI - lerpState.from.sunI) * k;
      cur.hemiI = lerpState.from.hemiI + (lerpState.to.hemiI - lerpState.from.hemiI) * k;
      applyLighting(cur);
      cloudMesh.material.opacity = cloudFade.from + (cloudFade.to - cloudFade.from) * k; // 구름 페이드 동조
      if (lerpState.t >= 1) { // 스왑: B를 주 돔으로
        domeA.ctx.drawImage(domeB.c, 0, 0);
        domeA.tex.needsUpdate = true;
        fadeDome.visible = false; fadeDome.material.opacity = 0;
        cloudMesh.visible = cloudFade.to > 0 && !lite; // 완료 시 visible 확정(대칭) — 구름 있어야 하고 lite 아니면 표시, 아니면 숨김. 복원 분기 부재로 크로스페이드 중 lite 해제 시 영구 은닉되던 회귀 차단(교차리뷰 블로커)
        phase = 0;
      }
    }
    // 흐르는 구름 — 가로 offset 스크롤(바람). 셰이더·버텍스변형 0. soft도 스크롤은 무료(offset만).
    if (cloudMesh.visible) cloudTex.offset.x = (cloudTex.offset.x + 0.006 * dt) % 1;
    // 별 반짝임 — 두 레이어 반대 위상 진동(다른 속도로 어긋나 자연스러운 트윙클). 항상 일부는 밝다.
    twkBase += (twkTarget - twkBase) * Math.min(1, 3 * dt);
    if (twk[0].mesh.visible) {
      const twkMul = lite ? LITE_TWK_MUL : 1; // B-2 저사양 축소(진동 파형·색은 유지, 세기만 하향)
      twk[0].mesh.material.opacity = twkBase * (0.22 + 0.78 * (0.5 + 0.5 * Math.sin(t * 1.7))) * twkMul;
      twk[1].mesh.material.opacity = twkBase * (0.22 + 0.78 * (0.5 + 0.5 * Math.sin(t * 2.3 + 2.4))) * twkMul;
      if (twkBase < 0.01 && twkTarget === 0) for (const w of twk) w.mesh.visible = false;
    }
    // 강수
    if (rain.visible) {
      const arr = rainGeo.attributes.position.array;
      const fall = 17 * dt * state.precip;
      for (let i = 0; i < R_COUNT; i++) {
        arr[i * 6 + 1] -= fall; arr[i * 6 + 4] -= fall;
        if (arr[i * 6 + 4] < 0) { const ny = RBOX.y; arr[i * 6 + 1] = ny; arr[i * 6 + 4] = ny - 0.55; }
      }
      rainGeo.attributes.position.needsUpdate = true;
      rain.position.set(pos.x, 0, pos.z);
    }
    if (snow.visible) {
      const arr = sPos;
      const fall = 2.1 * dt * state.precip;
      // 물리는 전 입자를 굴린다(lite로 그리는 수를 줄여도 해제 시 즉시 정상 복원).
      for (let i = 0; i < S_COUNT; i++) {
        arr[i * 3 + 1] -= fall;
        arr[i * 3] += Math.sin(t * 1.3 + sSeed[i]) * dt * 0.5;
        if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] += RBOX.y;
      }
      // 그리는 수만 인스턴스 행렬에 반영한다(snow.count = draw-range 대응).
      for (let i = 0; i < snow.count; i++) {
        _sP.set(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]);
        _sM.compose(_sP, _sQ, _sS);
        snow.setMatrixAt(i, _sM);
      }
      snow.instanceMatrix.needsUpdate = true;
      snow.position.set(pos.x, 0, pos.z);
    }
    // 수면 빛반사 — 광원(밤=달) 방위로 관찰자 앞에 뻗는 띠. 잔물결 스크롤과 동조해 흐르는 느낌.
    if (glint && glint.visible) {
      const az = azWorld(LIGHT[state.time][state.weather].moon ? MOON_AZ : SUN_AZ);
      const halfL = GLINT_LEN * glint.scale.z * 0.5;
      glint.position.set(pos.x + Math.sin(az) * (halfL - 6), waterY + 0.05, pos.z + Math.cos(az) * (halfL - 6));
      glint.rotation.y = az;
      glint.material.map.offset.y = (t * 0.014) % 1; // 띠 위 끊김 무늬가 천천히 흐름
    }
    // 무지개 — 태양 반대 방위(광학적으로 정확: 무지개는 항상 해를 등질 때 보인다)
    if (rainbowGrp.visible) {
      const az = azWorld(SUN_AZ) + Math.PI;
      rainbowGrp.position.set(pos.x + Math.sin(az) * 300, -24, pos.z + Math.cos(az) * 300);
      rainbowGrp.lookAt(pos.x, -24, pos.z);
    }
    // 오로라 — 물결(버텍스 y) + 색 흐름(하단 그린 엣지→상단 퍼플) + 텍스처 드리프트
    if (state.fx.aurora) {
      auroraTex.offset.x = t * 0.005;
      for (const a of auroras) {
        a.position.x = pos.x; a.position.z = pos.z + a.userData.phase * 12 - 320;
        const cAttr = a.geometry.attributes.color, pAttr = a.geometry.attributes.position;
        for (let i = 0; i <= AUR_SEG; i++) {
          const w = Math.sin(t * 0.5 + i * 0.33 + a.userData.phase) * 16 + Math.sin(t * 0.23 + i * 0.11) * 8;
          pAttr.setY(i, 55 + w); pAttr.setY(i + AUR_SEG + 1, -55 + w * 0.55);
          const k = 0.5 + 0.5 * Math.sin(t * 0.35 + i * 0.2 + a.userData.phase);
          // 상단(퍼플·소멸) / 하단(그린 엣지 — 오로라의 가장 밝은 곳)
          cAttr.setXYZ(i, 0.5 + 0.16 * k, 0.24 + 0.1 * k, 0.72 + 0.18 * k);
          cAttr.setXYZ(i + AUR_SEG + 1, 0.2 + 0.16 * k, 0.95, 0.5 + 0.16 * k);
        }
        cAttr.needsUpdate = true; pAttr.needsUpdate = true;
      }
    }
    // 번개(비) — 이중 섬광(자연스러운 더블 플래시) + 지연 천둥
    if (state.weather === 'rain') {
      boltTimer -= dt;
      if (boltTimer <= 0) { boltTimer = 7 + Math.random() * 14; strike(); }
    }
    // 섬광 진행은 **날씨 밖에서** 마무리한다. 예전에는 이 블록이 `weather==='rain'`
    // 안에 있어서, 섬광 도중 비를 끄면 조명이 밝아진 채로 굳었다(복구 코드도 같은
    // 블록 안이라 도달하지 못했다). 진행 중인 연출은 끝까지 자기 손으로 꺼야 한다.
    if (flashT >= 0) {
      flashT += dt;
      const safe = state.flashSafe;
      const kk = safe ? BOLT_KK_SAFE : 1.0;
      const e = boltMult(flashT, safe) * kk; // 공통 봉투(강도·색·하늘이 같은 곡선을 쓴다)
      hemi.intensity = cur.hemiI + 4.0 * e;
      sun.intensity = cur.sunI + 1.6 * e;
      // ── 색도 흰색으로 당긴다 (디자이너 진단 2026-07-27) ────────────────────
      // 강도만 올리면 "번쩍"이 안 된다. 야간 비의 빛 색이 이미 어둡기 때문이다
      // (hemiG = 0x191d1a, 거의 검정). 그 색에 intensity만 곱하면 결과는 **야간
      // 팔레트 안에서 조금 밝아진 회색**에 머물고, 화면이 "번쩍"으로 인식하는
      // 흰색 클립존까지 못 간다. 하늘이 2.3배로도 확 튀는 건 MeshBasicMaterial이라
      // PBR 감쇠를 안 거치고 색을 곧장 배수하기 때문이다 — 그래서 배수를 더 올리는
      // 것만으로는 지상이 영영 하늘을 못 따라잡는다.
      //
      // 65%만 섞는다. 순백으로 밀면 야간 색조가 한 프레임 통째로 사라져 "다른 씬으로
      // 순간이동"한 것처럼 튄다.
      const w = safe ? 0 : 0.65 * e; // 보호 모드는 색을 건드리지 않는다(색조 유지가 곧 보호)
      hemi.color.copy(cur.hemiS).lerp(WHITE, w);
      hemi.groundColor.copy(cur.hemiG).lerp(WHITE, w);
      sun.color.copy(cur.sun).lerp(WHITE, w);
      // 하늘도 함께 밝힌다. 스카이돔은 MeshBasicMaterial이라 조명을 안 받으므로,
      // 이걸 안 하면 하늘을 올려다보는 동안에는 번개가 쳐도 **아무 일도 일어나지
      // 않는다** — 감독이 "불빛이 안 보인다"고 한 것이 그 상태였다.
      // 새 메시·재질을 만들지 않고 기존 재질의 color만 쓴다(개수 불변식).
      const boost = 1 + 1.5 * e;
      sky.material.color.setScalar(boost);
      // 크로스페이드 중에는 fadeDome이 위에 겹쳐 있다. 함께 밝히지 않으면 날씨
      // 전환 도중에만 하늘 섬광이 안 먹는다(디자이너 지적).
      if (fadeDome.visible) fadeDome.material.color.setScalar(boost);
      if (flashT >= boltDur(safe)) {
        flashT = -1;
        // **색까지 되돌린다.** intensity만 복원하면 야간 톤이 흰색에 물든 채 고착된다
        // — 평상시에는 applyLighting()이 다시 불리지 않으므로 아무도 되돌려주지 않는다.
        hemi.intensity = cur.hemiI; sun.intensity = cur.sunI;
        hemi.color.copy(cur.hemiS);
        hemi.groundColor.copy(cur.hemiG);
        sun.color.copy(cur.sun);
        sky.material.color.setScalar(1);
        fadeDome.material.color.setScalar(1);
      }
    }
  }

  function dispose() {
    scene.remove(rain); scene.remove(snow); scene.remove(rainbowGrp); for (const a of auroras) scene.remove(a);
    if (glint) scene.remove(glint);
    sky.remove(cloudMesh);
    for (const w of twk) sky.remove(w.mesh);
    sky.remove(fadeDome);
    for (const o of disposables) { try { o.dispose(); } catch (_) {} }
  }

  set({ time: 'day', weather: 'clear' }, { fade: 0 });
  /**
   * 번개를 즉시 친다(비일 때만).
   *
   * 자동 발동은 첫 8초 + 이후 7~21초 간격이라 **평균 13~20초에 한 번**이다(헤드리스
   * 40초 실측: 섬광 2~3회). 게다가 섬광은 0.3초이고 조명 강도만 올리므로 하늘을
   * 보고 있으면 아무 일도 없는 것처럼 보인다 — 감독이 "천둥 불빛이 안 보인다"고 한
   * 것이 그 조합이었다. 코드는 정상이었고(hemiI 0.48→2.88 실측) **확인이 불가능한
   * 설계**였던 것이다.
   *
   * 그래서 즉시 트리거를 연다. 진단 수단이자 연출 도구다.
   */
  function bolt() {
    if (state.weather !== 'rain') return false;
    return strike(); // 디바운스도 함께 적용된다
  }

  /**
   * 부팅 예열 — 잠들어 있는 레이어를 **한 프레임 그리게 하려고** 잠시 전부 켠다.
   *
   * 이 함수는 그리지 않는다. `sky.js`는 카메라를 주입받지 않아서 렌더를 부를 수 없다.
   * 호출자가 켠 채로 몇 프레임 렌더한 뒤, 반환된 함수로 되돌린다.
   *
   * ── 왜 필요한가 (감독 실기기 실측 2026-07-29) ────────────────────────────
   * 개수는 부팅 시점에 이미 상수다 — 비·눈·무지개·오로라를 여기서 전부 만들어
   * `visible=false`로 재워 두기 때문이다. 그래서 오래 "개수 불변식은 이미 지켜져
   * 있다"고 적어 두었는데, **그 문장이 재는 축을 틀리게 짚고 있었다.**
   *
   * three의 `info.memory`는 객체를 만들 때가 아니라 **처음 그릴 때** 오른다. 재워둔
   * 메시는 렌더 목록에 오르지 않으므로 지오 버퍼도, 텍스처 업로드도, 파이프라인도
   * 그때까지 존재하지 않는다. 만들어 두는 것과 GPU에 올라가 있는 것은 다른 일이다.
   *
   * 그래서 감독이 낮→밤→천둥을 바꾼 30~35초 구간에서 pipeline 31→33 · geometry
   * 92→95 · texture 32→35가 계단으로 올랐고, 그 뒤로는 상수였다. 계속 늘면 증식이고
   * 한 번 오르고 멈추면 첫 등장 비용이다 — 후자의 서명이다.
   *
   * 문제는 개수가 아니라 개수가 *오르는 순간*이다. 그 순간을 로딩 화면으로 옮긴다.
   *
   * ── 왜 여기에 목록이 있는가 ──────────────────────────────────────────────
   * 무엇이 잠들어 있는지는 `sky.js`만 안다. 소비자가 세면 레이어를 하나 추가할 때마다
   * 조용히 빠진다 — `settling` 축을 세 번 연속 빠뜨린 뒤 내린 것과 같은 결론이다.
   *
   * @returns {() => void} 원상복구. 예열 렌더 직후에 반드시 부른다.
   */
  function prewarm() {
    const layers = [fadeDome, cloudMesh, rain, snow, rainbowGrp];
    for (const a of auroras) layers.push(a);
    for (const w of twk) layers.push(w.mesh);
    // `glint`는 `waterY`가 있을 때만 만들어진다. 없으면 예열할 것도 없다.
    if (glint) layers.push(glint);
    const prev = layers.map((o) => o.visible);
    for (const o of layers) o.visible = true;
    return () => { for (let i = 0; i < layers.length; i++) layers[i].visible = prev[i]; };
  }

  return { set, get, update, getSunDir, setLite, bolt, prewarm, dispose, SKY_TIMES, SKY_WEATHERS };
}

/** 방문자 실제 시각 → 시간대 자동 매핑(신 모드 '자동' 버튼용) */
export function autoTimeOfDay(d = new Date()) {
  const h = d.getHours();
  if (h >= 7 && h < 17) return 'day';
  if ((h >= 17 && h < 20) || (h >= 5 && h < 7)) return 'sunset';
  return 'night';
}
