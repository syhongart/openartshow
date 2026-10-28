// @vitest-environment node
//
// 오버레이 **저장 어댑터** — 감독 카드 「구조만 먼저 · 서버 0」의 실체.
//
// ── 이 파일이 지키는 명제 다섯 ─────────────────────────────────────────────
// ① **전부 비동기** — 동기로 두면 서버가 붙는 날 모든 호출부가 `await` 로 바뀌고
//    그것이 「구조를 다시 뜯는」 일이다. 어댑터의 값어치가 0이 된다
// ② **「없다」와 「모른다」를 가른다** — 404 와 네트워크 실패는 화면이 다르게 말해야 한다
// ③ **던지지 않는다** — 저장소가 죽어도 마을은 뜬다(`backend/README.md` 규약의 이 축)
// ④ **GLB 바이트가 못 들어간다** — 크기 상한이 그것을 막는다. 「주의하자」로는 안 막힌다
// ⑤ **로컬이 배포본보다 최신** — 방금 편집한 것이 매번 덮이면 저장한 의미가 없다
//
// ⚠ **해석은 여기서 안 한다.** 저장소는 날것(`unknown`)을 돌려주고 판정은 `decide/` 가
// 한다 — 저장소가 스키마를 알면 계약이 두 곳에 생긴다.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createStaticStore, loadLegacyOverlay, overlayPathOf, LEDGER_JSON, LEGACY_OVERLAY_JSON,
} from '../frontend/js/world2/store/static-store.js';
import {
  createLocalStore, createLayeredStore, OverlaySaveError,
  OVERLAY_KEY_PREFIX, LEDGER_KEY, MAX_DOC_CHARS,
} from '../frontend/js/world2/store/local-store.js';
import { loaded, failed, type OverlayStore } from '../frontend/js/world2/store/types.js';

// ── fetch 대역 ─────────────────────────────────────────────────────────────
/** 경로 → 응답. 없는 경로는 404 로 답한다(실물과 같은 성질) */
function fakeFetch(table: Record<string, { status?: number; body?: unknown; text?: string }>) {
  return vi.fn(async (url: string) => {
    const hit = Object.entries(table).find(([p]) => String(url).includes(p));
    if (!hit) return { ok: false, status: 404, async json() { throw new Error('nf'); } };
    const { status = 200, body, text } = hit[1];
    return {
      ok: status >= 200 && status < 300,
      status,
      async json() {
        if (text !== undefined) throw new SyntaxError('not json');
        return body;
      },
    };
  });
}
function setFetch(fn: unknown) {
  (globalThis as unknown as { fetch: unknown }).fetch = fn;
}

/**
 * 최소 localStorage 대역.
 *
 * ⚠ **`quota` 를 받는다** — 총량 상한이 없으면 「크기를 **먼저** 검사하는가」를 못 잰다.
 * 첫 판본은 상한이 없어 뮤테이션 L2(검사를 `setItem` **뒤로** 옮김)가 **0 failed** 였다.
 * 대역이 실물의 핵심 성질(총량이 한정돼 있고, 큰 것이 들어가면 그 뒤가 실패한다)을 안 가져
 * **두 값을 구별하지 못한** 것이다 — 이 저장소가 이름 붙인 네 원인 중 그 형태.
 */
function fakeStorage(
  init: Record<string, string> = {},
  opts: { denySet?: boolean; quota?: number } = {},
) {
  const map = new Map(Object.entries(init));
  const used = () => [...map.entries()].reduce((n, [k, v]) => n + k.length + v.length, 0);
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      if (opts.denySet) throw new Error('QuotaExceededError');
      if (opts.quota !== undefined) {
        const before = map.has(k) ? k.length + (map.get(k)!).length : 0;
        if (used() - before + k.length + String(v).length > opts.quota) {
          throw new Error('QuotaExceededError');
        }
      }
      map.set(k, String(v));
    },
    removeItem: (k: string) => { map.delete(k); },
    _map: map,
    _used: used,
  };
}
function setStorage(s: unknown) {
  (globalThis as unknown as { localStorage: unknown }).localStorage = s;
}

afterEach(() => {
  delete (globalThis as unknown as { fetch?: unknown }).fetch;
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
});

