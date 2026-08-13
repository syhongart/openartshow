#!/usr/bin/env node
// scripts/generate-image.mjs — Gemini 로 이미지를 만들어 **정적 파일로 굽는다.**
//
// ── 왜 브라우저가 아니라 여기인가 ──────────────────────────────────────────
// `CLAUDE.md`: *"빌드 시점 외부 호출은 된다. CI 에서 부르고 결과를 정적 파일로 구워
// 배포하면 방문자는 우리 서버만 본다."* 홈 이미지는 **한 번 만들어 넣는 것**이지
// 방문자마다 새로 만들 것이 아니다. 그래서 키가 브라우저에 갈 이유가 없고, CSP 를
// 열 이유도 없다 — 실제로 그렇게 만들었다가 되돌렸다(`add6bbb`).
//
// ── 키 취급 ───────────────────────────────────────────────────────────────
//  · **URL 쿼리에 넣지 않는다**(`?key=`). `set -x`·에러 로그·프로세스 목록에 남는다.
//    헤더(`x-goog-api-key`)로 보낸다.
//  · **명령줄 인자로 받지 않는다.** 프로세스 목록에 노출된다. `process.env` 만 읽는다.
//  · **응답 본문을 통째로 찍지 않는다.** API 에러 본문에 키가 반향되면 GitHub 의
//    `***` 마스킹이 **변형된 문자열은 못 가린다.** 필요한 필드만 뽑아 찍는다.
//  · 키 길이·접두사도 안 찍는다(부분 노출도 노출이다).
//
// ── 첫 판본에서 반려된 것 (검수관·보안담당 2026-08-13) ─────────────────────
// 아래 넷은 *"방어가 있다"* 고 적었는데 **실측으로 뚫린** 것들이다. 각 처방 옆에
// 무엇이 뚫렸는지 적어 둔다 — 다음 사람이 이 방어를 약화시킬 때 근거를 보게.
//  ① 마스킹이 `AIza` **접두 추측**에 의존했다. `sk-proj-…` 형태의 토큰이 평문 통과
//     했다(보안담당 뮤테이션 C3). → **우리가 키 값을 갖고 있으므로 그것으로 치환**한다.
//     형식을 추측하지 않으면 형식이 바뀌어도 안 뚫린다.
//  ② `res.ok` 경로의 `JSON.parse` 가 `safeError` 를 **안 거쳤다.** 200 인데 JSON 이
//     아닌 응답(프록시 인터셉트 등)에서 Node 가 **본문 앞 10자를 에러 메시지에 반향**
//     한다(실측). → 성공 경로도 같은 함수를 거친다.
//  ③ 출력 경로에 검증이 **0** 이었다. `IMAGE_OUT=frontend/js/main.js` 가 보호파일을
//     이미지 바이너리로 덮어쓰고 **PR 까지 만들어졌다**(검수관 실측 P2). → 저장소 루트
//     하위 + 이미지 확장자만 허용. 공격 방어가 아니라 **감독의 오타 방어**다.
//  ④ 모델 선택이 응답 **배열 순서**에 의존했고 `supportedGenerationMethods` 를 안 봤다.
//     주석은 *"실제로 쓸 수 있는"* 이라고 적고 있었다 — 참인 전제에서 성립하지 않는
//     결론이다(검수관 P4).
//     ⚠⚠ **그때 넣은 처방(「지원 메서드를 보고 순서 대신 버전으로 고른다」)은 run #1 에서
//     무효화됐다.** 실물 실행이 두 가지를 보여줬다: ⓐ 버전 정렬만으로는 부족했다 —
//     이름 내림차순이라 `ultra` 가 표준을 앞섰고 그 모델이 404 였다 ⓑ **메서드가
//     `predict` 라고 말해도 호출이 되는 것은 아니다.** 그래서 지금은 **고르지 않고
//     순서를 매겨 차례로 시도한다**(`pickImageModels` + `generateWithFallback`).
//     헤더만 읽고 *"메서드를 보면 된다"* 로 읽지 마라 — 그 전제가 실물로 깨졌다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

