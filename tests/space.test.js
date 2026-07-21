// space.js 단위테스트 — 스키마 SSOT의 회귀 안전망.
// 되돌리기 힘든 로직(마이그레이션·정규화·라운드트립)을 케이스로 고정한다.
// 이 테스트는 TS 전환의 "before" 스냅샷 — 전환 후에도 전부 녹색이면 무회귀 증명.
import { describe, it, expect } from 'vitest';
import {
  SPACE_VERSION,
  PART_TYPES,
  PART_TYPE_IDS,
  PART_CATEGORIES,
  FINISH,
  FRAME_STYLES,
  FOOTPRINT,
  STORY_H,
  DEFAULT_SPACE,
  SPACE_PREFIX,
  migrateSpace,
  normalizeSpace,
  encodeSpace,
  decodeSpace,
  newSpace,
} from '../web/js/space';

describe('migrateSpace — 버전 업그레이드 안전장치', () => {
  it('무버전(v0) 문서를 현재 버전으로 올린다', () => {
    expect(migrateSpace({}).version).toBe(SPACE_VERSION);
  });

  it('v1 문서를 v2로 올린다', () => {
    expect(migrateSpace({ version: 1 }).version).toBe(2);
  });

  it('현재 버전 문서는 그대로 통과(필드 불변)', () => {
    const doc = { version: SPACE_VERSION, meta: { name: '유지' } };
    const out = migrateSpace(doc);
    expect(out.version).toBe(SPACE_VERSION);
    expect(out.meta.name).toBe('유지');
  });

  it('지원 버전보다 앞선 문서는 조용히 열지 않고 거부(SPACE_VERSION_AHEAD)', () => {
    let err;
    try { migrateSpace({ version: SPACE_VERSION + 1 }); } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.code).toBe('SPACE_VERSION_AHEAD');
  });

  it('v1의 wall:deepviolet를 유실 없이 wall=white + featureFinish=deepviolet로 명시 이관', () => {
    const out = migrateSpace({ version: 1, shell: { finish: { wall: 'deepviolet' } } });
    expect(out.shell.finish.wall).toBe('white');
    expect(out.shell.finish.featureFinish).toBe('deepviolet');
  });

  it('deepviolet 이관 시 기존 featureFinish는 보존', () => {
    const out = migrateSpace({ version: 1, shell: { finish: { wall: 'deepviolet', featureFinish: 'kintsugi' } } });
    expect(out.shell.finish.wall).toBe('white');
    expect(out.shell.finish.featureFinish).toBe('kintsugi');
  });
});

describe('normalizeSpace — 기본값 채움·클램프·검증', () => {
  it('null/비객체 입력도 유효한 기본 공간을 만든다', () => {
    const s = normalizeSpace(null);
    expect(s.version).toBe(SPACE_VERSION);
    expect(s.meta.name).toBe(DEFAULT_SPACE.meta.name);
    expect(s.shell.footprint).toBe(DEFAULT_SPACE.shell.footprint);
    expect(Array.isArray(s.parts)).toBe(true);
  });

  it('wallT를 허용 범위(0.1~0.4)로 클램프', () => {
    expect(normalizeSpace({ shell: { wallT: 99 } }).shell.wallT).toBe(0.4);
    expect(normalizeSpace({ shell: { wallT: 0.001 } }).shell.wallT).toBe(0.1);
    expect(normalizeSpace({ shell: { wallT: 0.25 } }).shell.wallT).toBe(0.25);
  });

  it('미지 파츠 타입은 폐기하고 유효 파츠만 남긴다', () => {
    const s = normalizeSpace({ parts: [{ t: '존재안함' }, { t: 'artwork', x: 1, z: 2 }, { t: 'bench', x: 0, z: 0 }] });
    expect(s.parts).toHaveLength(2);
    expect(s.parts.map((p) => p.t)).toEqual(['artwork', 'bench']);
  });

  it('meta.name은 40자로 자른다', () => {
    const long = 'ㄱ'.repeat(100);
    expect(normalizeSpace({ meta: { name: long } }).meta.name).toHaveLength(40);
  });

  it('무효 featureWall은 기본값(north)으로', () => {
    expect(normalizeSpace({ shell: { finish: { featureWall: '위쪽' } } }).shell.finish.featureWall).toBe('north');
    expect(normalizeSpace({ shell: { finish: { featureWall: 'south' } } }).shell.finish.featureWall).toBe('south');
  });

  it('작품(art) 파츠는 frame 기본값·src 문자열을 보장', () => {
    const s = normalizeSpace({ parts: [{ t: 'artwork', x: 0, z: 0 }] });
    expect(s.parts[0].frame).toBe(FRAME_STYLES.def);
    expect(s.parts[0].src).toBe('');
  });

  it('파츠 y(스택 높이)를 0~20으로 클램프하고 0은 직렬화 생략', () => {
    const over = normalizeSpace({ parts: [{ t: 'bench', x: 0, z: 0, y: 99 }] });
    expect(over.parts[0].y).toBe(20);
    const zero = normalizeSpace({ parts: [{ t: 'bench', x: 0, z: 0, y: 0 }] });
    expect(zero.parts[0].y).toBeUndefined();
  });

  it('작품 종횡비 ar을 0.1~10으로 클램프', () => {
    expect(normalizeSpace({ parts: [{ t: 'artwork', x: 0, z: 0, ar: 99 }] }).parts[0].ar).toBe(10);
    expect(normalizeSpace({ parts: [{ t: 'artwork', x: 0, z: 0, ar: 0.01 }] }).parts[0].ar).toBe(0.1);
  });

  it('normalizeSpace는 항상 현재 버전으로 표준화', () => {
    expect(normalizeSpace({ version: 1 }).version).toBe(SPACE_VERSION);
  });
});

