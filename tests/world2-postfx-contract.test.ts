// @vitest-environment jsdom
//
// 후보정 조립이 **실물 three 에서 성립하는가** — mock 을 쓰지 않는 유일한 축.
//
// ── 왜 이 파일이 생겼나 (검수관 판정 ②, 2026-08-21) ─────────────────────────
// `tests/world2-postfx-time.test.ts` 는 `three/webgpu`·`three/tsl` 을 `vi.mock` 해
// **세기 계산**을 잰다. 그 방식이 아니면 잴 수 없는 축이고 실제로 여러 결함을 잡았다.
// 그러나 그 스텁이 **실제 계약과 어긋나면 아무도 모른다** — 라이브에서만 터진다.
//
// 그래서 여기서는 mock 을 하나도 쓰지 않고 조립 전 구간을 태운다. three 를 판올림하다
// `PassNode` 의 MRT API 가 바뀌면 여기가 먼저 빨간불이 된다.
//
// ── 이 파일이 **못 보는 것** (통과로 적지 않는다) ───────────────────────────
// 🔴 **채널 이름의 정당성.** 실측: `getTextureNode('없는이름')` 이 **예외 없이 노드를
// 돌려준다.** 즉 이름을 오타 내도 조립은 성공하고 화면에서만 드러난다 — mock 이든 실물이든
// 이 축은 열려 있다(검수관 실측). 아래 검사가 이름을 문자열로 못 박는 것이 지금의 유일한
// 방어이고, 그것은 계약 검증이 아니라 **표기 고정**이다.
//
// 🔴 **렌더.** WebGPU 어댑터가 없으므로 실제 렌더는 안 돈다. 셰이더 컴파일 실패가 조립
// 시점의 `catch` 로 가는지도 못 본다 — 감독 실기기가 유일한 축이다(`G-DAYLIT1`).

import { describe, it, expect } from 'vitest';
import * as THREE from 'three/webgpu';
import { pass, mrt, output, emissive } from 'three/tsl';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { BLOOM_THRESHOLD } from '../frontend/js/world2/features/postfx-params.js';

describe('🔴 GD-9 — 발광 채널 블룸 조립이 실물 three 에서 성립한다', () => {
  it('🔴 pass → setMRT → getTextureNode → bloom → add 전 구간이 돈다', () => {
    const scenePass = pass(new THREE.Scene(), new THREE.PerspectiveCamera()) as unknown as {
      setMRT(v: unknown): void;
      getMRT(): { get?(k: string): unknown } | null;
      getTextureNode(name: string): { add(x: unknown): unknown };
    };
    expect(typeof scenePass.setMRT, '🔴 PassNode 에 setMRT 가 없다 — three 판올림으로 계약이 깨졌다')
      .toBe('function');
    expect(typeof scenePass.getTextureNode, '🔴 PassNode 에 getTextureNode 가 없다').toBe('function');

    scenePass.setMRT(mrt({ output, emissive }));
    const emissiveNode = scenePass.getTextureNode('emissive');
    expect(emissiveNode, '🔴 발광 채널 노드를 못 얻었다').toBeTruthy();

    const b = bloom(emissiveNode as never, 1.15, 0.07, BLOOM_THRESHOLD) as unknown as {
      strength?: { value: number };
    };
    expect(b?.strength?.value, '🔴 bloom() 이 세기를 안 들고 있다 — 시간대 반영이 죽는다')
      .toBeCloseTo(1.15, 6);

    const composed = scenePass.getTextureNode('output').add(b);
    expect(composed, '🔴 원본 위에 얹는 합성이 안 만들어졌다').toBeTruthy();
  });

  it('`three/tsl` 이 MRT 세 심볼을 준다 — 하나라도 빠지면 조립이 통째로 못 선다', () => {
    expect(typeof mrt).toBe('function');
    expect(output).toBeTruthy();
    expect(emissive).toBeTruthy();
  });
});