// 생성물이 들어갈 수 있는 확장자. `.js`·`.yml` 이 없는 것이 이 화이트리스트의 요점이다
// (보호파일·워크플로 덮어쓰기가 확장자 단계에서 막힌다). `.svg` 는 **일부러 뺐다** —
// 저장소에 커밋되어 직접 URL 로 열리면 스크립트를 품을 수 있다(보안담당 ⑦).
export const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

// 8MB. git 히스토리는 파일을 지워도 blob 이 남으므로(보안담당 ⑧) 커밋 **전에** 막는다.
export const MAX_BYTES = 8 * 1024 * 1024;

// 확장자와 실제 내용이 어긋나면 거부한다. `mimeType` 은 응답이 자기 신고하는 값이라
// 그것만 믿지 않고 **바이트를 직접 본다**.
const MAGIC = [
  { ext: ['.png'], bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], label: 'PNG' },
  { ext: ['.jpg', '.jpeg'], bytes: [0xff, 0xd8, 0xff], label: 'JPEG' },
];

/**
 * 응답에서 **사람이 볼 것만** 뽑는다. 본문 전체는 절대 반환하지 않는다.
 * @param {number} status HTTP 상태
 * @param {string} body 응답 본문(그대로 반환되지 않는다)
 * @param {string} [key] 마스킹할 실제 키. 넘기면 형식과 무관하게 가려진다.
 */
export function safeError(status, body, key) {
  let reason = '';
  try {
    const parsed = JSON.parse(body);
    reason = parsed?.error?.status || parsed?.error?.message?.slice(0, 120) || '';
  } catch {
    reason = '';
  }
  return `HTTP ${status}${reason ? ` · ${maskSecrets(reason, key)}` : ''}`;
}

/**
 * 키를 가린다. **두 겹**이다.
 *  1) 실제 키 문자열 치환 — 형식을 추측하지 않으므로 키 형식이 바뀌어도 안 뚫린다.
 *  2) `AIza…` 정규식 — 우리 키가 **아닌** 다른 키가 응답에 섞여 들어올 때를 위해 남긴다.
 * 1) 을 먼저 돌리는 이유: 우리 키가 `AIza` 접두면 어느 쪽이 먼저든 같지만, 접두가
 * 바뀌어도 1) 이 잡게 하려는 것이다.
 */
export function maskSecrets(text, key) {
  let out = String(text);
  // 짧은 문자열로 split 하면 무관한 곳까지 쪼개진다 — 키다운 길이일 때만 적용한다.
  if (typeof key === 'string' && key.length >= 8) out = out.split(key).join('[KEY]');
  return out.replace(/AIza[\w-]+/g, '[KEY]');
}

/**
 * 출력 경로를 검증해 절대경로로 돌려준다.
 * 저장소 루트 **하위**여야 하고, 확장자가 화이트리스트에 있어야 한다.
 * @param {string} outPath 사용자가 준 상대/절대 경로
 * @param {string} [root] 저장소 루트(테스트에서 주입)
 */
export function resolveOutPath(outPath, root = ROOT) {
  const abs = path.resolve(root, outPath);
  const rel = path.relative(root, abs);
  // ⚠ `rel === ''`(루트 자신)은 **아래 확장자 검사와 겹친다** — 루트는 확장자가 없으므로
  //   이 줄이 없어도 거기서 걸린다(뮤테이션 M6 실측: 이 블록을 지워도 루트 케이스는
  //   안 깨졌다. 도달 불가라서가 아니라 **대신 잡아 주는 것이 있어서**다).
  //   그래도 남긴다: 확장자 화이트리스트가 나중에 넓어져도 이 조건은 그대로 유효하다.
  //   **테스트가 이 조건을 검증한다고 적지 않는다** — 검증되는 것은 `..` 계열뿐이다.
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`출력 경로가 저장소 밖이다: ${outPath}`);
  }
  const ext = path.extname(abs).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`허용되지 않은 확장자다: ${ext || '(없음)'} — ${[...ALLOWED_EXT].join(' ')} 만 된다`);
  }
  return abs;
}

/**
 * 바이트를 보고 형식을 판정하고 확장자와 일치하는지 확인한다.
 * @param {Buffer} buf
 * @param {string} ext 소문자 확장자(`.png` 등)
 */
