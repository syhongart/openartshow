// `measure-walk-candidates.mjs` 의 **표 출력**. 재지 않고 적기만 한다.
//
// ── 왜 파일이 갈렸는가 ──────────────────────────────────────────────────────
// 감독 지시 2026-08-16 *"파일사이즈 폭주 안되고 모듈 관리 잘되게"* 의 상한(497줄)에
// 하네스가 628줄로 걸렸다. 쪼갤 자리를 **측정과 서술 사이**로 고른 이유: 이 파일은
// `rows` 를 읽기만 하고 **아무것도 판정하지 않는다** — 판정은 `verdict`(하네스)와
// `scripts/lib/walk-visibility.mjs`(순수 함수) 둘이고, 그 둘은 검사가 붙어 있다.
// 서술만 갈라 두면 표 모양을 고쳐도 재는 값이 안 흔들린다.
//
// ⚠ **여기에 계산을 넣지 마라.** 「가려진 체가 몇인가」 같은 수를 이 파일이 다시
// 세는 순간 값 미러링이고, 그러면 표와 `--json` 이 조용히 갈린다.


/**
 * @param allRows  시드 전량. 표는 첫 시드 한 벌로 내고, 흔들림은 폭으로만 본다
 * @param ctx      `{ say, fx, seed0, repeat, eye }` — 출력·서식과 표에 적을 전제값.
 *                 `eye` 는 하네스가 `main.ts` 에서 뽑은 값이다(여기서 1.7 을 적으면
 *                 그 순간 값 미러링이다 — 하네스 `pluck` 절의 그 이유 그대로다).
 */
