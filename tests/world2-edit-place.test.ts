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
import { makeThreeStub, type StubRay } from './helpers/three-stub.js';

const SRC = 'assets/models/a.glb';

type PlaceCall = {
  src: string;
  onProgress?: LoadProgress;
  resolve(e: OverlayEntry | null): void;
};


function makeHost(calls: PlaceCall[], failure: { why: string | null }, rays: StubRay[]) {
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
    THREE: makeThreeStub({ rays }),
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
    // 마을 파츠는 이 파일들의 축이 아니다 — 문을 닫아 두면 `pickVillage` 가 즉시
    // `null` 을 내고 오버레이만 집던 예전 경로가 그대로 돈다.
    instances: null,
    village: null,
    // 미술관 벽(태스크 #112). 이 하네스에는 미술관이 없다 — `null` 이 사실이다.
    glbCity: null,
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
  let rays: StubRay[];

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

    // ⚠ **놓으면 고르기가 풀린다**(감독 신고 2026-08-13 「흩어뿌리기」). 그래서 또 놓으려면
    // 팔레트에서 다시 고른다. 이 줄이 없으면 이 축은 «잠금이 풀렸나» 가 아니라
    // «고르기가 남아 있나» 를 재게 되고, 두 가지가 뒤섞이면 어느 쪽이 깨졌는지 모른다.
    document.querySelector<HTMLButtonElement>('#w2-edit button[data-src]')!.click();

    clickGround();
    await settle();
    expect(calls.length, '끝난 뒤에는 다시 놓인다').toBe(2);
  });

  it('★ 놓은 뒤의 지면 클릭은 또 놓지 않는다 (감독 신고 「흩어뿌리기」)', async () => {
    // *"지금은 클릭하면 다시 선택되었으면 하는데.. 지금은 흩어뿌리기 식으로 되어 있어."*
    // `pendingSrc` 가 **팔레트 버튼으로만** 풀려서, 한 번 고르면 그 뒤 모든 지면 클릭이
    // «또 놓기» 가 됐다. 방금 놓은 것을 옮기려고 옆을 클릭하면 하나가 더 생긴다.
    clickGround();
    await settle();
    expect(calls.length, '첫 클릭에서는 놓여야 한다').toBe(1);
    calls[0].resolve(entryOf(SRC));
    await settle();

    clickGround();
    await settle();
    expect(calls.length, '★ 고르기가 안 풀려 또 놓였다').toBe(1);
  });

  it('로드가 실패하면 고르기가 남는다 — 다시 시도할 수 있어야 한다', async () => {
    // 성공했을 때만 푼다. 실패했는데 고르기까지 풀리면 «왜 안 놓였지» 하는 순간에
    // 다시 고르는 단계가 하나 더 붙는다.
    clickGround();
    await settle();
    failure.why = 'HTTP 404';
    calls[0].resolve(null);
    await settle();

    clickGround();
    await settle();
    expect(calls.length, '실패 뒤에는 고르기가 남아 바로 재시도된다').toBe(2);
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

  it('「복제」도 로드 중에는 잠긴다', async () => {
    // 검수관이 실측한 사각이다(2026-08-12): `duplicate()` 의 `busy` 잠금을 지워도
    // **0 failed** 였다 — 이 파일이 복제 경로를 아예 안 밟고 있었다. 코드는 안전했지만
    // *"다음에 이 잠금이 깨져도 이 스위트로는 안 드러난다"* 는 것이 문제다.
    //
    // ⚠ 순서가 중요하다. `duplicate()` 는 `if (!selected)` 를 **먼저** 보므로 아무것도
    // 안 놓인 상태로 누르면 잠금에 닿기도 전에 빠져나간다. 그래서 하나를 먼저 놓아
    // `selected` 를 만든 뒤, 두 번째 로드가 도는 중에 복제를 누른다.
    clickGround();
    await settle();
    calls[0].resolve(entryOf(SRC));
    await settle();

    // 놓으면 고르기가 풀리므로(감독 신고 2026-08-13) 두 번째 로드를 만들려면 다시 고른다.
    // 이 축이 재는 것은 «복제가 busy 잠금에 걸리는가» 이고 두 번째 로드는 **수단**이다.
    document.querySelector<HTMLButtonElement>('#w2-edit button[data-src]')!.click();

    clickGround();
    await settle();
    expect(calls.length, '두 번째 로드가 시작돼 있어야 한다').toBe(2);

    const dup = [...document.querySelectorAll<HTMLButtonElement>('#w2-edit button')]
      .find((b) => b.textContent === '복제');
    expect(dup, '「복제」 버튼이 있어야 한다').toBeTruthy();
    dup!.click();
    await settle();

    expect(calls.length, '로드 중 복제는 새 로드를 만들지 않는다').toBe(2);
    expect(panelText()).toContain('아직 불러오는 중');
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
  // ⚠ **모델 캐시가 2026-08-22 에 별도 파일로 나갔다**(파일 크기 게이트 — 그 파일 헤더).
  // 검사 대상은 「어느 파일에 적혀 있나」가 아니라 「그 처방이 살아 있나」이므로 경로만
  // 따라간다. 여기가 안 따라가면 **옮기는 것만으로 처방이 조용히 사라질 수 있다.**
  const models = readFileSync('frontend/js/world2/features/overlay-models.ts', 'utf8');

  it('place() 가 붙인 뒤 프레임을 넘기고 새 holder 만 예열한다', () => {
    expect(place).toContain('await nextFrame();');
    expect(place, '루트 전체가 아니라 새로 붙은 것만 연다').toContain('await warmUp(entry.holder);');
  });

  // ⚠ **위 두 줄만으로는 부족해졌다**(2026-08-16, W8-2). 부팅이 편집용 3프레임을 같이
  // 물던 것을 고치면서 예열을 `if (warm) { … }` 로 감쌌는데, **문자열은 그대로 남아
  // 위 검사가 통과한다.** 즉 `warm` 기본값을 `false` 로 뒤집어도 안 걸린다 — 그러면
  // 편집 경로가 조용히 예열을 잃고, 증상은 「감독 실기기에서만 나는 히칭」이라 여기서
  // 안 보인다(그 히칭이 애초에 이 검사를 만든 사고다 — 1,072ms, 2026-08-12).
  //
  // 이 파일 헤더가 *"텍스트 위치는 제어흐름을 안 본다"* 라고 한계를 적어 두었고, 그
  // 한계가 실제로 물린 첫 사례다. **문장을 고치는 대신 축을 하나 더 만든다.**
  it('★ 예열은 기본값이다 — 부팅만 끄고 편집은 그대로 탄다', () => {
    expect(place, '★ `warm` 기본이 false 면 편집 경로가 조용히 예열을 잃는다')
      .toMatch(/warm\s*=\s*true/);
    expect(place, '★ 예열이 조건 뒤에 있어야 부팅이 건너뛸 수 있다').toContain('if (warm) {');
  });

  it('모델 캐시가 진행 중인 약속을 담는다 — 완료본만 담으면 중복 로드가 난다', () => {
    expect(models).toContain('const models = new Map<string, Promise<Object3D | null>>()');
  });

  it('실패는 캐시하지 않는다 — 남기면 그 src 가 세션 내내 못 살아난다', () => {
    expect(models).toContain('models.delete(key);');
  });

  it('진행 콜백을 loadAsync 에 실제로 넘긴다', () => {
    expect(src).toContain('loader.loadAsync(url, onProgress)');
  });

  // ── 실기기 WebGPU 사각 (2026-08-12 감독 신고) ────────────────────────────
  // `three/webgpu` 는 `sheen`·`clearcoat`·`anisotropy`·`ior` 를 처리하다 렌더 파이프라인
  // 생성에 실패하고, 그러면 그 뒤 **모든 프레임이 무효**가 된다. 감독이 2026-07-29 에
  // 이미 판정한 것(`raw` 안 보임 / `noext` 보임)인데 오버레이만 그 처방을 안 받고 있었다.
  //
  // ⚠ **헤드리스는 WebGL 이라 이 축을 원리적으로 못 잰다.** 그래서 «화면이 멀쩡한가» 가
  // 아니라 «놓는 경로가 그 함수를 지나는가» 를 잰다. 약한 축인 것을 알고 쓴다 —
  // 실기기 판정은 감독 확인이 유일하다.
  // ⚠ 아래 둘은 원래 `import { disableMatExtensions } from …` 과 `disableMatExtensions(m);`
  // 를 **문자열 그대로** 봤다. 2026-08-22 에 발광 상한(`?glbemis=`)이 붙으면서 import 에
  // `readEmissiveCap` 이 늘고 호출에 인자가 붙자 둘 다 깨졌다 — **처방은 그대로인데
  // 검사만 깨진 것**이다. 이 검사가 지키려는 것은 «어느 함수를 어디서 부르는가» 이지
  // 인자 개수가 아니므로, 이름·경로·호출 위치는 그대로 두고 **인자 목록에만** 둔감하게
  // 바꾼다. 느슨해진 것이 아니라 형식 결합을 뺀 것이다(대신 상한 배선 검사를 아래 더한다).
  it('로드한 모델이 확장 끄기를 거친다 — 안 거치면 실기기에서 렌더가 죽는다', () => {
    expect(models).toMatch(
      /import \{[^}]*\bdisableMatExtensions\b[^}]*\} from '\.\.\/\.\.\/world-shared\/glb-material\.js'/,
    );
    expect(models).toMatch(/disableMatExtensions\(m[,)]/);
  });

  it('확장 끄기가 캐시 적재 안에 있다 — 캐시된 뒤에 걸면 이미 늦다', () => {
    const get = models.slice(models.indexOf('function get('), models.indexOf('return {'));
    expect(get).toMatch(/disableMatExtensions\(m[,)]/);
  });

  // 🔴 발광 상한(감독 신고 2026-08-22 *"glb건물 현관의 조명이 너무쎄다"*)이 **이 경로에도**
  // 걸리는지. 오버레이는 `glb-city` 와 별개 경로라 한쪽만 배선하면 감독 배치 GLB 만 계속
  // 탄다 — 실제로 확장 끄기가 그렇게 한쪽에만 있다가 실기기 렌더를 죽인 이력이 있다.
  it('발광 상한을 노브에서 읽어 넘긴다 — 상한이 이 경로에도 걸린다', () => {
    const get = models.slice(models.indexOf('function get('), models.indexOf('return {'));
    expect(get).toMatch(/disableMatExtensions\(m,\s*readEmissiveCap\(readNum\)\)/);
  });
});

