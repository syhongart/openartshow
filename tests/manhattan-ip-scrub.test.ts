// 맨해튼 180m 자산의 **IP 세탁 규칙** — 규칙 테이블의 검출력 게이트.
//
// ── 무엇을 세탁하나 ─────────────────────────────────────────────────────────
// 팀장 판정 2026-09-16(결정 3): **FONT 전량 제거**. 법무가 1차 등록부 원문을 한 건도
// 확인하지 못했고(egress 차단), 「이 문자열은 실존 상호가 아니다」를 판정 근거로 쓸 수
// 없으므로 텍스트 축 전량을 fail-closed 로 닫는다. 개별 치환은 그 판정으로 폐기됐다 —
// 그래서 `rewriteTexts` 가 빈 것은 **누락이 아니라 판정**이고, 그 사실은 규칙 JSON 이
// 적는다(여기에 다시 적지 않는다).
//
// ── 왜 규칙 테이블을 테스트하나 ─────────────────────────────────────────────
// 집행기(`scripts/asset/manhattan/ip_scrub.py`)는 bpy 를 받아 도는데 **bpy 휠이 374MB 라
// CI 에 없다.** 그래서 CI 에서 잴 수 있는 것은 「규칙이 서로 모순되지 않는가」이고,
// 「blend 에서 실제로 지워졌는가」는 자산을 굽는 사람이 실측한다(`scrub()` 이 카운트
// 불일치·잔여에서 예외로 죽는다 — fail-closed).
// **재는 것과 재지 않는 것을 갈라 적는다** — 못 잰 것을 통과로 적지 않기 위해서다.
//
//   재는 것 : 위험 문자열 커버 · 세탁 전 히트 실측 대조 · 재오염 · 기대 카운트 ↔ 실측 ·
//             겹침 회계 · 접두 매칭 · PENDING 위생 · 값 미러링
//   못 재는 것 : 실제 blend 에서의 집행(bpy 필요) · 이미지 픽셀 속 글자 · 지오메트리 글자꼴
//
// ── 값은 어디에 있나 ────────────────────────────────────────────────────────
// `scripts/asset/manhattan/ip-scrub-rules.json` **한 곳**이다. `.py` 도 이 파일도 그것을
// 읽는다 — 어느 쪽에도 값을 복사하지 않는다. 그 「복사하지 않음」 자체를 검사로 만든 것이
// 아래 «값 미러링» 절이다(산문 주장으로 두면 다음 사람이 확인을 생략한다).
//
// ── 이 설계의 핵 — 규칙과 검사는 독립이다 ───────────────────────────────────
// `riskStrings` 는 규칙에서 파생되지 않는다. 오브젝트째 삭제되는 대상도 거기 남아 있고,
// 그래서 **제거가 실패하면 `scanAfter` 가 잡는다.** 검사를 규칙에서 뽑으면 규칙이 틀린
// 순간 검사도 같이 틀린다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const RULES_PATH = join(ROOT, 'scripts/asset/manhattan/ip-scrub-rules.json');
const PY_PATH = join(ROOT, 'scripts/asset/manhattan/ip_scrub.py');
const EXTRACT_PATH = join(ROOT, 'scripts/asset/manhattan/extract.py');

type TypeRule = { type: string; expectObjects: number; expectUniqueBodies?: number; why: string };
type RemoveRule = {
  prefix: string;
  expectObjects: number;
  expectRemovedEarlierByType: number;
  expectTexts: { body: string; count: number }[];
  why: string;
};
type RewriteRule = { from: string; to: string; expect: number; why: string };
type RiskString = {
  needle: string;
  caseSensitive: boolean;
  scopes: string[];
  allow: string[];
  expectedHitsBefore: Record<string, number>;
  whyZeroBefore?: string;
  why: string;
};
type Pending = { id?: string; status?: string; targets?: string[]; to?: string | null; why?: string };
type MatchCase = { name: string; prefix: string; expect: boolean; why?: string };

