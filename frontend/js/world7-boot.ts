// world7-boot.ts — world7.html 의 진입점. **사람이 고른 GLB 가 세계가 된다.**
//
// behind-flag: 이 페이지는 어디에도 링크하지 않는다. 라이브 노출은 감독·팀장 게이트.
//
// ── world8 과 무엇이 다른가 — 이 파일뿐이다 ─────────────────────────────────
// 감독 지시 2026-08-26: *"GLB파일을 임포트 하면. 알아서 지도 만들고, 충돌만들고.
// 인스턴스.. 등 하게끔해."* · *"방금 한것처럼 월드2가 그대로 들어오게해."*
//
// 팀장 판정 **(A) 트리 공유**: 두 페이지는 세계·기능·조작이 전부 같고 「GLB 를 어디서
// 얻는가」 하나만 다르다. 그래서 45,170줄을 복제하지 않고 `js/world-glb/` 를 함께 쓴다.
// **갈리는 자리는 아래 `source` 하나**이고, 그 경계는 `world-glb/main.ts` 의
// `GlbWorldOptions` 주석이 못 박는다 — *"이 트리 안에 페이지 분기를 늘리지 마라."*
//
// ⚠ **고르기 전에는 `startGlbWorld` 를 안 부른다.** 부팅 진행률은 「받는 시간」을
// 포함해야 하는데 여기서는 그 시간이 **사람이 고르는 시간**이라 로딩바로 표현할 수 없다.
// 그래서 파일이 정해진 «뒤» 부팅을 시작하고, 그때부터는 world8 과 완전히 같은 경로다.

import { startGlbWorld } from './world-glb/main.js';

const pick = document.getElementById('wg-pick');
const pickBtn = document.getElementById('wg-pickBtn');
const fileInput = document.getElementById('wg-file');
const statusEl = document.getElementById('wg-status');
const againBtn = document.getElementById('wg-again');
const canvas = document.getElementById('wg-canvas');

function say(text: string): void {
  if (statusEl) statusEl.textContent = text;
}

/** 파일 하나를 받아 세계를 연다. **한 번만** 성공한다 — 두 번째는 새로고침이다 */
async function open(file: File): Promise<void> {
  if (!(canvas instanceof HTMLCanvasElement)) {
    console.error('[world7] 캔버스(#wg-canvas)를 찾지 못했습니다');
    return;
  }
  say(`${file.name} — 읽는 중…`);
  let buf: ArrayBuffer;
  try {
    buf = await file.arrayBuffer();
  } catch (err) {
    say('파일을 읽지 못했습니다.');
    console.error('[world7] 파일 읽기 실패', err);
    return;
  }
  // 고르기 화면을 걷는다. 이제부터는 `world-glb` 의 로딩 화면이 진행을 보고한다.
  pick?.classList.add('hide');
  againBtn?.removeAttribute('hidden');
  startGlbWorld(canvas, {
    tag: 'world7',
    // ⚠ **두 페이지가 갈리는 유일한 자리다.** world8 은 여기서 고정 자산을 `fetch` 한다.
    //    이미 읽어 둔 버퍼를 그대로 낸다 — 부팅 파이프라인은 어느 쪽인지 모른다.
    source: async () => buf,
    // ⚠ **world7 에만 켠다** — 감독 지시 2026-08-28 *"당분간.. 월드7에만.."*.
    // 여기가 「world7 만 다르게」를 표현하는 자리다(트리 안에서 `tag` 로 갈라 짜면
    // `options.ts` 의 경계 조항을 처음 깨는 것이 된다).
    checklist: true,
  }).catch((err: unknown) => {
    // startGlbWorld 는 부팅 실패를 로딩 화면에 표시하고 null 을 돌려준다. 여기 오는 건
    // 그보다 바깥의 예외이므로 콘솔에 남긴다 — 조용히 삼키면 원인 추적이 불가능해진다.
    console.error('[world7] 진입 실패', err);
  });
}

pickBtn?.addEventListener('click', () => (fileInput as HTMLInputElement | null)?.click());
fileInput?.addEventListener('change', () => {
  const f = (fileInput as HTMLInputElement).files?.[0];
  if (f) void open(f);
});

// 창에 끌어다 놓기. `dragover` 의 `preventDefault` 가 없으면 브라우저가 파일을 열어 버린다.
addEventListener('dragover', (e) => { e.preventDefault(); });
addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f) void open(f);
});

// 「다른 파일」 — **새로고침한다.** 세계를 통째로 갈아 끼우는 것은 부팅 파이프라인의
// 전제(풀 봉인·개수 불변식)를 깨므로, 다시 세우는 것이 아니라 다시 시작한다.
againBtn?.addEventListener('click', () => { location.reload(); });
