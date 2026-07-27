// debug-perf.js — 실기기 성능 계측 디버그 HUD + 세션 로거 (behind-flag).
//
// 목적: swiftshader 헤드리스가 실 GPU를 재현 못 해, 개발자가 실기기(PC·모바일)에서
//       프레임 실수치를 보고(HUD), 나아가 "시계열 로그를 언제든 뽑아" 파셀 경계 드랍
//       같은 순간 부하를 사후 분석할 수 있게 한다. 무백엔드·자기완결이라 서버 전송은
//       불가 → 기기 메모리(링버퍼)에 쌓고, 버튼으로 클립보드 복사/CSV 저장한다.
//
// behind-flag 규율: 이 모듈은 각 진입점의 `?debug=perf` 게이트 뒤 "동적 import"로만
//   로드된다. 쿼리스트링이 없으면 네트워크 로드·실행 자체가 0 → 일반 방문자 완전 무영향.
//
// 기록 on/off 분리(오버헤드 0 규율):
//   - `?debug=perf`            → HUD 표시만. 시계열 기록 경로 진입 자체가 없음(오버헤드 0).
//   - `?debug=perf&rec`(or &log) → 시계열 기록 활성(250ms 샘플·링버퍼·내보내기 버튼).
//   순수 fps 측정 시 rec를 빼면 로깅 오버헤드가 완전히 사라진다.
//
// 저부하 규율(rec 시): rAF 틱에서는 "숫자만" 사전할당 배열 슬롯에 대입한다.
//   문자열화·DOM 조작·console.* 절대 없음. DOM 갱신은 기존대로 1초 요약뿐이고,
//   시계열 버퍼의 문자열화(CSV 1200행)는 오직 "복사/저장" 버튼을 누른 순간에만 한다.
//
// 자기완결: 외부 호스트 0(폰트·스크립트·이미지 전부 self). 인라인 스크립트 아님(모듈 파일).
//   내보내기는 클립보드(navigator.clipboard)·로컬 Blob 다운로드만 — 네트워크 전송 0.
//   CSP `default-src 'self'` 유지.

/**
 * 성능 HUD를 마운트한다. `?debug=perf&rec`(또는 &log)면 시계열 로거도 함께 활성.
 * @param {import('three').WebGLRenderer} renderer 대상 렌더러(getPixelRatio·info 조회)
 * @param {string} page 페이지 식별 라벨(index/world/builder)
 * @param {{getSpec?:()=>*, getLite?:()=>*}} [extra] 페이지별 부가 지표 조회기(선택)
 * @returns {{el:HTMLElement, dispose:Function}|undefined}
 */
