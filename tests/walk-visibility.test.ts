// 「거기서 저 사람이 보이는가」 판정의 **검출력** — `scripts/lib/walk-visibility.mjs`.
//
// ── 왜 이 파일이 있는가 ─────────────────────────────────────────────────────
// 이 저장소의 규율은 *"테스트 통과는 검출력의 증거가 아니다"* 이고, **하네스 자신도
// 예외가 아니다.** 직전 회차의 갈림 실측 하네스는 스크래치에서 돌고 사라져 검수관이
// *"재현하지 않았다 — 커밋에 스크립트가 없다"* 며 **보조 근거로만** 받았다. 이번 것은
// 저장소에 남기는데, 남기는 것만으로는 「틀린 값을 내면 잡히는가」가 답해지지 않는다.
//
// ── 이 파일이 지키는 다섯 ───────────────────────────────────────────────────
//   ① `traceBlocked` 가 **벽을 실제로 본다** — 벽을 치우면 판정이 뒤집힌다
//   ② **양 끝 칸을 뺀다** — 안 빼면 지금의 실측(스폰이 `walk=0` 칸에 선다)에서 전원이
//      가려진 것으로 나와 R2 의 축이 통째로 죽는다
//   ③ `frustumPlanes`+`boxInFrustum` 이 **three 의 `Frustum` 과 같은 판정**을 낸다
//      (이 저장소가 「값 미러링」이라 부르는 그 위험을 검사로 막는 자리다)
//   ④ 집행부(`measure-walk-candidates.mjs`)가 이 두 판정을 **실제로 쓴다**
//      — 판정/집행 경계는 양쪽 테스트 어디에도 안 걸린다는 그 구멍을 메운다
//   ⑤ 값 미러링 방지(`scripts/lib/source-literal.mjs`)가 **실행으로** 성립한다 —
//      ④ 의 문자열 검사가 뮤테이션에 0 failed 였던 자리를 실행으로 바꾼 것이다
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three/webgpu';
import { traceBlocked, frustumPlanes, boxInFrustum } from '../scripts/lib/walk-visibility.mjs';
import { pluckLiteral, pluckNumber } from '../scripts/lib/source-literal.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * 시험용 격자. 기본은 **전부 걸을 수 있다** — 벽은 검사마다 손으로 세운다.
 * 원점을 `minX/minZ = 0` 이 아니라 음수로 두는 것은 **월드→칸 환산이 실제로 도는지**
 * 보기 위해서다(0 이면 환산을 빼먹어도 통과한다).
 */
function mkGrid(nx = 21, nz = 21, cell = 1, minX = -10, minZ = -10) {
  return { minX, minZ, cell, nx, nz, walk: new Uint8Array(nx * nz).fill(1) };
}
const setCell = (g: ReturnType<typeof mkGrid>, ix: number, iz: number, v: number) => {
  g.walk[iz * g.nx + ix] = v;
};
/** 월드 좌표를 칸 인덱스로 — 검사가 벽을 **월드 좌표로** 말할 수 있게 한다 */
const at = (g: ReturnType<typeof mkGrid>, x: number, z: number) => ({
  ix: Math.floor((x - g.minX) / g.cell),
  iz: Math.floor((z - g.minZ) / g.cell),
});

