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
/* ── 카테고리 탭 (감독 지시 2026-08-19 "막 나열하니 정신없잖아") ─────────────
   무엇을 어느 탭에 넣는지·왜 넷인지는 decide/edit-tabs.ts 한 곳이다.
   여기는 그것을 «넷이 한 줄에 들어가고, 고른 것이 눈에 띈다» 로만 옮긴다.

   sticky 인 이유: 패널 전체가 overflow:auto 라 아래 탭 내용이 길면 바가 위로 밀려
   나간다. 그러면 «다른 탭으로 가려면 먼저 위로 스크롤» 이 되고, 그것이 정확히 이
   개편이 없애려던 «찾아 헤매기» 다. 블렌더 Properties 탭도 늘 제자리에 있다.

   ⚠ 넷을 flex:1 1 0 으로 나눈다 — 1 1 auto 면 글자 길이대로 폭이 갈려 자리가
   흔들리고, 손이 «표면은 세 번째» 를 못 외운다. 자리 기억이 탭의 값어치 절반이다. */
#w2-edit .tabbar{display:flex;gap:3px;padding:4px 0 5px;margin:2px 0 0}
/* 🔴 상시 툴바(시점·셰이딩)와 탭 바를 **함께** 고정한다.
   ⚠ 첫 판본은 .tabbar 만 sticky 였고, 그러면 그 **위**에 있는 시점·셰이딩이 스크롤에
   밀려 사라진다 — decide/edit-tabs.ts 가 "무엇을 골랐든 늘 필요하다" 로 그 둘을 탭 밖에
   둔 근거와 화면이 어긋난다(검수관 권고 P-h). 셋을 한 상자에 묶어 함께 붙인다. */
#w2-edit .toolbar{position:sticky;top:0;z-index:1;background:rgba(11,13,18,.96)}
#w2-edit .tabbar button{flex:1 1 0;min-width:0;padding:5px 2px;font-size:10px;
  white-space:nowrap;overflow:hidden}
/* 안 고른 탭은 테두리를 지운다 — 넷이 다 상자면 어느 것이 켜졌는지가 색 하나에만
   걸리고, 그 대비는 야외 화면에서 가장 먼저 사라지는 신호다. */
#w2-edit .tabbar button[data-on="0"]{background:none;border-color:transparent;color:#9A9EB1}
#w2-edit .tabbar button[data-on="0"]:hover{border-color:#3A3D4B}
/* 「지금 볼 게 없다」 — 흐리게만 한다. 못 누르게 막지 않는 근거는 tabHasContent 주석. */
#w2-edit .tabbar button[data-empty="1"][data-on="0"]{opacity:.45}
#w2-edit .pane[data-on="0"]{display:none}
/* 🔴 hidden 이 실제로 감추게 한다.

   ⚠ 이 결함은 **화면에서만 드러났다.** JS 는 el.hidden = true 를 제대로 대입하고 있었고
   jsdom 검사도 그 프로퍼티만 보므로 **통과했다**. 그런데 브라우저에서는 속성 탭에
   아무것도 안 골랐는데 수치칸과 버튼이 그대로 보였다.

   ⚠⚠ **첫 처방이 절반만 맞았다**(검수관 재검수 B-2, 2026-08-19). 그때 여기에
   *"#w2-edit .row 와 구체성이 (1,1,0) 으로 같으니 뒤에 오는 쪽이 이긴다 — 그래서 이 줄이
   파일 뒤쪽에 있어야 한다"* 라고 적었다. 구체성 계산은 맞았지만 **이 줄 뒤에 같은
   (1,1,0) 이면서 display 를 세우는 규칙이 여덟 개 더 있다**(.cat · .sw · .fld · .surf ·
   .surf-pick · .surf-row · .surf-slots · .surf-slot). 지금 hidden 을 세우는 요소가
   전부 .row/.note/.sel/button 이라 살아난 결함은 없었지만, inspector 의 크기 슬라이더
   줄이 바로 surf-row 다 — 누군가 인라인 style.display 를 hidden 으로 통일하는 순간
   되돌아온다.

   그래서 **순서 의존을 없앤다.** !important 는 최후 수단이지만 hidden 의 의미(「이 요소는
   화면에 없다」)는 레이아웃 클래스가 이길 성질이 아니고, 브라우저 UA 스타일시트도 같은
   이유로 [hidden]{display:none} 을 둔다. 순서를 지키라는 규율보다 순서가 무의미한
   구조가 낫다 — 이 저장소가 「손으로 조립하면 매번 다르게 틀린다」로 반복해 배운 형태다.

   ⚠⚠⚠ 검출력: 이 줄을 지우면 tests/world2-edit-panel-css.test.ts 가 빨간불이다.
   CSS 는 문자열이므로 문자열로 잰다 — jsdom 한계가 아니라 「안 잰 것」이었다. */
