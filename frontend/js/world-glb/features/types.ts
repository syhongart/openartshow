// world-glb/features/types.ts — 기능 플러그인 계약.
//
// ── 왜 만드는가 ──────────────────────────────────────────────────────────────
// 감독 지적: *"메타버스 안에 이것도 들어갈 수 있고 저것도 들어갈 수 있는데, 자꾸 한 파일
// 안에 다 넣지 마. 날씨 파일이나 캐릭터 파일은 별도로 만들어서 넣었다 뺐다 할 수 있어야지."*
//
// 커널은 이미 플러그인이었다 — `kernel.add(sys)`로 등록하고 `update(ctx)`만 부른다.
// 문제는 **조립**이었다. `main.ts`가 하늘을 켜려면 다섯 군데를 건드려야 했다:
//
//   ① `pools` 부팅 단계에서 `new SkySystem(...)`  ② `kernel.add(sky!)` (느낌표가 증거다)
//   ③ HUD의 드로우콜 판정 그룹 키                  ④ 진단 훅의 `sky.get()`
//   ⑤ 神 모드 패널 배선
//
// 그래서 하늘을 빼는 것이 "선언 한 줄 지우기"가 아니라 "main.ts 수술"이었다. 바다·NPC·
// 멀티플레이어를 그대로 얹으면 이 하드코딩이 넷으로 늘어난다.
//
// ── 규약: 기능을 빼면 그 기능에 관한 모든 것이 함께 빠진다 ───────────────────
// 각 기능이 **자기에 관한 모든 것을 스스로 들고 있다.** System·진단·HUD 판정 키·정리까지.
// `features/index.ts`의 목록에서 한 줄을 지우면 그 기능의 흔적이 전부 사라진다.
//
// ── 코어와 기능의 경계 ───────────────────────────────────────────────────────
// `player`·`streaming`·`adapt`는 **코어**다. 없으면 월드가 아니다(걸을 수 없거나, 아무것도
// 안 뜨거나, 저사양에서 죽는다). 기능은 "있으면 좋고 없어도 월드인 것"이다 — 하늘·바다·
// NPC·멀티플레이어. 이 경계가 흐려지면 레지스트리는 그냥 다른 모양의 하드코딩이 된다.

// 개별 named type import를 쓴다 — `import type * as THREE from 'three/webgpu'`로 하면
// 내부 네임스페이스 재수출에 걸려 타입이 안 잡힌다(TS2694).
import type { GlbMap } from '../systems/glb-minimap.js';
import type { Scene, DirectionalLight, HemisphereLight, Camera, Object3D } from 'three/webgpu';
import type { SkyTime } from '../decide/night.js';
import type { ShadingMode } from '../decide/shading.js';
import type { SurfaceSetting } from '../decide/surface-material.js';
import type { System } from '../kernel.js';
import type { RendererAdapter } from '../adapters/renderer.js';
import type { InstancePools } from '../systems/instancing.js';
import type { PlayerSystem } from '../systems/player.js';
import type { VillageParcels } from '../systems/village-parcels.js';

/**
 * 기능이 조립 시점에 받을 수 있는 것들. **읽기 전용으로 다룬다** — 기능이 이걸 통해 서로의
 * 상태를 만지기 시작하면 커널의 "System은 상태를 공유하지 않는다" 규약이 뒷문으로 깨진다.
 */
