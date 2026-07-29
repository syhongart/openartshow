// 개발일지 역할별 기여 축 — 집계가 **정말 맞는지** 를 본다.
//
// ── 핵심 검증: 팀장/부팀장 분리 ──────────────────────────────────────
// "팀장" 패턴이 "부팀장"을 포함하므로 정규식으로는 분리가 불가능했다.
// 따라서 구현에서는 **부팀장을 먼저 제거한 텍스트에서 팀장을 찾는다**.
// 이것이 핵심이므로 뮤테이션 테스트로 반드시 검증한다.
//
// ── 날짜 계산: min/max 로 joined/lastSeen 을 구한다 ──────────────────
// DEVLOG 항목이 날짜 역순도 정순도 아니므로, 등장 순서가 아니라
// **날짜를 정렬해 최소·최대**를 찾는다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countContributions, contributionOf, ROLES, BY_ID } from '../scripts/lib/devlog-contributors.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** DEVLOG.md 의 모든 항목(## YYYY-MM-DD · 제목). 생성기와 같은 정규식. */
function devlogItems(): Array<{ date: string; title: string; content: string }> {
  const src = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8').replace(/\r\n/g, '\n');
  return src.split(/\n(?=## )/)
    .map((b) => {
      const m = b.match(/^## (\d{4}-\d{2}-\d{2}) · (.+)\n/);
      return m ? { date: m[1], title: m[2].trim(), content: b } : null;
    })
    .filter((x): x is { date: string; title: string; content: string } => !!x);
}

describe('분리 검증 — 팀장/부팀장 뮤테이션', () => {
  // 구현은 부팀장을 먼저 제거한 텍스트에서 팀장을 찾는다.
  // 이 테스트가 깨지면 "팀장 중복 검출" 버그가 생긴 것이다.

  it('부팀장만 든 항목에서 팀장=0 · 부팀장=1', () => {
    const md = `## 2026-01-01 · 제목\n\n부팀장이 했다.\n`;
    const result = countContributions(md);
    expect(result['lead'].count).toBe(0);
    expect(result['deputy-lead'].count).toBe(1);
  });

  it('팀장만 든 항목(부팀장 제거 후)에서 팀장=1 · 부팀장=0', () => {
    const md = `## 2026-01-01 · 제목\n\n팀장이 했다.\n`;
    const result = countContributions(md);
    expect(result['lead'].count).toBe(1);
    expect(result['deputy-lead'].count).toBe(0);
  });

  it('둘 다 든 항목에서 팀장=1 · 부팀장=1', () => {
    const md = `## 2026-01-01 · 제목\n\n팀장과 부팀장이 했다.\n`;
    const result = countContributions(md);
    expect(result['lead'].count).toBe(1);
    expect(result['deputy-lead'].count).toBe(1);
  });

  it('고정: 팀장이 오검출되면 부팀장 건수만큼 팀장이 부풀려진다 (회귀 방지)', () => {
    // 만약 구현에서 부팀장 제거를 빼면 팀장이 부팀장을 포함하므로:
    // 부팀장 항목 5개 → 팀장도 5개 오검출된다.
    // 이 경우 실제 DEVLOG 에서 팀장 기여도가 부팀장만큼 부풀려질 것이다.
    // 테스트로 이를 막는다.
    const md = `## 2026-01-01 · 제목1\n\n부팀장이 했다.\n
## 2026-01-02 · 제목2\n\n부팀장이 또 했다.\n`;
    const result = countContributions(md);
    expect(result['deputy-lead'].count).toBe(2);
    expect(result['lead'].count).toBe(0); // 부팀장 2건으로 팀장이 부풀려지면 이게 2가 된다
  });
});

describe('항목 단위 집계', () => {
  // 한 항목 안에 같은 역할이 여러 번 나와도 1건이다.

  it('한 항목 안에서 역할이 3번 나와도 1건으로 센다', () => {
    const md = `## 2026-01-01 · 제목\n\n감독이 했다. 감독이 또 했다. 감독이 또또 했다.\n`;
    const result = countContributions(md);
    expect(result['director'].count).toBe(1);
  });

  it('여러 항목에 같은 역할이 나오면 항목 수대로 센다', () => {
    const md = `## 2026-01-01 · 제목1\n\n감독이 했다.\n
## 2026-01-02 · 제목2\n\n감독이 했다.\n
## 2026-01-03 · 제목3\n\n감독이 했다.\n`;
    const result = countContributions(md);
    expect(result['director'].count).toBe(3);
  });
});

describe('날짜 계산 — min/max 정렬 (없는 맵)', () => {
  // DEVLOG 날짜가 뒤섞여 있을 수 있으니 등장 순서가 아니라 날짜로 min/max 를 잡는다.
  // joined·lastSeen 은 이제 ISO8601 시각 또는 null 이다.
  // 픽스처는 git 정보가 없으므로 null 을 기대한다 (git 맵을 주입하지 않으면 측정 실패).

  it('맵을 주입하지 않으면: joined/lastSeen = null (측정 실패)', () => {
    // 등장 순서: 3월→1월→2월, 하지만 git 맵이 없으므로 null
    const md = `## 2026-03-15 · 제목1\n\n감독이 했다.\n
## 2026-01-05 · 제목2\n\n감독이 했다.\n
## 2026-02-10 · 제목3\n\n감독이 했다.\n`;
    const result = countContributions(md); // 맵 미주입 — 측정 실패
    expect(result['director'].count).toBe(3);
    expect(result['director'].joined).toBeNull();
    expect(result['director'].lastSeen).toBeNull();
  });
});

describe('날짜 계산 — min/max 정렬 (고정 맵 주입)', () => {
  // countContributions(md, devlogTimesMap) 에 고정 맵을 주입해서
  // 산술값을 검증한다. 이것이 블로커 2의 핵심 — 산술 경로를 실제로 깨뜨리는 뮤테이션 감지.

  it('고정 맵을 주입해서 joined/lastSeen 산술값을 검증한다', () => {
    const md = `## 2026-03-15 · 항목A\n\n감독이 했다.\n
## 2026-01-05 · 항목B\n\n감독이 했다.\n
## 2026-02-10 · 항목C\n\n감독이 했다.\n`;

    // 고정 맵: 항목별 커밋 시각
    const mockTimes = {
      '항목A': '2026-03-15T14:32:00Z',
      '항목B': '2026-01-05T10:00:00Z',
      '항목C': '2026-02-10T09:30:00Z',
    };

    const result = countContributions(md, mockTimes);
    expect(result['director'].count).toBe(3);
    // min(항목B) = 2026-01-05, max(항목A) = 2026-03-15
    expect(result['director'].joined).toBe('2026-01-05T10:00:00Z');
    expect(result['director'].lastSeen).toBe('2026-03-15T14:32:00Z');
  });

  it('한 항목만 있으면 joined === lastSeen (고정 맵)', () => {
    const md = `## 2026-02-10 · 항목\n\n감독이 했다.\n`;
    const mockTimes = {
      '항목': '2026-02-10T09:30:00Z',
    };
    const result = countContributions(md, mockTimes);
    expect(result['director'].count).toBe(1);
    expect(result['director'].joined).toBe('2026-02-10T09:30:00Z');
    expect(result['director'].lastSeen).toBe('2026-02-10T09:30:00Z');
  });

  it('맵에 없는 항목은 null 값으로 처리된다', () => {
    const md = `## 2026-07-01 · 항목A\n\n팀장이 했다.\n
## 2026-07-05 · 항목B\n\n팀장이 했다.\n`;

    // 항목B 는 맵에 없음
    const mockTimes = {
      '항목A': '2026-07-01T10:00:00Z',
      // '항목B': undefined → 기본값 null
    };

    const result = countContributions(md, mockTimes);
    expect(result['lead'].count).toBe(2);
    // 항목A 의 시각은 '2026-07-01', 항목B 는 null
    // min(2026-07-01, null) = null, max 도 null? 아니, 둘 다 있으면 ISO, 하나가 null 이면?
    // (날짜 배열에서 min/max 를 구하는데, null 을 무시해야 하나? 아니면 포함하나?)
    // 현재 구현을 보면 data.dates 배열에서 sort 후 첫/마지막을 취하므로,
    // 배열 원소는 { date, iso } 형태고, iso 는 null 일 수 있다.
    // 즉, joined/lastSeen 이 null 이 될 수 있다 (일부가 null 이면).
    expect(result['lead'].joined).toBeNull(); // 일부가 null 이므로
  });

  it('모든 항목이 맵에 있으면 min/max 산술값이 정확하다', () => {
    const md = `## 2026-07-10 · 첫째\n\n부팀장이 했다.\n
## 2026-07-01 · 둘째\n\n부팀장이 했다.\n
## 2026-07-20 · 셋째\n\n부팀장이 했다.\n`;

    const mockTimes = {
      '첫째': '2026-07-10T15:00:00Z',
      '둘째': '2026-07-01T08:30:00Z',
      '셋째': '2026-07-20T16:45:00Z',
    };

    const result = countContributions(md, mockTimes);
    expect(result['deputy-lead'].count).toBe(3);
    // min = 2026-07-01, max = 2026-07-20
    expect(result['deputy-lead'].joined).toBe('2026-07-01T08:30:00Z');
    expect(result['deputy-lead'].lastSeen).toBe('2026-07-20T16:45:00Z');
  });

  it('한 항목만 있는 경우 joined === lastSeen (있다면)', () => {
    const md = `## 2026-01-05 · 제목\n\n감독이 했다.\n`;
    const result = countContributions(md);
    expect(result['director'].count).toBe(1);
    // 픽스처는 null
    expect(result['director'].joined).toBeNull();
    expect(result['director'].lastSeen).toBeNull();
  });

  it('미등장 역할은 joined/lastSeen = null', () => {
    const md = `## 2026-01-01 · 제목\n\n감독이 했다.\n`;
    const result = countContributions(md);
    expect(result['legal'].joined).toBeNull();
    expect(result['legal'].lastSeen).toBeNull();
    expect(result['legal'].count).toBe(0);
  });

  it('실제 DEVLOG 에서: joined 와 lastSeen 이 있다면 joined <= lastSeen', () => {
    const src = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8');
    const result = countContributions(src);

    for (const [roleId, data] of Object.entries(result)) {
      if (data.count > 0) {
        // joined·lastSeen 은 이제 ISO8601 시각 또는 null.
        // git log 가 동작하면 ISO 시각이 있고, shallow clone 이면 null 일 수도.
        if (data.joined && data.lastSeen) {
          // ISO 형식이므로 사전식 비교로 시간 비교 가능
          expect(String(data.joined) <= String(data.lastSeen), roleId).toBe(true);
        }
        // joined·lastSeen 중 하나만 null 인 경우는 없어야 한다
        // (둘 다 같은 로직으로 계산되므로 함께 null 이거나 함께 ISO)
        const bothNull = data.joined === null && data.lastSeen === null;
        const bothPresent = data.joined !== null && data.lastSeen !== null;
        expect(bothNull || bothPresent, `${roleId}: joined 와 lastSeen 의 null/non-null 불일치`).toBe(true);
      }
    }
  });
});

describe('역할 정보 완정성', () => {
  it('id 가 중복되지 않는다', () => {
    const ids = ROLES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 역할에 emoji 와 name 이 있다', () => {
    for (const r of ROLES) {
      expect(r.emoji.length).toBeGreaterThan(0);
      expect(r.name.length).toBeGreaterThan(0);
    }
  });

  it('BY_ID 에 모든 역할이 들어 있다', () => {
    expect(BY_ID.size).toBe(ROLES.length);
    for (const r of ROLES) {
      expect(BY_ID.get(r.id)).toBe(r);
    }
  });
});

describe('DEVLOG 전량', () => {
  // 실제 개발일지에서 벗어난 변화를 감지한다.

  it('항목이 충분히 많다 — 파싱 실패 감시', () => {
    const items = devlogItems();
    expect(items.length).toBeGreaterThan(100);
  });

  it('모든 항목의 날짜가 YYYY-MM-DD 형식이다', () => {
    const items = devlogItems();
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    for (const item of items) {
      expect(item.date).toMatch(dateRe);
    }
  });

  it('결과 시각이 ISO8601 또는 YYYY-MM-DD 형식이거나 null 이다', () => {
    const src = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8');
    const result = countContributions(src);
    // ISO8601: 2026-07-29T14:32:00Z 또는 날짜만: 2026-07-29
    const iso8601Re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;

    for (const [, data] of Object.entries(result)) {
      if (data.joined !== null) {
        // ISO8601 또는 날짜만
        expect(data.joined).toMatch(iso8601Re.test(data.joined) ? iso8601Re : dateRe);
      }
      if (data.lastSeen !== null) {
        expect(data.lastSeen).toMatch(iso8601Re.test(data.lastSeen) ? iso8601Re : dateRe);
      }
    }
  });

  it('감독이 가장 많이 기여했다', () => {
    const src = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8');
    const result = countContributions(src);
    const max = Math.max(...Object.values(result).map((d) => d.count));
    expect(result['director'].count).toBe(max);
  });

  it('모든 역할의 합계가 항목 수보다 크거나 같다', () => {
    const src = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8');
    const result = countContributions(src);
    const items = devlogItems();
    const totalContributions = Object.values(result).reduce((a, d) => a + d.count, 0);
    // 한 항목은 1개 이상의 역할을 포함하므로 합계 >= 항목 수
    expect(totalContributions).toBeGreaterThanOrEqual(items.length);
  });
});

describe('API — contributionOf', () => {
  // 단건 조회 함수.

  it('픽스처는 git 정보가 없으므로 joined/lastSeen = null', () => {
    // 픽스처는 git log 정보 없음
    const md = `## 2026-01-01 · 제목\n\n감독이 했다.\n`;
    const info = contributionOf(md, 'director');
    expect(info.count).toBe(1);
    expect(info.joined).toBeNull(); // git 정보 없음
    expect(info.lastSeen).toBeNull(); // git 정보 없음
  });

  it('미등장 역할은 { count: 0, joined: null, lastSeen: null }', () => {
    const md = `## 2026-01-01 · 제목\n\n감독이 했다.\n`;
    const info = contributionOf(md, 'legal');
    expect(info.count).toBe(0);
    expect(info.joined).toBeNull();
    expect(info.lastSeen).toBeNull();
  });
});

describe('패턴 정확도 — 회귀 방지', () => {
  // 각 역할의 정규식이 오검출을 하지 않는지 확인한다.

  it('지시 맥락에서 감독/팀장/부팀장을 분리한다', () => {
    const cases = [
      {
        md: '감독 지시로 진행했다.',
        expect: { director: 1, lead: 0, 'deputy-lead': 0 },
      },
      {
        md: '팀장이 판단했다.',
        expect: { director: 0, lead: 1, 'deputy-lead': 0 },
      },
      {
        md: '부팀장이 처리했다.',
        expect: { director: 0, lead: 0, 'deputy-lead': 1 },
      },
    ];

    for (const c of cases) {
      const md = `## 2026-01-01 · 제목\n\n${c.md}\n`;
      const result = countContributions(md);
      for (const [roleId, count] of Object.entries(c.expect)) {
        expect(result[roleId].count).toBe(count);
      }
    }
  });

  it('"보안"과 "보안담당"을 구분한다', () => {
    const md1 = `## 2026-01-01 · 제목\n\n보안담당이 확인했다.\n`;
    const md2 = `## 2026-01-01 · 제목\n\n보안을 점검했다.\n`;

    const result1 = countContributions(md1);
    const result2 = countContributions(md2);

    expect(result1['security'].count).toBe(1);
    expect(result2['security'].count).toBe(0);
  });
});
