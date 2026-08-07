// tests/draw-blockers.test.ts — 드로우콜 판정을 **누가** 막았는지 리포트가 지목하는가.
//
// ── 왜 이 검사가 있나 (감독 실기기 2026-08-06) ───────────────────────────────
// 감독 리포트에 같은 줄이 **두 번** 찍혔다(2026-07-31 #176, 2026-08-06):
//
//     draw   -   측정 안 됨(표본 0) — 전 프레임 판정 유예(5019표본 제외)
//
// 표본 5,019개를 다 뽑아 놓고 전부 버렸다. 그런데 **왜 버렸는지를 안 적었다.**
//
// 그 공백이 만든 실제 피해: #176 은 원인을 *"하늘 상태 전이가 안 끝난다"* 로 적었는데
// **틀렸다.** 진짜 원인은 `npc`·`glb-city` 가 조건 없이 `drawGroupKey: () => null` 을
// 내는 것이었고, 둘 다 기본 켜짐이라 **기본 구성에서는 이 축이 영원히 판정되지 않는다.**
// 이름이 없으니 추측이 들어갔고, 그 추측이 태스크에 사실처럼 적혀 일주일을 갔다.
//
// 두 기능의 근거 자체는 맞다 — NPC 가 있으면 카메라를 돌리는 것만으로 컬링이 달라져
// 드로우콜은 **정의상** 상수가 아니다. 틀린 것은 근거가 아니라 **리포트의 침묵**이다.
//
// ── 이 검사가 잠그는 것 ──────────────────────────────────────────────────────
// ① `null` 을 낸 기능 이름이 **전부** 모인다(첫 하나에서 멈추지 않는다 — 멈추면 그것을
//    끈 뒤에야 다음 원인을 알게 되어 감독이 두 번 재야 한다).
// ② 리포트 줄이 그 이름과 **끄는 법**을 함께 싣는다.
// ③ 끄는 법을 **기능 자신이 소유한다.** 처음엔 리포트 쪽에 `이름 → 노브` 매핑을 뒀는데
//    거기서 `npc` 를 `npc=0` 하나로 적었고 **그건 틀린 안내였다** — `npc` 는 `?npc=` 와
//    `?vrm=` 둘 다 0 이라야 꺼진다. 그대로 따라 재면 사람이 남은 채 또 미측정이 나온다.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { drawGroupKeyOf, combineDrawGroupKey } from '../frontend/js/world2/features/types.js';
import { formatReport } from '../frontend/js/world2/decide/telemetry.js';

/** 최소 스텁 — 이름과 `drawGroupKey`(+선택 힌트) 만 있으면 된다. */
const feat = (name: string, key: string | null | undefined, hint?: string) => ({
  name,
  instance: (key === undefined
    ? {}
    : { drawGroupKey: () => key, ...(hint ? { drawBlockHint: hint } : {}) }) as never,
});

describe('막은 기능 지목', () => {
  it('★ null 을 낸 기능이 **전부** 모인다 — 첫 하나에서 멈추지 않는다', () => {
    const r = drawGroupKeyOf([
      feat('npc', null, 'npc=0&vrm=0'), feat('sky', 'night'), feat('glb-city', null, 'glb=0'),
    ]);
    expect(r.key).toBeNull();
    // 둘 다 나와야 한다. 하나만 나오면 감독이 npc 를 끄고 다시 재고, 또 glb 를 끄고
    // 또 재야 한다 — 실기기 왕복이 두 배가 된다.
    expect(r.blockedBy).toEqual([
      { name: 'glb-city', hint: 'glb=0' }, { name: 'npc', hint: 'npc=0&vrm=0' },
    ]);
  });

  it('★ 끄는 법은 **기능이 소유한다** — 리포트가 이름→노브를 매핑하지 않는다', () => {
    // 매핑을 리포트가 들면 노브가 바뀔 때 한쪽만 낡는다. 힌트를 안 낸 기능은 이름만 온다.
    const r = drawGroupKeyOf([feat('mystery', null)]);
    expect(r.blockedBy).toEqual([{ name: 'mystery' }]);
  });

  it('아무도 안 막으면 키가 나오고 blockedBy 는 빈다', () => {
    const r = drawGroupKeyOf([feat('sky', 'night'), feat('water', 'calm')]);
    expect(r.key).toBe('sky=night water=calm');
    expect(r.blockedBy).toEqual([]);
  });

  it('키를 안 내는 기능은 그룹에서 빠질 뿐 막지 않는다', () => {
    const r = drawGroupKeyOf([feat('minimap', undefined), feat('sky', 'day')]);
    expect(r.key).toBe('sky=day');
    expect(r.blockedBy).toEqual([]);
  });

  it('이름순 정렬 — 기능 목록 순서를 바꿔도 같은 결과다', () => {
    const a = drawGroupKeyOf([feat('b', null), feat('a', null)]);
    const b = drawGroupKeyOf([feat('a', null), feat('b', null)]);
    expect(a.blockedBy).toEqual(b.blockedBy);
    expect(a.blockedBy.map((x) => x.name)).toEqual(['a', 'b']);
  });

  it('기존 combineDrawGroupKey 는 그대로 동작한다 — 소비자 무영향', () => {
    expect(combineDrawGroupKey([feat('sky', 'night')])).toBe('sky=night');
    expect(combineDrawGroupKey([feat('npc', null), feat('sky', 'night')])).toBeNull();
  });
});

