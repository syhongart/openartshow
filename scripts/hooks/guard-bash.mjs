#!/usr/bin/env node
// scripts/hooks/guard-bash.mjs — Bash 명령을 실행 **전에** 규칙과 대조한다.
//
// ── 왜 hookify 규칙 파일을 직접 읽는가 (감독 지시 2026-08-07) ────────────────
// 감독: *"자주 반복 되는 실수가 있는것 같아. hookify 도구를 설치해서 실수를 줄여봐"*
//
// hookify 는 Anthropic 공식 플러그인이고 `.claude/hookify.*.local.md` 를 규칙으로 읽는다.
// 그런데 **플러그인이 설치되지 않은 환경에서는 그 파일이 아무 일도 하지 않는다** — 이
// 저장소가 "장식" 이라 부르는 상태다(규율: 안 깨지면 게이트가 아니라 장식이다).
//
// 그래서 같은 파일을 이 훅도 읽는다. 결과:
//   · hookify 가 있으면  → hookify 가 집행 (이 훅은 같은 판정을 중복 수행할 뿐 무해)
//   · hookify 가 없으면  → 이 훅이 집행
// **규칙은 한 곳(마크다운)에만 적힌다.** 값 미러링을 만들지 않으려는 것이 요점이다 —
// 규칙을 여기 JS 에도 적으면 한쪽만 고쳐도 아무도 모른다(이 저장소의 반복 사고 형태).
//
// ── 규약 ────────────────────────────────────────────────────────────────────
// stdin 으로 훅 페이로드(JSON)를 받는다. `tool_input.command` 를 각 규칙의 `pattern`
// (정규식)과 대조해:
//   action: block → **exit 2** (Claude Code 가 도구 호출을 막고 stderr 를 모델에 준다)
//   action: warn  → exit 0 + stderr 로 알림(막지는 않는다)
//
// ── 이 훅이 **못 잡는 것** (적지 않으면 관측이 장식이 된다) ──────────────────
// · Bash 이외의 경로. 파일 편집·MCP 툴로 같은 일을 하면 안 걸린다.
// · 정규식이 문자열만 본다. `eval`·변수 치환·base64 로 감싸면 통과한다. **적대적
//   우회를 막는 장치가 아니라 내가 습관으로 저지르는 것을 막는 장치다.**
// · 규칙 파일이 깨져 있으면 그 규칙만 조용히 건너뛴다 — 아래에서 그 사실을 stderr 에
//   적는다("못 읽은 것"을 "규칙 없음"으로 뭉개지 않는다).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), '.claude');

/** `---` 프런트매터를 아주 좁게 파싱한다. YAML 전체가 아니라 `키: 값` 한 줄들만 본다. */
function parseRule(text, file) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) return { file, broken: '프런트매터 구분자(---)를 못 찾았다' };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  if (!meta.pattern) return { file, broken: 'pattern 이 없다' };
  let re;
  try { re = new RegExp(meta.pattern); } catch (e) { return { file, broken: `정규식 오류: ${e.message}` }; }
  return {
    file,
    name: meta.name ?? file,
    enabled: meta.enabled !== 'false',
    event: meta.event ?? 'all',
    action: meta.action === 'block' ? 'block' : 'warn',
    re,
    body: m[2].trim(),
  };
}

function loadRules() {
  let names;
  try {
    names = readdirSync(DIR).filter((f) => f.startsWith('hookify.') && f.endsWith('.local.md'));
  } catch { return []; }
  return names.map((f) => {
    try { return parseRule(readFileSync(join(DIR, f), 'utf8'), f); } catch (e) { return { file: f, broken: String(e) }; }
  });
}

let raw = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) raw += chunk;

let payload = {};
try { payload = JSON.parse(raw || '{}'); } catch { /* 페이로드를 못 읽으면 통과시킨다 — 훅이 작업을 막는 쪽으로 실패하지 않게 */ }
const command = payload?.tool_input?.command;
if (typeof command !== 'string' || !command) process.exit(0);

/**
 * 히어독 본문을 걷어낸 사본. **규칙 대조는 이것으로 한다.**
 *
 * ── 왜 (실측 2026-08-07, 이 파일을 커밋하려다 막혔다) ───────────────────────
 * 이 훅을 넣은 커밋의 메시지에 `git commit --no-verify` 라는 **설명**이 들어 있었고,
 * 규칙이 그 글자를 보고 커밋 자체를 차단했다. 실행되는 명령이 아니라 **문서 본문**이다.
 *
 * 이 저장소는 같은 형태를 이미 알고 있다 — 태스크 #141 *"판정 기록 검사가 자기 에러
 * 메시지 인용에 거짓 FAIL 한다"*. 거기서는 미해결로 남았고, 여기서는 구조로 막는다:
 * `<<'EOF' … EOF` 본문은 셸이 **데이터로** 넘기는 것이지 실행하지 않는다.
 *
 * **한계**: 히어독만 걷는다. 따옴표 안 문자열(`echo "--no-verify"`)은 여전히 걸린다 —
 * 거기까지 파싱하려면 셸 문법을 다시 구현해야 하고, 그 복잡도가 오탐보다 위험하다.
 */
const scanned = command.replace(/<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[\s\S]*?^\2$/gm, '<<HEREDOC');

const rules = loadRules();
const broken = rules.filter((r) => r.broken);
if (broken.length) {
  // 못 읽은 규칙을 "규칙 없음" 으로 뭉개지 않는다. 조용히 넘어가면 보호가 사라진 것을 모른다.
  process.stderr.write(`[guard] 읽지 못한 규칙 ${broken.length}건: ${broken.map((b) => `${b.file}(${b.broken})`).join(', ')}\n`);
}

const hits = rules.filter((r) => !r.broken && r.enabled && (r.event === 'bash' || r.event === 'all') && r.re.test(scanned));
if (!hits.length) process.exit(0);

const blocking = hits.filter((r) => r.action === 'block');
const shown = blocking.length ? blocking : hits;
const lines = shown.map((r) => `【${r.name}】 (${r.file})\n${r.body}`).join('\n\n');
process.stderr.write(
  `${blocking.length ? '차단' : '주의'} — 이 명령이 규칙에 걸렸다:\n\n  $ ${command}\n\n${lines}\n`,
);
process.exit(blocking.length ? 2 : 0);
