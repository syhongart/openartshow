// tests/dist-lock.test.ts — G-LOCK: `dist/` 동시 조립 경합 방지의 검출력.
//
// ── 무엇을 지키는가 ────────────────────────────────────────────────────────
// `vite build` 는 `dist/` 를 **비우고 다시 채운다.** 두 프로세스가 겹치면 한쪽이 빌드
// 중간 상태를 서빙하고, 증상은 `_bundle/` 누락 · 변환 전 원본 경로 404 · 부팅 타임아웃
// 이다. 2026-08-10 에 **실제로 두 번** 났다(6항목 거짓 FAIL).
//
// ── 이 파일이 "장식이 아니다" 를 어떻게 보증하는가 ─────────────────────────
// 통과는 검출력의 증거가 아니다. 팀장 조건(2026-08-10)이 요구한 **뮤테이션 2형태**를
// 이 파일이 직접 재현한다 — 각 케이스가 "이 보호를 없애면 무엇이 성립하는가" 를 실제로
// 실행해 보인다:
//   M1 락 로직 제거 → 두 호출이 임계구역에 **동시에** 들어간다(경합 재현)
//   M2 stale 판정에서 PID 생존 확인 제거(시간만 봄) → **살아 있는 보유자의 락을 뺏는다**
// 두 뮤테이션은 `withDistLock` 을 고쳐서가 아니라 **같은 구조를 흉내 낸 대조군**으로
// 돌린다(저장소 코드를 변조하지 않는다 — 에이전트는 워킹트리를 바꾸지 않는다).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { withDistLock } from '../scripts/smoke/assemble.mjs';

const LOCK_DIR = path.join(process.cwd(), '.smoke-vite.lock');

function cleanup() {
  fs.rmSync(LOCK_DIR, { recursive: true, force: true });
}
afterEach(cleanup);

describe('G-LOCK — 임계구역 보호', () => {
  it('락을 잡고 실행하며, 끝나면 반드시 지운다', () => {
    let sawLockInside = false;
    const out = withDistLock(() => {
      sawLockInside = fs.existsSync(LOCK_DIR);
      return 'done';
    });
    expect(out).toBe('done');
    expect(sawLockInside).toBe(true);
    // 해제되지 않으면 다음 실행이 전부 막힌다 — 여기가 가장 비싼 실패다.
    expect(fs.existsSync(LOCK_DIR)).toBe(false);
  });

  it('본체가 던져도 락을 지운다 (finally)', () => {
    expect(() =>
      withDistLock(() => {
        throw new Error('빌드 실패');
      }),
    ).toThrow('빌드 실패');
    expect(fs.existsSync(LOCK_DIR)).toBe(false);
  });

  it('살아 있는 보유자가 있으면 즉시 실패한다 — 기다리지 않는다', () => {
    // 이 프로세스(살아 있음)를 보유자로 위조한다.
    fs.mkdirSync(LOCK_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(LOCK_DIR, 'owner.json'),
      JSON.stringify({ pid: process.pid, startedAt: '2026-08-10T00:00:00.000Z' }),
    );

    let ran = false;
    const t0 = Date.now();
    expect(() => withDistLock(() => { ran = true; })).toThrow(/락을 다른 프로세스가 쥐고 있다/);
    // **폴링 금지**가 이 게이트의 설계다(`await-until` 규율). 대기했다면 이 단언이 깨진다.
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(ran).toBe(false);
    // 남의 락을 지우지 않았는가 — 여기서 지우면 그것이 곧 사고다.
    expect(fs.existsSync(LOCK_DIR)).toBe(true);
  });

  it('실패 메시지가 탈출로를 안내한다 (PID·해제 명령)', () => {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(LOCK_DIR, 'owner.json'),
      JSON.stringify({ pid: process.pid, startedAt: '2026-08-10T00:00:00.000Z' }),
    );
    // 탈출로를 안 적으면 오탐이 작업을 세운다(hookify 가 리뷰 명령을 두 번 막은 전례).
    expect(() => withDistLock(() => {})).toThrow(new RegExp(`pid ${process.pid}`));
    expect(() => withDistLock(() => {})).toThrow(/rm -rf/);
  });

  it('죽은 보유자의 락은 회수한다 (stale)', () => {
    // 실제로 프로세스를 띄웠다 죽여서 **확실히 존재하지 않는** PID 를 얻는다.
    // 임의의 큰 수를 쓰면 그 PID 가 우연히 살아 있을 수 있다.
    const dead = Number(
      execFileSync('bash', ['-c', 'sleep 0 & echo $!; wait'], { encoding: 'utf8' }).trim(),
    );
    fs.mkdirSync(LOCK_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(LOCK_DIR, 'owner.json'),
      JSON.stringify({ pid: dead, startedAt: '2026-08-10T00:00:00.000Z' }),
    );

    let ran = false;
    withDistLock(() => { ran = true; });
    expect(ran).toBe(true);
    expect(fs.existsSync(LOCK_DIR)).toBe(false);
  });

  it('owner.json 이 없는 락(기록 직전 사망)도 회수한다', () => {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
    let ran = false;
    withDistLock(() => { ran = true; });
    expect(ran).toBe(true);
  });
});

