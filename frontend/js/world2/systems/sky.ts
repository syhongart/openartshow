// world2/systems/sky.ts — 하늘. 라이브 오픈월드의 `sky.js`를 **그대로 쓰는 어댑터**다.
//
// ── 왜 새로 안 짜고 가져오는가 (감독 지시 2026-07-27) ────────────────────────
// world2를 시작하며 하늘도 새로 짰다. 그리고 같은 함정을 처음부터 다시 밟았다.
//
//   ① `ShaderMaterial`(GLSL)로 그렸다 → `three.webgpu` 빌드에는 렌더 경로가 없어
//      감독 실기기에서 하늘이 통째로 안 보였다.
//   ② 캔버스 텍스처에 `colorSpace`를 안 줬다 → 어두운 계조가 벌어져 밴딩·디더가
//      증폭됐고, 그게 하늘 색이 3배 밝아지는 것과 겹쳐 서로를 가렸다.
//   ③ 구름 판의 스케일 축이 눕히기 전 기준이었다 → 세로가 1 유닛이라 실선이 됐다.
//
// `sky.js`(929줄)에는 이 셋이 **전부 없다.** GLSL 0건이고, `tex.colorSpace = SRGBColorSpace`가
// 이미 지정돼 있고, 돔·구름이 전부 구(球)라 축 문제가 성립하지 않는다. 하네스 실측으로만
// 얻은 지식이 코드에 굳어 있다는 게 이런 것이고, 나는 그걸 처음부터 다시 배운 셈이다.
//
// 감독 판단이 정확했다 — **"원래 오픈월드 하늘 좋았는데."**
//
// ── 개수 불변식 — 객체는 상수다. 그런데 그것으로는 부족했다 ─────────────────
// `sky.js`는 비·눈·무지개·오로라를 **부팅 때 전부 만들어 `visible=false`로 재워두고**,
// 전환은 토글과 불투명도 보간으로만 한다. world2가 세운 원칙(부팅 시 전량 사전 할당,
// 런타임 개수 불변)을 그대로 따른다 — 우연이 아니라 같은 실측에서 나온 결론이다.
//
// **여기까지가 이 주석이 오래 적고 있던 것이고, 거기서 뽑은 결론이 틀렸다.**
//
// 객체 개수가 상수인 것과 GPU 자원이 상수인 것은 다른 일이다. three 의 `info.memory` 는
// 객체를 만들 때가 아니라 **처음 그릴 때** 오른다. 재워둔 메시는 렌더 목록에 안 오르므로
// 지오 버퍼도, 텍스처 업로드도, 파이프라인도 그때까지 존재하지 않는다. 그래서 감독
// 실기기에서 낮→밤→천둥을 바꾼 구간에 pipeline 31→33 · geometry 92→95 · texture 32→35 가
// 계단으로 올랐다(2026-07-29 실측, 헤드리스 재현 1바퀴 +4/+4/+3 · 2바퀴 0).
//
// 그래서 `prewarm()` 이 있다 — 부팅 예열 프레임 동안 잠든 레이어를 잠시 켜서 그 비용을
// 로딩 화면으로 옮긴다. **개수가 상수라는 주장은 이제 `npm run measure:sky-warm` 이
// 검사한다.** 주석이 보증하던 것을 게이트가 보증한다.
//
// 야간 맑음에서 실제로 그려지는 것은 돔·페이드돔·구름·별 정도이고, 나머지는 재워둔 채
// 재질·지오만 유지한다(드로우콜만 줄어든다).
//
// ── three 진입점 ────────────────────────────────────────────────────────────
// `sky.js`는 `three`(WebGL 빌드), world2는 `three/webgpu`를 import한다. 두 빌드 모두
// 클래스를 자체 정의하지 않고 `three.core.js`에서 가져오므로 **같은 클래스**다
// (`class Mesh extends` 정의 0건 확인). vite도 `vendor-three-core`를 별도 청크로 분리해
// 한 번만 로드한다. 즉 `instanceof`·씬그래프 혼선이 없다.

// ── 포크 통합 상태: 합치지 않음 (2026-08-16 팀장 조건 C7) ──────────────────────
// **합치지 않기로 확정**됐다. 중복이 아니라 **구조가 다른 두 계보**다:
//   · world2 모듈식: `systems/sky.ts` + `features/sky.ts` 두 파일
//   · world3·5 통합식: `sky.js` 한 파일(1,422줄·1,381줄)
//
// world2 에만 있는 기능: `SKY_BLUE`·`CLOUD_CURVE`·`CLOUD_H`·`shadowTexel` 추종·
// `probeLighting()` 등 8개. 합치는 일은 리팩터링이 아니라 **기능 이식**이고,
// 룩 판정 수단이 감독 실기기뿐인 환경에서 fail-closed 는 «안 합친다» 쪽이다.
//
// **재론 조건** (이하 셋 중 하나라도 성립하면 다시 판단):
//   T1. 감독이 world3·5 에 world2 판 기능 이식을 지시할 때
//   T2. 두 계보에 같은 수정을 실제로 하게 되는 회차가 발생할 때 (비용이 추측→실측)
//   T3. 룩 회귀를 실기기 없이 판정할 수단이 생길 때 (이 판단의 전제 소멸)

import * as THREE from 'three/webgpu';
import { createSkySystem, lightOf } from '../../sky.js';
import {
  applyNightFloor, type HemiLike, type SunLike, type ExposureLike, type FogLike,
} from './night-lights.js';
import { createHorizonBand, bandStrength, type HorizonBand } from './horizon.js';
import type { NightTune, SkyTime } from '../decide/night.js';
import { nightness } from '../decide/night.js';
import { dayLightMix, type DayLightMix } from '../decide/daylight.js';
import { snapToShadowTexel } from '../decide/shadow.js';
import { readNum } from '../url-knob.js';
import type { FrameCtx, System } from '../kernel.js';

/**
 * 태양까지의 기본 거리 — `getSunDir()` 방향에 이 값을 곱해 광원을 배치한다.
 *
 * **방향광이라 조명 결과는 거리와 무관하다.** 이 값이 실제로 정하는 것은 오직 **그림자
 * 카메라가 어디에 서느냐**다. 그래서 조립부가 `decide/shadow.ts` 로 유도한 값을
 * `opts.sunDist` 로 주입한다 — 여기 적힌 70 은 그 주입이 없을 때의 하위호환 값이고,
 * 씬 두께(반폭 + 최고 구조물)보다 작아서 **그림자 카메라를 쓰면 타워 꼭대기가 광원보다
 * 뒤에 놓여 잘린다.** 프러스텀과 거리는 함께 정해져야 하는 한 쌍이다.
 */
