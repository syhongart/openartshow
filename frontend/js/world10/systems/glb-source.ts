// world10/systems/glb-source.ts — **세계를 파셀이 아니라 GLB 한 덩어리에서 짓는다.**
//
// ── 이 파일이 world8 이 world2 와 갈리는 «유일한 축» 이다 ────────────────────
// world2 는 세계를 **파셀 스트리밍**으로 짓는다(절차적 배치 목록 → 파츠 조립 → 근처만
// 로드). world8 은 그 자리에 **블렌더를 거친 GLB** 를 놓는다. 나머지 — 그림자·치비·
// 하늘(구름·천둥번개)·조이스틱·물·잔디·입력 — 는 **한 줄도 안 고친다**(포크 규율,
// `world-glb/README.md` 의 「무엇을 바꾸는가」).
//
// ⚠ **왜 포크인가**: 앞선 회차에 world2 의 기능을 임의 GLB 페이지로 **부분 이식**하려
// 했고 다섯 축에서 다섯 번 막혔다. 이식은 원리상 **원본과 다른 물건**을 만든다 —
// 감독이 *"월드 2와 월드8 다르잖아"* 로 지적한 것이 정확히 그 차이다. 표와 경위는
// `world-glb/README.md` 한 곳이다.
//
// ── 무엇을 하는가 ───────────────────────────────────────────────────────────
// ① 고정 자산 GLB 를 받아 파싱한다(`<body data-glb>` 가 가리킨다)
// ② **반복 메시를 `InstancedMesh` 로 되묶는다** — glTF 에 인스턴싱 표현이 없어
//    내보내기가 world2 의 인스턴스를 개별 메시로 **펴서** 저장하기 때문이다.
//    되묶는 것이 원래 상태로의 **복원**이다(근거·실측표는 `glb-instance.js` 헤더).
// ③ 그림자 플래그를 켠다 — `?shint>0` 으로 실시간 캐스터를 켠 세션에서만 의미가 있다.
//
// ── 🔴 그림자 — **내가 적었던 근거는 거짓이었다** (검수관 반려 B2, 2026-08-26) ──
// 이 자리에 원래 *"감독의 판정 축 「그림자 구현방식」은 방향성 그림자와 프러스텀 유도이고
// 그쪽은 포크로 그대로 계승된다"* 라고 적혀 있었다. **실측으로 성립하지 않는다:**
//
//   `world2/main.ts:158`  const SHADOW_INTENSITY = readNum('shint', 0, 0, 1);   ← 기본 0
//   `world2/main.ts:763`  dir.castShadow = SHADOW_INTENSITY > 0                  ← 꺼져 있다
//   `world2/main.ts:145`  감독 판정 2026-08-11 *"그림자 없앤 버전 그게 제일 낫다"*
//                         → **실시간 캐스터 축 자체를 폐지**했다
//
// 즉 내가 「계승된다」고 적은 경로는 **애초에 켜져 있지 않다.** 결론(화면에 그림자가
// 보인다)은 맞았고 근거가 틀렸다 — 이 저장소가 이름 붙인 *"참인 문장에서 성립하지 않는
// 결론을 뽑는 것"* 의 형태다.
//
// **화면에 그림자가 보이는 진짜 이유**: GLB 안에 world2 의 **접촉그림자 데칼이 이미
// 구워져 들어 있다** — 실측 8,625개(전체 28,707 메시의 30%; `shadow:lamp#0` 3,182 ·
// `shadow:tree#0` 2,540 · `shadow:building#0` 2,053 …). 감독이 2026-08-11 에 고른 것이
// 바로 이것이고(`world2/decide/shadow-decal.ts:3-11`), 그 화면이 그대로 온 것이다.
//
// ── ⚠ 그래서 **이 세계의 그림자는 시간대에 반응하지 않는다** ────────────────
// world2 는 `decide/shadow-decal.ts:446` 의 `densityFor(time, base)` 로 시간대마다 농도를
// 바꾸고 「그림자 굽기」 버튼으로 다시 굽는다. world8 에는 `ShadowDecalSystem` **인스턴스가
// 없다** — 그것은 파츠 슬롯(`slotPool`)에 자세를 워프해 굽는 물건이고 GLB 에는 슬롯이
// 없기 때문이다. 실측: 밤으로 돌리면 하늘은 반응하지만(`exposure 1→1.4`,
// `groundLift 1→2.4`) 그림자는 **내보낸 시점 농도 그대로**다.
//
// ⚠⚠ **「반응하지 않는다」는 «구워진 농도(alpha)» 에 대해 참이다**(검수관 권고, 재확인
// 회차). 데칼은 평범한 메시라 **화면상 밝기는 노출·조명 변화를 그대로 따라간다** —
// 밤에 `exposure 1→1.4` 가 걸리면 그림자도 함께 밝아진다. 이 구분을 안 적으면 다음
// 사람이 「밤에도 픽셀이 동일」로 읽고, 실제 화면과 달라 원인을 엉뚱한 데서 찾는다.
//
// ⚠⚠⚠ **`describeGlb().shadowDecals` 는 이 무반응의 «증명이 아니다».** 그 값은 부팅
// 시 1회 산출되는 상수라 어떤 시간대에도 변할 수 없고, 「안 변한다」를 관측해도 정보량이
// 0 이다. 증명은 **구조**에서 온다: `densityFor(time, base)` 의 소비자는
// `systems/shadow-decal.ts:192`(`ShadowDecalSystem` 내부) **하나뿐**이고 그 클래스는
// 이 트리에서 **생성되지 않는다**(import 0 · 인스턴스화 0). 부를 주체가 없다.
//
// **팀장 판정 2026-08-26 — (A) 감수. 조건 2 의 경계는 열지 않는다.** 근거 셋:
//   ① world7·world8 의 존재 이유가 「GLB 를 **있는 그대로** 건다」이다. 데칼을 되살리려면
//      「GLB 메시 → 가상 파츠 슬롯」 변환기가 필요한데, 그것은 world2 「편집본 불러오기」의
//      *다시 세우기* 로 되돌아가는 것이라 **이 페이지를 만든 이유를 스스로 부정한다.**
//   ② 감독이 고른 것은 데칼(정적 화면)이고 **시간대 반응 그림자는 감독 요구였던 적이 없다.**
//      감독이 문제라고 하지 않은 것에 새 축을 열지 않는다.
//   ③ 시간대별로 GLB 를 여러 벌 굽는 대안은 자산 4배(≈21MB 추정)와 전환 멈춤을 새로 만든다.
//
// **재론 조건: 감독이 world8 밤 화면의 그림자를 문제로 발화하는 회차.** 그때 (B)·(C)의
// diff 실물·비용 추정은 백로그 `G-W8H` 에 보존해 두었다 — 같은 추정을 다시 하지 않는다.
//
// ── 🔴 **재론이 일어났다 — 그러나 축이 갈렸다** (2026-08-27) ─────────────────
// 감독: *"그림자 처리가 다른데? 8은 실시간 그림자라서 무거운것 같은데. 팀장. 똑같이해."*
//
// **팀장이 자기 재론 조건 해석을 정정했다**: 위 조건 문언은 *"**밤** 화면의 그림자"*
// 인데 감독 발화에 「밤」이 없었다. 즉 축 B(시간대 무반응)는 **아직 발화되지 않았고**,
// 첫 판정에서 *"조건이 문언 그대로 발동했다"* 고 한 것은 **과독**이었다. 감독이 문제라
// 하지 않은 것에 새 축을 열지 않는다 — 이 저장소의 「0번 실수」 형태다.
//
// 감독 발화의 두 요소는 **전부 다른 축으로 설명됐다**:
//   「무겁다」      → 격자 셀 분할이 그림자에도 걸려 벌수가 8 × 셀수 로 곱해진 것
//   「처리가 다른데」 → 같은 축. 방식(AO 블롭)은 world2 와 **이미 같다**
//
// **팀장 재판정 — (E) 채택**: 그림자를 격자 셀 분할에서 뺀다. 집행 지점·근거·한계·
// 폐기된 제4안의 경위는 `glb-instance.js` 의 `SHADOW_MAT_PREFIX` 주석 한 곳이다.
// **축 B(시간대 무반응)는 보류**다 — 감독 카드 판정에서 그 선택지를 고르면 재개한다.
// 그때 쓸 (B)·(C)·제3안 표는 `G-W8H` 에 그대로 있다.
//
// ⚠ **아래 「시간대에 반응하지 않는다」는 (E) 이후에도 그대로 참이다.** (E)가 고친 것은
// 렌더 벌수 구조이고 농도 동결은 손대지 않았다. 두 축을 섞어 읽지 마라.

