// world11-boot.ts — world11.html 의 진입점. 캔버스를 찾아 조립을 시작한다.
//
// behind-flag: 이 페이지는 어디에도 링크하지 않는다. 존재가 채택을 뜻하지 않으며,
// 라이브 노출은 감독·팀장 게이트를 거친다.
//
// ── 왜 world10 포크가 아닌가 (팀장 판정 2026-09-16 **결정 2**, C10) ─────────
// world11 은 `frontend/js/world-glb/` 트리를 **공유**한다. 이 파일만 신설한다.
//
// 근거는 두 트리의 전량 대조다. 파일명·import 경로의 트리 접두(`world10`·`world-glb`·
// `world11`)만 정규화해 공통 파일을 전부 비교했다:
//
//     world-glb 전체 파일                      206
//     world10 전체 파일                        209   (world-glb 에 없는 전용 3개:
//       `decide/nyc-bands.ts` · `systems/nyc-cell-builder.ts` · `systems/nyc-parcels.ts`)
//     world-glb 전용 파일                        0
//     공통 파일                                206
//     ── 그 206 중 ──
//     접두 제외 **코드 0줄 차이**              200
//     실질 차이 파일                             6   (코드 5 + `README.md`)
//     실질 차이 줄 — 코드 5파일 합계           423
//     실질 차이 줄 — README 포함 합계          644
//
//     차이 내역: `main.ts` 345(세계 소스 축 — world10 은 64m 격자 파셀 스트리밍,
//     world-glb 는 GLB 한 덩이) / `README.md` 221(문서) / `decide/fog.ts` 31 ·
//     `decide/shadow.ts` 22 · `decide/fly.ts` 13 · `decide/lod-fade.ts` 12
//     (뒤 넷은 전부 NYC_BANDS 연동이라 축이 아니라 기능 이식이다).
//
// 즉 world10 을 포크하면 **200 개 파일을 0줄 차이로 복제**하고 그 중 세계 소스 한 축만
// 되돌리게 된다. 그 형태는 이 저장소가 2026-08-26 에 world7 을 두고 이미 판정한 것과
// 같다(`options.ts` 헤더 — *"같은 세계가 다른 파일을 여는 것"* 이면 트리를 공유한다).
//
// ── 🔴 이 표의 앞 판본은 **부팀장이 틀린 값으로 올린 것**이다 (2026-09-16 정정) ──
// 팀장에게 올라간 브리프와 이 헤더의 첫 판본은 «0줄 차이 **203** · 실질 차이 **5**» 로
// 적혀 있었고 **둘 다 틀렸다.** 산술이 스스로 드러냈다 — `203 + 5 = 208` 인데 공통
// 파일은 206 이다. 원인은 분모 오염이다: 0줄 차이를 「world10 의 코드 파일 수 − 실질
// 차이 수」로 **뺄셈으로 구했고**, 그 피감수에 **world-glb 에 아예 없는 world10 전용
// 3개**(위 목록)가 들어 있었다. 공통 집합을 먼저 잡고 세었어야 했다.
// 「423」은 **코드 5파일 기준으로는 맞다** — 그것만 우연히 살아남았다.
//
// **판정은 어느 값으로도 안 바뀐다**(근거의 전부가 «거의 전부가 0줄 차이» 다). 그런데도
// 정정을 남기는 이유는 이 저장소가 그 형태로 이미 비싸게 치렀기 때문이다 — 실측 회차가
// 두 곳에서 어긋난 것 하나로 검수관 블로커를 받았고(CLAUDE.md 배포 게이트 절),
// `main` unprotected 오기는 7일을 잃었다. **틀린 값을 지우고 조용히 고치면 다음 사람이
// 재현했을 때 어긋남을 사고로 오인한다.** 그래서 무엇이 왜 틀렸는지까지 적는다.
//
// ⚠ 줄 수는 diff 방식(컨텍스트 폭·빈 줄 처리)에 따라 몇 줄 흔들린다. 실제로 같은 대조를
// `difflib.unified_diff(n=0)` 로 돌린 회차는 `main.ts` 353 · README 207 · fog 33 · fly 15
// 를 얻었다. **차이 파일의 정체와 순서는 어느 방식으로도 같다** — 그것이 판정 축이다.
//
// ⚠⚠ **이 표는 여기 한 곳이다.** 다른 파일에 다시 적지 마라 — 이 저장소는 값 미러링으로
// 색·수치·테스트 임계값에서 세 번 데였다(CLAUDE.md 검증 규율 절).
//
// ── 드로우콜에 대해 이 파일이 **안 하는 것** ────────────────────────────────
// 팀장 판정 **결정 1** 은 «월드11의 드로우콜을 런타임 후처리 `InstancedMesh` 조립으로
// 줄인다» 이다. **그 조립은 이 트리가 이미 무조건 한다** — `systems/glb-instance.js` 의
// `instanceRepeats` 를 `systems/glb-source.ts:277` 이 조건 없이 부른다. 그러니 이 부트는
// 인스턴싱 옵션을 넘기지 않는다. 넘길 옵션이 없다는 것이 이 트리의 사실이다.
// (그 함수는 `setMatrixAt(i, world)` 로 **행렬 전체**를 넣으므로 Y축 외 회전도 보존된다.
//  Y축 하나만 받는 것은 `world10/systems/instancing.ts` 의 `InstancePools.setTransform`
//  이고, 그것은 파셀 조립용이라 이 경로에 들어오지 않는다.)
//
// ⚠ **열 파일은 이 스크립트가 정하지 않는다** — `<body data-glb>` 가 가리킨다.
// 그래야 「어느 GLB 가 세계인가」가 페이지의 사실로 남고, 스크립트는 그것을 모른다.
// world8-boot 이 같은 이유로 같은 형태다(그 파일 헤더).
//
// ⚠⚠ **`assets/worlds/manhattan-180m.glb` 는 커밋돼 있다** — 45,498,128 B(43.4 MiB),
// 이 파일과 **같은 커밋**이다. 자산과 페이지는 함께 온다(한쪽만 있으면
// `tests/manhattan-glb.test.ts` ③ 의 첫 검사가 빨간불이 된다).
//
// ⚠ 이 자리는 초안에 *"저장소에 없다(굽는 중)"* 라고 적혀 있었고 자산이 들어온 뒤에도
// 그대로 남아 **검수관 블로커 B1** 이 됐다(2026-09-16). 같은 문구가 `world11.html` 과
// `scripts/smoke/config.mjs` 에도 있었고, 그 셋 중 `config.mjs` 것은 *"404 가 정상"* 이라는
// **판정 기준**까지 적고 있었다 — 게이트 유효성에 대한 거짓 진술이다. 이 저장소가
// 반복해서 대가를 치른 형태라(`main` unprotected 오기 7일) 경위를 지우지 않고 남긴다.
//
// 자산이 없어지면 `source` 가 `HTTP 404` 로 던지고 부팅 파이프라인이 로딩 화면에 보고한다
// — 그 동작 자체는 설계대로이고 `tests/world11-boot-run.test.ts` 가 지킨다.

