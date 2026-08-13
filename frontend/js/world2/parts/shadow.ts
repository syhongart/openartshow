// world2/parts/shadow.ts — 접촉그림자(AO 블롭)를 **굽고**, 캐스터마다 그림자 파츠를 만든다.
//
// ── 이 파일이 감독 지시의 "베이킹" 이다 ────────────────────────────────────
// 감독: *"내가 베이킹 버튼을 누르면 구워지고 적용되게하자. 해상도 조정옵션도 만들고."*
// 굽는 대상은 **아틀라스 캔버스 한 장**이다. 셀 하나가 캐스터 종류 하나이고, 각 그림자
// 파츠의 지오에 자기 셀 UV 가 구워져 있다.
//
// ── 2026-08-11(2회차) — 방향성 penumbra 를 폐기하고 빌더 AO 블롭으로 갈아 끼웠다 ──
// 감독: *"이거 폐기하고. 전시공간 만들기에서 가짜로 그림자 만드는것 … 그것을 적용하는게
// 좋을거 같애."* 지목된 것은 `space-assembler.ts` 의 접촉그림자 AO 플레인이다. 경위·값의
// 근거는 `decide/shadow-decal.ts` 머리 주석 한 곳이다 — 여기에 다시 적지 않는다.
//
// **그때 사라진 것**: `tracePath`(밑동 타원 + 꼬리 사다리꼴), `tailGradient`, penumbra
// 등고선 스택과 겹당 알파 역산, `destination-in` 곱셈 단계, `POST_WIDTH`·`TIP_ROUND`.
// 전부 **방향이 있는 그림자**를 그리기 위한 장치였고, 원형 블롭에는 대응물이 없다.
//
// ── 2026-08-11(3회차) — 실루엣이 되살아나고 합성이 곱하기로 바뀌었다 ────────
// 감독이 배포본을 보고 둘을 지시했다: ① *"그림자 부분이 채도가 떨어지니 보기 싫다.
// 포토샵 합성 기능으로 적용"* ② *"형태가 사각형이면 사각형그림자. 원형이면 원형 그림자면
// 해."* 경위·판정표·산술 근거는 `decide/shadow-decal.ts` 의 「합성 모드」·「실루엣」 두
// 절이다 — 여기에 다시 적지 않는다.
//
// ⚠ **바로 위 문단이 2회차에 *"골격별 실루엣이 사라졌다"* 라고 적고 있었고, 지금은 그것이
// 거짓이다.** 문장을 지우는 대신 회차를 나눠 남긴다 — 사라졌다가 **되살아난** 것과 애초에
// 없었던 것은 다음 사람에게 전혀 다른 정보다. 실제로 2회차 주석이 *"되살리려면 `paintBlob`
// 을 종류별로 가르고 `bakeAtlas` 의 셀 복사를 되돌려야 한다"* 라고 적어 둔 덕분에 이번
// 작업의 범위가 조사 없이 정해졌다.
//
// 지금 그리는 그림은 **넷**이다: 원형(`round`·`post`)은 방사형 그라디언트 한 방, 사각
// (`box` — 벤치만)과 얼룩(`foliage` — 나무)은 픽셀 계산이다. 그래서 **셀마다 다시 그린다**
// (2회차의 "한 번 그려 복사" 는 폐기됐다).
//
// ⚠ 이름이 겹치는 것이 이미 둘 있다 — 혼동하지 마라:
//   `parts/bake.ts`        지오메트리 **병합**(정점 잇기). 라이트 베이킹이 아니다.
//   `space-lightmap.ts`    빌더/방문자뷰의 GPU 라이트맵. 표면마다 **전용 재질**을 요구해
//                          인스턴싱과 정면 충돌한다. 그래서 world2 는 데칼로 간다.
//
// 룩이 부족하다는 판정이 나오면 **교체 지점은 `paintBlob()` 하나다.** 나머지 구조는 그대로.
//
// ── § 남는 사각 ─────────────────────────────────────────────────────────────
// ① **지면 전용이다.** 벽에 지는 그림자도, 파츠끼리 서로 드리우는 그림자도 없다. 데칼이
//    지면에 누운 평면 하나라서 구조적으로 불가능하고, 옵션으로 켤 수 있는 것이 아니다.
//    **감독 판정 2026-08-11: "이대로 좋다"** — 배포 후 이 한계를 명시해 확인받았다.
// ② **방향이 없다.** 태양이 어디 있든 발밑에 같은 원이 깔린다. 그것이 이번 교체에서 감독이
//    **고른** 성질이므로 사각이라기보다 사양이지만, "노을에 그림자가 안 눕는다" 를 결함으로
//    보고할 다음 사람을 위해 여기 적는다.
// ③ **인스턴스마다 실루엣이 같다.** 셀은 종류당 하나이고 인스턴스별 UV 가 없다. 다만
//    **크기는 다르다** — 자세의 `sx·sz` 가 인스턴스 스케일을 반영한다.
// ④ **[해소 — 2026-08-11]** 예전에 *"밑동이 원이다"* 로 적혀 있던 자리다. 감독 지시로
//    실루엣이 되살아났다. 다만 **각진 캐스터가 전부 각진 그늘을 갖는 것은 아니다** —
//    감독이 사각을 **벤치에만** 주기로 판정했고(카드 2026-08-11), 건물·시계탑·타워는
//    지오가 박스인 채로 원형 그늘을 유지한다. 그것을 결함으로 보고할 다음 사람을 위해
//    적는다: 그 배정은 각 파츠의 `shadowProfile` 한 줄이고, 근거는 그 줄 위 주석이다.
// ⑤ **색 페이드가 데칼에 안 걸린다.** 검정은 어떤 색과 곱해도 검정이라 `parcel-fade` 가
//    무력하다. 등장·소멸은 `parcel-grow` 의 스케일이 전담한다 — 그래서 그림자만 페이드
//    없이 나타나는데, 스케일이 0에서 자라므로 화면에서는 "커지며 나타난다" 로 읽힌다.

