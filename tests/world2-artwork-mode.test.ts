// @vitest-environment node
//
// **이미지를 끌어다 벽에 건다** — 걸기 경로 전체를 실행으로 잰다 (W8-4 D2).
//
// ── 왜 이 파일이 실행 축인가 ───────────────────────────────────────────────
// D1(벽 검출)이 만든 `pickFace()` 는 **호출자가 0건**이었다. 즉 산술은 맞는데 화면에서
// 아무 일도 안 일어나는 상태였고, 이 저장소가 「경계를 건너는 지점은 아무도 안 본다」로
// 부르는 형태다. 여기서 재는 것은 *"계산이 맞는가"* 가 아니라 **"그 계산이 실제로
// 소비되는가"** 다 — `createArtworkMode` 와 `createArtsPort` 는 three 를 안 쓰므로
// **노드가 통째로 돌릴 수 있다**(텍스트 검사보다 강한 축이다).
//
// ── 마지막 describe 가 배선을 잰다 ─────────────────────────────────────────
// `edit/input.ts` 의 드롭 분기는 **타입만 import** 하므로 노드에서 `createInput` 을
// 그대로 돌릴 수 있다. 가짜 `doc` 에 실제 `drop` 이벤트를 흘려 «이미지가 작품 경로로
// 가는가 · GLB 경로는 그대로인가» 를 본다. 이 축이 없으면 모듈이 완성돼 있어도 아무도
// 안 부르는 상태가 초록으로 통과한다(D1 이 정확히 그 상태로 병합됐다).
//
// ── 브라우저가 재는 것 — 여기서 못 잰다 ────────────────────────────────────
// `measureAspect` 는 `new Image()` 를 쓰므로 노드가 못 돌린다(그래서 주입 가능하다).
// 실제 이미지에서 종횡비가 나오는지, 액자가 벽에 붙어 보이는지는 **브라우저 실측**이
// 유일한 판정이다. 이 회차들에서 단위 테스트가 초록인 채 실물 결함이 세 번 났다.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createArtworkMode } from '../frontend/js/world2/edit/artwork-mode.js';
import { createArtsPort } from '../frontend/js/world2/systems/art-port.js';
import {
  looksLikeImage, ART_AR_DEF, ART_W_DEF, WALL_GAP,
  type ArtworkItem, type WallHit,
} from '../frontend/js/world2/decide/artwork.js';
import { createInput } from '../frontend/js/world2/edit/input.js';
import { createEditState } from '../frontend/js/world2/edit/state.js';
import type { Picker } from '../frontend/js/world2/edit/pick.js';
import type { Panel } from '../frontend/js/world2/edit/panel/dom.js';
import type { Actions } from '../frontend/js/world2/edit/actions.js';
import type { Gizmo } from '../frontend/js/world2/edit/gizmo.js';
import type { OverlayHost } from '../frontend/js/world2/edit/types.js';

// ── 대역 ────────────────────────────────────────────────────────────────────

/** `+X` 를 향하는 벽. 정확히 수직이라 `wallPose` 를 반드시 통과한다 */
const WALL: WallHit = { point: { x: 10, y: 2, z: 5 }, normal: { x: 1, y: 0, z: 0 } };
/** 바닥. `WALL_MAX_TILT` 가 걸러야 한다 */
const FLOOR: WallHit = { point: { x: 1, y: 0, z: 1 }, normal: { x: 0, y: 1, z: 0 } };

/** 기본값(`1.2`)과 **반드시 다른** 값. 같으면 「읽었는가」를 구별할 수 없다 */
const AR_REAL = 2.5;

function fakePanel(): { panel: Panel; said: { msg: string; warn: boolean }[] } {
  const said: { msg: string; warn: boolean }[] = [];
  const panel = {
    say(msg: string, warn?: boolean) { said.push({ msg, warn: warn === true }); },
  } as unknown as Panel;
  return { panel, said };
}

