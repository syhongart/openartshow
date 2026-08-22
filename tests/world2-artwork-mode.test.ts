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
import { createEditHistory } from '../frontend/js/world2/edit/history-ops.js';
import { createPicker, type Picker } from '../frontend/js/world2/edit/pick.js';
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

function fakePicker(hit: WallHit | null, castOk = true): { picker: Picker; casts: string[] } {
  // ⚠ **어느 쪽으로 쐈는지 기록한다**(W8-5). 두 진입점의 차이는 그것 **하나뿐**이라,
  // 결과만 보면 «버튼이 이벤트 좌표를 쓴다» 같은 뒤바뀜이 통째로 안 잡힌다 — 대역이
  // 두 값을 구별할 수 있어야 그 축이 검출력을 갖는다.
  const casts: string[] = [];
  const picker = {
    castFrom: () => { casts.push('from'); return castOk; },
    castCenter: () => { casts.push('center'); return castOk; },
    pickFace: () => hit,
    // 바닥 좌표는 **GLB 경로의 것**이다. 작품이 이걸 쓰면 액자가 원점 근처에 눕는다.
    groundAt: () => ({ x: 0, z: 0 }),
  } as unknown as Picker;
  return { picker, casts };
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
  /** 어느 문으로 들어왔나. 생략하면 드롭(PC) — 기존 검사가 전부 그 경로다 */
  via?: 'drop' | 'button';
}) {
  const { panel, said } = fakePanel();
  const { picker, casts } = fakePicker(opts.hit === undefined ? WALL : opts.hit, opts.castOk ?? true);
  const arts = createArtsPort((src) => `/base/${src}`);
  if (opts.before) await arts.set(opts.before);
  const blobs: string[] = [];
  const mode = createArtworkMode({
    panel, picker, arts,
    onBlobUrl: (u) => blobs.push(u),
    measure: async () => (opts.ar === undefined ? AR_REAL : opts.ar),
  });
  const file = FILE(opts.name ?? 'a.png');
  if (opts.via === 'button') await mode.pickFile(file);
  else await mode.drop(file, { clientX: 100, clientY: 200 });
  return { arts, said, blobs, casts, list: arts.list() };
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
    // ⚠ 이 문구는 한때 «마을 건물 벽은 아직 안 됩니다 — 팔레트에서 GLB 를 …» 였고,
    // 감독 판정으로 마을 벽이 열리면서 **거짓이 됐다.** 화면이 거짓을 말하지 않게
    // 함께 고쳤다 — 지금 남는 거절 사유는 기하뿐이다.
    expect(r.said.at(-1)?.msg, '★ 안내가 낡았다 — 마을 벽은 이제 된다').not.toContain('팔레트');
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

  it('★ 🔴 G2 — 사유가 **실제 원인**을 말한다 (검수관 블로커 B2)', async () => {
    // 🔴 원래 이 검사의 케이스는 `IMG_1234.JPG` 였다. 분류(`looksLikeImage`)는 대소문자를
    // 안 가리는데 계약은 소문자만 받아서, 그 틈에 들어온 대문자 확장자가 «영문·숫자·_ - .
    // 만 씁니다» 라는 **이미 만족한 조건**을 사유로 들었다. 그것이 B2 다.
    //
    // ⚠ **W8-5 에서 케이스를 옮겼다 — 검사를 지운 것이 아니다.** 대문자 확장자를 열었으므로
    // (#94, 팀장 판정) `IMG_1234.JPG` 는 이제 **그냥 걸린다.** 그런데 **B2 는 소멸한 것이
    // 아니라 한 칸 옆으로 갔다**: `photo.heic`·`a.gif` 가 정확히 같은 자리로 들어온다 —
    // 그 이름들도 문자군을 **이미 만족**하는데 확장자 목록 밖이라 떨어진다. 아이폰이
    // 「원본 유지」면 HEIC 를 내므로 이것은 가정이 아니라 감독이 바로 부딪히는 경로다.
    //
    // ⚠⚠ **두 사유가 실제로 갈리는지**를 잰다. 한 문구가 둘 다 덮으면 그 축은 검출력 0이다
    // — 「축을 태웠는가」가 아니라 「두 값이 실제로 갈리는가」다.
    const extOnly = await hang({ name: 'photo.heic' });      // 확장자만 위반
    const charsOnly = await hang({ name: '내그림.png' });      // 문자군만 위반

    expect(extOnly.list.length, '★ 계약 밖 확장자가 그냥 걸렸다 — 계약이 바뀌었나').toBe(0);
    expect(charsOnly.list.length).toBe(0);

    const a = extOnly.said.at(-1)?.msg ?? '';
    const b = charsOnly.said.at(-1)?.msg ?? '';
    expect(a, '★ 확장자가 원인인데 안 말한다').toContain('확장자');
    expect(a, '★ 이미 만족한 조건을 고치라고 한다 — 그것이 B2 였다').not.toContain('영문·숫자');
    expect(b, '★ 문자군이 원인인데 안 말한다').toContain('영문·숫자');
    expect(a === b, '★ 두 사유가 같은 문구다 — 이 축은 검출력이 0이다').toBe(false);
  });

  it('★ 🔴 계약 밖 확장자가 **작품 경로로 온다** — GLB 사유를 듣지 않게 (W8-5)', () => {
    // 위 G2 는 `drop` 을 직접 부르므로 **분류를 안 탄다.** 실물 경로에서는 `input.ts` 가
    // `handles()` 로 먼저 가르고, 거기서 떨어지면 GLB 경로로 흘러가 «확장자는 소문자 .glb»
    // 라는 **엉뚱한 사유**를 듣는다 — 사진을 떨어뜨렸는데 GLB 이야기를 듣는 형태다.
    // 그래서 분류는 계약보다 **넓어야** 하고, 이 단언이 그 폭을 못 박는다.
    for (const n of ['photo.heic', 'IMG_1.HEIC', 'a.gif', 'b.bmp', 'c.avif', 'd.tiff']) {
      expect(looksLikeImage(n), `★ ${n} 이 분류에서 떨어져 GLB 경로로 샌다`).toBe(true);
    }
    // 그래도 **거절은 된다** — 넓힌 것은 분류이지 계약이 아니다.
    expect(looksLikeImage('m.glb'), '★ GLB 를 작품으로 가로챈다').toBe(false);
  });

  it('★ 대문자 확장자는 이제 **걸린다** — 폰 사진이 주 경로다 (W8-5 · #94)', async () => {
    const r = await hang({ name: 'IMG_1234.JPG' });
    expect(r.list.length, '★ 폰 사진이 여전히 거절된다').toBe(1);
    expect(r.list[0]!.src, '★ 이름을 몰래 소문자로 바꿨다 — 커밋할 파일명과 어긋난다')
      .toBe('assets/art/IMG_1234.JPG');
    expect(r.said.at(-1)?.warn, '★ 걸렸는데 경고로 말한다').toBe(false);
  });

  it('★ 캔버스 밖 드롭은 조용히 아무 일도 안 한다', async () => {
    const r = await hang({ castOk: false });
    expect(r.list.length).toBe(0);
    expect(r.blobs.length).toBe(0);
  });
});

