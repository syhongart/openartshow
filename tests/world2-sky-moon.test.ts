// @vitest-environment jsdom
//
// 달 블룸 — **판정과 집행 양쪽을 함께 본다.**
//
// ── 감독 지시 (2026-07-30) ──────────────────────────────────────────────────
// *"달에 블룸효과 넣어줘. 월드2 만이야"*
//
// ── 무엇이 깨질 수 있는가 ───────────────────────────────────────────────────
// 이 기능은 조용히 실패하는 방식이 둘이고, 둘 다 **화면을 봐야만** 알 수 있다.
//
//   ① **문턱을 못 넘는다** — 발광체가 정상적으로 놓이고 색도 들어갔는데 휘도가 블룸
//      문턱 아래라 아무것도 번지지 않는다. 가로등이 정확히 이렇게 죽어 있었고(감독:
//      *"가로등 똑같은데"*), 코드도 설정도 맞아 보여서 눈으로는 못 잡았다.
//   ② **달이 둘로 보인다** — 발광체가 그림 속 달에서 밀린다. `getSunDir()` 의 달 고도
//      (0.9)를 쓰면 그림(0.848)과 3° 어긋나고, 원반 각반경이 5° 라 절반 넘게 밀린다.
//
// 그래서 순수 판정(`moonGlow`)만 보지 않고 **집행까지 본다** — 계산된 배수가 실제로
// 재질 색에 들어가는가, 메시가 돔의 자식이 되는가, 위치가 그림에서 나오는가. 이 저장소가
// 반복해 뚫린 자리가 정확히 그 경계다(구름 `alpha` 미소비가 같은 형태였다).
//
// ── three 는 스텁이다 ───────────────────────────────────────────────────────
// `sky-moon.ts` 는 `three/webgpu` 를 직접 import 하므로 모듈째 갈아 끼운다
// (`tests/world2-ocean.test.ts` 와 같은 방식). **돌아가는 것은 실제 `sky-moon` 코드**다.
//
// ── 여기서 못 재는 것 ───────────────────────────────────────────────────────
// 정직하게 적는다. 통과가 이 셋을 덮지 않는다.
//
//   · **알파 마스크의 모양** — jsdom 에 `canvas` 패키지가 없어 `getContext('2d')` 가
//     `null` 이다(실행 중 그 경고가 stderr 로 나온다). 코드는 그 경우를 방어하므로
//     나머지 배선은 전부 실제로 돌지만, 그라디언트가 실제로 어떤 프로파일인지는
//     **이 파일이 보는 축이 아니다.**
//   · **블룸이 실제로 번지는가** — 블룸은 WebGPU 전용이고 헤드리스는 WebGL 이다. 여기서
//     검사하는 것은 "문턱을 넘는 값이 재질에 들어갔다" 까지이고, 그 픽셀이 실제로
//     번지는 모습은 **감독 실기기가 유일한 판정**이다.
//   · **달이 화면에서 겹쳐 보이는가** — 방향이 같은 출처에서 나오는 것까지만 본다.
//     구 UV 정합(`azWorld`)이 틀렸다면 그림과 발광체가 **함께** 틀리므로 안 걸린다.

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { moonPlacement } from '../frontend/js/sky.js';
import { relativeLuminance, moonGlow, LAMP_LUMINANCE, LAMP_MAX_GLOW } from '../frontend/js/world2/decide/night.js';
import { BLOOM_THRESHOLD } from '../frontend/js/world2/features/postfx-params.js';

// ── three/webgpu 스텁 ───────────────────────────────────────────────────────

class FakeVector3 {
  constructor(public x = 0, public y = 0, public z = 0) {}
  set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
}

class FakeQuaternion {
  /** 어떤 두 벡터로 불렸는지 그대로 남긴다 — 판이 관찰자를 향하는지 밖에서 본다 */
  from: FakeVector3 | null = null;
  to: FakeVector3 | null = null;
  setFromUnitVectors(a: FakeVector3, b: FakeVector3) { this.from = a; this.to = b; return this; }
}

class FakeColor {
  constructor(public r = 0, public g = 0, public b = 0) {}
  setRGB(r: number, g: number, b: number) { this.r = r; this.g = g; this.b = b; return this; }
}

class FakeTexture {
  colorSpace: unknown = null;
  disposed = false;
  constructor(public image?: unknown) {}
  dispose() { this.disposed = true; }
}

class FakeGeometry {
  disposed = false;
  constructor(public w: number, public h: number) {}
  dispose() { this.disposed = true; }
}

class FakeMaterial {
  color: FakeColor;
  disposed = false;
  constructor(public opts: Record<string, unknown>) {
    this.color = (opts.color as FakeColor) ?? new FakeColor();
  }
  dispose() { this.disposed = true; }
}

