// @vitest-environment node
//
// 요금제 **층위** — 무료 / 프리미엄 / 특별 프리미엄.
//
// ── 왜 층위가 됐나 (2026-08-16, W8-3 S1) ───────────────────────────────────
// 감독 지시: *"특별 프리미엄 사용자는 자기만의 지엘비 건물을 올려서 사용할수있게할꺼야."*
// 그전에는 `premium: boolean` **둘뿐**이라 셋째 등급을 담을 자리가 없었다.
//
// ── 이 파일이 지키는 명제 셋 ───────────────────────────────────────────────
// ① **기존 프리미엄이 강등되지 않는다** — 저장 값 `'premium'` 은 그대로 읽힌다
// ② **`premium` 이름의 함정** — `=== 'premium'` 으로 두면 특별 프리미엄 사용자가
//    프리미엄 기능을 **잃는다.** 층위를 넓히는 순간 그 형태가 전부 그렇다
// ③ **fail-closed** — 모르는 값·저장 접근 불가는 **무료**로 떨어진다. 권한을 열어 주는
//    쪽으로 실패하면 안 된다
//
// ⚠ **보안 축은 여기서 재지 않는다.** 서버가 없으므로 `localStorage` 직접 조작으로 어떤
// 층위든 켤 수 있다 — 활성화 코드는 편의 장치다(그 판단은 `studio-plan.ts` 헤더 한 곳).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PLAN_KEY, TIER_FREE, TIER_PREMIUM, TIER_PREMIUM_PLUS, TIER_LABEL,
  planTier, planIsPremium, canUploadGlb, readPlan, computeLimits,
  planCodeHash, planTierForCode, applyPlanCode, CODE_REMAINDER,
} from '../frontend/js/studio-plan.js';

/** 최소 localStorage 대역. 실물과 같은 성질만 갖는다(문자열 저장·없으면 null) */
function fakeStorage(init: Record<string, string> = {}) {
  const map = new Map(Object.entries(init));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, String(v)); },
    removeItem: (k: string) => { map.delete(k); },
    _map: map,
  };
}
function setStorage(s: unknown) {
  (globalThis as unknown as { localStorage: unknown }).localStorage = s;
}

beforeEach(() => setStorage(fakeStorage()));
afterEach(() => { delete (globalThis as unknown as { localStorage?: unknown }).localStorage; });

describe('층위 읽기', () => {
  it('저장이 비었으면 무료다', () => {
    expect(planTier()).toBe(TIER_FREE);
    expect(planIsPremium()).toBe(false);
    expect(canUploadGlb()).toBe(false);
  });

  it("★ 기존 저장값 'premium' 이 그대로 읽힌다 — 이미 결제한 사람이 강등되면 안 된다", () => {
    setStorage(fakeStorage({ [PLAN_KEY]: 'premium' }));
    expect(planTier()).toBe(TIER_PREMIUM);
    expect(planIsPremium()).toBe(true);
    expect(canUploadGlb(), '프리미엄에는 GLB 업로드가 안 열린다').toBe(false);
  });

  it('★ 특별 프리미엄은 프리미엄 **이상**이다 — `=== premium` 이면 기능을 잃는다', () => {
    setStorage(fakeStorage({ [PLAN_KEY]: 'premium_plus' }));
    expect(planTier()).toBe(TIER_PREMIUM_PLUS);
    expect(planIsPremium(), '★ 특별 프리미엄이 프리미엄 기능을 잃었다').toBe(true);
    expect(canUploadGlb()).toBe(true);
  });

  it('★ 모르는 값은 무료로 떨어진다 — fail-closed', () => {
    for (const bad of ['PREMIUM', 'premium_plus_plus', 'true', '1', 'gold', '']) {
      setStorage(fakeStorage({ [PLAN_KEY]: bad }));
      expect(planTier(), `★ "${bad}" 가 권한을 열었다`).toBe(TIER_FREE);
    }
  });

  it('저장에 접근할 수 없어도 던지지 않는다 — 무료로 본다', () => {
    setStorage({ getItem() { throw new Error('denied'); } });
    expect(planTier()).toBe(TIER_FREE);
    expect(planIsPremium()).toBe(false);
  });

  it('readPlan 이 하위호환 `premium` 을 함께 낸다 — 기존 호출부가 그것을 읽는다', () => {
    setStorage(fakeStorage({ [PLAN_KEY]: 'premium_plus' }));
    expect(readPlan()).toEqual({ tier: TIER_PREMIUM_PLUS, premium: true, canUploadGlb: true });
  });
});