describe('① `traceBlocked` — 벽을 실제로 본다', () => {
  it('열린 격자에서는 안 막힌다 · 그리고 **중간 칸을 실제로 지난다**', () => {
    const g = mkGrid();
    const r = traceBlocked(g, -8, 0, 8, 0);
    expect(r.blocked).toBe(false);
    // 🔴 `crossed` 를 함께 단언하는 이유: 「안 막혔다」는 **아무것도 안 봐도** 나온다.
    // 이 수가 0 이면 그 통과는 못 잰 것이고, 하네스의 `verdict` 가 같은 축을 본다.
    expect(r.crossed, '시선이 한 칸도 안 지났다 — 「안 막혔다」가 공허하다').toBeGreaterThan(10);
    expect(r.outside).toBe(0);
  });

  it('🔴 가로지르는 벽 한 줄이 **한 칸 두께여도** 잡힌다', () => {
    const g = mkGrid();
    // x = 0 근방 한 칸 열을 통째로 막는다(z 전 범위)
    const { ix } = at(g, 0, 0);
    for (let iz = 0; iz < g.nz; iz++) setCell(g, ix, iz, 0);
    const r = traceBlocked(g, -8, 0, 8, 0);
    expect(r.blocked, '한 칸 두께 벽을 건너뛰었다 — 표본 간격 방식의 그 결함이다').toBe(true);
    expect(r.blockedAt).toEqual({ ix, iz: at(g, 0, 0).iz });
  });

  it('🔴 **뮤테이션 축** — 그 벽을 치우면 판정이 뒤집힌다', () => {
    const g = mkGrid();
    const { ix } = at(g, 0, 0);
    for (let iz = 0; iz < g.nz; iz++) setCell(g, ix, iz, 0);
    expect(traceBlocked(g, -8, 0, 8, 0).blocked).toBe(true);
    // 벽만 되돌린다. 이 한 줄에 판정이 따라오지 않으면 위 검사는 장식이다.
    for (let iz = 0; iz < g.nz; iz++) setCell(g, ix, iz, 1);
    expect(traceBlocked(g, -8, 0, 8, 0).blocked).toBe(false);
  });

  it('대각선도 지난 칸을 본다 — 축정렬만 보는 구현이면 여기서 깨진다', () => {
    const g = mkGrid();
    // 대각선이 지나는 한 칸만 막는다(축정렬 줄이 아니다)
    const { ix, iz } = at(g, 0.5, 0.5);
    setCell(g, ix, iz, 0);
    const r = traceBlocked(g, -6, -6, 6, 6);
    expect(r.blocked).toBe(true);
  });

  it('수직·수평(한 축 이동 0)에서도 돈다 — `Infinity` 분기', () => {
    const g = mkGrid();
    const { iz } = at(g, 0, 0);
    for (let ix = 0; ix < g.nx; ix++) setCell(g, ix, iz, 0);
    expect(traceBlocked(g, 0, -8, 0, 8).blocked, '수직 시선').toBe(true);
    const g2 = mkGrid();
    const { ix } = at(g2, 0, 0);
    for (let j = 0; j < g2.nz; j++) setCell(g2, ix, j, 0);
    expect(traceBlocked(g2, -8, 0, 8, 0).blocked, '수평 시선').toBe(true);
  });
});

describe('② 양 끝 칸은 판정에서 뺀다 — 이것이 없으면 R2 의 축이 죽는다', () => {
  it('🔴 **대상이 선 칸이 막혀 있어도** 가려진 것으로 세지 않는다', () => {
    const g = mkGrid();
    const { ix, iz } = at(g, 8, 0);
    setCell(g, ix, iz, 0);   // 대상이 걸을 수 없는 칸에 서 있다
    expect(
      traceBlocked(g, -8, 0, 8, 0).blocked,
      '대상이 선 칸을 차폐로 세면 — 지금 실측처럼 스폰이 `walk=0` 칸에 서는 회차에서 '
      + '**전원이 가려진 것으로 나와** 「몇 체가 보이는가」를 아예 못 재게 된다',
    ).toBe(false);
  });

  it('🔴 **보는 사람이 선 칸이 막혀 있어도** 마찬가지다', () => {
    const g = mkGrid();
    const { ix, iz } = at(g, -8, 0);
    setCell(g, ix, iz, 0);
    expect(traceBlocked(g, -8, 0, 8, 0).blocked).toBe(false);
  });

  it('같은 칸 안이면 「가릴 것이 없다」 — 중간이 0 칸이다', () => {
    const g = mkGrid();
    const r = traceBlocked(g, 0.1, 0.1, 0.4, 0.4);
    expect(r.blocked).toBe(false);
    expect(r.crossed).toBe(0);
  });

  it('격자 밖은 **막힘이 아니라 「모른다」** 로 센다', () => {
    const g = mkGrid();
    const r = traceBlocked(g, -8, 0, 40, 0);   // 끝이 격자 바깥
    expect(r.blocked, '격자 밖을 막힘으로 세면 가장자리에 선 사람이 아무것도 못 본다').toBe(false);
    expect(r.outside, '밖으로 나간 칸이 진단에 안 잡힌다').toBeGreaterThan(0);
  });

  it('순회가 반드시 끝난다 — 어떤 방향에서도 멈추지 않는다', () => {
    const g = mkGrid();
    for (let deg = 0; deg < 360; deg += 7) {
      const a = (deg * Math.PI) / 180;
      const r = traceBlocked(g, 0, 0, Math.cos(a) * 9, Math.sin(a) * 9);
      expect(r.crossed).toBeLessThan(2 * (g.nx + g.nz) + 8);
    }
  });
});