import type { PartSpec, PlacedPart, PlaceContext, ThreeNS, ResolvedLayout } from './types.js';
import type { ShadowBlend } from '../decide/shadow-decal.js';
import {
  atlasGrid, blobStops, BLOB_INNER_R, BLOB_OUTER_R,
  alphaCurve, roundBoxSD, leafNoise,
  RECT_CORNER, LEAF_DEPTH, LEAF_CELLS, SHADOW_BLEND,
} from '../decide/shadow-decal.js';

/** 실루엣 — 파츠의 `shadowProfile` 이 그대로 온다 */
export type ShadowShape = NonNullable<PartSpec['shadowProfile']>;

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

/**
 * 그리는 해상도의 **하한**(px). `?shres` 의 최솟값.
 *
 * ── 왜 8 이 아니라 16 인가 — 헤드리스 실측(2026-08-11) ──────────────────────
 * 여백(`SHADOW_PAD` = 0.031)은 **비**라서 `res` 가 작아지면 픽셀로는 1 도 안 된다. 원이
 * 셀 가장자리 픽셀에 걸치면 알파가 0 으로 못 내려가고, 셀을 170px 로 확대할 때 그 잔여가
 * **직선으로 늘어난다** — 감독이 앞 회차에 반려한 *"딱딱하다"* 와 같은 형태의 하드컷이다.
 *
 * 스크래치를 셀(170px)로 확대한 뒤 잰 경계 알파:
 *
 *   | res | 여백(px) | 셀 경계 알파 | 셀 최대 | 경계/최대 |
 *   |-----|---------|-------------|--------|----------|
 *   |   8 | 0.25    | 5           | 139    | **3.6%** |
 *   |  10 | 0.31    | 3           | 145    | 2.1%     |
 *   |  12 | 0.38    | 1           | 149    | 0.7%     |
 *   |  16 | 0.50    | **0**       | 154    | **0%**   |
 *   |  24 | 0.75    | 0           | 158    | 0%       |
 *   | ≥32 | ≥1.0    | 0           | 158    | 0%       |
 *
 * 3.6% 는 앞 회차 반려 때 실측한 31~39% 와 자릿수가 다르지만, **320px 확대 렌더에서
 * 실제로 세로 직선이 보였다.** 16 은 여유를 얹은 값이 아니라 **경계 알파가 0 이 되는
 * 첫 실측점**이다.
 *
 * ⚠ 하한을 크기 보정(`BLOB_OUTER_R` 을 저해상도에서 줄이기)으로 푸는 길도 있었고 버렸다.
 * 그러면 `res` 가 그림자 **크기**를 바꿔 월드 크기 계약(`DECAL_SCALE`)이 조용히 깨진다 —
 * 해상도 노브는 뭉개짐만 움직여야 한다.
 *
 * **`main.ts` 의 `readNum` 과 슬라이더가 이것을 읽는다** — 8 이 세 곳에 적혀 있었고
 * (URL 파서·굽기 클램프·슬라이더) 그중 하나만 고쳐도 아무도 모르는 상태였다.
 */