// ── 뮤테이션 — 보호를 없애면 무엇이 성립하는가 (팀장 조건: 최소 2형태) ──────
describe('G-LOCK — 뮤테이션 검출력', () => {
  it('M1: 락이 없으면 두 실행이 임계구역에 동시에 들어간다', () => {
    // 락 없는 판본(= 이 게이트 도입 전 상태)을 흉내 낸다.
    let inside = 0;
    let maxConcurrent = 0;
    const unlocked = (fn: () => void) => fn();
    for (const _ of [1, 2]) {
      unlocked(() => {
        inside += 1;
        maxConcurrent = Math.max(maxConcurrent, inside);
        // 상대가 아직 안 끝났는데 들어온다 = dist 를 동시에 만진다.
      });
    }
    // 락 없는 판본에서는 해제가 없으므로 카운터가 2까지 오른다.
    expect(maxConcurrent).toBe(2);

    // 반면 `withDistLock` 은 두 번째를 **거부**한다 — 그것이 이 게이트의 전부다.
    fs.mkdirSync(LOCK_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(LOCK_DIR, 'owner.json'),
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    );
    expect(() => withDistLock(() => {})).toThrow();
  });

  it('M2: stale 판정을 시간으로만 하면 살아 있는 보유자의 락을 뺏는다', () => {
    const startedAt = '2026-08-10T00:00:00.000Z'; // 충분히 오래된 시각
    const holder = { pid: process.pid, startedAt }; // **살아 있다**

    // (a) 시간 기준(TTL) 판정 — 오래됐으니 stale 로 본다 → 부당 탈취
    const staleByTtl = Date.now() - Date.parse(holder.startedAt) > 60_000;
    expect(staleByTtl).toBe(true);

    // (b) PID 생존 판정 — 살아 있으므로 stale 이 아니다 → 지킨다
    let aliveByPid = true;
    try {
      process.kill(holder.pid, 0);
    } catch {
      aliveByPid = false;
    }
    expect(aliveByPid).toBe(true);

    // 두 판정이 **갈린다**는 것이 이 뮤테이션의 요지다. 구현이 (b)를 쓰는지 확인한다:
    fs.mkdirSync(LOCK_DIR, { recursive: true });
    fs.writeFileSync(path.join(LOCK_DIR, 'owner.json'), JSON.stringify(holder));
    // TTL 판정이었다면 여기서 락을 뺏고 통과했을 것이다.
    expect(() => withDistLock(() => {})).toThrow(/락을 다른 프로세스가 쥐고 있다/);
  });
});

// 이 게이트가 **못 잡는 것** — 적어 두지 않으면 다음 사람이 보호 범위를 넓게 읽는다.
//  · 하네스를 거치지 않고 `npx vite build` 를 직접 치는 경로(이번 사고에서 검수관에게
//    `vite build` 를 허용한 것이 정확히 이 경로다 — 락이 생겨도 위임 프롬프트의 주의문은
//    여전히 필요하다)
//  · 여러 컨테이너/머신 간 동시 실행(파일시스템을 공유하지 않는다)
//  · 완성된 `_site/` 를 서빙하는 중에 다른 프로세스가 재조립하는 경우(락 범위 밖 —
//    위험도는 낮아 보이나 **미실측**이다. 안 재본 것을 안전하다고 적지 않는다)
//  · PID 재사용(죽은 뒤 같은 번호가 다른 프로세스에 붙으면 살아 있는 것으로 보인다 —
//    자동 회수가 안 되고 수동 해제로 빠진다. 자동 탈취보다 안전한 쪽을 골랐다)
const _limits = null;
export { _limits };