// ── 「사진 걸기」 버튼 — 좌표 없는 문 (W8-5) ─────────────────────────────────
//
// 감독 카드 2026-08-17: *"폰에서 넣기 먼저"*. 드래그드롭은 모바일 브라우저에 없고
// `<input type="file">` 의 `change` 에는 좌표가 없다. 그래서 좌표를 **카메라에서** 받는다.
//
// ⚠ 여기서 재는 것은 「기능이 있는가」가 아니라 **「두 문이 갈라지지 않는가」**다.
// 갈라지면 «PC 에서는 되는데 폰에서만 다르다» 가 되고 그것은 감독 실기기에서만 드러난다.

// ⚠ **위 describe 들은 `Picker` 를 대역으로 갈아 끼운다** — 그래서 `castCenter` 의 **실제
// 구현**은 거기서 한 줄도 안 돈다. 대역이 «중앙으로 쐈다» 를 기록해도 그것은 «`castCenter`
// 를 불렀다» 이지 «그 함수가 정말 중앙을 쏜다» 가 아니다. 이 저장소가 「판정/집행 경계는
// 아무도 안 본다」로 부르는 자리이고, 여기가 그 경계다 — 아래가 실제 구현을 돌린다.
//
// three 는 스텁으로 대체한다(`tests/world2-sky-system.test.ts` 가 세운 본보기) — 레이캐스터가
// **받은 NDC 를 그대로 붙잡아** 두면 「중앙인가」가 산술로 판정된다.

