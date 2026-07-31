// world2/systems/sky-moon.ts — **달을 블룸 문턱 위로 올리는 발광체.** world2 전용.
//
// ── 감독 지시 (2026-07-30) ──────────────────────────────────────────────────
// *"달에 블룸효과 넣어줘. 월드2 만이야"*
//
// ── 왜 파일이 따로 있나 ─────────────────────────────────────────────────────
// 달 그림 자체는 `sky.js` 의 하늘 텍스처(캔버스)에 있고, 그 파일은 **라이브 world1 과
// 공유**한다. 거기서 달을 밝히면 미술관 오픈월드의 밤도 함께 바뀐다 — 감독이 "월드2 만"
// 이라고 못 박은 것이 그 지점이다.
//
// 그래서 `systems/sky.ts`(world2 어댑터) 쪽에서 **얹는다.** `liftNightLights()` 가 밤
// 조명 하한을 world2 에만 얹는 것과 정확히 같은 배치이고, 그 어댑터가 존재하는 이유다.
// 파일을 가른 것은 감독 지시(*"파일 관리 잘해놓고"*)이자, 하늘 어댑터가 이미 하는 일이
// 여럿이라 달까지 얹으면 읽는 사람이 무엇이 무엇인지 못 가리기 때문이다.
//
// ── 왜 텍스처를 밝히지 않고 메시를 겹치는가 ─────────────────────────────────
// 하늘 텍스처는 캔버스라 채널당 8비트다 — **1.0 을 넘을 수가 없다.** 블룸은 문턱(0.75)을
// 넘는 픽셀만 번지는데, 넘는 양에 비례해 기여가 정해진다. 달 코어의 휘도는 0.96 이라
// 문턱을 겨우 넘고, 넘은 폭(0.21)이 가로등(1.45−0.75=0.70)의 3할이다. 그래서 블룸이
// 정상적으로 돌고 있어도 **달에서는 거의 아무 일도 안 일어난다.**
//
// 가로등이 문턱을 넘는 방법이 이미 있다 — `emissive` 를 1 너머(HDR)로 올리는 것이다.
// 달도 같은 수단을 쓴다. 캔버스로는 못 하므로 **HDR 색을 가진 작은 판**을 달 자리에
// 겹치고 가산합성한다. 두 백엔드에서 똑같이 도는 수단이다(GLSL 0건).
//
// ── 달이 둘로 보이지 않게 ───────────────────────────────────────────────────
// 이 기능의 유일한 실패 모드다. 판이 그림 속 달에서 밀리면 밝은 얼룩이 하나 더 생긴다.
//
//   ① **위치를 `sky.js` 에서 받는다** — `moonPlacement()` 가 텍스처 좌표에서 유도한다.
//      `getSunDir()` 의 달 방향(고도 0.9 고정)은 **쓰지 않는다.** 그 값은 그림과 3°
//      어긋나 있고(그림은 0.848), 원반 반경이 5° 라 절반 넘게 밀린다. 조명 방향으로는
//      아무도 눈치 못 채는 차이가 여기서는 정확히 치명적이다.
//   ② **하늘 돔의 자식으로 붙인다** — 돔이 플레이어를 따라 움직여도 함께 간다.
//      좌표를 매 프레임 다시 계산하면 그 계산이 돔의 것과 어긋날 수 있고, 어긋나는
//      순간이 곧 달이 둘이 되는 순간이다. 부모-자식은 어긋날 자리가 없다.
//   ③ 가산합성이라 **밀려도 겹친 만큼은 그냥 밝아진다.** 불투명 판이면 어긋난 초승달
//      모양이 생기지만, 더하기는 최악의 경우에도 "달 옆이 밝다" 로 끝난다.
//
// ── 개수 불변식 ─────────────────────────────────────────────────────────────
// 지오 1 · 재질 1 · 텍스처 1 · 드로우콜 1. **전부 부팅 시 고정이고 세션 내내 그대로다.**
//
// 낮에도 `visible` 을 끄지 않고 **색을 0 으로** 내린다. 재워둔 메시는 렌더 목록에 안 올라
// GPU 자원이 아예 안 생기고, 밤이 되는 순간 지오·텍스처·파이프라인이 한꺼번에 올라온다 —
// 그것이 감독 실기기에서 pipeline 31→33 계단으로 나타난 바로 그 현상이다(`systems/sky.ts`
// 주석에 전말이 있다). 가산합성은 색이 0 이면 화면에 아무 영향이 없으므로, 상시 렌더가
// 곧 상시 안전이다. 삼각형 두 개를 매 프레임 그리는 값으로 계단 하나를 없앤다.

