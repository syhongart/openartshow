// @vitest-environment jsdom
//
// world3(포근마을) 파츠 자산 계약 + **팔레트 규약.**
//
// ── 왜 world2 것을 복사하지 않고 새로 쓰는가 ────────────────────────────────
// `tests/world2-parts-assets.test.ts` 는 world2 트리를 검사한다. 두 트리는 의도적으로
// 분기했고(`frontend/js/world3/README.md`) 룩이 정반대다 — world2 는 어두운 도시,
// world3 는 파스텔 마을이다. 그래서 **같은 검사가 아니라 같은 성격의 검사**가 필요하다:
// world2 의 *"건물이 지면보다 밝다"* 는 회청색 벽 기준이고, 여기서는 정점색을 굽기
// 때문에 `tones` 가 아니라 **팔레트를 봐야** 같은 것을 재게 된다.
//
// ── 이 파일에만 있는 축: 색 리터럴 금지 ─────────────────────────────────────
// world2 에는 중앙 팔레트가 없었다 — 색 hex 가 파츠 13개 파일에 47곳 하드코딩돼 있었고,
// 그래서 "테마만 바꾸기" 가 불가능했다. **그 사실이 이 포크의 착수 근거다.**
// 포크하면서 팔레트(`parts/palette.ts`)를 만들었는데, 규약을 검사로 만들지 않으면
// 다음 사람이 편한 자리에 `0xff6b6b` 한 줄을 적고 그때부터 팔레트는 절반만 참이 된다.
// **아무 마찰 없이 되는 일은 반드시 다시 일어난다** — 이 저장소가 반복해서 배운 것이다.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PARTS } from '../frontend/js/world3/parts/index.js';
import { ground } from '../frontend/js/world3/parts/ground.js';
import { road } from '../frontend/js/world3/parts/road.js';
import { building } from '../frontend/js/world3/parts/building.js';
import { V, TINT_SET, luma } from '../frontend/js/world3/parts/palette.js';
import type { ThreeNS } from '../frontend/js/world3/parts/types.js';

/**
 * ⚠️ `new URL('…', import.meta.url).pathname` 을 쓰지 마라 — **이 파일은 jsdom
 * 환경이다.** jsdom 에서 `import.meta.url` 은 파일 URL 이 아니라 문서 기준 URL 이라
 * `pathname` 이 `/frontend/js/…` 로 나오고, 실측에서 그대로 `ENOENT: scandir
 * '/frontend/js/world3/parts/index.ts'` 로 죽었다.
 *
 * `tests/world3-independence.test.ts` 는 같은 표현을 쓰고도 멀쩡한데, 그쪽은 node
 * 환경이라서다 — **같은 코드가 환경에 따라 다른 것을 가리킨다.** vitest 는 프로젝트
 * 루트에서 돌므로 `process.cwd()` 가 두 환경에서 모두 같은 곳을 가리킨다.
 */
const PARTS_DIR = join(process.cwd(), 'frontend/js/world3/parts');

/**
 * 캔버스 2D 컨텍스트 스텁. jsdom 은 `getContext('2d')` 로 null 을 준다(네이티브 canvas
 * 미설치). 절차 텍스처가 쓰는 호출만 no-op 으로 채운다 — 그림이 실제로 그려질 필요는
 * 없고, **자산 코드가 끝까지 도는 것**만 확인하면 된다.
 */
function stubCanvas2D(): void {
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, lineCap: '', lineJoin: '',
    font: '', textAlign: '', textBaseline: '', filter: '',
    fillRect() {}, strokeRect() {}, clearRect() {}, fillText() {}, strokeText() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    ellipse() {}, rect() {}, quadraticCurveTo() {}, bezierCurveTo() {}, fill() {}, stroke() {},
    clip() {}, setLineDash() {},
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, transform() {},
    drawImage() {}, putImageData() {},
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    measureText: () => ({ width: 0 }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HTMLCanvasElement.prototype as any).getContext = () => ctx;
}

