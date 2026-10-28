// world-glb/decide/asset-library.ts — **에셋 라이브러리 판정.** 순수 함수만.
//
// ── 감독 지시에서 생겼다 ────────────────────────────────────────────────────
// *"아셋 라이브러리가 있고. 텍스쳐 페인팅 기능. 등 진짜 전문 에디터로 만들어줘."*
//
// 카드로 범위를 좁혔다(2026-08-14): **마을 파츠부터 노출.** 지금 팔레트는 저장소에
// 커밋된 GLB 파일명만 깔고, 마을 건물·나무·가로등(자작 지오메트리)은 **목록에 아예
// 없었다** — 이미 놓인 것을 고쳐 쓸 수만 있었다.
//
// ── 왜 마을 파츠가 먼저인가 ─────────────────────────────────────────────────
// 조달 계보 때문이다. 자작 지오메트리는 IP 위험이 0이라 §6 법무 게이트를 안 탄다.
// 외부 GLB·AI 생성물은 조달 유형 단위로 그 게이트를 타야 하고, 라이브러리는 에셋이
// **쌓이는** 구조라 계보 없이 쌓이면 나중에 못 가른다(팀장 판정 2026-08-13).
//
// ── 왜 `decide/` 인가 ──────────────────────────────────────────────────────
// 「무엇을 목록에 낼 것인가」·「검색어가 무엇을 남기는가」가 전부 순수 계산이다. 그래서
// "놓을 수 없는 것이 목록에 뜨는가" 를 테스트가 DOM 없이 직접 물어볼 수 있다.

import { specFor, type PlacedPart } from '../parts/index.js';

/**
 * 에셋 한 칸.
 *
 *   part   마을 파츠(자작 지오메트리). `id` 가 곧 `PlacedPart.kind`
 *   model  저장소에 커밋된 GLB. `id` 가 곧 `assets/models/` 아래 파일명
 *
 * 둘을 한 타입으로 두는 것이 요점이다 — 검색·정렬·강조가 종류를 몰라도 된다. 갈리는
 * 것은 **놓을 때**뿐이고(파셀 동결 vs GLB 로드), 그 분기는 한 곳에만 있다.
 */
export interface AssetItem {
  readonly kind: 'part' | 'model';
  readonly id: string;
  /** 화면에 보이는 이름 */
  readonly label: string;
  /**
   * 미리보기 색. 파츠만 갖는다 — `tonesFor(kind)` 의 첫 색이다.
   *
   * ⚠ **이것이 이번 회차의 「미리보기」다.** 진짜 썸네일(GLB 를 오프스크린으로 굽는 것)은
   * 안 넣었다: 렌더러를 하나 더 띄워야 하고, 그 비용이 «목록을 여는 것» 에 붙으면
   * 라이브러리가 무거워진다. 색 스와치는 공짜이고 «어떤 계열인가» 는 말해 준다.
   * **여기서 멈춘다** — 감독이 형태를 봐야겠다고 하면 그때 오프스크린을 연다.
   */
  readonly tone?: number;
}

/**
 * 파츠 종류의 한국어 이름. **여기 한 곳이다.**
 *
 * ⚠ `PARTS` 의 실물 종류를 **전부** 덮어야 한다 — 빠지면 화면에 영문 kind 가 그대로
 * 뜬다. 그것을 `tests/world2-asset-library.test.ts` 가 검사하므로, 파츠를 하나
 * 추가하면 **여기가 빨간불이 된다**(`SHADING_LABEL` 과 같은 처방).
 */
export const PART_LABEL: Readonly<Record<string, string>> = {
  ground: '지면',
  garden: '화단',
  road: '길',
  fountain: '분수',
  // ⚠ 파일은 `parts/clocktower.ts` 인데 **종류는 `clock`** 이다(그 파일 `:109`).
  //   파일명으로 추측해 `clocktower` 라고 적었다가 이 표의 커버리지 검사에 잡혔다 —
  //   그 검사가 없었으면 화면에 영문 `clock` 이 그대로 떴을 것이다.
  clock: '시계탑',
  tower: '타워',
  building: '건물',
  lamp: '가로등',
  tree: '나무',
  // 나무 발치의 흙 + 벽돌 링. 팔레트에서 단독으로 집을 일은 드물지만, 이 표는
  // **전 종류 커버리지**가 검사되므로 빠지면 화면에 영문 `treepit` 이 뜬다.
  treepit: '나무 밑동',
  bench: '벤치',
  planter: '화분',
};

/**
 * 「놓을 수 있는가」를 재는 더미 배치. `footprint(p)` 가 `PlacedPart` 를 받으므로
 * 필요하다 — 스케일 1 기준의 점유 반경을 묻는 것이라 값 자체는 판정에 안 쓴다.
 */
