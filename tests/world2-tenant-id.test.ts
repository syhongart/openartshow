// @vitest-environment node
//
// 작가 아이디 — **주소에 들어가는 식별자.**
//
// 감독 요구(2026-08-16): *"사용자가 **아이디로 입력해서** 자기 땅…"*
// 카드 판정: 진입은 **둘 다** — 주소(`?u=`)에 있으면 그것, 없으면 입력 창.
//
// ── 이 파일이 지키는 명제 넷 ───────────────────────────────────────────────
// ① **사칭 방지가 별명과 같은 목록을 본다** — `admin` 이 별명에서 막히고 아이디에서
//    통과하면 막은 의미가 없다. 목록은 `reserved-names.ts`(의존 0 leaf) 하나다
// ② **셋으로 가른다** — 형식·길이·예약어를 하나로 뭉개면 `.GLB` 대문자 사고가 재발한다
// ③ **대소문자를 접는다** — 구별하면 «같은 링크인데 다른 사람» 이 성립한다
// ④ **없는 것과 틀린 것을 가른다** — `?u=` 가 없으면 마을 기본 화면, 틀렸으면 사유

import { describe, it, expect } from 'vitest';
import {
  normalizeTenantId, tenantIdFromSearch, TENANT_ID_MIN, TENANT_ID_MAX,
} from '../frontend/js/world2/decide/tenant-id.js';
import { RESERVED_NAMES } from '../frontend/js/shared/reserved-names.js';

describe('normalizeTenantId — 통과하는 것', () => {
  it('평범한 아이디', () => {
    for (const ok of ['arthong', 'mara', 'a1', 'art-hong', 'x2y3', 'a'.repeat(TENANT_ID_MAX)]) {
      const r = normalizeTenantId(ok);
      expect(r.error, `"${ok}" 가 거부됐다: ${r.message}`).toBeNull();
      expect(r.id).toBe(ok);
    }
  });

  it('★ 대소문자를 접는다 — 구별하면 「같은 링크인데 다른 사람」이 된다', () => {
    expect(normalizeTenantId('ArtHong').id).toBe('arthong');
    expect(normalizeTenantId('ARTHONG').id).toBe('arthong');
  });

  it('앞뒤 공백을 다듬는다 — 사람이 손으로 친다', () => {
    expect(normalizeTenantId('  arthong \n').id).toBe('arthong');
  });
});

describe('normalizeTenantId — 거부하는 것. ★ 사유가 갈린다', () => {
  it('빈 값은 empty', () => {
    for (const v of ['', '   ', null, undefined, 3, {}, []]) {
      expect(normalizeTenantId(v).error, `${JSON.stringify(v)}`).toBe('empty');
    }
  });

  it('★ 한글·대문자 밖 문자는 charset — 「너무 짧다」로 뭉개지 않는다', () => {
    for (const v of ['아트홍', 'art hong', 'art_hong', 'art.hong', 'art/hong', 'art@x', '한']) {
      const r = normalizeTenantId(v);
      expect(r.error, `"${v}" 의 사유가 charset 이 아니다: ${r.error}`).toBe('charset');
    }
  });

  it('★ 하이픈 규칙 — 시작·끝·연속은 주소에서 안 읽힌다', () => {
    for (const v of ['-art', 'art-', 'art--hong', '--', '-']) {
      expect(normalizeTenantId(v).error, `"${v}"`).toBe('charset');
    }
  });

  it('★ 길이는 문자셋을 통과한 뒤에 본다 — 사용자가 엉뚱한 것을 고치지 않게', () => {
    expect(normalizeTenantId('a').error).toBe('too-short');
    expect(normalizeTenantId('a'.repeat(TENANT_ID_MAX + 1)).error).toBe('too-long');
    // 문자셋과 길이가 **둘 다** 틀리면 문자셋이 먼저다.
    expect(normalizeTenantId('한').error, '★ 한 글자 한글이 길이 오류로 보고됐다').toBe('charset');
  });

  it(`경계값 — ${TENANT_ID_MIN}자는 되고 그 아래는 안 된다`, () => {
    expect(normalizeTenantId('a'.repeat(TENANT_ID_MIN)).error).toBeNull();
    expect(normalizeTenantId('a'.repeat(TENANT_ID_MIN - 1)).error).toBe('too-short');
  });

  it('★ 예약어는 별명과 **같은 목록**을 본다 — 한쪽만 막으면 막은 의미가 없다', () => {
    // 목록에서 아이디 문자셋을 통과할 수 있는 것만 고른다(한글 예약어는 charset 에서 걸린다).
    const asciiReserved = RESERVED_NAMES.filter((n) => /^[a-z0-9-]+$/.test(n));
    expect(asciiReserved.length, '검사 표본이 비었다').toBeGreaterThan(5);
    for (const n of asciiReserved) {
      if (n.length < TENANT_ID_MIN) continue;
      expect(normalizeTenantId(n).error, `★ 예약어 "${n}" 이 통과했다`).toBe('reserved');
    }
  });

  it('★ 사칭 우회(leet·밑줄)도 예약어로 걸린다', () => {
    // `4dmin` → fold 하면 `admin`. 밑줄은 문자셋에서 먼저 걸리므로 숫자 치환만 본다.
    expect(normalizeTenantId('4dmin').error).toBe('reserved');
    expect(normalizeTenantId('r00t').error).toBe('reserved');
    expect(normalizeTenantId('5ystem').error).toBe('reserved');
  });

  it('★ 거부에는 화면에 쓸 문구가 함께 온다 — 소비자가 지어내지 않게', () => {
    for (const v of ['', '아트홍', 'a', 'admin', 'a'.repeat(99)]) {
      const r = normalizeTenantId(v);
      expect(r.message.length, `"${v}" 의 안내가 비었다`).toBeGreaterThan(0);
      expect(r.id).toBeNull();
    }
  });
});