/** 리포트 최소 입력 — 이 검사가 보는 것은 draw 줄 하나다. */
const baseReport = {
  backend: 'webgpu', dpr: 3, screen: '320x519', seconds: 84.5, frames: 1800, fps: 60,
  hitches: [], frameMs: [16.7], updMs: [1.6], renderMs: [3.9], outMs: [11.2],
  draw: [] as number[], pipeline: [52], geometries: [359], textures: [63],
  parcels: [14], built: 67, released: 51, starved: 0,
  pixelRatio: 2, frameCap: 0, triAvg: 107475,
};

describe('리포트 draw 줄', () => {
  it('★ 막은 기능 이름과 **끄는 법**을 함께 싣는다', () => {
    const out = formatReport({
      ...baseReport,
      drawSkipped: 5019,
      drawBlockedBy: [{ name: 'glb-city', hint: 'glb=0' }, { name: 'npc', hint: 'npc=0&vrm=0' }],
    } as never);
    const line = out.split('\n').find((l) => l.trimStart().startsWith('draw'))!;
    expect(line).toContain('glb-city·npc');
    // 이름만 있으면 "그래서 어쩌라고" 다. 다음 행동까지 적혀야 감독이 바로 다시 잰다.
    // `?` 는 맨 앞 **한 번만** — `?glb=0&?npc=0` 은 붙여 넣으면 안 듣는 URL 이다.
    expect(line).toContain('?glb=0&npc=0&vrm=0');
    expect(line).not.toContain('&?');
    expect(line).toContain('5019표본 제외');
  });

  it('힌트 없는 기능은 이름만 적고 URL 을 지어내지 않는다', () => {
    const out = formatReport({
      ...baseReport, drawSkipped: 7, drawBlockedBy: [{ name: 'mystery' }],
    } as never);
    const line = out.split('\n').find((l) => l.trimStart().startsWith('draw'))!;
    expect(line).toContain('mystery');
    expect(line).not.toContain('다시 재라'); // 끄는 법을 모르면 안내하지 않는다
  });

  it('이름이 없으면 "미상" 이라고 적는다 — 조용히 넘기지 않는다', () => {
    const out = formatReport({ ...baseReport, drawSkipped: 100 } as never);
    const line = out.split('\n').find((l) => l.trimStart().startsWith('draw'))!;
    expect(line).toContain('미상');
  });

  it('막힌 게 없으면 평소대로 판정한다', () => {
    const out = formatReport({ ...baseReport, draw: [39, 39, 39], drawSkipped: 0 } as never);
    const line = out.split('\n').find((l) => l.trimStart().startsWith('draw'))!;
    expect(line).toContain('상수');
    expect(line).not.toContain('판정 불가');
  });
});

/**
 * ── 힌트가 **실제로 존재하는 노브**를 가리키는가 ─────────────────────────────
 * 힌트를 기능 파일로 옮긴 것은 값 미러링을 없애려던 것인데, 옮긴 자리에서 오타가 나면
 * 감독이 안 듣는 URL 을 붙여 넣고 또 미측정을 본다 — 증상이 고치기 전과 똑같다.
 * 그래서 힌트 안의 노브 이름이 **같은 파일에서 실제로 읽히는지**를 본다.
 */
