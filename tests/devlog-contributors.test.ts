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

describe('날짜 계산 — min/max 정렬', () => {
  // DEVLOG 날짜가 뒤섞여 있을 수 있으니 등장 순서가 아니라 날짜로 min/max 를 잡는다.

  it('날짜가 뒤섞인 경우 joined=최소 · lastSeen=최대', () => {
    // 등장 순서: 3월→1월→2월, 하지만 joined 는 1월, lastSeen 은 3월
    const md = `## 2026-03-15 · 제목1\n\n감독이 했다.\n
## 2026-01-05 · 제목2\n\n감독이 했다.\n
## 2026-02-10 · 제목3\n\n감독이 했다.\n`;
    const result = countContributions(md);
    expect(result['director'].joined).toBe('2026-01-05');
    expect(result['director'].lastSeen).toBe('2026-03-15');
  });

  it('한 항목만 있는 경우 joined === lastSeen', () => {
    const md = `## 2026-01-05 · 제목\n\n감독이 했다.\n`;
    const result = countContributions(md);
    expect(result['director'].joined).toBe('2026-01-05');
    expect(result['director'].lastSeen).toBe('2026-01-05');
  });

  it('미등장 역할은 joined/lastSeen = null', () => {
    const md = `## 2026-01-01 · 제목\n\n감독이 했다.\n`;
    const result = countContributions(md);
    expect(result['legal'].joined).toBeNull();
    expect(result['legal'].lastSeen).toBeNull();
    expect(result['legal'].count).toBe(0);
  });

  it('실제 DEVLOG 에서 모든 joined <= lastSeen', () => {
    const src = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8');
    const result = countContributions(src);

    for (const [roleId, data] of Object.entries(result)) {
      if (data.count > 0) {
        // tsc 가 `possibly null` 을 짚었다. 타입만 회피하지 않고 **단언으로 올린다** —
        // 한 번이라도 등장했는데(count>0) 날짜가 없다면 그건 집계 자체의 결함이다.
        // 회피(`!`·`as`)로 눌렀으면 그 결함이 조용히 통과했을 자리다.
        expect(data.joined, `${roleId}: count>0 인데 joined 가 없다`).not.toBeNull();
        expect(data.lastSeen, `${roleId}: count>0 인데 lastSeen 이 없다`).not.toBeNull();
        // 문자열 날짜 비교: YYYY-MM-DD 형식이므로 사전식 비교가 곧 날짜 비교
        expect(String(data.joined) <= String(data.lastSeen), roleId).toBe(true);
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

  it('결과 날짜가 YYYY-MM-DD 형식이거나 null 이다', () => {
    const src = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8');
    const result = countContributions(src);
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;

    for (const [, data] of Object.entries(result)) {
      if (data.joined !== null) {
        expect(data.joined).toMatch(dateRe);
      }
      if (data.lastSeen !== null) {
        expect(data.lastSeen).toMatch(dateRe);
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

  it('특정 역할의 정보를 조회한다', () => {
    const md = `## 2026-01-01 · 제목\n\n감독이 했다.\n`;
    const info = contributionOf(md, 'director');
    expect(info.count).toBe(1);
    expect(info.joined).toBe('2026-01-01');
    expect(info.lastSeen).toBe('2026-01-01');
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
