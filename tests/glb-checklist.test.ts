// GLB 불러오기 자가진단 — 감독 지시 2026-08-28 *"체크리스트를 만들어서 … 당분간 월드7에만"*.
//
// ── 이 검사가 지키는 것 ─────────────────────────────────────────────────────
// 판정이 **「안 쟀다」를 「정상」으로 뭉개지 않는가**. 이 저장소가 반복해서 당한 형태이고
// (*"못 잰 것이 통과로 적히는 경향"*), 체크리스트는 그것을 화면에 재현하기 가장 쉬운
// 물건이다 — 초록이 하나 늘 때마다 감독이 확인을 생략한다.
//
// 🔴 **이 파일이 못 보는 것**: 화면. 패널이 실제로 뜨는지·읽히는지는 감독 화면이 판정한다.
// 여기서 잠그는 것은 **판정 로직**까지다(그래서 `decide/` 로 떼어냈다).

import { describe, it, expect } from 'vitest';
import {
  buildChecklist, summarize, type ChecklistInput,
} from '../frontend/js/world-glb/decide/glb-checklist.js';

/** 전부 정상인 입력. 각 검사는 여기서 **한 축만** 흔든다 */
function healthy(): ChecklistInput {
  return {
    glb: {
      meshes: 28707, triangles: 1358918, instanced: 1565,
      shadowDecals: 8625, liftedDecals: 8625,
      boxFixed: 264, boxSkipped: 0, atlasPainted: 8,
      box: { min: [-960, -1.4, -960], max: [960, 72.6, 960] },
    },
    stream: { on: 182, total: 1565, ticks: 94, radius: 88.32, grid: 16 },
    map: { painted: 7229, px: 512 },
    pipelines: 1432,
    ahead: [{ d: 12.4, name: 'inst:bench#0×264' }],
    timeline: [{ stage: 'stream', atMs: 6840 }],
    errors: [],
  };
}
const find = (items: ReturnType<typeof buildChecklist>, label: string) =>
  items.find((x) => x.label === label)!;

