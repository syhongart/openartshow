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
/* ── 사진 걸기 (W8-5 · 폰 경로) ────────────────────────────────────────────
   파일 입력은 **우리 버튼이 대신 누른다**(input.click()). 브라우저 기본 파일 입력은
   폭·라벨이 제멋대로라 212px 패널을 넘치고 언어마다 글자가 다르다.
   ⚠ display:none 을 쓰지 않는다 — 렌더 트리에서 빠진 요소의 .click() 을 무시하는
   브라우저가 있었고(사파리 계열), 그러면 **폰에서만 아무 일도 안 일어난다.** 이 기능이
   존재하는 이유가 정확히 폰이므로 그 위험을 지지 않는다. 눈에서만 지운다.
   ⚠⚠ 이 파일은 템플릿 리터럴 하나다 — 주석에 백틱을 쓰면 문자열이 거기서 끊긴다. */
#w2-edit .photo-in{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
/* 폰에서 감독이 가장 자주 누를 버튼이다. 위 .toggle 과 **같은 이유**로 키운다 —
   나머지 버튼의 4px 패딩은 손가락 타깃으로 작다. */
#w2-edit .photo button{padding:8px 10px;font-size:12px}
/* ── 조준 중에는 패널을 접는다 (W8-6) ──────────────────────────────────────
   편집 모드는 그대로 두고 본문만 감춘다. setMode 로 접으면 data-mode 까지 바뀌어
   배지·아웃라이너가 사라지고 토글이 「✏️ 편집」으로 돌아가 화면이 거짓말을 한다.
   ⚠ 조준 화면의 진짜 이유가 「패널이 화면 한가운데를 덮는다」 였으므로, 접히지 않으면
   이 회차가 통째로 무의미하다 — 이 두 줄이 그 요구를 집행한다. */
#w2-edit[data-aim="1"] .body{display:none}
#w2-edit[data-aim="1"]{width:auto;padding:0;background:none;border:0;backdrop-filter:none}
#w2-edit .note{color:#9A9EB1;margin:4px 0 0}
#w2-edit .warn{color:#FFC46B}
#w2-edit .lead{color:#F5F5F2;margin:6px 0 0;font-size:12px}
#w2-edit .sel{color:#72E6E1}
#w2-edit hr{border:0;border-top:1px solid #3A3D4B;margin:6px 0}
#w2-edit .pal button{flex:1 1 100%;text-align:left}
/* ── 에셋 라이브러리 (W6 E) ────────────────────────────────────────────────
   검색칸 · 카테고리 제목 · 색 스와치. 목록이 길어지므로 팔레트에 최대 높이를 주고
   그 안에서만 스크롤한다 — 안 주면 파츠 8개 + GLB 가 패널을 화면 밖까지 밀어낸다. */
#w2-edit .pal{max-height:34vh;overflow-y:auto}
#w2-edit .pal .find{width:100%;box-sizing:border-box;padding:4px 6px;margin:0 0 4px;
  font:11px/1.2 system-ui,sans-serif;color:#F5F5F2;background:#1A1D26;
  border:1px solid #3A3D4B;border-radius:5px}
#w2-edit .pal .find:focus{outline:none;border-color:#8B72FF}
#w2-edit .cat{display:flex;flex-wrap:wrap;gap:3px}
#w2-edit .cat-h{flex:1 1 100%;color:#9A9EB1;font-size:10px;margin:4px 0 1px}
/* 스와치는 라벨 앞 작은 사각. 파츠에만 붙는다 — 「어떤 계열인가」를 공짜로 말한다 */
#w2-edit .sw{display:inline-block;width:9px;height:9px;margin-right:5px;
  border-radius:2px;border:1px solid rgba(0,0,0,.35);vertical-align:-1px}
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

/* ── 조준 화면 (W8-6) ──────────────────────────────────────────────────────
   *"조준 화면 그것도 해줘"*(감독 2026-08-17). W8-5 가 두 번에 한 번만 걸린 이유가
   **조준 대상을 볼 수 없다** 였고, 이 화면이 그것을 보여준다.

   ⚠ 뿌리(#w2-aim)는 화면 전체를 덮되 **클릭을 안 먹는다**(pointer-events:none).
   화면 한가운데 뜨는 것이 클릭을 먹으면 그 자리 건물을 영영 못 고른다 — badge.ts 가
   같은 경고를 갖는다. 클릭을 받는 것은 .bar 하나뿐이다.

   z-index 46 = 배지(45) 바로 위. 조준 중에는 이것이 가장 위여야 한다. */
#w2-aim{position:fixed;inset:0;z-index:46;pointer-events:none;display:none}
#w2-aim[data-on="1"]{display:block}
/* 조준선 — 화면 **정중앙**. castCenter() 가 실제로 쏘는 그 지점이다.
   ⚠ 이 위치가 광선과 어긋나면 화면이 거짓말을 한다 — 둘 다 「한가운데」로 정의돼야 한다. */