describe('힌트가 가리키는 노브가 그 파일에 있다', () => {
  const src = (p: string) => readFileSync(join(import.meta.dirname, '..', 'frontend/js/world2', p), 'utf8');

  for (const path of ['features/npc.ts', 'features/glb-city.ts']) {
    it(`${path} — drawBlockHint 의 노브를 그 파일이 읽는다`, () => {
      const text = src(path);
      const m = text.match(/drawBlockHint:\s*'([^']+)'/);
      expect(m, `${path} 에 drawBlockHint 가 없다 — 막으면서 끄는 법을 안 알려준다`).not.toBeNull();
      const knobs = m![1].split('&').map((kv) => kv.split('=')[0]);
      expect(knobs.length).toBeGreaterThan(0);
      for (const k of knobs) {
        // `readNum('glb', …)` 또는 `.get('npc')` 둘 중 하나로 읽힌다.
        const read = new RegExp(`(readNum|readEnum|readFlag)\\(\\s*'${k}'|\\.get\\('${k}'\\)`);
        expect(read.test(text), `${path} 가 '${k}' 노브를 안 읽는다 — 힌트가 헛다리다`).toBe(true);
      }
    });
  }

  it('npc 는 **두 노브를 다** 안내한다 — 하나만 끄면 안 꺼진다', () => {
    // `create` 가 `count<=0 && vrmCount<=0` 일 때만 null 을 낸다. 힌트가 `npc=0` 뿐이면
    // 감독이 그대로 재고 VRM 이 남아 또 "측정 안 됨" 이 나온다 — 실제로 그렇게 적었었다.
    const text = src('features/npc.ts');
    const hint = text.match(/drawBlockHint:\s*'([^']+)'/)![1];
    expect(hint).toContain('npc=0');
    expect(hint).toContain('vrm=0');
  });
});

/**
 * ── 스모크의 대조군 쿼리가 **모든 막는 기능을 끄는가** (검수관 블로커 B2) ──────
 *
 * `scripts/smoke/measure-invariants.mjs` 의 `DRAW_CONTROL_QUERY` 는 `drawBlockHint` 를
 * **손으로 베낀 리터럴**이다. 어제 힌트를 기능 파일로 옮겨 값 미러링을 없애 놓고,
 * 오늘 그 값을 스모크에 다시 베꼈다.
 *
 * 드리프트가 나면 **조용하다** — 새 기능이 `drawBlockHint` 를 들고 들어오거나 기존
 * 노브 이름이 바뀌면, 대조군 세션에 그 기능이 살아남아 draw 가 흔들린다. 그때 게이트는
 * FAIL 하지만 **원인이 "회귀" 로 읽힌다.** 실제로는 대조군 조건이 깨진 것이다.
 * 반대로 기능이 사라졌는데 쿼리에 남아 있으면 아무 일도 안 나서 영영 모른다.
 *
 * 이 저장소가 세 번 데인 형태다(`SAVE_KEY`/`SAVE_KEY_MIRROR` 계열). 그래서 검사로 묶는다.
 */
describe('대조군 쿼리가 drawBlockHint 를 전부 덮는다', () => {
  /** 모든 기능 파일에서 `drawBlockHint` 를 긁어 노브 이름 집합을 만든다. */
  const hintKnobs = (): Set<string> => {
    const dir = join(import.meta.dirname, '..', 'frontend/js/world2/features');
    const out = new Set<string>();
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
      const text = readFileSync(join(dir, f), 'utf8');
      for (const m of text.matchAll(/drawBlockHint:\s*'([^']+)'/g)) {
        for (const kv of m[1].split('&')) out.add(kv.split('=')[0]);
      }
    }
    return out;
  };

  it('★ 힌트가 가리키는 노브가 **하나도 빠짐없이** 대조군 쿼리에 있다', () => {
    const smoke = readFileSync(
      join(import.meta.dirname, '..', 'scripts/smoke/measure-invariants.mjs'), 'utf8',
    );
    const m = smoke.match(/DRAW_CONTROL_QUERY\s*=\s*`([^`]+)`/);
    expect(m, '`DRAW_CONTROL_QUERY` 를 못 찾았다 — 대조군이 사라졌거나 이 검사가 딴것을 본다')
      .not.toBeNull();
    const query = m![1];

    const knobs = [...hintKnobs()];
    expect(knobs.length, 'drawBlockHint 가 하나도 없다 — 검사가 아무것도 안 보고 있다')
      .toBeGreaterThan(0);

    const missing = knobs.filter((k) => !new RegExp(`[?&]${k}=`).test(query));
    expect(
      missing,
      `대조군 쿼리에 없는 노브: ${missing.join(', ')} — 그 기능이 대조군에 살아남아 `
      + 'draw 가 흔들린다. 게이트는 FAIL 하지만 원인이 "회귀" 로 오독된다.',
    ).toEqual([]);
  });

  it('대조군 쿼리의 노브가 전부 0 이다 — 켜 둔 채 끈 척하지 않는다', () => {
    const smoke = readFileSync(
      join(import.meta.dirname, '..', 'scripts/smoke/measure-invariants.mjs'), 'utf8',
    );
    const query = smoke.match(/DRAW_CONTROL_QUERY\s*=\s*`([^`]+)`/)![1];
    for (const k of hintKnobs()) {
      const v = query.match(new RegExp(`[?&]${k}=([^&]*)`))?.[1];
      expect(v, `${k} 가 대조군 쿼리에 없다`).toBeDefined();
      expect(v, `${k}=${v} — 대조군인데 0 이 아니다`).toBe('0');
    }
  });
});
