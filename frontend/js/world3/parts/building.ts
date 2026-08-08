// 집 — 마을의 뼈대. 크림색 벽에 사각뿔 지붕을 얹은 한 채짜리 오두막이다.
//
// 개수 하한이 2인 이유는 룩이다. 0~1채면 그 구획이 "아직 안 지어진 곳"처럼 보이고,
// 오픈월드에서 그런 파셀이 드문드문 섞이면 세상이 버려진 인상을 준다.
//
// ── world2 의 박스에서 무엇이 바뀌었나 (2026-08-08 포근마을 개조) ───────────
// 바뀐 것은 **지오메트리와 높이 두 가지뿐**이다. `place` 의 자리 뽑기·사분면 배정·
// 겹침 반경은 한 줄도 안 건드렸다 — 그것들이 파셀 슬롯 예산과 겹침 게이트의 근거이고,
// 룩을 바꾸자고 배치를 흔들면 "집이 예뻐졌는가" 와 "겹치지 않는가" 가 한 diff 에서
// 갈리지 않는다. world2 가 *"나무 건물 가로등 겹쳐져 있는 것들이 보여"* 로 값을 치르고
// 얻은 배치다.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import {
  roadDirs, pickInQuadrant, shuffledQuadrants, SETBACK, LAMP_CLEARANCE, EAVE,
} from './road-topology.js';
import { isPlaza } from './plaza.js';
import { isTowerParcel } from './zoning.js';
import { bakePieces, rgb, type Piece } from './bake.js';
import { V, TINT_SET } from './palette.js';

/**
 * 바닥 한 변의 최소·최대(미터). **여기가 유일한 출처다** — 배치가 이 값으로 크기를 뽑고,
 * 사분면 안쪽 경계도 `MAX_SIDE / 2` 로 유도한다. 두 곳에 따로 적으면 크기를 키웠을 때
 * 간격이 따라오지 않아 건물이 조용히 겹친다.
 */
const MIN_SIDE = 3;
/**
 * 건물 최대 변(미터). **사분면 폭에 맞춘 값이다.**
 *
 * 8 이었는데 사분면이 6.5m 라 건물이 제 구획을 넘었다 — 도로 위로 올라가고 가로등을
 * 덮었다. 감독이 *"겹쳐져 있는 것들이 보여"* 라고 한 것의 큰 몫이 이것이다.
 *
 * 6 이면 사분면 안에 들어간다. 도시의 덩치는 **높이**(4~20m)가 만들지 바닥 넓이가
 * 만드는 것이 아니라, 이 축소로 스카이라인은 그대로다.
 */
const MAX_SIDE = 6;

// `EAVE`(처마·간판 여유)는 `road-topology.ts` 로 옮겼다. 타워가 같은 값을 필요로
// 하면서 미러링이 생겼기 때문이다(검수관 블로커 2026-08-02 B1). 이 값이 왜 있는지와
// 무엇을 잘못했다 고쳤는지의 기록도 그 파일에 함께 옮겼다 —
// **사고 이력은 값을 따라간다.** 값만 옮기고 이력을 남기면 다음 사람이 값만 본다.

