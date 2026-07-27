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
import {
  cloudLayout, cloudTint, driftedX, driftedZ, DEFAULT_CLOUDS, CLOUD_FIELD, type CloudSpec,
} from '../decide/sky.js';

/** 안개·클리어색과 **동일해야 하는** 지평선 색. 이 값이 어긋나면 경계선이 보인다. */
export const HORIZON = 0x0b0d12;

/**
 * 하늘 그라디언트 — 디자이너 4단(t=0 천정 → t=1 지평선). 시간대는 **야간 맑음**이다
 * (커밋 `318addf`에서 감독이 오픈월드 기본 하늘로 확정한 값을 world2가 잇는다).
 *
 * 첫 판에서 `SKY_UPPER`가 `--bg-dark`(#14151A) **UI 토큰을 그대로** 쓰고 있었다. UI 다크
 * 배경으로 만든 색이라 애초에 하늘이 될 수 없는 값이었고, 가장 밝은 지점조차 배경색과
 * 채널당 8~9(3.5%)밖에 차이 나지 않아 폰에서 하늘이 배경에 묻혔다.
 *
 * 색상 축도 함께 옮겼다 — 중립 회색이 아니라 인디고/더스티블루다. 밤하늘은 순검정이 아니라
 * 남색으로 지각되므로, 밝기뿐 아니라 색상으로도 "밤"을 말하게 한다.
 */
export const SKY_ZENITH = 0x0d1020;
export const SKY_UPPER = 0x3a5480;  // 최대 밝기 — 배경 대비 휘도 약 27%p
export const SKY_LOWER = 0x262636;
/** 지평선 헤이즈(도시 불빛 산란) — 램프 골드 계열 */
export const HAZE = 0x3a2f28;

/** 태양 — 조명 방향에서 그대로 정규화(임의 재배치 금지) */
export const SUN_DIR = new THREE.Vector3(60, 120, 40).normalize();
export const SUN_CORE = 0xffe9c4;   // DirectionalLight 색과 동일
export const SUN_HALO = 0xc98f5a;

/** 구름 색 — 림은 태양 저채도화, 베이스는 HemisphereLight 지면색 재사용 */
export const CLOUD_RIM = 0xe8c9a0;
export const CLOUD_BASE = 0x1b2030;

/** 기울기 합성용 고정 축 — 매 프레임 새로 만들지 않는다. */
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

/**
 * 구름 배치 파라미터는 `decide/sky.ts`의 `DEFAULT_CLOUDS`가 SSOT다. 배치·색 보간·테스트가
 * 전부 그 하나를 본다 — 여기 값을 다시 적으면 한쪽만 고쳐도 아무도 모른다.
 */
export { DEFAULT_CLOUDS as CLOUD_LAYOUT } from '../decide/sky.js';

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
 * 캔버스를 텍스처로 감싼다. **색공간을 반드시 지정한다.**
 *
 * 빠뜨리면 three가 캔버스 데이터를 선형으로 취급하고 출력 단계에서 sRGB로 다시 인코딩한다.
 * 어두운 값일수록 이 이중 변환이 크게 벌어진다 — 소스 (9,9,12)가 화면에서 (53,53,60) 근처로
 * 나온다(헤드리스 상단 평균 실측 60,60,69로 확인).
 *
 * 밝아지는 것보다 나쁜 건 **계조가 벌어지는 것**이다. 인접 계조 1 차이가 화면에서 여러 계조로
 * 확대되면서 그라디언트의 띠와 캔버스가 자체적으로 섞는 디더가 함께 증폭된다. 감독이 실기기에서
 * 본 "노이즈"가 이것이었고, 같은 오류가 하늘을 3배 밝혀 대비 부족을 가려주고 있기도 했다 —
 * 그래서 이 수정은 팔레트 재조정과 반드시 함께 가야 한다(따로 고치면 하늘이 도로 안 보인다).
 *
 * 밉맵은 끈다. 하늘 돔과 구름은 항상 확대되어 그려지므로 축소용 밉맵 체인이 쓰이지 않는다.
 */
function toTexture(cv: HTMLCanvasElement): THREE.Texture {
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
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
    return toTexture(cv);
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
  return toTexture(cv);
}

const hex = (h: number) => `#${h.toString(16).padStart(6, '0')}`;

