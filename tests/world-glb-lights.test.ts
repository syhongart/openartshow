// world-glb lights — light node 생성 및 SSOT 검증
//
// generate.mjs 가 방 라이트 노드를 생성하고, glb-nodes.ts 의 SSOT 와 일관성 있게
// 연결되는지 확인한다. mountGlbWorld 의 PointLight 생성은 통합 테스트 대상이다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three/webgpu';
import { buildStreet } from '../scripts/asset/nyc/generate.mjs';
import {
  isRoomLightNode, ROOM_LIGHT_SUFFIX, ROOM_LIGHT_COLOR, ROOM_LIGHT_INTENSITY,
  ROOM_LIGHT_INTENSITY_MAX, roomLightIntensity,
} from '../frontend/js/world-glb/decide/glb-nodes.js';
import { mountGlbWorld } from '../frontend/js/world-glb/systems/glb-source.js';
import { applyHemiGround } from '../frontend/js/world-glb/systems/sky-ground.js';
// 이름 위생 함수. `three/webgpu` 앰비언트 선언에는 이 심볼이 없어 `three` 에서 가져온다(같은 클래스).
import { PropertyBinding } from 'three';

describe('world-glb — light node generation and SSOT', () => {
  const { json: built } = buildStreet({ seed: 1, textures: false }) as {
    json: { nodes: Array<{ name: string; mesh?: number; translation?: number[] }> };
  };

  it('모든 _light 노드는 isRoomLightNode 패턴을 만족한다', () => {
    // generate.mjs 가 만드는 모든 light node 이름이 규약을 따르는지 확인
    const lightNodes = built.nodes.filter((n) => n.name.endsWith(ROOM_LIGHT_SUFFIX));
    expect(lightNodes.length).toBeGreaterThan(0);

    for (const node of lightNodes) {
      expect(isRoomLightNode(node.name)).toBe(true);
      // 패턴: bld_<id>_room_<r>_light (숫자만 들어감)
      expect(node.name).toMatch(/^bld_\d+_room_\d+_light$/);
    }
  });

  it('방 라이트는 빈 노드다(메시 없음)', () => {
    const lightNodes = built.nodes.filter((n) => isRoomLightNode(n.name));
    expect(lightNodes.length).toBeGreaterThan(0);

    for (const node of lightNodes) {
      expect(node.mesh).toBeUndefined(); // 메시가 없는 빈 노드
    }
  });

  it('방 라이트는 world 좌표를 가진다', () => {
    const lightNodes = built.nodes.filter((n) => isRoomLightNode(n.name));
    expect(lightNodes.length).toBeGreaterThan(0);

    for (const node of lightNodes) {
      expect(node.translation).toBeDefined();
      expect(node.translation).toHaveLength(3);
      const [x, y, z] = node.translation!;
      expect(typeof x).toBe('number');
      expect(typeof y).toBe('number');
      expect(typeof z).toBe('number');
      // y 는 천장 아래 0.3m (ROOM_H=4.0 → y=3.7)
      expect(y).toBeLessThan(4.0);
      expect(y).toBeGreaterThan(0);
    }
  });

  it('갤러리(bld_2) 방 내 라이트는 정확히 1개다', () => {
    const galleryLights = built.nodes.filter(
      (n) => n.name.startsWith('bld_2_room_') && isRoomLightNode(n.name),
    );
    expect(galleryLights).toHaveLength(1);
    expect(galleryLights[0].name).toBe('bld_2_room_1_light');
  });

  it('isRoomLightNode 와 ROOM_LIGHT_SUFFIX 가 일관성 있게 동작한다', () => {
    // 단언: isRoomLightNode 정규식의 역방향 검증
    // 1. 패턴 매칭이 정확히 숫자만 받는가
    expect(isRoomLightNode('bld_2_room_1_light')).toBe(true);
    expect(isRoomLightNode('bld_02_room_01_light')).toBe(true); // leading zero OK
    expect(isRoomLightNode('bld_2_room_1_lightX')).toBe(false); // 접미사 다름
    expect(isRoomLightNode('bld_x_room_1_light')).toBe(false); // 숫자 아님
    expect(isRoomLightNode('bld_2_room_1')).toBe(false); // 접미사 없음

    // 2. ROOM_LIGHT_SUFFIX 로 끝나는 노드 = isRoomLightNode 로 검증 가능
    const allWithSuffix = built.nodes.filter((n) => n.name.endsWith(ROOM_LIGHT_SUFFIX));
    for (const node of allWithSuffix) {
      expect(isRoomLightNode(node.name)).toBe(true);
    }
  });

  it('다른 건물 방들에도 라이트 노드가 있거나 없는 상태가 일관성 있다', () => {
    // 방이 있는 건물은 bld_2 뿐이라고 알려져 있으므로,
    // 다른 건물에 방이 없거나 있더라도 패턴이 일관성 있어야 한다
    const roomLights = built.nodes.filter((n) => isRoomLightNode(n.name));

    // 모두 bld_2 방에 속함
    for (const light of roomLights) {
      expect(light.name).toMatch(/^bld_2_room_\d+_light$/);
    }
  });
});

