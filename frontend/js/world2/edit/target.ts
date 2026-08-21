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
import type { ArtsPort } from '../systems/art-port.js';
import { ART_W_MIN, ART_W_MAX, artName } from '../decide/artwork.js';

/**
 * 편집이 미는 다섯 값 + 확정. 오버레이 항목과 마을 파츠가 각각 어댑터로 이것을 만족한다.
 *
 * **가변 프로퍼티인 것이 의도**다 — 기즈모가 `target.x += d` 로 미는 코드를 그대로
 * 유지하려는 것이고, 그래서 이 개정이 «동작 변경 0» 으로 들어갈 수 있다.
 */
export interface EditTarget {
  readonly kind: 'overlay' | 'village' | 'art';
  x: number;
  y: number;
  z: number;
  ry: number;
  /** 균등 스케일. 마을 파츠에서는 **붙는 순간의 비율에 대한 배수**다 */
  s: number;
  /**
   * **지금 `apply()` 가 화면을 즉시 맞추는가** (감독 *"수치칸 타이핑이 거슬린다"* ·
   * 팀장 판정 (C), 2026-08-20). 수치칸이 **글자마다 확정할지 손을 뗄 때 확정할지**를
   * 이 값 하나가 정한다 — 미루려면 **화면이 이미 맞아야** 하고, 안 맞는데 미루면
   * 「화면과 수치가 다른 것을 말한다」가 된다(그것이 즉시 확정을 고른 원래 이유다).
   *
   * **`kind` 로 가르면 틀린다** — 마을도 3D 클릭이면 맞고 아웃라이너면 안 맞는다.
   * **같은 종류 안에서 갈리므로** 대상이 스스로 선언하고, `apply()` 의 조기 반환 조건과
   * **같은 식**이어야 한다(팀장 조건 1 — 갈리면 그 불일치가 필드를 통해 되살아난다).
   */
  readonly live: boolean;
  /** 드래그 중 매 프레임 불린다. 싼 것만 한다 */
  apply(): void;
  /** 조작이 끝났다. 비싼 확정(파셀 동결·재빌드)이 여기서 난다 */
  commit(): void;
  /** 지운다. 지웠으면 `true` */
  remove(): boolean;
  /** 이 자리의 바닥 높이(m) — 「바닥에」 버튼이 쓴다 */
  ground(): number;
  /**
   * 화면에 부를 **짧은 이름**(선택 사양, W8-11).
   *
   * 오버레이·마을은 이것을 안 낸다 — 이름을 만들 재료(`OverlayEntry`·`VillagePick`)가
   * 이미 `describe()` 의 인자로 따로 흐르기 때문이다. 액자는 그런 인자가 없어서(선택이
   * 인덱스 하나다) 어댑터가 직접 낸다. 셋을 `name` 하나로 통일하는 것은 더 큰 정리이고
   * 이번 범위 밖이다 — **그래서 `describe()` 는 `name` 을 먼저 보고, 없으면 옛 경로로 간다.**
   */
  readonly name?: string;
  /**
   * **실치수**로 크기를 미는 문 (W8-11). **선택 사양** — 지금은 액자만 낸다.
   *
   * ── 왜 `s`(배수) 로 충분하지 않은가 ─────────────────────────────────────────
   * 감독 지시는 *"그림과 액자 **크기**"* 였고 사람이 쓰는 단위는 «몇 미터짜리 그림» 이지
   * «원래의 1.5배» 가 아니다. 그리고 슬라이더에는 **범위**가 필요한데, `s` 의 범위는
   * 계약상 `S_MIN 0.01` ~ `S_MAX 100` 이라 손잡이 한 칸이 화면 밖으로 나간다.
   * 액자는 `ART_W_MIN`~`ART_W_MAX` 라는 **의미 있는 범위**를 이미 갖고 있다(그 수를
   * 여기 적지 않는다 — 이 파일 아래가 *"범위는 계약이 소유한다"* 라고 선언하는데 위에서
   * 수를 적으면 계약을 바꿔도 이 줄만 낡는다. 검수관 권고 P5).
   *
   * 오버레이·마을이 이것을 안 내는 것은 의도다 — GLB 는 원본 치수를 모르고(배수만
   * 뜻이 있다), 마을 파츠는 비균등이라 «폭 하나» 로 환원되지 않는다. 낼 것이 없는
   * 대상이 억지로 숫자를 내면 그 슬라이더가 거짓말을 한다.
   */
  readonly width?: {
    readonly min: number;
    readonly max: number;
    get(): number;
    set(v: number): void;
  };
}

