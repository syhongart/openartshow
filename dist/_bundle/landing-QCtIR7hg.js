import{V as B,P as M}from"./feed-yvp1pENn.js";import{P as y,i as T,l as N,o as z,a as E,g as P}from"./auth-aZ7HCW1S.js";const A=e=>{const t=Math.max(1,Math.round((Date.now()-e)/1e3));return t<60?"방금":t<3600?Math.floor(t/60)+"분 전":t<86400?Math.floor(t/3600)+"시간 전":Math.floor(t/86400)+"일 전"},S=["#e07a5f","#81b29a","#f2cc8f","#8e7dbe","#6a8caf","#d68fb8"],m=document.getElementById("visitorStrip"),v=document.getElementById("photoGrid");if(m&&v){const e=new B().list().slice(0,8);if(e.length===0){const a=document.createElement("div");a.className="visitor-chip",a.textContent="아직 조용한 아침입니다 — 오늘의 첫 관람객이 되어 주세요.",m.appendChild(a)}else e.forEach((a,s)=>{const n=document.createElement("span");n.className="visitor-chip";const i=document.createElement("span");i.className="vdot",i.style.background=S[s%S.length];const c=document.createElement("span");c.textContent=a.g?`${a.name} · ${a.g}`:a.name;const l=document.createElement("span");l.className="vtime",l.textContent=A(a.ts),n.append(i,c,l),m.appendChild(n)});const t=new M().list();if(t.length===0){const a=document.createElement("div");a.className="feed-empty",a.style.gridColumn="1 / -1",a.textContent="아직 첫 사진이 걸리지 않았습니다. 전시장 안의 카메라 버튼으로 마음에 남는 장면을 담아 보세요.",v.appendChild(a)}else t.forEach((a,s)=>{const n=document.createElement("figure");n.className="photo-card",n.style.setProperty("--tilt",(s%3-1)*.8+"deg"),n.style.margin="0";const i=document.createElement("img");i.src=a.thumb,i.alt=`${a.name}님의 관람 사진`,i.loading="lazy";const c=document.createElement("figcaption");c.className="pmeta";const l=document.createElement("span");l.className="pname",l.textContent=a.name;const d=document.createElement("span");d.className="ptime",d.textContent=(a.g?a.g+" · ":"")+A(a.ts),c.append(l,d),n.append(i,c),v.appendChild(n)})}const C="oas-auth-modal-styles",F={google:{cls:"g",label:"G"},kakao:{cls:"k",label:"K"},naver:{cls:"n",label:"N"}},D=`
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
`;let o=null,h="login",g=null,u={terms:!1,privacy:!1,age:!1};function H(){if(document.getElementById(C))return;const e=document.createElement("style");e.id=C,e.textContent=D,document.head.appendChild(e)}function L(){return u.terms&&u.privacy&&u.age}function I(){const e=document.createElement("div");e.className="oas-auth-overlay",e.hidden=!0,e.innerHTML=`
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
  `,document.body.appendChild(e),o=e,G(),V()}function G(){const e=o.querySelector("#oasSocial");e.innerHTML="",Object.keys(y).forEach(t=>{const a=y[t],s=F[t]||{cls:"",label:"?"},n=document.createElement("button");n.type="button",n.className="oas-auth-btn",n.dataset.oasProvider=t,n.innerHTML=`<span class="oas-auth-ic ${s.cls}">${s.label}</span>${a.label}`,n.addEventListener("click",()=>j(t)),e.appendChild(n)})}async function j(e){if(h==="signup"&&!L())return;Array.from(o.querySelectorAll(".oas-auth-btn")).forEach(a=>{a.disabled=!0});try{await N(e),p()}catch(a){console.error("[auth-modal] 로그인 실패",a)}finally{f()}}function O(){const e=o.querySelector("#oasConsentAll"),t=Array.from(o.querySelectorAll("[data-oas-consent]")),a=t.every(n=>n.checked),s=t.every(n=>!n.checked);e.checked=a,e.indeterminate=!a&&!s}function f(){const e=h==="signup"&&!L();o.querySelectorAll(".oas-auth-btn").forEach(t=>{t.disabled=e})}function $(){const e=o.querySelector("#oasAuthBadge"),t=Object.keys(y).some(a=>T(a));e.hidden=!t}function q(e){h=e==="signup"?"signup":"login";const t=h==="signup",a=o.querySelector("#oasTabLogin"),s=o.querySelector("#oasTabSignup");a.setAttribute("aria-selected",String(!t)),s.setAttribute("aria-selected",String(t)),a.classList.toggle("is-active",!t),s.classList.toggle("is-active",t),o.querySelector("#oasAuthTitle").textContent=t?"회원가입":"로그인",o.querySelector("#oasAuthSub").textContent=t?"약관에 동의하고 소셜 계정으로 시작하세요.":"소셜 계정으로 다시 시작하세요.",o.querySelector("#oasConsent").hidden=!t,f()}function K(){if(u={terms:!1,privacy:!1,age:!1},!o)return;o.querySelectorAll("[data-oas-consent]").forEach(t=>{t.checked=!1});const e=o.querySelector("#oasConsentAll");e&&(e.checked=!1,e.indeterminate=!1)}function R(){return Array.from(o.querySelectorAll('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])')).filter(e=>e.offsetParent!==null)}function _(e){if(e.key==="Escape"){e.preventDefault(),p();return}if(e.key==="Tab"){const t=R();if(t.length===0)return;const a=t[0],s=t[t.length-1];e.shiftKey&&document.activeElement===a?(e.preventDefault(),s.focus()):!e.shiftKey&&document.activeElement===s&&(e.preventDefault(),a.focus())}}function V(){o.querySelector("[data-oas-close]").addEventListener("click",p),o.addEventListener("click",e=>{e.target===o&&p()}),o.addEventListener("keydown",_),o.querySelectorAll("[data-oas-mode]").forEach(e=>{e.addEventListener("click",()=>q(e.dataset.oasMode))}),o.querySelectorAll("[data-oas-consent]").forEach(e=>{e.addEventListener("change",()=>{u[e.dataset.oasConsent]=e.checked,O(),f()})}),o.querySelector("#oasConsentAll").addEventListener("change",e=>{const t=e.target.checked;o.querySelectorAll("[data-oas-consent]").forEach(a=>{a.checked=t,u[a.dataset.oasConsent]=t}),e.target.indeterminate=!1,f()}),o.querySelectorAll("[data-oas-policy-link]").forEach(e=>{e.addEventListener("click",t=>t.preventDefault()),e.addEventListener("keydown",t=>{(t.key==="Enter"||t.key===" ")&&t.preventDefault()})}),o.querySelector("#oasGuestBtn").addEventListener("click",p)}function W(e={}){H(),o||I(),$(),g=document.activeElement,K(),q(e&&e.mode==="signup"?"signup":"login"),o.hidden=!1,document.body.style.overflow="hidden";const t=o.querySelector(h==="signup"?"#oasTabSignup":"#oasTabLogin");requestAnimationFrame(()=>{(t||o.querySelector("[data-oas-close]")).focus()})}function p(){if(!(!o||o.hidden)&&(o.hidden=!0,document.body.style.overflow="",g&&typeof g.focus=="function"))try{g.focus()}catch{}}(function(){var e=document.getElementById("navAuth"),t=document.getElementById("nsAuth");function a(){return'<button class="nav-auth-link" type="button" data-auth-mode="login">로그인</button><span class="nav-auth-sep"></span><button class="nav-auth-link" type="button" data-auth-mode="signup">회원가입</button>'}function s(r,k){Array.prototype.forEach.call(r.querySelectorAll("[data-auth-mode]"),function(w){w.addEventListener("click",function(){k&&k(),W({mode:w.getAttribute("data-auth-mode")})})})}function n(){var r=P();t&&(t.innerHTML=r?'<span class="nav-auth-profile"><span class="ini">'+escapeHtml(r.initial)+"</span>"+escapeHtml(r.name)+'님</span><button class="nav-auth-link" type="button" id="nsLogout">로그아웃</button>':a(),r?t.querySelector("#nsLogout").addEventListener("click",function(){E()}):s(t,x)),e&&(e.innerHTML=r?'<span class="nav-auth-profile"><span class="ini">'+escapeHtml(r.initial)+"</span>"+escapeHtml(r.name)+'님</span><span class="nav-auth-sep"></span><button class="nav-auth-link" type="button" id="navLogout">로그아웃</button>':a(),r?e.querySelector("#navLogout").addEventListener("click",function(){E()}):s(e))}z(n),n();var i=document.querySelector(".topnav .nav-cta"),c=document.querySelector(".hero");function l(){var r=window.scrollY>(c?c.offsetHeight*.6:400);i.classList.toggle("is-shown",r)}window.addEventListener("scroll",l,{passive:!0}),l();var d=document.getElementById("navBurger"),b=document.getElementById("navSheet");function x(){b.classList.remove("is-open"),d.setAttribute("aria-expanded","false")}d.addEventListener("click",function(){var r=!b.classList.contains("is-open");b.classList.toggle("is-open",r),d.setAttribute("aria-expanded",String(r))}),Array.prototype.forEach.call(b.querySelectorAll("a"),function(r){r.addEventListener("click",x)})})();
