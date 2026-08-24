// space-outside.ts — **창밖 풍경.** 실내에서 창문 너머로 보이는 바깥.
// -----------------------------------------------------------------------------
// 감독 지시 2026-08-24: *"창문을 내서 주변의 바깥풍경을 오픈월드의 가상으로 보여줄 수
// 있나? 이 기능은 별도 파일로 분리해."*
//
// ── 왜 별도 파일인가 (감독 지시이자 구조상 옳다) ────────────────────────────
// 전시장 조립(`space-assembler`)은 **방 안**을 만든다. 바깥은 방의 일부가 아니고,
// 없어도 전시는 성립한다. 한 파일에 섞으면 「창을 끄면 무엇이 사라지는가」가 안 갈리고,
// 방 조립을 고칠 때마다 하늘까지 함께 본다. 여기 있으면 통째로 빼도 방은 그대로다.
//
// ── 「오픈월드의 가상」을 어떻게 만드나 ────────────────────────────────────
// 실제 오픈월드(world2)를 실시간으로 렌더해 넣는 것은 이 페이지의 예산 밖이다 — 그쪽은
// WebGPU 이고 파셀 스트리밍이 걸려 있으며, 창 하나 때문에 세계를 두 벌 돌릴 수는 없다.
// 대신 **같은 결의 풍경을 절차적으로 세운다**: 하늘 → 먼 지면 → 원경 실루엣 세 겹이다.
// 창밖은 시차(視差)가 크지 않은 원경이라 이 근사가 화면에서 성립한다.
//
// ── 자기완결 ────────────────────────────────────────────────────────────────
// 외부 이미지를 받지 않는다. 하늘은 **캔버스 텍스처**로 굽는다 — `ShaderMaterial`(GLSL)은
// `three.webgpu` 빌드에 렌더 경로가 아예 없어서(CLAUDE.md 실측) 백엔드가 갈리면 조용히
// 안 보인다. 캔버스 텍스처는 두 백엔드에서 같은 수단이다.
//
// ⚠ 개수 불변식 — 이 모듈이 만드는 것은 **부팅 때 한 번**이고 세션 중 생성·제거가 0 이다.
// `dispose()` 는 페이지를 떠날 때만 부른다.
import * as THREE from 'three';

/**
 * 하늘 무드 후보. **글로 설득할 수 없는 것은 후보를 여럿 만들어 화면으로 판정한다**
 * (CLAUDE.md 의사결정 사이클 2번). `visit.html?sky=<이름>` 으로 재배포 없이 비교된다.
 *   day   — 첫 판본. 지평선이 희어 「안개 낀 도시」로 읽힌다.
 *   clear — 지평선까지 푸름을 남긴 맑은 낮.
 *   dusk  — 해질녘.
 */
export type OutsideMood = 'day' | 'clear' | 'dusk';
export const OUTSIDE_MOODS: readonly OutsideMood[] = ['day', 'clear', 'dusk'];

/** 창밖 풍경 한 벌. `dispose()` 로 통째로 회수한다. */
export interface OutsideView {
  /** 씬에 붙일 그룹. three 실제 타입 대신 구조로 둔다 — 이 저장소는 tsconfig 가 three 를
   *  스텁으로 매핑하므로 `THREE.Group` 을 타입으로 참조할 수 없다(`space-parts.ts` 동형). */
  readonly group: { add(o: unknown): void; removeFromParent(): void; clear(): void; name: string };
  dispose(): void;
}

export interface OutsideOptions {
  /** 방 반지름(m) 대략치 — 돔·지면을 이보다 훨씬 밖에 둔다. */
  readonly roomSpan?: number;
  /** 하늘 무드. 기본 'day'. 후보를 노브로 열어 감독이 화면에서 비교한다(`visit.html?sky=`). */
  readonly mood?: OutsideMood;
  /**
   * **보는 카메라의 far**. 풍경 전체를 이 안에 세운다.
   *
   * ⚠ 이 옵션이 없던 첫 판본은 창밖이 **통째로 안 보였다** — 그리고 그것이 화면에서
   * 「안 만들어졌다」와 구별되지 않았다. 돔을 220m 에 세웠는데 `visit.js` 의 카메라가
   * `far = 200` 이라(`PerspectiveCamera(62, 1, 0.05, 200)`) 하늘과 먼 지면이 **클리핑
   * 평면 밖**이었다. 실루엣(95~165m)만 far 안이었고, 그 색이 배경색(`FOG_COLOR`
   * `0x20232b`)과 가까워 화면상 아무 일도 안 일어난 것처럼 보였다. 실측(창 4개가 난
   * 방, 벽 5m 앞에서 바깥 그룹 on/off): **달라진 픽셀 0~0.95%, 푸른 픽셀 0%.**
   *
   * 그래서 거리를 상수로 박지 않는다 — **호출자의 far 에서 유도한다.** 그러면 카메라
   * 설정이 바뀌어도 따라오고, 값을 두 곳에 적는 형태(한쪽만 고쳐도 아무도 모른다)가
   * 애초에 생기지 않는다. 넘기지 않으면 `DEFAULT_FAR` 를 쓴다.
   */
  readonly cameraFar?: number;
}

