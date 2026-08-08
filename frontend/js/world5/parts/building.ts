// 건물 — 파셀의 뼈대. 저폴리 박스이고, 실루엣 변화는 크기와 회전이 전부다.
//
// 개수 하한이 2인 이유는 룩이다. 0~1채면 그 구획이 "아직 안 지어진 곳"처럼 보이고,
// 오픈월드에서 그런 파셀이 드문드문 섞이면 세상이 버려진 인상을 준다.

import type { PartSpec, PlacedPart } from './types.js';
import {
  roadDirs, pickInQuadrant, shuffledQuadrants, SETBACK, LAMP_CLEARANCE, EAVE,
} from './road-topology.js';
import { isPlaza } from './plaza.js';
import { isCentralPark } from '../decide/grid.js';
import { isTowerParcel } from './zoning.js';

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
  // 지면과 같은 이유로 밝혔다. 예전 값(0x3d4557 계열, 명도 27%)은 낮 하늘 아래서
  // **새까만 덩어리**로 보였다 — 안개 너머 먼 건물은 희게 보이는데 눈앞 건물이 검으니
  // 원근이 뒤집힌 것처럼 읽혔다.
  //
  // 명도 55% 대. 하늘(밝은 회청)보다는 어두워야 실루엣이 살고, 지면(40%)보다는 밝아야
  // 벽이 바닥에서 일어선 것으로 보인다.
  tones: [0x8892a0, 0x929cab, 0x7d8794, 0x9aa4b2, 0x737d8a],

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
    // 센트럴파크에도 짓지 않는다 (감독 지시 *"센트럴파크 공원도 넣고"*).
    // 공원 판정은 **격자가 소유한다**(`decide/grid.ts` 의 `isCentralPark`) — 좌표를
    // 여기 적으면 공원을 옮기는 날 건물만 옛 경계를 본다.
    //
    // 지면(`ground`·`garden`)과 나무는 그대로 깔린다. 도로도 지나간다 — 실제 도심
    // 공원에도 횡단로가 있고, 도로까지 끊으면 공원이 **건널 수 없는 벽**이 된다.
    if (isCentralPark(px, pz)) return [];
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
      const h = 4 + rnd() * 16;
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
    geometry: new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    material: new T.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 }),
    castShadow: true,
    receiveShadow: true,
  }),
};
