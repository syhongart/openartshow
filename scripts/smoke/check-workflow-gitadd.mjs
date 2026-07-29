#!/usr/bin/env node
// scripts/smoke/check-workflow-gitadd.mjs
// 워크플로가 `git add` 하는 경로가 **`.gitignore` 대상인지** 검사한다.
//
// ── 왜 (2026-07-28 실제 사고) ───────────────────────────────────────────────
// 2026-07-27 생성물 구조화로 `valuation/`·`sitemap.xml` 이 `.gitignore` 에 들어갔는데
// `valuation.yml` 의 `git add` 목록은 그대로였다. ignored path 에 대한 `git add` 는
// **비영 종료**하고 Actions 기본 쉘은 `bash -e` 다 → 다음 날부터 매일 실패했다.
//
// 더 고약한 것: `git status --porcelain` 은 ignored 파일을 안 보여주므로 조건문은
// `docs/valuation-history.json` 변화로만 발화했다. **발화하는 날에만 죽는** 구조라
// 값이 안 바뀐 날은 조용히 "변경 없음 — 스킵" 으로 통과했고, 그래서 하루 늦게 발견됐다.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
//  · **셸 변수로 조립되는 경로**(`git add "$OUT/x.json"`). 정적 검사의 근본 한계다.
//    변수 참조가 보이면 WARN 만 남기고 판정하지 않는다 — 못 잰 것을 통과로도, 실패로도
//    적지 않는다.
//  · `-f`/`--force` 가 붙은 호출. 강제 추가는 의도로 본다.
//  · 워크플로가 실행 중 만드는 파일. 여기서는 저장소의 현재 `.gitignore` 만 본다.
//  · **여러 물리 줄에 걸친 한 명령.** 접힌 블록 스칼라(`run: >`)나 백슬래시 라인연속으로
//    `git add` 와 인자가 다른 줄에 있으면 재조립하지 않는다 — `runBlockLines` 가 줄
//    단위로 반환하고 `parseGitAdd` 도 줄 단위로 돈다. 이 저장소에 실사례는 없다.
//  · **공백이 든 따옴표 경로**(`git add "my file.txt"`). `split(/\s+/)` 가 토큰을 쪼갠다.
//  · 디렉터리 전용 패턴과 같은 이름의 **파일** — 거짓 FAIL 쪽이다(`ignoredAmong` 주석).
//
// ── 트리거 (중요) ───────────────────────────────────────────────────────────
// 이 검사는 `ci.yml` 의 `verify` job 에 **스텝으로** 들어간다 — 즉 **항상 돈다.**
// 워크플로 diff 에만 걸면 안 되는 이유가 있다: **이번 사고의 발단은 `.gitignore` 쪽
// 커밋이었다.** 워크플로는 그대로였고 `.gitignore` 가 움직였다. 트리거를 워크플로
// 변경으로 좁히면 재발만 잡고 **최초 발생과 같은 형태는 다시 못 잡는다.**
//
// 실행: node scripts/smoke/check-workflow-gitadd.mjs   (단독) — 종료코드로 판정
//       `checkWorkflowGitAdd()` import (스모크·CI 재사용)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');

// `git add` 뒤에 와도 경로가 아닌 것들. `.`·`-A`·`-u` 는 "전부"라서 개별 판정 대상이 아니다.
const NON_PATH_TOKENS = new Set(['.', '-A', '--all', '-u', '--update', '-p', '--patch',
  '-n', '--dry-run', '-v', '--verbose', '-i', '--interactive', '-e', '--edit',
  '--ignore-removal', '--refresh', '--renormalize', '--intent-to-add', '-N']);
const FORCE_FLAGS = new Set(['-f', '--force']);
// 명령이 끝나는 지점. 여기부터는 `git add` 의 인자가 아니다.
const TERMINATORS = new Set(['&&', '||', ';', '|', '>', '>>', '2>', '2>&1']);

