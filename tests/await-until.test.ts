// `scripts/await-until.mjs` — **못 물어본 것을 기다림으로 세지 않는가.**
//
// ── 왜 이 파일이 생겼나 (검수관 반려 B5, 2026-08-08) ────────────────────────
// `await-until.mjs` 는 "대기 루프가 실패를 «아직» 으로 뭉갠" 10분 손실 사고를 막으려고
// 만들었는데, **그 파일 자체에 테스트가 0건이었다.** 그래서 헤더가 권장하는 예시가
// 정반대 구멍을 갖고 있는 것을 아무도 못 봤다:
//
//     --probe 'git ls-remote origin gh-pages | grep -q <sha> && exit 1 || exit 0'
//
// 조회가 죽어도 `grep -q` 가 exit 1 → `|| exit 0` → **「충족」**. 원래 사고는 실패를
// *"아직"* 으로 뭉개 시간을 잃었지만, 이 예시는 실패를 *"됐다"* 로 뭉개 **거짓 통과**를
// 만든다. 규약(0/1/그 외)은 옳았고 **구멍은 규약 위에 얹은 예시**에 있었다.
//
// 여기서 검사하는 것은 둘이다:
//   G-A1  probe 종료코드 → 프로세스 종료코드 매핑이 규약대로인가
//   G-A2  헤더의 «쓰는 법» 예시를 **그대로 돌렸을 때** 조회 실패가 충족으로 안 새는가

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const TOOL = 'scripts/await-until.mjs';

/** 도구를 실제로 돌린다. 대기가 끼므로 간격·상한을 최소로 준다. */
function run(probe: string, extra: string[] = []) {
  const r = spawnSync('node', [TOOL, '--probe', probe, '--every', '1', '--timeout', '2', ...extra], {
    encoding: 'utf8',
  });
  return { code: r.status ?? -1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

// ── G-A1 규약 ───────────────────────────────────────────────────────────────
// 이 매핑이 이 파일의 전부다. 0/1 만 답으로 치고 **그 외는 답이 아니라 사고**로 센다.
describe('await-until — probe 종료코드 규약', () => {
  it('probe exit 0 → 충족(0)', () => {
    const r = run('exit 0');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/충족/);
  });

  it('probe exit 1 → 아직 아님. 계속 기다리다 상한에서 4', () => {
    const r = run('exit 1');
    expect(r.code).toBe(4);
    expect(r.out).toMatch(/시간 초과/);
  });

  it('probe exit 2 → **못 물어봤다**(3). 기다리지 않고 즉시 죽는다', () => {
    const r = run('exit 2');
    expect(r.code).toBe(3);
    expect(r.out).toMatch(/물어보지 못했다/);
    // "아직 안 됐다 가 아니다" 를 사람이 읽을 수 있어야 한다 — 이 문장이 사고의 처방이다.
    expect(r.out).toMatch(/아직 안 됐다.{0,4}가 아니다/);
  });

  it('없는 명령(exit 127) 도 「아직」이 아니라 중단이다', () => {
    expect(run('nosuchcommand_xyz').code).toBe(3);
  });

  it('--probe 를 안 주면 2 로 거절한다 — 조건 없이 기다리지 않는다', () => {
    const r = spawnSync('node', [TOOL], { encoding: 'utf8' });
    expect(r.status).toBe(2);
  });

  it('--tolerate 는 오류를 그 횟수만큼만 참는다', () => {
    // 계속 오류인 probe 를 2회까지 참게 하면, 참는 동안은 안 죽고 결국 3 으로 죽는다.
    const r = run('exit 5', ['--tolerate', '2']);
    expect(r.code).toBe(3);
    expect(r.out).toMatch(/남은 허용/);
  });
});

// ── G-A2 파이프 삼킴 ────────────────────────────────────────────────────────
// 규약이 옳아도 **probe 문장 안에서** 실패가 사라지면 같은 구멍이다. 이 저장소는 게이트를
// `| tail` 로 파이프해 종료코드를 삼킨 전례를 이미 갖고 있다(CLAUDE.md).
describe('await-until — probe 안에서 실패가 사라지지 않는다', () => {
  it('파이프 앞단의 실패가 삼켜지지 않는다 (pipefail)', () => {
    // pipefail 이 없으면 파이프라인 코드는 `true` 의 0 → **거짓 충족**이 된다.
    const r = run('exit 3 | true');
    expect(r.code, '파이프 앞단 실패가 「충족」으로 새고 있다').toBe(3);
  });

  it('헤더의 «쓰는 법» 예시를 그대로 돌려도, 조회가 죽으면 충족이 아니다', () => {
    // 예시를 **파일에서 읽어** 쓴다 — 여기 다시 적으면 헤더만 고쳐도 아무도 모른다.
    const src = readFileSync(TOOL, 'utf8');
    const m = /--probe '([\s\S]*?)'/.exec(src);
    expect(m, '헤더에서 --probe 예시를 못 찾았다').not.toBeNull();

    // 주석 줄머리(`// `)를 걷고, 조회 대상을 **없는 리모트**로 바꿔 실패를 만든다.
    //
    // ⚠ `<sha>` 플레이스홀더를 **반드시 실제 토큰으로 바꾼다** (검수관 NB2, 2026-08-08).
    // 안 바꾸면 `<`·`>` 가 셸 리다이렉션으로 파싱돼 `syntax error` 로 죽고, 그러면 어느
    // 판본이든 exit≠0 이 나와 아래 단언이 **항상 참**이 된다. 실제로 헤더 예시를 반려 전
    // 구멍 판본으로 되돌려도 8 passed 였다 — **처방은 옳았고 그것을 지키는 검사만 죽어
    // 있었다.** "0이 나오면 측정기가 살아 있는지부터 확인한다" 를 여기서 또 놓쳤다.
    const probe = m![1]
      .split('\n').map((l) => l.replace(/^\s*\/\/\s?/, '')).join(' ')
      .replace(/origin gh-pages/, 'nosuchremote_xyz gh-pages')
      .replace(/<[a-z]+>/g, 'deadbeef');

    const r = run(probe);
    expect(r.code, `조회가 죽었는데 「충족」이 났다:\n${r.out}`).not.toBe(0);
    expect(r.out).not.toMatch(/충족/);
  });
});
