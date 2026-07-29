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
import { countEntries } from '../scripts/lib/devlog-entries.mjs';
import { calculateTeamComposition } from '../scripts/lib/devlog-contributors.mjs';

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
    expect(expectedDevlogCount).toBeGreaterThan(100);
    // 정확한 값은 DEVLOG.md 에 의존하지만, 139개로 고정되어야 함 (2026-07-29 기준)
    expect(expectedDevlogCount).toBe(139);
  });

  it('SSOT: calculateTeamComposition() 가 반환하는 팀 규모', () => {
    expect(expectedTeamComposition.founder).toBe(1);
    expect(expectedTeamComposition.staff).toBe(3);
    expect(expectedTeamComposition.contract).toBe(8);
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