/**
 * hex 상수에서 캔버스용 rgba 문자열을 만든다.
 *
 * 알파가 필요한 자리에 `'rgba(36,31,28,0.18)'`처럼 숫자를 손으로 적어 두면 위쪽 상수를 바꿔도
 * 반영되지 않는다 — 실제로 이 파일에서 헤이즈 색이 그렇게 굳어 있었다. 값 미러링 금지(SSOT
 * 경유)는 색에도 그대로 적용된다.
 */
const rgba = (h: number, a: number) =>
  `rgba(${(h >> 16) & 255},${(h >> 8) & 255},${h & 255},${a})`;

/**
 * 하늘 텍스처를 캔버스에 굽는다 — 세로 그라디언트 + 지평선 헤이즈 + 태양(원판·헤일로).
 *
 * ── 왜 셰이더가 아니라 캔버스인가(실기기 사고) ──────────────────────────────
 * 처음에는 `ShaderMaterial`(GLSL)로 그렸다. 헤드리스(WebGL)에서는 잘 보였는데 감독
 * 실기기(iPhone·**WebGPU**)에서 하늘이 통째로 안 보였다. 원인은 three 빌드 자체에 있다 —
 * `three.webgpu.js`에서 `ShaderMaterial`은 **재수출 목록에 한 번 나올 뿐 렌더 경로가 없다**
 * (WebGL 빌드는 22곳에서 처리). WebGPURenderer는 NodeMaterial 기반이라 GLSL을 못 그린다.
 *
 * 이건 렌더러 어댑터를 만든 이유를 하늘에서 스스로 어긴 것이었다. 백엔드 차이는 한 곳에
 * 가두기로 해놓고 백엔드 의존 재질을 그냥 썼다. 캔버스 텍스처는 두 백엔드에서 동일하게
 * 동작하므로 이 축의 분기 자체가 사라진다 — 구름이 이미 쓰던 방식이다.
 *
 * UV 규약: three `SphereGeometry`는 v=1이 북극(위), v=0이 남극이다. 세로 그라디언트는
 * 그 축을 그대로 따르고, 태양은 방향벡터를 (방위각, 고도) → (u, v)로 옮겨 찍는다.
 */
