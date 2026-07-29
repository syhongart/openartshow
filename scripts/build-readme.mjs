#!/usr/bin/env node
// scripts/build-readme.mjs
// README.md 의 자동 생성 블록 갱신 — 개발일지·팀·밸류에이션 통계

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countEntries } from './lib/devlog-entries.mjs';
import { calculateTeamComposition } from './lib/devlog-contributors.mjs';
import { computePayroll, RATES } from './lib/payroll.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// README.md 읽기
const readmePath = join(ROOT, 'README.md');
let readme = readFileSync(readmePath, 'utf8');

// 마커 확인
const startMarker = '<!-- AUTO:STATUS -->';
const endMarker = '<!-- /AUTO:STATUS -->';

if (!readme.includes(startMarker) || !readme.includes(endMarker)) {
  console.log('마커 없음 — 아무것도 안 함');
  process.exit(0);
}

// 개발일지 통계
const devlogMd = readFileSync(join(ROOT, 'docs', 'DEVLOG.md'), 'utf8');
const itemCount = countEntries(devlogMd); // SSOT: parseEntries() 기반
const teamComposition = calculateTeamComposition(devlogMd);
const teamSize = teamComposition.total;

// 급여 산정 — 3층 분리
const today = new Date();
const payroll = computePayroll(devlogMd, today);

// ── 인건비 3층 계산 ────────────────────────────────────────────────────────
let confirmedTotal = 0;        // 단일 금액만 (정규직 + 단가 있는 계약직)
const rangeCount = [];         // 범위형 역할들
const missingCount = [];       // 시세 미확인 역할들

for (const [roleId, data] of Object.entries(payroll)) {
  if (roleId === 'director' || !data.months || data.months === 0) continue;

  if (data.amount === null) {
    missingCount.push(roleId);
  } else if (typeof data.amount === 'object') {
    rangeCount.push(roleId);
  } else {
    confirmedTotal += data.amount;
  }
}

// 3층으로 나눠 낸다. **합치면 안 되는 것을 합치지 않기 위한 구분**이다:
//  · 확정   — 단일 금액이 나오는 역할. 이것만 더한다
//  · 범위형 — 시세 폭이 5~10배라 중앙값이 근거가 못 되는 역할(리서처 판정).
//             범위끼리 더하면 폭이 무의미해지므로 **건수만** 낸다
//  · 미확인 — 시세 데이터 자체가 없는 역할. **0원으로 합산하지 않는다**
//             (0 으로 채우면 합계가 조용히 작아진다 — 못 잰 것을 통과로 적는 것이다)
//
// `confirmedTotal` 은 **원 단위**다. 만원 표기로 바꿀 때 10,000 으로 나눈다 —
// 한때 여기가 1,000,000 이었고 그러면 1,141만원이 "11만원" 으로 찍혔다(100배).
const confirmedStr = confirmedTotal > 0 ? `${(confirmedTotal / 10000).toFixed(0)}만원` : null;
const rangeStr = rangeCount.length > 0 ? `${rangeCount.length}건` : null;
const missingStr = missingCount.length > 0 ? `${missingCount.length}건` : null;

const parts = [];
if (confirmedStr) parts.push(`확정 ${confirmedStr}`);
if (rangeStr) parts.push(`범위형 ${rangeStr}`);
if (missingStr) parts.push(`시세 미확인 ${missingStr}`);
const payrollText = parts.length ? parts.join(' · ') : '산정 불가';

// 밸류에이션 최신값 (있으면)
// 단위: valuation-history.json 의 값은 만원. 억원으로 변환해서 표기
let valuationText = '—';
try {
  const valuationHistory = JSON.parse(
    readFileSync(join(ROOT, 'docs', 'valuation-history.json'), 'utf8')
  );
  if (Array.isArray(valuationHistory) && valuationHistory.length > 0) {
    const latest = valuationHistory[valuationHistory.length - 1];
    // realized: 실현가치(자산 평가액)
    // 단위: 만원 → 억원으로 변환 (÷ 10000)
    const realized = latest.realized;
    if (realized && realized > 0) {
      const eokWon = (realized / 10000).toFixed(2);
      valuationText = `${eokWon}억원(${latest.date})`;
    }
  }
} catch {
  // valuation 파일 없음 또는 파싱 실패
}

const today_str = today.toISOString().split('T')[0];

// 생성 콘텐츠
const content = `
## 상태

- **개발일지**: ${itemCount}건
- **팀 규모**: ${teamSize}명 (창업자 ${teamComposition.founder} · 정규직 ${teamComposition.staff} · 계약직 ${teamComposition.contract})
- **누적 인건비**: ${payrollText}
- **밸류에이션**: ${valuationText}
- **갱신일**: ${today_str}

자세한 인사기록·급여는 [/making/team/](./making/team/) 참조.
`.trim();

// 마커 사이 내용 교체
const startIdx = readme.indexOf(startMarker);
const endIdx = readme.indexOf(endMarker);

const newReadme = readme.substring(0, startIdx + startMarker.length)
  + '\n' + content + '\n'
  + readme.substring(endIdx);

// 변경 감지 및 쓰기
if (newReadme !== readme) {
  writeFileSync(readmePath, newReadme, 'utf8');
  console.log('README.md 갱신 완료');
} else {
  console.log('변경 없음');
}
