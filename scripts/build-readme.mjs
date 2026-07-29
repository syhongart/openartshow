#!/usr/bin/env node
// scripts/build-readme.mjs
// README.md 의 자동 생성 블록 갱신 — 개발일지·팀·밸류에이션 통계

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countEntries } from './lib/devlog-entries.mjs';
import { calculateTeamComposition } from './lib/devlog-contributors.mjs';
import { computePayroll, summarizePayroll } from './lib/payroll.mjs';
import { kstDate as getKstDate } from './lib/kst.mjs';

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

// 급여 산정 — 날짜만(시·분은 필요 없음)
const today = new Date();
const payroll = computePayroll(devlogMd, today);
const payrollText = summarizePayroll(payroll);

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

// KST 오늘 날짜로 통일 (SSOT)
const today_str = getKstDate();

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
