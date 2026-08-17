// @vitest-environment node
//
// `frontend/js/world-shared/` 의 **경계 규칙 R1~R4** (팀장 지정, 2026-08-16).
//
// ── 왜 이 파일이 구조와 같은 커밋에 들어왔나 (팀장 조건 C4) ──────────────────
// *"R1~R4 는 `world-shared/` 가 생기는 그 커밋에 함께 들어간다. 디렉터리가 먼저 생기고
//   규칙이 나중에 오면 **무규칙 기간**이 생긴다 — 그 기간의 import 하나가 기정사실이 된다."*
//
// ── 이 규칙들이 지키는 것 ────────────────────────────────────────────────────
// world2·3·5 는 의도적으로 포크된 세 세계다. 그런데 `glb-city.ts` 가 842/865/865 줄로
// **거의 같은 세 벌**이었고 차이는 세계 이름 3곳 + 재질 처리 인라인 복제뿐이었다
// (백로그 #47). 한 곳을 고치면 나머지 둘이 조용히 낡는다 — 감독이 지적한 그 문제다.
//
// 공유로 올리면 그 문제는 풀리지만 **새 위험이 열린다**: 공유 모듈이 특정 세계를 알게
// 되거나, 세계끼리 서로를 import 하기 시작하면 「독립된 세 세계」라는 전제가 무너진다.
// R1~R4 가 그 문을 닫는다.
//
// ⚠ **`tests/world2-boundary.test.ts` 와 다른 관심사다.** 그쪽은 world2 ↔ world1(라이브)
// 경계를 본다. 이 파일은 **세계들 사이와 공유 모듈**을 본다 — 한 파일에 넣으면 «어느
// 경계가 깨졌는지» 가 실패 메시지에서 안 갈린다.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'frontend', 'js');
const SHARED = path.join(JS, 'world-shared');

/** 세계 디렉터리 이름. 새 세계가 생기면 여기 한 줄이고, 규칙은 저절로 따라온다. */
const WORLDS = ['world2', 'world3', 'world5'] as const;

/** 라이브 런타임(보호 파일 포함) — R4 가 이쪽에서 공유로 가는 화살표를 막는다. */
const LIVE_ENTRY_FILES = ['main.js', 'player.js', 'artworks.js', 'config.ts', 'world.js', 'sky.js'];

const EXT = ['.ts', '.js', '.mjs'];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (/[/\\]vendor[/\\]/.test(p) || e.name.endsWith('.min.js')) continue;
    if (e.isDirectory()) walk(p, out);
    else if (EXT.includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

/** 그 파일의 `from '…'` · `import('…')` 지정자 전부. 주석 안 문자열은 걸러지지 않으므로
 *  판정에 쓰는 정규식은 **경로 모양**까지 요구한다(아래 각 규칙 참조). */
function importSpecs(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8');
  const out: string[] = [];
  const re = /(?:from|import\s*\()\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

const rel = (p: string): string => path.relative(ROOT, p).split(path.sep).join('/');

describe('world-shared 경계 (팀장 규칙 R1~R4)', () => {
  it('R1 — 세계끼리 직접 import 하지 않는다', () => {
    // 실측 2026-08-16: 지금 0건. **그 0을 규칙으로 동결한다** — 「지금 없다」와
    // 「생기면 막힌다」는 다른 것이고, 후자만 게이트다.
    const bad: string[] = [];
    for (const w of WORLDS) {
      for (const f of walk(path.join(JS, w))) {
        for (const spec of importSpecs(f)) {
          const other = WORLDS.filter((x) => x !== w).find((x) => spec.includes(`/${x}/`));
          if (other) bad.push(`${rel(f)} → ${spec}`);
        }
      }
    }
    expect(bad, `★ 세계 간 직접 import — 독립 전제가 깨진다:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('R2 — world-shared 는 세계 코드를 import 하지 않는다', () => {
    // **공유 모듈이 특정 세계를 알면 공유가 아니다.** 세계별 차이는 파라미터·훅 주입으로만.
    // 이것이 깨지면 «공유» 가 실은 «world2 를 나머지가 빌려 쓰는 것» 이 된다.
    const bad: string[] = [];
    for (const f of walk(SHARED)) {
      for (const spec of importSpecs(f)) {
        if (WORLDS.some((w) => spec.includes(`/${w}/`) || spec.includes(`${w}/`))) {
          bad.push(`${rel(f)} → ${spec}`);
        }
      }
    }
    expect(bad, `★ 공유 모듈이 세계를 안다:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('R3 — world-shared 의 import 는 three·자기 자신뿐이다', () => {
    // 화이트리스트. 넓히려면 **여기 한 줄을 고치는 결정**이 필요하고, 그 결정이 diff 에
    // 남는다 — 조용히 늘어나는 것을 막는 것이 이 규칙의 전부다.
    const bad: string[] = [];
    for (const f of walk(SHARED)) {
      for (const spec of importSpecs(f)) {
        const ok = spec === 'three' || spec.startsWith('three/')
          || (spec.startsWith('./') && !spec.includes('..'));
        if (!ok) bad.push(`${rel(f)} → ${spec}`);
      }
    }
    expect(bad, `★ 화이트리스트 밖 import:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('R4 — 라이브 미술관 코드는 world-shared 를 import 하지 않는다', () => {
    // 라이브가 behind-flag 세계의 리팩터에 얹히면 **보호가 무의미해진다**
    // (`main.js`·`player.js`·`artworks.js`·`config.ts` 는 감독·팀장 서명 게이트 대상이다).
    const bad: string[] = [];
    for (const name of LIVE_ENTRY_FILES) {
      const f = path.join(JS, name);
      if (!fs.existsSync(f)) continue;
      for (const spec of importSpecs(f)) {
        if (spec.includes('world-shared')) bad.push(`${rel(f)} → ${spec}`);
      }
    }
    expect(bad, `★ 라이브가 공유 모듈에 의존한다:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('공유 모듈이 실제로 존재하고 세 세계가 그것을 쓴다 — 규칙이 빈 집합을 지키지 않게', () => {
    // ⚠ **이 검사가 없으면 R1~R4 가 전부 「대상 0개」로 통과한다.** 디렉터리를 지우거나
    // 래퍼를 되돌려도 초록이 되는 것이고, 그것이 「못 잰 것이 통과로 적히는」 형태다.
    expect(fs.existsSync(SHARED), '★ world-shared 가 없다').toBe(true);
    expect(walk(SHARED).length, '★ 공유 모듈이 비었다').toBeGreaterThan(0);

    for (const w of WORLDS) {
      const wrapper = path.join(JS, w, 'features', 'glb-city.ts');
      expect(fs.existsSync(wrapper), `★ ${w} 래퍼가 없다`).toBe(true);
      const specs = importSpecs(wrapper);
      expect(specs.some((s) => s.includes('world-shared/glb-city')),
        `★ ${w} 래퍼가 공유 본체를 안 쓴다 — 복제가 되살아났을 수 있다`).toBe(true);
    }
  });
});