#w2-edit [hidden]{display:none!important}
/* 탭 안 첫 요소의 위 여백을 지운다 — 바 아래 간격이 두 겹이 된다 */
#w2-edit .pane > :first-child{margin-top:0}
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
/* 크기 슬라이더(W8-11)는 .surf 밖에 산다 — 재질 패널의 자식이 아니라 인스펙터 옆줄이다.
   그래서 .surf .lbl / .surf .num 이 안 먹고, 같은 모양을 여기서 한 번 더 준다.
   ⚠ 이 파일은 통째로 템플릿 리터럴이라 **주석에도 백틱을 못 쓴다** — 쓰면 리터럴이
   그 자리에서 끊기고 타입 에러로만 드러난다(실제로 이 주석의 첫 판본이 그랬다).
   ⚠ **값을 두 곳에 적는 것이 맞다** — 두 줄이 같아 보여야 할 이유가 없다(하나는 재질,
   하나는 배치). 공유 클래스로 묶으면 한쪽 여백을 고칠 때 다른 쪽이 따라 움직인다. */
#w2-edit .size-row .lbl{color:#9A9EB1;font-size:10px;min-width:28px}
#w2-edit .size-row .num{color:#F5F5F2;font-size:10px;min-width:44px;text-align:right}
#w2-edit .tone-box{display:flex;flex-wrap:wrap;gap:4px;flex:1;min-width:0}
/* 견본은 색 자체가 내용이라 글자가 없다 — 크기를 주지 않으면 0x0 이 된다.
   .sw(9px)보다 큰 것은 그쪽이 목록의 **표시**이고 이쪽은 **누르는 표적**이라서다.
   ⚠ 이 파일은 템플릿 리터럴 하나다 — 주석에도 백틱을 쓰면 문자열이 거기서 끊긴다. */
#w2-edit .tone-sw{width:18px;height:18px;padding:0;border-radius:3px;
  border:1px solid #2A2F3E;cursor:pointer}
#w2-edit .tone-sw[data-on="1"]{border-color:#8B72FF;box-shadow:0 0 0 1px #8B72FF}
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
  /* 작품 칸은 구역 목록 **아래**에 이어 붙는다(W8-11). 두 번째 제목부터 위 여백을 줘
     두 목록이 한 덩어리로 읽히지 않게 한다 — 같은 상자 안이라 구분선 대신 여백이다. */
  #w2-outliner h4 ~ h4{margin-top:6px}
  #w2-outliner .items{display:flex;flex-direction:column;gap:2px}
  #w2-outliner .items button{text-align:left;padding:3px 6px;
    font:11px/1.3 system-ui,sans-serif;color:#F5F5F2;background:#1A1D26;
    border:1px solid #3A3D4B;border-radius:5px;cursor:pointer}
  #w2-outliner .items button[data-on="1"]{background:#8B72FF;border-color:#8B72FF;color:#0B0D12}
  #w2-outliner .note{color:#9A9EB1;margin:0;font-size:10px}
}
`;