export interface FeatureEnv {
  readonly scene: Scene;
  readonly adapter: RendererAdapter;
  readonly player: PlayerSystem;
  /** 슬롯 풀. 이미 `seal()`된 상태다 — 기능이 새 풀을 만들 수 없다(개수 불변식) */
  readonly pools: InstancePools;
  /**
   * 마을 파셀의 **동결 저장소**. 감독이 손본 구역이 여기 담긴다.
   *
   * ⚠ 이것은 위 *"읽기 전용으로 다룬다"* 의 **예외**다 — 쓰기 문(`freeze`·`thaw`·
   * `setAll`)이 열려 있다. 예외인 이유: 동결은 «어느 한 기능의 상태» 가 아니라 **월드
   * 자체의 상태**다. 마을을 만드는 것은 코어(빌더·스트리밍)이고 오버레이 기능은 그것을
   * 파일에서 읽어 앉힐 뿐이다. 기능이 소유하면 그 기능을 빼는 순간 마을 배치가 사라진다.
   *
   * 그래서 소유는 조립부에 두고 여기서는 **통로만** 연다. 커널 규약(「System 은 상태를
   * 공유하지 않는다」)이 뒷문으로 깨지지 않는 것은, 이것을 만지는 것이 System 이 아니라
   * 조립부가 만든 저장소이고 그 변경이 **스트리밍 재빌드라는 정규 경로**로만 화면에
   * 도달하기 때문이다.
   */
  readonly village: VillageParcels;
  /**
   * **이미 점유한 슬롯의 자세만 다시 쓴다.** 편집이 조작 중 매 프레임 부른다.
   *
   * ⚠ 이것도 위 *"읽기 전용으로 다룬다"* 의 **예외**이고, 바로 위 `village` 와 **같은
   * 논리 구조**다 — 소유는 조립부(`main.ts` 의 `slotPool`)에 두고 여기서는 **통로만**
   * 연다. 커널 규약(「System 은 상태를 공유하지 않는다」)이 뒷문으로 안 깨지는 이유:
   * 이 함수가 만지는 것은 다른 System 의 상태가 아니라 **조립부가 소유한 슬롯 풀**이고,
   * 그 변경이 빌더·그림자 재베이킹과 **같은 어댑터**(같은 워프·같은 성장 sink)를 탄다.
   *
   * ── 왜 `slotPool` 자체를 안 넘기나 (팀장 판정 2026-08-13) ─────────────────
   * `SlotPool` 에는 `acquire`·`release` 가 있고, 그것을 기능에 넘기면 개수 불변식의
   * 집행 지점(`pools.seal()`)이 뒷문으로 열린다 — `edit/types.ts` 가 명시적으로 세운
   * 경계다. 그래서 **핸들 + 자세만** 받는 함수 하나로 좁힌다. 슬롯 개수는 구조적으로
   * 안 변한다(`parcel-assets.ts` 의 `retarget` 이 `p.used` 를 안 건드린다 — 실측).
   *
   * ⚠⚠ **핸들이 죽었으면 아무 일도 안 일어난다**(`instancing.ts` 의 `setTransform`
   * 가드). 그것을 화면이 말하는 일은 부르는 쪽 몫이다 — 조용한 no-op 은 «가끔 안
   * 움직인다» 가 된다.
   */
  readonly retargetSlot: (
    h: { readonly key: string; readonly index: number },
    t: { x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number },
  ) => void;
  /**
   * **편집을 켜고 끌 때 터치 조작에 알린다** (`G-EDIT14`, 팀장 판정 (나) 2026-08-21).
   *
   * ⚠ 위 `village`·`retargetSlot` 과 **같은 논리 구조**다 — 소유는 조립부(`main.ts` 의
   * `attachTouchControls` 반환값)에 두고 여기서는 **통로만** 연다. 편집을 켜고 끄는
   * 자리(`edit/mode.ts` 의 `setEditing`)와 터치를 붙드는 자리는 서로를 모르는 계층이라
   * 문 없이는 이을 수 없다.
   *
   * **끊기는 것은 시선 드래그 하나다** — 이동 조이스틱은 전용 원 안에서만 판정하므로
   * 편집 판정 영역과 겹치지 않고, 폰에는 궤도·줌·비행이 없어 이동까지 끊으면 «다른
   * 자리로 옮겨 편집» 이 불가능해진다. 근거는 `ui/touch-controls.ts` 헤더 한 곳이다.
   *
   * 선택 사양이 아니라 **필수**인 것이 의도다: 이 문을 안 주는 소비자가 생기면 그
   * 화면에서만 조용히 충돌이 되살아나고, 증상이 «폰에서 가끔 화면이 돌아간다» 라
   * 원인에서 가장 먼 자리에서 드러난다. 터치가 없는 기기에서는 조립부가 no-op 을 준다.
   */
  readonly setTouchEditing: (on: boolean) => void;
  /** 씬 조명. 개수가 고정이라 커널이 소유하고, 기능은 색·강도만 빌려 쓴다 */
  readonly sun: DirectionalLight;
  readonly hemi: HemisphereLight;
  /**
   * 광원을 타깃에서 물릴 거리(m). 조립부가 `decide/shadow.ts` 로 그림자 프러스텀과
   * **함께** 유도한 값이다 — 하늘이 이 값으로 태양을 배치해야 프러스텀과 짝이 맞는다.
   */
  readonly shadowDist: number;
  /** 그림자 텍셀 한 변(m). 태양 추종점 스냅용 — `decide/shadow.ts` 유도값 */
  readonly shadowTexel: number;
  /** 월드 셀 크기(미터) */
  readonly cell: number;