/**
 * 최소 three 스텁. **스텁이 실제보다 좁으면 멀쩡한 코드가 여기서만 터진다** —
 * world2 에서 화분이 `scale()` 을 쓰자 실제로 그랬다. 마을 개조로 조각 수가 늘었으므로
 * 지오메트리 종류를 넉넉히 열어 둔다.
 */
function stubThree() {
  class Geo {
    index: unknown = null;
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
    computeVertexNormals() { return this; }
    setAttribute(name: string, attr: { array: number[] }) { this.attributes[name] = attr; return this; }
    dispose() {}
  }
  class Mat { constructor(o: Record<string, unknown> = {}) { Object.assign(this, o); } }
  class Tex {
    colorSpace = ''; anisotropy = 0; needsUpdate = false;
    wrapS = 0; wrapT = 0; magFilter = 0; minFilter = 0;
    repeat = { x: 1, y: 1, set(x: number, y: number) { this.x = x; this.y = y; } };
    offset = { x: 0, y: 0, set(x: number, y: number) { this.x = x; this.y = y; } };
    constructor(public image: unknown) {}
  }
  class Vec2 { constructor(public x = 0, public y = 0) {} set(x: number, y: number) { this.x = x; this.y = y; return this; } }
  class Vec3 { constructor(public x = 0, public y = 0, public z = 0) {} set() { return this; } normalize() { return this; } }
  class Mat4 {
    makeTranslation() { return this; }
    makeRotationX() { return this; }
    makeRotationY() { return this; }
    makeRotationZ() { return this; }
    makeScale() { return this; }
    multiply() { return this; }
    multiplyMatrices() { return this; }
  }
  class Attr { constructor(public array: number[], public itemSize: number) {} }
  class Col { constructor(public v?: unknown) {} setHex() { return this; } }
  return {
    BoxGeometry: Geo, PlaneGeometry: Geo, ConeGeometry: Geo, CylinderGeometry: Geo,
    SphereGeometry: Geo, CircleGeometry: Geo, BufferGeometry: Geo, LatheGeometry: Geo,
    IcosahedronGeometry: Geo, OctahedronGeometry: Geo, TorusGeometry: Geo,
    DodecahedronGeometry: Geo, TetrahedronGeometry: Geo, RingGeometry: Geo,
    Vector2: Vec2, Vector3: Vec3, Matrix4: Mat4, Float32BufferAttribute: Attr, Color: Col,
    MeshStandardMaterial: Mat, MeshBasicMaterial: Mat, MeshLambertMaterial: Mat, Material: Mat,
    CanvasTexture: Tex, SRGBColorSpace: 'srgb', RepeatWrapping: 1000, ClampToEdgeWrapping: 1001,
    DoubleSide: 2, FrontSide: 0, BackSide: 1,
    NearestFilter: 1003, LinearFilter: 1006,
  } as unknown as ThreeNS;
}

/** 곱셈기로 쓰이는 톤이 "밝다"고 볼 하한. 0xd0 = 82% */
const BRIGHT = 0xd0;

