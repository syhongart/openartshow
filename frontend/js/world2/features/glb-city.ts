// world2/features/glb-city.ts — **미술관 GLB 부하 실험.** 실험 전용 기능이다.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"브런치만들어서 테스트로 건물대신 미술관 건물을 올려보자. 얼마나 버벅이나 보고싶다.
//   한개 올리지말고. 50개 올려봐. 미술관 지엘비 파일."*
//
// ── 이 기능은 world2 의 제1원리를 일부러 깬다 ────────────────────────────────
// world2 는 **개수 불변식** 위에 서 있다 — 파츠 종류당 `InstancedMesh` 하나로 재질·지오·
// 드로우콜을 세션 내내 상수로 고정한다. GLB 는 자체 재질·지오를 여럿 들고 오므로 그 틀에
// 접히지 않는다. 그것이 이 실험의 **목적**이다: 접히지 않는 자산을 그대로 세우면 무슨 일이
// 벌어지는지를 수치로 본다.
//
// 그래서 이 파일은 `?glb=N` 이 없으면 **아무것도 하지 않는다**(`create` 가 `null`).
// 기능 규약대로 목록에서 한 줄을 빼면 흔적도 사라진다.
//
// ── 실측 (파일 헤더 파싱, 배치 전) ──────────────────────────────────────────
//   파일 12.9MB · primitives 78 · 재질 17 · 텍스처 22 · 삼각형 162,902
//   바닥 26.3 × 24.1m · 높이 5.8m
//
// primitives 가 곧 드로우콜 후보다. 50채면 **3,900** 이고, world2 세계 전체가 지금 40
// 안팎이며 설계 목표가 80 이다. 고정 미술관이 실증한 상한이 255 였다. 즉 예측은
// "심하게 버벅인다" 이고, 이 실험은 그 예측을 **확인하거나 반증**하러 간다 — 실측이
// 예측과 크게 다르면 내 비용 모델이 틀린 것이고 그건 그것대로 알아야 할 정보다.
//
// ── 복제 방식: 지오·재질을 공유한다 ─────────────────────────────────────────
// `Object3D.clone()` 은 지오메트리와 재질을 **참조로 공유**한다. 그래서 50채를 세워도
// 메모리와 로딩은 1채분이고 **드로우콜만 50배**가 된다. 매번 새로 로드하면 로딩 시간에
// 묻혀 프레임 문제를 못 본다 — 축을 하나만 흔들어야 무엇이 병목인지 갈린다.

import type { Object3D, Scene } from 'three/webgpu';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';
import { readNum, readEnum } from '../url-knob.js';

/** 실험 상한. 이보다 크면 브라우저가 죽는 쪽에 가까워 측정 자체가 안 된다 */
const MAX_COPIES = 200;

/**
 * 미술관 GLB. `lab-glb.html`(behind-flag 실험 페이지)이 쓰던 것과 같은 파일이다.
 *
 * 경로를 `import.meta.env.BASE_URL` 에서 만든다 — GitHub Pages 는 `/openartshow/` 아래
 * 배포되고 로컬은 `/` 라, 한쪽에 맞춰 적으면 다른 쪽에서 404 가 난다.
 */
function modelUrl(): string {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return (base.endsWith('/') ? base.slice(0, -1) : base) + '/app/assets/models/lab-space.glb';
}

interface Counts {
  /** 실제로 씬에 선 채수 */
  placed: number;
  /** GLB 한 채의 드로우콜 후보(= 메시 수) */
  meshesPer: number;
  /** 한 채의 삼각형 */
  trisPer: number;
  /** 로드 상태 — 못 재고 통과시키지 않으려고 명시한다 */
  state: 'loading' | 'ready' | 'failed';
  error?: string;
  /** 눅인 금속 재질 수. 이게 0 이면 건물이 검게 보인다 */
  tamed?: number;
  /** 불투명으로 되돌린 재질 수. 이게 0 이면 WebGPU 에서 벽이 안 보인다 */
  opaque?: number;
  /** 재질을 손댄 수. `raw` 면 0(원본 유지) */
  swapped?: number;
  /** 어느 재질 축인가 — swap · std · noext · raw. **리포트가 이걸 말해야 판정이 성립한다** */
  mat?: string;
  /** 씬에 실제로 놓인 경계 상자. **계산값이 아니라 결과다** */
  box?: string;
  /** 무엇을 세웠나 — glb · box · flat */
  mode?: string;
}

