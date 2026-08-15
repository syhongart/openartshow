// world2/edit/panel/surface.ts — **표면 재질 패널.** 「월드스튜디오」의 PBR 편집 칸이다.
//
// 감독 지시 2026-08-14: *"땅의 텍스쳐 심리스를 주면 그대로 적용할수있게 하는거지. 그리고
// 타일링 배율로 촘촘히 힐것인지. 조절하고 각도 조절하고"* / *"심리스텍스처. 디퓨저맵.
// 노말맵. 하이라이트. 메탈릭. 러프니스 조절하게 하자"*
//
// ── 여기는 DOM 만 만든다 ────────────────────────────────────────────────────
// 「무엇을 칠할 수 있는가」·「어떤 값이 유효한가」·「목록을 어떻게 고치는가」는 전부
// `decide/surface-material.ts` 다. 그래서 판정을 DOM 없이 테스트할 수 있고, 이 파일은
// 값을 그 함수들에 넘기고 결과를 다시 그리는 통로다(`palette.ts` 와 같은 구조).
//
// ── 선택과 무관한 패널이다 ──────────────────────────────────────────────────
// `inspector.ts` 는 **고른 물건**의 수치를 다루지만 이쪽은 **종류 단위 전역**이다 —
// 재질이 종류당 하나를 온 세계가 공유하기 때문이다(`parcel-assets.ts:29-31`, 부팅에 종류마다
// 딱 한 번). 그래서 슬라이더 하나가 즉시 세계 전체에 먹고, 파셀 재빌드가 그것을 되돌리지
// 않는다. 이 회차에는 그 성질이 정확히 유리하다.
//
// ── 어디에 바를 것인가 = 드롭 대상 자체다 ───────────────────────────────────
// GLB 드롭은 「지면 좌표」가 그 인자였는데(`edit/input.ts` 의 `onDrop`), 텍스처는 좌표가
// 아니라 **표면과 슬롯**을 골라야 한다. 문서 전역 드롭에 인자를 새로 만드는 대신
// **슬롯 칸이 자기 드롭을 직접 받는다** — 어디에 놓았는가가 곧 어디에 바르는가다.
//
// ── 노브를 **하나만** 낸다 ──────────────────────────────────────────────────
// 「반짝임」과 「거칠기」는 같은 값의 양면이라(`glossToRoughness`) 화면에는 하나만 낸다.
// 둘을 보여 주면 하나를 움직일 때 다른 하나가 따라 움직이는 것을 감독이 보게 되고, 그때부터
// 두 노브 다 못 믿는다 — 그것이 거짓 UI 다.

import type { OverlayHost } from '../types.js';
import {
  MAP_SLOTS, REPEAT_MAX, REPEAT_MIN, SLOT_LABEL, SURFACE_KINDS, SURFACE_LABEL,
  glossToRoughness, roughnessToGloss, settingOf, textureSrcFor, upsertSetting,
  type MapSlot, type QuarterTurns, type SurfaceKind, type SurfaceSetting,
} from '../../decide/surface-material.js';

/** 화면에 내는 각도 — 계약이 정수 넷만 받으므로 목록도 넷이다 */
const TURNS: readonly QuarterTurns[] = [0, 1, 2, 3];

export interface SurfacePanel {
  readonly root: HTMLElement;
  /** 바깥에서 설정이 바뀌었을 때(부팅 로드·되돌리기) 화면을 맞춘다 */
  sync(): void;
}

export interface SurfacePanelDeps {
  /** 현재 설정 목록 */
  surfaces(): readonly SurfaceSetting[];
  /** 새 목록을 흘려보낸다. **반드시 새 배열**이다(`upsertSetting` 이 그것을 보장한다) */
  setSurfaces(s: readonly SurfaceSetting[]): void;
  /** 화면에 한 줄 말한다. 거절 사유를 감독이 봐야 한다 */
  say(msg: string, warn?: boolean): void;
  /**
   * 드롭한 파일을 즉시 보여줄 `blob:` 주소. 커밋 전에도 화면에서 확인하려면 이것이 필요하다.
   * **없으면 미리보기 없이 `src` 만 저장된다** — 그때는 파일을 커밋해야 그림이 뜬다.
   */
  previewUrl?(file: File): string | null;
}

