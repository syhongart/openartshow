// 노말맵 강도 노브 — 판정(순수) + **집행을 three 재질 실물로**(팀장 조건 4: 텍스처가 붙었다는 것과 소비되는 것은 다른 일).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { normalKnob, NORMAL_KNOB_DEFAULT, NORMAL_KNOB_MAX } from '../frontend/js/world-glb/decide/glb-normal.js';
import { applyNormalKnob } from '../frontend/js/world-glb/systems/glb-normal.js';

describe('normalKnob — 판정', () => {
  it('없으면 기본 1, 0 은 strip, 상한 3', () => {
    expect(normalKnob(null)).toEqual({ scale: NORMAL_KNOB_DEFAULT, strip: false });
    expect(normalKnob(0)).toEqual({ scale: 0, strip: true });
    expect(normalKnob(1.5)).toEqual({ scale: 1.5, strip: false });
    expect(normalKnob(99).scale).toBe(NORMAL_KNOB_MAX);
    expect(normalKnob(NaN).scale).toBe(NORMAL_KNOB_DEFAULT);
  });
});

function scene() {
  const tex = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
  const withMap = new THREE.MeshStandardMaterial({ normalMap: tex });
  withMap.normalScale.set(1, -1);   // GLTFLoader 규약: y 는 음수
  const noMap = new THREE.MeshStandardMaterial();
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), withMap));
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), withMap));   // 같은 재질 공유 — 한 번만 곱해야 한다
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), noMap));
  return { root, withMap, noMap };
}

describe('applyNormalKnob — 집행(three 재질 실물)', () => {
  it('배율은 normalScale 에 곱하고 부호를 보존한다, 공유 재질은 한 번만', () => {
    const { root, withMap, noMap } = scene();
    const n = applyNormalKnob(root, normalKnob(1.5));
    expect(n).toBe(1);
    expect(withMap.normalScale.x).toBeCloseTo(1.5, 10);
    expect(withMap.normalScale.y).toBeCloseTo(-1.5, 10);
    expect(noMap.normalMap).toBeNull();
  });
  it('?nrm=0 은 normalMap 을 실제로 뗀다', () => {
    const { root, withMap } = scene();
    applyNormalKnob(root, normalKnob(0));
    expect(withMap.normalMap).toBeNull();
    expect(withMap.version).toBeGreaterThan(0); // needsUpdate 는 setter — version 이 올라야 파이프라인이 다시 굽는다
  });
  it('기본(1)은 산출 그대로 — normalScale 불변', () => {
    const { root, withMap } = scene();
    applyNormalKnob(root, normalKnob(null));
    expect(withMap.normalScale.x).toBe(1); expect(withMap.normalScale.y).toBe(-1);
  });
});

describe('호출처 — GLB 를 씬에 얹는 자리 한 곳', () => {
  it('glb-source.mountGlbWorld 가 opts.normalKnob 으로 applyNormalKnob 을 부르고, main.ts 는 노브를 읽어 넘긴다', () => {
    const src = readFileSync(join(__dirname, '..', 'frontend', 'js', 'world-glb', 'systems', 'glb-source.ts'), 'utf8');
    expect(src.match(/applyNormalKnob\(/g)).toHaveLength(1);
    const main = readFileSync(join(__dirname, '..', 'frontend', 'js', 'world-glb', 'main.ts'), 'utf8');
    expect(main).toMatch(/normalKnob:\s*normalKnob\(readNumOpt\('nrm'/);
    expect(main.includes('applyNormalKnob')).toBe(false);   // main 은 집행을 직접 부르지 않는다(동결 파일)
  });
});
