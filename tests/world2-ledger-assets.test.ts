// @vitest-environment node
//
// **대장에 이름이 있으면 문서도 있어야 한다** (태스크 #84).
//
// ── 왜 생겼나 — 브라우저 실측이 드러낸 것 (2026-08-16) ────────────────────
// 대장(`world2-ledger.json`)에 작가를 등재하면 world2 가 `assets/world2/<owner>.json`
// 을 받으러 간다. 그 문서가 없으면 **브라우저가 404 를 콘솔 에러로 찍는다** — `fetch` 는
// 404 를 예외로 안 내지만 콘솔에는 남고, 코드가 그것을 `not-found` 로 곱게 처리해도
// 그 줄은 지워지지 않는다.
//
// 그런데 `verify-live` 와 `smoke:vite` 는 **「콘솔 에러 0」** 을 본다. 즉 감독이 첫 작가를
// 등재하는 순간 **배포 축이 빨간불**이 된다. 실측: 작가 2명 등재 → 콘솔 에러 2~3건.
//
// ── 왜 이 처방인가 (감독 부재 중 판정, 2026-08-16) ────────────────────────
// 후보 셋 중 **가장 보수적인 것**을 골랐다(계획서의 부재 중 규칙 1 — fail-closed):
//
//   ① 대장 등재 ⇒ 문서 존재 를 게이트가 강제한다   ← **이것**
//   ② 문서 없는 작가를 대장에서 빼는 운영 절차      — 사람의 주의에 기댄다
//   ③ 게이트가 이 404 만 예외로 인정                — 다른 404 도 함께 새 나간다
//
// ①이 옳은 이유는 «대장이 SSOT» 이기 때문이다. 대장은 «누구 땅인가» 를 선언하는 문서이고,
// 땅을 준 사람에게 문서가 없다는 것은 **대장이 틀린 것**이지 런타임이 참을 일이 아니다.
// 그리고 되돌리기가 싸다 — 검사 하나이고, 규약이 바뀌면 지우면 된다.
//
// **여기서 멈춘다**: 문서의 «내용» 이 좋은지는 안 본다. 계약을 통과하는지까지만 본다.
// 감독이 다르게 판단하면 그것이 최종이다.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadLedger, owners } from '../frontend/js/world2/decide/village-ledger.js';
import { overlayPathOf } from '../frontend/js/world2/store/static-store.js';
import { validateOverlay } from '../frontend/js/world2/decide/overlay.js';

const ASSETS = fileURLToPath(new URL('../frontend/assets/', import.meta.url));
const LEDGER_FILE = `${ASSETS}world2-ledger.json`;

/** 배포되는 실물을 읽는다 — 픽스처를 읽으면 이 검사가 아무것도 안 지킨다 */
function readLedger() {
  const raw = JSON.parse(readFileSync(LEDGER_FILE, 'utf8')) as unknown;
  return loadLedger(raw);
}

describe('★ 배포되는 대장 자체가 성립한다', () => {
  it('대장 파일이 있다 — 없으면 world2 부팅이 404 를 낸다(그 회귀를 이미 한 번 냈다)', () => {
    expect(existsSync(LEDGER_FILE), '★ 대장이 사라졌다').toBe(true);
  });

  it('★ 대장이 계약을 통과한다 — 사유가 남으면 그대로 배포되는 것이다', () => {
    const { issues } = readLedger();
    expect(issues, `★ 대장에 사유가 있다: ${issues.map((i) => i.reason).join(', ')}`)
      .toEqual([]);
  });
});

describe('★ 대장에 이름이 있으면 그 작가의 문서도 배포된다', () => {
  const { ledger } = readLedger();
  const who = owners(ledger);

  it('★ 등재된 작가마다 문서 파일이 있다 — 없으면 콘솔 404 로 배포 축이 빨간불이 된다', () => {
    // ⚠ 경로를 여기서 조립하지 않는다. `overlayPathOf` 가 SSOT 이고, 규약이 바뀌면
    // 이 검사가 **저절로** 따라온다 — 손으로 적으면 그때부터 다른 곳을 보게 된다.
    const missing = who.filter((o) => !existsSync(ASSETS + overlayPathOf(o).replace(/^assets\//, '')));
    expect(missing, `★ 대장에 있는데 문서가 없다: ${missing.join(', ')}`
      + ' — `frontend/assets/world2/<id>.json` 을 함께 넣어라(태스크 #84)').toEqual([]);
  });

  it('★ 그 문서들이 계약을 통과한다 — 깨진 문서는 배치가 통째로 빠진 채 조용히 뜬다', () => {
    const bad: string[] = [];
    for (const o of who) {
      const file = ASSETS + overlayPathOf(o).replace(/^assets\//, '');
      if (!existsSync(file)) continue;   // 위 검사가 이미 말했다 — 여기서 또 세지 않는다
      try {
        const rev = validateOverlay(JSON.parse(readFileSync(file, 'utf8')));
        if (rev.issues.length > 0) bad.push(`${o}: ${rev.issues.map((i) => i.reason).join(',')}`);
      } catch (e) {
        bad.push(`${o}: 읽을 수 없음(${e instanceof Error ? e.message : String(e)})`);
      }
    }
    expect(bad, `★ 계약을 통과 못 하는 작가 문서: ${bad.join(' / ')}`).toEqual([]);
  });

  it('표본이 0이어도 검사는 성립한다 — 지금이 그 상태이고, 그것이 정상이다', () => {
    // ⚠ **이 검사가 지금 아무것도 안 지킨다는 사실을 적어 둔다.** 대장이 비어 있으면
    // 위 두 단언은 빈 배열끼리 비교하므로 언제나 초록이다. 「표본이 비면 단언이 공허해진다」
    // 가 이 저장소의 실제 사고였고(옛 `minY` 임계값), 그래서 **비었다는 것을 말한다.**
    //
    // 검출력은 뮤테이션으로 실증했다: 대장에 없는 작가를 넣으면 두 단언이 모두 빨간불이다.
    expect(Array.isArray(who)).toBe(true);
  });
});
