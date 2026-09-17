// `?webgl=` · 진단 바의 「렌더 실황」 두 항목 — 감독이 **폰에서 원인을 가르는** 축.
//
// ── 왜 생겼나 (2026-09-17) ──────────────────────────────────────────────────
// 감독이 핸드폰에서 월드11 의 «유실» 을 신고했다. 감독은 **콘솔을 볼 수 없고**, 내
// 헤드리스는 **WebGL** 이라 WebGPU 전용 경로가 재현되지 않는다. 그래서 ① 백엔드를 URL 로
// 강제하는 문과 ② 사진 한 장에 찍히는 수치가 필요했다.
//
// ── 무엇을 막는가 ───────────────────────────────────────────────────────────
// ① 판정(`forceWebGLFrom` — 빈 값·별칭·「지정 안 됨」의 구별)
// ② **배선**: `adapters/renderer.ts` 가 그 판정을 실제로 부르는가(소스가 아니라 **호출**로)
// ③ 🔴 **world7 불변**: `render` 입력이 없으면 체크리스트에 두 항목이 **아예 안 생긴다**

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { forceWebGLFrom } from '../frontend/js/world-glb/decide/backend-knob.js';
import { readRawOpt } from '../frontend/js/world-glb/url-knob.js';
import { buildChecklist, type ChecklistInput } from '../frontend/js/world-glb/decide/glb-checklist.js';

describe('`?webgl=` 판정 — `forceWebGLFrom`', () => {
  it('🔴 「지정 안 됨」(`null`)만 자동 판정이다 — 이 줄이 world7·world8 의 불변을 만든다', () => {
    expect(forceWebGLFrom(null)).toBe(false);
  });

  it('`?webgl` (값 없음) 도 켜진 것이다 — 주소창에서 `=1` 을 먼저 지우는 것이 흔하다', () => {
    expect(forceWebGLFrom('')).toBe(true);
    expect(forceWebGLFrom('1')).toBe(true);
    expect(forceWebGLFrom('yes')).toBe(true);
  });

  it('명시적 꺼짐 어휘는 끈다 — 「0 을 적었는데 켜진다」가 가장 나쁜 오독이다', () => {
    for (const v of ['0', 'false', 'no', 'off', 'OFF', ' 0 ']) {
      expect(forceWebGLFrom(v), `${v} 가 켜짐으로 읽혔다`).toBe(false);
    }
  });
});

/** node 환경에는 `location` 이 없다. `url-knob` 이 읽는 그 전역을 세운다 */
function withSearch<T>(search: string, fn: () => T): T {
  const had = 'location' in globalThis;
  const prev = (globalThis as { location?: unknown }).location;
  Object.defineProperty(globalThis, 'location', { value: { search }, configurable: true, writable: true });
  try { return fn(); } finally {
    if (had) Object.defineProperty(globalThis, 'location', { value: prev, configurable: true, writable: true });
    else delete (globalThis as { location?: unknown }).location;
  }
}

describe('읽기 → 판정 경계 — `readRawOpt` 를 실제로 통과시킨다', () => {
  it('🔴 노브가 없는 세션에서는 **자동 판정 그대로**다 — world7·world8 의 불변', () => {
    expect(withSearch('?foo=1', () => forceWebGLFrom(readRawOpt('webgl')))).toBe(false);
  });

  it('⭐ `?webgl=1` 세션에서는 강제된다 — 읽기와 판정이 실제로 이어져 있다', () => {
    expect(withSearch('?webgl=1', () => forceWebGLFrom(readRawOpt('webgl')))).toBe(true);
  });

  it('⭐ `?webgl` (값 없음)도 강제된다 — `readNum` 이었으면 0 으로 읽혀 **꺼졌을** 자리다', () => {
    expect(withSearch('?webgl', () => forceWebGLFrom(readRawOpt('webgl')))).toBe(true);
  });
});