function stubPicker(rect: { left: number; top: number; width: number; height: number }) {
  const ndcs: { x: number; y: number }[] = [];
  class Raycaster {
    ray = { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } };
    setFromCamera(ndc: { x: number; y: number }) { ndcs.push({ ...ndc }); }
    intersectObjects() { return []; }
    intersectObject() { return []; }
  }
  const noop = class { dispose() {} };
  const THREE = {
    Raycaster,
    MeshBasicMaterial: noop,
    RingGeometry: noop,
    DoubleSide: 2,
    // 인스턴스 픽 경로가 부팅에 하나씩 만들어 둔다(`pick.ts` — 클릭당 재사용).
    // 이 축에서는 안 쓰지만 **생성자가 없으면 `createPicker` 자체가 못 선다.**
    Matrix4: class { elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
    Vector3: class { x = 0; y = 0; z = 0; set() { return this } },
    Mesh: class {
      rotation = { x: 0 }; visible = false; renderOrder = 0;
      position = { set() {} }; scale = { set() {} };
    },
  };
  const host = {
    THREE,
    canvas: { getBoundingClientRect: () => rect },
    camera: {},
    root: { add() {}, children: [] },
    entries: () => [],
    surfaceAt: () => 0,
  } as unknown as OverlayHost;
  return { picker: createPicker(host, createEditState()), ndcs };
}

describe('★ 🔴 `castCenter` 의 **실제 구현** — 대역이 아니라 산술을 잰다 (W8-5)', () => {
  const RECT = { left: 100, top: 50, width: 800, height: 600 };

  it('★ 화면 한가운데는 NDC (0, 0) 이다', () => {
    const { picker, ndcs } = stubPicker(RECT);
    expect(picker.castCenter(), '★ 중앙을 못 쐈다').toBe(true);
    const c = ndcs.at(-1)!;
    // ⚠ `toEqual({x:0,y:0})` 은 **못 쓴다** — `ndcOf` 가 y 를 부호 반전해 `-0` 이 나오고
    // `Object.is(-0, 0)` 은 거짓이다. 재려는 것은 부호 있는 0 이 아니라 **중앙인가**다.
    expect(c.x, '★ 가로가 중앙이 아니다 — 좌상단(-1)이면 `castFrom(0,0)` 구현이다').toBeCloseTo(0, 10);
    expect(c.y, '★ 세로가 중앙이 아니다 — 좌상단(1)이면 `castFrom(0,0)` 구현이다').toBeCloseTo(0, 10);
  });

  it('★ `castFrom` 은 **다른 곳**을 쏜다 — 둘이 실제로 갈린다', () => {
    const { picker, ndcs } = stubPicker(RECT);
    // 캔버스 좌상단. `castCenter` 를 `castFrom({clientX:0,clientY:0})` 로 구현하면
    // (rect 가 원점일 때) 정확히 이 값이 나오고, 그것이 이 회차의 뮤테이션 축이다.
    picker.castFrom({ clientX: RECT.left, clientY: RECT.top });
    expect(ndcs.at(-1)).toEqual({ x: -1, y: 1 });
    picker.castCenter();
    expect(ndcs.at(-1), '★ 두 함수가 같은 곳을 쏜다 — 하나가 다른 하나의 별명이 됐다')
      .not.toEqual({ x: -1, y: 1 });
  });

  it('★ 캔버스가 0 크기면 `false` — 가드를 우회하지 않았다', () => {
    // NDC (0,0) 을 손으로 넣으면 이 가드를 건너뛴다(폭 0 이면 나눗셈이 `Infinity` 를
    // 내고 조용히 아무것도 안 맞는다 — `ndcOf` 헤더). 계산 경로가 하나여야 한다.
    const { picker } = stubPicker({ left: 0, top: 0, width: 0, height: 0 });
    expect(picker.castCenter(), '★ 0 크기 캔버스에서 참을 냈다 — `ndcOf` 가드를 우회했다')
      .toBe(false);
  });
});