export const building: PartSpec = {
  kind: 'building',
  tiers: ['near', 'mid', 'far'], // 가장 멀리서도 보인다 — 스카이라인을 만드는 것이 건물이다
  salt: 0x7f4a7c15,
  /**
   * **곱셈기다 — 색이 아니다.** 벽·지붕·문의 색은 정점에 굽혀 있고(`asset`),
   * 여기 값은 거기에 곱해지는 집집마다의 옅은 색조 편차다.
   *
   * world2 는 여기에 회청색 5종을 적어 그것이 곧 벽색이었다. 정점색을 도입하면서
   * 그 값을 그대로 두면 **회청 × 크림** 이 되어 마을이 탁해진다 — world2 가 나무에서
   * 겪은 형태다(초록 tones × 초록 정점색으로 나무가 새까맣게 죽었다).
   */
  tones: TINT_SET,

  // `1 + floor(rnd * max)` 의 상한이다. rnd < 1 이므로 max 를 넘지 않는다.
  //
  // 상한이 **사분면 수(4)를 넘으면 안 된다.** 넘는 순간 두 채가 같은 사분면에 배정돼
  // 겹치기 시작한다 — 그게 이 값을 6에서 4로 내린 이유의 절반이다.
  /**
   * 바닥 사각형을 감싸는 원. 회전이 직각 배수라 긴 변의 절반이면 충분하고, 처마·간판이
   * 벽면을 조금 넘으므로 `EAVE` 만큼 여유를 얹는다.
   *
   * **이 반경이 배치 한계와 같은 값을 봐야 한다.** 그러지 않아서 실제로 겹쳤다 — 아래
   * `EAVE` 주석 참고.
   */
  footprint: (p) => Math.max(p.sx, p.sz) * 0.5 + EAVE,

  maxPerParcel: (o) => o.maxBuildings,

  place: ({ px, pz, rnd, o, halfX, halfZ }) => {
    // 광장에는 짓지 않는다. 채수 하한을 1로 내려도 어느 파셀에나 한 채는 서므로,
    // "아무것도 없는 트인 곳" 은 이 예외로만 생긴다.
    if (isPlaza(px, pz)) return [];
    // 타워 파셀에도 짓지 않는다. 타워는 파셀 **중앙**을 통째로 쓰는데(`tower.ts`),
    // 건물은 사분면에서 자리를 뽑으므로 둘이 같은 파셀에 서면 사분면 안쪽이 타워와
    // 겹친다 — `footprint` 경쟁으로는 못 막는다. 타워가 중앙 고정이라 언제나 먼저
    // 놓이고, 겹침 판정은 "앞선 것을 피한다" 이지 "뒤엣것을 밀어낸다" 가 아니다.
    if (isTowerParcel(px, pz, o.cellX, o.cellZ)) return [];
    const dirs = roadDirs(px, pz);
    // 1~4채. 예전엔 2~6이었고, 1000㎡ 당 3.91채로 world1(1.74채)의 **2.25배**였다.
    // 이제 2.44채 — world1 의 1.4배까지 내려온다. 하한을 1로 내린 것도 의도다:
    // 하한 2면 "한 채만 선 여유로운 구획"이 구조적으로 존재할 수 없다.
    const n = 1 + Math.floor(rnd() * o.maxBuildings);
    // 사분면을 섞어 1:1로 나눠 준다. 섞지 않으면 첫 건물이 늘 같은 사분면에 서서
    // 도시가 한쪽으로 쏠린 규칙성을 띤다.
    const quads = shuffledQuadrants(rnd);
    const out: PlacedPart[] = [];
    for (let i = 0; i < n; i++) {
      const ry = Math.floor(rnd() * 4) * (Math.PI / 2); // 직각 배치 — 도시가 정돈돼 보인다
      // ── 크기를 자리보다 먼저 뽑는다 (감독 지시로 바뀐 순서) ─────────────────
      // 얼마나 물러서야 하는지가 **건물 크기에 달려 있다.** 자리를 먼저 정하면 그 뒤에
      // 정해진 크기가 도로나 가로등을 덮어도 알 수 없다 — 실제로 그랬다.
      const w = MIN_SIDE + rnd() * (MAX_SIDE - MIN_SIDE);
      const d = MIN_SIDE + rnd() * (MAX_SIDE - MIN_SIDE);
      // ── 높이: 4~20m → 3.2~5.6m (포근마을 개조) ─────────────────────────
      // world2 는 도시라 **높이가 덩치를 만들었다**(주석: *"도시의 덩치는 높이가
      // 만들지 바닥 넓이가 만드는 것이 아니다"*). 마을은 그 반대다 — 20m 짜리 집은
      // 아무리 크림색으로 칠해도 아파트로 읽힌다.
      //
      // 하한 3.2 는 지붕 몫(전체의 32%)을 빼고도 몸통이 2.2m 남는 값이다. 그보다
      // 낮으면 문(1.4m)이 벽을 거의 다 차지해 창을 넣을 자리가 없다.
      //
      // **스카이라인은 랜드마크가 맡는다** — 등대(`tower.ts`)와 마을회관 종탑
      // (`clocktower.ts`). 집이 낮아진 만큼 그 둘이 실제로 랜드마크가 됐다.
      const h = 3.2 + rnd() * 2.4;
      const half = Math.max(w, d) / 2;

      // 안쪽 경계 = 셋백 + 자기 반폭 + 가로등 여유. 유도값이라 크기 상한을 바꿔도
      // 저절로 따라온다(예전 `MAX_SIDE / 2` 는 `SETBACK` 에 가려 무실효였다 —
      // `pickInQuadrant` 가 `max(SETBACK, minInset)` 을 쓰는데 셋백이 더 컸다).
      const inset = half + (dirs.length === 0 ? 0 : SETBACK + LAMP_CLEARANCE);
      // 바깥 경계는 **겹침 반경만큼** 당긴다. 반폭만 당겼더니 처마 몫(`EAVE`)이 남아
      // 이웃 파셀 건물과 실제로 겹쳤다. 주석은 처음부터 옳았고 값만 모자랐다.
      //
      // 이 값이면 양쪽 파셀의 건물이 최대로 밀려도 중심 거리가 `2 × reach` 이므로 겹침
      // 반경의 합과 정확히 같아진다 — 접하되 겹치지 않는다.
      const reach = half + EAVE;
      const outerX = Math.min(halfX, o.cellX / 2 - reach);
      const outerZ = Math.min(halfZ, o.cellZ / 2 - reach);

      const pos = pickInQuadrant(rnd, outerX, outerZ, dirs, quads[i], inset);
      const tone = Math.floor(rnd() * 5);
      out.push({ kind: 'building', x: pos.x, z: pos.z, y: 0, ry, sx: w, sy: h, sz: d, tone });
    }
    return out;
  },

  asset: (T) => ({
    geometry: buildHouseGeometry(T),
    // 정점색이 곧 색이다 — `tones` 는 거기 곱해지는 틴트다(위 `tones` 주석).
    material: new T.MeshStandardMaterial({
      vertexColors: true,
      // 0.85 → 0.72. 회반죽 벽에 아주 옅은 윤기를 준다. 완전 무광이면 파스텔이
      // 종이처럼 납작해지고, 더 올리면 플라스틱으로 읽힌다.
      roughness: 0.72,
      metalness: 0.0,
    }),
    castShadow: true,
    receiveShadow: true,
  }),
};

