// world2/edit/history-ops.ts — **무엇을 어떻게 되돌리는가.** 스택은 `decide/history.ts`.
//
// 감독 지시 2026-08-22: *"워크래프트3 편집기 … 우리 편집기 보고 개선해봐."* 배경과
// 「왜 실행취소가 먼저인가」는 그 파일 헤더 한 곳이다 — 여기에 다시 적지 않는다.
//
// ── 세 저장소가 있고, 되돌리기는 **셋 다** 덮어야 한다 ──────────────────────
// 편집이 바꾸는 것이 한 곳에 있지 않다. 실측(2026-08-22):
//
//   오버레이 항목   `features/overlay.ts` 의 `entries` 배열 + 씬 `root` 의 자식
//   마을 파츠      `systems/village-parcels.ts` 의 **동결 원장**(파셀 단위)
//   걸린 작품      `systems/art-port.ts` 의 `items` 배열
//
// 하나라도 빠지면 «Ctrl+Z 가 가끔 안 먹는다» 가 되고, 그것이 이 저장소가 가장 비싸게
// 겪은 형태다. 그래서 셋을 **같은 모양**으로 환원한다 — 「조작 전 스냅샷 → 복원」.
//
// ── 왜 세 스냅샷의 **단위가 다른가** ────────────────────────────────────────
// 각 저장소가 「되돌린다」를 안전하게 표현할 수 있는 가장 좁은 단위가 다르기 때문이다.
//
//   오버레이 → **항목 하나**(`OverlayEntry` 참조 + 다섯 값)
//     항목이 값을 직접 들고 있고 참조가 세션 내내 유효하다. 배열째 뜰 이유가 없다.
//
//   마을     → **파셀 하나**(`{ frozen, parts[] }`)
//     ⚠ 어댑터(`villageTarget`)를 붙들면 **안 된다** — 그것은 슬롯 핸들을 들고 있고,
//     슬롯은 스트리밍이 그 파셀을 걷는 순간 죽는다(`edit/types.ts` 의 `SlotRef` 경고).
//     되돌리기는 **한참 뒤에** 눌리는 조작이라 그 사이 카메라가 얼마든지 멀어질 수 있다.
//     반면 `freeze(px, pz, parts)` 는 파셀을 통째로 다시 만들므로 슬롯 생사와 무관하다.
//     **그래서 여기서만 「더 넓은 단위가 더 안전한」 역전이 일어난다.**
//
//   작품     → **목록 전체**(`ArtsPort.list()`)
//     계약이 «통째로 갈아 끼운다»(`set()`)뿐이고 항목 단위 문이 없다. 게다가 인덱스가
//     밀리는 사고를 이미 두 번 냈다(`edit/target-art.ts` 의 B1·B-1). 배열 스냅샷은
//     그 축을 통째로 없앤다 — 항목 객체 참조는 `set` 이 유지하므로 사본이 얕아도 된다.
//
// ── 되돌리기가 **선택을 안 건드린다** ───────────────────────────────────────
// 되살아난 것을 자동으로 고르지 않는다. 「되돌리기」와 「고르기」는 다른 축이고, 붙이면
// 연속 Ctrl+Z 마다 패널이 튄다. 다만 **지워진 것을 고른 채로 되돌리는** 경우가 있어
// 호출부(`edit/input.ts`)가 그 뒤 `panel.refresh()` 를 부른다.

import type { OverlayEntry, OverlayHost, VillageRead } from './types.js';
import { createHistory, type History, type Undoable } from '../decide/history.js';
import type { EditState } from './state.js';
import type { Panel } from './panel/dom.js';
import type { PlacedPart } from '../parts/types.js';
import type { ArtsPort } from '../systems/art-port.js';
import type { EditTarget } from './target.js';

