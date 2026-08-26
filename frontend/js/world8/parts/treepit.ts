// world8/parts/treepit.ts — 나무 발치의 흙 + 벽돌 링.
//
// ── 감독 지시 2026-08-06 ─────────────────────────────────────────────────────
// *"기본 world 에서 나무 밑에 흙, 동그랗게 벽돌 그렇게 있거든. 월드 2의 나무도 그렇게
//   해줘."*
//
// world1 은 `world.js` 의 `makeTreePitTex` + `CircleGeometry(1,20)` 데칼로 그것을 한다.
// 같은 룩을 world2 의 파츠 규약으로 옮긴다.
//
// ── 왜 나무 지오메트리에 병합하지 않았나 ────────────────────────────────────
// 파츠를 늘리면 드로우콜이 하나 는다. 그래서 먼저 "나무 지오에 원반을 붙여 재질 하나로
// 끝낼 수 있나" 를 봤는데, **텍스처 아틀라스가 막는다.** 나무 재질은 `tree.ts` 의
// 아틀라스(왼쪽 수피 · 오른쪽 잎)를 `LEAF_U0` 로 갈라 쓰고, 색은 정점색이 준다. 흙과
// 벽돌을 거기 넣으려면 아틀라스를 3분할로 바꿔야 하고 그러면 **기존 잎·수피 UV 가 전부
// 다시 계산된다** — 감독 판정이 여러 번 들어간 잎 실루엣을 건드리는 값이다.
//
// 얻는 것(드로우콜 1)보다 잃을 위험이 크다. world1 도 별도 메시로 한다.
//
// ── 반경을 상수로 적지 않는다 ────────────────────────────────────────────────
// world1 은 `PIT_RADIUS = 1.3` 이 상수이고, world2 의 `TREE_RADIUS_UNIT` 도 1.3 이다.
// **우연히 같지만 그래서 더 위험하다** — 여기에 1.3 을 다시 적으면 나무 반경을 바꾸는
// 날 pit 만 옛 크기로 남는다. `TREE_RADIUS_UNIT` 에서 유도한다.
//
// 유도가 옳은 이유는 값이 같아서가 아니라 **뜻이 같아서**다: pit 은 "나무가 차지한
// 바닥" 이고, 나무가 확보하는 자리가 정확히 그 반경이다(`tree.ts` 의 `footprint`).
// 그래서 pit 은 나무가 이미 비워 둔 자리 안에 정확히 들어간다 — world1 이 건물 겹침
// 클램프(`treePitRadius`)를 따로 둬야 했던 문제가 여기서는 구조적으로 없다.
//
// ── 도로와 겹치지 않는 근거 ──────────────────────────────────────────────────
// 나무는 `parcelSlots` 가 도로를 빼고 준 슬롯에서만 자리를 잡고, `jitterIn` 이 반경 `r`
// 안쪽으로 가둔다(`tree.ts`). pit 반경이 정확히 그 `r` 이므로 **도로에 닿을 수 없다.**
// 그래서 높이를 도로보다 낮게 둬도 흙이 포장 위로 뜨는 일이 없다.
//
// ── ⚠ 라이브 화면에서는 **풀에 가려 안 보인다** (감독 판정 2026-08-25) ──────
// 2026-08-22 에 들어온 풀(`features/grass.ts`)이 잔디 파셀을 덮는데, 그 판정
// (`decide/grass.ts` 의 `plantScale`)은 나무 발치를 예외로 두지 않는다. 그래서 흙도
// 벽돌도 풀에 묻힌다 — 헤드리스 스크린샷 두 장(`?grass=0` 대조)으로 실측했다.
//
// 감독께 셋을 물었고(발치 풀 제거 / 풀 낮추기 / 그대로), **「그대로 둔다」** 판정이
// 나왔다. 그러므로 이 파츠는 다음 세 자리에서만 보인다:
//   · `?grass=0` 으로 풀을 껐을 때
//   · 내보낸 GLB 안 (풀은 GLB 에 안 들어간다 — 파츠가 아니라 별도 시스템이다)
//   · 풀이 안 나는 표면(광장 등)에 선 나무
//
// **이것을 「미완성」으로 읽지 마라.** 화면에 안 보이는 것이 감독이 고른 상태다.
// 재론 조건: 감독이 발치 흙을 화면에서 보고 싶다고 다시 말하는 회차 — 그때 처방은
// `plantScale` 에 pit 반경 회피를 넣는 것이고, 비용은 풀잎마다 그 파셀 나무와의 거리
// 계산이라 **성능 축이 함께 온다**(풀잎 상한 155,000).

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { TREE_RADIUS_UNIT } from './tree.js';
import { SHADOW_LIFT } from '../decide/shadow-decal.js';

