// @vitest-environment jsdom
// tests/world2-water-style.test.ts — 게임풍 수면을 **실제로 마운트해서** 본다.
//
// ── 이 파일이 생긴 경위 — 내 자기신고가 틀렸다 (검수관 블로커, 2026-08-20) ──
// 나는 *"스타일 물은 WebGPU 전용이라 이 환경에서 실행이 원리상 불가능하다"* 고 적고
// 검출력 0 을 그대로 두려 했다. 검수관이 그것을 **실증으로 반박했다**: `adapter.backend`
// 는 그냥 **문자열**이라 `'WebGPU'` 로 주면 `pickWaterStyle` 이 통과하고, 그 뒤로는
// `MeshStandardNodeMaterial` + TSL 노드 그래프 구성까지 **GPU 없이 끝까지 돈다.**
//
// 실패했던 진짜 원인은 백엔드가 아니라 **스텁이 실물보다 좁았던 것**이다 — 가벼운
// `FakeMesh` 는 `THREE.Mesh` 생성자가 요구하는 것(`morphAttributes` 등)을 안 갖췄다.
// 그래서 여기서는 스텁을 쓰지 않고 **진짜 `three/webgpu` 를 쓴다.**
//
// **게이트 유효성에 대한 거짓 진술은 다음 사람이 확인을 생략하게 만든다** — 이 저장소가
// `main` unprotected 오기로 7일을 잃은 그 형태다. 내가 그것을 «원리상 불가능» 이라는
// 형태로 한 번 더 할 뻔했다.
//
// ── 그래도 **못 보는 것** (검수관 권고 2, 2026-08-20 로 범위를 좁혔다) ────────
// 이 파일이 보는 것은 **이번 회귀가 건드린 축뿐**이다: 위치 복원 · 층2 숨김과 층1 대역의
// 짝 · 지오 공유 · `?styl` 토글. *"스타일 물이 검증됐다"* 로 읽으면 안 된다.
//
// 같은 기능 안에서 **여기서 안 걸리는 것**:
// · **화면** — 노드 그래프가 구성된다는 것과 그것이 물처럼 보인다는 것은 다른 일이다.
//   무늬가 타일 장판이 된 사고(감독 *"이게 뭐여"*)는 여기서 **안 잡힌다.**
// · **실제 GPU 셰이더 링크** — 실기기에서 컴파일되는지는 이 축 밖이다.
// · `bakeShoreDistance` 가 굽는 `SHORE_ATTR` 정점값(포말·프레넬 대비의 입력).
//   순수 JS 계산이라 GPU 없이도 잴 수 있는데 **안 재고 있다.**
// · `?wfoam`·`?wfres`·`?wdeep`·`?wrip` 노브가 재질 유니폼까지 실제로 닿는지.
// · `dispose()` 경로 — 숨김 원복·재질 해제. 이 파일은 한 번도 안 부른다.
//
// 첫 판본의 헤더는 *"여기서 잡는 것은 «코드가 안 죽고 옳은 값을 만드는가» 하나다"* 라고만
// 적었다. 참이지만 **파일 전체에 대한 주장으로 읽힌다** — 그러면 다음 사람이 위 다섯 개를
// 검증된 것으로 오해한다. 이 저장소가 가장 비싸게 겪은 형태가 정확히 그것이다.

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three/webgpu';
import { SEA_Y, RIVER_Y } from '../frontend/js/world2/decide/water.js';
import {
  SHORE_ATTR, STYLE_OPACITY, CLEAR_SHALLOW, shallowAlpha, LAYER2_NAMES, STYLED_WATER_NAMES,
} from '../frontend/js/world2/decide/water-style.js';
import { layerOpacity } from '../frontend/js/world2/features/ocean.js';

/** `ocean.ts` 가 층2 패치를 쓸 때 층1을 내리는 깊이. 값을 여기 적지 않는다 */
const { WAVE_AMP_DEFAULT } = await import('../frontend/js/world2/decide/wave.js');

type Env = Parameters<
  typeof import('../frontend/js/world2/features/water-style.js')['waterStyleFeature']['create']
>[0];

/**
 * 물 네 판이 있는 씬을 만든다. **층1(`ocean`)은 내려간 상태로 둔다** — 그것이
 * `features/ocean.ts` 가 층2 패치를 쓸 때의 실제 상태이고, 이 테스트가 재는 회귀다.
 */
