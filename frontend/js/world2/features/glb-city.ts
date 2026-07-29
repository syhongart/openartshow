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
import { readNum } from '../url-knob.js';

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
}

export const glbCityFeature: Feature = {
  name: 'glbCity',

  create(env: FeatureEnv): FeatureInstance | null {
    const want = Math.round(readNum('glb', 0, 0, MAX_COPIES));
    if (want <= 0) return null; // 기본은 꺼짐 — 실험 URL 로만 켠다

    const counts: Counts = { placed: 0, meshesPer: 0, trisPer: 0, state: 'loading' };
    let root: Object3D | null = null;
    let disposed = false;

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

        // 실험 물건을 한 그룹에 모은다 — 정리할 때 하나만 지우면 된다.
        const g = new THREE.Group();
        g.name = 'world2:glbCity';
        placeGrid(model, g as unknown as Object3D, want, env.cell);
        env.scene.add(g);
        root = g as unknown as Object3D;

        counts.placed = want;
        counts.state = 'ready';
      } catch (err) {
        // **못 잰 것은 통과가 아니다.** 실패를 조용히 삼키면 진단에 0 이 찍히고 그것이
        // "가볍다" 로 읽힌다. 무엇이 막았는지를 남긴다.
        counts.state = 'failed';
        counts.error = err instanceof Error ? err.message : String(err);
      }
    })();

    return {
      diagnostics: () => ({
        want,
        placed: counts.placed,
        state: counts.state,
        error: counts.error,
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
        root?.removeFromParent();
        root = null;
      },
    };
  },
};

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
 * 원점 주변부터 바깥으로 채운다 — 스폰 지점이 원점이므로, 채수가 적어도 **화면에 보이는
 * 곳부터** 서야 실험이 성립한다. 뒤에 세워 놓고 "안 버벅인다"고 하면 그건 프러스텀 컬링을
 * 잰 것이지 부하를 잰 것이 아니다.
 */
function placeGrid(
  model: Object3D,
  root: Object3D,
  n: number,
  cell: number,
): void {
  const side = Math.ceil(Math.sqrt(n));
  const half = (side - 1) / 2;
  let made = 0;
  for (let i = 0; i < side && made < n; i++) {
    for (let j = 0; j < side && made < n; j++) {
      const copy = model.clone(true);
      copy.position.set((i - half) * cell, 0, (j - half) * cell);
      root.add(copy);
      made++;
    }
  }
}