const SUN_DIST_FALLBACK = 70;
/**
 * 돔 반경 하한.
 *
 * ⚠ 여기 *"카메라 far(1200)보다 작아야 잘리지 않는다"* 가 적혀 있었다. `DOME_MIN` 과
 * `DOME_MAX` 를 함께 설명하던 독블록을 쪼개면서 **하한 쪽에 남았고, 그 사이 far 가
 * 유도값으로 바뀌어 문장이 거짓이 됐다**(검수관 BL-1). far 상한 관계는 아래
 * `DOME_MAX` 독블록 한 곳이 소유한다 — 여기서 다시 말하지 않는다.
 *
 * ── 노브로 연 이유 (감독 지시 2026-08-05) ────────────────────────────────────
 * *"하늘도 천장이 좀 가까워. 하늘도 더 더 높아야 돼."*
 *
 * **돔이 플레이어를 따라오면(아래 `update`) 반경은 시차에 영향을 주지 않는다** — 어디에
 * 서든 같은 거리이므로 무한대로 읽힌다. 폴리곤 수도 반경과 무관하므로 키워도 비용이 같다.
 *
 * ── ⚠ 판정: **이 노브는 화면에 대해 죽어 있다** (감독 실기기 2026-08-06) ─────
 * 여기 이어서 *"그래서 반경이 정하는 것은 **천장의 높이감**(같은 화각에서 하늘이 덮는
 * 곡률)과 돔 안쪽 레이어의 스케일이다"* 라고 적혀 있었다. **거짓이다.**
 *
 * 감독이 `dome=520` 과 `dome=6000` 스크린샷 두 장을 나란히 올려 *"현재 같은데?"* 로
 * 잡았다. 두 화면은 별 크기·밀도·색까지 구별되지 않았다. 이유는 앞 문단이 이미 말하고
 * 있다 — **카메라를 따라오는 구의 반경은 카메라 중심 스케일 변환**이고, 원근 투영에서
 * 그것은 화면 각도를 하나도 바꾸지 않는다. 구름·별 레이어도 같은 배율(`0.94`·`0.97`)로
 * 따라 커지므로 상대 각도가 동일하고, 텍스처는 UV 매핑이라 **각도당 텍셀 수도 반경과
 * 무관**하다(`sky.js` 의 `DOME_W` 는 반경과 독립인 고정 2048 이다).
 *
 * **참인 앞 문단에서 성립하지 않는 결론을 뽑았다** — `CLAUDE.md` 가 이름 붙인 그 형태이고,
 * 이번에는 그 위에서 감독께 **높이 후보 링크를 다섯 개** 드렸다. 감독이 눌러 보고 같다는
 * 것을 발견하기 전에 **내가 한 번이라도 화면을 봤으면** 드리지 않았을 링크다.
 *
 * ── 그러면 무엇을 남기는가 ──────────────────────────────────────────────────
 * 상한을 되돌리지는 **않는다.** far 유도(`main.ts`)는 여전히 맞는 구조이고, 훗날 돔이
 * 카메라 추종을 **그만두는** 설계(예: 실제 원경 지오메트리 도입)로 가면 반경이 다시
 * 살아난다. 지금은 **"이 노브로는 하늘 높이를 못 고친다"** 를 여기 적어 두는 것이
 * 값이다 — 다음 사람이 같은 링크를 또 만들지 않도록.
 *
 * 실제 축은 별의 **각크기**다 — 아래 `STAR_SCALE`.
 */
const DOME_MIN = 300;

/**
 * 돔 반경 상한. **카메라 far 가 이 값에서 유도된다**(`main.ts`) — 여기만 올리면 카메라가
 * 따라온다. 반대로 하면(far 를 손으로 적으면) 돔이 far 를 넘는 날 하늘이 잘리는데,
 * 화면에는 "하늘이 사라졌다" 로 보여 원인을 찾기 어렵다.
 *
 * ── 6000 인 이유 (감독 문의 2026-08-05 *"하늘 높이 4000 가능?"*) ──────────────
 * 예전 상한은 1100 이었고 카메라 far 1200 에 맞춘 값이었다. **far 를 올리는 실질
 * 비용이 없다** — 깊이 정밀도 저하는 `near` 만 고정이면 다음 비율이다:
 *
 *     (1/near − 1/far₂) / (1/near − 1/far₁)
 *     = (1/0.1 − 1/7500) / (1/0.1 − 1/1200) = 1.00007  →  **0.007% 저하**
 *
 * ⚠ **이 형태로 적는 이유**(검수관 BL-2). 처음엔 *"24비트에서 z=76.8m 일 때 3.515mm →
 * 3.516mm"* 라고 적었다. 참이지만 **전제가 셋(비트수·고정소수점·특정 z) 붙어 있어**
 * 그중 하나만 바뀌어도 근거가 썩는다.
 *
 * 위 비율은 `Δz = Δd · (1/n − 1/f) · z²` 에서 `Δd·z²` 가 양쪽에 공통이라 약분된 것이다.
 * **그 약분은 양자화 간격 `Δd` 가 균일할 때만 성립한다** — 고정소수점이면 `Δd = 2^-bits`
 * 로 상수라 z·비트수와 무관해진다(16비트든 24비트든, WebGPU 의 `depth24plus` 도 여기).
 *
 * ⚠⚠ **float 깊이(reversed-Z)에는 적용되지 않는다.** `Δd = ulp(d) ∝ d` 라 약분이 안 되고
 * z 의존이 되살아난다 — 검수관 실측으로 z=76.8m 에서 **5.74%**(위 0.007% 의 820배)다.
 * 결론(*"far 를 키워도 실질 비용 없음"*)은 그래도 살아 있지만(float 은 절대 정밀도가
 * 애초에 훨씬 좋다), **이 비율식을 그 케이스에 쓰면 안 된다.** three 는 reversed-Z 를
 * 쓰지 않으므로 현재 구성엔 해당 없다.
 *
 * ⚠⚠ **내가 여기서 논지를 확대했다**(검수관 조건 1). 처음엔 *"버퍼 포맷에도 의존하지
 * 않는다 — reversed-Z float 든 0.007% 다"* 라고 적었고 **거짓이었다.** 더 나쁜 것은 그
 * 거짓 절이 *"WebGPU 미검증이 사각이 아니다"* 를 떠받치고 있었다는 점이다 — 알려진
 * 사각을 은퇴시키는 근거가 검증 가능하게 거짓이었다. **거짓이 된 문장을 지우는 커밋
 * 안에서 같은 형태를 한 단계 위에 재생산한 것**이고, `CLAUDE.md` 가 이름 붙인
 * *"참인 문장에서 성립하지 않는 결론을 뽑는 것"* 그대로다.
 *
 * ── WebGPU 에 대한 **참인** 근거 (검수관 제시) ────────────────────────────────
 * WebGL 과 WebGPU 의 실제 깊이 차이는 **NDC 규약**이다(`[-1,1]` vs `[0,1]`). 그것은
 * 깊이값의 **아핀 변환**이고, **위의 `Δd` 균일 전제 아래에서** 비율에서 약분된다.
 * 양쪽 다 `depth24plus`(고정소수점)이므로 그 전제가 성립하고, 따라서 이 항목에 한해
 * 백엔드 미검증이 사각이 아니다.
 *
 * ⚠⚠⚠ **전제를 다시 적는 이유 — 같은 형태를 한 단계 작은 규모로 또 만들었다**
 * (검수관 재확인). 처음엔 *"아핀 변환이라 정확히 약분된다"* 고 **무조건**으로 적었다.
 * **반례가 바로 위에 있다**: reversed-Z 와 표준 깊이는 서로 아핀 관계인데(`d_rev =
 * 1 − d_std`, near/far 교환) float 에서 같은 far 변경에 대해 **0.0000% vs 5.744%** 로
 * 갈린다. 즉 무조건 형태로 읽으면 `:106` 과 정면으로 모순된다.
 *
 * 앞 문단에서 *"거짓이 된 문장을 지우는 커밋 안에서 같은 형태를 재생산했다"* 고 적어
 * 놓고, **그 대체 근거에서 또 전제를 뺐다.** 고백을 적는 것과 형태를 안 반복하는 것은
 * 다른 일이다 — 전제가 붙는 주장은 전제를 **문장마다** 지고 다녀야 한다.
 *
 * 그리고 **같은 표를 `main.ts` 에도 적었다가 곧바로 어긋났다** — 거기는 7500, 여기는
 * 5000 이라고 썼는데 5000 은 코드 어디에도 없는 값이었다. 값 미러링을 없애는 커밋이
 * 값 미러링을 만든 셈이다. 근거는 **여기 한 곳**이 소유하고 `main.ts` 는 참조만 한다.
 *
 * 6000 은 감독 요청(4000)에 여유를 얹은 값이다 — 4000 을 보시고 더 올리고 싶을 때
 * 다시 배포하지 않아도 되게. **상한이 곧 후보 범위**이고 판정은 감독 실기기다.
 */