export const SHADOW_DRAW_MIN = 16;

/**
 * 그리는 해상도 기본값.
 *
 * 빌더 원본이 128² 인데 절반인 이유: 빌더는 캔버스가 곧 텍스처지만 여기서는 스크래치를
 * 셀(≈170px)로 **확대 합성**하고, 그림이 방사형 그라디언트 하나라 확대에 강하다(경계가
 * 원래 흐리다). 확대 렌더 실측에서 res=64 와 res=128 이 육안 구별되지 않았다. 노브로
 * 128 까지 열려 있으니 실기기에서 부족하면 올린다.
 */
export const SHADOW_DRAW_PX = 64;

/** 굽기 한 번에 들어가는 값 */
export interface BakeOpts {
  /** 그리는 해상도(px). `?shres` */
  res: number;
  /** 농도 배수. 시간대 배수가 이미 곱해진 값이 온다. 1 이 빌더 원본 */
  density: number;
  /** 중간 스톱 위치 손잡이. `?shsoft` — 의미는 `SHADOW_SOFT` 주석 참조 */
  soft: number;
  /**
   * 합성 모드. `?shblend` — 근거는 `decide/shadow-decal.ts` 의 「합성 모드」 절.
   *
   * 생략하면 기본(`multiply`)이다. **옵셔널인 것은 편의가 아니라 테스트 계약이다** —
   * 기존 호출부(`paintBlob(x, res, {res, density, soft})`)가 그대로 돌아야 원형 경로의
   * 회귀를 이 변경과 분리해 읽을 수 있다.
   */
  blend?: ShadowBlend;
  /** 잎 그림자 깊이. `?shleaf` — 생략하면 `LEAF_DEPTH` */
  leaf?: number;
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
  /**
   * 재질을 만든 three 네임스페이스. **합성 모드를 굽기 때마다 다시 세우기 위해** 들고 있다.
   *
   * ⚠ 부팅 순서에 기대지 않으려고 이렇게 했다. `?shblend` 는 URL 노브라 `main.ts` 가 읽는데,
   * 아틀라스는 첫 `asset(T)` 에서 만들어진다 — 그 둘의 선후를 규율로 지키는 대신 **매 굽기가
   * 값을 다시 쓰게** 한다. 순서 의존은 어긴 순간 조용히 기본값으로 돌아가고, 그 증상은
   * "URL 을 붙였는데 아무 일도 안 일어난다" 로만 드러난다.
   */
  T: ThreeNS;
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
  // 빌더의 `aoTexture()` 도 같은 줄을 갖고 있다.
  texture.colorSpace = T.SRGBColorSpace;