export function mountPerfHud(renderer, page = '?', extra = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !renderer) return;
  if (window.__perfHudMounted) return window.__perfHudMounted; // 중복 마운트 방지(다중 진입 안전)

  const getSpec = typeof extra.getSpec === 'function' ? extra.getSpec : () => null;
  const getLite = typeof extra.getLite === 'function' ? extra.getLite : () => undefined;

  // ── 기록 모드 판별 — `&rec` 또는 `&log`가 있을 때만 시계열 로거 활성 ──
  //   rec가 아니면 아래 링버퍼 할당·틱 내 기록 분기 자체를 타지 않아 오버헤드 0.
  const REC = /(?:^|[?&])(?:rec|log)(?:=|&|$)/.test(location.search);

  // ── 오버레이 컨테이너 — 우상단 고정, safe-area(노치·상단바) 회피, 터치 통과 ──
  const el = document.createElement('div');
  el.id = 'perf-hud';
  el.style.cssText = [
    'position:fixed',
    'top:max(10px,env(safe-area-inset-top,0px))',
    'right:max(10px,env(safe-area-inset-right,0px))',
    'z-index:2147483647',            // 어떤 UI(조이스틱·HUD)보다 위 — 단 pointer-events:none이라 조작 방해 0
    'pointer-events:none',           // 터치·클릭 통과(감독 조작 무방해) — 내보내기 버튼만 개별 auto
    'user-select:none',
    'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    'color:#fff',
    'background:rgba(0,0,0,0.74)',   // 고대비 배경 플레이트 — 밝은 씬에서도 숫자 판독
    'border:2px solid rgba(255,255,255,0.4)',
    'border-radius:12px',
    'padding:8px 12px 9px',
    'text-align:right',
    'text-shadow:0 1px 2px #000, 0 0 6px rgba(0,0,0,0.9)',
    'line-height:1.12',
    'max-width:64vw',
    'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
  ].join(';');

  // FPS — 최상단, 가장 큰 글씨(감독이 프레임 수치를 제일 먼저 본다)
  const fpsLine = document.createElement('div');
  fpsLine.style.cssText = 'font-size:36px;font-weight:800;letter-spacing:0.3px;';

  // 최악 프레임(직전 1초 창의 최소 FPS = 버벅 순간) + 세션 최소
  const subLine = document.createElement('div');
  subLine.style.cssText = 'font-size:14px;font-weight:700;opacity:0.95;margin-top:1px;';

  // 나머지 지표(spec·pixelRatio·lite·드로우콜·삼각형·텍스처힙·페이지) — FPS 아래 작게
  const info = document.createElement('div');
  info.style.cssText = 'font-size:12px;font-weight:600;opacity:0.9;margin-top:6px;white-space:pre;';

  el.appendChild(fpsLine);
  el.appendChild(subLine);
  el.appendChild(info);

  // ── (rec 전용) 세션 요약 라인 + 내보내기 버튼 — 링버퍼가 있을 때만 생성 ──
  let recLine = null;        // avg·min·p95·최악순간(draw/tri) 요약 오버레이
  let copyBtn = null, saveBtn = null, hint = null;
  if (REC) {
    recLine = document.createElement('div');
    recLine.style.cssText = 'font-size:11px;font-weight:600;opacity:0.9;margin-top:6px;white-space:pre;color:#BFE3FF;border-top:1px solid rgba(255,255,255,0.25);padding-top:5px;';
    el.appendChild(recLine);

    // 버튼 바 — 부모는 pointer-events:none이지만 이 바만 auto로 클릭 수신(조작 무방해)
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;margin-top:7px;pointer-events:auto;';
    const btnCss =
      'pointer-events:auto;min-height:32px;min-width:56px;padding:6px 12px;border-radius:8px;' +
      'border:1px solid rgba(255,255,255,0.5);background:rgba(30,30,30,0.92);color:#fff;' +
      'font:700 12px/1 ui-monospace,Menlo,Consolas,monospace;cursor:pointer;user-select:none;' +
      '-webkit-tap-highlight-color:transparent;touch-action:manipulation;';
    copyBtn = document.createElement('button');
    copyBtn.type = 'button'; copyBtn.textContent = '복사'; copyBtn.style.cssText = btnCss;
    saveBtn = document.createElement('button');
    saveBtn.type = 'button'; saveBtn.textContent = '저장'; saveBtn.style.cssText = btnCss;
    bar.appendChild(copyBtn); bar.appendChild(saveBtn);
    el.appendChild(bar);

    // 짧은 상태 힌트(복사 성공/실패·폴백 안내) — 필요 시에만 문구 갱신
    hint = document.createElement('div');
    hint.style.cssText = 'font-size:10px;font-weight:600;opacity:0.85;margin-top:4px;min-height:0;color:#CFFFC0;';
    el.appendChild(hint);
  }

  (document.body || document.documentElement).appendChild(el);

  // ── rAF 실측 — 1초 평균 + 그 1초 창의 최악(가장 느린) 프레임 + 세션 최소 ──
  let frames = 0;
  let acc = 0;             // 1초 창 누적 시간(ms)
  let worstDt = 0;         // 1초 창 내 최대 프레임 간격(ms) → 최악 FPS
  let warm = 0;            // 초기 워밍업 프레임 스킵(첫 렌더 스파이크 배제)
  const startT = performance.now();
  let lastT = startT;
  let avg = 0;             // 1초 평균 FPS
  let worst = 0;           // 직전 1초 창의 최악 FPS
  let gmin = Infinity;     // 세션 누적 최소(최악 창의 최소값)
  let raf = 0;

  // ── (rec 전용) 250ms 시계열 링버퍼 — 사전할당 병렬 typed 배열(저부하) ──
  //   최근 ~5분(1200샘플 × 250ms = 300초) 상한. 초과 시 head가 회전하며 오래된 것 덮어씀.
  //   필드: t(상대ms)·fps·fpsMin·px·draw·tri·tex + evt(마커코드). page는 마운트 고정 라벨.
  const CAP = 1200;
  let bufT, bufFps, bufRfps, bufMin, bufPx, bufDraw, bufTri, bufTex, bufEvt;
  let head = 0, count = 0;              // 링버퍼 write 커서 / 채워진 샘플 수
  let segAcc = 0, segFrames = 0, segWorstDt = 0; // 250ms 구간 누적 상태
  let prevDraw = 0, prevMin = 0;        // 직전 샘플과의 급변 비교용
  let prevRenderFrame = -1;             // 직전 샘플의 renderer.info.render.frame(실제 렌더 fps 산출용, -1=미초기화)
  let seededPage = false;               // 세션 시작(page) 마커 1회 부여
  if (REC) {
    bufT = new Float64Array(CAP);
    bufFps = new Float32Array(CAP);
    bufRfps = new Float32Array(CAP);
    bufMin = new Float32Array(CAP);
    bufPx = new Float32Array(CAP);
    bufDraw = new Int32Array(CAP);
    bufTri = new Int32Array(CAP);
    bufTex = new Int32Array(CAP);
    bufEvt = new Uint8Array(CAP);       // 0=없음 · 1=파셀로드 추정 드랍 · 2=세션시작/페이지
  }

  // 250ms 구간 마감 시 호출 — rAF 틱 안에서만 불리며 "숫자 연산·슬롯 대입"만 한다.
  //   (문자열화·DOM·console 없음 → 프레임 오버헤드 최소)
  function pushSample(now, rInfo, mInfo, prNum) {
    const fps = segAcc > 0 ? (segFrames * 1000) / segAcc : 0;
    // [실제 렌더 fps] 위 fps는 debug-perf 자체 rAF(브라우저 화면 주사율) 틱 빈도라 world의 프레임 캡
    // (update/render 호출 제한)을 반영하지 못한다. rfps는 renderer.info.render.frame(three가
    // renderer.render() 호출마다 +1하는 누적 카운터)의 구간 증가량/구간시간 = 실제 3D 렌더 호출 빈도라
    // 프레임 캡 작동·효과를 직접 드러낸다(캡 45면 rfps≤45, 화면 fps는 그대로 60일 수 있다).
    const rframe = rInfo.frame | 0;
    const rfps = (prevRenderFrame >= 0 && segAcc > 0) ? ((rframe - prevRenderFrame) * 1000) / segAcc : 0;
    prevRenderFrame = rframe;
    const fmin = segWorstDt > 0 ? 1000 / segWorstDt : fps;
    const draw = rInfo.calls | 0;
    const tri = rInfo.triangles | 0;
    // 마커 자동 태깅: 직전 샘플 대비 draw ±30% 이상 급변 AND fpsMin 30%+ 급락 → 파셀 로드 추정.
    let evt = 0;
    if (!seededPage) { evt = 2; seededPage = true; }      // 첫 샘플 = 세션/페이지 시작 표식
    else if (prevDraw > 0 && prevMin > 0 &&
             Math.abs(draw - prevDraw) >= prevDraw * 0.30 &&
             fmin < prevMin * 0.70) {
      evt = 1;
    }
    bufT[head] = now - startT;
    bufFps[head] = fps;
    bufRfps[head] = rfps;
    bufMin[head] = fmin;
    bufPx[head] = prNum;
    bufDraw[head] = draw;
    bufTri[head] = tri;
    bufTex[head] = mInfo.textures | 0;
    bufEvt[head] = evt;
    prevDraw = draw; prevMin = fmin;
    head = (head + 1) % CAP;
    if (count < CAP) count++;
  }

  // ── 요약 계산(rec) — 1초 draw 주기에만 실행. 링버퍼 스냅샷의 avg·min·p95·최악순간. ──
  //   p95 = 프레임 나쁜 쪽 95백분위(fps 오름차순 하위 5% 경계) = "구간의 95%는 이 fps 이상".
  function summarize() {
    if (!count) return null;
    let sum = 0, min = Infinity, worstMinIdx = 0, worstMin = Infinity;
    const tmp = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const idx = count < CAP ? i : (head + i) % CAP;   // 시간순 인덱스
      const f = bufFps[idx];
      const fm = bufMin[idx];
      sum += f;
      if (fm < min) min = fm;
      if (fm < worstMin) { worstMin = fm; worstMinIdx = idx; } // 최악 순간(가장 느린 구간)
      tmp[i] = f;
    }
    tmp.sort();                                          // 오름차순
    const p95 = tmp[Math.floor(count * 0.05)];          // 하위 5% 경계 fps
    return {
      n: count,
      avg: sum / count,
      min: min,
      p95: p95,
      wDraw: bufDraw[worstMinIdx],                       // 최악 순간의 드로우콜
      wTri: bufTri[worstMinIdx],                         // 최악 순간의 삼각형 수
      wFps: worstMin,
    };
  }

  function draw() {
    const rInfo = renderer.info && renderer.info.render ? renderer.info.render : { calls: 0, triangles: 0, frame: 0 };
    const mInfo = renderer.info && renderer.info.memory ? renderer.info.memory : { textures: 0 };
    const pr = typeof renderer.getPixelRatio === 'function' ? renderer.getPixelRatio() : (renderer.getPixelRatio || 0);
    const prTxt = typeof pr === 'number' ? pr.toFixed(2) : String(pr);
    const spec = getSpec();
    const lite = getLite();

    fpsLine.textContent = (avg > 0 ? avg.toFixed(0) : '--') + ' FPS';
    // 고대비 색상 신호 — 50↑ 초록 / 30↑ 노랑 / 그 이하 빨강
    fpsLine.style.color = avg >= 50 ? '#7CFC7C' : avg >= 30 ? '#FFD54A' : '#FF6060';

    subLine.textContent =
      'worst ' + (worst > 0 ? worst.toFixed(0) : '--') +
      ' · min ' + (isFinite(gmin) ? gmin.toFixed(0) : '--');

    const rows = [];
    let l1 = 'spec ' + (spec == null ? '—' : spec);
    if (lite !== undefined) l1 += ' · lite ' + (lite ? 'ON' : 'off');
    rows.push(l1);
    rows.push('px ' + prTxt);
    rows.push('draw ' + rInfo.calls + ' · tri ' + (rInfo.triangles / 1000).toFixed(1) + 'k');
    rows.push('tex ' + mInfo.textures);
    rows.push('page ' + page);
    info.textContent = rows.join('\n');

    // rec 요약 오버레이(1초 주기 문자열화 — 시계열 버퍼 전체 문자열화 아님)
    if (REC && recLine) {
      const s = summarize();
      if (s) {
        recLine.textContent =
          'REC ' + s.n + '스 (' + (s.n * 0.25).toFixed(0) + 's)\n' +
          'avg ' + s.avg.toFixed(0) + ' · min ' + s.min.toFixed(0) + ' · p95 ' + s.p95.toFixed(0) + '\n' +
          '최악 ' + s.wFps.toFixed(0) + 'fps @ draw ' + s.wDraw + ' · tri ' + (s.wTri / 1000).toFixed(1) + 'k';
      } else {
        recLine.textContent = 'REC 대기…(250ms 샘플)';
      }
    }
  }

  function tick(now) {
    const dt = now - lastT;
    lastT = now;
    raf = requestAnimationFrame(tick);
    if (warm < 3) { warm++; return; } // 첫 몇 프레임(리소스 업로드 스파이크) 제외
    frames++;
    acc += dt;
    if (dt > worstDt) worstDt = dt;

    // ── rec 시계열: 250ms 구간 누적 → 마감 시 숫자만 슬롯에 기록 ──
    if (REC) {
      segAcc += dt; segFrames++;
      if (dt > segWorstDt) segWorstDt = dt;
      if (segAcc >= 250) {
        const rInfo = renderer.info && renderer.info.render ? renderer.info.render : { calls: 0, triangles: 0, frame: 0 };
        const mInfo = renderer.info && renderer.info.memory ? renderer.info.memory : { textures: 0 };
        const prNum = typeof renderer.getPixelRatio === 'function' ? renderer.getPixelRatio() : +renderer.getPixelRatio || 0;
        pushSample(now, rInfo, mInfo, prNum);
        segAcc = 0; segFrames = 0; segWorstDt = 0;
      }
    }

    if (acc >= 1000) {
      avg = (frames * 1000) / acc;
      worst = worstDt > 0 ? 1000 / worstDt : 0;
      if (worst < gmin) gmin = worst;
      frames = 0; acc = 0; worstDt = 0;
      draw();
    }
  }

  // ── (rec 전용) 내보내기 — CSV 문자열화는 오직 이 시점에만 발생 ──
  const EVT_TXT = ['', 'pcl', 'page'];   // 0/1/2 → CSV evt 열 텍스트(pcl=파셀로드 추정)
  function buildCsv() {
    // 시간순으로 링버퍼를 훑어 한 번에 조립(내보내기 순간의 일회성 비용)
    const lines = ['t_ms,fps,rfps,fps_min,px,draw,tri,tex,evt,page'];
    for (let i = 0; i < count; i++) {
      const idx = count < CAP ? i : (head + i) % CAP;
      lines.push(
        bufT[idx].toFixed(0) + ',' +
        bufFps[idx].toFixed(1) + ',' +
        bufRfps[idx].toFixed(1) + ',' +
        bufMin[idx].toFixed(1) + ',' +
        bufPx[idx].toFixed(2) + ',' +
        bufDraw[idx] + ',' +
        bufTri[idx] + ',' +
        bufTex[idx] + ',' +
        EVT_TXT[bufEvt[idx]] + ',' +
        page
      );
    }
    return lines.join('\n');
  }

  function flash(msg, ok) {
    if (!hint) return;
    hint.style.color = ok ? '#CFFFC0' : '#FFC7C7';
    hint.textContent = msg;
    clearTimeout(flash._t);
    flash._t = setTimeout(() => { if (hint) hint.textContent = ''; }, 3200);
  }

  // 폴백 복사 — 클립보드 API가 막힌(비보안 컨텍스트·구형 사파리) 경우:
  //   화면에 textarea를 띄워 전체선택 → 사용자가 직접 복사하게 한다.
  function fallbackCopy(csv) {
    const wrap = document.createElement('div');
    wrap.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.82);' +
      'display:flex;flex-direction:column;gap:8px;padding:max(16px,env(safe-area-inset-top)) 16px 16px;' +
      'pointer-events:auto;box-sizing:border-box;';
    const ta = document.createElement('textarea');
    ta.readOnly = true; ta.value = csv;
    ta.style.cssText =
      'flex:1;width:100%;box-sizing:border-box;font:12px/1.3 ui-monospace,Menlo,Consolas,monospace;' +
      'background:#111;color:#eee;border:1px solid #555;border-radius:8px;padding:8px;';
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = '닫기';
    close.style.cssText =
      'align-self:flex-end;min-height:36px;padding:8px 16px;border-radius:8px;border:1px solid #888;' +
      'background:#222;color:#fff;font:700 13px ui-monospace,monospace;pointer-events:auto;';
    close.addEventListener('click', () => wrap.remove());
    wrap.appendChild(ta); wrap.appendChild(close);
    (document.body || document.documentElement).appendChild(wrap);
    try { ta.focus(); ta.select(); ta.setSelectionRange(0, csv.length); } catch (_) {}
    flash('복사 API 불가 → 텍스트 선택 후 수동 복사', false);
  }

  async function onCopy() {
    if (!count) { flash('샘플 없음(250ms 대기)', false); return; }
    const csv = buildCsv();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(csv);
        flash('클립보드 복사됨 (' + count + '행)', true);
        return;
      }
    } catch (_) { /* 아래 폴백 */ }
    // execCommand 최후 시도 후 안 되면 textarea 수동 복사
    try {
      const ta = document.createElement('textarea');
      ta.value = csv; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      (document.body || document.documentElement).appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      if (ok) { flash('클립보드 복사됨 (' + count + '행)', true); return; }
    } catch (_) { /* 폴백 */ }
    fallbackCopy(csv);
  }

  function onSave() {
    if (!count) { flash('샘플 없음(250ms 대기)', false); return; }
    const csv = buildCsv();
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const d = new Date();
      const stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
                    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
      const a = document.createElement('a');
      a.href = url; a.download = 'perf-' + page + '-' + stamp + '.csv';
      a.style.display = 'none';
      (document.body || document.documentElement).appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
      flash('CSV 저장 (' + count + '행)', true);
    } catch (_) {
      // 모바일 사파리 등 a[download] 미동작 환경 → 복사 폴백으로라도 데이터 확보
      flash('저장 불가 → 복사 사용', false);
      fallbackCopy(csv);
    }
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  if (REC && copyBtn && saveBtn) {
    copyBtn.addEventListener('click', onCopy);
    saveBtn.addEventListener('click', onSave);
  }

  draw();                              // 진입 즉시 골격 표시(첫 1초 집계 전에도 HUD 가시)
  raf = requestAnimationFrame(tick);

  const api = {
    el,
    rec: REC,
    getCsv: () => (REC ? buildCsv() : ''),   // 헤드리스/자동화용 훅(문자열화는 호출 시에만)
    getSampleCount: () => (REC ? count : 0),
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (window.__perfHudMounted === api) window.__perfHudMounted = null;
    },
  };
  window.__perfHudMounted = api;
  return api;
}