describe('계약 — 전부 비동기다', () => {
  it('★ 모든 읽기·쓰기가 Promise 를 낸다 — 동기면 서버가 붙는 날 호출부가 전부 바뀐다', async () => {
    setFetch(fakeFetch({}));
    setStorage(fakeStorage());
    for (const s of [createStaticStore(), createLocalStore()]) {
      expect(s.loadLedger(), `${s.name}.loadLedger`).toBeInstanceOf(Promise);
      expect(s.loadOverlay('x'), `${s.name}.loadOverlay`).toBeInstanceOf(Promise);
      await s.loadLedger();
      await s.loadOverlay('x');
    }
    const local = createLocalStore();
    expect(local.saveOverlay!('x', { a: 1 })).toBeInstanceOf(Promise);
  });

  it('★ 배포 저장소는 saveOverlay 가 **없다** — 있는 척하고 실패하는 것보다 낫다', () => {
    setFetch(fakeFetch({}));
    expect(createStaticStore().saveOverlay).toBeUndefined();
  });

  it('★ 배포본은 authoritativeList=true, 로컬은 false — 「없다」와 「모른다」가 다르다', () => {
    setFetch(fakeFetch({}));
    setStorage(fakeStorage());
    expect(createStaticStore().authoritativeList).toBe(true);
    expect(createLocalStore().authoritativeList, '★ 로컬이 전역 진리를 주장한다').toBe(false);
  });
});

describe('배포 저장소 — ★ 실패 사유를 가른다', () => {
  it('있으면 날것을 그대로 낸다 — 해석은 decide 가 한다', async () => {
    setFetch(fakeFetch({ [LEDGER_JSON]: { body: { version: 1, plots: [] } } }));
    const r = await createStaticStore().loadLedger();
    expect(r.failure).toBeNull();
    expect(r.raw).toEqual({ version: 1, plots: [] });
  });

  it('★ 404 는 not-found — 새 작가이거나 오타다', async () => {
    setFetch(fakeFetch({}));
    expect((await createStaticStore().loadOverlay('nobody')).failure).toBe('not-found');
  });

  it('★ 네트워크 실패는 unreachable — 「없다」가 아니라 「못 물어봤다」', async () => {
    setFetch(vi.fn(async () => { throw new TypeError('offline'); }));
    expect((await createStaticStore().loadLedger()).failure).toBe('unreachable');
  });

  it('★ 200 인데 JSON 이 아니면 malformed — 404를 index.html 로 돌려주는 호스팅이 여기 온다', async () => {
    setFetch(fakeFetch({ [LEDGER_JSON]: { text: '<!doctype html>' } }));
    const r = await createStaticStore().loadLedger();
    expect(r.failure, '★ 배포 깨짐을 「없다」로 뭉갰다').toBe('malformed');
  });

  it('5xx 는 unreachable — 서버가 답은 했지만 문서를 못 줬다', async () => {
    setFetch(fakeFetch({ [LEDGER_JSON]: { status: 503 } }));
    expect((await createStaticStore().loadLedger()).failure).toBe('unreachable');
  });

  it('작가 경로가 아이디로 갈린다', () => {
    expect(overlayPathOf('arthong')).toContain('arthong');
    expect(overlayPathOf('arthong')).not.toBe(overlayPathOf('mara'));
  });

  it('★ 기존 단일 문서 경로가 그대로다 — 지금 라이브가 그것을 읽는다', async () => {
    expect(LEGACY_OVERLAY_JSON).toBe('assets/world2-overlay.json');
    setFetch(fakeFetch({ [LEGACY_OVERLAY_JSON]: { body: { version: 2, items: [] } } }));
    expect((await loadLegacyOverlay()).raw).toEqual({ version: 2, items: [] });
  });
});

