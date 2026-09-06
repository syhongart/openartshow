// scripts/asset/nyc/layout.mjs — 뉴욕 갤러리 거리의 **배치 판정**. 순수 함수, 지오메트리 무관.
//
// 치수·색의 SSOT 는 `docs/nyc/art-direction.md` 다 — 여기 상수는 그 표를 옮긴 것이고 각 줄에
// «§n» 을 적었다. 값을 바꾸려면 그 문서를 먼저 고친다. 지오 생성(`facade.mjs`)은 이 판정만 소비한다.
//
// 좌표: m, y-up, 지면 y=0. 거리 축 = +x(서쪽 끝 x=0), 도로 z −4~+4, 북쪽(z<0) 4채, 남쪽(z>0) 2채.
// «앞» = 도로 쪽. 북쪽 건물의 전면은 +z 를, 남쪽 건물의 전면은 −z 를 본다.

export const DIMS = Object.freeze({
  STREET_LENGTH: 60,      // §3 총 길이
  ROAD_W: 8.0,            // §3
  WALK_W: 3.2,            // §3 보도
  CURB_H: 0.15,           // §3·§6 연석(노출 12cm — 도로면을 −0.15 로 내린다)
  CURB_EXPOSED: 0.12,     // §6
  DEPTH: 14,              // 건물 깊이(위임 명세)
  GAP: 1.2,               // 채 사이 간격(위임 명세)
  STORY_1F: 4.2,          // §3 1층 층고
  STORY_UF: 3.4,          // §3 상층 층고
  WALL_T: 0.3,            // 벽 두께(실내 셸 안쪽 오프셋)
  WIN1_W: 3.4, WIN1_H: 3.0, WIN1_SILL: 0.5, REVEAL_1F: 0.12,   // §3·§6
  WINU_W: 1.1, WINU_H: 1.9, WINU_PITCH: 3.0, WINU_SILL: 0.9, REVEAL_UF: 0.08, // §3·§6
  DOOR_W: 1.8, DOOR_H: 2.4, REVEAL_DOOR: 0.10, DOOR_FRAME: 0.08, LINTEL: 0.04, // §3·§6
  FRAME_W: 0.06, FRAME_D: 0.04,   // §6 창틀 부재
  SILL_D: 0.06, SILL_T: 0.05,     // §6 창턱
  BAND_H: 0.25, BAND_D: 0.04,     // §6 층 띠
  CORNICE_H: 0.30, CORNICE_D: 0.25, // §6
  ESCAPE_D: 0.90, ESCAPE_RAIL: 1.05, // §6 비상계단(1채만)
  SIGN_D: 0.60, SIGN_W: 0.9, SIGN_H: 0.5, SIGN_Y: 3.6, // §6 브래킷 간판(대표 갤러리만)
  ROOM_DEPTH: 10, ROOM_H: 4.0,    // 갤러리 1층 실내(위임 명세)
  SLOT_H: 1.6, SLOT_OFF: 0.02,    // 슬롯 중심 높이·벽에서 앞으로
  GATE_X: 62, GATE_H: 9, GATE_SPAN: 10, // 거리 끝 구조물(위임 명세)
});

/**
 * §2 팔레트 — 알베도 sRGB. `--brick=B` 는 `brickA` 만 바꾼다.
 *
 * ⚠ `curb`(거리 지면색 `#8A857C`)는 **두 자리에 있다** — 여기와 `frontend/js/world10-boot.ts`
 * 의 `DEFAULTS.hemig`. 부트가 `scripts/` 를 import 할 수 없어 생긴 미러링이고, 갈라지지
 * 않게 `tests/nyc-gen.test.ts` 「world10-boot hemig 기본값 = layout.mjs PALETTE.curb
 * (팀장 조건 ② — 두 값이 갈리면 여기서 깨진다)」가 부트 파일을 읽어 대조한다.
 * 반구광 지면색으로 쓰는 근거 — 디자이너 2026-09-06: 아이보리 입면 (217,207,187)→(99,107,94)
 * **색상 반전·밝기 46%** 로 찍혔고, 원인은 `sky.js` 프리셋 hemiG `0x8fa385` 가 지배하는 것이다.
 */
export const PALETTE = Object.freeze({
  brickA: '#8E5541', brickA_B: '#A65A45', brickB: '#7A4A44',
  ivoryA: '#D9CFBB', ivoryB: '#C6BCA8',
  metal: '#2E3338', glass1: '#6E7C82', glassU: '#3C4A55', glassLit: '#CDB98E',
  asphalt: '#4A4744', walk: '#9A948A', curb: '#8A857C',
  roomWall: '#EDEAE4', roomFloor: '#B4AFA6', roomCeil: '#E4E1DA',
});

