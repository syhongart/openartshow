// world2/edit/target.ts — **지금 조작하는 것 하나.** 오버레이 항목과 마을 파츠를 같은 문으로.
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────────────
// 기즈모·수치칸·조작 버튼은 전부 `x·y·z·ry·s` 다섯 값을 민다. 그런데 그 다섯이 사는
// 곳이 둘이 됐다 — 오버레이 항목(`OverlayEntry`)과 마을 파츠(`PlacedPart`).
// 소비자마다 «둘 중 어느 쪽인가» 를 분기하면 그 분기가 **여섯 파일**로 번지고, 한 곳만
// 빠뜨리면 «마을은 회전은 되는데 크기는 안 된다» 같은 형태가 된다.
//
// ── 두 형태의 진짜 차이는 스케일이다 ────────────────────────────────────────
// 오버레이는 **균등**(`s` 하나), 마을 파츠는 **비균등**(`sx·sy·sz`)이다. 마을이 비균등인
// 것은 우연이 아니라 생성기가 그렇게 만든다 — `building.ts` 가 폭·깊이·높이를 각각 뽑는다.
//
// 그래서 마을 어댑터는 «원래 비율을 유지한 채 배수를 민다»: 붙는 순간의 `sx·sy·sz` 를
// 기준으로 기억하고, `s` 는 그 기준에 대한 **배수**다. 비율을 안 지키면 감독이 크기를
// 한 번 만지는 것만으로 건물이 정육면체가 된다.
//
// ── `apply` 와 `commit` 을 가른 이유 (이 파일에서 가장 중요한 판단) ──────────
// 마을 파츠를 옮기려면 그 파셀을 동결해야 하고, 동결은 **그 파셀을 통째로 다시 만든다**
// (`systems/village-parcels.ts` 의 알림 → `streaming.invalidate`). 드래그하는 내내
// 그것을 부르면 건물이 프레임마다 사라졌다 다시 자란다 — 폐지한 실시간 그림자의 명멸과
// 같은 증상이다.
//
//   `apply()`   드래그 중 매 프레임. **싼 것만** — 오버레이는 씬 반영, 마을은 아무것도 안 함
//   `commit()`  손을 뗐을 때 한 번. 마을은 여기서 동결한다
//
// ⚠ **그날이 왔다 (W5 E2.5, 팀장 판정 2026-08-13).** 이 자리에 원래 *"드래그 중에 마을
// 건물은 따라오지 않는다 … 감독이 «따라오게 해줘» 라고 하면 그때는 슬롯 자세만 갱신하는
// 문(`SlotPool.retarget`)을 편집에 여는 쪽으로 간다"* 라고 적혀 있었고, 감독 지시
// *"gpu지원으로 쾌적하게 움직이게 하자"* 로 그 탈출로를 실제로 탔다.
//
// 그래서 지금 `apply()` 는 **그 파츠가 올라간 슬롯 하나의 행렬만** 다시 쓴다. 파셀
// 재빌드 0, 인스턴스 행렬 1개 = GPU 가 하던 일 그대로다. 열린 문은 좁다 —
// 핸들+자세를 받는 함수 하나이고(`OverlayHost.retargetSlot`), `acquire`·`release` 는
// 안 열렸다. **슬롯 개수는 구조적으로 안 변한다**(`parcel-assets.ts` 의 `retarget` 이
// `p.used` 를 안 건드린다 — 실측). `commit()` 이 확정 때 한 번 동결하는 것은 그대로다.
//
// ⚠⚠ 남은 대가 둘을 정직하게 적는다:
//   ① **아웃라이너 목록에서 고른 것은 안 따라온다** — 슬롯을 모른다(`VillagePick.slot`).
//   ② **그림자는 확정할 때 맞춰진다** — 캐스터 슬롯만 밀고 데칼 슬롯은 안 민다. 짝을
//      맞추려 들면 «그림자를 저장하지 않고 유도한다»(W4 B1 처방)가 무너진다.

import { scaleBy } from '../decide/edit-pick.js';
import type { PlacedPart } from '../parts/types.js';
import type { OverlayEntry, OverlayHost, VillagePick } from './types.js';

/**
 * 편집이 미는 다섯 값 + 확정. 오버레이 항목과 마을 파츠가 각각 어댑터로 이것을 만족한다.
 *
 * **가변 프로퍼티인 것이 의도**다 — 기즈모가 `target.x += d` 로 미는 코드를 그대로
 * 유지하려는 것이고, 그래서 이 개정이 «동작 변경 0» 으로 들어갈 수 있다.
 */
export interface EditTarget {
  readonly kind: 'overlay' | 'village';
  x: number;
  y: number;
  z: number;
  ry: number;
  /** 균등 스케일. 마을 파츠에서는 **붙는 순간의 비율에 대한 배수**다 */
  s: number;
  /** 드래그 중 매 프레임 불린다. 싼 것만 한다 */
  apply(): void;
  /** 조작이 끝났다. 비싼 확정(파셀 동결·재빌드)이 여기서 난다 */
  commit(): void;
  /** 지운다. 지웠으면 `true` */
  remove(): boolean;
  /** 이 자리의 바닥 높이(m) — 「바닥에」 버튼이 쓴다 */
  ground(): number;
}

