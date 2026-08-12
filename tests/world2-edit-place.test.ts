// @vitest-environment jsdom
//
// 편집 모드의 «놓기» **행위** 테스트.
//
// 재는 것: 감독 신고(2026-08-12) *"지엘비 씬에 놓으려고 하려면.. 멈추는것 같아"* —
// 카드 확인으로 **팔레트에서 고름 · 완전히 굳어 탭을 닫아야 했음**이 확정됐다.
//
// ── 왜 소스 파싱이 아니라 실제 호출인가 ────────────────────────────────────────
// 이웃 파일(`world2-overlay-wiring.test.ts`)은 소스 **텍스트 위치**로 리스너 등록을
// 검사한다. 검수관이 그 축을 뮤테이션 4종으로 두들겨 **넷째가 안 잡히는 것을 실측**했다
// (2026-08-12): 부팅부에서 `bindEditListeners()` 를 무조건 호출하면 같은 증상이 나는데
// 20/20 통과했다. 텍스트 검사는 *"어디에 적혀 있나"* 만 보고 *"실제로 언제 불리나"* 를
// 못 본다. 그래서 이 파일은 `startEditMode` 를 스텁 host 로 **돌려서** 잰다.
//
// ── 무엇이 탭을 죽였나 (이 축이 지키는 인과) ──────────────────────────────────
// 진행 표시가 없어 «안 먹었나» → 재클릭 → 같은 12.9MB 자산이 여러 벌 동시에 파싱 →
// 각각이 한 프레임에 붙는다. **한 번의 히칭이 아니라 누적**이었다. 그래서 잠금과 진행
// 표시는 **짝으로** 검사한다 — 표시만 있고 잠금이 없으면 조급한 연타가 그대로 통과하고,
// 잠금만 있고 표시가 없으면 잠긴 것이 멈춘 것과 구별되지 않는다.
//
// **여기서 못 재는 것**: 실제 GLB 파싱 비용 · WebGPU 파이프라인 컴파일 · 프레임이 실제로
// 도는지(그건 `place` 안쪽 일이고 소비자 `features/overlay.ts` 소관이다 — 아래 마지막
// describe 가 그 배선만 정적으로 본다). 실기기 체감은 감독 확인이 유일한 판정이다.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { startEditMode } from '../frontend/js/world2/edit/mode.js';
import type { EditSession, OverlayEntry, OverlayHost, LoadProgress } from '../frontend/js/world2/edit/types.js';

const SRC = 'assets/models/a.glb';

type PlaceCall = {
  src: string;
  onProgress?: LoadProgress;
  resolve(e: OverlayEntry | null): void;
};

type Ray = { origin: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } };

/**
 * 스텁 three — `mode.ts` 가 쓰는 것만 만든다(`ThreeNS` 참조).
 *
 * `rays` 로 만들어진 광선을 밖에 넘긴다 — 테스트가 **쏘는 방향을 바꿔** 하늘/지면을
 * 가려 쏠 수 있어야 한다(아래 「하늘 클릭」 축).
 */
function makeThree(rays: Ray[]) {
  return {
    Raycaster: class {
      // 위에서 아래로 쏜다 → y=0 평면 교차가 원점 근처에서 성립한다
      ray: Ray = { origin: { x: 0, y: 10, z: 0 }, direction: { x: 0, y: -1, z: 0 } };
      constructor() { rays.push(this.ray); }
      setFromCamera(): void { /* NDC 는 이 축에서 안 본다 */ }
      intersectObjects(): { object: unknown }[] { return []; }
    },
    Mesh: class {
      position = { set(): void { } };
      rotation = { x: 0 };
      scale = { setScalar(): void { } };
      visible = false;
      renderOrder = 0;
    },
    RingGeometry: class { dispose(): void { } },
    MeshBasicMaterial: class { dispose(): void { } },
    // `min.x === Infinity` 는 «빈 상자» 표시다 — 마커 반지름이 기본값으로 간다
    Box3: class {
      min = { x: Infinity, y: Infinity, z: Infinity };
      max = { x: -Infinity, y: -Infinity, z: -Infinity };
      setFromObject(): void { }
    },
    DoubleSide: 2,
  };
}

