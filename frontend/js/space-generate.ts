// space-generate.ts — 작품 목록 → 공간 문서 자동생성 ("작품만 올리면 전시장이 나온다")
// -----------------------------------------------------------------------------
// 감독 지시 2026-08-22: Genie 3(구글 딥마인드 월드 모델) 적용 가능성 조사의 귀결.
// 조사 결론은 「런타임 월드 모델은 우리 구조·정체성과 맞지 않는다」였다 — 공개 API 0,
// 서버 추론 필요(우리는 정적 호스팅), 그리고 **매 프레임 생성이라 작가 작품이 흔들린다**
// (딥마인드 자체 한계: 텍스트 warp · 일관성 수 분 · 기억 ~1분). 미술관에서 그건 치명이다.
//
// 그런데 감독이 원한 것("공간을 자동으로 만들 수 없나")은 생성 모델 없이 성립한다 —
// 우리 Space 는 이미 완전히 구조화된 파라미터이기 때문이다. 즉 자동생성은
// **"JSON 하나를 채우는 문제"** 이지 3D 생성 문제가 아니다. 그래서 이 파일은 순수 함수다:
//   · 외부 호출 0 · 신규 스키마 필드 0 · three 의존 0 (순수 leaf — import 는 space.js 뿐)
//   · 산출물은 그냥 space 문서 → 기존 normalizeSpace·buildSpaceGroup 이 그대로 렌더
//   · 자작 지오메트리 그대로라 IP·§6 게이트 무관
//
// [값 미러링 금지] 액자 실치수는 artworkSize(space.ts)를 **소비**한다 — 폭을 여기서 다시
// 계산하지 않는다. 그 공식이 바뀌면 배치 폭도 저절로 따라와야 하기 때문이다.
// -----------------------------------------------------------------------------
import {
  FOOTPRINT, FRAME_RULES, PART_TYPES, SPACE_VERSION, STORY_H,
  artworkSize, normalizeSpace,
  type Space, type SpacePart, type SpaceFinish,
} from './space.js';

// ── 입력 계약 ────────────────────────────────────────────────────────────────
/** 갤러리 JSON 작품의 부분집합 — 배치에 필요한 것만. 나머지 필드는 무시된다. */
export interface GenArtwork {
  id?: string;
  title?: string;
  imageUrl?: string;
  videoUrl?: string;
  /** 종횡비 W/H. 없으면 artworkSize 가 레거시 1.2×1.6 으로 폴백한다(이미지를 열지 않는다). */
  ar?: number;
  /** 갤러리 데이터의 featured — 피처월(북벽) 우선 배치 대상. */
  featured?: boolean;
}

/**
 * 레이아웃 전략 — 감독 비교용 축(`?gen=`).
 * · perimeter : 둘레 벽면만. 전통 갤러리 동선(들어와서 시계방향).
 * · partition : 둘레 + 중앙 파티션 열. 작품이 많을 때 벽을 늘리고 동선을 접는다.
 * · salon     : 벽면 2단 걸기(살롱 행잉). 같은 방에 밀도를 올린다.
 */
export type GenLayout = 'perimeter' | 'partition' | 'salon';
export const GEN_LAYOUTS: GenLayout[] = ['perimeter', 'partition', 'salon'];

/**
 * 아무것도 안 고르면 여는 배치 — **감독 판정 2026-08-22**.
 * 후보 넷(둘레 걸기 / 작품 수로 자동 선택 / 파티션 / 살롱)을 평면도로 비교해 파티션이 뽑혔다.
 * 상수로 둔 이유는 기본값이 코드 두 곳(폴백 표현식·테스트)에 흩어지지 않게 하기 위해서다.
 */
export const GEN_DEFAULT_LAYOUT: GenLayout = 'partition';

export interface GenOptions {
  layout?: GenLayout;
  name?: string;
  author?: string;
  /** shell.finish 부분 덮어쓰기(마감 취향). 생략 시 화이트 갤러리 기본. */
  finish?: Partial<SpaceFinish>;
  /**
   * 방 크기 명시 지정(FOOTPRINT 키). 지정하면 자동 선택을 건너뛴다 — 작품이 넘치면
   * 조용히 키우지 않고 dropped 로 보고한다(요청한 크기를 말없이 무시하지 않는다).
   */
  footprint?: string;
  /** 자동 선택된 최소 크기에서 N단계 키운다. footprint 를 함께 주면 그쪽이 이긴다. */
  roomUp?: number;
}

