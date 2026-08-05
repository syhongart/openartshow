// tests/sky-dome-follow.test.ts — 하늘 돔이 플레이어를 따라오는가.
//
// ── 왜 이 검사가 있나 (감독 실기기 2026-08-05) ───────────────────────────────
// 감독 판정: *"그 구가 너무 작아 … 별이 보이는 게 아니라 바로 앞에 있는 벽지가 보이는
// 것 같아. 그리고 하늘도 천장이 좀 가까워."*
//
// 원인은 반경이 아니라 **시차(parallax)** 였다. 돔이 원점에 고정돼 있으면 걸어갈수록
// 하늘이 다가온다. 세계 반쪽 480m · 돔 520m 이므로 세계 끝에서:
//
//     앞쪽 하늘벽 40m · 천장 200m · 안개 0%(near 51.2m 보다 가까워 감쇠가 아예 없다)
//
// `sky.js` 는 **추종을 전제로** 설계돼 있다 — `sky.add(fadeDome)` 옆 주석이
// *"sky가 카메라 추종이므로 자식으로 두면 자동 동행"* 이라고 적는다. 그런데 `sky.js`
// 자신은 돔 위치를 갱신하지 않는다(`getPos()` 는 비·눈·윤슬·무지개·오로라에만 간다).
// **계약 이행은 소비자 몫**이고, 라이브 world1 은 지켰는데 world2 만 안 지켰다.
//
// ── 이 검사의 한계 (정직하게) ────────────────────────────────────────────────
// 이것은 **소스 텍스트 검사**다. `SkySystem` 을 실제로 돌려 `dome.position` 을 보지
// 않는다(three/webgpu + sky.js 스텁 하네스가 아직 없다 — 태스크 #113 계열).
// 따라서 잡는 것은 **"그 줄이 사라지는 회귀"** 이고, 못 잡는 것은 "줄은 있는데 값이
// 틀린 경우"다. 그 축은 감독 실기기 판정으로 남는다.
//
// 그럼에도 이 검사가 필요한 이유: 결함의 실제 형태가 정확히 **"한쪽에만 있는 한 줄"**
// 이었고, 그것을 보는 축이 어디에도 없어서 감독이 화면에서 발견했다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(REPO, p), 'utf8');