function makeHost(calls: PlaceCall[], failure: { why: string | null }, rays: Ray[]) {
  const doc = document;
  const canvas = doc.createElement('canvas');
  doc.body.append(canvas);
  // jsdom 의 `getBoundingClientRect` 는 전부 0 이라 NDC 변환이 `null` 로 떨어진다 —
  // 그러면 클릭이 통째로 무시돼 **이 테스트가 아무것도 안 재게 된다**(빈 검사).
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    toJSON() { return {}; },
  }) as DOMRect;

  const entries: OverlayEntry[] = [];
  const host: OverlayHost = {
    THREE: makeThree(rays),
    camera: {} as never,
    canvas,
    doc,
    cellX: 32,
    cellZ: 32,
    root: { children: [], add(): void { }, remove(): void { } } as never,
    entries: () => entries,
    place: (src, _at, _blobUrl, onProgress) => new Promise((resolve) => {
      calls.push({ src, onProgress, resolve });
    }),
    lastFailure: () => failure.why,
    remove: () => { },
    apply: () => { },
    toRaw: () => ({ version: 1, items: [] }),
    look: () => { },
    surfaceAt: () => 0,
  };
  return { host, canvas, entries };
}

function entryOf(src: string): OverlayEntry {
  return { id: 1, src, preview: false, holder: {} as never, x: 0, y: 0, z: 0, ry: 0, s: 1 };
}

/** 마이크로태스크·타이머를 비운다 — 팔레트 fetch 와 `place` 대기가 그 위에 있다 */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0));
}

function panelText(): string {
  return document.getElementById('w2-edit')?.textContent ?? '';
}

