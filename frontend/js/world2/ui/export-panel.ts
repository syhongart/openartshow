// world2/ui/export-panel.ts — 내보내기 버튼 배선.
//
// ── 왜 神 모드 패널 안인가 ──────────────────────────────────────────────────
// 화면 네 모서리는 이미 임자가 있고(神 좌상·성능 우상·지도 좌하·수면 우하), 그중 지도와
// 성능은 **캡처를 가린다는 이유로 일부러 접어 둔 것**이다(감독 지시 2026-07-30
// *"월드2에서 캡쳐하면 지도, HUD때문에 안보일테니깐"*). 새 버튼을 다섯 번째 자리에
// 상시 노출로 얹으면 그 결정을 되돌리는 셈이다.
//
// 神 모드 패널은 이미 접혀 있고(`data-open="0"`), 성격도 맞다 — 세계를 바깥에서 만지는
// 도구들이 모여 있는 곳이다.
//
// ── 굽는 동안 화면이 멈춘다 ─────────────────────────────────────────────────
// 노드 17,502개 조립과 GLB 인코딩은 **동기 작업**이고, 그동안 렌더 루프가 돌지 않는다.
// 워커로 옮길 수도 없다 — 지오메트리를 만드는 `createPartAssets()` 가 `CanvasTexture` 를
// 쓰므로 DOM 이 필요하다(`parts/road.ts` 등).
//
// 그래서 숨기지 않고 **버튼에 진행 상태를 쓴다.** 멈춘 화면 앞에서 아무 표시가 없으면
// 브라우저가 죽은 것과 구별되지 않고, 그러면 사용자가 탭을 닫는다.

import { exportWorldGlb, downloadBlob, glbFileName, type ExportProgress } from '../export/glb.js';
import { parseWorldGlb } from '../export/import-glb.js';
import { buildOverlay, type WorldOverlay } from '../export/overlay.js';
import type { ExportNode } from '../export/collect.js';

export interface ExportPanel {
  dispose(): void;
}

export interface ExportPanelOptions {
  /**
   * 되읽은 도시를 적용한다. 없으면 불러오기 버튼이 배선되지 않는다 —
   * 부팅이 끝나기 전에는 갈아 끼울 대상(빌더·스트리밍)이 아직 없기 때문이다.
   */
  applyOverlay?(overlay: WorldOverlay): void;
}