import { startGlbWorld } from './world-glb/main.js';
import { assetUrl } from './world-glb/asset-url.js';

const canvas = document.getElementById('wg-canvas');
if (canvas instanceof HTMLCanvasElement) {
  startGlbWorld(canvas, {
    tag: 'world11',
    // 고정 자산 — `<body data-glb>` 가 가리킨다. **부팅의 `stream` 단계에서 불리므로**
    // 43MB 를 받는 시간이 로딩 진행률에 포함된다.
    source: async () => {
      const rel = document.body?.dataset?.glb ?? '';
      if (!rel) throw new Error('data-glb 가 비어 있다 — 열 세계가 없다');
      const res = await fetch(assetUrl(rel));
      if (!res.ok) throw new Error(`GLB 를 못 받았다: HTTP ${res.status}`);
      return res.arrayBuffer();
    },
  }).catch((err: unknown) => {
    // startGlbWorld 는 부팅 실패를 로딩 화면에 표시하고 null 을 돌려준다. 여기 오는 건
    // 그보다 바깥의 예외이므로 콘솔에 남긴다 — 조용히 삼키면 원인 추적이 불가능해진다.
    console.error('[world11] 진입 실패', err);
  });
} else {
  console.error('[world11] 캔버스(#wg-canvas)를 찾지 못했습니다');
}