function channels(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

const isMultiplier = (m: { map?: unknown; vertexColors?: unknown }) => !!m.map || !!m.vertexColors;

function materialOf(p: (typeof PARTS)[number]) {
  stubCanvas2D();
  return (p.asset(stubThree()) as unknown as {
    material: { map?: unknown; vertexColors?: unknown };
  }).material;
}

describe('파츠 자산 — 부팅 때 실제로 만들어진다', () => {
  it('표본이 비어 있지 않다', () => {
    // 빈 배열은 아래 루프를 **전부 통과시킨다.** 이 저장소가 실제로 당한 형태다.
    expect(PARTS.length).toBeGreaterThan(8);
  });

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
  // world2 가 도로에서 이 사고를 냈다: 어두운 회색 tones 를 아스팔트 텍스처에 곱해
  // 최종 알베도가 선형 0.0003 — 화면에서 길이 사실상 검정이었다. 코드·타입·테스트가
  // 전부 통과했고 눈으로만 잡혔다.
  //
  // 마을 개조로 **위험이 오히려 커졌다** — 이제 거의 모든 파츠가 정점색을 굽는다.
  it('텍스처나 정점색을 쓰는 파츠의 tones 가 흰색 근처다', () => {
    const offenders: string[] = [];
    for (const p of PARTS) {
      if (!isMultiplier(materialOf(p))) continue;
      for (const tone of p.tones) {
        const ch = channels(tone);
        if (ch.some((c) => c < BRIGHT)) {
          offenders.push(`${p.kind}: 0x${tone.toString(16).padStart(6, '0')} (rgb ${ch.join(',')})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('tones 가 흰색 근처인 파츠는 곱할 대상을 갖는다 — 없으면 그냥 흰 판이다', () => {
    // 역방향. tones 를 흰색으로 두고 곱할 것을 빼면 흰 판이 되는데 위 검사는 못 잡는다.
    // world2 에서 정원 텍스처를 제거하는 뮤테이션이 실제로 살아남았다.
    const offenders: string[] = [];
    for (const p of PARTS) {
      if (isMultiplier(materialOf(p))) continue;
      const allBright = p.tones.every((t) => channels(t).every((c) => c >= BRIGHT));
      if (allBright) offenders.push(`${p.kind}: 곱할 대상 없음`);
    }
    expect(offenders).toEqual([]);
  });

  it('곱셈기를 쓰는 파츠가 실제로 존재한다 — 빈 표본이 통과하지 않게', () => {
    const multi = PARTS.filter((p) => isMultiplier(materialOf(p))).map((p) => p.kind);
    expect(multi).toContain('building'); // 마을 집은 정점색으로 벽·지붕을 나눈다
    expect(multi.length).toBeGreaterThan(3);
  });

  it('`TINT_SET` 자체가 규약을 지킨다 — 파츠가 그걸 그대로 쓴다', () => {
    // 파츠가 `TINT_SET` 을 참조하므로, 여기가 어두워지면 **모든 파츠가 한꺼번에**
    // 죽는다. 파츠별 검사보다 앞단에서 못 박는다.
    for (const t of TINT_SET) {
      const ch = channels(t);
      expect(ch.every((c) => c >= BRIGHT), `TINT_SET 0x${t.toString(16)}`).toBe(true);
    }
    expect(TINT_SET.length).toBeGreaterThan(2);
  });
});

// ── 팔레트 대비 ─────────────────────────────────────────────────────────────
//
// world2 의 같은 축은 `tones` 를 봤다. 마을에서는 색이 **정점에** 있으므로 tones 를
// 봐서는 아무것도 재지 못한다 — 전부 흰색 근처라 서로 대비가 0 이다. 재는 축을
// 팔레트로 옮긴다. *"참인 문장에서 성립하지 않는 결론을 뽑는 것 — 값이 아니라 재는
// 축이 틀린다"* 가 이 저장소의 상시 위험이다.
describe('팔레트 대비 — 길·땅·집이 서로 갈려 보여야 한다', () => {
  // ── ⚠️ 이 검사의 첫 판본은 **검출력이 0 이었다** (랜드마크 담당이 잡음) ────
  //
  // 처음에는 `luma(V.dirt) - luma(V.grass)` 를 봤다. 팔레트 상수 둘을 직접 읽은
  // 것인데, **도로 파츠가 실제로 무슨 색을 쓰는지는 안 보고 있었다.** 그래서:
  //
  //   · 도로 바탕을 무엇으로 바꾸든 통과/실패가 안 바뀌고
  //   · 반대로 팔레트만 고치면 도로가 잔디와 같은 색이어도 통과한다
  //
  // 재는 축이 틀린 것이다 — 이 저장소의 상시 위험으로 CLAUDE.md 에 적혀 있는 바로
  // 그 형태다(*"참인 문장에서 성립하지 않는 결론을 뽑는 것"*). 축을 **파츠가 신고한
  // `groundBase`** 로 옮긴다. 그 필드가 존재하는 이유가 정확히 이것이다:
  // *"나는 지면 평면이다 + 내 알베도의 원천은 이 색이다"* 라는 신고.
  it('흙길이 잔디와 뚜렷이 갈린다 — 파츠가 신고한 색으로 잰다', () => {
    // world2 에서 지면 19% vs 도로 17% 로 **2%p** 차라 통짜 검은 바닥으로 보였고,
    // 감독 판정이 *"바닥 격자 바닥이 잘 드러나지 않아"* 였다. 0.15 는 "다른 재질로
    // 읽히는" 최소 차이다.
    //
    // 마을은 **초록이 함정이다.** 휘도 계수가 커서(0.7152) 채도 높은 잔디는 눈에
    // 보이는 것보다 훨씬 밝게 계산된다 — 베이지 흙길과 명도가 같아진다(실측 0.005).
    // 그래서 길을 짙은 흙으로 내렸다. 부호는 world2 와 같다: **길이 땅보다 어둡다.**
    const roadBase = road.groundBase;
    const groundBase = ground.groundBase;
    expect(typeof roadBase, 'road 가 groundBase 를 신고하지 않는다').toBe('number');
    expect(typeof groundBase, 'ground 가 groundBase 를 신고하지 않는다').toBe('number');
    expect(Math.abs(luma(groundBase!) - luma(roadBase!))).toBeGreaterThan(0.15);
  });

  it('잔디 상수와 지면 파츠가 같은 것을 가리킨다 — 두 곳에 적으면 갈라진다', () => {
    // 위 검사가 파츠 신고값을 보게 됐으므로, 팔레트의 `grass` 가 실제로 지면에 쓰이는
    // 색인지는 **따로** 확인해야 한다. 안 그러면 팔레트를 고쳐도 화면이 안 바뀌는
    // 상태를 아무도 못 잡는다 — 죽은 팔레트다.
    expect(ground.groundBase).toBe(V.grass);
  });

  // ⚠️ **못 재는 것**: 도로 텍스처는 짙은 바탕 위에 밝은 결(마른 결·잔모래·자갈)을
  // 뿌리므로 **화면 평균은 `groundBase` 보다 밝다.** 즉 덧그림이 이 규약을 몰래
  // 갉아먹을 수 있다. jsdom 에 네이티브 캔버스가 없어 실제 텍셀 평균은 이 환경에서
  // 잴 수 없고(`decide/ground-albedo.ts` 가 같은 한계를 같은 이유로 적어 뒀다),
  // 해석 근사는 `parts/road.ts` 의 텍스처 주석에 표로 남겼다(평균 0.5463 → 대비
  // 0.174). **근사이지 실측이 아니다** — 통과로 적지 않는다.

  it('벽이 잔디보다 밝다 — 집이 바닥에서 일어서 보여야 한다', () => {
    expect(luma(V.wall)).toBeGreaterThan(luma(V.grass));
  });

  it('지붕이 벽과 갈린다 — 안 갈리면 집이 통짜 덩어리가 된다', () => {
    // 지붕은 벽보다 **어둡고 채도가 높다.** 명도만 보면 색조 차이를 놓치므로
    // 명도차와 함께 "빨강 채널이 다른 채널보다 뚜렷이 크다"(따뜻한 색)를 같이 본다.
    expect(luma(V.wall) - luma(V.roof)).toBeGreaterThan(0.15);
    const [r, g, b] = channels(V.roof);
    expect(r - Math.max(g, b)).toBeGreaterThan(40);
  });

  it('잔디 3종이 서로 다르되 같은 계열이다 — 얼룩이 아니라 결로 보여야 한다', () => {
    const ls = [V.grassDeep, V.grass, V.grassLight].map(luma);
    // 단조 증가 — 이름이 어두운→밝은 순서라는 계약
    expect(ls[0]).toBeLessThan(ls[1]);
    expect(ls[1]).toBeLessThan(ls[2]);
    // 너무 벌어지면 잔디가 얼룩덜룩해진다
    expect(ls[2] - ls[0]).toBeLessThan(0.25);
  });

  it('집·지면 파츠가 팔레트를 실제로 쓴다 — 죽은 팔레트는 구멍이다', () => {
    // 팔레트가 있어도 파츠가 안 쓰면 위 대비 검사는 전부 **공허하다**. 실물 배선을
    // 함께 못 박는다: 집은 정점색을 쓰고(=곱셈기), 지면은 잔디 계열 색을 갖는다.
    expect(isMultiplier(materialOf(building))).toBe(true);
    expect(building.tones).toEqual(TINT_SET);
    // 지면은 텍스처든 tones 든 잔디 계열이어야 한다 — 잔디 명도 근방인지로 본다
    const g = luma(V.grass);
    const near = ground.tones.some((t) => Math.abs(luma(t) - g) < 0.3)
      || (typeof ground.groundBase === 'number' && Math.abs(luma(ground.groundBase) - g) < 0.3);
    expect(near, `ground 가 잔디 계열이 아니다: tones=${ground.tones.map((t) => t.toString(16))}`).toBe(true);
  });
});

// ── 색 리터럴 금지 ──────────────────────────────────────────────────────────
//
// **이 검사가 팔레트를 팔레트로 유지한다.** 없으면 다음 사람이 편한 자리에 hex 한 줄을
// 적고, 그 순간부터 "색은 palette.ts 에 있다" 가 절반만 참이 된다 — world2 가 정확히
// 그 상태였다(47곳 하드코딩).
describe('색은 palette.ts 한 곳에서만 온다', () => {
  /**
   * 검사에서 빼는 파일과 그 이유. **비어 있지 않은 이유를 반드시 적는다** —
   * 이유 없는 예외가 쌓이면 검사가 서서히 무력해진다.
   */
  const EXEMPT: Record<string, string> = {
    'palette.ts': '팔레트 자신 — 색의 출처',
    'color.ts': 'hex→CSS 포맷터. 색을 담지 않고 변환만 한다',
    'bake.ts': 'hex→정점색 변환 유틸. 색을 담지 않는다',
  };

  /**
   * 6자리 hex 리터럴만 색으로 본다. `salt`(8자리, 예: `0x7f4a7c15`)는 난수 시드지
   * 색이 아니다 — 자릿수로 갈린다.
   */
  const HEX6 = /0x[0-9a-fA-F]{6}\b(?![0-9a-fA-F])/g;
  /** CSS 문자열 색. 캔버스 텍스처가 `ctx.fillStyle` 에 쓰는 형태 */
  const CSS_HEX = /['"]#[0-9a-fA-F]{3,8}['"]/g;

  /** 주석을 걷어낸다 — 설명하는 문장이 위반으로 잡히면 안 된다 */
  function stripComments(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !/^\s*\/\//.test(l))
      .join('\n');
  }

  const files = readdirSync(PARTS_DIR).filter((f) => f.endsWith('.ts'));

  it('표본이 비어 있지 않다', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('파츠 파일에 색 리터럴이 없다', () => {
    const offenders: string[] = [];
    for (const f of files) {
      if (f in EXEMPT) continue;
      const code = stripComments(readFileSync(join(PARTS_DIR, f), 'utf8'));
      for (const m of code.match(HEX6) ?? []) offenders.push(`${f}: ${m}`);
      for (const m of code.match(CSS_HEX) ?? []) offenders.push(`${f}: ${m}`);
    }
    // 실패 메시지가 곧 처방이 되게 한다 — "이 색에 이름을 붙여 palette.ts 로 옮겨라".
    expect(offenders).toEqual([]);
  });

  it('면제 목록이 실재하는 파일을 가리킨다 — 죽은 예외는 구멍이다', () => {
    for (const f of Object.keys(EXEMPT)) expect(files, `${f} 없음`).toContain(f);
  });

  it('팔레트가 실제로 소비된다 — 아무도 안 쓰면 위 검사는 공허하다', () => {
    const users = files.filter((f) => !(f in EXEMPT))
      .filter((f) => /from '\.\/palette\.js'/.test(readFileSync(join(PARTS_DIR, f), 'utf8')));
    // 파츠 대부분이 색을 갖는다. 절반도 안 쓰고 있다면 색이 다른 데서 오고 있다는 뜻이다.
    expect(users.length).toBeGreaterThan(files.length / 2);
  });
});
