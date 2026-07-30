// 생성기 검증 — 개발일지 건수와 팀 규모의 SSOT 일치
//
// ── 핵심 검증 ────────────────────────────────────────────────────────
// build-team.mjs · build-readme.mjs · build-making.mjs 세 생성기가
// 개발일지 건수와 팀 규모에 대해 같은 값을 쓰는가?
//
// 이 검증이 없으면 한 생성기만 고쳐도 다른 곳은 여전히 옛 값으로 남아
// 라이브 페이지 간 숫자가 어긋난다.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { calculateTeamComposition, countContributions } from '../scripts/lib/devlog-contributors.mjs';
import { loadFrozenTimes, timeInfoFor } from '../scripts/lib/devlog-times.mjs';
import { countEntries, parseEntries } from '../scripts/lib/devlog-entries.mjs';
import { kstTimeOfIso } from '../scripts/lib/kst.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('생성기 일관성 — 개발일지 건수 · 팀 규모', () => {
  // ── README 를 원상복구한다 (검수관 권고, 2026-07-29) ─────────────────────
  // 아래 `beforeAll` 은 `build-readme.mjs` 를 돌리는데, 그것이 **추적 파일인
  // `README.md` 를 덮어쓴다.** `making/*` 은 `.gitignore` 대상이라 무해하지만
  // README 는 다르다.
  //
  // 처음 이 테스트를 넣은 날은 갱신일이 커밋된 값과 같아 diff 가 안 났다. 그래서
  // 아무도 못 봤다 — **날짜가 바뀌는 다음 날부터** `npm test` 를 돌리기만 해도
  // 워킹트리가 더러워진다. "발화하는 날에만 죽는" 구조이고, 이 저장소는 오늘
  // 밸류에이션 cron 에서 정확히 같은 형태를 겪었다.
  //
  // 이 저장소의 "에이전트는 워킹트리를 바꾸지 않는다" 규율은 테스트에도 적용된다.
  let readmeBackup: string | null = null;
  afterAll(() => {
    if (readmeBackup !== null) writeFileSync(join(ROOT, 'README.md'), readmeBackup, 'utf8');
  });

  // CI 환경에서 생성기 산출물이 없을 수 있으므로, 테스트 시작 전 필요한 생성기를 실행
  beforeAll(() => {
    readmeBackup = readFileSync(join(ROOT, 'README.md'), 'utf8');
    try {
      execFileSync('node', ['scripts/build-team.mjs'], { cwd: ROOT, stdio: 'pipe' });
    } catch (e) {
      console.error('build-team.mjs 실행 실패:', e);
      throw e;
    }
    try {
      execFileSync('node', ['scripts/build-making.mjs'], { cwd: ROOT, stdio: 'pipe' });
    } catch (e) {
      console.error('build-making.mjs 실행 실패:', e);
      throw e;
    }
    try {
      execFileSync('node', ['scripts/build-readme.mjs'], { cwd: ROOT, stdio: 'pipe' });
    } catch (e) {
      console.error('build-readme.mjs 실행 실패:', e);
      throw e;
    }
  });
  const devlogMd = readFileSync(join(ROOT, 'docs', 'DEVLOG.md'), 'utf8');
  const expectedDevlogCount = countEntries(devlogMd);
  const expectedTeamComposition = calculateTeamComposition(devlogMd);

  it('SSOT: countEntries() 가 반환하는 항목 수', () => {
    // ── 고정값 단언을 뺐다 (2026-07-30) ────────────────────────────────────
    // `toBe(139)` 가 있었다. 개발일지 항목을 하나 쓸 때마다 이 테스트가 깨지고,
    // 깨지면 **숫자만 기계적으로 고친다** — 그것은 검출력이 아니라 마찰이다.
    // 실제로 이번에 승격 항목을 쓰자마자 140 으로 깨졌다.
    //
    // 이 단언이 지키려던 것("생성기 3종이 같은 값을 쓰는가")은 아래
    // "세 소비자가 개발일지 건수를 같게 쓴다" 가 이미 본다. 여기서는 **파싱이
    // 통째로 죽는 것**만 잡으면 된다(정규식을 잘못 고치면 0 이나 1 이 나온다).
    expect(expectedDevlogCount).toBeGreaterThan(100);
  });

  it('SSOT: calculateTeamComposition() 가 반환하는 팀 규모', () => {
    expect(expectedTeamComposition.founder).toBe(1);
    // 검수관이 2026-07-30 정규직으로 승격했다(감독 지시) — 3/8 → 4/7. 총계는 그대로 12.
    expect(expectedTeamComposition.staff).toBe(4);
    expect(expectedTeamComposition.contract).toBe(7);
    expect(expectedTeamComposition.total).toBe(12);
  });

  it('making/team/index.html 의 개발일지 건수가 SSOT와 일치', () => {
    const teamHtml = readFileSync(join(ROOT, 'making', 'team', 'index.html'), 'utf8');
    // stat-row 의 "공개 개발일지" 수를 찾는다: <div class="n">139</div><div class="l">공개 개발일지</div>
    const match = teamHtml.match(/<div class="n">(\d+)<\/div><div class="l">공개 개발일지<\/div>/);
    const foundCount = match ? parseInt(match[1], 10) : null;

    expect(foundCount, 'making/team/index.html 에서 "공개 개발일지" 수를 찾을 수 없음').not.toBeNull();
    expect(foundCount).toBe(expectedDevlogCount);
  });

  it('making/index.html 의 개발일지 건수가 SSOT와 일치', () => {
    const makingHtml = readFileSync(join(ROOT, 'making', 'index.html'), 'utf8');
    // hub-card 의 "개 기록" 수를 찾는다: <div class="count">139개 기록</div>
    const match = makingHtml.match(/<div class="count">(\d+)개 기록<\/div>/);
    const foundCount = match ? parseInt(match[1], 10) : null;

    expect(foundCount, 'making/index.html 에서 "개 기록" 수를 찾을 수 없음').not.toBeNull();
    expect(foundCount).toBe(expectedDevlogCount);
  });

  it('README.md 의 개발일지 건수가 SSOT와 일치', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
    // "- **개발일지**: 139건" 형식
    const match = readme.match(/\*\*개발일지\*\*:\s*(\d+)건/);
    const foundCount = match ? parseInt(match[1], 10) : null;

    expect(foundCount, 'README.md 에서 개발일지 건수를 찾을 수 없음').not.toBeNull();
    expect(foundCount).toBe(expectedDevlogCount);
  });

  it('making/index.html 의 팀 규모가 SSOT와 일치', () => {
    const makingHtml = readFileSync(join(ROOT, 'making', 'index.html'), 'utf8');
    // 팀 카드의 규모: <div class="count">12명 (창업자 1 · 정규직 3 · 계약직 8)</div>
    const match = makingHtml.match(/👥<\/div>\s*<h2>팀<\/h2>[\s\S]*?<div class="count">(\d+)명 \(창업자 (\d+) · 정규직 (\d+) · 계약직 (\d+)\)<\/div>/);

    expect(match, 'making/index.html 에서 팀 규모를 찾을 수 없음').not.toBeNull();
    if (match) {
      expect(parseInt(match[1], 10)).toBe(expectedTeamComposition.total);
      expect(parseInt(match[2], 10)).toBe(expectedTeamComposition.founder);
      expect(parseInt(match[3], 10)).toBe(expectedTeamComposition.staff);
      expect(parseInt(match[4], 10)).toBe(expectedTeamComposition.contract);
    }
  });

  it('README.md 의 팀 규모가 SSOT와 일치', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
    // "- **팀 규모**: 12명 (창업자 1 · 정규직 3 · 계약직 8)" 형식
    const match = readme.match(/\*\*팀 규모\*\*:\s*(\d+)명 \(창업자 (\d+) · 정규직 (\d+) · 계약직 (\d+)\)/);

    expect(match, 'README.md 에서 팀 규모를 찾을 수 없음').not.toBeNull();
    if (match) {
      expect(parseInt(match[1], 10)).toBe(expectedTeamComposition.total);
      expect(parseInt(match[2], 10)).toBe(expectedTeamComposition.founder);
      expect(parseInt(match[3], 10)).toBe(expectedTeamComposition.staff);
      expect(parseInt(match[4], 10)).toBe(expectedTeamComposition.contract);
    }
  });

  it('세 소비자가 개발일지 건수를 같게 쓴다', () => {
    const teamHtml = readFileSync(join(ROOT, 'making', 'team', 'index.html'), 'utf8');
    const makingHtml = readFileSync(join(ROOT, 'making', 'index.html'), 'utf8');
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');

    const teamMatch = teamHtml.match(/<div class="n">(\d+)<\/div><div class="l">공개 개발일지<\/div>/);
    const makingMatch = makingHtml.match(/<div class="count">(\d+)개 기록<\/div>/);
    const readmeMatch = readme.match(/\*\*개발일지\*\*:\s*(\d+)건/);

    const teamCount = teamMatch ? parseInt(teamMatch[1], 10) : null;
    const makingCount = makingMatch ? parseInt(makingMatch[1], 10) : null;
    const readmeCount = readmeMatch ? parseInt(readmeMatch[1], 10) : null;

    expect(teamCount, 'team 소비자를 읽을 수 없음').not.toBeNull();
    expect(makingCount, 'making 소비자를 읽을 수 없음').not.toBeNull();
    expect(readmeCount, 'readme 소비자를 읽을 수 없음').not.toBeNull();

    expect(teamCount).toBe(makingCount);
    expect(makingCount).toBe(readmeCount);
  });

  it('세 소비자가 팀 규모를 같게 쓴다', () => {
    const makingHtml = readFileSync(join(ROOT, 'making', 'index.html'), 'utf8');
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');

    // making 에서 추출
    const makingMatch = makingHtml.match(/👥<\/div>\s*<h2>팀<\/h2>[\s\S]*?<div class="count">(\d+)명 \(창업자 (\d+) · 정규직 (\d+) · 계약직 (\d+)\)<\/div>/);
    // readme 에서 추출
    const readmeMatch = readme.match(/\*\*팀 규모\*\*:\s*(\d+)명 \(창업자 (\d+) · 정규직 (\d+) · 계약직 (\d+)\)/);

    expect(makingMatch, 'making 에서 팀 규모를 읽을 수 없음').not.toBeNull();
    expect(readmeMatch, 'readme 에서 팀 규모를 읽을 수 없음').not.toBeNull();

    if (makingMatch && readmeMatch) {
      // total 일치
      expect(makingMatch[1]).toBe(readmeMatch[1]);
      // founder 일치
      expect(makingMatch[2]).toBe(readmeMatch[2]);
      // staff 일치
      expect(makingMatch[3]).toBe(readmeMatch[3]);
      // contract 일치
      expect(makingMatch[4]).toBe(readmeMatch[4]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 활동 시각 표시 — **집행 쪽** 통합 검증 (2026-07-30 신설)
//
// 이 저장소 규율: *"판정/집행 분리의 구멍 — 경계를 건너는 지점은 아무도 안 본다.
// `decide/` 를 순수 함수로 두면 각 쪽은 테스트하기 쉬워지지만, '계산된 값이 실제로
// 소비되는가' 는 양쪽 테스트 어디에도 안 걸린다."*
//
// `countContributions()` 가 `*TimeBulk` 를 계산하고 `devlog-times.test.ts` 가 그 판정을
// 검증하지만, **`build-team.mjs` 가 그 값을 실제로 써서 시각을 감추는지**는 어느 단위
// 테스트도 보지 않는다. `formatActivity()` 에서 `isBulk` 조건을 지워도 단위 테스트는
// 전부 통과한다. 그 구멍을 여기서 막는다.
// ─────────────────────────────────────────────────────────────────────────────
describe('활동 시각 표시 — 일괄 기록 시각이 화면에 새지 않는다', () => {
  const teamHtml = () => readFileSync(join(ROOT, 'making', 'team', 'index.html'), 'utf8');

  /** "첫 등장: X, 마지막: Y." 문장을 전부 뽑는다. */
  function activityLines(html: string): { joined: string; lastSeen: string }[] {
    const out: { joined: string; lastSeen: string }[] = [];
    const re = /첫 등장: ([^,]+), 마지막: ([^.<]+)\./g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) out.push({ joined: m[1].trim(), lastSeen: m[2].trim() });
    return out;
  }

  it('활동 표시가 실제로 렌더된다', () => {
    const lines = activityLines(teamHtml());
    expect(lines.length, '"첫 등장: …, 마지막: …" 문장을 찾을 수 없음').toBeGreaterThan(5);
  });

  it('모든 표시가 날짜로 시작한다 (YYYY-MM-DD)', () => {
    for (const { joined, lastSeen } of activityLines(teamHtml())) {
      expect(joined).toMatch(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/);
      expect(lastSeen).toMatch(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/);
    }
  });

  it('시각이 붙은 표시가 하나 이상 있다 — 없으면 이 기능이 장식이다', () => {
    const withTime = activityLines(teamHtml())
      .filter((l) => /\d{2}:\d{2}/.test(l.joined) || /\d{2}:\d{2}/.test(l.lastSeen));
    expect(withTime.length, '시각이 표시된 항목이 0건 — 감독이 요청한 시·분 표시가 안 나온다').toBeGreaterThan(0);
  });

  it('일괄 기록 커밋의 시각이 **어디에도 표시되지 않는다**', () => {
    // 일괄 커밋 시각을 동결 데이터에서 유도한다 — 하드코딩하면 미러가 된다.
    const frozen = loadFrozenTimes();
    expect(frozen.bulkCommits.size, 'bulkCommits 가 비어 있어 이 테스트가 무의미하다').toBeGreaterThan(0);

    const bulkHHmm = [...frozen.bulkCommits].map((iso) => kstTimeOfIso(iso)).filter(Boolean);
    const html = teamHtml();
    const lines = activityLines(html);

    for (const hhmm of bulkHHmm) {
      for (const { joined, lastSeen } of lines) {
        expect(joined, `일괄 기록 시각 ${hhmm} 이 "첫 등장" 에 노출됐다`).not.toContain(hhmm as string);
        expect(lastSeen, `일괄 기록 시각 ${hhmm} 이 "마지막" 에 노출됐다`).not.toContain(hhmm as string);
      }
    }
  });

  it('카피라이터의 첫 등장과 마지막 활동이 다르다 — 활동 기간 은폐 회귀 방어', () => {
    // 1차 판본에서 카피라이터는 "첫 등장 05:53, 마지막 05:53" 으로 나왔다. 일괄 커밋
    // 시각이 joined·lastSeen 양쪽을 덮어써서 **실제 활동 기간이 완전히 사라졌다.**
    // 그 회귀를 직접 겨냥한다.
    const devlog = readFileSync(join(ROOT, 'docs', 'DEVLOG.md'), 'utf8');
    const c = countContributions(devlog).copywriter;
    expect(c.count, '카피라이터 기여가 0이면 이 테스트가 무의미하다').toBeGreaterThan(0);
    expect(c.joined).not.toBe(c.lastSeen);
    expect(String(c.joined) < String(c.lastSeen), `joined=${c.joined} lastSeen=${c.lastSeen}`).toBe(true);
  });

  it('시각의 출처와 한계가 페이지에 적혀 있다', () => {
    const html = teamHtml();
    // 규율: 못 잰 것·부정확한 것을 조용히 두지 않는다. 읽는 사람이 오해하지 않게 적는다.
    expect(html).toContain('일지를 쓴 시각');
    expect(html).toMatch(/표시하지 않고 날짜만/);
  });

  it('한계 문구의 숫자가 실제 데이터와 일치한다 — 하드코딩이 아니다', () => {
    const devlog = readFileSync(join(ROOT, 'docs', 'DEVLOG.md'), 'utf8');
    const frozen = loadFrozenTimes();
    const actualBulk = parseEntries(devlog).filter((e) => timeInfoFor(e, frozen).bulk).length;

    const m = teamHtml().match(/개발 초기에 (\d+)개 항목을 한 번에 몰아 기록한/);
    expect(m, '한계 문구를 찾을 수 없음').not.toBeNull();
    expect(parseInt(m![1], 10)).toBe(actualBulk);
  });
});