  const material = new T.MeshBasicMaterial({
    map: texture,
    // **`transparent` 는 `multiply` 에서도 true 다.** 이 플래그는 "알파를 쓴다" 가 아니라
    // 렌더 큐를 정한다 — false 면 불투명 큐로 가서 **지면보다 먼저** 그려질 수 있고,
    // 그러면 곱할 대상(`dst`)이 아직 없다. 곱하기 합성은 밑에 그려진 것이 있어야 성립한다.
    transparent: true,
    // 그림자는 깊이를 쓰지 않는다. 쓰면 데칼끼리·지면과 z-fighting 이 나고, 안 써도
    // 될 이유가 있다 — **두 합성 모드 모두 교환법칙이 성립한다.** 알파 블렌딩은
    // `(1−a₁)(1−a₂)·dst`, 곱하기는 `v₁·v₂·dst` 로 둘 다 곱의 순서를 안 탄다. 겹치는
    // 순서가 프레임마다 뒤집혀도 화면이 안 바뀐다.
    // ⚠ 예전 주석은 근거를 *"검정을 알파 블렌딩하면"* 으로만 적어 **Normal 을 전제**했다.
    // 합성 모드가 노브가 된 이상 그 근거는 절반만 참이라 양쪽을 다 적는다.
    depthWrite: false,
    // 안개는 **켠다 — 곱하기에서도 맞다.** three fog 는 프래그먼트 색을 안개색으로 섞으므로
    // (`mix(color, fogColor, f)`) 먼 데칼의 곱할 색이 안개색으로 수렴한다. 안개색이 밝으면
    // 곱해도 밑이 안 변해 그림자가 사라지고, 그 거리에서는 지면도 이미 안개색이라 결과가
    // 같다. ⚠ 안개색이 **어두운** 시간대(밤)에는 먼 지면이 한 번 더 어두워질 수 있는데,
    // 밤은 농도 자체가 0.35 배라 폭이 작다 — 실기기에서 보이면 `?shblend=normal` 로 분리해
    // 판정한다(그 노브가 대조군 역할을 겸한다).
    fog: true,
    // 합성 모드. 굽는 그림과 **짝이다** — `multiply` 는 흰 바탕 회색을, `normal` 은
    // 투명 바탕 검정을 굽는다. 어긋나면 화면이 전면 검정이 되거나 그림자가 사라진다.
    // `bakeAtlas` 가 매 굽기마다 이 값을 다시 세운다(부팅 순서에 기대지 않기 위해서다).
    blending: SHADOW_BLEND === 'multiply' ? T.MultiplyBlending : T.NormalBlending,
    // 조명을 받지 않는다(Basic). 시간대에 따른 농도는 **캔버스**가 담당한다 —
    // 조명에 맡기면 밤에 그림자가 밝아지는 모순이 생긴다.
  });

  _atlas = { canvas: a.c, ctx: a.x, scratch: s.c, sctx: s.x, texture, material, T };
  return _atlas;
}

// ── 셀 그리기 ───────────────────────────────────────────────────────────────

/**
 * 접촉그림자 블롭 하나를 스크래치 캔버스에 그린다. **여기가 룩의 전부다.**
 *
 * 빌더 `aoTexture()` 와 같은 그림이다 — 방사형 그라디언트를 셀 전체에 한 번 칠한다. 스톱은
 * 판정(`blobStops`)이 소유하고 여기서는 칠하기만 한다. 굽는 쪽이 자기 상수로 알파나 반경을
 * 계산하면 그것이 이 저장소가 세 번 데인 값 미러링이고, 증상은 "노브를 밀어도 안 변한다"
 * 로만 나타난다.
 *
 * ── `?shres` 를 낮춰도 안 무너진다 ─────────────────────────────────────────
 * 절대 픽셀이 한 군데도 없다. 중심·두 반경이 전부 `res` 비례다.
 *
 * ── 왜 `clearRect` 가 필요한가 ─────────────────────────────────────────────
 * `fillRect` 는 `source-over` 합성이라 **덮어쓰기가 아니다.** 지우지 않고 다시 그리면
 * 굽기를 반복할수록 알파가 누적돼 `?shdark` 가 죽는다 — 앞 회차에 겹당 알파 누적으로
 * 정확히 그 결함을 겪었다(density 0.45 가 알파 248/255 로 구워졌다).
 */