import * as THREE from 'three/webgpu';
import type { Object3D, Scene } from 'three/webgpu';
import { instanceRepeats, isShadowMaterial } from './glb-instance.js';
import { applyNormalKnob } from './glb-normal.js';
import type { NormalKnob } from '../decide/glb-normal.js';
export { normalKnob, NORMAL_KNOB_MAX } from '../decide/glb-normal.js';
import { SHADOW_LIFT } from '../decide/shadow-decal.js';
import { fixBoxDecalScale, rebakeShadowAtlas, applyAtlas } from './glb-shadow-fix.js';
import { eachPlacement } from './glb-placement.js';
import { isRoomLightNode, ROOM_LIGHT_COLOR, roomLightIntensity } from '../decide/glb-nodes.js';
import { readRawOpt } from '../url-knob.js';

export interface GlbSourceResult {
  /** 씬에 얹힌 루트(인스턴싱 **후**) */
  root: Object3D;
  /** 충돌·지면이 볼 트리(인스턴싱 **전**) — 아래 경고 참조 */
  collisionRoot: Object3D;
  /** 되묶기 전 메시 수 */
  meshes: number;
  /** 되묶기 전 삼각형 수 */
  triangles: number;
  /** 만든 `InstancedMesh` 벌수 */
  made: number;
  /** 실제로 쓴 격자 분할 수(한 변). `?grid=` 로 바뀔 수 있어 되돌려 준다 */
  grid: number;
  /**
   * GLB 에 **구워져 들어온 접촉그림자 데칼** 수(재질 이름이 `shadow:` 로 시작하는 메시).
   *
   * ⚠ **이 값이 「그림자가 있는가」의 유일한 검출력 있는 축이다**(검수관 반려 B3).
   * `stats().shadow` 는 `sun.shadow.camera.*` **설정값**이라 두 트리가 같은 상수에서
   * 유도하는 한 **다를 수가 없다** — 그림자 시스템을 통째로 들어내도 `76.8 / 2048` 이
   * 그대로 나온다. 그 값을 동일성 근거로 쓴 것이 이 회차의 반려 사유였다.
   */
  shadowDecals: number;
  /**
   * 지면에서 띄운 데칼 수. **`shadowDecals` 와 같아야 한다** — 다르면 일부가 lift 를
   * 못 받았다는 뜻이고, `0` 이면 판정이 한 번도 안 돌았다는 뜻이다(둘은 다른 사고다).
   */
  liftedDecals: number;
  /** `box` 캐스터 데칼 중 축별 크기를 복원한 수 — 0 이면 판정이 안 돌았다 */
  boxFixed: number;
  /** 치수를 못 구해 건너뛴 수. world7 임의 GLB 에서 클 수 있다(정상) */
  boxSkipped: number;
  /** 종류별 실루엣 아틀라스를 물린 재질 수 — 0 이면 원형 그대로다 */
  atlasPainted: number;
  /**
   * 세계의 크기(m). **「떴다」와 「보인다」를 가르는 축이다** — 로드는 성공했는데
   * 화면이 비는 형태가 이 저장소에서 반복됐고, 그때마다 「어디에 얼마나 큰 것이
   * 놓였는가」를 아무도 안 재고 있었다.
   */
  box: { min: [number, number, number]; max: [number, number, number] };
}

