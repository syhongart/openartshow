// scripts/lib/payroll.mjs
// 인건비 산정 로직 — 역할별·월별 급여·리테이너 계산
//
// ── 산정 규칙 ────────────────────────────────────────────────────────────
// · 정규직 → 재직 개월 × 월급
// · 계약직·프리랜서 → 활동 개월(서로 다른 YYYY-MM 개수) × 월 리테이너
// · 감독 → 별도 행, 원가 합계에 미포함
// · 못 찾은 단가 → 0이 아니라 null, 합산에서 제외

import { ROLES, countContributions } from './devlog-contributors.mjs';

/**
 * 역할별 단가. { amount|range|null, unit, grade, source }
 * "못 찾음" 은 0이 아니라 null 로 표기 — 합산에서 제외되고 "시세 미확인" 으로 표시.
 */
export const RATES = {
  lead: {
    amount: 11410000,     // 월 1,141만 (541,000 × 21.1일)
    unit: '월',
    grade: '대체추정',
    source: 'KOSA 2025 「IT아키텍트」 일당. 직무 정확 매칭 아님',
  },
  'deputy-lead': {
    amount: 7750000,      // 월 775만
    unit: '월',
    grade: '대체추정',
    source: 'KOSA 「응용SW개발자」. three.js 특화 통계 없음',
  },
  executor: {
    amount: 3570000,      // 월 357만
    unit: '월',
    grade: '공표통계',
    source: 'KOSA 「IT테스터」',
  },
  designer: {
    amount: 5170000,      // 월 517만
    unit: '월',
    grade: '대체추정',
    source: 'KOSA 「UI/UX디자이너」. 3D 아트디렉션 특화 없음',
  },
  reviewer: {
    amount: { min: 300000, max: 500000 },  // 시간당 30~50만
    unit: '시간당',
    grade: '대체추정',
    source: '탤런트뱅크 일반 전문가 자문(2022년 기사, 4년 낡음). 코드리뷰 특화 아님',
  },
  legal: {
    amount: { min: 500000, max: 600000 },  // 건당 50~60만
    unit: '건',
    grade: '공표통계(관납료)',
    source: '특허청 출원료 30만 + 대리인 10~30만',
  },
  security: {
    amount: { min: 1000000, max: 3500000 },  // 건당 100~350만
    unit: '건',
    grade: '범위형',
    source: '크몽 등 견적, 연도 불명',
  },
  copywriter: {
    amount: { min: 220000, max: 1500000 },  // 건당 22만 (네이밍 별도 5~150만)
    unit: '건',
    grade: '범위형',
    source: '숨고·크몽',
  },
  'perf-analyst': {
    amount: null,
    unit: '—',
    grade: '—',
    source: '웹 렌더 성능 컨설팅 시세 없음',
  },
  researcher: {
    amount: { min: 10000, max: 3200000 },  // 건당 1만~320만
    unit: '건',
    grade: '범위형',
    source: '숨고. 폭이 5~10배라 중앙값 부적합',
  },
  'reference-analyst': {
    amount: null,
    unit: '—',
    grade: '—',
    source: '없음',
  },
};

/**
 * 활동 개월을 계산한다. joined ~ lastSeen 사이의 YYYY-MM 개수.
 *
 * @param {string} joined YYYY-MM-DD 형식
 * @param {string} lastSeen YYYY-MM-DD 형식
 * @returns {number} 서로 다른 YYYY-MM 개수
 */
function countActivityMonths(joined, lastSeen) {
  const joinedMonth = joined.substring(0, 7); // YYYY-MM
  const lastSeenMonth = lastSeen.substring(0, 7); // YYYY-MM

  const [jYear, jMonth] = joinedMonth.split('-').map(Number);
  const [lYear, lMonth] = lastSeenMonth.split('-').map(Number);

  // 개월 수 = (끝 연도 - 시작 연도) * 12 + (끝 월 - 시작 월) + 1
  // +1은 시작 월도 포함하기 위함
  const months = (lYear - jYear) * 12 + (lMonth - jMonth) + 1;
  return Math.max(1, months); // 최소 1개월
}

/**
 * 재직 개월을 계산한다. joined ~ today 의 개월 수 (포함).
 *
 * @param {string} joined YYYY-MM 형식
 * @param {Date} today 오늘 날짜 객체
 * @returns {number} 재직 개월 수
 */
function countEmploymentMonths(joined, today) {
  const [year, month] = joined.split('-').map(Number);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1; // JS month는 0-11, YYYY-MM은 1-12

  // 재직 개월 = (종료 월 - 시작 월) + 1 (시작 달 포함)
  let months = (todayYear - year) * 12 + (todayMonth - month) + 1;
  return Math.max(1, months);
}

/**
 * 인건비를 산정한다.
 *
 * @param {string} md DEVLOG.md 의 전체 마크다운
 * @param {Date} today 오늘 날짜 객체 (기준일)
 * @returns {Object} { roleId: { months, amount|range|null, grade, note } }
 */
export function computePayroll(md, today) {
  const contributions = countContributions(md);

  const result = {};

  for (const role of ROLES) {
    const contrib = contributions[role.id];
    if (!contrib || contrib.count === 0) continue;

    const rate = RATES[role.id];
    if (!rate) continue; // 정의되지 않은 역할은 스킵

    let months = 0;
    let amount = null;
    const grade = rate.grade;

    // 정규직: 재직 개월 기준
    if (role.tier === '정규직' && role.id !== 'director') {
      if (contrib.joined) {
        months = countEmploymentMonths(contrib.joined.substring(0, 7), today);
        amount = typeof rate.amount === 'number' ? rate.amount * months : null;
      }
    }
    // 계약직·프리랜서: 활동 개월 기준
    else if (role.tier === '계약직') {
      if (contrib.joined && contrib.lastSeen) {
        months = countActivityMonths(contrib.joined, contrib.lastSeen);
        // 단가가 범위형이면 문자열로 표기
        if (rate.amount === null) {
          amount = null;
        } else if (typeof rate.amount === 'number') {
          amount = rate.amount * months;
        } else {
          // 범위형: 최소값·최대값 표기 (월 환산 불가인 경우는 범위를 그대로 냄)
          amount = {
            min: rate.amount.min * months,
            max: rate.amount.max * months,
          };
        }
      }
    }

    result[role.id] = {
      months,
      amount,
      grade,
      rate,
      note: `${contrib.count}건 기여, 활동 ${contrib.joined ?? '미상'} ~ ${contrib.lastSeen ?? '미상'}`,
    };
  }

  // 감독 별도 처리 — 원가 합계에 미포함
  if (contributions.director && contributions.director.count > 0) {
    result.director = {
      months: null,
      amount: null,
      grade: '—',
      rate: null,
      note: `창업자(자본 투입 성격) — 원가 합계에 미포함. 기여 ${contributions.director.count}건`,
    };
  }

  return result;
}

/**
 * 인건비 합계를 계산한다 (감독 제외).
 *
 * @param {Object} payroll computePayroll() 의 결과
 * @returns {number|null} 합계 (null 포함된 항목이 있으면 null)
 */
export function totalPayroll(payroll) {
  let total = 0;
  let hasNull = false;
  let hasRange = false;

  for (const [roleId, data] of Object.entries(payroll)) {
    if (roleId === 'director') continue; // 감독 제외

    if (data.amount === null) {
      hasNull = true; // 시세 미확인 항목
    } else if (typeof data.amount === 'object') {
      hasRange = true; // 범위형
    } else {
      total += data.amount;
    }
  }

  if (hasNull || hasRange) return null; // 정확한 합계를 낼 수 없음
  return total;
}
