#!/usr/bin/env node
// scripts/build-team.mjs
// 인사기록 페이지 생성기 — 개발일지 + 급여 산정으로부터 동적 생성
// 실행: node scripts/build-team.mjs (저장소 루트 기준)
// 개발일지와 동일한 갤러리 플레이트 디자인 시스템.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shell } from './lib/site-shell.mjs';
import { ROLES, BY_ID, countContributions, EMPTY_CONTRIBUTION } from './lib/devlog-contributors.mjs';
import { computePayroll, RATES } from './lib/payroll.mjs';
import { countEntries, parseEntries } from './lib/devlog-entries.mjs';
import { loadFrozenTimes, timeInfoFor } from './lib/devlog-times.mjs';
import { kstDate as getKstDate } from './lib/kst.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'making', 'team');

// 개발일지 읽기
const devlogMd = readFileSync(join(ROOT, 'docs', 'DEVLOG.md'), 'utf8');

// 기여 집계
const contributions = countContributions(devlogMd);

// 일괄 기록 항목 수 — 페이지 하단 한계 설명에 쓴다. **하드코딩하지 않는다**:
// 동결 데이터의 bulkCommits 에 속한 항목을 실제로 센다(현재 50/139 = 36%).
// 숫자를 문구에 적어두면 데이터가 바뀔 때 한쪽만 낡는다.
const frozenTimes = loadFrozenTimes();
const devlogCount = countEntries(devlogMd);
const bulkEntryCount = parseEntries(devlogMd)
  .filter((e) => timeInfoFor(e, frozenTimes).bulk).length;

// 급여 산정
const today = new Date();
const payroll = computePayroll(devlogMd, today);

// 일괄 기록 판정은 여기서 **하지 않는다.** 예전에는 "가장 자주 나타나는 joined 값"
// 이라는 휴리스틱으로 추측했다. 지금은 `docs/devlog-times.json` 의 `bulkCommits` 가
// 판정하고 `countContributions()` 가 `*TimeBulk` 로 실어 온다 — 데이터가 SSOT 다.
// (휴리스틱은 역할이 하나뿐이거나 모두 다른 시각일 때 조용히 오판했다.)

// 기본 정보 (역할별 메타데이터 + 기여도)
function buildMemberData(roleId) {
  const role = BY_ID.get(roleId);
  const contrib = contributions[roleId] || { ...EMPTY_CONTRIBUTION };
  const pay = payroll[roleId];

  if (!role || contrib.count === 0) return null;

  return {
    ...role,
    contribution: contrib,
    payroll: pay,
  };
}

// 정규직 + 계약직 모두 모은다
const members = [];
for (const role of ROLES) {
  const member = buildMemberData(role.id);
  if (member) members.push(member);
}

// 정규직/계약직 분리
const fulltime = members.filter((m) => m.tier === '정규직' || m.tier === '창업자');
const contract = members.filter((m) => m.tier === '계약직');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * 활동 시점 표시. **날짜는 항상 있고 시각은 있을 때만 붙는다.**
 *
 * 세 갈래이고 세 번째가 이 함수의 핵심이다:
 *   ① 시각 있음 + 일괄 아님 → `2026-07-29 07:59`
 *   ② 시각 없음             → `2026-07-29`
 *   ③ 시각 있음 + **일괄**  → `2026-07-13` — **시각을 감춘다**
 *
 * ③ 을 왜 감추는가: 초기 일괄 기록 커밋(실측 50/139건, 36%)의 시각은 작업 시각이
 * 아니라 "개발일지를 몰아 쓴 시각" 이다. 그것을 분 단위로 보여주면 정밀해 보이지만
 * 거짓이다. 카피라이터가 특히 심했다 — 1차 판본에서 "첫 등장 05:53, 마지막 05:53"
 * 으로 나와 **실제 활동 기간을 완전히 은폐**했다.
 *
 * "(일괄)" 같은 꼬리표도 붙이지 않는다. 날짜만 있는 항목(②)과 구별할 필요가 없고,
 * 페이지 하단에 출처·한계를 한 번 설명하는 편이 낫다.
 */
function formatActivity(date, time, isBulk) {
  if (!date) return '미상';
  if (!time || isBulk) return date;
  return `${date} ${time}`;
}

// 업데이트 날짜 (KST 오늘)
const today_str = getKstDate(); // YYYY-MM-DD

// 기여 건수 표시 (상대치)
const maxContrib = Math.max(...members.map((m) => m.contribution.count), 1);
const totalContrib = members.reduce((a, m) => a + m.contribution.count, 0);