export const DOME_MAX = 6000;
const DOME_RADIUS = readNum('dome', 520, DOME_MIN, DOME_MAX);

/**
 * 별의 **각크기** 배수 — 감독 실기기 판정용 노브(`?star=`).
 *
 * ── 왜 이 축인가 (감독 실기기 2026-08-06) ───────────────────────────────────
 * 감독이 `dome=520` 과 `dome=6000` 스크린샷 두 장을 나란히 올려 *"현재 같은데?"* 로
 * 잡았다. 두 화면은 실제로 구별되지 않았고, **그게 맞다** — 돔이 카메라를 따라오면
 * 반경은 카메라 중심 스케일 변환이라 화면 각도를 하나도 안 바꾼다. `?dome=` 은 화면에
 * 대해 **죽은 노브**다(위 `DOME_MAX` 독블록의 *"천장 높이감은 바뀐다"* 가 거짓이었다).
 *
 * 진짜 축은 **각크기**다. 계산은 `sky.js` 의 `paintTwinkleStars` 독블록 한 곳이
 * 소유한다(여기에 다시 적지 않는다) — 요지는 `scale=1` 에서 십자 별이 **보름달의
 * 8.9배**라는 것이고, 그래서 하늘이 아니라 벽지로 읽힌다.
 *
 * 하한 0.1 은 `paintTwinkleStars` 의 개수 역수 계산이 나누는 값과 같은 바닥이다 —
 * 거기서 `Math.max(0.1, scale)` 로 한 번 더 막으므로 노브가 그 아래로 가도 개수는
 * 안 터진다. 상한 2 는 "지금보다 크게"도 비교할 수 있게 열어 둔 것이다.
 *
 * ── 0.25 인 이유 — 감독 판정 (2026-08-06) ───────────────────────────────────
 * 후보 다섯을 라이브 링크로 드렸고 감독이 **`?star=0.25` 를 골랐다**("이게 낫다").
 * 실측표(계산은 `1px = 360°/2048 = 0.1758°`):
 *
 *   scale │  개수 │  광구°  │  십자°  │ 광구/보름달 │ 십자/보름달
 *   ──────┼───────┼─────────┼─────────┼─────────────┼────────────
 *   1     │    34 │  1.976  │  4.557  │        3.80 │       8.76   ← 옛 고정값
 *   0.6   │    57 │  1.189  │  2.738  │        2.29 │       5.27
 *   0.4   │    85 │  0.806  │  1.845  │        1.55 │       3.55
 *   **0.25**│ **136** │**0.504**│**1.153**│    **0.97** │   **2.22** ← 채택
 *   0.15  │   227 │  0.302  │  0.692  │        0.58 │       1.33
 *
 * **광구가 보름달과 거의 같아지는 지점(0.97배)이다.** 감독이 가장 작은 0.15 를 고르지
 * 않은 것도 정보다 — 물리적 사실(맨눈 별 번짐 0.1° 미만)에 맞추면 별이 점이 되어
 * 밤하늘의 **연출**이 사라진다. 판정 기준은 사실성이 아니라 **"벽지로 안 읽히는 최대"** 였다.
 *
 * ── 경계 — 여기서 멈춘다 ────────────────────────────────────────────────────
 * 더 줄이는 축은 **열지 않는다.** 감독이 0.25 에서 만족했고, 그 아래는 위 표대로
 * 개수만 늘어(0.15→227개) 페인트 비용을 쓰면서 화면 인상은 "점점 더 점" 으로 수렴한다.
 * 다음에 밤하늘이 문제로 올라오면 **각크기가 아니라 다른 축**(수평선·안개·은하수 대비)을
 * 먼저 본다 — 이 축은 감독 판정으로 닫혔다.
 *
 * ⚠ **라이브 world1 은 여전히 `scale=1` 이다.** 기본값을 바꾼 것은 이 파일(world2)뿐이고
 * `sky.js` 의 파라미터 기본값은 1 그대로다. 두 월드가 다른 하늘을 갖는 것은 의도다 —
 * world1 은 서비스 중이고 이 판정은 world2 화면에서 받았다.
 */
const STAR_SCALE = readNum('star', 0.25, 0.1, 2);

/** `sky.js`가 `get()`으로 돌려주는 **반영된** 상태(요청이 아니다 — 조합 보정이 적용된 결과). */
export interface SkyState {
  time: string;
  weather: string;
  fx: Record<string, boolean>;
  flashSafe?: boolean;
  /**
   * **지금 그려지는 것이 논리 상태와 아직 일치하지 않는가.** `time`/`weather`는 `set()`
   * 즉시 새 값이 되지만 화면에 올라가는 메시 집합은 잠시 다르다(돔 크로스페이드 + 별
   * 반짝임 감쇠 꼬리). 드로우콜 판정이 이 구간을 구별해야 한다.
   *
   * 어떤 축이 여기 들어가는지는 **`sky.js`가 안다** — 소비자가 세지 않는다. 세 번 연속으로
   * 축을 빠뜨린 뒤 내린 결론이다.
   */
  settling?: boolean;
  /**
   * 저사양 축소 모드. 구름·별 레이어를 아예 끄므로 **드로우콜 판정 키에 들어가야 한다**
   * (전이가 아니라 다른 상태다). world2는 아직 `setLite`를 부르지 않지만 값은 노출된다.
   */
  lite?: boolean;
}

