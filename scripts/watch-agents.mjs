#!/usr/bin/env node
// scripts/watch-agents.mjs
// 직원 현황판 — 배경에서 도는 서브에이전트가 지금 무엇을 하는지 알린다.
//
// ── 왜 이것이 있나 (실증 2026-08-04) ────────────────────────────────────────
// 검수관을 위임한 뒤 결과가 오지 않았고, 부팀장은 "실행 중" 으로 믿고 8시간 50분을
// 기다렸다. 재실행한 두 번째 검수관은 **최종 판정을 다 쓰고 정상 종료했는데** 그
// 결과가 전달되지 않았다(트랜스크립트에서 직접 건져 확인 — 판정은 승인이었다).
//
// 원인은 두 겹이었다.
//   ① 배경 태스크의 결과 반환 실패를 감지하는 축이 0. 완료 알림이 안 오면
//      "아직 도는 중" 과 구별되지 않는다.
//   ② 생사를 `tasks/<id>.output` 으로 판정했는데 그것은 **심볼릭 링크**이고 링크
//      자체의 mtime 은 생성 시각에 고정된다. 진행은 링크 대상 JSONL 에 있다 —
//      값이 아니라 재는 축이 틀렸다.
//
// ── 노이즈를 어떻게 눌렀나 ─────────────────────────────────────────────────
// 도구 호출마다 알리면 검수관 하나가 수십 개를 뿜어 대화가 도배된다. 그래서 주기마다
// 스캔해 **변화가 있을 때만** 한 줄 낸다. 감시자가 시끄러우면 꺼지고, 꺼진 감시자는
// 없는 것과 같다.
//
// ── 한계 ──────────────────────────────────────────────────────────────────
// `Monitor` 는 이 환경에서 30분이 상한이다. 재무장을 잊으면 감시가 조용히 사라지고
// 그 상태는 "아무 일 없음" 과 구별되지 않는다 — 위 사고와 같은 형태다. 그래서 상시
// 켜두는 대신 **위임 직전에 켠다**(CLAUDE.md 규율).
// 세션이 끝나면 컨테이너째 사라지므로 그 뒤는 못 본다. 이 축은 열려 있다.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const SCAN = Number(process.env.WATCH_SCAN_MS ?? 30_000);
const ALIVE = Number(process.env.WATCH_ALIVE_MS ?? 600_000); // 이 안에 갱신되면 살아있음
const STALL = Number(process.env.WATCH_STALL_MS ?? 480_000); // 무진행 경보(8분)
const REPO = process.cwd();

// 저장소를 실제로 바꾸는 도구. 이것들이 REPO 를 겨누면 붉게 띄운다 — "에이전트가
// 워킹트리를 바꿔놨는데 보고에는 안 나타난다" 가 이 프로젝트의 반복 사고다.
const WRITERS = new Set(['Edit', 'Write', 'NotebookEdit']);

/** 서브에이전트 트랜스크립트가 쌓이는 디렉터리를 찾는다. */
function findSubagentsDir() {
  if (process.env.WATCH_SUBAGENTS_DIR) return process.env.WATCH_SUBAGENTS_DIR;
  const slug = REPO.replace(/\//g, '-');
  const projectDir = path.join(os.homedir(), '.claude', 'projects', slug);
  if (!fs.existsSync(projectDir)) return null;
  // 세션이 여럿이면 가장 최근 것. 세션 디렉터리명은 UUID 라 이름으로는 못 고른다.
  const candidates = fs.readdirSync(projectDir)
    .map((name) => path.join(projectDir, name, 'subagents'))
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ p, t: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return candidates[0]?.p ?? null;
}

/** 위임 프롬프트에서 사람이 읽을 용건을 뽑는다. 마크다운 제목 줄은 건너뛴다. */
function label(text) {
  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/^[#*\->\s`]+/, '').replace(/\*\*/g, '').trim();
    if (line.length >= 12) return line.replace(/\s+/g, ' ').slice(0, 34);
  }
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 34) || '?';
}

