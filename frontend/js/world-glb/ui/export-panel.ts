// world-glb/ui/export-panel.ts — 내보내기 버튼 배선.
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
// 노드 28,704개 조립과 GLB 인코딩은 **동기 작업**이고, 그동안 렌더 루프가 돌지 않는다.
// 워커로 옮길 수도 없다 — 지오메트리를 만드는 `createPartAssets()` 가 `CanvasTexture` 를
// 쓰므로 DOM 이 필요하다(`parts/road.ts` 등).
//
// 그래서 숨기지 않고 **버튼에 진행 상태를 쓴다.** 멈춘 화면 앞에서 아무 표시가 없으면
// 브라우저가 죽은 것과 구별되지 않고, 그러면 사용자가 탭을 닫는다.

import { exportWorldGlb, downloadBlob, glbFileName, type ExportProgress } from '../export/glb.js';
import { parseWorldGlb } from '../export/import-glb.js';
import { buildOverlay, type WorldOverlay } from '../export/overlay.js';
import type { CollectOptions } from '../export/collect.js';
import type { ImportedResult } from '../export/imported-scene.js';
import { importNotice } from './import-notice.js';
import type { OriginalGlb } from '../options.js';

export interface ExportPanel {
  dispose(): void;
}

export interface ExportPanelOptions {
  /**
   * 되읽은 도시를 적용한다. 없으면 불러오기 버튼이 배선되지 않는다 —
   * 부팅이 끝나기 전에는 갈아 끼울 대상(빌더·스트리밍)이 아직 없기 때문이다.
   */
  applyOverlay?(overlay: WorldOverlay): void;
  /**
   * **우리 파츠가 아닌 메시**를 씬에 올린다(`export/imported-scene.ts`). 얹은 수를 낸다.
   *
   * 없으면 그 갈래가 통째로 꺼진다 — 감독이 블렌더에서 추가한 물건이 조용히 사라지므로
   * 배선을 빠뜨리면 안 된다. `tests/world2-foreign-glb.test.ts` 의 「배선」 절이 그것을
   * 검사한다.
   *
   * ⚠ 이 줄이 한때 `tests/world2-export-wiring.test.ts` 를 가리켰고 **그 파일은
   * `applyImported` 를 한 번도 언급하지 않는다**(검수관 블로커 B2, 실측 grep 0건).
   * 검사는 실재했으므로 검출력은 있었지만, 게이트 유효성에 대한 거짓 진술은 다음
   * 사람이 확인을 생략하게 만든다 — 이 저장소가 반복해 대가를 치른 형태다.
   */
  applyImported?(buf: ArrayBuffer): Promise<ImportedResult>;
  /**
   * **화면이 쓰는 배치 체인.** 내보내기가 이것을 그대로 태운다 — 그래야 「내보낸 것이
   * 화면 그대로」가 성립한다(팀장 조건 1, 2026-08-25).
   *
   * 여기서 우선순위를 다시 조립하지 않고 **받은 함수를 그대로 넘긴다.** 조립하면 그
   * 순간 화면과 파일이 갈릴 수 있는 두 번째 자리가 생긴다.
   *
   * ── 🔴 **그 「화면 그대로」는 파셀 세계에서만 참이다** (2026-09-18 실측 정정) ──
   * 이 줄은 오래 조건 없이 *"내보낸 것이 화면 그대로"* 라고 적고 있었고, **GLB 가 세계인
   * 페이지(world7·world8·world11)에서는 거짓이다.** `export/collect.ts` 는 헤더대로
   * *"화면을 굽지 않고 세계를 다시 계산한다"* 이고 그 계산의 입력은 `parcelLayout`·
   * `DEFAULT_LAYOUT`·`parts/index.js` — 즉 **파셀 배치**뿐이다. 부팅 때 통째로 받은
   * 외부 GLB 는 그 계산에 **아예 들어가지 않으므로**, 저 세 페이지에서 이 버튼을 누르면
   * 화면의 세계가 아니라 **world2 섬**이 나온다. 감독이 그것을 신고했다(2026-09-18
   * *"맨하탄이 내보내기로 안나와"*).
   *
   * **world11 은 `originalGlb` 로 갈랐다**(감독 카드 판정 「원본 파일을 받게 바꾼다」).
   * **world7·world8 은 지금도 이 상태다** — 고치지 않았고, 그 사실을 여기 적어 둔다.
   * 게이트·계약에 대한 거짓 진술은 다음 사람이 확인을 생략하게 만든다.
   */
  layoutSource?: CollectOptions['layoutSource'];

