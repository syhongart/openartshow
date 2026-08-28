// @vitest-environment jsdom
//
// 부팅 에러 수집기 + 체크리스트 배선 — **검수관 블로커 B1 의 회귀 검사다.**
//
// ── 무엇이 있었나 (2026-08-28) ──────────────────────────────────────────────
// 체크리스트의 「콘솔」 항목이 **구조적으로 항상 초록**이었다. 세던 값은 `runBoot` 의
// `onError` 카운터였는데 `boot.ts` 가 그 콜백 직후 `return false` 하고 `main.ts` 가 그때
// `return null` 하므로, 카운터가 1 이 되는 순간 체크리스트 호출부에 **도달하지 못한다.**
// 「에러 없음」 말고는 나올 수 없는 칸이었다.
//
// **그런데 `tests/glb-checklist.test.ts` 는 그 사실을 못 봤고, 앞으로도 못 본다** — 그
// 파일은 순수 판정 함수만 보고 스스로 "여기서 잠그는 것은 판정 로직까지" 라고 적어 두었다.
// 검수관은 정확히 **그 사정거리 밖**에서 결함을 찾았다. 그러니 그 자리에 검사를 놓는다.
//
// ── 이 파일이 서는 경계 ─────────────────────────────────────────────────────
// 수집기(집행) → `showBootChecklist`(배선) → `buildChecklist`(판정) → DOM(화면)을
// **실제로 이어서** 돌린다. `main.ts` 는 three 의존이라 못 돌리므로 그 한 줄(수집기에
// 기능 실패를 넣는 배선)만 소스로 확인한다 — 아래 마지막 검사이고, 그 한계를 적어 둔다.

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createBootErrorLog } from '../frontend/js/world-glb/systems/boot-error-log.js';
import { showBootChecklist } from '../frontend/js/world-glb/ui/glb-checklist-panel.js';

const disposers: Array<() => void> = [];
afterEach(() => { while (disposers.length) disposers.pop()!(); });
function log() {
  const l = createBootErrorLog();
  disposers.push(() => l.dispose());
  return l;
}

describe('부팅 에러 수집기', () => {
  it('⭐ 전역 스크립트 에러를 잡는다 — 아무도 안 잡아 주던 자리다', () => {
    const l = log();
    expect(l.labels).toHaveLength(0);
    window.dispatchEvent(new ErrorEvent('error', { message: 'x is not a function' }));
    expect(l.labels, '전역 error 이벤트가 안 잡혔다').toEqual(['x is not a function']);
  });

  it('처리되지 않은 Promise 거부도 잡는다', () => {
    const l = log();
    // jsdom 은 `PromiseRejectionEvent` 생성자를 안 주므로 형태만 맞춰 보낸다.
    const e = new Event('unhandledrejection') as Event & { reason: unknown };
    e.reason = new Error('GLB 파싱 실패');
    window.dispatchEvent(e);
    expect(l.labels).toEqual(['GLB 파싱 실패']);
  });

  it('⭐ 기능 조립 실패를 이름째 남긴다 — 이것이 잡으려던 사고다', () => {
    // `mountFeatures` 는 개별 실패를 흡수한다(그 판단은 옳다). 그래서 **기능 하나가
    // 조용히 빠진 채 세계가 서고**, 감독이 눈으로 못 가린다.
    const l = log();
    l.add('기능 조립 실패: sky', new Error('adapter 없음'));
    expect(l.labels[0], '기능 이름이 사라졌다').toContain('sky');
    expect(l.labels[0], '원인 메시지가 사라졌다').toContain('adapter 없음');
  });

  it('dispose 뒤에는 새지 않는다 — 안 떼면 다음 세계까지 따라간다', () => {
    const l = createBootErrorLog();
    l.dispose();
    window.dispatchEvent(new ErrorEvent('error', { message: '부팅 뒤 에러' }));
    expect(l.labels, 'dispose 했는데 계속 듣고 있다').toHaveLength(0);
  });

  it('폭주를 막는다 — 한 프레임에 같은 에러가 수백 번 나는 경우가 있다', () => {
    const l = log();
    for (let i = 0; i < 200; i++) window.dispatchEvent(new ErrorEvent('error', { message: `e${i}` }));
    expect(l.labels.length).toBeLessThanOrEqual(20);
  });

  it('window 가 없어도 죽지 않는다 — `add` 는 계속 동작해야 한다', () => {
    const saved = globalThis.window;
    // 의도적으로 걷어낸다 — SSR·워커처럼 window 가 없는 환경의 재현이다
    delete (globalThis as { window?: unknown }).window;
    try {
      const l = createBootErrorLog();
      l.add('기능 조립 실패: sky');
      expect(l.labels).toHaveLength(1);
      l.dispose();                              // 던지지 않아야 한다
    } finally {
      (globalThis as { window?: unknown }).window = saved;
    }
  });
});