/**
 * 흙 바탕색. `groundBase` 로 신고해 밤 알베도 배선에 편입된다
 * (`decide/ground-albedo.ts` — 밤 처방은 전부 빛이고 빛은 알베도에 곱해지므로,
 * 지면 파츠가 이 값을 신고하지 않으면 그 파츠만 밤에 튄다).
 *
 * world1 값 `#362c24` 그대로다. 감독이 한 번 확정한 톤이라 옮기면서 바꾸지 않는다 —
 * 최초 버전(`#4a3a2c`)이 *"배경 대비 과하게 쨍하다"* 는 판정을 받고 내려온 값이다.
 */
export const DIRT_BASE = 0x362c24;

/** 벽돌 2톤. 조각별로 번갈아 칠해 조적감을 낸다 — 실제 사진 텍스처가 아니다 */
const BRICK_A = '#6e4736';
const BRICK_B = '#7c5240';

/**
 * **밟는 바닥 위로 얼마나 띄우는가**(미터). 절대 높이가 아니다.
 *
 * ── ① 절대값으로 적었다가 고쳤다 ────────────────────────────────────────────
 * 처음엔 `PIT_Y = 0.12` 라는 상수였다. *"정원(0.07) 위 5cm"* 라는 뜻이었는데, 그것은
 * **나무가 언제나 잔디 위에 선다고 가정한 값**이다. 광장에 선 나무의 pit 은 바닥(0)에서
 * 12cm 떠 버린다. 바닥 높이는 종류가 아니라 **자리**의 속성이므로(`parts/surface.ts`,
 * 팀장 판정 2026-08-12) 캐스터인 나무의 `y` 에 얹는다.
 *
 * ── ② 0.05 였다가 **그림자 아래로** 내렸다 (검수관 반려 B4, 2026-08-23) ─────
 * 0.05 는 나무의 **접촉 그림자 데칼보다 위**였다(`SHADOW_LIFT` 0.02). pit 은 불투명
 * 흙 텍스처이고 데칼은 `transparent`+`depthWrite:false` 라, 같은 중심에서 pit 이 위에
 * 있으면 **데칼이 깊이 테스트에 걸려 탈락한다** — 나무가 자기 발치에 드리우는 그늘이
 * 흙에 가려진다.
 *
 * 그래서 `SHADOW_LIFT` 에서 **유도한다**: 그림자보다 확실히 아래. 값을 따로 적으면
 * 그림자 높이를 만질 때 이 관계가 조용히 뒤집힌다 — 그 뒤집힘은 «그늘이 없어졌다» 로만
 * 보여 원인을 짚기 어렵다.
 *
 * 순서가 이렇게 된다(잔디 파셀, 나무 y=0.07 기준):
 *
 *     0.070  잔디 판
 *     0.080  흙 pit          ← 여기
 *     0.090  접촉 그림자     ← 흙 **위에** 드리운다
 *
 * ⚠ **화면으로 확인해야 확정이다.** 유도한 순서가 맞아도 반경 관계(pit 은 수관 반경,
 * 데칼은 캐스터 밑동 기준)까지 맞는지는 수치로 안 갈린다.
 */
const PIT_LIFT = SHADOW_LIFT / 2;

