// world10/edit/aim-mode.ts — **「어디에 걸까요」 조준 화면** (W8-6).
//
// ── 감독 지시 (2026-08-17) ────────────────────────────────────────────────
// *"조준 화면 그것도 해줘"* — W8-5 로 폰에서 사진을 넣을 수 있게 됐지만 **두 번에 한 번만
// 걸렸다**(실측 50.0%). 원인은 조준이 부정확한 것이 **아니라** 감독이 무엇을 조준하는지
// **볼 수 없다는 것**이었다: 폰 폭 390px 에 편집 패널이 212px 라 화면 한가운데(195,422)가
// 패널 아래로 들어간다. crosshair 를 그려도 그 위에 패널이 덮인다.
//
// ── 팀장 판정 (B) 와 그 조건 (2026-08-17) ─────────────────────────────────
// *"(B) 만이 「보고 확정」으로 피드백 루프를 만들어 블라인드 명중률 문제 자체를 폐기한다."*
//   조건 1 **벽 히트 실시간 시각 신호 + 확정은 히트 상태에서만 유효.**
//            *"이것이 빠지면 (B) 는 「패널만 접힌 (C)」다."*
//   조건 2 거절 문구 「벽을 화면 한가운데 두고」를 함께 고친다 — 폰에서 따를 수 없는
//            지시, 즉 **거짓 안내**다.
//
// ── 왜 자체 rAF 인가 ──────────────────────────────────────────────────────
// `OverlayHost`·`EditSession` 에 프레임 훅이 **없다**. 선례는 `edit/gizmo.ts` 하나이고
// **「붙어 있는 동안만 돈다」** 규약(대상이 없으면 다음 프레임을 안 잡는다)까지 못 박혀
// 있다 — 여기도 같은 형태다.
//
// ⚠ **`panel.refresh()` 에 얹지 않는다.** 그것은 이벤트 구동이라 **마우스를 안 움직이고
// WASD 로만 걸으면 한 번도 안 돌고**, 게다가 무겁다(팔레트 버튼 전수 순회 + `entries()`
// 필터). 조준은 카메라가 움직이는 동안 갱신돼야 한다.
//
// ── ⚠ `st.modal`(R/S 모달)을 재사용하지 않은 이유 ─────────────────────────
// 그 골격(시작 스냅샷 + 확정/취소)은 매력적이지만 **모달 중 우클릭이 취소로 소비되고**
// `onPointerMove` 가 즉시 return 해서 **시점 회전이 죽는다**. 조준은 고개를 돌리는 일이라
// 그것이 치명적이다. 그래서 취소는 **Esc + 버튼**으로 몰고 **우클릭은 시점에 남긴다.**
//
// ── ⚠⚠ 이 화면이 못 보장하는 것 ──────────────────────────────────────────
// 조준 판정과 확정 판정이 **같은 함수**(`pickFace` + `wallPose`)를 타므로 «초록인데 안
// 걸린다» 는 성립하지 않는다. 그러나 **CPU 비용은 여기서 판정되지 않는다** — 이 저장소는
// 프레임 시간을 안 재고 잴 수단도 없다(`decide/aim.ts` 헤더). 재캐스트 **횟수**만
// `stats().overlay.aim.casts` 로 내보내 게이트가 보게 한다. 횟수가 상한 안이어도 한 번이
// 느리면 화면은 버벅인다 — **감독 실기기가 유일한 판정이다.**

import { AIM_MIN_MS, aimHint, shouldRecast, type AimPose } from '../decide/aim.js';
import { wallPose } from '../decide/artwork.js';
import type { ArtworkMode } from './artwork-mode.js';
import type { Panel } from './panel/dom.js';
import type { Picker } from './pick.js';
import type { OverlayHost } from './types.js';

export interface AimModeDeps {
  readonly host: OverlayHost;
  readonly panel: Panel;
  readonly picker: Picker;
  readonly art: ArtworkMode;
  /** 지금(ms). **주입받는다** — 테스트가 시간을 몰아야 쓰로틀 축을 잴 수 있다 */
  now?(): number;
  /** 프레임 예약. 주입 가능한 이유는 위와 같다(노드에는 rAF 가 없다) */
  raf?(fn: () => void): number;
  cancel?(id: number): void;
}