describe('배선 — 어댑터가 그 판정을 **부른다**', () => {
  // ⚠ `createRendererAdapter` 를 실제로 부르려면 WebGL 컨텍스트가 필요하고 이 환경에는
  // 없다(node·jsdom 모두). **그래서 이 검사는 소스를 읽는다** — 약한 축이라는 것을 적어
  // 둔다(CLAUDE.md: *"텍스트 검사는 「이 문자열이 있는가」까지만 본다"*). 강한 축은 감독
  // 실기기의 `?webgl=1` 링크이고 그것이 이 회차의 판정 수단이다.
  const src = readFileSync('frontend/js/world-glb/adapters/renderer.ts', 'utf8');

  it('판정 함수를 import 해서 부른다 — 어댑터가 자기 나름의 규칙을 쓰지 않는다', () => {
    expect(src).toContain("from '../decide/backend-knob.js'");
    expect(src).toContain("forceWebGLFrom(readRawOpt('webgl'))");
  });

  it('🔴 `opts.forceWebGL` 이 **이긴다** — 테스트·스모크가 URL 없이 강제할 수 있어야 한다', () => {
    expect(src).toContain('opts.forceWebGL ?? forceWebGLFrom(');
  });

  it('분기가 노브를 읽은 **뒤의 값**을 본다 — `opts.forceWebGL` 을 직접 보는 자리가 안 남았다', () => {
    // 선언줄과 독블록 인용을 뺀 나머지에 `opts.forceWebGL` 이 남아 있으면 노브가 반만 걸린다.
    const live = src.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .filter((l) => l.includes('opts.forceWebGL'));
    expect(live).toHaveLength(1);
    expect(live[0]).toContain('??');
  });
});

describe('진단 바 — 「렌더 실황」 두 항목', () => {
  const base: ChecklistInput = {
    glb: {
      meshes: 10, triangles: 100, instanced: 2, shadowDecals: 0, liftedDecals: 0,
      boxFixed: 0, boxSkipped: 0, atlasPainted: 0,
      box: { min: [-10, 0, -10], max: [10, 5, 10] },
    },
    stream: { on: 3, total: 4, ticks: 5, radius: 76.8, grid: 16 },
    map: { painted: 12, px: 256 },
    pipelines: 7,
    ahead: [],
    timeline: [{ stage: 'done', atMs: 1200 }],
    errors: [],
  };
  const labels = (i: ChecklistInput): string[] => buildChecklist(i).map((x) => x.label);

  it('🔴 `render` 가 없으면 **「백엔드」 항목이 안 생긴다** — world7 의 화면 불변', () => {
    expect(labels(base)).not.toContain('백엔드');
  });

  it('🔴 `render` 가 없으면 **「그리는 중」 항목도 안 생긴다** — 두 항목을 갈라 본다', () => {
    // 갈라 두는 이유: 한 `it` 이면 둘 중 하나만 새도 「1건 실패」로 뭉개져, 어느 항목이
    // 경계를 넘었는지 화면에 안 남는다.
    expect(labels(base)).not.toContain('그리는 중');
  });

  it('⭐ `render` 를 주면 두 항목이 생기고 **라벨을 그대로 옮긴다**(다시 판정하지 않는다)', () => {
    const items = buildChecklist({
      ...base,
      render: { backendDetail: 'webgpu-hardware', note: null, draw: 42, tri: 1322096, geometries: 99, textures: 44 },
    });
    const backend = items.find((x) => x.label === '백엔드')!;
    expect(backend.detail).toBe('webgpu-hardware');
    expect(backend.state).toBe('ok');
    // 감독이 폰에서 다음에 무엇을 누를지 화면이 말한다
    expect(backend.hint).toContain('?webgl=1');
  });

  it('`unknown` 은 초록이 아니다 — 못 잰 것은 통과가 아니다', () => {
    const items = buildChecklist({
      ...base,
      render: { backendDetail: 'unknown', note: '근거 없음', draw: 1, tri: 1, geometries: 1, textures: 1 },
    });
    const backend = items.find((x) => x.label === '백엔드')!;
    expect(backend.state).toBe('unknown');
    expect(backend.detail).toContain('근거 없음');
  });

  it('⭐ `draw === 0` 이면 **경고다** — 「섰다」와 「보인다」는 다른 일이다', () => {
    const items = buildChecklist({
      ...base,
      render: { backendDetail: 'webgl-software', draw: 0, tri: 0, geometries: 0, textures: 0 },
    });
    const drawn = items.find((x) => x.label === '그리는 중')!;
    expect(drawn.state).toBe('warn');
    // 세계(①)는 초록인데 그리는 중(⑫)만 노랗다 — 그 둘이 갈리는 것이 이 항목의 존재 이유다
    expect(items.find((x) => x.label === '세계')!.state).toBe('ok');
  });

  it('WebGL 백엔드에는 `?webgl=1` 힌트를 안 준다 — 이미 그 경로다', () => {
    const items = buildChecklist({
      ...base,
      render: { backendDetail: 'webgl-hardware', draw: 5, tri: 5, geometries: 5, textures: 5 },
    });
    expect(items.find((x) => x.label === '백엔드')!.hint).toBeUndefined();
  });
});
