// scripts/smoke/assemble.mjs
// _site 조립 레시피를 로컬에서 재현한다. 두 방식:
//  · assembleSiteVite() = **현행 deploy.yml 을 재현한다.** 이것이 배포 경로다.
//  · assembleSite()     = frontend직조립(baseline) — **이제 어떤 배포도 재현하지 않는다.**
//
// ── baseline 의 현재 지위 (검수관 지적 2026-07-29 R3) ──────────────────────
// 이 파일은 오래도록 baseline 을 "현행", vite 를 "교체될" 로 적고 있었다. 그 서술은
// vite 전환이 끝난 시점에 뒤집혔는데 주석만 남았다. 게다가 기본 스크립트명이
// `npm run smoke`(baseline)이라, 이름만 보고 돌린 사람은 **존재하지 않는 배포
// 레이아웃**을 검사한 결과를 PASS 로 받는다. `config.mjs` 의 `BASELINE_FILE_COUNT`·
// `REQUIRED_FILES_BASELINE` 도 같이 사문화됐다.
//
// 폐지하지 않고 남기는 이유: world.html 폐기(#119) 전까지 frontend 직배치 레이아웃이
// 여전히 참조 대조군으로 쓸모가 있다. **다만 배포 게이트는 `smoke:vite` 하나다** —
// CI 가 도는 것도 그쪽이다(`ci.yml` smoke job).
//
// (생성기 실행은 run.mjs 의 검사1 에서 선행 — 여기서는 파일 배치만.)

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DEPLOY_SHA_FILE, GENERATED_ROOT_FILES, ROOT, SITE_DIR } from './config.mjs';

// ── baseline: frontend직조립 (구 deploy.yml 의 cp 재배치 — 지금은 대조군 전용) ──
// $OUT 은 대상 디렉토리(기본 _site).
const ASSEMBLE_BASELINE_SH = `
set -euo pipefail
rm -rf "$OUT" && mkdir -p "$OUT/app"
cp frontend/landing.html "$OUT/index.html"
cp frontend/guide.html   "$OUT/guide.html"
cp frontend/about.html   "$OUT/about.html"
cp -r frontend/.          "$OUT/app/"
cp -r making devlog team valuation "$OUT/"
cp sitemap.xml robots.txt "$OUT/"
touch "$OUT/.nojekyll"
`;

// ── vite 조립 — **현행 `deploy.yml` 의 조립 스텝과 1:1.** ──────────────────
// 유지보수 시 `.github/workflows/deploy.yml` 과 **반드시 함께** 갱신한다. 어긋나면
// "스모크 PASS + 배포 실패" 가 성립한다(실제로 성립해 있었다 — `|| true` 사건).
// vite build → dist(base /openartshow/, HTML rename·CSP정합·자기완결 플러그인 적용) →
// dist 를 통째 $OUT 으로 복사 → 생성기/정적(making·devlog·team·valuation·sitemap·robots·.nojekyll)
// 을 얹는다. 즉 vite _site = dist + 생성기 + 정적. (rename 은 vite 플러그인이 수행 —
// baseline 의 cp 재배치 로직이 사라진다.)
//
// `_deploy-sha.txt` 도 여기서 만든다 — **로컬이 그 줄을 밟게 하려는 것이다.**
// 처음엔 `deploy.yml` 에만 두고 "CI 배포에서만 생기는 의도된 비대칭"이라고 적었는데,
// 그러면 그 줄의 오타가 **프로덕션 배포 후에야** 드러난다(검수관 R14). 조립 레시피를
// 1:1 로 미러링하는 이유가 바로 그것을 미리 밟아보려는 것이다.
// 로컬에는 `GITHUB_SHA` 가 없으므로 `git rev-parse HEAD` 를 쓴다 — 값이 무엇이든
// `verify-live` 는 로컬에서 ④를 `skip` 하므로 충돌하지 않는다.
const ASSEMBLE_VITE_SH = `
set -euo pipefail
./node_modules/.bin/vite build
rm -rf "$OUT" && mkdir -p "$OUT"
cp -r dist/.          "$OUT/"
cp -r making devlog team valuation "$OUT/"
cp sitemap.xml robots.txt "$OUT/"
printf '%s\\n' "$(git rev-parse HEAD)" > "$OUT/$DEPLOY_SHA_FILE"
touch "$OUT/.nojekyll"
`;

