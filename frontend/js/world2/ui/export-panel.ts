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

export interface ExportPanel {
  dispose(): void;
}

/** DOM 이 없으면 `null` — 조립부가 이 기능의 존재를 몰라도 되게 */
export function attachExportPanel(doc: Document): ExportPanel | null {
  const btn = doc.getElementById('w2-export-glb') as HTMLButtonElement | null;
  if (!btn) return null;

  const idle = btn.textContent ?? 'GLB 내보내기';
  let busy = false;

  const setLabel = (text: string) => { btn.textContent = text; };

  const onClick = async () => {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    try {
      const result = await exportWorldGlb({
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
  return { dispose: () => btn.removeEventListener('click', onClick) };
}
