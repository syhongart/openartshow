/* empty css              */import{e as jt,M as O,d as ot,i as V,k as dt,G as qt,T as Ha,l as yo,m as ae,n as On,h as Bt,o as Xa,p as Dn,q as xe,r as Fa,s as ke,F as ro,t as Se,L as Ya,u as We,B as Zo,v as Ua,O as ja,H as Gn,D as ee,w as $a,S as Pt,x as be,f as Hn,y as Xn,E as Fn,z as xt,W as Yn,I as Wa,N as Un,a as jn,b as $n,J as Va,V as Wn,R as Ka,P as Za,A as qa,Q as Ja,C as Qa}from"./vendor-three-enYtijzV.js";import{B as z,b as vo,a as Vn,E as Et,R as Ce,c as Ho,A as ko,g as Ve,d as fe,e as tr,f as er,h as or,l as nr,i as Kn,M as ar,P as rr,p as ir,N as sr,m as Zn,s as qn,j as lr,k as Jn,n as cr}from"./npc-DwjC32ux.js";import{g as dr,c as Qn,a as ur,b as So,m as Xe,d as qo,e as pr,f as fr,T as Ht,h as Ke,i as hr,j as gr,r as br,k as ta,l as ea,C as mr}from"./scene-textures-DhUb9KjO.js";import{V as xr,P as wr}from"./feed-Cm56rHm1.js";import{n as io,D as Fe,C as yr,a as vr,S as Jo,c as Qo,e as Co,d as kr,f as Sr,g as Cr,h as Er,i as Mr,j as Lr,E as Tr,k as zr,H as tn,l as _r,m as Nr,o as Ar,p as so,q as Ir,r as Rr}from"./chibi-builder-0e8j20Jr.js";import{g as At,o as oa,P as Ee,l as Pr,M as Br,a as Or}from"./auth-aZ7HCW1S.js";function en(t,e){let o=[t];for(const n of e){const a=[];for(const r of o){if(n.x1<=r.x0||n.x0>=r.x1||n.z1<=r.z0||n.z0>=r.z1){a.push(r);continue}const i=Math.max(r.x0,n.x0),l=Math.min(r.x1,n.x1),c=Math.max(r.z0,n.z0),d=Math.min(r.z1,n.z1);r.z0<c&&a.push({x0:r.x0,x1:r.x1,z0:r.z0,z1:c}),d<r.z1&&a.push({x0:r.x0,x1:r.x1,z0:d,z1:r.z1}),r.x0<i&&a.push({x0:r.x0,x1:i,z0:c,z1:d}),l<r.x1&&a.push({x0:l,x1:r.x1,z0:c,z1:d})}o=a}return o.filter(n=>n.x1-n.x0>.01&&n.z1-n.z0>.01)}function mt(t){return z.floors.find(e=>e.id===t)}function Dr(t,e){const o=Qn(),n=16/50,a=t.x1-t.x0,r=t.z1-t.z0,i=o.map.clone(),l=o.normalMap.clone();for(const c of[i,l])c.needsUpdate=!0,c.repeat.set(n*a,n*r),c.offset.set((t.x0-z.minX)*n%1,(t.z0-z.minZ)*n%1);return new dt({map:i,normalMap:l,normalScale:new Bt(.7,.7),color:e,roughness:.4,metalness:0})}function zt(t,e,o){const n=ur(),a=n.map.clone(),r=n.normalMap.clone();for(const i of[a,r])i.needsUpdate=!0,i.repeat.set(t,e);return new dt({map:a,normalMap:r,normalScale:new Bt(.55,.55),color:o||16777215,roughness:.9,metalness:0})}function na(){return new dt({map:So().map,normalMap:So().normalMap,normalScale:new Bt(.35,.35),color:16777215,roughness:.92,metalness:0})}const me=()=>new dt({color:2499615,roughness:.4,metalness:.75});function yt(t,e,o,n,a,r){const i=me(),l=new Dn({color:14214376,transparent:!0,opacity:.22,roughness:.08,side:xe,depthWrite:!1}),c=Math.hypot(n-e,a-o),d=Math.atan2(n-e,a-o),m=(e+n)/2,b=(o+a)/2,u=new qt,w=new O(new ae(.03,.03,c,10),i);w.rotation.x=Math.PI/2,w.position.y=1.05,u.add(w);const h=Math.max(2,Math.round(c/1.2)+1);for(let v=0;v<h;v++){const f=h===1?.5:v/(h-1),p=new O(new V(.045,1.05,.045),i);p.position.set(0,.525,-c/2+f*c),u.add(p)}const g=new O(new ot(c,.85),l);g.rotation.y=Math.PI/2,g.position.y=.55,u.add(g),u.rotation.y=d,u.position.set(m,r,b),u.traverse(v=>{v.isMesh&&(v.castShadow=!0)}),t.add(u)}function Gr(t,e){const o=zt(1.2,2.4),n=e.yTo-e.yFrom,a=e.z1-e.z0,r=24,i=n/r,l=a/r,c=e.x1-e.x0,d=(e.x0+e.x1)/2;for(let w=0;w<r;w++){const h=e.yFrom+(w+1)*i,g=h-e.yFrom+.25,v=new O(new V(c,g,l),o);v.position.set(d,h-g/2,e.z0+(w+.5)*l),v.castShadow=!0,v.receiveShadow=!0,t.add(v)}const m=me(),b=Math.hypot(a,n),u=Math.atan2(n,a);for(const w of[e.x0+.06,e.x1-.06]){const h=new O(new ae(.03,.03,b,10),m);h.rotation.x=Math.PI/2-u,h.position.set(w,(e.yFrom+e.yTo)/2+.95,(e.z0+e.z1)/2),h.castShadow=!0,t.add(h);for(const g of[.08,.5,.92]){const v=e.yFrom+n*g,f=new O(new V(.045,.95,.045),m);f.position.set(w,v+.475,e.z0+a*g),f.castShadow=!0,t.add(f)}}}function Hr(t,e,o,n,a,r,i){const l=e+z.clearH,c=.32,d=.14,m=1.1,b=zt(2,.4,13617599),u=new dt({color:3486253,normalMap:So().normalMap,normalScale:new Bt(.25,.25),roughness:.95}),w=new dt({color:1710102,roughness:.5,metalness:.6}),h=new dt({color:16774880,emissive:a.downlight.emissive,emissiveIntensity:2.5*(a.downlight.intensity/22),roughness:1}),g=[],v=[],f=[];for(const p of o){const B=p.x1-p.x0,_=p.z1-p.z0,H=new O(new ot(B,_),u);H.rotation.x=Math.PI/2,H.position.set((p.x0+p.x1)/2,l+c,(p.z0+p.z1)/2),t.add(H);const A=Math.ceil((p.z0-z.minZ)/m);for(let y=A;;y++){const S=z.minZ+y*m;if(S>p.z1-.05)break;if(S<p.z0+.05)continue;const N=new V(B,c,d);N.translate((p.x0+p.x1)/2,l+c/2,S),g.push(N)}const F=Math.ceil((p.x0-z.minX)/m);for(let y=F;;y++){const S=z.minX+y*m;if(S>p.x1-.05)break;if(S<p.x0+.05)continue;const N=new V(d,c,_);N.translate(S,l+c/2,(p.z0+p.z1)/2),g.push(N)}for(let y=F;;y++){const S=z.minX+y*m+m/2;if(S>p.x1-.2)break;if(!(S<p.x0+.2))for(let N=A;;N++){const I=z.minZ+N*m+m/2;if(I>p.z1-.2)break;if(I<p.z0+.2||(y*7+N*5)%3!==0)continue;const E=new ae(.07,.08,.1,12);E.translate(S,l+c-.06,I),v.push(E);const D=new ae(.055,.055,.02,12);D.translate(S,l+c-.12,I),f.push(D)}}}if(g.length){const p=new O(Xe(g),b);p.castShadow=!0,t.add(p)}if(v.length&&t.add(new O(Xe(v),w)),f.length&&t.add(new O(Xe(f),h)),i)for(const[p,B]of r){const _=new Xa(a.downlight.color,a.downlight.intensity*.7,9,2);_.position.set(p,l-.15,B),t.add(_),n.push(_)}return h}function Xr(t){const e=new Dn({color:14478578,transparent:!0,opacity:.1,roughness:.05,side:xe,depthWrite:!1}),o=me(),n=z.maxZ,a=z.maxX-z.minX,r=mt("f1"),i=mt("f2"),l=z.clearH;for(const[g,v]of[[z.minX,-1.5],[1.5,z.maxX]]){const f=v-g,p=new O(new ot(f,l),e);p.position.set((g+v)/2,r.y+l/2,n),p.rotation.y=Math.PI,t.add(p)}for(let g=z.minX;g<=z.maxX+.01;g+=2.2){if(g>-1.5&&g<1.5)continue;const v=new O(new V(.12,l,.12),o);v.position.set(g,r.y+l/2,n),v.castShadow=!0,t.add(v)}for(const g of[-1.5,1.5]){const v=new O(new V(.18,l,.18),o);v.position.set(g,r.y+l/2,n),v.castShadow=!0,t.add(v)}const c=new O(new V(a,.14,.16),o);c.position.set(0,r.y+l-.07,n),t.add(c);const d=na(),m=new O(new V(a,1.2,z.wallT),d);m.position.set(0,i.y+.6,n),m.castShadow=!0,m.receiveShadow=!0,t.add(m);const b=new O(new V(a,z.clearH-2.6+.6,z.wallT),d);b.position.set(0,i.y+2.6+(z.clearH-2.6+.6)/2,n),b.castShadow=!0,b.receiveShadow=!0,t.add(b);const u=new O(new ot(a,1.4),e);u.position.set(0,i.y+1.9,n),u.rotation.y=Math.PI,t.add(u);for(let g=z.minX;g<=z.maxX+.01;g+=2.2){const v=new O(new V(.08,1.4,.08),o);v.position.set(g,i.y+1.9,n),t.add(v)}const w=mt("b1"),h=new O(new V(a+.6,z.storyH,z.wallT),zt(4,1));h.position.set(0,w.y+z.storyH/2,n),t.add(h)}function Fr(t,e,o){const n=z,a=n.maxX-n.minX,r=n.maxZ-n.minZ,i={x0:n.minX,x1:n.maxX,z0:n.minZ,z1:n.maxZ},l=[];let c=null;const d=["b1","f1","f2"];for(const k of n.floors){const L=n.slabHoles[k.id]||[],Y=en(i,L);for(const j of Y){const q=j.x1-j.x0,W=j.z1-j.z0,Z=new O(new V(q,n.slabT,W),zt(q/6,W/6));Z.position.set((j.x0+j.x1)/2,k.y-n.slabT/2,(j.z0+j.z1)/2),Z.castShadow=!0,Z.receiveShadow=!0,t.add(Z);const J=new O(new ot(q,W),Dr(j,k.id==="b1"?10127472:k.id==="roof"?13482132:16777215));J.rotation.x=-Math.PI/2,J.position.set((j.x0+j.x1)/2,k.y+.002,(j.z0+j.z1)/2),J.receiveShadow=!0,t.add(J)}}const m={b1:[[-6,-3],[0,-3],[6,-3],[0,3]],f1:[[-7,-4],[0,-4],[7,-4],[-7,4],[0,4],[7,4]],f2:[[-7,-4.5],[0,-4.5],[7,-4.5],[-7,5],[7,5]]},b={b1:"f1",f1:"f2",f2:"roof"};for(const k of d){const L=mt(k),Y=n.slabHoles[b[k]]||[],j=en(i,Y),q=Hr(t,L.y,j,l,e,m[k],o);c||(c=q)}const u=zt(3,2),w=mt("roof").y-mt("b1").y,h=mt("b1").y+w/2,g=new O(new V(a+n.wallT*2,w,n.wallT),u);g.position.set(0,h,n.minZ-n.wallT/2),g.castShadow=!0,g.receiveShadow=!0,t.add(g);for(const[k,L]of[[n.minX-n.wallT/2,1],[n.maxX+n.wallT/2,1]]){const Y=new O(new V(n.wallT,w,r),u);Y.position.set(k,h,0),Y.castShadow=!0,Y.receiveShadow=!0,t.add(Y)}for(const k of d){const L=mt(k),Y=na(),j=[{w:a,h:z.clearH,x:0,z:n.minZ+.02,ry:0},{w:r,h:z.clearH,x:n.maxX-.02,z:0,ry:-Math.PI/2},{w:r,h:z.clearH,x:n.minX+.02,z:0,ry:Math.PI/2}];for(const q of j){const W=new O(new ot(q.w,q.h),Y);W.position.set(q.x,L.y+z.clearH/2,q.z),W.rotation.y=q.ry,W.receiveShadow=!0,t.add(W)}}Xr(t);for(const k of n.stairs)Gr(t,k);const v=mt("f1").y,f=mt("f2").y,p=mt("roof").y;yt(t,-8.7,-7,-8.7,-1,v),yt(t,-10.7,-7,-8.7,-7,v),yt(t,-8.7,1,-8.7,7,f),yt(t,-10.7,1,-8.7,1,f),yt(t,-4,-3,5,-3,f),yt(t,-4,3,5,3,f),yt(t,-4,-3,-4,3,f),yt(t,5,-3,5,3,f),yt(t,8.7,1,8.7,7,p),yt(t,8.7,1,10.7,1,p);const B=zt(4,.5),_=1.1,H=.25,A=[{w:a+.6,d:H,x:0,z:n.minZ-H/2},{w:a+.6,d:H,x:0,z:n.maxZ+H/2},{w:H,d:r,x:n.minX-H/2,z:0},{w:H,d:r,x:n.maxX+H/2,z:0}];for(const k of A){const L=new O(new V(k.w,_,k.d),B);L.position.set(k.x,p+_/2,k.z),L.castShadow=!0,L.receiveShadow=!0,t.add(L)}const F=new dt({map:Qn().map,color:12163695,roughness:.6});for(const[k,L]of[[-4,4],[2,-4]]){const Y=new O(new V(2.2,.09,.55),F);Y.position.set(k,p+.45,L),Y.castShadow=!0,t.add(Y);for(const j of[-.9,.9]){const q=new O(new V(.08,.42,.5),me());q.position.set(k+j,p+.21,L),t.add(q)}}const y=new dt({color:5194806,roughness:.45,metalness:.65}),S=new qt,N=new O(new Ha(1.3,.42,14,28,Math.PI),y);N.castShadow=!0,S.add(N);const I=new O(new yo(.55,18,14),y);I.scale.set(1.5,.75,1),I.position.set(1.1,-.95,.2),I.castShadow=!0,S.add(I),S.position.set(-2,p+1.35,.5),S.rotation.y=-.6,t.add(S);const E=new O(new ae(1.9,1.9,.12,24),zt(1,1,14209994));E.position.set(-2,p+.06,.5),E.receiveShadow=!0,t.add(E);const D=new O(new V(2.8,.18,7.2),zt(1,2));D.position.set(9.7,p+2.6,4),D.castShadow=!0,t.add(D);for(const[k,L]of[[8.85,.8],[10.55,.8],[8.85,7.2],[10.55,7.2]]){const Y=new O(new V(.12,2.6,.12),me());Y.position.set(k,p+1.3,L),t.add(Y)}let M=null;return o||(M=new On(e.downlight.color,e.downlight.intensity*.022),t.add(M)),{downlights:{lights:l,warm:M,bulbMat:c}}}function Yr(t){const{minX:e,maxX:o,minZ:n,maxZ:a,wallT:r}=z,i=.55,l=e+r/2,c=o-r/2,d=n+r/2,m=a-r/2,b=new jt({map:dr(),transparent:!0,depthWrite:!1});for(const u of z.floors){if(u.id==="roof")continue;const w=u.y+.018,h=[[c-l,(l+c)/2,d+i/2,Math.PI],[c-l,(l+c)/2,m-i/2,0],[m-d,l+i/2,(d+m)/2,-Math.PI/2],[m-d,c-i/2,(d+m)/2,Math.PI/2]];for(const[g,v,f,p]of h){const B=new O(new ot(g,i),b);B.rotation.x=-Math.PI/2,B.rotation.z=p,B.position.set(v,w,f),B.renderOrder=1,t.add(B)}}}class Ur extends Fa{constructor(e){super(e),this.type=ke}parse(e){const i=function(y,S){switch(y){case 1:throw new Error("THREE.RGBELoader: Read Error: "+(S||""));case 2:throw new Error("THREE.RGBELoader: Write Error: "+(S||""));case 3:throw new Error("THREE.RGBELoader: Bad File Format: "+(S||""));default:case 4:throw new Error("THREE.RGBELoader: Memory Error: "+(S||""))}},m=`
`,b=function(y,S,N){S=S||1024;let E=y.pos,D=-1,M=0,k="",L=String.fromCharCode.apply(null,new Uint16Array(y.subarray(E,E+128)));for(;0>(D=L.indexOf(m))&&M<S&&E<y.byteLength;)k+=L,M+=L.length,E+=128,L+=String.fromCharCode.apply(null,new Uint16Array(y.subarray(E,E+128)));return-1<D?(y.pos+=M+D+1,k+L.slice(0,D)):!1},u=function(y){const S=/^#\?(\S+)/,N=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,I=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,E=/^\s*FORMAT=(\S+)\s*$/,D=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,M={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0};let k,L;for((y.pos>=y.byteLength||!(k=b(y)))&&i(1,"no header found"),(L=k.match(S))||i(3,"bad initial token"),M.valid|=1,M.programtype=L[1],M.string+=k+`
`;k=b(y),k!==!1;){if(M.string+=k+`
`,k.charAt(0)==="#"){M.comments+=k+`
`;continue}if((L=k.match(N))&&(M.gamma=parseFloat(L[1])),(L=k.match(I))&&(M.exposure=parseFloat(L[1])),(L=k.match(E))&&(M.valid|=2,M.format=L[1]),(L=k.match(D))&&(M.valid|=4,M.height=parseInt(L[1],10),M.width=parseInt(L[2],10)),M.valid&2&&M.valid&4)break}return M.valid&2||i(3,"missing format specifier"),M.valid&4||i(3,"missing image size specifier"),M},w=function(y,S,N){const I=S;if(I<8||I>32767||y[0]!==2||y[1]!==2||y[2]&128)return new Uint8Array(y);I!==(y[2]<<8|y[3])&&i(3,"wrong scanline width");const E=new Uint8Array(4*S*N);E.length||i(4,"unable to allocate buffer space");let D=0,M=0;const k=4*I,L=new Uint8Array(4),Y=new Uint8Array(k);let j=N;for(;j>0&&M<y.byteLength;){M+4>y.byteLength&&i(1),L[0]=y[M++],L[1]=y[M++],L[2]=y[M++],L[3]=y[M++],(L[0]!=2||L[1]!=2||(L[2]<<8|L[3])!=I)&&i(3,"bad rgbe scanline format");let q=0,W;for(;q<k&&M<y.byteLength;){W=y[M++];const J=W>128;if(J&&(W-=128),(W===0||q+W>k)&&i(3,"bad scanline data"),J){const rt=y[M++];for(let ye=0;ye<W;ye++)Y[q++]=rt}else Y.set(y.subarray(M,M+W),q),q+=W,M+=W}const Z=I;for(let J=0;J<Z;J++){let rt=0;E[D]=Y[J+rt],rt+=I,E[D+1]=Y[J+rt],rt+=I,E[D+2]=Y[J+rt],rt+=I,E[D+3]=Y[J+rt],D+=4}j--}return E},h=function(y,S,N,I){const E=y[S+3],D=Math.pow(2,E-128)/255;N[I+0]=y[S+0]*D,N[I+1]=y[S+1]*D,N[I+2]=y[S+2]*D,N[I+3]=1},g=function(y,S,N,I){const E=y[S+3],D=Math.pow(2,E-128)/255;N[I+0]=Se.toHalfFloat(Math.min(y[S+0]*D,65504)),N[I+1]=Se.toHalfFloat(Math.min(y[S+1]*D,65504)),N[I+2]=Se.toHalfFloat(Math.min(y[S+2]*D,65504)),N[I+3]=Se.toHalfFloat(1)},v=new Uint8Array(e);v.pos=0;const f=u(v),p=f.width,B=f.height,_=w(v.subarray(v.pos),p,B);let H,A,F;switch(this.type){case ro:F=_.length/4;const y=new Float32Array(F*4);for(let N=0;N<F;N++)h(_,N*4,y,N*4);H=y,A=ro;break;case ke:F=_.length/4;const S=new Uint16Array(F*4);for(let N=0;N<F;N++)g(_,N*4,S,N*4);H=S,A=ke;break;default:throw new Error("THREE.RGBELoader: Unsupported type: "+this.type)}return{width:p,height:B,data:H,header:f.string,gamma:f.gamma,exposure:f.exposure,type:A}}setDataType(e){return this.type=e,this}load(e,o,n,a){function r(i,l){switch(i.type){case ro:case ke:i.colorSpace=Ya,i.minFilter=We,i.magFilter=We,i.generateMipmaps=!1,i.flipY=!0;break}o&&o(i,l)}return super.load(e,r,n,a)}}const Xo=[];function on(t){const o=document.createElement("canvas");o.width=1024,o.height=1024;const n=o.getContext("2d"),a=n.createLinearGradient(0,0,0,1024);for(const[d,m]of t.stops)a.addColorStop(d,m);if(n.fillStyle=a,n.fillRect(0,0,1024,1024),t.stars>0){const d=Ke(90210);for(let m=0;m<t.stars;m++){const b=d()*1024,u=d()*1024*.82,w=.4+d()*1.6,h=.35+d()*.65;if(d()>.965){const g=n.createRadialGradient(b,u,0,b,u,w*5);g.addColorStop(0,`rgba(255, 255, 255, ${h*.5})`),g.addColorStop(1,"rgba(255,255,255,0)"),n.fillStyle=g,n.beginPath(),n.arc(b,u,w*5,0,Math.PI*2),n.fill()}n.fillStyle=`rgba(255, 255, 255, ${h})`,n.beginPath(),n.arc(b,u,w,0,Math.PI*2),n.fill()}}const r=Ke(13579),[i,l]=t.cloudAlpha;for(let d=0;d<t.cloudCount;d++){const m=r()*1024,b=1024*(.3+r()*.45),u=30+r()*90;for(let w=0;w<7;w++){const h=m+(r()-.5)*u*2.4,g=b+(r()-.5)*u*.7,v=u*(.35+r()*.5),f=n.createRadialGradient(h,g,0,h,g,v);f.addColorStop(0,`rgba(${t.cloudColor}, ${i+r()*(l-i)})`),f.addColorStop(1,`rgba(${t.cloudColor}, 0)`),n.fillStyle=f,n.beginPath(),n.arc(h,g,v,0,Math.PI*2),n.fill()}}const c=new be(o);return c.colorSpace=Pt,c}const jr={daylight:"./assets/sky/day.hdr",sunset:"./assets/sky/sunset.hdr",night:"./assets/sky/night.jpg"};function Me(t,e){const o=jr[e],n=r=>{r.minFilter=We,r.magFilter=We,t.map=r,t.needsUpdate=!0},a=()=>{};o.endsWith(".hdr")?new Ur().load(o,n,void 0,a):new $a().load(o,r=>{r.colorSpace=Pt,n(r)},void 0,a)}function $r(t,e,o){if(o){const r=(d,m)=>new O(new yo(m,32,16),new jt({map:on(d),side:Zo,fog:!1,transparent:!0,depthWrite:!1,opacity:0})),i=r(Ht.night.sky,450),l=r(Ht.sunset.sky,448),c=r(Ht.daylight.sky,446);for(const d of[i,l,c])d.position.y=-70;return i.renderOrder=-3,l.renderOrder=-2,c.renderOrder=-1,t.add(i,l,c),Me(c.material,"daylight"),Me(l.material,"sunset"),Me(i.material,"night"),{daylight:c,sunset:l,night:i}}const n=e===Ht.sunset?"sunset":e===Ht.night?"night":"daylight",a=new O(new yo(450,32,16),new jt({map:on(e.sky),side:Zo,fog:!1}));return a.position.y=-70,t.add(a),Me(a.material,n),null}function Wr(t,e){const o=new O(new ot(800,800),new dt({map:qo().map,normalMap:qo().normalMap,normalScale:new Bt(.6,.6),color:e.grassTint,roughness:.95,metalness:0}));o.rotation.x=-Math.PI/2,o.position.y=-.03,o.receiveShadow=!0,t.add(o);const n=new O(new ot(400,900),new dt({color:e.sea.color,roughness:e.sea.roughness,metalness:e.sea.metalness}));n.rotation.x=-Math.PI/2,n.position.set(290,-.02,0),t.add(n);const a=new O(new ot(8,900),new dt({color:13220758,roughness:.9}));a.rotation.x=-Math.PI/2,a.position.set(88,-.025,0),t.add(a);const r=Ke(97531),i=new qt;let l=4e4;function c(w,h,g){l+=733;const v=vo(l,{trunkLen:2.6*g,trunkRad:.24*g,maxLevel:2,leafScale:.95*g});v.position.set(w,0,h),v.rotation.y=r()*Math.PI*2,i.add(v)}[[-12,30,1],[4,31,1.15],[12,34,.9],[34,-18,1.1],[36,14,.95]].forEach(([w,h,g],v)=>{const f=vo(6e4+v*137,{trunkLen:3.2*g,trunkRad:.32*g,maxLevel:2,leafScale:1.1*g});f.position.set(w+(r()-.5)*2,0,h+(r()-.5)*2),f.rotation.y=r()*Math.PI*2,i.add(f)});const m=[[-20,33],[-4,35],[20,30],[-16,42],[-6,45],[6,43],[16,46],[0,52],[-24,50],[24,48]];for(const[w,h]of m)c(w+(r()-.5)*3,h+(r()-.5)*3,1+r()*.9);const b=[[40,-10],[44,22],[52,-18],[60,8],[48,-2]];for(const[w,h]of b)c(w+(r()-.5)*3,h+(r()-.5)*3,.9+r()*.8);const u=[[-35,-30],[-45,0],[-38,20],[-30,40],[20,-40],[-10,-38]];for(const[w,h]of u)c(w+(r()-.5)*4,h+(r()-.5)*4,1.1+r()*1);for(const w of Vn(i))t.add(w);return{seaMat:n.material}}function Vr(t,e){const o=vo(31415,{trunkLen:4.6,trunkRad:.42,maxLevel:3,leafScale:1.4});o.position.set(7,0,14);for(const r of Vn(o))t.add(r);const n=new O(new ae(.42,.72,.45,9),new dt({map:fr(),normalMap:pr(),normalScale:new Bt(.9,.9),roughness:.95}));n.position.set(7,.22,14),n.castShadow=!0,t.add(n);const a=[];if(e.treeUplights)for(const[r,i]of[[5.6,13],[8.4,15]]){const l=new Ua(16756838,150,15,Math.PI/5,.9,1.8);l.position.set(r,.35,i);const c=new ja;c.position.set(7,7,14),t.add(c),l.target=c,l.castShadow=!1,t.add(l),a.push(l)}return{treeUplights:a}}function nn(t,e){const o=new qt,n=new ot(.16,.12);n.translate(-.09,0,0);const a=new ot(.16,.12);a.translate(.09,0,0);const r=new jt({color:e.color,side:xe}),i=new O(n,r),l=new O(a,r);i.rotation.x=-Math.PI/2,l.rotation.x=-Math.PI/2,o.add(i),o.add(l),t.add(o),Xo.push({update(c){const d=c*e.speed+e.phase,m=e.cx+Math.cos(d)*e.rx,b=e.cz+Math.sin(d*e.zRatio)*e.rz,u=e.cy+Math.sin(c*e.bobSpeed+e.phase)*e.bobAmp,w=-Math.sin(d)*e.rx*e.speed,h=Math.cos(d*e.zRatio)*e.rz*e.zRatio*e.speed;o.rotation.y=Math.atan2(w,h),o.position.set(m,u,b);const g=Math.sin(c*e.flapSpeed)*1.1;i.rotation.y=g,l.rotation.y=-g}})}function Kr(t,e){const o=new qt,n=new jt({color:2763310,side:xe}),a=new ot(1.6,.35);a.translate(-.8,0,0);const r=new ot(1.6,.35);r.translate(.8,0,0);const i=new O(a,n),l=new O(r,n);i.rotation.x=-Math.PI/2,l.rotation.x=-Math.PI/2,o.add(i),o.add(l),t.add(o),Xo.push({update(c){const d=c*e.speed+e.phase,m=e.cx+Math.cos(d)*e.radius,b=e.cz+Math.sin(d)*e.radius,u=e.cy+Math.sin(c*.3+e.phase)*2;o.rotation.y=-d-Math.PI/2,o.position.set(m,u,b);const w=Math.sin(c*e.flapSpeed+e.phase)*.55;i.rotation.y=w,l.rotation.y=-w}})}function Zr(t){const e=Ke(86420),o=[15241786,15979338,15262938,13070264,8368864];for(let n=0;n<5;n++)nn(t,{cx:7,cz:14,cy:1.4+e()*3,rx:1+e()*2.2,rz:1+e()*2.2,zRatio:.7+e()*.6,speed:.35+e()*.4,phase:e()*Math.PI*2,bobSpeed:1.5+e()*1.5,bobAmp:.3+e()*.3,flapSpeed:9+e()*5,color:o[n%o.length]});for(let n=0;n<4;n++)nn(t,{cx:-14+n*10+e()*4,cz:30+e()*8,cy:1.2+e()*2,rx:1.5+e()*3,rz:1.5+e()*3,zRatio:.6+e()*.8,speed:.3+e()*.35,phase:e()*Math.PI*2,bobSpeed:1.2+e()*1.6,bobAmp:.35+e()*.4,flapSpeed:8+e()*5,color:o[(n+2)%o.length]});for(let n=0;n<3;n++)Kr(t,{cx:20+e()*30,cz:-10+e()*40,cy:26+e()*12,radius:55+e()*45,speed:.04+e()*.03,phase:e()*Math.PI*2,flapSpeed:2.2+e()*1.2})}function qr(t,e){const o=new Gn(e.hemi.sky,e.hemi.ground,e.hemi.intensity);o.position.set(0,40,0),t.add(o);const n=new On(e.ambient.color,e.ambient.intensity);t.add(n);const a=new ee(e.sun.color,e.sun.intensity);a.position.set(...e.sun.pos),a.castShadow=!0,a.shadow.mapSize.set(2048,2048),a.shadow.bias=-5e-4,a.shadow.normalBias=.02;const r=e.shadowCamera;a.shadow.camera.left=r.left,a.shadow.camera.right=r.right,a.shadow.camera.top=r.top,a.shadow.camera.bottom=r.bottom,a.shadow.camera.near=r.near,a.shadow.camera.far=r.far,t.add(a),t.add(a.target);const i=new ee(e.fill.color,e.fill.intensity);return i.position.set(...e.fill.pos),t.add(i),{hemi:o,ambient:n,sun:a,fill:i}}function Jr(t){for(const e of Xo)e.update(t)}let _t=null,an=0;function Qr(t){an+=t,Jr(an),_t&&(_t.phase=(_t.phase+t/mr)%1,ta(_t,ea(_t.phase)))}function ti(t,e="daylight",o={}){const n=o.fullLights!==!1,a=e==="cycle",r=a?hr():0,i=a?gr(r):br(e);t.background=new Hn(i.background),t.fog=new Xn(i.fog.color,i.fog.near,i.fog.far);const l=$r(t,i,a),c=Wr(t,i);Yr(t);const d=Fr(t,i,n),m=Vr(t,i),b=d.downlights,u=qr(t,i);if(Zr(t),a){const w=new ee(Ht.night.sun.color,0);w.position.set(...Ht.night.sun.pos),t.add(w),t.add(w.target),_t={scene:t,phase:r,sunLight:u.sun,hemiLight:u.hemi,ambientLight:u.ambient,moonLight:w,seaMat:c.seaMat,downlights:b,treeUplights:m.treeUplights,skyDomes:l},u.sun.shadow.camera.updateProjectionMatrix(),ta(_t,ea(r))}else _t=null;return{bounds:{minX:z.minX+.6,maxX:z.maxX-.6,minZ:z.minZ+.6,maxZ:z.maxZ-.6}}}let ct=null,he=null,ue=!1;function ei(t,e){if(!ct)return;const o=new StereoPannerNode(ct,{pan:e});o.connect(he);const n=2+Math.floor(Math.random()*4);let a=ct.currentTime+.02;for(let r=0;r<n;r++){const i=ct.createOscillator(),l=ct.createGain();i.connect(l),l.connect(o);const c=t*(.85+Math.random()*.4),d=c*(Math.random()>.5?1.25:.78),m=.05+Math.random()*.1;i.type="sine",i.frequency.setValueAtTime(c,a),i.frequency.exponentialRampToValueAtTime(d,a+m),l.gain.setValueAtTime(1e-4,a),l.gain.exponentialRampToValueAtTime(.55,a+.012),l.gain.exponentialRampToValueAtTime(1e-4,a+m),i.start(a),i.stop(a+m+.02),a+=m+.04+Math.random()*.09}}function oi(){const t=ct.sampleRate*4,e=ct.createBuffer(1,t,ct.sampleRate),o=e.getChannelData(0);let n=0;for(let l=0;l<t;l++){const c=Math.random()*2-1;n=(n+.02*c)/1.02,o[l]=n*3.5}const a=ct.createBufferSource();a.buffer=e,a.loop=!0;const r=ct.createBiquadFilter();r.type="lowpass",r.frequency.value=400;const i=ct.createGain();i.gain.value=.012,a.connect(r),r.connect(i),i.connect(he),a.start()}function Eo(){if(!ue)return;const t=[{base:2600,pan:-.7},{base:3400,pan:.6},{base:4200,pan:.15}],e=t[Math.floor(Math.random()*t.length)];ei(e.base,e.pan+(Math.random()-.5)*.3);const o=900+Math.random()*4200;setTimeout(Eo,o)}function ni(){if(!ue)try{ct=new(window.AudioContext||window.webkitAudioContext),he=ct.createGain(),he.gain.value=.05,he.connect(ct.destination),ct.state==="suspended"&&ct.resume(),ue=!0,oi(),Eo(),setTimeout(()=>{ue&&Eo()},2500)}catch{ue=!1}}const se=2.5,rn=4.5,sn=.0022,ln=.0058,Le=xt.degToRad(89),ai=.03,ri=7.5,Te=60,Ct=.45,cn=.65,ii=12;function si(t,e){for(const o of z.stairs){const n=Math.min(o.x0,o.x1),a=Math.max(o.x0,o.x1);if(t<n||t>a)continue;const r=Math.min(o.z0,o.z1),i=Math.max(o.z0,o.z1);if(e<r||e>i)continue;const l=xt.clamp((e-o.z0)/(o.z1-o.z0),0,1);return o.yFrom+l*(o.yTo-o.yFrom)}return null}function li(t,e,o){return e>=t.x0&&e<=t.x1&&o>=t.z0&&o<=t.z1}function ci(t,e){return t>=z.minX&&t<=z.maxX&&e>=z.minZ&&e<=z.maxZ}function aa(t,e){const o=[],n=si(t,e);if(n!==null&&o.push(n),ci(t,e))for(const a of z.floors){const r=z.slabHoles[a.id]||[];let i=!1;for(const l of r)if(li(l,t,e)){i=!0;break}i||o.push(a.y)}else o.push(0);return o}function di(t,e,o){const n=aa(t,e);let a=null;for(const r of n)r<=o+cn&&(a===null||r>a)&&(a=r);return a===null||o-a>cn?null:a}function ui(t,e){let o=t,n=e;return e>z.minZ-Ct&&e<z.maxZ+Ct&&(o=xt.clamp(t,z.minX+Ct,z.maxX-Ct)),t>z.minX-Ct&&t<z.maxX+Ct&&(n=Math.max(e,z.minZ+Ct)),{x:o,z:n}}class pi{constructor(e,o){if(this.camera=e,this.domElement=o,this.enabled=!1,this.euler=new Fn(0,0,0,"YXZ"),this.camera.rotation.set(0,0,0),this.camera.rotation.order="YXZ",this.camera.position.set(0,Et,8),this.keys={forward:!1,backward:!1,left:!1,right:!1,run:!1},this.velocity=new Bt(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0,this.groundY=this.camera.position.y-Et,this.moveTouch=null,this.lookTouch=null,!document.getElementById("lu-joy-style")){const n=document.createElement("style");n.id="lu-joy-style",n.textContent=`
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
    inset 0 -2px 4px rgba(32,74,52,0.30); }`,document.head.appendChild(n)}this._joyBase=document.createElement("div"),this._joyBase.className="lu-joy-base",this._joyKnob=document.createElement("div"),this._joyKnob.className="lu-joy-knob",this._wasRunning=!1,document.body.appendChild(this._joyBase),document.body.appendChild(this._joyKnob),this._bindEvents()}_bindEvents(){this._onClick=()=>{this.enabled&&document.pointerLockElement!==this.domElement&&this.domElement.requestPointerLock?.()},this.domElement.addEventListener("click",this._onClick),this._onMouseMove=e=>{this.enabled&&document.pointerLockElement===this.domElement&&(this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=e.movementX*sn,this.euler.x-=e.movementY*sn,this.euler.x=xt.clamp(this.euler.x,-Le,Le),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler))},document.addEventListener("mousemove",this._onMouseMove),this._onKeyDown=e=>{if(!this.enabled)return;const o=e.target;o&&(o.tagName==="INPUT"||o.tagName==="TEXTAREA")||this._setKey(e.code,!0)},this._onKeyUp=e=>{this._setKey(e.code,!1)},document.addEventListener("keydown",this._onKeyDown),document.addEventListener("keyup",this._onKeyUp),this._onTouchStart=e=>{if(this.enabled){for(const o of e.changedTouches){const n=window.innerWidth*.5;o.clientX<n&&this.moveTouch===null?(this.moveTouch={id:o.identifier,startX:o.clientX,startY:o.clientY,dx:0,dy:0},this._joyBase.style.left=o.clientX+"px",this._joyBase.style.top=o.clientY+"px",this._joyKnob.style.left=o.clientX+"px",this._joyKnob.style.top=o.clientY+"px",this._joyBase.classList.add("lu-live"),this._joyKnob.classList.add("lu-live")):o.clientX>=n&&this.lookTouch===null&&(this.lookTouch={id:o.identifier,lastX:o.clientX,lastY:o.clientY})}e.cancelable&&e.preventDefault()}},this._onTouchMove=e=>{if(this.enabled){for(const o of e.changedTouches)if(this.moveTouch&&o.identifier===this.moveTouch.id){const n=o.clientX-this.moveTouch.startX,a=o.clientY-this.moveTouch.startY,r=Math.hypot(n,a),i=r>Te?Te/r:1;this.moveTouch.dx=n*i/Te,this.moveTouch.dy=a*i/Te,this._joyKnob.style.left=this.moveTouch.startX+n*i+"px",this._joyKnob.style.top=this.moveTouch.startY+a*i+"px";const l=Math.hypot(this.moveTouch.dx,this.moveTouch.dy)>.85;this._joyBase.classList.toggle("lu-run",l),this._joyKnob.classList.toggle("lu-run",l),l&&!this._wasRunning&&navigator.vibrate&&navigator.vibrate(10),this._wasRunning=l}else if(this.lookTouch&&o.identifier===this.lookTouch.id){const n=o.clientX-this.lookTouch.lastX,a=o.clientY-this.lookTouch.lastY;this.lookTouch.lastX=o.clientX,this.lookTouch.lastY=o.clientY,this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),this.euler.y-=n*ln,this.euler.x-=a*ln,this.euler.x=xt.clamp(this.euler.x,-Le,Le),this.euler.z=0,this.camera.quaternion.setFromEuler(this.euler)}e.cancelable&&e.preventDefault()}},this._onTouchEnd=e=>{for(const o of e.changedTouches)this.moveTouch&&o.identifier===this.moveTouch.id?(this.moveTouch=null,this._wasRunning=!1,this._joyBase.classList.remove("lu-live","lu-run"),this._joyKnob.classList.remove("lu-live","lu-run")):this.lookTouch&&o.identifier===this.lookTouch.id&&(this.lookTouch=null)},this.domElement.addEventListener("touchstart",this._onTouchStart,{passive:!1}),this.domElement.addEventListener("touchmove",this._onTouchMove,{passive:!1}),this.domElement.addEventListener("touchend",this._onTouchEnd),this.domElement.addEventListener("touchcancel",this._onTouchEnd)}_setKey(e,o){switch(e){case"KeyW":case"ArrowUp":this.keys.forward=o;break;case"KeyS":case"ArrowDown":this.keys.backward=o;break;case"KeyA":case"ArrowLeft":this.keys.left=o;break;case"KeyD":case"ArrowRight":this.keys.right=o;break;case"ShiftLeft":case"ShiftRight":this.keys.run=o;break}}_tryMove(e,o){const n=ui(e,o),a=xt.clamp(n.x,-24,Ce.bound),r=xt.clamp(n.z,-24,Ce.bound),i=z.maxZ,l=this.camera.position.z;if(a>z.minX-Ct&&a<z.maxX+Ct&&(l-i)*(r-i)<0&&Math.abs(a)>1.4)return null;const d=di(a,r,this.groundY);return d===null?null:{x:a,z:r,y:d}}update(e){if(!this.enabled)return;e=Math.min(e,.1);let o=0,n=0;this.keys.forward&&(n-=1),this.keys.backward&&(n+=1),this.keys.left&&(o-=1),this.keys.right&&(o+=1);let a=this.keys.run?rn:se;if(this.moveTouch&&o===0&&n===0){o=this.moveTouch.dx,n=this.moveTouch.dy;const p=Math.hypot(o,n);p<.14&&(o=0,n=0),a=se+(rn-se)*Math.min(1,Math.max(0,(p-.85)/.15))}else{const p=Math.hypot(o,n);p>1&&(o/=p,n/=p)}this.euler.setFromQuaternion(this.camera.quaternion,"YXZ");const r=this.euler.y,i=Math.sin(r),l=Math.cos(r),c=(o*l+n*i)*a,d=(-o*i+n*l)*a,m=1-Math.exp(-10*e);this.velocity.x+=(c-this.velocity.x)*m,this.velocity.y+=(d-this.velocity.y)*m;const b=this.camera.position,u=b.x+this.velocity.x*e,w=b.z+this.velocity.y*e;let h=this._tryMove(u,w);if(!h){const p=this._tryMove(u,b.z),B=this._tryMove(b.x,w);h=p||B||null}h&&(b.x=h.x,b.z=h.z,this.groundY=h.y);const g=Math.hypot(this.velocity.x,this.velocity.y);if(g>.3){this.bobPhase+=e*ri*(g/se);const p=Math.min(1,g/se);this.bobOffset=Math.sin(this.bobPhase)*ai*p}else this.bobOffset+=(0-this.bobOffset)*m,Math.abs(this.bobOffset)<5e-4&&(this.bobOffset=0,this.bobPhase=0);const v=Math.min(1,ii*e),f=this.groundY+Et+this.bobOffset+this.liftOffset;b.y+=(f-b.y)*v}resolveBodyCollisions(e){if(!this.enabled||!e||!e.length)return;const o=.6,n=1.2,a=this.camera.position;let r=a.x,i=a.z,l=!1,c=0,d=0;for(const u of e){if(!u||u.y!=null&&Math.abs(u.y-this.groundY)>n)continue;const w=r-u.x,h=i-u.z,g=Math.hypot(w,h);if(g>=o)continue;const v=g>1e-4?w/g:Math.sin(this.euler.y),f=g>1e-4?h/g:Math.cos(this.euler.y);r=u.x+v*o,i=u.z+f*o,c=v,d=f,l=!0}if(!l)return;const m=this._tryMove(r,i);m&&(a.x=m.x,a.z=m.z,this.groundY=m.y);const b=this.velocity.x*-c+this.velocity.y*-d;b>0&&(this.velocity.x+=c*b,this.velocity.y+=d*b)}getState(){return this.euler.setFromQuaternion(this.camera.quaternion,"YXZ"),{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z,ry:this.euler.y}}setPose({x:e,y:o,z:n,ry:a}){const r=xt.clamp(e,-24,Ce.bound),i=xt.clamp(n,-24,Ce.bound);let l;if(o!=null)l=o-Et;else{const c=aa(r,i);l=c.length?Math.max(...c):0}this.groundY=l,this.camera.position.set(r,l+Et,i),this.euler.set(0,a,0,"YXZ"),this.camera.quaternion.setFromEuler(this.euler),this.velocity.set(0,0),this.bobPhase=0,this.bobOffset=0,this.liftOffset=0}enable(){this.enabled=!0}disable(){this.enabled=!1,this.keys.forward=this.keys.backward=this.keys.left=this.keys.right=this.keys.run=!1,this.velocity.set(0,0),this.moveTouch=null,this.lookTouch=null,document.pointerLockElement===this.domElement&&document.exitPointerLock?.()}dispose(){this.disable(),this.domElement.removeEventListener("click",this._onClick),document.removeEventListener("mousemove",this._onMouseMove),document.removeEventListener("keydown",this._onKeyDown),document.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("touchstart",this._onTouchStart),this.domElement.removeEventListener("touchmove",this._onTouchMove),this.domElement.removeEventListener("touchend",this._onTouchEnd),this.domElement.removeEventListener("touchcancel",this._onTouchEnd)}}const fi=3,hi=6,dn=2.2,gi=.05;function bi({player:t,getSelfAvatar:e}){let o=!1,n=0,a=0,r=0;const i=h=>{if(h.code!=="Space"||!t||!t.enabled)return;const g=h.target;g&&(g.tagName==="INPUT"||g.tagName==="TEXTAREA")||(o=!0,h.preventDefault())},l=h=>{h.code==="Space"&&(o=!1)};document.addEventListener("keydown",i),document.addEventListener("keyup",l);let c=null;const d=typeof window<"u"&&window.matchMedia&&window.matchMedia("(pointer: coarse)").matches,m=h=>{o=!0,c&&c.classList.add("lu-fly-on"),h.cancelable&&h.preventDefault(),h.stopPropagation()},b=h=>{o=!1,c&&c.classList.remove("lu-fly-on"),h.stopPropagation()};d&&(c=document.createElement("button"),c.id="lu-fly-btn",c.type="button",c.setAttribute("aria-label","날기 — 누르고 있으면 상승"),c.textContent="▲",c.style.cssText=["position:fixed","right:20px","bottom:104px","width:64px","height:64px","border-radius:50%","border:1.5px solid rgba(255,255,255,0.34)","background:rgba(22,24,30,0.44)","color:rgba(255,255,255,0.92)","font-size:20px","line-height:1","z-index:6","display:none","align-items:center","justify-content:center","touch-action:none","user-select:none","-webkit-user-select:none","cursor:pointer","box-shadow:0 2px 12px rgba(0,0,0,0.32)","transition:background 0.12s, transform 0.12s, opacity 0.2s"].join(";"),c.addEventListener("touchstart",m,{passive:!1}),c.addEventListener("touchend",b),c.addEventListener("touchcancel",b),c.addEventListener("pointerdown",h=>{h.pointerType!=="touch"&&m(h)}),c.addEventListener("pointerup",h=>{h.pointerType!=="touch"&&b(h)}),document.body.appendChild(c));function u(h){const g=Math.min(h||0,.1),v=!!(t&&t.enabled);v||(o=!1),t&&t.liftOffset!==r&&(n=t.liftOffset,a=0),o?a=fi:(a-=hi*g,a<-5&&(a=-5)),n+=a*g,n>=dn&&(n=dn,a=0),n<=0&&(n=0,a=0),t&&(t.liftOffset=n,r=n);const f=v&&n>gi,p=e&&e();p&&typeof p.setFlying=="function"&&p.setFlying(f),c&&(c.style.display=v?"flex":"none")}function w(){document.removeEventListener("keydown",i),document.removeEventListener("keyup",l),c&&c.parentNode&&c.parentNode.removeChild(c)}return{update:u,dispose:w}}const mi="lu-stats-v1-",xi=3;function un(){const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}function wi(){return{totalVisits:0,days:{},dwell:{}}}class yi{key;_seen;data;_saveTimer;constructor(e){this.key=mi+String(e||"default"),this._seen=new Set,this.data=wi();try{const o=localStorage.getItem(this.key);if(o){const n=JSON.parse(o);n&&typeof n=="object"&&(this.data={totalVisits:n.totalVisits|0,days:n.days&&typeof n.days=="object"?n.days:{},dwell:n.dwell&&typeof n.dwell=="object"?n.dwell:{}})}}catch{}this._saveTimer=null}_save(){this._saveTimer||(this._saveTimer=setTimeout(()=>{this._saveTimer=null;try{localStorage.setItem(this.key,JSON.stringify(this.data))}catch{}},2e3))}addVisit(e){if(!e||this._seen.has(e))return;this._seen.add(e),this.data.totalVisits+=1;const o=un();this.data.days[o]=(this.data.days[o]|0)+1;const n=Object.keys(this.data.days).sort();for(;n.length>60;)delete this.data.days[n.shift()];this._save()}addDwell(e,o,n){if(!e||!e.length||!o||!o.length)return;let a=!1;for(const r of e){let i=null,l=xi;for(const c of o){const d=Math.hypot(c.pos.x-r.x,c.pos.z-r.z);d<l&&(l=d,i=c)}i&&i.title&&(this.data.dwell[i.title]=(this.data.dwell[i.title]||0)+n,a=!0)}a&&this._save()}summary(e){const n=[`오늘 방문 ${this.data.days[un()]|0}`,`누적 ${this.data.totalVisits}`];typeof e=="number"&&n.push(`방명록 ${e}`);const a=Object.entries(this.data.dwell).sort((r,i)=>i[1]-r[1])[0];if(a&&a[1]>=10){const r=a[1]>=60?`${Math.round(a[1]/60)}분`:`${Math.round(a[1])}초`;n.push(`인기작 「${a[0]}」 ${r}`)}return n.join(" · ")}}const ra="#5f9e7d";function vi(){const t=`
/* 폰트(@font-face·스택)는 SSOT인 vendor/fonts/fonts.css가 담당 — index.html <head>에서
   정적 <link>로 로드된다. 여기선 그 단일 스택(--app-font)만 --lu-font로 잇는다. */
:root {
  --lu-gold: ${ra};
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
`,e=document.createElement("style");e.id="lu-styles",e.textContent=t,document.head.appendChild(e)}function s(t,e={},o=[]){const n=document.createElement(t);for(const[a,r]of Object.entries(e))a==="className"?n.className=r:a==="text"?n.textContent=r:n.setAttribute(a,r);for(const a of o)n.appendChild(a);return n}const ki="lu-chibi-look::",Si="lu-chibi-thumb::",Ci="lu-chibi-closet::",Ei="lu-chibi-look-v1",Mi="lu-chibi-look-thumb-v1",pn=12;function eo(){const t=At();return t&&t.provider&&t.name?`${t.provider}:${t.name}`:"guest"}function Ze(t){return ki+(t||eo())}function Fo(t){return Si+(t||eo())}function ia(t){return Ci+(t||eo())}function Li(){try{const t=localStorage.getItem(Ei);if(t&&!localStorage.getItem(Ze("guest"))){localStorage.setItem(Ze("guest"),t);const e=localStorage.getItem(Mi);e&&localStorage.setItem(Fo("guest"),e)}}catch{}}Li();function sa(t){try{const e=localStorage.getItem(Ze(t));if(!e)return null;const o=JSON.parse(e);return o&&typeof o=="object"?o:null}catch{return null}}function Ti(t,e){try{return localStorage.setItem(Ze(e),JSON.stringify(t)),!0}catch{return!1}}function fn(t){try{return localStorage.getItem(Fo(t))||""}catch{return""}}function zi(t,e){try{localStorage.setItem(Fo(e),t)}catch{}}let Yo=null;function _i(t){Yo=t}function la(){return Yo||sa()}oa(()=>{Yo=null});function lo(t){try{const e=localStorage.getItem(ia(t));if(!e)return[];const o=JSON.parse(e);return Array.isArray(o)?o:[]}catch{return[]}}function hn(t,e){try{return localStorage.setItem(ia(e),JSON.stringify(t)),!0}catch{return!1}}function Ni(t,e,o){try{const n=document.createElement("canvas");return n.width=e,n.height=o,n.getContext("2d").drawImage(t,0,0,e,o),n.toDataURL("image/jpeg",.72)}catch{return""}}let nt=null,lt=null,Qt=null,ze=0,_e=!1,co=0,Ne=0,uo=Math.PI;const Ai=xt.degToRad(18),Ii=.6,gn='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 19.5C4.5 10 11 4 20 4c0 9-6 15.5-15.5 15.5A1 1 0 0 1 4.5 19.5Z"/><path d="M6.7 17.3C10.2 13.3 14.2 9.3 18 5.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>',Ri=[{id:"species",label:"종족",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8.3" r="2.1"/><circle cx="12" cy="6.1" r="2.1"/><circle cx="17" cy="8.3" r="2.1"/><path d="M12 11.6c-3.4 0-6.1 2.4-6.1 5.2 0 2 1.8 3.3 3.7 2.6.9-.3 1.7-.3 2.6 0 1.9.7 3.7-.6 3.7-2.6 0-2.8-2.5-5.2-5.9-5.2Z"/></svg>'},{id:"face",label:"얼굴",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><path d="M8.6 14.6c1 1.1 2.1 1.7 3.4 1.7s2.4-.6 3.4-1.7"/></svg>'},{id:"hair",label:"헤어",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12.5C5 8 8.1 4.5 12 4.5s7 3.5 7 8"/><path d="M6.3 12.5v3.2M10.1 12.5v4.2M13.9 12.5v4.2M17.7 12.5v3.2"/></svg>'},{id:"outfit",label:"의상",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8.3 4.2 4.3 7.3l2 3 2-1.1v9.6h7.4V9.2l2 1.1 2-3-4-3.1c-.7 1-1.8 1.6-3.7 1.6s-3-.6-3.7-1.6Z"/></svg>'},{id:"acc",label:"장식",icon:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.5 3.5 1.7 6.3 5.2 7.6-3.5 1.3-4.7 4.1-5.2 7.6-.5-3.5-1.7-6.3-5.2-7.6C10.3 9.3 11.5 6.5 12 3Z"/><circle cx="19" cy="5.2" r="1.2"/></svg>'},{id:"closet",label:"옷장",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.3"/><path d="M12 5.9v1.8"/><path d="M12 7.7 4.3 13.4h15.4L12 7.7Z"/><path d="M4.3 17.4h15.4"/></svg>'}];function Pi(t){const{els:e,state:o,callbacks:n,setStatus:a}=t,r=s("button",{id:"lu-am-save",type:"button","aria-label":"이 캐릭터 사용",title:"이 캐릭터 사용",text:"✓"}),i=s("button",{id:"lu-am-close",type:"button","aria-label":"닫기",text:"×"}),l=s("span",{className:"lu-am-title-icon","aria-hidden":"true"});l.innerHTML=gn;const c=s("div",{className:"lu-am-title"},[l,s("span",{text:"캐릭터 디자인"})]),d=s("div",{className:"lu-am-head-actions"},[r,i]),m=s("div",{className:"lu-am-head"},[c,d]),b=s("canvas",{width:"300",height:"400"}),u=s("div",{className:"lu-am-stage"},[b]),w=s("div",{className:"lu-am-stagewrap"},[u]),h=s("div",{className:"lu-am-preview"},[w]),g=["wave","jump","clap","dance","breakdance","run","jumpingjack","heart","kick"];let v=1,f=null,p=null,B=null,_=null;function H(C,R){if(typeof document>"u")return null;const T=document.createElement("canvas");T.width=2,T.height=256;const G=T.getContext("2d"),P=G.createLinearGradient(0,0,0,256);P.addColorStop(0,C),P.addColorStop(1,R),G.fillStyle=P,G.fillRect(0,0,2,256);const $=new be(T);return $.colorSpace=Pt,$}function A(C,R){if(typeof document>"u")return null;const T=512,G=307,P=document.createElement("canvas");P.width=T,P.height=G;const $=P.getContext("2d");$.fillStyle=C,$.fillRect(0,0,T,G);const ht=28,Lt=T/ht;$.fillStyle=R;for(let ie=0;ie<ht;ie++)$.fillRect(ie*Lt,0,Lt/2,G);const re=new be(P);return re.colorSpace=Pt,re.anisotropy=4,re}function F(){if(f)return;f=new Yn({canvas:b,antialias:!0,alpha:!0}),f.setPixelRatio(Math.min(2,typeof window<"u"&&window.devicePixelRatio||1)),f.setSize(300,400,!1),f.shadowMap.enabled=!0,f.shadowMap.type=Wa,f.toneMapping=Un,f.toneMappingExposure=1,f.outputColorSpace=Pt,p=new jn,p.background=H("#f0ead9","#ddd2bd")||new Hn("#ddd2bd"),p.fog=new Xn(14603199,5.5,10),B=new $n(30,300/400,.1,20),B.position.set(0,1,4),B.lookAt(0,.85,0),p.add(new Gn(16775924,2367256,.65));const C=new ee(16777215,1.4);C.position.set(.7,2,2.6),p.add(C);const R=new ee(16776696,.4);R.position.set(-1.8,1.1,1.6),p.add(R);const T=new ee(16777215,0);T.position.set(.4,5,1),T.castShadow=!0,T.shadow.mapSize.set(512,512),T.shadow.camera.near=.5,T.shadow.camera.far=9,T.shadow.camera.left=-1.3,T.shadow.camera.right=1.3,T.shadow.camera.top=1.3,T.shadow.camera.bottom=-1.3,T.shadow.radius=35,T.shadow.blurSamples=24,T.shadow.bias=-5e-4,p.add(T),p.add(T.target);const G=new O(new ot(6,6),new dt({color:12165231,roughness:.9,metalness:0}));G.rotation.x=-Math.PI/2,G.position.y=0,G.receiveShadow=!0,p.add(G);const P=new O(new ot(6,6),new Va({opacity:.3}));P.rotation.x=-Math.PI/2,P.position.y=.002,P.material.polygonOffset=!0,P.material.polygonOffsetFactor=-1,P.receiveShadow=!0,p.add(P);const $=A("#e2d7bf","#efe7d3"),ht=new O(new ot(10,6),new dt({map:$,roughness:.9,metalness:0}));ht.position.set(0,2.2,-2.3),p.add(ht),_=new qt,_.rotation.y=Math.PI,p.add(_)}let y="species";const S=s("div",{className:"lu-am-nav",role:"tablist","aria-label":"캐릭터 디자인 카테고리"}),N=s("div",{className:"lu-am-panel"}),I=s("div",{className:"lu-am-tabpage",id:"lu-am-tabpanel",role:"tabpanel",tabindex:"0"});N.appendChild(S),N.appendChild(I),S.addEventListener("keydown",C=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(C.key))return;const R=[...S.querySelectorAll(".lu-am-navtab")];if(!R.length)return;const T=R.findIndex($=>$.getAttribute("aria-selected")==="true");let G=T<0?0:T;C.key==="ArrowLeft"?G=(T-1+R.length)%R.length:C.key==="ArrowRight"?G=(T+1)%R.length:C.key==="Home"?G=0:C.key==="End"&&(G=R.length-1),C.preventDefault(),R[G].click();const P=S.querySelectorAll(".lu-am-navtab")[G];P&&P.focus()});const E=s("div",{className:"lu-am-body"},[h,N]),D=s("div",{className:"lu-am-card"},[m,E]),M=s("div",{id:"lu-chibi-maker",className:"lu"},[D]);document.body.appendChild(M);function k(C,R){nt&&(nt[C]=R,C==="species"&&R!=="human"&&Jo[R]&&Object.assign(nt,Jo[R]),nt=io(nt),ao(),Jt())}function L(C){nt=io(Object.assign({},C)),ao(),Jt()}function Y(){for(const C of yr){const R=vr.filter(G=>(G.cat||"human")===C.id);if(!R.length)continue;I.appendChild(s("div",{className:"lu-am-section-title",text:`${C.name} (${R.length})`}));const T=s("div",{className:"lu-am-tabs lu-am-presets"});for(const G of R){const P=s("button",{type:"button",className:"lu-am-tab lu-am-preset"}),$=G.look.skin||Fe.skin,ht=G.look.top||G.look.hairColor||Fe.top,Lt=s("span",{className:"lu-am-preset-dot","aria-hidden":"true"});Lt.style.background=`conic-gradient(${$} 0deg 180deg, ${ht} 180deg 360deg)`,P.appendChild(Lt),P.appendChild(s("span",{className:"lu-am-preset-label",text:G.name})),P.addEventListener("click",()=>L(G.look)),T.appendChild(P)}I.appendChild(T)}}function j(C){const R=Qo.find(T=>T.id===C);return R&&R.name||"아야모"}function q(){if(!At())return;const C=eo();rt("내 옷장");const R=s("button",{type:"button",className:"lu-am-btn lu-closet-save",text:"＋ 지금 모습 옷장에 저장"});R.addEventListener("click",()=>{const P=lo(C);if(P.length>=pn){a(`옷장은 최대 ${pn}벌까지 저장할 수 있어요`);return}const $={id:"c"+Date.now(),name:j(nt.species),look:JSON.parse(JSON.stringify(nt)),thumb:Ko(120,160),ts:Date.now()};if(P.push($),!hn(P,C)){a("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요");return}Jt()}),I.appendChild(R);const T=lo(C);if(!T.length){I.appendChild(s("div",{className:"lu-closet-empty",text:"아직 저장한 옷이 없어요. 마음에 드는 모습을 저장해 두세요."}));return}const G=s("div",{className:"lu-closet-grid"});T.forEach(P=>{const $=s("div",{className:"lu-closet-cell"}),ht=s("button",{type:"button",className:"lu-closet-load",title:`${P.name} 불러오기`,"aria-label":`${P.name} 불러오기`});P.thumb&&(ht.style.backgroundImage=`url('${P.thumb}')`),ht.appendChild(s("span",{className:"lu-closet-name",text:P.name})),ht.addEventListener("click",()=>L(P.look));const Lt=s("button",{type:"button",className:"lu-closet-del",text:"×",title:"삭제","aria-label":`${P.name} 삭제`});Lt.addEventListener("click",re=>{re.stopPropagation();const ie=lo(C).filter(Ga=>Ga.id!==P.id);hn(ie,C),Jt()}),$.appendChild(ht),$.appendChild(Lt),G.appendChild($)}),I.appendChild(G)}const W=(C,R)=>[{id:!1,name:C},{id:!0,name:R}];function Z(C,R,T){I.appendChild(s("div",{className:"lu-am-section-title",text:C}));const G=s("div",{className:"lu-am-tabs"});R.forEach(P=>{const $=s("button",{type:"button",className:"lu-am-tab"+(nt[T]===P.id?" lu-selected":""),text:P.name});$.addEventListener("click",()=>k(T,P.id)),G.appendChild($)}),I.appendChild(G)}function J(C,R,T){I.appendChild(s("div",{className:"lu-am-section-title",text:C}));const G=s("div",{className:"lu-swatches"});R.forEach(P=>{const $=s("button",{type:"button",className:"lu-swatch"+(nt[T]===P?" lu-selected":""),style:`background:${P};`,title:P,"aria-label":`${C} ${P}`});$.addEventListener("click",()=>k(T,P)),G.appendChild($)}),I.appendChild(G)}function rt(C){const R=s("div",{className:"lu-am-group-title"}),T=s("span",{className:"lu-am-group-icon","aria-hidden":"true"});T.innerHTML=gn,R.appendChild(T),R.appendChild(s("span",{text:C})),I.appendChild(R)}function ye(){S.textContent="";const C=!!At(),R=Ri.filter(T=>T.id!=="closet"||C);R.some(T=>T.id===y)||(y="species"),R.forEach(T=>{const G=y===T.id,P=s("button",{type:"button",role:"tab",id:"lu-am-tab-"+T.id,className:"lu-am-navtab"+(G?" lu-selected":""),"aria-selected":G?"true":"false","aria-controls":"lu-am-tabpanel",tabindex:G?"0":"-1","aria-label":T.label});P.innerHTML=T.icon,P.appendChild(s("span",{className:"lu-am-navtab-label",text:T.label})),P.addEventListener("click",()=>{y!==T.id&&(y=T.id,Jt(),I.scrollTop=0)}),S.appendChild(P)}),I.setAttribute("aria-labelledby","lu-am-tab-"+y)}function Jt(){if(ye(),I.textContent="",!nt)return;const C=nt.species&&nt.species!=="human";y==="species"?(Y(),rt(C?"종족 · 털색":"종족 · 성별 · 피부색"),Z("종족",Qo,"species"),C||Z("성별",kr,"gender"),J(C?"털 색":"피부색",Sr,"skin")):y==="face"?(rt("얼굴"),Z("얼굴형",Cr,"face"),Z("눈",Er,"eyeStyle"),Z("입",Mr,"mouth"),C||Z("수염",Lr,"beardStyle"),Z("볼터치",W("없음","있음"),"blush"),J("눈동자 색",Tr,"eyeColor")):y==="hair"?C?(rt("포인트"),J("귀·꼬리 색",tn,"hairColor")):(rt("헤어"),Z("헤어",zr,"hairStyle"),J("머리 색",tn,"hairColor")):y==="outfit"?(rt("의상"),Z("상의 패턴",_r,"pattern"),Z("의상 세트",Nr,"outfit"),Z("하의",Ar,"bottomType"),J("상의 색",so,"top"),J("하의 색",so,"bottom"),J("신발 색",so,"shoes")):y==="acc"?(rt("장식"),Z("머리 장식",Ir,"acc"),Z("안경",W("없음","착용"),"glasses"),Z("헤일로",W("없음","있음"),"halo"),Z("날개",W("없음","있음"),"wings"),Z("가슴 하트",W("없음","있음"),"heart")):y==="closet"&&q()}function ao(){!nt||!_||(lt&&(_.remove(lt.group),lt.dispose(),lt=null),lt=Ho(Co(nt),ra," ",{blobShadow:!1}),lt.group.traverse(C=>{C.isMesh&&(C.castShadow=!0)}),_.add(lt.group))}function Wo(C){Qt=requestAnimationFrame(Wo);const R=ze?(C-ze)/1e3:0,T=Math.min(.1,R);if(ze=C,!_e&&(Ne+=T,_.rotation.y=uo+Math.sin(Ne*Ii)*Ai,v-=R,v<=0&&lt&&typeof lt.playAction=="function")){const G=g[Math.floor(Math.random()*g.length)];lt.playAction(G),v=(Rr[G]||1.5)+.6+Math.random()*.9}lt&&lt.update(T,0),f.render(p,B)}function Pa(){Qt||(ze=0,Qt=requestAnimationFrame(Wo))}function Ba(){Qt&&cancelAnimationFrame(Qt),Qt=null}b.addEventListener("pointerdown",C=>{_e=!0,co=C.clientX,h.classList.add("lu-dragging"),b.setPointerCapture(C.pointerId)}),b.addEventListener("pointermove",C=>{_e&&(_.rotation.y+=(C.clientX-co)*.012,co=C.clientX)});const Vo=()=>{_e=!1,h.classList.remove("lu-dragging"),uo=_.rotation.y,Ne=0};b.addEventListener("pointerup",Vo),b.addEventListener("pointercancel",Vo),i.addEventListener("click",()=>ve()),M.addEventListener("click",C=>{C.target===M&&ve()});function Ko(C,R){try{return f?(f.render(p,B),Ni(b,C,R)||f.domElement.toDataURL("image/png")):""}catch{return""}}function Oa(){const R=!!At()?"저장하고 사용":"이 캐릭터 사용";r.setAttribute("aria-label",R),r.title=R}r.addEventListener("click",()=>{if(!nt)return;const C=JSON.parse(JSON.stringify(nt));_i(C);const R=!!At();if(R){const T=Ti(C),G=Ko(150,200);G&&zi(G),T||a("저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요")}e&&e.lobby&&e.lobby.onChibiSaved(),o.entered&&typeof n.onAvatarChange=="function"&&n.onAvatarChange(Co(C)),R||a("이 캐릭터로 적용했어요 · 회원가입하면 저장돼요"),ve()});function Da(){y="species",nt=io(Object.assign({},Fe,la()||{})),Oa(),F(),_.rotation.y=Math.PI,uo=Math.PI,Ne=0,v=1,ao(),Jt(),M.classList.add("lu-open"),o.chibiOpen=!0,Pa(),typeof n.onMakerToggle=="function"&&n.onMakerToggle(!0)}function ve(){M.classList.remove("lu-open"),o.chibiOpen=!1,Ba(),lt&&(_.remove(lt.group),lt.dispose(),lt=null),typeof n.onMakerToggle=="function"&&n.onMakerToggle(!1)}return{open:Da,close:ve}}const Bi=8,Ae=12;let x=null,it={onEnter:null,onChatSend:null,onAvatarChange:null,onMakerToggle:null},bn=ko[0];const oe={chibiOpen:!1,entered:!1};let Mo=null,mn=!1,$t=!1,Lo=null,Ft=null,Wt=!1,To=null,Vt=!1,zo=null,qe=null;const Ie=120;let St={onPrev:null,onNext:null,onExit:null,onToggleAuto:null};const Kt=typeof window<"u"&&"ontouchstart"in window||typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches;let wt={onTour:null,onViewArtwork:null,onGuestbook:null,onCapture:null,onSelfView:null},Zt=!1,ut={blob:null,dataUrl:"",galleryName:"",shareUrl:""},Yt=null,Je=null,It=null,Qe=null;function Oi(){const t=s("div",{id:"lu-loading",className:"lu"},[s("div",{className:"lu-spinner"}),s("div",{className:"lu-loading-text",text:"MUSEUM LOADING..."})]);return document.body.appendChild(t),t}function Di(){const t=s("div",{className:"lu-lobby-title",text:"OpenArtShow MUSEUM"}),e=s("div",{className:"lu-lobby-sub",text:"VIRTUAL EXHIBITION"}),o=s("div",{className:"lu-lobby-rule"}),n=s("div",{id:"lu-auth"}),a=s("div",{className:"lu-social-wrap"}),r=s("div",{className:"lu-logged-wrap"}),i=()=>{a.textContent="";for(const E of Object.keys(Ee)){const D=Ee[E],M=s("button",{className:`lu-social-btn lu-social-${E}`,type:"button"},[s("span",{className:"lu-social-badge",text:D.short}),s("span",{text:D.label})]);M.addEventListener("click",async()=>{M.disabled=!0,M.classList.add("lu-social-busy");try{await Pr(E)}catch{}M.disabled=!1,M.classList.remove("lu-social-busy")}),a.appendChild(M)}a.appendChild(s("div",{className:"lu-social-note",text:"계정 연동 준비 중 — 지금은 프로필 미리보기로 동작합니다"}))},l=E=>{r.textContent="";const D=s("span",{className:"lu-logged-avatar",text:E.initial||E.name.slice(0,1)}),M=s("span",{className:"lu-logged-name",text:`${E.name}님`}),k=s("span",{className:"lu-logged-via",text:Ee[E.provider]?Ee[E.provider].short:""}),L=s("button",{className:"lu-logout-btn",type:"button",text:"로그아웃"});L.addEventListener("click",()=>Or()),r.appendChild(s("div",{className:"lu-logged-chip"},[D,M,k,L]))},c=E=>{E?(l(E),a.style.display="none",r.style.display="",b.value=E.name.slice(0,Ae)):(a.style.display="",r.style.display="none",(!b.value||Object.values(Br).includes(b.value))&&(b.value="게스트")),g()};i(),n.appendChild(a),n.appendChild(r);const d=s("div",{className:"lu-auth-or"},[s("span",{text:"소셜 계정 연동 (준비 중)"})]),m=s("label",{className:"lu-field-label",for:"lu-nickname",text:"닉네임"}),b=s("input",{id:"lu-nickname",type:"text",maxlength:String(Ae),value:"게스트",autocomplete:"off",spellcheck:"false"}),u=s("div",{className:"lu-field-hint",text:`최대 ${Ae}자 · 비워두면 '게스트'로 입장합니다`}),w=s("div",{className:"lu-field-label",text:"캐릭터",style:"margin-top:26px;"}),h=s("button",{id:"lu-char-design",className:"lu-char-design-btn",type:"button","aria-label":"캐릭터 디자인 — 나만의 아야모 만들기"});function g(){const E=fn();h.textContent="";const D=s("span",{className:"lu-char-design-media"});E?(D.classList.add("lu-has-thumb"),D.style.backgroundImage=`url('${E}')`):D.textContent="🎨";const M=s("span",{className:"lu-char-design-txt"},[s("b",{text:"캐릭터 디자인"}),s("span",{text:E?"내 아야모 편집하기":"나만의 아야모 만들기 (선택)"})]);h.append(D,M,s("span",{className:"lu-char-design-arrow",text:"›"}))}g(),h.addEventListener("click",()=>Uo());const v=s("button",{id:"lu-enter-btn",type:"button",text:"입장하기"}),f=s("div",{id:"lu-picker"}),p=s("div",{className:"lu-lobby-divider"}),B=s("a",{className:"lu-studio-link",href:"./studio.html",target:"_blank",rel:"noopener noreferrer",text:"작가 스튜디오에서 나만의 전시 만들기 →"}),_=s("div",{className:"lu-lobby-form"},[m,b,u,w,h,v,d,n]),H=s("div",{className:"lu-quick-enter"});function A(){H.textContent="";const E=At(),D=fn(),M=s("span",{className:"lu-quick-avatar"});D?M.style.backgroundImage=`url('${D}')`:M.textContent="🙂";const k=s("div",{className:"lu-quick-greet"},[s("b",{text:(E?`${E.name}님, `:"")+"다시 오셨어요"}),s("span",{text:"저장한 모습으로 바로 입장할 수 있어요"})]),L=s("button",{className:"lu-quick-btn",type:"button",text:"바로 입장"});L.addEventListener("click",N);const Y=s("button",{className:"lu-quick-change",type:"button",text:"닉네임·캐릭터 바꾸기"});Y.addEventListener("click",()=>{_.classList.remove("lu-collapsed"),H.style.display="none";try{b.focus()}catch{}}),H.append(M,k,L,Y)}!!(At()||sa())?(A(),_.classList.add("lu-collapsed")):H.style.display="none";const y=s("div",{className:"lu-lobby-card"},[t,e,o,H,_,f,p,B]),S=s("div",{id:"lu-lobby",className:"lu"},[y]);document.body.appendChild(S),c(At()),oa(c);function N(){let E=b.value.trim().slice(0,Ae);E||(E="게스트");let D=0;for(let k=0;k<E.length;k++)D=D*31+E.charCodeAt(k)>>>0;bn=ko[D%ko.length];const M=Co(Object.assign({},Fe,la()||{}));typeof it.onEnter=="function"&&it.onEnter({nickname:E,color:bn,char:M})}v.addEventListener("click",N),b.addEventListener("keydown",E=>{E.stopPropagation(),E.key==="Enter"&&N()}),b.addEventListener("keyup",E=>E.stopPropagation());function I(){g()}return{overlay:S,nickInput:b,pickerBox:f,onChibiSaved:I}}function Gi(){const t=Kt?[["왼쪽 드래그","이동"],["오른쪽 드래그","시점 회전"],["캐릭터 탭","콕 찌르기"],["작품 카드","탭하여 크게 보기"]]:[["마우스 드래그","시점 회전"],["W A S D","이동"],["Shift","달리기"],["Enter","채팅"],["M","작품 목록"],["T","투어"],["G","방명록"],["V","내 모습 보기"],["C","캐릭터 디자인"],["P","사진 촬영"],["클릭","캐릭터 콕 찌르기"]],e=s("div",{id:"lu-controls",className:"lu lu-hud"});if(e.appendChild(s("div",{className:"lu-controls-title",text:"CONTROLS"})),t.forEach(([o,n])=>{const a=s("div",{},[s("span",{className:"lu-key",text:o}),s("span",{text:n})]);e.appendChild(a)}),document.body.appendChild(e),Kt){e.classList.add("lu-collapsed");const o=s("button",{id:"lu-controls-toggle",className:"lu lu-hud",type:"button","aria-label":"조작법 보기",text:"?"});o.addEventListener("click",()=>{e.classList.toggle("lu-collapsed")}),document.body.appendChild(o)}return e}function Hi(){if(!Kt)return null;function t(){const p=x&&x.chat&&x.chat.wrap;if(!p)return;const B=p.classList.toggle("lu-chat-collapsed");!B&&x.chat.input?x.chat.input.focus():x.chat.input&&x.chat.input.blur(),r.classList.toggle("lu-on",!B)}const e={chat:'<path d="M20 15a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',tour:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z"/>',capture:'<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',more:'<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',list:'<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',self:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',help:'<path d="M9.2 9a2.9 2.9 0 1 1 4.2 2.6c-.9.45-1.4 1.05-1.4 2.1"/><circle cx="12" cy="17.4" r="1" fill="currentColor" stroke="none"/>',dress:'<path d="M9 4l3 3 3-3M9 4l-1.5 5 4.5 3 4.5-3L18 4M7.5 9l-2 8h13l-2-8"/>'};function o(p){const B=document.createElement("span");return B.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+e[p]+"</svg>",B.firstChild}function n(p,B,_,H){const A=s("button",{className:p,type:"button","aria-label":B});A.appendChild(o(_)),A.appendChild(s("span",{className:"lu-dock-label",text:H}));const F=s("div",{className:"lu-dock-wrap"},[A]);return{b:A,wrap:F}}const a=n("lu-dock-btn","채팅 열기/닫기","chat","채팅"),r=a.b;a.wrap.style.display="none",r.addEventListener("click",t);const i=n("lu-dock-btn","투어 시작/종료","tour","투어"),l=i.b;l.addEventListener("click",()=>{typeof wt.onTour=="function"&&wt.onTour()});const c=n("lu-dock-btn lu-gold","사진 촬영","capture","캡처"),d=c.b;d.addEventListener("click",()=>{d.classList.remove("lu-cap-pop"),d.offsetWidth,d.classList.add("lu-cap-pop"),typeof wt.onCapture=="function"&&wt.onCapture()});const m=n("lu-dock-btn","더보기","more","메뉴"),b=m.b,u=s("div",{id:"lu-more-backdrop"}),w=s("div",{id:"lu-more-sheet"});function h(){w.classList.remove("lu-open"),u.classList.remove("lu-open")}function g(p,B,_){const H=s("button",{className:"lu-sheet-btn",type:"button"});return H.appendChild(o(p)),H.appendChild(s("span",{text:B})),H.addEventListener("click",()=>{h(),_()}),H}const v=s("div",{className:"lu-sheet-grid"},[g("list","작품 목록",()=>ba()),g("self","내 모습",()=>{typeof wt.onSelfView=="function"&&wt.onSelfView()}),g("dress","캐릭터 디자인",()=>Uo()),g("chat","채팅",t),g("help","조작법",()=>{const p=document.getElementById("lu-controls");p&&p.classList.toggle("lu-collapsed")})]);w.append(s("div",{className:"lu-sheet-handle"}),v),u.addEventListener("click",h),b.addEventListener("click",()=>{const p=w.classList.toggle("lu-open");u.classList.toggle("lu-open",p)}),document.body.appendChild(u),document.body.appendChild(w);const f=s("div",{id:"lu-dock",className:"lu lu-hud"},[a.wrap,i.wrap,c.wrap,m.wrap]);return document.body.appendChild(f),Ut={chatBtn:r,chatWrap:a.wrap,tourBtn:l,selfBtn:null,dock:f},f}let Ut=null;function _o(t,e){Ut&&t==="tour"&&Ut.tourBtn&&Ut.tourBtn.classList.toggle("lu-on",!!e)}function Xi(){const t=s("span",{text:"--"}),e=s("div",{className:"lu-stat"});e.append("FPS ");const o=s("b");o.appendChild(t),e.appendChild(o);const n=s("div",{id:"lu-topright",className:"lu lu-hud"},[e]);return document.body.appendChild(n),{wrap:n,fps:t,count:s("span"),countWrap:null}}function Fi(){const t=s("div",{id:"lu-status",className:"lu lu-hud"});return document.body.appendChild(t),t}function Yi(){const t=s("div",{id:"lu-chat-log"}),e=s("input",{id:"lu-chat-input",type:"text",maxlength:"120",placeholder:Kt?"탭하여 채팅…":"Enter 키로 채팅…",autocomplete:"off",spellcheck:"false"}),o=s("div",{id:"lu-chat",className:"lu lu-hud"},[t,e]);return Kt&&o.classList.add("lu-chat-collapsed"),document.body.appendChild(o),e.addEventListener("keydown",n=>{if(n.stopPropagation(),n.key==="Enter"){const a=e.value.trim();e.value="",e.blur(),a&&typeof it.onChatSend=="function"&&it.onChatSend(a)}else n.key==="Escape"&&(e.value="",e.blur())}),e.addEventListener("keyup",n=>n.stopPropagation()),e.addEventListener("keypress",n=>n.stopPropagation()),{wrap:o,log:t,input:e}}function Ui(){const t=s("div",{className:"lu-art-eyebrow",text:"ARTWORK"}),e=s("div",{className:"lu-art-title"}),o=s("div",{className:"lu-art-meta"}),n=s("div",{className:"lu-art-rule"}),a=s("div",{className:"lu-art-desc"}),r=s("button",{className:"lu-art-hint",type:"button"});Kt?r.appendChild(document.createTextNode("크게 보기")):(r.appendChild(s("span",{className:"lu-key",text:"E"})),r.appendChild(document.createTextNode(" — 크게 보기"))),r.addEventListener("click",l=>{l.stopPropagation(),typeof wt.onViewArtwork=="function"&&wt.onViewArtwork()});const i=s("div",{id:"lu-artwork",className:"lu"},[t,e,o,n,a,r]);return Kt&&i.addEventListener("click",()=>{typeof wt.onViewArtwork=="function"&&wt.onViewArtwork()}),document.body.appendChild(i),{panel:i,title:e,meta:o,desc:a}}function ji(){const t=s("span",{className:"lu-topbar-title"}),e=s("b",{text:"1"}),o=s("span",{className:"lu-topbar-count"});o.appendChild(e),o.append(" 명");const n=s("div",{id:"lu-topbar",className:"lu lu-hud lu-cut-s lu-empty"},[t,s("span",{className:"lu-topbar-sep"}),o]);return document.body.appendChild(n),n._count=e,n._countWrap=o,n}function $i(){const t=s("button",{id:"lu-lightbox-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{className:"lu-lightbox-stage"}),o=s("div",{className:"lu-lightbox-title"}),n=s("div",{className:"lu-lightbox-meta"}),a=s("div",{className:"lu-lightbox-rule"}),r=s("div",{className:"lu-lightbox-desc"}),i=s("div",{className:"lu-lightbox-caption"},[o,n,a,r]),l=s("div",{id:"lu-lightbox",className:"lu"},[t,e,i]);document.body.appendChild(l),t.addEventListener("click",()=>Ye()),l.addEventListener("click",A=>{(A.target===l||A.target===e)&&Ye()});const c=new Map;let d=1,m=0,b=0,u=0,w=1,h=0,g=0,v=0,f=null;function p(){return e.querySelector(".lu-lightbox-media")}function B(){const A=p();A&&(A.style.transform=`translate(${m}px, ${b}px) scale(${d})`)}function _(){d=1,m=0,b=0,B()}l.addEventListener("pointerdown",A=>{if(c.set(A.pointerId,{x:A.clientX,y:A.clientY}),c.size===1&&(f={x:A.clientX,y:A.clientY,t:performance.now()}),c.size===2){const[F,y]=[...c.values()];u=Math.hypot(F.x-y.x,F.y-y.y),w=d}}),l.addEventListener("pointermove",A=>{const F=c.get(A.pointerId);if(!F)return;const y=A.clientX-F.x,S=A.clientY-F.y;if(F.x=A.clientX,F.y=A.clientY,c.size===2&&u>0){const[N,I]=[...c.values()];d=Math.min(4,Math.max(1,w*(Math.hypot(N.x-I.x,N.y-I.y)/u))),d===1&&(m=0,b=0),B()}else c.size===1&&d>1&&(m+=y,b+=S,B())});function H(A){if(c.delete(A.pointerId),c.size!==0||!f)return;const F=performance.now()-f.t,y=A.clientX-f.x,S=A.clientY-f.y;if(f=null,d===1&&F<600){if(Math.abs(y)>64&&Math.abs(S)<56){Wi(y<0?1:-1);return}if(S>84&&Math.abs(y)<60){Ye();return}}if(Math.abs(y)<12&&Math.abs(S)<12&&F<350){const N=performance.now();if(N-h<320&&Math.hypot(A.clientX-g,A.clientY-v)<44){d>1?_():(d=2.4,B()),h=0;return}h=N,g=A.clientX,v=A.clientY}}return l.addEventListener("pointerup",H),l.addEventListener("pointercancel",A=>c.delete(A.pointerId)),{overlay:l,closeBtn:t,stage:e,title:o,meta:n,rule:a,desc:r,resetZoom:_}}let No=null;function Wi(t){const e=Ve();if(!No||e.length<2)return;const o=e.indexOf(No),n=e[((o===-1?0:o)+t+e.length)%e.length];ga(n)}const xn="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#eaeae6"/></svg>');function ca(t){const e=x.artworkList.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(s("div",{className:"lu-artlist-empty",text:"표시할 작품이 없습니다"}));return}t.forEach(o=>{const n=s("img",{className:"lu-artlist-thumb",src:o.imageUrl||xn,alt:o.title||"",loading:"lazy"});n.addEventListener("error",()=>{n.src=xn},{once:!0});const a=s("div",{className:"lu-artlist-info"},[s("div",{className:"lu-artlist-name",text:o.title||""}),s("div",{className:"lu-artlist-artist",text:o.artist||""})]),r=s("button",{type:"button",className:"lu-artlist-card"},[n,a]);r.addEventListener("click",()=>{we(),typeof To=="function"&&To(o)}),e.appendChild(r)})}function Vi(){const t=s("button",{id:"lu-artlist-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{id:"lu-artlist-head"},[s("div",{id:"lu-artlist-title",text:"작품 목록"}),t]),o=s("div",{id:"lu-artlist-body"}),n=s("div",{id:"lu-artlist",className:"lu"},[e,o]);return document.body.appendChild(n),t.addEventListener("click",()=>we()),{panel:n,body:o}}function Ki(t){const e=Date.now(),o=Math.max(0,e-t),n=Math.floor(o/6e4);if(n<1)return"방금 전";if(n<60)return`${n}분 전`;const a=Math.floor(n/60);if(a<24)return`${a}시간 전`;const r=new Date(t),i=new Date(e),l=u=>new Date(u.getFullYear(),u.getMonth(),u.getDate()).getTime();if(Math.round((l(i)-l(r))/864e5)<=1)return"어제";const d=r.getFullYear(),m=String(r.getMonth()+1).padStart(2,"0"),b=String(r.getDate()).padStart(2,"0");return`${d}.${m}.${b}`}function da(t){const e=x.guestbook.body;if(e.innerHTML="",!Array.isArray(t)||t.length===0){e.appendChild(s("div",{className:"lu-gbook-empty",text:"첫 방명록을 남겨보세요"}));return}const o=["#e07a5f","#81b29a","#5f9e7d","#8e7dbe","#6a8caf","#d68fb8"];t.forEach(n=>{const a=n.name||"게스트";let r=0;for(let d=0;d<a.length;d++)r=r*31+a.charCodeAt(d)>>>0;const i=s("span",{className:"lu-gbook-dot"});i.style.background=o[r%o.length];const l=s("div",{},[i,s("span",{className:"lu-gbook-name",text:a}),s("span",{className:"lu-gbook-time",text:Ki(n.ts)})]),c=s("div",{className:"lu-gbook-text",text:n.text||""});e.appendChild(s("div",{className:"lu-gbook-note"},[l,c]))})}function Zi(){const t=s("button",{id:"lu-guestbook-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{id:"lu-guestbook-head"},[s("div",{id:"lu-guestbook-title"},[s("span",{className:"lu-gb-eyebrow",text:"GUESTBOOK"}),s("span",{className:"lu-gb-main",text:"방명록"}),s("span",{className:"lu-gb-sub",text:"다녀간 마음을 한 줄 남겨 주세요"})]),t]),o=s("div",{id:"lu-guestbook-body"}),n=s("textarea",{id:"lu-gbook-input",rows:"3",maxlength:String(Ie),placeholder:"전시에 한 줄 메모를 남겨보세요…",spellcheck:"false"}),a=s("span",{className:"lu-gbook-count",text:`0/${Ie}`}),r=s("button",{id:"lu-gbook-submit",type:"button",text:"남기기"});r.disabled=!0;const i=s("div",{className:"lu-gbook-footer-row"},[a,r]),l=s("div",{id:"lu-gbook-stats",style:"font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.45);padding:6px 2px 0;"}),c=s("div",{id:"lu-guestbook-footer"},[n,i,l]),d=s("button",{id:"lu-gbtab",type:"button","aria-label":"방명록 열기/닫기 (위아래로 드래그해 위치 이동)",title:"드래그해서 위치를 옮길 수 있어요",text:"방명록"}),m="lu-gbtab-top-v1";try{const f=parseFloat(localStorage.getItem(m));Number.isFinite(f)&&(d.style.top=b(f)+"px")}catch{}function b(f){const p=Math.max(80,(window.innerHeight||800)-140);return Math.min(p,Math.max(60,f))}let u=null;d.addEventListener("pointerdown",f=>{const p=d.getBoundingClientRect();u={startY:f.clientY,startTop:p.top,moved:!1},d.setPointerCapture(f.pointerId)}),d.addEventListener("pointermove",f=>{if(!u)return;const p=f.clientY-u.startY;Math.abs(p)>6&&(u.moved=!0),u.moved&&(d.style.top=b(u.startTop+p)+"px")});const w=()=>{if(u&&u.moved)try{localStorage.setItem(m,String(parseFloat(d.style.top)))}catch{}setTimeout(()=>{u=null},0)};d.addEventListener("pointerup",w),d.addEventListener("pointercancel",w),d.addEventListener("click",()=>{u&&u.moved||Io()});const h=s("div",{id:"lu-guestbook",className:"lu"},[e,o,c,d]);document.body.appendChild(h),t.addEventListener("click",()=>jo());function g(){const f=n.value.length;a.textContent=`${f}/${Ie}`,r.disabled=n.value.trim().length===0}function v(){const f=n.value.trim().slice(0,Ie);f&&(n.value="",g(),n.blur(),typeof zo=="function"&&zo(f))}return n.addEventListener("keydown",f=>{f.stopPropagation(),f.key==="Escape"?(n.value="",g(),n.blur()):f.key==="Enter"&&(f.ctrlKey||f.metaKey)&&(f.preventDefault(),v())}),n.addEventListener("keyup",f=>f.stopPropagation()),n.addEventListener("keypress",f=>f.stopPropagation()),n.addEventListener("input",g),r.addEventListener("click",v),{panel:h,body:o,input:n,count:a,submitBtn:r,tab:d}}function qi(){const t=s("button",{type:"button","aria-label":"이전 작품",text:"◀ 이전"}),e=s("span",{className:"lu-tour-sep"}),o=s("span",{className:"lu-tour-count"}),n=s("span",{className:"lu-tour-title"}),a=s("span",{className:"lu-tour-sep"}),r=s("button",{type:"button","aria-label":"다음 작품",text:"다음 ▶"}),i=s("span",{className:"lu-tour-sep"}),l=s("button",{type:"button",className:"lu-tour-auto"}),c=s("span",{className:"lu-tour-sep"}),d=s("button",{id:"lu-tourbar-exit",type:"button","aria-label":"투어 종료",text:"✕ 종료"}),m=s("div",{id:"lu-tourbar",className:"lu"},[t,e,o,n,a,r,i,l,c,d]);return document.body.appendChild(m),t.addEventListener("click",()=>{St.onPrev&&St.onPrev()}),r.addEventListener("click",()=>{St.onNext&&St.onNext()}),d.addEventListener("click",()=>{St.onExit&&St.onExit()}),l.addEventListener("click",()=>{St.onToggleAuto&&St.onToggleAuto()}),{bar:m,prevBtn:t,nextBtn:r,autoBtn:l,exitBtn:d,countEl:o,titleEl:n}}function Ji(){const t=s("div",{id:"lu-shutter",className:"lu"});return document.body.appendChild(t),t}function Qi(){const t=s("button",{id:"lu-share-close",type:"button","aria-label":"닫기",text:"×"}),e=s("div",{className:"lu-share-title",text:"전시 공유하기"}),o=s("img",{className:"lu-share-preview",alt:"캡처한 전시 화면"}),n=s("button",{className:"lu-share-btn lu-share-btn-primary",type:"button",text:"기기로 공유"}),a=s("button",{className:"lu-share-btn",type:"button",text:"이미지 저장"}),r=s("button",{className:"lu-share-btn",type:"button",text:"X에 공유"}),i=s("button",{className:"lu-share-btn",type:"button",text:"Threads에 공유"}),l=s("button",{className:"lu-share-btn",type:"button",text:"링크 복사"}),c=s("div",{className:"lu-share-actions"},[n,a,r,i,l]),d=s("div",{className:"lu-share-hint",text:"인스타그램은 이미지를 저장하거나 기기로 공유한 뒤 앱에서 올려주세요"}),m=s("div",{className:"lu-share-card"},[t,e,o,c,d]),b=s("div",{id:"lu-share",className:"lu"},[m]);return document.body.appendChild(b),t.addEventListener("click",()=>Ao()),b.addEventListener("click",u=>{u.target===b&&Ao()}),n.addEventListener("click",async()=>{if(!(!ut.blob||typeof navigator>"u"||typeof navigator.share!="function"))try{const u=new File([ut.blob],"artshow.png",{type:"image/png"});await navigator.share({files:[u],title:ut.galleryName||"OpenArtShow",text:`${ut.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`})}catch{}}),a.addEventListener("click",()=>{if(!ut.dataUrl)return;const u=document.createElement("a");u.href=ut.dataUrl,u.download="artshow.png",document.body.appendChild(u),u.click(),document.body.removeChild(u)}),r.addEventListener("click",()=>{const u=`${ut.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시`,w=`https://twitter.com/intent/tweet?text=${encodeURIComponent(u)}&url=${encodeURIComponent(ut.shareUrl||"")}`;window.open(w,"_blank","noopener")}),i.addEventListener("click",()=>{const u=`${ut.galleryName||"OpenArtShow"} — OpenArtShow 3D 전시 ${ut.shareUrl||""}`,w=`https://www.threads.net/intent/post?text=${encodeURIComponent(u)}`;window.open(w,"_blank","noopener")}),l.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(ut.shareUrl||""),Yt&&clearTimeout(Yt),l.textContent="복사됨",l.classList.add("lu-share-btn-copied"),Yt=setTimeout(()=>{l.textContent="링크 복사",l.classList.remove("lu-share-btn-copied"),Yt=null},1600)}catch{}}),{overlay:b,card:m,title:e,preview:o,deviceBtn:n,saveBtn:a,xBtn:r,threadsBtn:i,copyBtn:l}}function Uo(){!x||!x.chibiMaker||oe.chibiOpen||$t||Zt||Vt||Wt||x.chibiMaker.open()}function ts(){x&&x.chibiMaker&&x.chibiMaker.close()}function es(){window.addEventListener("keydown",t=>{if(t.key==="Escape"){if(oe.chibiOpen){t.preventDefault(),t.stopImmediatePropagation(),ts();return}if(Zt){t.preventDefault(),t.stopImmediatePropagation(),Ao();return}if($t){t.preventDefault(),t.stopImmediatePropagation(),Ye();return}if(Wt){t.preventDefault(),t.stopImmediatePropagation(),we();return}if(Vt){t.preventDefault(),t.stopImmediatePropagation(),jo();return}return}if($t||Zt||!oe.entered)return;const e=document.activeElement;e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA")||(t.key==="Enter"?(t.preventDefault(),t.stopPropagation(),x.chat.input.focus()):(t.key==="c"||t.key==="C"||t.key==="ㅊ")&&!oe.chibiOpen&&(t.preventDefault(),t.stopPropagation(),Uo()))})}function os({onEnter:t,onChatSend:e,onAvatarChange:o,onMakerToggle:n}={}){if(mn){it.onEnter=t||it.onEnter,it.onChatSend=e||it.onChatSend,it.onAvatarChange=o||it.onAvatarChange,it.onMakerToggle=n||it.onMakerToggle;return}mn=!0,it.onEnter=t||null,it.onChatSend=e||null,it.onAvatarChange=o||null,it.onMakerToggle=n||null,vi(),x={loading:Oi(),lobby:Di(),controls:Gi(),topRight:Xi(),status:Fi(),chat:Yi(),artwork:Ui(),galleryTitle:ji(),lightbox:$i(),artworkList:Vi(),guestbook:Zi(),tourBar:qi(),dock:Hi(),shutter:Ji(),share:Qi()},x.chibiMaker=Pi({els:x,state:oe,callbacks:it,setStatus:at}),x.topRight.count=x.galleryTitle._count,x.topRight.countWrap=x.galleryTitle._countWrap,es(),Je!==null&&pa(Je),It&&fa(It.galleries,It.currentId,It.onPick),Qe&&ca(Qe),qe&&da(qe)}function wn(t){x&&x.loading.classList.toggle("lu-hidden",!t)}function ns(){if(!x)return;oe.entered=!0,x.lobby.overlay.classList.add("lu-hidden"),x.controls.classList.add("lu-visible"),x.topRight.wrap.classList.add("lu-visible"),x.status.classList.add("lu-visible"),x.chat.wrap.classList.add("lu-visible"),x.galleryTitle.classList.add("lu-visible"),x.guestbook.tab.classList.add("lu-visible"),x.dock&&x.dock.classList.add("lu-visible");const t=document.getElementById("lu-controls-toggle");t&&t.classList.add("lu-visible")}function as(t){!x||!t||Mo===t.id&&x.artwork.panel.classList.contains("lu-open")||(Mo=t.id,x.artwork.title.textContent=t.title||"",x.artwork.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),x.artwork.desc.textContent=t.desc||"",x.artwork.panel.classList.add("lu-open"))}function rs(){x&&(Mo=null,x.artwork.panel.classList.remove("lu-open"))}function ua(t,e,o){if(!x)return;const n=s("div",{className:"lu-chat-msg"+(o?" lu-self":"")},[s("span",{className:"lu-chat-name",text:t}),s("span",{text:e})]);for(x.chat.log.appendChild(n);x.chat.log.children.length>Bi;)x.chat.log.removeChild(x.chat.log.firstChild)}function is(t){if(!x)return;const e=x.topRight.count.textContent;x.topRight.count.textContent=String(t),e!==String(t)&&x.topRight.countWrap&&(x.topRight.countWrap.classList.remove("lu-tick"),x.topRight.countWrap.offsetWidth,x.topRight.countWrap.classList.add("lu-tick")),Ut&&Ut.chatWrap&&(Ut.chatWrap.style.display=t>=2?"":"none")}function at(t){x&&(x.status.textContent=t||"")}function ss(t){x&&(x.topRight.fps.textContent=String(Math.round(t)))}function pa(t){x.galleryTitle.querySelector(".lu-topbar-title").textContent=t||"",x.galleryTitle.classList.toggle("lu-empty",!t)}function ls(t){Je=t||"",x&&pa(Je)}function fa(t,e,o){const n=x.lobby.pickerBox;if(n.innerHTML="",!Array.isArray(t)||t.length===0)return;const a=s("div",{className:"lu-field-label",text:"전시 선택",style:"margin-top:26px;"});n.appendChild(a),e==null&&n.appendChild(s("div",{className:"lu-picker-note",text:"공유된 전시 관람 중"}));const r=s("div",{className:"lu-picker-list"});t.forEach(i=>{const l=i.id===e,c=s("button",{type:"button",className:"lu-picker-item"+(l?" lu-picker-current":"")},[s("div",{className:"lu-picker-name",text:i.name||i.id}),s("div",{className:"lu-picker-meta",text:[i.artist,typeof i.count=="number"?`${i.count}점`:null].filter(Boolean).join(" · ")})]);l&&(c.disabled=!0),c.addEventListener("click",()=>{l||typeof o=="function"&&o(i.id)}),r.appendChild(c)}),n.appendChild(r)}function cs(t,e,o){It={galleries:t,currentId:e??null,onPick:o},x&&fa(It.galleries,It.currentId,It.onPick)}function ha(){const t=x.lightbox.stage,e=t.firstChild;e&&e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),t.innerHTML=""}function ga(t){if(!x||!t)return;No=t,x.lightbox.resetZoom&&x.lightbox.resetZoom(),Ft&&(clearTimeout(Ft),Ft=null),ha();let e;t.videoUrl?(e=s("video",{className:"lu-lightbox-media",src:t.videoUrl,controls:"controls",autoplay:"autoplay",loop:"loop",muted:"muted",playsinline:"playsinline"}),e.muted=!0):e=s("img",{className:"lu-lightbox-media",src:t.imageUrl||"",alt:t.title||""}),x.lightbox.stage.appendChild(e),x.lightbox.title.textContent=t.title||"",x.lightbox.meta.textContent=[t.artist,t.year].filter(Boolean).join(" · "),x.lightbox.desc.textContent=t.desc||"",$t=!0,x.lightbox.overlay.classList.add("lu-open")}function Ye(){!x||!$t||($t=!1,x.lightbox.overlay.classList.remove("lu-open"),Ft&&clearTimeout(Ft),Ft=setTimeout(()=>{ha(),Ft=null},340),typeof Lo=="function"&&Lo())}function ge(){return $t}function ds(t){Lo=typeof t=="function"?t:null}function us(t,e){To=typeof e=="function"?e:null,Qe=t,x&&ca(Qe)}function ba(){x&&(Wt?we():(Wt=!0,x.artworkList.panel.classList.add("lu-open")))}function we(){!x||!Wt||(Wt=!1,x.artworkList.panel.classList.remove("lu-open"))}function yn(){return Wt}function ps({index:t,total:e,title:o,autoOn:n}={}){if(!x)return;const a=x.tourBar,r=Number.isFinite(t)?t+1:1,i=Number.isFinite(e)?e:0;a.countEl.textContent=`● ${r} / ${i}`,a.titleEl.textContent=` — ${o||""}`,a.autoBtn.textContent=n?"자동진행 ON":"자동진행 OFF",a.autoBtn.classList.toggle("lu-tour-on",!!n),a.bar.classList.add("lu-open")}function fs(){x&&x.tourBar.bar.classList.remove("lu-open")}function hs({onTour:t,onViewArtwork:e,onGuestbook:o,onCapture:n,onSelfView:a}={}){wt={onTour:typeof t=="function"?t:null,onViewArtwork:typeof e=="function"?e:null,onGuestbook:typeof o=="function"?o:null,onCapture:typeof n=="function"?n:null,onSelfView:typeof a=="function"?a:null}}function gs({blob:t,dataUrl:e,galleryName:o,shareUrl:n}={}){if(!x)return;ut={blob:t||null,dataUrl:e||"",galleryName:o||"",shareUrl:n||(typeof window<"u"?window.location.href:"")},x.share.preview.src=ut.dataUrl;let a=!1;if(ut.blob&&typeof navigator<"u"&&typeof navigator.share=="function"&&typeof navigator.canShare=="function")try{const r=new File([ut.blob],"artshow.png",{type:"image/png"});a=navigator.canShare({files:[r]})}catch{a=!1}x.share.deviceBtn.style.display=a?"":"none",Yt&&(clearTimeout(Yt),Yt=null),x.share.copyBtn.textContent="링크 복사",x.share.copyBtn.classList.remove("lu-share-btn-copied"),Zt=!0,x.share.overlay.classList.add("lu-open")}function Ao(){!x||!Zt||(Zt=!1,x.share.overlay.classList.remove("lu-open"))}function po(){return Zt}function vn(){if(!x)return;const t=x.shutter;t.style.transition="none",t.style.opacity="1",t.offsetWidth,t.style.transition="opacity 0.25s ease",t.style.opacity="0"}function bs({onPrev:t,onNext:e,onExit:o,onToggleAuto:n}={}){St={onPrev:typeof t=="function"?t:null,onNext:typeof e=="function"?e:null,onExit:typeof o=="function"?o:null,onToggleAuto:typeof n=="function"?n:null}}function ms(t){const e=document.getElementById("lu-gbook-stats");e&&(e.textContent=t||"")}function xs({onSubmit:t}={}){zo=typeof t=="function"?t:null}function Io(){x&&(Vt?jo():(Vt=!0,x.guestbook.panel.classList.add("lu-open")))}function jo(){!x||!Vt||(Vt=!1,x.guestbook.panel.classList.remove("lu-open"))}function ws(){return Vt}function $o(t){qe=Array.isArray(t)?t:[],x&&da(qe)}function ys(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}function vs(t,e,o){let n=(e-t)%(Math.PI*2);return n>Math.PI&&(n-=Math.PI*2),n<-Math.PI&&(n+=Math.PI*2),t+n*o}function ks(t){if(t!=="auto")return t;const e=new Date().getHours();return e>=6&&e<16?"daylight":e>=16&&e<19?"sunset":"night"}function Ss(t){let e=5381;for(let o=0;o<t.length;o++)e=(e<<5)+e+t.charCodeAt(o)>>>0;return e.toString(36)}const Cs=24,Es=45,Ms=3,Ro="lu-spec-v2",ma=4;function Po(){try{const t=localStorage.getItem(Ro);if(t){const e=JSON.parse(t);return e&&e.gen===ma&&(e.v==="low"||e.v==="high")?e.v:null}return null}catch{return null}}function fo(t){try{t?localStorage.setItem(Ro,JSON.stringify({v:t,gen:ma})):localStorage.removeItem(Ro),localStorage.removeItem("lu-spec-v1"),localStorage.removeItem("lu-lowspec-v1")}catch{}}const Ue={low:83e5,base:11e6,high:18e6},Ls=/swiftshader|llvmpipe|softpipe|software (?:rasterizer|renderer|adapter)|microsoft basic render|\bwarp\b|gdi generic|mesa offscreen|apple software renderer/i;function Ts(){const t={name:"",soft:!1};try{const e=document.createElement("canvas"),n=!(e.getContext("webgl2",{failIfMajorPerformanceCaveat:!0})||e.getContext("webgl",{failIfMajorPerformanceCaveat:!0})),a=document.createElement("canvas"),r=a.getContext("webgl2")||a.getContext("webgl");if(!r)return{name:"",soft:!0};const i=r.getExtension("WEBGL_debug_renderer_info");t.name=String(i&&r.getParameter(i.UNMASKED_RENDERER_WEBGL)||r.getParameter(r.RENDERER)||""),t.soft=Ls.test(t.name)||n;const l=r.getExtension("WEBGL_lose_context");l&&l.loseContext()}catch{}return t}function zs(t){function e(a){if(a.code==="KeyE"){t.viewCurrentArtwork();return}if(a.code==="KeyM"){if(!t.isEntered()||t.isLightboxOpen())return;t.toggleArtworkList();return}if(a.code==="KeyT"){if(!t.isEntered())return;t.toggleTour();return}if(a.code==="KeyG"){if(!t.isEntered()||t.isLightboxOpen())return;t.toggleGuestbook();return}if(a.code==="KeyP"){if(!t.isEntered()||t.isShareModalOpen())return;t.flashShutter(),t.capturePhoto();return}if(a.code==="KeyV"){if(!t.isEntered()||t.isShareModalOpen())return;t.toggleSelfView();return}if(t.isTouring()&&(a.code==="ArrowLeft"||a.code==="ArrowRight")){if(t.isLightboxOpen())return;a.preventDefault(),a.code==="ArrowLeft"?t.tourPrev():t.tourNext();return}a.code==="Escape"&&t.isTouring()&&!t.isLightboxOpen()&&!t.isArtworkListOpen()&&!t.isGuestbookOpen()&&t.exitTour()}function o(){const a=t.getCamera(),r=t.getRenderer();a.aspect=window.innerWidth/window.innerHeight,a.updateProjectionMatrix(),r.setSize(window.innerWidth,window.innerHeight)}function n(){const a=t.getMp();if(a)try{a.dispose()}catch{}}return{onKeyDown:e,onWindowResize:o,onBeforeUnload:n}}function _s(t){const e=t.split(",")[1],o=atob(e),n=new Uint8Array(o.length);for(let a=0;a<o.length;a++)n[a]=o.charCodeAt(a);return new Blob([n],{type:"image/png"})}function Ns(t,e,o,n){const a=Math.max(90,Math.round(o*.14)),r=t.createLinearGradient(0,o-a,0,o);r.addColorStop(0,"rgba(0,0,0,0)"),r.addColorStop(1,"rgba(0,0,0,0.55)"),t.fillStyle=r,t.fillRect(0,o-a,e,a);const i=Math.max(20,Math.round(e*.025)),l=Math.max(1,e/1400);t.textBaseline="alphabetic",t.textAlign="left",t.fillStyle="rgba(255,255,255,0.95)",t.font=`300 ${Math.round(18*l)}px ${fe()}`,t.fillText(n||"OpenArtShow 전시",i,o-i-6*l),t.fillStyle="#5f9e7d",t.font=`300 ${Math.round(16*l)}px ${fe()}`,As(t,"OpenArtShow",e-i,o-i-22*l,2.5*l),t.textAlign="right",t.fillStyle="rgba(255,255,255,0.6)",t.font=`300 ${Math.round(12*l)}px ${fe()}`,t.fillText("syhongart.github.io/openartshow",e-i,o-i-4*l)}function As(t,e,o,n,a){const r=Array.from(e),i=r.map(m=>t.measureText(m).width),l=i.reduce((m,b)=>m+b,0)+a*(r.length-1),c=t.textAlign;t.textAlign="left";let d=o-l;r.forEach((m,b)=>{t.fillText(m,d,n),d+=i[b]+a}),t.textAlign=c}function Is(){const t=window.location.href;return t.length<2e3?t:window.location.origin+window.location.pathname.replace(/index\.html$/,"landing.html")}function Rs(t){const{getRenderer:e,getScene:o,getCamera:n,isThirdPerson:a,getSelfAvatar:r,applySelfCamOffset:i,restoreSelfCamOffset:l,getGalleryInfo:c,photoWall:d,getMyNickname:m,getMp:b,showShareModal:u,setStatus:w}=t;function h(){const g=e(),v=o(),f=n();if(!(!g||!v||!f))try{a()&&r()&&i(),g.render(v,f),a()&&r()&&l();const p=g.domElement.toDataURL("image/png"),B=new Image;B.onload=()=>{const _=document.createElement("canvas");_.width=B.width,_.height=B.height;const H=_.getContext("2d");if(!H)return;H.drawImage(B,0,0);const A=H.createRadialGradient(_.width/2,_.height*.46,Math.min(_.width,_.height)*.4,_.width/2,_.height*.46,Math.max(_.width,_.height)*.72);A.addColorStop(0,"rgba(8,6,4,0)"),A.addColorStop(.24,"rgba(8,6,4,0.03)"),A.addColorStop(.44,"rgba(8,6,4,0.09)"),A.addColorStop(.64,"rgba(8,6,4,0.17)"),A.addColorStop(.82,"rgba(8,6,4,0.26)"),A.addColorStop(1,"rgba(8,6,4,0.34)"),H.fillStyle=A,H.fillRect(0,0,_.width,_.height),Ns(H,_.width,_.height,c()?c().name:"");const F=_.toDataURL("image/png");try{const S=Math.round(_.height/_.width*360),N=document.createElement("canvas");N.width=360,N.height=S,N.getContext("2d").drawImage(_,0,0,360,S);const I=N.toDataURL("image/jpeg",.72),E=d.addLocal(m(),c()?c().name:"",I);E&&b()&&b().sendPhoto(E)}catch(y){console.warn("포토월 썸네일 생성 실패 (캡처 자체는 정상):",y)}u({blob:_s(F),dataUrl:F,galleryName:c()&&c().name||"OpenArtShow 전시",shareUrl:Is()})},B.onerror=()=>{w("사진 촬영에 실패했습니다.")},B.src=p}catch(p){console.error("사진 촬영 실패:",p),w("사진 촬영에 실패했습니다.")}}return{capturePhoto:h}}function Ps(t){const{getPlacedArtworks:e,getPlayer:o,isEntered:n,getTween:a,clearTween:r,startTween:i,getViewingPose:l,showTourBar:c,hideTourBar:d,setDockActive:m,isLightboxOpen:b,isArtworkListOpen:u,hideArtworkList:w}=t;let h=!1,g=0,v=!0,f=!1,p=0;const B=6;function _(k){c({index:g,total:e().length,title:k&&k.title||"",autoOn:v})}function H(k){const L=e()[k];if(!L)return;g=k,f=!1,p=0,_(L);const Y=l(L);i(Y,()=>{o().setPose(Y),f=!0,p=0})}function A(){if(!n()||b()||h)return;const k=e();!k||k.length===0||(u()&&w(),h=!0,m("tour",!0),v=!0,o().disable(),H(0))}function F(){if(!h)return;h=!1,m("tour",!1),f=!1,r(),d();const k=o(),L=k.getState();k.setPose({x:L.x,z:L.z,ry:L.ry}),n()&&!b()&&k.enable()}function y(){h?F():A()}function S(){const k=e();!h||k.length===0||H((g+1)%k.length)}function N(){const k=e();!h||k.length===0||H((g-1+k.length)%k.length)}function I(){h&&(v=!v,p=0,_(e()[g]))}function E(k){const L=e().indexOf(k);L!==-1&&(g=L),f=!1}function D(k){_(k),f=!0,p=0}function M(k){h&&f&&v&&!a()&&!b()&&(p+=k,p>=B&&S())}return{tick:M,startTour:A,exitTour:F,toggleTour:y,next:S,prev:N,toggleAuto:I,syncOnSelect:E,onArrive:D,isTouring:()=>h,getIndex:()=>g}}let U=null,gt=null,K=null,et=null,Bo=null,X=null,oo=null,xa=null,pt=null,te=null,le=null;const Bs=new xr;let Dt=!1,ce=0,ho=0,Oo=0,go=0,kn=!1,ft={name:"",soft:!1};function Os(t,e){const o=document.createElement("div");o.id="lu-gpu-notice",o.style.cssText=`position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:1200;max-width:min(92vw,600px);background:linear-gradient(180deg,#fffdf8,#f6f1e4);color:#17140f;border:1px solid rgba(95,158,125,0.55);border-radius:14px;padding:14px 44px 14px 18px;box-shadow:0 12px 32px rgba(20,15,8,0.35);font:13px/1.75 ${fe()};`;const n="<b>이 브라우저에서 3D 그래픽 기능을 사용할 수 없습니다</b><br>";o.innerHTML=n+'<b>Chrome</b>: 설정 → 시스템(<b>chrome://settings/system</b>) → "그래픽 가속 사용" 켜기 → 다시 시작<br><b>Edge</b>: 설정 → 시스템 및 성능 → "그래픽 가속 사용" 켜기 + "효율 모드" 끄기<br><b>Firefox</b>: 설정 → 일반 → 성능 → "권장 성능 설정" 해제 → "하드웨어 가속 사용" 체크<br>그래도 느리면: 원격 데스크톱 여부 확인 · 그래픽 드라이버 업데이트 · Windows 설정 → 디스플레이 → 그래픽에서 브라우저를 "고성능" GPU로 지정 · 확장프로그램 없는 시크릿 창으로 접속해 비교';const a=document.createElement("button");a.type="button",a.setAttribute("aria-label","닫기"),a.textContent="×",a.style.cssText="position:absolute;top:8px;right:10px;width:26px;height:26px;border:none;background:none;font-size:18px;color:#8a8172;cursor:pointer;",a.addEventListener("click",()=>o.remove());const r=document.createElement("button");r.type="button",r.textContent="진단 정보 복사",r.style.cssText="display:inline-block;margin-top:8px;padding:5px 14px;border-radius:999px;border:1px solid rgba(95,158,125,0.5);background:rgba(95,158,125,0.12);color:#17140f;font:600 11px/1 inherit;cursor:pointer;",r.addEventListener("click",()=>{const i=JSON.stringify({renderer:t,ua:navigator.userAgent,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,cores:navigator.hardwareConcurrency||0,mem:navigator.deviceMemory||0});try{navigator.clipboard.writeText(i),r.textContent="복사됨!"}catch{}}),o.appendChild(r),o.appendChild(a),document.body.appendChild(o)}let Re=0;const wa="lu-onboard-v1";let Tt=-1,ne=null,Do=null,Sn=0,bo=0;function Ds(){try{if(localStorage.getItem(wa))return}catch{}if(!(typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches))return;Tt=0;const t=et.getState();Do={x:t.x,z:t.z};const e=document.createElement("style");e.textContent="@keyframes lu-ob-pulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} 70%{transform:translate(-50%,-50%) scale(1.25);opacity:0.2;} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} }",document.head.appendChild(e),ne=document.createElement("div"),ne.style.cssText="position:fixed;left:24%;bottom:22%;width:110px;height:110px;border-radius:50%;border:3px solid rgba(255,253,247,0.85);pointer-events:none;z-index:60;transform:translate(-50%,-50%);animation:lu-ob-pulse 1.6s ease-in-out infinite;",document.body.appendChild(ne),at("왼쪽 화면을 누른 채 밀면 걸어요 🚶")}function Gs(){if(Tt<0)return;const t=et.getState();if(Tt===0)Math.hypot(t.x-Do.x,t.z-Do.z)>1.5&&(Tt=1,Sn=t.ry,ne&&(ne.remove(),ne=null),at("잘했어요! 오른쪽 화면을 쓸면 주위를 둘러봐요 👀"));else if(Tt===1){let e=t.ry-Sn;e=Math.atan2(Math.sin(e),Math.cos(e)),Math.abs(e)>.6&&(Tt=2,bo=0,at("작품에 다가가면 설명이 나타나요 — 어려우면 [투어] 버튼을 눌러요 🖼️"))}else if(Tt===2&&(bo+=1,bo>420)){Tt=-1;try{localStorage.setItem(wa,"1")}catch{}}}function Cn(){if(!X)return;const t=[];for(const[e,o]of X.remoteAvatars)e.startsWith("npc-")&&t.push(o);if(!Dt){for(const e of t)e.group.visible=!0;return}t.sort((e,o)=>e.group.position.distanceTo(K.position)-o.group.position.distanceTo(K.position)),t.forEach((e,o)=>{e.group.visible=o<Ms})}const ya=new wr;let mo=null;const va=3,Hs=.7,Xs=-.2;let Nt=!1,Q=null,Rt=null,Gt=null,je=0;const ka=new Wn,En=new Wn,Sa=new Ja;function Mn(){if(st)if(Nt=!Nt,Nt){if(!Q&&Rt)try{Q=Ho(Rt.char,Rt.color," "),Q.group.traverse(t=>{t.isSprite&&(t.visible=!1)}),gt.add(Q.group)}catch(t){console.warn("내 아바타 생성 실패:",t),Q=null,Nt=!1;return}if(!Q){Nt=!1;return}Q.group.visible=!0,_o("self",!0),Gt=null,je=0,at("내 모습 보기 — V키 또는 [시점] 버튼으로 복귀")}else Q&&(Q.group.visible=!1,_o("self",!1))}function Fs(t){if(t){if(Rt=Rt?Object.assign({},Rt,{char:t}):{char:t},Q){const e=Q.group,o=e.visible,n=e.position.clone(),a=e.rotation.y;try{const r=Ho(t,Rt.color||"#3498db"," ");r.group.traverse(i=>{i.isSprite&&(i.visible=!1)}),r.group.position.copy(n),r.group.rotation.y=a,r.group.visible=o,gt.add(r.group),gt.remove(e),Q.dispose(),Q=r}catch(r){console.warn("내 아바타 갱신 실패:",r)}}X&&typeof X.setChar=="function"&&X.setChar(t),at("아야모 모습을 바꿨어요 ✨")}}function Ca(){ka.copy(K.position),Sa.copy(K.quaternion),En.set(0,0,1).applyQuaternion(K.quaternion),K.position.addScaledVector(En,va),K.position.y+=Hs,K.rotateX(Xs)}function Ea(){K.position.copy(ka),K.quaternion.copy(Sa)}const Ys=7,de=new Ka,Ln=new Bt;let xo=null;function Us(t){t.addEventListener("pointerdown",e=>{e.isPrimary&&(xo={x:e.clientX,y:e.clientY,t:performance.now()})}),t.addEventListener("pointerup",e=>{const o=xo;if(xo=null,!o||!e.isPrimary||!st||!X||performance.now()-o.t>450||Math.hypot(e.clientX-o.x,e.clientY-o.y)>7)return;const n=t.getBoundingClientRect();Ln.set((e.clientX-n.left)/n.width*2-1,-((e.clientY-n.top)/n.height)*2+1),de.setFromCamera(Ln,K),de.far=Ys+va;const a=[...X.remoteAvatars.entries()];if(!a.length)return;const r=a.map(([,c])=>c.group),i=de.intersectObjects(r,!0);if(i.length){let c=i[0].object;for(;c&&!r.includes(c);)c=c.parent;if(c){const[d]=a[r.indexOf(c)];X.sendHit(d);return}}de.far=60;const l=de.intersectObjects(lr(),!1);l.length&&l[0].object.userData.luArt&&Ta(l[0].object.userData.luArt)})}let Ma=null,no="게스트",st=!1,Mt=null,$e=[],to="shared",bt=[],Tn=!1,wo=0,Pe=0,tt=null;const zn=.8,js=2.2;function La(t,e){const o=et.getState(),n=typeof t.y=="number"?t.y:o.y,a=t.x-o.x,r=n-o.y,i=t.z-o.z,l=Math.hypot(a,r,i),c=xt.clamp(zn+l*.035,zn,js);et.disable(),tt={fromX:o.x,fromY:o.y,fromZ:o.z,fromRy:o.ry,toX:t.x,toY:n,toZ:t.z,toRy:t.ry,duration:c,elapsed:0,onDone:e||null}}const _n=new Fn(0,0,0,"YXZ");function $s(t){if(!tt)return;tt.elapsed+=t;const e=Math.min(1,tt.elapsed/tt.duration),o=ys(e),n=tt.fromX+(tt.toX-tt.fromX)*o,a=tt.fromY+(tt.toY-tt.fromY)*o,r=tt.fromZ+(tt.toZ-tt.fromZ)*o,i=vs(tt.fromRy,tt.toRy,o);if(K.position.set(n,a,r),_n.set(0,i,0,"YXZ"),K.quaternion.setFromEuler(_n),e>=1){const l=tt.onDone;tt=null,l&&l()}}async function Ws(){wn(!0),gt=new jn,K=new $n(55,window.innerWidth/window.innerHeight,.1,1e3),K.position.set(z.spawn.x,Et,z.spawn.z);const t=typeof matchMedia=="function"&&matchMedia("(pointer: coarse)").matches,e=Po();ft=Ts(),console.info("[OpenArtShow] GPU:",ft.name||"(unknown)",ft.soft?"— SOFTWARE RENDERING":"");try{U=new Yn({antialias:!ft.soft,powerPreference:"high-performance"})}catch(u){throw Os(""),u}Us(U.domElement);const o=document.createElement("div");o.id="lu-vignette",o.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse 72% 62% at 50% 46%, rgba(8,6,4,0) 50%, rgba(8,6,4,0.03) 62%, rgba(8,6,4,0.09) 72%, rgba(8,6,4,0.17) 82%, rgba(8,6,4,0.26) 91%, rgba(8,6,4,0.34) 100%);",document.body.appendChild(o);const n=window.devicePixelRatio||1;let a;e==="low"?a=Math.min(n,1.25):e==="high"?a=Math.min(Math.max(n,2),2.5):t?a=Math.min(n,2):a=Math.min(Math.max(n,1.5),2);const r=e==="high"?Ue.high:e==="low"?Ue.low:Ue.base;a=Math.min(a,Math.sqrt(r/(window.innerWidth*window.innerHeight))),ft.soft&&(a=Math.min(a,.7),document.documentElement.classList.add("lu-potato")),U.setPixelRatio(a),U.setSize(window.innerWidth,window.innerHeight),U.shadowMap.enabled=!ft.soft,U.shadowMap.type=Za,U.toneMapping=ft.soft?Un:qa,U.toneMappingExposure=.92,U.outputColorSpace=Pt,document.body.appendChild(U.domElement);const i=await tr(),l=ks(i.theme);ti(gt,l,{fullLights:!ft.soft&&e!=="low"}),await er(),await or(gt),window.__museum={scene:gt,camera:K,renderer:U},ft.soft&&(gt.fog=null),U.shadowMap.autoUpdate=!1,U.shadowMap.needsUpdate=!0,Oo=l==="cycle"?2:0,Mt=i,ls(Mt.name),Vs(),to=i.id??"shared",bt=nr(to),$o(bt),xs({onSubmit:tl}),$e=Ve(),us($e,Ta),bs({onPrev:Bn,onNext:Pn,onExit:In,onToggleAuto:qs}),hs({onSelfView:()=>{st&&!po()&&Mn()},onTour:()=>{st&&Rn()},onViewArtwork:Nn,onGuestbook:()=>{st&&!ge()&&Io()},onCapture:()=>{st&&!po()&&(vn(),An())}}),et=new pi(K,U.domElement);const c=z.floors.find(u=>u.id===z.spawn.floor);et.setPose({x:z.spawn.x,y:(c?c.y:0)+Et,z:z.spawn.z,ry:z.spawn.ry}),Bo=bi({player:et,getSelfAvatar:()=>Q}),et.disable(),setTimeout(()=>{const u=document.getElementById("lu-topright");u&&(u.style.cursor="pointer",u.title="클릭하면 성능 진단 정보가 복사됩니다",u.addEventListener("click",()=>{const w=JSON.stringify({gpu:ft.name,soft:ft.soft,pixelRatio:U?U.getPixelRatio():0,aa:U?U.getContext().getContextAttributes().antialias:null,dpr:window.devicePixelRatio,screen:screen.width+"x"+screen.height,inner:window.innerWidth+"x"+window.innerHeight,cores:navigator.hardwareConcurrency||0,spec:Po(),calls:U?U.info.render.calls:0,ua:navigator.userAgent});try{navigator.clipboard.writeText(w),at("진단 정보가 복사됐어요 — 붙여넣어 보내주세요")}catch{console.info("[OpenArtShow diag]",w)}}))},0),os({onEnter:Js,onChatSend:ol,onAvatarChange:Fs,onMakerToggle:u=>{st&&(u?et.disable():pt.isTouring()||et.enable())}}),wn(!1),ds(()=>{st&&!pt.isTouring()&&et.enable()}),oo=zs({getCamera:()=>K,getRenderer:()=>U,getMp:()=>X,isEntered:()=>st,isTouring:()=>pt.isTouring(),viewCurrentArtwork:Nn,toggleArtworkList:ba,toggleTour:Rn,toggleGuestbook:Io,flashShutter:vn,capturePhoto:An,toggleSelfView:Mn,tourPrev:Bn,tourNext:Pn,exitTour:In,isLightboxOpen:ge,isShareModalOpen:po,isArtworkListOpen:yn,isGuestbookOpen:ws}),xa=Rs({getRenderer:()=>U,getScene:()=>gt,getCamera:()=>K,isThirdPerson:()=>Nt,getSelfAvatar:()=>Q,applySelfCamOffset:Ca,restoreSelfCamOffset:Ea,getGalleryInfo:()=>Mt,photoWall:ya,getMyNickname:()=>no,getMp:()=>X,showShareModal:gs,setStatus:at}),pt=Ps({getPlacedArtworks:()=>$e,getPlayer:()=>et,isEntered:()=>st,getTween:()=>tt,clearTween:()=>{tt=null},startTween:La,getViewingPose:Jn,showTourBar:ps,hideTourBar:fs,setDockActive:_o,isLightboxOpen:ge,isArtworkListOpen:yn,hideArtworkList:we}),window.addEventListener("resize",al),window.addEventListener("keydown",Zs),Ma=new Qa,U.setAnimationLoop(nl)}function Vs(){fetch("./galleries/index.json").then(t=>{if(!t.ok)throw new Error(`HTTP ${t.status}`);return t.json()}).then(t=>{if(!Array.isArray(t))return;const e=Mt?Mt.id:null;cs(t,e,o=>{window.location.href="./index.html?g="+o})}).catch(()=>{})}let Be=null;function Ks(){if(!st)return;const t=K.position.y-Et;let e=null;for(const o of z.floors)t>=o.y-.9&&(e===null||o.y>e.y)&&(e=o);if(e){if(Be===null){Be=e.id;return}e.id!==Be&&(Be=e.id,at(e.name))}}function Nn(){if(!st||ge())return;const t=pt.isTouring()?$e[pt.getIndex()]:Kn(K.position);t&&(ga(t),et.disable())}function An(){xa.capturePhoto()}function Zs(t){oo.onKeyDown(t)}function Ta(t){if(!t||!st)return;const e=Jn(t),o=pt.isTouring();o&&pt.syncOnSelect(t),La(e,()=>{et.setPose(e),o?pt.onArrive(t):st&&!ge()&&et.enable()})}function In(){pt.exitTour()}function Rn(){pt.toggleTour()}function Pn(){pt.next()}function Bn(){pt.prev()}function qs(){pt.toggleAuto()}function Js({nickname:t,color:e,char:o}){no=t,Rt={nickname:t,color:e,char:o},st=!0,ns(),et.enable(),ni(),Ds();try{const n=Mt&&Mt.id||"link-"+Ss(window.location.hash||"");X=new ar(gt,{nickname:t,color:e,char:o,roomId:`${rr}-${n}`}),le=new yi(n),X.onVisitor=(a,r)=>{le.addVisit(a),Bs.add(r&&r.nickname,Mt?Mt.name:"")},X.onPhoto=a=>{ya.addRemote(a),at(`${a.name||"누군가"}님이 관람 사진을 남겼어요 📸`)},mo&&clearInterval(mo),mo=setInterval(()=>{if(!X||!le)return;const a=[];for(const[r,i]of X.remoteAvatars)r.startsWith("npc-")||a.push({x:i.group.position.x,z:i.group.position.z});le.addDwell(a,Ve(),2),ms(le.summary(bt.length))},2e3),X.onChat=(a,r)=>ua(a,r,!1),X.onPlayerCount=a=>is(a),X.onStatus=Qs,X.onGuestbook=el,X.onSelfHit=a=>{at(a>=3?"아야!! 너무해요 😭":"아야! 누가 때렸어요 😣"),Q?Q.hit(a):ir(a)},X.onNpcHit=(a,r,i)=>{te&&te.onHit(a,r,i)},X.npcProvider=(a,r)=>{te||(te=new sr(Ve()));const i=te.update(a,r),l=te.takeChat();return l&&X.sendNpcChat(l.name,l.text),i},X.connect()}catch(n){console.error("멀티플레이어 초기화 실패:",n),X=null,at("멀티플레이어 연결에 실패했습니다. 혼자 관람 모드로 진행합니다.")}}function Qs(t){if(at(t),!(Tn||!X)&&(t==="호스트로 개설됨"||t.startsWith("접속됨"))){Tn=!0;try{X.sendGuestbook(bt)}catch(e){console.error("방명록 동기화 전송 실패:",e)}}}function tl(t){if(!t)return;const e=cr(no,t);if(bt=Zn(bt,[e]),qn(to,bt),$o(bt),X)try{X.sendGuestbook([e])}catch(o){console.error("방명록 전송 실패:",o)}}function el(t){bt=Zn(bt,t),qn(to,bt),$o(bt)}function ol(t){if(t&&(ua(no,t,!0),X))try{X.sendChat(t)}catch(e){console.error("채팅 전송 실패:",e),at("채팅 전송에 실패했습니다.")}}let Oe=0;function nl(){let t=Ma.getDelta();if(ft.soft){if(Oe+=t,Oe<.034)return;t=Oe,Oe=0}try{if(Bo&&Bo.update(t),et.update(t),X&&et.resolveBodyCollisions(X.getAvatarPositions()),$s(t),pt.tick(t),Qr(t),Ks(),X&&(X.sendState(et.getState()),X.update(t)),Gs(),Nt&&Q){const o=et.getState();Q.group.position.set(o.x,o.y-Et,o.z),Q.group.rotation.y=o.ry,Gt||(Gt={x:o.x,z:o.z});const n=t>0?Math.hypot(o.x-Gt.x,o.z-Gt.z)/t:0;je+=(n-je)*Math.min(1,10*t),Gt.x=o.x,Gt.z=o.z,Q.update(t,je)}const e=Kn(K.position);if(e?as(e):rs(),wo+=1,Pe+=t,Pe>=.5){const o=wo/Pe;if(ss(Math.round(o)),wo=0,Pe=0,ce=Math.max(0,ce-.5),ce===0&&st){if(!Dt&&o<Cs){Dt=!0,ce=10,o<16&&fo("low");const n=window.devicePixelRatio||1;U.setPixelRatio(Math.min(U.getPixelRatio(),Math.max(1,n*.75))),at("원활한 관람을 위해 화질을 잠시 낮췄어요")}else Dt&&o>Es&&(Dt=!1,ce=10,Cn());if(!Dt&&o>55){if(Re+=1,Re>=20){const n=Po();n==="low"?fo(null):n===null&&fo("high");const a=Math.min(2.5,Math.sqrt(Ue.high/(window.innerWidth*window.innerHeight))),r=U.getPixelRatio();!ft.soft&&r<a&&(U.setPixelRatio(Math.min(a,r+.25)),at("화질을 한 단계 높였어요 ✨")),Re=0}}else Re=0}}ho+=t,ho>=2&&(ho=0,Dt&&Cn()),Oo>0&&(go+=t,go>=Oo&&(go=0,U.shadowMap.needsUpdate=!0)),!kn&&st&&(kn=!0,U.shadowMap.needsUpdate=!0),Nt&&Q?(Ca(),U.render(gt,K),Ea()):U.render(gt,K)}catch(e){console.error("렌더 루프 오류:",e),U.setAnimationLoop(null),at("오류가 발생했습니다. 페이지를 새로고침해 주세요.")}}function al(){oo.onWindowResize()}window.addEventListener("beforeunload",()=>{oo?.onBeforeUnload()});Ws().catch(t=>{console.error("초기화 실패:",t);try{at("초기화 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.")}catch{document.body.insertAdjacentHTML("beforeend",`<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-family:${fe()};font-size:16px;text-align:center;">초기화 중 오류가 발생했습니다.<br>페이지를 새로고침해 주세요.</div>`)}});const za=0,_a=7.5,rl=0,De=3.3,Ot=3.5,kt=.18,Ge=.2,il=7530209,sl=3.6,ll=1.15,cl="ontouchstart"in window||(navigator.maxTouchPoints||0)>0;function dl(){const t=document.createElement("canvas");t.width=t.height=512;const e=t.getContext("2d");let o=20935;const n=()=>{o|=0,o=o+1831565813|0;let c=Math.imul(o^o>>>15,1|o);return c=c+Math.imul(c^c>>>7,61|c)^c,((c^c>>>14)>>>0)/4294967296},a=e.createLinearGradient(0,0,0,512);a.addColorStop(0,"#070a16"),a.addColorStop(.55,"#111a34"),a.addColorStop(1,"#1b2748"),e.fillStyle=a,e.fillRect(0,0,512,512);for(let c=0;c<140;c++){const d=n()*512,m=n()*310,b=n()<.08;e.fillStyle=`rgba(235,240,255,${(.28+n()*.6).toFixed(2)})`,e.fillRect(d,m,b?2:1,b?2:1)}const r=e.createRadialGradient(398,88,0,398,88,36);r.addColorStop(0,"rgba(236,239,232,0.9)"),r.addColorStop(.5,"rgba(226,232,224,0.42)"),r.addColorStop(1,"rgba(226,232,224,0)"),e.fillStyle=r,e.beginPath(),e.arc(398,88,36,0,7),e.fill(),e.fillStyle="rgba(240,243,236,0.95)",e.beginPath(),e.arc(398,88,15,0,7),e.fill();let i=0;for(;i<512;){const c=26+n()*48,d=130+n()*250,m=512-d;e.fillStyle=`rgb(${10+(n()*8|0)},${16+(n()*10|0)},${34+(n()*14|0)})`,e.fillRect(i,m,c,d);for(let b=m+12;b<506;b+=15)for(let u=i+6;u<i+c-6;u+=12)n()<.52||(e.fillStyle=n()<.72?"rgba(120,220,225,0.85)":"rgba(255,207,138,0.85)",e.fillRect(u,b,4,6));i+=c+2+n()*8}const l=new be(t);return l.colorSpace=Pt,l}function ul(){const t=document.createElement("canvas");t.width=512,t.height=160;const e=t.getContext("2d");e.clearRect(0,0,512,160),e.font='700 92px "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif',e.textAlign="center",e.textBaseline="middle",e.shadowColor="rgba(114,230,225,0.95)",e.shadowBlur=30,e.fillStyle="rgba(175,244,240,0.96)",e.fillText("오픈월드",256,86),e.shadowBlur=0,e.fillStyle="rgba(224,252,250,0.92)",e.fillText("오픈월드",256,86);const o=new be(t);return o.colorSpace=Pt,o}function pl(){const t=new qt,e=[new V(De,kt,Ge).translate(0,kt/2,0),new V(De,kt,Ge).translate(0,Ot-kt/2,0),new V(kt,Ot,Ge).translate(-3.1199999999999997/2,Ot/2,0),new V(kt,Ot,Ge).translate((De-kt)/2,Ot/2,0)],o=Xe(e);e.forEach(i=>i.dispose());const n=new dt({color:736570,emissive:il,emissiveIntensity:1.5,roughness:.4,metalness:.1});t.add(new O(o,n));const a=new O(new ot(De-2*kt,Ot-2*kt),new jt({map:dl(),toneMapped:!1}));a.position.set(0,Ot/2,.11),a.rotation.y=Math.PI,t.add(a);const r=new O(new ot(2.4,.75),new jt({map:ul(),transparent:!0,toneMapped:!1,depthWrite:!1,side:xe}));return r.rotation.x=Math.PI/2,r.scale.x=-1,r.position.set(0,.02,-1),t.add(r),t.position.set(za,rl,_a),t.userData={frameMat:n,label:r},t}let Xt=null,He=null,vt=null,pe=!1,Go=!1,Na=0,Aa=0;function fl(){vt||(vt=document.createElement("div"),vt.id="portal-hint",vt.textContent=cl?"탭하여 오픈월드로 이동 →":"클릭하거나 다가가면 오픈월드로 이동 →",vt.style.cssText='position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:40;padding:9px 16px;border-radius:999px;background:rgba(11,30,29,0.82);color:#c9fbf8;font:600 13px/1 "Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;letter-spacing:-.01em;border:1px solid rgba(114,230,225,0.5);box-shadow:0 6px 20px -6px rgba(0,0,0,0.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap',document.body.appendChild(vt))}function Ia(){Go||(Go=!0,vt&&(vt.style.opacity="0"),location.href="world.html")}function Ra(){if(requestAnimationFrame(Ra),!Xt){if(Xt=window.__museum||null,!Xt)return;He=pl(),Xt.scene.add(He),fl()}const t=performance.now()/1e3,e=1.3+Math.sin(t*2.2)*.35;He.userData.frameMat.emissiveIntensity=e,He.userData.label.material.opacity=.78+Math.sin(t*2.2)*.2;const o=Xt.camera,n=Math.hypot(o.position.x-za,o.position.z-_a),a=pe;pe=n<sl,pe!==a&&vt&&(vt.style.opacity=pe?"1":"0"),n<ll&&Ia()}requestAnimationFrame(Ra);addEventListener("pointerdown",t=>{Na=t.clientX,Aa=t.clientY},!0);addEventListener("pointerup",t=>{!pe||Go||!Xt||t.target===Xt.renderer.domElement&&(Math.hypot(t.clientX-Na,t.clientY-Aa)>8||Ia())},!0);