/**
 * 생성기 산출물이 자리에 있는지 먼저 본다. **없으면 조립을 시작하지 않는다.**
 *
 * ── 왜 (검수관 지적 2026-07-29) ─────────────────────────────────────────────
 * 예전에는 조립 스크립트가 `cp sitemap.xml robots.txt "$OUT/" 2>/dev/null || true` 로
 * **실패를 삼켰다.** 그런데 `deploy.yml` 의 같은 줄은 `set -euo pipefail` 아래에 있어
 * **실패하면 배포가 죽는다.** 같은 줄이 정반대로 동작하고 있었다.
 *
 * 결과: 생성기가 조용히 `robots.txt` 를 안 만들면 → 스모크는 삼키고 PASS →
 * **배포에서 죽는다.** "스모크 PASS + 배포 실패" 가 성립하는 구멍이었다.
 * (`[3]` 핵심파일 목록에도 `robots.txt` 가 빠져 있어 두 겹으로 안 잡혔다.)
 *
 * 이제 삼키지 않는다. 다만 그냥 `cp` 가 죽으면 `cannot stat 'robots.txt'` 만 나와서
 * **무엇을 해야 하는지**가 안 보이므로, 여기서 먼저 확인하고 안내한다.
 * `run.mjs` 는 검사1(생성기)을 조립보다 먼저 돌리므로 정상 경로에서는 걸리지 않는다 —
 * 걸리는 것은 `measure:*` 를 클린 클론에서 단독 실행할 때다.
 */
function requireGenerated() {
  const missing = GENERATED_ROOT_FILES.filter(
    (f) => !fs.existsSync(path.join(ROOT, f)),
  );
  if (missing.length === 0) return;
  throw new Error(
    `생성기 산출물이 없다: ${missing.join(', ')}\n`
    + '  → `node scripts/build-devlog.mjs` 등을 먼저 돌려라.\n'
    + '  (deploy.yml 은 조립 전에 생성기를 돌린다 — 목록의 SSOT 는 config.mjs 의 GENERATORS 다.\n'
    + '   스모크가 그것을 재현하지 않으면 "스모크 PASS + 배포 실패" 가 성립한다.)',
  );
}

// _site 를 frontend직조립(baseline) 방식으로 조립. 실패 시 예외 전파.
export function assembleSite(targetDir = SITE_DIR) {
  requireGenerated();
  execFileSync('bash', ['-c', ASSEMBLE_BASELINE_SH], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, OUT: targetDir },
  });
}

// ── G-LOCK: `dist/` 동시 조립 경합 방지 ────────────────────────────────────
//
// **이 저장소에서 두 번 사고를 냈다**(2026-08-10). `vite build` 는 `dist/` 를 **비우고
// 다시 채운다** — 두 프로세스가 겹치면 한쪽이 **빌드 중간 상태**를 서빙하게 되고,
// 증상은 `_bundle/` 누락 · 변환 전 원본 경로 404(`app/js/world2-boot.js`) · 부팅
// 타임아웃이다. 실제로 **6항목 거짓 FAIL** 이 났고(검수관 `vite build` × executor
// `smoke:vite`), **그 뒤 부팀장이 직접 돌린 회차에도 같은 경합이 재현**됐다.
//
// 그때까지 이것을 막던 것은 **위임 프롬프트에 손으로 적는 주의문뿐**이었고 **두 번 다
// 실패했다.** 원인은 규율을 안 읽어서가 아니다 — *"브라우저는 하나씩"* 을 **브라우저
// 축으로만** 읽었고 **빌드 산출물 디렉터리 공유**라는 축을 아무도 안 봤다. 사람이
// 매번 옳게 읽어야 하는 보호는 보호가 아니므로 구조로 옮긴다.
//
// **락 스코프는 이 함수 전체다**(build + `$OUT` 복사까지, 검수관 명세). `vite build`
// 만 잠그면 *"A 가 build 를 끝내고 락 해제 → B 가 build 시작(dist 를 rm) → A 가 cp 하는
// 도중 dist 가 사라짐"* 이 그대로 남는다 — 실제 사고가 그 cp 구간을 포함한 형태였다.
//
// **의존성 0**: `mkdirSync(recursive:false)` 는 이미 존재하면 `EEXIST` 로 실패하는
// 원자적 연산이다. 자기완결 원칙상 락 라이브러리를 새로 들이지 않는다.
const LOCK_DIR = path.join(ROOT, '.smoke-vite.lock');