/**
 * 낮 하늘 파랑 강도. 감독 지시 2026-08-12: *"지금 하늘 색이 파랗지 않아"*.
 *
 * 0 이면 옛 화면과 **바이트 동일**이고 1 이 새 기본이다(`?skyblue` 로 연다). 유도·근거는
 * `sky.js` 의 `dayStops` 머리말 한 곳 — 여기에 색을 다시 적지 않는다.
 */
export const SKY_BLUE = 2;
// ⚠ 1 → 2 (감독 실기기 확정 2026-08-12). 감독이 `?skyblue=2&cloudh=0.4&fogsky=1` 링크를
// 보고 *"이것으로 결정하자"* 로 판정했다. 1 은 그 판정 직전의 후보였다.
/** `?skyblue` 상한. 1 초과는 외삽이라 더 진해진다 — 감독이 화면에서 고를 여지를 남긴다. */
export const SKY_BLUE_MAX = 4;
// ⚠ 1.5 였던 것을 올렸다 — 감독 실기기 2026-08-12: *"더 진한 파랑보다 더 파란것을 보고
// 싶어."* 상한이 판정을 가로막고 있었다. 외삽이라 빨강이 0 에 닿으면 더는 안 파래진다.

/**
 * 구름 곡률 원근 강도. 감독 지시 2026-08-12: *"지구는 둥글고 구름은 지구를 중심으로
 * 구형으로 있어서 하늘의 구름이 지금과 다르게 보여"*.
 *
 * 0 이면 옛 동작(각도에 선형), 1 이 새 기본이다(`?cloudcurve`). 수식은 `sky.js` 의
 * `cloudElev` 머리말 한 곳이다.
 */
export const CLOUD_CURVE = 1;

/**
 * 구름 고도비(`?cloudh`). 감독 실기기 2026-08-12: *"구름이 뒤로... 쭉 늘어진."*
 *
 * 생략하면 `sky.js` 의 `CLOUD_EPS`(체감값 0.05)를 쓴다. **실제 물리값 0.0003 도
 * 노브로 볼 수 있다** — 왜 실제 값이 화면을 깨뜨리는지는 `sky.js` 의 `CLOUD_EPS`
 * 머리말 한 곳이다.
 */
export const CLOUD_H_MIN = 0.0003;
export const CLOUD_H_MAX = 1;
// ⚠ 상한 0.4 → 1 (2026-08-12). 감독이 확정한 값이 **정확히 옛 상한(0.4)** 이라 그
// 판정이 "0.4 가 좋다" 인지 "상한이 막고 있다" 인지 갈리지 않는다. `?skyblue` 상한이
// 같은 이유로 이미 한 번 올라갔다(1.5→4, *"더 진한 파랑보다 더 파란것을 보고 싶어"*).
// **끝값이 판정을 가로막으면 그 자리에서 나온 판정은 값이 아니라 벽을 잰 것이다.**

/**
 * 구름 고도비 기본값 — 감독 확정 2026-08-12 (`?cloudh=0.4`).
 *
 * 0 은 *"지정 안 함"* 이라 `sky.js` 의 `CLOUD_EPS`(0.05)로 떨어진다. 그 값에서 감독이
 * *"구름이 뒤로... 쭉 늘어진"* 을 지적했고, 키우는 방향으로 후보를 열어 0.4 가 확정됐다.
 */
export const CLOUD_H = 0.4;

/**
 * 안개 하늘색 틴트 — 숫자는 전 시간대 공통(축약형), 객체는 시간대별.
 *
 * 시간대 목록은 `SkyTime` 을 **유도해서** 쓴다 — 여기에 `'day' | 'sunset' | 'night'` 를
 * 다시 적으면 시간대가 하나 늘어나는 날 이 타입만 옛 목록에 남는다(값 미러링).
 * `Partial` 인 것은 일부만 지정하는 소비자를 위한 것이고, 빠진 시간대는 `sky.js` 의
 * `lightOf` 가 0(= 팔레트 원본)으로 읽는다.
 */
export type FogTint = number | Readonly<Partial<Record<SkyTime, number>>>;

export interface SkyOptions {
  /** 소프트웨어 렌더 여부 — 크로스페이드 스냅·저해상 돔·강수 축소 분기 */
  soft?: boolean;
  /** 낮 하늘 파랑(`?skyblue`). 생략하면 `SKY_BLUE` */
  skyBlue?: number;
  /** 구름 곡률 원근(`?cloudcurve`). 생략하면 `CLOUD_CURVE` */
  cloudCurve?: number;
  /** 구름 고도비(`?cloudh`). 생략하면 `CLOUD_H` */
  cloudH?: number;
  /** 초기 시간대·날씨. 오픈월드 기본은 야간 맑음(커밋 `318addf` 감독 확정) */
  time?: string;
  weather?: string;
  /**
   * 밤 밝기 축의 튜닝값(URL 노브). 없으면 `decide/night.ts` 의 기본값.
   *
   * 배선이 읽어 여기로 넘기는 이유는 판정을 순수하게 두기 위해서다 — `decide/` 가
   * `location` 을 읽는 순간 테스트가 브라우저를 필요로 하게 된다.
   */
  nightTune?: NightTune;
  /**
   * 안개를 하늘색 쪽으로 미는 계수(0..1). 감독 지시 *"안개를 약간 하늘색으로"*.
   *
   * `sky.js` 의 **팔레트 단계**로 넘어간다. 안개색은 하늘 돔 지평선도 함께 칠하므로
   * (⑨ 규칙) 나중에 `scene.fog` 만 바꾸면 둘이 어긋나 원경이 하늘보다 밝게 뜬다 —
   * 이미 그렇게 깨뜨려 감독이 *"안개가 안보여"* 로 잡은 적이 있다.
   *
   * 기본 0 이면 `sky.js` 가 테이블 객체를 그대로 돌려주므로 라이브와 완전히 같다.
   *
   * **숫자면 전 시간대 공통, 객체면 시간대별**이다(감독 판정 2026-08-12 *"주간/야간 따로
   * 가야해"*). 뜻·근거는 `sky.js` 의 `lightOf` 머리말 한 곳이다.
   */
  fogTint?: FogTint;
  /**
   * 광원을 타깃에서 얼마나 물릴 것인가(m). **그림자 카메라의 위치를 정하는 값**이다.
   *
   * 방향광이라 조명 결과는 이 거리와 무관하다. 조립부가 `decide/shadow.ts` 로 프러스텀과
   * **함께** 유도해 주입한다 — 둘이 따로 놀면 씬이 카메라 뒤로 밀려 그림자가 통째로
   * 사라지는데, 화면에는 "원래 그림자가 없는 것" 과 똑같이 보인다.
   */
  sunDist?: number;
  /**
   * 그림자 맵 텍셀 한 변의 월드 크기(m). 있으면 태양 추종점을 이 격자에 스냅한다 —
   * 서브텍셀 이동이 만드는 그림자 반짝임을 없앤다(`decide/shadow.ts` 의
   * `snapToShadowTexel` 주석이 근거의 SSOT). `sunDist` 와 함께 `shadowFrustum()` 이
   * 유도한 값을 조립부가 주입한다. 없으면 스냅 없이 종전 동작.
   */
  shadowTexel?: number;
  /**
   * 낮 조명 세기(URL 노브). 없으면 `decide/daylight.ts` 의 상수.
   *
   * 낮 팔레트는 라이브 오픈월드와 공유하는 `sky.js` 에 있어 거기서 못 바꾼다 —
   * world2 쪽에서 낮에만 덮어쓴다.
   */
  dayLight?: Partial<DayLightMix>;
  /**
   * 발바닥에서 눈까지(m). **수평선 밴드의 기하가 전부 이 값에서 나온다**
   * (`decide/horizon.ts`). 없으면 밴드를 만들지 않는다 — 눈높이를 추측해 그리면
   * 수평선이 실제와 다른 자리에 서고, 그것은 "밴드가 없는 것" 보다 나쁘다.
   */
  eyeHeight?: number;
  /**
   * 카메라의 **월드 y**. 밴드를 눈높이에 놓는 데 쓴다.
   *
   * `getPos` 가 x·z 만 주는 것은 돔에는 y 가 필요 없었기 때문이다(반경 520m 에서
   * 1.7m 는 0.19°). 밴드는 반경이 51.2m 라 같은 오프셋이 1.9° — 밴드 폭의 63% 다.
   * 그래서 이것만 따로 받는다. 없으면 `eyeHeight` 를 평지 가정으로 쓴다.
   */
  getEyeY?: () => number;
}