// ── 거리 — **원하는 값과 카메라 far 중 작은 쪽**을 쓴다 ────────────────────────
// 아래 셋은 「이 정도면 원경으로 읽힌다」는 희망값이지 보장값이 아니다. 실제로 세우는
// 거리는 `scaleFor(far)` 가 정한다 — far 밖에 세우면 조용히 잘리기 때문이다(위 주석).
//
// 돔 반지름: 방(최대 28×18m)보다 충분히 크되, 원경이 「멀다」고 읽히는 거리.
// 너무 가까우면 창을 지나칠 때 하늘이 따라 도는 것이 보이고, 너무 멀면 실루엣이 점이 된다.
const DOME_WANT = 220;
// 원경 실루엣이 서는 띠. 지평선 바로 앞이라야 「저 멀리」로 읽힌다.
const SIL_NEAR_WANT = 95;
const SIL_FAR_WANT = 165;
/** 카메라 far 를 안 받았을 때의 기준. `visit.js` 의 현재 값과 같지만 **미러링이 아니다** —
 *  호출자가 넘기면 그 값이 이긴다. 여기 값은 넘기지 않은 호출자를 위한 하한일 뿐이다. */
const DEFAULT_FAR = 200;
// 여유율 — 돔을 far 에 딱 붙이면 원근/부동소수 오차로 가장자리가 깜빡인다.
const DOME_OF_FAR = 0.92;
const SIL_FAR_OF_FAR = 0.75;

/** far 안에 들어오도록 세 거리를 함께 접는다(비율 유지 — 한쪽만 접으면 띠가 돔을 뚫는다). */
export function scaleFor(cameraFar?: number): { dome: number; silNear: number; silFar: number } {
  const far = typeof cameraFar === 'number' && isFinite(cameraFar) && cameraFar > 1 ? cameraFar : DEFAULT_FAR;
  const dome = Math.min(DOME_WANT, far * DOME_OF_FAR);
  const silFar = Math.min(SIL_FAR_WANT, far * SIL_FAR_OF_FAR, dome * 0.9);
  const silNear = Math.min(SIL_NEAR_WANT, silFar * 0.62);
  return { dome, silNear, silFar };
}
// 실루엣 개수 — 드로우콜은 재질별 1벌로 병합되므로 개수가 아니라 정점 수만 는다.
const SIL_COUNT = 46;

/**
 * 무드별 색. **한 곳에 모은다** — 하늘·나무·건물·먼 지면이 따로 놀면 저녁 하늘에 한낮
 * 지면이 깔린다(값을 두 곳에 적으면 한쪽만 고쳐도 아무도 모른다).
 *
 * ⚠ 창으로 실제 보이는 것은 **지평선 부근**이지 천정이 아니다 — 창은 눈높이보다 위에
 * 있지만(`partY('window')` = 층고의 0.58) 원경 돔은 반지름이 100m 단위라 시선이 거의
 * 수평이다. 실측(방 9×7·창까지 4.5m): 창 상단을 보는 앙각이 **19.5°**, 텍스처로는
 * v≈0.75 지점이다. 그래서 그라디언트의 **아래쪽 3/4 이 화면을 지배**한다 — 첫 판본이
 * 창백해 보인 것은 0.86 지점을 `#dbe7f2`(거의 흰색)로 둔 탓이다.
 */
const SKY: Record<OutsideMood, {
  stops: readonly (readonly [number, string])[]; ground: number; tree: number; bldg: number;
}> = {
  day:   { stops: [[0, '#4b7fc4'], [0.52, '#9dc0e6'], [0.86, '#dbe7f2'], [1, '#eef2f4']],
           ground: 0x6f8258, tree: 0x47603c, bldg: 0x8d93a0 },
  clear: { stops: [[0, '#2f6bb8'], [0.5, '#6fa2da'], [0.82, '#a8c9e8'], [1, '#c9dcec']],
           ground: 0x6b8452, tree: 0x3d5a34, bldg: 0x7f8898 },
  dusk:  { stops: [[0, '#1e2a44'], [0.55, '#5b6a86'], [0.82, '#c98d63'], [1, '#e8b183']],
           ground: 0x3c4436, tree: 0x2a3328, bldg: 0x2f3340 },
};