#w2-aim .cross{position:absolute;left:50%;top:50%;width:42px;height:42px;
  margin:-21px 0 0 -21px;border:2px solid rgba(245,245,242,.75);border-radius:50%;
  box-shadow:0 0 0 1px rgba(0,0,0,.55),inset 0 0 0 1px rgba(0,0,0,.55);
  transition:width .12s,height .12s,margin .12s,border-color .12s}
/* 맞았을 때 — **색만 바꾸지 않고 크기도 바꾼다.** 색 하나로만 가르면 밝은 벽 위나
   색각 이상에서 구별이 약해진다. 형태 변화는 그 둘과 무관하게 읽힌다. */
#w2-aim[data-hit="1"] .cross{border-color:#72E6E1;width:54px;height:54px;margin:-27px 0 0 -27px;
  box-shadow:0 0 0 1px rgba(0,0,0,.55),inset 0 0 0 1px rgba(0,0,0,.55),0 0 12px rgba(114,230,225,.5)}
/* 하단 막대 — 여기만 클릭을 받는다. 하단인 이유는 조준선을 가리지 않기 위해서다. */
#w2-aim .bar{position:absolute;left:50%;transform:translateX(-50%);
  bottom:calc(16px + env(safe-area-inset-bottom,0px));pointer-events:auto;
  display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:center;
  max-width:min(92vw,520px);padding:9px 11px;background:rgba(11,13,18,.86);
  border:1px solid #3A3D4B;border-radius:11px;backdrop-filter:blur(6px)}
#w2-aim .msg{flex:1 1 100%;text-align:center;color:#9A9EB1;
  font:11px/1.4 system-ui,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.7)}
#w2-aim[data-hit="1"] .msg{color:#72E6E1}
/* 손가락 타깃 — 패널 버튼(4px)보다 크다. 폰에서 누르는 것이 이 둘뿐이다. */
#w2-aim .bar button{padding:9px 15px;font:12px/1 system-ui,sans-serif;color:#F5F5F2;
  background:#1A1D26;border:1px solid #3A3D4B;border-radius:8px;cursor:pointer}
#w2-aim .bar button[data-on="1"]{background:#8B72FF;border-color:#8B72FF;color:#0B0D12}

/* ── 표면 재질 패널 (W7 · 「월드스튜디오」) ─────────────────────────────────
   강조색 #8B72FF 는 이 파일이 이미 여러 곳에서 쓰고 있다(태스크 #55 가 그 흩어짐을
   추적 중이므로 **새 색을 만들지 않는다**). 드롭존만 상태를 셋으로 가른다:
   비어 있음 / 채워짐(data-on) / 지금 위에 끌고 있음(data-over). */
#w2-edit .surf{display:flex;flex-direction:column;gap:5px}
#w2-edit .surf .lbl{color:#9A9EB1;font-size:10px;min-width:44px}
#w2-edit .surf .num{color:#F5F5F2;font-size:10px;min-width:34px;text-align:right}
#w2-edit .surf-pick{display:flex;flex-wrap:wrap;gap:3px}
#w2-edit .surf-pick button[data-on="1"]{background:#8B72FF;border-color:#8B72FF;color:#0B0D12}
#w2-edit .surf-row{display:flex;align-items:center;gap:5px}
#w2-edit .surf-row input[type="range"]{flex:1;min-width:0;accent-color:#8B72FF}
#w2-edit .surf-row button[data-on="1"]{background:#8B72FF;border-color:#8B72FF;color:#0B0D12}
#w2-edit .surf-slots{display:flex;flex-direction:column;gap:3px}
#w2-edit .surf-slot{display:flex;align-items:center;gap:5px;padding:3px 5px;
  border:1px dashed #3A3D4B;border-radius:6px}
#w2-edit .surf-slot[data-on="1"]{border-style:solid;border-color:#8B72FF}
/* 끌고 있는 동안 칸이 스스로 «여기» 라고 말한다 — 드롭 대상이 곧 «어디에 바르는가» 라서
   그 피드백이 없으면 감독이 엉뚱한 칸에 놓는다. */
#w2-edit .surf-slot[data-over="1"]{background:rgba(139,114,255,.22);border-color:#8B72FF}
#w2-edit .surf-slot select{flex:1;min-width:0;font:10px/1.3 system-ui,sans-serif;
  color:#F5F5F2;background:#1A1D26;border:1px solid #3A3D4B;border-radius:5px;padding:2px 4px}
/* 「커밋 대기」만 여기 뜬다 — 파일 이름은 select 가 이미 말하고 있다. */
#w2-edit .surf-slot .sname{font-size:10px;color:#8B72FF;white-space:nowrap}
#w2-edit .surf-slot button{padding:1px 6px;line-height:1.2}
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