describe('③ 절두체 — **three 와 같은 판정**이어야 한다 (값 미러링 방지)', () => {
  /**
   * 우리 판정과 three 판정을 같은 입력으로 나란히 낸다.
   *
   * ⚠ 인자 타입이 `InstanceType<typeof …>` 인 이유: `three/webgpu` 는 이 둘을 **값으로는
   * 내보내는데 타입 네임스페이스에는 없다**(`THREE.PerspectiveCamera` 를 타입 위치에
   * 쓰면 `TS2694`). `import type … from 'three'` 로 끌어오면 두 빌드의 선언이 섞이므로
   * **값에서 되뽑는다** — 이러면 런타임에 실제로 쓰는 바로 그 클래스의 타입이다.
   */
  function bothAgree(
    cam: InstanceType<typeof THREE.PerspectiveCamera>,
    box: InstanceType<typeof THREE.Box3>,
  ): [boolean, boolean] {
    cam.updateMatrixWorld(true);
    const mv = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    const ours = boxInFrustum(frustumPlanes(mv.elements), {
      min: { x: box.min.x, y: box.min.y, z: box.min.z },
      max: { x: box.max.x, y: box.max.y, z: box.max.z },
    });
    const theirs = new THREE.Frustum().setFromProjectionMatrix(mv).intersectsBox(box);
    return [ours, theirs];
  }

  it('🔴 무작위 상자 400개에서 three 와 **한 건도 안 갈린다**', () => {
    // 하네스가 쓰는 것과 같은 화각·거리대(`main.ts` 의 fov 70 · far 7500)
    const cam = new THREE.PerspectiveCamera(70, 390 / 844, 0.1, 7500);
    cam.position.set(-3.5, 1.7, 10);
    let seenIn = 0;
    let seenOut = 0;
    // 결정론적 의사난수 — 회차마다 다른 것을 재면 이 대조가 흔들린다
    let s = 0x9e3779b9;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < 400; i++) {
      cam.rotation.set(0, rnd() * Math.PI * 2, 0, 'YXZ');
      cam.updateProjectionMatrix();
      const cx = (rnd() - 0.5) * 180;
      const cz = (rnd() - 0.5) * 180;
      // 🔴 **크기를 섞는다.** 치비 크기(0.8m)만 재면 `boxInFrustum` 의 「가장 바깥
      // 꼭짓점」 선택이 판정을 못 바꾸고, 그 축의 검출력이 **0 이 된다** — 실측:
      // 꼭짓점 선택을 `box.min` 고정으로 뒤집어도 작은 상자 400개는 **0 failed** 였다.
      // 그래서 건물 크기(최대 40m)까지 섞어 그 선택이 실제로 판정을 가르게 한다.
      const half = 0.4 + rnd() * 20;
      const box = new THREE.Box3(
        new THREE.Vector3(cx - half, 0, cz - half),
        new THREE.Vector3(cx + half, 1.2 + half, cz + half),
      );
      const [ours, theirs] = bothAgree(cam, box);
      expect(ours, `표본 ${i}: 우리 ${ours} vs three ${theirs} (상자 ${cx.toFixed(1)},${cz.toFixed(1)})`)
        .toBe(theirs);
      if (theirs) seenIn++; else seenOut++;
    }
    // 🔴 **양쪽이 다 나와야 대조가 성립한다.** 전부 바깥이면 «언제나 false» 인 구현도
    // 통과한다 — 이 저장소가 「빈 평균 0 이 단언을 통과시켰다」로 이름 붙인 그 형태다.
    expect(seenIn, '절두체 안 표본이 하나도 없다 — 이 대조가 공허하다').toBeGreaterThan(20);
    expect(seenOut, '절두체 밖 표본이 하나도 없다 — 이 대조가 공허하다').toBeGreaterThan(20);
  });

  it('바로 뒤의 상자는 안 보이고 바로 앞은 보인다 — 방향 관례(`yaw=0 → −Z`)', () => {
    const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 7500);
    cam.position.set(0, 1.7, 0);
    cam.rotation.set(0, 0, 0, 'YXZ');
    cam.updateProjectionMatrix();
    const front = new THREE.Box3(new THREE.Vector3(-0.4, 0, -10.4), new THREE.Vector3(0.4, 1.2, -9.6));
    const back = new THREE.Box3(new THREE.Vector3(-0.4, 0, 9.6), new THREE.Vector3(0.4, 1.2, 10.4));
    expect(bothAgree(cam, front)[0], '앞(−Z)이 안 보인다').toBe(true);
    expect(bothAgree(cam, back)[0], '뒤(+Z)가 보인다').toBe(false);
  });

  it('🔴 **뮤테이션 축** — 종횡비를 좁히면 옆의 상자가 화각에서 빠진다', () => {
    const wide = new THREE.PerspectiveCamera(70, 2.164, 0.1, 7500);
    const tall = new THREE.PerspectiveCamera(70, 0.462, 0.1, 7500);
    // 옆으로 크게 벌어진 상자 — 가로 화각에만 걸린다
    const side = new THREE.Box3(new THREE.Vector3(7, 0, -10.4), new THREE.Vector3(7.8, 1.2, -9.6));
    for (const c of [wide, tall]) {
      c.position.set(0, 1.7, 0);
      c.rotation.set(0, 0, 0, 'YXZ');
      c.updateProjectionMatrix();
    }
    expect(bothAgree(wide, side)[0], '가로 화면에서 옆 상자가 안 보인다').toBe(true);
    expect(
      bothAgree(tall, side)[0],
      '세로 화면에서도 보인다 — 종횡비가 판정에 안 쓰인다는 뜻이고, '
      + '그러면 R2 의 「모바일에서 더 안 보인다」 축이 재는 것이 없다',
    ).toBe(false);
  });
});

