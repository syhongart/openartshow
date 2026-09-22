// **소스에서 상수를 뽑는다 — 못 찾으면 던진다.**
//
// ── 왜 있는가 ───────────────────────────────────────────────────────────────
// 이 저장소의 상수 상당수는 **함수 안**에 있어 `import` 가 안 된다(예: `world-glb/
// main.ts` 의 카메라 화각과 눈높이는 `startGlbWorld` 안이다). 그런데 측정 스크립트는
// 그 값을 알아야 하고, 거기 숫자를 적으면 **그 순간 값 미러링**이다 — 그 상수를 바꾸는
// 날 스크립트만 옛 값을 재고, 증상은 「하네스 숫자만 이상하다」라 원인에서 가장 멀다.
// 이 저장소는 색·구름 고도·테스트 임계값에서 **세 번** 그 형태로 당했다.
//
// ── 🔴 **못 찾으면 반드시 던진다** ──────────────────────────────────────────
// 조용히 기본값으로 떨어지는 순간 이 장치는 **해악**이 된다: 값 미러링은 그대로인데
// 「SSOT 에서 뽑는다」는 문장만 남아 다음 사람이 확인을 생략한다. 이 저장소가
// *"게이트 유효성에 대한 거짓 진술"* 이라 부르는 그 형태다.
//
// 던지는 것을 **실행으로** 확인하는 검사가 `tests/walk-visibility.test.ts` ⑤ 다.
//
// ⚠ **이 파일은 그 0 failed 때문에 생겼다.** 원래 이 함수는 하네스 안의 지역 함수
// `pluck` 이었고, 검사는 소스에 «`throw new Error` 가 있다» 를 **문자열로** 봤다.
// 뮤테이션 실측(2026-09-22): 그 `throw` **앞에 `return` 한 줄**을 넣어도 **0 failed**.
// 문자열 검사는 「그 글자가 있는가」이지 「그 동작을 하는가」가 아니다 — 이 저장소가
// 최근 두 회차에 검수관 블로커로 받은 바로 그 형태다. 지역 함수라 테스트가 부를 수
// 없었던 것이 원인이므로, **부를 수 있는 자리로 옮겨** 조건을 참으로 만들었다.
//
// 옮긴 뒤 같은 뮤테이션 셋의 실측:
//   `throw` 앞에 `return`                 → **1 failed**
//   `pluckNumber` 의 수 검사를 `false` 로  → **1 failed**
//   `main.ts` 카메라 정규식을 깨뜨림       → **1 failed**
//
// ── 이 방식의 한계 ──────────────────────────────────────────────────────────
// 정규식은 **표현식을 이해하지 못한다.** `70` 이 `FOV` 라는 상수를 경유하게 바뀌면
// 여기는 못 찾고 던지는데, 그것이 옳은 동작이다(「모르겠으니 멈춘다」). 값이 **계산**
// 으로 바뀌면 이 방식 자체를 버리고 `export` 로 승격시키는 것이 답이다.

import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} root  저장소 루트(절대 경로)
 * @param {string} file  루트 기준 상대 경로
 * @param {RegExp} re    캡처 그룹이 있는 정규식
 * @param {string} label 사람이 읽을 이름 — 실패 메시지에 그대로 들어간다
 * @returns {RegExpMatchArray}
 * @throws 못 찾으면 **언제나** 던진다. 기본값으로 떨어지지 않는다.
 */
export function pluckLiteral(root, file, re, label) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const m = src.match(re);
  if (!m) {
    throw new Error(
      `${file} 에서 ${label} 를 못 찾았다 — 그 줄이 바뀌었다.\n`
      + `  옛 값을 재지 않도록 여기서 멈춘다. 정규식을 고쳐라: ${re}`,
    );
  }
  return m;
}

/** 첫 캡처를 수로. 수가 아니면 던진다(빈 캡처가 `0` 으로 새는 것을 막는다) */
export function pluckNumber(root, file, re, label) {
  const raw = pluckLiteral(root, file, re, label)[1];
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${file} 의 ${label} 가 수가 아니다: ${JSON.stringify(raw)}`);
  return n;
}
