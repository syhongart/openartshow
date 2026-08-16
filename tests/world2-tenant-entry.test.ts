// @vitest-environment node
//
// **진입** — `?u=` 로 누구의 땅을 보는가 (W8-3 S6).
//
// 감독 카드(2026-08-16): 진입은 **둘 다** — 주소에 있으면 그것, 없으면 마을 전체.
//
// ── 이 파일이 지키는 명제 셋 ───────────────────────────────────────────────
// ① **세 갈래를 구별해 말한다** — 「지정 안 됨」·「형식이 틀림」·「대장에 없음」은
//    사용자가 할 일이 다르다. 뭉개면 오타가 「그런 작가 없음」과 구별되지 않는다
// ② **어느 경우에도 마을은 뜬다** — `backend/README.md` 규약 *"서버가 죽어도 전시를
//    보는 것만은 되어야 한다"* 의 이 축에서의 형태
// ③ **지정하면 그 작가만** — 남의 문서까지 받으면 「내 땅을 본다」가 아니다
//
// ⚠ `features/` 는 three 를 import 하므로 노드가 못 돌린다. **판정은 순수 쪽**
// (`decide/tenant-entry.ts` 의 `resolveEntry`)에서 실제로 돌리고, 여기서는 **배선**을
// 소스로 본다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveEntry } from '../frontend/js/world2/decide/tenant-entry.js';
import { loadLedger, owners } from '../frontend/js/world2/decide/village-ledger.js';