/**
 * 원의 분할 수.
 *
 * ── world1 의 20 을 그대로 쓰면 각져 보인다 (실측으로 고쳤다) ───────────────
 * world1 은 24→20 으로 낮추고 *"육안 무차이"* 를 확인했다. 그 판정은 **반경이 1.3m
 * 고정**이라는 전제 위에 있었다. world2 나무는 스케일이 0.6~1.9 배로 흔들려 pit 반경이
 * 최대 `1.3 × 1.9 = 2.47m` — 거의 두 배다. 같은 20 세그면 조각 하나의 길이가
 * 0.41m → 0.78m 로 두 배 거칠어지고, 첫 스크린샷에서 실제로 큰 나무 발치가 다각형으로
 * 보였다.
 *
 * **값이 아니라 전제가 옮겨온 것이 문제였다.** 32 면 조각 길이가 0.48m 로 world1 의
 * 0.41m 에 근접한다. 비용은 그루당 삼각형 12개 — 2,540 그루 전체로 3만개이고 세계
 * 총계(125만)의 2.4% 다.
 */
const SEGMENTS = 32;

/**
 * 흙 + 벽돌 링 텍스처. **world1 `makeTreePitTex` 와 같은 구성이다.**
 *
 *   0~80%    흙 베이스 + 클럼프 얼룩(뿌리 주변 멀칭)
 *   80~82%   모르타르 경계선
 *   82~100%  벽돌 링 11조각, 2톤 교대
 *
 * `CircleGeometry` 의 기본 UV 가 이미 중심 (0.5,0.5)·반경 0.5 원형이라 방사형 구성이
 * 왜곡 없이 정합한다.
 *
 * ⚠ **값이 world1 과 두 곳에 있다.** 공유 모듈로 올리지 않은 이유는 두 가지다:
 * ① `world.js` 는 라이브 오픈월드이고 이 함수는 그 파일의 클로저 안이라, 꺼내려면
 *    라이브 렌더 경로를 수정해야 한다 — 감독 요청 범위 밖이다.
 * ② world1 은 폐기 대상이다(`tests/world2-boundary.test.ts` 의 `ADAPTERS` 가 "world1
 *    폐기 시 갈아 끼울 목록" 을 세고 있다). 폐기될 쪽에 의존을 새로 만들지 않는다.
 *
 * 대가는 분명하다: **감독이 world1 의 흙 톤을 다시 조정하면 여기는 안 따라온다.**
 * 그때는 이 파일도 함께 고쳐야 한다.
 */
function pitTexture(T: ThreeNS) {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const cx = S / 2, cy = S / 2, R = S / 2;

  // 고정 시드. 나무마다 다른 무늬를 주려면 텍스처가 여러 장 필요한데, 그러면 재질이
  // 갈려 개수 불변식이 깨진다. 한 장을 전부가 공유한다(world1 도 그렇다).
  const rnd = rng(0xc0ffee);

  // 흙 베이스. 원 밖은 투명 — 어차피 벽돌 링이 가장자리를 덮는다.
  ctx.fillStyle = `#${DIRT_BASE.toString(16).padStart(6, '0')}`;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  // 클럼프 얼룩. 성글게 — 근접해서만 보이는 소품이라 지면 타일보다 덜 촘촘해도 된다.
  for (let i = 0; i < 10; i++) {
    const rr = rnd() * R * 0.72;
    const ang = rnd() * Math.PI * 2;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(46,38,32,0.35)' : 'rgba(64,54,44,0.3)';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, S * (0.05 + rnd() * 0.07), 0, Math.PI * 2);
    ctx.fill();
  }

  // 흙/벽돌 경계 모르타르
  ctx.strokeStyle = 'rgba(24,20,17,0.65)';
  ctx.lineWidth = S * 0.02;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.80, 0, Math.PI * 2);
  ctx.stroke();

  // 벽돌 링. 0.86 은 조각 사이 줄눈 — 1.0 이면 이음매가 사라져 통짜 링이 된다.
  const N = 11;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 0.86) / N) * Math.PI * 2;
    ctx.strokeStyle = i % 2 === 0 ? BRICK_A : BRICK_B;
    ctx.lineWidth = R * 0.18;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.91, a0, a1);
    ctx.stroke();
  }

  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

