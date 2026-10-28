// world2/systems/glb-material.ts — 불러온 GLB 의 재질을 실기기에서 **뜨게** 만든다.
//
// ── 왜 이 파일이 따로 있나 ────────────────────────────────────────────────────
// 처방 자체는 `features/glb-city.ts` 안에 있었다. 그런데 `glb-city` 는 *"목록에서 한 줄을
// 지우면 곧 제거"* 되는 실험 기능이고, **다른 기능이 그것을 import 하지 않는다**는 규율이
// 게이트로 집행된다(`tests/world2-glb-city.test.ts`). 그래서 오버레이(감독 배치)가 같은
// 처방을 쓰려고 `glb-city` 를 import 했더니 그 게이트가 정확히 막았다(2026-08-12).
//
// **막힌 것이 옳다.** 처방이 실험 기능에 갇혀 있던 것이 문제였지 게이트가 문제가 아니다.
// 그래서 정의를 여기로 옮기고 양쪽이 이것을 쓴다 — 값이 한 곳에만 있다.

import type { Object3D } from 'three/webgpu';

/**
 * 확장이 만드는 재질 속성. `disableMatExtensions` 는 이 값들만 **끄고** 재질 클래스는
 * 그대로 둔다.
 */
/**
 * 🔴 **GLB 발광 세기 상한** (감독 신고 2026-08-22 *"glb건물 현관의 조명이 너무쎄다"*).
 *
 * ── 실측: 미술관 GLB 의 조명 재질이 **300** 이다 ────────────────────────────
 * `frontend/assets/models/lab-space.glb` 의 재질 17개 중 `'light'` 하나가
 * `emissiveFactor [1,1,1]` + `KHR_materials_emissive_strength: 300` 이다. three 의
 * GLTFLoader 가 그 확장을 `emissiveIntensity` 로 옮기므로 화면 휘도가 **300** 이 된다.
 * 같은 씬의 가로등이 0.88, 물 윤슬이 0.85 이므로 **340배**다 — 블룸 문턱(0.75)을
 * 400배 넘겨 흰 덩어리로 뭉갠다.
 *
 * ── 왜 `noext` 가 이것을 안 막았나 ──────────────────────────────────────────
 * 아래 `EXT_OFF` 는 `sheen`·`clearcoat` 처럼 **실기기에서 화면을 먹는** 확장만 끈다.
 * 그 처방의 요점이 *"가장 적게 버린다"* 였고 주석이 *"emissive 는 전부 그대로 둔다"* 라고
 * 명시한다 — **발광을 남긴 것은 의도였다.** 그때 문제였던 것은 「안 보인다」였고 「너무
 * 밝다」는 이 회차에 처음 나왔다. 그래서 `EXT_OFF` 에 값을 더하지 않고 **상한**이라는
 * 다른 축을 연다(대입과 상한은 성질이 다르다 — 상한은 원본이 작으면 아무 일도 안 한다).
 *
 * ── 값 — **감독 판정 1** (2026-08-22, 후보 0·1·2·5 중) ────────────────────
 * 내가 시작값으로 2 를 넣었고(블룸 문턱 0.75 를 확실히 넘어 「조명으로 보이되」 뭉개지지
 * 않는 선), **감독이 그보다 낮은 1 을 고르셨다.** 후보 중 소등(0) 바로 위다.
 *
 * | 후보 | 문턱(0.75) 대비 | 성질 |
 * |---|---|---|
 * | 0   | 못 넘음 | 현관 조명이 아예 꺼진다 |
 * | **1** | **1.33배** | **켜진 것은 보이되 번짐이 거의 없다 ← 감독 확정** |
 * | 2   | 2.67배 | 조명으로 뚜렷하되 안 뭉개짐(내 시작값) |
 * | 5   | 6.67배 | 카드 후보에 있었으나 라이브 링크로는 못 드렸다 |
 * | 300 | 400배 | 원본. 감독이 *"엄청쎄"* 라고 신고하신 화면 |
 *
 * ⚠ **이 판정이 화면을 보고 내려졌는지는 확실하지 않다.** 부팀장이 카드 퀴즈를 올리면서
 * *"위 링크 넷을 비교해 보신 뒤"* 라고 써 놓고 **링크를 함께 드리지 않았다** — 감독이
 * 카드 설명만 보고 고르셨을 수 있다. 판정 자체는 유효하되(감독이 결정하셨다), 화면을
 * 보시고 다르게 판단하시면 **그것이 최종**이다. 그때 이 표에 회차를 더한다.
 *
 * 방향은 이 회차 내내 일관됐다 — 복합씬 점등도 후보 넷(0.4·0.6·0.75·1) 중 **가장 낮은**
 * 0.4 를 고르셨다. 「빛은 적게」가 두 번 연속 나온 판정이다.
 *
 * ⚠ **라이브 world1 은 영향받지 않는다** — 실측: `frontend/js/world.js`·`main.js` 에
 * `glb-city`·`glb-material`·`lab-space` 참조가 **0건**이다. 이 처방을 받는 것은
 * world2/3/5 와 편집 오버레이다.
 */