describe('⭐ 경계 — 수집기가 실제로 화면까지 간다', () => {
  /** `__glbWorld` 훅 스텁. 체크리스트가 읽는 것만 채운다 */
  function stubHooks() {
    (globalThis as Record<string, unknown>).__glbWorld = {
      stats: () => ({
        glb: {
          meshes: 100, triangles: 5000, instanced: 10,
          shadowDecals: 0, liftedDecals: 0, boxFixed: 0, boxSkipped: 0, atlasPainted: 0,
          box: { min: [-50, 0, -50], max: [50, 10, 50] },
        },
        glbStream: { on: 5, total: 10, ticks: 3, radius: 88, grid: 16 },
        glbMap: { painted: 100, px: 512 },
        pipelines: 12,
      }),
      ahead: () => [{ d: 20, name: 'x' }],
      timeline: [{ stage: 'stream', atMs: 1000 }],
    };
    return () => { delete (globalThis as Record<string, unknown>).__glbWorld; };
  }

  it('기능이 죽으면 화면의 「에러」가 노란불이 된다 — 판정·집행·화면을 이어서 돈다', () => {
    const undo = stubHooks();
    try {
      const l = log();
      l.add('기능 조립 실패: sky', new Error('adapter 없음'));
      const mount = document.createElement('div');
      document.body.appendChild(mount);

      const panel = showBootChecklist(mount, l);
      expect(panel, '패널이 안 떴다').not.toBeNull();
      const text = mount.textContent ?? '';
      expect(text, '죽은 기능 이름이 화면에 없다').toContain('sky');
      expect(text, '요약이 「모두 정상」으로 떴다').toContain('⚠');
      panel!.dispose();
    } finally { undo(); }
  });

  it('아무 일 없으면 「에러: 없음」이 뜬다 — 대조군', () => {
    const undo = stubHooks();
    try {
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      const panel = showBootChecklist(mount, log());
      expect(mount.textContent ?? '').toContain('없음');
      panel!.dispose();
    } finally { undo(); }
  });

  it('훅이 없으면 조용히 `null` — 진단이 세계를 죽이면 본말전도다', () => {
    delete (globalThis as Record<string, unknown>).__glbWorld;
    expect(showBootChecklist(document.createElement('div'), log())).toBeNull();
  });
});

describe('⭐ B1 회귀 — 수집기가 부팅 배선에 실제로 물려 있는가', () => {
  // 위 검사들은 수집기가 **불리면** 동작한다는 것까지다. B1 의 본질은 그게 아니라
  // 「체크리스트가 읽는 값이 실제 사고와 이어져 있지 않았다」이고, 그 연결은 `main.ts`
  // 한 줄이다. `main.ts` 는 three 의존이라 여기서 못 돌리므로 **소스로 확인한다.**
  //
  // ⚠ **한계**: 정규식이라 배선의 «형태»만 본다. 리팩터로 표현이 바뀌면 이 검사는
  // 거짓 FAIL 을 낸다(그때는 실제 배선을 확인하고 이 정규식을 고친다). 이 저장소는
  // 마크다운 자유 텍스트 정규식이 **조용히 검출력 0** 이 된 전례가 있어(hookify 회차),
  // 신설 시 뮤테이션으로 검출력을 실측했다 — 결과는 파일 하단.
  const src = readFileSync('frontend/js/world-glb/main.ts', 'utf8');

  it('`mountFeatures` 의 실패 콜백이 수집기에 넣는다', () => {
    const m = /mountFeatures\(/.exec(src);
    expect(m, '`mountFeatures` 호출이 사라졌다').not.toBeNull();
    // 호출 이후 구간에서 찾는다 — 그 콜백이 유일한 「흡수된 실패」 통로다.
    const after = src.slice(m!.index);
    expect(after, '기능 조립 실패가 수집기에 안 들어간다 — 「에러」 항목이 다시 죽는다')
      .toMatch(/기능 조립 실패[^\n]*\n?[^]{0,200}?bootLog\.add|bootLog\.add\([^)]*기능 조립 실패/);
  });

  it('체크리스트에 넘기는 것이 그 수집기다 — 별도 카운터가 아니다', () => {
    expect(src).toMatch(/showBootChecklist\([^)]*bootLog\)/);
    // 옛 형태(0 고정 카운터)가 되살아나면 잡는다.
    expect(src, '`bootErrors` 카운터가 돌아왔다 — B1 이 난 형태다').not.toMatch(/bootErrors/);
  });

  it('부팅 구간이 끝나면 리스너를 뗀다', () => {
    expect(src, '`bootLog.dispose()` 가 없다 — 전역 리스너가 다음 세계까지 간다')
      .toMatch(/bootLog\.dispose\(\)/);
  });
});

// ── 검출력 실측 (뮤테이션 8케이스, 2026-08-28) ──────────────────────────────
// B1 이 난 형태를 **되살려서** 실제로 잡히는지 봤다. 「통과했다」는 검출력의 증거가 아니다.
//
//   (가) 기능 조립 실패를 수집기에 안 넣음 (B1 복원)   → 1 failed
//   (나) 0 고정 카운터(`bootErrors`)를 되살림          → 1 failed
//   (다) `bootLog.dispose()` 제거                      → 1 failed
//   (라) 전역 리스너 부착 제거                          → 2 failed
//   (마) `add` 가 이름을 버리고 개수만 셈               → 2 failed
//   (바) 패널이 수집기 내용을 안 넘김 (경계 절단)       → 1 failed
//   (사) 판정부가 언제나 ok                            → 2 failed
//   (아) 폭주 상한 제거                                → 1 failed
//
// 8/8. (가)(나)(바)가 이 파일의 존재 이유다 — **셋 다 `tests/glb-checklist.test.ts` 는
// 통과시킨다.** 그 파일은 순수 판정 함수만 보고, B1 은 정확히 그 사정거리 밖에 있었다.
