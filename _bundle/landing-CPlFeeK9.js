/* empty css              *//* empty css               */import{V as J,P as Q}from"./feed-Cm56rHm1.js";import{P as N,i as X,l as ee,o as te,g as ae,a as oe}from"./auth-hr07Qqp5.js";const R=e=>{const t=Math.max(1,Math.round((Date.now()-e)/1e3));return t<60?"방금":t<3600?Math.floor(t/60)+"분 전":t<86400?Math.floor(t/3600)+"시간 전":Math.floor(t/86400)+"일 전"},U=["#e07a5f","#81b29a","#f2cc8f","#8e7dbe","#6a8caf","#d68fb8"],M=document.getElementById("visitorStrip"),P=document.getElementById("photoGrid");if(M&&P){const e=new J().list().slice(0,8);if(e.length===0){const o=document.createElement("div");o.className="visitor-chip",o.textContent="아직 조용한 아침입니다 — 오늘의 첫 관람객이 되어 주세요.",M.appendChild(o)}else e.forEach((o,u)=>{const d=document.createElement("span");d.className="visitor-chip";const s=document.createElement("span");s.className="vdot",s.style.background=U[u%U.length];const v=document.createElement("span");v.textContent=o.g?`${o.name} · ${o.g}`:o.name;const c=document.createElement("span");c.className="vtime",c.textContent=R(o.ts),d.append(s,v,c),M.appendChild(d)});const t=new Q().list();if(t.length===0){const o=document.createElement("div");o.className="feed-empty",o.style.gridColumn="1 / -1",o.textContent="아직 첫 사진이 걸리지 않았습니다. 전시장 안의 카메라 버튼으로 마음에 남는 장면을 담아 보세요.",P.appendChild(o)}else t.forEach((o,u)=>{const d=document.createElement("figure");d.className="photo-card",d.style.setProperty("--tilt",(u%3-1)*.8+"deg"),d.style.margin="0";const s=document.createElement("img");s.src=o.thumb,s.alt=`${o.name}님의 관람 사진`,s.loading="lazy";const v=document.createElement("figcaption");v.className="pmeta";const c=document.createElement("span");c.className="pname",c.textContent=o.name;const x=document.createElement("span");x.className="ptime",x.textContent=(o.g?o.g+" · ":"")+R(o.ts),v.append(c,x),d.append(s,v),P.appendChild(d)})}const _="oas-auth-modal-styles",ne={google:{cls:"g",label:"G"},kakao:{cls:"k",label:"K"},naver:{cls:"n",label:"N"}},se=`
.oas-auth-overlay {
  --oas-surface-1: var(--surface-dark-1, #1F2128);
  --oas-surface-2: var(--surface-dark-2, #2A2C37);
  --oas-border: var(--border-light, var(--border-dark, #3A3D4B));
  --oas-text: var(--text-light, #F5F5F2);
  --oas-dim: var(--text-dim-light, #9A9EB1);
  --oas-violet: var(--violet-500, #8B72FF);
  --oas-violet-300: var(--violet-300, #AB99FF);
  --oas-violet-600: var(--violet-600, #6C4DFF);
  --oas-cyan: var(--cyan-500, #72E6E1);
  --oas-radius: var(--r-card, 3px);
  --oas-accent-ink: var(--accent-ink, #202124);
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(20, 21, 26, 0.6);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  font-family: var(--app-font, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  word-break: keep-all;
  overflow-wrap: break-word;
}
.oas-auth-overlay[hidden] { display: none; }
.oas-auth-card {
  width: min(94vw, 400px);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--oas-surface-2);
  color: var(--oas-text);
  border: 1px solid var(--oas-border);
  border-radius: var(--oas-radius);
  padding: 26px 24px 22px;
  position: relative;
  text-align: left;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}
.oas-auth-card::before {
  content: "";
  display: block;
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, var(--oas-violet-600), var(--oas-violet-300));
  margin-bottom: 16px;
}
.oas-auth-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  font-size: 20px;
  line-height: 1;
  color: var(--oas-dim);
  cursor: pointer;
  border-radius: var(--oas-radius);
}
.oas-auth-close:hover { color: var(--oas-text); }
.oas-auth-badge {
  font-size: 11.5px;
  line-height: 1.6;
  letter-spacing: 0.01em;
  color: var(--oas-cyan);
  background: rgba(114, 230, 225, 0.08);
  border: 1px solid rgba(114, 230, 225, 0.28);
  border-radius: var(--oas-radius);
  padding: 8px 10px;
  margin-bottom: 16px;
}
.oas-auth-badge[hidden] { display: none; }
.oas-auth-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--oas-border);
}
.oas-auth-tab {
  flex: 1 1 50%;
  background: none;
  border: none;
  color: var(--oas-dim);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 10px 4px 12px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.oas-auth-tab.is-active { color: var(--oas-text); border-bottom-color: var(--oas-violet); }
.oas-auth-tab:hover { color: var(--oas-text); }
.oas-auth-head { margin-bottom: 14px; }
.oas-auth-title { font-size: 19px; font-weight: 700; }
.oas-auth-sub { margin: 6px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--oas-dim); }

.oas-auth-consent {
  margin-bottom: 16px;
  border: 1px solid var(--oas-border);
  border-radius: var(--oas-radius);
  padding: 4px 12px;
  background: var(--oas-surface-1);
}
.oas-auth-consent[hidden] { display: none; }
.oas-consent-all {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 0;
  border-bottom: 1px solid var(--oas-border);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--oas-text);
  cursor: pointer;
}
.oas-consent-row {
  display: grid;
  grid-template-columns: 18px 1fr;
  column-gap: 10px;
  row-gap: 3px;
  padding: 10px 0;
  border-bottom: 1px solid var(--oas-border);
}
.oas-consent-row:last-of-type { border-bottom: none; }
.oas-consent-row input[type="checkbox"],
.oas-consent-all input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 2px 0 0;
  accent-color: var(--oas-violet);
  flex: none;
}
.oas-consent-row input[type="checkbox"] { grid-column: 1; grid-row: 1; }
.oas-consent-label-wrap {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  cursor: pointer;
  font-size: 13.5px;
  color: var(--oas-text);
}
.oas-tag {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--oas-dim);
  border: 1px solid var(--oas-border);
  border-radius: var(--oas-radius);
  padding: 1px 6px;
  white-space: nowrap;
}
.oas-consent-link {
  grid-column: 2;
  grid-row: 2;
  font-size: 11.5px;
  color: var(--oas-dim);
  cursor: not-allowed;
  width: fit-content;
}
.oas-consent-link span { margin-left: 3px; opacity: 0.8; }
.oas-consent-note {
  margin: 8px 0 10px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--oas-dim);
}

.oas-auth-social { margin-top: 4px; }
.oas-auth-btn,
.oas-auth-guest {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 8px;
  border-radius: var(--oas-radius);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease;
}
.oas-auth-btn {
  background: var(--oas-surface-1);
  border: 1px solid var(--oas-border);
  color: var(--oas-text);
}
.oas-auth-btn:hover:not(:disabled) { border-color: var(--oas-violet); background: var(--oas-surface-2); }
.oas-auth-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.oas-auth-ic {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}
/* 소셜 브랜드 컬러 — Google/Kakao/Naver 실제 브랜드색, 팔레트 토큰과 무관(제공자 식별용) */
.oas-auth-ic.g { background: #4285f4; }
.oas-auth-ic.k { background: #fee500; color: #191919; }
.oas-auth-ic.n { background: #03c75a; }

.oas-auth-guest {
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(245, 245, 242, 0.35);
  color: var(--oas-text);
  margin-top: 4px;
}
.oas-auth-guest:hover { border-color: var(--oas-violet); color: var(--oas-violet-300); }

.oas-auth-card :focus-visible {
  outline: 2px solid var(--oas-violet);
  outline-offset: 2px;
  border-radius: var(--oas-radius);
}

@media (max-width: 420px) {
  .oas-auth-card { padding: 22px 18px 18px; }
  .oas-auth-title { font-size: 18px; }
}

@media (prefers-reduced-motion: reduce) {
  .oas-auth-btn, .oas-auth-guest, .oas-auth-tab { transition-duration: .01ms !important; }
}
`;let n=null,S="login",q=null,w={terms:!1,privacy:!1,age:!1};function re(){if(document.getElementById(_))return;const e=document.createElement("style");e.id=_,e.textContent=se,document.head.appendChild(e)}function V(){return w.terms&&w.privacy&&w.age}function ie(){const e=document.createElement("div");e.className="oas-auth-overlay",e.hidden=!0,e.innerHTML=`
    <div class="oas-auth-card" role="dialog" aria-modal="true" aria-labelledby="oasAuthTitle" aria-describedby="oasAuthSub">
      <button type="button" class="oas-auth-close" data-oas-close aria-label="닫기">&times;</button>
      <div class="oas-auth-badge" id="oasAuthBadge" hidden>베타 · 현재 체험용 미리보기이며 실제 개인정보는 수집·저장하지 않습니다</div>
      <div class="oas-auth-tabs" role="tablist" aria-label="로그인 또는 회원가입">
        <button type="button" role="tab" id="oasTabLogin" class="oas-auth-tab" aria-selected="true" aria-controls="oasAuthPanel" data-oas-mode="login">로그인</button>
        <button type="button" role="tab" id="oasTabSignup" class="oas-auth-tab" aria-selected="false" aria-controls="oasAuthPanel" data-oas-mode="signup">회원가입</button>
      </div>
      <div class="oas-auth-panel" id="oasAuthPanel">
        <div class="oas-auth-head">
          <div class="oas-auth-title" id="oasAuthTitle">로그인</div>
          <p class="oas-auth-sub" id="oasAuthSub">소셜 계정으로 다시 시작하세요.</p>
        </div>
        <div class="oas-auth-consent" id="oasConsent" hidden>
          <label class="oas-consent-all">
            <input type="checkbox" id="oasConsentAll">
            <span>전체 동의</span>
          </label>
          <div class="oas-consent-row">
            <input type="checkbox" id="oasConsentTerms" data-oas-consent="terms">
            <label for="oasConsentTerms" class="oas-consent-label-wrap">
              <span>서비스 이용약관 동의</span>
              <span class="oas-tag">필수</span>
            </label>
            <a href="#" class="oas-consent-link" data-oas-policy-link tabindex="0" aria-disabled="true" title="약관은 아직 발행되지 않았습니다">전문 보기<span>(발행 예정)</span></a>
          </div>
          <div class="oas-consent-row">
            <input type="checkbox" id="oasConsentPrivacy" data-oas-consent="privacy">
            <label for="oasConsentPrivacy" class="oas-consent-label-wrap">
              <span>개인정보 수집·이용 동의</span>
              <span class="oas-tag">필수</span>
            </label>
            <a href="#" class="oas-consent-link" data-oas-policy-link tabindex="0" aria-disabled="true" title="개인정보처리방침은 아직 발행되지 않았습니다">전문 보기<span>(발행 예정)</span></a>
          </div>
          <div class="oas-consent-row">
            <input type="checkbox" id="oasConsentAge" data-oas-consent="age">
            <label for="oasConsentAge" class="oas-consent-label-wrap">
              <span>만 14세 이상입니다</span>
              <span class="oas-tag">필수</span>
            </label>
          </div>
          <p class="oas-consent-note">동의 항목은 이 화면에서만 확인되며, 베타 기간 동안 서버로 저장·전송되지 않습니다.</p>
        </div>
        <div class="oas-auth-social" id="oasSocial"></div>
        <button type="button" class="oas-auth-guest" id="oasGuestBtn">무가입으로 둘러보기</button>
      </div>
    </div>
  `,document.body.appendChild(e),n=e,le(),ve()}function le(){const e=n.querySelector("#oasSocial");e.innerHTML="",Object.keys(N).forEach(t=>{const o=N[t],u=ne[t]||{cls:"",label:"?"},d=document.createElement("button");d.type="button",d.className="oas-auth-btn",d.dataset.oasProvider=t,d.innerHTML=`<span class="oas-auth-ic ${u.cls}">${u.label}</span>${o.label}`,d.addEventListener("click",()=>de(t)),e.appendChild(d)})}async function de(e){if(S==="signup"&&!V())return;Array.from(n.querySelectorAll(".oas-auth-btn")).forEach(o=>{o.disabled=!0});try{await ee(e),E()}catch(o){console.error("[auth-modal] 로그인 실패",o)}finally{B()}}function ce(){const e=n.querySelector("#oasConsentAll"),t=Array.from(n.querySelectorAll("[data-oas-consent]")),o=t.every(d=>d.checked),u=t.every(d=>!d.checked);e.checked=o,e.indeterminate=!o&&!u}function B(){const e=S==="signup"&&!V();n.querySelectorAll(".oas-auth-btn").forEach(t=>{t.disabled=e})}function ue(){const e=n.querySelector("#oasAuthBadge"),t=Object.keys(N).some(o=>X(o));e.hidden=!t}function Y(e){S=e==="signup"?"signup":"login";const t=S==="signup",o=n.querySelector("#oasTabLogin"),u=n.querySelector("#oasTabSignup");o.setAttribute("aria-selected",String(!t)),u.setAttribute("aria-selected",String(t)),o.classList.toggle("is-active",!t),u.classList.toggle("is-active",t),n.querySelector("#oasAuthTitle").textContent=t?"회원가입":"로그인",n.querySelector("#oasAuthSub").textContent=t?"약관에 동의하고 소셜 계정으로 시작하세요.":"소셜 계정으로 다시 시작하세요.",n.querySelector("#oasConsent").hidden=!t,B()}function pe(){if(w={terms:!1,privacy:!1,age:!1},!n)return;n.querySelectorAll("[data-oas-consent]").forEach(t=>{t.checked=!1});const e=n.querySelector("#oasConsentAll");e&&(e.checked=!1,e.indeterminate=!1)}function fe(){return Array.from(n.querySelectorAll('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])')).filter(e=>e.offsetParent!==null)}function he(e){if(e.key==="Escape"){e.preventDefault(),E();return}if(e.key==="Tab"){const t=fe();if(t.length===0)return;const o=t[0],u=t[t.length-1];e.shiftKey&&document.activeElement===o?(e.preventDefault(),u.focus()):!e.shiftKey&&document.activeElement===u&&(e.preventDefault(),o.focus())}}function ve(){n.querySelector("[data-oas-close]").addEventListener("click",E),n.addEventListener("click",e=>{e.target===n&&E()}),n.addEventListener("keydown",he),n.querySelectorAll("[data-oas-mode]").forEach(e=>{e.addEventListener("click",()=>Y(e.dataset.oasMode))}),n.querySelectorAll("[data-oas-consent]").forEach(e=>{e.addEventListener("change",()=>{w[e.dataset.oasConsent]=e.checked,ce(),B()})}),n.querySelector("#oasConsentAll").addEventListener("change",e=>{const t=e.target.checked;n.querySelectorAll("[data-oas-consent]").forEach(o=>{o.checked=t,w[o.dataset.oasConsent]=t}),e.target.indeterminate=!1,B()}),n.querySelectorAll("[data-oas-policy-link]").forEach(e=>{e.addEventListener("click",t=>t.preventDefault()),e.addEventListener("keydown",t=>{(t.key==="Enter"||t.key===" ")&&t.preventDefault()})}),n.querySelector("#oasGuestBtn").addEventListener("click",E)}function be(e={}){re(),n||ie(),ue(),q=document.activeElement,pe(),Y(e&&e.mode==="signup"?"signup":"login"),n.hidden=!1,document.body.style.overflow="hidden";const t=n.querySelector(S==="signup"?"#oasTabSignup":"#oasTabLogin");requestAnimationFrame(()=>{(t||n.querySelector("[data-oas-close]")).focus()})}function E(){if(!(!n||n.hidden)&&(n.hidden=!0,document.body.style.overflow="",q&&typeof q.focus=="function"))try{q.focus()}catch{}}(function(){var e=document.getElementById("navBurger"),t=document.getElementById("navSheet");function o(){!t||!e||(t.classList.remove("is-open"),e.setAttribute("aria-expanded","false"))}e&&t&&(e.addEventListener("click",function(){var a=!t.classList.contains("is-open");t.classList.toggle("is-open",a),e.setAttribute("aria-expanded",String(a))}),Array.prototype.forEach.call(t.querySelectorAll("a"),function(a){a.addEventListener("click",o)}));var u=document.getElementById("navAuth"),d=document.getElementById("nsAuth");function s(a,r,l){var h=document.createElement(a);return r&&(h.className=r),l!=null&&(h.textContent=l),h}function v(a,r){var l="http://www.w3.org/2000/svg",h={person:["M8 8.1a2.55 2.55 0 1 0 0-5.1 2.55 2.55 0 0 0 0 5.1Z","M13 13.4c0-2.35-2.24-3.8-5-3.8s-5 1.45-5 3.8"],exit:["M6.4 13.4H3.6a1 1 0 0 1-1-1v-8.8a1 1 0 0 1 1-1h2.8","m10.5 10.9 3-2.9-3-2.9","M13.5 8H6.7"],caret:["m4 6.4 4 3.9 4-3.9"]}[a],i=document.createElementNS(l,"svg");return r&&i.setAttribute("class",r),i.setAttribute("viewBox","0 0 16 16"),i.setAttribute("fill","none"),i.setAttribute("stroke","currentColor"),i.setAttribute("stroke-width","1.4"),i.setAttribute("stroke-linecap","round"),i.setAttribute("stroke-linejoin","round"),i.setAttribute("aria-hidden","true"),h.forEach(function(f){var k=document.createElementNS(l,"path");k.setAttribute("d",f),i.appendChild(k)}),i}var c=null;function x(a){return a?a.querySelector('[data-nav-profile="trigger"]'):null}function L(a,r){if(a){r&&c&&c!==a&&L(c,!1),a.classList.toggle("is-open",r);var l=x(a);l&&l.setAttribute("aria-expanded",String(r)),r?c=a:c===a&&(c=null)}}function m(a){if(c){var r=c;if(L(r,!1),a){var l=x(r);l&&l.focus()}}}function T(a){return Array.prototype.slice.call(a.querySelectorAll('[role="menuitem"]'))}function A(a,r){var l=T(a);l.length&&l[(r%l.length+l.length)%l.length].focus()}document.addEventListener("click",function(a){!c||c.contains(a.target)||m(!1)}),document.addEventListener("keydown",function(a){a.key!=="Escape"||!c||(a.preventDefault(),m(!0))}),document.addEventListener("focusin",function(a){!c||c.contains(a.target)||m(!1)}),e&&e.addEventListener("click",function(){m(!1)});var z=window.innerWidth>720;window.addEventListener("resize",function(){var a=window.innerWidth>720;a!==z&&(z=a,m(!1))});function I(a,r){a.textContent="",a.classList.remove("has-profile"),[["login","로그인"],["signup","회원가입"]].forEach(function(l,h){h&&a.appendChild(s("span","nav-auth-sep"));var i=s("button","nav-auth-link",l[1]);i.type="button",i.addEventListener("click",function(){r&&r(),be({mode:l[0]})}),a.appendChild(i)})}function F(a,r,l){a.textContent="",a.classList.add("has-profile");var h=r.email||(r.provider?r.provider.charAt(0).toUpperCase()+r.provider.slice(1):""),i=s("div","nav-profile"),f=s("button","nav-auth-profile");f.type="button",f.setAttribute("data-nav-profile","trigger"),f.setAttribute("aria-haspopup","menu"),f.setAttribute("aria-expanded","false"),f.appendChild(s("span","ini",r.initial||""));var k=s("span","nav-profile-who");k.appendChild(s("span","nm",(r.name||"")+"님")),h&&k.appendChild(s("span","acct",h)),f.appendChild(k),f.appendChild(v("caret","nav-profile-caret"));var b=s("div","nav-profile-menu");b.setAttribute("data-nav-profile","menu"),b.setAttribute("role","menu");var W="nav-profile-menu--"+(a.id||"x");b.id=W,f.setAttribute("aria-controls",W);var C=s("div","nav-profile-id");C.setAttribute("data-nav-profile","identity"),C.setAttribute("role","presentation"),C.appendChild(s("span","ini",r.initial||""));var D=s("span","who");D.appendChild(s("span","nm",(r.name||"")+"님")),h&&D.appendChild(s("span","acct",h)),C.appendChild(D);var g=s("a","nav-profile-item");g.href="./app/mypage.html",g.setAttribute("data-nav-profile","mypage"),g.setAttribute("role","menuitem"),g.appendChild(v("person")),g.appendChild(s("span",null,"개인 프로필"));var y=s("button","nav-profile-item");y.type="button",y.setAttribute("data-nav-profile","logout"),y.setAttribute("role","menuitem"),y.appendChild(v("exit")),y.appendChild(s("span",null,"로그아웃"));function $(){var p=s("div","nav-profile-sep");return p.setAttribute("role","separator"),p}b.appendChild(C),b.appendChild($()),b.appendChild(g),b.appendChild($()),b.appendChild(y),i.appendChild(f),i.appendChild(b),a.appendChild(i),f.addEventListener("click",function(){L(i,!i.classList.contains("is-open"))}),f.addEventListener("keydown",function(p){p.key!=="ArrowDown"&&p.key!=="ArrowUp"||(p.preventDefault(),L(i,!0),A(i,p.key==="ArrowDown"?0:-1))}),b.addEventListener("keydown",function(p){var Z=T(i),K=Z.indexOf(document.activeElement);p.key==="ArrowDown"?(p.preventDefault(),A(i,K+1)):p.key==="ArrowUp"?(p.preventDefault(),A(i,K-1)):p.key==="Home"?(p.preventDefault(),A(i,0)):p.key==="End"&&(p.preventDefault(),A(i,-1))}),g.addEventListener("click",function(){m(!1),l&&l()}),y.addEventListener("click",function(){m(!1),l&&l(),oe()})}function H(){c=null;var a=ae();d&&(a?F(d,a,o):I(d,o)),u&&(a?F(u,a):I(u))}te(H),H();var O=document.querySelector(".topnav .nav-cta"),j=document.querySelector(".hero");if(O){var G=function(){var a=window.scrollY>(j?j.offsetHeight*.6:400);O.classList.toggle("is-shown",a)};window.addEventListener("scroll",G,{passive:!0}),G()}})();