import * as THREE from 'three/webgpu';
import { relativeLuminance, moonGlow } from '../decide/night.js';
import { readNum } from '../url-knob.js';

/**
 * 그림 속 달이 어디에 얼마나 크게 그려지는가. **`sky.js` 의 `moonPlacement()` 가 준다.**
 *
 * ── 왜 직접 부르지 않고 받는가 (경계 검사가 물었다) ───────────────────────
 * 처음엔 이 파일이 `../../sky.js` 를 직접 import 했고 `tests/world2-boundary.test.ts`
 * 가 그것을 잡았다. world1 을 지우는 날 갈아 끼울 어댑터가 하나 늘어난다는 뜻이다.
 *
 * 그 검사의 주석이 묻는다 — *"정말 어댑터가 하나 더 필요한가, 아니면 기존 어댑터를
 * 넓히면 되는가."* 후자였다. 하늘 어댑터(`systems/sky.ts`)가 이미 `sky.js` 를 소유하고
 * 있고, 이 파일이 필요한 것은 **좌표 세 값**이지 하늘 엔진이 아니다. 받아 쓰면 여기는
 * world1 을 아예 모르는 순수 부품이 되고, 폐기 작업도 안 커진다.
 */
export interface MoonPlacement {
  /** 달 방향 단위벡터(월드) */
  readonly dir: { readonly x: number; readonly y: number; readonly z: number };
  /** 원반의 각반경(rad) */
  readonly angularRadius: number;
  /** 원반 코어색(0..1) */
  readonly core: { readonly r: number; readonly g: number; readonly b: number };
}

/**
 * 돔 반경에 대한 달의 거리 비율. 1 보다 작아야 돔 **안쪽**에 놓인다.
 *
 * 돔은 `depthWrite:false` · `renderOrder:-1` 이라 깊이로 가리지 않지만, 안쪽에 두는 것이
 * 의미상 옳다(하늘보다 앞에 있는 것). 1 에 너무 붙이면 부동소수 오차로 돔 뒤에 놓일 수
 * 있어 여유를 둔다.
 */
const DIST_RATIO = 0.92;

/**
 * 판의 크기 = 달 각반경의 이 배수.
 *
 * 1 보다 큰 것은 알파 프로파일 때문이다 — 가장자리를 0 으로 부드럽게 떨어뜨리므로,
 * 판을 원반과 같은 크기로 만들면 **밝은 부분이 원반보다 작아진다.** 1.3 이면 알파가
 * 0.9 이상인 영역이 원반의 0.8 배쯤을 덮고, 나머지는 원반 밖으로 나가며 사라진다.
 * 그 바깥은 텍스처 달의 글로우(반경 5.5배)가 이미 차지하고 있어 자연스럽게 섞인다.
 */
const DISC_SCALE = 1.3;

/** 알파 그라디언트 텍스처 한 변(px). 부드러운 원 하나라 이 이상은 의미가 없다 */
const TEX_SIZE = 128;

export interface MoonGlow {
  /**
   * 밤 정도(0..1)를 반영한다. 0 이면 화면에 아무 영향이 없다.
   * 값이 안 바뀌면 아무것도 안 한다 — 매 프레임 불려도 공짜다.
   */
  setNightness(n: number): void;
  diagnostics(): Record<string, unknown>;
  dispose(): void;
}

/**
 * 알파만 있는 원형 페이드 텍스처. RGB 는 흰색이고 **세기는 재질 색이 정한다** —
 * 텍스처에 밝기를 넣으면 8비트에 갇혀 HDR 이 성립하지 않는다.
 */