describe('★ 「사진 걸기」 버튼 — 좌표 없는 문 (W8-5 · 폰 경로)', () => {
  it('★ 🔴 화면 **한가운데**를 쏜다 — 이벤트 좌표가 아니다', async () => {
    const btn = await hang({ via: 'button' });
    const drop = await hang({ via: 'drop' });
    // `castFrom({clientX:0,clientY:0})` 로 구현하면 캔버스 **좌상단**을 쏜다. 결과만 보면
    // 둘 다 «걸렸다» 라서 구별이 안 되고, 화면에서는 «가끔 엉뚱한 데가 잡힌다» 로만 보인다.
    expect(btn.casts, '★ 버튼이 이벤트 좌표를 쓴다 — 폰에는 그 좌표가 없다').toEqual(['center']);
    expect(drop.casts, '★ 드롭이 화면 중앙을 쓴다 — 놓은 자리를 무시한다').toEqual(['from']);
  });

  it('★ 두 문이 **같은 몸통**을 탄다 — 걸린 결과가 같다', async () => {
    const btn = await hang({ via: 'button' });
    const drop = await hang({ via: 'drop' });
    expect(btn.list, '★ 문에 따라 걸리는 것이 다르다 — 배선이 갈렸다').toEqual(drop.list);
    expect(btn.blobs.length, '★ blob 수명 처리가 한쪽만 됐다').toBe(drop.blobs.length);
  });

  it('★ 종횡비·이름 판정도 버튼 경로에서 산다', async () => {
    const ok = await hang({ via: 'button' });
    expect(ok.list[0]!.ar, '★ 버튼 경로가 종횡비를 안 읽는다').toBe(AR_REAL);
    const bad = await hang({ via: 'button', name: '내그림.png' });
    expect(bad.list.length, '★ 버튼 경로가 이름 판정을 건너뛴다').toBe(0);
    expect(bad.blobs.length, '★ 이름으로 거절했는데 임시 주소가 만들어졌다').toBe(0);
  });

  it('★ 거절 문구가 **버튼에 맞는 할 일**을 말한다', async () => {
    const btn = await hang({ via: 'button', hit: FLOOR });
    const drop = await hang({ via: 'drop', hit: FLOOR });
    const a = btn.said.at(-1)?.msg ?? '';
    const b = drop.said.at(-1)?.msg ?? '';
    // 폰 사용자는 아무것도 «놓지» 않았다 — 버튼을 눌렀을 뿐이다. 한 문구로 뭉치면
    // «어디에 놓으라는 거지» 를 듣고, 할 일(몸을 돌린다)을 못 듣는다.
    // ⚠ W8-6 에서 이 문구가 바뀌었다 — 예전 «벽을 화면 한가운데 두고» 는 폰에서
    // **따를 수 없는 지시**였다(화면 한가운데가 패널에 덮여 있었다). 축은 그대로다:
    // 「두 진입점의 사유가 실제로 갈리는가」.
    expect(a, '★ 버튼인데 «놓아 주세요» 라고 한다 — 놓을 것이 없다').toContain('조준');
    expect(b, '★ 드롭인데 «가운데 두라» 고 한다 — 놓은 자리가 이미 있다').toContain('놓아');
    expect(a === b, '★ 두 문구가 같다 — 이 축은 검출력이 0이다').toBe(false);
  });

  it('★ 벽을 못 찾으면 **blob 을 안 만든다** — 거절마다 회수 대상이 쌓이지 않게', async () => {
    const r = await hang({ via: 'button', hit: FLOOR });
    expect(r.list.length).toBe(0);
    expect(r.blobs.length, '★ 거절했는데 임시 주소가 만들어졌다').toBe(0);
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
    port.attach({ place: async (a) => { calls.push(a); }, retarget: () => {} });
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
    const actions = createActions(
      host, createEditState(), panel,
      createEditHistory(host, createEditState(), panel, port), port);
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