function makeSkyTexture(w = 512, h = 512): THREE.Texture {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return toTexture(cv); // 하늘 없이라도 죽지 않는다

  // 세로 그라디언트. 캔버스 y=0이 텍스처 v=1(천정)이다.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.00, hex(SKY_ZENITH));
  g.addColorStop(0.40, hex(SKY_UPPER));
  g.addColorStop(0.78, hex(SKY_LOWER));
  g.addColorStop(1.00, hex(HORIZON));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 도시 불빛 헤이즈 — 지평선 직전에만 얹고 심에서 다시 안개색으로 수렴한다.
  const hz = ctx.createLinearGradient(0, h * 0.90, 0, h);
  hz.addColorStop(0, rgba(HAZE, 0));
  hz.addColorStop(0.62, rgba(HAZE, 0.24));
  hz.addColorStop(1, rgba(HAZE, 0));
  ctx.fillStyle = hz;
  ctx.fillRect(0, h * 0.90, w, h * 0.10);

  // 태양 — 조명 방향에서 UV를 얻는다(해와 그림자가 어긋나지 않게).
  const el = Math.asin(Math.max(-1, Math.min(1, SUN_DIR.y)));          // 고도
  const az = Math.atan2(SUN_DIR.x, SUN_DIR.z);                          // 방위
  const su = ((az / (Math.PI * 2)) + 0.5) * w;
  const sv = (1 - (el / Math.PI + 0.5)) * h;                            // v=1이 위
  // 하늘 몸통이 밝아진 만큼 헤일로도 함께 올린다 — 안 그러면 태양이 하늘에 묻힌다.
  const halo = ctx.createRadialGradient(su, sv, 0, su, sv, h * 0.22);
  halo.addColorStop(0, rgba(SUN_HALO, 0.46));
  halo.addColorStop(0.45, rgba(SUN_HALO, 0.17));
  halo.addColorStop(1, rgba(SUN_HALO, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
  const core = ctx.createRadialGradient(su, sv, 0, su, sv, h * 0.035);
  core.addColorStop(0, rgba(SUN_CORE, 0.95));
  core.addColorStop(0.7, rgba(SUN_CORE, 0.55));
  core.addColorStop(1, rgba(SUN_CORE, 0));
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, w, h);

  return toTexture(cv);
}

/** 하늘 재질. 백엔드 분기 없음 — 두 렌더러에서 같은 코드가 돈다. */
function makeSkyMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: makeSkyTexture(),
    side: THREE.BackSide,
    depthWrite: false,
    // 안개 함정 — 켜면 돔 전체가 지평선색으로 뭉개진다(디자이너 지적).
    fog: false,
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
  /**
   * 구름 판을 수평으로 눕히는 고정 회전. 매 프레임 구름마다 `new Matrix4()`를 만들면
   * 초당 2,400개가 쓰레기가 된다 — 값이 상수이므로 한 번 만들어 돌려쓴다.
   */
  private readonly _flat = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  /** 구름별 기울기 — 값이 매번 다르므로 재사용 필드에 다시 써넣는다. */
  private readonly _qt = new THREE.Quaternion();

  constructor(parent: THREE.Object3D, getCamera: () => { x: number; z: number }, opts: SkyOptions = {}) {
    this.getCamera = getCamera;
    this.windX = opts.windX ?? 2.2;
    this.windZ = opts.windZ ?? 0.44;
    // field는 구름이 선으로 안 보이게 하는 **실제 보장선**이다(decide/sky.ts 상단 주석).
    // 임의로 키우면 반구 배치가 그대로여도 안전마진이 조용히 깨진다.
    this.field = opts.field ?? CLOUD_FIELD;
    const radius = opts.radius ?? 900;

    this.group.name = 'world2:sky';
    parent.add(this.group);

    this.dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), makeSkyMaterial());
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -1000; // 무엇보다 먼저 — 하늘이 다른 것을 덮지 않게
    this.group.add(this.dome);

    this.specs = cloudLayout({
      ...DEFAULT_CLOUDS,
      count: opts.cloudCount ?? DEFAULT_CLOUDS.count,
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
    // 투명도도 색에 실어 보낸다(cloudTint 주석 참고) — 재질은 끝까지 하나다.
    const tmp = new THREE.Color();
    for (let i = 0; i < this.specs.length; i++) {
      tmp.setHex(cloudTint(
        this.specs[i], CLOUD_BASE, CLOUD_RIM, HORIZON, DEFAULT_CLOUDS.minY, DEFAULT_CLOUDS.maxY,
      ));
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
      //
      // 기울기는 **회전 쪽에 합성한다.** 완성된 행렬 뒤에 회전을 곱하면(T·R·S·Tilt) 비균등
      // 스케일과 회전이 섞여 shear가 생긴다 — 판이 기우는 게 아니라 늘어난다. 실제로
      // 두께 축이 1이 아니라 6.75로 부풀어 있었다. 쿼터니언끼리 합치면 회전은 회전으로만
      // 남고 스케일 축이 온전하다.
      this._q.setFromAxisAngle(this._up, c.ry);
      this._q.multiply(this._qt.setFromAxisAngle(AXIS_X, c.tiltX));
      this._q.multiply(this._qt.setFromAxisAngle(AXIS_Z, c.tiltZ));
      // ⚠ 스케일 축은 **눕힌 뒤 기준**이다.
      //
      // `compose`가 T·R·S를 만들고 그 뒤 `multiply(_flat)`을 하므로 최종은 T·R·S·Flat이고,
      // 오른쪽 곱이라 **정점에는 Flat이 먼저** 적용된다. PlaneGeometry는 XY 평면인데
      // Flat(X축 -90°)이 이를 XZ 평면으로 눕히므로, 판의 두 번째 축은 y가 아니라 z다.
      //
      // 여기에 `(w, h, 1)`을 주면 z가 1배로 남아 판이 **가로 w × 세로 0.5 유닛**이 된다.
      // 실제로 그랬고, 그래서 구름이 화면에서 실선으로 보였다. 앙각을 아무리 높여도
      // 두께가 0.5인 판은 선이다 — 배치를 고쳐도 증상이 그대로였던 이유가 이것이다.
      this._s.set(c.w, 1, c.h);
      this._m.compose(this._p, this._q, this._s);
      // 수평으로 눕히기(X축 -90°)를 회전에 합성한다.
      this._m.multiply(this._flat);
      this.clouds.setMatrixAt(i, this._m);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.group.remove(this.dome, this.clouds);
    this.dome.geometry.dispose();
    const dm = this.dome.material as THREE.MeshBasicMaterial;
    dm.map?.dispose();
    dm.dispose();
    this.clouds.geometry.dispose();
    const m = this.clouds.material as THREE.MeshBasicMaterial;
    m.map?.dispose();
    m.dispose();
    this.clouds.dispose();
    this.group.parent?.remove(this.group);
  }
}
