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

import type { PartSpec, PlacedPart, PlaceContext, ThreeNS, ResolvedLayout } from './types.js';
import { atlasGrid, type ShadowSpan } from '../decide/shadow-decal.js';

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
  /** 블러 반경(셀 픽셀 비). `?shsoft` */
  soft: number;
  /** 꼬리 끝 알파 0~1. `?shtail` */
  tail: number;
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
 * 셀 하나를 스크래치 캔버스에 그린다. **여기가 룩의 전부다.**
 *
 * ── 좌표 규약 (`decide/shadow-decal.ts` 의 `decalTransform` 과 짝) ──────────
 *   캔버스 **위쪽**(y=0) = 발밑        캔버스 **아래쪽**(y=res) = 그림자 끝
 * 가로(x)는 그림자 폭 전체이고, 월드에서 `sx = 2r` 로 스케일되므로 **가로 지름 1 = 2r**,
 * 세로 지름 `blobFrac` = 2r 이다. 그래서 텍스처 공간의 타원이 월드에서 정확히 **원**이 된다.
 *
 * `blobFrac` 을 인자로 받는 것이 중요하다 — 여기서 자체 상수로 계산하면 굽는 실루엣과
 * 놓는 자세가 갈라지고, 증상은 "그림자 밑동이 물건에서 떨어져 있다" 로만 나타난다.
 * 산술 테스트는 양쪽 다 통과한다. 그래서 테스트가 **같은 `shadowSpan` 호출에서 나왔는지**
 * 를 본다.
 */
export function paintCell(
  x: CanvasRenderingContext2D, res: number, e: BakeEntry, o: BakeOpts,
): void {
  x.save();
  x.clearRect(0, 0, res, res);
  x.globalAlpha = Math.min(1, Math.max(0, o.density));
  // 블러는 셀 크기에 비례한다 — 절대 픽셀로 두면 해상도를 낮출 때 상대적으로 더 흐려진다.
  const blur = Math.max(0, o.soft) * res;
  if (blur > 0.01) x.filter = `blur(${blur.toFixed(2)}px)`;
  x.fillStyle = '#000';

  // 0 에 붙으면 밑동이 사라지고 1 을 넘으면 셀을 벗어난다. 둘 다 `shadowSpan` 이 내지
  // 않는 값이지만, 여기서 잘라 두면 그 계약이 깨져도 화면이 조용히 비지는 않는다.
  const bf = Math.min(1, Math.max(0.02, e.span.blobFrac));
  const cy = res * bf / 2;          // 밑동 중심 y
  const ry = res * bf / 2;          // 밑동 세로 반경
  // `post`(가로등)는 기둥이 가늘다. 폭을 좁히지 않으면 **차폐 반경**만큼 넓은 그림자가 져
  // 가로등이 나무만 한 그늘을 만든다 — `footprint` 는 통행 여유이지 실루엣이 아니다.
  const wf = e.profile === 'post' ? 0.34 : 1;
  const rx = res * 0.5 * wf;
  const cx = res * 0.5;

  // ① 꼬리 — 밑동 중심에서 끝까지. 알파가 1 → tail 로 선형 감쇠한다.
  //    밑동보다 **먼저** 그린다: 나중에 그리면 감쇠한 꼬리가 밑동 위를 덮어 밑동이 옅어진다.
  if (cy < res - 0.5) {
    const g = x.createLinearGradient(0, cy, 0, res);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, `rgba(0,0,0,${Math.min(1, Math.max(0, o.tail))})`);
    x.fillStyle = g;
    x.fillRect(cx - rx, cy, rx * 2, res - cy);
  }

  // ② 밑동 — 골격이 여기서만 갈린다.
  x.fillStyle = '#000';
  if (e.profile === 'box') {
    // 각진 밑동. 모서리를 조금 둥글려 둔다 — 완전한 직각은 블러를 먹여도 인공적으로 읽힌다.
    const r = Math.min(rx, ry) * 0.22;
    roundRect(x, cx - rx, cy - ry, rx * 2, ry * 2, r);
    x.fill();
  } else {
    // round·post — 타원. 월드에서는 원이다(위 규약).
    x.beginPath();
    x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    x.fill();
  }

  x.restore();
}

/** `roundRect` 가 없는 환경(구형 jsdom)을 위한 폴백 */
function roundRect(
  x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (typeof x.roundRect === 'function') { x.beginPath(); x.roundRect(px, py, w, h, rr); return; }
  x.beginPath();
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