class FakeObject3D {
  name = '';
  frustumCulled = true;
  position = new FakeVector3();
  quaternion = new FakeQuaternion();
  children: FakeObject3D[] = [];
  add(o: FakeObject3D) { this.children.push(o); }
  remove(o: FakeObject3D) { this.children = this.children.filter((c) => c !== o); }
}

class FakeMesh extends FakeObject3D {
  constructor(public geometry: FakeGeometry, public material: FakeMaterial) { super(); }
}

vi.mock('three/webgpu', () => ({
  Vector3: FakeVector3,
  Color: FakeColor,
  CanvasTexture: FakeTexture,
  PlaneGeometry: FakeGeometry,
  MeshBasicMaterial: FakeMaterial,
  Mesh: FakeMesh,
  Object3D: FakeObject3D,
  AdditiveBlending: 2,
  NoColorSpace: '',
}));

type MoonMod = typeof import('../frontend/js/world2/systems/sky-moon.js');
let createMoonGlow: MoonMod['createMoonGlow'];

beforeAll(async () => {
  ({ createMoonGlow } = await import('../frontend/js/world2/systems/sky-moon.js'));
});

/** 돔 반경 — 값 자체는 아무래도 좋다. 유도 관계만 본다 */
const R = 520;

function mount() {
  const dome = new FakeObject3D();
  const moon = createMoonGlow(dome as never, R, document, moonPlacement());
  if (!moon) throw new Error('발광체가 만들어지지 않았다 — jsdom 에 document 가 있어야 한다');
  const mesh = dome.children[0] as FakeMesh;
  return { dome, moon, mesh };
}

const lum = (c: FakeColor) => relativeLuminance(c.r, c.g, c.b);

// ── ① 판정 — 발광 배수는 가로등에서 유도된다 ───────────────────────────────

describe('moonGlow — 유도', () => {
  it('가로등 피크와 같은 휘도가 되도록 배수를 정한다', () => {
    // 유도의 정의 그 자체다. 상수를 적어 두는 대신 관계를 검사하므로, 가로등을 바꾸면
    // 달이 저절로 따라오고 이 검사도 계속 참이다.
    const core = 0.5;
    expect(moonGlow(core) * core).toBeCloseTo(LAMP_LUMINANCE * LAMP_MAX_GLOW, 10);
  });

  it('실제 달 코어색에서 나온 피크가 블룸 문턱을 넘는다', () => {
    // **이 기능이 존재하는 이유 그 자체.** 넘지 않으면 발광체는 그냥 조금 밝은 판이고
    // 블룸은 아무 일도 하지 않는다 — 감독 화면에서 "달 똑같은데" 가 된다.
    const p = moonPlacement();
    const core = relativeLuminance(p.core.r, p.core.g, p.core.b);
    expect(core * moonGlow(core)).toBeGreaterThan(BLOOM_THRESHOLD);
  });

  it('코어색이 검정이면 0 — 어떤 배수로도 문턱을 못 넘으므로 발광이 성립하지 않는다', () => {
    expect(moonGlow(0)).toBe(0);
    expect(moonGlow(-1)).toBe(0);
  });

  it('LAMP_LUMINANCE 가 relativeLuminance 와 같은 축이다', () => {
    // 휘도 축을 함수로 뽑으면서 상수 정의가 갈라질 수 있었다. 갈라지면 "가로등은 넘는데
    // 달은 못 넘는" 설명 불가능한 상태가 되므로 여기서 묶어 둔다.
    expect(LAMP_LUMINANCE).toBeCloseTo(relativeLuminance(0xff / 255, 0xc8 / 255, 0x6e / 255), 12);
  });
});

// ── ② 그림 좌표 — 달이 둘로 보이지 않기 위한 것 ────────────────────────────

describe('moonPlacement — 그림 속 달', () => {
  it('단위벡터이고 지평선 위에 있다', () => {
    const { dir } = moonPlacement();
    expect(Math.hypot(dir.x, dir.y, dir.z)).toBeCloseTo(1, 10);
    expect(dir.y).toBeGreaterThan(0);
  });

  it('각반경이 하늘의 일부다 — 0 보다 크고 천정각보다 작다', () => {
    const { angularRadius } = moonPlacement();
    expect(angularRadius).toBeGreaterThan(0);
    expect(angularRadius).toBeLessThan(Math.PI / 2);
  });

  it('코어색이 표시 가능한 범위이고 밝다', () => {
    const { core } = moonPlacement();
    for (const c of [core.r, core.g, core.b]) {
      expect(c).toBeGreaterThan(0);
      expect(c).toBeLessThanOrEqual(1);
    }
    // 달 원반은 하늘에서 가장 밝은 것이다. 어두워지면 위 ①의 문턱 검사가 먼저 깨지지만,
    // 왜 깨졌는지가 여기서 갈린다(색이 어두워진 것인가, 배수가 틀린 것인가).
    expect(relativeLuminance(core.r, core.g, core.b)).toBeGreaterThan(0.5);
  });
});