export const glbCityFeature: Feature = {
  name: 'glbCity',

  create(env: FeatureEnv): FeatureInstance | null {
    const want = Math.round(readNum('glb', 0, 0, MAX_COPIES));
    if (want <= 0) return null; // 기본은 꺼짐 — 실험 URL 로만 켠다

    const counts: Counts = { placed: 0, meshesPer: 0, trisPer: 0, state: 'loading' };
    let root: Object3D | null = null;
    let disposed = false;

    // ── 상태를 화면에 띄운다 (감독 판정) ──────────────────────────────────
    // *"건물이 안보이던데. 하나도"* / *"tamed 안보이는데"*
    //
    // 진단은 `window.__world2` 에만 있어서 콘솔을 열어야 보인다. 감독은 폰으로 본다.
    // 50채 로딩이 헤드리스에서 38초였으니 실기기는 더 걸리는데, 그동안 화면에 아무
    // 표시가 없으면 **아직 로딩 중인 것과 실패한 것이 구분되지 않는다.**
    // 실험 기능이므로 배지도 이 파일이 스스로 만들고 스스로 지운다.
    const badge = makeBadge(env.doc);
    badge?.set('미술관 GLB 내려받는 중…');

    // 로더와 three 를 **동적 import** 로 가져온다. `?glb=` 가 없는 세션은 이 코드를
    // 내려받지도 않는다 — 실험이 평상시 번들을 무겁게 만들면 그 자체가 성능 변수가 된다.
    void (async () => {
      try {
        const [{ GLTFLoader }, THREE] = await Promise.all([
          import('three/addons/loaders/GLTFLoader.js'),
          import('three/webgpu'),
        ]);
        if (disposed) return;

        const gltf = await new GLTFLoader().loadAsync(modelUrl());
        if (disposed) return;

        const model = gltf.scene as unknown as Object3D;
        measure(model, counts);
        // ── 모드 (`?glbmode=`) — 추측이 아니라 **이분법으로 좁히는 도구** ────
        // 감독 판정이 네 번 왔고 내 처방이 세 번 빗나갔다(금속·투명·재질교체).
        // 셋 다 헤드리스(WebGL)에서는 효과가 있었는데, **WebGL 에서는 애초에 문제가
        // 없었다** — 헤드리스에서는 처음부터 미술관이 잘 보였다. 나는 문제가 없는
        // 환경에서 세 번 고친 것이다.
        //
        // 그러니 다음 한 발은 처방이 아니라 **측정**이어야 한다. 세 모드를 같은
        // 기기에서 번갈아 보면 원인이 한 번에 좁혀진다:
        //
        //   box  — GLB 를 버리고 같은 자리·같은 크기의 **단순 상자**를 세운다.
        //          이것도 안 보이면 원인은 GLB 가 아니라 배치·씬·렌더 경로다.
        //   flat — GLB 지오는 쓰되 **텍스처 없는 순색** 재질. 보이면 텍스처가 원인.
        //   glb  — 지금 상태(텍스처 포함 교체 재질). 기본값.
        const mode = readEnum('glbmode', 'glb', ['glb', 'box', 'flat'] as const);
        const fixed = tameMetals(model as unknown as MetalWalkable);
        counts.tamed = fixed.metals;
        counts.opaque = fixed.opaque;

        // ── 재질 축 (`?glbmat=`) — 다시 이분법이다 ────────────────────────
        // GLB 파일의 재질을 고쳤는데도(metallic 9개 → 0, BLEND 5개 → OPAQUE) 감독
        // 화면에서 원본 재질이 **여전히 안 보인다**. 그러니 금속·투명은 원인이 아니었다.
        //
        // 남은 후보가 둘인데 **서로 다른 처방을 요구한다.** 한 축으로 뭉뚱그리면 또
        // 헛짚는다:
        //
        //   (a) 확장 **값**   — sheen·clearcoat·specular·anisotropy 가 화면을 먹는다
        //   (b) 재질 **클래스** — 확장이 있으면 GLTFLoader 가 `MeshPhysicalMaterial` 을
        //       쓰는데, `three/webgpu` 의 그 노드 재질 경로 자체가 문제일 수 있다
        //
        // (a)면 값만 0으로 하면 되고 텍스처·노멀맵이 전부 살아난다. (b)면 클래스를
        // 바꿔야 하는데, 그때도 **텍스처를 다 옮기면** 룩 손실이 지금보다 훨씬 적다.
        //
        //   raw   — 원본 그대로. 지금 안 보이는 것
        //   noext — 원본 클래스 유지 + 확장 **값만** 0 → 보이면 (a)
        //   std   — MeshStandardMaterial 로 옮기되 **텍스처 전부 이관** → 보이면 (b)
        //   swap  — 지금 기본. map·color 만 가져오고 나머지는 버린다(룩 손실 최대)
        //
        // 헤드리스는 WebGL 이라 이 사각을 원리적으로 못 본다 — 감독 화면만 가른다.
        // 그래서 처방이 아니라 **노브**를 배포한다.
        const matMode = readNum('glbraw', 0, 0, 1) >= 1
          ? 'raw' // 하위호환 — 이미 드린 링크가 살아 있어야 한다
          : readEnum('glbmat', 'swap', MAT_MODES);
        counts.swapped = applyMatMode(
          model, THREE as unknown as ThreeNS, matMode, mode === 'flat',
        );
        counts.mode = mode;
        counts.mat = matMode;

        // 실험 물건을 한 그룹에 모은다 — 정리할 때 하나만 지우면 된다.
        const g = new THREE.Group();
        g.name = 'world2:glbCity';
        env.scene.add(g);
        root = g as unknown as Object3D;

        // 씬에 먼저 붙이고 채워 넣는다. 그래야 세워지는 과정이 화면에 보인다.
        const unit = mode === 'box' ? makeBox(THREE) as unknown as Object3D : model;
        await placeGrid(unit, root, want, env.cell, (done) => {
          counts.placed = done;
          if (!disposed) badge?.set(`미술관 ${done}/${want} 세우는 중…`);
        });
        if (disposed) return;

        counts.state = 'ready';
        // ── 실제 씬 좌표를 잰다 (감독 판정 4회 후) ──────────────────────
        // 배지의 "최근접 32m" 는 `gridCells` 의 **계산값**이었다. 계산이 맞아도 씬에
        // 실제로 그 자리에 섰는지는 별개다 — 네 번의 "안 보인다" 동안 나는 계산값만
        // 보고 배치는 맞다고 전제했다. **전제를 재본 적이 없다.**
        //
        // three 가 로드·배치한 결과의 실제 경계 상자를 읽는다. 여기서 y 가 지하이거나
        // 크기가 터무니없으면 렌더가 아니라 배치·스케일 문제다.
        try {
          const box = new (THREE as unknown as { Box3: new () => Box3Like }).Box3().setFromObject(root as never);
          if (box.min.x !== Infinity) {
            counts.box = [box.min, box.max]
              .map((v) => `${v.x.toFixed(0)},${v.y.toFixed(1)},${v.z.toFixed(0)}`)
              .join(' ~ ');
          } else {
            counts.box = '비어 있음(메시 0)';
          }
        } catch (e) {
          counts.box = '측정 실패: ' + (e instanceof Error ? e.message : String(e));
        }

        // 최근접 거리를 함께 띄운다. **"안 보인다" 가 배치 문제인지 렌더 문제인지
        // 이 숫자 하나로 갈린다** — 32m 인데 안 보이면 렌더, 200m 면 배치다.
        const near = gridCells(want, env.cell)[0]?.d ?? 0;
        badge?.set(
          // **어느 축으로 보고 있는지를 배지가 말해야 한다.** 감독은 폰으로 보고,
          // 여러 링크를 번갈아 열면 지금 화면이 어느 조합인지 헷갈린다 — 그러면 판정이
          // 엉뚱한 축에 붙는다. 리포트에는 아직 이 값이 안 실리므로 배지가 유일한 표시다.
          `미술관 ${want}채 · ${counts.mode}/${counts.mat}`
          + ` · 최근접 ${near.toFixed(0)}m · 범위 ${counts.box}`,
        );
      } catch (err) {
        // **못 잰 것은 통과가 아니다.** 실패를 조용히 삼키면 진단에 0 이 찍히고 그것이
        // "가볍다" 로 읽힌다. 무엇이 막았는지를 남긴다.
        counts.state = 'failed';
        counts.error = err instanceof Error ? err.message : String(err);
        badge?.set('미술관 GLB 실패: ' + counts.error);
      }
    })();

    return {
      diagnostics: () => ({
        want,
        placed: counts.placed,
        state: counts.state,
        error: counts.error,
        tamed: counts.tamed,
        opaque: counts.opaque,
        swapped: counts.swapped,
        box: counts.box,
        mode: counts.mode,
        meshesPer: counts.meshesPer,
        trisPer: counts.trisPer,
        // 곱해서 함께 보여준다 — 판정에 필요한 것은 1채가 아니라 총량이다.
        meshesTotal: counts.meshesPer * counts.placed,
        trisTotal: counts.trisPer * counts.placed,
      }),

      // 드로우콜 판정에서 **이 표본을 통째로 뺀다.** 이 기능이 켜진 세션은 개수 불변식이
      // 성립하지 않는 세션이고(그게 실험의 요지다), 그 상태로 "불변식 위반" 을 보고하면
      // 리포트가 실험 자체를 결함으로 읽는다.
      drawGroupKey: () => null,

      dispose() {
        disposed = true;
        badge?.remove();
        root?.removeFromParent();
        root = null;
      },
    };
  },
};