describe('encodeSpace/decodeSpace — 저장 라운드트립', () => {
  it('encode→decode 라운드트립이 정규화 결과와 동일', () => {
    const round = decodeSpace(encodeSpace(DEFAULT_SPACE));
    expect(round).toEqual(normalizeSpace(DEFAULT_SPACE));
  });

  it('prefix가 없는 문자열은 null', () => {
    expect(decodeSpace('그냥 문자열')).toBeNull();
    expect(decodeSpace('')).toBeNull();
    expect(decodeSpace(null)).toBeNull();
  });

  it('파손된 JSON은 null(예외 삼킴)', () => {
    expect(decodeSpace(SPACE_PREFIX + '{망가진')).toBeNull();
  });

  it('지원 버전 초과 문서는 decode 단계에서 null로 안전 처리', () => {
    const ahead = SPACE_PREFIX + JSON.stringify({ version: SPACE_VERSION + 5 });
    expect(decodeSpace(ahead)).toBeNull();
  });

  it('encodeSpace는 SPACE_PREFIX로 시작', () => {
    expect(encodeSpace(DEFAULT_SPACE).startsWith(SPACE_PREFIX)).toBe(true);
  });
});

describe('스키마 자기정합성 — 상수 드리프트 방지(리팩터 가드)', () => {
  it('PART_TYPE_IDS는 PART_TYPES의 키 집합과 일치', () => {
    expect([...PART_TYPE_IDS].sort()).toEqual(Object.keys(PART_TYPES).sort());
  });

  it('모든 파츠의 cat은 PART_CATEGORIES 안에 있다', () => {
    for (const [id, spec] of Object.entries(PART_TYPES)) {
      expect(PART_CATEGORIES, `파츠 ${id}의 cat`).toContain(spec.cat);
    }
  });

  it('모든 파츠는 grid·size(길이3)·label을 갖는다', () => {
    for (const [id, spec] of Object.entries(PART_TYPES)) {
      expect(['structure', 'object'], `파츠 ${id}의 grid`).toContain(spec.grid);
      expect(spec.size, `파츠 ${id}의 size`).toHaveLength(3);
      expect(typeof spec.label, `파츠 ${id}의 label`).toBe('string');
    }
  });

  it('FINISH의 각 def는 해당 ids 안에 있다', () => {
    for (const [k, group] of Object.entries(FINISH)) {
      expect(group.ids, `FINISH.${k}.def`).toContain(group.def);
    }
  });

  it('FRAME_STYLES.def는 ids 안에 있다', () => {
    expect(FRAME_STYLES.ids).toContain(FRAME_STYLES.def);
  });

  it('DEFAULT_SPACE.shell.footprint·storyH는 유효 프리셋 키', () => {
    expect(Object.keys(FOOTPRINT)).toContain(DEFAULT_SPACE.shell.footprint);
    expect(Object.keys(STORY_H)).toContain(DEFAULT_SPACE.shell.storyH);
  });

  it('DEFAULT_SPACE의 모든 파츠 타입은 등록된 타입', () => {
    for (const p of DEFAULT_SPACE.parts) {
      expect(PART_TYPE_IDS.has(p.t), `DEFAULT_SPACE 파츠 ${p.t}`).toBe(true);
    }
  });
});

describe('newSpace — 스타터 공간', () => {
  it('정규화된 DEFAULT_SPACE와 동일', () => {
    expect(newSpace()).toEqual(normalizeSpace(DEFAULT_SPACE));
  });

  it('현재 버전이고 파츠가 비어있지 않다', () => {
    const s = newSpace();
    expect(s.version).toBe(SPACE_VERSION);
    expect(s.parts.length).toBeGreaterThan(0);
  });
});