export function paintBlob(
  x: CanvasRenderingContext2D, res: number, o: BakeOpts, shape: ShadowShape = 'round',
): void {
  const mul = (o.blend ?? SHADOW_BLEND) === 'multiply';
  x.save();
  x.clearRect(0, 0, res, res);
  if (shape === 'box' || shape === 'foliage') {
    paintShaped(x, res, o, shape, mul);
  } else {
    // ── 원형(`round`·`post`) — 이 경로는 **한 줄도 안 바뀌었다** ─────────────
    // 곱하기는 흰 바탕을 먼저 깔아 얻는다. `source-over` 로 검정 알파를 얹으면 결과가
    // `255·(1−a)` 회색이고, 그것이 곧 `dst×src = dst·(1−a)` 로 Normal 과 **같은 밝기**다.
    // 스톱 계산을 뒤집을 필요가 없다 — 뒤집으면 두 모드가 서로 다른 산술을 타게 되고,
    // 그러면 `?shblend` 가 대조군 구실을 못 한다(합성 말고도 달라져 버린다).
    if (mul) {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, res, res);
    }
    const c = res * 0.5;
    const g = x.createRadialGradient(
      c, c, res * BLOB_INNER_R,
      c, c, res * BLOB_OUTER_R,
    );
    for (const s of blobStops(o.soft, o.density)) {
      g.addColorStop(s.t, `rgba(0,0,0,${s.a.toFixed(4)})`);
    }
    x.fillStyle = g;
    x.fillRect(0, 0, res, res);
  }
  x.restore();
}

/**
 * 사각·얼룩 실루엣을 **픽셀로** 그린다.
 *
 * ── 왜 캔버스 API 가 아니라 픽셀인가 — 실패 이력 둘을 피한 것이다 ───────────
 * `createRadialGradient` 는 원형만 되므로 사각의 부드러운 가장자리는 다른 수단이 필요한데,
 * 이 저장소가 이미 데인 둘이 있다:
 *   ① **`filter: blur()`** — 캔버스 경계 밖 번짐이 잘려 가장자리에 직선이 선다. 감독
 *      반려(*"딱딱하다"*)의 직접 원인이었다.
 *   ② **등고선 스택** — 겹마다 알파가 8비트로 반올림돼 오차가 겹 수만큼 증폭된다. 스톱을
 *      12→48 로 늘려도 줄무늬가 안 사라진 것이 그 증거다(`blobStops` 주석).
 * 픽셀 계산은 **양자화가 마지막 한 번뿐**이라 둘 다 성립하지 않는다. 그리고 모서리 반경·
 * 얼룩 깊이를 정확히 제어할 수 있어 판정을 노브로 열 수 있다.
 *
 * ── 원형과 **같은 곡선**을 탄다 ─────────────────────────────────────────────
 * `rad` 를 셀 한 변 기준 "반경" 으로 통일한다 — 원은 `hypot`, 사각은 `OUTER_R + SDF` 다.
 * 둘 다 **중심에서 0, 외곽에서 `BLOB_OUTER_R`** 이 되도록 맞췄으므로 그 뒤 알파 매핑은
 * 같은 식이고, 한 화면에서 두 종류의 페이드가 섞여 보이지 않는다.
 *
 * ── 비용 ────────────────────────────────────────────────────────────────────
 * `res²` 픽셀 × 이 실루엣을 쓰는 셀 수(지금 둘 — 벤치·나무)다. 최악 `?shres=128` 에서
 * 2×16,384 = 32,768 픽셀이고, 굽기 예산 경고(8ms)는 `update` 가 실측해 `ev:그림자굽기지연`
 * 으로 올린다 — **추측으로 괜찮다고 적지 않는다.**
 */
