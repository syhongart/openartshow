// VRM 아바타 — 감독이 보낸 `male_avatar.vrm` 을 거리에 세운다.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"치비와 오늘 내가 vrm파일 보내준것 같이 돌게 해보자."*
//
// ── 이 파일이 `@pixiv/three-vrm` 을 쓰지 않는 이유 ──────────────────────────
// 파일을 열어 보고 정했다. 확장이 `VRMC_vrm` 하나뿐이고 **재질이 표준
// `pbrMetallicRoughness` 한 개**다 — MToon 이 없다. 그래서 VRM 전용 런타임 없이
// 표준 glTF 로 읽힌다.
//
// 이게 운이 좋은 지점이다. MToon 은 GLSL `ShaderMaterial` 로 구현되는데, CLAUDE.md 가
// *"`three.webgpu` 빌드에 렌더 경로가 아예 없다… 이 사각은 아직 열려 있다"* 고 적어 둔
// 바로 그것이다. 감독 실기기가 WebGPU 라 MToon 이었으면 헤드리스로 검증할 방법조차
// 없었다. 이 파일은 표준 PBR 이라 두 백엔드에서 같은 경로를 탄다.
//
// 라이브러리를 하나 안 들이는 것은 덤이 아니다 — 자기완결 규율(외부 호스트 0)에서
// 의존이 늘면 번들과 CSP 를 함께 검토해야 한다.
//
// ── 걷기는 우리가 만든다 ────────────────────────────────────────────────────
// 이 파일에는 **애니메이션 클립이 0개**다. 대신 humanBones 54개가 VRM 1.0 표준 이름으로
// 매핑돼 있으므로, 필요한 본 몇 개를 이름으로 집어 사인파로 흔든다. 모션 캡처가 아니라
// 걸음의 **신호**만 주는 것이고, 그것으로 충분하다 — 멀리서 보는 행인이다.
//
// ── 왜 한 체만 로드하는가 ───────────────────────────────────────────────────
// 스킨드 메시를 여러 체로 복제하려면 `SkeletonUtils.clone`(three/addons)이 필요한데
// vendor 에 없다. 지금 목적은 감독의 *"얼마나 무거워지는지 보자"* 이므로 한 체로도
// 비용이 드러난다. 여러 체가 필요해지면 그때 조달한다.

import { GLTFLoader } from '../../../vendor/GLTFLoader.js';
import type { WalkAvatar, AvatarCost } from './types.js';

/** 로드 결과 — 비용과 **본 매칭 결과**를 함께 낸다. 후자가 없으면 조용히 실패한다 */
export interface VrmLoadResult {
  avatar: WalkAvatar;
  cost: AvatarCost;
  bones: { found: number; wanted: number };
}

/** 걷기에 쓰는 본. 없으면 그 관절만 안 움직인다 — 로드 실패로 취급하지 않는다 */
export const WALK_BONES = [
  'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg',
  'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm',
  'spine',
] as const;
type BoneName = (typeof WALK_BONES)[number];

/** 걸음 한 걸음의 각속도(rad/s 계수). 속도에 비례해 빨라진다 */
const STRIDE_PER_SPEED = 3.4;
/** 다리 스윙 최대각(rad) */
const LEG_SWING = 0.55;
/** 팔 스윙 최대각(rad) — 다리보다 작아야 자연스럽다 */
const ARM_SWING = 0.35;
/**
 * T-포즈의 팔을 몸통 쪽으로 내리는 각(rad).
 *
 * VRM 1.0 은 T-포즈(또는 A-포즈)로 저작된다. 그대로 두면 양팔을 벌린 채 걸어서
 * 허수아비가 된다. 어깨에서 z 축으로 내리면 A-포즈가 되고, 그 위에 스윙을 얹는다.
 */
const ARM_DROP = 1.25;

interface Bone {
  rotation: { x: number; y: number; z: number };
}