// ── 경계 축 — 「생성기가 쓴 이름」과 「로더가 붙인 이름」은 다른 문자열이다 ──────────
// ⚠ 이 describe 는 **실물 사고에서 생겼다**(2026-09-06). `GLTFLoader` 는 노드·메시 이름을
// `PropertyBinding.sanitizeNodeName` 에 통과시켜 `[ ] . : /` 를 **지운다**. 규약 구분자가
// `.` 이던 동안 `isRoomLightNode` 는 런타임에서 한 번도 참이 아니었고 실내 점광이 **0개**였다.
// 그런데 이 파일의 기존 14개는 **전부 초록**이었다 — 검사가 GLB json 의 원 이름만 봤기 때문이다.
// 아래 두 검사는 그 경계를 **실제로 건너서** 본다. 근거 표는 `decide/glb-nodes.ts` 헤더 한 곳.
describe('경계 — three 로더의 이름 위생(sanitizeNodeName)을 통과한 뒤', () => {
  const { json } = buildStreet({ seed: 1, textures: false }) as {
    json: { nodes: Array<{ name: string }>; meshes: Array<{ name: string }> };
  };
  const sanitize = (n: string): string => PropertyBinding.sanitizeNodeName(n) as string;

  it('sanitizeNodeName 이 실제로 위생 처리를 한다 — 항등함수가 아니다(이 검사의 전제)', () => {
    // 이 단언이 없으면 위 두 검사는 sanitize 가 항등함수로 바뀌어도 초록이다.
    expect(sanitize('bld.2.room.1.light')).toBe('bld2room1light');
    expect(sanitize('a[0]:b/c')).toBe('a0bc');
  });

  it('생성기의 모든 노드·메시 이름이 sanitizeNodeName 에 불변이다 — `.` 을 쓰면 로더가 지운다', () => {
    const names = [...json.nodes.map((n) => n.name), ...json.meshes.map((m) => m.name)];
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name, `로더가 '${name}' 를 '${sanitize(name)}' 로 고쳐 쓴다`).toBe(sanitize(name));
    }
  });

  it('로더를 통과한 뒤에도 라이트 노드가 isRoomLightNode 를 만족한다(경계 축)', () => {
    const lights = json.nodes.filter((n) => isRoomLightNode(n.name));
    expect(lights.length).toBeGreaterThan(0);   // 원 이름 기준으로는 잡힌다
    for (const node of lights) {
      // 런타임(`glb-source.ts`)이 실제로 보는 것은 이 이름이다.
      expect(isRoomLightNode(sanitize(node.name)), `sanitize 후 '${sanitize(node.name)}'`).toBe(true);
    }
  });
});


// ── 집행 축 — 「생성기가 노드를 만든다」와 「런타임이 그 자리에 빛을 켠다」는 다른 일이다 ──
// 위 describe 는 전부 **GLB json**(빌드 산출)만 본다. 아래는 `mountGlbWorld` 를 three 실물로
// 돌려 실제로 붙은 `PointLight` 의 색·강도·위치를 잰다. 이 축이 없으면 `glb-source.ts` 에서
// 색을 `0xffffff` 로 되돌려도 위 6개는 전부 초록이다(뮤테이션 실측, 보고 참조).
/**
 * `PointLight` 중 이 검사가 읽는 부분만.
 *
 * `frontend/js/three-ambient.d.ts` 가 `three/webgpu` 에 대해 «타입으로 쓰는 심볼만» 선언하고
 * 있어 `THREE.PointLight` 는 **타입 위치에서 못 쓴다**(TS2694). 앰비언트 선언을 늘리는 것은
 * 이 회차 범위 밖이고(그 파일은 world2 계열 전체가 읽는다), 여기서 필요한 것은 세 속성뿐이다.
 */