/**
 * 조작이 미는 값. `EditTarget` 과 같은 모양이지만 **값 사본**이다.
 *
 * 🔴 **축별 배수 셋이 늘었다** (검수관 반려 B1, 2026-08-25). 이름은 `Pose5` 로 남긴다 —
 * 소비자가 여럿이고 이름을 바꾸면 그 diff 가 이번 결함 수정을 덮는다.
 *
 * ⚠ **이 셋이 없어서 「Ctrl+Z 가 아무 일도 안 하는」 상태였다.** 축별만 바꾸면 `s` 는
 * 그대로라 `samePose` 가 **변경 자체를 감지 못 했고**, 그래서 스택에 **쌓이지도 않았다**.
 * 검수관 실측: `axes.set('x', 2)` → `commit()` → `depth()` 가 **0**, undo 는
 * *"되돌릴 것이 없습니다"*. 이 파일 헤더가 *"하나라도 빠지면 «Ctrl+Z 가 가끔 안 먹는다»
 * 가 되고, 그것이 이 저장소가 가장 비싸게 겪은 형태다"* 라고 적어 둔 바로 그 결함이다.
 *
 * ⚠⚠ **마을은 우연히 멀쩡했다** — 그쪽 경로가 파셀 전체를 `JSON.stringify` 로 비교해서
 * 축별 변화가 **필드를 세지 않고** 걸렸다. 즉 「한쪽만 깨진 것」이라 증상이 더 고약했다:
 * 마을에서 시험해 보고 «되돌리기 된다» 고 결론 내면 GLB 쪽 결함을 영영 못 본다.
 */
export interface Pose5 {
  x: number; y: number; z: number; ry: number; s: number;
  /** 축별 배수. **생략은 생략으로** — 계약(`OverlayItem.sx?`)과 같은 규칙이다 */
  sx?: number; sy?: number; sz?: number;
}

/** 값을 들고 밀 수 있는 것. `EditTarget` 과 `OverlayEntry` 가 둘 다 만족한다 */
interface Posed {
  x: number; y: number; z: number; ry: number; s: number;
  sx?: number; sy?: number; sz?: number;
}

export function poseOf(t: Readonly<Posed>): Pose5 {
  // 🔴 **두 경로를 다 읽는다** (2026-08-25). `EditTarget` 은 `sx` **필드가 없고**
  // `axes.get()` 으로만 값을 낸다(어댑터가 마을의 본래 치수를 배수로 환산해야 하므로
  // 필드를 그대로 노출할 수 없다). 그래서 필드만 읽으면 **기즈모가 실제로 쓰는 경로에서
  // 축별 변경이 안 잡힌다** — 검수관 B1 을 고치면서 필드 쪽만 열었다가 여기서 다시
  // 걸렸고, 그것을 잡은 것은 「어댑터 경로」 테스트다.
  //
  // ⚠ **재는 길이 실제 길과 같아야 한다.** 항목을 직접 만지는 검사만으로는 이 결함이
  // 통과한다 — 이 저장소가 「판정/집행 경계는 아무도 안 본다」로 반복해서 데인 형태다.
  const a = (t as { axes?: { get(k: 'x' | 'y' | 'z'): number } }).axes;
  const axis = a
    // 어댑터는 「없음」을 표현하지 못한다(항상 배수를 낸다) — `1` 은 안 담아 필드 경로와
    // 같은 모양으로 맞춘다. 그래야 `samePose` 의 `?? 1` 접기와 어긋나지 않는다.
    ? {
      ...(a.get('x') === 1 ? {} : { sx: a.get('x') }),
      ...(a.get('y') === 1 ? {} : { sy: a.get('y') }),
      ...(a.get('z') === 1 ? {} : { sz: a.get('z') }),
    }
    // 생략은 생략으로 — 안 만진 항목에 키가 붙으면 `samePose` 가 `undefined !== 1` 로
    // **안 바뀐 조작을 바뀐 것으로** 읽어 빈 되돌리기가 쌓인다.
    : {
      ...(t.sx === undefined ? {} : { sx: t.sx }),
      ...(t.sy === undefined ? {} : { sy: t.sy }),
      ...(t.sz === undefined ? {} : { sz: t.sz }),
    };
  return { x: t.x, y: t.y, z: t.z, ry: t.ry, s: t.s, ...axis };
}

/** 두 자세가 같은가. **정확 비교다** — 조작은 이산 스텝이라 근사 오차가 안 생긴다 */
export function samePose(a: Pose5, b: Pose5): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z && a.ry === b.ry && a.s === b.s
    // ⚠ **`?? 1` 로 접어 비교한다.** 「없음」과 「1」은 화면에서 같은 것이므로 다르게
    // 읽으면 축별을 1 로 되돌린 조작이 «바뀌었다» 로 쌓인다(빈 되돌리기).
    && (a.sx ?? 1) === (b.sx ?? 1)
    && (a.sy ?? 1) === (b.sy ?? 1)
    && (a.sz ?? 1) === (b.sz ?? 1);
}

