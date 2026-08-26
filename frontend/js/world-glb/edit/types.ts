// world-glb/edit/types.ts — 편집 모드와 오버레이 소비자 사이의 경계.
//
// 왜 별도 파일인가: `features/overlay.ts` 는 `edit/mode.ts` 를 **동적 import** 하고
// (`?edit=1` 없는 세션이 편집 코드를 내려받지 않게), `edit/mode.ts` 는 소비자가 만든
// 씬을 만져야 한다. 타입을 한쪽에 두면 서로를 가리키게 되고, 그러면 순환 여부가
// "타입 전용이라 런타임엔 안 도는데 정적 검사는 뭐라고 볼까" 에 걸린다. 경계를 제3의
// 파일에 두면 그 질문이 아예 생기지 않는다.

import type { Object3D, Camera } from 'three/webgpu';
import type { PlacedPart } from '../parts/types.js';
import type { FlyInput } from '../decide/fly.js';
import type { ViewPreset } from '../decide/orbit.js';
import type { ShadingMode } from '../decide/shading.js';
import type { SurfaceSetting } from '../decide/surface-material.js';

/**
 * 로드 진행 알림.
 *
 * `pct` 가 **`null` 이면 총 용량을 모른다는 뜻**이다 — 그때는 퍼센트를 지어내지 않고
 * 받은 양만 말한다(`lab-glb.js:192-199` 가 세운 규약). 지어낸 퍼센트는 100%에서 멈춰
 * 있는 바가 되고, 그건 없느니만 못하다.
 */
export type LoadProgress = (pct: number | null, loadedBytes: number) => void;

/** 씬에 놓인 배치 하나. **가변이다** — 편집이 값을 바꾸고 `apply` 로 씬에 반영한다. */
export interface OverlayEntry {
  /** 세션 안에서만 유효한 식별자. 내보내기에는 안 나간다 */
  readonly id: number;
  readonly src: string;
  /**
   * 저장소에 **없는** 파일인가(드래그드롭한 것).
   *
   * 미리보기는 브라우저 임시 주소(`blob:`)로 로드된다 — 새로고침하면 사라지고, 내보낸
   * JSON 에는 파일명만 남는다. 감독이 그 GLB 를 따로 주셔야 배포에 붙는다. 화면이 그
   * 사실을 말해야 하므로 항목이 스스로 들고 있는다.
   */
  readonly preview: boolean;
  readonly holder: Object3D;
  x: number;
  y: number;
  z: number;
  ry: number;
  s: number;
  /**
   * 축별 **추가** 배수 (감독 카드 판정 2026-08-22 「축별로 늘리기 — 세 방향」).
   *
   * 계약(`decide/overlay.ts` 의 `OverlayItem.sx?`)과 **같은 뜻·같은 선택 사양**이다 —
   * 없으면 `1` 이고, 최종 배율은 `s * (sx ?? 1)`. 씬에 얹힌 항목이 계약과 필드가 어긋나면
   * 내보낼 때 값이 조용히 사라지므로 **짝을 맞춘다.**
   *
   * ⚠ 마을 파츠(`PlacedPart`)의 같은 이름은 **본래 치수**라 뜻이 다르다. 그 차이를
   * 흡수하는 곳은 `edit/target.ts` 의 어댑터 한 곳이다.
   */
  sx?: number;
  sy?: number;
  sz?: number;
}

/**
 * 편집이 **마을 인스턴스**에 닿는 좁은 문. `InstancePools` 가 그대로 만족한다.
 *
 * 풀 전체를 넘기지 않는 이유는 `SlotPool`(`parcel-builder.ts`)과 같다 — 편집이 슬롯을
 * 만들거나 반납할 수 있게 되면 개수 불변식의 집행 지점(`seal()`)이 뒷문으로 열린다.
 * 여기 있는 셋은 전부 **읽기**다.
 *
 * ⚠ `refreshBounds` 를 레이캐스트 **전에** 부르지 않으면 «멀리 있는 것이 가끔 안
 * 집힌다» 가 기본 동작이다. 이유와 실증은 `systems/instancing.ts` 의 그 메서드 한 곳이다.
 */