function makeScene() {
  const scene = new THREE.Scene();
  // ⚠ 원본 수면 재질은 **노멀맵을 갖는다** — `ocean.ts:1055` 가 `normalMap: tex.normA`
  // 를 걸고 `update()` 가 그 `offset` 을 밀어 일렁이게 한다. 스타일 물이 그 텍스처를
  // 공유하는지가 이 파일의 검사 대상이므로, 픽스처도 실물과 같은 모양이어야 한다.
  const normA = new THREE.Texture();
  normA.name = 'fixture-normA';
  // ⚠ 환경맵도 원본이 갖고 있다(2026-08-20) — `ocean.ts` 가 `envMap` 을 걸고 `applyGloss`
  // 가 그 픽셀을 시간대마다 다시 채운다. 게임풍 물이 **그 객체를 공유**하는지가 이 파일의
  // 검사 대상이므로 픽스처도 실물과 같은 모양이어야 한다.
  const envTex = new THREE.Texture();
  envTex.name = 'fixture-env';
  const mk = (name: string, y: number, seg: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(64, 64, seg, seg).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ normalMap: normA, envMap: envTex, envMapIntensity: 0.75 }),
    );
    m.name = name;
    m.position.y = y;
    scene.add(m);
    return m;
  };
  return {
    scene,
    normA,
    envTex,
    // 층2가 있으므로 층1은 그 골 밑에 있다 (`SEA_Y - LIFT_AMP`)
    ocean: mk('ocean', SEA_Y - WAVE_AMP_DEFAULT, 1),
    river: mk('river', RIVER_Y, 8),
    oceanWave2: mk('ocean-wave2', SEA_Y, 49),
    riverWave2: mk('river-wave2', RIVER_Y + 0.01, 8),
  };
}

async function mountStyled(search = '?styl=1') {
  const before = location.search;
  window.history.replaceState({}, '', search);
  // 노브는 모듈 최상위에서 한 번 읽는다 — 재평가하려면 캐시를 비운다.
  vi.resetModules();
  try {
    const mod = await import('../frontend/js/world2/features/water-style.js');
    const s = makeScene();
    const env = {
      scene: s.scene,
      cell: 32,
      // ⚠ 계약 필수다 — 잔파도 세기를 `waterGloss(time)` 에서 받으므로 없으면 죽는다.
      // 옵셔널로 두면 «없어도 조용히 넘어간다» 가 되어 그 결합이 검사에서 사라진다.
      time: () => 'day' as const,
      // ⚠ **문자열 하나가 이 파일 전체를 가능하게 한다.** 실제 GPU 는 없다.
      adapter: { backend: 'WebGPU', backendDetail: 'WebGPU (테스트 강제)' },
    };
    const inst = mod.waterStyleFeature.create(env as unknown as Env);
    const byName = (n: string) => s.scene.getObjectByName(n) as THREE.Mesh | undefined;
    return { inst, scene: s.scene, src: s, byName };
  } finally {
    window.history.replaceState({}, '', before || location.pathname);
  }
}

afterEach(() => { vi.resetModules(); });