describe('확장 끄기 자체가 값을 실제로 끄는가', () => {
  it('EXT_OFF 의 키를 가진 재질만 골라 값을 바꾼다', async () => {
    const { disableMatExtensions, EXT_OFF } = await import('../frontend/js/world-shared/glb-material.js');

    // 감독 실기기 로그에 나온 그 재질을 흉내낸다 — 확장 넷을 다 켠 상태
    const hot = { sheen: 1, clearcoat: 0.8, anisotropy: 0.5, ior: 2.4, color: 0xffffff };
    const cold = { color: 0x808080 };  // 확장이 없는 재질은 안 건드려야 한다
    const coldBefore = { ...cold };

    const model = {
      traverse(fn: (o: unknown) => void) {
        fn({ isMesh: true, material: hot });
        fn({ isMesh: true, material: cold });
        fn({ isMesh: false, material: { sheen: 1 } });  // Mesh 가 아니면 건드리지 않는다
      },
    };
    const n = disableMatExtensions(model as never);

    expect(n, '확장을 가진 재질 하나만 바뀐다').toBe(1);
    expect(hot.sheen).toBe(EXT_OFF.sheen);
    expect(hot.clearcoat).toBe(EXT_OFF.clearcoat);
    expect(hot.anisotropy).toBe(EXT_OFF.anisotropy);
    expect(hot.ior).toBe(EXT_OFF.ior);
    expect(hot.color, '확장이 아닌 값은 그대로다').toBe(0xffffff);
    expect(cold).toEqual(coldBefore);
  });

  it('같은 재질을 두 번 세지 않는다 — clone 이 참조를 공유한다', async () => {
    const { disableMatExtensions } = await import('../frontend/js/world-shared/glb-material.js');
    const shared = { sheen: 1 };
    const model = {
      traverse(fn: (o: unknown) => void) {
        fn({ isMesh: true, material: shared });
        fn({ isMesh: true, material: shared });
      },
    };
    expect(disableMatExtensions(model as never)).toBe(1);
  });
});