describe('④ 집행부가 이 판정을 **실제로 쓴다** — 판정/집행 경계', () => {
  // 🔴 여기서만 소스 문자열 검사가 정당하다. 재는 대상이 「그 값이 실제 하네스에
  // 도달하는가」인데, 하네스는 45MB 자산을 읽고 4초가 걸려 유닛 테스트가 못 부른다.
  // 그래서 **배선**만 본다 — 값의 옳음은 위 ①②③ 이 실행으로 본다.
  const src = readFileSync(`${ROOT}scripts/smoke/measure-walk-candidates.mjs`, 'utf8');

  it('하네스가 `walk-visibility.mjs` 의 세 함수를 import 하고 호출한다', () => {
    expect(src).toMatch(/from '\.\.\/lib\/walk-visibility\.mjs'/);
    for (const fn of ['traceBlocked', 'frustumPlanes', 'boxInFrustum']) {
      expect(src, `${fn} 를 import 만 하고 안 부른다 — 배선이 끊겼다`)
        .toMatch(new RegExp(`${fn}\\s*\\(`));
    }
  });

  it('하네스가 조립부 숫자를 `source-literal.mjs` 로 뽑는다 (배선)', () => {
    expect(src).toMatch(/from '\.\.\/lib\/source-literal\.mjs'/);
    expect(src, 'fov·near·far 를 main.ts 에서 안 뽑는다').toMatch(/PerspectiveCamera\\\(/);
    expect(src, "눈높이를 main.ts 의 readNum\\('eye'\\) 에서 안 뽑는다").toMatch(/readNum\\\('eye'/);
  });

  it('🔴 **잰 것이 없는 회차를 통과로 적지 않는다** — `verdict` 가 그 축을 본다', () => {
    expect(src).toMatch(/function verdict\(/);
    expect(src, '시선이 한 칸도 안 지난 회차를 잡는 축이 없다')
      .toMatch(/crossed === 0/);
    expect(src, '판정 실패가 종료코드에 안 실린다').toMatch(/process\.exitCode = 1/);
  });
});

describe('⑤ 값 미러링 방지가 **실행으로** 성립한다 — `scripts/lib/source-literal.mjs`', () => {
  // 🔴 이 절이 따로 있는 이유가 검출력 실측이다. ④ 는 소스에 «throw 가 있다» 를
  // 문자열로 봤고, 그 앞에 `return` 한 줄을 넣는 뮤테이션에 **0 failed** 였다
  // (2026-09-22). 문자열 검사는 「그 글자가 있는가」이지 「그 동작을 하는가」가 아니다 —
  // 이 저장소가 최근 두 회차에 검수관 블로커로 받은 바로 그 형태다. 그래서 실행한다.

  it('🔴 못 찾으면 **던진다** — 조용한 기본값이 없다', () => {
    expect(() => pluckLiteral(ROOT, 'package.json', /이런 문자열은 없다 (\d+)/, '없는 것'))
      .toThrow(/못 찾았다/);
    expect(() => pluckNumber(ROOT, 'package.json', /"name":\s*"([a-z]+)"/, '수가 아닌 것'))
      .toThrow(/수가 아니다/);
  });

  it('🔴 하네스가 쓰는 그 정규식이 **지금 `main.ts` 에서 실제로 맞는다**', () => {
    // 이 검사가 게이트에서 도는 한, `main.ts` 의 그 줄을 고치는 사람은 **여기서**
    // 빨간불을 본다 — 하네스를 돌려 보기 전에. 하네스는 45MB 를 읽어 유닛 테스트가
    // 못 부르므로, 「값이 도달하는가」를 볼 수 있는 자리가 여기뿐이다.
    const cam = pluckLiteral(
      ROOT, 'frontend/js/world-glb/main.ts',
      /new THREE\.PerspectiveCamera\(\s*([\d.]+)\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*,\s*DOME_MAX\s*\*\s*([\d.]+)\s*\)/,
      'PerspectiveCamera 인자',
    );
    expect(Number(cam[1]), 'fov 가 수로 안 나온다').toBeGreaterThan(0);
    expect(Number(cam[2]), 'near 가 수로 안 나온다').toBeGreaterThan(0);
    const eye = pluckNumber(
      ROOT, 'frontend/js/world-glb/main.ts', /readNum\('eye',\s*([\d.]+)\s*,/, '눈높이',
    );
    expect(eye, '눈높이가 사람 키 범위 밖이다 — 정규식이 엉뚱한 줄을 잡았다')
      .toBeGreaterThan(1);
    expect(eye).toBeLessThan(3);
    const dome = pluckNumber(
      ROOT, 'frontend/js/world-glb/systems/sky.ts', /export const DOME_MAX\s*=\s*(\d+)/, 'DOME_MAX',
    );
    expect(dome).toBeGreaterThan(0);
  });
});
