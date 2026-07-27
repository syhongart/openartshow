// world2/systems/sky.ts — 하늘 돔 + 구름. 디자이너 아트 디렉션(2026-07-27) 구현.
//
// ── 드로우콜 예산 ────────────────────────────────────────────────────────────
// 스카이돔 1 + 구름 InstancedMesh 1 = **2 드로우콜**. 둘 다 부팅 때 만들고 세션 내내
// 개수가 변하지 않는다. 태양은 별도 지오메트리가 아니라 돔 셰이더 안에서 그린다 —
// 원판을 메시로 두면 드로우콜이 하나 더 늘고, 그 하나가 상수 규약의 예외가 된다.
//
// ── 안개 함정(디자이너 지적) ─────────────────────────────────────────────────
// three의 `scene.fog`는 카메라 거리 기반이다. 스카이돔 반경(수백 유닛)이 안개 far(≈61)보다
// 훨씬 크므로, 돔이 씬 안개에 걸리면 **전 영역이 지평선색으로 뭉개져 그라디언트가 아예
// 보이지 않는다.** 그래서 하늘·구름 재질은 `fog=false`로 안개를 끄고, "안개와 이어짐"은
// 지평선 색을 안개색과 **동일한 hex로 맞추는 방식**으로만 만든다.

import * as THREE from 'three/webgpu';
import type { FrameCtx, System } from '../kernel.js';
import { cloudLayout, driftedX, driftedZ, DEFAULT_CLOUDS, type CloudSpec } from '../decide/sky.js';

/** 안개·클리어색과 **동일해야 하는** 지평선 색. 이 값이 어긋나면 경계선이 보인다. */
export const HORIZON = 0x0b0d12;

/** 하늘 그라디언트 — 디자이너 4단(t=0 천정 → t=1 지평선) */
export const SKY_ZENITH = 0x09090c;
export const SKY_UPPER = 0x14151a;  // --bg-dark 토큰 그대로
export const SKY_LOWER = 0x0f1015;
/** 지평선 헤이즈(도시 불빛 산란) — 램프 골드 계열, 최대 18% */
export const HAZE = 0x241f1c;

/** 태양 — 조명 방향에서 그대로 정규화(임의 재배치 금지) */
export const SUN_DIR = new THREE.Vector3(60, 120, 40).normalize();
export const SUN_CORE = 0xffe9c4;   // DirectionalLight 색과 동일
export const SUN_HALO = 0xc98f5a;

/** 구름 색 — 림은 태양 저채도화, 베이스는 HemisphereLight 지면색 재사용 */
export const CLOUD_RIM = 0xe8c9a0;
export const CLOUD_BASE = 0x1b2030;

export interface SkyOptions {
  /** 돔 반경. 카메라 far(1200)보다 작아야 잘리지 않는다 */
  radius?: number;
  cloudCount?: number;
  /** 바람 벡터(유닛/초) */
  windX?: number;
  windZ?: number;
  /** 구름이 도는 셸의 지름 */
  field?: number;
}

/**
 * 절차적 구름 알파 텍스처. 외부 이미지 0(자기완결 원칙).
 *
 * 완벽한 원 하나는 "UI 그라디언트"처럼 보여 구름감이 없다. 부드러운 방사 그라디언트
 * 여러 개를 겹쳐 비대칭 실루엣을 만든다. 색은 굽지 않는다 — instanceColor로 런타임에
 * 정하므로 재질 하나로 림/베이스 톤을 모두 낸다(파이프라인 조합 불변).
 */
