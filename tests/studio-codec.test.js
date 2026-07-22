// studio 공유 코덱 압축 경로(#gz=) 라운드트립 (C-2 S3) — node 환경(기본).
// deflate-raw는 Blob.stream()/CompressionStream/DecompressionStream이 필요하다.
// jsdom Blob은 stream()을 제공하지 않으므로 이 검증만 node 전역으로 돌린다.
// artworks.js(보호파일) 디코더 규약과 바이트 호환됨을 대칭 디코드로 고정한다.
import { describe, it, expect } from 'vitest';
import {
  encodeGalleryDataGz,
  buildShareFragment
} from '../web/js/studio-storage.js';

// artworks.js b64urlToBytes 재현(참조 픽스처)
function b64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
async function decodeFragment(fragment) {
  const gz = fragment.match(/[#&]gz=([^&]+)/);
  const gd = fragment.match(/[#&]gd=([^&]+)/);
  if (gz) {
    const stream = new Blob([b64urlToBytes(gz[1])]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return JSON.parse(await new Response(stream).text());
  }
  if (gd) return JSON.parse(new TextDecoder().decode(b64urlToBytes(gd[1])));
  throw new Error('규약 없음');
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

describe('studio 코덱 압축(#gz) — deflate-raw 라운드트립', () => {
  it('encodeGalleryDataGz → DecompressionStream 디코드 파리티', async () => {
    if (typeof CompressionStream === 'undefined') return; // 미지원 런타임 스킵
    const enc = await encodeGalleryDataGz(SAMPLE);
    expect(enc).not.toMatch(/[+/=]/); // base64url
    expect(await decodeFragment('#gz=' + enc)).toEqual(SAMPLE);
  });

  it('buildShareFragment — 규약(#gz/#gd) 프래그먼트가 원본으로 원복', async () => {
    const frag = await buildShareFragment(SAMPLE);
    expect(frag).toMatch(/^#(gz|gd)=/);
    expect(await decodeFragment(frag)).toEqual(SAMPLE);
  });
});