/**
 * VRM 을 읽어 걷는 아바타로 만든다. 실패하면 `null`.
 *
 * `onError` 로 이유를 흘려보낸다 — 조용히 사라지면 "왜 사람이 하나 없지" 를 추적할 수
 * 없다. CSP 로 막히는 경우가 실제로 있다(`connect-src` 에 `blob:` 이 없으면 내장 텍스처
 * 가 통째로 실패한다 — `lab-glb.html` 이 헤드리스 검증으로 발견해 주석에 남겨 뒀다).
 */
export function loadVrmAvatar(
  url: string,
  onError?: (err: unknown) => void,
): Promise<VrmLoadResult | null> {
  return new Promise((resolve) => {
    let loader: InstanceType<typeof GLTFLoader>;
    try {
      loader = new GLTFLoader();
    } catch (err) {
      onError?.(err);
      resolve(null);
      return;
    }
    loader.load(
      url,
      (gltf: { scene: unknown; parser: { json: Record<string, unknown> } }) => {
        try {
          resolve(build(gltf));
        } catch (err) {
          onError?.(err);
          resolve(null);
        }
      },
      undefined,
      (err: unknown) => { onError?.(err); resolve(null); },
    );
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function build(gltf: any): VrmLoadResult {
  const root = gltf.scene;

  // ── 본 찾기 ───────────────────────────────────────────────────────────────
  // `humanBones` 는 **노드 인덱스**를 가리킨다. 그 인덱스로 Object3D 를 직접 집는다.
  //
  // ── 이름으로 찾으면 안 되는 이유 (실패해 본 뒤 고친 것) ────────────────────
  // 처음에는 인덱스 → glTF JSON 의 노드 이름 → 씬에서 이름으로 탐색, 이렇게 우회했다.
  // **전부 빗나갔다.** GLTFLoader 가 노드 이름의 `.`·공백·`:` 을 `_` 로 치환하기
  // 때문이다. 이 파일의 본은 Blender Rigify 출신이라 `DEF-thigh.L`·`DEF-spine.001`
  // 처럼 점이 들어 있어서, 원본 이름으로는 단 하나도 찾지 못했다.
  //
  // 그래서 아바타가 **T-포즈 그대로 미끄러졌다.** 팔 내리기도 걸음 스윙도 본을 못 찾아
  // 통째로 건너뛰어졌는데, 그 실패가 아무 데도 안 남아서 화면을 보기 전까지 몰랐다.
  // 지금은 찾은 개수를 진단에 싣는다 — 조용한 실패가 이 사고의 본질이었다.
  //
  // `parser.associations` 는 GLTFLoader 가 만든 객체마다 원본 glTF 인덱스를 적어 두는
  // 지도다(`associations.get(node).nodes = nodeIndex`). 이름을 거치지 않으므로 저작
  // 도구가 무엇이든, 치환 규칙이 어떻게 바뀌든 영향을 받지 않는다.
  const humanBones = gltf.parser?.json?.extensions?.VRMC_vrm?.humanoid?.humanBones ?? {};
  const byIndex = new Map<number, unknown>();
  const assoc: Map<unknown, { nodes?: number }> | undefined = gltf.parser?.associations;
  if (assoc) {
    for (const [obj, def] of assoc) {
      if (typeof def?.nodes === 'number') byIndex.set(def.nodes, obj);
    }
  }

  const bones = {} as Record<BoneName, Bone | undefined>;
  let bonesFound = 0;
  for (const key of WALK_BONES) {
    const idx = humanBones[key]?.node;
    if (typeof idx !== 'number') continue;
    const obj = byIndex.get(idx);
    if (!obj) continue; // 그 관절만 안 움직인다 — 몇 개를 못 찾았는지는 아래 진단에 남는다
    bones[key] = obj as Bone;
    bonesFound++;
  }

  // ── 비용 세기 ─────────────────────────────────────────────────────────────
  const mats = new Set<string>();
  let meshes = 0, triangles = 0;
  root.traverse((o: any) => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    meshes++;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) mats.add(m.uuid);
    const g = o.geometry;
    if (g) triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    // 그림자는 끈다. 행인 하나를 위해 섀도맵 패스를 늘릴 이유가 없고, 감독 기기 측정에서
    // 그림자는 프레임에 영향이 없다는 것이 이미 확인됐다(계획서 §4 축 격리 실측).
    o.castShadow = false;
    o.receiveShadow = false;
    // 절두체 컬링을 끈다 — 스킨드 메시는 본이 움직이면 바운딩이 어긋나 몸이 통째로
    // 사라지는 일이 생긴다. 한 체뿐이라 컬링으로 아낄 것도 없다.
    o.frustumCulled = false;
  });

  // ── 전방 보정 ─────────────────────────────────────────────────────────────
  // VRM 1.0 은 캐릭터가 **+Z** 를 향하도록 저작된다. 이 세계의 관례는 `yaw=0 → -Z`
  // 다(world1 `world.js:1752` 에서 계승). 그래서 π 를 얹어 둔다 — 안 하면 사람이
  // 뒷걸음질 친다. 회전을 바깥에서 주므로 **안쪽 래퍼**에 넣는다.
  root.rotation.y = Math.PI;
  const group = new (root.constructor as any)();
  group.add(root);

  // A-포즈로 내려 둔다. 매 프레임 다시 쓰지 않고 여기서 한 번만 — 스윙은 이 값에
  // 더하는 것이 아니라 **x 축**에만 얹으므로 서로 간섭하지 않는다.
  if (bones.leftUpperArm) bones.leftUpperArm.rotation.z = ARM_DROP;
  if (bones.rightUpperArm) bones.rightUpperArm.rotation.z = -ARM_DROP;

  let phase = 0;

  const avatar: WalkAvatar = {
    group,
    update(dt, speed) {
      phase += dt * speed * STRIDE_PER_SPEED;
      // 멈추면 스윙도 잦아들게 한다. 속도를 그대로 곱하면 정지 순간 포즈가 굳어
      // 어정쩡한 자세로 서 있게 된다.
      const amp = Math.min(1, speed);
      const s = Math.sin(phase) * amp;
      const c = Math.cos(phase) * amp;

      if (bones.leftUpperLeg) bones.leftUpperLeg.rotation.x = s * LEG_SWING;
      if (bones.rightUpperLeg) bones.rightUpperLeg.rotation.x = -s * LEG_SWING;
      // 무릎은 뒤로만 굽는다 — 앞으로 굽으면 관절이 반대로 꺾인다. 음수 구간만 쓴다.
      if (bones.leftLowerLeg) bones.leftLowerLeg.rotation.x = Math.max(0, -s) * LEG_SWING * 0.9;
      if (bones.rightLowerLeg) bones.rightLowerLeg.rotation.x = Math.max(0, s) * LEG_SWING * 0.9;

      // 팔은 다리와 **반대**로 흔든다. 같은 쪽으로 흔들면 걷는 게 아니라 행진이 된다.
      if (bones.leftUpperArm) bones.leftUpperArm.rotation.x = -s * ARM_SWING;
      if (bones.rightUpperArm) bones.rightUpperArm.rotation.x = s * ARM_SWING;

      // 상체를 걸음 주기의 **두 배**로 살짝 비튼다. 걸을 때 어깨가 좌우로 흔들리는 것이
      // 사람처럼 보이게 하는 신호다.
      if (bones.spine) bones.spine.rotation.y = c * 0.05;
    },
    dispose() {
      root.traverse((o: any) => {
        if (!o.isMesh && !o.isSkinnedMesh) return;
        o.geometry?.dispose?.();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (!m) continue;
          for (const k of ['map', 'normalMap', 'metalnessRoughnessMap', 'roughnessMap', 'emissiveMap']) {
            m[k]?.dispose?.();
          }
          m.dispose?.();
        }
      });
      group.removeFromParent?.();
    },
  };

  return {
    avatar,
    cost: { meshes, materials: mats.size, triangles: Math.round(triangles) },
    // 걷기에 필요한 본을 몇 개 찾았는가. `WALK_BONES.length` 에 못 미치면 그만큼 관절이
    // 굳어 있다는 뜻이다 — 0 이면 T-포즈로 미끄러진다.
    bones: { found: bonesFound, wanted: WALK_BONES.length },
  };
}
