// @vitest-environment jsdom
// studio-storage.ts 단위테스트 (C-2 S3) — 되돌리기 힘든 두 로직의 회귀 안전망:
//   (a) 갤러리 공유 코덱: encode → artworks.js 디코더 파리티(바이트 호환 계약).
//   (b) loadDraft 레거시 페이로드 정규화(키·기본값·uid 보존).
// jsdom 환경 — localStorage/atob 필요. 코덱 순수함수는 node globals(TextEncoder·
// CompressionStream)로 동작한다.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORAGE_KEY,
  isExternalUrl,
  encodeGalleryData,
  createStorage
} from '../frontend/js/studio-storage.js';

// ── artworks.js(보호파일) 디코더 로직을 그대로 재현한 참조 픽스처 ──
// 이 함수가 뷰어가 실제로 쓰는 규약이다 — 인코더 출력이 여기서 원복되면 바이트 호환.
function b64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function decodeGd(enc) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(enc)));
}

const SAMPLE = {
  id: 'my-show',
  name: '봄 전시 · Spring 展',
  description: '이모지 🎨 · 한글 · <특수>&"문자"',
  theme: 'sunset',
  artworks: [
    { id: 'aw-01', title: '작품 하나', artist: '홍길동', year: 2024, desc: '설명', imageUrl: 'data:image/jpeg;base64,AAAA' },
    { id: 'aw-featured-01', title: 'Featured', artist: 'A', year: 2025, desc: '', imageUrl: '', ar: 1.5, featured: true }
  ]
};

describe('studio-storage: 계약 상수 불변', () => {
  it('STORAGE_KEY 불변', () => {
    expect(STORAGE_KEY).toBe('artshow-studio-draft-v1');
  });
  it('isExternalUrl — http(s)·프로토콜상대만 외부', () => {
    expect(isExternalUrl('http://x/y.png')).toBe(true);
    expect(isExternalUrl('https://x/y.png')).toBe(true);
    expect(isExternalUrl('//x/y.png')).toBe(true);
    expect(isExternalUrl('data:image/png;base64,AA')).toBe(false);
    expect(isExternalUrl('./assets/a.png')).toBe(false);
  });
});

describe('studio-storage: 갤러리 코덱 무압축(#gd) — artworks.js 디코더 파리티', () => {
  // 압축(#gz)/buildShareFragment 라운드트립은 Blob.stream·CompressionStream이 필요해
  // node 환경 파일(tests/studio-codec.test.js)에서 검증한다(jsdom Blob은 stream 미지원).
  it('encodeGalleryData(#gd 무압축) 라운드트립 — base64url·UTF-8 바이트 호환', () => {
    const enc = encodeGalleryData(SAMPLE);
    expect(enc).not.toMatch(/[+/=]/); // base64url: +,/,= 미포함
    expect(decodeGd(enc)).toEqual(SAMPLE);
  });
});

describe('studio-storage: loadDraft 레거시 정규화', () => {
  let state, ctx, uid;
  beforeEach(() => {
    localStorage.clear();
    uid = 0;
    state = { id: '', name: '', description: '', theme: 'daylight', artworks: [] };
    ctx = {
      state: state,
      limits: { THEMES: ['daylight', 'sunset', 'night', 'auto', 'cycle'], MAX_FEATURED: 1 },
      nextUid: function () { uid += 1; return 'row-' + uid; },
      scheduleSave: null,
      rerender: null
    };
  });

  function makeStorage() {
    const saveIndicator = { classList: { add() {}, remove() {} } };
    return createStorage(ctx, { saveIndicator: saveIndicator });
  }

  it('키·기본값·uid 보존 + 무효 테마 폴백', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      id: 'my-show',
      name: '전시',
      theme: 'bogus-theme', // 화이트리스트 밖 → daylight 폴백
      artworks: [
        { title: '작품1', _srcUrl: 'http://x/y.png' },     // 누락 필드 기본값
        { title: '작품2', featured: true, ar: 1.5, year: 2020 }
      ]
    }));
    const { loadDraft } = makeStorage();
    loadDraft();

    expect(state.id).toBe('my-show');
    expect(state.name).toBe('전시');
    expect(state.description).toBe(''); // 누락 → ''
    expect(state.theme).toBe('daylight'); // 무효 → 폴백
    expect(state.artworks.length).toBe(2);

    const a0 = state.artworks[0];
    expect(a0._uid).toBe('row-1'); // uid 신규 발급
    expect(a0.year).toBe('');       // 누락 → ''
    expect(a0.desc).toBe('');
    expect(a0.imageUrl).toBe('');
    expect(a0.featured).toBe(false);
    expect(a0.ar).toBeUndefined();
    expect(a0._srcUrl).toBe('http://x/y.png'); // 보존

    const a1 = state.artworks[1];
    expect(a1._uid).toBe('row-2');
    expect(a1.featured).toBe(true);
    expect(a1.ar).toBe(1.5);
    expect(a1.year).toBe(2020);
  });

  it('빈/손상 페이로드 — 안전 무시(state 불변)', () => {
    const { loadDraft } = makeStorage();
    loadDraft(); // 저장 없음
    expect(state.artworks).toEqual([]);
    localStorage.setItem(STORAGE_KEY, '{bad json');
    loadDraft(); // 파싱 실패 → 조용히 무시
    expect(state.id).toBe('');
  });

  it('buildGalleryJson — 발행물 조립·외부URL 비움·id 부여', () => {
    state.id = 'show';
    state.name = '제목';
    state.description = '설명';
    state.theme = 'night';
    state.artworks = [
      { title: '일반', artist: 'A', year: 2024, desc: 'd', imageUrl: 'http://leak/x.png' }, // 외부 → 비움
      { title: '대표', artist: 'B', year: 2025, desc: '', imageUrl: 'data:image/png;base64,AA', ar: 1.2, featured: true }
    ];
    const { buildGalleryJson } = makeStorage();
    const json = buildGalleryJson();
    expect(json.id).toBe('show');
    expect(json.theme).toBe('night');
    expect(json.artworks[0].id).toBe('aw-01');
    expect(json.artworks[0].imageUrl).toBe(''); // 외부 URL 방어 비움
    expect(json.artworks[1].id).toBe('aw-featured-01');
    expect(json.artworks[1].imageUrl).toBe('data:image/png;base64,AA');
    expect(json.artworks[1].featured).toBe(true);
    expect(json.artworks[1].ar).toBe(1.2);
  });
});