  /**
   * 그 파셀이 **지금 로드돼 있는가** (W8-9). 곧 «그 자리 마을 파츠가 화면에 있는가» 다.
   *
   * ── 왜 계약에 있는가 (감독 지시 2026-08-18) ───────────────────────────────
   * *"멀리떨어졌을때 건물이 사라질때 같이 사라지고 나왔으면해"* — 벽에 건 작품이
   * 건물과 생사를 맞춰야 한다. 그런데 「건물이 사라지는 거리」를 아는 것은 **코어**
   * (스트리밍)이고 액자는 **기능**(오버레이)이다.
   *
   * 기능이 그 거리를 **자기가 다시 계산하면** 밴드 값(`decide/lod.ts` 의 `DEFAULT_BANDS`)
   * 과 히스테리시스가 두 곳에 살고, 한쪽만 바뀌면 «건물은 사라졌는데 액자는 남는다» 가
   * 조용히 돌아온다. 그것이 이 저장소가 값 미러링으로 반복해서 당한 형태다 —
   * 바로 위 `time` 이 계약에 들어온 이유(반구광 세기로 밤을 **추측**하다 틀린 사고)와
   * **같은 구조**다.
   *
   * ⚠ 이것은 위 `village`·`retargetSlot` 과 달리 **예외가 아니다.** 순수 읽기이고,
   * 계약 첫 줄의 *"읽기 전용으로 다룬다"* 그대로다.
   *
   * ⚠ `village.isFrozen(px, pz)` 는 이 질문의 답이 **아니다** — 그것은 «편집으로
   * 동결됐는가» 이고 가시성과 독립이다(동결된 파셀도 멀어지면 언로드된다).
   */
  readonly parcelLoaded: (px: number, pz: number) => boolean;
  /**
   * **GLB 에서 구운 지도**(감독 지시 *"알아서 지도 만들고"*). 미니맵이 이것을 그린다.
   * ⚠ **클로저인 이유는 위 `parcelLoaded` 와 같다** — GLB 는 `stream` 단계에서야 온다.
   * 그전에는 `null` 이고 지도가 바탕만 그린다(「아직 안 왔다」가 사실이다).
   */
  readonly glbMap: () => GlbMap | null;

  /**
   * 미술관 GLB 의 레이캐스트 루트. 아직 안 세워졌거나 그 기능이 꺼져 있으면 `null`
   * (태스크 #112).
   *
   * ⚠ **값이 아니라 클로저인 것은 위 `parcelLoaded`·`retargetSlot` 과 같은 이유다** —
   * 이 조립이 미술관을 세우는 단계보다 먼저 돌고, 그 자산은 13.5MB 라 로드가 비동기다.
   * 편집이 실제로 부르는 시점(감독이 벽을 겨눌 때)에는 채워져 있다.
   *
   * ⚠⚠ **레이캐스트 대상으로만 쓴다.** 편집이 이 루트의 자식을 옮기거나 지우면
   * `glbCity` 기능의 `dispose()` 전제가 깨진다. 계약 원문은
   * `world-shared/glb-city.ts` 의 `GlbCityInstance.wallRoot` 한 곳이다.
   *
   * ⚠⚠⚠ **선택적이다** — 이 기능이 목록에서 빠진 세계에서도 조립이 성립해야 한다.
   * 없으면 미술관 벽은 그냥 벽 검출 대상이 아니고, 그것은 결함이 아니라 사실이다.
   */
  readonly glbCityRoot?: () => Object3D | null;

