// tests/devlog-entries.test.ts
// 개발일지 항목 파싱 SSOT 검증.
//
// ── 왜 이 파일이 이제야 생기나 ───────────────────────────────────────────────
// `devlog-entries.mjs` 는 SSOT 로 신설됐지만 **테스트가 0이었다**. 그동안 같은 제목
// 정규식이 4곳에 흩어져 있었고 이미 어긋나 있었다(★ 제거가 `★+` vs `★` 두 갈래).
//
// 제목 줄에 **시각을 옵션으로 허용**하면서 이 파일이 필수가 됐다. 시각을 모르는 파서는
// `## 2026-07-30 08:15 · 제목` 을 매치 실패로 처리해 **항목을 조용히 버린다** — 개발
// 일지에서 사라지고, 건수에서 빠지고, 기여 집계에도 안 잡히고, 아무 게이트도 알려주지
// 않는다. 그 실패 모드를 여기서 막는다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEntries, countEntries, stripStars, entryKey, ENTRY_RE } from '../scripts/lib/devlog-entries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('parseEntries — 제목 줄 파싱', () => {
  it('시각 없는 기존 형식을 읽는다', () => {
    const [e] = parseEntries('## 2026-07-29 · 제목입니다\n본문 줄\n');
    expect(e.date).toBe('2026-07-29');
    expect(e.time).toBeNull();
    expect(e.title).toBe('제목입니다');
  });

  it('시각 있는 신규 형식을 읽는다', () => {
    const [e] = parseEntries('## 2026-07-30 08:15 · 제목입니다\n본문 줄\n');
    expect(e.date).toBe('2026-07-30');
    expect(e.time).toBe('08:15');
    expect(e.title).toBe('제목입니다');
  });

  it('시각이 붙은 항목을 **버리지 않는다** — 이 게이트의 핵', () => {
    // 시각을 모르는 파서는 매치 실패로 항목을 잃는다. 두 형식이 섞여도 전부 잡혀야 한다.
    const md = [
      '## 2026-07-30 08:15 · 시각 있음',
      '본문',
      '',
      '## 2026-07-29 · 시각 없음',
      '본문',
      '',
      '## 2026-07-28 23:59 · 시각 있음 2',
      '본문',
      '',
    ].join('\n');
    const entries = parseEntries(md);
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.time)).toEqual(['08:15', null, '23:59']);
    expect(countEntries(md)).toBe(3);
  });

  it('제목에 " · " 가 또 있어도 첫 구분자로 자른다', () => {
    const [e] = parseEntries('## 2026-07-29 · 앞 · 뒤\n본문\n');
    expect(e.title).toBe('앞 · 뒤');
  });

  it('제목 줄이 아닌 블록은 버린다', () => {
    expect(parseEntries('# 문서 제목\n서문\n')).toHaveLength(0);
    expect(parseEntries('## 형식이 틀린 제목\n본문\n')).toHaveLength(0);
  });

  it('CRLF 를 정규화한다', () => {
    // 예전에는 `build-devlog.mjs` 만 정규화했고 나머지 세 파서는 안 했다 —
    // Windows 워킹트리에서 그 셋만 파싱이 깨지는 비대칭이었다.
    const entries = parseEntries('## 2026-07-29 · 제목\r\n본문\r\n');
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('제목');
  });

  it('content 는 제목 줄을 제외하고 body 는 포함한다', () => {
    const [e] = parseEntries('## 2026-07-29 · 제목\n본문 줄\n');
    expect(e.content).toContain('본문 줄');
    expect(e.content).not.toContain('## 2026-07-29');
    // body 는 제목을 포함해야 한다 — 역할 패턴 매칭이 제목까지 봐야 하기 때문이다.
    expect(e.body).toContain('## 2026-07-29');
  });
});

