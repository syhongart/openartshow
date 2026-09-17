// world-glb/features/water-lift.ts — **`?watery=` — 물 전체를 수직으로 옮긴다.**
//
// ── 왜 생겼나 (감독 신고 → 감독 판정, 2026-09-17) ──────────────────────────
// 감독이 아이폰에서 월드11 을 열고 «유실» 을 신고했는데, 받은 스크린샷의 실제 화면은
// **바닥 전체가 수면**이었다 — 횡단보도 흰 줄과 간판 글자가 그 위에 거꾸로 비쳤다.
// 첫 처방은 「물을 끈다」였고 감독이 ***"노노. 우리 강이 더 멋있지나"*** 로 뒤집었다.
// **그래서 끄지 않고 높이를 맞춘다.** 실측·범위·🔴**이 노브가 못 옮기는 것**(수영·부력
// 판정)은 `decide/water-y.ts` 한 곳이다 — 여기에 다시 적지 않는다.
//
// ── 🔴 왜 `features/ocean.ts` 안이 아니라 별도 기능인가 ────────────────────
// **처음에는 거기 넣었고 `check:filesize` 가 막았다**(1,710 → 1,764줄, 그 파일은 동결이다).
// 주석을 SSOT 로 옮겨도 코드·import 만으로 순증이 남는다. 그때 고를 수 있는 길이 셋이었다:
//   ⓐ baseline 을 올린다 — 2026-09-06 executor 사고가 바로 그 파일을 손댄 회차다
//   ⓑ 기존 줄을 압축해 통과시킨다 — `decide/fog.ts` 헤더가 *"줄을 압축해 통과시키는
//      대신 기록을 옮겼다"* 로 이미 기각한 형태다
//   ⓒ **기능으로 뺀다** — `features/index.ts` 헤더가 *"기능을 넣고 빼는 데 조립부를
//      건드릴 일이 없다"* 로 설계한 그 자리다. 물을 옮기는 일은 «물을 만드는 일» 과 다른
//      관심사이고, 실제로 이 파일은 **씬을 이름으로만** 본다(ocean 내부를 모른다).
// ⓒ 를 골랐다. 대가: 물 메시 **이름**에 의존한다 — 이름이 바뀌면 조용히 0개를 옮긴다.
// 그래서 **0개면 콘솔에 남긴다**(아래).
//
// ── 순서 (`features/index.ts` 의 배열이 곧 실행 순서다) ────────────────────
// `ocean` **뒤**여야 한다(옮길 메시가 씬에 있어야 한다). `water-style` **앞**이어야 한다 —
// 게임풍 수면은 원본의 **자세를 복사**하므로, 뒤에 있으면 대역 메시가 옛 높이를 물고
// 앉는다(그 파일의 `follow` 절).
//
// ── 무엇을 안 하는가 ────────────────────────────────────────────────────────
// · **매 프레임 안 돈다** — `system` 을 안 낸다. 부팅 1회 이동이고 그 뒤로 비용 0 이다.
// · **끄지 않는다** — 「물을 아예 안 만든다」는 다른 축이고 이 회차에 감독이 기각했다.
// · **판정을 소유하지 않는다** — 범위·클램프·이름 목록은 전부 `decide/` 다.

import type { Object3D } from 'three/webgpu';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';
import { readNum } from '../url-knob.js';
import {
  waterYOffset, WATER_MESH_NAMES,
  WATER_Y_OFFSET_DEFAULT, WATER_Y_OFFSET_MIN, WATER_Y_OFFSET_MAX,
} from '../decide/water-y.js';

/**
 * 씬에서 물 메시를 이름으로 찾아 `y` 를 옮긴다. **옮긴 개수를 돌려준다** —
 * 0 이면 「노브가 아무 일도 안 했다」이고 그것은 초록이 아니다.
 *
 * 순수하게 유지하려고 three 를 안 받는다 — 필요한 것은 `getObjectByName` 과
 * `position.y` 뿐이라 구조만 받는다(테스트가 브라우저 없이 이 경로를 돈다).
 */
export function liftWaterMeshes(
  scene: { getObjectByName(name: string): Object3D | undefined },
  dy: number,
  names: readonly string[] = WATER_MESH_NAMES,
): number {
  if (dy === 0) return 0;
  let moved = 0;
  for (const name of names) {
    const o = scene.getObjectByName(name) as { position?: { y: number } } | undefined;
    if (!o?.position) continue;
    o.position.y += dy;
    moved++;
  }
  return moved;
}

export const waterLiftFeature: Feature = {
  name: 'water-lift',

  create(env: FeatureEnv): FeatureInstance | null {
    const dy = waterYOffset(readNum('watery', WATER_Y_OFFSET_DEFAULT, WATER_Y_OFFSET_MIN, WATER_Y_OFFSET_MAX));
    // **기본값 0 이면 기능 자체가 없다** — world7·world8 은 씬을 한 번도 안 만진다.
    // 「기본값이 같다」가 아니라 **「경로가 없다」**가 이 트리가 쓰는 불변 보장 형태다.
    if (dy === 0) return null;

    const moved = liftWaterMeshes(env.scene as never, dy);
    // ⚠ 조용히 넘어가지 않는다 — 0 개면 이름이 어긋났다는 뜻이고, 감독이 그 화면을
    // 「높이는 원인이 아니다」로 읽으면 **이 노브를 연 목적이 통째로 무효가 된다.**
    // 이 트리의 `?water=tsl` 폴백·`pickGrassWind` 가 세운 같은 처방이다.
    if (moved === 0) {
      console.warn(`[water-lift] ?watery=${dy} 인데 옮긴 메시가 0개다 — 물 메시 이름이 바뀌었을 수 있다`);
    }

    return {
      // 진단에 남긴다 — 감독 화면의 수치가 곧 판정 근거다(`?diag=` 체크리스트와 짝).
      diagnostics: () => ({ dy, moved }),
    };
  },
};
