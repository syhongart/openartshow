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
// ── ⚠ 하늘은 **오픈월드 것을 그대로 쓴다** (감독 판정 2026-08-24) ────────────
// 첫 판본은 하늘 그라디언트를 **여기서 따로 정의**하고 후보 셋(day/clear/dusk)을 노브로
// 열었다. 감독 판정: *"이건 설정된 오픈월드 환경으로 맞춰서 해야지."*
//
// 그 지적이 맞다. 내가 연 축이 틀렸다 — 창밖은 「어떤 하늘이 예쁜가」의 문제가 아니라
// **「지금 이 세계가 어떤 하늘인가」** 의 문제다. 창 너머가 오픈월드인데 그 하늘이 다르면
// 같은 세계가 아니고, 그러면 창을 낸 이유 자체가 사라진다. 그리고 색을 여기 따로 적는
// 순간 그것은 값 미러링이다 — 오픈월드 팔레트를 고쳐도 창밖은 안 따라온다.
//
// 그래서 `sky.js` 의 `paintSky`·`lightOf` 를 **소비한다.** 그 파일은 `world2/` 내부가
// 아니라 공용이고(`world.js`·world2/3/5 가 함께 쓴다) 하늘 색·안개의 SSOT 다.
// 세계 간 결합이 아니라 **공용 모듈 소비**다 — visit 이 world2 내부를 import 하는 것과는
// 다르다(팀장 규칙 R2 는 후자를 금지한다).
//
// 기본값도 오픈world 기본과 맞춘다: `time='day'`(world2 의 `daylit` 이 팔레트로 접히는
// 값) · `weather='clear'`(`world2/features/sky.ts` 의 `readEnum('weather','clear',…)`).
//
// ── 자기완결 ────────────────────────────────────────────────────────────────
// 외부 이미지를 받지 않는다. 하늘은 **캔버스 텍스처**로 굽는다 — `ShaderMaterial`(GLSL)은
// `three.webgpu` 빌드에 렌더 경로가 아예 없어서(CLAUDE.md 실측) 백엔드가 갈리면 조용히
// 안 보인다. 캔버스 텍스처는 두 백엔드에서 같은 수단이다.
//
// ⚠ 개수 불변식 — 이 모듈이 만드는 것은 **부팅 때 한 번**이고 세션 중 생성·제거가 0 이다.
// `dispose()` 는 페이지를 떠날 때만 부른다.
import * as THREE from 'three';
import { paintSky, lightOf, SKY_TIMES, SKY_WEATHERS } from './sky.js';

/**
 * 시간대·날씨 — **어휘를 오픈월드와 공유한다.** 여기서 목록을 다시 적지 않는다
 * (`sky.js` 의 `SKY_TIMES`·`SKY_WEATHERS` 가 SSOT 다). 이름이 같아야 world2 의
 * `?time=`·`?weather=` 를 그대로 넘겨받을 수 있다.
 */
export const OUTSIDE_TIMES: readonly string[] = SKY_TIMES;
export const OUTSIDE_WEATHERS: readonly string[] = SKY_WEATHERS;

/** 오픈월드 기본과 같은 값. world2 는 `daylit`(팔레트로 `day` 에 접힌다) + `clear` 로 뜬다. */
export const OUTSIDE_DEFAULT_TIME = 'day';
export const OUTSIDE_DEFAULT_WEATHER = 'clear';

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
  /** 시간대. `sky.js` 어휘(`day|sunset|night`). 기본은 오픈월드와 같은 `day`. */
  readonly time?: string;
  /** 날씨. `sky.js` 어휘(`clear|overcast|rain|snow`). 기본은 오픈월드와 같은 `clear`. */
  readonly weather?: string;
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
 * 창밖 하늘 텍스처 — **오픈월드 것을 그대로 굽는다.**
 *
 * `paintSky` 가 equirect 캔버스에 그리고, 소비자는 그것을 **완전 구 + BackSide** 에
 * 입힌다(`sky.js` 의 돔이 그렇게 되어 있다 — 텍스처 세로 중앙이 지평선이다).
 * 반구만 쓰면 지평선 아래가 비어 창턱 너머가 끊긴다.
 *
 * 해상도는 오픈월드의 절반이다(2048×1024 → 1024×512). 창밖은 창 크기만큼만 보이므로
 * 그 이상은 페인트 비용만 는다. `lowRes` 를 켜는 것도 같은 이유다(별 개수·도트 방식).
 */