describe('편집 모드 · 놓기 행위', () => {
  let session: EditSession | null = null;
  let calls: PlaceCall[];
  let failure: { why: string | null };
  let canvas: HTMLCanvasElement;
  let rays: Ray[];

  beforeEach(async () => {
    document.body.innerHTML = '';
    calls = [];
    failure = { why: null };
    rays = [];
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ models: ['a.glb'] }),
    })));

    const made = makeHost(calls, failure, rays);
    canvas = made.canvas;
    session = startEditMode(made.host, { modelsUrl: '/models.json', onBlobUrl: () => { } });
    await settle();

    // 편집을 켠다 — 부팅 직후는 주행 모드다(감독 신고 2026-08-12 로 뒤집은 것)
    const toggle = document.querySelector<HTMLButtonElement>('#w2-edit .toggle');
    expect(toggle, '토글 버튼이 있어야 한다').not.toBeNull();
    toggle!.click();

    // 팔레트에서 모델을 고른다
    const pal = document.querySelector<HTMLButtonElement>('#w2-edit button[data-src]');
    expect(pal, '팔레트에 모델 버튼이 떠야 한다').not.toBeNull();
    pal!.click();
  });

  afterEach(() => {
    session?.dispose();
    session = null;
    vi.unstubAllGlobals();
  });

  function clickGround(): void {
    canvas.dispatchEvent(new MouseEvent('pointerdown', {
      button: 0, clientX: 400, clientY: 300, bubbles: true,
    }));
  }

  it('로드가 끝나기 전에 다시 클릭해도 place 는 한 번만 불린다', async () => {
    clickGround();
    await settle();
    expect(calls.length).toBe(1);

    // 감독이 실제로 한 행동 — 반응이 없어 보여서 계속 누른다
    clickGround();
    clickGround();
    clickGround();
    await settle();

    // 이 단언이 탭 사망을 막는 자리다. 잠금이 없으면 4가 된다.
    expect(calls.length, '로드 중 재클릭은 새 로드를 만들지 않는다').toBe(1);
    expect(panelText()).toContain('아직 불러오는 중');
  });

  it('로드가 끝나면 잠금이 풀려 다시 놓을 수 있다', async () => {
    clickGround();
    await settle();
    calls[0].resolve(entryOf(SRC));
    await settle();

    clickGround();
    await settle();
    expect(calls.length, '끝난 뒤에는 다시 놓인다').toBe(2);
  });

  it('로드 실패로 끝나도 잠금이 풀린다', async () => {
    clickGround();
    await settle();
    failure.why = 'HTTP 404';
    calls[0].resolve(null);
    await settle();

    clickGround();
    await settle();
    expect(calls.length, '실패 한 번이 편집을 영구히 잠그면 안 된다').toBe(2);
  });

  it('받는 동안 진행이 화면에 나온다 — 퍼센트를 아는 경우', async () => {
    clickGround();
    await settle();
    calls[0].onProgress?.(37.4, 4_800_000);
    expect(panelText()).toContain('37%');
    expect(panelText()).toContain('4.6MB');
  });

  it('총 용량을 모르면 퍼센트를 지어내지 않는다', async () => {
    clickGround();
    await settle();
    // `pct === null` = 서버가 `Content-Length` 를 안 준 경우
    calls[0].onProgress?.(null, 2_097_152);
    const t = panelText();
    expect(t).toContain('2.0MB');
    expect(t, '퍼센트를 지어내면 안 된다').not.toContain('%');
  });

  it('하늘을 클릭하면 침묵하지 않고 말한다', async () => {
    // 광선을 위로 돌린다 = 지면 평면과 안 만난다.
    // 실기 실측(2026-08-12, 1280×800): 화면 중앙 y=50% 가 정확히 이 경우였다 — 거기는
    // 지평선이라 안 놓이는데 **아무 말도 안 했다.** 화면은 「지면을 클릭하면 놓입니다」
    // 라고 안내하고 있었으므로 감독에게는 «또 안 먹네» 로 읽힌다.
    expect(rays.length, '스텁 광선이 잡혀야 한다').toBeGreaterThan(0);
    rays[0].direction.y = 1;

    clickGround();
    await settle();

    expect(calls.length, '하늘 클릭은 로드를 시작하지 않는다').toBe(0);
    expect(panelText(), '침묵하면 안 된다').toContain('하늘');
  });

  it('실패하면 실제 사유를 화면에 적는다 — 콘솔로 미루지 않는다', async () => {
    clickGround();
    await settle();
    failure.why = 'a.glb: Unexpected end of JSON input';
    calls[0].resolve(null);
    await settle();

    const t = panelText();
    expect(t).toContain('Unexpected end of JSON input');
    // 예전 문구는 콘솔을 보라고 했는데 이 경로에 `console.*` 호출이 0건이었다
    expect(t, '없는 콘솔 진단으로 안내하면 막다른 길이다').not.toContain('콘솔');
  });
});

// ── 소비자 쪽 배선 (여기서는 행위로 못 재는 것) ──────────────────────────────
// `place()` 안의 프레임 분할·예열은 three 씬이 있어야 도는 코드라 jsdom 스텁으로는
// 재지 못한다. **못 재는 것을 통과로 적지 않으려고** 배선만 정적으로 못 박는다 —
// 이 축의 한계는 위 헤더에 적힌 그대로다(텍스트 위치는 제어흐름을 안 본다).
describe('소비자 · 개별 배치도 분할·예열을 탄다', () => {
  const src = readFileSync('frontend/js/world2/features/overlay.ts', 'utf8');
  const place = src.slice(src.indexOf('async function place('), src.indexOf('function remove('));

  it('place() 가 붙인 뒤 프레임을 넘기고 새 holder 만 예열한다', () => {
    expect(place).toContain('await nextFrame();');
    expect(place, '루트 전체가 아니라 새로 붙은 것만 연다').toContain('await warmUp(entry.holder);');
  });

  it('모델 캐시가 진행 중인 약속을 담는다 — 완료본만 담으면 중복 로드가 난다', () => {
    expect(src).toContain('const models = new Map<string, Promise<Object3D | null>>()');
  });

  it('실패는 캐시하지 않는다 — 남기면 그 src 가 세션 내내 못 살아난다', () => {
    expect(src).toContain('models.delete(key);');
  });

  it('진행 콜백을 loadAsync 에 실제로 넘긴다', () => {
    expect(src).toContain('loader.loadAsync(url, onProgress)');
  });
});