  /**
   * 지금 몇 시인가. **조립부가 소유하는 월드 상태다.**
   *
   * ── 왜 계약에 있는가 (감독 발견 2026-07-30 · 팀장 판정 A-2) ────────────────
   * 시간대를 아는 기능이 둘 이상이다 — 하늘(팔레트·가로등)과 후보정(블룸 세기). 그런데
   * 계약에 없었으므로 후보정은 **반구광 세기를 관측해 낮/밤을 추측**했다:
   *
   *   env.hemi.intensity < 0.95 ? 'night' : 'day'
   *
   * 그 문턱의 근거는 "밤 반구광 하한이 0.85" 였는데, 밤을 밝히는 커밋이 그 하한을
   * **1.2** 로 올리면서 밤이 낮으로 읽혔다. 블룸 세기 = `기본값 × nightness('day')` = 0.
   * 감독 화면에서 가로등 번짐이 사라졌고, `?bloom=0` 과 구별조차 되지 않았다.
   *
   * 값이 틀린 것이 아니라 **재는 축이 무효가 됐다** — 밤 하한(1.2)이 낮 값(1.0)보다
   * 커진 뒤로는 어떤 문턱을 골라도 반구광으로 시간대를 가릴 수 없다. 그래서 추측을
   * 없애고 상태를 공식으로 연다.
   *
   * 함수인 것은 **세션 중 변하기 때문**이다(神 모드 패널·URL). 값으로 받으면 조립 시점의
   * 시간대가 영원히 굳는다.
   *
   * 열거형 그대로 여는 것도 의도다 — `isNight` 같은 파생 boolean 으로 좁히면 노을이
   * 사라지고, 그 정보를 각 소비자가 다시 만들면서 `nightness` 와 미러링이 생긴다.
   */
  readonly time: () => SkyTime;

  /**
   * 시간대를 바꾼다. **부르는 자리는 둘뿐이다**(팀장 조건 4):
   *
   *   ① 조립부 초기화 — `?time=` 을 읽어 넣는다
   *   ② `features/sky.ts` — 神 모드 패널이 시간대를 고를 때
   *
   * 세 번째 경로가 열리면 소유가 다시 갈린다. 그래서 패널에는 하늘 엔진의 컨트롤을
   * 그대로 주지 않고 **이 setter 를 거치는 것만** 준다.
   */
  readonly setTime: (t: SkyTime) => void;

  /**
   * 지금 어떤 셰이딩인가 — 머티리얼 / 솔리드 / 와이어.
   *
   * ── 왜 `time`/`setTime` 과 **같은 모양**인가 ───────────────────────────────
   * 새 패턴을 만들지 않았다. 이것도 «어느 한 기능의 상태» 가 아니라 **월드를 보는 방식**
   * 이고, 그래서 소유는 조립부에 두고 여기서는 통로만 연다. 값으로 주면 조립 시점의
   * 모드가 영원히 굳고(세션 중 버튼·URL·키로 바뀐다), 셰이딩 기능이 혼자 들고 있으면
   * 편집 패널이 그 기능을 직접 만져야 해서 커널 규약이 뒷문으로 깨진다.
   *
   * 위 `time` 주석이 길게 적은 사고 — 후보정이 반구광 세기로 시간대를 **추측**하다가
   * 밤 하한이 낮 값보다 커지면서 블룸이 통째로 꺼진 일 — 이 그 규약을 안 지켰을 때의
   * 모습이다. 상태를 공식으로 열지 않으면 소비자가 관측으로 지어낸다.
   */
  readonly shading: () => ShadingMode;

  /**
   * 셰이딩을 바꾼다. 부르는 자리는 셋이다 — 조립부 초기화(`?shading=`), 편집 패널 버튼,
   * 편집 키(`Shift+Z`). 셋 다 **이 setter 를 거친다**: 편집에 셰이딩 기능의 컨트롤을
   * 그대로 주지 않는 것이 `setTime` 과 같은 이유다(`features/sky.ts` 의 神 모드 패널이
   * 하늘 엔진 대신 setter 만 받는 그 구조).
   */
  readonly setShading: (m: ShadingMode) => void;

  /**
   * 표면 재질 설정(W7). **`time`·`shading` 과 같은 모양이고 같은 이유다** — 월드 상태라
   * 조립부가 소유하고 여기서는 통로만 연다.
   *
   * ⚠ **참조가 같으면 «안 바뀌었다» 는 뜻이다.** 집행(`features/surface-paint.ts`)이 매
   * 프레임 그것으로 판정하므로, 조립부는 **바뀔 때만 새 배열**을 낸다(제자리 수정 금지).
   * 제자리로 고치면 화면이 안 따라오고, 그 실패는 «가끔 안 먹는다» 로만 보인다.
   */
  readonly surfaces: () => readonly SurfaceSetting[];

  /**
   * 표면 설정을 갈아 끼운다. 부르는 자리는 둘이다 — 부팅에 오버레이 JSON 을 읽은 뒤,
   * 그리고 편집 패널이 슬라이더를 움직였을 때.
   */
  readonly setSurfaces: (s: readonly SurfaceSetting[]) => void;

