// 건물 — 파셀의 뼈대. 저폴리 박스이고, 실루엣 변화는 크기와 회전이 전부다.
//
// 개수 하한이 2인 이유는 룩이다. 0~1채면 그 구획이 "아직 안 지어진 곳"처럼 보이고,
// 오픈월드에서 그런 파셀이 드문드문 섞이면 세상이 버려진 인상을 준다.

import type { NeonTexel, PartSpec, PlacedPart, ThreeNS } from './types.js';
import { V, TINTS } from './palette.js';
import {
  roadDirs, pickInQuadrant, shuffledQuadrants, SETBACK, LAMP_CLEARANCE, EAVE,
} from './road-topology.js';
import { isPlaza } from './plaza.js';
import { isCentralPark } from '../decide/grid.js';
import { isTowerParcel } from './zoning.js';
import { hexCss, greyCss, MASK_BLOCK } from './color.js';

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
  tones: [V.facade, V.facadeLit, V.facadeShade, V.facadePale, V.facadeDeep],

  /**
   * 발광 신고(`PartSpec.neon`). **일반 건물이 밤 도시의 대부분이다.**
   *
   * ── 왜 값이 이것인가 ──────────────────────────────────────────────────────
   * 두 개의 부등식이 이 두 숫자를 가둔다. 어기면 화면이 무너지거나 게이트가 빨간불이
   * 된다 — 둘 다 `tests/world5-parts-assets.test.ts` 와 `tests/world5-neon-glow.test.ts`
   * 가 지킨다.
   *
   * ① **`night` < `tower.night`.** 마천루보다 밝으면 스카이라인의 주인공이 뒤집힌다.
   * ② **`day` < `tower.day`.** 일반 건물 창은 광고가 아니다.
   *
   * ⚠️ 여기에는 부등식이 **셋** 적혀 있었고 그중 하나가 거짓이 됐다 — *"`night` >
   * `BLOOM_THRESHOLD × 1.2` = 0.9 · 밑으로 내려가면 블룸 여유 검사가 떨어진다"*. 그
   * 검사는 `emissiveIntensity` **만** 보던 축이라 실제 픽셀 휘도와 무관했고(경위는
   * `types.ts` 의 `NeonSpec`), 축을 실제 휘도로 바꾼 지금 이 파츠는 **문턱을 넘지 않는
   * 쪽이 정답**이다(아래 `bloom: false`). 즉 옛 ①은 지키는 대상을 잘못 지목한 하한이었다.
   * 그 하한이 있는 동안 값이 0.9~1 사이 5.6% 폭에 갇혀 *"아래로 더 내릴 자리가 없다"*
   * 고 적혀 있었는데, 그 갇힘 자체가 근거 없는 것이었다.
   *
   * 더 어둡게·밝게 하고 싶으면 세기가 아니라 **마스크 알파**를 먼저 본다(그쪽이 진짜
   * 룩 축이다. 아래 `A_*` 상수).
   *
   * ── 왜 `day` 가 0 이 아닌가 ────────────────────────────────────────────────
   * 0 이면 낮 화면이 이 변경 **전과 완전히 동일**하다 — 민무늬 박스다. 감독 지시
   * (*"진짜 뉴욕처럼 하고"*)가 낮에는 하나도 안 나타난다. 다만 건물은 마천루보다 개체
   * 수가 두 자릿수 많아 **같은 세기여도 화면 면적 총합이 훨씬 크다.** 그래서 tower 의
   * 40% 로 눌렀다: 창이 "살짝 밝은 점" 으로 읽히되 도시가 형광으로 뜨지 않는 자리.
   *
   * ⚠️ **화면 판정 전이다.** 절대 밝기는 톤매핑·노출이 정하고 그 둘은 헤드리스(WebGL)와
   * 감독 기기(WebGPU)에서 다르다 — 여기서 실측했다고 적을 수 없다. 고정한 것은 위
   * 두 부등식과 마스크 텍셀 사이의 **상대비**뿐이다.
   *
   * ── `bloom: false` 는 판정이다 — "아직 못 했다" 가 아니다 (2026-08-09) ─────
   * 이 파츠는 블룸 문턱을 **넘지 않는 것이 맞다.** 가장 밝은 부위(코니스)가
   * `0.666 × 0.62 × 1.05 = 0.434` 로 문턱(0.75)의 58% 다.
   *
   * 넘기려면 `night ≈ 2.0` 이 필요한데 그러면 **마천루(1.30)보다 밝아진다** — 도시의
   * 위계가 뒤집히는 값이라 팀장이 2026-08-09 에 그 방향을 닫았다(*"마천루 위계는
   * 판정 없이 깨지 않는다"*). 그리고 화면으로 봐도 그쪽이 옳다: 실제 도시에서 번지는
   * 것은 광고·랜드마크·가로등이고, 저층 건물 창까지 번지면 거리 전체가 발광판이 되어
   * **깊이가 사라진다.**
   *
   * 그래서 이 값을 "미달" 로 적지 않고 **신고**로 적는다. 검사는 양방향이라, 이 파츠가
   * 문턱을 넘게 되는 날에도 빨간불이 뜬다 — 위계를 조용히 깨는 변경을 막는 것이 그
   * 방향의 목적이다.
   *
   * `night` 를 0.95 에서 1.05 로 **조금** 올린 것은 위계 자체를 유지하면서 다른 파츠가
   * 전부 올라간 만큼 상대 위치를 지키기 위해서다(광고 타워 1.55 · 파사드 1.40 ·
   * 마천루 1.30 · 다리 1.15 · **건물 1.05**).
   */
  neon: {
    day: 0.10,
    night: 1.05,
    bloom: false,
    texels: () => FACADE_TEXELS,
  },

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
    // **삼각형 수는 박스 그대로다** — 창문은 UV 와 텍스처로만 만든다(아래 참고).
    geometry: facadeBox(T),
    material: new T.MeshStandardMaterial({
      // ── 발광은 **맵이 색까지 정한다** (`tower.ts` 와 같은 기법) ─────────────
      // 창(따뜻/차가움)·업라이트(호박)·코니스·간판이 전부 다른 색이어야 하는데
      // `emissive` 는 재질당 하나뿐이다. 그래서 `emissive` 를 **곱셈 항등원**으로 두고
      // 색을 맵 텍셀에 칠한다(`emissive × emissiveMap` 이므로 맵 색이 그대로 나온다).
      // `TINTS.plain` 이 그 항등원이다 — 흰색 리터럴을 새로 적지 않으려는 것이기도 하다.
      emissive: TINTS.plain,
      emissiveMap: facadeMask(T),
      // 부팅 초깃값. **실제 값은 `systems/neon-glow.ts` 가 정한다** — 위 `neon` 신고를
      // `NeonGlow` 가 읽어 시간대에 맞춰 덮어쓴다. 1 로 두는 이유는 `tower.ts` 와 같다:
      // 배선이 못 찾는 경우에도 **켜진 채로 남는 쪽**이 안전하다. 0 이면 그 실패가
      // "그냥 좀 어두운" 화면으로만 나타나 아무도 못 알아챈다.
      emissiveIntensity: 1,
      roughness: 0.85,
      metalness: 0.05,
    }),
    castShadow: true,
    receiveShadow: true,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// 파사드 — 창문과 외벽 조명