/** 오버레이 항목 어댑터. 값은 항목이 직접 들고 있으므로 프록시만 한다 */
export function overlayTarget(host: OverlayHost, e: OverlayEntry): EditTarget {
  return {
    kind: 'overlay',
    // 항상 즉시 맞는다 — 항목이 값을 직접 들고 중간 단계가 없다.
    live: true,
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

  /**
   * **`live` 와 `apply()` 가 함께 쓰는 하나의 판정**(팀장 조건 1 — 갈리면 불일치가
   * 되살아난다). ⓐ 슬롯을 아는가(목록에서 고르면 모른다) ⓑ 소비자가 문을 열었는가
   * ⓒ 슬롯이 살아 있는가(스트리밍이 걷으면 `-1`).
   */
  const canApply = (): boolean =>
    !!v.slot && !!host.retargetSlot && v.slot.index >= 0;

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
    get live() { return canApply(); },
    /**
     * **그 파츠가 올라간 슬롯 하나만** 다시 쓴다. 동결(= 파셀 재빌드)은 여기서 안 한다 —
     * 프레임마다 부르면 건물이 사라졌다 자라기를 반복한다(이 파일 헤더).
     * 못 미는 경우(목록에서 골랐다·문이 없다·슬롯이 죽었다)는 `canApply()` 한 곳이 정한다.
     */
    apply() {
      if (!canApply()) {
        // 「문이 없다」(정상)와 「있었는데 죽었다」를 가른다 — 후자만 화면에 말한다.
        if (v.slot && host.retargetSlot && !told) { told = true; onDetach?.(); }
        return;
      }
      const slot = v.slot!;
      const w = world(p.x, p.z);
      host.retargetSlot!(slot, {
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
  // 액자는 어댑터가 이름을 낸다(위 `EditTarget.name`). 자세 형식은 위 `pose` 를 그대로
  // 쓴다 — 형태마다 다른 것은 이름뿐이라는 이 함수의 규약이 그것이다.
  if (t.name) return `작품: ${t.name} · ${pose}`;
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
  if (t.name) return t.name;
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


/**
 * 벽에 걸린 **작품** 어댑터 (W8-11). 감독 지시 *"그림과 액자 크기 위치를 조절"*.
 *
 * ── 왜 사본을 드는가 ────────────────────────────────────────────────────────
 * 목록은 `systems/art-port.ts` 가 소유하고 `list()` 는 **읽기 전용**을 낸다. 여기서
 * 원본을 고치면 「미리보기를 취소했는데 값이 남는다」가 되고, 무엇보다 `set()` 을
 * 안 거친 변경은 내보내기에 안 실린다 — 화면과 저장이 갈리는 그 형태다.
 *
 * ── `s` 는 `w` 에 대한 **배수**다 ───────────────────────────────────────────
 * 마을 파츠가 *"붙는 순간의 `sx·sy·sz` 를 기준으로 기억하고 `s` 는 그 기준에 대한
 * 배수"* 로 푼 것과 **같은 패턴**이다. 액자는 폭 하나뿐이라 더 단순하다.
 * 계약 범위(`ART_W_MIN`~`ART_W_MAX`)를 벗어난 입력은 **무시한다 — 자르지 않는다.**
 * (이 문장은 원래 *"여기서 **클램프**한다 — 범위 밖은 **무시**이고"* 라고 두 동작을
 * 함께 적고 있었다. 검수관 권고 P4 — 둘은 다른 동작이고, 그 차이가 «감독이 민 값과
 * 화면이 갈리는가» 를 정한다. 코드는 무시이고 그것이 다른 세터와 같은 규약이다.)
 *
 * ── `apply` / `commit` 이 갈리는 이유 ───────────────────────────────────────
 * `apply` 는 슬라이더를 미는 내내 프레임마다 불린다. 거기서 `port.set()` 을 부르면
 * `place()` 전체 대체가 돌아 **지오·재질이 프레임마다 죽고 태어난다** — 개수 불변식
 * `[7]` 이 보는 그 증상이고, 마을 파츠가 파셀 재빌드로 같은 사고를 낸 자리다.
 * 그래서 `apply` 는 씬의 자세만 밀고(`port.retarget`), `commit` 만 목록을 확정한다.
 *
 * ⚠ **벽에서 떨어질 수 있다.** `wallPose()` 가 걸 때 벽면 + `WALL_GAP` 을 냈는데,
 * 그 뒤 `x·z` 를 자유롭게 밀면 벽을 파고들거나 공중에 뜬다. **막지 않는다** — 자동
 * 재부착은 벽을 다시 찾는 일(레이캐스트)이고 이번 범위 밖이다. 감독이 보면서 맞춘다.
 *
 * @param index `port.list()` 순서. 씬의 액자 순서와 같다(`place` 가 순서대로 담는다)
 */
export function artTarget(
  port: ArtsPort,
  index: number,
  /**
   * **고른 작품이 목록에서 사라졌다** — 다른 경로가 지웠다는 뜻이다. 한 번만 부른다.
   *
   * 마을 어댑터의 `onDetach` 와 **같은 이유**다 — 어댑터는 화면을 모르고 소비자는
   * 여럿이다. **판정은 여기 한 곳, 문구는 화면 한 곳.** 배선은 `edit/mode.ts` 의
   * `pickArt` 가 하고(마을은 `edit/state.ts` 가 한다 — 어댑터를 만드는 자리가 서로
   * 다르기 때문이고, 그 이유는 `select()` 주석 한 곳에 있다), 문구는
   * `panel/dom.ts` 의 `refresh` 가 `st.artLost` 를 보고 만든다.
   *
   * 🔴 **선택 인자가 아니다 — 그것이 이 판본의 처방이다**(검수관 3차 블로커 B-A).
   * 직전 판본은 `onLost?:` 였고 제품 호출부(`mode.ts`)가 **안 넘겼다.** 그런데도
   * 어댑터 검사는 초록이었다 — 검사가 콜백을 직접 넘기며 부르기 때문이다. 그래서
   * 「부품은 동작하는데 조립이 그 부품을 안 물린」 상태가 조용히 성립했고, 화면은
   * *"없는 작품의 크기가 ×3.75 로 커졌다"* 고 **거짓을 말했다**(검수관 실측).
   *
   * ⚠ 그 형태를 **검사로 막으려 하지 않았다.** 검사는 하네스가 제품과 다르게 부르면
   * 그대로 통과하고, 이번이 정확히 그 사례다. **필수 인자로 만들면 `tsc` 가 막는다**
   * — 미배선이 컴파일 단계에서 빨간불이 되므로 빠뜨릴 자리가 없다. 검사보다 강한
   * 축이 있으면 그것을 쓴다(게이트를 `npm run gate` 하나로 만든 것과 같은 처방).
   *
   * ⚠ 이것이 없으면 조작이 **조용히** 아무 일도 안 한다 — 팀장이 못 박은 *"조용히
   * no-op 만 남기면 «가끔 안 움직인다» 가 된다"* 가 그 형태이고, 검수관 반려 B-1 이
   * 정확히 그 자리에서 났다.
   */
  onLost: () => void,
): EditTarget | null {
  const items0 = port.list();
  if (index < 0 || index >= items0.length) return null;
  /**
   * 🔴 **목록에서 「그때 그 작품」을 짚는 앵커. 확정할 때마다 갱신한다.**
   *
   * ── 검수관 반려 B-1 (2026-08-19) — 처방이 자기 자신을 무효화했다 ──────────
   * 직전 판본은 이것이 `const` 였고 `commit()` 이 `next[at] = { ...cur }` 로 **그 객체를
   * 목록에서 밀어냈다.** 확정 뒤 선택을 다시 만드는 코드가 없으므로 **2차 확정부터
   * `indexOf(anchor)` 가 영구히 −1** 이었고 그대로 조용히 반환했다.
   *
   * 검수관 실측(실제 패널 DOM 경유): 슬라이더 6 → 9 가 **6 에 멈춤** · 회전 버튼 2차
   * 무시 · 수치칸 `12.5` 를 쳤는데 목록엔 `1` · 크기를 바꾼 뒤 삭제하면 *"지울 수 없습니다."*
   *
   * ⚠⚠ **원래 결함보다 나빴다.** B1 은 「걸어 둔 작품이 사라진다」로 **눈에 보였고**,
   * 이것은 `apply()` 가 계속 도는 탓에 **화면은 맞고 목록(=내보내기 JSON)만 옛 값**이다.
   * 교훈: 처방을 검사로 못 박을 때 **「고친 형태」만 재면 「처방이 만든 형태」를 못 잡는다**
   * — 신설 회귀 4건이 전부 «확정을 **한 번** 한다» 였다. **상태를 바꾸는 함수를 고쳤으면
   * 그 함수를 두 번 부르는 검사를 넣는다.**
   */
  let anchor = items0[index];
  /** 씬의 액자 순서. `commit` 이 목록 자리와 **함께** 갱신한다 — 앵커가 둘이면 어긋난다 */
  let slot = index;
  /**
   * 크기 배수(`s`)의 **기준**. 앵커와 달리 어댑터 생애 동안 **안 바뀐다.**
   *
   * ⚠ 재앵커할 때 이것까지 갱신하면 확정할 때마다 `s` 가 1 로 리셋된다 — 「원래 크기의
   * 몇 배인가」가 「직전 확정의 몇 배인가」로 바뀌어, ×2 로 맞추고 손을 뗄 때마다 표시가
   * ×1 로 튄다. **앵커(어느 항목인가)와 기준(무엇에 대한 배수인가)은 다른 물음이다.**
   */
  const baseW = anchor.w;
  const label = artName(anchor.src);
  // 사본 — 원본은 `commit` 이 `set()` 으로만 바꾼다.
  const cur = { ...anchor };

  /**
   * 🔴 **확정할 때 목록을 다시 읽는다** (검수관 반려 B1, 2026-08-19).
   *
   * 첫 판본은 어댑터를 만들 때 잡은 `items0` **스냅샷**을 `commit()`/`remove()` 가
   * 그대로 되썼다. 그 사이 목록이 늘면 **늘어난 것이 통째로 사라진다** — 검수관 재현:
   *
   *   A 를 고른다 → 사진 B 를 건다 → A 의 크기를 바꾸고 손을 뗀다 → **B 가 없다**
   *   (A 를 지우면 목록이 통째로 빈다)
   *
   * 도달 경로가 셋이고 **전부 선택을 안 푼다**: 이미지 드롭 · 조준 걸기 · 기즈모 드래그
   * 종료. 「고른 채로 한 장 더 건다」는 전시를 꾸미는 기본 동작이고, 미리보기는 `blob:`
   * 이라 사라지면 파일을 다시 떨어뜨려야 한다 — **되돌릴 수단이 없는 손실**이었다.
   *
   * 원인은 산술이 아니라 **셈**이었다. `edit/state.ts` 가 *"목록을 바꾸는 경로는 둘"*
   * (`commit`·`remove`)이라고 적었는데 **셋**이다 — 「새로 걸기」가 빠졌다. 그 문장이
   * 이 어댑터의 전제였다.
   *
   * ── 왜 인덱스가 아니라 **항목 동일성**으로 찾는가 ─────────────────────────
   * 목록을 다시 읽는 것만으로는 **앞 항목이 지워진 경우**를 못 막는다(인덱스가 밀린다).
   * `port.list()` 는 항목 **객체 참조**를 유지하므로(`set` 이 배열만 갈아 끼운다)
   * `indexOf` 가 「그때 그 작품」을 정확히 짚는다.
   *
   * 못 찾으면 **아무것도 안 한다** — 이미 지워진 작품을 되살리지 않는다. 지금 그 경로는
   * 없지만(지우면 `actions.ts` 가 선택을 푼다), 조용히 되살아나는 것보다 안 하는 쪽이
   * 옳고 그 판정을 여기 한 곳에 둔다.
   */
  /** 이미 알렸는가 — `onLost` 는 한 번만 부른다(매 조작마다 같은 말을 하지 않는다) */
  let lost = false;

  /**
   * 지금 목록에서 앵커가 **몇 번째인가**. 없으면 `-1` 이고 소비자에게 **알린다**.
   *
   * 인덱스가 아니라 **항목 동일성**으로 찾는 이유: 앞 항목이 지워지면 인덱스가 밀린다.
   * `port.list()` 는 항목 객체 참조를 유지하므로(`set` 이 배열만 갈아 끼운다) `indexOf`
   * 가 「그때 그 작품」을 정확히 짚는다.
   *
   * ⚠ **그 전제를 지키는 것이 계약 주석뿐이다**(검수관 권고). 되돌리기·문서 재로드가
   * 생겨 `normalizeArts` 를 한 번 더 태우면 참조가 갈리고, 증상은 예외가 아니라
   * **「아무 일도 안 일어남」**이다 — 그래서 `onLost` 로 화면이 말하게 했다.
   */
  function findAt(): number {
    const i = port.list().indexOf(anchor);
    if (i < 0 && !lost) { lost = true; onLost(); }
    return i;
  }

  return {
    kind: 'art',
    // 항상 즉시 맞는다(`apply()` 가 `retarget`). 2026-08-19 에 액자만 `blur` 확정으로
    // 옮긴 근거이고(검수관 조건 ③), 이제 `kind` 분기가 아니라 이 필드가 그것을 말한다.
    live: true,
    get x() { return cur.x; }, set x(v) { cur.x = v; },
    get y() { return cur.y; }, set y(v) { cur.y = v; },
    get z() { return cur.z; }, set z(v) { cur.z = v; },
    get ry() { return cur.ry; }, set ry(v) { cur.ry = v; },
    get s() { return baseW > 0 ? cur.w / baseW : 1; },
    set s(m) {
      if (!(m > 0) || !Number.isFinite(m)) return;
      const w = baseW * m;
      if (w < ART_W_MIN || w > ART_W_MAX) return;   // 범위 밖은 무시(다른 세터와 같은 규약)
      cur.w = w;
    },
    // ⚠ `apply` 는 **씬 슬롯**(`slot`)을 쓴다. 씬의 액자 순서는 마지막 `place()` 가
    // 정하므로 목록 순서와 갈리는 창이 있고(`set()` 과 `place()` 완료 사이), 그 창에서
    // `findAt()` 을 쓰면 「목록은 새 순서인데 씬은 옛 순서」인 한 프레임을 잘못 민다.
    // `slot` 은 `commit` 이 목록 자리와 **함께** 갱신하므로 두 앵커가 안 어긋난다.
    //
    // ⚠⚠ **`apply` 로 민 값은 확정 전까지 씬에만 있다 — 목록에는 없다**(검수관 3차
    // 권고 P-1). 그래서 그 사이에 **다른 경로가 `port.set()` 을 부르면** `place()` 가
    // 목록 기준으로 씬을 다시 세우고 **화면에서도 옛 값으로 돌아간다**:
    //
    //   a 를 6m 로 밀고(확정 없이) → b 를 확정  ⇒  a 는 2.4m 로 되돌아간다
    //
    // 이것은 결함이 아니라 `apply`/`commit` 을 가른 대가다(가른 이유는 위 문단).
    // 다만 **「확정 전에도 화면은 맞다」를 무조건으로 읽으면 안 된다** — 확정까지의
    // 창 안에서만 참이고, 그 창을 짧게 유지하는 책임은 호출부(`panel/inspector.ts`)에
    // 있다. 근거·실측·안 잰 경로는 그 파일의 `change` 규약 주석 한 곳이다.
    //
    // 🔴 **그리고 `apply` 는 `findAt()` 을 안 부른다 — 「사라짐」을 모른다**(검수관 재확인
    // R1). 미는 동안 `onLost` 가 안 울리고, 앵커가 이미 목록에 없으면 **`slot` 자리의
    // 다른 액자를 민다**(실측: `retarget` 이 `[[0, 7]]` 인데 slot 0 은 이미 다른 작품).
    // 확정해야 비로소 말한다 — 한 박자 늦다.
    //
    // **지금 고치지 않는다**: 그 상황에 이르는 경로가 0 이다(`port.set` 호출부 셋이 전부
    // 항목 참조를 보존한다 — `commit`·`remove`·새로 걸기). 매 프레임 `indexOf` 를 도는
    // 비용을, 도달할 수 없는 상태를 위해 내지 않는다. 재론 조건과 실측은
    // `docs/BACKLOG.md` 의 `G-EDIT4` 한 곳이다 — **넷째 `set()` 경로가 생기면 그때다.**
    apply() { port.retarget(slot, cur); },
    commit() {
      const at = findAt();
      if (at < 0) return;
      const next = port.list().slice();
      // 🔴 **새 객체로 재앵커한다.** 이 세 줄이 없으면 2차 확정부터 조용히 죽는다 —
      // 근거·실측은 위 `anchor` 주석 한 곳이다. `slot` 도 함께 옮겨야 `apply` 와
      // 앵커가 안 갈린다(검수관 권고 P6 — 「짝 불일치」의 실체가 이것이었다).
      const fresh = { ...cur };
      next[at] = fresh;
      anchor = fresh;
      slot = at;
      void port.set(next);
    },
    remove() {
      const at = findAt();
      if (at < 0) return false;
      const next = port.list().slice();
      next.splice(at, 1);
      void port.set(next);
      return true;
    },
    // 액자는 **벽에** 걸린다 — 「바닥에」 는 의미가 없다. 지금 높이를 그대로 낸다.
    //
    // ⚠ 여기 원래 *"버튼이 눌려도 아무 일이 안 일어나는 것이 옳다"* 라고 적혀 있었고,
    // 그것은 팀장이 못 박은 규약과 정면으로 어긋난다(검수관 권고 P2) — *"조용히 no-op
    // 만 남기면 «가끔 안 움직인다» 가 된다"*. **값은 그대로 두되 화면이 말하게 한다**:
    // 「바닥에」 버튼은 액자를 고른 동안 숨는다(`panel/dom.ts` 의 `refresh`).
    ground() { return cur.y; },
    name: label,
    width: {
      // 범위는 계약이 소유한다 — 여기서 수를 다시 적지 않는다.
      min: ART_W_MIN,
      max: ART_W_MAX,
      get() { return cur.w; },
      // `s` 세터와 **같은 규약**이다: 범위 밖은 무시. 조용히 잘라 넣으면 감독이 민 자리와
      // 화면이 갈린다. 두 세터가 같은 값을 만지므로 규약이 어긋나면 «슬라이더로는 되는데
      // 숫자칸으로는 안 된다» 가 난다.
      set(v) {
        if (!Number.isFinite(v) || v < ART_W_MIN || v > ART_W_MAX) return;
        cur.w = v;
      },
    },
  };
}