describe('한도 계산', () => {
  it('★ boolean 도 받는다 — 옛 호출부가 조용히 무료로 떨어지면 안 된다', () => {
    // ⚠ **한도 값만 비교하면 안 잡힌다** — 뮤테이션 실측(T4): 정규화를 지워도 `true` 가
    // truthy 라 `premium` 판정이 우연히 맞고 한도가 같게 나왔다. **정규화 결과 자체**를
    // 본다 — `TIER` 는 언제나 문자열 층위여야 하고 boolean 이 새어 나오면 안 된다.
    expect(computeLimits(true).TIER, '★ boolean 이 층위로 정규화되지 않았다').toBe(TIER_PREMIUM);
    expect(computeLimits(false).TIER).toBe(TIER_FREE);
    expect(computeLimits(true).MAX_ARTWORKS).toBe(computeLimits(TIER_PREMIUM).MAX_ARTWORKS);
    expect(computeLimits(false).MAX_ARTWORKS).toBe(computeLimits(TIER_FREE).MAX_ARTWORKS);
    // 인자를 아예 안 줘도 무료로 (fail-closed)
    expect((computeLimits as (t?: unknown) => { TIER: string })().TIER).toBe(TIER_FREE);
  });

  it('★ 특별 프리미엄의 점수는 프리미엄과 같다 — 감독이 연 것은 업로드 권한이다', () => {
    const p = computeLimits(TIER_PREMIUM);
    const pp = computeLimits(TIER_PREMIUM_PLUS);
    expect(pp.MAX_ARTWORKS).toBe(p.MAX_ARTWORKS);
    expect(pp.MAX_FEATURED).toBe(p.MAX_FEATURED);
    expect(pp.CAN_UPLOAD_GLB, '★ 특별 프리미엄인데 업로드가 안 열린다').toBe(true);
    expect(p.CAN_UPLOAD_GLB, '★ 프리미엄에 업로드가 열렸다').toBe(false);
  });

  it('무료는 둘 다 잠긴다', () => {
    const f = computeLimits(TIER_FREE);
    expect(f.PREMIUM).toBe(false);
    expect(f.CAN_UPLOAD_GLB).toBe(false);
    expect(f.MAX_ARTWORKS).toBeLessThan(computeLimits(TIER_PREMIUM).MAX_ARTWORKS);
  });

  it('층위마다 이름이 있다 — 표시명을 화면이 지어내면 갈라진다', () => {
    for (const t of [TIER_FREE, TIER_PREMIUM, TIER_PREMIUM_PLUS]) {
      expect(TIER_LABEL[t as keyof typeof TIER_LABEL], `${t} 의 이름이 없다`).toBeTruthy();
    }
  });
});

describe('활성화 코드', () => {
  /** 원하는 나머지가 나오는 코드를 찾는다 — 발급기(`scripts/make-plan-code.mjs`)와 같은 식 */
  function findCode(remainder: number): string {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let n = 0; n < 5_000_000; n++) {
      const b = (i: number) => A[(n >> (i * 5)) % A.length];
      const code = `ART-${b(0)}${b(1)}${b(2)}${b(3)}-${b(4)}${b(5)}${b(6)}${(A[n % A.length])}`;
      if (planCodeHash(code) === remainder) return code;
    }
    throw new Error(`나머지 ${remainder} 코드를 못 찾았다`);
  }

  it('형식이 틀리면 어떤 층위도 안 연다', () => {
    for (const bad of ['', 'ART-123', 'art-abcd-efgh', 'ART-ABCDE-FGHI', 'XXX-ABCD-EFGH']) {
      expect(planTierForCode(bad), `"${bad}" 가 통과했다`).toBeNull();
    }
  });

  it('★ 나머지가 층위를 가른다 — 프리미엄 코드로 특별 프리미엄이 열리면 안 된다', () => {
    const p = findCode(CODE_REMAINDER.premium);
    const pp = findCode(CODE_REMAINDER.premium_plus);
    expect(planTierForCode(p)).toBe(TIER_PREMIUM);
    expect(planTierForCode(pp)).toBe(TIER_PREMIUM_PLUS);
    expect(p).not.toBe(pp);
  });

  it('소문자로 넣어도 통한다 — 사람이 손으로 친다', () => {
    const pp = findCode(CODE_REMAINDER.premium_plus);
    expect(planTierForCode(pp.toLowerCase())).toBe(TIER_PREMIUM_PLUS);
    expect(planTierForCode(`  ${pp}  `)).toBe(TIER_PREMIUM_PLUS);
  });

  it('★ 적용하면 그 층위가 저장된다 — 프리미엄으로 덮어쓰면 강등이다', () => {
    const store = fakeStorage();
    setStorage(store);
    const pp = findCode(CODE_REMAINDER.premium_plus);
    expect(applyPlanCode(pp)).toBe(TIER_PREMIUM_PLUS);
    expect(store.getItem(PLAN_KEY), '★ 저장된 층위가 다르다').toBe(TIER_PREMIUM_PLUS);
    expect(canUploadGlb()).toBe(true);
  });

  it('틀린 코드는 저장을 건드리지 않는다 — 이미 켠 등급이 꺼지면 안 된다', () => {
    const store = fakeStorage({ [PLAN_KEY]: 'premium_plus' });
    setStorage(store);
    expect(applyPlanCode('ART-0000-0000')).toBeNull();
    expect(store.getItem(PLAN_KEY), '★ 틀린 코드가 등급을 지웠다').toBe(TIER_PREMIUM_PLUS);
  });

  it('저장이 막혀도 던지지 않는다 — 그 세션에서만 안 남을 뿐이다', () => {
    setStorage({ getItem: () => null, setItem() { throw new Error('quota'); } });
    const pp = findCode(CODE_REMAINDER.premium_plus);
    expect(() => applyPlanCode(pp)).not.toThrow();
  });
});