// ── 배치 상수 — 왜 이 값인지 값 옆에 적는다 ──────────────────────────────────
// 벽 안쪽면 오프셋. DEFAULT_SPACE 실측에서 유도했다: medium(9×7)의 북벽 작품이 z=-3.4 이고
// fd/2 = 3.5 이므로 오프셋은 0.1 = wallT(0.2)/2 다. 즉 "벽 두께의 절반만큼 안쪽" — 벽
// 중심선에서 안쪽 면까지의 거리다. 상수로 박지 않고 wallT 에서 유도하므로 벽이 두꺼워져도 따라온다.
const wallInset = (wallT: number): number => wallT / 2;

// 모서리 여백. 두 벽이 만나는 자리에 작품을 걸면 액자가 옆벽을 파고든다. 최소값은 벽
// 두께 + 작품 간 최소 간격이고, 그것을 그대로 쓴다(여유를 얹지 않는다 — "실측에 여유를
// 얹은 값은 근거가 아니다" 규율. 이 값은 기하에서 유도된 것이라 여유가 필요 없다).
const CORNER_MARGIN = (wallT: number): number => wallT + FRAME_RULES.minGap;

// 작품 위 트랙 조명의 방 안쪽 오프셋. DEFAULT_SPACE 실측: 작품 z=-3.4 · 조명 z=-3.0 → 0.4.
const LIGHT_INSET = 0.4;

// ── 살롱 2단 — 단 높이는 **층고와 액자 높이에서 유도한다** ──────────────────
// ⚠ 첫 판본은 고정값(1.15 / 2.45)이었고 **틀렸다.** 헤드리스 렌더로 실물 14점을 살롱으로
// 걸어 보니 위·아래 액자가 겹쳐 있었다. 산술로 확인한 결과 우연이 아니라 **항상** 겹친다:
//   단 간격 1.30m  vs  액자 높이 1.60m(기본 폴백) · 2.13m · 2.60m(clampH)
//   → 아래단 상단 1.95 > 위단 하단 1.65  (모든 경우에 겹침)
// 겹치지 않으려면 액자 높이가 단 간격보다 작아야 하는데, 고정값은 그 조건을 아예 안 봤다.
// "그럴듯한 출발점" 이라고 적어 둔 것이 **검사 없이 통과하는 값**이었다 — 육안 판정을
// 기다리는 사이 산술로 5초면 반증되는 값이 코드에 남아 있었다.
//
// 그래서 두 값을 지우고 층고 예산에서 유도한다. 액자가 가장 높은 것을 기준으로 잡으므로
// 겹침이 **구조적으로 불가능**하다. 예산이 모자라면 2단을 포기하고 단일 단으로 간다 —
// 억지로 2단을 만드는 것보다 정직하다(높이 1.6m 작품을 3.6m 층고에 2단으로 거는 것은
// 물리적으로 안 되는 일이고, 실제 살롱 행잉도 작은 작품에만 쓴다).
const SALON_FLOOR_CLEAR = 0.25; // 액자 하단이 바닥에서 뜨는 최소 거리
const SALON_CEIL_CLEAR = 0.15;  // 액자 상단과 천장 사이 최소 거리
const SALON_TIER_GAP = 0.20;    // 두 단 사이 여백(겹침 방지 + 시각 분리)

/** 층고와 최대 액자 높이로 2단 y 를 정한다. 예산이 모자라면 null(= 단일 단으로 폴백). */
function salonTiers(storyHeight: number, maxArtH: number): { low: number; high: number } | null {
  if (!(maxArtH > 0)) return null;
  const need = SALON_FLOOR_CLEAR + maxArtH + SALON_TIER_GAP + maxArtH + SALON_CEIL_CLEAR;
  if (need > storyHeight) return null;
  const low = SALON_FLOOR_CLEAR + maxArtH / 2;
  return { low, high: low + maxArtH / 2 + SALON_TIER_GAP + maxArtH / 2 };
}

// 파티션 세그먼트 폭(SSOT 소비 — 여기서 1.2 를 다시 적지 않는다).
const PARTITION_W = PART_TYPES.partition.size[0];