/**
 * 주입용 스카이돔 껍데기.
 *
 * `sky.js`가 부팅 직후 `sky.geometry`를 자기 것으로 교체하고 텍스처도 직접 굽는다.
 * 그래서 여기서는 "BackSide·fog 없음·먼저 그려지는 메시"라는 **형태만** 맞춰 준다.
 */
function makeDome(): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 24, 12), mat);
  m.renderOrder = -1;
  m.frustumCulled = false;
  return m;
}

/**
 * 하늘 System. `sky.js`를 소유하고 커널 프레임에 물린다.
 *
 * 배선은 라이브 오픈월드와 같은 **3접점**이다 — 생성 / `update` / `getSunDir`.
 * 조명색·안개·클리어색은 `sky.js`가 자기 소유로 제어하므로 여기서 건드리지 않는다.
 */
export class SkySystem implements System {
  readonly name = 'sky';

  private readonly dome: THREE.Mesh;
  private readonly engine: ReturnType<typeof createSkySystem>;
  private readonly sun: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly scene: THREE.Scene;
  /** 밤 노출을 얹을 대상. `toneMappingExposure` 만 만진다 */
  private readonly renderer: ExposureLike | null;
  private readonly nightTune?: NightTune;
  /** 플레이어 위치 — 그림자 카메라를 따라오게 하는 데 쓴다 */
  private readonly getPos: () => { x: number; z: number };
  private readonly sunDist: number;
  /** 그림자 텍셀(m). 0 이면 스냅 없음 — `SkyOptions.shadowTexel` 참조 */
  private readonly shadowTexel: number;

  /**
   * 마지막으로 이벤트에 실은 조명·안개 값. **변했을 때만** 찍으려고 들고 있다.
   *
   * ── 왜 (감독 실기기 2026-08-10) ────────────────────────────────────────────
   * *"뒤로 갈때 그림자가 꺼지던지 조명이 꺼진것같아"*
   *
   * 코드를 읽어서는 여기까지가 한계였다 — 조명 세기는 **시간대에만** 의존하고
   * (`applyDayContrast`), 그림자 프리즈(`freezeShadows`)는 world2 에서 **호출부가 0건**
   * 이며, 적응계는 그림자 제어기를 아예 두지 않는다(`decide/adapt.ts` 머리 주석).
   * 즉 **코드상으로는 후진이 조명을 건드릴 경로가 없다.**
   *
   * 그런데 감독 화면에서는 그렇게 보인다. 둘 중 하나다 — 내가 못 본 경로가 있거나,
   * 조명이 아닌 다른 것이 조명처럼 보이거나. **그 둘을 가르는 것이 이 값들이다.**
   * 안 변하면 조명은 범인이 아니고, 변하면 무엇이 언제 변했는지가 그 자리에 찍힌다.
   *
   * `-1` 은 "아직 한 번도 안 찍었다" 는 뜻이다(세기·거리는 음수가 될 수 없다).
   * 첫 프레임에 반드시 한 번 찍혀 **기준값이 리포트에 남는다** — 기준이 없으면
   * 나중 값이 높은지 낮은지 읽는 사람이 알 수 없다.
   */
  private lastSunI = -1;
  private lastHemiI = -1;
  private lastFogFar = -1;
  private readonly dayLight?: Partial<DayLightMix>;
  /**
   * 수평선 밴드. `?hz=0` 이거나 `eyeHeight` 를 안 받으면 `null` 이고, 그때 화면은
   * 이 기능이 들어오기 전과 **한 픽셀도 다르지 않다**(대조군이 곧 그 상태다).
   */
  private readonly horizon: HorizonBand | null;
  /** 밴드를 놓을 눈 y. 주입이 없으면 평지 눈높이 */
  private readonly getEyeY: () => number;
  /**
   * 밴드에 실제로 들어가는 색(팔레트를 향해 스무딩된 값)과 그 목표. 프레임마다 새
   * `Color` 를 만들지 않으려고 둘을 재사용한다 — 매 프레임 도는 자리다.
   */
  private readonly horizonTint = new THREE.Color();
  private readonly horizonTarget = new THREE.Color();
  /**
   * 지금 밴드에 걸린 세기. 목표(`bandStrength(time)`)를 향해 색과 **같은 시정수로**
   * 따라간다.
   *
   * 색만 스무딩하고 세기를 즉시 대입하면 낮↔밤 전환에서 수평선 대비만 계단으로 튄다
   * (낮 0.75 · 밤 0.3 — 두 배 넘는 차다). 하늘 돔은 1.8초 크로스페이드로 넘어가므로
   * 그 계단은 화면에서 "수평선이 먼저 바뀌는" 것으로 보인다. `-1` 은 미초기화 표식이다
   * — 첫 프레임에 목표로 즉시 맞춰 부팅 직후의 페이드인을 없앤다.
   */
  private horizonDim = -1;
  /** 팔레트 조회에 그대로 넘긴다 — 안개 틴트가 걸린 색이 곧 지평선 색이다 */
  private readonly fogTint: FogTint;