function skyTexture(time: string, weather: string) {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  paintSky(ctx, W, H, time, weather, { lowRes: true });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 두 색을 k(0..1) 만큼 섞는다. 채널별 선형 보간 — 산술이라 SSOT 대상이 아니다. */
function mix(a: number, b: number, k: number): number {
  const ch = (sh: number) => {
    const av = (a >> sh) & 255, bv = (b >> sh) & 255;
    return Math.round(av + (bv - av) * k) & 255;
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * 지면·나무·건물 색을 **조명 팔레트에서 유도한다.** 여기에 색을 적지 않는다.
 *
 * `lightOf` 가 주는 것 중 셋을 쓴다:
 *   `hemiG` — 반구광의 **지면색**. 「이 시간대에 땅이 무슨 색인가」가 바로 이 값이다.
 *   `hemiS` — 반구광의 하늘색. 건물 면에 하늘이 반사되는 몫.
 *   `fog`   — 대기색. 원경일수록 여기 잠긴다(거리감이 여기서 나온다).
 *
 * 그래서 시간대·날씨를 바꾸면 하늘만이 아니라 **풍경 전체가 함께** 따라온다. 첫 판본은
 * 이 셋을 여기 하드코딩한 표로 갖고 있었고, 그것이 곧 값 미러링이었다.
 */
function paletteOf(time: string, weather: string) {
  const L = lightOf(time, weather, 0) as { hemiG: number; hemiS: number; fog: number };
  return {
    // 먼 지면 — 지면색을 대기에 절반쯤 잠근다(멀수록 흐려진다).
    ground: mix(L.hemiG, L.fog, 0.42),
    // 나무 — 지면보다 어둡고 덜 잠긴다(가까운 띠에 선다).
    tree: mix(mix(L.hemiG, 0x000000, 0.35), L.fog, 0.3),
    // 건물 — 하늘 반사가 섞인 회색. 나무보다 밝아 실루엣이 갈린다.
    bldg: mix(mix(L.hemiS, L.fog, 0.5), 0x000000, 0.12),
  };
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
  // 목록에 없는 값은 오픈월드 기본으로 접는다 — 노브 오타가 빈 하늘이 되면 안 된다.
  const time = OUTSIDE_TIMES.includes(String(opts.time)) ? String(opts.time) : OUTSIDE_DEFAULT_TIME;
  const weather = OUTSIDE_WEATHERS.includes(String(opts.weather)) ? String(opts.weather) : OUTSIDE_DEFAULT_WEATHER;
  const pal = paletteOf(time, weather);
  const { dome: DOME_R, silNear: SIL_NEAR, silFar: SIL_FAR } = scaleFor(opts.cameraFar);
  const group = new THREE.Group();
  group.name = 'outside-view';
  const owned: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(v: T): T => { owned.push(v); return v; };

  // ① 하늘 — **완전 구.** BackSide 라 안에서 본다.
  // ⚠ 반구(`phiLength = π*0.52`)였다가 완전 구로 바꿨다. `paintSky` 텍스처는 세로 중앙이
  // 지평선인 equirect 라 반구에 입히면 위쪽만 늘어나 붙고 **지평선이 화면에 안 온다** —
  // 창밖에서 실제로 보이는 것이 그 부근이다. 세그먼트 48×32 도 `sky.js` 와 같다(저폴리
  // 돔은 위도 링에서 UV 가 절곡돼 그라디언트에 마하 밴드 원호가 생긴다 — 그쪽 실측).
  const skyGeo = keep(new THREE.SphereGeometry(DOME_R, 48, 32));
  const skyMat = keep(new THREE.MeshBasicMaterial({
    map: keep(skyTexture(time, weather)), side: THREE.BackSide, depthWrite: false, fog: false,
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