// 인건비 포맷
function formatAmount(amount) {
  if (amount === null) return '시세 미확인';
  if (typeof amount === 'object') {
    // 범위형
    const min = (amount.min / 1000000).toFixed(2);
    const max = (amount.max / 1000000).toFixed(2);
    return `${min} ~ ${max}만 원`;
  }
  // 숫자
  if (amount === 0) return '0원';
  if (amount >= 10000000) return `${(amount / 1000000).toFixed(0)}만 원`;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}만 원`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만 원`;
  return `${amount}원`;
}

function memberCard(m) {
  const pct = Math.round((m.contribution.count / maxContrib) * 100);
  // 초기 일괄 커밋에 몰린 항목 판정
  const c = m.contribution;
  const joinedText = formatActivity(c.joined, c.joinedTime, c.joinedTimeBulk);
  const lastSeenText = formatActivity(c.lastSeen, c.lastSeenTime, c.lastSeenTimeBulk);

  let payrollHtml = '';
  if (m.payroll) {
    const unit = RATES[m.id]?.unit || '—';
    const amountText = formatAmount(m.payroll.amount);
    const gradeText = m.payroll.grade || '—';
    payrollHtml = `
    <div class="m-payroll">
      <div class="m-payroll-row">
        <span class="m-payroll-label">산정</span>
        <span class="m-payroll-value">${esc(amountText)} (${unit}) / ${m.payroll.months || '—'}개월</span>
      </div>
      <div class="m-payroll-row">
        <span class="m-payroll-label">등급</span>
        <span class="m-payroll-value">${esc(gradeText)}</span>
      </div>
    </div>`;
  }

  return `<div class="member">
  <div class="m-top">
    <span class="m-emoji" aria-hidden="true">${m.emoji}</span>
    <div class="m-id">
      <div class="m-name">${esc(m.name)}${m.handle ? ` <span class="m-handle">${esc(m.handle)}</span>` : ''}</div>
      <div class="m-role">${esc(m.role)}</div>
    </div>
    <span class="m-badge ${m.tierClass}">${esc(m.tier)}</span>
  </div>
  <p class="m-note">${esc(m.name)}(${m.emoji})는 개발일지에서 <strong>${m.contribution.count}건</strong> 기여를 했습니다. ${m.contribution.joined ? `첫 등장: ${joinedText}, 마지막: ${lastSeenText}.` : ''}</p>
  <div class="m-bar" role="img" aria-label="기여 ${m.contribution.count}건">
    <span class="m-bar-fill" style="width:${pct}%"></span>
    <span class="m-bar-num">${m.contribution.count}건</span>
  </div>
  ${payrollHtml}
</div>`;
}

// team 고유 CSS
const CSS = `:root{--wrap-w:900px;--lead-mb:30px;--lh:1.7}
.stat-row{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 44px}
.stat{flex:1;min-width:130px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:16px 18px}
.stat .n{font-size:26px;font-weight:600;color:var(--g700);line-height:1}
.stat .l{font-size:12px;color:var(--ink-dim);margin-top:6px;letter-spacing:0.04em}
h2.sec{font-size:15px;color:var(--g800);margin:38px 0 16px;padding-left:10px;border-left:3px solid var(--g300);letter-spacing:0.02em}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.member{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:18px 20px}
.m-top{display:flex;align-items:center;gap:12px}
.m-emoji{font-size:30px;line-height:1;flex:0 0 auto}
.m-id{flex:1;min-width:0}
.m-name{font-size:16px;font-weight:600;color:var(--ink)}
.m-handle{font-size:12px;font-weight:400;color:var(--ink-dim)}
.m-role{font-size:12.5px;color:var(--ink-dim)}
.m-badge{flex:0 0 auto;font-size:11px;font-weight:600;letter-spacing:0.04em;padding:3px 9px;border-radius:2px}
.m-badge.founder{background:var(--g800);color:#eef7f1}
.m-badge.staff{background:var(--g100);color:var(--g800)}
.m-badge.contract{background:var(--paper-deep);color:var(--ink-body);border:1px solid var(--line)}
.m-note{font-size:13px;color:var(--ink-body);margin:12px 0 12px}
.m-bar{position:relative;height:20px;background:var(--paper-deep);border-radius:2px;overflow:hidden;display:flex;align-items:center}
.m-bar-fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--g300),var(--g600));border-radius:2px}
.m-bar-num{position:relative;margin-left:auto;padding-right:8px;font-size:11px;font-weight:600;color:var(--g900)}
.m-payroll{margin:12px 0 0;padding:8px 10px;background:var(--paper-deep);border-radius:2px;font-size:12px}
.m-payroll-row{display:flex;gap:8px;margin:4px 0}
.m-payroll-label{font-weight:600;color:var(--ink-dim);min-width:40px}
.m-payroll-value{color:var(--ink-body)}
.note-foot{margin-top:40px;font-size:12px;color:var(--ink-dim);line-height:1.6;border-top:1px solid var(--line);padding-top:18px}
.note-foot strong{color:var(--ink)}
@media(max-width:640px){.grid{grid-template-columns:1fr}}
`;