describe('로컬 저장소', () => {
  beforeEach(() => setStorage(fakeStorage()));

  it('저장하고 읽는다', async () => {
    const s = createLocalStore();
    await s.saveOverlay!('arthong', { version: 2, items: [{ src: 'a.glb' }] });
    const r = await s.loadOverlay('arthong');
    expect(r.failure).toBeNull();
    expect(r.raw).toEqual({ version: 2, items: [{ src: 'a.glb' }] });
  });

  it('작가마다 다른 키 — 남의 문서를 덮지 않는다', async () => {
    const s = createLocalStore();
    await s.saveOverlay!('a', { who: 'a' });
    await s.saveOverlay!('b', { who: 'b' });
    expect((await s.loadOverlay('a')).raw).toEqual({ who: 'a' });
    expect((await s.loadOverlay('b')).raw).toEqual({ who: 'b' });
  });

  it('없으면 not-found', async () => {
    expect((await createLocalStore().loadOverlay('nobody')).failure).toBe('not-found');
  });

  it('깨진 JSON 은 malformed — 버리지 않고 말한다', async () => {
    setStorage(fakeStorage({ [`${OVERLAY_KEY_PREFIX}x`]: '{oops' }));
    expect((await createLocalStore().loadOverlay('x')).failure).toBe('malformed');
  });

  it('★ 저장소가 아예 없어도 던지지 않는다 — 마을은 떠야 한다', async () => {
    setStorage(undefined);
    const s = createLocalStore();
    expect((await s.loadOverlay('x')).failure).toBe('unreachable');
    expect((await s.loadLedger()).failure).toBe('unreachable');
  });

  it('대장도 읽는다', async () => {
    setStorage(fakeStorage({ [LEDGER_KEY]: '{"version":1,"plots":[]}' }));
    expect((await createLocalStore().loadLedger()).raw).toEqual({ version: 1, plots: [] });
  });
});

describe('★ 크기 상한 — GLB 바이트가 못 들어간다', () => {
  beforeEach(() => setStorage(fakeStorage()));

  it('★ 상한을 넘으면 too-large 로 거부한다 — 「주의하자」로는 안 막힌다', async () => {
    const s = createLocalStore();
    const huge = { src: `data:model/gltf-binary;base64,${'A'.repeat(MAX_DOC_CHARS)}` };
    await expect(s.saveOverlay!('x', huge)).rejects.toThrow(OverlaySaveError);
    await expect(s.saveOverlay!('x', huge)).rejects.toMatchObject({ failure: 'too-large' });
  });

  it('★ 거부해도 기존 저장을 안 건드린다 — quota 를 터뜨리면 남의 키가 밀린다', async () => {
    const store = fakeStorage();
    setStorage(store);
    const s = createLocalStore();
    await s.saveOverlay!('x', { ok: true });
    await s.saveOverlay!('x', { src: 'd'.repeat(MAX_DOC_CHARS + 1) }).catch(() => {});
    expect((await s.loadOverlay('x')).raw, '★ 거부된 저장이 기존 문서를 덮었다').toEqual({ ok: true });
  });

  it('평범한 배치 문서는 넉넉히 통과한다 — 「작품 수 상한 없음」을 막지 않는다', async () => {
    const s = createLocalStore();
    // 배치 하나 ≈ 120자. 1,000개를 넣어도 상한 아래여야 한다.
    const items = Array.from({ length: 1000 }, (_, i) => ({
      src: `assets/models/piece-${i}.glb`, x: i, y: 0, z: i, ry: 0, s: 1,
    }));
    await expect(s.saveOverlay!('x', { version: 2, items })).resolves.toBeUndefined();
  });

  it('★ 상한을 **먼저** 본다 — 뒤에 보면 quota 를 터뜨린 뒤라 남의 키가 이미 밀린다', async () => {
    // 총량이 한정된 저장소. 큰 문서를 **쓰고 나서** 검사하면 그 시점에 공간이 없어
    // 그 뒤 저장이 실패한다 — 실물에서 「다른 사람 프로필까지 밀어낸다」가 그 형태다.
    const store = fakeStorage({}, { quota: MAX_DOC_CHARS * 2 });
    setStorage(store);
    const s = createLocalStore();
    await s.saveOverlay!('neighbour', { keep: 'me' });

    const huge = { src: 'd'.repeat(MAX_DOC_CHARS * 2) };
    await expect(s.saveOverlay!('greedy', huge)).rejects.toMatchObject({ failure: 'too-large' });

    // ★ 거부가 **쓰기 전에** 일어났으므로 이웃이 살아 있고 공간도 남아 있다.
    expect((await s.loadOverlay('neighbour')).raw, '★ 이웃 문서가 밀려났다').toEqual({ keep: 'me' });
    await expect(s.saveOverlay!('another', { ok: 1 }), '★ 공간이 이미 잠식됐다')
      .resolves.toBeUndefined();
  });

  it('★ 브라우저가 저장을 막으면 denied — 편집 화면이 통째로 죽으면 안 된다', async () => {
    setStorage(fakeStorage({}, { denySet: true }));
    await expect(createLocalStore().saveOverlay!('x', { a: 1 }))
      .rejects.toMatchObject({ failure: 'denied' });
  });

  it('저장소가 없어도 denied 로 말한다', async () => {
    setStorage(undefined);
    await expect(createLocalStore().saveOverlay!('x', { a: 1 }))
      .rejects.toMatchObject({ failure: 'denied' });
  });
});

