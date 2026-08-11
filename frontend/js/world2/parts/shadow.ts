// world2/parts/shadow.ts — 그림자 데칼을 **굽고**, 캐스터마다 데칼 파츠를 만든다.
//
// ── 이 파일이 감독 지시의 "베이킹" 이다 ────────────────────────────────────
// 감독: *"내가 베이킹 버튼을 누르면 구워지고 적용되게하자. 해상도 조정옵션도 만들고."*
// 굽는 대상은 **아틀라스 캔버스 한 장**이다. 셀 하나가 캐스터 종류 하나의 실루엣이고,
// 각 그림자 파츠의 지오에 자기 셀 UV 가 구워져 있다.
//
// ⚠ 이름이 겹치는 것이 이미 둘 있다 — 혼동하지 마라:
//   `parts/bake.ts`        지오메트리 **병합**(정점 잇기). 라이트 베이킹이 아니다.
//   `space-lightmap.ts`    빌더/방문자뷰의 GPU 라이트맵. 표면마다 **전용 재질**을 요구해
//                          인스턴싱과 정면 충돌한다. 그래서 world2 는 데칼로 간다.
//
// ── 왜 절차 캔버스인가 (RTT 굽기를 버린 이유) ──────────────────────────────
// 캐스터 지오를 태양 방향에서 정투영 렌더해 실루엣을 얻는 방법(RTT)이 더 정확하다. 버렸다:
//   ① 렌더타깃 텍스처의 **밉맵**이 두 백엔드에서 같게 나온다는 보장이 없다. 데칼은 지면에
//      누워 있어 정확히 밉맵이 지배하는 각도이고, 이 저장소는 이미 잔디 텍스처에서 그 값을
//      치렀다(`garden.ts` 의 128→256 문단).
//   ② 소프트 엣지를 얻으려면 블러가 필요한데 GLSL·NodeMaterial 금지 아래서는 지터 누적뿐이고,
//      그 알파 누적이 백엔드마다 같은지는 **재볼 방법이 없다**.
//   ③ 캔버스로 되읽으면 어댑터에 백엔드 분기가 늘고 비동기가 붙는다.
// **RTT 의 진짜 장점(형상을 손으로 안 적어도 되는 것)은 따로 가져왔다** — 치수는 캐스터
// 지오의 `boundingBox` 에서 실측하고, 여기에는 골격 한 글자만 온다(`shadowProfile`).
//
// 룩이 부족하다는 판정이 나오면 **교체 지점은 `paintCell()` 하나다.** 나머지 구조는 그대로.
//
// ── § 남는 사각 ─────────────────────────────────────────────────────────────
// 이 절은 **인용되기 전에 없었다.** `BakeEntry.span` 주석이 *"(§ 남는 사각)"* 을 가리키고
// 있었는데 그런 절이 이 파일에도 어디에도 없었다(2026-08-11 실측). 존재하지 않는 근거를
// 인용하는 것은 이 저장소가 바로 앞 회차에 검수관 반려로 맞은 형태다(`types.ts` 주석이
// 없는 테스트를 인용했던 B2). 문장을 지우는 대신 **절을 만들어 참으로 되돌린다.**
//
// ① **지면 전용이다.** 벽에 지는 그림자도, 파츠끼리 서로 드리우는 그림자도 없다. 데칼이
//    지면에 누운 평면 하나라서 구조적으로 불가능하고, 옵션으로 켤 수 있는 것이 아니다.
//    **감독 판정 2026-08-11: "이대로 좋다"** — 배포 후 이 한계를 명시해 확인받았고, 벽
//    그림자는 별건으로도 열지 않기로 했다. 다시 논의가 열리는 조건은 감독이 화면을 보고
//    접지감이 부족하다고 판정할 때뿐이다.
// ② **인스턴스마다 실루엣이 같다.** 셀은 종류당 하나이고 치수는 그 종류의 **대표값**이다
//    (`casterProfiles` 가 `boundingBox` 에서 뜬다). 인스턴스별 UV 가 없으므로 원리상
//    바꿀 수 없다 — 같은 종류의 건물이 크기가 달라도 그림자 비율은 하나다.
// ③ **회전한 각진 캐스터의 폭이 최대 √2 배 넓다.** 밑동을 외접원으로 근사하기 때문이다.
//    ②와 같은 이유로 인스턴스별 보정이 불가능하다.
// ④ **색 페이드가 데칼에 안 걸린다.** 검정은 어떤 색과 곱해도 검정이라 `parcel-fade` 가
//    무력하다. 등장·소멸은 `parcel-grow` 의 스케일이 전담한다 — 그래서 그림자만 페이드
//    없이 나타나는데, 스케일이 0에서 자라므로 화면에서는 "커지며 나타난다" 로 읽힌다.
// ⑤ **저고도에서 밑동이 진행 방향으로 늘어난다.** 물리적으로는 안 늘어나야 한다. 굽는 쪽과
//    변환 쪽이 같은 `blobFrac` 을 보므로 어긋나지는 않는다. 안 재본 것은 *"화면에서 눈에
//    띄는가"* 하나이고, `?time=sunset` 실기기 판정으로 닫는다.

