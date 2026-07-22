/* empty css              */import{e as $t,M as B,d as ot,i as V,k as dt,G as Qt,T as $a,l as Co,m as se,n as Fn,h as Ot,o as Wa,p as Yn,q as Se,r as Va,s as Le,F as uo,t as Te,L as Ka,u as qe,B as an,v as Za,O as qa,H as Un,D as ae,w as Ja,S as Bt,x as ye,f as jn,y as $n,E as Wn,z as wt,W as Vn,I as Qa,N as Kn,a as Zn,b as qn,J as tr,V as Jn,R as er,P as or,A as nr,Q as ar,C as rr}from"./vendor-three-enYtijzV.js";import{B as M,b as Mo,a as Qn,E as Mt,R as ze,c as $o,A as Lo,g as Je,d as xe,e as ir,f as sr,h as lr,l as cr,i as ta,M as dr,P as ur,p as pr,N as fr,m as ea,s as oa,j as hr,k as na,n as gr}from"./npc-DwjC32ux.js";import{g as br,c as aa,a as mr,b as To,m as $e,d as rn,e as xr,f as wr,T as Xt,h as Qe,i as yr,j as vr,r as kr,k as ra,l as ia,C as Sr}from"./scene-textures-DhUb9KjO.js";import{V as Er,P as Cr}from"./feed-Cm56rHm1.js";import{n as po,D as We,C as Mr,a as Lr,S as sn,c as ln,e as zo,d as Tr,f as zr,g as _r,h as Nr,i as Ir,j as Ar,E as Rr,k as Pr,H as cn,l as Br,m as Or,o as Dr,p as fo,q as Gr,r as Hr}from"./chibi-builder-0e8j20Jr.js";import{g as At,o as sa,P as _e,l as Xr,M as Fr,a as Yr}from"./auth-aZ7HCW1S.js";function dn(t,e){let o=[t];for(const n of e){const a=[];for(const r of o){if(n.x1<=r.x0||n.x0>=r.x1||n.z1<=r.z0||n.z0>=r.z1){a.push(r);continue}const i=Math.max(r.x0,n.x0),l=Math.min(r.x1,n.x1),c=Math.max(r.z0,n.z0),d=Math.min(r.z1,n.z1);r.z0<c&&a.push({x0:r.x0,x1:r.x1,z0:r.z0,z1:c}),d<r.z1&&a.push({x0:r.x0,x1:r.x1,z0:d,z1:r.z1}),r.x0<i&&a.push({x0:r.x0,x1:i,z0:c,z1:d}),l<r.x1&&a.push({x0:l,x1:r.x1,z0:c,z1:d})}o=a}return o.filter(n=>n.x1-n.x0>.01&&n.z1-n.z0>.01)}function xt(t){return M.floors.find(e=>e.id===t)}function Ur(t,e){const o=aa(),n=16/50,a=t.x1-t.x0,r=t.z1-t.z0,i=o.map.clone(),l=o.normalMap.clone();for(const c of[i,l])c.needsUpdate=!0,c.repeat.set(n*a,n*r),c.offset.set((t.x0-M.minX)*n%1,(t.z0-M.minZ)*n%1);return new dt({map:i,normalMap:l,normalScale:new Ot(.7,.7),color:e,roughness:.4,metalness:0})}function _t(t,e,o){const n=mr(),a=n.map.clone(),r=n.normalMap.clone();for(const i of[a,r])i.needsUpdate=!0,i.repeat.set(t,e);return new dt({map:a,normalMap:r,normalScale:new Ot(.55,.55),color:o||16777215,roughness:.9,metalness:0})}function la(){return new dt({map:To().map,normalMap:To().normalMap,normalScale:new Ot(.35,.35),color:16777215,roughness:.92,metalness:0})}const ve=()=>new dt({color:2499615,roughness:.4,metalness:.75});function vt(t,e,o,n,a,r){const i=ve(),l=new Yn({color:14214376,transparent:!0,opacity:.22,roughness:.08,side:Se,depthWrite:!1}),c=Math.hypot(n-e,a-o),d=Math.atan2(n-e,a-o),g=(e+n)/2,u=(o+a)/2,p=new Qt,y=new B(new se(.03,.03,c,10),i);y.rotation.x=Math.PI/2,y.position.y=1.05,p.add(y);const x=Math.max(2,Math.round(c/1.2)+1);for(let v=0;v<x;v++){const h=x===1?.5:v/(x-1),f=new B(new V(.045,1.05,.045),i);f.position.set(0,.525,-c/2+h*c),p.add(f)}const m=new B(new ot(c,.85),l);m.rotation.y=Math.PI/2,m.position.y=.55,p.add(m),p.rotation.y=d,p.position.set(g,r,u),p.traverse(v=>{v.isMesh&&(v.castShadow=!0)}),t.add(p)}function jr(t,e){const o=_t(1.2,2.4),n=e.yTo-e.yFrom,a=e.z1-e.z0,r=24,i=n/r,l=a/r,c=e.x1-e.x0,d=(e.x0+e.x1)/2;for(let y=0;y<r;y++){const x=e.yFrom+(y+1)*i,m=x-e.yFrom+.25,v=new B(new V(c,m,l),o);v.position.set(d,x-m/2,e.z0+(y+.5)*l),v.castShadow=!0,v.receiveShadow=!0,t.add(v)}const g=ve(),u=Math.hypot(a,n),p=Math.atan2(n,a);for(const y of[e.x0+.06,e.x1-.06]){const x=new B(new se(.03,.03,u,10),g);x.rotation.x=Math.PI/2-p,x.position.set(y,(e.yFrom+e.yTo)/2+.95,(e.z0+e.z1)/2),x.castShadow=!0,t.add(x);for(const m of[.08,.5,.92]){const v=e.yFrom+n*m,h=new B(new V(.045,.95,.045),g);h.position.set(y,v+.475,e.z0+a*m),h.castShadow=!0,t.add(h)}}}function $r(t,e,o,n,a,r,i){const l=e+M.clearH,c=.32,d=.14,g=1.1,u=_t(2,.4,13617599),p=new dt({color:3486253,normalMap:To().normalMap,normalScale:new Ot(.25,.25),roughness:.95}),y=new dt({color:1710102,roughness:.5,metalness:.6}),x=new dt({color:16774880,emissive:a.downlight.emissive,emissiveIntensity:2.5*(a.downlight.intensity/22),roughness:1}),m=[],v=[],h=[];for(const f of o){const O=f.x1-f.x0,T=f.z1-f.z0,H=new B(new ot(O,T),p);H.rotation.x=Math.PI/2,H.position.set((f.x0+f.x1)/2,l+c,(f.z0+f.z1)/2),t.add(H);const I=Math.ceil((f.z0-M.minZ)/g);for(let w=I;;w++){const S=M.minZ+w*g;if(S>f.z1-.05)break;if(S<f.z0+.05)continue;const z=new V(O,c,d);z.translate((f.x0+f.x1)/2,l+c/2,S),m.push(z)}const Y=Math.ceil((f.x0-M.minX)/g);for(let w=Y;;w++){const S=M.minX+w*g;if(S>f.x1-.05)break;if(S<f.x0+.05)continue;const z=new V(d,c,T);z.translate(S,l+c/2,(f.z0+f.z1)/2),m.push(z)}for(let w=Y;;w++){const S=M.minX+w*g+g/2;if(S>f.x1-.2)break;if(!(S<f.x0+.2))for(let z=I;;z++){const N=M.minZ+z*g+g/2;if(N>f.z1-.2)break;if(N<f.z0+.2||(w*7+z*5)%3!==0)continue;const E=new se(.07,.08,.1,12);E.translate(S,l+c-.06,N),v.push(E);const D=new se(.055,.055,.02,12);D.translate(S,l+c-.12,N),h.push(D)}}}if(m.length){const f=new B($e(m),u);f.castShadow=!0,t.add(f)}if(v.length&&t.add(new B($e(v),y)),h.length&&t.add(new B($e(h),x)),i)for(const[f,O]of r){const T=new Wa(a.downlight.color,a.downlight.intensity*.7,9,2);T.position.set(f,l-.15,O),t.add(T),n.push(T)}return x}function Wr(t){const e=new Yn({color:14478578,transparent:!0,opacity:.1,roughness:.05,side:Se,depthWrite:!1}),o=ve(),n=M.maxZ,a=M.maxX-M.minX,r=xt("f1"),i=xt("f2"),l=M.clearH;for(const[m,v]of[[M.minX,-1.5],[1.5,M.maxX]]){const h=v-m,f=new B(new ot(h,l),e);f.position.set((m+v)/2,r.y+l/2,n),f.rotation.y=Math.PI,t.add(f)}for(let m=M.minX;m<=M.maxX+.01;m+=2.2){if(m>-1.5&&m<1.5)continue;const v=new B(new V(.12,l,.12),o);v.position.set(m,r.y+l/2,n),v.castShadow=!0,t.add(v)}for(const m of[-1.5,1.5]){const v=new B(new V(.18,l,.18),o);v.position.set(m,r.y+l/2,n),v.castShadow=!0,t.add(v)}const c=new B(new V(a,.14,.16),o);c.position.set(0,r.y+l-.07,n),t.add(c);const d=la(),g=new B(new V(a,1.2,M.wallT),d);g.position.set(0,i.y+.6,n),g.castShadow=!0,g.receiveShadow=!0,t.add(g);const u=new B(new V(a,M.clearH-2.6+.6,M.wallT),d);u.position.set(0,i.y+2.6+(M.clearH-2.6+.6)/2,n),u.castShadow=!0,u.receiveShadow=!0,t.add(u);const p=new B(new ot(a,1.4),e);p.position.set(0,i.y+1.9,n),p.rotation.y=Math.PI,t.add(p);for(let m=M.minX;m<=M.maxX+.01;m+=2.2){const v=new B(new V(.08,1.4,.08),o);v.position.set(m,i.y+1.9,n),t.add(v)}const y=xt("b1"),x=new B(new V(a+.6,M.storyH,M.wallT),_t(4,1));x.position.set(0,y.y+M.storyH/2,n),t.add(x)}function Vr(t,e,o){const n=M,a=n.maxX-n.minX,r=n.maxZ-n.minZ,i={x0:n.minX,x1:n.maxX,z0:n.minZ,z1:n.maxZ},l=[];let c=null;const d=["b1","f1","f2"];for(const _ of n.floors){const R=n.slabHoles[_.id]||[],U=dn(i,R);for(const j of U){const J=j.x1-j.x0,W=j.z1-j.z0,q=new B(new V(J,n.slabT,W),_t(J/6,W/6));q.position.set((j.x0+j.x1)/2,_.y-n.slabT/2,(j.z0+j.z1)/2),q.castShadow=!0,q.receiveShadow=!0,t.add(q);const Q=new B(new ot(J,W),Ur(j,_.id==="b1"?10127472:_.id==="roof"?13482132:16777215));Q.rotation.x=-Math.PI/2,Q.position.set((j.x0+j.x1)/2,_.y+.002,(j.z0+j.z1)/2),Q.receiveShadow=!0,t.add(Q)}}const g={b1:[[-6,-3],[0,-3],[6,-3],[0,3]],f1:[[-7,-4],[0,-4],[7,-4],[-7,4],[0,4],[7,4]],f2:[[-7,-4.5],[0,-4.5],[7,-4.5],[-7,5],[7,5]]},u={b1:"f1",f1:"f2",f2:"roof"};for(const _ of d){const R=xt(_),U=n.slabHoles[u[_]]||[],j=dn(i,U),J=$r(t,R.y,j,l,e,g[_],o);c||(c=J)}const p=_t(3,2),y=xt("roof").y-xt("b1").y,x=xt("b1").y+y/2,m=new B(new V(a+n.wallT*2,y,n.wallT),p);m.position.set(0,x,n.minZ-n.wallT/2),m.castShadow=!0,m.receiveShadow=!0,t.add(m);for(const[_,R]of[[n.minX-n.wallT/2,1],[n.maxX+n.wallT/2,1]]){const U=new B(new V(n.wallT,y,r),p);U.position.set(_,x,0),U.castShadow=!0,U.receiveShadow=!0,t.add(U)}for(const _ of d){const R=xt(_),U=la(),j=[{w:a,h:M.clearH,x:0,z:n.minZ+.02,ry:0},{w:r,h:M.clearH,x:n.maxX-.02,z:0,ry:-Math.PI/2},{w:r,h:M.clearH,x:n.minX+.02,z:0,ry:Math.PI/2}];for(const J of j){const W=new B(new ot(J.w,J.h),U);W.position.set(J.x,R.y+M.clearH/2,J.z),W.rotation.y=J.ry,W.receiveShadow=!0,t.add(W)}}Wr(t);for(const _ of n.stairs)jr(t,_);const v=xt("f1").y,h=xt("f2").y,f=xt("roof").y;vt(t,-8.7,-7,-8.7,-1,v),vt(t,-10.7,-7,-8.7,-7,v),vt(t,-8.7,1,-8.7,7,h),vt(t,-10.7,1,-8.7,1,h),vt(t,-4,-3,5,-3,h),vt(t,-4,3,5,3,h),vt(t,-4,-3,-4,3,h),vt(t,5,-3,5,3,h),vt(t,8.7,1,8.7,7,f),vt(t,8.7,1,10.7,1,f);const O=_t(4,.5),T=1.1,H=.25,I=[{w:a+.6,d:H,x:0,z:n.minZ-H/2},{w:a+.6,d:H,x:0,z:n.maxZ+H/2},{w:H,d:r,x:n.minX-H/2,z:0},{w:H,d:r,x:n.maxX+H/2,z:0}];for(const _ of I){const R=new B(new V(_.w,T,_.d),O);R.position.set(_.x,f+T/2,_.z),R.castShadow=!0,R.receiveShadow=!0,t.add(R)}const Y=new dt({map:aa().map,color:12163695,roughness:.6});for(const[_,R]of[[-4,4],[2,-4]]){const U=new B(new V(2.2,.09,.55),Y);U.position.set(_,f+.45,R),U.castShadow=!0,t.add(U);for(const j of[-.9,.9]){const J=new B(new V(.08,.42,.5),ve());J.position.set(_+j,f+.21,R),t.add(J)}}const w=new dt({color:5194806,roughness:.45,metalness:.65}),S=new Qt,z=new B(new $a(1.3,.42,14,28,Math.PI),w);z.castShadow=!0,S.add(z);const N=new B(new Co(.55,18,14),w);N.scale.set(1.5,.75,1),N.position.set(1.1,-.95,.2),N.castShadow=!0,S.add(N),S.position.set(-2,f+1.35,.5),S.rotation.y=-.6,t.add(S);const E=new B(new se(1.9,1.9,.12,24),_t(1,1,14209994));E.position.set(-2,f+.06,.5),E.receiveShadow=!0,t.add(E);const D=new B(new V(2.8,.18,7.2),_t(1,2));D.position.set(9.7,f+2.6,4),D.castShadow=!0,t.add(D);for(const[_,R]of[[8.85,.8],[10.55,.8],[8.85,7.2],[10.55,7.2]]){const U=new B(new V(.12,2.6,.12),ve());U.position.set(_,f+1.3,R),t.add(U)}let L=null;return o||(L=new Fn(e.downlight.color,e.downlight.intensity*.022),t.add(L)),{downlights:{lights:l,warm:L,bulbMat:c}}}function Kr(t){const{minX:e,maxX:o,minZ:n,maxZ:a,wallT:r}=M,i=.55,l=e+r/2,c=o-r/2,d=n+r/2,g=a-r/2,u=new $t({map:br(),transparent:!0,depthWrite:!1});for(const p of M.floors){if(p.id==="roof")continue;const y=p.y+.018,x=[[c-l,(l+c)/2,d+i/2,Math.PI],[c-l,(l+c)/2,g-i/2,0],[g-d,l+i/2,(d+g)/2,-Math.PI/2],[g-d,c-i/2,(d+g)/2,Math.PI/2]];for(const[m,v,h,f]of x){const O=new B(new ot(m,i),u);O.rotation.x=-Math.PI/2,O.rotation.z=f,O.position.set(v,y,h),O.renderOrder=1,t.add(O)}}}class Zr extends Va{constructor(e){super(e),this.type=Le}parse(e){const i=function(w,S){switch(w){case 1:throw new Error("THREE.RGBELoader: Read Error: "+(S||""));case 2:throw new Error("THREE.RGBELoader: Write Error: "+(S||""));case 3:throw new Error("THREE.RGBELoader: Bad File Format: "+(S||""));default:case 4:throw new Error("THREE.RGBELoader: Memory Error: "+(S||""))}},g=`
`,u=function(w,S,z){S=S||1024;let E=w.pos,D=-1,L=0,_="",R=String.fromCharCode.apply(null,new Uint16Array(w.subarray(E,E+128)));for(;0>(D=R.indexOf(g))&&L<S&&E<w.byteLength;)_+=R,L+=R.length,E+=128,R+=String.fromCharCode.apply(null,new Uint16Array(w.subarray(E,E+128)));return-1<D?(w.pos+=L+D+1,_+R.slice(0,D)):!1},p=function(w){const S=/^#\?(\S+)/,z=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,N=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,E=/^\s*FORMAT=(\S+)\s*$/,D=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,L={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0};let _,R;for((w.pos>=w.byteLength||!(_=u(w)))&&i(1,"no header found"),(R=_.match(S))||i(3,"bad initial token"),L.valid|=1,L.programtype=R[1],L.string+=_+`
`;_=u(w),_!==!1;){if(L.string+=_+`
`,_.charAt(0)==="#"){L.comments+=_+`
`;continue}if((R=_.match(z))&&(L.gamma=parseFloat(R[1])),(R=_.match(N))&&(L.exposure=parseFloat(R[1])),(R=_.match(E))&&(L.valid|=2,L.format=R[1]),(R=_.match(D))&&(L.valid|=4,L.height=parseInt(R[1],10),L.width=parseInt(R[2],10)),L.valid&2&&L.valid&4)break}return L.valid&2||i(3,"missing format specifier"),L.valid&4||i(3,"missing image size specifier"),L},y=function(w,S,z){const N=S;if(N<8||N>32767||w[0]!==2||w[1]!==2||w[2]&128)return new Uint8Array(w);N!==(w[2]<<8|w[3])&&i(3,"wrong scanline width");const E=new Uint8Array(4*S*z);E.length||i(4,"unable to allocate buffer space");let D=0,L=0;const _=4*N,R=new Uint8Array(4),U=new Uint8Array(_);let j=z;for(;j>0&&L<w.byteLength;){L+4>w.byteLength&&i(1),R[0]=w[L++],R[1]=w[L++],R[2]=w[L++],R[3]=w[L++],(R[0]!=2||R[1]!=2||(R[2]<<8|R[3])!=N)&&i(3,"bad rgbe scanline format");let J=0,W;for(;J<_&&L<w.byteLength;){W=w[L++];const Q=W>128;if(Q&&(W-=128),(W===0||J+W>_)&&i(3,"bad scanline data"),Q){const it=w[L++];for(let Ce=0;Ce<W;Ce++)U[J++]=it}else U.set(w.subarray(L,L+W),J),J+=W,L+=W}const q=N;for(let Q=0;Q<q;Q++){let it=0;E[D]=U[Q+it],it+=N,E[D+1]=U[Q+it],it+=N,E[D+2]=U[Q+it],it+=N,E[D+3]=U[Q+it],D+=4}j--}return E},x=function(w,S,z,N){const E=w[S+3],D=Math.pow(2,E-128)/255;z[N+0]=w[S+0]*D,z[N+1]=w[S+1]*D,z[N+2]=w[S+2]*D,z[N+3]=1},m=function(w,S,z,N){const E=w[S+3],D=Math.pow(2,E-128)/255;z[N+0]=Te.toHalfFloat(Math.min(w[S+0]*D,65504)),z[N+1]=Te.toHalfFloat(Math.min(w[S+1]*D,65504)),z[N+2]=Te.toHalfFloat(Math.min(w[S+2]*D,65504)),z[N+3]=Te.toHalfFloat(1)},v=new Uint8Array(e);v.pos=0;const h=p(v),f=h.width,O=h.height,T=y(v.subarray(v.pos),f,O);let H,I,Y;switch(this.type){case uo:Y=T.length/4;const w=new Float32Array(Y*4);for(let z=0;z<Y;z++)x(T,z*4,w,z*4);H=w,I=uo;break;case Le:Y=T.length/4;const S=new Uint16Array(Y*4);for(let z=0;z<Y;z++)m(T,z*4,S,z*4);H=S,I=Le;break;default:throw new Error("THREE.RGBELoader: Unsupported type: "+this.type)}return{width:f,height:O,data:H,header:h.string,gamma:h.gamma,exposure:h.exposure,type:I}}setDataType(e){return this.type=e,this}load(e,o,n,a){function r(i,l){switch(i.type){case uo:case Le:i.colorSpace=Ka,i.minFilter=qe,i.magFilter=qe,i.generateMipmaps=!1,i.flipY=!0;break}o&&o(i,l)}return super.load(e,r,n,a)}}const Wo=[];function un(t){const o=document.createElement("canvas");o.width=1024,o.height=1024;const n=o.getContext("2d"),a=n.createLinearGradient(0,0,0,1024);for(const[d,g]of t.stops)a.addColorStop(d,g);if(n.fillStyle=a,n.fillRect(0,0,1024,1024),t.stars>0){const d=Qe(90210);for(let g=0;g<t.stars;g++){const u=d()*1024,p=d()*1024*.82,y=.4+d()*1.6,x=.35+d()*.65;if(d()>.965){const m=n.createRadialGradient(u,p,0,u,p,y*5);m.addColorStop(0,`rgba(255, 255, 255, ${x*.5})`),m.addColorStop(1,"rgba(255,255,255,0)"),n.fillStyle=m,n.beginPath(),n.arc(u,p,y*5,0,Math.PI*2),n.fill()}n.fillStyle=`rgba(255, 255, 255, ${x})`,n.beginPath(),n.arc(u,p,y,0,Math.PI*2),n.fill()}}const r=Qe(13579),[i,l]=t.cloudAlpha;for(let d=0;d<t.cloudCount;d++){const g=r()*1024,u=1024*(.3+r()*.45),p=30+r()*90;for(let y=0;y<7;y++){const x=g+(r()-.5)*p*2.4,m=u+(r()-.5)*p*.7,v=p*(.35+r()*.5),h=n.createRadialGradient(x,m,0,x,m,v);h.addColorStop(0,`rgba(${t.cloudColor}, ${i+r()*(l-i)})`),h.addColorStop(1,`rgba(${t.cloudColor}, 0)`),n.fillStyle=h,n.beginPath(),n.arc(x,m,v,0,Math.PI*2),n.fill()}}const c=new ye(o);return c.colorSpace=Bt,c}const qr={daylight:"./assets/sky/day.hdr",sunset:"./assets/sky/sunset.hdr",night:"./assets/sky/night.jpg"};function Ne(t,e){const o=qr[e],n=r=>{r.minFilter=qe,r.magFilter=qe,t.map=r,t.needsUpdate=!0},a=()=>{};o.endsWith(".hdr")?new Zr().load(o,n,void 0,a):new Ja().load(o,r=>{r.colorSpace=Bt,n(r)},void 0,a)}function Jr(t,e,o){if(o){const r=(d,g)=>new B(new Co(g,32,16),new $t({map:un(d),side:an,fog:!1,transparent:!0,depthWrite:!1,opacity:0})),i=r(Xt.night.sky,450),l=r(Xt.sunset.sky,448),c=r(Xt.daylight.sky,446);for(const d of[i,l,c])d.position.y=-70;return i.renderOrder=-3,l.renderOrder=-2,c.renderOrder=-1,t.add(i,l,c),Ne(c.material,"daylight"),Ne(l.material,"sunset"),Ne(i.material,"night"),{daylight:c,sunset:l,night:i}}const n=e===Xt.sunset?"sunset":e===Xt.night?"night":"daylight",a=new B(new Co(450,32,16),new $t({map:un(e.sky),side:an,fog:!1}));return a.position.y=-70,t.add(a),Ne(a.material,n),null}function Qr(t,e){const o=new B(new ot(800,800),new dt({map:rn().map,normalMap:rn().normalMap,normalScale:new Ot(.6,.6),color:e.grassTint,roughness:.95,metalness:0}));o.rotation.x=-Math.PI/2,o.position.y=-.03,o.receiveShadow=!0,t.add(o);const n=new B(new ot(400,900),new dt({color:e.sea.color,roughness:e.sea.roughness,metalness:e.sea.metalness}));n.rotation.x=-Math.PI/2,n.position.set(290,-.02,0),t.add(n);const a=new B(new ot(8,900),new dt({color:13220758,roughness:.9}));a.rotation.x=-Math.PI/2,a.position.set(88,-.025,0),t.add(a);const r=Qe(97531),i=new Qt;let l=4e4;function c(y,x,m){l+=733;const v=Mo(l,{trunkLen:2.6*m,trunkRad:.24*m,maxLevel:2,leafScale:.95*m});v.position.set(y,0,x),v.rotation.y=r()*Math.PI*2,i.add(v)}[[-12,30,1],[4,31,1.15],[12,34,.9],[34,-18,1.1],[36,14,.95]].forEach(([y,x,m],v)=>{const h=Mo(6e4+v*137,{trunkLen:3.2*m,trunkRad:.32*m,maxLevel:2,leafScale:1.1*m});h.position.set(y+(r()-.5)*2,0,x+(r()-.5)*2),h.rotation.y=r()*Math.PI*2,i.add(h)});const g=[[-20,33],[-4,35],[20,30],[-16,42],[-6,45],[6,43],[16,46],[0,52],[-24,50],[24,48]];for(const[y,x]of g)c(y+(r()-.5)*3,x+(r()-.5)*3,1+r()*.9);const u=[[40,-10],[44,22],[52,-18],[60,8],[48,-2]];for(const[y,x]of u)c(y+(r()-.5)*3,x+(r()-.5)*3,.9+r()*.8);const p=[[-35,-30],[-45,0],[-38,20],[-30,40],[20,-40],[-10,-38]];for(const[y,x]of p)c(y+(r()-.5)*4,x+(r()-.5)*4,1.1+r()*1);for(const y of Qn(i))t.add(y);return{seaMat:n.material}}function ti(t,e){const o=Mo(31415,{trunkLen:4.6,trunkRad:.42,maxLevel:3,leafScale:1.4});o.position.set(7,0,14);for(const r of Qn(o))t.add(r);const n=new B(new se(.42,.72,.45,9),new dt({map:wr(),normalMap:xr(),normalScale:new Ot(.9,.9),roughness:.95}));n.position.set(7,.22,14),n.castShadow=!0,t.add(n);const a=[];if(e.treeUplights)for(const[r,i]of[[5.6,13],[8.4,15]]){const l=new Za(16756838,150,15,Math.PI/5,.9,1.8);l.position.set(r,.35,i);const c=new qa;c.position.set(7,7,14),t.add(c),l.target=c,l.castShadow=!1,t.add(l),a.push(l)}return{treeUplights:a}}function pn(t,e){const o=new Qt,n=new ot(.16,.12);n.translate(-.09,0,0);const a=new ot(.16,.12);a.translate(.09,0,0);const r=new $t({color:e.color,side:Se}),i=new B(n,r),l=new B(a,r);i.rotation.x=-Math.PI/2,l.rotation.x=-Math.PI/2,o.add(i),o.add(l),t.add(o),Wo.push({update(c){const d=c*e.speed+e.phase,g=e.cx+Math.cos(d)*e.rx,u=e.cz+Math.sin(d*e.zRatio)*e.rz,p=e.cy+Math.sin(c*e.bobSpeed+e.phase)*e.bobAmp,y=-Math.sin(d)*e.rx*e.speed,x=Math.cos(d*e.zRatio)*e.rz*e.zRatio*e.speed;o.rotation.y=Math.atan2(y,x),o.position.set(g,p,u);const m=Math.sin(c*e.flapSpeed)*1.1;i.rotation.y=m,l.rotation.y=-m}})}function ei(t,e){const o=new Qt,n=new $t({color:2763310,side:Se}),a=new ot(1.6,.35);a.translate(-.8,0,0);const r=new ot(1.6,.35);r.translate(.8,0,0);const i=new B(a,n),l=new B(r,n);i.rotation.x=-Math.PI/2,l.rotation.x=-Math.PI/2,o.add(i),o.add(l),t.add(o),Wo.push({update(c){const d=c*e.speed+e.phase,g=e.cx+Math.cos(d)*e.radius,u=e.cz+Math.sin(d)*e.radius,p=e.cy+Math.sin(c*.3+e.phase)*2;o.rotation.y=-d-Math.PI/2,o.position.set(g,p,u);const y=Math.sin(c*e.flapSpeed+e.phase)*.55;i.rotation.y=y,l.rotation.y=-y}})}function oi(t){const e=Qe(86420),o=[15241786,15979338,15262938,13070264,8368864];for(let n=0;n<5;n++)pn(t,{cx:7,cz:14,cy:1.4+e()*3,rx:1+e()*2.2,rz:1+e()*2.2,zRatio:.7+e()*.6,speed:.35+e()*.4,phase:e()*Math.PI*2,bobSpeed:1.5+e()*1.5,bobAmp:.3+e()*.3,flapSpeed:9+e()*5,color:o[n%o.length]});for(let n=0;n<4;n++)pn(t,{cx:-14+n*10+e()*4,cz:30+e()*8,cy:1.2+e()*2,rx:1.5+e()*3,rz:1.5+e()*3,zRatio:.6+e()*.8,speed:.3+e()*.35,phase:e()*Math.PI*2,bobSpeed:1.2+e()*1.6,bobAmp:.35+e()*.4,flapSpeed:8+e()*5,color:o[(n+2)%o.length]});for(let n=0;n<3;n++)ei(t,{cx:20+e()*30,cz:-10+e()*40,cy:26+e()*12,radius:55+e()*45,speed:.04+e()*.03,phase:e()*Math.PI*2,flapSpeed:2.2+e()*1.2})}function ni(t,e){const o=new Un(e.hemi.sky,e.hemi.ground,e.hemi.intensity);o.position.set(0,40,0),t.add(o);const n=new Fn(e.ambient.color,e.ambient.intensity);t.add(n);const a=new ae(e.sun.color,e.sun.intensity);a.position.set(...e.sun.pos),a.castShadow=!0,a.shadow.mapSize.set(2048,2048),a.shadow.bias=-5e-4,a.shadow.normalBias=.02;const r=e.shadowCamera;a.shadow.camera.left=r.left,a.shadow.camera.right=r.right,a.shadow.camera.top=r.top,a.shadow.camera.bottom=r.bottom,a.shadow.camera.near=r.near,a.shadow.camera.far=r.far,t.add(a),t.add(a.target);const i=new ae(e.fill.color,e.fill.intensity);return i.position.set(...e.fill.pos),t.add(i),{hemi:o,ambient:n,sun:a,fill:i}}function ai(t){for(const e of Wo)e.update(t)}let Nt=null,fn=0;function ri(t){fn+=t,ai(fn),Nt&&(Nt.phase=(Nt.phase+t/Sr)%1,ra(Nt,ia(Nt.phase)))}function ii(t,e="daylight",o={}){const n=o.fullLights!==!1,a=e==="cycle",r=a?yr():0,i=a?vr(r):kr(e);t.background=new jn(i.background),t.fog=new $n(i.fog.color,i.fog.near,i.fog.far);const l=Jr(t,i,a),c=Qr(t,i);Kr(t);const d=Vr(t,i,n),g=ti(t,i),u=d.downlights,p=ni(t,i);if(oi(t),a){const y=new ae(Xt.night.sun.color,0);y.position.set(...Xt.night.sun.pos),t.add(y),t.add(y.target),Nt={scene:t,phase:r,sunLight:p.sun,hemiLight:p.hemi,ambientLight:p.ambient,moonLight:y,seaMat:c.seaMat,downlights:u,treeUplights:g.treeUplights,skyDomes:l},p.sun.shadow.camera.updateProjectionMatrix(),ra(Nt,ia(r))}else Nt=null;return{bounds:{minX:M.minX+.6,maxX:M.maxX-.6,minZ:M.minZ+.6,maxZ:M.maxZ-.6}}}let ct=null,we=null,be=!1;function si(t,e){if(!ct)return;const o=new StereoPannerNode(ct,{pan:e});o.connect(we);const n=2+Math.floor(Math.random()*4);let a=ct.currentTime+.02;for(let r=0;r<n;r++){const i=ct.createOscillator(),l=ct.createGain();i.connect(l),l.connect(o);const c=t*(.85+Math.random()*.4),d=c*(Math.random()>.5?1.25:.78),g=.05+Math.random()*.1;i.type="sine",i.frequency.setValueAtTime(c,a),i.frequency.exponentialRampToValueAtTime(d,a+g),l.gain.setValueAtTime(1e-4,a),l.gain.exponentialRampToValueAtTime(.55,a+.012),l.gain.exponentialRampToValueAtTime(1e-4,a+g),i.start(a),i.stop(a+g+.02),a+=g+.04+Math.random()*.09}}function li(){const t=ct.sampleRate*4,e=ct.createBuffer(1,t,ct.sampleRate),o=e.getChannelData(0);let n=0;for(let l=0;l<t;l++){const c=Math.random()*2-1;n=(n+.02*c)/1.02,o[l]=n*3.5}const a=ct.createBufferSource();a.buffer=e,a.loop=!0;const r=ct.createBiquadFilter();r.type="lowpass",r.frequency.value=400;const i=ct.createGain();i.gain.value=.012,a.connect(r),r.connect(i),i.connect(we),a.start()}function _o(){if(!be)return;const t=[{base:2600,pan:-.7},{base:3400,pan:.6},{base:4200,pan:.15}],e=t[Math.floor(Math.random()*t.length)];si(e.base,e.pan+(Math.random()-.5)*.3);const o=900+Math.random()*4200;setTimeout(_o,o)}function ci(){if(!be)try{ct=new(window.AudioContext||window.webkitAudioContext),we=ct.createGain(),we.gain.value=.05,we.connect(ct.destination),ct.state==="suspended"&&ct.resume(),be=!0,li(),_o(),setTimeout(()=>{be&&_o()},2500)}catch{be=!1}}const pe=2.5,hn=4.5,gn=.0022,bn=.0058,Ie=wt.degToRad(89),di=.03,ui=7.5,Ae=60,Ct=.45,mn=.65,pi=12;function fi(t,e){for(const o of M.stairs){const n=Math.min(o.x0,o.x1),a=Math.max(o.x0,o.x1);if(t<n||t>a)continue;const r=Math.min(o.z0,o.z1),i=Math.max(o.z0,o.z1);if(e<r||e>i)continue;const l=wt.clamp((e-o.z0)/(o.z1-o.z0),0,1);return o.yFrom+l*(o.yTo-o.yFrom)}return null}function hi(t,e,o){return e>=t.x0&&e<=t.x1&&o>=t.z0&&o<=t.z1}function gi(t,e){return t>=M.minX&&t<=M.maxX&&e>=M.minZ&&e<=M.maxZ}function ca(t,e){const o=[],n=fi(t,e);if(n!==null&&o.push(n),gi(t,e))for(const a of M.floors){const r=M.slabHoles[a.id]||[];let i=!1;for(const l of r)if(hi(l,t,e)){i=!0;break}i||o.push(a.y)}else o.push(0);return o}function bi(t,e,o){const n=ca(t,e);let a=null;for(const r of n)r<=o+mn&&(a===null||r>a)&&(a=r);return a===null||o-a>mn?null:a}function mi(t,e){let o=t,n=e;return e>M.minZ-Ct&&e<M.maxZ+Ct&&(o=wt.clamp(t,M.minX+Ct,M.maxX-Ct)),t>M.minX-Ct&&t<M.maxX+Ct&&(n=Math.max(e,M.minZ+Ct)),{x:o,z:n}}class xi{constructor(e,o){if(this.camera=e,this.domElement=o,this.enabled=!1,this.euler=new Wn(0,0,0,"YXZ"),this.camera.rotation.set(0,0,0),this.camera.rotation.order="YXZ",this.camera.position.set(0,Mt,8),this.keys={forward:!1,backward:!1,left:!1,right:!1,run:!1},this.velocity=new Ot(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0,this.groundY=this.camera.position.y-Mt,this.moveTouch=null,this.lookTouch=null,!document.getElementById("lu-joy-style")){const n=document.createElement("style");n.id="lu-joy-style",n.textContent=`
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
    inset 0 -2px 4px rgba(32,74,52,0.30); }`,document.head.appendChild(n)}this._joyBase=document.createElement("div"),this._joyBase.className="lu-joy-base",this._joyKnob=document.createElement("div"),this._joyKnob.className="lu-joy-knob",this._wasRunning=!1,document.body.appendChild(this._joyBase),document.body.appendChild(this._joyKnob),this._bindEvents()}_bindEvents(){this._onClick=()=>{this.enabled&&document.pointerLockElement!==this.domElement&&this.domElement.requestPointerLock?.()},this.domElement.addEventListener("click",this._onClick),this._onMouseMove=e=>{this.enabled&&document.pointerLockElement===this.domElement&&(this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=e.movementX*gn,this.euler.x-=e.movementY*gn,this.euler.x=wt.clamp(this.euler.x,-Ie,Ie),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler))},document.addEventListener("mousemove",this._onMouseMove),this._onKeyDown=e=>{if(!this.enabled)return;const o=e.target;o&&(o.tagName==="INPUT"||o.tagName==="TEXTAREA")||this._setKey(e.code,!0)},this._onKeyUp=e=>{this._setKey(e.code,!1)},document.addEventListener("keydown",this._onKeyDown),document.addEventListener("keyup",this._onKeyUp),this._onTouchStart=e=>{if(this.enabled){for(const o of e.changedTouches){const n=window.innerWidth*.5;o.clientX<n&&this.moveTouch===null?(this.moveTouch={id:o.identifier,startX:o.clientX,startY:o.clientY,dx:0,dy:0},this._joyBase.style.left=o.clientX+"px",this._joyBase.style.top=o.clientY+"px",this._joyKnob.style.left=o.clientX+"px",this._joyKnob.style.top=o.clientY+"px",this._joyBase.classList.add("lu-live"),this._joyKnob.classList.add("lu-live")):o.clientX>=n&&this.lookTouch===null&&(this.lookTouch={id:o.identifier,lastX:o.clientX,lastY:o.clientY})}e.cancelable&&e.preventDefault()}},this._onTouchMove=e=>{if(this.enabled){for(const o of e.changedTouches)if(this.moveTouch&&o.identifier===this.moveTouch.id){const n=o.clientX-this.moveTouch.startX,a=o.clientY-this.moveTouch.startY,r=Math.hypot(n,a),i=r>Ae?Ae/r:1;this.moveTouch.dx=n*i/Ae,this.moveTouch.dy=a*i/Ae,this._joyKnob.style.left=this.moveTouch.startX+n*i+"px",this._joyKnob.style.top=this.moveTouch.startY+a*i+"px";const l=Math.hypot(this.moveTouch.dx,this.moveTouch.dy)>.85;this._joyBase.classList.toggle("lu-run",l),this._joyKnob.classList.toggle("lu-run",l),l&&!this._wasRunning&&navigator.vibrate&&navigator.vibrate(10),this._wasRunning=l}else if(this.lookTouch&&o.identifier===this.lookTouch.id){const n=o.clientX-this.lookTouch.lastX,a=o.clientY-this.lookTouch.lastY;this.lookTouch.lastX=o.clientX,this.lookTouch.lastY=o.clientY,this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=n*bn,this.euler.x-=a*bn,this.euler.x=wt.clamp(this.euler.x,-Ie,Ie),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler)}e.cancelable&&e.preventDefault()}},this._onTouchEnd=e=>{for(const o of e.changedTouches)this.moveTouch&&o.identifier===this.moveTouch.id?(this.moveTouch=null,this._wasRunning=!1,this._joyBase.classList.remove("lu-live","lu-run"),this._joyKnob.classList.remove("lu-live","lu-run")):this.lookTouch&&o.identifier===this.lookTouch.id&&(this.lookTouch=null)},this.domElement.addEventListener("touchstart",this._onTouchStart,{passive:!1}),this.domElement.addEventListener("touchmove",this._onTouchMove,{passive:!1}),this.domElement.addEventListener("touchend",this._onTouchEnd),this.domElement.addEventListener("touchcancel",this._onTouchEnd)}_setKey(e,o){switch(e){case"KeyW":case"ArrowUp":this.keys.forward=o;break;case"KeyS":case"ArrowDown":this.keys.backward=o;break;case"KeyA":case"ArrowLeft":this.keys.left=o;break;case"KeyD":case"ArrowRight":this.keys.right=o;break;case"ShiftLeft":case"ShiftRight":this.keys.run=o;break}}_tryMove(e,o){const n=mi(e,o),a=wt.clamp(n.x,-24,ze.bound),r=wt.clamp(n.z,-24,ze.bound),i=M.maxZ,l=this.camera.position.z;if(a>M.minX-Ct&&a<M.maxX+Ct&&(l-i)*(r-i)<0&&Math.abs(a)>1.4)return null;const d=bi(a,r,this.groundY);return d===null?null:{x:a,z:r,y:d}}update(e){if(!this.enabled)return;e=Math.min(e,.1);let o=0,n=0;this.keys.forward&&(n-=1),this.keys.backward&&(n+=1),this.keys.left&&(o-=1),this.keys.right&&(o+=1);let a=this.keys.run?hn:pe;if(this.moveTouch&&o===0&&n===0){o=this.moveTouch.dx,n=this.moveTouch.dy;const f=Math.hypot(o,n);f<.14&&(o=0,n=0),a=pe+(hn-pe)*Math.min(1,Math.max(0,(f-.85)/.15))}else{const f=Math.hypot(o,n);f>1&&(o/=f,n/=f)}this.euler.setFromQuaternion(this.camera.quaternion,"YXZ");const r=this.euler.y,i=Math.sin(r),l=Math.cos(r),c=(o*l+n*i)*a,d=(-o*i+n*l)*a,g=1-Math.exp(-10*e);this.velocity.x+=(c-this.velocity.x)*g,this.velocity.y+=(d-this.velocity.y)*g;const u=this.camera.position,p=u.x+this.velocity.x*e,y=u.z+this.velocity.y*e;let x=this._tryMove(p,y);if(!x){const f=this._tryMove(p,u.z),O=this._tryMove(u.x,y);x=f||O||null}x&&(u.x=x.x,u.z=x.z,this.groundY=x.y);const m=Math.hypot(this.velocity.x,this.velocity.y);if(m>.3){this.bobPhase+=e*ui*(m/pe);const f=Math.min(1,m/pe);this.bobOffset=Math.sin(this.bobPhase)*di*f}else this.bobOffset+=(0-this.bobOffset)*g,Math.abs(this.bobOffset)<5e-4&&(this.bobOffset=0,this.bobPhase=0);const v=Math.min(1,pi*e),h=this.groundY+Mt+this.bobOffset+this.liftOffset;u.y+=(h-u.y)*v}resolveBodyCollisions(e){if(!this.enabled||!e||!e.length)return;const o=.6,n=1.2,a=this.camera.position;let r=a.x,i=a.z,l=!1,c=0,d=0;for(const p of e){if(!p||p.y!=null&&Math.abs(p.y-this.groundY)>n)continue;const y=r-p.x,x=i-p.z,m=Math.hypot(y,x);if(m>=o)continue;const v=m>1e-4?y/m:Math.sin(this.euler.y),h=m>1e-4?x/m:Math.cos(this.euler.y);r=p.x+v*o,i=p.z+h*o,c=v,d=h,l=!0}if(!l)return;const g=this._tryMove(r,i);g&&(a.x=g.x,a.z=g.z,this.groundY=g.y);const u=this.velocity.x*-c+this.velocity.y*-d;u>0&&(this.velocity.x+=c*u,this.velocity.y+=d*u)}getState(){return this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z,ry:this.euler.y}}setPose({x:e,y:o,z:n,ry:a}){const r=wt.clamp(e,-24,ze.bound),i=wt.clamp(n,-24,ze.bound);let l;if(o!=null)l=o-Mt;else{const c=ca(r,i);l=c.length?Math.max(...c):0}this.groundY=l,this.camera.position.set(r,l+Mt,i),this.euler.set(0,a,0,"YXZ"),this.camera.quaternion.setFromEuler(this.euler),this.velocity.set(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0}enable(){this.enabled=!0}disable(){this.enabled=!1,this.keys.forward=this.keys.backward=this.keys.left=this.keys.right=this.keys.run=!1,this.velocity.set(0,0),this.moveTouch=null,this.lookTouch=null,document.pointerLockElement===this.domElement&&document.exitPointerLock?.()}dispose(){this.disable(),this.domElement.removeEventListener("click",this._onClick),document.removeEventListener("mousemove",this._onMouseMove),document.removeEventListener("keydown",this._onKeyDown),document.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("touchstart",this._onTouchStart),this.domElement.removeEventListener("touchmove",this._onTouchMove),this.domElement.removeEventListener("touchend",this._onTouchEnd),this.domElement.removeEventListener("touchcancel",this._onTouchEnd)}}const wi=3,yi=6,xn=2.2,vi=.05;function ki({player:t,getSelfAvatar:e}){let o=!1,n=0,a=0,r=0;const i=x=>{if(x.code!=="Space"||!t||!t.enabled)return;const m=x.target;m&&(m.tagName==="INPUT"||m.tagName==="TEXTAREA")||(o=!0,x.preventDefault())},l=x=>{x.code==="Space"&&(o=!1)};document.addEventListener("keydown",i),document.addEventListener("keyup",l);let c=null;const d=typeof window<"u"&&window.matchMedia&&window.matchMedia("(pointer: coarse)").matches,g=x=>{o=!0,c&&c.classList.add("lu-fly-on"),x.cancelable&&x.preventDefault(),x.stopPropagation()},u=x=>{o=!1,c&&c.classList.remove("lu-fly-on"),x.stopPropagation()};d&&(c=document.createElement("button"),c.id="lu-fly-btn",c.type="button",c.setAttribute("aria-label","날기 — 누르고 있으면 상승"),c.textContent="▲",c.style.cssText=["position:fixed","right:20px","bottom:104px","width:64px","height:64px","border-radius:50%","border:1.5px solid rgba(255,255,255,0.34)","background:rgba(22,24,30,0.44)","color:rgba(255,255,255,0.92)","font-size:20px","line-height:1","z-index:6","display:none","align-items:center","justify-content:center","touch-action:none","user-select:none","-webkit-user-select:none","cursor:pointer","box-shadow:0 2px 12px rgba(0,0,0,0.32)","transition:background 0.12s, transform 0.12s, opacity 0.2s"].join(";"),c.addEventListener("touchstart",g,{passive:!1}),c.addEventListener("touchend",u),c.addEventListener("touchcancel",u),c.addEventListener("pointerdown",x=>{x.pointerType!=="touch"&&g(x)}),c.addEventListener("pointerup",x=>{x.pointerType!=="touch"&&u(x)}),document.body.appendChild(c));function p(x){const m=Math.min(x||0,.1),v=!!(t&&t.enabled);v||(o=!1),t&&t.liftOffset!==r&&(n=t.liftOffset,a=0),o?a=wi:(a-=yi*m,a<-5&&(a=-5)),n+=a*m,n>=xn&&(n=xn,a=0),n<=0&&(n=0,a=0),t&&(t.liftOffset=n,r=n);const h=v&&n>vi,f=e&&e();f&&typeof f.setFlying=="function"&&f.setFlying(h),c&&(c.style.display=v?"flex":"none")}function y(){document.removeEventListener("keydown",i),document.removeEventListener("keyup",l),c&&c.parentNode&&c.parentNode.removeChild(c)}return{update:p,dispose:y}}const Si="lu-stats-v1-",Ei=3;function wn(){const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}function Ci(){return{totalVisits:0,days:{},dwell:{}}}class Mi{key;_seen;data;_saveTimer;constructor(e){this.key=Si+String(e||"default"),this._seen=new Set,this.data=Ci();try{const o=localStorage.getItem(this.key);if(o){const n=JSON.parse(o);n&&typeof n=="object"&&(this.data={totalVisits:n.totalVisits|0,days:n.days&&typeof n.days=="object"?n.days:{},dwell:n.dwell&&typeof n.dwell=="object"?n.dwell:{}})}}catch{}this._saveTimer=null}_save(){this._saveTimer||(this._saveTimer=setTimeout(()=>{this._saveTimer=null;try{localStorage.setItem(this.key,JSON.stringify(this.data))}catch{}},2e3))}addVisit(e){if(!e||this._seen.has(e))return;this._seen.add(e),this.data.totalVisits+=1;const o=wn();this.data.days[o]=(this.data.days[o]|0)+1;const n=Object.keys(this.data.days).sort();for(;n.length>60;)delete this.data.days[n.shift()];this._save()}addDwell(e,o,n){if(!e||!e.length||!o||!o.length)return;let a=!1;for(const r of e){let i=null,l=Ei;for(const c of o){const d=Math.hypot(c.pos.x-r.x,c.pos.z-r.z);d<l&&(l=d,i=c)}i&&i.title&&(this.data.dwell[i.title]=(this.data.dwell[i.title]||0)+n,a=!0)}a&&this._save()}summary(e){const n=[`오늘 방문 ${this.data.days[wn()]|0}`,`누적 ${this.data.totalVisits}`];typeof e=="number"&&n.push(`방명록 ${e}`);const a=Object.entries(this.data.dwell).sort((r,i)=>i[1]-r[1])[0];if(a&&a[1]>=10){const r=a[1]>=60?`${Math.round(a[1]/60)}분`:`${Math.round(a[1])}초`;n.push(`인기작 「${a[0]}」 ${r}`)}return n.join(" · ")}}const da="#5f9e7d";function Li(){const t=`
/* 폰트(@font-face·스택)는 SSOT인 vendor/fonts/fonts.css가 담당 — index.html <head>에서
   정적 <link>로 로드된다. 여기선 그 단일 스택(--app-font)만 --lu-font로 잇는다. */
:root {
  --lu-gold: ${da};
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
`,e=document.createElement("style");e.id="lu-styles",e.textContent=t,document.head.appendChild(e)}function s(t,e={},o=[]){const n=document.createElement(t);for(const[a,r]of Object.entries(e))a==="className"?n.className=r:a==="text"?n.textContent=r:n.setAttribute(a,r);for(const a of o)n.appendChild(a);return n}const Ti="lu-chibi-look::",zi="lu-chibi-thumb::",_i="lu-chibi-closet::",Ni="lu-chibi-look-v1",Ii="lu-chibi-look-thumb-v1",yn=12;function io(){const t=At();return t&&t.provider&&t.name?`${t.provider}:${t.name}`:"guest"}function to(t){return Ti+(t||io())}function Vo(t){return zi+(t||io())}function ua(t){return _i+(t||io())}function Ai(){try{const t=localStorage.getItem(Ni);if(t&&!localStorage.getItem(to("guest"))){localStorage.setItem(to("guest"),t);const e=localStorage.getItem(Ii);e&&localStorage.setItem(Vo("guest"),e)}}catch{}}Ai();function pa(t){try{const e=localStorage.getItem(to(t));if(!e)return null;const o=JSON.parse(e);return o&&typeof o=="object"?o:null}catch{return null}}function Ri(t,e){try{return localStorage.setItem(to(e),JSON.stringify(t)),!0}catch{return!1}}function vn(t){try{return localStorage.getItem(Vo(t))||""}catch{return""}}function Pi(t,e){try{localStorage.setItem(Vo(e),t)}catch{}}let Ko=null;function Bi(t){Ko=t}function fa(){return Ko||pa()}sa(()=>{Ko=null});function ho(t){try{const e=localStorage.getItem(ua(t));if(!e)return[];const o=JSON.parse(e);return Array.isArray(o)?o:[]}catch{return[]}}function kn(t,e){try{return localStorage.setItem(ua(e),JSON.stringify(t)),!0}catch{return!1}}function Oi(t,e,o){try{const n=document.createElement("canvas");return n.width=e,n.height=o,n.getContext("2d").drawImage(t,0,0,e,o),n.toDataURL("image/jpeg",.72)}catch{return""}}let nt=null,lt=null,oe=null,Re=0,Pe=!1,go=0,Be=0,bo=Math.PI;const Di=wt.degToRad(18),Gi=.6,Sn='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 19.5C4.5 10 11 4 20 4c0 9-6 15.5-15.5 15.5A1 1 0 0 1 4.5 19.5Z"/><path d="M6.7 17.3C10.2 13.3 14.2 9.3 18 5.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>',Hi=[{id:"species",label:"종족",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8.3" r="2.1"/><circle cx="12" cy="6.1" r="2.1"/><circle cx="17" cy="8.3" r="2.1"/><path d="M12 11.6c-3.4 0-6.1 2.4-6.1 5.2 0 2 1.8 3.3 3.7 2.6.9-.3 1.7-.3 2.6 0 1.9.7 3.7-.6 3.7-2.6 0-2.8-2.5-5.2-5.9-5.2Z"/></svg>'},{id:"face",label:"얼굴",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><path d="M8.6 14.6c1 1.1 2.1 1.7 3.4 1.7s2.4-.6 3.4-1.7"/></svg>'},{id:"hair",label:"헤어",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12.5C5 8 8.1 4.5 12 4.5s7 3.5 7 8"/><path d="M6.3 12.5v3.2M10.1 12.5v4.2M13.9 12.5v4.2M17.7 12.5v3.2"/></svg>'},{id:"outfit",label:"의상",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8.3 4.2 4.3 7.3l2 3 2-1.1v9.6h7.4V9.2l2 1.1 2-3-4-3.1c-.7 1-1.8 1.6-3.7 1.6s-3-.6-3.7-1.6Z"/></svg>'},{id:"acc",label:"장식",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.5 3.5 1.7 6.3 5.2 7.6-3.5 1.3-4.7 4.1-5.2 7.6-.5-3.5-1.7-6.3-5.2-7.6C10.3 9.3 11.5 6.5 12 3Z"/><circle cx="19" cy="5.2" r="1.2"/></svg>'},{id:"closet",label:"옷장",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.3"/><path d="M12 5.9v1.8"/><path d="M12 7.7 4.3 13.4h15.4L12 7.7Z"/><path d="M4.3 17.4h15.4"/></svg>'}];function Xi(t){const{els:e,state:o,callbacks:n,setStatus:a}=t,r=s("button",{id:"lu-am-save",type:"button","aria-label":"이 캐릭터 사용",title:"이 캐릭터 사용",text:"✓"}),i=s("button",{id:"lu-am-close",type:"button","aria-label":"닫기",text:"×"}),l=s("span",{className:"lu-am-title-icon","aria-hidden":"true"});l.innerHTML=Sn;const c=s("div",{className:"lu-am-title"},[l,s("span",{text:"캐릭터 디자인"})]),d=s("div",{className:"lu-am-head-actions"},[r,i]),g=s("div",{className:"lu-am-head"},[c,d]),u=s("canvas",{width:"300",height:"400"}),p=s("div",{className:"lu-am-stage"},[u]),y=s("div",{className:"lu-am-stagewrap"},[p]),x=s("div",{className:"lu-am-preview"},[y]),m=["wave","jump","clap","dance","breakdance","run","jumpingjack","heart","kick"];let v=1,h=null,f=null,O=null,T=null;function H(k,A){if(typeof document>"u")return null;const C=document.createElement("canvas");C.width=2,C.height=256;const G=C.getContext("2d"),P=G.createLinearGradient(0,0,0,256);P.addColorStop(0,k),P.addColorStop(1,A),G.fillStyle=P,G.fillRect(0,0,2,256);const $=new ye(C);return $.colorSpace=Bt,$}function I(k,A){if(typeof document>"u")return null;const C=512,G=307,P=document.createElement("canvas");P.width=C,P.height=G;const $=P.getContext("2d");$.fillStyle=k,$.fillRect(0,0,C,G);const gt=28,Tt=C/gt;$.fillStyle=A;for(let ue=0;ue<gt;ue++)$.fillRect(ue*Tt,0,Tt/2,G);const de=new ye(P);return de.colorSpace=Bt,de.anisotropy=4,de}function Y(){if(h)return;h=new Vn({canvas:u,antialias:!0,alpha:!0}),h.setPixelRatio(Math.min(2,typeof window<"u"&&window.devicePixelRatio||1)),h.setSize(300,400,!1),h.shadowMap.enabled=!0,h.shadowMap.type=Qa,h.toneMapping=Kn,h.toneMappingExposure=1,h.outputColorSpace=Bt,f=new Zn,f.background=H("#f0ead9","#ddd2bd")||new jn("#ddd2bd"),f.fog=new $n(14603199,5.5,10),O=new qn(30,300/400,.1,20),O.position.set(0,1,4),O.lookAt(0,.85,0),f.add(new Un(16775924,2367256,.65));const k=new ae(16777215,1.4);k.position.set(.7,2,2.6),f.add(k);const A=new ae(16776696,.4);A.position.set(-1.8,1.1,1.6),f.add(A);const C=new ae(16777215,0);C.position.set(.4,5,1),C.castShadow=!0,C.shadow.mapSize.set(512,512),C.shadow.camera.near=.5,C.shadow.camera.far=9,C.shadow.camera.left=-1.3,C.shadow.camera.right=1.3,C.shadow.camera.top=1.3,C.shadow.camera.bottom=-1.3,C.shadow.radius=35,C.shadow.blurSamples=24,C.shadow.bias=-5e-4,f.add(C),f.add(C.target);const G=new B(new ot(6,6),new dt({color:12165231,roughness:.9,metalness:0}));G.rotation.x=-Math.PI/2,G.position.y=0,G.receiveShadow=!0,f.add(G);const P=new B(new ot(6,6),new tr({opacity:.3}));P.rotation.x=-Math.PI/2,P.position.y=.002,P.material.polygonOffset=!0,P.material.polygonOffsetFactor=-1,P.receiveShadow=!0,f.add(P);const $=I("#e2d7bf","#efe7d3"),gt=new B(new ot(10,6),new dt({map:$,roughness:.9,metalness:0}));gt.position.set(0,2.2,-2.3),f.add(gt),T=new Qt,T.rotation.y=Math.PI,f.add(T)}let w="species";const S=s("div",{className:"lu-am-nav",role:"tablist","aria-label":"캐릭터 디자인 카테고리"}),z=s("div",{className:"lu-am-panel"}),N=s("div",{className:"lu-am-tabpage",id:"lu-am-tabpanel",role:"tabpanel",tabindex:"0"});z.appendChild(S),z.appendChild(N),S.addEventListener("keydown",k=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(k.key))return;const A=[...S.querySelectorAll(".lu-am-navtab")];if(!A.length)return;const C=A.findIndex($=>$.getAttribute("aria-selected")==="true");let G=C<0?0:C;k.key==="ArrowLeft"?G=(C-1+A.length)%A.length:k.key==="ArrowRight"?G=(C+1)%A.length:k.key==="Home"?G=0:k.key==="End"&&(G=A.length-1),k.preventDefault(),A[G].click();const P=S.querySelectorAll(".lu-am-navtab")[G];P&&P.focus()});const E=s("div",{className:"lu-am-body"},[x,z]),D=s("div",{className:"lu-am-card"},[g,E]),L=s("div",{id:"lu-chibi-maker",className:"lu"},[D]);document.body.appendChild(L);function _(k,A){nt&&(nt[k]=A,k==="species"&&A!=="human"&&sn[A]&&Object.assign(nt,sn[A]),nt=po(nt),co(),ee())}function R(k){nt=po(Object.assign({},k)),co(),ee()}function U(){for(const k of Mr){const A=Lr.filter(G=>(G.cat||"human")===k.id);if(!A.length)continue;N.appendChild(s("div",{className:"lu-am-section-title",text:`${k.name} (${A.length})`}));const C=s("div",{className:"lu-am-tabs lu-am-presets"});for(const G of A){const P=s("button",{type:"button",className:"lu-am-tab lu-am-preset"}),$=G.look.skin||We.skin,gt=G.look.top||G.look.hairColor||We.top,Tt=s("span",{className:"lu-am-preset-dot","aria-hidden":"true"});Tt.style.background=`conic-gradient(${$} 0deg 180deg, ${gt} 180deg 360deg)`,P.appendChild(Tt),P.appendChild(s("span",{className:"lu-am-preset-label",text:G.name})),P.addEventListener("click",()=>R(G.look)),C.appendChild(P)}N.appendChild(C)}}function j(k){const A=ln.find(C=>C.id===k);return A&&A.name||"아야모"}function J(){if(!At())return;const k=io();it("내 옷장");const A=s("button",{type:"button",className:"lu-am-btn lu-closet-save",text:"＋ 지금 모습 옷장에 저장"});A.addEventListener("click",()=>{const P=ho(k);if(P.length>=yn){a(`옷장은 최대 ${yn}벌까지 저장할 수 있어요`);return}const $={id:"c"+Date.now(),name:j(nt.species),look:JSON.parse(JSON.stringify(nt)),thumb:nn(120,160),ts:Date.now()};if(P.push($),!kn(P,k)){a("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요");return}ee()}),N.appendChild(A);const C=ho(k);if(!C.length){N.appendChild(s("div",{className:"lu-closet-empty",text:"아직 저장한 옷이 없어요. 마음에 드는 모습을 저장해 두세요."}));return}const G=s("div",{className:"lu-closet-grid"});C.forEach(P=>{const $=s("div",{className:"lu-closet-cell"}),gt=s("button",{type:"button",className:"lu-closet-load",title:`${P.name} 불러오기`,"aria-label":`${P.name} 불러오기`});P.thumb&&(gt.style.backgroundImage=`url('${P.thumb}')`),gt.appendChild(s("span",{className:"lu-closet-name",text:P.name})),gt.addEventListener("click",()=>R(P.look));const Tt=s("button",{type:"button",className:"lu-closet-del",text:"×",title:"삭제","aria-label":`${P.name} 삭제`});Tt.addEventListener("click",de=>{de.stopPropagation();const ue=ho(k).filter(ja=>ja.id!==P.id);kn(ue,k),ee()}),$.appendChild(gt),$.appendChild(Tt),G.appendChild($)}),N.appendChild(G)}const W=(k,A)=>[{id:!1,name:k},{id:!0,name:A}];function q(k,A,C){N.appendChild(s("div",{className:"lu-am-section-title",text:k}));const G=s("div",{className:"lu-am-tabs"});A.forEach(P=>{const $=s("button",{type:"button",className:"lu-am-tab"+(nt[C]===P.id?" lu-selected":""),text:P.name});$.addEventListener("click",()=>_(C,P.id)),G.appendChild($)}),N.appendChild(G)}function Q(k,A,C){N.appendChild(s("div",{className:"lu-am-section-title",text:k}));const G=s("div",{className:"lu-swatches"});A.forEach(P=>{const $=s("button",{type:"button",className:"lu-swatch"+(nt[C]===P?" lu-selected":""),style:`background:${P};`,title:P,"aria-label":`${k} ${P}`});$.addEventListener("click",()=>_(C,P)),G.appendChild($)}),N.appendChild(G)}function it(k){const A=s("div",{className:"lu-am-group-title"}),C=s("span",{className:"lu-am-group-icon","aria-hidden":"true"});C.innerHTML=Sn,A.appendChild(C),A.appendChild(s("span",{text:k})),N.appendChild(A)}function Ce(){S.textContent="";const k=!!At(),A=Hi.filter(C=>C.id!=="closet"||k);A.some(C=>C.id===w)||(w="species"),A.forEach(C=>{const G=w===C.id,P=s("button",{type:"button",role:"tab",id:"lu-am-tab-"+C.id,className:"lu-am-navtab"+(G?" lu-selected":""),"aria-selected":G?"true":"false","aria-controls":"lu-am-tabpanel",tabindex:G?"0":"-1","aria-label":C.label});P.innerHTML=C.icon,P.appendChild(s("span",{className:"lu-am-navtab-label",text:C.label})),P.addEventListener("click",()=>{w!==C.id&&(w=C.id,ee(),N.scrollTop=0)}),S.appendChild(P)}),N.setAttribute("aria-labelledby","lu-am-tab-"+w)}function ee(){if(Ce(),N.textContent="",!nt)return;const k=nt.species&&nt.species!=="human";w==="species"?(U(),it(k?"종족 · 털색":"종족 · 성별 · 피부색"),q("종족",ln,"species"),k||q("성별",Tr,"gender"),Q(k?"털 색":"피부색",zr,"skin")):w==="face"?(it("얼굴"),q("얼굴형",_r,"face"),q("눈",Nr,"eyeStyle"),q("입",Ir,"mouth"),k||q("수염",Ar,"beardStyle"),q("볼터치",W("없음","있음"),"blush"),Q("눈동자 색",Rr,"eyeColor")):w==="hair"?k?(it("포인트"),Q("귀·꼬리 색",cn,"hairColor")):(it("헤어"),q("헤어",Pr,"hairStyle"),Q("머리 색",cn,"hairColor")):w==="outfit"?(it("의상"),q("상의 패턴",Br,"pattern"),q("의상 세트",Or,"outfit"),q("하의",Dr,"bottomType"),Q("상의 색",fo,"top"),Q("하의 색",fo,"bottom"),Q("신발 색",fo,"shoes")):w==="acc"?(it("장식"),q("머리 장식",Gr,"acc"),q("안경",W("없음","착용"),"glasses"),q("헤일로",W("없음","있음"),"halo"),q("날개",W("없음","있음"),"wings"),q("가슴 하트",W("없음","있음"),"heart")):w==="closet"&&J()}function co(){!nt||!T||(lt&&(T.remove(lt.group),lt.dispose(),lt=null),lt=$o(zo(nt),da," ",{blobShadow:!1}),lt.group.traverse(k=>{k.isMesh&&(k.castShadow=!0)}),T.add(lt.group))}function en(k){oe=requestAnimationFrame(en);const A=Re?(k-Re)/1e3:0,C=Math.min(.1,A);if(Re=k,!Pe&&(Be+=C,T.rotation.y=bo+Math.sin(Be*Gi)*Di,v-=A,v<=0&&lt&&typeof lt.playAction=="function")){const G=m[Math.floor(Math.random()*m.length)];lt.playAction(G),v=(Hr[G]||1.5)+.6+Math.random()*.9}lt&&lt.update(C,0),h.render(f,O)}function Xa(){oe||(Re=0,oe=requestAnimationFrame(en))}function Fa(){oe&&cancelAnimationFrame(oe),oe=null}u.addEventListener("pointerdown",k=>{Pe=!0,go=k.clientX,x.classList.add("lu-dragging"),u.setPointerCapture(k.pointerId)}),u.addEventListener("pointermove",k=>{Pe&&(T.rotation.y+=(k.clientX-go)*.012,go=k.clientX)});const on=()=>{Pe=!1,x.classList.remove("lu-dragging"),bo=T.rotation.y,Be=0};u.addEventListener("pointerup",on),u.addEventListener("pointercancel",on),i.addEventListener("click",()=>Me()),L.addEventListener("click",k=>{k.target===L&&Me()});function nn(k,A){try{return h?(h.render(f,O),Oi(u,k,A)||h.domElement.toDataURL("image/png")):""}catch{return""}}function Ya(){const A=!!At()?"저장하고 사용":"이 캐릭터 사용";r.setAttribute("aria-label",A),r.title=A}r.addEventListener("click",()=>{if(!nt)return;const k=JSON.parse(JSON.stringify(nt));Bi(k);const A=!!At();if(A){const C=Ri(k),G=nn(150,200);G&&Pi(G),C||a("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요")}e&&e.lobby&&e.lobby.onChibiSaved(),o.entered&&typeof n.onAvatarChange=="function"&&n.onAvatarChange(zo(k)),A||a("이 캐릭터로 적용했어요 · 회원가입하면 저장돼요"),Me()});function Ua(){w="species",nt=po(Object.assign({},We,fa()||{})),Ya(),Y(),T.rotation.y=Math.PI,bo=Math.PI,Be=0,v=1,co(),ee(),L.classList.add("lu-open"),o.chibiOpen=!0,Xa(),typeof n.onMakerToggle=="function"&&n.onMakerToggle(!0)}function Me(){L.classList.remove("lu-open"),o.chibiOpen=!1,Fa(),lt&&(T.remove(lt.group),lt.dispose(),lt=null),typeof n.onMakerToggle=="function"&&n.onMakerToggle(!1)}return{open:Ua,close:Me}}const Fi=8,Oe=12;let b=null,st={onEnter:null,onChatSend:null,onAvatarChange:null,onMakerToggle:null},En=Lo[0];const re={chibiOpen:!1,entered:!1};let No=null,Cn=!1,Wt=!1,Io=null,Yt=null,Vt=!1,Ao=null,Kt=!1,Ro=null,eo=null;const De=120;let Et={onPrev:null,onNext:null,onExit:null,onToggleAuto:null};const Zt=typeof window<"u"&&"ontouchstart"in window||typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches;let yt={onTour:null,onViewArtwork:null,onGuestbook:null,onCapture:null,onSelfView:null},qt=!1,ut={blob:null,dataUrl:"",galleryName:"",shareUrl:""},Ut=null,oo=null,Rt=null,no=null;function Yi(){const t=s("div",{id:"lu-loading",className:"lu"},[s("div",{className:"lu-spinner"}),s("div",{className:"lu-loading-text",text:"MUSEUM LOADING..."})]);return document.body.appendChild(t),t}function Ui(){const t=s("div",{className:"lu-lobby-title",text:"OpenArtShow MUSEUM"}),e=s("div",{className:"lu-lobby-sub",text:"VIRTUAL EXHIBITION"}),o=s("div",{className:"lu-lobby-rule"}),n=s("div",{id:"lu-auth"}),a=s("div",{className:"lu-social-wrap"}),r=s("div",{className:"lu-logged-wrap"}),i=()=>{a.textContent="";for(const E of Object.keys(_e)){const D=_e[E],L=s("button",{className:`lu-social-btn lu-social-${E}`,type:"button"},[s("span",{className:"lu-social-badge",text:D.short}),s("span",{text:D.label})]);L.addEventListener("click",async()=>{L.disabled=!0,L.classList.add("lu-social-busy");try{await Xr(E)}catch{}L.disabled=!1,L.classList.remove("lu-social-busy")}),a.appendChild(L)}a.appendChild(s("div",{className:"lu-social-note",text:"계정 연동 준비 중 — 지금은 프로필 미리보기로 동작합니다"}))},l=E=>{r.textContent="";const D=s("span",{className:"lu-logged-avatar",text:E.initial||E.name.slice(0,1)}),L=s("span",{className:"lu-logged-name",text:`${E.name}님`}),_=s("span",{className:"lu-logged-via",text:_e[E.provider]?_e[E.provider].short:""}),R=s("button",{className:"lu-logout-btn",type:"button",text:"로그아웃"});R.addEventListener("click",()=>Yr()),r.appendChild(s("div",{className:"lu-logged-chip"},[D,L,_,R]))},c=E=>{E?(l(E),a.style.display="none",r.style.display="",u.value=E.name.slice(0,Oe)):(a.style.display="",r.style.display="none",(!u.value||Object.values(Fr).includes(u.value))&&(u.value="게스트")),m()};i(),n.appendChild(a),n.appendChild(r);const d=s("div",{className:"lu-auth-or"},[s("span",{text:"소셜 계정 연동 (준비 중)"})]),g=s("label",{className:"lu-field-label",for:"lu-nickname",text:"닉네임"}),u=s("input",{id:"lu-nickname",type:"text",maxlength:String(Oe),value:"게스트",autocomplete:"off",spellcheck:"false"}),p=s("div",{className:"lu-field-hint",text:`최대 ${Oe}자 · 비워두면 '게스트'로 입장합니다`}),y=s("div",{className:"lu-field-label",text:"캐릭터",style:"margin-top:26px;"}),x=s("button",{id:"lu-char-design",className:"lu-char-design-btn",type:"button","aria-label":"캐릭터 디자인 — 나만의 아야모 만들기"});function m(){const E=vn();x.textContent="";const D=s("span",{className:"lu-char-design-media"});E?(D.classList.add("lu-has-thumb"),D.style.backgroundImage=`url('${E}')`):D.textContent="🎨";const L=s("span",{className:"lu-char-design-txt"},[s("b",{text:"캐릭터 디자인"}),s("span",{text:E?"내 아야모 편집하기":"나만의 아야모 만들기 (선택)"})]);x.append(D,L,s("span",{className:"lu-char-design-arrow",text:"›"}))}m(),x.addEventListener("click",()=>Zo());const v=s("button",{id:"lu-enter-btn",type:"button",text:"입장하기"}),h=s("div",{id:"lu-picker"}),f=s("div",{className:"lu-lobby-divider"}),O=s("a",{className:"lu-studio-link",href:"./studio.html",target:"_blank",rel:"noopener noreferrer",text:"작가 스튜디오에서 나만의 전시 만들기 →"}),T=s("div",{className:"lu-lobby-form"},[g,u,p,y,x,v,d,n]),H=s("div",{className:"lu-quick-enter"});function I(){H.textContent="";const E=At(),D=vn(),L=s("span",{className:"lu-quick-avatar"});D?L.style.backgroundImage=`url('${D}')`:L.textContent="🙂";const _=s("div",{className:"lu-quick-greet"},[s("b",{text:(E?`${E.name}님, `:"")+"다시 오셨어요"}),s("span",{text:"저장한 모습으로 바로 입장할 수 있어요"})]),R=s("button",{className:"lu-quick-btn",type:"button",text:"바로 입장"});R.addEventListener("click",z);const U=s("button",{className:"lu-quick-change",type:"button",text:"닉네임·캐릭터 바꾸기"});U.addEventListener("click",()=>{T.classList.remove("lu-collapsed"),H.style.display="none";try{u.focus()}catch{}}),H.append(L,_,R,U)}!!(At()||pa())?(I(),T.classList.add("lu-collapsed")):H.style.display="none";const w=s("div",{className:"lu-lobby-card"},[t,e,o,H,T,h,f,O]),S=s("div",{id:"lu-lobby",className:"lu"},[w]);document.body.appendChild(S),c(At()),sa(c);function z(){let E=u.value.trim().slice(0,Oe);E||(E="게스트");let D=0;for(let _=0;_<E.length;_++)D=D*31+E.charCodeAt(_)>>>0;En=Lo[D%Lo.length];const L=zo(Object.assign({},We,fa()||{}));typeof st.onEnter=="function"&&st.onEnter({nickname:E,color:En,char:L})}v.addEventListener("click",z),u.addEventListener("keydown",E=>{E.stopPropagation(),E.key==="Enter"&&z()}),u.addEventListener("keyup",E=>E.stopPropagation());function N(){m()}return{overlay:S,nickInput:u,pickerBox:h,onChibiSaved:N}}function ji(){const t=Zt?[["왼쪽 드래그","이동"],["오른쪽 드래그","시점 회전"],["캐릭터 탭","콕 찌르기"],["작품 카드","탭하여 크게 보기"]]:[["마우스 드래그","시점 회전"],["W A S D","이동"],["Shift","달리기"],["Enter","채팅"],["M","작품 목록"],["T","투어"],["G","방명록"],["V","내 모습 보기"],["C","캐릭터 디자인"],["P","사진 촬영"],["클릭","캐릭터 콕 찌르기"]],e=s("div",{id:"lu-controls",className:"lu lu-hud"});if(e.appendChild(s("div",{className:"lu-controls-title",text:"CONTROLS"})),t.forEach(([o,n])=>{const a=s("div",{},[s("span",{className:"lu-key",text:o}),s("span",{text:n})]);e.appendChild(a)}),document.body.appendChild(e),Zt){e.classList.add("lu-collapsed");const o=s("button",{id:"lu-controls-toggle",className:"lu lu-hud",type:"button","aria-label":"조작법 보기",text:"?"});o.addEventListener("click",()=>{e.classList.toggle("lu-collapsed")}),document.body.appendChild(o)}return e}function $i(){if(!Zt)return null;function t(){const f=b&&b.chat&&b.chat.wrap;if(!f)return;const O=f.classList.toggle("lu-chat-collapsed");!O&&b.chat.input?b.chat.input.focus():b.chat.input&&b.chat.input.blur(),r.classList.toggle("lu-on",!O)}const e={chat:'<path d="M20 15a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',tour:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z"/>',capture:'<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',more:'<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',list:'<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',self:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',help:'<path d="M9.2 9a2.9 2.9 0 1 1 4.2 2.6c-.9.45-1.4 1.05-1.4 2.1"/><circle cx="12" cy="17.4" r="1" fill="currentColor" stroke="none"/>',dress:'<path d="M9 4l3 3 3-3M9 4l-1.5 5 4.5 3 4.5-3L18 4M7.5 9l-2 8h13l-2-8"/>'};function o(f){const O=document.createElement("span");return O.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+e[f]+"</svg>",O.firstChild}function n(f,O,T,H){const I=s("button",{className:f,type:"button","aria-label":O});I.appendChild(o(T)),I.appendChild(s("span",{className:"lu-dock-label",text:H}));const Y=s("div",{className:"lu-dock-wrap"},[I]);return{b:I,wrap:Y}}const a=n("lu-dock-btn","채팅 열기/닫기","chat","채팅"),r=a.b;a.wrap.style.display="none",r.addEventListener("click",t);const i=n("lu-dock-btn","투어 시작/종료","tour","투어"),l=i.b;l.addEventListener("click",()=>{typeof yt.onTour=="function"&&yt.onTour()});const c=n("lu-dock-btn lu-gold","사진 촬영","capture","캡처"),d=c.b;d.addEventListener("click",()=>{d.classList.remove("lu-cap-pop"),d.offsetWidth,d.classList.add("lu-cap-pop"),typeof yt.onCapture=="function"&&yt.onCapture()});const g=n("lu-dock-btn","더보기","more","메뉴"),u=g.b,p=s("div",{id:"lu-more-backdrop"}),y=s("div",{id:"lu-more-sheet"});function x(){y.classList.remove("lu-open"),p.classList.remove("lu-open")}function m(f,O,T){const H=s("button",{className:"lu-sheet-btn",type:"button"});return H.appendChild(o(f)),H.appendChild(s("span",{text:O})),H.addEventListener("click",()=>{x(),T()}),H}const v=s("div",{className:"lu-sheet-grid"},[m("list","작품 목록",()=>va()),m("self","내 모습",()=>{typeof yt.onSelfView=="function"&&yt.onSelfView()}),m("dress","캐릭터 디자인",()=>Zo()),m("chat","채팅",t),m("help","조작법",()=>{const f=document.getElementById("lu-controls");f&&f.classList.toggle("lu-collapsed")})]);y.append(s("div",{className:"lu-sheet-handle"}),v),p.addEventListener("click",x),u.addEventListener("click",()=>{const f=y.classList.toggle("lu-open");p.classList.toggle("lu-open",f)}),document.body.appendChild(p),document.body.appendChild(y);const h=s("div",{id:"lu-dock",className:"lu lu-hud"},[a.wrap,i.wrap,c.wrap,g.wrap]);return document.body.appendChild(h),jt={chatBtn:r,chatWrap:a.wrap,tourBtn:l,selfBtn:null,dock:h},h}let jt=null;function ao(t,e){jt&&t==="tour"&&jt.tourBtn&&jt.tourBtn.classList.toggle("lu-on",!!e)}function Wi(){const t=s("span",{text:"--"}),e=s("div",{className:"lu-stat"});e.append("FPS ");const o=s("b");o.appendChild(t),e.appendChild(o);const n=s("div",{id:"lu-topright",className:"lu lu-hud"},[e]);return document.body.appendChild(n),{wrap:n,fps:t,count:s("span"),countWrap:null}}function Vi(){const t=s("div",{id:"lu-status",className:"lu lu-hud"});return document.body.appendChild(t),t}function Ki(){const t=s("div",{id:"lu-chat-log"}),e=s("input",{id:"lu-chat-input",type:"text",maxlength:"120",placeholder:Zt?"탭하여 채팅…":"Enter 키로 채팅…",autocomplete:"off",spellcheck:"false"}),o=s("div",{id:"lu-chat",className:"lu lu-hud"},[t,e]);return Zt&&o.classList.add("lu-chat-collapsed"),document.body.appendChild(o),e.addEventListener("keydown",n=>{if(n.stopPropagation(),n.key==="Enter"){const a=e.value.trim();e.value="",e.blur(),a&&typeof st.onChatSend=="function"&&st.onChatSend(a)}else n.key==="Escape"&&(e.value="",e.blur())}),e.addEventListener("keyup",n=>n.stopPropagation()),e.addEventListener("keypress",n=>n.stopPropagation()),{wrap:o,log:t,input:e}}function Zi(){const t=s("div",{className:"lu-art-eyebrow",text:"ARTWORK"}),e=s("div",{className:"lu-art-title"}),o=s("div",{className:"lu-art-meta"}),n=s("div",{className:"lu-art-rule"}),a=s("div",{className:"lu-art-desc"}),r=s("button",{className:"lu-art-hint",type:"button"});Zt?r.appendChild(document.createTextNode("크게 보기")):(r.appendChild(s("span",{className:"lu-key",text:"E"})),r.appendChild(document.createTextNode(" — 크게 보기"))),r.addEventListener("click",l=>{l.stopPropagation(),typeof yt.onViewArtwork=="function"&&yt.onViewArtwork()});const i=s("div",{id:"lu-artwork",className:"lu"},[t,e,o,n,a,r]);return Zt&&i.addEventListener("click",()=>{typeof yt.onViewArtwork=="function"&&yt.onViewArtwork()}),document.body.appendChild(i),{panel:i,title:e,meta:o,desc:a}}function qi(){const t=s("span",{className:"lu-topbar-title"}),e=s("b",{text:"1"}),o=s("span",{className:"lu-topbar-count"});o.appendChild(e),o.append(" 명");const n=s("div",{id:"lu-topbar",className:"lu lu-hud lu-cut-s lu-empty"},[t,s("span",{className:"lu-topbar-sep"}),o]);return document.body.appendChild(n),n._count=e,n._countWrap=o,n}function Ji(){const t=s("button",{id:"lu-lightbox-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{className:"lu-lightbox-stage"}),o=s("div",{className:"lu-lightbox-title"}),n=s("div",{className:"lu-lightbox-meta"}),a=s("div",{className:"lu-lightbox-rule"}),r=s("div",{className:"lu-lightbox-desc"}),i=s("div",{className:"lu-lightbox-caption"},[o,n,a,r]),l=s("div",{id:"lu-lightbox",className:"lu"},[t,e,i]);document.body.appendChild(l),t.addEventListener("click",()=>Ve()),l.addEventListener("click",I=>{(I.target===l||I.target===e)&&Ve()});const c=new Map;let d=1,g=0,u=0,p=0,y=1,x=0,m=0,v=0,h=null;function f(){return e.querySelector(".lu-lightbox-media")}function O(){const I=f();I&&(I.style.transform=`translate(${g}px, ${u}px) scale(${d})`)}function T(){d=1,g=0,u=0,O()}l.addEventListener("pointerdown",I=>{if(c.set(I.pointerId,{x:I.clientX,y:I.clientY}),c.size===1&&(h={x:I.clientX,y:I.clientY,t:performance.now()}),c.size===2){const[Y,w]=[...c.values()];p=Math.hypot(Y.x-w.x,Y.y-w.y),y=d}}),l.addEventListener("pointermove",I=>{const Y=c.get(I.pointerId);if(!Y)return;const w=I.clientX-Y.x,S=I.clientY-Y.y;if(Y.x=I.clientX,Y.y=I.clientY,c.size===2&&p>0){const[z,N]=[...c.values()];d=Math.min(4,Math.max(1,y*(Math.hypot(z.x-N.x,z.y-N.y)/p))),d===1&&(g=0,u=0),O()}else c.size===1&&d>1&&(g+=w,u+=S,O())});function H(I){if(c.delete(I.pointerId),c.size!==0||!h)return;const Y=performance.now()-h.t,w=I.clientX-h.x,S=I.clientY-h.y;if(h=null,d===1&&Y<600){if(Math.abs(w)>64&&Math.abs(S)<56){Qi(w<0?1:-1);return}if(S>84&&Math.abs(w)<60){Ve();return}}if(Math.abs(w)<12&&Math.abs(S)<12&&Y<350){const z=performance.now();if(z-x<320&&Math.hypot(I.clientX-m,I.clientY-v)<44){d>1?T():(d=2.4,O()),x=0;return}x=z,m=I.clientX,v=I.clientY}}return l.addEventListener("pointerup",H),l.addEventListener("pointercancel",I=>c.delete(I.pointerId)),{overlay:l,closeBtn:t,stage:e,title:o,meta:n,rule:a,desc:r,resetZoom:T}}let Po=null;function Qi(t){const e=Je();if(!Po||e.length<2)return;const o=e.indexOf(Po),n=e[((o===-1?0:o)+t+e.length)%e.length];ya(n)}const Mn="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#eaeae6"/></svg>');function ha(t){const e=b.artworkList.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(s("div",{className:"lu-artlist-empty",text:"표시할 작품이 없습니다"}));return}t.forEach(o=>{const n=s("img",{className:"lu-artlist-thumb",src:o.imageUrl||Mn,alt:o.title||"",loading:"lazy"});n.addEventListener("error",()=>{n.src=Mn},{once:!0});const a=s("div",{className:"lu-artlist-info"},[s("div",{className:"lu-artlist-name",text:o.title||""}),s("div",{className:"lu-artlist-artist",text:o.artist||""})]),r=s("button",{type:"button",className:"lu-artlist-card"},[n,a]);r.addEventListener("click",()=>{Ee(),typeof Ao=="function"&&Ao(o)}),e.appendChild(r)})}function ts(){const t=s("button",{id:"lu-artlist-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{id:"lu-artlist-head"},[s("div",{id:"lu-artlist-title",text:"작품 목록"}),t]),o=s("div",{id:"lu-artlist-body"}),n=s("div",{id:"lu-artlist",className:"lu"},[e,o]);return document.body.appendChild(n),t.addEventListener("click",()=>Ee()),{panel:n,body:o}}function es(t){const e=Date.now(),o=Math.max(0,e-t),n=Math.floor(o/6e4);if(n<1)return"방금 전";if(n<60)return`${n}분 전`;const a=Math.floor(n/60);if(a<24)return`${a}시간 전`;const r=new Date(t),i=new Date(e),l=p=>new Date(p.getFullYear(),p.getMonth(),p.getDate()).getTime();if(Math.round((l(i)-l(r))/864e5)<=1)return"어제";const d=r.getFullYear(),g=String(r.getMonth()+1).padStart(2,"0"),u=String(r.getDate()).padStart(2,"0");return`${d}.${g}.${u}`}function ga(t){const e=b.guestbook.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(s("div",{className:"lu-gbook-empty",text:"첫 방명록을 남겨보세요"}));return}const o=["#e07a5f","#81b29a","#5f9e7d","#8e7dbe","#6a8caf","#d68fb8"];t.forEach(n=>{const a=n.name||"게스트";let r=0;for(let d=0;d<a.length;d++)r=r*31+a.charCodeAt(d)>>>0;const i=s("span",{className:"lu-gbook-dot"});i.style.background=o[r%o.length];const l=s("div",{},[i,s("span",{className:"lu-gbook-name",text:a}),s("span",{className:"lu-gbook-time",text:es(n.ts)})]),c=s("div",{className:"lu-gbook-text",text:n.text||""});e.appendChild(s("div",{className:"lu-gbook-note"},[l,c]))})}function os(){const t=s("button",{id:"lu-guestbook-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{id:"lu-guestbook-head"},[s("div",{id:"lu-guestbook-title"},[s("span",{className:"lu-gb-eyebrow",text:"GUESTBOOK"}),s("span",{className:"lu-gb-main",text:"방명록"}),s("span",{className:"lu-gb-sub",text:"다녀간 마음을 한 줄 남겨 주세요"})]),t]),o=s("div",{id:"lu-guestbook-body"}),n=s("textarea",{id:"lu-gbook-input",rows:"3",maxlength:String(De),placeholder:"전시에 한 줄 메모를 남겨보세요…",spellcheck:"false"}),a=s("span",{className:"lu-gbook-count",text:`0/${De}`}),r=s("button",{id:"lu-gbook-submit",type:"button",text:"남기기"});r.disabled=!0;const i=s("div",{className:"lu-gbook-footer-row"},[a,r]),l=s("div",{id:"lu-gbook-stats",style:"font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.45);padding:6px 2px 0;"}),c=s("div",{id:"lu-guestbook-footer"},[n,i,l]),d=s("button",{id:"lu-gbtab",type:"button","aria-label":"방명록 열기/닫기 (위아래로 드래그해 위치 이동)",title:"드래그해서 위치를 옮길 수 있어요",text:"방명록"}),g="lu-gbtab-top-v1";try{const h=parseFloat(localStorage.getItem(g));Number.isFinite(h)&&(d.style.top=u(h)+"px")}catch{}function u(h){const f=Math.max(80,(window.innerHeight||800)-140);return Math.min(f,Math.max(60,h))}let p=null;d.addEventListener("pointerdown",h=>{const f=d.getBoundingClientRect();p={startY:h.clientY,startTop:f.top,moved:!1},d.setPointerCapture(h.pointerId)}),d.addEventListener("pointermove",h=>{if(!p)return;const f=h.clientY-p.startY;Math.abs(f)>6&&(p.moved=!0),p.moved&&(d.style.top=u(p.startTop+f)+"px")});const y=()=>{if(p&&p.moved)try{localStorage.setItem(g,String(parseFloat(d.style.top)))}catch{}setTimeout(()=>{p=null},0)};d.addEventListener("pointerup",y),d.addEventListener("pointercancel",y),d.addEventListener("click",()=>{p&&p.moved||Oo()});const x=s("div",{id:"lu-guestbook",className:"lu"},[e,o,c,d]);document.body.appendChild(x),t.addEventListener("click",()=>qo());function m(){const h=n.value.length;a.textContent=`${h}/${De}`,r.disabled=n.value.trim().length===0}function v(){const h=n.value.trim().slice(0,De);h&&(n.value="",m(),n.blur(),typeof Ro=="function"&&Ro(h))}return n.addEventListener("keydown",h=>{h.stopPropagation(),h.key==="Escape"?(n.value="",m(),n.blur()):h.key==="Enter"&&(h.ctrlKey||h.metaKey)&&(h.preventDefault(),v())}),n.addEventListener("keyup",h=>h.stopPropagation()),n.addEventListener("keypress",h=>h.stopPropagation()),n.addEventListener("input",m),r.addEventListener("click",v),{panel:x,body:o,input:n,count:a,submitBtn:r,tab:d}}function ns(){const t=s("button",{type:"button","aria-label":"이전 작품",text:"◀ 이전"}),e=s("span",{className:"lu-tour-sep"}),o=s("span",{className:"lu-tour-count"}),n=s("span",{className:"lu-tour-title"}),a=s("span",{className:"lu-tour-sep"}),r=s("button",{type:"button","aria-label":"다음 작품",text:"다음 ▶"}),i=s("span",{className:"lu-tour-sep"}),l=s("button",{type:"button",className:"lu-tour-auto"}),c=s("span",{className:"lu-tour-sep"}),d=s("button",{id:"lu-tourbar-exit",type:"button","aria-label":"투어 종료",text:"✕ 종료"}),g=s("div",{id:"lu-tourbar",className:"lu"},[t,e,o,n,a,r,i,l,c,d]);return document.body.appendChild(g),t.addEventListener("click",()=>{Et.onPrev&&Et.onPrev()}),r.addEventListener("click",()=>{Et.onNext&&Et.onNext()}),d.addEventListener("click",()=>{Et.onExit&&Et.onExit()}),l.addEventListener("click",()=>{Et.onToggleAuto&&Et.onToggleAuto()}),{bar:g,prevBtn:t,nextBtn:r,autoBtn:l,exitBtn:d,countEl:o,titleEl:n}}function as(){const t=s("div",{id:"lu-shutter",className:"lu"});return document.body.appendChild(t),t}function rs(){const t=s("button",{id:"lu-share-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{className:"lu-share-title",text:"전시 공유하기"}),o=s("img",{className:"lu-share-preview",alt:"캡처한 전시 화면"}),n=s("button",{className:"lu-share-btn lu-share-btn-primary",type:"button",text:"기기로 공유"}),a=s("button",{className:"lu-share-btn",type:"button",text:"이미지 저장"}),r=s("button",{className:"lu-share-btn",type:"button",text:"X에 공유"}),i=s("button",{className:"lu-share-btn",type:"button",text:"Threads에 공유"}),l=s("button",{className:"lu-share-btn",type:"button",text:"링크 복사"}),c=s("div",{className:"lu-share-actions"},[n,a,r,i,l]),d=s("div",{className:"lu-share-hint",text:"인스타그램은 이미지를 저장하거나 기기로 공유한 뒤 앱에서 올려주세요"}),g=s("div",{className:"lu-share-card"},[t,e,o,c,d]),u=s("div",{id:"lu-share",className:"lu"},[g]);return document.body.appendChild(u),t.addEventListener("click",()=>Bo()),u.addEventListener("click",p=>{p.target===u&&Bo()}),n.addEventListener("click",async()=>{if(!(!ut.blob||typeof navigator>"u"||typeof navigator.share!="function"))try{const p=new File([ut.blob],"artshow.png",{type:"image/png"});await navigator.share({files:[p],title:ut.galleryName||"OpenArtShow",text:`${ut.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`})}catch{}}),a.addEventListener("click",()=>{if(!ut.dataUrl)return;const p=document.createElement("a");p.href=ut.dataUrl,p.download="artshow.png",document.body.appendChild(p),p.click(),document.body.removeChild(p)}),r.addEventListener("click",()=>{const p=`${ut.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`,y=`https://twitter.com/intent/tweet?text=${encodeURIComponent(p)}&url=${encodeURIComponent(ut.shareUrl||"")}`;window.open(y,"_blank","noopener")}),i.addEventListener("click",()=>{const p=`${ut.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시 ${ut.shareUrl||""}`,y=`https://www.threads.net/intent/post?text=${encodeURIComponent(p)}`;window.open(y,"_blank","noopener")}),l.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(ut.shareUrl||""),Ut&&clearTimeout(Ut),l.textContent="복사됨",l.classList.add("lu-share-btn-copied"),Ut=setTimeout(()=>{l.textContent="링크 복사",l.classList.remove("lu-share-btn-copied"),Ut=null},1600)}catch{}}),{overlay:u,card:g,title:e,preview:o,deviceBtn:n,saveBtn:a,xBtn:r,threadsBtn:i,copyBtn:l}}function Zo(){!b||!b.chibiMaker||re.chibiOpen||Wt||qt||Kt||Vt||b.chibiMaker.open()}function is(){b&&b.chibiMaker&&b.chibiMaker.close()}function ss(){window.addEventListener("keydown",t=>{if(t.key==="Escape"){if(re.chibiOpen){t.preventDefault(),t.stopImmediatePropagation(),is();return}if(qt){t.preventDefault(),t.stopImmediatePropagation(),Bo();return}if(Wt){t.preventDefault(),t.stopImmediatePropagation(),Ve();return}if(Vt){t.preventDefault(),t.stopImmediatePropagation(),Ee();return}if(Kt){t.preventDefault(),t.stopImmediatePropagation(),qo();return}return}if(Wt||qt||!re.entered)return;const e=document.activeElement;e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA")||(t.key==="Enter"?(t.preventDefault(),t.stopPropagation(),b.chat.input.focus()):(t.key==="c"||t.key==="C"||t.key==="ㅊ")&&!re.chibiOpen&&(t.preventDefault(),t.stopPropagation(),Zo()))})}function ls({onEnter:t,onChatSend:e,onAvatarChange:o,onMakerToggle:n}={}){if(Cn){st.onEnter=t||st.onEnter,st.onChatSend=e||st.onChatSend,st.onAvatarChange=o||st.onAvatarChange,st.onMakerToggle=n||st.onMakerToggle;return}Cn=!0,st.onEnter=t||null,st.onChatSend=e||null,st.onAvatarChange=o||null,st.onMakerToggle=n||null,Li(),b={loading:Yi(),lobby:Ui(),controls:ji(),topRight:Wi(),status:Vi(),chat:Ki(),artwork:Zi(),galleryTitle:qi(),lightbox:Ji(),artworkList:ts(),guestbook:os(),tourBar:ns(),dock:$i(),shutter:as(),share:rs()},b.chibiMaker=Xi({els:b,state:re,callbacks:st,setStatus:rt}),b.topRight.count=b.galleryTitle._count,b.topRight.countWrap=b.galleryTitle._countWrap,ss(),oo!==null&&ma(oo),Rt&&xa(Rt.galleries,Rt.currentId,Rt.onPick),no&&ha(no),eo&&ga(eo)}function Ln(t){b&&b.loading.classList.toggle("lu-hidden",!t)}function cs(){if(!b)return;re.entered=!0,b.lobby.overlay.classList.add("lu-hidden"),b.controls.classList.add("lu-visible"),b.topRight.wrap.classList.add("lu-visible"),b.status.classList.add("lu-visible"),b.chat.wrap.classList.add("lu-visible"),b.galleryTitle.classList.add("lu-visible"),b.guestbook.tab.classList.add("lu-visible"),b.dock&&b.dock.classList.add("lu-visible");const t=document.getElementById("lu-controls-toggle");t&&t.classList.add("lu-visible")}function ds(t){!b||!t||No===t.id&&b.artwork.panel.classList.contains("lu-open")||(No=t.id,b.artwork.title.textContent=t.title||"",b.artwork.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),b.artwork.desc.textContent=t.desc||"",b.artwork.panel.classList.add("lu-open"))}function us(){b&&(No=null,b.artwork.panel.classList.remove("lu-open"))}function ba(t,e,o){if(!b)return;const n=s("div",{className:"lu-chat-msg"+(o?" lu-self":"")},[s("span",{className:"lu-chat-name",text:t}),s("span",{text:e})]);for(b.chat.log.appendChild(n);b.chat.log.children.length>Fi;)b.chat.log.removeChild(b.chat.log.firstChild)}function ps(t){if(!b)return;const e=b.topRight.count.textContent;b.topRight.count.textContent=String(t),e!==String(t)&&b.topRight.countWrap&&(b.topRight.countWrap.classList.remove("lu-tick"),b.topRight.countWrap.offsetWidth,b.topRight.countWrap.classList.add("lu-tick")),jt&&jt.chatWrap&&(jt.chatWrap.style.display=t>=2?"":"none")}function rt(t){b&&(b.status.textContent=t||"")}function fs(t){b&&(b.topRight.fps.textContent=String(Math.round(t)))}function ma(t){b.galleryTitle.querySelector(".lu-topbar-title").textContent=t||"",b.galleryTitle.classList.toggle("lu-empty",!t)}function hs(t){oo=t||"",b&&ma(oo)}function xa(t,e,o){const n=b.lobby.pickerBox;if(n.innerHTML="",!Array.isArray(t)||t.length===0)return;const a=s("div",{className:"lu-field-label",text:"전시 선택",style:"margin-top:26px;"});n.appendChild(a),e==null&&n.appendChild(s("div",{className:"lu-picker-note",text:"공유된 전시 관람 중"}));const r=s("div",{className:"lu-picker-list"});t.forEach(i=>{const l=i.id===e,c=s("button",{type:"button",className:"lu-picker-item"+(l?" lu-picker-current":"")},[s("div",{className:"lu-picker-name",text:i.name||i.id}),s("div",{className:"lu-picker-meta",text:[i.artist,typeof i.count=="number"?`${i.count}점`:null].filter(Boolean).join(" · ")})]);l&&(c.disabled=!0),c.addEventListener("click",()=>{l||typeof o=="function"&&o(i.id)}),r.appendChild(c)}),n.appendChild(r)}function gs(t,e,o){Rt={galleries:t,currentId:e??null,onPick:o},b&&xa(Rt.galleries,Rt.currentId,Rt.onPick)}function wa(){const t=b.lightbox.stage,e=t.firstChild;e&&e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),t.innerHTML=""}function ya(t){if(!b||!t)return;Po=t,b.lightbox.resetZoom&&b.lightbox.resetZoom(),Yt&&(clearTimeout(Yt),Yt=null),wa();let e;t.videoUrl?(e=s("video",{className:"lu-lightbox-media",src:t.videoUrl,controls:"controls",autoplay:"autoplay",loop:"loop",muted:"muted",playsinline:"playsinline"}),e.muted=!0):e=s("img",{className:"lu-lightbox-media",src:t.imageUrl||"",alt:t.title||""}),b.lightbox.stage.appendChild(e),b.lightbox.title.textContent=t.title||"",b.lightbox.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),b.lightbox.desc.textContent=t.desc||"",Wt=!0,b.lightbox.overlay.classList.add("lu-open")}function Ve(){!b||!Wt||(Wt=!1,b.lightbox.overlay.classList.remove("lu-open"),Yt&&clearTimeout(Yt),Yt=setTimeout(()=>{wa(),Yt=null},340),typeof Io=="function"&&Io())}function Jt(){return Wt}function bs(t){Io=typeof t=="function"?t:null}function ms(t,e){Ao=typeof e=="function"?e:null,no=t,b&&ha(no)}function va(){b&&(Vt?Ee():(Vt=!0,b.artworkList.panel.classList.add("lu-open")))}function Ee(){!b||!Vt||(Vt=!1,b.artworkList.panel.classList.remove("lu-open"))}function ka(){return Vt}function xs({index:t,total:e,title:o,autoOn:n}={}){if(!b)return;const a=b.tourBar,r=Number.isFinite(t)?t+1:1,i=Number.isFinite(e)?e:0;a.countEl.textContent=`● ${r} / ${i}`,a.titleEl.textContent=` — ${o||""}`,a.autoBtn.textContent=n?"자동진행 ON":"자동진행 OFF",a.autoBtn.classList.toggle("lu-tour-on",!!n),a.bar.classList.add("lu-open")}function ws(){b&&b.tourBar.bar.classList.remove("lu-open")}function ys({onTour:t,onViewArtwork:e,onGuestbook:o,onCapture:n,onSelfView:a}={}){yt={onTour:typeof t=="function"?t:null,onViewArtwork:typeof e=="function"?e:null,onGuestbook:typeof o=="function"?o:null,onCapture:typeof n=="function"?n:null,onSelfView:typeof a=="function"?a:null}}function vs({blob:t,dataUrl:e,galleryName:o,shareUrl:n}={}){if(!b)return;ut={blob:t||null,dataUrl:e||"",galleryName:o||"",shareUrl:n||(typeof window<"u"?window.location.href:"")},b.share.preview.src=ut.dataUrl;let a=!1;if(ut.blob&&typeof navigator<"u"&&typeof navigator.share=="function"&&typeof navigator.canShare=="function")try{const r=new File([ut.blob],"artshow.png",{type:"image/png"});a=navigator.canShare({files:[r]})}catch{a=!1}b.share.deviceBtn.style.display=a?"":"none",Ut&&(clearTimeout(Ut),Ut=null),b.share.copyBtn.textContent="링크 복사",b.share.copyBtn.classList.remove("lu-share-btn-copied"),qt=!0,b.share.overlay.classList.add("lu-open")}function Bo(){!b||!qt||(qt=!1,b.share.overlay.classList.remove("lu-open"))}function mo(){return qt}function Tn(){if(!b)return;const t=b.shutter;t.style.transition="none",t.style.opacity="1",t.offsetWidth,t.style.transition="opacity 0.25s ease",t.style.opacity="0"}function ks({onPrev:t,onNext:e,onExit:o,onToggleAuto:n}={}){Et={onPrev:typeof t=="function"?t:null,onNext:typeof e=="function"?e:null,onExit:typeof o=="function"?o:null,onToggleAuto:typeof n=="function"?n:null}}function Ss(t){const e=document.getElementById("lu-gbook-stats");e&&(e.textContent=t||"")}function Es({onSubmit:t}={}){Ro=typeof t=="function"?t:null}function Oo(){b&&(Kt?qo():(Kt=!0,b.guestbook.panel.classList.add("lu-open")))}function qo(){!b||!Kt||(Kt=!1,b.guestbook.panel.classList.remove("lu-open"))}function Cs(){return Kt}function Jo(t){eo=Array.isArray(t)?t:[],b&&ga(eo)}function Ms(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}function Ls(t,e,o){let n=(e-t)%(Math.PI*2);return n>Math.PI&&(n-=Math.PI*2),n<-Math.PI&&(n+=Math.PI*2),t+n*o}function Ts(t){if(t!=="auto")return t;const e=new Date().getHours();return e>=6&&e<16?"daylight":e>=16&&e<19?"sunset":"night"}function zs(t){let e=5381;for(let o=0;o<t.length;o++)e=(e<<5)+e+t.charCodeAt(o)>>>0;return e.toString(36)}const _s=24,Ns=45,Is=3,Do="lu-spec-v2",Sa=4;function Go(){try{const t=localStorage.getItem(Do);if(t){const e=JSON.parse(t);return e&&e.gen===Sa&&(e.v==="low"||e.v==="high")?e.v:null}return null}catch{return null}}function xo(t){try{t?localStorage.setItem(Do,JSON.stringify({v:t,gen:Sa})):localStorage.removeItem(Do),localStorage.removeItem("lu-spec-v1"),localStorage.removeItem("lu-lowspec-v1")}catch{}}const Ke={low:83e5,base:11e6,high:18e6},As=/swiftshader|llvmpipe|softpipe|software (?:rasterizer|renderer|adapter)|microsoft basic render|\bwarp\b|gdi generic|mesa offscreen|apple software renderer/i;function Rs(){const t={name:"",soft:!1};try{const e=document.createElement("canvas"),n=!(e.getContext("webgl2",{failIfMajorPerformanceCaveat:!0})||e.getContext("webgl",{failIfMajorPerformanceCaveat:!0})),a=document.createElement("canvas"),r=a.getContext("webgl2")||a.getContext("webgl");if(!r)return{name:"",soft:!0};const i=r.getExtension("WEBGL_debug_renderer_info");t.name=String(i&&r.getParameter(i.UNMASKED_RENDERER_WEBGL)||r.getParameter(r.RENDERER)||""),t.soft=As.test(t.name)||n;const l=r.getExtension("WEBGL_lose_context");l&&l.loseContext()}catch{}return t}function Ps(t){function e(a){if(a.code==="KeyE"){t.viewCurrentArtwork();return}if(a.code==="KeyM"){if(!t.isEntered()||t.isLightboxOpen())return;t.toggleArtworkList();return}if(a.code==="KeyT"){if(!t.isEntered())return;t.toggleTour();return}if(a.code==="KeyG"){if(!t.isEntered()||t.isLightboxOpen())return;t.toggleGuestbook();return}if(a.code==="KeyP"){if(!t.isEntered()||t.isShareModalOpen())return;t.flashShutter(),t.capturePhoto();return}if(a.code==="KeyV"){if(!t.isEntered()||t.isShareModalOpen())return;t.toggleSelfView();return}if(t.isTouring()&&(a.code==="ArrowLeft"||a.code==="ArrowRight")){if(t.isLightboxOpen())return;a.preventDefault(),a.code==="ArrowLeft"?t.tourPrev():t.tourNext();return}a.code==="Escape"&&t.isTouring()&&!t.isLightboxOpen()&&!t.isArtworkListOpen()&&!t.isGuestbookOpen()&&t.exitTour()}function o(){const a=t.getCamera(),r=t.getRenderer();a.aspect=window.innerWidth/window.innerHeight,a.updateProjectionMatrix(),r.setSize(window.innerWidth,window.innerHeight)}function n(){const a=t.getMp();if(a)try{a.dispose()}catch{}}return{onKeyDown:e,onWindowResize:o,onBeforeUnload:n}}function Bs(t){const e=t.split(",")[1],o=atob(e),n=new Uint8Array(o.length);for(let a=0;a<o.length;a++)n[a]=o.charCodeAt(a);return new Blob([n],{type:"image/png"})}function Os(t,e,o,n){const a=Math.max(90,Math.round(o*.14)),r=t.createLinearGradient(0,o-a,0,o);r.addColorStop(0,"rgba(0,0,0,0)"),r.addColorStop(1,"rgba(0,0,0,0.55)"),t.fillStyle=r,t.fillRect(0,o-a,e,a);const i=Math.max(20,Math.round(e*.025)),l=Math.max(1,e/1400);t.textBaseline="alphabetic",t.textAlign="left",t.fillStyle="rgba(255,255,255,0.95)",t.font=`300 ${Math.round(18*l)}px ${xe()}`,t.fillText(n||"OpenArtShow 전시",i,o-i-6*l),t.fillStyle="#5f9e7d",t.font=`300 ${Math.round(16*l)}px ${xe()}`,Ds(t,"OpenArtShow",e-i,o-i-22*l,2.5*l),t.textAlign="right",t.fillStyle="rgba(255,255,255,0.6)",t.font=`300 ${Math.round(12*l)}px ${xe()}`,t.fillText("syhongart.github.io/openartshow",e-i,o-i-4*l)}function Ds(t,e,o,n,a){const r=Array.from(e),i=r.map(g=>t.measureText(g).width),l=i.reduce((g,u)=>g+u,0)+a*(r.length-1),c=t.textAlign;t.textAlign="left";let d=o-l;r.forEach((g,u)=>{t.fillText(g,d,n),d+=i[u]+a}),t.textAlign=c}function Gs(){const t=window.location.href;return t.length<2e3?t:window.location.origin+window.location.pathname.replace(/index\.html$/,"landing.html")}function Hs(t){const{getRenderer:e,getScene:o,getCamera:n,isThirdPerson:a,getSelfAvatar:r,applySelfCamOffset:i,restoreSelfCamOffset:l,getGalleryInfo:c,photoWall:d,getMyNickname:g,getMp:u,showShareModal:p,setStatus:y}=t;function x(){const m=e(),v=o(),h=n();if(!(!m||!v||!h))try{a()&&r()&&i(),m.render(v,h),a()&&r()&&l();const f=m.domElement.toDataURL("image/png"),O=new Image;O.onload=()=>{const T=document.createElement("canvas");T.width=O.width,T.height=O.height;const H=T.getContext("2d");if(!H)return;H.drawImage(O,0,0);const I=H.createRadialGradient(T.width/2,T.height*.46,Math.min(T.width,T.height)*.4,T.width/2,T.height*.46,Math.max(T.width,T.height)*.72);I.addColorStop(0,"rgba(8,6,4,0)"),I.addColorStop(.24,"rgba(8,6,4,0.03)"),I.addColorStop(.44,"rgba(8,6,4,0.09)"),I.addColorStop(.64,"rgba(8,6,4,0.17)"),I.addColorStop(.82,"rgba(8,6,4,0.26)"),I.addColorStop(1,"rgba(8,6,4,0.34)"),H.fillStyle=I,H.fillRect(0,0,T.width,T.height),Os(H,T.width,T.height,c()?c().name:"");const Y=T.toDataURL("image/png");try{const S=Math.round(T.height/T.width*360),z=document.createElement("canvas");z.width=360,z.height=S,z.getContext("2d").drawImage(T,0,0,360,S);const N=z.toDataURL("image/jpeg",.72),E=d.addLocal(g(),c()?c().name:"",N);E&&u()&&u().sendPhoto(E)}catch(w){console.warn("포토월 썸네일 생성 실패 (캡처 자체는 정상):",w)}p({blob:Bs(Y),dataUrl:Y,galleryName:c()&&c().name||"OpenArtShow 전시",shareUrl:Gs()})},O.onerror=()=>{y("사진 촬영에 실패했습니다.")},O.src=f}catch(f){console.error("사진 촬영 실패:",f),y("사진 촬영에 실패했습니다.")}}return{capturePhoto:x}}let F=null,bt=null,Z=null,K=null,Ho=null,X=null,so=null,Ea=null,ne=null,fe=null;const Xs=new Er;let Gt=!1,he=0,wo=0,Xo=0,yo=0,zn=!1,ht={name:"",soft:!1};function Fs(t,e){const o=document.createElement("div");o.id="lu-gpu-notice",o.style.cssText=`position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:1200;max-width:min(92vw,600px);background:linear-gradient(180deg,#fffdf8,#f6f1e4);color:#17140f;border:1px solid rgba(95,158,125,0.55);border-radius:14px;padding:14px 44px 14px 18px;box-shadow:0 12px 32px rgba(20,15,8,0.35);font:13px/1.75 ${xe()};`;const n="<b>이 브라우저에서 3D 그래픽 기능을 사용할 수 없습니다</b><br>";o.innerHTML=n+'<b>Chrome</b>: 설정 → 시스템(<b>chrome://settings/system</b>) → "그래픽 가속 사용" 켜기 → 다시 시작<br><b>Edge</b>: 설정 → 시스템 및 성능 → "그래픽 가속 사용" 켜기 + "효율 모드" 끄기<br><b>Firefox</b>: 설정 → 일반 → 성능 → "권장 성능 설정" 해제 → "하드웨어 가속 사용" 체크<br>그래도 느리면: 원격 데스크톱 여부 확인 · 그래픽 드라이버 업데이트 · Windows 설정 → 디스플레이 → 그래픽에서 브라우저를 "고성능" GPU로 지정 · 확장프로그램 없는 시크릿 창으로 접속해 비교';const a=document.createElement("button");a.type="button",a.setAttribute("aria-label","닫기"),a.textContent="×",a.style.cssText="position:absolute;top:8px;right:10px;width:26px;height:26px;border:none;background:none;font-size:18px;color:#8a8172;cursor:pointer;",a.addEventListener("click",()=>o.remove());const r=document.createElement("button");r.type="button",r.textContent="진단 정보 복사",r.style.cssText="display:inline-block;margin-top:8px;padding:5px 14px;border-radius:999px;border:1px solid rgba(95,158,125,0.5);background:rgba(95,158,125,0.12);color:#17140f;font:600 11px/1 inherit;cursor:pointer;",r.addEventListener("click",()=>{const i=JSON.stringify({renderer:t,ua:navigator.userAgent,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,cores:navigator.hardwareConcurrency||0,mem:navigator.deviceMemory||0});try{navigator.clipboard.writeText(i),r.textContent="복사됨!"}catch{}}),o.appendChild(r),o.appendChild(a),document.body.appendChild(o)}let Ge=0;const Ca="lu-onboard-v1";let zt=-1,ie=null,Fo=null,_n=0,vo=0;function Ys(){try{if(localStorage.getItem(Ca))return}catch{}if(!(typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches))return;zt=0;const t=K.getState();Fo={x:t.x,z:t.z};const e=document.createElement("style");e.textContent="@keyframes lu-ob-pulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} 70%{transform:translate(-50%,-50%) scale(1.25);opacity:0.2;} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} }",document.head.appendChild(e),ie=document.createElement("div"),ie.style.cssText="position:fixed;left:24%;bottom:22%;width:110px;height:110px;border-radius:50%;border:3px solid rgba(255,253,247,0.85);pointer-events:none;z-index:60;transform:translate(-50%,-50%);animation:lu-ob-pulse 1.6s ease-in-out infinite;",document.body.appendChild(ie),rt("왼쪽 화면을 누른 채 밀면 걸어요 🚶")}function Us(){if(zt<0)return;const t=K.getState();if(zt===0)Math.hypot(t.x-Fo.x,t.z-Fo.z)>1.5&&(zt=1,_n=t.ry,ie&&(ie.remove(),ie=null),rt("잘했어요! 오른쪽 화면을 쓸면 주위를 둘러봐요 👀"));else if(zt===1){let e=t.ry-_n;e=Math.atan2(Math.sin(e),Math.cos(e)),Math.abs(e)>.6&&(zt=2,vo=0,rt("작품에 다가가면 설명이 나타나요 — 어려우면 [투어] 버튼을 눌러요 🖼️"))}else if(zt===2&&(vo+=1,vo>420)){zt=-1;try{localStorage.setItem(Ca,"1")}catch{}}}function Nn(){if(!X)return;const t=[];for(const[e,o]of X.remoteAvatars)e.startsWith("npc-")&&t.push(o);if(!Gt){for(const e of t)e.group.visible=!0;return}t.sort((e,o)=>e.group.position.distanceTo(Z.position)-o.group.position.distanceTo(Z.position)),t.forEach((e,o)=>{e.group.visible=o<Is})}const Ma=new Cr;let ko=null;const La=3,js=.7,$s=-.2;let It=!1,tt=null,Pt=null,Ht=null,Ze=0;const Ta=new Jn,In=new Jn,za=new ar;function An(){if(at)if(It=!It,It){if(!tt&&Pt)try{tt=$o(Pt.char,Pt.color," "),tt.group.traverse(t=>{t.isSprite&&(t.visible=!1)}),bt.add(tt.group)}catch(t){console.warn("내 아바타 생성 실패:",t),tt=null,It=!1;return}if(!tt){It=!1;return}tt.group.visible=!0,ao("self",!0),Ht=null,Ze=0,rt("내 모습 보기 — V키 또는 [시점] 버튼으로 복귀")}else tt&&(tt.group.visible=!1,ao("self",!1))}function Ws(t){if(t){if(Pt=Pt?Object.assign({},Pt,{char:t}):{char:t},tt){const e=tt.group,o=e.visible,n=e.position.clone(),a=e.rotation.y;try{const r=$o(t,Pt.color||"#3498db"," ");r.group.traverse(i=>{i.isSprite&&(i.visible=!1)}),r.group.position.copy(n),r.group.rotation.y=a,r.group.visible=o,bt.add(r.group),bt.remove(e),tt.dispose(),tt=r}catch(r){console.warn("내 아바타 갱신 실패:",r)}}X&&typeof X.setChar=="function"&&X.setChar(t),rt("아야모 모습을 바꿨어요 ✨")}}function _a(){Ta.copy(Z.position),za.copy(Z.quaternion),In.set(0,0,1).applyQuaternion(Z.quaternion),Z.position.addScaledVector(In,La),Z.position.y+=js,Z.rotateX($s)}function Na(){Z.position.copy(Ta),Z.quaternion.copy(za)}const Vs=7,ge=new er,Rn=new Ot;let So=null;function Ks(t){t.addEventListener("pointerdown",e=>{e.isPrimary&&(So={x:e.clientX,y:e.clientY,t:performance.now()})}),t.addEventListener("pointerup",e=>{const o=So;if(So=null,!o||!e.isPrimary||!at||!X||performance.now()-o.t>450||Math.hypot(e.clientX-o.x,e.clientY-o.y)>7)return;const n=t.getBoundingClientRect();Rn.set((e.clientX-n.left)/n.width*2-1,-((e.clientY-n.top)/n.height)*2+1),ge.setFromCamera(Rn,Z),ge.far=Vs+La;const a=[...X.remoteAvatars.entries()];if(!a.length)return;const r=a.map(([,c])=>c.group),i=ge.intersectObjects(r,!0);if(i.length){let c=i[0].object;for(;c&&!r.includes(c);)c=c.parent;if(c){const[d]=a[r.indexOf(c)];X.sendHit(d);return}}ge.far=60;const l=ge.intersectObjects(hr(),!1);l.length&&l[0].object.userData.luArt&&Ra(l[0].object.userData.luArt)})}let Ia=null,lo="게스트",at=!1,Lt=null,pt=[],ro="shared",mt=[],Pn=!1,Eo=0,He=0,et=null;const Bn=.8,Zs=2.2;function Aa(t,e){const o=K.getState(),n=typeof t.y=="number"?t.y:o.y,a=t.x-o.x,r=n-o.y,i=t.z-o.z,l=Math.hypot(a,r,i),c=wt.clamp(Bn+l*.035,Bn,Zs);K.disable(),et={fromX:o.x,fromY:o.y,fromZ:o.z,fromRy:o.ry,toX:t.x,toY:n,toZ:t.z,toRy:t.ry,duration:c,elapsed:0,onDone:e||null}}const On=new Wn(0,0,0,"YXZ");function qs(t){if(!et)return;et.elapsed+=t;const e=Math.min(1,et.elapsed/et.duration),o=Ms(e),n=et.fromX+(et.toX-et.fromX)*o,a=et.fromY+(et.toY-et.fromY)*o,r=et.fromZ+(et.toZ-et.fromZ)*o,i=Ls(et.fromRy,et.toRy,o);if(Z.position.set(n,a,r),On.set(0,i,0,"YXZ"),Z.quaternion.setFromEuler(On),e>=1){const l=et.onDone;et=null,l&&l()}}let ft=!1,te=0,ke=!0,le=!1,ce=0;const Js=6;async function Qs(){Ln(!0),bt=new Zn,Z=new qn(55,window.innerWidth/window.innerHeight,.1,1e3),Z.position.set(M.spawn.x,Mt,M.spawn.z);const t=typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches,e=Go();ht=Rs(),console.info("[OpenArtShow] GPU:",ht.name||"(unknown)",ht.soft?"— SOFTWARE RENDERING":"");try{F=new Vn({antialias:!ht.soft,powerPreference:"high-performance"})}catch(u){throw Fs(""),u}Ks(F.domElement);const o=document.createElement("div");o.id="lu-vignette",o.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse 72% 62% at 50% 46%, rgba(8,6,4,0) 50%, rgba(8,6,4,0.03) 62%, rgba(8,6,4,0.09) 72%, rgba(8,6,4,0.17) 82%, rgba(8,6,4,0.26) 91%, rgba(8,6,4,0.34) 100%);",document.body.appendChild(o);const n=window.devicePixelRatio||1;let a;e==="low"?a=Math.min(n,1.25):e==="high"?a=Math.min(Math.max(n,2),2.5):t?a=Math.min(n,2):a=Math.min(Math.max(n,1.5),2);const r=e==="high"?Ke.high:e==="low"?Ke.low:Ke.base;a=Math.min(a,Math.sqrt(r/(window.innerWidth*window.innerHeight))),ht.soft&&(a=Math.min(a,.7),document.documentElement.classList.add("lu-potato")),F.setPixelRatio(a),F.setSize(window.innerWidth,window.innerHeight),F.shadowMap.enabled=!ht.soft,F.shadowMap.type=or,F.toneMapping=ht.soft?Kn:nr,F.toneMappingExposure=.92,F.outputColorSpace=Bt,document.body.appendChild(F.domElement);const i=await ir(),l=Ts(i.theme);ii(bt,l,{fullLights:!ht.soft&&e!=="low"}),await sr(),await lr(bt),window.__museum={scene:bt,camera:Z,renderer:F},ht.soft&&(bt.fog=null),F.shadowMap.autoUpdate=!1,F.shadowMap.needsUpdate=!0,Xo=l==="cycle"?2:0,Lt=i,hs(Lt.name),tl(),ro=i.id??"shared",mt=cr(ro),Jo(mt),Es({onSubmit:sl}),pt=Je(),ms(pt,Ra),ks({onPrev:Xn,onNext:Uo,onExit:Yo,onToggleAuto:al}),ys({onSelfView:()=>{at&&!mo()&&An()},onTour:()=>{at&&Hn()},onViewArtwork:Dn,onGuestbook:()=>{at&&!Jt()&&Oo()},onCapture:()=>{at&&!mo()&&(Tn(),Gn())}}),K=new xi(Z,F.domElement);const c=M.floors.find(u=>u.id===M.spawn.floor);K.setPose({x:M.spawn.x,y:(c?c.y:0)+Mt,z:M.spawn.z,ry:M.spawn.ry}),Ho=ki({player:K,getSelfAvatar:()=>tt}),K.disable(),setTimeout(()=>{const u=document.getElementById("lu-topright");u&&(u.style.cursor="pointer",u.title="클릭하면 성능 진단 정보가 복사됩니다",u.addEventListener("click",()=>{const p=JSON.stringify({gpu:ht.name,soft:ht.soft,pixelRatio:F?F.getPixelRatio():0,aa:F?F.getContext().getContextAttributes().antialias:null,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,inner:window.innerWidth+"x"+window.innerHeight,cores:navigator.hardwareConcurrency||0,spec:Go(),calls:F?F.info.render.calls:0,ua:navigator.userAgent});try{navigator.clipboard.writeText(p),rt("진단 정보가 복사됐어요 — 붙여넣어 보내주세요")}catch{console.info("[OpenArtShow diag]",p)}}))},0),ls({onEnter:rl,onChatSend:cl,onAvatarChange:Ws,onMakerToggle:u=>{at&&(u?K.disable():ft||K.enable())}}),Ln(!1),bs(()=>{at&&!ft&&K.enable()}),so=Ps({getCamera:()=>Z,getRenderer:()=>F,getMp:()=>X,isEntered:()=>at,isTouring:()=>ft,viewCurrentArtwork:Dn,toggleArtworkList:va,toggleTour:Hn,toggleGuestbook:Oo,flashShutter:Tn,capturePhoto:Gn,toggleSelfView:An,tourPrev:Xn,tourNext:Uo,exitTour:Yo,isLightboxOpen:Jt,isShareModalOpen:mo,isArtworkListOpen:ka,isGuestbookOpen:Cs}),Ea=Hs({getRenderer:()=>F,getScene:()=>bt,getCamera:()=>Z,isThirdPerson:()=>It,getSelfAvatar:()=>tt,applySelfCamOffset:_a,restoreSelfCamOffset:Na,getGalleryInfo:()=>Lt,photoWall:Ma,getMyNickname:()=>lo,getMp:()=>X,showShareModal:vs,setStatus:rt}),window.addEventListener("resize",ul),window.addEventListener("keydown",ol),Ia=new rr,F.setAnimationLoop(dl)}function tl(){fetch("./galleries/index.json").then(t=>{if(!t.ok)throw new Error(`HTTP ${t.status}`);return t.json()}).then(t=>{if(!Array.isArray(t))return;const e=Lt?Lt.id:null;gs(t,e,o=>{window.location.href="./index.html?g="+o})}).catch(()=>{})}let Xe=null;function el(){if(!at)return;const t=Z.position.y-Mt;let e=null;for(const o of M.floors)t>=o.y-.9&&(e===null||o.y>e.y)&&(e=o);if(e){if(Xe===null){Xe=e.id;return}e.id!==Xe&&(Xe=e.id,rt(e.name))}}function Dn(){if(!at||Jt())return;const t=ft?pt[te]:ta(Z.position);t&&(ya(t),K.disable())}function Gn(){Ea.capturePhoto()}function ol(t){so.onKeyDown(t)}function Ra(t){if(!t||!at)return;const e=na(t),o=ft;if(o){const n=pt.indexOf(t);n!==-1&&(te=n),le=!1}Aa(e,()=>{K.setPose(e),o?(Qo(t),le=!0,ce=0):at&&!Jt()&&K.enable()})}function Qo(t){xs({index:te,total:pt.length,title:t&&t.title||"",autoOn:ke})}function tn(t){const e=pt[t];if(!e)return;te=t,le=!1,ce=0,Qo(e);const o=na(e);Aa(o,()=>{K.setPose(o),le=!0,ce=0})}function nl(){!at||Jt()||ft||!pt||pt.length===0||(ka()&&Ee(),ft=!0,ao("tour",!0),ke=!0,K.disable(),tn(0))}function Yo(){if(!ft)return;ft=!1,ao("tour",!1),le=!1,et=null,ws();const t=K.getState();K.setPose({x:t.x,z:t.z,ry:t.ry}),at&&!Jt()&&K.enable()}function Hn(){ft?Yo():nl()}function Uo(){!ft||pt.length===0||tn((te+1)%pt.length)}function Xn(){!ft||pt.length===0||tn((te-1+pt.length)%pt.length)}function al(){ft&&(ke=!ke,ce=0,Qo(pt[te]))}function rl({nickname:t,color:e,char:o}){lo=t,Pt={nickname:t,color:e,char:o},at=!0,cs(),K.enable(),ci(),Ys();try{const n=Lt&&Lt.id||"link-"+zs(window.location.hash||"");X=new dr(bt,{nickname:t,color:e,char:o,roomId:`${ur}-${n}`}),fe=new Mi(n),X.onVisitor=(a,r)=>{fe.addVisit(a),Xs.add(r&&r.nickname,Lt?Lt.name:"")},X.onPhoto=a=>{Ma.addRemote(a),rt(`${a.name||"누군가"}님이 관람 사진을 남겼어요 📸`)},ko&&clearInterval(ko),ko=setInterval(()=>{if(!X||!fe)return;const a=[];for(const[r,i]of X.remoteAvatars)r.startsWith("npc-")||a.push({x:i.group.position.x,z:i.group.position.z});fe.addDwell(a,Je(),2),Ss(fe.summary(mt.length))},2e3),X.onChat=(a,r)=>ba(a,r,!1),X.onPlayerCount=a=>ps(a),X.onStatus=il,X.onGuestbook=ll,X.onSelfHit=a=>{rt(a>=3?"아야!! 너무해요 😭":"아야! 누가 때렸어요 😣"),tt?tt.hit(a):pr(a)},X.onNpcHit=(a,r,i)=>{ne&&ne.onHit(a,r,i)},X.npcProvider=(a,r)=>{ne||(ne=new fr(Je()));const i=ne.update(a,r),l=ne.takeChat();return l&&X.sendNpcChat(l.name,l.text),i},X.connect()}catch(n){console.error("멀티플레이어 초기화 실패:",n),X=null,rt("멀티플레이어 연결에 실패했습니다. 혼자 관람 모드로 진행합니다.")}}function il(t){if(rt(t),!(Pn||!X)&&(t==="호스트로 개설됨"||t.startsWith("접속됨"))){Pn=!0;try{X.sendGuestbook(mt)}catch(e){console.error("방명록 동기화 전송 실패:",e)}}}function sl(t){if(!t)return;const e=gr(lo,t);if(mt=ea(mt,[e]),oa(ro,mt),Jo(mt),X)try{X.sendGuestbook([e])}catch(o){console.error("방명록 전송 실패:",o)}}function ll(t){mt=ea(mt,t),oa(ro,mt),Jo(mt)}function cl(t){if(t&&(ba(lo,t,!0),X))try{X.sendChat(t)}catch(e){console.error("채팅 전송 실패:",e),rt("채팅 전송에 실패했습니다.")}}let Fe=0;function dl(){let t=Ia.getDelta();if(ht.soft){if(Fe+=t,Fe<.034)return;t=Fe,Fe=0}try{if(Ho&&Ho.update(t),K.update(t),X&&K.resolveBodyCollisions(X.getAvatarPositions()),qs(t),ft&&le&&ke&&!et&&!Jt()&&(ce+=t,ce>=Js&&Uo()),ri(t),el(),X&&(X.sendState(K.getState()),X.update(t)),Us(),It&&tt){const o=K.getState();tt.group.position.set(o.x,o.y-Mt,o.z),tt.group.rotation.y=o.ry,Ht||(Ht={x:o.x,z:o.z});const n=t>0?Math.hypot(o.x-Ht.x,o.z-Ht.z)/t:0;Ze+=(n-Ze)*Math.min(1,10*t),Ht.x=o.x,Ht.z=o.z,tt.update(t,Ze)}const e=ta(Z.position);if(e?ds(e):us(),Eo+=1,He+=t,He>=.5){const o=Eo/He;if(fs(Math.round(o)),Eo=0,He=0,he=Math.max(0,he-.5),he===0&&at){if(!Gt&&o<_s){Gt=!0,he=10,o<16&&xo("low");const n=window.devicePixelRatio||1;F.setPixelRatio(Math.min(F.getPixelRatio(),Math.max(1,n*.75))),rt("원활한 관람을 위해 화질을 잠시 낮췄어요")}else Gt&&o>Ns&&(Gt=!1,he=10,Nn());if(!Gt&&o>55){if(Ge+=1,Ge>=20){const n=Go();n==="low"?xo(null):n===null&&xo("high");const a=Math.min(2.5,Math.sqrt(Ke.high/(window.innerWidth*window.innerHeight))),r=F.getPixelRatio();!ht.soft&&r<a&&(F.setPixelRatio(Math.min(a,r+.25)),rt("화질을 한 단계 높였어요 ✨")),Ge=0}}else Ge=0}}wo+=t,wo>=2&&(wo=0,Gt&&Nn()),Xo>0&&(yo+=t,yo>=Xo&&(yo=0,F.shadowMap.needsUpdate=!0)),!zn&&at&&(zn=!0,F.shadowMap.needsUpdate=!0),It&&tt?(_a(),F.render(bt,Z),Na()):F.render(bt,Z)}catch(e){console.error("렌더 루프 오류:",e),F.setAnimationLoop(null),rt("오류가 발생했습니다. 페이지를 새로고침해 주세요.")}}function ul(){so.onWindowResize()}window.addEventListener("beforeunload",()=>{so?.onBeforeUnload()});Qs().catch(t=>{console.error("초기화 실패:",t);try{rt("초기화 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.")}catch{document.body.insertAdjacentHTML("beforeend",`<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-family:${xe()};font-size:16px;text-align:center;">초기화 중 오류가 발생했습니다.<br>페이지를 새로고침해 주세요.</div>`)}});const Pa=0,Ba=7.5,pl=0,Ye=3.3,Dt=3.5,St=.18,Ue=.2,fl=7530209,hl=3.6,gl=1.15,bl="ontouchstart"in window||(navigator.maxTouchPoints||0)>0;function ml(){const t=document.createElement("canvas");t.width=t.height=512;const e=t.getContext("2d");let o=20935;const n=()=>{o|=0,o=o+1831565813|0;let c=Math.imul(o^o>>>15,1|o);return c=c+Math.imul(c^c>>>7,61|c)^c,((c^c>>>14)>>>0)/4294967296},a=e.createLinearGradient(0,0,0,512);a.addColorStop(0,"#070a16"),a.addColorStop(.55,"#111a34"),a.addColorStop(1,"#1b2748"),e.fillStyle=a,e.fillRect(0,0,512,512);for(let c=0;c<140;c++){const d=n()*512,g=n()*310,u=n()<.08;e.fillStyle=`rgba(235,240,255,${(.28+n()*.6).toFixed(2)})`,e.fillRect(d,g,u?2:1,u?2:1)}const r=e.createRadialGradient(398,88,0,398,88,36);r.addColorStop(0,"rgba(236,239,232,0.9)"),r.addColorStop(.5,"rgba(226,232,224,0.42)"),r.addColorStop(1,"rgba(226,232,224,0)"),e.fillStyle=r,e.beginPath(),e.arc(398,88,36,0,7),e.fill(),e.fillStyle="rgba(240,243,236,0.95)",e.beginPath(),e.arc(398,88,15,0,7),e.fill();let i=0;for(;i<512;){const c=26+n()*48,d=130+n()*250,g=512-d;e.fillStyle=`rgb(${10+(n()*8|0)},${16+(n()*10|0)},${34+(n()*14|0)})`,e.fillRect(i,g,c,d);for(let u=g+12;u<506;u+=15)for(let p=i+6;p<i+c-6;p+=12)n()<.52||(e.fillStyle=n()<.72?"rgba(120,220,225,0.85)":"rgba(255,207,138,0.85)",e.fillRect(p,u,4,6));i+=c+2+n()*8}const l=new ye(t);return l.colorSpace=Bt,l}function xl(){const t=document.createElement("canvas");t.width=512,t.height=160;const e=t.getContext("2d");e.clearRect(0,0,512,160),e.font='700 92px "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif',e.textAlign="center",e.textBaseline="middle",e.shadowColor="rgba(114,230,225,0.95)",e.shadowBlur=30,e.fillStyle="rgba(175,244,240,0.96)",e.fillText("오픈월드",256,86),e.shadowBlur=0,e.fillStyle="rgba(224,252,250,0.92)",e.fillText("오픈월드",256,86);const o=new ye(t);return o.colorSpace=Bt,o}function wl(){const t=new Qt,e=[new V(Ye,St,Ue).translate(0,St/2,0),new V(Ye,St,Ue).translate(0,Dt-St/2,0),new V(St,Dt,Ue).translate(-3.1199999999999997/2,Dt/2,0),new V(St,Dt,Ue).translate((Ye-St)/2,Dt/2,0)],o=$e(e);e.forEach(i=>i.dispose());const n=new dt({color:736570,emissive:fl,emissiveIntensity:1.5,roughness:.4,metalness:.1});t.add(new B(o,n));const a=new B(new ot(Ye-2*St,Dt-2*St),new $t({map:ml(),toneMapped:!1}));a.position.set(0,Dt/2,.11),a.rotation.y=Math.PI,t.add(a);const r=new B(new ot(2.4,.75),new $t({map:xl(),transparent:!0,toneMapped:!1,depthWrite:!1,side:Se}));return r.rotation.x=Math.PI/2,r.scale.x=-1,r.position.set(0,.02,-1),t.add(r),t.position.set(Pa,pl,Ba),t.userData={frameMat:n,label:r},t}let Ft=null,je=null,kt=null,me=!1,jo=!1,Oa=0,Da=0;function yl(){kt||(kt=document.createElement("div"),kt.id="portal-hint",kt.textContent=bl?"탭하여 오픈월드로 이동 →":"클릭하거나 다가가면 오픈월드로 이동 →",kt.style.cssText='position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:40;padding:9px 16px;border-radius:999px;background:rgba(11,30,29,0.82);color:#c9fbf8;font:600 13px/1 "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;letter-spacing:-.01em;border:1px solid rgba(114,230,225,0.5);box-shadow:0 6px 20px -6px rgba(0,0,0,0.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap',document.body.appendChild(kt))}function Ga(){jo||(jo=!0,kt&&(kt.style.opacity="0"),location.href="world.html")}function Ha(){if(requestAnimationFrame(Ha),!Ft){if(Ft=window.__museum||null,!Ft)return;je=wl(),Ft.scene.add(je),yl()}const t=performance.now()/1e3,e=1.3+Math.sin(t*2.2)*.35;je.userData.frameMat.emissiveIntensity=e,je.userData.label.material.opacity=.78+Math.sin(t*2.2)*.2;const o=Ft.camera,n=Math.hypot(o.position.x-Pa,o.position.z-Ba),a=me;me=n<hl,me!==a&&kt&&(kt.style.opacity=me?"1":"0"),n<gl&&Ga()}requestAnimationFrame(Ha);addEventListener("pointerdown",t=>{Oa=t.clientX,Da=t.clientY},!0);addEventListener("pointerup",t=>{!me||jo||!Ft||t.target===Ft.renderer.domElement&&(Math.hypot(t.clientX-Oa,t.clientY-Da)>8||Ga())},!0);
