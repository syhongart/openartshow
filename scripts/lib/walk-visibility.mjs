// 「거기서 저 사람이 보이는가」 — **순수 판정**. 격자와 카메라만 본다.
//
// ── 왜 이 파일이 있는가 (팀장 요건 R2, 2026-09-19) ──────────────────────────
// 감독 신고 *"치비 하나만 보여꼬"* 를 **수치로 바꾸는 축**이다. 그전까지 「32m 링 →
// 하나만 보임」은 **추론**이었고, 그래서 팀장이 ⓑⓒⓓ 를 반려했다(판정 2). 재상신에
// 필요한 것은 「몇 체가 절두체에 들어오고 그 중 몇 체가 실제로 보이는가」의 실측이다.
//
// ── 판정/집행 분리 ──────────────────────────────────────────────────────────
// 여기는 **순수 함수만** 둔다. GLB 를 읽고 격자를 굽고 치비를 세우는 것은 집행부
// (`scripts/smoke/measure-walk-candidates.mjs`)다. 이 분리가 있어야 판정을 검사로
// 못 박을 수 있다 — `tests/walk-visibility.test.ts` 가 이 파일을 직접 돌린다.
//
// ⚠ 이 저장소는 「판정/집행 경계는 아무도 안 본다」를 규율로 적어 두고 있다. 그래서
// 집행부도 검사 대상이다: 하네스가 이 두 함수를 **실제로 부르는지**를 같은 테스트가
// 소스에서 확인한다(그 한 곳에서만 문자열 검사가 정당한 이유도 거기 적혀 있다).
//
// ── 🔴 **이 파일이 못 보는 것** (적어 두지 않으면 다음 사람이 보증으로 읽는다) ──
//
//  ① **시야 차단과 걷기 불가는 같은 것이 아니다.** 여기 쓰는 격자는
//     `decide/walkable.ts` 가 「밟을 바닥이 있고 머리 위가 비었는가」로 판정한 것이다.
//     그러므로 **허리 높이 화단·낮은 턱·계단**은 `walk=0` 이지만 시야를 안 막고,
//     반대로 **공중에 뜬 구조물**(육교 아래·차양)은 `walk=1` 인데 시야를 막을 수 있다.
//     팀장 요건 R2 가 *"걷기 격자로 시선 차폐"* 라고 수단을 지정했으므로 그대로 쓰되,
//     이 값은 **차폐의 하한도 상한도 아니다**. 진짜 시야는 삼각형 레이캐스트여야 하고
//     그것은 이 회차의 축이 아니다.
//  ② **높이가 없다.** 격자는 2D 다. 눈높이·치비 키는 절두체 쪽만 본다.
//  ③ **투명·유리·창**을 모른다. 격자에 재질 개념이 0 이기 때문이고(자산 독립성),
//     그것은 결함이 아니라 `decide/walkable.ts` 의 설계다.
//  ④ **화면에 몇 픽셀로 보이는가**를 모른다. 200m 밖의 한 체도 절두체 안이면 1 이다.
//     「보인다」의 감독 기준이 「알아볼 수 있다」라면 이 수는 그 상한이다.
//
// ── 검출력 실측 (뮤테이션, 2026-09-22 · `tests/walk-visibility.test.ts` 18검사) ──
// *"테스트 통과는 검출력의 증거가 아니다"* — 그래서 일부러 틀리게 만들어 봤다.
//
//   벽 검사(`walk[…] === 0`)를 항상 거짓으로            → **4 failed**
//   양 끝 칸 제외(`break`)를 제거                        → **3 failed**
//   절두체 right 평면 부호를 left 식으로                 → **2 failed**
//   `boxInFrustum` 꼭짓점 선택을 `box.min` 고정 (x/y/z)  → 각 **1 failed**
//   집행부에서 `traceBlocked` 호출 제거                  → **1 failed**
//   집행부 `verdict` 의 「시선이 0칸」 축 제거            → **1 failed**
//
// 그리고 하네스 쪽 실측 — **차폐를 `blocked: false` 로 고정**하면 모바일 세로 A ×1 의
// 「0체 방향」이 **29/36 → 14/36**, 「가려진 체」가 **4/6 → 0/6** 으로 바뀐다. 즉 R2 의
// 가시 체수는 차폐를 **실제로 소비한** 수다(절두체 수를 베껴 쓴 것이 아니다).
//
// ⚠ **처음에는 꼭짓점 축이 0 failed 였다.** 대조 표본이 치비 크기(0.8m)뿐이라 min/max
// 선택이 판정을 못 갈랐다 — 「참인 문장에서 성립하지 않는 결론」의 그 형태다(통과는
// 참이었고, 그 통과가 보증하던 것이 아니었다). 표본에 건물 크기(최대 40m)를 섞어
// **조건을 참으로 만들었다.**
//
// ⚠⚠ **평면 정규화를 지워도 0 failed 이고, 그것은 구멍이 아니다** — 판정은
// `ax+by+cz+d < 0` 의 **부호**뿐이고 부호는 양의 스칼라 배로 안 바뀐다. 즉 정규화는
// 이 파일의 판정에 수학적으로 무관하다(three 와 형식을 맞춰 둔 것이고, 평면까지의
// **거리**를 쓰는 소비자가 생기는 날 필요해진다). 못 잡는 것을 적어 두지 않으면
// 다음 사람이 이 0 failed 를 구멍으로 읽고 없는 결함을 찾는다.

