// Gemini API 키 입력 UI 배선 — 「계정」 탭.
//
// ── 왜 `app.ts` 가 아니라 별도 모듈인가 ────────────────────────────────────
// 키를 만지는 코드가 프로필 스키마·발행 경로와 **같은 모듈에 살면** 언젠가 누군가
// "이왕 여기 있으니" 하고 직렬화에 태운다. `gemini-key.ts`(보관)와 이 파일(UI)만
// 키를 알고, 둘 다 leaf 다. `tests/gemini-key-isolation.test.ts` 가 그 경계를 지킨다.
//
// ── 이번 범위는 「입력 + 저장 + 유효성 확인 1회」까지다 (팀장 판정 2026-08-10) ──
// 평론가(LLM 승격)는 이번에 안 붙인다 — 감독 요구 범위를 넘고 **비용 폭주 장치가
// 미설계**다. 다만 **UI 만 두면 키를 넣어도 성공했는지 알 수 없어서** 검증 호출 1회를
// 최소 소비처로 넣었다(팀장 조건 (다)).

import { readGeminiKey, writeGeminiKey } from './gemini-key.js';

/**
 * 키 유효성을 **1회** 확인한다.
 *
 * 모델 목록 조회가 가장 가벼운 인증 확인이다(생성 호출과 달리 **토큰을 안 쓴다** —
 * 확인 한 번에 요금이 붙으면 그것 자체가 사고다).
 *
 * ⚠ **키를 URL 쿼리에 넣지 않는다.** Gemini 는 `?key=` 도 받지만 URL 은 프록시·브라우저
 * 이력·서버 로그에 남는다. 헤더(`x-goog-api-key`)로 보낸다.
 */
async function verifyKey(key: string, signal: AbortSignal): Promise<{ ok: boolean; why: string }> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      method: 'GET',
      headers: { 'x-goog-api-key': key },
      signal,
      // 자격증명이 우리 오리진 밖으로 새 나가지 않게 — 쿠키를 안 붙인다.
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (res.ok) return { ok: true, why: '' };
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { ok: false, why: '키가 거부됐습니다 — 값을 다시 확인해 주세요' };
    }
    return { ok: false, why: `구글 응답 ${res.status} — 잠시 뒤 다시 시도해 주세요` };
  } catch (e) {
    // **못 잰 것을 통과로 적지 않는다** — 네트워크 실패를 "유효" 로 보이게 하지 않는다.
    const msg = e instanceof Error && e.name === 'AbortError' ? '확인을 멈췄습니다' : '연결하지 못했습니다';
    return { ok: false, why: msg };
  }
}

/** 「계정」 탭의 키 입력란을 배선한다. 요소가 없으면 아무 일도 하지 않는다. */
export function wireGeminiPanel(root: ParentNode = document): void {
  const input = root.querySelector<HTMLInputElement>('#mp-gemini');
  const btn = root.querySelector<HTMLButtonElement>('[data-mp="gemini-verify"]');
  const status = root.querySelector<HTMLElement>('[data-mp="gemini-status"]');
  if (!input || !btn || !status) return;

  // 저장된 키를 되살린다. `type="password"` 라 화면에는 점으로 보인다.
  input.value = readGeminiKey();

  const say = (text: string) => { status.textContent = text; };

  // **입력이 곧 저장이다.** 별도 저장 버튼을 두지 않는다 — 눌렀는지 아닌지가 또 하나의
  // 상태가 되고, 감독이 "저장했는데 안 되네" 를 겪는 자리가 된다.
  input.addEventListener('change', () => {
    writeGeminiKey(input.value);
    say(input.value.trim() ? '저장했습니다' : '삭제했습니다');
  });

  let inflight: AbortController | null = null;
  btn.addEventListener('click', async () => {
    const key = input.value.trim();
    if (!key) { say('키를 먼저 입력해 주세요'); return; }

    // 저장부터 한다 — 확인만 하고 저장이 안 되면 감독이 두 번 넣어야 한다.
    writeGeminiKey(key);

    inflight?.abort();
    inflight = new AbortController();
    btn.disabled = true;
    say('확인하는 중…');
    const r = await verifyKey(key, inflight.signal);
    btn.disabled = false;
    say(r.ok ? '키가 유효합니다 — 저장됐습니다' : r.why);
  });
}