function paintShaped(
  x: CanvasRenderingContext2D, res: number, o: BakeOpts,
  shape: 'box' | 'foliage', mul: boolean,
): void {
  const img = x.createImageData(res, res);
  const data = img.data;
  const curve = alphaCurve(o.soft, o.density);
  // 얼룩 깊이. `box` 에는 0 이다 — 벤치에 잎 그림자가 질 이유가 없다.
  const rawLeaf = o.leaf ?? LEAF_DEPTH;
  const leaf = shape === 'foliage' && Number.isFinite(rawLeaf)
    ? Math.min(1, Math.max(0, rawLeaf)) : 0;
  // 그라디언트 오프셋으로 되돌리는 역수. `blobRadiusAt` 의 역함수다 — 그 함수가 순방향
  // (`INNER + s·(OUTER−INNER)`)이므로 여기 상수를 다시 적는 것이 아니라 되푸는 것이다.
  const span = BLOB_OUTER_R - BLOB_INNER_R;
  const inv = span > 0 ? 1 / span : 0;
  const corner = BLOB_OUTER_R * RECT_CORNER;

  for (let py = 0; py < res; py++) {
    for (let px = 0; px < res; px++) {
      // 셀 한 변을 1 로 본 중심 기준 좌표. **절대 픽셀이 없다** — `?shres` 를 낮춰도
      // 실루엣이 안 무너지는 것이 이 파일의 계약이다(`paintBlob` 머리 주석).
      const u = (px + 0.5) / res - 0.5;
      const v = (py + 0.5) / res - 0.5;
      const rad = shape === 'box'
        // 사각 반폭을 `BLOB_OUTER_R` 로 잡아 **외곽 계약을 원과 공유**한다. 이 값이
        // 곧 `DECAL_SCALE`·`BLOB_SCALE` 이 가정하는 그 반경이라, 사각으로 바꿔도 데칼
        // 평면 크기 계산이 그대로 성립한다(그러지 않으면 벤치 그림자만 크기가 어긋난다).
        ? BLOB_OUTER_R + roundBoxSD(u, v, BLOB_OUTER_R, BLOB_OUTER_R, corner)
        : Math.hypot(u, v);
      let a = curve((rad - BLOB_INNER_R) * inv);
      if (leaf > 0) {
        // 잎 사이로 새는 빛 — 알파를 **깎는다**. 가장자리는 이미 `a→0` 이라 곱해도
        // 0 이므로 하드컷이 생기지 않는다(노이즈를 더하는 방식이면 생긴다).
        a *= 1 - leaf * leafNoise(u * LEAF_CELLS, v * LEAF_CELLS);
      }
      const i = (py * res + px) * 4;
      if (mul) {
        // 곱할 회색. 알파는 쓰지 않는다 — `MultiplyBlending` 이 안 보기 때문이고,
        // 그래서 **셀 전체가 불투명**해야 한다(투명 자리는 곱셈에서 검정으로 읽힌다).
        const g = Math.round(255 * (1 - a));
        data[i] = g; data[i + 1] = g; data[i + 2] = g; data[i + 3] = 255;
      } else {
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
        data[i + 3] = Math.round(255 * a);
      }
    }
  }
  x.putImageData(img, 0, 0);
}

/**
 * 아틀라스를 다시 굽는다. **감독의 「그림자 굽기」 버튼이 부르는 것이 이 함수다.**
 *
 * 만드는 GPU 객체가 **0** 인 것이 계약이다 — 같은 캔버스에 다시 그리고 `needsUpdate` 만
 * 세운다. `canvas.width` 를 건드리지 않는 이유는 파일 머리 `SHADOW_ATLAS_PX` 주석에 있다.
 *
 * ⚠ **셀마다 다시 그린다 — 2026-08-11 에 되돌렸다.** 직전 판본은 *"모든 셀이 같은 원형
 * 블롭이므로 한 번 그려 복사한다"* 였고, 같은 주석이 *"골격별 실루엣을 되살리는 날 이
 * 루프를 되돌린다(§ 남는 사각 ④)"* 라고 적어 두었다. **감독이 그날을 불렀다** — *"형태가
 * 사각형이면 사각형그림자. 원형이면 원형 그림자면 해."* 그래서 굽기 비용이 다시 셀 수에
 * 비례한다. 그 대가는 `update` 의 8ms 경고 축이 실측으로 지킨다.
 *
 * @param shapes 셀별 실루엣. **길이가 곧 셀 수**이고 순서는 `casterProfiles` 와 같아야
 *               한다 — 어긋나면 벤치 자리에 나무 얼룩이 구워진다.
 * @returns 채운 셀 수. 캔버스가 없으면 0
 */