export function createSurfacePanel(
  host: OverlayHost, deps: SurfacePanelDeps,
): SurfacePanel {
  const doc = host.doc;
  const root = doc.createElement('div');
  root.className = 'row surf';

  /** 지금 고른 표면. **첫 항목으로 시작한다** — null 이면 «아무것도 못 하는 화면» 이 된다 */
  let kind: SurfaceKind = SURFACE_KINDS[0] as SurfaceKind;

  function cur(): SurfaceSetting {
    return settingOf(deps.surfaces(), kind);
  }

  /** 한 필드를 고치고 화면을 다시 그린다. **경로가 하나다** — 값 미러링이 생길 자리가 없다 */
  function patch(p: Partial<Omit<SurfaceSetting, 'kind'>>): void {
    deps.setSurfaces(upsertSetting(deps.surfaces(), kind, p));
    sync();
  }

  function el(tag: string, cls?: string, text?: string): HTMLElement {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ── 표면 고르기 ───────────────────────────────────────────────────────────
  const title = el('div', 'lbl', '표면 재질');
  const pickBox = el('div', 'surf-pick');
  const pickBtns = new Map<SurfaceKind, HTMLButtonElement>();
  for (const k of SURFACE_KINDS as readonly SurfaceKind[]) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = SURFACE_LABEL[k];
    b.addEventListener('click', () => { kind = k; sync(); });
    pickBtns.set(k, b);
    pickBox.append(b);
  }

  // ── 배율 ──────────────────────────────────────────────────────────────────
  // `range` 로 낸다 — 감독이 «촘촘히» 를 찾는 동작은 값을 아는 것이 아니라 **훑는 것**이다.
  const repRow = el('div', 'surf-row');
  const repLbl = el('span', 'lbl', '배율');
  const repIn = doc.createElement('input');
  repIn.type = 'range';
  repIn.min = String(REPEAT_MIN);
  repIn.max = String(REPEAT_MAX);
  repIn.step = '1'; // 계약이 정수만 받는다 — 여기서 비정수를 만들면 조용히 접힌다
  const repVal = el('span', 'num');
  repIn.addEventListener('input', () => { patch({ repeat: Number(repIn.value) }); });
  repRow.append(repLbl, repIn, repVal);

  // ── 각도 ──────────────────────────────────────────────────────────────────
  // 슬라이더가 아니라 **버튼 넷**이다. 계약이 0~3 정수만 받으므로(임의 각도는 파셀 변마다
  // 사선 이음매를 만든다) 연속 노브를 내면 «중간값이 있는 척» 하는 거짓 UI 가 된다.
  const rotRow = el('div', 'surf-row');
  const rotBtns = new Map<QuarterTurns, HTMLButtonElement>();
  for (const t of TURNS) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = `${t * 90}°`;
    b.addEventListener('click', () => { patch({ turns: t }); });
    rotBtns.set(t, b);
  }
  rotRow.append(el('span', 'lbl', '각도'), ...rotBtns.values());

  // ── 반짝임 · 메탈릭 ───────────────────────────────────────────────────────
  function slider(label: string, onInput: (v: number) => void): {
    row: HTMLElement; input: HTMLInputElement; out: HTMLElement;
  } {
    const row = el('div', 'surf-row');
    const input = doc.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '1';
    input.step = '0.05';
    const out = el('span', 'num');
    input.addEventListener('input', () => { onInput(Number(input.value)); });
    row.append(el('span', 'lbl', label), input, out);
    return { row, input, out };
  }

  // 「하이라이트」 = 반짝임(감독 카드 확인). 계약에는 러프니스로 들어간다 — 뒤집는 지점이
  // **여기 한 곳**이고, 그래서 «노브는 하나» 라는 문장이 참으로 유지된다.
  const gloss = slider('반짝임', (v) => { patch({ roughness: glossToRoughness(v) }); });
  const metal = slider('메탈릭', (v) => { patch({ metalness: v }); });

  // ── 맵 슬롯 넷 ────────────────────────────────────────────────────────────
  const slotBox = el('div', 'surf-slots');
  const slotRows = new Map<MapSlot, { box: HTMLElement; name: HTMLElement }>();
  for (const slot of MAP_SLOTS) {
    const box = el('div', 'surf-slot');
    box.dataset.slot = slot;
    const name = el('span', 'sname', '비어 있음');
    const clear = doc.createElement('button');
    clear.type = 'button';
    clear.textContent = '×';
    clear.title = '이 맵을 걷는다';
    clear.addEventListener('click', () => { patch({ [slot]: undefined }); });

    // 드롭을 **이 칸이 직접** 받는다. `dragover` 에서 기본 동작을 막지 않으면 브라우저가
    // 파일을 새 탭으로 연다 — 그러면 편집 화면이 통째로 사라진다.
    box.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      ev.stopPropagation(); // 문서 전역 GLB 드롭 핸들러까지 가지 않게
      box.dataset.over = '1';
    });
    box.addEventListener('dragleave', () => { delete box.dataset.over; });
    box.addEventListener('drop', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      delete box.dataset.over;
      onDropFile(slot, (ev as DragEvent).dataTransfer?.files?.[0] ?? null);
    });

    box.append(el('span', 'lbl', SLOT_LABEL[slot]), name, clear);
    slotRows.set(slot, { box, name });
    slotBox.append(box);
  }

  /**
   * 떨어뜨린 파일을 그 슬롯에 건다.
   *
   * ⚠ **이름을 몰래 고쳐 주지 않는다.** 저장되는 `src` 는 `assets/textures/<파일명>` 이고
   * 그 파일을 커밋하는 것은 부팀장 몫이라, 여기서 이름을 바꾸면 감독이 커밋할 파일명과
   * 어긋난다. 그래서 거절하고 **왜인지 말한다**(`decide` 의 `textureSrcFor` 가 판정한다).
   */
  function onDropFile(slot: MapSlot, file: File | null): void {
    if (!file) return;
    const src = textureSrcFor(file.name);
    if (!src) {
      deps.say(
        `«${file.name}» 은 쓸 수 없는 이름입니다 — 영문·숫자·_ - . 만, 확장자는 소문자 .png .jpg .jpeg .webp`,
        true,
      );
      return;
    }
    // 미리보기는 있으면 좋고 없어도 진행한다 — 저장되는 값은 어느 쪽이든 `src` 다.
    const preview = deps.previewUrl?.(file) ?? null;
    if (preview) previews.set(src, preview);
    patch({ [slot]: src });
    deps.say(`${SURFACE_LABEL[kind]} · ${SLOT_LABEL[slot]} ← ${file.name}`);
  }

  /**
   * 드롭 미리보기 주소. **계약에는 안 들어간다** — `blob:` 은 세션이 끝나면 죽고,
   * 계약이 절대 URL 을 금지하는 이유도 그것이다(`isSafeTextureSrc`).
   *
   * ⚠ 지금은 **모아 두기만 한다.** 집행이 이것을 읽는 문은 아직 없어서, 커밋 전에는 그림이
   * 안 뜨고 슬롯 이름만 바뀐다. 그 문을 여는 것은 다음 회차이고, 그전까지 이 Map 은
   * 「무엇을 커밋해야 하는가」의 목록 노릇을 한다(`pending()`).
   */
  const previews = new Map<string, string>();

  const pendingLine = el('div', 'note');

  // ── 조립 ──────────────────────────────────────────────────────────────────
  root.append(title, pickBox, repRow, rotRow, gloss.row, metal.row, slotBox, pendingLine);

  function sync(): void {
    const s = cur();
    for (const [k, b] of pickBtns) b.dataset.on = k === kind ? '1' : '';
    repIn.value = String(s.repeat);
    repVal.textContent = `×${s.repeat}`;
    for (const [t, b] of rotBtns) b.dataset.on = t === s.turns ? '1' : '';
    const g = roughnessToGloss(s.roughness);
    gloss.input.value = String(g);
    gloss.out.textContent = g.toFixed(2);
    metal.input.value = String(s.metalness);
    metal.out.textContent = s.metalness.toFixed(2);
    for (const slot of MAP_SLOTS) {
      const row = slotRows.get(slot)!;
      const src = s[slot];
      row.name.textContent = src ? src.replace('assets/textures/', '') : '비어 있음';
      row.box.dataset.on = src ? '1' : '';
    }
    // 커밋해야 할 파일이 있으면 그것을 말한다 — 안 적으면 «그림이 왜 안 뜨지» 가 된다.
    const need = [...previews.keys()].filter((src) => used().has(src));
    pendingLine.textContent = need.length
      ? `커밋 대기 ${need.length}개: ${need.map((s2) => s2.replace('assets/textures/', '')).join(', ')}`
      : '';
  }

  /** 지금 목록이 실제로 쓰는 텍스처 경로 전부 */
  function used(): Set<string> {
    const out = new Set<string>();
    for (const s of deps.surfaces()) {
      for (const slot of MAP_SLOTS) { const v = s[slot]; if (v) out.add(v); }
    }
    return out;
  }

  sync();
  return { root, sync };
}