/** 트랜스크립트 하나에서 (일감, 줄수, 마지막 도구, 경고여부)를 뽑는다. */
function brief(file) {
  let lines;
  try {
    lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  } catch {
    return null;
  }
  if (lines.length === 0) return null;

  let job = '?';
  try {
    const c = JSON.parse(lines[0])?.message?.content;
    const text = typeof c === 'string'
      ? c
      : (c ?? []).map((b) => b?.text ?? '').join(' ');
    job = label(text);
  } catch { /* 첫 줄이 깨졌으면 라벨만 포기한다 */ }

  let tool = '…';
  let warn = false;
  for (const l of lines.slice(-40).reverse()) {
    let content;
    try {
      content = JSON.parse(l)?.message?.content;
    } catch { continue; }
    if (!Array.isArray(content)) continue;
    const use = content.find((b) => b?.type === 'tool_use');
    if (!use) continue;
    const input = use.input ?? {};
    let arg;
    if (input.file_path) {
      // 저장소 경로는 상대경로로 그대로 보여준다 — basename 으로 줄이면 저장소
      // 수정과 스크래치 작업이 구별되지 않는다(실증: 확인하러 git status 를 따로 돌렸다).
      const fp = String(input.file_path);
      if (fp.startsWith(REPO)) {
        arg = path.relative(REPO, fp);
        warn = WRITERS.has(use.name);
      } else {
        arg = path.basename(fp);
      }
    } else {
      arg = input.pattern ?? input.command ?? input.description ?? '';
    }
    tool = `${use.name}(${String(arg).replace(/\s+/g, ' ').slice(0, 38)})`;
    break;
  }
  return { job, n: lines.length, tool, warn };
}

async function main() {
  const dir = findSubagentsDir();
  if (!dir) {
    console.log('현황판: 서브에이전트 디렉터리를 찾지 못했다 — WATCH_SUBAGENTS_DIR 로 지정해라.');
    process.exit(1);
  }

  const seen = new Map();     // agentId -> {n, tool, since, job}
  const ignored = new Map();  // 켤 때 이미 끝나 있던 것 -> 그때의 mtime
  let first = true;

  for (;;) {
    const now = Date.now();
    const events = [];
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
    } catch { /* 디렉터리가 잠깐 없을 수 있다 */ }

    for (const name of files) {
      const file = path.join(dir, name);
      const aid = name.replace(/^agent-/, '').slice(0, 8);
      let mt;
      try {
        mt = fs.statSync(file).mtimeMs;
      } catch { continue; }

      if (now - mt > ALIVE) {
        if (seen.has(aid)) {
          events.push(`✅ ${seen.get(aid).job} — 종료`);
          seen.delete(aid);
        }
        continue;
      }

      // 켠 시점에 이미 한동안 조용했다면 켜기 전에 끝난 에이전트다. baseline 에서
      // 빼는 것만으로는 부족하다 — 다음 스캔이 '처음 보는 것' 으로 다시 잡아 시작을
      // 알린다(실증). 파일이 다시 움직일 때까지 계속 무시한다.
      if (first) {
        if (now - mt > SCAN * 2) { ignored.set(aid, mt); continue; }
      } else if (ignored.has(aid)) {
        if (ignored.get(aid) === mt) continue;
        ignored.delete(aid);
      }

      const b = brief(file);
      if (!b) continue;
      const prev = seen.get(aid);
      // 경고는 **첫 등장에도** 붙어야 한다. 처음엔 '시작' 만 내고 경고를 다음 변화에
      // 미뤘더니, 저장소를 고치며 등장한 에이전트가 그냥 초록으로 지나갔다(실측).
      // 순수 함수가 warn=true 를 돌려주는 것과 그것이 화면에 나오는 것은 다른 일이다.
      const mark = b.warn ? '🔴' : null;
      const tail = b.warn ? ' ← 저장소 수정' : '';
      if (!prev) {
        events.push(`${mark ?? '🟢'} [${aid}] ${b.job} — 시작 · ${b.tool}${tail}`);
        seen.set(aid, { n: b.n, tool: b.tool, since: now, job: b.job, moved: false });
      } else if (b.n !== prev.n || b.tool !== prev.tool) {
        events.push(`${mark ?? '🔵'} [${aid}] ${b.job} · ${b.n}줄 · ${b.tool}${tail}`);
        seen.set(aid, { n: b.n, tool: b.tool, since: now, job: b.job, moved: true });
      } else if (prev.moved && now - prev.since > STALL) {
        // 정지 경보는 **움직이는 것을 실제로 본 뒤에만** 낸다. 처음부터 조용한 것은
        // 멈춘 게 아니라 이미 끝난 것이다.
        //
        // 이 조건이 없어서 폭주했다(실증 2026-08-04): 컨테이너가 재시작되자
        // 과거 세션 트랜스크립트 **1,009개의 mtime 이 한꺼번에 갱신됐고**, 전부
        // ALIVE 안에 들어와 "방금까지 살아 있던 에이전트" 로 잡힌 뒤 481초 후
        // 일제히 무진행 경보를 냈다. mtime 은 "그 파일이 최근에 만져졌다" 는 뜻이지
        // "그 에이전트가 최근까지 일했다" 는 뜻이 아니다 — 재는 축이 또 틀렸다.
        events.push(`🟠 [${aid}] ${b.job} — ${Math.round((now - prev.since) / 1000)}초 무진행`);
        seen.set(aid, { ...prev, since: now });
      }
    }

    if (!first) for (const e of events) console.log(e);
    first = false;
    await new Promise((r) => setTimeout(r, SCAN));
  }
}

main();