type Rules = {
  version: number;
  scan: { whitespace: string };
  measured: {
    fontObjectsTotal: number;
    fontBodiesUnique: number;
    taxiHitObjects: number;
    fontOverlapWithRemoveRules: number;
    textBodyCounts: Record<string, number>;
  };
  removeByType: TypeRule[];
  removeObjects: RemoveRule[];
  rewriteTexts: RewriteRule[];
  riskStrings: RiskString[];
  pending: Pending[];
  prefixMatchCases: MatchCase[];
};

const RULES: Rules = JSON.parse(readFileSync(RULES_PATH, 'utf8'));
const PY_SRC = readFileSync(PY_PATH, 'utf8');

/** `ip_scrub.matches_prefix` 와 **같은 계약**. 케이스표(JSON)가 양쪽을 같은 잣대로 잰다. */
function matchesPrefix(name: string, prefix: string): boolean {
  if (name === prefix) return true;
  if (!name.startsWith(prefix)) return false;
  return /^\.\d{3,}$/.test(name.slice(prefix.length));
}

/** `ip_scrub.fold` 와 같은 계약 — 공백류를 지우고, 대소문자 옵션을 적용한다. */
function fold(value: string, caseSensitive: boolean): string {
  const out = RULES.scan.whitespace === 'strip' ? value.replace(/\s+/g, '') : value;
  return caseSensitive ? out : out.toLowerCase();
}

function hits(risk: Pick<RiskString, 'needle' | 'caseSensitive'>, hay: string): boolean {
  return fold(hay, risk.caseSensitive).includes(fold(risk.needle, risk.caseSensitive));
}

const FONT_RULE = RULES.removeByType.find((r) => r.type === 'FONT');