// ── 벽 한 면의 기하 ──────────────────────────────────────────────────────────
/** 길이축 좌표 u(중앙 0) → 월드 (x,z). 벽마다 축과 부호가 다르므로 함수로 감싼다. */
interface WallDef {
  side: 'north' | 'south' | 'east' | 'west';
  ry: number;
  usable: number;
  at: (u: number) => { x: number; z: number };
  lightAt: (u: number) => { x: number; z: number };
}

/**
 * 방 4벽의 기하를 만든다. ry 부호는 DEFAULT_SPACE 실측을 따랐다 —
 * 서벽 screen 이 ry=+π/2, 동벽 vitrine 이 ry=-π/2 다(둘 다 방 안쪽을 본다).
 */
function walls(fw: number, fd: number, wallT: number): Record<string, WallDef> {
  const ins = wallInset(wallT);
  const nz = -(fd / 2 - ins), sz = fd / 2 - ins;
  const wx = -(fw / 2 - ins), ex = fw / 2 - ins;
  const m = CORNER_MARGIN(wallT);
  return {
    north: { side: 'north', ry: 0, usable: Math.max(0, fw - m * 2),
      at: (u) => ({ x: u, z: nz }), lightAt: (u) => ({ x: u, z: nz + LIGHT_INSET }) },
    south: { side: 'south', ry: Math.PI, usable: Math.max(0, fw - m * 2),
      at: (u) => ({ x: u, z: sz }), lightAt: (u) => ({ x: u, z: sz - LIGHT_INSET }) },
    west: { side: 'west', ry: Math.PI / 2, usable: Math.max(0, fd - m * 2),
      at: (u) => ({ x: wx, z: u }), lightAt: (u) => ({ x: wx + LIGHT_INSET, z: u }) },
    east: { side: 'east', ry: -Math.PI / 2, usable: Math.max(0, fd - m * 2),
      at: (u) => ({ x: ex, z: u }), lightAt: (u) => ({ x: ex - LIGHT_INSET, z: u }) },
  };
}

/** 작품 폭 목록이 길이 L 안에 minGap 간격으로 들어가는가. */
function runLength(widths: number[]): number {
  if (widths.length === 0) return 0;
  const sum = widths.reduce((a, b) => a + b, 0);
  return sum + FRAME_RULES.minGap * (widths.length - 1);
}

/** 폭 목록을 중앙정렬로 벽에 늘어놓았을 때 각 작품의 중심 u 좌표. */
function centers(widths: number[]): number[] {
  const total = runLength(widths);
  let cur = -total / 2;
  return widths.map((w) => { const c = cur + w / 2; cur += w + FRAME_RULES.minGap; return c; });
}

// ── 슬롯 모델 ────────────────────────────────────────────────────────────────
// "벽 한 면 × 단(tier)" 이 하나의 슬롯이다. 작품을 슬롯에 나눠 담고, 슬롯마다 중앙정렬한다.
interface Slot {
  wall: WallDef;
  /** 살롱 2단에서의 걸이 높이. undefined = 기본 높이(space-render 가 정한다). */
  y?: number;
  /** 아래단에만 조명을 단다(위단은 같은 조명이 함께 비춘다) — y 값 비교 대신 이 표시로 판정한다. */
  lowTier?: boolean;
  items: { art: GenArtwork; w: number }[];
}

/**
 * 작품을 슬롯에 실제로 담아 본다. **용량 총합이 아니라 이 함수가 판정 주체다.**
 *
 * ⚠ 첫 판본은 벽 길이 총합(capacity)으로 footprint 를 골랐고 **틀렸다** — 실물 14점이
 * medium 에서 1점 누락됐다(테스트가 잡음). 총합은 23.3m ≥ 필요 22.0m 였지만, 작품은
 * 벽 경계를 넘을 수 없어 **벽마다 조각이 남는다**(북 7.8m 에 폭 1.2 작품은 5개까지 =
 * 7.6m, 0.2m 낭비). 총합은 그 낭비를 못 세므로 항상 과대평가한다.
 * 여유 계수를 얹는 대신 실배치를 돌리는 이유는 규율이다 — "실측에 여유를 얹은 값은
 * 근거가 아니다". 유도할 수 있으면 유도하고, 못 하면 실제로 해 본다. 후보는 5개뿐이라
 * 비용도 무시할 만하다.
 */