const jsonld = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'OpenArtShow',
  url: 'https://syhongart.github.io/openartshow/',
  member: members.map((m) => ({
    '@type': 'Person',
    name: m.name,
    jobTitle: m.role,
  })),
};

const bodyHtml = `
  <div class="eyebrow">Team · HR</div>
  <h1>팀 · 인사기록</h1>
  <p class="lead">OpenArtShow는 감독 한 사람과 AI 팀이 함께 만듭니다.<br>
  무거운 일에는 전문 계약직을 고용해 맡깁니다 — 아래는 그 기록입니다.</p>

  <div class="stat-row">
    <div class="stat"><div class="n">${fulltime.length}</div><div class="l">정규직 · 창업자</div></div>
    <div class="stat"><div class="n">${contract.length}</div><div class="l">전문 계약직</div></div>
    <div class="stat"><div class="n">${totalContrib}</div><div class="l">누적 기여 건수</div></div>
    <div class="stat"><div class="n">${devlogCount}</div><div class="l">공개 개발일지</div></div>
  </div>

  <h2 class="sec">정규직 · 창업자</h2>
  <div class="grid">${fulltime.map(memberCard).join('\n')}</div>

  <h2 class="sec">전문 계약직</h2>
  <div class="grid">${contract.map(memberCard).join('\n')}</div>

  <p class="note-foot">
    <strong>기여 건수</strong>는 <a href="../devlog/">공개 개발일지</a>의 실제 항목·태그에서 집계한 값입니다.
    집계는 "개발일지 본문에 역할 이름이 적힌 항목 수" 이지 실제 기여도가 아님을 명시합니다.
    실제로 부팀장이 최근 활동을 했는데 일지 작성 주기가 길면 기여 건수가 낮아질 수 있습니다.
    글 쓰는 습관이 숫자를 바꿉니다.<br>
    <strong>첫 등장·마지막 활동</strong>의 <strong>날짜</strong>는 개발일지 항목의 날짜입니다.
    뒤에 붙는 <strong>시·분</strong>은 그 항목을 기록한 시각(git 커밋 시각, KST)이며 — 작업을 끝낸
    시각이 아니라 <em>일지를 쓴 시각</em>입니다.
    개발 초기에 ${bulkEntryCount}개 항목을 한 번에 몰아 기록한 구간이 있어(전체 ${devlogCount}건 중
    ${Math.round((bulkEntryCount / devlogCount) * 100)}%), 그 항목들은 시·분을 <strong>표시하지 않고 날짜만</strong> 둡니다.
    한 시각을 여러 날짜의 항목이 공유하면 그 시각은 어느 항목의 작업 시각도 아니기 때문입니다.
    앞으로 쓰는 항목은 제목 줄에 시각을 직접 적어(<code>## 2026-07-30 08:15 · 제목</code>) 정확한 시·분이 나옵니다.<br>
    <strong>급여 산정</strong>은 KOSA 2025 통계 기반 단가를 역할별·재직 개월별로 계산한 추정값입니다.
    정규직은 입사일~오늘을 재직 개월로, 계약직은 활동한 서로 다른 YYYY-MM 개수를 활동 개월로 산정합니다.
    "시세 미확인"은 공표된 통계를 찾지 못했거나 범위가 너무 넓어 중앙값을 쓸 수 없는 역할입니다.
    "측정 미확인"은 git 정보 부재로 활동 기간을 못 구한 항목입니다.
    범위형은 최소·최대값을 그대로 냅니다. 원가 합계에는 감독(창업자)을 포함하지 않습니다.<br>
    <span style="color:var(--ink-dim)">최종 갱신 ${today_str}</span>
  </p>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, 'index.html'),
  shell({
    title: '팀 · 인사기록 — OpenArtShow',
    desc: 'OpenArtShow를 만드는 팀 — 정규직과 계약직(디자이너·법무·카피·성능·리서처)의 인사기록과 기여도. 개발일지 기반 동적 집계.',
    path: '/making/team/',
    og: 'website',
    jsonld,
    css: CSS,
    depth: 2,
    footerNote: '사람과 AI가 함께 만드는 미술관.',
    bodyHtml,
  })
);

console.log(`team: ${fulltime.length} 정규직 + ${contract.length} 계약직 → making/team/index.html (${today_str})`);