describe('tenantIdFromSearch — ★ 없는 것과 틀린 것을 가른다', () => {
  it('`?u=` 가 없으면 null — 마을 기본 화면이다', () => {
    for (const s of ['', '?', '?time=day', '?edit=1&weather=clear']) {
      expect(tenantIdFromSearch(s), `"${s}"`).toBeNull();
    }
  });

  it('빈 값도 「지정 안 됨」으로 본다 — `?u=` 만 적힌 링크는 흔한 오타다', () => {
    expect(tenantIdFromSearch('?u=')).toBeNull();
    expect(tenantIdFromSearch('?u=%20%20')).toBeNull();
  });

  it('있으면 정규화해서 낸다', () => {
    expect(tenantIdFromSearch('?u=ArtHong')?.id).toBe('arthong');
    expect(tenantIdFromSearch('?time=day&u=mara&edit=1')?.id).toBe('mara');
  });

  it('★ 틀린 값은 null 이 아니라 **사유**를 낸다 — 조용히 마을만 띄우면 원인을 모른다', () => {
    const r = tenantIdFromSearch('?u=admin');
    expect(r, '★ 예약어가 「지정 안 됨」으로 뭉개졌다').not.toBeNull();
    expect(r!.error).toBe('reserved');
    expect(tenantIdFromSearch('?u=아트홍')!.error).toBe('charset');
  });
});

describe('경계 — 남의 계약을 넓히지 않는다', () => {
  it('★ `isSafeSrc`(자산 경로)를 끌어다 쓰지 않는다 — 한 함수가 두 계약을 지면 방어가 약해진다', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      fileURLToPath(new URL('../frontend/js/world2/decide/tenant-id.ts', import.meta.url)), 'utf8',
    );
    expect(src, '★ 오버레이 계약을 import 했다').not.toMatch(/from\s+['"]\.\/overlay\.js['"]/);
    expect(src, '★ 예약어를 복사했다 — leaf 에서 받아야 값이 하나다')
      .toContain("from '../../shared/reserved-names.js'");
    // mypage 를 직접 부르면 청크가 딸려온다(`profile-storage.ts:1-20` 실측 사고).
    // ⚠ **import 문만 본다.** 첫 판본은 파일 전체에서 `mypage/` 를 찾았고 **헤더 주석의
    // 인용**(*"별명(`mypage/nickname.ts`)과 다른 파일인가"*)을 잡아 빨간불이 났다.
    // 왜 그 파일과 다른지를 값 옆에 적는 것은 규율이 **요구하는** 것이고, 이 축이 재는
    // 것은 **번들이 무엇을 끌고 오는가** 다 — 주석은 번들에 안 들어간다.
    const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    expect(imports.filter((i) => i.includes('mypage')), '★ mypage 를 직접 import 했다 — 청크가 는다')
      .toEqual([]);
  });
});
