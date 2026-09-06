// scripts/asset/nyc/modules.mjs — 박스 지오메트리와 **정점 색(COLOR_0) AO 근사**. 순수 함수.
//
// 모든 부품은 축 정렬 박스다(지시서 §6 «벽돌마다 메시를 만들지 말고 큰 실루엣과 가까운 창틀·문틀·
// 처마에 기하를 배분»). 면마다 AO 값을 달리 줄 수 있어 «리빌 안쪽 0.62 · 창턱 아래 0.7 · 연석 접지
// 0.8 · 실내 모서리 0.72» 를 별도 텍스처 없이 낸다(`docs/nyc/art-direction.md` §4 «접촉 음영»).
//
// 좌표계: 박스는 **최소 모서리(min) 기준**으로 만든다 — 입면 조립(`facade.mjs`)이 벽 판을 x·y 구간으로
// 적기 때문에 중심 기준보다 실수가 적다. 면 이름: px/nx(±x) py/ny(±y) pz/nz(±z).

/** 타일 1장이 덮는 월드 길이(m). 벽돌 러닝본드 8단 ≈ 2m — `textures.mjs` 의 타일 설계와 짝이다 */
export const TILE_M = 2;

const FACES = [
  // [법선, 네 꼭짓점(정규화 0/1 좌표)] — 반시계(밖에서 봤을 때) 순서
  { n: [0, 0, 1],  q: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], key: 'pz' },
  { n: [0, 0, -1], q: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], key: 'nz' },
  { n: [1, 0, 0],  q: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], key: 'px' },
  { n: [-1, 0, 0], q: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], key: 'nx' },
  { n: [0, 1, 0],  q: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], key: 'py' },
  { n: [0, -1, 0], q: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], key: 'ny' },
];

/**
 * 박스 하나. `ao` 는 숫자(전 면 동일) 또는 `{px,nx,py,ny,pz,nz, default}`.
 * `omit` 에 적은 면은 만들지 않는다(벽 판의 뒷면·바닥면처럼 안 보이는 면 — 삼각형 절약).
 * 반환 `{pos, nrm, col, idx}` — col 은 RGBA u8, 각 꼭짓점 4개가 면마다 독립(법선이 다르므로).
 */