import type { PartSpec, PlacedPart, PlaceContext, ThreeNS, ResolvedLayout } from './types.js';
import {
  atlasGrid, decalLocalZ, penumbraPlan, tailAlpha, styleOf,
  SHADOW_PAD, SHADOW_STYLE,
  type ShadowSpan, type ShadowStyle, type StyleProfile,
} from '../decide/shadow-decal.js';

/**
 * 아틀라스 한 변(px). **세션 내내 상수다** — 이 값이 바뀌면 캔버스 백킹 스토어가 새로
 * 만들어지고, three 가 텍스처를 파괴 후 재생성해 개수 불변식이 흔들린다. 해상도 노브는
 * 이것이 아니라 `SHADOW_DRAW_PX`(그리는 해상도)를 움직인다.
 */
export const SHADOW_ATLAS_PX = 512;

/**
 * 셀 하나를 그릴 때 쓰는 스크래치 해상도의 **상한**(px). `?shres` 의 최댓값이자 스크래치
 * 캔버스 크기다. 실제로 그리는 해상도는 이 이하이고, 낮추면 확대 합성되어 뭉개진다 —
 * 그것이 화면에서 "해상도" 로 읽히는 바로 그것이다.
 */
export const SHADOW_DRAW_MAX = 128;

/** 그리는 해상도 기본값. 셀(≈170px)의 절반 남짓 — 그림자는 원래 경계가 흐리다 */
export const SHADOW_DRAW_PX = 64;

/** 굽기 한 번에 들어가는 값 */
export interface BakeOpts {
  /** 그리는 해상도(px). `?shres` */
  res: number;
  /** 농도 0~1. 시간대 배수가 이미 곱해진 값이 온다 */
  density: number;
  /** 부드러움 손잡이(penumbra 확산). `?shsoft` — 의미는 `SHADOW_SOFT` 주석 참조 */
  soft: number;
  /** 꼬리 알파 바닥값 0~1. `?shtail` — 의미는 `SHADOW_TAIL` 주석 참조 */
  tail: number;
  /** 룩 후보. `?shstyle`. 없으면 기본 룩 */
  style?: ShadowStyle;
}

/** 셀 하나를 굽는 데 필요한 것 */
export interface BakeEntry {
  /** 아틀라스 셀 인덱스 */
  index: number;
  profile: 'round' | 'box' | 'post';
  /** 이 종류의 **대표** 치수. 인스턴스마다 다르지만 실루엣은 하나만 굽는다(§ 남는 사각) */
  span: ShadowSpan;
}

// ── 아틀라스 싱글턴 ─────────────────────────────────────────────────────────
//
// 모듈 수준에 둔다. 그림자 파츠가 여덟이고 각자 `asset(T)` 에서 이것을 참조하는데, 파츠마다
// 만들면 텍스처가 여덟 장이 된다. **텍스처는 한 장, 재질도 하나, 지오만 여덟**이 이 설계의
// 개수 계약이다.

interface Atlas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** 셀 하나를 그리는 임시 캔버스. 크기는 `SHADOW_DRAW_MAX` 로 고정 */
  scratch: HTMLCanvasElement;
  sctx: CanvasRenderingContext2D;
  texture: InstanceType<ThreeNS['Texture']>;
  material: InstanceType<ThreeNS['Material']>;
}

let _atlas: Atlas | null = null;

/** 테스트에서 상태를 씻는다. 런타임에서는 부르지 않는다 */
export function _resetAtlasForTest(): void { _atlas = null; }

/** 지금 아틀라스. 없으면 null — 부팅 전에 물어보는 쪽을 조용히 통과시키지 않는다 */
export function atlasOf(): Atlas | null { return _atlas; }

function makeCanvas(size: number): { c: HTMLCanvasElement; x: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  if (!x) return null;
  return { c, x };
}

/**
 * 아틀라스를 만든다(부팅 1회). 캔버스가 없는 환경(헤드리스 단위 테스트)에서는 null 이고,
 * 그때 그림자 파츠는 텍스처 없는 재질로 떨어진다 — 조용히 죽지 않고 **안 보일 뿐**이다.
 */