/**
 * 금속 재질을 눅인다. **"건물이 하나도 안 보인다" 의 원인이 여기 있었다.**
 *
 * ── 감독 판정 ───────────────────────────────────────────────────────────────
 * *"건물이 안보이던데. 하나도"*
 *
 * 실제로는 그려지고 있었다 — 드로우콜이 14 → 1,563 으로 폭증했다. 다만 **전부 새까맸다.**
 * 이 GLB 는 재질 17개 중 **9개가 `metalness = 1.0`** 인데, 금속 PBR 은 diffuse 가 0 에
 * 수렴하고 반사만 남는다. 반사할 환경(IBL)이 없으면 정의상 검게 렌더된다.
 *
 * ── 같은 결함을 이미 한 번 겪었고, 기록도 있었다 ────────────────────────────
 * `lab-glb.js`(같은 GLB 를 쓰는 실험 페이지)의 주석이 정확히 이렇게 적고 있다 —
 * *"금속류가 environment(IBL) 없이는 반사할 게 없어 완전 검정으로 렌더된다(1차 헤드리스
 * 스크린샷으로 실증)"*. **나는 GLB 파일만 가져오고 그것이 서려면 필요한 조건은 안
 * 가져왔다.** 자산을 옮길 때 옮겨야 하는 것은 파일이 아니라 파일 + 성립 조건이다.
 *
 * ── 왜 환경맵이 아니라 재질인가 ─────────────────────────────────────────────
 * `lab-glb.js` 는 PMREM 환경맵으로 풀었다. 같은 방법을 시도했더니
 * `this._renderer.hasInitialized is not a function` 으로 실패했다 — `three/webgpu` 의
 * PMREMGenerator 는 WebGPU 전용 API 를 요구하는데 헤드리스는 WebGL 폴백이다.
 *
 * 규율이 이 경우를 지시한다: *"백엔드 의존 API 를 쓸 때는 어댑터에 가두거나, 두
 * 백엔드에서 **동일한 수단**을 고른다."* 재질 속성은 백엔드와 무관하다.
 *
 * ── 무엇을 바꾸고 무엇을 안 바꾸는가 ────────────────────────────────────────
 * `metalness` 만 낮춘다. 색·텍스처·거칠기는 그대로다. 금속감은 잃지만 **형태가 보인다** —
 * 이 실험이 답해야 하는 질문("미술관 N 채가 볼 만한가, 얼마나 무거운가")에는 형태가
 * 먼저다. 정식 도입 때는 환경맵을 어댑터에 제대로 넣는 것이 맞다.
 *
 * 재질은 clone 이 **참조 공유**하므로 여기서 한 번 고치면 N 채에 모두 적용된다 —
 * 개수 불변식도 그대로다.
 */