  /**
   * **있으면 버튼이 「원본 GLB 내려받기」가 된다** — 굽지 않고 부팅 때 받은 바이트를
   * 그대로 내려준다. 없으면 위 굽기 경로 그대로다(world7·world8 불변).
   *
   * 계약·경위는 `options.ts` 의 `exportSource` 한 곳이다 — 여기에 다시 적지 않는다.
   * `null` 을 내면 **조용히 지나가지 않는다**: 버튼에 사유를 적고 콘솔에 남긴다
   * (`export/imported-scene.ts` 가 검수관 블로커 B1 로 그것을 배운 자리다 — 실패를
   * 값으로 내되 화면에 도달시킨다).
   */
  /**
   * ⚠ **`?:` 가 아니라 필수다 — 그것이 이 필드의 게이트다.**
   *
   * 이 값이 화면에 도달하는 경로는 부트 → `options.exportSource` → **`main.ts` 의 중계
   * 한 줄** → 여기, 셋을 잇는다. 양끝은 실행 테스트가 잡는다(`world11-boot-run` ·
   * `world-glb-export-original`). **가운데 한 줄은 실행으로 못 잡는다** — `main.ts` 의
   * 패널 배선은 `runBoot` 가 성공한 뒤에 있고, `kernel` 이 `stream` 단계 안에서 만들어져
   * 부팅을 스텁하면 그 앞에서 `kernel!.markDirty()` 가 터진다(실측 2026-09-18).
   *
   * 직전 회차의 검수관 블로커 B1 이 정확히 그 사각이었다(`defaultWebGL` 중계 줄을
   * 되돌려도 관련 테스트 44개 전부 통과). 그래서 **타입을 게이트로 쓴다**: 필수이므로
   * `main.ts` 가 안 넘기면 `npm run gate` 의 typecheck 가 떨어진다.
   *
   * **`| undefined` 를 허용하는 것이 world7·world8 의 불변 축이다** — 저쪽 부트는
   * `exportSource` 를 안 넘기므로 여기 `undefined` 가 오고, 그때 버튼은 종전 굽기
   * 경로 그대로다.
   *
   * 🔴 **이 타입이 못 잡는 것**: `originalGlb: undefined` 로 **하드코딩**하는 것.
   * 누락은 잡고 오배선은 못 잡는다 — 그 한계를 알고 쓴다.
   */
  originalGlb: (() => OriginalGlb | null | Promise<OriginalGlb | null>) | undefined;
}

