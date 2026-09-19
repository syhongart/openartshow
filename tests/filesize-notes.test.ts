// `filesize-baseline.json` 의 **부채 사유 블록(`_notes`)** 이 `--write` 를 건너 살아남는지.
//
// 왜 검사가 필요한가 — 팀장 판정 ②(2026-09-19)가 «부채 항목 옆에 사유를 남겨라» 였고,
// JSON 에는 값 옆에 주석을 못 달아 경로를 키로 하는 블록을 뒀다. 그 블록을 `--write` 가
// 날려버리면 사유가 **첫 재굽기에 조용히 사라진다.** 사라졌다는 것을 알려주는 것은
// 아무것도 없다 — 이 저장소가 「한쪽만 고쳐도 아무도 모른다」고 부르는 그 형태다.
//
// ⚠ 여기서 검사하는 것은 **판정(`keepNotes`)** 이다. 집행(`writeBaseline` 이 그것을
// 실제로 쓰는가)은 파일을 덮어야 재므로 단위테스트가 아니라 **실측**으로 확인했다
// (2026-09-19: 백업 → `--write` → `_notes` 3키 보존 확인 → 원복). 그 한계를 적어 둔다 —
// 못 잰 것을 통과로 적지 않는다.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { keepNotes } from '../scripts/smoke/check-filesize.mjs';

const BASELINE = new URL('../scripts/smoke/filesize-baseline.json', import.meta.url).pathname;

describe('`_notes` — 부채 사유는 재굽기를 건너 살아남는다', () => {
  it('설명 줄과 **아직 부채인 파일**의 사유가 남는다', () => {
    const prev = { _: '설명', 'a.ts': '사유 A', 'b.ts': '사유 B' };
    expect(keepNotes(prev, { 'a.ts': 100 })).toEqual({ _: '설명', 'a.ts': '사유 A' });
  });

  it('부채를 **갚은** 파일의 사유는 버린다 — 화석을 남기지 않는다', () => {
    const prev = { _: '설명', 'a.ts': '사유 A' };
    expect(keepNotes(prev, {})).toEqual({ _: '설명' });
  });

  it('`_notes` 가 아예 없어도 터지지 않는다', () => {
    expect(keepNotes(undefined, { 'a.ts': 1 })).toEqual({});
  });

  it('지금 baseline 의 사유가 **실재하는 부채**만 가리킨다', () => {
    // 이 단언이 이 파일의 실물 축이다 — 위 셋은 함수를 재고, 이것은 **저장소 상태**를 잰다.
    const base = JSON.parse(readFileSync(BASELINE, 'utf8')) as {
      over: Record<string, number>;
      _notes?: Record<string, string>;
    };
    const notes = base._notes ?? {};
    expect(Object.keys(notes).length, '사유 블록이 비었다 — 팀장 조건 ② 가 지켜지지 않았다').toBeGreaterThan(1);
    const orphans = Object.keys(notes).filter((k) => k !== '_' && base.over[k] === undefined);
    expect(orphans, `부채가 아닌 경로의 사유가 남아 있다: ${orphans.join(', ')}`).toEqual([]);
  });
});