// ═══════════════════════════════════════════════════════════════════════════
//
// 감독 지시 2026-08-08: *"밤에 건물 네온. 건물 외벽 조명도 넣고."* / *"진짜 뉴욕처럼."*
// 그 전까지 이 파일은 125줄짜리 **단색 박스**였고, 세계 건물의 대부분이 이것이라
// 밤 도시에서 건물 대부분이 검은 덩어리였다.
//
// ── 규율: 창문은 텍스처다. 지오메트리로 만들지 않는다 ────────────────────────
// 이 세계는 **파츠당 지오 하나·재질 하나**가 개수 불변식이고(`smoke:vite` 의 `[7]`·
// `[7.6]`), 창을 지오로 넣으면 그 불변식이 즉시 깨진다. 그래서 삼각형 수를 **한 개도
// 늘리지 않았다** — `BoxGeometry(1,1,1)` 그대로에 UV 만 다시 쓴다.
// `tests/world5-parts-assets.test.ts` 가 인덱스 개수 36(=12삼각형)을 못 박는다.
//
// ⚠️ **그 스모크는 `world2.html` 을 보므로 world5 변경으로는 안 깨진다.** 즉 이 규약을
// 지금 지켜 주는 것은 저 게이트가 아니라 위 단언 하나뿐이다. 그 사실을 적어 두지 않으면
// 다음 사람이 "스모크가 지킨다" 로 읽고 확인을 생략한다.
//
// ── ⭐ 고른 길: **아틀라스를 나눠 굽고 면마다 다른 셀을 읽힌다** ────────────
// 참고안은 *"emissive 아틀라스 한 장에 랜덤 UV 오프셋을 줘서 창문 패턴을 다르게"* 라고
// 못 박았다. 그 요구의 **목적**은 *"같은 창문 배열이 도시 전체에 반복되지 않을 것"* 이다.
// 이 코드베이스에서 그 목적에 도달하는 길을 넷 조사했고 셋을 버렸다:
//
//   ✗ **인스턴스 속성 추가**(`InstancedBufferAttribute` + 셰이더가 그것을 읽게)
//     — `MeshStandardMaterial` 은 커스텀 attribute 를 안 읽는다. 읽히려면 TSL 노드
//     재질이 필요하고, TSL 은 `three/tsl` 을 **파츠 파일에서 import** 해야 한다.
//     `parts/` 는 **런타임 three import 0** 이 규율이고(`types.ts` 머리말,
//     `tests/world5-independence.test.ts` 가 강제), 배치 테스트가 three 없이 도는
//     것이 그 규율의 값이다. **계약 위반이라 확정적으로 버렸다.**
//     부수 위험도 있다 — `emissiveNode` 를 직접 정의하면 `emissiveIntensity` 의 소비
//     경로가 노드 그래프로 바뀌어 `NeonGlow` 배선(`neon` 신고)이 조용히 무효가 될 수
//     있고, 그 실패는 "밤에 좀 어두운" 으로만 나타난다.
//
//   ✗ **`InstancePools` 에 UV 오프셋 API 추가** — 위와 같은 셰이더 문제를 그대로 안고
//     파츠 전체 계약까지 바꾼다. 계약 변경은 팀장 소관이고, 아래 길로 목적이 달성되므로
//     상신 사유가 없다고 판정했다.
//
//   ✗ **풀 키를 나눠 변종 지오를 여럿 만들기** — 인스턴스마다 다른 UV 를 얻는 유일한
//     "내장" 수단이지만 **파츠당 지오 1** 규약을 정면으로 깬다.
//
//   ✓ **아틀라스를 크게 잡고 지오 UV 를 굽는 시점에 나눈다.** 박스의 여섯 면이 각각
//     **다른 셀**을 읽는다. 계약 변경 0 · 삼각형 증가 0 · 재질 1 · 지오 1.
//
// ── ⚠️ 이 길이 못 하는 것 — 적어 둔다 ──────────────────────────────────────
// **인스턴스마다 UV 를 다르게 주지는 못한다.** UV 는 지오메트리 attribute 이고 인스턴스는
// 지오를 공유하기 때문이다. 계약을 안 깨고는 불가능하다 — 이것은 조사 결론이지 타협이
// 아니다. 대신 **화면에 보이는 배열**은 인스턴스마다 달라진다. 네 축이 겹친다:
//
//   ① **네 측면이 서로 다른 셀**을 읽는다 → 한 채 안에서 앞뒤좌우가 다르다
//   ② **`ry` 가 직각 4방향**으로 뽑힌다(`place`) → 카메라가 보는 두 면의 **조합**이
//      네 가지로 갈린다. 이 설계는 그 회전에 의존하므로, `ry` 가 상수가 되면 다양성이
//      0 이 된다 — 그 의존을 테스트가 못 박는다(`ry` 고유값 ≥ 3).
//   ③ **`sx`·`sy`·`sz` 가 연속값**이다(3~6m · 4~20m) → 같은 UV 라도 창 격자가 늘어나는
//      비율이 채마다 달라 밀도 인상이 갈린다.
//   ④ **`tone` 5종**이 벽 색을 흔든다.
//
// ⚠️ ③의 뒷면도 적는다: 높이가 5배 차이 나므로 **창 크기도 최대 5배 차이 난다.**
// 실제 도시에도 저층 상가와 오피스의 창 크기 차이가 있어 치명적이지 않다고 판정했지만,
// 이것은 판단이지 실측이 아니다. 층고를 고정하려면 인스턴스별 UV 스케일이 필요하고,
// 그것이 위에서 버린 길이다.