  /**
   * 그 표면의 재질. **파츠든 물이든 여기 하나로 답한다**(W7).
   *
   * ── 팀장 판정 2026-08-15 ────────────────────────────────────────────────
   * *"물 재질은 조립부 소유 레지스트리(`env.surfaceMaterial`)로 모은다 — (나)InstancePools
   * 얹기는 슬롯 풀의 의미론을 오염시키고(물은 슬롯을 안 쓴다), (다)ocean 자체 집행은
   * dispose 경로가 두 벌이 된다(값 미러링 사고 형태). 회수는 한 곳, 소유는 조립부, 기능은
   * 등록·읽기 통로만."*
   *
   * 조립부가 파츠 풀(`pools.materialOf`)과 등록분을 합쳐 답하므로, 집행 쪽은 «이게 파츠인가
   * 물인가» 를 몰라도 된다 — 그 구분이 집행에 새면 표면이 늘 때마다 분기가 하나씩 는다.
   */
  readonly surfaceMaterial: (kind: string) => unknown;

  /**
   * 자기 재질을 표면 레지스트리에 신고한다. **파츠 풀 밖에 있는 것만** 부른다(물).
   *
   * ⚠ **이 저장소에서 「기능 → 조립부」 방향은 이것이 처음이다.** 지금까지는 조립부가
   * 기능에 통로를 주는 단방향이었다. 소유 모델은 안 바뀐다 — 상태는 여전히 조립부가 든다.
   *
   * **언제 등록해도 된다.** 집행(`surface-paint.ts`)이 두 가지를 함께 갖췄기 때문이다:
   * ① 부팅 스냅샷을 **지연으로도** 뜨고(`baseOf`), ② 재질을 못 찾은 표면을 `pending` 에
   * 담아 **설정이 안 바뀌어도 다음 폴링에 다시 시도한다.**
   *
   * ⚠ **②가 없으면 ①만으로는 부족하다**(검수관 블로커 B2). `update()` 가 참조 동등성으로
   * 조기 반환하므로, 지연 스냅샷만 있으면 «다음 폴링» 이 아니라 «다음 **설정 변경**» 까지
   * 반영이 미뤄진다 — 그리고 **방문자 세션은 설정이 부팅에 딱 한 번 온다.** 즉 늦게 등록된
   * 표면이 방문자에게 영구히 안 칠해진다. 이 문장이 참인 것은 두 장치가 **함께** 서 있기
   * 때문이고, 어느 하나를 걷어내면 다시 거짓이 된다.
   *
   * ⚠⚠ **이 문단은 두 번 거짓이었다** — 그리고 두 번 다 검수관이 잡았다(2026-08-15).
   *   B1  스냅샷을 뜨는 곳이 부팅 루프 하나뿐이라 늦게 등록된 표면이 **영구히** 못 칠해졌다.
   *       동작하던 이유는 `FEATURES` 배열 순서가 우연히 맞아서였다.
   *   B2  ①만 고치고 *"다음 폴링에서 반영된다"* 라고 적었는데, `update()` 의 조기 반환 때문에
   *       **방문자 경로에서는 그대로 영구 불능**이었다. 증상이 편집자에게만 안 보였을 뿐이다.
   *
   * 두 번 다 **문장을 약하게 고치는 대신 집행을 고쳐 문장을 참으로 만들었다**(GS-3 전례).
   * 그리고 두 번 다 «주석이 약속하는 명제» 와 «검사가 재는 명제» 가 어긋난 것이 문제였다 —
   * B2 는 테스트 주석이 *"새 배열을 줘야 폴링이 본다"* 라고 적고 있는데 절 헤더는 *"그 약속이
   * 참인지 못 박는다"* 라고 했다. **문장과 검사가 같은 명제를 재야 한다.**
   *
   * 지키는 축 셋:
   *   · `tests/world2-ocean.test.ts` 의 「표면 재질 레지스트리」 절 — 부팅 등록·재질 동일성.
   *     실제 `oceanFeature.create` 를 태우고, 등록 호출을 지우면 4축이 깨진다(실측).
   *   · `tests/world2-surface-paint.test.ts` 의 「늦은 등록」 절 — 부팅에 없던 표면도 나중에
   *     등록되면 칠해지고 되돌려진다.
   *   · 같은 절의 **「설정 재공급 없이」** 축 — 위 ②가 참인지를 재는 자리다. 설정을 다시 주지
   *     **않고** 폴링만 돌려 반영되는지 본다(B2 회귀).
   */
  readonly registerSurfaceMaterial: (kind: string, material: unknown) => void;

