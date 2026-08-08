// world2/ui/loading.ts — 로딩 화면 컨트롤러.
//
// ── 왜 이게 필요한가 ─────────────────────────────────────────────────────────
// 현행 world.html에는 로딩 표시가 **아예 없다.** 부팅이 끝날 때까지 검은 화면이고, 그건
// "느린 것"과 "고장난 것"을 사용자가 구별할 수 없다는 뜻이다. 감독 보고로 올라온
// "로딩이 끝났는데 화면이 빈 채로 남는다"도 여기서 갈라진 문제였다 — 아무 표시가 없으니
// 어느 쪽인지조차 알 수 없었다.
//
// ── 이 파일이 하지 않는 일 ───────────────────────────────────────────────────
// 마크업과 CSS는 world3.html에 있다. 여기서는 **찾아서 갱신만** 한다. 스타일 문자열을
// JS로 만들어 넣으면 CSP·디자인 시스템 양쪽에서 관리 지점이 둘로 갈라진다.
//
// ── 애니메이션을 JS로 돌리지 않는 이유 ───────────────────────────────────────
// 로딩 중에는 메인 스레드가 가장 바쁘다. 그 시간에 JS로 바를 움직이면 그 애니메이션 자체가
// 끊긴다 — 끊기는 진행바는 "멈춤"의 신호로 읽혀서 없느니만 못하다. 폭만 바꾸고 보간은
// CSS transition에 맡긴다.

import type { BootReport } from '../boot.js';
import type { BootStage } from '../decide/boot.js';
import { COPY, FADE_MS, copySlot, loadingDetail, type LoadingDetail } from '../decide/loading-copy.js';

export interface LoadingParts {
  root: HTMLElement;
  bar: HTMLElement;
  label: HTMLElement;
  percent: HTMLElement;
  note: HTMLElement;
  copy: HTMLElement;
}

/** 기본 선택자. world3.html의 마크업과 짝을 이룬다. */
const SEL = {
  root: '#w3-loading',
  bar: '#w3-loading-bar',
  label: '#w3-loading-label',
  percent: '#w3-loading-pct',
  note: '#w3-loading-note',
  copy: '#w3-loading-copy',
} as const;

/**
 * 로딩 화면을 잡는다. 요소가 하나라도 없으면 **null** — 조용히 no-op 객체를 돌려주지 않는다.
 * 마크업이 빠진 걸 모르고 지나가면 "로딩이 안 보이는" 버그를 배포까지 끌고 간다.
 */
export function findLoading(doc: Document): LoadingParts | null {
  const get = (s: string) => doc.querySelector<HTMLElement>(s);
  const root = get(SEL.root);
  const bar = get(SEL.bar);
  const label = get(SEL.label);
  const percent = get(SEL.percent);
  const note = get(SEL.note);
  const copy = get(SEL.copy);
  if (!root || !bar || !label || !percent || !note || !copy) return null;
  return { root, bar, label, percent, note, copy };
}

export class LoadingView {
  private readonly p: LoadingParts;
  private done = false;
  /** 마지막으로 화면에 쓴 정수 퍼센트 — 같은 값을 다시 쓰면 레이아웃만 낭비한다 */
  private lastPct = -1;
  private noteShown = '';
  /** 지금 보여주는 문구 인덱스. 바뀔 때만 DOM을 만진다 */
  private copyIdx = -1;
  private swapTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly copyList: readonly string[];
  /** 현재 화면 밀도. 되돌아가지 않는다 */
  private detail: LoadingDetail = 'minimal';

  constructor(parts: LoadingParts, copyList: readonly string[] = COPY) {
    this.p = parts;
    this.copyList = copyList;
    this.p.root.setAttribute('role', 'status');
    this.p.root.setAttribute('aria-live', 'polite');
    this.p.bar.setAttribute('role', 'progressbar');
    this.p.bar.setAttribute('aria-valuemin', '0');
    this.p.bar.setAttribute('aria-valuemax', '100');
    this.p.root.dataset.detail = 'minimal'; // 3초 이하면 바만 보인다(감독 지시)
  }

