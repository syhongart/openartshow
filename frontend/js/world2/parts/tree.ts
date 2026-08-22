// 나무 — world1 의 재귀 가지를 한 덩어리로 구운 것.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"지금 있는 나무를 월드1의 나무로 바꿔보자."*
//
// 예전 이 파일은 6세그먼트 원뿔 하나(12삼각형)짜리 플레이스홀더였고, 주석이 스스로
// "실루엣을 되찾는 작업이 대기 중" 이라 적고 있었다. 그 작업이다.
//
// ── 왜 그대로 못 가져오나 ────────────────────────────────────────────────────
// world1 의 `buildDetailedTree`(`scene-trees.ts`)는 **Group + Mesh 수십 개**를 만든다 —
// 재귀 가지마다 원기둥 하나, 잎 클러스터마다 알파 평면 셋. 재질도 수피 1 + 잎 3 종이다.
// world1 은 파셀 단위로 재질별 병합을 해서 그루당 4드로우콜까지 줄였다.
//
// world2 는 **종류당 InstancedMesh 하나**다. 나무가 몇 그루든 드로우콜 1이어야 하고,
// 그러려면 지오도 하나 재질도 하나여야 한다. 그래서 형태만 가져오고 조립을 다시 짰다:
//
//   · 재귀 가지 구조 — 그대로. `trunkLen 2.6 · trunkRad 0.22 · maxLevel 2` 는 world1 이
//     `world.js:676` 에서 가로수에 쓰던 값 그대로다(라이브에서 검증된 비율).
//   · 잎 — 알파 평면을 **저폴리 입체**로 바꿨다. 알파는 `transparent` 를 켜야 하고 그것이
//     파이프라인 캐시키 축이라 재질이 하나 더 는다. 불투명 입체면 같은 재질에 담긴다.
//   · 색 — 줄기(갈색)와 잎(초록)을 **정점색**으로 나눈다. `instanceColor` 는 인스턴스
//     단위라 한 나무 안에서 두 색을 쓸 수 없다. 도로가 `tones` 를 흰색 근처로 두고
//     텍스처를 곱하는 것과 같은 구조다 — 여기서는 텍스처 대신 정점색을 곱한다.
//
// ── 나무가 하나뿐인 문제 ────────────────────────────────────────────────────
// 지오가 하나이므로 **세상의 모든 나무가 같은 모양**이다. world1 은 파셀마다 시드가
// 달라 그루마다 달랐다. 이건 인스턴싱의 구조적 대가이고, 회전(4방향)·비균일 스케일·
// 정점색 위의 `tones` 곱으로 흐트러뜨린다. 그래도 가까이서 보면 같은 나무다.
//
// 최대 개수에 하한이 없다 — 나무가 0그루인 파셀은 광장처럼 읽혀서 오히려 자연스럽다.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { roadDirs, LAMP_CLEARANCE } from './road-topology.js';
import { parcelSlots, freeSlots, jitterIn, lampReservations } from '../decide/parcel-slots.js';
import { plazaOccupied } from './plaza.js';
// 잎 밝기를 여기서 유도한다 — 값을 다시 적지 않는다(아래 `LEAF_A` 주석).
import { GRASS_TONES } from '../decide/grass.js';