/** DOM 이 없으면 `null` — 조립부가 이 기능의 존재를 몰라도 되게 */
export function attachExportPanel(doc: Document, opts: ExportPanelOptions = {}): ExportPanel | null {
  const btn = doc.getElementById('w2-export-glb') as HTMLButtonElement | null;
  if (!btn) return null;

  const idle = btn.textContent ?? 'GLB 내보내기';
  let busy = false;

  /**
   * 지금 화면에 서 있는 도시. 되읽은 것이 있으면 그 목록이고, 없으면 `null`(= 계산).
   *
   * **이 한 줄이 없어서 왕복이 끊겨 있었다.** 편집본을 불러온 뒤 내보내기를 누르면
   * `exportWorldGlb` 가 세계를 다시 계산해 원본이 나갔다 — 화면은 편집된 도시인데
   * 파일은 아니었다. 되읽기도 내보내기도 각각은 정상이라 양쪽만 봐서는 안 드러난다.
   */
  let loaded: readonly ExportNode[] | null = null;

  const setLabel = (text: string) => { btn.textContent = text; };

  const onClick = async () => {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    try {
      const result = await exportWorldGlb({
        // 되읽은 도시가 있으면 그것을 굽는다. 없으면 세계를 계산한다.
        ...(loaded ? { nodes: loaded } : {}),
        onProgress: (p: ExportProgress) => setLabel(p.message),
      });
      downloadBlob(result.blob, glbFileName());
      // 결과를 남긴다 — 파일이 저장 폴더로 사라지고 나면 무엇이 나갔는지 알 방법이
      // 화면에 없다. 콘솔이 아니라 버튼에 적는 것은 모바일 때문이다(콘솔을 못 본다).
      setLabel(`✓ ${(result.bytes / 1048576).toFixed(1)}MB · ${result.nodes.toLocaleString()}개`);
      setTimeout(() => setLabel(idle), 6000);
    } catch (err) {
      // 조용히 삼키지 않는다. 내보내기는 사용자가 결과 파일을 기다리는 작업이라,
      // 실패했는데 버튼만 원래대로 돌아가면 "눌리지 않았나" 로 읽힌다.
      console.error('[world2] GLB 내보내기 실패', err);
      setLabel('✗ 실패 — 콘솔 확인');
      setTimeout(() => setLabel(idle), 6000);
    } finally {
      busy = false;
      btn.disabled = false;
    }
  };

  btn.addEventListener('click', onClick);

  // ── 되읽기 ─────────────────────────────────────────────────────────────────
  const file = doc.getElementById('w2-import-glb-file') as HTMLInputElement | null;
  const importBtn = doc.getElementById('w2-import-glb') as HTMLButtonElement | null;
  const onPick = () => file?.click();

  const onFile = async () => {
    const chosen = file?.files?.[0];
    if (!chosen || !importBtn || !opts.applyOverlay) return;
    const idleImport = '편집본 불러오기';
    importBtn.disabled = true;
    try {
      importBtn.textContent = '읽는 중…';
      const buf = await chosen.arrayBuffer();
      const { nodes, warnings } = parseWorldGlb(buf);
      if (nodes.length === 0) {
        // 빈 결과를 성공으로 적지 않는다. 파일은 멀쩡한데 우리 재질 이름 규약이 없는
        // GLB(남이 만든 모델)를 골랐을 때가 이 경우다 — 적용하면 세상이 사라진다.
        importBtn.textContent = '✗ 우리 형식이 아니다';
        setTimeout(() => { importBtn.textContent = idleImport; }, 6000);
        return;
      }
      const overlay = buildOverlay(nodes);
      opts.applyOverlay(overlay);
      // 내보내기가 이 목록을 다시 굽도록 기억한다 — 화면과 파일이 갈리지 않게.
      loaded = nodes;

      // 경고를 삼키지 않는다. 특히 `overBudget` 은 화면에 "건물 몇 채가 없다" 로만
      // 나타나서, 안 알려주면 편집을 의심하게 된다(실제로는 슬롯 예산이 원인이다).
      const notes: string[] = [];
      if (overlay.stats.overBudget.length) {
        const worst = overlay.stats.overBudget[0];
        notes.push(`⚠ ${worst.kind} 파셀당 ${worst.peak}개 > 예산 ${worst.budget}`);
      }
      for (const w of warnings) notes.push(`⚠ ${w.detail}${w.count > 1 ? ` ×${w.count}` : ''}`);
      importBtn.textContent = `✓ ${nodes.length.toLocaleString()}개 적용${notes.length ? ' · ' + notes[0] : ''}`;
      if (notes.length) console.warn('[world2] 되읽기 경고\n  ' + notes.join('\n  '));
      setTimeout(() => { importBtn.textContent = idleImport; }, 8000);
    } catch (err) {
      console.error('[world2] GLB 되읽기 실패', err);
      importBtn.textContent = `✗ ${err instanceof Error ? err.message : '실패'}`;
      setTimeout(() => { importBtn.textContent = idleImport; }, 6000);
    } finally {
      importBtn.disabled = false;
      // 같은 파일을 다시 고를 수 있게 비운다 — 안 비우면 `change` 가 안 뜬다.
      if (file) file.value = '';
    }
  };

  // 적용할 곳이 없으면 버튼을 아예 감춘다. 눌러도 아무 일이 없는 버튼을 두는 것보다 낫다.
  if (importBtn) {
    if (opts.applyOverlay) {
      importBtn.addEventListener('click', onPick);
      file?.addEventListener('change', onFile);
    } else {
      importBtn.hidden = true;
    }
  }

  return {
    dispose: () => {
      btn.removeEventListener('click', onClick);
      importBtn?.removeEventListener('click', onPick);
      file?.removeEventListener('change', onFile);
    },
  };
}