function makeCloudTexture(size = 256): THREE.Texture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  if (!ctx) {
    // 2D 컨텍스트를 못 얻는 환경이 실제로 있다(메모리 압박·헤드리스 일부).
    // 구름 없이라도 하늘은 떠야 하므로 빈 텍스처로 물러선다.
    return new THREE.CanvasTexture(cv);
  }
  ctx.clearRect(0, 0, size, size);
  const blobs = [
    { x: 0.42, y: 0.56, r: 0.30, a: 0.80 },
    { x: 0.60, y: 0.50, r: 0.26, a: 0.72 },
    { x: 0.30, y: 0.52, r: 0.22, a: 0.66 },
    { x: 0.52, y: 0.42, r: 0.20, a: 0.60 },
    { x: 0.70, y: 0.58, r: 0.16, a: 0.50 },
    { x: 0.22, y: 0.60, r: 0.14, a: 0.44 },
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(
      b.x * size, b.y * size, 0,
      b.x * size, b.y * size, b.r * size,
    );
    g.addColorStop(0, `rgba(255,255,255,${b.a})`);
    g.addColorStop(0.65, `rgba(255,255,255,${b.a * 0.45})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

const hexToVec = (h: number) => new THREE.Color(h);

/**
 * 하늘 셰이더. 세로 그라디언트 + 지평선 헤이즈 + 태양(원판·헤일로)을 한 번에 그린다.
 * WebGL/WebGPU 양쪽에서 도는 GLSL은 `ShaderMaterial`로 쓴다.
 */
function makeSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    // 안개 함정 — 켜면 돔 전체가 지평선색으로 뭉개진다.
    fog: false,
    uniforms: {
      uZenith: { value: hexToVec(SKY_ZENITH) },
      uUpper: { value: hexToVec(SKY_UPPER) },
      uLower: { value: hexToVec(SKY_LOWER) },
      uHorizon: { value: hexToVec(HORIZON) },
      uHaze: { value: hexToVec(HAZE) },
      uSunDir: { value: SUN_DIR.clone() },
      uSunCore: { value: hexToVec(SUN_CORE) },
      uSunHalo: { value: hexToVec(SUN_HALO) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uZenith, uUpper, uLower, uHorizon, uHaze, uSunCore, uSunHalo;
      uniform vec3 uSunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        // t: 0=천정, 1=지평선. 지평선 아래도 지평선색으로 둔다(바닥은 지면이 덮는다).
        float t = clamp(1.0 - d.y, 0.0, 1.0);
        vec3 col = mix(uZenith, uUpper, smoothstep(0.0, 0.40, t));
        col = mix(col, uLower, smoothstep(0.40, 0.78, t));
        col = mix(col, uHorizon, smoothstep(0.78, 1.0, t));
        // 도시 불빛 헤이즈 — 방위각 독립, 지평선 직전에만 얹고 심에서 다시 수렴한다.
        float haze = smoothstep(0.90, 0.985, t) * (1.0 - smoothstep(0.985, 1.0, t));
        col = mix(col, uHaze, haze * 0.18);
        // 태양 — 원판과 헤일로. 별도 지오메트리 없이 방향 내적으로만 그린다.
        float c = max(dot(d, normalize(uSunDir)), 0.0);
        float core = smoothstep(0.99926, 0.99954, c);       // 반경 ≈2.2°
        float halo = pow(smoothstep(0.974, 1.0, c), 2.0);   // 반경 ≈13°
        col += uSunHalo * halo * 0.25;                       // 밝기 상한(글로우 남용 방지)
        col = mix(col, uSunCore, core * 0.9);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * 하늘 + 구름. 부팅 때 한 번 만들고, 매 프레임 구름 행렬만 갱신한다.
 * 돔은 카메라를 따라다닌다 — 걸어가도 하늘 끝에 닿지 않게.
 */
export class SkySystem implements System {
  readonly name = 'sky';

  private readonly group = new THREE.Group();
  private readonly dome: THREE.Mesh;
  private readonly clouds: THREE.InstancedMesh;
  private readonly specs: CloudSpec[];
  private readonly windX: number;
  private readonly windZ: number;
  private readonly field: number;
  private readonly getCamera: () => { x: number; z: number };
  private elapsed = 0;

  private readonly _m = new THREE.Matrix4();
  private readonly _q = new THREE.Quaternion();
  private readonly _p = new THREE.Vector3();
  private readonly _s = new THREE.Vector3();
  private readonly _up = new THREE.Vector3(0, 1, 0);

  constructor(parent: THREE.Object3D, getCamera: () => { x: number; z: number }, opts: SkyOptions = {}) {
    this.getCamera = getCamera;
    this.windX = opts.windX ?? 2.2;
    this.windZ = opts.windZ ?? 0.44;
    this.field = opts.field ?? 1200;
    const radius = opts.radius ?? 900;

    this.group.name = 'world2:sky';
    parent.add(this.group);

    this.dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), makeSkyMaterial());
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -1000; // 무엇보다 먼저 — 하늘이 다른 것을 덮지 않게
    this.group.add(this.dome);

    this.specs = cloudLayout({
      ...DEFAULT_CLOUDS,
      count: opts.cloudCount ?? 40,
      minY: 160, maxY: 260,     // 디자이너 값
      minSize: 60, maxSize: 140,
      field: this.field,
    });

    const cloudMat = new THREE.MeshBasicMaterial({
      map: makeCloudTexture(),
      transparent: true,
      depthWrite: false,
      fog: false,               // 안개 함정 — 구름도 마찬가지다
      side: THREE.DoubleSide,
    });
    this.clouds = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), cloudMat, this.specs.length);
    this.clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = -900;
    this.clouds.name = 'world2:clouds';

    // 색은 재질이 아니라 instanceColor로 준다 — 파이프라인 조합을 늘리지 않는다.
    const rim = new THREE.Color(CLOUD_RIM);
    const baseC = new THREE.Color(CLOUD_BASE);
    const tmp = new THREE.Color();
    for (let i = 0; i < this.specs.length; i++) {
      // 높이 뜬 구름일수록 햇빛을 더 받은 인상 — 림 쪽으로 기울인다.
      const t = (this.specs[i].y - 160) / Math.max(1, 260 - 160);
      tmp.copy(baseC).lerp(rim, 0.35 + t * 0.4);
      this.clouds.setColorAt(i, tmp);
    }
    if (this.clouds.instanceColor) this.clouds.instanceColor.needsUpdate = true;
    this.group.add(this.clouds);
  }

  update(ctx: FrameCtx): void {
    if (ctx.hidden) return;
    this.elapsed += ctx.dt;
    const cam = this.getCamera();

    // 돔은 카메라를 따라다닌다(y는 고정 — 올려다보는 각도가 변하면 어색하다).
    this.dome.position.set(cam.x, 0, cam.z);

    for (let i = 0; i < this.specs.length; i++) {
      const c = this.specs[i];
      const x = driftedX(c.x, this.elapsed, this.windX, cam.x, this.field);
      const z = driftedZ(c.z, this.elapsed, this.windZ, cam.z, this.field);
      this._p.set(x, c.y, z);
      // 빌보드처럼 눕힌다 — 아래에서 올려다보므로 수평면에 가깝게 두고 살짝 기울인다.
      this._q.setFromAxisAngle(this._up, c.ry);
      this._s.set(c.w, c.h, 1);
      this._m.compose(this._p, this._q, this._s);
      // 수평으로 눕히기(X축 -90°)를 회전에 합성한다.
      this._m.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
      this.clouds.setMatrixAt(i, this._m);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.group.remove(this.dome, this.clouds);
    this.dome.geometry.dispose();
    (this.dome.material as THREE.Material).dispose();
    this.clouds.geometry.dispose();
    const m = this.clouds.material as THREE.MeshBasicMaterial;
    m.map?.dispose();
    m.dispose();
    this.clouds.dispose();
    this.group.parent?.remove(this.group);
  }
}