// 반환 타입은 일부러 적지 않는다. `three/webgpu` 는 `CanvasTexture` 를 타입으로
// 재수출하지 않아(TS2694) 이름으로 적을 방법이 없고, 추론이 정확히 같은 타입을 준다
// (`features/ocean.ts` 가 같은 우회를 쓴다).
function makeDiscTexture(doc: Document) {
  const cv = doc.createElement('canvas');
  cv.width = cv.height = TEX_SIZE;
  const ctx = cv.getContext('2d');
  // 2D 컨텍스트가 없으면 그릴 방법이 없다. 빈 텍스처를 그대로 쓰면 **검은 사각형**이
  // 가산합성으로 아무 영향 없이 지나가므로 화면은 안전하고, 진단이 사실을 말한다.
  if (ctx) {
    const g = ctx.createRadialGradient(TEX_SIZE / 2, TEX_SIZE / 2, 0, TEX_SIZE / 2, TEX_SIZE / 2, TEX_SIZE / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.85, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  }
  const tex = new THREE.CanvasTexture(cv);
  // 알파 마스크라 색공간 변환 대상이 아니다. sRGB 로 두면 알파는 그대로지만 흰 RGB 가
  // 한 번 더 변환을 타 의미 없는 계산이 붙는다.
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/**
 * 달 발광체를 만들어 하늘 돔에 붙인다.
 *
 * @param dome  하늘 돔. 이것의 **자식**이 되므로 돔이 움직이면 함께 움직인다.
 * @param domeRadius 돔 반경(미터). 거리를 여기서 유도한다 — 돔을 키우면 달도 따라간다.
 * @param doc   캔버스를 만들 문서. 없으면 `null` 을 돌려주고 기능이 통째로 빠진다.
 * @param place 그림 속 달의 좌표. 하늘 어댑터가 `sky.js` 에서 받아 넘긴다.
 */
export function createMoonGlow(
  dome: THREE.Object3D,
  domeRadius: number,
  doc: Document | null,
  place: MoonPlacement,
): MoonGlow | null {
  if (!doc) return null;

  const dist = domeRadius * DIST_RATIO;
  // 각반경 → 실제 반경. `tan` 인 것은 달이 시선에 수직인 **판**이기 때문이다(구면 위의
  // 호가 아니다). 각이 작아 `sin` 과 거의 같지만, 같은 값이 되는 것과 같은 이유로
  // 맞는 것은 다른 일이다.
  const radius = dist * Math.tan(place.angularRadius) * DISC_SCALE;

  const tex = makeDiscTexture(doc);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    // 더하기다. 하늘 텍스처의 달을 **덮는 것이 아니라 밝히는 것**이라 이 합성이어야 한다
    // (§달이 둘로 보이지 않게 ③).
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    // 안개를 타면 달이 안개색이 된다. 안개는 60.8m 에서 모든 것을 덮고 달은 478m 밖이다.
    // 하늘 돔도 같은 이유로 `fog:false` 다.
    fog: false,
    // 시작은 꺼진 상태. `setNightness` 가 첫 프레임에 올린다.
    color: new THREE.Color(0, 0, 0),
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  mesh.name = 'world2:moon-glow';
  mesh.position.set(place.dir.x * dist, place.dir.y * dist, place.dir.z * dist);
  // 판이 돔 중심(=관찰자)을 향하게 한다. 돔은 회전하지 않으므로 **한 번 정하면 끝**이다 —
  // 매 프레임 `lookAt` 을 도는 것은 같은 결과를 계속 다시 구하는 일이다.
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(-place.dir.x, -place.dir.y, -place.dir.z),
  );
  // 하늘 돔과 같은 이유로 컬링을 끈다 — 시야에 들고 나며 드로우콜이 흔들리면 그것이
  // 개수 판정의 잡음이 된다. 삼각형 두 개짜리라 컬링으로 아낄 것도 없다.
  mesh.frustumCulled = false;
  dome.add(mesh);

  const coreLum = relativeLuminance(place.core.r, place.core.g, place.core.b);
  /**
   * 발광 배수. 기본값은 `moonGlow()` 가 가로등에서 **유도**하고, `?moonglow=` 로 덮어쓴다.
   *
   * URL 을 여는 이유는 후보정과 같다 — **내가 이 기능을 볼 수 없다.** 블룸은 WebGPU 에서만
   * 켜지고 헤드리스는 WebGL 이라, 실제로 얼마나 번지는지는 감독 기기에서만 나온다. 값을
   * 찾는 일을 코드 수정·배포 왕복으로 하면 한 번에 몇 분씩 걸린다.
   */
  const glow = readNum('moonglow', moonGlow(coreLum), 0, 8);

  let lastN = -1;
  return {
    setNightness(n: number): void {
      const k = Math.max(0, Math.min(1, n));
      if (k === lastN) return;
      lastN = k;
      const g = glow * k;
      mat.color.setRGB(place.core.r * g, place.core.g * g, place.core.b * g);
    },

    diagnostics(): Record<string, unknown> {
      return {
        // 화면 어디에 있는가. 그림 속 달과 어긋나면 여기부터 본다.
        el: +place.angularRadius.toFixed(4),
        dist: +dist.toFixed(1),
        radius: +radius.toFixed(2),
        // 문턱을 넘는가. `postfx` 의 `lampPeak` 과 같은 축이라 나란히 놓고 읽을 수 있다.
        peak: +(coreLum * glow).toFixed(3),
        glow: +glow.toFixed(3),
        nightness: lastN,
      };
    },

    dispose(): void {
      dome.remove(mesh);
      mesh.geometry.dispose();
      tex.dispose();
      mat.dispose();
    },
  };
}
