// world10/systems/nyc-cell-builder.ts — **🔴 world10 이 world2 계보에서 갈리는 단 한 자리.**
//
// ── 무엇이 갈리는가 (팀장 판정 2026-09-06 「C·포크」 C2) ────────────────────
// *"갈리는 자리는 **«파셀 내용물: 파츠 조립 → 셀 GLB» 한 곳**뿐."*
//
//   world2  파셀 = `PooledParcelBuilder` 가 **파츠(건물·나무·가로등…) 배치 목록**을 슬롯에 점유
//   world10 파셀 = **셀 GLB 한 장의 메시 전부**를 슬롯에 점유
//
// **갈리는 것은 «슬롯에 무엇을 넣는가» 뿐이다.** 슬롯 풀(`systems/instancing.ts`)·스트리밍
// (`systems/streaming.ts`)·LOD·look-ahead·예산·기아 방지는 world2 원본이 그대로 돈다 —
// `ParcelBuilder` 계약을 한 글자도 안 바꾸기 때문이다.
//
// ── 왜 «셀마다 clone» 이 아니라 슬롯 풀인가 (C2 «개수 불변식 그대로») ──────
// 처음에 `template.clone()` 을 셀마다 놓는 판본을 썼고 **드로우콜이 셀 수에 비례**했다:
// 셀 하나가 메시 46개이므로 3×3 이면 **414**, 감독 예산 150 의 2.8배다. 그리고 그것은
// 이 저장소가 world1 에서 무너진 형태 그대로다 — *"양이 아니라 «새 조합이 처음 그려지는
// 것»이 비용"*(`scripts/smoke/measure-invariants.mjs` 헤더).
//
// 슬롯 풀에 넣으면 **드로우콜이 셀 수와 무관하게 상수(메시 종류 수)** 다. 셀이 뜨고 지는 것은
// 인스턴스 행렬 하나를 쓰고 지우는 일이라 새 지오·재질·파이프라인이 **0** 이고, 그것이
// `[7]` 개수 불변식 게이트가 지키는 바로 그 성질이다. world2 가 파셀 스파이크를 없앤 처방을
// **그대로** 쓰는 것이다(옮겨 적은 것이 아니라 같은 `InstancePools` 를 부른다).
//
// ── 왜 셀마다 GLB 를 새로 받지 않는가 (C3) ──────────────────────────────────
// 팀장 조건 C3: *"텍스처·재질은 **공용 1회 로드**(셀 GLB 임베드 금지)."*
// `scripts/asset/nyc/glb-build.mjs` 는 텍스처를 GLB 안에 **임베드한다**(실측 6장 2.45MiB /
// 3.13MiB 파일). 셀마다 다른 GLB 를 받으면 그 2.45MiB 가 셀 수만큼 곱해져 3×3 에서 22MiB —
// 초기 예산 10MiB 의 두 배다. **한 장을 받아 슬롯에 반복 배치하면 지오·재질·텍스처가 한 벌**
// 이고, 그것이 C3 를 구조적으로 만족시킨다.
//
// ⚠ **이 선택의 대가**: 모든 셀이 같은 거리다. 셀마다 다른 내용은 «생성기에 seed 를 줘 N 장
// 산출» 하는 축이고, 그것은 **텍스처를 GLB 밖으로 빼낸 뒤에야** C3 를 만족한다 — 지금 그 축을
// 여는 것은 예산 조건을 어기는 일이다(백로그로 남긴다).
//
// ── ⚠ 못 하는 것 ───────────────────────────────────────────────────────────
// · **셀 GLB 의 메시 노드가 항등 변환이어야 한다.** `scripts/asset/nyc/` 는 지오메트리를
//   월드 좌표로 굽고 노드에 변환을 안 걸므로 성립한다(실측). 성립하지 않는 GLB 가 오면
//   **조용히 어긋나게 두지 않고 던진다** — `collectCellParts` 의 검사.
// · **LOD 로 내용이 줄지 않는다.** 셀 GLB 에 tier 별 판본이 없다(`retier` 주석).

