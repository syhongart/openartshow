#!/usr/bin/env node
// scripts/await-until.mjs — **조건이 찰 때까지 기다리되, 못 물어본 것을 기다림으로 세지 않는다.**
//
// ── 왜 생겼나 (감독 지적 2026-08-07) ────────────────────────────────────────
// 감독: *"시간이 오래 걸리면 문제가 있다고 인식하고 원인을 빨리 파악하고 해결 후 다시
// 돌려야지. 끝도없이 기다리면 안되지"*
//
// 그날 부팀장이 PR CI 를 이렇게 기다렸다:
//
//     until [ "$(curl -s ... | python3 -c '... except Exception: print("wait")')" = done ]
//     do sleep 25; done
//
// **10분을 통째로 잃었다.** 원인은 CI 가 느려서가 아니었다 — 이 실행 환경의 프록시가
// `api.github.com` 으로의 CONNECT 를 **403 으로 거부**해서(실측: `curl -o /dev/null -w
// '%{http_code}'` → `403`, 같은 호스트라도 `git ls-remote` 는 통과) 첫 호출부터 단 한 번도
// 상태를 물어본 적이 없었다. 그런데 `except: print('wait')` 이 **모든 실패를 "아직 안 됐다"
// 로 뭉갰다.**
//
// 이 저장소가 이미 아는 사고 형태다. 규율은 *"못 잰 것은 통과가 아니다"* 라고 적고 있고,
// 현황판(#196)은 *"완료 알림이 안 오는 상태는 '아직 도는 중' 과 구별되지 않는다"* 때문에
// 생겼다. 같은 실수를 **대기 루프에서** 반복했다.
//
// ── 규약 ────────────────────────────────────────────────────────────────────
// probe 명령의 종료코드가 곧 답이다:
//
//   0        조건 충족 — 즉시 성공 종료
//   1        아직 아님 — 다음 회차를 기다린다
//   그 외     **물어보지 못했다** — 즉시 중단하고 출력을 보여준다
//
// 2 이상을 "아직 아님" 으로 취급하지 않는 것이 이 파일의 전부다. 그리고 **첫 회차가
// 오류면 한 번도 안 기다리고 죽는다** — 30초 뒤에 아는 것과 10분 뒤에 아는 것의 차이다.
//
// ── 쓰는 법 ─────────────────────────────────────────────────────────────────
//   node scripts/await-until.mjs --timeout 900 --every 20 \
//     --probe 'git ls-remote origin gh-pages > /tmp/ls || exit 3;
//              grep -q <sha> /tmp/ls && exit 0 || exit 1'
//
// **조회 실패와 "아직 아님" 을 probe 안에서 반드시 갈라라.** 조회 명령의 종료코드를 먼저
// 보고(`|| exit 3`), 그 뒤에 내용을 판정한다.
//
// > **첫 판본의 예시가 정확히 그 구멍을 갖고 있었다 (검수관 반려 B5, 2026-08-08).**
// > 그것은 이랬다:
// >
// >     --probe 'git ls-remote origin gh-pages | grep -q <sha> && exit 1 || exit 0'
// >
// > `git ls-remote` 가 죽어도 파이프 뒤의 `grep -q` 가 exit 1 을 내고 `|| exit 0` 이 그걸
// > **「충족」으로 바꾼다.** 실측: 없는 리모트를 넣었더니 0초 1회차에 `[await] 충족` 이
// > 나왔다. **이것은 원래 사고보다 나쁘다** — `except: print('wait')` 은 실패를 *"아직"* 으로
// > 뭉개 10분을 잃었지만, 이 예시는 실패를 *"됐다"* 로 뭉개 **거짓 통과**를 만든다.
// > 규약(아래 0/1/그 외)은 실측대로 옳았고, **구멍은 규약이 아니라 그 위에 얹은 예시**에
// > 있었다. 그래서 예시를 파이프·`|| exit 0` 없는 형태로 바꾸고, probe 셸에 `pipefail` 을
// > 켜고(아래 `spawnSync`), 이 성질을 `tests/await-until.test.ts` 가 지키게 했다.
//
// **`curl` 로 조건을 쓸 때는 `--fail` 을 반드시 붙여라.** 안 붙이면 403·404 에도 exit 0 이
// 나서 이 파일이 막아주려는 바로 그 구멍이 다시 열린다.

import { spawnSync } from 'node:child_process';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

const probe = arg('probe', '');
const timeoutS = Number(arg('timeout', 600));
const everyS = Number(arg('every', 20));
/** 연속 몇 회 오류를 참을 것인가. 기본 0 = 첫 오류에 중단 */
const tolerate = Number(arg('tolerate', 0));
const label = arg('label', probe.slice(0, 60));

if (!probe) {
  console.error('await-until: --probe <shell> 이 필요하다');
  process.exit(2);
}

const started = Date.now();
let round = 0;
let consecutiveErrors = 0;

/** 경과 초. `Date.now()` 를 쓰지만 이 파일은 워크플로 스크립트가 아니라 대기 유틸이다 */
const elapsed = () => Math.round((Date.now() - started) / 1000);

for (;;) {
  round++;
  // `-o pipefail` — 파이프 **중간**의 실패가 사라지지 않게 한다. 이것이 없으면
  // `조회 | grep` 형태의 probe 에서 조회가 죽어도 파이프라인 종료코드는 `grep` 것이 되고,
  // 그러면 이 파일 전체가 막으려는 "못 물어본 것을 답으로 세는" 구멍이 probe 안쪽에 다시
  // 열린다. 이 저장소는 게이트를 `| tail` 로 파이프해 종료코드를 삼킨 전례가 있다(CLAUDE.md).
  const r = spawnSync('bash', ['-o', 'pipefail', '-c', probe], { encoding: 'utf8' });
  const code = r.status;

  if (code === 0) {
    console.log(`[await] 충족 — ${label} (${round}회차, ${elapsed()}초)`);
    process.exit(0);
  }

  if (code !== 1) {
    consecutiveErrors++;
    const detail = `${(r.stderr || '').trim()}\n${(r.stdout || '').trim()}`.trim();
    if (consecutiveErrors > tolerate) {
      console.error(
        `[await] **물어보지 못했다** — probe 가 exit ${code} 로 죽었다 `
        + `(${round}회차, ${elapsed()}초, 연속 ${consecutiveErrors}회).\n`
        + `  이것은 "아직 안 됐다" 가 아니다. 기다려도 답이 오지 않는다.\n`
        + (detail ? `  probe 출력:\n${detail.split('\n').map((l) => `    ${l}`).join('\n')}\n` : '')
        + `  이 환경에서 흔한 원인: 프록시가 그 호스트로의 CONNECT 를 거부한다\n`
        + `  (실측 2026-08-07 — curl→api.github.com 은 403, git ls-remote 는 통과,\n`
        + `   GitHub 상태 조회는 MCP 툴로 해야 한다). \`curl --fail\` 을 빠뜨리지 않았는지도 보라.`,
      );
      process.exit(3);
    }
    console.log(`[await] probe 오류 exit ${code} — 남은 허용 ${tolerate - consecutiveErrors + 1}회`);
  } else {
    consecutiveErrors = 0;
  }

  if (elapsed() >= timeoutS) {
    console.error(
      `[await] 시간 초과 — ${label} (${round}회차, ${elapsed()}초 / 상한 ${timeoutS}초).\n`
      + `  **오래 걸리는 것 자체가 신호다.** 더 기다리지 말고 원인을 보라.`,
    );
    process.exit(4);
  }

  await new Promise((res) => { setTimeout(res, everyS * 1000); });
}