export const tree: PartSpec = {
  kind: 'tree',
  /**
   * **far 까지 그린다** (감독 지적으로 바뀐 것).
   *
   * 감독: *"lod 가 자연스럽지 않다. 이동하면 멀리 있는 게 사라졌다가 멈추면 나타나.
   * 특히 나무."*
   *
   * 원인은 밴드와 안개의 어긋남이었다. mid 경계가 1.55셀 = **49.6m** 인데 안개는
   * **51.2m 부터** 시작한다 — 나무가 사라지는 지점이 안개보다 **앞**이라 가릴 것이
   * 없었다. 또렷하게 보이는 거리에서 툭 사라진 것이다.
   *
   * 예전 주석은 *"실루엣이 픽셀 몇 개라 비용만 든다"* 고 적었는데, 그 판단의 전제가
   * 바뀌었다. 파셀 배치를 정리하며 삼각형이 259k → 71.5k 로 72% 줄어(감독 실기기
   * 실측) 여유가 3.6배 생겼다. **비용을 아낄 이유가 사라졌고 전환은 여전히 보인다.**
   *
   * far 끝(2.4셀 = 76.8m)은 안개 끝과 정확히 같다. 거기서 사라지는 것은 안개가
   * 100% 라 원리적으로 안 보인다 — 전환을 없애는 게 아니라 **볼 수 없는 곳으로**
   * 옮기는 것이다.
   */
  tiers: ['near', 'mid', 'far'],
  salt: 0x2545f491,
  // 정점색이 곱해지므로 **흰색 근처**여야 한다. 예전 값(0x2f4a3a 같은 짙은 초록)은
  // 색 자체였는데, 이제는 곱셈기라 그대로 두면 나무가 새까매진다. 도로가 텍스처를 쓰며
  // 겪은 것과 같은 함정이고, "tones 는 곱셈기다" 테스트가 이 규약을 지킨다.
  tones: [0xffffff, 0xe8f0e0, 0xf2ece0],

  /**
   * 수관 반경. 줄기 길이(`TRUNK_LEN` 2.6)에 가지가 2단 재귀로 뻗은 폭이라 실측 대신
   * 비율로 잡는다 — 지오메트리가 three 안에서 만들어져 순수 판정에서는 잴 수 없다.
   *
   * 넉넉한 쪽으로 잡는 것이 맞다. 나무는 겹치면 **한 덩어리로 뭉쳐 보여** 그루 수가
   * 읽히지 않는데, 그게 감독이 지적한 "겹쳐져 있는 것들" 의 큰 부분이다.
   */
  // 잎 실루엣. 감독이 카드에서 고른 것은 *"얼룩덩덩하게"* 였지만, 배포본을 보고
  // *"산만하면 `?shleaf=0` 으로 확정"* 으로 **뒤집었다**(2026-08-11). 그래서 기본
  // 깊이(`LEAF_DEPTH`)가 0 이고 **화면에서는 매끈한 원으로 나온다** — 이 신고가
  // 'foliage' 인 것은 얼룩을 그릴 **경로가 살아 있다**는 뜻이지 켜져 있다는 뜻이 아니다.
  // 켜려면 `?shleaf=0.55`. 화면 판정은 값 옆에(`decide/shadow-decal.ts` 의 `LEAF_DEPTH`).
  shadowProfile: 'foliage',
  footprint: (p) => TREE_RADIUS_UNIT * p.sx,

  // `floor(rnd * (max + 1))` 의 상한이다. rnd < 1 이므로 max 를 넘지 않는다.
  // 슬롯이 모자라면 실제로는 이보다 적게 심긴다 — 상한이므로 예산은 그대로 맞다.
  maxPerParcel: (o) => o.maxTrees,

  /**
   * 빈 슬롯에 심는다 (감독 지시로 바뀐 자리).
   *
   * ── 전에는 어땠나 ─────────────────────────────────────────────────────────
   * `pickOffRoad` 로 사분면을 **무작위로** 골라 그 안에서 좌표를 뽑았다. 길만 피할 뿐
   * 건물이 이미 선 사분면인지, 앞서 심은 나무가 있는지는 보지 않았다. 그래서 여덟 그루가
   * 한 칸에 몰려 한 덩어리로 뭉치고 건물 벽을 뚫고 자랐다.
   *
   * ── 왜 크기를 먼저 정하는가 ───────────────────────────────────────────────
   * 자리가 비었는지는 **이 나무가 얼마나 큰지에 달려 있다.** 묘목은 들어가는데 다 자란
   * 나무는 안 들어가는 자리가 있다. 그래서 스케일을 먼저 뽑고 그 반경으로 빈 슬롯을
   * 찾는다. 순서를 뒤집으면 자리를 잡은 뒤 크기가 정해져 다시 겹친다.
   */
  place: ({ px, pz, rnd, o, halfX, halfZ, placed, radiusOf }) => {
    // 미술관이 파셀을 통째로 쓰는 칸 — 소품이 벽 안에 박힌다(plaza.ts)
    if (plazaOccupied(px, pz)) return [];
    const dirs = roadDirs(px, pz);
    const n = Math.floor(rnd() * (o.maxTrees + 1));
    const slots = parcelSlots(o, halfX, halfZ, dirs);
    const reserved = lampReservations(o, dirs, LAMP_CLEARANCE);
    const out: PlacedPart[] = [];
    for (let i = 0; i < n; i++) {
      // **자유 회전.** 90° 단위로 돌리던 것을 풀었다 — 나무는 인공물이 아니라 어느
      // 각도로 서 있어도 이상하지 않고, 지오가 하나뿐이라 반복감을 줄일 수단이 회전과
      // 크기뿐이다. (벤치·화분은 인공물이라 90° 단위를 유지한다.)
      const ry = rnd() * Math.PI * 2;

      // ── 크기는 넓게, 비율은 좁게 (감독 판정) ───────────────────────────────
      // 감독: *"나무가 위로 길쭉해. 포토샵으로 위로 길게 늘린 느낌."*
      //
      // 예전 코드는 `sy = s × (1.2~1.8)` 이었다. 주석은 "밑동 굵기와 높이를 따로 뽑는다 —
      // 같은 배율을 쓰면 전부 닮은꼴이 된다" 고 적고 있었는데, 그 처방이 문제를 만들었다.
      // **세로만 항상 늘리면 다양해지는 게 아니라 전부 늘어난다.** 게다가 잎 평면까지
      // 함께 찌그러져 나뭇잎이 세로 타원이 된다 — 정확히 "포토샵으로 늘린" 모습이다.
      //
      // 다양성은 **크기 자체**로 준다(감독: *"나무 크기를 똑같이 할 필요는 없지"*).
      // 0.6~1.9 면 어린 나무와 다 자란 나무가 세 배 차이라 한눈에 다르다. 비율은 ±6%
      // 안에서만 흔든다 — 그 이상 벌리면 늘린 티가 다시 난다.
      const s = 0.6 + rnd() * 1.3;
      const sy = s * (0.94 + rnd() * 0.12);
      const tone = Math.floor(rnd() * 3);
      const r = TREE_RADIUS_UNIT * s;

      // 앞선 파츠(건물)와 **이미 심은 나무**를 함께 피한다. `placed` 에는 `out` 이 아직
      // 들어 있지 않으므로 이어 붙여 넘긴다 — 빠뜨리면 나무끼리 다시 겹친다.
      const free = freeSlots(slots, [...placed, ...out], radiusOf, r, reserved);
      // 자리가 없으면 **덜 심는다.** 여덟 그루를 채우려 억지로 밀어 넣으면 원래 문제로
      // 돌아간다 — 겹쳐 선 여덟보다 떨어져 선 셋이 낫다.
      if (free.length === 0) break;

      const slot = free[Math.floor(rnd() * free.length)];
      const pos = jitterIn(rnd, slot, r);
      out.push({ kind: 'tree', x: pos.x, z: pos.z, y: 0, ry, sx: s, sy, sz: s, tone });
    }
    return out;
  },

  asset: (T) => ({
    geometry: buildTreeGeometry(T),
    material: new T.MeshStandardMaterial({
      map: treeTexture(T),
      // ── `alphaTest` 이지 `transparent` 가 아니다 ──────────────────────────
      // 이 한 줄이 "재질 하나로 줄기와 알파 잎을 같이 담는" 것을 가능하게 한다.
      // `transparent: true` 는 **파이프라인 캐시키 축**이라 켜는 순간 재질이 둘로
      // 갈리고 드로우콜도 갈린다. 알파 컷아웃은 불투명 패스에서 처리되므로 같은
      // 파이프라인에 남는다. world1 도 잎에 `alphaTest` 를 쓴다.
      alphaTest: 0.5,
      // 잎이 평면이라 뒷면도 보여야 한다. 뒤에서 보면 사라지는 잎은 없느니만 못하다.
      side: T.DoubleSide,
      // 정점색이 텍스처와 **함께 곱해진다.** 그래서 `tones` 는 흰색 근처여야 한다 —
      // 어두운 톤을 곱하면 나무가 검게 죽는다(도로에서 이미 겪었다).
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.05,
    }),
    // 알파 잎은 그림자에서 사각형으로 찍힌다(투명 그림자 아티팩트). world1 도 같은
    // 이유로 알파 재질의 castShadow 를 껐다.
    castShadow: false,
    receiveShadow: false,
  }),
};