/**
 * stale 판정은 **시간이 아니라 PID 생존**이다(검수관 명세).
 *
 * *"오래됐으면 뺏는다"* 는 형용사이고, 느린 회차를 **정상 보유자에게서 빼앗는다**.
 * `process.kill(pid, 0)` 은 신호를 보내지 않고 **존재 여부만** 묻는 표준 관용구다 —
 * `ESRCH` 면 그 프로세스는 없다(= stale). 이것은 셀 수 있는 사실이다.
 *
 * ⚠ 못 잡는 것: **PID 재사용**. 죽은 뒤 같은 번호가 다른 프로세스에 붙으면 살아 있는
 * 것으로 보여 락이 안 풀린다. 그때는 아래 FAIL 메시지가 안내하는 수동 해제로 빠진다 —
 * **자동으로 뺏지 않는다**(자동 탈취는 이 파일이 막으려는 사고를 되살린다).
 */
function readLockHolder() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(LOCK_DIR, 'owner.json'), 'utf8'));
    try {
      process.kill(raw.pid, 0);
      return { ...raw, alive: true };
    } catch (e) {
      return { ...raw, alive: e.code !== 'ESRCH' };
    }
  } catch {
    // 락 디렉터리는 있는데 owner.json 을 못 읽는다 = 기록 직전에 죽었다. stale 로 본다.
    return null;
  }
}

/**
 * `dist/` 를 만지는 구간을 배타적으로 감싼다.
 *
 * **획득 실패 시 즉시 FAIL 한다 — 폴링하지 않는다.** `await-until.mjs` 가 세운 규율과
 * 같다: 기다림은 *"무엇을 기다리는지"* 가 분명할 때만 정당하고, 여기서 상대는 최대
 * 11분짜리 빌드다. 조용히 기다리면 **호출자는 자기가 왜 느린지 모른다.**
 *
 * 메시지에 **보유자 PID·시작시각·해제 명령**을 넣는다 — hookify 차단 메시지가 탈출로를
 * 스스로 안내하는 것과 같은 형태다. 탈출로를 안 적으면 오탐이 작업을 세운다(실제로
 * hookify 가 검수관 리뷰 명령을 두 번 막았다).
 *
 * **CI 배제 분기를 넣지 않는다**(검수관 명세). CI 러너는 job 마다 별도 VM 이라 경합이
 * 구조적으로 없어 락은 즉시 획득되고 비용이 사실상 0 이다. `if (!process.env.CI)` 로
 * 가르면 **CI 에서 한 번도 안 도는 코드 경로**가 생겨 그 자체가 새 사각이 된다.
 */
export function withDistLock(fn) {
  try {
    fs.mkdirSync(LOCK_DIR, { recursive: false });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const holder = readLockHolder();
    if (holder?.alive) {
      throw new Error(
        `dist/ 조립 락을 다른 프로세스가 쥐고 있다 — pid ${holder.pid}, 시작 ${holder.startedAt}.\n` +
          `  같은 dist/ 를 두 프로세스가 쓰면 빌드 중간 상태를 서빙해 거짓 FAIL 이 난다(실사고 2회).\n` +
          `  그 프로세스가 끝나기를 기다렸다가 다시 돌려라. 이미 죽은 것이 확실하면: rm -rf ${LOCK_DIR}`,
      );
    }
    // stale — 보유자가 죽었다. 회수하고 이어간다.
    fs.rmSync(LOCK_DIR, { recursive: true, force: true });
    fs.mkdirSync(LOCK_DIR, { recursive: false });
  }
  try {
    fs.writeFileSync(
      path.join(LOCK_DIR, 'owner.json'),
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    );
    return fn();
  } finally {
    fs.rmSync(LOCK_DIR, { recursive: true, force: true });
  }
}

// _site 를 vite 조립 방식으로 조립(vite build 포함). 실패 시 예외 전파.
export function assembleSiteVite(targetDir = SITE_DIR) {
  requireGenerated();
  return withDistLock(() => {
    execFileSync('bash', ['-c', ASSEMBLE_VITE_SH], {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, OUT: targetDir, DEPLOY_SHA_FILE: DEPLOY_SHA_FILE },
    });
  });
}

// 모드별 조립 함수 선택기.
export const ASSEMBLERS = {
  baseline: assembleSite,
  vite: assembleSiteVite,
};

// SITE_DIR 하위 일반 파일 개수를 재귀로 센다 (find -type f | wc -l 과 동치).
export function countFiles(dir = SITE_DIR) {
  let n = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) n += countFiles(p);
    else if (ent.isFile()) n += 1;
  }
  return n;
}