export function report(allRows, aspects, spawn, ctx) {
  const { say, fx, seed0: SEED0, repeat: REPEAT, eye: EYE } = ctx;
  // 표는 **첫 시드 한 벌**로 낸다. 시드 흔들림은 아래 전용 절에서 폭으로만 본다 —
  // 섞어 놓으면 「후보가 갈리는가」와 「시드가 갈리는가」가 한 표에서 구별되지 않는다.
  const rows = allRows.filter((r) => r.seed === SEED0);
  say('━━━ R1 — 후보별 스폰 6체 좌표 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  say(`A = 라이브 현행(조립 때 격자 없음) · B = ⓐ 적용 후(조립 때부터 격자) · 시드 ${SEED0}`);
  say();
  for (const lane of ['A', 'B']) {
    const mine = rows.filter((r) => r.lane === lane);
    if (!mine.length) continue;
    say(`[${lane}] ${lane === 'A' ? '라이브 현행' : 'ⓐ 적용 후'}`);
    say('  후보   걷기칸   밴드   치비가 선 자리 (x, z) · ↯ = 걸을 수 없는 칸');
    for (const r of mine) {
      const pts = r.bodies.map((b) => `(${fx(b.x, 1)},${fx(b.z, 1)})${b.onWalkable === false ? '↯' : ''}`).join(' ');
      say(`  ×${String(r.mult).padEnd(4)} ${fx(r.srcCell, 3).padStart(6)}m ${String(r.spawnReach).padStart(5)}  ${pts}`);
    }
    // 🔴 후보 링크 선결 조건의 판정축 — 「후보가 실제로 갈리는가」
    const key = (r) => r.bodies.map((b) => `${b.x.toFixed(3)},${b.z.toFixed(3)}`).join('|');
    const uniq = new Set(mine.map(key));
    say(`  → 서로 다른 좌표 조합 ${uniq.size}/${mine.length}`
      + (uniq.size === 1 ? '  ⚠ **네 후보가 같은 자리다 — 이 갈래에서 노브는 스폰을 안 바꾼다**' : ''));
    if (mine.length > 1) {
      const base = mine[0].bodies;
      const moved = mine.slice(1).map((r) => {
        const d = r.bodies.map((b, i) => Math.hypot(b.x - base[i].x, b.z - base[i].z));
        return `×${r.mult}: 최대 ${fx(Math.max(...d))}m`;
      }).join(' · ');
      say(`  → ×${mine[0].mult} 대비 체별 이동  ${moved}`);
    }
    const dists = mine.map((r) => `×${r.mult}: ${fx(Math.min(...r.bodies.map((b) => b.dist)))}~${fx(Math.max(...r.bodies.map((b) => b.dist)))}m`);
    say(`  → 플레이어와의 거리  ${dists.join(' · ')}`);
    say();
  }

  say('━━━ R2 — 가시 체수 (절두체 → 걷기 격자 차폐) ━━━━━━━━━━━━━━━━━━━━━━');
  say(`플레이어 (${spawn.x}, ${spawn.z}) · 눈높이 ${EYE}m · yaw 를 10° 간격 36방향`);
  say('「절두체」는 화각 안, 「보임」은 거기서 벽에 안 가린 수다. yaw 0 = 초기 방향(−Z).');
  say();
  for (const a of aspects) {
    say(`[종횡비 ${a.name} = ${fx(a.value, 3)}]`);
    say('  갈래 후보  yaw0(절두체/보임)   절두체 최소~중앙~최대   보임 최소~중앙~최대   0체 방향   ≤1체 방향');
    for (const r of rows) {
      const p = r.vis.per[a.name];
      say(`  ${r.lane}   ×${String(r.mult).padEnd(4)}`
        + `   ${String(p.atYaw0.inFrustum)}/${p.atYaw0.visible}`.padEnd(20)
        + `${p.frMin}~${p.frMed}~${p.frMax}`.padStart(14).padEnd(24)
        + `${p.visMin}~${p.visMed}~${p.visMax}`.padStart(12).padEnd(22)
        + `${p.zeroDirs}/${p.dirs}`.padStart(8)
        + `${p.oneOrLess}/${p.dirs}`.padStart(11));
    }
    say();
  }

  say('  차폐만 따로 (방향 무관):');
  for (const r of rows) {
    const c = r.vis.clear;
    const crossed = c.map((x) => x.crossed);
    say(`  ${r.lane} ×${String(r.mult).padEnd(4)} 가려진 체 ${r.vis.blockedCount}/${c.length}`
      + `   시선이 지난 칸 ${Math.min(...crossed)}~${Math.max(...crossed)}`
      + `   격자 밖 칸 ${c.reduce((n, x) => n + x.outside, 0)}`);
  }
  say();

  // ── 시드 흔들림 ───────────────────────────────────────────────────────────
  // 라이브에도 있는 흔들림이다(치비 몸이 무작위다 — `seedRandom` 절). 한 시드만
  // 보고 수를 적으면 그것이 「밟아본 경로의 최댓값」을 근거로 쓰는 그 형태가 된다.
  if (REPEAT > 1) {
    say(`━━━ 시드 흔들림 (시드 ${SEED0}~${SEED0 + REPEAT - 1}, ${REPEAT}회) ━━━━━━━━━━━━━━━━━━━`);
    const a0 = aspects[0];
    say(`  종횡비 ${a0.name} 기준 · 「0체 방향」과 「가려진 체」의 시드별 범위`);
    for (const lane of ['A', 'B']) {
      for (const mult of [...new Set(allRows.map((r) => r.mult))]) {
        const g = allRows.filter((r) => r.lane === lane && r.mult === mult);
        if (!g.length) continue;
        const zero = g.map((r) => r.vis.per[a0.name].zeroDirs);
        const one = g.map((r) => r.vis.per[a0.name].oneOrLess);
        const blk = g.map((r) => r.vis.blockedCount);
        const rng = (v) => (Math.min(...v) === Math.max(...v) ? `${v[0]}` : `${Math.min(...v)}~${Math.max(...v)}`);
        say(`  ${lane} ×${String(mult).padEnd(4)} 0체 방향 ${rng(zero)}/36`
          + `   ≤1체 방향 ${rng(one)}/36   가려진 체 ${rng(blk)}/6`);
      }
    }
    say();
  }
}
