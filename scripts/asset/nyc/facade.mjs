// scripts/asset/nyc/facade.mjs — 건물 한 채를 **판정(layout) → 지오(modules)** 로 조립한다.
//
// 전면 벽은 «개구부를 뚫은 판» 이다: 기둥(pier)·창턱 스팬드럴·인방 스팬드럴 박스들 사이가 비어 있고,
// 그 구멍의 옆면이 리빌(`reveal`), 안쪽에 유리(`pane`)가 선다. 그래서 옆에서 봐도 창이 그림처럼
// 평평해지지 않는다(지시서 §3 «입체감», art-direction §6 리빌 12/8cm). 측면·뒷면·지붕은 통짜.
//
// 재질별로 메시 하나(`collector`) — 건물 하나가 재질 4~6개 = 드로우콜 4~6. 6채 + 지면 + 실내 ≈ 40.
import { DIMS, windows1F, windowsUF, galleryRoom } from './layout.mjs';
import { box, reveal, frame, sill, pane, collector } from './modules.mjs';

const T = () => DIMS.WALL_T;

/** 전면 벽 판을 «구멍 목록» 으로 뚫는다. holes = [{x0,x1,y0,y1}] (x 는 x0 기준 상대, y 절대) */
function punchedWall(col, mat, b, yBot, yTop, holes, ao) {
  const zF = b.zFront, t = T();
  const za = b.dir > 0 ? zF - t : zF, zb = b.dir > 0 ? zF : zF + t;
  // 세로 슬라이스: 구멍 경계 x 로 벽을 잘라 각 슬라이스마다 위·아래 스팬드럴과 기둥을 만든다
  const xs = new Set([0, b.width]);
  for (const h of holes) { xs.add(h.x0); xs.add(h.x1); }
  const cuts = [...xs].sort((a, c) => a - c);
  for (let i = 0; i < cuts.length - 1; i++) {
    const x0 = cuts[i], x1 = cuts[i + 1];
    const mid = (x0 + x1) / 2;
    const hole = holes.find((h) => mid > h.x0 && mid < h.x1);
    const bx0 = b.x0 + x0, bx1 = b.x0 + x1;
    if (!hole) { col.add(mat, box(bx0, yBot, za, bx1, yTop, zb, { ao, omit: ['ny'] })); continue; }
    if (hole.y0 > yBot) col.add(mat, box(bx0, yBot, za, bx1, hole.y0, zb, { ao, omit: ['ny'] }));
    if (hole.y1 < yTop) col.add(mat, box(bx0, hole.y1, za, bx1, yTop, zb, { ao, omit: ['ny'] }));
  }
}

