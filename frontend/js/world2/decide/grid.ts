// world2/decide/grid.ts — 세계는 어디까지이고 어느 칸이 무엇인가. 순수 함수만, import 0.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"월드 1처럼 격자로 해주고. 길. 땅영역. 바다. 강. 해주고. 가로 30. 세로 30 으로 하자.
//   칸의 크기는 모두 같은 크기가 아니라 조금 달랐으면해. 2개 셀이 한개인것도 있고.
//   그리고 중앙은 중앙광장으로 하고 분수대 시계탑."*
//
// ── 왜 이 파일이 SSOT 인가 ───────────────────────────────────────────────────
// "여기가 세계 안인가"를 묻는 곳이 여럿이다 — 스트리밍(파셀을 담을까)·미니맵(그릴까)·
// 물(바다인가)·배치(지을까). 각자 적으면 격자를 30에서 40으로 바꿀 때 한쪽만 따라오고,
// 증상은 **지도에는 있는데 걸어가면 없는 땅**으로 나타난다.
//
// 도로 위상(`parts/road-topology.ts`)이 경계 좌표 해시로 이웃 조회를 없앤 것과 같은
// 배치다 — 여기도 `(px,pz)` 하나로 답이 나오고 이웃을 묻지 않는다.

/**
 * 격자 크기(칸). 감독 확정 30×30.
 *
 * 셀이 32m 이므로 960m 사방이다. world1 은 10×10 × 24m = 240m 였으니 면적으로 16배.
 * 걸어서(`WALK_SPEED` 5m/s) 가로지르는 데 약 3분 — 한 세계로 인지되는 상한 근처다.
 */
export const GRID_W = 30;
export const GRID_H = 30;

/**
 * 파셀 좌표는 **중앙이 원점**이다. 30칸이면 -15 … 14.
 *
 * 0-기반(0…29)으로 두지 않는 이유는 스폰 때문이다. 플레이어는 `(0,0)` 에서 시작하고
 * 중앙 광장도 원점 둘레에 있어야 하는데, 0-기반이면 스폰이 세계의 **모서리**가 된다.
 */
export const GRID_MIN_X = -Math.floor(GRID_W / 2);
export const GRID_MAX_X = GRID_MIN_X + GRID_W - 1;
export const GRID_MIN_Z = -Math.floor(GRID_H / 2);
export const GRID_MAX_Z = GRID_MIN_Z + GRID_H - 1;

/** 이 파셀이 세계 안인가. **밖은 전부 바다다**(유한 세계 — 감독 확정) */
export function inGrid(px: number, pz: number): boolean {
  return px >= GRID_MIN_X && px <= GRID_MAX_X && pz >= GRID_MIN_Z && pz <= GRID_MAX_Z;
}

/**
 * 중앙 광장이 차지하는 칸. **2×2 다.**
 *
 * 1칸(32m)이면 분수대와 시계탑을 나란히 놓기에 좁아 둘이 서로 가린다. 2×2 는 64m 라
 * 분수대를 가운데 두고 시계탑을 한쪽에 세워도 사이가 트인다.
 *
 * 30이 짝수라 "정확히 가운데 한 칸"이 존재하지 않는 것도 이유다 — -15…14 의 중앙은
 * -0.5 이므로, 2×2 로 잡아야 광장 중심이 월드 원점 `(0,0)` 에 정확히 온다. 홀수 격자로
 * 바꾸면 이 함수만 고치면 된다(광장 중심을 쓰는 쪽은 `plazaCenter` 를 본다).
 */
export function isPlaza(px: number, pz: number): boolean {
  return (px === -1 || px === 0) && (pz === -1 || pz === 0);
}

/** 광장 중심의 월드 좌표. 2×2 의 한가운데이므로 파셀 경계 위 — 셀 크기와 무관하게 원점이다 */
export function plazaCenter(): { x: number; z: number } {
  return { x: 0, z: 0 };
}

