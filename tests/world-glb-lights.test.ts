// world-glb lights — light node 생성 및 SSOT 검증
//
// generate.mjs 가 방 라이트 노드를 생성하고, glb-nodes.ts 의 SSOT 와 일관성 있게
// 연결되는지 확인한다. mountGlbWorld 의 PointLight 생성은 통합 테스트 대상이다.

import { describe, it, expect } from 'vitest';
import { buildStreet } from '../scripts/asset/nyc/generate.mjs';
import { isRoomLightNode, ROOM_LIGHT_SUFFIX } from '../frontend/js/world-glb/decide/glb-nodes.js';

describe('world-glb — light node generation and SSOT', () => {
  const { json: built } = buildStreet({ seed: 1, textures: false }) as {
    json: { nodes: Array<{ name: string; mesh?: number; translation?: number[] }> };
  };

  it('모든 .light 노드는 isRoomLightNode 패턴을 만족한다', () => {
    // generate.mjs 가 만드는 모든 light node 이름이 규약을 따르는지 확인
    const lightNodes = built.nodes.filter((n) => n.name.endsWith(ROOM_LIGHT_SUFFIX));
    expect(lightNodes.length).toBeGreaterThan(0);

    for (const node of lightNodes) {
      expect(isRoomLightNode(node.name)).toBe(true);
      // 패턴: bld.<id>.room.<r>.light (숫자만 들어감)
      expect(node.name).toMatch(/^bld\.\d+\.room\.\d+\.light$/);
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

  it('갤러리(bld.2) 방 내 라이트는 정확히 1개다', () => {
    const galleryLights = built.nodes.filter(
      (n) => n.name.startsWith('bld.2.room.') && isRoomLightNode(n.name),
    );
    expect(galleryLights).toHaveLength(1);
    expect(galleryLights[0].name).toBe('bld.2.room.1.light');
  });

  it('isRoomLightNode 와 ROOM_LIGHT_SUFFIX 가 일관성 있게 동작한다', () => {
    // 단언: isRoomLightNode 정규식의 역방향 검증
    // 1. 패턴 매칭이 정확히 숫자만 받는가
    expect(isRoomLightNode('bld.2.room.1.light')).toBe(true);
    expect(isRoomLightNode('bld.02.room.01.light')).toBe(true); // leading zero OK
    expect(isRoomLightNode('bld.2.room.1.lightX')).toBe(false); // 접미사 다름
    expect(isRoomLightNode('bld.x.room.1.light')).toBe(false); // 숫자 아님
    expect(isRoomLightNode('bld.2.room.1')).toBe(false); // 접미사 없음

    // 2. ROOM_LIGHT_SUFFIX 로 끝나는 노드 = isRoomLightNode 로 검증 가능
    const allWithSuffix = built.nodes.filter((n) => n.name.endsWith(ROOM_LIGHT_SUFFIX));
    for (const node of allWithSuffix) {
      expect(isRoomLightNode(node.name)).toBe(true);
    }
  });

  it('다른 건물 방들에도 라이트 노드가 있거나 없는 상태가 일관성 있다', () => {
    // 방이 있는 건물은 bld.2 뿐이라고 알려져 있으므로,
    // 다른 건물에 방이 없거나 있더라도 패턴이 일관성 있어야 한다
    const roomLights = built.nodes.filter((n) => isRoomLightNode(n.name));

    // 모두 bld.2 방에 속함
    for (const light of roomLights) {
      expect(light.name).toMatch(/^bld\.2\.room\.\d+\.light$/);
    }
  });
});