  /**
   * 그 텍스처를 실제로 받아올 주소(W7). **집행이 URL 을 스스로 만들지 않는다.**
   *
   * 두 가지를 한 자리에서 흡수한다:
   *   ① base 결합 — 계약의 `assets/textures/…` 는 상대 표기이고 실제는 `<base>/app/…` 다
   *      (`asset-url.ts` 한 곳).
   *   ② **드롭 미리보기** — 감독이 방금 떨어뜨린 파일은 저장소에 아직 없다. 그때는
   *      `blob:` 주소로 바꿔치기해 **커밋 전에도 화면에서 보이게** 한다.
   *
   * ⚠ 계약에는 `blob:` 이 절대 안 들어간다(`isSafeTextureSrc` 가 절대 URL 을 막는다).
   *   미리보기는 **세션 안에서만** 살고, 내보낸 JSON 에는 언제나 상대 `src` 가 나간다 —
   *   GLB 가 `place(src, at, blobUrl)` 로 세운 규약과 같다.
   */
  readonly textureUrl: (src: string) => string;

  /**
   * 드롭한 파일의 임시 주소를 등록한다. **회수는 등록한 쪽 몫이다** — 오버레이가 이미
   * `blobUrls` 로 모아 떠날 때 지우고 있어서, 여기서 또 모으면 회수 경로가 두 벌이 된다.
   */
  readonly setTexturePreview: (src: string, url: string) => void;

  /** UI를 붙일 문서. 없는 환경(테스트)에서는 null */
  readonly doc: Document | null;
  /**
   * 씬을 보는 눈.
   *
   * 오래 비워 두고 *"시선 방향이 필요한 기능이 생기면 그때 넣는다"* 고 적어 두었는데,
   * **후보정이 그때가 됐다** — `pass(scene, camera)` 로 씬을 렌더타깃에 받아야 하므로
   * 카메라 없이는 성립하지 않는다.
   *
   * 씬을 훑어 찾는 방법도 있지만 카메라는 씬의 자식이 아닌 것이 보통이라 실패한다.
   * 계약으로 받는 것이 정직하다.
   *
   * 타입이 `PerspectiveCamera` 가 아니라 `Camera` 인 것은 `three/webgpu` 가 전자를
   * 재수출하지 않아서다(TS2694). 기능이 원근 전용 필드를 만질 일도 없다.
   */
  readonly camera: Camera;
}

/** 조립된 기능 하나. 필요한 것만 제공하면 된다 — 전부 선택이다. */
export interface FeatureInstance {
  /** 커널 파이프라인에 등록할 System. 없으면 등록하지 않는다(UI만 있는 기능 등) */
  readonly system?: System;

  /**
   * 진단 스냅샷. `window.__world2`에 `{ [기능이름]: 여기 반환값 }`으로 합쳐진다.
   * 기능을 빼면 진단에서도 저절로 사라진다 — main.ts에 기능별 분기가 없다.
   */
  diagnostics?(): unknown;

  /**
   * 드로우콜 판정의 그룹 키 조각.
   *
   * 드로우콜은 가시성에 따라 정당하게 변한다(하늘 날씨, 훗날 바다 상태 등). 그래서 성능
   * 리포트는 "같은 상태 안에서 상수"로 판정하는데, 그 **상태가 무엇인지는 기능이 안다.**
   *
   * `null`을 돌려주면 **그 표본을 판정에서 뺀다.** 지금 그리는 것이 논리 상태와 어긋나는
   * 중이라는 뜻이다(예: 하늘 크로스페이드). 뺀 개수는 리포트에 적힌다.
   */
  drawGroupKey?(): string | null;

  /**
   * `drawGroupKey()` 가 `null` 을 낼 때, **이 기능을 빼고 다시 재는 URL 질의 조각.**
   * 예: `'npc=0&vrm=0'`(`?` 는 붙이지 않는다 — 여러 기능 것을 `&` 로 잇는다).
   *
   * ── 왜 리포트가 아니라 여기가 소유하는가 ────────────────────────────────
   * 처음엔 리포트 쪽에 `기능이름 → 노브` 매핑을 뒀는데, 그 자리에서 `npc` 를 `npc=0`
   * 하나로 적었다. **틀린 안내였다** — `npc` 기능은 치비(`?npc=`)와 VRM(`?vrm=`) 두
   * 노브를 읽고 **둘 다 0 일 때만** 꺼진다(`npc.ts` 의 `create`). 감독이 그대로 따라
   * 재면 사람이 남은 채로 또 "측정 안 됨" 이 나온다.
   *
   * 노브를 아는 것은 기능 자신뿐이고, 노브가 바뀌면 이 줄도 같은 파일 안에서 함께
   * 바뀐다. 리포트가 들면 한쪽만 낡는다(값 미러링).
   */
  readonly drawBlockHint?: string;