/**
 * GLB 를 받아 씬에 세계로 얹는다.
 *
 * ⚠ **충돌·지면은 인스턴싱 «전» 트리를 본다**(검수관 반려 B2, 2026-08-26).
 * `InstancedMesh.raycast` 는 바운딩 구로 한 번 거른 뒤 `count` **전부**를 순회한다
 * (three `three.core.js:15046-15077`). 7,229번 반복되는 종류 하나가 근처에 걸리면
 * 그 한 번의 레이캐스트가 7,229개 인스턴스를 돈다 — 실측 0.011ms → **9.945ms**(937배).
 * 그것은 JS 라 백엔드와 무관하게 **실기기에서도 그대로** 난다.
 *
 * 원본 트리는 씬에 **안 들어간다**(그리지 않는다). 레이캐스트 대상으로만 산다 —
 * 지오메트리는 인스턴스가 참조하므로 메모리도 두 벌이 아니다.
 */
export function mountGlbWorld(
  scene: Scene,
  gltfScene: Object3D,
  opts: { castShadow: boolean; grid?: number; normalKnob?: NormalKnob },
): GlbSourceResult {
  // 노말맵 강도 노브(`?nrm=`) — 되묶기 «전» 원본 재질에 한 번(인스턴스가 같은 재질 객체를 공유한다). 판정은
  // decide, 집행은 systems/glb-normal.ts — 통합 검사가 three 재질 실물로 돈다(붙은 것과 소비되는 것은 다른 일).
  if (opts.normalKnob) applyNormalKnob(gltfScene, opts.normalKnob);
  // ── 되묶기 «전» 에 센다 ────────────────────────────────────────────────────
  // ⚠ 되묶은 뒤 세면 **357배 축소된 수**가 나온다(검수관 반려 B3): `InstancedMesh` 는
  // 트리에서 노드 하나이고 `geometry` 도 한 벌이라, 28,705 메시가 40 으로, 삼각형이
  // 1,358,918 → 3,808 로 보인다. 화면에 그것을 적으면 **거짓을 적는 것**이다.
  let meshes = 0;
  let triangles = 0;
  let shadowDecals = 0;
  /** 지면에서 띄운 데칼 수 — 0 이면 lift 가 한 번도 안 걸렸다는 뜻이다(진단) */
  let liftedDecals = 0;
  /** `box` 캐스터 데칼 중 축별 크기를 복원한 수. 0 이면 판정이 한 번도 안 돌았다 */
  let boxFixed = 0;
  /** 치수를 못 구해 건너뛴 수 — world7 임의 GLB 에서는 이 값이 클 수 있다(정상) */
  let boxSkipped = 0;
  /** 종류별 실루엣 아틀라스를 물린 재질 수. 0 이면 아틀라스가 원형 그대로다 */
  let atlasPainted = 0;
  gltfScene.traverse((o: Object3D) => {
    const m = o as {
      isMesh?: boolean; material?: { name?: string } | { name?: string }[];
      geometry?: { index?: { count: number } | null; attributes?: { position?: { count: number } } };
      isInstancedMesh?: boolean; count?: number;
    };
    if (!m.isMesh || !m.geometry) return;
    // ── 🔴 **입력이 이미 인스턴스면 그 수만큼 센다** (2026-08-28) ──────────────
    // `InstancedMesh` 는 트리에서 노드 하나라 그냥 세면 **28,707 배치가 40 으로**,
    // 삼각형이 1,358,918 → 3,808 로 보인다. 그 수치가 화면과 보고서에 나가면
    // **거짓을 적는 것**이다 — 실제로 나갔다(실행자가 *"렌더링 복잡도 현저히
    // 낮아짐"* 으로, 부팀장이 *"그림자 보정이 안 걸림"* 으로 읽었고 **둘 다 틀렸다**,
    // 실제는 세계가 사라진 것이었다). 아래 `describeGlb` 주석이 되묶기 «뒤» 를 두고
    // 같은 경고를 하는데, **들어올 때부터 접혀 있는 경우**가 빠져 있었다.
    const n = m.isInstancedMesh ? (m.count ?? 0) : 1;
    meshes += n;
    // 재질 이름이 원산지다 — world2 의 `parts/shadow.ts` 가 `shadow:<kind>` 로 짓는다.
    // ⚠ 접두 문자열을 여기에 다시 적지 않는다 — 판정 SSOT 는 `glb-instance.js` 의
    // `isShadowMaterial` 한 곳이다(그 파일이 격자 제외에도 같은 판정을 쓴다). 두 곳에
    // 적으면 한쪽만 고쳐도 아무도 모른다 — 이 저장소의 «값 미러링» 사고 형태다.
    for (const one of Array.isArray(m.material) ? m.material : [m.material]) {
      if (isShadowMaterial(one)) { shadowDecals += n; break; }
    }
    const idx = m.geometry.index;
    const pos = m.geometry.attributes?.position;
    triangles += Math.floor((idx ? idx.count : (pos?.count ?? 0)) / 3) * n;
  });

  // ── 🔴 **AO 데칼을 지면에서 띄운다** (감독 신고 2026-08-27 «울긋불긋») ──────
  // world2 는 접촉그림자 AO 평면을 «캐스터 발밑 + `SHADOW_LIFT`» 에 놓는다. **그 lift 가
  // GLB 에는 없다** — 실측: 데칼 노드의 월드 y 고유값이 `0.00 / 0.07 / 0.14` 셋뿐이고
  // 지오메트리 정점도 `y ∈ [-0.0000, 0.0000]` 인 평면이다. 그런데 지면(`ground#*`)은
  // 정점 `y ∈ [-1.0000, 0.0000]` 이라 **윗면이 정확히 월드 y = 0** 이다 — 즉 데칼 다수가
  // 지면과 **같은 평면**에 놓인다.
  //
  // `depthWrite:false` 는 깊이 **쓰기**만 끄고 **테스트**는 그대로라, 같은 깊이에서는
  // 픽셀마다 어느 쪽이 이길지 갈린다. 감독이 실기기에서 본 «그림자 모양은 같은데
  // 울긋불긋하다» 가 그것이고, 헤드리스에서 그림자가 **아예 안 보이던 것**도 같은 원인일
  // 수 있다(지면에 먹힌다).
  //
  // ⚠ **왜 lift 가 사라졌는지는 아직 모른다.** `extract-world2-glb.mjs`·`blender-edit.py`
  // 어디에도 명시적 반올림이 없다. 지금은 **런타임에서 world2 와 같은 값으로 되돌린다.**
  // 원인 추적은 백로그 `G-W8Q`.
  //
  // 🔴 **이 자리에 «자산을 다시 굽는 것이 근본 처방» 이라고 적었고 그것은 거짓이 됐다**
  // (2026-08-28 실측, 팀장 조건 4). `extract-world2-glb.mjs` 를 지금 코드로 다시 돌려
  // 블렌더 **전** GLB 를 뽑아 현재 자산과 대조했더니 bench 스케일(1.000·1종) · tree
  // 스케일(1132종) · 데칼 y · 아틀라스가 **전부 동일**했다 — **블렌더는 무죄이고 재굽기로는
  // 안 고쳐진다.** 원인은 내보내기가 데칼의 런타임 상태를 안 담는 것이고, 근본 처방은
  // **내보내기를 고치는 것**이다(백로그 `G-W8Q` 의 재론 조건).
  //
  // ⚠⚠ **되묶기 «전» 에 해야 한다** — `instanceRepeats` 가 월드 행렬을 인스턴스에 굽는다.
  // ⚠⚠⚠ **인스턴스 입력에서도 «하나씩» 올린다**(2026-08-28). 노드를 올리면 그 묶음이
  // 통째로 올라가므로 결과는 우연히 맞을 수 있지만 **카운트가 노드 수가 된다** — 실측:
  // 8,625개가 「8」로 세어졌고, 그 수치가 체크리스트 화면과 보고서에 그대로 나갔다.
  // 진단이 거짓이면 다음 사람이 「보정이 안 걸렸다」로 읽는다(실제로 내가 그렇게 읽었다).
  {
    let lifted = 0;
    eachPlacement(gltfScene as never, THREE as never, (p) => {
      if (!isShadowMaterial(p.material)) return;
      p.liftY(SHADOW_LIFT);
      p.commit();
      lifted++;
    });
    liftedDecals = lifted;
  }

  // ── 🔴 **크기·실루엣도 복원한다** (감독 신고 «형태가 8이 동그랗네», 팀장 판정 (가)) ──
  // 유실이 셋이고 위 lift 는 그중 하나다. 나머지 둘 — `box` 캐스터의 축별 크기와 종류별
  // 실루엣 — 은 `systems/glb-shadow-fix.ts` 가 복원한다(경계·근거는 그 파일 헤더 한 곳).
  // ⚠ 크기는 **되묶기 «전»** 이어야 한다(위 lift 와 같은 이유). 아틀라스는 재질 교체라
  // 순서를 안 타지만 함께 둔다 — 둘이 한 사안이고 나뉘면 다음 사람이 순서를 다시 따진다.
  {
    const r = fixBoxDecalScale(gltfScene as unknown as Object3D, THREE as never);
    boxFixed = r.fixed;
    boxSkipped = r.skipped;
    const atlas = rebakeShadowAtlas(THREE as unknown as never);
    atlasPainted = atlas ? applyAtlas(gltfScene as unknown as Object3D, atlas.texture) : 0;
  }

  // 그림자 플래그 — **되묶기 전에** 켠다. `instanceRepeats` 가 재질·지오를 그대로
  // 넘기지만 플래그는 노드 속성이라, 인스턴스 쪽에도 옮겨 준다(아래).
  if (opts.castShadow) {
    gltfScene.traverse((o: Object3D) => {
      const m = o as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
    });
  }

  // 방 라이트 노드에서 포인트라이트 생성 — 원본 트리에서 위치를 먼저 읽는다
  const roomLights: Array<{ position: THREE.Vector3 }> = [];
  gltfScene.traverse((o: Object3D) => {
    if (isRoomLightNode(o.name)) {
      const pos = new THREE.Vector3();
      o.getWorldPosition(pos);
      roomLights.push({ position: pos });
    }
  });

  const { group, made, grid } = instanceRepeats(gltfScene as unknown as never, opts.grid) as {
    group: Object3D; made: number; grid: number;
  };

  if (opts.castShadow) {
    group.traverse((o: Object3D) => {
      const m = o as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
    });
  }

  group.name = 'glb-world:glb-source';

  // 라이트 노드별로 포인트라이트 생성 및 추가. 색·강도는 판정이라 `decide/glb-nodes.ts` 한 곳에
  // 있다 — 여기에 값을 다시 적지 않는다(강도는 아직 스윕 전 임시 기본값이다, 그 주석 참조).
  //
  // ── ⚠ 왜 노브를 **이 파일에서** 읽는가 (`main.ts` 를 안 거치는 예외) ──────────────
  // 이 트리의 노브는 대개 `main.ts` 가 읽어 옵션으로 내려준다(`?nrm=` 이 바로 위
  // `opts.normalKnob` 이다) — 단 «전부» 는 아니다: `systems/horizon.ts` 가 module-level 에서
  // `readNumOpt` 로 직접 읽는 선례가 이미 있다(검수관 P1 정정, 2026-09-06). `?pli=` 가 여기서 읽는 이유는 **`world-glb/main.ts` 가 동결 파일**이기
  // 때문이다 — 앞선 회차에 바로 이 노브를 그 파일에 넣어 baseline(1250줄)을 올리고 게이트를
  // 우회한 사고가 났다(BOARD 2026-09-06 «🔴 조명 executor 사고»). 옵션으로 내리면 그 파일이
  // 다시 커진다. 그래서 «세계를 짓는 자리» 인 여기서 직접 읽는다(main.ts **+0**).
  //
  // 읽기 자체는 `url-knob.ts` 를 거친다 — URL 을 여는 지점은 그 파일 한 곳이라는 규율은
  // 그대로다. 유효값 판정(폴백·음수·상한)은 `decide` 가 통째로 갖는다: 이 줄에는 키
  // 문자열밖에 없고 **숫자가 하나도 없다**(범위를 여기 적으면 값 미러링이다).
  //
  // **경계**: 이 예외는 «동결 파일이 배선 경로에 있는 노브» 에만 성립한다. 동결이 풀리거나
  // 노브가 `main.ts` 의 다른 값과 엮이면 옵션 배선으로 되돌린다 — 여기가 노브 창고가 되면
  // 그때부터 `mountGlbWorld` 의 입력이 인자 목록에 안 보이게 된다.
  const intensity = roomLightIntensity(readRawOpt('pli'));
  for (const light of roomLights) {
    const pointLight = new THREE.PointLight(ROOM_LIGHT_COLOR, intensity);
    pointLight.position.copy(light.position);
    group.add(pointLight);
  }

  (scene as unknown as { add(o: Object3D): void }).add(group);

  const b = new THREE.Box3().setFromObject(group as never);
  const r1 = (v: number) => +v.toFixed(1);
  return {
    root: group, collisionRoot: gltfScene, meshes, triangles, made, grid, shadowDecals, liftedDecals,
    boxFixed, boxSkipped, atlasPainted,
    box: {
      min: [r1(b.min.x), r1(b.min.y), r1(b.min.z)],
      max: [r1(b.max.x), r1(b.max.y), r1(b.max.z)],
    },
  };
}