/**
 * `run:` 블록의 줄만 뽑는다. 반환: [{ line, no }]
 *
 * ── 왜 줄 전체를 보면 안 되나 (실측으로 걸렸다) ─────────────────────────────
 * 처음엔 파일의 모든 줄에서 `git add` 를 찾았다. 그랬더니 이 검사를 배선하며 붙인
 * **스텝 이름** `name: Workflow git add / .gitignore 정합` 이 파싱돼 `/`·`.gitignore`
 * 가 경로 후보가 됐다. 위반 0 이 나온 것은 그 경로들이 마침 ignored 가 아니어서일
 * 뿐이고, 이름을 조금만 바꾸면 거짓 FAIL 이 난다.
 *
 * YAML 파서를 쓰지 않는 이유: `js-yaml` 은 전이 의존이고 직접 import 하면 향후
 * 깨질 여지가 있다(검수관이 `playwright-core` 로 같은 지적을 했다). `package.json`
 * 에 추가하면 lockfile 해시가 바뀌어 브라우저 캐시가 통째로 미스난다.
 * `run:` 블록 식별은 들여쓰기 규칙으로 충분하다.
 */
function runBlockLines(text) {
  const out = [];
  const lines = text.split('\n');
  let blockIndent = null; // 블록 스칼라(`run: |`) 안이면 그 최소 들여쓰기
  lines.forEach((raw, i) => {
    const no = i + 1;
    const indent = raw.length - raw.trimStart().length;
    if (blockIndent !== null) {
      // 빈 줄은 블록을 끝내지 않는다(YAML 블록 스칼라 규칙).
      if (raw.trim() === '') return;
      if (indent >= blockIndent) { out.push({ line: raw, no }); return; }
      blockIndent = null; // 들여쓰기가 얕아지면 블록 종료 — 아래로 흘려 재판정
    }
    const m = raw.match(/^\s*-?\s*run:\s*(.*)$/);
    if (!m) return;
    const rest = m[1].trim();
    if (rest === '|' || rest === '|-' || rest === '>' || rest === '>-' || rest === '') {
      blockIndent = indent + 1; // 다음 줄부터 더 깊은 들여쓰기가 블록 본문
    } else {
      out.push({ line: rest, no }); // 한 줄짜리 `run: cmd`
    }
  });
  return out;
}