export function assertImageBytes(buf, ext) {
  if (buf.length === 0) throw new Error('생성된 이미지가 0바이트다');
  if (buf.length > MAX_BYTES) {
    throw new Error(`생성된 이미지가 상한을 넘는다: ${Math.round(buf.length / 1024)}KB > ${MAX_BYTES / 1024}KB`);
  }
  // webp 는 `RIFF….WEBP` 라 오프셋이 떨어져 있어 따로 본다.
  if (ext === '.webp') {
    const ok = buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
    if (!ok) throw new Error('내용이 WebP 가 아니다 — 확장자와 실제 형식이 다르다');
    return 'WEBP';
  }
  const spec = MAGIC.find((m) => m.ext.includes(ext));
  if (!spec) throw new Error(`매직 바이트 규칙이 없는 확장자다: ${ext}`);
  const head = [...buf.subarray(0, spec.bytes.length)];
  if (head.length !== spec.bytes.length || spec.bytes.some((b, i) => head[i] !== b)) {
    throw new Error(`내용이 ${spec.label} 이 아니다 — 확장자와 실제 형식이 다르다`);
  }
  return spec.label;
}

/**
 * API 왕복 한 번. **`safeError` 를 실제로 소비하는 자리라 export 한다** — 순수 함수만
 * 검사하면 *"계산된 값이 실제로 소비되는가"* 가 양쪽 테스트 어디에도 안 걸린다
 * (`CLAUDE.md` 가 "판정/집행 분리의 구멍" 이라 부르는 형태. 검수관 P-1).
 * @param {typeof fetch} [fetchImpl] 테스트에서 주입한다. 기본은 전역 `fetch`.
 */
