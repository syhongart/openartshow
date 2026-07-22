/* empty css              */import{E as oa,h as aa,k as lt,W as na,l as rn,N as ia,S as Yt,a as ra,f as ln,F as sn,b as la,H as cn,D as je,M as Ut,d as Qt,m as Je,n as dn,G as sa,o as Me,V as ca,R as un,P as pn,A as fn,Q as hn,C as bn,i as ie,e as _o,p as gn}from"./vendor-three-B0rKCWya.js";import{E as bt,R as re,B as A,A as Qe,c as xn,s as mn,P as yn,m as vn}from"./scene-CihSpfzO.js";import{g as Te,c as bo,a as te,e as wn,b as kn,d as Cn,l as En,f as da,M as Sn,p as Ln,N as Mn,m as ua,s as pa,h as Tn,i as fa,j as Nn}from"./npc-dDSRJm0C.js";import{V as _n,P as zn}from"./feed-Cm56rHm1.js";import{n as Ye,D as ke,e as to,C as An,a as In,S as zo,c as Ao,d as Rn,f as Pn,g as On,h as Bn,i as Dn,j as jn,E as Yn,k as Un,H as Io,l as Hn,m as Xn,o as Fn,p as Ue,q as Gn,r as $n}from"./chibi-Cuo4liwA.js";import{g as vt,P as le,l as Wn,M as Kn,a as Vn,o as ha}from"./auth-aZ7HCW1S.js";let K=null,ee=null,Zt=!1;function qn(t,e){if(!K)return;const o=new StereoPannerNode(K,{pan:e});o.connect(ee);const a=2+Math.floor(Math.random()*4);let n=K.currentTime+.02;for(let r=0;r<a;r++){const l=K.createOscillator(),s=K.createGain();l.connect(s),s.connect(o);const c=t*(.85+Math.random()*.4),u=c*(Math.random()>.5?1.25:.78),g=.05+Math.random()*.1;l.type="sine",l.frequency.setValueAtTime(c,n),l.frequency.exponentialRampToValueAtTime(u,n+g),s.gain.setValueAtTime(1e-4,n),s.gain.exponentialRampToValueAtTime(.55,n+.012),s.gain.exponentialRampToValueAtTime(1e-4,n+g),l.start(n),l.stop(n+g+.02),n+=g+.04+Math.random()*.09}}function Zn(){const t=K.sampleRate*4,e=K.createBuffer(1,t,K.sampleRate),o=e.getChannelData(0);let a=0;for(let s=0;s<t;s++){const c=Math.random()*2-1;a=(a+.02*c)/1.02,o[s]=a*3.5}const n=K.createBufferSource();n.buffer=e,n.loop=!0;const r=K.createBiquadFilter();r.type="lowpass",r.frequency.value=400;const l=K.createGain();l.gain.value=.012,n.connect(r),r.connect(l),l.connect(ee),n.start()}function eo(){if(!Zt)return;const t=[{base:2600,pan:-.7},{base:3400,pan:.6},{base:4200,pan:.15}],e=t[Math.floor(Math.random()*t.length)];qn(e.base,e.pan+(Math.random()-.5)*.3);const o=900+Math.random()*4200;setTimeout(eo,o)}function Jn(){if(!Zt)try{K=new(window.AudioContext||window.webkitAudioContext),ee=K.createGain(),ee.gain.value=.05,ee.connect(K.destination),K.state==="suspended"&&K.resume(),Zt=!0,Zn(),eo(),setTimeout(()=>{Zt&&eo()},2500)}catch{Zt=!1}}const Wt=2.5,Ro=4.5,Po=.0022,Oo=.0058,se=lt.degToRad(89),Qn=.03,ti=7.5,ce=60,ht=.45,Bo=.65,ei=12;function oi(t,e){for(const o of A.stairs){const a=Math.min(o.x0,o.x1),n=Math.max(o.x0,o.x1);if(t<a||t>n)continue;const r=Math.min(o.z0,o.z1),l=Math.max(o.z0,o.z1);if(e<r||e>l)continue;const s=lt.clamp((e-o.z0)/(o.z1-o.z0),0,1);return o.yFrom+s*(o.yTo-o.yFrom)}return null}function ai(t,e,o){return e>=t.x0&&e<=t.x1&&o>=t.z0&&o<=t.z1}function ni(t,e){return t>=A.minX&&t<=A.maxX&&e>=A.minZ&&e<=A.maxZ}function ba(t,e){const o=[],a=oi(t,e);if(a!==null&&o.push(a),ni(t,e))for(const n of A.floors){const r=A.slabHoles[n.id]||[];let l=!1;for(const s of r)if(ai(s,t,e)){l=!0;break}l||o.push(n.y)}else o.push(0);return o}function ii(t,e,o){const a=ba(t,e);let n=null;for(const r of a)r<=o+Bo&&(n===null||r>n)&&(n=r);return n===null||o-n>Bo?null:n}function ri(t,e){let o=t,a=e;return e>A.minZ-ht&&e<A.maxZ+ht&&(o=lt.clamp(t,A.minX+ht,A.maxX-ht)),t>A.minX-ht&&t<A.maxX+ht&&(a=Math.max(e,A.minZ+ht)),{x:o,z:a}}class li{constructor(e,o){if(this.camera=e,this.domElement=o,this.enabled=!1,this.euler=new oa(0,0,0,"YXZ"),this.camera.rotation.set(0,0,0),this.camera.rotation.order="YXZ",this.camera.position.set(0,bt,8),this.keys={forward:!1,backward:!1,left:!1,right:!1,run:!1},this.velocity=new aa(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0,this.groundY=this.camera.position.y-bt,this.moveTouch=null,this.lookTouch=null,!document.getElementById("lu-joy-style")){const a=document.createElement("style");a.id="lu-joy-style",a.textContent=`
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
    inset 0 -2px 4px rgba(32,74,52,0.30); }`,document.head.appendChild(a)}this._joyBase=document.createElement("div"),this._joyBase.className="lu-joy-base",this._joyKnob=document.createElement("div"),this._joyKnob.className="lu-joy-knob",this._wasRunning=!1,document.body.appendChild(this._joyBase),document.body.appendChild(this._joyKnob),this._bindEvents()}_bindEvents(){this._onClick=()=>{this.enabled&&document.pointerLockElement!==this.domElement&&this.domElement.requestPointerLock?.()},this.domElement.addEventListener("click",this._onClick),this._onMouseMove=e=>{this.enabled&&document.pointerLockElement===this.domElement&&(this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=e.movementX*Po,this.euler.x-=e.movementY*Po,this.euler.x=lt.clamp(this.euler.x,-se,se),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler))},document.addEventListener("mousemove",this._onMouseMove),this._onKeyDown=e=>{if(!this.enabled)return;const o=e.target;o&&(o.tagName==="INPUT"||o.tagName==="TEXTAREA")||this._setKey(e.code,!0)},this._onKeyUp=e=>{this._setKey(e.code,!1)},document.addEventListener("keydown",this._onKeyDown),document.addEventListener("keyup",this._onKeyUp),this._onTouchStart=e=>{if(this.enabled){for(const o of e.changedTouches){const a=window.innerWidth*.5;o.clientX<a&&this.moveTouch===null?(this.moveTouch={id:o.identifier,startX:o.clientX,startY:o.clientY,dx:0,dy:0},this._joyBase.style.left=o.clientX+"px",this._joyBase.style.top=o.clientY+"px",this._joyKnob.style.left=o.clientX+"px",this._joyKnob.style.top=o.clientY+"px",this._joyBase.classList.add("lu-live"),this._joyKnob.classList.add("lu-live")):o.clientX>=a&&this.lookTouch===null&&(this.lookTouch={id:o.identifier,lastX:o.clientX,lastY:o.clientY})}e.cancelable&&e.preventDefault()}},this._onTouchMove=e=>{if(this.enabled){for(const o of e.changedTouches)if(this.moveTouch&&o.identifier===this.moveTouch.id){const a=o.clientX-this.moveTouch.startX,n=o.clientY-this.moveTouch.startY,r=Math.hypot(a,n),l=r>ce?ce/r:1;this.moveTouch.dx=a*l/ce,this.moveTouch.dy=n*l/ce,this._joyKnob.style.left=this.moveTouch.startX+a*l+"px",this._joyKnob.style.top=this.moveTouch.startY+n*l+"px";const s=Math.hypot(this.moveTouch.dx,this.moveTouch.dy)>.85;this._joyBase.classList.toggle("lu-run",s),this._joyKnob.classList.toggle("lu-run",s),s&&!this._wasRunning&&navigator.vibrate&&navigator.vibrate(10),this._wasRunning=s}else if(this.lookTouch&&o.identifier===this.lookTouch.id){const a=o.clientX-this.lookTouch.lastX,n=o.clientY-this.lookTouch.lastY;this.lookTouch.lastX=o.clientX,this.lookTouch.lastY=o.clientY,this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=a*Oo,this.euler.x-=n*Oo,this.euler.x=lt.clamp(this.euler.x,-se,se),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler)}e.cancelable&&e.preventDefault()}},this._onTouchEnd=e=>{for(const o of e.changedTouches)this.moveTouch&&o.identifier===this.moveTouch.id?(this.moveTouch=null,this._wasRunning=!1,this._joyBase.classList.remove("lu-live","lu-run"),this._joyKnob.classList.remove("lu-live","lu-run")):this.lookTouch&&o.identifier===this.lookTouch.id&&(this.lookTouch=null)},this.domElement.addEventListener("touchstart",this._onTouchStart,{passive:!1}),this.domElement.addEventListener("touchmove",this._onTouchMove,{passive:!1}),this.domElement.addEventListener("touchend",this._onTouchEnd),this.domElement.addEventListener("touchcancel",this._onTouchEnd)}_setKey(e,o){switch(e){case"KeyW":case"ArrowUp":this.keys.forward=o;break;case"KeyS":case"ArrowDown":this.keys.backward=o;break;case"KeyA":case"ArrowLeft":this.keys.left=o;break;case"KeyD":case"ArrowRight":this.keys.right=o;break;case"ShiftLeft":case"ShiftRight":this.keys.run=o;break}}_tryMove(e,o){const a=ri(e,o),n=lt.clamp(a.x,-24,re.bound),r=lt.clamp(a.z,-24,re.bound),l=A.maxZ,s=this.camera.position.z;if(n>A.minX-ht&&n<A.maxX+ht&&(s-l)*(r-l)<0&&Math.abs(n)>1.4)return null;const u=ii(n,r,this.groundY);return u===null?null:{x:n,z:r,y:u}}update(e){if(!this.enabled)return;e=Math.min(e,.1);let o=0,a=0;this.keys.forward&&(a-=1),this.keys.backward&&(a+=1),this.keys.left&&(o-=1),this.keys.right&&(o+=1);let n=this.keys.run?Ro:Wt;if(this.moveTouch&&o===0&&a===0){o=this.moveTouch.dx,a=this.moveTouch.dy;const E=Math.hypot(o,a);E<.14&&(o=0,a=0),n=Wt+(Ro-Wt)*Math.min(1,Math.max(0,(E-.85)/.15))}else{const E=Math.hypot(o,a);E>1&&(o/=E,a/=E)}this.euler.setFromQuaternion(this.camera.quaternion,"YXZ");const r=this.euler.y,l=Math.sin(r),s=Math.cos(r),c=(o*s+a*l)*n,u=(-o*l+a*s)*n,g=1-Math.exp(-10*e);this.velocity.x+=(c-this.velocity.x)*g,this.velocity.y+=(u-this.velocity.y)*g;const b=this.camera.position,p=b.x+this.velocity.x*e,S=b.z+this.velocity.y*e;let y=this._tryMove(p,S);if(!y){const E=this._tryMove(p,b.z),N=this._tryMove(b.x,S);y=E||N||null}y&&(b.x=y.x,b.z=y.z,this.groundY=y.y);const C=Math.hypot(this.velocity.x,this.velocity.y);if(C>.3){this.bobPhase+=e*ti*(C/Wt);const E=Math.min(1,C/Wt);this.bobOffset=Math.sin(this.bobPhase)*Qn*E}else this.bobOffset+=(0-this.bobOffset)*g,Math.abs(this.bobOffset)<5e-4&&(this.bobOffset=0,this.bobPhase=0);const j=Math.min(1,ei*e),v=this.groundY+bt+this.bobOffset+this.liftOffset;b.y+=(v-b.y)*j}resolveBodyCollisions(e){if(!this.enabled||!e||!e.length)return;const o=.6,a=1.2,n=this.camera.position;let r=n.x,l=n.z,s=!1,c=0,u=0;for(const p of e){if(!p||p.y!=null&&Math.abs(p.y-this.groundY)>a)continue;const S=r-p.x,y=l-p.z,C=Math.hypot(S,y);if(C>=o)continue;const j=C>1e-4?S/C:Math.sin(this.euler.y),v=C>1e-4?y/C:Math.cos(this.euler.y);r=p.x+j*o,l=p.z+v*o,c=j,u=v,s=!0}if(!s)return;const g=this._tryMove(r,l);g&&(n.x=g.x,n.z=g.z,this.groundY=g.y);const b=this.velocity.x*-c+this.velocity.y*-u;b>0&&(this.velocity.x+=c*b,this.velocity.y+=u*b)}getState(){return this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z,ry:this.euler.y}}setPose({x:e,y:o,z:a,ry:n}){const r=lt.clamp(e,-24,re.bound),l=lt.clamp(a,-24,re.bound);let s;if(o!=null)s=o-bt;else{const c=ba(r,l);s=c.length?Math.max(...c):0}this.groundY=s,this.camera.position.set(r,s+bt,l),this.euler.set(0,n,0,"YXZ"),this.camera.quaternion.setFromEuler(this.euler),this.velocity.set(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0}enable(){this.enabled=!0}disable(){this.enabled=!1,this.keys.forward=this.keys.backward=this.keys.left=this.keys.right=this.keys.run=!1,this.velocity.set(0,0),this.moveTouch=null,this.lookTouch=null,document.pointerLockElement===this.domElement&&document.exitPointerLock?.()}dispose(){this.disable(),this.domElement.removeEventListener("click",this._onClick),document.removeEventListener("mousemove",this._onMouseMove),document.removeEventListener("keydown",this._onKeyDown),document.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("touchstart",this._onTouchStart),this.domElement.removeEventListener("touchmove",this._onTouchMove),this.domElement.removeEventListener("touchend",this._onTouchEnd),this.domElement.removeEventListener("touchcancel",this._onTouchEnd)}}const si=3,ci=6,Do=2.2,di=.05;function ui({player:t,getSelfAvatar:e}){let o=!1,a=0,n=0,r=0;const l=y=>{if(y.code!=="Space"||!t||!t.enabled)return;const C=y.target;C&&(C.tagName==="INPUT"||C.tagName==="TEXTAREA")||(o=!0,y.preventDefault())},s=y=>{y.code==="Space"&&(o=!1)};document.addEventListener("keydown",l),document.addEventListener("keyup",s);let c=null;const u=typeof window<"u"&&window.matchMedia&&window.matchMedia("(pointer: coarse)").matches,g=y=>{o=!0,c&&c.classList.add("lu-fly-on"),y.cancelable&&y.preventDefault(),y.stopPropagation()},b=y=>{o=!1,c&&c.classList.remove("lu-fly-on"),y.stopPropagation()};u&&(c=document.createElement("button"),c.id="lu-fly-btn",c.type="button",c.setAttribute("aria-label","날기 — 누르고 있으면 상승"),c.textContent="▲",c.style.cssText=["position:fixed","right:20px","bottom:104px","width:64px","height:64px","border-radius:50%","border:1.5px solid rgba(255,255,255,0.34)","background:rgba(22,24,30,0.44)","color:rgba(255,255,255,0.92)","font-size:20px","line-height:1","z-index:6","display:none","align-items:center","justify-content:center","touch-action:none","user-select:none","-webkit-user-select:none","cursor:pointer","box-shadow:0 2px 12px rgba(0,0,0,0.32)","transition:background 0.12s, transform 0.12s, opacity 0.2s"].join(";"),c.addEventListener("touchstart",g,{passive:!1}),c.addEventListener("touchend",b),c.addEventListener("touchcancel",b),c.addEventListener("pointerdown",y=>{y.pointerType!=="touch"&&g(y)}),c.addEventListener("pointerup",y=>{y.pointerType!=="touch"&&b(y)}),document.body.appendChild(c));function p(y){const C=Math.min(y||0,.1),j=!!(t&&t.enabled);j||(o=!1),t&&t.liftOffset!==r&&(a=t.liftOffset,n=0),o?n=si:(n-=ci*C,n<-5&&(n=-5)),a+=n*C,a>=Do&&(a=Do,n=0),a<=0&&(a=0,n=0),t&&(t.liftOffset=a,r=a);const v=j&&a>di,E=e&&e();E&&typeof E.setFlying=="function"&&E.setFlying(v),c&&(c.style.display=j?"flex":"none")}function S(){document.removeEventListener("keydown",l),document.removeEventListener("keyup",s),c&&c.parentNode&&c.parentNode.removeChild(c)}return{update:p,dispose:S}}const pi="lu-stats-v1-",fi=3;function jo(){const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}function hi(){return{totalVisits:0,days:{},dwell:{}}}class bi{key;_seen;data;_saveTimer;constructor(e){this.key=pi+String(e||"default"),this._seen=new Set,this.data=hi();try{const o=localStorage.getItem(this.key);if(o){const a=JSON.parse(o);a&&typeof a=="object"&&(this.data={totalVisits:a.totalVisits|0,days:a.days&&typeof a.days=="object"?a.days:{},dwell:a.dwell&&typeof a.dwell=="object"?a.dwell:{}})}}catch{}this._saveTimer=null}_save(){this._saveTimer||(this._saveTimer=setTimeout(()=>{this._saveTimer=null;try{localStorage.setItem(this.key,JSON.stringify(this.data))}catch{}},2e3))}addVisit(e){if(!e||this._seen.has(e))return;this._seen.add(e),this.data.totalVisits+=1;const o=jo();this.data.days[o]=(this.data.days[o]|0)+1;const a=Object.keys(this.data.days).sort();for(;a.length>60;)delete this.data.days[a.shift()];this._save()}addDwell(e,o,a){if(!e||!e.length||!o||!o.length)return;let n=!1;for(const r of e){let l=null,s=fi;for(const c of o){const u=Math.hypot(c.pos.x-r.x,c.pos.z-r.z);u<s&&(s=u,l=c)}l&&l.title&&(this.data.dwell[l.title]=(this.data.dwell[l.title]||0)+a,n=!0)}n&&this._save()}summary(e){const a=[`오늘 방문 ${this.data.days[jo()]|0}`,`누적 ${this.data.totalVisits}`];typeof e=="number"&&a.push(`방명록 ${e}`);const n=Object.entries(this.data.dwell).sort((r,l)=>l[1]-r[1])[0];if(n&&n[1]>=10){const r=n[1]>=60?`${Math.round(n[1]/60)}분`:`${Math.round(n[1])}초`;a.push(`인기작 「${n[0]}」 ${r}`)}return a.join(" · ")}}const ga="#5f9e7d",gi=8,de=12;let d=null,O={onEnter:null,onChatSend:null,onAvatarChange:null,onMakerToggle:null},Yo=Qe[0];const xi="lu-chibi-look::",mi="lu-chibi-thumb::",yi="lu-chibi-closet::",vi="lu-chibi-look-v1",wi="lu-chibi-look-thumb-v1",Uo=12;function Oe(){const t=vt();return t&&t.provider&&t.name?`${t.provider}:${t.name}`:"guest"}function Ne(t){return xi+(t||Oe())}function go(t){return mi+(t||Oe())}function xa(t){return yi+(t||Oe())}function ki(){try{const t=localStorage.getItem(vi);if(t&&!localStorage.getItem(Ne("guest"))){localStorage.setItem(Ne("guest"),t);const e=localStorage.getItem(wi);e&&localStorage.setItem(go("guest"),e)}}catch{}}ki();function ma(t){try{const e=localStorage.getItem(Ne(t));if(!e)return null;const o=JSON.parse(e);return o&&typeof o=="object"?o:null}catch{return null}}function Ci(t,e){try{return localStorage.setItem(Ne(e),JSON.stringify(t)),!0}catch{return!1}}function Ho(t){try{return localStorage.getItem(go(t))||""}catch{return""}}function Ei(t,e){try{localStorage.setItem(go(e),t)}catch{}}let xo=null;function ya(){return xo||ma()}ha(()=>{xo=null});function He(t){try{const e=localStorage.getItem(xa(t));if(!e)return[];const o=JSON.parse(e);return Array.isArray(o)?o:[]}catch{return[]}}function Xo(t,e){try{return localStorage.setItem(xa(e),JSON.stringify(t)),!0}catch{return!1}}function Si(t,e,o){try{const a=document.createElement("canvas");return a.width=e,a.height=o,a.getContext("2d").drawImage(t,0,0,e,o),a.toDataURL("image/jpeg",.72)}catch{return""}}let mo=!1,oo=null,Fo=!1,zt=!1,ao=null,Tt=null,At=!1,no=null,It=!1,io=null,_e=null;const ue=120;let ft={onPrev:null,onNext:null,onExit:null,onToggleAuto:null};const Rt=typeof window<"u"&&"ontouchstart"in window||typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches;let st={onTour:null,onViewArtwork:null,onGuestbook:null,onCapture:null,onSelfView:null},Pt=!1,V={blob:null,dataUrl:"",galleryName:"",shareUrl:""},Nt=null,oe=!1,F=null,W=null,Dt=null,pe=0,fe=!1,Xe=0,he=0,Fe=Math.PI;const Li=lt.degToRad(18),Mi=.6;let ze=null,wt=null,Ae=null;function Ti(){const t=`
/* 폰트(@font-face·스택)는 SSOT인 vendor/fonts/fonts.css가 담당 — index.html <head>에서
   정적 <link>로 로드된다. 여기선 그 단일 스택(--app-font)만 --lu-font로 잇는다. */
:root {
  --lu-gold: ${ga};
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
`,e=document.createElement("style");e.id="lu-styles",e.textContent=t,document.head.appendChild(e)}function i(t,e={},o=[]){const a=document.createElement(t);for(const[n,r]of Object.entries(e))n==="className"?a.className=r:n==="text"?a.textContent=r:a.setAttribute(n,r);for(const n of o)a.appendChild(n);return a}function Ni(){const t=i("div",{id:"lu-loading",className:"lu"},[i("div",{className:"lu-spinner"}),i("div",{className:"lu-loading-text",text:"MUSEUM LOADING..."})]);return document.body.appendChild(t),t}function _i(){const t=i("div",{className:"lu-lobby-title",text:"OpenArtShow MUSEUM"}),e=i("div",{className:"lu-lobby-sub",text:"VIRTUAL EXHIBITION"}),o=i("div",{className:"lu-lobby-rule"}),a=i("div",{id:"lu-auth"}),n=i("div",{className:"lu-social-wrap"}),r=i("div",{className:"lu-logged-wrap"}),l=()=>{n.textContent="";for(const T of Object.keys(le)){const H=le[T],X=i("button",{className:`lu-social-btn lu-social-${T}`,type:"button"},[i("span",{className:"lu-social-badge",text:H.short}),i("span",{text:H.label})]);X.addEventListener("click",async()=>{X.disabled=!0,X.classList.add("lu-social-busy");try{await Wn(T)}catch{}X.disabled=!1,X.classList.remove("lu-social-busy")}),n.appendChild(X)}n.appendChild(i("div",{className:"lu-social-note",text:"계정 연동 준비 중 — 지금은 프로필 미리보기로 동작합니다"}))},s=T=>{r.textContent="";const H=i("span",{className:"lu-logged-avatar",text:T.initial||T.name.slice(0,1)}),X=i("span",{className:"lu-logged-name",text:`${T.name}님`}),J=i("span",{className:"lu-logged-via",text:le[T.provider]?le[T.provider].short:""}),P=i("button",{className:"lu-logout-btn",type:"button",text:"로그아웃"});P.addEventListener("click",()=>Vn()),r.appendChild(i("div",{className:"lu-logged-chip"},[H,X,J,P]))},c=T=>{T?(s(T),n.style.display="none",r.style.display="",b.value=T.name.slice(0,de)):(n.style.display="",r.style.display="none",(!b.value||Object.values(Kn).includes(b.value))&&(b.value="게스트")),C()};l(),a.appendChild(n),a.appendChild(r);const u=i("div",{className:"lu-auth-or"},[i("span",{text:"소셜 계정 연동 (준비 중)"})]),g=i("label",{className:"lu-field-label",for:"lu-nickname",text:"닉네임"}),b=i("input",{id:"lu-nickname",type:"text",maxlength:String(de),value:"게스트",autocomplete:"off",spellcheck:"false"}),p=i("div",{className:"lu-field-hint",text:`최대 ${de}자 · 비워두면 '게스트'로 입장합니다`}),S=i("div",{className:"lu-field-label",text:"캐릭터",style:"margin-top:26px;"}),y=i("button",{id:"lu-char-design",className:"lu-char-design-btn",type:"button","aria-label":"캐릭터 디자인 — 나만의 아야모 만들기"});function C(){const T=Ho();y.textContent="";const H=i("span",{className:"lu-char-design-media"});T?(H.classList.add("lu-has-thumb"),H.style.backgroundImage=`url('${T}')`):H.textContent="🎨";const X=i("span",{className:"lu-char-design-txt"},[i("b",{text:"캐릭터 디자인"}),i("span",{text:T?"내 아야모 편집하기":"나만의 아야모 만들기 (선택)"})]);y.append(H,X,i("span",{className:"lu-char-design-arrow",text:"›"}))}C(),y.addEventListener("click",()=>yo());const j=i("button",{id:"lu-enter-btn",type:"button",text:"입장하기"}),v=i("div",{id:"lu-picker"}),E=i("div",{className:"lu-lobby-divider"}),N=i("a",{className:"lu-studio-link",href:"./studio.html",target:"_blank",rel:"noopener noreferrer",text:"작가 스튜디오에서 나만의 전시 만들기 →"}),G=i("div",{className:"lu-lobby-form"},[g,b,p,S,y,j,u,a]),U=i("div",{className:"lu-quick-enter"});function w(){U.textContent="";const T=vt(),H=Ho(),X=i("span",{className:"lu-quick-avatar"});H?X.style.backgroundImage=`url('${H}')`:X.textContent="🙂";const J=i("div",{className:"lu-quick-greet"},[i("b",{text:(T?`${T.name}님, `:"")+"다시 오셨어요"}),i("span",{text:"저장한 모습으로 바로 입장할 수 있어요"})]),P=i("button",{className:"lu-quick-btn",type:"button",text:"바로 입장"});P.addEventListener("click",nt);const ct=i("button",{className:"lu-quick-change",type:"button",text:"닉네임·캐릭터 바꾸기"});ct.addEventListener("click",()=>{G.classList.remove("lu-collapsed"),U.style.display="none";try{b.focus()}catch{}}),U.append(X,J,P,ct)}!!(vt()||ma())?(w(),G.classList.add("lu-collapsed")):U.style.display="none";const et=i("div",{className:"lu-lobby-card"},[t,e,o,U,G,v,E,N]),Z=i("div",{id:"lu-lobby",className:"lu"},[et]);document.body.appendChild(Z),c(vt()),ha(c);function nt(){let T=b.value.trim().slice(0,de);T||(T="게스트");let H=0;for(let J=0;J<T.length;J++)H=H*31+T.charCodeAt(J)>>>0;Yo=Qe[H%Qe.length];const X=to(Object.assign({},ke,ya()||{}));typeof O.onEnter=="function"&&O.onEnter({nickname:T,color:Yo,char:X})}j.addEventListener("click",nt),b.addEventListener("keydown",T=>{T.stopPropagation(),T.key==="Enter"&&nt()}),b.addEventListener("keyup",T=>T.stopPropagation());function Ct(){C()}return{overlay:Z,nickInput:b,pickerBox:v,onChibiSaved:Ct}}function zi(){const t=Rt?[["왼쪽 드래그","이동"],["오른쪽 드래그","시점 회전"],["캐릭터 탭","콕 찌르기"],["작품 카드","탭하여 크게 보기"]]:[["마우스 드래그","시점 회전"],["W A S D","이동"],["Shift","달리기"],["Enter","채팅"],["M","작품 목록"],["T","투어"],["G","방명록"],["V","내 모습 보기"],["C","캐릭터 디자인"],["P","사진 촬영"],["클릭","캐릭터 콕 찌르기"]],e=i("div",{id:"lu-controls",className:"lu lu-hud"});if(e.appendChild(i("div",{className:"lu-controls-title",text:"CONTROLS"})),t.forEach(([o,a])=>{const n=i("div",{},[i("span",{className:"lu-key",text:o}),i("span",{text:a})]);e.appendChild(n)}),document.body.appendChild(e),Rt){e.classList.add("lu-collapsed");const o=i("button",{id:"lu-controls-toggle",className:"lu lu-hud",type:"button","aria-label":"조작법 보기",text:"?"});o.addEventListener("click",()=>{e.classList.toggle("lu-collapsed")}),document.body.appendChild(o)}return e}function Ai(){if(!Rt)return null;function t(){const E=d&&d.chat&&d.chat.wrap;if(!E)return;const N=E.classList.toggle("lu-chat-collapsed");!N&&d.chat.input?d.chat.input.focus():d.chat.input&&d.chat.input.blur(),r.classList.toggle("lu-on",!N)}const e={chat:'<path d="M20 15a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',tour:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z"/>',capture:'<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',more:'<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',list:'<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',self:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',help:'<path d="M9.2 9a2.9 2.9 0 1 1 4.2 2.6c-.9.45-1.4 1.05-1.4 2.1"/><circle cx="12" cy="17.4" r="1" fill="currentColor" stroke="none"/>',dress:'<path d="M9 4l3 3 3-3M9 4l-1.5 5 4.5 3 4.5-3L18 4M7.5 9l-2 8h13l-2-8"/>'};function o(E){const N=document.createElement("span");return N.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+e[E]+"</svg>",N.firstChild}function a(E,N,G,U){const w=i("button",{className:E,type:"button","aria-label":N});w.appendChild(o(G)),w.appendChild(i("span",{className:"lu-dock-label",text:U}));const $=i("div",{className:"lu-dock-wrap"},[w]);return{b:w,wrap:$}}const n=a("lu-dock-btn","채팅 열기/닫기","chat","채팅"),r=n.b;n.wrap.style.display="none",r.addEventListener("click",t);const l=a("lu-dock-btn","투어 시작/종료","tour","투어"),s=l.b;s.addEventListener("click",()=>{typeof st.onTour=="function"&&st.onTour()});const c=a("lu-dock-btn lu-gold","사진 촬영","capture","캡처"),u=c.b;u.addEventListener("click",()=>{u.classList.remove("lu-cap-pop"),u.offsetWidth,u.classList.add("lu-cap-pop"),typeof st.onCapture=="function"&&st.onCapture()});const g=a("lu-dock-btn","더보기","more","메뉴"),b=g.b,p=i("div",{id:"lu-more-backdrop"}),S=i("div",{id:"lu-more-sheet"});function y(){S.classList.remove("lu-open"),p.classList.remove("lu-open")}function C(E,N,G){const U=i("button",{className:"lu-sheet-btn",type:"button"});return U.appendChild(o(E)),U.appendChild(i("span",{text:N})),U.addEventListener("click",()=>{y(),G()}),U}const j=i("div",{className:"lu-sheet-grid"},[C("list","작품 목록",()=>Ma()),C("self","내 모습",()=>{typeof st.onSelfView=="function"&&st.onSelfView()}),C("dress","캐릭터 디자인",()=>yo()),C("chat","채팅",t),C("help","조작법",()=>{const E=document.getElementById("lu-controls");E&&E.classList.toggle("lu-collapsed")})]);S.append(i("div",{className:"lu-sheet-handle"}),j),p.addEventListener("click",y),b.addEventListener("click",()=>{const E=S.classList.toggle("lu-open");p.classList.toggle("lu-open",E)}),document.body.appendChild(p),document.body.appendChild(S);const v=i("div",{id:"lu-dock",className:"lu lu-hud"},[n.wrap,l.wrap,c.wrap,g.wrap]);return document.body.appendChild(v),_t={chatBtn:r,chatWrap:n.wrap,tourBtn:s,selfBtn:null,dock:v},v}let _t=null;function Ie(t,e){_t&&t==="tour"&&_t.tourBtn&&_t.tourBtn.classList.toggle("lu-on",!!e)}function Ii(){const t=i("span",{text:"--"}),e=i("div",{className:"lu-stat"});e.append("FPS ");const o=i("b");o.appendChild(t),e.appendChild(o);const a=i("div",{id:"lu-topright",className:"lu lu-hud"},[e]);return document.body.appendChild(a),{wrap:a,fps:t,count:i("span"),countWrap:null}}function Ri(){const t=i("div",{id:"lu-status",className:"lu lu-hud"});return document.body.appendChild(t),t}function Pi(){const t=i("div",{id:"lu-chat-log"}),e=i("input",{id:"lu-chat-input",type:"text",maxlength:"120",placeholder:Rt?"탭하여 채팅…":"Enter 키로 채팅…",autocomplete:"off",spellcheck:"false"}),o=i("div",{id:"lu-chat",className:"lu lu-hud"},[t,e]);return Rt&&o.classList.add("lu-chat-collapsed"),document.body.appendChild(o),e.addEventListener("keydown",a=>{if(a.stopPropagation(),a.key==="Enter"){const n=e.value.trim();e.value="",e.blur(),n&&typeof O.onChatSend=="function"&&O.onChatSend(n)}else a.key==="Escape"&&(e.value="",e.blur())}),e.addEventListener("keyup",a=>a.stopPropagation()),e.addEventListener("keypress",a=>a.stopPropagation()),{wrap:o,log:t,input:e}}function Oi(){const t=i("div",{className:"lu-art-eyebrow",text:"ARTWORK"}),e=i("div",{className:"lu-art-title"}),o=i("div",{className:"lu-art-meta"}),a=i("div",{className:"lu-art-rule"}),n=i("div",{className:"lu-art-desc"}),r=i("button",{className:"lu-art-hint",type:"button"});Rt?r.appendChild(document.createTextNode("크게 보기")):(r.appendChild(i("span",{className:"lu-key",text:"E"})),r.appendChild(document.createTextNode(" — 크게 보기"))),r.addEventListener("click",s=>{s.stopPropagation(),typeof st.onViewArtwork=="function"&&st.onViewArtwork()});const l=i("div",{id:"lu-artwork",className:"lu"},[t,e,o,a,n,r]);return Rt&&l.addEventListener("click",()=>{typeof st.onViewArtwork=="function"&&st.onViewArtwork()}),document.body.appendChild(l),{panel:l,title:e,meta:o,desc:n}}function Bi(){const t=i("span",{className:"lu-topbar-title"}),e=i("b",{text:"1"}),o=i("span",{className:"lu-topbar-count"});o.appendChild(e),o.append(" 명");const a=i("div",{id:"lu-topbar",className:"lu lu-hud lu-cut-s lu-empty"},[t,i("span",{className:"lu-topbar-sep"}),o]);return document.body.appendChild(a),a._count=e,a._countWrap=o,a}function Di(){const t=i("button",{id:"lu-lightbox-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{className:"lu-lightbox-stage"}),o=i("div",{className:"lu-lightbox-title"}),a=i("div",{className:"lu-lightbox-meta"}),n=i("div",{className:"lu-lightbox-rule"}),r=i("div",{className:"lu-lightbox-desc"}),l=i("div",{className:"lu-lightbox-caption"},[o,a,n,r]),s=i("div",{id:"lu-lightbox",className:"lu"},[t,e,l]);document.body.appendChild(s),t.addEventListener("click",()=>Ee()),s.addEventListener("click",w=>{(w.target===s||w.target===e)&&Ee()});const c=new Map;let u=1,g=0,b=0,p=0,S=1,y=0,C=0,j=0,v=null;function E(){return e.querySelector(".lu-lightbox-media")}function N(){const w=E();w&&(w.style.transform=`translate(${g}px, ${b}px) scale(${u})`)}function G(){u=1,g=0,b=0,N()}s.addEventListener("pointerdown",w=>{if(c.set(w.pointerId,{x:w.clientX,y:w.clientY}),c.size===1&&(v={x:w.clientX,y:w.clientY,t:performance.now()}),c.size===2){const[$,et]=[...c.values()];p=Math.hypot($.x-et.x,$.y-et.y),S=u}}),s.addEventListener("pointermove",w=>{const $=c.get(w.pointerId);if(!$)return;const et=w.clientX-$.x,Z=w.clientY-$.y;if($.x=w.clientX,$.y=w.clientY,c.size===2&&p>0){const[nt,Ct]=[...c.values()];u=Math.min(4,Math.max(1,S*(Math.hypot(nt.x-Ct.x,nt.y-Ct.y)/p))),u===1&&(g=0,b=0),N()}else c.size===1&&u>1&&(g+=et,b+=Z,N())});function U(w){if(c.delete(w.pointerId),c.size!==0||!v)return;const $=performance.now()-v.t,et=w.clientX-v.x,Z=w.clientY-v.y;if(v=null,u===1&&$<600){if(Math.abs(et)>64&&Math.abs(Z)<56){ji(et<0?1:-1);return}if(Z>84&&Math.abs(et)<60){Ee();return}}if(Math.abs(et)<12&&Math.abs(Z)<12&&$<350){const nt=performance.now();if(nt-y<320&&Math.hypot(w.clientX-C,w.clientY-j)<44){u>1?G():(u=2.4,N()),y=0;return}y=nt,C=w.clientX,j=w.clientY}}return s.addEventListener("pointerup",U),s.addEventListener("pointercancel",w=>c.delete(w.pointerId)),{overlay:s,closeBtn:t,stage:e,title:o,meta:a,rule:n,desc:r,resetZoom:G}}let ro=null;function ji(t){const e=Te();if(!ro||e.length<2)return;const o=e.indexOf(ro),a=e[((o===-1?0:o)+t+e.length)%e.length];La(a)}const Go="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#eaeae6"/></svg>');function va(t){const e=d.artworkList.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(i("div",{className:"lu-artlist-empty",text:"표시할 작품이 없습니다"}));return}t.forEach(o=>{const a=i("img",{className:"lu-artlist-thumb",src:o.imageUrl||Go,alt:o.title||"",loading:"lazy"});a.addEventListener("error",()=>{a.src=Go},{once:!0});const n=i("div",{className:"lu-artlist-info"},[i("div",{className:"lu-artlist-name",text:o.title||""}),i("div",{className:"lu-artlist-artist",text:o.artist||""})]),r=i("button",{type:"button",className:"lu-artlist-card"},[a,n]);r.addEventListener("click",()=>{ne(),typeof no=="function"&&no(o)}),e.appendChild(r)})}function Yi(){const t=i("button",{id:"lu-artlist-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{id:"lu-artlist-head"},[i("div",{id:"lu-artlist-title",text:"작품 목록"}),t]),o=i("div",{id:"lu-artlist-body"}),a=i("div",{id:"lu-artlist",className:"lu"},[e,o]);return document.body.appendChild(a),t.addEventListener("click",()=>ne()),{panel:a,body:o}}function Ui(t){const e=Date.now(),o=Math.max(0,e-t),a=Math.floor(o/6e4);if(a<1)return"방금 전";if(a<60)return`${a}분 전`;const n=Math.floor(a/60);if(n<24)return`${n}시간 전`;const r=new Date(t),l=new Date(e),s=p=>new Date(p.getFullYear(),p.getMonth(),p.getDate()).getTime();if(Math.round((s(l)-s(r))/864e5)<=1)return"어제";const u=r.getFullYear(),g=String(r.getMonth()+1).padStart(2,"0"),b=String(r.getDate()).padStart(2,"0");return`${u}.${g}.${b}`}function wa(t){const e=d.guestbook.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(i("div",{className:"lu-gbook-empty",text:"첫 방명록을 남겨보세요"}));return}const o=["#e07a5f","#81b29a","#5f9e7d","#8e7dbe","#6a8caf","#d68fb8"];t.forEach(a=>{const n=a.name||"게스트";let r=0;for(let u=0;u<n.length;u++)r=r*31+n.charCodeAt(u)>>>0;const l=i("span",{className:"lu-gbook-dot"});l.style.background=o[r%o.length];const s=i("div",{},[l,i("span",{className:"lu-gbook-name",text:n}),i("span",{className:"lu-gbook-time",text:Ui(a.ts)})]),c=i("div",{className:"lu-gbook-text",text:a.text||""});e.appendChild(i("div",{className:"lu-gbook-note"},[s,c]))})}function Hi(){const t=i("button",{id:"lu-guestbook-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{id:"lu-guestbook-head"},[i("div",{id:"lu-guestbook-title"},[i("span",{className:"lu-gb-eyebrow",text:"GUESTBOOK"}),i("span",{className:"lu-gb-main",text:"방명록"}),i("span",{className:"lu-gb-sub",text:"다녀간 마음을 한 줄 남겨 주세요"})]),t]),o=i("div",{id:"lu-guestbook-body"}),a=i("textarea",{id:"lu-gbook-input",rows:"3",maxlength:String(ue),placeholder:"전시에 한 줄 메모를 남겨보세요…",spellcheck:"false"}),n=i("span",{className:"lu-gbook-count",text:`0/${ue}`}),r=i("button",{id:"lu-gbook-submit",type:"button",text:"남기기"});r.disabled=!0;const l=i("div",{className:"lu-gbook-footer-row"},[n,r]),s=i("div",{id:"lu-gbook-stats",style:"font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.45);padding:6px 2px 0;"}),c=i("div",{id:"lu-guestbook-footer"},[a,l,s]),u=i("button",{id:"lu-gbtab",type:"button","aria-label":"방명록 열기/닫기 (위아래로 드래그해 위치 이동)",title:"드래그해서 위치를 옮길 수 있어요",text:"방명록"}),g="lu-gbtab-top-v1";try{const v=parseFloat(localStorage.getItem(g));Number.isFinite(v)&&(u.style.top=b(v)+"px")}catch{}function b(v){const E=Math.max(80,(window.innerHeight||800)-140);return Math.min(E,Math.max(60,v))}let p=null;u.addEventListener("pointerdown",v=>{const E=u.getBoundingClientRect();p={startY:v.clientY,startTop:E.top,moved:!1},u.setPointerCapture(v.pointerId)}),u.addEventListener("pointermove",v=>{if(!p)return;const E=v.clientY-p.startY;Math.abs(E)>6&&(p.moved=!0),p.moved&&(u.style.top=b(p.startTop+E)+"px")});const S=()=>{if(p&&p.moved)try{localStorage.setItem(g,String(parseFloat(u.style.top)))}catch{}setTimeout(()=>{p=null},0)};u.addEventListener("pointerup",S),u.addEventListener("pointercancel",S),u.addEventListener("click",()=>{p&&p.moved||vo()});const y=i("div",{id:"lu-guestbook",className:"lu"},[e,o,c,u]);document.body.appendChild(y),t.addEventListener("click",()=>wo());function C(){const v=a.value.length;n.textContent=`${v}/${ue}`,r.disabled=a.value.trim().length===0}function j(){const v=a.value.trim().slice(0,ue);v&&(a.value="",C(),a.blur(),typeof io=="function"&&io(v))}return a.addEventListener("keydown",v=>{v.stopPropagation(),v.key==="Escape"?(a.value="",C(),a.blur()):v.key==="Enter"&&(v.ctrlKey||v.metaKey)&&(v.preventDefault(),j())}),a.addEventListener("keyup",v=>v.stopPropagation()),a.addEventListener("keypress",v=>v.stopPropagation()),a.addEventListener("input",C),r.addEventListener("click",j),{panel:y,body:o,input:a,count:n,submitBtn:r,tab:u}}function Xi(){const t=i("button",{type:"button","aria-label":"이전 작품",text:"◀ 이전"}),e=i("span",{className:"lu-tour-sep"}),o=i("span",{className:"lu-tour-count"}),a=i("span",{className:"lu-tour-title"}),n=i("span",{className:"lu-tour-sep"}),r=i("button",{type:"button","aria-label":"다음 작품",text:"다음 ▶"}),l=i("span",{className:"lu-tour-sep"}),s=i("button",{type:"button",className:"lu-tour-auto"}),c=i("span",{className:"lu-tour-sep"}),u=i("button",{id:"lu-tourbar-exit",type:"button","aria-label":"투어 종료",text:"✕ 종료"}),g=i("div",{id:"lu-tourbar",className:"lu"},[t,e,o,a,n,r,l,s,c,u]);return document.body.appendChild(g),t.addEventListener("click",()=>{ft.onPrev&&ft.onPrev()}),r.addEventListener("click",()=>{ft.onNext&&ft.onNext()}),u.addEventListener("click",()=>{ft.onExit&&ft.onExit()}),s.addEventListener("click",()=>{ft.onToggleAuto&&ft.onToggleAuto()}),{bar:g,prevBtn:t,nextBtn:r,autoBtn:s,exitBtn:u,countEl:o,titleEl:a}}function Fi(){const t=i("div",{id:"lu-shutter",className:"lu"});return document.body.appendChild(t),t}function Gi(){const t=i("button",{id:"lu-share-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{className:"lu-share-title",text:"전시 공유하기"}),o=i("img",{className:"lu-share-preview",alt:"캡처한 전시 화면"}),a=i("button",{className:"lu-share-btn lu-share-btn-primary",type:"button",text:"기기로 공유"}),n=i("button",{className:"lu-share-btn",type:"button",text:"이미지 저장"}),r=i("button",{className:"lu-share-btn",type:"button",text:"X에 공유"}),l=i("button",{className:"lu-share-btn",type:"button",text:"Threads에 공유"}),s=i("button",{className:"lu-share-btn",type:"button",text:"링크 복사"}),c=i("div",{className:"lu-share-actions"},[a,n,r,l,s]),u=i("div",{className:"lu-share-hint",text:"인스타그램은 이미지를 저장하거나 기기로 공유한 뒤 앱에서 올려주세요"}),g=i("div",{className:"lu-share-card"},[t,e,o,c,u]),b=i("div",{id:"lu-share",className:"lu"},[g]);return document.body.appendChild(b),t.addEventListener("click",()=>lo()),b.addEventListener("click",p=>{p.target===b&&lo()}),a.addEventListener("click",async()=>{if(!(!V.blob||typeof navigator>"u"||typeof navigator.share!="function"))try{const p=new File([V.blob],"artshow.png",{type:"image/png"});await navigator.share({files:[p],title:V.galleryName||"OpenArtShow",text:`${V.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`})}catch{}}),n.addEventListener("click",()=>{if(!V.dataUrl)return;const p=document.createElement("a");p.href=V.dataUrl,p.download="artshow.png",document.body.appendChild(p),p.click(),document.body.removeChild(p)}),r.addEventListener("click",()=>{const p=`${V.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`,S=`https://twitter.com/intent/tweet?text=${encodeURIComponent(p)}&url=${encodeURIComponent(V.shareUrl||"")}`;window.open(S,"_blank","noopener")}),l.addEventListener("click",()=>{const p=`${V.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시 ${V.shareUrl||""}`,S=`https://www.threads.net/intent/post?text=${encodeURIComponent(p)}`;window.open(S,"_blank","noopener")}),s.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(V.shareUrl||""),Nt&&clearTimeout(Nt),s.textContent="복사됨",s.classList.add("lu-share-btn-copied"),Nt=setTimeout(()=>{s.textContent="링크 복사",s.classList.remove("lu-share-btn-copied"),Nt=null},1600)}catch{}}),{overlay:b,card:g,title:e,preview:o,deviceBtn:a,saveBtn:n,xBtn:r,threadsBtn:l,copyBtn:s}}const $o='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 19.5C4.5 10 11 4 20 4c0 9-6 15.5-15.5 15.5A1 1 0 0 1 4.5 19.5Z"/><path d="M6.7 17.3C10.2 13.3 14.2 9.3 18 5.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>',$i=[{id:"species",label:"종족",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8.3" r="2.1"/><circle cx="12" cy="6.1" r="2.1"/><circle cx="17" cy="8.3" r="2.1"/><path d="M12 11.6c-3.4 0-6.1 2.4-6.1 5.2 0 2 1.8 3.3 3.7 2.6.9-.3 1.7-.3 2.6 0 1.9.7 3.7-.6 3.7-2.6 0-2.8-2.5-5.2-5.9-5.2Z"/></svg>'},{id:"face",label:"얼굴",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><path d="M8.6 14.6c1 1.1 2.1 1.7 3.4 1.7s2.4-.6 3.4-1.7"/></svg>'},{id:"hair",label:"헤어",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12.5C5 8 8.1 4.5 12 4.5s7 3.5 7 8"/><path d="M6.3 12.5v3.2M10.1 12.5v4.2M13.9 12.5v4.2M17.7 12.5v3.2"/></svg>'},{id:"outfit",label:"의상",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8.3 4.2 4.3 7.3l2 3 2-1.1v9.6h7.4V9.2l2 1.1 2-3-4-3.1c-.7 1-1.8 1.6-3.7 1.6s-3-.6-3.7-1.6Z"/></svg>'},{id:"acc",label:"장식",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.5 3.5 1.7 6.3 5.2 7.6-3.5 1.3-4.7 4.1-5.2 7.6-.5-3.5-1.7-6.3-5.2-7.6C10.3 9.3 11.5 6.5 12 3Z"/><circle cx="19" cy="5.2" r="1.2"/></svg>'},{id:"closet",label:"옷장",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.3"/><path d="M12 5.9v1.8"/><path d="M12 7.7 4.3 13.4h15.4L12 7.7Z"/><path d="M4.3 17.4h15.4"/></svg>'}];function Wi(){const t=i("button",{id:"lu-am-save",type:"button","aria-label":"이 캐릭터 사용",title:"이 캐릭터 사용",text:"✓"}),e=i("button",{id:"lu-am-close",type:"button","aria-label":"닫기",text:"×"}),o=i("span",{className:"lu-am-title-icon","aria-hidden":"true"});o.innerHTML=$o;const a=i("div",{className:"lu-am-title"},[o,i("span",{text:"캐릭터 디자인"})]),n=i("div",{className:"lu-am-head-actions"},[t,e]),r=i("div",{className:"lu-am-head"},[a,n]),l=i("canvas",{width:"300",height:"400"}),s=i("div",{className:"lu-am-stage"},[l]),c=i("div",{className:"lu-am-stagewrap"},[s]),u=i("div",{className:"lu-am-preview"},[c]),g=["wave","jump","clap","dance","breakdance","run","jumpingjack","heart","kick"];let b=1,p=null,S=null,y=null,C=null;function j(f,x){if(typeof document>"u")return null;const h=document.createElement("canvas");h.width=2,h.height=256;const k=h.getContext("2d"),m=k.createLinearGradient(0,0,0,256);m.addColorStop(0,f),m.addColorStop(1,x),k.fillStyle=m,k.fillRect(0,0,2,256);const z=new Me(h);return z.colorSpace=Yt,z}function v(f,x){if(typeof document>"u")return null;const h=512,k=307,m=document.createElement("canvas");m.width=h,m.height=k;const z=m.getContext("2d");z.fillStyle=f,z.fillRect(0,0,h,k);const it=28,mt=h/it;z.fillStyle=x;for(let $t=0;$t<it;$t++)z.fillRect($t*mt,0,mt/2,k);const Gt=new Me(m);return Gt.colorSpace=Yt,Gt.anisotropy=4,Gt}function E(){if(p)return;p=new na({canvas:l,antialias:!0,alpha:!0}),p.setPixelRatio(Math.min(2,typeof window<"u"&&window.devicePixelRatio||1)),p.setSize(300,400,!1),p.shadowMap.enabled=!0,p.shadowMap.type=rn,p.toneMapping=ia,p.toneMappingExposure=1,p.outputColorSpace=Yt,S=new ra,S.background=j("#f0ead9","#ddd2bd")||new ln("#ddd2bd"),S.fog=new sn(14603199,5.5,10),y=new la(30,300/400,.1,20),y.position.set(0,1,4),y.lookAt(0,.85,0),S.add(new cn(16775924,2367256,.65));const f=new je(16777215,1.4);f.position.set(.7,2,2.6),S.add(f);const x=new je(16776696,.4);x.position.set(-1.8,1.1,1.6),S.add(x);const h=new je(16777215,0);h.position.set(.4,5,1),h.castShadow=!0,h.shadow.mapSize.set(512,512),h.shadow.camera.near=.5,h.shadow.camera.far=9,h.shadow.camera.left=-1.3,h.shadow.camera.right=1.3,h.shadow.camera.top=1.3,h.shadow.camera.bottom=-1.3,h.shadow.radius=35,h.shadow.blurSamples=24,h.shadow.bias=-5e-4,S.add(h),S.add(h.target);const k=new Ut(new Qt(6,6),new Je({color:12165231,roughness:.9,metalness:0}));k.rotation.x=-Math.PI/2,k.position.y=0,k.receiveShadow=!0,S.add(k);const m=new Ut(new Qt(6,6),new dn({opacity:.3}));m.rotation.x=-Math.PI/2,m.position.y=.002,m.material.polygonOffset=!0,m.material.polygonOffsetFactor=-1,m.receiveShadow=!0,S.add(m);const z=v("#e2d7bf","#efe7d3"),it=new Ut(new Qt(10,6),new Je({map:z,roughness:.9,metalness:0}));it.position.set(0,2.2,-2.3),S.add(it),C=new sa,C.rotation.y=Math.PI,S.add(C)}let N="species";const G=i("div",{className:"lu-am-nav",role:"tablist","aria-label":"캐릭터 디자인 카테고리"}),U=i("div",{className:"lu-am-panel"}),w=i("div",{className:"lu-am-tabpage",id:"lu-am-tabpanel",role:"tabpanel",tabindex:"0"});U.appendChild(G),U.appendChild(w),G.addEventListener("keydown",f=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(f.key))return;const x=[...G.querySelectorAll(".lu-am-navtab")];if(!x.length)return;const h=x.findIndex(z=>z.getAttribute("aria-selected")==="true");let k=h<0?0:h;f.key==="ArrowLeft"?k=(h-1+x.length)%x.length:f.key==="ArrowRight"?k=(h+1)%x.length:f.key==="Home"?k=0:f.key==="End"&&(k=x.length-1),f.preventDefault(),x[k].click();const m=G.querySelectorAll(".lu-am-navtab")[k];m&&m.focus()});const $=i("div",{className:"lu-am-body"},[u,U]),et=i("div",{className:"lu-am-card"},[r,$]),Z=i("div",{id:"lu-chibi-maker",className:"lu"},[et]);document.body.appendChild(Z);function nt(f,x){F&&(F[f]=x,f==="species"&&x!=="human"&&zo[x]&&Object.assign(F,zo[x]),F=Ye(F),De(),Bt())}function Ct(f){F=Ye(Object.assign({},f)),De(),Bt()}function T(){for(const f of An){const x=In.filter(k=>(k.cat||"human")===f.id);if(!x.length)continue;w.appendChild(i("div",{className:"lu-am-section-title",text:`${f.name} (${x.length})`}));const h=i("div",{className:"lu-am-tabs lu-am-presets"});for(const k of x){const m=i("button",{type:"button",className:"lu-am-tab lu-am-preset"}),z=k.look.skin||ke.skin,it=k.look.top||k.look.hairColor||ke.top,mt=i("span",{className:"lu-am-preset-dot","aria-hidden":"true"});mt.style.background=`conic-gradient(${z} 0deg 180deg, ${it} 180deg 360deg)`,m.appendChild(mt),m.appendChild(i("span",{className:"lu-am-preset-label",text:k.name})),m.addEventListener("click",()=>Ct(k.look)),h.appendChild(m)}w.appendChild(h)}}function H(f){const x=Ao.find(h=>h.id===f);return x&&x.name||"아야모"}function X(){if(!vt())return;const f=Oe();xt("내 옷장");const x=i("button",{type:"button",className:"lu-am-btn lu-closet-save",text:"＋ 지금 모습 옷장에 저장"});x.addEventListener("click",()=>{const m=He(f);if(m.length>=Uo){D(`옷장은 최대 ${Uo}벌까지 저장할 수 있어요`);return}const z={id:"c"+Date.now(),name:H(F.species),look:JSON.parse(JSON.stringify(F)),thumb:No(120,160),ts:Date.now()};if(m.push(z),!Xo(m,f)){D("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요");return}Bt()}),w.appendChild(x);const h=He(f);if(!h.length){w.appendChild(i("div",{className:"lu-closet-empty",text:"아직 저장한 옷이 없어요. 마음에 드는 모습을 저장해 두세요."}));return}const k=i("div",{className:"lu-closet-grid"});h.forEach(m=>{const z=i("div",{className:"lu-closet-cell"}),it=i("button",{type:"button",className:"lu-closet-load",title:`${m.name} 불러오기`,"aria-label":`${m.name} 불러오기`});m.thumb&&(it.style.backgroundImage=`url('${m.thumb}')`),it.appendChild(i("span",{className:"lu-closet-name",text:m.name})),it.addEventListener("click",()=>Ct(m.look));const mt=i("button",{type:"button",className:"lu-closet-del",text:"×",title:"삭제","aria-label":`${m.name} 삭제`});mt.addEventListener("click",Gt=>{Gt.stopPropagation();const $t=He(f).filter(nn=>nn.id!==m.id);Xo($t,f),Bt()}),z.appendChild(it),z.appendChild(mt),k.appendChild(z)}),w.appendChild(k)}const J=(f,x)=>[{id:!1,name:f},{id:!0,name:x}];function P(f,x,h){w.appendChild(i("div",{className:"lu-am-section-title",text:f}));const k=i("div",{className:"lu-am-tabs"});x.forEach(m=>{const z=i("button",{type:"button",className:"lu-am-tab"+(F[h]===m.id?" lu-selected":""),text:m.name});z.addEventListener("click",()=>nt(h,m.id)),k.appendChild(z)}),w.appendChild(k)}function ct(f,x,h){w.appendChild(i("div",{className:"lu-am-section-title",text:f}));const k=i("div",{className:"lu-swatches"});x.forEach(m=>{const z=i("button",{type:"button",className:"lu-swatch"+(F[h]===m?" lu-selected":""),style:`background:${m};`,title:m,"aria-label":`${f} ${m}`});z.addEventListener("click",()=>nt(h,m)),k.appendChild(z)}),w.appendChild(k)}function xt(f){const x=i("div",{className:"lu-am-group-title"}),h=i("span",{className:"lu-am-group-icon","aria-hidden":"true"});h.innerHTML=$o,x.appendChild(h),x.appendChild(i("span",{text:f})),w.appendChild(x)}function Ja(){G.textContent="";const f=!!vt(),x=$i.filter(h=>h.id!=="closet"||f);x.some(h=>h.id===N)||(N="species"),x.forEach(h=>{const k=N===h.id,m=i("button",{type:"button",role:"tab",id:"lu-am-tab-"+h.id,className:"lu-am-navtab"+(k?" lu-selected":""),"aria-selected":k?"true":"false","aria-controls":"lu-am-tabpanel",tabindex:k?"0":"-1","aria-label":h.label});m.innerHTML=h.icon,m.appendChild(i("span",{className:"lu-am-navtab-label",text:h.label})),m.addEventListener("click",()=>{N!==h.id&&(N=h.id,Bt(),w.scrollTop=0)}),G.appendChild(m)}),w.setAttribute("aria-labelledby","lu-am-tab-"+N)}function Bt(){if(Ja(),w.textContent="",!F)return;const f=F.species&&F.species!=="human";N==="species"?(T(),xt(f?"종족 · 털색":"종족 · 성별 · 피부색"),P("종족",Ao,"species"),f||P("성별",Rn,"gender"),ct(f?"털 색":"피부색",Pn,"skin")):N==="face"?(xt("얼굴"),P("얼굴형",On,"face"),P("눈",Bn,"eyeStyle"),P("입",Dn,"mouth"),f||P("수염",jn,"beardStyle"),P("볼터치",J("없음","있음"),"blush"),ct("눈동자 색",Yn,"eyeColor")):N==="hair"?f?(xt("포인트"),ct("귀·꼬리 색",Io,"hairColor")):(xt("헤어"),P("헤어",Un,"hairStyle"),ct("머리 색",Io,"hairColor")):N==="outfit"?(xt("의상"),P("상의 패턴",Hn,"pattern"),P("의상 세트",Xn,"outfit"),P("하의",Fn,"bottomType"),ct("상의 색",Ue,"top"),ct("하의 색",Ue,"bottom"),ct("신발 색",Ue,"shoes")):N==="acc"?(xt("장식"),P("머리 장식",Gn,"acc"),P("안경",J("없음","착용"),"glasses"),P("헤일로",J("없음","있음"),"halo"),P("날개",J("없음","있음"),"wings"),P("가슴 하트",J("없음","있음"),"heart")):N==="closet"&&X()}function De(){!F||!C||(W&&(C.remove(W.group),W.dispose(),W=null),W=bo(to(F),ga," ",{blobShadow:!1}),W.group.traverse(f=>{f.isMesh&&(f.castShadow=!0)}),C.add(W.group))}function Mo(f){Dt=requestAnimationFrame(Mo);const x=pe?(f-pe)/1e3:0,h=Math.min(.1,x);if(pe=f,!fe&&(he+=h,C.rotation.y=Fe+Math.sin(he*Mi)*Li,b-=x,b<=0&&W&&typeof W.playAction=="function")){const k=g[Math.floor(Math.random()*g.length)];W.playAction(k),b=($n[k]||1.5)+.6+Math.random()*.9}W&&W.update(h,0),p.render(S,y)}function Qa(){Dt||(pe=0,Dt=requestAnimationFrame(Mo))}function tn(){Dt&&cancelAnimationFrame(Dt),Dt=null}l.addEventListener("pointerdown",f=>{fe=!0,Xe=f.clientX,u.classList.add("lu-dragging"),l.setPointerCapture(f.pointerId)}),l.addEventListener("pointermove",f=>{fe&&(C.rotation.y+=(f.clientX-Xe)*.012,Xe=f.clientX)});const To=()=>{fe=!1,u.classList.remove("lu-dragging"),Fe=C.rotation.y,he=0};l.addEventListener("pointerup",To),l.addEventListener("pointercancel",To),e.addEventListener("click",()=>Ce()),Z.addEventListener("click",f=>{f.target===Z&&Ce()});function No(f,x){try{return p?(p.render(S,y),Si(l,f,x)||p.domElement.toDataURL("image/png")):""}catch{return""}}function en(){const x=!!vt()?"저장하고 사용":"이 캐릭터 사용";t.setAttribute("aria-label",x),t.title=x}t.addEventListener("click",()=>{if(!F)return;const f=JSON.parse(JSON.stringify(F));xo=f;const x=!!vt();if(x){const h=Ci(f),k=No(150,200);k&&Ei(k),h||D("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요")}d&&d.lobby&&d.lobby.onChibiSaved(),mo&&typeof O.onAvatarChange=="function"&&O.onAvatarChange(to(f)),x||D("이 캐릭터로 적용했어요 · 회원가입하면 저장돼요"),Ce()});function on(){N="species",F=Ye(Object.assign({},ke,ya()||{})),en(),E(),C.rotation.y=Math.PI,Fe=Math.PI,he=0,b=1,De(),Bt(),Z.classList.add("lu-open"),oe=!0,Qa(),typeof O.onMakerToggle=="function"&&O.onMakerToggle(!0)}function an(){Z.classList.remove("lu-open"),oe=!1,tn(),W&&(C.remove(W.group),W.dispose(),W=null),typeof O.onMakerToggle=="function"&&O.onMakerToggle(!1)}return{open:on,close:an}}function yo(){!d||!d.chibiMaker||oe||zt||Pt||It||At||d.chibiMaker.open()}function Ce(){d&&d.chibiMaker&&d.chibiMaker.close()}function Ki(){window.addEventListener("keydown",t=>{if(t.key==="Escape"){if(oe){t.preventDefault(),t.stopImmediatePropagation(),Ce();return}if(Pt){t.preventDefault(),t.stopImmediatePropagation(),lo();return}if(zt){t.preventDefault(),t.stopImmediatePropagation(),Ee();return}if(At){t.preventDefault(),t.stopImmediatePropagation(),ne();return}if(It){t.preventDefault(),t.stopImmediatePropagation(),wo();return}return}if(zt||Pt||!mo)return;const e=document.activeElement;e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA")||(t.key==="Enter"?(t.preventDefault(),t.stopPropagation(),d.chat.input.focus()):(t.key==="c"||t.key==="C"||t.key==="ㅊ")&&!oe&&(t.preventDefault(),t.stopPropagation(),yo()))})}function Vi({onEnter:t,onChatSend:e,onAvatarChange:o,onMakerToggle:a}={}){if(Fo){O.onEnter=t||O.onEnter,O.onChatSend=e||O.onChatSend,O.onAvatarChange=o||O.onAvatarChange,O.onMakerToggle=a||O.onMakerToggle;return}Fo=!0,O.onEnter=t||null,O.onChatSend=e||null,O.onAvatarChange=o||null,O.onMakerToggle=a||null,Ti(),d={loading:Ni(),lobby:_i(),controls:zi(),topRight:Ii(),status:Ri(),chat:Pi(),artwork:Oi(),galleryTitle:Bi(),lightbox:Di(),artworkList:Yi(),guestbook:Hi(),tourBar:Xi(),dock:Ai(),shutter:Fi(),share:Gi(),chibiMaker:Wi()},d.topRight.count=d.galleryTitle._count,d.topRight.countWrap=d.galleryTitle._countWrap,Ki(),ze!==null&&Ca(ze),wt&&Ea(wt.galleries,wt.currentId,wt.onPick),Ae&&va(Ae),_e&&wa(_e)}function Wo(t){d&&d.loading.classList.toggle("lu-hidden",!t)}function qi(){if(!d)return;mo=!0,d.lobby.overlay.classList.add("lu-hidden"),d.controls.classList.add("lu-visible"),d.topRight.wrap.classList.add("lu-visible"),d.status.classList.add("lu-visible"),d.chat.wrap.classList.add("lu-visible"),d.galleryTitle.classList.add("lu-visible"),d.guestbook.tab.classList.add("lu-visible"),d.dock&&d.dock.classList.add("lu-visible");const t=document.getElementById("lu-controls-toggle");t&&t.classList.add("lu-visible")}function Zi(t){!d||!t||oo===t.id&&d.artwork.panel.classList.contains("lu-open")||(oo=t.id,d.artwork.title.textContent=t.title||"",d.artwork.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),d.artwork.desc.textContent=t.desc||"",d.artwork.panel.classList.add("lu-open"))}function Ji(){d&&(oo=null,d.artwork.panel.classList.remove("lu-open"))}function ka(t,e,o){if(!d)return;const a=i("div",{className:"lu-chat-msg"+(o?" lu-self":"")},[i("span",{className:"lu-chat-name",text:t}),i("span",{text:e})]);for(d.chat.log.appendChild(a);d.chat.log.children.length>gi;)d.chat.log.removeChild(d.chat.log.firstChild)}function Qi(t){if(!d)return;const e=d.topRight.count.textContent;d.topRight.count.textContent=String(t),e!==String(t)&&d.topRight.countWrap&&(d.topRight.countWrap.classList.remove("lu-tick"),d.topRight.countWrap.offsetWidth,d.topRight.countWrap.classList.add("lu-tick")),_t&&_t.chatWrap&&(_t.chatWrap.style.display=t>=2?"":"none")}function D(t){d&&(d.status.textContent=t||"")}function tr(t){d&&(d.topRight.fps.textContent=String(Math.round(t)))}function Ca(t){d.galleryTitle.querySelector(".lu-topbar-title").textContent=t||"",d.galleryTitle.classList.toggle("lu-empty",!t)}function er(t){ze=t||"",d&&Ca(ze)}function Ea(t,e,o){const a=d.lobby.pickerBox;if(a.innerHTML="",!Array.isArray(t)||t.length===0)return;const n=i("div",{className:"lu-field-label",text:"전시 선택",style:"margin-top:26px;"});a.appendChild(n),e==null&&a.appendChild(i("div",{className:"lu-picker-note",text:"공유된 전시 관람 중"}));const r=i("div",{className:"lu-picker-list"});t.forEach(l=>{const s=l.id===e,c=i("button",{type:"button",className:"lu-picker-item"+(s?" lu-picker-current":"")},[i("div",{className:"lu-picker-name",text:l.name||l.id}),i("div",{className:"lu-picker-meta",text:[l.artist,typeof l.count=="number"?`${l.count}점`:null].filter(Boolean).join(" · ")})]);s&&(c.disabled=!0),c.addEventListener("click",()=>{s||typeof o=="function"&&o(l.id)}),r.appendChild(c)}),a.appendChild(r)}function or(t,e,o){wt={galleries:t,currentId:e??null,onPick:o},d&&Ea(wt.galleries,wt.currentId,wt.onPick)}function Sa(){const t=d.lightbox.stage,e=t.firstChild;e&&e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),t.innerHTML=""}function La(t){if(!d||!t)return;ro=t,d.lightbox.resetZoom&&d.lightbox.resetZoom(),Tt&&(clearTimeout(Tt),Tt=null),Sa();let e;t.videoUrl?(e=i("video",{className:"lu-lightbox-media",src:t.videoUrl,controls:"controls",autoplay:"autoplay",loop:"loop",muted:"muted",playsinline:"playsinline"}),e.muted=!0):e=i("img",{className:"lu-lightbox-media",src:t.imageUrl||"",alt:t.title||""}),d.lightbox.stage.appendChild(e),d.lightbox.title.textContent=t.title||"",d.lightbox.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),d.lightbox.desc.textContent=t.desc||"",zt=!0,d.lightbox.overlay.classList.add("lu-open")}function Ee(){!d||!zt||(zt=!1,d.lightbox.overlay.classList.remove("lu-open"),Tt&&clearTimeout(Tt),Tt=setTimeout(()=>{Sa(),Tt=null},340),typeof ao=="function"&&ao())}function ut(){return zt}function ar(t){ao=typeof t=="function"?t:null}function nr(t,e){no=typeof e=="function"?e:null,Ae=t,d&&va(Ae)}function Ma(){d&&(At?ne():(At=!0,d.artworkList.panel.classList.add("lu-open")))}function ne(){!d||!At||(At=!1,d.artworkList.panel.classList.remove("lu-open"))}function Ta(){return At}function ir({index:t,total:e,title:o,autoOn:a}={}){if(!d)return;const n=d.tourBar,r=Number.isFinite(t)?t+1:1,l=Number.isFinite(e)?e:0;n.countEl.textContent=`● ${r} / ${l}`,n.titleEl.textContent=` — ${o||""}`,n.autoBtn.textContent=a?"자동진행 ON":"자동진행 OFF",n.autoBtn.classList.toggle("lu-tour-on",!!a),n.bar.classList.add("lu-open")}function rr(){d&&d.tourBar.bar.classList.remove("lu-open")}function lr({onTour:t,onViewArtwork:e,onGuestbook:o,onCapture:a,onSelfView:n}={}){st={onTour:typeof t=="function"?t:null,onViewArtwork:typeof e=="function"?e:null,onGuestbook:typeof o=="function"?o:null,onCapture:typeof a=="function"?a:null,onSelfView:typeof n=="function"?n:null}}function sr({blob:t,dataUrl:e,galleryName:o,shareUrl:a}={}){if(!d)return;V={blob:t||null,dataUrl:e||"",galleryName:o||"",shareUrl:a||(typeof window<"u"?window.location.href:"")},d.share.preview.src=V.dataUrl;let n=!1;if(V.blob&&typeof navigator<"u"&&typeof navigator.share=="function"&&typeof navigator.canShare=="function")try{const r=new File([V.blob],"artshow.png",{type:"image/png"});n=navigator.canShare({files:[r]})}catch{n=!1}d.share.deviceBtn.style.display=n?"":"none",Nt&&(clearTimeout(Nt),Nt=null),d.share.copyBtn.textContent="링크 복사",d.share.copyBtn.classList.remove("lu-share-btn-copied"),Pt=!0,d.share.overlay.classList.add("lu-open")}function lo(){!d||!Pt||(Pt=!1,d.share.overlay.classList.remove("lu-open"))}function Re(){return Pt}function Na(){if(!d)return;const t=d.shutter;t.style.transition="none",t.style.opacity="1",t.offsetWidth,t.style.transition="opacity 0.25s ease",t.style.opacity="0"}function cr({onPrev:t,onNext:e,onExit:o,onToggleAuto:a}={}){ft={onPrev:typeof t=="function"?t:null,onNext:typeof e=="function"?e:null,onExit:typeof o=="function"?o:null,onToggleAuto:typeof a=="function"?a:null}}function dr(t){const e=document.getElementById("lu-gbook-stats");e&&(e.textContent=t||"")}function ur({onSubmit:t}={}){io=typeof t=="function"?t:null}function vo(){d&&(It?wo():(It=!0,d.guestbook.panel.classList.add("lu-open")))}function wo(){!d||!It||(It=!1,d.guestbook.panel.classList.remove("lu-open"))}function pr(){return It}function ko(t){_e=Array.isArray(t)?t:[],d&&wa(_e)}let M=null,at=null,_=null,I=null,so=null,L=null,jt=null,Kt=null;const fr=new _n;let St=!1,Vt=0,Ge=0,co=0,$e=0,Ko=!1,ot={name:"",soft:!1};const hr=/swiftshader|llvmpipe|softpipe|software (?:rasterizer|renderer|adapter)|microsoft basic render|\bwarp\b|gdi generic|mesa offscreen|apple software renderer/i;function br(){const t={name:"",soft:!1};try{const e=document.createElement("canvas"),a=!(e.getContext("webgl2",{failIfMajorPerformanceCaveat:!0})||e.getContext("webgl",{failIfMajorPerformanceCaveat:!0})),n=document.createElement("canvas"),r=n.getContext("webgl2")||n.getContext("webgl");if(!r)return{name:"",soft:!0};const l=r.getExtension("WEBGL_debug_renderer_info");t.name=String(l&&r.getParameter(l.UNMASKED_RENDERER_WEBGL)||r.getParameter(r.RENDERER)||""),t.soft=hr.test(t.name)||a;const s=r.getExtension("WEBGL_lose_context");s&&s.loseContext()}catch{}return t}function gr(t,e){const o=document.createElement("div");o.id="lu-gpu-notice",o.style.cssText=`position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:1200;max-width:min(92vw,600px);background:linear-gradient(180deg,#fffdf8,#f6f1e4);color:#17140f;border:1px solid rgba(95,158,125,0.55);border-radius:14px;padding:14px 44px 14px 18px;box-shadow:0 12px 32px rgba(20,15,8,0.35);font:13px/1.75 ${te()};`;const a="<b>이 브라우저에서 3D 그래픽 기능을 사용할 수 없습니다</b><br>";o.innerHTML=a+'<b>Chrome</b>: 설정 → 시스템(<b>chrome://settings/system</b>) → "그래픽 가속 사용" 켜기 → 다시 시작<br><b>Edge</b>: 설정 → 시스템 및 성능 → "그래픽 가속 사용" 켜기 + "효율 모드" 끄기<br><b>Firefox</b>: 설정 → 일반 → 성능 → "권장 성능 설정" 해제 → "하드웨어 가속 사용" 체크<br>그래도 느리면: 원격 데스크톱 여부 확인 · 그래픽 드라이버 업데이트 · Windows 설정 → 디스플레이 → 그래픽에서 브라우저를 "고성능" GPU로 지정 · 확장프로그램 없는 시크릿 창으로 접속해 비교';const n=document.createElement("button");n.type="button",n.setAttribute("aria-label","닫기"),n.textContent="×",n.style.cssText="position:absolute;top:8px;right:10px;width:26px;height:26px;border:none;background:none;font-size:18px;color:#8a8172;cursor:pointer;",n.addEventListener("click",()=>o.remove());const r=document.createElement("button");r.type="button",r.textContent="진단 정보 복사",r.style.cssText="display:inline-block;margin-top:8px;padding:5px 14px;border-radius:999px;border:1px solid rgba(95,158,125,0.5);background:rgba(95,158,125,0.12);color:#17140f;font:600 11px/1 inherit;cursor:pointer;",r.addEventListener("click",()=>{const l=JSON.stringify({renderer:t,ua:navigator.userAgent,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,cores:navigator.hardwareConcurrency||0,mem:navigator.deviceMemory||0});try{navigator.clipboard.writeText(l),r.textContent="복사됨!"}catch{}}),o.appendChild(r),o.appendChild(n),document.body.appendChild(o)}const xr=24,mr=45,yr=3,uo="lu-spec-v2",_a=4;function po(){try{const t=localStorage.getItem(uo);if(t){const e=JSON.parse(t);return e&&e.gen===_a&&(e.v==="low"||e.v==="high")?e.v:null}return null}catch{return null}}function We(t){try{t?localStorage.setItem(uo,JSON.stringify({v:t,gen:_a})):localStorage.removeItem(uo),localStorage.removeItem("lu-spec-v1"),localStorage.removeItem("lu-lowspec-v1")}catch{}}let be=0;const Se={low:83e5,base:11e6,high:18e6},za="lu-onboard-v1";let yt=-1,Ht=null,fo=null,Vo=0,Ke=0;function vr(){try{if(localStorage.getItem(za))return}catch{}if(!(typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches))return;yt=0;const t=I.getState();fo={x:t.x,z:t.z};const e=document.createElement("style");e.textContent="@keyframes lu-ob-pulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} 70%{transform:translate(-50%,-50%) scale(1.25);opacity:0.2;} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} }",document.head.appendChild(e),Ht=document.createElement("div"),Ht.style.cssText="position:fixed;left:24%;bottom:22%;width:110px;height:110px;border-radius:50%;border:3px solid rgba(255,253,247,0.85);pointer-events:none;z-index:60;transform:translate(-50%,-50%);animation:lu-ob-pulse 1.6s ease-in-out infinite;",document.body.appendChild(Ht),D("왼쪽 화면을 누른 채 밀면 걸어요 🚶")}function wr(){if(yt<0)return;const t=I.getState();if(yt===0)Math.hypot(t.x-fo.x,t.z-fo.z)>1.5&&(yt=1,Vo=t.ry,Ht&&(Ht.remove(),Ht=null),D("잘했어요! 오른쪽 화면을 쓸면 주위를 둘러봐요 👀"));else if(yt===1){let e=t.ry-Vo;e=Math.atan2(Math.sin(e),Math.cos(e)),Math.abs(e)>.6&&(yt=2,Ke=0,D("작품에 다가가면 설명이 나타나요 — 어려우면 [투어] 버튼을 눌러요 🖼️"))}else if(yt===2&&(Ke+=1,Ke>420)){yt=-1;try{localStorage.setItem(za,"1")}catch{}}}function qo(){if(!L)return;const t=[];for(const[e,o]of L.remoteAvatars)e.startsWith("npc-")&&t.push(o);if(!St){for(const e of t)e.group.visible=!0;return}t.sort((e,o)=>e.group.position.distanceTo(_.position)-o.group.position.distanceTo(_.position)),t.forEach((e,o)=>{e.group.visible=o<yr})}const Aa=new zn;let Ve=null;const Ia=3,kr=.7,Cr=-.2;let gt=!1,R=null,kt=null,Lt=null,Le=0;const Ra=new ca,Zo=new ca,Pa=new hn;function Oa(){if(B)if(gt=!gt,gt){if(!R&&kt)try{R=bo(kt.char,kt.color," "),R.group.traverse(t=>{t.isSprite&&(t.visible=!1)}),at.add(R.group)}catch(t){console.warn("내 아바타 생성 실패:",t),R=null,gt=!1;return}if(!R){gt=!1;return}R.group.visible=!0,Ie("self",!0),Lt=null,Le=0,D("내 모습 보기 — V키 또는 [시점] 버튼으로 복귀")}else R&&(R.group.visible=!1,Ie("self",!1))}function Er(t){if(t){if(kt=kt?Object.assign({},kt,{char:t}):{char:t},R){const e=R.group,o=e.visible,a=e.position.clone(),n=e.rotation.y;try{const r=bo(t,kt.color||"#3498db"," ");r.group.traverse(l=>{l.isSprite&&(l.visible=!1)}),r.group.position.copy(a),r.group.rotation.y=n,r.group.visible=o,at.add(r.group),at.remove(e),R.dispose(),R=r}catch(r){console.warn("내 아바타 갱신 실패:",r)}}L&&typeof L.setChar=="function"&&L.setChar(t),D("아야모 모습을 바꿨어요 ✨")}}function Ba(){Ra.copy(_.position),Pa.copy(_.quaternion),Zo.set(0,0,1).applyQuaternion(_.quaternion),_.position.addScaledVector(Zo,Ia),_.position.y+=kr,_.rotateX(Cr)}function Da(){_.position.copy(Ra),_.quaternion.copy(Pa)}const Sr=7,qt=new un,Jo=new aa;let qe=null;function Lr(t){t.addEventListener("pointerdown",e=>{e.isPrimary&&(qe={x:e.clientX,y:e.clientY,t:performance.now()})}),t.addEventListener("pointerup",e=>{const o=qe;if(qe=null,!o||!e.isPrimary||!B||!L||performance.now()-o.t>450||Math.hypot(e.clientX-o.x,e.clientY-o.y)>7)return;const a=t.getBoundingClientRect();Jo.set((e.clientX-a.left)/a.width*2-1,-((e.clientY-a.top)/a.height)*2+1),qt.setFromCamera(Jo,_),qt.far=Sr+Ia;const n=[...L.remoteAvatars.entries()];if(!n.length)return;const r=n.map(([,c])=>c.group),l=qt.intersectObjects(r,!0);if(l.length){let c=l[0].object;for(;c&&!r.includes(c);)c=c.parent;if(c){const[u]=n[r.indexOf(c)];L.sendHit(u);return}}qt.far=60;const s=qt.intersectObjects(Tn(),!1);s.length&&s[0].object.userData.luArt&&Xa(s[0].object.userData.luArt)})}let ja=null,Be="게스트",B=!1,Q=null,tt=[],Pe="shared",rt=[],Qo=!1,Ze=0,ge=0,Y=null;const ta=.8,Mr=2.2;function Tr(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}function Nr(t,e,o){let a=(e-t)%(Math.PI*2);return a>Math.PI&&(a-=Math.PI*2),a<-Math.PI&&(a+=Math.PI*2),t+a*o}function Ya(t,e){const o=I.getState(),a=typeof t.y=="number"?t.y:o.y,n=t.x-o.x,r=a-o.y,l=t.z-o.z,s=Math.hypot(n,r,l),c=lt.clamp(ta+s*.035,ta,Mr);I.disable(),Y={fromX:o.x,fromY:o.y,fromZ:o.z,fromRy:o.ry,toX:t.x,toY:a,toZ:t.z,toRy:t.ry,duration:c,elapsed:0,onDone:e||null}}const ea=new oa(0,0,0,"YXZ");function _r(t){if(!Y)return;Y.elapsed+=t;const e=Math.min(1,Y.elapsed/Y.duration),o=Tr(e),a=Y.fromX+(Y.toX-Y.fromX)*o,n=Y.fromY+(Y.toY-Y.fromY)*o,r=Y.fromZ+(Y.toZ-Y.fromZ)*o,l=Nr(Y.fromRy,Y.toRy,o);if(_.position.set(a,n,r),ea.set(0,l,0,"YXZ"),_.quaternion.setFromEuler(ea),e>=1){const s=Y.onDone;Y=null,s&&s()}}let q=!1,Ot=0,ae=!0,Xt=!1,Ft=0;const zr=6;async function Ar(){Wo(!0),at=new ra,_=new la(55,window.innerWidth/window.innerHeight,.1,1e3),_.position.set(A.spawn.x,bt,A.spawn.z);const t=typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches,e=po();ot=br(),console.info("[OpenArtShow] GPU:",ot.name||"(unknown)",ot.soft?"— SOFTWARE RENDERING":"");try{M=new na({antialias:!ot.soft,powerPreference:"high-performance"})}catch(u){throw gr(""),u}Lr(M.domElement);const o=document.createElement("div");o.id="lu-vignette",o.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse 72% 62% at 50% 46%, rgba(8,6,4,0) 50%, rgba(8,6,4,0.03) 62%, rgba(8,6,4,0.09) 72%, rgba(8,6,4,0.17) 82%, rgba(8,6,4,0.26) 91%, rgba(8,6,4,0.34) 100%);",document.body.appendChild(o);const a=window.devicePixelRatio||1;let n;e==="low"?n=Math.min(a,1.25):e==="high"?n=Math.min(Math.max(a,2),2.5):t?n=Math.min(a,2):n=Math.min(Math.max(a,1.5),2);const r=e==="high"?Se.high:e==="low"?Se.low:Se.base;n=Math.min(n,Math.sqrt(r/(window.innerWidth*window.innerHeight))),ot.soft&&(n=Math.min(n,.7),document.documentElement.classList.add("lu-potato")),M.setPixelRatio(n),M.setSize(window.innerWidth,window.innerHeight),M.shadowMap.enabled=!ot.soft,M.shadowMap.type=pn,M.toneMapping=ot.soft?ia:fn,M.toneMappingExposure=.92,M.outputColorSpace=Yt,document.body.appendChild(M.domElement);const l=await wn(),s=Rr(l.theme);xn(at,s,{fullLights:!ot.soft&&e!=="low"}),await kn(),await Cn(at),window.__museum={scene:at,camera:_,renderer:M},ot.soft&&(at.fog=null),M.shadowMap.autoUpdate=!1,M.shadowMap.needsUpdate=!0,co=s==="cycle"?2:0,Q=l,er(Q.name),Ir(),Pe=l.id??"shared",rt=En(Pe),ko(rt),ur({onSubmit:$r}),tt=Te(),nr(tt,Xa),cr({onPrev:Ga,onNext:Lo,onExit:So,onToggleAuto:Hr}),lr({onSelfView:()=>{B&&!Re()&&Oa()},onTour:()=>{B&&Fa()},onViewArtwork:Ua,onGuestbook:()=>{B&&!ut()&&vo()},onCapture:()=>{B&&!Re()&&(Na(),Ha())}}),I=new li(_,M.domElement);const c=A.floors.find(u=>u.id===A.spawn.floor);I.setPose({x:A.spawn.x,y:(c?c.y:0)+bt,z:A.spawn.z,ry:A.spawn.ry}),so=ui({player:I,getSelfAvatar:()=>R}),I.disable(),setTimeout(()=>{const u=document.getElementById("lu-topright");u&&(u.style.cursor="pointer",u.title="클릭하면 성능 진단 정보가 복사됩니다",u.addEventListener("click",()=>{const g=JSON.stringify({gpu:ot.name,soft:ot.soft,pixelRatio:M?M.getPixelRatio():0,aa:M?M.getContext().getContextAttributes().antialias:null,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,inner:window.innerWidth+"x"+window.innerHeight,cores:navigator.hardwareConcurrency||0,spec:po(),calls:M?M.info.render.calls:0,ua:navigator.userAgent});try{navigator.clipboard.writeText(g),D("진단 정보가 복사됐어요 — 붙여넣어 보내주세요")}catch{console.info("[OpenArtShow diag]",g)}}))},0),Vi({onEnter:Fr,onChatSend:Kr,onAvatarChange:Er,onMakerToggle:u=>{B&&(u?I.disable():q||I.enable())}}),Wo(!1),ar(()=>{B&&!q&&I.enable()}),window.addEventListener("resize",qr),window.addEventListener("keydown",Yr),ja=new bn,M.setAnimationLoop(Vr)}function Ir(){fetch("./galleries/index.json").then(t=>{if(!t.ok)throw new Error(`HTTP ${t.status}`);return t.json()}).then(t=>{if(!Array.isArray(t))return;const e=Q?Q.id:null;or(t,e,o=>{window.location.href="./index.html?g="+o})}).catch(()=>{})}function Rr(t){if(t!=="auto")return t;const e=new Date().getHours();return e>=6&&e<16?"daylight":e>=16&&e<19?"sunset":"night"}let xe=null;function Pr(){if(!B)return;const t=_.position.y-bt;let e=null;for(const o of A.floors)t>=o.y-.9&&(e===null||o.y>e.y)&&(e=o);if(e){if(xe===null){xe=e.id;return}e.id!==xe&&(xe=e.id,D(e.name))}}function Ua(){if(!B||ut())return;const t=q?tt[Ot]:da(_.position);t&&(La(t),I.disable())}function Ha(){if(!(!M||!at||!_))try{gt&&R&&Ba(),M.render(at,_),gt&&R&&Da();const t=M.domElement.toDataURL("image/png"),e=new Image;e.onload=()=>{const o=document.createElement("canvas");o.width=e.width,o.height=e.height;const a=o.getContext("2d");if(!a)return;a.drawImage(e,0,0);const n=a.createRadialGradient(o.width/2,o.height*.46,Math.min(o.width,o.height)*.4,o.width/2,o.height*.46,Math.max(o.width,o.height)*.72);n.addColorStop(0,"rgba(8,6,4,0)"),n.addColorStop(.24,"rgba(8,6,4,0.03)"),n.addColorStop(.44,"rgba(8,6,4,0.09)"),n.addColorStop(.64,"rgba(8,6,4,0.17)"),n.addColorStop(.82,"rgba(8,6,4,0.26)"),n.addColorStop(1,"rgba(8,6,4,0.34)"),a.fillStyle=n,a.fillRect(0,0,o.width,o.height),Br(a,o.width,o.height,Q?Q.name:"");const r=o.toDataURL("image/png");try{const s=Math.round(o.height/o.width*360),c=document.createElement("canvas");c.width=360,c.height=s,c.getContext("2d").drawImage(o,0,0,360,s);const u=c.toDataURL("image/jpeg",.72),g=Aa.addLocal(Be,Q?Q.name:"",u);g&&L&&L.sendPhoto(g)}catch(l){console.warn("포토월 썸네일 생성 실패 (캡처 자체는 정상):",l)}sr({blob:Or(r),dataUrl:r,galleryName:Q&&Q.name||"OpenArtShow 전시",shareUrl:jr()})},e.onerror=()=>{D("사진 촬영에 실패했습니다.")},e.src=t}catch(t){console.error("사진 촬영 실패:",t),D("사진 촬영에 실패했습니다.")}}function Or(t){const e=t.split(",")[1],o=atob(e),a=new Uint8Array(o.length);for(let n=0;n<o.length;n++)a[n]=o.charCodeAt(n);return new Blob([a],{type:"image/png"})}function Br(t,e,o,a){const n=Math.max(90,Math.round(o*.14)),r=t.createLinearGradient(0,o-n,0,o);r.addColorStop(0,"rgba(0,0,0,0)"),r.addColorStop(1,"rgba(0,0,0,0.55)"),t.fillStyle=r,t.fillRect(0,o-n,e,n);const l=Math.max(20,Math.round(e*.025)),s=Math.max(1,e/1400);t.textBaseline="alphabetic",t.textAlign="left",t.fillStyle="rgba(255,255,255,0.95)",t.font=`300 ${Math.round(18*s)}px ${te()}`,t.fillText(a||"OpenArtShow 전시",l,o-l-6*s),t.fillStyle="#5f9e7d",t.font=`300 ${Math.round(16*s)}px ${te()}`,Dr(t,"OpenArtShow",e-l,o-l-22*s,2.5*s),t.textAlign="right",t.fillStyle="rgba(255,255,255,0.6)",t.font=`300 ${Math.round(12*s)}px ${te()}`,t.fillText("syhongart.github.io/openartshow",e-l,o-l-4*s)}function Dr(t,e,o,a,n){const r=Array.from(e),l=r.map(g=>t.measureText(g).width),s=l.reduce((g,b)=>g+b,0)+n*(r.length-1),c=t.textAlign;t.textAlign="left";let u=o-s;r.forEach((g,b)=>{t.fillText(g,u,a),u+=l[b]+n}),t.textAlign=c}function jr(){const t=window.location.href;return t.length<2e3?t:window.location.origin+window.location.pathname.replace(/index\.html$/,"landing.html")}function Yr(t){if(t.code==="KeyE"){Ua();return}if(t.code==="KeyM"){if(!B||ut())return;Ma();return}if(t.code==="KeyT"){if(!B)return;Fa();return}if(t.code==="KeyG"){if(!B||ut())return;vo();return}if(t.code==="KeyP"){if(!B||Re())return;Na(),Ha();return}if(t.code==="KeyV"){if(!B||Re())return;Oa();return}if(q&&(t.code==="ArrowLeft"||t.code==="ArrowRight")){if(ut())return;t.preventDefault(),t.code==="ArrowLeft"?Ga():Lo();return}t.code==="Escape"&&q&&!ut()&&!Ta()&&!pr()&&So()}function Xa(t){if(!t||!B)return;const e=fa(t),o=q;if(o){const a=tt.indexOf(t);a!==-1&&(Ot=a),Xt=!1}Ya(e,()=>{I.setPose(e),o?(Co(t),Xt=!0,Ft=0):B&&!ut()&&I.enable()})}function Co(t){ir({index:Ot,total:tt.length,title:t&&t.title||"",autoOn:ae})}function Eo(t){const e=tt[t];if(!e)return;Ot=t,Xt=!1,Ft=0,Co(e);const o=fa(e);Ya(o,()=>{I.setPose(o),Xt=!0,Ft=0})}function Ur(){!B||ut()||q||!tt||tt.length===0||(Ta()&&ne(),q=!0,Ie("tour",!0),ae=!0,I.disable(),Eo(0))}function So(){if(!q)return;q=!1,Ie("tour",!1),Xt=!1,Y=null,rr();const t=I.getState();I.setPose({x:t.x,z:t.z,ry:t.ry}),B&&!ut()&&I.enable()}function Fa(){q?So():Ur()}function Lo(){!q||tt.length===0||Eo((Ot+1)%tt.length)}function Ga(){!q||tt.length===0||Eo((Ot-1+tt.length)%tt.length)}function Hr(){q&&(ae=!ae,Ft=0,Co(tt[Ot]))}function Xr(t){let e=5381;for(let o=0;o<t.length;o++)e=(e<<5)+e+t.charCodeAt(o)>>>0;return e.toString(36)}function Fr({nickname:t,color:e,char:o}){Be=t,kt={nickname:t,color:e,char:o},B=!0,qi(),I.enable(),Jn(),vr();try{const a=Q&&Q.id||"link-"+Xr(window.location.hash||"");L=new Sn(at,{nickname:t,color:e,char:o,roomId:`${yn}-${a}`}),Kt=new bi(a),L.onVisitor=(n,r)=>{Kt.addVisit(n),fr.add(r&&r.nickname,Q?Q.name:"")},L.onPhoto=n=>{Aa.addRemote(n),D(`${n.name||"누군가"}님이 관람 사진을 남겼어요 📸`)},Ve&&clearInterval(Ve),Ve=setInterval(()=>{if(!L||!Kt)return;const n=[];for(const[r,l]of L.remoteAvatars)r.startsWith("npc-")||n.push({x:l.group.position.x,z:l.group.position.z});Kt.addDwell(n,Te(),2),dr(Kt.summary(rt.length))},2e3),L.onChat=(n,r)=>ka(n,r,!1),L.onPlayerCount=n=>Qi(n),L.onStatus=Gr,L.onGuestbook=Wr,L.onSelfHit=n=>{D(n>=3?"아야!! 너무해요 😭":"아야! 누가 때렸어요 😣"),R?R.hit(n):Ln(n)},L.onNpcHit=(n,r,l)=>{jt&&jt.onHit(n,r,l)},L.npcProvider=(n,r)=>{jt||(jt=new Mn(Te()));const l=jt.update(n,r),s=jt.takeChat();return s&&L.sendNpcChat(s.name,s.text),l},L.connect()}catch(a){console.error("멀티플레이어 초기화 실패:",a),L=null,D("멀티플레이어 연결에 실패했습니다. 혼자 관람 모드로 진행합니다.")}}function Gr(t){if(D(t),!(Qo||!L)&&(t==="호스트로 개설됨"||t.startsWith("접속됨"))){Qo=!0;try{L.sendGuestbook(rt)}catch(e){console.error("방명록 동기화 전송 실패:",e)}}}function $r(t){if(!t)return;const e=Nn(Be,t);if(rt=ua(rt,[e]),pa(Pe,rt),ko(rt),L)try{L.sendGuestbook([e])}catch(o){console.error("방명록 전송 실패:",o)}}function Wr(t){rt=ua(rt,t),pa(Pe,rt),ko(rt)}function Kr(t){if(t&&(ka(Be,t,!0),L))try{L.sendChat(t)}catch(e){console.error("채팅 전송 실패:",e),D("채팅 전송에 실패했습니다.")}}let me=0;function Vr(){let t=ja.getDelta();if(ot.soft){if(me+=t,me<.034)return;t=me,me=0}try{if(so&&so.update(t),I.update(t),L&&I.resolveBodyCollisions(L.getAvatarPositions()),_r(t),q&&Xt&&ae&&!Y&&!ut()&&(Ft+=t,Ft>=zr&&Lo()),mn(t),Pr(),L&&(L.sendState(I.getState()),L.update(t)),wr(),gt&&R){const o=I.getState();R.group.position.set(o.x,o.y-bt,o.z),R.group.rotation.y=o.ry,Lt||(Lt={x:o.x,z:o.z});const a=t>0?Math.hypot(o.x-Lt.x,o.z-Lt.z)/t:0;Le+=(a-Le)*Math.min(1,10*t),Lt.x=o.x,Lt.z=o.z,R.update(t,Le)}const e=da(_.position);if(e?Zi(e):Ji(),Ze+=1,ge+=t,ge>=.5){const o=Ze/ge;if(tr(Math.round(o)),Ze=0,ge=0,Vt=Math.max(0,Vt-.5),Vt===0&&B){if(!St&&o<xr){St=!0,Vt=10,o<16&&We("low");const a=window.devicePixelRatio||1;M.setPixelRatio(Math.min(M.getPixelRatio(),Math.max(1,a*.75))),D("원활한 관람을 위해 화질을 잠시 낮췄어요")}else St&&o>mr&&(St=!1,Vt=10,qo());if(!St&&o>55){if(be+=1,be>=20){const a=po();a==="low"?We(null):a===null&&We("high");const n=Math.min(2.5,Math.sqrt(Se.high/(window.innerWidth*window.innerHeight))),r=M.getPixelRatio();!ot.soft&&r<n&&(M.setPixelRatio(Math.min(n,r+.25)),D("화질을 한 단계 높였어요 ✨")),be=0}}else be=0}}Ge+=t,Ge>=2&&(Ge=0,St&&qo()),co>0&&($e+=t,$e>=co&&($e=0,M.shadowMap.needsUpdate=!0)),!Ko&&B&&(Ko=!0,M.shadowMap.needsUpdate=!0),gt&&R?(Ba(),M.render(at,_),Da()):M.render(at,_)}catch(e){console.error("렌더 루프 오류:",e),M.setAnimationLoop(null),D("오류가 발생했습니다. 페이지를 새로고침해 주세요.")}}function qr(){_.aspect=window.innerWidth/window.innerHeight,_.updateProjectionMatrix(),M.setSize(window.innerWidth,window.innerHeight)}window.addEventListener("beforeunload",()=>{if(L)try{L.dispose()}catch{}});Ar().catch(t=>{console.error("초기화 실패:",t);try{D("초기화 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.")}catch{document.body.insertAdjacentHTML("beforeend",`<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-family:${te()};font-size:16px;text-align:center;">초기화 중 오류가 발생했습니다.<br>페이지를 새로고침해 주세요.</div>`)}});const $a=0,Wa=7.5,Zr=0,ye=3.3,Et=3.5,pt=.18,ve=.2,Jr=7530209,Qr=3.6,tl=1.15,el="ontouchstart"in window||(navigator.maxTouchPoints||0)>0;function ol(){const t=document.createElement("canvas");t.width=t.height=512;const e=t.getContext("2d");let o=20935;const a=()=>{o|=0,o=o+1831565813|0;let c=Math.imul(o^o>>>15,1|o);return c=c+Math.imul(c^c>>>7,61|c)^c,((c^c>>>14)>>>0)/4294967296},n=e.createLinearGradient(0,0,0,512);n.addColorStop(0,"#070a16"),n.addColorStop(.55,"#111a34"),n.addColorStop(1,"#1b2748"),e.fillStyle=n,e.fillRect(0,0,512,512);for(let c=0;c<140;c++){const u=a()*512,g=a()*310,b=a()<.08;e.fillStyle=`rgba(235,240,255,${(.28+a()*.6).toFixed(2)})`,e.fillRect(u,g,b?2:1,b?2:1)}const r=e.createRadialGradient(398,88,0,398,88,36);r.addColorStop(0,"rgba(236,239,232,0.9)"),r.addColorStop(.5,"rgba(226,232,224,0.42)"),r.addColorStop(1,"rgba(226,232,224,0)"),e.fillStyle=r,e.beginPath(),e.arc(398,88,36,0,7),e.fill(),e.fillStyle="rgba(240,243,236,0.95)",e.beginPath(),e.arc(398,88,15,0,7),e.fill();let l=0;for(;l<512;){const c=26+a()*48,u=130+a()*250,g=512-u;e.fillStyle=`rgb(${10+(a()*8|0)},${16+(a()*10|0)},${34+(a()*14|0)})`,e.fillRect(l,g,c,u);for(let b=g+12;b<506;b+=15)for(let p=l+6;p<l+c-6;p+=12)a()<.52||(e.fillStyle=a()<.72?"rgba(120,220,225,0.85)":"rgba(255,207,138,0.85)",e.fillRect(p,b,4,6));l+=c+2+a()*8}const s=new Me(t);return s.colorSpace=Yt,s}function al(){const t=document.createElement("canvas");t.width=512,t.height=160;const e=t.getContext("2d");e.clearRect(0,0,512,160),e.font='700 92px "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif',e.textAlign="center",e.textBaseline="middle",e.shadowColor="rgba(114,230,225,0.95)",e.shadowBlur=30,e.fillStyle="rgba(175,244,240,0.96)",e.fillText("오픈월드",256,86),e.shadowBlur=0,e.fillStyle="rgba(224,252,250,0.92)",e.fillText("오픈월드",256,86);const o=new Me(t);return o.colorSpace=Yt,o}function nl(){const t=new sa,e=[new ie(ye,pt,ve).translate(0,pt/2,0),new ie(ye,pt,ve).translate(0,Et-pt/2,0),new ie(pt,Et,ve).translate(-3.1199999999999997/2,Et/2,0),new ie(pt,Et,ve).translate((ye-pt)/2,Et/2,0)],o=vn(e);e.forEach(l=>l.dispose());const a=new Je({color:736570,emissive:Jr,emissiveIntensity:1.5,roughness:.4,metalness:.1});t.add(new Ut(o,a));const n=new Ut(new Qt(ye-2*pt,Et-2*pt),new _o({map:ol(),toneMapped:!1}));n.position.set(0,Et/2,.11),n.rotation.y=Math.PI,t.add(n);const r=new Ut(new Qt(2.4,.75),new _o({map:al(),transparent:!0,toneMapped:!1,depthWrite:!1,side:gn}));return r.rotation.x=Math.PI/2,r.scale.x=-1,r.position.set(0,.02,-1),t.add(r),t.position.set($a,Zr,Wa),t.userData={frameMat:a,label:r},t}let Mt=null,we=null,dt=null,Jt=!1,ho=!1,Ka=0,Va=0;function il(){dt||(dt=document.createElement("div"),dt.id="portal-hint",dt.textContent=el?"탭하여 오픈월드로 이동 →":"클릭하거나 다가가면 오픈월드로 이동 →",dt.style.cssText='position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:40;padding:9px 16px;border-radius:999px;background:rgba(11,30,29,0.82);color:#c9fbf8;font:600 13px/1 "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;letter-spacing:-.01em;border:1px solid rgba(114,230,225,0.5);box-shadow:0 6px 20px -6px rgba(0,0,0,0.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap',document.body.appendChild(dt))}function qa(){ho||(ho=!0,dt&&(dt.style.opacity="0"),location.href="world.html")}function Za(){if(requestAnimationFrame(Za),!Mt){if(Mt=window.__museum||null,!Mt)return;we=nl(),Mt.scene.add(we),il()}const t=performance.now()/1e3,e=1.3+Math.sin(t*2.2)*.35;we.userData.frameMat.emissiveIntensity=e,we.userData.label.material.opacity=.78+Math.sin(t*2.2)*.2;const o=Mt.camera,a=Math.hypot(o.position.x-$a,o.position.z-Wa),n=Jt;Jt=a<Qr,Jt!==n&&dt&&(dt.style.opacity=Jt?"1":"0"),a<tl&&qa()}requestAnimationFrame(Za);addEventListener("pointerdown",t=>{Ka=t.clientX,Va=t.clientY},!0);addEventListener("pointerup",t=>{!Jt||ho||!Mt||t.target===Mt.renderer.domElement&&(Math.hypot(t.clientX-Ka,t.clientY-Va)>8||qa())},!0);
