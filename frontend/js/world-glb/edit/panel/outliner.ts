// world-glb/edit/panel/outliner.ts — **이 구역에 무엇이 있나.** 블렌더의 아웃라이너 자리.
//
// 감독 지시 2026-08-13: *"씬 편집은 모바일에서 안하지. 피시에서 할꺼야. … 나도 블랜더 잘써서
// 오히려 그런 방식이 편하지."* 카드 판정 「world2 안을 블렌더처럼 개편」.
//
// ── 왜 왼쪽이고, 왜 넓은 화면에서만인가 ─────────────────────────────────────
// `css.ts` 헤더가 **왼쪽을 쓰지 말라**고 못 박았다 — 터치 조이스틱 판정 영역이 화면 왼쪽
// 절반 전체이고(`decide/touch.ts` 의 `x < viewportWidth / 2`), 거기에 패널을 두면 그 위
// 터치가 캔버스에 도달조차 못 한다. 감독 신고 2026-08-12 의 근거다.
//
// 그 제약과 이번 요구가 정면으로 맞물린다: **아웃라이너는 넓은 화면에서만 뜬다.** 감독이
// 씬 편집을 PC 에서만 한다고 명시했으므로, 좁은 화면에는 아예 없다 = 조이스틱을 안 가린다.
// 판정은 CSS 미디어 쿼리 한 곳이고(`css.ts` 의 `@media (min-width: …)`), JS 는 폭을 모른다 —
// 두 곳이 폭을 각자 판정하면 «패널은 떴는데 스타일이 안 왔다» 가 난다.
//
// ── 1차 범위는 «고른 파셀의 파츠 목록» 하나다 ───────────────────────────────
// 동결된 파셀 **전체** 목록도 유용하지만 그것은 `VillageRead` 에 `list()` 를 여는 일이고,
// 지금 그 문은 안 열려 있다(`edit/types.ts` — 편집이 마을에 닿는 문은 좁게 유지한다).
// 쓸 소비자가 생길 때 함께 연다. 지금 있는 `partsAt` 만으로 «이 구역에 뭐가 있나» 는 된다.
//
// ⚠ `innerHTML` 을 쓰지 않는다 — 이 저장소의 UI 규약(`knob-bar.ts` 의 XSS 근거).

import { isShadowKey } from '../../systems/shadow-decal.js';
import { artName, type ArtworkItem } from '../../decide/artwork.js';
import type { OverlayHost, VillagePick } from '../types.js';
import type { EditState } from '../state.js';

export interface Outliner {
  readonly root: HTMLElement;
  /** 선택이 바뀌었을 때. 목록을 다시 그린다 */
  sync(): void;
  dispose(): void;
}

/**
 * 작품 한 줄에 보일 이름 (W8-11).
 *
 * 이름은 `artName()` 한 곳에서 온다 — 패널 한 줄·배지와 **같게** 불려야 한다.
 *
 * 폭(`w`)을 함께 적는 이유: 같은 그림을 두 장 걸 수 있고, 그때 파일명만으로는 어느
 * 줄이 어느 액자인지 갈리지 않는다. 크기가 이 회차에 **조절하는 값**이라 더 그렇다.
 */
function artLabel(a: ArtworkItem): string {
  return `${artName(a.src)} · ${a.w.toFixed(2)}m`;
}

/**
 * 파츠 한 줄에 보일 이름.
 *
 * ⚠ 이 자리에 원래 *"그림자는 애초에 목록에 안 온다 — `partsAt` 은 저장 형태 = 캐스터만"*
 * 이라고 적었고 **거짓이었다**(테스트가 즉시 빨간불). `partsAt` 은 **동결된 파셀에서만**
 * 캐스터만 낸다(`toStored`). 아직 안 손댄 파셀은 `parcelLayout` 을 그대로 내므로
 * **그림자가 섞여 온다** — 마을 배치의 33%가 `shadow:*` 다(검수관 실측).
 *
 * 그래서 목록이 직접 거른다(아래 `draw`). 집을 수 없는 것이 목록에 있으면 클릭이
 * 죽은 줄로 보인다 — 실제로 `pick.ts` 가 데칼을 거르므로 눌러도 아무 일이 안 난다.
 */