export function tameMetals(model: MetalWalkable): { metals: number; opaque: number } {
  let metals = 0;
  let opaque = 0;
  const seen = new Set<unknown>();
  model.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list as MatLike[]) {
      if (!m || seen.has(m)) continue;
      seen.add(m);

      // ── ① 금속 — 반사할 환경이 없으면 검게 나온다 ──────────────────────
      if (typeof m.metalness === 'number' && m.metalness > METAL_THRESHOLD) {
        m.metalness = METAL_TAMED;
        metals++;
      }

      // ── ② 헛된 투명 — **이것이 "안 보인다" 의 본체였다** ────────────────
      // 이 GLB 는 벽 재질 5개(plaster·Sand-Finish·STUCCO-Sand·ARCH-Ridged)가
      // `alphaMode: BLEND` 인데 **알파는 전부 1.0** 이다. 투명일 이유가 없는데
      // 저작 도구가 그렇게 내보냈다.
      //
      // three 는 BLEND 를 `transparent: true` 로 옮기고, 그러면 깊이 쓰기가 꺼지고
      // 그리는 순서가 정렬에 의존한다. **WebGL 은 관대하게 그려 주지만 WebGPU 는
      // 그렇지 않다** — 헤드리스에서는 보이는데 감독 기기(WebGPU)에서만 안 보였던
      // 것이 이것이다. 지표는 정상이었다(삼각형이 182만까지 잡혔다).
      //
      // 완전 불투명한 것만 되돌린다. 진짜 유리(알파 < 1)는 그대로 둔다.
      if (m.transparent === true && (m.opacity === undefined || m.opacity >= 1)) {
        m.transparent = false;
        m.depthWrite = true;
        opaque++;
      }
    }
  });
  return { metals, opaque };
}