import * as THREE from 'three/webgpu';
import type { Object3D } from 'three/webgpu';
import type { InstancePools, SlotHandle } from './instancing.js';
import type { ParcelBuilder, ParcelHandle } from './streaming.js';
import { parcelKey, type ParcelKey } from '../decide/stream.js';
import { maxLatticePoints, tierReach, type Tier, type TierBands } from '../decide/lod.js';
import { NYC_CELL, nycCellAt, type NycCell } from './nyc-parcels.js';

/** 풀 하나가 될 «셀의 메시 한 종류» */
export interface CellPart {
  key: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow: boolean;
  receiveShadow: boolean;
}

/** 셀마다 세울 점광 하나 — 값은 **템플릿에 이미 선 라이트에서 읽는다**(노브를 다시 읽지 않는다) */
export interface CellLight {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  intensity: number;
}

/**
 * 동시에 뜰 수 있는 파셀 수 — **밴드에서 유도한다.**
 *
 * world2 가 `MAX_PARCELS = 20` 이라는 근거 없는 상수를 없애고 쓰는 식 그대로다
 * (`decide/lod.ts` `maxLatticePoints` 헤더: 실측 최대에 눈대중 여유를 얹은 값이 이론
 * 최악치보다 작았고, 예산의 여유 배수가 그 부족을 가리고 있었다). 밴드를 넓히면 예산이
 * **저절로** 따라온다 — 여기 숫자를 적으면 그 연동이 끊긴다.
 */
export function maxCells(bands: TierBands): number {
  return maxLatticePoints(tierReach('far', bands));
}

/**
 * 셀 템플릿에서 풀 명세를 뽑는다. **인스턴싱 «전» 트리를 준다** — 되묶은 뒤에는 한 종류가
 * `InstancedMesh` 한 노드라 원래의 (지오, 재질) 짝을 잃는다.
 *
 * ⚠ **노드 변환이 항등이 아니면 던진다.** 슬롯 풀의 `setTransform` 은 «위치 + y 회전 + 스케일»
 * 까지만 표현하므로, 임의 변환이 걸린 GLB 를 조용히 받으면 그 메시가 **엉뚱한 자리에 선다.**
 * 「판정 불가 = 통과」가 아니라 「판정 불가 = 멈춤」이다.
 */
export function collectCellParts(root: Object3D): CellPart[] {
  root.updateMatrixWorld(true);
  const out: CellPart[] = [];
  const seen = new Set<string>();
  root.traverse((o: Object3D) => {
    const m = o as unknown as {
      isMesh?: boolean; geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[];
      castShadow?: boolean; receiveShadow?: boolean; name?: string; matrixWorld: THREE.Matrix4;
    };
    if (!m.isMesh || !m.geometry || !m.material) return;
    if (Array.isArray(m.material)) throw new Error(`[world10] 다중 재질 메시는 셀 슬롯으로 못 옮긴다: ${m.name}`);
    // 항등 검사 — `Matrix4.elements` 는 열 우선 16개다.
    const e = m.matrixWorld.elements;
    const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    for (let i = 0; i < 16; i++) {
      if (Math.abs(e[i] - I[i]) > 1e-6) {
        throw new Error(`[world10] 셀 GLB 의 메시 노드에 변환이 있다 — 슬롯 풀로 못 옮긴다: ${m.name}`);
      }
    }
    // 이름이 겹치면 풀 키가 겹쳐 `InstancePools.create` 가 던진다. 그 전에 여기서 유일하게 만든다 —
    // 던지는 쪽 메시지가 «중복 풀 키» 라 원인(GLB 노드 이름 중복)이 안 보인다.
    let key = `cell:${m.name || 'unnamed'}`;
    if (seen.has(key)) {
      let n = 2;
      while (seen.has(`${key}#${n}`)) n++;
      key = `${key}#${n}`;
    }
    seen.add(key);
    out.push({
      key,
      geometry: m.geometry,
      material: m.material,
      castShadow: !!m.castShadow,
      receiveShadow: !!m.receiveShadow,
    });
  });
  return out;
}

