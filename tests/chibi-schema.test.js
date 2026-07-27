// chibi-schema.js 저장 look SSOT 단위테스트 — #94 안전망 후속(R5, 누락 순수함수 보강).
// 아야모(치비) 저장 파라미터의 정규화·인코딩은 사용자 저장물·공유링크의 호환 계약이다.
// 임의/악성 입력을 안전한 값으로 수렴시키고(normalizeChibi), 'chibi:'+JSON 왕복이
// 무유실임을 고정한다. 로직 무변경 회귀 그물(구현자≠검증자 정적 안전망 보강).
import { describe, it, expect } from 'vitest';
import {
  normalizeChibi,
  encodeChibi,
  decodeChibi,
  CHIBI_CHAR_PREFIX,
  DEFAULT_CHIBI,
  SKIN_TONES,
} from '../frontend/js/chibi-schema.js';

describe('normalizeChibi (임의 입력 → 안전 파라미터)', () => {
  it('비객체 입력(null·undefined·문자열·숫자)도 크래시 없이 기본 룩', () => {
    for (const bad of [null, undefined, 'x', 42, [], true, NaN]) {
      const out = normalizeChibi(bad);
      expect(out).toBeTypeOf('object');
      expect(out.species).toBe(DEFAULT_CHIBI.species);
      expect(out.skin).toBe(DEFAULT_CHIBI.skin);
    }
  });

  it('알 수 없는 enum 값은 기본값으로 폴백', () => {
    const out = normalizeChibi({ species: '__nope__', hairStyle: 'zzz', mouth: '???' });
    expect(out.species).toBe(DEFAULT_CHIBI.species);
    expect(out.hairStyle).toBe(DEFAULT_CHIBI.hairStyle);
    expect(out.mouth).toBe(DEFAULT_CHIBI.mouth);
  });

  it('유효하지 않은 hex 색은 기본값으로 폴백', () => {
    const out = normalizeChibi({ skin: 'notahex', hairColor: '#gggggg', top: 12345 });
    expect(out.skin).toBe(DEFAULT_CHIBI.skin);
    expect(out.hairColor).toBe(DEFAULT_CHIBI.hairColor);
    expect(out.top).toBe(DEFAULT_CHIBI.top);
  });

  it('유효한 값은 보존(팔레트 내 hex·정상 enum)', () => {
    const out = normalizeChibi({ skin: SKIN_TONES[3] });
    expect(out.skin).toBe(SKIN_TONES[3]);
  });

  it("face 'chubby'는 'square'로 이관(하위호환 마이그레이션)", () => {
    expect(normalizeChibi({ face: 'chubby' }).face).toBe(normalizeChibi({ face: 'square' }).face);
  });

  it('불린 플래그 기본값: blush는 명시 false만 끄고, 장식은 명시 true만 켠다', () => {
    const d = normalizeChibi({});
    expect(d.blush).toBe(true); // src.blush !== false
    expect(d.halo).toBe(false);
    expect(d.wings).toBe(false);
    expect(d.heart).toBe(false);
    expect(d.glasses).toBe(false);
    const on = normalizeChibi({ blush: false, halo: true, wings: true, heart: true, glasses: true });
    expect(on.blush).toBe(false);
    expect(on.halo).toBe(true);
    expect(on.wings).toBe(true);
    // truthy이지만 !==true인 값은 켜지 않는다(엄격 비교)
    expect(normalizeChibi({ halo: 1, wings: 'yes' }).halo).toBe(false);
  });

  it('멱등: 두 번 정규화 = 한 번 정규화', () => {
    const once = normalizeChibi({ species: 'robot', skin: SKIN_TONES[2], halo: true });
    expect(normalizeChibi(once)).toEqual(once);
  });

  it('출력 키 집합이 안정적(스키마 표면 고정)', () => {
    expect(Object.keys(normalizeChibi({})).sort()).toEqual(Object.keys(DEFAULT_CHIBI).sort());
  });
});

describe('encodeChibi / decodeChibi ("chibi:"+JSON 왕복)', () => {
  it('encode는 접두사로 시작하고 정규화된 JSON을 담는다', () => {
    const s = encodeChibi({ species: 'robot' });
    expect(s.startsWith(CHIBI_CHAR_PREFIX)).toBe(true);
    expect(JSON.parse(s.slice(CHIBI_CHAR_PREFIX.length)).species).toBe('robot');
  });

  it('라운드트립 무유실: decode(encode(x)) === normalizeChibi(x)', () => {
    const x = { species: 'ghost', skin: SKIN_TONES[1], glasses: true, face: 'chubby' };
    expect(decodeChibi(encodeChibi(x))).toEqual(normalizeChibi(x));
  });

  it('decode는 접두사 없음·비문자열·깨진 JSON에 null', () => {
    expect(decodeChibi('nope:{}')).toBeNull();
    expect(decodeChibi(null)).toBeNull();
    expect(decodeChibi(42)).toBeNull();
    expect(decodeChibi(CHIBI_CHAR_PREFIX + '{not json')).toBeNull();
  });

  it('decode는 부분/오염 입력도 정규화로 복구(안전 폴백)', () => {
    const out = decodeChibi(CHIBI_CHAR_PREFIX + JSON.stringify({ species: '__bad__' }));
    expect(out.species).toBe(DEFAULT_CHIBI.species);
  });
});
