#!/usr/bin/env node
// scripts/generate-image.mjs — Gemini 로 이미지를 만들어 **정적 파일로 굽는다.**
//
// ── 왜 브라우저가 아니라 여기인가 ──────────────────────────────────────────
// `CLAUDE.md`: *"빌드 시점 외부 호출은 된다. CI 에서 부르고 결과를 정적 파일로 구워
// 배포하면 방문자는 우리 서버만 본다."* 홈 이미지는 **한 번 만들어 넣는 것**이지
// 방문자마다 새로 만들 것이 아니다. 그래서 키가 브라우저에 갈 이유가 없고, CSP 를
// 열 이유도 없다 — 실제로 그렇게 만들었다가 되돌렸다(`add6bbb`).
//
// ── 키 취급 (보안담당 경계 2026-08-10) ────────────────────────────────────
//  · **URL 쿼리에 넣지 않는다**(`?key=`). `set -x`·에러 로그·프로세스 목록에 남는다.
//    헤더(`x-goog-api-key`)로 보낸다 — CORS preflight 통과도 실측됐다.
//  · **명령줄 인자로 받지 않는다.** 프로세스 목록에 노출된다. `process.env` 만 읽는다.
//  · **응답 본문을 통째로 찍지 않는다.** API 에러 본문에 키가 반향되면 GitHub 의
//    `***` 마스킹이 **변형된 문자열은 못 가린다.** 필요한 필드만 뽑아 찍는다.
//  · 키 길이·접두사도 안 찍는다(부분 노출도 노출이다).
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://generativelanguage.googleapis.com/v1beta';

/** 응답에서 **사람이 볼 것만** 뽑는다. 본문 전체는 절대 반환하지 않는다. */
function safeError(status, body) {
  let reason = '';
  try {
    reason = JSON.parse(body)?.error?.status || JSON.parse(body)?.error?.message?.slice(0, 120) || '';
  } catch {
    reason = '';
  }
  // 키가 반향될 수 있는 자리이므로 **길이를 자르고** 그대로 쓰지 않는다.
  return `HTTP ${status}${reason ? ` · ${reason.replace(/AIza[\w-]+/g, '[KEY]')}` : ''}`;
}

async function call(pathname, init, key) {
  const res = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(safeError(res.status, text));
  return JSON.parse(text);
}

/** 이 키로 **실제로 쓸 수 있는** 이미지 생성 모델을 찾는다. */
async function pickImageModel(key) {
  const data = await call('/models', { method: 'GET' }, key);
  const models = (data.models || []).map((m) => String(m.name || '').replace(/^models\//, ''));
  // 우선순위: 전용 이미지 모델 → 이미지 출력이 되는 범용 모델.
  const prefer = [
    (n) => /^imagen-\d/.test(n),
    (n) => /image/.test(n) && /generate|preview/.test(n),
    (n) => /flash.*image/.test(n),
  ];
  for (const test of prefer) {
    const hit = models.find(test);
    if (hit) return { model: hit, all: models };
  }
  return { model: null, all: models };
}

/** Imagen 계열(`:predict`)로 생성. 반환은 base64 PNG. */
async function genImagen(key, model, prompt, aspect) {
  const out = await call(`/models/${model}:predict`, {
    method: 'POST',
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: aspect },
    }),
  }, key);
  const b64 = out?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('이미지가 응답에 없다 — 모델이 이미지를 안 돌려줬다');
  return b64;
}

/** Gemini 계열(`:generateContent`)로 생성. 반환은 base64. */
async function genGemini(key, model, prompt) {
  const out = await call(`/models/${model}:generateContent`, {
    method: 'POST',
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  }, key);
  const parts = out?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p?.inlineData?.data)?.inlineData?.data;
  if (!img) throw new Error('이미지가 응답에 없다 — 모델이 텍스트만 돌려줬다');
  return img;
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
  const outPath = process.env.IMAGE_OUT || 'frontend/img/hero.png';
  const aspect = process.env.IMAGE_ASPECT || '16:9';

  const { model, all } = await pickImageModel(key);
  if (!model) {
    // **모델 이름만** 찍는다(응답 본문 전체가 아니다).
    console.error('이 키로 쓸 수 있는 이미지 생성 모델을 못 찾았다.');
    console.error(`조회된 모델 ${all.length}개: ${all.slice(0, 40).join(', ')}`);
    process.exit(1);
  }
  console.log(`모델: ${model}`);

  const b64 = /^imagen-/.test(model)
    ? await genImagen(key, model, prompt, aspect)
    : await genGemini(key, model, prompt);

  const abs = path.resolve(outPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, Buffer.from(b64, 'base64'));
  const kb = Math.round(fs.statSync(abs).size / 1024);
  console.log(`저장: ${outPath} (${kb}KB)`);
}

main().catch((e) => {
  // `e.message` 는 `safeError` 가 이미 좁혔다 — 스택은 안 찍는다(경로 노출 최소화).
  console.error(`실패: ${e.message}`);
  process.exit(1);
});