describe('맨해튼 IP 세탁 — 텍스트 축은 FONT 전량 제거 한 행이다 (팀장 조건 L5)', () => {
  it('FONT 전량 제거 규칙이 존재하고 실측 총수와 일치한다', () => {
    // 이 규칙을 빼면 아래 「커버」 축과 함께 빨간불이 된다 — L5 가 지정한 축이다.
    expect(FONT_RULE, 'removeByType 에 FONT 규칙이 없다').toBeDefined();
    expect(FONT_RULE!.expectObjects).toBe(RULES.measured.fontObjectsTotal);
  });

  it('FONT 규칙의 고유 문자열 종수가 실측 본문 종수와 일치한다', () => {
    expect(FONT_RULE!.expectUniqueBodies).toBe(Object.keys(RULES.measured.textBodyCounts).length);
    expect(FONT_RULE!.expectUniqueBodies).toBe(RULES.measured.fontBodiesUnique);
  });

  it('집행기가 「그 타입 잔여 0」을 요구한다 (제거가 반쯤 되고 통과하는 경로를 막는다)', () => {
    // 산문으로 「지운다」라고만 적으면 부분 제거가 통과한다. 집행기의 post-condition 을
    // 여기서 지목해 둔다 — 문구가 사라지면 이 단언이 빨간불이 된다.
    expect(PY_SRC).toContain('타입 제거 후에도');
    expect(PY_SRC).toMatch(/left\s*=\s*sum\(1 for ob in data\.objects/);
  });
});

describe('맨해튼 IP 세탁 — 위험 문자열 커버', () => {
  it('히트가 있는 모든 (위험 문자열 × scope) 가 어떤 규칙엔가 덮인다', () => {
    // 덮이지 않은 축이 있으면 `scanAfter` 가 0 이 될 수 없어 `scrub()` 이 매번 예외로
    // 죽는다 — 자산을 아예 못 굽는다. 그것을 여기서 먼저 잡는다.
    // 히트가 0 인 축은 덮을 것이 없으므로 요구하지 않는다(실측 기준).
    const uncovered: string[] = [];
    for (const risk of RULES.riskStrings) {
      for (const scope of risk.scopes) {
        if ((risk.expectedHitsBefore[scope] ?? 0) === 0) continue;
        const covered =
          scope === 'text'
            ? FONT_RULE !== undefined ||
              RULES.rewriteTexts.some((r) => hits(risk, r.from)) ||
              RULES.removeObjects.some((r) => r.expectTexts.some((t) => hits(risk, t.body)))
            : RULES.removeObjects.some((r) => hits(risk, r.prefix));
        if (!covered) uncovered.push(`${risk.needle}:${scope}`);
      }
    }
    expect(uncovered).toEqual([]);
  });

  it('모든 위험 문자열이 scope 와 근거를 선언한다', () => {
    expect(RULES.riskStrings.length).toBeGreaterThan(0);
    for (const risk of RULES.riskStrings) {
      expect(risk.scopes.length, `${risk.needle} 의 scopes`).toBeGreaterThan(0);
      expect(risk.why, `${risk.needle} 의 근거`).toBeTruthy();
      for (const scope of risk.scopes) {
        expect(risk.expectedHitsBefore[scope], `${risk.needle}:${scope} 의 세탁 전 실측`).toBeDefined();
      }
    }
  });

  it('세탁 전 히트가 0 인 위험 문자열은 왜 0 인지를 적는다 (장식과 구별)', () => {
    // 히트 0 은 「검출력 0」일 수도 있고 「우리가 만들 뻔한 위험을 미리 막는 축」일 수도
    // 있다. 근거를 강제하지 않으면 전자가 후자인 척 남는다.
    for (const risk of RULES.riskStrings) {
      const total = Object.values(risk.expectedHitsBefore).reduce((a, b) => a + b, 0);
      if (total === 0) expect(risk.whyZeroBefore, `${risk.needle}`).toBeTruthy();
    }
  });
});

describe('맨해튼 IP 세탁 — 세탁 전 히트 ↔ 본문 실측 대조', () => {
  it('각 위험 문자열의 text 축 기대 히트가 본문별 실측에서 재계산한 값과 일치한다', () => {
    // **규칙을 안 보고 계산한다.** 위험 사전이 빗나가면(공백 벌린 문자열을 붙여 적는 등)
    // 여기서 어긋나고, 그러면 제거가 실패해도 0 을 돌려주는 「장식」이 됐다는 뜻이다.
    for (const risk of RULES.riskStrings) {
      if (!risk.scopes.includes('text')) continue;
      const recomputed = Object.entries(RULES.measured.textBodyCounts).reduce(
        (n, [body, count]) => n + (hits(risk, body) ? count : 0),
        0,
      );
      expect(recomputed, `${risk.needle} 의 text 히트`).toBe(risk.expectedHitsBefore.text);
    }
  });

  it('실측 본문 카운트 합계가 FONT 오브젝트 총수와 일치한다 (실측표 자체의 무결성)', () => {
    const sum = Object.values(RULES.measured.textBodyCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(RULES.measured.fontObjectsTotal);
  });
});

describe('맨해튼 IP 세탁 — 재오염 금지', () => {
  it('치환 대체안이 어떤 위험 문자열에도 다시 걸리지 않는다', () => {
    // 지금 치환 규칙은 0 건이다(팀장 판정). 축은 남긴다 — FONT 를 살리는 판정이 오면
    // 대체안이 다시 들어오고, 그때 이 검사가 첫 방어선이다. 실제로 폐기된 대체안 하나가
    // 실존 상호와 충돌했고, 그 이름은 지금 위험 사전 쪽에 들어가 있다.
    const reinfected: { to: string; needle: string }[] = [];
    for (const rule of RULES.rewriteTexts) {
      for (const risk of RULES.riskStrings) {
        if (hits(risk, rule.to)) reinfected.push({ to: rule.to, needle: risk.needle });
      }
    }
    expect(reinfected).toEqual([]);
  });

  it('치환 대체안이 원문과 다르다 (무동작 치환 금지)', () => {
    for (const rule of RULES.rewriteTexts) expect(rule.to).not.toBe(rule.from);
  });
});

describe('맨해튼 IP 세탁 — 기대 카운트 ↔ 실측 대조', () => {
  it('접두 제거 규칙의 기대 오브젝트 합계가 실측(taxiHitObjects)과 일치한다', () => {
    const sum = RULES.removeObjects.reduce((n, r) => n + r.expectObjects, 0);
    expect(sum).toBe(RULES.measured.taxiHitObjects);
  });

  it('FONT 규칙과 겹치는 수의 합계가 실측 겹침과 일치한다 (겹침을 조용히 흡수하지 않는다)', () => {
    const sum = RULES.removeObjects.reduce((n, r) => n + r.expectRemovedEarlierByType, 0);
    expect(sum).toBe(RULES.measured.fontOverlapWithRemoveRules);
  });

  it('겹치는 규칙은 품은 텍스트가 실측과 일치하고, 겹침은 총수를 넘지 않는다', () => {
    for (const rule of RULES.removeObjects) {
      expect(rule.expectRemovedEarlierByType, rule.prefix).toBeLessThanOrEqual(rule.expectObjects);
      expect(rule.expectRemovedEarlierByType, rule.prefix).toBeGreaterThanOrEqual(0);
      for (const t of rule.expectTexts) {
        expect(t.count, `제거 ${rule.prefix} 의 ${t.body}`).toBe(RULES.measured.textBodyCounts[t.body]);
      }
      // 텍스트를 품은 대상은 FONT 이므로 전량 규칙이 먼저 지운다 — 겹침이 0 일 수 없다.
      const texts = rule.expectTexts.reduce((n, t) => n + t.count, 0);
      if (FONT_RULE && texts > 0) expect(rule.expectRemovedEarlierByType, rule.prefix).toBe(texts);
    }
  });

  it('각 치환 규칙의 기대 카운트가 본문별 실측과 일치한다', () => {
    for (const rule of RULES.rewriteTexts) {
      expect(RULES.measured.textBodyCounts[rule.from], `실측에 없는 본문: ${rule.from}`).toBeDefined();
      expect(rule.expect, `치환 ${rule.from}`).toBe(RULES.measured.textBodyCounts[rule.from]);
    }
  });

  it('모든 규칙에 근거가 붙어 있다', () => {
    for (const r of RULES.removeByType) expect(r.why, r.type).toBeTruthy();
    for (const r of RULES.removeObjects) expect(r.why, r.prefix).toBeTruthy();
    for (const r of RULES.rewriteTexts) expect(r.why, r.from).toBeTruthy();
  });
});

describe('맨해튼 IP 세탁 — 접두 매칭 (블렌더 `.001` 흡수)', () => {
  it('케이스표가 참·거짓 양쪽을 담는다 (한쪽만이면 검출력이 반쪽이다)', () => {
    expect(RULES.prefixMatchCases.filter((c) => c.expect).length).toBeGreaterThanOrEqual(2);
    expect(RULES.prefixMatchCases.filter((c) => !c.expect).length).toBeGreaterThanOrEqual(2);
  });

  it.each(RULES.prefixMatchCases.map((c) => [c.name, c.prefix, c.expect] as const))(
    'matchesPrefix(%s, %s) === %s',
    (name, prefix, want) => {
      expect(matchesPrefix(name, prefix)).toBe(want);
    },
  );

  it('startswith 로 퇴화하지 않는다 — 접두를 품은 남의 이름은 살아남는다', () => {
    // 삭제는 되돌릴 수 없으므로 과잉 매칭이 과소 매칭보다 나쁘다.
    for (const rule of RULES.removeObjects) {
      expect(matchesPrefix(`${rule.prefix}_backup`, rule.prefix)).toBe(false);
      expect(matchesPrefix(`${rule.prefix}.001`, rule.prefix)).toBe(true);
      expect(matchesPrefix(rule.prefix, rule.prefix)).toBe(true);
    }
  });
});

describe('맨해튼 IP 세탁 — PENDING 위생 (법무 판정을 기다리는 자리)', () => {
  // ⚠ **옛 단언 하나가 여기서 사라졌다** — 「PENDING 자리가 **남아 있다**(length > 0)」였다.
  // 약화가 아니라 **전제 소멸**이다: 그 단언은 「법무가 네 자리를 실사 중」이라는 상태 위에
  // 서 있었고, 팀장 판정(FONT 전량 제거)이 그 넷을 통째로 흡수해 기다릴 대상이 0 이 됐다.
  // 지금 빈 배열은 「아직 안 채웠다」가 아니라 「채울 것이 없다」다.
  // 아래 위생 축은 그대로 둔다 — FONT 를 살리는 판정이 오면 자리가 돌아오고, 그때 이
  // 검사가 「`to` 만 채우고 규칙으로 안 옮기는」 조용한 실패를 막는다.
  const pending = RULES.pending.filter((p): p is Pending & { id: string } => typeof p.id === 'string');

  it('대체안이 채워진 PENDING 은 남아 있을 수 없다 — 규칙으로 옮겨야 집행된다', () => {
    // 여기서 `to` 만 채우면 **아무것도 집행되지 않는다.** 그 조용한 실패를 막는 축이다.
    expect(pending.filter((p) => p.to !== null && p.to !== undefined).map((p) => p.id)).toEqual([]);
    for (const p of pending) {
      expect(p.status, p.id).toBe('pending');
      expect(p.targets?.length, `${p.id} 의 대상`).toBeGreaterThan(0);
      expect(p.why, `${p.id} 의 근거`).toBeTruthy();
    }
  });

  it('PENDING 대상이 실측 본문에 실재하고, 아직 위험 사전에 들어 있지 않다', () => {
    // 규칙 없이 위험 문자열만 추가하면 `scanAfter` 가 0 이 될 수 없어 자산을 못 굽는다.
    for (const p of pending) {
      for (const target of p.targets ?? []) {
        expect(RULES.measured.textBodyCounts[target], `${p.id}: ${JSON.stringify(target)}`).toBeDefined();
        expect(
          RULES.riskStrings.some((r) => hits(r, target)) && FONT_RULE === undefined,
          `${p.id}: ${target} 가 규칙 없이 위험 사전에만 있다`,
        ).toBe(false);
      }
    }
  });
});

describe('맨해튼 IP 세탁 — 값 미러링 금지', () => {
  it('ip_scrub.py 는 규칙 JSON 을 읽는다 (규칙을 품지 않는다)', () => {
    expect(PY_SRC).toContain('ip-scrub-rules.json');
  });

  it('규칙 값이 .py 소스에 복사돼 있지 않다', () => {
    // 한쪽만 고쳐도 아무도 모르는 그 형태를 **검사로** 막는다. 짧은 값(<3자)은
    // 우연 일치가 나므로 제외한다 — 지금 규칙에는 그런 값이 없다.
    const values = [
      ...RULES.removeByType.map((r) => r.type),
      ...RULES.removeObjects.flatMap((r) => [r.prefix, ...r.expectTexts.map((t) => t.body)]),
      ...RULES.rewriteTexts.flatMap((r) => [r.from, r.to]),
      ...RULES.riskStrings.flatMap((r) => [r.needle, ...r.allow]),
    ].filter((v) => v.length >= 3 && v !== 'FONT'); // FONT 는 bpy 의 타입 이름이라 코드에 필연적으로 나온다

    expect(values.length).toBeGreaterThan(0);
    expect(values.filter((v) => PY_SRC.includes(v))).toEqual([]);
  });

  it('extract.py 도 규칙 값을 품지 않고, 건너뛴 사실을 리포트에 남긴다', () => {
    const src = readFileSync(EXTRACT_PATH, 'utf8');
    const values = [
      ...RULES.removeObjects.map((r) => r.prefix),
      ...RULES.rewriteTexts.flatMap((r) => [r.from, r.to]),
      ...RULES.riskStrings.map((r) => r.needle),
    ].filter((v) => v.length >= 3);
    expect(values.filter((v) => src.includes(v))).toEqual([]);
    // 조용히 빠지는 경로를 만들지 않는다 — 껐으면 리포트에 남는다.
    expect(src).toContain('ipScrubSkipped');
  });
});
