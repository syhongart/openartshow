// 개발일지 카테고리 축 — 분류가 **정말 맞는지** 를 본다.
//
// ── 왜 상한 하나로는 부족한가 ──────────────────────────────────────────────
// 이 게이트를 만들면서 하마터면 속을 뻔했다. 규칙을 넓히자 미분류가 23% → 2.2% 로
// 떨어졌다. 숫자만 보면 성공이다. 그런데 실제 분류를 열어보니:
//
//   사진 → 아야모 + 얼굴형 **파츠**        → 빌더 (범인: `파츠`)
//   캐릭터 몸 **충돌** — 통과 방지          → 빌더 (범인: `충돌`)
//   히어로/**워드마크** 재조판              → 법무 (범인: `워드마크`)
//   **브랜드** 액센트 골드 → 청자 그린      → 법무 (범인: `브랜드`)
//   가로등을 교차로에서 걷어내며(**충돌**)  → 빌더 (범인: `충돌`)
//
// **미분류율은 정확도가 아니다.** 규칙을 넓히면 미분류가 오분류로 옮겨갈 뿐이고,
// 미분류율은 그 이동을 안 보여준다. 상한만 걸면 규칙을 마구 넓혀 통과시킬 수 있고,
// 그때 이 게이트는 장식이 된다.
//
// 그래서 두 축을 함께 건다:
//   ① 골든 표본 — 위 실사고 5건을 포함해 **기대 분류를 못 박는다**(오분류를 잡는다)
//   ② 미분류 상한 — 규칙이 낡아 분류율이 떨어지는 것을 잡는다
//
// ── 하지 않는 것 ───────────────────────────────────────────────────────────
// "카테고리 순서를 바꿔도 분류가 유지되는가" 는 **테스트로 만들지 않았다.** 순서가
// 곧 우선순위이므로 바뀌는 것이 정상이다. 처음엔 그걸 걸려고 했는데, 성립하지 않는
// 불변식을 게이트로 만들 뻔한 것이다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categorize, stripTag, CATEGORIES, FALLBACK, BY_ID } from '../scripts/lib/devlog-category.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** DEVLOG.md 의 모든 항목 제목. 생성기(`build-devlog.mjs:22`)와 같은 정규식을 쓴다. */
function devlogTitles(): string[] {
  const src = readFileSync(join(ROOT, 'docs/DEVLOG.md'), 'utf8').replace(/\r\n/g, '\n');
  return src.split(/\n(?=## )/)
    .map((b) => b.match(/^## (\d{4}-\d{2}-\d{2}) · (.+)\n/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => m[2].trim().replace(/^★+\s*/, ''));
}

describe('골든 표본 — 기대 분류를 못 박는다', () => {
  // 전부 실제 DEVLOG 항목이다. 앞 다섯은 규칙을 넓혔을 때 **실제로 오분류됐던** 것.
  const GOLDEN: Array<[string, string]> = [
    ['사진 → 아야모 + 얼굴형 파츠 (감독 제안)', 'avatar'],
    ['캐릭터 몸 충돌 — 통과 방지 + 회피 조향', 'avatar'],
    ['히어로/워드마크 재조판 — "길다"는 자간, "무겁다"는 weight', 'design'],
    ['브랜드 액센트 골드 → 청자 그린 전환', 'design'],
    ['두 지적이 같은 자리에서 충돌했다 — 가로등을 교차로에서 걷어내며', 'world'],
    // 나머지는 각 카테고리의 대표
    ['우리가 이걸 왜 만드는가 — 창업 이야기와 개발 동기', 'philosophy'],
    ['[법무] 네이밍 최종 실사 — 아야모 🟢 청신호 (전 후보 중 유일)', 'legal'],
    ['보안 종합감사 + 즉시 보완 3건 (감독 지시, 팀장 자율 완결)', 'gate'],
    ['C단계 C-3(3) — scene.js(2,059줄) 6분해 = 비보호 초대형 SOLID 완료', 'arch'],
    ['오픈월드 로딩 프로그레스 바 (감독 지시)', 'perf'],
    ['시장가치 추적기 /valuation/ — 매일 04:00 자동 산출 그래프 (감독 지시)', 'ops'],
  ];

  it.each(GOLDEN)('%s → %s', (title, want) => {
    expect(categorize(title).id).toBe(want);
  });
});

describe('오탐 회귀 — 구 EMOJI_RULES 의 `/독 /`', () => {
  // 구 규칙 `/모바일|햄버거|독 /` 의 `독ˍ` 가 **"감독ˍ"** 를 잡아 24건을 모바일로
  // 오분류하고 있었다. 제목에 `(감독 지시)`·`(감독 승인)` 이 흔하다.
  // 그 규칙이 어떤 형태로든 되살아나면 아래가 깨진다.
  const 감독_붙은_제목: Array<[string, string]> = [
    ['오픈월드 해안+히칭 개선 통합 라이브 배포 (감독 승인)', 'perf'],
    ['정문 포털 — 라이브 미술관 남측 입구에서 오픈월드로 (감독 결재)', 'world'],
    ['아키텍처 안정화 A단계 — 회귀 안전망(테스트·CI·스모크) 도입 (감독 결정)', 'gate'],
  ];

  it.each(감독_붙은_제목)('%s 는 design(모바일) 이 아니다 → %s', (title, want) => {
    expect(categorize(title).id).toBe(want);
  });

  it('"감독" 만 든 제목은 design 으로 가지 않는다', () => {
    // 주제어가 없으므로 misc 가 정답이다 — 억지로 어딘가에 넣는 것이 오히려 틀리다.
    expect(categorize('감독 지시로 무언가를 했다').id).not.toBe('design');
  });
});

describe('명시 태그가 자동 규칙을 이긴다', () => {
  it('[gate] 는 성능 키워드를 눌러 이긴다', () => {
    expect(categorize('성능 프레임 개선').id).toBe('perf');        // 태그 없으면 perf
    expect(categorize('[gate] 성능 프레임 개선').id).toBe('gate'); // 태그가 이긴다
  });

  it('알 수 없는 태그는 무시하고 자동 규칙으로 간다', () => {
    expect(categorize('[nope] 성능 프레임 개선').id).toBe('perf');
  });

  it('`[법무]` 는 태그가 아니라 제목의 일부다 — 표시에서 지워지지 않는다', () => {
    // id 목록에 `법무` 가 없으므로 태그로 치지 않는다. 기존 항목 3건이 이 형태다.
    const t = '[법무] 네이밍 최종 실사 — 아야모 🟢 청신호';
    expect(stripTag(t)).toBe(t);
    expect(categorize(t).id).toBe('legal');   // 자동 규칙(`\[법무`)이 잡는다
  });

  it('알려진 태그는 표시용 제목에서 떨어진다', () => {
    expect(stripTag('[gate] 성능 프레임 개선')).toBe('성능 프레임 개선');
  });
});

describe('DEVLOG 전량 — 미분류 상한', () => {
  // 상한은 규칙이 **낡는 것**을 잡는다. 현재 5.0%(7/139) 이고 상한은 12%.
  // 여유가 큰 이유: 서술형 제목("CSV 한 장이 열 번의 실패를 설명했다")은 제목만으로
  // 원리상 분류가 안 되고, 최근 글일수록 그런 제목이 많다. 그것까지 잡겠다고 규칙을
  // 넓히면 위 골든 표본이 깨진다 — 그게 이 두 축을 함께 두는 이유다.
  //
  // **상한을 올려서 통과시키지 마라.** 올리기 전에 골든 표본을 먼저 늘려라.
  const MAX_MISC_RATIO = 0.12;

  it(`미분류 비율이 ${MAX_MISC_RATIO * 100}% 를 넘지 않는다`, () => {
    const titles = devlogTitles();
    expect(titles.length).toBeGreaterThan(100);   // 파싱이 깨지면 빈 배열로 통과한다
    const misc = titles.filter((t) => categorize(t).id === 'misc');
    const ratio = misc.length / titles.length;
    expect(ratio, `미분류 ${misc.length}/${titles.length}\n  ${misc.slice(0, 10).join('\n  ')}`)
      .toBeLessThanOrEqual(MAX_MISC_RATIO);
  });

  it('모든 항목이 유효한 카테고리를 받는다', () => {
    const ids = new Set([...CATEGORIES.map((c) => c.id), FALLBACK.id]);
    for (const t of devlogTitles()) expect(ids.has(categorize(t).id)).toBe(true);
  });

  it('한 카테고리가 절반을 넘지 않는다 — 규칙이 뭉개지면 발화한다', () => {
    const titles = devlogTitles();
    const count = new Map<string, number>();
    for (const t of titles) {
      const id = categorize(t).id;
      count.set(id, (count.get(id) ?? 0) + 1);
    }
    const [topId, topN] = [...count].sort((a, b) => b[1] - a[1])[0];
    expect(topN / titles.length, `최대 ${topId} ${topN}/${titles.length}`).toBeLessThan(0.5);
  });
});

describe('구조', () => {
  it('id 가 중복되지 않는다', () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(FALLBACK.id);
  });

  it('BY_ID 가 fallback 을 포함한 전량을 담는다', () => {
    expect(BY_ID.size).toBe(CATEGORIES.length + 1);
    expect(BY_ID.get('misc')).toBe(FALLBACK);
  });

  it('모든 카테고리에 이모지와 라벨이 있다 — 표시에서 빈칸이 나지 않게', () => {
    for (const c of [...CATEGORIES, FALLBACK]) {
      expect(c.emoji.length).toBeGreaterThan(0);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });
});