const PROBE: PlacedPart = { kind: '', x: 0, z: 0, y: 0, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 };

/**
 * 손으로 놓을 수 있는 종류인가.
 *
 * ── 기준을 **유도한다** ────────────────────────────────────────────────────
 * 목록을 손으로 적으면 파츠가 늘 때 한쪽만 낡는다. 기준은 `footprint() > 0` 이고,
 * 그것이 곧 «자리를 차지하는 물건인가» 다:
 *
 *   · 바닥 평면(`ground`·`garden`·`road`)은 0 이다 — 파셀을 덮는 판이라 «한 개 더
 *     놓는다» 가 의미를 갖지 않는다(`parcel-slots.ts` 의 `freeSlots` 도 같은 이유로
 *     이들을 겹침 판정에서 뺀다)
 *   · `shadow:*` 는 애초에 목록에 안 온다 — 아래 `partAssets` 가 실물만 받는다
 *
 * 같은 기준을 그림자 캐스터 판정도 쓴다(`parts/types.ts:260`). 우연이 아니라 둘 다
 * «덩어리가 있는가» 를 묻기 때문이고, 그래서 한쪽이 바뀌면 다른 쪽도 함께 본다.
 */
export function placeable(kind: string): boolean {
  const spec = specFor(kind);
  if (!spec) return false;
  return spec.footprint({ ...PROBE, kind }) > 0;
}

/**
 * 마을 파츠 목록. **놓을 수 있는 것만** 낸다.
 *
 * @param kinds 실물 파츠 종류(`ALL_KINDS` 가 아니라 `PARTS` 의 실물만 — 그림자를 넣으면
 *              «shadow:tree» 가 목록에 뜬다)
 * @param tonesOf 종류별 색 팔레트 조회(`tonesFor`)
 */
export function partAssets(
  kinds: readonly string[],
  tonesOf: (kind: string) => readonly number[],
): AssetItem[] {
  const out: AssetItem[] = [];
  for (const k of kinds) {
    if (k.startsWith('shadow:')) continue;
    if (!placeable(k)) continue;
    out.push({ kind: 'part', id: k, label: PART_LABEL[k] ?? k, tone: tonesOf(k)[0] });
  }
  return out;
}

/**
 * 커밋된 GLB 목록.
 *
 * 라벨에서 확장자를 떼는 것은 화면 폭 때문이다 — 파일명이 곧 정체성이라 `id` 는 그대로
 * 둔다(놓을 때 `assets/models/${id}` 로 조립한다).
 */
export function modelAssets(names: readonly string[]): AssetItem[] {
  return names.map((n) => ({ kind: 'model', id: n, label: n.replace(/\.glb$/i, '') }));
}

/**
 * 검색. **이름과 id 를 함께 본다** — 감독이 «tree» 로 찾을 수도 «나무» 로 찾을 수도 있다.
 *
 * 빈 검색어는 전부 통과시킨다(필터가 없는 것과 같다). 공백만 넣은 경우도 마찬가지 —
 * 그때 목록이 비면 «검색이 고장났다» 로 읽힌다.
 */