// ── ③ 집행 — 계산된 값이 실제로 소비되는가 ─────────────────────────────────

describe('createMoonGlow — 배치', () => {
  it('하늘 돔의 자식이 된다 — 돔이 움직여도 그림 속 달과 어긋나지 않는다', () => {
    const { dome, mesh } = mount();
    expect(dome.children).toHaveLength(1);
    expect(mesh).toBeInstanceOf(FakeMesh);
  });

  it('위치가 moonPlacement 의 방향에서 나온다 (getSunDir 의 고정 고도가 아니다)', () => {
    const { mesh } = mount();
    const { dir } = moonPlacement();
    const p = mesh.position;
    const len = Math.hypot(p.x, p.y, p.z);
    // 같은 방향인가 — 내적이 1 이면 완전히 같다. `getSunDir()` 의 달 고도(0.9)로 갈아타면
    // 3° 어긋나 여기서 깨진다. **이 검사가 "달이 둘로 보이는" 실패를 막는 축이다.**
    const dot = (p.x * dir.x + p.y * dir.y + p.z * dir.z) / len;
    expect(dot).toBeCloseTo(1, 10);
  });

  it('돔 안쪽에 놓인다 — 하늘보다 앞이다', () => {
    const { mesh } = mount();
    const p = mesh.position;
    const len = Math.hypot(p.x, p.y, p.z);
    expect(len).toBeGreaterThan(0);
    expect(len).toBeLessThan(R);
  });

  it('판이 원반을 덮되 터무니없이 크지 않다', () => {
    const { mesh } = mount();
    const p = mesh.position;
    const dist = Math.hypot(p.x, p.y, p.z);
    // `PlaneGeometry(2r, 2r)` 이므로 한 변의 절반이 판 반경이다.
    const halfAngle = Math.atan((mesh.geometry.w / 2) / dist);
    const { angularRadius } = moonPlacement();
    // 원반보다 작으면 코어를 못 덮어 밝은 점이 원반 안에 갇힌다.
    expect(halfAngle).toBeGreaterThan(angularRadius);
    // 두 배를 넘으면 달 주변이 통째로 뜬다 — 감독이 블룸 반경에 대해 *"크기 줄이자"*
    // 라고 했던 그 실패다. 유도값을 여기 다시 적지 않고 **범위**로 묶는다.
    expect(halfAngle).toBeLessThan(angularRadius * 2);
  });

  it('판이 관찰자(돔 중심)를 향한다', () => {
    const { mesh } = mount();
    const { dir } = moonPlacement();
    const q = mesh.quaternion;
    expect(q.from).not.toBeNull();
    // 평면의 기본 법선 (0,0,1) 을 관찰자 쪽(−dir)으로 돌린다.
    expect([q.from!.x, q.from!.y, q.from!.z]).toEqual([0, 0, 1]);
    expect(q.to!.x).toBeCloseTo(-dir.x, 12);
    expect(q.to!.y).toBeCloseTo(-dir.y, 12);
    expect(q.to!.z).toBeCloseTo(-dir.z, 12);
  });

  it('가산합성이고 깊이를 쓰지 않으며 안개를 안 탄다', () => {
    const { mesh } = mount();
    const o = mesh.material.opts;
    // 더하기여야 하늘 텍스처의 달을 **덮지 않고 밝힌다**. 밀려도 최악이 "달 옆이 밝다" 다.
    expect(o.blending).toBe(2);
    expect(o.depthWrite).toBe(false);
    // 안개는 60.8m 에서 모든 것을 덮는다. 타면 달이 안개색이 된다.
    expect(o.fog).toBe(false);
    expect(o.transparent).toBe(true);
  });

  it('컬링을 끈다 — 시야에 들고 나며 드로우콜이 흔들리면 개수 판정의 잡음이 된다', () => {
    const { mesh } = mount();
    expect(mesh.frustumCulled).toBe(false);
  });

  it('문서가 없으면 만들지 않는다 — 하늘은 문서 없이도 성립한다', () => {
    const dome = new FakeObject3D();
    expect(createMoonGlow(dome as never, R, null, moonPlacement())).toBeNull();
    expect(dome.children).toHaveLength(0);
  });
});

// ── ④ 집행 — 밤에만 밝다 ───────────────────────────────────────────────────