// ── 지오메트리 조립 ──────────────────────────────────────────────────────────

/**
 * 텍스처에서 줄기 영역과 잎 영역을 가르는 U 좌표.
 *
 * 왼쪽 `[0, LEAF_U0]` 은 **완전 불투명**한 수피, 오른쪽 `[LEAF_U0, 1]` 은 알파가 뚫린
 * 잎이다. 한 장에 담는 이유는 재질을 하나로 유지하기 위해서다 — 텍스처를 둘로 나누면
 * 재질이 둘이 되고 드로우콜이 갈린다.
 *
 * 0.25 는 잎에 넓은 쪽을 준 것이다. 수피는 세로 줄무늬라 가로 해상도가 덜 필요하고,
 * 잎은 실루엣이 전부라 촘촘할수록 좋다.
 */
export const LEAF_U0 = 0.25;

/** 지오메트리의 U 좌표를 `[u0,u1]` 구간으로 눌러 넣는다 */
function remapU(geo: InstanceType<ThreeNS['BufferGeometry']>, u0: number, u1: number): void {
  const uv = geo.attributes.uv.array as Float32Array;
  for (let i = 0; i < uv.length; i += 2) uv[i] = u0 + uv[i] * (u1 - u0);
}

/**
 * 줄기 + 잎 한 장. **world1 `createLeafClusterTexture` 의 알고리즘 그대로다.**
 *
 * 투명 배경 위에 타원을 150개 흩뿌리되 중앙에 밀집시킨다(`pow(rand, 0.6)` — 지수가 1보다
 * 작으면 분포가 안쪽으로 쏠린다). 그래야 가장자리가 성겨서 **실루엣이 뚫려 보인다.**
 * 잎맥 하이라이트도 같은 확률로 긋는다.
 *
 * 감독 판정 *"나뭇잎 퀄리티 너무 떨어진다"* 의 처방이 이것이다. 앞서 잎을 정팔면체
 * 덩어리로 만들었는데, 잎은 얇고 성긴 것이라 각진 입체로는 절대 안 보인다. **잎의
 * 정체는 형태가 아니라 뚫린 실루엣이다.**
 */