/**
 * 값 배열 둘이 **내용으로** 같은가.
 *
 * ── 왜 `JSON.stringify` 인가 (필드를 세지 않는 것이 요점이다) ────────────────
 * 마을 파츠(`PlacedPart`)도 걸린 작품(`ArtworkItem`)도 **값 타입**이고, 확정 경로가
 * 언제나 **새 사본**을 만든다(`edit/target.ts` 의 마을 어댑터 · `edit/target-art.ts`
 * 의 `commit` 이 `{ ...cur }`). 그래서 참조 비교는 **언제나 「달라졌다」로 답한다** —
 * 아무것도 안 바꾼 확정까지 스택에 쌓이고, Ctrl+Z 가 아무 일도 안 하는 회차가 생긴다.
 *
 * 필드를 손으로 비교하면 그 목록이 계약과 갈라진다 — 계약이 필드를 하나 늘릴 때 여기가
 * 안 따라오면 **그 필드의 변경만 조용히 안 쌓인다.** 이 저장소가 「값 미러링」이라고
 * 부르며 반복해서 데인 형태이고, 직렬화는 그 축을 통째로 없앤다(필드를 안 적는다).
 *
 * ⚠ **키 순서에 민감하다** — 같은 값이라도 키 순서가 다르면 「달라졌다」로 답한다. 그
 * 방향의 오답은 **안전한 쪽**이다(쓸데없이 하나 쌓일 뿐, 되돌리기가 정확히 복원한다).
 * 반대 방향(다른데 같다고 답하기)이 나면 조작이 통째로 사라지므로, 의심스러우면
 * 「다르다」로 떨어지는 이 비교를 쓴다.
 */
