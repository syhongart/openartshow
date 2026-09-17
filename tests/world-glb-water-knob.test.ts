// `?watery=` · `?srcwater=` — 수면 축 두 노브의 검출력.
//
// ── 왜 이 회차에 생겼나 ─────────────────────────────────────────────────────
// 감독이 아이폰(WebGPU)에서 월드11 을 열고 «유실» 을 신고했는데, 실제 화면은 **바닥
// 전체가 수면**이었다. 헤드리스(swiftshader=**WebGL**)에서는 게임풍 수면이 아예 안
// 그려져 그 증상이 **재현되지 않는다** — CLAUDE.md 가 *"이 사각은 아직 열려 있다"* 로
// 못 박은 자리다. 그래서 값을 고르지 않고 **노브로 열어** 감독이 화면으로 판정한다.
//
// ── 무엇을 막는가 ───────────────────────────────────────────────────────────
// ① 판정(클램프·재질 이름) ② **집행**(`mountGlbWorld` 가 실제로 메시를 걷어내는가)
// ③ **world7·world8 불변**(노브를 안 밀면 한 메시도 안 사라진다)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three/webgpu';
import {
  waterYOffset, isAssetWaterMaterial, WATER_MESH_NAMES,
  WATER_Y_OFFSET_DEFAULT, WATER_Y_OFFSET_MIN, WATER_Y_OFFSET_MAX,
} from '../frontend/js/world-glb/decide/water-y.js';
import { liftWaterMeshes } from '../frontend/js/world-glb/features/water-lift.js';
import { STYLED_WATER_NAMES, LAYER2_NAMES } from '../frontend/js/world-glb/decide/water-style.js';
import { mountGlbWorld } from '../frontend/js/world-glb/systems/glb-source.js';

function withSearch<T>(search: string, fn: () => T): T {
  const had = 'location' in globalThis;
  const prev = (globalThis as { location?: unknown }).location;
  Object.defineProperty(globalThis, 'location', { value: { search }, configurable: true, writable: true });
  try { return fn(); } finally {
    if (had) Object.defineProperty(globalThis, 'location', { value: prev, configurable: true, writable: true });
    else delete (globalThis as { location?: unknown }).location;
  }
}

describe('`?watery=` 판정 — `waterYOffset`', () => {
  it('기본 0 = 현재 동작 — world7·world8 이 안 바뀌는 근거다', () => {
    expect(WATER_Y_OFFSET_DEFAULT).toBe(0);
  });

  it('범위 안은 그대로 통과한다 — 감독이 고를 값(−0.7 ~ −1.2)이 접히면 비교가 무효다', () => {
    expect(waterYOffset(-1.2)).toBeCloseTo(-1.2, 9);
    expect(waterYOffset(-0.7)).toBeCloseTo(-0.7, 9);
  });

  it('상한을 접는다 — `?watery=999` 로 물이 하늘에 뜨지 않는다', () => {
    expect(waterYOffset(999)).toBe(WATER_Y_OFFSET_MAX);
  });

  it('하한을 접는다 — 아래로도 무한히 못 간다(되돌아오는 길이 화면에 없다)', () => {
    expect(waterYOffset(-999)).toBe(WATER_Y_OFFSET_MIN);
  });

  it('유한수가 아니면 기본값 — 「지정을 못 읽었다」가 「0 을 지정했다」와 같은 결과여야 한다', () => {
    expect(waterYOffset(Number.NaN)).toBe(WATER_Y_OFFSET_DEFAULT);
    expect(waterYOffset(Number.POSITIVE_INFINITY)).toBe(WATER_Y_OFFSET_DEFAULT);
  });

  it('**올리는 쪽도 열려 있다** — 「물이 도로를 덮는다」를 일부러 재현해 원인을 확정한다', () => {
    expect(WATER_Y_OFFSET_MAX).toBeGreaterThan(0);
    // 자산 bbox 바닥(−2.0)보다 더 내릴 수 있어야 대조군이 성립한다
    expect(WATER_Y_OFFSET_MIN).toBeLessThan(-2);
  });
});