function ensureAtlas(T: ThreeNS): Atlas | null {
  if (_atlas) return _atlas;
  const a = makeCanvas(SHADOW_ATLAS_PX);
  const s = makeCanvas(SHADOW_DRAW_MAX);
  if (!a || !s) return null;

  const texture = new T.CanvasTexture(a.c);
  // 캔버스 텍스처는 반드시 sRGB 다 — 이 저장소는 이 한 줄을 빠뜨려 밴딩 사고를 냈다.
  texture.colorSpace = T.SRGBColorSpace;

  const material = new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    // 그림자는 깊이를 쓰지 않는다. 쓰면 데칼끼리·지면과 z-fighting 이 나고, 안 써도
    // 될 이유가 있다 — 검정을 알파 블렌딩하면 결과가 `(1−a₁)(1−a₂)·dst` 라
    // **교환법칙이 성립한다.** 겹치는 순서가 프레임마다 뒤집혀도 화면이 안 바뀐다.
    depthWrite: false,
    // 안개는 **켠다.** 먼 그림자가 안개색으로 수렴하는데, 그 거리에서는 지면도 같은
    // 안개색이라 결과적으로 사라진다. 끄면 안개 속에서 검은 얼룩만 남는다.
    fog: true,
    // 조명을 받지 않는다(Basic). 시간대에 따른 농도는 **캔버스 알파**가 담당한다 —
    // 조명에 맡기면 밤에 그림자가 밝아지는 모순이 생긴다.
  });

  _atlas = { canvas: a.c, ctx: a.x, scratch: s.c, sctx: s.x, texture, material };
  return _atlas;
}

// ── 셀 그리기 ───────────────────────────────────────────────────────────────

/**
 * `post`(가로등) 골격의 폭 계수. 기둥이 가늘다 — 좁히지 않으면 **차폐 반경**만큼 넓은
 * 그림자가 져 가로등이 나무만 한 그늘을 만든다(`footprint` 는 통행 여유이지 실루엣이 아니다).
 */
const POST_WIDTH = 0.34;

/** `box` 골격 모서리 반경 ÷ 짧은 반경. 완전한 직각은 번지게 해도 인공적으로 읽힌다 */
const BOX_CORNER = 0.22;

/**
 * 둥근 골격의 꼬리 끝 둥글기 ÷ 끝 반폭. 끝이 캔버스 아래로 나가지 않게 **안쪽으로** 둥글린다
 * (바깥으로 부풀리면 여백을 넘어 잘린다 — 그러면 고치려던 하드컷이 그 자리에 다시 생긴다).
 */
const TIP_ROUND = 0.35;

/**
 * 셀 하나를 스크래치 캔버스에 그린다. **여기가 룩의 전부다.**
 *
 * ── 2026-08-11 재설계 — 감독 반려 *"딱딱하고 실제 그림자와 너무 달라"* ─────────
 * 옛 판본은 「알파 1 의 하드 실루엣 + 전역 블러 한 방」이었고 네 곳에서 실제 그림자와
 * 갈라졌다. 넷 다 헤드리스로 실측하고 고쳤다:
 *
 *   ① **실루엣이 캔버스 경계에 닿아 있었다** → 알파가 0 으로 갈 자리가 없어 사방이 직선으로
 *      끊겼다(실측표는 `SHADOW_PAD` 주석). → 여백을 넣고 `DECAL_SCALE` 로 상쇄한다.
 *   ② **꼬리가 폭 일정한 직사각형이었다**(실측: y=40·70·100·126 모두 폭 128px). 실제
 *      penumbra 는 캐스터에서 멀어질수록 넓어진다. → 사다리꼴 + `flare`.
 *   ③ **알파가 선형 감쇠 하나뿐이었다**(실측 세로 프로파일 130→25 의 직선). 실제는 접지부가
 *      진하고 급격히 흐려진다. → `tailAlpha` 의 `tailPow` 곡선.
 *   ④ **블러가 전 영역 균일했다.** 실제는 접지부가 선명하고 끝이 흐리다. → 등고선마다
 *      확산량이 다르고 블러도 그 확산량에 비례한다(`blurK`).
 *
 * ── 어떻게 그리는가 — **penumbra 등고선 스택** ─────────────────────────────
 * 같은 실루엣을 `layers` 겹 그린다. 겹 `i` 는 원본에서 `spread·f` 만큼 바깥으로 밀린
 * 등고선이고(`f = i/(layers−1)`, 0 이 코어), 접지부는 `contactTight` 배·끝은 `flare` 배로
 * **다르게** 민다. 그래서 안쪽일수록 여러 겹이 겹쳐 진해지고 바깥으로 갈수록 옅어진다 —
 * 그것이 곧 반그림자다. 겹마다 알파를 낮추는 대신 **겹 수로 알파가 흔들리지 않게** 겹당
 * 알파를 `core` 에서 역산한다.
 *
 * 밑동과 꼬리는 **하나의 path** 로 그린다. 따로 `fill()` 하면 겹치는 부분이 두 번 합성돼
 * 밑동 둘레에 이음선이 보인다(옛 판본이 밑동을 나중에 그려 그 문제를 피하고 있었는데,
 * 그 대가로 꼬리 알파가 밑동에 못 걸렸다).
 *
 * ── 좌표 규약 (`decide/shadow-decal.ts` 의 `decalTransform` 과 짝) ──────────
 *   캔버스 **위쪽** = 발밑        캔버스 **아래쪽** = 그림자 끝
 * ⚠ **`y=0`·`y=res` 가 아니다** — 실루엣은 여백만큼 안쪽이고, 그 변환이 `decalLocalZ` 다.
 * 가로(x)는 그림자 폭 전체이고 월드에서 `sx` 로 스케일되므로 텍스처 공간의 타원이 월드에서
 * 정확히 **원**이 된다.
 *
 * `blobFrac` 을 인자로 받는 것이 중요하다 — 여기서 자체 상수로 계산하면 굽는 실루엣과
 * 놓는 자세가 갈라지고, 증상은 "그림자 밑동이 물건에서 떨어져 있다" 로만 나타난다.
 * 산술 테스트는 양쪽 다 통과한다. 그래서 테스트가 **같은 `shadowSpan` 호출에서 나왔는지**
 * 를 본다.
 *
 * ── `?shres` 를 낮춰도 안 무너진다 ─────────────────────────────────────────
 * 절대 픽셀이 한 군데도 없다. 모든 길이가 `res` 비례이고, 유일한 절대 임계값은 "이 도형을
 * 그릴 가치가 있는가" 판정(0.5px)뿐이다.
 */
