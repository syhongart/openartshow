/* empty css              */import{e as Wt,M as R,d as at,i as K,k as dt,G as Qt,T as jn,l as Eo,m as se,n as Ra,h as Dt,o as Un,p as Pa,q as Se,r as $n,s as Le,F as uo,t as ze,L as Wn,u as qe,B as aa,v as Vn,O as Kn,H as Ba,D as ne,w as Zn,S as Ot,x as ye,f as Oa,y as Da,E as Ga,z as yt,W as Xa,I as qn,N as Ha,a as Fa,b as Ya,J as Jn,V as ja,R as Qn,P as tr,A as er,Q as or,C as ar}from"./vendor-three-enYtijzV.js";import{B as E,b as Co,a as Ua,E as zt,R as Te,c as Fo,A as Mo,g as Je,d as xe,e as nr,f as rr,h as ir,l as sr,i as $a,M as lr,P as cr,p as dr,N as ur,m as Wa,s as Va,j as pr,k as Ka,n as fr}from"./npc-DwjC32ux.js";import{g as hr,c as Za,a as gr,b as Lo,m as $e,d as na,e as br,f as mr,T as Ft,h as Qe,i as xr,j as wr,r as yr,k as qa,l as Ja,C as vr}from"./scene-textures-DhUb9KjO.js";import{V as kr,P as Sr}from"./feed-Cm56rHm1.js";import{n as po,D as We,C as Er,a as Cr,S as ra,c as ia,e as zo,d as Mr,f as Lr,g as zr,h as Tr,i as _r,j as Nr,E as Ir,k as Ar,H as sa,l as Rr,m as Pr,o as Br,p as fo,q as Or,r as Dr}from"./chibi-builder-0e8j20Jr.js";import{g as Rt,o as Qa,P as _e,l as Gr,M as Xr,a as Hr}from"./auth-aZ7HCW1S.js";function la(t,e){let o=[t];for(const a of e){const n=[];for(const r of o){if(a.x1<=r.x0||a.x0>=r.x1||a.z1<=r.z0||a.z0>=r.z1){n.push(r);continue}const i=Math.max(r.x0,a.x0),l=Math.min(r.x1,a.x1),c=Math.max(r.z0,a.z0),d=Math.min(r.z1,a.z1);r.z0<c&&n.push({x0:r.x0,x1:r.x1,z0:r.z0,z1:c}),d<r.z1&&n.push({x0:r.x0,x1:r.x1,z0:d,z1:r.z1}),r.x0<i&&n.push({x0:r.x0,x1:i,z0:c,z1:d}),l<r.x1&&n.push({x0:l,x1:r.x1,z0:c,z1:d})}o=n}return o.filter(a=>a.x1-a.x0>.01&&a.z1-a.z0>.01)}function wt(t){return E.floors.find(e=>e.id===t)}function Fr(t,e){const o=Za(),a=16/50,n=t.x1-t.x0,r=t.z1-t.z0,i=o.map.clone(),l=o.normalMap.clone();for(const c of[i,l])c.needsUpdate=!0,c.repeat.set(a*n,a*r),c.offset.set((t.x0-E.minX)*a%1,(t.z0-E.minZ)*a%1);return new dt({map:i,normalMap:l,normalScale:new Dt(.7,.7),color:e,roughness:.4,metalness:0})}function It(t,e,o){const a=gr(),n=a.map.clone(),r=a.normalMap.clone();for(const i of[n,r])i.needsUpdate=!0,i.repeat.set(t,e);return new dt({map:n,normalMap:r,normalScale:new Dt(.55,.55),color:o||16777215,roughness:.9,metalness:0})}function tn(){return new dt({map:Lo().map,normalMap:Lo().normalMap,normalScale:new Dt(.35,.35),color:16777215,roughness:.92,metalness:0})}const ve=()=>new dt({color:2499615,roughness:.4,metalness:.75});function kt(t,e,o,a,n,r){const i=ve(),l=new Pa({color:14214376,transparent:!0,opacity:.22,roughness:.08,side:Se,depthWrite:!1}),c=Math.hypot(a-e,n-o),d=Math.atan2(a-e,n-o),f=(e+a)/2,g=(o+n)/2,u=new Qt,y=new R(new se(.03,.03,c,10),i);y.rotation.x=Math.PI/2,y.position.y=1.05,u.add(y);const x=Math.max(2,Math.round(c/1.2)+1);for(let v=0;v<x;v++){const b=x===1?.5:v/(x-1),p=new R(new K(.045,1.05,.045),i);p.position.set(0,.525,-c/2+b*c),u.add(p)}const m=new R(new at(c,.85),l);m.rotation.y=Math.PI/2,m.position.y=.55,u.add(m),u.rotation.y=d,u.position.set(f,r,g),u.traverse(v=>{v.isMesh&&(v.castShadow=!0)}),t.add(u)}function Yr(t,e){const o=It(1.2,2.4),a=e.yTo-e.yFrom,n=e.z1-e.z0,r=24,i=a/r,l=n/r,c=e.x1-e.x0,d=(e.x0+e.x1)/2;for(let y=0;y<r;y++){const x=e.yFrom+(y+1)*i,m=x-e.yFrom+.25,v=new R(new K(c,m,l),o);v.position.set(d,x-m/2,e.z0+(y+.5)*l),v.castShadow=!0,v.receiveShadow=!0,t.add(v)}const f=ve(),g=Math.hypot(n,a),u=Math.atan2(a,n);for(const y of[e.x0+.06,e.x1-.06]){const x=new R(new se(.03,.03,g,10),f);x.rotation.x=Math.PI/2-u,x.position.set(y,(e.yFrom+e.yTo)/2+.95,(e.z0+e.z1)/2),x.castShadow=!0,t.add(x);for(const m of[.08,.5,.92]){const v=e.yFrom+a*m,b=new R(new K(.045,.95,.045),f);b.position.set(y,v+.475,e.z0+n*m),b.castShadow=!0,t.add(b)}}}function jr(t,e,o,a,n,r,i){const l=e+E.clearH,c=.32,d=.14,f=1.1,g=It(2,.4,13617599),u=new dt({color:3486253,normalMap:Lo().normalMap,normalScale:new Dt(.25,.25),roughness:.95}),y=new dt({color:1710102,roughness:.5,metalness:.6}),x=new dt({color:16774880,emissive:n.downlight.emissive,emissiveIntensity:2.5*(n.downlight.intensity/22),roughness:1}),m=[],v=[],b=[];for(const p of o){const D=p.x1-p.x0,X=p.z1-p.z0,F=new R(new at(D,X),u);F.rotation.x=Math.PI/2,F.position.set((p.x0+p.x1)/2,l+c,(p.z0+p.z1)/2),t.add(F);const O=Math.ceil((p.z0-E.minZ)/f);for(let w=O;;w++){const C=E.minZ+w*f;if(C>p.z1-.05)break;if(C<p.z0+.05)continue;const _=new K(D,c,d);_.translate((p.x0+p.x1)/2,l+c/2,C),m.push(_)}const j=Math.ceil((p.x0-E.minX)/f);for(let w=j;;w++){const C=E.minX+w*f;if(C>p.x1-.05)break;if(C<p.x0+.05)continue;const _=new K(d,c,X);_.translate(C,l+c/2,(p.z0+p.z1)/2),m.push(_)}for(let w=j;;w++){const C=E.minX+w*f+f/2;if(C>p.x1-.2)break;if(!(C<p.x0+.2))for(let _=O;;_++){const N=E.minZ+_*f+f/2;if(N>p.z1-.2)break;if(N<p.z0+.2||(w*7+_*5)%3!==0)continue;const L=new se(.07,.08,.1,12);L.translate(C,l+c-.06,N),v.push(L);const P=new se(.055,.055,.02,12);P.translate(C,l+c-.12,N),b.push(P)}}}if(m.length){const p=new R($e(m),g);p.castShadow=!0,t.add(p)}if(v.length&&t.add(new R($e(v),y)),b.length&&t.add(new R($e(b),x)),i)for(const[p,D]of r){const X=new Un(n.downlight.color,n.downlight.intensity*.7,9,2);X.position.set(p,l-.15,D),t.add(X),a.push(X)}return x}function Ur(t){const e=new Pa({color:14478578,transparent:!0,opacity:.1,roughness:.05,side:Se,depthWrite:!1}),o=ve(),a=E.maxZ,n=E.maxX-E.minX,r=wt("f1"),i=wt("f2"),l=E.clearH;for(const[m,v]of[[E.minX,-1.5],[1.5,E.maxX]]){const b=v-m,p=new R(new at(b,l),e);p.position.set((m+v)/2,r.y+l/2,a),p.rotation.y=Math.PI,t.add(p)}for(let m=E.minX;m<=E.maxX+.01;m+=2.2){if(m>-1.5&&m<1.5)continue;const v=new R(new K(.12,l,.12),o);v.position.set(m,r.y+l/2,a),v.castShadow=!0,t.add(v)}for(const m of[-1.5,1.5]){const v=new R(new K(.18,l,.18),o);v.position.set(m,r.y+l/2,a),v.castShadow=!0,t.add(v)}const c=new R(new K(n,.14,.16),o);c.position.set(0,r.y+l-.07,a),t.add(c);const d=tn(),f=new R(new K(n,1.2,E.wallT),d);f.position.set(0,i.y+.6,a),f.castShadow=!0,f.receiveShadow=!0,t.add(f);const g=new R(new K(n,E.clearH-2.6+.6,E.wallT),d);g.position.set(0,i.y+2.6+(E.clearH-2.6+.6)/2,a),g.castShadow=!0,g.receiveShadow=!0,t.add(g);const u=new R(new at(n,1.4),e);u.position.set(0,i.y+1.9,a),u.rotation.y=Math.PI,t.add(u);for(let m=E.minX;m<=E.maxX+.01;m+=2.2){const v=new R(new K(.08,1.4,.08),o);v.position.set(m,i.y+1.9,a),t.add(v)}const y=wt("b1"),x=new R(new K(n+.6,E.storyH,E.wallT),It(4,1));x.position.set(0,y.y+E.storyH/2,a),t.add(x)}function $r(t,e,o){const a=E,n=a.maxX-a.minX,r=a.maxZ-a.minZ,i={x0:a.minX,x1:a.maxX,z0:a.minZ,z1:a.maxZ},l=[];let c=null;const d=["b1","f1","f2"];for(const z of a.floors){const I=a.slabHoles[z.id]||[],Y=la(i,I);for(const $ of Y){const Q=$.x1-$.x0,V=$.z1-$.z0,q=new R(new K(Q,a.slabT,V),It(Q/6,V/6));q.position.set(($.x0+$.x1)/2,z.y-a.slabT/2,($.z0+$.z1)/2),q.castShadow=!0,q.receiveShadow=!0,t.add(q);const tt=new R(new at(Q,V),Fr($,z.id==="b1"?10127472:z.id==="roof"?13482132:16777215));tt.rotation.x=-Math.PI/2,tt.position.set(($.x0+$.x1)/2,z.y+.002,($.z0+$.z1)/2),tt.receiveShadow=!0,t.add(tt)}}const f={b1:[[-6,-3],[0,-3],[6,-3],[0,3]],f1:[[-7,-4],[0,-4],[7,-4],[-7,4],[0,4],[7,4]],f2:[[-7,-4.5],[0,-4.5],[7,-4.5],[-7,5],[7,5]]},g={b1:"f1",f1:"f2",f2:"roof"};for(const z of d){const I=wt(z),Y=a.slabHoles[g[z]]||[],$=la(i,Y),Q=jr(t,I.y,$,l,e,f[z],o);c||(c=Q)}const u=It(3,2),y=wt("roof").y-wt("b1").y,x=wt("b1").y+y/2,m=new R(new K(n+a.wallT*2,y,a.wallT),u);m.position.set(0,x,a.minZ-a.wallT/2),m.castShadow=!0,m.receiveShadow=!0,t.add(m);for(const[z,I]of[[a.minX-a.wallT/2,1],[a.maxX+a.wallT/2,1]]){const Y=new R(new K(a.wallT,y,r),u);Y.position.set(z,x,0),Y.castShadow=!0,Y.receiveShadow=!0,t.add(Y)}for(const z of d){const I=wt(z),Y=tn(),$=[{w:n,h:E.clearH,x:0,z:a.minZ+.02,ry:0},{w:r,h:E.clearH,x:a.maxX-.02,z:0,ry:-Math.PI/2},{w:r,h:E.clearH,x:a.minX+.02,z:0,ry:Math.PI/2}];for(const Q of $){const V=new R(new at(Q.w,Q.h),Y);V.position.set(Q.x,I.y+E.clearH/2,Q.z),V.rotation.y=Q.ry,V.receiveShadow=!0,t.add(V)}}Ur(t);for(const z of a.stairs)Yr(t,z);const v=wt("f1").y,b=wt("f2").y,p=wt("roof").y;kt(t,-8.7,-7,-8.7,-1,v),kt(t,-10.7,-7,-8.7,-7,v),kt(t,-8.7,1,-8.7,7,b),kt(t,-10.7,1,-8.7,1,b),kt(t,-4,-3,5,-3,b),kt(t,-4,3,5,3,b),kt(t,-4,-3,-4,3,b),kt(t,5,-3,5,3,b),kt(t,8.7,1,8.7,7,p),kt(t,8.7,1,10.7,1,p);const D=It(4,.5),X=1.1,F=.25,O=[{w:n+.6,d:F,x:0,z:a.minZ-F/2},{w:n+.6,d:F,x:0,z:a.maxZ+F/2},{w:F,d:r,x:a.minX-F/2,z:0},{w:F,d:r,x:a.maxX+F/2,z:0}];for(const z of O){const I=new R(new K(z.w,X,z.d),D);I.position.set(z.x,p+X/2,z.z),I.castShadow=!0,I.receiveShadow=!0,t.add(I)}const j=new dt({map:Za().map,color:12163695,roughness:.6});for(const[z,I]of[[-4,4],[2,-4]]){const Y=new R(new K(2.2,.09,.55),j);Y.position.set(z,p+.45,I),Y.castShadow=!0,t.add(Y);for(const $ of[-.9,.9]){const Q=new R(new K(.08,.42,.5),ve());Q.position.set(z+$,p+.21,I),t.add(Q)}}const w=new dt({color:5194806,roughness:.45,metalness:.65}),C=new Qt,_=new R(new jn(1.3,.42,14,28,Math.PI),w);_.castShadow=!0,C.add(_);const N=new R(new Eo(.55,18,14),w);N.scale.set(1.5,.75,1),N.position.set(1.1,-.95,.2),N.castShadow=!0,C.add(N),C.position.set(-2,p+1.35,.5),C.rotation.y=-.6,t.add(C);const L=new R(new se(1.9,1.9,.12,24),It(1,1,14209994));L.position.set(-2,p+.06,.5),L.receiveShadow=!0,t.add(L);const P=new R(new K(2.8,.18,7.2),It(1,2));P.position.set(9.7,p+2.6,4),P.castShadow=!0,t.add(P);for(const[z,I]of[[8.85,.8],[10.55,.8],[8.85,7.2],[10.55,7.2]]){const Y=new R(new K(.12,2.6,.12),ve());Y.position.set(z,p+1.3,I),t.add(Y)}let M=null;return o||(M=new Ra(e.downlight.color,e.downlight.intensity*.022),t.add(M)),{downlights:{lights:l,warm:M,bulbMat:c}}}function Wr(t){const{minX:e,maxX:o,minZ:a,maxZ:n,wallT:r}=E,i=.55,l=e+r/2,c=o-r/2,d=a+r/2,f=n-r/2,g=new Wt({map:hr(),transparent:!0,depthWrite:!1});for(const u of E.floors){if(u.id==="roof")continue;const y=u.y+.018,x=[[c-l,(l+c)/2,d+i/2,Math.PI],[c-l,(l+c)/2,f-i/2,0],[f-d,l+i/2,(d+f)/2,-Math.PI/2],[f-d,c-i/2,(d+f)/2,Math.PI/2]];for(const[m,v,b,p]of x){const D=new R(new at(m,i),g);D.rotation.x=-Math.PI/2,D.rotation.z=p,D.position.set(v,y,b),D.renderOrder=1,t.add(D)}}}class Vr extends $n{constructor(e){super(e),this.type=Le}parse(e){const i=function(w,C){switch(w){case 1:throw new Error("THREE.RGBELoader: Read Error: "+(C||""));case 2:throw new Error("THREE.RGBELoader: Write Error: "+(C||""));case 3:throw new Error("THREE.RGBELoader: Bad File Format: "+(C||""));default:case 4:throw new Error("THREE.RGBELoader: Memory Error: "+(C||""))}},f=`
`,g=function(w,C,_){C=C||1024;let L=w.pos,P=-1,M=0,z="",I=String.fromCharCode.apply(null,new Uint16Array(w.subarray(L,L+128)));for(;0>(P=I.indexOf(f))&&M<C&&L<w.byteLength;)z+=I,M+=I.length,L+=128,I+=String.fromCharCode.apply(null,new Uint16Array(w.subarray(L,L+128)));return-1<P?(w.pos+=M+P+1,z+I.slice(0,P)):!1},u=function(w){const C=/^#\?(\S+)/,_=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,N=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,L=/^\s*FORMAT=(\S+)\s*$/,P=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,M={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0};let z,I;for((w.pos>=w.byteLength||!(z=g(w)))&&i(1,"no header found"),(I=z.match(C))||i(3,"bad initial token"),M.valid|=1,M.programtype=I[1],M.string+=z+`
`;z=g(w),z!==!1;){if(M.string+=z+`
`,z.charAt(0)==="#"){M.comments+=z+`
`;continue}if((I=z.match(_))&&(M.gamma=parseFloat(I[1])),(I=z.match(N))&&(M.exposure=parseFloat(I[1])),(I=z.match(L))&&(M.valid|=2,M.format=I[1]),(I=z.match(P))&&(M.valid|=4,M.height=parseInt(I[1],10),M.width=parseInt(I[2],10)),M.valid&2&&M.valid&4)break}return M.valid&2||i(3,"missing format specifier"),M.valid&4||i(3,"missing image size specifier"),M},y=function(w,C,_){const N=C;if(N<8||N>32767||w[0]!==2||w[1]!==2||w[2]&128)return new Uint8Array(w);N!==(w[2]<<8|w[3])&&i(3,"wrong scanline width");const L=new Uint8Array(4*C*_);L.length||i(4,"unable to allocate buffer space");let P=0,M=0;const z=4*N,I=new Uint8Array(4),Y=new Uint8Array(z);let $=_;for(;$>0&&M<w.byteLength;){M+4>w.byteLength&&i(1),I[0]=w[M++],I[1]=w[M++],I[2]=w[M++],I[3]=w[M++],(I[0]!=2||I[1]!=2||(I[2]<<8|I[3])!=N)&&i(3,"bad rgbe scanline format");let Q=0,V;for(;Q<z&&M<w.byteLength;){V=w[M++];const tt=V>128;if(tt&&(V-=128),(V===0||Q+V>z)&&i(3,"bad scanline data"),tt){const it=w[M++];for(let Ce=0;Ce<V;Ce++)Y[Q++]=it}else Y.set(w.subarray(M,M+V),Q),Q+=V,M+=V}const q=N;for(let tt=0;tt<q;tt++){let it=0;L[P]=Y[tt+it],it+=N,L[P+1]=Y[tt+it],it+=N,L[P+2]=Y[tt+it],it+=N,L[P+3]=Y[tt+it],P+=4}$--}return L},x=function(w,C,_,N){const L=w[C+3],P=Math.pow(2,L-128)/255;_[N+0]=w[C+0]*P,_[N+1]=w[C+1]*P,_[N+2]=w[C+2]*P,_[N+3]=1},m=function(w,C,_,N){const L=w[C+3],P=Math.pow(2,L-128)/255;_[N+0]=ze.toHalfFloat(Math.min(w[C+0]*P,65504)),_[N+1]=ze.toHalfFloat(Math.min(w[C+1]*P,65504)),_[N+2]=ze.toHalfFloat(Math.min(w[C+2]*P,65504)),_[N+3]=ze.toHalfFloat(1)},v=new Uint8Array(e);v.pos=0;const b=u(v),p=b.width,D=b.height,X=y(v.subarray(v.pos),p,D);let F,O,j;switch(this.type){case uo:j=X.length/4;const w=new Float32Array(j*4);for(let _=0;_<j;_++)x(X,_*4,w,_*4);F=w,O=uo;break;case Le:j=X.length/4;const C=new Uint16Array(j*4);for(let _=0;_<j;_++)m(X,_*4,C,_*4);F=C,O=Le;break;default:throw new Error("THREE.RGBELoader: Unsupported type: "+this.type)}return{width:p,height:D,data:F,header:b.string,gamma:b.gamma,exposure:b.exposure,type:O}}setDataType(e){return this.type=e,this}load(e,o,a,n){function r(i,l){switch(i.type){case uo:case Le:i.colorSpace=Wn,i.minFilter=qe,i.magFilter=qe,i.generateMipmaps=!1,i.flipY=!0;break}o&&o(i,l)}return super.load(e,r,a,n)}}const Yo=[];function ca(t){const o=document.createElement("canvas");o.width=1024,o.height=1024;const a=o.getContext("2d"),n=a.createLinearGradient(0,0,0,1024);for(const[d,f]of t.stops)n.addColorStop(d,f);if(a.fillStyle=n,a.fillRect(0,0,1024,1024),t.stars>0){const d=Qe(90210);for(let f=0;f<t.stars;f++){const g=d()*1024,u=d()*1024*.82,y=.4+d()*1.6,x=.35+d()*.65;if(d()>.965){const m=a.createRadialGradient(g,u,0,g,u,y*5);m.addColorStop(0,`rgba(255, 255, 255, ${x*.5})`),m.addColorStop(1,"rgba(255,255,255,0)"),a.fillStyle=m,a.beginPath(),a.arc(g,u,y*5,0,Math.PI*2),a.fill()}a.fillStyle=`rgba(255, 255, 255, ${x})`,a.beginPath(),a.arc(g,u,y,0,Math.PI*2),a.fill()}}const r=Qe(13579),[i,l]=t.cloudAlpha;for(let d=0;d<t.cloudCount;d++){const f=r()*1024,g=1024*(.3+r()*.45),u=30+r()*90;for(let y=0;y<7;y++){const x=f+(r()-.5)*u*2.4,m=g+(r()-.5)*u*.7,v=u*(.35+r()*.5),b=a.createRadialGradient(x,m,0,x,m,v);b.addColorStop(0,`rgba(${t.cloudColor}, ${i+r()*(l-i)})`),b.addColorStop(1,`rgba(${t.cloudColor}, 0)`),a.fillStyle=b,a.beginPath(),a.arc(x,m,v,0,Math.PI*2),a.fill()}}const c=new ye(o);return c.colorSpace=Ot,c}const Kr={daylight:"./assets/sky/day.hdr",sunset:"./assets/sky/sunset.hdr",night:"./assets/sky/night.jpg"};function Ne(t,e){const o=Kr[e],a=r=>{r.minFilter=qe,r.magFilter=qe,t.map=r,t.needsUpdate=!0},n=()=>{};o.endsWith(".hdr")?new Vr().load(o,a,void 0,n):new Zn().load(o,r=>{r.colorSpace=Ot,a(r)},void 0,n)}function Zr(t,e,o){if(o){const r=(d,f)=>new R(new Eo(f,32,16),new Wt({map:ca(d),side:aa,fog:!1,transparent:!0,depthWrite:!1,opacity:0})),i=r(Ft.night.sky,450),l=r(Ft.sunset.sky,448),c=r(Ft.daylight.sky,446);for(const d of[i,l,c])d.position.y=-70;return i.renderOrder=-3,l.renderOrder=-2,c.renderOrder=-1,t.add(i,l,c),Ne(c.material,"daylight"),Ne(l.material,"sunset"),Ne(i.material,"night"),{daylight:c,sunset:l,night:i}}const a=e===Ft.sunset?"sunset":e===Ft.night?"night":"daylight",n=new R(new Eo(450,32,16),new Wt({map:ca(e.sky),side:aa,fog:!1}));return n.position.y=-70,t.add(n),Ne(n.material,a),null}function qr(t,e){const o=new R(new at(800,800),new dt({map:na().map,normalMap:na().normalMap,normalScale:new Dt(.6,.6),color:e.grassTint,roughness:.95,metalness:0}));o.rotation.x=-Math.PI/2,o.position.y=-.03,o.receiveShadow=!0,t.add(o);const a=new R(new at(400,900),new dt({color:e.sea.color,roughness:e.sea.roughness,metalness:e.sea.metalness}));a.rotation.x=-Math.PI/2,a.position.set(290,-.02,0),t.add(a);const n=new R(new at(8,900),new dt({color:13220758,roughness:.9}));n.rotation.x=-Math.PI/2,n.position.set(88,-.025,0),t.add(n);const r=Qe(97531),i=new Qt;let l=4e4;function c(y,x,m){l+=733;const v=Co(l,{trunkLen:2.6*m,trunkRad:.24*m,maxLevel:2,leafScale:.95*m});v.position.set(y,0,x),v.rotation.y=r()*Math.PI*2,i.add(v)}[[-12,30,1],[4,31,1.15],[12,34,.9],[34,-18,1.1],[36,14,.95]].forEach(([y,x,m],v)=>{const b=Co(6e4+v*137,{trunkLen:3.2*m,trunkRad:.32*m,maxLevel:2,leafScale:1.1*m});b.position.set(y+(r()-.5)*2,0,x+(r()-.5)*2),b.rotation.y=r()*Math.PI*2,i.add(b)});const f=[[-20,33],[-4,35],[20,30],[-16,42],[-6,45],[6,43],[16,46],[0,52],[-24,50],[24,48]];for(const[y,x]of f)c(y+(r()-.5)*3,x+(r()-.5)*3,1+r()*.9);const g=[[40,-10],[44,22],[52,-18],[60,8],[48,-2]];for(const[y,x]of g)c(y+(r()-.5)*3,x+(r()-.5)*3,.9+r()*.8);const u=[[-35,-30],[-45,0],[-38,20],[-30,40],[20,-40],[-10,-38]];for(const[y,x]of u)c(y+(r()-.5)*4,x+(r()-.5)*4,1.1+r()*1);for(const y of Ua(i))t.add(y);return{seaMat:a.material}}function Jr(t,e){const o=Co(31415,{trunkLen:4.6,trunkRad:.42,maxLevel:3,leafScale:1.4});o.position.set(7,0,14);for(const r of Ua(o))t.add(r);const a=new R(new se(.42,.72,.45,9),new dt({map:mr(),normalMap:br(),normalScale:new Dt(.9,.9),roughness:.95}));a.position.set(7,.22,14),a.castShadow=!0,t.add(a);const n=[];if(e.treeUplights)for(const[r,i]of[[5.6,13],[8.4,15]]){const l=new Vn(16756838,150,15,Math.PI/5,.9,1.8);l.position.set(r,.35,i);const c=new Kn;c.position.set(7,7,14),t.add(c),l.target=c,l.castShadow=!1,t.add(l),n.push(l)}return{treeUplights:n}}function da(t,e){const o=new Qt,a=new at(.16,.12);a.translate(-.09,0,0);const n=new at(.16,.12);n.translate(.09,0,0);const r=new Wt({color:e.color,side:Se}),i=new R(a,r),l=new R(n,r);i.rotation.x=-Math.PI/2,l.rotation.x=-Math.PI/2,o.add(i),o.add(l),t.add(o),Yo.push({update(c){const d=c*e.speed+e.phase,f=e.cx+Math.cos(d)*e.rx,g=e.cz+Math.sin(d*e.zRatio)*e.rz,u=e.cy+Math.sin(c*e.bobSpeed+e.phase)*e.bobAmp,y=-Math.sin(d)*e.rx*e.speed,x=Math.cos(d*e.zRatio)*e.rz*e.zRatio*e.speed;o.rotation.y=Math.atan2(y,x),o.position.set(f,u,g);const m=Math.sin(c*e.flapSpeed)*1.1;i.rotation.y=m,l.rotation.y=-m}})}function Qr(t,e){const o=new Qt,a=new Wt({color:2763310,side:Se}),n=new at(1.6,.35);n.translate(-.8,0,0);const r=new at(1.6,.35);r.translate(.8,0,0);const i=new R(n,a),l=new R(r,a);i.rotation.x=-Math.PI/2,l.rotation.x=-Math.PI/2,o.add(i),o.add(l),t.add(o),Yo.push({update(c){const d=c*e.speed+e.phase,f=e.cx+Math.cos(d)*e.radius,g=e.cz+Math.sin(d)*e.radius,u=e.cy+Math.sin(c*.3+e.phase)*2;o.rotation.y=-d-Math.PI/2,o.position.set(f,u,g);const y=Math.sin(c*e.flapSpeed+e.phase)*.55;i.rotation.y=y,l.rotation.y=-y}})}function ti(t){const e=Qe(86420),o=[15241786,15979338,15262938,13070264,8368864];for(let a=0;a<5;a++)da(t,{cx:7,cz:14,cy:1.4+e()*3,rx:1+e()*2.2,rz:1+e()*2.2,zRatio:.7+e()*.6,speed:.35+e()*.4,phase:e()*Math.PI*2,bobSpeed:1.5+e()*1.5,bobAmp:.3+e()*.3,flapSpeed:9+e()*5,color:o[a%o.length]});for(let a=0;a<4;a++)da(t,{cx:-14+a*10+e()*4,cz:30+e()*8,cy:1.2+e()*2,rx:1.5+e()*3,rz:1.5+e()*3,zRatio:.6+e()*.8,speed:.3+e()*.35,phase:e()*Math.PI*2,bobSpeed:1.2+e()*1.6,bobAmp:.35+e()*.4,flapSpeed:8+e()*5,color:o[(a+2)%o.length]});for(let a=0;a<3;a++)Qr(t,{cx:20+e()*30,cz:-10+e()*40,cy:26+e()*12,radius:55+e()*45,speed:.04+e()*.03,phase:e()*Math.PI*2,flapSpeed:2.2+e()*1.2})}function ei(t,e){const o=new Ba(e.hemi.sky,e.hemi.ground,e.hemi.intensity);o.position.set(0,40,0),t.add(o);const a=new Ra(e.ambient.color,e.ambient.intensity);t.add(a);const n=new ne(e.sun.color,e.sun.intensity);n.position.set(...e.sun.pos),n.castShadow=!0,n.shadow.mapSize.set(2048,2048),n.shadow.bias=-5e-4,n.shadow.normalBias=.02;const r=e.shadowCamera;n.shadow.camera.left=r.left,n.shadow.camera.right=r.right,n.shadow.camera.top=r.top,n.shadow.camera.bottom=r.bottom,n.shadow.camera.near=r.near,n.shadow.camera.far=r.far,t.add(n),t.add(n.target);const i=new ne(e.fill.color,e.fill.intensity);return i.position.set(...e.fill.pos),t.add(i),{hemi:o,ambient:a,sun:n,fill:i}}function oi(t){for(const e of Yo)e.update(t)}let At=null,ua=0;function ai(t){ua+=t,oi(ua),At&&(At.phase=(At.phase+t/vr)%1,qa(At,Ja(At.phase)))}function ni(t,e="daylight",o={}){const a=o.fullLights!==!1,n=e==="cycle",r=n?xr():0,i=n?wr(r):yr(e);t.background=new Oa(i.background),t.fog=new Da(i.fog.color,i.fog.near,i.fog.far);const l=Zr(t,i,n),c=qr(t,i);Wr(t);const d=$r(t,i,a),f=Jr(t,i),g=d.downlights,u=ei(t,i);if(ti(t),n){const y=new ne(Ft.night.sun.color,0);y.position.set(...Ft.night.sun.pos),t.add(y),t.add(y.target),At={scene:t,phase:r,sunLight:u.sun,hemiLight:u.hemi,ambientLight:u.ambient,moonLight:y,seaMat:c.seaMat,downlights:g,treeUplights:f.treeUplights,skyDomes:l},u.sun.shadow.camera.updateProjectionMatrix(),qa(At,Ja(r))}else At=null;return{bounds:{minX:E.minX+.6,maxX:E.maxX-.6,minZ:E.minZ+.6,maxZ:E.maxZ-.6}}}let ct=null,we=null,be=!1;function ri(t,e){if(!ct)return;const o=new StereoPannerNode(ct,{pan:e});o.connect(we);const a=2+Math.floor(Math.random()*4);let n=ct.currentTime+.02;for(let r=0;r<a;r++){const i=ct.createOscillator(),l=ct.createGain();i.connect(l),l.connect(o);const c=t*(.85+Math.random()*.4),d=c*(Math.random()>.5?1.25:.78),f=.05+Math.random()*.1;i.type="sine",i.frequency.setValueAtTime(c,n),i.frequency.exponentialRampToValueAtTime(d,n+f),l.gain.setValueAtTime(1e-4,n),l.gain.exponentialRampToValueAtTime(.55,n+.012),l.gain.exponentialRampToValueAtTime(1e-4,n+f),i.start(n),i.stop(n+f+.02),n+=f+.04+Math.random()*.09}}function ii(){const t=ct.sampleRate*4,e=ct.createBuffer(1,t,ct.sampleRate),o=e.getChannelData(0);let a=0;for(let l=0;l<t;l++){const c=Math.random()*2-1;a=(a+.02*c)/1.02,o[l]=a*3.5}const n=ct.createBufferSource();n.buffer=e,n.loop=!0;const r=ct.createBiquadFilter();r.type="lowpass",r.frequency.value=400;const i=ct.createGain();i.gain.value=.012,n.connect(r),r.connect(i),i.connect(we),n.start()}function To(){if(!be)return;const t=[{base:2600,pan:-.7},{base:3400,pan:.6},{base:4200,pan:.15}],e=t[Math.floor(Math.random()*t.length)];ri(e.base,e.pan+(Math.random()-.5)*.3);const o=900+Math.random()*4200;setTimeout(To,o)}function si(){if(!be)try{ct=new(window.AudioContext||window.webkitAudioContext),we=ct.createGain(),we.gain.value=.05,we.connect(ct.destination),ct.state==="suspended"&&ct.resume(),be=!0,ii(),To(),setTimeout(()=>{be&&To()},2500)}catch{be=!1}}const pe=2.5,pa=4.5,fa=.0022,ha=.0058,Ie=yt.degToRad(89),li=.03,ci=7.5,Ae=60,Lt=.45,ga=.65,di=12;function ui(t,e){for(const o of E.stairs){const a=Math.min(o.x0,o.x1),n=Math.max(o.x0,o.x1);if(t<a||t>n)continue;const r=Math.min(o.z0,o.z1),i=Math.max(o.z0,o.z1);if(e<r||e>i)continue;const l=yt.clamp((e-o.z0)/(o.z1-o.z0),0,1);return o.yFrom+l*(o.yTo-o.yFrom)}return null}function pi(t,e,o){return e>=t.x0&&e<=t.x1&&o>=t.z0&&o<=t.z1}function fi(t,e){return t>=E.minX&&t<=E.maxX&&e>=E.minZ&&e<=E.maxZ}function en(t,e){const o=[],a=ui(t,e);if(a!==null&&o.push(a),fi(t,e))for(const n of E.floors){const r=E.slabHoles[n.id]||[];let i=!1;for(const l of r)if(pi(l,t,e)){i=!0;break}i||o.push(n.y)}else o.push(0);return o}function hi(t,e,o){const a=en(t,e);let n=null;for(const r of a)r<=o+ga&&(n===null||r>n)&&(n=r);return n===null||o-n>ga?null:n}function gi(t,e){let o=t,a=e;return e>E.minZ-Lt&&e<E.maxZ+Lt&&(o=yt.clamp(t,E.minX+Lt,E.maxX-Lt)),t>E.minX-Lt&&t<E.maxX+Lt&&(a=Math.max(e,E.minZ+Lt)),{x:o,z:a}}class bi{constructor(e,o){if(this.camera=e,this.domElement=o,this.enabled=!1,this.euler=new Ga(0,0,0,"YXZ"),this.camera.rotation.set(0,0,0),this.camera.rotation.order="YXZ",this.camera.position.set(0,zt,8),this.keys={forward:!1,backward:!1,left:!1,right:!1,run:!1},this.velocity=new Dt(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0,this.groundY=this.camera.position.y-zt,this.moveTouch=null,this.lookTouch=null,!document.getElementById("lu-joy-style")){const a=document.createElement("style");a.id="lu-joy-style",a.textContent=`
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
    inset 0 -2px 4px rgba(32,74,52,0.30); }`,document.head.appendChild(a)}this._joyBase=document.createElement("div"),this._joyBase.className="lu-joy-base",this._joyKnob=document.createElement("div"),this._joyKnob.className="lu-joy-knob",this._wasRunning=!1,document.body.appendChild(this._joyBase),document.body.appendChild(this._joyKnob),this._bindEvents()}_bindEvents(){this._onClick=()=>{this.enabled&&document.pointerLockElement!==this.domElement&&this.domElement.requestPointerLock?.()},this.domElement.addEventListener("click",this._onClick),this._onMouseMove=e=>{this.enabled&&document.pointerLockElement===this.domElement&&(this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=e.movementX*fa,this.euler.x-=e.movementY*fa,this.euler.x=yt.clamp(this.euler.x,-Ie,Ie),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler))},document.addEventListener("mousemove",this._onMouseMove),this._onKeyDown=e=>{if(!this.enabled)return;const o=e.target;o&&(o.tagName==="INPUT"||o.tagName==="TEXTAREA")||this._setKey(e.code,!0)},this._onKeyUp=e=>{this._setKey(e.code,!1)},document.addEventListener("keydown",this._onKeyDown),document.addEventListener("keyup",this._onKeyUp),this._onTouchStart=e=>{if(this.enabled){for(const o of e.changedTouches){const a=window.innerWidth*.5;o.clientX<a&&this.moveTouch===null?(this.moveTouch={id:o.identifier,startX:o.clientX,startY:o.clientY,dx:0,dy:0},this._joyBase.style.left=o.clientX+"px",this._joyBase.style.top=o.clientY+"px",this._joyKnob.style.left=o.clientX+"px",this._joyKnob.style.top=o.clientY+"px",this._joyBase.classList.add("lu-live"),this._joyKnob.classList.add("lu-live")):o.clientX>=a&&this.lookTouch===null&&(this.lookTouch={id:o.identifier,lastX:o.clientX,lastY:o.clientY})}e.cancelable&&e.preventDefault()}},this._onTouchMove=e=>{if(this.enabled){for(const o of e.changedTouches)if(this.moveTouch&&o.identifier===this.moveTouch.id){const a=o.clientX-this.moveTouch.startX,n=o.clientY-this.moveTouch.startY,r=Math.hypot(a,n),i=r>Ae?Ae/r:1;this.moveTouch.dx=a*i/Ae,this.moveTouch.dy=n*i/Ae,this._joyKnob.style.left=this.moveTouch.startX+a*i+"px",this._joyKnob.style.top=this.moveTouch.startY+n*i+"px";const l=Math.hypot(this.moveTouch.dx,this.moveTouch.dy)>.85;this._joyBase.classList.toggle("lu-run",l),this._joyKnob.classList.toggle("lu-run",l),l&&!this._wasRunning&&navigator.vibrate&&navigator.vibrate(10),this._wasRunning=l}else if(this.lookTouch&&o.identifier===this.lookTouch.id){const a=o.clientX-this.lookTouch.lastX,n=o.clientY-this.lookTouch.lastY;this.lookTouch.lastX=o.clientX,this.lookTouch.lastY=o.clientY,this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=a*ha,this.euler.x-=n*ha,this.euler.x=yt.clamp(this.euler.x,-Ie,Ie),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler)}e.cancelable&&e.preventDefault()}},this._onTouchEnd=e=>{for(const o of e.changedTouches)this.moveTouch&&o.identifier===this.moveTouch.id?(this.moveTouch=null,this._wasRunning=!1,this._joyBase.classList.remove("lu-live","lu-run"),this._joyKnob.classList.remove("lu-live","lu-run")):this.lookTouch&&o.identifier===this.lookTouch.id&&(this.lookTouch=null)},this.domElement.addEventListener("touchstart",this._onTouchStart,{passive:!1}),this.domElement.addEventListener("touchmove",this._onTouchMove,{passive:!1}),this.domElement.addEventListener("touchend",this._onTouchEnd),this.domElement.addEventListener("touchcancel",this._onTouchEnd)}_setKey(e,o){switch(e){case"KeyW":case"ArrowUp":this.keys.forward=o;break;case"KeyS":case"ArrowDown":this.keys.backward=o;break;case"KeyA":case"ArrowLeft":this.keys.left=o;break;case"KeyD":case"ArrowRight":this.keys.right=o;break;case"ShiftLeft":case"ShiftRight":this.keys.run=o;break}}_tryMove(e,o){const a=gi(e,o),n=yt.clamp(a.x,-24,Te.bound),r=yt.clamp(a.z,-24,Te.bound),i=E.maxZ,l=this.camera.position.z;if(n>E.minX-Lt&&n<E.maxX+Lt&&(l-i)*(r-i)<0&&Math.abs(n)>1.4)return null;const d=hi(n,r,this.groundY);return d===null?null:{x:n,z:r,y:d}}update(e){if(!this.enabled)return;e=Math.min(e,.1);let o=0,a=0;this.keys.forward&&(a-=1),this.keys.backward&&(a+=1),this.keys.left&&(o-=1),this.keys.right&&(o+=1);let n=this.keys.run?pa:pe;if(this.moveTouch&&o===0&&a===0){o=this.moveTouch.dx,a=this.moveTouch.dy;const p=Math.hypot(o,a);p<.14&&(o=0,a=0),n=pe+(pa-pe)*Math.min(1,Math.max(0,(p-.85)/.15))}else{const p=Math.hypot(o,a);p>1&&(o/=p,a/=p)}this.euler.setFromQuaternion(this.camera.quaternion,"YXZ");const r=this.euler.y,i=Math.sin(r),l=Math.cos(r),c=(o*l+a*i)*n,d=(-o*i+a*l)*n,f=1-Math.exp(-10*e);this.velocity.x+=(c-this.velocity.x)*f,this.velocity.y+=(d-this.velocity.y)*f;const g=this.camera.position,u=g.x+this.velocity.x*e,y=g.z+this.velocity.y*e;let x=this._tryMove(u,y);if(!x){const p=this._tryMove(u,g.z),D=this._tryMove(g.x,y);x=p||D||null}x&&(g.x=x.x,g.z=x.z,this.groundY=x.y);const m=Math.hypot(this.velocity.x,this.velocity.y);if(m>.3){this.bobPhase+=e*ci*(m/pe);const p=Math.min(1,m/pe);this.bobOffset=Math.sin(this.bobPhase)*li*p}else this.bobOffset+=(0-this.bobOffset)*f,Math.abs(this.bobOffset)<5e-4&&(this.bobOffset=0,this.bobPhase=0);const v=Math.min(1,di*e),b=this.groundY+zt+this.bobOffset+this.liftOffset;g.y+=(b-g.y)*v}resolveBodyCollisions(e){if(!this.enabled||!e||!e.length)return;const o=.6,a=1.2,n=this.camera.position;let r=n.x,i=n.z,l=!1,c=0,d=0;for(const u of e){if(!u||u.y!=null&&Math.abs(u.y-this.groundY)>a)continue;const y=r-u.x,x=i-u.z,m=Math.hypot(y,x);if(m>=o)continue;const v=m>1e-4?y/m:Math.sin(this.euler.y),b=m>1e-4?x/m:Math.cos(this.euler.y);r=u.x+v*o,i=u.z+b*o,c=v,d=b,l=!0}if(!l)return;const f=this._tryMove(r,i);f&&(n.x=f.x,n.z=f.z,this.groundY=f.y);const g=this.velocity.x*-c+this.velocity.y*-d;g>0&&(this.velocity.x+=c*g,this.velocity.y+=d*g)}getState(){return this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z,ry:this.euler.y}}setPose({x:e,y:o,z:a,ry:n}){const r=yt.clamp(e,-24,Te.bound),i=yt.clamp(a,-24,Te.bound);let l;if(o!=null)l=o-zt;else{const c=en(r,i);l=c.length?Math.max(...c):0}this.groundY=l,this.camera.position.set(r,l+zt,i),this.euler.set(0,n,0,"YXZ"),this.camera.quaternion.setFromEuler(this.euler),this.velocity.set(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0}enable(){this.enabled=!0}disable(){this.enabled=!1,this.keys.forward=this.keys.backward=this.keys.left=this.keys.right=this.keys.run=!1,this.velocity.set(0,0),this.moveTouch=null,this.lookTouch=null,document.pointerLockElement===this.domElement&&document.exitPointerLock?.()}dispose(){this.disable(),this.domElement.removeEventListener("click",this._onClick),document.removeEventListener("mousemove",this._onMouseMove),document.removeEventListener("keydown",this._onKeyDown),document.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("touchstart",this._onTouchStart),this.domElement.removeEventListener("touchmove",this._onTouchMove),this.domElement.removeEventListener("touchend",this._onTouchEnd),this.domElement.removeEventListener("touchcancel",this._onTouchEnd)}}const mi=3,xi=6,ba=2.2,wi=.05;function yi({player:t,getSelfAvatar:e}){let o=!1,a=0,n=0,r=0;const i=x=>{if(x.code!=="Space"||!t||!t.enabled)return;const m=x.target;m&&(m.tagName==="INPUT"||m.tagName==="TEXTAREA")||(o=!0,x.preventDefault())},l=x=>{x.code==="Space"&&(o=!1)};document.addEventListener("keydown",i),document.addEventListener("keyup",l);let c=null;const d=typeof window<"u"&&window.matchMedia&&window.matchMedia("(pointer: coarse)").matches,f=x=>{o=!0,c&&c.classList.add("lu-fly-on"),x.cancelable&&x.preventDefault(),x.stopPropagation()},g=x=>{o=!1,c&&c.classList.remove("lu-fly-on"),x.stopPropagation()};d&&(c=document.createElement("button"),c.id="lu-fly-btn",c.type="button",c.setAttribute("aria-label","날기 — 누르고 있으면 상승"),c.textContent="▲",c.style.cssText=["position:fixed","right:20px","bottom:104px","width:64px","height:64px","border-radius:50%","border:1.5px solid rgba(255,255,255,0.34)","background:rgba(22,24,30,0.44)","color:rgba(255,255,255,0.92)","font-size:20px","line-height:1","z-index:6","display:none","align-items:center","justify-content:center","touch-action:none","user-select:none","-webkit-user-select:none","cursor:pointer","box-shadow:0 2px 12px rgba(0,0,0,0.32)","transition:background 0.12s, transform 0.12s, opacity 0.2s"].join(";"),c.addEventListener("touchstart",f,{passive:!1}),c.addEventListener("touchend",g),c.addEventListener("touchcancel",g),c.addEventListener("pointerdown",x=>{x.pointerType!=="touch"&&f(x)}),c.addEventListener("pointerup",x=>{x.pointerType!=="touch"&&g(x)}),document.body.appendChild(c));function u(x){const m=Math.min(x||0,.1),v=!!(t&&t.enabled);v||(o=!1),t&&t.liftOffset!==r&&(a=t.liftOffset,n=0),o?n=mi:(n-=xi*m,n<-5&&(n=-5)),a+=n*m,a>=ba&&(a=ba,n=0),a<=0&&(a=0,n=0),t&&(t.liftOffset=a,r=a);const b=v&&a>wi,p=e&&e();p&&typeof p.setFlying=="function"&&p.setFlying(b),c&&(c.style.display=v?"flex":"none")}function y(){document.removeEventListener("keydown",i),document.removeEventListener("keyup",l),c&&c.parentNode&&c.parentNode.removeChild(c)}return{update:u,dispose:y}}const vi="lu-stats-v1-",ki=3;function ma(){const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}function Si(){return{totalVisits:0,days:{},dwell:{}}}class Ei{key;_seen;data;_saveTimer;constructor(e){this.key=vi+String(e||"default"),this._seen=new Set,this.data=Si();try{const o=localStorage.getItem(this.key);if(o){const a=JSON.parse(o);a&&typeof a=="object"&&(this.data={totalVisits:a.totalVisits|0,days:a.days&&typeof a.days=="object"?a.days:{},dwell:a.dwell&&typeof a.dwell=="object"?a.dwell:{}})}}catch{}this._saveTimer=null}_save(){this._saveTimer||(this._saveTimer=setTimeout(()=>{this._saveTimer=null;try{localStorage.setItem(this.key,JSON.stringify(this.data))}catch{}},2e3))}addVisit(e){if(!e||this._seen.has(e))return;this._seen.add(e),this.data.totalVisits+=1;const o=ma();this.data.days[o]=(this.data.days[o]|0)+1;const a=Object.keys(this.data.days).sort();for(;a.length>60;)delete this.data.days[a.shift()];this._save()}addDwell(e,o,a){if(!e||!e.length||!o||!o.length)return;let n=!1;for(const r of e){let i=null,l=ki;for(const c of o){const d=Math.hypot(c.pos.x-r.x,c.pos.z-r.z);d<l&&(l=d,i=c)}i&&i.title&&(this.data.dwell[i.title]=(this.data.dwell[i.title]||0)+a,n=!0)}n&&this._save()}summary(e){const a=[`오늘 방문 ${this.data.days[ma()]|0}`,`누적 ${this.data.totalVisits}`];typeof e=="number"&&a.push(`방명록 ${e}`);const n=Object.entries(this.data.dwell).sort((r,i)=>i[1]-r[1])[0];if(n&&n[1]>=10){const r=n[1]>=60?`${Math.round(n[1]/60)}분`:`${Math.round(n[1])}초`;a.push(`인기작 「${n[0]}」 ${r}`)}return a.join(" · ")}}const on="#5f9e7d";function Ci(){const t=`
/* 폰트(@font-face·스택)는 SSOT인 vendor/fonts/fonts.css가 담당 — index.html <head>에서
   정적 <link>로 로드된다. 여기선 그 단일 스택(--app-font)만 --lu-font로 잇는다. */
:root {
  --lu-gold: ${on};
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
`,e=document.createElement("style");e.id="lu-styles",e.textContent=t,document.head.appendChild(e)}function s(t,e={},o=[]){const a=document.createElement(t);for(const[n,r]of Object.entries(e))n==="className"?a.className=r:n==="text"?a.textContent=r:a.setAttribute(n,r);for(const n of o)a.appendChild(n);return a}const Mi="lu-chibi-look::",Li="lu-chibi-thumb::",zi="lu-chibi-closet::",Ti="lu-chibi-look-v1",_i="lu-chibi-look-thumb-v1",xa=12;function so(){const t=Rt();return t&&t.provider&&t.name?`${t.provider}:${t.name}`:"guest"}function to(t){return Mi+(t||so())}function jo(t){return Li+(t||so())}function an(t){return zi+(t||so())}function Ni(){try{const t=localStorage.getItem(Ti);if(t&&!localStorage.getItem(to("guest"))){localStorage.setItem(to("guest"),t);const e=localStorage.getItem(_i);e&&localStorage.setItem(jo("guest"),e)}}catch{}}Ni();function nn(t){try{const e=localStorage.getItem(to(t));if(!e)return null;const o=JSON.parse(e);return o&&typeof o=="object"?o:null}catch{return null}}function Ii(t,e){try{return localStorage.setItem(to(e),JSON.stringify(t)),!0}catch{return!1}}function wa(t){try{return localStorage.getItem(jo(t))||""}catch{return""}}function Ai(t,e){try{localStorage.setItem(jo(e),t)}catch{}}let Uo=null;function Ri(t){Uo=t}function rn(){return Uo||nn()}Qa(()=>{Uo=null});function ho(t){try{const e=localStorage.getItem(an(t));if(!e)return[];const o=JSON.parse(e);return Array.isArray(o)?o:[]}catch{return[]}}function ya(t,e){try{return localStorage.setItem(an(e),JSON.stringify(t)),!0}catch{return!1}}function Pi(t,e,o){try{const a=document.createElement("canvas");return a.width=e,a.height=o,a.getContext("2d").drawImage(t,0,0,e,o),a.toDataURL("image/jpeg",.72)}catch{return""}}let rt=null,lt=null,oe=null,Re=0,Pe=!1,go=0,Be=0,bo=Math.PI;const Bi=yt.degToRad(18),Oi=.6,va='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 19.5C4.5 10 11 4 20 4c0 9-6 15.5-15.5 15.5A1 1 0 0 1 4.5 19.5Z"/><path d="M6.7 17.3C10.2 13.3 14.2 9.3 18 5.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>',Di=[{id:"species",label:"종족",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8.3" r="2.1"/><circle cx="12" cy="6.1" r="2.1"/><circle cx="17" cy="8.3" r="2.1"/><path d="M12 11.6c-3.4 0-6.1 2.4-6.1 5.2 0 2 1.8 3.3 3.7 2.6.9-.3 1.7-.3 2.6 0 1.9.7 3.7-.6 3.7-2.6 0-2.8-2.5-5.2-5.9-5.2Z"/></svg>'},{id:"face",label:"얼굴",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><path d="M8.6 14.6c1 1.1 2.1 1.7 3.4 1.7s2.4-.6 3.4-1.7"/></svg>'},{id:"hair",label:"헤어",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12.5C5 8 8.1 4.5 12 4.5s7 3.5 7 8"/><path d="M6.3 12.5v3.2M10.1 12.5v4.2M13.9 12.5v4.2M17.7 12.5v3.2"/></svg>'},{id:"outfit",label:"의상",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8.3 4.2 4.3 7.3l2 3 2-1.1v9.6h7.4V9.2l2 1.1 2-3-4-3.1c-.7 1-1.8 1.6-3.7 1.6s-3-.6-3.7-1.6Z"/></svg>'},{id:"acc",label:"장식",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.5 3.5 1.7 6.3 5.2 7.6-3.5 1.3-4.7 4.1-5.2 7.6-.5-3.5-1.7-6.3-5.2-7.6C10.3 9.3 11.5 6.5 12 3Z"/><circle cx="19" cy="5.2" r="1.2"/></svg>'},{id:"closet",label:"옷장",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.3"/><path d="M12 5.9v1.8"/><path d="M12 7.7 4.3 13.4h15.4L12 7.7Z"/><path d="M4.3 17.4h15.4"/></svg>'}];function Gi(t){const{els:e,state:o,callbacks:a,setStatus:n}=t,r=s("button",{id:"lu-am-save",type:"button","aria-label":"이 캐릭터 사용",title:"이 캐릭터 사용",text:"✓"}),i=s("button",{id:"lu-am-close",type:"button","aria-label":"닫기",text:"×"}),l=s("span",{className:"lu-am-title-icon","aria-hidden":"true"});l.innerHTML=va;const c=s("div",{className:"lu-am-title"},[l,s("span",{text:"캐릭터 디자인"})]),d=s("div",{className:"lu-am-head-actions"},[r,i]),f=s("div",{className:"lu-am-head"},[c,d]),g=s("canvas",{width:"300",height:"400"}),u=s("div",{className:"lu-am-stage"},[g]),y=s("div",{className:"lu-am-stagewrap"},[u]),x=s("div",{className:"lu-am-preview"},[y]),m=["wave","jump","clap","dance","breakdance","run","jumpingjack","heart","kick"];let v=1,b=null,p=null,D=null,X=null;function F(k,T){if(typeof document>"u")return null;const S=document.createElement("canvas");S.width=2,S.height=256;const B=S.getContext("2d"),A=B.createLinearGradient(0,0,0,256);A.addColorStop(0,k),A.addColorStop(1,T),B.fillStyle=A,B.fillRect(0,0,2,256);const W=new ye(S);return W.colorSpace=Ot,W}function O(k,T){if(typeof document>"u")return null;const S=512,B=307,A=document.createElement("canvas");A.width=S,A.height=B;const W=A.getContext("2d");W.fillStyle=k,W.fillRect(0,0,S,B);const mt=28,_t=S/mt;W.fillStyle=T;for(let ue=0;ue<mt;ue++)W.fillRect(ue*_t,0,_t/2,B);const de=new ye(A);return de.colorSpace=Ot,de.anisotropy=4,de}function j(){if(b)return;b=new Xa({canvas:g,antialias:!0,alpha:!0}),b.setPixelRatio(Math.min(2,typeof window<"u"&&window.devicePixelRatio||1)),b.setSize(300,400,!1),b.shadowMap.enabled=!0,b.shadowMap.type=qn,b.toneMapping=Ha,b.toneMappingExposure=1,b.outputColorSpace=Ot,p=new Fa,p.background=F("#f0ead9","#ddd2bd")||new Oa("#ddd2bd"),p.fog=new Da(14603199,5.5,10),D=new Ya(30,300/400,.1,20),D.position.set(0,1,4),D.lookAt(0,.85,0),p.add(new Ba(16775924,2367256,.65));const k=new ne(16777215,1.4);k.position.set(.7,2,2.6),p.add(k);const T=new ne(16776696,.4);T.position.set(-1.8,1.1,1.6),p.add(T);const S=new ne(16777215,0);S.position.set(.4,5,1),S.castShadow=!0,S.shadow.mapSize.set(512,512),S.shadow.camera.near=.5,S.shadow.camera.far=9,S.shadow.camera.left=-1.3,S.shadow.camera.right=1.3,S.shadow.camera.top=1.3,S.shadow.camera.bottom=-1.3,S.shadow.radius=35,S.shadow.blurSamples=24,S.shadow.bias=-5e-4,p.add(S),p.add(S.target);const B=new R(new at(6,6),new dt({color:12165231,roughness:.9,metalness:0}));B.rotation.x=-Math.PI/2,B.position.y=0,B.receiveShadow=!0,p.add(B);const A=new R(new at(6,6),new Jn({opacity:.3}));A.rotation.x=-Math.PI/2,A.position.y=.002,A.material.polygonOffset=!0,A.material.polygonOffsetFactor=-1,A.receiveShadow=!0,p.add(A);const W=O("#e2d7bf","#efe7d3"),mt=new R(new at(10,6),new dt({map:W,roughness:.9,metalness:0}));mt.position.set(0,2.2,-2.3),p.add(mt),X=new Qt,X.rotation.y=Math.PI,p.add(X)}let w="species";const C=s("div",{className:"lu-am-nav",role:"tablist","aria-label":"캐릭터 디자인 카테고리"}),_=s("div",{className:"lu-am-panel"}),N=s("div",{className:"lu-am-tabpage",id:"lu-am-tabpanel",role:"tabpanel",tabindex:"0"});_.appendChild(C),_.appendChild(N),C.addEventListener("keydown",k=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(k.key))return;const T=[...C.querySelectorAll(".lu-am-navtab")];if(!T.length)return;const S=T.findIndex(W=>W.getAttribute("aria-selected")==="true");let B=S<0?0:S;k.key==="ArrowLeft"?B=(S-1+T.length)%T.length:k.key==="ArrowRight"?B=(S+1)%T.length:k.key==="Home"?B=0:k.key==="End"&&(B=T.length-1),k.preventDefault(),T[B].click();const A=C.querySelectorAll(".lu-am-navtab")[B];A&&A.focus()});const L=s("div",{className:"lu-am-body"},[x,_]),P=s("div",{className:"lu-am-card"},[f,L]),M=s("div",{id:"lu-chibi-maker",className:"lu"},[P]);document.body.appendChild(M);function z(k,T){rt&&(rt[k]=T,k==="species"&&T!=="human"&&ra[T]&&Object.assign(rt,ra[T]),rt=po(rt),co(),ee())}function I(k){rt=po(Object.assign({},k)),co(),ee()}function Y(){for(const k of Er){const T=Cr.filter(B=>(B.cat||"human")===k.id);if(!T.length)continue;N.appendChild(s("div",{className:"lu-am-section-title",text:`${k.name} (${T.length})`}));const S=s("div",{className:"lu-am-tabs lu-am-presets"});for(const B of T){const A=s("button",{type:"button",className:"lu-am-tab lu-am-preset"}),W=B.look.skin||We.skin,mt=B.look.top||B.look.hairColor||We.top,_t=s("span",{className:"lu-am-preset-dot","aria-hidden":"true"});_t.style.background=`conic-gradient(${W} 0deg 180deg, ${mt} 180deg 360deg)`,A.appendChild(_t),A.appendChild(s("span",{className:"lu-am-preset-label",text:B.name})),A.addEventListener("click",()=>I(B.look)),S.appendChild(A)}N.appendChild(S)}}function $(k){const T=ia.find(S=>S.id===k);return T&&T.name||"아야모"}function Q(){if(!Rt())return;const k=so();it("내 옷장");const T=s("button",{type:"button",className:"lu-am-btn lu-closet-save",text:"＋ 지금 모습 옷장에 저장"});T.addEventListener("click",()=>{const A=ho(k);if(A.length>=xa){n(`옷장은 최대 ${xa}벌까지 저장할 수 있어요`);return}const W={id:"c"+Date.now(),name:$(rt.species),look:JSON.parse(JSON.stringify(rt)),thumb:oa(120,160),ts:Date.now()};if(A.push(W),!ya(A,k)){n("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요");return}ee()}),N.appendChild(T);const S=ho(k);if(!S.length){N.appendChild(s("div",{className:"lu-closet-empty",text:"아직 저장한 옷이 없어요. 마음에 드는 모습을 저장해 두세요."}));return}const B=s("div",{className:"lu-closet-grid"});S.forEach(A=>{const W=s("div",{className:"lu-closet-cell"}),mt=s("button",{type:"button",className:"lu-closet-load",title:`${A.name} 불러오기`,"aria-label":`${A.name} 불러오기`});A.thumb&&(mt.style.backgroundImage=`url('${A.thumb}')`),mt.appendChild(s("span",{className:"lu-closet-name",text:A.name})),mt.addEventListener("click",()=>I(A.look));const _t=s("button",{type:"button",className:"lu-closet-del",text:"×",title:"삭제","aria-label":`${A.name} 삭제`});_t.addEventListener("click",de=>{de.stopPropagation();const ue=ho(k).filter(Yn=>Yn.id!==A.id);ya(ue,k),ee()}),W.appendChild(mt),W.appendChild(_t),B.appendChild(W)}),N.appendChild(B)}const V=(k,T)=>[{id:!1,name:k},{id:!0,name:T}];function q(k,T,S){N.appendChild(s("div",{className:"lu-am-section-title",text:k}));const B=s("div",{className:"lu-am-tabs"});T.forEach(A=>{const W=s("button",{type:"button",className:"lu-am-tab"+(rt[S]===A.id?" lu-selected":""),text:A.name});W.addEventListener("click",()=>z(S,A.id)),B.appendChild(W)}),N.appendChild(B)}function tt(k,T,S){N.appendChild(s("div",{className:"lu-am-section-title",text:k}));const B=s("div",{className:"lu-swatches"});T.forEach(A=>{const W=s("button",{type:"button",className:"lu-swatch"+(rt[S]===A?" lu-selected":""),style:`background:${A};`,title:A,"aria-label":`${k} ${A}`});W.addEventListener("click",()=>z(S,A)),B.appendChild(W)}),N.appendChild(B)}function it(k){const T=s("div",{className:"lu-am-group-title"}),S=s("span",{className:"lu-am-group-icon","aria-hidden":"true"});S.innerHTML=va,T.appendChild(S),T.appendChild(s("span",{text:k})),N.appendChild(T)}function Ce(){C.textContent="";const k=!!Rt(),T=Di.filter(S=>S.id!=="closet"||k);T.some(S=>S.id===w)||(w="species"),T.forEach(S=>{const B=w===S.id,A=s("button",{type:"button",role:"tab",id:"lu-am-tab-"+S.id,className:"lu-am-navtab"+(B?" lu-selected":""),"aria-selected":B?"true":"false","aria-controls":"lu-am-tabpanel",tabindex:B?"0":"-1","aria-label":S.label});A.innerHTML=S.icon,A.appendChild(s("span",{className:"lu-am-navtab-label",text:S.label})),A.addEventListener("click",()=>{w!==S.id&&(w=S.id,ee(),N.scrollTop=0)}),C.appendChild(A)}),N.setAttribute("aria-labelledby","lu-am-tab-"+w)}function ee(){if(Ce(),N.textContent="",!rt)return;const k=rt.species&&rt.species!=="human";w==="species"?(Y(),it(k?"종족 · 털색":"종족 · 성별 · 피부색"),q("종족",ia,"species"),k||q("성별",Mr,"gender"),tt(k?"털 색":"피부색",Lr,"skin")):w==="face"?(it("얼굴"),q("얼굴형",zr,"face"),q("눈",Tr,"eyeStyle"),q("입",_r,"mouth"),k||q("수염",Nr,"beardStyle"),q("볼터치",V("없음","있음"),"blush"),tt("눈동자 색",Ir,"eyeColor")):w==="hair"?k?(it("포인트"),tt("귀·꼬리 색",sa,"hairColor")):(it("헤어"),q("헤어",Ar,"hairStyle"),tt("머리 색",sa,"hairColor")):w==="outfit"?(it("의상"),q("상의 패턴",Rr,"pattern"),q("의상 세트",Pr,"outfit"),q("하의",Br,"bottomType"),tt("상의 색",fo,"top"),tt("하의 색",fo,"bottom"),tt("신발 색",fo,"shoes")):w==="acc"?(it("장식"),q("머리 장식",Or,"acc"),q("안경",V("없음","착용"),"glasses"),q("헤일로",V("없음","있음"),"halo"),q("날개",V("없음","있음"),"wings"),q("가슴 하트",V("없음","있음"),"heart")):w==="closet"&&Q()}function co(){!rt||!X||(lt&&(X.remove(lt.group),lt.dispose(),lt=null),lt=Fo(zo(rt),on," ",{blobShadow:!1}),lt.group.traverse(k=>{k.isMesh&&(k.castShadow=!0)}),X.add(lt.group))}function ta(k){oe=requestAnimationFrame(ta);const T=Re?(k-Re)/1e3:0,S=Math.min(.1,T);if(Re=k,!Pe&&(Be+=S,X.rotation.y=bo+Math.sin(Be*Oi)*Bi,v-=T,v<=0&&lt&&typeof lt.playAction=="function")){const B=m[Math.floor(Math.random()*m.length)];lt.playAction(B),v=(Dr[B]||1.5)+.6+Math.random()*.9}lt&&lt.update(S,0),b.render(p,D)}function Gn(){oe||(Re=0,oe=requestAnimationFrame(ta))}function Xn(){oe&&cancelAnimationFrame(oe),oe=null}g.addEventListener("pointerdown",k=>{Pe=!0,go=k.clientX,x.classList.add("lu-dragging"),g.setPointerCapture(k.pointerId)}),g.addEventListener("pointermove",k=>{Pe&&(X.rotation.y+=(k.clientX-go)*.012,go=k.clientX)});const ea=()=>{Pe=!1,x.classList.remove("lu-dragging"),bo=X.rotation.y,Be=0};g.addEventListener("pointerup",ea),g.addEventListener("pointercancel",ea),i.addEventListener("click",()=>Me()),M.addEventListener("click",k=>{k.target===M&&Me()});function oa(k,T){try{return b?(b.render(p,D),Pi(g,k,T)||b.domElement.toDataURL("image/png")):""}catch{return""}}function Hn(){const T=!!Rt()?"저장하고 사용":"이 캐릭터 사용";r.setAttribute("aria-label",T),r.title=T}r.addEventListener("click",()=>{if(!rt)return;const k=JSON.parse(JSON.stringify(rt));Ri(k);const T=!!Rt();if(T){const S=Ii(k),B=oa(150,200);B&&Ai(B),S||n("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요")}e&&e.lobby&&e.lobby.onChibiSaved(),o.entered&&typeof a.onAvatarChange=="function"&&a.onAvatarChange(zo(k)),T||n("이 캐릭터로 적용했어요 · 회원가입하면 저장돼요"),Me()});function Fn(){w="species",rt=po(Object.assign({},We,rn()||{})),Hn(),j(),X.rotation.y=Math.PI,bo=Math.PI,Be=0,v=1,co(),ee(),M.classList.add("lu-open"),o.chibiOpen=!0,Gn(),typeof a.onMakerToggle=="function"&&a.onMakerToggle(!0)}function Me(){M.classList.remove("lu-open"),o.chibiOpen=!1,Xn(),lt&&(X.remove(lt.group),lt.dispose(),lt=null),typeof a.onMakerToggle=="function"&&a.onMakerToggle(!1)}return{open:Fn,close:Me}}const Xi=8,Oe=12;let h=null,st={onEnter:null,onChatSend:null,onAvatarChange:null,onMakerToggle:null},ka=Mo[0];const re={chibiOpen:!1,entered:!1};let _o=null,Sa=!1,Vt=!1,No=null,jt=null,Kt=!1,Io=null,Zt=!1,Ao=null,eo=null;const De=120;let Mt={onPrev:null,onNext:null,onExit:null,onToggleAuto:null};const qt=typeof window<"u"&&"ontouchstart"in window||typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches;let vt={onTour:null,onViewArtwork:null,onGuestbook:null,onCapture:null,onSelfView:null},Jt=!1,ut={blob:null,dataUrl:"",galleryName:"",shareUrl:""},Ut=null,oo=null,Pt=null,ao=null;function Hi(){const t=s("div",{id:"lu-loading",className:"lu"},[s("div",{className:"lu-spinner"}),s("div",{className:"lu-loading-text",text:"MUSEUM LOADING..."})]);return document.body.appendChild(t),t}function Fi(){const t=s("div",{className:"lu-lobby-title",text:"OpenArtShow MUSEUM"}),e=s("div",{className:"lu-lobby-sub",text:"VIRTUAL EXHIBITION"}),o=s("div",{className:"lu-lobby-rule"}),a=s("div",{id:"lu-auth"}),n=s("div",{className:"lu-social-wrap"}),r=s("div",{className:"lu-logged-wrap"}),i=()=>{n.textContent="";for(const L of Object.keys(_e)){const P=_e[L],M=s("button",{className:`lu-social-btn lu-social-${L}`,type:"button"},[s("span",{className:"lu-social-badge",text:P.short}),s("span",{text:P.label})]);M.addEventListener("click",async()=>{M.disabled=!0,M.classList.add("lu-social-busy");try{await Gr(L)}catch{}M.disabled=!1,M.classList.remove("lu-social-busy")}),n.appendChild(M)}n.appendChild(s("div",{className:"lu-social-note",text:"계정 연동 준비 중 — 지금은 프로필 미리보기로 동작합니다"}))},l=L=>{r.textContent="";const P=s("span",{className:"lu-logged-avatar",text:L.initial||L.name.slice(0,1)}),M=s("span",{className:"lu-logged-name",text:`${L.name}님`}),z=s("span",{className:"lu-logged-via",text:_e[L.provider]?_e[L.provider].short:""}),I=s("button",{className:"lu-logout-btn",type:"button",text:"로그아웃"});I.addEventListener("click",()=>Hr()),r.appendChild(s("div",{className:"lu-logged-chip"},[P,M,z,I]))},c=L=>{L?(l(L),n.style.display="none",r.style.display="",g.value=L.name.slice(0,Oe)):(n.style.display="",r.style.display="none",(!g.value||Object.values(Xr).includes(g.value))&&(g.value="게스트")),m()};i(),a.appendChild(n),a.appendChild(r);const d=s("div",{className:"lu-auth-or"},[s("span",{text:"소셜 계정 연동 (준비 중)"})]),f=s("label",{className:"lu-field-label",for:"lu-nickname",text:"닉네임"}),g=s("input",{id:"lu-nickname",type:"text",maxlength:String(Oe),value:"게스트",autocomplete:"off",spellcheck:"false"}),u=s("div",{className:"lu-field-hint",text:`최대 ${Oe}자 · 비워두면 '게스트'로 입장합니다`}),y=s("div",{className:"lu-field-label",text:"캐릭터",style:"margin-top:26px;"}),x=s("button",{id:"lu-char-design",className:"lu-char-design-btn",type:"button","aria-label":"캐릭터 디자인 — 나만의 아야모 만들기"});function m(){const L=wa();x.textContent="";const P=s("span",{className:"lu-char-design-media"});L?(P.classList.add("lu-has-thumb"),P.style.backgroundImage=`url('${L}')`):P.textContent="🎨";const M=s("span",{className:"lu-char-design-txt"},[s("b",{text:"캐릭터 디자인"}),s("span",{text:L?"내 아야모 편집하기":"나만의 아야모 만들기 (선택)"})]);x.append(P,M,s("span",{className:"lu-char-design-arrow",text:"›"}))}m(),x.addEventListener("click",()=>$o());const v=s("button",{id:"lu-enter-btn",type:"button",text:"입장하기"}),b=s("div",{id:"lu-picker"}),p=s("div",{className:"lu-lobby-divider"}),D=s("a",{className:"lu-studio-link",href:"./studio.html",target:"_blank",rel:"noopener noreferrer",text:"작가 스튜디오에서 나만의 전시 만들기 →"}),X=s("div",{className:"lu-lobby-form"},[f,g,u,y,x,v,d,a]),F=s("div",{className:"lu-quick-enter"});function O(){F.textContent="";const L=Rt(),P=wa(),M=s("span",{className:"lu-quick-avatar"});P?M.style.backgroundImage=`url('${P}')`:M.textContent="🙂";const z=s("div",{className:"lu-quick-greet"},[s("b",{text:(L?`${L.name}님, `:"")+"다시 오셨어요"}),s("span",{text:"저장한 모습으로 바로 입장할 수 있어요"})]),I=s("button",{className:"lu-quick-btn",type:"button",text:"바로 입장"});I.addEventListener("click",_);const Y=s("button",{className:"lu-quick-change",type:"button",text:"닉네임·캐릭터 바꾸기"});Y.addEventListener("click",()=>{X.classList.remove("lu-collapsed"),F.style.display="none";try{g.focus()}catch{}}),F.append(M,z,I,Y)}!!(Rt()||nn())?(O(),X.classList.add("lu-collapsed")):F.style.display="none";const w=s("div",{className:"lu-lobby-card"},[t,e,o,F,X,b,p,D]),C=s("div",{id:"lu-lobby",className:"lu"},[w]);document.body.appendChild(C),c(Rt()),Qa(c);function _(){let L=g.value.trim().slice(0,Oe);L||(L="게스트");let P=0;for(let z=0;z<L.length;z++)P=P*31+L.charCodeAt(z)>>>0;ka=Mo[P%Mo.length];const M=zo(Object.assign({},We,rn()||{}));typeof st.onEnter=="function"&&st.onEnter({nickname:L,color:ka,char:M})}v.addEventListener("click",_),g.addEventListener("keydown",L=>{L.stopPropagation(),L.key==="Enter"&&_()}),g.addEventListener("keyup",L=>L.stopPropagation());function N(){m()}return{overlay:C,nickInput:g,pickerBox:b,onChibiSaved:N}}function Yi(){const t=qt?[["왼쪽 드래그","이동"],["오른쪽 드래그","시점 회전"],["캐릭터 탭","콕 찌르기"],["작품 카드","탭하여 크게 보기"]]:[["마우스 드래그","시점 회전"],["W A S D","이동"],["Shift","달리기"],["Enter","채팅"],["M","작품 목록"],["T","투어"],["G","방명록"],["V","내 모습 보기"],["C","캐릭터 디자인"],["P","사진 촬영"],["클릭","캐릭터 콕 찌르기"]],e=s("div",{id:"lu-controls",className:"lu lu-hud"});if(e.appendChild(s("div",{className:"lu-controls-title",text:"CONTROLS"})),t.forEach(([o,a])=>{const n=s("div",{},[s("span",{className:"lu-key",text:o}),s("span",{text:a})]);e.appendChild(n)}),document.body.appendChild(e),qt){e.classList.add("lu-collapsed");const o=s("button",{id:"lu-controls-toggle",className:"lu lu-hud",type:"button","aria-label":"조작법 보기",text:"?"});o.addEventListener("click",()=>{e.classList.toggle("lu-collapsed")}),document.body.appendChild(o)}return e}function ji(){if(!qt)return null;function t(){const p=h&&h.chat&&h.chat.wrap;if(!p)return;const D=p.classList.toggle("lu-chat-collapsed");!D&&h.chat.input?h.chat.input.focus():h.chat.input&&h.chat.input.blur(),r.classList.toggle("lu-on",!D)}const e={chat:'<path d="M20 15a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',tour:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z"/>',capture:'<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',more:'<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',list:'<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',self:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',help:'<path d="M9.2 9a2.9 2.9 0 1 1 4.2 2.6c-.9.45-1.4 1.05-1.4 2.1"/><circle cx="12" cy="17.4" r="1" fill="currentColor" stroke="none"/>',dress:'<path d="M9 4l3 3 3-3M9 4l-1.5 5 4.5 3 4.5-3L18 4M7.5 9l-2 8h13l-2-8"/>'};function o(p){const D=document.createElement("span");return D.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+e[p]+"</svg>",D.firstChild}function a(p,D,X,F){const O=s("button",{className:p,type:"button","aria-label":D});O.appendChild(o(X)),O.appendChild(s("span",{className:"lu-dock-label",text:F}));const j=s("div",{className:"lu-dock-wrap"},[O]);return{b:O,wrap:j}}const n=a("lu-dock-btn","채팅 열기/닫기","chat","채팅"),r=n.b;n.wrap.style.display="none",r.addEventListener("click",t);const i=a("lu-dock-btn","투어 시작/종료","tour","투어"),l=i.b;l.addEventListener("click",()=>{typeof vt.onTour=="function"&&vt.onTour()});const c=a("lu-dock-btn lu-gold","사진 촬영","capture","캡처"),d=c.b;d.addEventListener("click",()=>{d.classList.remove("lu-cap-pop"),d.offsetWidth,d.classList.add("lu-cap-pop"),typeof vt.onCapture=="function"&&vt.onCapture()});const f=a("lu-dock-btn","더보기","more","메뉴"),g=f.b,u=s("div",{id:"lu-more-backdrop"}),y=s("div",{id:"lu-more-sheet"});function x(){y.classList.remove("lu-open"),u.classList.remove("lu-open")}function m(p,D,X){const F=s("button",{className:"lu-sheet-btn",type:"button"});return F.appendChild(o(p)),F.appendChild(s("span",{text:D})),F.addEventListener("click",()=>{x(),X()}),F}const v=s("div",{className:"lu-sheet-grid"},[m("list","작품 목록",()=>hn()),m("self","내 모습",()=>{typeof vt.onSelfView=="function"&&vt.onSelfView()}),m("dress","캐릭터 디자인",()=>$o()),m("chat","채팅",t),m("help","조작법",()=>{const p=document.getElementById("lu-controls");p&&p.classList.toggle("lu-collapsed")})]);y.append(s("div",{className:"lu-sheet-handle"}),v),u.addEventListener("click",x),g.addEventListener("click",()=>{const p=y.classList.toggle("lu-open");u.classList.toggle("lu-open",p)}),document.body.appendChild(u),document.body.appendChild(y);const b=s("div",{id:"lu-dock",className:"lu lu-hud"},[n.wrap,i.wrap,c.wrap,f.wrap]);return document.body.appendChild(b),$t={chatBtn:r,chatWrap:n.wrap,tourBtn:l,selfBtn:null,dock:b},b}let $t=null;function no(t,e){$t&&t==="tour"&&$t.tourBtn&&$t.tourBtn.classList.toggle("lu-on",!!e)}function Ui(){const t=s("span",{text:"--"}),e=s("div",{className:"lu-stat"});e.append("FPS ");const o=s("b");o.appendChild(t),e.appendChild(o);const a=s("div",{id:"lu-topright",className:"lu lu-hud"},[e]);return document.body.appendChild(a),{wrap:a,fps:t,count:s("span"),countWrap:null}}function $i(){const t=s("div",{id:"lu-status",className:"lu lu-hud"});return document.body.appendChild(t),t}function Wi(){const t=s("div",{id:"lu-chat-log"}),e=s("input",{id:"lu-chat-input",type:"text",maxlength:"120",placeholder:qt?"탭하여 채팅…":"Enter 키로 채팅…",autocomplete:"off",spellcheck:"false"}),o=s("div",{id:"lu-chat",className:"lu lu-hud"},[t,e]);return qt&&o.classList.add("lu-chat-collapsed"),document.body.appendChild(o),e.addEventListener("keydown",a=>{if(a.stopPropagation(),a.key==="Enter"){const n=e.value.trim();e.value="",e.blur(),n&&typeof st.onChatSend=="function"&&st.onChatSend(n)}else a.key==="Escape"&&(e.value="",e.blur())}),e.addEventListener("keyup",a=>a.stopPropagation()),e.addEventListener("keypress",a=>a.stopPropagation()),{wrap:o,log:t,input:e}}function Vi(){const t=s("div",{className:"lu-art-eyebrow",text:"ARTWORK"}),e=s("div",{className:"lu-art-title"}),o=s("div",{className:"lu-art-meta"}),a=s("div",{className:"lu-art-rule"}),n=s("div",{className:"lu-art-desc"}),r=s("button",{className:"lu-art-hint",type:"button"});qt?r.appendChild(document.createTextNode("크게 보기")):(r.appendChild(s("span",{className:"lu-key",text:"E"})),r.appendChild(document.createTextNode(" — 크게 보기"))),r.addEventListener("click",l=>{l.stopPropagation(),typeof vt.onViewArtwork=="function"&&vt.onViewArtwork()});const i=s("div",{id:"lu-artwork",className:"lu"},[t,e,o,a,n,r]);return qt&&i.addEventListener("click",()=>{typeof vt.onViewArtwork=="function"&&vt.onViewArtwork()}),document.body.appendChild(i),{panel:i,title:e,meta:o,desc:n}}function Ki(){const t=s("span",{className:"lu-topbar-title"}),e=s("b",{text:"1"}),o=s("span",{className:"lu-topbar-count"});o.appendChild(e),o.append(" 명");const a=s("div",{id:"lu-topbar",className:"lu lu-hud lu-cut-s lu-empty"},[t,s("span",{className:"lu-topbar-sep"}),o]);return document.body.appendChild(a),a._count=e,a._countWrap=o,a}function Zi(){const t=s("button",{id:"lu-lightbox-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{className:"lu-lightbox-stage"}),o=s("div",{className:"lu-lightbox-title"}),a=s("div",{className:"lu-lightbox-meta"}),n=s("div",{className:"lu-lightbox-rule"}),r=s("div",{className:"lu-lightbox-desc"}),i=s("div",{className:"lu-lightbox-caption"},[o,a,n,r]),l=s("div",{id:"lu-lightbox",className:"lu"},[t,e,i]);document.body.appendChild(l),t.addEventListener("click",()=>Ve()),l.addEventListener("click",O=>{(O.target===l||O.target===e)&&Ve()});const c=new Map;let d=1,f=0,g=0,u=0,y=1,x=0,m=0,v=0,b=null;function p(){return e.querySelector(".lu-lightbox-media")}function D(){const O=p();O&&(O.style.transform=`translate(${f}px, ${g}px) scale(${d})`)}function X(){d=1,f=0,g=0,D()}l.addEventListener("pointerdown",O=>{if(c.set(O.pointerId,{x:O.clientX,y:O.clientY}),c.size===1&&(b={x:O.clientX,y:O.clientY,t:performance.now()}),c.size===2){const[j,w]=[...c.values()];u=Math.hypot(j.x-w.x,j.y-w.y),y=d}}),l.addEventListener("pointermove",O=>{const j=c.get(O.pointerId);if(!j)return;const w=O.clientX-j.x,C=O.clientY-j.y;if(j.x=O.clientX,j.y=O.clientY,c.size===2&&u>0){const[_,N]=[...c.values()];d=Math.min(4,Math.max(1,y*(Math.hypot(_.x-N.x,_.y-N.y)/u))),d===1&&(f=0,g=0),D()}else c.size===1&&d>1&&(f+=w,g+=C,D())});function F(O){if(c.delete(O.pointerId),c.size!==0||!b)return;const j=performance.now()-b.t,w=O.clientX-b.x,C=O.clientY-b.y;if(b=null,d===1&&j<600){if(Math.abs(w)>64&&Math.abs(C)<56){qi(w<0?1:-1);return}if(C>84&&Math.abs(w)<60){Ve();return}}if(Math.abs(w)<12&&Math.abs(C)<12&&j<350){const _=performance.now();if(_-x<320&&Math.hypot(O.clientX-m,O.clientY-v)<44){d>1?X():(d=2.4,D()),x=0;return}x=_,m=O.clientX,v=O.clientY}}return l.addEventListener("pointerup",F),l.addEventListener("pointercancel",O=>c.delete(O.pointerId)),{overlay:l,closeBtn:t,stage:e,title:o,meta:a,rule:n,desc:r,resetZoom:X}}let Ro=null;function qi(t){const e=Je();if(!Ro||e.length<2)return;const o=e.indexOf(Ro),a=e[((o===-1?0:o)+t+e.length)%e.length];fn(a)}const Ea="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#eaeae6"/></svg>');function sn(t){const e=h.artworkList.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(s("div",{className:"lu-artlist-empty",text:"표시할 작품이 없습니다"}));return}t.forEach(o=>{const a=s("img",{className:"lu-artlist-thumb",src:o.imageUrl||Ea,alt:o.title||"",loading:"lazy"});a.addEventListener("error",()=>{a.src=Ea},{once:!0});const n=s("div",{className:"lu-artlist-info"},[s("div",{className:"lu-artlist-name",text:o.title||""}),s("div",{className:"lu-artlist-artist",text:o.artist||""})]),r=s("button",{type:"button",className:"lu-artlist-card"},[a,n]);r.addEventListener("click",()=>{Ee(),typeof Io=="function"&&Io(o)}),e.appendChild(r)})}function Ji(){const t=s("button",{id:"lu-artlist-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{id:"lu-artlist-head"},[s("div",{id:"lu-artlist-title",text:"작품 목록"}),t]),o=s("div",{id:"lu-artlist-body"}),a=s("div",{id:"lu-artlist",className:"lu"},[e,o]);return document.body.appendChild(a),t.addEventListener("click",()=>Ee()),{panel:a,body:o}}function Qi(t){const e=Date.now(),o=Math.max(0,e-t),a=Math.floor(o/6e4);if(a<1)return"방금 전";if(a<60)return`${a}분 전`;const n=Math.floor(a/60);if(n<24)return`${n}시간 전`;const r=new Date(t),i=new Date(e),l=u=>new Date(u.getFullYear(),u.getMonth(),u.getDate()).getTime();if(Math.round((l(i)-l(r))/864e5)<=1)return"어제";const d=r.getFullYear(),f=String(r.getMonth()+1).padStart(2,"0"),g=String(r.getDate()).padStart(2,"0");return`${d}.${f}.${g}`}function ln(t){const e=h.guestbook.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(s("div",{className:"lu-gbook-empty",text:"첫 방명록을 남겨보세요"}));return}const o=["#e07a5f","#81b29a","#5f9e7d","#8e7dbe","#6a8caf","#d68fb8"];t.forEach(a=>{const n=a.name||"게스트";let r=0;for(let d=0;d<n.length;d++)r=r*31+n.charCodeAt(d)>>>0;const i=s("span",{className:"lu-gbook-dot"});i.style.background=o[r%o.length];const l=s("div",{},[i,s("span",{className:"lu-gbook-name",text:n}),s("span",{className:"lu-gbook-time",text:Qi(a.ts)})]),c=s("div",{className:"lu-gbook-text",text:a.text||""});e.appendChild(s("div",{className:"lu-gbook-note"},[l,c]))})}function ts(){const t=s("button",{id:"lu-guestbook-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{id:"lu-guestbook-head"},[s("div",{id:"lu-guestbook-title"},[s("span",{className:"lu-gb-eyebrow",text:"GUESTBOOK"}),s("span",{className:"lu-gb-main",text:"방명록"}),s("span",{className:"lu-gb-sub",text:"다녀간 마음을 한 줄 남겨 주세요"})]),t]),o=s("div",{id:"lu-guestbook-body"}),a=s("textarea",{id:"lu-gbook-input",rows:"3",maxlength:String(De),placeholder:"전시에 한 줄 메모를 남겨보세요…",spellcheck:"false"}),n=s("span",{className:"lu-gbook-count",text:`0/${De}`}),r=s("button",{id:"lu-gbook-submit",type:"button",text:"남기기"});r.disabled=!0;const i=s("div",{className:"lu-gbook-footer-row"},[n,r]),l=s("div",{id:"lu-gbook-stats",style:"font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.45);padding:6px 2px 0;"}),c=s("div",{id:"lu-guestbook-footer"},[a,i,l]),d=s("button",{id:"lu-gbtab",type:"button","aria-label":"방명록 열기/닫기 (위아래로 드래그해 위치 이동)",title:"드래그해서 위치를 옮길 수 있어요",text:"방명록"}),f="lu-gbtab-top-v1";try{const b=parseFloat(localStorage.getItem(f));Number.isFinite(b)&&(d.style.top=g(b)+"px")}catch{}function g(b){const p=Math.max(80,(window.innerHeight||800)-140);return Math.min(p,Math.max(60,b))}let u=null;d.addEventListener("pointerdown",b=>{const p=d.getBoundingClientRect();u={startY:b.clientY,startTop:p.top,moved:!1},d.setPointerCapture(b.pointerId)}),d.addEventListener("pointermove",b=>{if(!u)return;const p=b.clientY-u.startY;Math.abs(p)>6&&(u.moved=!0),u.moved&&(d.style.top=g(u.startTop+p)+"px")});const y=()=>{if(u&&u.moved)try{localStorage.setItem(f,String(parseFloat(d.style.top)))}catch{}setTimeout(()=>{u=null},0)};d.addEventListener("pointerup",y),d.addEventListener("pointercancel",y),d.addEventListener("click",()=>{u&&u.moved||Wo()});const x=s("div",{id:"lu-guestbook",className:"lu"},[e,o,c,d]);document.body.appendChild(x),t.addEventListener("click",()=>Vo());function m(){const b=a.value.length;n.textContent=`${b}/${De}`,r.disabled=a.value.trim().length===0}function v(){const b=a.value.trim().slice(0,De);b&&(a.value="",m(),a.blur(),typeof Ao=="function"&&Ao(b))}return a.addEventListener("keydown",b=>{b.stopPropagation(),b.key==="Escape"?(a.value="",m(),a.blur()):b.key==="Enter"&&(b.ctrlKey||b.metaKey)&&(b.preventDefault(),v())}),a.addEventListener("keyup",b=>b.stopPropagation()),a.addEventListener("keypress",b=>b.stopPropagation()),a.addEventListener("input",m),r.addEventListener("click",v),{panel:x,body:o,input:a,count:n,submitBtn:r,tab:d}}function es(){const t=s("button",{type:"button","aria-label":"이전 작품",text:"◀ 이전"}),e=s("span",{className:"lu-tour-sep"}),o=s("span",{className:"lu-tour-count"}),a=s("span",{className:"lu-tour-title"}),n=s("span",{className:"lu-tour-sep"}),r=s("button",{type:"button","aria-label":"다음 작품",text:"다음 ▶"}),i=s("span",{className:"lu-tour-sep"}),l=s("button",{type:"button",className:"lu-tour-auto"}),c=s("span",{className:"lu-tour-sep"}),d=s("button",{id:"lu-tourbar-exit",type:"button","aria-label":"투어 종료",text:"✕ 종료"}),f=s("div",{id:"lu-tourbar",className:"lu"},[t,e,o,a,n,r,i,l,c,d]);return document.body.appendChild(f),t.addEventListener("click",()=>{Mt.onPrev&&Mt.onPrev()}),r.addEventListener("click",()=>{Mt.onNext&&Mt.onNext()}),d.addEventListener("click",()=>{Mt.onExit&&Mt.onExit()}),l.addEventListener("click",()=>{Mt.onToggleAuto&&Mt.onToggleAuto()}),{bar:f,prevBtn:t,nextBtn:r,autoBtn:l,exitBtn:d,countEl:o,titleEl:a}}function os(){const t=s("div",{id:"lu-shutter",className:"lu"});return document.body.appendChild(t),t}function as(){const t=s("button",{id:"lu-share-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{className:"lu-share-title",text:"전시 공유하기"}),o=s("img",{className:"lu-share-preview",alt:"캡처한 전시 화면"}),a=s("button",{className:"lu-share-btn lu-share-btn-primary",type:"button",text:"기기로 공유"}),n=s("button",{className:"lu-share-btn",type:"button",text:"이미지 저장"}),r=s("button",{className:"lu-share-btn",type:"button",text:"X에 공유"}),i=s("button",{className:"lu-share-btn",type:"button",text:"Threads에 공유"}),l=s("button",{className:"lu-share-btn",type:"button",text:"링크 복사"}),c=s("div",{className:"lu-share-actions"},[a,n,r,i,l]),d=s("div",{className:"lu-share-hint",text:"인스타그램은 이미지를 저장하거나 기기로 공유한 뒤 앱에서 올려주세요"}),f=s("div",{className:"lu-share-card"},[t,e,o,c,d]),g=s("div",{id:"lu-share",className:"lu"},[f]);return document.body.appendChild(g),t.addEventListener("click",()=>Po()),g.addEventListener("click",u=>{u.target===g&&Po()}),a.addEventListener("click",async()=>{if(!(!ut.blob||typeof navigator>"u"||typeof navigator.share!="function"))try{const u=new File([ut.blob],"artshow.png",{type:"image/png"});await navigator.share({files:[u],title:ut.galleryName||"OpenArtShow",text:`${ut.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`})}catch{}}),n.addEventListener("click",()=>{if(!ut.dataUrl)return;const u=document.createElement("a");u.href=ut.dataUrl,u.download="artshow.png",document.body.appendChild(u),u.click(),document.body.removeChild(u)}),r.addEventListener("click",()=>{const u=`${ut.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`,y=`https://twitter.com/intent/tweet?text=${encodeURIComponent(u)}&url=${encodeURIComponent(ut.shareUrl||"")}`;window.open(y,"_blank","noopener")}),i.addEventListener("click",()=>{const u=`${ut.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시 ${ut.shareUrl||""}`,y=`https://www.threads.net/intent/post?text=${encodeURIComponent(u)}`;window.open(y,"_blank","noopener")}),l.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(ut.shareUrl||""),Ut&&clearTimeout(Ut),l.textContent="복사됨",l.classList.add("lu-share-btn-copied"),Ut=setTimeout(()=>{l.textContent="링크 복사",l.classList.remove("lu-share-btn-copied"),Ut=null},1600)}catch{}}),{overlay:g,card:f,title:e,preview:o,deviceBtn:a,saveBtn:n,xBtn:r,threadsBtn:i,copyBtn:l}}function $o(){!h||!h.chibiMaker||re.chibiOpen||Vt||Jt||Zt||Kt||h.chibiMaker.open()}function ns(){h&&h.chibiMaker&&h.chibiMaker.close()}function rs(){window.addEventListener("keydown",t=>{if(t.key==="Escape"){if(re.chibiOpen){t.preventDefault(),t.stopImmediatePropagation(),ns();return}if(Jt){t.preventDefault(),t.stopImmediatePropagation(),Po();return}if(Vt){t.preventDefault(),t.stopImmediatePropagation(),Ve();return}if(Kt){t.preventDefault(),t.stopImmediatePropagation(),Ee();return}if(Zt){t.preventDefault(),t.stopImmediatePropagation(),Vo();return}return}if(Vt||Jt||!re.entered)return;const e=document.activeElement;e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA")||(t.key==="Enter"?(t.preventDefault(),t.stopPropagation(),h.chat.input.focus()):(t.key==="c"||t.key==="C"||t.key==="ㅊ")&&!re.chibiOpen&&(t.preventDefault(),t.stopPropagation(),$o()))})}function is({onEnter:t,onChatSend:e,onAvatarChange:o,onMakerToggle:a}={}){if(Sa){st.onEnter=t||st.onEnter,st.onChatSend=e||st.onChatSend,st.onAvatarChange=o||st.onAvatarChange,st.onMakerToggle=a||st.onMakerToggle;return}Sa=!0,st.onEnter=t||null,st.onChatSend=e||null,st.onAvatarChange=o||null,st.onMakerToggle=a||null,Ci(),h={loading:Hi(),lobby:Fi(),controls:Yi(),topRight:Ui(),status:$i(),chat:Wi(),artwork:Vi(),galleryTitle:Ki(),lightbox:Zi(),artworkList:Ji(),guestbook:ts(),tourBar:es(),dock:ji(),shutter:os(),share:as()},h.chibiMaker=Gi({els:h,state:re,callbacks:st,setStatus:nt}),h.topRight.count=h.galleryTitle._count,h.topRight.countWrap=h.galleryTitle._countWrap,rs(),oo!==null&&dn(oo),Pt&&un(Pt.galleries,Pt.currentId,Pt.onPick),ao&&sn(ao),eo&&ln(eo)}function Ca(t){h&&h.loading.classList.toggle("lu-hidden",!t)}function ss(){if(!h)return;re.entered=!0,h.lobby.overlay.classList.add("lu-hidden"),h.controls.classList.add("lu-visible"),h.topRight.wrap.classList.add("lu-visible"),h.status.classList.add("lu-visible"),h.chat.wrap.classList.add("lu-visible"),h.galleryTitle.classList.add("lu-visible"),h.guestbook.tab.classList.add("lu-visible"),h.dock&&h.dock.classList.add("lu-visible");const t=document.getElementById("lu-controls-toggle");t&&t.classList.add("lu-visible")}function ls(t){!h||!t||_o===t.id&&h.artwork.panel.classList.contains("lu-open")||(_o=t.id,h.artwork.title.textContent=t.title||"",h.artwork.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),h.artwork.desc.textContent=t.desc||"",h.artwork.panel.classList.add("lu-open"))}function cs(){h&&(_o=null,h.artwork.panel.classList.remove("lu-open"))}function cn(t,e,o){if(!h)return;const a=s("div",{className:"lu-chat-msg"+(o?" lu-self":"")},[s("span",{className:"lu-chat-name",text:t}),s("span",{text:e})]);for(h.chat.log.appendChild(a);h.chat.log.children.length>Xi;)h.chat.log.removeChild(h.chat.log.firstChild)}function ds(t){if(!h)return;const e=h.topRight.count.textContent;h.topRight.count.textContent=String(t),e!==String(t)&&h.topRight.countWrap&&(h.topRight.countWrap.classList.remove("lu-tick"),h.topRight.countWrap.offsetWidth,h.topRight.countWrap.classList.add("lu-tick")),$t&&$t.chatWrap&&($t.chatWrap.style.display=t>=2?"":"none")}function nt(t){h&&(h.status.textContent=t||"")}function us(t){h&&(h.topRight.fps.textContent=String(Math.round(t)))}function dn(t){h.galleryTitle.querySelector(".lu-topbar-title").textContent=t||"",h.galleryTitle.classList.toggle("lu-empty",!t)}function ps(t){oo=t||"",h&&dn(oo)}function un(t,e,o){const a=h.lobby.pickerBox;if(a.innerHTML="",!Array.isArray(t)||t.length===0)return;const n=s("div",{className:"lu-field-label",text:"전시 선택",style:"margin-top:26px;"});a.appendChild(n),e==null&&a.appendChild(s("div",{className:"lu-picker-note",text:"공유된 전시 관람 중"}));const r=s("div",{className:"lu-picker-list"});t.forEach(i=>{const l=i.id===e,c=s("button",{type:"button",className:"lu-picker-item"+(l?" lu-picker-current":"")},[s("div",{className:"lu-picker-name",text:i.name||i.id}),s("div",{className:"lu-picker-meta",text:[i.artist,typeof i.count=="number"?`${i.count}점`:null].filter(Boolean).join(" · ")})]);l&&(c.disabled=!0),c.addEventListener("click",()=>{l||typeof o=="function"&&o(i.id)}),r.appendChild(c)}),a.appendChild(r)}function fs(t,e,o){Pt={galleries:t,currentId:e??null,onPick:o},h&&un(Pt.galleries,Pt.currentId,Pt.onPick)}function pn(){const t=h.lightbox.stage,e=t.firstChild;e&&e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),t.innerHTML=""}function fn(t){if(!h||!t)return;Ro=t,h.lightbox.resetZoom&&h.lightbox.resetZoom(),jt&&(clearTimeout(jt),jt=null),pn();let e;t.videoUrl?(e=s("video",{className:"lu-lightbox-media",src:t.videoUrl,controls:"controls",autoplay:"autoplay",loop:"loop",muted:"muted",playsinline:"playsinline"}),e.muted=!0):e=s("img",{className:"lu-lightbox-media",src:t.imageUrl||"",alt:t.title||""}),h.lightbox.stage.appendChild(e),h.lightbox.title.textContent=t.title||"",h.lightbox.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),h.lightbox.desc.textContent=t.desc||"",Vt=!0,h.lightbox.overlay.classList.add("lu-open")}function Ve(){!h||!Vt||(Vt=!1,h.lightbox.overlay.classList.remove("lu-open"),jt&&clearTimeout(jt),jt=setTimeout(()=>{pn(),jt=null},340),typeof No=="function"&&No())}function Et(){return Vt}function hs(t){No=typeof t=="function"?t:null}function gs(t,e){Io=typeof e=="function"?e:null,ao=t,h&&sn(ao)}function hn(){h&&(Kt?Ee():(Kt=!0,h.artworkList.panel.classList.add("lu-open")))}function Ee(){!h||!Kt||(Kt=!1,h.artworkList.panel.classList.remove("lu-open"))}function gn(){return Kt}function bs({index:t,total:e,title:o,autoOn:a}={}){if(!h)return;const n=h.tourBar,r=Number.isFinite(t)?t+1:1,i=Number.isFinite(e)?e:0;n.countEl.textContent=`● ${r} / ${i}`,n.titleEl.textContent=` — ${o||""}`,n.autoBtn.textContent=a?"자동진행 ON":"자동진행 OFF",n.autoBtn.classList.toggle("lu-tour-on",!!a),n.bar.classList.add("lu-open")}function ms(){h&&h.tourBar.bar.classList.remove("lu-open")}function xs({onTour:t,onViewArtwork:e,onGuestbook:o,onCapture:a,onSelfView:n}={}){vt={onTour:typeof t=="function"?t:null,onViewArtwork:typeof e=="function"?e:null,onGuestbook:typeof o=="function"?o:null,onCapture:typeof a=="function"?a:null,onSelfView:typeof n=="function"?n:null}}function ws({blob:t,dataUrl:e,galleryName:o,shareUrl:a}={}){if(!h)return;ut={blob:t||null,dataUrl:e||"",galleryName:o||"",shareUrl:a||(typeof window<"u"?window.location.href:"")},h.share.preview.src=ut.dataUrl;let n=!1;if(ut.blob&&typeof navigator<"u"&&typeof navigator.share=="function"&&typeof navigator.canShare=="function")try{const r=new File([ut.blob],"artshow.png",{type:"image/png"});n=navigator.canShare({files:[r]})}catch{n=!1}h.share.deviceBtn.style.display=n?"":"none",Ut&&(clearTimeout(Ut),Ut=null),h.share.copyBtn.textContent="링크 복사",h.share.copyBtn.classList.remove("lu-share-btn-copied"),Jt=!0,h.share.overlay.classList.add("lu-open")}function Po(){!h||!Jt||(Jt=!1,h.share.overlay.classList.remove("lu-open"))}function ro(){return Jt}function bn(){if(!h)return;const t=h.shutter;t.style.transition="none",t.style.opacity="1",t.offsetWidth,t.style.transition="opacity 0.25s ease",t.style.opacity="0"}function ys({onPrev:t,onNext:e,onExit:o,onToggleAuto:a}={}){Mt={onPrev:typeof t=="function"?t:null,onNext:typeof e=="function"?e:null,onExit:typeof o=="function"?o:null,onToggleAuto:typeof a=="function"?a:null}}function vs(t){const e=document.getElementById("lu-gbook-stats");e&&(e.textContent=t||"")}function ks({onSubmit:t}={}){Ao=typeof t=="function"?t:null}function Wo(){h&&(Zt?Vo():(Zt=!0,h.guestbook.panel.classList.add("lu-open")))}function Vo(){!h||!Zt||(Zt=!1,h.guestbook.panel.classList.remove("lu-open"))}function Ss(){return Zt}function Ko(t){eo=Array.isArray(t)?t:[],h&&ln(eo)}function Es(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}function Cs(t,e,o){let a=(e-t)%(Math.PI*2);return a>Math.PI&&(a-=Math.PI*2),a<-Math.PI&&(a+=Math.PI*2),t+a*o}function Ms(t){if(t!=="auto")return t;const e=new Date().getHours();return e>=6&&e<16?"daylight":e>=16&&e<19?"sunset":"night"}function Ls(t){let e=5381;for(let o=0;o<t.length;o++)e=(e<<5)+e+t.charCodeAt(o)>>>0;return e.toString(36)}const zs=24,Ts=45,_s=3,Bo="lu-spec-v2",mn=4;function Oo(){try{const t=localStorage.getItem(Bo);if(t){const e=JSON.parse(t);return e&&e.gen===mn&&(e.v==="low"||e.v==="high")?e.v:null}return null}catch{return null}}function mo(t){try{t?localStorage.setItem(Bo,JSON.stringify({v:t,gen:mn})):localStorage.removeItem(Bo),localStorage.removeItem("lu-spec-v1"),localStorage.removeItem("lu-lowspec-v1")}catch{}}const Ke={low:83e5,base:11e6,high:18e6},Ns=/swiftshader|llvmpipe|softpipe|software (?:rasterizer|renderer|adapter)|microsoft basic render|\bwarp\b|gdi generic|mesa offscreen|apple software renderer/i;function Is(){const t={name:"",soft:!1};try{const e=document.createElement("canvas"),a=!(e.getContext("webgl2",{failIfMajorPerformanceCaveat:!0})||e.getContext("webgl",{failIfMajorPerformanceCaveat:!0})),n=document.createElement("canvas"),r=n.getContext("webgl2")||n.getContext("webgl");if(!r)return{name:"",soft:!0};const i=r.getExtension("WEBGL_debug_renderer_info");t.name=String(i&&r.getParameter(i.UNMASKED_RENDERER_WEBGL)||r.getParameter(r.RENDERER)||""),t.soft=Ns.test(t.name)||a;const l=r.getExtension("WEBGL_lose_context");l&&l.loseContext()}catch{}return t}function As(t){const e=t.split(",")[1],o=atob(e),a=new Uint8Array(o.length);for(let n=0;n<o.length;n++)a[n]=o.charCodeAt(n);return new Blob([a],{type:"image/png"})}function Rs(t,e,o,a){const n=Math.max(90,Math.round(o*.14)),r=t.createLinearGradient(0,o-n,0,o);r.addColorStop(0,"rgba(0,0,0,0)"),r.addColorStop(1,"rgba(0,0,0,0.55)"),t.fillStyle=r,t.fillRect(0,o-n,e,n);const i=Math.max(20,Math.round(e*.025)),l=Math.max(1,e/1400);t.textBaseline="alphabetic",t.textAlign="left",t.fillStyle="rgba(255,255,255,0.95)",t.font=`300 ${Math.round(18*l)}px ${xe()}`,t.fillText(a||"OpenArtShow 전시",i,o-i-6*l),t.fillStyle="#5f9e7d",t.font=`300 ${Math.round(16*l)}px ${xe()}`,Ps(t,"OpenArtShow",e-i,o-i-22*l,2.5*l),t.textAlign="right",t.fillStyle="rgba(255,255,255,0.6)",t.font=`300 ${Math.round(12*l)}px ${xe()}`,t.fillText("syhongart.github.io/openartshow",e-i,o-i-4*l)}function Ps(t,e,o,a,n){const r=Array.from(e),i=r.map(f=>t.measureText(f).width),l=i.reduce((f,g)=>f+g,0)+n*(r.length-1),c=t.textAlign;t.textAlign="left";let d=o-l;r.forEach((f,g)=>{t.fillText(f,d,a),d+=i[g]+n}),t.textAlign=c}function Bs(){const t=window.location.href;return t.length<2e3?t:window.location.origin+window.location.pathname.replace(/index\.html$/,"landing.html")}let H=null,bt=null,U=null,Z=null,Do=null,G=null,ae=null,fe=null;const Os=new kr;let Xt=!1,he=0,xo=0,Go=0,wo=0,Ma=!1,gt={name:"",soft:!1};function Ds(t,e){const o=document.createElement("div");o.id="lu-gpu-notice",o.style.cssText=`position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:1200;max-width:min(92vw,600px);background:linear-gradient(180deg,#fffdf8,#f6f1e4);color:#17140f;border:1px solid rgba(95,158,125,0.55);border-radius:14px;padding:14px 44px 14px 18px;box-shadow:0 12px 32px rgba(20,15,8,0.35);font:13px/1.75 ${xe()};`;const a="<b>이 브라우저에서 3D 그래픽 기능을 사용할 수 없습니다</b><br>";o.innerHTML=a+'<b>Chrome</b>: 설정 → 시스템(<b>chrome://settings/system</b>) → "그래픽 가속 사용" 켜기 → 다시 시작<br><b>Edge</b>: 설정 → 시스템 및 성능 → "그래픽 가속 사용" 켜기 + "효율 모드" 끄기<br><b>Firefox</b>: 설정 → 일반 → 성능 → "권장 성능 설정" 해제 → "하드웨어 가속 사용" 체크<br>그래도 느리면: 원격 데스크톱 여부 확인 · 그래픽 드라이버 업데이트 · Windows 설정 → 디스플레이 → 그래픽에서 브라우저를 "고성능" GPU로 지정 · 확장프로그램 없는 시크릿 창으로 접속해 비교';const n=document.createElement("button");n.type="button",n.setAttribute("aria-label","닫기"),n.textContent="×",n.style.cssText="position:absolute;top:8px;right:10px;width:26px;height:26px;border:none;background:none;font-size:18px;color:#8a8172;cursor:pointer;",n.addEventListener("click",()=>o.remove());const r=document.createElement("button");r.type="button",r.textContent="진단 정보 복사",r.style.cssText="display:inline-block;margin-top:8px;padding:5px 14px;border-radius:999px;border:1px solid rgba(95,158,125,0.5);background:rgba(95,158,125,0.12);color:#17140f;font:600 11px/1 inherit;cursor:pointer;",r.addEventListener("click",()=>{const i=JSON.stringify({renderer:t,ua:navigator.userAgent,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,cores:navigator.hardwareConcurrency||0,mem:navigator.deviceMemory||0});try{navigator.clipboard.writeText(i),r.textContent="복사됨!"}catch{}}),o.appendChild(r),o.appendChild(n),document.body.appendChild(o)}let Ge=0;const xn="lu-onboard-v1";let Nt=-1,ie=null,Xo=null,La=0,yo=0;function Gs(){try{if(localStorage.getItem(xn))return}catch{}if(!(typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches))return;Nt=0;const t=Z.getState();Xo={x:t.x,z:t.z};const e=document.createElement("style");e.textContent="@keyframes lu-ob-pulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} 70%{transform:translate(-50%,-50%) scale(1.25);opacity:0.2;} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} }",document.head.appendChild(e),ie=document.createElement("div"),ie.style.cssText="position:fixed;left:24%;bottom:22%;width:110px;height:110px;border-radius:50%;border:3px solid rgba(255,253,247,0.85);pointer-events:none;z-index:60;transform:translate(-50%,-50%);animation:lu-ob-pulse 1.6s ease-in-out infinite;",document.body.appendChild(ie),nt("왼쪽 화면을 누른 채 밀면 걸어요 🚶")}function Xs(){if(Nt<0)return;const t=Z.getState();if(Nt===0)Math.hypot(t.x-Xo.x,t.z-Xo.z)>1.5&&(Nt=1,La=t.ry,ie&&(ie.remove(),ie=null),nt("잘했어요! 오른쪽 화면을 쓸면 주위를 둘러봐요 👀"));else if(Nt===1){let e=t.ry-La;e=Math.atan2(Math.sin(e),Math.cos(e)),Math.abs(e)>.6&&(Nt=2,yo=0,nt("작품에 다가가면 설명이 나타나요 — 어려우면 [투어] 버튼을 눌러요 🖼️"))}else if(Nt===2&&(yo+=1,yo>420)){Nt=-1;try{localStorage.setItem(xn,"1")}catch{}}}function za(){if(!G)return;const t=[];for(const[e,o]of G.remoteAvatars)e.startsWith("npc-")&&t.push(o);if(!Xt){for(const e of t)e.group.visible=!0;return}t.sort((e,o)=>e.group.position.distanceTo(U.position)-o.group.position.distanceTo(U.position)),t.forEach((e,o)=>{e.group.visible=o<_s})}const wn=new Sr;let vo=null;const yn=3,Hs=.7,Fs=-.2;let Tt=!1,J=null,Bt=null,Ht=null,Ze=0;const vn=new ja,Ta=new ja,kn=new or;function Sn(){if(et)if(Tt=!Tt,Tt){if(!J&&Bt)try{J=Fo(Bt.char,Bt.color," "),J.group.traverse(t=>{t.isSprite&&(t.visible=!1)}),bt.add(J.group)}catch(t){console.warn("내 아바타 생성 실패:",t),J=null,Tt=!1;return}if(!J){Tt=!1;return}J.group.visible=!0,no("self",!0),Ht=null,Ze=0,nt("내 모습 보기 — V키 또는 [시점] 버튼으로 복귀")}else J&&(J.group.visible=!1,no("self",!1))}function Ys(t){if(t){if(Bt=Bt?Object.assign({},Bt,{char:t}):{char:t},J){const e=J.group,o=e.visible,a=e.position.clone(),n=e.rotation.y;try{const r=Fo(t,Bt.color||"#3498db"," ");r.group.traverse(i=>{i.isSprite&&(i.visible=!1)}),r.group.position.copy(a),r.group.rotation.y=n,r.group.visible=o,bt.add(r.group),bt.remove(e),J.dispose(),J=r}catch(r){console.warn("내 아바타 갱신 실패:",r)}}G&&typeof G.setChar=="function"&&G.setChar(t),nt("아야모 모습을 바꿨어요 ✨")}}function En(){vn.copy(U.position),kn.copy(U.quaternion),Ta.set(0,0,1).applyQuaternion(U.quaternion),U.position.addScaledVector(Ta,yn),U.position.y+=Hs,U.rotateX(Fs)}function Cn(){U.position.copy(vn),U.quaternion.copy(kn)}const js=7,ge=new Qn,_a=new Dt;let ko=null;function Us(t){t.addEventListener("pointerdown",e=>{e.isPrimary&&(ko={x:e.clientX,y:e.clientY,t:performance.now()})}),t.addEventListener("pointerup",e=>{const o=ko;if(ko=null,!o||!e.isPrimary||!et||!G||performance.now()-o.t>450||Math.hypot(e.clientX-o.x,e.clientY-o.y)>7)return;const a=t.getBoundingClientRect();_a.set((e.clientX-a.left)/a.width*2-1,-((e.clientY-a.top)/a.height)*2+1),ge.setFromCamera(_a,U),ge.far=js+yn;const n=[...G.remoteAvatars.entries()];if(!n.length)return;const r=n.map(([,c])=>c.group),i=ge.intersectObjects(r,!0);if(i.length){let c=i[0].object;for(;c&&!r.includes(c);)c=c.parent;if(c){const[d]=n[r.indexOf(c)];G.sendHit(d);return}}ge.far=60;const l=ge.intersectObjects(pr(),!1);l.length&&l[0].object.userData.luArt&&_n(l[0].object.userData.luArt)})}let Mn=null,lo="게스트",et=!1,ft=null,ht=[],io="shared",xt=[],Na=!1,So=0,Xe=0,ot=null;const Ia=.8,$s=2.2;function Ln(t,e){const o=Z.getState(),a=typeof t.y=="number"?t.y:o.y,n=t.x-o.x,r=a-o.y,i=t.z-o.z,l=Math.hypot(n,r,i),c=yt.clamp(Ia+l*.035,Ia,$s);Z.disable(),ot={fromX:o.x,fromY:o.y,fromZ:o.z,fromRy:o.ry,toX:t.x,toY:a,toZ:t.z,toRy:t.ry,duration:c,elapsed:0,onDone:e||null}}const Aa=new Ga(0,0,0,"YXZ");function Ws(t){if(!ot)return;ot.elapsed+=t;const e=Math.min(1,ot.elapsed/ot.duration),o=Es(e),a=ot.fromX+(ot.toX-ot.fromX)*o,n=ot.fromY+(ot.toY-ot.fromY)*o,r=ot.fromZ+(ot.toZ-ot.fromZ)*o,i=Cs(ot.fromRy,ot.toRy,o);if(U.position.set(a,n,r),Aa.set(0,i,0,"YXZ"),U.quaternion.setFromEuler(Aa),e>=1){const l=ot.onDone;ot=null,l&&l()}}let pt=!1,te=0,ke=!0,le=!1,ce=0;const Vs=6;async function Ks(){Ca(!0),bt=new Fa,U=new Ya(55,window.innerWidth/window.innerHeight,.1,1e3),U.position.set(E.spawn.x,zt,E.spawn.z);const t=typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches,e=Oo();gt=Is(),console.info("[OpenArtShow] GPU:",gt.name||"(unknown)",gt.soft?"— SOFTWARE RENDERING":"");try{H=new Xa({antialias:!gt.soft,powerPreference:"high-performance"})}catch(d){throw Ds(""),d}Us(H.domElement);const o=document.createElement("div");o.id="lu-vignette",o.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse 72% 62% at 50% 46%, rgba(8,6,4,0) 50%, rgba(8,6,4,0.03) 62%, rgba(8,6,4,0.09) 72%, rgba(8,6,4,0.17) 82%, rgba(8,6,4,0.26) 91%, rgba(8,6,4,0.34) 100%);",document.body.appendChild(o);const a=window.devicePixelRatio||1;let n;e==="low"?n=Math.min(a,1.25):e==="high"?n=Math.min(Math.max(a,2),2.5):t?n=Math.min(a,2):n=Math.min(Math.max(a,1.5),2);const r=e==="high"?Ke.high:e==="low"?Ke.low:Ke.base;n=Math.min(n,Math.sqrt(r/(window.innerWidth*window.innerHeight))),gt.soft&&(n=Math.min(n,.7),document.documentElement.classList.add("lu-potato")),H.setPixelRatio(n),H.setSize(window.innerWidth,window.innerHeight),H.shadowMap.enabled=!gt.soft,H.shadowMap.type=tr,H.toneMapping=gt.soft?Ha:er,H.toneMappingExposure=.92,H.outputColorSpace=Ot,document.body.appendChild(H.domElement);const i=await nr(),l=Ms(i.theme);ni(bt,l,{fullLights:!gt.soft&&e!=="low"}),await rr(),await ir(bt),window.__museum={scene:bt,camera:U,renderer:H},gt.soft&&(bt.fog=null),H.shadowMap.autoUpdate=!1,H.shadowMap.needsUpdate=!0,Go=l==="cycle"?2:0,ft=i,ps(ft.name),Zs(),io=i.id??"shared",xt=sr(io),Ko(xt),ks({onSubmit:al}),ht=Je(),gs(ht,_n),ys({onPrev:In,onNext:Qo,onExit:Jo,onToggleAuto:tl}),xs({onSelfView:()=>{et&&!ro()&&Sn()},onTour:()=>{et&&Nn()},onViewArtwork:zn,onGuestbook:()=>{et&&!Et()&&Wo()},onCapture:()=>{et&&!ro()&&(bn(),Tn())}}),Z=new bi(U,H.domElement);const c=E.floors.find(d=>d.id===E.spawn.floor);Z.setPose({x:E.spawn.x,y:(c?c.y:0)+zt,z:E.spawn.z,ry:E.spawn.ry}),Do=yi({player:Z,getSelfAvatar:()=>J}),Z.disable(),setTimeout(()=>{const d=document.getElementById("lu-topright");d&&(d.style.cursor="pointer",d.title="클릭하면 성능 진단 정보가 복사됩니다",d.addEventListener("click",()=>{const f=JSON.stringify({gpu:gt.name,soft:gt.soft,pixelRatio:H?H.getPixelRatio():0,aa:H?H.getContext().getContextAttributes().antialias:null,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,inner:window.innerWidth+"x"+window.innerHeight,cores:navigator.hardwareConcurrency||0,spec:Oo(),calls:H?H.info.render.calls:0,ua:navigator.userAgent});try{navigator.clipboard.writeText(f),nt("진단 정보가 복사됐어요 — 붙여넣어 보내주세요")}catch{console.info("[OpenArtShow diag]",f)}}))},0),is({onEnter:el,onChatSend:rl,onAvatarChange:Ys,onMakerToggle:d=>{et&&(d?Z.disable():pt||Z.enable())}}),Ca(!1),hs(()=>{et&&!pt&&Z.enable()}),window.addEventListener("resize",sl),window.addEventListener("keydown",Js),Mn=new ar,H.setAnimationLoop(il)}function Zs(){fetch("./galleries/index.json").then(t=>{if(!t.ok)throw new Error(`HTTP ${t.status}`);return t.json()}).then(t=>{if(!Array.isArray(t))return;const e=ft?ft.id:null;fs(t,e,o=>{window.location.href="./index.html?g="+o})}).catch(()=>{})}let He=null;function qs(){if(!et)return;const t=U.position.y-zt;let e=null;for(const o of E.floors)t>=o.y-.9&&(e===null||o.y>e.y)&&(e=o);if(e){if(He===null){He=e.id;return}e.id!==He&&(He=e.id,nt(e.name))}}function zn(){if(!et||Et())return;const t=pt?ht[te]:$a(U.position);t&&(fn(t),Z.disable())}function Tn(){if(!(!H||!bt||!U))try{Tt&&J&&En(),H.render(bt,U),Tt&&J&&Cn();const t=H.domElement.toDataURL("image/png"),e=new Image;e.onload=()=>{const o=document.createElement("canvas");o.width=e.width,o.height=e.height;const a=o.getContext("2d");if(!a)return;a.drawImage(e,0,0);const n=a.createRadialGradient(o.width/2,o.height*.46,Math.min(o.width,o.height)*.4,o.width/2,o.height*.46,Math.max(o.width,o.height)*.72);n.addColorStop(0,"rgba(8,6,4,0)"),n.addColorStop(.24,"rgba(8,6,4,0.03)"),n.addColorStop(.44,"rgba(8,6,4,0.09)"),n.addColorStop(.64,"rgba(8,6,4,0.17)"),n.addColorStop(.82,"rgba(8,6,4,0.26)"),n.addColorStop(1,"rgba(8,6,4,0.34)"),a.fillStyle=n,a.fillRect(0,0,o.width,o.height),Rs(a,o.width,o.height,ft?ft.name:"");const r=o.toDataURL("image/png");try{const l=Math.round(o.height/o.width*360),c=document.createElement("canvas");c.width=360,c.height=l,c.getContext("2d").drawImage(o,0,0,360,l);const d=c.toDataURL("image/jpeg",.72),f=wn.addLocal(lo,ft?ft.name:"",d);f&&G&&G.sendPhoto(f)}catch(i){console.warn("포토월 썸네일 생성 실패 (캡처 자체는 정상):",i)}ws({blob:As(r),dataUrl:r,galleryName:ft&&ft.name||"OpenArtShow 전시",shareUrl:Bs()})},e.onerror=()=>{nt("사진 촬영에 실패했습니다.")},e.src=t}catch(t){console.error("사진 촬영 실패:",t),nt("사진 촬영에 실패했습니다.")}}function Js(t){if(t.code==="KeyE"){zn();return}if(t.code==="KeyM"){if(!et||Et())return;hn();return}if(t.code==="KeyT"){if(!et)return;Nn();return}if(t.code==="KeyG"){if(!et||Et())return;Wo();return}if(t.code==="KeyP"){if(!et||ro())return;bn(),Tn();return}if(t.code==="KeyV"){if(!et||ro())return;Sn();return}if(pt&&(t.code==="ArrowLeft"||t.code==="ArrowRight")){if(Et())return;t.preventDefault(),t.code==="ArrowLeft"?In():Qo();return}t.code==="Escape"&&pt&&!Et()&&!gn()&&!Ss()&&Jo()}function _n(t){if(!t||!et)return;const e=Ka(t),o=pt;if(o){const a=ht.indexOf(t);a!==-1&&(te=a),le=!1}Ln(e,()=>{Z.setPose(e),o?(Zo(t),le=!0,ce=0):et&&!Et()&&Z.enable()})}function Zo(t){bs({index:te,total:ht.length,title:t&&t.title||"",autoOn:ke})}function qo(t){const e=ht[t];if(!e)return;te=t,le=!1,ce=0,Zo(e);const o=Ka(e);Ln(o,()=>{Z.setPose(o),le=!0,ce=0})}function Qs(){!et||Et()||pt||!ht||ht.length===0||(gn()&&Ee(),pt=!0,no("tour",!0),ke=!0,Z.disable(),qo(0))}function Jo(){if(!pt)return;pt=!1,no("tour",!1),le=!1,ot=null,ms();const t=Z.getState();Z.setPose({x:t.x,z:t.z,ry:t.ry}),et&&!Et()&&Z.enable()}function Nn(){pt?Jo():Qs()}function Qo(){!pt||ht.length===0||qo((te+1)%ht.length)}function In(){!pt||ht.length===0||qo((te-1+ht.length)%ht.length)}function tl(){pt&&(ke=!ke,ce=0,Zo(ht[te]))}function el({nickname:t,color:e,char:o}){lo=t,Bt={nickname:t,color:e,char:o},et=!0,ss(),Z.enable(),si(),Gs();try{const a=ft&&ft.id||"link-"+Ls(window.location.hash||"");G=new lr(bt,{nickname:t,color:e,char:o,roomId:`${cr}-${a}`}),fe=new Ei(a),G.onVisitor=(n,r)=>{fe.addVisit(n),Os.add(r&&r.nickname,ft?ft.name:"")},G.onPhoto=n=>{wn.addRemote(n),nt(`${n.name||"누군가"}님이 관람 사진을 남겼어요 📸`)},vo&&clearInterval(vo),vo=setInterval(()=>{if(!G||!fe)return;const n=[];for(const[r,i]of G.remoteAvatars)r.startsWith("npc-")||n.push({x:i.group.position.x,z:i.group.position.z});fe.addDwell(n,Je(),2),vs(fe.summary(xt.length))},2e3),G.onChat=(n,r)=>cn(n,r,!1),G.onPlayerCount=n=>ds(n),G.onStatus=ol,G.onGuestbook=nl,G.onSelfHit=n=>{nt(n>=3?"아야!! 너무해요 😭":"아야! 누가 때렸어요 😣"),J?J.hit(n):dr(n)},G.onNpcHit=(n,r,i)=>{ae&&ae.onHit(n,r,i)},G.npcProvider=(n,r)=>{ae||(ae=new ur(Je()));const i=ae.update(n,r),l=ae.takeChat();return l&&G.sendNpcChat(l.name,l.text),i},G.connect()}catch(a){console.error("멀티플레이어 초기화 실패:",a),G=null,nt("멀티플레이어 연결에 실패했습니다. 혼자 관람 모드로 진행합니다.")}}function ol(t){if(nt(t),!(Na||!G)&&(t==="호스트로 개설됨"||t.startsWith("접속됨"))){Na=!0;try{G.sendGuestbook(xt)}catch(e){console.error("방명록 동기화 전송 실패:",e)}}}function al(t){if(!t)return;const e=fr(lo,t);if(xt=Wa(xt,[e]),Va(io,xt),Ko(xt),G)try{G.sendGuestbook([e])}catch(o){console.error("방명록 전송 실패:",o)}}function nl(t){xt=Wa(xt,t),Va(io,xt),Ko(xt)}function rl(t){if(t&&(cn(lo,t,!0),G))try{G.sendChat(t)}catch(e){console.error("채팅 전송 실패:",e),nt("채팅 전송에 실패했습니다.")}}let Fe=0;function il(){let t=Mn.getDelta();if(gt.soft){if(Fe+=t,Fe<.034)return;t=Fe,Fe=0}try{if(Do&&Do.update(t),Z.update(t),G&&Z.resolveBodyCollisions(G.getAvatarPositions()),Ws(t),pt&&le&&ke&&!ot&&!Et()&&(ce+=t,ce>=Vs&&Qo()),ai(t),qs(),G&&(G.sendState(Z.getState()),G.update(t)),Xs(),Tt&&J){const o=Z.getState();J.group.position.set(o.x,o.y-zt,o.z),J.group.rotation.y=o.ry,Ht||(Ht={x:o.x,z:o.z});const a=t>0?Math.hypot(o.x-Ht.x,o.z-Ht.z)/t:0;Ze+=(a-Ze)*Math.min(1,10*t),Ht.x=o.x,Ht.z=o.z,J.update(t,Ze)}const e=$a(U.position);if(e?ls(e):cs(),So+=1,Xe+=t,Xe>=.5){const o=So/Xe;if(us(Math.round(o)),So=0,Xe=0,he=Math.max(0,he-.5),he===0&&et){if(!Xt&&o<zs){Xt=!0,he=10,o<16&&mo("low");const a=window.devicePixelRatio||1;H.setPixelRatio(Math.min(H.getPixelRatio(),Math.max(1,a*.75))),nt("원활한 관람을 위해 화질을 잠시 낮췄어요")}else Xt&&o>Ts&&(Xt=!1,he=10,za());if(!Xt&&o>55){if(Ge+=1,Ge>=20){const a=Oo();a==="low"?mo(null):a===null&&mo("high");const n=Math.min(2.5,Math.sqrt(Ke.high/(window.innerWidth*window.innerHeight))),r=H.getPixelRatio();!gt.soft&&r<n&&(H.setPixelRatio(Math.min(n,r+.25)),nt("화질을 한 단계 높였어요 ✨")),Ge=0}}else Ge=0}}xo+=t,xo>=2&&(xo=0,Xt&&za()),Go>0&&(wo+=t,wo>=Go&&(wo=0,H.shadowMap.needsUpdate=!0)),!Ma&&et&&(Ma=!0,H.shadowMap.needsUpdate=!0),Tt&&J?(En(),H.render(bt,U),Cn()):H.render(bt,U)}catch(e){console.error("렌더 루프 오류:",e),H.setAnimationLoop(null),nt("오류가 발생했습니다. 페이지를 새로고침해 주세요.")}}function sl(){U.aspect=window.innerWidth/window.innerHeight,U.updateProjectionMatrix(),H.setSize(window.innerWidth,window.innerHeight)}window.addEventListener("beforeunload",()=>{if(G)try{G.dispose()}catch{}});Ks().catch(t=>{console.error("초기화 실패:",t);try{nt("초기화 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.")}catch{document.body.insertAdjacentHTML("beforeend",`<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-family:${xe()};font-size:16px;text-align:center;">초기화 중 오류가 발생했습니다.<br>페이지를 새로고침해 주세요.</div>`)}});const An=0,Rn=7.5,ll=0,Ye=3.3,Gt=3.5,Ct=.18,je=.2,cl=7530209,dl=3.6,ul=1.15,pl="ontouchstart"in window||(navigator.maxTouchPoints||0)>0;function fl(){const t=document.createElement("canvas");t.width=t.height=512;const e=t.getContext("2d");let o=20935;const a=()=>{o|=0,o=o+1831565813|0;let c=Math.imul(o^o>>>15,1|o);return c=c+Math.imul(c^c>>>7,61|c)^c,((c^c>>>14)>>>0)/4294967296},n=e.createLinearGradient(0,0,0,512);n.addColorStop(0,"#070a16"),n.addColorStop(.55,"#111a34"),n.addColorStop(1,"#1b2748"),e.fillStyle=n,e.fillRect(0,0,512,512);for(let c=0;c<140;c++){const d=a()*512,f=a()*310,g=a()<.08;e.fillStyle=`rgba(235,240,255,${(.28+a()*.6).toFixed(2)})`,e.fillRect(d,f,g?2:1,g?2:1)}const r=e.createRadialGradient(398,88,0,398,88,36);r.addColorStop(0,"rgba(236,239,232,0.9)"),r.addColorStop(.5,"rgba(226,232,224,0.42)"),r.addColorStop(1,"rgba(226,232,224,0)"),e.fillStyle=r,e.beginPath(),e.arc(398,88,36,0,7),e.fill(),e.fillStyle="rgba(240,243,236,0.95)",e.beginPath(),e.arc(398,88,15,0,7),e.fill();let i=0;for(;i<512;){const c=26+a()*48,d=130+a()*250,f=512-d;e.fillStyle=`rgb(${10+(a()*8|0)},${16+(a()*10|0)},${34+(a()*14|0)})`,e.fillRect(i,f,c,d);for(let g=f+12;g<506;g+=15)for(let u=i+6;u<i+c-6;u+=12)a()<.52||(e.fillStyle=a()<.72?"rgba(120,220,225,0.85)":"rgba(255,207,138,0.85)",e.fillRect(u,g,4,6));i+=c+2+a()*8}const l=new ye(t);return l.colorSpace=Ot,l}function hl(){const t=document.createElement("canvas");t.width=512,t.height=160;const e=t.getContext("2d");e.clearRect(0,0,512,160),e.font='700 92px "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif',e.textAlign="center",e.textBaseline="middle",e.shadowColor="rgba(114,230,225,0.95)",e.shadowBlur=30,e.fillStyle="rgba(175,244,240,0.96)",e.fillText("오픈월드",256,86),e.shadowBlur=0,e.fillStyle="rgba(224,252,250,0.92)",e.fillText("오픈월드",256,86);const o=new ye(t);return o.colorSpace=Ot,o}function gl(){const t=new Qt,e=[new K(Ye,Ct,je).translate(0,Ct/2,0),new K(Ye,Ct,je).translate(0,Gt-Ct/2,0),new K(Ct,Gt,je).translate(-3.1199999999999997/2,Gt/2,0),new K(Ct,Gt,je).translate((Ye-Ct)/2,Gt/2,0)],o=$e(e);e.forEach(i=>i.dispose());const a=new dt({color:736570,emissive:cl,emissiveIntensity:1.5,roughness:.4,metalness:.1});t.add(new R(o,a));const n=new R(new at(Ye-2*Ct,Gt-2*Ct),new Wt({map:fl(),toneMapped:!1}));n.position.set(0,Gt/2,.11),n.rotation.y=Math.PI,t.add(n);const r=new R(new at(2.4,.75),new Wt({map:hl(),transparent:!0,toneMapped:!1,depthWrite:!1,side:Se}));return r.rotation.x=Math.PI/2,r.scale.x=-1,r.position.set(0,.02,-1),t.add(r),t.position.set(An,ll,Rn),t.userData={frameMat:a,label:r},t}let Yt=null,Ue=null,St=null,me=!1,Ho=!1,Pn=0,Bn=0;function bl(){St||(St=document.createElement("div"),St.id="portal-hint",St.textContent=pl?"탭하여 오픈월드로 이동 →":"클릭하거나 다가가면 오픈월드로 이동 →",St.style.cssText='position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:40;padding:9px 16px;border-radius:999px;background:rgba(11,30,29,0.82);color:#c9fbf8;font:600 13px/1 "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;letter-spacing:-.01em;border:1px solid rgba(114,230,225,0.5);box-shadow:0 6px 20px -6px rgba(0,0,0,0.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap',document.body.appendChild(St))}function On(){Ho||(Ho=!0,St&&(St.style.opacity="0"),location.href="world.html")}function Dn(){if(requestAnimationFrame(Dn),!Yt){if(Yt=window.__museum||null,!Yt)return;Ue=gl(),Yt.scene.add(Ue),bl()}const t=performance.now()/1e3,e=1.3+Math.sin(t*2.2)*.35;Ue.userData.frameMat.emissiveIntensity=e,Ue.userData.label.material.opacity=.78+Math.sin(t*2.2)*.2;const o=Yt.camera,a=Math.hypot(o.position.x-An,o.position.z-Rn),n=me;me=a<dl,me!==n&&St&&(St.style.opacity=me?"1":"0"),a<ul&&On()}requestAnimationFrame(Dn);addEventListener("pointerdown",t=>{Pn=t.clientX,Bn=t.clientY},!0);addEventListener("pointerup",t=>{!me||Ho||!Yt||t.target===Yt.renderer.domElement&&(Math.hypot(t.clientX-Pn,t.clientY-Bn)>8||On())},!0);