  constructor(
    scene: THREE.Scene,
    renderer: unknown,
    sun: THREE.DirectionalLight,
    hemi: THREE.HemisphereLight,
    getPos: () => { x: number; z: number },
    opts: SkyOptions = {},
  ) {
    this.scene = scene;
    this.sun = sun;
    this.hemi = hemi;
    // 렌더러가 `unknown` 인 것은 `sky.js` 가 이 인자를 그대로 쓰기 때문이다(어떤 백엔드든
    // 받는다). 노출을 만지려면 모양을 확인해야 하는데, 확인되지 않으면 `null` 로 두고
    // **건너뛴다** — 없는 속성에 값을 쓰면 조용히 아무 일도 안 일어나고, 그러면 "노출을
    // 올렸는데 화면이 그대로" 라는 가장 찾기 어려운 실패가 된다.
    const r = renderer as { toneMappingExposure?: unknown } | null;
    this.renderer = r && typeof r.toneMappingExposure === 'number' ? (r as ExposureLike) : null;
    this.nightTune = opts.nightTune;
    this.getPos = getPos;
    this.sunDist = opts.sunDist ?? SUN_DIST_FALLBACK;
    this.shadowTexel = opts.shadowTexel ?? 0;
    this.dayLight = opts.dayLight;
    this.dome = makeDome();
    this.dome.name = 'world2:sky';
    scene.add(this.dome);

    this.engine = createSkySystem({
      scene, renderer, sun, hemi, sky: this.dome,
      getPos,
      soft: opts.soft ?? false,
      // world2에는 아직 바다가 없다 — 수면 빛반사를 끈다.
      waterY: null,
      fogTint: opts.fogTint ?? 0,
      starScale: STAR_SCALE,
      // 감독 지시 2026-08-12 — *"파란 하늘"* 과 *"둥근 지구의 구름"*. `sky.js` 쪽 기본은
      // 0(옛 화면)이고 **world2 만 새 값을 기본으로 켠다** — 판정을 받은 것이 이 월드의
      // 화면이기 때문이다. 근거·수식은 `sky.js` 의 `cloudElev`·`dayStops` 머리말 한 곳이다.
      skyBlue: opts.skyBlue ?? SKY_BLUE,
      cloudCurve: opts.cloudCurve ?? CLOUD_CURVE,
      cloudH: opts.cloudH ?? CLOUD_H,
    });
    // 수평선 밴드 — 바다와 하늘의 경계(태스크 #202). 왜 이 축인지·왜 안개 far 를 밀지
    // 않는지는 `decide/horizon.ts` 머리말 한 곳이 소유한다.
    const eyeH = opts.eyeHeight;
    this.fogTint = opts.fogTint ?? 0;
    this.getEyeY = opts.getEyeY ?? (() => eyeH ?? 0);
    this.horizon = eyeH !== undefined ? createHorizonBand(scene, eyeH) : null;
    // 첫 프레임부터 맞는 색으로 뜨게 한다. 스무딩만 두면 부팅 직후 검정에서 올라오는
    // 것이 보인다 — 로딩 화면 뒤라 짧지만, 시작값이 없는 스무딩은 그 자체가 결함이다.
    if (this.horizon) {
      const st = this.engine.get();
      this.horizonTint.set(lightOf(st.time, st.weather, this.fogTint).fog);
    }
    // 오픈월드 기본 하늘 = 야간 맑음. fade 0으로 즉시 적용(부팅 중 크로스페이드 낭비 방지).
    this.engine.set(
      { time: opts.time ?? 'night', weather: opts.weather ?? 'clear' },
      { fade: 0 },
    );
    this.applySun();
  }

  /** 하늘 그림의 해·달 방위와 그림자 방향을 맞춘다. */
  private applySun(): void {
    const d = this.engine.getSunDir();
    if (!d) return;
    // ── 그림자 카메라를 플레이어에 붙인다 (감독 지시 2026-08-02) ──────────────
    // 예전에는 `sun.position` 만 옮겼다. `DirectionalLight.target` 은 기본이 **월드
    // 원점**이라 그림자 카메라도 원점에 서 있었고, 플레이어가 광장을 벗어나면 그림자가
    // 발밑에서 통째로 사라졌다. 조명 방향은 멀쩡했으므로 **화면은 "원래 그림자가 옅은
    // 세계" 처럼 보였다** — 이것이 감독이 *"하드라이트 느낌이 없어"* 로 잡은 증상의
    // 절반이다(나머지 절반은 프러스텀이 ±5m 였던 것).
    //
    // 타깃 높이를 0 으로 두는 것은 지면 기준이기 때문이다. 눈높이를 따라가면 카메라가
    // 위아래로 흔들려 그림자 텍셀이 매 프레임 어긋난다.
    // 추종점을 텍셀 격자에 스냅한다 — 서브텍셀 이동이 만드는 그림자 반짝임 방지.
    // 근거는 `decide/shadow.ts` 의 `snapToShadowTexel` 주석 한 곳이다.
    const raw = this.getPos();
    const p = this.shadowTexel > 0
      ? snapToShadowTexel(raw.x, raw.z, d.x, d.y, d.z, this.shadowTexel)
      : raw;
    this.sun.target.position.set(p.x, 0, p.z);
    // 타깃은 씬에 들어 있어야 갱신된다(조립부가 `scene.add(dir.target)` 를 한다).
    // 그래도 여기서 한 번 더 미는 이유: 프레임 순서상 렌더보다 늦게 갱신되면 한 프레임
    // 낡은 방향으로 그림자가 그려진다.
    this.sun.target.updateMatrixWorld();
    this.sun.position.set(
      p.x + d.x * this.sunDist,
      d.y * this.sunDist,
      p.z + d.z * this.sunDist,
    );
  }

