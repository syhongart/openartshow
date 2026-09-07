// world10-boot.ts — world10.html(뉴욕 갤러리 거리) 의 진입점. 캔버스를 찾아 조립을 시작한다.
//
// behind-flag: 이 페이지는 어디에도 링크하지 않는다. 존재가 채택을 뜻하지 않으며,
// 라이브 노출은 감독·팀장 게이트를 거친다(`docs/nyc/state.md`).
//
// ── 🔴 트리가 `js/world-glb/` 에서 **`js/world10/` 로 바뀌었다** (2026-09-07) ────────
// 팀장 판정 2026-09-06 「C·포크」: 감독 지시 *"건물만 있으면 안 되지. **오픈월드를 만들어야지.**"*
// 와 카드 답 «끝없는 격자 도시» 는 스트리밍을 요구하고, 그것은 `world-glb`(«GLB 한 장»)의
// 전제와 정면으로 어긋난다. 계약을 union 으로 여는 안은 「A」 조건 1 이 명시적으로 금지했고
// (분기 2곳 초과), 그 재론 조건이 미리 정해 둔 답이 **포크**다. 경위·조건 C1~C6·no-sync 정책은
// `js/world10/README.md` **한 곳**이다.
//
// `world-glb` 는 **한 글자도 안 바뀐다** — world7·8 은 그대로 그 트리를 탄다.
//
// `source()` 계약은 world8 과 여전히 같다. 이 부트가 갈리는 것은 셋이다: ① `tag`
// ② `?cam=` 을 읽어 `start` 를 넘긴다(캡처 페이지만 — `options.ts` `start` 주석·
// `decide/capture-entry.ts` 헤더) ③ 트리 경로. 앞의 둘은 «분기» 가 아니라 «부트 인자» 다.
//
// ⚠ **열 파일은 이 스크립트가 정하지 않는다** — `<body data-glb>` 가 가리킨다. 그 파일은
// 이제 **격자 셀 한 장**(`nyc-cell.glb`)이고, 세계는 그 한 장을 격자로 반복해 만든다.

import { startGlbWorld } from './world10/main.js';
import { assetUrl } from './world10/asset-url.js';
import { parseCam, V1_START } from './world10/decide/capture-entry.js';

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
 *             적용 자리·순서는 `world10/systems/sky-ground.ts` 헤더.
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
