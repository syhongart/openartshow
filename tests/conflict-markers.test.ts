/**
 * 🔴 `check:conflict-markers` 의 **검출력**을 본다.
 *
 * 이 저장소의 규율: *"테스트 통과는 검출력의 증거가 아니다."* 마커 검사는 특히 그렇다 —
 * 정규식 한 글자가 깨져도 「0건」이라는 **같은 출력**을 내고, 그것이 곧 통과다. 그래서
 * 네 마커를 **각각 두 형태 이상**으로 넣어 보고, 걸리면 안 되는 형태도 함께 본다.
 *
 * ⚠ 실제로 첫 판본이 반대쪽으로 틀렸다 — `|` 를 이스케이프하지 않아 `|||||||` 가
 * alternation 이 됐고 추적 파일 **460,035줄**이 걸렸다. 그 방향의 고장은 시끄러워서
 * 즉시 드러나지만, 조용히 0 을 내는 고장은 이 검사가 없으면 아무도 모른다.
 */
import { describe, it, expect } from 'vitest';
import { findConflictMarkers } from '../scripts/smoke/check-conflict-markers.mjs';

const lt = '<'.repeat(7);
const eq = '='.repeat(7);
const bar = '|'.repeat(7);
const gt = '>'.repeat(7);

/** 검사가 내는 한 줄. `.mjs` 라 타입이 없으므로 여기서 계약을 적어 둔다 */
type Hit = { file: string; line: number; kind: string; text: string };

/** 파일 하나짜리 가짜 저장소 */
const scan = (text: string): Hit[] => findConflictMarkers(['f.md'], () => text) as Hit[];

describe('🔴 네 마커를 **각각** 잡는다 — 짝이 맞는지는 보지 않는다', () => {
  const cases: Array<[string, string[]]> = [
    ['시작', [`${lt} HEAD`, `${lt} ours/branch-name`]],
    ['가운데', [eq, `a\n${eq}\nb`]],
    ['base(diff3)', [`${bar} base`, `${bar} merged common ancestors`]],
    ['끝', [`${gt} origin/main`, `${gt} theirs`]],
  ];
  for (const [kind, samples] of cases) {
    for (const s of samples) {
      it(`${kind}: ${JSON.stringify(s.slice(0, 24))}`, () => {
        const hits = scan(s);
        expect(hits.length, '마커를 못 잡았다').toBeGreaterThan(0);
        expect(hits.some((h) => h.kind === kind), `다른 종류로 잡혔다: ${hits.map((h) => h.kind)}`)
          .toBe(true);
      });
    }
  }

  it('🔴 **반쪽만 남아도** 잡는다 — 페어링을 전제하지 않는다(검수관 판정)', () => {
    // 한쪽만 남은 파일은 그 자체로 고장난 파일이다. 짝을 찾는 로직을 넣으면
    // 오히려 놓치는 경로가 생긴다.
    expect(scan(`본문\n${eq}\n본문`).length).toBe(1);
    expect(scan(`본문\n${gt} x\n본문`).length).toBe(1);
  });

  it('줄 번호가 맞다 — 틀리면 고치는 사람이 엉뚱한 줄을 본다', () => {
    const hits = scan(`a\nb\n${lt} HEAD\nc`);
    expect(hits[0].line).toBe(3);
  });
});

describe('🔴 걸리면 안 되는 것 — 오탐이 나면 게이트가 작업을 세운다', () => {
  it('7자를 넘는 구분선은 마커가 아니다', () => {
    // `docs/mockups/openartshow-screens.html` 의 실제 형태다(2026-09-22 실측 8건).
    expect(scan(`${'='.repeat(69)} -->`)).toEqual([]);
    expect(scan('='.repeat(8))).toEqual([]);
  });

  it('줄 가운데의 마커 문자열은 잡지 않는다 — 인용·설명문이 걸리면 문서를 못 쓴다', () => {
    expect(scan(`이 줄은 ${lt} 를 설명한다`)).toEqual([]);
    expect(scan(`표 | 셀 ${bar} 값`)).toEqual([]);
  });

  it('마크다운 표·제목·수평선은 통과한다', () => {
    expect(scan('| 축 | 값 |\n|---|---|\n| a | 1 |\n\n---\n\n## 제목')).toEqual([]);
  });

  it('바이너리(NUL 포함)는 건너뛴다 — `git grep` 과 같은 기준이다', () => {
    expect(scan(`\0${lt} HEAD`)).toEqual([]);
  });

  it('읽기가 실패해도 검사가 죽지 않는다 — 한 파일 때문에 전체가 멈추면 안 된다', () => {
    const hits = findConflictMarkers(['gone.bin'], () => { throw new Error('ENOENT'); }) as Hit[];
    expect(hits).toEqual([]);
  });
});