  /**
   * 부팅 예열에 참여한다 — **평소 숨어 있는 것을 잠시 보이게** 만든다.
   *
   * 예열 프레임은 "지금 씬에 그려지는 것"만 굽는다. 그래서 조건부로만 등장하는 것
   * (날씨 레이어처럼)은 예열을 통과해도 여전히 안 구워진 채 남고, 세션 중 처음 켜지는
   * 순간에 지오·텍스처·파이프라인이 한꺼번에 생긴다. 그게 곧 히칭이다.
   *
   * 무엇이 숨어 있는지는 **기능 자신만 안다.** 조립부가 세면 레이어를 하나 추가할 때마다
   * 조용히 빠진다. 그래서 이 계약이 여기 있다.
   *
   * 반환한 함수가 원상복구다. 되돌릴 것이 없으면 아무것도 반환하지 않아도 된다.
   */
  prewarm?(): (() => void) | void;

  /** 페이지를 떠날 때. 커널 System의 `dispose`와 별개로 UI·리스너를 정리한다 */
  dispose?(): void;
}

/**
 * 기능 선언. `features/index.ts`의 목록에 넣는 것이 곧 "켜는 것"이다.
 *
 * `create`가 `null`을 돌려주면 이번 세션에는 켜지 않는다 — 기능 자신이 판단한다(필요한
 * DOM이 없다, 백엔드가 꺼져 있다, 저사양이다 등). 조립부가 기능별 조건을 알 필요가 없다.
 */
export interface Feature {
  readonly name: string;
  create(env: FeatureEnv): FeatureInstance | null;
}

/** 조립 결과 — 이름을 함께 들고 다닌다(진단 키·오류 보고에 쓴다) */
export interface MountedFeature {
  readonly name: string;
  readonly instance: FeatureInstance;
}

/**
 * 선언 목록을 실제 인스턴스로 조립한다. **순수하지 않다**(기능이 씬을 만진다) — 다만
 * 이 함수 자체에 기능별 분기가 없다는 것이 요점이다.
 *
 * 한 기능이 조립에 실패해도 나머지는 켠다. 하늘이 죽었다고 월드 전체가 안 뜨는 건
 * 과잉이다 — 실패는 `onError`로 보고하고 그 기능만 빠진다.
 */
export function mountFeatures(
  features: readonly Feature[],
  env: FeatureEnv,
  onError?: (name: string, err: unknown) => void,
): MountedFeature[] {
  const out: MountedFeature[] = [];
  for (const f of features) {
    try {
      const instance = f.create(env);
      if (instance) out.push({ name: f.name, instance });
    } catch (err) {
      onError?.(f.name, err);
    }
  }
  return out;
}

/**
 * 켜진 기능들의 드로우콜 그룹 키를 하나로 합친다.
 *
 * 규칙 둘:
 *   · **하나라도 `null`이면 전체가 `null`이다.** 어느 기능이든 "지금 그리는 것이 논리
 *     상태와 어긋난다"고 하면 그 프레임 표본은 못 믿는다.
 *   · 나머지는 `이름=키`를 이름순으로 이어붙인다. 순서를 고정해야 같은 상태가 같은 키를
 *     낸다 — 목록 순서에 의존하면 기능을 재배치하는 것만으로 그룹이 갈라진다.
 *
 * 아무도 키를 제공하지 않으면 `''`(빈 문자열)이다. 그래도 유효한 그룹이라 판정은 돈다.
 *
 * ── ⚠ 누가 막았는지 **이름을 돌려준다** (감독 실기기 2026-08-06) ─────────────
 * 감독 리포트에 `draw - 측정 안 됨(표본 0) — 전 프레임 판정 유예(5019표본 제외)` 가
 * 두 번 찍혔다(#176, 그리고 오늘 또). 표본 5,019개를 다 뽑아 놓고 전부 버린 것이다.
 *
 * **그때 진단이 틀렸다.** 태스크 #176 은 원인을 *"하늘 상태 전이가 안 끝난다"* 로 적었는데
 * 실제로는 `npc`·`glb-city` 가 **조건 없이** `null` 을 낸다(각 파일의 `drawGroupKey: () => null`).
 * 둘 다 기본 켜짐이라 **기본 구성에서는 이 축이 영원히 판정되지 않는다.**
 *
 * 두 기능의 근거 자체는 맞다 — NPC 가 있으면 카메라를 돌리는 것만으로 컬링이 달라져
 * 드로우콜은 **정의상** 상수가 아니다. 틀린 것은 근거가 아니라 **리포트가 그 사실을
 * 말하지 않은 것**이다. "유예됐다" 만 적으면 읽는 사람은 *"곧 재지겠지"* 로 읽고,
 * 실제로는 영원히 안 재진다.
 *
 * 그래서 이름을 돌려준다. 리포트가 `npc·glb-city 가 판정 불가로 표시` 라고 적으면
 * 읽는 즉시 **끄고 다시 재면 된다**는 것을 안다.
 */