describe('stripStars — ★ 전량 제거', () => {
  it('★ 하나를 뗀다', () => {
    expect(stripStars('★ 제목')).toBe('제목');
  });

  it('★★ 를 **전량** 뗀다 — 하나만 떼면 렌더링에 노출된다', () => {
    // `/^★\s*/`(수량자 없음)로는 ★ 하나가 남았고, 실제로 그 상태로 배포됐다.
    expect(stripStars('★★ 제목')).toBe('제목');
    expect(stripStars('★★★제목')).toBe('제목');
  });

  it('★ 가 없으면 그대로', () => {
    expect(stripStars('제목')).toBe('제목');
  });

  it('중간의 ★ 는 건드리지 않는다', () => {
    expect(stripStars('제목 ★ 강조')).toBe('제목 ★ 강조');
  });

  it('rawTitle 은 ★ 를 보존한다 — 카테고리 판정이 ★ 를 봐야 한다', () => {
    const [e] = parseEntries('## 2026-07-29 · ★★ 제목\n본문\n');
    expect(e.rawTitle).toBe('★★ 제목');
    expect(e.title).toBe('제목');
  });
});

describe('entryKey — 동결 데이터 조회 키', () => {
  it('`날짜 · 제목` 형식이다', () => {
    expect(entryKey('2026-07-29', '제목')).toBe('2026-07-29 · 제목');
  });

  it('★ 유무가 키를 갈라놓지 않는다', () => {
    // 키가 갈리면 ★ 를 붙이거나 떼는 순간 동결 시각을 잃는다.
    expect(entryKey('2026-07-29', '★★ 제목')).toBe(entryKey('2026-07-29', '제목'));
  });

  it('시각이 키에 들어가지 않는다', () => {
    // 나중에 제목 줄에 시각을 추가해도 기존 동결 키를 계속 찾을 수 있어야 한다.
    const [withTime] = parseEntries('## 2026-07-29 08:15 · 제목\n본문\n');
    const [without] = parseEntries('## 2026-07-29 · 제목\n본문\n');
    expect(withTime.key).toBe(without.key);
  });

  it('`devlog-legacy-slugs.json` 과 같은 키 형식을 쓴다', () => {
    // 두 동결 파일이 다른 키 형식을 쓰면 한쪽을 고칠 때 다른 쪽이 조용히 낡는다.
    const slugs = JSON.parse(readFileSync(join(ROOT, 'docs/devlog-legacy-slugs.json'), 'utf8')).slugs;
    const sample = Object.keys(slugs)[0];
    expect(sample, 'devlog-legacy-slugs.json 이 비어 있다').toBeTruthy();
    // `YYYY-MM-DD · 제목` 모양인지 — entryKey 가 만드는 것과 같은 형태다.
    expect(sample).toMatch(/^\d{4}-\d{2}-\d{2} · .+/);
  });
});

describe('실제 DEVLOG.md', () => {
  const md = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8');
  const entries = parseEntries(md);

  it('항목이 100건 이상 파싱된다', () => {
    expect(entries.length).toBeGreaterThan(100);
  });

  it('모든 항목에 날짜가 있다 — 날짜는 절대 null 이 아니다', () => {
    // `joined`/`lastSeen` 이 이 값에서 오고, payroll 산정이 그것에 의존한다.
    // 하나라도 null 이면 산정이 무너진다(1차 판본이 정확히 그렇게 무너졌다).
    for (const e of entries) {
      expect(e.date, `제목: ${e.title}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('제목이 빈 항목이 없다', () => {
    for (const e of entries) expect(e.title.length).toBeGreaterThan(0);
  });

  it('★ 가 남은 제목이 없다', () => {
    for (const e of entries) expect(e.title.startsWith('★')).toBe(false);
  });

  it('키가 중복되지 않는다 — 중복이면 동결 시각이 서로를 덮어쓴다', () => {
    const keys = entries.map((e) => e.key);
    const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(dup, `중복 키: ${dup.join(' / ')}`).toHaveLength(0);
  });
});

describe('ENTRY_RE — 정규식이 SSOT 로 노출된다', () => {
  it('export 돼 있다 — 소비자가 자기 정규식을 만들지 않게', () => {
    expect(ENTRY_RE).toBeInstanceOf(RegExp);
  });
});
