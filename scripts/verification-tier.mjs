// 검증 등급을 판정해 사람이 읽게 찍는다. 판정 로직은 `lib/verification-tier.mjs` 한 곳.
//
//   node scripts/verification-tier.mjs [--base origin/main] [--json]
//
// 종료코드는 **언제나 0** 이다 — 이것은 "무엇을 해야 하는가" 를 알려주는 도구이지
// 통과·실패를 가르는 게이트가 아니다. 게이트는 `npm run gate` 와 CI 다.

import { changedFiles, judge, TIERS } from './lib/verification-tier.mjs';

const argv = process.argv.slice(2);
const base = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'origin/main';
const asJson = argv.includes('--json');

let files;
try {
  files = changedFiles(base);
} catch (e) {
  // 못 잰 것을 통과로 적지 않는다 — 무엇이 막았는지 쓰고 최고 등급을 답한다.
  console.error(`변경 목록을 못 얻었다(base=${base}): ${e.message}`);
  console.error('→ 판정 불가이므로 **1등급**으로 간주한다(fail-closed).');
  // ⚠ `--json` 소비자는 stdout 만 읽는다. 여기서 아무것도 안 찍으면 **빈 stdout + exit 0**
  // 을 받고 그것을 "문제 없음" 으로 읽는다 — fail-closed 가 소비자 층에서 뒤집힌다
  // (검수관 권고 R5). 워크플로가 이 CLI 를 부르기 시작한 지금은 실제 위험이다.
  if (asJson) {
    console.log(JSON.stringify({ base, tier: 1, name: TIERS[1].name, files: [], error: e.message }, null, 2));
  }
  process.exit(0);
}

const { tier, rows } = judge(files);
const t = TIERS[tier];

if (asJson) {
  console.log(JSON.stringify({ base, tier, name: t.name, files: rows }, null, 2));
  process.exit(0);
}

console.log(`\n── 검증 등급: ${t.name} ── (base=${base}, 변경 ${files.length}건)\n`);
// ⚠ **커밋된 변경만 본다**(`git diff ${base}...HEAD`). 워킹트리의 미커밋 변경은 등급에
// 안 잡힌다 — 방향은 안전하지만(변경 0 → 1등급) 이 사실을 어디에도 안 적어 두면
// "커밋 전에 돌려 보고 3등급이네" 하는 오독이 생긴다(검수관 권고 R6).
console.log('  (커밋된 변경만 본다 — 미커밋 변경은 잡히지 않는다)\n');
if (!files.length) {
  console.log('  변경이 없다. 등급은 기본값 1이다.\n');
} else {
  // 등급이 무거운 것부터 — 최종 등급을 정한 파일이 맨 위에 온다.
  for (const r of [...rows].sort((a, b) => a.tier - b.tier)) {
    console.log(`  ${r.tier}등급  ${r.file}\n          ↳ ${r.why}`);
  }
  console.log('');
}

console.log(`  근거: ${t.why}`);
console.log('  요구 절차:');
console.log(`    npm run gate            ${t.gate ? '필수' : '—'}`);
console.log(`    배포 전 독립 스모크      ${t.smoke ? '필수(executor, 구현자 본인 금지)' : '생략 — CI 가 돈다'}`);
console.log(`    검수관 교차리뷰          ${t.reviewer ? '필수' : '면제'}`);
console.log('');
console.log('  ⚠ 등급이 줄이는 것은 **배포 전 로컬 왕복**이다. 자기완결·CSP·개수 불변식은');
console.log('    CI 스모크가 등급과 무관하게 돌므로 면제되지 않는다 — **단 그 진입점이');
console.log('    `scripts/smoke/config.mjs` 의 LIVE_PAGES 에 있을 때만이다**(검수관 반려 B1).');
console.log('    IP 축은 검사가 없다 — 새 에셋·텍스트·네이밍은 등급과 별개로 §6 법무 게이트다.');
console.log('    (자동 게이트 신설은 태스크 #198 — 팀장 조건으로 등록돼 있다)');
if (tier === 3) {
  console.log('');
  console.log('  ⚠ 3등급은 **면제가 아니라 검수 이연**이다. behind-flag 를 라이브로 승격할 때');
  console.log('    누적 diff 전체를 1등급 절차로 일괄 검수한다(팀장 조건 4).');
}
console.log('');