  update(ctx: FrameCtx): void {
    if (ctx.hidden) return;
    // ── 돔을 플레이어에게 붙인다 (감독 실기기 2026-08-05) ──────────────────────
    //
    // ⚠ 여기 *"돔이 플레이어를 따라오게 하는 것도 `sky.js`가 주입받은 `getPos`로 직접
    // 처리한다"* 고 적혀 있었다. **거짓이었다.** `sky.js` 의 `getPos()` 결과가 실제로
    // 가는 곳은 비·눈·윤슬·무지개·오로라뿐이고(`sky.js:1139,1157,1163,1170,1177`),
    // **돔 위치를 갱신하는 코드는 없다.** 라이브 world1 은 소비자 쪽에서 채운다:
    //
    //     frontend/js/world.js:1262    sky.position.set(pos.x, 0, pos.z);
    //
    // world2 에는 그 한 줄이 없었다. `sky.js` 는 추종을 **전제로** 설계돼 있고
    // (`sky.js:637` *"sky가 카메라 추종이므로 자식으로 두면 자동 동행"*), 그 계약을
    // world2 만 안 지킨 것이다. 주석은 계약을 읽고 "처리된다" 고 적었다 — **누가**
    // 처리하는지를 확인하지 않은 채.
    //
    // ── 감독이 본 것 (실측) ──────────────────────────────────────────────────
    // *"그 구가 너무 작아 … 별이 보이는 게 아니라 바로 앞에 있는 벽지가 보이는 것 같아.
    //   그리고 하늘도 천장이 좀 가까워."*
    //
    // 돔이 원점 고정이고 세계 반쪽이 480m(`worldHalfExtent(32)`)이므로:
    //
    //   원점        앞쪽 벽 520m · 천장 520m · 안개 100%(안 보임)
    //   440m 지점   앞쪽 벽  80m · 천장 277m · 안개 100%(아직 가려짐)
    //   480m(바다)  앞쪽 벽  40m · 천장 200m · **안개 0%** ← 안개 near(51.2m)보다 가깝다
    //
    // 즉 세계 끝에서 하늘 텍스처가 **40m 앞에 아무 감쇠 없이** 드러나고, 천장은 520 →
    // 200m 로 내려앉는다. 감독의 세 문장이 전부 이 표에 있다.
    //
    // ── 왜 y 는 0 으로 두는가 ────────────────────────────────────────────────
    // `getPos` 는 x·z 만 준다. 눈높이 변화(≈1.6m)는 반경 520m 대비 0.3% 라 시차로
    // 안 읽히고, x·z 는 480m 로 92% 라 결정적이다. 라이브 world1 도 같은 이유로
    // `(pos.x, 0, pos.z)` 다 — **두 월드가 같은 규약을 쓰게 둔다.**
    //
    // 구름·별·크로스페이드 돔은 전부 `sky.add(...)` 로 이 메시의 **자식**이라 함께 온다.
    const p = this.getPos();
    this.dome.position.set(p.x, 0, p.z);

    // 크로스페이드·강수·오로라·번개 진행. 조명·안개·클리어색 갱신도 여기서 일어난다.
    this.engine.update(ctx.dt);
    this.applySun();
    this.liftNightLights();
    this.applyDayContrast();
    this.updateHorizon(p, ctx.dt);
    this.probeLighting(ctx);
  }

  /**
   * 조명·안개가 **변했을 때만** 이벤트로 낸다. 위 `lastSunI` 주석이 근거의 SSOT 다.
   *
   * 매 프레임 찍지 않는 이유: 60Hz 로 쌓으면 이벤트 상한(600건)이 10초에 차서 마크
   * 주변이 통째로 밀려난다 — **계측이 계측을 지우는** 형태가 된다.
   */
  private probeLighting(ctx: FrameCtx): void {
    if (!ctx.probe) return;
    const si = (this.sun as unknown as SunLike).intensity;
    if (Number.isFinite(si) && si !== this.lastSunI) {
      this.lastSunI = si;
      ctx.probe('ev:태양세기', si);
    }
    const hi = (this.hemi as unknown as HemiLike).intensity;
    if (Number.isFinite(hi) && hi !== this.lastHemiI) {
      this.lastHemiI = hi;
      ctx.probe('ev:반구광', hi);
    }
    // 안개 far 는 **거리로 어두워지는 두 번째 후보**다. 조명이 안 변하는데 화면이
    // 어두워지면 이쪽을 본다(밤 안개색은 거의 검정이라 far 가 줄면 더 빨리 묻힌다).
    const fog = this.scene.fog as { far?: number } | null;
    const ff = fog?.far;
    if (typeof ff === 'number' && Number.isFinite(ff) && ff !== this.lastFogFar) {
      this.lastFogFar = ff;
      ctx.probe('ev:안개far', ff);
    }
  }

  /**
   * 수평선 밴드 갱신.
   *
   * ── 색 기준을 `scene.fog.color` 에서 **팔레트로** 옮겼다 (실측이 뒤집었다) ──
   * 첫 판본은 `scene.fog.color` 를 읽었다. 밴드가 노려야 하는 것은 **하늘 돔 지평선의
   * 색**이고(`sky.js` ⑨ *"지평선 = fog색"*), 안개도 같은 팔레트에서 나오니 같을
   * 것이라고 생각했다. **두 군데서 틀렸다.**
   *
   * ① `liftNightLights` 가 `scene.fog.color` 에 밤 하한을 얹는다. 돔 텍스처에는 안
   *    얹으므로 둘은 밤에 어긋나 있다(실측 화면 휘도: 하늘 98 · 안개 143).
   * ② 그래서 하한 **앞에서** 읽도록 순서를 바꿨는데 **아무 차이가 없었다.**
   *    `sky.js` 의 `applyLighting` 은 **크로스페이드 중에만** 불린다(`sky.js:1085,1166`).
   *    평상시에 `scene.fog.color` 를 되돌려주는 코드가 없으므로, 한 번 얹힌 하한이
   *    그대로 고착된다 — 순서를 바꿔 읽어도 이미 밝혀진 값을 읽는다.
   *
   *    ⚠ 이것이 이 회차에서 가장 비쌌던 오판이다. 나는 "하한 앞에서 읽으면 팔레트
   *    색이다" 를 **코드 순서만 보고** 참이라고 적었고, 그 문장은 `applyLighting` 이
   *    매 프레임 돈다는 전제 위에서만 참이었다. 전제를 확인하지 않았다. 화면을 다시
   *    재지 않았다면 이 커밋은 "고쳤다" 고 적힌 채 아무것도 안 고쳤을 것이다.
   *
   * 그래서 **팔레트를 직접 묻는다.** `lightOf` 가 `sky.js` 의 색 SSOT 이고 돔 텍스처도
   * 같은 함수를 거친다 — 안개를 경유하지 않으니 하한도, 갱신 시점도 끼어들 자리가 없다.
   *
   * ── 부드럽게 따라간다 ─────────────────────────────────────────────────────
   * 팔레트는 `set()` 즉시 새 값이 되지만 화면의 돔은 1.8초 크로스페이드로 넘어간다.
   * 그대로 대입하면 시간대를 바꾸는 순간 **수평선만 먼저 점프**한다. 지수 스무딩으로
   * 따라가게 두면 그 점프가 사라진다 — `sky.js` 의 페이드 길이를 알 필요가 없다는
   * 것이 요점이다(알아야 하는 처방은 저쪽이 바뀌는 날 조용히 어긋난다).
   */
  private updateHorizon(p: { x: number; z: number }, dt: number): void {
    if (!this.horizon) return;
    const st = this.engine.get();
    // `lightOf` 는 `.fog` 에 팔레트 hex 를 준다. `Color.set(hex)` 가 sRGB→선형
    // 변환을 하고, 밴드 재질도 선형이라 공간이 맞는다.
    this.horizonTarget.set(lightOf(st.time, st.weather, this.fogTint).fog);
    // 시정수 ≈ 0.5초. `dt` 가 크게 튀어도 1 을 넘지 않게 자른다(탭 복귀 시 dt 폭주).
    const k = Math.min(1, dt * 2);
    this.horizonTint.lerp(this.horizonTarget, k);
    // 세기도 **같은 시정수로** 따라간다(위 `horizonDim` 주석). 시간대는 엔진에 묻는다 —
    // 밴드 색과 같은 출처를 봐야 색과 세기가 갈리지 않는다.
    const want = bandStrength(st.time);
    this.horizonDim = this.horizonDim < 0 ? want : this.horizonDim + (want - this.horizonDim) * k;
    this.horizon.update({ x: p.x, y: this.getEyeY(), z: p.z }, this.horizonTint, this.horizonDim);
  }

