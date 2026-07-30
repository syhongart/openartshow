// @vitest-environment jsdom
//
// 수면 기능 테스트.
//
// ── 왜 이 파일이 필요한가 ────────────────────────────────────────────────────
// 감독이 요구한 것은 *"복셀은 물이 살랑살랑 진짜 물 느낌이 나"* 였다. 그 처방은 **노멀맵
// 두 장을 서로 다른 방향으로 흘리는 것**이고, 흘리는 일은 `system.update`가 한다.
//
// 여기가 정확히 이 프로젝트가 반복해 뚫린 자리다 — **판정과 집행의 경계.** 텍스처를 굽는
// 코드도, 흐름 속도 상수도 각각은 멀쩡한데 `update`가 `offset`을 안 만지면 물은 그냥
// 멈춰 있다. 그리고 그 사실은 어느 단위 테스트에도 안 걸리고, 눈으로 봐야만 알 수 있다.
// (구름 `alpha` 미소비가 똑같은 형태였다 — 순수 함수 안에서만 참인 테스트를 걸어두고
// 통합 지점은 아무도 안 봤다.)
//
// ── 어떻게 three 없이 도는가 ────────────────────────────────────────────────
// `ocean.ts`는 `three/webgpu`를 직접 import 하므로(파츠의 `asset(T)` 주입과 다르다)
// 모듈째 스텁으로 갈아 끼운다. 그래도 **돌아가는 것은 실제 ocean 코드**다 — 실제로 씬에
// 무엇을 넣는지, update가 무엇을 만지는지 그대로 관찰한다.

import { describe, it, expect, vi, beforeAll } from 'vitest';

/** 텍스처 스텁 — 관찰 대상은 `offset`과 `repeat`뿐이다 */
class FakeTexture {
  // 실제 `CanvasTexture` 처럼 원본 캔버스를 들고 있는다. 윤슬 검사가 이 캔버스에 남은
  // G채널 표본(`_g`)을 읽어 **점이 실제로 구워졌는지**를 본다 — 들고 있지 않으면
  // `engraveSparkle` 호출 누락을 밖에서 확인할 방법이 없다.
  constructor(public image?: unknown) {}
  offset = { x: 0, y: 0, set(x: number, y: number) { this.x = x; this.y = y; }, copy(o: { x: number; y: number }) { this.x = o.x; this.y = o.y; } };
  repeat = { x: 1, y: 1, set(x: number, y: number) { this.x = x; this.y = y; } };
  wrapS = 0;
  wrapT = 0;
  disposed = false;
  dispose() { this.disposed = true; }
}

class FakeGeometry {
  disposed = false;
  constructor(public w: number, public h: number) {}
  rotateX() { return this; }
  dispose() { this.disposed = true; }
}

class FakeMaterial {
  disposed = false;
  constructor(public opts: Record<string, unknown>) {}
  dispose() { this.disposed = true; }
}

class FakeMesh {
  position = { y: 0 };
  castShadow = false;
  receiveShadow = false;
  frustumCulled = true;
  renderOrder = 0;
  name = '';
  constructor(public geometry: unknown, public material: unknown) {}
}

vi.mock('three/webgpu', () => ({
  PlaneGeometry: FakeGeometry,
  MeshStandardMaterial: FakeMaterial,
  Mesh: FakeMesh,
  CanvasTexture: FakeTexture,
  RepeatWrapping: 1000,
  Vector2: class { constructor(public x: number, public y: number) {} },
}));

