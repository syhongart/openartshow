// 편집 **실행취소**의 행위 테스트 (2026-08-22).
//
// 감독 지시: *"워크래프트3 편집기 보니깐. 오픈월드 수정할수있던데. 우리 편집기 보고
// 개선해봐."* — 그 편집기와 우리 것을 세었을 때 **없는 것 중 가장 위험한 것**이
// 실행취소였다. 배경은 `decide/history.ts` 헤더 한 곳이다.
//
// ── 무엇을 재는가 ───────────────────────────────────────────────────────────
// 이 기능의 결함은 전부 한 형태로 나타난다 — **«Ctrl+Z 가 가끔 안 먹는다».** 그래서
// 축을 「되돌아가는가」가 아니라 **「되돌아가지 않는 경로가 있는가」** 로 잡는다:
//
//   ① 스택 자체    선형 히스토리 · 상한 · 되돌릴 것이 없을 때
//   ② 세 저장소    오버레이 · 마을 파셀 · 작품 목록이 **각각** 되돌아가는가
//   ③ 배선        `createActions` 가 실제로 쌓는가(놓기·삭제·구역되돌리기)
//   ④ 안 쌓여야 할 것  자세가 안 바뀐 조작 · 값이 같은 확정
//   ⑤ 되돌릴 수 없는 것  `restore` 없는 소비자에서 **조용히 넘어가지 않는가**
//
// ⑤ 가 이 파일에서 가장 중요한 축이다. 「안 쌓기」로 처리하면 Ctrl+Z 가 **그 앞의
// 조작**을 되돌리고, 화면이 바뀌므로 감독은 그것을 성공으로 읽는다 — 「안 먹는 것」보다
// 나쁘다. 그 판정은 `barrier` 가 소유한다.
//
// ── 여기서 못 재는 것 ───────────────────────────────────────────────────────
// · 실제 브라우저에서 `Ctrl+Z` 가 이 경로까지 오는가(브라우저 기본 동작·IME·포커스)
// · 되살린 GLB 가 **화면에** 다시 뜨는가 — `restore` 가 `root.add` 를 부르는 것까지만
//   본다. 실제 렌더는 WebGPU 소관이고 헤드리스에 그 축이 없다.
// · 스택이 붙들고 있는 `holder` 의 GPU 자원 — `info.memory` 는 첫 렌더에 오르므로
//   노드에서 셀 수 없다(CLAUDE.md 의 그 한계 그대로).

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHistory, HISTORY_LIMIT, type Undoable } from '../frontend/js/world2/decide/history.js';
import {
  createHistoryOps, createEditHistory, parcelSnap, poseOf, samePose, sameData,
  barrier, barrierWhy, poseLabel, countLabel,
} from '../frontend/js/world2/edit/history-ops.js';
import { readHistoryKey } from '../frontend/js/world2/edit/history-input.js';
import { createActions } from '../frontend/js/world2/edit/actions.js';
import { createEditState, select } from '../frontend/js/world2/edit/state.js';
import type { OverlayEntry, OverlayHost, VillageRead } from '../frontend/js/world2/edit/types.js';
import type { Panel } from '../frontend/js/world2/edit/panel/dom.js';
import type { EditTarget } from '../frontend/js/world2/edit/target.js';

/** 화면에 한 말을 그대로 모으는 가짜 패널. `say` 가 이 기능의 유일한 사용자 신호다 */
function fakePanel(): { panel: Panel; said: string[]; refreshed: () => number } {
  const said: string[] = [];
  let n = 0;
  const panel = {
    say(m: string) { said.push(m); },
    refresh() { n += 1; },
  } as unknown as Panel;
  return { panel, said, refreshed: () => n };
}

function entry(id: number, over: Partial<OverlayEntry> = {}): OverlayEntry {
  return {
    id, src: `assets/models/${id}.glb`, preview: false,
    holder: { name: `h${id}` } as never,
    x: 0, y: 0, z: 0, ry: 0, s: 1, ...over,
  };
}

/** 오버레이만 있는 최소 호스트. `restore` 유무를 인자로 가른다 — ⑤ 가 그것을 잰다 */
function makeHost(opts: { restore?: boolean; village?: VillageRead | null } = {}) {
  const entries: OverlayEntry[] = [];
  const applied: OverlayEntry[] = [];
  const host = {
    entries: () => entries,
    remove(e: OverlayEntry) {
      const i = entries.indexOf(e);
      if (i >= 0) entries.splice(i, 1);
    },
    restore: opts.restore === false ? undefined : (e: OverlayEntry, at?: number) => {
      if (entries.indexOf(e) >= 0) return false;
      entries.splice(at ?? entries.length, 0, e);
      return true;
    },
    apply(e: OverlayEntry) { applied.push(e); },
    village: opts.village ?? null,
    surfaceAt: () => 0,
  } as unknown as OverlayHost;
  return { host, entries, applied };
}