/** 진단 스냅샷. ⚠ **불리언 + 숫자만** — `overlay-diag.ts` 의 크기 규약이다 */
export interface AimStats {
  /** 지금 벽을 보고 있는가(= 확정하면 걸린다) */
  readonly hit: boolean;
  /** 조준 화면이 떠 있는가 */
  readonly on: boolean;
  /** **누적 레이캐스트 횟수.** 게이트가 이것을 본다 */
  readonly casts: number;
}

export interface AimMode {
  /**
   * 조준을 시작한다. 이름이 계약을 통과 못 하면 `false` — 화면은 이미 사유를 말했다.
   *
   * ⚠ **이름 판정을 여기서 먼저 한다**(`art.judge`). 조준 화면을 띄운 뒤에 거절하면
   * «벽은 맞았는데 왜 안 걸리지» 가 된다 — `hang()` 이 이름을 가장 먼저 보는 그 규약이다.
   */
  start(file: File): boolean;
  /** 지금 조준 중인가 */
  active(): boolean;
  /** `Esc` 가 부른다. 조준 중이 아니면 `false`(다른 소비자가 그 키를 쓰게 둔다) */
  cancel(): boolean;
  /** 진단 — **캐시된 값**이다. 여기서 다시 쏘면 리포트를 읽는 것만으로 레이캐스트가 돈다 */
  stats(): AimStats;
  dispose(): void;
}