export function paintCell(
  x: CanvasRenderingContext2D, res: number, e: BakeEntry, o: BakeOpts,
): void {
  x.save();
  x.clearRect(0, 0, res, res);

  const sp = styleOf(o.style ?? SHADOW_STYLE);
  const density = Math.min(1, Math.max(0, o.density));

  // 0 에 붙으면 밑동이 사라지고 1 을 넘으면 실루엣이 여백을 먹는다. 둘 다 `shadowSpan` 이
  // 내지 않는 값이지만, 여기서 잘라 두면 그 계약이 깨져도 화면이 조용히 비지는 않는다.
  const bf = Math.min(1, Math.max(0.02, e.span.blobFrac));

  // 실루엣 영역 — 여백 안쪽. `decalLocalZ` 가 놓는 쪽과 공유되는 유일한 변환이다.
  /** 실루엣 정규화 t(0=발밑, 1=끝) → 캔버스 y */
  const yOf = (t: number) => (decalLocalZ(t) + 0.5) * res;
  const inner = res * (1 - 2 * SHADOW_PAD);
  const cx = res * 0.5;
  const wf = e.profile === 'post' ? POST_WIDTH : 1;
  const rx = inner * 0.5 * wf;   // 밑동 가로 반경
  const ry = inner * bf * 0.5;   // 밑동 세로 반경
  const cy = yOf(bf / 2);        // 밑동 중심 y
  const endY = yOf(1);           // 실루엣 꼬리 끝

  // 반그림자 설계 셋. **안쪽이 주력, 바깥이 보조**이고 블러는 등고선 간격이 정한다 —
  // 셋이 서로 묶여 있어 판정 쪽이 함께 낸다(근거는 `penumbraPlan` 주석).
  const plan = penumbraPlan(o.soft, res, rx, sp);
  const n = Math.max(2, Math.round(sp.layers));
  // 겹쳐 그린 **누적**이 `core` 가 되도록 겹당 알파를 역산한다: 1−(1−a)ⁿ = core.
  // 농도(`density`)는 여기서 곱하지 않는다 — 마지막 `destination-in` 에서 한 번 곱한다.
  //
  // ⚠ 이 역산이 없으면 `layers` 를 바꿀 때마다 진하기가 따라 변해 **룩 비교가 성립하지
  //   않는다**(16겹인 `diffuse` 만 유독 진해진다).
  // ⚠ 그리고 `globalAlpha = density` 를 겹마다 쓰면 **농도가 겹 수만큼 누적된다** — 실측:
  //   `contact`(6겹·density 0.45)가 알파 248/255 로 구워져 `?shdark` 가 사실상 죽었다.
  const a = 1 - Math.pow(1 - Math.min(1, Math.max(0, sp.core)), 1 / n);

  // **바깥 겹부터** 그린다. 순서는 알파 합성상 무관하지만(검정끼리는 교환법칙이 성립한다 —
  // 재질 주석의 `depthWrite:false` 근거와 같은 성질), 블러가 큰 것을 먼저 깔아야 육안으로
  // 디버깅할 때 층이 쌓이는 순서가 자연스럽다.
  // 꼬리가 있는지는 **확산 전** 치수로 한 번만 판정한다. 겹마다 따로 보면 확산이 큰 바깥
  // 겹에만 꼬리가 생겨 룩이 겹 사이에서 갈라진다.
  const hasTail = endY > cy + ry + 0.5;

  // 블러는 겹마다 같다 — 등고선 **간격**을 메우는 것이 목적이라 겹마다 다를 이유가 없다.
  // (접지부가 선명하고 끝이 흐린 것은 블러가 아니라 `contactTight` < `flare` 가 만든다:
  //  밑동에서 등고선이 촘촘하고 끝에서 벌어진다.)
  const filter = plan.blur > 0.01 ? `blur(${plan.blur.toFixed(3)}px)` : 'none';

  // ── ① 등고선 스택은 **순수 검정**으로 그린다 ────────────────────────────────
  // 꼬리 감쇠도 농도도 여기서 곱하지 않는다. 이유는 아래 ② 참조.
  x.fillStyle = '#000';

  for (let i = n - 1; i >= 0; i--) {
    // `f = 1` 이 **원본 실루엣**(= 월드에서 재는 그림자 경계), `f = 0` 이 안쪽으로 물러난
    // 코어(완전그늘). 등고선은 밖으로 나가지 않는다 — 여백은 블러 몫이다.
    const f = i / (n - 1);
    const shrink = plan.inner * (1 - f);
    const db = -shrink * sp.contactTight;   // 접지부 오프셋(안쪽)
    const de = -shrink * sp.flare;          // 끝 오프셋(안쪽)
    x.filter = filter;
    x.globalAlpha = a;
    // 밑동이 통째로 사라지면 실루엣이 끊긴다. `ry` 는 긴 그림자에서 아주 작아질 수 있어
    // (`blobFrac` 0.07 대) 안쪽 확산이 그것을 넘길 수 있다 — 바닥을 깔아 둔다.
    const rxb = Math.max(rx * 0.08, rx + db);
    const ryb = Math.max(ry * 0.08, ry + db);
    // 끝 반폭은 오프셋에 더해 `umbraTaper` 만큼 **더** 좁아진다. `f=1` 에서는 0 이므로
    // 최외곽은 원본 폭 + 바깥 확장 그대로다.
    const rxe = Math.max(rx * 0.05, rx + de - rx * sp.umbraTaper * (1 - f));
    // ⚠ **꼬리 끝 y 는 겹마다 바꾸지 않는다.** 첫 판본은 `endY + de` 였고, 그러면 겹마다
    // 다른 높이에 **수평 직선**이 생긴다 — 확대 렌더에서 `diffuse`(9겹)가 줄무늬로 보였다.
    // 세로 계단은 블러가 잘 먹지만 가로 직선은 블러를 먹여도 직선으로 남는다.
    // 코어가 끝까지 뻗는 것은 문제가 아니다 — 소멸은 `tailAlpha` 가 담당하고, `umbraTaper`
    // 가 폭을 좁혀 코어는 끝에서 뾰족해진다.
    tracePath(x, cx, cy, rxb, ryb, endY, rxe, hasTail, e.profile);
    x.fill();
  }

  // ── ② 꼬리 감쇠와 농도를 **마지막에 한 번** 곱한다 ──────────────────────────
  //
  // ⚠ **이것이 화면의 가로 줄무늬를 없앤 수정이다** (2026-08-11 실측). 처음에는 겹마다
  // 그라디언트를 `fillStyle` 로 걸었고, 그러면 **겹당 소스 알파가 매번 8비트로 양자화된다.**
  // 겹당 알파가 0.046(=11/255)일 때 그라디언트가 조금 변해도 반올림 결과가 한동안 같은
  // 정수에 머물다 1 씩 뛰고, 그 1 이 **겹 수만큼 증폭**돼 12 단위 계단이 된다.
  //
  // 실측(세로 알파 프로파일, `soft`·중앙선): 107,107,107,107,107,107,107,100,100,100,100,
  // 100,100,92,92,… — **평평한 구간 6~12px + 계단 크기 7~12**. 계단 **수가 `layers` 와
  // 정확히 같았다**(11~12개). 스톱을 12→48 로 늘려도 그대로였다 — 원인이 그라디언트 해상도가
  // 아니라 합성 경로였기 때문이다. 겹을 늘릴수록 오히려 **심해지는** 종류의 결함이다.
  //
  // `destination-in` 은 이미 그려진 알파에 소스 알파를 **곱한다.** 그래서 양자화가 딱 한 번
  // 일어나고, 등고선 스택은 알파 0.23 대(=60/255)로 그려져 상대 오차가 20분의 1이 된다.
  //
  // 부수 효과로 `?shdark` 도 정확해졌다 — 농도가 겹 수와 무관하게 정확히 한 번 곱해진다.
  x.globalCompositeOperation = 'destination-in';
  x.filter = 'none';
  x.globalAlpha = density;
  // 꼬리 알파는 **밑동 중심 → 실루엣 끝** 을 기준으로 한다. 밑동 위쪽(t<0)은 첫 스톱(1)
  // 으로, 끝 너머(t>1)는 마지막 스톱(0)으로 clamp 되므로 범위 밖을 따로 적을 필요가 없다.
  x.fillStyle = hasTail ? tailGradient(x, cy, endY, o.tail, sp) : '#000';
  x.fillRect(0, 0, res, res);

  x.restore();
}