function packInto(
  list: GenArtwork[], widths: number[], fw: number, fd: number, wallT: number, layout: GenLayout,
  tiers: { low: number; high: number } | null,
): { slots: Slot[]; dropped: string[] } {
  const W = walls(fw, fd, wallT);
  // 슬롯 순서 = 관람 동선. 북(피처월)부터 — 들어서면 정면이고, featured 작품이 여기 걸린다.
  const order: WallDef[] = [W.north, W.east, W.west, W.south];
  const slots: Slot[] = [];
  for (const wall of order) {
    if (layout === 'salon' && tiers) {
      slots.push({ wall, y: tiers.low, lowTier: true, items: [] });
      slots.push({ wall, y: tiers.high, items: [] });
    } else {
      // 살롱인데 층고 예산이 모자라면 여기로 온다 — 단일 단(둘레 걸기와 같은 배치).
      slots.push({ wall, y: undefined, items: [] });
    }
  }
  // 파티션 면 — partition 전략에서만. 중앙 파티션 열의 앞/뒤 두 면을 벽처럼 쓴다.
  if (layout === 'partition') for (const pw of partitionWalls(fw, fd, wallT)) slots.push({ wall: pw, y: undefined, items: [] });

  // featured 를 앞으로 당긴다 — 북벽(첫 슬롯)이 피처월이기 때문이다. 나머지는 입력 순서 유지
  // (작가가 정한 순서가 곧 관람 순서라는 전제. 셔플하지 않는다).
  const idx = list.map((_, i) => i);
  idx.sort((a, b) => (list[b].featured ? 1 : 0) - (list[a].featured ? 1 : 0));

  const dropped: string[] = [];
  // 배분은 **가장 덜 찬 슬롯 우선**이다(라운드로빈). 첫 판본은 앞 슬롯부터 꽉 채우는
  // 그리디였고 결과가 한쪽으로 몰렸다 — 실물 14점 salon 이 북6·동6·서2·남0 이었다.
  // 벽 하나가 빽빽하고 옆 벽이 비는 것은 미술관 배치로 성립하지 않는다(관람 동선이
  // 한 벽 앞에서 정체된다). 균등 분배는 같은 용량으로 그 문제만 없앤다.
  // ⚠ featured 만은 예외다 — 피처월(북벽)에 걸려야 의미가 있으므로 자리를 먼저 잡는다.
  for (const i of idx) {
    const w = widths[i];
    const wantsNorth = !!list[i].featured;
    let best = -1, bestFill = Infinity;
    for (let sIdx = 0; sIdx < slots.length; sIdx++) {
      const slot = slots[sIdx];
      if (wantsNorth && slot.wall.side !== 'north') continue;
      const fill = runLength([...slot.items.map((it) => it.w), w]);
      if (fill <= slot.wall.usable && fill < bestFill) { best = sIdx; bestFill = fill; }
    }
    // featured 가 북벽에 못 들어가면 일반 작품으로 강등해 다시 찾는다(버리지 않는다).
    if (best < 0 && wantsNorth) {
      for (let sIdx = 0; sIdx < slots.length; sIdx++) {
        const fill = runLength([...slots[sIdx].items.map((it) => it.w), w]);
        if (fill <= slots[sIdx].wall.usable && fill < bestFill) { best = sIdx; bestFill = fill; }
      }
    }
    if (best >= 0) slots[best].items.push({ art: list[i], w });
    else dropped.push(list[i].id || list[i].title || `#${i}`);
  }
  return { slots, dropped };
}

/**
 * 중앙 파티션 열의 두 면. 방 중앙에 x축으로 세우고 남/북 양면에 작품을 건다.
 * 파티션 자체 파츠는 generateSpace 가 세운다(여기서는 기하만 계산).
 */
function partitionWalls(fw: number, fd: number, wallT: number): WallDef[] {
  const half = PART_TYPES.partition.size[2] / 2; // 파티션 두께의 절반만큼 앞뒤로 띄운다
  const usable = Math.max(0, partitionSpan(fw, wallT));
  return [
    { side: 'north', ry: Math.PI, usable, at: (u) => ({ x: u, z: -half }), lightAt: (u) => ({ x: u, z: -half - LIGHT_INSET }) },
    { side: 'south', ry: 0, usable, at: (u) => ({ x: u, z: half }), lightAt: (u) => ({ x: u, z: half + LIGHT_INSET }) },
  ];
}

/** 파티션 열이 차지하는 x 폭 — 방 폭에서 양옆 통행로를 뺀 만큼. */
function partitionSpan(fw: number, wallT: number): number {
  const n = Math.floor((fw - CORNER_MARGIN(wallT) * 4) / PARTITION_W);
  return Math.max(0, n) * PARTITION_W;
}

