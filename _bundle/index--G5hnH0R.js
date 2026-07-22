/* empty css              */import{E as ia,h as ra,k as st,W as la,l as cn,N as sa,S as Ut,a as ca,f as dn,F as un,b as da,H as pn,D as He,M as Ht,d as oe,m as eo,n as fn,G as ua,o as _e,V as pa,R as hn,P as bn,A as gn,Q as xn,C as mn,i as ce,e as Io,p as yn}from"./vendor-three-S3nKjqpj.js";import{E as bt,R as de,B as A,A as oo,c as vn,s as wn,P as kn,m as Cn}from"./scene-DbFdh8K5.js";import{c as mo,g as ze,a as ae,e as En,b as Sn,d as Ln,l as Mn,f as fa,M as Tn,p as Nn,N as _n,m as ha,s as ba,h as zn,i as ga,j as An}from"./npc-DmbUkuO2.js";import{V as In,P as On}from"./feed-Cm56rHm1.js";import{n as Xe,D as Le,C as Rn,a as Pn,S as Oo,c as Ro,e as ao,d as Bn,f as Dn,g as jn,h as Yn,i as Un,j as Hn,E as Xn,k as Fn,H as Po,l as Gn,m as $n,o as Wn,p as Fe,q as Kn,r as Vn}from"./chibi-CufzOlE2.js";import{g as vt,o as xa,P as ue,l as qn,M as Zn,a as Jn}from"./auth-aZ7HCW1S.js";let q=null,ne=null,te=!1;function Qn(t,e){if(!q)return;const o=new StereoPannerNode(q,{pan:e});o.connect(ne);const a=2+Math.floor(Math.random()*4);let n=q.currentTime+.02;for(let r=0;r<a;r++){const l=q.createOscillator(),s=q.createGain();l.connect(s),s.connect(o);const c=t*(.85+Math.random()*.4),u=c*(Math.random()>.5?1.25:.78),x=.05+Math.random()*.1;l.type="sine",l.frequency.setValueAtTime(c,n),l.frequency.exponentialRampToValueAtTime(u,n+x),s.gain.setValueAtTime(1e-4,n),s.gain.exponentialRampToValueAtTime(.55,n+.012),s.gain.exponentialRampToValueAtTime(1e-4,n+x),l.start(n),l.stop(n+x+.02),n+=x+.04+Math.random()*.09}}function ti(){const t=q.sampleRate*4,e=q.createBuffer(1,t,q.sampleRate),o=e.getChannelData(0);let a=0;for(let s=0;s<t;s++){const c=Math.random()*2-1;a=(a+.02*c)/1.02,o[s]=a*3.5}const n=q.createBufferSource();n.buffer=e,n.loop=!0;const r=q.createBiquadFilter();r.type="lowpass",r.frequency.value=400;const l=q.createGain();l.gain.value=.012,n.connect(r),r.connect(l),l.connect(ne),n.start()}function no(){if(!te)return;const t=[{base:2600,pan:-.7},{base:3400,pan:.6},{base:4200,pan:.15}],e=t[Math.floor(Math.random()*t.length)];Qn(e.base,e.pan+(Math.random()-.5)*.3);const o=900+Math.random()*4200;setTimeout(no,o)}function ei(){if(!te)try{q=new(window.AudioContext||window.webkitAudioContext),ne=q.createGain(),ne.gain.value=.05,ne.connect(q.destination),q.state==="suspended"&&q.resume(),te=!0,ti(),no(),setTimeout(()=>{te&&no()},2500)}catch{te=!1}}const qt=2.5,Bo=4.5,Do=.0022,jo=.0058,pe=st.degToRad(89),oi=.03,ai=7.5,fe=60,ht=.45,Yo=.65,ni=12;function ii(t,e){for(const o of A.stairs){const a=Math.min(o.x0,o.x1),n=Math.max(o.x0,o.x1);if(t<a||t>n)continue;const r=Math.min(o.z0,o.z1),l=Math.max(o.z0,o.z1);if(e<r||e>l)continue;const s=st.clamp((e-o.z0)/(o.z1-o.z0),0,1);return o.yFrom+s*(o.yTo-o.yFrom)}return null}function ri(t,e,o){return e>=t.x0&&e<=t.x1&&o>=t.z0&&o<=t.z1}function li(t,e){return t>=A.minX&&t<=A.maxX&&e>=A.minZ&&e<=A.maxZ}function ma(t,e){const o=[],a=ii(t,e);if(a!==null&&o.push(a),li(t,e))for(const n of A.floors){const r=A.slabHoles[n.id]||[];let l=!1;for(const s of r)if(ri(s,t,e)){l=!0;break}l||o.push(n.y)}else o.push(0);return o}function si(t,e,o){const a=ma(t,e);let n=null;for(const r of a)r<=o+Yo&&(n===null||r>n)&&(n=r);return n===null||o-n>Yo?null:n}function ci(t,e){let o=t,a=e;return e>A.minZ-ht&&e<A.maxZ+ht&&(o=st.clamp(t,A.minX+ht,A.maxX-ht)),t>A.minX-ht&&t<A.maxX+ht&&(a=Math.max(e,A.minZ+ht)),{x:o,z:a}}class di{constructor(e,o){if(this.camera=e,this.domElement=o,this.enabled=!1,this.euler=new ia(0,0,0,"YXZ"),this.camera.rotation.set(0,0,0),this.camera.rotation.order="YXZ",this.camera.position.set(0,bt,8),this.keys={forward:!1,backward:!1,left:!1,right:!1,run:!1},this.velocity=new ra(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0,this.groundY=this.camera.position.y-bt,this.moveTouch=null,this.lookTouch=null,!document.getElementById("lu-joy-style")){const a=document.createElement("style");a.id="lu-joy-style",a.textContent=`
.lu-joy-base { position: fixed; width: 112px; height: 112px; margin: -56px 0 0 -56px;
  border-radius: 50%; border: 1.5px solid rgba(253,251,245,0.38);
  background: radial-gradient(circle, rgba(23,20,15,0.10) 55%, rgba(23,20,15,0.34) 100%);
  box-shadow: 0 2px 12px rgba(10,8,4,0.30), inset 0 0 0 1px rgba(23,20,15,0.20);
  pointer-events: none; z-index: 40; opacity: 0; transform: scale(0.78);
  transition: opacity 0.12s ease, transform 0.16s cubic-bezier(0.34,1.56,0.64,1); }
.lu-joy-base.lu-live { opacity: 1; transform: scale(1); }
.lu-joy-base::before { content: ''; position: absolute; inset: -1.5px; border-radius: 50%;
  background:
    linear-gradient(rgba(253,251,245,0.5), rgba(253,251,245,0.5)) 50% 0 / 2px 8px no-repeat,
    linear-gradient(rgba(253,251,245,0.5), rgba(253,251,245,0.5)) 50% 100% / 2px 8px no-repeat,
    linear-gradient(rgba(253,251,245,0.5), rgba(253,251,245,0.5)) 0 50% / 8px 2px no-repeat,
    linear-gradient(rgba(253,251,245,0.5), rgba(253,251,245,0.5)) 100% 50% / 8px 2px no-repeat; }
.lu-joy-base::after { content: ''; position: absolute; inset: 5px; border-radius: 50%;
  border: 1px dashed rgba(253,251,245,0.22);
  transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.lu-joy-base.lu-run::after { border-color: rgba(95,158,125,0.9); border-style: solid;
  box-shadow: 0 0 10px rgba(95,158,125,0.5), inset 0 0 8px rgba(95,158,125,0.25); }
.lu-joy-knob { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px;
  border-radius: 50%; background: radial-gradient(circle at 32% 28%, #fffdf8, #e8e2d2);
  border: 1px solid rgba(23,20,15,0.28);
  box-shadow: 0 3px 8px rgba(10,8,4,0.40), inset 0 -2px 4px rgba(23,20,15,0.14);
  pointer-events: none; z-index: 41; opacity: 0; transition: opacity 0.12s ease; }
.lu-joy-knob.lu-live { opacity: 1; }
.lu-joy-knob.lu-run { background: radial-gradient(circle at 32% 28%, #b8e4c9, #5f9e7d);
  border-color: rgba(32,74,52,0.55);
  box-shadow: 0 0 0 1px rgba(95,158,125,0.9), 0 0 14px rgba(95,158,125,0.55),
    inset 0 -2px 4px rgba(32,74,52,0.30); }`,document.head.appendChild(a)}this._joyBase=document.createElement("div"),this._joyBase.className="lu-joy-base",this._joyKnob=document.createElement("div"),this._joyKnob.className="lu-joy-knob",this._wasRunning=!1,document.body.appendChild(this._joyBase),document.body.appendChild(this._joyKnob),this._bindEvents()}_bindEvents(){this._onClick=()=>{this.enabled&&document.pointerLockElement!==this.domElement&&this.domElement.requestPointerLock?.()},this.domElement.addEventListener("click",this._onClick),this._onMouseMove=e=>{this.enabled&&document.pointerLockElement===this.domElement&&(this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=e.movementX*Do,this.euler.x-=e.movementY*Do,this.euler.x=st.clamp(this.euler.x,-pe,pe),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler))},document.addEventListener("mousemove",this._onMouseMove),this._onKeyDown=e=>{if(!this.enabled)return;const o=e.target;o&&(o.tagName==="INPUT"||o.tagName==="TEXTAREA")||this._setKey(e.code,!0)},this._onKeyUp=e=>{this._setKey(e.code,!1)},document.addEventListener("keydown",this._onKeyDown),document.addEventListener("keyup",this._onKeyUp),this._onTouchStart=e=>{if(this.enabled){for(const o of e.changedTouches){const a=window.innerWidth*.5;o.clientX<a&&this.moveTouch===null?(this.moveTouch={id:o.identifier,startX:o.clientX,startY:o.clientY,dx:0,dy:0},this._joyBase.style.left=o.clientX+"px",this._joyBase.style.top=o.clientY+"px",this._joyKnob.style.left=o.clientX+"px",this._joyKnob.style.top=o.clientY+"px",this._joyBase.classList.add("lu-live"),this._joyKnob.classList.add("lu-live")):o.clientX>=a&&this.lookTouch===null&&(this.lookTouch={id:o.identifier,lastX:o.clientX,lastY:o.clientY})}e.cancelable&&e.preventDefault()}},this._onTouchMove=e=>{if(this.enabled){for(const o of e.changedTouches)if(this.moveTouch&&o.identifier===this.moveTouch.id){const a=o.clientX-this.moveTouch.startX,n=o.clientY-this.moveTouch.startY,r=Math.hypot(a,n),l=r>fe?fe/r:1;this.moveTouch.dx=a*l/fe,this.moveTouch.dy=n*l/fe,this._joyKnob.style.left=this.moveTouch.startX+a*l+"px",this._joyKnob.style.top=this.moveTouch.startY+n*l+"px";const s=Math.hypot(this.moveTouch.dx,this.moveTouch.dy)>.85;this._joyBase.classList.toggle("lu-run",s),this._joyKnob.classList.toggle("lu-run",s),s&&!this._wasRunning&&navigator.vibrate&&navigator.vibrate(10),this._wasRunning=s}else if(this.lookTouch&&o.identifier===this.lookTouch.id){const a=o.clientX-this.lookTouch.lastX,n=o.clientY-this.lookTouch.lastY;this.lookTouch.lastX=o.clientX,this.lookTouch.lastY=o.clientY,this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=a*jo,this.euler.x-=n*jo,this.euler.x=st.clamp(this.euler.x,-pe,pe),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler)}e.cancelable&&e.preventDefault()}},this._onTouchEnd=e=>{for(const o of e.changedTouches)this.moveTouch&&o.identifier===this.moveTouch.id?(this.moveTouch=null,this._wasRunning=!1,this._joyBase.classList.remove("lu-live","lu-run"),this._joyKnob.classList.remove("lu-live","lu-run")):this.lookTouch&&o.identifier===this.lookTouch.id&&(this.lookTouch=null)},this.domElement.addEventListener("touchstart",this._onTouchStart,{passive:!1}),this.domElement.addEventListener("touchmove",this._onTouchMove,{passive:!1}),this.domElement.addEventListener("touchend",this._onTouchEnd),this.domElement.addEventListener("touchcancel",this._onTouchEnd)}_setKey(e,o){switch(e){case"KeyW":case"ArrowUp":this.keys.forward=o;break;case"KeyS":case"ArrowDown":this.keys.backward=o;break;case"KeyA":case"ArrowLeft":this.keys.left=o;break;case"KeyD":case"ArrowRight":this.keys.right=o;break;case"ShiftLeft":case"ShiftRight":this.keys.run=o;break}}_tryMove(e,o){const a=ci(e,o),n=st.clamp(a.x,-24,de.bound),r=st.clamp(a.z,-24,de.bound),l=A.maxZ,s=this.camera.position.z;if(n>A.minX-ht&&n<A.maxX+ht&&(s-l)*(r-l)<0&&Math.abs(n)>1.4)return null;const u=si(n,r,this.groundY);return u===null?null:{x:n,z:r,y:u}}update(e){if(!this.enabled)return;e=Math.min(e,.1);let o=0,a=0;this.keys.forward&&(a-=1),this.keys.backward&&(a+=1),this.keys.left&&(o-=1),this.keys.right&&(o+=1);let n=this.keys.run?Bo:qt;if(this.moveTouch&&o===0&&a===0){o=this.moveTouch.dx,a=this.moveTouch.dy;const m=Math.hypot(o,a);m<.14&&(o=0,a=0),n=qt+(Bo-qt)*Math.min(1,Math.max(0,(m-.85)/.15))}else{const m=Math.hypot(o,a);m>1&&(o/=m,a/=m)}this.euler.setFromQuaternion(this.camera.quaternion,"YXZ");const r=this.euler.y,l=Math.sin(r),s=Math.cos(r),c=(o*s+a*l)*n,u=(-o*l+a*s)*n,x=1-Math.exp(-10*e);this.velocity.x+=(c-this.velocity.x)*x,this.velocity.y+=(u-this.velocity.y)*x;const f=this.camera.position,g=f.x+this.velocity.x*e,T=f.z+this.velocity.y*e;let w=this._tryMove(g,T);if(!w){const m=this._tryMove(g,f.z),O=this._tryMove(f.x,T);w=m||O||null}w&&(f.x=w.x,f.z=w.z,this.groundY=w.y);const E=Math.hypot(this.velocity.x,this.velocity.y);if(E>.3){this.bobPhase+=e*ai*(E/qt);const m=Math.min(1,E/qt);this.bobOffset=Math.sin(this.bobPhase)*oi*m}else this.bobOffset+=(0-this.bobOffset)*x,Math.abs(this.bobOffset)<5e-4&&(this.bobOffset=0,this.bobPhase=0);const I=Math.min(1,ni*e),b=this.groundY+bt+this.bobOffset+this.liftOffset;f.y+=(b-f.y)*I}resolveBodyCollisions(e){if(!this.enabled||!e||!e.length)return;const o=.6,a=1.2,n=this.camera.position;let r=n.x,l=n.z,s=!1,c=0,u=0;for(const g of e){if(!g||g.y!=null&&Math.abs(g.y-this.groundY)>a)continue;const T=r-g.x,w=l-g.z,E=Math.hypot(T,w);if(E>=o)continue;const I=E>1e-4?T/E:Math.sin(this.euler.y),b=E>1e-4?w/E:Math.cos(this.euler.y);r=g.x+I*o,l=g.z+b*o,c=I,u=b,s=!0}if(!s)return;const x=this._tryMove(r,l);x&&(n.x=x.x,n.z=x.z,this.groundY=x.y);const f=this.velocity.x*-c+this.velocity.y*-u;f>0&&(this.velocity.x+=c*f,this.velocity.y+=u*f)}getState(){return this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z,ry:this.euler.y}}setPose({x:e,y:o,z:a,ry:n}){const r=st.clamp(e,-24,de.bound),l=st.clamp(a,-24,de.bound);let s;if(o!=null)s=o-bt;else{const c=ma(r,l);s=c.length?Math.max(...c):0}this.groundY=s,this.camera.position.set(r,s+bt,l),this.euler.set(0,n,0,"YXZ"),this.camera.quaternion.setFromEuler(this.euler),this.velocity.set(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0}enable(){this.enabled=!0}disable(){this.enabled=!1,this.keys.forward=this.keys.backward=this.keys.left=this.keys.right=this.keys.run=!1,this.velocity.set(0,0),this.moveTouch=null,this.lookTouch=null,document.pointerLockElement===this.domElement&&document.exitPointerLock?.()}dispose(){this.disable(),this.domElement.removeEventListener("click",this._onClick),document.removeEventListener("mousemove",this._onMouseMove),document.removeEventListener("keydown",this._onKeyDown),document.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("touchstart",this._onTouchStart),this.domElement.removeEventListener("touchmove",this._onTouchMove),this.domElement.removeEventListener("touchend",this._onTouchEnd),this.domElement.removeEventListener("touchcancel",this._onTouchEnd)}}const ui=3,pi=6,Uo=2.2,fi=.05;function hi({player:t,getSelfAvatar:e}){let o=!1,a=0,n=0,r=0;const l=w=>{if(w.code!=="Space"||!t||!t.enabled)return;const E=w.target;E&&(E.tagName==="INPUT"||E.tagName==="TEXTAREA")||(o=!0,w.preventDefault())},s=w=>{w.code==="Space"&&(o=!1)};document.addEventListener("keydown",l),document.addEventListener("keyup",s);let c=null;const u=typeof window<"u"&&window.matchMedia&&window.matchMedia("(pointer: coarse)").matches,x=w=>{o=!0,c&&c.classList.add("lu-fly-on"),w.cancelable&&w.preventDefault(),w.stopPropagation()},f=w=>{o=!1,c&&c.classList.remove("lu-fly-on"),w.stopPropagation()};u&&(c=document.createElement("button"),c.id="lu-fly-btn",c.type="button",c.setAttribute("aria-label","날기 — 누르고 있으면 상승"),c.textContent="▲",c.style.cssText=["position:fixed","right:20px","bottom:104px","width:64px","height:64px","border-radius:50%","border:1.5px solid rgba(255,255,255,0.34)","background:rgba(22,24,30,0.44)","color:rgba(255,255,255,0.92)","font-size:20px","line-height:1","z-index:6","display:none","align-items:center","justify-content:center","touch-action:none","user-select:none","-webkit-user-select:none","cursor:pointer","box-shadow:0 2px 12px rgba(0,0,0,0.32)","transition:background 0.12s, transform 0.12s, opacity 0.2s"].join(";"),c.addEventListener("touchstart",x,{passive:!1}),c.addEventListener("touchend",f),c.addEventListener("touchcancel",f),c.addEventListener("pointerdown",w=>{w.pointerType!=="touch"&&x(w)}),c.addEventListener("pointerup",w=>{w.pointerType!=="touch"&&f(w)}),document.body.appendChild(c));function g(w){const E=Math.min(w||0,.1),I=!!(t&&t.enabled);I||(o=!1),t&&t.liftOffset!==r&&(a=t.liftOffset,n=0),o?n=ui:(n-=pi*E,n<-5&&(n=-5)),a+=n*E,a>=Uo&&(a=Uo,n=0),a<=0&&(a=0,n=0),t&&(t.liftOffset=a,r=a);const b=I&&a>fi,m=e&&e();m&&typeof m.setFlying=="function"&&m.setFlying(b),c&&(c.style.display=I?"flex":"none")}function T(){document.removeEventListener("keydown",l),document.removeEventListener("keyup",s),c&&c.parentNode&&c.parentNode.removeChild(c)}return{update:g,dispose:T}}const bi="lu-stats-v1-",gi=3;function Ho(){const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}function xi(){return{totalVisits:0,days:{},dwell:{}}}class mi{key;_seen;data;_saveTimer;constructor(e){this.key=bi+String(e||"default"),this._seen=new Set,this.data=xi();try{const o=localStorage.getItem(this.key);if(o){const a=JSON.parse(o);a&&typeof a=="object"&&(this.data={totalVisits:a.totalVisits|0,days:a.days&&typeof a.days=="object"?a.days:{},dwell:a.dwell&&typeof a.dwell=="object"?a.dwell:{}})}}catch{}this._saveTimer=null}_save(){this._saveTimer||(this._saveTimer=setTimeout(()=>{this._saveTimer=null;try{localStorage.setItem(this.key,JSON.stringify(this.data))}catch{}},2e3))}addVisit(e){if(!e||this._seen.has(e))return;this._seen.add(e),this.data.totalVisits+=1;const o=Ho();this.data.days[o]=(this.data.days[o]|0)+1;const a=Object.keys(this.data.days).sort();for(;a.length>60;)delete this.data.days[a.shift()];this._save()}addDwell(e,o,a){if(!e||!e.length||!o||!o.length)return;let n=!1;for(const r of e){let l=null,s=gi;for(const c of o){const u=Math.hypot(c.pos.x-r.x,c.pos.z-r.z);u<s&&(s=u,l=c)}l&&l.title&&(this.data.dwell[l.title]=(this.data.dwell[l.title]||0)+a,n=!0)}n&&this._save()}summary(e){const a=[`오늘 방문 ${this.data.days[Ho()]|0}`,`누적 ${this.data.totalVisits}`];typeof e=="number"&&a.push(`방명록 ${e}`);const n=Object.entries(this.data.dwell).sort((r,l)=>l[1]-r[1])[0];if(n&&n[1]>=10){const r=n[1]>=60?`${Math.round(n[1]/60)}분`:`${Math.round(n[1])}초`;a.push(`인기작 「${n[0]}」 ${r}`)}return a.join(" · ")}}const ya="#5f9e7d";function yi(){const t=`
/* 폰트(@font-face·스택)는 SSOT인 vendor/fonts/fonts.css가 담당 — index.html <head>에서
   정적 <link>로 로드된다. 여기선 그 단일 스택(--app-font)만 --lu-font로 잇는다. */
:root {
  --lu-gold: ${ya};
  --lu-ink: #17140f;
  /* Gilded Frame HUD 토큰 — 챔퍼 2단계 + 모션 (게임 HUD 디자인 감사 v1.0) */
  --lu-ch-s: 7px;
  --lu-ch-l: 14px;
  --lu-spring: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  --lu-slide: 0.36s cubic-bezier(0.22, 1, 0.36, 1);
  --lu-font: var(--app-font);
}
/* 실루엣 — 라운드 2단계 (챔퍼 컷은 clip-path가 보더를 대각선에서 끊어
   모서리가 덜 만든 것처럼 보였음 — 감독 피드백으로 라운드 회귀) */
.lu-cut-s { border-radius: 10px; }
.lu-cut-l { border-radius: 16px; }

/* 포테이토 모드(소프트웨어 렌더링 감지) — 하드웨어 가속이 꺼진 환경에서는
   컴포지터도 CPU라 backdrop-filter가 매 프레임 CPU 블러가 된다. 전부 해제하고
   불투명도를 올려 가독성을 유지한다. */
.lu-potato #lu-dock .lu-dock-btn, .lu-potato #lu-controls,
.lu-potato #lu-topbar, .lu-potato #lu-status, .lu-potato #lu-topright .lu-stat,
.lu-potato #lu-controls-toggle, .lu-potato #lu-more-sheet, .lu-potato .lu-chat-msg,
.lu-potato #lu-gbtab {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
.lu-potato #lu-topbar, .lu-potato .lu-dock-btn, .lu-potato #lu-controls-toggle,
.lu-potato #lu-status, .lu-potato #lu-topright .lu-stat {
  background: rgba(23,20,15,0.88);
}

.lu * { box-sizing: border-box; margin: 0; padding: 0; }

.lu {
  font-family: var(--lu-font);
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
  color: #fff;
  user-select: none;
}

/* ------------------------------ 로딩 오버레이 ------------------------------ */
#lu-loading {
  position: fixed; inset: 0; z-index: 1000;
  background: #000;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 28px;
  transition: opacity 0.5s ease;
}
#lu-loading.lu-hidden { opacity: 0; pointer-events: none; }
.lu-spinner {
  width: 44px; height: 44px;
  border: 1px solid rgba(255,255,255,0.15);
  border-top-color: var(--lu-gold);
  border-radius: 50%;
  animation: lu-spin 0.9s linear infinite;
}
@keyframes lu-spin { to { transform: rotate(360deg); } }
.lu-loading-text {
  font-size: 13px; letter-spacing: 0.5em; text-indent: 0.5em;
  color: rgba(255,255,255,0.75);
  animation: lu-pulse 1.8s ease-in-out infinite;
}
@keyframes lu-pulse { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }

/* ------------------------------ 로비 오버레이 ------------------------------ */
#lu-lobby {
  position: fixed; inset: 0; z-index: 900;
  background: rgba(8,8,10,0.72);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  transition: opacity 0.6s ease;
}
#lu-lobby.lu-hidden { opacity: 0; pointer-events: none; }
.lu-lobby-card {
  width: 100%; max-width: 400px;
  background: rgba(255,255,255,0.97);
  color: #111;
  padding: 44px 36px 36px;
  box-shadow: 0 30px 80px rgba(0,0,0,0.5);
  text-align: center;
}
.lu-lobby-title {
  font-size: 24px; font-weight: 300;
  letter-spacing: 0.32em; text-indent: 0.32em;
  color: #111;
}
.lu-lobby-sub {
  margin-top: 10px;
  font-size: 11px; letter-spacing: 0.18em; text-indent: 0.18em;
  color: #999;
}
.lu-lobby-rule {
  width: 36px; height: 1px; background: var(--lu-gold);
  margin: 22px auto;
}
.lu-field-label {
  display: block; text-align: left;
  font-size: 11px; letter-spacing: 0.12em;
  color: #666; margin: 0 0 8px 2px;
}
#lu-nickname {
  width: 100%;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 15px; color: #111;
  background: transparent;
  border: none; border-bottom: 1px solid #ccc;
  padding: 8px 2px; outline: none;
  transition: border-color 0.25s ease;
  border-radius: 0;
}
#lu-nickname:focus { border-bottom-color: var(--lu-gold); }
.lu-field-hint {
  text-align: left; font-size: 10px; color: #aaa;
  margin: 6px 0 0 2px;
}
.lu-swatches {
  display: flex; flex-wrap: wrap;
  gap: 12px; margin-top: 4px;
}
.lu-swatch {
  width: 32px; height: 32px; border-radius: 50%;
  border: none; cursor: pointer; padding: 0;
  /* 캔디 페블 입체감 — 상단 하이라이트 + 하단 음영 베벨, 그 위에 근접 드롭섀도 */
  box-shadow:
    inset 0 0 0 1px rgba(47,35,19,0.16),
    inset 0 2px 3px rgba(255,255,255,0.5),
    inset 0 -3px 4px rgba(40,30,10,0.14),
    0 2px 3px rgba(40,30,10,0.18);
  transform: scale(1);
  transition: box-shadow 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.lu-swatch:hover { transform: scale(1.16); box-shadow: inset 0 0 0 1px rgba(47,35,19,0.16), inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -3px 4px rgba(40,30,10,0.14), 0 4px 8px rgba(40,30,10,0.24); }
.lu-swatch:active { transform: scale(0.94); }
.lu-swatch.lu-selected {
  box-shadow:
    inset 0 0 0 1px rgba(47,35,19,0.16), inset 0 2px 3px rgba(255,255,255,0.5),
    0 0 0 2px #fff, 0 0 0 4px var(--am-accent, var(--lu-gold)), 0 4px 8px rgba(40,30,10,0.28);
  animation: lu-swatchpop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes lu-swatchpop {
  0% { transform: scale(0.75); }
  60% { transform: scale(1.24); }
  100% { transform: scale(1.16); }
}
@media (prefers-reduced-motion: reduce) {
  .lu-swatch, .lu-swatch:hover, .lu-swatch.lu-selected { transition: none; animation: none; }
}
.lu-chars {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 8px; margin-top: 4px;
}
.lu-char-btn {
  font-family: var(--lu-font); font-weight: 500;
  font-size: 12.5px; letter-spacing: 0.03em;
  color: #4a453c; background: #fffdf9;
  border: 1px solid #e6dfcf; border-radius: 12px;
  padding: 10px 15px; cursor: pointer;
  box-shadow: 0 2px 8px rgba(23,20,15,0.04);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}
.lu-char-btn:hover { transform: translateY(-1px); }
.lu-char-btn:hover { border-color: rgba(0,0,0,0.25); }
.lu-char-btn.lu-selected {
  border-color: var(--lu-gold);
  color: #111;
  background: #f6f3ea;
}

/* ------------------------------ 커스텀 아바타 버튼 ------------------------------ */
.lu-char-custom {
  position: relative;
  background-size: cover; background-position: center 18%;
}
.lu-char-custom.lu-has-thumb {
  color: #fff; border-color: #ddd;
  text-shadow: 0 1px 4px rgba(0,0,0,0.75);
}
.lu-char-edit-link {
  display: block;
  margin: 6px auto 0;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 10px; letter-spacing: 0.05em; color: #999;
  background: transparent; border: none; cursor: pointer;
  padding: 2px 4px; text-align: center;
  transition: color 0.2s ease;
}
.lu-char-edit-link:hover { color: var(--lu-gold); }

/* 로비 "캐릭터 디자인" 메뉴 버튼 — 입장 폼과 분리된, 명확히 라벨된 진입점 */
.lu-char-design-btn {
  display: flex; align-items: center; gap: 12px; width: 100%;
  margin-top: 8px; padding: 12px 14px;
  background: #fff; border: 1px solid #e4e0d6; border-radius: 14px;
  cursor: pointer; text-align: left; font-family: var(--lu-font);
  transition: border-color 0.18s ease, transform 0.1s ease, box-shadow 0.18s ease;
}
.lu-char-design-btn:hover { border-color: var(--lu-gold); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(20,38,29,0.06); }
.lu-char-design-btn:focus-visible { outline: 2px solid var(--lu-gold); outline-offset: 2px; }
.lu-char-design-media {
  flex: 0 0 auto; width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
  background: #f4f1e8 center/cover no-repeat; border: 1px solid #e4e0d6;
}
.lu-char-design-media.lu-has-thumb { background-color: #f6f1e3; }
.lu-char-design-txt { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.lu-char-design-txt b { font-size: 14px; font-weight: 700; color: var(--lu-ink, #17140f); }
.lu-char-design-txt span { font-size: 11.5px; color: #8a8577; }
.lu-char-design-arrow { flex: 0 0 auto; font-size: 20px; color: #bdb8a8; }

/* -------------------------- 아바타 커스터마이저 모달 -------------------------- */
/* 따뜻한 프리미엄 리톤(#74, 2026-07-18) — DESIGN.md §2/§3-1: 꾸미기 모달은 라이트/다크와
   무관한 "따뜻함 예외" 표면으로 유지(배포 대상, 조용한 럭셔리 리톤은 폐기). 샌디 크림·
   우드 브라운·프리셋/옷장 카드 구조는 그대로 두고, 액센트만 팔레트 B안(§3-2·§3-4)과
   정합시킨다 — 구 청자 그린 램프(g100~g900) 잔재를 걷어내고 §12 마스코트 규정("UI가
   아야모를 강조할 때 쓰는 액센트는 주조 1색, 권장 바이올렛")에 따라 바이올렛 1색으로
   통일했다. 라이트 표면(크림 배경)이므로 원색(--violet-500)이 아닌 AA 통과 다크 변형
   --violet-ink(§3-4, 라이트 BG 대비 5.55:1)를 메인 액센트로 쓴다. 잎사귀·접힌 종이·
   나무결 모티프는 전부 오리지널 SVG/CSS — 특정 브랜드 아이콘·마크·서체·캐릭터 미사용. */
#lu-chibi-maker {
  --am-cream: #fff8e8;
  --am-cream-2: #fbe8bb;
  --am-ink: #2f2313;
  --am-ink-body: #6b5636;
  --am-ink-dim: #a68f68;
  --am-line: #e8cf9c;
  --am-accent-wash: #EAE5FF;  /* --violet-100 — 선택 배경 워시 */
  --am-accent-soft: #AB99FF;  /* --violet-300 — 장식용 밝은 보더/호버(비텍스트) */
  --am-accent: #5733FF;       /* --violet-ink(=--violet-700) — 정체성 액센트, 라이트 BG AA 5.55:1 */
  --am-wood: #d3a765;
  --am-wood-dark: #a97c42;
  /* 종이 그레인 — 자체 SVG feTurbulence(중회색 스펙클, 저알파) data-URI, 외부 요청 0.
     소스오버 합성이라 밝은 면 위에선 살짝 어둡게, 어두운 면 위에선 살짝 밝게 읽혀
     어느 톤이든 결이 보인다(카드·프레임·오버레이 공용). */
  --am-grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.14 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
  /* 우드 프레임 전용 — 배경이 더 진하고 채도가 높아 은은한 결이 묻히므로 살짝 더 진한 그레인 */
  --am-grain-wood: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.2 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
}
#lu-avatar-maker, #lu-chibi-maker {
  position: fixed; inset: 0; z-index: 985;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
}
#lu-avatar-maker { background: rgba(20,16,9,0.76); }
#lu-chibi-maker {
  /* 다층 깊이감 — 은은한 상단 광원 + 종이 그레인을 어둑한 스크림 위에 얹어
     배경 자체가 평면 단색이 아니라 하나의 무대처럼 읽히게 한다. */
  background-image: var(--am-grain), radial-gradient(120% 90% at 50% 6%, rgba(74,58,30,0.22), rgba(32,26,12,0) 55%);
  background-repeat: repeat, no-repeat;
  background-color: rgba(20,16,9,0.76);
}
#lu-avatar-maker.lu-open, #lu-chibi-maker.lu-open { opacity: 1; pointer-events: auto; }
.lu-am-card {
  width: 100%; max-width: 860px;
  max-height: 94vh; max-height: 94dvh;  /* iOS Safari 동적 툴바 — vh(주소창 포함 큰 값)면
     주소창 보일 때 카드가 실제 가시영역보다 커져 footer가 밀리고 body 스크롤이 깨진다.
     dvh(가시영역 실측)로 보정, 미지원 브라우저는 앞 vh 폴백. */
  background-image: var(--am-grain), linear-gradient(165deg, var(--am-cream) 0%, #fffaee 40%, var(--am-cream-2) 100%);
  background-repeat: repeat, no-repeat;
  color: var(--am-ink);
  border-radius: 30px;
  border: 3px solid rgba(211,167,101,0.5);
  /* 근접 접지 그림자 + 원거리 앰비언트 그림자를 겹쳐 카드가 배경 위에 실제로
     "떠 있는" 다층 깊이감을 낸다(평면 단일 그림자 금지). */
  box-shadow:
    0 1px 0 rgba(255,255,255,0.7) inset,
    0 2px 4px rgba(40,30,10,0.16),
    0 10px 20px rgba(40,30,10,0.18),
    0 32px 64px rgba(40,30,10,0.32),
    0 72px 120px rgba(20,15,6,0.28);
  display: flex; flex-direction: column;
  overflow: hidden;
  transform: scale(0.96) translateY(6px); opacity: 0;
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}
#lu-avatar-maker.lu-open .lu-am-card, #lu-chibi-maker.lu-open .lu-am-card { transform: scale(1) translateY(0); opacity: 1; }
.lu-am-head {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0));
  border-bottom: 2px solid var(--am-line);
  box-shadow: 0 1px 0 rgba(255,255,255,0.5);
}
.lu-am-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--am-ink);
}
.lu-am-title-icon {
  display: flex; width: 24px; height: 24px; flex: 0 0 auto;
  color: var(--am-accent);
  filter: drop-shadow(0 1px 0 rgba(255,255,255,0.55)) drop-shadow(0 2px 3px rgba(87,51,255,0.22));
}
.lu-am-title-icon svg { width: 100%; height: 100%; }
#lu-am-close {
  flex: 0 0 auto;
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: var(--am-cream-2);
  border: 2px solid var(--am-wood);
  border-radius: 50%;
  color: var(--am-wood-dark); font-size: 17px; font-weight: 400; line-height: 1;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 3px 0 rgba(169,124,66,0.45), 0 6px 12px rgba(40,30,10,0.2);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
#lu-am-close:hover { border-color: var(--am-accent); color: #fff; background: var(--am-accent); transform: translateY(1px) rotate(90deg); box-shadow: 0 2px 0 rgba(87,51,255,0.5), 0 4px 8px rgba(40,30,10,0.18); }
#lu-am-close:active { transform: translateY(3px) rotate(90deg); box-shadow: none; }
/* 상단 액션 — 저장(✓, 강조) + 닫기(×)를 헤더 우측에 나란히(하단 버튼 통합) */
.lu-am-head-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; }
#lu-am-save {
  flex: 0 0 auto;
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: var(--am-accent);
  border: 2px solid var(--am-accent);
  border-radius: 50%;
  color: #fff; font-size: 18px; font-weight: 800; line-height: 1;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 3px 0 rgba(60,36,180,0.5), 0 6px 12px rgba(40,30,10,0.2);
  transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
#lu-am-save:hover { background: #6a4bff; transform: translateY(1px); box-shadow: 0 2px 0 rgba(60,36,180,0.5), 0 4px 8px rgba(40,30,10,0.18); }
#lu-am-save:active { transform: translateY(3px); box-shadow: none; }
.lu-am-body {
  flex: 1 1 auto; min-height: 0;
  display: flex; gap: 24px;
  padding: 24px;
  overflow: hidden;
}
/* ---- 프리뷰 무대 — 300×400 백킹 해상도(ensurePreviewRenderer)는 불변, 바깥 프레임만 장식 ----
   바깥 padding 링을 우드 톤 다층 그라디언트 + 결 스트라이프로 채워 "액자" 느낌을 낸다. */
.lu-am-preview {
  flex: 0 0 auto;
  align-self: flex-start;   /* 긴 탭에서 프레임이 패널 높이만큼 늘어나 아래 빈 나무 슬래브가 생기지 않게 — 스테이지에 맞춰 감싼다 */
  display: flex; align-items: flex-start;
  width: auto;
  padding: 14px;
  border-radius: 26px;
  position: relative;
  touch-action: pan-y;  /* 좌우 드래그=캐릭터 회전(앱), 상하 스와이프=화면 스크롤(브라우저) — 감독 지시 */
  background-image:
    var(--am-grain-wood),
    repeating-linear-gradient(4deg, rgba(255,244,220,0.14) 0 2px, rgba(94,61,20,0.06) 2px 4px, transparent 4px 8px),
    linear-gradient(155deg, #eecb92 0%, var(--am-wood) 48%, var(--am-wood-dark) 130%);
  background-repeat: repeat, repeat, no-repeat;
  border: 3px solid var(--am-wood-dark);
  box-shadow:
    inset 0 0 0 1px rgba(255,244,220,0.35),
    inset 0 3px 4px rgba(255,244,220,0.4),
    inset 0 -5px 10px rgba(58,38,10,0.32),
    0 2px 4px rgba(40,30,10,0.14),
    0 16px 30px rgba(40,30,10,0.2),
    0 36px 64px rgba(40,30,10,0.18);
}
.lu-am-stage {
  width: 100%; aspect-ratio: 3 / 4;
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: #ddd2bd;  /* 방 배경 하단색 — WebGL 첫 렌더 전/둥근모서리 밖 플래시 방지 */
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.6), inset 0 0 0 3px rgba(211,167,101,0.3), inset 0 2px 10px rgba(40,30,10,0.12);
}
/* touch-action은 비상속이라 부모(.lu-am-preview)의 pan-y가 캔버스에 안 내려온다 → 캔버스에
   직접 지정해야 세로 스와이프가 화면 스크롤로 통과한다(좌우 드래그=회전 유지). */
.lu-am-stage canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: pan-y; }
.lu-am-preview.lu-dragging .lu-am-stage canvas { cursor: grabbing; }
/* 부드러운 비네트 + 접지 그림자 + 은은한 종이 결 — canvas가 불투명(scene.background)이라
   위에 멀티플라이로 얹는다 */
.lu-am-stage::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image: var(--am-grain), radial-gradient(120% 100% at 50% 24%, rgba(255,247,222,0) 48%, rgba(60,45,20,0.08) 100%);
  background-repeat: repeat, no-repeat;
  mix-blend-mode: multiply;
}
/* 접지 그림자는 3D 실시간 그림자맵(ensurePreviewRenderer)이 담당한다 — 캐릭터가 자동
   연기로 움직이면 그림자도 따라가므로 정적 CSS 타원(구 ::after)은 제거했다. */
/* 무대 래퍼 — 사진(캔버스)을 감싸는 프레임. */
.lu-am-stagewrap { position: relative; width: 244px; height: 325px; flex: 0 0 auto; }  /* 3:4 명시 */
/* ---- 카테고리 내비 — 종족·얼굴·헤어·의상·장식·옷장 섹션 전환 ---- */
.lu-am-panel {
  flex: 1 1 auto; min-width: 0; min-height: 0;
  display: flex; flex-direction: column;
}
.lu-am-nav {
  flex: 0 0 auto;
  display: flex; gap: 8px;
  /* overflow-x:auto가 세로도 auto로 만들어, 선택 탭이 떠오를 때(translateY/pop 애니메이션)
     상단이 잘리던 문제 → 위쪽 여백으로 떠오르는 만큼의 공간 확보(감독 보고: 종족 칸 위 잘림). */
  padding: 6px 0 12px; margin-bottom: 16px;
  border-bottom: 2px dashed var(--am-line);
  overflow-x: auto;
  scrollbar-width: none;
}
.lu-am-nav::-webkit-scrollbar { display: none; }
.lu-am-navtab {
  flex: 0 0 auto;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  min-width: 58px;
  font-family: var(--lu-font); font-weight: 700;
  font-size: 10.5px; letter-spacing: 0.01em;
  color: var(--am-ink-dim); background: #fff;
  border: 2px solid transparent; border-radius: 18px;
  padding: 8px 12px 7px; cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
}
.lu-am-navtab svg { width: 19px; height: 19px; }
.lu-am-navtab:hover { color: var(--am-ink); background: var(--am-cream-2); transform: translateY(-1px); }
.lu-am-navtab:active { transform: scale(0.94); }
/* 선택 탭 — 통통하게 떠오른 raised pill + 재렌더마다 살짝 튀는 마이크로 팝
   (매 렌더 시 새 DOM 노드로 재생성되므로 애니메이션이 자연히 재생된다) */
.lu-am-navtab.lu-selected {
  color: var(--am-ink); background: var(--am-accent-wash);
  border-color: var(--am-accent-soft);
  border-radius: 22px 26px 24px 28px;
  box-shadow: 0 3px 0 rgba(87,51,255,0.35), 0 8px 14px rgba(87,51,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.6);
  animation: lu-navpop 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.lu-am-navtab.lu-selected svg { color: var(--am-accent); }
@keyframes lu-navpop {
  0% { transform: translateY(0) scale(0.84); }
  55% { transform: translateY(-4px) scale(1.06); }
  100% { transform: translateY(-2px) scale(1); }
}
.lu-am-tabs {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.lu-am-tab {
  font-family: var(--lu-font); font-weight: 600;
  font-size: 12px; letter-spacing: 0.01em;
  color: var(--am-ink-body); background: #fffdf6;
  border: 2px solid var(--am-line); border-radius: 16px;
  padding: 8px 16px; cursor: pointer;
  box-shadow: 0 2px 0 rgba(232,207,156,0.7);
  transition: border-color 0.16s ease, color 0.16s ease, background 0.16s ease, transform 0.1s ease, box-shadow 0.16s ease;
}
.lu-am-tab:hover { border-color: var(--am-accent-soft); color: var(--am-ink); background: var(--am-cream-2); transform: translateY(-1px); }
.lu-am-tab:active { transform: translateY(1px) scale(0.98); box-shadow: none; }
.lu-am-tab.lu-selected {
  border-color: var(--am-accent); color: var(--am-ink); background: var(--am-accent-wash);
  font-weight: 800;
  box-shadow: 0 2px 0 rgba(87,51,255,0.4), 0 5px 10px rgba(87,51,255,0.16), inset 0 0 0 1px rgba(171,153,255,0.5);
  animation: lu-chippop 0.26s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes lu-chippop {
  0% { transform: scale(0.88); }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
/* 프리셋 카드 — 스킨/포인트 색 미리보기 도트가 붙은 쇼케이스 칩 */
.lu-am-presets { gap: 10px; }
.lu-am-presets .lu-am-tab { display: flex; align-items: center; gap: 9px; padding: 6px 16px 6px 6px; }
.lu-am-preset-dot {
  width: 22px; height: 22px; border-radius: 50%; flex: 0 0 auto;
  box-shadow:
    inset 0 0 0 1px rgba(47,35,19,0.18),
    inset 0 2px 3px rgba(255,255,255,0.55),
    inset 0 -3px 4px rgba(40,30,10,0.16),
    0 2px 3px rgba(40,30,10,0.2);
}
.lu-am-tabpage {
  flex: 1 1 auto; min-height: 0;
  overflow-y: auto;
  padding: 2px 4px 6px 2px;
}
.lu-am-tabpage::-webkit-scrollbar { width: 7px; }
.lu-am-tabpage::-webkit-scrollbar-thumb { background: var(--am-line); border-radius: 8px; }
.lu-am-group-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--am-accent);
  margin: 0 0 11px;
}
.lu-am-group-icon { display: flex; width: 14px; height: 14px; flex: 0 0 auto; }
.lu-am-group-icon svg { width: 100%; height: 100%; }
.lu-am-section-title {
  font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: var(--am-ink-dim);
  margin: 13px 0 7px;
}
/* 내 옷장 (로그인 전용) */
.lu-closet-save {
  width: 100%; margin: 2px 0 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  border: 2px dashed var(--am-accent); background: rgba(171,153,255,0.14);
  color: var(--am-accent); font-weight: 800; border-radius: 18px;
  padding: 12px 16px;
}
.lu-closet-save:hover { background: rgba(171,153,255,0.26); border-color: var(--am-accent); }
.lu-closet-empty { font-size: 12px; color: var(--am-ink-dim); padding: 6px 2px 10px; }
.lu-closet-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 12px;
}
.lu-closet-cell { position: relative; }
.lu-closet-load {
  width: 100%; aspect-ratio: 3 / 4;
  border: 2px solid var(--am-line); border-radius: 16px;
  background-color: var(--am-cream-2); background-size: cover; background-position: center;
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0; overflow: hidden; cursor: pointer; position: relative;
  box-shadow: 0 2px 0 rgba(232,207,156,0.6), 0 5px 12px rgba(40,30,10,0.1);
  transition: border-color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
}
/* 접힌 종이 모서리 — 카탈로그 카드 느낌(오리지널 CSS 그라디언트 폴드, 특정 게임 UI 카피 아님) */
.lu-closet-load::before {
  content: ''; position: absolute; top: 0; right: 0; z-index: 2;
  width: 20px; height: 20px;
  background: linear-gradient(135deg, #fffefa 0%, #fffefa 48%, #ecdcac 52%, #cdb787 100%);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
  filter: drop-shadow(-1.5px 1.5px 1.5px rgba(40,30,10,0.22));
}
.lu-closet-load:hover { border-color: var(--am-accent-soft); transform: translateY(-3px); box-shadow: 0 4px 0 rgba(232,207,156,0.6), 0 14px 26px rgba(40,30,10,0.2); }
.lu-closet-name {
  width: 100%; font-size: 10px; font-weight: 700; color: #fff;
  padding: 8px 4px 5px; text-align: center;
  background: linear-gradient(to top, rgba(40,30,10,0.66), rgba(40,30,10,0));
  letter-spacing: 0.02em;
}
.lu-closet-del {
  position: absolute; top: -8px; right: -8px; z-index: 3;
  width: 24px; height: 24px; line-height: 21px; padding: 0;
  border-radius: 50%; border: 2px solid #fff; background: #e8735c;
  color: #fff; font-size: 14px; cursor: pointer;
  box-shadow: 0 2px 0 rgba(160,60,40,0.4), 0 3px 6px rgba(40,30,10,0.2);
  transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.lu-closet-del:hover { background: #d85f47; transform: scale(1.08); }
.lu-closet-del:active { transform: translateY(1px) scale(1.02); box-shadow: 0 1px 0 rgba(160,60,40,0.4); }
.lu-am-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  gap: 8px;
}
.lu-am-thumb {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: #fffdf6; border: 2px solid var(--am-line); border-radius: 14px;
  padding: 6px 4px 7px; cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.lu-am-thumb:hover { border-color: var(--am-accent-soft); }
.lu-am-thumb.lu-selected { border-color: var(--am-accent); background: var(--am-accent-wash); }
.lu-am-thumb img {
  width: 48px; height: 48px; object-fit: contain;
  background: #fff; border: 1px solid var(--am-line);
}
.lu-am-thumb-none {
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: #fff; border: 1px solid var(--am-line);
  font-size: 10px; color: var(--am-ink-dim); letter-spacing: 0.02em;
}
.lu-am-thumb-label {
  font-size: 9px; letter-spacing: 0.01em; color: var(--am-ink-dim);
  text-align: center;
  max-width: 62px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lu-am-cute-row { margin-top: 4px; }
.lu-am-cute-label {
  display: flex; justify-content: space-between;
  font-size: 11px; color: var(--am-ink-body); margin-bottom: 8px;
}
.lu-am-cute-label b { color: var(--am-accent); font-weight: 700; }
#lu-am-cute { width: 100%; accent-color: var(--am-accent); }
.lu-am-footer {
  flex: 0 0 auto;
  display: flex; flex-direction: column; gap: 12px;
  padding: 16px 24px 20px;
  border-top: 2px solid var(--am-line);
  background: linear-gradient(0deg, rgba(255,255,255,0.5), rgba(255,255,255,0));
}
.lu-am-footer-btns { display: flex; gap: 10px; justify-content: flex-end; align-items: center; }
/* 회원가입 게이트 — 게스트에게만 노출(저장하려면 회원가입) */
.lu-am-guest-gate {
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(191,161,74,0.06); border: 1px solid rgba(191,161,74,0.28);
}
.lu-am-gate-note { font-size: 12px; line-height: 1.55; color: var(--am-ink-body); word-break: keep-all; }
.lu-am-signup-providers { display: flex; flex-wrap: wrap; gap: 8px; }
.lu-am-social {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  font-family: var(--lu-font); font-weight: 700; font-size: 11.5px;
  color: var(--am-ink-body); background: #fff;
  border: 1px solid var(--am-line); border-radius: 999px; padding: 7px 12px;
  transition: border-color 0.15s ease, transform 0.1s ease;
}
.lu-am-social:hover { border-color: var(--am-accent); transform: translateY(-1px); }
.lu-am-social:disabled { opacity: 0.55; cursor: default; }
.lu-am-social .lu-social-badge {
  width: 16px; height: 16px; border-radius: 50%; font-size: 10px; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
  background: #f0ece0; color: #6b6459;
}
.lu-am-btn {
  font-family: var(--lu-font); font-weight: 700;
  font-size: 12.5px; letter-spacing: 0.02em;
  color: var(--am-ink-body); background: #fffdf6;
  border: 2px solid var(--am-line); border-radius: 999px;
  padding: 12px 20px; cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 0 rgba(232,207,156,0.7), 0 6px 12px rgba(40,30,10,0.08);
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease, transform 0.12s ease, box-shadow 0.15s ease;
}
.lu-am-btn:hover { border-color: var(--am-accent-soft); color: var(--am-ink); transform: translateY(-1px); }
.lu-am-btn:active { transform: translateY(2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 0 rgba(232,207,156,0.7); }
/* 저장 CTA — 캔디 셸 상단 하이라이트("립") + 하단 음영으로 통통한 눌림감을 강조.
   §3-4 라벨 규칙(라이트 표면 -ink 채움 위엔 --text-light 라벨)에 따라 흰 텍스트 유지. */
.lu-am-btn-primary {
  color: #fff; background: linear-gradient(180deg, #9680FF, var(--am-accent) 60%, #170080);
  border-color: #170080;
  font-weight: 800;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -10px 14px rgba(23,0,128,0.3), 0 4px 0 #170080, 0 10px 22px rgba(87,51,255,0.4);
}
.lu-am-btn-primary:hover { background: linear-gradient(180deg, #AB99FF, #6C4DFF 60%, #170080); transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -10px 14px rgba(23,0,128,0.32), 0 5px 0 #170080, 0 12px 26px rgba(87,51,255,0.44); }
.lu-am-btn-primary:active { transform: translateY(3px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 0 #170080, 0 3px 8px rgba(87,51,255,0.3); }
#lu-chibi-maker button:focus-visible {
  outline: 2px solid var(--am-accent); outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  #lu-avatar-maker, #lu-chibi-maker, .lu-am-card, #lu-am-close, .lu-am-navtab, .lu-am-tab, .lu-am-btn, .lu-closet-load, .lu-closet-del,
  .lu-am-navtab.lu-selected, .lu-am-tab.lu-selected {
    transition: none !important;
    animation: none !important;
  }
}

#lu-enter-btn, .lu-quick-btn {
  width: 100%; margin-top: 30px;
  font-family: var(--lu-font); font-weight: 600;
  font-size: 14px; letter-spacing: 0.24em; text-indent: 0.24em;
  color: #17140f; background: var(--lu-gold);
  border: 1px solid var(--lu-gold); border-radius: 999px;
  padding: 15px 0; cursor: pointer;
  box-shadow: 0 6px 20px rgba(95,158,125,0.35);
  transition: transform 0.15s ease, box-shadow 0.25s ease;
}
#lu-enter-btn:hover, .lu-quick-btn:hover { transform: translateY(-1px); box-shadow: 0 9px 26px rgba(95,158,125,0.45); }
/* 재방문 스마트 입장(A) — 저장된 프로필·아바타가 있으면 '바로 입장' 원클릭 */
.lu-quick-enter { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 8px; }
.lu-quick-avatar { width: 66px; height: 66px; border-radius: 50%; background: #f0ede8 center/cover no-repeat; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06); }
.lu-quick-greet { text-align: center; }
.lu-quick-greet b { display: block; font-size: 17px; color: #17140f; }
.lu-quick-greet span { display: block; margin-top: 3px; font-size: 13px; color: #8a857c; }
.lu-quick-enter .lu-quick-btn { margin-top: 6px; }
.lu-quick-change { background: none; border: none; color: #8a857c; font-size: 13px; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; font-family: var(--lu-font); }
.lu-quick-change:hover { color: #17140f; }
.lu-lobby-form.lu-collapsed { display: none; }

/* ------------------------------ 전시 선택 ------------------------------ */
.lu-picker-note {
  text-align: left;
  font-size: 11px; letter-spacing: 0.04em;
  color: var(--lu-gold);
  margin: 0 0 10px 2px;
}
.lu-picker-list {
  display: flex; flex-direction: column; gap: 6px;
}
.lu-picker-item {
  display: block; width: 100%; text-align: left;
  font-family: var(--lu-font); font-weight: 300;
  background: #fafafa; border: 1px solid #eee; border-left: 2px solid transparent;
  padding: 10px 14px; cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.lu-picker-item:hover:not(:disabled) { background: #f2f2f0; border-left-color: var(--lu-gold); }
.lu-picker-item:disabled { cursor: default; }
.lu-picker-item.lu-picker-current {
  background: #f6f3ea; border-left-color: var(--lu-gold);
}
.lu-picker-name { font-size: 13px; color: #111; }
.lu-picker-meta { font-size: 10px; letter-spacing: 0.06em; color: #999; margin-top: 3px; }

.lu-lobby-divider { width: 100%; height: 1px; background: #eee; margin: 26px 0 18px; }
.lu-studio-link {
  display: inline-block;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 11px; letter-spacing: 0.1em; color: #999;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.lu-studio-link:hover { color: var(--lu-gold); border-bottom-color: var(--lu-gold); }

/* ------------------------------ 소셜 로그인 ------------------------------ */
#lu-auth { margin: 26px 0 6px; }
.lu-social-wrap { display: flex; flex-direction: column; gap: 9px; }
.lu-social-btn {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 11px 16px;
  background: transparent;
  border: 1px solid rgba(0,0,0,0.18);
  border-radius: 3px;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 13px; letter-spacing: 0.02em;
  color: #222;
  cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, opacity 0.25s ease;
}
.lu-social-btn:hover { border-color: rgba(0,0,0,0.45); }
.lu-social-btn:disabled { opacity: 0.55; cursor: default; }
.lu-social-busy { background: rgba(0,0,0,0.03); }
.lu-social-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px;
  border-radius: 50%;
  font-size: 11px; font-weight: 500;
  flex: 0 0 auto;
}
.lu-social-google .lu-social-badge { background: #fff; border: 1px solid #dadce0; color: #4285f4; }
.lu-social-kakao .lu-social-badge { background: #fee500; color: #191919; }
.lu-social-kakao { background: rgba(254,229,0,0.12); border-color: rgba(210,190,0,0.45); }
.lu-social-kakao:hover { background: rgba(254,229,0,0.22); }
.lu-social-naver .lu-social-badge { background: #03c75a; color: #fff; }
.lu-social-naver { background: rgba(3,199,90,0.07); border-color: rgba(3,150,70,0.35); }
.lu-social-naver:hover { background: rgba(3,199,90,0.14); }
.lu-social-note {
  margin-top: 2px;
  font-size: 10px; letter-spacing: 0.03em;
  color: #b0aca4;
  text-align: center;
}

.lu-logged-chip {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(0,0,0,0.14);
  border-left: 2px solid var(--lu-gold);
  border-radius: 3px;
  background: rgba(0,0,0,0.025);
}
.lu-logged-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: #1a1a1c; color: var(--lu-gold);
  font-size: 13px; font-weight: 400;
  flex: 0 0 auto;
}
.lu-logged-name { font-size: 13px; color: #1a1a1a; }
.lu-logged-via {
  font-size: 10px; color: #999;
  border: 1px solid #ddd; border-radius: 50%;
  width: 17px; height: 17px;
  display: inline-flex; align-items: center; justify-content: center;
}
.lu-logout-btn {
  margin-left: auto;
  background: transparent; border: none;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 11px; letter-spacing: 0.04em;
  color: #999; cursor: pointer;
  transition: color 0.25s ease;
}
.lu-logout-btn:hover { color: var(--lu-gold); }

.lu-auth-or {
  display: flex; align-items: center; gap: 12px;
  margin: 18px 0 4px;
}
.lu-auth-or::before, .lu-auth-or::after {
  content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.1);
}
.lu-auth-or span {
  font-size: 10px; letter-spacing: 0.12em;
  color: #b0aca4;
}

/* --------------------------------- HUD --------------------------------- */
.lu-hud {
  position: fixed; z-index: 500;
  opacity: 0; visibility: hidden; pointer-events: none;
  transition: opacity 0.6s ease, visibility 0.6s;
}
.lu-hud.lu-visible { opacity: 1; visibility: visible; }
/* [P0] 인터랙티브 HUD는 가시화와 함께 터치도 복구 (감사 발견 버그) */
#lu-dock.lu-visible, #lu-controls-toggle.lu-visible { pointer-events: auto; }
/* (작품 카드의 터치 기기 배치는 작품 패널 베이스 CSS 뒤에서 재정의 — 캐스케이드 순서) */

#lu-controls {
  top: calc(16px + env(safe-area-inset-top, 0px));
  left: max(16px, env(safe-area-inset-left, 0px));
  background: rgba(23,20,15,0.82);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  padding: 14px 18px;
  border: 1px solid rgba(253,251,245,0.16);
  border-left: 3px solid var(--lu-gold);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  font-size: 12px; font-weight: 500; line-height: 1.9;
  color: rgba(253,251,245,0.88);
}
#lu-controls .lu-key {
  display: inline-block; min-width: 72px;
  color: var(--lu-gold); letter-spacing: 0.06em;
}
#lu-controls .lu-controls-title {
  font-size: 10px; letter-spacing: 0.24em;
  color: rgba(255,255,255,0.5);
  margin-bottom: 6px;
}

#lu-topright {
  top: calc(16px + env(safe-area-inset-top, 0px));
  right: max(16px, env(safe-area-inset-right, 0px));
  display: flex; flex-direction: column; align-items: flex-end;
  gap: 6px;
  font-size: 12px; letter-spacing: 0.08em;
  text-align: right;
}
#lu-topright .lu-stat {
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  padding: 6px 12px;
  font-weight: 500;
  color: rgba(253,251,245,0.85);
}
#lu-topright .lu-stat b {
  font-weight: 600; font-variant-numeric: tabular-nums; color: #8fd0ab;
}
/* 성능 지표는 디버그 정보 — 터치 기기 1차 HUD에서 제외 (게임 HUD 감사) */
@media (pointer: coarse) { #lu-topright { display: none; } }

/* 상단 통합 바 — 전시명 + 라이브 접속자 (Gilded Frame 유리 칩) */
#lu-topbar {
  border-radius: 17px;
  top: calc(10px + env(safe-area-inset-top, 0px));
  left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px;
  height: 34px; padding: 0 16px;
  max-width: min(78vw, 480px);
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
}
#lu-topbar.lu-empty { opacity: 0 !important; }
.lu-topbar-title {
  font-size: 11px; font-weight: 500;
  letter-spacing: 0.28em; text-indent: 0.28em;
  color: rgba(253,251,245,0.85);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lu-topbar-sep { width: 1px; height: 12px; background: rgba(253,251,245,0.2); flex: none; }
.lu-topbar-count {
  display: flex; align-items: center; gap: 5px; flex: none;
  font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums;
  color: #8fd0ab;
}
.lu-topbar-count::before {
  content: ''; width: 5px; height: 5px; border-radius: 50%;
  background: #7ec97e; box-shadow: 0 0 6px rgba(126,201,126,0.8);
}
.lu-topbar-count b { display: inline-block; font-weight: 600; }
.lu-topbar-count.lu-tick b { animation: lu-count-tick 0.3s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes lu-count-tick { 0% { transform: scale(1.25); } 100% { transform: scale(1); } }

#lu-status {
  /* 하단은 조이스틱·독의 영역 — 토스트는 상단 바 아래로 */
  top: calc(54px + env(safe-area-inset-top, 0px)); left: 50%;
  transform: translateX(-50%);
  max-width: min(80vw, 560px);
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  border-left: 3px solid var(--lu-gold);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  padding: 7px 18px;
  font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
  color: rgba(253,251,245,0.95);
  text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: opacity 0.22s cubic-bezier(0.22,1,0.36,1);
}
#lu-status:empty { opacity: 0; visibility: hidden; }

/* --------------------------------- 채팅 --------------------------------- */
#lu-chat {
  bottom: 16px; left: 16px;
  width: min(340px, calc(100vw - 32px));
  display: flex; flex-direction: column; gap: 8px;
}
/* 터치 기기 기본: 입력창을 접어 하단을 가상 조이스틱 영역으로 비워둔다.
   (실기기 UX 피드백 — 전폭 채팅 입력창이 왼쪽 엄지를 삼켜 키보드가 올라오던 문제) */
#lu-chat.lu-chat-collapsed #lu-chat-input { display: none; }
#lu-chat.lu-chat-collapsed { pointer-events: none; }
#lu-chat-log {
  display: flex; flex-direction: column; gap: 3px;
  max-height: 220px; overflow: hidden;
}
.lu-chat-msg {
  background: rgba(10,10,12,0.5);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  padding: 5px 10px;
  font-size: 12px; line-height: 1.5;
  color: rgba(255,255,255,0.9);
  word-break: break-word;
  animation: lu-chat-in 0.25s ease;
  align-self: flex-start;
  max-width: 100%;
}
@keyframes lu-chat-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.lu-chat-name { font-weight: 400; color: rgba(255,255,255,0.65); margin-right: 6px; }
.lu-chat-msg.lu-self .lu-chat-name { color: var(--lu-gold); }
#lu-chat-input {
  width: 100%;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 13px; color: #fff;
  background: rgba(10,10,12,0.6);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 9px 12px; outline: none;
  opacity: 0.55; pointer-events: auto;
  transition: opacity 0.25s ease, border-color 0.25s ease;
  border-radius: 0;
}
#lu-chat-input::placeholder { color: rgba(255,255,255,0.35); letter-spacing: 0.06em; }
#lu-chat-input:focus { opacity: 1; border-color: var(--lu-gold); }

/* ----------------------------- 작품 정보 패널 ----------------------------- */
#lu-artwork {
  /* 미술관 벽면 캡션 카드 — 크림 종이 + 골드 상단 액센트 */
  position: fixed; z-index: 600;
  top: 50%; right: 16px;
  transform: translate(calc(100% + 40px), -50%);
  width: min(320px, calc(100vw - 28px));
  background: linear-gradient(180deg, #fffdf8 0%, #f8f4ea 100%);
  color: #1c1a16;
  padding: 26px 26px 22px;
  border-radius: 16px;
  border: 1px solid rgba(95,158,125,0.28);
  box-shadow: 0 18px 50px rgba(20,15,8,0.30), 0 2px 8px rgba(20,15,8,0.12);
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}
#lu-artwork::before {
  /* 골드 상단 레일 — 챔퍼 모서리와 정렬되는 좌측 기점 짧은 선 */
  content: '';
  position: absolute; top: 0; left: var(--lu-ch-l, 14px); width: 44px; height: 3px;
  background: linear-gradient(90deg, var(--lu-gold), rgba(95,158,125,0));
}
#lu-artwork.lu-open { transform: translate(0, -50%); }
#lu-artwork .lu-art-eyebrow {
  font-size: 9.5px; letter-spacing: 0.34em;
  color: #3f7a5c; margin-bottom: 10px;
}
#lu-artwork .lu-art-title {
  font-size: 21px; font-weight: 600; line-height: 1.32;
  letter-spacing: -0.01em; color: #17140f;
}
#lu-artwork .lu-art-meta {
  margin-top: 7px;
  font-size: 12px; letter-spacing: 0.05em;
  color: #8a8172;
}
#lu-artwork .lu-art-rule {
  width: 34px; height: 2px; border-radius: 2px;
  background: var(--lu-gold); opacity: 0.65; margin: 16px 0 14px;
}
#lu-artwork .lu-art-desc {
  font-size: 13px; line-height: 1.85; color: #4a453c;
  max-height: 38vh; overflow-y: auto;
}
#lu-artwork .lu-art-hint {
  margin-top: 18px;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; letter-spacing: 0.05em; color: #6b6459;
  font-family: var(--lu-font); font-weight: 500;
  background: rgba(95,158,125,0.10);
  border: 1px solid rgba(95,158,125,0.45); border-radius: 999px;
  cursor: pointer;
  padding: 8px 16px; text-align: center;
  transition: background 0.25s ease, color 0.25s ease;
}
#lu-artwork .lu-art-hint:hover { background: var(--lu-gold); color: #17140f; }
#lu-artwork .lu-art-hint .lu-key {
  display: inline-block;
  min-width: 16px; text-align: center;
  margin-right: 7px;
  padding: 1px 6px;
  border: 1px solid var(--lu-gold);
  color: var(--lu-gold);
  font-size: 10px; letter-spacing: 0.04em;
}
/* 터치 기기: 작품 카드를 하단 좌측 미니 캡션으로 이동 — 시점 드래그 존을
   아예 벗어나므로 pointer-events 핵이 불필요. 카드 전체가 '크게 보기' 탭 타깃. */
@media (pointer: coarse) {
  #lu-artwork {
    top: auto; right: auto;
    left: max(12px, env(safe-area-inset-left, 0px));
    bottom: calc(96px + env(safe-area-inset-bottom, 0px));
    width: min(248px, calc(100vw - 104px)); /* 우측 독 폭 회피 */
    padding: 14px 16px 12px;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(20,15,8,0.35);
    transform: translateY(16px); opacity: 0; pointer-events: none;
    transition: transform var(--lu-slide), opacity 0.25s ease;
  }
  #lu-artwork.lu-open { transform: translateY(0); opacity: 1; pointer-events: auto; }
  #lu-artwork .lu-art-eyebrow { font-size: 9px; letter-spacing: 0.3em; margin-bottom: 6px; }
  #lu-artwork .lu-art-title { font-size: 15px; }
  #lu-artwork .lu-art-meta { font-size: 11px; margin-top: 4px; }
  #lu-artwork .lu-art-rule { margin: 10px 0 0; }
  #lu-artwork .lu-art-desc { display: none; } /* 설명은 라이트박스에서 */
  #lu-artwork .lu-art-hint {
    margin-top: 10px; padding: 6px 12px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
    border-radius: 999px;
  }
}

/* ---------------------- 터치 기기: 조작법 접기 + 액션 독 ---------------------- */
#lu-controls.lu-collapsed { display: none; }
#lu-controls-toggle {
  position: fixed; z-index: 520;
  top: calc(10px + env(safe-area-inset-top, 0px));
  left: max(12px, env(safe-area-inset-left, 0px));
  width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  color: rgba(253,251,245,0.9);
  font-family: var(--lu-font); font-weight: 700; font-size: 14px;
  cursor: pointer;
  transition: transform var(--lu-spring), background-color 0.25s ease;
}
#lu-controls-toggle:active {
  transform: scale(0.90); background-color: rgba(253,251,245,0.14);
  transition-duration: 0s;
}
#lu-dock {
  position: fixed; z-index: 520;
  right: max(12px, env(safe-area-inset-right, 0px));
  bottom: calc(108px + env(safe-area-inset-bottom, 0px));
  display: flex; flex-direction: column; gap: 14px;
}
.lu-dock-wrap { filter: drop-shadow(0 4px 14px rgba(10,8,4,0.45)); }
.lu-dock-btn {
  position: relative; overflow: hidden; /* lu-on 노치가 라운드를 넘지 않게 */
  width: 56px; height: 56px; border-radius: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px;
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  color: rgba(253,251,245,0.92);
  font-family: var(--lu-font);
  cursor: pointer;
  transition: transform var(--lu-spring), background-color 0.25s ease,
              border-color 0.25s ease, color 0.25s ease;
}
.lu-dock-btn svg {
  width: 21px; height: 21px; fill: none;
  stroke: currentColor; stroke-width: 1.8;
  stroke-linecap: round; stroke-linejoin: round;
}
.lu-dock-label {
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em; opacity: 0.75;
}
.lu-dock-btn:active {
  transform: scale(0.90);
  background-color: rgba(253,251,245,0.14);
  transition-duration: 0s;
}
/* 주 행동(캡처) — 화면 유일의 골드 면 */
.lu-dock-btn.lu-gold {
  background: linear-gradient(180deg, #6fae8c, #4e8a6a);
  border-color: rgba(199,232,213,0.65);
  box-shadow: inset 0 1px 0 rgba(223,240,228,0.55);
  color: var(--lu-ink);
}
.lu-dock-btn.lu-gold .lu-dock-label { opacity: 1; }
.lu-dock-btn.lu-gold.lu-cap-pop { animation: lu-cap-pop 0.45s ease; }
@keyframes lu-cap-pop {
  0% { transform: scale(0.90); }
  55% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
/* 토글 ON — 골드 헤어라인 + 좌측 노치 (면 채움 금지) */
.lu-dock-btn.lu-on {
  border-color: rgba(95,158,125,0.85);
  color: #8fd0ab;
}
.lu-dock-btn.lu-on::before {
  content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px;
  background: var(--lu-gold);
}
#lu-more-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 640;
  border-radius: 16px 16px 0 0;
  padding: 10px 16px calc(18px + env(safe-area-inset-bottom, 0px));
  background: rgba(23,20,15,0.82);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(95,158,125,0.45); /* 시트 유일 골드 — '열림' 신호 */
  transform: translateY(105%);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
#lu-more-sheet.lu-open { transform: translateY(0); }
.lu-sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(253,251,245,0.28);
  margin: 0 auto 12px;
}
.lu-sheet-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
#lu-more-sheet .lu-sheet-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  min-width: 0; padding: 14px 8px; border-radius: 12px;
  background: rgba(253,251,245,0.06);
  border: 1px solid rgba(253,251,245,0.14);
  color: rgba(253,251,245,0.92); font-family: var(--lu-font);
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer;
  transition: transform var(--lu-spring), background-color 0.2s ease;
}
#lu-more-sheet .lu-sheet-btn svg {
  width: 20px; height: 20px; fill: none;
  stroke: currentColor; stroke-width: 1.8;
  stroke-linecap: round; stroke-linejoin: round;
}
#lu-more-sheet .lu-sheet-btn:active {
  transform: scale(0.94); background-color: rgba(253,251,245,0.14);
  transition-duration: 0s;
}
#lu-more-backdrop {
  position: fixed; inset: 0; z-index: 630;
  background: rgba(10,8,4,0.35);
  opacity: 0; pointer-events: none;
  transition: opacity 0.25s ease;
}
#lu-more-backdrop.lu-open { opacity: 1; pointer-events: auto; }
#lu-lightbox { touch-action: none; }
.lu-lightbox-media { transition: transform 0.08s linear; will-change: transform; }

/* -------------------------------- 라이트박스 -------------------------------- */
#lu-lightbox {
  position: fixed; inset: 0; z-index: 950;
  background: rgba(4,4,5,0.96);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 64px 32px 40px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.32s ease;
}
#lu-lightbox.lu-open {
  opacity: 1; pointer-events: auto;
}
#lu-lightbox-close {
  position: fixed; top: 22px; right: 26px; z-index: 951;
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid rgba(255,255,255,0.25);
  border-radius: 50%;
  color: rgba(255,255,255,0.75);
  font-size: 18px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-lightbox-close:hover {
  border-color: var(--lu-gold); color: var(--lu-gold);
  transform: rotate(90deg);
}
.lu-lightbox-stage {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex; align-items: center; justify-content: center;
  transform: scale(0.97); opacity: 0;
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.36s ease;
}
#lu-lightbox.lu-open .lu-lightbox-stage { transform: scale(1); opacity: 1; }
.lu-lightbox-media {
  /* 스테이지(flex 잔여 공간)를 기준으로 맞춰 캡션을 침범하지 않는다 */
  max-width: 100%; max-height: 100%;
  object-fit: contain;
  box-shadow: 0 30px 90px rgba(0,0,0,0.6);
}
.lu-lightbox-caption {
  flex: 0 0 auto;
  width: 100%; max-width: 640px;
  margin-top: 26px;
  text-align: center;
}
.lu-lightbox-title {
  font-size: 25px; font-weight: 600; line-height: 1.35;
  letter-spacing: -0.01em;
  color: #fff;
}
.lu-lightbox-caption::before {
  content: '';
  display: block;
  width: 34px; height: 2px; margin: 0 auto 16px;
  background: var(--lu-gold); border-radius: 2px; opacity: 0.8;
}
.lu-lightbox-meta {
  margin-top: 8px;
  font-size: 12px; letter-spacing: 0.12em;
  color: var(--lu-gold);
}
.lu-lightbox-rule {
  width: 28px; height: 1px; background: rgba(255,255,255,0.2);
  margin: 18px auto;
}
.lu-lightbox-desc {
  font-size: 13px; line-height: 1.85;
  color: rgba(255,255,255,0.55);
  max-height: 16vh; overflow-y: auto;
}
.lu-lightbox-desc:empty { display: none; }

/* ----------------------------- 작품 목록 패널 ----------------------------- */
#lu-artlist {
  position: fixed; z-index: 650;
  top: 0; right: 0; bottom: 0;
  width: min(340px, calc(100vw - 24px));
  background: rgba(255,255,255,0.97);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  color: #111;
  box-shadow: -18px 0 50px rgba(0,0,0,0.28);
  transform: translateX(105%);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex; flex-direction: column;
}
#lu-artlist.lu-open { transform: translateX(0); }
#lu-artlist-head {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 24px 16px;
  border-bottom: 1px solid #eee;
}
#lu-artlist-title {
  font-size: 13px; letter-spacing: 0.28em; text-indent: 0.28em;
  color: #111;
}
#lu-artlist-close {
  flex: 0 0 auto;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid #ddd; border-radius: 50%;
  color: #999; font-size: 15px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-artlist-close:hover { border-color: var(--lu-gold); color: var(--lu-gold); transform: rotate(90deg); }
#lu-artlist-body {
  flex: 1 1 auto; min-height: 0;
  overflow-y: auto;
}
.lu-artlist-card {
  display: flex; align-items: center; gap: 14px;
  width: 100%; text-align: left;
  font-family: var(--lu-font); font-weight: 300;
  background: transparent; border: none; border-bottom: 1px solid #f0f0ee;
  padding: 14px 24px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.lu-artlist-card:hover { background: #f6f3ea; }
.lu-artlist-thumb {
  flex: 0 0 auto;
  width: 56px; height: 56px; object-fit: cover;
  background: #eee;
}
.lu-artlist-info { min-width: 0; }
.lu-artlist-name {
  font-size: 13px; color: #111;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lu-artlist-artist {
  margin-top: 4px;
  font-size: 11px; letter-spacing: 0.04em; color: #999;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lu-artlist-empty {
  padding: 40px 24px; text-align: center;
  font-size: 12px; color: #aaa;
}

/* ------------------------------- 방명록 패널 ------------------------------- */
/* 작품 목록 패널과 대칭 — 화면 왼쪽에서 슬라이드-인 */
#lu-guestbook {
  position: fixed; z-index: 650;
  top: 0; left: 0; bottom: 0;
  width: min(340px, calc(100vw - 24px));
  overflow: visible; /* 책갈피 탭이 패널 오른쪽 바깥으로 나온다 */
  background: linear-gradient(180deg, #fdfbf5 0%, #f6f1e4 100%);
  color: #1c1a16;
  box-shadow: 18px 0 50px rgba(20,15,8,0.28);
  transform: translateX(-100%); /* 닫혀도 책갈피 탭은 화면에 남는다 */
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex; flex-direction: column;
}
#lu-guestbook.lu-open { transform: translateX(0); }

/* 책갈피 탭 — 패널 오른쪽 가장자리에 붙어 함께 미끄러진다 */
#lu-gbtab {
  /* 다크 유리 + 골드 라인 책갈피 — 감독 픽 (종이 재질 실험은 회귀) */
  position: absolute;
  right: -33px; top: max(20%, calc(env(safe-area-inset-top, 0px) + 72px));
  writing-mode: vertical-rl;
  padding: 15px 8px 15px 6px;
  background: rgba(10,10,12,0.72);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.16);
  border-left: 2px solid var(--lu-gold);
  border-radius: 0 9px 9px 0;
  color: rgba(255,255,255,0.92);
  font-family: var(--lu-font); font-weight: 300;
  font-size: 12px; letter-spacing: 0.3em;
  cursor: pointer;
  opacity: 0; pointer-events: none;
  transition: opacity 0.6s ease, color 0.25s ease, transform var(--lu-spring);
}
#lu-gbtab.lu-visible { opacity: 1; pointer-events: auto; }
#lu-gbtab:hover { color: var(--lu-gold); }
#lu-gbtab:active { transform: translateX(2px); transition-duration: 0s; }
#lu-guestbook-head {
  flex: 0 0 auto;
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(95,158,125,0.35);
}
#lu-guestbook-title .lu-gb-eyebrow {
  display: block;
  font-size: 9.5px; letter-spacing: 0.34em; color: #3f7a5c;
  margin-bottom: 6px;
}
#lu-guestbook-title .lu-gb-main {
  display: block;
  font-size: 20px; font-weight: 600; letter-spacing: -0.01em; color: #17140f;
}
#lu-guestbook-title .lu-gb-sub {
  display: block;
  margin-top: 5px;
  font-size: 11.5px; color: #8a8172; letter-spacing: 0.03em;
}
#lu-guestbook-close {
  flex: 0 0 auto;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid #ddd; border-radius: 50%;
  color: #999; font-size: 15px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-guestbook-close:hover { border-color: var(--lu-gold); color: var(--lu-gold); transform: rotate(90deg); }
#lu-guestbook-body {
  flex: 1 1 auto; min-height: 0;
  overflow-y: auto;
}
.lu-gbook-note {
  /* 방명록 한 장 — 종이 카드 + 큰따옴표 워터마크 */
  position: relative;
  margin: 12px 16px 0;
  padding: 14px 16px 14px 18px;
  background: #fffefb;
  border: 1px solid #efe8d6;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(31,26,18,0.05);
}
.lu-gbook-note::before {
  content: '“';
  position: absolute; top: 2px; right: 12px;
  font-size: 34px; line-height: 1; color: rgba(95,158,125,0.28);
  font-family: Georgia, serif;
}
#lu-guestbook-body > .lu-gbook-note:last-child { margin-bottom: 14px; }
.lu-gbook-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  margin-right: 7px; vertical-align: 1px;
}
.lu-gbook-name { font-size: 12.5px; font-weight: 600; color: #3f3a30; }
.lu-gbook-time {
  margin-left: 8px;
  font-size: 10px; letter-spacing: 0.04em; color: #b3ab99;
}
.lu-gbook-text {
  margin-top: 7px;
  font-size: 13px; line-height: 1.7; color: #4a453c;
  word-break: break-word; white-space: pre-wrap;
}
.lu-gbook-empty {
  margin: 20px 16px; padding: 36px 20px; text-align: center;
  font-size: 12.5px; line-height: 1.8; color: #a89f8c;
  border: 1px dashed #ddd3ba; border-radius: 12px;
}
#lu-guestbook-footer {
  flex: 0 0 auto;
  padding: 14px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(95,158,125,0.30);
  background: rgba(255,254,251,0.7);
}
#lu-gbook-input {
  width: 100%; resize: none;
  font-family: var(--lu-font); font-weight: 400;
  font-size: 13px; color: #1c1a16;
  background: #fffefb;
  border: 1px solid #e5dcc4;
  padding: 11px 13px; outline: none;
  border-radius: 12px;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
#lu-gbook-input::placeholder { color: #b3ab99; }
#lu-gbook-input:focus { border-color: var(--lu-gold); box-shadow: 0 0 0 3px rgba(95,158,125,0.15); }
.lu-gbook-footer-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 10px;
}
.lu-gbook-count {
  font-size: 10px; letter-spacing: 0.04em; color: #bbb;
}
#lu-gbook-submit {
  font-family: var(--lu-font); font-weight: 600;
  font-size: 12.5px; letter-spacing: 0.06em;
  color: #17140f;
  background: var(--lu-gold);
  border: 1px solid var(--lu-gold); border-radius: 999px;
  padding: 9px 22px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  box-shadow: 0 3px 12px rgba(95,158,125,0.35);
}
#lu-gbook-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(95,158,125,0.45); }
#lu-gbook-submit:disabled {
  background: transparent; color: #b3ab99;
  border-color: #ddd3ba; box-shadow: none; cursor: default;
}
#lu-gbook-submit:hover { background: var(--lu-gold); border-color: var(--lu-gold); color: #111; }
#lu-gbook-submit:disabled { opacity: 0.35; cursor: default; }
#lu-gbook-submit:disabled:hover { background: #111; border-color: #111; color: #fff; }

/* -------------------------------- 투어 바 -------------------------------- */
#lu-tourbar {
  position: fixed; z-index: 500;
  bottom: 78px; left: 50%;
  display: flex; align-items: center; gap: 16px;
  background: rgba(10,10,12,0.6);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  padding: 11px 24px;
  border-top: 2px solid var(--lu-gold);
  font-size: 12px; letter-spacing: 0.05em;
  color: rgba(255,255,255,0.85);
  max-width: min(90vw, 640px);
  opacity: 0; pointer-events: none;
  transform: translate(-50%, 16px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  white-space: nowrap;
}
#lu-tourbar.lu-open { opacity: 1; pointer-events: auto; transform: translate(-50%, 0); }
#lu-tourbar button {
  font-family: var(--lu-font); font-weight: 300;
  font-size: 12px; letter-spacing: 0.03em;
  color: rgba(255,255,255,0.85);
  background: transparent; border: none;
  cursor: pointer; padding: 4px 2px;
  transition: color 0.2s ease;
}
#lu-tourbar button:hover { color: var(--lu-gold); }
.lu-tour-sep {
  flex: 0 0 auto;
  width: 1px; height: 14px; background: rgba(255,255,255,0.2);
}
.lu-tour-count { color: var(--lu-gold); }
.lu-tour-title {
  display: inline-block;
  max-width: 220px; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; vertical-align: bottom;
  color: rgba(255,255,255,0.85);
}
#lu-tourbar .lu-tour-auto.lu-tour-on { color: var(--lu-gold); }
#lu-tourbar-exit { color: rgba(255,255,255,0.6); }
#lu-tourbar-exit:hover { color: var(--lu-gold); }

/* ------------------------------- 셔터 플래시 ------------------------------- */
/* 포토 모드(P키) 캡처 순간 흰 플래시 — flashShutter()가 opacity를 직접 제어한다 */
#lu-shutter {
  position: fixed; inset: 0; z-index: 970;
  background: #fff;
  opacity: 0; pointer-events: none;
}

/* -------------------------------- 공유 모달 -------------------------------- */
#lu-share {
  position: fixed; inset: 0; z-index: 980;
  background: rgba(4,4,5,0.96);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
}
#lu-share.lu-open { opacity: 1; pointer-events: auto; }
.lu-share-card {
  position: relative;
  width: 100%; max-width: 460px;
  max-height: 92vh; overflow-y: auto;
  background: rgba(255,255,255,0.97);
  color: #111;
  padding: 26px 24px 22px;
  box-shadow: 0 30px 90px rgba(0,0,0,0.5);
  text-align: center;
  transform: scale(0.97); opacity: 0;
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease;
}
#lu-share.lu-open .lu-share-card { transform: scale(1); opacity: 1; }
#lu-share-close {
  position: absolute; top: 14px; right: 14px;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid #ddd; border-radius: 50%;
  color: #999; font-size: 15px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-share-close:hover { border-color: var(--lu-gold); color: var(--lu-gold); transform: rotate(90deg); }
.lu-share-title {
  font-size: 13px; letter-spacing: 0.28em; text-indent: 0.28em;
  color: #111; margin-bottom: 18px;
}
.lu-share-preview {
  display: block;
  max-width: 100%; max-height: 55vh;
  margin: 0 auto;
  object-fit: contain;
  border: 1px solid #eee;
  background: #f4f4f2;
}
.lu-share-actions {
  display: flex; flex-direction: column; gap: 8px;
  margin-top: 20px;
}
.lu-share-btn {
  width: 100%;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 13px; letter-spacing: 0.04em;
  color: #222; background: transparent;
  border: 1px solid rgba(0,0,0,0.18);
  border-radius: 3px;
  padding: 11px 16px; cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, color 0.25s ease;
}
.lu-share-btn:hover { border-color: rgba(0,0,0,0.45); }
.lu-share-btn-primary {
  background: var(--lu-gold); border-color: var(--lu-gold); color: #111;
}
.lu-share-btn-primary:hover { background: #c4a02f; border-color: #c4a02f; }
.lu-share-btn-copied { border-color: var(--lu-gold); color: var(--lu-gold); }
.lu-share-hint {
  margin-top: 16px;
  font-size: 10px; letter-spacing: 0.02em; line-height: 1.6;
  color: #b0aca4;
}

/* ------------------------------- 모바일 ------------------------------- */
@media (max-width: 640px) {
  .lu-lobby-card { padding: 34px 22px 26px; }
  .lu-lobby-title { font-size: 19px; }
  #lu-controls { font-size: 11px; padding: 10px 12px; }
  #lu-controls .lu-key { min-width: 60px; }
  #lu-chat { width: calc(100vw - 24px); left: 12px; bottom: 12px; }
  #lu-chat-log { max-height: 130px; }
  #lu-status { font-size: 11px; padding: 6px 14px; }
  #lu-topbar { max-width: 72vw; padding: 0 12px; }
  .lu-topbar-title { font-size: 10px; letter-spacing: 0.2em; text-indent: 0.2em; }
  #lu-lightbox { padding: 56px 18px 28px; }
  #lu-lightbox-close { top: 14px; right: 14px; width: 36px; height: 36px; font-size: 16px; }
  .lu-lightbox-media { max-width: 100%; max-height: 100%; }
  .lu-lightbox-title { font-size: 19px; }
  .lu-lightbox-caption { margin-top: 18px; }
  #lu-artlist { width: calc(100vw - 24px); }
  #lu-artlist-head { padding: 18px 18px 14px; }
  .lu-artlist-card { padding: 12px 18px; gap: 12px; }
  #lu-guestbook { width: calc(100vw - 24px); }
  #lu-guestbook-head { padding: 18px 18px 14px; }
  .lu-gbook-note { padding: 12px 18px; }
  #lu-guestbook-footer { padding: 14px 18px 16px; }
  #lu-tourbar {
    bottom: 92px; padding: 9px 14px; gap: 10px;
    font-size: 11px; max-width: calc(100vw - 20px);
  }
  .lu-tour-title { max-width: 110px; }
  .lu-share-card { padding: 20px 16px 18px; max-width: calc(100vw - 24px); }
  .lu-share-preview { max-height: 42vh; }
}

/* --------------------- 아바타 커스터마이저: 모바일(세로 스택) --------------------- */
@media (max-width: 720px) {
  #lu-avatar-maker, #lu-chibi-maker { padding: 8px; }
  /* 모바일 스크롤 — 카드 전체가 하나로 세로 스크롤한다(감독: 위아래로 화면 전체가 움직이고
     저장 칸까지 밀려 사라지게). head만 상단 sticky로 고정(닫기 버튼 항상 접근), 프리뷰·옵션·
     footer(저장 칸)는 흐름에 실려 함께 스크롤된다. dvh 폴백은 iOS 주소창 vh 문제(hotfix #12). */
  .lu-am-card {
    max-width: 96vw; max-height: 92vh; max-height: 92dvh; border-radius: 24px;
    /* -webkit-overflow-scrolling:touch 제거 — iOS Safari에서 이 레거시 플래그가 스크롤러를
       별도 레이어로 승격해 sticky 헤더 z-index를 무시(콘텐츠가 헤더 위로 새고 깜빡). iOS 13+는
       overflow:auto에 관성 스크롤 기본 제공이라 제거해도 관성 유지. */
    overflow-y: auto; overscroll-behavior: contain;
  }
  .lu-am-head {
    padding: 14px 16px 12px;
    position: sticky; top: 0; z-index: 20; background: var(--am-cream);  /* 불투명 배경, 뒤 비침 방지 */
    /* iOS Safari sticky 깜빡 방지 — 헤더를 자체 컴포지터 레이어로 승격해 관성 스크롤 중에도 콘텐츠
       위에 안정적으로 고정한다. sticky containing block은 스크롤 조상(카드)이라 자기 transform은
       고정 동작을 안 깬다. z-index 20으로 프리셋 칩 스택보다 확실히 위. */
    transform: translateZ(0);
    -webkit-backface-visibility: hidden;
    box-shadow: 0 6px 10px -4px rgba(40,30,10,0.22);  /* 아래 메뉴와 뚜렷이 분리(감독 "완벽 분리") */
  }
  /* 프리뷰(큰 캐릭터) 위, 옵션 패널 아래로 세로 쌓기. body는 자연 높이(flex 0 0)라 스크롤은
     카드가 담당 — 이중 스크롤 없음. 캐릭터는 그 자리에서 혼자 신나게 움직인다(자동 연기). */
  .lu-am-body {
    flex: 0 0 auto; flex-direction: column; gap: 14px; padding: 12px 14px 4px;
    overflow: visible;
    position: relative; z-index: 0;  /* 헤더(z20) 아래로 못박아 칩이 transform 컨텍스트가 돼도 위로 안 새게 */
  }
  .lu-am-preview { width: auto; max-width: none; align-self: center; padding: 12px; }
  .lu-am-stagewrap { width: 200px; height: 267px; max-width: none; margin: 0 auto; }
  /* 패널은 자연 높이(스크롤은 body가 담당) — 탭 내비는 가로 스크롤로 한 줄 유지 */
  .lu-am-panel { flex: 0 0 auto; }
  .lu-am-nav { margin-bottom: 12px; padding: 4px 0 10px; }
  .lu-am-navtab { min-width: 52px; font-size: 10px; padding: 7px 10px 6px; }
  .lu-am-navtab svg { width: 18px; height: 18px; }
  .lu-am-tabpage { flex: 0 0 auto; overflow: visible; max-height: none; }
  /* footer(로그인 게이트) 컴팩트 */
  .lu-am-footer { padding: 10px 14px 12px; }
  .lu-am-guest-gate { margin-bottom: 6px; }
  .lu-am-gate-note { font-size: 10.5px; line-height: 1.35; margin-bottom: 6px; }
  .lu-am-signup-providers { flex-direction: row; flex-wrap: wrap; gap: 6px; }
  .lu-am-social { flex: 1 1 auto; min-width: 0; padding: 9px 8px; font-size: 10.5px; justify-content: center; }
  .lu-am-btn { padding: 10px 16px; font-size: 12px; }
}
/* 초소형 폭(320px대) — 무대 살짝 축소해 가로 넘침 방지. */
@media (max-width: 360px) {
  .lu-am-stagewrap { width: 168px; height: 224px; }
}
`,e=document.createElement("style");e.id="lu-styles",e.textContent=t,document.head.appendChild(e)}function i(t,e={},o=[]){const a=document.createElement(t);for(const[n,r]of Object.entries(e))n==="className"?a.className=r:n==="text"?a.textContent=r:a.setAttribute(n,r);for(const n of o)a.appendChild(n);return a}const vi="lu-chibi-look::",wi="lu-chibi-thumb::",ki="lu-chibi-closet::",Ci="lu-chibi-look-v1",Ei="lu-chibi-look-thumb-v1",Xo=12;function je(){const t=vt();return t&&t.provider&&t.name?`${t.provider}:${t.name}`:"guest"}function Ae(t){return vi+(t||je())}function yo(t){return wi+(t||je())}function va(t){return ki+(t||je())}function Si(){try{const t=localStorage.getItem(Ci);if(t&&!localStorage.getItem(Ae("guest"))){localStorage.setItem(Ae("guest"),t);const e=localStorage.getItem(Ei);e&&localStorage.setItem(yo("guest"),e)}}catch{}}Si();function wa(t){try{const e=localStorage.getItem(Ae(t));if(!e)return null;const o=JSON.parse(e);return o&&typeof o=="object"?o:null}catch{return null}}function Li(t,e){try{return localStorage.setItem(Ae(e),JSON.stringify(t)),!0}catch{return!1}}function Fo(t){try{return localStorage.getItem(yo(t))||""}catch{return""}}function Mi(t,e){try{localStorage.setItem(yo(e),t)}catch{}}let vo=null;function Ti(t){vo=t}function ka(){return vo||wa()}xa(()=>{vo=null});function Ge(t){try{const e=localStorage.getItem(va(t));if(!e)return[];const o=JSON.parse(e);return Array.isArray(o)?o:[]}catch{return[]}}function Go(t,e){try{return localStorage.setItem(va(e),JSON.stringify(t)),!0}catch{return!1}}function Ni(t,e,o){try{const a=document.createElement("canvas");return a.width=e,a.height=o,a.getContext("2d").drawImage(t,0,0,e,o),a.toDataURL("image/jpeg",.72)}catch{return""}}let F=null,V=null,jt=null,he=0,be=!1,$e=0,ge=0,We=Math.PI;const _i=st.degToRad(18),zi=.6,$o='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 19.5C4.5 10 11 4 20 4c0 9-6 15.5-15.5 15.5A1 1 0 0 1 4.5 19.5Z"/><path d="M6.7 17.3C10.2 13.3 14.2 9.3 18 5.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>',Ai=[{id:"species",label:"종족",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8.3" r="2.1"/><circle cx="12" cy="6.1" r="2.1"/><circle cx="17" cy="8.3" r="2.1"/><path d="M12 11.6c-3.4 0-6.1 2.4-6.1 5.2 0 2 1.8 3.3 3.7 2.6.9-.3 1.7-.3 2.6 0 1.9.7 3.7-.6 3.7-2.6 0-2.8-2.5-5.2-5.9-5.2Z"/></svg>'},{id:"face",label:"얼굴",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><path d="M8.6 14.6c1 1.1 2.1 1.7 3.4 1.7s2.4-.6 3.4-1.7"/></svg>'},{id:"hair",label:"헤어",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12.5C5 8 8.1 4.5 12 4.5s7 3.5 7 8"/><path d="M6.3 12.5v3.2M10.1 12.5v4.2M13.9 12.5v4.2M17.7 12.5v3.2"/></svg>'},{id:"outfit",label:"의상",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8.3 4.2 4.3 7.3l2 3 2-1.1v9.6h7.4V9.2l2 1.1 2-3-4-3.1c-.7 1-1.8 1.6-3.7 1.6s-3-.6-3.7-1.6Z"/></svg>'},{id:"acc",label:"장식",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.5 3.5 1.7 6.3 5.2 7.6-3.5 1.3-4.7 4.1-5.2 7.6-.5-3.5-1.7-6.3-5.2-7.6C10.3 9.3 11.5 6.5 12 3Z"/><circle cx="19" cy="5.2" r="1.2"/></svg>'},{id:"closet",label:"옷장",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.3"/><path d="M12 5.9v1.8"/><path d="M12 7.7 4.3 13.4h15.4L12 7.7Z"/><path d="M4.3 17.4h15.4"/></svg>'}];function Ii(t){const{els:e,state:o,callbacks:a,setStatus:n}=t,r=i("button",{id:"lu-am-save",type:"button","aria-label":"이 캐릭터 사용",title:"이 캐릭터 사용",text:"✓"}),l=i("button",{id:"lu-am-close",type:"button","aria-label":"닫기",text:"×"}),s=i("span",{className:"lu-am-title-icon","aria-hidden":"true"});s.innerHTML=$o;const c=i("div",{className:"lu-am-title"},[s,i("span",{text:"캐릭터 디자인"})]),u=i("div",{className:"lu-am-head-actions"},[r,l]),x=i("div",{className:"lu-am-head"},[c,u]),f=i("canvas",{width:"300",height:"400"}),g=i("div",{className:"lu-am-stage"},[f]),T=i("div",{className:"lu-am-stagewrap"},[g]),w=i("div",{className:"lu-am-preview"},[T]),E=["wave","jump","clap","dance","breakdance","run","jumpingjack","heart","kick"];let I=1,b=null,m=null,O=null,B=null;function $(p,y){if(typeof document>"u")return null;const h=document.createElement("canvas");h.width=2,h.height=256;const k=h.getContext("2d"),v=k.createLinearGradient(0,0,0,256);v.addColorStop(0,p),v.addColorStop(1,y),k.fillStyle=v,k.fillRect(0,0,2,256);const z=new _e(h);return z.colorSpace=Ut,z}function S(p,y){if(typeof document>"u")return null;const h=512,k=307,v=document.createElement("canvas");v.width=h,v.height=k;const z=v.getContext("2d");z.fillStyle=p,z.fillRect(0,0,h,k);const it=28,mt=h/it;z.fillStyle=y;for(let Vt=0;Vt<it;Vt++)z.fillRect(Vt*mt,0,mt/2,k);const Kt=new _e(v);return Kt.colorSpace=Ut,Kt.anisotropy=4,Kt}function W(){if(b)return;b=new la({canvas:f,antialias:!0,alpha:!0}),b.setPixelRatio(Math.min(2,typeof window<"u"&&window.devicePixelRatio||1)),b.setSize(300,400,!1),b.shadowMap.enabled=!0,b.shadowMap.type=cn,b.toneMapping=sa,b.toneMappingExposure=1,b.outputColorSpace=Ut,m=new ca,m.background=$("#f0ead9","#ddd2bd")||new dn("#ddd2bd"),m.fog=new un(14603199,5.5,10),O=new da(30,300/400,.1,20),O.position.set(0,1,4),O.lookAt(0,.85,0),m.add(new pn(16775924,2367256,.65));const p=new He(16777215,1.4);p.position.set(.7,2,2.6),m.add(p);const y=new He(16776696,.4);y.position.set(-1.8,1.1,1.6),m.add(y);const h=new He(16777215,0);h.position.set(.4,5,1),h.castShadow=!0,h.shadow.mapSize.set(512,512),h.shadow.camera.near=.5,h.shadow.camera.far=9,h.shadow.camera.left=-1.3,h.shadow.camera.right=1.3,h.shadow.camera.top=1.3,h.shadow.camera.bottom=-1.3,h.shadow.radius=35,h.shadow.blurSamples=24,h.shadow.bias=-5e-4,m.add(h),m.add(h.target);const k=new Ht(new oe(6,6),new eo({color:12165231,roughness:.9,metalness:0}));k.rotation.x=-Math.PI/2,k.position.y=0,k.receiveShadow=!0,m.add(k);const v=new Ht(new oe(6,6),new fn({opacity:.3}));v.rotation.x=-Math.PI/2,v.position.y=.002,v.material.polygonOffset=!0,v.material.polygonOffsetFactor=-1,v.receiveShadow=!0,m.add(v);const z=S("#e2d7bf","#efe7d3"),it=new Ht(new oe(10,6),new eo({map:z,roughness:.9,metalness:0}));it.position.set(0,2.2,-2.3),m.add(it),B=new ua,B.rotation.y=Math.PI,m.add(B)}let _="species";const Z=i("div",{className:"lu-am-nav",role:"tablist","aria-label":"캐릭터 디자인 카테고리"}),ot=i("div",{className:"lu-am-panel"}),U=i("div",{className:"lu-am-tabpage",id:"lu-am-tabpanel",role:"tabpanel",tabindex:"0"});ot.appendChild(Z),ot.appendChild(U),Z.addEventListener("keydown",p=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(p.key))return;const y=[...Z.querySelectorAll(".lu-am-navtab")];if(!y.length)return;const h=y.findIndex(z=>z.getAttribute("aria-selected")==="true");let k=h<0?0:h;p.key==="ArrowLeft"?k=(h-1+y.length)%y.length:p.key==="ArrowRight"?k=(h+1)%y.length:p.key==="Home"?k=0:p.key==="End"&&(k=y.length-1),p.preventDefault(),y[k].click();const v=Z.querySelectorAll(".lu-am-navtab")[k];v&&v.focus()});const M=i("div",{className:"lu-am-body"},[w,ot]),X=i("div",{className:"lu-am-card"},[x,M]),D=i("div",{id:"lu-chibi-maker",className:"lu"},[X]);document.body.appendChild(D);function lt(p,y){F&&(F[p]=y,p==="species"&&y!=="human"&&Oo[y]&&Object.assign(F,Oo[y]),F=Xe(F),Ue(),Dt())}function xt(p){F=Xe(Object.assign({},p)),Ue(),Dt()}function le(){for(const p of Rn){const y=Pn.filter(k=>(k.cat||"human")===p.id);if(!y.length)continue;U.appendChild(i("div",{className:"lu-am-section-title",text:`${p.name} (${y.length})`}));const h=i("div",{className:"lu-am-tabs lu-am-presets"});for(const k of y){const v=i("button",{type:"button",className:"lu-am-tab lu-am-preset"}),z=k.look.skin||Le.skin,it=k.look.top||k.look.hairColor||Le.top,mt=i("span",{className:"lu-am-preset-dot","aria-hidden":"true"});mt.style.background=`conic-gradient(${z} 0deg 180deg, ${it} 180deg 360deg)`,v.appendChild(mt),v.appendChild(i("span",{className:"lu-am-preset-label",text:k.name})),v.addEventListener("click",()=>xt(k.look)),h.appendChild(v)}U.appendChild(h)}}function No(p){const y=Ro.find(h=>h.id===p);return y&&y.name||"아야모"}function en(){if(!vt())return;const p=je();Et("내 옷장");const y=i("button",{type:"button",className:"lu-am-btn lu-closet-save",text:"＋ 지금 모습 옷장에 저장"});y.addEventListener("click",()=>{const v=Ge(p);if(v.length>=Xo){n(`옷장은 최대 ${Xo}벌까지 저장할 수 있어요`);return}const z={id:"c"+Date.now(),name:No(F.species),look:JSON.parse(JSON.stringify(F)),thumb:Ao(120,160),ts:Date.now()};if(v.push(z),!Go(v,p)){n("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요");return}Dt()}),U.appendChild(y);const h=Ge(p);if(!h.length){U.appendChild(i("div",{className:"lu-closet-empty",text:"아직 저장한 옷이 없어요. 마음에 드는 모습을 저장해 두세요."}));return}const k=i("div",{className:"lu-closet-grid"});h.forEach(v=>{const z=i("div",{className:"lu-closet-cell"}),it=i("button",{type:"button",className:"lu-closet-load",title:`${v.name} 불러오기`,"aria-label":`${v.name} 불러오기`});v.thumb&&(it.style.backgroundImage=`url('${v.thumb}')`),it.appendChild(i("span",{className:"lu-closet-name",text:v.name})),it.addEventListener("click",()=>xt(v.look));const mt=i("button",{type:"button",className:"lu-closet-del",text:"×",title:"삭제","aria-label":`${v.name} 삭제`});mt.addEventListener("click",Kt=>{Kt.stopPropagation();const Vt=Ge(p).filter(sn=>sn.id!==v.id);Go(Vt,p),Dt()}),z.appendChild(it),z.appendChild(mt),k.appendChild(z)}),U.appendChild(k)}const Wt=(p,y)=>[{id:!1,name:p},{id:!0,name:y}];function K(p,y,h){U.appendChild(i("div",{className:"lu-am-section-title",text:p}));const k=i("div",{className:"lu-am-tabs"});y.forEach(v=>{const z=i("button",{type:"button",className:"lu-am-tab"+(F[h]===v.id?" lu-selected":""),text:v.name});z.addEventListener("click",()=>lt(h,v.id)),k.appendChild(z)}),U.appendChild(k)}function Ct(p,y,h){U.appendChild(i("div",{className:"lu-am-section-title",text:p}));const k=i("div",{className:"lu-swatches"});y.forEach(v=>{const z=i("button",{type:"button",className:"lu-swatch"+(F[h]===v?" lu-selected":""),style:`background:${v};`,title:v,"aria-label":`${p} ${v}`});z.addEventListener("click",()=>lt(h,v)),k.appendChild(z)}),U.appendChild(k)}function Et(p){const y=i("div",{className:"lu-am-group-title"}),h=i("span",{className:"lu-am-group-icon","aria-hidden":"true"});h.innerHTML=$o,y.appendChild(h),y.appendChild(i("span",{text:p})),U.appendChild(y)}function on(){Z.textContent="";const p=!!vt(),y=Ai.filter(h=>h.id!=="closet"||p);y.some(h=>h.id===_)||(_="species"),y.forEach(h=>{const k=_===h.id,v=i("button",{type:"button",role:"tab",id:"lu-am-tab-"+h.id,className:"lu-am-navtab"+(k?" lu-selected":""),"aria-selected":k?"true":"false","aria-controls":"lu-am-tabpanel",tabindex:k?"0":"-1","aria-label":h.label});v.innerHTML=h.icon,v.appendChild(i("span",{className:"lu-am-navtab-label",text:h.label})),v.addEventListener("click",()=>{_!==h.id&&(_=h.id,Dt(),U.scrollTop=0)}),Z.appendChild(v)}),U.setAttribute("aria-labelledby","lu-am-tab-"+_)}function Dt(){if(on(),U.textContent="",!F)return;const p=F.species&&F.species!=="human";_==="species"?(le(),Et(p?"종족 · 털색":"종족 · 성별 · 피부색"),K("종족",Ro,"species"),p||K("성별",Bn,"gender"),Ct(p?"털 색":"피부색",Dn,"skin")):_==="face"?(Et("얼굴"),K("얼굴형",jn,"face"),K("눈",Yn,"eyeStyle"),K("입",Un,"mouth"),p||K("수염",Hn,"beardStyle"),K("볼터치",Wt("없음","있음"),"blush"),Ct("눈동자 색",Xn,"eyeColor")):_==="hair"?p?(Et("포인트"),Ct("귀·꼬리 색",Po,"hairColor")):(Et("헤어"),K("헤어",Fn,"hairStyle"),Ct("머리 색",Po,"hairColor")):_==="outfit"?(Et("의상"),K("상의 패턴",Gn,"pattern"),K("의상 세트",$n,"outfit"),K("하의",Wn,"bottomType"),Ct("상의 색",Fe,"top"),Ct("하의 색",Fe,"bottom"),Ct("신발 색",Fe,"shoes")):_==="acc"?(Et("장식"),K("머리 장식",Kn,"acc"),K("안경",Wt("없음","착용"),"glasses"),K("헤일로",Wt("없음","있음"),"halo"),K("날개",Wt("없음","있음"),"wings"),K("가슴 하트",Wt("없음","있음"),"heart")):_==="closet"&&en()}function Ue(){!F||!B||(V&&(B.remove(V.group),V.dispose(),V=null),V=mo(ao(F),ya," ",{blobShadow:!1}),V.group.traverse(p=>{p.isMesh&&(p.castShadow=!0)}),B.add(V.group))}function _o(p){jt=requestAnimationFrame(_o);const y=he?(p-he)/1e3:0,h=Math.min(.1,y);if(he=p,!be&&(ge+=h,B.rotation.y=We+Math.sin(ge*zi)*_i,I-=y,I<=0&&V&&typeof V.playAction=="function")){const k=E[Math.floor(Math.random()*E.length)];V.playAction(k),I=(Vn[k]||1.5)+.6+Math.random()*.9}V&&V.update(h,0),b.render(m,O)}function an(){jt||(he=0,jt=requestAnimationFrame(_o))}function nn(){jt&&cancelAnimationFrame(jt),jt=null}f.addEventListener("pointerdown",p=>{be=!0,$e=p.clientX,w.classList.add("lu-dragging"),f.setPointerCapture(p.pointerId)}),f.addEventListener("pointermove",p=>{be&&(B.rotation.y+=(p.clientX-$e)*.012,$e=p.clientX)});const zo=()=>{be=!1,w.classList.remove("lu-dragging"),We=B.rotation.y,ge=0};f.addEventListener("pointerup",zo),f.addEventListener("pointercancel",zo),l.addEventListener("click",()=>se()),D.addEventListener("click",p=>{p.target===D&&se()});function Ao(p,y){try{return b?(b.render(m,O),Ni(f,p,y)||b.domElement.toDataURL("image/png")):""}catch{return""}}function rn(){const y=!!vt()?"저장하고 사용":"이 캐릭터 사용";r.setAttribute("aria-label",y),r.title=y}r.addEventListener("click",()=>{if(!F)return;const p=JSON.parse(JSON.stringify(F));Ti(p);const y=!!vt();if(y){const h=Li(p),k=Ao(150,200);k&&Mi(k),h||n("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요")}e&&e.lobby&&e.lobby.onChibiSaved(),o.entered&&typeof a.onAvatarChange=="function"&&a.onAvatarChange(ao(p)),y||n("이 캐릭터로 적용했어요 · 회원가입하면 저장돼요"),se()});function ln(){_="species",F=Xe(Object.assign({},Le,ka()||{})),rn(),W(),B.rotation.y=Math.PI,We=Math.PI,ge=0,I=1,Ue(),Dt(),D.classList.add("lu-open"),o.chibiOpen=!0,an(),typeof a.onMakerToggle=="function"&&a.onMakerToggle(!0)}function se(){D.classList.remove("lu-open"),o.chibiOpen=!1,nn(),V&&(B.remove(V.group),V.dispose(),V=null),typeof a.onMakerToggle=="function"&&a.onMakerToggle(!1)}return{open:ln,close:se}}const Oi=8,xe=12;let d=null,G={onEnter:null,onChatSend:null,onAvatarChange:null,onMakerToggle:null},Wo=oo[0];const Xt={chibiOpen:!1,entered:!1};let io=null,Ko=!1,At=!1,ro=null,Nt=null,It=!1,lo=null,Ot=!1,so=null,Ie=null;const me=120;let ft={onPrev:null,onNext:null,onExit:null,onToggleAuto:null};const Rt=typeof window<"u"&&"ontouchstart"in window||typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches;let ct={onTour:null,onViewArtwork:null,onGuestbook:null,onCapture:null,onSelfView:null},Pt=!1,J={blob:null,dataUrl:"",galleryName:"",shareUrl:""},_t=null,Oe=null,wt=null,Re=null;function Ri(){const t=i("div",{id:"lu-loading",className:"lu"},[i("div",{className:"lu-spinner"}),i("div",{className:"lu-loading-text",text:"MUSEUM LOADING..."})]);return document.body.appendChild(t),t}function Pi(){const t=i("div",{className:"lu-lobby-title",text:"OpenArtShow MUSEUM"}),e=i("div",{className:"lu-lobby-sub",text:"VIRTUAL EXHIBITION"}),o=i("div",{className:"lu-lobby-rule"}),a=i("div",{id:"lu-auth"}),n=i("div",{className:"lu-social-wrap"}),r=i("div",{className:"lu-logged-wrap"}),l=()=>{n.textContent="";for(const M of Object.keys(ue)){const X=ue[M],D=i("button",{className:`lu-social-btn lu-social-${M}`,type:"button"},[i("span",{className:"lu-social-badge",text:X.short}),i("span",{text:X.label})]);D.addEventListener("click",async()=>{D.disabled=!0,D.classList.add("lu-social-busy");try{await qn(M)}catch{}D.disabled=!1,D.classList.remove("lu-social-busy")}),n.appendChild(D)}n.appendChild(i("div",{className:"lu-social-note",text:"계정 연동 준비 중 — 지금은 프로필 미리보기로 동작합니다"}))},s=M=>{r.textContent="";const X=i("span",{className:"lu-logged-avatar",text:M.initial||M.name.slice(0,1)}),D=i("span",{className:"lu-logged-name",text:`${M.name}님`}),lt=i("span",{className:"lu-logged-via",text:ue[M.provider]?ue[M.provider].short:""}),xt=i("button",{className:"lu-logout-btn",type:"button",text:"로그아웃"});xt.addEventListener("click",()=>Jn()),r.appendChild(i("div",{className:"lu-logged-chip"},[X,D,lt,xt]))},c=M=>{M?(s(M),n.style.display="none",r.style.display="",f.value=M.name.slice(0,xe)):(n.style.display="",r.style.display="none",(!f.value||Object.values(Zn).includes(f.value))&&(f.value="게스트")),E()};l(),a.appendChild(n),a.appendChild(r);const u=i("div",{className:"lu-auth-or"},[i("span",{text:"소셜 계정 연동 (준비 중)"})]),x=i("label",{className:"lu-field-label",for:"lu-nickname",text:"닉네임"}),f=i("input",{id:"lu-nickname",type:"text",maxlength:String(xe),value:"게스트",autocomplete:"off",spellcheck:"false"}),g=i("div",{className:"lu-field-hint",text:`최대 ${xe}자 · 비워두면 '게스트'로 입장합니다`}),T=i("div",{className:"lu-field-label",text:"캐릭터",style:"margin-top:26px;"}),w=i("button",{id:"lu-char-design",className:"lu-char-design-btn",type:"button","aria-label":"캐릭터 디자인 — 나만의 아야모 만들기"});function E(){const M=Fo();w.textContent="";const X=i("span",{className:"lu-char-design-media"});M?(X.classList.add("lu-has-thumb"),X.style.backgroundImage=`url('${M}')`):X.textContent="🎨";const D=i("span",{className:"lu-char-design-txt"},[i("b",{text:"캐릭터 디자인"}),i("span",{text:M?"내 아야모 편집하기":"나만의 아야모 만들기 (선택)"})]);w.append(X,D,i("span",{className:"lu-char-design-arrow",text:"›"}))}E(),w.addEventListener("click",()=>wo());const I=i("button",{id:"lu-enter-btn",type:"button",text:"입장하기"}),b=i("div",{id:"lu-picker"}),m=i("div",{className:"lu-lobby-divider"}),O=i("a",{className:"lu-studio-link",href:"./studio.html",target:"_blank",rel:"noopener noreferrer",text:"작가 스튜디오에서 나만의 전시 만들기 →"}),B=i("div",{className:"lu-lobby-form"},[x,f,g,T,w,I,u,a]),$=i("div",{className:"lu-quick-enter"});function S(){$.textContent="";const M=vt(),X=Fo(),D=i("span",{className:"lu-quick-avatar"});X?D.style.backgroundImage=`url('${X}')`:D.textContent="🙂";const lt=i("div",{className:"lu-quick-greet"},[i("b",{text:(M?`${M.name}님, `:"")+"다시 오셨어요"}),i("span",{text:"저장한 모습으로 바로 입장할 수 있어요"})]),xt=i("button",{className:"lu-quick-btn",type:"button",text:"바로 입장"});xt.addEventListener("click",ot);const le=i("button",{className:"lu-quick-change",type:"button",text:"닉네임·캐릭터 바꾸기"});le.addEventListener("click",()=>{B.classList.remove("lu-collapsed"),$.style.display="none";try{f.focus()}catch{}}),$.append(D,lt,xt,le)}!!(vt()||wa())?(S(),B.classList.add("lu-collapsed")):$.style.display="none";const _=i("div",{className:"lu-lobby-card"},[t,e,o,$,B,b,m,O]),Z=i("div",{id:"lu-lobby",className:"lu"},[_]);document.body.appendChild(Z),c(vt()),xa(c);function ot(){let M=f.value.trim().slice(0,xe);M||(M="게스트");let X=0;for(let lt=0;lt<M.length;lt++)X=X*31+M.charCodeAt(lt)>>>0;Wo=oo[X%oo.length];const D=ao(Object.assign({},Le,ka()||{}));typeof G.onEnter=="function"&&G.onEnter({nickname:M,color:Wo,char:D})}I.addEventListener("click",ot),f.addEventListener("keydown",M=>{M.stopPropagation(),M.key==="Enter"&&ot()}),f.addEventListener("keyup",M=>M.stopPropagation());function U(){E()}return{overlay:Z,nickInput:f,pickerBox:b,onChibiSaved:U}}function Bi(){const t=Rt?[["왼쪽 드래그","이동"],["오른쪽 드래그","시점 회전"],["캐릭터 탭","콕 찌르기"],["작품 카드","탭하여 크게 보기"]]:[["마우스 드래그","시점 회전"],["W A S D","이동"],["Shift","달리기"],["Enter","채팅"],["M","작품 목록"],["T","투어"],["G","방명록"],["V","내 모습 보기"],["C","캐릭터 디자인"],["P","사진 촬영"],["클릭","캐릭터 콕 찌르기"]],e=i("div",{id:"lu-controls",className:"lu lu-hud"});if(e.appendChild(i("div",{className:"lu-controls-title",text:"CONTROLS"})),t.forEach(([o,a])=>{const n=i("div",{},[i("span",{className:"lu-key",text:o}),i("span",{text:a})]);e.appendChild(n)}),document.body.appendChild(e),Rt){e.classList.add("lu-collapsed");const o=i("button",{id:"lu-controls-toggle",className:"lu lu-hud",type:"button","aria-label":"조작법 보기",text:"?"});o.addEventListener("click",()=>{e.classList.toggle("lu-collapsed")}),document.body.appendChild(o)}return e}function Di(){if(!Rt)return null;function t(){const m=d&&d.chat&&d.chat.wrap;if(!m)return;const O=m.classList.toggle("lu-chat-collapsed");!O&&d.chat.input?d.chat.input.focus():d.chat.input&&d.chat.input.blur(),r.classList.toggle("lu-on",!O)}const e={chat:'<path d="M20 15a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',tour:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z"/>',capture:'<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',more:'<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',list:'<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',self:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',help:'<path d="M9.2 9a2.9 2.9 0 1 1 4.2 2.6c-.9.45-1.4 1.05-1.4 2.1"/><circle cx="12" cy="17.4" r="1" fill="currentColor" stroke="none"/>',dress:'<path d="M9 4l3 3 3-3M9 4l-1.5 5 4.5 3 4.5-3L18 4M7.5 9l-2 8h13l-2-8"/>'};function o(m){const O=document.createElement("span");return O.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+e[m]+"</svg>",O.firstChild}function a(m,O,B,$){const S=i("button",{className:m,type:"button","aria-label":O});S.appendChild(o(B)),S.appendChild(i("span",{className:"lu-dock-label",text:$}));const W=i("div",{className:"lu-dock-wrap"},[S]);return{b:S,wrap:W}}const n=a("lu-dock-btn","채팅 열기/닫기","chat","채팅"),r=n.b;n.wrap.style.display="none",r.addEventListener("click",t);const l=a("lu-dock-btn","투어 시작/종료","tour","투어"),s=l.b;s.addEventListener("click",()=>{typeof ct.onTour=="function"&&ct.onTour()});const c=a("lu-dock-btn lu-gold","사진 촬영","capture","캡처"),u=c.b;u.addEventListener("click",()=>{u.classList.remove("lu-cap-pop"),u.offsetWidth,u.classList.add("lu-cap-pop"),typeof ct.onCapture=="function"&&ct.onCapture()});const x=a("lu-dock-btn","더보기","more","메뉴"),f=x.b,g=i("div",{id:"lu-more-backdrop"}),T=i("div",{id:"lu-more-sheet"});function w(){T.classList.remove("lu-open"),g.classList.remove("lu-open")}function E(m,O,B){const $=i("button",{className:"lu-sheet-btn",type:"button"});return $.appendChild(o(m)),$.appendChild(i("span",{text:O})),$.addEventListener("click",()=>{w(),B()}),$}const I=i("div",{className:"lu-sheet-grid"},[E("list","작품 목록",()=>_a()),E("self","내 모습",()=>{typeof ct.onSelfView=="function"&&ct.onSelfView()}),E("dress","캐릭터 디자인",()=>wo()),E("chat","채팅",t),E("help","조작법",()=>{const m=document.getElementById("lu-controls");m&&m.classList.toggle("lu-collapsed")})]);T.append(i("div",{className:"lu-sheet-handle"}),I),g.addEventListener("click",w),f.addEventListener("click",()=>{const m=T.classList.toggle("lu-open");g.classList.toggle("lu-open",m)}),document.body.appendChild(g),document.body.appendChild(T);const b=i("div",{id:"lu-dock",className:"lu lu-hud"},[n.wrap,l.wrap,c.wrap,x.wrap]);return document.body.appendChild(b),zt={chatBtn:r,chatWrap:n.wrap,tourBtn:s,selfBtn:null,dock:b},b}let zt=null;function Pe(t,e){zt&&t==="tour"&&zt.tourBtn&&zt.tourBtn.classList.toggle("lu-on",!!e)}function ji(){const t=i("span",{text:"--"}),e=i("div",{className:"lu-stat"});e.append("FPS ");const o=i("b");o.appendChild(t),e.appendChild(o);const a=i("div",{id:"lu-topright",className:"lu lu-hud"},[e]);return document.body.appendChild(a),{wrap:a,fps:t,count:i("span"),countWrap:null}}function Yi(){const t=i("div",{id:"lu-status",className:"lu lu-hud"});return document.body.appendChild(t),t}function Ui(){const t=i("div",{id:"lu-chat-log"}),e=i("input",{id:"lu-chat-input",type:"text",maxlength:"120",placeholder:Rt?"탭하여 채팅…":"Enter 키로 채팅…",autocomplete:"off",spellcheck:"false"}),o=i("div",{id:"lu-chat",className:"lu lu-hud"},[t,e]);return Rt&&o.classList.add("lu-chat-collapsed"),document.body.appendChild(o),e.addEventListener("keydown",a=>{if(a.stopPropagation(),a.key==="Enter"){const n=e.value.trim();e.value="",e.blur(),n&&typeof G.onChatSend=="function"&&G.onChatSend(n)}else a.key==="Escape"&&(e.value="",e.blur())}),e.addEventListener("keyup",a=>a.stopPropagation()),e.addEventListener("keypress",a=>a.stopPropagation()),{wrap:o,log:t,input:e}}function Hi(){const t=i("div",{className:"lu-art-eyebrow",text:"ARTWORK"}),e=i("div",{className:"lu-art-title"}),o=i("div",{className:"lu-art-meta"}),a=i("div",{className:"lu-art-rule"}),n=i("div",{className:"lu-art-desc"}),r=i("button",{className:"lu-art-hint",type:"button"});Rt?r.appendChild(document.createTextNode("크게 보기")):(r.appendChild(i("span",{className:"lu-key",text:"E"})),r.appendChild(document.createTextNode(" — 크게 보기"))),r.addEventListener("click",s=>{s.stopPropagation(),typeof ct.onViewArtwork=="function"&&ct.onViewArtwork()});const l=i("div",{id:"lu-artwork",className:"lu"},[t,e,o,a,n,r]);return Rt&&l.addEventListener("click",()=>{typeof ct.onViewArtwork=="function"&&ct.onViewArtwork()}),document.body.appendChild(l),{panel:l,title:e,meta:o,desc:n}}function Xi(){const t=i("span",{className:"lu-topbar-title"}),e=i("b",{text:"1"}),o=i("span",{className:"lu-topbar-count"});o.appendChild(e),o.append(" 명");const a=i("div",{id:"lu-topbar",className:"lu lu-hud lu-cut-s lu-empty"},[t,i("span",{className:"lu-topbar-sep"}),o]);return document.body.appendChild(a),a._count=e,a._countWrap=o,a}function Fi(){const t=i("button",{id:"lu-lightbox-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{className:"lu-lightbox-stage"}),o=i("div",{className:"lu-lightbox-title"}),a=i("div",{className:"lu-lightbox-meta"}),n=i("div",{className:"lu-lightbox-rule"}),r=i("div",{className:"lu-lightbox-desc"}),l=i("div",{className:"lu-lightbox-caption"},[o,a,n,r]),s=i("div",{id:"lu-lightbox",className:"lu"},[t,e,l]);document.body.appendChild(s),t.addEventListener("click",()=>Me()),s.addEventListener("click",S=>{(S.target===s||S.target===e)&&Me()});const c=new Map;let u=1,x=0,f=0,g=0,T=1,w=0,E=0,I=0,b=null;function m(){return e.querySelector(".lu-lightbox-media")}function O(){const S=m();S&&(S.style.transform=`translate(${x}px, ${f}px) scale(${u})`)}function B(){u=1,x=0,f=0,O()}s.addEventListener("pointerdown",S=>{if(c.set(S.pointerId,{x:S.clientX,y:S.clientY}),c.size===1&&(b={x:S.clientX,y:S.clientY,t:performance.now()}),c.size===2){const[W,_]=[...c.values()];g=Math.hypot(W.x-_.x,W.y-_.y),T=u}}),s.addEventListener("pointermove",S=>{const W=c.get(S.pointerId);if(!W)return;const _=S.clientX-W.x,Z=S.clientY-W.y;if(W.x=S.clientX,W.y=S.clientY,c.size===2&&g>0){const[ot,U]=[...c.values()];u=Math.min(4,Math.max(1,T*(Math.hypot(ot.x-U.x,ot.y-U.y)/g))),u===1&&(x=0,f=0),O()}else c.size===1&&u>1&&(x+=_,f+=Z,O())});function $(S){if(c.delete(S.pointerId),c.size!==0||!b)return;const W=performance.now()-b.t,_=S.clientX-b.x,Z=S.clientY-b.y;if(b=null,u===1&&W<600){if(Math.abs(_)>64&&Math.abs(Z)<56){Gi(_<0?1:-1);return}if(Z>84&&Math.abs(_)<60){Me();return}}if(Math.abs(_)<12&&Math.abs(Z)<12&&W<350){const ot=performance.now();if(ot-w<320&&Math.hypot(S.clientX-E,S.clientY-I)<44){u>1?B():(u=2.4,O()),w=0;return}w=ot,E=S.clientX,I=S.clientY}}return s.addEventListener("pointerup",$),s.addEventListener("pointercancel",S=>c.delete(S.pointerId)),{overlay:s,closeBtn:t,stage:e,title:o,meta:a,rule:n,desc:r,resetZoom:B}}let co=null;function Gi(t){const e=ze();if(!co||e.length<2)return;const o=e.indexOf(co),a=e[((o===-1?0:o)+t+e.length)%e.length];Na(a)}const Vo="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#eaeae6"/></svg>');function Ca(t){const e=d.artworkList.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(i("div",{className:"lu-artlist-empty",text:"표시할 작품이 없습니다"}));return}t.forEach(o=>{const a=i("img",{className:"lu-artlist-thumb",src:o.imageUrl||Vo,alt:o.title||"",loading:"lazy"});a.addEventListener("error",()=>{a.src=Vo},{once:!0});const n=i("div",{className:"lu-artlist-info"},[i("div",{className:"lu-artlist-name",text:o.title||""}),i("div",{className:"lu-artlist-artist",text:o.artist||""})]),r=i("button",{type:"button",className:"lu-artlist-card"},[a,n]);r.addEventListener("click",()=>{re(),typeof lo=="function"&&lo(o)}),e.appendChild(r)})}function $i(){const t=i("button",{id:"lu-artlist-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{id:"lu-artlist-head"},[i("div",{id:"lu-artlist-title",text:"작품 목록"}),t]),o=i("div",{id:"lu-artlist-body"}),a=i("div",{id:"lu-artlist",className:"lu"},[e,o]);return document.body.appendChild(a),t.addEventListener("click",()=>re()),{panel:a,body:o}}function Wi(t){const e=Date.now(),o=Math.max(0,e-t),a=Math.floor(o/6e4);if(a<1)return"방금 전";if(a<60)return`${a}분 전`;const n=Math.floor(a/60);if(n<24)return`${n}시간 전`;const r=new Date(t),l=new Date(e),s=g=>new Date(g.getFullYear(),g.getMonth(),g.getDate()).getTime();if(Math.round((s(l)-s(r))/864e5)<=1)return"어제";const u=r.getFullYear(),x=String(r.getMonth()+1).padStart(2,"0"),f=String(r.getDate()).padStart(2,"0");return`${u}.${x}.${f}`}function Ea(t){const e=d.guestbook.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(i("div",{className:"lu-gbook-empty",text:"첫 방명록을 남겨보세요"}));return}const o=["#e07a5f","#81b29a","#5f9e7d","#8e7dbe","#6a8caf","#d68fb8"];t.forEach(a=>{const n=a.name||"게스트";let r=0;for(let u=0;u<n.length;u++)r=r*31+n.charCodeAt(u)>>>0;const l=i("span",{className:"lu-gbook-dot"});l.style.background=o[r%o.length];const s=i("div",{},[l,i("span",{className:"lu-gbook-name",text:n}),i("span",{className:"lu-gbook-time",text:Wi(a.ts)})]),c=i("div",{className:"lu-gbook-text",text:a.text||""});e.appendChild(i("div",{className:"lu-gbook-note"},[s,c]))})}function Ki(){const t=i("button",{id:"lu-guestbook-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{id:"lu-guestbook-head"},[i("div",{id:"lu-guestbook-title"},[i("span",{className:"lu-gb-eyebrow",text:"GUESTBOOK"}),i("span",{className:"lu-gb-main",text:"방명록"}),i("span",{className:"lu-gb-sub",text:"다녀간 마음을 한 줄 남겨 주세요"})]),t]),o=i("div",{id:"lu-guestbook-body"}),a=i("textarea",{id:"lu-gbook-input",rows:"3",maxlength:String(me),placeholder:"전시에 한 줄 메모를 남겨보세요…",spellcheck:"false"}),n=i("span",{className:"lu-gbook-count",text:`0/${me}`}),r=i("button",{id:"lu-gbook-submit",type:"button",text:"남기기"});r.disabled=!0;const l=i("div",{className:"lu-gbook-footer-row"},[n,r]),s=i("div",{id:"lu-gbook-stats",style:"font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.45);padding:6px 2px 0;"}),c=i("div",{id:"lu-guestbook-footer"},[a,l,s]),u=i("button",{id:"lu-gbtab",type:"button","aria-label":"방명록 열기/닫기 (위아래로 드래그해 위치 이동)",title:"드래그해서 위치를 옮길 수 있어요",text:"방명록"}),x="lu-gbtab-top-v1";try{const b=parseFloat(localStorage.getItem(x));Number.isFinite(b)&&(u.style.top=f(b)+"px")}catch{}function f(b){const m=Math.max(80,(window.innerHeight||800)-140);return Math.min(m,Math.max(60,b))}let g=null;u.addEventListener("pointerdown",b=>{const m=u.getBoundingClientRect();g={startY:b.clientY,startTop:m.top,moved:!1},u.setPointerCapture(b.pointerId)}),u.addEventListener("pointermove",b=>{if(!g)return;const m=b.clientY-g.startY;Math.abs(m)>6&&(g.moved=!0),g.moved&&(u.style.top=f(g.startTop+m)+"px")});const T=()=>{if(g&&g.moved)try{localStorage.setItem(x,String(parseFloat(u.style.top)))}catch{}setTimeout(()=>{g=null},0)};u.addEventListener("pointerup",T),u.addEventListener("pointercancel",T),u.addEventListener("click",()=>{g&&g.moved||ko()});const w=i("div",{id:"lu-guestbook",className:"lu"},[e,o,c,u]);document.body.appendChild(w),t.addEventListener("click",()=>Co());function E(){const b=a.value.length;n.textContent=`${b}/${me}`,r.disabled=a.value.trim().length===0}function I(){const b=a.value.trim().slice(0,me);b&&(a.value="",E(),a.blur(),typeof so=="function"&&so(b))}return a.addEventListener("keydown",b=>{b.stopPropagation(),b.key==="Escape"?(a.value="",E(),a.blur()):b.key==="Enter"&&(b.ctrlKey||b.metaKey)&&(b.preventDefault(),I())}),a.addEventListener("keyup",b=>b.stopPropagation()),a.addEventListener("keypress",b=>b.stopPropagation()),a.addEventListener("input",E),r.addEventListener("click",I),{panel:w,body:o,input:a,count:n,submitBtn:r,tab:u}}function Vi(){const t=i("button",{type:"button","aria-label":"이전 작품",text:"◀ 이전"}),e=i("span",{className:"lu-tour-sep"}),o=i("span",{className:"lu-tour-count"}),a=i("span",{className:"lu-tour-title"}),n=i("span",{className:"lu-tour-sep"}),r=i("button",{type:"button","aria-label":"다음 작품",text:"다음 ▶"}),l=i("span",{className:"lu-tour-sep"}),s=i("button",{type:"button",className:"lu-tour-auto"}),c=i("span",{className:"lu-tour-sep"}),u=i("button",{id:"lu-tourbar-exit",type:"button","aria-label":"투어 종료",text:"✕ 종료"}),x=i("div",{id:"lu-tourbar",className:"lu"},[t,e,o,a,n,r,l,s,c,u]);return document.body.appendChild(x),t.addEventListener("click",()=>{ft.onPrev&&ft.onPrev()}),r.addEventListener("click",()=>{ft.onNext&&ft.onNext()}),u.addEventListener("click",()=>{ft.onExit&&ft.onExit()}),s.addEventListener("click",()=>{ft.onToggleAuto&&ft.onToggleAuto()}),{bar:x,prevBtn:t,nextBtn:r,autoBtn:s,exitBtn:u,countEl:o,titleEl:a}}function qi(){const t=i("div",{id:"lu-shutter",className:"lu"});return document.body.appendChild(t),t}function Zi(){const t=i("button",{id:"lu-share-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{className:"lu-share-title",text:"전시 공유하기"}),o=i("img",{className:"lu-share-preview",alt:"캡처한 전시 화면"}),a=i("button",{className:"lu-share-btn lu-share-btn-primary",type:"button",text:"기기로 공유"}),n=i("button",{className:"lu-share-btn",type:"button",text:"이미지 저장"}),r=i("button",{className:"lu-share-btn",type:"button",text:"X에 공유"}),l=i("button",{className:"lu-share-btn",type:"button",text:"Threads에 공유"}),s=i("button",{className:"lu-share-btn",type:"button",text:"링크 복사"}),c=i("div",{className:"lu-share-actions"},[a,n,r,l,s]),u=i("div",{className:"lu-share-hint",text:"인스타그램은 이미지를 저장하거나 기기로 공유한 뒤 앱에서 올려주세요"}),x=i("div",{className:"lu-share-card"},[t,e,o,c,u]),f=i("div",{id:"lu-share",className:"lu"},[x]);return document.body.appendChild(f),t.addEventListener("click",()=>uo()),f.addEventListener("click",g=>{g.target===f&&uo()}),a.addEventListener("click",async()=>{if(!(!J.blob||typeof navigator>"u"||typeof navigator.share!="function"))try{const g=new File([J.blob],"artshow.png",{type:"image/png"});await navigator.share({files:[g],title:J.galleryName||"OpenArtShow",text:`${J.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`})}catch{}}),n.addEventListener("click",()=>{if(!J.dataUrl)return;const g=document.createElement("a");g.href=J.dataUrl,g.download="artshow.png",document.body.appendChild(g),g.click(),document.body.removeChild(g)}),r.addEventListener("click",()=>{const g=`${J.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`,T=`https://twitter.com/intent/tweet?text=${encodeURIComponent(g)}&url=${encodeURIComponent(J.shareUrl||"")}`;window.open(T,"_blank","noopener")}),l.addEventListener("click",()=>{const g=`${J.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시 ${J.shareUrl||""}`,T=`https://www.threads.net/intent/post?text=${encodeURIComponent(g)}`;window.open(T,"_blank","noopener")}),s.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(J.shareUrl||""),_t&&clearTimeout(_t),s.textContent="복사됨",s.classList.add("lu-share-btn-copied"),_t=setTimeout(()=>{s.textContent="링크 복사",s.classList.remove("lu-share-btn-copied"),_t=null},1600)}catch{}}),{overlay:f,card:x,title:e,preview:o,deviceBtn:a,saveBtn:n,xBtn:r,threadsBtn:l,copyBtn:s}}function wo(){!d||!d.chibiMaker||Xt.chibiOpen||At||Pt||Ot||It||d.chibiMaker.open()}function Ji(){d&&d.chibiMaker&&d.chibiMaker.close()}function Qi(){window.addEventListener("keydown",t=>{if(t.key==="Escape"){if(Xt.chibiOpen){t.preventDefault(),t.stopImmediatePropagation(),Ji();return}if(Pt){t.preventDefault(),t.stopImmediatePropagation(),uo();return}if(At){t.preventDefault(),t.stopImmediatePropagation(),Me();return}if(It){t.preventDefault(),t.stopImmediatePropagation(),re();return}if(Ot){t.preventDefault(),t.stopImmediatePropagation(),Co();return}return}if(At||Pt||!Xt.entered)return;const e=document.activeElement;e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA")||(t.key==="Enter"?(t.preventDefault(),t.stopPropagation(),d.chat.input.focus()):(t.key==="c"||t.key==="C"||t.key==="ㅊ")&&!Xt.chibiOpen&&(t.preventDefault(),t.stopPropagation(),wo()))})}function tr({onEnter:t,onChatSend:e,onAvatarChange:o,onMakerToggle:a}={}){if(Ko){G.onEnter=t||G.onEnter,G.onChatSend=e||G.onChatSend,G.onAvatarChange=o||G.onAvatarChange,G.onMakerToggle=a||G.onMakerToggle;return}Ko=!0,G.onEnter=t||null,G.onChatSend=e||null,G.onAvatarChange=o||null,G.onMakerToggle=a||null,yi(),d={loading:Ri(),lobby:Pi(),controls:Bi(),topRight:ji(),status:Yi(),chat:Ui(),artwork:Hi(),galleryTitle:Xi(),lightbox:Fi(),artworkList:$i(),guestbook:Ki(),tourBar:Vi(),dock:Di(),shutter:qi(),share:Zi()},d.chibiMaker=Ii({els:d,state:Xt,callbacks:G,setStatus:H}),d.topRight.count=d.galleryTitle._count,d.topRight.countWrap=d.galleryTitle._countWrap,Qi(),Oe!==null&&La(Oe),wt&&Ma(wt.galleries,wt.currentId,wt.onPick),Re&&Ca(Re),Ie&&Ea(Ie)}function qo(t){d&&d.loading.classList.toggle("lu-hidden",!t)}function er(){if(!d)return;Xt.entered=!0,d.lobby.overlay.classList.add("lu-hidden"),d.controls.classList.add("lu-visible"),d.topRight.wrap.classList.add("lu-visible"),d.status.classList.add("lu-visible"),d.chat.wrap.classList.add("lu-visible"),d.galleryTitle.classList.add("lu-visible"),d.guestbook.tab.classList.add("lu-visible"),d.dock&&d.dock.classList.add("lu-visible");const t=document.getElementById("lu-controls-toggle");t&&t.classList.add("lu-visible")}function or(t){!d||!t||io===t.id&&d.artwork.panel.classList.contains("lu-open")||(io=t.id,d.artwork.title.textContent=t.title||"",d.artwork.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),d.artwork.desc.textContent=t.desc||"",d.artwork.panel.classList.add("lu-open"))}function ar(){d&&(io=null,d.artwork.panel.classList.remove("lu-open"))}function Sa(t,e,o){if(!d)return;const a=i("div",{className:"lu-chat-msg"+(o?" lu-self":"")},[i("span",{className:"lu-chat-name",text:t}),i("span",{text:e})]);for(d.chat.log.appendChild(a);d.chat.log.children.length>Oi;)d.chat.log.removeChild(d.chat.log.firstChild)}function nr(t){if(!d)return;const e=d.topRight.count.textContent;d.topRight.count.textContent=String(t),e!==String(t)&&d.topRight.countWrap&&(d.topRight.countWrap.classList.remove("lu-tick"),d.topRight.countWrap.offsetWidth,d.topRight.countWrap.classList.add("lu-tick")),zt&&zt.chatWrap&&(zt.chatWrap.style.display=t>=2?"":"none")}function H(t){d&&(d.status.textContent=t||"")}function ir(t){d&&(d.topRight.fps.textContent=String(Math.round(t)))}function La(t){d.galleryTitle.querySelector(".lu-topbar-title").textContent=t||"",d.galleryTitle.classList.toggle("lu-empty",!t)}function rr(t){Oe=t||"",d&&La(Oe)}function Ma(t,e,o){const a=d.lobby.pickerBox;if(a.innerHTML="",!Array.isArray(t)||t.length===0)return;const n=i("div",{className:"lu-field-label",text:"전시 선택",style:"margin-top:26px;"});a.appendChild(n),e==null&&a.appendChild(i("div",{className:"lu-picker-note",text:"공유된 전시 관람 중"}));const r=i("div",{className:"lu-picker-list"});t.forEach(l=>{const s=l.id===e,c=i("button",{type:"button",className:"lu-picker-item"+(s?" lu-picker-current":"")},[i("div",{className:"lu-picker-name",text:l.name||l.id}),i("div",{className:"lu-picker-meta",text:[l.artist,typeof l.count=="number"?`${l.count}점`:null].filter(Boolean).join(" · ")})]);s&&(c.disabled=!0),c.addEventListener("click",()=>{s||typeof o=="function"&&o(l.id)}),r.appendChild(c)}),a.appendChild(r)}function lr(t,e,o){wt={galleries:t,currentId:e??null,onPick:o},d&&Ma(wt.galleries,wt.currentId,wt.onPick)}function Ta(){const t=d.lightbox.stage,e=t.firstChild;e&&e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),t.innerHTML=""}function Na(t){if(!d||!t)return;co=t,d.lightbox.resetZoom&&d.lightbox.resetZoom(),Nt&&(clearTimeout(Nt),Nt=null),Ta();let e;t.videoUrl?(e=i("video",{className:"lu-lightbox-media",src:t.videoUrl,controls:"controls",autoplay:"autoplay",loop:"loop",muted:"muted",playsinline:"playsinline"}),e.muted=!0):e=i("img",{className:"lu-lightbox-media",src:t.imageUrl||"",alt:t.title||""}),d.lightbox.stage.appendChild(e),d.lightbox.title.textContent=t.title||"",d.lightbox.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),d.lightbox.desc.textContent=t.desc||"",At=!0,d.lightbox.overlay.classList.add("lu-open")}function Me(){!d||!At||(At=!1,d.lightbox.overlay.classList.remove("lu-open"),Nt&&clearTimeout(Nt),Nt=setTimeout(()=>{Ta(),Nt=null},340),typeof ro=="function"&&ro())}function ut(){return At}function sr(t){ro=typeof t=="function"?t:null}function cr(t,e){lo=typeof e=="function"?e:null,Re=t,d&&Ca(Re)}function _a(){d&&(It?re():(It=!0,d.artworkList.panel.classList.add("lu-open")))}function re(){!d||!It||(It=!1,d.artworkList.panel.classList.remove("lu-open"))}function za(){return It}function dr({index:t,total:e,title:o,autoOn:a}={}){if(!d)return;const n=d.tourBar,r=Number.isFinite(t)?t+1:1,l=Number.isFinite(e)?e:0;n.countEl.textContent=`● ${r} / ${l}`,n.titleEl.textContent=` — ${o||""}`,n.autoBtn.textContent=a?"자동진행 ON":"자동진행 OFF",n.autoBtn.classList.toggle("lu-tour-on",!!a),n.bar.classList.add("lu-open")}function ur(){d&&d.tourBar.bar.classList.remove("lu-open")}function pr({onTour:t,onViewArtwork:e,onGuestbook:o,onCapture:a,onSelfView:n}={}){ct={onTour:typeof t=="function"?t:null,onViewArtwork:typeof e=="function"?e:null,onGuestbook:typeof o=="function"?o:null,onCapture:typeof a=="function"?a:null,onSelfView:typeof n=="function"?n:null}}function fr({blob:t,dataUrl:e,galleryName:o,shareUrl:a}={}){if(!d)return;J={blob:t||null,dataUrl:e||"",galleryName:o||"",shareUrl:a||(typeof window<"u"?window.location.href:"")},d.share.preview.src=J.dataUrl;let n=!1;if(J.blob&&typeof navigator<"u"&&typeof navigator.share=="function"&&typeof navigator.canShare=="function")try{const r=new File([J.blob],"artshow.png",{type:"image/png"});n=navigator.canShare({files:[r]})}catch{n=!1}d.share.deviceBtn.style.display=n?"":"none",_t&&(clearTimeout(_t),_t=null),d.share.copyBtn.textContent="링크 복사",d.share.copyBtn.classList.remove("lu-share-btn-copied"),Pt=!0,d.share.overlay.classList.add("lu-open")}function uo(){!d||!Pt||(Pt=!1,d.share.overlay.classList.remove("lu-open"))}function Be(){return Pt}function Aa(){if(!d)return;const t=d.shutter;t.style.transition="none",t.style.opacity="1",t.offsetWidth,t.style.transition="opacity 0.25s ease",t.style.opacity="0"}function hr({onPrev:t,onNext:e,onExit:o,onToggleAuto:a}={}){ft={onPrev:typeof t=="function"?t:null,onNext:typeof e=="function"?e:null,onExit:typeof o=="function"?o:null,onToggleAuto:typeof a=="function"?a:null}}function br(t){const e=document.getElementById("lu-gbook-stats");e&&(e.textContent=t||"")}function gr({onSubmit:t}={}){so=typeof t=="function"?t:null}function ko(){d&&(Ot?Co():(Ot=!0,d.guestbook.panel.classList.add("lu-open")))}function Co(){!d||!Ot||(Ot=!1,d.guestbook.panel.classList.remove("lu-open"))}function xr(){return Ot}function Eo(t){Ie=Array.isArray(t)?t:[],d&&Ea(Ie)}let L=null,nt=null,N=null,R=null,po=null,C=null,Yt=null,Zt=null;const mr=new In;let Lt=!1,Jt=0,Ke=0,fo=0,Ve=0,Zo=!1,at={name:"",soft:!1};const yr=/swiftshader|llvmpipe|softpipe|software (?:rasterizer|renderer|adapter)|microsoft basic render|\bwarp\b|gdi generic|mesa offscreen|apple software renderer/i;function vr(){const t={name:"",soft:!1};try{const e=document.createElement("canvas"),a=!(e.getContext("webgl2",{failIfMajorPerformanceCaveat:!0})||e.getContext("webgl",{failIfMajorPerformanceCaveat:!0})),n=document.createElement("canvas"),r=n.getContext("webgl2")||n.getContext("webgl");if(!r)return{name:"",soft:!0};const l=r.getExtension("WEBGL_debug_renderer_info");t.name=String(l&&r.getParameter(l.UNMASKED_RENDERER_WEBGL)||r.getParameter(r.RENDERER)||""),t.soft=yr.test(t.name)||a;const s=r.getExtension("WEBGL_lose_context");s&&s.loseContext()}catch{}return t}function wr(t,e){const o=document.createElement("div");o.id="lu-gpu-notice",o.style.cssText=`position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:1200;max-width:min(92vw,600px);background:linear-gradient(180deg,#fffdf8,#f6f1e4);color:#17140f;border:1px solid rgba(95,158,125,0.55);border-radius:14px;padding:14px 44px 14px 18px;box-shadow:0 12px 32px rgba(20,15,8,0.35);font:13px/1.75 ${ae()};`;const a="<b>이 브라우저에서 3D 그래픽 기능을 사용할 수 없습니다</b><br>";o.innerHTML=a+'<b>Chrome</b>: 설정 → 시스템(<b>chrome://settings/system</b>) → "그래픽 가속 사용" 켜기 → 다시 시작<br><b>Edge</b>: 설정 → 시스템 및 성능 → "그래픽 가속 사용" 켜기 + "효율 모드" 끄기<br><b>Firefox</b>: 설정 → 일반 → 성능 → "권장 성능 설정" 해제 → "하드웨어 가속 사용" 체크<br>그래도 느리면: 원격 데스크톱 여부 확인 · 그래픽 드라이버 업데이트 · Windows 설정 → 디스플레이 → 그래픽에서 브라우저를 "고성능" GPU로 지정 · 확장프로그램 없는 시크릿 창으로 접속해 비교';const n=document.createElement("button");n.type="button",n.setAttribute("aria-label","닫기"),n.textContent="×",n.style.cssText="position:absolute;top:8px;right:10px;width:26px;height:26px;border:none;background:none;font-size:18px;color:#8a8172;cursor:pointer;",n.addEventListener("click",()=>o.remove());const r=document.createElement("button");r.type="button",r.textContent="진단 정보 복사",r.style.cssText="display:inline-block;margin-top:8px;padding:5px 14px;border-radius:999px;border:1px solid rgba(95,158,125,0.5);background:rgba(95,158,125,0.12);color:#17140f;font:600 11px/1 inherit;cursor:pointer;",r.addEventListener("click",()=>{const l=JSON.stringify({renderer:t,ua:navigator.userAgent,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,cores:navigator.hardwareConcurrency||0,mem:navigator.deviceMemory||0});try{navigator.clipboard.writeText(l),r.textContent="복사됨!"}catch{}}),o.appendChild(r),o.appendChild(n),document.body.appendChild(o)}const kr=24,Cr=45,Er=3,ho="lu-spec-v2",Ia=4;function bo(){try{const t=localStorage.getItem(ho);if(t){const e=JSON.parse(t);return e&&e.gen===Ia&&(e.v==="low"||e.v==="high")?e.v:null}return null}catch{return null}}function qe(t){try{t?localStorage.setItem(ho,JSON.stringify({v:t,gen:Ia})):localStorage.removeItem(ho),localStorage.removeItem("lu-spec-v1"),localStorage.removeItem("lu-lowspec-v1")}catch{}}let ye=0;const Te={low:83e5,base:11e6,high:18e6},Oa="lu-onboard-v1";let yt=-1,Ft=null,go=null,Jo=0,Ze=0;function Sr(){try{if(localStorage.getItem(Oa))return}catch{}if(!(typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches))return;yt=0;const t=R.getState();go={x:t.x,z:t.z};const e=document.createElement("style");e.textContent="@keyframes lu-ob-pulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} 70%{transform:translate(-50%,-50%) scale(1.25);opacity:0.2;} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} }",document.head.appendChild(e),Ft=document.createElement("div"),Ft.style.cssText="position:fixed;left:24%;bottom:22%;width:110px;height:110px;border-radius:50%;border:3px solid rgba(255,253,247,0.85);pointer-events:none;z-index:60;transform:translate(-50%,-50%);animation:lu-ob-pulse 1.6s ease-in-out infinite;",document.body.appendChild(Ft),H("왼쪽 화면을 누른 채 밀면 걸어요 🚶")}function Lr(){if(yt<0)return;const t=R.getState();if(yt===0)Math.hypot(t.x-go.x,t.z-go.z)>1.5&&(yt=1,Jo=t.ry,Ft&&(Ft.remove(),Ft=null),H("잘했어요! 오른쪽 화면을 쓸면 주위를 둘러봐요 👀"));else if(yt===1){let e=t.ry-Jo;e=Math.atan2(Math.sin(e),Math.cos(e)),Math.abs(e)>.6&&(yt=2,Ze=0,H("작품에 다가가면 설명이 나타나요 — 어려우면 [투어] 버튼을 눌러요 🖼️"))}else if(yt===2&&(Ze+=1,Ze>420)){yt=-1;try{localStorage.setItem(Oa,"1")}catch{}}}function Qo(){if(!C)return;const t=[];for(const[e,o]of C.remoteAvatars)e.startsWith("npc-")&&t.push(o);if(!Lt){for(const e of t)e.group.visible=!0;return}t.sort((e,o)=>e.group.position.distanceTo(N.position)-o.group.position.distanceTo(N.position)),t.forEach((e,o)=>{e.group.visible=o<Er})}const Ra=new On;let Je=null;const Pa=3,Mr=.7,Tr=-.2;let gt=!1,P=null,kt=null,Mt=null,Ne=0;const Ba=new pa,ta=new pa,Da=new xn;function ja(){if(j)if(gt=!gt,gt){if(!P&&kt)try{P=mo(kt.char,kt.color," "),P.group.traverse(t=>{t.isSprite&&(t.visible=!1)}),nt.add(P.group)}catch(t){console.warn("내 아바타 생성 실패:",t),P=null,gt=!1;return}if(!P){gt=!1;return}P.group.visible=!0,Pe("self",!0),Mt=null,Ne=0,H("내 모습 보기 — V키 또는 [시점] 버튼으로 복귀")}else P&&(P.group.visible=!1,Pe("self",!1))}function Nr(t){if(t){if(kt=kt?Object.assign({},kt,{char:t}):{char:t},P){const e=P.group,o=e.visible,a=e.position.clone(),n=e.rotation.y;try{const r=mo(t,kt.color||"#3498db"," ");r.group.traverse(l=>{l.isSprite&&(l.visible=!1)}),r.group.position.copy(a),r.group.rotation.y=n,r.group.visible=o,nt.add(r.group),nt.remove(e),P.dispose(),P=r}catch(r){console.warn("내 아바타 갱신 실패:",r)}}C&&typeof C.setChar=="function"&&C.setChar(t),H("아야모 모습을 바꿨어요 ✨")}}function Ya(){Ba.copy(N.position),Da.copy(N.quaternion),ta.set(0,0,1).applyQuaternion(N.quaternion),N.position.addScaledVector(ta,Pa),N.position.y+=Mr,N.rotateX(Tr)}function Ua(){N.position.copy(Ba),N.quaternion.copy(Da)}const _r=7,Qt=new hn,ea=new ra;let Qe=null;function zr(t){t.addEventListener("pointerdown",e=>{e.isPrimary&&(Qe={x:e.clientX,y:e.clientY,t:performance.now()})}),t.addEventListener("pointerup",e=>{const o=Qe;if(Qe=null,!o||!e.isPrimary||!j||!C||performance.now()-o.t>450||Math.hypot(e.clientX-o.x,e.clientY-o.y)>7)return;const a=t.getBoundingClientRect();ea.set((e.clientX-a.left)/a.width*2-1,-((e.clientY-a.top)/a.height)*2+1),Qt.setFromCamera(ea,N),Qt.far=_r+Pa;const n=[...C.remoteAvatars.entries()];if(!n.length)return;const r=n.map(([,c])=>c.group),l=Qt.intersectObjects(r,!0);if(l.length){let c=l[0].object;for(;c&&!r.includes(c);)c=c.parent;if(c){const[u]=n[r.indexOf(c)];C.sendHit(u);return}}Qt.far=60;const s=Qt.intersectObjects(zn(),!1);s.length&&s[0].object.userData.luArt&&$a(s[0].object.userData.luArt)})}let Ha=null,Ye="게스트",j=!1,tt=null,et=[],De="shared",rt=[],oa=!1,to=0,ve=0,Y=null;const aa=.8,Ar=2.2;function Ir(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}function Or(t,e,o){let a=(e-t)%(Math.PI*2);return a>Math.PI&&(a-=Math.PI*2),a<-Math.PI&&(a+=Math.PI*2),t+a*o}function Xa(t,e){const o=R.getState(),a=typeof t.y=="number"?t.y:o.y,n=t.x-o.x,r=a-o.y,l=t.z-o.z,s=Math.hypot(n,r,l),c=st.clamp(aa+s*.035,aa,Ar);R.disable(),Y={fromX:o.x,fromY:o.y,fromZ:o.z,fromRy:o.ry,toX:t.x,toY:a,toZ:t.z,toRy:t.ry,duration:c,elapsed:0,onDone:e||null}}const na=new ia(0,0,0,"YXZ");function Rr(t){if(!Y)return;Y.elapsed+=t;const e=Math.min(1,Y.elapsed/Y.duration),o=Ir(e),a=Y.fromX+(Y.toX-Y.fromX)*o,n=Y.fromY+(Y.toY-Y.fromY)*o,r=Y.fromZ+(Y.toZ-Y.fromZ)*o,l=Or(Y.fromRy,Y.toRy,o);if(N.position.set(a,n,r),na.set(0,l,0,"YXZ"),N.quaternion.setFromEuler(na),e>=1){const s=Y.onDone;Y=null,s&&s()}}let Q=!1,Bt=0,ie=!0,Gt=!1,$t=0;const Pr=6;async function Br(){qo(!0),nt=new ca,N=new da(55,window.innerWidth/window.innerHeight,.1,1e3),N.position.set(A.spawn.x,bt,A.spawn.z);const t=typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches,e=bo();at=vr(),console.info("[OpenArtShow] GPU:",at.name||"(unknown)",at.soft?"— SOFTWARE RENDERING":"");try{L=new la({antialias:!at.soft,powerPreference:"high-performance"})}catch(u){throw wr(""),u}zr(L.domElement);const o=document.createElement("div");o.id="lu-vignette",o.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse 72% 62% at 50% 46%, rgba(8,6,4,0) 50%, rgba(8,6,4,0.03) 62%, rgba(8,6,4,0.09) 72%, rgba(8,6,4,0.17) 82%, rgba(8,6,4,0.26) 91%, rgba(8,6,4,0.34) 100%);",document.body.appendChild(o);const a=window.devicePixelRatio||1;let n;e==="low"?n=Math.min(a,1.25):e==="high"?n=Math.min(Math.max(a,2),2.5):t?n=Math.min(a,2):n=Math.min(Math.max(a,1.5),2);const r=e==="high"?Te.high:e==="low"?Te.low:Te.base;n=Math.min(n,Math.sqrt(r/(window.innerWidth*window.innerHeight))),at.soft&&(n=Math.min(n,.7),document.documentElement.classList.add("lu-potato")),L.setPixelRatio(n),L.setSize(window.innerWidth,window.innerHeight),L.shadowMap.enabled=!at.soft,L.shadowMap.type=bn,L.toneMapping=at.soft?sa:gn,L.toneMappingExposure=.92,L.outputColorSpace=Ut,document.body.appendChild(L.domElement);const l=await En(),s=jr(l.theme);vn(nt,s,{fullLights:!at.soft&&e!=="low"}),await Sn(),await Ln(nt),window.__museum={scene:nt,camera:N,renderer:L},at.soft&&(nt.fog=null),L.shadowMap.autoUpdate=!1,L.shadowMap.needsUpdate=!0,fo=s==="cycle"?2:0,tt=l,rr(tt.name),Dr(),De=l.id??"shared",rt=Mn(De),Eo(rt),gr({onSubmit:Zr}),et=ze(),cr(et,$a),hr({onPrev:Ka,onNext:To,onExit:Mo,onToggleAuto:Wr}),pr({onSelfView:()=>{j&&!Be()&&ja()},onTour:()=>{j&&Wa()},onViewArtwork:Fa,onGuestbook:()=>{j&&!ut()&&ko()},onCapture:()=>{j&&!Be()&&(Aa(),Ga())}}),R=new di(N,L.domElement);const c=A.floors.find(u=>u.id===A.spawn.floor);R.setPose({x:A.spawn.x,y:(c?c.y:0)+bt,z:A.spawn.z,ry:A.spawn.ry}),po=hi({player:R,getSelfAvatar:()=>P}),R.disable(),setTimeout(()=>{const u=document.getElementById("lu-topright");u&&(u.style.cursor="pointer",u.title="클릭하면 성능 진단 정보가 복사됩니다",u.addEventListener("click",()=>{const x=JSON.stringify({gpu:at.name,soft:at.soft,pixelRatio:L?L.getPixelRatio():0,aa:L?L.getContext().getContextAttributes().antialias:null,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,inner:window.innerWidth+"x"+window.innerHeight,cores:navigator.hardwareConcurrency||0,spec:bo(),calls:L?L.info.render.calls:0,ua:navigator.userAgent});try{navigator.clipboard.writeText(x),H("진단 정보가 복사됐어요 — 붙여넣어 보내주세요")}catch{console.info("[OpenArtShow diag]",x)}}))},0),tr({onEnter:Vr,onChatSend:Qr,onAvatarChange:Nr,onMakerToggle:u=>{j&&(u?R.disable():Q||R.enable())}}),qo(!1),sr(()=>{j&&!Q&&R.enable()}),window.addEventListener("resize",el),window.addEventListener("keydown",Gr),Ha=new mn,L.setAnimationLoop(tl)}function Dr(){fetch("./galleries/index.json").then(t=>{if(!t.ok)throw new Error(`HTTP ${t.status}`);return t.json()}).then(t=>{if(!Array.isArray(t))return;const e=tt?tt.id:null;lr(t,e,o=>{window.location.href="./index.html?g="+o})}).catch(()=>{})}function jr(t){if(t!=="auto")return t;const e=new Date().getHours();return e>=6&&e<16?"daylight":e>=16&&e<19?"sunset":"night"}let we=null;function Yr(){if(!j)return;const t=N.position.y-bt;let e=null;for(const o of A.floors)t>=o.y-.9&&(e===null||o.y>e.y)&&(e=o);if(e){if(we===null){we=e.id;return}e.id!==we&&(we=e.id,H(e.name))}}function Fa(){if(!j||ut())return;const t=Q?et[Bt]:fa(N.position);t&&(Na(t),R.disable())}function Ga(){if(!(!L||!nt||!N))try{gt&&P&&Ya(),L.render(nt,N),gt&&P&&Ua();const t=L.domElement.toDataURL("image/png"),e=new Image;e.onload=()=>{const o=document.createElement("canvas");o.width=e.width,o.height=e.height;const a=o.getContext("2d");if(!a)return;a.drawImage(e,0,0);const n=a.createRadialGradient(o.width/2,o.height*.46,Math.min(o.width,o.height)*.4,o.width/2,o.height*.46,Math.max(o.width,o.height)*.72);n.addColorStop(0,"rgba(8,6,4,0)"),n.addColorStop(.24,"rgba(8,6,4,0.03)"),n.addColorStop(.44,"rgba(8,6,4,0.09)"),n.addColorStop(.64,"rgba(8,6,4,0.17)"),n.addColorStop(.82,"rgba(8,6,4,0.26)"),n.addColorStop(1,"rgba(8,6,4,0.34)"),a.fillStyle=n,a.fillRect(0,0,o.width,o.height),Hr(a,o.width,o.height,tt?tt.name:"");const r=o.toDataURL("image/png");try{const s=Math.round(o.height/o.width*360),c=document.createElement("canvas");c.width=360,c.height=s,c.getContext("2d").drawImage(o,0,0,360,s);const u=c.toDataURL("image/jpeg",.72),x=Ra.addLocal(Ye,tt?tt.name:"",u);x&&C&&C.sendPhoto(x)}catch(l){console.warn("포토월 썸네일 생성 실패 (캡처 자체는 정상):",l)}fr({blob:Ur(r),dataUrl:r,galleryName:tt&&tt.name||"OpenArtShow 전시",shareUrl:Fr()})},e.onerror=()=>{H("사진 촬영에 실패했습니다.")},e.src=t}catch(t){console.error("사진 촬영 실패:",t),H("사진 촬영에 실패했습니다.")}}function Ur(t){const e=t.split(",")[1],o=atob(e),a=new Uint8Array(o.length);for(let n=0;n<o.length;n++)a[n]=o.charCodeAt(n);return new Blob([a],{type:"image/png"})}function Hr(t,e,o,a){const n=Math.max(90,Math.round(o*.14)),r=t.createLinearGradient(0,o-n,0,o);r.addColorStop(0,"rgba(0,0,0,0)"),r.addColorStop(1,"rgba(0,0,0,0.55)"),t.fillStyle=r,t.fillRect(0,o-n,e,n);const l=Math.max(20,Math.round(e*.025)),s=Math.max(1,e/1400);t.textBaseline="alphabetic",t.textAlign="left",t.fillStyle="rgba(255,255,255,0.95)",t.font=`300 ${Math.round(18*s)}px ${ae()}`,t.fillText(a||"OpenArtShow 전시",l,o-l-6*s),t.fillStyle="#5f9e7d",t.font=`300 ${Math.round(16*s)}px ${ae()}`,Xr(t,"OpenArtShow",e-l,o-l-22*s,2.5*s),t.textAlign="right",t.fillStyle="rgba(255,255,255,0.6)",t.font=`300 ${Math.round(12*s)}px ${ae()}`,t.fillText("syhongart.github.io/openartshow",e-l,o-l-4*s)}function Xr(t,e,o,a,n){const r=Array.from(e),l=r.map(x=>t.measureText(x).width),s=l.reduce((x,f)=>x+f,0)+n*(r.length-1),c=t.textAlign;t.textAlign="left";let u=o-s;r.forEach((x,f)=>{t.fillText(x,u,a),u+=l[f]+n}),t.textAlign=c}function Fr(){const t=window.location.href;return t.length<2e3?t:window.location.origin+window.location.pathname.replace(/index\.html$/,"landing.html")}function Gr(t){if(t.code==="KeyE"){Fa();return}if(t.code==="KeyM"){if(!j||ut())return;_a();return}if(t.code==="KeyT"){if(!j)return;Wa();return}if(t.code==="KeyG"){if(!j||ut())return;ko();return}if(t.code==="KeyP"){if(!j||Be())return;Aa(),Ga();return}if(t.code==="KeyV"){if(!j||Be())return;ja();return}if(Q&&(t.code==="ArrowLeft"||t.code==="ArrowRight")){if(ut())return;t.preventDefault(),t.code==="ArrowLeft"?Ka():To();return}t.code==="Escape"&&Q&&!ut()&&!za()&&!xr()&&Mo()}function $a(t){if(!t||!j)return;const e=ga(t),o=Q;if(o){const a=et.indexOf(t);a!==-1&&(Bt=a),Gt=!1}Xa(e,()=>{R.setPose(e),o?(So(t),Gt=!0,$t=0):j&&!ut()&&R.enable()})}function So(t){dr({index:Bt,total:et.length,title:t&&t.title||"",autoOn:ie})}function Lo(t){const e=et[t];if(!e)return;Bt=t,Gt=!1,$t=0,So(e);const o=ga(e);Xa(o,()=>{R.setPose(o),Gt=!0,$t=0})}function $r(){!j||ut()||Q||!et||et.length===0||(za()&&re(),Q=!0,Pe("tour",!0),ie=!0,R.disable(),Lo(0))}function Mo(){if(!Q)return;Q=!1,Pe("tour",!1),Gt=!1,Y=null,ur();const t=R.getState();R.setPose({x:t.x,z:t.z,ry:t.ry}),j&&!ut()&&R.enable()}function Wa(){Q?Mo():$r()}function To(){!Q||et.length===0||Lo((Bt+1)%et.length)}function Ka(){!Q||et.length===0||Lo((Bt-1+et.length)%et.length)}function Wr(){Q&&(ie=!ie,$t=0,So(et[Bt]))}function Kr(t){let e=5381;for(let o=0;o<t.length;o++)e=(e<<5)+e+t.charCodeAt(o)>>>0;return e.toString(36)}function Vr({nickname:t,color:e,char:o}){Ye=t,kt={nickname:t,color:e,char:o},j=!0,er(),R.enable(),ei(),Sr();try{const a=tt&&tt.id||"link-"+Kr(window.location.hash||"");C=new Tn(nt,{nickname:t,color:e,char:o,roomId:`${kn}-${a}`}),Zt=new mi(a),C.onVisitor=(n,r)=>{Zt.addVisit(n),mr.add(r&&r.nickname,tt?tt.name:"")},C.onPhoto=n=>{Ra.addRemote(n),H(`${n.name||"누군가"}님이 관람 사진을 남겼어요 📸`)},Je&&clearInterval(Je),Je=setInterval(()=>{if(!C||!Zt)return;const n=[];for(const[r,l]of C.remoteAvatars)r.startsWith("npc-")||n.push({x:l.group.position.x,z:l.group.position.z});Zt.addDwell(n,ze(),2),br(Zt.summary(rt.length))},2e3),C.onChat=(n,r)=>Sa(n,r,!1),C.onPlayerCount=n=>nr(n),C.onStatus=qr,C.onGuestbook=Jr,C.onSelfHit=n=>{H(n>=3?"아야!! 너무해요 😭":"아야! 누가 때렸어요 😣"),P?P.hit(n):Nn(n)},C.onNpcHit=(n,r,l)=>{Yt&&Yt.onHit(n,r,l)},C.npcProvider=(n,r)=>{Yt||(Yt=new _n(ze()));const l=Yt.update(n,r),s=Yt.takeChat();return s&&C.sendNpcChat(s.name,s.text),l},C.connect()}catch(a){console.error("멀티플레이어 초기화 실패:",a),C=null,H("멀티플레이어 연결에 실패했습니다. 혼자 관람 모드로 진행합니다.")}}function qr(t){if(H(t),!(oa||!C)&&(t==="호스트로 개설됨"||t.startsWith("접속됨"))){oa=!0;try{C.sendGuestbook(rt)}catch(e){console.error("방명록 동기화 전송 실패:",e)}}}function Zr(t){if(!t)return;const e=An(Ye,t);if(rt=ha(rt,[e]),ba(De,rt),Eo(rt),C)try{C.sendGuestbook([e])}catch(o){console.error("방명록 전송 실패:",o)}}function Jr(t){rt=ha(rt,t),ba(De,rt),Eo(rt)}function Qr(t){if(t&&(Sa(Ye,t,!0),C))try{C.sendChat(t)}catch(e){console.error("채팅 전송 실패:",e),H("채팅 전송에 실패했습니다.")}}let ke=0;function tl(){let t=Ha.getDelta();if(at.soft){if(ke+=t,ke<.034)return;t=ke,ke=0}try{if(po&&po.update(t),R.update(t),C&&R.resolveBodyCollisions(C.getAvatarPositions()),Rr(t),Q&&Gt&&ie&&!Y&&!ut()&&($t+=t,$t>=Pr&&To()),wn(t),Yr(),C&&(C.sendState(R.getState()),C.update(t)),Lr(),gt&&P){const o=R.getState();P.group.position.set(o.x,o.y-bt,o.z),P.group.rotation.y=o.ry,Mt||(Mt={x:o.x,z:o.z});const a=t>0?Math.hypot(o.x-Mt.x,o.z-Mt.z)/t:0;Ne+=(a-Ne)*Math.min(1,10*t),Mt.x=o.x,Mt.z=o.z,P.update(t,Ne)}const e=fa(N.position);if(e?or(e):ar(),to+=1,ve+=t,ve>=.5){const o=to/ve;if(ir(Math.round(o)),to=0,ve=0,Jt=Math.max(0,Jt-.5),Jt===0&&j){if(!Lt&&o<kr){Lt=!0,Jt=10,o<16&&qe("low");const a=window.devicePixelRatio||1;L.setPixelRatio(Math.min(L.getPixelRatio(),Math.max(1,a*.75))),H("원활한 관람을 위해 화질을 잠시 낮췄어요")}else Lt&&o>Cr&&(Lt=!1,Jt=10,Qo());if(!Lt&&o>55){if(ye+=1,ye>=20){const a=bo();a==="low"?qe(null):a===null&&qe("high");const n=Math.min(2.5,Math.sqrt(Te.high/(window.innerWidth*window.innerHeight))),r=L.getPixelRatio();!at.soft&&r<n&&(L.setPixelRatio(Math.min(n,r+.25)),H("화질을 한 단계 높였어요 ✨")),ye=0}}else ye=0}}Ke+=t,Ke>=2&&(Ke=0,Lt&&Qo()),fo>0&&(Ve+=t,Ve>=fo&&(Ve=0,L.shadowMap.needsUpdate=!0)),!Zo&&j&&(Zo=!0,L.shadowMap.needsUpdate=!0),gt&&P?(Ya(),L.render(nt,N),Ua()):L.render(nt,N)}catch(e){console.error("렌더 루프 오류:",e),L.setAnimationLoop(null),H("오류가 발생했습니다. 페이지를 새로고침해 주세요.")}}function el(){N.aspect=window.innerWidth/window.innerHeight,N.updateProjectionMatrix(),L.setSize(window.innerWidth,window.innerHeight)}window.addEventListener("beforeunload",()=>{if(C)try{C.dispose()}catch{}});Br().catch(t=>{console.error("초기화 실패:",t);try{H("초기화 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.")}catch{document.body.insertAdjacentHTML("beforeend",`<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-family:${ae()};font-size:16px;text-align:center;">초기화 중 오류가 발생했습니다.<br>페이지를 새로고침해 주세요.</div>`)}});const Va=0,qa=7.5,ol=0,Ce=3.3,St=3.5,pt=.18,Ee=.2,al=7530209,nl=3.6,il=1.15,rl="ontouchstart"in window||(navigator.maxTouchPoints||0)>0;function ll(){const t=document.createElement("canvas");t.width=t.height=512;const e=t.getContext("2d");let o=20935;const a=()=>{o|=0,o=o+1831565813|0;let c=Math.imul(o^o>>>15,1|o);return c=c+Math.imul(c^c>>>7,61|c)^c,((c^c>>>14)>>>0)/4294967296},n=e.createLinearGradient(0,0,0,512);n.addColorStop(0,"#070a16"),n.addColorStop(.55,"#111a34"),n.addColorStop(1,"#1b2748"),e.fillStyle=n,e.fillRect(0,0,512,512);for(let c=0;c<140;c++){const u=a()*512,x=a()*310,f=a()<.08;e.fillStyle=`rgba(235,240,255,${(.28+a()*.6).toFixed(2)})`,e.fillRect(u,x,f?2:1,f?2:1)}const r=e.createRadialGradient(398,88,0,398,88,36);r.addColorStop(0,"rgba(236,239,232,0.9)"),r.addColorStop(.5,"rgba(226,232,224,0.42)"),r.addColorStop(1,"rgba(226,232,224,0)"),e.fillStyle=r,e.beginPath(),e.arc(398,88,36,0,7),e.fill(),e.fillStyle="rgba(240,243,236,0.95)",e.beginPath(),e.arc(398,88,15,0,7),e.fill();let l=0;for(;l<512;){const c=26+a()*48,u=130+a()*250,x=512-u;e.fillStyle=`rgb(${10+(a()*8|0)},${16+(a()*10|0)},${34+(a()*14|0)})`,e.fillRect(l,x,c,u);for(let f=x+12;f<506;f+=15)for(let g=l+6;g<l+c-6;g+=12)a()<.52||(e.fillStyle=a()<.72?"rgba(120,220,225,0.85)":"rgba(255,207,138,0.85)",e.fillRect(g,f,4,6));l+=c+2+a()*8}const s=new _e(t);return s.colorSpace=Ut,s}function sl(){const t=document.createElement("canvas");t.width=512,t.height=160;const e=t.getContext("2d");e.clearRect(0,0,512,160),e.font='700 92px "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif',e.textAlign="center",e.textBaseline="middle",e.shadowColor="rgba(114,230,225,0.95)",e.shadowBlur=30,e.fillStyle="rgba(175,244,240,0.96)",e.fillText("오픈월드",256,86),e.shadowBlur=0,e.fillStyle="rgba(224,252,250,0.92)",e.fillText("오픈월드",256,86);const o=new _e(t);return o.colorSpace=Ut,o}function cl(){const t=new ua,e=[new ce(Ce,pt,Ee).translate(0,pt/2,0),new ce(Ce,pt,Ee).translate(0,St-pt/2,0),new ce(pt,St,Ee).translate(-3.1199999999999997/2,St/2,0),new ce(pt,St,Ee).translate((Ce-pt)/2,St/2,0)],o=Cn(e);e.forEach(l=>l.dispose());const a=new eo({color:736570,emissive:al,emissiveIntensity:1.5,roughness:.4,metalness:.1});t.add(new Ht(o,a));const n=new Ht(new oe(Ce-2*pt,St-2*pt),new Io({map:ll(),toneMapped:!1}));n.position.set(0,St/2,.11),n.rotation.y=Math.PI,t.add(n);const r=new Ht(new oe(2.4,.75),new Io({map:sl(),transparent:!0,toneMapped:!1,depthWrite:!1,side:yn}));return r.rotation.x=Math.PI/2,r.scale.x=-1,r.position.set(0,.02,-1),t.add(r),t.position.set(Va,ol,qa),t.userData={frameMat:a,label:r},t}let Tt=null,Se=null,dt=null,ee=!1,xo=!1,Za=0,Ja=0;function dl(){dt||(dt=document.createElement("div"),dt.id="portal-hint",dt.textContent=rl?"탭하여 오픈월드로 이동 →":"클릭하거나 다가가면 오픈월드로 이동 →",dt.style.cssText='position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:40;padding:9px 16px;border-radius:999px;background:rgba(11,30,29,0.82);color:#c9fbf8;font:600 13px/1 "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;letter-spacing:-.01em;border:1px solid rgba(114,230,225,0.5);box-shadow:0 6px 20px -6px rgba(0,0,0,0.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap',document.body.appendChild(dt))}function Qa(){xo||(xo=!0,dt&&(dt.style.opacity="0"),location.href="world.html")}function tn(){if(requestAnimationFrame(tn),!Tt){if(Tt=window.__museum||null,!Tt)return;Se=cl(),Tt.scene.add(Se),dl()}const t=performance.now()/1e3,e=1.3+Math.sin(t*2.2)*.35;Se.userData.frameMat.emissiveIntensity=e,Se.userData.label.material.opacity=.78+Math.sin(t*2.2)*.2;const o=Tt.camera,a=Math.hypot(o.position.x-Va,o.position.z-qa),n=ee;ee=a<nl,ee!==n&&dt&&(dt.style.opacity=ee?"1":"0"),a<il&&Qa()}requestAnimationFrame(tn);addEventListener("pointerdown",t=>{Za=t.clientX,Ja=t.clientY},!0);addEventListener("pointerup",t=>{!ee||xo||!Tt||t.target===Tt.renderer.domElement&&(Math.hypot(t.clientX-Za,t.clientY-Ja)>8||Qa())},!0);