/**
 * 셀 템플릿에 이미 선 점광을 읽는다. **색·강도를 여기서 다시 판정하지 않는다** —
 * `?pli=` 판정은 `decide/glb-nodes.ts` 한 곳이고 `mountGlbWorld` 가 이미 그것을 적용해
 * 라이트를 세웠다. 그 실물에서 읽으면 값 미러링이 생기지 않는다.
 */
export function collectCellLights(root: Object3D): CellLight[] {
  const out: CellLight[] = [];
  root.traverse((o: Object3D) => {
    const l = o as unknown as {
      isPointLight?: boolean; position: THREE.Vector3; color: THREE.Color; intensity: number;
    };
    if (!l.isPointLight) return;
    out.push({ x: l.position.x, y: l.position.y, z: l.position.z, color: l.color.clone(), intensity: l.intensity });
  });
  return out;
}

export interface NycCellBuilderOptions {
  /** 셀 슬롯 풀. **셀 전용 풀**이다 — 파츠 풀과 섞지 않는다(키 충돌·예산 혼동) */
  pools: InstancePools;
  /** 풀 명세(= `collectCellParts` 산출). 부팅 중에 이미 `pools.create` 된 것들이어야 한다 */
  parts: readonly CellPart[];
  /** 셀마다 세울 점광 */
  lights?: readonly CellLight[];
  /** 점광이 붙는 자리(씬 안). 라이트는 인스턴싱 대상이 아니라 노드로 선다 */
  lightParent?: { add(o: never): void; remove(o: never): void };
  /** 레이캐스트용 셀 트리의 템플릿(인스턴싱 **전**). 셀마다 복제한다 */
  collisionTemplate: Object3D;
  /** 레이캐스트 트리가 붙는 자리 — **씬 밖**이다(그리지 않는다) */
  collisionParent: { add(o: never): void; remove(o: never): void };
  /** 셀 한 변(m). 기본은 `NYC_CELL` */
  cell?: number;
  /**
   * 떠 있는 셀 집합이 바뀔 때마다 불린다. 조립부가 **충돌 무효화**와 **지도 다시 굽기**를 문다.
   *
   * world2 는 이 알림이 `village-parcels.onChange`(편집 저장)였다 — world10 은 편집이 아니라
   * **스트리밍 자체**가 세계를 바꾸므로 그 자리가 이쪽으로 온다.
   */
  onCells?: (loaded: number) => void;
}

interface CellHandle extends ParcelHandle {
  key: ParcelKey;
  tier: Tier;
  px: number;
  pz: number;
  slots: SlotHandle[];
  lights: Object3D[];
  collide: Object3D;
}

/**
 * tier 별 예상 비용(ms). 스트리밍의 **예산 산정에만** 쓴다 — 틀려도 기아 방지 규약이 막는다
 * (`streaming.ts` `costOf`). 셀 내용이 tier 와 무관하므로 **한 값**이다: 여기에 tier 별로 다른
 * 숫자를 적으면 «tier 로 비용이 갈린다» 는 거짓을 스트리밍에 말하게 된다.
 */
const CELL_COST_MS = 1.5;

/** 파셀 = 셀 GLB 한 장. `ParcelBuilder` 구현 — 스트리밍은 이 파일의 존재를 모른다 */
export class NycCellBuilder implements ParcelBuilder {
  private readonly o: NycCellBuilderOptions;
  private readonly cell: number;
  private readonly live = new Map<ParcelKey, CellHandle>();
  private builtCount = 0;
  /** 슬롯을 못 얻은 횟수. 0 이 아니면 `maxCells` 예산이 틀린 것이다(world2 `starved` 와 같은 축) */
  private starvedCount = 0;

  constructor(opts: NycCellBuilderOptions) {
    this.o = opts;
    this.cell = opts.cell ?? NYC_CELL;
  }

  /** 이 좌표에 놓일 셀의 결정적 내용. 판정은 `nyc-parcels.ts` 가 갖는다 */
  cellAt(px: number, pz: number): NycCell {
    return nycCellAt(px, pz);
  }