// ── 본체 ─────────────────────────────────────────────────────────────────────
export interface GenResult {
  space: Space;
  /** 배치된 작품 수. 입력보다 적으면 넘친 것이다(호출자가 반드시 확인할 것). */
  placed: number;
  /** 자리를 못 찾은 작품 id 목록 — 조용히 사라지지 않게 명시적으로 돌려준다. */
  dropped: string[];
  footprint: string;
  layout: GenLayout;
  /**
   * 실제로 몇 단으로 걸렸는가. salon 을 골라도 층고 예산이 모자라면 1 이다 —
   * 「살롱을 골랐는데 왜 한 단인가」를 호출자가 알 수 있어야 한다(조용히 다르게 하지 않는다).
   */
  tiers: 1 | 2;
}

/**
 * 작품 목록 → 공간 문서.
 *
 * 불변식(테스트가 지킨다):
 *   1. 입력 작품은 전부 배치되거나 dropped 에 실명으로 남는다 — 조용히 사라지지 않는다.
 *   2. 같은 벽의 작품은 FRAME_RULES.minGap 이상 떨어진다.
 *   3. 모든 파츠는 방 경계 안이다.
 *   4. 작품마다 조명이 하나 붙는다.
 *   5. normalizeSpace 를 통과해도 파츠가 줄지 않는다(정규화가 버리지 않는다).
 */
