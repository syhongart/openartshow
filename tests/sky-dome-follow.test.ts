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

  it('상한이 카메라 far 보다 작다 — 넘으면 하늘이 잘린다', () => {
    const sky = read('frontend/js/world2/systems/sky.ts');
    const main = read('frontend/js/world2/main.ts');
    const maxM = sky.match(/DOME_MAX\s*=\s*(\d+)/);
    const farM = main.match(/PerspectiveCamera\([^)]*?,\s*[\d.]+\s*,\s*(\d+)\s*\)/);
    expect(maxM, 'DOME_MAX 를 못 찾았다').not.toBeNull();
    expect(farM, '카메라 far 를 못 찾았다 — 이 검사가 무효다').not.toBeNull();
    expect(Number(maxM![1])).toBeLessThan(Number(farM![1]));
  });
});