describe('게임풍 수면 — 실제 마운트 (WebGPU 경로)', () => {
  it('WebGPU 로 주면 실제로 켜진다 — 이 한 줄이 이 파일의 전제다', async () => {
    const { inst, byName } = await mountStyled();
    expect(inst, 'create 가 null 이면 아래 단언들이 전부 공회전한다').not.toBeNull();
    expect(byName('ocean-styled'), '바다 대역이 씬에 없다').toBeTruthy();
    expect(byName('river-styled'), '강 대역이 씬에 없다').toBeTruthy();
  });

  it('★ 층1 높이는 층2 유무가 정한다 — 되돌림은 층2를 숨겼을 때만이다', async () => {
    // `ocean`(층1)이 층2 패치의 **골 밑**에 내려가 있는 것은 두 반투명 판이 교차하지
    // 않게 하는 몫이다. 그러니 되돌리는 것은 층2를 **숨겼을 때**뿐이고, 층2를 대역하면
    // 그 몫이 여전히 필요하다.
    //
    // ⚠ 이 단언은 원래 «항상 `SEA_Y` 로 되돌린다» 였다. 층2를 대역하게 되면서 **계약이
    // 바뀌었고** 그래서 깨졌다 — 느슨하게 고치지 않고 조건을 갈라 둘 다 못 박는다.
    const on = await mountStyled('?styl=1&wlayer2=1');
    expect(on.src.ocean.position.y, '전제: 원본 층1은 내려가 있다').toBe(SEA_Y - WAVE_AMP_DEFAULT);
    expect(on.byName('ocean-styled')!.position.y, '층2가 있는데 되돌렸다 — 두 판이 교차한다')
      .toBe(SEA_Y - WAVE_AMP_DEFAULT);

    const off = await mountStyled('?styl=1&wlayer2=0');
    expect(off.byName('ocean-styled')!.position.y, '층2를 숨겼으면 원래 높이로 되돌려야 한다')
      .toBe(SEA_Y);
  });

  it('★ 층2를 대역한다 — 바다에 정점 파동이 오는 유일한 경로', async () => {
    // 감독 판정 *"아래것은 그래로있어서 어색해"* 의 원인이 층2 부재였다. 층1 바다는
    // 정점이 네 귀퉁이뿐이라 실루엣이 변할 수 없다.
    const { byName, src } = await mountStyled();
    for (const n of LAYER2_NAMES) {
      expect(byName(`${n}-styled`), `${n} 대역이 없다 — 파동이 오는 경로가 끊긴다`).toBeTruthy();
    }
    // 지오는 **공유**여야 한다 — 복사하면 `ocean.ts` 가 매 프레임 갱신하는 정점 파동이
    // 안 온다(층1 지오 공유 단언과 같은 축).
    expect(byName('ocean-wave2-styled')!.geometry).toBe(src.oceanWave2.geometry);
  });

  it('★ 층2 바다 대역이 원본 자세를 **매 프레임** 따라간다 (검수관 반려 B3 의 이유 ①)', () => {
    // `ocean.ts` 가 `sea2` 를 플레이어에게 스냅 추종시킨다. 한 번만 복사하면 대역이
    // 스폰 자리에 남고 파형이 월드와 어긋난다 — 정점 버퍼를 공유해도 이 축은 안 온다.
    return mountStyled().then(({ inst, src, byName }) => {
      const proxy = byName('ocean-wave2-styled')!;
      src.oceanWave2.position.set(181, SEA_Y, -362);
      inst!.system!.update({} as never);
      expect(proxy.position.x, '대역이 원본 스냅을 안 따라왔다').toBe(181);
      expect(proxy.position.z).toBe(-362);
    });
  });

  it('`?wlayer2=0` 이면 예전처럼 숨기기만 한다 — 되돌릴 자리가 노브 하나다', async () => {
    const { src, byName } = await mountStyled('?styl=1&wlayer2=0');
    for (const n of LAYER2_NAMES) {
      expect(byName(`${n}-styled`), '껐는데 대역이 생겼다').toBeUndefined();
    }
    expect(src.oceanWave2.visible, '껐으면 원본 층2는 숨어야 한다').toBe(false);
  });

  it('강 대역은 `RIVER_Y` 그대로다 — 되돌림이 바다에만 걸린다', async () => {
    const { byName } = await mountStyled();
    expect(byName('river-styled')!.position.y).toBe(RIVER_Y);
  });

  it('원본 넷이 모두 숨고 대역 넷이 선다 — 어느 한쪽만 되면 화면이 더 나빠진다', async () => {
    const { src, byName } = await mountStyled();
    for (const o of [src.ocean, src.river, src.oceanWave2, src.riverWave2]) {
      expect(o.visible, `${o.name} 원본이 안 숨었다`).toBe(false);
    }
    for (const n of [...STYLED_WATER_NAMES, ...LAYER2_NAMES]) {
      expect(byName(`${n}-styled`)?.visible, `${n} 대역이 없거나 숨어 있다`).toBe(true);
    }
  });

  it('대역이 원본 지오를 **공유**한다 — 복사하면 정점 파동이 안 온다', async () => {
    // 강의 파동은 `ocean.ts` 가 `riverGeo` 정점을 매 프레임 갱신해서 온다. 지오를
    // 복사하는 순간 그 갱신이 대역 메시에 안 닿는다 — 화면에서는 «강이 굳었다» 로만
    // 드러나고 원인을 찾기 어렵다.
    const { src, byName } = await mountStyled();
    expect(byName('river-styled')!.geometry).toBe(src.river.geometry);
    expect(byName('ocean-styled')!.geometry).toBe(src.ocean.geometry);
  });

  it('★ 잔파도 — 원본 노멀맵을 **공유**한다 (감독 *"잔파도의 일렁임"* 2026-08-20)', async () => {
    // 이 재질에는 `normalNode`·`normalMap` 이 **둘 다 없었다** — 완전히 매끈한 면이라
    // 빛이 한 방향으로만 반사되고, 그것이 감독이 «리얼함이 전혀 없다» 고 한 화면이다.
    //
    // **공유**여야 한다. 복사하면 `ocean.ts` 가 미는 `offset` 스크롤이 안 와서 화면에서는
    // «잔물결이 굳었다» 로만 드러난다 — 지오 공유 단언과 정확히 같은 축이다.
    const { src, byName } = await mountStyled();
    const mat = byName('ocean-styled')!.material as unknown as {
      normalMap?: THREE.Texture | null; normalScale?: THREE.Vector2;
    };
    expect(mat.normalMap, '노멀맵이 아예 안 걸렸다 — 매끈한 면으로 되돌아갔다').toBe(src.normA);
    expect(mat.normalScale!.x, '세기가 0 이면 걸어도 안 보인다').toBeGreaterThan(0);
  });

  it('★ 윤슬 — 원본 **환경맵을 공유**한다 (감독 *"밑 반사가 안 움직인다"* 2026-08-20)', async () => {
    // 이 재질에는 `emissive` 윤슬 스티커조차 없었다(기존 물에만 있다). 반사할 환경도
    // 없었으니 «반짝임» 은 프레넬 하늘빛 한 겹뿐이었고, 물결이 흔들려도 **아무것도
    // 명멸하지 않았다** — 감독이 물은 것이 정확히 그 성질이다.
    //
    // **공유**여야 하는 이유가 노멀맵보다 하나 더 있다: 이 재질은 부팅에 한 번 만들어지고
    // 갱신 경로가 없는데, 환경맵은 텍스처 객체가 같으면 `ocean.ts` 의 재굽기가 **저절로
    // 온다.** 복사하면 게임풍 물만 부팅 시각의 하늘에 영원히 묶인다.
    const { src, byName } = await mountStyled();
    const mat = byName('ocean-styled')!.material as unknown as {
      envMap?: THREE.Texture | null; envMapIntensity?: number;
    };
    expect(mat.envMap, '환경맵이 안 걸렸다 — 반사할 것이 없으면 윤슬도 없다').toBe(src.envTex);
    // 세기도 **원본이 정한 것**을 그대로 받아야 한다. 여기서 `?wenv` 를 다시 읽으면 같은
    // 노브가 두 값이 되고, 감독이 링크로 비교하는 두 화면이 서로 다른 축이 된다.
    const srcMat = src.ocean.material as unknown as { envMapIntensity?: number };
    expect(mat.envMapIntensity, '세기가 원본과 다르다 — 노브가 두 곳에서 읽히고 있다')
      .toBe(srcMat.envMapIntensity);
  });

  it('`?wnorm=0` 이면 잔파도가 꺼진다 — 되돌릴 자리가 노브 하나다', async () => {
    const { byName } = await mountStyled('?styl=1&wnorm=0');
    const mat = byName('ocean-styled')!.material as unknown as { normalScale?: THREE.Vector2 };
    expect(mat.normalScale!.x).toBe(0);
  });

  it('★ 맑음 — 알파가 **깊이에 걸린다** (감독 *"물의 투명함"* 2026-08-20)', async () => {
    // 알파가 재질 상수 하나뿐이면 얕든 깊든 같은 불투명도라 «색칠한 판» 이 된다.
    // `opacityNode` 가 걸렸는지를 본다 — 없으면 상수로 되돌아간 것이다.
    const { byName } = await mountStyled();
    const mat = byName('ocean-styled')!.material as unknown as { opacityNode?: unknown };
    expect(mat.opacityNode, '깊이 알파가 없다 — 균일 불투명으로 되돌아갔다').toBeTruthy();
  });

  it('`?wclear=0` 이면 균일 불투명으로 정확히 되돌아간다 (항등원)', () => {
    // ⚠ **첫 판본은 이 자리에서 재질 상수(`opacity`)를 봤고 장식이었다.** `clearMul` 을
    // 통째로 무시하는 뮤테이션에서 **안 깨졌다** — 그 상수는 노브와 무관하게 늘 같기
    // 때문이다. 노드 그래프 내부는 밖에서 읽을 수 없으므로, 판정을 읽을 수 있는 자리
    // (`shallowAlpha`)로 옮기고 여기서 그것을 본다.
    expect(shallowAlpha(0)).toBe(STYLE_OPACITY);
    expect(shallowAlpha(1)).toBe(CLEAR_SHALLOW);
    // 중간값이 선형인지도 본다 — 한쪽 끝만 맞고 가운데가 튀는 구현을 배제한다.
    expect(shallowAlpha(0.5)).toBeCloseTo((STYLE_OPACITY + CLEAR_SHALLOW) / 2, 10);
  });

  it('★ 그 알파를 셰이더가 **실제로 쓴다** — 판정/집행 경계를 건너는 지점', async () => {
    // ⚠ **이 검사가 없을 때 뮤테이션이 통과했다.** `shallowAlpha` 단언(위)은 판정만 보고,
    // 집행부에서 `shallowAlpha(clearMul)` → `shallowAlpha(1)` 로 바꿔도 **안 깨졌다.**
    // 이 저장소가 «판정/집행 분리의 구멍» 이라 부르는 자리이고, 새 판정 값을 만들면
    // 집행 쪽 통합 테스트를 함께 붙이라는 규율이 정확히 이 경우를 말한다.
    //
    // TSL 노드 내부를 읽는다 — `mix(a, b, t)` 는 `MathNode` 이고 `aNode`·`bNode` 가
    // `ConstNode` 면 `.value` 를 그대로 갖는다(실측).
    // ⚠ **three 내부 구조에 의존한다.** 버전이 올라 이름이 바뀌면 여기가 깨진다 —
    // 그때는 조용히 통과하는 게 아니라 빨간불이 뜨므로, 그 시점에 다시 짜면 된다.
    const { byName } = await mountStyled('?styl=1&wclear=0.5');
    const on = (byName('ocean-styled')!.material as unknown as {
      opacityNode?: { aNode?: { value?: number }; bNode?: { value?: number } };
    }).opacityNode;
    // ⚠ 겹이 둘이므로 **양 끝이 각각 배분**돼 있어야 한다. 재질 상수만 나누고 얕은 쪽을
    // 안 나누면 물가 띠에서만 색이 탁해진다 — 그 어긋남이 가장 잘 보이는 자리다.
    expect(on?.aNode?.value, '얕은 쪽 알파가 노브·겹 수를 안 탄다')
      .toBeCloseTo(layerOpacity(shallowAlpha(0.5), 2), 10);
    expect(on?.bNode?.value, '깊은 쪽이 겹 수만큼 안 나뉘었다')
      .toBeCloseTo(layerOpacity(STYLE_OPACITY, 2), 10);
  });

  it('`?styl=0` 이면 아무것도 안 건드린다 — 되돌리기가 실제로 되는가', async () => {
    const { inst, src, byName } = await mountStyled('?styl=0');
    expect(inst).toBeNull();
    expect(byName('ocean-styled')).toBeUndefined();
    expect(src.ocean.visible, '끈 상태에서 원본을 숨기면 물이 사라진다').toBe(true);
    expect(src.oceanWave2.visible).toBe(true);
    // ⚠ 지오메트리도 **무손상**이어야 한다 (검수관 권고 3). `bakeShoreDistance` 는 지금
    // 대역 루프 **안**에서만 불리므로 이 경로에서는 안 붙는 것이 맞다 — 그런데 그것을
    // 지키는 단언이 없었다. 나중에 베이크를 가드 앞으로 옮기면 끈 상태에서도 지오가
    // 조용히 오염되는데, `visible` 만 보는 검사로는 못 잡는다.
    expect(
      src.ocean.geometry.getAttribute(SHORE_ATTR),
      '꺼진 경로에서 지오메트리에 어트리뷰트가 붙었다',
    ).toBeUndefined();
  });
});