export interface VillageRaycast {
  /**
   * ⚠ `unknown[]` 인 것은 **의도**다. 여기에 `RaycastMesh` 를 요구하면 `InstancePools` 가
   * 구조적으로 불합격한다 — 그쪽이 `Object3D[]` 로 선언돼 있고 `getMatrixAt` 은
   * `InstancedMesh` 에만 있기 때문이다. 목록의 정적 타입을 좁히는 대신 **맞힌 것 하나를**
   * 좁힌다(아래 `RaycastMesh`). 실제로 그 시점에는 `instanceId` 가 왔다는 사실이
   * «이것은 인스턴스 메시다» 를 이미 말해 준다.
   */
  raycastTargets(): readonly unknown[];
  refreshBounds(): void;
  /**
   * 맞힌 인스턴스의 **슬롯 핸들**. 빈 슬롯이면 `null`.
   *
   * ⚠ `index` 는 W5 E2.5 에서 열렸다 — 그전까지 `{ key }` 만 냈다. 이것이 있어야
   * «이 파츠가 어느 슬롯인가» 를 **역인덱스 없이** 손에 넣는다(W4 ②-c 가 역인덱스를
   * 일부러 안 만든 이유: 라이브가 그 비용을 낸다). 고르는 그 순간 이미 답이 오므로
   * 만들 필요가 없었다.
   *
   * ⚠⚠ **`index` 는 살아 있는 동안만 유효하다.** 슬롯이 반납되면 `-1` 이 박히고
   * (`instancing.ts` 의 `release`), 그 시점부터 이 핸들로는 아무것도 못 민다.
   * 반납은 조작 중에도 일어난다(카메라가 멀어지면 스트리밍이 파셀을 걷는다).
   */
  ownerAt(mesh: unknown, instanceId: number): SlotRef | null;
}

/**
 * 슬롯 하나를 가리키는 것. `SlotHandle`(`systems/instancing.ts`)이 그대로 만족한다.
 *
 * **가변 `index` 를 읽기 전용으로 받는 것이 의도**다 — 편집은 이 값을 **읽기만** 한다.
 * 풀이 `release` 의 swap 에서 제자리로 고쳐 주므로(`instancing.ts:302`) 편집이 쥔 채로도
 * 계속 맞고, 죽으면 `-1` 이 된다. 편집이 이것을 쓰면 그 계약이 깨진다.
 */
export interface SlotRef {
  readonly key: string;
  readonly index: number;
}

/**
 * 레이캐스트가 **맞힌** 인스턴스 메시. 편집이 실제로 읽는 것만 적은 구조 타입.
 *
 * `getMatrixAt` 하나가 이 회차의 요점이다 — 맞힌 인스턴스의 **위치**가 나와야 그것을
 * 파셀·파츠로 되짚을 수 있다(`decide/village-pick.ts` 헤더).
 */
export interface RaycastMesh {
  getMatrixAt(index: number, target: { elements: ArrayLike<number> }): void;
}

/**
 * 편집이 **마을 배치**에 닿는 좁은 문. `VillageParcels`(`systems/village-parcels.ts`)가
 * 그대로 만족한다.
 *
 * ⚠ 쓰기 둘(`freeze`·`thaw`)은 **W4 ②-d 에서 열렸다.** 그전까지 읽기뿐이었고, 그때
 * 이 자리에 *"쓰는 소비자가 없는데 문을 미리 내면 «준비됨» 이 «충족됨» 으로 읽힌다"*
 * 라고 적어 두었다. 지금은 소비자가 있다 — `edit/target.ts` 의 마을 어댑터 하나다.
 *
 * ⚠⚠ **`freeze` 는 그 파셀을 통째로 다시 만든다.** 드래그처럼 연속으로 부르면 건물이
 * 프레임마다 사라졌다 다시 자란다. 부르는 자리를 «조작이 끝났을 때» 로 좁히는 것은
 * 이 문이 아니라 소비자 몫이고, `EditTarget` 이 `apply`/`commit` 을 가른 이유가 그것이다.
 */