const SRC = readFileSync(
  fileURLToPath(new URL('../frontend/js/world2/features/overlay.ts', import.meta.url)), 'utf8',
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('★ 좁히기 판정 — 실제로 돌린다', () => {
  const { ledger } = loadLedger({
    version: 1,
    plots: [{ px: 0, pz: 0, owner: 'arthong' }, { px: 1, pz: 0, owner: 'mara' }],
  });

  // ⚠ 첫 판본은 여기에 `features/overlay.ts` 의 좁히기 식을 **손으로 베낀 헬퍼**를 두고
  // 있었다. 그것은 값 미러링이라 한쪽만 고쳐도 아무도 모른다 — 실제로 그 파일이
  // `check:filesize` 상한에 걸려 판정을 `decide/tenant-entry.ts` 로 옮겼고, 그 순간
  // 헬퍼는 **아무것도 검증하지 않는 사본**이 됐다. 지금은 진짜 함수를 돌린다.
  function narrow(search: string) {
    const r = resolveEntry(search, owners(ledger));
    return { focus: r.tenant, who: r.who, error: r.tenantError, missing: r.tenantMissing };
  }

  it('지정 안 하면 전원 — 마을 전체를 본다', () => {
    const r = narrow('?time=day');
    expect(r.focus).toBeNull();
    expect(r.who).toEqual(['arthong', 'mara']);
  });

  it('★ 지정하면 그 작가만 — 남의 문서까지 받으면 「내 땅」이 아니다', () => {
    const r = narrow('?u=arthong');
    expect(r.who, '★ 남의 문서가 함께 왔다').toEqual(['arthong']);
    expect(r.missing).toBe(false);
  });

  it('대소문자를 접어서 찾는다 — 링크를 손으로 친다', () => {
    expect(narrow('?u=ArtHong').who).toEqual(['arthong']);
  });

  it('★ 형식이 틀리면 사유가 남고 **좁히지 않는다** — 마을은 뜬다', () => {
    const r = narrow('?u=아트홍');
    expect(r.error, '★ 형식 오류가 사라졌다').toBe('charset');
    expect(r.focus, '★ 틀린 아이디로 좁혔다').toBeNull();
    expect(r.who, '★ 마을이 안 뜬다').toEqual(['arthong', 'mara']);
  });

  it('★ 예약어도 사유가 남는다 — 사칭 링크가 조용히 마을로 떨어지지 않는다', () => {
    expect(narrow('?u=admin').error).toBe('reserved');
  });

  it('★ 형식은 맞는데 대장에 없으면 **다른 사유**다 — 오타와 「없는 작가」를 가른다', () => {
    const r = narrow('?u=nobody');
    expect(r.error, '★ 형식 오류로 뭉갰다').toBeNull();
    expect(r.missing, '★ 「대장에 없음」을 말하지 않는다').toBe(true);
  });

  it('★ 없는 작가면 **전원으로 되돌린다** — 「마을을 둘러보세요」가 거짓이 되지 않게', () => {
    // ⚠ 브라우저 실측(2026-08-16)이 잡은 결함이다. 첫 판본은 `[]` 를 냈고, 소비자의
    // `who.length === 0` 분기가 그것을 「대장이 없다」와 같게 취급해 **옛 단일 문서**로
    // 떨어뜨렸다 — 화면은 마을을 둘러보라는데 다른 작가가 안 떴다.
    //
    // 그리고 그때 이 검사는 `.toEqual([])` **초록이었다** — 계산 결과를 기대값으로 다시
    // 적었기 때문이다. 그런 검사는 그 계산이 옳은지 묻지 않는다.
    const r = narrow('?u=nobody');
    expect(r.who, '★ 「없는 작가」로 들어오면 마을이 빈다').toEqual(['arthong', 'mara']);
  });
});

describe('★ 배선 — 진입이 실제로 좁히는가', () => {
  it('★ 주소를 좁히기 판정에 넘긴다 — 안 넘기면 `?u=` 가 아무 데도 안 닿는다', () => {
    expect(CODE, '★ 주소를 판정에 안 넘긴다')
      .toMatch(/resolveEntry\(\s*env\.doc\?\.defaultView\?\.location\?\.search/);
  });

  it('★ 읽은 아이디로 작가를 좁힌다 — 안 좁히면 지정이 장식이다', () => {
    expect(CODE, '★ 좁히기 판정을 안 부른다').toMatch(/resolveEntry\(/);
    expect(CODE, '★ 좁힌 결과를 안 쓴다 — 지정이 장식이 된다').toMatch(/const who = ent\.who/);
  });

  it('★ 세 갈래를 각각 진단에 남긴다', () => {
    for (const f of ['diag.tenant', 'diag.tenantError', 'diag.tenantMissing']) {
      expect(CODE, `★ ${f} 를 안 채운다 — 사유가 뭉개진다`).toContain(f);
    }
  });

  it('★ 진단 셋을 좁히기 결과에서 받는다 — 따로 계산하면 화면과 진단이 갈린다', () => {
    expect(CODE).toMatch(/diag\.tenant = ent\.tenant/);
    expect(CODE).toMatch(/ent\.tenantError/);
    expect(CODE).toMatch(/ent\.tenantMissing/);
  });

  it('★ 주소를 주입받는다 — 전역 `location` 을 직접 읽으면 테스트가 못 돌린다', () => {
    expect(CODE, '★ 전역 location 을 직접 읽는다')
      .not.toMatch(/[^.]\blocation\.search\b/);
    expect(CODE).toContain('env.doc?.defaultView?.location?.search');
  });
});

// ── 입력 창 쪽 배선 (감독 카드 「둘 다」의 나머지 절반) ────────────────────
// 판정·DOM 동작은 `world2-tenant-entry-view.test.ts` 가 **실제로 돌린다**(jsdom).
// 여기서는 그것이 부팅에 **꽂혔는가**만 본다 — 계산된 값이 실제로 소비되는가.

describe('★ 진입 바가 부팅에 꽂혔다', () => {
  it('★ 진입 바를 실제로 띄운다 — 안 부르면 입력 창이 장식이다', () => {
    expect(CODE, '★ 진입 바를 안 붙인다').toContain('mountTenantEntry(env.doc, ent)');
  });

  it('★ GLB 를 기다리지 않는다 — 잘못 들어온 사람이 나갈 문이 수십 초 뒤에 뜨면 늦다', () => {
    const barAt = CODE.indexOf('mountTenantEntry(');
    const attachAt = CODE.indexOf('for (const group of plan.groups)');
    expect(barAt).toBeGreaterThan(-1);
    expect(barAt, '★ 진입 바가 부착 루프 뒤로 밀렸다').toBeLessThan(attachAt);
  });

  it('★ 떠날 때 리스너를 뗀다', () => {
    expect(CODE, '★ dispose 에서 진입 바를 안 뗀다').toContain('tenantBar?.dispose()');
  });

  it('★ 질의 조립을 여기서 손으로 하지 않는다 — `?edit=1` 보존이 안 도는 자리로 들어간다', () => {
    expect(CODE, '★ `?u=` 를 직접 이어 붙인다').not.toMatch(/['"`]\?u=/);
  });
});

describe('★ 마크업과 조회 id 가 어긋나지 않는다', () => {
  // ⚠ **값 미러링을 잡는 축이다.** jsdom 테스트는 마크업 **사본**을 쓰므로, 실물
  // `world2.html` 에서 id 하나가 사라져도 그 테스트는 계속 초록이다 — 그리고 화면에서만
  // 조용히 사라진다. 이 저장소가 색·수치·임계값에서 세 번 덴 그 형태다.
  const HTML = readFileSync(
    fileURLToPath(new URL('../frontend/world2.html', import.meta.url)), 'utf8',
  );
  const BAR = readFileSync(
    fileURLToPath(new URL('../frontend/js/world2/ui/tenant-bar.ts', import.meta.url)), 'utf8',
  );

  it('★ `findTenantBar` 가 찾는 id 가 실물 HTML 에 전부 있다', () => {
    const wanted = [...BAR.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]);
    expect(wanted.length, '조회하는 id 가 없다 — 검사가 헛돈다').toBeGreaterThanOrEqual(7);
    for (const id of wanted) {
      expect(HTML, `★ world2.html 에 #${id} 가 없다 — 진입 바가 통째로 안 뜬다`)
        .toContain(`id="${id}"`);
    }
  });

  it('★ 기본이 감춤이다 — 첫 페인트에 번쩍이지 않는다', () => {
    expect(HTML).toMatch(/id="w2-tenant"[^>]*data-show="0"[^>]*hidden/);
  });
});
