// scripts/smoke/check-filesize.mjs — 파일이 **더 커지는 것**을 막는다.
//
// ── 왜 필요한가 (감독 지시 2026-08-16) ──────────────────────────────────────
// *"파일 분리해서 **파일사이즈 폭주 안되고** 모듈 관리 잘되게 해줘"*
//
// 실측(2026-08-16): `frontend/js` 382파일 105,689줄, **500줄 초과 51개**. 그리고
// **줄 수를 검사하는 것이 저장소에 0건이었다** — `eslint.config.js`(21줄)에 `max-lines`
// 가 없고 `gate.mjs` 6종에도 없다. 그 파일 헤더가 이유를 적어 두었다:
//
//   *"17k줄 기존 코드에 대량 에러를 내지 않도록 **관대하게 시작한다** … 규칙을 점진 강화한다"*
//
// **그 강화가 오지 않았고, 그 사이 17k → 105k 가 됐다.** 「나중에 조인다」는 조이는
// 장치가 없으면 조여지지 않는다.
//
// ⚠ **ESLint 로는 이 목적을 달성할 수 없다**(실측): `eslint.config.js` 의 `files` 가
// `['**/*.{js,mjs}']` 라 **`.ts` 를 아예 안 본다.** 그런데 `world2/` 는 대부분 `.ts` 이고
// 가장 큰 파일들(`ocean.ts` 1,725 · `main.ts` 1,359)이 전부 `.ts` 다. `max-lines` 를
// 켜도 그 파일들에는 안 걸린다. TS 파서를 붙이면 되지만 그것은 새 의존성이고,
// 자체 검사는 의존성 0 이다.
//
// ── 무엇을 집행하는가 — **절대 상한이 아니라 「나빠지지 않음」이다** ────────
// 지금 51개가 이미 크다. 절대 상한만 걸면 첫날 51개가 빨간불이 되고, 그러면 아무도
// 못 켠다(그것이 ESLint 헤더가 «관대하게 시작» 한 이유이고 그 결말을 우리는 안다).
// 그래서 둘을 함께 집행한다:
//
//   ① **baseline 에 있는 파일** — 그 시점 줄 수보다 **커지면 FAIL**. 줄어드는 것은 자유
//   ② **baseline 에 없는 파일**(신규 포함) — `limit` 을 넘으면 **FAIL**
//
// 즉 **기존 부채는 동결하고 새 부채는 막는다.** baseline 이 줄어드는 것이 곧 진척이고,
// 그 진척은 `--write` 로 다시 구워 기록한다.
//
// ── `limit` 은 어떻게 정했나 — 유도값이다 ───────────────────────────────────
// **지금 파일 분포의 90퍼센타일.** «파일 열에 아홉은 이보다 작다» 를 상한으로 삼는다.
// 임의 라운드 넘버(500·1000)를 피한 이유는 이 저장소의 규율이다:
//
//   *"「실측에 여유를 얹은 값」은 근거가 아니다. 유도할 수 있는 값이면 유도한다."*
//
// 90 을 고른 근거: 상한의 목적은 «새 파일이 예외가 되지 않게» 이고, 백분위는 «대다수»
// 의 조작적 정의다. 실측 시점 분포 — 중앙값 198 · 75%p 322 · **90%p 560** · 95%p 778.
//
// ⚠ **매 실행 재계산하지 않는다.** 재계산하면 «다른 파일이 줄었다» 는 이유로 어제
// 통과한 파일이 오늘 FAIL 한다. 그래서 `limit` 도 baseline 에 **구워서** 고정하고,
// 낮추는 것은 사람이 한다(낮추는 것이 진척이다).
//
// 🔴 **이 문장은 검사 시점에만 참이고 `--write` 시점에는 거짓이다**(검수관 조건 C3,
// 2026-08-19 실측). 아래 `writeBaseline()` 이 `percentile()` 을 **이전 값과 비교 없이**
// 매번 재계산하므로, `--write` 한 번에 `limit` 이 사람 결정 없이 움직인다.
//
// 실물 회차(2026-08-19): 비행 배선에서 `player.ts` 가 **498 → 542(+44줄)** 커지자 상한이
// **512 → 522** 로 올랐고, 그 부수효과로 `npc.js`(522)가 `over` 동결 목록에서 **빠졌다**.
// 아무 경고도 없었고 구현자 보고에도 한 줄이 없었다 — 검수관이 diff 를 읽어서야 드러났다.
//
// ⚠ **이 자리에 처음 «9줄» 이라고 적었고 틀렸다**(검수관 반려 B3). 검수관이 p90 을 직접
// 재계산해 뒤집었다 — `player.ts=498` 로 두면 **512**, `+9`(507)로 둬도 **512**, 실제
// 값 542 에서만 **522** 다. **+9 로는 상한이 전혀 안 움직인다.**
//
// 🔴 **그 오차가 처방의 우선순위를 바꾼다.** 「9줄이면 10줄 오른다」는 임계가 초민감하다는
// 뜻이고, 실제로는 **한 파일이 44줄 커져야** 움직였다. 게이트 파일 헤더에 「실물 회차」라고
// 이름 붙인 틀린 숫자는 다음 사람이 그것으로 설계하게 만든다 — 이 저장소가 「게이트
// 유효성에 대한 거짓 진술」이라 부르는 그 형태이고, **미러링을 없앤 바로 그 커밋에서
// 같은 틀린 숫자를 게시판에도 복제했다.**
//
// ⚠ **임계 완화는 원래 팀장 상신 사안인데 이 경로는 아무도 모르게 지나간다.**
// 처방(`--write` 는 `over` 만 갱신하고 `limit` 은 `--write-limit` 로 가른다)은 태스크 #83.
//
// ── 대상 ────────────────────────────────────────────────────────────────────
// `frontend/js/**` + `scripts/**` 의 `.ts`·`.js`·`.mjs`. `vendor/`·`.min.js` 제외.
// **`tests/` 는 대상이 아니다** — 테스트가 긴 것은 다른 문제다(축이 많으면 길어지는
// 것이 정상이고, 그것을 줄이라고 압박하면 축을 지우게 된다. 백로그 #69 가 별도 축).
// 이 경계는 판단이므로 **여기 적어 둔다** — 다음 사람이 «왜 tests 는 빠졌나» 를 묻지
// 않게. 재론 조건: 테스트 파일이 구조적으로 못 읽을 만큼 커졌다고 검수관이 판정할 때.
//
// ── 이 검사가 **못 잡는 것** ────────────────────────────────────────────────
// · **줄 수는 복잡도가 아니다.** 300줄짜리 난해한 파일과 800줄짜리 단순 상수표는
//   이 검사에서 후자만 걸린다. 이것은 «폭주 방지» 이지 «품질 측정» 이 아니다
// · **파일을 쪼개기만 하고 총량이 그대로인 것**을 못 잡는다(그것도 진전이긴 하다)
// · **복제**를 못 잡는다 — 같은 1,700줄이 세 벌 있어도 각각은 baseline 안이다.
//   실제로 이 저장소의 진짜 부채가 그 형태다(`ocean.ts` 1725/1711/1711)
//
// ── 검출력 실측 (뮤테이션 3케이스, 2026-08-16) ──────────────────────────────
// 기준선 `436개 파일 · 상한 549줄(90퍼센타일) · 동결 43개` (PASS) 에서:
//
//   M1  baseline 에 없는 600줄 파일 투입      → FAIL  `초과 … 600줄 (상한 549)`
//   M2  동결 파일의 baseline 값을 1 낮춤       → FAIL  `커짐 world.js 2370 → 2371줄`
//       (실제 파일이 1줄 커진 것과 동치다 — 기존 파일을 안 건드리고 같은 조건을 만든다)
//   M3  baseline 파일 자체를 치움              → FAIL  `baseline 이 없다`
//
// 셋 다 종료코드 1, 복원 후 다시 0. **M3 이 특히 중요하다** — baseline 이 없을 때
// 조용히 통과하면 이 게이트는 **파일 하나만 지우면 무력화**된다. 「못 잰 것을 통과로
// 적지 않는다」가 이 저장소의 상시 위험이고, 그 형태를 검사로 막았다.
//
// 사용: `node scripts/smoke/check-filesize.mjs` (검사) / `--write` (baseline 재기록)
// 종료코드: 위반 0 → 0, 하나라도 있으면 1.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
export const BASELINE_PATH = path.join(__dirname, 'filesize-baseline.json');

