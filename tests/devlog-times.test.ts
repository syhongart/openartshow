// tests/devlog-times.test.ts
// 동결 시각 데이터의 조회 계층 검증.
//
// ── 이 테스트가 지키는 것 ────────────────────────────────────────────────────
// 1차 판본은 매 호출마다 git log 를 파싱했고, CI 의 shallow clone 에서 **139개 항목이
// 체크아웃 시각 하나로 수렴**했다(검수관 실측: 고유 시각 개수 = 1). null 이 아니라
// 그럴듯하게 틀린 값이 조용히 흘렀고, 코드 주석은 "못 얻으면 null" 이라며 **틀린 것을
// 보증**하고 있었다.
//
// 지금은 git 을 보지 않는다. 그래서 봐야 할 것이 달라졌다:
//   · 시각의 **우선순위** (제목 줄 > 동결 JSON > null)
//   · **일괄 기록** 판정이 데이터에서 오는가 (휴리스틱이 아니라)
//   · 파일이 없거나 깨졌을 때 **조용히 빈 값처럼 굴지 않는가** (available)
//   · 실제 `docs/devlog-times.json` 이 오염돼 있지 않은가 (고유 시각 개수)

import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadFrozenTimes, timeInfoFor, FROZEN_PATH } from '../scripts/lib/devlog-times.mjs';
import { parseEntries, entryKey } from '../scripts/lib/devlog-entries.mjs';

/** 임시 동결 파일을 만들어 경로를 돌려준다. **저장소 파일을 건드리지 않는다.** */
function writeTempFrozen(obj: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'frozen-'));
  const p = join(dir, 'devlog-times.json');
  writeFileSync(p, JSON.stringify(obj), 'utf8');
  return p;
}

describe('loadFrozenTimes — 동결 파일 읽기', () => {
  it('정상 파일을 읽고 available=true', () => {
    const p = writeTempFrozen({
      bulkCommits: ['2026-07-13T05:53:56+00:00'],
      times: { '2026-07-13 · 제목': '2026-07-13T05:53:56+00:00' },
    });
    const f = loadFrozenTimes(p);
    expect(f.available).toBe(true);
    expect(f.times['2026-07-13 · 제목']).toBe('2026-07-13T05:53:56+00:00');
    expect(f.bulkCommits.has('2026-07-13T05:53:56+00:00')).toBe(true);
  });

  it('파일이 없으면 available=false — 빈 값과 구별된다', () => {
    const f = loadFrozenTimes(join(tmpdir(), 'does-not-exist-devlog-times.json'));
    expect(f.available).toBe(false);
    expect(Object.keys(f.times)).toHaveLength(0);
  });

  it('파일이 깨졌으면 available=false (예외를 던지지 않는다)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'frozen-bad-'));
    const p = join(dir, 'devlog-times.json');
    writeFileSync(p, '{ 이것은 JSON 이 아니다', 'utf8');
    // "못 잰 것" 을 available=false 로 드러낸다. 조용히 빈 맵처럼 굴면 구별이 안 된다.
    expect(() => loadFrozenTimes(p)).not.toThrow();
    expect(loadFrozenTimes(p).available).toBe(false);
  });

  it('bulkCommits 가 없는 파일도 읽는다 (빈 Set)', () => {
    const p = writeTempFrozen({ times: { 'a · b': '2026-01-01T00:00:00+00:00' } });
    expect(loadFrozenTimes(p).bulkCommits.size).toBe(0);
  });
});

