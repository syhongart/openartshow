// 포근마을 배경음 — **소리를 파일이 아니라 코드로 만든다.**
//
// ── 왜 절차 생성인가 ────────────────────────────────────────────────────────
// 이 저장소의 **자기완결 규율**이 외부 호스트 0 을 요구한다(CDN·폰트·이미지·GLB 금지,
// CSP `default-src 'self'`). 오디오 파일을 넣는 것 자체는 자기 호스트라 규율 위반이
// 아니지만, 쓸 만한 길이의 루프는 수백 KB 다 — 정적 배포에서 그것은 첫 로딩에 얹히는
// 비용이고, 감독이 모바일에서 여는 페이지다. WebAudio 로 만들면 **0 바이트**다.
//
// ── 감독 지시 ───────────────────────────────────────────────────────────────
// 2026-08-08: *"동물의숲으로 만들어봐. **귀욤 뽕짝으로.**"*
//
// "뽕짝" 을 리듬으로 읽었다 — 2박 계열의 **쿵-짝** 교대(1·3박 베이스, 2·4박 화음)가
// 그 말이 가리키는 가장 또렷한 음악적 실체다. 거기에 "귀욤" 을 얹는 방법으로 **장조
// 5음계**를 골랐다: 반음이 없어 어떤 두 음을 겹쳐도 불협이 안 나고, 그래서 멜로디를
// 난수로 걸어도 계속 순하게 들린다. 단조 5음계로 하면 같은 리듬이 뽕짝은 되는데
// 구슬퍼진다.
//
// ⚠️ **법무 경계 (2026-08-08 실사)**: 특정 게임의 **시그니처 사운드 로고**와 *"정시마다
// 짧은 멜로디로 전환되는 시간대별 배경음악 시스템"* 은 AMBER(누적 유사성)로 분류됐다.
// 그래서 여기는 **시간대에 반응하지 않는다** — 하루 종일 같은 루프다. 이 제약은 기능
// 미비가 아니라 **판정**이고, 시간대 연동을 넣고 싶어지면 법무를 다시 거쳐야 한다.
//
// ── 렌더 루프와 무관하다 ────────────────────────────────────────────────────
// `features/` 계약(prewarm·drawGroupKey·System 등록)을 타지 않는다. 소리는 그릴 것이
// 없어 드로우콜·지오메트리·파이프라인 어느 축에도 안 걸리고, 성능 불변식 게이트
// (`[7]` 개수 불변)와도 무관하다. 계약을 태우면 얻는 것 없이 결합만 생긴다.

/** 초당 박자 수를 정하는 템포. 걷는 속도보다 조금 빠른 쪽이 통통 튄다 */
const BPM = 116;
const BEAT = 60 / BPM;

/**
 * 마스터 볼륨 상한. **작다.** 3D 를 보러 온 사람에게 소리는 곁들임이고, 크면 첫인상이
 * "시끄러운 페이지" 가 된다 — 그 인상은 볼륨을 줄여도 안 돌아온다.
 */
const MASTER = 0.18;

/**
 * 장조 5음계(반음 없음). C 를 0 으로 한 반음 단위 — 도·레·미·솔·라.
 *
 * **반음이 없다는 것이 이 배열의 존재 이유다.** 멜로디를 난수로 고르는데도 불협이
 * 안 나는 것이 여기서 온다. 여기에 4(파)나 11(시)을 더하면 그 순간 난수 멜로디가
 * 어긋난 음을 짚기 시작한다 — 값을 늘리기 전에 이 문장을 먼저 본다.
 */
const PENTA = [0, 2, 4, 7, 9];

/** 기준음 A3(220Hz) 기준의 반음 → 주파수 */
const hz = (semi: number) => 220 * Math.pow(2, semi / 12);

/**
 * 화성 진행. 마디마다 근음(반음)과 그 위에 쌓을 화음 구성음.
 *
 * I–V–vi–IV 다. 대중가요에서 가장 닳도록 쓰인 진행이고 **그래서 골랐다** — 처음 듣는
 * 8초 루프가 편안하게 들려야 하는데, 익숙함이 그 편안함의 대부분이다.
 */
const PROG = [
  { root: 3, chord: [3, 7, 10] },   // C
  { root: 10, chord: [10, 14, 17] }, // G
  { root: 0, chord: [0, 3, 7] },     // Am
  { root: 8, chord: [8, 12, 15] },   // F
];