export interface VillageRead {
  /** 그 파셀의 지금 배치(near 기준 전체). 동결이 있으면 그것, 없으면 계산값 */
  partsAt(px: number, pz: number): PlacedPart[];
  /** 이 파셀이 동결됐는가 — 화면이 «손본 구역» 임을 말해야 한다 */
  isFrozen(px: number, pz: number): boolean;
  /** 동결을 걸거나 갈아 끼운다. **그 파셀이 다시 만들어진다** */
  freeze(px: number, pz: number, parts: readonly PlacedPart[]): void;
  /** 동결을 푼다 — 계산 배치로 돌아간다 */
  thaw(px: number, pz: number): void;
}

/**
 * 마을 파츠 하나를 가리키는 **세션 안의 이름**.
 *
 * ⚠ `index` 는 «그 순간의 배열에서 몇 번째» 다. 파셀을 동결하기 전까지 그 배열은 계산
 * 결과이므로 **밀도 노브가 바뀌면 다른 것을 가리킨다** — 계약(`decide/overlay.ts`)이
 * «파츠에는 이름이 없다» 로 길게 적은 그 문제다. 그래서 이 값을 저장하지 않는다.
 */
export interface VillagePick {
  readonly px: number;
  readonly pz: number;
  readonly index: number;
  readonly kind: string;
  /** 월드 좌표 — 선택 링을 놓는 자리 */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** 이미 손본 파셀인가 */
  readonly frozen: boolean;
  /**
   * 이 파츠가 지금 올라가 있는 **슬롯**. 조작 중 실시간 반영이 이것 하나에 달려 있다.
   *
   * `null` 인 경로가 실제로 있다 — **아웃라이너 목록에서 고르면** 레이캐스트를 안 타므로
   * 슬롯을 모른다(3D 클릭만 `ownerAt` 을 거친다). 그때는 조작이 확정 시점에 보인다.
   * 목록에서도 실시간으로 보이게 하려면 「파츠 → 슬롯」 역인덱스가 필요하고, 그것이
   * 바로 W4 ②-c 가 라이브 비용 때문에 안 만든 것이다 — 필요해지면 **편집 세션에서만** 만든다.
   */
  readonly slot: SlotRef | null;
}

/**
 * 편집이 씬에 닿는 유일한 통로. 소비자(`features/overlay.ts`)가 구현한다.
 *
 * 편집 모듈이 `env.scene` 을 직접 뒤지지 않게 하는 것이 요점이다 — 그러면 오버레이가
 * 아닌 것(하늘·지면·GLB)까지 집을 수 있다.
 *
 * ⚠ 이 문단은 오래 *"이번 회차의 편집 대상은 **오버레이 항목뿐**"* 으로 끝났고 **W4 에서
 * 거짓이 됐다** — 마을 파츠가 대상이 됐다. 다만 접근 방식은 그대로다: 씬을 뒤지는 대신
 * 좁은 문(`instances`·`village`)을 받는다.
 */
export interface OverlayHost {
  /** 동적 import 로 받아 둔 `three/webgpu` 네임스페이스. 편집이 또 import 하지 않는다 */
  readonly THREE: unknown;
  readonly camera: Camera;
  readonly canvas: HTMLElement;
  readonly doc: Document;
  readonly cellX: number;
  readonly cellZ: number;
  /** 레이캐스트 대상이 되는 루트. 자식이 곧 항목 holder 다 */
  readonly root: Object3D;
  /** 마을 인스턴스 레이캐스트. 없으면 마을 파츠를 집지 않는다(오버레이만) */
  readonly instances: VillageRaycast | null;
  /** 마을 배치 조회. 없으면 마을 파츠를 집지 않는다 */
  readonly village: VillageRead | null;
  /**
   * 미술관 GLB 의 레이캐스트 루트. 없으면 미술관 벽은 **벽 검출 대상이 아니다**
   * (태스크 #112).
   *
   * ⚠ **이것은 「고르기」 대상이 아니다** — `pick()`·`pickVillage()` 는 여기를 안 본다.
   * 미술관은 편집으로 옮기거나 지우는 물건이 아니고, 이 문이 여는 것은 **벽면 하나**다.
   * 고르기까지 열면 `EditTarget` 이 「옮길 수 없는 것」을 들게 되고 그 예외가 번진다.
   *
   * ⚠⚠ **읽기 전용으로 다뤄라** — 자식을 옮기거나 지우면 `glbCity` 기능의 `dispose()`
   * 전제가 깨진다. 계약 원문은 `world-shared/glb-city.ts` 의 `GlbCityInstance.wallRoot`.
   */
  readonly glbCity: Object3D | null;

