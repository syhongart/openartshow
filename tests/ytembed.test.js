// ytembed.js 단위테스트 — 유튜브 임베드 안전 계층의 회귀 안전망.
// 이 모듈은 CSP·법무·보안이 얽힌 화이트리스트 경계다: "정확히 11자 영상 ID만"과
// "우리가 조립한 nocookie URL만"이 흔들리면 사용자 URL이 iframe에 새어들 수 있다.
// 순수함수(youtubeId·embedUrl)만 고정한다. createYouTubeSurface는 DOM 렌더라 제외.
// TS 전환의 "before" 스냅샷 — 전환 후에도 전부 녹색이면 무회귀 증명.
import { describe, it, expect } from 'vitest';
import { youtubeId, embedUrl, YT_ID } from '../frontend/js/ytembed.js';

const VALID = 'dQw4w9WgXcQ'; // 정확히 11자

describe('YT_ID — 11자 화이트리스트 정규식 경계', () => {
  it('정확히 11자(영숫자·_·-)만 통과', () => {
    expect(YT_ID.test('dQw4w9WgXcQ')).toBe(true);
    expect(YT_ID.test('dQw4_9Wg-cQ')).toBe(true); // _ 와 - 허용
  });

  it('10자·12자는 거부(경계 ±1)', () => {
    expect(YT_ID.test('dQw4w9WgXc')).toBe(false);   // 10
    expect(YT_ID.test('dQw4w9WgXcQZ')).toBe(false); // 12
  });

  it('11자라도 정규식 밖 문자(!, 공백, /)면 거부', () => {
    expect(YT_ID.test('dQw4w9WgX!Q')).toBe(false);
    expect(YT_ID.test('dQw4w9Wg XcQ')).toBe(false);
    expect(YT_ID.test('dQw4w9Wg/cQ')).toBe(false);
  });
});

describe('youtubeId — 신뢰불가 입력 → 검증된 11자 ID', () => {
  it('이미 11자 ID면 그대로 통과', () => {
    expect(youtubeId(VALID)).toBe(VALID);
    expect(youtubeId('dQw4_9Wg-cQ')).toBe('dQw4_9Wg-cQ');
  });

  it('앞뒤 공백은 trim 후 판정', () => {
    expect(youtubeId('  dQw4w9WgXcQ  ')).toBe(VALID);
  });

  it('10자·12자 순수 문자열은 null(ID도 URL도 아님)', () => {
    expect(youtubeId('dQw4w9WgXc')).toBeNull();
    expect(youtubeId('dQw4w9WgXcQZ')).toBeNull();
  });

  it('11자라도 특수문자 포함이면 null', () => {
    expect(youtubeId('dQw4w9WgX!Q')).toBeNull();
  });

  it('watch?v= URL에서 v를 추출(부가 파라미터 무시)', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(VALID);
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe(VALID);
  });

  it('watch에 v 파라미터가 없으면 null', () => {
    expect(youtubeId('https://www.youtube.com/watch?feature=share')).toBeNull();
  });

  it('youtu.be 단축 URL에서 경로 ID 추출(쿼리 무시)', () => {
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe(VALID);
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ?t=5')).toBe(VALID);
  });

  it('youtu.be 경로가 12자면 null(길이 재검증)', () => {
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQX')).toBeNull();
  });

  it('/embed/·/shorts/ 경로에서 ID 추출', () => {
    expect(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(VALID);
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(VALID);
    // 뒤에 추가 세그먼트가 붙어도 ID 세그먼트만 취함
    expect(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ/extra')).toBe(VALID);
  });

  it('허용 호스트: m.youtube.com·youtube-nocookie·대문자 호스트', () => {
    expect(youtubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(VALID);
    expect(youtubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe(VALID);
    expect(youtubeId('https://WWW.YOUTUBE.COM/watch?v=dQw4w9WgXcQ')).toBe(VALID); // hostname 소문자화
  });

  it('https가 아니면 거부(http·javascript·data)', () => {
    expect(youtubeId('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(youtubeId('javascript:alert(1)')).toBeNull();
    expect(youtubeId('data:text/html,<b>x</b>')).toBeNull();
  });

  it('허용 목록 밖 호스트는 전면 거부', () => {
    expect(youtubeId('https://vimeo.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(youtubeId('https://evil.com/embed/dQw4w9WgXcQ')).toBeNull();
    // 서브도메인 사칭도 거부(정확한 호스트 매칭)
    expect(youtubeId('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  it('비문자열 입력은 null', () => {
    expect(youtubeId(null)).toBeNull();
    expect(youtubeId(undefined)).toBeNull();
    expect(youtubeId(123)).toBeNull();
    expect(youtubeId({})).toBeNull();
  });
});

describe('embedUrl — 검증된 ID → nocookie 임베드 URL', () => {
  it('유효 ID를 nocookie 도메인 URL로 조립', () => {
    expect(embedUrl(VALID)).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1'
    );
  });

  it('항상 youtube-nocookie 도메인을 쓴다(추적 최소화 계약)', () => {
    expect(embedUrl(VALID).startsWith('https://www.youtube-nocookie.com/embed/')).toBe(true);
  });

  it('무효 ID(길이·문자·비문자열)는 null — 재검증 없이 조립하지 않는다', () => {
    expect(embedUrl('short')).toBeNull();
    expect(embedUrl('dQw4w9WgX!Q')).toBeNull();
    expect(embedUrl('')).toBeNull();
    expect(embedUrl(123)).toBeNull();
    expect(embedUrl(null)).toBeNull();
  });
});