export async function call(pathname, init, key, fetchImpl = fetch) {
  const res = await fetchImpl(`${API}${pathname}`, {
    ...init,
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(safeError(res.status, text, key));
  try {
    return JSON.parse(text);
  } catch {
    // ⚠ 여기서 `e.message` 를 그대로 쓰면 **본문 앞 10자가 새어 나간다**(Node 실측).
    // 200 인데 JSON 이 아닌 응답 — 중간 프록시 인터셉트 페이지 등.
    throw new Error(`HTTP ${res.status} · 응답이 JSON 이 아니다(${text.length}바이트)`);
  }
}

/**
 * 이 키로 쓸 수 있는 이미지 생성 모델 **후보를 순서대로** 돌려준다.
 *
 * ⚠⚠ **첫 판본은 하나만 골랐고 run #1 이 그 자리에서 죽었다**(2026-08-13 실측):
 *
 *     모델: imagen-4.0-ultra-generate-001 (predict)
 *     실패: HTTP 404 · NOT_FOUND
 *
 * 두 가지가 겹쳤다. ① 이름 **내림차순** 정렬이라 `ultra`(u) 가 `generate`(g) 를 앞섰다 —
 * 재현성을 위해 넣은 정렬이 **하필 접근 안 되는 변종을 최우선으로 만들었다.**
 * ② `supportedGenerationMethods` 에 `predict` 가 있어도 **그 키로 실제 호출이 되는지는
 * 다른 일이다.** 목록이 말하는 것과 서버가 받아 주는 것이 다르고, 그 차이는 **불러 봐야만**
 * 안다. 첫 판본 주석은 *"「쓸 수 있다」를 코드가 보증한다"* 고 적었는데 **보증하지 못했다.**
 *
 * 그래서 판정을 **하나 고르기**에서 **순서 매기기**로 바꾼다. 호출부가 차례로 시도하고,
 * 실패하면 다음으로 간다. 목록만 보고 확정하지 않는다.
 *
 * 정렬 규칙(재현성은 유지한다 — 같은 응답이면 같은 순서):
 *   1. 변종보다 **표준**을 앞에 둔다(`ultra`·`fast`·`preview`·`exp` 는 뒤로).
 *      run #1 이 정확히 이 규칙의 부재로 죽었다.
 *   2. 그다음 버전 **내림차순**(`numeric` 이라 `imagen-10` 이 `imagen-4` 뒤로 안 간다).
 */
export function pickImageModels(list) {
  const models = (list || []).map((m) => ({
    name: String(m?.name || '').replace(/^models\//, ''),
    methods: Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [],
  }));
  // 응답에 메서드 목록이 아예 없는 판본을 만나면 이름만으로 판정한다. 그 사실을
  // 호출부가 로그로 남긴다 — **못 본 것을 본 것처럼 적지 않기 위해서다.**
  const hasMethods = models.some((m) => m.methods.length > 0);
  const supports = (m, method) => (hasMethods ? m.methods.includes(method) : true);

  // 특수 변종은 별도 권한·엔드포인트를 요구하는 일이 있다. 표준을 먼저 시도한다.
  // ⚠ **하이픈 경계를 쓴다**(검수관 P-1). `exp`·`fast` 는 부분 문자열이라 경계가 없으면
  //   표준 모델 이름에 우연히 들어갔을 때 오탐한다. 그리고 `experimental` 은 첫 판본에
  //   있었는데 **도달 불가**였다 — `exp` 가 먼저 매치한다(뮤테이션: 지워도 0 failed).
  //   경계를 넣으면서 `exp` 와 `experimental` 이 서로 다른 토큰이 되므로 **둘 다 적는다.**
  const VARIANT = /-(ultra|fast|preview|exp|experimental)(-|$)/i;
  const order = (a, b) =>
    (VARIANT.test(a.name) ? 1 : 0) - (VARIANT.test(b.name) ? 1 : 0)
    || b.name.localeCompare(a.name, 'en', { numeric: true });

  // ⚠⚠ **tier2 에서 imagen 을 배제한다**(검수관 B-1). `imagen` 안에 `image` 가 들어 있어
  //   `/^imagen-\d/` 와 `/image/` 가 **같은 모델에 동시 매치**한다. 이전 판본은 첫 tier 에서
  //   `return` 해 구조적으로 불가능했는데, 누적으로 바꾸면서 **내가 회귀를 만들었다.**
  //   `hasMethods=false` 면 `supports()` 가 항상 참이라 **모든 imagen 이 반드시 2배**가 되고,
  //   `imagen-x:generateContent` 는 거의 확실히 실패할 호출이라 **`failures` 목록에 구조적
  //   노이즈**를 넣는다 — 이번 개정의 존재 이유가 *"실패 사유 목록이 다음 진단의 근거"*
  //   인데 그 근거를 스스로 갉는다. 요금도 그만큼 더 나간다.
  const tiers = [
    { kind: 'predict', test: (m) => /^imagen-\d/.test(m.name) && supports(m, 'predict') },
    {
      kind: 'generateContent',
      test: (m) => /image/.test(m.name) && !/^imagen-\d/.test(m.name) && supports(m, 'generateContent'),
    },
  ];
  const candidates = [];
  for (const tier of tiers) {
    for (const m of models.filter(tier.test).sort(order)) {
      candidates.push({ model: m.name, kind: tier.kind, methods: m.methods });
    }
  }
  return { candidates, hasMethods, all: models.map((m) => m.name) };
}

/**
 * 후보를 **순서대로 시도**하고 처음 성공한 것을 돌려준다.
 *
 * ⚠ **run #1 이 이것이 없어 죽었다.** 첫 후보가 `HTTP 404 · NOT_FOUND` 를 내자 그 자리에서
 * 끝났다 — 목록에 있고 `supportedGenerationMethods` 도 맞는데 호출이 안 되는 조합이
 * 실재한다. 그 차이는 **불러 봐야만** 안다.
 *
 * `main()` 안에 두지 않고 빼낸 이유는 **검사할 수 있게 하려는 것**이다. 오늘 이 회차에서
 * 같은 형태로 세 번 걸렸다(빈 화이트리스트·유령 항목·「잡힌다」 단언).
 *
 * ⚠⚠ **그런데 잰 것은 이 함수 내부뿐이다 — `main()` 이 후보를 온전히 넘기는가는 검사 0이다**
 * (검수관 B-2 실측). `main()` 의 `generateWithFallback(candidates, …)` 를
 * `candidates.slice(0, 1)` 로 바꿔도 **101개가 전부 초록**이다. **run #1 을 죽인 바로 그
 * 형태(첫 후보만 시도)를 되살려도 게이트가 통과한다.**
 * 그러니 *"폴백을 빼냈으니 이제 검사된다"* 는 절반만 참이다 — 네 번째가 될 자리였는데
 * 실제로 절반은 네 번째가 됐다. 남은 축은 백로그 `G-FB2` 이고, 급조하지 않는 이유는
 * 6차 회차와 같다(검사를 급조하면 검출력 미확인 케이스가 또 들어온다).
 *
 * @param {Array<{model:string,kind:string}>} candidates
 * @param {(c:{model:string,kind:string}) => Promise<any>} run 실제 호출. 테스트에서 주입한다.
 * @param {(msg:string) => void} [log]
 */
export async function generateWithFallback(candidates, run, log = () => {}) {
  const failures = [];
  for (const c of candidates) {
    try {
      return { picked: c, out: await run(c), failures };
    } catch (e) {
      // `e.message` 는 `safeError` 가 이미 좁혔다(키 없음). 그대로 남긴다 —
      // 실패 사유를 안 남기면 "왜 이 모델이 됐나" 를 다음 사람이 못 본다.
      failures.push(`${c.model}: ${e.message}`);
      log(`· ${c.model}(${c.kind}) 실패 — ${e.message}. 다음 후보로 간다.`);
      // ⚠ **429(rate limit)만 즉시 멈춘다**(검수관 P-3). 다른 오류는 모델별 권한 문제라
      //   다음 후보를 시도하는 것이 맞지만, rate limit 은 **후보를 바꿔도 안 풀리고**
      //   N번 두드리면 오히려 악화된다. 나머지는 안 가른다 — 키 없음·경로 검증·`/models`
      //   조회는 전부 이 루프 **밖 앞쪽**이라 여기로 안 온다.
      if (/HTTP 429/.test(String(e.message))) {
        log('· 429 는 후보를 바꿔도 안 풀린다 — 여기서 멈춘다.');
        break;
      }
    }
  }
  return { picked: null, out: null, failures };
}

/** Imagen 계열(`:predict`)로 생성. 반환은 `{ b64, mimeType }`. */
async function genImagen(key, model, prompt, aspect) {
  const out = await call(`/models/${model}:predict`, {
    method: 'POST',
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: aspect },
    }),
  }, key);
  const p = out?.predictions?.[0];
  if (!p?.bytesBase64Encoded) throw new Error('이미지가 응답에 없다 — 모델이 이미지를 안 돌려줬다');
  return { b64: p.bytesBase64Encoded, mimeType: p.mimeType || '' };
}