export const EMISSIVE_CAP = 1;
/** `?glbemis=` — 키와 범위를 여기 한 곳에 둔다(호출자 둘이 각자 적으면 미러링이다) */
export const EMISSIVE_KNOB = 'glbemis';
/** 상한 상한(sic) — 300 은 원본 값이라 「끄지 않음」과 같다. 되돌리려면 `?glbemis=300` */
export const EMISSIVE_CAP_MAX = 300;

/**
 * 노브를 읽어 상한을 낸다. **읽는 함수를 주입받는다** — 이 파일은 `world-shared` 라
 * world2 의 `url-knob` 을 import 할 수 없고, 호출자마다 다른 읽기를 쓸 수 있어야 한다.
 */
export function readEmissiveCap(
  readNum: (key: string, fallback: number, min: number, max: number) => number,
): number {
  return readNum(EMISSIVE_KNOB, EMISSIVE_CAP, 0, EMISSIVE_CAP_MAX);
}

export const EXT_OFF: Record<string, number> = {
  sheen: 0, sheenRoughness: 0,
  clearcoat: 0, clearcoatRoughness: 0,
  specularIntensity: 1, // 1 이 "확장 없음"과 같은 상태다(0 은 반사를 아예 죽인다)
  anisotropy: 0,
  iridescence: 0,
  transmission: 0,
  ior: 1.5, // glTF 기본값
};

/**
 * 재질 **확장 값만** 끈다. 클래스·텍스처·노멀맵·AO·emissive 는 전부 그대로 둔다.
 *
 * ── 이것이 `three/webgpu` 사각의 처방이다 (감독 판정 2026-07-29) ──────────────
 * 실기기 WebGPU 에서 `sheen`·`clearcoat`·`anisotropy`·`ior` 가 화면을 먹는다.
 * 판정표: **raw 안 보임 / noext 보임 / std 보임 / box 보임.** 가장 적게 버리는 선택지가
 * 곧 답이었다 — 클래스도 텍스처도 노멀맵도 AO 도 emissive 도 전부 살고, 꺼지는 것은
 * 확장 값뿐이다.
 *
 * ⚠ **GLB 를 씬에 놓는 모든 경로가 이 함수를 지나야 한다.** 오버레이(감독 배치)가 이것을
 * 안 거치고 원본 그대로 놓다가 실기기에서 렌더 파이프라인이 통째로 무효가 됐다
 * (2026-08-12 감독 콘솔: `TSL.NormalNode: Vertex attribute "normal" not found` →
 * `[Invalid RenderPipeline "renderPipeline_m.DarkShine_*"]` 가 매 프레임 쏟아지며 화면
 * 정지). 같은 판정이 2026-07-29 에 이미 나와 있었는데 그 처방이 `glb-city` 안에만 있어서
 * 오버레이가 못 받았다 — **처방을 기능 안에 가둔 대가**다.
 *
 * ⚠ **헤드리스는 WebGL 이라 이 축을 원리적으로 못 본다.** 게이트가 아니라 *"놓는 경로는
 * 반드시 이 함수를 지난다"* 는 구조가 유일한 방어이고, 실기기 판정은 감독 확인뿐이다.
 *
 * 재질 인스턴스를 새로 만들지 않으므로 개수 불변식에 영향이 없다(clone 이 참조를 공유하니
 * 한 번 고치면 N 채 전부에 적용된다).
 *
 * @returns 실제로 값을 바꾼 재질 수
 */
export function disableMatExtensions(model: Object3D, emissiveCap = EMISSIVE_CAP): number {
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
      // 🔴 발광 **상한**(위 `EMISSIVE_CAP` 주석). 대입이 아니라 `min` 이라 원본이 이미
      // 작으면 아무 일도 안 한다 — 어둡게 만드는 처방이 아니라 **타는 것만** 막는다.
      const ei = m.emissiveIntensity;
      if (typeof ei === 'number' && ei > emissiveCap) { m.emissiveIntensity = emissiveCap; touched = true; }
      if (touched) n++;
    }
  });
  return n;
}