  entries(): readonly OverlayEntry[];
  /**
   * 배치한다. `blobUrl` 이 있으면 그 주소로 로드하고 항목을 `preview` 로 표시한다.
   * 로드 실패면 `null` — 사유는 `lastFailure()` 로 묻는다.
   */
  place(
    src: string,
    at: { x: number; y: number; z: number; ry?: number; s?: number },
    blobUrl?: string,
    onProgress?: LoadProgress,
  ): Promise<OverlayEntry | null>;
  /**
   * `place` 가 마지막으로 `null` 을 낸 이유.
   *
   * 왜 필요한가: 예전에는 화면이 *"콘솔의 진단을 보세요"* 라고 말했는데 이 경로에
   * `console.*` 호출이 **0건**이었다 — 감독이 콘솔을 열어도 아무것도 없다. 거짓 안내는
   * 안내가 아니라 막다른 길이다(검수관 지적, 2026-08-12).
   */
  lastFailure(): string | null;
  remove(e: OverlayEntry): void;
  /**
   * **지운 것을 되살린다** — 실행취소가 삭제를 되돌리는 유일한 문(2026-08-22).
   *
   * ── 왜 `place()` 를 다시 부르지 않는가 ──────────────────────────────────
   * 그 편이 계약을 안 늘려서 처음 계획이었고, **실측이 뒤집었다.** `place()` 는 **새
   * `OverlayEntry` 객체**를 만든다. 그러면 그 항목을 가리키던 다른 되돌리기 항목이
   * 전부 낡는다 — 「A 를 옮기고 → A 를 지우고 → 두 번 되돌리기」 를 하면 첫 번째가
   * **새 객체**를 되살리고 두 번째는 **옛 객체**의 자세를 미느라 화면에 아무 일도 안
   * 일어난다. 이 저장소가 가장 비싸게 겪은 «가끔 안 먹는다» 그 자체다.
   * 그리고 지우는 쪽은 이미 되살릴 준비가 돼 있었다 — `remove()` 는 `entries` 에서
   * 빼고 `root` 에서 뗄 뿐 **`dispose()` 를 안 부른다**(실측: 그 함수 전체가 3줄).
   * 즉 GPU 자원은 그대로 살아 있고, 없던 것은 **다시 붙이는 문**뿐이었다.
   *
   * ── 선택 사양인 이유와 그 대가 ─────────────────────────────────────────
   * 이 문을 안 여는 소비자(테스트 하네스·빌더 미리보기)가 그대로 돌게 하려는 것이다.
   * 대신 **없으면 삭제가 「되돌릴 수 없는 조작」으로 스택에 남는다** — 조용히 안 쌓으면
   * Ctrl+Z 가 **그 앞의 조작**을 되돌려 감독이 엉뚱한 변화를 성공으로 읽는다. 근거는
   * `edit/history-ops.ts` 의 `barrier` 한 곳이다.
   *
   * @param at 원래 몇 번째였나. 범위 밖이거나 생략이면 **끝에** 붙는다 — 순서는
   *           내보내기 JSON 의 항목 순서이고 의미는 같지만, 아웃라이너 목록이 튀지
   *           않으려면 제자리가 낫다.
   * @returns 되살렸으면 `true`. 이미 있거나 세션이 끝났으면 `false`
   */
  restore?(e: OverlayEntry, at?: number): boolean;
  /** 항목의 x·y·z·ry·s 를 씬에 반영한다 */
  apply(e: OverlayEntry): void;
  /** 지금 상태를 계약 원본(raw JSON) 으로. `validateOverlay` 에 그대로 넣는다 */
  toRaw(): unknown;
  /** 시점을 돌린다(편집 모드는 포인터락을 안 쓰므로 우클릭 드래그로 대신한다) */
  look(dx: number, dy: number): void;
  /**
   * **대상을 중심으로 돈다** (W5 E3). 시선은 늘 그 대상을 향한다.
   *
   * ⚠ 이것은 이 저장소에서 편집이 **플레이어 위치를 움직이는 유일한 문**이다.
   * 팀장 판정 (A-2)(2026-08-13): `moveTo(x, z)` 같은 원시 좌표 문을 열면 임의
   * 순간이동이 가능해지고 그 문은 언제나 이번 용도보다 넓다. 여기서 편집은
   * «어디로» 를 정하지 못하고 **«이 중심 주위로 얼마나»** 만 말한다 — 산술·충돌·복원
   * 책임은 `systems/player.ts` 에 남는다.
   *
   * 없을 수도 있다(`?`) — 궤도를 안 여는 소비자(빌더 미리보기 등)가 있고, 그때 편집은
   * 궤도 조작을 **조용히 무시**한다(우드래그 시점 회전은 그대로 산다).
   */
  orbit?(
    cx: number, cy: number, cz: number,
    dYaw: number, dHeight: number, kRadius: number,
  ): void;
  /**
   * **정해진 시점으로 간다**(탑·좌·우·정면, `F` 확대). W6.
   *
   * `orbit` 이 델타인 것과 달리 이쪽은 **절대**다 — 「탑에서 본다」는 지금 각이 얼마든
   * 같은 자리로 간다는 뜻이라 델타로 표현할 수 없다. 그래도 문은 **더 좁다**: 편집이
   * 임의 자세를 못 주고 정해진 값(`ViewPreset`) 중 하나만 고른다.
   */
  orbitTo?(cx: number, cy: number, cz: number, preset: ViewPreset): void;
  /**
   * **한 프레임 난다**(감독 지시 2026-08-19 *"하늘을 날아서 보고 편집하게"*).
   *
   * `orbit` 과 **같은 규약**이다 — 선택 사양이고(`?`), 없으면 편집이 비행 키를 조용히
   * 무시한다. 그리고 팀장 조건 ①과도 같다: 편집은 **어디로 갈지 못 말하고** 「지금 누른
   * 키로 이만큼」만 말한다. `moveTo(x,z)` 류를 열지 않는 이유는 위 `orbit` 주석 한 곳이다.
   *
   * ⚠ **`orbit` 과 다른 점 하나** — 이것은 사람이 키를 누르는 동안 **매 프레임** 불린다.
   * 그래서 `dt` 를 받는다(궤도는 포인터 델타라 필요 없었다). 산술·클램프·복원은 여전히
   * `systems/player.ts` 가 소유한다.
   */
  fly?(input: FlyInput, dt: number): void;
  /**
   * 지금 어떤 셰이딩인가 / 셰이딩을 바꾼다 (W6). 감독 지시 *"와이어 프레임 뷰. 솔리드
   * 뷰도 구현해줘."*
   *
   * `orbit` 과 같은 이유로 **둘 다 선택 사양**이다 — 셰이딩을 안 여는 소비자(빌더
   * 미리보기·테스트 하네스)가 있고, 그때 편집은 버튼과 키를 **조용히 무시**한다.
   *
   * ⚠ **둘이 짝이다.** `setShading` 만 있고 `shading` 이 없으면 `Shift+Z` 토글이
   * «지금 무엇인가» 를 몰라 성립하지 않는다. 편집 쪽에서 둘 다 있을 때만 키를 배선한다.
   *
   * 「돌아갈 자리」(`Shift+Z` 가 와이어에서 복귀할 모드)는 **여기 없다** — 편집 세션
   * 안의 UI 상태라 `EditState` 가 소유한다. 월드는 «지금 무엇으로 그리는가» 만 알면 되고,
   * 그것을 여기 두면 편집을 안 쓰는 세션까지 편집의 히스토리를 들고 있게 된다.
   */
  shading?(): ShadingMode;
  setShading?(m: ShadingMode): void;