/** 파셀 하나짜리 가짜 마을 원장. `freeze`/`thaw` 가 실제로 상태를 바꾼다 */
function makeVillage(computed: readonly { kind: string; x: number }[]) {
  let frozen: { kind: string; x: number }[] | null = null;
  const village = {
    partsAt: () => (frozen ? frozen.map((p) => ({ ...p })) : computed.map((p) => ({ ...p }))),
    isFrozen: () => frozen !== null,
    freeze(_px: number, _pz: number, parts: readonly { kind: string; x: number }[]) {
      frozen = parts.map((p) => ({ ...p }));
    },
    thaw() { frozen = null; },
  } as unknown as VillageRead;
  return { village, state: () => frozen };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('★ ① 스택 — 선형 히스토리와 상한', () => {
  const mk = (log: string[], name: string): Undoable => ({
    label: name,
    undo() { log.push(`-${name}`); },
    redo() { log.push(`+${name}`); },
  });

  it('되돌리고 다시 한다 — 순서는 LIFO 다', () => {
    const log: string[] = [];
    const h = createHistory();
    h.push(mk(log, 'a'));
    h.push(mk(log, 'b'));
    expect(h.undo()).toBe('b');
    expect(h.undo()).toBe('a');
    expect(h.undo()).toBeNull();
    expect(log).toEqual(['-b', '-a']);
    expect(h.redo()).toBe('a');
    expect(h.redo()).toBe('b');
    expect(h.redo()).toBeNull();
    expect(log).toEqual(['-b', '-a', '+a', '+b']);
  });

  it('🔴 새 조작이 들어오면 다시하기 가지가 버려진다 — 선형 히스토리', () => {
    const log: string[] = [];
    const h = createHistory();
    h.push(mk(log, 'a'));
    h.undo();
    expect(h.canRedo()).toBe(true);
    h.push(mk(log, 'b'));
    // 가지를 남기면 「다시하기가 내가 안 한 일을 한다」가 성립한다.
    expect(h.canRedo()).toBe(false);
    expect(h.redoDepth()).toBe(0);
  });

  it('🔴 상한을 넘으면 **가장 오래된 것**을 버린다 — 최근 것을 버리면 «방금 한 일이 안 되돌아간다»', () => {
    const log: string[] = [];
    const h = createHistory(3);
    for (const n of ['a', 'b', 'c', 'd']) h.push(mk(log, n));
    expect(h.depth()).toBe(3);
    expect(h.undo()).toBe('d');
    expect(h.undo()).toBe('c');
    expect(h.undo()).toBe('b');
    expect(h.undo()).toBeNull(); // a 는 버려졌다
  });

  it('상한 0·음수는 1 로 올린다 — 「누르면 되돌아가는데 아무 일도 없는」 상태를 안 만든다', () => {
    const log: string[] = [];
    for (const bad of [0, -5, 0.4]) {
      const h = createHistory(bad);
      h.push(mk(log, 'x'));
      expect(h.depth(), `limit=${bad}`).toBe(1);
      expect(h.undo()).toBe('x');
    }
  });

  it('기본 상한이 선언값과 같다 — 값 미러링 방지', () => {
    const log: string[] = [];
    const h = createHistory();
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) h.push(mk(log, String(i)));
    expect(h.depth()).toBe(HISTORY_LIMIT);
  });

  it('peekUndo 는 **꺼내지 않는다** — 경계 판정이 여기 달려 있다', () => {
    const log: string[] = [];
    const h = createHistory();
    h.push(mk(log, 'a'));
    expect(h.peekUndo()?.label).toBe('a');
    expect(h.depth()).toBe(1);
    expect(log).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('★ ② 세 저장소가 각각 되돌아간다', () => {
  it('오버레이 — 자세가 되돌아가고 씬에 반영된다', () => {
    const { host, applied } = makeHost();
    const ops = createHistoryOps(host);
    const e = entry(1);
    const before = poseOf(e);
    e.x = 5; e.ry = 1.5; e.s = 2;
    const u = ops.pose(e, before, '옮기기');
    expect(u).not.toBeNull();
    u!.undo();
    expect(poseOf(e)).toEqual({ x: 0, y: 0, z: 0, ry: 0, s: 1 });
    // 🔴 값만 되돌리고 `apply` 를 안 부르면 **화면은 옮긴 자리 그대로**다.
    expect(applied).toContain(e);
    u!.redo();
    expect(e.x).toBe(5);
    expect(e.s).toBe(2);
  });

  it('🔴 오버레이 삭제 — 되돌리면 **같은 객체가 원래 자리로** 돌아온다', () => {
    const { host, entries } = makeHost();
    const ops = createHistoryOps(host);
    const [a, b, c] = [entry(1), entry(2), entry(3)];
    entries.push(a, b, c);
    const at = entries.indexOf(b);
    host.remove(b);
    const u = ops.removed(b, at, '삭제');
    expect(entries).toEqual([a, c]);
    u.undo();
    // 같은 객체다 — `place()` 재호출이면 새 객체가 되어 다른 되돌리기 항목이 낡는다.
    expect(entries[1]).toBe(b);
    expect(entries).toEqual([a, b, c]);
    u.redo();
    expect(entries).toEqual([a, c]);
  });

  it('마을 — 동결 전이었으면 되돌리기가 **동결을 푼다**', () => {
    const { village, state } = makeVillage([{ kind: 'tree', x: 1 }]);
    const { host } = makeHost({ village });
    const ops = createHistoryOps(host);
    const before = parcelSnap(village, 0, 0);
    expect(before.frozen).toBe(false);
    // 파츠 하나를 더해 동결한다(= 「놓기」가 하는 일)
    village.freeze(0, 0, [{ kind: 'tree', x: 1 }, { kind: 'bench', x: 4 }] as never);
    expect(state()).toHaveLength(2);
    const u = ops.parcel(before, '파츠 놓기');
    expect(u).not.toBeNull();
    u!.undo();
    // 🔴 계산 배치로 돌아간다 — 「빈 배열로 동결」이 아니다(그것은 «나무까지 사라진» 상태다)
    expect(state()).toBeNull();
    u!.redo();
    expect(state()).toHaveLength(2);
  });

  it('마을 — 이미 동결된 파셀은 **그때의 배치로** 돌아간다', () => {
    const { village, state } = makeVillage([]);
    const { host } = makeHost({ village });
    const ops = createHistoryOps(host);
    village.freeze(0, 0, [{ kind: 'tree', x: 1 }] as never);
    const before = parcelSnap(village, 0, 0);
    village.freeze(0, 0, [] as never); // 지웠다
    const u = ops.parcel(before, '삭제');
    u!.undo();
    expect(state()).toEqual([{ kind: 'tree', x: 1 }]);
  });

  it('작품 — 목록 전체가 되돌아간다', async () => {
    let items: readonly unknown[] = [{ src: 'a.png', w: 1 }];
    const port = {
      list: () => items,
      set: vi.fn(async (next: readonly unknown[]) => { items = next; }),
    } as never;
    const { host } = makeHost();
    const ops = createHistoryOps(host, port);
    const before = port_list(port);
    items = [{ src: 'a.png', w: 1 }, { src: 'b.png', w: 2 }];
    const u = ops.arts(before, '걸기');
    expect(u).not.toBeNull();
    await u!.undo();
    expect(items).toHaveLength(1);
    await u!.redo();
    expect(items).toHaveLength(2);
  });
});

function port_list(p: { list(): readonly unknown[] }): readonly unknown[] {
  return p.list();
}

// ─────────────────────────────────────────────────────────────────────────────
describe('★ ④ 안 바뀐 조작은 안 쌓인다', () => {
  it('자세가 같으면 `null` — 잡았다 그 자리에서 놓은 드래그', () => {
    const { host } = makeHost();
    const ops = createHistoryOps(host);
    const e = entry(1);
    expect(ops.pose(e, poseOf(e), '옮기기')).toBeNull();
  });

  it('🔴 파셀 내용이 같으면 `null` — 확정이 **새 배열**을 만들어도', () => {
    const { village } = makeVillage([{ kind: 'tree', x: 1 }]);
    const { host } = makeHost({ village });
    const ops = createHistoryOps(host);
    village.freeze(0, 0, [{ kind: 'tree', x: 1 }] as never);
    const before = parcelSnap(village, 0, 0);
    // 같은 값으로 다시 확정 — 참조는 다르지만 내용은 같다
    village.freeze(0, 0, [{ kind: 'tree', x: 1 }] as never);
    expect(ops.parcel(before, '조작')).toBeNull();
  });

  it('🔴 동결 여부가 바뀌면 내용이 같아도 쌓인다 — 「손본 구역」이 됐다는 것이 변화다', () => {
    const { village } = makeVillage([{ kind: 'tree', x: 1 }]);
    const { host } = makeHost({ village });
    const ops = createHistoryOps(host);
    const before = parcelSnap(village, 0, 0); // frozen=false
    village.freeze(0, 0, [{ kind: 'tree', x: 1 }] as never); // 값은 같고 동결만 생겼다
    expect(ops.parcel(before, '동결')).not.toBeNull();
  });

  it('sameData — 참조가 달라도 내용이 같으면 같다 / 키 순서가 다르면 다르다(안전한 쪽)', () => {
    expect(sameData([{ a: 1 }], [{ a: 1 }])).toBe(true);
    expect(sameData([{ a: 1 }], [{ a: 2 }])).toBe(false);
    // 오답 방향이 「쓸데없이 하나 쌓임」이지 「조작이 사라짐」이 아니다.
    expect(sameData({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false);
  });

  it('samePose 는 정확 비교다 — 조작이 이산 스텝이라 근사 오차가 안 생긴다', () => {
    expect(samePose({ x: 0, y: 0, z: 0, ry: 0, s: 1 }, { x: 0, y: 0, z: 0, ry: 0, s: 1 })).toBe(true);
    expect(samePose({ x: 0, y: 0, z: 0, ry: 0, s: 1 }, { x: 1e-9, y: 0, z: 0, ry: 0, s: 1 })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('🔴 ⑤ 되돌릴 수 없는 조작은 **조용히 넘어가지 않는다**', () => {
  it('`restore` 없는 소비자의 삭제는 경계가 된다 — 「안 쌓기」가 아니다', () => {
    const { host, entries } = makeHost({ restore: false });
    const ops = createHistoryOps(host);
    const e = entry(1);
    entries.push(e);
    host.remove(e);
    const u = ops.removed(e, 0, '삭제');
    // 항목 자체는 만들어진다 — 안 만들면 Ctrl+Z 가 **그 앞의 조작**을 되돌린다.
    expect(u).not.toBeNull();
    expect(barrierWhy(u)).not.toBeNull();
    u.undo();
    expect(entries).toEqual([]); // 아무 일도 안 일어난다 — 그것이 정직한 결과다
  });

  it('보통 항목은 경계가 아니다 — `barrierWhy` 가 둘을 가른다', () => {
    const { host } = makeHost();
    const ops = createHistoryOps(host);
    const e = entry(1);
    expect(barrierWhy(ops.placed(e, '놓기'))).toBeNull();
    expect(barrierWhy(barrier('삭제', '문이 없습니다'))).toBe('문이 없습니다');
  });

  it('🔴 경계에서 되돌리기를 누르면 **사유를 말하고 멈춘다** — 스택이 안 줄어든다', () => {
    const { host, entries } = makeHost({ restore: false });
    const { panel, said } = fakePanel();
    const st = createEditState();
    const hist = createEditHistory(host, st, panel);
    const e = entry(1);
    entries.push(e);
    host.remove(e);
    hist.add(hist.ops.removed(e, 0, '삭제'));
    hist.undo();
    expect(said.at(-1)).toMatch(/되돌릴 수 없습니다/);
    // 꺼내지 않았다 — 다시 눌러도 같은 말을 한다(그 앞으로 미끄러지지 않는다).
    expect(hist.depth()).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('★ 세션 배선 — 감싼 `commit()` 이 조작을 저절로 쌓는다', () => {
  /** 오버레이 하나를 고른 상태를 만든다 — 여기 검사 대부분의 출발점이다 */
  function picked() {
    const made = makeHost();
    const { panel, said } = fakePanel();
    const st = createEditState();
    const e = entry(1);
    made.entries.push(e);
    select(st, made.host, { entry: e });
    const hist = createEditHistory(made.host, st, panel);
    hist.watch(st.target);
    return { ...made, panel, said, st, hist, e };
  }

  it('🔴 확정 한 번이 한 항목 — 호출부는 되돌리기를 모른다', () => {
    const m = picked();
    m.st.target!.x = 7;
    m.st.target!.commit();
    expect(m.hist.depth()).toBe(1);
    m.hist.undo();
    expect(m.e.x).toBe(0);
  });

  it('🔴 확정을 안 하면 안 쌓인다 — 드래그 중간 프레임이 항목이 되지 않는다', () => {
    const m = picked();
    m.st.target!.x = 7;
    m.st.target!.apply();
    expect(m.hist.depth()).toBe(0);
  });

  it('🔴 드래그 중 `watch()` 가 다시 불려도 기준이 안 밀린다 — 같은 대상이면 무시', () => {
    // `panel.refresh()` 가 드래그 중 매 프레임 불리고, 그 끝에서 `watch` 가 불린다.
    // 기준을 매번 다시 뜨면 되돌리기가 **마지막 한 프레임**으로만 간다.
    const m = picked();
    m.st.target!.x = 3;
    m.hist.watch(m.st.target); // 중간 refresh
    m.st.target!.x = 7;
    m.hist.watch(m.st.target);
    m.st.target!.commit();
    m.hist.undo();
    expect(m.e.x, '드래그 시작점(0)으로 돌아가야 한다').toBe(0);
  });

  it('같은 대상을 거듭 지켜봐도 한 번만 쌓인다 — refresh 는 매 프레임 불린다', () => {
    const m = picked();
    m.hist.watch(m.st.target);
    m.hist.watch(m.st.target);
    m.st.target!.x = 7;
    m.st.target!.commit();
    expect(m.hist.depth()).toBe(1);
  });

  it('🔴 `clear()` 뒤 같은 대상을 다시 지켜봐도 **두 겹으로 안 감싼다**', () => {
    // ⚠ 바로 위 검사는 「같은 대상인가」 가드가 막는 것이라 **두 겹 방지 자체를 못 잰다**
    // (뮤테이션 실측 2026-08-22: `WRAPPED` 플래그를 지워도 0 failed 였다). `clear()` 는
    // 그 가드의 기준(`current`)을 비우므로, 같은 대상이 다시 들어오는 **유일한 경로**다.
    // 두 겹이 되면 확정 한 번이 항목 둘을 쌓아 Ctrl+Z 를 두 번 눌러야 한다.
    const m = picked();
    m.hist.clear();
    m.hist.watch(m.st.target);
    m.st.target!.x = 7;
    m.st.target!.commit();
    expect(m.hist.depth(), '★ 한 조작이 두 번 쌓였다 — `commit` 이 두 겹으로 감싸졌다').toBe(1);
  });

  it('🔴 연속 조작은 각각 한 항목 — 기준이 확정마다 갱신된다', () => {
    const m = picked();
    m.st.target!.x = 3;
    m.st.target!.commit();
    m.st.target!.x = 7;
    m.st.target!.commit();
    expect(m.hist.depth()).toBe(2);
    m.hist.undo();
    expect(m.e.x).toBe(3);
    m.hist.undo();
    expect(m.e.x).toBe(0);
  });

  it('🔴 `hold()` 가 여러 확정을 하나로 묶는다 — 수치칸 타이핑', () => {
    const m = picked();
    m.hist.hold();
    for (const v of [1, 12, 12.5]) { m.st.target!.x = v; m.st.target!.commit(); }
    expect(m.hist.depth(), '묶는 중에는 안 쌓인다').toBe(0);
    m.hist.release();
    expect(m.hist.depth()).toBe(1);
    m.hist.undo();
    expect(m.e.x, '타이핑 전체가 한 번에 되돌아간다').toBe(0);
  });

  it('`release()` 를 안 부른 채 다른 것을 고르면 묶기가 풀린다 — 세션이 안 잠긴다', () => {
    const m = picked();
    m.hist.hold();
    const other = entry(2);
    m.entries.push(other);
    select(m.st, m.host, { entry: other });
    m.hist.watch(m.st.target);
    m.st.target!.x = 5;
    m.st.target!.commit();
    expect(m.hist.depth()).toBe(1);
  });

  it('되돌린 결과가 새 기준이 된다 — 다음 확정이 되돌린 것까지 되감지 않는다', () => {
    const m = picked();
    m.st.target!.x = 7;
    m.st.target!.commit();
    m.hist.undo();
    expect(m.e.x).toBe(0);
    m.st.target!.x = 2;
    m.st.target!.commit();
    expect(m.hist.depth()).toBe(1);
    m.hist.undo();
    expect(m.e.x).toBe(0);
  });

  /**
   * 마을·작품 어댑터를 **가짜로** 만든다.
   *
   * ⚠ 진짜 어댑터(`villageTarget`·`artTarget`)는 슬롯 핸들과 액자 씬을 요구해서 노드에서
   * 세울 수 없다. 여기서 재는 것은 «`history` 가 **`kind` 를 보고 알맞은 스냅샷을
   * 고르는가**» 이고, 그 판정의 입력은 `t.kind` 와 `st.villageSel`/`arts` 뿐이다 —
   * 어댑터 내부는 이 축에 안 들어온다. **못 재는 것**: 진짜 어댑터가 `commit()` 에서
   * 실제로 파셀을 동결하는가(그 축은 `edit/target.ts` 소관이다).
   */
  function fakeTarget(kind: 'village' | 'art', onCommit: () => void): EditTarget {
    return {
      kind, x: 0, y: 0, z: 0, ry: 0, s: 1, live: false,
      apply() { }, commit: onCommit, remove: () => true, ground: () => 0,
    } as unknown as EditTarget;
  }

  it('🔴 마을을 고르면 **파셀 스냅샷**으로 되돌린다 — 어댑터 자세로는 못 되돌린다', () => {
    const { village, state } = makeVillage([]);
    const { host } = makeHost({ village });
    const { panel } = fakePanel();
    const st = createEditState();
    village.freeze(2, 3, [{ kind: 'tree', x: 1 }] as never);
    st.villageSel = { px: 2, pz: 3, index: 0, kind: 'tree', x: 0, y: 0, z: 0, frozen: true, slot: null };
    const hist = createEditHistory(host, st, panel);
    // 확정이 파셀을 바꾼다 — 진짜 마을 어댑터가 하는 일과 같은 모양이다.
    const t = fakeTarget('village', () => {
      village.freeze(2, 3, [{ kind: 'tree', x: 1 }, { kind: 'bench', x: 5 }] as never);
    });
    st.target = t;
    hist.watch(t);
    t.commit();
    expect(hist.depth(), '★ 마을 확정이 안 쌓였다').toBe(1);
    hist.undo();
    expect(state(), '★ 파셀이 조작 전 배치로 안 돌아갔다').toEqual([{ kind: 'tree', x: 1 }]);
  });

  it('🔴 작품을 고르면 **목록 스냅샷**으로 되돌린다', async () => {
    let items: readonly unknown[] = [{ src: 'a.png', w: 1 }];
    const port = {
      list: () => items,
      set: async (next: readonly unknown[]) => { items = next; },
    } as never;
    const { host } = makeHost();
    const { panel } = fakePanel();
    const st = createEditState();
    st.artSel = 0;
    const hist = createEditHistory(host, st, panel, port);
    const t = fakeTarget('art', () => { items = [{ src: 'a.png', w: 9 }]; });
    st.target = t;
    hist.watch(t);
    t.commit();
    expect(hist.depth(), '★ 작품 확정이 안 쌓였다').toBe(1);
    hist.undo();
    await Promise.resolve();
    expect(items, '★ 목록이 조작 전으로 안 돌아갔다').toEqual([{ src: 'a.png', w: 1 }]);
  });

  it('아무것도 안 고른 채 `watch(null)` 은 조용히 통과한다', () => {
    const { host } = makeHost();
    const { panel } = fakePanel();
    const hist = createEditHistory(host, createEditState(), panel);
    hist.watch(null);
    hist.hold();
    hist.release();
    expect(hist.depth()).toBe(0);
  });

  it('되돌릴 것이 없으면 화면이 그렇게 말한다 — 침묵하지 않는다', () => {
    const { host } = makeHost();
    const { panel, said } = fakePanel();
    const hist = createEditHistory(host, createEditState(), panel);
    hist.undo();
    expect(said.at(-1)).toMatch(/없습니다/);
    hist.redo();
    expect(said.at(-1)).toMatch(/없습니다/);
  });

  it('`clear()` 뒤 첫 확정이 항목을 되살리지 않는다', () => {
    const m = picked();
    m.st.target!.x = 7;
    m.st.target!.commit();
    m.hist.clear();
    expect(m.hist.depth()).toBe(0);
    // 기준까지 안 비우면 여기서 「0 → 9」 가 통째로 한 항목이 된다.
    m.st.target!.x = 9;
    m.st.target!.commit();
    expect(m.hist.depth()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('★ 라벨은 유도한다 — 호출부가 이름을 주지 않는다', () => {
  it('바뀐 축 하나면 그 이름, 여럿이면 「조작」', () => {
    const a = { x: 0, y: 0, z: 0, ry: 0, s: 1 };
    expect(poseLabel(a, { ...a, x: 1 })).toBe('위치');
    expect(poseLabel(a, { ...a, y: 1 })).toBe('위치');
    expect(poseLabel(a, { ...a, ry: 1 })).toBe('회전');
    expect(poseLabel(a, { ...a, s: 2 })).toBe('크기');
    expect(poseLabel(a, { ...a, x: 1, ry: 1 })).toBe('조작');
    // 아무것도 안 바뀐 경우는 애초에 항목이 안 만들어진다(위 ④) — 라벨은 안 쓰인다.
    expect(poseLabel(a, { ...a })).toBe('조작');
  });

  it('개수 변화로 놓기·삭제를 가른다', () => {
    expect(countLabel(1, 2)).toBe('놓기');
    expect(countLabel(2, 1)).toBe('삭제');
    expect(countLabel(2, 2)).toBe('조작');
  });

  it('🔴 실제 조작에서 라벨이 붙는다 — 회전만 밀면 「회전」', () => {
    const made = makeHost();
    const { panel, said } = fakePanel();
    const st = createEditState();
    const e = entry(1);
    made.entries.push(e);
    select(st, made.host, { entry: e });
    const hist = createEditHistory(made.host, st, panel);
    hist.watch(st.target);
    st.target!.ry = 1;
    st.target!.commit();
    hist.undo();
    expect(said.at(-1)).toMatch(/되돌렸습니다: 회전/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('★ 되돌리기 키 판정', () => {
  const key = (code: string, o: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }> = {}) =>
    readHistoryKey({ code, ctrlKey: false, metaKey: false, shiftKey: false, ...o });

  it('Ctrl+Z 되돌리기 · Ctrl+Shift+Z / Ctrl+Y 다시하기', () => {
    expect(key('KeyZ', { ctrlKey: true })).toBe('undo');
    expect(key('KeyZ', { ctrlKey: true, shiftKey: true })).toBe('redo');
    expect(key('KeyY', { ctrlKey: true })).toBe('redo');
  });

  it('맥은 `Cmd` 다 — `Delete` 옆에 `Backspace` 를 받는 것과 같은 이유', () => {
    expect(key('KeyZ', { metaKey: true })).toBe('undo');
    expect(key('KeyZ', { metaKey: true, shiftKey: true })).toBe('redo');
  });

  it('🔴 수식키 없는 `Z`·`Shift+Z` 는 이 파일 것이 아니다 — 높이·셰이딩이 그대로 산다', () => {
    expect(key('KeyZ')).toBeNull();
    expect(key('KeyZ', { shiftKey: true })).toBeNull();
    expect(key('KeyX', { ctrlKey: true })).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('🔴 ③ 배선 — `createActions` 가 실제로 쌓는가', () => {
  function mount(opts: { village?: VillageRead } = {}) {
    const made = makeHost({ village: opts.village ?? null });
    const { panel, said } = fakePanel();
    const st = createEditState();
    const hist = createEditHistory(made.host, st, panel);
    const actions = createActions(made.host, st, panel, hist);
    return { ...made, panel, said, st, hist, actions };
  }

  it('삭제가 쌓이고, 되돌리면 되살아난다', () => {
    const m = mount();
    const e = entry(1);
    m.entries.push(e);
    select(m.st, m.host, { entry: e });
    m.actions.removeSelected();
    expect(m.entries).toEqual([]);
    expect(m.hist.depth()).toBe(1);
    m.hist.undo();
    expect(m.entries).toEqual([e]);
  });

  it('🔴 「구역 되돌리기」도 되돌린다 — 손본 배치를 통째로 버리는 조작이라 여기가 가장 필요하다', () => {
    const { village, state } = makeVillage([]);
    const m = mount({ village });
    village.freeze(3, 4, [{ kind: 'tree', x: 1 }] as never);
    select(m.st, m.host, {
      village: {
        px: 3, pz: 4, index: 0, kind: 'tree', x: 0, y: 0, z: 0, frozen: true, slot: null,
      },
    });
    // 마을 어댑터가 붙지 않는 하네스여도 `thawSelected` 는 `villageSel` 만 본다.
    m.actions.thawSelected();
    expect(state()).toBeNull();
    expect(m.hist.depth()).toBe(1);
    m.hist.undo();
    expect(state()).toEqual([{ kind: 'tree', x: 1 }]);
  });

  it('아무것도 안 고른 채 삭제하면 안 쌓인다 — 「말만 하고 끝나는」 경로', () => {
    const m = mount();
    m.actions.removeSelected();
    expect(m.hist.depth()).toBe(0);
    expect(m.said.at(-1)).toMatch(/고르세요/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 소비자 쪽 배선 — **여기서는 행위로 못 재는 것** (이 파일의 가장 큰 사각)
//
// 위 검사들은 전부 하네스의 `restore` 를 돈다. 즉 **제품의 `restore`
// (`features/overlay.ts`)가 통째로 틀려도 위 28건은 초록이다** — 이 저장소가
// 「하네스가 제품과 다르게 부른다」로 이미 데인 형태(검수관 3차 블로커 B-A)와 같다.
// 그 함수는 `disposed`·`root`·`entries`·`applyEntry` 클로저 위에서만 도는 코드라
// jsdom 스텁으로 꺼내 돌릴 수 없다.
//
// ⚠ **그래서 텍스트로 못 박는다. 그리고 이 축의 한계를 안다** — `world2-edit-place.test.ts`
// 헤더가 적은 그대로다: *"텍스트 위치는 제어흐름을 안 본다"*. 여기 통과가 「되살아난다」의
// 증거는 **아니고**, 배선이 통째로 빠지거나 되돌아가는 것만 잡는다. 실제 되살아남은
// 감독 확인(`?edit=1` 에서 지우고 Ctrl+Z)이 유일한 판정이다.
describe('소비자 · 라이브 호스트가 되살리기 문을 실제로 낸다', () => {
  const src = readFileSync('frontend/js/world2/features/overlay.ts', 'utf8');
  const fn = src.slice(src.indexOf('function restore('), src.indexOf('function toRaw('));

  it('🔴 반환 객체에 `restore` 가 실려 있다 — 안 실으면 삭제가 통째로 경계가 된다', () => {
    // `edit/types.ts` 가 선택 사양으로 뒀으므로 **빠뜨려도 `tsc` 가 안 막는다.**
    // 그 대가를 여기서 갚는다.
    expect(src).toMatch(/^\s*restore,\s*$/m);
  });

  it('이미 들어 있으면 `false` — 두 번 되돌려 같은 것이 둘이 되지 않는다', () => {
    expect(fn).toContain('entries.indexOf(e) >= 0');
  });

  it('🔴 **제자리에** 넣는다 — 끝에 붙이면 아웃라이너와 내보내기 순서가 튄다', () => {
    expect(fn).toContain('entries.splice(at ?? entries.length, 0, e)');
  });

  it('씬에 다시 붙이고 자세를 반영한다 — 하나라도 빠지면 «목록엔 있는데 화면엔 없다»', () => {
    expect(fn).toContain('.add(e.holder as never)');
    expect(fn, '자세까지 되돌린 뒤 되살리면 씬 행렬이 지우기 전 것이다').toContain('applyEntry(e)');
  });

  it('세션이 끝났으면 안 되살린다 — `dispose` 뒤에 붙이면 회수된 루트를 만진다', () => {
    expect(fn).toContain('disposed || !root');
  });

  it('🔴 `place()` 를 다시 타지 않는다 — 새 객체가 되면 다른 되돌리기 항목이 낡는다', () => {
    expect(fn, '근거는 `edit/types.ts` 의 `restore` 계약 한 곳이다').not.toContain('await ');
    expect(fn).not.toContain('modelOf(');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 조립 배선 — **이 회차에서 가장 큰 사각**
//
// 위 검사들은 전부 `createEditHistory` 를 **직접** 부른다. 그런데 제품에서 되돌리기가
// 사는가는 `edit/mode.ts` 가 ① `watch` 를 refresh 콜백에 물리고 ② 되돌리기 키 리스너를
// 편집 모드에 붙이는가에 달려 있다. **둘 중 하나만 빠져도 위 45건은 전부 초록인 채
// 라이브에서는 Ctrl+Z 가 아무 일도 안 한다** — 이 저장소가 검수관 3차 블로커 B-A 로
// 겪은 「조립이 그 부품을 안 물린」 형태 그대로다.
//
// `startEditMode` 를 실제로 돌리는 하네스는 `world2-edit-place.test.ts` 가 갖고 있지만
// 거기에 되돌리기 축을 얹으면 그 파일의 주제가 흐려진다. 여기서는 **배선만** 못 박는다.
// ⚠ 한계는 다른 정적 검사와 같다 — 「적혀 있다」까지이고 「불린다」는 못 본다.
describe('조립 · `edit/mode.ts` 가 되돌리기를 실제로 물린다', () => {
  const src = readFileSync('frontend/js/world2/edit/mode.ts', 'utf8');

  it('🔴 refresh 콜백이 `watch` 를 부른다 — 안 부르면 `commit` 이 안 감싸져 전부 죽는다', () => {
    // 콜백은 `createPanel` 의 넷째 인자다. 그 안에 있어야 «고를 때마다» 불린다.
    const cb = src.slice(src.indexOf('picker.syncMarker();'), src.indexOf('const art = opts.arts'));
    expect(cb, '★ refresh 콜백에 `history.watch(st.target)` 가 없다').toContain('history.watch(st.target)');
  });

  it('🔴 되돌리기 키가 편집을 켤 때 붙고 끌 때 떨어진다', () => {
    expect(src).toContain('createHistoryInput({');
    // 붙이기 1 · 떼기 2(모드 끄기 · dispose). 하나라도 빠지면 「주행 중에도 먹거나」
    // 「편집을 껐다 켜면 안 먹거나」가 된다.
    expect(src.match(/historyInput\.bind\(\)/g) ?? []).toHaveLength(1);
    expect(src.match(/historyInput\.unbind\(\)/g) ?? []).toHaveLength(2);
  });

  it('🔴 세션이 끝나면 스택을 비운다 — 지운 항목의 holder 를 붙들고 있다', () => {
    const dispose = src.slice(src.indexOf('dispose() {'));
    expect(dispose).toContain('history.clear()');
  });

  it('🔴 패널 버튼과 키가 **같은 스택**을 본다', () => {
    for (const line of ['undo: () => { history.undo(); }', 'redo: () => { history.redo(); }',
      'holdEdit: () => { history.hold(); }', 'releaseEdit: () => { history.release(); }']) {
      expect(src, `★ 패널 핸들러 배선 누락: ${line}`).toContain(line);
    }
  });

  it('🔴 `Ctrl+Shift+Z` 가 셰이딩 토글로 새지 않는다 — 두 겹 방어의 둘째', () => {
    const input = readFileSync('frontend/js/world2/edit/input.ts', 'utf8');
    expect(input, '★ 셰이딩 조건이 `Ctrl`/`Cmd` 를 안 배제한다')
      .toContain("ev.shiftKey && !ev.ctrlKey && !ev.metaKey && ev.code === 'KeyZ'");
  });
});