/** 검사 대상 루트. 경계 근거는 헤더 「대상」 절 한 곳이다. */
const SCAN_ROOTS = ['frontend/js', 'scripts'];
const SKIP_RE = /(^|[/\\])(vendor|node_modules)([/\\]|$)|\.min\.js$/;
const EXT = ['.ts', '.js', '.mjs'];

/** 상한을 유도하는 백분위. 근거는 헤더 「limit 은 어떻게 정했나」 한 곳. */
export const LIMIT_PERCENTILE = 90;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP_RE.test(p)) continue;
    if (e.isDirectory()) walk(p, out);
    else if (EXT.includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

/** 대상 파일과 줄 수. 키는 저장소 상대경로(POSIX 구분자 — 플랫폼 간 baseline 호환). */
export function measure() {
  const sizes = new Map();
  for (const root of SCAN_ROOTS) {
    for (const abs of walk(path.join(ROOT, root))) {
      const rel = path.relative(ROOT, abs).split(path.sep).join('/');
      // `split('\n').length` 는 후행 개행을 한 줄로 더 센다. `wc -l` 과 맞춘다.
      const text = fs.readFileSync(abs, 'utf8');
      const n = text.length === 0 ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
      sizes.set(rel, n);
    }
  }
  return sizes;
}

/** 분포의 p 백분위. baseline 을 구울 때만 쓴다(검사 때는 구워진 값을 읽는다). */
export function percentile(values, p) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * s.length) - 1;
  return s[Math.max(0, Math.min(s.length - 1, idx))];
}