/**
 * 밑동 + 꼬리를 **하나의 path** 로 그린다.
 *
 * 두 subpath 가 겹치지만 nonzero winding 이라 한 번만 칠해진다 — 따로 `fill()` 하는 것과
 * 결정적으로 다른 지점이다(따로 하면 겹친 곳이 두 번 합성돼 이음선이 생긴다).
 *
 * @param cy   밑동 중심 y
 * @param rxb  밑동 가로 반경(확산 포함)
 * @param ryb  밑동 세로 반경(확산 포함)
 * @param endY 꼬리 끝 y(확산 포함)
 * @param rxe  꼬리 끝 반폭 — `rxb` 보다 크면 벌어지고, 작으면 좁아진다(umbra taper)
 * @param hasTail 꼬리를 그리는가. **호출자가 확산 전 치수로 한 번 판정한 값**이다
 */
function tracePath(
  x: CanvasRenderingContext2D,
  cx: number, cy: number, rxb: number, ryb: number,
  endY: number, rxe: number, hasTail: boolean, profile: BakeEntry['profile'],
): void {
  x.beginPath();
  // ① 꼬리 사다리꼴. **밑동 밖으로 나갈 때만** 그린다 — 정수리 태양(blobFrac=1)이면
  //    꼬리가 없어야 하는데, 조건 없이 그리면 확산분만큼 삐져나와 원이 원이 아니게 된다.
  //
  // ⚠ **감기 순서가 오른쪽에서 시작하는 것이 중요하다.** 왼쪽에서 시작하면 밑동(타원·
  //    `roundRect` 둘 다 반시계)과 **반대 방향**이 되고, nonzero winding 이 겹친 구간을
  //    0 으로 만들어 **밑동 아래쪽에 가로 구멍이 뚫린다.** 첫 판본이 그랬고 실측으로
  //    잡았다(세로 알파 프로파일 …175, 160, **1**, 154… — 한 줄만 알파 1 로 꺼져 있었다).
  if (hasTail) {
    x.moveTo(cx + rxb, cy);
    if (profile === 'box') {
      // 각진 캐스터의 그림자 끝은 옥상 실루엣이라 평평하다.
      x.lineTo(cx + rxe, endY);
      x.lineTo(cx - rxe, endY);
    } else {
      // 둥근 캐스터(나무·기둥)의 끝은 둥글다. 직선으로 끊으면 그 가로선이 블러를 먹여도
      // 남아 "그림자가 잘렸다" 로 읽힌다 — 세로 계단과 달리 블러가 가로선을 못 지운다.
      const tip = rxe * TIP_ROUND;
      x.lineTo(cx + rxe, endY - tip);
      x.quadraticCurveTo(cx + rxe, endY, cx, endY);
      x.quadraticCurveTo(cx - rxe, endY, cx - rxe, endY - tip);
    }
    x.lineTo(cx - rxb, cy);
    x.closePath();
  }
  // ② 밑동 — 골격이 여기서만 갈린다.
  if (profile === 'box') {
    roundRect(x, cx - rxb, cy - ryb, rxb * 2, ryb * 2, Math.min(rxb, ryb) * BOX_CORNER);
  } else {
    // round·post — 타원. 월드에서는 원이다(좌표 규약).
    x.moveTo(cx + rxb, cy);
    x.ellipse(cx, cy, rxb, ryb, 0, 0, Math.PI * 2);
  }
}