/** 셀 한 칸(px). 세로가 두 배인 것은 건물이 세로로 긴 물건이기 때문이다 */
const CELL_W = 32;
const CELL_H = 64;
/**
 * 아틀라스 격자. **4×2 = 8칸 중 6칸만 쓴다.**
 *
 * 면이 여섯이므로 3×2 = 6칸이면 낭비가 0 이지만 그러면 텍스처가 96×128 로 2의 거듭제곱을
 * 벗어난다. 밉맵을 켜려는 것이 이 거래의 이유다 — far tier 건물의 창 격자가 축소될 때
 * 밉맵이 없으면 **지글거린다.** 밤 도시에서 원경이 반짝이는 것은 가장 먼저 눈에 띄는
 * 인공물이라, 텍스처 25%(빈 두 칸)를 주고 128×128 를 산다. 128×128×RGBA = 64KB 다.
 */
const ATLAS_COLS = 4;
const ATLAS_ROWS = 2;
const ATLAS_W = CELL_W * ATLAS_COLS;
const ATLAS_H = CELL_H * ATLAS_ROWS;

/**
 * UV 를 셀 안쪽으로 당기는 폭(px). **반 텍셀이 표준 처방이다** — 셀 경계에 정확히 맞추면
 * 선형 필터링이 이웃 셀의 텍셀을 절반 섞어 온다(옥상 셀이 벽 밑동에 새어 나온다).
 */