/** 재질 거칠기(위임 명세). 이름은 PALETTE 키 또는 `<face>Trim`(코니스·띠 = 입면색 명도 −8%) */
export const ROUGH = Object.freeze({
  brick: 0.95, ivory: 0.9, metal: 0.6, glass: 0.2, asphalt: 0.9, walk: 0.85, room: 0.9,
});

/** 6채 — §3 «3-5-4-3 / 4-5», «A6-C12-B9-A6 / B9-C12», 팔레트 배정은 §2 (벽돌 2+1, 아이보리 2+1) */
const PLAN = Object.freeze([
  { id: 1, side: 'N', width: 6,  stories: 3, face: 'brickA' },
  { id: 2, side: 'N', width: 12, stories: 5, face: 'ivoryA', gallery: true },   // 대표 갤러리
  { id: 3, side: 'N', width: 9,  stories: 4, face: 'brickB', escape: true },    // §6 비상계단 1채
  { id: 4, side: 'N', width: 6,  stories: 3, face: 'brickA' },
  { id: 5, side: 'S', width: 9,  stories: 4, face: 'ivoryB' },
  { id: 6, side: 'S', width: 12, stories: 5, face: 'ivoryA' },
]);

/** 건물 총고(§3): 1층 + 상층×(n−1) */
export function buildingHeight(stories) {
  return DIMS.STORY_1F + DIMS.STORY_UF * (stories - 1);
}

/**
 * 배치 판정. 반환 항목의 `x0` 는 서쪽 모서리, `zFront` 는 전면 벽의 도로 쪽 면, `dir` 는 전면이
 * 향하는 방향(+1 = +z, 북쪽 건물). `faceMat` 는 재질 이름(`--brick=B` 반영).
 */
export function layoutBuildings({ brick = 'A' } = {}) {
  const out = [];
  const x = { N: 0, S: 0 };
  for (const p of PLAN) {
    const x0 = x[p.side];
    x[p.side] += p.width + DIMS.GAP;
    const north = p.side === 'N';
    const zFront = north ? -(DIMS.ROAD_W / 2 + DIMS.WALK_W) : (DIMS.ROAD_W / 2 + DIMS.WALK_W);
    const faceMat = p.face === 'brickA' && brick === 'B' ? 'brickA_B' : p.face;
    out.push({
      id: p.id, side: p.side, x0, width: p.width, depth: DIMS.DEPTH, stories: p.stories,
      height: buildingHeight(p.stories), zFront, dir: north ? 1 : -1,
      faceMat, gallery: !!p.gallery, escape: !!p.escape,
      // 문 위치(전면 x 방향, x0 기준): 갤러리는 중앙 오른쪽, 나머지는 왼쪽 치우침(리듬)
      doorX: p.gallery ? p.width * 0.68 : Math.min(1.2 + DIMS.DOOR_W / 2, p.width - DIMS.DOOR_W / 2 - 0.6),
    });
  }
  return out;
}

/** 1층 창 배치(x0 기준 중심 x 목록) — 문을 피해 3.4m 창을 최대한 넣는다 */
export function windows1F(b) {
  const W = DIMS.WIN1_W, pierMin = 0.5;
  const list = [];
  const doorL = b.doorX - DIMS.DOOR_W / 2, doorR = b.doorX + DIMS.DOOR_W / 2;
  // 문 왼쪽 구간
  let cx = pierMin + W / 2;
  while (cx + W / 2 + pierMin <= doorL) { list.push(cx); cx += W + pierMin; }
  // 문 오른쪽 구간
  cx = doorR + pierMin + W / 2;
  while (cx + W / 2 + pierMin <= b.width) { list.push(cx); cx += W + pierMin; }
  return list;
}

/** 상층 창 배치 — 축간격 3.0(§3), 양 끝 기둥 ≥ 0.6 */
export function windowsUF(b) {
  const n = Math.max(1, Math.floor((b.width - 1.2) / DIMS.WINU_PITCH));
  const span = (n - 1) * DIMS.WINU_PITCH;
  const start = (b.width - span) / 2;
  return Array.from({ length: n }, (_, i) => start + i * DIMS.WINU_PITCH);
}