/** 오버레이 항목 어댑터. 값은 항목이 직접 들고 있으므로 프록시만 한다 */
export function overlayTarget(host: OverlayHost, e: OverlayEntry): EditTarget {
  return {
    kind: 'overlay',
    get x() { return e.x; }, set x(v) { e.x = v; },
    get y() { return e.y; }, set y(v) { e.y = v; },
    get z() { return e.z; }, set z(v) { e.z = v; },
    get ry() { return e.ry; }, set ry(v) { e.ry = v; },
    get s() { return e.s; }, set s(v) { e.s = v; },
    apply() { host.apply(e); },
    // 오버레이는 `apply` 가 곧 확정이다 — 씬에 이미 반영됐고 더 할 일이 없다.
    commit() { },
    remove() { host.remove(e); return true; },
    ground() { return host.surfaceAt(e.x, e.z); },
  };
}

/**
 * 마을 파츠 어댑터. 없으면 `null`(문이 닫혔거나 인덱스가 배열 밖).
 *
 * ⚠ **배치 배열의 사본을 들고 있는다.** 붙는 순간 `partsAt` 으로 뜬 것이고, 그 뒤로
 * 저장소를 다시 안 읽는다. 그래서 조작 중에 밀도 노브가 바뀌면 이 어댑터가 낡은다 —
 * 지금 그런 경로는 없지만(슬라이더는 파셀 재생성을 요구한다) 이 전제가 깨지면
 * «옮겼더니 엉뚱한 것이 움직인다» 가 된다.
 */
export function villageTarget(
  host: OverlayHost,
  v: VillagePick,
  /**
   * **조작 중 슬롯이 죽었다** — 스트리밍이 그 파셀을 걷어갔다는 뜻이다. 한 번만 부른다.
   *
   * 왜 콜백인가: 어댑터는 화면을 모르고(문구를 여기 적으면 편집 UI 가 이 계층으로
   * 샌다), 소비자는 다섯이다(기즈모·수치칸·버튼·키·모달). 다섯 곳에서 각자 판정하면
   * 그 문장이 다섯 벌이 된다. **판정은 여기 한 곳, 문구는 화면 한 곳**으로 가른다.
   *
   * ⚠ 이것이 없으면 조작이 **조용히** 아무 일도 안 한다 — 팀장이 조건으로 못 박은
   * *"조용히 no-op 만 남기면 «가끔 안 움직인다» 가 된다"* 가 정확히 그 형태다.
   */
  onDetach?: () => void,
): EditTarget | null {
  const village = host.village;
  if (!village) return null;
  const parts = village.partsAt(v.px, v.pz);
  if (v.index < 0 || v.index >= parts.length) return null;
  const p = parts[v.index];
  // 종류까지 확인한다 — 인덱스만 맞고 종류가 다르면 **다른 것을 집은 것**이다
  // (밀도 노브가 바뀐 뒤 옛 선택으로 조작하는 경로가 정확히 그 형태다).
  if (p.kind !== v.kind) return null;

  // 붙는 순간의 비율. `s` 는 이것에 대한 배수다.
  const base = { sx: p.sx, sy: p.sy, sz: p.sz };
  let mul = 1;

  const world = (lx: number, lz: number) => ({
    x: v.px * host.cellX + lx,
    z: v.pz * host.cellZ + lz,
  });

  /** 슬롯이 죽은 것을 **한 번만** 알린다 — 매 프레임 같은 말을 하면 화면이 도배된다 */
  let told = false;

  return {
    kind: 'village',
    // 파츠는 **파셀 로컬 좌표**를 들고 화면은 월드 좌표를 쓴다. 변환은 여기 한 곳이다 —
    // 두 곳이 되면 한쪽만 고쳐도 «수치칸과 기즈모가 다른 자리를 말한다» 가 된다.
    get x() { return world(p.x, p.z).x; }, set x(vx) { p.x = vx - v.px * host.cellX; },
    get y() { return p.y; }, set y(vy) { p.y = vy; },
    get z() { return world(p.x, p.z).z; }, set z(vz) { p.z = vz - v.pz * host.cellZ; },
    get ry() { return p.ry; }, set ry(r) { p.ry = r; },
    get s() { return mul; },
    set s(m) {
      if (!(m > 0) || !Number.isFinite(m)) return;
      mul = m;
      p.sx = base.sx * m;
      p.sy = base.sy * m;
      p.sz = base.sz * m;
    },
    /**
     * **그 파츠가 올라간 슬롯 하나만** 다시 쓴다. 동결(= 파셀 재빌드)은 여기서 안 한다 —
     * 프레임마다 부르면 건물이 사라졌다 자라기를 반복한다(이 파일 헤더).
     *
     * ⚠ 슬롯을 모르거나(목록에서 골랐다) 문이 안 열린 소비자면 **W4 동작 그대로**
     * 아무 일도 안 한다. 그 둘은 정상 상태라 알리지 않는다 — 알릴 것은 «있었는데
     * 죽었다» 하나뿐이고, 그것이 아래 `told` 분기다.
     */
    apply() {
      const slot = v.slot;
      if (!slot || !host.retargetSlot) return;
      if (slot.index < 0) {
        if (!told) { told = true; onDetach?.(); }
        return;
      }
      const w = world(p.x, p.z);
      host.retargetSlot(slot, {
        x: w.x, y: p.y, z: w.z, ry: p.ry, sx: p.sx, sy: p.sy, sz: p.sz,
      });
    },
    commit() { village.freeze(v.px, v.pz, parts); },
    remove() {
      parts.splice(v.index, 1);
      village.freeze(v.px, v.pz, parts);
      return true;
    },
    ground() { return host.surfaceAt(world(p.x, p.z).x, world(p.x, p.z).z); },
  };
}