// ── 지오메트리 ──────────────────────────────────────────────────────────────
//
// **단위 집: 밑면 1×1, 전체 높이 1.** 인스턴스가 `sx`·`sy`·`sz` 로 늘린다.
// 피벗은 바닥(y=0 이 땅) — 파츠 계약이다.
//
// 비균등 스케일이라 지붕도 함께 늘어난다. 그래서 `place` 의 높이 범위를 3.2~5.6 로
// **좁혀 둔 것이 이 지오메트리의 전제**다: 1.75배 안에서는 지붕 비율 변화가 개체차로
// 읽히고, world2 의 4~20m(5배)였다면 낮은 집은 지붕만 남고 높은 집은 첨탑이 된다.
// 둘 중 하나를 바꾸면 다른 하나도 봐야 한다.

/** 몸통이 차지하는 높이 비율. 나머지가 지붕 */
const BODY_H = 0.68;

/**
 * 지붕 밑면이 벽보다 얼마나 넓은가(처마).
 *
 * **`EAVE` 를 넘으면 안 된다.** 겹침 반경이 `max(sx,sz)/2 + EAVE` 이므로, 처마가
 * 그보다 나가면 이웃 집과 실제로 파고든다. 최대 변 6m 기준 돌출은
 * `6 × (1.16-1) / 2 = 0.48m` 로 `EAVE`(0.6) 안이다 — 변을 키우면 여기를 다시 본다.
 */
