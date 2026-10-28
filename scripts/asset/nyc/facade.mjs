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
      // 문틀은 아래 부재를 빼고 3면만 — 문은 y0=0 이라 아래 부재가 지면 아래에 박혀 보도 윗면과
      // 동일 평면·같은 방향이 된다(0.158m², 감독 «도로에서도 그런 게 보여» 2026-09-06).
      col.add('metal', frame(ax0, 0, ax1, h.y1, zF, d, DIMS.FRAME_W * 1.5, DIMS.DOOR_FRAME, { bottom: false }));
      // 열린 문짝은 **벽 안쪽 면**(zF − d·t)에서 시작한다 — 리빌 깊이(0.10)에서 시작하면 벽 두께
      // (0.30) 안에 20cm 박혀 개구부 옆면과 동일 평면·같은 방향이 됐다(0.476m², 같은 사고).
      const leafW = DIMS.DOOR_W / 2 - 0.02, leafT = 0.04;
      const lz0 = zF - d * t, lz1 = lz0 - d * leafW;
      col.add('metal', box(ax0 - leafT, 0, Math.min(lz0, lz1), ax0, h.y1 - 0.02, Math.max(lz0, lz1)));
      col.add('metal', box(ax1, 0, Math.min(lz0, lz1), ax1 + leafT, h.y1 - 0.02, Math.max(lz0, lz1)));
      return;
    }
    col.add('metal', frame(ax0, h.y0, ax1, h.y1, zF, d, DIMS.FRAME_W, DIMS.FRAME_D));
    // 창턱 윗면은 창틀 아래 부재 **밑**(y0 − FRAME_W)이다 — 같은 높이(y0)에 두면 두 윗면이 동일
    // 평면·같은 방향이고 벽 쪽 뒷면도 겹쳤다(창 하나당 0.036+0.03m², 2026-09-06). 지금은 맞닿는다.
    col.add(trim, sill(ax0, ax1, h.y0 - DIMS.FRAME_W, zF, d, DIMS.SILL_D, DIMS.SILL_T));
    const glassMat = h.kind === 'win1' ? (b.gallery ? 'glass1' : 'glassU') : (lit.has(i - holes1.length) ? 'glassLit' : 'glassU');
    col.add(glassMat, pane(ax0, h.y0, ax1, h.y1, zF - d * depth, d));
  });

  // ── 측면·뒷면·지붕(통짜) ──
  // ⚠ 측벽의 z 범위는 전면 벽·뒷벽 **두께를 뺀 안쪽**이다(zA+t .. zB−t). 예전에는 zA..zB 전체를
  // 덮어 두 판과 부피가 겹쳤고, 그래서 건물 모서리에서 «전면 벽의 바깥면» 과 «측벽의 바깥면» 이
  // 동일 평면·같은 방향이 됐다(x=b.x0·z=zFront·z=zBack 세 자리, 각 6~10m²). 감독 실기기
  // 2026-09-06 «이동하면 벽이 우글우글해». 세 판이 서로 맞물리므로 틈은 생기지 않는다.
  const sideAo = { default: 1, ny: 0.8 };
  const sA = zA + t, sB = zB - t;
  col.add(b.faceMat, box(b.x0, 0, sA, b.x0 + t, H, sB, { ao: sideAo, omit: ['ny'] }));
  col.add(b.faceMat, box(b.x0 + b.width - t, 0, sA, b.x0 + b.width, H, sB, { ao: sideAo, omit: ['ny'] }));
  const bz0 = d > 0 ? zIn : zIn - t, bz1 = d > 0 ? zIn + t : zIn;
  col.add(b.faceMat, box(b.x0, 0, Math.min(bz0, bz1), b.x0 + b.width, H, Math.max(bz0, bz1), { ao: sideAo, omit: ['ny'] }));
  // 지붕 판은 벽 **위** 에 얹는다(H..H+0.05). 예전에는 H−0.05..H 로 벽 안에 묻혀 있어 윗면이
  // 벽 상면(y=H)과, 옆면이 측벽 바깥면과 동일 평면·같은 방향이었다(최대 15.6m²) — 같은 사고다.
  col.add(trim, box(b.x0, H, zA, b.x0 + b.width, H + 0.05, zB, { omit: ['ny'] }));   // 지붕 판

  // ── 비상계단(§6, 1채만): 층마다 발판 + 난간 두 줄 ──
  if (b.escape) {
    for (let s = 1; s < b.stories; s++) {
      const y = DIMS.STORY_1F + DIMS.STORY_UF * (s - 1) + DIMS.BAND_H;
      const ex0 = b.x0 + 0.8, ex1 = b.x0 + b.width - 0.8;
      const ez0 = d > 0 ? zF : zF - DIMS.ESCAPE_D, ez1 = d > 0 ? zF + DIMS.ESCAPE_D : zF;
      col.add('metal', box(ex0, y, ez0, ex1, y + 0.06, ez1, { ao: { ny: 0.7, default: 1 } }));
      // 난간은 발판 **위**(yr)에서 시작하고 가로대는 기둥 **사이**만 잇는다 — 예전에는 셋 다 발판과
      // 같은 y·같은 x 에서 시작해 밑면·옆면·윗면이 서로 동일 평면·같은 방향이었다(층당 0.45m²,
      // 2026-09-06). 부재가 서로 맞닿기만 하면 z-fighting 이 없다.
      const rz = d > 0 ? ez1 : ez0, yr = y + 0.06;
      col.add('metal', box(ex0 + 0.04, yr, rz - 0.02, ex1 - 0.04, yr + DIMS.ESCAPE_RAIL, rz + 0.02));
      col.add('metal', box(ex0, yr, ez0, ex0 + 0.04, yr + DIMS.ESCAPE_RAIL, ez1));
      col.add('metal', box(ex1 - 0.04, yr, ez0, ex1, yr + DIMS.ESCAPE_RAIL, ez1));
    }
  }

  // ── 브래킷 간판(§6, 대표 갤러리만) ──
  if (b.gallery) {
    const sx = b.x0 + b.doorX + DIMS.DOOR_W / 2 + 0.6;
    const sz0 = d > 0 ? zF : zF - DIMS.SIGN_D, sz1 = d > 0 ? zF + DIMS.SIGN_D : zF;
    // 팔은 벽에서 **판 뒷면까지**만 뻗는다 — sz1 까지 뻗으면 판을 관통해 앞면끼리 동일 평면·같은
    // 방향이 된다(8e-4m², 2026-09-06). 판은 sz0+0.1 에서 시작하므로 그 지점에서 맞닿는다.
    const az0 = d > 0 ? sz0 : sz1 - 0.1, az1 = d > 0 ? sz0 + 0.1 : sz1;
    col.add('metal', box(sx, DIMS.SIGN_Y + 0.2, az0, sx + 0.04, DIMS.SIGN_Y + 0.24, az1));   // 팔
    col.add('metal', box(sx - 0.02, DIMS.SIGN_Y - DIMS.SIGN_H / 2, sz0 + (d > 0 ? 0.1 : 0), sx + 0.02, DIMS.SIGN_Y + DIMS.SIGN_H / 2, sz1 - (d > 0 ? 0 : 0.1)));
  }

  // ── 로비 판(비갤러리): 문 뒤 1.6m 에 어두운 벽 — 없으면 문이 «검은 구멍» 이다(반복 1 첫 캡처 실측) ──
  if (!b.gallery) {
    const lx0 = b.x0 + doorX0 - 0.6, lx1 = b.x0 + doorX1 + 0.6;
    const lz = zF - d * 1.6;
    col.add(b.faceMat, box(lx0, 0, Math.min(lz, lz - d * 0.05), lx1, DIMS.DOOR_H + 0.4, Math.max(lz, lz - d * 0.05), { ao: 0.45 }));
    // 바닥은 **전면 벽 안쪽 면**에서 시작하고 윗면만 남긴다 — 예전에는 벽 앞면(zF)까지 나와 있어
    // 옆면·앞면이 벽 슬라이스의 같은 면들과 동일 평면·같은 방향이었다(z-fighting, 2026-09-06).
    const fz = zF - d * t;
    col.add('roomFloor', box(b.x0 + doorX0, 0, Math.min(fz, lz), b.x0 + doorX1, 0.02, Math.max(fz, lz), { ao: 0.6, omit: ['ny', 'px', 'nx', 'pz', 'nz'] }));
  }

  // ── 갤러리 실내(대표만): 바닥·천장·뒷벽·좌우벽 + 걸레받이 음영 ──
  let room = null;
  if (b.gallery) {
    room = galleryRoom(b);
    const r = room.inner, e = 0.02;
    const cornerAo = { default: 1 };
    // ⚠ **왜 e 를 «방 안쪽» 으로 두는가 — 외벽 내면과 동일 평면이면 z-fighting 이다**(감독 실기기
    // 2026-09-06 «이동하면 벽이 우글우글해. 2개의 메쉬가 동시에 붙어있으면 우글우글하잖아»).
    // 예전 판은 실내 판을 외벽 **두께 안**(r.x0−e .. r.x0)에 두었고, 그리는 면이 x=r.x0 = 외벽
    // `galleryRoom` 의 `inner.x0` = 측벽 박스의 안쪽 면이라 **두 면이 같은 평면·같은 방향**이었다
    // (좌·우 각 38.8m² — 감독이 창 너머로 본 것이 이 두 장이다). 지금은 판이 방 안쪽 e 를 차지하고
    // 외벽과 맞닿는 면은 `omit` 한다 — 보이는 면이 벽마다 하나씩만 남는다.
    const fx0 = r.x0 + e, fx1 = r.x1 - e;              // 좌·우 벽 판의 «방 쪽» 면
    const zBackIn = room.zB + d * e;                   // 뒷벽 판의 «방 쪽» 면
    const fz0 = Math.min(zBackIn, room.zF), fz1 = Math.max(zBackIn, room.zF);
    const wallInner = (x0, y0, z0, x1, y1, z1, omit) => box(x0, y0, z0, x1, y1, z1, { ao: cornerAo, omit });
    // 바닥·천장은 윗면/아랫면 한 장만 남긴다 — 네 옆면은 벽 판·전면 벽에 완전히 가려지는데
    // 그중 앞면(z=zF)은 걸레받이 앞면과 같은 평면·같은 방향이 된다(실측 2e-4m²).
    col.add('roomFloor', box(fx0, 0, fz0, fx1, e, fz1, { omit: ['ny', 'px', 'nx', 'pz', 'nz'] }));
    col.add('roomCeil', box(fx0, r.y1 - e, fz0, fx1, r.y1, fz1, { omit: ['py', 'px', 'nx', 'pz', 'nz'] }));
    col.add('roomWall', wallInner(r.x0, 0, fz0, fx0, r.y1, fz1, ['nx']));
    col.add('roomWall', wallInner(fx1, 0, fz0, r.x1, r.y1, fz1, ['px']));
    const zb0 = d > 0 ? room.zB : zBackIn, zb1 = d > 0 ? zBackIn : room.zB;
    col.add('roomWall', wallInner(r.x0, 0, zb0, r.x1, r.y1, zb1, [d > 0 ? 'nz' : 'pz']));
    // 걸레받이 음영(0.72) — 벽·바닥 접점의 접촉 음영 근사. 벽 판 앞면에서 skD 만 돌출하고
    // 벽에 붙는 면은 omit(그 면이 벽 판 앞면과 같은 평면·같은 방향이다). z 범위도 뒷벽 걸레받이
    // 앞에서 시작해 코너에서 밑면끼리 겹치지 않게 한다(실측 1e-4m² — 임계 바로 위였다).
    const sk = 0.12, skD = 0.01;
    const skA = d > 0 ? fz0 + skD : fz0, skB = d > 0 ? fz1 : fz1 - skD;
    col.add('roomWall', box(fx0, 0, skA, fx0 + skD, sk, skB, { ao: 0.72, omit: ['nx'] }));
    col.add('roomWall', box(fx1 - skD, 0, skA, fx1, sk, skB, { ao: 0.72, omit: ['px'] }));
    const zs0 = d > 0 ? zBackIn : zBackIn - skD, zs1 = d > 0 ? zBackIn + skD : zBackIn;
    col.add('roomWall', box(fx0, 0, zs0, fx1, sk, zs1, { ao: 0.72, omit: [d > 0 ? 'nz' : 'pz'] }));
  }

  return { groups: col.groups(), door: { x: b.x0 + b.doorX, y: 0, z: zF }, room };
}
