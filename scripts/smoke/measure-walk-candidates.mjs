#!/usr/bin/env node
// 🔴 **맨해튼 격자 위에서 `?walkcell=` 후보가 실제로 갈리는가 · 거기서 몇 체가 보이는가.**
//
// ── 왜 이것이 필요했나 (팀장 판정 3, 2026-09-19) ────────────────────────────
// 감독 신고 *"치비 하나만 보여꼬"* 의 처방 ⓑ(링 해제)·ⓒ(밴드 거리)·ⓓ(인원)가 **반려**
// 상태로 서 있다. 사유는 *"「32m 링 → 하나만 보임」 연결이 **추론이지 실측이 아니다**"*
// 였고, 재상신 조건이 아래 R1·R2 다. 그리고 그 실측을 낼 수단이 **하나도 없었다** —
// 맨해튼을 넘긴 프로브가 `timeout 900` 에 EXIT=124 로 죽었다.
//
//   **R1** 후보별 스폰 6체 좌표 (= 후보 링크 선결 조건 「산출이 갈리는가」의 충족 근거)
//   **R2** 플레이어 스폰·카메라 기준 가시 체수 + 걷기 격자로 본 시선 차폐
//
// ── 🔴 병목은 GLB 가 아니었다 — **픽스처를 만들지 않는다**(R3 기각) ──────────
// 팀장 R3 는 *"격자를 한 번 구워 산출물을 픽스처로 저장하면 R1·R2 가 GLB 없이 돈다"*
// 였고 *"탐색 없이 낸 제안이라 성립 안 하면 버린다"* 는 단서가 붙어 있었다.
// **버린다.** 실측(이 스크립트 자신의 `--timing`):
//
//     파일 읽기 + 텍스처 청크 제거            ~1,900ms
//     GLTFLoader.parse (메시 21,286 · 삼각형 1,322,096)   ~900ms
//     격자 굽기 네 후보 합계                  ~730ms
//     ──────────────────────────────────────────────────
//     전량                                    **3~4초**
//
// 픽스처(×0.5 만 해도 1,121,481칸)를 커밋하면 **자산이 바뀌는 날 조용히 낡는다** —
// 이 저장소가 백로그 `G-NYC1`(커밋 GLB 와 생성기 산출의 정합을 강제하는 테스트가 0개)
// 에서 이미 아는 형태다. 4초를 아끼자고 그 부채를 지는 거래가 성립하지 않는다.
//
// **그러면 900초 프로브는 왜 죽었나** — 그 프로브가 부른 것은 `startGlbWorld` **전체**
// 이고, 그 안에는 렌더러·하늘·인스턴싱·그림자·미니맵이 다 들어 있다. 여기서 부르는
// 것은 **격자 굽기와 스폰 두 축뿐**이다. 「GLB 파싱이 무겁다」는 진단이 틀렸던 것이고,
// 그 사실 자체가 이 회차의 산출이다.
//
// ── 무엇을 **재현**하고 무엇을 **흉내내지 않는가** ──────────────────────────
// 스폰 좌표를 손으로 계산하지 않는다 — `features/npc.ts` 의 `npcFeature.create` 를
// **그대로 부른다.** 링 거리·밴드 넓히기·점유 배제·시드 소비 순서가 전부 그 안에 있고,
// 그것을 여기 다시 적으면 그 순간 값 미러링이다(이 저장소가 세 번 데인 형태).
// 치비도 **실제로 만든다**(`createChibiAvatar`) — 파셀 갈래에서는 몸 반경이
// `laneOffset` 을 통해 좌표에 직접 얹히므로, 빈 그룹으로 대체하면 그 축이 죽는다.
//
// 흉내내지 않는 것: 렌더러 · 하늘 · 스트리밍 · 인스턴싱 · 미니맵 · 그림자. 재는 축에
// 하나도 안 걸린다(격자는 **인스턴싱 «전»** 트리를 보고, 스폰은 좌표만 본다).
//
// ── 두 갈래를 **나란히** 잰다 ───────────────────────────────────────────────
//   **A (라이브 현행)** `walkGrid()` 가 조립 때 `null`, 첫 `update` 에 격자.
//       `main.ts` 의 실제 순서다 — 조립은 `pools`(:753) 이고 굽기는 `stream`(:938) 이다.
//   **B (ⓐ 적용 후)** 조립 때부터 격자.
//       팀장 판정 1 이 승인한 ⓐ(「스폰을 `rebind` 뒤로」)가 적용된 뒤의 값을 **미리**
//       재는 것이다. ⚠ **ⓐ 를 구현한 것이 아니다** — 이 회차의 범위는 재는 것까지이고
//       (조건 C2 미해소), `features/npc.ts` 는 한 글자도 안 바뀐다.
//
// ── 🔴 **첫 회차 실측 (2026-09-22, 시드 1 · `manhattan-180m.glb`)** ─────────
//
// **R1 — A(라이브 현행)에서 `?walkcell=` 은 스폰을 거의 안 바꾼다.**
//
//     후보        치비 6체가 선 자리                                      ×0.5 대비
//     ×0.5  (-32,32) (32,32) (-32,-32) (0,32) (32,0) (-32,0)              —
//     ×1    같음                                                          0.00m
//     ×1.5  같음                                                          0.00m
//     ×2    세 번째만 (-31.9,-29.1)                                       2.86m
//     → 서로 다른 좌표 조합 **2/4** · 플레이어와의 거리 22.28~50.76m
//
// 좌표가 **전부 32m 의 배수**다. 이것이 `G-WALK5`(「스폰이 파셀 격자를 탄다」)의
// **맨해튼 실물 증거**다 — 그전까지는 합성 세계에서만 본 것이었다. ×2 의 2.86m 는
// 노브가 스폰을 바꾼 것이 아니라, 그 후보에서 벽이 확실히 닫혀(walkable 66.1%) 그
// 체가 **첫 프레임에 갇힘 탈출**(`unstick`)로 밀려난 것이다.
//
// **R1 — B(ⓐ 적용 후)에서는 갈린다.** 좌표 조합 **4/4**, 체별 최대 이동 63.8~64.3m.
// 즉 **후보 링크 선결 조건(「산출이 실제로 갈리는가」)은 ⓐ 적용을 전제로만 충족된다.**
// 지금 라이브 링크로 네 후보를 드리면 감독은 **또 같은 화면 넷**을 보신다.
//
// **R2 — 감독 신고 *"치비 하나만 보여꼬"* 가 수치로 재현됐다.**
// 모바일 세로(390×844)에서 yaw 36방향 × 시드 8회 × 후보 4 × 갈래 2 **전부**:
//
//     ≤1체가 보이는 방향   **36/36** (64/64 조합에서 예외 0)
//     0체인 방향           A ×0.5·×1 은 28~29/36 · 나머지는 32/36 (시드 1 은 전부 28 또는 32)
//     가려진 체            4~5 / 6
//     yaw 0(초기 방향)     절두체 0~1체 · 보임 0~1체
//
// 가로(844×390)·데스크(1920×1080)에서도 ≤1체가 34~36/36 이다. **화각을 넓혀도 안
// 바뀐다** — 막는 것은 화각이 아니라 거리와 벽이다.
//
// ⚠⚠ **그러므로 ⓐ 만으로는 이 증상이 안 고쳐진다 — 오히려 나빠지는 축이 있다.**
// 세로 ×1 의 「0체 방향」이 A 28/36 → B 32/36 이다. A 는 32m 격자점이라 몇 체가
// 플레이어와 **같은 도로 축선**에 우연히 놓이는데, B 는 링 위 임의 좌표라 그 우연이
// 사라진다(거리 자체는 22~51m → 33~44m 로 **더 고르게 멀어진다**). 이것이 팀장 판정 2
// 가 요구한 실측이고, ⓑ(링 해제)·ⓒ(밴드 거리) 재상신의 근거다.
// **해석은 여기까지다** — 어떤 처방을 쓸지는 팀장 판정이고 이 파일의 축이 아니다.
//
// ⚠ **이 표의 첫 판본에 시드 고정 «전» 의 값(29/36)을 적었다 — 자기신고.** 하네스를
// 고쳐 시드를 고정한 뒤 같은 자리가 **28/36** 이었고, 인자를 바꿔 네 번 더 재도 28 이다.
// 「같은 커밋인데 회차마다 갈리는 수」를 그대로 표에 적는 것이 이 저장소가 「실측에
// 여유를 얹은 값은 근거가 아니다」라고 부르는 그 형태다 — 고친 경위를 지우지 않는다.
//
// ⚠⚠⚠ **이 표를 「하나만 보이는 것이 나쁘다」로 읽지 마라.** 감독이 그것을 문제라고
// 하셨으므로 재는 것이고, 재고 나서 「몇 체가 적당한가」는 여전히 감독 판정이다.
// 이 저장소가 「0번 실수」라 이름 붙인 것이 그 혼동이다(수치가 이상한 것과 화면이
// 잘못된 것은 다른 일이다).
//
// ── ⚠ 이 하네스가 **못 보는 것** ───────────────────────────────────────────
//  · **화면.** 렌더러가 없다. 「갈지자가 거슬리는가」·「알아볼 수 있는 크기인가」는
//    여전히 감독 판정이다.
//  · **WebGPU.** 이 저장소의 상시 사각이고 여기도 예외가 아니다.
//  · **텍스처.** GLB 의 이미지 청크를 떼고 읽는다(`scripts/lib/node-glb-scene.mjs`) — 기하만 보므로
//    격자는 같다. 그 대조가 `?walkcell=×1` 의 89.2% 가 `glb-walkmap.ts` 헤더 표와
//    일치하는 것이다(네 후보 전부 일치한다).
//  · **걷기.** 스폰 직후 한 프레임(`dt=0`)까지만 본다. 60초 걷기의 궤적 갈림은
//    `glb-walkmap.ts` 헤더의 표가 이미 재 둔 축이다.
//  · **시야의 진짜 차단.** 격자는 「걸을 수 있는가」이지 「보이는가」가 아니다 —
//    한계 전문은 `scripts/lib/walk-visibility.mjs` 헤더 한 곳이다.
//
// ── 게이트가 아니다 ────────────────────────────────────────────────────────
// 어디에도 CI 에 물려 있지 않고 배포를 막지 않는다. **묶지 않은 것은 판단이다**:
// ① 45MB 커밋 자산에 의존하므로 자산이 없는 체크아웃에서 구조적으로 실패한다
// ② 재는 것이 「후보가 갈리는가」라 **값이 고정되기를 기대하는 축이 아니다** — 격자
//    유도나 스폰 밴드를 고치면 숫자가 바뀌는 것이 정상이고, 그것을 게이트로 잠그면
//    다음 회차가 이 표를 고치느라 시간을 쓴다.
// 대신 **판정은 한다**(아래 `verdict`) — 하네스가 아무것도 못 잰 회차를 통과로 적지
// 않기 위해서다. 판정 축이 죽으면 종료코드 1 이다.
//
// 쓰는 법 (전량 ~4초 · `--repeat=8` 에 ~9초):
//   npm run measure:walk-candidates
//   npm run measure:walk-candidates -- --json        (표 대신 원자료)
//   npm run measure:walk-candidates -- --timing      (구간별 소요)
//   npm run measure:walk-candidates -- --cell=1      (후보 하나만)
//   npm run measure:walk-candidates -- --aspect=0.462  (종횡비 하나만)
//   npm run measure:walk-candidates -- --repeat=8    (시드 흔들림 폭 — 아래 `seedRandom`)
//
// ⚠ **브라우저를 안 쓴다**(node + jsdom). 그래서 「브라우저 검증은 하나씩」 규율의
// 대상이 아니고 스모크와 겹쳐 돌려도 된다 — 4코어 CPU 래스터를 나눠 쓰는 일이 없다
// (팀장 요건 R4 가 상정한 헤드리스 브라우저 축을 **안 골랐다**).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import * as THREE from 'three/webgpu';
import { traceBlocked, frustumPlanes, boxInFrustum } from '../lib/walk-visibility.mjs';
import { installBrowserShims, loadGlbScene } from '../lib/node-glb-scene.mjs';
import { pluckLiteral, pluckNumber } from '../lib/source-literal.mjs';
import { report } from './walk-candidates-report.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GLB = path.join(ROOT, 'frontend/assets/worlds/manhattan-180m.glb');

// ── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (k) => {
  const hit = argv.find((a) => a === `--${k}` || a.startsWith(`--${k}=`));
  if (!hit) return null;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : '';
};
const AS_JSON = flag('json') !== null;
const ONLY_CELL = flag('cell') === null ? null : Number(flag('cell'));
const ONLY_ASPECT = flag('aspect') === null ? null : Number(flag('aspect'));
const SHOW_TIMING = flag('timing') !== null;
const SEED0 = flag('seed') === null ? 1 : Number(flag('seed'));
/** 시드를 몇 개 돌릴 것인가 — 아래 `seedRandom` 절 참고 */
const REPEAT = flag('repeat') === null ? 1 : Math.max(1, Number(flag('repeat')));

/**
 * 🔴 **`Math.random` 을 고정 시드로 갈아 끼운다 — 안 하면 이 하네스가 재현되지 않는다.**
 *
 * 실측(2026-09-22): 같은 커밋에서 두 번 돌렸더니 A ×1 세로의 「0체 방향」이 **29/36 과
 * 28/36** 으로 갈렸다. 원인은 격자도 스폰도 아니다 — `createChibiAvatar` 가 몸을
 * **무작위로** 만들고(실측 반경 0.375~0.456m), 파셀 갈래에서는 그 반경이
 * `decide/npc-lane.ts` 의 `laneOffset` 을 통해 **좌표에 직접 얹힌다.**
 * `npcFeature` 자신의 난수는 고정 시드라 흔들리지 않는다(`rngFrom(0x9e3779b9)`).
 *
 * ⚠ **그 흔들림은 라이브에도 있다** — 감독이 보는 화면도 세션마다 조금씩 다르다는 뜻이다.
 * 그래서 없애는 것이 아니라 **고정하고, 폭을 따로 잰다**(`--repeat=N` 이 시드를
 * `SEED0..SEED0+N-1` 로 돌려 분포를 낸다). 한 시드만 보고 「N 체가 보인다」로 적으면
 * 그것이 이 저장소가 「실측에 여유를 얹은 값」이라 부르는 형태가 된다.
 */