function fakePicker(hit: WallHit | null, castOk = true): { picker: Picker } {
  const picker = {
    castFrom: () => castOk,
    pickFace: () => hit,
    // 바닥 좌표는 **GLB 경로의 것**이다. 작품이 이걸 쓰면 액자가 원점 근처에 눕는다.
    groundAt: () => ({ x: 0, z: 0 }),
  } as unknown as Picker;
  return { picker };
}

const FILE = (name: string) => ({ name }) as unknown as File;

let madeUrls: string[] = [];
const REAL_CREATE = URL.createObjectURL;
beforeEach(() => {
  madeUrls = [];
  (URL as { createObjectURL: unknown }).createObjectURL = (f: unknown) => {
    const u = `blob:test/${(f as { name: string }).name}/${madeUrls.length}`;
    madeUrls.push(u);
    return u;
  };
});
afterEach(() => { (URL as { createObjectURL: unknown }).createObjectURL = REAL_CREATE; });

/** 걸기 한 번을 돌리고 그 결과를 통째로 준다 */
async function hang(opts: {
  name?: string;
  hit?: WallHit | null;
  castOk?: boolean;
  ar?: number | null;
  before?: readonly ArtworkItem[];
}) {
  const { panel, said } = fakePanel();
  const { picker } = fakePicker(opts.hit === undefined ? WALL : opts.hit, opts.castOk ?? true);
  const arts = createArtsPort((src) => `/base/${src}`);
  if (opts.before) await arts.set(opts.before);
  const blobs: string[] = [];
  const mode = createArtworkMode({
    panel, picker, arts,
    onBlobUrl: (u) => blobs.push(u),
    measure: async () => (opts.ar === undefined ? AR_REAL : opts.ar),
  });
  await mode.drop(FILE(opts.name ?? 'a.png'), { clientX: 100, clientY: 200 });
  return { arts, said, blobs, list: arts.list() };
}

// ── 분류 ────────────────────────────────────────────────────────────────────

describe('★ 무엇을 작품으로 다룰 것인가 — 분류와 계약은 다른 질문이다', () => {
  it('이미지 확장자를 알아본다', () => {
    for (const n of ['a.png', 'b.jpg', 'c.jpeg', 'd.webp']) {
      expect(looksLikeImage(n), `★ ${n} 을 이미지로 안 본다`).toBe(true);
    }
  });

  it('★ GLB 는 작품이 아니다 — 여기가 새면 건물 올리기가 통째로 죽는다', () => {
    for (const n of ['house.glb', 'a.GLB', 'notes.txt', 'noext']) {
      expect(looksLikeImage(n), `★ ${n} 이 작품 경로로 샌다`).toBe(false);
    }
  });

  it('★ 대문자 확장자도 **이미지로 분류**한다 — 사유를 이미지 쪽에서 말하려고', () => {
    // 소문자만 분류하면 `A.PNG` 가 GLB 판정으로 흘러가 *"확장자는 소문자 .glb"* 라는
    // 엉뚱한 사유를 듣는다. 분류는 넓게, 거부는 작품 쪽에서.
    expect(looksLikeImage('A.PNG')).toBe(true);
  });

  it('`handles` 가 그 판정을 그대로 쓴다 — 두 곳이 갈리면 분기가 어긋난다', () => {
    const { panel } = fakePanel();
    const { picker } = fakePicker(WALL);
    const mode = createArtworkMode({
      panel, picker, arts: createArtsPort((s) => s), onBlobUrl: () => {},
    });
    expect(mode.handles('a.png')).toBe(true);
    expect(mode.handles('a.glb')).toBe(false);
  });
});

// ── 걸기 ────────────────────────────────────────────────────────────────────