/** 한 채 조립 → `{ groups: [{mat, geo}], door: {x,y,z}, room? }` */
export function buildFacade(b, rng) {
  const col = collector();
  const t = T(), H = b.height, zF = b.zFront, d = b.dir;
  const trim = `${b.faceMat}Trim`;
  const zBack = zF - d * b.depth;
  const zIn = d > 0 ? Math.min(zF, zBack) : Math.max(zF, zBack);   // 뒤쪽 좌표
  const zA = Math.min(zF, zBack), zB = Math.max(zF, zBack);

  // ── 1층 개구부 ──
  const holes1 = [];
  const doorX0 = b.doorX - DIMS.DOOR_W / 2, doorX1 = b.doorX + DIMS.DOOR_W / 2;
  holes1.push({ x0: doorX0, x1: doorX1, y0: 0, y1: DIMS.DOOR_H, kind: 'door' });
  for (const cx of windows1F(b)) {
    holes1.push({ x0: cx - DIMS.WIN1_W / 2, x1: cx + DIMS.WIN1_W / 2, y0: DIMS.WIN1_SILL, y1: DIMS.WIN1_SILL + DIMS.WIN1_H, kind: 'win1' });
  }
  punchedWall(col, b.faceMat, b, 0, DIMS.STORY_1F, holes1, 1);

  // ── 상층 개구부 ──
  const upper = [];
  for (let s = 1; s < b.stories; s++) {
    const yFloor = DIMS.STORY_1F + DIMS.STORY_UF * (s - 1);
    const holes = windowsUF(b).map((cx) => ({
      x0: cx - DIMS.WINU_W / 2, x1: cx + DIMS.WINU_W / 2,
      y0: yFloor + DIMS.WINU_SILL, y1: yFloor + DIMS.WINU_SILL + DIMS.WINU_H, kind: 'winU',
    }));
    punchedWall(col, b.faceMat, b, yFloor, yFloor + DIMS.STORY_UF, holes, 1);
    upper.push(...holes);
    // 층 띠(§6): 앞면에서 BAND_D 돌출
    const bz0 = d > 0 ? zF : zF - DIMS.BAND_D, bz1 = d > 0 ? zF + DIMS.BAND_D : zF;
    col.add(trim, box(b.x0, yFloor, bz0, b.x0 + b.width, yFloor + DIMS.BAND_H, bz1, { ao: { ny: 0.8, default: 1 } }));
  }
  // 코니스(§6)
  const cz0 = d > 0 ? zF : zF - DIMS.CORNICE_D, cz1 = d > 0 ? zF + DIMS.CORNICE_D : zF;
  col.add(trim, box(b.x0 - 0.1, H - DIMS.CORNICE_H, cz0, b.x0 + b.width + 0.1, H, cz1, { ao: { ny: 0.75, default: 1 } }));

  // ── 리빌·창틀·창턱·유리 ──
  const lit = new Set();
  const litCount = Math.min(2, upper.length);
  for (let i = 0; i < litCount; i++) lit.add(Math.floor(rng() * upper.length));   // seed 소비 지점
  const allHoles = [...holes1, ...upper];
  allHoles.forEach((h, i) => {
    const ax0 = b.x0 + h.x0, ax1 = b.x0 + h.x1;
    const depth = h.kind === 'win1' ? DIMS.REVEAL_1F : h.kind === 'winU' ? DIMS.REVEAL_UF : DIMS.REVEAL_DOOR;
    col.add(b.faceMat, reveal(ax0, h.y0, ax1, h.y1, zF, depth, d, h.kind === 'door' ? 0.7 : 0.62));
    if (h.kind === 'door') {
      // 문틀(돌출 8cm)·인방(4cm). 문짝 두 장은 90° 열어 리빌 옆에 붙인다(개구는 비워 둔다)
      col.add('metal', frame(ax0, 0, ax1, h.y1, zF, d, DIMS.FRAME_W * 1.5, DIMS.DOOR_FRAME));
      const leafW = DIMS.DOOR_W / 2 - 0.02, leafT = 0.04;
      const lz0 = zF - d * depth, lz1 = lz0 - d * leafW;
      col.add('metal', box(ax0 - leafT, 0, Math.min(lz0, lz1), ax0, h.y1 - 0.02, Math.max(lz0, lz1)));
      col.add('metal', box(ax1, 0, Math.min(lz0, lz1), ax1 + leafT, h.y1 - 0.02, Math.max(lz0, lz1)));
      return;
    }
    col.add('metal', frame(ax0, h.y0, ax1, h.y1, zF, d, DIMS.FRAME_W, DIMS.FRAME_D));
    col.add(trim, sill(ax0, ax1, h.y0, zF, d, DIMS.SILL_D, DIMS.SILL_T));
    const glassMat = h.kind === 'win1' ? (b.gallery ? 'glass1' : 'glassU') : (lit.has(i - holes1.length) ? 'glassLit' : 'glassU');
    col.add(glassMat, pane(ax0, h.y0, ax1, h.y1, zF - d * depth, d));
  });

  // ── 측면·뒷면·지붕(통짜) ──
  const sideAo = { default: 1, ny: 0.8 };
  col.add(b.faceMat, box(b.x0, 0, zA, b.x0 + t, H, zB, { ao: sideAo, omit: ['ny'] }));
  col.add(b.faceMat, box(b.x0 + b.width - t, 0, zA, b.x0 + b.width, H, zB, { ao: sideAo, omit: ['ny'] }));
  const bz0 = d > 0 ? zIn : zIn - t, bz1 = d > 0 ? zIn + t : zIn;
  col.add(b.faceMat, box(b.x0, 0, Math.min(bz0, bz1), b.x0 + b.width, H, Math.max(bz0, bz1), { ao: sideAo, omit: ['ny'] }));
  col.add(trim, box(b.x0, H - 0.05, zA, b.x0 + b.width, H, zB, { omit: ['ny'] }));   // 지붕 판

  // ── 비상계단(§6, 1채만): 층마다 발판 + 난간 두 줄 ──
  if (b.escape) {
    for (let s = 1; s < b.stories; s++) {
      const y = DIMS.STORY_1F + DIMS.STORY_UF * (s - 1) + DIMS.BAND_H;
      const ex0 = b.x0 + 0.8, ex1 = b.x0 + b.width - 0.8;
      const ez0 = d > 0 ? zF : zF - DIMS.ESCAPE_D, ez1 = d > 0 ? zF + DIMS.ESCAPE_D : zF;
      col.add('metal', box(ex0, y, ez0, ex1, y + 0.06, ez1, { ao: { ny: 0.7, default: 1 } }));
      const rz = d > 0 ? ez1 : ez0;
      col.add('metal', box(ex0, y, rz - 0.02, ex1, y + DIMS.ESCAPE_RAIL, rz + 0.02));
      col.add('metal', box(ex0, y, ez0, ex0 + 0.04, y + DIMS.ESCAPE_RAIL, ez1));
      col.add('metal', box(ex1 - 0.04, y, ez0, ex1, y + DIMS.ESCAPE_RAIL, ez1));
    }
  }

  // ── 브래킷 간판(§6, 대표 갤러리만) ──
  if (b.gallery) {
    const sx = b.x0 + b.doorX + DIMS.DOOR_W / 2 + 0.6;
    const sz0 = d > 0 ? zF : zF - DIMS.SIGN_D, sz1 = d > 0 ? zF + DIMS.SIGN_D : zF;
    col.add('metal', box(sx, DIMS.SIGN_Y + 0.2, sz0, sx + 0.04, DIMS.SIGN_Y + 0.24, sz1));   // 팔
    col.add('metal', box(sx - 0.02, DIMS.SIGN_Y - DIMS.SIGN_H / 2, sz0 + (d > 0 ? 0.1 : 0), sx + 0.02, DIMS.SIGN_Y + DIMS.SIGN_H / 2, sz1 - (d > 0 ? 0 : 0.1)));
  }

  // ── 로비 판(비갤러리): 문 뒤 1.6m 에 어두운 벽 — 없으면 문이 «검은 구멍» 이다(반복 1 첫 캡처 실측) ──
  if (!b.gallery) {
    const lx0 = b.x0 + doorX0 - 0.6, lx1 = b.x0 + doorX1 + 0.6;
    const lz = zF - d * 1.6;
    col.add(b.faceMat, box(lx0, 0, Math.min(lz, lz - d * 0.05), lx1, DIMS.DOOR_H + 0.4, Math.max(lz, lz - d * 0.05), { ao: 0.45 }));
    col.add('roomFloor', box(b.x0 + doorX0, 0, Math.min(zF, lz), b.x0 + doorX1, 0.02, Math.max(zF, lz), { ao: 0.6, omit: ['ny'] }));
  }

  // ── 갤러리 실내(대표만): 바닥·천장·뒷벽·좌우벽 + 걸레받이 음영 ──
  let room = null;
  if (b.gallery) {
    room = galleryRoom(b);
    const r = room.inner, e = 0.02;
    const cornerAo = { default: 1 };
    col.add('roomFloor', box(r.x0, 0, r.z0, r.x1, e, r.z1, { omit: ['ny'] }));
    col.add('roomCeil', box(r.x0, r.y1 - e, r.z0, r.x1, r.y1, r.z1, { omit: ['py'] }));
    const wallInner = (x0, y0, z0, x1, y1, z1, omit) => box(x0, y0, z0, x1, y1, z1, { ao: cornerAo, omit });
    col.add('roomWall', wallInner(r.x0 - e, 0, r.z0, r.x0, r.y1, r.z1, ['nx']));
    col.add('roomWall', wallInner(r.x1, 0, r.z0, r.x1 + e, r.y1, r.z1, ['px']));
    const zb0 = d > 0 ? room.zB - e : room.zB, zb1 = d > 0 ? room.zB : room.zB + e;
    col.add('roomWall', wallInner(r.x0, 0, zb0, r.x1, r.y1, zb1, [d > 0 ? 'nz' : 'pz']));
    // 걸레받이 음영(0.72) — 벽·바닥 접점의 접촉 음영 근사
    const sk = 0.12;
    col.add('roomWall', box(r.x0, 0, r.z0, r.x0 + 0.01, sk, r.z1, { ao: 0.72 }));
    col.add('roomWall', box(r.x1 - 0.01, 0, r.z0, r.x1, sk, r.z1, { ao: 0.72 }));
    col.add('roomWall', box(r.x0, 0, d > 0 ? room.zB : room.zB - 0.01, r.x1, sk, d > 0 ? room.zB + 0.01 : room.zB, { ao: 0.72 }));
  }

  return { groups: col.groups(), door: { x: b.x0 + b.doorX, y: 0, z: zF }, room };
}