/**
 * 꼬리 세로 알파 그라디언트. 곡선 자체는 판정(`tailAlpha`)이 소유하고 여기서는 표본만 뜬다.
 *
 * ── 스톱 수가 룩을 좌우한다 (2026-08-11 실측) ───────────────────────────────
 * 처음에 12 로 뒀고 **그것이 화면의 가로 줄무늬였다.** 캔버스 그라디언트는 스톱 사이를
 * **선형 보간**하므로 곡선이 12구간 꺾은선이 된다. 값은 이어지지만 **기울기가 꺾이고**,
 * 사람 눈은 그 불연속(마하 밴드)을 밝기 계단으로 읽는다. 확대 렌더에서 꼬리 전체에
 * 균일 간격 줄무늬가 났고, 그 간격이 정확히 꼬리 길이 ÷ 12 였다.
 *
 * 블러로는 못 지운다 — 블러는 도형 경계를 뭉개지 그라디언트 안쪽을 건드리지 않는다.
 * 스톱을 촘촘히 하는 것이 유일한 처방이고, 스톱은 **한 번만** 만들면 되므로 비싸지 않다.
 */
function tailGradient(
  x: CanvasRenderingContext2D, cy: number, endY: number, tail: number, sp: StyleProfile,
): CanvasGradient {
  const STOPS = 48;
  const g = x.createLinearGradient(0, cy, 0, endY);
  for (let k = 0; k <= STOPS; k++) {
    const t = k / STOPS;
    g.addColorStop(t, `rgba(0,0,0,${tailAlpha(t, tail, sp.tailPow).toFixed(4)})`);
  }
  return g;
}