describe('★ 벽에 건다 — 자세가 실제로 벽에서 나온다', () => {
  it('★ 걸리면 목록에 하나 는다', async () => {
    const r = await hang({});
    expect(r.list.length, '★ 걸었는데 목록이 안 늘었다').toBe(1);
    expect(r.list[0].src).toBe('assets/art/a.png');
  });

  it('★ **벽 법선에서 나온 자세**다 — 맞힌 점을 그대로 쓰면 액자가 벽에 박힌다', async () => {
    const r = await hang({});
    const a = r.list[0];
    // `wallPose` 가 법선 방향으로 `WALL_GAP` 만큼 띄운다. 안 띄우면 z-fighting 이고,
    // 「맞힌 점 그대로」와 「띄운 점」은 이 산술로만 갈린다.
    expect(a.x, '★ 벽에서 안 띄웠다 — 액자가 벽면과 겹친다').toBeCloseTo(10 + WALL_GAP, 9);
    expect(a.y).toBeCloseTo(2, 9);
    expect(a.z).toBeCloseTo(5, 9);
    // +X 벽이면 액자는 +X 를 본다 → `atan2(1, 0) = π/2`. `0` 이면 «벽을 뚫고 선 액자» 다.
    expect(a.ry, '★ 액자가 벽 바깥을 안 본다').toBeCloseTo(Math.PI / 2, 9);
  });

  it('★ 가로 길이는 기본값에서 온다', async () => {
    expect((await hang({})).list[0].w).toBeCloseTo(ART_W_DEF, 9);
  });

  it('★ 이미 걸린 것 **뒤에 더한다** — 앞의 것을 지우면 그것이 데이터 손실이다', async () => {
    const before: ArtworkItem[] = [{
      src: 'assets/art/old.png', x: 0, y: 1, z: 0, ry: 0, w: 1, ar: 1,
    }];
    const r = await hang({ before, name: 'new.png' });
    expect(r.list.length, '★ 기존 작품이 사라졌다').toBe(2);
    expect(r.list[0].src).toBe('assets/art/old.png');
    expect(r.list[1].src).toBe('assets/art/new.png');
  });
});

describe('★ 종횡비를 **실제로 읽는다**', () => {
  it('★ 읽은 비율이 항목에 들어간다 — 안 읽으면 세로 사진이 가로로 늘어난다', async () => {
    const r = await hang({ ar: AR_REAL });
    expect(r.list[0].ar, '★ 읽은 비율이 버려지고 기본값이 들어갔다').toBeCloseTo(AR_REAL, 9);
    // ⚠ 이 단언이 축의 전부다: `AR_REAL` 이 `ART_AR_DEF` 와 **다른 값**이어야 「읽었는가」와
    // 「기본값을 썼는가」가 갈린다. 픽스처가 두 값을 구별 못 해 `0 failed` 가 나는 것이
    // 이 저장소가 두 번 연속 겪은 형태다.
    expect(AR_REAL).not.toBeCloseTo(ART_AR_DEF, 3);
  });

  it('★ 못 읽으면 기본값 — 비율 하나 때문에 작품을 못 거는 것보다 낫다', async () => {
    const r = await hang({ ar: null });
    expect(r.list.length, '★ 종횡비 실패가 걸기를 통째로 막았다').toBe(1);
    expect(r.list[0].ar).toBeCloseTo(ART_AR_DEF, 9);
  });
});