const UV_INSET = 0.5;

/** `BoxGeometry(1,1,1)` 의 정점 수. 면 6 × 4정점 — 이 전제가 면별 UV 배정의 근거다 */
const BOX_VERTS = 24;

/** 측면 셀 개수(= 박스의 옆면 수). 셀 인덱스 0~3 */
const SIDE_CELLS = 4;
/** 옥상 셀 */
const CELL_ROOF = 4;
/** 바닥 셀 — 발광 0. 피벗이 바닥이라 땅에 붙어 안 보이지만, 새면 건물이 떠 보인다 */
const CELL_UNDER = 5;
/** 셀 총수 */
const CELL_COUNT = 6;

// ── 셀 안 세로 구획 (px, 0 = 위/옥상 쪽) ────────────────────────────────────
//
// **창문과 외벽 조명은 서로 다른 구획을 쓴다.** 감독은 둘을 따로 지시했다 —
// *"밤에 건물 네온. 건물 외벽 조명도 넣고."* 창은 **안에서 새어 나오는 빛**이고 외벽
// 조명은 **밖에서 벽을 비추는 빛**이다. 한 구획에 섞으면 지시 하나가 사라진다. 두
// 구획이 겹치지 않는다는 것을 테스트가 y 구간 서로소로 못 박는다.

/** 코니스(옥상 테두리) 조명 — 밤 스카이라인에서 건물의 **윗선**을 그리는 것 */
const CORNICE_Y = 0, CORNICE_H = 2;
/** 창문 격자 */
const WIN_Y0 = 6, WIN_ROWS = 10, WIN_PITCH_Y = 4, WIN_H = 2;
const WIN_X0 = 1, WIN_COLS = 6, WIN_PITCH_X = 5, WIN_W = 3;
/** 저층 간판 띠 — 갤러리 거리의 상점 간판. 가로 여백을 둬 벽 끝까지 안 닿게 한다 */
const SIGN_Y = 52, SIGN_H = 4, SIGN_INSET_X = 2;
/** 업라이트(밑에서 벽을 훑는 조명). 아래가 밝고 위로 갈수록 옅어진다 */
const UPLIGHT_Y = 56, UPLIGHT_H = 8;