describe('`?srcwater=` 판정 — 자산이 들고 온 물의 재질 이름', () => {
  it('맨해튼 자산의 실측 재질 이름 `water` 를 잡는다', () => {
    expect(isAssetWaterMaterial('water')).toBe(true);
    expect(isAssetWaterMaterial('Water')).toBe(true);
    expect(isAssetWaterMaterial('river_water')).toBe(true);
  });

  it('**앞에 붙은 말을 안 먹는다** — `underwater` 는 물이 아니다(오탐이 세계를 지운다)', () => {
    expect(isAssetWaterMaterial('underwater')).toBe(false);
  });

  it('**뒤에 붙은 말도 안 먹는다** — `watertight` 는 물이 아니다', () => {
    // 앞뒤를 갈라 두는 이유: `includes('water')` 로 퇴화해도 한쪽만 보면 반은 통과한다.
    expect(isAssetWaterMaterial('watertight')).toBe(false);
  });

  it('상관없는 재질·빈 값은 물이 아니다', () => {
    expect(isAssetWaterMaterial('asphalt')).toBe(false);
    expect(isAssetWaterMaterial(undefined)).toBe(false);
    expect(isAssetWaterMaterial(null)).toBe(false);
  });
});

// ── 집행 — three 실물 트리로 `mountGlbWorld` 를 돌린다 ────────────────────────
// ⚠ **이 describe 가 없으면 노브는 조용히 죽는다.** 위 판정 테스트는 함수만 보고,
// `glb-source.ts` 가 그 함수를 안 부르더라도 전부 초록이다 — 이 트리의 `?pli=` 검사가
// 같은 이유로 집행 축을 따로 갖고 있다.
describe('`?srcwater=0` 집행 — 자산 물 메시를 실제로 걷어낸다', () => {
  /** 물 메시 하나 + 도로 메시 하나짜리 최소 씬. 맨해튼 자산의 구조를 흉내낸다 */
  function build(): THREE.Object3D {
    const root = new THREE.Object3D();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: 'water' }));
    water.name = 'Expanded_East_River_water';
    const road = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: 'asphalt' }));
    road.name = 'road';
    root.add(water, road);
    return root;
  }
  function meshNames(o: THREE.Object3D): string[] {
    const out: string[] = [];
    o.traverse((c: THREE.Object3D) => { if ((c as THREE.Mesh).isMesh) out.push(c.name); });
    return out;
  }

  it('🔴 노브가 없으면 **한 메시도 안 사라진다** — world7·world8 의 불변', () => {
    const root = build();
    const scene = new THREE.Scene();
    withSearch('', () => mountGlbWorld(scene as never, root as never, { castShadow: false }));
    expect(meshNames(root).sort()).toEqual(['Expanded_East_River_water', 'road']);
  });

  it('🔴 그리고 **집계도 안 바뀐다** — 진단이 「걷어낸 세계」를 보고하면 그것이 거짓 진술이다', () => {
    const root = build();
    const r = withSearch('', () => mountGlbWorld(new THREE.Scene() as never, root as never, { castShadow: false }));
    expect(r.meshes).toBe(2);
  });

  it('`?srcwater=1` 도 종전 그대로다 — 「켬」이 기본값과 같은 경로여야 한다', () => {
    const root = build();
    withSearch('?srcwater=1', () => mountGlbWorld(new THREE.Scene() as never, root as never, { castShadow: false }));
    expect(meshNames(root)).toContain('Expanded_East_River_water');
  });

  it('⭐ `?srcwater=0` 이면 물 메시만 빠지고 **도로는 남는다**', () => {
    const root = build();
    withSearch('?srcwater=0', () => mountGlbWorld(new THREE.Scene() as never, root as never, { castShadow: false }));
    const names = meshNames(root);
    expect(names).not.toContain('Expanded_East_River_water');
    expect(names).toContain('road');
  });

  it('⭐ 걷어낸 메시는 **인스턴싱 결과에도 안 들어간다** — 되묶기 «전» 이어야 성립한다', () => {
    const root = build();
    const scene = new THREE.Scene();
    const r = withSearch('?srcwater=0', () => mountGlbWorld(scene as never, root as never, { castShadow: false }));
    // 되묶기 «전» 에 센 메시 수. 물이 먼저 빠졌으므로 1(도로)이어야 한다.
    expect(r.meshes).toBe(1);
  });
});