export function filterAssets(items: readonly AssetItem[], query: string): AssetItem[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [...items];
  return items.filter((a) => a.label.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
}

// ── 고르기 판정 ─────────────────────────────────────────────────────────────

/**
 * 지금 고른 것. **둘 중 최대 하나만 채워진다** — `EditState` 의 `pendingSrc`/`pendingPart`
 * 와 같은 불변식이고, 그것이 이 타입이 존재하는 이유다.
 *
 * 지면을 클릭했을 때 «GLB 를 놓을지 파츠를 놓을지» 가 둘로 갈리면 안 된다. 그래서 배타성을
 * **순수 함수의 성질**로 끌어냈다.
 */
export interface Picked {
  readonly src: string | null;
  readonly part: string | null;
}

export const NOTHING_PICKED: Picked = { src: null, part: null };

/**
 * 하나를 고른다. **같은 것을 다시 고르면 푼다.**
 *
 * 되돌릴 자리가 그것밖에 없다 — 고른 뒤 마음이 바뀌었을 때 3D 클릭은 이미 «놓기» 가
 * 되어 버린다.
 *
 * ── 왜 순수 함수인가 (뮤테이션 실측 2026-08-14) ──────────────────────────
 * 처음엔 이 로직이 `panel/palette.ts` 안에 있었고, 「파츠를 고를 때 `pendingSrc` 를
 * 비운다」를 지우는 뮤테이션(N4)이 **`0 failed`** 였다. 원인이 둘이었다:
 *
 *   ② 축이 빔 — 그 축은 GLB 를 **먼저 고르지 않아서** `pendingSrc` 가 애초에 `null`
 *      이었다. 비우는 줄을 지워도 여전히 `null` 이라 차이가 안 난다
 *   ③ 픽스처 한계 — 하네스의 GLB 목록이 비어 있어(fetch 실패) **그 시나리오를 쓸
 *      수조차 없었다.** 버튼이 없으니 «GLB 고르고 파츠 고르기» 를 재현할 방법이 없다
 *
 * DOM 픽스처를 키우는 대신 **판정을 끌어냈다.** 배타성은 화면의 성질이 아니라 규칙의
 * 성질이고, 규칙이면 three 도 DOM 도 없이 왕복을 다 밟아 볼 수 있다.
 */
export function pickAsset(cur: Picked, a: AssetItem): Picked {
  if (a.kind === 'part') {
    return { src: null, part: cur.part === a.id ? null : a.id };
  }
  const src = `assets/models/${a.id}`;
  return { src: cur.src === src ? null : src, part: null };
}

// ── 놓기 판정 ───────────────────────────────────────────────────────────────
//
// ⚠⚠ **이 절이 이 회차에서 가장 위험한 곳이다.** 마을 파츠를 하나 놓는다는 것은 그 파셀의
// 배치 배열에 항목이 하나 느는 것이고, 재빌드가 **GPU 인스턴스 슬롯을 하나 더 집는다** —
// 즉 개수 불변식 `[7]` 과 정면으로 부딪힌다.
//
// **새 상한을 만들지 않는다.** `parts/index.ts` 의 `maxPartsPerParcel(kind)` 가 이미
// 슬롯 풀 예산의 근거이고, 그 주석이 위험을 그대로 적어 두었다:
//
//   *"이 값이 실제 배치보다 작으면 슬롯이 모자라 **파셀이 조용히 덜 그려진다.**"*
//
// 파츠가 스스로 신고하는 **유도값**이라 밀도·레이아웃 전제가 바뀌어도 저절로 따라온다.
// 「실측에 여유를 얹은 값」을 새로 두면 그 전제가 바뀔 때 한쪽만 낡는다 — 이 저장소가
// 슬롯 예산에서 이미 겪은 사고다(이론 최악치 21을 밟아본 최댓값 17+여유로 20이라 적어
// 부족을 덮었고, `starved` 가 계속 0으로 보였다).

export interface PlaceVerdict {
  readonly ok: boolean;
  /** 거절 사유. **화면에 그대로 쓴다** — 조용한 no-op 은 «가끔 안 놓인다» 가 된다 */
  readonly reason?: string;
}

/**
 * 이 파셀에 그 종류를 하나 더 놓아도 되는가.
 *
 * @param cap `maxPartsPerParcel(kind)` — 파츠가 신고한 파셀당 상한
 */
export function canPlacePart(
  kind: string, parts: readonly PlacedPart[], cap: number,
): PlaceVerdict {
  if (!placeable(kind)) {
    return { ok: false, reason: `${PART_LABEL[kind] ?? kind} 은(는) 바닥이라 놓을 수 없습니다.` };
  }
  const name = PART_LABEL[kind] ?? kind;
  // `cap` 이 0 이면 그 종류는 애초에 파셀에 안 들어간다. 상한 초과와 갈라 말한다 —
  // 「가득 찼다」와 「원래 못 놓는다」는 감독이 취할 행동이 다르다.
  if (cap <= 0) return { ok: false, reason: `${name} 은(는) 이 세계의 배치 규칙에 없습니다.` };
  const now = parts.filter((p) => p.kind === kind).length;
  if (now >= cap) {
    return {
      ok: false,
      reason: `이 구역에는 ${name} 을(를) ${cap}개까지 놓을 수 있습니다 (지금 ${now}개)`
        + ' — 더 놓으면 슬롯이 모자라 구역이 조용히 덜 그려집니다.',
    };
  }
  return { ok: true };
}

/**
 * 새 배치 하나. 좌표는 **파셀 로컬**이다(`parcelOf` 의 `lx`·`lz`).
 *
 * `tone: 0` 인 것은 «첫 색» 이고 임시 규약이다 — 색 고르기는 감독이 말한 *"텍스쳐 페인팅"*
 * 의 축소형으로 다음 회차에 온다. 난수로 뽑지 않는 것은 **놓을 때마다 색이 달라지면
 * 「내가 고른 것」이 아니게** 되기 때문이다.
 *
 * 크기·회전은 기본값이다. 놓은 직후 그것을 고르게 하므로(기즈모·모달) 감독이 바로 만진다.
 */
export function newPart(kind: string, lx: number, lz: number, y: number): PlacedPart {
  return { kind, x: lx, z: lz, y, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 };
}
