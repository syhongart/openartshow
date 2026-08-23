// world2-venue-entry.test.ts — 「전시장에 들어갈 수 있는가」 판정.
//
// 이 판정이 틀리면 두 방향으로 조용히 나쁘다: 안 떠서 못 들어가거나(신고가 온다),
// 엉뚱한 주소로 보내거나(감독이 404 를 받는다 — 이미 한 번 일어났다).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { venueEntryView, VENUE_PAGE, type VenueEntryInput } from '../frontend/js/world2/decide/venue-entry.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const base = (over: Partial<VenueEntryInput> = {}): VenueEntryInput => ({
  player: { x: 0, z: 0 }, entry: { x: 0, z: 0 }, radius: 6, tenant: 'syhongart', ...over,
});

describe('venueEntryView — 언제 안내를 띄우는가', () => {
  it('건물 앞에 서 있고 갈 곳이 정해져 있으면 띄운다', () => {
    const v = venueEntryView(base({ player: { x: 3, z: 4 } })); // 거리 5 < 반경 6
    expect(v.show).toBe(true);
    expect(v.label).toBe('전시장 들어가기');
    expect(v.href).toBe('visit.html?u=syhongart');
    expect(v.distance).toBeCloseTo(5, 9);
  });

  it('멀면 안 띄운다 — 경계는 반경 이하까지', () => {
    expect(venueEntryView(base({ player: { x: 6, z: 0 } })).show).toBe(true);   // 딱 반경
    expect(venueEntryView(base({ player: { x: 6.001, z: 0 } })).show).toBe(false);
    expect(venueEntryView(base({ player: { x: 40, z: 0 } })).show).toBe(false);
  });

  it('안 띄우는 네 이유가 서로 갈린다', () => {
    // 건물이 아직 안 떴다 / 위치를 모른다 → 거리조차 없다
    expect(venueEntryView(base({ entry: null })).distance).toBeNull();
    expect(venueEntryView(base({ player: null })).distance).toBeNull();
    // 갈 곳이 없다 → 거리는 재졌다(진단이 갈려야 한다)
    const noTenant = venueEntryView(base({ player: { x: 1, z: 0 }, tenant: null }));
    expect(noTenant.show).toBe(false);
    expect(noTenant.distance).toBeCloseTo(1, 9);
    // 멀다 → 거리도 있다
    const far = venueEntryView(base({ player: { x: 30, z: 0 } }));
    expect(far.show).toBe(false);
    expect(far.distance).toBeCloseTo(30, 9);
  });

  it('망가진 입력에 throw 하지 않고 숨긴다', () => {
    for (const r of [0, -1, NaN, Infinity, undefined as any, '6' as any]) {
      expect(venueEntryView(base({ radius: r })).show).toBe(false);
    }
    for (const p of [{ x: NaN, z: 0 }, { x: 0, z: Infinity }]) {
      expect(venueEntryView(base({ player: p })).show).toBe(false);
    }
  });
});

describe('venueEntryView — 어디로 보내는가', () => {
  it('작가 아이디를 URL 인코딩한다', () => {
    expect(venueEntryView(base({ tenant: 'a b&c=d' })).href).toBe('visit.html?u=a%20b%26c%3Dd');
    expect(venueEntryView(base({ tenant: '../evil' })).href).toBe('visit.html?u=..%2Fevil');
  });

  it('실내 페이지는 형제 경로다 — 배포 구조와 일치해야 한다', () => {
    // ⚠ 이 단언이 있는 이유는 실제 사고다(2026-08-22): 배포 경로를 확인하지 않고
    // `/visit.html` 로 링크를 만들어 404 가 났다. world2 와 visit 은 둘 다 `app/`
    // 아래로 배포되므로 형제 경로이고, 그 사실을 entrypoints.mjs 에서 직접 읽어 본다.
    const src = readFileSync(join(HERE, '../scripts/lib/entrypoints.mjs'), 'utf-8');
    const outOf = (key: string) => src.match(new RegExp(`key: '${key}'[^}]*out: '([^']+)'`))?.[1];
    const world2Out = outOf('world2');
    const visitOut = outOf('visit');
    expect(world2Out).toBeTruthy();
    expect(visitOut).toBeTruthy();
    // 같은 디렉터리에 있어야 상대 경로 VENUE_PAGE 가 성립한다.
    expect(visitOut!.slice(0, visitOut!.lastIndexOf('/'))).toBe(world2Out!.slice(0, world2Out!.lastIndexOf('/')));
    expect(visitOut!.slice(visitOut!.lastIndexOf('/') + 1)).toBe(VENUE_PAGE);
  });
});
