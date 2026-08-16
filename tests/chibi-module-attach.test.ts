// Ayamo 2.0 v2 의 헤어·의상 GLB 모듈 부착 — 매니페스트 게이트.
//
// ── 이 파일이 있는 이유 ──────────────────────────────────────────────────────
// `chibi-builder-v2.ts` 에 6개월간 `// 5. 모듈 부착 (헤어, 의상) — TODO: 비동기 로드`
// 와 주석 처리된 호출 한 줄이 남아 있었다. `attachModules` 자체는 완성돼 있었으므로
// 주석만 풀면 되는 것처럼 보이는데, **풀면 안 되는 상태였다**: 그 구현은 스타일 ID 를
// 그대로 파일명으로 썼고(`hair/${params.hairStyle}.glb`), `hairStyle` 은
// `chibi-schema.ts` 가 정의한 **절차적 지오메트리 스타일 ID**(`twintail`·`bob`…)이지
// 파일명이 아니다. 저장소에 `hair/`·`clothes/` 디렉터리는 존재하지 않는다.
// 즉 배선하는 순간 기본 룩(`hairStyle: 'twintail'`)부터 404 를 상시로 낸다.
//
// 그래서 매니페스트(`CHIBI_MODULE_GLB`)를 한 겹 두고 **등록된 것만 요청**하게 했다.
// 이 파일이 지키는 것은 그 성질이다 — 값이 아니라 **요청이 나가지 않는다**는 것.
//
// ── 이 파일이 못 보는 것 ─────────────────────────────────────────────────────
// `dispose()` 와 늦게 도착한 부착이 경주하는 구간은 `buildChibiV2` 안에 있고, 그것을
// 돌리려면 `mergeGeometries`·얼굴 캔버스까지 실제로 태워야 해서 여기서 보지 않는다.
// `USE_SKINNED_MESH_V2 = false` 라 그 경로는 아직 아무도 밟지 않는다 — 플래그를 켤 때
// 함께 열어야 하는 자리다.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  CHIBI_MODULE_GLB,
  resolveChibiModuleGlb,
  attachModules,
} from '../frontend/js/chibi-builder-v2.js';
import { CHIBI_HAIR_STYLES, CHIBI_OUTFITS, DEFAULT_CHIBI } from '../frontend/js/chibi-schema.js';

/** Head 본을 가진 최소 바디 — `attachModules` 가 만지는 표면만 갖췄다. */
function stubBody() {
  const head = new THREE.Bone();
  head.name = 'Head';
  head.position.set(0, 0.5, 0);
  const body: any = new THREE.Object3D();
  body.skeleton = { bones: [head] };
  return body;
}

function stubGlb(kind: 'mesh' | 'empty' = 'mesh') {
  const g = new THREE.Group();
  if (kind === 'mesh') g.add(new THREE.Mesh(new THREE.BufferGeometry()));
  return g;
}

describe('resolveChibiModuleGlb — 등록되지 않은 스타일은 주소가 없다', () => {
  it('현재 매니페스트는 비어 있고, 실제 스타일 ID 전부가 null 이다', () => {
    // 목록을 스키마에서 읽는다 — 여기 ID 를 다시 적으면 룩이 늘 때 이 검사가 뒤처진다.
    const hair = CHIBI_HAIR_STYLES.map((s: any) => resolveChibiModuleGlb('hair', s.id));
    const outfit = CHIBI_OUTFITS.map((s: any) => resolveChibiModuleGlb('outfit', s.id));
    expect(hair.filter(Boolean)).toEqual([]);
    expect(outfit.filter(Boolean)).toEqual([]);
    expect(CHIBI_MODULE_GLB.hair).toEqual({});
    expect(CHIBI_MODULE_GLB.outfit).toEqual({});
  });

  it('빈 값·none·비문자열은 null', () => {
    for (const v of [undefined, null, '', 'none', 0, {}, []]) {
      expect(resolveChibiModuleGlb('hair', v, { hair: { none: 'hair/none.glb' } })).toBeNull();
    }
  });

  it('등록된 스타일만 실제 주소가 된다', () => {
    const manifest = { hair: { twintail: 'hair/twintail.glb' }, outfit: {} };
    expect(resolveChibiModuleGlb('hair', 'twintail', manifest)).toBe(
      '/app/assets/models/hair/twintail.glb'
    );
    expect(resolveChibiModuleGlb('hair', 'bob', manifest)).toBeNull();
    expect(resolveChibiModuleGlb('outfit', 'twintail', manifest)).toBeNull();
    expect(resolveChibiModuleGlb('nope', 'twintail', manifest)).toBeNull();
  });
});

describe('attachModules — 판정이 실제로 소비된다', () => {
  it('등록이 없으면 로더를 한 번도 부르지 않는다', async () => {
    const calls: string[] = [];
    const body = stubBody();
    const attached = await attachModules(body, DEFAULT_CHIBI, {
      load: async (p: string) => {
        calls.push(p);
        return stubGlb();
      },
    });
    // 기본 룩은 hairStyle 이 'none' 이 아니다 — 그런데도 요청이 0이어야 한다.
    expect((DEFAULT_CHIBI as any).hairStyle).not.toBe('none');
    expect(calls).toEqual([]);
    expect(attached).toEqual([]);
    expect(body.children).toEqual([]);
  });

  it('등록된 스타일은 로드해서 실제로 붙인다', async () => {
    const calls: string[] = [];
    const body = stubBody();
    const attached = await attachModules(
      body,
      { hairStyle: 'twintail', outfit: 'hanbok' },
      {
        manifest: { hair: { twintail: 'hair/tt.glb' }, outfit: { hanbok: 'clothes/hanbok.glb' } },
        load: async (p: string) => {
          calls.push(p);
          return stubGlb();
        },
      }
    );
    expect(calls).toEqual([
      '/app/assets/models/hair/tt.glb',
      '/app/assets/models/clothes/hanbok.glb',
    ]);
    expect(attached).toHaveLength(2);
    expect(body.children).toHaveLength(2);
    // 헤어는 Head 본 자리에 놓인다.
    expect(attached[0].position.y).toBeCloseTo(0.5);
  });

  it('헤어 로드가 실패해도 의상은 붙는다', async () => {
    const body = stubBody();
    const attached = await attachModules(
      body,
      { hairStyle: 'twintail', outfit: 'hanbok' },
      {
        manifest: { hair: { twintail: 'hair/tt.glb' }, outfit: { hanbok: 'clothes/hanbok.glb' } },
        load: async (p: string) => {
          if (p.includes('/hair/')) throw new Error('404');
          return stubGlb();
        },
      }
    );
    expect(attached).toHaveLength(1);
    expect(body.children).toHaveLength(1);
  });

  it('GLB 안에 메시가 없으면 아무것도 붙지 않는다', async () => {
    const body = stubBody();
    const attached = await attachModules(
      body,
      { hairStyle: 'twintail' },
      {
        manifest: { hair: { twintail: 'hair/tt.glb' }, outfit: {} },
        load: async () => stubGlb('empty'),
      }
    );
    expect(attached).toEqual([]);
    expect(body.children).toEqual([]);
  });
});