export function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

/**
 * 검사. baseline 이 없으면 **FAIL 이다** — 「못 잰 것을 통과로 적지 않는다」.
 *
 * 위반 종류를 나눠 반환한다. 하나로 뭉치면 «무엇을 고쳐야 하는지» 가 화면에서 안 갈린다
 * (`.GLB` 대문자 거부가 `unsafe-src` 한 종류라 원인을 알 수 없었던 그 형태).
 */
export function checkFileSize() {
  const base = readBaseline();
  if (!base) {
    return {
      ok: false,
      reason: 'no-baseline',
      grown: [], fresh: [], shrunk: [], gone: [],
      evidence: `baseline 이 없다 — \`node ${path.relative(ROOT, fileURLToPath(import.meta.url))} --write\` 로 굽는다`,
    };
  }
  const limit = base.limit;
  const over = base.over ?? {};
  const now = measure();

  const grown = [];  // baseline 에 있는데 커졌다
  const fresh = [];  // baseline 에 없는데 limit 초과
  const shrunk = []; // baseline 에 있는데 줄었다 (안내용, FAIL 아님)
  for (const [file, n] of now) {
    const was = over[file];
    if (was === undefined) {
      if (n > limit) fresh.push({ file, lines: n, limit });
    } else if (n > was) {
      grown.push({ file, lines: n, was });
    } else if (n < was) {
      shrunk.push({ file, lines: n, was });
    }
  }
  // baseline 에 있는데 지금 없는 것 — 지웠거나 이름이 바뀌었다. FAIL 은 아니지만
  // baseline 이 낡았다는 신호라 말한다(안 말하면 baseline 이 조용히 화석이 된다).
  const gone = Object.keys(over).filter((f) => !now.has(f));

  const ok = grown.length === 0 && fresh.length === 0;
  return {
    ok, reason: ok ? null : 'violation', limit, grown, fresh, shrunk, gone,
    fileCount: now.size,
    evidence: ok
      ? `${now.size}개 파일 · 상한 ${limit}줄 · 동결 ${Object.keys(over).length}개 — 커진 것 0`
      : `커진 파일 ${grown.length} · 상한 초과 신규 ${fresh.length}`,
  };
}

/** baseline 을 지금 상태로 굽는다. `limit` 은 분포에서 유도한다. */
export function writeBaseline() {
  const now = measure();
  const limit = percentile([...now.values()], LIMIT_PERCENTILE);
  const over = {};
  for (const [file, n] of [...now].sort((a, b) => b[1] - a[1])) {
    if (n > limit) over[file] = n;
  }
  const doc = {
    _: '파일 줄 수 동결 목록. scripts/smoke/check-filesize.mjs 가 읽는다. '
      + '기존 부채는 동결하고 새 부채를 막는다 — 값이 줄어드는 것이 진척이고, --write 로 다시 굽는다.',
    limit,
    limitFrom: `${LIMIT_PERCENTILE}퍼센타일 (파일 ${now.size}개 분포에서 유도)`,
    over,
  };
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  return { limit, count: Object.keys(over).length, fileCount: now.size };
}

// 단독 실행 진입점.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--write')) {
    const r = writeBaseline();
    console.log(`baseline 기록 — 파일 ${r.fileCount}개 · 상한 ${r.limit}줄(${LIMIT_PERCENTILE}퍼센타일) · 동결 ${r.count}개`);
    process.exit(0);
  }
  const r = checkFileSize();
  if (r.reason === 'no-baseline') {
    console.error(`파일 크기 FAIL — ${r.evidence}`);
    process.exit(1);
  }
  if (r.shrunk.length > 0) {
    console.log(`  ↓ ${r.shrunk.length}개가 baseline 보다 작아졌다 — \`--write\` 로 좁힐 수 있다:`);
    for (const s of r.shrunk.slice(0, 5)) console.log(`      ${s.file}  ${s.was} → ${s.lines}`);
    if (r.shrunk.length > 5) console.log(`      … 외 ${r.shrunk.length - 5}개`);
  }
  if (r.gone.length > 0) {
    console.log(`  ⚠ baseline 에 있으나 지금 없는 파일 ${r.gone.length}개 — \`--write\` 로 갱신하라`);
  }
  if (r.ok) {
    console.log(`파일 크기 OK — ${r.evidence}.`);
    process.exit(0);
  }
  console.error(`파일 크기 FAIL — ${r.evidence}:`);
  for (const g of r.grown) console.error(`  커짐   ${g.file}  ${g.was} → ${g.lines}줄`);
  for (const f of r.fresh) console.error(`  초과   ${f.file}  ${f.lines}줄 (상한 ${f.limit})`);
  console.error('');
  console.error('  감독 지시 2026-08-16 — "파일사이즈 폭주 안되고 모듈 관리 잘되게".');
  console.error('  파일을 쪼개거나, 줄일 수 없는 근거가 있으면 검수관 판정을 받아라.');
  process.exit(1);
}
