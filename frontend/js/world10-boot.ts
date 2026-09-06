// world10-boot.ts — world10.html(뉴욕 갤러리 거리) 의 진입점. 캔버스를 찾아 조립을 시작한다.
//
// behind-flag: 이 페이지는 어디에도 링크하지 않는다. 존재가 채택을 뜻하지 않으며,
// 라이브 노출은 감독·팀장 게이트를 거친다(`docs/nyc/state.md`).
//
// world8 과 **같은 트리**(`js/world-glb/`)를 쓴다 — 팀장 판정 2026-09-06 「A」: 거리는 런타임
// 절차 생성이 아니라 **빌드 시점 산출 GLB**(`scripts/asset/nyc/generate.mjs` → `<body data-glb>`)
// 이고, `source()` 계약은 world8 과 한 글자도 다르지 않다. 이 부트가 world8 과 갈리는 것은
// 둘뿐이다: ① `tag` ② `?cam=` 을 읽어 `start` 를 넘긴다(캡처 페이지만 — `options.ts` `start`
// 주석·`decide/capture-entry.ts` 헤더). 그 둘이 «분기» 가 아니라 «부트 인자» 인 것이 설계다.
//
// ⚠ **열 파일은 이 스크립트가 정하지 않는다** — `<body data-glb>` 가 가리킨다(world8 과 같다).

import { startGlbWorld } from './world-glb/main.js';
import { assetUrl } from './world-glb/asset-url.js';
import { parseCam, V1_START } from './world-glb/decide/capture-entry.js';

/**
 * 이 페이지가 켜 두는 기본값. **URL 에 이미 있는 키는 건드리지 않는다**(`world2-stylized-boot.ts` 선례).
 *   glb=0   — `world-shared/glb-city.ts` 의 미술관 1채(`lab-space.glb` 12.9MB, Baseline 전송량의 절반).
 *             거리는 자기 갤러리를 GLB 안에 가지므로 필요 없다(지시서 §7 초기 10MiB, 팀장 조건 4).
 *   grass=0 — `features/grass.ts` 는 플레이어 주위 링에 잔디를 깐다(파셀과 무관). 아스팔트·보도 위에
 *             잎이 서면 지시서 §2-4 «반복 잔디 띠» 를 거리로 옮겨 오는 것이다. 화분·가로수는 GLB 몫.
 *   hemig=8a857c — 반구광 **지면색**. 디자이너 2026-09-06: 아이보리 입면 (217,207,187)→(99,107,94)
 *             **색상 반전·밝기 46%** — `sky.js` 프리셋 hemiG `0x8fa385`(초록 낀 지면)가 입면색을
 *             지배해서다. 값 출처는 `scripts/asset/nyc/layout.mjs` `PALETTE.curb`(거리 지면색
 *             `#8A857C`) 한 곳이고, 부트는 `scripts/` 를 import 할 수 없어 **동일성 테스트**로
 *             미러링을 고정한다 — `tests/nyc-gen.test.ts` 「world10-boot hemig 기본값 =
 *             layout.mjs PALETTE.curb (팀장 조건 ② — 두 값이 갈리면 여기서 깨진다)」.
 *             적용 자리·순서는 `world-glb/systems/sky-ground.ts` 헤더.
 * 트리 코드는 그대로다 — 노브를 부트가 채우는 것이라 `if (tag === …)` 분기가 아니다(팀장 조건 2).
 * `?glb=1`·`?grass=1` 로 열면 되돌아간다(A/B 비교용).
 */
const DEFAULTS: Readonly<Record<string, string>> = { glb: '0', grass: '0', hemig: '8a857c' };
const url = new URL(location.href);
let touched = false;
for (const [k, v] of Object.entries(DEFAULTS)) {
  if (!url.searchParams.has(k)) { url.searchParams.set(k, v); touched = true; }
}
if (touched) history.replaceState(history.state, '', url);

const canvas = document.getElementById('wg-canvas');
if (canvas instanceof HTMLCanvasElement) {
  const cam = parseCam(location.search);
  startGlbWorld(canvas, {
    tag: 'world10',
    source: async () => {
      const rel = document.body?.dataset?.glb ?? '';
      if (!rel) throw new Error('data-glb 가 비어 있다 — 열 세계가 없다');
      const res = await fetch(assetUrl(rel));
      if (!res.ok) throw new Error(`GLB 를 못 받았다: HTTP ${res.status}`);
      return res.arrayBuffer();
    },
    // `?cam=` 이 없으면 아트 기준 V1(거리 시작: 입구 중앙, 눈높이는 트리 기본 1.7m)에서 시작한다 —
    // 트리 기본 스폰(-3.5, 10)은 world2 광장 좌표라 거리 밖(남쪽 보도 뒤)이다.
    start: cam ?? V1_START,
  }).catch((err: unknown) => {
    console.error('[world10] 진입 실패', err);
  });
} else {
  console.error('[world10] 캔버스(#wg-canvas)를 찾지 못했습니다');
}