/**
 * 격자 위에서 두 점을 잇는 직선이 **막힌 칸을 지나는가.**
 *
 * Amanatides–Woo 복셀 순회다. 실수 좌표를 칸으로 환산한 뒤 경계를 하나씩 넘는다 —
 * 표본을 일정 간격으로 찍는 방식(`for (t = 0; t < 1; t += 0.01)`)을 **일부러 안 쓴다**:
 * 그러면 간격보다 얇은 벽을 건너뛰고, 맨해튼의 벽은 칸 0.17m 에서 한두 칸이다.
 *
 * ⚠ **양 끝 칸은 판정에서 뺀다.** 시작 칸에는 보는 사람이 서 있고 끝 칸에는 대상이
 * 서 있다 — 둘 다 「거기 서 있다」가 이미 참이므로 그 칸이 막혔다는 것은 판정이
 * 아니라 입력 모순이다. 빼지 않으면 대상이 `walk=0` 칸에 서 있는 회차(= 스폰이 파셀
 * 격자를 타는 지금)에서 **전원이 가려진 것으로 나와** 재는 축이 죽는다.
 *
 * ⚠⚠ **격자 밖은 막힌 것으로 세지 않는다.** 세계 bbox 밖은 「모른다」이고, 거기를
 * 막힘으로 세면 가장자리에 선 사람이 아무것도 못 보는 것으로 나온다.
 *
 * @param {{minX:number,minZ:number,cell:number,nx:number,nz:number,walk:Uint8Array}} g
 * @param {number} x0 보는 쪽 월드 x
 * @param {number} z0 보는 쪽 월드 z
 * @param {number} x1 대상 월드 x
 * @param {number} z1 대상 월드 z
 * @returns {{blocked:boolean, blockedAt:{ix:number,iz:number}|null, crossed:number, outside:number}}
 *   `crossed` 는 **양 끝을 뺀** 중간 칸 수, `outside` 는 그 중 격자 밖이던 수다.
 *   둘 다 진단이다 — `crossed` 가 0 이면 그 판정은 아무것도 안 본 것이고, 그것을
 *   「안 막혔다」로 읽으면 못 잰 것을 통과로 적는 그 형태가 된다.
 */