/**
 * 이 파츠를 **되돌린다** — 그 파셀의 동결을 풀어 계산 배치로 돌아간다.
 *
 * 파셀 단위인 것이 계약이다(`decide/overlay.ts`: *"경계는 파셀 단위이고 전역이 아니다"*).
 * 파츠 하나만 되돌릴 방법은 없다 — 동결은 배열 전체이고, 계산 배치의 «그 하나» 를
 * 가리킬 이름이 애초에 없다(그것이 동결을 파셀 단위로 만든 이유다).
 */
export function thawParcel(host: OverlayHost, v: VillagePick): boolean {
  if (!host.village) return false;
  host.village.thaw(v.px, v.pz);
  return true;
}

/** `s` 를 배수로 민다. 상·하한은 계약(`S_MIN`·`S_MAX`)이 소유한다 */
export function nudgeScale(t: EditTarget, factor: number): void {
  t.s = scaleBy(t.s, factor);
}

/** 화면에 뭐라고 적을 것인가. 형태마다 다른 것은 이름뿐이다 */
export function describe(t: EditTarget, e: OverlayEntry | null, v: VillagePick | null): string {
  const pose = `${t.x.toFixed(1)}, ${t.y.toFixed(2)}, ${t.z.toFixed(1)}`
    + ` · ${((t.ry * 180) / Math.PI).toFixed(0)}° · ×${t.s.toFixed(2)}`;
  if (t.kind === 'overlay' && e) {
    return `선택: ${e.src.replace(/^assets\/models\//, '')}${e.preview ? ' (미리보기)' : ''} · ${pose}`;
  }
  if (v) return `마을: ${v.kind} · 파셀 (${v.px}, ${v.pz}) #${v.index} · ${pose}`;
  return '선택: 없음';
}

/**
 * 화면 배지에 쓸 **짧은 이름**. 좌표·회전·크기는 안 넣는다.
 *
 * ── 왜 `describe()` 와 따로 두나 ────────────────────────────────────────────
 * 저쪽은 패널 한 줄용이라 자세를 전부 적는다(그것이 수치칸 옆이라 맞다). 배지는
 * **화면 한가운데 큰 글씨**라 길면 시선을 가린다 — 감독이 원한 것은 «내가 뭘 선택했는지»
 * 이지 «그것이 몇 미터에 있는지» 가 아니다(그건 수치칸이 이미 말한다).
 *
 * ⚠ **이름 규칙은 `describe()` 와 같아야 한다** — 「마을: building」 과 「building #1」 이
 * 서로 다른 것을 가리키는 것처럼 보이면 안 된다. 그래서 접두(`마을:`·파일명 정리)를
 * 여기서 새로 정하지 않고 저쪽과 같은 형태를 쓴다.
 */
export function describeShort(
  t: EditTarget, e: OverlayEntry | null, v: VillagePick | null,
): string | null {
  if (t.kind === 'overlay' && e) {
    return e.src.replace(/^assets\/models\//, '') + (e.preview ? ' (미리보기)' : '');
  }
  // ⚠ **「손본 구역」을 여기서 안 붙인다.** `v.frozen` 은 **고른 순간의 스냅샷**이라
  // 조작해서 동결시켜도 안 바뀐다 — 화면이 «방금 손봤는데 손본 구역이 아니라고 한다» 가
  // 된다. 부르는 쪽이 저장소에 **현재 값**을 물어 붙인다(`dom.ts`·`badge.ts` 가 같은
  // 형태로 한다). 실측으로 드러난 결함이고 패널 한 줄도 같은 형태였다.
  if (v) return `${v.kind} #${v.index} · 구역 (${v.px}, ${v.pz})`;
  // 어댑터는 있는데 둘 다 없는 경우 — 지금 그런 경로는 없지만 `null` 을 내면
  // 배지가 **숨는다**. 「선택: 없음」 같은 문구를 크게 띄우는 것보다 낫다.
  return null;
}

/**
 * `PlacedPart` 를 만드는 자리 하나 — 복제가 쓴다.
 *
 * 필드를 손으로 나열하지 않고 **펼친다.** 계약(`normalizePart`)이 9필드를 소유하고,
 * 여기서 목록을 다시 적으면 파츠에 필드가 늘 때 조용히 하나가 빠진다.
 */
export function copyPart(p: PlacedPart): PlacedPart {
  return { ...p };
}
