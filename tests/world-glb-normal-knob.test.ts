// 노말맵 강도 노브 — 판정(순수) + **집행을 three 재질 실물로**(팀장 조건 4: 텍스처가 붙었다는 것과 소비되는 것은 다른 일).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { normalKnob, NORMAL_KNOB_DEFAULT, NORMAL_KNOB_MAX } from '../frontend/js/world-glb/decide/glb-normal.js';
import { applyNormalKnob } from '../frontend/js/world-glb/systems/glb-normal.js';

describe('normalKnob — 판정', () => {
  it('없으면 기본값, 0 은 strip, 상한 3', () => {
    expect(normalKnob(null)).toEqual({ scale: NORMAL_KNOB_DEFAULT, strip: false });
    expect(normalKnob(0)).toEqual({ scale: 0, strip: true });
    expect(normalKnob(1.5)).toEqual({ scale: 1.5, strip: false });
    expect(normalKnob(99).scale).toBe(NORMAL_KNOB_MAX);
    expect(normalKnob(NaN).scale).toBe(NORMAL_KNOB_DEFAULT);
  });

  // ⚠ 위 단언들은 전부 `NORMAL_KNOB_DEFAULT` 를 **참조**한다 — 상수를 무엇으로 바꿔도 초록이다.
  // 감독이 카드로 고른 값 자체를 못 박는 자리가 필요하다(2026-09-06 «더 약하게(0.6)»).
  it('기본값은 0.6 이다 — 감독 카드 판정 2026-09-06(값 자체를 못 박는다)', () => {
    expect(NORMAL_KNOB_DEFAULT).toBe(0.6);
    // 판정의 방향: 「뗀다(0)」가 아니라 「얕게 한다」였다.
    expect(NORMAL_KNOB_DEFAULT).toBeGreaterThan(0);
    expect(NORMAL_KNOB_DEFAULT).toBeLessThan(1);
    expect(normalKnob(null).strip).toBe(false);
  });

  it('소수 기본값이 파서·상한과 정합한다 — 0 과 3 사이의 소수도 그대로 통과한다', () => {
    // `main.ts` 는 `readNumOpt('nrm', 0, NORMAL_KNOB_MAX)` 로 읽는다(정수 강제가 없다).
    expect(normalKnob(0.6)).toEqual({ scale: 0.6, strip: false });
    expect(normalKnob(NORMAL_KNOB_DEFAULT)).toEqual(normalKnob(null));   // 명시 지정 = 기본
    expect(normalKnob(-1).scale).toBe(0);       // 하한 클램프는 strip 과 같은 화면
    expect(normalKnob(-1).strip).toBe(true);
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
  // ⚠ **이 검사는 값이 바뀌어 고쳤다**(2026-09-06). 옛 제목은 「기본(1)은 산출 그대로 —
  // normalScale 불변」이었고, 그 단언이 참이던 이유는 **기본값이 1 이라 곱셈이 항등이었기
  // 때문**이다. 감독 카드가 기본값을 0.6 으로 정하면서 그 전제가 사라졌다 — 단언을 약하게
  // 만든 것이 아니라 **재는 축을 유지한 채** 두 갈래로 나눴다: 「기본값이 실제로 곱해지는가」
  // (아래 첫 번째, 옛 검사보다 강하다 — 항등이면 통과하던 것이 이제 안 통과한다)와
  // 「`?nrm=1` 은 여전히 산출 그대로인가」(두 번째, 옛 축을 그대로 보존).
  it('기본값(0.6)이 산출에 실제로 곱해진다 — 항등이 아니다', () => {
    const { root, withMap } = scene();
    applyNormalKnob(root, normalKnob(null));
    expect(withMap.normalScale.x).toBeCloseTo(NORMAL_KNOB_DEFAULT, 10);
    expect(withMap.normalScale.y).toBeCloseTo(-NORMAL_KNOB_DEFAULT, 10);
    expect(withMap.normalScale.x).not.toBe(1);   // 「기본 = 산출 그대로」로 되돌아가면 깨진다
  });

  it('`?nrm=1` 은 산출 그대로다 — 대조군 축은 그대로 산다', () => {
    const { root, withMap } = scene();
    applyNormalKnob(root, normalKnob(1));
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