describe('GLB 자가진단 체크리스트', () => {
  it('정상 입력이면 경고가 없다 — 대조군', () => {
    const items = buildChecklist(healthy());
    const warn = items.filter((x) => x.state === 'warn');
    expect(warn.map((w) => `${w.label}: ${w.detail}`), '정상인데 경고가 났다').toEqual([]);
    expect(summarize(items).ok, '정상인데 요약이 빨간불이다').toBe(true);
  });

  it('⭐ 「못 쟀다」를 초록으로 뭉개지 않는다 — `-1` 은 0 과 다르다', () => {
    // `pipelineCount()` 는 측정 실패에 `-1` 을 낸다. `< 0` 을 안 보면 0 과 같이 취급되고,
    // 그러면 「예열이 하나도 안 됐다」와 「못 읽었다」가 같은 칸에 들어간다.
    const items = buildChecklist({ ...healthy(), pipelines: -1 });
    expect(find(items, '예열').state, '측정 실패가 정상으로 찍혔다').toBe('unknown');
    // 그리고 요약이 그것을 삼키지 않아야 한다.
    expect(summarize(items).ok, 'unknown 이 있는데 「모두 정상」이 됐다').toBe(false);
    expect(summarize(items).text).toContain('못 잰');
  });

  it('⭐ 거리 컬링이 «한 번도 안 돈 것»을 잡는다 — 정상값과 구별되지 않던 자리다', () => {
    // 한 회차 앞 실물: 컬링이 커널에 등록되지 않았는데 진단이 `457/457` 을 냈다.
    // 그 값은 「전부 켬」이라 **정상 화면과 같은 숫자**여서 아무도 못 봤다.
    const items = buildChecklist({
      ...healthy(),
      stream: { on: 1565, total: 1565, ticks: 0, radius: 88.32, grid: 16 },
    });
    expect(find(items, '거리 컬링').state, 'ticks 0 인데 정상으로 찍혔다').toBe('warn');
    expect(find(items, '거리 컬링').detail).toContain('한 번도');
  });

  it('⭐ 그림자가 없는 GLB 는 `na` 다 — ✅ 로 적으면 「보정이 걸렸다」로 읽힌다', () => {
    // world7 은 임의 GLB 를 받는다. 우리 데칼이 없는 것이 **정상**이지만 초록은 아니다.
    const g = { ...healthy().glb!, shadowDecals: 0, liftedDecals: 0, boxFixed: 0, atlasPainted: 0 };
    const items = buildChecklist({ ...healthy(), glb: g });
    expect(find(items, '그림자(AO)').state).toBe('na');
    // `na` 는 경고도 아니어야 한다 — 남의 GLB 를 열 때마다 노란불이 뜨면 신호가 죽는다.
    expect(summarize(items).ok, 'na 가 요약을 빨갛게 만들었다').toBe(true);
  });

  it('그림자 보정이 «일부만» 걸린 것을 잡는다 — 0 과 다른 사고다', () => {
    const g = { ...healthy().glb!, liftedDecals: 4000 };   // 8,625 중 4,000만
    const items = buildChecklist({ ...healthy(), glb: g });
    expect(find(items, '그림자(AO)').state, '띄움이 모자란데 정상으로 찍혔다').toBe('warn');
  });

  it('⭐ 정면을 막는 것을 잡는다 — 검은 화면 사고의 처방', () => {
    // 실물: 스폰 0.3m 앞에 조형물이 서 있었고 **수치는 전부 정상**이었다(콘솔 0 ·
    // 삼각형 135만 · 기능 10개). 화면만 검었다.
    const items = buildChecklist({
      ...healthy(),
      ahead: [{ d: 0.3, name: 'inst:블렌더_조형물×1' }],
    });
    expect(find(items, '정면').state, '0.3m 앞을 막고 있는데 정상으로 찍혔다').toBe('warn');
    expect(find(items, '정면').detail).toContain('0.3');
  });

  it('세계가 안 서거나 비면 잡는다', () => {
    expect(find(buildChecklist({ ...healthy(), glb: null }), '세계').state).toBe('warn');
    const empty = { ...healthy().glb!, meshes: 0 };
    expect(find(buildChecklist({ ...healthy(), glb: empty }), '세계').state).toBe('warn');
  });

  it('단위가 다른 GLB(cm/mm)를 크기로 잡는다', () => {
    const tiny = { ...healthy().glb!, box: { min: [0, 0, 0] as const, max: [1.5, 0.9, 1.2] as const } };
    const items = buildChecklist({ ...healthy(), glb: tiny });
    expect(find(items, '크기').state, '1.5m 짜리 세계인데 정상으로 찍혔다').toBe('warn');
    expect(find(items, '크기').hint).toContain('단위');
  });

  it('지도가 비었으면 잡는다', () => {
    const items = buildChecklist({ ...healthy(), map: { painted: 0, px: 512 } });
    expect(find(items, '지도').state).toBe('warn');
  });

  it('부팅 에러를 **이름째** 옮긴다 — 모바일에서 감독은 개발자 도구를 못 연다', () => {
    const items = buildChecklist({ ...healthy(), errors: ['기능 조립 실패: sky', 'x is not a function'] });
    expect(find(items, '에러').state).toBe('warn');
    // 개수만 적으면 무엇이 죽었는지 화면에서 알 방법이 없다.
    expect(find(items, '에러').detail, '이름이 화면에 안 나온다').toContain('sky');
    expect(find(buildChecklist({ ...healthy(), errors: [] }), '에러').state).toBe('ok');
  });

  it('로딩은 **판정하지 않고 적는다** — 임의 GLB 에 임계를 박으면 거짓 경고가 난다', () => {
    // 22초든 1초든 그 파일에서는 정상일 수 있다. 숫자를 내놓고 판단은 사람이 한다.
    for (const ms of [500, 6840, 60000]) {
      const items = buildChecklist({ ...healthy(), timeline: [{ stage: 'stream', atMs: ms }] });
      expect(find(items, '로딩').state, `${ms}ms 에 경고가 났다 — 임계를 박았는가`).toBe('ok');
    }
    // 못 쟀으면 초록이 아니다.
    expect(find(buildChecklist({ ...healthy(), timeline: [] }), '로딩').state).toBe('unknown');
  });

  it('항목이 하나도 빠지지 않는다 — 조용히 사라지면 아무도 모른다', () => {
    const items = buildChecklist(healthy());
    const labels = items.map((x) => x.label);
    for (const need of ['세계', '크기', '인스턴싱', '거리 컬링', '지도', '그림자(AO)', '정면', '예열', '에러', '로딩']) {
      expect(labels, `「${need}」 항목이 없다`).toContain(need);
    }
  });
});