beforeAll(() => {
  // jsdom 은 네이티브 canvas 없이 `getContext('2d')`로 null 을 준다. 노멀맵을 굽는 코드가
  // 끝까지 도는 것만 보면 되므로 필요한 호출만 채운다.
  // 윤슬 검사를 위해 `putImageData` 가 **G채널을 캔버스에 남긴다.** 빈 함수로 두면
  // "무엇이 실제로 구워졌는가" 를 밖에서 볼 길이 없고, `engraveSparkle` 호출 누락이
  // 테스트를 통과한다 — 판정과 집행 사이의 그 구멍이 이 프로젝트의 상시 위험이다.
  const mkCtx = (canvas: { _g?: number[] }) => ({
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData(img: { data: Uint8ClampedArray }) {
      const g: number[] = [];
      for (let i = 1; i < img.data.length; i += 4) g.push(img.data[i]);
      canvas._g = g;
    },
  });
  (HTMLCanvasElement.prototype as unknown as { getContext: (t: string) => unknown }).getContext =
    function (this: { _g?: number[] }) { return mkCtx(this); };
});

const { oceanFeature, waveHeight } = await import('../frontend/js/world2/features/ocean.js');
const { RIVER_Y, SEA_Y, SEABED_Y, WATER_DEPTH } = await import('../frontend/js/world2/decide/water.js');

interface Added { name: string; position: { y: number }; material: FakeMaterial; renderOrder: number; frustumCulled: boolean; castShadow: boolean }

function mount() {
  const added: Added[] = [];
  const removed: Added[] = [];
  const env = {
    scene: { add: (m: Added) => added.push(m), remove: (m: Added) => removed.push(m) },
    player: { position: { x: 0, z: 0 } },
    doc: document,
    cell: 32,
  };
  // 실제 Feature 계약 전체를 만들지 않는다 — ocean 이 쓰는 것만 준다.
  const inst = oceanFeature.create(env as never)!;
  return { inst, added, removed };
}

describe('waveHeight — 타일이 이어진다', () => {
  it('u·v 가 1 늘어도 같은 값 — 격자 솔기가 생기지 않는다', () => {
    for (const t of [0, 0.13, 0.37, 0.62, 0.91]) {
      expect(waveHeight(0, t)).toBeCloseTo(waveHeight(1, t), 9);
      expect(waveHeight(t, 0)).toBeCloseTo(waveHeight(t, 1), 9);
    }
  });

  it('평평하지 않다 — 물결이 실제로 있다', () => {
    const vals = [];
    for (let i = 0; i < 40; i++) vals.push(waveHeight(i / 40, (i * 7 % 40) / 40));
    expect(Math.max(...vals) - Math.min(...vals)).toBeGreaterThan(0.5);
  });
});