// ── 블록 — "칸 크기가 조금 달랐으면" ────────────────────────────────────────
//
// 감독이 원한 것은 **모든 구획이 똑같은 정사각형이 아닌 도시**다. 실제 도시는 한 블록이
// 옆 블록의 두 배이기도 하고, 그 불규칙이 격자를 격자처럼 안 보이게 만든다.
//
// 병합을 "이 파셀이 오른쪽 이웃과 합쳐지는가"로 풀면 **충돌**이 생긴다 — A가 B와 합치고
// 싶은데 B는 이미 C와 합쳐진 상태일 수 있고, 그걸 알려면 이웃을 조회해야 한다. 파셀이
// 서로를 모른다는 이 아키텍처의 전제가 깨진다.
//
// 그래서 **2×2 슈퍼셀**을 단위로 삼는다. 슈퍼셀 하나가 자기 내부를 어떻게 나눌지 혼자
// 정하므로 이웃 조회가 필요 없고 충돌이 원리적으로 불가능하다.
//
//   슈퍼셀 안의 네 칸        내부 경계 4개
//     A B                     A|B (위 수직) · C|D (아래 수직)
//     C D                     A/C (왼 수평) · B/D (오른 수평)
//
// 경계를 끄면 두 칸이 한 블록이 된다. 패턴은 다섯 가지다:
//
//   NONE  40%  네 칸 그대로        — 기본. 대부분은 한 칸이어야 "조금 다른" 것이 된다
//   H_TOP 15%  A|B 끔 → 가로 2칸 + 낱칸 2
//   H_BOT 15%  C|D 끔
//   V_LEFT 15% A/C 끔 → 세로 2칸 + 낱칸 2
//   V_RIGHT 15% B/D 끔
//
// 2×2 통짜(네 경계 다 끔)는 넣지 않았다. 그 크기의 열린 구획은 **광장**이 맡고, 도시
// 곳곳에 광장만 한 빈 블록이 생기면 중앙 광장이 특별해 보이지 않는다.

/** 슈퍼셀 분할 패턴 */
export const enum BlockPattern {
  None = 0,
  HorizTop = 1,
  HorizBottom = 2,
  VertLeft = 3,
  VertRight = 4,
}

/** 32비트 해시. `road-topology.ts`·`parcel-layout.ts` 와 같은 알고리즘이되 소금이 다르다 */
function h2(a: number, b: number, salt: number): number {
  let h = salt >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x27d4eb2d);
  return (h ^ (h >>> 15)) >>> 0;
}

const SALT_BLOCK = 0x6a09e667;

/**
 * 바닥 나눗셈·나머지. **음수 좌표 때문에 필요하다.**
 *
 * JS 의 `%` 는 부호를 피제수에서 가져와 `-1 % 2 === -1` 이다. 그대로 쓰면 원점 왼쪽·위쪽
 * 절반에서 슈퍼셀 경계가 어긋나 도시가 원점을 기준으로 두 겹으로 갈라진다.
 */
function floorDiv(a: number, b: number): number { return Math.floor(a / b); }
function floorMod(a: number, b: number): number { return a - floorDiv(a, b) * b; }

/** 이 슈퍼셀이 자기 내부를 어떻게 나누는가 */
export function blockPattern(sx: number, sz: number): BlockPattern {
  const r = h2(sx, sz, SALT_BLOCK) / 4294967296;
  if (r < 0.4) return BlockPattern.None;
  if (r < 0.55) return BlockPattern.HorizTop;
  if (r < 0.7) return BlockPattern.HorizBottom;
  if (r < 0.85) return BlockPattern.VertLeft;
  return BlockPattern.VertRight;
}

/**
 * 파셀 `(px,pz)` 와 `(px+1,pz)` 사이 **수직** 경계에 길이 있는가.
 *
 * 슈퍼셀 **사이**의 경계는 언제나 길이다 — 그래야 도시가 격자로 이어진다. 슈퍼셀
 * **안**의 경계만 패턴이 끌 수 있고, 그것이 곧 가로 2칸 블록이다.
 */
export function gridEdgeX(px: number, pz: number): boolean {
  if (floorMod(px, 2) !== 0) return true;          // 슈퍼셀 사이 — 항상 길
  const pattern = blockPattern(floorDiv(px, 2), floorDiv(pz, 2));
  const top = floorMod(pz, 2) === 0;               // 슈퍼셀 안에서 위 행인가
  if (pattern === BlockPattern.HorizTop) return !top;
  if (pattern === BlockPattern.HorizBottom) return top;
  return true;
}

/** 파셀 `(px,pz)` 와 `(px,pz+1)` 사이 **수평** 경계에 길이 있는가 */
export function gridEdgeZ(px: number, pz: number): boolean {
  if (floorMod(pz, 2) !== 0) return true;          // 슈퍼셀 사이 — 항상 길
  const pattern = blockPattern(floorDiv(px, 2), floorDiv(pz, 2));
  const left = floorMod(px, 2) === 0;              // 슈퍼셀 안에서 왼 열인가
  if (pattern === BlockPattern.VertLeft) return !left;
  if (pattern === BlockPattern.VertRight) return left;
  return true;
}