  build(px: number, pz: number, tier: Exclude<Tier, 'none'>): ParcelHandle {
    const key = parcelKey(px, pz);
    // 스트리밍은 같은 파셀을 두 번 만들지 않는다(want 차분). 그래도 막는다 — 두 벌이 겹치면
    // **모든 면이 동일 평면·같은 방향**이 되어 감독이 2026-09-06 에 지적한 «우글우글» 이
    // 세계 전체에 깔린다. 조용히 겹치게 두는 것이 최악이다.
    const existing = this.live.get(key);
    if (existing) return existing;

    const c = nycCellAt(px, pz);
    const ox = c.px * this.cell;
    const oz = c.pz * this.cell;

    const slots: SlotHandle[] = [];
    for (const part of this.o.parts) {
      const h = this.o.pools.acquire(part.key);
      if (!h) { this.starvedCount++; continue; }
      // 저작 지오메트리가 이미 월드 좌표라 **평행이동만** 하면 된다(`collectCellParts` 의 항등 검사).
      this.o.pools.setTransform(h, ox, 0, oz);
      slots.push(h);
    }

    const lights: Object3D[] = [];
    if (this.o.lightParent) {
      for (const l of this.o.lights ?? []) {
        const pl = new THREE.PointLight(l.color, l.intensity);
        pl.position.set(l.x + ox, l.y, l.z + oz);
        pl.name = `world10:cell-light:${key}`;
        (this.o.lightParent as unknown as { add(o: unknown): void }).add(pl);
        lights.push(pl as unknown as Object3D);
      }
    }

    const collide = this.o.collisionTemplate.clone(true);
    collide.name = `world10:cell-collide:${key}`;
    (collide as unknown as { position: THREE.Vector3 }).position.set(ox, 0, oz);
    (this.o.collisionParent as unknown as { add(o: unknown): void }).add(collide);

    const h: CellHandle = { key, tier, px: c.px, pz: c.pz, slots, lights, collide };
    this.live.set(key, h);
    this.builtCount++;
    this.o.onCells?.(this.live.size);
    return h;
  }

  release(handle: ParcelHandle): void {
    const h = this.live.get(handle.key);
    if (!h) return;
    this.live.delete(h.key);
    for (const s of h.slots) this.o.pools.release(s);
    for (const l of h.lights) (this.o.lightParent as unknown as { remove(o: unknown): void } | undefined)?.remove(l);
    (this.o.collisionParent as unknown as { remove(o: unknown): void }).remove(h.collide);
    this.o.onCells?.(this.live.size);
  }

  /**
   * tier 만 바꾼다. **셀 내용은 tier 와 무관하므로 언제나 성공한다** — 재생성이 0 이다.
   *
   * world2 의 `retier` 가 싼 이유(판정 계층이 «tier 는 «무엇을» 만 줄이지 «어디에» 는 안
   * 바꾼다» 를 보장)의 극단이다: 여기서는 줄일 것조차 없다. 그래서 near↔mid↔far 이동은
   * `release → build` 로 떨어지지 않는다 — 그 경로가 world2 에서 스파이크의 원인이었다.
   *
   * ⚠ **그래서 LOD 가 삼각형을 안 줄인다.** 「멀면 덜 그린다」가 이 세계에는 없고, 컬링은
   * 파셀 자체가 far 밖으로 나갈 때만 일어난다. 셀 GLB 에 tier 판본을 넣는 축은 별도 회차다.
   */
  retier(handle: ParcelHandle, tier: Exclude<Tier, 'none'>): ParcelHandle | null {
    const h = this.live.get(handle.key);
    if (!h) return null;
    h.tier = tier;
    return h;
  }

  costOf(): number {
    return CELL_COST_MS;
  }

  /** 진단 — HUD·리포트가 읽는다. `starved` 는 world2 와 **같은 뜻**(슬롯이 모자랐다) */
  stats(): { loaded: number; built: number; starved: number } {
    return { loaded: this.live.size, built: this.builtCount, starved: this.starvedCount };
  }

  /** 떠 있는 셀 좌표 목록(정렬 고정) — 실측·테스트가 읽는다 */
  loadedKeys(): ParcelKey[] {
    return [...this.live.keys()].sort();
  }
}