export function traceBlocked(g, x0, z0, x1, z1) {
  const { minX, minZ, cell, nx, nz, walk } = g;
  const inBounds = (ix, iz) => ix >= 0 && iz >= 0 && ix < nx && iz < nz;

  // 칸 좌표계(실수)로 옮긴다. 정수부가 칸 인덱스다.
  const fx0 = (x0 - minX) / cell;
  const fz0 = (z0 - minZ) / cell;
  const fx1 = (x1 - minX) / cell;
  const fz1 = (z1 - minZ) / cell;

  let ix = Math.floor(fx0);
  let iz = Math.floor(fz0);
  const endX = Math.floor(fx1);
  const endZ = Math.floor(fz1);

  // 같은 칸이면 중간이 없다 — 「가릴 것이 없다」가 사실이다.
  if (ix === endX && iz === endZ) {
    return { blocked: false, blockedAt: null, crossed: 0, outside: 0 };
  }

  const dx = fx1 - fx0;
  const dz = fz1 - fz0;
  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;
  // 축 하나가 0 이면 그 축의 경계를 영원히 안 넘는다 — `Infinity` 가 그 뜻이다.
  const tDeltaX = stepX === 0 ? Infinity : Math.abs(1 / dx);
  const tDeltaZ = stepZ === 0 ? Infinity : Math.abs(1 / dz);
  let tMaxX = stepX === 0 ? Infinity
    : ((stepX > 0 ? ix + 1 - fx0 : fx0 - ix) / Math.abs(dx));
  let tMaxZ = stepZ === 0 ? Infinity
    : ((stepZ > 0 ? iz + 1 - fz0 : fz0 - iz) / Math.abs(dz));

  let crossed = 0;
  let outside = 0;
  // 순회 상한 — 격자 대각선의 두 배면 어떤 직선도 끝난다. 부동소수점 때문에
  // 끝 칸을 스쳐 지나가는 경우가 있고, 그때 루프가 안 끝나면 하네스가 멈춘다.
  const guard = 2 * (nx + nz) + 8;
  for (let n = 0; n < guard; n++) {
    if (tMaxX < tMaxZ) { ix += stepX; tMaxX += tDeltaX; }
    else { iz += stepZ; tMaxZ += tDeltaZ; }
    if (ix === endX && iz === endZ) break;   // 끝 칸 — 판정에서 뺀다
    crossed++;
    if (!inBounds(ix, iz)) { outside++; continue; }   // 격자 밖은 「모른다」
    if (walk[iz * nx + ix] === 0) {
      return { blocked: true, blockedAt: { ix, iz }, crossed, outside };
    }
  }
  return { blocked: false, blockedAt: null, crossed, outside };
}

/**
 * 절두체 여섯 평면을 **투영·시야 행렬에서** 만든다.
 *
 * three 의 `Frustum.setFromProjectionMatrix` 와 같은 유도다. three 를 쓰지 않는 이유는
 * 이 파일을 순수하게 두기 위해서이고, **그래서 값 미러링 위험이 생긴다** — 그 위험은
 * `tests/walk-visibility.test.ts` 가 **three 의 `Frustum` 과 같은 판정을 내는지**
 * 대조해 막는다(같은 카메라·같은 상자에서 결과가 갈리면 FAIL).
 *
 * @param {number[]} m 열 우선 16원소 `projectionMatrix × matrixWorldInverse`
 * @returns {number[][]} 평면 6개 `[a,b,c,d]` (정규화됨, `ax+by+cz+d >= 0` 이 안쪽)
 */
export function frustumPlanes(m) {
  const p = (a, b, c, d) => {
    const len = Math.hypot(a, b, c) || 1;
    return [a / len, b / len, c / len, d / len];
  };
  // 열 우선 인덱스: m[col*4 + row]
  const m0 = m[0], m4 = m[4], m8 = m[8], m12 = m[12];
  const m1 = m[1], m5 = m[5], m9 = m[9], m13 = m[13];
  const m2 = m[2], m6 = m[6], m10 = m[10], m14 = m[14];
  const m3 = m[3], m7 = m[7], m11 = m[11], m15 = m[15];
  return [
    p(m3 - m0, m7 - m4, m11 - m8, m15 - m12),   // right
    p(m3 + m0, m7 + m4, m11 + m8, m15 + m12),   // left
    p(m3 + m1, m7 + m5, m11 + m9, m15 + m13),   // bottom
    p(m3 - m1, m7 - m5, m11 - m9, m15 - m13),   // top
    p(m3 - m2, m7 - m6, m11 - m10, m15 - m14),  // far
    p(m3 + m2, m7 + m6, m11 + m10, m15 + m14),  // near
  ];
}

/**
 * 축정렬 상자가 절두체와 **겹치는가**(three 의 `Frustum.intersectsBox` 와 같은 판정).
 *
 * 평면마다 **가장 바깥쪽 꼭짓점**만 본다 — 그 점이 바깥이면 상자 전체가 바깥이다.
 * ⚠ 이것은 보수적 판정이라 코너 케이스에서 **거짓 양성**이 있다(절두체 모서리 밖인데
 * 여섯 평면은 전부 통과하는 상자). three 도 같은 판정을 하므로 렌더와 어긋나지 않는다.
 *
 * @param {number[][]} planes `frustumPlanes` 산출
 * @param {{min:{x:number,y:number,z:number},max:{x:number,y:number,z:number}}} box
 */
export function boxInFrustum(planes, box) {
  for (const [a, b, c, d] of planes) {
    const x = a > 0 ? box.max.x : box.min.x;
    const y = b > 0 ? box.max.y : box.min.y;
    const z = c > 0 ? box.max.z : box.min.z;
    if (a * x + b * y + c * z + d < 0) return false;
  }
  return true;
}