describe('★ 거절 — 조용히 안 걸리는 것이 이 저장소에서 가장 비쌌던 형태다', () => {
  it('★ 벽이 아니면 안 걸리고 **사유를 말한다**', async () => {
    const r = await hang({ hit: FLOOR });
    expect(r.list.length, '★ 바닥에 액자가 걸렸다').toBe(0);
    expect(r.said.at(-1)?.warn, '★ 거절인데 경고가 아니다').toBe(true);
    expect(r.said.at(-1)?.msg, '★ 사유가 벽을 안 말한다').toContain('벽');
  });

  it('★ 아무것도 안 맞았으면 안 걸린다 (하늘을 향해 드롭)', async () => {
    expect((await hang({ hit: null })).list.length).toBe(0);
  });

  it('★ 쓸 수 없는 이름은 **벽을 찾기 전에** 거절한다', async () => {
    // 벽은 맞았는데 이름으로 거절되는 순서면 «벽은 맞았는데 왜 안 걸리지» 가 된다.
    const r = await hang({ name: '내 그림.png' });
    expect(r.list.length).toBe(0);
    expect(r.said.at(-1)?.warn).toBe(true);
    expect(r.said.at(-1)?.msg, '★ 사유가 이름을 안 말한다').toContain('이름');
  });

  it('★ 상위 경로 탈출은 막힌다 — 계약(`isSafeArtSrc`)이 그 관문이다', async () => {
    expect((await hang({ name: '../../etc/passwd.png' })).list.length).toBe(0);
  });

  it('★ 캔버스 밖 드롭은 조용히 아무 일도 안 한다', async () => {
    const r = await hang({ castOk: false });
    expect(r.list.length).toBe(0);
    expect(r.blobs.length).toBe(0);
  });
});

describe('★ 임시 주소(blob) — 회수와 누수', () => {
  it('★ 걸었으면 회수 등록한다 — 빠지면 세션이 끝나도 메모리가 남는다', async () => {
    const r = await hang({});
    expect(r.blobs.length, '★ `onBlobUrl` 을 안 불렀다').toBe(1);
    expect(r.blobs[0]).toBe(madeUrls[0]);
  });

  it('★ **거절 경로에서는 임시 주소를 만들지 않는다** — 거절할 때마다 누수가 쌓인다', async () => {
    for (const bad of [{ hit: FLOOR }, { hit: null }, { name: '내 그림.png' }]) {
      madeUrls = [];
      const r = await hang(bad);
      expect(madeUrls.length, `★ 거절(${JSON.stringify(bad)})인데 blob 을 만들었다`).toBe(0);
      expect(r.blobs.length).toBe(0);
    }
  });

  it('★ 미리보기가 등록돼 그 자리에서 바로 보인다 — 파일은 아직 저장소에 없다', async () => {
    const r = await hang({});
    // `resolve` 가 blob 을 내야 텍스처 로더가 **세션 안에서** 그림을 받을 수 있다.
    // base 결합으로 떨어지면 `assets/art/a.png` 는 404 이고 액자가 회색이다.
    expect(r.arts.resolve('assets/art/a.png'), '★ 미리보기가 안 걸렸다').toBe(madeUrls[0]);
    expect(r.arts.resolve('assets/art/other.png'), '★ 남의 경로까지 blob 이 됐다')
      .toBe('/base/assets/art/other.png');
    expect([...r.arts.localOnly()]).toEqual(['assets/art/a.png']);
  });

  it('★ 「보낼 준비가 됐다」를 말한다 — 「걸었다」로 끝나면 라이브의 빈 자리를 보고서야 안다', async () => {
    const r = await hang({});
    expect(r.said.at(-1)?.msg, '★ 파일을 보내라는 안내가 없다').toContain('보내');
    expect(r.said.at(-1)?.warn, '★ 성공인데 경고로 뜬다').toBe(false);
  });
});

// ── 포트 ────────────────────────────────────────────────────────────────────

describe('★ 작품 목록 포트 — 씬과 목록이 같이 움직인다', () => {
  it('★ `set` 이 씬에 **전체 대체**로 넘긴다', async () => {
    const calls: (readonly ArtworkItem[])[] = [];
    const port = createArtsPort((s) => s);
    port.attach({ place: async (a) => { calls.push(a); } });
    const one: ArtworkItem = { src: 'assets/art/a.png', x: 0, y: 0, z: 0, ry: 0, w: 1, ar: 1 };
    await port.set([one]);
    await port.set([one, { ...one, src: 'assets/art/b.png' }]);
    expect(calls.map((c) => c.length), '★ 씬이 목록 전체를 못 받는다').toEqual([1, 2]);
  });

  it('★ 씬이 안 물렸어도 목록은 바뀐다 — 부팅 순서에 걸려 내보내기가 비면 안 된다', async () => {
    const port = createArtsPort((s) => s);
    await port.set([{ src: 'assets/art/a.png', x: 0, y: 0, z: 0, ry: 0, w: 1, ar: 1 }]);
    expect(port.list().length).toBe(1);
  });

  it('★ 미리보기가 없으면 base 결합으로 간다', () => {
    expect(createArtsPort((s) => `/b/${s}`).resolve('assets/art/x.png')).toBe('/b/assets/art/x.png');
  });
});