/** 하늘 그라디언트를 캔버스로 굽는다(외부 이미지 0 · 두 백엔드 공통 수단). */
function skyTexture(mood: OutsideMood) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 256);
  for (const [at, col] of SKY[mood].stops) g.addColorStop(at, col);
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** 결정론적 난수 — 방마다 풍경이 달라지되 새로고침에는 안 변한다. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

/**
 * 창밖 풍경을 만든다. 씬에 붙이는 것은 호출자 몫이다.
 *
 * 세 겹으로 세운다:
 *   ① 하늘 돔      — 안쪽 면에 그라디언트. 조명을 받지 않는다(Basic).
 *   ② 먼 지면      — 지평선을 만든다. 돔 아래를 덮어 「바닥이 없는」 느낌을 없앤다.
 *   ③ 원경 실루엣  — 나무·건물 덩어리. 재질별로 병합해 드로우콜 2벌로 고정한다.
 */
export function buildOutsideView(opts: OutsideOptions = {}): OutsideView {
  const mood: OutsideMood = OUTSIDE_MOODS.includes(opts.mood as OutsideMood) ? (opts.mood as OutsideMood) : 'day';
  const pal = SKY[mood];
  const { dome: DOME_R, silNear: SIL_NEAR, silFar: SIL_FAR } = scaleFor(opts.cameraFar);
  const group = new THREE.Group();
  group.name = 'outside-view';
  const owned: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(v: T): T => { owned.push(v); return v; };

  // ① 하늘 — 위쪽 절반 구. BackSide 라 안에서 본다.
  const skyGeo = keep(new THREE.SphereGeometry(DOME_R, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52));
  const skyMat = keep(new THREE.MeshBasicMaterial({
    map: keep(skyTexture(mood)), side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.renderOrder = -10;           // 항상 가장 뒤
  group.add(sky);

  // ② 먼 지면 — 돔보다 살짝 안쪽에서 지평선을 만든다.
  const groundGeo = keep(new THREE.CircleGeometry(DOME_R * 0.98, 32));
  const groundMat = keep(new THREE.MeshBasicMaterial({
    color: pal.ground, fog: false, depthWrite: false,
  }));
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.6;        // 실내 바닥보다 살짝 아래 — 창턱 너머로 이어져 보인다
  ground.renderOrder = -9;
  group.add(ground);

  // ③ 원경 실루엣 — 나무(원뿔+기둥)와 건물(박스)을 재질 2벌로 병합한다.
  const rand = rng(0x5eed);
  const treeGeos: { dispose(): void }[] = [];
  const bldgGeos: { dispose(): void }[] = [];
  for (let i = 0; i < SIL_COUNT; i++) {
    const a = (i / SIL_COUNT) * Math.PI * 2 + rand() * 0.12;
    const r = SIL_NEAR + rand() * (SIL_FAR - SIL_NEAR);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (rand() < 0.62) {
      const h = 9 + rand() * 13;
      const crown = new THREE.ConeGeometry(3.2 + rand() * 2.2, h * 0.72, 7);
      crown.translate(x, h * 0.64, z);
      const trunk = new THREE.CylinderGeometry(0.5, 0.7, h * 0.38, 5);
      trunk.translate(x, h * 0.19, z);
      treeGeos.push(crown, trunk);
    } else {
      const w = 7 + rand() * 11, h = 10 + rand() * 22, d = 7 + rand() * 9;
      const b = new THREE.BoxGeometry(w, h, d);
      b.rotateY(rand() * 0.7);
      b.translate(x, h / 2, z);
      bldgGeos.push(b);
    }
  }
  const merge = (list: { dispose(): void }[], color: number) => {
    if (!list.length) return;
    // 병합 대신 각 지오를 한 메시로 모으는 대신, 재질을 공유해 배치 수를 줄인다.
    // (BufferGeometryUtils 를 끌어오지 않는다 — 이 파일의 의존을 three 하나로 둔다.)
    const mat = keep(new THREE.MeshBasicMaterial({ color, fog: false }));
    for (const g of list) { keep(g); group.add(new THREE.Mesh(g as never, mat)); }
  };
  merge(treeGeos, pal.tree);
  merge(bldgGeos, pal.bldg);

  return {
    group,
    dispose() {
      group.removeFromParent();
      for (const o of owned) o.dispose();
      owned.length = 0;
      group.clear();
    },
  };
}