describe('엔트리 배선 — 층위가 실제로 흘러가는가', () => {
  // ⚠ 뮤테이션 실측(T8): `studio-main.ts` 가 `computeLimits(plan.premium)` 로 되돌아가도
  // **아무 검사도 안 깨졌다.** boolean 을 넘기면 특별 프리미엄이 프리미엄으로 눌려
  // `CAN_UPLOAD_GLB` 를 잃는데, 순수 테스트는 그 호출부를 안 본다 —
  // 이 저장소가 이름 붙인 *"계산된 값이 실제로 소비되는가"* 그대로다.
  it('★ 엔트리가 층위를 그대로 넘긴다 — boolean 을 넘기면 업로드 권한이 사라진다', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const main = readFileSync(
      fileURLToPath(new URL('../frontend/js/studio-main.ts', import.meta.url)), 'utf8',
    );
    expect(main, '★ `computeLimits(plan.premium)` 로 되돌아갔다 — 특별 프리미엄이 눌린다')
      .not.toMatch(/computeLimits\(\s*plan\.premium\s*\)/);
    expect(main, '★ 층위를 안 넘긴다').toMatch(/computeLimits\(\s*plan\.tier\s*\)/);
  });
});

describe('배지 — 켜졌는지 화면이 말하는가', () => {
  // ⚠ 이 축은 **브라우저 실측이 잡았다**(2026-08-16). 특별 프리미엄을 켜고 스튜디오를
  // 열었더니 배지가 `PREMIUM` 이었다 — `injectPlanBadge(limits.PREMIUM)` 가 boolean 을
  // 받아 두 값만 낼 수 있었기 때문이다. **켜졌는지 확인할 수 없으면 그 기능은 없는 것과
  // 같다**(감독이 코드를 발급하고도 먹었는지 모른다).
  it('★ 배지가 층위 이름을 낸다 — boolean 만 받으면 특별 프리미엄이 안 보인다', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const plan = readFileSync(
      fileURLToPath(new URL('../frontend/js/studio-plan.ts', import.meta.url)), 'utf8',
    );
    const fn = plan.slice(plan.indexOf('export function injectPlanBadge('));
    const body = fn.slice(0, fn.indexOf('\n}'));
    expect(body, '★ 배지가 층위 이름을 안 쓴다').toContain('TIER_LABEL[');
    expect(body, "★ 'PREMIUM'/'FREE' 리터럴로 되돌아갔다 — 층위가 셋인데 값이 둘이다")
      .not.toMatch(/['"]PREMIUM['"]\s*:/);

    const main = readFileSync(
      fileURLToPath(new URL('../frontend/js/studio-main.ts', import.meta.url)), 'utf8',
    );
    expect(main, '★ 엔트리가 배지에 boolean 을 넘긴다')
      .not.toMatch(/injectPlanBadge\(\s*limits\.PREMIUM\s*\)/);
    expect(main).toMatch(/injectPlanBadge\(\s*limits\.TIER\s*\)/);
  });
});

describe('발급기와 판정이 어긋나지 않는가', () => {
  it('★ 발급기가 판정식을 소스에서 읽는다 — 값을 베끼면 한쪽만 고쳐도 모른다', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const gen = readFileSync(
      fileURLToPath(new URL('../scripts/make-plan-code.mjs', import.meta.url)), 'utf8',
    );
    expect(gen, '★ 발급기가 studio-plan.ts 를 안 읽는다').toContain('studio-plan.ts');
    // 나머지 값을 발급기 안에 리터럴로 적으면 미러링이다.
    // ⚠ 첫 판본은 `/=\s*(777|4242)/` 였고 **뮤테이션 T9 를 놓쳤다** — 실제 형태가
    // `= { premium: 777, … }` 라 `=` 바로 뒤가 `{` 였다. 자리를 보지 말고 **숫자 자체**를
    // 본다(주석 안의 설명까지 잡히지만, 발급기에 그 숫자를 적을 이유가 없다).
    expect(gen.replace(/CODE_REMAINDER/g, ''), '★ 나머지 값이 발급기에 박혔다')
      .not.toMatch(/\b(777|4242)\b/);
  });
});