function seedRandom(seed) {
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const out = [];
const say = (s = '') => { if (!AS_JSON) console.log(s); out.push(s); };

// 🔴 **조립부의 숫자는 소스에서 뽑는다 — 여기에 다시 적지 않는다.** 근거·한계·
// 「못 찾으면 던진다」의 이유는 `scripts/lib/source-literal.mjs` 한 곳이다.

/** `main.ts` 의 `new THREE.PerspectiveCamera(fov, 1, near, DOME_MAX * k)` */
const CAM = (() => {
  const m = pluckLiteral(
    ROOT, 'frontend/js/world-glb/main.ts',
    /new THREE\.PerspectiveCamera\(\s*([\d.]+)\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*,\s*DOME_MAX\s*\*\s*([\d.]+)\s*\)/,
    'PerspectiveCamera 인자',
  );
  const dome = pluckNumber(
    ROOT, 'frontend/js/world-glb/systems/sky.ts',
    /export const DOME_MAX\s*=\s*(\d+)/,
    'DOME_MAX',
  );
  return { fov: Number(m[1]), near: Number(m[2]), far: dome * Number(m[3]) };
})();

/** `main.ts` 의 `readNum('eye', N, …)` — 격자 머리 여유이자 카메라 높이다 */
const EYE = pluckNumber(
  ROOT, 'frontend/js/world-glb/main.ts',
  /readNum\('eye',\s*([\d.]+)\s*,/,
  "readNum('eye', …) 기본값",
);

/**
 * 종횡비 후보.
 *
 * ⚠ **이 값만은 `main.ts` 에서 뽑을 수 없다** — 거기서는 `window.innerWidth /
 * Math.max(1, window.innerHeight)` 이고 **화면이 정한다**(`main.ts:682`·`:1030`).
 * 그러므로 이 셋은 **하네스가 고른 값**이고 조립부의 상수가 아니다. 고른 근거:
 * 감독 신고가 **모바일**에서 나왔으므로 세로가 첫 후보이고, 가로·데스크톱은 대조군이다.
 * 세로에서 화각이 가장 좁아지므로 「하나만 보인다」가 가장 잘 성립할 자리다.
 */
const ASPECTS = [
  { name: '세로 390×844', value: 390 / 844 },
  { name: '가로 844×390', value: 844 / 390 },
  { name: '데스크 1920×1080', value: 1920 / 1080 },
];

const fx = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '—');

// ── 본체 ────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(GLB)) {
    console.error(`자산이 없다: ${GLB}\n  이 하네스는 커밋된 맨해튼 자산을 읽는다.`);
    process.exit(2);
  }
  installBrowserShims();

  const glb = await loadGlbScene(GLB);
  const { scene: world, meshes, triangles: tris, bytes: rawBytes, imageBytes, timing } = glb;

  const t = Date.now();
  const server = await createServer({
    root: ROOT, configFile: false, logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  const load = (p) => server.ssrLoadModule(p);
  const gridMod = await load('/frontend/js/world-glb/decide/grid.ts');
  const walkableMod = await load('/frontend/js/world-glb/decide/walkable.ts');
  const walkmapMod = await load('/frontend/js/world-glb/systems/glb-walkmap.ts');
  const npcMod = await load('/frontend/js/world-glb/features/npc.ts');
  const registry = await load('/frontend/js/world-glb/avatars/registry.ts');
  timing.modules = Date.now() - t;

  const SPAWN = gridMod.SPAWN;
  const MULTS = walkableMod.WALK_CELL_MULTIPLES.filter(
    (m) => ONLY_CELL === null || m === ONLY_CELL,
  );
  const aspects = ASPECTS.filter((a) => ONLY_ASPECT === null || Math.abs(a.value - ONLY_ASPECT) < 1e-6);
  if (!MULTS.length) { console.error(`--cell= 후보가 없다(가능: ${walkableMod.WALK_CELL_MULTIPLES})`); process.exit(2); }
  if (!aspects.length) { console.error('--aspect= 후보가 없다'); process.exit(2); }

  say('━━━ 전제 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  say(`자산      ${path.relative(ROOT, GLB)}  ${rawBytes.toLocaleString()} B`
    + `  (이미지 ${imageBytes.toLocaleString()} B = ${(imageBytes / rawBytes * 100).toFixed(1)}%, 떼고 읽는다)`);
  say(`씬        메시 ${meshes.toLocaleString()} · 삼각형 ${tris.toLocaleString()}`);
  say(`시드      Math.random = ${SEED0}${REPEAT > 1 ? `..${SEED0 + REPEAT - 1}` : ""}  (치비 몸이 무작위다 — 고정하지 않으면 회차마다 값이 갈린다)`);
  say(`플레이어  스폰 (${SPAWN.x}, ${SPAWN.z}) · 눈높이 ${EYE}m           ← decide/grid.ts · main.ts`);
  say(`카메라    fov ${CAM.fov}° · near ${CAM.near} · far ${CAM.far}      ← main.ts (소스에서 뽑는다)`);
  say(`치비      기본 ${registry.CHIBI.count}체 · VRM ${registry.VRM_MALE.count}체`);
  if (SHOW_TIMING) {
    say(`소요      읽기+텍스처제거 ${timing.read}ms · GLTFLoader ${timing.parse}ms · 모듈 ${timing.modules}ms`);
  }
  say();

  /** 후보별 산출 전량 */
  const rows = [];

  for (const mult of MULTS) {
    // 🔴 노브를 **실제 경로로** 먹인다 — `bakeWalkmapFor` 가 `readNumOpt('walkcell', …)`
    // 를 스스로 읽는다. 칸 크기를 계산해 넘기면 그 접기 규칙이 하네스에 복제된다.
    globalThis.location = { search: `?walkcell=${mult}`, href: `http://local/?walkcell=${mult}` };

    const t0 = Date.now();
    const grid = walkmapMod.bakeWalkmapFor(world, EYE, SPAWN);
    const bakeMs = Date.now() - t0;
    if (!grid) throw new Error(`×${mult}: 격자가 null 이다 — 이 회차에 잴 것이 없다`);
    const walkCount = walkmapMod.walkableCount(grid);

    const cellOfXZ = (x, z) => ({
      ix: Math.floor((x - grid.minX) / grid.cell),
      iz: Math.floor((z - grid.minZ) / grid.cell),
    });
    const walkAt = (x, z) => {
      const { ix, iz } = cellOfXZ(x, z);
      if (ix < 0 || iz < 0 || ix >= grid.nx || iz >= grid.nz) return null;
      return grid.walk[iz * grid.nx + ix] === 1;
    };

    for (const lane of ['A', 'B']) {
     for (let k = 0; k < REPEAT; k++) {
      const seed = SEED0 + k;
      // 시드를 **체 조립 직전에** 건다. 격자는 이 위에서 이미 구워졌고 난수를 안 쓴다.
      seedRandom(seed);
      const scene = new THREE.Scene();
      // A 는 `main.ts` 의 순서 그대로다 — 조립(`pools`) 때 `null`, 첫 `update` 에 격자.
      let assembled = false;
      const env = {
        scene,
        player: { position: new THREE.Vector3(SPAWN.x, EYE, SPAWN.z) },
        walkGrid: () => (lane === 'B' ? grid : (assembled ? grid : null)),
      };
      const inst = npcMod.npcFeature.create(env);
      if (!inst) throw new Error(`×${mult} ${lane}: npc 기능이 null 이다`);
      assembled = true;
      // `dt = 0` — 걷지 않는다(`step = min(dist, speed × 0) = 0`). 이 한 번이 하는 일은
      // ① A 갈래의 공급자 교체(`rebind` + `reseat`) ② 몸 좌표를 아바타에 얹는 것이다.
      // 그 둘이 곧 **라이브 첫 프레임**이고, 감독이 진입 직후에 보는 화면이 그것이다.
      inst.system.update({ dt: 0 });

      const group = scene.getObjectByName('wg-npc');
      scene.updateMatrixWorld(true);
      const bodies = group.children.map((c) => {
        const box = new THREE.Box3().setFromObject(c);
        return {
          x: c.position.x,
          z: c.position.z,
          dist: Math.hypot(c.position.x - SPAWN.x, c.position.z - SPAWN.z),
          onWalkable: walkAt(c.position.x, c.position.z),
          box: { min: { ...box.min }, max: { ...box.max } },
        };
      });

      const diag = inst.diagnostics();
      rows.push({
        mult, lane, seed, cell: grid.cell, nx: grid.nx, nz: grid.nz, walkCount, bakeMs,
        srcCell: diag.grid.cell, spawnReach: diag.spawnReach, chibi: diag.chibi,
        playerOnWalkable: walkAt(SPAWN.x, SPAWN.z),
        bodies,
        vis: visibility(grid, SPAWN, bodies, aspects),
      });
      inst.dispose();
     }
    }
  }
  await server.close();

  report(rows, aspects, SPAWN, { say, fx, seed0: SEED0, repeat: REPEAT, eye: EYE });
  const bad = verdict(rows);
  if (AS_JSON) console.log(JSON.stringify({ cam: CAM, eye: EYE, spawn: SPAWN, timing, rows, failures: bad }, null, 1));
  if (bad.length) {
    say();
    say('❌ 판정 실패 — 이 회차는 재지 못했다:');
    for (const b of bad) say(`   · ${b}`);
    process.exitCode = 1;
  }
}

/**
 * **R2** — 절두체 안 체수와, 그 중 걷기 격자가 가리지 않는 체수.
 *
 * yaw 를 한 바퀴 돈다. 플레이어의 초기 yaw 는 0 이지만(`systems/player.ts:36`), 감독이
 * 「하나만 보인다」를 말한 시점의 방향은 **아무도 모른다** — 한 방향만 재면 그 수가
 * 우연인지 구조인지 갈리지 않는다. 그래서 초기 방향과 **전 방향 분포**를 함께 낸다.
 */
function visibility(grid, spawn, bodies, aspects) {
  const STEP = 10;                                   // 도. 36 방향
  const yaws = Array.from({ length: 360 / STEP }, (_, i) => (i * STEP) * Math.PI / 180);
  const cam = new THREE.PerspectiveCamera(CAM.fov, 1, CAM.near, CAM.far);

  // 차폐는 **방향과 무관**하다 — 체당 한 번만 재고 방향별로 재사용한다.
  const clear = bodies.map((b) => {
    const r = traceBlocked(grid, spawn.x, spawn.z, b.x, b.z);
    return { blocked: r.blocked, crossed: r.crossed, outside: r.outside };
  });

  const per = {};
  for (const a of aspects) {
    cam.aspect = a.value;
    cam.updateProjectionMatrix();
    const rowsY = yaws.map((yaw) => {
      // `main.ts` 의 `applyCamera` 와 같은 자세다 — 위치·회전 순서(`YXZ`)를 그대로 쓴다.
      cam.position.set(spawn.x, EYE, spawn.z);
      cam.rotation.set(0, yaw, 0, 'YXZ');
      cam.updateMatrixWorld(true);
      const mv = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      const planes = frustumPlanes(mv.elements);
      let inFrustum = 0; let visible = 0;
      bodies.forEach((b, i) => {
        if (!boxInFrustum(planes, b.box)) return;
        inFrustum++;
        if (!clear[i].blocked) visible++;
      });
      return { yaw: Math.round(yaw * 180 / Math.PI), inFrustum, visible };
    });
    const vs = rowsY.map((r) => r.visible).sort((x, y) => x - y);
    const fs = rowsY.map((r) => r.inFrustum).sort((x, y) => x - y);
    per[a.name] = {
      atYaw0: rowsY[0],
      visMin: vs[0], visMed: vs[Math.floor(vs.length / 2)], visMax: vs[vs.length - 1],
      frMin: fs[0], frMed: fs[Math.floor(fs.length / 2)], frMax: fs[fs.length - 1],
      zeroDirs: rowsY.filter((r) => r.visible === 0).length,
      oneOrLess: rowsY.filter((r) => r.visible <= 1).length,
      dirs: rowsY.length,
      byYaw: rowsY,
    };
  }
  return { blockedCount: clear.filter((c) => c.blocked).length, clear, per };
}

/**
 * **하네스가 실제로 잰 것이 있는가.** 값의 좋고 나쁨은 판정하지 않는다 — 그것은 감독
 * 판정이고, 여기서 잠그면 다음 회차가 이 표를 고치느라 시간을 쓴다.
 */
function verdict(rows) {
  const bad = [];
  for (const r of rows) {
    if (r.chibi !== r.bodies.length) bad.push(`${r.lane} ×${r.mult}: 진단 ${r.chibi}체 ≠ 세운 ${r.bodies.length}체`);
    if (!r.bodies.length) bad.push(`${r.lane} ×${r.mult}: 치비가 한 체도 안 섰다`);
    if (r.walkCount <= 0) bad.push(`${r.lane} ×${r.mult}: 걸을 수 있는 칸이 0 이다`);
    // 🔴 시선이 **한 칸도 안 지났으면** 차폐를 아무것도 안 본 것이다. 그것을
    //    「안 가렸다」로 읽으면 못 잰 것이 통과로 적히는 그 자리가 된다.
    if (r.vis.clear.every((c) => c.crossed === 0)) {
      bad.push(`${r.lane} ×${r.mult}: 시선이 지난 칸이 전부 0 — 차폐를 재지 못했다`);
    }
    // B 갈래는 구운 격자를 써야 한다. 파셀 칸(32m)이 나오면 배선이 끊긴 것이다.
    if (r.lane === 'B' && Math.abs(r.srcCell - r.cell) > 1e-9) {
      bad.push(`B ×${r.mult}: 걷기가 구운 칸(${r.cell})이 아니라 ${r.srcCell} 을 쓴다`);
    }
  }
  return bad;
}

main().catch((e) => {
  console.error(e?.stack ?? String(e));
  process.exit(1);
});