function treeTexture(T: ThreeNS) {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S * 2;   // 왼쪽 절반의 절반이 수피, 나머지가 잎
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const rnd = rng(0x1eaf);

  // ── 왼쪽: 수피 ──────────────────────────────────────────────────────────
  const barkW = S * 2 * LEAF_U0;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, barkW, S);
  // 세로 줄무늬. 색이 아니라 **밝기 변주**다 — 실제 색은 정점색이 정한다.
  for (let i = 0; i < 90; i++) {
    const x = rnd() * barkW;
    const w = 1 + rnd() * 3;
    const a = 0.06 + rnd() * 0.12;
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(x, 0, w, S);
  }

  // ── 오른쪽: 잎 클러스터 ─────────────────────────────────────────────────
  const leafX = barkW;
  const leafW = S * 2 - barkW;
  for (let i = 0; i < 150; i++) {
    const ang = rnd() * Math.PI * 2;
    // 지수 0.6 — 중앙 밀집, 가장자리 성김. 이 한 값이 실루엣을 만든다.
    const dist = Math.pow(rnd(), 0.6) * Math.min(leafW, S) * 0.45;
    const x = leafX + leafW / 2 + Math.cos(ang) * dist;
    const y = S / 2 + Math.sin(ang) * dist;
    const len = 7 + rnd() * 13;
    const wid = len * (0.4 + rnd() * 0.25);
    // 밝기만 흔든다. 색조는 정점색이 준다 — 여기서 초록을 칠하면 정점색과 곱해져
    // 두 번 어두워진다(값 미러링과 같은 형태의 함정이다).
    const l = 62 + rnd() * 34;
    ctx.fillStyle = `hsla(0, 0%, ${l}%, ${0.78 + rnd() * 0.22})`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd() * Math.PI);
    ctx.beginPath();
    ctx.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
    ctx.fill();
    if (rnd() > 0.6) {   // 잎맥
      ctx.strokeStyle = `hsla(0, 0%, ${Math.min(100, l + 18)}%, 0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-len * 0.8, 0);
      ctx.lineTo(len * 0.8, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

/** 줄기 색(정점색). 인스턴스 `tones` 가 이 위에 곱해진다 */
const BARK: readonly [number, number, number] = [0.38, 0.29, 0.21];
/**
 * 잎 색. 두 톤을 섞어 수관이 단색 덩어리로 안 보이게 한다.
 *
 * ── 밝기를 잔디에서 유도한다 (감독 지시 2026-08-21) ─────────────────────────
 * 감독: **"나뭇잎 밝기가 어두운데. 초록이 어두운 초록이야."**
 *
 * 실측하니 그대로였다 — 잎 두 톤의 평균 휘도가 **0.419** 인데 같은 화면의 잔디 중간
 * 톤(`GRASS_TONES[1]`)은 **0.611** 이다. 한 화면에 있는 두 초록이 다른 밝기대에 있었다.
 *
 * ⚠ **원래 값에는 밝기 근거가 없었다.** 이 주석은 *"두 톤을 섞어 단색 덩어리로 안 보이게"*
 * 만 적고 있었고 왜 그 어둡기인지는 어디에도 없다. 그래서 뒤집을 판정이 없다 — 지어낸
 * 값을 감독 판정으로 교체하는 것이 아니라, **근거 없던 자리에 근거를 넣는 것**이다.
 *
 * 그러므로 값을 손으로 밝히지 않고 **잔디에서 유도한다**: 두 톤의 평균 휘도가 잔디 중간
 * 톤과 같아지는 배율(`LEAF_LIFT`)을 곱한다. 잔디를 밝히면 나무가 저절로 따라오고,
 * `GRASS_TONES` 를 여기 다시 적을 일도 없다(이 회차에 값 미러링을 네 번 잡았다).
 *
 * **평균에 맞추는 것이 요점이다** — A 는 잔디보다 밝아지고 B 는 어두워져 수관 안의 명암이
 * 남는다. 두 톤을 각각 잔디에 맞추면 그 대비가 사라져 위 문장(단색 덩어리 방지)이 깨진다.
 *
 * ⚠⚠ **여기서 멈춘다.** 「더 밝게」는 감독 화면 판정 없이 올리지 않는다 — 잔디보다 밝은
 * 나뭇잎은 실물에서 드물고(잎은 겹쳐서 그늘진다), 그 선을 넘으면 나무가 배경에서 뜬다.
 */
const LEAF_LIFT = leafLift();
const LEAF_A: readonly [number, number, number] = lift([0.34, 0.52, 0.30]);
const LEAF_B: readonly [number, number, number] = lift([0.26, 0.42, 0.24]);

/** 잎 두 톤 — `tests/world2-tree-leaf.test.ts` 가 유도 결과를 확인한다 */
export const LEAF_TONES_FOR_TEST = [LEAF_A, LEAF_B] as const;

/** Rec.709 상대 휘도. 초록이 지배적인 색끼리 비교하므로 채널 평균으로는 못 가른다 */
function lum(c: readonly [number, number, number]): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** 잎 두 톤의 평균 휘도를 잔디 중간 톤에 맞추는 배율 */
function leafLift(): number {
  const g = GRASS_TONES[1];
  const grass = lum([((g >> 16) & 0xff) / 255, ((g >> 8) & 0xff) / 255, (g & 0xff) / 255]);
  const leaf = (lum([0.34, 0.52, 0.30]) + lum([0.26, 0.42, 0.24])) / 2;
  return grass / leaf;
}

/** 배율을 곱하고 1 로 자른다 — 넘으면 그 채널만 포화해 색이 틀어진다 */
function lift(c: readonly [number, number, number]): readonly [number, number, number] {
  return [
    Math.min(1, c[0] * LEAF_LIFT), Math.min(1, c[1] * LEAF_LIFT), Math.min(1, c[2] * LEAF_LIFT),
  ] as const;
}

/**
 * 스케일 1일 때의 수관 반경(미터). `footprint` 가 여기에 인스턴스 스케일을 곱한다.
 *
 * 지오메트리는 three 안에서 가지 재귀로 만들어지므로 순수 판정에서 잴 수가 없다. 그래서
 * 줄기 길이(`TRUNK_LEN`)에 대한 **비율로 잡는다** — 가지가 2단(`MAX_LEVEL`)으로 뻗으며
 * 벌어지는 폭이 대략 줄기의 절반 안쪽이다.
 *
 * 실측이 아니라 상한이라는 것이 중요하다. 작게 잡으면 수관이 서로 파고들어 나무 여럿이
 * 한 덩어리로 뭉쳐 보이고, 그러면 그루 수가 읽히지 않는다.
 */
export const TREE_RADIUS_UNIT = 1.3;

/** world1 `world.js:676` 이 가로수에 쓰던 값 그대로 */
const TRUNK_LEN = 2.6;
const TRUNK_RAD = 0.22;
const MAX_LEVEL = 2;

/**
 * 결정론 난수. **씨앗이 고정이다** — 지오가 하나뿐이므로 나무 모양도 하나이고, 그것이
 * 빌드마다 달라지면 골든 스냅샷이 흔들린다.
 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Piece { geo: InstanceType<ThreeNS['BufferGeometry']>; color: readonly [number, number, number] }

/**
 * 조각들을 **한 지오메트리로 굽는다.**
 *
 * `mergeGeometries`(three/addons)를 쓸 수 없다 — 파츠는 three 를 인자로만 받고
 * 애드온을 import 하지 않는다(런타임 의존 0 규율). 그래서 정점 배열을 직접 잇는다.
 *
 * 전부 non-indexed 로 통일하는 이유: 인덱스가 있는 것과 없는 것을 섞으면 인덱스 오프셋을
 * 다시 계산해야 하는데, 이 규모(수백 삼각형)에서는 그 복잡도가 정점 몇 개보다 비싸다.
 */
function bake(T: ThreeNS, pieces: readonly Piece[]) {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const uvs: number[] = [];
  for (const { geo, color } of pieces) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    const u = g.attributes.uv.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    for (let i = 0; i < u.length; i++) uvs.push(u[i]);
    for (let i = 0; i < p.length / 3; i++) col.push(color[0], color[1], color[2]);
    g.dispose();
    if (g !== geo) geo.dispose();
  }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  out.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  return out;
}

/**
 * 재귀 가지 + 잎. world1 `buildDetailedTree` 의 구조를 그대로 따르되 Group 대신
 * **누적 행렬**을 넘긴다 — 최종 결과가 메시 트리가 아니라 정점 배열이어야 하므로
 * 부모 변환을 자식 지오에 직접 구워 넣어야 한다.
 */
function buildTreeGeometry(T: ThreeNS) {
  const rnd = rng(0x5eed7e3);
  const pieces: Piece[] = [];

  const leafAt = (m: InstanceType<ThreeNS['Matrix4']>, y: number, s: number) => {
    // ── world1 과 같은 알파 평면이다 (감독 판정) ──────────────────────────────
    // 한 번 정팔면체 덩어리로 만들었다가 감독이 **"나뭇잎 퀄리티 너무 떨어진다"** 로
    // 잡았다. 당연하다 — 잎은 얇고 성긴 것이라 각진 다이아몬드로는 절대 안 보인다.
    // 형태를 지오메트리로 만들려던 것이 애초에 방향을 잘못 잡은 것이고, 잎의 정체는
    // **실루엣이 뚫린 텍스처**다.
    //
    // 평면 셋을 서로 다른 각도로 세운다. 어느 방향에서 봐도 최소 한 장은 정면을
    // 향하므로 뭉치로 읽힌다 — world1 이 쓰던 방법 그대로다.
    for (let i = 0; i < 3; i++) {
      const w = (2.1 + rnd() * 0.5) * s;
      const h = w * (0.72 + rnd() * 0.16);
      const geo = new T.PlaneGeometry(w, h);
      remapU(geo, LEAF_U0, 1);   // 텍스처의 잎 영역으로
      const off = new T.Matrix4()
        .makeTranslation(
          (rnd() - 0.5) * 0.7 * s,
          y + (rnd() - 0.5) * 0.6 * s,
          (rnd() - 0.5) * 0.7 * s,
        )
        .multiply(new T.Matrix4().makeRotationY(rnd() * Math.PI))
        .multiply(new T.Matrix4().makeRotationZ((rnd() - 0.5) * 0.7));
      geo.applyMatrix4(new T.Matrix4().multiplyMatrices(m, off));
      pieces.push({ geo, color: rnd() < 0.5 ? LEAF_A : LEAF_B });
    }
  };

  const branch = (level: number, len: number, rad: number, m: InstanceType<ThreeNS['Matrix4']>) => {
    // 5세그먼트 — world1 은 7이었다. 가지가 열셋이라 둘씩 줄이면 체감 없이 삼각형이
    // 50개쯤 준다. 가지는 대부분 잎에 가려 실루엣에 거의 기여하지 않는다.
    const geo = new T.CylinderGeometry(rad * 0.62, rad, len, 5).translate(0, len / 2, 0);
    remapU(geo, 0, LEAF_U0);   // 텍스처의 불투명(줄기) 영역으로
    geo.applyMatrix4(m);
    pieces.push({ geo, color: BARK });

    if (level < MAX_LEVEL) {
      const kids = 2 + (rnd() > 0.45 ? 1 : 0);
      for (let k = 0; k < kids; k++) {
        // 첫 분기는 완만하게, 깊을수록 크게 벌어진다 — world1 과 같은 규칙이다.
        const tilt = (level === 0 ? 0.24 : 0.4 + level * 0.12) + rnd() * 0.3;
        const yaw = (k / kids) * Math.PI * 2 + rnd() * 0.9;
        const child = new T.Matrix4()
          .multiplyMatrices(m, new T.Matrix4().makeTranslation(0, len * (0.8 + rnd() * 0.18), 0))
          .multiply(new T.Matrix4().makeRotationY(yaw))
          .multiply(new T.Matrix4().makeRotationZ(tilt));
        branch(level + 1, len * (0.6 + rnd() * 0.18), rad * 0.6, child);
      }
      if (level >= 1 && rnd() > 0.45) leafAt(m, len * 0.75, 0.6);
    } else {
      leafAt(m, len * 0.9, 0.85);
      if (rnd() > 0.5) leafAt(m, len * 0.55, 0.7);
    }
  };

  branch(0, TRUNK_LEN, TRUNK_RAD, new T.Matrix4());
  return bake(T, pieces);
}