  /** 부팅 보고를 화면에 반영한다. */
  update(r: BootReport): void {
    if (this.done) return; // 이미 걷었으면 되살리지 않는다
    const pct = Math.round(r.progress * 100);
    if (pct !== this.lastPct) {
      this.lastPct = pct;
      this.p.bar.style.width = `${pct}%`;
      this.p.bar.setAttribute('aria-valuenow', String(pct));
      this.p.percent.textContent = `${pct}%`;
    }
    // 라벨은 밀도와 무관하게 계속 갱신한다. 숨기는 일은 CSS가 하므로, rich로 넘어가는
    // 순간 이미 올바른 단계가 적혀 있다(전환 후에 한 박자 늦게 채워지지 않는다).
    if (this.p.label.textContent !== r.label) this.p.label.textContent = r.label;

    // 밀도 승격. 되돌리지 않는다 — 진행이 빨라졌다고 문구가 사라지면 읽던 문장이 지워진다.
    if (this.detail === 'minimal' && loadingDetail(r.elapsedMs) === 'rich') {
      this.detail = 'rich';
      this.p.root.dataset.detail = 'rich';
    }

    // 느린 기기 안내. 남은 시간 추정이 있으면 같이 보여준다 — "얼마나"를 아는 것과
    // 모르는 것은 기다림의 성격이 다르다.
    const note = r.slow ? slowNote(r.remainMs) : '';
    if (note !== this.noteShown) {
      this.noteShown = note;
      this.p.note.textContent = note;
      this.p.note.hidden = note === '';
    }

    this.updateCopy(r.elapsedMs);
  }

  /**
   * 로딩 문구를 회전시킨다.
   *
   * 3초를 넘기기 전에는 아무것도 뜨지 않는다(감독 지시) — `copySlot`이 그 구간에서 -1을
   * 돌려준다. 그러니 빠른 부팅에서는 문구가 아예 등장하지 않는다. 보여주려고 로딩을
   * 늘리지 않는다는 규약이 여기서 지켜진다.
   *
   * 교체 시에만 페이드하고 보간은 CSS에 맡긴다(로딩 중 메인 스레드가 가장 바쁘므로
   * JS 애니메이션을 돌리지 않는다).
   */
  private updateCopy(elapsedMs: number): void {
    const next = copySlot(elapsedMs, this.copyList.length);
    if (next < 0 || next === this.copyIdx) return;

    const first = this.copyIdx < 0;
    this.copyIdx = next;
    const text = this.copyList[next];

    if (first) {
      // 첫 문구는 곧바로 띄운다. 페이드로 들어오면 로딩 시작이 굼떠 보인다.
      this.p.copy.textContent = text;
      this.p.copy.dataset.show = '1';
      return;
    }
    // 교체: 사라진 뒤 바꿔 넣는다. 글자가 겹쳐 보이면 읽기 어렵다.
    this.p.copy.dataset.show = '0';
    if (this.swapTimer) clearTimeout(this.swapTimer);
    this.swapTimer = setTimeout(() => {
      this.swapTimer = null;
      if (this.done) return; // 걷힌 뒤 늦게 도착한 교체는 버린다
      this.p.copy.textContent = text;
      this.p.copy.dataset.show = '1';
    }, FADE_MS);
  }

  /** 남은 타이머를 정리한다. 걷기·실패 양쪽에서 부른다. */
  private clearTimers(): void {
    if (this.swapTimer) { clearTimeout(this.swapTimer); this.swapTimer = null; }
  }

  /**
   * 부팅 실패. 화면을 **걷지 않고** 원인을 보여준다.
   * 여기서 조용히 사라지면 사용자는 빈 3D 화면 앞에 남는다 — 그게 최악의 결말이다.
   */
  fail(stage: BootStage, err: unknown): void {
    this.done = true;
    this.clearTimers();
    // 실패 화면에서 문구가 계속 도는 건 부적절하다 — 읽어야 할 것은 오류 내용이다.
    this.p.copy.dataset.show = '0';
    this.p.root.dataset.state = 'error';
    this.p.label.textContent = '전시 공간을 열지 못했습니다';
    this.p.percent.textContent = '';
    this.p.bar.style.width = '100%';
    const detail = err instanceof Error ? err.message : String(err);
    this.p.note.textContent = `${stage} 단계에서 멈췄습니다 — ${detail}`;
    this.p.note.hidden = false;
  }

  /**
   * 로딩 화면을 걷는다. **첫 프레임이 실제로 그려진 뒤**에만 불러야 한다 —
   * 그게 감독 보고("로딩이 끝났는데 화면이 빈 채로")의 직접 원인이었다.
   * 실제 제거는 CSS 전이가 끝난 뒤 호출자가 하거나, 여기서 상태만 바꾸고 둔다.
   */
  dismiss(): void {
    if (this.done) return;
    this.done = true;
    this.clearTimers();
    this.p.root.dataset.state = 'done';
    this.p.root.setAttribute('aria-hidden', 'true');
  }

  /** 걷혔거나 실패했는가 */
  get finished(): boolean { return this.done; }
}

/** 느린 부팅 안내 문구. 추정이 없으면 시간을 말하지 않는다(엉뚱한 숫자보다 낫다). */
export function slowNote(remainMs: number | null): string {
  const base = '이 기기에서는 조금 더 걸립니다';
  if (remainMs == null) return `${base}.`;
  const s = Math.ceil(remainMs / 1000);
  if (s <= 1) return `${base} — 곧 끝납니다.`;
  if (s < 60) return `${base} — 약 ${s}초 남음.`;
  return `${base} — 약 ${Math.ceil(s / 60)}분 남음.`;
}