describe('하늘 돔 추종 — 두 월드가 같은 계약을 지킨다', () => {
  it('라이브 world1 이 돔을 플레이어 위치로 옮긴다', () => {
    const src = read('frontend/js/world.js');
    // `sky.position.set(pos.x, 0, pos.z)` — 공백 변형을 허용한다.
    expect(
      /sky\.position\.set\(\s*pos\.x\s*,\s*0\s*,\s*pos\.z\s*\)/.test(src),
      'world1 의 돔 추종이 사라졌다 — 라이브 하늘이 고정된다',
    ).toBe(true);
  });

  it('★ world2 도 돔을 플레이어 위치로 옮긴다 — 이 줄이 없어서 감독이 벽지를 봤다', () => {
    const src = read('frontend/js/world2/systems/sky.ts');
    // world2 는 `this.dome` 을 들고 `getPos()` 결과를 지역 변수로 받는다.
    expect(
      /this\.dome\.position\.set\(\s*\w+\.x\s*,\s*0\s*,\s*\w+\.z\s*\)/.test(src),
      'world2 의 돔 추종이 없다 — 세계 끝에서 하늘벽이 40m 앞에 선다',
    ).toBe(true);
  });

  it('추종은 `update` 안에 있어야 한다 — 생성자에서 한 번 놓으면 안 따라온다', () => {
    const src = read('frontend/js/world2/systems/sky.ts');
    const i = src.indexOf('update(ctx: FrameCtx)');
    expect(i, '`update(ctx: FrameCtx)` 를 못 찾았다 — 이 검사가 딴것을 보고 있다').toBeGreaterThan(0);
    const after = src.slice(i);
    expect(
      /this\.dome\.position\.set\(/.test(after),
      '돔 추종이 update 밖에 있다 — 매 프레임 갱신되지 않으면 고정과 같다',
    ).toBe(true);
  });

  it('`sky.js` 는 돔 위치를 갱신하지 않는다 — 계약이 소비자 몫이라는 전제', () => {
    // 이 전제가 깨지면(= sky.js 가 스스로 옮기기 시작하면) 위 두 검사는 **중복 이동**을
    // 부를 수 있다. 전제를 검사로 고정해 둔다.
    const src = read('frontend/js/sky.js');
    expect(
      /\bsky\.position\s*[.=]/.test(src),
      'sky.js 가 돔 위치를 직접 만지기 시작했다 — 소비자 쪽 추종과 겹치는지 확인하라',
    ).toBe(false);
  });
});

describe('하늘 돔 반경 — 노브가 열려 있다', () => {
  it('`?dome=` 노브로 읽는다 — 감독이 화면에서 높이를 고를 수 있어야 한다', () => {
    const src = read('frontend/js/world2/systems/sky.ts');
    expect(
      /readNum\(\s*'dome'\s*,/.test(src),
      '돔 반경 노브가 없다 — 감독 판정을 받을 수단이 사라졌다',
    ).toBe(true);
  });

  // ⚠ 여기 *"상한이 카메라 far 보다 작다"* 를 **두 리터럴 비교**로 적었었다. far 를
  // `DOME_MAX` 에서 유도한 지금 그 형태로 두면 **항상 참**이 된다 — 이 저장소가 같은
  // 회차에 두 번 만든 타우톨로지(상한값 리터럴·`span/snap ∈ ℤ`)와 같은 형태다.
  //
  // 그래서 축을 바꾼다: **유도가 살아 있는가**(소스에 `DOME_MAX` 참조가 있는가)와
  // **계수가 1보다 큰가**를 본다. 리터럴로 되돌리면 첫 단언이 깨진다.
  it('★ 카메라 far 가 DOME_MAX 에서 유도된다 — 리터럴이면 한쪽만 올릴 때 하늘이 잘린다', () => {
    const main = read('frontend/js/world2/main.ts');
    // ⚠ **import 까지 본다** (검수관 RC-1). 소스에 `DOME_MAX` 토큰만 보면,
    // import 를 지우고 `const DOME_MAX = 1100` 을 **로컬 재정의**했을 때 유도가 완전히
    // 끊기는데도 통과한다 — 검수관이 뮤테이션 M4 로 실증했다(7 passed). tsc 도 안 잡는다.
    // 출처가 틀린 경우(M5)는 tsc 가 `TS2305` 로 잡으므로 이 한 줄로 둘 다 덮인다.
    expect(
      /import\s*\{[^}]*\bDOME_MAX\b[^}]*\}\s*from\s*'\.\/systems\/sky\.js'/.test(main),
      'DOME_MAX 를 sky.ts 에서 import 하지 않는다 — 로컬 재정의면 유도가 끊긴다',
    ).toBe(true);
    // ⚠ `const camera =` 로 앵커를 좁힌다 (검수관 RC-2). 그냥 `PerspectiveCamera` 를
    // 찾으면 파일 **앞줄**에 다른 카메라(프리뷰 등)가 생기는 순간 그것을 잡아
    // **유도가 멀쩡한데도 FAIL** 한다(뮤테이션 M6).
    //
    // ── ⚠ 좁힌 대가 — 거짓 FAIL **적어도** 다음 다섯 (검수관 조건 3·권고 2) ──
    // 위 두 수정이 왜 필요했는지는 적었는데 **그 대가는 안 적었다.** 다음 사람이
    // 아래 중 하나를 하면 **유도가 멀쩡한데 FAIL** 하고, 이유를 못 찾는다.
    //
    // ⚠ **"셋 다" 라고 닫아 적었다가 검수관이 둘을 더 찾았다** — 못 잡는 것을 적는
    // 규율의 취지는 목록을 닫는 게 아니라 **열어 두는** 것이다:
    //
    //   M15 `import * as THREE` 를 named import 로 바꾸거나 별칭을 바꾸면
    //       아래 `THREE\.PerspectiveCamera` 앵커가 깨진다
    //   M16 far 인자에 괄호 있는 표현(`Math.min(...)` 등)을 쓰면 `[^)]*` 가 첫 `)` 에서
    //       끊겨 `args` 가 잘린다
    //
    //
    //   M7  변수명 교체 — `const camera` → `const mainCamera` 면 앵커가 안 맞는다
    //   M11 따옴표 — 쌍따옴표 import 면 정규식이 안 맞는다. **이 저장소에는 prettier
    //       설정이 없고 `eslint.config.js` 에 quote 규칙도 없다** — 단따옴표는
    //       강제되는 것이 아니라 관습이다
    //   M13 배럴 — `ARCHITECTURE.md §4` 가 배럴 패턴을 규정하므로, 훗날
    //       `systems/index.js` 배럴이 생겨 그리로 import 하면 FAIL 한다
    //
    // 셋 다 **fail-closed** 다(거짓 PASS 가 아니라 거짓 FAIL). 그래서 블로커로 두지
    // 않았다 — 그러나 위 중 하나를 하다 여기서 막히면 **정규식을 넓히면 되는 것**이지
    // 유도가 깨진 것이 아니다.
    const m = main.match(/const camera = new THREE\.PerspectiveCamera\(([^)]*)\)/);
    expect(m, '카메라 생성부를 못 찾았다 — 이 검사가 무효다').not.toBeNull();
    const args = m![1];
    expect(
      /\bDOME_MAX\b/.test(args),
      '카메라 far 가 DOME_MAX 를 참조하지 않는다 — 두 값이 따로 살면 조용히 깨진다',
    ).toBe(true);
    // 계수가 1 이하면 돔이 far 를 넘어 잘린다.
    const k = args.match(/DOME_MAX\s*\*\s*([\d.]+)/);
    expect(k, 'DOME_MAX 에 곱하는 계수를 못 찾았다').not.toBeNull();
    expect(Number(k![1]), '계수가 1 이하다 — 돔이 카메라 far 를 넘는다').toBeGreaterThan(1);
  });

  it('DOME_MAX 가 감독 요청 4000 을 담는다 (문의 2026-08-05)', () => {
    const sky = read('frontend/js/world2/systems/sky.ts');
    const m = sky.match(/export const DOME_MAX\s*=\s*(\d+)/);
    expect(m, 'DOME_MAX 를 못 찾았다').not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(4000);
  });
});