export interface DrawBlocker {
  /** 막은 기능 이름 */
  readonly name: string;
  /** 그 기능을 빼는 URL 질의 조각(`?` 없이). 기능이 안 알려주면 없다 */
  readonly hint?: string;
}

export interface DrawGroupKeyResult {
  /** 합쳐진 키. `null` 이면 이 프레임 표본은 판정에서 뺀다. */
  readonly key: string | null;
  /** `null` 을 낸 기능들. 비어 있으면 정상 판정이다. 이름순 정렬. */
  readonly blockedBy: readonly DrawBlocker[];
}

/** 이름까지 필요한 소비자용. 기존 `combineDrawGroupKey` 는 이것의 `key` 만 쓴다. */
export function drawGroupKeyOf(mounted: readonly MountedFeature[]): DrawGroupKeyResult {
  const parts: string[] = [];
  const blockedBy: DrawBlocker[] = [];
  for (const m of mounted) {
    if (!m.instance.drawGroupKey) continue;
    const k = m.instance.drawGroupKey();
    // ⚠ `null` 을 만나도 **즉시 return 하지 않는다.** 먼저 만난 하나만 보고하면
    //   그것을 끈 뒤에야 다음 원인을 알게 되어 감독이 두 번 재야 한다.
    if (k === null) {
      blockedBy.push(m.instance.drawBlockHint
        ? { name: m.name, hint: m.instance.drawBlockHint }
        : { name: m.name });
      continue;
    }
    parts.push(`${m.name}=${k}`);
  }
  parts.sort();
  blockedBy.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { key: blockedBy.length > 0 ? null : parts.join(' '), blockedBy };
}

export function combineDrawGroupKey(mounted: readonly MountedFeature[]): string | null {
  return drawGroupKeyOf(mounted).key;
}

/**
 * 켜진 기능들을 **한꺼번에 예열 자세로** 만든다. 반환 함수가 전체 원상복구다.
 *
 * 여기에도 기능별 분기가 없다 — 무엇을 켤지는 각 기능이 안다. 기능을 목록에서 빼면
 * 예열에서도 저절로 빠진다.
 *
 * 한 기능의 예열이 실패해도 나머지는 켠다. 예열은 최적화이지 정합성이 아니다 — 실패하면
 * 그 기능만 첫 등장 비용을 세션 중에 내고, 부팅은 계속된다. 복구도 같은 이유로 개별
 * 보호한다. 하나가 던져서 나머지가 켜진 채 남으면 **날씨 레이어가 전부 보이는 하늘**이
 * 되는데, 그건 예열을 안 한 것보다 나쁘다.
 */
export function prewarmFeatures(mounted: readonly MountedFeature[]): () => void {
  const undos: (() => void)[] = [];
  for (const m of mounted) {
    if (!m.instance.prewarm) continue;
    try {
      const undo = m.instance.prewarm();
      if (typeof undo === 'function') undos.push(undo);
    } catch { /* 이 기능만 예열에서 빠진다 */ }
  }
  return () => { for (const u of undos) { try { u(); } catch { /* 나머지는 되돌린다 */ } } };
}

/** 켜진 기능들의 진단을 `{ 이름: 값 }`으로 모은다. 진단을 안 내는 기능은 빠진다. */
export function collectDiagnostics(mounted: readonly MountedFeature[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const m of mounted) {
    if (!m.instance.diagnostics) continue;
    try { out[m.name] = m.instance.diagnostics(); } catch { out[m.name] = '(진단 실패)'; }
  }
  return out;
}
