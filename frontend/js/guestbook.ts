// guestbook.ts — 방명록 데이터 계층 (localStorage 영속화 + 병합)
// 소유자: guestbook / multiplayer 담당 에이전트
//
// [B-5-⑤ leaf TS 전환] 순수 로직 leaf를 strict TypeScript로 전환. 런타임 로직·값은
// 무변경(순수 타입 첨가만). [리졸브] vite.config의 .js→.ts 폴백 resolve 플러그인(감독 B안)이
// 확장자 명시 .js import를 대응 .ts로 해소하므로, 소비자 import는 .js 확장자 그대로 유지한다
// (라이브 보호파일 main.js 포함 무수정 — 이 재작업의 핵심 목표).

const MAX_NOTES = 200;
const MAX_TEXT_LEN = 120;

/** 방명록 노트 한 건. */
export interface Note {
  id: string;
  name: string;
  text: string;
  ts: number;
}

function storageKey(galleryId: string | null | undefined): string {
  return `lu-guestbook-${galleryId ?? 'shared'}`;
}

/**
 * 갤러리의 방명록 노트를 localStorage에서 불러온다.
 */
export function loadNotes(galleryId: string | null | undefined): Note[] {
  try {
    const raw = localStorage.getItem(storageKey(galleryId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => n && typeof n === 'object' && typeof n.id === 'string');
  } catch (e) {
    return [];
  }
}

/**
 * 노트 배열을 ts 내림차순 정렬, 최대 MAX_NOTES개로 절단 후 저장한다.
 */
export function saveNotes(galleryId: string | null | undefined, notes: Note[]): void {
  const sorted = [...notes].sort((a, b) => b.ts - a.ts).slice(0, MAX_NOTES);
  try {
    localStorage.setItem(storageKey(galleryId), JSON.stringify(sorted));
  } catch (e) {
    // 저장 실패(용량 초과 등)는 무시 — 방명록은 부가 기능
  }
}

/**
 * 두 노트 배열을 id 기준으로 중복 제거하며 병합, ts 내림차순으로 반환한다.
 */
export function mergeNotes(a: Note[], b: Note[]): Note[] {
  const map = new Map<string, Note>();
  for (const n of [...a, ...b]) {
    if (!n || typeof n.id !== 'string') continue;
    map.set(n.id, n);
  }
  return Array.from(map.values()).sort((x, y) => y.ts - x.ts);
}

/**
 * 새 방명록 노트를 생성한다.
 */
export function makeNote(name: string, text: string): Note {
  return {
    id: randomHexId(8),
    name: String(name || '익명').slice(0, 40),
    text: String(text || '').slice(0, MAX_TEXT_LEN),
    ts: Date.now(),
  };
}

function randomHexId(len: number): string {
  const bytes = new Uint8Array(Math.ceil(len / 2));
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, len);
}