/** DOM 이 없으면 `null` — 조립부가 이 기능의 존재를 몰라도 되게 */
// ⚠ `opts` 에 기본값(`= {}`)이 있었고 **지웠다** — `originalGlb` 가 필수라 `{}` 가
// 더는 유효한 옵션이 아니다. 기본값을 남기면 호출처가 인자를 통째로 빼도 통과하고,
// 그 순간 위 타입 게이트가 무력해진다.
export function attachExportPanel(doc: Document, opts: ExportPanelOptions): ExportPanel | null {
  const btn = doc.getElementById('wg-export-glb') as HTMLButtonElement | null;
  if (!btn) return null;

  // ── 라벨은 **코드가 정한다** (감독 신고 2026-09-18) ────────────────────────
  // 원본 내려받기가 걸린 페이지에서 버튼이 「GLB 내보내기」로 남아 있으면 그것이 곧
  // **거짓 표시**다 — 하는 일이 다르다. HTML 의 초기 텍스트에 기대지 않고 여기서
  // 덮어쓴다(HTML 에도 같은 글자를 적으면 값 미러링이고, 이 저장소는 그 형태로 세 번
  // 데였다 — CLAUDE.md 검증 규율 절).
  const DOWNLOAD_LABEL = '원본 GLB 내려받기';
  if (opts.originalGlb) btn.textContent = DOWNLOAD_LABEL;

  const idle = btn.textContent ?? 'GLB 내보내기';
  let busy = false;

  const setLabel = (text: string) => { btn.textContent = text; };

  /**
   * **원본 갈래.** 굽지 않고 부팅 때 받은 바이트를 그대로 내려준다.
   * 경위·판정은 `options.ts` 의 `exportSource` 한 곳이다.
   */
  const downloadOriginal = async (get: NonNullable<ExportPanelOptions['originalGlb']>) => {
    setLabel('원본 준비 중…');
    const src = await get();
    // ⚠ **조용히 지나가지 않는다.** 여기 `if (!src) return;` 만 두면 버튼이 원래대로
    // 돌아가고 사용자는 「눌리지 않았나」로 읽는다. 모바일이라 콘솔을 못 보므로 사유는
    // **버튼에** 적는다(이 패널이 진행 상태를 버튼에 쓰는 것과 같은 이유).
    if (!src || !src.bytes || src.bytes.byteLength === 0) {
      throw new Error('원본 GLB 바이트가 없다 — 세계가 아직 안 실렸거나 버퍼를 잃었다');
    }
    // 파일 이름은 **자산 이름을 그대로** 쓴다(`manhattan-180m.glb`). 새 이름을 짓지
    // 않는 이유: 이 파일은 우리가 만든 산출물이 아니라 **받은 그 파일**이고, 감독이
    // 블렌더에서 다시 열 때 저장소의 자산과 같은 이름이어야 대조가 된다. 이름을
    // 정하는 것은 트리가 아니라 **부트**다(자산 경로를 아는 유일한 자리 — `options.ts`).
    downloadBlob(new Blob([src.bytes], { type: 'model/gltf-binary' }), src.name);
    setLabel(`✓ ${(src.bytes.byteLength / 1048576).toFixed(1)}MB · 원본 그대로`);
  };

  const onClick = async () => {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    try {
      if (opts.originalGlb) {
        await downloadOriginal(opts.originalGlb);
        setTimeout(() => setLabel(idle), 6000);
        return;
      }
      const result = await exportWorldGlb({
        layoutSource: opts.layoutSource,
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
      console.error('[glb-world] GLB 내보내기 실패', err);
      // 사유를 **버튼에** 적는다 — 「콘솔 확인」은 모바일에서 실행 불가능한 안내다.
      setLabel(`✗ ${err instanceof Error ? err.message : '실패'}`);
      setTimeout(() => setLabel(idle), 6000);
    } finally {
      busy = false;
      btn.disabled = false;
    }
  };

  btn.addEventListener('click', onClick);

  // ── 되읽기 ─────────────────────────────────────────────────────────────────
  const file = doc.getElementById('wg-import-glb-file') as HTMLInputElement | null;
  const importBtn = doc.getElementById('wg-import-glb') as HTMLButtonElement | null;
  const note = doc.getElementById('wg-import-note');
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

      // ── 남의 메시를 먼저 올린다 (감독 지시 2026-08-25) ────────────────────
      // *"블랜더의 glb로 내보낸 것은 그대로 올라와야지."* — 우리 파츠가 **하나도 없어도**
      // 남의 메시는 올라와야 한다. 그래서 아래 «파츠 0» 판정보다 앞이다.
      //
      // ⚠ 여기 원래 `nodes.length === 0` 이면 **곧장 «우리 형식이 아니다» 로 되돌아가는**
      // 갈래가 있었고, 감독이 블렌더에서 오브젝트를 추가해 되읽었을 때 밟은 것이 그것이다.
      // 파츠 판정 하나로 파일 전체를 거절하고 있었다.
      //
      // ⚠⚠ **실패를 격리한다.** 여기서 던지면 아래 파츠 배치가 통째로 안 돈다 — 즉
      // 물건 하나가 안 올라오는 대신 **도시 전체가 안 실린다.** 실측으로 그 경로를
      // 밟았다(BIN 없는 GLB → GLTFLoader 크래시 → 되읽기 전체 실패).
      // `import-glb.ts` 의 warnings 규약과 같은 원리다: 한 건 때문에 전체가 죽으면 안 된다.
      let imported: ImportedResult = { meshes: 0, reason: 'none' };
      if (opts.applyImported) {
        try {
          imported = await opts.applyImported(buf);
        } catch (err) {
          // `apply` 는 이제 사유를 값으로 내지만, 예상 못 한 예외까지 여기서 막는다 —
          // 던지면 아래 파츠 배치가 통째로 안 돈다(감독 신고와 같은 형태).
          imported = { meshes: 0, reason: 'error', detail: err instanceof Error ? err.message : String(err) };
        }
      }
      const foreign = imported.meshes;
      // ── 문구는 **순수 함수가 짓는다** (검수관 조건 C1) ──────────────────────
      // 이 조립이 여기 인라인이었을 때 **어떤 검사도 닿지 않았다** — `failed` 를 `false`
      // 로 바꿔 세 자리가 동시에 실패를 안 말하게 만들어도 4,785건 중 0건이 깨졌다.
      // 그 상태가 곧 감독이 신고한 화면이다. 검사가 닿는 자리로 옮겼다.
      const notice = importNotice({
        parts: nodes.length, foreign, reason: imported.reason, detail: imported.detail,
      });
      if (notice.failed) console.error(`[glb-world] 추가된 물건을 올리지 못했다 — ${notice.why}`);

      if (notice.reject) {
        importBtn.textContent = notice.rejectLabel;
        setTimeout(() => { importBtn.textContent = idleImport; }, notice.failed ? 8000 : 6000);
        return;
      }
      // 파츠가 0개여도 위에서 남의 메시가 올라왔을 수 있다 — 그때는 오버레이를 안 건다
      // (빈 오버레이를 걸면 「전부 지운 세계」가 되어 마을이 통째로 사라진다).
      const overlay = nodes.length > 0 ? buildOverlay(nodes) : null;
      if (overlay) opts.applyOverlay(overlay);

      // ── 무엇이 대체되고 무엇이 남는지 (팀장 조건 3, 2026-08-25) ───────────
      // ⚠ 이 문구가 «마을 편집을 대체합니다» 뿐이었고, 그대로 두면 **거짓 고지**가 된다 —
      // 팀장 판정 (B)로 `?edit=1` 오버레이 배치는 **유지**되기 때문이다. 대체 범위를
      // 정확히 적는다. 원장이 보존된다는 것도 같은 줄에 있어야 «편집이 사라졌다» 오해가
      // 안 생긴다.
      if (note) {
        note.textContent = notice.note;
        note.hidden = false;
      }

      // 경고를 삼키지 않는다. 특히 `overBudget` 은 화면에 "건물 몇 채가 없다" 로만
      // 나타나서, 안 알려주면 편집을 의심하게 된다(실제로는 슬롯 예산이 원인이다).
      const notes: string[] = [];
      // 순서가 곧 우선순위다(`notes[0]` 만 버튼에 나간다). **실패가 맨 앞**이다.
      if (notice.leadWarning) notes.push(notice.leadWarning);
      // ⚠ 여기 오래 «세계 밖·물 위 = 안 그려진다» 라고 적혀 있었고 **지금은 거짓이다.**
      // 배정이 「그려지는 파셀 중 가장 가까운 것」으로 바뀌어서 그런 부품도 가장자리
      // 칸에 실린다(`overlay.ts` 의 `hostParcel`). 실제로 사라지는 것은 `dropped` 뿐이다.
      //
      // 안 사라지는 것을 «사라졌다» 로 알리면 사용자가 멀쩡한 편집을 되돌린다 — 안
      // 알리는 것과 방향만 다른 같은 실패다.
      // 순서가 곧 우선순위다 — `notes[0]` 만 버튼 라벨에 나간다(모바일에서 콘솔을 못
      // 본다). 그러므로 **화면에서 실제로 잘리는 것**을 맨 앞에 둔다.
      if (overlay?.stats.overBudget.length) {
        const worst = overlay.stats.overBudget[0];
        notes.push(`⚠ ${worst.kind} 파셀당 ${worst.peak}개 > 예산 ${worst.budget}`);
      }
      if (overlay && overlay.stats.dropped > 0) {
        notes.push(`⚠ ${overlay.stats.dropped.toLocaleString()}개가 실을 칸을 못 찾았다`);
      }
      const outside = overlay ? overlay.stats.outsideGrid + overlay.stats.onWater : 0;
      if (overlay && outside > 0) {
        notes.push(`세계 밖·물 위 ${outside.toLocaleString()}개는 이웃 칸에 실렸다`
          + ` (격자밖 ${overlay.stats.outsideGrid} · 물 ${overlay.stats.onWater})`);
      }
      // ── `unknown-kind` 는 이제 **경고가 아니다** (감독 지시 2026-08-25) ────
      // 우리 재질 규약 밖인 메시는 `applyImported` 가 **실제로 씬에 올린다.** 그것을
      // 계속 «⚠ 재질 이름 형식이 아니다» 로 띄우면 성공한 일을 실패로 알리는 것이고,
      // 감독이 처음 밟은 것이 정확히 그 오해다. 못 올린 경우(`foreign === 0`)에만 남긴다.
      for (const w of warnings) {
        if (w.code === 'unknown-kind' && foreign > 0) continue;
        notes.push(`⚠ ${w.detail}${w.count > 1 ? ` ×${w.count}` : ''}`);
      }
      const parts = [`✓ ${nodes.length.toLocaleString()}개 적용`];
      if (foreign > 0) parts.push(`추가된 물건 ${foreign.toLocaleString()}개`);
      if (notes.length) parts.push(notes[0]);
      importBtn.textContent = parts.join(' · ');
      if (notes.length) console.warn('[glb-world] 되읽기 경고\n  ' + notes.join('\n  '));
      setTimeout(() => { importBtn.textContent = idleImport; }, 8000);
    } catch (err) {
      console.error('[glb-world] GLB 되읽기 실패', err);
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