// ── 배선 ────────────────────────────────────────────────────────────────────

describe('★ 배선 — 드롭이 실제로 이 경로로 온다', () => {
  /** `createInput` 을 최소 대역으로 돌리고 `drop` 리스너를 되돌려준다 */
  function wire(art?: { handles(n: string): boolean; drop(f: File, e: unknown): Promise<void> }) {
    const listeners = new Map<string, EventListener[]>();
    const doc = {
      addEventListener(t: string, f: EventListener) {
        const arr = listeners.get(t) ?? [];
        arr.push(f); listeners.set(t, arr);
      },
      removeEventListener() {},
    } as unknown as Document;
    const placed: string[] = [];
    const { panel } = fakePanel();
    const { picker } = fakePicker(WALL);
    const input = createInput({
      host: { doc, canvas: null } as unknown as OverlayHost,
      st: createEditState(),
      panel, picker,
      actions: {
        placeAt: async (src: string) => { placed.push(src); },
        previewUrls: new Map<string, string>(),
      } as unknown as Actions,
      gizmo: {} as unknown as Gizmo,
      toggleEditing() {},
      onBlobUrl() {},
      canUploadGlb: true,
      art: art as never,
    });
    input.bind();
    const fire = (name: string) => {
      const ev = {
        preventDefault() {},
        dataTransfer: { files: [FILE(name)] },
        clientX: 10, clientY: 20,
      } as unknown as DragEvent;
      for (const fn of listeners.get('drop') ?? []) fn(ev as unknown as Event);
    };
    return { fire, placed };
  }

  it('★ 이미지는 **작품 경로**로 간다 — 안 그러면 GLB 판정이 이름으로 거절한다', () => {
    const dropped: string[] = [];
    const { fire, placed } = wire({
      handles: (n) => looksLikeImage(n),
      drop: async (f) => { dropped.push(f.name); },
    });
    fire('a.png');
    expect(dropped, '★ 이미지 드롭이 작품 경로로 안 갔다').toEqual(['a.png']);
    expect(placed, '★ 이미지가 GLB 로도 놓였다 — 두 번 처리된다').toEqual([]);
  });

  it('★ GLB 는 **원래대로** 간다 — 이 분기가 새면 건물 올리기가 죽는다', () => {
    const dropped: string[] = [];
    const { fire, placed } = wire({
      handles: (n) => looksLikeImage(n),
      drop: async (f) => { dropped.push(f.name); },
    });
    fire('house.glb');
    expect(dropped, '★ GLB 가 작품 경로로 샜다').toEqual([]);
    expect(placed, '★ GLB 가 안 놓였다 — 라이브 회귀다').toEqual(['assets/models/house.glb']);
  });

  it('★ 작품 문이 없으면(구소비자) 이미지도 GLB 판정으로 간다 — 「생략 = 기존 동작」', () => {
    const { fire, placed } = wire(undefined);
    fire('a.png');
    // GLB 판정이 이름을 거절하므로 아무것도 안 놓인다. 요점은 **던지지 않는 것**이다.
    expect(placed).toEqual([]);
  });
});

// ── 내보내기 (D3) ───────────────────────────────────────────────────────────