describe('수면 조립 — 개수 불변식', () => {
  it('씬에 정확히 셋을 넣는다 — 드로우콜 +3', () => {
    // 강이 셋째 판으로 늘었다(감독 지시 2026-07-30: 강 −0.5 / 바다 −1.0). 재질·지오는
    // 공유하므로 늘어난 것은 드로우콜 하나뿐이다.
    const { added } = mount();
    expect(added.map((m) => m.name).sort()).toEqual(['ocean', 'river', 'seabed']);
  });

  it('바다와 강이 재질·지오를 공유한다 — 물빛이 두 곳에 적히면 미러링이다', () => {
    const { added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    const river = added.find((m) => m.name === 'river')!;
    // 같은 물이다. 재질을 따로 만들면 색·윤슬·불투명도가 두 곳에서 정해진다.
    expect(river.material).toBe(sea.material);
  });

  it('해저가 수면보다 아래다 — 뒤집히면 물이 안 비친다', () => {
    const { added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    const bed = added.find((m) => m.name === 'seabed')!;
    expect(bed.position.y).toBe(SEABED_Y);
    expect(sea.position.y).toBe(SEA_Y);
    expect(bed.position.y).toBeLessThan(sea.position.y);
    // 수면이 나중에 그려져야 해저 위에 겹친다
    expect(sea.renderOrder).toBeGreaterThan(bed.renderOrder);
  });

  // ── 판정/집행 경계 (팀장 조건 7) ──────────────────────────────────────────
  // 상수를 둘로 쪼갰으므로 **각 상수가 올바른 판에 꽂히는가**가 새 사각이다. 두 값을
  // 맞바꿔 꽂아도 "물이 두 층으로 있다" 는 사실은 그대로라 위 단언들이 다 통과한다 —
  // 그래서 어느 판이 어느 높이인지를 직접 본다.
  it('강 판이 RIVER_Y · 바다 판이 SEA_Y 다 — 두 상수를 맞바꿔 꽂는 것을 잡는다', () => {
    const { added } = mount();
    expect(added.find((m) => m.name === 'river')!.position.y).toBe(RIVER_Y);
    expect(added.find((m) => m.name === 'ocean')!.position.y).toBe(SEA_Y);
  });

  it('강이 바다보다 높다 — 강물이 바다로 흘러나가는 방향', () => {
    // 감독 지시가 강 −0.5 / 바다 −1.0 이므로 이 관계가 뒤집히면 지시 위반이다.
    // 값을 여기 다시 적지 않는다 — 관계만 본다.
    expect(RIVER_Y).toBeGreaterThan(SEA_Y);
    const { added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    const river = added.find((m) => m.name === 'river')!;
    expect(river.position.y).toBeGreaterThan(sea.position.y);
    // 위에 있는 판이 나중에 그려져야 겹침 정렬이 맞는다
    expect(river.renderOrder).toBeGreaterThan(sea.renderOrder);
  });

  it('둘 다 지면(y=0)보다 낮다 — 육지가 물을 덮어야 물 구멍이 성립한다', () => {
    expect(RIVER_Y).toBeLessThan(0);
    expect(SEA_Y).toBeLessThan(0);
  });

  it('해저를 바다 수면에서 유도한다 — 실측치를 적어두지 않았다', () => {
    // 예전에는 `-2.9` 를 직접 적고 주석에 "수면보다 2.4m 아래" 라고 썼다. 수면이 바뀌자
    // 그 유도가 거짓이 됐다(실제 1.9m). 산술로 바꿨으므로 수면을 옮기면 해저가 따라온다.
    expect(SEABED_Y).toBeCloseTo(SEA_Y - WATER_DEPTH, 10);
  });

  it('수면이 반투명이다 — 불투명하면 바닥이 안 비쳐 물로 안 읽힌다', () => {
    const { added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    expect(sea.material.opts.transparent).toBe(true);
    expect(sea.material.opts.opacity as number).toBeLessThan(1);
    expect(sea.material.opts.opacity as number).toBeGreaterThan(0.4);
  });

  it('그림자 패스를 만들지 않는다 — 드로우콜이 넷이 되면 안 된다', () => {
    const { added } = mount();
    for (const m of added) expect(m.castShadow).toBe(false);
  });

  it('프러스텀 컬링을 끈다 — 판이 커서 통째로 사라질 수 있다', () => {
    const { added } = mount();
    for (const m of added) expect(m.frustumCulled).toBe(false);
  });

  it('DOM 이 없으면 켜지 않는다 — 조립부가 물을 몰라도 된다', () => {
    expect(oceanFeature.create({ doc: null } as never)).toBeNull();
  });
});

// ── 여기가 이 파일의 핵심이다 ────────────────────────────────────────────────
describe('살랑임 — update 가 실제로 물결을 흘린다', () => {
  const flow = () => {
    const { inst, added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    const norm = sea.material.opts.normalMap as FakeTexture;
    const rough = sea.material.opts.roughnessMap as FakeTexture;
    const map = sea.material.opts.map as FakeTexture;
    return { inst, norm, rough, map };
  };

  it('시간이 지나면 노멀맵 offset 이 움직인다 — 안 움직이면 물이 멈춰 있다', () => {
    const { inst, norm } = flow();
    const before = { ...norm.offset };
    inst.system!.update({ dt: 1 } as never);
    expect(norm.offset.x !== before.x || norm.offset.y !== before.y).toBe(true);
  });

  it('두 층이 서로 다른 방향으로 흐른다 — 같으면 흐르는 벽지가 된다', () => {
    const { inst, norm, rough } = flow();
    inst.system!.update({ dt: 4 } as never);
    // 방향 벡터가 평행하지 않아야 한다(외적 ≠ 0)
    const cross = norm.offset.x * rough.offset.y - norm.offset.y * rough.offset.x;
    expect(Math.abs(cross)).toBeGreaterThan(1e-9);
  });

  it('밝기 무늬가 노멀맵 층과 함께 간다 — 따로 놀면 무늬와 빛이 어긋난다', () => {
    const { inst, norm, map } = flow();
    inst.system!.update({ dt: 3 } as never);
    expect(map.offset.x).toBeCloseTo(norm.offset.x, 12);
    expect(map.offset.y).toBeCloseTo(norm.offset.y, 12);
  });

  // 진단은 **검증을 위해 만든 값**이라 스스로도 검증돼야 한다. 헤드리스 스모크가 물결을
  // 두 번 연속 "측정 불가"로 남겨서 이 필드를 신설했는데, 그게 텍스처가 아니라 내부
  // 시간값을 되돌려주면 "계산은 도는데 텍스처엔 안 꽂힌 상태"를 통과시킨다 — 그러면
  // 측정 지점을 만든 의미가 정확히 반대로 뒤집힌다.
  it('진단이 텍스처의 실제 offset 을 내보낸다 — 계산값을 되돌려주면 못 잡는다', () => {
    const { inst, norm, rough } = flow();
    inst.system!.update({ dt: 2 } as never);
    const d = inst.diagnostics!() as { flowA: number[]; flowB: number[] };
    expect(d.flowA).toEqual([norm.offset.x, norm.offset.y]);
    expect(d.flowB).toEqual([rough.offset.x, rough.offset.y]);
    // 멈춘 물과 구별돼야 관측에 쓸모가 있다
    expect(Math.abs(d.flowA[0]) + Math.abs(d.flowA[1])).toBeGreaterThan(0);

    // ── 검출력은 여기서 나온다 ──────────────────────────────────────────────
    // 위의 일치 검사만으로는 아무것도 증명되지 않는다. 정상 상태에서는 텍스처 offset 과
    // 내부 계산값이 **정확히 같은 수**라, 진단이 어느 쪽을 읽든 통과한다(실제로 진단을
    // 계산값 반환으로 바꿔봤더니 14건 전부 통과했다 — 동어반복이었다).
    //
    // 그래서 둘을 갈라놓는다. 텍스처만 밖에서 되돌리면, 텍스처를 읽는 진단은 멈춤을
    // 보고하고 계산값을 읽는 진단은 여전히 흐른다고 거짓말한다.
    norm.offset.set(0, 0);
    rough.offset.set(0, 0);
    const stopped = inst.diagnostics!() as { flowA: number[]; flowB: number[] };
    expect(stopped.flowA).toEqual([0, 0]);
    expect(stopped.flowB).toEqual([0, 0]);
  });

  it('흐름이 시간에 비례한다 — dt 를 무시하면 프레임레이트마다 속도가 달라진다', () => {
    const a = flow();
    a.inst.system!.update({ dt: 1 } as never);
    const one = { ...a.norm.offset };
    const b = flow();
    b.inst.system!.update({ dt: 0.5 } as never);
    b.inst.system!.update({ dt: 0.5 } as never);
    expect(b.norm.offset.x).toBeCloseTo(one.x, 12);
    expect(b.norm.offset.y).toBeCloseTo(one.y, 12);
  });
});

describe('정리', () => {
  it('dispose 가 씬에서 빼고 자원을 전부 반납한다', () => {
    const { inst, added, removed } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    inst.dispose!();
    expect(removed).toHaveLength(2);
    expect((sea.material as FakeMaterial).disposed).toBe(true);
    for (const k of ['map', 'normalMap', 'roughnessMap'] as const) {
      expect((sea.material.opts[k] as FakeTexture).disposed).toBe(true);
    }
  });
});

// ── 윤슬 (감독 지시 2026-07-30) ─────────────────────────────────────────────
// *"윤슬이 보이는 거였으면 좋겠어. 실제 반사로 하지말고. 쉐이더 트릭으로 했으면 해."*
//
// 윤슬은 `roughnessMap`(= 층 B 노멀맵) **G채널의 낮은 점**으로 낸다. 그 자리에서만
// 스페큘러가 좁고 세게 튄다. 여기서 지키는 것은 **그 점이 실제로 텍스처에 들어갔는가**다 —
// `engraveSparkle` 을 정의만 하고 호출을 빠뜨리면 아무 일도 안 일어나면서 테스트는 통과한다.
// 실제로 이 구현에서 그 실수가 한 번 났다(주석 블록을 먼저 넣어 삽입 패턴이 어긋났다).
describe('윤슬 — roughnessMap G채널에 점이 새겨진다', () => {
  it('층 B(roughnessMap)에만 아주 낮은 G값이 있다 — 층 A(normalMap)에는 없다', () => {
    const { added } = mount();
    // `FakeMaterial` 은 생성 옵션을 `opts` 에 담는다(실제 재질처럼 필드로 펼치지 않는다).
    const opts = (added.find((m) => m.name === 'ocean')!.material as unknown as {
      opts: { normalMap: { image?: { _g?: number[] } }; roughnessMap: { image?: { _g?: number[] } } };
    }).opts;
    // 스텁 캔버스가 putImageData 로 받은 G채널 표본을 남긴다(위 beforeAll 참고).
    const gA = opts.normalMap.image?._g ?? [];
    const gB = opts.roughnessMap.image?._g ?? [];
    expect(gB.length, 'roughnessMap 의 G채널 표본이 없다 — 스텁이 안 물렸다').toBeGreaterThan(0);

    // 스파클은 G 를 0.06*255 ≈ 15 까지 눌러 넣는다. 물결 법선만으로는 그렇게 낮아지지
    // 않는다(법선 G 는 0.5 근처에서 진동한다) — 그래서 이 문턱이 스파클의 지문이다.
    const veryLowB = gB.filter((v) => v <= 24).length;
    const veryLowA = gA.filter((v) => v <= 24).length;
    expect(veryLowB, '윤슬 점이 roughnessMap 에 없다 — engraveSparkle 이 안 불렸다').toBeGreaterThan(0);
    expect(veryLowA, '층 A(normalMap)에 스파클이 섞였다 — 물결 법선이 망가진다').toBe(0);
  });

  it('점이 화면을 덮지 않는다 — 물이 서리처럼 되면 윤슬이 아니다', () => {
    const { added } = mount();
    const opts = (added.find((m) => m.name === 'ocean')!.material as unknown as {
      opts: { roughnessMap: { image?: { _g?: number[] } } };
    }).opts;
    const gB = opts.roughnessMap.image?._g ?? [];
    const ratio = gB.filter((v) => v <= 24).length / gB.length;
    // 격자 7px 칸에 16% 확률 → 픽셀 대비 약 0.3%. 상한을 넉넉히 잡되 "드문 점" 임을 지킨다.
    expect(ratio).toBeLessThan(0.05);
  });

  it('emissive 로 내지 않았다 — 스스로 빛나는 물은 밤에 어색하다 (팀장 조건 4)', () => {
    // 감독 지적: *"밤인데 빛이 이렇게 많지 않잖아."* emissive 는 광원과 무관하게 밝아진다.
    const { added } = mount();
    const opts = (added.find((m) => m.name === 'ocean')!.material as unknown as {
      opts: { emissiveMap?: unknown; emissiveIntensity?: number };
    }).opts;
    expect(opts.emissiveMap ?? null).toBeNull();
    expect(opts.emissiveIntensity ?? 0).toBe(0);
  });
});
