// scripts/lib/devlog-slug.mjs
// 개발일지 항목의 **슬러그 축**. 표시(카테고리)와 완전히 분리돼 있다.
//
// ── 왜 분리했나 ────────────────────────────────────────────────────────────
// 구 `build-devlog.mjs` 는 제목이 `★` 로 시작하면 등장 순서대로 `philosophy`·
// `philosophy-2`… 를 줬다. 두 가지가 한꺼번에 잘못돼 있었다:
//
//  ① **표시가 틀렸다.** `★` 16건 중 진짜 철학은 2건뿐인데 전부 "철학 · 고정" 으로
//     최상단에 박혔다(감독 지적: *"철학과 중복되어 복잡하다"*).
//  ② **슬러그가 불안정했다.** `pinCount` 가 파일 내 등장 순서에 의존해서, 새 `★`
//     항목이 중간에 들어가면 **뒤 슬러그가 전부 밀린다.** 즉 글 하나를 추가하는
//     것만으로 라이브 URL 여러 개가 바뀌는 구조였다.
//
// ①을 고치려고 `★` 를 표시 축에서 떼면 16개 URL 이 통째로 바뀐다 — sitemap 에 올라가
// 있고 이미 배포돼 있다. 팀장 판정: **"기존 슬러그는 유지하고 표시만 고친다."**
//
// 그래서 `★` 는 이제 **아무 데도 쓰이지 않는다.** 레거시 URL 은 동결 목록
// (`docs/devlog-legacy-slugs.json`)이 붙들고, 그 밖은 전부 `${date}-${hash6(title)}`
// 다. 새 글에 `★` 를 붙여도 `philosophy-17` 이 생기지 않는다 — ②가 구조적으로 닫힌다.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
//  · **제목을 고치면 URL 이 바뀐다.** 동결 목록의 키가 "날짜 · 제목" 이고 일반
//    슬러그도 제목 해시라, 오타 하나를 고쳐도 링크가 끊긴다. 이건 구 `hash6` 부터
//    있던 성질이고 의도한 것이다(제목이 바뀌면 다른 글이다) — 다만 **알고 고쳐라.**
//  · 날짜가 같고 제목도 같은 두 항목. `hash6` 가 충돌한다. 현재 실사례는 없다.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** 라이브 URL 동결 목록. 키 = "날짜 · 제목"(★ 전량 제거). */
export const LEGACY_SLUGS = JSON.parse(
  readFileSync(join(ROOT, 'docs/devlog-legacy-slugs.json'), 'utf8'),
).slugs;

/** djb2 — 제목이 같으면 영구 동일 슬러그 (SEO 안정성). 구 생성기에서 그대로 옮겼다. */
export function hash6(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0').slice(0, 6);
}

/**
 * @param {string} date  `YYYY-MM-DD`
 * @param {string} title `★` 를 뗀 제목
 * @returns {string} 슬러그 (확장자 없음)
 */
export function slugFor(date, title) {
  const clean = String(title).replace(/^★+\s*/, '').trim();
  return LEGACY_SLUGS[`${date} · ${clean}`] || `${date}-${hash6(clean)}`;
}