/** 이 값을 넘는 금속만 손댄다. 0.6 짜리(DarkMetal)는 원래 의도된 금속감이라 남긴다 */
const METAL_THRESHOLD = 0.9;
/** 눅인 뒤 값. 0 으로 만들면 금속감이 통째로 사라져 벽이 종이처럼 보인다 */
const METAL_TAMED = 0.15;

interface MatLike {
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
}

/** `tameMetals` 가 요구하는 최소 계약. three 전체를 끌어오지 않으려고 좁게 적는다 */
export interface MetalWalkable {
  traverse(cb: (o: { isMesh?: boolean; material?: unknown }) => void): void;
}

/**
 * 실험 상태 배지. **없어도 되는 것이 아니라, 없으면 판정이 불가능한 것이다.**
 *
 * 감독은 폰에서 본다. `window.__world2` 진단은 콘솔을 열어야 보이므로 없는 것과 같다.
 * 로딩이 수십 초 걸리는데 표시가 없으면 "아직 오는 중" 과 "실패" 가 구분되지 않고,
 * 그 구분이 안 되면 화면 판정 자체가 성립하지 않는다.
 *
 * DOM 이 없는 환경(테스트·헤드리스 일부)에서는 `null` 을 돌려주고 호출부는 `?.` 로
 * 넘긴다 — 배지가 없다고 실험이 안 도는 일은 없어야 한다.
 */
export function makeBadge(doc: Document | null): { set(t: string): void; remove(): void } | null {
  if (!doc?.body) return null;
  const el = doc.createElement('div');
  el.setAttribute('data-glb-city', '');
  // 인라인 스타일을 쓴다. 실험이 CSS 파일을 건드리면 그 자국이 남고, 목록에서 한 줄을
  // 지우는 것으로 사라진다는 규약이 깨진다.
  el.style.cssText = [
        // z-index 7 — 조이스틱(6) 위, 성능 HUD(8) 아래. 50 으로 두었더니 입장
    // 오버레이(10)까지 덮었다. \ 이라 입력은 안 막지만,
    // 실험 표시가 본체 UI 를 가리는 것은 그 자체로 판정을 방해한다.
    'position:fixed', 'left:8px', 'bottom:8px', 'z-index:7',
    'padding:6px 10px', 'border-radius:8px',
    'background:rgba(18,20,24,.82)', 'color:#e8eaee',
    'font:12px/1.4 system-ui,sans-serif', 'pointer-events:none',
    'max-width:70vw', 'white-space:nowrap',
    'overflow:hidden', 'text-overflow:ellipsis',
  ].join(';');
  doc.body.appendChild(el);
  return {
    set(t) { el.textContent = t; },
    remove() { el.remove(); },
  };
}

/**
 * GLB 재질을 **단순 재질로 갈아끼운다.** 텍스처와 색은 가져오고 확장은 전부 버린다.
 *
 * ── 왜 필요한가 (감독 판정 3회) ────────────────────────────────────────────
 * *"건물이 안보이던데. 하나도"* → 금속을 눅였다 → 여전히 안 보임 → 헛된 투명을
 * 되돌렸다 → **여전히 안 보임.**
 *
 * 두 처방 모두 헤드리스(WebGL)에서는 효과가 있었고 감독 기기(WebGPU)에서는 없었다.
 * 남은 차이는 **재질 확장**이다. 이 GLB 는 다섯을 쓴다 —
 * `KHR_materials_sheen` · `clearcoat` · `specular` · `anisotropy` · `ior`.
 * `three/webgpu` 가 이들을 노드 재질로 옮기다 실패하면 재질이 통째로 안 그려진다.
 * WebGL 경로에는 없는 실패 모드라 헤드리스로는 원리적으로 재현되지 않는다.
 *
 * ── 추측을 처방으로 바꾸지 않기 위해 ───────────────────────────────────────
 * 이것도 아직 가설이다. 그래서 **끄는 노브**(`?glbraw=1`)를 함께 연다. 교체본과 원본을
 * 같은 기기에서 번갈아 보면 확장이 원인인지 **한 번에 갈린다** — 내가 헤드리스로는
 * 영영 못 가르는 것을 감독 화면이 가른다.
 *
 * 재질은 **원본 하나당 하나씩만** 만들어 캐시한다. GLB 는 78개 메시가 17개 재질을
 * 공유하므로, 메시마다 새로 만들면 재질이 78개로 불어나 개수 불변식이 깨진다.
 */
