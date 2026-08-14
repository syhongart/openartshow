// world2/edit/panel/css.ts — 편집 패널의 스타일. **문자열 하나뿐이다.**
//
// 별도 파일인 이유는 길이가 아니라 **판정 근거의 자리**다. 아래 「위치는 오른쪽이다」는
// 감독 신고에서 나온 판정이고, 그것이 DOM 조립 코드 사이에 끼어 있으면 다음 사람이
// `right:` 를 `left:` 로 바꾸면서 그 근거를 안 읽는다.

// ── 위치는 **오른쪽**이다 (감독 신고 2026-08-12) ──────────────────────────────
// 처음엔 좌상단이었고 그것이 모바일에서 조작을 죽였다. 터치 조이스틱은 별도 오버레이가
// 아니라 **캔버스가 받고**(`main.ts` 의 `attachTouchControls(canvas, …)`), 판정 영역이
// **화면 왼쪽 절반 전체**다(`decide/touch.ts` 의 `x < viewportWidth / 2`). 폭 212px 짜리
// 패널을 왼쪽에 두면 가로 모드에서 **왼쪽 엄지 기둥을 통째로 덮는다** — 그 위 터치는
// 캔버스에 도달조차 못 한다(패널이 `pointer-events:auto` 이고 `z-index:40` 이므로).
//
// 오른쪽 절반은 시선 드래그 영역이라 같은 문제가 있지만, **접힌 상태가 기본**이라
// 실제로 가리는 것은 작은 버튼 하나다. 그리고 이동을 못 하는 것이 시점을 못 도는 것보다
// 훨씬 치명적이다(움직일 수 없으면 아무것도 못 한다).
//
// `env(safe-area-inset-*)` 를 쓴다 — world2.html 의 기존 패널 넷이 전부 그렇게 하고,
// 이 저장소는 그것을 빠뜨려 한 번 데였다(DEVLOG *"iOS에서 safe-area env()가 전부 0(치명)"*).
export const CSS = `
#w2-edit{position:fixed;z-index:40;font:11px/1.35 system-ui,sans-serif;
  right:calc(8px + env(safe-area-inset-right,0px));top:calc(8px + env(safe-area-inset-top,0px));
  width:212px;color:#F5F5F2;background:rgba(11,13,18,.86);border:1px solid #3A3D4B;
  border-radius:10px;padding:8px;backdrop-filter:blur(6px);
  max-height:calc(100dvh - 16px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));
  overflow:auto}
/* 접힌 상태 — 주행 중에는 이것이 기본이다. 화면을 거의 안 가린다 */
#w2-edit[data-open="0"]{width:auto;padding:0;background:none;border:0;backdrop-filter:none;overflow:visible}
#w2-edit[data-open="0"] .body{display:none}
#w2-edit .head{display:flex;gap:6px;align-items:center}
#w2-edit h4{margin:0;font-size:11px;letter-spacing:.04em;color:#8B72FF;flex:1 1 auto}
#w2-edit[data-open="0"] h4{display:none}
#w2-edit .row{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0}
#w2-edit button{flex:1 1 auto;min-width:30px;padding:4px 5px;font:11px/1 system-ui,sans-serif;
  color:#F5F5F2;background:#1A1D26;border:1px solid #3A3D4B;border-radius:6px;cursor:pointer}
#w2-edit button:hover{border-color:#8B72FF}
#w2-edit button[data-on="1"]{background:#8B72FF;border-color:#8B72FF;color:#0B0D12}
/* 토글 버튼은 접혔을 때 유일하게 보이는 것이라 손가락이 닿을 크기여야 한다 */
#w2-edit .toggle{flex:0 0 auto;padding:8px 12px;font-size:12px;
  background:rgba(11,13,18,.86);border-color:#3A3D4B;backdrop-filter:blur(6px)}
#w2-edit[data-mode="edit"] .toggle{background:#8B72FF;border-color:#8B72FF;color:#0B0D12}
#w2-edit .note{color:#9A9EB1;margin:4px 0 0}
#w2-edit .warn{color:#FFC46B}
#w2-edit .lead{color:#F5F5F2;margin:6px 0 0;font-size:12px}
#w2-edit .sel{color:#72E6E1}
#w2-edit hr{border:0;border-top:1px solid #3A3D4B;margin:6px 0}
#w2-edit .pal button{flex:1 1 100%;text-align:left}
/* 수치 칸 — 다섯이 한 줄에 들어가야 패널이 안 길어진다 */
#w2-edit .insp{gap:3px}
#w2-edit .fld{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:2px}
#w2-edit .fld span{color:#9A9EB1;font-size:10px;text-align:center}
#w2-edit .fld input{width:100%;min-width:0;box-sizing:border-box;padding:3px 4px;
  font:11px/1 system-ui,sans-serif;color:#F5F5F2;background:#1A1D26;
  border:1px solid #3A3D4B;border-radius:5px}
#w2-edit .fld input:focus{outline:none;border-color:#8B72FF}
#w2-edit .fld input:disabled{opacity:.4}

/* ── 아웃라이너 — **넓은 화면에서만** (감독 지시 2026-08-13, PC 전용 씬 편집) ──────
   기본이 display:none 인 것이 요점이다. 위 「위치는 오른쪽이다」 판정이 왼쪽을 막았고
   (터치 조이스틱 기둥), 그 제약은 **좁은 화면에서만** 성립한다. 폭 판정은 여기 한 곳이고
   JS 는 폭을 모른다 — 두 곳이 각자 재면 «패널은 떴는데 스타일이 안 왔다» 가 난다. */
/* ── 선택 배지 (W6) — 화면 상단 중앙, 큰 글씨 ────────────────────────────
   왼쪽을 안 쓰는 이유는 이 파일 헤더가 못 박은 그것이다(조이스틱 판정 영역).
   **아웃라이너와 달리 미디어 쿼리 밖이다** — 「뭘 골랐나」는 좁은 화면에서도 필요하고,
   상단 중앙은 조이스틱·패널·아웃라이너 어느 것과도 안 겹친다. */
#w2-badge{position:fixed;z-index:45;pointer-events:none;
  left:50%;transform:translateX(-50%);
  top:calc(10px + env(safe-area-inset-top,0px));
  max-width:min(60vw,520px)}
/* 안 골랐거나 주행 중이면 없다 — 「선택: 없음」을 크게 띄우지 않는다 */
#w2-badge[data-on="0"],#w2-badge[data-mode="drive"]{display:none}
#w2-badge .name{
  font:600 17px/1.35 system-ui,sans-serif;color:#F5F5F2;
  background:rgba(11,13,18,.82);border:1px solid #8B72FF;border-radius:9px;
  padding:6px 13px;backdrop-filter:blur(6px);
  text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  /* 밝은 하늘 위에서도 읽히게 — 배경만으로는 부족하다 */
  text-shadow:0 1px 3px rgba(0,0,0,.7)}

#w2-outliner{display:none}
@media (min-width:1024px){
  #w2-outliner{display:flex;flex-direction:column;gap:4px;position:fixed;z-index:40;
    left:calc(8px + env(safe-area-inset-left,0px));top:calc(8px + env(safe-area-inset-top,0px));
    width:196px;color:#F5F5F2;background:rgba(11,13,18,.86);border:1px solid #3A3D4B;
    border-radius:10px;padding:8px 9px;backdrop-filter:blur(6px);
    max-height:calc(100dvh - 16px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));
    overflow:auto}
  /* 주행 모드에서는 감춘다 — 편집 도구가 걸어다니는 화면을 가리지 않는다. */
  #w2-edit[data-mode="drive"] ~ #w2-outliner,
  #w2-outliner[data-mode="drive"]{display:none}
  #w2-outliner h4{margin:0;font:600 12px/1.2 system-ui,sans-serif;color:#8B72FF}
  #w2-outliner .items{display:flex;flex-direction:column;gap:2px}
  #w2-outliner .items button{text-align:left;padding:3px 6px;
    font:11px/1.3 system-ui,sans-serif;color:#F5F5F2;background:#1A1D26;
    border:1px solid #3A3D4B;border-radius:5px;cursor:pointer}
  #w2-outliner .items button[data-on="1"]{background:#8B72FF;border-color:#8B72FF;color:#0B0D12}
  #w2-outliner .note{color:#9A9EB1;margin:0;font-size:10px}
}
`;