type PointLightLike = {
  isPointLight?: boolean;
  color: { getHex(): number };
  intensity: number;
  position: { toArray(): number[] };
};

/** 라이트 노드 하나만 있는 최소 트리. 되묶기 대상(메시)이 없어도 라이트 경로는 돈다. */
function mount(): PointLightLike[] {
  const root = new THREE.Group();
  const node = new THREE.Object3D();
  node.name = 'bld_2_room_1_light';
  node.position.set(1.5, 3.7, -12);
  root.add(node);
  const scene = new THREE.Scene();
  mountGlbWorld(scene as never, root as never, { castShadow: false });
  const lights: PointLightLike[] = [];
  scene.traverse((o: PointLightLike) => { if (o.isPointLight) lights.push(o); });
  return lights;
}

describe('mountGlbWorld — 방 라이트 집행(three 실물)', () => {

  it('라이트 노드마다 PointLight 가 하나, 노드의 월드 좌표에 선다', () => {
    const lights = mount();
    expect(lights).toHaveLength(1);
    expect(lights[0].position.toArray()).toEqual([1.5, 3.7, -12]);
  });

  it('색은 ROOM_LIGHT_COLOR(#FFF6EA) 다 — 흰색이 아니다(art-direction §2 전시 조명)', () => {
    const lights = mount();
    expect(ROOM_LIGHT_COLOR).toBe(0xfff6ea);
    // `getHex()` 기본 인자가 sRGB 라 `setHex` 와 왕복이 맞는다(three Color 규약).
    expect(lights[0].color.getHex()).toBe(0xfff6ea);
    expect(lights[0].color.getHex()).not.toBe(0xffffff);
  });

  it('강도는 decide 의 ROOM_LIGHT_INTENSITY 를 그대로 쓴다(집행 쪽에 값을 다시 적지 않는다)', () => {
    const lights = mount();
    expect(lights[0].intensity).toBe(ROOM_LIGHT_INTENSITY);
  });
});

// ── `?pli=` 노브 — 판정(순수) ─────────────────────────────────────────────────
describe('roomLightIntensity — 판정', () => {
  it('지정 안 됨·빈 값·숫자 아님 은 기본값으로 되돌린다', () => {
    expect(roomLightIntensity(null)).toBe(ROOM_LIGHT_INTENSITY);
    expect(roomLightIntensity(undefined)).toBe(ROOM_LIGHT_INTENSITY);
    expect(roomLightIntensity('')).toBe(ROOM_LIGHT_INTENSITY);
    expect(roomLightIntensity('   ')).toBe(ROOM_LIGHT_INTENSITY);
    expect(roomLightIntensity('밝게')).toBe(ROOM_LIGHT_INTENSITY);
    expect(roomLightIntensity('12abc')).toBe(ROOM_LIGHT_INTENSITY);
  });

  it('0 은 유효한 지정이다 — 「끈 대조군」이라 기본값으로 되돌리지 않는다', () => {
    // 이 축이 실물 사고에서 왔다: 점광이 0개이던 동안 강도 스윕 4장이 md5 동일이었고,
    // 그것을 가른 것이 «켠 화면 ↔ 끈 화면» 대조였다(BOARD 2026-09-06).
    expect(roomLightIntensity('0')).toBe(0);
    expect(roomLightIntensity('0')).not.toBe(ROOM_LIGHT_INTENSITY);
  });

  it('음수는 0 이 아니라 기본값으로 되돌린다 — 「끈 것」과 「잘못 적은 것」을 가른다', () => {
    expect(roomLightIntensity('-1')).toBe(ROOM_LIGHT_INTENSITY);
    expect(roomLightIntensity('-0.5')).toBe(ROOM_LIGHT_INTENSITY);
    expect(ROOM_LIGHT_INTENSITY).toBeGreaterThan(0);   // 위 두 단언이 0 과 구별되는 전제
  });

  it('소수·공백은 통과하고 상한은 클램프한다', () => {
    expect(roomLightIntensity('7.5')).toBe(7.5);
    expect(roomLightIntensity(' 30 ')).toBe(30);
    expect(roomLightIntensity(String(ROOM_LIGHT_INTENSITY_MAX + 1))).toBe(ROOM_LIGHT_INTENSITY_MAX);
    expect(roomLightIntensity('99999')).toBe(ROOM_LIGHT_INTENSITY_MAX);
    expect(roomLightIntensity('Infinity')).toBe(ROOM_LIGHT_INTENSITY);   // 유한수만
  });
});