export function generateSpace(artworks: GenArtwork[], opts: GenOptions = {}): GenResult {
  const layout: GenLayout = GEN_LAYOUTS.includes(opts.layout as GenLayout) ? (opts.layout as GenLayout) : GEN_DEFAULT_LAYOUT;
  const list = Array.isArray(artworks) ? artworks.filter((a) => a && typeof a === 'object') : [];

  // 영상은 screen 파츠로 간다(액자가 아니다) — 벽 배치는 같이 하되 파츠 타입이 다르다.
  const isVideoAt = (a: GenArtwork) => !!(a.videoUrl && !a.imageUrl);
  const widths = list.map((a) => (isVideoAt(a) ? PART_TYPES.screen.size[0] : artworkSize(a.ar).W));
  // 살롱 2단 판정에 필요한 높이 — **가장 높은 액자**를 기준으로 예산을 잡아야 겹침이 없다.
  const maxArtH = list.reduce((m, a) => Math.max(m, isVideoAt(a) ? PART_TYPES.screen.size[1] : artworkSize(a.ar).H), 0);
  const STORY = 'gallery';
  const tiers = layout === 'salon' ? salonTiers(STORY_H[STORY], maxArtH) : null;

  // ── 방 크기 ────────────────────────────────────────────────────────────────
  // 기본은 **전부 들어가는 최소 크기**다. 판정은 실배치다(용량 총합이 아니다).
  //
  // [감독 판정 2026-08-22] *"방이 좁으면 방을 키우면 되지. 기본은 제일 작은 사이즈로
  // 보여주고."* — 나는 "14점이 6×6m 면 관람 공간 없이 벽만 빽빽할 수 있다"를 문제로
  // 규정해 올렸고, **그 규정이 기각됐다.** 좁은 것은 고장이 아니라 조절하면 되는 것이고,
  // 처음 보이는 화면은 작은 쪽이 낫다는 판정이다. 그래서 기본은 그대로 두고 **키우는
  // 수단**(footprint·roomUp)을 옆에 둔다. 이 주석을 남기는 이유는, 다음 사람이 같은
  // 우려로 기본값을 크게 바꾸려 할 때 그것이 이미 판정된 사안임을 알게 하기 위해서다.
  //
  // fail-closed: 가장 큰 것에도 안 들어가면 가장 큰 것을 쓰고 넘친 작품을 dropped 로
  // 보고한다(조용히 버리면 화면상 "잘 나온 전시"가 되고 작가는 작품이 빠진 걸 모른다).
  const wallT = 0.2;
  const fpKeys = Object.keys(FOOTPRINT);
  const pack = (key: string) => packInto(list, widths, ...(FOOTPRINT[key] as [number, number]), wallT, layout, tiers);

  let fpIdx = fpKeys.length - 1;
  for (let i = 0; i < fpKeys.length; i++) {
    if (pack(fpKeys[i]).dropped.length === 0) { fpIdx = i; break; }
  }
  // 키우기 — 명시 지정이 최우선, 없으면 roomUp 단계만큼. 상한은 가장 큰 방이다.
  if (typeof opts.footprint === 'string' && FOOTPRINT[opts.footprint]) {
    fpIdx = fpKeys.indexOf(opts.footprint);
  } else if (typeof opts.roomUp === 'number' && isFinite(opts.roomUp) && opts.roomUp > 0) {
    fpIdx = Math.min(fpKeys.length - 1, fpIdx + Math.floor(opts.roomUp));
  }

  const fpKey = fpKeys[fpIdx];
  const packed = pack(fpKey);
  const [fw, fd] = FOOTPRINT[fpKey];
  const { slots, dropped } = packed;

  // ── 파츠 조립 ──────────────────────────────────────────────────────────────
  const parts: SpacePart[] = [];
  let placed = 0;
  let isFirstArt = true;

  for (const slot of slots) {
    if (slot.items.length === 0) continue;
    const us = centers(slot.items.map((it) => it.w));
    slot.items.forEach((it, k) => {
      const u = us[k];
      const pos = slot.wall.at(u);
      const a = it.art;
      const isVideo = !!(a.videoUrl && !a.imageUrl);
      const part: SpacePart = isVideo
        ? { t: 'screen', x: pos.x, z: pos.z, ry: slot.wall.ry, ratio: '16:9', src: a.videoUrl || '' }
        : { t: 'artwork', x: pos.x, z: pos.z, ry: slot.wall.ry, frame: 'minimal', src: a.imageUrl || '' };
      if (typeof a.ar === 'number' && isFinite(a.ar) && a.ar > 0 && !isVideo) part.ar = a.ar;
      if (slot.y !== undefined) part.y = slot.y;
      // 피처 강조는 방 전체에 하나만 — 여러 개면 강조가 아니게 된다.
      if (isFirstArt && slot.wall.side === 'north') { part.featured = true; isFirstArt = false; }
      parts.push(part);
      placed++;
      // 작품마다 조명 1 (불변식 4). 살롱 위단은 아래단 조명이 함께 비추므로 아래단에만 단다.
      if (slot.y === undefined || slot.lowTier) {
        const lp = slot.wall.lightAt(u);
        parts.push({ t: 'trackLight', x: lp.x, z: lp.z, ry: slot.wall.ry });
      }
    });
  }

  // 중앙 파티션 — partition 전략에서만. 방 중앙에 x축 열을 세우고 **양면 모두** 작품을 건다
  // (packInto 의 partitionWalls 가 그 두 면을 슬롯으로 이미 잡았다).
  // ⚠ 세우는 개수는 partitionSpan 에서 유도한다 — 첫 판본은 여기서 같은 나눗셈을 다시 했고
  // `Math.max(2, …)` 때문에 partitionWalls 의 usable(=Math.max(0,…))과 **어긋났다.** 좁은
  // 방에서 "작품을 걸 수 있다고 판정한 폭"과 "실제로 선 파티션 폭"이 달라지는 형태다.
  // 값 미러링을 없애면 그 어긋남이 구조적으로 불가능해진다.
  if (layout === 'partition') {
    const span = partitionSpan(fw, wallT);
    const n = Math.round(span / PARTITION_W);
    for (let k = 0; k < n; k++) {
      parts.push({ t: 'partition', x: -span / 2 + PARTITION_W * (k + 0.5), z: 0, ry: 0 });
    }
  }

  // spawn — 남벽 앞에서 북벽(피처월)을 정면으로 본다. DEFAULT_SPACE 의 시선 규칙 계승.
  // **앰비언스보다 먼저 정한다** — 관람객이 설 자리가 기준이고 가구가 그것을 피한다.
  const spawnZ = fd / 2 - CORNER_MARGIN(wallT) - 1.0;

  // 앰비언스 — 관람 벤치와 러그. 방 중앙(파티션이 있으면 남쪽으로 물린다).
  // ⚠ 벤치는 solid 라 시작 위치와 겹치면 **관람객이 벤치 안에서 시작한다.** 첫 판본은
  // 벤치를 먼저 놓고 spawn 을 나중에 계산했고, partition 의 fd/4 가 작은 방에서 정확히
  // 겹쳤다(small: 벤치 z 1.25~1.75 vs spawn 1.4 · medium: 1.50~2.00 vs 1.9).
  // 실물 14점이 partition·small 을 고르므로 **기본 화면이 그 경우였다** — 기본 배치가
  // partition 으로 판정되면서 드러났다.
  // 자리가 없으면 놓지 않는다: 6×6m 에 작품 14점이면 벤치 놓을 자리가 없는 게 맞고,
  // 억지로 밀어 넣는 것보다 비우는 편이 정직하다.
  const benchZ = layout === 'partition' ? fd / 4 : 0.8;
  // 필요 간격 = 벤치 반두께 + 사람 반경.
  // ⚠ 사람 반경은 이 저장소에 **두 값이 따로 있다** — visit.js `RADIUS = 0.3`(실내 워크스루)
  // 과 lab-glb.js `PLAYER_RADIUS = 0.32`. 실내 씬은 visit 계열이지만 여기서는 **큰 쪽**을
  // 쓴다: 작은 쪽에 맞추면 반경이 더 큰 컨트롤러에서 끼고, 0.02 를 아껴서 얻는 것이 없다.
  // 순수 leaf 라 import 하지 않고 옮겨 적었으므로, 두 값 중 하나가 커지면 여기도 본다.
  const BENCH_CLEAR = PART_TYPES.bench.size[2] / 2 + 0.32;
  if (Math.abs(benchZ - spawnZ) > BENCH_CLEAR) {
    parts.push({ t: 'bench', x: 0, z: benchZ, ry: 0, size: 1.8 });
    parts.push({ t: 'rug', x: 0, z: benchZ - 0.8, ry: 0, variant: 'rect', color: '#c9bfae' });
  }

  const doc = {
    version: SPACE_VERSION,
    meta: { name: opts.name || '자동 생성 전시', author: opts.author || '' },
    shell: {
      footprint: fpKey,
      storyH: STORY,
      wallT,
      finish: {
        wall: 'white', floor: 'parquet', ceiling: 'whiteflat', trim: 'brass',
        featureWall: 'north', featureFinish: 'deepviolet',
        ...(opts.finish || {}),
      },
    },
    spawn: { x: 0, z: spawnZ, ry: 0 },
    parts,
  };

  return { space: normalizeSpace(doc), placed, dropped, footprint: fpKey, layout, tiers: tiers ? 2 : 1 };
}