/** Gemini 계열(`:generateContent`)로 생성. 반환은 `{ b64, mimeType }`. */
async function genGemini(key, model, prompt) {
  const out = await call(`/models/${model}:generateContent`, {
    method: 'POST',
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  }, key);
  const parts = out?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find((p) => p?.inlineData?.data)?.inlineData;
  if (!inline) throw new Error('이미지가 응답에 없다 — 모델이 텍스트만 돌려줬다');
  return { b64: inline.data, mimeType: inline.mimeType || '' };
}

async function main() {
  // **환경변수로만 받는다** — 명령줄 인자는 프로세스 목록에 남는다.
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('GEMINI_API_KEY 가 없다. GitHub Secrets 에 등록됐는지 확인하라.');
    process.exit(2);
  }
  const prompt = process.env.IMAGE_PROMPT;
  if (!prompt) {
    console.error('IMAGE_PROMPT 가 없다.');
    process.exit(2);
  }
  const aspect = process.env.IMAGE_ASPECT || '16:9';

  // ⚠ 경로 검증을 **API 호출 앞에** 둔다. 뒤에 두면 오타 한 번에 요금이 나가고
  // 그다음에 죽는다 — 못 쓸 경로인 것은 부르기 전에 알 수 있다.
  const abs = resolveOutPath(process.env.IMAGE_OUT || 'frontend/img/hero.png');
  const rel = path.relative(ROOT, abs);
  const ext = path.extname(abs).toLowerCase();

  const { candidates, hasMethods, all } = pickImageModels((await call('/models', { method: 'GET' }, key)).models);
  if (!candidates.length) {
    // **모델 이름만**, 그것도 앞 5개만 찍는다. 전체 목록은 이 키가 어느 티어에서
    // 무엇에 접근 가능한지를 공개 로그에 광고한다(보안담당 ⑥).
    console.error('이 키로 쓸 수 있는 이미지 생성 모델을 못 찾았다.');
    console.error(`조회된 모델 ${all.length}개 중 앞 5개: ${all.slice(0, 5).join(', ')}`);
    process.exit(1);
  }
  console.log(`후보 ${candidates.length}개: ${candidates.slice(0, 5).map((c) => `${c.model}(${c.kind})`).join(' → ')}`);
  if (!hasMethods) {
    console.log('⚠ 응답에 supportedGenerationMethods 가 없어 **이름만으로** 골랐다 — 실제 지원 여부는 확인 못 했다.');
  }

  // ⚠⚠ **후보를 순서대로 시도한다.** run #1 은 첫 후보(`imagen-4.0-ultra-generate-001`)가
  //   `HTTP 404 · NOT_FOUND` 를 내자 **그 자리에서 죽었다.** 목록에 있고 메서드도 맞는데
  //   호출이 안 되는 조합이 실재한다 — 그것은 **불러 봐야만** 안다.
  //   실패 사유를 매 후보마다 남긴다. 안 남기면 "왜 이 모델이 됐나" 를 다음 사람이 못 본다.
  const { picked, out, failures } = await generateWithFallback(
    candidates,
    (c) => (c.kind === 'predict'
      ? genImagen(key, c.model, prompt, aspect)
      : genGemini(key, c.model, prompt)),
    (m) => console.log(m),
  );
  if (!picked) {
    // ⚠ 성공 경로(`:322`)는 5개로 자르는데 여기만 전체를 찍고 있었다(검수관 P-2).
    //   그 제한의 근거는 보안담당 ⑥ — *"이 키가 어느 티어에서 무엇에 접근 가능한지를
    //   공개 로그에 광고한다"*. 실패 경로에도 같은 제한을 건다. 진단에 필요한 것은
    //   **처음 몇 개의 사유**이지 전수가 아니다.
    console.error(`후보 ${candidates.length}개가 전부 실패했다. 앞 5개 사유:`);
    for (const f of failures.slice(0, 5)) console.error(`  ${f}`);
    process.exit(1);
  }
  const { b64, mimeType } = out;
  console.log(`모델: ${picked.model} (${picked.kind})`);

  // ⚠ Gemini 계열은 `aspect` 를 안 받는다. 감독이 `9:16` 을 고르고 이 경로로 갔으면
  // **비율이 조용히 무시된 것**이고, 그것을 모르면 다시 dispatch 해서 요금이 또 나간다.
  if (picked.kind !== 'predict') {
    console.log(`⚠ 비율 '${aspect}' 는 이 모델 경로(generateContent)에서 소비되지 않았다 — 요청대로 안 나올 수 있다.`);
  }

  const buf = Buffer.from(b64, 'base64');
  const label = assertImageBytes(buf, ext);
  if (mimeType && !mimeType.startsWith('image/')) {
    throw new Error(`응답 mimeType 이 이미지가 아니다: ${mimeType}`);
  }

  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, buf);
  console.log(`저장: ${rel} (${label}, ${Math.round(buf.length / 1024)}KB, mimeType=${mimeType || '미신고'})`);
}

// import 될 때는 안 돈다(테스트가 위 함수들을 부를 수 있게).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    // `e.message` 는 `safeError` 가 이미 좁혔다 — 스택은 안 찍는다(경로 노출 최소화).
    // 그래도 **한 겹 더** 마스킹한다: 여기로 오는 예외에는 `safeError` 를 안 거친
    // 것도 섞인다(경로 검증·매직 바이트 등).
    console.error(`실패: ${maskSecrets(e.message, process.env.GEMINI_API_KEY)}`);
    process.exit(1);
  });
}
