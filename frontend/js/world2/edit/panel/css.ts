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
`;
