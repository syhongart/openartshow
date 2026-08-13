// world2/edit/panel/outliner.ts — **이 구역에 무엇이 있나.** 블렌더의 아웃라이너 자리.
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
import type { OverlayHost, VillagePick } from '../types.js';
import type { EditState } from '../state.js';

export interface Outliner {
  readonly root: HTMLElement;
  /** 선택이 바뀌었을 때. 목록을 다시 그린다 */
  sync(): void;
  dispose(): void;
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
): Outliner {
  const doc = host.doc;

  const root = doc.createElement('div');
  root.id = 'w2-outliner';

  const title = doc.createElement('h4');
  title.textContent = '구역';
  const note = doc.createElement('div');
  note.className = 'note';
  const list = doc.createElement('div');
  list.className = 'items';
  root.append(title, note, list);
  doc.body.appendChild(root);

  /** 지금 그려진 파셀 — 같은 파셀이면 목록을 다시 안 만든다(선택 강조만 바꾼다) */
  let drawnPx = NaN;
  let drawnPz = NaN;

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

  function sync(): void {
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