export function bakeAtlas(shapes: readonly ShadowShape[], o: BakeOpts): number {
  const at = _atlas;
  if (!at) return 0;
  const n = shapes.length;
  // 하한은 상수가 소유한다 — 근거는 `SHADOW_DRAW_MIN` 주석의 실측표.
  const raw = Number.isFinite(o.res) ? o.res : SHADOW_DRAW_PX;
  const res = Math.round(Math.min(SHADOW_DRAW_MAX, Math.max(SHADOW_DRAW_MIN, raw)));
  const grid = atlasGrid(n, SHADOW_ATLAS_PX);

  // 합성 모드를 **굽기마다** 다시 세운다. 이유는 `Atlas.T` 주석(부팅 순서 비의존).
  // 굽는 그림과 재질이 어긋나면 화면이 전면 검정이 되거나 그림자가 통째로 사라지므로,
  // 둘을 같은 함수 안에서 한 값(`blend`)으로 정하는 것이 이 배선의 요점이다.
  const blend = o.blend ?? SHADOW_BLEND;
  const mat = at.material as unknown as { blending: number; needsUpdate: boolean };
  const want = blend === 'multiply' ? at.T.MultiplyBlending : at.T.NormalBlending;
  if (mat.blending !== want) {
    mat.blending = want;
    // ⚠ **이 줄의 근거는 2026-08-11 에 정정됐다**(검수관 §② — three 0.171.0 소스 실측).
    // 직전 주석은 *"안 주면 첫 전환이 다음 프레임에 안 반영된다"* 라고 **단정**했고 그것은
    // 거짓이다: `WebGPUBackend.needsRenderUpdate` 가 매 렌더마다 `data.blending !==
    // material.blending` 을 **직접 비교**해 파이프라인을 재생성한다 — `needsUpdate` 와
    // 무관하다. 뮤테이션으로도 이 줄을 지운 채 93/93 통과했다.
    //
    // **그런데도 남긴다**: WebGL 백엔드(헤드리스·구형 기기 폴백)는 재질 프로그램 캐시를
    // 쓰고, 두 백엔드가 같은 코드를 타는 이상 더 보수적인 쪽에 맞추는 것이 싸다. 지우는
    // 것이 얻는 것은 한 줄이고 잃을 수 있는 것은 "특정 백엔드에서만 전환이 안 먹는" 형태의
    // 버그다. **근거 없는 확신을 근거 있는 보수로 바꾼 것이지, 필요해서 남긴 것이 아니다.**
    mat.needsUpdate = true;
  }

  at.ctx.clearRect(0, 0, SHADOW_ATLAS_PX, SHADOW_ATLAS_PX);
  for (let i = 0; i < n; i++) {
    const cell = grid.cellOf(i);
    paintBlob(at.sctx, res, { ...o, blend }, shapes[i]!);
    // 스크래치의 `res × res` 만 잘라 셀 크기로 확대한다. `res` 가 작을수록 뭉개진다.
    at.ctx.drawImage(at.scratch, 0, 0, res, res, cell.px, cell.py, cell.size, cell.size);
  }
  at.texture.needsUpdate = true;
  return n;
}

// ── 그림자 파츠 만들기 ──────────────────────────────────────────────────────

/** 그림자 파츠의 kind 는 캐스터에서 유도한다 — 목록을 어디에도 다시 적지 않는다 */
export function shadowKindOf(casterKind: string): string { return `shadow:${casterKind}`; }

/**
 * 캐스터 파츠 하나 → 그 그림자 파츠 하나. **자세를 그대로 복사한다.**
 *
 * ── 왜 함수로 뽑았나 (검수관 반려 B1, 2026-08-13) ───────────────────────────
 * 이 규칙이 `makeShadowPart` 의 `place` 안에만 있었고, 그래서 **계산 경로에서만** 돌았다.
 * 편집이 파셀을 동결하면 `parcelLayout` 이 다시 안 돌므로(`parcel-builder.ts` 의 `fill`)
 * 유도가 끊긴다 — 실측: 건물을 옮기면 그림자는 옛 자리에 그대로 남고, 지워도 그림자
 * 개수가 안 줄었다.
 *
 * 그때 «편집이 짝을 맞춰 함께 옮긴다» 로 고치면 자세가 **두 벌**이 되어 반드시 갈라진다
 * (이 저장소가 값 미러링으로 반복해 데인 형태). 그래서 동결은 캐스터만 담고, 그림자는
 * 조회 시점에 **여기서 다시 유도한다** — 계산 경로가 하는 것과 같은 패턴이다.
 */
export function shadowOf(p: PlacedPart): PlacedPart {
  return {
    kind: shadowKindOf(p.kind),
    x: p.x, z: p.z, y: p.y, ry: p.ry,
    sx: p.sx, sy: p.sy, sz: p.sz,
    tone: 0,
  };
}

