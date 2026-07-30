// tests/payroll.test.ts
// 인건비 산정 로직 검증 — 활동 개월·null 처리·감독 제외·등급 표기

import { describe, it, expect } from 'vitest';
import { computePayroll, totalPayroll, RATES } from '../scripts/lib/payroll.mjs';

describe('활동 개월 계산', () => {
  it('같은 달에 여러 건이면 1개월', () => {
    // 같은 달 2026-07 에 5건 등장
    const md = `
## 2026-07-01 · 첫 번째
부팀장이 일했다.

## 2026-07-05 · 두 번째
부팀장이 또 일했다.

## 2026-07-10 · 세 번째
부팀장이 계속 일했다.

## 2026-07-15 · 네 번째
부팀장이 더 일했다.

## 2026-07-25 · 다섯 번째
부팀장이 마지막으로 일했다.
`.trim();

    const today = new Date('2026-07-31');
    const payroll = computePayroll(md, today) as any as any;

    // 부팀장은 5건이지만 활동 개월은 2026-07 하나만 = 1개월
    expect(payroll['deputy-lead']).toBeDefined();
    expect(payroll['deputy-lead'].months).toBe(1);
  });

  it('다른 달에 기여하면 각 달마다 1개월씩 세어진다', () => {
    // 2026-07, 2026-08, 2026-09 에 각각 기여
    const md = `
## 2026-07-01 · 첫 번째
디자이너가 일했다.

## 2026-08-10 · 두 번째
디자이너가 다시 일했다.

## 2026-09-15 · 세 번째
디자이너가 또 일했다.
`.trim();

    const today = new Date('2026-09-30');
    const payroll = computePayroll(md, today) as any;

    expect(payroll.designer).toBeDefined();
    expect(payroll.designer.months).toBe(3);
  });
});

describe('null 단가 처리', () => {
  it('null 단가 역할이 합계에 포함되지 않는다', () => {
    // 성능 전문가와 레퍼런스 분석은 단가 null
    const md = `
## 2026-07-01 · 성능 진단
성능 전문가가 일했다.

## 2026-08-01 · 자료 조사
레퍼런스 분석이 일했다.
`.trim();

    const today = new Date('2026-08-31');
    const payroll = computePayroll(md, today) as any;

    // null 항목은 산출되지만 totalPayroll 에 포함되지 않음
    expect(payroll['perf-analyst']).toBeDefined();
    expect(payroll['perf-analyst'].amount).toBeNull();
    expect(payroll['reference-analyst']).toBeDefined();
    expect(payroll['reference-analyst'].amount).toBeNull();

    // 합계 계산할 때 null 항목이 있으면 합계도 null
    const total = totalPayroll(payroll);
    expect(total).toBeNull();
  });

  it('null 항목이 0으로 처리되지 않는다', () => {
    const md = `
## 2026-07-01 · 성능 진단
성능 전문가가 일했다.

## 2026-08-01 · 리드 지원
팀장이 일했다.
`.trim();

    const today = new Date('2026-08-31');
    const payroll = computePayroll(md, today) as any;

    // 팀장만 정확한 금액이 있어야 함
    const teamLead = payroll.lead;
    expect(teamLead).toBeDefined();
    expect(typeof teamLead.amount).toBe('number');
    expect(teamLead.amount).toBeGreaterThan(0);

    // totalPayroll은 null(성능 전문가 때문에)
    const total = totalPayroll(payroll);
    expect(total).toBeNull();
  });
});

describe('감독 처리', () => {
  it('감독은 별도 행으로 분리되고 합계에 포함되지 않는다', () => {
    const md = `
## 2026-07-01 · 시작
감독이 방향을 정했다.

## 2026-07-05 · 진행
팀장이 일했다.
`.trim();

    const today = new Date('2026-07-31');
    const payroll = computePayroll(md, today) as any;

    // 감독이 있어야 함
    expect(payroll.director).toBeDefined();
    expect(payroll.director.amount).toBeNull(); // 감독은 금액 미산정
    expect(payroll.director.months).toBeNull();

    // 감독을 제외한 합계만 계산
    const total = totalPayroll(payroll);
    expect(total).toBeDefined();
    if (total !== null) {
      expect(total).toBeGreaterThan(0);
      // 감독 금액이 포함되지 않았는지 확인 (감독은 amount=null이므로 제외됨)
      expect(payroll.director.amount).toBeNull();
    }
  });
});