export function box(x0, y0, z0, x1, y1, z1, { ao = 1, omit = [], tile = TILE_M } = {}) {
  const pos = [], nrm = [], col = [], idx = [], uv = [];
  const aoOf = (key) => {
    const v = typeof ao === 'number' ? ao : (ao[key] ?? ao.default ?? 1);
    return Math.max(0, Math.min(255, Math.round(v * 255)));
  };
  for (const f of FACES) {
    if (omit.includes(f.key)) continue;
    const base = pos.length / 3;
    const a = aoOf(f.key);
    for (const [u, v, w] of f.q) {
      const X = u ? x1 : x0, Y = v ? y1 : y0, Z = w ? z1 : z0;
      pos.push(X, Y, Z);
      nrm.push(...f.n);
      col.push(a, a, a, 255);
      // 평면 투영 UV — 면의 법선 축을 뺀 두 좌표를 타일 크기로 나눈다(월드 m 단위라 인접 판끼리 이음새가 맞는다)
      if (f.key === 'pz' || f.key === 'nz') uv.push(X / tile, Y / tile);
      else if (f.key === 'px' || f.key === 'nx') uv.push(Z / tile, Y / tile);
      else uv.push(X / tile, Z / tile);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { pos, nrm, col, idx, uv };
}

/** 여러 지오를 하나로 합친다(같은 재질끼리). `at` 로 평행이동 */
export function merge(list) {
  const out = { pos: [], nrm: [], col: [], idx: [], uv: [] };
  for (const { geo, at = [0, 0, 0] } of list) {
    const base = out.pos.length / 3;
    for (let i = 0; i < geo.pos.length; i += 3) {
      out.pos.push(geo.pos[i] + at[0], geo.pos[i + 1] + at[1], geo.pos[i + 2] + at[2]);
    }
    out.nrm.push(...geo.nrm); out.col.push(...geo.col); out.uv.push(...(geo.uv ?? []));
    for (const i of geo.idx) out.idx.push(i + base);
  }
  return out;
}

export const triangles = (geo) => geo.idx.length / 3;

/**
 * 재질별 지오 수집기. `add(mat, geo, at)` 로 쌓고 `groups()` 로 재질 → 합친 지오를 낸다.
 * 한 건물이 재질별로 메시 하나씩 갖게 하는 것이 목적(드로우콜 ≈ 재질 수).
 */
export function collector() {
  const byMat = new Map();
  return {
    add(mat, geo, at) {
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat).push({ geo, at });
    },
    groups() {
      const out = [];
      for (const [mat, list] of byMat) out.push({ mat, geo: merge(list) });
      return out;
    },
  };
}

// ── 개구부 리빌 — 벽 판 자체가 뚫려 있고, 뚫린 네 옆면(리빌)을 이 함수가 만든다 ─────────────
// 벽 두께 t 의 판에 x·y 구간이 비어 있을 때, 그 구멍의 위·아래·좌·우 옆면 = 리빌. AO 0.62(§6).
// `d` 는 앞면에서 유리면까지의 깊이(12cm/8cm) — 옆면은 그 깊이만 만든다(뒤는 실내 벽이 가린다).
export function reveal(x0, y0, x1, y1, zFace, d, dir, ao = 0.62) {
  // dir = +1 이면 앞이 +z(북쪽 건물). 리빌은 zFace 에서 안쪽(−dir)으로 d.
  const zIn = zFace - dir * d;
  const za = Math.min(zFace, zIn), zb = Math.max(zFace, zIn);
  const e = 0.001;
  return merge([
    { geo: box(x0, y0, za, x1, y0 + e, zb, { ao, omit: ['ny'] }) },     // 바닥(창턱면) — 위만 보임
    { geo: box(x0, y1 - e, za, x1, y1, zb, { ao, omit: ['py'] }) },     // 천장(인방 아래)
    { geo: box(x0, y0, za, x0 + e, y1, zb, { ao, omit: ['nx'] }) },     // 좌 옆면
    { geo: box(x1 - e, y0, za, x1, y1, zb, { ao, omit: ['px'] }) },     // 우 옆면
  ]);
}

/** 창틀 부재 4개(§6 6×4cm) — 개구부 테두리를 따라 앞면에서 FRAME_D 돌출 */
export function frame(x0, y0, x1, y1, zFace, dir, w, d) {
  const za = dir > 0 ? zFace : zFace - d, zb = dir > 0 ? zFace + d : zFace;
  return merge([
    { geo: box(x0 - w, y0 - w, za, x1 + w, y0, zb) },
    { geo: box(x0 - w, y1, za, x1 + w, y1 + w, zb) },
    { geo: box(x0 - w, y0, za, x0, y1, zb) },
    { geo: box(x1, y0, za, x1 + w, y1, zb) },
  ]);
}

/** 창턱(§6 돌출 6cm·두께 5cm) — 아랫면 AO 0.7 */
export function sill(x0, x1, yTop, zFace, dir, d, t) {
  const za = dir > 0 ? zFace : zFace - d, zb = dir > 0 ? zFace + d : zFace;
  return box(x0 - 0.05, yTop - t, za, x1 + 0.05, yTop, zb, { ao: { ny: 0.7, default: 1 } });
}

/** 유리 판 — 리빌 안쪽에 세운 얇은 사각(앞면만) */
export function pane(x0, y0, x1, y1, z, dir) {
  const e = 0.01;
  const za = dir > 0 ? z - e : z, zb = dir > 0 ? z : z + e;
  return box(x0, y0, za, x1, y1, zb, { omit: dir > 0 ? ['nz', 'px', 'nx', 'py', 'ny'] : ['pz', 'px', 'nx', 'py', 'ny'] });
}
