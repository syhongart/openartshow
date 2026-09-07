// world10/systems/nyc-parcels.ts — **격자 셀 → 결정적 파셀 목록.** world2 `village-parcels.ts` 자리.
//
// ── 무엇을 위한 것인가 (팀장 판정 2026-09-06 「C·포크」 C2) ─────────────────
// world2 는 파셀 목록을 `decide/parcel-layout.ts` 가 **절차 생성**하고, 감독이 손으로 옮긴
// 구역만 `village-parcels.ts` 가 동결해 들고 있었다. world10 은 그 두 축을 하나로 줄인다 —
// **격자 셀 하나 = 파셀 하나**이고, 셀의 내용물은 «셀 GLB 한 장»(`nyc-cell-builder.ts`)이다.
// 그래서 여기에는 «무엇을 어디에 놓는가» 대신 **«이 셀이 무엇인가»** 만 있다.
//
// ⚠ **이 파일은 판정만 한다 — three 를 import 하지 않는다.** 집행(씬에 얹기)은
// `nyc-cell-builder.ts` 다. 그 분리가 이 저장소의 `decide`/`systems` 규약이고, 덕분에 결정성
// (같은 seed → 같은 목록)을 브라우저 없이 시험할 수 있다.
//
// ── 좌표계 두 개를 가르는 자리다 ────────────────────────────────────────────
// **저작 좌표**(GLB 안) — 거리 서쪽 끝이 `x=0`, 게이트 동쪽 끝이 `x=63.4`, 도로 중심선 `z=0`.
//   아트 기준 V1~V4 캡처(`decide/capture-entry.ts`)와 `docs/nyc/art-direction.md` 가 전부 이 좌표다.
// **격자 좌표** — 셀 (px,pz) 의 중심이 원점인 좌표. 스트리밍(`systems/streaming.ts`)이 보는 것.
//
// 둘은 `ANCHOR` 만큼 어긋나 있다. **셀 GLB 를 옮겨 맞추지 않은 이유**는 생성기 헤더
// (`scripts/asset/nyc/generate.mjs` `buildStreet`)에 있다 — 요지는 ① 겹침 회귀 게이트
// (`coplanar.mjs`)가 조상 변환을 거부하고 ② 옮기면 기존 캡처 좌표가 통째로 어긋난다.
//
// ⚠⚠ **`CELL`·`ANCHOR` 는 생성기(`scripts/asset/nyc/layout.mjs` 의 `CELL`)와 같은 값이다.**
// 부트가 `scripts/` 를 import 할 수 없어 생긴 미러링이고(`world10-boot` `hemig` ↔
// `PALETTE.curb` 와 같은 형태), 갈라지지 않게 **`tests/nyc-grid.test.ts` 가 두 파일을 읽어
// 대조한다** — 「격자 상수는 생성기 `layout.mjs` 의 `CELL` 과 같다 (두 값이 갈리면 여기서 깨진다)」.

/** 셀 한 변(m). 지시서 `docs/NYC-GALLERY-WALK.md` «50~70m 거리 한 블록» 안의 값 */
export const NYC_CELL = 64;
/** 셀 중심이 놓인 **저작 좌표**. 거리 내용물 x 0~63.4 의 중점이다 */
export const NYC_ANCHOR_X = 31.7;
/** 도로 중심선이 곧 셀 중심선이다 */
export const NYC_ANCHOR_Z = 0;

/**
 * 랜드마크 예약 주기 — **`hash % LANDMARK_EVERY === 0` 인 셀이 예약된다.**
 *
 * 팀장 조건 **C4**: *"격자에 좌표 예약 + 플레이스홀더 매스까지만. 실존 건축물 형태 재현은
 * §6 법무 판정 뒤 별도 팀장 판정 — **법무 전 커밋 금지**."* 그래서 이 회차가 만드는 것은
 * **좌표 하나**다 — 매스도 아직 안 놓는다(놓으면 그 형태가 곧 판정 대상이 되고, 법무 전에
 * 형태를 고르는 것이 조건이 막은 자리다). 예약이 실제로 존재한다는 것은 테스트가 지킨다.
 *
 * 값의 근거: 3×3 가시 반경(첫 PR 범위, C5)에 **평균 한 곳**이 들어오는 주기다(9 셀 ÷ 9).
 */
export const LANDMARK_EVERY = 9;

/** 셀 하나. **불변**이다 — 같은 (px,pz) 는 언제 물어도 같은 값을 낸다 */
export interface NycCell {
  readonly px: number;
  readonly pz: number;
  /** 이 셀의 GLB **저작 원점**이 놓일 월드 좌표 x */
  readonly x: number;
  /** 같은 것의 z */
  readonly z: number;
  /** 결정적 seed. 같은 (px,pz) → 같은 값이고 좌표 순서에 대칭이 아니다 */
  readonly seed: number;
  /** 이 셀이 랜드마크 예약 자리인가 (C4 — 좌표만, 형태는 §6 법무 뒤) */
  readonly landmark: boolean;
}