function swapMaterials(model: Object3D, THREE: ThreeNS, flat = false, keepMaps = false): number {
  const cache = new Map<unknown, unknown>();
  let n = 0;
  model.traverse((o: Object3D & { isMesh?: boolean; material?: unknown }) => {
    if (!o.isMesh || !o.material) return;
    const one = (src: SrcMat): unknown => {
      const hit = cache.get(src);
      if (hit) return hit;
      const made = new THREE.MeshStandardMaterial({
        // `flat` 이면 텍스처를 뗀다 — 텍스처가 원인인지 가르는 축이다.
        map: flat ? null : (src?.map ?? null),
        color: src?.color ?? 0xffffff,
        // 원본 거칠기는 살리되 금속은 낮게 고정한다 — 환경맵이 없는 씬이라 높은
        // 금속은 어느 백엔드에서든 검게 나온다.
        roughness: typeof src?.roughness === 'number' ? src.roughness : 0.8,
        metalness: 0.05,
      }) as Record<string, unknown>;
      // ── `keepMaps` — 클래스만 바꾸고 **나머지는 다 가져온다** ──────────────
      // 지금 기본(`swap`)은 map·color 만 옮기고 노멀맵·AO·emissive 를 통째로 버린다.
      // 그게 감독이 본 "원본 룩이 아닌 화면"의 정체다. 클래스가 원인이라면 클래스만
      // 바꾸면 되지, 텍스처까지 버릴 이유가 없다.
      if (keepMaps && !flat) {
        for (const k of CARRY_MAPS) {
          const v = (src as Record<string, unknown>)?.[k];
          if (v !== undefined && v !== null) made[k] = v;
        }
      }
      cache.set(src, made);
      n++;
      return made;
    };
    o.material = Array.isArray(o.material)
      ? (o.material as SrcMat[]).map(one)
      : one(o.material as SrcMat);
  });
  return n;
}

/**
 * 클래스를 바꿔도 따라가야 하는 것들. **`MeshStandardMaterial` 이 이해하는 것만** 적는다 —
 * 확장 전용 속성(sheen·clearcoat 등)은 여기 없다. 그게 이 모드의 정의다.
 */
export const CARRY_MAPS = [
  'normalMap', 'normalScale', 'aoMap', 'aoMapIntensity',
  'emissive', 'emissiveMap', 'emissiveIntensity',
  'roughnessMap', 'metalnessMap', 'alphaMap', 'lightMap', 'lightMapIntensity',
  'side', 'flatShading', 'vertexColors',
] as const;

/** 확장이 만드는 속성. `noext` 는 이 값들만 **끄고** 재질 클래스는 그대로 둔다. */
export const EXT_OFF: Record<string, number> = {
  sheen: 0, sheenRoughness: 0,
  clearcoat: 0, clearcoatRoughness: 0,
  specularIntensity: 1, // 1 이 "확장 없음"과 같은 상태다(0 은 반사를 아예 죽인다)
  anisotropy: 0,
  iridescence: 0,
  transmission: 0,
  ior: 1.5, // glTF 기본값
};

export const MAT_MODES = ['swap', 'std', 'noext', 'raw'] as const;
export type MatMode = (typeof MAT_MODES)[number];

/**
 * 재질 축을 적용한다. **네 모드가 서로 다른 가설을 검증한다** — 위 `?glbmat=` 주석 참고.
 *
 * @returns 손댄 재질 수(진단용). `raw` 는 0 이다.
 */