// ── `?watery=` 집행 — `liftWaterMeshes` 를 스텁 씬으로 실제로 돌린다 ──────────
// ⚠ **이 describe 가 없으면 노브는 조용히 죽는다.** 위 판정 테스트는 클램프만 보고,
// 집행 쪽이 그 값을 안 쓰더라도 전부 초록이다 — 이 저장소가 이름 붙인 «판정/집행 분리의
// 구멍» 이고, 이 트리의 `?pli=`·`applyHemiGround` 검사가 같은 이유로 집행 축을 갖는다.
describe('`?watery=` 집행 — `liftWaterMeshes`', () => {
  function scene(names: readonly string[] = WATER_MESH_NAMES) {
    const objs = new Map<string, { position: { y: number } }>();
    for (const n of names) objs.set(n, { position: { y: -1.4 } });
    return { objs, getObjectByName: (n: string) => objs.get(n) as never };
  }

  it('🔴 `dy === 0` 이면 **한 메시도 안 만진다** — world7·world8 의 불변', () => {
    const s = scene();
    expect(liftWaterMeshes(s, 0)).toBe(0);
    for (const o of s.objs.values()) expect(o.position.y).toBe(-1.4);
  });

  it('⭐ 물 메시 **전부**를 같은 양만큼 옮긴다 — 한 층만 남으면 층끼리 어긋난 물이 된다', () => {
    const s = scene();
    expect(liftWaterMeshes(s, -1.5)).toBe(WATER_MESH_NAMES.length);
    for (const o of s.objs.values()) expect(o.position.y).toBeCloseTo(-2.9, 9);
  });

  it('⭐ 올리는 쪽도 간다 — 「물이 도로를 덮는다」를 일부러 재현하는 대조군', () => {
    const s = scene();
    liftWaterMeshes(s, 2);
    expect(s.objs.get('ocean')!.position.y).toBeCloseTo(0.6, 9);
  });

  it('없는 이름은 세지 않는다 — **0 이면 「아무 일도 안 했다」**가 화면에 남아야 한다', () => {
    expect(liftWaterMeshes(scene(['전혀-다른-이름']), -1)).toBe(0);
  });

  it('🔴 옮길 목록이 **해저를 포함한다** — 수면만 내리면 바닥이 물 위로 올라온다', () => {
    expect(WATER_MESH_NAMES).toContain('seabed');
  });

  it('🔴 목록이 `decide/water-style.ts` 의 두 배열에서 **유도된다** — 값 미러링 금지', () => {
    for (const n of [...STYLED_WATER_NAMES, ...LAYER2_NAMES]) {
      expect(WATER_MESH_NAMES, `${n} 이 빠졌다 — 합성이 아니라 손으로 적은 목록이다`).toContain(n);
    }
  });

  it('🔴 해저 이름이 `features/ocean.ts` 가 실제로 붙이는 이름과 같다 (미러링 대조)', () => {
    // `'seabed'` 는 그 파일이 `bed.name` 에 직접 적는 문자열이고 상수가 없다. 두 곳에
    // 사는 동안 이 검사가 어긋남을 잡는다(`decide/water-y.ts` 의 `WATER_MESH_NAMES` 주석).
    const src = readFileSync('frontend/js/world-glb/features/ocean.ts', 'utf8');
    const m = src.match(/bed\.name = '([^']+)'/);
    expect(m, "`ocean.ts` 가 해저에 이름을 안 붙인다 — 목록이 낡았다").toBeTruthy();
    expect(WATER_MESH_NAMES).toContain(m![1]);
  });

  it('🔴 기능이 `ocean` **뒤** · `water-style` **앞**에 등록돼 있다 — 순서가 곧 동작이다', () => {
    // 뒤에 있으면 게임풍 수면이 옛 높이를 물고 앉는다(`features/water-lift.ts` 헤더).
    const idx = readFileSync('frontend/js/world-glb/features/index.ts', 'utf8');
    const order = ['oceanFeature,', 'waterLiftFeature,', 'waterStyleFeature,'].map((k) => idx.indexOf(k));
    expect(order.every((i) => i > 0), '기능이 목록에 없다').toBe(true);
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });
});