  /**
   * 표면 재질 목록(W7 · 「월드스튜디오」). **`shading` 과 같은 이유로 선택 사양이다** —
   * 소비자가 안 주면 그 칸만 빠지고 나머지 편집은 그대로 산다.
   *
   * ⚠ **앞의 둘이 짝이다.** `surfaces` 만 있고 `setSurfaces` 가 없으면 움직이는데 아무 일도
   * 안 나는 슬라이더가 되므로, 패널은 **둘 다 있을 때만** 만들어진다(`panel/dom.ts`).
   *
   * `registerPreview` 는 떨어뜨린 파일을 그 `src` 자리에서 즉시 보여지게 등록한다. 없어도
   * 되고, 그때는 미리보기 없이 `src` 만 저장된다 — 파일을 커밋해야 그림이 뜬다.
   */
  surfaces?(): readonly SurfaceSetting[];
  setSurfaces?(s: readonly SurfaceSetting[]): void;
  registerPreview?(src: string, file: File): void;
  /** 커밋된 텍스처 목록. 없거나 실패하면 드롭만 쓸 수 있다 */
  listTextures?(): Promise<readonly string[]>;
  /**
   * 편집이 끝났다 — 눈높이를 걷고 갇힘을 푼다.
   *
   * 궤도가 충돌을 무시하므로(팀장 판정 3: 안 그러면 건물 사이에서 원호가 끊겨 도구로서
   * 실패한다) **벽 안에 서 있을 수 있다.** 그 안전을 여기 한 곳에서 보장한다.
   */
  endOrbit?(): void;
  /** 그 자리에서 밟는 바닥 높이(m) */
  surfaceAt(x: number, z: number): number;
  /**
   * **이미 점유한 슬롯의 자세만 다시 쓴다** — 조작 중 마을 파츠가 손을 따라오게 하는 문.
   *
   * 없으면(`undefined`) 조작이 확정 시점에만 보인다 = W4 의 동작 그대로다. 그래서 선택
   * 사양으로 둔다 — 이 문을 안 여는 소비자(테스트 하네스 등)가 그대로 돈다.
   *
   * ⚠ **개수는 안 변한다.** 슬롯을 만들거나 반납하는 문은 여기 없고, 그것이 편집에
   * `SlotPool` 전체를 안 넘기는 이유다(위 `VillageRaycast` 헤더 · 팀장 판정 2026-08-13).
   */
  retargetSlot?(
    slot: SlotRef,
    t: { x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number },
  ): void;
  /**
   * **편집을 켜고 끌 때 터치 조작에 알린다** (`G-EDIT14`).
   *
   * 없으면(`undefined`) 종전 동작이다 — 폰에서 캔버스 드래그가 시선 회전과 기즈모 끌기에
   * **둘 다** 들어간다. 선택 사양으로 두는 것은 이 문을 안 여는 소비자(테스트 하네스 등)가
   * 그대로 돌게 하기 위해서다.
   *
   * ⚠ **이동은 안 끊는다** — 그 판정은 전용 원 안에 있어 편집과 겹치지 않는다.
   * 무엇이 왜 끊기는지는 `ui/touch-controls.ts` 헤더 한 곳이다.
   */
  setTouchEditing?(on: boolean): void;
}

/** 편집 모드를 켠다. 반환값이 정리 핸들이다. */
export interface EditSession {
  dispose(): void;
  /**
   * 조준 화면의 진단 스냅샷 (W8-6). 조준 기능이 없는 세션이면 `null`.
   *
   * ⚠ **캐시된 값이다** — 호출 시점에 다시 레이캐스트하지 않는다. 그러면 리포트를 읽는
   * 것만으로 비용이 발생하고, `casts` 를 보는 게이트가 **자기 자신을 세게** 된다.
   *
   * 이 문이 존재하는 이유: 조준 루프의 재캐스트 **횟수**가 이 회차의 유일한 이산 축이다.
   * CPU 시간은 이 저장소가 원리적으로 못 재므로(`decide/aim.ts` 헤더) 횟수라도 잡는다.
   */
  aim(): { readonly hit: boolean; readonly on: boolean; readonly casts: number } | null;
}
