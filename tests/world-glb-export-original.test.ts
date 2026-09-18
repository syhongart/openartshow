// @vitest-environment jsdom
//
// `world-glb/ui/export-panel.ts` 의 **원본 내려받기 갈래 집행** 테스트 — 패널을 실제로
// 붙이고 버튼을 **진짜로 클릭**한다.
//
// ── 왜 생겼나 (감독 신고 2026-09-18) ────────────────────────────────────────
// 감독 원문: ***"glb내보내기 할때. 기존 맵이 내보내기가 되네"*** ·
// ***"맨하탄이 내보내기로 안나와"***. 월드11에서 내보내면 맨해튼이 아니라 world2 섬이
// 나왔다. 원인은 설계다 — `export/collect.ts` 가 *"화면을 굽지 않고 세계를 다시
// 계산한다"* 이고 그 계산의 입력은 파셀 배치뿐이라 **GLB 세계가 아예 없다.**
// 감독 카드 판정은 **「원본 파일을 받게 바꾼다」**.
//
// ── 무엇을 스텁하는가 ───────────────────────────────────────────────────────
// **`export/glb.js` 하나뿐이다.** 그것이 (a) 실제로 세계를 굽는 자리이자 (b) 브라우저
// 다운로드를 일으키는 자리다 — jsdom 에서 둘 다 재현할 수 없고, 우리가 재는 것은
// **어느 쪽이 불렸는가**이지 결과 파일의 내용이 아니다. 패널 본문은 **진짜를 돌린다.**
//
// 🔴 **소스 문자열 검사로 하지 않는 이유**: 직전 회차의 검수관 블로커 B1 이 정확히 그
// 형태였다 — 배선 한 줄을 되돌려도 관련 테스트 44개가 전부 통과했다. 여기서는 클릭이
// 어느 함수에 도달하는지를 **호출로** 잡는다.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/** 굽기 경로가 불렸는가 */
const baked: unknown[] = [];
/** 실제로 내려간 것 — `[blob, filename]` */
const downloads: Array<{ size: number; name: string }> = [];

vi.mock('../frontend/js/world-glb/export/glb.js', () => ({
  exportWorldGlb: async (o: unknown) => {
    baked.push(o);
    return { blob: new Blob([new Uint8Array(3)]), bytes: 3, nodes: 7 };
  },
  downloadBlob: (blob: Blob, name: string) => { downloads.push({ size: blob.size, name }); },
  glbFileName: (tier = 'near') => `openartshow-world2-${tier}.glb`,
}));

const { attachExportPanel } = await import('../frontend/js/world-glb/ui/export-panel.js');

let errors: unknown[][] = [];

const button = (): HTMLButtonElement =>
  document.getElementById('wg-export-glb') as HTMLButtonElement;

/** 클릭하고 핸들러(비동기)가 끝날 때까지 기다린다 */
const clickAndSettle = async (): Promise<void> => {
  button().click();
  // `onClick` 은 async 라 마이크로태스크 몇 바퀴가 필요하다. 조건으로 기다린다 —
  // 고정 tick 수는 갈래가 늘면 조용히 모자라진다.
  await vi.waitFor(() => {
    expect(button().disabled, '핸들러가 아직 안 끝났다').toBe(false);
  });
};

beforeEach(() => {
  baked.length = 0;
  downloads.length = 0;
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => { errors.push(a); });
  document.body.innerHTML = '<button id="wg-export-glb" type="button">GLB 내보내기</button>';
});
afterEach(() => { vi.restoreAllMocks(); });