const ROOF_SPREAD = 1.16;

/** 사각뿔 밑면 반지름 ↔ 한 변. `ConeGeometry(r, h, 4)` 의 밑면 대각선이 `2r` 이다 */
const SQ = Math.SQRT1_2;

function buildHouseGeometry(T: ThreeNS) {
  const pieces: Piece[] = [];
  const add = (geo: Piece['geo'], color: number) => pieces.push({ geo, color: rgb(color) });

  // 몸통. 벽 크림
  add(new T.BoxGeometry(1, BODY_H, 1).translate(0, BODY_H / 2, 0), V.wall);

  // 굽(벽 아랫단). 벽과 땅 사이를 끊어 주면 집이 땅에 **놓인** 것으로 보인다 —
  // 없으면 벽이 땅에서 자란 것처럼 읽힌다.
  add(new T.BoxGeometry(1.04, 0.1, 1.04).translate(0, 0.05, 0), V.wallBase);

  // 지붕. 사각뿔을 45° 돌려 밑변을 축에 맞춘다(안 돌리면 마름모가 된다).
  const roofH = 1 - BODY_H;
  add(
    new T.ConeGeometry(ROOF_SPREAD * SQ, roofH, 4)
      .rotateY(Math.PI / 4)
      .translate(0, BODY_H + roofH / 2, 0),
    V.roof,
  );

  // 처마 띠. 지붕과 벽이 만나는 선을 한 겹 둘러 준다. 이 한 줄이 실루엣을 **로우폴리
  // 답게** 만든다 — 원뿔이 벽에 바로 얹히면 접합부가 어중간하게 비친다.
  add(
    new T.BoxGeometry(ROOF_SPREAD, 0.045, ROOF_SPREAD).translate(0, BODY_H, 0),
    V.roofShade,
  );

  // 문. 앞면(z+)에 살짝 띄워 붙인다. 벽과 같은 평면이면 z-파이팅이 난다.
  add(new T.BoxGeometry(0.26, 0.42, 0.03).translate(0, 0.21, 0.5), V.door);
  // 문 위 차양 — 작은 판 하나로 현관이 생긴다
  add(new T.BoxGeometry(0.36, 0.03, 0.1).translate(0, 0.44, 0.53), V.trim);

  // 창 둘. 문 양옆에 하나씩, 옆면(x±)에 하나씩 — 어느 각도에서 봐도 창이 하나는 보인다.
  const win = (x: number, z: number, ry: number) => {
    add(new T.BoxGeometry(0.2, 0.2, 0.03).rotateY(ry).translate(x, 0.4, z), V.trim);
    add(new T.BoxGeometry(0.15, 0.15, 0.035).rotateY(ry).translate(x, 0.4, z), V.glass);
  };
  win(-0.3, 0.5, 0);
  win(0.3, 0.5, 0);
  win(0.5, 0, Math.PI / 2);
  win(-0.5, 0, Math.PI / 2);

  // 굴뚝. 지붕 경사면에 박히도록 중심에서 살짝 비껴 세운다. 정중앙이면 뾰족한
  // 꼭대기와 겹쳐 지저분해진다.
  add(new T.BoxGeometry(0.12, 0.3, 0.12).translate(0.22, BODY_H + 0.12, -0.22), V.brick);
  add(new T.BoxGeometry(0.16, 0.04, 0.16).translate(0.22, BODY_H + 0.27, -0.22), V.wallBase);

  return bakePieces(T, pieces);
}