describe('★ 겹친 저장소 — 로컬이 배포본보다 최신이다', () => {
  /** 고정 응답 저장소 */
  function stub(name: string, table: Record<string, unknown>, authoritative = true): OverlayStore {
    return {
      name,
      authoritativeList: authoritative,
      async loadLedger() {
        return 'ledger' in table ? loaded(table.ledger) : failed('not-found');
      },
      async loadOverlay(o: string) {
        return o in table ? loaded(table[o]) : failed('not-found');
      },
    };
  }

  it('★ 로컬에 있으면 그것 — 방금 편집한 것이 매번 덮이면 저장한 의미가 없다', async () => {
    const s = createLayeredStore(stub('L', { a: { from: 'local' } }, false), stub('R', { a: { from: 'remote' } }));
    expect((await s.loadOverlay('a')).raw).toEqual({ from: 'local' });
  });

  it('로컬에 없으면 배포본으로 떨어진다', async () => {
    const s = createLayeredStore(stub('L', {}, false), stub('R', { a: { from: 'remote' } }));
    expect((await s.loadOverlay('a')).raw).toEqual({ from: 'remote' });
  });

  it('★ 둘 다 없으면 더 확정적인 사유를 남긴다 — 배포본의 「없다」가 로컬의 「모른다」보다 정보가 많다', async () => {
    const unreachableLocal: OverlayStore = {
      name: 'L', authoritativeList: false,
      async loadLedger() { return failed('unreachable'); },
      async loadOverlay() { return failed('unreachable'); },
    };
    const r = await createLayeredStore(unreachableLocal, stub('R', {})).loadOverlay('a');
    expect(r.failure).toBe('not-found');
  });

  it('★ 로컬이 섞이면 목록은 전역 진리가 아니다', () => {
    const s = createLayeredStore(stub('L', {}, false), stub('R', {}, true));
    expect(s.authoritativeList, '★ 겹친 저장소가 전역 진리를 주장한다').toBe(false);
  });

  it('★ 쓰기는 로컬만 — 배포본은 원리적으로 못 쓴다', async () => {
    setStorage(fakeStorage());
    const local = createLocalStore();
    const s = createLayeredStore(local, stub('R', {}));
    await s.saveOverlay!('a', { x: 1 });
    expect((await local.loadOverlay('a')).raw).toEqual({ x: 1 });
  });

  it('로컬이 못 쓰면 겹친 것도 못 쓴다 — 있는 척하지 않는다', () => {
    const s = createLayeredStore(stub('L', {}, false), stub('R', {}));
    expect(s.saveOverlay).toBeUndefined();
  });
});

describe('경계 — 저장소는 스키마를 모른다', () => {
  it('★ decide 계약을 import 하지 않는다 — 알면 계약이 두 곳에 생긴다', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    for (const f of ['types.ts', 'static-store.ts', 'local-store.ts']) {
      const src = readFileSync(
        fileURLToPath(new URL(`../frontend/js/world2/store/${f}`, import.meta.url)), 'utf8',
      );
      const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
      expect(imports.filter((i) => i.includes('decide/')), `★ ${f} 가 계약을 안다`).toEqual([]);
      expect(imports.filter((i) => i.includes('three')), `★ ${f} 가 three 를 끈다`).toEqual([]);
    }
  });
});
