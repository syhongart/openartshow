// @vitest-environment jsdom
//
// 파츠 자산(지오메트리·재질) 계약 테스트.
//
// ── 왜 이 파일이 성립하는가 ──────────────────────────────────────────────────
// 파츠의 `asset(T)` 는 three 를 **인자로 받는다**(런타임 import 0). 그래서 가짜 three 를
// 넘기면 실제 자산 코드를 그대로 돌려볼 수 있다 — three 도 GPU 도 없이. 의존성 주입으로
// 얻은 이점이고, CLAUDE.md 가 "three 의존이면 스텁으로 대체해 실제 코드를 돌린다" 고
// 적어둔 그 패턴이다.
//
// ── 무엇을 잡으려는가 ────────────────────────────────────────────────────────
// **`tones` 는 색이 아니라 곱셈기다.** `instanceColor` 는 `diffuseColor *= instanceColor`
// 로 적용되므로, 재질에 `map` 이 있으면 텍스처와 곱해진다.
//
// 도로에서 이걸 놓쳤다. 다른 파츠와 같은 방식으로 어두운 회색(`0x23262b`)을 골랐더니
// 아스팔트 텍스처와 곱해져 최종 알베도가 선형 0.0003 대 — 화면에서 길이 **사실상 검정**
// 이었다. 텍스처 자체는 멀쩡했고, 코드도 타입도 테스트도 전부 통과했다. 디자이너가 fog 와
// 그림자를 차례로 꺼서 원인을 좁혀서야 잡혔다.
//
// 눈으로만 잡히는 결함은 다음에 또 난다. 검사로 만든다.

import { describe, it, expect } from 'vitest';
import { PARTS } from '../frontend/js/world2/parts/index.js';
import type { ThreeNS } from '../frontend/js/world2/parts/types.js';

/**
 * 캔버스 2D 컨텍스트 스텁. jsdom 은 `getContext('2d')` 로 null 을 준다(네이티브 canvas
 * 미설치). 절차 텍스처가 쓰는 호출만 no-op 으로 채운다 — 그림이 실제로 그려질 필요는
 * 없고, **자산 코드가 끝까지 도는 것**만 확인하면 된다.
 */
function stubCanvas2D(): void {
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
    fillRect() {}, strokeRect() {}, clearRect() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {},
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    drawImage() {}, putImageData() {},
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HTMLCanvasElement.prototype as any).getContext = () => ctx;
}

/** 최소 three 스텁. 만들어진 것을 그대로 들고 있어 나중에 들여다볼 수 있다. */
function stubThree() {
  class Geo { rotateX() { return this; } translate() { return this; } }
  class Mat { constructor(o: Record<string, unknown> = {}) { Object.assign(this, o); } }
  class Tex { colorSpace = ''; anisotropy = 0; constructor(public image: unknown) {} }
  return {
    BoxGeometry: Geo, PlaneGeometry: Geo, ConeGeometry: Geo, CylinderGeometry: Geo,
    SphereGeometry: Geo, CircleGeometry: Geo, BufferGeometry: Geo,
    MeshStandardMaterial: Mat, MeshBasicMaterial: Mat, Material: Mat,
    CanvasTexture: Tex, SRGBColorSpace: 'srgb',
  } as unknown as ThreeNS;
}

/** 곱셈기로 쓰이는 톤이 "밝다"고 볼 하한. 0xd0 = 82% */
const BRIGHT = 0xd0;

function channels(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

describe('파츠 자산 — 부팅 때 실제로 만들어진다', () => {
  it('모든 파츠가 지오메트리와 재질을 낸다', () => {
    stubCanvas2D();
    const T = stubThree();
    for (const p of PARTS) {
      const a = p.asset(T);
      expect(a.geometry, `${p.kind} 지오메트리`).toBeTruthy();
      expect(a.material, `${p.kind} 재질`).toBeTruthy();
      expect(typeof a.castShadow, `${p.kind} castShadow`).toBe('boolean');
      expect(typeof a.receiveShadow, `${p.kind} receiveShadow`).toBe('boolean');
    }
  });
});

describe('tones 는 곱셈기다 — 텍스처가 있으면 밝아야 한다', () => {
  it('map 을 쓰는 파츠의 tones 가 흰색 근처다', () => {
    stubCanvas2D();
    const T = stubThree();
    const offenders: string[] = [];

    for (const p of PARTS) {
      const mat = p.asset(T) as unknown as { material: { map?: unknown } };
      if (!mat.material.map) continue; // 텍스처가 없으면 tones 가 곧 색이다 — 자유
      for (const tone of p.tones) {
        const ch = channels(tone);
        if (ch.some((c) => c < BRIGHT)) {
          offenders.push(`${p.kind}: 0x${tone.toString(16).padStart(6, '0')} (rgb ${ch.join(',')})`);
        }
      }
    }
    // 실패 메시지에 어느 파츠의 어느 값인지 그대로 나오게 배열째 비교한다.
    expect(offenders).toEqual([]);
  });

  // 위 검사는 "텍스처가 있는 파츠가 하나라도 있어야" 의미가 있다. 전부 텍스처가 없으면
  // 루프가 한 번도 안 돌고 빈 배열이 통과한다 — **빈 표본이 단언을 통과하는** 형태이고,
  // 이 프로젝트에서 실제로 한 번 겪은 실패 방식이다(옛 임계값 때문에 표본이 비었는데
  // 빈 평균 0이 통과했다).
  it('텍스처를 쓰는 파츠가 실제로 존재한다 — 빈 표본이 통과하지 않게', () => {
    stubCanvas2D();
    const T = stubThree();
    const textured = PARTS.filter((p) => {
      const a = p.asset(T) as unknown as { material: { map?: unknown } };
      return !!a.material.map;
    });
    expect(textured.map((p) => p.kind)).toContain('road');
  });
});