function applyMatMode(model: Object3D, THREE: ThreeNS, mat: MatMode, flat: boolean): number {
  if (mat === 'raw') return 0;
  if (mat === 'swap') return swapMaterials(model, THREE, flat, false);
  if (mat === 'std') return swapMaterials(model, THREE, flat, true);
  // noext — 클래스는 그대로 두고 확장 값만 끈다. 재질 인스턴스를 새로 만들지 않으므로
  // 개수도 그대로다(clone 이 참조를 공유하니 한 번 고치면 N 채 전부에 적용된다).
  const seen = new Set<unknown>();
  let n = 0;
  model.traverse((o: Object3D & { isMesh?: boolean; material?: unknown }) => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list as Array<Record<string, unknown>>) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      let touched = false;
      for (const [k, v] of Object.entries(EXT_OFF)) {
        if (typeof m[k] === 'number') { m[k] = v; touched = true; }
      }
      if (touched) n++;
    }
  });
  return n;
}

interface SrcMat { map?: unknown; color?: unknown; roughness?: number }

/**
 * 동적 import 한 `three/webgpu` 중 이 파일이 쓰는 부분만. 전체 타입을 정적으로 끌어오면
 * 실험 파일이 three 에 묶여, "`?glb=` 없으면 아무것도 안 한다" 는 성질이 흐려진다.
 */
interface ThreeNS {
  MeshStandardMaterial: new (o: Record<string, unknown>) => unknown;
}

/** `Box3` 최소 계약 — 실제 배치를 재는 데만 쓴다 */
interface Box3Like {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  setFromObject(o: never): Box3Like;
}

/**
 * 미술관 대신 세울 **단순 상자.** 크기는 GLB 실측 바운즈와 같게 맞춘다.
 *
 * 이것이 보이는데 GLB 가 안 보이면 원인은 **GLB 쪽**(지오·재질·텍스처)이고,
 * 이것도 안 보이면 원인은 **배치·씬·렌더 경로**다. 네 번의 판정 동안 그 둘을 가르는
 * 수단이 없어 매번 GLB 만 의심했다.
 */
function makeBox(THREE: unknown): unknown {
  const T = THREE as {
    Mesh: new (g: unknown, m: unknown) => unknown;
    BoxGeometry: new (w: number, h: number, d: number) => { translate(x: number, y: number, z: number): unknown };
    MeshStandardMaterial: new (o: Record<string, unknown>) => unknown;
  };
  // GLB 실측: 폭 17.2 · 높이 7.9 · 깊이 24.6, 바닥이 y=−0.5
  const geo = new T.BoxGeometry(17, 8, 24);
  geo.translate(0, 3.5, 0);
  return new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xc86432, roughness: 0.9, metalness: 0 }));
}

/** 한 채의 메시 수와 삼각형 수를 센다. 총량은 이 값에 채수를 곱해 얻는다 */
function measure(model: Object3D, out: Counts): void {
  let meshes = 0;
  let tris = 0;
  model.traverse((o: Object3D & { isMesh?: boolean; geometry?: GeoLike }) => {
    if (!o.isMesh || !o.geometry) return;
    meshes++;
    const g = o.geometry;
    if (g.index) tris += g.index.count / 3;
    else if (g.attributes?.position) tris += g.attributes.position.count / 3;
  });
  out.meshesPer = meshes;
  out.trisPer = Math.round(tris);
}

interface GeoLike {
  index?: { count: number } | null;
  attributes?: { position?: { count: number } };
}

/**
 * 파셀 격자에 세운다. 미술관이 26×24m 이고 셀이 32m 라 한 칸에 한 채가 들어간다.
 *
 * 원점에서 **가까운 순으로** 채운다. 채수가 적어도 화면에 보이는 곳부터 서야 실험이
 * 성립한다 — 뒤에 세워 놓고 "안 버벅인다"고 하면 그건 프러스텀 컬링을 잰 것이지 부하를
 * 잰 것이 아니다.
 *
 * ── 스폰 칸은 비운다 (감독 실기기 판정) ─────────────────────────────────────
 * 감독: *"50채 해봤는데. 조이스틱이 안먹는듯."*
 *
 * 조이스틱은 멀쩡했다. **원점이 곧 플레이어 스폰 지점**인데 거기에 26×24m 미술관을
 * 세웠으니, 부팅하자마자 건물 한가운데에 갇힌 것이다. 움직여도 사방이 같은 벽이라
 * 입력이 안 먹는 것처럼 보인다.
 *
 * 실험 설계의 결함이지 성능 문제가 아니었다. 원점 한 칸만 비우면 그 자리에 서서
 * 둘러보게 되고, 부하는 그대로 유지된다 — 비운 칸의 몫은 바깥으로 한 칸 밀린다.
 */