/**
 * 둥근 사각 **subpath** 를 현재 path 에 더한다. `roundRect` 가 없는 환경(구형 jsdom)을 위한
 * 폴백을 포함한다.
 *
 * ⚠ **`beginPath()` 를 부르지 않는다** — 2026-08-11 재설계에서 밑동이 꼬리와 **하나의 path**
 * 가 됐기 때문이다. 여기서 path 를 새로 열면 앞서 그린 꼬리 사다리꼴이 통째로 버려지고,
 * 증상은 "`box` 골격만 꼬리가 없다" 로 나타난다.
 *
 * 감기 방향은 다른 subpath(사다리꼴·타원)와 **같은 시계방향**이어야 한다. 반대로 감으면
 * nonzero winding 이 겹친 부분을 0 으로 만들어 밑동에 구멍이 뚫린다.
 */
function roundRect(
  x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (typeof x.roundRect === 'function') { x.roundRect(px, py, w, h, rr); return; }
  x.moveTo(px + rr, py);
  x.lineTo(px + w - rr, py); x.quadraticCurveTo(px + w, py, px + w, py + rr);
  x.lineTo(px + w, py + h - rr); x.quadraticCurveTo(px + w, py + h, px + w - rr, py + h);
  x.lineTo(px + rr, py + h); x.quadraticCurveTo(px, py + h, px, py + h - rr);
  x.lineTo(px, py + rr); x.quadraticCurveTo(px, py, px + rr, py);
  x.closePath();
}

/**
 * 아틀라스를 다시 굽는다. **감독의 「베이킹 버튼」이 부르는 것이 이 함수다.**
 *
 * 만드는 GPU 객체가 **0** 인 것이 계약이다 — 같은 캔버스에 다시 그리고 `needsUpdate` 만
 * 세운다. `canvas.width` 를 건드리지 않는 이유는 파일 머리 `SHADOW_ATLAS_PX` 주석에 있다.
 *
 * @returns 그린 셀 수. 캔버스가 없으면 0
 */
export function bakeAtlas(entries: readonly BakeEntry[], o: BakeOpts): number {
  const at = _atlas;
  if (!at) return 0;
  const res = Math.round(Math.min(SHADOW_DRAW_MAX, Math.max(8, o.res)));
  const grid = atlasGrid(entries.length, SHADOW_ATLAS_PX);
  at.ctx.clearRect(0, 0, SHADOW_ATLAS_PX, SHADOW_ATLAS_PX);
  for (const e of entries) {
    paintCell(at.sctx, res, e, o);
    const cell = grid.cellOf(e.index);
    // 스크래치의 `res × res` 만 잘라 셀 크기로 확대한다. `res` 가 작을수록 뭉개진다.
    at.ctx.drawImage(at.scratch, 0, 0, res, res, cell.px, cell.py, cell.size, cell.size);
  }
  at.texture.needsUpdate = true;
  return entries.length;
}

// ── 그림자 파츠 만들기 ──────────────────────────────────────────────────────

/** 그림자 파츠의 kind 는 캐스터에서 유도한다 — 목록을 어디에도 다시 적지 않는다 */
export function shadowKindOf(casterKind: string): string { return `shadow:${casterKind}`; }

/**
 * 캐스터 파츠 목록에서 그림자 파츠들을 만든다.
 *
 * ── 왜 파츠로 만드는가 ──────────────────────────────────────────────────────
 * 파셀 수명·tier·성장·수축·슬롯 예산·안개 페이드가 **전부 공짜로 따라온다.** 별도 시스템으로
 * 만들었다면 그 여섯을 각각 다시 구현하고, 각각 어긋날 자리를 만들었을 것이다.
 *
 * ── `place` 는 캐스터 자세를 **그대로 복사**한다 ────────────────────────────
 * 태양 방향은 여기서 모른다(순수 함수 규약 + 배치 골든이 이 결과를 해시한다). 태양에 따른
 * 자세 변환은 슬롯 어댑터의 **워프**가 한다(`systems/shadow-decal.ts`). 그래서 이 함수의
 * 결과는 시간대와 무관하게 결정론이고, 골든이 흔들리지 않는다.
 *
 * 복사한 `sx·sy·sz` 가 워프의 **입력**이다 — 워프는 그 스케일과 캐스터 지오의 bounding box
 * 로 실제 높이·반경을 유도한다. 그래서 크기를 여기서 한 번 더 적을 일이 없다.
 */
