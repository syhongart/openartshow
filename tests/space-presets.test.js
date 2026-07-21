// space-presets.js 단위테스트 — 방/공간 프리셋의 회귀 안전망.
// 프리셋은 "그냥 space 문서"이며 빌더가 normalizeSpace로 정규화해 로드한다(팀장 조건:
// 기존 스키마만·신규 필드 0). 따라서 핵심 회귀 위험은 "프리셋이 스키마와 어긋나 정규화
// 과정에서 파츠·마감이 유실되는 것". 그 정합성을 스키마 SSOT와 교차 검증해 고정한다.
import { describe, it, expect } from 'vitest';
import {
  SPACE_PRESETS,
  PRESET_IDS,
  getPreset,
  northArt,
  presetThumb,
} from '../web/js/space-presets.js';
import { normalizeSpace, PART_TYPE_IDS, FOOTPRINT, STORY_H, FINISH } from '../web/js/space.js';

describe('PRESET_IDS / getPreset — 조회 계약', () => {
  it('PRESET_IDS는 SPACE_PRESETS의 id 집합과 정확히 일치', () => {
    expect([...PRESET_IDS].sort()).toEqual(SPACE_PRESETS.map((p) => p.id).sort());
  });

  it('id는 중복 없이 유일하다', () => {
    const ids = SPACE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getPreset은 등록 id면 해당 프리셋, 아니면 null', () => {
    for (const p of SPACE_PRESETS) expect(getPreset(p.id)).toBe(p);
    expect(getPreset('존재안함')).toBeNull();
    expect(getPreset(undefined)).toBeNull();
  });
});

describe('northArt — 북벽 3작품 헬퍼', () => {
  it('작품 3개, 가운데가 featured', () => {
    const arr = northArt();
    expect(arr).toHaveLength(3);
    expect(arr.every((a) => a.t === 'artwork')).toBe(true);
    expect(arr.findIndex((a) => a.featured)).toBe(1);
  });

  it('z 인자로 북벽 깊이를 지정(기본 -3.4)', () => {
    expect(northArt()[0].z).toBe(-3.4);
    expect(northArt(-5.0).every((a) => a.z === -5.0)).toBe(true);
  });
});

describe('프리셋 ↔ 스키마 정합성 — 정규화 유실 방지(핵심 회귀 가드)', () => {
  it('모든 프리셋은 등록된 파츠 타입만 쓴다', () => {
    for (const p of SPACE_PRESETS) {
      for (const part of p.space.parts) {
        expect(PART_TYPE_IDS.has(part.t), `${p.id}의 파츠 ${part.t}`).toBe(true);
      }
    }
  });

  it('normalizeSpace를 거쳐도 파츠가 하나도 유실되지 않는다', () => {
    for (const p of SPACE_PRESETS) {
      const norm = normalizeSpace(p.space);
      expect(norm.parts.length, `${p.id} 파츠 수`).toBe(p.space.parts.length);
    }
  });

  it('shell.footprint·storyH·마감이 스키마 유효값이라 정규화가 원값을 보존한다', () => {
    for (const p of SPACE_PRESETS) {
      const norm = normalizeSpace(p.space);
      const sh = p.space.shell;
      expect(Object.keys(FOOTPRINT), `${p.id} footprint`).toContain(sh.footprint);
      expect(Object.keys(STORY_H), `${p.id} storyH`).toContain(sh.storyH);
      // 유효값이면 normalize가 기본값으로 갈아끼우지 않고 그대로 유지
      expect(norm.shell.footprint).toBe(sh.footprint);
      expect(norm.shell.storyH).toBe(sh.storyH);
      expect(norm.shell.finish.wall).toBe(sh.finish.wall);
      expect(norm.shell.finish.floor).toBe(sh.finish.floor);
      expect(norm.shell.finish.featureFinish).toBe(sh.finish.featureFinish);
    }
  });

  it('featureFinish는 feature 마감 집합(kintsugi 포함) 안에 있다', () => {
    for (const p of SPACE_PRESETS) {
      expect(FINISH.feature.ids, `${p.id} featureFinish`).toContain(p.space.shell.finish.featureFinish);
    }
  });

  it('모든 프리셋 space는 현재 스키마 버전(v2)이다', () => {
    for (const p of SPACE_PRESETS) {
      expect(p.space.version, p.id).toBe(2);
      expect(normalizeSpace(p.space).version).toBe(2);
    }
  });
});

describe('presetThumb — 비-DOM 환경 방어', () => {
  it('document가 없으면 null(썸네일은 런타임 캔버스 전용)', () => {
    // node 환경(이 파일)에는 document가 없다 → 안전하게 null
    expect(presetThumb(SPACE_PRESETS[0].space)).toBeNull();
  });
});