// ── `?pli=` 노브 — 집행(three 실물 PointLight) ────────────────────────────────
// ⚠ **이 describe 가 없으면 노브는 조용히 죽는다.** 위 판정 테스트는 함수만 보고,
// `glb-source.ts` 가 그 함수를 안 부르고 상수를 그대로 쓰더라도 전부 초록이다 — 이 저장소가
// 이름 붙인 «판정/집행 분리의 구멍»(CLAUDE.md)이고, `applyHemiGround` 배선이 실제로 그렇게
// 죽어 있던 회차가 있다. 그래서 URL 을 실제로 세워 `PointLight.intensity` 를 읽는다.
describe('`?pli=` — 노브 값이 실제 PointLight.intensity 에 들어간다', () => {
  /** node 환경에는 `location` 이 없다. `url-knob.readRawOpt` 가 읽는 그 전역을 세운다. */
  function withSearch<T>(search: string, fn: () => T): T {
    const had = 'location' in globalThis;
    const prev = (globalThis as { location?: unknown }).location;
    Object.defineProperty(globalThis, 'location', {
      value: { search }, configurable: true, writable: true,
    });
    try { return fn(); } finally {
      if (had) Object.defineProperty(globalThis, 'location', { value: prev, configurable: true, writable: true });
      else delete (globalThis as { location?: unknown }).location;
    }
  }

  it('전제 — 이 하네스가 `location` 을 실제로 세운다(안 세우면 아래는 전부 기본값으로 초록이다)', () => {
    expect('location' in globalThis).toBe(false);
    withSearch('?pli=30', () => { expect((globalThis as { location: { search: string } }).location.search).toBe('?pli=30'); });
    expect('location' in globalThis).toBe(false);   // 다른 테스트로 새지 않는다
  });

  it('`?pli=30` 이면 PointLight 가 30 으로 선다 — 기본값이 아니다', () => {
    const lights = withSearch('?pli=30', mount);
    expect(lights).toHaveLength(1);
    expect(lights[0].intensity).toBe(30);
    expect(lights[0].intensity).not.toBe(ROOM_LIGHT_INTENSITY);
  });

  it('`?pli=0` 이면 실제로 꺼진다(강도 0)', () => {
    const lights = withSearch('?pli=0', mount);
    expect(lights[0].intensity).toBe(0);
  });

  it('상한을 넘겨도 화면이 날아가지 않는다 — 클램프가 집행까지 온다', () => {
    const lights = withSearch('?pli=99999', mount);
    expect(lights[0].intensity).toBe(ROOM_LIGHT_INTENSITY_MAX);
  });

  it('노브가 없거나 값이 망가지면 기본값이다 — 다른 파라미터가 섞여 있어도', () => {
    expect(withSearch('?cam=13.2,-16.6,180,0', mount)[0].intensity).toBe(ROOM_LIGHT_INTENSITY);
    expect(withSearch('?pli=밝게&nrm=0.6', mount)[0].intensity).toBe(ROOM_LIGHT_INTENSITY);
    expect(withSearch('?nrm=0.6&pli=24', mount)[0].intensity).toBe(24);   // 순서·이웃 무관
  });

  it('집행 쪽에 숫자가 없다 — 범위·폴백은 decide 한 곳이다(값 미러링 금지)', () => {
    const src = readFileSync(
      join(__dirname, '..', 'frontend', 'js', 'world-glb', 'systems', 'glb-source.ts'), 'utf8');
    // 노브를 읽어 쓰는 그 줄에 리터럴 숫자가 있으면 범위가 두 곳에 사는 것이다.
    const line = src.split('\n').find((l) => l.includes("roomLightIntensity(readRawOpt('pli')"));
    expect(line, "glb-source.ts 가 roomLightIntensity(readRawOpt('pli')) 로 읽어야 한다").toBeDefined();
    expect(line).not.toMatch(/\d/);
    expect(src.match(/roomLightIntensity\(/g)).toHaveLength(1);
    // `main.ts` 는 이 노브를 모른다 — 동결 파일이라 배선을 그쪽으로 올리지 않는다.
    const main = readFileSync(
      join(__dirname, '..', 'frontend', 'js', 'world-glb', 'main.ts'), 'utf8');
    expect(main).not.toMatch(/['"]pli['"]/);   // 노브 키를 따옴표로 적은 자리가 없다
    expect(main.includes('roomLightIntensity')).toBe(false);
  });
});

describe('applyHemiGround — three 실물 HemisphereLight', () => {
  /** `sky.js` 프리셋 hemiG. 이 값이 입면색을 지배해서 노브가 생겼다(디자이너 2026-09-06). */
  const PRESET_GROUND = 0x8fa385;

  it('hex 를 주면 groundColor 가 그 값이 된다', () => {
    const hemi = new THREE.HemisphereLight(0xffffff, PRESET_GROUND, 1);
    applyHemiGround(hemi, 0x8a857c);
    expect(hemi.groundColor.getHex()).toBe(0x8a857c);
  });

  it('undefined 면 한 픽셀도 안 건드린다 — 팔레트 기본값이 그대로 산다', () => {
    const hemi = new THREE.HemisphereLight(0xffffff, PRESET_GROUND, 1);
    applyHemiGround(hemi, undefined);
    expect(hemi.groundColor.getHex()).toBe(PRESET_GROUND);
  });

  it('skyColor 는 건드리지 않는다(지면색만 덮는다)', () => {
    const hemi = new THREE.HemisphereLight(0xffffff, PRESET_GROUND, 1);
    applyHemiGround(hemi, 0x8a857c);
    expect(hemi.color.getHex()).toBe(0xffffff);
  });
});

// ── 배선 축 — 「순수 함수가 맞다」와 「그 함수가 불린다」는 다른 일이다 ─────────
// ⚠ 이 describe 는 **뮤테이션 실측으로 생겼다**(2026-09-06): `sky.ts` 에서
// `applyHemiGround` 호출 한 줄을 지우고 **전체 4,959 테스트**를 돌렸더니 추가 실패가
// **0** 이었다. 위 「applyHemiGround — three 실물」 은 함수만 보고, `?hemig=` 는 화면에서
// 조용히 죽는다. 판정과 집행 사이를 건너는 지점은 양쪽 테스트 어디에도 안 걸린다.
//
// **한계(정직하게)**: 소스 텍스트 검사다. 「그 자리에 그 순서로 적혀 있다」까지만 보고
// 「실제 프레임에서 그 순서로 돈다」는 안 본다 — `SkySystem` 실물 구동은 `sky.js`(929줄)와
// 캔버스 스텁 하네스가 필요하고 이 회차 범위 밖이다(`tests/sky-paint-wiring.test.ts` 가
// 그 하네스의 본보기다). 지금 막는 것은 **배선 삭제와 순서 뒤바뀜**이다.
describe('호출처 — SkySystem 이 hemi 지면색을 덮는 자리 한 곳', () => {
  const sky = readFileSync(
    join(__dirname, '..', 'frontend', 'js', 'world-glb', 'systems', 'sky.ts'), 'utf8');

  it('sky.ts 가 applyHemiGround 를 정확히 한 번 부른다(집행은 sky-ground.ts 한 곳)', () => {
    expect(sky.match(/applyHemiGround\(/g)).toHaveLength(1);
    expect(sky).toMatch(/applyHemiGround\(this\.hemi[^,]*,\s*this\.hemiGround\)/);
    // 집행을 sky.ts 안에 다시 적지 않는다 — 그러면 파일이 다시 커지고 값이 두 자리에 산다.
    expect(sky.includes('groundColor.setHex')).toBe(false);
  });

  it('호출 자리는 engine.update 직후·liftNightLights 직전이다(sky-ground.ts 헤더의 판정)', () => {
    const iEngine = sky.indexOf('this.engine.update(ctx.dt)');
    const iApply = sky.indexOf('applyHemiGround(this.hemi');
    const iLift = sky.indexOf('this.liftNightLights()');
    expect(iEngine).toBeGreaterThan(-1);
    expect(iApply).toBeGreaterThan(iEngine);   // 앞이면 매 프레임 팔레트가 다시 덮는다
    expect(iLift).toBeGreaterThan(iApply);     // 뒤면 밤 지면색 하한이 무시된다
  });
});