describe('timeInfoFor — 시각 우선순위', () => {
  const frozen = {
    times: {
      '2026-07-13 · 몰아 쓴 항목': '2026-07-13T05:53:56+00:00',
      '2026-07-29 · 개별 항목': '2026-07-29T07:59:19+00:00',
    },
    bulkCommits: new Set(['2026-07-13T05:53:56+00:00']),
  };

  it('제목 줄의 시각이 동결 JSON 을 이긴다', () => {
    // 사람이 적은 값이 git 커밋 시각(= 일지를 쓴 시각)보다 정확하다.
    const [entry] = parseEntries('## 2026-07-13 14:20 · 몰아 쓴 항목\n본문\n');
    const info = timeInfoFor(entry, frozen);
    expect(info.time).toBe('14:20');
    // 제목 줄에 적힌 시각은 **일괄 기록일 수 없다** — 그 항목을 쓰는 순간 적은 값이다.
    expect(info.bulk).toBe(false);
  });

  it('제목 줄에 시각이 없으면 동결 JSON 을 KST 로 쓴다', () => {
    const [entry] = parseEntries('## 2026-07-29 · 개별 항목\n본문\n');
    // 07:59 UTC + 9h = 16:59 KST. 오프셋을 여기 다시 적지 않고 결과만 본다.
    expect(timeInfoFor(entry, frozen).time).toBe('16:59');
  });

  it('일괄 기록 커밋의 항목은 bulk=true 로 표시된다', () => {
    const [entry] = parseEntries('## 2026-07-13 · 몰아 쓴 항목\n본문\n');
    const info = timeInfoFor(entry, frozen);
    expect(info.bulk).toBe(true);
    // 시각 자체는 돌려준다 — 감추는 판단은 표시 계층(build-team.mjs)의 몫이다.
    expect(info.time).not.toBeNull();
  });

  it('동결 데이터에 없는 항목은 null — 0시로 채우지 않는다', () => {
    const [entry] = parseEntries('## 2026-01-01 · 모르는 항목\n본문\n');
    expect(timeInfoFor(entry, frozen).time).toBeNull();
  });

  it('★ 접두가 붙어도 동결 데이터를 찾는다 (키는 ★ 를 제외한다)', () => {
    const [entry] = parseEntries('## 2026-07-29 · ★★ 개별 항목\n본문\n');
    // 파서가 만드는 키와 동결 파일의 키가 같아야 한다. ★ 처리가 갈리면 여기서 깨진다 —
    // 실제로 `build-devlog.mjs`(★+ 전량)와 `devlog-entries.mjs`(★ 하나)가 갈려 있었다.
    expect(entry.key).toBe(entryKey('2026-07-29', '개별 항목'));
    expect(timeInfoFor(entry, frozen).time).toBe('16:59');
  });

  it('깨진 ISO 값은 null (예외 아님)', () => {
    const bad = { times: { '2026-01-01 · x': '어제쯤' }, bulkCommits: new Set<string>() };
    const [entry] = parseEntries('## 2026-01-01 · x\n본문\n');
    expect(timeInfoFor(entry, bad).time).toBeNull();
  });
});

describe('실제 docs/devlog-times.json — 오염 검사', () => {
  const frozen = loadFrozenTimes(FROZEN_PATH);

  it('파일이 존재하고 읽힌다', () => {
    expect(
      frozen.available,
      `${FROZEN_PATH} 를 읽지 못했다 — node scripts/extract-devlog-times.mjs 로 생성하라`,
    ).toBe(true);
  });

  it('고유 시각이 여럿이다 — 1 이면 shallow clone 오염이다', () => {
    const unique = new Set(Object.values(frozen.times));
    // 1차 판본의 실패 모드를 직접 겨냥한 단언이다. 검수관 실측에서 shallow clone 의
    // 고유 시각 개수는 **1** 이었다(139개 항목 전부가 한 시각으로 수렴). 동결 파일은
    // full clone 에서만 만들어지므로 이 값이 크게 나와야 한다.
    expect(unique.size).toBeGreaterThan(10);
  });

  it('일괄 기록 커밋이 선언돼 있고, 실제로 여러 날짜를 포함한다', () => {
    expect(frozen.bulkCommits.size).toBeGreaterThan(0);
    // 일괄 판정의 **정의**를 확인한다: 한 시각에 서로 다른 날짜의 항목이 묶여 있다.
    // (개수 임계값이 아니라 정의로 판정한다 — 임계값은 추측이 된다.)
    for (const iso of frozen.bulkCommits) {
      const dates = new Set(
        Object.entries(frozen.times).filter(([, v]) => v === iso).map(([k]) => k.slice(0, 10)),
      );
      expect(dates.size, `${iso} 가 bulk 인데 날짜가 ${dates.size}종이다`).toBeGreaterThanOrEqual(2);
    }
  });

  it('모든 값이 파싱 가능한 ISO8601 이다', () => {
    for (const [key, iso] of Object.entries(frozen.times)) {
      expect(Number.isNaN(Date.parse(iso as string)), `${key} → ${iso}`).toBe(false);
    }
  });
});