  /**
   * 밤이 너무 어둡지 않게 **하한**을 얹는다 (감독 지시).
   *
   * ── 왜 여기인가 ───────────────────────────────────────────────────────────
   * `sky.js` 의 밤 팔레트는 라이브 world1 도 쓴다. 거기서 값을 올리면 미술관 오픈월드의
   * 룩이 함께 바뀐다. 어댑터가 있는 이유가 이런 것이라 world2 쪽에서만 얹는다.
   *
   * ── 왜 곱셈이 아니라 max 인가 ────────────────────────────────────────────
   * 이 함수는 **매 프레임** 돈다. 배수를 곱하면 프레임마다 곱해져 발산한다. 하한은 몇
   * 번 적용해도 결과가 같아서(멱등), `sky.js` 가 값을 덮어쓰든 크로스페이드 중이든
   * 안전하다. "언제 덮어쓰는가" 를 알아야 하는 처방은 그 지식이 어긋나는 순간 깨진다.
   *
   * 지면색을 채널별로 올리는 것이 핵심이다. `HemisphereLight.groundColor` 는 아래에서
   * 올라오는 빛이라, 그것이 검정(원래 `0x232a24`, 명도 15%)이면 위를 향한 면에 닿는
   * 빛이 아예 없다. 강도를 올려도 검정을 곱하면 검정이다.
   */
  /**
   * 낮의 빛 대비를 world2 쪽에서만 얹는다 (감독 지시 2026-08-02 *"하드라이트 느낌이 없어"*).
   *
   * ── 왜 `sky.js` 가 아니라 여기인가 ────────────────────────────────────────
   * 낮 팔레트(`LIGHT.day.clear`)는 **라이브 오픈월드(`world.html`)와 공유하는 파일**에
   * 있다. 거기서 값을 바꾸면 감독이 지시하지 않은 라이브 화면이 함께 바뀐다 — 지시는
   * *"월드2"* 였다. `liftNightLights` 가 밤에 하한을 얹는 것과 똑같은 이유이고, 그
   * 함수 주석이 이미 같은 말을 적어 두었다.
   *
   * ── 대입이지 곱셈이 아니다 ───────────────────────────────────────────────
   * 이 함수는 **매 프레임** 돈다. 배수를 곱하면 프레임마다 곱해져 발산한다 —
   * `liftNightLights` 가 정확히 그 함정을 주석으로 경고하고 있고, 나는 처음에 배수로
   * 설계했다가 그 주석을 읽고 고쳤다. 대입은 몇 번 해도 결과가 같아(멱등) `sky.js` 가
   * 언제 값을 덮어쓰든 안전하다.
   *
   * 낮이 아니면 `dayLightMix` 가 `null` 을 돌려주고 여기서는 아무것도 안 한다 — 밤은
   * `liftNightLights` 소관이라 두 축이 같은 값을 반대로 당기지 않는다.
   */
  private applyDayContrast(): void {
    const mix = dayLightMix(nightness(this.engine.get().time), this.dayLight);
    if (!mix) return;
    (this.sun as unknown as SunLike).intensity = mix.sun;
    (this.hemi as unknown as HemiLike).intensity = mix.hemi;
  }

  private liftNightLights(): void {
    // 캐스팅하는 이유: `three/webgpu` 가 `HemisphereLight` 의 필드를 타입으로 완전히
    // 재수출하지 않는다(이 저장소가 `BufferGeometry`·`CanvasTexture`·`Object3D` 에서
    // 이미 겪은 TS2694 계열이다). 런타임 모양은 `HemiLike` 와 정확히 같다.
    applyNightFloor(
      {
        hemi: this.hemi as unknown as HemiLike,
        sun: this.sun as unknown as SunLike,
        renderer: this.renderer,
        // 안개는 `main.ts` 가 만들고 `sky.js` 가 매 프레임 색을 덮어쓴다. 우리는 그
        // **뒤에** 하한을 얹으므로 순서가 맞다(`update` 에서 engine 다음에 부른다).
        fog: (this.scene.fog as FogLike | null) ?? null,
      },
      this.engine.get().time,
      this.nightTune,
    );
  }


  /** 적응계가 부하를 낮출 때 — 하늘 투명 레이어 오버드로우를 줄인다. */
  setLite(on: boolean): void {
    this.engine.setLite(on);
  }

  /**
   * 부팅 예열 — 잠들어 있는 날씨 레이어를 잠시 켠다. 반환 함수로 되돌린다.
   *
   * 무엇이 잠들어 있는지 여기서 세지 않는다. `sky.js`가 자기 레이어 목록을 안다 —
   * 이 클래스가 세면 `sky.js`에 레이어가 하나 늘 때마다 조용히 빠진다.
   *
   * `?.`인 것은 이 어댑터가 `sky.js`의 옛 버전과도 물릴 수 있어서다. 없으면 예열을
   * 건너뛴다 — 첫 등장 비용을 세션 중에 낼 뿐 동작은 정상이다.
   */
  prewarm(): () => void {
    return this.engine.prewarm?.() ?? (() => {});
  }

  /**
   * 시간대·날씨·이벤트 변경(神 모드 패널·URL 파라미터용).
   *
   * `set` 직후 태양을 다시 맞춘다 — `sky.js`가 그림 속 해·달 방위를 바꾸는데 광원이 옛
   * 방향에 남아 있으면 그림자가 하늘과 어긋난다.
   */
  set(state: Record<string, unknown>, opt?: { fade?: number }): void {
    this.engine.set(state, opt);
    this.applySun();
  }

  get(): SkyState {
    return this.engine.get();
  }

  /**
   * 패널이 붙을 수 있게 엔진 자체를 내준다.
   *
   * `set`/`get`만 노출하는 얇은 창구다 — 패널이 `sky.js`의 나머지(update·dispose 등)를
   * 만지면 System이 소유권을 잃는다. 프레임 진행과 자원 반납은 끝까지 이 클래스 몫이다.
   */
  /** 번개 즉시 발동(비일 때만). 자동 발동은 평균 13~20초 간격이라 확인이 어렵다. */
  bolt(): boolean {
    return this.engine.bolt?.() ?? false;
  }

  get controls(): {
    set: SkySystem['set']; get: SkySystem['get']; bolt: SkySystem['bolt'];
  } {
    return {
      set: this.set.bind(this),
      get: this.get.bind(this),
      bolt: this.bolt.bind(this),
    };
  }

  dispose(): void {
    this.engine.dispose();
    this.horizon?.dispose();
    this.scene.remove(this.dome);
    this.dome.geometry.dispose();
    const m = this.dome.material as THREE.MeshBasicMaterial;
    m.map?.dispose();
    m.dispose();
  }
}
