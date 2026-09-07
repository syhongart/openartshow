// world-glb/edit/target.ts — **지금 조작하는 것 하나.** 오버레이 항목과 마을 파츠를 같은 문으로.
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
import { tonesFor } from '../parts/index.js';
import type { OverlayEntry, OverlayHost, VillagePick } from './types.js';

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
  /**
   * **축별 배수**를 미는 문 (감독 카드 판정 2026-08-22 「축별로 늘리기 — 세 방향」).
   *
   * ⚠ **`s` 와 곱해진다.** `s` 는 균등 배율로 그대로 남고 이것은 축마다 더 곱하는 값이라,
   * 「전체를 키운다」와 「한 축만 늘린다」가 서로를 망가뜨리지 않는다. `s` 를 세 값으로
   * 확대하는 안은 팀장이 영구 기각했고(`villageTarget` 주석), 이번 형태는 그것과 **다른
   * 안**이다.
   *
   * ⚠⚠ **두 어댑터가 같은 이름을 다른 재료로 만든다.** 오버레이는 계약이 옵션 필드
   * (`OverlayItem.sx?`)를 갖고 있어 그대로 읽고 쓰지만, 마을 파츠의 `sx` 는 **본래
   * 치수**라(생성기가 폭·깊이·높이를 각각 뽑는다) 붙는 순간의 값에 대한 **배수**로
   * 환산한다. 그 환산이 이 문의 존재 이유다 — 소비자(기즈모)는 배수만 안다.
   *
   * **선택 사양인 것도 의도다.** 액자는 안 낸다 — 실치수(`width`)로 미는 대상이라
   * 축별 배수가 그 위에 겹치면 두 손잡이가 같은 것을 다르게 말한다.
   */
  readonly axes?: {
    get(a: 'x' | 'y' | 'z'): number;
    set(a: 'x' | 'y' | 'z', v: number): void;
  };
  readonly width?: {
    readonly min: number;
    readonly max: number;
    get(): number;
    set(v: number): void;
  };
  /**
   * **색을 고르는 문** (`G-EDIT7`). **선택 사양** — 지금은 마을 파츠만 낸다.
   *
   * ── 왜 자유 색이 아니라 「몇 번째」인가 ─────────────────────────────────────
   * 계약이 그렇게 정해 뒀다. `PlacedPart.tone` 은 **팔레트 인덱스**이고 색이 아니며
   * (`decide/overlay.ts` 의 `normalizePart`), 그 이유가 그 자리에 적혀 있다 —
   * `tones` 는 색이 아니라 **곱셈기**라서, 텍스처가 있는 파츠에 임의 색을 곱하면 이
   * 저장소가 이미 겪은 *"길이 안 보였다"* 가 재현된다(도로 알베도 선형 0.0003 대).
   * 그래서 편집도 **파츠가 미리 준비한 색 중에서만** 고르게 한다.
   *
   * ── 왜 `apply()` 가 아니라 확정으로 미는가 ─────────────────────────────────
   * 색은 **이산값**이다. 드래그처럼 매 프레임 흐르지 않고 견본을 한 번 누르면 끝이라,
   * `x·y·z` 가 푼 문제(«확정을 프레임마다 부르면 파셀이 명멸한다»)가 여기서는 애초에
   * 안 생긴다. 그래서 **슬롯 색을 직접 미는 문을 안 열었다** — 확정 한 번이 파셀을
   * 즉시 다시 만들고(`pendingInstant`, 2026-08-20) 그 재빌드가 새 색으로 칠한다.
   * 문을 하나 아낀 것이고, 이 저장소의 *"쓸 소비자가 없는 문을 미리 내지 않는다"*
   * (`decide/modal-edit.ts`)를 그대로 따른 것이다.
   *
   * ⚠ **그 「즉시」에는 한계가 있다 — 안개가 켜져 있으면 페이드로 나타난다**(검수관 조건 1,
   * 2026-08-21). `systems/parcel-assets.ts` 의 `setTone` 은 **`instant` 여부를 안 본다** —
   * 바로 위 `setTransform` 이 `if (!instant) grow?.place(…)` 로 성장 연출을 끄는 것과
   * 다르다. 그래서 색 sink(`systems/parcel-fade.ts`)가 붙어 있고 그 자리 안개가 0이
   * 아니면, 확정이 **편집한 파츠뿐 아니라 그 파셀에서 함께 다시 지어지는 다른 부품까지**
   * 색 페이드를 재시작시킬 수 있다.
   * **이번 변경이 만든 것이 아니다** — 두 파일 모두 이 diff 밖이고, 새 문이 기존 경로를
   * 처음 태운 것이다. 08-20 에 팀장이 `pendingInstant` 로 잡은 「되감기 튐」과 같은
   * 계열인데 그때 처방은 성장(`grow`)만 껐고 색은 안 껐다.
   * **못 쟀다** — 화면 판정이고 헤드리스로는 안 보인다. 백로그 `G-EDIT13`, 재론 트리거는
   * **감독이 실기기에서 「색을 바꾸면 주변이 같이 흐려졌다 돌아온다」고 말하는 것**이다.
   *
   * ⚠ **그래서 `live` 와 무관하다.** `live` 는 «`apply()` 가 화면을 맞추는가» 인데
   * 색은 `apply()` 를 안 탄다 — 3D 로 골랐든 목록에서 골랐든 **똑같이** 확정으로
   * 반영된다. 소비자가 `live` 를 보고 갈라선 안 된다.
   *
   * 오버레이·액자가 이것을 안 내는 것은 의도다 — GLB 는 팔레트라는 것이 없고, 액자
   * 색은 곧 그림 자체다. 낼 것이 없는 대상이 억지로 견본을 내면 그 UI 가 거짓말을 한다
   * (`width?` 가 같은 근거로 액자만 내는 것과 짝이다).
   */
  readonly tone?: {
    /** 고를 수 있는 색 개수. **2 이상일 때만 이 문을 낸다** — 하나면 고를 것이 없다 */
    readonly count: number;
    /** `i` 번째 색(hex). 화면에 견본을 칠하는 데 쓴다 — 「3번」을 보여주면 못 고른다 */
    swatch(i: number): number;
    get(): number;
    set(i: number): void;
  };
}