async function placeGrid(
  model: Object3D,
  root: Object3D,
  n: number,
  cell: number,
  onStep: (done: number) => void,
): Promise<void> {
  const cells = gridCells(n, cell);
  for (let i = 0; i < cells.length; i++) {
    const copy = model.clone(true);
    copy.position.set(cells[i].x, 0, cells[i].z);
    root.add(copy);
    // ── 월드 행렬을 **명시적으로** 갱신한다 ────────────────────────────────
    // 감독 판정 네 번 동안 미술관이 안 보였고, 다섯 번째에 갑자기 보였다. 그 사이
    // 내가 넣은 것은 **진단 코드뿐**이다 — `Box3().setFromObject(root)`.
    //
    // 그 호출은 부작용으로 자식 전체의 월드 행렬을 강제 갱신한다. 즉 **진단이
    // 우연히 고쳤을 가능성이 높다.** three 는 보통 렌더 직전에 씬 전체를 갱신하지만,
    // 여기서는 부착을 프레임에 걸쳐 나눠 하므로 갱신 시점과 어긋날 수 있다.
    // 행렬이 낡으면 프러스텀 컬링이 **원점 기준**으로 판정해 32m 앞 건물도 화면
    // 밖으로 취급한다 — 삼각형은 잡히는데 화면에는 없던 증상과 정확히 맞는다.
    //
    // 원인을 확정하지는 못했다(헤드리스는 WebGL 이라 이 증상이 재현되지 않는다).
    // 다만 **진단이 부작용으로 고치는 상태를 남겨 둘 수는 없다.** 진단을 빼면
    // 다시 깨지고, 그때는 아무도 이유를 모른다.
    copy.updateMatrixWorld(true);
    // 한 프레임에 다 붙이면 그 프레임이 통째로 멈춘다 — 감독 실기기에서 **1,072ms**
    // 히칭 1회가 그것이었다. 배치마다 프레임을 넘기면 같은 총량이 여러 프레임에 흩어져
    // 화면이 계속 돈다. 총 시간은 오히려 조금 늘지만 **멈추지 않는다.**
    if ((i + 1) % ATTACH_BATCH === 0) {
      onStep(i + 1);
      await nextFrame();
    }
  }
  onStep(cells.length);
}

/**
 * 한 프레임에 붙일 채수. 작을수록 부드럽고 총 시간이 길어진다.
 *
 * 한 채가 메시 78개라 4채면 프레임당 312개 — 헤드리스에서 프레임 하나가 감당하는 양이다.
 * 이 값을 1 로 내리면 더 부드럽지만 50채에 50프레임(≈0.8초)이 더 든다.
 */
const ATTACH_BATCH = 4;

/** 다음 프레임까지 양보한다. `requestAnimationFrame` 이 없는 환경(테스트)에서도 돈다 */
function nextFrame(): Promise<void> {
  return new Promise((res) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => res());
    else setTimeout(res, 0);
  });
}

/**
 * 세울 자리 목록. **순수 함수라 검사할 수 있다** — 스폰 칸을 비우는 것이 이 실험의
 * 사용 가능 여부를 가르는데(감독 실기기에서 한 번 막혔다), three 없이는 못 재는 곳에
 * 두면 다시 화면으로만 확인하게 된다.
 */
export function gridCells(n: number, cell: number): { x: number; z: number; d: number }[] {
  // 스폰 칸을 빼야 하므로 한 칸 여유를 두고 격자를 잡는다.
  const side = Math.ceil(Math.sqrt(n + 1)) + 1;
  const half = (side - 1) / 2;

  const cells: { x: number; z: number; d: number }[] = [];
  for (let i = 0; i < side; i++) {
    for (let j = 0; j < side; j++) {
      const x = (i - half) * cell;
      const z = (j - half) * cell;
      const d = Math.hypot(x, z);
      if (d < cell * 0.5) continue; // 스폰 칸 — 여기 세우면 플레이어가 벽 속에서 시작한다
      cells.push({ x, z, d });
    }
  }
  // 가까운 순. 같은 거리면 좌표순으로 갈라 **결정론**을 지킨다 — 정렬이 흔들리면 같은
  // URL 이 매번 다른 세상을 만들고, 그러면 조건 간 비교가 성립하지 않는다.
  cells.sort((a, b) => a.d - b.d || a.x - b.x || a.z - b.z);
  return cells.slice(0, n);
}