/**
 * 리포트용 요약. **수는 되묶기 «전» 값이다.**
 *
 * ⚠ `InstancedMesh` 로 묶은 뒤 세면 28,707 메시가 457 로, 삼각형도 수천으로 보인다
 * (357배 축소를 실측한 회차가 있다). 화면·리포트에 그것을 적으면 **거짓을 적는 것**이다
 * (검수관 반려 B3). 그래서 `mountGlbWorld` 가 묶기 전에 세어 들고 있고 여기서는 그 값을
 * 그대로 낸다 — 세는 자리와 적는 자리를 갈라 두면 한쪽만 고쳐지는 일이 생긴다.
 */
export function describeGlb(src: GlbSourceResult | null): {
  meshes: number; triangles: number; instanced: number;
  shadowDecals: number; liftedDecals: number;
  boxFixed: number; boxSkipped: number; atlasPainted: number;
  box: GlbSourceResult['box'];
} | null {
  if (!src) return null;
  return {
    meshes: src.meshes, triangles: src.triangles, instanced: src.made,
    shadowDecals: src.shadowDecals, liftedDecals: src.liftedDecals,
    boxFixed: src.boxFixed, boxSkipped: src.boxSkipped, atlasPainted: src.atlasPainted,
    box: src.box,
  };
}