function labelOf(kind: string, index: number): string {
  return `${kind} #${index}`;
}

export function createOutliner(
  host: OverlayHost,
  st: EditState,
  /** 목록에서 고르면 부른다. 3D 클릭과 **같은 함수**로 이어져야 한다 */
  onPick: (v: VillagePick) => void,
  /**
   * 걸린 작품 목록과 그 선택 (W8-11). **선택 사양** — 소비자가 문을 안 주면 그 칸을
   * 통째로 안 만든다(`PanelHandlers` 의 표면 재질 넷이 세운 규약 그대로).
   *
   * ⚠ **둘이 짝이다.** `list` 만 있고 `pick` 이 없으면 눌러도 아무 일이 안 나는
   * 목록이 되고, 그것이 이 저장소가 「조용한 no-op」이라고 부르는 형태다.
   */
  arts?: { list(): readonly ArtworkItem[]; pick(index: number): void },
): Outliner {
  const doc = host.doc;

  const root = doc.createElement('div');
  root.id = 'w8-outliner';

  const title = doc.createElement('h4');
  title.textContent = '구역';
  const note = doc.createElement('div');
  note.className = 'note';
  const list = doc.createElement('div');
  list.className = 'items';
  root.append(title, note, list);

  /**
   * 걸린 작품 칸 (W8-11). 구역 목록과 **같은 컨테이너에 나란히** 둔다 — 별도 패널을
   * 만들면 좁은 왼쪽에 상자가 둘이 되고, 그 둘의 접힘·모드 규칙을 CSS 가 각각 알아야
   * 한다(`css.ts` 가 `#w8-outliner` 하나만 알면 되게 유지한다).
   *
   * 문을 안 받았으면 **DOM 자체를 안 만든다** — 빈 제목만 남으면 «작품이 0개» 와
   * «기능이 없다» 가 화면에서 구별되지 않는다.
   */
  const artTitle = arts ? doc.createElement('h4') : null;
  const artList = arts ? doc.createElement('div') : null;
  if (artTitle && artList) {
    artTitle.textContent = '걸린 작품';
    artList.className = 'items';
    root.append(artTitle, artList);
  }
  doc.body.appendChild(root);

  /** 지금 그려진 파셀 — 같은 파셀이면 목록을 다시 안 만든다(선택 강조만 바꾼다) */
  let drawnPx = NaN;
  let drawnPz = NaN;
  /**
   * 지금 그려진 작품 줄들의 서명. 같으면 DOM 을 다시 안 만든다.
   *
   * **라벨 자체를 서명으로 쓴다** — 「개수」로 잡으면 크기를 바꿔도 목록의 `2.40m` 이
   * 옛 값에 머문다(이 회차가 바로 크기를 바꾸는 회차다). 개수·이름·크기가 전부 라벨에
   * 들어 있으므로 라벨이 같다는 것은 그릴 것이 같다는 뜻이다.
   */
  let drawnArts = '';

  function clear(): void {
    while (list.firstChild) list.removeChild(list.firstChild);
  }

  function draw(v: VillagePick): void {
    const parts = host.village?.partsAt(v.px, v.pz) ?? [];
    clear();
    parts.forEach((p, i) => {
      // ⚠ 그림자는 **표시에서만** 뺀다 — `i` 는 원본 배열 인덱스 그대로여야 한다.
      // 걸러낸 뒤 다시 세면 «목록 3번» 과 «배열 3번» 이 달라져 엉뚱한 것이 조작된다.
      // 판정은 `shadow-decal.ts` 의 `isShadowKey` 한 곳이 소유한다(접두를 다시 안 적는다).
      if (isShadowKey(p.kind)) return;
      const b = doc.createElement('button');
      b.type = 'button';
      b.textContent = labelOf(p.kind, i);
      b.dataset.idx = String(i);
      b.addEventListener('click', () => {
        // 목록에서 고르는 것도 **같은 선택 경로**를 탄다 — 3D 클릭과 갈라지면
        // «목록으로 고른 것은 기즈모가 안 붙는다» 같은 형태가 난다.
        //
        // ⚠ 좌표는 **그 파츠의 것**으로 새로 만든다. `v` 를 그대로 재사용하면 링과
        // 기즈모가 처음 클릭한 파츠 자리에 남는다.
        onPick({
          px: v.px, pz: v.pz, index: i, kind: p.kind,
          x: v.px * host.cellX + p.x, y: p.y, z: v.pz * host.cellZ + p.z,
          frozen: host.village?.isFrozen(v.px, v.pz) ?? false,
          // ⚠ **목록에서 고른 것은 슬롯을 모른다** — 레이캐스트를 안 타므로 `ownerAt`
          // 이 안 불린다. 그래서 조작이 **확정 시점에** 보인다(3D 클릭은 실시간).
          // 알려면 「파츠 → 슬롯」 역인덱스가 필요하고 그것이 W4 ②-c 가 라이브 비용
          // 때문에 안 만든 그것이다 — 감독이 이 차이를 지적하면 **편집 세션에서만** 만든다.
          //
          // 타입이 이 사실을 강제한다: `slot` 이 필수라 여기서 `null` 을 **적어야 한다**.
          // 빠뜨리면 컴파일이 막는다(실제로 이 회차에 그렇게 드러났다).
          slot: null,
        });
      });
      list.appendChild(b);
    });
    drawnPx = v.px;
    drawnPz = v.pz;
  }

  /**
   * 걸린 작품 줄을 다시 만든다. 선택 강조는 여기서 안 한다 — 그것은 `sync` 가 매번
   * 하는 싼 일이고, 여기는 목록이 실제로 바뀌었을 때만 도는 비싼 일이다.
   */
  function drawArts(items: readonly ArtworkItem[]): void {
    if (!artList || !arts) return;
    while (artList.firstChild) artList.removeChild(artList.firstChild);
    items.forEach((a, i) => {
      const b = doc.createElement('button');
      b.type = 'button';
      b.textContent = artLabel(a);
      b.dataset.idx = String(i);
      // 마을 목록과 **같은 규약**이다: 목록에서 고르는 것도 소비자의 선택 경로 하나로
      // 이어진다. 여기서 `select()` 를 직접 부르면 어댑터 생성이 두 곳이 된다.
      b.addEventListener('click', () => { arts.pick(i); });
      artList.appendChild(b);
    });
  }

  function syncArts(): void {
    if (!artTitle || !artList || !arts) return;
    const items = arts.list();
    const sig = items.map(artLabel).join('\u0000');
    if (sig !== drawnArts) { drawArts(items); drawnArts = sig; }
    artTitle.textContent = `걸린 작품 (${items.length})`;
    for (const el of Array.from(artList.children) as HTMLElement[]) {
      el.dataset.on = el.dataset.idx === String(st.artSel) ? '1' : '0';
    }
  }

  function sync(): void {
    syncArts();
    const v = st.villageSel;
    if (!v) {
      // 아무것도 안 골랐으면 목록을 비운다. «옛 구역이 남아 있다» 가 더 나쁘다 —
      // 그 목록을 클릭하면 화면에 안 보이는 것이 골라진다.
      clear();
      drawnPx = NaN;
      drawnPz = NaN;
      note.textContent = '건물이나 나무를 클릭하면 그 구역의 목록이 나옵니다.';
      title.textContent = '구역';
      return;
    }
    if (v.px !== drawnPx || v.pz !== drawnPz) draw(v);
    title.textContent = `구역 (${v.px}, ${v.pz})${v.frozen ? ' · 손본 구역' : ''}`;
    note.textContent = `${list.childElementCount}개`;
    // 선택 강조는 목록을 다시 만들지 않고 표시만 바꾼다.
    for (const el of Array.from(list.children) as HTMLElement[]) {
      el.dataset.on = el.dataset.idx === String(v.index) ? '1' : '0';
    }
  }

  return {
    root,
    sync,
    dispose(): void { root.remove(); },
  };
}
