// 라이브 URL 동결 — **이 테스트가 깨지면 배포된 링크가 끊긴다는 뜻이다.**
//
// `philosophy`·`philosophy-2`…`philosophy-16` 16개 URL 은 이미 배포돼 있고 sitemap 에
// 올라가 있다. `★` 를 슬러그 계산에서 떼어내면서 그 URL 들을 `docs/devlog-legacy-slugs.json`
// 이 붙들게 했다(팀장 판정: "기존 슬러그는 유지하고 표시만 고친다").
//
// 이 파일이 보는 것은 셋이다:
//  ① 16건이 **각각** 동결된 슬러그를 받는가 (한 건이라도 어긋나면 그 URL 이 404 다)
//  ② 목록에 없는 항목이 `philosophy` 접두를 **받지 않는가** — 새 글에 `★` 를 붙여도
//     `philosophy-17` 이 생기지 않아야 한다. 그게 이 재편의 목적이다
//  ③ 항목 수 16 고정 — 이 파일은 **append 금지**다. 늘리려 하면 여기서 먼저 막힌다

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugFor, hash6, LEGACY_SLUGS } from '../scripts/lib/devlog-slug.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function devlogEntries(): Array<{ date: string; title: string }> {
  const src = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8').replace(/\r\n/g, '\n');
  return src.split(/\n(?=## )/)
    .map((b) => b.match(/^## (\d{4}-\d{2}-\d{2}) · (.+)\n/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ date: m[1], title: m[2].trim().replace(/^★+\s*/, '') }));
}

describe('동결 목록', () => {
  it('16건 고정 — append 금지', () => {
    // 새 글이 여기 들어가면 그 순간 이 파일은 "동결 목록" 이 아니라 그냥 슬러그
    // 테이블이 된다. 늘려야 할 이유가 생겼다면 그건 설계를 다시 볼 신호다.
    expect(Object.keys(LEGACY_SLUGS).length).toBe(16);
  });

  it('슬러그가 중복되지 않는다', () => {
    const v = Object.values(LEGACY_SLUGS);
    expect(new Set(v).size).toBe(v.length);
  });

  it('전부 philosophy 접두다', () => {
    for (const s of Object.values(LEGACY_SLUGS)) {
      expect(s).toMatch(/^philosophy(-\d+)?$/);
    }
  });

  it('philosophy 부터 philosophy-16 까지 빠짐없이 있다', () => {
    const want = ['philosophy', ...Array.from({ length: 15 }, (_, i) => `philosophy-${i + 2}`)];
    expect(new Set(Object.values(LEGACY_SLUGS))).toEqual(new Set(want));
  });
});

describe('slugFor — 동결된 16건', () => {
  it('키의 날짜·제목이 실제 DEVLOG 항목과 일치한다', () => {
    // 키가 DEVLOG 와 어긋나면 매핑이 조용히 죽고 그 글은 hash6 슬러그를 받는다.
    // "매핑은 있는데 아무도 안 맞는" 상태가 가장 위험하다 — 테스트는 통과하고
    // 라이브만 404 가 된다.
    const known = new Set(devlogEntries().map((e) => `${e.date} · ${e.title}`));
    const orphan = Object.keys(LEGACY_SLUGS).filter((k) => !known.has(k));
    expect(orphan, `DEVLOG 에 없는 키:\n  ${orphan.join('\n  ')}`).toEqual([]);
  });

  it('각 항목이 동결된 슬러그를 그대로 받는다', () => {
    for (const [key, want] of Object.entries(LEGACY_SLUGS)) {
      const [date, ...rest] = key.split(' · ');
      expect(slugFor(date, rest.join(' · ')), key).toBe(want);
    }
  });

  it('★ 가 붙어 있어도(★·★★) 같은 슬러그가 나온다', () => {
    // DEVLOG 원문에는 ★ 또는 ★★ 가 붙어 있다. 호출부가 ★ 를 떼고 넘기든 안 떼고
    // 넘기든 결과가 같아야 한다 — 안 그러면 호출부마다 다른 URL 이 나온다.
    for (const [key, want] of Object.entries(LEGACY_SLUGS)) {
      const [date, ...rest] = key.split(' · ');
      const title = rest.join(' · ');
      expect(slugFor(date, `★ ${title}`)).toBe(want);
      expect(slugFor(date, `★★ ${title}`)).toBe(want);
    }
  });
});

describe('slugFor — 목록 밖', () => {
  it('★ 를 붙여도 philosophy 접두를 받지 않는다 — 이 재편의 목적', () => {
    expect(slugFor('2026-08-01', '★★ 아주 중요한 새 글')).toBe(`2026-08-01-${hash6('아주 중요한 새 글')}`);
  });

  it('DEVLOG 전량에서 philosophy 접두는 정확히 16건이다', () => {
    const entries = devlogEntries();
    expect(entries.length).toBeGreaterThan(100);   // 파싱이 깨지면 빈 배열로 통과한다
    const phil = entries.filter((e) => /^philosophy(-\d+)?$/.test(slugFor(e.date, e.title)));
    expect(phil.length).toBe(16);
  });

  it('전량 슬러그가 유일하다 — 한 URL 에 두 글이 오지 않는다', () => {
    const all = devlogEntries().map((e) => slugFor(e.date, e.title));
    const dup = all.filter((s, i) => all.indexOf(s) !== i);
    expect(dup, `중복 슬러그: ${[...new Set(dup)].join(', ')}`).toEqual([]);
  });
});

describe('hash6', () => {
  it('같은 제목은 영구 동일 — SEO 안정성', () => {
    expect(hash6('같은 제목')).toBe(hash6('같은 제목'));
  });

  it('6자 16진수', () => {
    expect(hash6('무엇이든')).toMatch(/^[0-9a-f]{6}$/);
  });

  it('구 생성기와 같은 값을 낸다 — 배포된 141개 URL 의 근거', () => {
    // 구 build-devlog.mjs 의 djb2 를 그대로 옮겼는지 확인. 값이 달라지면 pin 16건을
    // 뺀 나머지 125개 URL 이 전부 바뀐다.
    const djb2 = (s: string) => {
      let h = 5381;
      for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
      return h.toString(16).padStart(8, '0').slice(0, 6);
    };
    for (const e of devlogEntries().slice(0, 20)) expect(hash6(e.title)).toBe(djb2(e.title));
  });
});