export function shadowParts(base: readonly PartSpec[]): PartSpec[] {
  const casters = base.filter((s) => s.shadowProfile);
  return casters.map((c, i) => makeShadowPart(c, i, casters.length));
}

/** 캐스터 목록과 그 골격. 굽는 쪽이 이 순서대로 셀을 채운다 — 격자 인덱스의 SSOT */
export function casterProfiles(
  base: readonly PartSpec[],
): { kind: string; profile: 'round' | 'box' | 'post' }[] {
  return base
    .filter((s) => s.shadowProfile)
    .map((s) => ({ kind: s.kind, profile: s.shadowProfile! }));
}

function makeShadowPart(caster: PartSpec, index: number, count: number): PartSpec {
  const kind = shadowKindOf(caster.kind);
  return {
    kind,
    // tier 는 캐스터와 **같아야 한다.** 좁히면 그 tier 에서 물건은 있고 그림자만 사라진다.
    tiers: caster.tiers,
    // 난수를 쓰지 않지만 소금은 종류마다 달라야 한다는 규약을 지킨다(뒤에 난수를 쓰게 될 때
    // 이웃 종류와 시드가 겹치지 않게). 캐스터 소금에서 유도해 손으로 안 적는다.
    salt: (caster.salt ^ 0x5ADE0) >>> 0,
    // 텍스처가 색을 정한다. 곱셈 항등원이어야 그림자가 밝아지거나 물들지 않는다.
    tones: [0xffffff],
    // 겹침 판정에서 빠진다 — 그림자 위에 물건이 서는 것이 정상이다.
    footprint: () => 0,
    maxPerParcel: (o: ResolvedLayout) => caster.maxPerParcel(o),
    place(ctx: PlaceContext): PlacedPart[] {
      const out: PlacedPart[] = [];
      for (const p of ctx.placed) {
        if (p.kind !== caster.kind) continue;
        out.push({ kind, x: p.x, z: p.z, y: p.y, ry: p.ry, sx: p.sx, sy: p.sy, sz: p.sz, tone: 0 });
      }
      return out;
    },
    asset(T: ThreeNS) {
      const at = ensureAtlas(T);
      // 눕힌 평면. `rotateX(-π/2)` 로 XY → XZ 가 되고, 그 결과 **UV v=1 이 로컬 −Z** 다
      // (유도는 `decide/shadow-decal.ts` 의 `decalTransform` 주석 한 곳).
      const geometry = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      applyCellUV(geometry, index, count);
      return {
        geometry,
        material: at ? at.material : new T.MeshBasicMaterial({ transparent: true, opacity: 0 }),
        // 그림자가 그림자를 드리우지 않는다. 받지도 않는다 — 실시간 그림자는 폐지됐고,
        // 되살아나도(`?shint=1`) 데칼은 그 축에 끼지 않아야 한다.
        castShadow: false,
        receiveShadow: false,
      };
    },
    // `shadowProfile` 을 신고하지 않는다 — 그림자의 그림자를 만들지 않기 위해서다.
    // 레지스트리 테스트가 `footprint() > 0 ⇔ shadowProfile` 동치를 보므로, footprint 가
    // 0 인 여기에 골격이 붙으면 그 자체로 빨간불이다.
  };
}

/**
 * 셀 UV 를 지오메트리에 굽는다. **인스턴스별 UV 가 불가능하므로 여기가 유일한 수단이다.**
 *
 * `InstancedMesh` 는 인스턴스마다 다른 UV 오프셋을 표준 재질로 줄 수 없다. 커스텀 attribute
 * + 셰이더 수정은 `three/webgpu` 에 렌더 경로가 없어 막혀 있다. 그래서 **종류마다 지오를
 * 따로 두고 UV 를 구워** 넣는다 — 지오는 부팅 때 한 번씩만 만들어지므로 개수 불변식은
 * 그대로다(부팅 증가는 기준선에 흡수된다).
 */
function applyCellUV(
  geo: InstanceType<ThreeNS['BufferGeometry']>, index: number, count: number,
): void {
  const cell = atlasGrid(count, SHADOW_ATLAS_PX).cellOf(index);
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, cell.u0 + u * (cell.u1 - cell.u0), cell.v0 + v * (cell.v1 - cell.v0));
  }
  uv.needsUpdate = true;
}
