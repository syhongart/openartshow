const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_bundle/auth-modal-CEl5Dvro.js","_bundle/auth-DRdNhjgv.js"])))=>i.map(i=>d[i]);
import{_ as h}from"./preload-helper-DASV_Wa7.js";const b=["a","b","c","d"],f=["home","about","guide"];function m(t){let n="";try{n=new URLSearchParams(String(t||"")).get("nav")||""}catch{return"a"}const e=n.trim().toLowerCase();return b.includes(e)?e:"a"}const l={exhibitions:{label:"전시",anchor:"exhibitions"},photowall:{label:"포토월",anchor:"photowall"},pricing:{label:"요금제",anchor:"pricing"},about:{label:"소개",href:"./about.html"},guide:{label:"가이드",href:"./guide.html"},studio:{label:"작가 스튜디오",href:"./app/studio.html"},enter:{label:"입장하기",href:"./app/"}},v={home:null,about:"about",guide:"guide"},g={b:{links:["exhibitions","photowall","pricing","about","guide"],authStudio:!0},c:{links:["exhibitions","about","guide","studio"],authStudio:!1},d:{links:["exhibitions","about","guide"],authStudio:!0}};function x(t,n){const e=l[t];return e.href?e.href:n==="home"?`#${e.anchor}`:`./index.html#${e.anchor}`}function y(t,n){if(t==="a"||!f.includes(n))return null;const e=g[t];if(!e)return null;const o=v[n];return{links:e.links.map(r=>({id:r,label:l[r].label,href:x(r,n),current:r===o})),authStudio:e.authStudio,enter:{label:l.enter.label,href:l.enter.href}}}const C=`
/* 서브 페이지 — 모바일에서 메뉴를 되살린다.
   about.html / guide.html 은 @media(max-width:640px) 에서 .topnav{display:none} 이라
   **모바일에 주 메뉴가 아예 없다**(실측: about.html:284 · guide.html:435). 감독은
   모바일로 보시므로 그 상태로는 서브 후보를 비교할 수 없다.
   미디어쿼리를 복제해 되돌리지 않는다 — 복제하면 640 을 한쪽만 고치는 날 조용히
   어긋난다. 미디어쿼리는 명시도를 올리지 않으므로 (0,3,0) 셀렉터로 그냥 이긴다.
   .topnav 는 원래 flex-wrap:wrap 이라 좁은 폭에서 줄바꿈된다(가로넘침 0). */
.topbar .topnav.oasnav-on { display: flex; align-items: center; }

/* 서브 페이지 로그인·회원가입은 button 이다(링크가 아니라 모달을 연다).
   시각값은 소스의 ".topnav a, .topnav button" 규칙이 준다 — 여기서는 브라우저
   기본 버튼 껍데기만 벗긴다. 값 복제 0. */
.topnav button.oasnav-btn {
  background: none;
  border-width: 0 0 1px;
  font-family: inherit;
  cursor: pointer;
}

/* 서브 페이지 구분자 — 관람 항목 | 로그인·회원가입 | 입장하기 를 가른다.
   (홈은 자기 .nav-auth-sep 을 그대로 쓴다 — 여기 규칙은 .topbar 안에서만 걸린다.)

   ⚠ 첫 판본은 background: currentColor + opacity 로 「값을 안 정하는」 쪽을 골랐다.
   **화면에서 안 보였다**(육안 실측 2026-08-09, about/guide 데스크톱·모바일 모두).
   .topnav 에도 .topbar 에도 color 선언이 없어 상속되는 것이 본문 잉크
   rgb(32,33,36) 였고, 다크 밴드 위에서 사실상 검정이다. 링크가 color 를 자기
   규칙으로 따로 받고 있어서 「인접 링크와 같은 색」이라는 전제 자체가 틀렸다.
   **값을 안 적는 것이 값을 틀리게 적는 것보다 낫지 않았다.**
   그래서 명시한다: 이 페이지 내비의 흰 계열 알파를 쓰되(링크 0.72) 그보다 낮춰
   구분자가 항목을 이기지 않게 한다. 0.25 는 홈 .nav-auth-sep 과 같은 역할·같은 알파다. */
.topbar .topnav .oasnav-sep {
  flex: none;
  align-self: center;
  width: 1px;
  height: 12px;
  background: rgba(255, 255, 255, 0.25);
}

/* 홈 — 「작가 스튜디오」를 auth 영역에 붙인다(후보 B·D).
   #navAuth **안**에 넣으면 안 된다: landing.html 의 renderNav() 가 로그인 상태가
   바뀔 때마다 그 컨테이너를 textContent='' 로 비우고 다시 채운다(실측
   landing.html:1817) — 넣은 링크가 로그인하는 순간 사라진다. 그래서 **형제**로 두고
   같은 .nav-auth 클래스를 준다: margin-left:auto · display:flex · 모바일
   display:none 이 전부 그대로 걸려서 브레이크포인트(720px)를 복제할 일이 없다.
   뒤따르는 진짜 #navAuth 의 margin-left:auto 만 죽인다 — 둘 다 auto 면 flex 가
   남은 공간을 둘 사이에 **나눠** 스튜디오가 중앙으로 밀린다. */
.topnav .oasnav-studio ~ .nav-auth { margin-left: 0; }
.topnav .oasnav-studio .nav-auth-link { text-decoration: none; }
`,d="oas-nav-knob-styles";function E(t){if(t.getElementById(d))return;const n=t.createElement("style");n.id=d,n.textContent=C,(t.head||t.documentElement).appendChild(n)}function s(t,n,e){const o=t.createElement("a");return o.href=n.href,o.textContent=n.label,e&&(o.className=e),n.current&&o.classList.add("current"),o}function p(t){const n=t.createElement("span");return n.className="oasnav-sep",n.setAttribute("aria-hidden","true"),n}function A(t,n){const e=t.querySelector(".topnav .nav-links");if(e){e.textContent="";for(const a of n.links)e.appendChild(s(t,a))}const o=t.getElementById("navSheet"),r=o&&o.querySelector(".ns-divider");if(o&&r){for(const a of Array.from(o.children)){if(a===r)break;a.remove()}for(const a of n.links)o.insertBefore(s(t,a),r)}if(n.authStudio){const a=t.getElementById("navAuth");if(a&&a.parentNode){const c=t.createElement("div");c.className="nav-auth oasnav-studio";const u=t.createElement("a");u.className="nav-auth-link",u.href=l.studio.href,u.textContent=l.studio.label,c.appendChild(u),a.parentNode.insertBefore(c,a)}const i=t.getElementById("nsAuth");o&&i&&o.insertBefore(s(t,{...l.studio,current:!1},""),i)}}function k(t,n){const e=t.querySelector(".topbar .topnav");if(!e)return;e.textContent="",e.classList.add("oasnav-on"),e.setAttribute("aria-label","주 메뉴");for(const r of n.links)e.appendChild(s(t,r));e.appendChild(p(t));const o=t.createElement("span");return o.className="oasnav-auth",o.style.display="contents",e.appendChild(o),e.appendChild(p(t)),e.appendChild(s(t,{...n.enter,current:!1},"")),o}function S(t,n){const e=[];for(const[o,r]of[["login","로그인"],["signup","회원가입"]]){const a=t.createElement("button");a.type="button",a.className="oasnav-btn",a.textContent=r,a.addEventListener("click",()=>n(o)),e.push(a)}return e}function _(t,n){const e=r=>h(()=>import("./auth-modal-CEl5Dvro.js"),__vite__mapDeps([0,1])).then(a=>a.openAuthModal({mode:r})).catch(a=>console.warn("[nav-knob] 로그인 모달을 열지 못했다",a)),o=r=>{if(n.textContent="",r&&r.name){const a=t.createElement("a");a.href="./app/mypage.html",a.textContent=r.name,n.appendChild(a);return}for(const a of S(t,e))n.appendChild(a)};o(null),h(async()=>{const{getProfile:r,onAuthChange:a}=await import("./auth-DRdNhjgv.js").then(i=>i.c);return{getProfile:r,onAuthChange:a}},[]).then(({getProfile:r,onAuthChange:a})=>{const i=()=>o(r());a(i),i()}).catch(r=>console.warn("[nav-knob] 로그인 상태를 읽지 못했다",r))}function N(t,n,e){const o=y(n,e);if(!o)return!1;if(E(t),e==="home")A(t,o);else{const r=k(t,o);r&&_(t,r)}return t.documentElement.setAttribute("data-nav-knob",n),!0}if(typeof document<"u"&&document.documentElement){const t=document.documentElement.getAttribute("data-nav-page");if(t&&f.includes(t)){const n=m(typeof location<"u"?location.search:"");N(document,n,t)}}