// ── 슬롯 재타겟 배선 (W5 E2.5) ──────────────────────────────────────────────
//
// ⚠ **행위 테스트가 이 축을 원리적으로 못 본다.** `world2-edit-listeners.test.ts` 는
// 자기 `OverlayHost` 를 만들어 `retargetSlot` 을 직접 꽂으므로, 조립부(`features/overlay.ts`
// → `main.ts`)가 그 문을 안 이어도 **전부 통과한다.** W4 의 N10 뮤테이션이 정확히
// 그 형태로 0 failed 였다(2026-08-13).
//
// 그래서 배선을 정적으로 못 박는다. 텍스트 축이라 약하다는 것을 알고 쓴다 — 「어디에
// 적혀 있나」만 보고 「실제로 불리나」는 안 본다. 실기기 판정은 감독 확인이 유일하다.
describe('소비자 · 편집이 슬롯 자세를 밀 수 있게 이어져 있다', () => {
  const overlay = readFileSync('frontend/js/world2/features/overlay.ts', 'utf8');
  const main = readFileSync('frontend/js/world2/main.ts', 'utf8');

  it('오버레이 기능이 env 의 문을 편집 host 로 넘긴다', () => {
    expect(overlay, '★ 문이 안 이어졌다 — 조작 중 마을 건물이 안 따라온다')
      .toContain('retargetSlot: env.retargetSlot');
  });

  it('조립부가 그 문을 슬롯 어댑터의 `retarget` 에 잇는다 — `setTransform` 이 아니다', () => {
    // `setTransform` 을 쓰면 성장 중인 슬롯이 다음 프레임에 옛 목표로 되돌아가고,
    // 수축(`lastPose`)도 옛 자리로 튄다(팀장 판정 2026-08-13 의 (다) 기각 근거).
    expect(main, '★ 조립부가 문을 안 채운다').toContain('retargetSlot: (h, t) =>');
    expect(main, '★ `retarget` 이 아니라 다른 문에 이었다')
      .toContain('slotPool?.retarget?.(h, t.x, t.y, t.z, t.ry, t.sx, t.sy, t.sz)');
  });

  it('★ 편집에 `acquire`·`release` 는 안 넘어간다 — 개수 불변식의 뒷문', () => {
    // 팀장 판정의 핵심 조건이다. `slotPool` 자체를 넘기면 그 순간 `seal()` 이 뚫린다.
    expect(overlay, '★ 슬롯 풀 어댑터가 통째로 편집에 넘어갔다')
      .not.toMatch(/slotPool\s*[:,]/);
  });
});