/**
 * 주소의 `?u=` 와 갤러리 목록으로 **열어도 되는 갤러리 id** 를 고른다.
 *
 * 화이트리스트다 — `galleries/index.json` 목록에 있는 값만 통과하고 나머지는 전부 null.
 * 형식 검사(정규식)를 쓰지 않는 이유는 책임의 위치다: 정규식은 「무엇을 막을지」를 이쪽이
 * 계속 맞혀야 하지만(`../`, `%2e%2e`, 유니코드 변형…), 목록 대조는 **맞힐 것이 없다.**
 * 경로 조작이 성립할 여지가 원천적으로 사라진다.
 *
 * ⚠ 이 함수가 HTML 안에 있으면 어떤 게이트도 못 본다 — 그래서 여기로 뺐다. 보안 경계는
 * 검사받을 수 있는 자리에 두어야 하고, 이 저장소는 「못 잰 것이 통과로 적히는」 사고를
 * 이미 여러 번 냈다.
 *
 * `index` 는 fetch 결과를 그대로 받는다(신뢰하지 않는 입력으로 다룬다).
 */
export function pickGalleryId(index: unknown, u: unknown): string | null {
  if (typeof u !== 'string' || u === '') return null;
  if (!Array.isArray(index)) return null;
  for (const g of index) {
    // Object.prototype 상속분을 타지 않게 자기 속성만 본다(`?u=__proto__` 류 차단).
    if (!g || typeof g !== 'object') continue;
    if (!Object.prototype.hasOwnProperty.call(g, 'id')) continue;
    const id = (g as { id?: unknown }).id;
    if (typeof id === 'string' && id === u) return id;
  }
  return null;
}

/** 넘침 여부를 호출자가 놓치지 않게 하는 헬퍼 — overflow 는 dropped 로만 판정한다. */
export function genSummary(r: GenResult): string {
  const base = `${r.layout}${r.layout === 'salon' ? `(${r.tiers}단)` : ''} · ${r.footprint} · 작품 ${r.placed}점`;
  return r.dropped.length ? `${base} · ⚠ 미배치 ${r.dropped.length}점(${r.dropped.join(', ')})` : base;
}
