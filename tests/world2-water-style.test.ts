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
import { SHORE_ATTR } from '../frontend/js/world2/decide/water-style.js';

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
  const mk = (name: string, y: number, seg: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(64, 64, seg, seg).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial(),
    );
    m.name = name;
    m.position.y = y;
    scene.add(m);
    return m;
  };
  return {
    scene,
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

  it('★ 바다 대역이 «내려가지 않은» 높이로 뜬다 — 진폭이 수면 높이를 밀지 않는다', async () => {
    // 회귀의 정체: `ocean`(층1)은 층2 패치의 골 밑에 내려가 있는데, 여기서는 그 층2를
    // **숨기므로** 교차할 상대가 없다. 내린 채로 복사하면 스타일 물에서만 바다가
    // `?wamp` 만큼 낮아지고, 진폭 노브가 수면 높이 노브가 된다.
    const { src, byName } = await mountStyled();
    expect(src.ocean.position.y, '전제: 원본 층1은 내려가 있다').toBe(SEA_Y - WAVE_AMP_DEFAULT);
    expect(byName('ocean-styled')!.position.y).toBe(SEA_Y);
  });

  it('강 대역은 `RIVER_Y` 그대로다 — 되돌림이 바다에만 걸린다', async () => {
    const { byName } = await mountStyled();
    expect(byName('river-styled')!.position.y).toBe(RIVER_Y);
  });

  it('층2 둘은 숨고 층1 둘은 대역된다 — 어느 한쪽만 되면 화면이 더 나빠진다', async () => {
    const { src, byName } = await mountStyled();
    expect(src.oceanWave2.visible, '바다 층2가 안 숨었다').toBe(false);
    expect(src.riverWave2.visible, '강 층2가 안 숨었다').toBe(false);
    expect(src.ocean.visible, '대역했으면 원본은 숨어야 한다').toBe(false);
    expect(src.river.visible).toBe(false);
    expect(byName('ocean-styled')!.visible).toBe(true);
  });

  it('대역이 원본 지오를 **공유**한다 — 복사하면 정점 파동이 안 온다', async () => {
    // 강의 파동은 `ocean.ts` 가 `riverGeo` 정점을 매 프레임 갱신해서 온다. 지오를
    // 복사하는 순간 그 갱신이 대역 메시에 안 닿는다 — 화면에서는 «강이 굳었다» 로만
    // 드러나고 원인을 찾기 어렵다.
    const { src, byName } = await mountStyled();
    expect(byName('river-styled')!.geometry).toBe(src.river.geometry);
    expect(byName('ocean-styled')!.geometry).toBe(src.ocean.geometry);
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