/**
 * 캐스터 파츠 목록에서 그림자 파츠들을 만든다.
 *
 * ── 왜 파츠로 만드는가 ──────────────────────────────────────────────────────
 * 파셀 수명·tier·성장·수축·슬롯 예산·안개 페이드가 **전부 공짜로 따라온다.** 별도 시스템으로
 * 만들었다면 그 여섯을 각각 다시 구현하고, 각각 어긋날 자리를 만들었을 것이다.
 *
 * ── `place` 는 캐스터 자세를 **그대로 복사**한다 ────────────────────────────
 * 실제 데칼 크기는 캐스터 지오의 bounding box 에서 나오는데 배치는 그것을 모른다(순수 함수
 * 규약 + 배치 골든이 이 결과를 해시한다). 그래서 크기 변환은 배치가 아니라 슬롯 어댑터의
 * **워프**가 한다(`systems/shadow-decal.ts`). 복사한 `sx·sy·sz` 가 워프의 **입력**이다 —
 * 워프가 그 스케일과 bounding box 로 실제 밑동 반경을 유도한다.
 *
 * ⚠ 이 함수의 결과는 태양·시간대와 무관하게 결정론이고, 그것은 방향성 그림자를 폐기한
 * 뒤에도 그대로다. 배치 골든이 흔들리지 않는 근거가 여기다.
 */
export function shadowParts(base: readonly PartSpec[]): PartSpec[] {
  const casters = base.filter((s) => s.shadowProfile);
  return casters.map((c, i) => makeShadowPart(c, i, casters.length));
}

/** 아틀라스 셀 하나 = 캐스터 종류 하나 */
export interface CasterCell {
  kind: string;
  /** 이 종류의 그림자 실루엣. 파츠가 `shadowProfile` 로 신고한 값 그대로다 */
  shape: ShadowShape;
}

/**
 * 캐스터 목록. 굽는 쪽·놓는 쪽이 이 **순서대로** 셀을 잡는다 — 격자 인덱스의 SSOT.
 *
 * ⚠ **2026-08-11 에 `casterKinds`(kind 만) → 이 형태로 되돌렸다.** 직전 판본이 골격을
 * 떨어뜨리면서 *"값이 다시 필요해지는 날 여기 시그니처만 되돌리면 된다"* 라고 적어 두었고,
 * 감독 지시(*"형태가 사각형이면 사각형그림자"*)로 그날이 왔다. 그때 적어 둔 대로 **시그니처
 * 하나만** 되돌렸다 — 파츠 선언은 손댈 필요가 없었다(신고가 계속 살아 있었기 때문이다).
 * 미래를 위해 남긴 메모가 실제로 값을 한 이 사례를 지운다면, 다음 사람은 같은 판단에서
 * 필드를 지우는 쪽을 고를 것이다.
 */
export function casterProfiles(base: readonly PartSpec[]): CasterCell[] {
  const out: CasterCell[] = [];
  for (const s of base) {
    if (s.shadowProfile) out.push({ kind: s.kind, shape: s.shadowProfile });
  }
  return out;
}

function makeShadowPart(caster: PartSpec, index: number, count: number): PartSpec {
  const kind = shadowKindOf(caster.kind);
  return {
    kind,
    // ⚠ **캐스터 자세를 복사해 태어나므로 y 가 이미 절대 높이다**(표면 가산 대상 아님).
    // 캐스터는 파츠 목록에서 그림자보다 앞이라 `decide/parcel-layout.ts` 가 이미 더한
    // 뒤이고, 여기서 또 더하면 이중 가산이다. 근거 전문은 `types.ts` 의 `absoluteY`.
    absoluteY: true,
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
        // 규칙은 `shadowOf` 한 곳이다 — 편집(동결) 경로가 같은 유도를 다시 해야 하고,
        // 두 곳에 적으면 «옮긴 건물의 그림자만 옛 자리에 남는» 형태로 갈라진다.
        out.push(shadowOf(p));
      }
      return out;
    },
    asset(T: ThreeNS) {
      const at = ensureAtlas(T);
      // 눕힌 평면. `rotateX(-π/2)` 로 XY → XZ 가 된다. 빌더도 같은 수단이다
      // (`space-assembler.ts`: `PlaneGeometry(s, s)` + `rotation.x = -Math.PI/2`).
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