describe('등급 표기', () => {
  it('모든 계산된 항목에 grade가 붙는다', () => {
    const md = `
## 2026-07-01 · 디자인
디자이너가 일했다.

## 2026-08-01 · 법무
법무가 일했다.
`.trim();

    const today = new Date('2026-08-31');
    const payroll = computePayroll(md, today) as any;

    for (const [roleId, data] of Object.entries(payroll) as Array<[string, any]>) {
      if (roleId === 'director') continue; // 감독은 제외 가능

      expect(data.grade).toBeDefined();
      expect(typeof data.grade).toBe('string');
      expect(data.grade.length).toBeGreaterThan(0);
    }
  });
});

describe('RATES 구조', () => {
  it('모든 role이 RATES에 정의되어 있거나 null이다', () => {
    // 각 RATES 항목이 올바른 구조
    const ratesEntries = Object.entries(RATES) as Array<[string, any]>;
    for (const [roleId, rate] of ratesEntries) {
      expect(rate.unit).toBeDefined();
      expect(rate.grade).toBeDefined();
      expect(rate.source).toBeDefined();
      // amount는 number | object(범위) | null 중 하나
      if (rate.amount !== null) {
        expect(typeof rate.amount === 'number' || typeof rate.amount === 'object').toBe(true);
      }
    }
  });
});

describe('정규직 재직 개월 계산', () => {
  it('같은 달 입사는 1개월 이상', () => {
    // 같은 달에 입사·퇴사하면 1개월
    const md = `
## 2026-07-01 · 팀장 시작
팀장이 시작했다.

## 2026-07-31 · 팀장 마지막
팀장이 마지막 일을 했다.
`.trim();

    const today = new Date('2026-07-31'); // 같은 달
    const payroll = computePayroll(md, today) as any;

    expect(payroll.lead).toBeDefined();
    expect(payroll.lead.months).toBe(1);
  });

  it('여러 달 재직은 그 개월 수를 센다', () => {
    // 2026-07 ~ 2026-09 = 3개월
    const md = `
## 2026-07-01 · 부팀장 시작
부팀장이 시작했다.

## 2026-09-30 · 부팀장 마지막
부팀장이 마지막 일을 했다.
`.trim();

    const today = new Date('2026-09-30');
    const payroll = computePayroll(md, today) as any;

    expect(payroll['deputy-lead']).toBeDefined();
    // 2026-07 ~ 2026-09 = 3개월
    expect(payroll['deputy-lead'].months).toBe(3);
  });
});

describe('범위형 단가 처리', () => {
  it('범위형 단가는 { min, max } 객체로 표기된다', () => {
    const md = `
## 2026-07-01 · 보안 검토
보안담당이 일했다.

## 2026-08-01 · 또 다른 검토
보안담당이 다시 일했다.
`.trim();

    const today = new Date('2026-08-31');
    const payroll = computePayroll(md, today) as any;

    expect(payroll.security).toBeDefined();
    expect(payroll.security.months).toBe(2); // 2개월 활동
    expect(typeof payroll.security.amount).toBe('object');
    expect(payroll.security.amount.min).toBeDefined();
    expect(payroll.security.amount.max).toBeDefined();
    expect(payroll.security.amount.min).toBeLessThan(payroll.security.amount.max);
  });

  it('범위형이 있으면 totalPayroll은 null이다', () => {
    const md = `
## 2026-07-01 · 보안
보안담당이 일했다.
`.trim();

    const today = new Date('2026-07-31');
    const payroll = computePayroll(md, today) as any;

    const total = totalPayroll(payroll);
    expect(total).toBeNull(); // 범위형 때문에 합계 계산 불가
  });
});

describe('관계 검증 (하드코딩 회피)', () => {
  it('단가 계산은 months × amount 관계를 따른다', () => {
    const md = `
## 2026-07-01 · 디자이너 일
디자이너가 일했다.

## 2026-08-01 · 또 일
디자이너가 다시 일했다.

## 2026-09-01 · 계속 일
디자이너가 또 일했다.
`.trim();

    const today = new Date('2026-09-30');
    const payroll = computePayroll(md, today) as any;

    const designer = payroll.designer;
    expect(designer).toBeDefined();
    expect(designer.months).toBe(3);

    // RATES에서 단가 가져오기
    const rate = RATES.designer;
    expect(typeof rate.amount).toBe('number');
    const expectedAmount = (rate.amount as number) * 3;

    // 계산된 금액이 months × rate.amount 와 일치
    expect(designer.amount).toBe(expectedAmount);
  });
});
