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
import { ground } from '../frontend/js/world2/parts/ground.js';
import { building } from '../frontend/js/world2/parts/building.js';
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
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, fill() {}, stroke() {},
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
  // 실제 `THREE.BufferGeometry` 가 가진 변형 메서드는 전부 갖춰 둔다. 스텁이 실제보다
  // 좁으면 **멀쩡한 코드가 여기서만 터진다** — 화분이 `scale()` 을 쓰자 실제로 그랬다.
  // (반대 방향, 즉 스텁이 실제보다 관대해서 "테스트만 통과하는 코드" 가 되는 것도 위험한데,
  // 여기 넷은 셋 다 `this` 를 돌려주는 실제 계약과 같다.)
  //
  // 나무가 재귀 가지를 **한 지오로 굽기** 시작하면서 스텁이 감당할 범위가 늘었다.
  // `applyMatrix4`·`attributes`·`setAttribute`·`toNonIndexed`·`dispose` 를 실제로 부른다.
  // 정점 배열까지 흉내 내지는 않는다 — 여기서 보는 것은 "부팅 때 자산이 만들어지는가" 이지
  // 지오메트리가 옳은 모양인가가 아니다. 다만 **호출이 존재한다는 사실**은 실제 계약과
  // 같아야 오탐이 안 난다.
  class Geo {
    index: unknown = null;
    // 실제 BufferGeometry 는 이 자리에 Float32BufferAttribute 를 담는다. 길이 0 이면
    // 병합 루프가 그냥 아무것도 안 붙이고 지나가므로 조립 경로 전체가 돈다.
    // 실제 `PlaneGeometry`·`CylinderGeometry` 는 uv 를 항상 갖는다. 나무가 텍스처를
    // 쓰면서 `attributes.uv` 를 읽기 시작했고, 없으면 여기서만 터진다.
    attributes: Record<string, { array: number[] }> = {
      position: { array: [] }, normal: { array: [] }, uv: { array: [] },
    };
    rotateX() { return this; }
    rotateY() { return this; }
    rotateZ() { return this; }
    translate() { return this; }
    scale() { return this; }
    applyMatrix4() { return this; }
    toNonIndexed() { return this; }
    setAttribute(name: string, attr: { array: number[] }) { this.attributes[name] = attr; return this; }
    dispose() {}
  }
  class Mat { constructor(o: Record<string, unknown> = {}) { Object.assign(this, o); } }
  // 실제 `CanvasTexture` 는 `repeat`·`offset`(Vector2)과 wrap 모드를 항상 갖는다.
  // 정원이 결 밀도를 맞추려 `repeat.set()` 을 부르면서 필요해졌다.
  class Tex {
    colorSpace = ''; anisotropy = 0;
    wrapS = 0; wrapT = 0;
    repeat = { x: 1, y: 1, set(x: number, y: number) { this.x = x; this.y = y; } };
    offset = { x: 0, y: 0, set(x: number, y: number) { this.x = x; this.y = y; } };
    constructor(public image: unknown) {}
  }
  class Vec2 { constructor(public x = 0, public y = 0) {} }
  /** 곱셈만 흉내 낸다 — 값은 안 보고 "호출이 이어지는가" 만 본다 */
  class Mat4 {
    makeTranslation() { return this; }
    makeRotationY() { return this; }
    makeRotationZ() { return this; }
    multiply() { return this; }
    multiplyMatrices() { return this; }
  }
  class Attr { constructor(public array: number[], public itemSize: number) {} }
  return {
    BoxGeometry: Geo, PlaneGeometry: Geo, ConeGeometry: Geo, CylinderGeometry: Geo,
    SphereGeometry: Geo, CircleGeometry: Geo, BufferGeometry: Geo, LatheGeometry: Geo,
    IcosahedronGeometry: Geo, OctahedronGeometry: Geo,
    Vector2: Vec2, Matrix4: Mat4, Float32BufferAttribute: Attr,
    MeshStandardMaterial: Mat, MeshBasicMaterial: Mat, Material: Mat,
    CanvasTexture: Tex, SRGBColorSpace: 'srgb', RepeatWrapping: 1000,
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

describe('tones 는 곱셈기다 — 텍스처나 정점색이 있으면 밝아야 한다', () => {
  // ── 검사 범위를 넓힌 이유 ──────────────────────────────────────────────────
  // 원래 `map` 만 봤다. 나무가 **정점색**으로 줄기·잎을 나누기 시작하면서 구멍이 드러
  // 났다 — 정점색도 `tones` 와 곱해지는데 이 검사는 안 보고 있었다. 나무의 tones 를
  // 옛 짙은 초록(0x2f4a3a)으로 되돌리는 뮤테이션이 **전부 통과했다.** 실제로 그 값이면
  // 초록 × 초록이라 나무가 새까맣게 죽는다.
  //
  // 곱셈기인가 아닌가를 가르는 것은 "재질에 이미 색 정보가 있는가" 이지 그 색이 텍스처
  // 에서 왔는지 정점에서 왔는지가 아니다.
  const isMultiplier = (m: { map?: unknown; vertexColors?: unknown }) => !!m.map || !!m.vertexColors;

  it('텍스처나 정점색을 쓰는 파츠의 tones 가 흰색 근처다', () => {
    stubCanvas2D();
    const T = stubThree();
    const offenders: string[] = [];

    for (const p of PARTS) {
      const mat = p.asset(T) as unknown as { material: { map?: unknown; vertexColors?: unknown } };
      if (!isMultiplier(mat.material)) continue; // 재질에 색이 없으면 tones 가 곧 색이다 — 자유
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
  // ── 역방향 (뮤테이션이 시켜서 생겼다) ─────────────────────────────────────
  // 위 검사는 "곱셈 대상이 있으면 tones 가 밝아야 한다" 다. 그 **역**은 안 보고 있었다 —
  // tones 를 흰색으로 두고 곱할 것을 빼면 그냥 **흰 판**이 되는데 아무도 안 잡는다.
  // 정원에서 텍스처를 제거하는 뮤테이션이 실제로 살아남았다.
  //
  // 흰색 근처 tones 는 "색은 다른 데서 온다" 는 선언이다. 그 다른 데가 없으면 선언이
  // 거짓이 된다.
  it('tones 가 흰색 근처인 파츠는 곱할 대상을 갖는다 — 없으면 그냥 흰 판이다', () => {
    stubCanvas2D();
    const T = stubThree();
    const offenders: string[] = [];
    for (const p of PARTS) {
      const a = p.asset(T) as unknown as { material: { map?: unknown; vertexColors?: unknown } };
      if (isMultiplier(a.material)) continue;
      // 톤이 **전부** 밝으면 색을 스스로 갖지 않겠다는 뜻이다
      const allBright = p.tones.every((t) => channels(t).every((c) => c >= BRIGHT));
      if (allBright) offenders.push(`${p.kind}: 곱할 대상 없음`);
    }
    expect(offenders).toEqual([]);
  });

  it('곱셈기를 쓰는 파츠가 실제로 존재한다 — 빈 표본이 통과하지 않게', () => {
    stubCanvas2D();
    const T = stubThree();
    const textured = PARTS.filter((p) => {
      const a = p.asset(T) as unknown as { material: { map?: unknown; vertexColors?: unknown } };
      return isMultiplier(a.material);
    });
    expect(textured.map((p) => p.kind)).toContain('road');
  });
});

// ── 지면과 도로의 명도 대비 ─────────────────────────────────────────────────
//
// **감독 실기기 판정에서 나왔다.** *"바닥 격자 바닥이 잘 드러나지 않아."*
//
// 원인은 정원이 없어서가 아니었다. 지면 톤이 `0x2a3140`(명도 19%)이고 도로 텍스처
// 베이스가 `#2a2d33`(17%)이라 **차이가 2%p 밖에 안 났다.** 길과 땅이 사실상 같은
// 색이었고, 화면에서는 통짜 검은 바닥으로 보였다.
//
// 이 종류는 눈으로만 보면 반복해서 놓친다 — 각 색은 저마다 "괜찮아 보이고", 둘을
// 나란히 놓고 명도를 재봐야 안다. 숫자로 못 박는다.
describe('바닥 대비 — 길과 땅이 갈려 보여야 한다', () => {
  /** 감마를 무시한 상대 명도. 대비 판정에는 이 정도 근사로 충분하다 */
  const luma = (hex: number) => {
    const [r, g, b] = channels(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };

  /** 도로 텍스처의 베이스 색(`parts/road.ts` 의 `#2a2d33`). 아스팔트다 */
  const ROAD_BASE = 0x2a2d33;

  it('지면이 도로보다 뚜렷이 밝다 — 2%p 차이로는 격자가 안 보인다', () => {
    const road = luma(ROAD_BASE);
    for (const tone of ground.tones) {
      // 0.15 는 "다른 재질로 읽히는" 최소 차이다. 실패했던 조합이 0.02 였다.
      expect(luma(tone) - road).toBeGreaterThan(0.15);
    }
  });

  it('건물이 지면보다 밝다 — 벽이 바닥에서 일어서 보여야 한다', () => {
    const g = Math.max(...ground.tones.map(luma));
    for (const tone of building.tones) expect(luma(tone)).toBeGreaterThan(g);
  });

  it('건물이 완전히 밝지는 않다 — 하늘 앞에서 실루엣이 살아야 한다', () => {
    for (const tone of building.tones) expect(luma(tone)).toBeLessThan(0.85);
  });
});