// ── 세기 (검은 바탕 위 `globalAlpha` — 그대로 배수가 된다) ──────────────────
//
// **전부 상대비다.** 절대 밝기는 `emissiveIntensity` 와 톤매핑이 정하고 그 둘은
// 헤드리스(WebGL)와 감독 기기(WebGPU)에서 다르다 — 여기서 절대값을 실측했다고 적을 수
// 없다(`tower.ts` 가 같은 이유로 같은 규율을 쓴다). 고정하는 것은 순서뿐이다:
//
//   코니스 > 간판 > 창(따뜻) > 창(차가움) > 업라이트 밑동 > 옥상 > 업라이트 끝 > 꺼진 창
//
// 그리고 **전부 `tower.ts` 의 같은 부위보다 낮다**(tower 창 0.50 / 왕관 0.88). 세기
// 신고(`neon.night`)가 0.95 대 1 로 5% 차이뿐이라, 마천루와 일반 건물의 격차는 사실상
// 이 표가 만든다. 순서가 뒤집히면 룩이 무너진다 — 업라이트가 창보다 밝으면 벽이
// 형광판이 되고, 일반 건물이 마천루보다 밝으면 스카이라인의 주인공이 뒤집힌다.
const A_CORNICE = 0.62;
const A_SIGN = 0.55;
const A_WIN_WARM = 0.42;
const A_WIN_COOL = 0.34;
/**
 * **꺼진 창.** 0 이 아닌 것이 요점이다.
 *
 * `emissive` 는 밝게만 만들 수 있어 "어두운 창" 을 못 만든다(그러려면 알베도 맵이
 * 필요하고, 그건 `tones` 를 곱셈기로 바꾸는 별개의 룩 변경이다). 그래서 꺼진 창에도
 * 달빛 반사분만큼 아주 약하게 준다 — 그러면 **격자 자체는 밤에 늘 읽히고** 켜진 창이
 * 그 위에 뜬다. 0 으로 두면 켜진 창만 점점이 떠서 건물이 아니라 별처럼 보인다.
 *
 * **export 하는 유일한 세기 상수다.** 검사가 "켜진 창과 꺼진 창이 둘 다 있는가" 를
 * 재려면 둘을 가를 기준이 필요한데, 알파 최솟값으로 대신하면 **warm/cool 차이와
 * 구별이 안 된다** — 실측으로 확인했다(점등률을 1 로 만드는 뮤테이션이 통과했다).
 */
export const A_WIN_OFF = 0.04;
const A_UP_MAX = 0.30;
const A_UP_MIN = 0.05;
const A_ROOF = 0.18;
const A_ROOF_BEACON = 0.50;

/**
 * 측면 셀별 네온 강조색. **코니스와 간판이 같은 색이면 두 축이 한 축으로 읽힌다.**
 * 셀마다 조합을 어긋나게 돌려, 회전에 따라 정면에 오는 면의 색 인상이 갈리게 한다.
 *
 * ── 네 색 순환에서 앰버 우세로 (2026-08-09) ────────────────────────────────
 * 옛 조합은 시안·마젠타·앰버·라임이 여덟 자리를 **두 개씩** 나눠 가졌다. 건물은 도시에
 * 가장 많은 파츠라, 그 균등이 거리 전체를 네 색으로 칠했다 — 감독이 광고 타워에서 본
 * *"파스텔 무지개"* 와 같은 형태가 **더 넓은 면적에** 깔려 있었던 셈이다.
 *
 * 지금은 여덟 자리 중 **앰버가 넷**이고 마젠타·시안이 둘씩이며 라임은 0 이다. 실제
 * 거리에서 저층 건물의 야간 조명은 압도적으로 따뜻한 쪽이고, 원색 간판은 몇 집 건너
 * 하나다. 코니스와 간판을 갈라 두는 원래 규칙은 그대로다 — 네 조합 어디에도 같은 색
 * 쌍이 없다.
 */
export const SIDE_ACCENT: readonly { cornice: number; sign: number }[] = [
  { cornice: V.neonAmber, sign: V.neonMagenta },
  { cornice: V.neonAmber, sign: V.neonCyan },
  { cornice: V.neonMagenta, sign: V.neonAmber },
  { cornice: V.neonCyan, sign: V.neonAmber },
];

/**
 * 셀별 창 점등률과 따뜻한 창 비율.
 *
 * 한 채의 네 면이므로 **급변하면 안 된다** — 면마다 성격이 딴판이면 한 건물로 안 읽힌다.
 * 그래서 폭을 좁게 흔든다. 점등률을 1 로 두면 모든 창이 켜져 인쇄된 무늬처럼 보이고,
 * 너무 낮으면 폐건물이 된다.
 */