export function sameData(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 파셀 하나의 동결 상태. 마을 되돌리기의 단위다 */
export interface ParcelSnap {
  readonly px: number;
  readonly pz: number;
  /** 조작 **전에** 동결돼 있었나. `false` 면 되돌리기는 `thaw` 다 */
  readonly frozen: boolean;
  /** 조작 전 배치. `frozen` 이 `false` 면 계산 결과이므로 되돌릴 때 안 쓴다 */
  readonly parts: readonly PlacedPart[];
}

/**
 * 파셀의 지금 상태를 뜬다. **조작 전에** 부른다.
 *
 * ⚠ `partsAt` 은 매 호출 새 배열을 준다(`systems/village-parcels.ts` 의 보증)므로 그대로
 * 들어도 저장소의 것이 오염되지 않는다. 다만 **항목 객체는 공유**다 — 조작이 파츠의
 * 필드를 제자리에서 바꾸면 스냅샷도 함께 바뀐다. 마을 조작은 그렇게 하지 않는다
 * (`edit/target.ts` 의 마을 어댑터가 `freeze` 에 **새 배열**을 넘긴다)는 것이 전제다.
 */
export function parcelSnap(village: VillageRead, px: number, pz: number): ParcelSnap {
  return {
    px, pz,
    frozen: village.isFrozen(px, pz),
    parts: village.partsAt(px, pz),
  };
}

/** 파셀을 스냅샷 상태로 되돌린다. 동결 전이었으면 **동결을 푼다** */
function restoreParcel(village: VillageRead, s: ParcelSnap): void {
  if (s.frozen) village.freeze(s.px, s.pz, s.parts);
  else village.thaw(s.px, s.pz);
}

/**
 * 되돌릴 수 **없는** 조작을 그 자리에 남기는 표시.
 *
 * ── 왜 「안 쌓기」가 아니라 「경계」인가 ─────────────────────────────────────
 * 안 쌓으면 Ctrl+Z 가 **그 앞의 조작**을 되돌린다. 감독은 방금 한 일이 되돌아갈 줄 알고
 * 눌렀는데 엉뚱한 것이 움직이는 셈이고, 그것은 「안 먹는 것」보다 나쁘다 — 화면이 바뀌니
 * 성공으로 읽힌다. 경계를 쌓으면 거기서 멈추고 **왜 못 되돌리는지 말한다.**
 *
 * 지금 이것이 실제로 쓰이는 경로는 **`OverlayHost.restore` 가 없는 소비자**뿐이다
 * (테스트 하네스·빌더 미리보기). 제품 소비자 `features/overlay.ts` 는 구현한다.
 */
export function barrier(label: string, why: string): Undoable & { readonly why: string } {
  return { label, why, undo() { }, redo() { } };
}

/** 이 조작이 되돌릴 수 없는 것인가. 화면이 사유를 말해야 한다 */
export function barrierWhy(e: Undoable): string | null {
  const w = (e as { why?: unknown }).why;
  return typeof w === 'string' ? w : null;
}

export interface HistoryOps {
  /** 자세가 바뀐 것을 되돌린다. **안 바뀌었으면 `null`** — 그때는 쌓지 않는다 */
  pose(t: Posed, before: Pose5, label: string): Undoable | null;
  /** GLB 를 놓았다(복제 포함). 되돌리면 지운다 */
  placed(e: OverlayEntry, label: string): Undoable;
  /** GLB 를 지웠다. 되돌리면 되살린다 — `restore` 가 없는 소비자면 경계가 된다 */
  removed(e: OverlayEntry, at: number, label: string): Undoable;
  /** 마을 파셀을 바꿨다(놓기·삭제·자세·색·구역되돌리기 전부). 스냅샷은 조작 **전** 것 */
  parcel(before: ParcelSnap, label: string): Undoable | null;
  /** 작품 목록을 바꿨다. 스냅샷은 조작 **전** 목록 */
  arts(before: readonly unknown[], label: string): Undoable | null;
}

export function createHistoryOps(host: OverlayHost, arts?: ArtsPort): HistoryOps {
  return {
    pose(t, before, label) {
      const after = poseOf(t);
      // 안 바뀐 조작을 쌓으면 Ctrl+Z 가 **아무 일도 안 하는** 회차를 만든다. 클릭만 하고
      // 손을 뗀 드래그가 실제로 그 형태이고, 기즈모는 그것이 흔하다.
      if (samePose(before, after)) return null;
      const put = (p: Pose5) => {
        t.x = p.x; t.y = p.y; t.z = p.z; t.ry = p.ry; t.s = p.s;
        // 🔴 **축별도 되돌린다** (검수관 반려 B1). 값을 스냅샷에 담기만 하고 여기서
        // 안 쓰면 **되돌리기가 절반만 동작한다** — 스택에는 쌓이는데 축별은 그대로다.
        // 「담기」와 「쓰기」는 다른 일이고, 이 저장소가 판정/집행 경계에서 반복해서
        // 놓친 자리가 정확히 그것이다.
        //
        // ⚠ `axes` 문을 내는 대상은 그 문으로 민다 — 마을은 배수를 **본래 치수로 환산**
        // 해야 하므로 필드에 직접 쓰면 안 된다(`target.ts` 의 어댑터가 그 환산을 소유한다).
        const withAxes = t as Posed & { axes?: EditTarget['axes'] };
        if (withAxes.axes) {
          withAxes.axes.set('x', p.sx ?? 1);
          withAxes.axes.set('y', p.sy ?? 1);
          withAxes.axes.set('z', p.sz ?? 1);
        } else {
          // 문이 없는 것(`OverlayEntry` 직접 — `placed`/`removed` 경로)은 필드에 쓴다.
          withAxes.sx = p.sx; withAxes.sy = p.sy; withAxes.sz = p.sz;
        }
        // 씬에 반영한다. **두 모양이 온다** — `flush()` 는 `EditTarget`(어댑터)을 넘기고
        // (`snapOf` 의 `{kind:'overlay', t}`), `placed`/`removed` 경로는 `OverlayEntry` 를
        // 직접 넘긴다.
        //
        // 🔴 **어댑터 쪽은 `isEntry` 가 `false` 다**(`holder` 가 없다). 그래서 이 줄이
        // `isEntry` 하나였을 때 **되돌린 값이 화면에 안 실렸다** — 기존 검사가 항목을
        // 직접 넘겨서 그 사각을 못 봤다(2026-08-25, 축별 되돌리기를 고치다 드러났다).
        // 어댑터는 자기 `apply()` 로 반영한다(오버레이는 그것이 곧 `host.apply(e)` 다).
        if (isEntry(t)) host.apply(t);
        else (t as { apply?: () => void }).apply?.();
      };
      return { label, undo: () => put(before), redo: () => put(after) };
    },
    placed(e, label) {
      // ⚠ **`removed()` 와 같은 조건으로 가른다**(검수관 권고 P3, 2026-08-22). `restore`
      // 가 없으면 「되돌리기」는 되는데 **「다시하기」가 조용히 아무 일도 안 한다** —
      // 화면은 「다시 했습니다: 놓기」라고 말한다. 아래 `removed()` 는 같은 상황을 이미
      // 경계로 막고 있었고, 그 비대칭이 남아 있었다.
      if (!host.restore) {
        return barrier(label, '이 화면은 되돌린 배치를 다시 놓는 문이 없습니다');
      }
      const restore = host.restore;
      let at = host.entries().indexOf(e);
      return {
        label,
        undo() {
          at = host.entries().indexOf(e);
          host.remove(e);
        },
        redo() { restore(e, at); },
      };
    },
    removed(e, at, label) {
      if (!host.restore) {
        return barrier(label, '이 화면은 지운 것을 되살리는 문이 없습니다');
      }
      const restore = host.restore;
      return {
        label,
        undo() { restore(e, at); },
        redo() { host.remove(e); },
      };
    },
    parcel(before, label) {
      const village = host.village;
      if (!village) return null;
      const after = parcelSnap(village, before.px, before.pz);
      if (before.frozen === after.frozen && sameData(before.parts, after.parts)) return null;
      return {
        label,
        undo: () => restoreParcel(village, before),
        redo: () => restoreParcel(village, after),
      };
    },
    arts(before, label) {
      if (!arts) return null;
      const after = arts.list();
      if (sameData(before, after)) return null;
      return {
        label,
        // ⚠ `set()` 은 비동기다 — 스택이 기다리지 않는 이유는 `decide/history.ts` 의
        // `undo()` 주석 한 곳이다. 미리보기(`blob:`)는 포트가 따로 들고 있으므로
        // (`art-port.ts` 의 `previews`) 되살아난 항목도 그림이 뜬다.
        undo: () => arts.set(before as never),
        redo: () => arts.set(after as never),
      };
    },
  };
}

/** 다섯 값을 미는 것이 **오버레이 항목**인가. `holder` 는 그것만 갖는다 */
function isEntry(t: Posed): t is OverlayEntry & Posed {
  return typeof (t as { holder?: unknown }).holder === 'object'
    && (t as { holder?: unknown }).holder !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 세션 배선 — **호출부가 되돌리기를 몰라도 되게** 한다.
//
// ── 첫 판본은 조작 지점마다 경계를 열게 했고, 그것이 틀린 축이었다 ──────────
// 자세를 확정하는 자리가 실측 **여덟 곳**이다(`commit()` 호출부 전수, 2026-08-22):
//   `input.ts` 3(모달 확정·드래그 종료·키) · `panel/dom.ts` 1 · `panel/inspector.ts` 4
// 그 여덟 곳에 `begin()`/`end(label)` 을 심었더니 **한 곳만 빠뜨려도 그 조작만 조용히
// 안 쌓이는** 구조가 됐다 — 이 회차가 없애려던 «가끔 안 먹는다» 를 되돌리기 자신이
// 재현하는 형태다. 게다가 `input.ts` 가 683→737줄이 되어 파일 크기 게이트에 걸렸다.
//
// **그래서 축을 뒤집었다: 여덟 곳이 이미 부르고 있는 `commit()` 을 감싼다.**
//   · 호출부 수정 **0** — 새 조작 지점이 생겨도 저절로 따라온다
//   · 빠뜨릴 자리가 없다 — 확정하지 않는 조작은 애초에 화면에도 안 남는다
//   · `input.ts` 순증 **0**(셰이딩 조건 한 줄만 바뀐다)
//
// ── 라벨도 **유도한다** ─────────────────────────────────────────────────────
// 호출부가 이름을 주지 않으므로 스냅샷 비교로 «무엇이 바뀌었나» 를 읽는다. 오히려
// 정확하다 — 「크기 +」 버튼이 실제로는 아무것도 못 바꿨을 때(상한) 「크기」라고 적지 않는다.
//
// ── 이 배선이 **못 잡는 것** ────────────────────────────────────────────────
// `commit()` 을 안 타는 변경. 지금 그것은 **삭제·놓기 둘뿐**이고 둘 다 `edit/actions.ts`
// 가 직접 쌓는다. 셋째가 생기면 여기가 아니라 그 자리에서 쌓아야 한다.

/** 조작 직전 상태. 대상 종류마다 단위가 다르다 — 이유는 이 파일 헤더 한 곳이다 */
type Snap =
  | { readonly kind: 'overlay'; readonly t: Posed; readonly pose: Pose5 }
  | { readonly kind: 'village'; readonly before: ParcelSnap }
  | { readonly kind: 'art'; readonly before: readonly unknown[] }
  | null;

/**
 * 자세 다섯 값 중 **무엇이 바뀌었나**. 화면에 「되돌렸습니다: 회전」으로 뜬다.
 *
 * ⚠ `decide/modal-edit.ts` 의 `nameOf` 와 문자열이 겹치지만 **미러링이 아니다** — 그쪽은
 * «지금 무엇을 하고 있나» 를 실시간으로 말하고 이쪽은 «무엇을 되돌렸나» 를 목록에 적는다.
 * 한쪽을 바꿔도 다른 쪽이 안 깨진다. 근거 전문은 그 함수 주석 한 곳이다(검수관 반려 B2).
 *
 * 여럿이 함께 바뀌면 「조작」이다 — 「위치·회전」처럼 나열하면 폭 212px 패널에서 줄이
 * 넘치고, 무엇보다 되돌리기 목록은 **구별**이 목적이지 명세가 아니다.
 */
export function poseLabel(a: Pose5, b: Pose5): string {
  const moved = a.x !== b.x || a.y !== b.y || a.z !== b.z;
  const turned = a.ry !== b.ry;
  const scaled = a.s !== b.s;
  if (moved && !turned && !scaled) return '위치';
  if (turned && !moved && !scaled) return '회전';
  if (scaled && !moved && !turned) return '크기';
  return '조작';
}

/**
 * 파셀·목록이 **늘었나 줄었나**. 자세 다섯 값이 없는 대상의 라벨을 여기서 얻는다.
 *
 * 개수가 같으면 「조작」이다 — 그 안에서 무엇이 바뀌었는지는 이 단위로 알 수 없고
 * (파츠 배열 전체가 스냅샷이다), 알아내려고 항목별 대조를 넣으면 그 대조가 계약의
 * 필드 목록을 **미러링**하게 된다.
 */
export function countLabel(before: number, after: number): string {
  if (after > before) return '놓기';
  if (after < before) return '삭제';
  return '조작';
}

export interface EditHistory {
  /**
   * 지금 고른 것을 지켜본다. **`panel.refresh()` 마다 불려도 안전하다** — 대상이
   * 바뀌었을 때만 기준 스냅샷을 다시 뜬다.
   *
   * ⚠ **이 「바뀌었을 때만」 이 드래그를 살린다.** 드래그 중 `onPointerMove` 가
   * `panel.refresh()` 를 부르는데(`edit/input.ts`), 매번 기준을 다시 뜨면 되돌리기가
   * **마지막 한 프레임**으로만 간다. 대상 객체는 `select()` 마다 새로 만들어지므로
   * 「객체가 다르다」가 곧 「다른 것을 골랐다」이고, 그것이 유일한 갱신 계기다.
   */
  watch(t: EditTarget | null): void;
  /**
   * 여러 확정을 **한 항목으로 묶는다.** 수치칸이 유일한 소비자다 — 「12.5」를 치는
   * 동안 `input` 이벤트마다 확정이 나므로(`panel/inspector.ts`), 안 묶으면 되돌리기를
   * 네 번 눌러야 원래대로 온다.
   */
  hold(): void;
  /** 묶기를 끝내고 그 사이의 변화를 한 항목으로 쌓는다 */
  release(): void;
  /** `commit()` 을 안 타는 조작(놓기·삭제)을 직접 쌓는다. `null` 이면 안 쌓는다 */
  add(e: Undoable | null): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  depth(): number;
  redoDepth(): number;
  /** 전부 버린다 — 편집 세션이 끝날 때. 붙들고 있던 삭제 항목을 놓아 준다 */
  clear(): void;
  readonly ops: HistoryOps;
}

export function createEditHistory(
  host: OverlayHost, st: EditState, panel: Panel, arts?: ArtsPort, limit?: number,
): EditHistory {
  const stack: History = createHistory(limit);
  const ops = createHistoryOps(host, arts);
  let current: EditTarget | null = null;
  let base: Snap = null;
  let held = false;

  function snapOf(t: EditTarget | null): Snap {
    if (!t) return null;
    if (t.kind === 'overlay') return { kind: 'overlay', t, pose: poseOf(t) };
    if (t.kind === 'village') {
      const v = st.villageSel;
      // ⚠ 마을은 **어댑터가 아니라 파셀**을 뜬다 — 이유는 이 파일 헤더 한 곳이다.
      return v && host.village
        ? { kind: 'village', before: parcelSnap(host.village, v.px, v.pz) } : null;
    }
    return arts ? { kind: 'art', before: arts.list() } : null;
  }

  /** 기준과 지금의 차이를 한 항목으로 쌓고 기준을 갱신한다 */
  function flush(): void {
    const s = base;
    if (!s) return;
    if (s.kind === 'overlay') add(ops.pose(s.t, s.pose, poseLabel(s.pose, poseOf(s.t))));
    else if (s.kind === 'village') {
      const now = host.village ? parcelSnap(host.village, s.before.px, s.before.pz) : null;
      add(ops.parcel(s.before, countLabel(s.before.parts.length, now?.parts.length ?? 0)));
    } else add(ops.arts(s.before, countLabel(s.before.length, arts?.list().length ?? 0)));
    base = snapOf(current);
  }

  function add(e: Undoable | null): void {
    if (e) stack.push(e);
  }

  /** 되돌리기·다시하기가 공유하는 마무리 — 화면을 맞추고 무엇을 했는지 말한다 */
  function after(label: string | null, verb: string): void {
    if (label === null) { panel.say(`${verb} 것이 없습니다.`); return; }
    // 되돌리기는 **선택을 안 건드린다**(헤더). 다만 지워진 것을 고른 채 되돌렸을 수 있어
    // 화면은 맞춘다 — `refresh()` 가 «고른 것이 아직 있는가» 를 다시 읽는다.
    panel.refresh();
    // 되돌린 결과가 곧 새 기준이다. 안 갱신하면 다음 확정이 **되돌린 것까지 되감는다.**
    base = snapOf(current);
    panel.say(`${verb}: ${label} · 남은 되돌리기 ${stack.depth()}`);
  }

  return {
    watch(t) {
      if (t === current) return;
      current = t;
      held = false;
      base = snapOf(t);
      if (!t) return;
      // ⚠ **두 겹으로 감싸도 항목은 하나다** — 안쪽 래퍼의 `flush()` 가 기준을 갱신하므로
      // 바깥 래퍼가 볼 차이가 남지 않는다(뮤테이션 실측 2026-08-22: 두 겹 방지 플래그를
      // 넣어 봤지만 지워도 아무 검사가 안 깨졌다 — 도달 불가능한 방어였다). 그래서 안 둔다.
      // 이 성질은 `flush()` 의 기준 갱신에 달려 있고, 그것을 지우는 뮤테이션은 잡힌다.
      const orig = t.commit.bind(t);
      (t as unknown as { commit(): void }).commit = () => {
        orig();
        // 묶는 중이면 `release()` 가 한 번에 쌓는다.
        if (!held) flush();
      };
    },
    hold() { held = true; },
    release() {
      if (!held) return;
      held = false;
      flush();
    },
    add,
    undo() {
      // 되돌릴 수 **없는** 조작은 꺼내기 전에 말한다 — 꺼내고 나서 말하면 「되돌렸습니다」
      // 라고 적은 뒤 아무 일도 안 일어난다(`barrier` 주석 한 곳).
      const top = stack.peekUndo();
      const why = top ? barrierWhy(top) : null;
      if (top && why !== null) {
        panel.say(`「${top.label}」은(는) 되돌릴 수 없습니다 — ${why}.`, true);
        return;
      }
      after(stack.undo(), '되돌렸습니다');
    },
    redo() { after(stack.redo(), '다시 했습니다'); },
    canUndo: () => stack.canUndo(),
    canRedo: () => stack.canRedo(),
    depth: () => stack.depth(),
    redoDepth: () => stack.redoDepth(),
    clear() {
      stack.clear();
      base = null;
      current = null;
      held = false;
    },
    ops,
  };
}