export function createAimMode(deps: AimModeDeps): AimMode {
  const { host, panel, picker, art } = deps;
  const doc = host.doc;
  const now = deps.now ?? (() => Date.now());
  const raf = deps.raf ?? ((fn: () => void) => requestAnimationFrame(fn));
  const cancelRaf = deps.cancel ?? ((id: number) => { cancelAnimationFrame(id); });

  // ── DOM — **3D 가 아니라 DOM 이다** ───────────────────────────────────────
  // 3D 메시로 그리면 `visible=false` 인 동안 GPU 자원이 아예 없다가 **처음 보이는 순간**
  // geo/tex/pipe 가 계단으로 오른다(`CLAUDE.md` 의 하늘 예열 실측과 같은 형태). DOM 은
  // `renderer.info` 축 밖이라 개수 게이트와 무관하다.
  //
  // 구조는 `panel/badge.ts` 를 본떴다 — `doc.body` 직접 부착, 상태는 `dataset` 으로만,
  // **숨김 판정은 CSS 가** 한다.
  const root = doc.createElement('div');
  root.id = 'wg-aim';
  root.dataset.on = '0';
  root.dataset.hit = '0';

  // 조준선은 **절대 클릭을 먹지 않는다**(`pointer-events:none`, CSS). 화면 한가운데 뜨는
  // 것이 클릭을 먹으면 그 자리 건물을 영영 못 고른다 — `badge.ts` 가 같은 경고를 갖는다.
  const cross = doc.createElement('div');
  cross.className = 'cross';

  const bar = doc.createElement('div');
  bar.className = 'bar';
  const msg = doc.createElement('div');
  msg.className = 'msg';
  const okBtn = doc.createElement('button');
  okBtn.type = 'button';
  okBtn.textContent = '여기 걸기';
  const noBtn = doc.createElement('button');
  noBtn.type = 'button';
  noBtn.textContent = '취소';
  bar.append(msg, okBtn, noBtn);
  root.append(cross, bar);
  doc.body.appendChild(root);

  // ── 상태 ────────────────────────────────────────────────────────────────
  let file: File | null = null;
  let src = '';
  let hit = false;
  let casts = 0;
  let busy = false;
  let loop = 0;
  let last = 0;
  let prev: AimPose | null = null;

  /** 카메라 자세. three 의 `matrixWorld` 3열이 로컬 +Z 의 월드 방향이고 카메라는 −Z 를 본다 */
  function poseOf(): AimPose | null {
    const cam = host.camera as unknown as {
      position?: { x: number; y: number; z: number };
      matrixWorld?: { elements: ArrayLike<number> };
    };
    const p = cam?.position;
    const e = cam?.matrixWorld?.elements;
    if (!p || !e) return null;
    return { x: p.x, y: p.y, z: p.z, dx: -Number(e[8]), dy: -Number(e[9]), dz: -Number(e[10]) };
  }

  function paint(): void {
    root.dataset.hit = hit ? '1' : '0';
    msg.textContent = aimHint(hit);
    // ⚠ `disabled` 를 쓰지 않는다 — 비활성 버튼은 **왜 못 누르는지 말하지 않는다.**
    // 누를 수는 있게 두고, 눌렀을 때 사유를 말한다(아래 `confirm`). 이 저장소가
    // «조작이 안 먹는 것과 대상이 없는 것은 다른 일» 로 여러 번 적은 축이다.
    okBtn.dataset.on = hit ? '1' : '0';
  }

  /** 한 프레임. **쏠지 말지는 `decide/aim.ts` 가 정한다** — 여기는 집행뿐이다 */
  function tick(): void {
    if (!file) { loop = 0; return; }        // 끝났으면 다음 프레임을 안 잡는다(gizmo 규약)
    const t = now();
    const pose = poseOf();
    if (pose && shouldRecast(prev, pose, t - last)) {
      last = t;
      prev = pose;
      casts++;
      const next = picker.castCenter() ? (() => {
        const f = picker.pickFace();
        return !!(f && wallPose(f));
      })() : false;
      if (next !== hit) { hit = next; paint(); }
    }
    loop = raf(tick);
  }

  /**
   * `Esc` 는 **여기서 듣는다** — `edit/input.ts` 에 넣지 않는다.
   *
   * 이유 둘: ① `input.ts` 는 `filesize-baseline.json` 에 625줄로 동결돼 있고 현재 정확히
   * 625다(여유 0) ② 이 리스너는 **조준 중에만** 붙으므로 «편집 리스너가 주행 중에도
   * 등록돼 있다» 는 이 저장소의 상시 위험(태스크 #43)을 안 만든다.
   *
   * 캡처 단계로 붙여 편집의 document 리스너보다 **먼저** 받는다 — 조준 중 `Esc` 는
   * 조준 취소이지 다른 무엇도 아니다.
   */
  function onKey(ev: KeyboardEvent): void {
    if (!file || ev.code !== 'Escape') return;
    ev.preventDefault();
    ev.stopPropagation();
    stop();
    panel.say('취소했습니다 — 사진은 걸리지 않았습니다.');
  }

  function stop(): void {
    if (loop !== 0) { cancelRaf(loop); loop = 0; }
    doc.removeEventListener('keydown', onKey, true);
    file = null;
    src = '';
    hit = false;
    prev = null;
    root.dataset.on = '0';
    panel.setAiming(false);
  }

  async function confirm(): Promise<void> {
    // ⚠ **히트일 때만 확정된다**(팀장 조건 1). 그리고 «지금은 안 된다» 를 **말한다** —
    // 아무 일도 안 일어나면 «버튼이 고장났나» 가 된다.
    if (!hit || !file) { panel.say(aimHint(false), true); return; }
    if (busy) return;                        // 연타 방지 — 같은 사진이 두 번 걸린다
    busy = true;
    try {
      // 자세를 **확정 시점에 다시 읽는다.** 마지막 tick 이후에도 고개가 움직였을 수 있고,
      // 그러면 화면이 가리킨 벽과 실제로 걸리는 벽이 갈린다.
      const f = picker.castCenter() ? picker.pickFace() : null;
      casts++;
      const pose = f && wallPose(f);
      if (!pose) { panel.say(aimHint(false), true); return; }
      const at = file;
      const s = src;
      stop();
      await art.commit(at, s, pose);
    } finally {
      busy = false;
    }
  }

  okBtn.addEventListener('click', () => { void confirm(); });
  noBtn.addEventListener('click', () => {
    if (!file) return;
    stop();
    panel.say('취소했습니다 — 사진은 걸리지 않았습니다.');
  });

  return {
    start(f: File): boolean {
      const v = art.judge(f);
      if (!v.ok) { panel.say(v.msg, true); return false; }
      file = f;
      src = v.src;
      hit = false;
      prev = null;
      // 첫 tick 이 **즉시** 쏘게 한다 — 화면이 뜬 순간 「지금 뭘 보고 있나」를 말해야 한다.
      last = now() - AIM_MIN_MS;
      root.dataset.on = '1';
      paint();
      panel.setAiming(true);
      panel.say(`«${f.name}» 을 걸 벽을 조준하세요.`);
      doc.addEventListener('keydown', onKey, true);
      if (loop === 0) loop = raf(tick);
      return true;
    },
    active: () => file !== null,
    cancel(): boolean {
      if (!file) return false;
      stop();
      panel.say('취소했습니다 — 사진은 걸리지 않았습니다.');
      return true;
    },
    stats: () => ({ hit, on: file !== null, casts }),
    dispose(): void {
      stop();
      root.remove();
    },
  };
}
