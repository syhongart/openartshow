/* empty css              */import{n as Ze,D as Le,C as sa,a as la,S as To,c as Lo,e as ro,d as ca,f as da,g as pa,h as Ca,i as fa,j as ha,E as ga,k as ba,H as zo,l as ma,m as xa,o as Ba,p as qe,q as wa,r as ya,_ as Da}from"./chibi-builder-v2-CHfhEhyn.js";import{e as Gt,M as G,d as q,i as V,k as ut,G as $t,T as va,l as io,m as Jt,n as fn,h as zt,o as Aa,p as hn,q as de,r as Ea,s as he,F as Je,t as ge,L as ka,u as Re,B as _o,v as Sa,O as Ma,H as gn,D as Zt,w as Ta,S as Lt,x as le,f as bn,y as mn,E as xn,z as gt,W as Bn,I as La,N as wn,a as yn,b as Dn,J as za,V as Fo,Q as _a,C as Fa,R as Na,P as Ia,A as Ra}from"./vendor-three-D1JWCbWr.js";import{B as I,b as so,a as vn,E as vt,R as be,c as An,A as lo,g as Pe,d as ue,M as Pa,L as Oa,w as Qe,e as En,f as Ga,r as ze,h as Ha,P as _e,i as Xa,j as Ua,k as Ya,l as ja,m as kn,n as $a,o as Va,N as Wa,p as Ka,q as Sn,s as Za,t as Mn,u as Tn}from"./multiplayer-Bh7Xq9ci.js";import{g as qa,c as Ln,a as Ja,b as co,m as Fe,d as No,e as Qa,f as tu,T as Ft,h as Oe,i as eu,j as ou,r as nu,k as zn,l as _n,C as au}from"./scene-textures-RB-byPdu.js";import{P as uu,V as ru}from"./feed-yvp1pENn.js";import{g as Mt,o as Fn,P as me,l as iu,M as su,a as lu}from"./auth-aZ7HCW1S.js";function Io(t,e){let n=[t];for(const o of e){const a=[];for(const u of n){if(o.x1<=u.x0||o.x0>=u.x1||o.z1<=u.z0||o.z0>=u.z1){a.push(u);continue}const r=Math.max(u.x0,o.x0),l=Math.min(u.x1,o.x1),s=Math.max(u.z0,o.z0),d=Math.min(u.z1,o.z1);u.z0<s&&a.push({x0:u.x0,x1:u.x1,z0:u.z0,z1:s}),d<u.z1&&a.push({x0:u.x0,x1:u.x1,z0:d,z1:u.z1}),u.x0<r&&a.push({x0:u.x0,x1:r,z0:s,z1:d}),l<u.x1&&a.push({x0:l,x1:u.x1,z0:s,z1:d})}n=a}return n.filter(o=>o.x1-o.x0>.01&&o.z1-o.z0>.01)}function ft(t){return I.floors.find(e=>e.id===t)}function cu(t,e){const n=Ln(),o=16/50,a=t.x1-t.x0,u=t.z1-t.z0,r=n.map.clone(),l=n.normalMap.clone();for(const s of[r,l])s.needsUpdate=!0,s.repeat.set(o*a,o*u),s.offset.set((t.x0-I.minX)*o%1,(t.z0-I.minZ)*o%1);return new ut({map:r,normalMap:l,normalScale:new zt(.7,.7),color:e,roughness:.4,metalness:0})}function Et(t,e,n){const o=Ja(),a=o.map.clone(),u=o.normalMap.clone();for(const r of[a,u])r.needsUpdate=!0,r.repeat.set(t,e);return new ut({map:a,normalMap:u,normalScale:new zt(.55,.55),color:n||16777215,roughness:.9,metalness:0})}function Nn(){return new ut({map:co().map,normalMap:co().normalMap,normalScale:new zt(.35,.35),color:16777215,roughness:.92,metalness:0})}const ce=()=>new ut({color:2499615,roughness:.4,metalness:.75});function mt(t,e,n,o,a,u){const r=ce(),l=new hn({color:14214376,transparent:!0,opacity:.22,roughness:.08,side:de,depthWrite:!1}),s=Math.hypot(o-e,a-n),d=Math.atan2(o-e,a-n),m=(e+o)/2,x=(n+a)/2,g=new $t,h=new G(new Jt(.03,.03,s,10),r);h.rotation.x=Math.PI/2,h.position.y=1.05,g.add(h);const c=Math.max(2,Math.round(s/1.2)+1);for(let w=0;w<c;w++){const f=c===1?.5:w/(c-1),C=new G(new V(.045,1.05,.045),r);C.position.set(0,.525,-s/2+f*s),g.add(C)}const p=new G(new q(s,.85),l);p.rotation.y=Math.PI/2,p.position.y=.55,g.add(p),g.rotation.y=d,g.position.set(m,u,x),g.traverse(w=>{w.isMesh&&(w.castShadow=!0)}),t.add(g)}function du(t,e){const n=Et(1.2,2.4),o=e.yTo-e.yFrom,a=e.z1-e.z0,u=24,r=o/u,l=a/u,s=e.x1-e.x0,d=(e.x0+e.x1)/2;for(let h=0;h<u;h++){const c=e.yFrom+(h+1)*r,p=c-e.yFrom+.25,w=new G(new V(s,p,l),n);w.position.set(d,c-p/2,e.z0+(h+.5)*l),w.castShadow=!0,w.receiveShadow=!0,t.add(w)}const m=ce(),x=Math.hypot(a,o),g=Math.atan2(o,a);for(const h of[e.x0+.06,e.x1-.06]){const c=new G(new Jt(.03,.03,x,10),m);c.rotation.x=Math.PI/2-g,c.position.set(h,(e.yFrom+e.yTo)/2+.95,(e.z0+e.z1)/2),c.castShadow=!0,t.add(c);for(const p of[.08,.5,.92]){const w=e.yFrom+o*p,f=new G(new V(.045,.95,.045),m);f.position.set(h,w+.475,e.z0+a*p),f.castShadow=!0,t.add(f)}}}function pu(t,e,n,o,a,u,r){const l=e+I.clearH,s=.32,d=.14,m=1.1,x=Et(2,.4,13617599),g=new ut({color:3486253,normalMap:co().normalMap,normalScale:new zt(.25,.25),roughness:.95}),h=new ut({color:1710102,roughness:.5,metalness:.6}),c=new ut({color:16774880,emissive:a.downlight.emissive,emissiveIntensity:2.5*(a.downlight.intensity/22),roughness:1}),p=[],w=[],f=[];for(const C of n){const L=C.x1-C.x0,E=C.z1-C.z0,T=new G(new q(L,E),g);T.rotation.x=Math.PI/2,T.position.set((C.x0+C.x1)/2,l+s,(C.z0+C.z1)/2),t.add(T);const k=Math.ceil((C.z0-I.minZ)/m);for(let b=k;;b++){const B=I.minZ+b*m;if(B>C.z1-.05)break;if(B<C.z0+.05)continue;const A=new V(L,s,d);A.translate((C.x0+C.x1)/2,l+s/2,B),p.push(A)}const v=Math.ceil((C.x0-I.minX)/m);for(let b=v;;b++){const B=I.minX+b*m;if(B>C.x1-.05)break;if(B<C.x0+.05)continue;const A=new V(d,s,E);A.translate(B,l+s/2,(C.z0+C.z1)/2),p.push(A)}for(let b=v;;b++){const B=I.minX+b*m+m/2;if(B>C.x1-.2)break;if(!(B<C.x0+.2))for(let A=k;;A++){const F=I.minZ+A*m+m/2;if(F>C.z1-.2)break;if(F<C.z0+.2||(b*7+A*5)%3!==0)continue;const M=new Jt(.07,.08,.1,12);M.translate(B,l+s-.06,F),w.push(M);const R=new Jt(.055,.055,.02,12);R.translate(B,l+s-.12,F),f.push(R)}}}if(p.length){const C=new G(Fe(p),x);C.castShadow=!0,t.add(C)}if(w.length&&t.add(new G(Fe(w),h)),f.length&&t.add(new G(Fe(f),c)),r)for(const[C,L]of u){const E=new Aa(a.downlight.color,a.downlight.intensity*.7,9,2);E.position.set(C,l-.15,L),t.add(E),o.push(E)}return c}function Cu(t){const e=new hn({color:14478578,transparent:!0,opacity:.1,roughness:.05,side:de,depthWrite:!1}),n=ce(),o=I.maxZ,a=I.maxX-I.minX,u=ft("f1"),r=ft("f2"),l=I.clearH;for(const[p,w]of[[I.minX,-1.5],[1.5,I.maxX]]){const f=w-p,C=new G(new q(f,l),e);C.position.set((p+w)/2,u.y+l/2,o),C.rotation.y=Math.PI,t.add(C)}for(let p=I.minX;p<=I.maxX+.01;p+=2.2){if(p>-1.5&&p<1.5)continue;const w=new G(new V(.12,l,.12),n);w.position.set(p,u.y+l/2,o),w.castShadow=!0,t.add(w)}for(const p of[-1.5,1.5]){const w=new G(new V(.18,l,.18),n);w.position.set(p,u.y+l/2,o),w.castShadow=!0,t.add(w)}const s=new G(new V(a,.14,.16),n);s.position.set(0,u.y+l-.07,o),t.add(s);const d=Nn(),m=new G(new V(a,1.2,I.wallT),d);m.position.set(0,r.y+.6,o),m.castShadow=!0,m.receiveShadow=!0,t.add(m);const x=new G(new V(a,I.clearH-2.6+.6,I.wallT),d);x.position.set(0,r.y+2.6+(I.clearH-2.6+.6)/2,o),x.castShadow=!0,x.receiveShadow=!0,t.add(x);const g=new G(new q(a,1.4),e);g.position.set(0,r.y+1.9,o),g.rotation.y=Math.PI,t.add(g);for(let p=I.minX;p<=I.maxX+.01;p+=2.2){const w=new G(new V(.08,1.4,.08),n);w.position.set(p,r.y+1.9,o),t.add(w)}const h=ft("b1"),c=new G(new V(a+.6,I.storyH,I.wallT),Et(4,1));c.position.set(0,h.y+I.storyH/2,o),t.add(c)}function fu(t,e,n){const o=I,a=o.maxX-o.minX,u=o.maxZ-o.minZ,r={x0:o.minX,x1:o.maxX,z0:o.minZ,z1:o.maxZ},l=[];let s=null;const d=["b1","f1","f2"];for(const D of o.floors){const _=o.slabHoles[D.id]||[],X=Io(r,_);for(const U of X){const K=U.x1-U.x0,$=U.z1-U.z0,W=new G(new V(K,o.slabT,$),Et(K/6,$/6));W.position.set((U.x0+U.x1)/2,D.y-o.slabT/2,(U.z0+U.z1)/2),W.castShadow=!0,W.receiveShadow=!0,t.add(W);const Z=new G(new q(K,$),cu(U,D.id==="b1"?10127472:D.id==="roof"?13482132:16777215));Z.rotation.x=-Math.PI/2,Z.position.set((U.x0+U.x1)/2,D.y+.002,(U.z0+U.z1)/2),Z.receiveShadow=!0,t.add(Z)}}const m={b1:[[-6,-3],[0,-3],[6,-3],[0,3]],f1:[[-7,-4],[0,-4],[7,-4],[-7,4],[0,4],[7,4]],f2:[[-7,-4.5],[0,-4.5],[7,-4.5],[-7,5],[7,5]]},x={b1:"f1",f1:"f2",f2:"roof"};for(const D of d){const _=ft(D),X=o.slabHoles[x[D]]||[],U=Io(r,X),K=pu(t,_.y,U,l,e,m[D],n);s||(s=K)}const g=Et(3,2),h=ft("roof").y-ft("b1").y,c=ft("b1").y+h/2,p=new G(new V(a+o.wallT*2,h,o.wallT),g);p.position.set(0,c,o.minZ-o.wallT/2),p.castShadow=!0,p.receiveShadow=!0,t.add(p);for(const[D,_]of[[o.minX-o.wallT/2,1],[o.maxX+o.wallT/2,1]]){const X=new G(new V(o.wallT,h,u),g);X.position.set(D,c,0),X.castShadow=!0,X.receiveShadow=!0,t.add(X)}for(const D of d){const _=ft(D),X=Nn(),U=[{w:a,h:I.clearH,x:0,z:o.minZ+.02,ry:0},{w:u,h:I.clearH,x:o.maxX-.02,z:0,ry:-Math.PI/2},{w:u,h:I.clearH,x:o.minX+.02,z:0,ry:Math.PI/2}];for(const K of U){const $=new G(new q(K.w,K.h),X);$.position.set(K.x,_.y+I.clearH/2,K.z),$.rotation.y=K.ry,$.receiveShadow=!0,t.add($)}}Cu(t);for(const D of o.stairs)du(t,D);const w=ft("f1").y,f=ft("f2").y,C=ft("roof").y;mt(t,-8.7,-7,-8.7,-1,w),mt(t,-10.7,-7,-8.7,-7,w),mt(t,-8.7,1,-8.7,7,f),mt(t,-10.7,1,-8.7,1,f),mt(t,-4,-3,5,-3,f),mt(t,-4,3,5,3,f),mt(t,-4,-3,-4,3,f),mt(t,5,-3,5,3,f),mt(t,8.7,1,8.7,7,C),mt(t,8.7,1,10.7,1,C);const L=Et(4,.5),E=1.1,T=.25,k=[{w:a+.6,d:T,x:0,z:o.minZ-T/2},{w:a+.6,d:T,x:0,z:o.maxZ+T/2},{w:T,d:u,x:o.minX-T/2,z:0},{w:T,d:u,x:o.maxX+T/2,z:0}];for(const D of k){const _=new G(new V(D.w,E,D.d),L);_.position.set(D.x,C+E/2,D.z),_.castShadow=!0,_.receiveShadow=!0,t.add(_)}const v=new ut({map:Ln().map,color:12163695,roughness:.6});for(const[D,_]of[[-4,4],[2,-4]]){const X=new G(new V(2.2,.09,.55),v);X.position.set(D,C+.45,_),X.castShadow=!0,t.add(X);for(const U of[-.9,.9]){const K=new G(new V(.08,.42,.5),ce());K.position.set(D+U,C+.21,_),t.add(K)}}const b=new ut({color:5194806,roughness:.45,metalness:.65}),B=new $t,A=new G(new va(1.3,.42,14,28,Math.PI),b);A.castShadow=!0,B.add(A);const F=new G(new io(.55,18,14),b);F.scale.set(1.5,.75,1),F.position.set(1.1,-.95,.2),F.castShadow=!0,B.add(F),B.position.set(-2,C+1.35,.5),B.rotation.y=-.6,t.add(B);const M=new G(new Jt(1.9,1.9,.12,24),Et(1,1,14209994));M.position.set(-2,C+.06,.5),M.receiveShadow=!0,t.add(M);const R=new G(new V(2.8,.18,7.2),Et(1,2));R.position.set(9.7,C+2.6,4),R.castShadow=!0,t.add(R);for(const[D,_]of[[8.85,.8],[10.55,.8],[8.85,7.2],[10.55,7.2]]){const X=new G(new V(.12,2.6,.12),ce());X.position.set(D,C+1.3,_),t.add(X)}let S=null;return n||(S=new fn(e.downlight.color,e.downlight.intensity*.022),t.add(S)),{downlights:{lights:l,warm:S,bulbMat:s}}}function hu(t){const{minX:e,maxX:n,minZ:o,maxZ:a,wallT:u}=I,r=.55,l=e+u/2,s=n-u/2,d=o+u/2,m=a-u/2,x=new Gt({map:qa(),transparent:!0,depthWrite:!1});for(const g of I.floors){if(g.id==="roof")continue;const h=g.y+.018,c=[[s-l,(l+s)/2,d+r/2,Math.PI],[s-l,(l+s)/2,m-r/2,0],[m-d,l+r/2,(d+m)/2,-Math.PI/2],[m-d,s-r/2,(d+m)/2,Math.PI/2]];for(const[p,w,f,C]of c){const L=new G(new q(p,r),x);L.rotation.x=-Math.PI/2,L.rotation.z=C,L.position.set(w,h,f),L.renderOrder=1,t.add(L)}}}class gu extends Ea{constructor(e){super(e),this.type=he}parse(e){const r=function(b,B){switch(b){case 1:throw new Error("THREE.RGBELoader: Read Error: "+(B||""));case 2:throw new Error("THREE.RGBELoader: Write Error: "+(B||""));case 3:throw new Error("THREE.RGBELoader: Bad File Format: "+(B||""));default:case 4:throw new Error("THREE.RGBELoader: Memory Error: "+(B||""))}},m=`
`,x=function(b,B,A){B=B||1024;let M=b.pos,R=-1,S=0,D="",_=String.fromCharCode.apply(null,new Uint16Array(b.subarray(M,M+128)));for(;0>(R=_.indexOf(m))&&S<B&&M<b.byteLength;)D+=_,S+=_.length,M+=128,_+=String.fromCharCode.apply(null,new Uint16Array(b.subarray(M,M+128)));return-1<R?(b.pos+=S+R+1,D+_.slice(0,R)):!1},g=function(b){const B=/^#\?(\S+)/,A=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,F=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,M=/^\s*FORMAT=(\S+)\s*$/,R=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,S={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0};let D,_;for((b.pos>=b.byteLength||!(D=x(b)))&&r(1,"no header found"),(_=D.match(B))||r(3,"bad initial token"),S.valid|=1,S.programtype=_[1],S.string+=D+`
`;D=x(b),D!==!1;){if(S.string+=D+`
`,D.charAt(0)==="#"){S.comments+=D+`
`;continue}if((_=D.match(A))&&(S.gamma=parseFloat(_[1])),(_=D.match(F))&&(S.exposure=parseFloat(_[1])),(_=D.match(M))&&(S.valid|=2,S.format=_[1]),(_=D.match(R))&&(S.valid|=4,S.height=parseInt(_[1],10),S.width=parseInt(_[2],10)),S.valid&2&&S.valid&4)break}return S.valid&2||r(3,"missing format specifier"),S.valid&4||r(3,"missing image size specifier"),S},h=function(b,B,A){const F=B;if(F<8||F>32767||b[0]!==2||b[1]!==2||b[2]&128)return new Uint8Array(b);F!==(b[2]<<8|b[3])&&r(3,"wrong scanline width");const M=new Uint8Array(4*B*A);M.length||r(4,"unable to allocate buffer space");let R=0,S=0;const D=4*F,_=new Uint8Array(4),X=new Uint8Array(D);let U=A;for(;U>0&&S<b.byteLength;){S+4>b.byteLength&&r(1),_[0]=b[S++],_[1]=b[S++],_[2]=b[S++],_[3]=b[S++],(_[0]!=2||_[1]!=2||(_[2]<<8|_[3])!=F)&&r(3,"bad rgbe scanline format");let K=0,$;for(;K<D&&S<b.byteLength;){$=b[S++];const Z=$>128;if(Z&&($-=128),($===0||K+$>D)&&r(3,"bad scanline data"),Z){const Q=b[S++];for(let Ce=0;Ce<$;Ce++)X[K++]=Q}else X.set(b.subarray(S,S+$),K),K+=$,S+=$}const W=F;for(let Z=0;Z<W;Z++){let Q=0;M[R]=X[Z+Q],Q+=F,M[R+1]=X[Z+Q],Q+=F,M[R+2]=X[Z+Q],Q+=F,M[R+3]=X[Z+Q],R+=4}U--}return M},c=function(b,B,A,F){const M=b[B+3],R=Math.pow(2,M-128)/255;A[F+0]=b[B+0]*R,A[F+1]=b[B+1]*R,A[F+2]=b[B+2]*R,A[F+3]=1},p=function(b,B,A,F){const M=b[B+3],R=Math.pow(2,M-128)/255;A[F+0]=ge.toHalfFloat(Math.min(b[B+0]*R,65504)),A[F+1]=ge.toHalfFloat(Math.min(b[B+1]*R,65504)),A[F+2]=ge.toHalfFloat(Math.min(b[B+2]*R,65504)),A[F+3]=ge.toHalfFloat(1)},w=new Uint8Array(e);w.pos=0;const f=g(w),C=f.width,L=f.height,E=h(w.subarray(w.pos),C,L);let T,k,v;switch(this.type){case Je:v=E.length/4;const b=new Float32Array(v*4);for(let A=0;A<v;A++)c(E,A*4,b,A*4);T=b,k=Je;break;case he:v=E.length/4;const B=new Uint16Array(v*4);for(let A=0;A<v;A++)p(E,A*4,B,A*4);T=B,k=he;break;default:throw new Error("THREE.RGBELoader: Unsupported type: "+this.type)}return{width:C,height:L,data:T,header:f.string,gamma:f.gamma,exposure:f.exposure,type:k}}setDataType(e){return this.type=e,this}load(e,n,o,a){function u(r,l){switch(r.type){case Je:case he:r.colorSpace=ka,r.minFilter=Re,r.magFilter=Re,r.generateMipmaps=!1,r.flipY=!0;break}n&&n(r,l)}return super.load(e,u,o,a)}}const wo=[];function Ro(t){const n=document.createElement("canvas");n.width=1024,n.height=1024;const o=n.getContext("2d"),a=o.createLinearGradient(0,0,0,1024);for(const[d,m]of t.stops)a.addColorStop(d,m);if(o.fillStyle=a,o.fillRect(0,0,1024,1024),t.stars>0){const d=Oe(90210);for(let m=0;m<t.stars;m++){const x=d()*1024,g=d()*1024*.82,h=.4+d()*1.6,c=.35+d()*.65;if(d()>.965){const p=o.createRadialGradient(x,g,0,x,g,h*5);p.addColorStop(0,`rgba(255, 255, 255, ${c*.5})`),p.addColorStop(1,"rgba(255,255,255,0)"),o.fillStyle=p,o.beginPath(),o.arc(x,g,h*5,0,Math.PI*2),o.fill()}o.fillStyle=`rgba(255, 255, 255, ${c})`,o.beginPath(),o.arc(x,g,h,0,Math.PI*2),o.fill()}}const u=Oe(13579),[r,l]=t.cloudAlpha;for(let d=0;d<t.cloudCount;d++){const m=u()*1024,x=1024*(.3+u()*.45),g=30+u()*90;for(let h=0;h<7;h++){const c=m+(u()-.5)*g*2.4,p=x+(u()-.5)*g*.7,w=g*(.35+u()*.5),f=o.createRadialGradient(c,p,0,c,p,w);f.addColorStop(0,`rgba(${t.cloudColor}, ${r+u()*(l-r)})`),f.addColorStop(1,`rgba(${t.cloudColor}, 0)`),o.fillStyle=f,o.beginPath(),o.arc(c,p,w,0,Math.PI*2),o.fill()}}const s=new le(n);return s.colorSpace=Lt,s}const bu={daylight:"./assets/sky/day.hdr",sunset:"./assets/sky/sunset.hdr",night:"./assets/sky/night.jpg"};function xe(t,e){const n=bu[e],o=u=>{u.minFilter=Re,u.magFilter=Re,t.map=u,t.needsUpdate=!0},a=()=>{};n.endsWith(".hdr")?new gu().load(n,o,void 0,a):new Ta().load(n,u=>{u.colorSpace=Lt,o(u)},void 0,a)}function mu(t,e,n){if(n){const u=(d,m)=>new G(new io(m,32,16),new Gt({map:Ro(d),side:_o,fog:!1,transparent:!0,depthWrite:!1,opacity:0})),r=u(Ft.night.sky,450),l=u(Ft.sunset.sky,448),s=u(Ft.daylight.sky,446);for(const d of[r,l,s])d.position.y=-70;return r.renderOrder=-3,l.renderOrder=-2,s.renderOrder=-1,t.add(r,l,s),xe(s.material,"daylight"),xe(l.material,"sunset"),xe(r.material,"night"),{daylight:s,sunset:l,night:r}}const o=e===Ft.sunset?"sunset":e===Ft.night?"night":"daylight",a=new G(new io(450,32,16),new Gt({map:Ro(e.sky),side:_o,fog:!1}));return a.position.y=-70,t.add(a),xe(a.material,o),null}function xu(t,e){const n=new G(new q(800,800),new ut({map:No().map,normalMap:No().normalMap,normalScale:new zt(.6,.6),color:e.grassTint,roughness:.95,metalness:0}));n.rotation.x=-Math.PI/2,n.position.y=-.03,n.receiveShadow=!0,t.add(n);const o=new G(new q(400,900),new ut({color:e.sea.color,roughness:e.sea.roughness,metalness:e.sea.metalness}));o.rotation.x=-Math.PI/2,o.position.set(290,-.02,0),t.add(o);const a=new G(new q(8,900),new ut({color:13220758,roughness:.9}));a.rotation.x=-Math.PI/2,a.position.set(88,-.025,0),t.add(a);const u=Oe(97531),r=new $t;let l=4e4;function s(h,c,p){l+=733;const w=so(l,{trunkLen:2.6*p,trunkRad:.24*p,maxLevel:2,leafScale:.95*p});w.position.set(h,0,c),w.rotation.y=u()*Math.PI*2,r.add(w)}[[-12,30,1],[4,31,1.15],[12,34,.9],[34,-18,1.1],[36,14,.95]].forEach(([h,c,p],w)=>{const f=so(6e4+w*137,{trunkLen:3.2*p,trunkRad:.32*p,maxLevel:2,leafScale:1.1*p});f.position.set(h+(u()-.5)*2,0,c+(u()-.5)*2),f.rotation.y=u()*Math.PI*2,r.add(f)});const m=[[-20,33],[-4,35],[20,30],[-16,42],[-6,45],[6,43],[16,46],[0,52],[-24,50],[24,48]];for(const[h,c]of m)s(h+(u()-.5)*3,c+(u()-.5)*3,1+u()*.9);const x=[[40,-10],[44,22],[52,-18],[60,8],[48,-2]];for(const[h,c]of x)s(h+(u()-.5)*3,c+(u()-.5)*3,.9+u()*.8);const g=[[-35,-30],[-45,0],[-38,20],[-30,40],[20,-40],[-10,-38]];for(const[h,c]of g)s(h+(u()-.5)*4,c+(u()-.5)*4,1.1+u()*1);for(const h of vn(r))t.add(h);return{seaMat:o.material}}function Bu(t,e){const n=so(31415,{trunkLen:4.6,trunkRad:.42,maxLevel:3,leafScale:1.4});n.position.set(7,0,14);for(const u of vn(n))t.add(u);const o=new G(new Jt(.42,.72,.45,9),new ut({map:tu(),normalMap:Qa(),normalScale:new zt(.9,.9),roughness:.95}));o.position.set(7,.22,14),o.castShadow=!0,t.add(o);const a=[];if(e.treeUplights)for(const[u,r]of[[5.6,13],[8.4,15]]){const l=new Sa(16756838,150,15,Math.PI/5,.9,1.8);l.position.set(u,.35,r);const s=new Ma;s.position.set(7,7,14),t.add(s),l.target=s,l.castShadow=!1,t.add(l),a.push(l)}return{treeUplights:a}}function Po(t,e){const n=new $t,o=new q(.16,.12);o.translate(-.09,0,0);const a=new q(.16,.12);a.translate(.09,0,0);const u=new Gt({color:e.color,side:de}),r=new G(o,u),l=new G(a,u);r.rotation.x=-Math.PI/2,l.rotation.x=-Math.PI/2,n.add(r),n.add(l),t.add(n),wo.push({update(s){const d=s*e.speed+e.phase,m=e.cx+Math.cos(d)*e.rx,x=e.cz+Math.sin(d*e.zRatio)*e.rz,g=e.cy+Math.sin(s*e.bobSpeed+e.phase)*e.bobAmp,h=-Math.sin(d)*e.rx*e.speed,c=Math.cos(d*e.zRatio)*e.rz*e.zRatio*e.speed;n.rotation.y=Math.atan2(h,c),n.position.set(m,g,x);const p=Math.sin(s*e.flapSpeed)*1.1;r.rotation.y=p,l.rotation.y=-p}})}function wu(t,e){const n=new $t,o=new Gt({color:2763310,side:de}),a=new q(1.6,.35);a.translate(-.8,0,0);const u=new q(1.6,.35);u.translate(.8,0,0);const r=new G(a,o),l=new G(u,o);r.rotation.x=-Math.PI/2,l.rotation.x=-Math.PI/2,n.add(r),n.add(l),t.add(n),wo.push({update(s){const d=s*e.speed+e.phase,m=e.cx+Math.cos(d)*e.radius,x=e.cz+Math.sin(d)*e.radius,g=e.cy+Math.sin(s*.3+e.phase)*2;n.rotation.y=-d-Math.PI/2,n.position.set(m,g,x);const h=Math.sin(s*e.flapSpeed+e.phase)*.55;r.rotation.y=h,l.rotation.y=-h}})}function yu(t){const e=Oe(86420),n=[15241786,15979338,15262938,13070264,8368864];for(let o=0;o<5;o++)Po(t,{cx:7,cz:14,cy:1.4+e()*3,rx:1+e()*2.2,rz:1+e()*2.2,zRatio:.7+e()*.6,speed:.35+e()*.4,phase:e()*Math.PI*2,bobSpeed:1.5+e()*1.5,bobAmp:.3+e()*.3,flapSpeed:9+e()*5,color:n[o%n.length]});for(let o=0;o<4;o++)Po(t,{cx:-14+o*10+e()*4,cz:30+e()*8,cy:1.2+e()*2,rx:1.5+e()*3,rz:1.5+e()*3,zRatio:.6+e()*.8,speed:.3+e()*.35,phase:e()*Math.PI*2,bobSpeed:1.2+e()*1.6,bobAmp:.35+e()*.4,flapSpeed:8+e()*5,color:n[(o+2)%n.length]});for(let o=0;o<3;o++)wu(t,{cx:20+e()*30,cz:-10+e()*40,cy:26+e()*12,radius:55+e()*45,speed:.04+e()*.03,phase:e()*Math.PI*2,flapSpeed:2.2+e()*1.2})}function Du(t,e){const n=new gn(e.hemi.sky,e.hemi.ground,e.hemi.intensity);n.position.set(0,40,0),t.add(n);const o=new fn(e.ambient.color,e.ambient.intensity);t.add(o);const a=new Zt(e.sun.color,e.sun.intensity);a.position.set(...e.sun.pos),a.castShadow=!0,a.shadow.mapSize.set(2048,2048),a.shadow.bias=-5e-4,a.shadow.normalBias=.02;const u=e.shadowCamera;a.shadow.camera.left=u.left,a.shadow.camera.right=u.right,a.shadow.camera.top=u.top,a.shadow.camera.bottom=u.bottom,a.shadow.camera.near=u.near,a.shadow.camera.far=u.far,t.add(a),t.add(a.target);const r=new Zt(e.fill.color,e.fill.intensity);return r.position.set(...e.fill.pos),t.add(r),{hemi:n,ambient:o,sun:a,fill:r}}function vu(t){for(const e of wo)e.update(t)}let kt=null,Oo=0;function Au(t){Oo+=t,vu(Oo),kt&&(kt.phase=(kt.phase+t/au)%1,zn(kt,_n(kt.phase)))}function Eu(t,e="daylight",n={}){const o=n.fullLights!==!1,a=e==="cycle",u=a?eu():0,r=a?ou(u):nu(e);t.background=new bn(r.background),t.fog=new mn(r.fog.color,r.fog.near,r.fog.far);const l=mu(t,r,a),s=xu(t,r);hu(t);const d=fu(t,r,o),m=Bu(t,r),x=d.downlights,g=Du(t,r);if(yu(t),a){const h=new Zt(Ft.night.sun.color,0);h.position.set(...Ft.night.sun.pos),t.add(h),t.add(h.target),kt={scene:t,phase:u,sunLight:g.sun,hemiLight:g.hemi,ambientLight:g.ambient,moonLight:h,seaMat:s.seaMat,downlights:x,treeUplights:m.treeUplights,skyDomes:l},g.sun.shadow.camera.updateProjectionMatrix(),zn(kt,_n(u))}else kt=null;return{bounds:{minX:I.minX+.6,maxX:I.maxX-.6,minZ:I.minZ+.6,maxZ:I.maxZ-.6}}}let at=null,re=null,ne=!1;function ku(t,e){if(!at)return;const n=new StereoPannerNode(at,{pan:e});n.connect(re);const o=2+Math.floor(Math.random()*4);let a=at.currentTime+.02;for(let u=0;u<o;u++){const r=at.createOscillator(),l=at.createGain();r.connect(l),l.connect(n);const s=t*(.85+Math.random()*.4),d=s*(Math.random()>.5?1.25:.78),m=.05+Math.random()*.1;r.type="sine",r.frequency.setValueAtTime(s,a),r.frequency.exponentialRampToValueAtTime(d,a+m),l.gain.setValueAtTime(1e-4,a),l.gain.exponentialRampToValueAtTime(.55,a+.012),l.gain.exponentialRampToValueAtTime(1e-4,a+m),r.start(a),r.stop(a+m+.02),a+=m+.04+Math.random()*.09}}function Su(){const t=at.sampleRate*4,e=at.createBuffer(1,t,at.sampleRate),n=e.getChannelData(0);let o=0;for(let l=0;l<t;l++){const s=Math.random()*2-1;o=(o+.02*s)/1.02,n[l]=o*3.5}const a=at.createBufferSource();a.buffer=e,a.loop=!0;const u=at.createBiquadFilter();u.type="lowpass",u.frequency.value=400;const r=at.createGain();r.gain.value=.012,a.connect(u),u.connect(r),r.connect(re),a.start()}function po(){if(!ne)return;const t=[{base:2600,pan:-.7},{base:3400,pan:.6},{base:4200,pan:.15}],e=t[Math.floor(Math.random()*t.length)];ku(e.base,e.pan+(Math.random()-.5)*.3);const n=900+Math.random()*4200;setTimeout(po,n)}function Mu(){if(!ne)try{at=new(window.AudioContext||window.webkitAudioContext),re=at.createGain(),re.gain.value=.05,re.connect(at.destination),at.state==="suspended"&&at.resume(),ne=!0,Su(),po(),setTimeout(()=>{ne&&po()},2500)}catch{ne=!1}}const ee=2.5,Go=4.5,Ho=.0022,Xo=.0058,Be=gt.degToRad(89),Tu=.03,Lu=7.5,we=60,Dt=.45,Uo=.65,zu=12;function _u(t,e){for(const n of I.stairs){const o=Math.min(n.x0,n.x1),a=Math.max(n.x0,n.x1);if(t<o||t>a)continue;const u=Math.min(n.z0,n.z1),r=Math.max(n.z0,n.z1);if(e<u||e>r)continue;const l=gt.clamp((e-n.z0)/(n.z1-n.z0),0,1);return n.yFrom+l*(n.yTo-n.yFrom)}return null}function Fu(t,e,n){return e>=t.x0&&e<=t.x1&&n>=t.z0&&n<=t.z1}function Nu(t,e){return t>=I.minX&&t<=I.maxX&&e>=I.minZ&&e<=I.maxZ}function In(t,e){const n=[],o=_u(t,e);if(o!==null&&n.push(o),Nu(t,e))for(const a of I.floors){const u=I.slabHoles[a.id]||[];let r=!1;for(const l of u)if(Fu(l,t,e)){r=!0;break}r||n.push(a.y)}else n.push(0);return n}function Iu(t,e,n){const o=In(t,e);let a=null;for(const u of o)u<=n+Uo&&(a===null||u>a)&&(a=u);return a===null||n-a>Uo?null:a}function Ru(t,e){let n=t,o=e;return e>I.minZ-Dt&&e<I.maxZ+Dt&&(n=gt.clamp(t,I.minX+Dt,I.maxX-Dt)),t>I.minX-Dt&&t<I.maxX+Dt&&(o=Math.max(e,I.minZ+Dt)),{x:n,z:o}}class Pu{constructor(e,n){if(this.camera=e,this.domElement=n,this.enabled=!1,this.euler=new xn(0,0,0,"YXZ"),this.camera.rotation.set(0,0,0),this.camera.rotation.order="YXZ",this.camera.position.set(0,vt,8),this.keys={forward:!1,backward:!1,left:!1,right:!1,run:!1},this.velocity=new zt(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0,this.groundY=this.camera.position.y-vt,this.moveTouch=null,this.lookTouch=null,!document.getElementById("lu-joy-style")){const o=document.createElement("style");o.id="lu-joy-style",o.textContent=`
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
    inset 0 -2px 4px rgba(32,74,52,0.30); }`,document.head.appendChild(o)}this._joyBase=document.createElement("div"),this._joyBase.className="lu-joy-base",this._joyKnob=document.createElement("div"),this._joyKnob.className="lu-joy-knob",this._wasRunning=!1,document.body.appendChild(this._joyBase),document.body.appendChild(this._joyKnob),this._bindEvents()}_bindEvents(){this._onClick=()=>{this.enabled&&document.pointerLockElement!==this.domElement&&this.domElement.requestPointerLock?.()},this.domElement.addEventListener("click",this._onClick),this._onMouseMove=e=>{this.enabled&&document.pointerLockElement===this.domElement&&(this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=e.movementX*Ho,this.euler.x-=e.movementY*Ho,this.euler.x=gt.clamp(this.euler.x,-Be,Be),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler))},document.addEventListener("mousemove",this._onMouseMove),this._onKeyDown=e=>{if(!this.enabled)return;const n=e.target;n&&(n.tagName==="INPUT"||n.tagName==="TEXTAREA")||this._setKey(e.code,!0)},this._onKeyUp=e=>{this._setKey(e.code,!1)},document.addEventListener("keydown",this._onKeyDown),document.addEventListener("keyup",this._onKeyUp),this._onTouchStart=e=>{if(this.enabled){for(const n of e.changedTouches){const o=window.innerWidth*.5;n.clientX<o&&this.moveTouch===null?(this.moveTouch={id:n.identifier,startX:n.clientX,startY:n.clientY,dx:0,dy:0},this._joyBase.style.left=n.clientX+"px",this._joyBase.style.top=n.clientY+"px",this._joyKnob.style.left=n.clientX+"px",this._joyKnob.style.top=n.clientY+"px",this._joyBase.classList.add("lu-live"),this._joyKnob.classList.add("lu-live")):n.clientX>=o&&this.lookTouch===null&&(this.lookTouch={id:n.identifier,lastX:n.clientX,lastY:n.clientY})}e.cancelable&&e.preventDefault()}},this._onTouchMove=e=>{if(this.enabled){for(const n of e.changedTouches)if(this.moveTouch&&n.identifier===this.moveTouch.id){const o=n.clientX-this.moveTouch.startX,a=n.clientY-this.moveTouch.startY,u=Math.hypot(o,a),r=u>we?we/u:1;this.moveTouch.dx=o*r/we,this.moveTouch.dy=a*r/we,this._joyKnob.style.left=this.moveTouch.startX+o*r+"px",this._joyKnob.style.top=this.moveTouch.startY+a*r+"px";const l=Math.hypot(this.moveTouch.dx,this.moveTouch.dy)>.85;this._joyBase.classList.toggle("lu-run",l),this._joyKnob.classList.toggle("lu-run",l),l&&!this._wasRunning&&navigator.vibrate&&navigator.vibrate(10),this._wasRunning=l}else if(this.lookTouch&&n.identifier===this.lookTouch.id){const o=n.clientX-this.lookTouch.lastX,a=n.clientY-this.lookTouch.lastY;this.lookTouch.lastX=n.clientX,this.lookTouch.lastY=n.clientY,this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=o*Xo,this.euler.x-=a*Xo,this.euler.x=gt.clamp(this.euler.x,-Be,Be),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler)}e.cancelable&&e.preventDefault()}},this._onTouchEnd=e=>{for(const n of e.changedTouches)this.moveTouch&&n.identifier===this.moveTouch.id?(this.moveTouch=null,this._wasRunning=!1,this._joyBase.classList.remove("lu-live","lu-run"),this._joyKnob.classList.remove("lu-live","lu-run")):this.lookTouch&&n.identifier===this.lookTouch.id&&(this.lookTouch=null)},this.domElement.addEventListener("touchstart",this._onTouchStart,{passive:!1}),this.domElement.addEventListener("touchmove",this._onTouchMove,{passive:!1}),this.domElement.addEventListener("touchend",this._onTouchEnd),this.domElement.addEventListener("touchcancel",this._onTouchEnd)}_setKey(e,n){switch(e){case"KeyW":case"ArrowUp":this.keys.forward=n;break;case"KeyS":case"ArrowDown":this.keys.backward=n;break;case"KeyA":case"ArrowLeft":this.keys.left=n;break;case"KeyD":case"ArrowRight":this.keys.right=n;break;case"ShiftLeft":case"ShiftRight":this.keys.run=n;break}}_tryMove(e,n){const o=Ru(e,n),a=gt.clamp(o.x,-24,be.bound),u=gt.clamp(o.z,-24,be.bound),r=I.maxZ,l=this.camera.position.z;if(a>I.minX-Dt&&a<I.maxX+Dt&&(l-r)*(u-r)<0&&Math.abs(a)>1.4)return null;const d=Iu(a,u,this.groundY);return d===null?null:{x:a,z:u,y:d}}update(e){if(!this.enabled)return;e=Math.min(e,.1);let n=0,o=0;this.keys.forward&&(o-=1),this.keys.backward&&(o+=1),this.keys.left&&(n-=1),this.keys.right&&(n+=1);let a=this.keys.run?Go:ee;if(this.moveTouch&&n===0&&o===0){n=this.moveTouch.dx,o=this.moveTouch.dy;const C=Math.hypot(n,o);C<.14&&(n=0,o=0),a=ee+(Go-ee)*Math.min(1,Math.max(0,(C-.85)/.15))}else{const C=Math.hypot(n,o);C>1&&(n/=C,o/=C)}this.euler.setFromQuaternion(this.camera.quaternion,"YXZ");const u=this.euler.y,r=Math.sin(u),l=Math.cos(u),s=(n*l+o*r)*a,d=(-n*r+o*l)*a,m=1-Math.exp(-10*e);this.velocity.x+=(s-this.velocity.x)*m,this.velocity.y+=(d-this.velocity.y)*m;const x=this.camera.position,g=x.x+this.velocity.x*e,h=x.z+this.velocity.y*e;let c=this._tryMove(g,h);if(!c){const C=this._tryMove(g,x.z),L=this._tryMove(x.x,h);c=C||L||null}c&&(x.x=c.x,x.z=c.z,this.groundY=c.y);const p=Math.hypot(this.velocity.x,this.velocity.y);if(p>.3){this.bobPhase+=e*Lu*(p/ee);const C=Math.min(1,p/ee);this.bobOffset=Math.sin(this.bobPhase)*Tu*C}else this.bobOffset+=(0-this.bobOffset)*m,Math.abs(this.bobOffset)<5e-4&&(this.bobOffset=0,this.bobPhase=0);const w=Math.min(1,zu*e),f=this.groundY+vt+this.bobOffset+this.liftOffset;x.y+=(f-x.y)*w}resolveBodyCollisions(e){if(!this.enabled||!e||!e.length)return;const n=.6,o=1.2,a=this.camera.position;let u=a.x,r=a.z,l=!1,s=0,d=0;for(const g of e){if(!g||g.y!=null&&Math.abs(g.y-this.groundY)>o)continue;const h=u-g.x,c=r-g.z,p=Math.hypot(h,c);if(p>=n)continue;const w=p>1e-4?h/p:Math.sin(this.euler.y),f=p>1e-4?c/p:Math.cos(this.euler.y);u=g.x+w*n,r=g.z+f*n,s=w,d=f,l=!0}if(!l)return;const m=this._tryMove(u,r);m&&(a.x=m.x,a.z=m.z,this.groundY=m.y);const x=this.velocity.x*-s+this.velocity.y*-d;x>0&&(this.velocity.x+=s*x,this.velocity.y+=d*x)}getState(){return this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z,ry:this.euler.y}}setPose({x:e,y:n,z:o,ry:a}){const u=gt.clamp(e,-24,be.bound),r=gt.clamp(o,-24,be.bound);let l;if(n!=null)l=n-vt;else{const s=In(u,r);l=s.length?Math.max(...s):0}this.groundY=l,this.camera.position.set(u,l+vt,r),this.euler.set(0,a,0,"YXZ"),this.camera.quaternion.setFromEuler(this.euler),this.velocity.set(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0}enable(){this.enabled=!0}disable(){this.enabled=!1,this.keys.forward=this.keys.backward=this.keys.left=this.keys.right=this.keys.run=!1,this.velocity.set(0,0),this.moveTouch=null,this.lookTouch=null,document.pointerLockElement===this.domElement&&document.exitPointerLock?.()}dispose(){this.disable(),this.domElement.removeEventListener("click",this._onClick),document.removeEventListener("mousemove",this._onMouseMove),document.removeEventListener("keydown",this._onKeyDown),document.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("touchstart",this._onTouchStart),this.domElement.removeEventListener("touchmove",this._onTouchMove),this.domElement.removeEventListener("touchend",this._onTouchEnd),this.domElement.removeEventListener("touchcancel",this._onTouchEnd)}}const Ou=3,Gu=6,Yo=2.2,Hu=.05;function Xu({player:t,getSelfAvatar:e}){let n=!1,o=0,a=0,u=0;const r=c=>{if(c.code!=="Space"||!t||!t.enabled)return;const p=c.target;p&&(p.tagName==="INPUT"||p.tagName==="TEXTAREA")||(n=!0,c.preventDefault())},l=c=>{c.code==="Space"&&(n=!1)};document.addEventListener("keydown",r),document.addEventListener("keyup",l);let s=null;const d=typeof window<"u"&&window.matchMedia&&window.matchMedia("(pointer: coarse)").matches,m=c=>{n=!0,s&&s.classList.add("lu-fly-on"),c.cancelable&&c.preventDefault(),c.stopPropagation()},x=c=>{n=!1,s&&s.classList.remove("lu-fly-on"),c.stopPropagation()};d&&(s=document.createElement("button"),s.id="lu-fly-btn",s.type="button",s.setAttribute("aria-label","날기 — 누르고 있으면 상승"),s.textContent="▲",s.style.cssText=["position:fixed","right:20px","bottom:104px","width:64px","height:64px","border-radius:50%","border:1.5px solid rgba(255,255,255,0.34)","background:rgba(22,24,30,0.44)","color:rgba(255,255,255,0.92)","font-size:20px","line-height:1","z-index:6","display:none","align-items:center","justify-content:center","touch-action:none","user-select:none","-webkit-user-select:none","cursor:pointer","box-shadow:0 2px 12px rgba(0,0,0,0.32)","transition:background 0.12s, transform 0.12s, opacity 0.2s"].join(";"),s.addEventListener("touchstart",m,{passive:!1}),s.addEventListener("touchend",x),s.addEventListener("touchcancel",x),s.addEventListener("pointerdown",c=>{c.pointerType!=="touch"&&m(c)}),s.addEventListener("pointerup",c=>{c.pointerType!=="touch"&&x(c)}),document.body.appendChild(s));function g(c){const p=Math.min(c||0,.1),w=!!(t&&t.enabled);w||(n=!1),t&&t.liftOffset!==u&&(o=t.liftOffset,a=0),n?a=Ou:(a-=Gu*p,a<-5&&(a=-5)),o+=a*p,o>=Yo&&(o=Yo,a=0),o<=0&&(o=0,a=0),t&&(t.liftOffset=o,u=o);const f=w&&o>Hu,C=e&&e();C&&typeof C.setFlying=="function"&&C.setFlying(f),s&&(s.style.display=w?"flex":"none")}function h(){document.removeEventListener("keydown",r),document.removeEventListener("keyup",l),s&&s.parentNode&&s.parentNode.removeChild(s)}return{update:g,dispose:h}}const Rn="#5f9e7d";function Uu(){const t=`
/* 폰트(@font-face·스택)는 SSOT인 vendor/fonts/fonts.css가 담당 — index.html <head>에서
   정적 <link>로 로드된다. 여기선 그 단일 스택(--app-font)만 --lu-font로 잇는다. */
:root {
  --lu-gold: ${Rn};
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
`,e=document.createElement("style");e.id="lu-styles",e.textContent=t,document.head.appendChild(e)}function i(t,e={},n=[]){const o=document.createElement(t);for(const[a,u]of Object.entries(e))a==="className"?o.className=u:a==="text"?o.textContent=u:o.setAttribute(a,u);for(const a of n)o.appendChild(a);return o}const Yu="lu-chibi-look::",ju="lu-chibi-thumb::",$u="lu-chibi-closet::",Vu="lu-chibi-look-v1",Wu="lu-chibi-look-thumb-v1",jo=12;function $e(){const t=Mt();return t&&t.provider&&t.name?`${t.provider}:${t.name}`:"guest"}function Ge(t){return Yu+(t||$e())}function yo(t){return ju+(t||$e())}function Pn(t){return $u+(t||$e())}function Ku(){try{const t=localStorage.getItem(Vu);if(t&&!localStorage.getItem(Ge("guest"))){localStorage.setItem(Ge("guest"),t);const e=localStorage.getItem(Wu);e&&localStorage.setItem(yo("guest"),e)}}catch{}}Ku();function On(t){try{const e=localStorage.getItem(Ge(t));if(!e)return null;const n=JSON.parse(e);return n&&typeof n=="object"?n:null}catch{return null}}function Zu(t,e){try{return localStorage.setItem(Ge(e),JSON.stringify(t)),!0}catch{return!1}}function $o(t){try{return localStorage.getItem(yo(t))||""}catch{return""}}function qu(t,e){try{localStorage.setItem(yo(e),t)}catch{}}let Do=null;function Ju(t){Do=t}function Gn(){return Do||On()}Fn(()=>{Do=null});function to(t){try{const e=localStorage.getItem(Pn(t));if(!e)return[];const n=JSON.parse(e);return Array.isArray(n)?n:[]}catch{return[]}}function Vo(t,e){try{return localStorage.setItem(Pn(e),JSON.stringify(t)),!0}catch{return!1}}function Qu(t,e,n){try{const o=document.createElement("canvas");return o.width=e,o.height=n,o.getContext("2d").drawImage(t,0,0,e,n),o.toDataURL("image/jpeg",.72)}catch{return""}}let J=null,et=null,Wt=null,ye=0,De=!1,eo=0,ve=0,oo=Math.PI;const tr=gt.degToRad(18),er=.6,Wo='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 19.5C4.5 10 11 4 20 4c0 9-6 15.5-15.5 15.5A1 1 0 0 1 4.5 19.5Z"/><path d="M6.7 17.3C10.2 13.3 14.2 9.3 18 5.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>',or=[{id:"species",label:"종족",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8.3" r="2.1"/><circle cx="12" cy="6.1" r="2.1"/><circle cx="17" cy="8.3" r="2.1"/><path d="M12 11.6c-3.4 0-6.1 2.4-6.1 5.2 0 2 1.8 3.3 3.7 2.6.9-.3 1.7-.3 2.6 0 1.9.7 3.7-.6 3.7-2.6 0-2.8-2.5-5.2-5.9-5.2Z"/></svg>'},{id:"face",label:"얼굴",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><path d="M8.6 14.6c1 1.1 2.1 1.7 3.4 1.7s2.4-.6 3.4-1.7"/></svg>'},{id:"hair",label:"헤어",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12.5C5 8 8.1 4.5 12 4.5s7 3.5 7 8"/><path d="M6.3 12.5v3.2M10.1 12.5v4.2M13.9 12.5v4.2M17.7 12.5v3.2"/></svg>'},{id:"outfit",label:"의상",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8.3 4.2 4.3 7.3l2 3 2-1.1v9.6h7.4V9.2l2 1.1 2-3-4-3.1c-.7 1-1.8 1.6-3.7 1.6s-3-.6-3.7-1.6Z"/></svg>'},{id:"acc",label:"장식",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.5 3.5 1.7 6.3 5.2 7.6-3.5 1.3-4.7 4.1-5.2 7.6-.5-3.5-1.7-6.3-5.2-7.6C10.3 9.3 11.5 6.5 12 3Z"/><circle cx="19" cy="5.2" r="1.2"/></svg>'},{id:"closet",label:"옷장",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.3"/><path d="M12 5.9v1.8"/><path d="M12 7.7 4.3 13.4h15.4L12 7.7Z"/><path d="M4.3 17.4h15.4"/></svg>'}];function nr(t){const{els:e,state:n,callbacks:o,setStatus:a}=t,u=i("button",{id:"lu-am-save",type:"button","aria-label":"이 캐릭터 사용",title:"이 캐릭터 사용",text:"✓"}),r=i("button",{id:"lu-am-close",type:"button","aria-label":"닫기",text:"×"}),l=i("span",{className:"lu-am-title-icon","aria-hidden":"true"});l.innerHTML=Wo;const s=i("div",{className:"lu-am-title"},[l,i("span",{text:"캐릭터 디자인"})]),d=i("div",{className:"lu-am-head-actions"},[u,r]),m=i("div",{className:"lu-am-head"},[s,d]),x=i("canvas",{width:"300",height:"400"}),g=i("div",{className:"lu-am-stage"},[x]),h=i("div",{className:"lu-am-stagewrap"},[g]),c=i("div",{className:"lu-am-preview"},[h]),p=["wave","jump","clap","dance","breakdance","run","jumpingjack","heart","kick"];let w=1,f=null,C=null,L=null,E=null;function T(z,P){if(typeof document>"u")return null;const N=document.createElement("canvas");N.width=2,N.height=256;const H=N.getContext("2d"),O=H.createLinearGradient(0,0,0,256);O.addColorStop(0,z),O.addColorStop(1,P),H.fillStyle=O,H.fillRect(0,0,2,256);const Y=new le(N);return Y.colorSpace=Lt,Y}function k(z,P){if(typeof document>"u")return null;const N=512,H=307,O=document.createElement("canvas");O.width=N,O.height=H;const Y=O.getContext("2d");Y.fillStyle=z,Y.fillRect(0,0,N,H);const ct=28,At=N/ct;Y.fillStyle=P;for(let te=0;te<ct;te++)Y.fillRect(te*At,0,At/2,H);const Qt=new le(O);return Qt.colorSpace=Lt,Qt.anisotropy=4,Qt}function v(){if(f)return;f=new Bn({canvas:x,antialias:!0,alpha:!0}),f.setPixelRatio(Math.min(2,typeof window<"u"&&window.devicePixelRatio||1)),f.setSize(300,400,!1),f.shadowMap.enabled=!0,f.shadowMap.type=La,f.toneMapping=wn,f.toneMappingExposure=1,f.outputColorSpace=Lt,C=new yn,C.background=T("#f0ead9","#ddd2bd")||new bn("#ddd2bd"),C.fog=new mn(14603199,5.5,10),L=new Dn(30,300/400,.1,20),L.position.set(0,1,4),L.lookAt(0,.85,0),C.add(new gn(16775924,2367256,.65));const z=new Zt(16777215,1.4);z.position.set(.7,2,2.6),C.add(z);const P=new Zt(16776696,.4);P.position.set(-1.8,1.1,1.6),C.add(P);const N=new Zt(16777215,0);N.position.set(.4,5,1),N.castShadow=!0,N.shadow.mapSize.set(512,512),N.shadow.camera.near=.5,N.shadow.camera.far=9,N.shadow.camera.left=-1.3,N.shadow.camera.right=1.3,N.shadow.camera.top=1.3,N.shadow.camera.bottom=-1.3,N.shadow.radius=35,N.shadow.blurSamples=24,N.shadow.bias=-5e-4,C.add(N),C.add(N.target);const H=new G(new q(6,6),new ut({color:12165231,roughness:.9,metalness:0}));H.rotation.x=-Math.PI/2,H.position.y=0,H.receiveShadow=!0,C.add(H);const O=new G(new q(6,6),new za({opacity:.3}));O.rotation.x=-Math.PI/2,O.position.y=.002,O.material.polygonOffset=!0,O.material.polygonOffsetFactor=-1,O.receiveShadow=!0,C.add(O);const Y=k("#e2d7bf","#efe7d3"),ct=new G(new q(10,6),new ut({map:Y,roughness:.9,metalness:0}));ct.position.set(0,2.2,-2.3),C.add(ct),E=new $t,E.rotation.y=Math.PI,C.add(E)}let b="species";const B=i("div",{className:"lu-am-nav",role:"tablist","aria-label":"캐릭터 디자인 카테고리"}),A=i("div",{className:"lu-am-panel"}),F=i("div",{className:"lu-am-tabpage",id:"lu-am-tabpanel",role:"tabpanel",tabindex:"0"});A.appendChild(B),A.appendChild(F),B.addEventListener("keydown",z=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(z.key))return;const P=[...B.querySelectorAll(".lu-am-navtab")];if(!P.length)return;const N=P.findIndex(Y=>Y.getAttribute("aria-selected")==="true");let H=N<0?0:N;z.key==="ArrowLeft"?H=(N-1+P.length)%P.length:z.key==="ArrowRight"?H=(N+1)%P.length:z.key==="Home"?H=0:z.key==="End"&&(H=P.length-1),z.preventDefault(),P[H].click();const O=B.querySelectorAll(".lu-am-navtab")[H];O&&O.focus()});const M=i("div",{className:"lu-am-body"},[c,A]),R=i("div",{className:"lu-am-card"},[m,M]),S=i("div",{id:"lu-chibi-maker",className:"lu"},[R]);document.body.appendChild(S);function D(z,P){J&&(J[z]=P,z==="species"&&P!=="human"&&To[P]&&Object.assign(J,To[P]),J=Ze(J),Ke(),Vt())}function _(z){J=Ze(Object.assign({},z)),Ke(),Vt()}function X(){for(const z of sa){const P=la.filter(H=>(H.cat||"human")===z.id);if(!P.length)continue;F.appendChild(i("div",{className:"lu-am-section-title",text:`${z.name} (${P.length})`}));const N=i("div",{className:"lu-am-tabs lu-am-presets"});for(const H of P){const O=i("button",{type:"button",className:"lu-am-tab lu-am-preset"}),Y=H.look.skin||Le.skin,ct=H.look.top||H.look.hairColor||Le.top,At=i("span",{className:"lu-am-preset-dot","aria-hidden":"true"});At.style.background=`conic-gradient(${Y} 0deg 180deg, ${ct} 180deg 360deg)`,O.appendChild(At),O.appendChild(i("span",{className:"lu-am-preset-label",text:H.name})),O.addEventListener("click",()=>_(H.look)),N.appendChild(O)}F.appendChild(N)}}function U(z){const P=Lo.find(N=>N.id===z);return P&&P.name||"아야모"}function K(){if(!Mt())return;const z=$e();Q("내 옷장");const P=i("button",{type:"button",className:"lu-am-btn lu-closet-save",text:"＋ 지금 모습 옷장에 저장"});P.addEventListener("click",()=>{const O=to(z);if(O.length>=jo){a(`옷장은 최대 ${jo}벌까지 저장할 수 있어요`);return}const Y={id:"c"+Date.now(),name:U(J.species),look:JSON.parse(JSON.stringify(J)),thumb:Mo(120,160),ts:Date.now()};if(O.push(Y),!Vo(O,z)){a("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요");return}Vt()}),F.appendChild(P);const N=to(z);if(!N.length){F.appendChild(i("div",{className:"lu-closet-empty",text:"아직 저장한 옷이 없어요. 마음에 드는 모습을 저장해 두세요."}));return}const H=i("div",{className:"lu-closet-grid"});N.forEach(O=>{const Y=i("div",{className:"lu-closet-cell"}),ct=i("button",{type:"button",className:"lu-closet-load",title:`${O.name} 불러오기`,"aria-label":`${O.name} 불러오기`});O.thumb&&(ct.style.backgroundImage=`url('${O.thumb}')`),ct.appendChild(i("span",{className:"lu-closet-name",text:O.name})),ct.addEventListener("click",()=>_(O.look));const At=i("button",{type:"button",className:"lu-closet-del",text:"×",title:"삭제","aria-label":`${O.name} 삭제`});At.addEventListener("click",Qt=>{Qt.stopPropagation();const te=to(z).filter(ia=>ia.id!==O.id);Vo(te,z),Vt()}),Y.appendChild(ct),Y.appendChild(At),H.appendChild(Y)}),F.appendChild(H)}const $=(z,P)=>[{id:!1,name:z},{id:!0,name:P}];function W(z,P,N){F.appendChild(i("div",{className:"lu-am-section-title",text:z}));const H=i("div",{className:"lu-am-tabs"});P.forEach(O=>{const Y=i("button",{type:"button",className:"lu-am-tab"+(J[N]===O.id?" lu-selected":""),text:O.name});Y.addEventListener("click",()=>D(N,O.id)),H.appendChild(Y)}),F.appendChild(H)}function Z(z,P,N){F.appendChild(i("div",{className:"lu-am-section-title",text:z}));const H=i("div",{className:"lu-swatches"});P.forEach(O=>{const Y=i("button",{type:"button",className:"lu-swatch"+(J[N]===O?" lu-selected":""),style:`background:${O};`,title:O,"aria-label":`${z} ${O}`});Y.addEventListener("click",()=>D(N,O)),H.appendChild(Y)}),F.appendChild(H)}function Q(z){const P=i("div",{className:"lu-am-group-title"}),N=i("span",{className:"lu-am-group-icon","aria-hidden":"true"});N.innerHTML=Wo,P.appendChild(N),P.appendChild(i("span",{text:z})),F.appendChild(P)}function Ce(){B.textContent="";const z=!!Mt(),P=or.filter(N=>N.id!=="closet"||z);P.some(N=>N.id===b)||(b="species"),P.forEach(N=>{const H=b===N.id,O=i("button",{type:"button",role:"tab",id:"lu-am-tab-"+N.id,className:"lu-am-navtab"+(H?" lu-selected":""),"aria-selected":H?"true":"false","aria-controls":"lu-am-tabpanel",tabindex:H?"0":"-1","aria-label":N.label});O.innerHTML=N.icon,O.appendChild(i("span",{className:"lu-am-navtab-label",text:N.label})),O.addEventListener("click",()=>{b!==N.id&&(b=N.id,Vt(),F.scrollTop=0)}),B.appendChild(O)}),F.setAttribute("aria-labelledby","lu-am-tab-"+b)}function Vt(){if(Ce(),F.textContent="",!J)return;const z=J.species&&J.species!=="human";b==="species"?(X(),Q(z?"종족 · 털색":"종족 · 성별 · 피부색"),W("종족",Lo,"species"),z||W("성별",ca,"gender"),Z(z?"털 색":"피부색",da,"skin")):b==="face"?(Q("얼굴"),W("얼굴형",pa,"face"),W("눈",Ca,"eyeStyle"),W("입",fa,"mouth"),z||W("수염",ha,"beardStyle"),W("볼터치",$("없음","있음"),"blush"),Z("눈동자 색",ga,"eyeColor")):b==="hair"?z?(Q("포인트"),Z("귀·꼬리 색",zo,"hairColor")):(Q("헤어"),W("헤어",ba,"hairStyle"),Z("머리 색",zo,"hairColor")):b==="outfit"?(Q("의상"),W("상의 패턴",ma,"pattern"),W("의상 세트",xa,"outfit"),W("하의",Ba,"bottomType"),Z("상의 색",qe,"top"),Z("하의 색",qe,"bottom"),Z("신발 색",qe,"shoes")):b==="acc"?(Q("장식"),W("머리 장식",wa,"acc"),W("안경",$("없음","착용"),"glasses"),W("헤일로",$("없음","있음"),"halo"),W("날개",$("없음","있음"),"wings"),W("가슴 하트",$("없음","있음"),"heart")):b==="closet"&&K()}function Ke(){!J||!E||(et&&(E.remove(et.group),et.dispose(),et=null),et=An(ro(J),Rn," ",{blobShadow:!1}),et.group.traverse(z=>{z.isMesh&&(z.castShadow=!0)}),E.add(et.group))}function ko(z){Wt=requestAnimationFrame(ko);const P=ye?(z-ye)/1e3:0,N=Math.min(.1,P);if(ye=z,!De&&(ve+=N,E.rotation.y=oo+Math.sin(ve*er)*tr,w-=P,w<=0&&et&&typeof et.playAction=="function")){const H=p[Math.floor(Math.random()*p.length)];et.playAction(H),w=(ya[H]||1.5)+.6+Math.random()*.9}et&&et.update(N,0),f.render(C,L)}function na(){Wt||(ye=0,Wt=requestAnimationFrame(ko))}function aa(){Wt&&cancelAnimationFrame(Wt),Wt=null}x.addEventListener("pointerdown",z=>{De=!0,eo=z.clientX,c.classList.add("lu-dragging"),x.setPointerCapture(z.pointerId)}),x.addEventListener("pointermove",z=>{De&&(E.rotation.y+=(z.clientX-eo)*.012,eo=z.clientX)});const So=()=>{De=!1,c.classList.remove("lu-dragging"),oo=E.rotation.y,ve=0};x.addEventListener("pointerup",So),x.addEventListener("pointercancel",So),r.addEventListener("click",()=>fe()),S.addEventListener("click",z=>{z.target===S&&fe()});function Mo(z,P){try{return f?(f.render(C,L),Qu(x,z,P)||f.domElement.toDataURL("image/png")):""}catch{return""}}function ua(){const P=!!Mt()?"저장하고 사용":"이 캐릭터 사용";u.setAttribute("aria-label",P),u.title=P}u.addEventListener("click",()=>{if(!J)return;const z=JSON.parse(JSON.stringify(J));Ju(z);const P=!!Mt();if(P){const N=Zu(z),H=Mo(150,200);H&&qu(H),N||a("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요")}e&&e.lobby&&e.lobby.onChibiSaved(),n.entered&&typeof o.onAvatarChange=="function"&&o.onAvatarChange(ro(z)),P||a("이 캐릭터로 적용했어요 · 회원가입하면 저장돼요"),fe()});function ra(){b="species",J=Ze(Object.assign({},Le,Gn()||{})),ua(),v(),E.rotation.y=Math.PI,oo=Math.PI,ve=0,w=1,Ke(),Vt(),S.classList.add("lu-open"),n.chibiOpen=!0,na(),typeof o.onMakerToggle=="function"&&o.onMakerToggle(!0)}function fe(){S.classList.remove("lu-open"),n.chibiOpen=!1,aa(),et&&(E.remove(et.group),et.dispose(),et=null),typeof o.onMakerToggle=="function"&&o.onMakerToggle(!1)}return{open:ra,close:fe}}const ar=8,Ae=12;let y=null,tt={onEnter:null,onChatSend:null,onAvatarChange:null,onMakerToggle:null},Ko=lo[0];const qt={chibiOpen:!1,entered:!1};let Co=null,Zo=!1,Ht=!1,fo=null,Rt=null,Xt=!1,ho=null,Ut=!1,go=null,He=null;const Ee=120;let yt={onPrev:null,onNext:null,onExit:null,onToggleAuto:null};const Yt=typeof window<"u"&&"ontouchstart"in window||typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches;let bt={onTour:null,onViewArtwork:null,onGuestbook:null,onCapture:null,onSelfView:null},jt=!1,rt={blob:null,dataUrl:"",galleryName:"",shareUrl:""},Pt=null,Xe=null,Tt=null,Ue=null;function ur(){const t=i("div",{id:"lu-loading",className:"lu"},[i("div",{className:"lu-spinner"}),i("div",{className:"lu-loading-text",text:"MUSEUM LOADING..."})]);return document.body.appendChild(t),t}function rr(){const t=i("div",{className:"lu-lobby-title",text:"OpenArtShow MUSEUM"}),e=i("div",{className:"lu-lobby-sub",text:"VIRTUAL EXHIBITION"}),n=i("div",{className:"lu-lobby-rule"}),o=i("div",{id:"lu-auth"}),a=i("div",{className:"lu-social-wrap"}),u=i("div",{className:"lu-logged-wrap"}),r=()=>{a.textContent="";for(const M of Object.keys(me)){const R=me[M],S=i("button",{className:`lu-social-btn lu-social-${M}`,type:"button"},[i("span",{className:"lu-social-badge",text:R.short}),i("span",{text:R.label})]);S.addEventListener("click",async()=>{S.disabled=!0,S.classList.add("lu-social-busy");try{await iu(M)}catch{}S.disabled=!1,S.classList.remove("lu-social-busy")}),a.appendChild(S)}a.appendChild(i("div",{className:"lu-social-note",text:"계정 연동 준비 중 — 지금은 프로필 미리보기로 동작합니다"}))},l=M=>{u.textContent="";const R=i("span",{className:"lu-logged-avatar",text:M.initial||M.name.slice(0,1)}),S=i("span",{className:"lu-logged-name",text:`${M.name}님`}),D=i("span",{className:"lu-logged-via",text:me[M.provider]?me[M.provider].short:""}),_=i("button",{className:"lu-logout-btn",type:"button",text:"로그아웃"});_.addEventListener("click",()=>lu()),u.appendChild(i("div",{className:"lu-logged-chip"},[R,S,D,_]))},s=M=>{M?(l(M),a.style.display="none",u.style.display="",x.value=M.name.slice(0,Ae)):(a.style.display="",u.style.display="none",(!x.value||Object.values(su).includes(x.value))&&(x.value="게스트")),p()};r(),o.appendChild(a),o.appendChild(u);const d=i("div",{className:"lu-auth-or"},[i("span",{text:"소셜 계정 연동 (준비 중)"})]),m=i("label",{className:"lu-field-label",for:"lu-nickname",text:"닉네임"}),x=i("input",{id:"lu-nickname",type:"text",maxlength:String(Ae),value:"게스트",autocomplete:"off",spellcheck:"false"}),g=i("div",{className:"lu-field-hint",text:`최대 ${Ae}자 · 비워두면 '게스트'로 입장합니다`}),h=i("div",{className:"lu-field-label",text:"캐릭터",style:"margin-top:26px;"}),c=i("button",{id:"lu-char-design",className:"lu-char-design-btn",type:"button","aria-label":"캐릭터 디자인 — 나만의 아야모 만들기"});function p(){const M=$o();c.textContent="";const R=i("span",{className:"lu-char-design-media"});M?(R.classList.add("lu-has-thumb"),R.style.backgroundImage=`url('${M}')`):R.textContent="🎨";const S=i("span",{className:"lu-char-design-txt"},[i("b",{text:"캐릭터 디자인"}),i("span",{text:M?"내 아야모 편집하기":"나만의 아야모 만들기 (선택)"})]);c.append(R,S,i("span",{className:"lu-char-design-arrow",text:"›"}))}p(),c.addEventListener("click",()=>vo());const w=i("button",{id:"lu-enter-btn",type:"button",text:"입장하기"}),f=i("div",{id:"lu-picker"}),C=i("div",{className:"lu-lobby-divider"}),L=i("a",{className:"lu-studio-link",href:"./studio.html",target:"_blank",rel:"noopener noreferrer",text:"작가 스튜디오에서 나만의 전시 만들기 →"}),E=i("div",{className:"lu-lobby-form"},[m,x,g,h,c,w,d,o]),T=i("div",{className:"lu-quick-enter"});function k(){T.textContent="";const M=Mt(),R=$o(),S=i("span",{className:"lu-quick-avatar"});R?S.style.backgroundImage=`url('${R}')`:S.textContent="🙂";const D=i("div",{className:"lu-quick-greet"},[i("b",{text:(M?`${M.name}님, `:"")+"다시 오셨어요"}),i("span",{text:"저장한 모습으로 바로 입장할 수 있어요"})]),_=i("button",{className:"lu-quick-btn",type:"button",text:"바로 입장"});_.addEventListener("click",A);const X=i("button",{className:"lu-quick-change",type:"button",text:"닉네임·캐릭터 바꾸기"});X.addEventListener("click",()=>{E.classList.remove("lu-collapsed"),T.style.display="none";try{x.focus()}catch{}}),T.append(S,D,_,X)}!!(Mt()||On())?(k(),E.classList.add("lu-collapsed")):T.style.display="none";const b=i("div",{className:"lu-lobby-card"},[t,e,n,T,E,f,C,L]),B=i("div",{id:"lu-lobby",className:"lu"},[b]);document.body.appendChild(B),s(Mt()),Fn(s);function A(){let M=x.value.trim().slice(0,Ae);M||(M="게스트");let R=0;for(let D=0;D<M.length;D++)R=R*31+M.charCodeAt(D)>>>0;Ko=lo[R%lo.length];const S=ro(Object.assign({},Le,Gn()||{}));typeof tt.onEnter=="function"&&tt.onEnter({nickname:M,color:Ko,char:S})}w.addEventListener("click",A),x.addEventListener("keydown",M=>{M.stopPropagation(),M.key==="Enter"&&A()}),x.addEventListener("keyup",M=>M.stopPropagation());function F(){p()}return{overlay:B,nickInput:x,pickerBox:f,onChibiSaved:F}}function ir(){const t=Yt?[["왼쪽 드래그","이동"],["오른쪽 드래그","시점 회전"],["캐릭터 탭","콕 찌르기"],["작품 카드","탭하여 크게 보기"]]:[["마우스 드래그","시점 회전"],["W A S D","이동"],["Shift","달리기"],["Enter","채팅"],["M","작품 목록"],["T","투어"],["G","방명록"],["V","내 모습 보기"],["C","캐릭터 디자인"],["P","사진 촬영"],["클릭","캐릭터 콕 찌르기"]],e=i("div",{id:"lu-controls",className:"lu lu-hud"});if(e.appendChild(i("div",{className:"lu-controls-title",text:"CONTROLS"})),t.forEach(([n,o])=>{const a=i("div",{},[i("span",{className:"lu-key",text:n}),i("span",{text:o})]);e.appendChild(a)}),document.body.appendChild(e),Yt){e.classList.add("lu-collapsed");const n=i("button",{id:"lu-controls-toggle",className:"lu lu-hud",type:"button","aria-label":"조작법 보기",text:"?"});n.addEventListener("click",()=>{e.classList.toggle("lu-collapsed")}),document.body.appendChild(n)}return e}function sr(){if(!Yt)return null;function t(){const C=y&&y.chat&&y.chat.wrap;if(!C)return;const L=C.classList.toggle("lu-chat-collapsed");!L&&y.chat.input?y.chat.input.focus():y.chat.input&&y.chat.input.blur(),u.classList.toggle("lu-on",!L)}const e={chat:'<path d="M20 15a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',tour:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z"/>',capture:'<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',more:'<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',list:'<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',self:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',help:'<path d="M9.2 9a2.9 2.9 0 1 1 4.2 2.6c-.9.45-1.4 1.05-1.4 2.1"/><circle cx="12" cy="17.4" r="1" fill="currentColor" stroke="none"/>',dress:'<path d="M9 4l3 3 3-3M9 4l-1.5 5 4.5 3 4.5-3L18 4M7.5 9l-2 8h13l-2-8"/>'};function n(C){const L=document.createElement("span");return L.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+e[C]+"</svg>",L.firstChild}function o(C,L,E,T){const k=i("button",{className:C,type:"button","aria-label":L});k.appendChild(n(E)),k.appendChild(i("span",{className:"lu-dock-label",text:T}));const v=i("div",{className:"lu-dock-wrap"},[k]);return{b:k,wrap:v}}const a=o("lu-dock-btn","채팅 열기/닫기","chat","채팅"),u=a.b;a.wrap.style.display="none",u.addEventListener("click",t);const r=o("lu-dock-btn","투어 시작/종료","tour","투어"),l=r.b;l.addEventListener("click",()=>{typeof bt.onTour=="function"&&bt.onTour()});const s=o("lu-dock-btn lu-gold","사진 촬영","capture","캡처"),d=s.b;d.addEventListener("click",()=>{d.classList.remove("lu-cap-pop"),d.offsetWidth,d.classList.add("lu-cap-pop"),typeof bt.onCapture=="function"&&bt.onCapture()});const m=o("lu-dock-btn","더보기","more","메뉴"),x=m.b,g=i("div",{id:"lu-more-backdrop"}),h=i("div",{id:"lu-more-sheet"});function c(){h.classList.remove("lu-open"),g.classList.remove("lu-open")}function p(C,L,E){const T=i("button",{className:"lu-sheet-btn",type:"button"});return T.appendChild(n(C)),T.appendChild(i("span",{text:L})),T.addEventListener("click",()=>{c(),E()}),T}const w=i("div",{className:"lu-sheet-grid"},[p("list","작품 목록",()=>Wn()),p("self","내 모습",()=>{typeof bt.onSelfView=="function"&&bt.onSelfView()}),p("dress","캐릭터 디자인",()=>vo()),p("chat","채팅",t),p("help","조작법",()=>{const C=document.getElementById("lu-controls");C&&C.classList.toggle("lu-collapsed")})]);h.append(i("div",{className:"lu-sheet-handle"}),w),g.addEventListener("click",c),x.addEventListener("click",()=>{const C=h.classList.toggle("lu-open");g.classList.toggle("lu-open",C)}),document.body.appendChild(g),document.body.appendChild(h);const f=i("div",{id:"lu-dock",className:"lu lu-hud"},[a.wrap,r.wrap,s.wrap,m.wrap]);return document.body.appendChild(f),Ot={chatBtn:u,chatWrap:a.wrap,tourBtn:l,selfBtn:null,dock:f},f}let Ot=null;function qo(t,e){Ot&&t==="tour"&&Ot.tourBtn&&Ot.tourBtn.classList.toggle("lu-on",!!e)}function lr(){const t=i("span",{text:"--"}),e=i("div",{className:"lu-stat"});e.append("FPS ");const n=i("b");n.appendChild(t),e.appendChild(n);const o=i("div",{id:"lu-topright",className:"lu lu-hud"},[e]);return document.body.appendChild(o),{wrap:o,fps:t,count:i("span"),countWrap:null}}function cr(){const t=i("div",{id:"lu-status",className:"lu lu-hud"});return document.body.appendChild(t),t}function dr(){const t=i("div",{id:"lu-chat-log"}),e=i("input",{id:"lu-chat-input",type:"text",maxlength:"120",placeholder:Yt?"탭하여 채팅…":"Enter 키로 채팅…",autocomplete:"off",spellcheck:"false"}),n=i("div",{id:"lu-chat",className:"lu lu-hud"},[t,e]);return Yt&&n.classList.add("lu-chat-collapsed"),document.body.appendChild(n),e.addEventListener("keydown",o=>{if(o.stopPropagation(),o.key==="Enter"){const a=e.value.trim();e.value="",e.blur(),a&&typeof tt.onChatSend=="function"&&tt.onChatSend(a)}else o.key==="Escape"&&(e.value="",e.blur())}),e.addEventListener("keyup",o=>o.stopPropagation()),e.addEventListener("keypress",o=>o.stopPropagation()),{wrap:n,log:t,input:e}}function pr(){const t=i("div",{className:"lu-art-eyebrow",text:"ARTWORK"}),e=i("div",{className:"lu-art-title"}),n=i("div",{className:"lu-art-meta"}),o=i("div",{className:"lu-art-rule"}),a=i("div",{className:"lu-art-desc"}),u=i("button",{className:"lu-art-hint",type:"button"});Yt?u.appendChild(document.createTextNode("크게 보기")):(u.appendChild(i("span",{className:"lu-key",text:"E"})),u.appendChild(document.createTextNode(" — 크게 보기"))),u.addEventListener("click",l=>{l.stopPropagation(),typeof bt.onViewArtwork=="function"&&bt.onViewArtwork()});const r=i("div",{id:"lu-artwork",className:"lu"},[t,e,n,o,a,u]);return Yt&&r.addEventListener("click",()=>{typeof bt.onViewArtwork=="function"&&bt.onViewArtwork()}),document.body.appendChild(r),{panel:r,title:e,meta:n,desc:a}}function Cr(){const t=i("span",{className:"lu-topbar-title"}),e=i("b",{text:"1"}),n=i("span",{className:"lu-topbar-count"});n.appendChild(e),n.append(" 명");const o=i("div",{id:"lu-topbar",className:"lu lu-hud lu-cut-s lu-empty"},[t,i("span",{className:"lu-topbar-sep"}),n]);return document.body.appendChild(o),o._count=e,o._countWrap=n,o}function fr(){const t=i("button",{id:"lu-lightbox-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{className:"lu-lightbox-stage"}),n=i("div",{className:"lu-lightbox-title"}),o=i("div",{className:"lu-lightbox-meta"}),a=i("div",{className:"lu-lightbox-rule"}),u=i("div",{className:"lu-lightbox-desc"}),r=i("div",{className:"lu-lightbox-caption"},[n,o,a,u]),l=i("div",{id:"lu-lightbox",className:"lu"},[t,e,r]);document.body.appendChild(l),t.addEventListener("click",()=>Ne()),l.addEventListener("click",k=>{(k.target===l||k.target===e)&&Ne()});const s=new Map;let d=1,m=0,x=0,g=0,h=1,c=0,p=0,w=0,f=null;function C(){return e.querySelector(".lu-lightbox-media")}function L(){const k=C();k&&(k.style.transform=`translate(${m}px, ${x}px) scale(${d})`)}function E(){d=1,m=0,x=0,L()}l.addEventListener("pointerdown",k=>{if(s.set(k.pointerId,{x:k.clientX,y:k.clientY}),s.size===1&&(f={x:k.clientX,y:k.clientY,t:performance.now()}),s.size===2){const[v,b]=[...s.values()];g=Math.hypot(v.x-b.x,v.y-b.y),h=d}}),l.addEventListener("pointermove",k=>{const v=s.get(k.pointerId);if(!v)return;const b=k.clientX-v.x,B=k.clientY-v.y;if(v.x=k.clientX,v.y=k.clientY,s.size===2&&g>0){const[A,F]=[...s.values()];d=Math.min(4,Math.max(1,h*(Math.hypot(A.x-F.x,A.y-F.y)/g))),d===1&&(m=0,x=0),L()}else s.size===1&&d>1&&(m+=b,x+=B,L())});function T(k){if(s.delete(k.pointerId),s.size!==0||!f)return;const v=performance.now()-f.t,b=k.clientX-f.x,B=k.clientY-f.y;if(f=null,d===1&&v<600){if(Math.abs(b)>64&&Math.abs(B)<56){hr(b<0?1:-1);return}if(B>84&&Math.abs(b)<60){Ne();return}}if(Math.abs(b)<12&&Math.abs(B)<12&&v<350){const A=performance.now();if(A-c<320&&Math.hypot(k.clientX-p,k.clientY-w)<44){d>1?E():(d=2.4,L()),c=0;return}c=A,p=k.clientX,w=k.clientY}}return l.addEventListener("pointerup",T),l.addEventListener("pointercancel",k=>s.delete(k.pointerId)),{overlay:l,closeBtn:t,stage:e,title:n,meta:o,rule:a,desc:u,resetZoom:E}}let bo=null;function hr(t){const e=Pe();if(!bo||e.length<2)return;const n=e.indexOf(bo),o=e[((n===-1?0:n)+t+e.length)%e.length];Vn(o)}const Jo="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#eaeae6"/></svg>');function Hn(t){const e=y.artworkList.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(i("div",{className:"lu-artlist-empty",text:"표시할 작품이 없습니다"}));return}t.forEach(n=>{const o=i("img",{className:"lu-artlist-thumb",src:n.imageUrl||Jo,alt:n.title||"",loading:"lazy"});o.addEventListener("error",()=>{o.src=Jo},{once:!0});const a=i("div",{className:"lu-artlist-info"},[i("div",{className:"lu-artlist-name",text:n.title||""}),i("div",{className:"lu-artlist-artist",text:n.artist||""})]),u=i("button",{type:"button",className:"lu-artlist-card"},[o,a]);u.addEventListener("click",()=>{pe(),typeof ho=="function"&&ho(n)}),e.appendChild(u)})}function gr(){const t=i("button",{id:"lu-artlist-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{id:"lu-artlist-head"},[i("div",{id:"lu-artlist-title",text:"작품 목록"}),t]),n=i("div",{id:"lu-artlist-body"}),o=i("div",{id:"lu-artlist",className:"lu"},[e,n]);return document.body.appendChild(o),t.addEventListener("click",()=>pe()),{panel:o,body:n}}function br(t){const e=Date.now(),n=Math.max(0,e-t),o=Math.floor(n/6e4);if(o<1)return"방금 전";if(o<60)return`${o}분 전`;const a=Math.floor(o/60);if(a<24)return`${a}시간 전`;const u=new Date(t),r=new Date(e),l=g=>new Date(g.getFullYear(),g.getMonth(),g.getDate()).getTime();if(Math.round((l(r)-l(u))/864e5)<=1)return"어제";const d=u.getFullYear(),m=String(u.getMonth()+1).padStart(2,"0"),x=String(u.getDate()).padStart(2,"0");return`${d}.${m}.${x}`}function Xn(t){const e=y.guestbook.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(i("div",{className:"lu-gbook-empty",text:"첫 방명록을 남겨보세요"}));return}const n=["#e07a5f","#81b29a","#5f9e7d","#8e7dbe","#6a8caf","#d68fb8"];t.forEach(o=>{const a=o.name||"게스트";let u=0;for(let d=0;d<a.length;d++)u=u*31+a.charCodeAt(d)>>>0;const r=i("span",{className:"lu-gbook-dot"});r.style.background=n[u%n.length];const l=i("div",{},[r,i("span",{className:"lu-gbook-name",text:a}),i("span",{className:"lu-gbook-time",text:br(o.ts)})]),s=i("div",{className:"lu-gbook-text",text:o.text||""});e.appendChild(i("div",{className:"lu-gbook-note"},[l,s]))})}function mr(){const t=i("button",{id:"lu-guestbook-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{id:"lu-guestbook-head"},[i("div",{id:"lu-guestbook-title"},[i("span",{className:"lu-gb-eyebrow",text:"GUESTBOOK"}),i("span",{className:"lu-gb-main",text:"방명록"}),i("span",{className:"lu-gb-sub",text:"다녀간 마음을 한 줄 남겨 주세요"})]),t]),n=i("div",{id:"lu-guestbook-body"}),o=i("textarea",{id:"lu-gbook-input",rows:"3",maxlength:String(Ee),placeholder:"전시에 한 줄 메모를 남겨보세요…",spellcheck:"false"}),a=i("span",{className:"lu-gbook-count",text:`0/${Ee}`}),u=i("button",{id:"lu-gbook-submit",type:"button",text:"남기기"});u.disabled=!0;const r=i("div",{className:"lu-gbook-footer-row"},[a,u]),l=i("div",{id:"lu-gbook-stats",style:"font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.45);padding:6px 2px 0;"}),s=i("div",{id:"lu-guestbook-footer"},[o,r,l]),d=i("button",{id:"lu-gbtab",type:"button","aria-label":"방명록 열기/닫기 (위아래로 드래그해 위치 이동)",title:"드래그해서 위치를 옮길 수 있어요",text:"방명록"}),m="lu-gbtab-top-v1";try{const f=parseFloat(localStorage.getItem(m)??"");Number.isFinite(f)&&(d.style.top=x(f)+"px")}catch{}function x(f){const C=Math.max(80,(window.innerHeight||800)-140);return Math.min(C,Math.max(60,f))}let g=null;d.addEventListener("pointerdown",f=>{const C=d.getBoundingClientRect();g={startY:f.clientY,startTop:C.top,moved:!1},d.setPointerCapture(f.pointerId)}),d.addEventListener("pointermove",f=>{if(!g)return;const C=f.clientY-g.startY;Math.abs(C)>6&&(g.moved=!0),g.moved&&(d.style.top=x(g.startTop+C)+"px")});const h=()=>{if(g&&g.moved)try{localStorage.setItem(m,String(parseFloat(d.style.top)))}catch{}setTimeout(()=>{g=null},0)};d.addEventListener("pointerup",h),d.addEventListener("pointercancel",h),d.addEventListener("click",()=>{g&&g.moved||xo()});const c=i("div",{id:"lu-guestbook",className:"lu"},[e,n,s,d]);document.body.appendChild(c),t.addEventListener("click",()=>Ao());function p(){const f=o.value.length;a.textContent=`${f}/${Ee}`,u.disabled=o.value.trim().length===0}function w(){const f=o.value.trim().slice(0,Ee);f&&(o.value="",p(),o.blur(),typeof go=="function"&&go(f))}return o.addEventListener("keydown",f=>{f.stopPropagation(),f.key==="Escape"?(o.value="",p(),o.blur()):f.key==="Enter"&&(f.ctrlKey||f.metaKey)&&(f.preventDefault(),w())}),o.addEventListener("keyup",f=>f.stopPropagation()),o.addEventListener("keypress",f=>f.stopPropagation()),o.addEventListener("input",p),u.addEventListener("click",w),{panel:c,body:n,input:o,count:a,submitBtn:u,tab:d}}function xr(){const t=i("button",{type:"button","aria-label":"이전 작품",text:"◀ 이전"}),e=i("span",{className:"lu-tour-sep"}),n=i("span",{className:"lu-tour-count"}),o=i("span",{className:"lu-tour-title"}),a=i("span",{className:"lu-tour-sep"}),u=i("button",{type:"button","aria-label":"다음 작품",text:"다음 ▶"}),r=i("span",{className:"lu-tour-sep"}),l=i("button",{type:"button",className:"lu-tour-auto"}),s=i("span",{className:"lu-tour-sep"}),d=i("button",{id:"lu-tourbar-exit",type:"button","aria-label":"투어 종료",text:"✕ 종료"}),m=i("div",{id:"lu-tourbar",className:"lu"},[t,e,n,o,a,u,r,l,s,d]);return document.body.appendChild(m),t.addEventListener("click",()=>{yt.onPrev&&yt.onPrev()}),u.addEventListener("click",()=>{yt.onNext&&yt.onNext()}),d.addEventListener("click",()=>{yt.onExit&&yt.onExit()}),l.addEventListener("click",()=>{yt.onToggleAuto&&yt.onToggleAuto()}),{bar:m,prevBtn:t,nextBtn:u,autoBtn:l,exitBtn:d,countEl:n,titleEl:o}}function Br(){const t=i("div",{id:"lu-shutter",className:"lu"});return document.body.appendChild(t),t}function wr(){const t=i("button",{id:"lu-share-close",type:"button","aria-label":"닫기",text:"×"}),e=i("div",{className:"lu-share-title",text:"전시 공유하기"}),n=i("img",{className:"lu-share-preview",alt:"캡처한 전시 화면"}),o=i("button",{className:"lu-share-btn lu-share-btn-primary",type:"button",text:"기기로 공유"}),a=i("button",{className:"lu-share-btn",type:"button",text:"이미지 저장"}),u=i("button",{className:"lu-share-btn",type:"button",text:"X에 공유"}),r=i("button",{className:"lu-share-btn",type:"button",text:"Threads에 공유"}),l=i("button",{className:"lu-share-btn",type:"button",text:"링크 복사"}),s=i("div",{className:"lu-share-actions"},[o,a,u,r,l]),d=i("div",{className:"lu-share-hint",text:"인스타그램은 이미지를 저장하거나 기기로 공유한 뒤 앱에서 올려주세요"}),m=i("div",{className:"lu-share-card"},[t,e,n,s,d]),x=i("div",{id:"lu-share",className:"lu"},[m]);return document.body.appendChild(x),t.addEventListener("click",()=>mo()),x.addEventListener("click",g=>{g.target===x&&mo()}),o.addEventListener("click",async()=>{if(!(!rt.blob||typeof navigator>"u"||typeof navigator.share!="function"))try{const g=new File([rt.blob],"artshow.png",{type:"image/png"});await navigator.share({files:[g],title:rt.galleryName||"OpenArtShow",text:`${rt.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`})}catch{}}),a.addEventListener("click",()=>{if(!rt.dataUrl)return;const g=document.createElement("a");g.href=rt.dataUrl,g.download="artshow.png",document.body.appendChild(g),g.click(),document.body.removeChild(g)}),u.addEventListener("click",()=>{const g=`${rt.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`,h=`https://twitter.com/intent/tweet?text=${encodeURIComponent(g)}&url=${encodeURIComponent(rt.shareUrl||"")}`;window.open(h,"_blank","noopener")}),r.addEventListener("click",()=>{const g=`${rt.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시 ${rt.shareUrl||""}`,h=`https://www.threads.net/intent/post?text=${encodeURIComponent(g)}`;window.open(h,"_blank","noopener")}),l.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(rt.shareUrl||""),Pt&&clearTimeout(Pt),l.textContent="복사됨",l.classList.add("lu-share-btn-copied"),Pt=setTimeout(()=>{l.textContent="링크 복사",l.classList.remove("lu-share-btn-copied"),Pt=null},1600)}catch{}}),{overlay:x,card:m,title:e,preview:n,deviceBtn:o,saveBtn:a,xBtn:u,threadsBtn:r,copyBtn:l}}function vo(){!y||!y.chibiMaker||qt.chibiOpen||Ht||jt||Ut||Xt||y.chibiMaker.open()}function yr(){y&&y.chibiMaker&&y.chibiMaker.close()}function Dr(){window.addEventListener("keydown",t=>{if(t.key==="Escape"){if(qt.chibiOpen){t.preventDefault(),t.stopImmediatePropagation(),yr();return}if(jt){t.preventDefault(),t.stopImmediatePropagation(),mo();return}if(Ht){t.preventDefault(),t.stopImmediatePropagation(),Ne();return}if(Xt){t.preventDefault(),t.stopImmediatePropagation(),pe();return}if(Ut){t.preventDefault(),t.stopImmediatePropagation(),Ao();return}return}if(Ht||jt||!qt.entered)return;const e=document.activeElement;e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA")||(t.key==="Enter"?(t.preventDefault(),t.stopPropagation(),y.chat.input.focus()):(t.key==="c"||t.key==="C"||t.key==="ㅊ")&&!qt.chibiOpen&&(t.preventDefault(),t.stopPropagation(),vo()))})}function vr({onEnter:t,onChatSend:e,onAvatarChange:n,onMakerToggle:o}={}){if(Zo){tt.onEnter=t||tt.onEnter,tt.onChatSend=e||tt.onChatSend,tt.onAvatarChange=n||tt.onAvatarChange,tt.onMakerToggle=o||tt.onMakerToggle;return}Zo=!0,tt.onEnter=t||null,tt.onChatSend=e||null,tt.onAvatarChange=n||null,tt.onMakerToggle=o||null,Uu(),y={loading:ur(),lobby:rr(),controls:ir(),topRight:lr(),status:cr(),chat:dr(),artwork:pr(),galleryTitle:Cr(),lightbox:fr(),artworkList:gr(),guestbook:mr(),tourBar:xr(),dock:sr(),shutter:Br(),share:wr()},y.chibiMaker=nr({els:y,state:qt,callbacks:tt,setStatus:st}),y.topRight.count=y.galleryTitle._count,y.topRight.countWrap=y.galleryTitle._countWrap,Dr(),Xe!==null&&Yn(Xe),Tt&&jn(Tt.galleries,Tt.currentId,Tt.onPick),Ue&&Hn(Ue),He&&Xn(He)}function Qo(t){y&&y.loading.classList.toggle("lu-hidden",!t)}function Ar(){if(!y)return;qt.entered=!0,y.lobby.overlay.classList.add("lu-hidden"),y.controls.classList.add("lu-visible"),y.topRight.wrap.classList.add("lu-visible"),y.status.classList.add("lu-visible"),y.chat.wrap.classList.add("lu-visible"),y.galleryTitle.classList.add("lu-visible"),y.guestbook.tab.classList.add("lu-visible"),y.dock&&y.dock.classList.add("lu-visible");const t=document.getElementById("lu-controls-toggle");t&&t.classList.add("lu-visible")}function Er(t){!y||!t||Co===t.id&&y.artwork.panel.classList.contains("lu-open")||(Co=t.id,y.artwork.title.textContent=t.title||"",y.artwork.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),y.artwork.desc.textContent=t.desc||"",y.artwork.panel.classList.add("lu-open"))}function kr(){y&&(Co=null,y.artwork.panel.classList.remove("lu-open"))}function Un(t,e,n){if(!y)return;const o=i("div",{className:"lu-chat-msg"+(n?" lu-self":"")},[i("span",{className:"lu-chat-name",text:t}),i("span",{text:e})]);for(y.chat.log.appendChild(o);y.chat.log.children.length>ar;)y.chat.log.removeChild(y.chat.log.firstChild)}function Sr(t){if(!y)return;const e=y.topRight.count.textContent;y.topRight.count.textContent=String(t),e!==String(t)&&y.topRight.countWrap&&(y.topRight.countWrap.classList.remove("lu-tick"),y.topRight.countWrap.offsetWidth,y.topRight.countWrap.classList.add("lu-tick")),Ot&&Ot.chatWrap&&(Ot.chatWrap.style.display=t>=2?"":"none")}function st(t){y&&(y.status.textContent=t||"")}function Mr(t){y&&(y.topRight.fps.textContent=String(Math.round(t)))}function Yn(t){y.galleryTitle.querySelector(".lu-topbar-title").textContent=t||"",y.galleryTitle.classList.toggle("lu-empty",!t)}function Tr(t){Xe=t||"",y&&Yn(Xe)}function jn(t,e,n){const o=y.lobby.pickerBox;if(o.innerHTML="",!Array.isArray(t)||t.length===0)return;const a=i("div",{className:"lu-field-label",text:"전시 선택",style:"margin-top:26px;"});o.appendChild(a),e==null&&o.appendChild(i("div",{className:"lu-picker-note",text:"공유된 전시 관람 중"}));const u=i("div",{className:"lu-picker-list"});t.forEach(r=>{const l=r.id===e,s=i("button",{type:"button",className:"lu-picker-item"+(l?" lu-picker-current":"")},[i("div",{className:"lu-picker-name",text:r.name||r.id}),i("div",{className:"lu-picker-meta",text:[r.artist,typeof r.count=="number"?`${r.count}점`:null].filter(Boolean).join(" · ")})]);l&&(s.disabled=!0),s.addEventListener("click",()=>{l||typeof n=="function"&&n(r.id)}),u.appendChild(s)}),o.appendChild(u)}function Lr(t,e,n){Tt={galleries:t,currentId:e??null,onPick:n},y&&jn(Tt.galleries,Tt.currentId,Tt.onPick)}function $n(){const t=y.lightbox.stage,e=t.firstChild;e&&e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),t.innerHTML=""}function Vn(t){if(!y||!t)return;bo=t,y.lightbox.resetZoom&&y.lightbox.resetZoom(),Rt&&(clearTimeout(Rt),Rt=null),$n();let e;t.videoUrl?(e=i("video",{className:"lu-lightbox-media",src:t.videoUrl,controls:"controls",autoplay:"autoplay",loop:"loop",muted:"muted",playsinline:"playsinline"}),e.muted=!0):e=i("img",{className:"lu-lightbox-media",src:t.imageUrl||"",alt:t.title||""}),y.lightbox.stage.appendChild(e),y.lightbox.title.textContent=t.title||"",y.lightbox.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),y.lightbox.desc.textContent=t.desc||"",Ht=!0,y.lightbox.overlay.classList.add("lu-open")}function Ne(){!y||!Ht||(Ht=!1,y.lightbox.overlay.classList.remove("lu-open"),Rt&&clearTimeout(Rt),Rt=setTimeout(()=>{$n(),Rt=null},340),typeof fo=="function"&&fo())}function ie(){return Ht}function zr(t){fo=typeof t=="function"?t:null}function _r(t,e){ho=typeof e=="function"?e:null,Ue=t,y&&Hn(Ue)}function Wn(){y&&(Xt?pe():(Xt=!0,y.artworkList.panel.classList.add("lu-open")))}function pe(){!y||!Xt||(Xt=!1,y.artworkList.panel.classList.remove("lu-open"))}function tn(){return Xt}function Fr({index:t,total:e,title:n,autoOn:o}={}){if(!y)return;const a=y.tourBar,u=Number.isFinite(t)?t+1:1,r=Number.isFinite(e)?e:0;a.countEl.textContent=`● ${u} / ${r}`,a.titleEl.textContent=` — ${n||""}`,a.autoBtn.textContent=o?"자동진행 ON":"자동진행 OFF",a.autoBtn.classList.toggle("lu-tour-on",!!o),a.bar.classList.add("lu-open")}function Nr(){y&&y.tourBar.bar.classList.remove("lu-open")}function Ir({onTour:t,onViewArtwork:e,onGuestbook:n,onCapture:o,onSelfView:a}={}){bt={onTour:typeof t=="function"?t:null,onViewArtwork:typeof e=="function"?e:null,onGuestbook:typeof n=="function"?n:null,onCapture:typeof o=="function"?o:null,onSelfView:typeof a=="function"?a:null}}function Rr({blob:t,dataUrl:e,galleryName:n,shareUrl:o}={}){if(!y)return;rt={blob:t||null,dataUrl:e||"",galleryName:n||"",shareUrl:o||(typeof window<"u"?window.location.href:"")},y.share.preview.src=rt.dataUrl;let a=!1;if(rt.blob&&typeof navigator<"u"&&typeof navigator.share=="function"&&typeof navigator.canShare=="function")try{const u=new File([rt.blob],"artshow.png",{type:"image/png"});a=navigator.canShare({files:[u]})}catch{a=!1}y.share.deviceBtn.style.display=a?"":"none",Pt&&(clearTimeout(Pt),Pt=null),y.share.copyBtn.textContent="링크 복사",y.share.copyBtn.classList.remove("lu-share-btn-copied"),jt=!0,y.share.overlay.classList.add("lu-open")}function mo(){!y||!jt||(jt=!1,y.share.overlay.classList.remove("lu-open"))}function no(){return jt}function en(){if(!y)return;const t=y.shutter;t.style.transition="none",t.style.opacity="1",t.offsetWidth,t.style.transition="opacity 0.25s ease",t.style.opacity="0"}function Pr({onPrev:t,onNext:e,onExit:n,onToggleAuto:o}={}){yt={onPrev:typeof t=="function"?t:null,onNext:typeof e=="function"?e:null,onExit:typeof n=="function"?n:null,onToggleAuto:typeof o=="function"?o:null}}function Or(t){const e=document.getElementById("lu-gbook-stats");e&&(e.textContent=t||"")}function Gr({onSubmit:t}={}){go=typeof t=="function"?t:null}function xo(){y&&(Ut?Ao():(Ut=!0,y.guestbook.panel.classList.add("lu-open")))}function Ao(){!y||!Ut||(Ut=!1,y.guestbook.panel.classList.remove("lu-open"))}function Hr(){return Ut}function Eo(t){He=Array.isArray(t)?t:[],y&&Xn(He)}function Xr(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}function Ur(t,e,n){let o=(e-t)%(Math.PI*2);return o>Math.PI&&(o-=Math.PI*2),o<-Math.PI&&(o+=Math.PI*2),t+o*n}function Yr(t){if(t!=="auto")return t;const e=new Date().getHours();return e>=6&&e<16?"daylight":e>=16&&e<19?"sunset":"night"}function jr(t){let e=5381;for(let n=0;n<t.length;n++)e=(e<<5)+e+t.charCodeAt(n)>>>0;return e.toString(36)}const $r=/swiftshader|llvmpipe|softpipe|software (?:rasterizer|renderer|adapter)|microsoft basic render|\bwarp\b|gdi generic|mesa offscreen|apple software renderer/i;function Vr(){const t={name:"",soft:!1};try{const e=document.createElement("canvas"),o=!(e.getContext("webgl2",{failIfMajorPerformanceCaveat:!0})||e.getContext("webgl",{failIfMajorPerformanceCaveat:!0})),a=document.createElement("canvas"),u=a.getContext("webgl2")||a.getContext("webgl");if(!u)return{name:"",soft:!0};const r=u.getExtension("WEBGL_debug_renderer_info");t.name=String(r&&u.getParameter(r.UNMASKED_RENDERER_WEBGL)||u.getParameter(u.RENDERER)||""),t.soft=$r.test(t.name)||o;const l=u.getExtension("WEBGL_lose_context");l&&l.loseContext()}catch{}return t}function Wr(t){function e(a){if(a.code==="KeyE"){t.viewCurrentArtwork();return}if(a.code==="KeyM"){if(!t.isEntered()||t.isLightboxOpen())return;t.toggleArtworkList();return}if(a.code==="KeyT"){if(!t.isEntered())return;t.toggleTour();return}if(a.code==="KeyG"){if(!t.isEntered()||t.isLightboxOpen())return;t.toggleGuestbook();return}if(a.code==="KeyP"){if(!t.isEntered()||t.isShareModalOpen())return;t.flashShutter(),t.capturePhoto();return}if(a.code==="KeyV"){if(!t.isEntered()||t.isShareModalOpen())return;t.toggleSelfView();return}if(t.isTouring()&&(a.code==="ArrowLeft"||a.code==="ArrowRight")){if(t.isLightboxOpen())return;a.preventDefault(),a.code==="ArrowLeft"?t.tourPrev():t.tourNext();return}a.code==="Escape"&&t.isTouring()&&!t.isLightboxOpen()&&!t.isArtworkListOpen()&&!t.isGuestbookOpen()&&t.exitTour()}function n(){const a=t.getCamera(),u=t.getRenderer();a.aspect=window.innerWidth/window.innerHeight,a.updateProjectionMatrix(),u.setSize(window.innerWidth,window.innerHeight)}function o(){const a=t.getMp();if(a)try{a.dispose()}catch{}}return{onKeyDown:e,onWindowResize:n,onBeforeUnload:o}}function Kr(t){const e=t.split(",")[1],n=atob(e),o=new Uint8Array(n.length);for(let a=0;a<n.length;a++)o[a]=n.charCodeAt(a);return new Blob([o],{type:"image/png"})}function Zr(t,e,n,o){const a=Math.max(90,Math.round(n*.14)),u=t.createLinearGradient(0,n-a,0,n);u.addColorStop(0,"rgba(0,0,0,0)"),u.addColorStop(1,"rgba(0,0,0,0.55)"),t.fillStyle=u,t.fillRect(0,n-a,e,a);const r=Math.max(20,Math.round(e*.025)),l=Math.max(1,e/1400);t.textBaseline="alphabetic",t.textAlign="left",t.fillStyle="rgba(255,255,255,0.95)",t.font=`300 ${Math.round(18*l)}px ${ue()}`,t.fillText(o||"OpenArtShow 전시",r,n-r-6*l),t.fillStyle="#5f9e7d",t.font=`300 ${Math.round(16*l)}px ${ue()}`,qr(t,"OpenArtShow",e-r,n-r-22*l,2.5*l),t.textAlign="right",t.fillStyle="rgba(255,255,255,0.6)",t.font=`300 ${Math.round(12*l)}px ${ue()}`,t.fillText("syhongart.github.io/openartshow",e-r,n-r-4*l)}function qr(t,e,n,o,a){const u=Array.from(e),r=u.map(m=>t.measureText(m).width),l=r.reduce((m,x)=>m+x,0)+a*(u.length-1),s=t.textAlign;t.textAlign="left";let d=n-l;u.forEach((m,x)=>{t.fillText(m,d,o),d+=r[x]+a}),t.textAlign=s}function Jr(){const t=window.location.href;return t.length<2e3?t:window.location.origin+window.location.pathname.replace(/index\.html$/,"landing.html")}function Qr(t){const{getRenderer:e,getScene:n,getCamera:o,isThirdPerson:a,getSelfAvatar:u,applySelfCamOffset:r,restoreSelfCamOffset:l,getGalleryInfo:s,photoWall:d,getMyNickname:m,getMp:x,showShareModal:g,setStatus:h}=t;function c(){const p=e(),w=n(),f=o();if(!(!p||!w||!f))try{a()&&u()&&r(),p.render(w,f),a()&&u()&&l();const C=p.domElement.toDataURL("image/png"),L=new Image;L.onload=()=>{const E=document.createElement("canvas");E.width=L.width,E.height=L.height;const T=E.getContext("2d");if(!T)return;T.drawImage(L,0,0);const k=T.createRadialGradient(E.width/2,E.height*.46,Math.min(E.width,E.height)*.4,E.width/2,E.height*.46,Math.max(E.width,E.height)*.72);k.addColorStop(0,"rgba(8,6,4,0)"),k.addColorStop(.24,"rgba(8,6,4,0.03)"),k.addColorStop(.44,"rgba(8,6,4,0.09)"),k.addColorStop(.64,"rgba(8,6,4,0.17)"),k.addColorStop(.82,"rgba(8,6,4,0.26)"),k.addColorStop(1,"rgba(8,6,4,0.34)"),T.fillStyle=k,T.fillRect(0,0,E.width,E.height),Zr(T,E.width,E.height,s()?s().name:"");const v=E.toDataURL("image/png");try{const B=Math.round(E.height/E.width*360),A=document.createElement("canvas");A.width=360,A.height=B,A.getContext("2d").drawImage(E,0,0,360,B);const F=A.toDataURL("image/jpeg",.72),M=d.addLocal(m(),s()?s().name:"",F);M&&x()&&x().sendPhoto(M)}catch(b){console.warn("포토월 썸네일 생성 실패 (캡처 자체는 정상):",b)}g({blob:Kr(v),dataUrl:v,galleryName:s()&&s().name||"OpenArtShow 전시",shareUrl:Jr()})},L.onerror=()=>{h("사진 촬영에 실패했습니다.")},L.src=C}catch(C){console.error("사진 촬영 실패:",C),h("사진 촬영에 실패했습니다.")}}return{capturePhoto:c}}function ti(t){const{getPlacedArtworks:e,getPlayer:n,isEntered:o,getTween:a,clearTween:u,startTween:r,getViewingPose:l,showTourBar:s,hideTourBar:d,setDockActive:m,isLightboxOpen:x,isArtworkListOpen:g,hideArtworkList:h}=t;let c=!1,p=0,w=!0,f=!1,C=0;const L=6;function E(D){s({index:p,total:e().length,title:D&&D.title||"",autoOn:w})}function T(D){const _=e()[D];if(!_)return;p=D,f=!1,C=0,E(_);const X=l(_);r(X,()=>{n().setPose(X),f=!0,C=0})}function k(){if(!o()||x()||c)return;const D=e();!D||D.length===0||(g()&&h(),c=!0,m("tour",!0),w=!0,n().disable(),T(0))}function v(){if(!c)return;c=!1,m("tour",!1),f=!1,u(),d();const D=n(),_=D.getState();D.setPose({x:_.x,z:_.z,ry:_.ry}),o()&&!x()&&D.enable()}function b(){c?v():k()}function B(){const D=e();!c||D.length===0||T((p+1)%D.length)}function A(){const D=e();!c||D.length===0||T((p-1+D.length)%D.length)}function F(){c&&(w=!w,C=0,E(e()[p]))}function M(D){const _=e().indexOf(D);_!==-1&&(p=_),f=!1}function R(D){E(D),f=!0,C=0}function S(D){c&&f&&w&&!a()&&!x()&&(C+=D,C>=L&&B())}return{tick:S,startTour:k,exitTour:v,toggleTour:b,next:B,prev:A,toggleAuto:F,syncOnSelect:M,onArrive:R,isTouring:()=>c,getIndex:()=>p}}function ei(t){const{getScene:e,getCamera:n,getPlayer:o,getSelfInfo:a,isEntered:u,createAvatarInstance:r,EYE_HEIGHT:l,setStatus:s,setDockActive:d}=t,m=3,x=.7,g=-.2;let h=!1,c=null,p=null,w=0;const f=new Fo,C=new Fo,L=new _a;function E(){if(u())if(h=!h,h){const B=a();if(!c&&B)try{c=r(B.char,B.color," "),c.group.traverse(A=>{A.isSprite&&(A.visible=!1)}),e().add(c.group)}catch(A){console.warn("내 아바타 생성 실패:",A),c=null,h=!1;return}if(!c){h=!1;return}c.group.visible=!0,d("self",!0),p=null,w=0,s("내 모습 보기 — V키 또는 [시점] 버튼으로 복귀")}else c&&(c.group.visible=!1,d("self",!1))}function T(B){if(!c)return;const A=c.group,F=A.visible,M=A.position.clone(),R=A.rotation.y;try{const S=a(),D=r(B,S&&S.color||"#3498db"," ");D.group.traverse(_=>{_.isSprite&&(_.visible=!1)}),D.group.position.copy(M),D.group.rotation.y=R,D.group.visible=F,e().add(D.group),e().remove(A),c.dispose(),c=D}catch(S){console.warn("내 아바타 갱신 실패:",S)}}function k(){const B=n();f.copy(B.position),L.copy(B.quaternion),C.set(0,0,1).applyQuaternion(B.quaternion),B.position.addScaledVector(C,m),B.position.y+=x,B.rotateX(g)}function v(){const B=n();B.position.copy(f),B.quaternion.copy(L)}function b(B){if(h&&c){const A=o().getState();c.group.position.set(A.x,A.y-l,A.z),c.group.rotation.y=A.ry,p||(p={x:A.x,z:A.z});const F=B>0?Math.hypot(A.x-p.x,A.z-p.z)/B:0;w+=(F-w)*Math.min(1,10*B),p.x=A.x,p.z=A.z,c.update(B,w)}}return{tick:b,toggle:E,rebuildAvatar:T,applySelfCamOffset:k,restoreSelfCamOffset:v,isThirdPerson:()=>h,getSelfAvatar:()=>c,getSelfCamDist:()=>m}}function oi(t){const{getScene:e,getPlayer:n,setStatus:o,getGuestbookNotes:a,onVisitor:u,onPhoto:r,onChat:l,onPlayerCount:s,onRemoteGuestbook:d,onSelfHit:m,onNpcHit:x,npcProvider:g}=t;let h=null,c=!1;function p(L){if(o(L),!(c||!h)&&(L==="호스트로 개설됨"||L.startsWith("접속됨"))){c=!0;try{h.sendGuestbook(a())}catch(E){console.error("방명록 동기화 전송 실패:",E)}}}function w({nickname:L,color:E,char:T,roomId:k}){try{return h=new Pa(e(),{nickname:L,color:E,char:T,roomId:k}),h.onVisitor=(v,b)=>u(v,b),h.onPhoto=v=>r(v),h.onChat=(v,b)=>l(v,b),h.onPlayerCount=v=>s(v),h.onStatus=p,h.onGuestbook=v=>d(v),h.onSelfHit=v=>m(v),h.onNpcHit=(v,b,B)=>x(v,b,B),h.npcProvider=(v,b)=>g(v,b),h.connect(),!0}catch(v){return console.error("멀티플레이어 초기화 실패:",v),h=null,!1}}function f(L){h&&(h.sendState(n().getState()),h.update(L))}function C(){return h}return{connect:w,tick:f,getMp:C}}const ao=typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches;function ni(t){const{renderer:e,camera:n,gpuInfo:o,getMp:a,isEntered:u,setFPS:r,setStatus:l}=t;let s=!1,d=0,m=0,x=0,g=0,h=!1,c=0,p=0,w=0;function f(){const E=a();if(!E)return;const T=[];for(const[k,v]of E.remoteAvatars)k.startsWith("npc-")&&T.push(v);if(!s){for(const k of T)k.group.visible=!0;return}T.sort((k,v)=>k.group.position.distanceTo(n.position)-v.group.position.distanceTo(n.position)),T.forEach((k,v)=>{k.group.visible=v<Ha})}function C(E){x=E}function L(E){const T=u();if(p+=1,w+=E,w>=.5){const k=p/w;if(r(Math.round(k)),p=0,w=0,d=Math.max(0,d-.5),d===0&&T){if(!s&&k<Oa){s=!0,d=10,k<16&&Qe("low");const v=window.devicePixelRatio||1,b=ao?En:Math.max(1,v*.75);e.setPixelRatio(Math.min(e.getPixelRatio(),b)),l("원활한 관람을 위해 화질을 잠시 낮췄어요")}else s&&k>Ga&&(s=!1,d=10,f());if(!s&&k>55){if(c+=1,c>=20){const v=ze();v==="low"?Qe(null):v===null&&!ao&&Qe("high");const b=Math.min(2.5,Math.sqrt(_e.high/(window.innerWidth*window.innerHeight))),B=e.getPixelRatio();!o.soft&&!ao&&B<b&&(e.setPixelRatio(Math.min(b,B+.25)),l("화질을 한 단계 높였어요 ✨")),c=0}}else c=0}}m+=E,m>=2&&(m=0,s&&f()),x>0&&(g+=E,g>=x&&(g=0,e.shadowMap.needsUpdate=!0)),!h&&T&&(h=!0,e.shadowMap.needsUpdate=!0)}return{tick:L,setShadowInterval:C,getLite:()=>s}}function ai(t){const{camera:e,player:n,isEntered:o,setStatus:a}=t;let u=null;const r=.8,l=2.2,s=new xn(0,0,0,"YXZ");function d(v,b){const B=n.getState(),A=typeof v.y=="number"?v.y:B.y,F=v.x-B.x,M=A-B.y,R=v.z-B.z,S=Math.hypot(F,M,R),D=gt.clamp(r+S*.035,r,l);n.disable(),u={fromX:B.x,fromY:B.y,fromZ:B.z,fromRy:B.ry,toX:v.x,toY:A,toZ:v.z,toRy:v.ry,duration:D,elapsed:0,onDone:b||null}}function m(v){if(!u)return;u.elapsed+=v;const b=Math.min(1,u.elapsed/u.duration),B=Xr(b),A=u.fromX+(u.toX-u.fromX)*B,F=u.fromY+(u.toY-u.fromY)*B,M=u.fromZ+(u.toZ-u.fromZ)*B,R=Ur(u.fromRy,u.toRy,B);if(e.position.set(A,F,M),s.set(0,R,0,"YXZ"),e.quaternion.setFromEuler(s),b>=1){const S=u.onDone;u=null,S&&S()}}function x(){return u}function g(){u=null}let h=null;function c(){if(!o())return;const v=e.position.y-vt;let b=null;for(const B of I.floors)v>=B.y-.9&&(b===null||B.y>b.y)&&(b=B);if(b){if(h===null){h=b.id;return}b.id!==h&&(h=b.id,a(b.name))}}const p="lu-onboard-v1";let w=-1,f=null,C=null,L=0,E=0;function T(){try{if(localStorage.getItem(p))return}catch{}if(!(typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches))return;w=0;const v=n.getState();C={x:v.x,z:v.z};const b=document.createElement("style");b.textContent="@keyframes lu-ob-pulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} 70%{transform:translate(-50%,-50%) scale(1.25);opacity:0.2;} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} }",document.head.appendChild(b),f=document.createElement("div"),f.style.cssText="position:fixed;left:24%;bottom:22%;width:110px;height:110px;border-radius:50%;border:3px solid rgba(255,253,247,0.85);pointer-events:none;z-index:60;transform:translate(-50%,-50%);animation:lu-ob-pulse 1.6s ease-in-out infinite;",document.body.appendChild(f),a("왼쪽 화면을 누른 채 밀면 걸어요 🚶")}function k(){if(w<0)return;const v=n.getState();if(w===0)Math.hypot(v.x-C.x,v.z-C.z)>1.5&&(w=1,L=v.ry,f&&(f.remove(),f=null),a("잘했어요! 오른쪽 화면을 쓸면 주위를 둘러봐요 👀"));else if(w===1){let b=v.ry-L;b=Math.atan2(Math.sin(b),Math.cos(b)),Math.abs(b)>.6&&(w=2,E=0,a("작품에 다가가면 설명이 나타나요 — 어려우면 [투어] 버튼을 눌러요 🖼️"))}else if(w===2&&(E+=1,E>420)){w=-1;try{localStorage.setItem(p,"1")}catch{}}}return{startTween:d,updateTween:m,getTween:x,clearTween:g,updateFloorIndicator:c,startOnboarding:T,tickOnboarding:k}}const ui="lu-stats-v1-",ri=3;function on(){const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}function ii(){return{totalVisits:0,days:{},dwell:{}}}class si{key;_seen;data;_saveTimer;constructor(e){this.key=ui+String(e||"default"),this._seen=new Set,this.data=ii();try{const n=localStorage.getItem(this.key);if(n){const o=JSON.parse(n);o&&typeof o=="object"&&(this.data={totalVisits:o.totalVisits|0,days:o.days&&typeof o.days=="object"?o.days:{},dwell:o.dwell&&typeof o.dwell=="object"?o.dwell:{}})}}catch{}this._saveTimer=null}_save(){this._saveTimer||(this._saveTimer=setTimeout(()=>{this._saveTimer=null;try{localStorage.setItem(this.key,JSON.stringify(this.data))}catch{}},2e3))}addVisit(e){if(!e||this._seen.has(e))return;this._seen.add(e),this.data.totalVisits+=1;const n=on();this.data.days[n]=(this.data.days[n]|0)+1;const o=Object.keys(this.data.days).sort();for(;o.length>60;)delete this.data.days[o.shift()];this._save()}addDwell(e,n,o){if(!e||!e.length||!n||!n.length)return;let a=!1;for(const u of e){let r=null,l=ri;for(const s of n){const d=Math.hypot(s.pos.x-u.x,s.pos.z-u.z);d<l&&(l=d,r=s)}r&&r.title&&(this.data.dwell[r.title]=(this.data.dwell[r.title]||0)+o,a=!0)}a&&this._save()}summary(e){const o=[`오늘 방문 ${this.data.days[on()]|0}`,`누적 ${this.data.totalVisits}`];typeof e=="number"&&o.push(`방명록 ${e}`);const a=Object.entries(this.data.dwell).sort((u,r)=>r[1]-u[1])[0];if(a&&a[1]>=10){const u=a[1]>=60?`${Math.round(a[1]/60)}분`:`${Math.round(a[1])}초`;o.push(`인기작 「${a[0]}」 ${u}`)}return o.join(" · ")}}function li(t){const{getMp:e,getGuestbookNotesLength:n,setGuestbookStats:o}=t;let a=null,u=null;function r(d){return d&&d.id||"link-"+jr(window.location.hash||"")}function l(d){a=new si(d),u&&clearInterval(u),u=setInterval(()=>{const m=e();if(!m||!a)return;const x=[];for(const[g,h]of m.remoteAvatars)g.startsWith("npc-")||x.push({x:h.group.position.x,z:h.group.position.z});a.addDwell(x,Pe(),2),o(a.summary(n()))},2e3)}function s(d){a?.addVisit(d)}return{computeRoomSuffix:r,begin:l,recordVisit:s}}function ci(t){const{renderer:e,scene:n,camera:o,player:a,gpuInfo:u,flyController:r,tourController:l,multiplayerController:s,selfViewController:d,viewfxController:m,perfGovernor:x,sceneTick:g,getNearbyArtwork:h,showArtworkInfo:c,hideArtworkInfo:p,setStatus:w}=t;let f=null,C=0;function L(){let T=f.getDelta();if(u.soft){if(C+=T,C<.034)return;T=C,C=0}try{r&&r.update(T),a.update(T);const k=s.getMp();k&&a.resolveBodyCollisions(k.getAvatarPositions()),m.updateTween(T),l.tick(T),g(T),m.updateFloorIndicator(),s.tick(T),m.tickOnboarding(),d.tick(T);const v=h(o.position);v?c(v):p(),x.tick(T),d.isThirdPerson()&&d.getSelfAvatar()?(d.applySelfCamOffset(),e.render(n,o),d.restoreSelfCamOffset()):e.render(n,o)}catch(k){console.error("렌더 루프 오류:",k),e.setAnimationLoop(null),w("오류가 발생했습니다. 페이지를 새로고침해 주세요.")}}function E(){f=new Fa,e.setAnimationLoop(L)}return{start:E}}let j=null,Bt=null,dt=null,ot=null,nn=null,pt=null,Ve=null,Kn=null,it=null,ht=null,ke=null,Nt=null,Ye=null,Kt=null;const di=new ru;let lt={name:"",soft:!1};function pi(t,e){const n=document.createElement("div");n.id="lu-gpu-notice",n.style.cssText=`position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:1200;max-width:min(92vw,600px);background:linear-gradient(180deg,#fffdf8,#f6f1e4);color:#17140f;border:1px solid rgba(95,158,125,0.55);border-radius:14px;padding:14px 44px 14px 18px;box-shadow:0 12px 32px rgba(20,15,8,0.35);font:13px/1.75 ${ue()};`;const o="<b>이 브라우저에서 3D 그래픽 기능을 사용할 수 없습니다</b><br>";n.innerHTML=o+'<b>Chrome</b>: 설정 → 시스템(<b>chrome://settings/system</b>) → "그래픽 가속 사용" 켜기 → 다시 시작<br><b>Edge</b>: 설정 → 시스템 및 성능 → "그래픽 가속 사용" 켜기 + "효율 모드" 끄기<br><b>Firefox</b>: 설정 → 일반 → 성능 → "권장 성능 설정" 해제 → "하드웨어 가속 사용" 체크<br>그래도 느리면: 원격 데스크톱 여부 확인 · 그래픽 드라이버 업데이트 · Windows 설정 → 디스플레이 → 그래픽에서 브라우저를 "고성능" GPU로 지정 · 확장프로그램 없는 시크릿 창으로 접속해 비교';const a=document.createElement("button");a.type="button",a.setAttribute("aria-label","닫기"),a.textContent="×",a.style.cssText="position:absolute;top:8px;right:10px;width:26px;height:26px;border:none;background:none;font-size:18px;color:#8a8172;cursor:pointer;",a.addEventListener("click",()=>n.remove());const u=document.createElement("button");u.type="button",u.textContent="진단 정보 복사",u.style.cssText="display:inline-block;margin-top:8px;padding:5px 14px;border-radius:999px;border:1px solid rgba(95,158,125,0.5);background:rgba(95,158,125,0.12);color:#17140f;font:600 11px/1 inherit;cursor:pointer;",u.addEventListener("click",()=>{const r=JSON.stringify({renderer:t,ua:navigator.userAgent,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,cores:navigator.hardwareConcurrency||0,mem:navigator.deviceMemory||0});try{navigator.clipboard.writeText(r),u.textContent="복사됨!"}catch{}}),n.appendChild(u),n.appendChild(a),document.body.appendChild(n)}const an=new uu;let se=null;function un(){ht.toggle()}function Ci(t){if(!t)return;se=se?Object.assign({},se,{char:t}):{char:t},ht.rebuildAvatar(t);const e=pt.getMp();e&&typeof e.setChar=="function"&&e.setChar(t),st("아야모 모습을 바꿨어요 ✨")}const fi=7,oe=new Na,rn=new zt;let uo=null;function hi(t){t.addEventListener("pointerdown",e=>{e.isPrimary&&(uo={x:e.clientX,y:e.clientY,t:performance.now()})}),t.addEventListener("pointerup",e=>{const n=uo;uo=null;const o=pt.getMp();if(!n||!e.isPrimary||!nt||!o||performance.now()-n.t>450||Math.hypot(e.clientX-n.x,e.clientY-n.y)>7)return;const a=t.getBoundingClientRect();rn.set((e.clientX-a.left)/a.width*2-1,-((e.clientY-a.top)/a.height)*2+1),oe.setFromCamera(rn,dt),oe.far=fi+ht.getSelfCamDist();const u=[...o.remoteAvatars.entries()];if(!u.length)return;const r=u.map(([,d])=>d.group),l=oe.intersectObjects(r,!0);if(l.length){let d=l[0].object;for(;d&&!r.includes(d);)d=d.parent;if(d){const[m]=u[r.indexOf(d)];o.sendHit(m);return}}oe.far=60;const s=oe.intersectObjects(Va(),!1);s.length&&s[0].object.userData.luArt&&Zn(s[0].object.userData.luArt)})}let We="게스트",nt=!1,St=null,Ie=[],je="shared",Ct=[];async function gi(){Qo(!0),Bt=new yn,dt=new Dn(55,window.innerWidth/window.innerHeight,.1,1e3),dt.position.set(I.spawn.x,vt,I.spawn.z);const t=typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches,e=ze();lt=Vr(),console.info("[OpenArtShow] GPU:",lt.name||"(unknown)",lt.soft?"— SOFTWARE RENDERING":"");try{j=new Bn({antialias:!lt.soft,powerPreference:"high-performance"})}catch(c){throw pi(""),c}hi(j.domElement);const n=document.createElement("div");n.id="lu-vignette",n.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse 72% 62% at 50% 46%, rgba(8,6,4,0) 50%, rgba(8,6,4,0.03) 62%, rgba(8,6,4,0.09) 72%, rgba(8,6,4,0.17) 82%, rgba(8,6,4,0.26) 91%, rgba(8,6,4,0.34) 100%);",document.body.appendChild(n);const o=window.devicePixelRatio||1;let a;e==="low"?a=Math.min(o,1.25):e==="high"?a=Math.min(Math.max(o,2),2.5):t?a=Math.min(o,2):a=Math.min(Math.max(o,1.5),2);const u=e==="high"?_e.high:e==="low"?_e.low:_e.base;a=Math.min(a,Math.sqrt(u/(window.innerWidth*window.innerHeight))),t&&(a=Math.min(a,En)),lt.soft&&(a=Math.min(a,.7),document.documentElement.classList.add("lu-potato")),j.setPixelRatio(a),j.setSize(window.innerWidth,window.innerHeight),j.shadowMap.enabled=!lt.soft,j.shadowMap.type=Ia,j.toneMapping=lt.soft?wn:Ra,j.toneMappingExposure=.92,j.outputColorSpace=Lt,document.body.appendChild(j.domElement);const r=await Xa(),l=Yr(r.theme);Eu(Bt,l,{fullLights:!lt.soft&&e!=="low"}),await Ua(),await Ya(Bt),window.__museum={scene:Bt,camera:dt,renderer:j},lt.soft&&(Bt.fog=null),j.shadowMap.autoUpdate=!1,j.shadowMap.needsUpdate=!0,St=r,Tr(St.name),bi(),je=r.id??"shared",Ct=ja(je),Eo(Ct),Gr({onSubmit:wi}),Ie=Pe(),_r(Ie,Zn),Pr({onPrev:Cn,onNext:pn,onExit:cn,onToggleAuto:xi}),Ir({onSelfView:()=>{nt&&!no()&&un()},onTour:()=>{nt&&dn()},onViewArtwork:sn,onGuestbook:()=>{nt&&!ie()&&xo()},onCapture:()=>{nt&&!no()&&(en(),ln())}}),ot=new Pu(dt,j.domElement);const s=I.floors.find(c=>c.id===I.spawn.floor);ot.setPose({x:I.spawn.x,y:(s?s.y:0)+vt,z:I.spawn.z,ry:I.spawn.ry}),nn=Xu({player:ot,getSelfAvatar:()=>ht.getSelfAvatar()}),ot.disable(),setTimeout(()=>{const c=document.getElementById("lu-topright");c&&(c.style.cursor="pointer",c.title="클릭하면 성능 진단 정보가 복사됩니다",c.addEventListener("click",()=>{const p=JSON.stringify({gpu:lt.name,soft:lt.soft,pixelRatio:j?j.getPixelRatio():0,aa:j?j.getContext().getContextAttributes().antialias:null,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,inner:window.innerWidth+"x"+window.innerHeight,cores:navigator.hardwareConcurrency||0,spec:ze(),calls:j?j.info.render.calls:0,ua:navigator.userAgent});try{navigator.clipboard.writeText(p),st("진단 정보가 복사됐어요 — 붙여넣어 보내주세요")}catch{console.info("[OpenArtShow diag]",p)}}))},0),vr({onEnter:Bi,onChatSend:Di,onAvatarChange:Ci,onMakerToggle:c=>{nt&&(c?ot.disable():it.isTouring()||ot.enable())}}),Qo(!1),zr(()=>{nt&&!it.isTouring()&&ot.enable()}),Ye=li({getMp:()=>pt.getMp(),getGuestbookNotesLength:()=>Ct.length,setGuestbookStats:Or}),pt=oi({getScene:()=>Bt,getPlayer:()=>ot,setStatus:st,getGuestbookNotes:()=>Ct,onVisitor:(c,p)=>{Ye.recordVisit(c),di.add(p&&p.nickname,St?St.name:"")},onPhoto:c=>{an.addRemote(c),st(`${c.name||"누군가"}님이 관람 사진을 남겼어요 📸`)},onChat:(c,p)=>Un(c,p,!1),onPlayerCount:c=>Sr(c),onRemoteGuestbook:yi,onSelfHit:c=>{st(c>=3?"아야!! 너무해요 😭":"아야! 누가 때렸어요 😣");const p=ht.getSelfAvatar();p?p.hit(c):Ka(c)},onNpcHit:(c,p,w)=>{Kt&&Kt.onHit(c,p,w)},npcProvider:(c,p)=>{Kt||(Kt=new Wa(Pe()));const w=Kt.update(c,p),f=Kt.takeChat();return f&&pt.getMp().sendNpcChat(f.name,f.text),w}}),Ve=Wr({getCamera:()=>dt,getRenderer:()=>j,getMp:()=>pt.getMp(),isEntered:()=>nt,isTouring:()=>it.isTouring(),viewCurrentArtwork:sn,toggleArtworkList:Wn,toggleTour:dn,toggleGuestbook:xo,flashShutter:en,capturePhoto:ln,toggleSelfView:un,tourPrev:Cn,tourNext:pn,exitTour:cn,isLightboxOpen:ie,isShareModalOpen:no,isArtworkListOpen:tn,isGuestbookOpen:Hr}),ht=ei({getScene:()=>Bt,getCamera:()=>dt,getPlayer:()=>ot,getSelfInfo:()=>se,isEntered:()=>nt,createAvatarInstance:An,EYE_HEIGHT:vt,setStatus:st,setDockActive:qo}),Kn=Qr({getRenderer:()=>j,getScene:()=>Bt,getCamera:()=>dt,isThirdPerson:()=>ht.isThirdPerson(),getSelfAvatar:()=>ht.getSelfAvatar(),applySelfCamOffset:()=>ht.applySelfCamOffset(),restoreSelfCamOffset:()=>ht.restoreSelfCamOffset(),getGalleryInfo:()=>St,photoWall:an,getMyNickname:()=>We,getMp:()=>pt.getMp(),showShareModal:Rr,setStatus:st}),Nt=ai({camera:dt,player:ot,isEntered:()=>nt,setStatus:st}),it=ti({getPlacedArtworks:()=>Ie,getPlayer:()=>ot,isEntered:()=>nt,getTween:()=>Nt.getTween(),clearTween:()=>Nt.clearTween(),startTween:(c,p)=>Nt.startTween(c,p),getViewingPose:Sn,showTourBar:Fr,hideTourBar:Nr,setDockActive:qo,isLightboxOpen:ie,isArtworkListOpen:tn,hideArtworkList:pe}),ke=ni({renderer:j,camera:dt,gpuInfo:lt,getMp:()=>pt.getMp(),isEntered:()=>nt,setFPS:Mr,setStatus:st}),ke.setShadowInterval(l==="cycle"?2:0),location.search.includes("debug=perf")&&Da(()=>import("./debug-perf-BPvEucCo.js"),[]).then(c=>c.mountPerfHud(j,"index",{getSpec:ze,getLite:()=>ke?.getLite?.()})),window.addEventListener("resize",vi),window.addEventListener("keydown",mi),ci({renderer:j,scene:Bt,camera:dt,player:ot,gpuInfo:lt,flyController:nn,tourController:it,multiplayerController:pt,selfViewController:ht,viewfxController:Nt,perfGovernor:ke,sceneTick:Au,getNearbyArtwork:kn,showArtworkInfo:Er,hideArtworkInfo:kr,setStatus:st}).start()}function bi(){fetch("./galleries/index.json").then(t=>{if(!t.ok)throw new Error(`HTTP ${t.status}`);return t.json()}).then(t=>{if(!Array.isArray(t))return;const e=St?St.id:null;Lr(t,e,n=>{window.location.href="./index.html?g="+n})}).catch(()=>{})}function sn(){if(!nt||ie())return;const t=it.isTouring()?Ie[it.getIndex()]:kn(dt.position);t&&(Vn(t),ot.disable())}function ln(){Kn.capturePhoto()}function mi(t){Ve.onKeyDown(t)}function Zn(t){if(!t||!nt)return;const e=Sn(t),n=it.isTouring();n&&it.syncOnSelect(t),Nt.startTween(e,()=>{ot.setPose(e),n?it.onArrive(t):nt&&!ie()&&ot.enable()})}function cn(){it.exitTour()}function dn(){it.toggleTour()}function pn(){it.next()}function Cn(){it.prev()}function xi(){it.toggleAuto()}function Bi({nickname:t,color:e,char:n}){We=t,se={nickname:t,color:e,char:n},nt=!0,Ar(),ot.enable(),Mu(),Nt.startOnboarding();const o=Ye.computeRoomSuffix(St);if(!pt.connect({nickname:t,color:e,char:n,roomId:`${$a}-${o}`})){st("멀티플레이어 연결에 실패했습니다. 혼자 관람 모드로 진행합니다.");return}Ye.begin(o)}function wi(t){if(!t)return;const e=Za(We,t);Ct=Mn(Ct,[e]),Tn(je,Ct),Eo(Ct);const n=pt.getMp();if(n)try{n.sendGuestbook([e])}catch(o){console.error("방명록 전송 실패:",o)}}function yi(t){Ct=Mn(Ct,t),Tn(je,Ct),Eo(Ct)}function Di(t){if(!t)return;Un(We,t,!0);const e=pt.getMp();if(e)try{e.sendChat(t)}catch(n){console.error("채팅 전송 실패:",n),st("채팅 전송에 실패했습니다.")}}function vi(){Ve.onWindowResize()}window.addEventListener("beforeunload",()=>{Ve?.onBeforeUnload()});gi().catch(t=>{console.error("초기화 실패:",t);try{st("초기화 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.")}catch{document.body.insertAdjacentHTML("beforeend",`<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-family:${ue()};font-size:16px;text-align:center;">초기화 중 오류가 발생했습니다.<br>페이지를 새로고침해 주세요.</div>`)}});const qn=0,Jn=7.5,Ai=0,Se=3.3,_t=3.5,wt=.18,Me=.2,Ei=7530209,ki=3.6,Si=1.15,Mi="ontouchstart"in window||(navigator.maxTouchPoints||0)>0;function Ti(){const t=document.createElement("canvas");t.width=t.height=512;const e=t.getContext("2d");let n=20935;const o=()=>{n|=0,n=n+1831565813|0;let s=Math.imul(n^n>>>15,1|n);return s=s+Math.imul(s^s>>>7,61|s)^s,((s^s>>>14)>>>0)/4294967296},a=e.createLinearGradient(0,0,0,512);a.addColorStop(0,"#070a16"),a.addColorStop(.55,"#111a34"),a.addColorStop(1,"#1b2748"),e.fillStyle=a,e.fillRect(0,0,512,512);for(let s=0;s<140;s++){const d=o()*512,m=o()*310,x=o()<.08;e.fillStyle=`rgba(235,240,255,${(.28+o()*.6).toFixed(2)})`,e.fillRect(d,m,x?2:1,x?2:1)}const u=e.createRadialGradient(398,88,0,398,88,36);u.addColorStop(0,"rgba(236,239,232,0.9)"),u.addColorStop(.5,"rgba(226,232,224,0.42)"),u.addColorStop(1,"rgba(226,232,224,0)"),e.fillStyle=u,e.beginPath(),e.arc(398,88,36,0,7),e.fill(),e.fillStyle="rgba(240,243,236,0.95)",e.beginPath(),e.arc(398,88,15,0,7),e.fill();let r=0;for(;r<512;){const s=26+o()*48,d=130+o()*250,m=512-d;e.fillStyle=`rgb(${10+(o()*8|0)},${16+(o()*10|0)},${34+(o()*14|0)})`,e.fillRect(r,m,s,d);for(let x=m+12;x<506;x+=15)for(let g=r+6;g<r+s-6;g+=12)o()<.52||(e.fillStyle=o()<.72?"rgba(120,220,225,0.85)":"rgba(255,207,138,0.85)",e.fillRect(g,x,4,6));r+=s+2+o()*8}const l=new le(t);return l.colorSpace=Lt,l}function Li(){const t=document.createElement("canvas");t.width=512,t.height=160;const e=t.getContext("2d");e.clearRect(0,0,512,160),e.font='700 92px "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif',e.textAlign="center",e.textBaseline="middle",e.shadowColor="rgba(114,230,225,0.95)",e.shadowBlur=30,e.fillStyle="rgba(175,244,240,0.96)",e.fillText("오픈월드",256,86),e.shadowBlur=0,e.fillStyle="rgba(224,252,250,0.92)",e.fillText("오픈월드",256,86);const n=new le(t);return n.colorSpace=Lt,n}function zi(){const t=new $t,e=[new V(Se,wt,Me).translate(0,wt/2,0),new V(Se,wt,Me).translate(0,_t-wt/2,0),new V(wt,_t,Me).translate(-3.1199999999999997/2,_t/2,0),new V(wt,_t,Me).translate((Se-wt)/2,_t/2,0)],n=Fe(e);e.forEach(r=>r.dispose());const o=new ut({color:736570,emissive:Ei,emissiveIntensity:1.5,roughness:.4,metalness:.1});t.add(new G(n,o));const a=new G(new q(Se-2*wt,_t-2*wt),new Gt({map:Ti(),toneMapped:!1}));a.position.set(0,_t/2,.11),a.rotation.y=Math.PI,t.add(a);const u=new G(new q(2.4,.75),new Gt({map:Li(),transparent:!0,toneMapped:!1,depthWrite:!1,side:de}));return u.rotation.x=Math.PI/2,u.scale.x=-1,u.position.set(0,.02,-1),t.add(u),t.position.set(qn,Ai,Jn),t.userData={frameMat:o,label:u},t}let It=null,Te=null,xt=null,ae=!1,Bo=!1,Qn=0,ta=0;function _i(){xt||(xt=document.createElement("div"),xt.id="portal-hint",xt.textContent=Mi?"탭하여 오픈월드로 이동 →":"클릭하거나 다가가면 오픈월드로 이동 →",xt.style.cssText='position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:40;padding:9px 16px;border-radius:999px;background:rgba(11,30,29,0.82);color:#c9fbf8;font:600 13px/1 "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;letter-spacing:-.01em;border:1px solid rgba(114,230,225,0.5);box-shadow:0 6px 20px -6px rgba(0,0,0,0.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap',document.body.appendChild(xt))}function ea(){Bo||(Bo=!0,xt&&(xt.style.opacity="0"),location.href="world.html")}function oa(){if(requestAnimationFrame(oa),!It){if(It=window.__museum||null,!It)return;Te=zi(),It.scene.add(Te),_i()}const t=performance.now()/1e3,e=1.3+Math.sin(t*2.2)*.35;Te.userData.frameMat.emissiveIntensity=e,Te.userData.label.material.opacity=.78+Math.sin(t*2.2)*.2;const n=It.camera,o=Math.hypot(n.position.x-qn,n.position.z-Jn),a=ae;ae=o<ki,ae!==a&&xt&&(xt.style.opacity=ae?"1":"0"),o<Si&&ea()}requestAnimationFrame(oa);addEventListener("pointerdown",t=>{Qn=t.clientX,ta=t.clientY},!0);addEventListener("pointerup",t=>{!ae||Bo||!It||t.target===It.renderer.domElement&&(Math.hypot(t.clientX-Qn,t.clientY-ta)>8||ea())},!0);