/**
 * 갤러리 실내(방 하나)와 슬롯 4 — 월드 좌표. `inner` 는 벽 안쪽 박스(x0..x1, z0..z1, y 0..ROOM_H).
 * 슬롯: 뒷벽 대형 1(w 3.2·h 2.2 중앙) · 좌벽 2(w 1.6·h 1.6, 문에서 3m·7m) · 우벽 1(w 2.0·h 1.6).
 * `normal` 은 벽에서 방 안쪽으로 향한다(빈 노드의 −z 가 이것을 향하게 `facade.mjs` 가 회전을 만든다).
 */
export function galleryRoom(b) {
  const t = DIMS.WALL_T;
  const x0 = b.x0 + t, x1 = b.x0 + b.width - t;
  // 전면(도로 쪽)이 z=zFront. 방은 전면 유리에서 안쪽으로 ROOM_DEPTH.
  const zF = b.zFront - b.dir * t;                    // 전면 벽 안쪽 면
  const zB = b.zFront - b.dir * DIMS.ROOM_DEPTH;      // 뒷벽 안쪽 면
  const z0 = Math.min(zF, zB), z1 = Math.max(zF, zB);
  const inner = { x0, x1, z0, z1, y0: 0, y1: DIMS.ROOM_H };
  const o = DIMS.SLOT_OFF, y = DIMS.SLOT_H;
  const cx = (x0 + x1) / 2;
  const slots = [
    { id: 1, wall: 'back',  pos: [cx, y, zB + b.dir * o], normal: [0, 0, b.dir],  w: 3.2, h: 2.2 },
    { id: 2, wall: 'left',  pos: [x0 + o, y, zF - b.dir * 3], normal: [1, 0, 0],  w: 1.6, h: 1.6 },
    { id: 3, wall: 'left',  pos: [x0 + o, y, zF - b.dir * 7], normal: [1, 0, 0],  w: 1.6, h: 1.6 },
    { id: 4, wall: 'right', pos: [x1 - o, y, zF - b.dir * 5], normal: [-1, 0, 0], w: 2.0, h: 1.6 },
  ];
  return { inner, zF, zB, slots };
}

/** 지면 판 — 도로면은 −CURB_H(연석 노출), 보도·건물 바닥은 y=0(`glb-collider` 의 지면 전제) */
export function groundPlan() {
  // 세계 밖은 트리가 바다(`features/ocean.ts`, 수면 y<0)로 채운다 — 판이 없는 곳은 바다가 보인다
  // (첫 헤드리스 캡처에서 실측). 그래서 도로·보도는 거리보다 훨씬 길게(x −40..120), 건물 뒤·옆은
  // «뒷마당» 판(연석 색, y=0)으로 z ±60 까지 덮는다. 안개 far(76.8m) 너머는 안개가 가린다.
  const x0 = -40, x1 = 120, zFar = 60;
  const hr = DIMS.ROAD_W / 2, hw = DIMS.WALK_W;
  return {
    road:  { x0, x1, z0: -hr, z1: hr, top: -DIMS.CURB_H, mat: 'asphalt' },
    walkN: { x0, x1, z0: -hr - hw, z1: -hr, top: 0, mat: 'walk' },
    walkS: { x0, x1, z0: hr, z1: hr + hw, top: 0, mat: 'walk' },
    curbN: { x0, x1, z0: -hr - 0.15, z1: -hr, top: 0, bottom: -DIMS.CURB_H, mat: 'curb' },
    curbS: { x0, x1, z0: hr, z1: hr + 0.15, top: 0, bottom: -DIMS.CURB_H, mat: 'curb' },
    yardN: { x0, x1, z0: -zFar, z1: -hr - hw, top: 0, mat: 'curb' },
    yardS: { x0, x1, z0: hr + hw, z1: zFar, top: 0, mat: 'curb' },
  };
}

/** 폭 리듬 검사용 — 같은 쪽에서 인접한 두 채의 폭이 같으면 false */
export function rhythmOk(buildings) {
  for (const side of ['N', 'S']) {
    const ws = buildings.filter((b) => b.side === side).map((b) => b.width);
    for (let i = 1; i < ws.length; i++) if (ws[i] === ws[i - 1]) return false;
  }
  return true;
}

/** sRGB hex → linear RGB(0..1). glTF `baseColorFactor` 는 linear 다 */
export function hexToLinear(hex, mul = 1) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`hex 가 아니다: ${hex}`);
  const v = parseInt(m[1], 16);
  const c = (n) => {
    const s = Math.min(1, (n / 255) * mul);
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return [c((v >> 16) & 255), c((v >> 8) & 255), c(v & 255)];
}