/** 한 음을 낸다. 짧은 어택·감쇠로 통통 튀는 소리를 만든다 */
function blip(
  ctx: AudioContext, out: GainNode,
  freq: number, at: number, dur: number, gain: number,
  type: OscillatorType,
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  // 어택을 0 으로 두면 딸깍(클릭 노이즈)이 난다 — 파형이 0 이 아닌 값에서 시작하기
  // 때문이다. 8ms 는 귀에 "부드러워졌다" 로 안 들리면서 클릭만 없애는 최소치다.
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** 쿵 — 낮고 짧은 베이스. 사인파라 배음이 없어 멜로디를 안 가린다 */
function kick(ctx: AudioContext, out: GainNode, freq: number, at: number): void {
  blip(ctx, out, freq, at, BEAT * 0.55, 0.5, 'sine');
}

/** 짝 — 화음 세 음을 아주 짧게. 삼각파로 가볍게 */
function chord(ctx: AudioContext, out: GainNode, semis: readonly number[], at: number): void {
  for (const s of semis) blip(ctx, out, hz(s + 12), at, BEAT * 0.28, 0.13, 'triangle');
}

export interface VillageBgm {
  /** 켜고 끄기. 사용자 제스처 안에서 부른다 */
  toggle(): Promise<boolean>;
  /** 현재 재생 중인가 */
  playing(): boolean;
  dispose(): void;
}

/**
 * 배경음을 만든다. **`AudioContext` 는 여기서 만들지 않는다** — `toggle()` 이 처음
 * 호출될 때 만든다.
 *
 * 이유가 브라우저 정책이다: 사용자 제스처 없이 `AudioContext` 를 만들면 `suspended`
 * 상태로 태어나고, 크롬은 그때 콘솔에 경고를 남긴다. 이 저장소의 스모크는 **콘솔
 * 에러·경고 축을 실제로 판정하므로**(`[4]`·`[7]`), 페이지를 열기만 해도 경고가 뜨는
 * 구조는 게이트를 흔든다. 소리는 사용자가 원할 때만 태어나면 된다.
 */
export function createVillageBgm(): VillageBgm {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let timer: number | null = null;
  let bar = 0;
  /** 다음으로 예약을 마친 시각(ctx 시간). 여기까지는 이미 스케줄돼 있다 */
  let scheduledTo = 0;
  let on = false;
  /**
   * **`await` 앞에서 서는 동기 가드.** `on` 도 `timer` 도 `await ctx.resume()` 뒤에
   * 설정되므로 그 대기 구간을 못 덮는다 — `start()` 주석 참고.
   */
  let starting = false;

  /**
   * **미리 예약하고 타이머로 따라간다.** `setInterval` 로 그때그때 소리를 내면 메인
   * 스레드가 밀릴 때 박자가 함께 밀린다 — 3D 를 그리는 페이지에서 그것은 상시 위험이다.
   * WebAudio 는 오디오 스레드에서 정확한 시각에 울리므로, JS 는 **조금 앞을 미리
   * 잡아 두는 일만** 한다. 0.4초 앞까지 잡고 0.12초마다 확인한다.
   */
  const LOOKAHEAD = 0.4;
  const TICK_MS = 120;

  function scheduleBar(at: number): void {
    if (!ctx || !master) return;
    const p = PROG[bar % PROG.length];
    // 한 마디 = 4박. 쿵(1·3) / 짝(2·4) — 이 교대가 "뽕짝" 이라는 말이 가리키는 것이다.
    kick(ctx, master, hz(p.root - 12), at);
    chord(ctx, master, p.chord, at + BEAT);
    kick(ctx, master, hz(p.root - 12), at + BEAT * 2);
    chord(ctx, master, p.chord, at + BEAT * 3);

    // 멜로디는 마디당 4음. 5음계라 난수로 골라도 순하게 들린다(위 `PENTA` 주석).
    // 마디 번호를 시드로 섞어 **루프마다 같은 프레이즈가 나온다** — 완전 난수면
    // 기억에 남지 않아 배경음이 아니라 소음으로 들린다.
    for (let i = 0; i < 4; i++) {
      const seed = (bar * 7 + i * 13) % PENTA.length;
      // 4음 중 한 자리는 쉰다. 쉼표가 없으면 멜로디가 숨을 안 쉬어 답답해진다.
      if ((bar + i) % 4 === 2) continue;
      const oct = ((bar + i) % 3 === 0) ? 24 : 12;
      blip(ctx, master, hz(PENTA[seed] + p.root + oct), at + BEAT * i, BEAT * 0.42, 0.1, 'triangle');
    }
    bar++;
  }

  function pump(): void {
    if (!ctx || !on) return;
    while (scheduledTo < ctx.currentTime + LOOKAHEAD) {
      scheduleBar(scheduledTo);
      scheduledTo += BEAT * 4;
    }
  }

  async function start(): Promise<void> {
    // ── 재진입 가드 (검수관 권고 P2, 처방 두 번째) ────────────────────────
    // 두 번째 클릭이 `await ctx.resume()` 대기 중에 들어오면 `start()` 가 두 번
    // 실행되고, 아래 `setInterval` 이 `timer` 를 덮어쓴다 — **첫 interval 은 핸들을
    // 잃어 영영 `clearInterval` 할 수 없다.** 소리를 꺼도 스케줄러가 계속 돈다.
    //
    // ⚠️ **첫 처방이 틀렸다** (검수관 조건 ②, 2026-08-08). `if (timer !== null)` 로
    // 막고 그 옆에 *"`on` 은 resume 뒤에 서므로 경합 구간을 못 덮는다"* 라고 근거를
    // 적었는데, **`timer` 도 정확히 같은 자리에 선다** — 설정이 `await` 뒤(`:195`)라
    // 대기 중에는 여전히 `null` 이고 가드를 그대로 통과한다. 막았다고 적어 놓고
    // 같은 축을 안 막은 것이고, 이번 회차의 블로커 B1 과 **똑같은 형태**다.
    //
    // 가드는 `await` **앞에서 동기적으로** 서야 한다. 그것이 `starting` 이다.
    //
    // (완화 요인이 있어 실해는 작았다 — `stop()` 이 컨텍스트를 suspend 하지 않으므로
    //  재시작 경로에서는 `state === 'running'` 이라 `await` 이 실행되지 않고 `start()`
    //  가 동기 완주한다. 위험은 **첫 켜기 더블탭** 한정이었다. 그래도 고친다:
    //  근거가 성립하지 않는 주석을 남기는 것이 이 저장소가 반복해 데인 실패다.)
    if (on || starting) return;
    starting = true;
    try {
      await startInner();
    } finally {
      starting = false;
    }
  }

  async function startInner(): Promise<void> {
    if (!ctx) {
      // 사파리는 접두사 붙은 이름만 가진 판본이 남아 있다. 없으면 조용히 포기한다 —
      // 소리는 곁들임이라 없다고 페이지가 못 돌 이유가 없다.
      const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      scheduledTo = ctx.currentTime + 0.08;
    }
    // 제스처 안에서 부르지 않으면 `suspended` 로 남는다. 켤 때마다 깨운다.
    if (ctx.state === 'suspended') await ctx.resume();
    // ── 과거로 밀린 커서를 끌어올린다 (검수관 권고 P1) ────────────────────
    // `scheduledTo` 는 컨텍스트를 처음 만들 때만 초기화되고 `stop()` 은 건드리지
    // 않는다. 껐다가 T초 뒤 켜면 `pump()` 의 `while (scheduledTo < currentTime +
    // LOOKAHEAD)` 가 **그 T초 동안의 마디를 한꺼번에** 스케줄한다 — 마디당 노드가
    // 약 11개이므로 10분 방치 후 재생이면 3,000개 넘는 노드를 한 프레임에 만든다.
    // 시각이 과거라 **소리는 안 나는데** 3D 를 그리는 메인 스레드만 멈춘다. 증상이
    // 소리 쪽에 안 나타나서 원인을 짚기 어려운 형태다.
    scheduledTo = Math.max(scheduledTo, ctx.currentTime + 0.08);
    on = true;
    // 갑자기 튀어나오지 않게 0.6초 페이드인.
    master!.gain.cancelScheduledValues(ctx.currentTime);
    master!.gain.setValueAtTime(master!.gain.value, ctx.currentTime);
    master!.gain.linearRampToValueAtTime(MASTER, ctx.currentTime + 0.6);
    pump();
    timer = window.setInterval(pump, TICK_MS);
  }

  function stop(): void {
    on = false;
    if (timer !== null) { clearInterval(timer); timer = null; }
    if (!ctx || !master) return;
    // 페이드아웃만 하고 컨텍스트는 살려 둔다. 매번 닫았다 열면 다시 켤 때 지연이
    // 생기고, 열려 있는 컨텍스트 하나의 비용은 무시할 만하다.
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
  }

  return {
    async toggle() {
      if (on) { stop(); return false; }
      await start();
      return on;
    },
    playing: () => on,
    dispose() {
      stop();
      // 페이드아웃이 끝난 뒤 닫는다. 즉시 닫으면 꼬리가 뚝 끊겨 딸깍 소리가 난다.
      const c = ctx;
      if (c) window.setTimeout(() => { void c.close(); }, 400);
      ctx = null; master = null;
    },
  };
}
