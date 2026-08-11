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
// **이 파일에서 사라진 것**: 골격(`round`/`box`/`post`)별 실루엣, `tracePath`(밑동 타원 +
// 꼬리 사다리꼴), `roundRect` 폴백, `tailGradient`, penumbra 등고선 스택과 겹당 알파 역산,
// `destination-in` 곱셈 단계, `POST_WIDTH`·`BOX_CORNER`·`TIP_ROUND`. 전부 **방향이 있는
// 그림자**를 그리기 위한 장치였고, 원형 블롭에는 대응물이 없다.
//
// 남은 그림은 **방사형 그라디언트 한 방**이다. 그래서 셀마다 다시 그릴 것도 없어졌다 —
// 한 번 그려 셀마다 복사한다(`bakeAtlas`).
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
// ④ **밑동이 원이다.** 각진 캐스터(건물·시계탑)도 원형 그늘이 진다. 빌더도 사각 파츠
//    (`vitrine`·`bench`)에 원형 AO 를 쓰고 있고 감독이 그 룩을 지목했다. 골격별 실루엣을
//    되살리려면 `paintBlob` 을 종류별로 가르고 `bakeAtlas` 의 셀 복사를 되돌려야 한다.
// ⑤ **색 페이드가 데칼에 안 걸린다.** 검정은 어떤 색과 곱해도 검정이라 `parcel-fade` 가
//    무력하다. 등장·소멸은 `parcel-grow` 의 스케일이 전담한다 — 그래서 그림자만 페이드
//    없이 나타나는데, 스케일이 0에서 자라므로 화면에서는 "커지며 나타난다" 로 읽힌다.

import type { PartSpec, PlacedPart, PlaceContext, ThreeNS, ResolvedLayout } from './types.js';
import {
  atlasGrid, blobStops, BLOB_INNER_R, BLOB_OUTER_R,
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
  // 빌더의 `aoTexture()` 도 같은 줄을 갖고 있다.
  texture.colorSpace = T.SRGBColorSpace;

  const material = new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    // 그림자는 깊이를 쓰지 않는다. 쓰면 데칼끼리·지면과 z-fighting 이 나고, 안 써도
    // 될 이유가 있다 — 검정을 알파 블렌딩하면 결과가 `(1−a₁)(1−a₂)·dst` 라
    // **교환법칙이 성립한다.** 겹치는 순서가 프레임마다 뒤집혀도 화면이 안 바뀐다.
    // (빌더의 AO 재질도 같은 이유로 `depthWrite:false` 다.)
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
export function paintBlob(x: CanvasRenderingContext2D, res: number, o: BakeOpts): void {
  x.save();
  x.clearRect(0, 0, res, res);
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
  x.restore();
}

/**
 * 아틀라스를 다시 굽는다. **감독의 「그림자 굽기」 버튼이 부르는 것이 이 함수다.**
 *
 * 만드는 GPU 객체가 **0** 인 것이 계약이다 — 같은 캔버스에 다시 그리고 `needsUpdate` 만
 * 세운다. `canvas.width` 를 건드리지 않는 이유는 파일 머리 `SHADOW_ATLAS_PX` 주석에 있다.
 *
 * ⚠ **셀마다 다시 그리지 않는다.** 모든 셀이 같은 원형 블롭이므로 스크래치에 한 번 그려
 * 셀 수만큼 `drawImage` 한다 — 굽기 비용이 셀 수와 무관해졌다(앞 회차는 셀마다 등고선을
 * 10~16겹 그렸다). 골격별 실루엣을 되살리는 날 이 루프를 되돌린다(§ 남는 사각 ④).
 *
 * @param cells 셀 수 = 캐스터 종류 수
 * @returns 채운 셀 수. 캔버스가 없으면 0
 */
export function bakeAtlas(cells: number, o: BakeOpts): number {
  const at = _atlas;
  if (!at) return 0;
  const n = Math.max(0, Math.floor(cells));
  // 하한은 상수가 소유한다 — 근거는 `SHADOW_DRAW_MIN` 주석의 실측표.
  const raw = Number.isFinite(o.res) ? o.res : SHADOW_DRAW_PX;
  const res = Math.round(Math.min(SHADOW_DRAW_MAX, Math.max(SHADOW_DRAW_MIN, raw)));
  const grid = atlasGrid(n, SHADOW_ATLAS_PX);
  at.ctx.clearRect(0, 0, SHADOW_ATLAS_PX, SHADOW_ATLAS_PX);
  paintBlob(at.sctx, res, o);
  for (let i = 0; i < n; i++) {
    const cell = grid.cellOf(i);
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

/**
 * 캐스터 kind 목록. 굽는 쪽·놓는 쪽이 이 **순서대로** 셀을 잡는다 — 격자 인덱스의 SSOT.
 *
 * ⚠ 예전 이름은 `casterProfiles` 였고 `{kind, profile}` 을 돌려줬다. 골격
 * (`round`/`box`/`post`)은 방향성 실루엣을 그릴 때만 쓰였고 원형 블롭에는 대응물이 없다
 * (§ 남는 사각 ④). **`shadowProfile` 필드 자체는 파츠 선언에 남긴다** — 캐스터 신고 수단
 * 이고, 레지스트리 테스트가 `footprint() > 0 ⇔ shadowProfile` 동치를 그것으로 본다.
 * 값이 다시 필요해지는 날 여기 시그니처만 되돌리면 된다.
 */
export function casterKinds(base: readonly PartSpec[]): string[] {
  return base.filter((s) => s.shadowProfile).map((s) => s.kind);
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
