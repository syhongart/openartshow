// world2-venue-entry.test.ts — 「전시장에 들어갈 수 있는가」 판정.
//
// 이 판정이 틀리면 두 방향으로 조용히 나쁘다: 안 떠서 못 들어가거나(신고가 온다),
// 엉뚱한 주소로 보내거나(감독이 404 를 받는다 — 이미 한 번 일어났다).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  venueEntryView, venueAnchorOf, VENUE_PAGE, VENUE_NEAR_RADIUS, VENUE_FALLBACK_RADIUS,
  type VenueEntryInput,
} from '../frontend/js/world2/decide/venue-entry.js';

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

describe('venueAnchorOf — 어디를 기준으로 재는가', () => {
  // ⚠ 감독 판정 2026-08-23 «18미터 말고 3미터로» 는 **숫자만 바꿔서는 실현되지 않았다.**
  // 그때 기준이 건물 **중심**이었고 건물이 17×25m 라 중심 3m 는 건물 내부다 — 안내가
  // 영영 안 뜬다. 그래서 기준을 문으로 옮겼고, 이 검사가 그 축을 지킨다.
  const doorAt = (x: number, z: number) => ({
    getObjectByName: (n: string) =>
      n === 'door.002' ? { matrixWorld: { elements: [1,0,0,0, 0,1,0,0, 0,0,1,0, x,0,z,1] } } : null,
    position: { x: 999, z: 999 },   // 문을 찾으면 중심은 안 쓴다
  });

  it('문을 찾으면 문의 월드 위치를 3m 반경으로 쓴다', () => {
    const a = venueAnchorOf(doorAt(12, -4), VENUE_NEAR_RADIUS, VENUE_FALLBACK_RADIUS);
    expect(a).toEqual({ x: 12, z: -4, radius: 3, from: 'door' });
    expect(VENUE_NEAR_RADIUS).toBe(3);          // 감독 판정
  });

  it('문이 없으면 건물 중심 + 넓은 반경으로 내려앉는다', () => {
    const a = venueAnchorOf({ position: { x: -32, z: 0 } }, VENUE_NEAR_RADIUS, VENUE_FALLBACK_RADIUS);
    expect(a).toEqual({ x: -32, z: 0, radius: VENUE_FALLBACK_RADIUS, from: 'center' });
    // 폴백이 문 반경보다 넓어야 한다 — 좁으면 「문을 못 찾으면 아예 못 들어간다」가 된다.
    expect(VENUE_FALLBACK_RADIUS).toBeGreaterThan(VENUE_NEAR_RADIUS);
  });

  it('행렬이 망가졌으면 문을 못 찾은 것으로 본다', () => {
    for (const bad of [undefined, [], [1,2,3], [1,0,0,0, 0,1,0,0, 0,0,1,0, NaN,0,3,1]]) {
      const root = { getObjectByName: () => ({ matrixWorld: { elements: bad } }), position: { x: 5, z: 6 } };
      expect(venueAnchorOf(root as never, 3, 18)?.from).toBe('center');
    }
  });

  it('아무것도 없으면 null (건물이 아직 안 떴다)', () => {
    expect(venueAnchorOf(null, 3, 18)).toBeNull();
    expect(venueAnchorOf(undefined, 3, 18)).toBeNull();
    expect(venueAnchorOf({}, 3, 18)).toBeNull();
    expect(venueAnchorOf({ position: { x: NaN, z: 0 } } as never, 3, 18)).toBeNull();
  });

  it('문 앞 3m 는 실제로 문 근처에서만 뜬다 (판정과 이어 붙여 본다)', () => {
    const a = venueAnchorOf(doorAt(0, 0), VENUE_NEAR_RADIUS, VENUE_FALLBACK_RADIUS)!;
    const at = (x: number) => venueEntryView({
      player: { x, z: 0 }, entry: { x: a.x, z: a.z }, radius: a.radius, tenant: 'syhongart',
    }).show;
    expect(at(2.9)).toBe(true);
    expect(at(3.1)).toBe(false);
    expect(at(15)).toBe(false);   // 옛 18m 였으면 여기서도 떴다
  });
});
