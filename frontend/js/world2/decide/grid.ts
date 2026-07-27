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
 * 중앙 광장의 반지름(칸). 1이면 3×3 이다.
 *
 * ── 2×2 로 잡았다가 3×3 으로 고쳤다 ─────────────────────────────────────────
 * 처음엔 `(-1,0)×(-1,0)` 2×2 로 두고 "그래야 광장 중심이 월드 원점에 온다"고 적었다.
 * **틀렸다.** 파셀 `(px,pz)` 의 중심은 `(px·cell, pz·cell)` 이므로 그 2×2 의 한가운데는
 * `(-cell/2, -cell/2)` = **(-16,-16)** 이다. 원점이 아니라 광장 모서리 쪽으로 치우친
 * 자리이고, 그대로 두면 분수대가 광장 한복판에 안 선다.
 *
 * 홀수 변으로 잡으면 가운데 칸이 존재하고 그 칸의 중심이 곧 원점이다. 분수대를 그
 * 칸에 놓기만 하면 정확히 광장 한가운데에 온다 — 오프셋 계산이 필요 없다.
 *
 * 3×3 은 96m. 960m 세계의 10분의 1이라 크지만, 중앙 광장은 유일하고 스폰 지점이며
 * 시계탑(14m)이 서는 곳이다. 1칸(32m)이면 분수대와 시계탑이 서로를 가린다.
 */
export const PLAZA_R = 1;

/**
 * 이 파셀이 **중앙 광장**인가. 세계에 하나뿐이다.
 *
 * `parts/plaza.ts` 에도 `isPlaza` 가 있는데 그쪽은 **동네 광장**(확률 1.9%, 걷다 만나는
 * 빈 구획)이라 다른 것이다. 이름이 겹쳐 헷갈리므로 여기는 `Central` 을 붙였다.
 */
export function isCentralPlaza(px: number, pz: number): boolean {
  return Math.abs(px) <= PLAZA_R && Math.abs(pz) <= PLAZA_R;
}

/**
 * 중앙 광장 안에서 이 칸이 어느 자리인가. 광장이 아니면 `null`.
 *
 * **무엇이 서는지는 여기서 정하지 않는다.** 파츠 이름을 이 파일에 적었다가
 * "레지스트리 밖에 파츠 목록을 다시 적지 않는다" 검사에 걸렸다 — 옳은 지적이다.
 * 격자는 자리를 알고, 그 자리에 무엇을 세울지는 `parts/plaza.ts` 가 정한다.
 */
export type PlazaCell = 'center' | 'north' | 'edge';

export function centralPlazaCell(px: number, pz: number): PlazaCell | null {
  if (!isCentralPlaza(px, pz)) return null;
  if (px === 0 && pz === 0) return 'center';
  if (px === 0 && pz === -PLAZA_R) return 'north';
  return 'edge';
}

/** 중앙 광장 한가운데의 월드 좌표. 홀수 변이라 가운데 칸의 중심이고, 그것이 원점이다 */
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

// ── 음수 좌표 ────────────────────────────────────────────────────────────────
// 원점이 세계 한복판이므로 **좌표의 절반이 음수다.** 정수 나눗셈을 잘못 쓰면 세계의
// 절반만 깨지고, 그건 원점 근처만 보는 검사로는 안 잡힌다.
//
// 위험한 쪽은 **`floorDiv` 다.** `floorDiv(-1,2)` 는 -1 인데 `Math.trunc(-1/2)` 는 0 이라,
// 홀수 `pz` 에서 위 슈퍼셀이 아래 슈퍼셀의 패턴을 본다. 증상은 **블록이 반쪽만 병합되는
// 것** — 한 슈퍼셀의 위 행은 합쳐졌는데 아래 행은 안 합쳐진 모습이다.
//
// `floorMod` 는 **여기서는 `%` 로 바꿔도 결과가 같다.** 쓰이는 곳이 `=== 0`(짝수인가)
// 판정뿐이고, 짝수 판정은 `a % 2 === 0` 으로도 부호와 무관하게 정확하기 때문이다.
// 그래도 남겨두는 이유는 슈퍼셀 크기를 2가 아닌 값으로 바꿀 때다 — 그때는
// `floorMod(a,3) === 1` 같은 판정이 생기고, 거기서는 `%` 가 음수에서 어긋난다.
//
// **이 주석은 뮤테이션이 고쳐 쓰게 했다.** 원래 여기에는 "`%` 를 그대로 쓰면 도시가 두
// 겹으로 갈라진다"고 적혀 있었는데, `floorMod` 를 `%` 로 바꾸는 뮤테이션이 테스트를
// **전부 통과했다.** 근거가 틀렸던 것이고, 그 자리에 진짜 위험한 `floorDiv` 를 겨냥한
// 검사(`tests/world2-grid.test.ts` 의 "같은 슈퍼셀의 두 행/열이 하나의 패턴을 공유한다")를
// 새로 넣었다.
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