/**
 * 셀 좌표 → 32비트 결정적 해시.
 *
 * ⚠ **`px`·`pz` 를 대칭으로 섞지 않는다** — `px+pz` 나 `px^pz` 로 섞으면 (2,1) 과 (1,2) 가
 * 같은 seed 를 받아 격자에 **대각선 줄무늬**가 생긴다. 그래서 두 좌표를 **순서대로** FNV-1a
 * 로 먹인 뒤 splitmix 계열 최종 혼합을 건다.
 *
 * ⚠⚠ **첫 판본은 `imul(px,A) ^ imul(pz,B)` 였고 충돌했다** — 11×11 격자에서 고유 seed 가
 * **121 중 99**(18% 충돌)였다. XOR 로 합치면 두 항의 비트가 상쇄돼 서로 다른 좌표가 같은
 * 값으로 접힌다. 지금 판본은 81×81 = 6,561 좌표 전부가 고유하다(테스트가 그것을 잰다).
 * **「그럴듯한 해시」와 「충돌 안 하는 해시」는 다른 일이고, 그 차이는 재 봐야 보인다.**
 */
export function cellSeed(px: number, pz: number): number {
  let h = 0x811c9dc5;
  for (const v of [px | 0, pz | 0]) {
    h = Math.imul(h ^ (v & 0xffff), 0x01000193);
    h = Math.imul(h ^ ((v >>> 16) & 0xffff), 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  h = Math.imul(h, 0x3d4d51c3);
  h ^= h >>> 16;
  return h >>> 0;
}

/** 셀 하나의 결정적 내용. **여기가 «파셀 목록» 의 전부다** */
export function nycCellAt(px: number, pz: number): NycCell {
  const ix = px | 0;
  const iz = pz | 0;
  const seed = cellSeed(ix, iz);
  return {
    px: ix,
    pz: iz,
    // 저작 좌표계를 그대로 쓰므로 셀 (0,0) 은 **오늘의 거리 그 자리**다(캡처 좌표 불변).
    x: ix * NYC_CELL,
    z: iz * NYC_CELL,
    seed,
    landmark: seed % LANDMARK_EVERY === 0,
  };
}

/**
 * 월드 좌표 → 격자 좌표(파셀 판정에 넘길 값). **`ANCHOR` 를 뺀다.**
 *
 * 스트리밍(`decide/stream.ts`)은 `Math.round(x / cellX)` 로 파셀을 고른다 — 즉 셀 경계가
 * 격자 좌표 `±cell/2` 에 있다고 전제한다. 저작 좌표는 셀 중심이 `ANCHOR` 이므로 그 차이를
 * **여기 한 곳에서** 뺀다. 빌더가 각자 빼면 두 벌이 되고, 그 순간 «파셀은 여기라는데 내용은
 * 저기 있다» 가 된다(이 저장소의 값 미러링 사고 형태).
 */
export function toGridPos(pos: { x: number; z: number }): { x: number; z: number } {
  return { x: pos.x - NYC_ANCHOR_X, z: pos.z - NYC_ANCHOR_Z };
}

/** 월드 좌표가 속한 셀. `toGridPos` 와 스트리밍의 반올림 규약을 **같은 식으로** 쓴다 */
export function parcelOf(pos: { x: number; z: number }): { px: number; pz: number } {
  const g = toGridPos(pos);
  // `| 0` 은 잘라내기가 아니라 **`-0` 정규화**다. `Math.round(-0.43)` 은 `-0` 이고, 그것이
  // 그대로 흘러가면 `Object.is(-0, 0)` 이 거짓이라 「같은 셀인데 다른 셀로 읽히는」 자리가
  // 생긴다(실측: 아트 기준 V1 시작점 x=4 가 정확히 그 값을 냈다).
  return { px: Math.round(g.x / NYC_CELL) | 0, pz: Math.round(g.z / NYC_CELL) | 0 };
}

/**
 * (px,pz) 중심 반경 `r` 링의 셀 목록. **정렬은 (pz, px) 오름차순으로 고정**한다 —
 * 순서가 흔들리면 «같은 seed → 같은 목록» 을 배열 비교로 시험할 수 없다.
 *
 * 첫 PR 의 실측 범위(C5)는 `r = 1` 즉 **3×3** 이다.
 */
export function nycCellsAround(px: number, pz: number, r: number): NycCell[] {
  const out: NycCell[] = [];
  const R = Math.max(0, Math.floor(r));
  for (let dz = -R; dz <= R; dz++) {
    for (let dx = -R; dx <= R; dx++) out.push(nycCellAt((px | 0) + dx, (pz | 0) + dz));
  }
  return out;
}
