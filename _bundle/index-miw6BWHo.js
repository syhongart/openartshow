/* empty css              */import{e as Ft,M as D,d as tt,i as V,k as ct,G as Vt,T as Na,l as mo,m as ee,n as In,h as Rt,o as Aa,p as Rn,q as be,r as Ia,s as ye,F as oo,t as ve,L as Ra,u as Ue,B as jo,v as Pa,O as Oa,H as Pn,D as Jt,w as Ba,S as It,x as he,f as On,y as Bn,E as Dn,z as mt,W as Gn,I as Da,N as Hn,a as Xn,b as Fn,J as Ga,V as $o,Q as Ha,R as Xa,P as Fa,A as Ya,C as Ua}from"./vendor-three-enYtijzV.js";import{B as N,b as xo,a as Yn,E as Et,R as ke,c as Un,A as wo,g as je,d as de,e as ja,f as $a,h as Wa,l as Va,i as jn,M as Ka,P as Za,p as qa,N as Ja,m as $n,s as Wn,j as Qa,k as Vn,n as tr}from"./npc-DwjC32ux.js";import{g as er,c as Kn,a as or,b as yo,m as Ge,d as Wo,e as nr,f as ar,T as Bt,h as $e,i as rr,j as ir,r as sr,k as Zn,l as qn,C as lr}from"./scene-textures-DhUb9KjO.js";import{V as cr,P as dr}from"./feed-Cm56rHm1.js";import{n as no,D as He,C as ur,a as pr,S as Vo,c as Ko,e as vo,d as fr,f as hr,g as gr,h as br,i as mr,j as xr,E as wr,k as yr,H as Zo,l as vr,m as kr,o as Sr,p as ao,q as Cr,r as Er}from"./chibi-builder-0e8j20Jr.js";import{g as Nt,o as Jn,P as Se,l as Mr,M as Tr,a as Lr}from"./auth-aZ7HCW1S.js";function qo(t,e){let n=[t];for(const o of e){const a=[];for(const r of n){if(o.x1<=r.x0||o.x0>=r.x1||o.z1<=r.z0||o.z0>=r.z1){a.push(r);continue}const i=Math.max(r.x0,o.x0),l=Math.min(r.x1,o.x1),c=Math.max(r.z0,o.z0),d=Math.min(r.z1,o.z1);r.z0<c&&a.push({x0:r.x0,x1:r.x1,z0:r.z0,z1:c}),d<r.z1&&a.push({x0:r.x0,x1:r.x1,z0:d,z1:r.z1}),r.x0<i&&a.push({x0:r.x0,x1:i,z0:c,z1:d}),l<r.x1&&a.push({x0:l,x1:r.x1,z0:c,z1:d})}n=a}return n.filter(o=>o.x1-o.x0>.01&&o.z1-o.z0>.01)}function bt(t){return N.floors.find(e=>e.id===t)}function zr(t,e){const n=Kn(),o=16/50,a=t.x1-t.x0,r=t.z1-t.z0,i=n.map.clone(),l=n.normalMap.clone();for(const c of[i,l])c.needsUpdate=!0,c.repeat.set(o*a,o*r),c.offset.set((t.x0-N.minX)*o%1,(t.z0-N.minZ)*o%1);return new ct({map:i,normalMap:l,normalScale:new Rt(.7,.7),color:e,roughness:.4,metalness:0})}function zt(t,e,n){const o=or(),a=o.map.clone(),r=o.normalMap.clone();for(const i of[a,r])i.needsUpdate=!0,i.repeat.set(t,e);return new ct({map:a,normalMap:r,normalScale:new Rt(.55,.55),color:n||16777215,roughness:.9,metalness:0})}function Qn(){return new ct({map:yo().map,normalMap:yo().normalMap,normalScale:new Rt(.35,.35),color:16777215,roughness:.92,metalness:0})}const ge=()=>new ct({color:2499615,roughness:.4,metalness:.75});function wt(t,e,n,o,a,r){const i=ge(),l=new Rn({color:14214376,transparent:!0,opacity:.22,roughness:.08,side:be,depthWrite:!1}),c=Math.hypot(o-e,a-n),d=Math.atan2(o-e,a-n),m=(e+o)/2,b=(n+a)/2,h=new Vt,x=new D(new ee(.03,.03,c,10),i);x.rotation.x=Math.PI/2,x.position.y=1.05,h.add(x);const u=Math.max(2,Math.round(c/1.2)+1);for(let v=0;v<u;v++){const g=u===1?.5:v/(u-1),p=new D(new V(.045,1.05,.045),i);p.position.set(0,.525,-c/2+g*c),h.add(p)}const f=new D(new tt(c,.85),l);f.rotation.y=Math.PI/2,f.position.y=.55,h.add(f),h.rotation.y=d,h.position.set(m,r,b),h.traverse(v=>{v.isMesh&&(v.castShadow=!0)}),t.add(h)}function _r(t,e){const n=zt(1.2,2.4),o=e.yTo-e.yFrom,a=e.z1-e.z0,r=24,i=o/r,l=a/r,c=e.x1-e.x0,d=(e.x0+e.x1)/2;for(let x=0;x<r;x++){const u=e.yFrom+(x+1)*i,f=u-e.yFrom+.25,v=new D(new V(c,f,l),n);v.position.set(d,u-f/2,e.z0+(x+.5)*l),v.castShadow=!0,v.receiveShadow=!0,t.add(v)}const m=ge(),b=Math.hypot(a,o),h=Math.atan2(o,a);for(const x of[e.x0+.06,e.x1-.06]){const u=new D(new ee(.03,.03,b,10),m);u.rotation.x=Math.PI/2-h,u.position.set(x,(e.yFrom+e.yTo)/2+.95,(e.z0+e.z1)/2),u.castShadow=!0,t.add(u);for(const f of[.08,.5,.92]){const v=e.yFrom+o*f,g=new D(new V(.045,.95,.045),m);g.position.set(x,v+.475,e.z0+a*f),g.castShadow=!0,t.add(g)}}}function Nr(t,e,n,o,a,r,i){const l=e+N.clearH,c=.32,d=.14,m=1.1,b=zt(2,.4,13617599),h=new ct({color:3486253,normalMap:yo().normalMap,normalScale:new Rt(.25,.25),roughness:.95}),x=new ct({color:1710102,roughness:.5,metalness:.6}),u=new ct({color:16774880,emissive:a.downlight.emissive,emissiveIntensity:2.5*(a.downlight.intensity/22),roughness:1}),f=[],v=[],g=[];for(const p of n){const P=p.x1-p.x0,z=p.z1-p.z0,G=new D(new tt(P,z),h);G.rotation.x=Math.PI/2,G.position.set((p.x0+p.x1)/2,l+c,(p.z0+p.z1)/2),t.add(G);const I=Math.ceil((p.z0-N.minZ)/m);for(let S=I;;S++){const k=N.minZ+S*m;if(k>p.z1-.05)break;if(k<p.z0+.05)continue;const C=new V(P,c,d);C.translate((p.x0+p.x1)/2,l+c/2,k),f.push(C)}const X=Math.ceil((p.x0-N.minX)/m);for(let S=X;;S++){const k=N.minX+S*m;if(k>p.x1-.05)break;if(k<p.x0+.05)continue;const C=new V(d,c,z);C.translate(k,l+c/2,(p.z0+p.z1)/2),f.push(C)}for(let S=X;;S++){const k=N.minX+S*m+m/2;if(k>p.x1-.2)break;if(!(k<p.x0+.2))for(let C=I;;C++){const A=N.minZ+C*m+m/2;if(A>p.z1-.2)break;if(A<p.z0+.2||(S*7+C*5)%3!==0)continue;const M=new ee(.07,.08,.1,12);M.translate(k,l+c-.06,A),v.push(M);const B=new ee(.055,.055,.02,12);B.translate(k,l+c-.12,A),g.push(B)}}}if(f.length){const p=new D(Ge(f),b);p.castShadow=!0,t.add(p)}if(v.length&&t.add(new D(Ge(v),x)),g.length&&t.add(new D(Ge(g),u)),i)for(const[p,P]of r){const z=new Aa(a.downlight.color,a.downlight.intensity*.7,9,2);z.position.set(p,l-.15,P),t.add(z),o.push(z)}return u}function Ar(t){const e=new Rn({color:14478578,transparent:!0,opacity:.1,roughness:.05,side:be,depthWrite:!1}),n=ge(),o=N.maxZ,a=N.maxX-N.minX,r=bt("f1"),i=bt("f2"),l=N.clearH;for(const[f,v]of[[N.minX,-1.5],[1.5,N.maxX]]){const g=v-f,p=new D(new tt(g,l),e);p.position.set((f+v)/2,r.y+l/2,o),p.rotation.y=Math.PI,t.add(p)}for(let f=N.minX;f<=N.maxX+.01;f+=2.2){if(f>-1.5&&f<1.5)continue;const v=new D(new V(.12,l,.12),n);v.position.set(f,r.y+l/2,o),v.castShadow=!0,t.add(v)}for(const f of[-1.5,1.5]){const v=new D(new V(.18,l,.18),n);v.position.set(f,r.y+l/2,o),v.castShadow=!0,t.add(v)}const c=new D(new V(a,.14,.16),n);c.position.set(0,r.y+l-.07,o),t.add(c);const d=Qn(),m=new D(new V(a,1.2,N.wallT),d);m.position.set(0,i.y+.6,o),m.castShadow=!0,m.receiveShadow=!0,t.add(m);const b=new D(new V(a,N.clearH-2.6+.6,N.wallT),d);b.position.set(0,i.y+2.6+(N.clearH-2.6+.6)/2,o),b.castShadow=!0,b.receiveShadow=!0,t.add(b);const h=new D(new tt(a,1.4),e);h.position.set(0,i.y+1.9,o),h.rotation.y=Math.PI,t.add(h);for(let f=N.minX;f<=N.maxX+.01;f+=2.2){const v=new D(new V(.08,1.4,.08),n);v.position.set(f,i.y+1.9,o),t.add(v)}const x=bt("b1"),u=new D(new V(a+.6,N.storyH,N.wallT),zt(4,1));u.position.set(0,x.y+N.storyH/2,o),t.add(u)}function Ir(t,e,n){const o=N,a=o.maxX-o.minX,r=o.maxZ-o.minZ,i={x0:o.minX,x1:o.maxX,z0:o.minZ,z1:o.maxZ},l=[];let c=null;const d=["b1","f1","f2"];for(const y of o.floors){const L=o.slabHoles[y.id]||[],Y=qo(i,L);for(const j of Y){const Z=j.x1-j.x0,W=j.z1-j.z0,K=new D(new V(Z,o.slabT,W),zt(Z/6,W/6));K.position.set((j.x0+j.x1)/2,y.y-o.slabT/2,(j.z0+j.z1)/2),K.castShadow=!0,K.receiveShadow=!0,t.add(K);const q=new D(new tt(Z,W),zr(j,y.id==="b1"?10127472:y.id==="roof"?13482132:16777215));q.rotation.x=-Math.PI/2,q.position.set((j.x0+j.x1)/2,y.y+.002,(j.z0+j.z1)/2),q.receiveShadow=!0,t.add(q)}}const m={b1:[[-6,-3],[0,-3],[6,-3],[0,3]],f1:[[-7,-4],[0,-4],[7,-4],[-7,4],[0,4],[7,4]],f2:[[-7,-4.5],[0,-4.5],[7,-4.5],[-7,5],[7,5]]},b={b1:"f1",f1:"f2",f2:"roof"};for(const y of d){const L=bt(y),Y=o.slabHoles[b[y]]||[],j=qo(i,Y),Z=Nr(t,L.y,j,l,e,m[y],n);c||(c=Z)}const h=zt(3,2),x=bt("roof").y-bt("b1").y,u=bt("b1").y+x/2,f=new D(new V(a+o.wallT*2,x,o.wallT),h);f.position.set(0,u,o.minZ-o.wallT/2),f.castShadow=!0,f.receiveShadow=!0,t.add(f);for(const[y,L]of[[o.minX-o.wallT/2,1],[o.maxX+o.wallT/2,1]]){const Y=new D(new V(o.wallT,x,r),h);Y.position.set(y,u,0),Y.castShadow=!0,Y.receiveShadow=!0,t.add(Y)}for(const y of d){const L=bt(y),Y=Qn(),j=[{w:a,h:N.clearH,x:0,z:o.minZ+.02,ry:0},{w:r,h:N.clearH,x:o.maxX-.02,z:0,ry:-Math.PI/2},{w:r,h:N.clearH,x:o.minX+.02,z:0,ry:Math.PI/2}];for(const Z of j){const W=new D(new tt(Z.w,Z.h),Y);W.position.set(Z.x,L.y+N.clearH/2,Z.z),W.rotation.y=Z.ry,W.receiveShadow=!0,t.add(W)}}Ar(t);for(const y of o.stairs)_r(t,y);const v=bt("f1").y,g=bt("f2").y,p=bt("roof").y;wt(t,-8.7,-7,-8.7,-1,v),wt(t,-10.7,-7,-8.7,-7,v),wt(t,-8.7,1,-8.7,7,g),wt(t,-10.7,1,-8.7,1,g),wt(t,-4,-3,5,-3,g),wt(t,-4,3,5,3,g),wt(t,-4,-3,-4,3,g),wt(t,5,-3,5,3,g),wt(t,8.7,1,8.7,7,p),wt(t,8.7,1,10.7,1,p);const P=zt(4,.5),z=1.1,G=.25,I=[{w:a+.6,d:G,x:0,z:o.minZ-G/2},{w:a+.6,d:G,x:0,z:o.maxZ+G/2},{w:G,d:r,x:o.minX-G/2,z:0},{w:G,d:r,x:o.maxX+G/2,z:0}];for(const y of I){const L=new D(new V(y.w,z,y.d),P);L.position.set(y.x,p+z/2,y.z),L.castShadow=!0,L.receiveShadow=!0,t.add(L)}const X=new ct({map:Kn().map,color:12163695,roughness:.6});for(const[y,L]of[[-4,4],[2,-4]]){const Y=new D(new V(2.2,.09,.55),X);Y.position.set(y,p+.45,L),Y.castShadow=!0,t.add(Y);for(const j of[-.9,.9]){const Z=new D(new V(.08,.42,.5),ge());Z.position.set(y+j,p+.21,L),t.add(Z)}}const S=new ct({color:5194806,roughness:.45,metalness:.65}),k=new Vt,C=new D(new Na(1.3,.42,14,28,Math.PI),S);C.castShadow=!0,k.add(C);const A=new D(new mo(.55,18,14),S);A.scale.set(1.5,.75,1),A.position.set(1.1,-.95,.2),A.castShadow=!0,k.add(A),k.position.set(-2,p+1.35,.5),k.rotation.y=-.6,t.add(k);const M=new D(new ee(1.9,1.9,.12,24),zt(1,1,14209994));M.position.set(-2,p+.06,.5),M.receiveShadow=!0,t.add(M);const B=new D(new V(2.8,.18,7.2),zt(1,2));B.position.set(9.7,p+2.6,4),B.castShadow=!0,t.add(B);for(const[y,L]of[[8.85,.8],[10.55,.8],[8.85,7.2],[10.55,7.2]]){const Y=new D(new V(.12,2.6,.12),ge());Y.position.set(y,p+1.3,L),t.add(Y)}let E=null;return n||(E=new In(e.downlight.color,e.downlight.intensity*.022),t.add(E)),{downlights:{lights:l,warm:E,bulbMat:c}}}function Rr(t){const{minX:e,maxX:n,minZ:o,maxZ:a,wallT:r}=N,i=.55,l=e+r/2,c=n-r/2,d=o+r/2,m=a-r/2,b=new Ft({map:er(),transparent:!0,depthWrite:!1});for(const h of N.floors){if(h.id==="roof")continue;const x=h.y+.018,u=[[c-l,(l+c)/2,d+i/2,Math.PI],[c-l,(l+c)/2,m-i/2,0],[m-d,l+i/2,(d+m)/2,-Math.PI/2],[m-d,c-i/2,(d+m)/2,Math.PI/2]];for(const[f,v,g,p]of u){const P=new D(new tt(f,i),b);P.rotation.x=-Math.PI/2,P.rotation.z=p,P.position.set(v,x,g),P.renderOrder=1,t.add(P)}}}class Pr extends Ia{constructor(e){super(e),this.type=ye}parse(e){const i=function(S,k){switch(S){case 1:throw new Error("THREE.RGBELoader: Read Error: "+(k||""));case 2:throw new Error("THREE.RGBELoader: Write Error: "+(k||""));case 3:throw new Error("THREE.RGBELoader: Bad File Format: "+(k||""));default:case 4:throw new Error("THREE.RGBELoader: Memory Error: "+(k||""))}},m=`
`,b=function(S,k,C){k=k||1024;let M=S.pos,B=-1,E=0,y="",L=String.fromCharCode.apply(null,new Uint16Array(S.subarray(M,M+128)));for(;0>(B=L.indexOf(m))&&E<k&&M<S.byteLength;)y+=L,E+=L.length,M+=128,L+=String.fromCharCode.apply(null,new Uint16Array(S.subarray(M,M+128)));return-1<B?(S.pos+=E+B+1,y+L.slice(0,B)):!1},h=function(S){const k=/^#\?(\S+)/,C=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,A=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,M=/^\s*FORMAT=(\S+)\s*$/,B=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,E={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0};let y,L;for((S.pos>=S.byteLength||!(y=b(S)))&&i(1,"no header found"),(L=y.match(k))||i(3,"bad initial token"),E.valid|=1,E.programtype=L[1],E.string+=y+`
`;y=b(S),y!==!1;){if(E.string+=y+`
`,y.charAt(0)==="#"){E.comments+=y+`
`;continue}if((L=y.match(C))&&(E.gamma=parseFloat(L[1])),(L=y.match(A))&&(E.exposure=parseFloat(L[1])),(L=y.match(M))&&(E.valid|=2,E.format=L[1]),(L=y.match(B))&&(E.valid|=4,E.height=parseInt(L[1],10),E.width=parseInt(L[2],10)),E.valid&2&&E.valid&4)break}return E.valid&2||i(3,"missing format specifier"),E.valid&4||i(3,"missing image size specifier"),E},x=function(S,k,C){const A=k;if(A<8||A>32767||S[0]!==2||S[1]!==2||S[2]&128)return new Uint8Array(S);A!==(S[2]<<8|S[3])&&i(3,"wrong scanline width");const M=new Uint8Array(4*k*C);M.length||i(4,"unable to allocate buffer space");let B=0,E=0;const y=4*A,L=new Uint8Array(4),Y=new Uint8Array(y);let j=C;for(;j>0&&E<S.byteLength;){E+4>S.byteLength&&i(1),L[0]=S[E++],L[1]=S[E++],L[2]=S[E++],L[3]=S[E++],(L[0]!=2||L[1]!=2||(L[2]<<8|L[3])!=A)&&i(3,"bad rgbe scanline format");let Z=0,W;for(;Z<y&&E<S.byteLength;){W=S[E++];const q=W>128;if(q&&(W-=128),(W===0||Z+W>y)&&i(3,"bad scanline data"),q){const nt=S[E++];for(let xe=0;xe<W;xe++)Y[Z++]=nt}else Y.set(S.subarray(E,E+W),Z),Z+=W,E+=W}const K=A;for(let q=0;q<K;q++){let nt=0;M[B]=Y[q+nt],nt+=A,M[B+1]=Y[q+nt],nt+=A,M[B+2]=Y[q+nt],nt+=A,M[B+3]=Y[q+nt],B+=4}j--}return M},u=function(S,k,C,A){const M=S[k+3],B=Math.pow(2,M-128)/255;C[A+0]=S[k+0]*B,C[A+1]=S[k+1]*B,C[A+2]=S[k+2]*B,C[A+3]=1},f=function(S,k,C,A){const M=S[k+3],B=Math.pow(2,M-128)/255;C[A+0]=ve.toHalfFloat(Math.min(S[k+0]*B,65504)),C[A+1]=ve.toHalfFloat(Math.min(S[k+1]*B,65504)),C[A+2]=ve.toHalfFloat(Math.min(S[k+2]*B,65504)),C[A+3]=ve.toHalfFloat(1)},v=new Uint8Array(e);v.pos=0;const g=h(v),p=g.width,P=g.height,z=x(v.subarray(v.pos),p,P);let G,I,X;switch(this.type){case oo:X=z.length/4;const S=new Float32Array(X*4);for(let C=0;C<X;C++)u(z,C*4,S,C*4);G=S,I=oo;break;case ye:X=z.length/4;const k=new Uint16Array(X*4);for(let C=0;C<X;C++)f(z,C*4,k,C*4);G=k,I=ye;break;default:throw new Error("THREE.RGBELoader: Unsupported type: "+this.type)}return{width:p,height:P,data:G,header:g.string,gamma:g.gamma,exposure:g.exposure,type:I}}setDataType(e){return this.type=e,this}load(e,n,o,a){function r(i,l){switch(i.type){case oo:case ye:i.colorSpace=Ra,i.minFilter=Ue,i.magFilter=Ue,i.generateMipmaps=!1,i.flipY=!0;break}n&&n(i,l)}return super.load(e,r,o,a)}}const Oo=[];function Jo(t){const n=document.createElement("canvas");n.width=1024,n.height=1024;const o=n.getContext("2d"),a=o.createLinearGradient(0,0,0,1024);for(const[d,m]of t.stops)a.addColorStop(d,m);if(o.fillStyle=a,o.fillRect(0,0,1024,1024),t.stars>0){const d=$e(90210);for(let m=0;m<t.stars;m++){const b=d()*1024,h=d()*1024*.82,x=.4+d()*1.6,u=.35+d()*.65;if(d()>.965){const f=o.createRadialGradient(b,h,0,b,h,x*5);f.addColorStop(0,`rgba(255, 255, 255, ${u*.5})`),f.addColorStop(1,"rgba(255,255,255,0)"),o.fillStyle=f,o.beginPath(),o.arc(b,h,x*5,0,Math.PI*2),o.fill()}o.fillStyle=`rgba(255, 255, 255, ${u})`,o.beginPath(),o.arc(b,h,x,0,Math.PI*2),o.fill()}}const r=$e(13579),[i,l]=t.cloudAlpha;for(let d=0;d<t.cloudCount;d++){const m=r()*1024,b=1024*(.3+r()*.45),h=30+r()*90;for(let x=0;x<7;x++){const u=m+(r()-.5)*h*2.4,f=b+(r()-.5)*h*.7,v=h*(.35+r()*.5),g=o.createRadialGradient(u,f,0,u,f,v);g.addColorStop(0,`rgba(${t.cloudColor}, ${i+r()*(l-i)})`),g.addColorStop(1,`rgba(${t.cloudColor}, 0)`),o.fillStyle=g,o.beginPath(),o.arc(u,f,v,0,Math.PI*2),o.fill()}}const c=new he(n);return c.colorSpace=It,c}const Or={daylight:"./assets/sky/day.hdr",sunset:"./assets/sky/sunset.hdr",night:"./assets/sky/night.jpg"};function Ce(t,e){const n=Or[e],o=r=>{r.minFilter=Ue,r.magFilter=Ue,t.map=r,t.needsUpdate=!0},a=()=>{};n.endsWith(".hdr")?new Pr().load(n,o,void 0,a):new Ba().load(n,r=>{r.colorSpace=It,o(r)},void 0,a)}function Br(t,e,n){if(n){const r=(d,m)=>new D(new mo(m,32,16),new Ft({map:Jo(d),side:jo,fog:!1,transparent:!0,depthWrite:!1,opacity:0})),i=r(Bt.night.sky,450),l=r(Bt.sunset.sky,448),c=r(Bt.daylight.sky,446);for(const d of[i,l,c])d.position.y=-70;return i.renderOrder=-3,l.renderOrder=-2,c.renderOrder=-1,t.add(i,l,c),Ce(c.material,"daylight"),Ce(l.material,"sunset"),Ce(i.material,"night"),{daylight:c,sunset:l,night:i}}const o=e===Bt.sunset?"sunset":e===Bt.night?"night":"daylight",a=new D(new mo(450,32,16),new Ft({map:Jo(e.sky),side:jo,fog:!1}));return a.position.y=-70,t.add(a),Ce(a.material,o),null}function Dr(t,e){const n=new D(new tt(800,800),new ct({map:Wo().map,normalMap:Wo().normalMap,normalScale:new Rt(.6,.6),color:e.grassTint,roughness:.95,metalness:0}));n.rotation.x=-Math.PI/2,n.position.y=-.03,n.receiveShadow=!0,t.add(n);const o=new D(new tt(400,900),new ct({color:e.sea.color,roughness:e.sea.roughness,metalness:e.sea.metalness}));o.rotation.x=-Math.PI/2,o.position.set(290,-.02,0),t.add(o);const a=new D(new tt(8,900),new ct({color:13220758,roughness:.9}));a.rotation.x=-Math.PI/2,a.position.set(88,-.025,0),t.add(a);const r=$e(97531),i=new Vt;let l=4e4;function c(x,u,f){l+=733;const v=xo(l,{trunkLen:2.6*f,trunkRad:.24*f,maxLevel:2,leafScale:.95*f});v.position.set(x,0,u),v.rotation.y=r()*Math.PI*2,i.add(v)}[[-12,30,1],[4,31,1.15],[12,34,.9],[34,-18,1.1],[36,14,.95]].forEach(([x,u,f],v)=>{const g=xo(6e4+v*137,{trunkLen:3.2*f,trunkRad:.32*f,maxLevel:2,leafScale:1.1*f});g.position.set(x+(r()-.5)*2,0,u+(r()-.5)*2),g.rotation.y=r()*Math.PI*2,i.add(g)});const m=[[-20,33],[-4,35],[20,30],[-16,42],[-6,45],[6,43],[16,46],[0,52],[-24,50],[24,48]];for(const[x,u]of m)c(x+(r()-.5)*3,u+(r()-.5)*3,1+r()*.9);const b=[[40,-10],[44,22],[52,-18],[60,8],[48,-2]];for(const[x,u]of b)c(x+(r()-.5)*3,u+(r()-.5)*3,.9+r()*.8);const h=[[-35,-30],[-45,0],[-38,20],[-30,40],[20,-40],[-10,-38]];for(const[x,u]of h)c(x+(r()-.5)*4,u+(r()-.5)*4,1.1+r()*1);for(const x of Yn(i))t.add(x);return{seaMat:o.material}}function Gr(t,e){const n=xo(31415,{trunkLen:4.6,trunkRad:.42,maxLevel:3,leafScale:1.4});n.position.set(7,0,14);for(const r of Yn(n))t.add(r);const o=new D(new ee(.42,.72,.45,9),new ct({map:ar(),normalMap:nr(),normalScale:new Rt(.9,.9),roughness:.95}));o.position.set(7,.22,14),o.castShadow=!0,t.add(o);const a=[];if(e.treeUplights)for(const[r,i]of[[5.6,13],[8.4,15]]){const l=new Pa(16756838,150,15,Math.PI/5,.9,1.8);l.position.set(r,.35,i);const c=new Oa;c.position.set(7,7,14),t.add(c),l.target=c,l.castShadow=!1,t.add(l),a.push(l)}return{treeUplights:a}}function Qo(t,e){const n=new Vt,o=new tt(.16,.12);o.translate(-.09,0,0);const a=new tt(.16,.12);a.translate(.09,0,0);const r=new Ft({color:e.color,side:be}),i=new D(o,r),l=new D(a,r);i.rotation.x=-Math.PI/2,l.rotation.x=-Math.PI/2,n.add(i),n.add(l),t.add(n),Oo.push({update(c){const d=c*e.speed+e.phase,m=e.cx+Math.cos(d)*e.rx,b=e.cz+Math.sin(d*e.zRatio)*e.rz,h=e.cy+Math.sin(c*e.bobSpeed+e.phase)*e.bobAmp,x=-Math.sin(d)*e.rx*e.speed,u=Math.cos(d*e.zRatio)*e.rz*e.zRatio*e.speed;n.rotation.y=Math.atan2(x,u),n.position.set(m,h,b);const f=Math.sin(c*e.flapSpeed)*1.1;i.rotation.y=f,l.rotation.y=-f}})}function Hr(t,e){const n=new Vt,o=new Ft({color:2763310,side:be}),a=new tt(1.6,.35);a.translate(-.8,0,0);const r=new tt(1.6,.35);r.translate(.8,0,0);const i=new D(a,o),l=new D(r,o);i.rotation.x=-Math.PI/2,l.rotation.x=-Math.PI/2,n.add(i),n.add(l),t.add(n),Oo.push({update(c){const d=c*e.speed+e.phase,m=e.cx+Math.cos(d)*e.radius,b=e.cz+Math.sin(d)*e.radius,h=e.cy+Math.sin(c*.3+e.phase)*2;n.rotation.y=-d-Math.PI/2,n.position.set(m,h,b);const x=Math.sin(c*e.flapSpeed+e.phase)*.55;i.rotation.y=x,l.rotation.y=-x}})}function Xr(t){const e=$e(86420),n=[15241786,15979338,15262938,13070264,8368864];for(let o=0;o<5;o++)Qo(t,{cx:7,cz:14,cy:1.4+e()*3,rx:1+e()*2.2,rz:1+e()*2.2,zRatio:.7+e()*.6,speed:.35+e()*.4,phase:e()*Math.PI*2,bobSpeed:1.5+e()*1.5,bobAmp:.3+e()*.3,flapSpeed:9+e()*5,color:n[o%n.length]});for(let o=0;o<4;o++)Qo(t,{cx:-14+o*10+e()*4,cz:30+e()*8,cy:1.2+e()*2,rx:1.5+e()*3,rz:1.5+e()*3,zRatio:.6+e()*.8,speed:.3+e()*.35,phase:e()*Math.PI*2,bobSpeed:1.2+e()*1.6,bobAmp:.35+e()*.4,flapSpeed:8+e()*5,color:n[(o+2)%n.length]});for(let o=0;o<3;o++)Hr(t,{cx:20+e()*30,cz:-10+e()*40,cy:26+e()*12,radius:55+e()*45,speed:.04+e()*.03,phase:e()*Math.PI*2,flapSpeed:2.2+e()*1.2})}function Fr(t,e){const n=new Pn(e.hemi.sky,e.hemi.ground,e.hemi.intensity);n.position.set(0,40,0),t.add(n);const o=new In(e.ambient.color,e.ambient.intensity);t.add(o);const a=new Jt(e.sun.color,e.sun.intensity);a.position.set(...e.sun.pos),a.castShadow=!0,a.shadow.mapSize.set(2048,2048),a.shadow.bias=-5e-4,a.shadow.normalBias=.02;const r=e.shadowCamera;a.shadow.camera.left=r.left,a.shadow.camera.right=r.right,a.shadow.camera.top=r.top,a.shadow.camera.bottom=r.bottom,a.shadow.camera.near=r.near,a.shadow.camera.far=r.far,t.add(a),t.add(a.target);const i=new Jt(e.fill.color,e.fill.intensity);return i.position.set(...e.fill.pos),t.add(i),{hemi:n,ambient:o,sun:a,fill:i}}function Yr(t){for(const e of Oo)e.update(t)}let _t=null,tn=0;function Ur(t){tn+=t,Yr(tn),_t&&(_t.phase=(_t.phase+t/lr)%1,Zn(_t,qn(_t.phase)))}function jr(t,e="daylight",n={}){const o=n.fullLights!==!1,a=e==="cycle",r=a?rr():0,i=a?ir(r):sr(e);t.background=new On(i.background),t.fog=new Bn(i.fog.color,i.fog.near,i.fog.far);const l=Br(t,i,a),c=Dr(t,i);Rr(t);const d=Ir(t,i,o),m=Gr(t,i),b=d.downlights,h=Fr(t,i);if(Xr(t),a){const x=new Jt(Bt.night.sun.color,0);x.position.set(...Bt.night.sun.pos),t.add(x),t.add(x.target),_t={scene:t,phase:r,sunLight:h.sun,hemiLight:h.hemi,ambientLight:h.ambient,moonLight:x,seaMat:c.seaMat,downlights:b,treeUplights:m.treeUplights,skyDomes:l},h.sun.shadow.camera.updateProjectionMatrix(),Zn(_t,qn(r))}else _t=null;return{bounds:{minX:N.minX+.6,maxX:N.maxX-.6,minZ:N.minZ+.6,maxZ:N.maxZ-.6}}}let lt=null,ue=null,le=!1;function $r(t,e){if(!lt)return;const n=new StereoPannerNode(lt,{pan:e});n.connect(ue);const o=2+Math.floor(Math.random()*4);let a=lt.currentTime+.02;for(let r=0;r<o;r++){const i=lt.createOscillator(),l=lt.createGain();i.connect(l),l.connect(n);const c=t*(.85+Math.random()*.4),d=c*(Math.random()>.5?1.25:.78),m=.05+Math.random()*.1;i.type="sine",i.frequency.setValueAtTime(c,a),i.frequency.exponentialRampToValueAtTime(d,a+m),l.gain.setValueAtTime(1e-4,a),l.gain.exponentialRampToValueAtTime(.55,a+.012),l.gain.exponentialRampToValueAtTime(1e-4,a+m),i.start(a),i.stop(a+m+.02),a+=m+.04+Math.random()*.09}}function Wr(){const t=lt.sampleRate*4,e=lt.createBuffer(1,t,lt.sampleRate),n=e.getChannelData(0);let o=0;for(let l=0;l<t;l++){const c=Math.random()*2-1;o=(o+.02*c)/1.02,n[l]=o*3.5}const a=lt.createBufferSource();a.buffer=e,a.loop=!0;const r=lt.createBiquadFilter();r.type="lowpass",r.frequency.value=400;const i=lt.createGain();i.gain.value=.012,a.connect(r),r.connect(i),i.connect(ue),a.start()}function ko(){if(!le)return;const t=[{base:2600,pan:-.7},{base:3400,pan:.6},{base:4200,pan:.15}],e=t[Math.floor(Math.random()*t.length)];$r(e.base,e.pan+(Math.random()-.5)*.3);const n=900+Math.random()*4200;setTimeout(ko,n)}function Vr(){if(!le)try{lt=new(window.AudioContext||window.webkitAudioContext),ue=lt.createGain(),ue.gain.value=.05,ue.connect(lt.destination),lt.state==="suspended"&&lt.resume(),le=!0,Wr(),ko(),setTimeout(()=>{le&&ko()},2500)}catch{le=!1}}const ae=2.5,en=4.5,on=.0022,nn=.0058,Ee=mt.degToRad(89),Kr=.03,Zr=7.5,Me=60,Ct=.45,an=.65,qr=12;function Jr(t,e){for(const n of N.stairs){const o=Math.min(n.x0,n.x1),a=Math.max(n.x0,n.x1);if(t<o||t>a)continue;const r=Math.min(n.z0,n.z1),i=Math.max(n.z0,n.z1);if(e<r||e>i)continue;const l=mt.clamp((e-n.z0)/(n.z1-n.z0),0,1);return n.yFrom+l*(n.yTo-n.yFrom)}return null}function Qr(t,e,n){return e>=t.x0&&e<=t.x1&&n>=t.z0&&n<=t.z1}function ti(t,e){return t>=N.minX&&t<=N.maxX&&e>=N.minZ&&e<=N.maxZ}function ta(t,e){const n=[],o=Jr(t,e);if(o!==null&&n.push(o),ti(t,e))for(const a of N.floors){const r=N.slabHoles[a.id]||[];let i=!1;for(const l of r)if(Qr(l,t,e)){i=!0;break}i||n.push(a.y)}else n.push(0);return n}function ei(t,e,n){const o=ta(t,e);let a=null;for(const r of o)r<=n+an&&(a===null||r>a)&&(a=r);return a===null||n-a>an?null:a}function oi(t,e){let n=t,o=e;return e>N.minZ-Ct&&e<N.maxZ+Ct&&(n=mt.clamp(t,N.minX+Ct,N.maxX-Ct)),t>N.minX-Ct&&t<N.maxX+Ct&&(o=Math.max(e,N.minZ+Ct)),{x:n,z:o}}class ni{constructor(e,n){if(this.camera=e,this.domElement=n,this.enabled=!1,this.euler=new Dn(0,0,0,"YXZ"),this.camera.rotation.set(0,0,0),this.camera.rotation.order="YXZ",this.camera.position.set(0,Et,8),this.keys={forward:!1,backward:!1,left:!1,right:!1,run:!1},this.velocity=new Rt(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0,this.groundY=this.camera.position.y-Et,this.moveTouch=null,this.lookTouch=null,!document.getElementById("lu-joy-style")){const o=document.createElement("style");o.id="lu-joy-style",o.textContent=`
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
    inset 0 -2px 4px rgba(32,74,52,0.30); }`,document.head.appendChild(o)}this._joyBase=document.createElement("div"),this._joyBase.className="lu-joy-base",this._joyKnob=document.createElement("div"),this._joyKnob.className="lu-joy-knob",this._wasRunning=!1,document.body.appendChild(this._joyBase),document.body.appendChild(this._joyKnob),this._bindEvents()}_bindEvents(){this._onClick=()=>{this.enabled&&document.pointerLockElement!==this.domElement&&this.domElement.requestPointerLock?.()},this.domElement.addEventListener("click",this._onClick),this._onMouseMove=e=>{this.enabled&&document.pointerLockElement===this.domElement&&(this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=e.movementX*on,this.euler.x-=e.movementY*on,this.euler.x=mt.clamp(this.euler.x,-Ee,Ee),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler))},document.addEventListener("mousemove",this._onMouseMove),this._onKeyDown=e=>{if(!this.enabled)return;const n=e.target;n&&(n.tagName==="INPUT"||n.tagName==="TEXTAREA")||this._setKey(e.code,!0)},this._onKeyUp=e=>{this._setKey(e.code,!1)},document.addEventListener("keydown",this._onKeyDown),document.addEventListener("keyup",this._onKeyUp),this._onTouchStart=e=>{if(this.enabled){for(const n of e.changedTouches){const o=window.innerWidth*.5;n.clientX<o&&this.moveTouch===null?(this.moveTouch={id:n.identifier,startX:n.clientX,startY:n.clientY,dx:0,dy:0},this._joyBase.style.left=n.clientX+"px",this._joyBase.style.top=n.clientY+"px",this._joyKnob.style.left=n.clientX+"px",this._joyKnob.style.top=n.clientY+"px",this._joyBase.classList.add("lu-live"),this._joyKnob.classList.add("lu-live")):n.clientX>=o&&this.lookTouch===null&&(this.lookTouch={id:n.identifier,lastX:n.clientX,lastY:n.clientY})}e.cancelable&&e.preventDefault()}},this._onTouchMove=e=>{if(this.enabled){for(const n of e.changedTouches)if(this.moveTouch&&n.identifier===this.moveTouch.id){const o=n.clientX-this.moveTouch.startX,a=n.clientY-this.moveTouch.startY,r=Math.hypot(o,a),i=r>Me?Me/r:1;this.moveTouch.dx=o*i/Me,this.moveTouch.dy=a*i/Me,this._joyKnob.style.left=this.moveTouch.startX+o*i+"px",this._joyKnob.style.top=this.moveTouch.startY+a*i+"px";const l=Math.hypot(this.moveTouch.dx,this.moveTouch.dy)>.85;this._joyBase.classList.toggle("lu-run",l),this._joyKnob.classList.toggle("lu-run",l),l&&!this._wasRunning&&navigator.vibrate&&navigator.vibrate(10),this._wasRunning=l}else if(this.lookTouch&&n.identifier===this.lookTouch.id){const o=n.clientX-this.lookTouch.lastX,a=n.clientY-this.lookTouch.lastY;this.lookTouch.lastX=n.clientX,this.lookTouch.lastY=n.clientY,this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=o*nn,this.euler.x-=a*nn,this.euler.x=mt.clamp(this.euler.x,-Ee,Ee),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler)}e.cancelable&&e.preventDefault()}},this._onTouchEnd=e=>{for(const n of e.changedTouches)this.moveTouch&&n.identifier===this.moveTouch.id?(this.moveTouch=null,this._wasRunning=!1,this._joyBase.classList.remove("lu-live","lu-run"),this._joyKnob.classList.remove("lu-live","lu-run")):this.lookTouch&&n.identifier===this.lookTouch.id&&(this.lookTouch=null)},this.domElement.addEventListener("touchstart",this._onTouchStart,{passive:!1}),this.domElement.addEventListener("touchmove",this._onTouchMove,{passive:!1}),this.domElement.addEventListener("touchend",this._onTouchEnd),this.domElement.addEventListener("touchcancel",this._onTouchEnd)}_setKey(e,n){switch(e){case"KeyW":case"ArrowUp":this.keys.forward=n;break;case"KeyS":case"ArrowDown":this.keys.backward=n;break;case"KeyA":case"ArrowLeft":this.keys.left=n;break;case"KeyD":case"ArrowRight":this.keys.right=n;break;case"ShiftLeft":case"ShiftRight":this.keys.run=n;break}}_tryMove(e,n){const o=oi(e,n),a=mt.clamp(o.x,-24,ke.bound),r=mt.clamp(o.z,-24,ke.bound),i=N.maxZ,l=this.camera.position.z;if(a>N.minX-Ct&&a<N.maxX+Ct&&(l-i)*(r-i)<0&&Math.abs(a)>1.4)return null;const d=ei(a,r,this.groundY);return d===null?null:{x:a,z:r,y:d}}update(e){if(!this.enabled)return;e=Math.min(e,.1);let n=0,o=0;this.keys.forward&&(o-=1),this.keys.backward&&(o+=1),this.keys.left&&(n-=1),this.keys.right&&(n+=1);let a=this.keys.run?en:ae;if(this.moveTouch&&n===0&&o===0){n=this.moveTouch.dx,o=this.moveTouch.dy;const p=Math.hypot(n,o);p<.14&&(n=0,o=0),a=ae+(en-ae)*Math.min(1,Math.max(0,(p-.85)/.15))}else{const p=Math.hypot(n,o);p>1&&(n/=p,o/=p)}this.euler.setFromQuaternion(this.camera.quaternion,"YXZ");const r=this.euler.y,i=Math.sin(r),l=Math.cos(r),c=(n*l+o*i)*a,d=(-n*i+o*l)*a,m=1-Math.exp(-10*e);this.velocity.x+=(c-this.velocity.x)*m,this.velocity.y+=(d-this.velocity.y)*m;const b=this.camera.position,h=b.x+this.velocity.x*e,x=b.z+this.velocity.y*e;let u=this._tryMove(h,x);if(!u){const p=this._tryMove(h,b.z),P=this._tryMove(b.x,x);u=p||P||null}u&&(b.x=u.x,b.z=u.z,this.groundY=u.y);const f=Math.hypot(this.velocity.x,this.velocity.y);if(f>.3){this.bobPhase+=e*Zr*(f/ae);const p=Math.min(1,f/ae);this.bobOffset=Math.sin(this.bobPhase)*Kr*p}else this.bobOffset+=(0-this.bobOffset)*m,Math.abs(this.bobOffset)<5e-4&&(this.bobOffset=0,this.bobPhase=0);const v=Math.min(1,qr*e),g=this.groundY+Et+this.bobOffset+this.liftOffset;b.y+=(g-b.y)*v}resolveBodyCollisions(e){if(!this.enabled||!e||!e.length)return;const n=.6,o=1.2,a=this.camera.position;let r=a.x,i=a.z,l=!1,c=0,d=0;for(const h of e){if(!h||h.y!=null&&Math.abs(h.y-this.groundY)>o)continue;const x=r-h.x,u=i-h.z,f=Math.hypot(x,u);if(f>=n)continue;const v=f>1e-4?x/f:Math.sin(this.euler.y),g=f>1e-4?u/f:Math.cos(this.euler.y);r=h.x+v*n,i=h.z+g*n,c=v,d=g,l=!0}if(!l)return;const m=this._tryMove(r,i);m&&(a.x=m.x,a.z=m.z,this.groundY=m.y);const b=this.velocity.x*-c+this.velocity.y*-d;b>0&&(this.velocity.x+=c*b,this.velocity.y+=d*b)}getState(){return this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z,ry:this.euler.y}}setPose({x:e,y:n,z:o,ry:a}){const r=mt.clamp(e,-24,ke.bound),i=mt.clamp(o,-24,ke.bound);let l;if(n!=null)l=n-Et;else{const c=ta(r,i);l=c.length?Math.max(...c):0}this.groundY=l,this.camera.position.set(r,l+Et,i),this.euler.set(0,a,0,"YXZ"),this.camera.quaternion.setFromEuler(this.euler),this.velocity.set(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0}enable(){this.enabled=!0}disable(){this.enabled=!1,this.keys.forward=this.keys.backward=this.keys.left=this.keys.right=this.keys.run=!1,this.velocity.set(0,0),this.moveTouch=null,this.lookTouch=null,document.pointerLockElement===this.domElement&&document.exitPointerLock?.()}dispose(){this.disable(),this.domElement.removeEventListener("click",this._onClick),document.removeEventListener("mousemove",this._onMouseMove),document.removeEventListener("keydown",this._onKeyDown),document.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("touchstart",this._onTouchStart),this.domElement.removeEventListener("touchmove",this._onTouchMove),this.domElement.removeEventListener("touchend",this._onTouchEnd),this.domElement.removeEventListener("touchcancel",this._onTouchEnd)}}const ai=3,ri=6,rn=2.2,ii=.05;function si({player:t,getSelfAvatar:e}){let n=!1,o=0,a=0,r=0;const i=u=>{if(u.code!=="Space"||!t||!t.enabled)return;const f=u.target;f&&(f.tagName==="INPUT"||f.tagName==="TEXTAREA")||(n=!0,u.preventDefault())},l=u=>{u.code==="Space"&&(n=!1)};document.addEventListener("keydown",i),document.addEventListener("keyup",l);let c=null;const d=typeof window<"u"&&window.matchMedia&&window.matchMedia("(pointer: coarse)").matches,m=u=>{n=!0,c&&c.classList.add("lu-fly-on"),u.cancelable&&u.preventDefault(),u.stopPropagation()},b=u=>{n=!1,c&&c.classList.remove("lu-fly-on"),u.stopPropagation()};d&&(c=document.createElement("button"),c.id="lu-fly-btn",c.type="button",c.setAttribute("aria-label","날기 — 누르고 있으면 상승"),c.textContent="▲",c.style.cssText=["position:fixed","right:20px","bottom:104px","width:64px","height:64px","border-radius:50%","border:1.5px solid rgba(255,255,255,0.34)","background:rgba(22,24,30,0.44)","color:rgba(255,255,255,0.92)","font-size:20px","line-height:1","z-index:6","display:none","align-items:center","justify-content:center","touch-action:none","user-select:none","-webkit-user-select:none","cursor:pointer","box-shadow:0 2px 12px rgba(0,0,0,0.32)","transition:background 0.12s, transform 0.12s, opacity 0.2s"].join(";"),c.addEventListener("touchstart",m,{passive:!1}),c.addEventListener("touchend",b),c.addEventListener("touchcancel",b),c.addEventListener("pointerdown",u=>{u.pointerType!=="touch"&&m(u)}),c.addEventListener("pointerup",u=>{u.pointerType!=="touch"&&b(u)}),document.body.appendChild(c));function h(u){const f=Math.min(u||0,.1),v=!!(t&&t.enabled);v||(n=!1),t&&t.liftOffset!==r&&(o=t.liftOffset,a=0),n?a=ai:(a-=ri*f,a<-5&&(a=-5)),o+=a*f,o>=rn&&(o=rn,a=0),o<=0&&(o=0,a=0),t&&(t.liftOffset=o,r=o);const g=v&&o>ii,p=e&&e();p&&typeof p.setFlying=="function"&&p.setFlying(g),c&&(c.style.display=v?"flex":"none")}function x(){document.removeEventListener("keydown",i),document.removeEventListener("keyup",l),c&&c.parentNode&&c.parentNode.removeChild(c)}return{update:h,dispose:x}}const li="lu-stats-v1-",ci=3;function sn(){const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}function di(){return{totalVisits:0,days:{},dwell:{}}}class ui{key;_seen;data;_saveTimer;constructor(e){this.key=li+String(e||"default"),this._seen=new Set,this.data=di();try{const n=localStorage.getItem(this.key);if(n){const o=JSON.parse(n);o&&typeof o=="object"&&(this.data={totalVisits:o.totalVisits|0,days:o.days&&typeof o.days=="object"?o.days:{},dwell:o.dwell&&typeof o.dwell=="object"?o.dwell:{}})}}catch{}this._saveTimer=null}_save(){this._saveTimer||(this._saveTimer=setTimeout(()=>{this._saveTimer=null;try{localStorage.setItem(this.key,JSON.stringify(this.data))}catch{}},2e3))}addVisit(e){if(!e||this._seen.has(e))return;this._seen.add(e),this.data.totalVisits+=1;const n=sn();this.data.days[n]=(this.data.days[n]|0)+1;const o=Object.keys(this.data.days).sort();for(;o.length>60;)delete this.data.days[o.shift()];this._save()}addDwell(e,n,o){if(!e||!e.length||!n||!n.length)return;let a=!1;for(const r of e){let i=null,l=ci;for(const c of n){const d=Math.hypot(c.pos.x-r.x,c.pos.z-r.z);d<l&&(l=d,i=c)}i&&i.title&&(this.data.dwell[i.title]=(this.data.dwell[i.title]||0)+o,a=!0)}a&&this._save()}summary(e){const o=[`오늘 방문 ${this.data.days[sn()]|0}`,`누적 ${this.data.totalVisits}`];typeof e=="number"&&o.push(`방명록 ${e}`);const a=Object.entries(this.data.dwell).sort((r,i)=>i[1]-r[1])[0];if(a&&a[1]>=10){const r=a[1]>=60?`${Math.round(a[1]/60)}분`:`${Math.round(a[1])}초`;o.push(`인기작 「${a[0]}」 ${r}`)}return o.join(" · ")}}const ea="#5f9e7d";function pi(){const t=`
/* 폰트(@font-face·스택)는 SSOT인 vendor/fonts/fonts.css가 담당 — index.html <head>에서
   정적 <link>로 로드된다. 여기선 그 단일 스택(--app-font)만 --lu-font로 잇는다. */
:root {
  --lu-gold: ${ea};
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
`,e=document.createElement("style");e.id="lu-styles",e.textContent=t,document.head.appendChild(e)}function s(t,e={},n=[]){const o=document.createElement(t);for(const[a,r]of Object.entries(e))a==="className"?o.className=r:a==="text"?o.textContent=r:o.setAttribute(a,r);for(const a of n)o.appendChild(a);return o}const fi="lu-chibi-look::",hi="lu-chibi-thumb::",gi="lu-chibi-closet::",bi="lu-chibi-look-v1",mi="lu-chibi-look-thumb-v1",ln=12;function Je(){const t=Nt();return t&&t.provider&&t.name?`${t.provider}:${t.name}`:"guest"}function We(t){return fi+(t||Je())}function Bo(t){return hi+(t||Je())}function oa(t){return gi+(t||Je())}function xi(){try{const t=localStorage.getItem(bi);if(t&&!localStorage.getItem(We("guest"))){localStorage.setItem(We("guest"),t);const e=localStorage.getItem(mi);e&&localStorage.setItem(Bo("guest"),e)}}catch{}}xi();function na(t){try{const e=localStorage.getItem(We(t));if(!e)return null;const n=JSON.parse(e);return n&&typeof n=="object"?n:null}catch{return null}}function wi(t,e){try{return localStorage.setItem(We(e),JSON.stringify(t)),!0}catch{return!1}}function cn(t){try{return localStorage.getItem(Bo(t))||""}catch{return""}}function yi(t,e){try{localStorage.setItem(Bo(e),t)}catch{}}let Do=null;function vi(t){Do=t}function aa(){return Do||na()}Jn(()=>{Do=null});function ro(t){try{const e=localStorage.getItem(oa(t));if(!e)return[];const n=JSON.parse(e);return Array.isArray(n)?n:[]}catch{return[]}}function dn(t,e){try{return localStorage.setItem(oa(e),JSON.stringify(t)),!0}catch{return!1}}function ki(t,e,n){try{const o=document.createElement("canvas");return o.width=e,o.height=n,o.getContext("2d").drawImage(t,0,0,e,n),o.toDataURL("image/jpeg",.72)}catch{return""}}let et=null,st=null,Zt=null,Te=0,Le=!1,io=0,ze=0,so=Math.PI;const Si=mt.degToRad(18),Ci=.6,un='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 19.5C4.5 10 11 4 20 4c0 9-6 15.5-15.5 15.5A1 1 0 0 1 4.5 19.5Z"/><path d="M6.7 17.3C10.2 13.3 14.2 9.3 18 5.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>',Ei=[{id:"species",label:"종족",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8.3" r="2.1"/><circle cx="12" cy="6.1" r="2.1"/><circle cx="17" cy="8.3" r="2.1"/><path d="M12 11.6c-3.4 0-6.1 2.4-6.1 5.2 0 2 1.8 3.3 3.7 2.6.9-.3 1.7-.3 2.6 0 1.9.7 3.7-.6 3.7-2.6 0-2.8-2.5-5.2-5.9-5.2Z"/></svg>'},{id:"face",label:"얼굴",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><path d="M8.6 14.6c1 1.1 2.1 1.7 3.4 1.7s2.4-.6 3.4-1.7"/></svg>'},{id:"hair",label:"헤어",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12.5C5 8 8.1 4.5 12 4.5s7 3.5 7 8"/><path d="M6.3 12.5v3.2M10.1 12.5v4.2M13.9 12.5v4.2M17.7 12.5v3.2"/></svg>'},{id:"outfit",label:"의상",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8.3 4.2 4.3 7.3l2 3 2-1.1v9.6h7.4V9.2l2 1.1 2-3-4-3.1c-.7 1-1.8 1.6-3.7 1.6s-3-.6-3.7-1.6Z"/></svg>'},{id:"acc",label:"장식",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.5 3.5 1.7 6.3 5.2 7.6-3.5 1.3-4.7 4.1-5.2 7.6-.5-3.5-1.7-6.3-5.2-7.6C10.3 9.3 11.5 6.5 12 3Z"/><circle cx="19" cy="5.2" r="1.2"/></svg>'},{id:"closet",label:"옷장",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.3"/><path d="M12 5.9v1.8"/><path d="M12 7.7 4.3 13.4h15.4L12 7.7Z"/><path d="M4.3 17.4h15.4"/></svg>'}];function Mi(t){const{els:e,state:n,callbacks:o,setStatus:a}=t,r=s("button",{id:"lu-am-save",type:"button","aria-label":"이 캐릭터 사용",title:"이 캐릭터 사용",text:"✓"}),i=s("button",{id:"lu-am-close",type:"button","aria-label":"닫기",text:"×"}),l=s("span",{className:"lu-am-title-icon","aria-hidden":"true"});l.innerHTML=un;const c=s("div",{className:"lu-am-title"},[l,s("span",{text:"캐릭터 디자인"})]),d=s("div",{className:"lu-am-head-actions"},[r,i]),m=s("div",{className:"lu-am-head"},[c,d]),b=s("canvas",{width:"300",height:"400"}),h=s("div",{className:"lu-am-stage"},[b]),x=s("div",{className:"lu-am-stagewrap"},[h]),u=s("div",{className:"lu-am-preview"},[x]),f=["wave","jump","clap","dance","breakdance","run","jumpingjack","heart","kick"];let v=1,g=null,p=null,P=null,z=null;function G(T,R){if(typeof document>"u")return null;const _=document.createElement("canvas");_.width=2,_.height=256;const H=_.getContext("2d"),O=H.createLinearGradient(0,0,0,256);O.addColorStop(0,T),O.addColorStop(1,R),H.fillStyle=O,H.fillRect(0,0,2,256);const $=new he(_);return $.colorSpace=It,$}function I(T,R){if(typeof document>"u")return null;const _=512,H=307,O=document.createElement("canvas");O.width=_,O.height=H;const $=O.getContext("2d");$.fillStyle=T,$.fillRect(0,0,_,H);const ht=28,Tt=_/ht;$.fillStyle=R;for(let ne=0;ne<ht;ne++)$.fillRect(ne*Tt,0,Tt/2,H);const oe=new he(O);return oe.colorSpace=It,oe.anisotropy=4,oe}function X(){if(g)return;g=new Gn({canvas:b,antialias:!0,alpha:!0}),g.setPixelRatio(Math.min(2,typeof window<"u"&&window.devicePixelRatio||1)),g.setSize(300,400,!1),g.shadowMap.enabled=!0,g.shadowMap.type=Da,g.toneMapping=Hn,g.toneMappingExposure=1,g.outputColorSpace=It,p=new Xn,p.background=G("#f0ead9","#ddd2bd")||new On("#ddd2bd"),p.fog=new Bn(14603199,5.5,10),P=new Fn(30,300/400,.1,20),P.position.set(0,1,4),P.lookAt(0,.85,0),p.add(new Pn(16775924,2367256,.65));const T=new Jt(16777215,1.4);T.position.set(.7,2,2.6),p.add(T);const R=new Jt(16776696,.4);R.position.set(-1.8,1.1,1.6),p.add(R);const _=new Jt(16777215,0);_.position.set(.4,5,1),_.castShadow=!0,_.shadow.mapSize.set(512,512),_.shadow.camera.near=.5,_.shadow.camera.far=9,_.shadow.camera.left=-1.3,_.shadow.camera.right=1.3,_.shadow.camera.top=1.3,_.shadow.camera.bottom=-1.3,_.shadow.radius=35,_.shadow.blurSamples=24,_.shadow.bias=-5e-4,p.add(_),p.add(_.target);const H=new D(new tt(6,6),new ct({color:12165231,roughness:.9,metalness:0}));H.rotation.x=-Math.PI/2,H.position.y=0,H.receiveShadow=!0,p.add(H);const O=new D(new tt(6,6),new Ga({opacity:.3}));O.rotation.x=-Math.PI/2,O.position.y=.002,O.material.polygonOffset=!0,O.material.polygonOffsetFactor=-1,O.receiveShadow=!0,p.add(O);const $=I("#e2d7bf","#efe7d3"),ht=new D(new tt(10,6),new ct({map:$,roughness:.9,metalness:0}));ht.position.set(0,2.2,-2.3),p.add(ht),z=new Vt,z.rotation.y=Math.PI,p.add(z)}let S="species";const k=s("div",{className:"lu-am-nav",role:"tablist","aria-label":"캐릭터 디자인 카테고리"}),C=s("div",{className:"lu-am-panel"}),A=s("div",{className:"lu-am-tabpage",id:"lu-am-tabpanel",role:"tabpanel",tabindex:"0"});C.appendChild(k),C.appendChild(A),k.addEventListener("keydown",T=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(T.key))return;const R=[...k.querySelectorAll(".lu-am-navtab")];if(!R.length)return;const _=R.findIndex($=>$.getAttribute("aria-selected")==="true");let H=_<0?0:_;T.key==="ArrowLeft"?H=(_-1+R.length)%R.length:T.key==="ArrowRight"?H=(_+1)%R.length:T.key==="Home"?H=0:T.key==="End"&&(H=R.length-1),T.preventDefault(),R[H].click();const O=k.querySelectorAll(".lu-am-navtab")[H];O&&O.focus()});const M=s("div",{className:"lu-am-body"},[u,C]),B=s("div",{className:"lu-am-card"},[m,M]),E=s("div",{id:"lu-chibi-maker",className:"lu"},[B]);document.body.appendChild(E);function y(T,R){et&&(et[T]=R,T==="species"&&R!=="human"&&Vo[R]&&Object.assign(et,Vo[R]),et=no(et),eo(),Kt())}function L(T){et=no(Object.assign({},T)),eo(),Kt()}function Y(){for(const T of ur){const R=pr.filter(H=>(H.cat||"human")===T.id);if(!R.length)continue;A.appendChild(s("div",{className:"lu-am-section-title",text:`${T.name} (${R.length})`}));const _=s("div",{className:"lu-am-tabs lu-am-presets"});for(const H of R){const O=s("button",{type:"button",className:"lu-am-tab lu-am-preset"}),$=H.look.skin||He.skin,ht=H.look.top||H.look.hairColor||He.top,Tt=s("span",{className:"lu-am-preset-dot","aria-hidden":"true"});Tt.style.background=`conic-gradient(${$} 0deg 180deg, ${ht} 180deg 360deg)`,O.appendChild(Tt),O.appendChild(s("span",{className:"lu-am-preset-label",text:H.name})),O.addEventListener("click",()=>L(H.look)),_.appendChild(O)}A.appendChild(_)}}function j(T){const R=Ko.find(_=>_.id===T);return R&&R.name||"아야모"}function Z(){if(!Nt())return;const T=Je();nt("내 옷장");const R=s("button",{type:"button",className:"lu-am-btn lu-closet-save",text:"＋ 지금 모습 옷장에 저장"});R.addEventListener("click",()=>{const O=ro(T);if(O.length>=ln){a(`옷장은 최대 ${ln}벌까지 저장할 수 있어요`);return}const $={id:"c"+Date.now(),name:j(et.species),look:JSON.parse(JSON.stringify(et)),thumb:Uo(120,160),ts:Date.now()};if(O.push($),!dn(O,T)){a("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요");return}Kt()}),A.appendChild(R);const _=ro(T);if(!_.length){A.appendChild(s("div",{className:"lu-closet-empty",text:"아직 저장한 옷이 없어요. 마음에 드는 모습을 저장해 두세요."}));return}const H=s("div",{className:"lu-closet-grid"});_.forEach(O=>{const $=s("div",{className:"lu-closet-cell"}),ht=s("button",{type:"button",className:"lu-closet-load",title:`${O.name} 불러오기`,"aria-label":`${O.name} 불러오기`});O.thumb&&(ht.style.backgroundImage=`url('${O.thumb}')`),ht.appendChild(s("span",{className:"lu-closet-name",text:O.name})),ht.addEventListener("click",()=>L(O.look));const Tt=s("button",{type:"button",className:"lu-closet-del",text:"×",title:"삭제","aria-label":`${O.name} 삭제`});Tt.addEventListener("click",oe=>{oe.stopPropagation();const ne=ro(T).filter(_a=>_a.id!==O.id);dn(ne,T),Kt()}),$.appendChild(ht),$.appendChild(Tt),H.appendChild($)}),A.appendChild(H)}const W=(T,R)=>[{id:!1,name:T},{id:!0,name:R}];function K(T,R,_){A.appendChild(s("div",{className:"lu-am-section-title",text:T}));const H=s("div",{className:"lu-am-tabs"});R.forEach(O=>{const $=s("button",{type:"button",className:"lu-am-tab"+(et[_]===O.id?" lu-selected":""),text:O.name});$.addEventListener("click",()=>y(_,O.id)),H.appendChild($)}),A.appendChild(H)}function q(T,R,_){A.appendChild(s("div",{className:"lu-am-section-title",text:T}));const H=s("div",{className:"lu-swatches"});R.forEach(O=>{const $=s("button",{type:"button",className:"lu-swatch"+(et[_]===O?" lu-selected":""),style:`background:${O};`,title:O,"aria-label":`${T} ${O}`});$.addEventListener("click",()=>y(_,O)),H.appendChild($)}),A.appendChild(H)}function nt(T){const R=s("div",{className:"lu-am-group-title"}),_=s("span",{className:"lu-am-group-icon","aria-hidden":"true"});_.innerHTML=un,R.appendChild(_),R.appendChild(s("span",{text:T})),A.appendChild(R)}function xe(){k.textContent="";const T=!!Nt(),R=Ei.filter(_=>_.id!=="closet"||T);R.some(_=>_.id===S)||(S="species"),R.forEach(_=>{const H=S===_.id,O=s("button",{type:"button",role:"tab",id:"lu-am-tab-"+_.id,className:"lu-am-navtab"+(H?" lu-selected":""),"aria-selected":H?"true":"false","aria-controls":"lu-am-tabpanel",tabindex:H?"0":"-1","aria-label":_.label});O.innerHTML=_.icon,O.appendChild(s("span",{className:"lu-am-navtab-label",text:_.label})),O.addEventListener("click",()=>{S!==_.id&&(S=_.id,Kt(),A.scrollTop=0)}),k.appendChild(O)}),A.setAttribute("aria-labelledby","lu-am-tab-"+S)}function Kt(){if(xe(),A.textContent="",!et)return;const T=et.species&&et.species!=="human";S==="species"?(Y(),nt(T?"종족 · 털색":"종족 · 성별 · 피부색"),K("종족",Ko,"species"),T||K("성별",fr,"gender"),q(T?"털 색":"피부색",hr,"skin")):S==="face"?(nt("얼굴"),K("얼굴형",gr,"face"),K("눈",br,"eyeStyle"),K("입",mr,"mouth"),T||K("수염",xr,"beardStyle"),K("볼터치",W("없음","있음"),"blush"),q("눈동자 색",wr,"eyeColor")):S==="hair"?T?(nt("포인트"),q("귀·꼬리 색",Zo,"hairColor")):(nt("헤어"),K("헤어",yr,"hairStyle"),q("머리 색",Zo,"hairColor")):S==="outfit"?(nt("의상"),K("상의 패턴",vr,"pattern"),K("의상 세트",kr,"outfit"),K("하의",Sr,"bottomType"),q("상의 색",ao,"top"),q("하의 색",ao,"bottom"),q("신발 색",ao,"shoes")):S==="acc"?(nt("장식"),K("머리 장식",Cr,"acc"),K("안경",W("없음","착용"),"glasses"),K("헤일로",W("없음","있음"),"halo"),K("날개",W("없음","있음"),"wings"),K("가슴 하트",W("없음","있음"),"heart")):S==="closet"&&Z()}function eo(){!et||!z||(st&&(z.remove(st.group),st.dispose(),st=null),st=Un(vo(et),ea," ",{blobShadow:!1}),st.group.traverse(T=>{T.isMesh&&(T.castShadow=!0)}),z.add(st.group))}function Fo(T){Zt=requestAnimationFrame(Fo);const R=Te?(T-Te)/1e3:0,_=Math.min(.1,R);if(Te=T,!Le&&(ze+=_,z.rotation.y=so+Math.sin(ze*Ci)*Si,v-=R,v<=0&&st&&typeof st.playAction=="function")){const H=f[Math.floor(Math.random()*f.length)];st.playAction(H),v=(Er[H]||1.5)+.6+Math.random()*.9}st&&st.update(_,0),g.render(p,P)}function Ma(){Zt||(Te=0,Zt=requestAnimationFrame(Fo))}function Ta(){Zt&&cancelAnimationFrame(Zt),Zt=null}b.addEventListener("pointerdown",T=>{Le=!0,io=T.clientX,u.classList.add("lu-dragging"),b.setPointerCapture(T.pointerId)}),b.addEventListener("pointermove",T=>{Le&&(z.rotation.y+=(T.clientX-io)*.012,io=T.clientX)});const Yo=()=>{Le=!1,u.classList.remove("lu-dragging"),so=z.rotation.y,ze=0};b.addEventListener("pointerup",Yo),b.addEventListener("pointercancel",Yo),i.addEventListener("click",()=>we()),E.addEventListener("click",T=>{T.target===E&&we()});function Uo(T,R){try{return g?(g.render(p,P),ki(b,T,R)||g.domElement.toDataURL("image/png")):""}catch{return""}}function La(){const R=!!Nt()?"저장하고 사용":"이 캐릭터 사용";r.setAttribute("aria-label",R),r.title=R}r.addEventListener("click",()=>{if(!et)return;const T=JSON.parse(JSON.stringify(et));vi(T);const R=!!Nt();if(R){const _=wi(T),H=Uo(150,200);H&&yi(H),_||a("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요")}e&&e.lobby&&e.lobby.onChibiSaved(),n.entered&&typeof o.onAvatarChange=="function"&&o.onAvatarChange(vo(T)),R||a("이 캐릭터로 적용했어요 · 회원가입하면 저장돼요"),we()});function za(){S="species",et=no(Object.assign({},He,aa()||{})),La(),X(),z.rotation.y=Math.PI,so=Math.PI,ze=0,v=1,eo(),Kt(),E.classList.add("lu-open"),n.chibiOpen=!0,Ma(),typeof o.onMakerToggle=="function"&&o.onMakerToggle(!0)}function we(){E.classList.remove("lu-open"),n.chibiOpen=!1,Ta(),st&&(z.remove(st.group),st.dispose(),st=null),typeof o.onMakerToggle=="function"&&o.onMakerToggle(!1)}return{open:za,close:we}}const Ti=8,_e=12;let w=null,at={onEnter:null,onChatSend:null,onAvatarChange:null,onMakerToggle:null},pn=wo[0];const Qt={chibiOpen:!1,entered:!1};let So=null,fn=!1,Yt=!1,Co=null,Gt=null,Ut=!1,Eo=null,jt=!1,Mo=null,Ve=null;const Ne=120;let St={onPrev:null,onNext:null,onExit:null,onToggleAuto:null};const $t=typeof window<"u"&&"ontouchstart"in window||typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches;let xt={onTour:null,onViewArtwork:null,onGuestbook:null,onCapture:null,onSelfView:null},Wt=!1,dt={blob:null,dataUrl:"",galleryName:"",shareUrl:""},Ht=null,Ke=null,At=null,Ze=null;function Li(){const t=s("div",{id:"lu-loading",className:"lu"},[s("div",{className:"lu-spinner"}),s("div",{className:"lu-loading-text",text:"MUSEUM LOADING..."})]);return document.body.appendChild(t),t}function zi(){const t=s("div",{className:"lu-lobby-title",text:"OpenArtShow MUSEUM"}),e=s("div",{className:"lu-lobby-sub",text:"VIRTUAL EXHIBITION"}),n=s("div",{className:"lu-lobby-rule"}),o=s("div",{id:"lu-auth"}),a=s("div",{className:"lu-social-wrap"}),r=s("div",{className:"lu-logged-wrap"}),i=()=>{a.textContent="";for(const M of Object.keys(Se)){const B=Se[M],E=s("button",{className:`lu-social-btn lu-social-${M}`,type:"button"},[s("span",{className:"lu-social-badge",text:B.short}),s("span",{text:B.label})]);E.addEventListener("click",async()=>{E.disabled=!0,E.classList.add("lu-social-busy");try{await Mr(M)}catch{}E.disabled=!1,E.classList.remove("lu-social-busy")}),a.appendChild(E)}a.appendChild(s("div",{className:"lu-social-note",text:"계정 연동 준비 중 — 지금은 프로필 미리보기로 동작합니다"}))},l=M=>{r.textContent="";const B=s("span",{className:"lu-logged-avatar",text:M.initial||M.name.slice(0,1)}),E=s("span",{className:"lu-logged-name",text:`${M.name}님`}),y=s("span",{className:"lu-logged-via",text:Se[M.provider]?Se[M.provider].short:""}),L=s("button",{className:"lu-logout-btn",type:"button",text:"로그아웃"});L.addEventListener("click",()=>Lr()),r.appendChild(s("div",{className:"lu-logged-chip"},[B,E,y,L]))},c=M=>{M?(l(M),a.style.display="none",r.style.display="",b.value=M.name.slice(0,_e)):(a.style.display="",r.style.display="none",(!b.value||Object.values(Tr).includes(b.value))&&(b.value="게스트")),f()};i(),o.appendChild(a),o.appendChild(r);const d=s("div",{className:"lu-auth-or"},[s("span",{text:"소셜 계정 연동 (준비 중)"})]),m=s("label",{className:"lu-field-label",for:"lu-nickname",text:"닉네임"}),b=s("input",{id:"lu-nickname",type:"text",maxlength:String(_e),value:"게스트",autocomplete:"off",spellcheck:"false"}),h=s("div",{className:"lu-field-hint",text:`최대 ${_e}자 · 비워두면 '게스트'로 입장합니다`}),x=s("div",{className:"lu-field-label",text:"캐릭터",style:"margin-top:26px;"}),u=s("button",{id:"lu-char-design",className:"lu-char-design-btn",type:"button","aria-label":"캐릭터 디자인 — 나만의 아야모 만들기"});function f(){const M=cn();u.textContent="";const B=s("span",{className:"lu-char-design-media"});M?(B.classList.add("lu-has-thumb"),B.style.backgroundImage=`url('${M}')`):B.textContent="🎨";const E=s("span",{className:"lu-char-design-txt"},[s("b",{text:"캐릭터 디자인"}),s("span",{text:M?"내 아야모 편집하기":"나만의 아야모 만들기 (선택)"})]);u.append(B,E,s("span",{className:"lu-char-design-arrow",text:"›"}))}f(),u.addEventListener("click",()=>Go());const v=s("button",{id:"lu-enter-btn",type:"button",text:"입장하기"}),g=s("div",{id:"lu-picker"}),p=s("div",{className:"lu-lobby-divider"}),P=s("a",{className:"lu-studio-link",href:"./studio.html",target:"_blank",rel:"noopener noreferrer",text:"작가 스튜디오에서 나만의 전시 만들기 →"}),z=s("div",{className:"lu-lobby-form"},[m,b,h,x,u,v,d,o]),G=s("div",{className:"lu-quick-enter"});function I(){G.textContent="";const M=Nt(),B=cn(),E=s("span",{className:"lu-quick-avatar"});B?E.style.backgroundImage=`url('${B}')`:E.textContent="🙂";const y=s("div",{className:"lu-quick-greet"},[s("b",{text:(M?`${M.name}님, `:"")+"다시 오셨어요"}),s("span",{text:"저장한 모습으로 바로 입장할 수 있어요"})]),L=s("button",{className:"lu-quick-btn",type:"button",text:"바로 입장"});L.addEventListener("click",C);const Y=s("button",{className:"lu-quick-change",type:"button",text:"닉네임·캐릭터 바꾸기"});Y.addEventListener("click",()=>{z.classList.remove("lu-collapsed"),G.style.display="none";try{b.focus()}catch{}}),G.append(E,y,L,Y)}!!(Nt()||na())?(I(),z.classList.add("lu-collapsed")):G.style.display="none";const S=s("div",{className:"lu-lobby-card"},[t,e,n,G,z,g,p,P]),k=s("div",{id:"lu-lobby",className:"lu"},[S]);document.body.appendChild(k),c(Nt()),Jn(c);function C(){let M=b.value.trim().slice(0,_e);M||(M="게스트");let B=0;for(let y=0;y<M.length;y++)B=B*31+M.charCodeAt(y)>>>0;pn=wo[B%wo.length];const E=vo(Object.assign({},He,aa()||{}));typeof at.onEnter=="function"&&at.onEnter({nickname:M,color:pn,char:E})}v.addEventListener("click",C),b.addEventListener("keydown",M=>{M.stopPropagation(),M.key==="Enter"&&C()}),b.addEventListener("keyup",M=>M.stopPropagation());function A(){f()}return{overlay:k,nickInput:b,pickerBox:g,onChibiSaved:A}}function _i(){const t=$t?[["왼쪽 드래그","이동"],["오른쪽 드래그","시점 회전"],["캐릭터 탭","콕 찌르기"],["작품 카드","탭하여 크게 보기"]]:[["마우스 드래그","시점 회전"],["W A S D","이동"],["Shift","달리기"],["Enter","채팅"],["M","작품 목록"],["T","투어"],["G","방명록"],["V","내 모습 보기"],["C","캐릭터 디자인"],["P","사진 촬영"],["클릭","캐릭터 콕 찌르기"]],e=s("div",{id:"lu-controls",className:"lu lu-hud"});if(e.appendChild(s("div",{className:"lu-controls-title",text:"CONTROLS"})),t.forEach(([n,o])=>{const a=s("div",{},[s("span",{className:"lu-key",text:n}),s("span",{text:o})]);e.appendChild(a)}),document.body.appendChild(e),$t){e.classList.add("lu-collapsed");const n=s("button",{id:"lu-controls-toggle",className:"lu lu-hud",type:"button","aria-label":"조작법 보기",text:"?"});n.addEventListener("click",()=>{e.classList.toggle("lu-collapsed")}),document.body.appendChild(n)}return e}function Ni(){if(!$t)return null;function t(){const p=w&&w.chat&&w.chat.wrap;if(!p)return;const P=p.classList.toggle("lu-chat-collapsed");!P&&w.chat.input?w.chat.input.focus():w.chat.input&&w.chat.input.blur(),r.classList.toggle("lu-on",!P)}const e={chat:'<path d="M20 15a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',tour:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z"/>',capture:'<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',more:'<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',list:'<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',self:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',help:'<path d="M9.2 9a2.9 2.9 0 1 1 4.2 2.6c-.9.45-1.4 1.05-1.4 2.1"/><circle cx="12" cy="17.4" r="1" fill="currentColor" stroke="none"/>',dress:'<path d="M9 4l3 3 3-3M9 4l-1.5 5 4.5 3 4.5-3L18 4M7.5 9l-2 8h13l-2-8"/>'};function n(p){const P=document.createElement("span");return P.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+e[p]+"</svg>",P.firstChild}function o(p,P,z,G){const I=s("button",{className:p,type:"button","aria-label":P});I.appendChild(n(z)),I.appendChild(s("span",{className:"lu-dock-label",text:G}));const X=s("div",{className:"lu-dock-wrap"},[I]);return{b:I,wrap:X}}const a=o("lu-dock-btn","채팅 열기/닫기","chat","채팅"),r=a.b;a.wrap.style.display="none",r.addEventListener("click",t);const i=o("lu-dock-btn","투어 시작/종료","tour","투어"),l=i.b;l.addEventListener("click",()=>{typeof xt.onTour=="function"&&xt.onTour()});const c=o("lu-dock-btn lu-gold","사진 촬영","capture","캡처"),d=c.b;d.addEventListener("click",()=>{d.classList.remove("lu-cap-pop"),d.offsetWidth,d.classList.add("lu-cap-pop"),typeof xt.onCapture=="function"&&xt.onCapture()});const m=o("lu-dock-btn","더보기","more","메뉴"),b=m.b,h=s("div",{id:"lu-more-backdrop"}),x=s("div",{id:"lu-more-sheet"});function u(){x.classList.remove("lu-open"),h.classList.remove("lu-open")}function f(p,P,z){const G=s("button",{className:"lu-sheet-btn",type:"button"});return G.appendChild(n(p)),G.appendChild(s("span",{text:P})),G.addEventListener("click",()=>{u(),z()}),G}const v=s("div",{className:"lu-sheet-grid"},[f("list","작품 목록",()=>pa()),f("self","내 모습",()=>{typeof xt.onSelfView=="function"&&xt.onSelfView()}),f("dress","캐릭터 디자인",()=>Go()),f("chat","채팅",t),f("help","조작법",()=>{const p=document.getElementById("lu-controls");p&&p.classList.toggle("lu-collapsed")})]);x.append(s("div",{className:"lu-sheet-handle"}),v),h.addEventListener("click",u),b.addEventListener("click",()=>{const p=x.classList.toggle("lu-open");h.classList.toggle("lu-open",p)}),document.body.appendChild(h),document.body.appendChild(x);const g=s("div",{id:"lu-dock",className:"lu lu-hud"},[a.wrap,i.wrap,c.wrap,m.wrap]);return document.body.appendChild(g),Xt={chatBtn:r,chatWrap:a.wrap,tourBtn:l,selfBtn:null,dock:g},g}let Xt=null;function hn(t,e){Xt&&t==="tour"&&Xt.tourBtn&&Xt.tourBtn.classList.toggle("lu-on",!!e)}function Ai(){const t=s("span",{text:"--"}),e=s("div",{className:"lu-stat"});e.append("FPS ");const n=s("b");n.appendChild(t),e.appendChild(n);const o=s("div",{id:"lu-topright",className:"lu lu-hud"},[e]);return document.body.appendChild(o),{wrap:o,fps:t,count:s("span"),countWrap:null}}function Ii(){const t=s("div",{id:"lu-status",className:"lu lu-hud"});return document.body.appendChild(t),t}function Ri(){const t=s("div",{id:"lu-chat-log"}),e=s("input",{id:"lu-chat-input",type:"text",maxlength:"120",placeholder:$t?"탭하여 채팅…":"Enter 키로 채팅…",autocomplete:"off",spellcheck:"false"}),n=s("div",{id:"lu-chat",className:"lu lu-hud"},[t,e]);return $t&&n.classList.add("lu-chat-collapsed"),document.body.appendChild(n),e.addEventListener("keydown",o=>{if(o.stopPropagation(),o.key==="Enter"){const a=e.value.trim();e.value="",e.blur(),a&&typeof at.onChatSend=="function"&&at.onChatSend(a)}else o.key==="Escape"&&(e.value="",e.blur())}),e.addEventListener("keyup",o=>o.stopPropagation()),e.addEventListener("keypress",o=>o.stopPropagation()),{wrap:n,log:t,input:e}}function Pi(){const t=s("div",{className:"lu-art-eyebrow",text:"ARTWORK"}),e=s("div",{className:"lu-art-title"}),n=s("div",{className:"lu-art-meta"}),o=s("div",{className:"lu-art-rule"}),a=s("div",{className:"lu-art-desc"}),r=s("button",{className:"lu-art-hint",type:"button"});$t?r.appendChild(document.createTextNode("크게 보기")):(r.appendChild(s("span",{className:"lu-key",text:"E"})),r.appendChild(document.createTextNode(" — 크게 보기"))),r.addEventListener("click",l=>{l.stopPropagation(),typeof xt.onViewArtwork=="function"&&xt.onViewArtwork()});const i=s("div",{id:"lu-artwork",className:"lu"},[t,e,n,o,a,r]);return $t&&i.addEventListener("click",()=>{typeof xt.onViewArtwork=="function"&&xt.onViewArtwork()}),document.body.appendChild(i),{panel:i,title:e,meta:n,desc:a}}function Oi(){const t=s("span",{className:"lu-topbar-title"}),e=s("b",{text:"1"}),n=s("span",{className:"lu-topbar-count"});n.appendChild(e),n.append(" 명");const o=s("div",{id:"lu-topbar",className:"lu lu-hud lu-cut-s lu-empty"},[t,s("span",{className:"lu-topbar-sep"}),n]);return document.body.appendChild(o),o._count=e,o._countWrap=n,o}function Bi(){const t=s("button",{id:"lu-lightbox-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{className:"lu-lightbox-stage"}),n=s("div",{className:"lu-lightbox-title"}),o=s("div",{className:"lu-lightbox-meta"}),a=s("div",{className:"lu-lightbox-rule"}),r=s("div",{className:"lu-lightbox-desc"}),i=s("div",{className:"lu-lightbox-caption"},[n,o,a,r]),l=s("div",{id:"lu-lightbox",className:"lu"},[t,e,i]);document.body.appendChild(l),t.addEventListener("click",()=>Xe()),l.addEventListener("click",I=>{(I.target===l||I.target===e)&&Xe()});const c=new Map;let d=1,m=0,b=0,h=0,x=1,u=0,f=0,v=0,g=null;function p(){return e.querySelector(".lu-lightbox-media")}function P(){const I=p();I&&(I.style.transform=`translate(${m}px, ${b}px) scale(${d})`)}function z(){d=1,m=0,b=0,P()}l.addEventListener("pointerdown",I=>{if(c.set(I.pointerId,{x:I.clientX,y:I.clientY}),c.size===1&&(g={x:I.clientX,y:I.clientY,t:performance.now()}),c.size===2){const[X,S]=[...c.values()];h=Math.hypot(X.x-S.x,X.y-S.y),x=d}}),l.addEventListener("pointermove",I=>{const X=c.get(I.pointerId);if(!X)return;const S=I.clientX-X.x,k=I.clientY-X.y;if(X.x=I.clientX,X.y=I.clientY,c.size===2&&h>0){const[C,A]=[...c.values()];d=Math.min(4,Math.max(1,x*(Math.hypot(C.x-A.x,C.y-A.y)/h))),d===1&&(m=0,b=0),P()}else c.size===1&&d>1&&(m+=S,b+=k,P())});function G(I){if(c.delete(I.pointerId),c.size!==0||!g)return;const X=performance.now()-g.t,S=I.clientX-g.x,k=I.clientY-g.y;if(g=null,d===1&&X<600){if(Math.abs(S)>64&&Math.abs(k)<56){Di(S<0?1:-1);return}if(k>84&&Math.abs(S)<60){Xe();return}}if(Math.abs(S)<12&&Math.abs(k)<12&&X<350){const C=performance.now();if(C-u<320&&Math.hypot(I.clientX-f,I.clientY-v)<44){d>1?z():(d=2.4,P()),u=0;return}u=C,f=I.clientX,v=I.clientY}}return l.addEventListener("pointerup",G),l.addEventListener("pointercancel",I=>c.delete(I.pointerId)),{overlay:l,closeBtn:t,stage:e,title:n,meta:o,rule:a,desc:r,resetZoom:z}}let To=null;function Di(t){const e=je();if(!To||e.length<2)return;const n=e.indexOf(To),o=e[((n===-1?0:n)+t+e.length)%e.length];ua(o)}const gn="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#eaeae6"/></svg>');function ra(t){const e=w.artworkList.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(s("div",{className:"lu-artlist-empty",text:"표시할 작품이 없습니다"}));return}t.forEach(n=>{const o=s("img",{className:"lu-artlist-thumb",src:n.imageUrl||gn,alt:n.title||"",loading:"lazy"});o.addEventListener("error",()=>{o.src=gn},{once:!0});const a=s("div",{className:"lu-artlist-info"},[s("div",{className:"lu-artlist-name",text:n.title||""}),s("div",{className:"lu-artlist-artist",text:n.artist||""})]),r=s("button",{type:"button",className:"lu-artlist-card"},[o,a]);r.addEventListener("click",()=>{me(),typeof Eo=="function"&&Eo(n)}),e.appendChild(r)})}function Gi(){const t=s("button",{id:"lu-artlist-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{id:"lu-artlist-head"},[s("div",{id:"lu-artlist-title",text:"작품 목록"}),t]),n=s("div",{id:"lu-artlist-body"}),o=s("div",{id:"lu-artlist",className:"lu"},[e,n]);return document.body.appendChild(o),t.addEventListener("click",()=>me()),{panel:o,body:n}}function Hi(t){const e=Date.now(),n=Math.max(0,e-t),o=Math.floor(n/6e4);if(o<1)return"방금 전";if(o<60)return`${o}분 전`;const a=Math.floor(o/60);if(a<24)return`${a}시간 전`;const r=new Date(t),i=new Date(e),l=h=>new Date(h.getFullYear(),h.getMonth(),h.getDate()).getTime();if(Math.round((l(i)-l(r))/864e5)<=1)return"어제";const d=r.getFullYear(),m=String(r.getMonth()+1).padStart(2,"0"),b=String(r.getDate()).padStart(2,"0");return`${d}.${m}.${b}`}function ia(t){const e=w.guestbook.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(s("div",{className:"lu-gbook-empty",text:"첫 방명록을 남겨보세요"}));return}const n=["#e07a5f","#81b29a","#5f9e7d","#8e7dbe","#6a8caf","#d68fb8"];t.forEach(o=>{const a=o.name||"게스트";let r=0;for(let d=0;d<a.length;d++)r=r*31+a.charCodeAt(d)>>>0;const i=s("span",{className:"lu-gbook-dot"});i.style.background=n[r%n.length];const l=s("div",{},[i,s("span",{className:"lu-gbook-name",text:a}),s("span",{className:"lu-gbook-time",text:Hi(o.ts)})]),c=s("div",{className:"lu-gbook-text",text:o.text||""});e.appendChild(s("div",{className:"lu-gbook-note"},[l,c]))})}function Xi(){const t=s("button",{id:"lu-guestbook-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{id:"lu-guestbook-head"},[s("div",{id:"lu-guestbook-title"},[s("span",{className:"lu-gb-eyebrow",text:"GUESTBOOK"}),s("span",{className:"lu-gb-main",text:"방명록"}),s("span",{className:"lu-gb-sub",text:"다녀간 마음을 한 줄 남겨 주세요"})]),t]),n=s("div",{id:"lu-guestbook-body"}),o=s("textarea",{id:"lu-gbook-input",rows:"3",maxlength:String(Ne),placeholder:"전시에 한 줄 메모를 남겨보세요…",spellcheck:"false"}),a=s("span",{className:"lu-gbook-count",text:`0/${Ne}`}),r=s("button",{id:"lu-gbook-submit",type:"button",text:"남기기"});r.disabled=!0;const i=s("div",{className:"lu-gbook-footer-row"},[a,r]),l=s("div",{id:"lu-gbook-stats",style:"font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.45);padding:6px 2px 0;"}),c=s("div",{id:"lu-guestbook-footer"},[o,i,l]),d=s("button",{id:"lu-gbtab",type:"button","aria-label":"방명록 열기/닫기 (위아래로 드래그해 위치 이동)",title:"드래그해서 위치를 옮길 수 있어요",text:"방명록"}),m="lu-gbtab-top-v1";try{const g=parseFloat(localStorage.getItem(m));Number.isFinite(g)&&(d.style.top=b(g)+"px")}catch{}function b(g){const p=Math.max(80,(window.innerHeight||800)-140);return Math.min(p,Math.max(60,g))}let h=null;d.addEventListener("pointerdown",g=>{const p=d.getBoundingClientRect();h={startY:g.clientY,startTop:p.top,moved:!1},d.setPointerCapture(g.pointerId)}),d.addEventListener("pointermove",g=>{if(!h)return;const p=g.clientY-h.startY;Math.abs(p)>6&&(h.moved=!0),h.moved&&(d.style.top=b(h.startTop+p)+"px")});const x=()=>{if(h&&h.moved)try{localStorage.setItem(m,String(parseFloat(d.style.top)))}catch{}setTimeout(()=>{h=null},0)};d.addEventListener("pointerup",x),d.addEventListener("pointercancel",x),d.addEventListener("click",()=>{h&&h.moved||zo()});const u=s("div",{id:"lu-guestbook",className:"lu"},[e,n,c,d]);document.body.appendChild(u),t.addEventListener("click",()=>Ho());function f(){const g=o.value.length;a.textContent=`${g}/${Ne}`,r.disabled=o.value.trim().length===0}function v(){const g=o.value.trim().slice(0,Ne);g&&(o.value="",f(),o.blur(),typeof Mo=="function"&&Mo(g))}return o.addEventListener("keydown",g=>{g.stopPropagation(),g.key==="Escape"?(o.value="",f(),o.blur()):g.key==="Enter"&&(g.ctrlKey||g.metaKey)&&(g.preventDefault(),v())}),o.addEventListener("keyup",g=>g.stopPropagation()),o.addEventListener("keypress",g=>g.stopPropagation()),o.addEventListener("input",f),r.addEventListener("click",v),{panel:u,body:n,input:o,count:a,submitBtn:r,tab:d}}function Fi(){const t=s("button",{type:"button","aria-label":"이전 작품",text:"◀ 이전"}),e=s("span",{className:"lu-tour-sep"}),n=s("span",{className:"lu-tour-count"}),o=s("span",{className:"lu-tour-title"}),a=s("span",{className:"lu-tour-sep"}),r=s("button",{type:"button","aria-label":"다음 작품",text:"다음 ▶"}),i=s("span",{className:"lu-tour-sep"}),l=s("button",{type:"button",className:"lu-tour-auto"}),c=s("span",{className:"lu-tour-sep"}),d=s("button",{id:"lu-tourbar-exit",type:"button","aria-label":"투어 종료",text:"✕ 종료"}),m=s("div",{id:"lu-tourbar",className:"lu"},[t,e,n,o,a,r,i,l,c,d]);return document.body.appendChild(m),t.addEventListener("click",()=>{St.onPrev&&St.onPrev()}),r.addEventListener("click",()=>{St.onNext&&St.onNext()}),d.addEventListener("click",()=>{St.onExit&&St.onExit()}),l.addEventListener("click",()=>{St.onToggleAuto&&St.onToggleAuto()}),{bar:m,prevBtn:t,nextBtn:r,autoBtn:l,exitBtn:d,countEl:n,titleEl:o}}function Yi(){const t=s("div",{id:"lu-shutter",className:"lu"});return document.body.appendChild(t),t}function Ui(){const t=s("button",{id:"lu-share-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{className:"lu-share-title",text:"전시 공유하기"}),n=s("img",{className:"lu-share-preview",alt:"캡처한 전시 화면"}),o=s("button",{className:"lu-share-btn lu-share-btn-primary",type:"button",text:"기기로 공유"}),a=s("button",{className:"lu-share-btn",type:"button",text:"이미지 저장"}),r=s("button",{className:"lu-share-btn",type:"button",text:"X에 공유"}),i=s("button",{className:"lu-share-btn",type:"button",text:"Threads에 공유"}),l=s("button",{className:"lu-share-btn",type:"button",text:"링크 복사"}),c=s("div",{className:"lu-share-actions"},[o,a,r,i,l]),d=s("div",{className:"lu-share-hint",text:"인스타그램은 이미지를 저장하거나 기기로 공유한 뒤 앱에서 올려주세요"}),m=s("div",{className:"lu-share-card"},[t,e,n,c,d]),b=s("div",{id:"lu-share",className:"lu"},[m]);return document.body.appendChild(b),t.addEventListener("click",()=>Lo()),b.addEventListener("click",h=>{h.target===b&&Lo()}),o.addEventListener("click",async()=>{if(!(!dt.blob||typeof navigator>"u"||typeof navigator.share!="function"))try{const h=new File([dt.blob],"artshow.png",{type:"image/png"});await navigator.share({files:[h],title:dt.galleryName||"OpenArtShow",text:`${dt.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`})}catch{}}),a.addEventListener("click",()=>{if(!dt.dataUrl)return;const h=document.createElement("a");h.href=dt.dataUrl,h.download="artshow.png",document.body.appendChild(h),h.click(),document.body.removeChild(h)}),r.addEventListener("click",()=>{const h=`${dt.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`,x=`https://twitter.com/intent/tweet?text=${encodeURIComponent(h)}&url=${encodeURIComponent(dt.shareUrl||"")}`;window.open(x,"_blank","noopener")}),i.addEventListener("click",()=>{const h=`${dt.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시 ${dt.shareUrl||""}`,x=`https://www.threads.net/intent/post?text=${encodeURIComponent(h)}`;window.open(x,"_blank","noopener")}),l.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(dt.shareUrl||""),Ht&&clearTimeout(Ht),l.textContent="복사됨",l.classList.add("lu-share-btn-copied"),Ht=setTimeout(()=>{l.textContent="링크 복사",l.classList.remove("lu-share-btn-copied"),Ht=null},1600)}catch{}}),{overlay:b,card:m,title:e,preview:n,deviceBtn:o,saveBtn:a,xBtn:r,threadsBtn:i,copyBtn:l}}function Go(){!w||!w.chibiMaker||Qt.chibiOpen||Yt||Wt||jt||Ut||w.chibiMaker.open()}function ji(){w&&w.chibiMaker&&w.chibiMaker.close()}function $i(){window.addEventListener("keydown",t=>{if(t.key==="Escape"){if(Qt.chibiOpen){t.preventDefault(),t.stopImmediatePropagation(),ji();return}if(Wt){t.preventDefault(),t.stopImmediatePropagation(),Lo();return}if(Yt){t.preventDefault(),t.stopImmediatePropagation(),Xe();return}if(Ut){t.preventDefault(),t.stopImmediatePropagation(),me();return}if(jt){t.preventDefault(),t.stopImmediatePropagation(),Ho();return}return}if(Yt||Wt||!Qt.entered)return;const e=document.activeElement;e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA")||(t.key==="Enter"?(t.preventDefault(),t.stopPropagation(),w.chat.input.focus()):(t.key==="c"||t.key==="C"||t.key==="ㅊ")&&!Qt.chibiOpen&&(t.preventDefault(),t.stopPropagation(),Go()))})}function Wi({onEnter:t,onChatSend:e,onAvatarChange:n,onMakerToggle:o}={}){if(fn){at.onEnter=t||at.onEnter,at.onChatSend=e||at.onChatSend,at.onAvatarChange=n||at.onAvatarChange,at.onMakerToggle=o||at.onMakerToggle;return}fn=!0,at.onEnter=t||null,at.onChatSend=e||null,at.onAvatarChange=n||null,at.onMakerToggle=o||null,pi(),w={loading:Li(),lobby:zi(),controls:_i(),topRight:Ai(),status:Ii(),chat:Ri(),artwork:Pi(),galleryTitle:Oi(),lightbox:Bi(),artworkList:Gi(),guestbook:Xi(),tourBar:Fi(),dock:Ni(),shutter:Yi(),share:Ui()},w.chibiMaker=Mi({els:w,state:Qt,callbacks:at,setStatus:ot}),w.topRight.count=w.galleryTitle._count,w.topRight.countWrap=w.galleryTitle._countWrap,$i(),Ke!==null&&la(Ke),At&&ca(At.galleries,At.currentId,At.onPick),Ze&&ra(Ze),Ve&&ia(Ve)}function bn(t){w&&w.loading.classList.toggle("lu-hidden",!t)}function Vi(){if(!w)return;Qt.entered=!0,w.lobby.overlay.classList.add("lu-hidden"),w.controls.classList.add("lu-visible"),w.topRight.wrap.classList.add("lu-visible"),w.status.classList.add("lu-visible"),w.chat.wrap.classList.add("lu-visible"),w.galleryTitle.classList.add("lu-visible"),w.guestbook.tab.classList.add("lu-visible"),w.dock&&w.dock.classList.add("lu-visible");const t=document.getElementById("lu-controls-toggle");t&&t.classList.add("lu-visible")}function Ki(t){!w||!t||So===t.id&&w.artwork.panel.classList.contains("lu-open")||(So=t.id,w.artwork.title.textContent=t.title||"",w.artwork.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),w.artwork.desc.textContent=t.desc||"",w.artwork.panel.classList.add("lu-open"))}function Zi(){w&&(So=null,w.artwork.panel.classList.remove("lu-open"))}function sa(t,e,n){if(!w)return;const o=s("div",{className:"lu-chat-msg"+(n?" lu-self":"")},[s("span",{className:"lu-chat-name",text:t}),s("span",{text:e})]);for(w.chat.log.appendChild(o);w.chat.log.children.length>Ti;)w.chat.log.removeChild(w.chat.log.firstChild)}function qi(t){if(!w)return;const e=w.topRight.count.textContent;w.topRight.count.textContent=String(t),e!==String(t)&&w.topRight.countWrap&&(w.topRight.countWrap.classList.remove("lu-tick"),w.topRight.countWrap.offsetWidth,w.topRight.countWrap.classList.add("lu-tick")),Xt&&Xt.chatWrap&&(Xt.chatWrap.style.display=t>=2?"":"none")}function ot(t){w&&(w.status.textContent=t||"")}function Ji(t){w&&(w.topRight.fps.textContent=String(Math.round(t)))}function la(t){w.galleryTitle.querySelector(".lu-topbar-title").textContent=t||"",w.galleryTitle.classList.toggle("lu-empty",!t)}function Qi(t){Ke=t||"",w&&la(Ke)}function ca(t,e,n){const o=w.lobby.pickerBox;if(o.innerHTML="",!Array.isArray(t)||t.length===0)return;const a=s("div",{className:"lu-field-label",text:"전시 선택",style:"margin-top:26px;"});o.appendChild(a),e==null&&o.appendChild(s("div",{className:"lu-picker-note",text:"공유된 전시 관람 중"}));const r=s("div",{className:"lu-picker-list"});t.forEach(i=>{const l=i.id===e,c=s("button",{type:"button",className:"lu-picker-item"+(l?" lu-picker-current":"")},[s("div",{className:"lu-picker-name",text:i.name||i.id}),s("div",{className:"lu-picker-meta",text:[i.artist,typeof i.count=="number"?`${i.count}점`:null].filter(Boolean).join(" · ")})]);l&&(c.disabled=!0),c.addEventListener("click",()=>{l||typeof n=="function"&&n(i.id)}),r.appendChild(c)}),o.appendChild(r)}function ts(t,e,n){At={galleries:t,currentId:e??null,onPick:n},w&&ca(At.galleries,At.currentId,At.onPick)}function da(){const t=w.lightbox.stage,e=t.firstChild;e&&e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),t.innerHTML=""}function ua(t){if(!w||!t)return;To=t,w.lightbox.resetZoom&&w.lightbox.resetZoom(),Gt&&(clearTimeout(Gt),Gt=null),da();let e;t.videoUrl?(e=s("video",{className:"lu-lightbox-media",src:t.videoUrl,controls:"controls",autoplay:"autoplay",loop:"loop",muted:"muted",playsinline:"playsinline"}),e.muted=!0):e=s("img",{className:"lu-lightbox-media",src:t.imageUrl||"",alt:t.title||""}),w.lightbox.stage.appendChild(e),w.lightbox.title.textContent=t.title||"",w.lightbox.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),w.lightbox.desc.textContent=t.desc||"",Yt=!0,w.lightbox.overlay.classList.add("lu-open")}function Xe(){!w||!Yt||(Yt=!1,w.lightbox.overlay.classList.remove("lu-open"),Gt&&clearTimeout(Gt),Gt=setTimeout(()=>{da(),Gt=null},340),typeof Co=="function"&&Co())}function pe(){return Yt}function es(t){Co=typeof t=="function"?t:null}function os(t,e){Eo=typeof e=="function"?e:null,Ze=t,w&&ra(Ze)}function pa(){w&&(Ut?me():(Ut=!0,w.artworkList.panel.classList.add("lu-open")))}function me(){!w||!Ut||(Ut=!1,w.artworkList.panel.classList.remove("lu-open"))}function mn(){return Ut}function ns({index:t,total:e,title:n,autoOn:o}={}){if(!w)return;const a=w.tourBar,r=Number.isFinite(t)?t+1:1,i=Number.isFinite(e)?e:0;a.countEl.textContent=`● ${r} / ${i}`,a.titleEl.textContent=` — ${n||""}`,a.autoBtn.textContent=o?"자동진행 ON":"자동진행 OFF",a.autoBtn.classList.toggle("lu-tour-on",!!o),a.bar.classList.add("lu-open")}function as(){w&&w.tourBar.bar.classList.remove("lu-open")}function rs({onTour:t,onViewArtwork:e,onGuestbook:n,onCapture:o,onSelfView:a}={}){xt={onTour:typeof t=="function"?t:null,onViewArtwork:typeof e=="function"?e:null,onGuestbook:typeof n=="function"?n:null,onCapture:typeof o=="function"?o:null,onSelfView:typeof a=="function"?a:null}}function is({blob:t,dataUrl:e,galleryName:n,shareUrl:o}={}){if(!w)return;dt={blob:t||null,dataUrl:e||"",galleryName:n||"",shareUrl:o||(typeof window<"u"?window.location.href:"")},w.share.preview.src=dt.dataUrl;let a=!1;if(dt.blob&&typeof navigator<"u"&&typeof navigator.share=="function"&&typeof navigator.canShare=="function")try{const r=new File([dt.blob],"artshow.png",{type:"image/png"});a=navigator.canShare({files:[r]})}catch{a=!1}w.share.deviceBtn.style.display=a?"":"none",Ht&&(clearTimeout(Ht),Ht=null),w.share.copyBtn.textContent="링크 복사",w.share.copyBtn.classList.remove("lu-share-btn-copied"),Wt=!0,w.share.overlay.classList.add("lu-open")}function Lo(){!w||!Wt||(Wt=!1,w.share.overlay.classList.remove("lu-open"))}function lo(){return Wt}function xn(){if(!w)return;const t=w.shutter;t.style.transition="none",t.style.opacity="1",t.offsetWidth,t.style.transition="opacity 0.25s ease",t.style.opacity="0"}function ss({onPrev:t,onNext:e,onExit:n,onToggleAuto:o}={}){St={onPrev:typeof t=="function"?t:null,onNext:typeof e=="function"?e:null,onExit:typeof n=="function"?n:null,onToggleAuto:typeof o=="function"?o:null}}function ls(t){const e=document.getElementById("lu-gbook-stats");e&&(e.textContent=t||"")}function cs({onSubmit:t}={}){Mo=typeof t=="function"?t:null}function zo(){w&&(jt?Ho():(jt=!0,w.guestbook.panel.classList.add("lu-open")))}function Ho(){!w||!jt||(jt=!1,w.guestbook.panel.classList.remove("lu-open"))}function ds(){return jt}function Xo(t){Ve=Array.isArray(t)?t:[],w&&ia(Ve)}function us(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}function ps(t,e,n){let o=(e-t)%(Math.PI*2);return o>Math.PI&&(o-=Math.PI*2),o<-Math.PI&&(o+=Math.PI*2),t+o*n}function fs(t){if(t!=="auto")return t;const e=new Date().getHours();return e>=6&&e<16?"daylight":e>=16&&e<19?"sunset":"night"}function hs(t){let e=5381;for(let n=0;n<t.length;n++)e=(e<<5)+e+t.charCodeAt(n)>>>0;return e.toString(36)}const gs=24,bs=45,ms=3,_o="lu-spec-v2",fa=4;function No(){try{const t=localStorage.getItem(_o);if(t){const e=JSON.parse(t);return e&&e.gen===fa&&(e.v==="low"||e.v==="high")?e.v:null}return null}catch{return null}}function co(t){try{t?localStorage.setItem(_o,JSON.stringify({v:t,gen:fa})):localStorage.removeItem(_o),localStorage.removeItem("lu-spec-v1"),localStorage.removeItem("lu-lowspec-v1")}catch{}}const Fe={low:83e5,base:11e6,high:18e6},xs=/swiftshader|llvmpipe|softpipe|software (?:rasterizer|renderer|adapter)|microsoft basic render|\bwarp\b|gdi generic|mesa offscreen|apple software renderer/i;function ws(){const t={name:"",soft:!1};try{const e=document.createElement("canvas"),o=!(e.getContext("webgl2",{failIfMajorPerformanceCaveat:!0})||e.getContext("webgl",{failIfMajorPerformanceCaveat:!0})),a=document.createElement("canvas"),r=a.getContext("webgl2")||a.getContext("webgl");if(!r)return{name:"",soft:!0};const i=r.getExtension("WEBGL_debug_renderer_info");t.name=String(i&&r.getParameter(i.UNMASKED_RENDERER_WEBGL)||r.getParameter(r.RENDERER)||""),t.soft=xs.test(t.name)||o;const l=r.getExtension("WEBGL_lose_context");l&&l.loseContext()}catch{}return t}function ys(t){function e(a){if(a.code==="KeyE"){t.viewCurrentArtwork();return}if(a.code==="KeyM"){if(!t.isEntered()||t.isLightboxOpen())return;t.toggleArtworkList();return}if(a.code==="KeyT"){if(!t.isEntered())return;t.toggleTour();return}if(a.code==="KeyG"){if(!t.isEntered()||t.isLightboxOpen())return;t.toggleGuestbook();return}if(a.code==="KeyP"){if(!t.isEntered()||t.isShareModalOpen())return;t.flashShutter(),t.capturePhoto();return}if(a.code==="KeyV"){if(!t.isEntered()||t.isShareModalOpen())return;t.toggleSelfView();return}if(t.isTouring()&&(a.code==="ArrowLeft"||a.code==="ArrowRight")){if(t.isLightboxOpen())return;a.preventDefault(),a.code==="ArrowLeft"?t.tourPrev():t.tourNext();return}a.code==="Escape"&&t.isTouring()&&!t.isLightboxOpen()&&!t.isArtworkListOpen()&&!t.isGuestbookOpen()&&t.exitTour()}function n(){const a=t.getCamera(),r=t.getRenderer();a.aspect=window.innerWidth/window.innerHeight,a.updateProjectionMatrix(),r.setSize(window.innerWidth,window.innerHeight)}function o(){const a=t.getMp();if(a)try{a.dispose()}catch{}}return{onKeyDown:e,onWindowResize:n,onBeforeUnload:o}}function vs(t){const e=t.split(",")[1],n=atob(e),o=new Uint8Array(n.length);for(let a=0;a<n.length;a++)o[a]=n.charCodeAt(a);return new Blob([o],{type:"image/png"})}function ks(t,e,n,o){const a=Math.max(90,Math.round(n*.14)),r=t.createLinearGradient(0,n-a,0,n);r.addColorStop(0,"rgba(0,0,0,0)"),r.addColorStop(1,"rgba(0,0,0,0.55)"),t.fillStyle=r,t.fillRect(0,n-a,e,a);const i=Math.max(20,Math.round(e*.025)),l=Math.max(1,e/1400);t.textBaseline="alphabetic",t.textAlign="left",t.fillStyle="rgba(255,255,255,0.95)",t.font=`300 ${Math.round(18*l)}px ${de()}`,t.fillText(o||"OpenArtShow 전시",i,n-i-6*l),t.fillStyle="#5f9e7d",t.font=`300 ${Math.round(16*l)}px ${de()}`,Ss(t,"OpenArtShow",e-i,n-i-22*l,2.5*l),t.textAlign="right",t.fillStyle="rgba(255,255,255,0.6)",t.font=`300 ${Math.round(12*l)}px ${de()}`,t.fillText("syhongart.github.io/openartshow",e-i,n-i-4*l)}function Ss(t,e,n,o,a){const r=Array.from(e),i=r.map(m=>t.measureText(m).width),l=i.reduce((m,b)=>m+b,0)+a*(r.length-1),c=t.textAlign;t.textAlign="left";let d=n-l;r.forEach((m,b)=>{t.fillText(m,d,o),d+=i[b]+a}),t.textAlign=c}function Cs(){const t=window.location.href;return t.length<2e3?t:window.location.origin+window.location.pathname.replace(/index\.html$/,"landing.html")}function Es(t){const{getRenderer:e,getScene:n,getCamera:o,isThirdPerson:a,getSelfAvatar:r,applySelfCamOffset:i,restoreSelfCamOffset:l,getGalleryInfo:c,photoWall:d,getMyNickname:m,getMp:b,showShareModal:h,setStatus:x}=t;function u(){const f=e(),v=n(),g=o();if(!(!f||!v||!g))try{a()&&r()&&i(),f.render(v,g),a()&&r()&&l();const p=f.domElement.toDataURL("image/png"),P=new Image;P.onload=()=>{const z=document.createElement("canvas");z.width=P.width,z.height=P.height;const G=z.getContext("2d");if(!G)return;G.drawImage(P,0,0);const I=G.createRadialGradient(z.width/2,z.height*.46,Math.min(z.width,z.height)*.4,z.width/2,z.height*.46,Math.max(z.width,z.height)*.72);I.addColorStop(0,"rgba(8,6,4,0)"),I.addColorStop(.24,"rgba(8,6,4,0.03)"),I.addColorStop(.44,"rgba(8,6,4,0.09)"),I.addColorStop(.64,"rgba(8,6,4,0.17)"),I.addColorStop(.82,"rgba(8,6,4,0.26)"),I.addColorStop(1,"rgba(8,6,4,0.34)"),G.fillStyle=I,G.fillRect(0,0,z.width,z.height),ks(G,z.width,z.height,c()?c().name:"");const X=z.toDataURL("image/png");try{const k=Math.round(z.height/z.width*360),C=document.createElement("canvas");C.width=360,C.height=k,C.getContext("2d").drawImage(z,0,0,360,k);const A=C.toDataURL("image/jpeg",.72),M=d.addLocal(m(),c()?c().name:"",A);M&&b()&&b().sendPhoto(M)}catch(S){console.warn("포토월 썸네일 생성 실패 (캡처 자체는 정상):",S)}h({blob:vs(X),dataUrl:X,galleryName:c()&&c().name||"OpenArtShow 전시",shareUrl:Cs()})},P.onerror=()=>{x("사진 촬영에 실패했습니다.")},P.src=p}catch(p){console.error("사진 촬영 실패:",p),x("사진 촬영에 실패했습니다.")}}return{capturePhoto:u}}function Ms(t){const{getPlacedArtworks:e,getPlayer:n,isEntered:o,getTween:a,clearTween:r,startTween:i,getViewingPose:l,showTourBar:c,hideTourBar:d,setDockActive:m,isLightboxOpen:b,isArtworkListOpen:h,hideArtworkList:x}=t;let u=!1,f=0,v=!0,g=!1,p=0;const P=6;function z(y){c({index:f,total:e().length,title:y&&y.title||"",autoOn:v})}function G(y){const L=e()[y];if(!L)return;f=y,g=!1,p=0,z(L);const Y=l(L);i(Y,()=>{n().setPose(Y),g=!0,p=0})}function I(){if(!o()||b()||u)return;const y=e();!y||y.length===0||(h()&&x(),u=!0,m("tour",!0),v=!0,n().disable(),G(0))}function X(){if(!u)return;u=!1,m("tour",!1),g=!1,r(),d();const y=n(),L=y.getState();y.setPose({x:L.x,z:L.z,ry:L.ry}),o()&&!b()&&y.enable()}function S(){u?X():I()}function k(){const y=e();!u||y.length===0||G((f+1)%y.length)}function C(){const y=e();!u||y.length===0||G((f-1+y.length)%y.length)}function A(){u&&(v=!v,p=0,z(e()[f]))}function M(y){const L=e().indexOf(y);L!==-1&&(f=L),g=!1}function B(y){z(y),g=!0,p=0}function E(y){u&&g&&v&&!a()&&!b()&&(p+=y,p>=P&&k())}return{tick:E,startTour:I,exitTour:X,toggleTour:S,next:k,prev:C,toggleAuto:A,syncOnSelect:M,onArrive:B,isTouring:()=>u,getIndex:()=>f}}function Ts(t){const{getScene:e,getCamera:n,getPlayer:o,getSelfInfo:a,isEntered:r,createAvatarInstance:i,EYE_HEIGHT:l,setStatus:c,setDockActive:d}=t,m=3,b=.7,h=-.2;let x=!1,u=null,f=null,v=0;const g=new $o,p=new $o,P=new Ha;function z(){if(r())if(x=!x,x){const k=a();if(!u&&k)try{u=i(k.char,k.color," "),u.group.traverse(C=>{C.isSprite&&(C.visible=!1)}),e().add(u.group)}catch(C){console.warn("내 아바타 생성 실패:",C),u=null,x=!1;return}if(!u){x=!1;return}u.group.visible=!0,d("self",!0),f=null,v=0,c("내 모습 보기 — V키 또는 [시점] 버튼으로 복귀")}else u&&(u.group.visible=!1,d("self",!1))}function G(k){if(!u)return;const C=u.group,A=C.visible,M=C.position.clone(),B=C.rotation.y;try{const E=a(),y=i(k,E&&E.color||"#3498db"," ");y.group.traverse(L=>{L.isSprite&&(L.visible=!1)}),y.group.position.copy(M),y.group.rotation.y=B,y.group.visible=A,e().add(y.group),e().remove(C),u.dispose(),u=y}catch(E){console.warn("내 아바타 갱신 실패:",E)}}function I(){const k=n();g.copy(k.position),P.copy(k.quaternion),p.set(0,0,1).applyQuaternion(k.quaternion),k.position.addScaledVector(p,m),k.position.y+=b,k.rotateX(h)}function X(){const k=n();k.position.copy(g),k.quaternion.copy(P)}function S(k){if(x&&u){const C=o().getState();u.group.position.set(C.x,C.y-l,C.z),u.group.rotation.y=C.ry,f||(f={x:C.x,z:C.z});const A=k>0?Math.hypot(C.x-f.x,C.z-f.z)/k:0;v+=(A-v)*Math.min(1,10*k),f.x=C.x,f.z=C.z,u.update(k,v)}}return{tick:S,toggle:z,rebuildAvatar:G,applySelfCamOffset:I,restoreSelfCamOffset:X,isThirdPerson:()=>x,getSelfAvatar:()=>u,getSelfCamDist:()=>m}}let U=null,yt=null,it=null,Q=null,Ao=null,F=null,Qe=null,ha=null,pt=null,ut=null,qt=null,re=null;const Ls=new cr;let Ot=!1,ie=0,uo=0,Io=0,po=0,wn=!1,ft={name:"",soft:!1};function zs(t,e){const n=document.createElement("div");n.id="lu-gpu-notice",n.style.cssText=`position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:1200;max-width:min(92vw,600px);background:linear-gradient(180deg,#fffdf8,#f6f1e4);color:#17140f;border:1px solid rgba(95,158,125,0.55);border-radius:14px;padding:14px 44px 14px 18px;box-shadow:0 12px 32px rgba(20,15,8,0.35);font:13px/1.75 ${de()};`;const o="<b>이 브라우저에서 3D 그래픽 기능을 사용할 수 없습니다</b><br>";n.innerHTML=o+'<b>Chrome</b>: 설정 → 시스템(<b>chrome://settings/system</b>) → "그래픽 가속 사용" 켜기 → 다시 시작<br><b>Edge</b>: 설정 → 시스템 및 성능 → "그래픽 가속 사용" 켜기 + "효율 모드" 끄기<br><b>Firefox</b>: 설정 → 일반 → 성능 → "권장 성능 설정" 해제 → "하드웨어 가속 사용" 체크<br>그래도 느리면: 원격 데스크톱 여부 확인 · 그래픽 드라이버 업데이트 · Windows 설정 → 디스플레이 → 그래픽에서 브라우저를 "고성능" GPU로 지정 · 확장프로그램 없는 시크릿 창으로 접속해 비교';const a=document.createElement("button");a.type="button",a.setAttribute("aria-label","닫기"),a.textContent="×",a.style.cssText="position:absolute;top:8px;right:10px;width:26px;height:26px;border:none;background:none;font-size:18px;color:#8a8172;cursor:pointer;",a.addEventListener("click",()=>n.remove());const r=document.createElement("button");r.type="button",r.textContent="진단 정보 복사",r.style.cssText="display:inline-block;margin-top:8px;padding:5px 14px;border-radius:999px;border:1px solid rgba(95,158,125,0.5);background:rgba(95,158,125,0.12);color:#17140f;font:600 11px/1 inherit;cursor:pointer;",r.addEventListener("click",()=>{const i=JSON.stringify({renderer:t,ua:navigator.userAgent,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,cores:navigator.hardwareConcurrency||0,mem:navigator.deviceMemory||0});try{navigator.clipboard.writeText(i),r.textContent="복사됨!"}catch{}}),n.appendChild(r),n.appendChild(a),document.body.appendChild(n)}let Ae=0;const ga="lu-onboard-v1";let Lt=-1,te=null,Ro=null,yn=0,fo=0;function _s(){try{if(localStorage.getItem(ga))return}catch{}if(!(typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches))return;Lt=0;const t=Q.getState();Ro={x:t.x,z:t.z};const e=document.createElement("style");e.textContent="@keyframes lu-ob-pulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} 70%{transform:translate(-50%,-50%) scale(1.25);opacity:0.2;} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} }",document.head.appendChild(e),te=document.createElement("div"),te.style.cssText="position:fixed;left:24%;bottom:22%;width:110px;height:110px;border-radius:50%;border:3px solid rgba(255,253,247,0.85);pointer-events:none;z-index:60;transform:translate(-50%,-50%);animation:lu-ob-pulse 1.6s ease-in-out infinite;",document.body.appendChild(te),ot("왼쪽 화면을 누른 채 밀면 걸어요 🚶")}function Ns(){if(Lt<0)return;const t=Q.getState();if(Lt===0)Math.hypot(t.x-Ro.x,t.z-Ro.z)>1.5&&(Lt=1,yn=t.ry,te&&(te.remove(),te=null),ot("잘했어요! 오른쪽 화면을 쓸면 주위를 둘러봐요 👀"));else if(Lt===1){let e=t.ry-yn;e=Math.atan2(Math.sin(e),Math.cos(e)),Math.abs(e)>.6&&(Lt=2,fo=0,ot("작품에 다가가면 설명이 나타나요 — 어려우면 [투어] 버튼을 눌러요 🖼️"))}else if(Lt===2&&(fo+=1,fo>420)){Lt=-1;try{localStorage.setItem(ga,"1")}catch{}}}function vn(){if(!F)return;const t=[];for(const[e,n]of F.remoteAvatars)e.startsWith("npc-")&&t.push(n);if(!Ot){for(const e of t)e.group.visible=!0;return}t.sort((e,n)=>e.group.position.distanceTo(it.position)-n.group.position.distanceTo(it.position)),t.forEach((e,n)=>{e.group.visible=n<ms})}const ba=new dr;let ho=null,fe=null;function kn(){ut.toggle()}function As(t){t&&(fe=fe?Object.assign({},fe,{char:t}):{char:t},ut.rebuildAvatar(t),F&&typeof F.setChar=="function"&&F.setChar(t),ot("아야모 모습을 바꿨어요 ✨"))}const Is=7,se=new Xa,Sn=new Rt;let go=null;function Rs(t){t.addEventListener("pointerdown",e=>{e.isPrimary&&(go={x:e.clientX,y:e.clientY,t:performance.now()})}),t.addEventListener("pointerup",e=>{const n=go;if(go=null,!n||!e.isPrimary||!rt||!F||performance.now()-n.t>450||Math.hypot(e.clientX-n.x,e.clientY-n.y)>7)return;const o=t.getBoundingClientRect();Sn.set((e.clientX-o.left)/o.width*2-1,-((e.clientY-o.top)/o.height)*2+1),se.setFromCamera(Sn,it),se.far=Is+ut.getSelfCamDist();const a=[...F.remoteAvatars.entries()];if(!a.length)return;const r=a.map(([,c])=>c.group),i=se.intersectObjects(r,!0);if(i.length){let c=i[0].object;for(;c&&!r.includes(c);)c=c.parent;if(c){const[d]=a[r.indexOf(c)];F.sendHit(d);return}}se.far=60;const l=se.intersectObjects(Qa(),!1);l.length&&l[0].object.userData.luArt&&wa(l[0].object.userData.luArt)})}let ma=null,to="게스트",rt=!1,Mt=null,Ye=[],qe="shared",gt=[],Cn=!1,bo=0,Ie=0,J=null;const En=.8,Ps=2.2;function xa(t,e){const n=Q.getState(),o=typeof t.y=="number"?t.y:n.y,a=t.x-n.x,r=o-n.y,i=t.z-n.z,l=Math.hypot(a,r,i),c=mt.clamp(En+l*.035,En,Ps);Q.disable(),J={fromX:n.x,fromY:n.y,fromZ:n.z,fromRy:n.ry,toX:t.x,toY:o,toZ:t.z,toRy:t.ry,duration:c,elapsed:0,onDone:e||null}}const Mn=new Dn(0,0,0,"YXZ");function Os(t){if(!J)return;J.elapsed+=t;const e=Math.min(1,J.elapsed/J.duration),n=us(e),o=J.fromX+(J.toX-J.fromX)*n,a=J.fromY+(J.toY-J.fromY)*n,r=J.fromZ+(J.toZ-J.fromZ)*n,i=ps(J.fromRy,J.toRy,n);if(it.position.set(o,a,r),Mn.set(0,i,0,"YXZ"),it.quaternion.setFromEuler(Mn),e>=1){const l=J.onDone;J=null,l&&l()}}async function Bs(){bn(!0),yt=new Xn,it=new Fn(55,window.innerWidth/window.innerHeight,.1,1e3),it.position.set(N.spawn.x,Et,N.spawn.z);const t=typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches,e=No();ft=ws(),console.info("[OpenArtShow] GPU:",ft.name||"(unknown)",ft.soft?"— SOFTWARE RENDERING":"");try{U=new Gn({antialias:!ft.soft,powerPreference:"high-performance"})}catch(x){throw zs(""),x}Rs(U.domElement);const n=document.createElement("div");n.id="lu-vignette",n.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse 72% 62% at 50% 46%, rgba(8,6,4,0) 50%, rgba(8,6,4,0.03) 62%, rgba(8,6,4,0.09) 72%, rgba(8,6,4,0.17) 82%, rgba(8,6,4,0.26) 91%, rgba(8,6,4,0.34) 100%);",document.body.appendChild(n);const o=window.devicePixelRatio||1;let a;e==="low"?a=Math.min(o,1.25):e==="high"?a=Math.min(Math.max(o,2),2.5):t?a=Math.min(o,2):a=Math.min(Math.max(o,1.5),2);const r=e==="high"?Fe.high:e==="low"?Fe.low:Fe.base;a=Math.min(a,Math.sqrt(r/(window.innerWidth*window.innerHeight))),ft.soft&&(a=Math.min(a,.7),document.documentElement.classList.add("lu-potato")),U.setPixelRatio(a),U.setSize(window.innerWidth,window.innerHeight),U.shadowMap.enabled=!ft.soft,U.shadowMap.type=Fa,U.toneMapping=ft.soft?Hn:Ya,U.toneMappingExposure=.92,U.outputColorSpace=It,document.body.appendChild(U.domElement);const i=await ja(),l=fs(i.theme);jr(yt,l,{fullLights:!ft.soft&&e!=="low"}),await $a(),await Wa(yt),window.__museum={scene:yt,camera:it,renderer:U},ft.soft&&(yt.fog=null),U.shadowMap.autoUpdate=!1,U.shadowMap.needsUpdate=!0,Io=l==="cycle"?2:0,Mt=i,Qi(Mt.name),Ds(),qe=i.id??"shared",gt=Va(qe),Xo(gt),cs({onSubmit:Us}),Ye=je(),os(Ye,wa),ss({onPrev:An,onNext:Nn,onExit:zn,onToggleAuto:Xs}),rs({onSelfView:()=>{rt&&!lo()&&kn()},onTour:()=>{rt&&_n()},onViewArtwork:Tn,onGuestbook:()=>{rt&&!pe()&&zo()},onCapture:()=>{rt&&!lo()&&(xn(),Ln())}}),Q=new ni(it,U.domElement);const c=N.floors.find(x=>x.id===N.spawn.floor);Q.setPose({x:N.spawn.x,y:(c?c.y:0)+Et,z:N.spawn.z,ry:N.spawn.ry}),Ao=si({player:Q,getSelfAvatar:()=>ut.getSelfAvatar()}),Q.disable(),setTimeout(()=>{const x=document.getElementById("lu-topright");x&&(x.style.cursor="pointer",x.title="클릭하면 성능 진단 정보가 복사됩니다",x.addEventListener("click",()=>{const u=JSON.stringify({gpu:ft.name,soft:ft.soft,pixelRatio:U?U.getPixelRatio():0,aa:U?U.getContext().getContextAttributes().antialias:null,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,inner:window.innerWidth+"x"+window.innerHeight,cores:navigator.hardwareConcurrency||0,spec:No(),calls:U?U.info.render.calls:0,ua:navigator.userAgent});try{navigator.clipboard.writeText(u),ot("진단 정보가 복사됐어요 — 붙여넣어 보내주세요")}catch{console.info("[OpenArtShow diag]",u)}}))},0),Wi({onEnter:Fs,onChatSend:$s,onAvatarChange:As,onMakerToggle:x=>{rt&&(x?Q.disable():pt.isTouring()||Q.enable())}}),bn(!1),es(()=>{rt&&!pt.isTouring()&&Q.enable()}),Qe=ys({getCamera:()=>it,getRenderer:()=>U,getMp:()=>F,isEntered:()=>rt,isTouring:()=>pt.isTouring(),viewCurrentArtwork:Tn,toggleArtworkList:pa,toggleTour:_n,toggleGuestbook:zo,flashShutter:xn,capturePhoto:Ln,toggleSelfView:kn,tourPrev:An,tourNext:Nn,exitTour:zn,isLightboxOpen:pe,isShareModalOpen:lo,isArtworkListOpen:mn,isGuestbookOpen:ds}),ut=Ts({getScene:()=>yt,getCamera:()=>it,getPlayer:()=>Q,getSelfInfo:()=>fe,isEntered:()=>rt,createAvatarInstance:Un,EYE_HEIGHT:Et,setStatus:ot,setDockActive:hn}),ha=Es({getRenderer:()=>U,getScene:()=>yt,getCamera:()=>it,isThirdPerson:()=>ut.isThirdPerson(),getSelfAvatar:()=>ut.getSelfAvatar(),applySelfCamOffset:()=>ut.applySelfCamOffset(),restoreSelfCamOffset:()=>ut.restoreSelfCamOffset(),getGalleryInfo:()=>Mt,photoWall:ba,getMyNickname:()=>to,getMp:()=>F,showShareModal:is,setStatus:ot}),pt=Ms({getPlacedArtworks:()=>Ye,getPlayer:()=>Q,isEntered:()=>rt,getTween:()=>J,clearTween:()=>{J=null},startTween:xa,getViewingPose:Vn,showTourBar:ns,hideTourBar:as,setDockActive:hn,isLightboxOpen:pe,isArtworkListOpen:mn,hideArtworkList:me}),window.addEventListener("resize",Vs),window.addEventListener("keydown",Hs),ma=new Ua,U.setAnimationLoop(Ws)}function Ds(){fetch("./galleries/index.json").then(t=>{if(!t.ok)throw new Error(`HTTP ${t.status}`);return t.json()}).then(t=>{if(!Array.isArray(t))return;const e=Mt?Mt.id:null;ts(t,e,n=>{window.location.href="./index.html?g="+n})}).catch(()=>{})}let Re=null;function Gs(){if(!rt)return;const t=it.position.y-Et;let e=null;for(const n of N.floors)t>=n.y-.9&&(e===null||n.y>e.y)&&(e=n);if(e){if(Re===null){Re=e.id;return}e.id!==Re&&(Re=e.id,ot(e.name))}}function Tn(){if(!rt||pe())return;const t=pt.isTouring()?Ye[pt.getIndex()]:jn(it.position);t&&(ua(t),Q.disable())}function Ln(){ha.capturePhoto()}function Hs(t){Qe.onKeyDown(t)}function wa(t){if(!t||!rt)return;const e=Vn(t),n=pt.isTouring();n&&pt.syncOnSelect(t),xa(e,()=>{Q.setPose(e),n?pt.onArrive(t):rt&&!pe()&&Q.enable()})}function zn(){pt.exitTour()}function _n(){pt.toggleTour()}function Nn(){pt.next()}function An(){pt.prev()}function Xs(){pt.toggleAuto()}function Fs({nickname:t,color:e,char:n}){to=t,fe={nickname:t,color:e,char:n},rt=!0,Vi(),Q.enable(),Vr(),_s();try{const o=Mt&&Mt.id||"link-"+hs(window.location.hash||"");F=new Ka(yt,{nickname:t,color:e,char:n,roomId:`${Za}-${o}`}),re=new ui(o),F.onVisitor=(a,r)=>{re.addVisit(a),Ls.add(r&&r.nickname,Mt?Mt.name:"")},F.onPhoto=a=>{ba.addRemote(a),ot(`${a.name||"누군가"}님이 관람 사진을 남겼어요 📸`)},ho&&clearInterval(ho),ho=setInterval(()=>{if(!F||!re)return;const a=[];for(const[r,i]of F.remoteAvatars)r.startsWith("npc-")||a.push({x:i.group.position.x,z:i.group.position.z});re.addDwell(a,je(),2),ls(re.summary(gt.length))},2e3),F.onChat=(a,r)=>sa(a,r,!1),F.onPlayerCount=a=>qi(a),F.onStatus=Ys,F.onGuestbook=js,F.onSelfHit=a=>{ot(a>=3?"아야!! 너무해요 😭":"아야! 누가 때렸어요 😣");const r=ut.getSelfAvatar();r?r.hit(a):qa(a)},F.onNpcHit=(a,r,i)=>{qt&&qt.onHit(a,r,i)},F.npcProvider=(a,r)=>{qt||(qt=new Ja(je()));const i=qt.update(a,r),l=qt.takeChat();return l&&F.sendNpcChat(l.name,l.text),i},F.connect()}catch(o){console.error("멀티플레이어 초기화 실패:",o),F=null,ot("멀티플레이어 연결에 실패했습니다. 혼자 관람 모드로 진행합니다.")}}function Ys(t){if(ot(t),!(Cn||!F)&&(t==="호스트로 개설됨"||t.startsWith("접속됨"))){Cn=!0;try{F.sendGuestbook(gt)}catch(e){console.error("방명록 동기화 전송 실패:",e)}}}function Us(t){if(!t)return;const e=tr(to,t);if(gt=$n(gt,[e]),Wn(qe,gt),Xo(gt),F)try{F.sendGuestbook([e])}catch(n){console.error("방명록 전송 실패:",n)}}function js(t){gt=$n(gt,t),Wn(qe,gt),Xo(gt)}function $s(t){if(t&&(sa(to,t,!0),F))try{F.sendChat(t)}catch(e){console.error("채팅 전송 실패:",e),ot("채팅 전송에 실패했습니다.")}}let Pe=0;function Ws(){let t=ma.getDelta();if(ft.soft){if(Pe+=t,Pe<.034)return;t=Pe,Pe=0}try{Ao&&Ao.update(t),Q.update(t),F&&Q.resolveBodyCollisions(F.getAvatarPositions()),Os(t),pt.tick(t),Ur(t),Gs(),F&&(F.sendState(Q.getState()),F.update(t)),Ns(),ut.tick(t);const e=jn(it.position);if(e?Ki(e):Zi(),bo+=1,Ie+=t,Ie>=.5){const n=bo/Ie;if(Ji(Math.round(n)),bo=0,Ie=0,ie=Math.max(0,ie-.5),ie===0&&rt){if(!Ot&&n<gs){Ot=!0,ie=10,n<16&&co("low");const o=window.devicePixelRatio||1;U.setPixelRatio(Math.min(U.getPixelRatio(),Math.max(1,o*.75))),ot("원활한 관람을 위해 화질을 잠시 낮췄어요")}else Ot&&n>bs&&(Ot=!1,ie=10,vn());if(!Ot&&n>55){if(Ae+=1,Ae>=20){const o=No();o==="low"?co(null):o===null&&co("high");const a=Math.min(2.5,Math.sqrt(Fe.high/(window.innerWidth*window.innerHeight))),r=U.getPixelRatio();!ft.soft&&r<a&&(U.setPixelRatio(Math.min(a,r+.25)),ot("화질을 한 단계 높였어요 ✨")),Ae=0}}else Ae=0}}uo+=t,uo>=2&&(uo=0,Ot&&vn()),Io>0&&(po+=t,po>=Io&&(po=0,U.shadowMap.needsUpdate=!0)),!wn&&rt&&(wn=!0,U.shadowMap.needsUpdate=!0),ut.isThirdPerson()&&ut.getSelfAvatar()?(ut.applySelfCamOffset(),U.render(yt,it),ut.restoreSelfCamOffset()):U.render(yt,it)}catch(e){console.error("렌더 루프 오류:",e),U.setAnimationLoop(null),ot("오류가 발생했습니다. 페이지를 새로고침해 주세요.")}}function Vs(){Qe.onWindowResize()}window.addEventListener("beforeunload",()=>{Qe?.onBeforeUnload()});Bs().catch(t=>{console.error("초기화 실패:",t);try{ot("초기화 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.")}catch{document.body.insertAdjacentHTML("beforeend",`<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-family:${de()};font-size:16px;text-align:center;">초기화 중 오류가 발생했습니다.<br>페이지를 새로고침해 주세요.</div>`)}});const ya=0,va=7.5,Ks=0,Oe=3.3,Pt=3.5,kt=.18,Be=.2,Zs=7530209,qs=3.6,Js=1.15,Qs="ontouchstart"in window||(navigator.maxTouchPoints||0)>0;function tl(){const t=document.createElement("canvas");t.width=t.height=512;const e=t.getContext("2d");let n=20935;const o=()=>{n|=0,n=n+1831565813|0;let c=Math.imul(n^n>>>15,1|n);return c=c+Math.imul(c^c>>>7,61|c)^c,((c^c>>>14)>>>0)/4294967296},a=e.createLinearGradient(0,0,0,512);a.addColorStop(0,"#070a16"),a.addColorStop(.55,"#111a34"),a.addColorStop(1,"#1b2748"),e.fillStyle=a,e.fillRect(0,0,512,512);for(let c=0;c<140;c++){const d=o()*512,m=o()*310,b=o()<.08;e.fillStyle=`rgba(235,240,255,${(.28+o()*.6).toFixed(2)})`,e.fillRect(d,m,b?2:1,b?2:1)}const r=e.createRadialGradient(398,88,0,398,88,36);r.addColorStop(0,"rgba(236,239,232,0.9)"),r.addColorStop(.5,"rgba(226,232,224,0.42)"),r.addColorStop(1,"rgba(226,232,224,0)"),e.fillStyle=r,e.beginPath(),e.arc(398,88,36,0,7),e.fill(),e.fillStyle="rgba(240,243,236,0.95)",e.beginPath(),e.arc(398,88,15,0,7),e.fill();let i=0;for(;i<512;){const c=26+o()*48,d=130+o()*250,m=512-d;e.fillStyle=`rgb(${10+(o()*8|0)},${16+(o()*10|0)},${34+(o()*14|0)})`,e.fillRect(i,m,c,d);for(let b=m+12;b<506;b+=15)for(let h=i+6;h<i+c-6;h+=12)o()<.52||(e.fillStyle=o()<.72?"rgba(120,220,225,0.85)":"rgba(255,207,138,0.85)",e.fillRect(h,b,4,6));i+=c+2+o()*8}const l=new he(t);return l.colorSpace=It,l}function el(){const t=document.createElement("canvas");t.width=512,t.height=160;const e=t.getContext("2d");e.clearRect(0,0,512,160),e.font='700 92px "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif',e.textAlign="center",e.textBaseline="middle",e.shadowColor="rgba(114,230,225,0.95)",e.shadowBlur=30,e.fillStyle="rgba(175,244,240,0.96)",e.fillText("오픈월드",256,86),e.shadowBlur=0,e.fillStyle="rgba(224,252,250,0.92)",e.fillText("오픈월드",256,86);const n=new he(t);return n.colorSpace=It,n}function ol(){const t=new Vt,e=[new V(Oe,kt,Be).translate(0,kt/2,0),new V(Oe,kt,Be).translate(0,Pt-kt/2,0),new V(kt,Pt,Be).translate(-3.1199999999999997/2,Pt/2,0),new V(kt,Pt,Be).translate((Oe-kt)/2,Pt/2,0)],n=Ge(e);e.forEach(i=>i.dispose());const o=new ct({color:736570,emissive:Zs,emissiveIntensity:1.5,roughness:.4,metalness:.1});t.add(new D(n,o));const a=new D(new tt(Oe-2*kt,Pt-2*kt),new Ft({map:tl(),toneMapped:!1}));a.position.set(0,Pt/2,.11),a.rotation.y=Math.PI,t.add(a);const r=new D(new tt(2.4,.75),new Ft({map:el(),transparent:!0,toneMapped:!1,depthWrite:!1,side:be}));return r.rotation.x=Math.PI/2,r.scale.x=-1,r.position.set(0,.02,-1),t.add(r),t.position.set(ya,Ks,va),t.userData={frameMat:o,label:r},t}let Dt=null,De=null,vt=null,ce=!1,Po=!1,ka=0,Sa=0;function nl(){vt||(vt=document.createElement("div"),vt.id="portal-hint",vt.textContent=Qs?"탭하여 오픈월드로 이동 →":"클릭하거나 다가가면 오픈월드로 이동 →",vt.style.cssText='position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:40;padding:9px 16px;border-radius:999px;background:rgba(11,30,29,0.82);color:#c9fbf8;font:600 13px/1 "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;letter-spacing:-.01em;border:1px solid rgba(114,230,225,0.5);box-shadow:0 6px 20px -6px rgba(0,0,0,0.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap',document.body.appendChild(vt))}function Ca(){Po||(Po=!0,vt&&(vt.style.opacity="0"),location.href="world.html")}function Ea(){if(requestAnimationFrame(Ea),!Dt){if(Dt=window.__museum||null,!Dt)return;De=ol(),Dt.scene.add(De),nl()}const t=performance.now()/1e3,e=1.3+Math.sin(t*2.2)*.35;De.userData.frameMat.emissiveIntensity=e,De.userData.label.material.opacity=.78+Math.sin(t*2.2)*.2;const n=Dt.camera,o=Math.hypot(n.position.x-ya,n.position.z-va),a=ce;ce=o<qs,ce!==a&&vt&&(vt.style.opacity=ce?"1":"0"),o<Js&&Ca()}requestAnimationFrame(Ea);addEventListener("pointerdown",t=>{ka=t.clientX,Sa=t.clientY},!0);addEventListener("pointerup",t=>{!ce||Po||!Dt||t.target===Dt.renderer.domElement&&(Math.hypot(t.clientX-ka,t.clientY-Sa)>8||Ca())},!0);