describe('createMoonGlow — 시간대', () => {
  it('밤(1)에 재질 색의 휘도가 블룸 문턱을 넘는다', () => {
    // **판정과 집행을 잇는 검사.** `moonGlow()` 가 아무리 옳은 값을 내도 재질에 안
    // 들어가면 화면은 그대로다 — 그 경계가 이 저장소가 반복해 뚫린 자리다.
    const { moon, mesh } = mount();
    moon.setNightness(1);
    expect(lum(mesh.material.color)).toBeGreaterThan(BLOOM_THRESHOLD);
  });

  it('낮(0)에는 색이 0 — 가산합성이라 화면에 아무 영향이 없다', () => {
    const { moon, mesh } = mount();
    moon.setNightness(1);
    moon.setNightness(0);
    expect(mesh.material.color.r).toBe(0);
    expect(mesh.material.color.g).toBe(0);
    expect(mesh.material.color.b).toBe(0);
  });

  it('메시는 낮에도 씬에 남는다 — 재우면 밤에 첫 렌더 계단이 난다', () => {
    // `systems/sky.ts` 주석의 그 사고다: 재워둔 메시는 렌더 목록에 안 올라 GPU 자원이
    // 아예 없고, 처음 켜는 순간 지오·텍스처·파이프라인이 한꺼번에 생긴다
    // (실기기 pipeline 31→33 계단). 색을 0 으로 내리는 것이 그것을 피하는 방법이다.
    const { dome, moon } = mount();
    moon.setNightness(0);
    expect(dome.children).toHaveLength(1);
  });

  it('노을(0.4)은 밤보다 어둡고 낮보다 밝다', () => {
    const { moon, mesh } = mount();
    moon.setNightness(1);
    const night = lum(mesh.material.color);
    moon.setNightness(0.4);
    const dusk = lum(mesh.material.color);
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(night);
  });

  it('범위 밖 값은 물린다', () => {
    const { moon, mesh } = mount();
    moon.setNightness(5);
    const hi = lum(mesh.material.color);
    moon.setNightness(1);
    expect(lum(mesh.material.color)).toBeCloseTo(hi, 12);
    moon.setNightness(-3);
    expect(mesh.material.color.r).toBe(0);
  });

  it('색조는 달 코어색을 따른다 — 흰 판이 아니다', () => {
    const { moon, mesh } = mount();
    moon.setNightness(1);
    const c = mesh.material.color;
    const { core } = moonPlacement();
    // 채널 비율이 코어색과 같아야 노란 달이 노랗게 번진다.
    expect(c.g / c.r).toBeCloseTo(core.g / core.r, 10);
    expect(c.b / c.r).toBeCloseTo(core.b / core.r, 10);
  });
});

// ── ⑤ 배선 — 어댑터가 그림 좌표를 넘기는가 ─────────────────────────────────

describe('systems/sky.ts 배선', () => {
  it('발광체에 moonPlacement() 를 넘긴다 — getSunDir() 이 아니다', () => {
    // 위 ③의 방향 검사는 **테스트가 넘긴 값**을 확인하므로, 어댑터가 무엇을 넘기는지는
    // 못 본다. 거기가 정확히 이 저장소가 반복해 뚫린 자리다(판정은 맞는데 집행이 다른
    // 값을 쓴다). 소스에서 그 한 줄을 직접 본다.
    // jsdom 환경이라 `import.meta.url` 이 파일 URL 이 아니다 — cwd(프로젝트 루트)에서 연다.
    const src = readFileSync(join(process.cwd(), 'frontend/js/world2/systems/sky.ts'), 'utf8');
    // 주석에 걸리지 않게 코드 줄만 본다. 호출은 한 줄에 있다.
    const call = src.split('\n').find((l) => !l.trim().startsWith('//') && l.includes('createMoonGlow('));
    expect(call, 'createMoonGlow 호출이 없다 — 달 발광체가 배선에서 빠졌다').toBeTruthy();
    expect(call).toContain('moonPlacement()');
    // `getSunDir()` 은 달 고도가 0.9 고정이라 그림(0.848)과 어긋난다. 쓰면 달이 둘이 된다.
    expect(call).not.toContain('getSunDir');
  });
});

// ── ⑥ 진단과 정리 ──────────────────────────────────────────────────────────

describe('createMoonGlow — 진단·정리', () => {
  it('진단이 문턱 비교에 필요한 값을 싣는다', () => {
    const { moon } = mount();
    moon.setNightness(1);
    const d = moon.diagnostics();
    // `postfx` 의 `lampPeak` 과 같은 축이라 나란히 놓고 읽을 수 있어야 한다.
    expect(d.peak as number).toBeGreaterThan(BLOOM_THRESHOLD);
    expect(d.nightness).toBe(1);
    expect(d.dist as number).toBeLessThan(R);
  });

  it('dispose 가 돔에서 떼고 자원을 반납한다', () => {
    const { dome, moon, mesh } = mount();
    moon.dispose();
    expect(dome.children).toHaveLength(0);
    expect(mesh.geometry.disposed).toBe(true);
    expect(mesh.material.disposed).toBe(true);
    expect((mesh.material.opts.map as FakeTexture).disposed).toBe(true);
  });
});