const SIDE_LIT_RATE: readonly number[] = [0.58, 0.46, 0.62, 0.51];
const SIDE_WARM_BIAS: readonly number[] = [0.72, 0.55, 0.78, 0.60];

/** 옥상 설비등 자리(셀 로컬 px). 물탱크·환기구 옆 작업등 — 다리·언덕에서 내려다볼 때 */
const ROOF_FIXTURES: readonly (readonly [number, number])[] = [
  [5, 8], [22, 12], [9, 40], [24, 46],
];

/**
 * 난수 시드. **8자리로 적는다** — 6자리는 색 리터럴 검사가 색으로 읽는다
 * (`garden.ts` 의 `GRASS_NOISE_SEED` 가 그 함정에 걸린 전례다).
 */
const FACADE_SEED = 0x5f3a91c7;
const CELL_SEED_STEP = 0x9e3779b1;

/** 선형 합동 난수. 결정적이라야 테스트가 배열을 대조할 수 있다 */
function lcg(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 마스크 한 칠이 무엇인가. **테스트가 창문과 외벽 조명을 가르는 축이다** */
export type MaskRole = 'window' | 'uplight' | 'cornice' | 'sign' | 'rooftop';

/** 셀 로컬 좌표계(px)의 칠 한 번. 색은 팔레트에서만 온다 */
export interface MaskPaint {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly hex: number;
  /** 세기 0~1. 검은 바탕과 섞이므로 그대로 배수가 된다 */
  readonly a: number;
  readonly role: MaskRole;
}

/** 아틀라스 한 칸. `cx`·`cy` 는 **캔버스** 픽셀 좌표다 */
export interface FacadeCell {
  readonly cx: number;
  readonly cy: number;
  readonly paints: readonly MaskPaint[];
}

function buildSideCell(i: number): MaskPaint[] {
  const rnd = lcg(FACADE_SEED ^ Math.imul(i + 1, CELL_SEED_STEP));
  const acc = SIDE_ACCENT[i];
  const out: MaskPaint[] = [];

  // ① 코니스 — 벽 폭 전체를 두르는 가는 선. 외벽 조명이지 창이 아니다.
  out.push({ x: 0, y: CORNICE_Y, w: CELL_W, h: CORNICE_H, hex: acc.cornice, a: A_CORNICE, role: 'cornice' });

  // ② 창문 격자. 꺼진 창도 그린다(위 `A_WIN_OFF` 주석).
  const lit = SIDE_LIT_RATE[i];
  const warmBias = SIDE_WARM_BIAS[i];
  for (let row = 0; row < WIN_ROWS; row++) {
    for (let col = 0; col < WIN_COLS; col++) {
      const on = rnd() < lit;
      const warm = rnd() < warmBias;
      out.push({
        x: WIN_X0 + col * WIN_PITCH_X,
        y: WIN_Y0 + row * WIN_PITCH_Y,
        w: WIN_W,
        h: WIN_H,
        hex: on && warm ? V.windowWarm : V.windowCool,
        a: on ? (warm ? A_WIN_WARM : A_WIN_COOL) : A_WIN_OFF,
        role: 'window',
      });
    }
  }

  // ③ 저층 간판 띠 — 외벽에 붙은 물건이지 창이 아니다.
  out.push({
    x: SIGN_INSET_X, y: SIGN_Y, w: CELL_W - SIGN_INSET_X * 2, h: SIGN_H,
    hex: acc.sign, a: A_SIGN, role: 'sign',
  });

  // ④ 업라이트 — **밖에서 벽을 비추는 빛.** 한 줄씩 알파를 낮춰 그라데이션을 만든다.
  //    캔버스 그라데이션 대신 스캔라인을 쓰는 이유는 색 리터럴 때문이다:
  //    `addColorStop` 은 알파를 색 문자열(`rgba(...)`)에 넣어야 하는데 그러면 파츠에
  //    색을 적게 된다. `globalAlpha` 는 팔레트 hex 를 그대로 쓰면서 세기만 준다.
  for (let t = 0; t < UPLIGHT_H; t++) {
    // t 가 클수록 아래(지면 쪽)이고 더 밝다 — 빛이 밑에서 올라오기 때문이다.
    const k = t / (UPLIGHT_H - 1);
    out.push({
      x: 0, y: UPLIGHT_Y + t, w: CELL_W, h: 1,
      hex: V.neonAmber, a: A_UP_MIN + (A_UP_MAX - A_UP_MIN) * k, role: 'uplight',
    });
  }
  return out;
}

function buildRoofCell(): MaskPaint[] {
  const out: MaskPaint[] = ROOF_FIXTURES.map(([x, y]) => ({
    x, y, w: 3, h: 3, hex: V.neonAmber, a: A_ROOF, role: 'rooftop' as const,
  }));
  // 항공장애등. 낮은 건물에는 실제로 없지만, 옥상 셀은 한 장을 모두가 공유하므로
  // 여기서 개체를 가를 수는 없다 — 아주 작게 두어 가까이서만 읽히게 한다.
  out.push({
    x: CELL_W / 2 - 1, y: CELL_H / 2 - 1, w: 2, h: 2,
    hex: V.aviationRed, a: A_ROOF_BEACON, role: 'rooftop',
  });
  return out;
}

/**
 * 아틀라스 여섯 칸. **순수 판정이다** — 캔버스도 three 도 모른다.
 *
 * 굽는 쪽(`facadeMask`)과 갈라 둔 이유는 검출력이다. jsdom 에는 네이티브 canvas 가 없어
 * "무엇을 그렸는가" 를 캔버스로는 잴 수 없고, 그러면 창문·외벽 조명 축에 게이트가 0 이
 * 된다. 이 저장소가 *"판정/집행 경계는 아무도 안 본다"* 로 이미 데인 자리라 통합 축도
 * 함께 둔다 — `tests/world5-neon-glow.test.ts` 의 G3·G3-b 가 실물 `asset()` 을 돌린다.
 */
export const FACADE_CELLS: readonly FacadeCell[] = Array.from({ length: CELL_COUNT }, (_, i) => ({
  cx: (i % ATLAS_COLS) * CELL_W,
  cy: Math.floor(i / ATLAS_COLS) * CELL_H,
  paints: i < SIDE_CELLS ? buildSideCell(i)
    : i === CELL_ROOF ? buildRoofCell()
      : [], // 바닥 — 아무것도 그리지 않는다 = 검정 = 발광 0
}));

/**
 * 발광 텍셀 명세(`PartSpec.neon.texels`). **아틀라스에서 유도한다 — 따로 적지 않는다.**
 *
 * 다른 네온 파츠는 8×1 마스크라 텍셀 목록이 곧 명세지만, 이 파츠는 아틀라스 여섯 칸에
 * 수백 번을 칠한다. 그 칠 하나하나가 곧 발광 텍셀이므로 `FACADE_CELLS` 가 이미 명세다 —
 * 여기서 "가장 밝은 것은 코니스 0.62" 같은 요약을 손으로 적으면 그것이 미러링이고,
 * `A_CORNICE` 를 고치는 날 조용히 어긋난다.
 *
 * ⚠️ `hex` 가 같아도 `a` 가 다르면 다른 텍셀이다(꺼진 창과 켜진 창이 그렇다). 중복을
 * 걷어내지 않는 이유는 **검사가 최댓값만 보기 때문**이고, 걷어내려면 비교 기준을
 * 정해야 하는데 그 기준이 곧 판정이라 여기 둘 일이 아니다.
 */
export const FACADE_TEXELS: readonly NeonTexel[] =
  FACADE_CELLS.flatMap((c) => c.paints.map((p) => ({ hex: p.hex, a: p.a })));

/**
 * 박스 면 → 셀 인덱스. 순서는 `BoxGeometry` 의 면 순서다(+X, −X, +Y, −Y, +Z, −Z).
 *
 * **마주보는 면이 아니라 인접한 면이 갈려야 한다.** 카메라는 한 번에 인접한 두 면을
 * 보므로, 화면에 오는 조합은 (+X,+Z)·(+Z,−X)·(−X,−Z)·(−Z,+X) 네 가지다. 여기 배정은
 * 그 네 조합이 각각 다른 셀 쌍이 되게 한 것이다.
 */
export const FACE_CELL: readonly number[] = [0, 2, CELL_ROOF, CELL_UNDER, 1, 3];

/**
 * 셀이 차지하는 UV 사각형.
 *
 * ⚠️ **캔버스 y 와 텍스처 v 는 방향이 반대다.** three 의 `CanvasTexture` 는 `flipY`
 * 기본 참이라 캔버스 위쪽이 v=1 에 온다. 그래서 셀 **하단**(`cy + CELL_H`)이 `v0`,
 * 상단(`cy`)이 `v1` 이다. 이 부호를 뒤집으면 업라이트가 옥상에 가고 코니스가 바닥에
 * 간다 — 화면에서 바로 보이지만 코드만 읽어서는 안 보이는 자리라 적어 둔다.
 */
export function facadeUv(cell: number): { u0: number; u1: number; v0: number; v1: number } {
  const c = FACADE_CELLS[cell];
  return {
    u0: (c.cx + UV_INSET) / ATLAS_W,
    u1: (c.cx + CELL_W - UV_INSET) / ATLAS_W,
    v0: 1 - (c.cy + CELL_H - UV_INSET) / ATLAS_H,
    v1: 1 - (c.cy + UV_INSET) / ATLAS_H,
  };
}

/**
 * 단위 박스 + 면별 UV. **피벗은 바닥**(`y=0` 이 지면).
 *
 * `BoxGeometry` 의 UV 는 면마다 0~1 이므로, 각 면의 네 정점을 자기 셀 사각형으로
 * 선형 대응시키면 끝난다 — 정점도 삼각형도 하나 안 늘어난다.
 */
function facadeBox(T: ThreeNS): InstanceType<ThreeNS['BufferGeometry']> {
  const geo = new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const uv = geo.attributes.uv;
  // three 의 면 순서·정점 수가 이 배정의 **유일한 전제**다. 조용히 틀리면 창문이 엉뚱한
  // 면에 붙고 원인을 짐작할 수 없으므로, 전제가 깨지는 순간 시끄럽게 터뜨린다.
  if (!uv || uv.count !== BOX_VERTS) {
    throw new Error(`[world5] BoxGeometry 정점 수가 ${BOX_VERTS} 가 아니다(${uv?.count}) — 면별 UV 배정의 전제가 깨졌다`);
  }
  for (let f = 0; f < 6; f++) {
    const { u0, u1, v0, v1 } = facadeUv(FACE_CELL[f]);
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, u0 + (u1 - u0) * u, v0 + (v1 - v0) * v);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * 발광 아틀라스 — **128×128, 여섯 칸.**
 *
 * 검은 바탕 위에 팔레트 색을 `globalAlpha` 로 얹는다(`tower.ts`·`bridge.ts` 와 같은
 * 패턴). 칠하지 않은 텍셀은 발광 0 이다 — 그 검정은 색이 아니라 **강도**라서
 * 팔레트가 아니라 `color.ts` 에서 온다.
 *
 * ⚠️ `tower`·`bridge` 와 달리 **`NearestFilter` 를 쓰지 않는다.** 저쪽은 텍셀 중앙
 * 한 점만 읽는 마스크라 필터가 무의미하지만, 여기는 진짜 격자 텍스처라 축소될 때
 * 밉맵이 없으면 원경 창문이 지글거린다. 대신 셀 경계는 `UV_INSET` 이 막는다.
 */
function facadeMask(T: ThreeNS) {
  const cv = document.createElement('canvas');
  cv.width = ATLAS_W;
  cv.height = ATLAS_H;
  const g = cv.getContext('2d')!;
  g.fillStyle = greyCss(MASK_BLOCK);
  g.fillRect(0, 0, ATLAS_W, ATLAS_H);

  for (const cell of FACADE_CELLS) {
    for (const p of cell.paints) {
      g.globalAlpha = p.a;
      g.fillStyle = hexCss(p.hex);
      g.fillRect(cell.cx + p.x, cell.cy + p.y, p.w, p.h);
    }
  }
  g.globalAlpha = 1;

  const tex = new T.CanvasTexture(cv);
  tex.magFilter = T.LinearFilter;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}
