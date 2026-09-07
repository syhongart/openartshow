// world10/edit/panel/brush-row.ts — **붓 조작칸.** 켜기·크기·개수 셋뿐이다.
//
// 감독 카드 2026-08-22: 워크래프트3 편집기 대비 다음 축으로 **「브러시로 여러 개
// 뿌리기」**가 뽑혔다. 판정은 `decide/brush.ts`, 집행은 `edit/actions.ts` 의 `paintAt`,
// 여기는 **그 둘에 닿는 화면**이다.
//
// ── 왜 「놓기」 탭인가 ──────────────────────────────────────────────────────
// 탭은 **대상**으로 갈린다(`decide/edit-tabs.ts`). 붓은 «아직 없는 것을 만든다» 이므로
// 팔레트와 같은 칸이고, 실제로 **팔레트에서 고른 것을 어떻게 놓을지**를 정하는 값이라
// 그 바로 아래가 자리다.
//
// ── 왜 별도 파일인가 ───────────────────────────────────────────────────────
// `panel/dom.ts` 가 492줄이고 상한이 512다(파일 크기 게이트). 20줄 남은 파일에 슬라이더
// 둘과 토글을 넣으면 다음 사람이 그 파일을 못 만진다. `panel/toolbar.ts` 를 뗀 것과
// 같은 판단이고 같은 회차다.
//
// ── 값은 여기 없다 ─────────────────────────────────────────────────────────
// 범위·기본값은 `decide/brush.ts`(범위)와 `edit/state.ts`(기본값)가 소유한다. 여기서
// 숫자를 다시 적으면 한쪽만 고쳐도 아무도 모른다.

import { R_MIN, R_MAX, N_MIN, N_MAX, clampRadius, clampCount } from '../../decide/brush.js';
import type { EditState } from '../state.js';

export interface BrushRow {
  readonly root: HTMLElement;
  /** 바깥에서 값이 바뀌었을 때(부팅·되돌리기) 화면을 맞춘다 */
  sync(): void;
}

export function createBrushRow(
  doc: Document,
  st: EditState,
  /** 값이 바뀌었다 — 패널이 화면을 다시 그린다 */
  onChanged: () => void,
): BrushRow {
  const root = doc.createElement('div');
  root.className = 'surf';

  const toggle = doc.createElement('button');
  toggle.type = 'button';
  // ⚠ **라벨이 「지금 무엇인가」가 아니라 「무엇이 되는가」이면 안 된다** — 이 저장소가
  // 셰이딩 버튼에서 세운 규약(지금 모드를 강조한다)과 같다. 여기서는 `data-on` 이
  // 강조를 맡으므로 라벨은 고정이다.
  toggle.textContent = '🖌 붓으로 뿌리기';

  const rowR = doc.createElement('div');
  rowR.className = 'surf-row';
  const lblR = doc.createElement('span');
  lblR.className = 'lbl';
  lblR.textContent = '붓 크기';
  const inR = doc.createElement('input');
  inR.type = 'range';
  inR.min = String(R_MIN);
  inR.max = String(R_MAX);
  // 0.5m 는 격자 스냅(`SNAP`)과 같은 단위다 — 감독이 이미 그 눈금으로 세계를 본다.
  inR.step = '0.5';
  const valR = doc.createElement('span');
  valR.className = 'num';
  rowR.append(lblR, inR, valR);

  const rowN = doc.createElement('div');
  rowN.className = 'surf-row';
  const lblN = doc.createElement('span');
  lblN.className = 'lbl';
  lblN.textContent = '개수';
  const inN = doc.createElement('input');
  inN.type = 'range';
  inN.min = String(N_MIN);
  inN.max = String(N_MAX);
  inN.step = '1';
  const valN = doc.createElement('span');
  valN.className = 'num';
  rowN.append(lblN, inN, valN);

  /**
   * 붓이 **무엇에 먹는지** 말한다.
   *
   * ⚠ 붓은 마을 파츠 전용이다(`edit/actions.ts` 의 `placePartAt` 이 거기서만 갈린다).
   * GLB 는 로드가 비동기이고 자산 하나가 12.9MB 까지 가므로, 한 번에 여러 개를 놓는
   * 것이 곧 「탭이 죽는」 경로다 — 이 저장소가 실측한 그 사고다(`edit/state.ts` 의
   * `busy` 절). **그런데 화면이 그것을 안 말하면** 감독이 GLB 를 고른 채 붓을 켜고
   * 지면을 클릭한 뒤 «붓이 안 먹는다» 로 읽는다. 조용한 no-op 을 안 만드는 자리다.
   */
  const note = doc.createElement('div');
  note.className = 'note';

  root.append(toggle, note, rowR, rowN);

  toggle.addEventListener('click', () => {
    st.brushOn = !st.brushOn;
    onChanged();
  });
  // `input` 으로 받는다 — 끌면서 숫자가 따라와야 «몇 미터인지» 를 손으로 익힌다.
  // 되돌리기와 무관하다(세계를 안 바꾼다) — 그래서 `hold`/`release` 가 없다.
  inR.addEventListener('input', () => {
    st.brushRadius = clampRadius(Number(inR.value));
    onChanged();
  });
  inN.addEventListener('input', () => {
    st.brushCount = clampCount(Number(inN.value));
    onChanged();
  });

  return {
    root,
    sync() {
      toggle.dataset.on = st.brushOn ? '1' : '0';
      // 붓이 꺼져 있으면 슬라이더를 **감춘다.** 누를 수 있는데 아무 일도 안 나는 칸은
      // 이 저장소가 「조용한 no-op」이라 부르며 금한 형태다.
      rowR.hidden = !st.brushOn;
      rowN.hidden = !st.brushOn;
      inR.value = String(st.brushRadius);
      inN.value = String(st.brushCount);
      valR.textContent = `${st.brushRadius}m`;
      valN.textContent = `${st.brushCount}개`;
      note.hidden = !st.brushOn;
      const glb = st.pendingSrc !== null;
      note.className = glb ? 'note warn' : 'note';
      note.textContent = glb
        ? '⚠ 지금 고른 것은 GLB 라 붓이 안 먹습니다 — 마을 파츠를 고르세요(하나씩만 놓입니다).'
        : '마을 파츠(나무·벤치 등)에만 먹습니다. 지면을 클릭할 때마다 뿌립니다.';
    },
  };
}