/** 오버레이 항목 어댑터. 값은 항목이 직접 들고 있으므로 프록시만 한다 */
/** 축 이름 → 계약 필드명. 세 곳이 같은 짝을 쓰므로 한 곳에 둔다 */
const AXIS_KEY = { x: 'sx', y: 'sy', z: 'sz' } as const;

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
    // 계약이 옵션 필드를 갖고 있어(`OverlayItem.sx?`) 그대로 읽고 쓴다.
    // **없으면 `1`** — 「생략 = 기존 동작」이 그 계약의 확장 원칙이고 여기가 그 소비 지점이다.
    axes: {
      get(a) { return e[AXIS_KEY[a]] ?? 1; },
      set(a, v) { if (v > 0 && Number.isFinite(v)) e[AXIS_KEY[a]] = v; },
    },
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
  //
  // ── 🔴 축별 문이 열렸다 (팀장 판정 2026-08-25) ──────────────────────────────
  // 이 자리에는 *"축별로 미는 문을 안 연 것은 판정이다(팀장 2026-08-21) … 재론 트리거는
  // 감독이 화면을 보고 비율을 문제라고 말할 때"* 가 적혀 있었다. **그 트리거가 발동했다** —
  // 감독 카드 판정 2026-08-22 「축별로 늘리기 — 세 방향」(발단 신고: *"크기 조정은 R
  // 한축만되는것 같은데?"*).
  //
  // ⚠ **그때 정해 둔 형태에서 하나가 달라졌다: 「village 만」이 아니라 오버레이도 낸다.**
  // 팀장이 그 확장을 판정한 근거 둘:
  //   ① 8-21 판정의 전제(*"감독이 비율을 문제라고 말한 적이 없다"*)가 **소멸했다.**
  //      카드 문언은 대상을 특정하지 않았고, 발단 신고도 기즈모 **전체**에 대한 것이다.
  //   ② village 만 열면 **「조용한 no-op」**이 된다 — `EditTarget` 이 두 형태를 같은 문으로
  //      흡수하는데 대상에 따라 축별 상자가 되고 안 되면 «가끔 안 움직인다» 가 되고,
  //      그것은 이 파일이 `onDetach` 주석에서 이미 팀장 조건으로 못 박은 결함 형태다.
  //
  // ⚠⚠ **「`s` 자체를 `sx·sy·sz` 로 확대하는 안이 영구 기각」인 것은 그대로 유효하다.**
  // 이번 형태가 그것을 우회한 것이 **아니라 애초에 다른 안**이다 — `s` 는 균등 배율로
  // **그대로 남고**, 축별은 거기 **곱해지는 옵션 배수**다(`decide/overlay.ts` 의 `sx?`).
  // 기각 논거였던 *"오버레이 어댑터가 세 축인 척하는 가짜 값을 낸다"* 가 성립하지 않는다.
  //
  // ⚠⚠⚠ **두 `sx` 는 뜻이 다르다** — 여기(마을)는 **본래 치수**이고(생성기가 폭·깊이·
  // 높이를 각각 뽑는다) 오버레이의 것은 **배수**다. 그 차이를 흡수하는 곳이 **이 어댑터
  // 한 곳**이고, 계약 쪽(`decide/overlay.ts` 의 `sx?` 주석)이 같은 말을 짝으로 적고 있다.
  const base = { sx: p.sx, sy: p.sy, sz: p.sz };
  let mul = 1;
  /**
   * 축별 **추가** 배수. 최종 = `base[축] * mul * axisMul[축]`.
   *
   * ⚠ `mul`(균등)과 **곱해진다** — 둘 중 하나로 합치면 「전체를 키웠다가 한 축만 되돌린다」
   * 같은 조작에서 어느 쪽이 얼마였는지 복원할 수 없다.
   */
  const axisMul = { x: 1, y: 1, z: 1 };
  /** 세 축을 한 번에 다시 계산한다 — 균등이든 축별이든 최종식이 **한 곳**이어야 한다 */
  const resize = (): void => {
    p.sx = base.sx * mul * axisMul.x;
    p.sy = base.sy * mul * axisMul.y;
    p.sz = base.sz * mul * axisMul.z;
  };

  /**
   * 이 종류가 준비한 색 목록. **원산지는 파츠 하나**이고 편집은 고르기만 한다
   * (`decide/overlay.ts` 의 `normalizePart`: *"상한은 파츠가 소유한다"*).
   */
  const palette = tonesFor(p.kind);
  /**
   * ⚠ **이 접기는 `systems/parcel-assets.ts` 의 `setTone` 과 같아야 한다** — 거기가
   * `palette[tone % palette.length]` 로 칠하므로, 여기서 다르게 접으면 **견본에 보이는
   * 색과 화면의 색이 갈린다.** 값 미러링이라 여기 적어 둔다: 그 파일을 고치면 이 함수도
   * 본다(둘을 한 곳으로 모으려면 파츠 계층에 「접는 함수」를 세워야 하고, 그것은 이
   * 회차보다 넓다 — 백로그 `G-EDIT11`).
   */
  const toneIndex = (i: number): number =>
    palette.length > 0 ? ((i % palette.length) + palette.length) % palette.length : 0;

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
      resize();
    },
    // 마을 파츠의 `sx` 는 **본래 치수**라 그대로 노출하면 소비자가 배수와 치수를 섞는다.
    // 붙는 순간의 값(`base`)에 대한 배수로 환산해 내보낸다 — 그 환산이 이 문의 존재 이유다.
    axes: {
      get(a) { return axisMul[a]; },
      set(a, v) {
        if (!(v > 0) || !Number.isFinite(v)) return;
        axisMul[a] = v;
        resize();
      },
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
    /**
     * 이 파츠가 준비한 색들. **2개 이상일 때만 문을 낸다** — 하나뿐인 파츠(도로 등)에
     * 견본 한 칸을 띄우면 «눌러도 아무 일이 없다» 가 되고, 그것이 이 저장소가
     * 「거짓 UI」라고 부르는 형태다(`panel/surface.ts` 의 읽기 전용 슬라이더 근거와 짝).
     */
    tone: palette.length > 1 ? {
      count: palette.length,
      swatch: (i) => palette[toneIndex(i)] as number,
      get: () => toneIndex(p.tone),
      // 계약이 「0 이상 정수」만 보장하므로(`normalizePart`) 그 밖은 **버린다** —
      // 다른 세터와 같은 규약이다(조용히 접어 넣으면 감독이 고른 칸과 화면이 갈린다).
      set: (i) => { if (Number.isInteger(i) && i >= 0 && i < palette.length) p.tone = i; },
    } : undefined,
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


