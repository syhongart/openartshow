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
  /** 낮/저녁. 기본 'day'. */
  readonly mood?: 'day' | 'dusk';
}

// 돔 반지름. 방(최대 28×18m)보다 충분히 크되, 원경이 「멀다」고 읽히는 거리다.
// 너무 가까우면 창을 지나칠 때 하늘이 따라 도는 것이 보이고, 너무 멀면 실루엣이 점이 된다.
const DOME_R = 220;
// 원경 실루엣이 서는 띠. 지평선 바로 앞이라야 「저 멀리」로 읽힌다.
const SIL_NEAR = 95;
const SIL_FAR = 165;
// 실루엣 개수 — 드로우콜은 재질별 1벌로 병합되므로 개수가 아니라 정점 수만 는다.
const SIL_COUNT = 46;

/** 하늘 그라디언트를 캔버스로 굽는다(외부 이미지 0 · 두 백엔드 공통 수단). */
function skyTexture(mood: 'day' | 'dusk') {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 256);
  if (mood === 'dusk') {
    g.addColorStop(0.00, '#1e2a44');
    g.addColorStop(0.55, '#5b6a86');
    g.addColorStop(0.82, '#c98d63');
    g.addColorStop(1.00, '#e8b183');
  } else {
    g.addColorStop(0.00, '#4b7fc4');
    g.addColorStop(0.52, '#9dc0e6');
    g.addColorStop(0.86, '#dbe7f2');
    g.addColorStop(1.00, '#eef2f4');
  }
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
  const mood = opts.mood === 'dusk' ? 'dusk' : 'day';
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
    color: mood === 'dusk' ? 0x3c4436 : 0x6f8258, fog: false, depthWrite: false,
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
  merge(treeGeos, mood === 'dusk' ? 0x2a3328 : 0x47603c);
  merge(bldgGeos, mood === 'dusk' ? 0x2f3340 : 0x8d93a0);

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
