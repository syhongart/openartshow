// scripts/nyc/capture-merge.mjs — 캡처 메타(`capture.json`) 병합. **순수 함수 + 얇은 파일 I/O.**
//
// ⚠ **왜 생겼나**: `capture.mjs` 가 `--out` 디렉터리의 `capture.json` 을 호출마다 **통째로
// 덮어썼다.** 같은 디렉터리에 여러 번 부르면 마지막 한 건만 남는다 — 2026-09-06 강도 스윕
// 회차에 V1~V4 의 메타(404 목록·바이트·`renderer.info`)가 그렇게 **유실됐고**, 남은 것이
// V4-I24 하나뿐이라 «캡처가 서로 다른가» 를 사후에 확인할 수 없었다(BOARD 부수 관측 ①).
// 스크린샷은 파일 이름이 달라 살아남았는데 메타만 사라진 것이라 유실이 눈에 안 띄었다.
//
// 그래서 이제 **읽고 → `name` 키로 병합 → 쓴다.** 깨진 파일은 덮어쓰지 않고 격리한다 —
// 덮어쓰면 그것도 유실이고, 이 파일이 존재하는 이유가 유실 방지다.
//
// 병합 규칙은 `mergeCaptureResults` 하나에 있고 `tests/nyc-capture-merge.test.ts` 가 단언한다.
import fs from 'node:fs';
import path from 'node:path';

/**
 * 캡처 한 건의 메타. `capture.mjs` 가 넣는 것은 `{name,url,errors,bytes,info}` 지만 병합이
 * 보는 것은 `name` 하나뿐이라, 나머지는 열어 둔다(필드가 늘어도 이 모듈은 안 고친다).
 * @typedef {{ name?: string } & Record<string, unknown>} CaptureResult
 */

/** 캡처 메타 파일 이름. 여기 한 곳에 있다 — `capture.mjs` 에 다시 적지 않는다. */
export const CAPTURE_FILE = 'capture.json';

/**
 * 이전 결과와 이번 결과를 `name` 키로 병합한다. **순수** — I/O 없음, 인자 무변경.
 *
 * - 같은 `name` 은 이번 것으로 **갱신**한다(다시 찍은 샷이 최신이다).
 * - 다른 `name` 은 **보존**한다(이것이 유실을 막는 축이다).
 * - 순서는 「이전에 있던 순서 → 새로 생긴 것」이다(디렉터리를 열었을 때 회차 순으로 읽힌다).
 * - `name` 이 없는 항목은 키가 없으므로 병합하지 않고 그대로 덧붙인다(버리지 않는다).
 *
 * @param {CaptureResult[]} prev 이전 `capture.json` 내용(없으면 `[]`)
 * @param {CaptureResult[]} next 이번 실행이 만든 결과
 * @returns {CaptureResult[]} 병합 결과(새 배열)
 */
export function mergeCaptureResults(prev, next) {
  const prevList = Array.isArray(prev) ? prev : [];
  const nextList = Array.isArray(next) ? next : [];

  const byName = new Map();
  for (const r of nextList) {
    if (r && typeof r.name === 'string') byName.set(r.name, r);
  }

  const out = [];
  const used = new Set();
  for (const r of prevList) {
    if (r && typeof r.name === 'string' && byName.has(r.name)) {
      out.push(byName.get(r.name));
      used.add(r.name);
    } else {
      out.push(r);   // 이번에 안 찍힌 옛 항목 — 보존한다
    }
  }
  for (const r of nextList) {
    if (r && typeof r.name === 'string' && used.has(r.name)) continue;
    out.push(r);
  }
  return out;
}

/**
 * `outDir/capture.json` 을 읽는다. 없으면 `[]`.
 *
 * **깨져 있으면 덮어쓰지 않고 `capture.json.bad-<timestamp>` 로 옮긴다** — 파싱 실패나
 * 배열이 아닌 내용은 사람이 봐야 할 사고이지 조용히 지울 것이 아니다.
 *
 * @param {string} outDir
 * @param {{now?: Date}} [opts] `now` 는 격리 파일 이름을 결정적으로 만들기 위한 주입점(테스트)
 * @returns {{prev: CaptureResult[], quarantined: string|null}} `quarantined` 는 격리 파일의 경로
 */
export function loadCaptureResults(outDir, opts = {}) {
  const file = path.join(outDir, CAPTURE_FILE);
  if (!fs.existsSync(file)) return { prev: [], quarantined: null };

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    parsed = undefined;
  }
  if (Array.isArray(parsed)) return { prev: parsed, quarantined: null };

  const stamp = (opts.now ?? new Date()).toISOString().replace(/[:.]/g, '-');
  const bad = path.join(outDir, `${CAPTURE_FILE}.bad-${stamp}`);
  fs.renameSync(file, bad);
  return { prev: [], quarantined: bad };
}

/**
 * 이번 결과를 기존 `capture.json` 에 병합해 쓴다.
 *
 * @param {string} outDir
 * @param {CaptureResult[]} next
 * @param {{now?: Date}} [opts]
 * @returns {{merged: CaptureResult[], quarantined: string|null, file: string}}
 */
export function writeCaptureResults(outDir, next, opts = {}) {
  const { prev, quarantined } = loadCaptureResults(outDir, opts);
  const merged = mergeCaptureResults(prev, next);
  const file = path.join(outDir, CAPTURE_FILE);
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
  return { merged, quarantined, file };
}