/** tree.ts 와 같은 mulberry32. 텍스처를 굽는 데만 쓴다 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const treepit: PartSpec = {
  kind: 'treepit',

  /**
   * **세 tier 전부.** 처음엔 `['near','mid']` 로 두고 *"발치 소품이라 51.2m 밖에서는
   * 안개가 덮는다"* 고 적었는데, 그것이 **2026-08-10 규약 위반**이다.
   *
   * 그날 tier 마다 종류 집합이 다른 것이 **깜빡임의 원인**으로 확정됐다 — 강등이 종류를
   * 걷어내는 순간이 화면에서 잡혔다(감독 실측). 지금 규약은 "전환이 어떤 종류도 안
   * 바꾼다" 이고 `world2-parcel-layout.test.ts` 가 그것을 단언한다. 안개가 덮는다는
   * 내 근거는 **그 실측 앞에서 성립하지 않는다**: 덮이는 것과 사라지는 순간이 보이는
   * 것은 다른 일이고, 감독이 본 것은 후자다.
   *
   * 나무와 같은 집합이라 참조도 안전하다 — pit 이 far 에서도 볼 나무가 있다.
   */
  tiers: ['near', 'mid', 'far'],

  salt: 0x5b1c73a9,

  /**
   * 텍스처에 색을 구웠으므로 **흰색 하나**다.
   *
   * `tones` 는 색이 아니라 곱셈기다(`parts/types.ts`) — 여기에 갈색을 적으면 흙
   * 텍스처와 곱해져 두 번 어두워진다. `road.ts` 가 정확히 그 함정에 빠져 아스팔트가
   * 선형 0.0003 대까지 내려간 적이 있다.
   */
  tones: [0xffffff],

  /** 지면을 덮는 평면이므로 밤 알베도 배선에 자기 바탕색을 신고한다 */
  groundBase: DIRT_BASE,

  /**
   * **가산에서 빠진다** — 그림자 데칼과 같은 이유다.
   *
   * `parcelLayout` 이 파츠마다 `surfaceY` 를 한 번 더해 준다(`decide/parcel-layout.ts`).
   * 그런데 pit 은 캐스터인 나무의 `y` 를 복사해 태어나고, 나무는 그 순회에서 **이미
   * 가산된 뒤**다. 신고하지 않으면 바닥 높이가 두 번 더해져 잔디 파셀에서 7cm 더 뜬다.
   *
   * 나무보다 뒤에 놓이는 것이 이 논리의 전제이고, `parts/index.ts` 의 목록 순서가
   * 그것을 보장한다(그쪽에 이유를 적어 뒀다).
   */
  absoluteY: true,

  /** 나무 한 그루에 하나 — 나무 상한과 같다 */
  maxPerParcel: (o) => o.maxTrees,

  /** 바닥에 깔리는 평면이라 겹침 경쟁에서 빠진다(`ground`·`road`·`garden` 과 같다) */
  footprint: () => 0,

  /**
   * 나무를 따라간다. 자기 난수를 쓰지 않는 유일한 파츠다.
   *
   * 그래서 `salt` 가 실질적으로 놀지만 지우지 않는다 — `PartSpec` 계약이 요구하고,
   * 언젠가 pit 에 회전 변주를 주고 싶어지면 그때 쓸 자리다.
   *
   * 회전은 나무 것을 그대로 쓴다. 0 으로 두면 온 도시의 벽돌 이음매가 같은 방향을
   * 향해 격자무늬처럼 읽힌다.
   */
  place: ({ placed }) => {
    const out: PlacedPart[] = [];
    for (const t of placed) {
      if (t.kind !== 'tree') continue;
      const r = TREE_RADIUS_UNIT * t.sx;
      out.push({
        kind: 'treepit',
        x: t.x, z: t.z, y: t.y + PIT_LIFT,
        ry: t.ry,
        // 원반은 XZ 평면이라 sy 는 쓰이지 않는다(1 로 둔다).
        sx: r, sy: 1, sz: r,
        tone: 0,
      });
    }
    return out;
  },

  asset: (T) => ({
    // 반경 1 로 만들고 인스턴스 스케일이 실제 반경을 준다 — 나무 크기가 0.6~1.9 배로
    // 흔들리므로 pit 도 그만큼 따라 커져야 발치가 비지 않는다.
    geometry: new T.CircleGeometry(1, SEGMENTS).rotateX(-Math.PI / 2),
    material: new T.MeshStandardMaterial({ map: pitTexture(T), roughness: 1.0, metalness: 0 }),
    castShadow: false,
    // 그림자를 받는다 — 나무가 자기 발치에 그늘을 드리우는 것이 이 소품의 반쯤이다.
    receiveShadow: true,
  }),
};