describe('내보내기 패널 — 원본 GLB 내려받기 (감독 판정 2026-09-18)', () => {
  it('ⓐ `originalGlb` 를 **안 넘기면** 종전 굽기 경로 그대로다 — world7·world8 불변', async () => {
    // 이 검사가 이번 변경의 **범위 경계**다. world7·world8 부트는 새 필드를 안 넘기므로
    // 여기가 깨지면 그 두 페이지가 조용히 갈린 것이다(`options.ts` 경계 조항).
    // `originalGlb: undefined` 를 **명시**한다 — 그것이 world7·world8 이 넘기는 값이다.
    const panel = attachExportPanel(document, { originalGlb: undefined });
    expect(panel, '패널이 안 붙었다').not.toBeNull();
    expect(button().textContent, '라벨이 바뀌었다 — 하는 일은 그대론데').toBe('GLB 내보내기');

    await clickAndSettle();

    expect(baked, '굽기 경로가 안 불렸다').toHaveLength(1);
    expect(downloads).toEqual([{ size: 3, name: 'openartshow-world2-near.glb' }]);
  });

  it('ⓑ `originalGlb` 를 넘기면 **굽지 않고** 그 바이트를 그대로 내려준다', async () => {
    const bytes = new ArrayBuffer(2048);
    attachExportPanel(document, {
      originalGlb: () => ({ bytes, name: 'manhattan-180m.glb' }),
    });
    // 라벨도 함께 바뀌어야 한다 — 하는 일이 다른데 글자가 그대로면 그 자체가 거짓 표시다.
    expect(button().textContent).toBe('원본 GLB 내려받기');

    await clickAndSettle();

    expect(baked, '원본을 준다면서 세계를 구웠다').toHaveLength(0);
    expect(downloads).toEqual([{ size: 2048, name: 'manhattan-180m.glb' }]);
  });

  it('ⓑ-2 **이름도 바이트도 따라온다** — 앞 검사가 상수를 재고 있지 않다는 대조군', async () => {
    attachExportPanel(document, {
      originalGlb: () => ({ bytes: new ArrayBuffer(11), name: 'somewhere-else.glb' }),
    });
    await clickAndSettle();
    expect(downloads).toEqual([{ size: 11, name: 'somewhere-else.glb' }]);
  });

  it('ⓑ-3 `Promise` 를 내도 된다 — 계약이 `Promise<OriginalGlb|null>` 도 받는다', async () => {
    attachExportPanel(document, {
      originalGlb: async () => ({ bytes: new ArrayBuffer(5), name: 'later.glb' }),
    });
    await clickAndSettle();
    expect(downloads).toEqual([{ size: 5, name: 'later.glb' }]);
  });

  it('ⓒ 버퍼를 못 얻으면 **조용히 실패하지 않는다** — 사유가 버튼에 남는다', async () => {
    // `export/imported-scene.ts` 가 검수관 블로커 B1 로 배운 자리와 같은 형태다:
    // 실패를 값으로 내되 **화면에 도달**시킨다. 감독은 핸드폰이라 콘솔을 못 본다 —
    // 버튼이 그냥 원래 글자로 돌아가면 「눌리지 않았나」로 읽힌다.
    attachExportPanel(document, { originalGlb: () => null });
    await clickAndSettle();

    expect(downloads, '빈 파일을 내려보냈다').toHaveLength(0);
    expect(baked, '원본이 없다고 굽기로 흘러갔다').toHaveLength(0);
    expect(button().textContent).toContain('원본 GLB 바이트가 없다');
    expect(errors.flat().join(' '), '콘솔에도 안 남겼다').toContain('GLB 내보내기 실패');
  });

  it('ⓒ-2 **길이 0 버퍼도 실패다** — 존재 검사만 하면 빈 파일이 내려간다', async () => {
    attachExportPanel(document, {
      originalGlb: () => ({ bytes: new ArrayBuffer(0), name: 'empty.glb' }),
    });
    await clickAndSettle();
    expect(downloads).toHaveLength(0);
    expect(button().textContent).toContain('원본 GLB 바이트가 없다');
  });

  it('ⓒ-3 `originalGlb` 가 **던져도** 사유가 버튼에 남는다', async () => {
    attachExportPanel(document, {
      originalGlb: () => { throw new Error('부팅이 아직 안 끝났다'); },
    });
    await clickAndSettle();
    expect(downloads).toHaveLength(0);
    expect(button().textContent).toContain('부팅이 아직 안 끝났다');
  });
});