describe('★ 내보내기가 **작품도** 「보낼 준비가 됐다」에 센다 (W8-4 D3)', () => {
  // 🔴 순수 판정(`pendingAssets`)이 `arts` 를 보게 됐어도, **집행이 두 미리보기 집합을
  // 합치지 않으면** 아무 일도 안 일어난다. GLB 는 `actions.previewUrls` 가 들고 작품은
  // 포트가 든다 — 소유자가 달라서 합치는 자리가 코드에 딱 하나 있고, 여기가 그 자리를
  // 실제로 돌려 보는 유일한 축이다(「경계를 건너는 지점은 아무도 안 본다」).

  const REVOKE = URL.revokeObjectURL;
  beforeEach(() => { (URL as { revokeObjectURL: unknown }).revokeObjectURL = () => {}; });
  afterEach(() => { (URL as { revokeObjectURL: unknown }).revokeObjectURL = REVOKE; });

  async function exportWith(opts: { arts?: boolean; glb?: boolean }) {
    const { createActions } = await import('../frontend/js/world2/edit/actions.js');
    const { panel, said } = fakePanel();
    const art: ArtworkItem = {
      src: 'assets/art/mine.png', x: 0, y: 1, z: 0, ry: 0, w: 2.4, ar: 1.5,
    };
    const port = createArtsPort((s) => s);
    await port.set([art], opts.arts ? { src: art.src, url: 'blob:x' } : undefined);
    const doc = {
      createElement: () => ({ href: '', download: '', click() {}, remove() {} }),
      body: { appendChild() {} },
    } as unknown as Document;
    // ⚠ GLB 를 **문서에도 싣는다.** 안 실으면 「내보낼 문서를 잰다」 규약 때문에 셀 것이
    // 애초에 없어 「합치는가」가 구별되지 않는다 — 첫 판본이 그랬고 축이 비어 있었다.
    const glbItem = { src: 'assets/models/mine.glb', x: 0, y: 0, z: 0, ry: 0, s: 1 };
    const host = {
      doc,
      toRaw: () => ({
        version: 2, items: opts.glb ? [glbItem] : [], parcels: [], surfaces: [], arts: [art],
      }),
      entries: () => [],
    } as unknown as OverlayHost;
    const actions = createActions(host, createEditState(), panel, port);
    // GLB 미리보기도 하나 심어 «둘을 합치는가» 를 잰다(한쪽만 세면 나머지가 빠진다).
    if (opts.glb) actions.previewUrls.set('assets/models/mine.glb', 'blob:g');
    actions.exportNow();
    return said.at(-1)?.msg ?? '';
  }

  it('★ 걸린 작품이 미리보기면 **파일을 보내라고 말한다**', async () => {
    const msg = await exportWith({ arts: true });
    expect(msg, '★ 저장했다고만 하고 끝난다 — 라이브는 빈 액자가 된다').toContain('아직 라이브가 아닙니다');
    expect(msg, '★ 어느 파일인지 안 말한다').toContain('mine.png');
  });

  it('★ 저장소에 이미 있는 작품은 **말하지 않는다** — 할 일이 없으면 침묵이다', async () => {
    expect(await exportWith({ arts: false })).not.toContain('아직 라이브가 아닙니다');
  });

  it('★ GLB 만 미리보기여도 여전히 잡는다 — 작품 축을 더하며 기존 축을 깨지 않았다', async () => {
    const msg = await exportWith({ glb: true });
    expect(msg, '★ GLB 축이 죽었다 — W8-3 S7 의 회귀다').toContain('mine.glb');
    expect(msg, '★ 저장소에 있는 작품까지 세었다').not.toContain('mine.png');
  });

  it('★ **둘 다** 미리보기면 둘 다 센다 — 한쪽만 세면 나머지가 조용히 빠진다', async () => {
    const msg = await exportWith({ arts: true, glb: true });
    expect(msg, '★ 작품이 빠졌다').toContain('mine.png');
    expect(msg, '★ GLB 가 빠졌다').toContain('mine.glb');
    expect(msg, '★ 개수가 둘이 아니다 — 합치는 자리가 하나를 삼켰다').toContain('2개');
  });
});
