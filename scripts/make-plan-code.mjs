#!/usr/bin/env node
// 활성화 코드 발급기 — `ART-XXXX-XXXX`.
//
// ── 왜 만들었나 (2026-08-16, W8-3 S1) ──────────────────────────────────────
// 랜딩에 코드 **검증**은 있는데 **발급** 도구가 저장소에 **0건**이었다(실측: `9973` 이
// 나오는 곳은 검증 로직 하나뿐). 즉 감독이 코드를 만들려면 해시가 맞을 때까지 손으로
// 찾아야 했다 — 사실상 발급 경로가 없었다.
//
// 그 상태로 「특별 프리미엄」 층위만 열면 **아무도 그 등급을 받을 수 없다** — 기능이
// 타입에만 있고 화면에는 없는 상태가 된다. 그래서 층위와 **같은 회차**에 만든다.
//
// ── 쓰는 법 ────────────────────────────────────────────────────────────────
//   node scripts/make-plan-code.mjs                 → 프리미엄 코드 1개
//   node scripts/make-plan-code.mjs premium_plus    → 특별 프리미엄 코드 1개
//   node scripts/make-plan-code.mjs premium_plus 5  → 5개
//
// ── ⚠ 이것은 보안 장치가 아니다 ────────────────────────────────────────────
// 서버가 없으므로 사용자가 `localStorage` 를 직접 고쳐 어떤 층위든 켤 수 있고, 코드
// 자체도 나머지가 9973 가지라 브루트포스가 쉽다. **편의 장치**다 — 그 판단은 원래
// 주석(*"P2 임시 운영: 결제 대신 활성화 코드"*)이 이미 하고 있었고, 여기서 뒤집지
// 않는다. 진짜 권한은 결제·서버가 생기는 날의 일이다.
//
// 판정식(`planCodeHash`·`CODE_REMAINDER`)은 `frontend/js/studio-plan.ts` 가 소유한다 —
// **여기에 다시 적지 않는다.** 두 곳에 적으면 한쪽만 고쳐도 아무도 모른다.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// `studio-plan.ts` 는 `.ts` 라 노드가 직접 못 읽는다. 판정식만 뽑아 쓴다 —
// **값을 베끼지 않고 소스에서 읽는다**(미러링 방지).
const SRC = readFileSync(
  fileURLToPath(new URL('../frontend/js/studio-plan.ts', import.meta.url)), 'utf8',
);
const MOD = Number((SRC.match(/h\s*%\s*(\d+)/) || [])[1]);
const REM = JSON.parse(
  (SRC.match(/CODE_REMAINDER\s*=\s*(\{[^}]*\})/) || [])[1]
    ?.replace(/(\w+):/g, '"$1":') ?? 'null',
);
if (!MOD || !REM) {
  console.error('studio-plan.ts 에서 판정식을 못 읽었다 — 그 파일이 바뀌었으면 여기도 본다.');
  process.exit(1);
}

const hash = (code) => {
  let h = 5381;
  for (let i = 0; i < code.length; i++) h = ((h << 5) + h + code.charCodeAt(i)) >>> 0;
  return h % MOD;
};

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const block = (rand) => Array.from({ length: 4 }, () => ALPHA[Math.floor(rand() * ALPHA.length)]).join('');

const tier = process.argv[2] || 'premium';
const count = Math.max(1, Math.min(50, Number(process.argv[3]) || 1));
const want = REM[tier];
if (want === undefined) {
  console.error(`모르는 층위: ${tier} — 가능: ${Object.keys(REM).join(' / ')}`);
  process.exit(1);
}

// `Math.random` 을 쓴다. 여기는 빌드가 아니라 **손으로 부르는 도구**라 결정론이 필요 없고,
// 오히려 같은 코드가 반복 발급되면 안 된다.
const rand = Math.random;
const out = [];
let tries = 0;
while (out.length < count && tries < 5_000_000) {
  tries++;
  const code = `ART-${block(rand)}-${block(rand)}`;
  if (hash(code) === want && !out.includes(code)) out.push(code);
}
if (out.length < count) {
  console.error(`${tries}회 시도에 ${out.length}개만 찾았다 — 판정식이 바뀌었는지 본다.`);
  process.exit(1);
}

console.log(`${tier} 코드 ${out.length}개 (나머지 ${want}, 시도 ${tries.toLocaleString()}회):\n`);
for (const c of out) console.log(`  ${c}`);
console.log('\n랜딩 요금제 섹션의 입력창에 넣으면 그 브라우저에서 활성화된다.');
