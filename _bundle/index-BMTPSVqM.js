/* empty css              */import{e as Xt,M as H,d as Q,i as W,k as lt,G as Wt,T as va,l as co,m as te,n as Cn,h as Rt,o as ka,p as En,q as he,r as Sa,s as xe,F as Je,t as we,L as Ca,u as He,B as Do,v as Ea,O as Ma,H as Mn,D as qt,w as Ta,S as It,x as pe,f as Tn,y as Ln,E as zn,z as mt,W as _n,I as La,N as Nn,a as An,b as In,J as za,V as Go,Q as _a,R as Na,P as Aa,A as Ia,C as Ra}from"./vendor-three-enYtijzV.js";import{B as I,b as uo,a as Rn,E as Et,R as ye,c as Pn,A as po,g as Xe,d as le,M as Pa,e as Oa,f as Ba,h as Da,l as Ga,i as On,P as Ha,j as Xa,N as Fa,p as Ya,k as Bn,m as Ua,n as Dn,s as Gn}from"./multiplayer-B2R9PNWM.js";import{g as ja,c as Hn,a as $a,b as fo,m as Pe,d as Ho,e as Wa,f as Va,T as Ot,h as Fe,i as Ka,j as Za,r as qa,k as Xn,l as Fn,C as Ja}from"./scene-textures-DhUb9KjO.js";import{P as Qa,V as tr}from"./feed-Cm56rHm1.js";import{n as Qe,D as Oe,C as er,a as or,S as Xo,c as Fo,e as ho,d as nr,f as ar,g as rr,h as ir,i as sr,j as lr,E as cr,k as dr,H as Yo,l as ur,m as pr,o as fr,p as to,q as hr,r as gr}from"./chibi-builder-0e8j20Jr.js";import{g as Nt,o as Yn,P as ve,l as br,M as mr,a as xr}from"./auth-aZ7HCW1S.js";function Uo(t,e){let n=[t];for(const o of e){const a=[];for(const r of n){if(o.x1<=r.x0||o.x0>=r.x1||o.z1<=r.z0||o.z0>=r.z1){a.push(r);continue}const i=Math.max(r.x0,o.x0),c=Math.min(r.x1,o.x1),l=Math.max(r.z0,o.z0),u=Math.min(r.z1,o.z1);r.z0<l&&a.push({x0:r.x0,x1:r.x1,z0:r.z0,z1:l}),u<r.z1&&a.push({x0:r.x0,x1:r.x1,z0:u,z1:r.z1}),r.x0<i&&a.push({x0:r.x0,x1:i,z0:l,z1:u}),c<r.x1&&a.push({x0:c,x1:r.x1,z0:l,z1:u})}n=a}return n.filter(o=>o.x1-o.x0>.01&&o.z1-o.z0>.01)}function bt(t){return I.floors.find(e=>e.id===t)}function wr(t,e){const n=Hn(),o=16/50,a=t.x1-t.x0,r=t.z1-t.z0,i=n.map.clone(),c=n.normalMap.clone();for(const l of[i,c])l.needsUpdate=!0,l.repeat.set(o*a,o*r),l.offset.set((t.x0-I.minX)*o%1,(t.z0-I.minZ)*o%1);return new lt({map:i,normalMap:c,normalScale:new Rt(.7,.7),color:e,roughness:.4,metalness:0})}function zt(t,e,n){const o=$a(),a=o.map.clone(),r=o.normalMap.clone();for(const i of[a,r])i.needsUpdate=!0,i.repeat.set(t,e);return new lt({map:a,normalMap:r,normalScale:new Rt(.55,.55),color:n||16777215,roughness:.9,metalness:0})}function Un(){return new lt({map:fo().map,normalMap:fo().normalMap,normalScale:new Rt(.35,.35),color:16777215,roughness:.92,metalness:0})}const fe=()=>new lt({color:2499615,roughness:.4,metalness:.75});function wt(t,e,n,o,a,r){const i=fe(),c=new En({color:14214376,transparent:!0,opacity:.22,roughness:.08,side:he,depthWrite:!1}),l=Math.hypot(o-e,a-n),u=Math.atan2(o-e,a-n),m=(e+o)/2,x=(n+a)/2,g=new Wt,p=new H(new te(.03,.03,l,10),i);p.rotation.x=Math.PI/2,p.position.y=1.05,g.add(p);const d=Math.max(2,Math.round(l/1.2)+1);for(let w=0;w<d;w++){const b=d===1?.5:w/(d-1),h=new H(new W(.045,1.05,.045),i);h.position.set(0,.525,-l/2+b*l),g.add(h)}const f=new H(new Q(l,.85),c);f.rotation.y=Math.PI/2,f.position.y=.55,g.add(f),g.rotation.y=u,g.position.set(m,r,x),g.traverse(w=>{w.isMesh&&(w.castShadow=!0)}),t.add(g)}function yr(t,e){const n=zt(1.2,2.4),o=e.yTo-e.yFrom,a=e.z1-e.z0,r=24,i=o/r,c=a/r,l=e.x1-e.x0,u=(e.x0+e.x1)/2;for(let p=0;p<r;p++){const d=e.yFrom+(p+1)*i,f=d-e.yFrom+.25,w=new H(new W(l,f,c),n);w.position.set(u,d-f/2,e.z0+(p+.5)*c),w.castShadow=!0,w.receiveShadow=!0,t.add(w)}const m=fe(),x=Math.hypot(a,o),g=Math.atan2(o,a);for(const p of[e.x0+.06,e.x1-.06]){const d=new H(new te(.03,.03,x,10),m);d.rotation.x=Math.PI/2-g,d.position.set(p,(e.yFrom+e.yTo)/2+.95,(e.z0+e.z1)/2),d.castShadow=!0,t.add(d);for(const f of[.08,.5,.92]){const w=e.yFrom+o*f,b=new H(new W(.045,.95,.045),m);b.position.set(p,w+.475,e.z0+a*f),b.castShadow=!0,t.add(b)}}}function vr(t,e,n,o,a,r,i){const c=e+I.clearH,l=.32,u=.14,m=1.1,x=zt(2,.4,13617599),g=new lt({color:3486253,normalMap:fo().normalMap,normalScale:new Rt(.25,.25),roughness:.95}),p=new lt({color:1710102,roughness:.5,metalness:.6}),d=new lt({color:16774880,emissive:a.downlight.emissive,emissiveIntensity:2.5*(a.downlight.intensity/22),roughness:1}),f=[],w=[],b=[];for(const h of n){const R=h.x1-h.x0,E=h.z1-h.z0,O=new H(new Q(R,E),g);O.rotation.x=Math.PI/2,O.position.set((h.x0+h.x1)/2,c+l,(h.z0+h.z1)/2),t.add(O);const M=Math.ceil((h.z0-I.minZ)/m);for(let y=M;;y++){const k=I.minZ+y*m;if(k>h.z1-.05)break;if(k<h.z0+.05)continue;const C=new W(R,l,u);C.translate((h.x0+h.x1)/2,c+l/2,k),f.push(C)}const N=Math.ceil((h.x0-I.minX)/m);for(let y=N;;y++){const k=I.minX+y*m;if(k>h.x1-.05)break;if(k<h.x0+.05)continue;const C=new W(u,l,E);C.translate(k,c+l/2,(h.z0+h.z1)/2),f.push(C)}for(let y=N;;y++){const k=I.minX+y*m+m/2;if(k>h.x1-.2)break;if(!(k<h.x0+.2))for(let C=M;;C++){const P=I.minZ+C*m+m/2;if(P>h.z1-.2)break;if(P<h.z0+.2||(y*7+C*5)%3!==0)continue;const L=new te(.07,.08,.1,12);L.translate(k,c+l-.06,P),w.push(L);const G=new te(.055,.055,.02,12);G.translate(k,c+l-.12,P),b.push(G)}}}if(f.length){const h=new H(Pe(f),x);h.castShadow=!0,t.add(h)}if(w.length&&t.add(new H(Pe(w),p)),b.length&&t.add(new H(Pe(b),d)),i)for(const[h,R]of r){const E=new ka(a.downlight.color,a.downlight.intensity*.7,9,2);E.position.set(h,c-.15,R),t.add(E),o.push(E)}return d}function kr(t){const e=new En({color:14478578,transparent:!0,opacity:.1,roughness:.05,side:he,depthWrite:!1}),n=fe(),o=I.maxZ,a=I.maxX-I.minX,r=bt("f1"),i=bt("f2"),c=I.clearH;for(const[f,w]of[[I.minX,-1.5],[1.5,I.maxX]]){const b=w-f,h=new H(new Q(b,c),e);h.position.set((f+w)/2,r.y+c/2,o),h.rotation.y=Math.PI,t.add(h)}for(let f=I.minX;f<=I.maxX+.01;f+=2.2){if(f>-1.5&&f<1.5)continue;const w=new H(new W(.12,c,.12),n);w.position.set(f,r.y+c/2,o),w.castShadow=!0,t.add(w)}for(const f of[-1.5,1.5]){const w=new H(new W(.18,c,.18),n);w.position.set(f,r.y+c/2,o),w.castShadow=!0,t.add(w)}const l=new H(new W(a,.14,.16),n);l.position.set(0,r.y+c-.07,o),t.add(l);const u=Un(),m=new H(new W(a,1.2,I.wallT),u);m.position.set(0,i.y+.6,o),m.castShadow=!0,m.receiveShadow=!0,t.add(m);const x=new H(new W(a,I.clearH-2.6+.6,I.wallT),u);x.position.set(0,i.y+2.6+(I.clearH-2.6+.6)/2,o),x.castShadow=!0,x.receiveShadow=!0,t.add(x);const g=new H(new Q(a,1.4),e);g.position.set(0,i.y+1.9,o),g.rotation.y=Math.PI,t.add(g);for(let f=I.minX;f<=I.maxX+.01;f+=2.2){const w=new H(new W(.08,1.4,.08),n);w.position.set(f,i.y+1.9,o),t.add(w)}const p=bt("b1"),d=new H(new W(a+.6,I.storyH,I.wallT),zt(4,1));d.position.set(0,p.y+I.storyH/2,o),t.add(d)}function Sr(t,e,n){const o=I,a=o.maxX-o.minX,r=o.maxZ-o.minZ,i={x0:o.minX,x1:o.maxX,z0:o.minZ,z1:o.maxZ},c=[];let l=null;const u=["b1","f1","f2"];for(const S of o.floors){const _=o.slabHoles[S.id]||[],F=Uo(i,_);for(const U of F){const K=U.x1-U.x0,$=U.z1-U.z0,V=new H(new W(K,o.slabT,$),zt(K/6,$/6));V.position.set((U.x0+U.x1)/2,S.y-o.slabT/2,(U.z0+U.z1)/2),V.castShadow=!0,V.receiveShadow=!0,t.add(V);const Z=new H(new Q(K,$),wr(U,S.id==="b1"?10127472:S.id==="roof"?13482132:16777215));Z.rotation.x=-Math.PI/2,Z.position.set((U.x0+U.x1)/2,S.y+.002,(U.z0+U.z1)/2),Z.receiveShadow=!0,t.add(Z)}}const m={b1:[[-6,-3],[0,-3],[6,-3],[0,3]],f1:[[-7,-4],[0,-4],[7,-4],[-7,4],[0,4],[7,4]],f2:[[-7,-4.5],[0,-4.5],[7,-4.5],[-7,5],[7,5]]},x={b1:"f1",f1:"f2",f2:"roof"};for(const S of u){const _=bt(S),F=o.slabHoles[x[S]]||[],U=Uo(i,F),K=vr(t,_.y,U,c,e,m[S],n);l||(l=K)}const g=zt(3,2),p=bt("roof").y-bt("b1").y,d=bt("b1").y+p/2,f=new H(new W(a+o.wallT*2,p,o.wallT),g);f.position.set(0,d,o.minZ-o.wallT/2),f.castShadow=!0,f.receiveShadow=!0,t.add(f);for(const[S,_]of[[o.minX-o.wallT/2,1],[o.maxX+o.wallT/2,1]]){const F=new H(new W(o.wallT,p,r),g);F.position.set(S,d,0),F.castShadow=!0,F.receiveShadow=!0,t.add(F)}for(const S of u){const _=bt(S),F=Un(),U=[{w:a,h:I.clearH,x:0,z:o.minZ+.02,ry:0},{w:r,h:I.clearH,x:o.maxX-.02,z:0,ry:-Math.PI/2},{w:r,h:I.clearH,x:o.minX+.02,z:0,ry:Math.PI/2}];for(const K of U){const $=new H(new Q(K.w,K.h),F);$.position.set(K.x,_.y+I.clearH/2,K.z),$.rotation.y=K.ry,$.receiveShadow=!0,t.add($)}}kr(t);for(const S of o.stairs)yr(t,S);const w=bt("f1").y,b=bt("f2").y,h=bt("roof").y;wt(t,-8.7,-7,-8.7,-1,w),wt(t,-10.7,-7,-8.7,-7,w),wt(t,-8.7,1,-8.7,7,b),wt(t,-10.7,1,-8.7,1,b),wt(t,-4,-3,5,-3,b),wt(t,-4,3,5,3,b),wt(t,-4,-3,-4,3,b),wt(t,5,-3,5,3,b),wt(t,8.7,1,8.7,7,h),wt(t,8.7,1,10.7,1,h);const R=zt(4,.5),E=1.1,O=.25,M=[{w:a+.6,d:O,x:0,z:o.minZ-O/2},{w:a+.6,d:O,x:0,z:o.maxZ+O/2},{w:O,d:r,x:o.minX-O/2,z:0},{w:O,d:r,x:o.maxX+O/2,z:0}];for(const S of M){const _=new H(new W(S.w,E,S.d),R);_.position.set(S.x,h+E/2,S.z),_.castShadow=!0,_.receiveShadow=!0,t.add(_)}const N=new lt({map:Hn().map,color:12163695,roughness:.6});for(const[S,_]of[[-4,4],[2,-4]]){const F=new H(new W(2.2,.09,.55),N);F.position.set(S,h+.45,_),F.castShadow=!0,t.add(F);for(const U of[-.9,.9]){const K=new H(new W(.08,.42,.5),fe());K.position.set(S+U,h+.21,_),t.add(K)}}const y=new lt({color:5194806,roughness:.45,metalness:.65}),k=new Wt,C=new H(new va(1.3,.42,14,28,Math.PI),y);C.castShadow=!0,k.add(C);const P=new H(new co(.55,18,14),y);P.scale.set(1.5,.75,1),P.position.set(1.1,-.95,.2),P.castShadow=!0,k.add(P),k.position.set(-2,h+1.35,.5),k.rotation.y=-.6,t.add(k);const L=new H(new te(1.9,1.9,.12,24),zt(1,1,14209994));L.position.set(-2,h+.06,.5),L.receiveShadow=!0,t.add(L);const G=new H(new W(2.8,.18,7.2),zt(1,2));G.position.set(9.7,h+2.6,4),G.castShadow=!0,t.add(G);for(const[S,_]of[[8.85,.8],[10.55,.8],[8.85,7.2],[10.55,7.2]]){const F=new H(new W(.12,2.6,.12),fe());F.position.set(S,h+1.3,_),t.add(F)}let T=null;return n||(T=new Cn(e.downlight.color,e.downlight.intensity*.022),t.add(T)),{downlights:{lights:c,warm:T,bulbMat:l}}}function Cr(t){const{minX:e,maxX:n,minZ:o,maxZ:a,wallT:r}=I,i=.55,c=e+r/2,l=n-r/2,u=o+r/2,m=a-r/2,x=new Xt({map:ja(),transparent:!0,depthWrite:!1});for(const g of I.floors){if(g.id==="roof")continue;const p=g.y+.018,d=[[l-c,(c+l)/2,u+i/2,Math.PI],[l-c,(c+l)/2,m-i/2,0],[m-u,c+i/2,(u+m)/2,-Math.PI/2],[m-u,l-i/2,(u+m)/2,Math.PI/2]];for(const[f,w,b,h]of d){const R=new H(new Q(f,i),x);R.rotation.x=-Math.PI/2,R.rotation.z=h,R.position.set(w,p,b),R.renderOrder=1,t.add(R)}}}class Er extends Sa{constructor(e){super(e),this.type=xe}parse(e){const i=function(y,k){switch(y){case 1:throw new Error("THREE.RGBELoader: Read Error: "+(k||""));case 2:throw new Error("THREE.RGBELoader: Write Error: "+(k||""));case 3:throw new Error("THREE.RGBELoader: Bad File Format: "+(k||""));default:case 4:throw new Error("THREE.RGBELoader: Memory Error: "+(k||""))}},m=`
`,x=function(y,k,C){k=k||1024;let L=y.pos,G=-1,T=0,S="",_=String.fromCharCode.apply(null,new Uint16Array(y.subarray(L,L+128)));for(;0>(G=_.indexOf(m))&&T<k&&L<y.byteLength;)S+=_,T+=_.length,L+=128,_+=String.fromCharCode.apply(null,new Uint16Array(y.subarray(L,L+128)));return-1<G?(y.pos+=T+G+1,S+_.slice(0,G)):!1},g=function(y){const k=/^#\?(\S+)/,C=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,P=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,L=/^\s*FORMAT=(\S+)\s*$/,G=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,T={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0};let S,_;for((y.pos>=y.byteLength||!(S=x(y)))&&i(1,"no header found"),(_=S.match(k))||i(3,"bad initial token"),T.valid|=1,T.programtype=_[1],T.string+=S+`
`;S=x(y),S!==!1;){if(T.string+=S+`
`,S.charAt(0)==="#"){T.comments+=S+`
`;continue}if((_=S.match(C))&&(T.gamma=parseFloat(_[1])),(_=S.match(P))&&(T.exposure=parseFloat(_[1])),(_=S.match(L))&&(T.valid|=2,T.format=_[1]),(_=S.match(G))&&(T.valid|=4,T.height=parseInt(_[1],10),T.width=parseInt(_[2],10)),T.valid&2&&T.valid&4)break}return T.valid&2||i(3,"missing format specifier"),T.valid&4||i(3,"missing image size specifier"),T},p=function(y,k,C){const P=k;if(P<8||P>32767||y[0]!==2||y[1]!==2||y[2]&128)return new Uint8Array(y);P!==(y[2]<<8|y[3])&&i(3,"wrong scanline width");const L=new Uint8Array(4*k*C);L.length||i(4,"unable to allocate buffer space");let G=0,T=0;const S=4*P,_=new Uint8Array(4),F=new Uint8Array(S);let U=C;for(;U>0&&T<y.byteLength;){T+4>y.byteLength&&i(1),_[0]=y[T++],_[1]=y[T++],_[2]=y[T++],_[3]=y[T++],(_[0]!=2||_[1]!=2||(_[2]<<8|_[3])!=P)&&i(3,"bad rgbe scanline format");let K=0,$;for(;K<S&&T<y.byteLength;){$=y[T++];const Z=$>128;if(Z&&($-=128),($===0||K+$>S)&&i(3,"bad scanline data"),Z){const et=y[T++];for(let be=0;be<$;be++)F[K++]=et}else F.set(y.subarray(T,T+$),K),K+=$,T+=$}const V=P;for(let Z=0;Z<V;Z++){let et=0;L[G]=F[Z+et],et+=P,L[G+1]=F[Z+et],et+=P,L[G+2]=F[Z+et],et+=P,L[G+3]=F[Z+et],G+=4}U--}return L},d=function(y,k,C,P){const L=y[k+3],G=Math.pow(2,L-128)/255;C[P+0]=y[k+0]*G,C[P+1]=y[k+1]*G,C[P+2]=y[k+2]*G,C[P+3]=1},f=function(y,k,C,P){const L=y[k+3],G=Math.pow(2,L-128)/255;C[P+0]=we.toHalfFloat(Math.min(y[k+0]*G,65504)),C[P+1]=we.toHalfFloat(Math.min(y[k+1]*G,65504)),C[P+2]=we.toHalfFloat(Math.min(y[k+2]*G,65504)),C[P+3]=we.toHalfFloat(1)},w=new Uint8Array(e);w.pos=0;const b=g(w),h=b.width,R=b.height,E=p(w.subarray(w.pos),h,R);let O,M,N;switch(this.type){case Je:N=E.length/4;const y=new Float32Array(N*4);for(let C=0;C<N;C++)d(E,C*4,y,C*4);O=y,M=Je;break;case xe:N=E.length/4;const k=new Uint16Array(N*4);for(let C=0;C<N;C++)f(E,C*4,k,C*4);O=k,M=xe;break;default:throw new Error("THREE.RGBELoader: Unsupported type: "+this.type)}return{width:h,height:R,data:O,header:b.string,gamma:b.gamma,exposure:b.exposure,type:M}}setDataType(e){return this.type=e,this}load(e,n,o,a){function r(i,c){switch(i.type){case Je:case xe:i.colorSpace=Ca,i.minFilter=He,i.magFilter=He,i.generateMipmaps=!1,i.flipY=!0;break}n&&n(i,c)}return super.load(e,r,o,a)}}const zo=[];function jo(t){const n=document.createElement("canvas");n.width=1024,n.height=1024;const o=n.getContext("2d"),a=o.createLinearGradient(0,0,0,1024);for(const[u,m]of t.stops)a.addColorStop(u,m);if(o.fillStyle=a,o.fillRect(0,0,1024,1024),t.stars>0){const u=Fe(90210);for(let m=0;m<t.stars;m++){const x=u()*1024,g=u()*1024*.82,p=.4+u()*1.6,d=.35+u()*.65;if(u()>.965){const f=o.createRadialGradient(x,g,0,x,g,p*5);f.addColorStop(0,`rgba(255, 255, 255, ${d*.5})`),f.addColorStop(1,"rgba(255,255,255,0)"),o.fillStyle=f,o.beginPath(),o.arc(x,g,p*5,0,Math.PI*2),o.fill()}o.fillStyle=`rgba(255, 255, 255, ${d})`,o.beginPath(),o.arc(x,g,p,0,Math.PI*2),o.fill()}}const r=Fe(13579),[i,c]=t.cloudAlpha;for(let u=0;u<t.cloudCount;u++){const m=r()*1024,x=1024*(.3+r()*.45),g=30+r()*90;for(let p=0;p<7;p++){const d=m+(r()-.5)*g*2.4,f=x+(r()-.5)*g*.7,w=g*(.35+r()*.5),b=o.createRadialGradient(d,f,0,d,f,w);b.addColorStop(0,`rgba(${t.cloudColor}, ${i+r()*(c-i)})`),b.addColorStop(1,`rgba(${t.cloudColor}, 0)`),o.fillStyle=b,o.beginPath(),o.arc(d,f,w,0,Math.PI*2),o.fill()}}const l=new pe(n);return l.colorSpace=It,l}const Mr={daylight:"./assets/sky/day.hdr",sunset:"./assets/sky/sunset.hdr",night:"./assets/sky/night.jpg"};function ke(t,e){const n=Mr[e],o=r=>{r.minFilter=He,r.magFilter=He,t.map=r,t.needsUpdate=!0},a=()=>{};n.endsWith(".hdr")?new Er().load(n,o,void 0,a):new Ta().load(n,r=>{r.colorSpace=It,o(r)},void 0,a)}function Tr(t,e,n){if(n){const r=(u,m)=>new H(new co(m,32,16),new Xt({map:jo(u),side:Do,fog:!1,transparent:!0,depthWrite:!1,opacity:0})),i=r(Ot.night.sky,450),c=r(Ot.sunset.sky,448),l=r(Ot.daylight.sky,446);for(const u of[i,c,l])u.position.y=-70;return i.renderOrder=-3,c.renderOrder=-2,l.renderOrder=-1,t.add(i,c,l),ke(l.material,"daylight"),ke(c.material,"sunset"),ke(i.material,"night"),{daylight:l,sunset:c,night:i}}const o=e===Ot.sunset?"sunset":e===Ot.night?"night":"daylight",a=new H(new co(450,32,16),new Xt({map:jo(e.sky),side:Do,fog:!1}));return a.position.y=-70,t.add(a),ke(a.material,o),null}function Lr(t,e){const n=new H(new Q(800,800),new lt({map:Ho().map,normalMap:Ho().normalMap,normalScale:new Rt(.6,.6),color:e.grassTint,roughness:.95,metalness:0}));n.rotation.x=-Math.PI/2,n.position.y=-.03,n.receiveShadow=!0,t.add(n);const o=new H(new Q(400,900),new lt({color:e.sea.color,roughness:e.sea.roughness,metalness:e.sea.metalness}));o.rotation.x=-Math.PI/2,o.position.set(290,-.02,0),t.add(o);const a=new H(new Q(8,900),new lt({color:13220758,roughness:.9}));a.rotation.x=-Math.PI/2,a.position.set(88,-.025,0),t.add(a);const r=Fe(97531),i=new Wt;let c=4e4;function l(p,d,f){c+=733;const w=uo(c,{trunkLen:2.6*f,trunkRad:.24*f,maxLevel:2,leafScale:.95*f});w.position.set(p,0,d),w.rotation.y=r()*Math.PI*2,i.add(w)}[[-12,30,1],[4,31,1.15],[12,34,.9],[34,-18,1.1],[36,14,.95]].forEach(([p,d,f],w)=>{const b=uo(6e4+w*137,{trunkLen:3.2*f,trunkRad:.32*f,maxLevel:2,leafScale:1.1*f});b.position.set(p+(r()-.5)*2,0,d+(r()-.5)*2),b.rotation.y=r()*Math.PI*2,i.add(b)});const m=[[-20,33],[-4,35],[20,30],[-16,42],[-6,45],[6,43],[16,46],[0,52],[-24,50],[24,48]];for(const[p,d]of m)l(p+(r()-.5)*3,d+(r()-.5)*3,1+r()*.9);const x=[[40,-10],[44,22],[52,-18],[60,8],[48,-2]];for(const[p,d]of x)l(p+(r()-.5)*3,d+(r()-.5)*3,.9+r()*.8);const g=[[-35,-30],[-45,0],[-38,20],[-30,40],[20,-40],[-10,-38]];for(const[p,d]of g)l(p+(r()-.5)*4,d+(r()-.5)*4,1.1+r()*1);for(const p of Rn(i))t.add(p);return{seaMat:o.material}}function zr(t,e){const n=uo(31415,{trunkLen:4.6,trunkRad:.42,maxLevel:3,leafScale:1.4});n.position.set(7,0,14);for(const r of Rn(n))t.add(r);const o=new H(new te(.42,.72,.45,9),new lt({map:Va(),normalMap:Wa(),normalScale:new Rt(.9,.9),roughness:.95}));o.position.set(7,.22,14),o.castShadow=!0,t.add(o);const a=[];if(e.treeUplights)for(const[r,i]of[[5.6,13],[8.4,15]]){const c=new Ea(16756838,150,15,Math.PI/5,.9,1.8);c.position.set(r,.35,i);const l=new Ma;l.position.set(7,7,14),t.add(l),c.target=l,c.castShadow=!1,t.add(c),a.push(c)}return{treeUplights:a}}function $o(t,e){const n=new Wt,o=new Q(.16,.12);o.translate(-.09,0,0);const a=new Q(.16,.12);a.translate(.09,0,0);const r=new Xt({color:e.color,side:he}),i=new H(o,r),c=new H(a,r);i.rotation.x=-Math.PI/2,c.rotation.x=-Math.PI/2,n.add(i),n.add(c),t.add(n),zo.push({update(l){const u=l*e.speed+e.phase,m=e.cx+Math.cos(u)*e.rx,x=e.cz+Math.sin(u*e.zRatio)*e.rz,g=e.cy+Math.sin(l*e.bobSpeed+e.phase)*e.bobAmp,p=-Math.sin(u)*e.rx*e.speed,d=Math.cos(u*e.zRatio)*e.rz*e.zRatio*e.speed;n.rotation.y=Math.atan2(p,d),n.position.set(m,g,x);const f=Math.sin(l*e.flapSpeed)*1.1;i.rotation.y=f,c.rotation.y=-f}})}function _r(t,e){const n=new Wt,o=new Xt({color:2763310,side:he}),a=new Q(1.6,.35);a.translate(-.8,0,0);const r=new Q(1.6,.35);r.translate(.8,0,0);const i=new H(a,o),c=new H(r,o);i.rotation.x=-Math.PI/2,c.rotation.x=-Math.PI/2,n.add(i),n.add(c),t.add(n),zo.push({update(l){const u=l*e.speed+e.phase,m=e.cx+Math.cos(u)*e.radius,x=e.cz+Math.sin(u)*e.radius,g=e.cy+Math.sin(l*.3+e.phase)*2;n.rotation.y=-u-Math.PI/2,n.position.set(m,g,x);const p=Math.sin(l*e.flapSpeed+e.phase)*.55;i.rotation.y=p,c.rotation.y=-p}})}function Nr(t){const e=Fe(86420),n=[15241786,15979338,15262938,13070264,8368864];for(let o=0;o<5;o++)$o(t,{cx:7,cz:14,cy:1.4+e()*3,rx:1+e()*2.2,rz:1+e()*2.2,zRatio:.7+e()*.6,speed:.35+e()*.4,phase:e()*Math.PI*2,bobSpeed:1.5+e()*1.5,bobAmp:.3+e()*.3,flapSpeed:9+e()*5,color:n[o%n.length]});for(let o=0;o<4;o++)$o(t,{cx:-14+o*10+e()*4,cz:30+e()*8,cy:1.2+e()*2,rx:1.5+e()*3,rz:1.5+e()*3,zRatio:.6+e()*.8,speed:.3+e()*.35,phase:e()*Math.PI*2,bobSpeed:1.2+e()*1.6,bobAmp:.35+e()*.4,flapSpeed:8+e()*5,color:n[(o+2)%n.length]});for(let o=0;o<3;o++)_r(t,{cx:20+e()*30,cz:-10+e()*40,cy:26+e()*12,radius:55+e()*45,speed:.04+e()*.03,phase:e()*Math.PI*2,flapSpeed:2.2+e()*1.2})}function Ar(t,e){const n=new Mn(e.hemi.sky,e.hemi.ground,e.hemi.intensity);n.position.set(0,40,0),t.add(n);const o=new Cn(e.ambient.color,e.ambient.intensity);t.add(o);const a=new qt(e.sun.color,e.sun.intensity);a.position.set(...e.sun.pos),a.castShadow=!0,a.shadow.mapSize.set(2048,2048),a.shadow.bias=-5e-4,a.shadow.normalBias=.02;const r=e.shadowCamera;a.shadow.camera.left=r.left,a.shadow.camera.right=r.right,a.shadow.camera.top=r.top,a.shadow.camera.bottom=r.bottom,a.shadow.camera.near=r.near,a.shadow.camera.far=r.far,t.add(a),t.add(a.target);const i=new qt(e.fill.color,e.fill.intensity);return i.position.set(...e.fill.pos),t.add(i),{hemi:n,ambient:o,sun:a,fill:i}}function Ir(t){for(const e of zo)e.update(t)}let _t=null,Wo=0;function Rr(t){Wo+=t,Ir(Wo),_t&&(_t.phase=(_t.phase+t/Ja)%1,Xn(_t,Fn(_t.phase)))}function Pr(t,e="daylight",n={}){const o=n.fullLights!==!1,a=e==="cycle",r=a?Ka():0,i=a?Za(r):qa(e);t.background=new Tn(i.background),t.fog=new Ln(i.fog.color,i.fog.near,i.fog.far);const c=Tr(t,i,a),l=Lr(t,i);Cr(t);const u=Sr(t,i,o),m=zr(t,i),x=u.downlights,g=Ar(t,i);if(Nr(t),a){const p=new qt(Ot.night.sun.color,0);p.position.set(...Ot.night.sun.pos),t.add(p),t.add(p.target),_t={scene:t,phase:r,sunLight:g.sun,hemiLight:g.hemi,ambientLight:g.ambient,moonLight:p,seaMat:l.seaMat,downlights:x,treeUplights:m.treeUplights,skyDomes:c},g.sun.shadow.camera.updateProjectionMatrix(),Xn(_t,Fn(r))}else _t=null;return{bounds:{minX:I.minX+.6,maxX:I.maxX-.6,minZ:I.minZ+.6,maxZ:I.maxZ-.6}}}let st=null,ce=null,re=!1;function Or(t,e){if(!st)return;const n=new StereoPannerNode(st,{pan:e});n.connect(ce);const o=2+Math.floor(Math.random()*4);let a=st.currentTime+.02;for(let r=0;r<o;r++){const i=st.createOscillator(),c=st.createGain();i.connect(c),c.connect(n);const l=t*(.85+Math.random()*.4),u=l*(Math.random()>.5?1.25:.78),m=.05+Math.random()*.1;i.type="sine",i.frequency.setValueAtTime(l,a),i.frequency.exponentialRampToValueAtTime(u,a+m),c.gain.setValueAtTime(1e-4,a),c.gain.exponentialRampToValueAtTime(.55,a+.012),c.gain.exponentialRampToValueAtTime(1e-4,a+m),i.start(a),i.stop(a+m+.02),a+=m+.04+Math.random()*.09}}function Br(){const t=st.sampleRate*4,e=st.createBuffer(1,t,st.sampleRate),n=e.getChannelData(0);let o=0;for(let c=0;c<t;c++){const l=Math.random()*2-1;o=(o+.02*l)/1.02,n[c]=o*3.5}const a=st.createBufferSource();a.buffer=e,a.loop=!0;const r=st.createBiquadFilter();r.type="lowpass",r.frequency.value=400;const i=st.createGain();i.gain.value=.012,a.connect(r),r.connect(i),i.connect(ce),a.start()}function go(){if(!re)return;const t=[{base:2600,pan:-.7},{base:3400,pan:.6},{base:4200,pan:.15}],e=t[Math.floor(Math.random()*t.length)];Or(e.base,e.pan+(Math.random()-.5)*.3);const n=900+Math.random()*4200;setTimeout(go,n)}function Dr(){if(!re)try{st=new(window.AudioContext||window.webkitAudioContext),ce=st.createGain(),ce.gain.value=.05,ce.connect(st.destination),st.state==="suspended"&&st.resume(),re=!0,Br(),go(),setTimeout(()=>{re&&go()},2500)}catch{re=!1}}const ne=2.5,Vo=4.5,Ko=.0022,Zo=.0058,Se=mt.degToRad(89),Gr=.03,Hr=7.5,Ce=60,Ct=.45,qo=.65,Xr=12;function Fr(t,e){for(const n of I.stairs){const o=Math.min(n.x0,n.x1),a=Math.max(n.x0,n.x1);if(t<o||t>a)continue;const r=Math.min(n.z0,n.z1),i=Math.max(n.z0,n.z1);if(e<r||e>i)continue;const c=mt.clamp((e-n.z0)/(n.z1-n.z0),0,1);return n.yFrom+c*(n.yTo-n.yFrom)}return null}function Yr(t,e,n){return e>=t.x0&&e<=t.x1&&n>=t.z0&&n<=t.z1}function Ur(t,e){return t>=I.minX&&t<=I.maxX&&e>=I.minZ&&e<=I.maxZ}function jn(t,e){const n=[],o=Fr(t,e);if(o!==null&&n.push(o),Ur(t,e))for(const a of I.floors){const r=I.slabHoles[a.id]||[];let i=!1;for(const c of r)if(Yr(c,t,e)){i=!0;break}i||n.push(a.y)}else n.push(0);return n}function jr(t,e,n){const o=jn(t,e);let a=null;for(const r of o)r<=n+qo&&(a===null||r>a)&&(a=r);return a===null||n-a>qo?null:a}function $r(t,e){let n=t,o=e;return e>I.minZ-Ct&&e<I.maxZ+Ct&&(n=mt.clamp(t,I.minX+Ct,I.maxX-Ct)),t>I.minX-Ct&&t<I.maxX+Ct&&(o=Math.max(e,I.minZ+Ct)),{x:n,z:o}}class Wr{constructor(e,n){if(this.camera=e,this.domElement=n,this.enabled=!1,this.euler=new zn(0,0,0,"YXZ"),this.camera.rotation.set(0,0,0),this.camera.rotation.order="YXZ",this.camera.position.set(0,Et,8),this.keys={forward:!1,backward:!1,left:!1,right:!1,run:!1},this.velocity=new Rt(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0,this.groundY=this.camera.position.y-Et,this.moveTouch=null,this.lookTouch=null,!document.getElementById("lu-joy-style")){const o=document.createElement("style");o.id="lu-joy-style",o.textContent=`
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
    inset 0 -2px 4px rgba(32,74,52,0.30); }`,document.head.appendChild(o)}this._joyBase=document.createElement("div"),this._joyBase.className="lu-joy-base",this._joyKnob=document.createElement("div"),this._joyKnob.className="lu-joy-knob",this._wasRunning=!1,document.body.appendChild(this._joyBase),document.body.appendChild(this._joyKnob),this._bindEvents()}_bindEvents(){this._onClick=()=>{this.enabled&&document.pointerLockElement!==this.domElement&&this.domElement.requestPointerLock?.()},this.domElement.addEventListener("click",this._onClick),this._onMouseMove=e=>{this.enabled&&document.pointerLockElement===this.domElement&&(this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=e.movementX*Ko,this.euler.x-=e.movementY*Ko,this.euler.x=mt.clamp(this.euler.x,-Se,Se),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler))},document.addEventListener("mousemove",this._onMouseMove),this._onKeyDown=e=>{if(!this.enabled)return;const n=e.target;n&&(n.tagName==="INPUT"||n.tagName==="TEXTAREA")||this._setKey(e.code,!0)},this._onKeyUp=e=>{this._setKey(e.code,!1)},document.addEventListener("keydown",this._onKeyDown),document.addEventListener("keyup",this._onKeyUp),this._onTouchStart=e=>{if(this.enabled){for(const n of e.changedTouches){const o=window.innerWidth*.5;n.clientX<o&&this.moveTouch===null?(this.moveTouch={id:n.identifier,startX:n.clientX,startY:n.clientY,dx:0,dy:0},this._joyBase.style.left=n.clientX+"px",this._joyBase.style.top=n.clientY+"px",this._joyKnob.style.left=n.clientX+"px",this._joyKnob.style.top=n.clientY+"px",this._joyBase.classList.add("lu-live"),this._joyKnob.classList.add("lu-live")):n.clientX>=o&&this.lookTouch===null&&(this.lookTouch={id:n.identifier,lastX:n.clientX,lastY:n.clientY})}e.cancelable&&e.preventDefault()}},this._onTouchMove=e=>{if(this.enabled){for(const n of e.changedTouches)if(this.moveTouch&&n.identifier===this.moveTouch.id){const o=n.clientX-this.moveTouch.startX,a=n.clientY-this.moveTouch.startY,r=Math.hypot(o,a),i=r>Ce?Ce/r:1;this.moveTouch.dx=o*i/Ce,this.moveTouch.dy=a*i/Ce,this._joyKnob.style.left=this.moveTouch.startX+o*i+"px",this._joyKnob.style.top=this.moveTouch.startY+a*i+"px";const c=Math.hypot(this.moveTouch.dx,this.moveTouch.dy)>.85;this._joyBase.classList.toggle("lu-run",c),this._joyKnob.classList.toggle("lu-run",c),c&&!this._wasRunning&&navigator.vibrate&&navigator.vibrate(10),this._wasRunning=c}else if(this.lookTouch&&n.identifier===this.lookTouch.id){const o=n.clientX-this.lookTouch.lastX,a=n.clientY-this.lookTouch.lastY;this.lookTouch.lastX=n.clientX,this.lookTouch.lastY=n.clientY,this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=o*Zo,this.euler.x-=a*Zo,this.euler.x=mt.clamp(this.euler.x,-Se,Se),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler)}e.cancelable&&e.preventDefault()}},this._onTouchEnd=e=>{for(const n of e.changedTouches)this.moveTouch&&n.identifier===this.moveTouch.id?(this.moveTouch=null,this._wasRunning=!1,this._joyBase.classList.remove("lu-live","lu-run"),this._joyKnob.classList.remove("lu-live","lu-run")):this.lookTouch&&n.identifier===this.lookTouch.id&&(this.lookTouch=null)},this.domElement.addEventListener("touchstart",this._onTouchStart,{passive:!1}),this.domElement.addEventListener("touchmove",this._onTouchMove,{passive:!1}),this.domElement.addEventListener("touchend",this._onTouchEnd),this.domElement.addEventListener("touchcancel",this._onTouchEnd)}_setKey(e,n){switch(e){case"KeyW":case"ArrowUp":this.keys.forward=n;break;case"KeyS":case"ArrowDown":this.keys.backward=n;break;case"KeyA":case"ArrowLeft":this.keys.left=n;break;case"KeyD":case"ArrowRight":this.keys.right=n;break;case"ShiftLeft":case"ShiftRight":this.keys.run=n;break}}_tryMove(e,n){const o=$r(e,n),a=mt.clamp(o.x,-24,ye.bound),r=mt.clamp(o.z,-24,ye.bound),i=I.maxZ,c=this.camera.position.z;if(a>I.minX-Ct&&a<I.maxX+Ct&&(c-i)*(r-i)<0&&Math.abs(a)>1.4)return null;const u=jr(a,r,this.groundY);return u===null?null:{x:a,z:r,y:u}}update(e){if(!this.enabled)return;e=Math.min(e,.1);let n=0,o=0;this.keys.forward&&(o-=1),this.keys.backward&&(o+=1),this.keys.left&&(n-=1),this.keys.right&&(n+=1);let a=this.keys.run?Vo:ne;if(this.moveTouch&&n===0&&o===0){n=this.moveTouch.dx,o=this.moveTouch.dy;const h=Math.hypot(n,o);h<.14&&(n=0,o=0),a=ne+(Vo-ne)*Math.min(1,Math.max(0,(h-.85)/.15))}else{const h=Math.hypot(n,o);h>1&&(n/=h,o/=h)}this.euler.setFromQuaternion(this.camera.quaternion,"YXZ");const r=this.euler.y,i=Math.sin(r),c=Math.cos(r),l=(n*c+o*i)*a,u=(-n*i+o*c)*a,m=1-Math.exp(-10*e);this.velocity.x+=(l-this.velocity.x)*m,this.velocity.y+=(u-this.velocity.y)*m;const x=this.camera.position,g=x.x+this.velocity.x*e,p=x.z+this.velocity.y*e;let d=this._tryMove(g,p);if(!d){const h=this._tryMove(g,x.z),R=this._tryMove(x.x,p);d=h||R||null}d&&(x.x=d.x,x.z=d.z,this.groundY=d.y);const f=Math.hypot(this.velocity.x,this.velocity.y);if(f>.3){this.bobPhase+=e*Hr*(f/ne);const h=Math.min(1,f/ne);this.bobOffset=Math.sin(this.bobPhase)*Gr*h}else this.bobOffset+=(0-this.bobOffset)*m,Math.abs(this.bobOffset)<5e-4&&(this.bobOffset=0,this.bobPhase=0);const w=Math.min(1,Xr*e),b=this.groundY+Et+this.bobOffset+this.liftOffset;x.y+=(b-x.y)*w}resolveBodyCollisions(e){if(!this.enabled||!e||!e.length)return;const n=.6,o=1.2,a=this.camera.position;let r=a.x,i=a.z,c=!1,l=0,u=0;for(const g of e){if(!g||g.y!=null&&Math.abs(g.y-this.groundY)>o)continue;const p=r-g.x,d=i-g.z,f=Math.hypot(p,d);if(f>=n)continue;const w=f>1e-4?p/f:Math.sin(this.euler.y),b=f>1e-4?d/f:Math.cos(this.euler.y);r=g.x+w*n,i=g.z+b*n,l=w,u=b,c=!0}if(!c)return;const m=this._tryMove(r,i);m&&(a.x=m.x,a.z=m.z,this.groundY=m.y);const x=this.velocity.x*-l+this.velocity.y*-u;x>0&&(this.velocity.x+=l*x,this.velocity.y+=u*x)}getState(){return this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z,ry:this.euler.y}}setPose({x:e,y:n,z:o,ry:a}){const r=mt.clamp(e,-24,ye.bound),i=mt.clamp(o,-24,ye.bound);let c;if(n!=null)c=n-Et;else{const l=jn(r,i);c=l.length?Math.max(...l):0}this.groundY=c,this.camera.position.set(r,c+Et,i),this.euler.set(0,a,0,"YXZ"),this.camera.quaternion.setFromEuler(this.euler),this.velocity.set(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0}enable(){this.enabled=!0}disable(){this.enabled=!1,this.keys.forward=this.keys.backward=this.keys.left=this.keys.right=this.keys.run=!1,this.velocity.set(0,0),this.moveTouch=null,this.lookTouch=null,document.pointerLockElement===this.domElement&&document.exitPointerLock?.()}dispose(){this.disable(),this.domElement.removeEventListener("click",this._onClick),document.removeEventListener("mousemove",this._onMouseMove),document.removeEventListener("keydown",this._onKeyDown),document.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("touchstart",this._onTouchStart),this.domElement.removeEventListener("touchmove",this._onTouchMove),this.domElement.removeEventListener("touchend",this._onTouchEnd),this.domElement.removeEventListener("touchcancel",this._onTouchEnd)}}const Vr=3,Kr=6,Jo=2.2,Zr=.05;function qr({player:t,getSelfAvatar:e}){let n=!1,o=0,a=0,r=0;const i=d=>{if(d.code!=="Space"||!t||!t.enabled)return;const f=d.target;f&&(f.tagName==="INPUT"||f.tagName==="TEXTAREA")||(n=!0,d.preventDefault())},c=d=>{d.code==="Space"&&(n=!1)};document.addEventListener("keydown",i),document.addEventListener("keyup",c);let l=null;const u=typeof window<"u"&&window.matchMedia&&window.matchMedia("(pointer: coarse)").matches,m=d=>{n=!0,l&&l.classList.add("lu-fly-on"),d.cancelable&&d.preventDefault(),d.stopPropagation()},x=d=>{n=!1,l&&l.classList.remove("lu-fly-on"),d.stopPropagation()};u&&(l=document.createElement("button"),l.id="lu-fly-btn",l.type="button",l.setAttribute("aria-label","날기 — 누르고 있으면 상승"),l.textContent="▲",l.style.cssText=["position:fixed","right:20px","bottom:104px","width:64px","height:64px","border-radius:50%","border:1.5px solid rgba(255,255,255,0.34)","background:rgba(22,24,30,0.44)","color:rgba(255,255,255,0.92)","font-size:20px","line-height:1","z-index:6","display:none","align-items:center","justify-content:center","touch-action:none","user-select:none","-webkit-user-select:none","cursor:pointer","box-shadow:0 2px 12px rgba(0,0,0,0.32)","transition:background 0.12s, transform 0.12s, opacity 0.2s"].join(";"),l.addEventListener("touchstart",m,{passive:!1}),l.addEventListener("touchend",x),l.addEventListener("touchcancel",x),l.addEventListener("pointerdown",d=>{d.pointerType!=="touch"&&m(d)}),l.addEventListener("pointerup",d=>{d.pointerType!=="touch"&&x(d)}),document.body.appendChild(l));function g(d){const f=Math.min(d||0,.1),w=!!(t&&t.enabled);w||(n=!1),t&&t.liftOffset!==r&&(o=t.liftOffset,a=0),n?a=Vr:(a-=Kr*f,a<-5&&(a=-5)),o+=a*f,o>=Jo&&(o=Jo,a=0),o<=0&&(o=0,a=0),t&&(t.liftOffset=o,r=o);const b=w&&o>Zr,h=e&&e();h&&typeof h.setFlying=="function"&&h.setFlying(b),l&&(l.style.display=w?"flex":"none")}function p(){document.removeEventListener("keydown",i),document.removeEventListener("keyup",c),l&&l.parentNode&&l.parentNode.removeChild(l)}return{update:g,dispose:p}}const Jr="lu-stats-v1-",Qr=3;function Qo(){const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}function ti(){return{totalVisits:0,days:{},dwell:{}}}class ei{key;_seen;data;_saveTimer;constructor(e){this.key=Jr+String(e||"default"),this._seen=new Set,this.data=ti();try{const n=localStorage.getItem(this.key);if(n){const o=JSON.parse(n);o&&typeof o=="object"&&(this.data={totalVisits:o.totalVisits|0,days:o.days&&typeof o.days=="object"?o.days:{},dwell:o.dwell&&typeof o.dwell=="object"?o.dwell:{}})}}catch{}this._saveTimer=null}_save(){this._saveTimer||(this._saveTimer=setTimeout(()=>{this._saveTimer=null;try{localStorage.setItem(this.key,JSON.stringify(this.data))}catch{}},2e3))}addVisit(e){if(!e||this._seen.has(e))return;this._seen.add(e),this.data.totalVisits+=1;const n=Qo();this.data.days[n]=(this.data.days[n]|0)+1;const o=Object.keys(this.data.days).sort();for(;o.length>60;)delete this.data.days[o.shift()];this._save()}addDwell(e,n,o){if(!e||!e.length||!n||!n.length)return;let a=!1;for(const r of e){let i=null,c=Qr;for(const l of n){const u=Math.hypot(l.pos.x-r.x,l.pos.z-r.z);u<c&&(c=u,i=l)}i&&i.title&&(this.data.dwell[i.title]=(this.data.dwell[i.title]||0)+o,a=!0)}a&&this._save()}summary(e){const o=[`오늘 방문 ${this.data.days[Qo()]|0}`,`누적 ${this.data.totalVisits}`];typeof e=="number"&&o.push(`방명록 ${e}`);const a=Object.entries(this.data.dwell).sort((r,i)=>i[1]-r[1])[0];if(a&&a[1]>=10){const r=a[1]>=60?`${Math.round(a[1]/60)}분`:`${Math.round(a[1])}초`;o.push(`인기작 「${a[0]}」 ${r}`)}return o.join(" · ")}}const $n="#5f9e7d";function oi(){const t=`
/* 폰트(@font-face·스택)는 SSOT인 vendor/fonts/fonts.css가 담당 — index.html <head>에서
   정적 <link>로 로드된다. 여기선 그 단일 스택(--app-font)만 --lu-font로 잇는다. */
:root {
  --lu-gold: ${$n};
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
`,e=document.createElement("style");e.id="lu-styles",e.textContent=t,document.head.appendChild(e)}function s(t,e={},n=[]){const o=document.createElement(t);for(const[a,r]of Object.entries(e))a==="className"?o.className=r:a==="text"?o.textContent=r:o.setAttribute(a,r);for(const a of n)o.appendChild(a);return o}const ni="lu-chibi-look::",ai="lu-chibi-thumb::",ri="lu-chibi-closet::",ii="lu-chibi-look-v1",si="lu-chibi-look-thumb-v1",tn=12;function Ve(){const t=Nt();return t&&t.provider&&t.name?`${t.provider}:${t.name}`:"guest"}function Ye(t){return ni+(t||Ve())}function _o(t){return ai+(t||Ve())}function Wn(t){return ri+(t||Ve())}function li(){try{const t=localStorage.getItem(ii);if(t&&!localStorage.getItem(Ye("guest"))){localStorage.setItem(Ye("guest"),t);const e=localStorage.getItem(si);e&&localStorage.setItem(_o("guest"),e)}}catch{}}li();function Vn(t){try{const e=localStorage.getItem(Ye(t));if(!e)return null;const n=JSON.parse(e);return n&&typeof n=="object"?n:null}catch{return null}}function ci(t,e){try{return localStorage.setItem(Ye(e),JSON.stringify(t)),!0}catch{return!1}}function en(t){try{return localStorage.getItem(_o(t))||""}catch{return""}}function di(t,e){try{localStorage.setItem(_o(e),t)}catch{}}let No=null;function ui(t){No=t}function Kn(){return No||Vn()}Yn(()=>{No=null});function eo(t){try{const e=localStorage.getItem(Wn(t));if(!e)return[];const n=JSON.parse(e);return Array.isArray(n)?n:[]}catch{return[]}}function on(t,e){try{return localStorage.setItem(Wn(e),JSON.stringify(t)),!0}catch{return!1}}function pi(t,e,n){try{const o=document.createElement("canvas");return o.width=e,o.height=n,o.getContext("2d").drawImage(t,0,0,e,n),o.toDataURL("image/jpeg",.72)}catch{return""}}let tt=null,at=null,Kt=null,Ee=0,Me=!1,oo=0,Te=0,no=Math.PI;const fi=mt.degToRad(18),hi=.6,nn='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 19.5C4.5 10 11 4 20 4c0 9-6 15.5-15.5 15.5A1 1 0 0 1 4.5 19.5Z"/><path d="M6.7 17.3C10.2 13.3 14.2 9.3 18 5.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>',gi=[{id:"species",label:"종족",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8.3" r="2.1"/><circle cx="12" cy="6.1" r="2.1"/><circle cx="17" cy="8.3" r="2.1"/><path d="M12 11.6c-3.4 0-6.1 2.4-6.1 5.2 0 2 1.8 3.3 3.7 2.6.9-.3 1.7-.3 2.6 0 1.9.7 3.7-.6 3.7-2.6 0-2.8-2.5-5.2-5.9-5.2Z"/></svg>'},{id:"face",label:"얼굴",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><path d="M8.6 14.6c1 1.1 2.1 1.7 3.4 1.7s2.4-.6 3.4-1.7"/></svg>'},{id:"hair",label:"헤어",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12.5C5 8 8.1 4.5 12 4.5s7 3.5 7 8"/><path d="M6.3 12.5v3.2M10.1 12.5v4.2M13.9 12.5v4.2M17.7 12.5v3.2"/></svg>'},{id:"outfit",label:"의상",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8.3 4.2 4.3 7.3l2 3 2-1.1v9.6h7.4V9.2l2 1.1 2-3-4-3.1c-.7 1-1.8 1.6-3.7 1.6s-3-.6-3.7-1.6Z"/></svg>'},{id:"acc",label:"장식",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.5 3.5 1.7 6.3 5.2 7.6-3.5 1.3-4.7 4.1-5.2 7.6-.5-3.5-1.7-6.3-5.2-7.6C10.3 9.3 11.5 6.5 12 3Z"/><circle cx="19" cy="5.2" r="1.2"/></svg>'},{id:"closet",label:"옷장",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.3"/><path d="M12 5.9v1.8"/><path d="M12 7.7 4.3 13.4h15.4L12 7.7Z"/><path d="M4.3 17.4h15.4"/></svg>'}];function bi(t){const{els:e,state:n,callbacks:o,setStatus:a}=t,r=s("button",{id:"lu-am-save",type:"button","aria-label":"이 캐릭터 사용",title:"이 캐릭터 사용",text:"✓"}),i=s("button",{id:"lu-am-close",type:"button","aria-label":"닫기",text:"×"}),c=s("span",{className:"lu-am-title-icon","aria-hidden":"true"});c.innerHTML=nn;const l=s("div",{className:"lu-am-title"},[c,s("span",{text:"캐릭터 디자인"})]),u=s("div",{className:"lu-am-head-actions"},[r,i]),m=s("div",{className:"lu-am-head"},[l,u]),x=s("canvas",{width:"300",height:"400"}),g=s("div",{className:"lu-am-stage"},[x]),p=s("div",{className:"lu-am-stagewrap"},[g]),d=s("div",{className:"lu-am-preview"},[p]),f=["wave","jump","clap","dance","breakdance","run","jumpingjack","heart","kick"];let w=1,b=null,h=null,R=null,E=null;function O(z,B){if(typeof document>"u")return null;const A=document.createElement("canvas");A.width=2,A.height=256;const X=A.getContext("2d"),D=X.createLinearGradient(0,0,0,256);D.addColorStop(0,z),D.addColorStop(1,B),X.fillStyle=D,X.fillRect(0,0,2,256);const j=new pe(A);return j.colorSpace=It,j}function M(z,B){if(typeof document>"u")return null;const A=512,X=307,D=document.createElement("canvas");D.width=A,D.height=X;const j=D.getContext("2d");j.fillStyle=z,j.fillRect(0,0,A,X);const ht=28,Tt=A/ht;j.fillStyle=B;for(let oe=0;oe<ht;oe++)j.fillRect(oe*Tt,0,Tt/2,X);const ee=new pe(D);return ee.colorSpace=It,ee.anisotropy=4,ee}function N(){if(b)return;b=new _n({canvas:x,antialias:!0,alpha:!0}),b.setPixelRatio(Math.min(2,typeof window<"u"&&window.devicePixelRatio||1)),b.setSize(300,400,!1),b.shadowMap.enabled=!0,b.shadowMap.type=La,b.toneMapping=Nn,b.toneMappingExposure=1,b.outputColorSpace=It,h=new An,h.background=O("#f0ead9","#ddd2bd")||new Tn("#ddd2bd"),h.fog=new Ln(14603199,5.5,10),R=new In(30,300/400,.1,20),R.position.set(0,1,4),R.lookAt(0,.85,0),h.add(new Mn(16775924,2367256,.65));const z=new qt(16777215,1.4);z.position.set(.7,2,2.6),h.add(z);const B=new qt(16776696,.4);B.position.set(-1.8,1.1,1.6),h.add(B);const A=new qt(16777215,0);A.position.set(.4,5,1),A.castShadow=!0,A.shadow.mapSize.set(512,512),A.shadow.camera.near=.5,A.shadow.camera.far=9,A.shadow.camera.left=-1.3,A.shadow.camera.right=1.3,A.shadow.camera.top=1.3,A.shadow.camera.bottom=-1.3,A.shadow.radius=35,A.shadow.blurSamples=24,A.shadow.bias=-5e-4,h.add(A),h.add(A.target);const X=new H(new Q(6,6),new lt({color:12165231,roughness:.9,metalness:0}));X.rotation.x=-Math.PI/2,X.position.y=0,X.receiveShadow=!0,h.add(X);const D=new H(new Q(6,6),new za({opacity:.3}));D.rotation.x=-Math.PI/2,D.position.y=.002,D.material.polygonOffset=!0,D.material.polygonOffsetFactor=-1,D.receiveShadow=!0,h.add(D);const j=M("#e2d7bf","#efe7d3"),ht=new H(new Q(10,6),new lt({map:j,roughness:.9,metalness:0}));ht.position.set(0,2.2,-2.3),h.add(ht),E=new Wt,E.rotation.y=Math.PI,h.add(E)}let y="species";const k=s("div",{className:"lu-am-nav",role:"tablist","aria-label":"캐릭터 디자인 카테고리"}),C=s("div",{className:"lu-am-panel"}),P=s("div",{className:"lu-am-tabpage",id:"lu-am-tabpanel",role:"tabpanel",tabindex:"0"});C.appendChild(k),C.appendChild(P),k.addEventListener("keydown",z=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(z.key))return;const B=[...k.querySelectorAll(".lu-am-navtab")];if(!B.length)return;const A=B.findIndex(j=>j.getAttribute("aria-selected")==="true");let X=A<0?0:A;z.key==="ArrowLeft"?X=(A-1+B.length)%B.length:z.key==="ArrowRight"?X=(A+1)%B.length:z.key==="Home"?X=0:z.key==="End"&&(X=B.length-1),z.preventDefault(),B[X].click();const D=k.querySelectorAll(".lu-am-navtab")[X];D&&D.focus()});const L=s("div",{className:"lu-am-body"},[d,C]),G=s("div",{className:"lu-am-card"},[m,L]),T=s("div",{id:"lu-chibi-maker",className:"lu"},[G]);document.body.appendChild(T);function S(z,B){tt&&(tt[z]=B,z==="species"&&B!=="human"&&Xo[B]&&Object.assign(tt,Xo[B]),tt=Qe(tt),qe(),Vt())}function _(z){tt=Qe(Object.assign({},z)),qe(),Vt()}function F(){for(const z of er){const B=or.filter(X=>(X.cat||"human")===z.id);if(!B.length)continue;P.appendChild(s("div",{className:"lu-am-section-title",text:`${z.name} (${B.length})`}));const A=s("div",{className:"lu-am-tabs lu-am-presets"});for(const X of B){const D=s("button",{type:"button",className:"lu-am-tab lu-am-preset"}),j=X.look.skin||Oe.skin,ht=X.look.top||X.look.hairColor||Oe.top,Tt=s("span",{className:"lu-am-preset-dot","aria-hidden":"true"});Tt.style.background=`conic-gradient(${j} 0deg 180deg, ${ht} 180deg 360deg)`,D.appendChild(Tt),D.appendChild(s("span",{className:"lu-am-preset-label",text:X.name})),D.addEventListener("click",()=>_(X.look)),A.appendChild(D)}P.appendChild(A)}}function U(z){const B=Fo.find(A=>A.id===z);return B&&B.name||"아야모"}function K(){if(!Nt())return;const z=Ve();et("내 옷장");const B=s("button",{type:"button",className:"lu-am-btn lu-closet-save",text:"＋ 지금 모습 옷장에 저장"});B.addEventListener("click",()=>{const D=eo(z);if(D.length>=tn){a(`옷장은 최대 ${tn}벌까지 저장할 수 있어요`);return}const j={id:"c"+Date.now(),name:U(tt.species),look:JSON.parse(JSON.stringify(tt)),thumb:Bo(120,160),ts:Date.now()};if(D.push(j),!on(D,z)){a("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요");return}Vt()}),P.appendChild(B);const A=eo(z);if(!A.length){P.appendChild(s("div",{className:"lu-closet-empty",text:"아직 저장한 옷이 없어요. 마음에 드는 모습을 저장해 두세요."}));return}const X=s("div",{className:"lu-closet-grid"});A.forEach(D=>{const j=s("div",{className:"lu-closet-cell"}),ht=s("button",{type:"button",className:"lu-closet-load",title:`${D.name} 불러오기`,"aria-label":`${D.name} 불러오기`});D.thumb&&(ht.style.backgroundImage=`url('${D.thumb}')`),ht.appendChild(s("span",{className:"lu-closet-name",text:D.name})),ht.addEventListener("click",()=>_(D.look));const Tt=s("button",{type:"button",className:"lu-closet-del",text:"×",title:"삭제","aria-label":`${D.name} 삭제`});Tt.addEventListener("click",ee=>{ee.stopPropagation();const oe=eo(z).filter(ya=>ya.id!==D.id);on(oe,z),Vt()}),j.appendChild(ht),j.appendChild(Tt),X.appendChild(j)}),P.appendChild(X)}const $=(z,B)=>[{id:!1,name:z},{id:!0,name:B}];function V(z,B,A){P.appendChild(s("div",{className:"lu-am-section-title",text:z}));const X=s("div",{className:"lu-am-tabs"});B.forEach(D=>{const j=s("button",{type:"button",className:"lu-am-tab"+(tt[A]===D.id?" lu-selected":""),text:D.name});j.addEventListener("click",()=>S(A,D.id)),X.appendChild(j)}),P.appendChild(X)}function Z(z,B,A){P.appendChild(s("div",{className:"lu-am-section-title",text:z}));const X=s("div",{className:"lu-swatches"});B.forEach(D=>{const j=s("button",{type:"button",className:"lu-swatch"+(tt[A]===D?" lu-selected":""),style:`background:${D};`,title:D,"aria-label":`${z} ${D}`});j.addEventListener("click",()=>S(A,D)),X.appendChild(j)}),P.appendChild(X)}function et(z){const B=s("div",{className:"lu-am-group-title"}),A=s("span",{className:"lu-am-group-icon","aria-hidden":"true"});A.innerHTML=nn,B.appendChild(A),B.appendChild(s("span",{text:z})),P.appendChild(B)}function be(){k.textContent="";const z=!!Nt(),B=gi.filter(A=>A.id!=="closet"||z);B.some(A=>A.id===y)||(y="species"),B.forEach(A=>{const X=y===A.id,D=s("button",{type:"button",role:"tab",id:"lu-am-tab-"+A.id,className:"lu-am-navtab"+(X?" lu-selected":""),"aria-selected":X?"true":"false","aria-controls":"lu-am-tabpanel",tabindex:X?"0":"-1","aria-label":A.label});D.innerHTML=A.icon,D.appendChild(s("span",{className:"lu-am-navtab-label",text:A.label})),D.addEventListener("click",()=>{y!==A.id&&(y=A.id,Vt(),P.scrollTop=0)}),k.appendChild(D)}),P.setAttribute("aria-labelledby","lu-am-tab-"+y)}function Vt(){if(be(),P.textContent="",!tt)return;const z=tt.species&&tt.species!=="human";y==="species"?(F(),et(z?"종족 · 털색":"종족 · 성별 · 피부색"),V("종족",Fo,"species"),z||V("성별",nr,"gender"),Z(z?"털 색":"피부색",ar,"skin")):y==="face"?(et("얼굴"),V("얼굴형",rr,"face"),V("눈",ir,"eyeStyle"),V("입",sr,"mouth"),z||V("수염",lr,"beardStyle"),V("볼터치",$("없음","있음"),"blush"),Z("눈동자 색",cr,"eyeColor")):y==="hair"?z?(et("포인트"),Z("귀·꼬리 색",Yo,"hairColor")):(et("헤어"),V("헤어",dr,"hairStyle"),Z("머리 색",Yo,"hairColor")):y==="outfit"?(et("의상"),V("상의 패턴",ur,"pattern"),V("의상 세트",pr,"outfit"),V("하의",fr,"bottomType"),Z("상의 색",to,"top"),Z("하의 색",to,"bottom"),Z("신발 색",to,"shoes")):y==="acc"?(et("장식"),V("머리 장식",hr,"acc"),V("안경",$("없음","착용"),"glasses"),V("헤일로",$("없음","있음"),"halo"),V("날개",$("없음","있음"),"wings"),V("가슴 하트",$("없음","있음"),"heart")):y==="closet"&&K()}function qe(){!tt||!E||(at&&(E.remove(at.group),at.dispose(),at=null),at=Pn(ho(tt),$n," ",{blobShadow:!1}),at.group.traverse(z=>{z.isMesh&&(z.castShadow=!0)}),E.add(at.group))}function Po(z){Kt=requestAnimationFrame(Po);const B=Ee?(z-Ee)/1e3:0,A=Math.min(.1,B);if(Ee=z,!Me&&(Te+=A,E.rotation.y=no+Math.sin(Te*hi)*fi,w-=B,w<=0&&at&&typeof at.playAction=="function")){const X=f[Math.floor(Math.random()*f.length)];at.playAction(X),w=(gr[X]||1.5)+.6+Math.random()*.9}at&&at.update(A,0),b.render(h,R)}function ba(){Kt||(Ee=0,Kt=requestAnimationFrame(Po))}function ma(){Kt&&cancelAnimationFrame(Kt),Kt=null}x.addEventListener("pointerdown",z=>{Me=!0,oo=z.clientX,d.classList.add("lu-dragging"),x.setPointerCapture(z.pointerId)}),x.addEventListener("pointermove",z=>{Me&&(E.rotation.y+=(z.clientX-oo)*.012,oo=z.clientX)});const Oo=()=>{Me=!1,d.classList.remove("lu-dragging"),no=E.rotation.y,Te=0};x.addEventListener("pointerup",Oo),x.addEventListener("pointercancel",Oo),i.addEventListener("click",()=>me()),T.addEventListener("click",z=>{z.target===T&&me()});function Bo(z,B){try{return b?(b.render(h,R),pi(x,z,B)||b.domElement.toDataURL("image/png")):""}catch{return""}}function xa(){const B=!!Nt()?"저장하고 사용":"이 캐릭터 사용";r.setAttribute("aria-label",B),r.title=B}r.addEventListener("click",()=>{if(!tt)return;const z=JSON.parse(JSON.stringify(tt));ui(z);const B=!!Nt();if(B){const A=ci(z),X=Bo(150,200);X&&di(X),A||a("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요")}e&&e.lobby&&e.lobby.onChibiSaved(),n.entered&&typeof o.onAvatarChange=="function"&&o.onAvatarChange(ho(z)),B||a("이 캐릭터로 적용했어요 · 회원가입하면 저장돼요"),me()});function wa(){y="species",tt=Qe(Object.assign({},Oe,Kn()||{})),xa(),N(),E.rotation.y=Math.PI,no=Math.PI,Te=0,w=1,qe(),Vt(),T.classList.add("lu-open"),n.chibiOpen=!0,ba(),typeof o.onMakerToggle=="function"&&o.onMakerToggle(!0)}function me(){T.classList.remove("lu-open"),n.chibiOpen=!1,ma(),at&&(E.remove(at.group),at.dispose(),at=null),typeof o.onMakerToggle=="function"&&o.onMakerToggle(!1)}return{open:wa,close:me}}const mi=8,Le=12;let v=null,ot={onEnter:null,onChatSend:null,onAvatarChange:null,onMakerToggle:null},an=po[0];const Jt={chibiOpen:!1,entered:!1};let bo=null,rn=!1,Ft=!1,mo=null,Dt=null,Yt=!1,xo=null,Ut=!1,wo=null,Ue=null;const ze=120;let St={onPrev:null,onNext:null,onExit:null,onToggleAuto:null};const jt=typeof window<"u"&&"ontouchstart"in window||typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches;let xt={onTour:null,onViewArtwork:null,onGuestbook:null,onCapture:null,onSelfView:null},$t=!1,ct={blob:null,dataUrl:"",galleryName:"",shareUrl:""},Gt=null,je=null,At=null,$e=null;function xi(){const t=s("div",{id:"lu-loading",className:"lu"},[s("div",{className:"lu-spinner"}),s("div",{className:"lu-loading-text",text:"MUSEUM LOADING..."})]);return document.body.appendChild(t),t}function wi(){const t=s("div",{className:"lu-lobby-title",text:"OpenArtShow MUSEUM"}),e=s("div",{className:"lu-lobby-sub",text:"VIRTUAL EXHIBITION"}),n=s("div",{className:"lu-lobby-rule"}),o=s("div",{id:"lu-auth"}),a=s("div",{className:"lu-social-wrap"}),r=s("div",{className:"lu-logged-wrap"}),i=()=>{a.textContent="";for(const L of Object.keys(ve)){const G=ve[L],T=s("button",{className:`lu-social-btn lu-social-${L}`,type:"button"},[s("span",{className:"lu-social-badge",text:G.short}),s("span",{text:G.label})]);T.addEventListener("click",async()=>{T.disabled=!0,T.classList.add("lu-social-busy");try{await br(L)}catch{}T.disabled=!1,T.classList.remove("lu-social-busy")}),a.appendChild(T)}a.appendChild(s("div",{className:"lu-social-note",text:"계정 연동 준비 중 — 지금은 프로필 미리보기로 동작합니다"}))},c=L=>{r.textContent="";const G=s("span",{className:"lu-logged-avatar",text:L.initial||L.name.slice(0,1)}),T=s("span",{className:"lu-logged-name",text:`${L.name}님`}),S=s("span",{className:"lu-logged-via",text:ve[L.provider]?ve[L.provider].short:""}),_=s("button",{className:"lu-logout-btn",type:"button",text:"로그아웃"});_.addEventListener("click",()=>xr()),r.appendChild(s("div",{className:"lu-logged-chip"},[G,T,S,_]))},l=L=>{L?(c(L),a.style.display="none",r.style.display="",x.value=L.name.slice(0,Le)):(a.style.display="",r.style.display="none",(!x.value||Object.values(mr).includes(x.value))&&(x.value="게스트")),f()};i(),o.appendChild(a),o.appendChild(r);const u=s("div",{className:"lu-auth-or"},[s("span",{text:"소셜 계정 연동 (준비 중)"})]),m=s("label",{className:"lu-field-label",for:"lu-nickname",text:"닉네임"}),x=s("input",{id:"lu-nickname",type:"text",maxlength:String(Le),value:"게스트",autocomplete:"off",spellcheck:"false"}),g=s("div",{className:"lu-field-hint",text:`최대 ${Le}자 · 비워두면 '게스트'로 입장합니다`}),p=s("div",{className:"lu-field-label",text:"캐릭터",style:"margin-top:26px;"}),d=s("button",{id:"lu-char-design",className:"lu-char-design-btn",type:"button","aria-label":"캐릭터 디자인 — 나만의 아야모 만들기"});function f(){const L=en();d.textContent="";const G=s("span",{className:"lu-char-design-media"});L?(G.classList.add("lu-has-thumb"),G.style.backgroundImage=`url('${L}')`):G.textContent="🎨";const T=s("span",{className:"lu-char-design-txt"},[s("b",{text:"캐릭터 디자인"}),s("span",{text:L?"내 아야모 편집하기":"나만의 아야모 만들기 (선택)"})]);d.append(G,T,s("span",{className:"lu-char-design-arrow",text:"›"}))}f(),d.addEventListener("click",()=>Ao());const w=s("button",{id:"lu-enter-btn",type:"button",text:"입장하기"}),b=s("div",{id:"lu-picker"}),h=s("div",{className:"lu-lobby-divider"}),R=s("a",{className:"lu-studio-link",href:"./studio.html",target:"_blank",rel:"noopener noreferrer",text:"작가 스튜디오에서 나만의 전시 만들기 →"}),E=s("div",{className:"lu-lobby-form"},[m,x,g,p,d,w,u,o]),O=s("div",{className:"lu-quick-enter"});function M(){O.textContent="";const L=Nt(),G=en(),T=s("span",{className:"lu-quick-avatar"});G?T.style.backgroundImage=`url('${G}')`:T.textContent="🙂";const S=s("div",{className:"lu-quick-greet"},[s("b",{text:(L?`${L.name}님, `:"")+"다시 오셨어요"}),s("span",{text:"저장한 모습으로 바로 입장할 수 있어요"})]),_=s("button",{className:"lu-quick-btn",type:"button",text:"바로 입장"});_.addEventListener("click",C);const F=s("button",{className:"lu-quick-change",type:"button",text:"닉네임·캐릭터 바꾸기"});F.addEventListener("click",()=>{E.classList.remove("lu-collapsed"),O.style.display="none";try{x.focus()}catch{}}),O.append(T,S,_,F)}!!(Nt()||Vn())?(M(),E.classList.add("lu-collapsed")):O.style.display="none";const y=s("div",{className:"lu-lobby-card"},[t,e,n,O,E,b,h,R]),k=s("div",{id:"lu-lobby",className:"lu"},[y]);document.body.appendChild(k),l(Nt()),Yn(l);function C(){let L=x.value.trim().slice(0,Le);L||(L="게스트");let G=0;for(let S=0;S<L.length;S++)G=G*31+L.charCodeAt(S)>>>0;an=po[G%po.length];const T=ho(Object.assign({},Oe,Kn()||{}));typeof ot.onEnter=="function"&&ot.onEnter({nickname:L,color:an,char:T})}w.addEventListener("click",C),x.addEventListener("keydown",L=>{L.stopPropagation(),L.key==="Enter"&&C()}),x.addEventListener("keyup",L=>L.stopPropagation());function P(){f()}return{overlay:k,nickInput:x,pickerBox:b,onChibiSaved:P}}function yi(){const t=jt?[["왼쪽 드래그","이동"],["오른쪽 드래그","시점 회전"],["캐릭터 탭","콕 찌르기"],["작품 카드","탭하여 크게 보기"]]:[["마우스 드래그","시점 회전"],["W A S D","이동"],["Shift","달리기"],["Enter","채팅"],["M","작품 목록"],["T","투어"],["G","방명록"],["V","내 모습 보기"],["C","캐릭터 디자인"],["P","사진 촬영"],["클릭","캐릭터 콕 찌르기"]],e=s("div",{id:"lu-controls",className:"lu lu-hud"});if(e.appendChild(s("div",{className:"lu-controls-title",text:"CONTROLS"})),t.forEach(([n,o])=>{const a=s("div",{},[s("span",{className:"lu-key",text:n}),s("span",{text:o})]);e.appendChild(a)}),document.body.appendChild(e),jt){e.classList.add("lu-collapsed");const n=s("button",{id:"lu-controls-toggle",className:"lu lu-hud",type:"button","aria-label":"조작법 보기",text:"?"});n.addEventListener("click",()=>{e.classList.toggle("lu-collapsed")}),document.body.appendChild(n)}return e}function vi(){if(!jt)return null;function t(){const h=v&&v.chat&&v.chat.wrap;if(!h)return;const R=h.classList.toggle("lu-chat-collapsed");!R&&v.chat.input?v.chat.input.focus():v.chat.input&&v.chat.input.blur(),r.classList.toggle("lu-on",!R)}const e={chat:'<path d="M20 15a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',tour:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z"/>',capture:'<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',more:'<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',list:'<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',self:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',help:'<path d="M9.2 9a2.9 2.9 0 1 1 4.2 2.6c-.9.45-1.4 1.05-1.4 2.1"/><circle cx="12" cy="17.4" r="1" fill="currentColor" stroke="none"/>',dress:'<path d="M9 4l3 3 3-3M9 4l-1.5 5 4.5 3 4.5-3L18 4M7.5 9l-2 8h13l-2-8"/>'};function n(h){const R=document.createElement("span");return R.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+e[h]+"</svg>",R.firstChild}function o(h,R,E,O){const M=s("button",{className:h,type:"button","aria-label":R});M.appendChild(n(E)),M.appendChild(s("span",{className:"lu-dock-label",text:O}));const N=s("div",{className:"lu-dock-wrap"},[M]);return{b:M,wrap:N}}const a=o("lu-dock-btn","채팅 열기/닫기","chat","채팅"),r=a.b;a.wrap.style.display="none",r.addEventListener("click",t);const i=o("lu-dock-btn","투어 시작/종료","tour","투어"),c=i.b;c.addEventListener("click",()=>{typeof xt.onTour=="function"&&xt.onTour()});const l=o("lu-dock-btn lu-gold","사진 촬영","capture","캡처"),u=l.b;u.addEventListener("click",()=>{u.classList.remove("lu-cap-pop"),u.offsetWidth,u.classList.add("lu-cap-pop"),typeof xt.onCapture=="function"&&xt.onCapture()});const m=o("lu-dock-btn","더보기","more","메뉴"),x=m.b,g=s("div",{id:"lu-more-backdrop"}),p=s("div",{id:"lu-more-sheet"});function d(){p.classList.remove("lu-open"),g.classList.remove("lu-open")}function f(h,R,E){const O=s("button",{className:"lu-sheet-btn",type:"button"});return O.appendChild(n(h)),O.appendChild(s("span",{text:R})),O.addEventListener("click",()=>{d(),E()}),O}const w=s("div",{className:"lu-sheet-grid"},[f("list","작품 목록",()=>na()),f("self","내 모습",()=>{typeof xt.onSelfView=="function"&&xt.onSelfView()}),f("dress","캐릭터 디자인",()=>Ao()),f("chat","채팅",t),f("help","조작법",()=>{const h=document.getElementById("lu-controls");h&&h.classList.toggle("lu-collapsed")})]);p.append(s("div",{className:"lu-sheet-handle"}),w),g.addEventListener("click",d),x.addEventListener("click",()=>{const h=p.classList.toggle("lu-open");g.classList.toggle("lu-open",h)}),document.body.appendChild(g),document.body.appendChild(p);const b=s("div",{id:"lu-dock",className:"lu lu-hud"},[a.wrap,i.wrap,l.wrap,m.wrap]);return document.body.appendChild(b),Ht={chatBtn:r,chatWrap:a.wrap,tourBtn:c,selfBtn:null,dock:b},b}let Ht=null;function sn(t,e){Ht&&t==="tour"&&Ht.tourBtn&&Ht.tourBtn.classList.toggle("lu-on",!!e)}function ki(){const t=s("span",{text:"--"}),e=s("div",{className:"lu-stat"});e.append("FPS ");const n=s("b");n.appendChild(t),e.appendChild(n);const o=s("div",{id:"lu-topright",className:"lu lu-hud"},[e]);return document.body.appendChild(o),{wrap:o,fps:t,count:s("span"),countWrap:null}}function Si(){const t=s("div",{id:"lu-status",className:"lu lu-hud"});return document.body.appendChild(t),t}function Ci(){const t=s("div",{id:"lu-chat-log"}),e=s("input",{id:"lu-chat-input",type:"text",maxlength:"120",placeholder:jt?"탭하여 채팅…":"Enter 키로 채팅…",autocomplete:"off",spellcheck:"false"}),n=s("div",{id:"lu-chat",className:"lu lu-hud"},[t,e]);return jt&&n.classList.add("lu-chat-collapsed"),document.body.appendChild(n),e.addEventListener("keydown",o=>{if(o.stopPropagation(),o.key==="Enter"){const a=e.value.trim();e.value="",e.blur(),a&&typeof ot.onChatSend=="function"&&ot.onChatSend(a)}else o.key==="Escape"&&(e.value="",e.blur())}),e.addEventListener("keyup",o=>o.stopPropagation()),e.addEventListener("keypress",o=>o.stopPropagation()),{wrap:n,log:t,input:e}}function Ei(){const t=s("div",{className:"lu-art-eyebrow",text:"ARTWORK"}),e=s("div",{className:"lu-art-title"}),n=s("div",{className:"lu-art-meta"}),o=s("div",{className:"lu-art-rule"}),a=s("div",{className:"lu-art-desc"}),r=s("button",{className:"lu-art-hint",type:"button"});jt?r.appendChild(document.createTextNode("크게 보기")):(r.appendChild(s("span",{className:"lu-key",text:"E"})),r.appendChild(document.createTextNode(" — 크게 보기"))),r.addEventListener("click",c=>{c.stopPropagation(),typeof xt.onViewArtwork=="function"&&xt.onViewArtwork()});const i=s("div",{id:"lu-artwork",className:"lu"},[t,e,n,o,a,r]);return jt&&i.addEventListener("click",()=>{typeof xt.onViewArtwork=="function"&&xt.onViewArtwork()}),document.body.appendChild(i),{panel:i,title:e,meta:n,desc:a}}function Mi(){const t=s("span",{className:"lu-topbar-title"}),e=s("b",{text:"1"}),n=s("span",{className:"lu-topbar-count"});n.appendChild(e),n.append(" 명");const o=s("div",{id:"lu-topbar",className:"lu lu-hud lu-cut-s lu-empty"},[t,s("span",{className:"lu-topbar-sep"}),n]);return document.body.appendChild(o),o._count=e,o._countWrap=n,o}function Ti(){const t=s("button",{id:"lu-lightbox-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{className:"lu-lightbox-stage"}),n=s("div",{className:"lu-lightbox-title"}),o=s("div",{className:"lu-lightbox-meta"}),a=s("div",{className:"lu-lightbox-rule"}),r=s("div",{className:"lu-lightbox-desc"}),i=s("div",{className:"lu-lightbox-caption"},[n,o,a,r]),c=s("div",{id:"lu-lightbox",className:"lu"},[t,e,i]);document.body.appendChild(c),t.addEventListener("click",()=>Be()),c.addEventListener("click",M=>{(M.target===c||M.target===e)&&Be()});const l=new Map;let u=1,m=0,x=0,g=0,p=1,d=0,f=0,w=0,b=null;function h(){return e.querySelector(".lu-lightbox-media")}function R(){const M=h();M&&(M.style.transform=`translate(${m}px, ${x}px) scale(${u})`)}function E(){u=1,m=0,x=0,R()}c.addEventListener("pointerdown",M=>{if(l.set(M.pointerId,{x:M.clientX,y:M.clientY}),l.size===1&&(b={x:M.clientX,y:M.clientY,t:performance.now()}),l.size===2){const[N,y]=[...l.values()];g=Math.hypot(N.x-y.x,N.y-y.y),p=u}}),c.addEventListener("pointermove",M=>{const N=l.get(M.pointerId);if(!N)return;const y=M.clientX-N.x,k=M.clientY-N.y;if(N.x=M.clientX,N.y=M.clientY,l.size===2&&g>0){const[C,P]=[...l.values()];u=Math.min(4,Math.max(1,p*(Math.hypot(C.x-P.x,C.y-P.y)/g))),u===1&&(m=0,x=0),R()}else l.size===1&&u>1&&(m+=y,x+=k,R())});function O(M){if(l.delete(M.pointerId),l.size!==0||!b)return;const N=performance.now()-b.t,y=M.clientX-b.x,k=M.clientY-b.y;if(b=null,u===1&&N<600){if(Math.abs(y)>64&&Math.abs(k)<56){Li(y<0?1:-1);return}if(k>84&&Math.abs(y)<60){Be();return}}if(Math.abs(y)<12&&Math.abs(k)<12&&N<350){const C=performance.now();if(C-d<320&&Math.hypot(M.clientX-f,M.clientY-w)<44){u>1?E():(u=2.4,R()),d=0;return}d=C,f=M.clientX,w=M.clientY}}return c.addEventListener("pointerup",O),c.addEventListener("pointercancel",M=>l.delete(M.pointerId)),{overlay:c,closeBtn:t,stage:e,title:n,meta:o,rule:a,desc:r,resetZoom:E}}let yo=null;function Li(t){const e=Xe();if(!yo||e.length<2)return;const n=e.indexOf(yo),o=e[((n===-1?0:n)+t+e.length)%e.length];oa(o)}const ln="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#eaeae6"/></svg>');function Zn(t){const e=v.artworkList.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(s("div",{className:"lu-artlist-empty",text:"표시할 작품이 없습니다"}));return}t.forEach(n=>{const o=s("img",{className:"lu-artlist-thumb",src:n.imageUrl||ln,alt:n.title||"",loading:"lazy"});o.addEventListener("error",()=>{o.src=ln},{once:!0});const a=s("div",{className:"lu-artlist-info"},[s("div",{className:"lu-artlist-name",text:n.title||""}),s("div",{className:"lu-artlist-artist",text:n.artist||""})]),r=s("button",{type:"button",className:"lu-artlist-card"},[o,a]);r.addEventListener("click",()=>{ge(),typeof xo=="function"&&xo(n)}),e.appendChild(r)})}function zi(){const t=s("button",{id:"lu-artlist-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{id:"lu-artlist-head"},[s("div",{id:"lu-artlist-title",text:"작품 목록"}),t]),n=s("div",{id:"lu-artlist-body"}),o=s("div",{id:"lu-artlist",className:"lu"},[e,n]);return document.body.appendChild(o),t.addEventListener("click",()=>ge()),{panel:o,body:n}}function _i(t){const e=Date.now(),n=Math.max(0,e-t),o=Math.floor(n/6e4);if(o<1)return"방금 전";if(o<60)return`${o}분 전`;const a=Math.floor(o/60);if(a<24)return`${a}시간 전`;const r=new Date(t),i=new Date(e),c=g=>new Date(g.getFullYear(),g.getMonth(),g.getDate()).getTime();if(Math.round((c(i)-c(r))/864e5)<=1)return"어제";const u=r.getFullYear(),m=String(r.getMonth()+1).padStart(2,"0"),x=String(r.getDate()).padStart(2,"0");return`${u}.${m}.${x}`}function qn(t){const e=v.guestbook.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(s("div",{className:"lu-gbook-empty",text:"첫 방명록을 남겨보세요"}));return}const n=["#e07a5f","#81b29a","#5f9e7d","#8e7dbe","#6a8caf","#d68fb8"];t.forEach(o=>{const a=o.name||"게스트";let r=0;for(let u=0;u<a.length;u++)r=r*31+a.charCodeAt(u)>>>0;const i=s("span",{className:"lu-gbook-dot"});i.style.background=n[r%n.length];const c=s("div",{},[i,s("span",{className:"lu-gbook-name",text:a}),s("span",{className:"lu-gbook-time",text:_i(o.ts)})]),l=s("div",{className:"lu-gbook-text",text:o.text||""});e.appendChild(s("div",{className:"lu-gbook-note"},[c,l]))})}function Ni(){const t=s("button",{id:"lu-guestbook-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{id:"lu-guestbook-head"},[s("div",{id:"lu-guestbook-title"},[s("span",{className:"lu-gb-eyebrow",text:"GUESTBOOK"}),s("span",{className:"lu-gb-main",text:"방명록"}),s("span",{className:"lu-gb-sub",text:"다녀간 마음을 한 줄 남겨 주세요"})]),t]),n=s("div",{id:"lu-guestbook-body"}),o=s("textarea",{id:"lu-gbook-input",rows:"3",maxlength:String(ze),placeholder:"전시에 한 줄 메모를 남겨보세요…",spellcheck:"false"}),a=s("span",{className:"lu-gbook-count",text:`0/${ze}`}),r=s("button",{id:"lu-gbook-submit",type:"button",text:"남기기"});r.disabled=!0;const i=s("div",{className:"lu-gbook-footer-row"},[a,r]),c=s("div",{id:"lu-gbook-stats",style:"font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.45);padding:6px 2px 0;"}),l=s("div",{id:"lu-guestbook-footer"},[o,i,c]),u=s("button",{id:"lu-gbtab",type:"button","aria-label":"방명록 열기/닫기 (위아래로 드래그해 위치 이동)",title:"드래그해서 위치를 옮길 수 있어요",text:"방명록"}),m="lu-gbtab-top-v1";try{const b=parseFloat(localStorage.getItem(m));Number.isFinite(b)&&(u.style.top=x(b)+"px")}catch{}function x(b){const h=Math.max(80,(window.innerHeight||800)-140);return Math.min(h,Math.max(60,b))}let g=null;u.addEventListener("pointerdown",b=>{const h=u.getBoundingClientRect();g={startY:b.clientY,startTop:h.top,moved:!1},u.setPointerCapture(b.pointerId)}),u.addEventListener("pointermove",b=>{if(!g)return;const h=b.clientY-g.startY;Math.abs(h)>6&&(g.moved=!0),g.moved&&(u.style.top=x(g.startTop+h)+"px")});const p=()=>{if(g&&g.moved)try{localStorage.setItem(m,String(parseFloat(u.style.top)))}catch{}setTimeout(()=>{g=null},0)};u.addEventListener("pointerup",p),u.addEventListener("pointercancel",p),u.addEventListener("click",()=>{g&&g.moved||ko()});const d=s("div",{id:"lu-guestbook",className:"lu"},[e,n,l,u]);document.body.appendChild(d),t.addEventListener("click",()=>Io());function f(){const b=o.value.length;a.textContent=`${b}/${ze}`,r.disabled=o.value.trim().length===0}function w(){const b=o.value.trim().slice(0,ze);b&&(o.value="",f(),o.blur(),typeof wo=="function"&&wo(b))}return o.addEventListener("keydown",b=>{b.stopPropagation(),b.key==="Escape"?(o.value="",f(),o.blur()):b.key==="Enter"&&(b.ctrlKey||b.metaKey)&&(b.preventDefault(),w())}),o.addEventListener("keyup",b=>b.stopPropagation()),o.addEventListener("keypress",b=>b.stopPropagation()),o.addEventListener("input",f),r.addEventListener("click",w),{panel:d,body:n,input:o,count:a,submitBtn:r,tab:u}}function Ai(){const t=s("button",{type:"button","aria-label":"이전 작품",text:"◀ 이전"}),e=s("span",{className:"lu-tour-sep"}),n=s("span",{className:"lu-tour-count"}),o=s("span",{className:"lu-tour-title"}),a=s("span",{className:"lu-tour-sep"}),r=s("button",{type:"button","aria-label":"다음 작품",text:"다음 ▶"}),i=s("span",{className:"lu-tour-sep"}),c=s("button",{type:"button",className:"lu-tour-auto"}),l=s("span",{className:"lu-tour-sep"}),u=s("button",{id:"lu-tourbar-exit",type:"button","aria-label":"투어 종료",text:"✕ 종료"}),m=s("div",{id:"lu-tourbar",className:"lu"},[t,e,n,o,a,r,i,c,l,u]);return document.body.appendChild(m),t.addEventListener("click",()=>{St.onPrev&&St.onPrev()}),r.addEventListener("click",()=>{St.onNext&&St.onNext()}),u.addEventListener("click",()=>{St.onExit&&St.onExit()}),c.addEventListener("click",()=>{St.onToggleAuto&&St.onToggleAuto()}),{bar:m,prevBtn:t,nextBtn:r,autoBtn:c,exitBtn:u,countEl:n,titleEl:o}}function Ii(){const t=s("div",{id:"lu-shutter",className:"lu"});return document.body.appendChild(t),t}function Ri(){const t=s("button",{id:"lu-share-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{className:"lu-share-title",text:"전시 공유하기"}),n=s("img",{className:"lu-share-preview",alt:"캡처한 전시 화면"}),o=s("button",{className:"lu-share-btn lu-share-btn-primary",type:"button",text:"기기로 공유"}),a=s("button",{className:"lu-share-btn",type:"button",text:"이미지 저장"}),r=s("button",{className:"lu-share-btn",type:"button",text:"X에 공유"}),i=s("button",{className:"lu-share-btn",type:"button",text:"Threads에 공유"}),c=s("button",{className:"lu-share-btn",type:"button",text:"링크 복사"}),l=s("div",{className:"lu-share-actions"},[o,a,r,i,c]),u=s("div",{className:"lu-share-hint",text:"인스타그램은 이미지를 저장하거나 기기로 공유한 뒤 앱에서 올려주세요"}),m=s("div",{className:"lu-share-card"},[t,e,n,l,u]),x=s("div",{id:"lu-share",className:"lu"},[m]);return document.body.appendChild(x),t.addEventListener("click",()=>vo()),x.addEventListener("click",g=>{g.target===x&&vo()}),o.addEventListener("click",async()=>{if(!(!ct.blob||typeof navigator>"u"||typeof navigator.share!="function"))try{const g=new File([ct.blob],"artshow.png",{type:"image/png"});await navigator.share({files:[g],title:ct.galleryName||"OpenArtShow",text:`${ct.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`})}catch{}}),a.addEventListener("click",()=>{if(!ct.dataUrl)return;const g=document.createElement("a");g.href=ct.dataUrl,g.download="artshow.png",document.body.appendChild(g),g.click(),document.body.removeChild(g)}),r.addEventListener("click",()=>{const g=`${ct.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`,p=`https://twitter.com/intent/tweet?text=${encodeURIComponent(g)}&url=${encodeURIComponent(ct.shareUrl||"")}`;window.open(p,"_blank","noopener")}),i.addEventListener("click",()=>{const g=`${ct.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시 ${ct.shareUrl||""}`,p=`https://www.threads.net/intent/post?text=${encodeURIComponent(g)}`;window.open(p,"_blank","noopener")}),c.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(ct.shareUrl||""),Gt&&clearTimeout(Gt),c.textContent="복사됨",c.classList.add("lu-share-btn-copied"),Gt=setTimeout(()=>{c.textContent="링크 복사",c.classList.remove("lu-share-btn-copied"),Gt=null},1600)}catch{}}),{overlay:x,card:m,title:e,preview:n,deviceBtn:o,saveBtn:a,xBtn:r,threadsBtn:i,copyBtn:c}}function Ao(){!v||!v.chibiMaker||Jt.chibiOpen||Ft||$t||Ut||Yt||v.chibiMaker.open()}function Pi(){v&&v.chibiMaker&&v.chibiMaker.close()}function Oi(){window.addEventListener("keydown",t=>{if(t.key==="Escape"){if(Jt.chibiOpen){t.preventDefault(),t.stopImmediatePropagation(),Pi();return}if($t){t.preventDefault(),t.stopImmediatePropagation(),vo();return}if(Ft){t.preventDefault(),t.stopImmediatePropagation(),Be();return}if(Yt){t.preventDefault(),t.stopImmediatePropagation(),ge();return}if(Ut){t.preventDefault(),t.stopImmediatePropagation(),Io();return}return}if(Ft||$t||!Jt.entered)return;const e=document.activeElement;e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA")||(t.key==="Enter"?(t.preventDefault(),t.stopPropagation(),v.chat.input.focus()):(t.key==="c"||t.key==="C"||t.key==="ㅊ")&&!Jt.chibiOpen&&(t.preventDefault(),t.stopPropagation(),Ao()))})}function Bi({onEnter:t,onChatSend:e,onAvatarChange:n,onMakerToggle:o}={}){if(rn){ot.onEnter=t||ot.onEnter,ot.onChatSend=e||ot.onChatSend,ot.onAvatarChange=n||ot.onAvatarChange,ot.onMakerToggle=o||ot.onMakerToggle;return}rn=!0,ot.onEnter=t||null,ot.onChatSend=e||null,ot.onAvatarChange=n||null,ot.onMakerToggle=o||null,oi(),v={loading:xi(),lobby:wi(),controls:yi(),topRight:ki(),status:Si(),chat:Ci(),artwork:Ei(),galleryTitle:Mi(),lightbox:Ti(),artworkList:zi(),guestbook:Ni(),tourBar:Ai(),dock:vi(),shutter:Ii(),share:Ri()},v.chibiMaker=bi({els:v,state:Jt,callbacks:ot,setStatus:nt}),v.topRight.count=v.galleryTitle._count,v.topRight.countWrap=v.galleryTitle._countWrap,Oi(),je!==null&&Qn(je),At&&ta(At.galleries,At.currentId,At.onPick),$e&&Zn($e),Ue&&qn(Ue)}function cn(t){v&&v.loading.classList.toggle("lu-hidden",!t)}function Di(){if(!v)return;Jt.entered=!0,v.lobby.overlay.classList.add("lu-hidden"),v.controls.classList.add("lu-visible"),v.topRight.wrap.classList.add("lu-visible"),v.status.classList.add("lu-visible"),v.chat.wrap.classList.add("lu-visible"),v.galleryTitle.classList.add("lu-visible"),v.guestbook.tab.classList.add("lu-visible"),v.dock&&v.dock.classList.add("lu-visible");const t=document.getElementById("lu-controls-toggle");t&&t.classList.add("lu-visible")}function Gi(t){!v||!t||bo===t.id&&v.artwork.panel.classList.contains("lu-open")||(bo=t.id,v.artwork.title.textContent=t.title||"",v.artwork.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),v.artwork.desc.textContent=t.desc||"",v.artwork.panel.classList.add("lu-open"))}function Hi(){v&&(bo=null,v.artwork.panel.classList.remove("lu-open"))}function Jn(t,e,n){if(!v)return;const o=s("div",{className:"lu-chat-msg"+(n?" lu-self":"")},[s("span",{className:"lu-chat-name",text:t}),s("span",{text:e})]);for(v.chat.log.appendChild(o);v.chat.log.children.length>mi;)v.chat.log.removeChild(v.chat.log.firstChild)}function Xi(t){if(!v)return;const e=v.topRight.count.textContent;v.topRight.count.textContent=String(t),e!==String(t)&&v.topRight.countWrap&&(v.topRight.countWrap.classList.remove("lu-tick"),v.topRight.countWrap.offsetWidth,v.topRight.countWrap.classList.add("lu-tick")),Ht&&Ht.chatWrap&&(Ht.chatWrap.style.display=t>=2?"":"none")}function nt(t){v&&(v.status.textContent=t||"")}function Fi(t){v&&(v.topRight.fps.textContent=String(Math.round(t)))}function Qn(t){v.galleryTitle.querySelector(".lu-topbar-title").textContent=t||"",v.galleryTitle.classList.toggle("lu-empty",!t)}function Yi(t){je=t||"",v&&Qn(je)}function ta(t,e,n){const o=v.lobby.pickerBox;if(o.innerHTML="",!Array.isArray(t)||t.length===0)return;const a=s("div",{className:"lu-field-label",text:"전시 선택",style:"margin-top:26px;"});o.appendChild(a),e==null&&o.appendChild(s("div",{className:"lu-picker-note",text:"공유된 전시 관람 중"}));const r=s("div",{className:"lu-picker-list"});t.forEach(i=>{const c=i.id===e,l=s("button",{type:"button",className:"lu-picker-item"+(c?" lu-picker-current":"")},[s("div",{className:"lu-picker-name",text:i.name||i.id}),s("div",{className:"lu-picker-meta",text:[i.artist,typeof i.count=="number"?`${i.count}점`:null].filter(Boolean).join(" · ")})]);c&&(l.disabled=!0),l.addEventListener("click",()=>{c||typeof n=="function"&&n(i.id)}),r.appendChild(l)}),o.appendChild(r)}function Ui(t,e,n){At={galleries:t,currentId:e??null,onPick:n},v&&ta(At.galleries,At.currentId,At.onPick)}function ea(){const t=v.lightbox.stage,e=t.firstChild;e&&e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),t.innerHTML=""}function oa(t){if(!v||!t)return;yo=t,v.lightbox.resetZoom&&v.lightbox.resetZoom(),Dt&&(clearTimeout(Dt),Dt=null),ea();let e;t.videoUrl?(e=s("video",{className:"lu-lightbox-media",src:t.videoUrl,controls:"controls",autoplay:"autoplay",loop:"loop",muted:"muted",playsinline:"playsinline"}),e.muted=!0):e=s("img",{className:"lu-lightbox-media",src:t.imageUrl||"",alt:t.title||""}),v.lightbox.stage.appendChild(e),v.lightbox.title.textContent=t.title||"",v.lightbox.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),v.lightbox.desc.textContent=t.desc||"",Ft=!0,v.lightbox.overlay.classList.add("lu-open")}function Be(){!v||!Ft||(Ft=!1,v.lightbox.overlay.classList.remove("lu-open"),Dt&&clearTimeout(Dt),Dt=setTimeout(()=>{ea(),Dt=null},340),typeof mo=="function"&&mo())}function de(){return Ft}function ji(t){mo=typeof t=="function"?t:null}function $i(t,e){xo=typeof e=="function"?e:null,$e=t,v&&Zn($e)}function na(){v&&(Yt?ge():(Yt=!0,v.artworkList.panel.classList.add("lu-open")))}function ge(){!v||!Yt||(Yt=!1,v.artworkList.panel.classList.remove("lu-open"))}function dn(){return Yt}function Wi({index:t,total:e,title:n,autoOn:o}={}){if(!v)return;const a=v.tourBar,r=Number.isFinite(t)?t+1:1,i=Number.isFinite(e)?e:0;a.countEl.textContent=`● ${r} / ${i}`,a.titleEl.textContent=` — ${n||""}`,a.autoBtn.textContent=o?"자동진행 ON":"자동진행 OFF",a.autoBtn.classList.toggle("lu-tour-on",!!o),a.bar.classList.add("lu-open")}function Vi(){v&&v.tourBar.bar.classList.remove("lu-open")}function Ki({onTour:t,onViewArtwork:e,onGuestbook:n,onCapture:o,onSelfView:a}={}){xt={onTour:typeof t=="function"?t:null,onViewArtwork:typeof e=="function"?e:null,onGuestbook:typeof n=="function"?n:null,onCapture:typeof o=="function"?o:null,onSelfView:typeof a=="function"?a:null}}function Zi({blob:t,dataUrl:e,galleryName:n,shareUrl:o}={}){if(!v)return;ct={blob:t||null,dataUrl:e||"",galleryName:n||"",shareUrl:o||(typeof window<"u"?window.location.href:"")},v.share.preview.src=ct.dataUrl;let a=!1;if(ct.blob&&typeof navigator<"u"&&typeof navigator.share=="function"&&typeof navigator.canShare=="function")try{const r=new File([ct.blob],"artshow.png",{type:"image/png"});a=navigator.canShare({files:[r]})}catch{a=!1}v.share.deviceBtn.style.display=a?"":"none",Gt&&(clearTimeout(Gt),Gt=null),v.share.copyBtn.textContent="링크 복사",v.share.copyBtn.classList.remove("lu-share-btn-copied"),$t=!0,v.share.overlay.classList.add("lu-open")}function vo(){!v||!$t||($t=!1,v.share.overlay.classList.remove("lu-open"))}function ao(){return $t}function un(){if(!v)return;const t=v.shutter;t.style.transition="none",t.style.opacity="1",t.offsetWidth,t.style.transition="opacity 0.25s ease",t.style.opacity="0"}function qi({onPrev:t,onNext:e,onExit:n,onToggleAuto:o}={}){St={onPrev:typeof t=="function"?t:null,onNext:typeof e=="function"?e:null,onExit:typeof n=="function"?n:null,onToggleAuto:typeof o=="function"?o:null}}function Ji(t){const e=document.getElementById("lu-gbook-stats");e&&(e.textContent=t||"")}function Qi({onSubmit:t}={}){wo=typeof t=="function"?t:null}function ko(){v&&(Ut?Io():(Ut=!0,v.guestbook.panel.classList.add("lu-open")))}function Io(){!v||!Ut||(Ut=!1,v.guestbook.panel.classList.remove("lu-open"))}function ts(){return Ut}function Ro(t){Ue=Array.isArray(t)?t:[],v&&qn(Ue)}function es(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}function os(t,e,n){let o=(e-t)%(Math.PI*2);return o>Math.PI&&(o-=Math.PI*2),o<-Math.PI&&(o+=Math.PI*2),t+o*n}function ns(t){if(t!=="auto")return t;const e=new Date().getHours();return e>=6&&e<16?"daylight":e>=16&&e<19?"sunset":"night"}function as(t){let e=5381;for(let n=0;n<t.length;n++)e=(e<<5)+e+t.charCodeAt(n)>>>0;return e.toString(36)}const rs=24,is=45,ss=3,So="lu-spec-v2",aa=4;function Co(){try{const t=localStorage.getItem(So);if(t){const e=JSON.parse(t);return e&&e.gen===aa&&(e.v==="low"||e.v==="high")?e.v:null}return null}catch{return null}}function ro(t){try{t?localStorage.setItem(So,JSON.stringify({v:t,gen:aa})):localStorage.removeItem(So),localStorage.removeItem("lu-spec-v1"),localStorage.removeItem("lu-lowspec-v1")}catch{}}const De={low:83e5,base:11e6,high:18e6},ls=/swiftshader|llvmpipe|softpipe|software (?:rasterizer|renderer|adapter)|microsoft basic render|\bwarp\b|gdi generic|mesa offscreen|apple software renderer/i;function cs(){const t={name:"",soft:!1};try{const e=document.createElement("canvas"),o=!(e.getContext("webgl2",{failIfMajorPerformanceCaveat:!0})||e.getContext("webgl",{failIfMajorPerformanceCaveat:!0})),a=document.createElement("canvas"),r=a.getContext("webgl2")||a.getContext("webgl");if(!r)return{name:"",soft:!0};const i=r.getExtension("WEBGL_debug_renderer_info");t.name=String(i&&r.getParameter(i.UNMASKED_RENDERER_WEBGL)||r.getParameter(r.RENDERER)||""),t.soft=ls.test(t.name)||o;const c=r.getExtension("WEBGL_lose_context");c&&c.loseContext()}catch{}return t}function ds(t){function e(a){if(a.code==="KeyE"){t.viewCurrentArtwork();return}if(a.code==="KeyM"){if(!t.isEntered()||t.isLightboxOpen())return;t.toggleArtworkList();return}if(a.code==="KeyT"){if(!t.isEntered())return;t.toggleTour();return}if(a.code==="KeyG"){if(!t.isEntered()||t.isLightboxOpen())return;t.toggleGuestbook();return}if(a.code==="KeyP"){if(!t.isEntered()||t.isShareModalOpen())return;t.flashShutter(),t.capturePhoto();return}if(a.code==="KeyV"){if(!t.isEntered()||t.isShareModalOpen())return;t.toggleSelfView();return}if(t.isTouring()&&(a.code==="ArrowLeft"||a.code==="ArrowRight")){if(t.isLightboxOpen())return;a.preventDefault(),a.code==="ArrowLeft"?t.tourPrev():t.tourNext();return}a.code==="Escape"&&t.isTouring()&&!t.isLightboxOpen()&&!t.isArtworkListOpen()&&!t.isGuestbookOpen()&&t.exitTour()}function n(){const a=t.getCamera(),r=t.getRenderer();a.aspect=window.innerWidth/window.innerHeight,a.updateProjectionMatrix(),r.setSize(window.innerWidth,window.innerHeight)}function o(){const a=t.getMp();if(a)try{a.dispose()}catch{}}return{onKeyDown:e,onWindowResize:n,onBeforeUnload:o}}function us(t){const e=t.split(",")[1],n=atob(e),o=new Uint8Array(n.length);for(let a=0;a<n.length;a++)o[a]=n.charCodeAt(a);return new Blob([o],{type:"image/png"})}function ps(t,e,n,o){const a=Math.max(90,Math.round(n*.14)),r=t.createLinearGradient(0,n-a,0,n);r.addColorStop(0,"rgba(0,0,0,0)"),r.addColorStop(1,"rgba(0,0,0,0.55)"),t.fillStyle=r,t.fillRect(0,n-a,e,a);const i=Math.max(20,Math.round(e*.025)),c=Math.max(1,e/1400);t.textBaseline="alphabetic",t.textAlign="left",t.fillStyle="rgba(255,255,255,0.95)",t.font=`300 ${Math.round(18*c)}px ${le()}`,t.fillText(o||"OpenArtShow 전시",i,n-i-6*c),t.fillStyle="#5f9e7d",t.font=`300 ${Math.round(16*c)}px ${le()}`,fs(t,"OpenArtShow",e-i,n-i-22*c,2.5*c),t.textAlign="right",t.fillStyle="rgba(255,255,255,0.6)",t.font=`300 ${Math.round(12*c)}px ${le()}`,t.fillText("syhongart.github.io/openartshow",e-i,n-i-4*c)}function fs(t,e,n,o,a){const r=Array.from(e),i=r.map(m=>t.measureText(m).width),c=i.reduce((m,x)=>m+x,0)+a*(r.length-1),l=t.textAlign;t.textAlign="left";let u=n-c;r.forEach((m,x)=>{t.fillText(m,u,o),u+=i[x]+a}),t.textAlign=l}function hs(){const t=window.location.href;return t.length<2e3?t:window.location.origin+window.location.pathname.replace(/index\.html$/,"landing.html")}function gs(t){const{getRenderer:e,getScene:n,getCamera:o,isThirdPerson:a,getSelfAvatar:r,applySelfCamOffset:i,restoreSelfCamOffset:c,getGalleryInfo:l,photoWall:u,getMyNickname:m,getMp:x,showShareModal:g,setStatus:p}=t;function d(){const f=e(),w=n(),b=o();if(!(!f||!w||!b))try{a()&&r()&&i(),f.render(w,b),a()&&r()&&c();const h=f.domElement.toDataURL("image/png"),R=new Image;R.onload=()=>{const E=document.createElement("canvas");E.width=R.width,E.height=R.height;const O=E.getContext("2d");if(!O)return;O.drawImage(R,0,0);const M=O.createRadialGradient(E.width/2,E.height*.46,Math.min(E.width,E.height)*.4,E.width/2,E.height*.46,Math.max(E.width,E.height)*.72);M.addColorStop(0,"rgba(8,6,4,0)"),M.addColorStop(.24,"rgba(8,6,4,0.03)"),M.addColorStop(.44,"rgba(8,6,4,0.09)"),M.addColorStop(.64,"rgba(8,6,4,0.17)"),M.addColorStop(.82,"rgba(8,6,4,0.26)"),M.addColorStop(1,"rgba(8,6,4,0.34)"),O.fillStyle=M,O.fillRect(0,0,E.width,E.height),ps(O,E.width,E.height,l()?l().name:"");const N=E.toDataURL("image/png");try{const k=Math.round(E.height/E.width*360),C=document.createElement("canvas");C.width=360,C.height=k,C.getContext("2d").drawImage(E,0,0,360,k);const P=C.toDataURL("image/jpeg",.72),L=u.addLocal(m(),l()?l().name:"",P);L&&x()&&x().sendPhoto(L)}catch(y){console.warn("포토월 썸네일 생성 실패 (캡처 자체는 정상):",y)}g({blob:us(N),dataUrl:N,galleryName:l()&&l().name||"OpenArtShow 전시",shareUrl:hs()})},R.onerror=()=>{p("사진 촬영에 실패했습니다.")},R.src=h}catch(h){console.error("사진 촬영 실패:",h),p("사진 촬영에 실패했습니다.")}}return{capturePhoto:d}}function bs(t){const{getPlacedArtworks:e,getPlayer:n,isEntered:o,getTween:a,clearTween:r,startTween:i,getViewingPose:c,showTourBar:l,hideTourBar:u,setDockActive:m,isLightboxOpen:x,isArtworkListOpen:g,hideArtworkList:p}=t;let d=!1,f=0,w=!0,b=!1,h=0;const R=6;function E(S){l({index:f,total:e().length,title:S&&S.title||"",autoOn:w})}function O(S){const _=e()[S];if(!_)return;f=S,b=!1,h=0,E(_);const F=c(_);i(F,()=>{n().setPose(F),b=!0,h=0})}function M(){if(!o()||x()||d)return;const S=e();!S||S.length===0||(g()&&p(),d=!0,m("tour",!0),w=!0,n().disable(),O(0))}function N(){if(!d)return;d=!1,m("tour",!1),b=!1,r(),u();const S=n(),_=S.getState();S.setPose({x:_.x,z:_.z,ry:_.ry}),o()&&!x()&&S.enable()}function y(){d?N():M()}function k(){const S=e();!d||S.length===0||O((f+1)%S.length)}function C(){const S=e();!d||S.length===0||O((f-1+S.length)%S.length)}function P(){d&&(w=!w,h=0,E(e()[f]))}function L(S){const _=e().indexOf(S);_!==-1&&(f=_),b=!1}function G(S){E(S),b=!0,h=0}function T(S){d&&b&&w&&!a()&&!x()&&(h+=S,h>=R&&k())}return{tick:T,startTour:M,exitTour:N,toggleTour:y,next:k,prev:C,toggleAuto:P,syncOnSelect:L,onArrive:G,isTouring:()=>d,getIndex:()=>f}}function ms(t){const{getScene:e,getCamera:n,getPlayer:o,getSelfInfo:a,isEntered:r,createAvatarInstance:i,EYE_HEIGHT:c,setStatus:l,setDockActive:u}=t,m=3,x=.7,g=-.2;let p=!1,d=null,f=null,w=0;const b=new Go,h=new Go,R=new _a;function E(){if(r())if(p=!p,p){const k=a();if(!d&&k)try{d=i(k.char,k.color," "),d.group.traverse(C=>{C.isSprite&&(C.visible=!1)}),e().add(d.group)}catch(C){console.warn("내 아바타 생성 실패:",C),d=null,p=!1;return}if(!d){p=!1;return}d.group.visible=!0,u("self",!0),f=null,w=0,l("내 모습 보기 — V키 또는 [시점] 버튼으로 복귀")}else d&&(d.group.visible=!1,u("self",!1))}function O(k){if(!d)return;const C=d.group,P=C.visible,L=C.position.clone(),G=C.rotation.y;try{const T=a(),S=i(k,T&&T.color||"#3498db"," ");S.group.traverse(_=>{_.isSprite&&(_.visible=!1)}),S.group.position.copy(L),S.group.rotation.y=G,S.group.visible=P,e().add(S.group),e().remove(C),d.dispose(),d=S}catch(T){console.warn("내 아바타 갱신 실패:",T)}}function M(){const k=n();b.copy(k.position),R.copy(k.quaternion),h.set(0,0,1).applyQuaternion(k.quaternion),k.position.addScaledVector(h,m),k.position.y+=x,k.rotateX(g)}function N(){const k=n();k.position.copy(b),k.quaternion.copy(R)}function y(k){if(p&&d){const C=o().getState();d.group.position.set(C.x,C.y-c,C.z),d.group.rotation.y=C.ry,f||(f={x:C.x,z:C.z});const P=k>0?Math.hypot(C.x-f.x,C.z-f.z)/k:0;w+=(P-w)*Math.min(1,10*k),f.x=C.x,f.z=C.z,d.update(k,w)}}return{tick:y,toggle:E,rebuildAvatar:O,applySelfCamOffset:M,restoreSelfCamOffset:N,isThirdPerson:()=>p,getSelfAvatar:()=>d,getSelfCamDist:()=>m}}function xs(t){const{getScene:e,getPlayer:n,setStatus:o,getGuestbookNotes:a,onVisitor:r,onPhoto:i,onChat:c,onPlayerCount:l,onRemoteGuestbook:u,onSelfHit:m,onNpcHit:x,npcProvider:g}=t;let p=null,d=!1;function f(R){if(o(R),!(d||!p)&&(R==="호스트로 개설됨"||R.startsWith("접속됨"))){d=!0;try{p.sendGuestbook(a())}catch(E){console.error("방명록 동기화 전송 실패:",E)}}}function w({nickname:R,color:E,char:O,roomId:M}){try{return p=new Pa(e(),{nickname:R,color:E,char:O,roomId:M}),p.onVisitor=(N,y)=>r(N,y),p.onPhoto=N=>i(N),p.onChat=(N,y)=>c(N,y),p.onPlayerCount=N=>l(N),p.onStatus=f,p.onGuestbook=N=>u(N),p.onSelfHit=N=>m(N),p.onNpcHit=(N,y,k)=>x(N,y,k),p.npcProvider=(N,y)=>g(N,y),p.connect(),!0}catch(N){return console.error("멀티플레이어 초기화 실패:",N),p=null,!1}}function b(R){p&&(p.sendState(n().getState()),p.update(R))}function h(){return p}return{connect:w,tick:b,getMp:h}}function ws(t){const{renderer:e,camera:n,gpuInfo:o,getMp:a,isEntered:r,setFPS:i,setStatus:c}=t;let l=!1,u=0,m=0,x=0,g=0,p=!1,d=0,f=0,w=0;function b(){const E=a();if(!E)return;const O=[];for(const[M,N]of E.remoteAvatars)M.startsWith("npc-")&&O.push(N);if(!l){for(const M of O)M.group.visible=!0;return}O.sort((M,N)=>M.group.position.distanceTo(n.position)-N.group.position.distanceTo(n.position)),O.forEach((M,N)=>{M.group.visible=N<ss})}function h(E){x=E}function R(E){const O=r();if(f+=1,w+=E,w>=.5){const M=f/w;if(i(Math.round(M)),f=0,w=0,u=Math.max(0,u-.5),u===0&&O){if(!l&&M<rs){l=!0,u=10,M<16&&ro("low");const N=window.devicePixelRatio||1;e.setPixelRatio(Math.min(e.getPixelRatio(),Math.max(1,N*.75))),c("원활한 관람을 위해 화질을 잠시 낮췄어요")}else l&&M>is&&(l=!1,u=10,b());if(!l&&M>55){if(d+=1,d>=20){const N=Co();N==="low"?ro(null):N===null&&ro("high");const y=Math.min(2.5,Math.sqrt(De.high/(window.innerWidth*window.innerHeight))),k=e.getPixelRatio();!o.soft&&k<y&&(e.setPixelRatio(Math.min(y,k+.25)),c("화질을 한 단계 높였어요 ✨")),d=0}}else d=0}}m+=E,m>=2&&(m=0,l&&b()),x>0&&(g+=E,g>=x&&(g=0,e.shadowMap.needsUpdate=!0)),!p&&O&&(p=!0,e.shadowMap.needsUpdate=!0)}return{tick:R,setShadowInterval:h}}let Y=null,yt=null,it=null,J=null,Eo=null,ft=null,Ke=null,ra=null,ut=null,dt=null,Mo=null,Zt=null,ie=null;const ys=new tr;let pt={name:"",soft:!1};function vs(t,e){const n=document.createElement("div");n.id="lu-gpu-notice",n.style.cssText=`position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:1200;max-width:min(92vw,600px);background:linear-gradient(180deg,#fffdf8,#f6f1e4);color:#17140f;border:1px solid rgba(95,158,125,0.55);border-radius:14px;padding:14px 44px 14px 18px;box-shadow:0 12px 32px rgba(20,15,8,0.35);font:13px/1.75 ${le()};`;const o="<b>이 브라우저에서 3D 그래픽 기능을 사용할 수 없습니다</b><br>";n.innerHTML=o+'<b>Chrome</b>: 설정 → 시스템(<b>chrome://settings/system</b>) → "그래픽 가속 사용" 켜기 → 다시 시작<br><b>Edge</b>: 설정 → 시스템 및 성능 → "그래픽 가속 사용" 켜기 + "효율 모드" 끄기<br><b>Firefox</b>: 설정 → 일반 → 성능 → "권장 성능 설정" 해제 → "하드웨어 가속 사용" 체크<br>그래도 느리면: 원격 데스크톱 여부 확인 · 그래픽 드라이버 업데이트 · Windows 설정 → 디스플레이 → 그래픽에서 브라우저를 "고성능" GPU로 지정 · 확장프로그램 없는 시크릿 창으로 접속해 비교';const a=document.createElement("button");a.type="button",a.setAttribute("aria-label","닫기"),a.textContent="×",a.style.cssText="position:absolute;top:8px;right:10px;width:26px;height:26px;border:none;background:none;font-size:18px;color:#8a8172;cursor:pointer;",a.addEventListener("click",()=>n.remove());const r=document.createElement("button");r.type="button",r.textContent="진단 정보 복사",r.style.cssText="display:inline-block;margin-top:8px;padding:5px 14px;border-radius:999px;border:1px solid rgba(95,158,125,0.5);background:rgba(95,158,125,0.12);color:#17140f;font:600 11px/1 inherit;cursor:pointer;",r.addEventListener("click",()=>{const i=JSON.stringify({renderer:t,ua:navigator.userAgent,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,cores:navigator.hardwareConcurrency||0,mem:navigator.deviceMemory||0});try{navigator.clipboard.writeText(i),r.textContent="복사됨!"}catch{}}),n.appendChild(r),n.appendChild(a),document.body.appendChild(n)}const ia="lu-onboard-v1";let Lt=-1,Qt=null,To=null,pn=0,io=0;function ks(){try{if(localStorage.getItem(ia))return}catch{}if(!(typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches))return;Lt=0;const t=J.getState();To={x:t.x,z:t.z};const e=document.createElement("style");e.textContent="@keyframes lu-ob-pulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} 70%{transform:translate(-50%,-50%) scale(1.25);opacity:0.2;} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} }",document.head.appendChild(e),Qt=document.createElement("div"),Qt.style.cssText="position:fixed;left:24%;bottom:22%;width:110px;height:110px;border-radius:50%;border:3px solid rgba(255,253,247,0.85);pointer-events:none;z-index:60;transform:translate(-50%,-50%);animation:lu-ob-pulse 1.6s ease-in-out infinite;",document.body.appendChild(Qt),nt("왼쪽 화면을 누른 채 밀면 걸어요 🚶")}function Ss(){if(Lt<0)return;const t=J.getState();if(Lt===0)Math.hypot(t.x-To.x,t.z-To.z)>1.5&&(Lt=1,pn=t.ry,Qt&&(Qt.remove(),Qt=null),nt("잘했어요! 오른쪽 화면을 쓸면 주위를 둘러봐요 👀"));else if(Lt===1){let e=t.ry-pn;e=Math.atan2(Math.sin(e),Math.cos(e)),Math.abs(e)>.6&&(Lt=2,io=0,nt("작품에 다가가면 설명이 나타나요 — 어려우면 [투어] 버튼을 눌러요 🖼️"))}else if(Lt===2&&(io+=1,io>420)){Lt=-1;try{localStorage.setItem(ia,"1")}catch{}}}const fn=new Qa;let so=null,ue=null;function hn(){dt.toggle()}function Cs(t){if(!t)return;ue=ue?Object.assign({},ue,{char:t}):{char:t},dt.rebuildAvatar(t);const e=ft.getMp();e&&typeof e.setChar=="function"&&e.setChar(t),nt("아야모 모습을 바꿨어요 ✨")}const Es=7,ae=new Na,gn=new Rt;let lo=null;function Ms(t){t.addEventListener("pointerdown",e=>{e.isPrimary&&(lo={x:e.clientX,y:e.clientY,t:performance.now()})}),t.addEventListener("pointerup",e=>{const n=lo;lo=null;const o=ft.getMp();if(!n||!e.isPrimary||!rt||!o||performance.now()-n.t>450||Math.hypot(e.clientX-n.x,e.clientY-n.y)>7)return;const a=t.getBoundingClientRect();gn.set((e.clientX-a.left)/a.width*2-1,-((e.clientY-a.top)/a.height)*2+1),ae.setFromCamera(gn,it),ae.far=Es+dt.getSelfCamDist();const r=[...o.remoteAvatars.entries()];if(!r.length)return;const i=r.map(([,u])=>u.group),c=ae.intersectObjects(i,!0);if(c.length){let u=c[0].object;for(;u&&!i.includes(u);)u=u.parent;if(u){const[m]=r[i.indexOf(u)];o.sendHit(m);return}}ae.far=60;const l=ae.intersectObjects(Xa(),!1);l.length&&l[0].object.userData.luArt&&ca(l[0].object.userData.luArt)})}let sa=null,Ze="게스트",rt=!1,Mt=null,Ge=[],We="shared",gt=[],q=null;const bn=.8,Ts=2.2;function la(t,e){const n=J.getState(),o=typeof t.y=="number"?t.y:n.y,a=t.x-n.x,r=o-n.y,i=t.z-n.z,c=Math.hypot(a,r,i),l=mt.clamp(bn+c*.035,bn,Ts);J.disable(),q={fromX:n.x,fromY:n.y,fromZ:n.z,fromRy:n.ry,toX:t.x,toY:o,toZ:t.z,toRy:t.ry,duration:l,elapsed:0,onDone:e||null}}const mn=new zn(0,0,0,"YXZ");function Ls(t){if(!q)return;q.elapsed+=t;const e=Math.min(1,q.elapsed/q.duration),n=es(e),o=q.fromX+(q.toX-q.fromX)*n,a=q.fromY+(q.toY-q.fromY)*n,r=q.fromZ+(q.toZ-q.fromZ)*n,i=os(q.fromRy,q.toRy,n);if(it.position.set(o,a,r),mn.set(0,i,0,"YXZ"),it.quaternion.setFromEuler(mn),e>=1){const c=q.onDone;q=null,c&&c()}}async function zs(){cn(!0),yt=new An,it=new In(55,window.innerWidth/window.innerHeight,.1,1e3),it.position.set(I.spawn.x,Et,I.spawn.z);const t=typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches,e=Co();pt=cs(),console.info("[OpenArtShow] GPU:",pt.name||"(unknown)",pt.soft?"— SOFTWARE RENDERING":"");try{Y=new _n({antialias:!pt.soft,powerPreference:"high-performance"})}catch(p){throw vs(""),p}Ms(Y.domElement);const n=document.createElement("div");n.id="lu-vignette",n.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse 72% 62% at 50% 46%, rgba(8,6,4,0) 50%, rgba(8,6,4,0.03) 62%, rgba(8,6,4,0.09) 72%, rgba(8,6,4,0.17) 82%, rgba(8,6,4,0.26) 91%, rgba(8,6,4,0.34) 100%);",document.body.appendChild(n);const o=window.devicePixelRatio||1;let a;e==="low"?a=Math.min(o,1.25):e==="high"?a=Math.min(Math.max(o,2),2.5):t?a=Math.min(o,2):a=Math.min(Math.max(o,1.5),2);const r=e==="high"?De.high:e==="low"?De.low:De.base;a=Math.min(a,Math.sqrt(r/(window.innerWidth*window.innerHeight))),pt.soft&&(a=Math.min(a,.7),document.documentElement.classList.add("lu-potato")),Y.setPixelRatio(a),Y.setSize(window.innerWidth,window.innerHeight),Y.shadowMap.enabled=!pt.soft,Y.shadowMap.type=Aa,Y.toneMapping=pt.soft?Nn:Ia,Y.toneMappingExposure=.92,Y.outputColorSpace=It,document.body.appendChild(Y.domElement);const i=await Oa(),c=ns(i.theme);Pr(yt,c,{fullLights:!pt.soft&&e!=="low"}),await Ba(),await Da(yt),window.__museum={scene:yt,camera:it,renderer:Y},pt.soft&&(yt.fog=null),Y.shadowMap.autoUpdate=!1,Y.shadowMap.needsUpdate=!0,Mt=i,Yi(Mt.name),_s(),We=i.id??"shared",gt=Ga(We),Ro(gt),Qi({onSubmit:Ps}),Ge=Xe(),$i(Ge,ca),qi({onPrev:Sn,onNext:kn,onExit:yn,onToggleAuto:Is}),Ki({onSelfView:()=>{rt&&!ao()&&hn()},onTour:()=>{rt&&vn()},onViewArtwork:xn,onGuestbook:()=>{rt&&!de()&&ko()},onCapture:()=>{rt&&!ao()&&(un(),wn())}}),J=new Wr(it,Y.domElement);const l=I.floors.find(p=>p.id===I.spawn.floor);J.setPose({x:I.spawn.x,y:(l?l.y:0)+Et,z:I.spawn.z,ry:I.spawn.ry}),Eo=qr({player:J,getSelfAvatar:()=>dt.getSelfAvatar()}),J.disable(),setTimeout(()=>{const p=document.getElementById("lu-topright");p&&(p.style.cursor="pointer",p.title="클릭하면 성능 진단 정보가 복사됩니다",p.addEventListener("click",()=>{const d=JSON.stringify({gpu:pt.name,soft:pt.soft,pixelRatio:Y?Y.getPixelRatio():0,aa:Y?Y.getContext().getContextAttributes().antialias:null,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,inner:window.innerWidth+"x"+window.innerHeight,cores:navigator.hardwareConcurrency||0,spec:Co(),calls:Y?Y.info.render.calls:0,ua:navigator.userAgent});try{navigator.clipboard.writeText(d),nt("진단 정보가 복사됐어요 — 붙여넣어 보내주세요")}catch{console.info("[OpenArtShow diag]",d)}}))},0),Bi({onEnter:Rs,onChatSend:Bs,onAvatarChange:Cs,onMakerToggle:p=>{rt&&(p?J.disable():ut.isTouring()||J.enable())}}),cn(!1),ji(()=>{rt&&!ut.isTouring()&&J.enable()}),ft=xs({getScene:()=>yt,getPlayer:()=>J,setStatus:nt,getGuestbookNotes:()=>gt,onVisitor:(p,d)=>{ie.addVisit(p),ys.add(d&&d.nickname,Mt?Mt.name:"")},onPhoto:p=>{fn.addRemote(p),nt(`${p.name||"누군가"}님이 관람 사진을 남겼어요 📸`)},onChat:(p,d)=>Jn(p,d,!1),onPlayerCount:p=>Xi(p),onRemoteGuestbook:Os,onSelfHit:p=>{nt(p>=3?"아야!! 너무해요 😭":"아야! 누가 때렸어요 😣");const d=dt.getSelfAvatar();d?d.hit(p):Ya(p)},onNpcHit:(p,d,f)=>{Zt&&Zt.onHit(p,d,f)},npcProvider:(p,d)=>{Zt||(Zt=new Fa(Xe()));const f=Zt.update(p,d),w=Zt.takeChat();return w&&ft.getMp().sendNpcChat(w.name,w.text),f}}),Ke=ds({getCamera:()=>it,getRenderer:()=>Y,getMp:()=>ft.getMp(),isEntered:()=>rt,isTouring:()=>ut.isTouring(),viewCurrentArtwork:xn,toggleArtworkList:na,toggleTour:vn,toggleGuestbook:ko,flashShutter:un,capturePhoto:wn,toggleSelfView:hn,tourPrev:Sn,tourNext:kn,exitTour:yn,isLightboxOpen:de,isShareModalOpen:ao,isArtworkListOpen:dn,isGuestbookOpen:ts}),dt=ms({getScene:()=>yt,getCamera:()=>it,getPlayer:()=>J,getSelfInfo:()=>ue,isEntered:()=>rt,createAvatarInstance:Pn,EYE_HEIGHT:Et,setStatus:nt,setDockActive:sn}),ra=gs({getRenderer:()=>Y,getScene:()=>yt,getCamera:()=>it,isThirdPerson:()=>dt.isThirdPerson(),getSelfAvatar:()=>dt.getSelfAvatar(),applySelfCamOffset:()=>dt.applySelfCamOffset(),restoreSelfCamOffset:()=>dt.restoreSelfCamOffset(),getGalleryInfo:()=>Mt,photoWall:fn,getMyNickname:()=>Ze,getMp:()=>ft.getMp(),showShareModal:Zi,setStatus:nt}),ut=bs({getPlacedArtworks:()=>Ge,getPlayer:()=>J,isEntered:()=>rt,getTween:()=>q,clearTween:()=>{q=null},startTween:la,getViewingPose:Bn,showTourBar:Wi,hideTourBar:Vi,setDockActive:sn,isLightboxOpen:de,isArtworkListOpen:dn,hideArtworkList:ge}),Mo=ws({renderer:Y,camera:it,gpuInfo:pt,getMp:()=>ft.getMp(),isEntered:()=>rt,setFPS:Fi,setStatus:nt}),Mo.setShadowInterval(c==="cycle"?2:0),window.addEventListener("resize",Gs),window.addEventListener("keydown",As),sa=new Ra,Y.setAnimationLoop(Ds)}function _s(){fetch("./galleries/index.json").then(t=>{if(!t.ok)throw new Error(`HTTP ${t.status}`);return t.json()}).then(t=>{if(!Array.isArray(t))return;const e=Mt?Mt.id:null;Ui(t,e,n=>{window.location.href="./index.html?g="+n})}).catch(()=>{})}let _e=null;function Ns(){if(!rt)return;const t=it.position.y-Et;let e=null;for(const n of I.floors)t>=n.y-.9&&(e===null||n.y>e.y)&&(e=n);if(e){if(_e===null){_e=e.id;return}e.id!==_e&&(_e=e.id,nt(e.name))}}function xn(){if(!rt||de())return;const t=ut.isTouring()?Ge[ut.getIndex()]:On(it.position);t&&(oa(t),J.disable())}function wn(){ra.capturePhoto()}function As(t){Ke.onKeyDown(t)}function ca(t){if(!t||!rt)return;const e=Bn(t),n=ut.isTouring();n&&ut.syncOnSelect(t),la(e,()=>{J.setPose(e),n?ut.onArrive(t):rt&&!de()&&J.enable()})}function yn(){ut.exitTour()}function vn(){ut.toggleTour()}function kn(){ut.next()}function Sn(){ut.prev()}function Is(){ut.toggleAuto()}function Rs({nickname:t,color:e,char:n}){Ze=t,ue={nickname:t,color:e,char:n},rt=!0,Di(),J.enable(),Dr(),ks();const o=Mt&&Mt.id||"link-"+as(window.location.hash||"");if(!ft.connect({nickname:t,color:e,char:n,roomId:`${Ha}-${o}`})){nt("멀티플레이어 연결에 실패했습니다. 혼자 관람 모드로 진행합니다.");return}ie=new ei(o),so&&clearInterval(so),so=setInterval(()=>{const r=ft.getMp();if(!r||!ie)return;const i=[];for(const[c,l]of r.remoteAvatars)c.startsWith("npc-")||i.push({x:l.group.position.x,z:l.group.position.z});ie.addDwell(i,Xe(),2),Ji(ie.summary(gt.length))},2e3)}function Ps(t){if(!t)return;const e=Ua(Ze,t);gt=Dn(gt,[e]),Gn(We,gt),Ro(gt);const n=ft.getMp();if(n)try{n.sendGuestbook([e])}catch(o){console.error("방명록 전송 실패:",o)}}function Os(t){gt=Dn(gt,t),Gn(We,gt),Ro(gt)}function Bs(t){if(!t)return;Jn(Ze,t,!0);const e=ft.getMp();if(e)try{e.sendChat(t)}catch(n){console.error("채팅 전송 실패:",n),nt("채팅 전송에 실패했습니다.")}}let Ne=0;function Ds(){let t=sa.getDelta();if(pt.soft){if(Ne+=t,Ne<.034)return;t=Ne,Ne=0}try{Eo&&Eo.update(t),J.update(t);const e=ft.getMp();e&&J.resolveBodyCollisions(e.getAvatarPositions()),Ls(t),ut.tick(t),Rr(t),Ns(),ft.tick(t),Ss(),dt.tick(t);const n=On(it.position);n?Gi(n):Hi(),Mo.tick(t),dt.isThirdPerson()&&dt.getSelfAvatar()?(dt.applySelfCamOffset(),Y.render(yt,it),dt.restoreSelfCamOffset()):Y.render(yt,it)}catch(e){console.error("렌더 루프 오류:",e),Y.setAnimationLoop(null),nt("오류가 발생했습니다. 페이지를 새로고침해 주세요.")}}function Gs(){Ke.onWindowResize()}window.addEventListener("beforeunload",()=>{Ke?.onBeforeUnload()});zs().catch(t=>{console.error("초기화 실패:",t);try{nt("초기화 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.")}catch{document.body.insertAdjacentHTML("beforeend",`<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-family:${le()};font-size:16px;text-align:center;">초기화 중 오류가 발생했습니다.<br>페이지를 새로고침해 주세요.</div>`)}});const da=0,ua=7.5,Hs=0,Ae=3.3,Pt=3.5,kt=.18,Ie=.2,Xs=7530209,Fs=3.6,Ys=1.15,Us="ontouchstart"in window||(navigator.maxTouchPoints||0)>0;function js(){const t=document.createElement("canvas");t.width=t.height=512;const e=t.getContext("2d");let n=20935;const o=()=>{n|=0,n=n+1831565813|0;let l=Math.imul(n^n>>>15,1|n);return l=l+Math.imul(l^l>>>7,61|l)^l,((l^l>>>14)>>>0)/4294967296},a=e.createLinearGradient(0,0,0,512);a.addColorStop(0,"#070a16"),a.addColorStop(.55,"#111a34"),a.addColorStop(1,"#1b2748"),e.fillStyle=a,e.fillRect(0,0,512,512);for(let l=0;l<140;l++){const u=o()*512,m=o()*310,x=o()<.08;e.fillStyle=`rgba(235,240,255,${(.28+o()*.6).toFixed(2)})`,e.fillRect(u,m,x?2:1,x?2:1)}const r=e.createRadialGradient(398,88,0,398,88,36);r.addColorStop(0,"rgba(236,239,232,0.9)"),r.addColorStop(.5,"rgba(226,232,224,0.42)"),r.addColorStop(1,"rgba(226,232,224,0)"),e.fillStyle=r,e.beginPath(),e.arc(398,88,36,0,7),e.fill(),e.fillStyle="rgba(240,243,236,0.95)",e.beginPath(),e.arc(398,88,15,0,7),e.fill();let i=0;for(;i<512;){const l=26+o()*48,u=130+o()*250,m=512-u;e.fillStyle=`rgb(${10+(o()*8|0)},${16+(o()*10|0)},${34+(o()*14|0)})`,e.fillRect(i,m,l,u);for(let x=m+12;x<506;x+=15)for(let g=i+6;g<i+l-6;g+=12)o()<.52||(e.fillStyle=o()<.72?"rgba(120,220,225,0.85)":"rgba(255,207,138,0.85)",e.fillRect(g,x,4,6));i+=l+2+o()*8}const c=new pe(t);return c.colorSpace=It,c}function $s(){const t=document.createElement("canvas");t.width=512,t.height=160;const e=t.getContext("2d");e.clearRect(0,0,512,160),e.font='700 92px "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif',e.textAlign="center",e.textBaseline="middle",e.shadowColor="rgba(114,230,225,0.95)",e.shadowBlur=30,e.fillStyle="rgba(175,244,240,0.96)",e.fillText("오픈월드",256,86),e.shadowBlur=0,e.fillStyle="rgba(224,252,250,0.92)",e.fillText("오픈월드",256,86);const n=new pe(t);return n.colorSpace=It,n}function Ws(){const t=new Wt,e=[new W(Ae,kt,Ie).translate(0,kt/2,0),new W(Ae,kt,Ie).translate(0,Pt-kt/2,0),new W(kt,Pt,Ie).translate(-3.1199999999999997/2,Pt/2,0),new W(kt,Pt,Ie).translate((Ae-kt)/2,Pt/2,0)],n=Pe(e);e.forEach(i=>i.dispose());const o=new lt({color:736570,emissive:Xs,emissiveIntensity:1.5,roughness:.4,metalness:.1});t.add(new H(n,o));const a=new H(new Q(Ae-2*kt,Pt-2*kt),new Xt({map:js(),toneMapped:!1}));a.position.set(0,Pt/2,.11),a.rotation.y=Math.PI,t.add(a);const r=new H(new Q(2.4,.75),new Xt({map:$s(),transparent:!0,toneMapped:!1,depthWrite:!1,side:he}));return r.rotation.x=Math.PI/2,r.scale.x=-1,r.position.set(0,.02,-1),t.add(r),t.position.set(da,Hs,ua),t.userData={frameMat:o,label:r},t}let Bt=null,Re=null,vt=null,se=!1,Lo=!1,pa=0,fa=0;function Vs(){vt||(vt=document.createElement("div"),vt.id="portal-hint",vt.textContent=Us?"탭하여 오픈월드로 이동 →":"클릭하거나 다가가면 오픈월드로 이동 →",vt.style.cssText='position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:40;padding:9px 16px;border-radius:999px;background:rgba(11,30,29,0.82);color:#c9fbf8;font:600 13px/1 "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;letter-spacing:-.01em;border:1px solid rgba(114,230,225,0.5);box-shadow:0 6px 20px -6px rgba(0,0,0,0.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap',document.body.appendChild(vt))}function ha(){Lo||(Lo=!0,vt&&(vt.style.opacity="0"),location.href="world.html")}function ga(){if(requestAnimationFrame(ga),!Bt){if(Bt=window.__museum||null,!Bt)return;Re=Ws(),Bt.scene.add(Re),Vs()}const t=performance.now()/1e3,e=1.3+Math.sin(t*2.2)*.35;Re.userData.frameMat.emissiveIntensity=e,Re.userData.label.material.opacity=.78+Math.sin(t*2.2)*.2;const n=Bt.camera,o=Math.hypot(n.position.x-da,n.position.z-ua),a=se;se=o<Fs,se!==a&&vt&&(vt.style.opacity=se?"1":"0"),o<Ys&&ha()}requestAnimationFrame(ga);addEventListener("pointerdown",t=>{pa=t.clientX,fa=t.clientY},!0);addEventListener("pointerup",t=>{!se||Lo||!Bt||t.target===Bt.renderer.domElement&&(Math.hypot(t.clientX-pa,t.clientY-fa)>8||ha())},!0);