/** 한 줄에서 `git add` 호출들을 뽑는다. 반환: [{ paths, vars, forced }] */
function parseGitAdd(line) {
  const calls = [];
  // `git add` 는 한 줄에 여러 번 올 수 있다(`git add a && git add b`).
  const re = /\bgit\s+add\b/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    const rest = line.slice(m.index + m[0].length);
    const paths = [];
    const vars = [];
    let forced = false;
    for (const raw of rest.split(/\s+/)) {
      const tok = raw.trim();
      if (!tok) continue;
      if (TERMINATORS.has(tok)) break;
      if (FORCE_FLAGS.has(tok)) { forced = true; continue; }
      if (NON_PATH_TOKENS.has(tok)) continue;
      if (tok === '--') continue;
      // 변수 참조·명령 치환은 정적으로 못 푼다.
      if (tok.includes('$') || tok.includes('`')) { vars.push(tok); continue; }
      if (tok.startsWith('-')) continue; // 알 수 없는 플래그는 경로가 아니다
      paths.push(tok.replace(/^["']|["']$/g, ''));
    }
    calls.push({ paths, vars, forced });
  }
  return calls;
}

/**
 * 경로들이 .gitignore 대상인지 한 번에 판정. 반환: ignored 경로 배열(원문 표기)
 *
 * ── 왜 슬래시를 붙인 형태로도 묻는가 (검수관 블로커, 실측으로 확인) ──────────
 * `git check-ignore` 는 **디렉터리 전용 패턴**(`/valuation/` 처럼 끝에 슬래시가
 * 있는 것)을 판정할 때, 인자에 슬래시가 없으면 그 경로가 **실제로 디렉터리로
 * 존재하는지** 를 본다. 존재하지 않으면 매칭되지 않는다:
 *
 *   디렉터리 없음 + `valuation`   → 미매칭
 *   디렉터리 없음 + `valuation/`  → .gitignore:105 매칭
 *   디렉터리 있음 + `valuation`   → .gitignore:105 매칭
 *
 * 그런데 이 검사가 도는 `ci.yml` 의 `verify` job 은 **생성기를 돌리지 않는다** —
 * 즉 언제나 "디렉터리 없음" 이다. 그래서 누가 `git add valuation`(슬래시 없이)로
 * **이 검사가 막으려던 바로 그 사고**를 반복해도 조용히 통과했다. 원 사고 커밋이
 * 마침 `valuation/`(슬래시 있음)이라 처음엔 안 보였다.
 *
 * 두 형태를 함께 물어 그 런타임 의존을 없앤다. 무관한 경로는 두 형태 모두
 * 미매칭이므로(실측) 거짓 FAIL 이 늘지 않는다.
 *
 * **다만 하나 남는다**: `.gitignore` 에 `foo/`(디렉터리 전용)가 있는데 `git add foo`
 * 가 **같은 이름의 파일**을 가리키면 거짓 FAIL 이 난다(실제 `git add` 는 성공한다).
 * 게이트로서는 놓치는 쪽보다 이쪽이 낫다고 보고 감수한다 — 이름 충돌 자체가
 * 드물고, 나면 그것대로 볼 만한 신호다.
 */
function ignoredAmong(paths) {
  if (!paths.length) return [];
  // 질의 형태 → 원문 경로. 슬래시 변형이 매칭돼도 메시지에는 원문을 쓴다.
  const back = new Map();
  const query = [];
  for (const p of paths) {
    back.set(p, p); query.push(p);
    if (!p.endsWith('/')) { back.set(`${p}/`, p); query.push(`${p}/`); }
  }
  const r = spawnSync('git', ['check-ignore', '--stdin'], {
    cwd: ROOT, encoding: 'utf8', input: query.join('\n'),
  });
  // exit 0 = 하나 이상 ignored, 1 = 없음, 128 = 오류
  if (r.status === 128) return [];
  const hit = new Set();
  for (const line of (r.stdout || '').split('\n')) {
    const s = line.trim();
    if (s) hit.add(back.get(s) ?? s);   // 두 형태가 다 걸려도 원문 하나로 접힌다
  }
  return [...hit];
}

export function checkWorkflowGitAdd() {
  if (!fs.existsSync(WORKFLOW_DIR)) {
    return { ok: true, evidence: '.github/workflows 없음 — 검사 대상 0' };
  }
  const files = fs.readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f)).sort();
  const violations = [];
  const warnings = [];
  let calls = 0;

  for (const f of files) {
    const text = fs.readFileSync(path.join(WORKFLOW_DIR, f), 'utf8');
    for (const { line, no } of runBlockLines(text)) {
      // **주석 줄은 건너뛴다.** 이 저장소의 `valuation.yml` 은 사고 경위를 주석으로
      // 적어두면서 `git add` 를 세 번 인용한다 — 그것을 위반으로 세면 이 검사는
      // 첫날부터 거짓 FAIL 이다(그 파일 자신이 회귀 테스트 소재다).
      if (line.trimStart().startsWith('#')) continue;
      for (const c of parseGitAdd(line)) {
        calls += 1;
        if (c.forced) continue;
        if (c.vars.length) {
          warnings.push(`${f}:${no} 변수 참조라 판정 불가 — ${c.vars.join(' ')}`);
        }
        for (const p of ignoredAmong(c.paths)) {
          violations.push(`${f}:${no} \`${p}\` 는 .gitignore 대상 — git add 가 비영 종료해 워크플로가 죽는다`);
        }
      }
    }
  }

  if (violations.length) {
    return {
      ok: false,
      evidence: `${violations.length}건 위반\n  ${violations.join('\n  ')}`
        + (warnings.length ? `\n  (판정 불가 ${warnings.length}건: ${warnings.join('; ')})` : ''),
    };
  }
  const warnNote = warnings.length ? ` · 판정 불가 ${warnings.length}건(변수 참조)` : '';
  return {
    ok: true,
    evidence: `${files.length}개 워크플로 · git add ${calls}건 — ignored 경로 0${warnNote}`,
  };
}

// 단독 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = checkWorkflowGitAdd();
  console.log(`[${r.ok ? 'PASS' : 'FAIL'}] 워크플로 git add ignore 검사 — ${r.evidence}`);
  process.exit(r.ok ? 0 : 1);
}
