import{c as Ta,S as tn,N as Ut,V as ut,C as Ve,F as Ir,M as Et,a as we,R as Ma,W as nn,b as et,L as Gt,H as Dn,U as Kt,D as xt,B as vt,d as rn,t as xa,e as Aa,f as pt,p as Ra,w as $t,g as ba,E as Ca,h as st,P as dn,A as La,i as Lt,j as Rn,k as hi,l as hn,m as mn,n as Nr,o as Pa,q as _n,r as an,s as Pt,O as Or,u as Qt,v as Fr,x as Zt,y as bn,z as wa,G as Da,I as cn,J as Ua,K as ya,Q as Ia,T as Na,X as Oa,Y as Fa,Z as Ba,_ as Ha,$ as Ga,a0 as Va,a1 as ka,a2 as Wa,a3 as za,a4 as Xa,a5 as Ka,a6 as Br,a7 as Hr,a8 as Cn,a9 as Mn,aa as wt,ab as fn,ac as Gr,ad as Wt,ae as qa,af as Ya,ag as ja,ah as $a,ai as Vr,aj as Za,ak as Qa,al as Ja,am as eo,an as Ge,ao as to,ap as no,aq as io,ar as qt,as as mi,at as zt,au as kr,av as Xt,aw as bt,ax as Ln,ay as Wr,az as zr,aA as Vt,aB as Pn,aC as Xr,aD as Un,aE as ro,aF as ao,aG as oo,aH as Kr,aI as kt,aJ as so,aK as co,aL as lo,aM as fo,aN as uo,aO as qr,aP as po,aQ as Yr,aR as jr,aS as On,aT as Fn,aU as Bn,aV as Hn,aW as Ye,aX as Ri,aY as bi,aZ as Ci,a_ as Li,a$ as Pi,b0 as wi,b1 as Di,b2 as Ui,b3 as yi,b4 as Ii,b5 as Ni,b6 as Oi,b7 as Fi,b8 as Bi,b9 as Hi,ba as Gi,bb as Vi,bc as ki,bd as Wi,be as zi,bf as Xi,bg as Gn,bh as Ki,bi as qi,bj as ho,bk as Yi,bl as ji,bm as $i,bn as Qn,bo as Jn,bp as ei,bq as ti,br as ni,bs as ii,bt as ri,bu as mo,bv as Zi,bw as _o,bx as xn,by as go,bz as Qi,bA as Ji,bB as er,bC as ai,bD as oi,bE as vo,bF as $r,bG as Eo,bH as So,bI as To,bJ as Zr,bK as tr,bL as Qr,bM as nr,bN as Jr,bO as Mo,bP as xo,bQ as Ao,bR as ir,bS as ft,bT as Ro,bU as bo,bV as Co,bW as Lo,bX as Po,bY as wo,bZ as Do,b_ as Uo,b$ as yo,c0 as Io,c1 as No,c2 as Oo,c3 as Fo,c4 as Bo,c5 as Ho,c6 as Go,c7 as Vo,c8 as _i,c9 as ko,ca as si,cb as ci,cc as ea,cd as Wo,ce as zo,cf as li,cg as ta,ch as Xo,ci as pn,cj as na,ck as At,cl as Ko,cm as qo,cn as Yo,co as jo,cp as $o,cq as ia,cr as Zo,cs as Qo,ct as Jo,cu as es,cv as Vn,cw as ts,cx as ra,cy as ns,cz as is,cA as rs,cB as as,cC as os,cD as ss,cE as cs,cF as ls,cG as fs,cH as us,cI as aa,cJ as ds,cK as rr,cL as ps,cM as hs,cN as ms}from"./vendor-three-core-DFA7_gjf.js";function oa(){let e=null,n=!1,t=null,i=null;function r(a,o){t(a,o),i=e.requestAnimationFrame(r)}return{start:function(){n!==!0&&t!==null&&(i=e.requestAnimationFrame(r),n=!0)},stop:function(){e.cancelAnimationFrame(i),n=!1},setAnimationLoop:function(a){t=a},setContext:function(a){e=a}}}function _s(e){const n=new WeakMap;function t(s,f){const l=s.array,m=s.usage,h=l.byteLength,g=e.createBuffer();e.bindBuffer(f,g),e.bufferData(f,l,m),s.onUploadCallback();let v;if(l instanceof Float32Array)v=e.FLOAT;else if(l instanceof Uint16Array)s.isFloat16BufferAttribute?v=e.HALF_FLOAT:v=e.UNSIGNED_SHORT;else if(l instanceof Int16Array)v=e.SHORT;else if(l instanceof Uint32Array)v=e.UNSIGNED_INT;else if(l instanceof Int32Array)v=e.INT;else if(l instanceof Int8Array)v=e.BYTE;else if(l instanceof Uint8Array)v=e.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)v=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:g,type:v,bytesPerElement:l.BYTES_PER_ELEMENT,version:s.version,size:h}}function i(s,f,l){const m=f.array,h=f.updateRanges;if(e.bindBuffer(l,s),h.length===0)e.bufferSubData(l,0,m);else{h.sort((v,C)=>v.start-C.start);let g=0;for(let v=1;v<h.length;v++){const C=h[g],A=h[v];A.start<=C.start+C.count+1?C.count=Math.max(C.count,A.start+A.count-C.start):(++g,h[g]=A)}h.length=g+1;for(let v=0,C=h.length;v<C;v++){const A=h[v];e.bufferSubData(l,A.start*m.BYTES_PER_ELEMENT,m,A.start,A.count)}f.clearUpdateRanges()}f.onUploadCallback()}function r(s){return s.isInterleavedBufferAttribute&&(s=s.data),n.get(s)}function a(s){s.isInterleavedBufferAttribute&&(s=s.data);const f=n.get(s);f&&(e.deleteBuffer(f.buffer),n.delete(s))}function o(s,f){if(s.isInterleavedBufferAttribute&&(s=s.data),s.isGLBufferAttribute){const m=n.get(s);(!m||m.version<s.version)&&n.set(s,{buffer:s.buffer,type:s.type,bytesPerElement:s.elementSize,version:s.version});return}const l=n.get(s);if(l===void 0)n.set(s,t(s,f));else if(l.version<s.version){if(l.size!==s.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(l.buffer,s,f),l.version=s.version}}return{get:r,remove:a,update:o}}var gs=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,vs=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Es=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Ss=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Ts=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Ms=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,xs=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,As=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Rs=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,bs=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Cs=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Ls=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Ps=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,ws=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Ds=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Us=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,ys=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Is=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Ns=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Os=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Fs=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Bs=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Hs=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Gs=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Vs=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,ks=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Ws=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,zs=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Xs=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Ks=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,qs="gl_FragColor = linearToOutputTexel( gl_FragColor );",Ys=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,js=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,$s=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Zs=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Qs=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Js=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,ec=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,tc=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,nc=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,ic=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,rc=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,ac=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,oc=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,sc=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,cc=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,lc=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,fc=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,uc=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,dc=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,pc=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,hc=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,mc=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,_c=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,gc=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,vc=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ec=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Sc=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Tc=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Mc=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,xc=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Ac=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Rc=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,bc=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Cc=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Lc=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Pc=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,wc=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Dc=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Uc=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,yc=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ic=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Nc=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Oc=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Fc=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Bc=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Hc=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Gc=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Vc=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,kc=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Wc=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,zc=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Xc=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Kc=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,qc=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Yc=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,jc=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,$c=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Zc=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Qc=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,Jc=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,el=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,tl=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,nl=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,il=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,rl=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,al=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,ol=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,sl=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,cl=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,ll=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,fl=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,ul=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,dl=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,pl=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,hl=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,ml=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const _l=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,gl=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,vl=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,El=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Sl=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Tl=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ml=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,xl=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Al=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Rl=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,bl=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Cl=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ll=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Pl=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,wl=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Dl=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ul=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,yl=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Il=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Nl=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ol=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Fl=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Bl=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Hl=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Gl=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Vl=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kl=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Wl=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,zl=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Xl=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Kl=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ql=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Yl=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,jl=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Le={alphahash_fragment:gs,alphahash_pars_fragment:vs,alphamap_fragment:Es,alphamap_pars_fragment:Ss,alphatest_fragment:Ts,alphatest_pars_fragment:Ms,aomap_fragment:xs,aomap_pars_fragment:As,batching_pars_vertex:Rs,batching_vertex:bs,begin_vertex:Cs,beginnormal_vertex:Ls,bsdfs:Ps,iridescence_fragment:ws,bumpmap_pars_fragment:Ds,clipping_planes_fragment:Us,clipping_planes_pars_fragment:ys,clipping_planes_pars_vertex:Is,clipping_planes_vertex:Ns,color_fragment:Os,color_pars_fragment:Fs,color_pars_vertex:Bs,color_vertex:Hs,common:Gs,cube_uv_reflection_fragment:Vs,defaultnormal_vertex:ks,displacementmap_pars_vertex:Ws,displacementmap_vertex:zs,emissivemap_fragment:Xs,emissivemap_pars_fragment:Ks,colorspace_fragment:qs,colorspace_pars_fragment:Ys,envmap_fragment:js,envmap_common_pars_fragment:$s,envmap_pars_fragment:Zs,envmap_pars_vertex:Qs,envmap_physical_pars_fragment:lc,envmap_vertex:Js,fog_vertex:ec,fog_pars_vertex:tc,fog_fragment:nc,fog_pars_fragment:ic,gradientmap_pars_fragment:rc,lightmap_pars_fragment:ac,lights_lambert_fragment:oc,lights_lambert_pars_fragment:sc,lights_pars_begin:cc,lights_toon_fragment:fc,lights_toon_pars_fragment:uc,lights_phong_fragment:dc,lights_phong_pars_fragment:pc,lights_physical_fragment:hc,lights_physical_pars_fragment:mc,lights_fragment_begin:_c,lights_fragment_maps:gc,lights_fragment_end:vc,logdepthbuf_fragment:Ec,logdepthbuf_pars_fragment:Sc,logdepthbuf_pars_vertex:Tc,logdepthbuf_vertex:Mc,map_fragment:xc,map_pars_fragment:Ac,map_particle_fragment:Rc,map_particle_pars_fragment:bc,metalnessmap_fragment:Cc,metalnessmap_pars_fragment:Lc,morphinstance_vertex:Pc,morphcolor_vertex:wc,morphnormal_vertex:Dc,morphtarget_pars_vertex:Uc,morphtarget_vertex:yc,normal_fragment_begin:Ic,normal_fragment_maps:Nc,normal_pars_fragment:Oc,normal_pars_vertex:Fc,normal_vertex:Bc,normalmap_pars_fragment:Hc,clearcoat_normal_fragment_begin:Gc,clearcoat_normal_fragment_maps:Vc,clearcoat_pars_fragment:kc,iridescence_pars_fragment:Wc,opaque_fragment:zc,packing:Xc,premultiplied_alpha_fragment:Kc,project_vertex:qc,dithering_fragment:Yc,dithering_pars_fragment:jc,roughnessmap_fragment:$c,roughnessmap_pars_fragment:Zc,shadowmap_pars_fragment:Qc,shadowmap_pars_vertex:Jc,shadowmap_vertex:el,shadowmask_pars_fragment:tl,skinbase_vertex:nl,skinning_pars_vertex:il,skinning_vertex:rl,skinnormal_vertex:al,specularmap_fragment:ol,specularmap_pars_fragment:sl,tonemapping_fragment:cl,tonemapping_pars_fragment:ll,transmission_fragment:fl,transmission_pars_fragment:ul,uv_pars_fragment:dl,uv_pars_vertex:pl,uv_vertex:hl,worldpos_vertex:ml,background_vert:_l,background_frag:gl,backgroundCube_vert:vl,backgroundCube_frag:El,cube_vert:Sl,cube_frag:Tl,depth_vert:Ml,depth_frag:xl,distanceRGBA_vert:Al,distanceRGBA_frag:Rl,equirect_vert:bl,equirect_frag:Cl,linedashed_vert:Ll,linedashed_frag:Pl,meshbasic_vert:wl,meshbasic_frag:Dl,meshlambert_vert:Ul,meshlambert_frag:yl,meshmatcap_vert:Il,meshmatcap_frag:Nl,meshnormal_vert:Ol,meshnormal_frag:Fl,meshphong_vert:Bl,meshphong_frag:Hl,meshphysical_vert:Gl,meshphysical_frag:Vl,meshtoon_vert:kl,meshtoon_frag:Wl,points_vert:zl,points_frag:Xl,shadow_vert:Kl,shadow_frag:ql,sprite_vert:Yl,sprite_frag:jl},ee={common:{diffuse:{value:new Ve(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ge}},envmap:{envMap:{value:null},envMapRotation:{value:new Ge},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ge}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ge}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ge},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ge},normalScale:{value:new st(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ge},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ge}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ge}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ge}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ve(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ve(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0},uvTransform:{value:new Ge}},sprite:{diffuse:{value:new Ve(16777215)},opacity:{value:1},center:{value:new st(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ge},alphaMap:{value:null},alphaMapTransform:{value:new Ge},alphaTest:{value:0}}},Mt={basic:{uniforms:ft([ee.common,ee.specularmap,ee.envmap,ee.aomap,ee.lightmap,ee.fog]),vertexShader:Le.meshbasic_vert,fragmentShader:Le.meshbasic_frag},lambert:{uniforms:ft([ee.common,ee.specularmap,ee.envmap,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.fog,ee.lights,{emissive:{value:new Ve(0)}}]),vertexShader:Le.meshlambert_vert,fragmentShader:Le.meshlambert_frag},phong:{uniforms:ft([ee.common,ee.specularmap,ee.envmap,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.fog,ee.lights,{emissive:{value:new Ve(0)},specular:{value:new Ve(1118481)},shininess:{value:30}}]),vertexShader:Le.meshphong_vert,fragmentShader:Le.meshphong_frag},standard:{uniforms:ft([ee.common,ee.envmap,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.roughnessmap,ee.metalnessmap,ee.fog,ee.lights,{emissive:{value:new Ve(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Le.meshphysical_vert,fragmentShader:Le.meshphysical_frag},toon:{uniforms:ft([ee.common,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.gradientmap,ee.fog,ee.lights,{emissive:{value:new Ve(0)}}]),vertexShader:Le.meshtoon_vert,fragmentShader:Le.meshtoon_frag},matcap:{uniforms:ft([ee.common,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.fog,{matcap:{value:null}}]),vertexShader:Le.meshmatcap_vert,fragmentShader:Le.meshmatcap_frag},points:{uniforms:ft([ee.points,ee.fog]),vertexShader:Le.points_vert,fragmentShader:Le.points_frag},dashed:{uniforms:ft([ee.common,ee.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Le.linedashed_vert,fragmentShader:Le.linedashed_frag},depth:{uniforms:ft([ee.common,ee.displacementmap]),vertexShader:Le.depth_vert,fragmentShader:Le.depth_frag},normal:{uniforms:ft([ee.common,ee.bumpmap,ee.normalmap,ee.displacementmap,{opacity:{value:1}}]),vertexShader:Le.meshnormal_vert,fragmentShader:Le.meshnormal_frag},sprite:{uniforms:ft([ee.sprite,ee.fog]),vertexShader:Le.sprite_vert,fragmentShader:Le.sprite_frag},background:{uniforms:{uvTransform:{value:new Ge},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Le.background_vert,fragmentShader:Le.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ge}},vertexShader:Le.backgroundCube_vert,fragmentShader:Le.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Le.cube_vert,fragmentShader:Le.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Le.equirect_vert,fragmentShader:Le.equirect_frag},distanceRGBA:{uniforms:ft([ee.common,ee.displacementmap,{referencePosition:{value:new we},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Le.distanceRGBA_vert,fragmentShader:Le.distanceRGBA_frag},shadow:{uniforms:ft([ee.lights,ee.fog,{color:{value:new Ve(0)},opacity:{value:1}}]),vertexShader:Le.shadow_vert,fragmentShader:Le.shadow_frag}};Mt.physical={uniforms:ft([Mt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ge},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ge},clearcoatNormalScale:{value:new st(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ge},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ge},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ge},sheen:{value:0},sheenColor:{value:new Ve(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ge},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ge},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ge},transmissionSamplerSize:{value:new st},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ge},attenuationDistance:{value:0},attenuationColor:{value:new Ve(0)},specularColor:{value:new Ve(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ge},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ge},anisotropyVector:{value:new st},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ge}}]),vertexShader:Le.meshphysical_vert,fragmentShader:Le.meshphysical_frag};const En={r:0,b:0,g:0},Nt=new Qr,$l=new Et;function Zl(e,n,t,i,r,a,o){const s=new Ve(0);let f=a===!0?0:1,l,m,h=null,g=0,v=null;function C(x){let T=x.isScene===!0?x.background:null;return T&&T.isTexture&&(T=(x.backgroundBlurriness>0?t:n).get(T)),T}function A(x){let T=!1;const F=C(x);F===null?c(s,f):F&&F.isColor&&(c(F,1),T=!0);const D=e.xr.getEnvironmentBlendMode();D==="additive"?i.buffers.color.setClear(0,0,0,1,o):D==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(e.autoClear||T)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function u(x,T){const F=C(T);F&&(F.isCubeTexture||F.mapping===Un)?(m===void 0&&(m=new Pt(new Fr(1,1,1),new qt({name:"BackgroundCubeMaterial",uniforms:tr(Mt.backgroundCube.uniforms),vertexShader:Mt.backgroundCube.vertexShader,fragmentShader:Mt.backgroundCube.fragmentShader,side:vt,depthTest:!1,depthWrite:!1,fog:!1})),m.geometry.deleteAttribute("normal"),m.geometry.deleteAttribute("uv"),m.onBeforeRender=function(D,y,B){this.matrixWorld.copyPosition(B.matrixWorld)},Object.defineProperty(m.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(m)),Nt.copy(T.backgroundRotation),Nt.x*=-1,Nt.y*=-1,Nt.z*=-1,F.isCubeTexture&&F.isRenderTargetTexture===!1&&(Nt.y*=-1,Nt.z*=-1),m.material.uniforms.envMap.value=F,m.material.uniforms.flipEnvMap.value=F.isCubeTexture&&F.isRenderTargetTexture===!1?-1:1,m.material.uniforms.backgroundBlurriness.value=T.backgroundBlurriness,m.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,m.material.uniforms.backgroundRotation.value.setFromMatrix4($l.makeRotationFromEuler(Nt)),m.material.toneMapped=et.getTransfer(F.colorSpace)!==Ye,(h!==F||g!==F.version||v!==e.toneMapping)&&(m.material.needsUpdate=!0,h=F,g=F.version,v=e.toneMapping),m.layers.enableAll(),x.unshift(m,m.geometry,m.material,0,0,null)):F&&F.isTexture&&(l===void 0&&(l=new Pt(new Xr(2,2),new qt({name:"BackgroundMaterial",uniforms:tr(Mt.background.uniforms),vertexShader:Mt.background.vertexShader,fragmentShader:Mt.background.fragmentShader,side:rn,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(l)),l.material.uniforms.t2D.value=F,l.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,l.material.toneMapped=et.getTransfer(F.colorSpace)!==Ye,F.matrixAutoUpdate===!0&&F.updateMatrix(),l.material.uniforms.uvTransform.value.copy(F.matrix),(h!==F||g!==F.version||v!==e.toneMapping)&&(l.material.needsUpdate=!0,h=F,g=F.version,v=e.toneMapping),l.layers.enableAll(),x.unshift(l,l.geometry,l.material,0,0,null))}function c(x,T){x.getRGB(En,Zr(e)),i.buffers.color.setClear(En.r,En.g,En.b,T,o)}function P(){m!==void 0&&(m.geometry.dispose(),m.material.dispose()),l!==void 0&&(l.geometry.dispose(),l.material.dispose())}return{getClearColor:function(){return s},setClearColor:function(x,T=1){s.set(x),f=T,c(s,f)},getClearAlpha:function(){return f},setClearAlpha:function(x){f=x,c(s,f)},render:A,addToRenderList:u,dispose:P}}function Ql(e,n){const t=e.getParameter(e.MAX_VERTEX_ATTRIBS),i={},r=g(null);let a=r,o=!1;function s(_,w,q,V,K){let Z=!1;const W=h(V,q,w);a!==W&&(a=W,l(a.object)),Z=v(_,V,q,K),Z&&C(_,V,q,K),K!==null&&n.update(K,e.ELEMENT_ARRAY_BUFFER),(Z||o)&&(o=!1,T(_,w,q,V),K!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,n.get(K).buffer))}function f(){return e.createVertexArray()}function l(_){return e.bindVertexArray(_)}function m(_){return e.deleteVertexArray(_)}function h(_,w,q){const V=q.wireframe===!0;let K=i[_.id];K===void 0&&(K={},i[_.id]=K);let Z=K[w.id];Z===void 0&&(Z={},K[w.id]=Z);let W=Z[V];return W===void 0&&(W=g(f()),Z[V]=W),W}function g(_){const w=[],q=[],V=[];for(let K=0;K<t;K++)w[K]=0,q[K]=0,V[K]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:w,enabledAttributes:q,attributeDivisors:V,object:_,attributes:{},index:null}}function v(_,w,q,V){const K=a.attributes,Z=w.attributes;let W=0;const J=q.getAttributes();for(const H in J)if(J[H].location>=0){const Se=K[H];let Pe=Z[H];if(Pe===void 0&&(H==="instanceMatrix"&&_.instanceMatrix&&(Pe=_.instanceMatrix),H==="instanceColor"&&_.instanceColor&&(Pe=_.instanceColor)),Se===void 0||Se.attribute!==Pe||Pe&&Se.data!==Pe.data)return!0;W++}return a.attributesNum!==W||a.index!==V}function C(_,w,q,V){const K={},Z=w.attributes;let W=0;const J=q.getAttributes();for(const H in J)if(J[H].location>=0){let Se=Z[H];Se===void 0&&(H==="instanceMatrix"&&_.instanceMatrix&&(Se=_.instanceMatrix),H==="instanceColor"&&_.instanceColor&&(Se=_.instanceColor));const Pe={};Pe.attribute=Se,Se&&Se.data&&(Pe.data=Se.data),K[H]=Pe,W++}a.attributes=K,a.attributesNum=W,a.index=V}function A(){const _=a.newAttributes;for(let w=0,q=_.length;w<q;w++)_[w]=0}function u(_){c(_,0)}function c(_,w){const q=a.newAttributes,V=a.enabledAttributes,K=a.attributeDivisors;q[_]=1,V[_]===0&&(e.enableVertexAttribArray(_),V[_]=1),K[_]!==w&&(e.vertexAttribDivisor(_,w),K[_]=w)}function P(){const _=a.newAttributes,w=a.enabledAttributes;for(let q=0,V=w.length;q<V;q++)w[q]!==_[q]&&(e.disableVertexAttribArray(q),w[q]=0)}function x(_,w,q,V,K,Z,W){W===!0?e.vertexAttribIPointer(_,w,q,K,Z):e.vertexAttribPointer(_,w,q,V,K,Z)}function T(_,w,q,V){A();const K=V.attributes,Z=q.getAttributes(),W=w.defaultAttributeValues;for(const J in Z){const H=Z[J];if(H.location>=0){let he=K[J];if(he===void 0&&(J==="instanceMatrix"&&_.instanceMatrix&&(he=_.instanceMatrix),J==="instanceColor"&&_.instanceColor&&(he=_.instanceColor)),he!==void 0){const Se=he.normalized,Pe=he.itemSize,ke=n.get(he);if(ke===void 0)continue;const Ze=ke.buffer,k=ke.type,Q=ke.bytesPerElement,de=k===e.INT||k===e.UNSIGNED_INT||he.gpuType===Kr;if(he.isInterleavedBufferAttribute){const ie=he.data,Te=ie.stride,Re=he.offset;if(ie.isInstancedInterleavedBuffer){for(let De=0;De<H.locationSize;De++)c(H.location+De,ie.meshPerAttribute);_.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=ie.meshPerAttribute*ie.count)}else for(let De=0;De<H.locationSize;De++)u(H.location+De);e.bindBuffer(e.ARRAY_BUFFER,Ze);for(let De=0;De<H.locationSize;De++)x(H.location+De,Pe/H.locationSize,k,Se,Te*Q,(Re+Pe/H.locationSize*De)*Q,de)}else{if(he.isInstancedBufferAttribute){for(let ie=0;ie<H.locationSize;ie++)c(H.location+ie,he.meshPerAttribute);_.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let ie=0;ie<H.locationSize;ie++)u(H.location+ie);e.bindBuffer(e.ARRAY_BUFFER,Ze);for(let ie=0;ie<H.locationSize;ie++)x(H.location+ie,Pe/H.locationSize,k,Se,Pe*Q,Pe/H.locationSize*ie*Q,de)}}else if(W!==void 0){const Se=W[J];if(Se!==void 0)switch(Se.length){case 2:e.vertexAttrib2fv(H.location,Se);break;case 3:e.vertexAttrib3fv(H.location,Se);break;case 4:e.vertexAttrib4fv(H.location,Se);break;default:e.vertexAttrib1fv(H.location,Se)}}}}P()}function F(){B();for(const _ in i){const w=i[_];for(const q in w){const V=w[q];for(const K in V)m(V[K].object),delete V[K];delete w[q]}delete i[_]}}function D(_){if(i[_.id]===void 0)return;const w=i[_.id];for(const q in w){const V=w[q];for(const K in V)m(V[K].object),delete V[K];delete w[q]}delete i[_.id]}function y(_){for(const w in i){const q=i[w];if(q[_.id]===void 0)continue;const V=q[_.id];for(const K in V)m(V[K].object),delete V[K];delete q[_.id]}}function B(){S(),o=!0,a!==r&&(a=r,l(a.object))}function S(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:s,reset:B,resetDefaultState:S,dispose:F,releaseStatesOfGeometry:D,releaseStatesOfProgram:y,initAttributes:A,enableAttribute:u,disableUnusedAttributes:P}}function Jl(e,n,t){let i;function r(l){i=l}function a(l,m){e.drawArrays(i,l,m),t.update(m,i,1)}function o(l,m,h){h!==0&&(e.drawArraysInstanced(i,l,m,h),t.update(m,i,h))}function s(l,m,h){if(h===0)return;n.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,m,0,h);let v=0;for(let C=0;C<h;C++)v+=m[C];t.update(v,i,1)}function f(l,m,h,g){if(h===0)return;const v=n.get("WEBGL_multi_draw");if(v===null)for(let C=0;C<l.length;C++)o(l[C],m[C],g[C]);else{v.multiDrawArraysInstancedWEBGL(i,l,0,m,0,g,0,h);let C=0;for(let A=0;A<h;A++)C+=m[A]*g[A];t.update(C,i,1)}}this.setMode=r,this.render=a,this.renderInstances=o,this.renderMultiDraw=s,this.renderMultiDrawInstances=f}function ef(e,n,t,i){let r;function a(){if(r!==void 0)return r;if(n.has("EXT_texture_filter_anisotropic")===!0){const y=n.get("EXT_texture_filter_anisotropic");r=e.getParameter(y.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(y){return!(y!==Lt&&i.convert(y)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function s(y){const B=y===Dn&&(n.has("EXT_color_buffer_half_float")||n.has("EXT_color_buffer_float"));return!(y!==Kt&&i.convert(y)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&y!==kt&&!B)}function f(y){if(y==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";y="mediump"}return y==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const m=f(l);m!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",m,"instead."),l=m);const h=t.logarithmicDepthBuffer===!0,g=t.reverseDepthBuffer===!0&&n.has("EXT_clip_control"),v=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),C=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),A=e.getParameter(e.MAX_TEXTURE_SIZE),u=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),c=e.getParameter(e.MAX_VERTEX_ATTRIBS),P=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),x=e.getParameter(e.MAX_VARYING_VECTORS),T=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),F=C>0,D=e.getParameter(e.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:f,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:h,reverseDepthBuffer:g,maxTextures:v,maxVertexTextures:C,maxTextureSize:A,maxCubemapSize:u,maxAttributes:c,maxVertexUniforms:P,maxVaryings:x,maxFragmentUniforms:T,vertexTextures:F,maxSamples:D}}function tf(e){const n=this;let t=null,i=0,r=!1,a=!1;const o=new eo,s=new Ge,f={value:null,needsUpdate:!1};this.uniform=f,this.numPlanes=0,this.numIntersection=0,this.init=function(h,g){const v=h.length!==0||g||i!==0||r;return r=g,i=h.length,v},this.beginShadows=function(){a=!0,m(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(h,g){t=m(h,g,0)},this.setState=function(h,g,v){const C=h.clippingPlanes,A=h.clipIntersection,u=h.clipShadows,c=e.get(h);if(!r||C===null||C.length===0||a&&!u)a?m(null):l();else{const P=a?0:i,x=P*4;let T=c.clippingState||null;f.value=T,T=m(C,g,x,v);for(let F=0;F!==x;++F)T[F]=t[F];c.clippingState=T,this.numIntersection=A?this.numPlanes:0,this.numPlanes+=P}};function l(){f.value!==t&&(f.value=t,f.needsUpdate=i>0),n.numPlanes=i,n.numIntersection=0}function m(h,g,v,C){const A=h!==null?h.length:0;let u=null;if(A!==0){if(u=f.value,C!==!0||u===null){const c=v+A*4,P=g.matrixWorldInverse;s.getNormalMatrix(P),(u===null||u.length<c)&&(u=new Float32Array(c));for(let x=0,T=v;x!==A;++x,T+=4)o.copy(h[x]).applyMatrix4(P,s),o.normal.toArray(u,T),u[T+3]=o.constant}f.value=u,f.needsUpdate=!0}return n.numPlanes=A,n.numIntersection=0,u}}function nf(e){let n=new WeakMap;function t(o,s){return s===ai?o.mapping=_n:s===oi&&(o.mapping=an),o}function i(o){if(o&&o.isTexture){const s=o.mapping;if(s===ai||s===oi)if(n.has(o)){const f=n.get(o).texture;return t(f,o.mapping)}else{const f=o.image;if(f&&f.height>0){const l=new vo(f.height);return l.fromEquirectangularTexture(e,o),n.set(o,l),o.addEventListener("dispose",r),t(l.texture,o.mapping)}else return null}}return o}function r(o){const s=o.target;s.removeEventListener("dispose",r);const f=n.get(s);f!==void 0&&(n.delete(s),f.dispose())}function a(){n=new WeakMap}return{get:i,dispose:a}}const Jt=4,ar=[.125,.215,.35,.446,.526,.582],Ht=20,kn=new Or,or=new Ve;let Wn=null,zn=0,Xn=0,Kn=!1;const Bt=(1+Math.sqrt(5))/2,jt=1/Bt,sr=[new we(-Bt,jt,0),new we(Bt,jt,0),new we(-jt,0,Bt),new we(jt,0,Bt),new we(0,Bt,-jt),new we(0,Bt,jt),new we(-1,1,-1),new we(1,1,-1),new we(-1,1,1),new we(1,1,1)];class cr{constructor(n){this._renderer=n,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(n,t=0,i=.1,r=100){Wn=this._renderer.getRenderTarget(),zn=this._renderer.getActiveCubeFace(),Xn=this._renderer.getActiveMipmapLevel(),Kn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const a=this._allocateTargets();return a.depthBuffer=!0,this._sceneToCubeUV(n,i,r,a),t>0&&this._blur(a,0,0,t),this._applyPMREM(a),this._cleanup(a),a}fromEquirectangular(n,t=null){return this._fromTexture(n,t)}fromCubemap(n,t=null){return this._fromTexture(n,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ur(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=fr(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(n){this._lodMax=Math.floor(Math.log2(n)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let n=0;n<this._lodPlanes.length;n++)this._lodPlanes[n].dispose()}_cleanup(n){this._renderer.setRenderTarget(Wn,zn,Xn),this._renderer.xr.enabled=Kn,n.scissorTest=!1,Sn(n,0,0,n.width,n.height)}_fromTexture(n,t){n.mapping===_n||n.mapping===an?this._setSize(n.image.length===0?16:n.image[0].width||n.image[0].image.width):this._setSize(n.image.width/4),Wn=this._renderer.getRenderTarget(),zn=this._renderer.getActiveCubeFace(),Xn=this._renderer.getActiveMipmapLevel(),Kn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(n,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const n=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:wt,minFilter:wt,generateMipmaps:!1,type:Dn,format:Lt,colorSpace:pt,depthBuffer:!1},r=lr(n,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==n||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=lr(n,t,i);const{_lodMax:a}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=rf(a)),this._blurMaterial=af(a,n,t)}return r}_compileMaterial(n){const t=new Pt(this._lodPlanes[0],n);this._renderer.compile(t,kn)}_sceneToCubeUV(n,t,i,r){const s=new dn(90,1,t,i),f=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],m=this._renderer,h=m.autoClear,g=m.toneMapping;m.getClearColor(or),m.toneMapping=Ut,m.autoClear=!1;const v=new Qt({name:"PMREM.Background",side:vt,depthWrite:!1,depthTest:!1}),C=new Pt(new Fr,v);let A=!1;const u=n.background;u?u.isColor&&(v.color.copy(u),n.background=null,A=!0):(v.color.copy(or),A=!0);for(let c=0;c<6;c++){const P=c%3;P===0?(s.up.set(0,f[c],0),s.lookAt(l[c],0,0)):P===1?(s.up.set(0,0,f[c]),s.lookAt(0,l[c],0)):(s.up.set(0,f[c],0),s.lookAt(0,0,l[c]));const x=this._cubeSize;Sn(r,P*x,c>2?x:0,x,x),m.setRenderTarget(r),A&&m.render(C,s),m.render(n,s)}C.geometry.dispose(),C.material.dispose(),m.toneMapping=g,m.autoClear=h,n.background=u}_textureToCubeUV(n,t){const i=this._renderer,r=n.mapping===_n||n.mapping===an;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=ur()),this._cubemapMaterial.uniforms.flipEnvMap.value=n.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=fr());const a=r?this._cubemapMaterial:this._equirectMaterial,o=new Pt(this._lodPlanes[0],a),s=a.uniforms;s.envMap.value=n;const f=this._cubeSize;Sn(t,0,0,3*f,2*f),i.setRenderTarget(t),i.render(o,kn)}_applyPMREM(n){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let a=1;a<r;a++){const o=Math.sqrt(this._sigmas[a]*this._sigmas[a]-this._sigmas[a-1]*this._sigmas[a-1]),s=sr[(r-a-1)%sr.length];this._blur(n,a-1,a,o,s)}t.autoClear=i}_blur(n,t,i,r,a){const o=this._pingPongRenderTarget;this._halfBlur(n,o,t,i,r,"latitudinal",a),this._halfBlur(o,n,i,i,r,"longitudinal",a)}_halfBlur(n,t,i,r,a,o,s){const f=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const m=3,h=new Pt(this._lodPlanes[r],l),g=l.uniforms,v=this._sizeLods[i]-1,C=isFinite(a)?Math.PI/(2*v):2*Math.PI/(2*Ht-1),A=a/C,u=isFinite(a)?1+Math.floor(m*A):Ht;u>Ht&&console.warn(`sigmaRadians, ${a}, is too large and will clip, as it requested ${u} samples when the maximum is set to ${Ht}`);const c=[];let P=0;for(let y=0;y<Ht;++y){const B=y/A,S=Math.exp(-B*B/2);c.push(S),y===0?P+=S:y<u&&(P+=2*S)}for(let y=0;y<c.length;y++)c[y]=c[y]/P;g.envMap.value=n.texture,g.samples.value=u,g.weights.value=c,g.latitudinal.value=o==="latitudinal",s&&(g.poleAxis.value=s);const{_lodMax:x}=this;g.dTheta.value=C,g.mipInt.value=x-i;const T=this._sizeLods[r],F=3*T*(r>x-Jt?r-x+Jt:0),D=4*(this._cubeSize-T);Sn(t,F,D,3*T,2*T),f.setRenderTarget(t),f.render(h,kn)}}function rf(e){const n=[],t=[],i=[];let r=e;const a=e-Jt+1+ar.length;for(let o=0;o<a;o++){const s=Math.pow(2,r);t.push(s);let f=1/s;o>e-Jt?f=ar[o-e+Jt-1]:o===0&&(f=0),i.push(f);const l=1/(s-2),m=-l,h=1+l,g=[m,m,h,m,h,h,m,m,h,h,m,h],v=6,C=6,A=3,u=2,c=1,P=new Float32Array(A*C*v),x=new Float32Array(u*C*v),T=new Float32Array(c*C*v);for(let D=0;D<v;D++){const y=D%3*2/3-1,B=D>2?0:-1,S=[y,B,0,y+2/3,B,0,y+2/3,B+1,0,y,B,0,y+2/3,B+1,0,y,B+1,0];P.set(S,A*C*D),x.set(g,u*C*D);const _=[D,D,D,D,D,D];T.set(_,c*C*D)}const F=new mi;F.setAttribute("position",new zt(P,A)),F.setAttribute("uv",new zt(x,u)),F.setAttribute("faceIndex",new zt(T,c)),n.push(F),r>Jt&&r--}return{lodPlanes:n,sizeLods:t,sigmas:i}}function lr(e,n,t){const i=new nn(e,n,t);return i.texture.mapping=Un,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Sn(e,n,t,i,r){e.viewport.set(n,t,i,r),e.scissor.set(n,t,i,r)}function af(e,n,t){const i=new Float32Array(Ht),r=new we(0,1,0);return new qt({name:"SphericalGaussianBlur",defines:{n:Ht,CUBEUV_TEXEL_WIDTH:1/n,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:gi(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Xt,depthTest:!1,depthWrite:!1})}function fr(){return new qt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:gi(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Xt,depthTest:!1,depthWrite:!1})}function ur(){return new qt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:gi(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Xt,depthTest:!1,depthWrite:!1})}function gi(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function of(e){let n=new WeakMap,t=null;function i(s){if(s&&s.isTexture){const f=s.mapping,l=f===ai||f===oi,m=f===_n||f===an;if(l||m){let h=n.get(s);const g=h!==void 0?h.texture.pmremVersion:0;if(s.isRenderTargetTexture&&s.pmremVersion!==g)return t===null&&(t=new cr(e)),h=l?t.fromEquirectangular(s,h):t.fromCubemap(s,h),h.texture.pmremVersion=s.pmremVersion,n.set(s,h),h.texture;if(h!==void 0)return h.texture;{const v=s.image;return l&&v&&v.height>0||m&&v&&r(v)?(t===null&&(t=new cr(e)),h=l?t.fromEquirectangular(s):t.fromCubemap(s),h.texture.pmremVersion=s.pmremVersion,n.set(s,h),s.addEventListener("dispose",a),h.texture):null}}}return s}function r(s){let f=0;const l=6;for(let m=0;m<l;m++)s[m]!==void 0&&f++;return f===l}function a(s){const f=s.target;f.removeEventListener("dispose",a);const l=n.get(f);l!==void 0&&(n.delete(f),l.dispose())}function o(){n=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:o}}function sf(e){const n={};function t(i){if(n[i]!==void 0)return n[i];let r;switch(i){case"WEBGL_depth_texture":r=e.getExtension("WEBGL_depth_texture")||e.getExtension("MOZ_WEBGL_depth_texture")||e.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=e.getExtension("EXT_texture_filter_anisotropic")||e.getExtension("MOZ_EXT_texture_filter_anisotropic")||e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=e.getExtension("WEBGL_compressed_texture_s3tc")||e.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=e.getExtension("WEBGL_compressed_texture_pvrtc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=e.getExtension(i)}return n[i]=r,r}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const r=t(i);return r===null&&$t("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function cf(e,n,t,i){const r={},a=new WeakMap;function o(h){const g=h.target;g.index!==null&&n.remove(g.index);for(const C in g.attributes)n.remove(g.attributes[C]);g.removeEventListener("dispose",o),delete r[g.id];const v=a.get(g);v&&(n.remove(v),a.delete(g)),i.releaseStatesOfGeometry(g),g.isInstancedBufferGeometry===!0&&delete g._maxInstanceCount,t.memory.geometries--}function s(h,g){return r[g.id]===!0||(g.addEventListener("dispose",o),r[g.id]=!0,t.memory.geometries++),g}function f(h){const g=h.attributes;for(const v in g)n.update(g[v],e.ARRAY_BUFFER)}function l(h){const g=[],v=h.index,C=h.attributes.position;let A=0;if(v!==null){const P=v.array;A=v.version;for(let x=0,T=P.length;x<T;x+=3){const F=P[x+0],D=P[x+1],y=P[x+2];g.push(F,D,D,y,y,F)}}else if(C!==void 0){const P=C.array;A=C.version;for(let x=0,T=P.length/3-1;x<T;x+=3){const F=x+0,D=x+1,y=x+2;g.push(F,D,D,y,y,F)}}else return;const u=new(Ao(g)?Mo:xo)(g,1);u.version=A;const c=a.get(h);c&&n.remove(c),a.set(h,u)}function m(h){const g=a.get(h);if(g){const v=h.index;v!==null&&g.version<v.version&&l(h)}else l(h);return a.get(h)}return{get:s,update:f,getWireframeAttribute:m}}function lf(e,n,t){let i;function r(g){i=g}let a,o;function s(g){a=g.type,o=g.bytesPerElement}function f(g,v){e.drawElements(i,v,a,g*o),t.update(v,i,1)}function l(g,v,C){C!==0&&(e.drawElementsInstanced(i,v,a,g*o,C),t.update(v,i,C))}function m(g,v,C){if(C===0)return;n.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,v,0,a,g,0,C);let u=0;for(let c=0;c<C;c++)u+=v[c];t.update(u,i,1)}function h(g,v,C,A){if(C===0)return;const u=n.get("WEBGL_multi_draw");if(u===null)for(let c=0;c<g.length;c++)l(g[c]/o,v[c],A[c]);else{u.multiDrawElementsInstancedWEBGL(i,v,0,a,g,0,A,0,C);let c=0;for(let P=0;P<C;P++)c+=v[P]*A[P];t.update(c,i,1)}}this.setMode=r,this.setIndex=s,this.render=f,this.renderInstances=l,this.renderMultiDraw=m,this.renderMultiDrawInstances=h}function ff(e){const n={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(a,o,s){switch(t.calls++,o){case e.TRIANGLES:t.triangles+=s*(a/3);break;case e.LINES:t.lines+=s*(a/2);break;case e.LINE_STRIP:t.lines+=s*(a-1);break;case e.LINE_LOOP:t.lines+=s*a;break;case e.POINTS:t.points+=s*a;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:n,render:t,programs:null,autoReset:!0,reset:r,update:i}}function uf(e,n,t){const i=new WeakMap,r=new ut;function a(o,s,f){const l=o.morphTargetInfluences,m=s.morphAttributes.position||s.morphAttributes.normal||s.morphAttributes.color,h=m!==void 0?m.length:0;let g=i.get(s);if(g===void 0||g.count!==h){let S=function(){y.dispose(),i.delete(s),s.removeEventListener("dispose",S)};g!==void 0&&g.texture.dispose();const v=s.morphAttributes.position!==void 0,C=s.morphAttributes.normal!==void 0,A=s.morphAttributes.color!==void 0,u=s.morphAttributes.position||[],c=s.morphAttributes.normal||[],P=s.morphAttributes.color||[];let x=0;v===!0&&(x=1),C===!0&&(x=2),A===!0&&(x=3);let T=s.attributes.position.count*x,F=1;T>n.maxTextureSize&&(F=Math.ceil(T/n.maxTextureSize),T=n.maxTextureSize);const D=new Float32Array(T*F*4*h),y=new $r(D,T,F,h);y.type=kt,y.needsUpdate=!0;const B=x*4;for(let _=0;_<h;_++){const w=u[_],q=c[_],V=P[_],K=T*F*4*_;for(let Z=0;Z<w.count;Z++){const W=Z*B;v===!0&&(r.fromBufferAttribute(w,Z),D[K+W+0]=r.x,D[K+W+1]=r.y,D[K+W+2]=r.z,D[K+W+3]=0),C===!0&&(r.fromBufferAttribute(q,Z),D[K+W+4]=r.x,D[K+W+5]=r.y,D[K+W+6]=r.z,D[K+W+7]=0),A===!0&&(r.fromBufferAttribute(V,Z),D[K+W+8]=r.x,D[K+W+9]=r.y,D[K+W+10]=r.z,D[K+W+11]=V.itemSize===4?r.w:1)}}g={count:h,texture:y,size:new st(T,F)},i.set(s,g),s.addEventListener("dispose",S)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)f.getUniforms().setValue(e,"morphTexture",o.morphTexture,t);else{let v=0;for(let A=0;A<l.length;A++)v+=l[A];const C=s.morphTargetsRelative?1:1-v;f.getUniforms().setValue(e,"morphTargetBaseInfluence",C),f.getUniforms().setValue(e,"morphTargetInfluences",l)}f.getUniforms().setValue(e,"morphTargetsTexture",g.texture,t),f.getUniforms().setValue(e,"morphTargetsTextureSize",g.size)}return{update:a}}function df(e,n,t,i){let r=new WeakMap;function a(f){const l=i.render.frame,m=f.geometry,h=n.get(f,m);if(r.get(h)!==l&&(n.update(h),r.set(h,l)),f.isInstancedMesh&&(f.hasEventListener("dispose",s)===!1&&f.addEventListener("dispose",s),r.get(f)!==l&&(t.update(f.instanceMatrix,e.ARRAY_BUFFER),f.instanceColor!==null&&t.update(f.instanceColor,e.ARRAY_BUFFER),r.set(f,l))),f.isSkinnedMesh){const g=f.skeleton;r.get(g)!==l&&(g.update(),r.set(g,l))}return h}function o(){r=new WeakMap}function s(f){const l=f.target;l.removeEventListener("dispose",s),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:a,dispose:o}}const sa=new Pn,dr=new Nr(1,1),ca=new $r,la=new No,fa=new Io,pr=[],hr=[],mr=new Float32Array(16),_r=new Float32Array(9),gr=new Float32Array(4);function on(e,n,t){const i=e[0];if(i<=0||i>0)return e;const r=n*t;let a=pr[r];if(a===void 0&&(a=new Float32Array(r),pr[r]=a),n!==0){i.toArray(a,0);for(let o=1,s=0;o!==n;++o)s+=t,e[o].toArray(a,s)}return a}function it(e,n){if(e.length!==n.length)return!1;for(let t=0,i=e.length;t<i;t++)if(e[t]!==n[t])return!1;return!0}function rt(e,n){for(let t=0,i=n.length;t<i;t++)e[t]=n[t]}function yn(e,n){let t=hr[n];t===void 0&&(t=new Int32Array(n),hr[n]=t);for(let i=0;i!==n;++i)t[i]=e.allocateTextureUnit();return t}function pf(e,n){const t=this.cache;t[0]!==n&&(e.uniform1f(this.addr,n),t[0]=n)}function hf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2f(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(it(t,n))return;e.uniform2fv(this.addr,n),rt(t,n)}}function mf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3f(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else if(n.r!==void 0)(t[0]!==n.r||t[1]!==n.g||t[2]!==n.b)&&(e.uniform3f(this.addr,n.r,n.g,n.b),t[0]=n.r,t[1]=n.g,t[2]=n.b);else{if(it(t,n))return;e.uniform3fv(this.addr,n),rt(t,n)}}function _f(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4f(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(it(t,n))return;e.uniform4fv(this.addr,n),rt(t,n)}}function gf(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(it(t,n))return;e.uniformMatrix2fv(this.addr,!1,n),rt(t,n)}else{if(it(t,i))return;gr.set(i),e.uniformMatrix2fv(this.addr,!1,gr),rt(t,i)}}function vf(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(it(t,n))return;e.uniformMatrix3fv(this.addr,!1,n),rt(t,n)}else{if(it(t,i))return;_r.set(i),e.uniformMatrix3fv(this.addr,!1,_r),rt(t,i)}}function Ef(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(it(t,n))return;e.uniformMatrix4fv(this.addr,!1,n),rt(t,n)}else{if(it(t,i))return;mr.set(i),e.uniformMatrix4fv(this.addr,!1,mr),rt(t,i)}}function Sf(e,n){const t=this.cache;t[0]!==n&&(e.uniform1i(this.addr,n),t[0]=n)}function Tf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2i(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(it(t,n))return;e.uniform2iv(this.addr,n),rt(t,n)}}function Mf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3i(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(it(t,n))return;e.uniform3iv(this.addr,n),rt(t,n)}}function xf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4i(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(it(t,n))return;e.uniform4iv(this.addr,n),rt(t,n)}}function Af(e,n){const t=this.cache;t[0]!==n&&(e.uniform1ui(this.addr,n),t[0]=n)}function Rf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2ui(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(it(t,n))return;e.uniform2uiv(this.addr,n),rt(t,n)}}function bf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3ui(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(it(t,n))return;e.uniform3uiv(this.addr,n),rt(t,n)}}function Cf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4ui(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(it(t,n))return;e.uniform4uiv(this.addr,n),rt(t,n)}}function Lf(e,n,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r);let a;this.type===e.SAMPLER_2D_SHADOW?(dr.compareFunction=Vr,a=dr):a=sa,t.setTexture2D(n||a,r)}function Pf(e,n,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(n||la,r)}function wf(e,n,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(n||fa,r)}function Df(e,n,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(e.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(n||ca,r)}function Uf(e){switch(e){case 5126:return pf;case 35664:return hf;case 35665:return mf;case 35666:return _f;case 35674:return gf;case 35675:return vf;case 35676:return Ef;case 5124:case 35670:return Sf;case 35667:case 35671:return Tf;case 35668:case 35672:return Mf;case 35669:case 35673:return xf;case 5125:return Af;case 36294:return Rf;case 36295:return bf;case 36296:return Cf;case 35678:case 36198:case 36298:case 36306:case 35682:return Lf;case 35679:case 36299:case 36307:return Pf;case 35680:case 36300:case 36308:case 36293:return wf;case 36289:case 36303:case 36311:case 36292:return Df}}function yf(e,n){e.uniform1fv(this.addr,n)}function If(e,n){const t=on(n,this.size,2);e.uniform2fv(this.addr,t)}function Nf(e,n){const t=on(n,this.size,3);e.uniform3fv(this.addr,t)}function Of(e,n){const t=on(n,this.size,4);e.uniform4fv(this.addr,t)}function Ff(e,n){const t=on(n,this.size,4);e.uniformMatrix2fv(this.addr,!1,t)}function Bf(e,n){const t=on(n,this.size,9);e.uniformMatrix3fv(this.addr,!1,t)}function Hf(e,n){const t=on(n,this.size,16);e.uniformMatrix4fv(this.addr,!1,t)}function Gf(e,n){e.uniform1iv(this.addr,n)}function Vf(e,n){e.uniform2iv(this.addr,n)}function kf(e,n){e.uniform3iv(this.addr,n)}function Wf(e,n){e.uniform4iv(this.addr,n)}function zf(e,n){e.uniform1uiv(this.addr,n)}function Xf(e,n){e.uniform2uiv(this.addr,n)}function Kf(e,n){e.uniform3uiv(this.addr,n)}function qf(e,n){e.uniform4uiv(this.addr,n)}function Yf(e,n,t){const i=this.cache,r=n.length,a=yn(t,r);it(i,a)||(e.uniform1iv(this.addr,a),rt(i,a));for(let o=0;o!==r;++o)t.setTexture2D(n[o]||sa,a[o])}function jf(e,n,t){const i=this.cache,r=n.length,a=yn(t,r);it(i,a)||(e.uniform1iv(this.addr,a),rt(i,a));for(let o=0;o!==r;++o)t.setTexture3D(n[o]||la,a[o])}function $f(e,n,t){const i=this.cache,r=n.length,a=yn(t,r);it(i,a)||(e.uniform1iv(this.addr,a),rt(i,a));for(let o=0;o!==r;++o)t.setTextureCube(n[o]||fa,a[o])}function Zf(e,n,t){const i=this.cache,r=n.length,a=yn(t,r);it(i,a)||(e.uniform1iv(this.addr,a),rt(i,a));for(let o=0;o!==r;++o)t.setTexture2DArray(n[o]||ca,a[o])}function Qf(e){switch(e){case 5126:return yf;case 35664:return If;case 35665:return Nf;case 35666:return Of;case 35674:return Ff;case 35675:return Bf;case 35676:return Hf;case 5124:case 35670:return Gf;case 35667:case 35671:return Vf;case 35668:case 35672:return kf;case 35669:case 35673:return Wf;case 5125:return zf;case 36294:return Xf;case 36295:return Kf;case 36296:return qf;case 35678:case 36198:case 36298:case 36306:case 35682:return Yf;case 35679:case 36299:case 36307:return jf;case 35680:case 36300:case 36308:case 36293:return $f;case 36289:case 36303:case 36311:case 36292:return Zf}}class Jf{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.setValue=Uf(t.type)}}class eu{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Qf(t.type)}}class tu{constructor(n){this.id=n,this.seq=[],this.map={}}setValue(n,t,i){const r=this.seq;for(let a=0,o=r.length;a!==o;++a){const s=r[a];s.setValue(n,t[s.id],i)}}}const qn=/(\w+)(\])?(\[|\.)?/g;function vr(e,n){e.seq.push(n),e.map[n.id]=n}function nu(e,n,t){const i=e.name,r=i.length;for(qn.lastIndex=0;;){const a=qn.exec(i),o=qn.lastIndex;let s=a[1];const f=a[2]==="]",l=a[3];if(f&&(s=s|0),l===void 0||l==="["&&o+2===r){vr(t,l===void 0?new Jf(s,e,n):new eu(s,e,n));break}else{let h=t.map[s];h===void 0&&(h=new tu(s),vr(t,h)),t=h}}}class An{constructor(n,t){this.seq=[],this.map={};const i=n.getProgramParameter(t,n.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const a=n.getActiveUniform(t,r),o=n.getUniformLocation(t,a.name);nu(a,o,this)}}setValue(n,t,i,r){const a=this.map[t];a!==void 0&&a.setValue(n,i,r)}setOptional(n,t,i){const r=t[i];r!==void 0&&this.setValue(n,i,r)}static upload(n,t,i,r){for(let a=0,o=t.length;a!==o;++a){const s=t[a],f=i[s.id];f.needsUpdate!==!1&&s.setValue(n,f.value,r)}}static seqWithValue(n,t){const i=[];for(let r=0,a=n.length;r!==a;++r){const o=n[r];o.id in t&&i.push(o)}return i}}function Er(e,n,t){const i=e.createShader(n);return e.shaderSource(i,t),e.compileShader(i),i}const iu=37297;let ru=0;function au(e,n){const t=e.split(`
`),i=[],r=Math.max(n-6,0),a=Math.min(n+6,t.length);for(let o=r;o<a;o++){const s=o+1;i.push(`${s===n?">":" "} ${s}: ${t[o]}`)}return i.join(`
`)}const Sr=new Ge;function ou(e){et._getMatrix(Sr,et.workingColorSpace,e);const n=`mat3( ${Sr.elements.map(t=>t.toFixed(4))} )`;switch(et.getTransfer(e)){case Jr:return[n,"LinearTransferOETF"];case Ye:return[n,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",e),[n,"LinearTransferOETF"]}}function Tr(e,n,t){const i=e.getShaderParameter(n,e.COMPILE_STATUS),r=e.getShaderInfoLog(n).trim();if(i&&r==="")return"";const a=/ERROR: 0:(\d+)/.exec(r);if(a){const o=parseInt(a[1]);return t.toUpperCase()+`

`+r+`

`+au(e.getShaderSource(n),o)}else return r}function su(e,n){const t=ou(n);return[`vec4 ${e}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function cu(e,n){let t;switch(n){case yo:t="Linear";break;case Uo:t="Reinhard";break;case Do:t="Cineon";break;case wo:t="ACESFilmic";break;case Po:t="AgX";break;case Lo:t="Neutral";break;case Co:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",n),t="Linear"}return"vec3 "+e+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Tn=new we;function lu(){et.getLuminanceCoefficients(Tn);const e=Tn.x.toFixed(4),n=Tn.y.toFixed(4),t=Tn.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${e}, ${n}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function fu(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",e.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(un).join(`
`)}function uu(e){const n=[];for(const t in e){const i=e[t];i!==!1&&n.push("#define "+t+" "+i)}return n.join(`
`)}function du(e,n){const t={},i=e.getProgramParameter(n,e.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const a=e.getActiveAttrib(n,r),o=a.name;let s=1;a.type===e.FLOAT_MAT2&&(s=2),a.type===e.FLOAT_MAT3&&(s=3),a.type===e.FLOAT_MAT4&&(s=4),t[o]={type:a.type,location:e.getAttribLocation(n,o),locationSize:s}}return t}function un(e){return e!==""}function Mr(e,n){const t=n.numSpotLightShadows+n.numSpotLightMaps-n.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,n.numDirLights).replace(/NUM_SPOT_LIGHTS/g,n.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,n.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,n.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,n.numPointLights).replace(/NUM_HEMI_LIGHTS/g,n.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,n.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,n.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,n.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,n.numPointLightShadows)}function xr(e,n){return e.replace(/NUM_CLIPPING_PLANES/g,n.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,n.numClippingPlanes-n.numClipIntersection)}const pu=/^[ \t]*#include +<([\w\d./]+)>/gm;function fi(e){return e.replace(pu,mu)}const hu=new Map;function mu(e,n){let t=Le[n];if(t===void 0){const i=hu.get(n);if(i!==void 0)t=Le[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',n,i);else throw new Error("Can not resolve #include <"+n+">")}return fi(t)}const _u=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ar(e){return e.replace(_u,gu)}function gu(e,n,t,i){let r="";for(let a=parseInt(n);a<parseInt(t);a++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return r}function Rr(e){let n=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision==="highp"?n+=`
#define HIGH_PRECISION`:e.precision==="mediump"?n+=`
#define MEDIUM_PRECISION`:e.precision==="lowp"&&(n+=`
#define LOW_PRECISION`),n}function vu(e){let n="SHADOWMAP_TYPE_BASIC";return e.shadowMapType===kr?n="SHADOWMAP_TYPE_PCF":e.shadowMapType===bo?n="SHADOWMAP_TYPE_PCF_SOFT":e.shadowMapType===bt&&(n="SHADOWMAP_TYPE_VSM"),n}function Eu(e){let n="ENVMAP_TYPE_CUBE";if(e.envMap)switch(e.envMapMode){case _n:case an:n="ENVMAP_TYPE_CUBE";break;case Un:n="ENVMAP_TYPE_CUBE_UV";break}return n}function Su(e){let n="ENVMAP_MODE_REFLECTION";if(e.envMap)switch(e.envMapMode){case an:n="ENVMAP_MODE_REFRACTION";break}return n}function Tu(e){let n="ENVMAP_BLENDING_NONE";if(e.envMap)switch(e.combine){case Ho:n="ENVMAP_BLENDING_MULTIPLY";break;case Bo:n="ENVMAP_BLENDING_MIX";break;case Fo:n="ENVMAP_BLENDING_ADD";break}return n}function Mu(e){const n=e.envMapCubeUVHeight;if(n===null)return null;const t=Math.log2(n)-2,i=1/n;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function xu(e,n,t,i){const r=e.getContext(),a=t.defines;let o=t.vertexShader,s=t.fragmentShader;const f=vu(t),l=Eu(t),m=Su(t),h=Tu(t),g=Mu(t),v=fu(t),C=uu(a),A=r.createProgram();let u,c,P=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(u=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,C].filter(un).join(`
`),u.length>0&&(u+=`
`),c=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,C].filter(un).join(`
`),c.length>0&&(c+=`
`)):(u=[Rr(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,C,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+m:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+f:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(un).join(`
`),c=[Rr(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,C,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+m:"",t.envMap?"#define "+h:"",g?"#define CUBEUV_TEXEL_WIDTH "+g.texelWidth:"",g?"#define CUBEUV_TEXEL_HEIGHT "+g.texelHeight:"",g?"#define CUBEUV_MAX_MIP "+g.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+f:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Ut?"#define TONE_MAPPING":"",t.toneMapping!==Ut?Le.tonemapping_pars_fragment:"",t.toneMapping!==Ut?cu("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Le.colorspace_pars_fragment,su("linearToOutputTexel",t.outputColorSpace),lu(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(un).join(`
`)),o=fi(o),o=Mr(o,t),o=xr(o,t),s=fi(s),s=Mr(s,t),s=xr(s,t),o=Ar(o),s=Ar(s),t.isRawShaderMaterial!==!0&&(P=`#version 300 es
`,u=[v,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+u,c=["#define varying in",t.glslVersion===ir?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===ir?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+c);const x=P+u+o,T=P+c+s,F=Er(r,r.VERTEX_SHADER,x),D=Er(r,r.FRAGMENT_SHADER,T);r.attachShader(A,F),r.attachShader(A,D),t.index0AttributeName!==void 0?r.bindAttribLocation(A,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(A,0,"position"),r.linkProgram(A);function y(w){if(e.debug.checkShaderErrors){const q=r.getProgramInfoLog(A).trim(),V=r.getShaderInfoLog(F).trim(),K=r.getShaderInfoLog(D).trim();let Z=!0,W=!0;if(r.getProgramParameter(A,r.LINK_STATUS)===!1)if(Z=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(r,A,F,D);else{const J=Tr(r,F,"vertex"),H=Tr(r,D,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(A,r.VALIDATE_STATUS)+`

Material Name: `+w.name+`
Material Type: `+w.type+`

Program Info Log: `+q+`
`+J+`
`+H)}else q!==""?console.warn("THREE.WebGLProgram: Program Info Log:",q):(V===""||K==="")&&(W=!1);W&&(w.diagnostics={runnable:Z,programLog:q,vertexShader:{log:V,prefix:u},fragmentShader:{log:K,prefix:c}})}r.deleteShader(F),r.deleteShader(D),B=new An(r,A),S=du(r,A)}let B;this.getUniforms=function(){return B===void 0&&y(this),B};let S;this.getAttributes=function(){return S===void 0&&y(this),S};let _=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return _===!1&&(_=r.getProgramParameter(A,iu)),_},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(A),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=ru++,this.cacheKey=n,this.usedTimes=1,this.program=A,this.vertexShader=F,this.fragmentShader=D,this}let Au=0;class Ru{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(n){const t=n.vertexShader,i=n.fragmentShader,r=this._getShaderStage(t),a=this._getShaderStage(i),o=this._getShaderCacheForMaterial(n);return o.has(r)===!1&&(o.add(r),r.usedTimes++),o.has(a)===!1&&(o.add(a),a.usedTimes++),this}remove(n){const t=this.materialCache.get(n);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(n),this}getVertexShaderID(n){return this._getShaderStage(n.vertexShader).id}getFragmentShaderID(n){return this._getShaderStage(n.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(n){const t=this.materialCache;let i=t.get(n);return i===void 0&&(i=new Set,t.set(n,i)),i}_getShaderStage(n){const t=this.shaderCache;let i=t.get(n);return i===void 0&&(i=new bu(n),t.set(n,i)),i}}class bu{constructor(n){this.id=Au++,this.code=n,this.usedTimes=0}}function Cu(e,n,t,i,r,a,o){const s=new Ro,f=new Ru,l=new Set,m=[],h=r.logarithmicDepthBuffer,g=r.vertexTextures;let v=r.precision;const C={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function A(S){return l.add(S),S===0?"uv":`uv${S}`}function u(S,_,w,q,V){const K=q.fog,Z=V.geometry,W=S.isMeshStandardMaterial?q.environment:null,J=(S.isMeshStandardMaterial?t:n).get(S.envMap||W),H=J&&J.mapping===Un?J.image.height:null,he=C[S.type];S.precision!==null&&(v=r.getMaxPrecision(S.precision),v!==S.precision&&console.warn("THREE.WebGLProgram.getParameters:",S.precision,"not supported, using",v,"instead."));const Se=Z.morphAttributes.position||Z.morphAttributes.normal||Z.morphAttributes.color,Pe=Se!==void 0?Se.length:0;let ke=0;Z.morphAttributes.position!==void 0&&(ke=1),Z.morphAttributes.normal!==void 0&&(ke=2),Z.morphAttributes.color!==void 0&&(ke=3);let Ze,k,Q,de;if(he){const Xe=Mt[he];Ze=Xe.vertexShader,k=Xe.fragmentShader}else Ze=S.vertexShader,k=S.fragmentShader,f.update(S),Q=f.getVertexShaderID(S),de=f.getFragmentShaderID(S);const ie=e.getRenderTarget(),Te=e.state.buffers.depth.getReversed(),Re=V.isInstancedMesh===!0,De=V.isBatchedMesh===!0,$e=!!S.map,Oe=!!S.matcap,tt=!!J,M=!!S.aoMap,ht=!!S.lightMap,ye=!!S.bumpMap,Ie=!!S.normalMap,me=!!S.displacementMap,qe=!!S.emissiveMap,_e=!!S.metalnessMap,E=!!S.roughnessMap,d=S.anisotropy>0,U=S.clearcoat>0,z=S.dispersion>0,Y=S.iridescence>0,G=S.sheen>0,pe=S.transmission>0,re=d&&!!S.anisotropyMap,ce=U&&!!S.clearcoatMap,Fe=U&&!!S.clearcoatNormalMap,$=U&&!!S.clearcoatRoughnessMap,le=Y&&!!S.iridescenceMap,Ee=Y&&!!S.iridescenceThicknessMap,Me=G&&!!S.sheenColorMap,fe=G&&!!S.sheenRoughnessMap,Ne=!!S.specularMap,Ce=!!S.specularColorMap,Ke=!!S.specularIntensityMap,R=pe&&!!S.transmissionMap,te=pe&&!!S.thicknessMap,O=!!S.gradientMap,X=!!S.alphaMap,oe=S.alphaTest>0,ae=!!S.alphaHash,be=!!S.extensions;let Qe=Ut;S.toneMapped&&(ie===null||ie.isXRRenderTarget===!0)&&(Qe=e.toneMapping);const ot={shaderID:he,shaderType:S.type,shaderName:S.name,vertexShader:Ze,fragmentShader:k,defines:S.defines,customVertexShaderID:Q,customFragmentShaderID:de,isRawShaderMaterial:S.isRawShaderMaterial===!0,glslVersion:S.glslVersion,precision:v,batching:De,batchingColor:De&&V._colorsTexture!==null,instancing:Re,instancingColor:Re&&V.instanceColor!==null,instancingMorph:Re&&V.morphTexture!==null,supportsVertexTextures:g,outputColorSpace:ie===null?e.outputColorSpace:ie.isXRRenderTarget===!0?ie.texture.colorSpace:pt,alphaToCoverage:!!S.alphaToCoverage,map:$e,matcap:Oe,envMap:tt,envMapMode:tt&&J.mapping,envMapCubeUVHeight:H,aoMap:M,lightMap:ht,bumpMap:ye,normalMap:Ie,displacementMap:g&&me,emissiveMap:qe,normalMapObjectSpace:Ie&&S.normalMapType===To,normalMapTangentSpace:Ie&&S.normalMapType===So,metalnessMap:_e,roughnessMap:E,anisotropy:d,anisotropyMap:re,clearcoat:U,clearcoatMap:ce,clearcoatNormalMap:Fe,clearcoatRoughnessMap:$,dispersion:z,iridescence:Y,iridescenceMap:le,iridescenceThicknessMap:Ee,sheen:G,sheenColorMap:Me,sheenRoughnessMap:fe,specularMap:Ne,specularColorMap:Ce,specularIntensityMap:Ke,transmission:pe,transmissionMap:R,thicknessMap:te,gradientMap:O,opaque:S.transparent===!1&&S.blending===xn&&S.alphaToCoverage===!1,alphaMap:X,alphaTest:oe,alphaHash:ae,combine:S.combine,mapUv:$e&&A(S.map.channel),aoMapUv:M&&A(S.aoMap.channel),lightMapUv:ht&&A(S.lightMap.channel),bumpMapUv:ye&&A(S.bumpMap.channel),normalMapUv:Ie&&A(S.normalMap.channel),displacementMapUv:me&&A(S.displacementMap.channel),emissiveMapUv:qe&&A(S.emissiveMap.channel),metalnessMapUv:_e&&A(S.metalnessMap.channel),roughnessMapUv:E&&A(S.roughnessMap.channel),anisotropyMapUv:re&&A(S.anisotropyMap.channel),clearcoatMapUv:ce&&A(S.clearcoatMap.channel),clearcoatNormalMapUv:Fe&&A(S.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:$&&A(S.clearcoatRoughnessMap.channel),iridescenceMapUv:le&&A(S.iridescenceMap.channel),iridescenceThicknessMapUv:Ee&&A(S.iridescenceThicknessMap.channel),sheenColorMapUv:Me&&A(S.sheenColorMap.channel),sheenRoughnessMapUv:fe&&A(S.sheenRoughnessMap.channel),specularMapUv:Ne&&A(S.specularMap.channel),specularColorMapUv:Ce&&A(S.specularColorMap.channel),specularIntensityMapUv:Ke&&A(S.specularIntensityMap.channel),transmissionMapUv:R&&A(S.transmissionMap.channel),thicknessMapUv:te&&A(S.thicknessMap.channel),alphaMapUv:X&&A(S.alphaMap.channel),vertexTangents:!!Z.attributes.tangent&&(Ie||d),vertexColors:S.vertexColors,vertexAlphas:S.vertexColors===!0&&!!Z.attributes.color&&Z.attributes.color.itemSize===4,pointsUvs:V.isPoints===!0&&!!Z.attributes.uv&&($e||X),fog:!!K,useFog:S.fog===!0,fogExp2:!!K&&K.isFogExp2,flatShading:S.flatShading===!0,sizeAttenuation:S.sizeAttenuation===!0,logarithmicDepthBuffer:h,reverseDepthBuffer:Te,skinning:V.isSkinnedMesh===!0,morphTargets:Z.morphAttributes.position!==void 0,morphNormals:Z.morphAttributes.normal!==void 0,morphColors:Z.morphAttributes.color!==void 0,morphTargetsCount:Pe,morphTextureStride:ke,numDirLights:_.directional.length,numPointLights:_.point.length,numSpotLights:_.spot.length,numSpotLightMaps:_.spotLightMap.length,numRectAreaLights:_.rectArea.length,numHemiLights:_.hemi.length,numDirLightShadows:_.directionalShadowMap.length,numPointLightShadows:_.pointShadowMap.length,numSpotLightShadows:_.spotShadowMap.length,numSpotLightShadowsWithMaps:_.numSpotLightShadowsWithMaps,numLightProbes:_.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:S.dithering,shadowMapEnabled:e.shadowMap.enabled&&w.length>0,shadowMapType:e.shadowMap.type,toneMapping:Qe,decodeVideoTexture:$e&&S.map.isVideoTexture===!0&&et.getTransfer(S.map.colorSpace)===Ye,decodeVideoTextureEmissive:qe&&S.emissiveMap.isVideoTexture===!0&&et.getTransfer(S.emissiveMap.colorSpace)===Ye,premultipliedAlpha:S.premultipliedAlpha,doubleSided:S.side===xt,flipSided:S.side===vt,useDepthPacking:S.depthPacking>=0,depthPacking:S.depthPacking||0,index0AttributeName:S.index0AttributeName,extensionClipCullDistance:be&&S.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(be&&S.extensions.multiDraw===!0||De)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:S.customProgramCacheKey()};return ot.vertexUv1s=l.has(1),ot.vertexUv2s=l.has(2),ot.vertexUv3s=l.has(3),l.clear(),ot}function c(S){const _=[];if(S.shaderID?_.push(S.shaderID):(_.push(S.customVertexShaderID),_.push(S.customFragmentShaderID)),S.defines!==void 0)for(const w in S.defines)_.push(w),_.push(S.defines[w]);return S.isRawShaderMaterial===!1&&(P(_,S),x(_,S),_.push(e.outputColorSpace)),_.push(S.customProgramCacheKey),_.join()}function P(S,_){S.push(_.precision),S.push(_.outputColorSpace),S.push(_.envMapMode),S.push(_.envMapCubeUVHeight),S.push(_.mapUv),S.push(_.alphaMapUv),S.push(_.lightMapUv),S.push(_.aoMapUv),S.push(_.bumpMapUv),S.push(_.normalMapUv),S.push(_.displacementMapUv),S.push(_.emissiveMapUv),S.push(_.metalnessMapUv),S.push(_.roughnessMapUv),S.push(_.anisotropyMapUv),S.push(_.clearcoatMapUv),S.push(_.clearcoatNormalMapUv),S.push(_.clearcoatRoughnessMapUv),S.push(_.iridescenceMapUv),S.push(_.iridescenceThicknessMapUv),S.push(_.sheenColorMapUv),S.push(_.sheenRoughnessMapUv),S.push(_.specularMapUv),S.push(_.specularColorMapUv),S.push(_.specularIntensityMapUv),S.push(_.transmissionMapUv),S.push(_.thicknessMapUv),S.push(_.combine),S.push(_.fogExp2),S.push(_.sizeAttenuation),S.push(_.morphTargetsCount),S.push(_.morphAttributeCount),S.push(_.numDirLights),S.push(_.numPointLights),S.push(_.numSpotLights),S.push(_.numSpotLightMaps),S.push(_.numHemiLights),S.push(_.numRectAreaLights),S.push(_.numDirLightShadows),S.push(_.numPointLightShadows),S.push(_.numSpotLightShadows),S.push(_.numSpotLightShadowsWithMaps),S.push(_.numLightProbes),S.push(_.shadowMapType),S.push(_.toneMapping),S.push(_.numClippingPlanes),S.push(_.numClipIntersection),S.push(_.depthPacking)}function x(S,_){s.disableAll(),_.supportsVertexTextures&&s.enable(0),_.instancing&&s.enable(1),_.instancingColor&&s.enable(2),_.instancingMorph&&s.enable(3),_.matcap&&s.enable(4),_.envMap&&s.enable(5),_.normalMapObjectSpace&&s.enable(6),_.normalMapTangentSpace&&s.enable(7),_.clearcoat&&s.enable(8),_.iridescence&&s.enable(9),_.alphaTest&&s.enable(10),_.vertexColors&&s.enable(11),_.vertexAlphas&&s.enable(12),_.vertexUv1s&&s.enable(13),_.vertexUv2s&&s.enable(14),_.vertexUv3s&&s.enable(15),_.vertexTangents&&s.enable(16),_.anisotropy&&s.enable(17),_.alphaHash&&s.enable(18),_.batching&&s.enable(19),_.dispersion&&s.enable(20),_.batchingColor&&s.enable(21),S.push(s.mask),s.disableAll(),_.fog&&s.enable(0),_.useFog&&s.enable(1),_.flatShading&&s.enable(2),_.logarithmicDepthBuffer&&s.enable(3),_.reverseDepthBuffer&&s.enable(4),_.skinning&&s.enable(5),_.morphTargets&&s.enable(6),_.morphNormals&&s.enable(7),_.morphColors&&s.enable(8),_.premultipliedAlpha&&s.enable(9),_.shadowMapEnabled&&s.enable(10),_.doubleSided&&s.enable(11),_.flipSided&&s.enable(12),_.useDepthPacking&&s.enable(13),_.dithering&&s.enable(14),_.transmission&&s.enable(15),_.sheen&&s.enable(16),_.opaque&&s.enable(17),_.pointsUvs&&s.enable(18),_.decodeVideoTexture&&s.enable(19),_.decodeVideoTextureEmissive&&s.enable(20),_.alphaToCoverage&&s.enable(21),S.push(s.mask)}function T(S){const _=C[S.type];let w;if(_){const q=Mt[_];w=Eo.clone(q.uniforms)}else w=S.uniforms;return w}function F(S,_){let w;for(let q=0,V=m.length;q<V;q++){const K=m[q];if(K.cacheKey===_){w=K,++w.usedTimes;break}}return w===void 0&&(w=new xu(e,_,S,a),m.push(w)),w}function D(S){if(--S.usedTimes===0){const _=m.indexOf(S);m[_]=m[m.length-1],m.pop(),S.destroy()}}function y(S){f.remove(S)}function B(){f.dispose()}return{getParameters:u,getProgramCacheKey:c,getUniforms:T,acquireProgram:F,releaseProgram:D,releaseShaderCache:y,programs:m,dispose:B}}function Lu(){let e=new WeakMap;function n(o){return e.has(o)}function t(o){let s=e.get(o);return s===void 0&&(s={},e.set(o,s)),s}function i(o){e.delete(o)}function r(o,s,f){e.get(o)[s]=f}function a(){e=new WeakMap}return{has:n,get:t,remove:i,update:r,dispose:a}}function Pu(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.material.id!==n.material.id?e.material.id-n.material.id:e.z!==n.z?e.z-n.z:e.id-n.id}function br(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.z!==n.z?n.z-e.z:e.id-n.id}function Cr(){const e=[];let n=0;const t=[],i=[],r=[];function a(){n=0,t.length=0,i.length=0,r.length=0}function o(h,g,v,C,A,u){let c=e[n];return c===void 0?(c={id:h.id,object:h,geometry:g,material:v,groupOrder:C,renderOrder:h.renderOrder,z:A,group:u},e[n]=c):(c.id=h.id,c.object=h,c.geometry=g,c.material=v,c.groupOrder=C,c.renderOrder=h.renderOrder,c.z=A,c.group=u),n++,c}function s(h,g,v,C,A,u){const c=o(h,g,v,C,A,u);v.transmission>0?i.push(c):v.transparent===!0?r.push(c):t.push(c)}function f(h,g,v,C,A,u){const c=o(h,g,v,C,A,u);v.transmission>0?i.unshift(c):v.transparent===!0?r.unshift(c):t.unshift(c)}function l(h,g){t.length>1&&t.sort(h||Pu),i.length>1&&i.sort(g||br),r.length>1&&r.sort(g||br)}function m(){for(let h=n,g=e.length;h<g;h++){const v=e[h];if(v.id===null)break;v.id=null,v.object=null,v.geometry=null,v.material=null,v.group=null}}return{opaque:t,transmissive:i,transparent:r,init:a,push:s,unshift:f,finish:m,sort:l}}function wu(){let e=new WeakMap;function n(i,r){const a=e.get(i);let o;return a===void 0?(o=new Cr,e.set(i,[o])):r>=a.length?(o=new Cr,a.push(o)):o=a[r],o}function t(){e=new WeakMap}return{get:n,dispose:t}}function Du(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={direction:new we,color:new Ve};break;case"SpotLight":t={position:new we,direction:new we,color:new Ve,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new we,color:new Ve,distance:0,decay:0};break;case"HemisphereLight":t={direction:new we,skyColor:new Ve,groundColor:new Ve};break;case"RectAreaLight":t={color:new Ve,position:new we,halfWidth:new we,halfHeight:new we};break}return e[n.id]=t,t}}}function Uu(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new st};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new st};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new st,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[n.id]=t,t}}}let yu=0;function Iu(e,n){return(n.castShadow?2:0)-(e.castShadow?2:0)+(n.map?1:0)-(e.map?1:0)}function Nu(e){const n=new Du,t=Uu(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)i.probe.push(new we);const r=new we,a=new Et,o=new Et;function s(l){let m=0,h=0,g=0;for(let S=0;S<9;S++)i.probe[S].set(0,0,0);let v=0,C=0,A=0,u=0,c=0,P=0,x=0,T=0,F=0,D=0,y=0;l.sort(Iu);for(let S=0,_=l.length;S<_;S++){const w=l[S],q=w.color,V=w.intensity,K=w.distance,Z=w.shadow&&w.shadow.map?w.shadow.map.texture:null;if(w.isAmbientLight)m+=q.r*V,h+=q.g*V,g+=q.b*V;else if(w.isLightProbe){for(let W=0;W<9;W++)i.probe[W].addScaledVector(w.sh.coefficients[W],V);y++}else if(w.isDirectionalLight){const W=n.get(w);if(W.color.copy(w.color).multiplyScalar(w.intensity),w.castShadow){const J=w.shadow,H=t.get(w);H.shadowIntensity=J.intensity,H.shadowBias=J.bias,H.shadowNormalBias=J.normalBias,H.shadowRadius=J.radius,H.shadowMapSize=J.mapSize,i.directionalShadow[v]=H,i.directionalShadowMap[v]=Z,i.directionalShadowMatrix[v]=w.shadow.matrix,P++}i.directional[v]=W,v++}else if(w.isSpotLight){const W=n.get(w);W.position.setFromMatrixPosition(w.matrixWorld),W.color.copy(q).multiplyScalar(V),W.distance=K,W.coneCos=Math.cos(w.angle),W.penumbraCos=Math.cos(w.angle*(1-w.penumbra)),W.decay=w.decay,i.spot[A]=W;const J=w.shadow;if(w.map&&(i.spotLightMap[F]=w.map,F++,J.updateMatrices(w),w.castShadow&&D++),i.spotLightMatrix[A]=J.matrix,w.castShadow){const H=t.get(w);H.shadowIntensity=J.intensity,H.shadowBias=J.bias,H.shadowNormalBias=J.normalBias,H.shadowRadius=J.radius,H.shadowMapSize=J.mapSize,i.spotShadow[A]=H,i.spotShadowMap[A]=Z,T++}A++}else if(w.isRectAreaLight){const W=n.get(w);W.color.copy(q).multiplyScalar(V),W.halfWidth.set(w.width*.5,0,0),W.halfHeight.set(0,w.height*.5,0),i.rectArea[u]=W,u++}else if(w.isPointLight){const W=n.get(w);if(W.color.copy(w.color).multiplyScalar(w.intensity),W.distance=w.distance,W.decay=w.decay,w.castShadow){const J=w.shadow,H=t.get(w);H.shadowIntensity=J.intensity,H.shadowBias=J.bias,H.shadowNormalBias=J.normalBias,H.shadowRadius=J.radius,H.shadowMapSize=J.mapSize,H.shadowCameraNear=J.camera.near,H.shadowCameraFar=J.camera.far,i.pointShadow[C]=H,i.pointShadowMap[C]=Z,i.pointShadowMatrix[C]=w.shadow.matrix,x++}i.point[C]=W,C++}else if(w.isHemisphereLight){const W=n.get(w);W.skyColor.copy(w.color).multiplyScalar(V),W.groundColor.copy(w.groundColor).multiplyScalar(V),i.hemi[c]=W,c++}}u>0&&(e.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ee.LTC_FLOAT_1,i.rectAreaLTC2=ee.LTC_FLOAT_2):(i.rectAreaLTC1=ee.LTC_HALF_1,i.rectAreaLTC2=ee.LTC_HALF_2)),i.ambient[0]=m,i.ambient[1]=h,i.ambient[2]=g;const B=i.hash;(B.directionalLength!==v||B.pointLength!==C||B.spotLength!==A||B.rectAreaLength!==u||B.hemiLength!==c||B.numDirectionalShadows!==P||B.numPointShadows!==x||B.numSpotShadows!==T||B.numSpotMaps!==F||B.numLightProbes!==y)&&(i.directional.length=v,i.spot.length=A,i.rectArea.length=u,i.point.length=C,i.hemi.length=c,i.directionalShadow.length=P,i.directionalShadowMap.length=P,i.pointShadow.length=x,i.pointShadowMap.length=x,i.spotShadow.length=T,i.spotShadowMap.length=T,i.directionalShadowMatrix.length=P,i.pointShadowMatrix.length=x,i.spotLightMatrix.length=T+F-D,i.spotLightMap.length=F,i.numSpotLightShadowsWithMaps=D,i.numLightProbes=y,B.directionalLength=v,B.pointLength=C,B.spotLength=A,B.rectAreaLength=u,B.hemiLength=c,B.numDirectionalShadows=P,B.numPointShadows=x,B.numSpotShadows=T,B.numSpotMaps=F,B.numLightProbes=y,i.version=yu++)}function f(l,m){let h=0,g=0,v=0,C=0,A=0;const u=m.matrixWorldInverse;for(let c=0,P=l.length;c<P;c++){const x=l[c];if(x.isDirectionalLight){const T=i.directional[h];T.direction.setFromMatrixPosition(x.matrixWorld),r.setFromMatrixPosition(x.target.matrixWorld),T.direction.sub(r),T.direction.transformDirection(u),h++}else if(x.isSpotLight){const T=i.spot[v];T.position.setFromMatrixPosition(x.matrixWorld),T.position.applyMatrix4(u),T.direction.setFromMatrixPosition(x.matrixWorld),r.setFromMatrixPosition(x.target.matrixWorld),T.direction.sub(r),T.direction.transformDirection(u),v++}else if(x.isRectAreaLight){const T=i.rectArea[C];T.position.setFromMatrixPosition(x.matrixWorld),T.position.applyMatrix4(u),o.identity(),a.copy(x.matrixWorld),a.premultiply(u),o.extractRotation(a),T.halfWidth.set(x.width*.5,0,0),T.halfHeight.set(0,x.height*.5,0),T.halfWidth.applyMatrix4(o),T.halfHeight.applyMatrix4(o),C++}else if(x.isPointLight){const T=i.point[g];T.position.setFromMatrixPosition(x.matrixWorld),T.position.applyMatrix4(u),g++}else if(x.isHemisphereLight){const T=i.hemi[A];T.direction.setFromMatrixPosition(x.matrixWorld),T.direction.transformDirection(u),A++}}}return{setup:s,setupView:f,state:i}}function Lr(e){const n=new Nu(e),t=[],i=[];function r(m){l.camera=m,t.length=0,i.length=0}function a(m){t.push(m)}function o(m){i.push(m)}function s(){n.setup(t)}function f(m){n.setupView(t,m)}const l={lightsArray:t,shadowsArray:i,camera:null,lights:n,transmissionRenderTarget:{}};return{init:r,state:l,setupLights:s,setupLightsView:f,pushLight:a,pushShadow:o}}function Ou(e){let n=new WeakMap;function t(r,a=0){const o=n.get(r);let s;return o===void 0?(s=new Lr(e),n.set(r,[s])):a>=o.length?(s=new Lr(e),o.push(s)):s=o[a],s}function i(){n=new WeakMap}return{get:t,dispose:i}}const Fu=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Bu=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Hu(e,n,t){let i=new Ir;const r=new st,a=new st,o=new ut,s=new to({depthPacking:no}),f=new io,l={},m=t.maxTextureSize,h={[rn]:vt,[vt]:rn,[xt]:xt},g=new qt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new st},radius:{value:4}},vertexShader:Fu,fragmentShader:Bu}),v=g.clone();v.defines.HORIZONTAL_PASS=1;const C=new mi;C.setAttribute("position",new zt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const A=new Pt(C,g),u=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=kr;let c=this.type;this.render=function(D,y,B){if(u.enabled===!1||u.autoUpdate===!1&&u.needsUpdate===!1||D.length===0)return;const S=e.getRenderTarget(),_=e.getActiveCubeFace(),w=e.getActiveMipmapLevel(),q=e.state;q.setBlending(Xt),q.buffers.color.setClear(1,1,1,1),q.buffers.depth.setTest(!0),q.setScissorTest(!1);const V=c!==bt&&this.type===bt,K=c===bt&&this.type!==bt;for(let Z=0,W=D.length;Z<W;Z++){const J=D[Z],H=J.shadow;if(H===void 0){console.warn("THREE.WebGLShadowMap:",J,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;r.copy(H.mapSize);const he=H.getFrameExtents();if(r.multiply(he),a.copy(H.mapSize),(r.x>m||r.y>m)&&(r.x>m&&(a.x=Math.floor(m/he.x),r.x=a.x*he.x,H.mapSize.x=a.x),r.y>m&&(a.y=Math.floor(m/he.y),r.y=a.y*he.y,H.mapSize.y=a.y)),H.map===null||V===!0||K===!0){const Pe=this.type!==bt?{minFilter:Wt,magFilter:Wt}:{};H.map!==null&&H.map.dispose(),H.map=new nn(r.x,r.y,Pe),H.map.texture.name=J.name+".shadowMap",H.camera.updateProjectionMatrix()}e.setRenderTarget(H.map),e.clear();const Se=H.getViewportCount();for(let Pe=0;Pe<Se;Pe++){const ke=H.getViewport(Pe);o.set(a.x*ke.x,a.y*ke.y,a.x*ke.z,a.y*ke.w),q.viewport(o),H.updateMatrices(J,Pe),i=H.getFrustum(),T(y,B,H.camera,J,this.type)}H.isPointLightShadow!==!0&&this.type===bt&&P(H,B),H.needsUpdate=!1}c=this.type,u.needsUpdate=!1,e.setRenderTarget(S,_,w)};function P(D,y){const B=n.update(A);g.defines.VSM_SAMPLES!==D.blurSamples&&(g.defines.VSM_SAMPLES=D.blurSamples,v.defines.VSM_SAMPLES=D.blurSamples,g.needsUpdate=!0,v.needsUpdate=!0),D.mapPass===null&&(D.mapPass=new nn(r.x,r.y)),g.uniforms.shadow_pass.value=D.map.texture,g.uniforms.resolution.value=D.mapSize,g.uniforms.radius.value=D.radius,e.setRenderTarget(D.mapPass),e.clear(),e.renderBufferDirect(y,null,B,g,A,null),v.uniforms.shadow_pass.value=D.mapPass.texture,v.uniforms.resolution.value=D.mapSize,v.uniforms.radius.value=D.radius,e.setRenderTarget(D.map),e.clear(),e.renderBufferDirect(y,null,B,v,A,null)}function x(D,y,B,S){let _=null;const w=B.isPointLight===!0?D.customDistanceMaterial:D.customDepthMaterial;if(w!==void 0)_=w;else if(_=B.isPointLight===!0?f:s,e.localClippingEnabled&&y.clipShadows===!0&&Array.isArray(y.clippingPlanes)&&y.clippingPlanes.length!==0||y.displacementMap&&y.displacementScale!==0||y.alphaMap&&y.alphaTest>0||y.map&&y.alphaTest>0){const q=_.uuid,V=y.uuid;let K=l[q];K===void 0&&(K={},l[q]=K);let Z=K[V];Z===void 0&&(Z=_.clone(),K[V]=Z,y.addEventListener("dispose",F)),_=Z}if(_.visible=y.visible,_.wireframe=y.wireframe,S===bt?_.side=y.shadowSide!==null?y.shadowSide:y.side:_.side=y.shadowSide!==null?y.shadowSide:h[y.side],_.alphaMap=y.alphaMap,_.alphaTest=y.alphaTest,_.map=y.map,_.clipShadows=y.clipShadows,_.clippingPlanes=y.clippingPlanes,_.clipIntersection=y.clipIntersection,_.displacementMap=y.displacementMap,_.displacementScale=y.displacementScale,_.displacementBias=y.displacementBias,_.wireframeLinewidth=y.wireframeLinewidth,_.linewidth=y.linewidth,B.isPointLight===!0&&_.isMeshDistanceMaterial===!0){const q=e.properties.get(_);q.light=B}return _}function T(D,y,B,S,_){if(D.visible===!1)return;if(D.layers.test(y.layers)&&(D.isMesh||D.isLine||D.isPoints)&&(D.castShadow||D.receiveShadow&&_===bt)&&(!D.frustumCulled||i.intersectsObject(D))){D.modelViewMatrix.multiplyMatrices(B.matrixWorldInverse,D.matrixWorld);const V=n.update(D),K=D.material;if(Array.isArray(K)){const Z=V.groups;for(let W=0,J=Z.length;W<J;W++){const H=Z[W],he=K[H.materialIndex];if(he&&he.visible){const Se=x(D,he,S,_);D.onBeforeShadow(e,D,y,B,V,Se,H),e.renderBufferDirect(B,null,V,Se,D,H),D.onAfterShadow(e,D,y,B,V,Se,H)}}}else if(K.visible){const Z=x(D,K,S,_);D.onBeforeShadow(e,D,y,B,V,Z,null),e.renderBufferDirect(B,null,V,Z,D,null),D.onAfterShadow(e,D,y,B,V,Z,null)}}const q=D.children;for(let V=0,K=q.length;V<K;V++)T(q[V],y,B,S,_)}function F(D){D.target.removeEventListener("dispose",F);for(const B in l){const S=l[B],_=D.target.uuid;_ in S&&(S[_].dispose(),delete S[_])}}}const Gu={[ri]:ii,[ni]:Jn,[ti]:Qn,[bn]:ei,[ii]:ri,[Jn]:ni,[Qn]:ti,[ei]:bn};function Vu(e,n){function t(){let R=!1;const te=new ut;let O=null;const X=new ut(0,0,0,0);return{setMask:function(oe){O!==oe&&!R&&(e.colorMask(oe,oe,oe,oe),O=oe)},setLocked:function(oe){R=oe},setClear:function(oe,ae,be,Qe,ot){ot===!0&&(oe*=Qe,ae*=Qe,be*=Qe),te.set(oe,ae,be,Qe),X.equals(te)===!1&&(e.clearColor(oe,ae,be,Qe),X.copy(te))},reset:function(){R=!1,O=null,X.set(-1,0,0,0)}}}function i(){let R=!1,te=!1,O=null,X=null,oe=null;return{setReversed:function(ae){if(te!==ae){const be=n.get("EXT_clip_control");te?be.clipControlEXT(be.LOWER_LEFT_EXT,be.ZERO_TO_ONE_EXT):be.clipControlEXT(be.LOWER_LEFT_EXT,be.NEGATIVE_ONE_TO_ONE_EXT);const Qe=oe;oe=null,this.setClear(Qe)}te=ae},getReversed:function(){return te},setTest:function(ae){ae?ie(e.DEPTH_TEST):Te(e.DEPTH_TEST)},setMask:function(ae){O!==ae&&!R&&(e.depthMask(ae),O=ae)},setFunc:function(ae){if(te&&(ae=Gu[ae]),X!==ae){switch(ae){case ri:e.depthFunc(e.NEVER);break;case ii:e.depthFunc(e.ALWAYS);break;case ni:e.depthFunc(e.LESS);break;case bn:e.depthFunc(e.LEQUAL);break;case ti:e.depthFunc(e.EQUAL);break;case ei:e.depthFunc(e.GEQUAL);break;case Jn:e.depthFunc(e.GREATER);break;case Qn:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}X=ae}},setLocked:function(ae){R=ae},setClear:function(ae){oe!==ae&&(te&&(ae=1-ae),e.clearDepth(ae),oe=ae)},reset:function(){R=!1,O=null,X=null,oe=null,te=!1}}}function r(){let R=!1,te=null,O=null,X=null,oe=null,ae=null,be=null,Qe=null,ot=null;return{setTest:function(Xe){R||(Xe?ie(e.STENCIL_TEST):Te(e.STENCIL_TEST))},setMask:function(Xe){te!==Xe&&!R&&(e.stencilMask(Xe),te=Xe)},setFunc:function(Xe,St,Rt){(O!==Xe||X!==St||oe!==Rt)&&(e.stencilFunc(Xe,St,Rt),O=Xe,X=St,oe=Rt)},setOp:function(Xe,St,Rt){(ae!==Xe||be!==St||Qe!==Rt)&&(e.stencilOp(Xe,St,Rt),ae=Xe,be=St,Qe=Rt)},setLocked:function(Xe){R=Xe},setClear:function(Xe){ot!==Xe&&(e.clearStencil(Xe),ot=Xe)},reset:function(){R=!1,te=null,O=null,X=null,oe=null,ae=null,be=null,Qe=null,ot=null}}}const a=new t,o=new i,s=new r,f=new WeakMap,l=new WeakMap;let m={},h={},g=new WeakMap,v=[],C=null,A=!1,u=null,c=null,P=null,x=null,T=null,F=null,D=null,y=new Ve(0,0,0),B=0,S=!1,_=null,w=null,q=null,V=null,K=null;const Z=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let W=!1,J=0;const H=e.getParameter(e.VERSION);H.indexOf("WebGL")!==-1?(J=parseFloat(/^WebGL (\d)/.exec(H)[1]),W=J>=1):H.indexOf("OpenGL ES")!==-1&&(J=parseFloat(/^OpenGL ES (\d)/.exec(H)[1]),W=J>=2);let he=null,Se={};const Pe=e.getParameter(e.SCISSOR_BOX),ke=e.getParameter(e.VIEWPORT),Ze=new ut().fromArray(Pe),k=new ut().fromArray(ke);function Q(R,te,O,X){const oe=new Uint8Array(4),ae=e.createTexture();e.bindTexture(R,ae),e.texParameteri(R,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(R,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let be=0;be<O;be++)R===e.TEXTURE_3D||R===e.TEXTURE_2D_ARRAY?e.texImage3D(te,0,e.RGBA,1,1,X,0,e.RGBA,e.UNSIGNED_BYTE,oe):e.texImage2D(te+be,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,oe);return ae}const de={};de[e.TEXTURE_2D]=Q(e.TEXTURE_2D,e.TEXTURE_2D,1),de[e.TEXTURE_CUBE_MAP]=Q(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),de[e.TEXTURE_2D_ARRAY]=Q(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),de[e.TEXTURE_3D]=Q(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),ie(e.DEPTH_TEST),o.setFunc(bn),ye(!1),Ie(Zi),ie(e.CULL_FACE),M(Xt);function ie(R){m[R]!==!0&&(e.enable(R),m[R]=!0)}function Te(R){m[R]!==!1&&(e.disable(R),m[R]=!1)}function Re(R,te){return h[R]!==te?(e.bindFramebuffer(R,te),h[R]=te,R===e.DRAW_FRAMEBUFFER&&(h[e.FRAMEBUFFER]=te),R===e.FRAMEBUFFER&&(h[e.DRAW_FRAMEBUFFER]=te),!0):!1}function De(R,te){let O=v,X=!1;if(R){O=g.get(te),O===void 0&&(O=[],g.set(te,O));const oe=R.textures;if(O.length!==oe.length||O[0]!==e.COLOR_ATTACHMENT0){for(let ae=0,be=oe.length;ae<be;ae++)O[ae]=e.COLOR_ATTACHMENT0+ae;O.length=oe.length,X=!0}}else O[0]!==e.BACK&&(O[0]=e.BACK,X=!0);X&&e.drawBuffers(O)}function $e(R){return C!==R?(e.useProgram(R),C=R,!0):!1}const Oe={[cn]:e.FUNC_ADD,[Da]:e.FUNC_SUBTRACT,[wa]:e.FUNC_REVERSE_SUBTRACT};Oe[Go]=e.MIN,Oe[Vo]=e.MAX;const tt={[Ka]:e.ZERO,[Xa]:e.ONE,[za]:e.SRC_COLOR,[Wa]:e.SRC_ALPHA,[ka]:e.SRC_ALPHA_SATURATE,[Va]:e.DST_COLOR,[Ga]:e.DST_ALPHA,[Ha]:e.ONE_MINUS_SRC_COLOR,[Ba]:e.ONE_MINUS_SRC_ALPHA,[Fa]:e.ONE_MINUS_DST_COLOR,[Oa]:e.ONE_MINUS_DST_ALPHA,[Na]:e.CONSTANT_COLOR,[Ia]:e.ONE_MINUS_CONSTANT_COLOR,[ya]:e.CONSTANT_ALPHA,[Ua]:e.ONE_MINUS_CONSTANT_ALPHA};function M(R,te,O,X,oe,ae,be,Qe,ot,Xe){if(R===Xt){A===!0&&(Te(e.BLEND),A=!1);return}if(A===!1&&(ie(e.BLEND),A=!0),R!==go){if(R!==u||Xe!==S){if((c!==cn||T!==cn)&&(e.blendEquation(e.FUNC_ADD),c=cn,T=cn),Xe)switch(R){case xn:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case er:e.blendFunc(e.ONE,e.ONE);break;case Ji:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case Qi:e.blendFuncSeparate(e.ZERO,e.SRC_COLOR,e.ZERO,e.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",R);break}else switch(R){case xn:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case er:e.blendFunc(e.SRC_ALPHA,e.ONE);break;case Ji:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case Qi:e.blendFunc(e.ZERO,e.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",R);break}P=null,x=null,F=null,D=null,y.set(0,0,0),B=0,u=R,S=Xe}return}oe=oe||te,ae=ae||O,be=be||X,(te!==c||oe!==T)&&(e.blendEquationSeparate(Oe[te],Oe[oe]),c=te,T=oe),(O!==P||X!==x||ae!==F||be!==D)&&(e.blendFuncSeparate(tt[O],tt[X],tt[ae],tt[be]),P=O,x=X,F=ae,D=be),(Qe.equals(y)===!1||ot!==B)&&(e.blendColor(Qe.r,Qe.g,Qe.b,ot),y.copy(Qe),B=ot),u=R,S=!1}function ht(R,te){R.side===xt?Te(e.CULL_FACE):ie(e.CULL_FACE);let O=R.side===vt;te&&(O=!O),ye(O),R.blending===xn&&R.transparent===!1?M(Xt):M(R.blending,R.blendEquation,R.blendSrc,R.blendDst,R.blendEquationAlpha,R.blendSrcAlpha,R.blendDstAlpha,R.blendColor,R.blendAlpha,R.premultipliedAlpha),o.setFunc(R.depthFunc),o.setTest(R.depthTest),o.setMask(R.depthWrite),a.setMask(R.colorWrite);const X=R.stencilWrite;s.setTest(X),X&&(s.setMask(R.stencilWriteMask),s.setFunc(R.stencilFunc,R.stencilRef,R.stencilFuncMask),s.setOp(R.stencilFail,R.stencilZFail,R.stencilZPass)),qe(R.polygonOffset,R.polygonOffsetFactor,R.polygonOffsetUnits),R.alphaToCoverage===!0?ie(e.SAMPLE_ALPHA_TO_COVERAGE):Te(e.SAMPLE_ALPHA_TO_COVERAGE)}function ye(R){_!==R&&(R?e.frontFace(e.CW):e.frontFace(e.CCW),_=R)}function Ie(R){R!==mo?(ie(e.CULL_FACE),R!==w&&(R===Zi?e.cullFace(e.BACK):R===_o?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):Te(e.CULL_FACE),w=R}function me(R){R!==q&&(W&&e.lineWidth(R),q=R)}function qe(R,te,O){R?(ie(e.POLYGON_OFFSET_FILL),(V!==te||K!==O)&&(e.polygonOffset(te,O),V=te,K=O)):Te(e.POLYGON_OFFSET_FILL)}function _e(R){R?ie(e.SCISSOR_TEST):Te(e.SCISSOR_TEST)}function E(R){R===void 0&&(R=e.TEXTURE0+Z-1),he!==R&&(e.activeTexture(R),he=R)}function d(R,te,O){O===void 0&&(he===null?O=e.TEXTURE0+Z-1:O=he);let X=Se[O];X===void 0&&(X={type:void 0,texture:void 0},Se[O]=X),(X.type!==R||X.texture!==te)&&(he!==O&&(e.activeTexture(O),he=O),e.bindTexture(R,te||de[R]),X.type=R,X.texture=te)}function U(){const R=Se[he];R!==void 0&&R.type!==void 0&&(e.bindTexture(R.type,null),R.type=void 0,R.texture=void 0)}function z(){try{e.compressedTexImage2D.apply(e,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function Y(){try{e.compressedTexImage3D.apply(e,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function G(){try{e.texSubImage2D.apply(e,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function pe(){try{e.texSubImage3D.apply(e,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function re(){try{e.compressedTexSubImage2D.apply(e,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function ce(){try{e.compressedTexSubImage3D.apply(e,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function Fe(){try{e.texStorage2D.apply(e,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function $(){try{e.texStorage3D.apply(e,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function le(){try{e.texImage2D.apply(e,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function Ee(){try{e.texImage3D.apply(e,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function Me(R){Ze.equals(R)===!1&&(e.scissor(R.x,R.y,R.z,R.w),Ze.copy(R))}function fe(R){k.equals(R)===!1&&(e.viewport(R.x,R.y,R.z,R.w),k.copy(R))}function Ne(R,te){let O=l.get(te);O===void 0&&(O=new WeakMap,l.set(te,O));let X=O.get(R);X===void 0&&(X=e.getUniformBlockIndex(te,R.name),O.set(R,X))}function Ce(R,te){const X=l.get(te).get(R);f.get(te)!==X&&(e.uniformBlockBinding(te,X,R.__bindingPointIndex),f.set(te,X))}function Ke(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),m={},he=null,Se={},h={},g=new WeakMap,v=[],C=null,A=!1,u=null,c=null,P=null,x=null,T=null,F=null,D=null,y=new Ve(0,0,0),B=0,S=!1,_=null,w=null,q=null,V=null,K=null,Ze.set(0,0,e.canvas.width,e.canvas.height),k.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:ie,disable:Te,bindFramebuffer:Re,drawBuffers:De,useProgram:$e,setBlending:M,setMaterial:ht,setFlipSided:ye,setCullFace:Ie,setLineWidth:me,setPolygonOffset:qe,setScissorTest:_e,activeTexture:E,bindTexture:d,unbindTexture:U,compressedTexImage2D:z,compressedTexImage3D:Y,texImage2D:le,texImage3D:Ee,updateUBOMapping:Ne,uniformBlockBinding:Ce,texStorage2D:Fe,texStorage3D:$,texSubImage2D:G,texSubImage3D:pe,compressedTexSubImage2D:re,compressedTexSubImage3D:ce,scissor:Me,viewport:fe,reset:Ke}}function ku(e,n,t,i,r,a,o){const s=n.has("WEBGL_multisampled_render_to_texture")?n.get("WEBGL_multisampled_render_to_texture"):null,f=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new st,m=new WeakMap;let h;const g=new WeakMap;let v=!1;try{v=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function C(E,d){return v?new OffscreenCanvas(E,d):Oo("canvas")}function A(E,d,U){let z=1;const Y=_e(E);if((Y.width>U||Y.height>U)&&(z=U/Math.max(Y.width,Y.height)),z<1)if(typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&E instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&E instanceof ImageBitmap||typeof VideoFrame<"u"&&E instanceof VideoFrame){const G=Math.floor(z*Y.width),pe=Math.floor(z*Y.height);h===void 0&&(h=C(G,pe));const re=d?C(G,pe):h;return re.width=G,re.height=pe,re.getContext("2d").drawImage(E,0,0,G,pe),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+Y.width+"x"+Y.height+") to ("+G+"x"+pe+")."),re}else return"data"in E&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+Y.width+"x"+Y.height+")."),E;return E}function u(E){return E.generateMipmaps}function c(E){e.generateMipmap(E)}function P(E){return E.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:E.isWebGL3DRenderTarget?e.TEXTURE_3D:E.isWebGLArrayRenderTarget||E.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function x(E,d,U,z,Y=!1){if(E!==null){if(e[E]!==void 0)return e[E];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+E+"'")}let G=d;if(d===e.RED&&(U===e.FLOAT&&(G=e.R32F),U===e.HALF_FLOAT&&(G=e.R16F),U===e.UNSIGNED_BYTE&&(G=e.R8)),d===e.RED_INTEGER&&(U===e.UNSIGNED_BYTE&&(G=e.R8UI),U===e.UNSIGNED_SHORT&&(G=e.R16UI),U===e.UNSIGNED_INT&&(G=e.R32UI),U===e.BYTE&&(G=e.R8I),U===e.SHORT&&(G=e.R16I),U===e.INT&&(G=e.R32I)),d===e.RG&&(U===e.FLOAT&&(G=e.RG32F),U===e.HALF_FLOAT&&(G=e.RG16F),U===e.UNSIGNED_BYTE&&(G=e.RG8)),d===e.RG_INTEGER&&(U===e.UNSIGNED_BYTE&&(G=e.RG8UI),U===e.UNSIGNED_SHORT&&(G=e.RG16UI),U===e.UNSIGNED_INT&&(G=e.RG32UI),U===e.BYTE&&(G=e.RG8I),U===e.SHORT&&(G=e.RG16I),U===e.INT&&(G=e.RG32I)),d===e.RGB_INTEGER&&(U===e.UNSIGNED_BYTE&&(G=e.RGB8UI),U===e.UNSIGNED_SHORT&&(G=e.RGB16UI),U===e.UNSIGNED_INT&&(G=e.RGB32UI),U===e.BYTE&&(G=e.RGB8I),U===e.SHORT&&(G=e.RGB16I),U===e.INT&&(G=e.RGB32I)),d===e.RGBA_INTEGER&&(U===e.UNSIGNED_BYTE&&(G=e.RGBA8UI),U===e.UNSIGNED_SHORT&&(G=e.RGBA16UI),U===e.UNSIGNED_INT&&(G=e.RGBA32UI),U===e.BYTE&&(G=e.RGBA8I),U===e.SHORT&&(G=e.RGBA16I),U===e.INT&&(G=e.RGBA32I)),d===e.RGB&&U===e.UNSIGNED_INT_5_9_9_9_REV&&(G=e.RGB9_E5),d===e.RGBA){const pe=Y?Jr:et.getTransfer(z);U===e.FLOAT&&(G=e.RGBA32F),U===e.HALF_FLOAT&&(G=e.RGBA16F),U===e.UNSIGNED_BYTE&&(G=pe===Ye?e.SRGB8_ALPHA8:e.RGBA8),U===e.UNSIGNED_SHORT_4_4_4_4&&(G=e.RGBA4),U===e.UNSIGNED_SHORT_5_5_5_1&&(G=e.RGB5_A1)}return(G===e.R16F||G===e.R32F||G===e.RG16F||G===e.RG32F||G===e.RGBA16F||G===e.RGBA32F)&&n.get("EXT_color_buffer_float"),G}function T(E,d){let U;return E?d===null||d===mn||d===hn?U=e.DEPTH24_STENCIL8:d===kt?U=e.DEPTH32F_STENCIL8:d===Ln&&(U=e.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):d===null||d===mn||d===hn?U=e.DEPTH_COMPONENT24:d===kt?U=e.DEPTH_COMPONENT32F:d===Ln&&(U=e.DEPTH_COMPONENT16),U}function F(E,d){return u(E)===!0||E.isFramebufferTexture&&E.minFilter!==Wt&&E.minFilter!==wt?Math.log2(Math.max(d.width,d.height))+1:E.mipmaps!==void 0&&E.mipmaps.length>0?E.mipmaps.length:E.isCompressedTexture&&Array.isArray(E.image)?d.mipmaps.length:1}function D(E){const d=E.target;d.removeEventListener("dispose",D),B(d),d.isVideoTexture&&m.delete(d)}function y(E){const d=E.target;d.removeEventListener("dispose",y),_(d)}function B(E){const d=i.get(E);if(d.__webglInit===void 0)return;const U=E.source,z=g.get(U);if(z){const Y=z[d.__cacheKey];Y.usedTimes--,Y.usedTimes===0&&S(E),Object.keys(z).length===0&&g.delete(U)}i.remove(E)}function S(E){const d=i.get(E);e.deleteTexture(d.__webglTexture);const U=E.source,z=g.get(U);delete z[d.__cacheKey],o.memory.textures--}function _(E){const d=i.get(E);if(E.depthTexture&&(E.depthTexture.dispose(),i.remove(E.depthTexture)),E.isWebGLCubeRenderTarget)for(let z=0;z<6;z++){if(Array.isArray(d.__webglFramebuffer[z]))for(let Y=0;Y<d.__webglFramebuffer[z].length;Y++)e.deleteFramebuffer(d.__webglFramebuffer[z][Y]);else e.deleteFramebuffer(d.__webglFramebuffer[z]);d.__webglDepthbuffer&&e.deleteRenderbuffer(d.__webglDepthbuffer[z])}else{if(Array.isArray(d.__webglFramebuffer))for(let z=0;z<d.__webglFramebuffer.length;z++)e.deleteFramebuffer(d.__webglFramebuffer[z]);else e.deleteFramebuffer(d.__webglFramebuffer);if(d.__webglDepthbuffer&&e.deleteRenderbuffer(d.__webglDepthbuffer),d.__webglMultisampledFramebuffer&&e.deleteFramebuffer(d.__webglMultisampledFramebuffer),d.__webglColorRenderbuffer)for(let z=0;z<d.__webglColorRenderbuffer.length;z++)d.__webglColorRenderbuffer[z]&&e.deleteRenderbuffer(d.__webglColorRenderbuffer[z]);d.__webglDepthRenderbuffer&&e.deleteRenderbuffer(d.__webglDepthRenderbuffer)}const U=E.textures;for(let z=0,Y=U.length;z<Y;z++){const G=i.get(U[z]);G.__webglTexture&&(e.deleteTexture(G.__webglTexture),o.memory.textures--),i.remove(U[z])}i.remove(E)}let w=0;function q(){w=0}function V(){const E=w;return E>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+E+" texture units while this GPU supports only "+r.maxTextures),w+=1,E}function K(E){const d=[];return d.push(E.wrapS),d.push(E.wrapT),d.push(E.wrapR||0),d.push(E.magFilter),d.push(E.minFilter),d.push(E.anisotropy),d.push(E.internalFormat),d.push(E.format),d.push(E.type),d.push(E.generateMipmaps),d.push(E.premultiplyAlpha),d.push(E.flipY),d.push(E.unpackAlignment),d.push(E.colorSpace),d.join()}function Z(E,d){const U=i.get(E);if(E.isVideoTexture&&me(E),E.isRenderTargetTexture===!1&&E.version>0&&U.__version!==E.version){const z=E.image;if(z===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(z.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{k(U,E,d);return}}t.bindTexture(e.TEXTURE_2D,U.__webglTexture,e.TEXTURE0+d)}function W(E,d){const U=i.get(E);if(E.version>0&&U.__version!==E.version){k(U,E,d);return}t.bindTexture(e.TEXTURE_2D_ARRAY,U.__webglTexture,e.TEXTURE0+d)}function J(E,d){const U=i.get(E);if(E.version>0&&U.__version!==E.version){k(U,E,d);return}t.bindTexture(e.TEXTURE_3D,U.__webglTexture,e.TEXTURE0+d)}function H(E,d){const U=i.get(E);if(E.version>0&&U.__version!==E.version){Q(U,E,d);return}t.bindTexture(e.TEXTURE_CUBE_MAP,U.__webglTexture,e.TEXTURE0+d)}const he={[Cn]:e.REPEAT,[Hr]:e.CLAMP_TO_EDGE,[Br]:e.MIRRORED_REPEAT},Se={[Wt]:e.NEAREST,[Gr]:e.NEAREST_MIPMAP_NEAREST,[fn]:e.NEAREST_MIPMAP_LINEAR,[wt]:e.LINEAR,[Mn]:e.LINEAR_MIPMAP_NEAREST,[Gt]:e.LINEAR_MIPMAP_LINEAR},Pe={[Ja]:e.NEVER,[Qa]:e.ALWAYS,[Za]:e.LESS,[Vr]:e.LEQUAL,[$a]:e.EQUAL,[ja]:e.GEQUAL,[Ya]:e.GREATER,[qa]:e.NOTEQUAL};function ke(E,d){if(d.type===kt&&n.has("OES_texture_float_linear")===!1&&(d.magFilter===wt||d.magFilter===Mn||d.magFilter===fn||d.magFilter===Gt||d.minFilter===wt||d.minFilter===Mn||d.minFilter===fn||d.minFilter===Gt)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),e.texParameteri(E,e.TEXTURE_WRAP_S,he[d.wrapS]),e.texParameteri(E,e.TEXTURE_WRAP_T,he[d.wrapT]),(E===e.TEXTURE_3D||E===e.TEXTURE_2D_ARRAY)&&e.texParameteri(E,e.TEXTURE_WRAP_R,he[d.wrapR]),e.texParameteri(E,e.TEXTURE_MAG_FILTER,Se[d.magFilter]),e.texParameteri(E,e.TEXTURE_MIN_FILTER,Se[d.minFilter]),d.compareFunction&&(e.texParameteri(E,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(E,e.TEXTURE_COMPARE_FUNC,Pe[d.compareFunction])),n.has("EXT_texture_filter_anisotropic")===!0){if(d.magFilter===Wt||d.minFilter!==fn&&d.minFilter!==Gt||d.type===kt&&n.has("OES_texture_float_linear")===!1)return;if(d.anisotropy>1||i.get(d).__currentAnisotropy){const U=n.get("EXT_texture_filter_anisotropic");e.texParameterf(E,U.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(d.anisotropy,r.getMaxAnisotropy())),i.get(d).__currentAnisotropy=d.anisotropy}}}function Ze(E,d){let U=!1;E.__webglInit===void 0&&(E.__webglInit=!0,d.addEventListener("dispose",D));const z=d.source;let Y=g.get(z);Y===void 0&&(Y={},g.set(z,Y));const G=K(d);if(G!==E.__cacheKey){Y[G]===void 0&&(Y[G]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,U=!0),Y[G].usedTimes++;const pe=Y[E.__cacheKey];pe!==void 0&&(Y[E.__cacheKey].usedTimes--,pe.usedTimes===0&&S(d)),E.__cacheKey=G,E.__webglTexture=Y[G].texture}return U}function k(E,d,U){let z=e.TEXTURE_2D;(d.isDataArrayTexture||d.isCompressedArrayTexture)&&(z=e.TEXTURE_2D_ARRAY),d.isData3DTexture&&(z=e.TEXTURE_3D);const Y=Ze(E,d),G=d.source;t.bindTexture(z,E.__webglTexture,e.TEXTURE0+U);const pe=i.get(G);if(G.version!==pe.__version||Y===!0){t.activeTexture(e.TEXTURE0+U);const re=et.getPrimaries(et.workingColorSpace),ce=d.colorSpace===Zt?null:et.getPrimaries(d.colorSpace),Fe=d.colorSpace===Zt||re===ce?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,d.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,d.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,d.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Fe);let $=A(d.image,!1,r.maxTextureSize);$=qe(d,$);const le=a.convert(d.format,d.colorSpace),Ee=a.convert(d.type);let Me=x(d.internalFormat,le,Ee,d.colorSpace,d.isVideoTexture);ke(z,d);let fe;const Ne=d.mipmaps,Ce=d.isVideoTexture!==!0,Ke=pe.__version===void 0||Y===!0,R=G.dataReady,te=F(d,$);if(d.isDepthTexture)Me=T(d.format===Rn,d.type),Ke&&(Ce?t.texStorage2D(e.TEXTURE_2D,1,Me,$.width,$.height):t.texImage2D(e.TEXTURE_2D,0,Me,$.width,$.height,0,le,Ee,null));else if(d.isDataTexture)if(Ne.length>0){Ce&&Ke&&t.texStorage2D(e.TEXTURE_2D,te,Me,Ne[0].width,Ne[0].height);for(let O=0,X=Ne.length;O<X;O++)fe=Ne[O],Ce?R&&t.texSubImage2D(e.TEXTURE_2D,O,0,0,fe.width,fe.height,le,Ee,fe.data):t.texImage2D(e.TEXTURE_2D,O,Me,fe.width,fe.height,0,le,Ee,fe.data);d.generateMipmaps=!1}else Ce?(Ke&&t.texStorage2D(e.TEXTURE_2D,te,Me,$.width,$.height),R&&t.texSubImage2D(e.TEXTURE_2D,0,0,0,$.width,$.height,le,Ee,$.data)):t.texImage2D(e.TEXTURE_2D,0,Me,$.width,$.height,0,le,Ee,$.data);else if(d.isCompressedTexture)if(d.isCompressedArrayTexture){Ce&&Ke&&t.texStorage3D(e.TEXTURE_2D_ARRAY,te,Me,Ne[0].width,Ne[0].height,$.depth);for(let O=0,X=Ne.length;O<X;O++)if(fe=Ne[O],d.format!==Lt)if(le!==null)if(Ce){if(R)if(d.layerUpdates.size>0){const oe=nr(fe.width,fe.height,d.format,d.type);for(const ae of d.layerUpdates){const be=fe.data.subarray(ae*oe/fe.data.BYTES_PER_ELEMENT,(ae+1)*oe/fe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,O,0,0,ae,fe.width,fe.height,1,le,be)}d.clearLayerUpdates()}else t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,O,0,0,0,fe.width,fe.height,$.depth,le,fe.data)}else t.compressedTexImage3D(e.TEXTURE_2D_ARRAY,O,Me,fe.width,fe.height,$.depth,0,fe.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Ce?R&&t.texSubImage3D(e.TEXTURE_2D_ARRAY,O,0,0,0,fe.width,fe.height,$.depth,le,Ee,fe.data):t.texImage3D(e.TEXTURE_2D_ARRAY,O,Me,fe.width,fe.height,$.depth,0,le,Ee,fe.data)}else{Ce&&Ke&&t.texStorage2D(e.TEXTURE_2D,te,Me,Ne[0].width,Ne[0].height);for(let O=0,X=Ne.length;O<X;O++)fe=Ne[O],d.format!==Lt?le!==null?Ce?R&&t.compressedTexSubImage2D(e.TEXTURE_2D,O,0,0,fe.width,fe.height,le,fe.data):t.compressedTexImage2D(e.TEXTURE_2D,O,Me,fe.width,fe.height,0,fe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ce?R&&t.texSubImage2D(e.TEXTURE_2D,O,0,0,fe.width,fe.height,le,Ee,fe.data):t.texImage2D(e.TEXTURE_2D,O,Me,fe.width,fe.height,0,le,Ee,fe.data)}else if(d.isDataArrayTexture)if(Ce){if(Ke&&t.texStorage3D(e.TEXTURE_2D_ARRAY,te,Me,$.width,$.height,$.depth),R)if(d.layerUpdates.size>0){const O=nr($.width,$.height,d.format,d.type);for(const X of d.layerUpdates){const oe=$.data.subarray(X*O/$.data.BYTES_PER_ELEMENT,(X+1)*O/$.data.BYTES_PER_ELEMENT);t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,X,$.width,$.height,1,le,Ee,oe)}d.clearLayerUpdates()}else t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,$.width,$.height,$.depth,le,Ee,$.data)}else t.texImage3D(e.TEXTURE_2D_ARRAY,0,Me,$.width,$.height,$.depth,0,le,Ee,$.data);else if(d.isData3DTexture)Ce?(Ke&&t.texStorage3D(e.TEXTURE_3D,te,Me,$.width,$.height,$.depth),R&&t.texSubImage3D(e.TEXTURE_3D,0,0,0,0,$.width,$.height,$.depth,le,Ee,$.data)):t.texImage3D(e.TEXTURE_3D,0,Me,$.width,$.height,$.depth,0,le,Ee,$.data);else if(d.isFramebufferTexture){if(Ke)if(Ce)t.texStorage2D(e.TEXTURE_2D,te,Me,$.width,$.height);else{let O=$.width,X=$.height;for(let oe=0;oe<te;oe++)t.texImage2D(e.TEXTURE_2D,oe,Me,O,X,0,le,Ee,null),O>>=1,X>>=1}}else if(Ne.length>0){if(Ce&&Ke){const O=_e(Ne[0]);t.texStorage2D(e.TEXTURE_2D,te,Me,O.width,O.height)}for(let O=0,X=Ne.length;O<X;O++)fe=Ne[O],Ce?R&&t.texSubImage2D(e.TEXTURE_2D,O,0,0,le,Ee,fe):t.texImage2D(e.TEXTURE_2D,O,Me,le,Ee,fe);d.generateMipmaps=!1}else if(Ce){if(Ke){const O=_e($);t.texStorage2D(e.TEXTURE_2D,te,Me,O.width,O.height)}R&&t.texSubImage2D(e.TEXTURE_2D,0,0,0,le,Ee,$)}else t.texImage2D(e.TEXTURE_2D,0,Me,le,Ee,$);u(d)&&c(z),pe.__version=G.version,d.onUpdate&&d.onUpdate(d)}E.__version=d.version}function Q(E,d,U){if(d.image.length!==6)return;const z=Ze(E,d),Y=d.source;t.bindTexture(e.TEXTURE_CUBE_MAP,E.__webglTexture,e.TEXTURE0+U);const G=i.get(Y);if(Y.version!==G.__version||z===!0){t.activeTexture(e.TEXTURE0+U);const pe=et.getPrimaries(et.workingColorSpace),re=d.colorSpace===Zt?null:et.getPrimaries(d.colorSpace),ce=d.colorSpace===Zt||pe===re?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,d.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,d.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,d.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,ce);const Fe=d.isCompressedTexture||d.image[0].isCompressedTexture,$=d.image[0]&&d.image[0].isDataTexture,le=[];for(let X=0;X<6;X++)!Fe&&!$?le[X]=A(d.image[X],!0,r.maxCubemapSize):le[X]=$?d.image[X].image:d.image[X],le[X]=qe(d,le[X]);const Ee=le[0],Me=a.convert(d.format,d.colorSpace),fe=a.convert(d.type),Ne=x(d.internalFormat,Me,fe,d.colorSpace),Ce=d.isVideoTexture!==!0,Ke=G.__version===void 0||z===!0,R=Y.dataReady;let te=F(d,Ee);ke(e.TEXTURE_CUBE_MAP,d);let O;if(Fe){Ce&&Ke&&t.texStorage2D(e.TEXTURE_CUBE_MAP,te,Ne,Ee.width,Ee.height);for(let X=0;X<6;X++){O=le[X].mipmaps;for(let oe=0;oe<O.length;oe++){const ae=O[oe];d.format!==Lt?Me!==null?Ce?R&&t.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,0,0,ae.width,ae.height,Me,ae.data):t.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,Ne,ae.width,ae.height,0,ae.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Ce?R&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,0,0,ae.width,ae.height,Me,fe,ae.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,Ne,ae.width,ae.height,0,Me,fe,ae.data)}}}else{if(O=d.mipmaps,Ce&&Ke){O.length>0&&te++;const X=_e(le[0]);t.texStorage2D(e.TEXTURE_CUBE_MAP,te,Ne,X.width,X.height)}for(let X=0;X<6;X++)if($){Ce?R&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,0,0,le[X].width,le[X].height,Me,fe,le[X].data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,Ne,le[X].width,le[X].height,0,Me,fe,le[X].data);for(let oe=0;oe<O.length;oe++){const be=O[oe].image[X].image;Ce?R&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,0,0,be.width,be.height,Me,fe,be.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,Ne,be.width,be.height,0,Me,fe,be.data)}}else{Ce?R&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,0,0,Me,fe,le[X]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,Ne,Me,fe,le[X]);for(let oe=0;oe<O.length;oe++){const ae=O[oe];Ce?R&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,0,0,Me,fe,ae.image[X]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,Ne,Me,fe,ae.image[X])}}}u(d)&&c(e.TEXTURE_CUBE_MAP),G.__version=Y.version,d.onUpdate&&d.onUpdate(d)}E.__version=d.version}function de(E,d,U,z,Y,G){const pe=a.convert(U.format,U.colorSpace),re=a.convert(U.type),ce=x(U.internalFormat,pe,re,U.colorSpace),Fe=i.get(d),$=i.get(U);if($.__renderTarget=d,!Fe.__hasExternalTextures){const le=Math.max(1,d.width>>G),Ee=Math.max(1,d.height>>G);Y===e.TEXTURE_3D||Y===e.TEXTURE_2D_ARRAY?t.texImage3D(Y,G,ce,le,Ee,d.depth,0,pe,re,null):t.texImage2D(Y,G,ce,le,Ee,0,pe,re,null)}t.bindFramebuffer(e.FRAMEBUFFER,E),Ie(d)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,z,Y,$.__webglTexture,0,ye(d)):(Y===e.TEXTURE_2D||Y>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&Y<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,z,Y,$.__webglTexture,G),t.bindFramebuffer(e.FRAMEBUFFER,null)}function ie(E,d,U){if(e.bindRenderbuffer(e.RENDERBUFFER,E),d.depthBuffer){const z=d.depthTexture,Y=z&&z.isDepthTexture?z.type:null,G=T(d.stencilBuffer,Y),pe=d.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,re=ye(d);Ie(d)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,re,G,d.width,d.height):U?e.renderbufferStorageMultisample(e.RENDERBUFFER,re,G,d.width,d.height):e.renderbufferStorage(e.RENDERBUFFER,G,d.width,d.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,pe,e.RENDERBUFFER,E)}else{const z=d.textures;for(let Y=0;Y<z.length;Y++){const G=z[Y],pe=a.convert(G.format,G.colorSpace),re=a.convert(G.type),ce=x(G.internalFormat,pe,re,G.colorSpace),Fe=ye(d);U&&Ie(d)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,Fe,ce,d.width,d.height):Ie(d)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Fe,ce,d.width,d.height):e.renderbufferStorage(e.RENDERBUFFER,ce,d.width,d.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Te(E,d){if(d&&d.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(e.FRAMEBUFFER,E),!(d.depthTexture&&d.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const z=i.get(d.depthTexture);z.__renderTarget=d,(!z.__webglTexture||d.depthTexture.image.width!==d.width||d.depthTexture.image.height!==d.height)&&(d.depthTexture.image.width=d.width,d.depthTexture.image.height=d.height,d.depthTexture.needsUpdate=!0),Z(d.depthTexture,0);const Y=z.__webglTexture,G=ye(d);if(d.depthTexture.format===hi)Ie(d)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,Y,0,G):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,Y,0);else if(d.depthTexture.format===Rn)Ie(d)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,Y,0,G):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,Y,0);else throw new Error("Unknown depthTexture format")}function Re(E){const d=i.get(E),U=E.isWebGLCubeRenderTarget===!0;if(d.__boundDepthTexture!==E.depthTexture){const z=E.depthTexture;if(d.__depthDisposeCallback&&d.__depthDisposeCallback(),z){const Y=()=>{delete d.__boundDepthTexture,delete d.__depthDisposeCallback,z.removeEventListener("dispose",Y)};z.addEventListener("dispose",Y),d.__depthDisposeCallback=Y}d.__boundDepthTexture=z}if(E.depthTexture&&!d.__autoAllocateDepthBuffer){if(U)throw new Error("target.depthTexture not supported in Cube render targets");Te(d.__webglFramebuffer,E)}else if(U){d.__webglDepthbuffer=[];for(let z=0;z<6;z++)if(t.bindFramebuffer(e.FRAMEBUFFER,d.__webglFramebuffer[z]),d.__webglDepthbuffer[z]===void 0)d.__webglDepthbuffer[z]=e.createRenderbuffer(),ie(d.__webglDepthbuffer[z],E,!1);else{const Y=E.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,G=d.__webglDepthbuffer[z];e.bindRenderbuffer(e.RENDERBUFFER,G),e.framebufferRenderbuffer(e.FRAMEBUFFER,Y,e.RENDERBUFFER,G)}}else if(t.bindFramebuffer(e.FRAMEBUFFER,d.__webglFramebuffer),d.__webglDepthbuffer===void 0)d.__webglDepthbuffer=e.createRenderbuffer(),ie(d.__webglDepthbuffer,E,!1);else{const z=E.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,Y=d.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,Y),e.framebufferRenderbuffer(e.FRAMEBUFFER,z,e.RENDERBUFFER,Y)}t.bindFramebuffer(e.FRAMEBUFFER,null)}function De(E,d,U){const z=i.get(E);d!==void 0&&de(z.__webglFramebuffer,E,E.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),U!==void 0&&Re(E)}function $e(E){const d=E.texture,U=i.get(E),z=i.get(d);E.addEventListener("dispose",y);const Y=E.textures,G=E.isWebGLCubeRenderTarget===!0,pe=Y.length>1;if(pe||(z.__webglTexture===void 0&&(z.__webglTexture=e.createTexture()),z.__version=d.version,o.memory.textures++),G){U.__webglFramebuffer=[];for(let re=0;re<6;re++)if(d.mipmaps&&d.mipmaps.length>0){U.__webglFramebuffer[re]=[];for(let ce=0;ce<d.mipmaps.length;ce++)U.__webglFramebuffer[re][ce]=e.createFramebuffer()}else U.__webglFramebuffer[re]=e.createFramebuffer()}else{if(d.mipmaps&&d.mipmaps.length>0){U.__webglFramebuffer=[];for(let re=0;re<d.mipmaps.length;re++)U.__webglFramebuffer[re]=e.createFramebuffer()}else U.__webglFramebuffer=e.createFramebuffer();if(pe)for(let re=0,ce=Y.length;re<ce;re++){const Fe=i.get(Y[re]);Fe.__webglTexture===void 0&&(Fe.__webglTexture=e.createTexture(),o.memory.textures++)}if(E.samples>0&&Ie(E)===!1){U.__webglMultisampledFramebuffer=e.createFramebuffer(),U.__webglColorRenderbuffer=[],t.bindFramebuffer(e.FRAMEBUFFER,U.__webglMultisampledFramebuffer);for(let re=0;re<Y.length;re++){const ce=Y[re];U.__webglColorRenderbuffer[re]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,U.__webglColorRenderbuffer[re]);const Fe=a.convert(ce.format,ce.colorSpace),$=a.convert(ce.type),le=x(ce.internalFormat,Fe,$,ce.colorSpace,E.isXRRenderTarget===!0),Ee=ye(E);e.renderbufferStorageMultisample(e.RENDERBUFFER,Ee,le,E.width,E.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+re,e.RENDERBUFFER,U.__webglColorRenderbuffer[re])}e.bindRenderbuffer(e.RENDERBUFFER,null),E.depthBuffer&&(U.__webglDepthRenderbuffer=e.createRenderbuffer(),ie(U.__webglDepthRenderbuffer,E,!0)),t.bindFramebuffer(e.FRAMEBUFFER,null)}}if(G){t.bindTexture(e.TEXTURE_CUBE_MAP,z.__webglTexture),ke(e.TEXTURE_CUBE_MAP,d);for(let re=0;re<6;re++)if(d.mipmaps&&d.mipmaps.length>0)for(let ce=0;ce<d.mipmaps.length;ce++)de(U.__webglFramebuffer[re][ce],E,d,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+re,ce);else de(U.__webglFramebuffer[re],E,d,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+re,0);u(d)&&c(e.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(pe){for(let re=0,ce=Y.length;re<ce;re++){const Fe=Y[re],$=i.get(Fe);t.bindTexture(e.TEXTURE_2D,$.__webglTexture),ke(e.TEXTURE_2D,Fe),de(U.__webglFramebuffer,E,Fe,e.COLOR_ATTACHMENT0+re,e.TEXTURE_2D,0),u(Fe)&&c(e.TEXTURE_2D)}t.unbindTexture()}else{let re=e.TEXTURE_2D;if((E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(re=E.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),t.bindTexture(re,z.__webglTexture),ke(re,d),d.mipmaps&&d.mipmaps.length>0)for(let ce=0;ce<d.mipmaps.length;ce++)de(U.__webglFramebuffer[ce],E,d,e.COLOR_ATTACHMENT0,re,ce);else de(U.__webglFramebuffer,E,d,e.COLOR_ATTACHMENT0,re,0);u(d)&&c(re),t.unbindTexture()}E.depthBuffer&&Re(E)}function Oe(E){const d=E.textures;for(let U=0,z=d.length;U<z;U++){const Y=d[U];if(u(Y)){const G=P(E),pe=i.get(Y).__webglTexture;t.bindTexture(G,pe),c(G),t.unbindTexture()}}}const tt=[],M=[];function ht(E){if(E.samples>0){if(Ie(E)===!1){const d=E.textures,U=E.width,z=E.height;let Y=e.COLOR_BUFFER_BIT;const G=E.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,pe=i.get(E),re=d.length>1;if(re)for(let ce=0;ce<d.length;ce++)t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ce,e.RENDERBUFFER,null),t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+ce,e.TEXTURE_2D,null,0);t.bindFramebuffer(e.READ_FRAMEBUFFER,pe.__webglMultisampledFramebuffer),t.bindFramebuffer(e.DRAW_FRAMEBUFFER,pe.__webglFramebuffer);for(let ce=0;ce<d.length;ce++){if(E.resolveDepthBuffer&&(E.depthBuffer&&(Y|=e.DEPTH_BUFFER_BIT),E.stencilBuffer&&E.resolveStencilBuffer&&(Y|=e.STENCIL_BUFFER_BIT)),re){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,pe.__webglColorRenderbuffer[ce]);const Fe=i.get(d[ce]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,Fe,0)}e.blitFramebuffer(0,0,U,z,0,0,U,z,Y,e.NEAREST),f===!0&&(tt.length=0,M.length=0,tt.push(e.COLOR_ATTACHMENT0+ce),E.depthBuffer&&E.resolveDepthBuffer===!1&&(tt.push(G),M.push(G),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,M)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,tt))}if(t.bindFramebuffer(e.READ_FRAMEBUFFER,null),t.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),re)for(let ce=0;ce<d.length;ce++){t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ce,e.RENDERBUFFER,pe.__webglColorRenderbuffer[ce]);const Fe=i.get(d[ce]).__webglTexture;t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+ce,e.TEXTURE_2D,Fe,0)}t.bindFramebuffer(e.DRAW_FRAMEBUFFER,pe.__webglMultisampledFramebuffer)}else if(E.depthBuffer&&E.resolveDepthBuffer===!1&&f){const d=E.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[d])}}}function ye(E){return Math.min(r.maxSamples,E.samples)}function Ie(E){const d=i.get(E);return E.samples>0&&n.has("WEBGL_multisampled_render_to_texture")===!0&&d.__useRenderToTexture!==!1}function me(E){const d=o.render.frame;m.get(E)!==d&&(m.set(E,d),E.update())}function qe(E,d){const U=E.colorSpace,z=E.format,Y=E.type;return E.isCompressedTexture===!0||E.isVideoTexture===!0||U!==pt&&U!==Zt&&(et.getTransfer(U)===Ye?(z!==Lt||Y!==Kt)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",U)),d}function _e(E){return typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement?(l.width=E.naturalWidth||E.width,l.height=E.naturalHeight||E.height):typeof VideoFrame<"u"&&E instanceof VideoFrame?(l.width=E.displayWidth,l.height=E.displayHeight):(l.width=E.width,l.height=E.height),l}this.allocateTextureUnit=V,this.resetTextureUnits=q,this.setTexture2D=Z,this.setTexture2DArray=W,this.setTexture3D=J,this.setTextureCube=H,this.rebindTextures=De,this.setupRenderTarget=$e,this.updateRenderTargetMipmap=Oe,this.updateMultisampleRenderTarget=ht,this.setupDepthRenderbuffer=Re,this.setupFrameBufferTexture=de,this.useMultisampledRTT=Ie}function Wu(e,n){function t(i,r=Zt){let a;const o=et.getTransfer(r);if(i===Kt)return e.UNSIGNED_BYTE;if(i===Wr)return e.UNSIGNED_SHORT_4_4_4_4;if(i===zr)return e.UNSIGNED_SHORT_5_5_5_1;if(i===ro)return e.UNSIGNED_INT_5_9_9_9_REV;if(i===ao)return e.BYTE;if(i===oo)return e.SHORT;if(i===Ln)return e.UNSIGNED_SHORT;if(i===Kr)return e.INT;if(i===mn)return e.UNSIGNED_INT;if(i===kt)return e.FLOAT;if(i===Dn)return e.HALF_FLOAT;if(i===so)return e.ALPHA;if(i===co)return e.RGB;if(i===Lt)return e.RGBA;if(i===lo)return e.LUMINANCE;if(i===fo)return e.LUMINANCE_ALPHA;if(i===hi)return e.DEPTH_COMPONENT;if(i===Rn)return e.DEPTH_STENCIL;if(i===uo)return e.RED;if(i===qr)return e.RED_INTEGER;if(i===po)return e.RG;if(i===Yr)return e.RG_INTEGER;if(i===jr)return e.RGBA_INTEGER;if(i===On||i===Fn||i===Bn||i===Hn)if(o===Ye)if(a=n.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(i===On)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Fn)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Bn)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Hn)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=n.get("WEBGL_compressed_texture_s3tc"),a!==null){if(i===On)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Fn)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Bn)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Hn)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Ri||i===bi||i===Ci||i===Li)if(a=n.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(i===Ri)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===bi)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Ci)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Li)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Pi||i===wi||i===Di)if(a=n.get("WEBGL_compressed_texture_etc"),a!==null){if(i===Pi||i===wi)return o===Ye?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(i===Di)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Ui||i===yi||i===Ii||i===Ni||i===Oi||i===Fi||i===Bi||i===Hi||i===Gi||i===Vi||i===ki||i===Wi||i===zi||i===Xi)if(a=n.get("WEBGL_compressed_texture_astc"),a!==null){if(i===Ui)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===yi)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Ii)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Ni)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Oi)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Fi)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Bi)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Hi)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Gi)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Vi)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===ki)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Wi)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===zi)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Xi)return o===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Gn||i===Ki||i===qi)if(a=n.get("EXT_texture_compression_bptc"),a!==null){if(i===Gn)return o===Ye?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Ki)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===qi)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===ho||i===Yi||i===ji||i===$i)if(a=n.get("EXT_texture_compression_rgtc"),a!==null){if(i===Gn)return a.COMPRESSED_RED_RGTC1_EXT;if(i===Yi)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===ji)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===$i)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===hn?e.UNSIGNED_INT_24_8:e[i]!==void 0?e[i]:null}return{convert:t}}const zu={type:"move"};class Yn{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Vt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Vt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new we,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new we),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Vt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new we,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new we),this._grip}dispatchEvent(n){return this._targetRay!==null&&this._targetRay.dispatchEvent(n),this._grip!==null&&this._grip.dispatchEvent(n),this._hand!==null&&this._hand.dispatchEvent(n),this}connect(n){if(n&&n.hand){const t=this._hand;if(t)for(const i of n.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:n}),this}disconnect(n){return this.dispatchEvent({type:"disconnected",data:n}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(n,t,i){let r=null,a=null,o=null;const s=this._targetRay,f=this._grip,l=this._hand;if(n&&t.session.visibilityState!=="visible-blurred"){if(l&&n.hand){o=!0;for(const A of n.hand.values()){const u=t.getJointPose(A,i),c=this._getHandJoint(l,A);u!==null&&(c.matrix.fromArray(u.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,c.jointRadius=u.radius),c.visible=u!==null}const m=l.joints["index-finger-tip"],h=l.joints["thumb-tip"],g=m.position.distanceTo(h.position),v=.02,C=.005;l.inputState.pinching&&g>v+C?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:n.handedness,target:this})):!l.inputState.pinching&&g<=v-C&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:n.handedness,target:this}))}else f!==null&&n.gripSpace&&(a=t.getPose(n.gripSpace,i),a!==null&&(f.matrix.fromArray(a.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,a.linearVelocity?(f.hasLinearVelocity=!0,f.linearVelocity.copy(a.linearVelocity)):f.hasLinearVelocity=!1,a.angularVelocity?(f.hasAngularVelocity=!0,f.angularVelocity.copy(a.angularVelocity)):f.hasAngularVelocity=!1));s!==null&&(r=t.getPose(n.targetRaySpace,i),r===null&&a!==null&&(r=a),r!==null&&(s.matrix.fromArray(r.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,r.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(r.linearVelocity)):s.hasLinearVelocity=!1,r.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(r.angularVelocity)):s.hasAngularVelocity=!1,this.dispatchEvent(zu)))}return s!==null&&(s.visible=r!==null),f!==null&&(f.visible=a!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(n,t){if(n.joints[t.jointName]===void 0){const i=new Vt;i.matrixAutoUpdate=!1,i.visible=!1,n.joints[t.jointName]=i,n.add(i)}return n.joints[t.jointName]}}const Xu=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Ku=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class qu{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(n,t,i){if(this.texture===null){const r=new Pn,a=n.properties.get(r);a.__webglTexture=t.texture,(t.depthNear!=i.depthNear||t.depthFar!=i.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=r}}getMesh(n){if(this.texture!==null&&this.mesh===null){const t=n.cameras[0].viewport,i=new qt({vertexShader:Xu,fragmentShader:Ku,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Pt(new Xr(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Yu extends Ca{constructor(n,t){super();const i=this;let r=null,a=1,o=null,s="local-floor",f=1,l=null,m=null,h=null,g=null,v=null,C=null;const A=new qu,u=t.getContextAttributes();let c=null,P=null;const x=[],T=[],F=new st;let D=null;const y=new dn;y.viewport=new ut;const B=new dn;B.viewport=new ut;const S=[y,B],_=new La;let w=null,q=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(k){let Q=x[k];return Q===void 0&&(Q=new Yn,x[k]=Q),Q.getTargetRaySpace()},this.getControllerGrip=function(k){let Q=x[k];return Q===void 0&&(Q=new Yn,x[k]=Q),Q.getGripSpace()},this.getHand=function(k){let Q=x[k];return Q===void 0&&(Q=new Yn,x[k]=Q),Q.getHandSpace()};function V(k){const Q=T.indexOf(k.inputSource);if(Q===-1)return;const de=x[Q];de!==void 0&&(de.update(k.inputSource,k.frame,l||o),de.dispatchEvent({type:k.type,data:k.inputSource}))}function K(){r.removeEventListener("select",V),r.removeEventListener("selectstart",V),r.removeEventListener("selectend",V),r.removeEventListener("squeeze",V),r.removeEventListener("squeezestart",V),r.removeEventListener("squeezeend",V),r.removeEventListener("end",K),r.removeEventListener("inputsourceschange",Z);for(let k=0;k<x.length;k++){const Q=T[k];Q!==null&&(T[k]=null,x[k].disconnect(Q))}w=null,q=null,A.reset(),n.setRenderTarget(c),v=null,g=null,h=null,r=null,P=null,Ze.stop(),i.isPresenting=!1,n.setPixelRatio(D),n.setSize(F.width,F.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(k){a=k,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(k){s=k,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(k){l=k},this.getBaseLayer=function(){return g!==null?g:v},this.getBinding=function(){return h},this.getFrame=function(){return C},this.getSession=function(){return r},this.setSession=async function(k){if(r=k,r!==null){if(c=n.getRenderTarget(),r.addEventListener("select",V),r.addEventListener("selectstart",V),r.addEventListener("selectend",V),r.addEventListener("squeeze",V),r.addEventListener("squeezestart",V),r.addEventListener("squeezeend",V),r.addEventListener("end",K),r.addEventListener("inputsourceschange",Z),u.xrCompatible!==!0&&await t.makeXRCompatible(),D=n.getPixelRatio(),n.getSize(F),r.renderState.layers===void 0){const Q={antialias:u.antialias,alpha:!0,depth:u.depth,stencil:u.stencil,framebufferScaleFactor:a};v=new XRWebGLLayer(r,t,Q),r.updateRenderState({baseLayer:v}),n.setPixelRatio(1),n.setSize(v.framebufferWidth,v.framebufferHeight,!1),P=new nn(v.framebufferWidth,v.framebufferHeight,{format:Lt,type:Kt,colorSpace:n.outputColorSpace,stencilBuffer:u.stencil})}else{let Q=null,de=null,ie=null;u.depth&&(ie=u.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,Q=u.stencil?Rn:hi,de=u.stencil?hn:mn);const Te={colorFormat:t.RGBA8,depthFormat:ie,scaleFactor:a};h=new XRWebGLBinding(r,t),g=h.createProjectionLayer(Te),r.updateRenderState({layers:[g]}),n.setPixelRatio(1),n.setSize(g.textureWidth,g.textureHeight,!1),P=new nn(g.textureWidth,g.textureHeight,{format:Lt,type:Kt,depthTexture:new Nr(g.textureWidth,g.textureHeight,de,void 0,void 0,void 0,void 0,void 0,void 0,Q),stencilBuffer:u.stencil,colorSpace:n.outputColorSpace,samples:u.antialias?4:0,resolveDepthBuffer:g.ignoreDepthValues===!1})}P.isXRRenderTarget=!0,this.setFoveation(f),l=null,o=await r.requestReferenceSpace(s),Ze.setContext(r),Ze.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return A.getDepthTexture()};function Z(k){for(let Q=0;Q<k.removed.length;Q++){const de=k.removed[Q],ie=T.indexOf(de);ie>=0&&(T[ie]=null,x[ie].disconnect(de))}for(let Q=0;Q<k.added.length;Q++){const de=k.added[Q];let ie=T.indexOf(de);if(ie===-1){for(let Re=0;Re<x.length;Re++)if(Re>=T.length){T.push(de),ie=Re;break}else if(T[Re]===null){T[Re]=de,ie=Re;break}if(ie===-1)break}const Te=x[ie];Te&&Te.connect(de)}}const W=new we,J=new we;function H(k,Q,de){W.setFromMatrixPosition(Q.matrixWorld),J.setFromMatrixPosition(de.matrixWorld);const ie=W.distanceTo(J),Te=Q.projectionMatrix.elements,Re=de.projectionMatrix.elements,De=Te[14]/(Te[10]-1),$e=Te[14]/(Te[10]+1),Oe=(Te[9]+1)/Te[5],tt=(Te[9]-1)/Te[5],M=(Te[8]-1)/Te[0],ht=(Re[8]+1)/Re[0],ye=De*M,Ie=De*ht,me=ie/(-M+ht),qe=me*-M;if(Q.matrixWorld.decompose(k.position,k.quaternion,k.scale),k.translateX(qe),k.translateZ(me),k.matrixWorld.compose(k.position,k.quaternion,k.scale),k.matrixWorldInverse.copy(k.matrixWorld).invert(),Te[10]===-1)k.projectionMatrix.copy(Q.projectionMatrix),k.projectionMatrixInverse.copy(Q.projectionMatrixInverse);else{const _e=De+me,E=$e+me,d=ye-qe,U=Ie+(ie-qe),z=Oe*$e/E*_e,Y=tt*$e/E*_e;k.projectionMatrix.makePerspective(d,U,z,Y,_e,E),k.projectionMatrixInverse.copy(k.projectionMatrix).invert()}}function he(k,Q){Q===null?k.matrixWorld.copy(k.matrix):k.matrixWorld.multiplyMatrices(Q.matrixWorld,k.matrix),k.matrixWorldInverse.copy(k.matrixWorld).invert()}this.updateCamera=function(k){if(r===null)return;let Q=k.near,de=k.far;A.texture!==null&&(A.depthNear>0&&(Q=A.depthNear),A.depthFar>0&&(de=A.depthFar)),_.near=B.near=y.near=Q,_.far=B.far=y.far=de,(w!==_.near||q!==_.far)&&(r.updateRenderState({depthNear:_.near,depthFar:_.far}),w=_.near,q=_.far),y.layers.mask=k.layers.mask|2,B.layers.mask=k.layers.mask|4,_.layers.mask=y.layers.mask|B.layers.mask;const ie=k.parent,Te=_.cameras;he(_,ie);for(let Re=0;Re<Te.length;Re++)he(Te[Re],ie);Te.length===2?H(_,y,B):_.projectionMatrix.copy(y.projectionMatrix),Se(k,_,ie)};function Se(k,Q,de){de===null?k.matrix.copy(Q.matrixWorld):(k.matrix.copy(de.matrixWorld),k.matrix.invert(),k.matrix.multiply(Q.matrixWorld)),k.matrix.decompose(k.position,k.quaternion,k.scale),k.updateMatrixWorld(!0),k.projectionMatrix.copy(Q.projectionMatrix),k.projectionMatrixInverse.copy(Q.projectionMatrixInverse),k.isPerspectiveCamera&&(k.fov=Pa*2*Math.atan(1/k.projectionMatrix.elements[5]),k.zoom=1)}this.getCamera=function(){return _},this.getFoveation=function(){if(!(g===null&&v===null))return f},this.setFoveation=function(k){f=k,g!==null&&(g.fixedFoveation=k),v!==null&&v.fixedFoveation!==void 0&&(v.fixedFoveation=k)},this.hasDepthSensing=function(){return A.texture!==null},this.getDepthSensingMesh=function(){return A.getMesh(_)};let Pe=null;function ke(k,Q){if(m=Q.getViewerPose(l||o),C=Q,m!==null){const de=m.views;v!==null&&(n.setRenderTargetFramebuffer(P,v.framebuffer),n.setRenderTarget(P));let ie=!1;de.length!==_.cameras.length&&(_.cameras.length=0,ie=!0);for(let Re=0;Re<de.length;Re++){const De=de[Re];let $e=null;if(v!==null)$e=v.getViewport(De);else{const tt=h.getViewSubImage(g,De);$e=tt.viewport,Re===0&&(n.setRenderTargetTextures(P,tt.colorTexture,g.ignoreDepthValues?void 0:tt.depthStencilTexture),n.setRenderTarget(P))}let Oe=S[Re];Oe===void 0&&(Oe=new dn,Oe.layers.enable(Re),Oe.viewport=new ut,S[Re]=Oe),Oe.matrix.fromArray(De.transform.matrix),Oe.matrix.decompose(Oe.position,Oe.quaternion,Oe.scale),Oe.projectionMatrix.fromArray(De.projectionMatrix),Oe.projectionMatrixInverse.copy(Oe.projectionMatrix).invert(),Oe.viewport.set($e.x,$e.y,$e.width,$e.height),Re===0&&(_.matrix.copy(Oe.matrix),_.matrix.decompose(_.position,_.quaternion,_.scale)),ie===!0&&_.cameras.push(Oe)}const Te=r.enabledFeatures;if(Te&&Te.includes("depth-sensing")){const Re=h.getDepthInformation(de[0]);Re&&Re.isValid&&Re.texture&&A.init(n,Re,r.renderState)}}for(let de=0;de<x.length;de++){const ie=T[de],Te=x[de];ie!==null&&Te!==void 0&&Te.update(ie,Q,l||o)}Pe&&Pe(k,Q),Q.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:Q}),C=null}const Ze=new oa;Ze.setAnimationLoop(ke),this.setAnimationLoop=function(k){Pe=k},this.dispose=function(){}}}const Ot=new Qr,ju=new Et;function $u(e,n){function t(u,c){u.matrixAutoUpdate===!0&&u.updateMatrix(),c.value.copy(u.matrix)}function i(u,c){c.color.getRGB(u.fogColor.value,Zr(e)),c.isFog?(u.fogNear.value=c.near,u.fogFar.value=c.far):c.isFogExp2&&(u.fogDensity.value=c.density)}function r(u,c,P,x,T){c.isMeshBasicMaterial||c.isMeshLambertMaterial?a(u,c):c.isMeshToonMaterial?(a(u,c),h(u,c)):c.isMeshPhongMaterial?(a(u,c),m(u,c)):c.isMeshStandardMaterial?(a(u,c),g(u,c),c.isMeshPhysicalMaterial&&v(u,c,T)):c.isMeshMatcapMaterial?(a(u,c),C(u,c)):c.isMeshDepthMaterial?a(u,c):c.isMeshDistanceMaterial?(a(u,c),A(u,c)):c.isMeshNormalMaterial?a(u,c):c.isLineBasicMaterial?(o(u,c),c.isLineDashedMaterial&&s(u,c)):c.isPointsMaterial?f(u,c,P,x):c.isSpriteMaterial?l(u,c):c.isShadowMaterial?(u.color.value.copy(c.color),u.opacity.value=c.opacity):c.isShaderMaterial&&(c.uniformsNeedUpdate=!1)}function a(u,c){u.opacity.value=c.opacity,c.color&&u.diffuse.value.copy(c.color),c.emissive&&u.emissive.value.copy(c.emissive).multiplyScalar(c.emissiveIntensity),c.map&&(u.map.value=c.map,t(c.map,u.mapTransform)),c.alphaMap&&(u.alphaMap.value=c.alphaMap,t(c.alphaMap,u.alphaMapTransform)),c.bumpMap&&(u.bumpMap.value=c.bumpMap,t(c.bumpMap,u.bumpMapTransform),u.bumpScale.value=c.bumpScale,c.side===vt&&(u.bumpScale.value*=-1)),c.normalMap&&(u.normalMap.value=c.normalMap,t(c.normalMap,u.normalMapTransform),u.normalScale.value.copy(c.normalScale),c.side===vt&&u.normalScale.value.negate()),c.displacementMap&&(u.displacementMap.value=c.displacementMap,t(c.displacementMap,u.displacementMapTransform),u.displacementScale.value=c.displacementScale,u.displacementBias.value=c.displacementBias),c.emissiveMap&&(u.emissiveMap.value=c.emissiveMap,t(c.emissiveMap,u.emissiveMapTransform)),c.specularMap&&(u.specularMap.value=c.specularMap,t(c.specularMap,u.specularMapTransform)),c.alphaTest>0&&(u.alphaTest.value=c.alphaTest);const P=n.get(c),x=P.envMap,T=P.envMapRotation;x&&(u.envMap.value=x,Ot.copy(T),Ot.x*=-1,Ot.y*=-1,Ot.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(Ot.y*=-1,Ot.z*=-1),u.envMapRotation.value.setFromMatrix4(ju.makeRotationFromEuler(Ot)),u.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,u.reflectivity.value=c.reflectivity,u.ior.value=c.ior,u.refractionRatio.value=c.refractionRatio),c.lightMap&&(u.lightMap.value=c.lightMap,u.lightMapIntensity.value=c.lightMapIntensity,t(c.lightMap,u.lightMapTransform)),c.aoMap&&(u.aoMap.value=c.aoMap,u.aoMapIntensity.value=c.aoMapIntensity,t(c.aoMap,u.aoMapTransform))}function o(u,c){u.diffuse.value.copy(c.color),u.opacity.value=c.opacity,c.map&&(u.map.value=c.map,t(c.map,u.mapTransform))}function s(u,c){u.dashSize.value=c.dashSize,u.totalSize.value=c.dashSize+c.gapSize,u.scale.value=c.scale}function f(u,c,P,x){u.diffuse.value.copy(c.color),u.opacity.value=c.opacity,u.size.value=c.size*P,u.scale.value=x*.5,c.map&&(u.map.value=c.map,t(c.map,u.uvTransform)),c.alphaMap&&(u.alphaMap.value=c.alphaMap,t(c.alphaMap,u.alphaMapTransform)),c.alphaTest>0&&(u.alphaTest.value=c.alphaTest)}function l(u,c){u.diffuse.value.copy(c.color),u.opacity.value=c.opacity,u.rotation.value=c.rotation,c.map&&(u.map.value=c.map,t(c.map,u.mapTransform)),c.alphaMap&&(u.alphaMap.value=c.alphaMap,t(c.alphaMap,u.alphaMapTransform)),c.alphaTest>0&&(u.alphaTest.value=c.alphaTest)}function m(u,c){u.specular.value.copy(c.specular),u.shininess.value=Math.max(c.shininess,1e-4)}function h(u,c){c.gradientMap&&(u.gradientMap.value=c.gradientMap)}function g(u,c){u.metalness.value=c.metalness,c.metalnessMap&&(u.metalnessMap.value=c.metalnessMap,t(c.metalnessMap,u.metalnessMapTransform)),u.roughness.value=c.roughness,c.roughnessMap&&(u.roughnessMap.value=c.roughnessMap,t(c.roughnessMap,u.roughnessMapTransform)),c.envMap&&(u.envMapIntensity.value=c.envMapIntensity)}function v(u,c,P){u.ior.value=c.ior,c.sheen>0&&(u.sheenColor.value.copy(c.sheenColor).multiplyScalar(c.sheen),u.sheenRoughness.value=c.sheenRoughness,c.sheenColorMap&&(u.sheenColorMap.value=c.sheenColorMap,t(c.sheenColorMap,u.sheenColorMapTransform)),c.sheenRoughnessMap&&(u.sheenRoughnessMap.value=c.sheenRoughnessMap,t(c.sheenRoughnessMap,u.sheenRoughnessMapTransform))),c.clearcoat>0&&(u.clearcoat.value=c.clearcoat,u.clearcoatRoughness.value=c.clearcoatRoughness,c.clearcoatMap&&(u.clearcoatMap.value=c.clearcoatMap,t(c.clearcoatMap,u.clearcoatMapTransform)),c.clearcoatRoughnessMap&&(u.clearcoatRoughnessMap.value=c.clearcoatRoughnessMap,t(c.clearcoatRoughnessMap,u.clearcoatRoughnessMapTransform)),c.clearcoatNormalMap&&(u.clearcoatNormalMap.value=c.clearcoatNormalMap,t(c.clearcoatNormalMap,u.clearcoatNormalMapTransform),u.clearcoatNormalScale.value.copy(c.clearcoatNormalScale),c.side===vt&&u.clearcoatNormalScale.value.negate())),c.dispersion>0&&(u.dispersion.value=c.dispersion),c.iridescence>0&&(u.iridescence.value=c.iridescence,u.iridescenceIOR.value=c.iridescenceIOR,u.iridescenceThicknessMinimum.value=c.iridescenceThicknessRange[0],u.iridescenceThicknessMaximum.value=c.iridescenceThicknessRange[1],c.iridescenceMap&&(u.iridescenceMap.value=c.iridescenceMap,t(c.iridescenceMap,u.iridescenceMapTransform)),c.iridescenceThicknessMap&&(u.iridescenceThicknessMap.value=c.iridescenceThicknessMap,t(c.iridescenceThicknessMap,u.iridescenceThicknessMapTransform))),c.transmission>0&&(u.transmission.value=c.transmission,u.transmissionSamplerMap.value=P.texture,u.transmissionSamplerSize.value.set(P.width,P.height),c.transmissionMap&&(u.transmissionMap.value=c.transmissionMap,t(c.transmissionMap,u.transmissionMapTransform)),u.thickness.value=c.thickness,c.thicknessMap&&(u.thicknessMap.value=c.thicknessMap,t(c.thicknessMap,u.thicknessMapTransform)),u.attenuationDistance.value=c.attenuationDistance,u.attenuationColor.value.copy(c.attenuationColor)),c.anisotropy>0&&(u.anisotropyVector.value.set(c.anisotropy*Math.cos(c.anisotropyRotation),c.anisotropy*Math.sin(c.anisotropyRotation)),c.anisotropyMap&&(u.anisotropyMap.value=c.anisotropyMap,t(c.anisotropyMap,u.anisotropyMapTransform))),u.specularIntensity.value=c.specularIntensity,u.specularColor.value.copy(c.specularColor),c.specularColorMap&&(u.specularColorMap.value=c.specularColorMap,t(c.specularColorMap,u.specularColorMapTransform)),c.specularIntensityMap&&(u.specularIntensityMap.value=c.specularIntensityMap,t(c.specularIntensityMap,u.specularIntensityMapTransform))}function C(u,c){c.matcap&&(u.matcap.value=c.matcap)}function A(u,c){const P=n.get(c).light;u.referencePosition.value.setFromMatrixPosition(P.matrixWorld),u.nearDistance.value=P.shadow.camera.near,u.farDistance.value=P.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function Zu(e,n,t,i){let r={},a={},o=[];const s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function f(P,x){const T=x.program;i.uniformBlockBinding(P,T)}function l(P,x){let T=r[P.id];T===void 0&&(C(P),T=m(P),r[P.id]=T,P.addEventListener("dispose",u));const F=x.program;i.updateUBOMapping(P,F);const D=n.render.frame;a[P.id]!==D&&(g(P),a[P.id]=D)}function m(P){const x=h();P.__bindingPointIndex=x;const T=e.createBuffer(),F=P.__size,D=P.usage;return e.bindBuffer(e.UNIFORM_BUFFER,T),e.bufferData(e.UNIFORM_BUFFER,F,D),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,x,T),T}function h(){for(let P=0;P<s;P++)if(o.indexOf(P)===-1)return o.push(P),P;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function g(P){const x=r[P.id],T=P.uniforms,F=P.__cache;e.bindBuffer(e.UNIFORM_BUFFER,x);for(let D=0,y=T.length;D<y;D++){const B=Array.isArray(T[D])?T[D]:[T[D]];for(let S=0,_=B.length;S<_;S++){const w=B[S];if(v(w,D,S,F)===!0){const q=w.__offset,V=Array.isArray(w.value)?w.value:[w.value];let K=0;for(let Z=0;Z<V.length;Z++){const W=V[Z],J=A(W);typeof W=="number"||typeof W=="boolean"?(w.__data[0]=W,e.bufferSubData(e.UNIFORM_BUFFER,q+K,w.__data)):W.isMatrix3?(w.__data[0]=W.elements[0],w.__data[1]=W.elements[1],w.__data[2]=W.elements[2],w.__data[3]=0,w.__data[4]=W.elements[3],w.__data[5]=W.elements[4],w.__data[6]=W.elements[5],w.__data[7]=0,w.__data[8]=W.elements[6],w.__data[9]=W.elements[7],w.__data[10]=W.elements[8],w.__data[11]=0):(W.toArray(w.__data,K),K+=J.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,q,w.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function v(P,x,T,F){const D=P.value,y=x+"_"+T;if(F[y]===void 0)return typeof D=="number"||typeof D=="boolean"?F[y]=D:F[y]=D.clone(),!0;{const B=F[y];if(typeof D=="number"||typeof D=="boolean"){if(B!==D)return F[y]=D,!0}else if(B.equals(D)===!1)return B.copy(D),!0}return!1}function C(P){const x=P.uniforms;let T=0;const F=16;for(let y=0,B=x.length;y<B;y++){const S=Array.isArray(x[y])?x[y]:[x[y]];for(let _=0,w=S.length;_<w;_++){const q=S[_],V=Array.isArray(q.value)?q.value:[q.value];for(let K=0,Z=V.length;K<Z;K++){const W=V[K],J=A(W),H=T%F,he=H%J.boundary,Se=H+he;T+=he,Se!==0&&F-Se<J.storage&&(T+=F-Se),q.__data=new Float32Array(J.storage/Float32Array.BYTES_PER_ELEMENT),q.__offset=T,T+=J.storage}}}const D=T%F;return D>0&&(T+=F-D),P.__size=T,P.__cache={},this}function A(P){const x={boundary:0,storage:0};return typeof P=="number"||typeof P=="boolean"?(x.boundary=4,x.storage=4):P.isVector2?(x.boundary=8,x.storage=8):P.isVector3||P.isColor?(x.boundary=16,x.storage=12):P.isVector4?(x.boundary=16,x.storage=16):P.isMatrix3?(x.boundary=48,x.storage=48):P.isMatrix4?(x.boundary=64,x.storage=64):P.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",P),x}function u(P){const x=P.target;x.removeEventListener("dispose",u);const T=o.indexOf(x.__bindingPointIndex);o.splice(T,1),e.deleteBuffer(r[x.id]),delete r[x.id],delete a[x.id]}function c(){for(const P in r)e.deleteBuffer(r[P]);o=[],r={},a={}}return{bind:f,update:l,dispose:c}}class Fd{constructor(n={}){const{canvas:t=Ta(),context:i=null,depth:r=!0,stencil:a=!1,alpha:o=!1,antialias:s=!1,premultipliedAlpha:f=!0,preserveDrawingBuffer:l=!1,powerPreference:m="default",failIfMajorPerformanceCaveat:h=!1,reverseDepthBuffer:g=!1}=n;this.isWebGLRenderer=!0;let v;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");v=i.getContextAttributes().alpha}else v=o;const C=new Uint32Array(4),A=new Int32Array(4);let u=null,c=null;const P=[],x=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=tn,this.toneMapping=Ut,this.toneMappingExposure=1;const T=this;let F=!1,D=0,y=0,B=null,S=-1,_=null;const w=new ut,q=new ut;let V=null;const K=new Ve(0);let Z=0,W=t.width,J=t.height,H=1,he=null,Se=null;const Pe=new ut(0,0,W,J),ke=new ut(0,0,W,J);let Ze=!1;const k=new Ir;let Q=!1,de=!1;const ie=new Et,Te=new Et,Re=new we,De=new ut,$e={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Oe=!1;function tt(){return B===null?H:1}let M=i;function ht(p,b){return t.getContext(p,b)}try{const p={alpha:!0,depth:r,stencil:a,antialias:s,premultipliedAlpha:f,preserveDrawingBuffer:l,powerPreference:m,failIfMajorPerformanceCaveat:h};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ma}`),t.addEventListener("webglcontextlost",X,!1),t.addEventListener("webglcontextrestored",oe,!1),t.addEventListener("webglcontextcreationerror",ae,!1),M===null){const b="webgl2";if(M=ht(b,p),M===null)throw ht(b)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(p){throw console.error("THREE.WebGLRenderer: "+p.message),p}let ye,Ie,me,qe,_e,E,d,U,z,Y,G,pe,re,ce,Fe,$,le,Ee,Me,fe,Ne,Ce,Ke,R;function te(){ye=new sf(M),ye.init(),Ce=new Wu(M,ye),Ie=new ef(M,ye,n,Ce),me=new Vu(M,ye),Ie.reverseDepthBuffer&&g&&me.buffers.depth.setReversed(!0),qe=new ff(M),_e=new Lu,E=new ku(M,ye,me,_e,Ie,Ce,qe),d=new nf(T),U=new of(T),z=new _s(M),Ke=new Ql(M,z),Y=new cf(M,z,qe,Ke),G=new df(M,Y,z,qe),Me=new uf(M,Ie,E),$=new tf(_e),pe=new Cu(T,d,U,ye,Ie,Ke,$),re=new $u(T,_e),ce=new wu,Fe=new Ou(ye),Ee=new Zl(T,d,U,me,G,v,f),le=new Hu(T,G,Ie),R=new Zu(M,qe,Ie,me),fe=new Jl(M,ye,qe),Ne=new lf(M,ye,qe),qe.programs=pe.programs,T.capabilities=Ie,T.extensions=ye,T.properties=_e,T.renderLists=ce,T.shadowMap=le,T.state=me,T.info=qe}te();const O=new Yu(T,M);this.xr=O,this.getContext=function(){return M},this.getContextAttributes=function(){return M.getContextAttributes()},this.forceContextLoss=function(){const p=ye.get("WEBGL_lose_context");p&&p.loseContext()},this.forceContextRestore=function(){const p=ye.get("WEBGL_lose_context");p&&p.restoreContext()},this.getPixelRatio=function(){return H},this.setPixelRatio=function(p){p!==void 0&&(H=p,this.setSize(W,J,!1))},this.getSize=function(p){return p.set(W,J)},this.setSize=function(p,b,I=!0){if(O.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}W=p,J=b,t.width=Math.floor(p*H),t.height=Math.floor(b*H),I===!0&&(t.style.width=p+"px",t.style.height=b+"px"),this.setViewport(0,0,p,b)},this.getDrawingBufferSize=function(p){return p.set(W*H,J*H).floor()},this.setDrawingBufferSize=function(p,b,I){W=p,J=b,H=I,t.width=Math.floor(p*I),t.height=Math.floor(b*I),this.setViewport(0,0,p,b)},this.getCurrentViewport=function(p){return p.copy(w)},this.getViewport=function(p){return p.copy(Pe)},this.setViewport=function(p,b,I,N){p.isVector4?Pe.set(p.x,p.y,p.z,p.w):Pe.set(p,b,I,N),me.viewport(w.copy(Pe).multiplyScalar(H).round())},this.getScissor=function(p){return p.copy(ke)},this.setScissor=function(p,b,I,N){p.isVector4?ke.set(p.x,p.y,p.z,p.w):ke.set(p,b,I,N),me.scissor(q.copy(ke).multiplyScalar(H).round())},this.getScissorTest=function(){return Ze},this.setScissorTest=function(p){me.setScissorTest(Ze=p)},this.setOpaqueSort=function(p){he=p},this.setTransparentSort=function(p){Se=p},this.getClearColor=function(p){return p.copy(Ee.getClearColor())},this.setClearColor=function(){Ee.setClearColor.apply(Ee,arguments)},this.getClearAlpha=function(){return Ee.getClearAlpha()},this.setClearAlpha=function(){Ee.setClearAlpha.apply(Ee,arguments)},this.clear=function(p=!0,b=!0,I=!0){let N=0;if(p){let L=!1;if(B!==null){const j=B.texture.format;L=j===jr||j===Yr||j===qr}if(L){const j=B.texture.type,ne=j===Kt||j===mn||j===Ln||j===hn||j===Wr||j===zr,se=Ee.getClearColor(),ue=Ee.getClearAlpha(),xe=se.r,Ae=se.g,ge=se.b;ne?(C[0]=xe,C[1]=Ae,C[2]=ge,C[3]=ue,M.clearBufferuiv(M.COLOR,0,C)):(A[0]=xe,A[1]=Ae,A[2]=ge,A[3]=ue,M.clearBufferiv(M.COLOR,0,A))}else N|=M.COLOR_BUFFER_BIT}b&&(N|=M.DEPTH_BUFFER_BIT),I&&(N|=M.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),M.clear(N)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",X,!1),t.removeEventListener("webglcontextrestored",oe,!1),t.removeEventListener("webglcontextcreationerror",ae,!1),Ee.dispose(),ce.dispose(),Fe.dispose(),_e.dispose(),d.dispose(),U.dispose(),G.dispose(),Ke.dispose(),R.dispose(),pe.dispose(),O.dispose(),O.removeEventListener("sessionstart",vi),O.removeEventListener("sessionend",Ei),yt.stop()};function X(p){p.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),F=!0}function oe(){console.log("THREE.WebGLRenderer: Context Restored."),F=!1;const p=qe.autoReset,b=le.enabled,I=le.autoUpdate,N=le.needsUpdate,L=le.type;te(),qe.autoReset=p,le.enabled=b,le.autoUpdate=I,le.needsUpdate=N,le.type=L}function ae(p){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",p.statusMessage)}function be(p){const b=p.target;b.removeEventListener("dispose",be),Qe(b)}function Qe(p){ot(p),_e.remove(p)}function ot(p){const b=_e.get(p).programs;b!==void 0&&(b.forEach(function(I){pe.releaseProgram(I)}),p.isShaderMaterial&&pe.releaseShaderCache(p))}this.renderBufferDirect=function(p,b,I,N,L,j){b===null&&(b=$e);const ne=L.isMesh&&L.matrixWorld.determinant()<0,se=_a(p,b,I,N,L);me.setMaterial(N,ne);let ue=I.index,xe=1;if(N.wireframe===!0){if(ue=Y.getWireframeAttribute(I),ue===void 0)return;xe=2}const Ae=I.drawRange,ge=I.attributes.position;let Be=Ae.start*xe,We=(Ae.start+Ae.count)*xe;j!==null&&(Be=Math.max(Be,j.start*xe),We=Math.min(We,(j.start+j.count)*xe)),ue!==null?(Be=Math.max(Be,0),We=Math.min(We,ue.count)):ge!=null&&(Be=Math.max(Be,0),We=Math.min(We,ge.count));const nt=We-Be;if(nt<0||nt===1/0)return;Ke.setup(L,N,se,I,ue);let Je,He=fe;if(ue!==null&&(Je=z.get(ue),He=Ne,He.setIndex(Je)),L.isMesh)N.wireframe===!0?(me.setLineWidth(N.wireframeLinewidth*tt()),He.setMode(M.LINES)):He.setMode(M.TRIANGLES);else if(L.isLine){let ve=N.linewidth;ve===void 0&&(ve=1),me.setLineWidth(ve*tt()),L.isLineSegments?He.setMode(M.LINES):L.isLineLoop?He.setMode(M.LINE_LOOP):He.setMode(M.LINE_STRIP)}else L.isPoints?He.setMode(M.POINTS):L.isSprite&&He.setMode(M.TRIANGLES);if(L.isBatchedMesh)if(L._multiDrawInstances!==null)He.renderMultiDrawInstances(L._multiDrawStarts,L._multiDrawCounts,L._multiDrawCount,L._multiDrawInstances);else if(ye.get("WEBGL_multi_draw"))He.renderMultiDraw(L._multiDrawStarts,L._multiDrawCounts,L._multiDrawCount);else{const ve=L._multiDrawStarts,at=L._multiDrawCounts,ze=L._multiDrawCount,Tt=ue?z.get(ue).bytesPerElement:1,Yt=_e.get(N).currentProgram.getUniforms();for(let dt=0;dt<ze;dt++)Yt.setValue(M,"_gl_DrawID",dt),He.render(ve[dt]/Tt,at[dt])}else if(L.isInstancedMesh)He.renderInstances(Be,nt,L.count);else if(I.isInstancedBufferGeometry){const ve=I._maxInstanceCount!==void 0?I._maxInstanceCount:1/0,at=Math.min(I.instanceCount,ve);He.renderInstances(Be,nt,at)}else He.render(Be,nt)};function Xe(p,b,I){p.transparent===!0&&p.side===xt&&p.forceSinglePass===!1?(p.side=vt,p.needsUpdate=!0,vn(p,b,I),p.side=rn,p.needsUpdate=!0,vn(p,b,I),p.side=xt):vn(p,b,I)}this.compile=function(p,b,I=null){I===null&&(I=p),c=Fe.get(I),c.init(b),x.push(c),I.traverseVisible(function(L){L.isLight&&L.layers.test(b.layers)&&(c.pushLight(L),L.castShadow&&c.pushShadow(L))}),p!==I&&p.traverseVisible(function(L){L.isLight&&L.layers.test(b.layers)&&(c.pushLight(L),L.castShadow&&c.pushShadow(L))}),c.setupLights();const N=new Set;return p.traverse(function(L){if(!(L.isMesh||L.isPoints||L.isLine||L.isSprite))return;const j=L.material;if(j)if(Array.isArray(j))for(let ne=0;ne<j.length;ne++){const se=j[ne];Xe(se,I,L),N.add(se)}else Xe(j,I,L),N.add(j)}),x.pop(),c=null,N},this.compileAsync=function(p,b,I=null){const N=this.compile(p,b,I);return new Promise(L=>{function j(){if(N.forEach(function(ne){_e.get(ne).currentProgram.isReady()&&N.delete(ne)}),N.size===0){L(p);return}setTimeout(j,10)}ye.get("KHR_parallel_shader_compile")!==null?j():setTimeout(j,10)})};let St=null;function Rt(p){St&&St(p)}function vi(){yt.stop()}function Ei(){yt.start()}const yt=new oa;yt.setAnimationLoop(Rt),typeof self<"u"&&yt.setContext(self),this.setAnimationLoop=function(p){St=p,O.setAnimationLoop(p),p===null?yt.stop():yt.start()},O.addEventListener("sessionstart",vi),O.addEventListener("sessionend",Ei),this.render=function(p,b){if(b!==void 0&&b.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(F===!0)return;if(p.matrixWorldAutoUpdate===!0&&p.updateMatrixWorld(),b.parent===null&&b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),O.enabled===!0&&O.isPresenting===!0&&(O.cameraAutoUpdate===!0&&O.updateCamera(b),b=O.getCamera()),p.isScene===!0&&p.onBeforeRender(T,p,b,B),c=Fe.get(p,x.length),c.init(b),x.push(c),Te.multiplyMatrices(b.projectionMatrix,b.matrixWorldInverse),k.setFromProjectionMatrix(Te),de=this.localClippingEnabled,Q=$.init(this.clippingPlanes,de),u=ce.get(p,P.length),u.init(),P.push(u),O.enabled===!0&&O.isPresenting===!0){const j=T.xr.getDepthSensingMesh();j!==null&&In(j,b,-1/0,T.sortObjects)}In(p,b,0,T.sortObjects),u.finish(),T.sortObjects===!0&&u.sort(he,Se),Oe=O.enabled===!1||O.isPresenting===!1||O.hasDepthSensing()===!1,Oe&&Ee.addToRenderList(u,p),this.info.render.frame++,Q===!0&&$.beginShadows();const I=c.state.shadowsArray;le.render(I,p,b),Q===!0&&$.endShadows(),this.info.autoReset===!0&&this.info.reset();const N=u.opaque,L=u.transmissive;if(c.setupLights(),b.isArrayCamera){const j=b.cameras;if(L.length>0)for(let ne=0,se=j.length;ne<se;ne++){const ue=j[ne];Ti(N,L,p,ue)}Oe&&Ee.render(p);for(let ne=0,se=j.length;ne<se;ne++){const ue=j[ne];Si(u,p,ue,ue.viewport)}}else L.length>0&&Ti(N,L,p,b),Oe&&Ee.render(p),Si(u,p,b);B!==null&&(E.updateMultisampleRenderTarget(B),E.updateRenderTargetMipmap(B)),p.isScene===!0&&p.onAfterRender(T,p,b),Ke.resetDefaultState(),S=-1,_=null,x.pop(),x.length>0?(c=x[x.length-1],Q===!0&&$.setGlobalState(T.clippingPlanes,c.state.camera)):c=null,P.pop(),P.length>0?u=P[P.length-1]:u=null};function In(p,b,I,N){if(p.visible===!1)return;if(p.layers.test(b.layers)){if(p.isGroup)I=p.renderOrder;else if(p.isLOD)p.autoUpdate===!0&&p.update(b);else if(p.isLight)c.pushLight(p),p.castShadow&&c.pushShadow(p);else if(p.isSprite){if(!p.frustumCulled||k.intersectsSprite(p)){N&&De.setFromMatrixPosition(p.matrixWorld).applyMatrix4(Te);const ne=G.update(p),se=p.material;se.visible&&u.push(p,ne,se,I,De.z,null)}}else if((p.isMesh||p.isLine||p.isPoints)&&(!p.frustumCulled||k.intersectsObject(p))){const ne=G.update(p),se=p.material;if(N&&(p.boundingSphere!==void 0?(p.boundingSphere===null&&p.computeBoundingSphere(),De.copy(p.boundingSphere.center)):(ne.boundingSphere===null&&ne.computeBoundingSphere(),De.copy(ne.boundingSphere.center)),De.applyMatrix4(p.matrixWorld).applyMatrix4(Te)),Array.isArray(se)){const ue=ne.groups;for(let xe=0,Ae=ue.length;xe<Ae;xe++){const ge=ue[xe],Be=se[ge.materialIndex];Be&&Be.visible&&u.push(p,ne,Be,I,De.z,ge)}}else se.visible&&u.push(p,ne,se,I,De.z,null)}}const j=p.children;for(let ne=0,se=j.length;ne<se;ne++)In(j[ne],b,I,N)}function Si(p,b,I,N){const L=p.opaque,j=p.transmissive,ne=p.transparent;c.setupLightsView(I),Q===!0&&$.setGlobalState(T.clippingPlanes,I),N&&me.viewport(w.copy(N)),L.length>0&&gn(L,b,I),j.length>0&&gn(j,b,I),ne.length>0&&gn(ne,b,I),me.buffers.depth.setTest(!0),me.buffers.depth.setMask(!0),me.buffers.color.setMask(!0),me.setPolygonOffset(!1)}function Ti(p,b,I,N){if((I.isScene===!0?I.overrideMaterial:null)!==null)return;c.state.transmissionRenderTarget[N.id]===void 0&&(c.state.transmissionRenderTarget[N.id]=new nn(1,1,{generateMipmaps:!0,type:ye.has("EXT_color_buffer_half_float")||ye.has("EXT_color_buffer_float")?Dn:Kt,minFilter:Gt,samples:4,stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:et.workingColorSpace}));const j=c.state.transmissionRenderTarget[N.id],ne=N.viewport||w;j.setSize(ne.z,ne.w);const se=T.getRenderTarget();T.setRenderTarget(j),T.getClearColor(K),Z=T.getClearAlpha(),Z<1&&T.setClearColor(16777215,.5),T.clear(),Oe&&Ee.render(I);const ue=T.toneMapping;T.toneMapping=Ut;const xe=N.viewport;if(N.viewport!==void 0&&(N.viewport=void 0),c.setupLightsView(N),Q===!0&&$.setGlobalState(T.clippingPlanes,N),gn(p,I,N),E.updateMultisampleRenderTarget(j),E.updateRenderTargetMipmap(j),ye.has("WEBGL_multisampled_render_to_texture")===!1){let Ae=!1;for(let ge=0,Be=b.length;ge<Be;ge++){const We=b[ge],nt=We.object,Je=We.geometry,He=We.material,ve=We.group;if(He.side===xt&&nt.layers.test(N.layers)){const at=He.side;He.side=vt,He.needsUpdate=!0,Mi(nt,I,N,Je,He,ve),He.side=at,He.needsUpdate=!0,Ae=!0}}Ae===!0&&(E.updateMultisampleRenderTarget(j),E.updateRenderTargetMipmap(j))}T.setRenderTarget(se),T.setClearColor(K,Z),xe!==void 0&&(N.viewport=xe),T.toneMapping=ue}function gn(p,b,I){const N=b.isScene===!0?b.overrideMaterial:null;for(let L=0,j=p.length;L<j;L++){const ne=p[L],se=ne.object,ue=ne.geometry,xe=N===null?ne.material:N,Ae=ne.group;se.layers.test(I.layers)&&Mi(se,b,I,ue,xe,Ae)}}function Mi(p,b,I,N,L,j){p.onBeforeRender(T,b,I,N,L,j),p.modelViewMatrix.multiplyMatrices(I.matrixWorldInverse,p.matrixWorld),p.normalMatrix.getNormalMatrix(p.modelViewMatrix),L.onBeforeRender(T,b,I,N,p,j),L.transparent===!0&&L.side===xt&&L.forceSinglePass===!1?(L.side=vt,L.needsUpdate=!0,T.renderBufferDirect(I,b,N,L,p,j),L.side=rn,L.needsUpdate=!0,T.renderBufferDirect(I,b,N,L,p,j),L.side=xt):T.renderBufferDirect(I,b,N,L,p,j),p.onAfterRender(T,b,I,N,L,j)}function vn(p,b,I){b.isScene!==!0&&(b=$e);const N=_e.get(p),L=c.state.lights,j=c.state.shadowsArray,ne=L.state.version,se=pe.getParameters(p,L.state,j,b,I),ue=pe.getProgramCacheKey(se);let xe=N.programs;N.environment=p.isMeshStandardMaterial?b.environment:null,N.fog=b.fog,N.envMap=(p.isMeshStandardMaterial?U:d).get(p.envMap||N.environment),N.envMapRotation=N.environment!==null&&p.envMap===null?b.environmentRotation:p.envMapRotation,xe===void 0&&(p.addEventListener("dispose",be),xe=new Map,N.programs=xe);let Ae=xe.get(ue);if(Ae!==void 0){if(N.currentProgram===Ae&&N.lightsStateVersion===ne)return Ai(p,se),Ae}else se.uniforms=pe.getUniforms(p),p.onBeforeCompile(se,T),Ae=pe.acquireProgram(se,ue),xe.set(ue,Ae),N.uniforms=se.uniforms;const ge=N.uniforms;return(!p.isShaderMaterial&&!p.isRawShaderMaterial||p.clipping===!0)&&(ge.clippingPlanes=$.uniform),Ai(p,se),N.needsLights=va(p),N.lightsStateVersion=ne,N.needsLights&&(ge.ambientLightColor.value=L.state.ambient,ge.lightProbe.value=L.state.probe,ge.directionalLights.value=L.state.directional,ge.directionalLightShadows.value=L.state.directionalShadow,ge.spotLights.value=L.state.spot,ge.spotLightShadows.value=L.state.spotShadow,ge.rectAreaLights.value=L.state.rectArea,ge.ltc_1.value=L.state.rectAreaLTC1,ge.ltc_2.value=L.state.rectAreaLTC2,ge.pointLights.value=L.state.point,ge.pointLightShadows.value=L.state.pointShadow,ge.hemisphereLights.value=L.state.hemi,ge.directionalShadowMap.value=L.state.directionalShadowMap,ge.directionalShadowMatrix.value=L.state.directionalShadowMatrix,ge.spotShadowMap.value=L.state.spotShadowMap,ge.spotLightMatrix.value=L.state.spotLightMatrix,ge.spotLightMap.value=L.state.spotLightMap,ge.pointShadowMap.value=L.state.pointShadowMap,ge.pointShadowMatrix.value=L.state.pointShadowMatrix),N.currentProgram=Ae,N.uniformsList=null,Ae}function xi(p){if(p.uniformsList===null){const b=p.currentProgram.getUniforms();p.uniformsList=An.seqWithValue(b.seq,p.uniforms)}return p.uniformsList}function Ai(p,b){const I=_e.get(p);I.outputColorSpace=b.outputColorSpace,I.batching=b.batching,I.batchingColor=b.batchingColor,I.instancing=b.instancing,I.instancingColor=b.instancingColor,I.instancingMorph=b.instancingMorph,I.skinning=b.skinning,I.morphTargets=b.morphTargets,I.morphNormals=b.morphNormals,I.morphColors=b.morphColors,I.morphTargetsCount=b.morphTargetsCount,I.numClippingPlanes=b.numClippingPlanes,I.numIntersection=b.numClipIntersection,I.vertexAlphas=b.vertexAlphas,I.vertexTangents=b.vertexTangents,I.toneMapping=b.toneMapping}function _a(p,b,I,N,L){b.isScene!==!0&&(b=$e),E.resetTextureUnits();const j=b.fog,ne=N.isMeshStandardMaterial?b.environment:null,se=B===null?T.outputColorSpace:B.isXRRenderTarget===!0?B.texture.colorSpace:pt,ue=(N.isMeshStandardMaterial?U:d).get(N.envMap||ne),xe=N.vertexColors===!0&&!!I.attributes.color&&I.attributes.color.itemSize===4,Ae=!!I.attributes.tangent&&(!!N.normalMap||N.anisotropy>0),ge=!!I.morphAttributes.position,Be=!!I.morphAttributes.normal,We=!!I.morphAttributes.color;let nt=Ut;N.toneMapped&&(B===null||B.isXRRenderTarget===!0)&&(nt=T.toneMapping);const Je=I.morphAttributes.position||I.morphAttributes.normal||I.morphAttributes.color,He=Je!==void 0?Je.length:0,ve=_e.get(N),at=c.state.lights;if(Q===!0&&(de===!0||p!==_)){const ct=p===_&&N.id===S;$.setState(N,p,ct)}let ze=!1;N.version===ve.__version?(ve.needsLights&&ve.lightsStateVersion!==at.state.version||ve.outputColorSpace!==se||L.isBatchedMesh&&ve.batching===!1||!L.isBatchedMesh&&ve.batching===!0||L.isBatchedMesh&&ve.batchingColor===!0&&L.colorTexture===null||L.isBatchedMesh&&ve.batchingColor===!1&&L.colorTexture!==null||L.isInstancedMesh&&ve.instancing===!1||!L.isInstancedMesh&&ve.instancing===!0||L.isSkinnedMesh&&ve.skinning===!1||!L.isSkinnedMesh&&ve.skinning===!0||L.isInstancedMesh&&ve.instancingColor===!0&&L.instanceColor===null||L.isInstancedMesh&&ve.instancingColor===!1&&L.instanceColor!==null||L.isInstancedMesh&&ve.instancingMorph===!0&&L.morphTexture===null||L.isInstancedMesh&&ve.instancingMorph===!1&&L.morphTexture!==null||ve.envMap!==ue||N.fog===!0&&ve.fog!==j||ve.numClippingPlanes!==void 0&&(ve.numClippingPlanes!==$.numPlanes||ve.numIntersection!==$.numIntersection)||ve.vertexAlphas!==xe||ve.vertexTangents!==Ae||ve.morphTargets!==ge||ve.morphNormals!==Be||ve.morphColors!==We||ve.toneMapping!==nt||ve.morphTargetsCount!==He)&&(ze=!0):(ze=!0,ve.__version=N.version);let Tt=ve.currentProgram;ze===!0&&(Tt=vn(N,b,L));let Yt=!1,dt=!1,sn=!1;const je=Tt.getUniforms(),mt=ve.uniforms;if(me.useProgram(Tt.program)&&(Yt=!0,dt=!0,sn=!0),N.id!==S&&(S=N.id,dt=!0),Yt||_!==p){me.buffers.depth.getReversed()?(ie.copy(p.projectionMatrix),xa(ie),Aa(ie),je.setValue(M,"projectionMatrix",ie)):je.setValue(M,"projectionMatrix",p.projectionMatrix),je.setValue(M,"viewMatrix",p.matrixWorldInverse);const lt=je.map.cameraPosition;lt!==void 0&&lt.setValue(M,Re.setFromMatrixPosition(p.matrixWorld)),Ie.logarithmicDepthBuffer&&je.setValue(M,"logDepthBufFC",2/(Math.log(p.far+1)/Math.LN2)),(N.isMeshPhongMaterial||N.isMeshToonMaterial||N.isMeshLambertMaterial||N.isMeshBasicMaterial||N.isMeshStandardMaterial||N.isShaderMaterial)&&je.setValue(M,"isOrthographic",p.isOrthographicCamera===!0),_!==p&&(_=p,dt=!0,sn=!0)}if(L.isSkinnedMesh){je.setOptional(M,L,"bindMatrix"),je.setOptional(M,L,"bindMatrixInverse");const ct=L.skeleton;ct&&(ct.boneTexture===null&&ct.computeBoneTexture(),je.setValue(M,"boneTexture",ct.boneTexture,E))}L.isBatchedMesh&&(je.setOptional(M,L,"batchingTexture"),je.setValue(M,"batchingTexture",L._matricesTexture,E),je.setOptional(M,L,"batchingIdTexture"),je.setValue(M,"batchingIdTexture",L._indirectTexture,E),je.setOptional(M,L,"batchingColorTexture"),L._colorsTexture!==null&&je.setValue(M,"batchingColorTexture",L._colorsTexture,E));const _t=I.morphAttributes;if((_t.position!==void 0||_t.normal!==void 0||_t.color!==void 0)&&Me.update(L,I,Tt),(dt||ve.receiveShadow!==L.receiveShadow)&&(ve.receiveShadow=L.receiveShadow,je.setValue(M,"receiveShadow",L.receiveShadow)),N.isMeshGouraudMaterial&&N.envMap!==null&&(mt.envMap.value=ue,mt.flipEnvMap.value=ue.isCubeTexture&&ue.isRenderTargetTexture===!1?-1:1),N.isMeshStandardMaterial&&N.envMap===null&&b.environment!==null&&(mt.envMapIntensity.value=b.environmentIntensity),dt&&(je.setValue(M,"toneMappingExposure",T.toneMappingExposure),ve.needsLights&&ga(mt,sn),j&&N.fog===!0&&re.refreshFogUniforms(mt,j),re.refreshMaterialUniforms(mt,N,H,J,c.state.transmissionRenderTarget[p.id]),An.upload(M,xi(ve),mt,E)),N.isShaderMaterial&&N.uniformsNeedUpdate===!0&&(An.upload(M,xi(ve),mt,E),N.uniformsNeedUpdate=!1),N.isSpriteMaterial&&je.setValue(M,"center",L.center),je.setValue(M,"modelViewMatrix",L.modelViewMatrix),je.setValue(M,"normalMatrix",L.normalMatrix),je.setValue(M,"modelMatrix",L.matrixWorld),N.isShaderMaterial||N.isRawShaderMaterial){const ct=N.uniformsGroups;for(let lt=0,Nn=ct.length;lt<Nn;lt++){const It=ct[lt];R.update(It,Tt),R.bind(It,Tt)}}return Tt}function ga(p,b){p.ambientLightColor.needsUpdate=b,p.lightProbe.needsUpdate=b,p.directionalLights.needsUpdate=b,p.directionalLightShadows.needsUpdate=b,p.pointLights.needsUpdate=b,p.pointLightShadows.needsUpdate=b,p.spotLights.needsUpdate=b,p.spotLightShadows.needsUpdate=b,p.rectAreaLights.needsUpdate=b,p.hemisphereLights.needsUpdate=b}function va(p){return p.isMeshLambertMaterial||p.isMeshToonMaterial||p.isMeshPhongMaterial||p.isMeshStandardMaterial||p.isShadowMaterial||p.isShaderMaterial&&p.lights===!0}this.getActiveCubeFace=function(){return D},this.getActiveMipmapLevel=function(){return y},this.getRenderTarget=function(){return B},this.setRenderTargetTextures=function(p,b,I){_e.get(p.texture).__webglTexture=b,_e.get(p.depthTexture).__webglTexture=I;const N=_e.get(p);N.__hasExternalTextures=!0,N.__autoAllocateDepthBuffer=I===void 0,N.__autoAllocateDepthBuffer||ye.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),N.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(p,b){const I=_e.get(p);I.__webglFramebuffer=b,I.__useDefaultFramebuffer=b===void 0},this.setRenderTarget=function(p,b=0,I=0){B=p,D=b,y=I;let N=!0,L=null,j=!1,ne=!1;if(p){const ue=_e.get(p);if(ue.__useDefaultFramebuffer!==void 0)me.bindFramebuffer(M.FRAMEBUFFER,null),N=!1;else if(ue.__webglFramebuffer===void 0)E.setupRenderTarget(p);else if(ue.__hasExternalTextures)E.rebindTextures(p,_e.get(p.texture).__webglTexture,_e.get(p.depthTexture).__webglTexture);else if(p.depthBuffer){const ge=p.depthTexture;if(ue.__boundDepthTexture!==ge){if(ge!==null&&_e.has(ge)&&(p.width!==ge.image.width||p.height!==ge.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");E.setupDepthRenderbuffer(p)}}const xe=p.texture;(xe.isData3DTexture||xe.isDataArrayTexture||xe.isCompressedArrayTexture)&&(ne=!0);const Ae=_e.get(p).__webglFramebuffer;p.isWebGLCubeRenderTarget?(Array.isArray(Ae[b])?L=Ae[b][I]:L=Ae[b],j=!0):p.samples>0&&E.useMultisampledRTT(p)===!1?L=_e.get(p).__webglMultisampledFramebuffer:Array.isArray(Ae)?L=Ae[I]:L=Ae,w.copy(p.viewport),q.copy(p.scissor),V=p.scissorTest}else w.copy(Pe).multiplyScalar(H).floor(),q.copy(ke).multiplyScalar(H).floor(),V=Ze;if(me.bindFramebuffer(M.FRAMEBUFFER,L)&&N&&me.drawBuffers(p,L),me.viewport(w),me.scissor(q),me.setScissorTest(V),j){const ue=_e.get(p.texture);M.framebufferTexture2D(M.FRAMEBUFFER,M.COLOR_ATTACHMENT0,M.TEXTURE_CUBE_MAP_POSITIVE_X+b,ue.__webglTexture,I)}else if(ne){const ue=_e.get(p.texture),xe=b||0;M.framebufferTextureLayer(M.FRAMEBUFFER,M.COLOR_ATTACHMENT0,ue.__webglTexture,I||0,xe)}S=-1},this.readRenderTargetPixels=function(p,b,I,N,L,j,ne){if(!(p&&p.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let se=_e.get(p).__webglFramebuffer;if(p.isWebGLCubeRenderTarget&&ne!==void 0&&(se=se[ne]),se){me.bindFramebuffer(M.FRAMEBUFFER,se);try{const ue=p.texture,xe=ue.format,Ae=ue.type;if(!Ie.textureFormatReadable(xe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ie.textureTypeReadable(Ae)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}b>=0&&b<=p.width-N&&I>=0&&I<=p.height-L&&M.readPixels(b,I,N,L,Ce.convert(xe),Ce.convert(Ae),j)}finally{const ue=B!==null?_e.get(B).__webglFramebuffer:null;me.bindFramebuffer(M.FRAMEBUFFER,ue)}}},this.readRenderTargetPixelsAsync=async function(p,b,I,N,L,j,ne){if(!(p&&p.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let se=_e.get(p).__webglFramebuffer;if(p.isWebGLCubeRenderTarget&&ne!==void 0&&(se=se[ne]),se){const ue=p.texture,xe=ue.format,Ae=ue.type;if(!Ie.textureFormatReadable(xe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ie.textureTypeReadable(Ae))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(b>=0&&b<=p.width-N&&I>=0&&I<=p.height-L){me.bindFramebuffer(M.FRAMEBUFFER,se);const ge=M.createBuffer();M.bindBuffer(M.PIXEL_PACK_BUFFER,ge),M.bufferData(M.PIXEL_PACK_BUFFER,j.byteLength,M.STREAM_READ),M.readPixels(b,I,N,L,Ce.convert(xe),Ce.convert(Ae),0);const Be=B!==null?_e.get(B).__webglFramebuffer:null;me.bindFramebuffer(M.FRAMEBUFFER,Be);const We=M.fenceSync(M.SYNC_GPU_COMMANDS_COMPLETE,0);return M.flush(),await Ra(M,We,4),M.bindBuffer(M.PIXEL_PACK_BUFFER,ge),M.getBufferSubData(M.PIXEL_PACK_BUFFER,0,j),M.deleteBuffer(ge),M.deleteSync(We),j}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(p,b=null,I=0){p.isTexture!==!0&&($t("WebGLRenderer: copyFramebufferToTexture function signature has changed."),b=arguments[0]||null,p=arguments[1]);const N=Math.pow(2,-I),L=Math.floor(p.image.width*N),j=Math.floor(p.image.height*N),ne=b!==null?b.x:0,se=b!==null?b.y:0;E.setTexture2D(p,0),M.copyTexSubImage2D(M.TEXTURE_2D,I,0,0,ne,se,L,j),me.unbindTexture()};const Ea=M.createFramebuffer(),Sa=M.createFramebuffer();this.copyTextureToTexture=function(p,b,I=null,N=null,L=0,j=null){p.isTexture!==!0&&($t("WebGLRenderer: copyTextureToTexture function signature has changed."),N=arguments[0]||null,p=arguments[1],b=arguments[2],j=arguments[3]||0,I=null),j===null&&(L!==0?($t("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),j=L,L=0):j=0);let ne,se,ue,xe,Ae,ge,Be,We,nt;const Je=p.isCompressedTexture?p.mipmaps[j]:p.image;if(I!==null)ne=I.max.x-I.min.x,se=I.max.y-I.min.y,ue=I.isBox3?I.max.z-I.min.z:1,xe=I.min.x,Ae=I.min.y,ge=I.isBox3?I.min.z:0;else{const _t=Math.pow(2,-L);ne=Math.floor(Je.width*_t),se=Math.floor(Je.height*_t),p.isDataArrayTexture?ue=Je.depth:p.isData3DTexture?ue=Math.floor(Je.depth*_t):ue=1,xe=0,Ae=0,ge=0}N!==null?(Be=N.x,We=N.y,nt=N.z):(Be=0,We=0,nt=0);const He=Ce.convert(b.format),ve=Ce.convert(b.type);let at;b.isData3DTexture?(E.setTexture3D(b,0),at=M.TEXTURE_3D):b.isDataArrayTexture||b.isCompressedArrayTexture?(E.setTexture2DArray(b,0),at=M.TEXTURE_2D_ARRAY):(E.setTexture2D(b,0),at=M.TEXTURE_2D),M.pixelStorei(M.UNPACK_FLIP_Y_WEBGL,b.flipY),M.pixelStorei(M.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),M.pixelStorei(M.UNPACK_ALIGNMENT,b.unpackAlignment);const ze=M.getParameter(M.UNPACK_ROW_LENGTH),Tt=M.getParameter(M.UNPACK_IMAGE_HEIGHT),Yt=M.getParameter(M.UNPACK_SKIP_PIXELS),dt=M.getParameter(M.UNPACK_SKIP_ROWS),sn=M.getParameter(M.UNPACK_SKIP_IMAGES);M.pixelStorei(M.UNPACK_ROW_LENGTH,Je.width),M.pixelStorei(M.UNPACK_IMAGE_HEIGHT,Je.height),M.pixelStorei(M.UNPACK_SKIP_PIXELS,xe),M.pixelStorei(M.UNPACK_SKIP_ROWS,Ae),M.pixelStorei(M.UNPACK_SKIP_IMAGES,ge);const je=p.isDataArrayTexture||p.isData3DTexture,mt=b.isDataArrayTexture||b.isData3DTexture;if(p.isDepthTexture){const _t=_e.get(p),ct=_e.get(b),lt=_e.get(_t.__renderTarget),Nn=_e.get(ct.__renderTarget);me.bindFramebuffer(M.READ_FRAMEBUFFER,lt.__webglFramebuffer),me.bindFramebuffer(M.DRAW_FRAMEBUFFER,Nn.__webglFramebuffer);for(let It=0;It<ue;It++)je&&(M.framebufferTextureLayer(M.READ_FRAMEBUFFER,M.COLOR_ATTACHMENT0,_e.get(p).__webglTexture,L,ge+It),M.framebufferTextureLayer(M.DRAW_FRAMEBUFFER,M.COLOR_ATTACHMENT0,_e.get(b).__webglTexture,j,nt+It)),M.blitFramebuffer(xe,Ae,ne,se,Be,We,ne,se,M.DEPTH_BUFFER_BIT,M.NEAREST);me.bindFramebuffer(M.READ_FRAMEBUFFER,null),me.bindFramebuffer(M.DRAW_FRAMEBUFFER,null)}else if(L!==0||p.isRenderTargetTexture||_e.has(p)){const _t=_e.get(p),ct=_e.get(b);me.bindFramebuffer(M.READ_FRAMEBUFFER,Ea),me.bindFramebuffer(M.DRAW_FRAMEBUFFER,Sa);for(let lt=0;lt<ue;lt++)je?M.framebufferTextureLayer(M.READ_FRAMEBUFFER,M.COLOR_ATTACHMENT0,_t.__webglTexture,L,ge+lt):M.framebufferTexture2D(M.READ_FRAMEBUFFER,M.COLOR_ATTACHMENT0,M.TEXTURE_2D,_t.__webglTexture,L),mt?M.framebufferTextureLayer(M.DRAW_FRAMEBUFFER,M.COLOR_ATTACHMENT0,ct.__webglTexture,j,nt+lt):M.framebufferTexture2D(M.DRAW_FRAMEBUFFER,M.COLOR_ATTACHMENT0,M.TEXTURE_2D,ct.__webglTexture,j),L!==0?M.blitFramebuffer(xe,Ae,ne,se,Be,We,ne,se,M.COLOR_BUFFER_BIT,M.NEAREST):mt?M.copyTexSubImage3D(at,j,Be,We,nt+lt,xe,Ae,ne,se):M.copyTexSubImage2D(at,j,Be,We,xe,Ae,ne,se);me.bindFramebuffer(M.READ_FRAMEBUFFER,null),me.bindFramebuffer(M.DRAW_FRAMEBUFFER,null)}else mt?p.isDataTexture||p.isData3DTexture?M.texSubImage3D(at,j,Be,We,nt,ne,se,ue,He,ve,Je.data):b.isCompressedArrayTexture?M.compressedTexSubImage3D(at,j,Be,We,nt,ne,se,ue,He,Je.data):M.texSubImage3D(at,j,Be,We,nt,ne,se,ue,He,ve,Je):p.isDataTexture?M.texSubImage2D(M.TEXTURE_2D,j,Be,We,ne,se,He,ve,Je.data):p.isCompressedTexture?M.compressedTexSubImage2D(M.TEXTURE_2D,j,Be,We,Je.width,Je.height,He,Je.data):M.texSubImage2D(M.TEXTURE_2D,j,Be,We,ne,se,He,ve,Je);M.pixelStorei(M.UNPACK_ROW_LENGTH,ze),M.pixelStorei(M.UNPACK_IMAGE_HEIGHT,Tt),M.pixelStorei(M.UNPACK_SKIP_PIXELS,Yt),M.pixelStorei(M.UNPACK_SKIP_ROWS,dt),M.pixelStorei(M.UNPACK_SKIP_IMAGES,sn),j===0&&b.generateMipmaps&&M.generateMipmap(at),me.unbindTexture()},this.copyTextureToTexture3D=function(p,b,I=null,N=null,L=0){return p.isTexture!==!0&&($t("WebGLRenderer: copyTextureToTexture3D function signature has changed."),I=arguments[0]||null,N=arguments[1]||null,p=arguments[2],b=arguments[3],L=arguments[4]||0),$t('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(p,b,I,N,L)},this.initRenderTarget=function(p){_e.get(p).__webglFramebuffer===void 0&&E.setupRenderTarget(p)},this.initTexture=function(p){p.isCubeTexture?E.setTextureCube(p,0):p.isData3DTexture?E.setTexture3D(p,0):p.isDataArrayTexture||p.isCompressedArrayTexture?E.setTexture2DArray(p,0):E.setTexture2D(p,0),me.unbindTexture()},this.resetState=function(){D=0,y=0,B=null,me.reset(),Ke.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ba}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(n){this._outputColorSpace=n;const t=this.getContext();t.drawingBufferColorspace=et._getDrawingBufferColorSpace(n),t.unpackColorSpace=et._getUnpackColorSpace()}}function ui(e,n){return n.getBoneName!==void 0?n.getBoneName(e):n.names[e.name]}function ua(e,n,t={}){const i=new _i,r=new we,a=new Et,o=new Et;t.preserveBoneMatrix=t.preserveBoneMatrix!==void 0?t.preserveBoneMatrix:!0,t.preserveBonePositions=t.preserveBonePositions!==void 0?t.preserveBonePositions:!0,t.useTargetMatrix=t.useTargetMatrix!==void 0?t.useTargetMatrix:!1,t.hip=t.hip!==void 0?t.hip:"hip",t.hipInfluence=t.hipInfluence!==void 0?t.hipInfluence:new we(1,1,1),t.scale=t.scale!==void 0?t.scale:1,t.names=t.names||{};const s=n.isObject3D?n.skeleton.bones:wn(n),f=e.isObject3D?e.skeleton.bones:wn(e);let l,m,h,g;if(e.isObject3D?e.skeleton.pose():(t.useTargetMatrix=!0,t.preserveBoneMatrix=!1),t.preserveBonePositions){g=[];for(let v=0;v<f.length;v++)g.push(f[v].position.clone())}if(t.preserveBoneMatrix){e.updateMatrixWorld(),e.matrixWorld.identity();for(let v=0;v<e.children.length;++v)e.children[v].updateMatrixWorld(!0)}for(let v=0;v<f.length;++v)l=f[v],m=ui(l,t),h=da(m,s),o.copy(l.matrixWorld),h&&(h.updateMatrixWorld(),t.useTargetMatrix?a.copy(h.matrixWorld):(a.copy(e.matrixWorld).invert(),a.multiply(h.matrixWorld)),r.setFromMatrixScale(a),a.scale(r.set(1/r.x,1/r.y,1/r.z)),o.makeRotationFromQuaternion(i.setFromRotationMatrix(a)),e.isObject3D&&t.localOffsets&&t.localOffsets[l.name]&&o.multiply(t.localOffsets[l.name]),o.copyPosition(a)),m===t.hip&&(o.elements[12]*=t.scale*t.hipInfluence.x,o.elements[13]*=t.scale*t.hipInfluence.y,o.elements[14]*=t.scale*t.hipInfluence.z,t.hipPosition!==void 0&&(o.elements[12]+=t.hipPosition.x*t.scale,o.elements[13]+=t.hipPosition.y*t.scale,o.elements[14]+=t.hipPosition.z*t.scale)),l.parent?(l.matrix.copy(l.parent.matrixWorld).invert(),l.matrix.multiply(o)):l.matrix.copy(o),l.matrix.decompose(l.position,l.quaternion,l.scale),l.updateMatrixWorld();if(t.preserveBonePositions)for(let v=0;v<f.length;++v)l=f[v],m=ui(l,t)||l.name,m!==t.hip&&l.position.copy(g[v]);t.preserveBoneMatrix&&e.updateMatrixWorld(!0)}function Qu(e,n,t,i={}){i.useFirstFramePosition=i.useFirstFramePosition!==void 0?i.useFirstFramePosition:!1,i.fps=i.fps!==void 0?i.fps:Math.max(...t.tracks.map(c=>c.times.length))/t.duration,i.names=i.names||[],n.isObject3D||(n=ed(n));const r=Math.round(t.duration*(i.fps/1e3)*1e3),a=t.duration/(r-1),o=[],s=new ko(n),f=wn(e.skeleton),l=[];let m,h,g,v,C;s.clipAction(t).play();let A=0,u=r;i.trim!==void 0?(A=Math.round(i.trim[0]*i.fps),u=Math.min(Math.round(i.trim[1]*i.fps),r)-A,s.update(i.trim[0])):s.update(0),n.updateMatrixWorld();for(let c=0;c<u;++c){const P=c*a;ua(e,n,i);for(let x=0;x<f.length;++x)h=f[x],C=ui(h,i)||h.name,g=da(C,n.skeleton),g&&(v=l[x]=l[x]||{bone:h},i.hip===C&&(v.pos||(v.pos={times:new Float32Array(u),values:new Float32Array(u*3)}),i.useFirstFramePosition&&(c===0&&(m=h.position.clone()),h.position.sub(m)),v.pos.times[c]=P,h.position.toArray(v.pos.values,c*3)),v.quat||(v.quat={times:new Float32Array(u),values:new Float32Array(u*4)}),v.quat.times[c]=P,h.quaternion.toArray(v.quat.values,c*4));c===u-2?s.update(a-1e-7):s.update(a),n.updateMatrixWorld()}for(let c=0;c<l.length;++c)v=l[c],v&&(v.pos&&o.push(new si(".bones["+v.bone.name+"].position",v.pos.times,v.pos.values)),o.push(new ci(".bones["+v.bone.name+"].quaternion",v.quat.times,v.quat.values)));return s.uncacheAction(t),new ea(t.name,-1,o)}function Ju(e){const n=new Map,t=new Map,i=e.clone();return pa(e,i,function(r,a){n.set(a,r),t.set(r,a)}),i.traverse(function(r){if(!r.isSkinnedMesh)return;const a=r,o=n.get(r),s=o.skeleton.bones;a.skeleton=o.skeleton.clone(),a.bindMatrix.copy(o.bindMatrix),a.skeleton.bones=s.map(function(f){return t.get(f)}),a.bind(a.skeleton,a.bindMatrix)}),i}function da(e,n){for(let t=0,i=wn(n);t<i.length;t++)if(e===i[t].name)return i[t]}function wn(e){return Array.isArray(e)?e:e.bones}function ed(e){const n=new Wo(e.bones[0]);return n.skeleton=e,n}function pa(e,n,t){t(e,n);for(let i=0;i<e.children.length;i++)pa(e.children[i],n.children[i],t)}const Bd=Object.freeze(Object.defineProperty({__proto__:null,clone:Ju,retarget:ua,retargetClip:Qu},Symbol.toStringTag,{value:"Module"}));function Pr(e,n){if(n===zo)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),e;if(n===li||n===ta){let t=e.getIndex();if(t===null){const o=[],s=e.getAttribute("position");if(s!==void 0){for(let f=0;f<s.count;f++)o.push(f);e.setIndex(o),t=e.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),e}const i=t.count-2,r=[];if(n===li)for(let o=1;o<=i;o++)r.push(t.getX(0)),r.push(t.getX(o)),r.push(t.getX(o+1));else for(let o=0;o<i;o++)o%2===0?(r.push(t.getX(o)),r.push(t.getX(o+1)),r.push(t.getX(o+2))):(r.push(t.getX(o+2)),r.push(t.getX(o+1)),r.push(t.getX(o)));r.length/3!==i&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");const a=e.clone();return a.setIndex(r),a.clearGroups(),a}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",n),e}class td extends Xo{constructor(n){super(n),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new od(t)}),this.register(function(t){return new sd(t)}),this.register(function(t){return new _d(t)}),this.register(function(t){return new gd(t)}),this.register(function(t){return new vd(t)}),this.register(function(t){return new ld(t)}),this.register(function(t){return new fd(t)}),this.register(function(t){return new ud(t)}),this.register(function(t){return new dd(t)}),this.register(function(t){return new ad(t)}),this.register(function(t){return new pd(t)}),this.register(function(t){return new cd(t)}),this.register(function(t){return new md(t)}),this.register(function(t){return new hd(t)}),this.register(function(t){return new id(t)}),this.register(function(t){return new Ed(t)}),this.register(function(t){return new Sd(t)})}load(n,t,i,r){const a=this;let o;if(this.resourcePath!=="")o=this.resourcePath;else if(this.path!==""){const l=pn.extractUrlBase(n);o=pn.resolveURL(l,this.path)}else o=pn.extractUrlBase(n);this.manager.itemStart(n);const s=function(l){r?r(l):console.error(l),a.manager.itemError(n),a.manager.itemEnd(n)},f=new na(this.manager);f.setPath(this.path),f.setResponseType("arraybuffer"),f.setRequestHeader(this.requestHeader),f.setWithCredentials(this.withCredentials),f.load(n,function(l){try{a.parse(l,o,function(m){t(m),a.manager.itemEnd(n)},s)}catch(m){s(m)}},i,s)}setDRACOLoader(n){return this.dracoLoader=n,this}setKTX2Loader(n){return this.ktx2Loader=n,this}setMeshoptDecoder(n){return this.meshoptDecoder=n,this}register(n){return this.pluginCallbacks.indexOf(n)===-1&&this.pluginCallbacks.push(n),this}unregister(n){return this.pluginCallbacks.indexOf(n)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(n),1),this}parse(n,t,i,r){let a;const o={},s={},f=new TextDecoder;if(typeof n=="string")a=JSON.parse(n);else if(n instanceof ArrayBuffer)if(f.decode(new Uint8Array(n,0,4))===ha){try{o[Ue.KHR_BINARY_GLTF]=new Td(n)}catch(h){r&&r(h);return}a=JSON.parse(o[Ue.KHR_BINARY_GLTF].content)}else a=JSON.parse(f.decode(n));else a=n;if(a.asset===void 0||a.asset.version[0]<2){r&&r(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}const l=new Id(a,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});l.fileLoader.setRequestHeader(this.requestHeader);for(let m=0;m<this.pluginCallbacks.length;m++){const h=this.pluginCallbacks[m](l);h.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),s[h.name]=h,o[h.name]=!0}if(a.extensionsUsed)for(let m=0;m<a.extensionsUsed.length;++m){const h=a.extensionsUsed[m],g=a.extensionsRequired||[];switch(h){case Ue.KHR_MATERIALS_UNLIT:o[h]=new rd;break;case Ue.KHR_DRACO_MESH_COMPRESSION:o[h]=new Md(a,this.dracoLoader);break;case Ue.KHR_TEXTURE_TRANSFORM:o[h]=new xd;break;case Ue.KHR_MESH_QUANTIZATION:o[h]=new Ad;break;default:g.indexOf(h)>=0&&s[h]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+h+'".')}}l.setExtensions(o),l.setPlugins(s),l.parse(i,r)}parseAsync(n,t){const i=this;return new Promise(function(r,a){i.parse(n,t,r,a)})}}function nd(){let e={};return{get:function(n){return e[n]},add:function(n,t){e[n]=t},remove:function(n){delete e[n]},removeAll:function(){e={}}}}const Ue={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class id{constructor(n){this.parser=n,this.name=Ue.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){const n=this.parser,t=this.parser.json.nodes||[];for(let i=0,r=t.length;i<r;i++){const a=t[i];a.extensions&&a.extensions[this.name]&&a.extensions[this.name].light!==void 0&&n._addNodeRef(this.cache,a.extensions[this.name].light)}}_loadLight(n){const t=this.parser,i="light:"+n;let r=t.cache.get(i);if(r)return r;const a=t.json,f=((a.extensions&&a.extensions[this.name]||{}).lights||[])[n];let l;const m=new Ve(16777215);f.color!==void 0&&m.setRGB(f.color[0],f.color[1],f.color[2],pt);const h=f.range!==void 0?f.range:0;switch(f.type){case"directional":l=new Yo(m),l.target.position.set(0,0,-1),l.add(l.target);break;case"point":l=new qo(m),l.distance=h;break;case"spot":l=new Ko(m),l.distance=h,f.spot=f.spot||{},f.spot.innerConeAngle=f.spot.innerConeAngle!==void 0?f.spot.innerConeAngle:0,f.spot.outerConeAngle=f.spot.outerConeAngle!==void 0?f.spot.outerConeAngle:Math.PI/4,l.angle=f.spot.outerConeAngle,l.penumbra=1-f.spot.innerConeAngle/f.spot.outerConeAngle,l.target.position.set(0,0,-1),l.add(l.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+f.type)}return l.position.set(0,0,0),l.decay=2,Ct(l,f),f.intensity!==void 0&&(l.intensity=f.intensity),l.name=t.createUniqueName(f.name||"light_"+n),r=Promise.resolve(l),t.cache.add(i,r),r}getDependency(n,t){if(n==="light")return this._loadLight(t)}createNodeAttachment(n){const t=this,i=this.parser,a=i.json.nodes[n],s=(a.extensions&&a.extensions[this.name]||{}).light;return s===void 0?null:this._loadLight(s).then(function(f){return i._getNodeRef(t.cache,s,f)})}}class rd{constructor(){this.name=Ue.KHR_MATERIALS_UNLIT}getMaterialType(){return Qt}extendParams(n,t,i){const r=[];n.color=new Ve(1,1,1),n.opacity=1;const a=t.pbrMetallicRoughness;if(a){if(Array.isArray(a.baseColorFactor)){const o=a.baseColorFactor;n.color.setRGB(o[0],o[1],o[2],pt),n.opacity=o[3]}a.baseColorTexture!==void 0&&r.push(i.assignTexture(n,"map",a.baseColorTexture,tn))}return Promise.all(r)}}class ad{constructor(n){this.parser=n,this.name=Ue.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(n,t){const r=this.parser.json.materials[n];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const a=r.extensions[this.name].emissiveStrength;return a!==void 0&&(t.emissiveIntensity=a),Promise.resolve()}}class od{constructor(n){this.parser=n,this.name=Ue.KHR_MATERIALS_CLEARCOAT}getMaterialType(n){const i=this.parser.json.materials[n];return!i.extensions||!i.extensions[this.name]?null:At}extendMaterialParams(n,t){const i=this.parser,r=i.json.materials[n];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const a=[],o=r.extensions[this.name];if(o.clearcoatFactor!==void 0&&(t.clearcoat=o.clearcoatFactor),o.clearcoatTexture!==void 0&&a.push(i.assignTexture(t,"clearcoatMap",o.clearcoatTexture)),o.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=o.clearcoatRoughnessFactor),o.clearcoatRoughnessTexture!==void 0&&a.push(i.assignTexture(t,"clearcoatRoughnessMap",o.clearcoatRoughnessTexture)),o.clearcoatNormalTexture!==void 0&&(a.push(i.assignTexture(t,"clearcoatNormalMap",o.clearcoatNormalTexture)),o.clearcoatNormalTexture.scale!==void 0)){const s=o.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new st(s,s)}return Promise.all(a)}}class sd{constructor(n){this.parser=n,this.name=Ue.KHR_MATERIALS_DISPERSION}getMaterialType(n){const i=this.parser.json.materials[n];return!i.extensions||!i.extensions[this.name]?null:At}extendMaterialParams(n,t){const r=this.parser.json.materials[n];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const a=r.extensions[this.name];return t.dispersion=a.dispersion!==void 0?a.dispersion:0,Promise.resolve()}}class cd{constructor(n){this.parser=n,this.name=Ue.KHR_MATERIALS_IRIDESCENCE}getMaterialType(n){const i=this.parser.json.materials[n];return!i.extensions||!i.extensions[this.name]?null:At}extendMaterialParams(n,t){const i=this.parser,r=i.json.materials[n];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const a=[],o=r.extensions[this.name];return o.iridescenceFactor!==void 0&&(t.iridescence=o.iridescenceFactor),o.iridescenceTexture!==void 0&&a.push(i.assignTexture(t,"iridescenceMap",o.iridescenceTexture)),o.iridescenceIor!==void 0&&(t.iridescenceIOR=o.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),o.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=o.iridescenceThicknessMinimum),o.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=o.iridescenceThicknessMaximum),o.iridescenceThicknessTexture!==void 0&&a.push(i.assignTexture(t,"iridescenceThicknessMap",o.iridescenceThicknessTexture)),Promise.all(a)}}class ld{constructor(n){this.parser=n,this.name=Ue.KHR_MATERIALS_SHEEN}getMaterialType(n){const i=this.parser.json.materials[n];return!i.extensions||!i.extensions[this.name]?null:At}extendMaterialParams(n,t){const i=this.parser,r=i.json.materials[n];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const a=[];t.sheenColor=new Ve(0,0,0),t.sheenRoughness=0,t.sheen=1;const o=r.extensions[this.name];if(o.sheenColorFactor!==void 0){const s=o.sheenColorFactor;t.sheenColor.setRGB(s[0],s[1],s[2],pt)}return o.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=o.sheenRoughnessFactor),o.sheenColorTexture!==void 0&&a.push(i.assignTexture(t,"sheenColorMap",o.sheenColorTexture,tn)),o.sheenRoughnessTexture!==void 0&&a.push(i.assignTexture(t,"sheenRoughnessMap",o.sheenRoughnessTexture)),Promise.all(a)}}class fd{constructor(n){this.parser=n,this.name=Ue.KHR_MATERIALS_TRANSMISSION}getMaterialType(n){const i=this.parser.json.materials[n];return!i.extensions||!i.extensions[this.name]?null:At}extendMaterialParams(n,t){const i=this.parser,r=i.json.materials[n];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const a=[],o=r.extensions[this.name];return o.transmissionFactor!==void 0&&(t.transmission=o.transmissionFactor),o.transmissionTexture!==void 0&&a.push(i.assignTexture(t,"transmissionMap",o.transmissionTexture)),Promise.all(a)}}class ud{constructor(n){this.parser=n,this.name=Ue.KHR_MATERIALS_VOLUME}getMaterialType(n){const i=this.parser.json.materials[n];return!i.extensions||!i.extensions[this.name]?null:At}extendMaterialParams(n,t){const i=this.parser,r=i.json.materials[n];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const a=[],o=r.extensions[this.name];t.thickness=o.thicknessFactor!==void 0?o.thicknessFactor:0,o.thicknessTexture!==void 0&&a.push(i.assignTexture(t,"thicknessMap",o.thicknessTexture)),t.attenuationDistance=o.attenuationDistance||1/0;const s=o.attenuationColor||[1,1,1];return t.attenuationColor=new Ve().setRGB(s[0],s[1],s[2],pt),Promise.all(a)}}class dd{constructor(n){this.parser=n,this.name=Ue.KHR_MATERIALS_IOR}getMaterialType(n){const i=this.parser.json.materials[n];return!i.extensions||!i.extensions[this.name]?null:At}extendMaterialParams(n,t){const r=this.parser.json.materials[n];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const a=r.extensions[this.name];return t.ior=a.ior!==void 0?a.ior:1.5,Promise.resolve()}}class pd{constructor(n){this.parser=n,this.name=Ue.KHR_MATERIALS_SPECULAR}getMaterialType(n){const i=this.parser.json.materials[n];return!i.extensions||!i.extensions[this.name]?null:At}extendMaterialParams(n,t){const i=this.parser,r=i.json.materials[n];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const a=[],o=r.extensions[this.name];t.specularIntensity=o.specularFactor!==void 0?o.specularFactor:1,o.specularTexture!==void 0&&a.push(i.assignTexture(t,"specularIntensityMap",o.specularTexture));const s=o.specularColorFactor||[1,1,1];return t.specularColor=new Ve().setRGB(s[0],s[1],s[2],pt),o.specularColorTexture!==void 0&&a.push(i.assignTexture(t,"specularColorMap",o.specularColorTexture,tn)),Promise.all(a)}}class hd{constructor(n){this.parser=n,this.name=Ue.EXT_MATERIALS_BUMP}getMaterialType(n){const i=this.parser.json.materials[n];return!i.extensions||!i.extensions[this.name]?null:At}extendMaterialParams(n,t){const i=this.parser,r=i.json.materials[n];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const a=[],o=r.extensions[this.name];return t.bumpScale=o.bumpFactor!==void 0?o.bumpFactor:1,o.bumpTexture!==void 0&&a.push(i.assignTexture(t,"bumpMap",o.bumpTexture)),Promise.all(a)}}class md{constructor(n){this.parser=n,this.name=Ue.KHR_MATERIALS_ANISOTROPY}getMaterialType(n){const i=this.parser.json.materials[n];return!i.extensions||!i.extensions[this.name]?null:At}extendMaterialParams(n,t){const i=this.parser,r=i.json.materials[n];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const a=[],o=r.extensions[this.name];return o.anisotropyStrength!==void 0&&(t.anisotropy=o.anisotropyStrength),o.anisotropyRotation!==void 0&&(t.anisotropyRotation=o.anisotropyRotation),o.anisotropyTexture!==void 0&&a.push(i.assignTexture(t,"anisotropyMap",o.anisotropyTexture)),Promise.all(a)}}class _d{constructor(n){this.parser=n,this.name=Ue.KHR_TEXTURE_BASISU}loadTexture(n){const t=this.parser,i=t.json,r=i.textures[n];if(!r.extensions||!r.extensions[this.name])return null;const a=r.extensions[this.name],o=t.options.ktx2Loader;if(!o){if(i.extensionsRequired&&i.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(n,a.source,o)}}class gd{constructor(n){this.parser=n,this.name=Ue.EXT_TEXTURE_WEBP,this.isSupported=null}loadTexture(n){const t=this.name,i=this.parser,r=i.json,a=r.textures[n];if(!a.extensions||!a.extensions[t])return null;const o=a.extensions[t],s=r.images[o.source];let f=i.textureLoader;if(s.uri){const l=i.options.manager.getHandler(s.uri);l!==null&&(f=l)}return this.detectSupport().then(function(l){if(l)return i.loadTextureImage(n,o.source,f);if(r.extensionsRequired&&r.extensionsRequired.indexOf(t)>=0)throw new Error("THREE.GLTFLoader: WebP required by asset but unsupported.");return i.loadTexture(n)})}detectSupport(){return this.isSupported||(this.isSupported=new Promise(function(n){const t=new Image;t.src="data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",t.onload=t.onerror=function(){n(t.height===1)}})),this.isSupported}}class vd{constructor(n){this.parser=n,this.name=Ue.EXT_TEXTURE_AVIF,this.isSupported=null}loadTexture(n){const t=this.name,i=this.parser,r=i.json,a=r.textures[n];if(!a.extensions||!a.extensions[t])return null;const o=a.extensions[t],s=r.images[o.source];let f=i.textureLoader;if(s.uri){const l=i.options.manager.getHandler(s.uri);l!==null&&(f=l)}return this.detectSupport().then(function(l){if(l)return i.loadTextureImage(n,o.source,f);if(r.extensionsRequired&&r.extensionsRequired.indexOf(t)>=0)throw new Error("THREE.GLTFLoader: AVIF required by asset but unsupported.");return i.loadTexture(n)})}detectSupport(){return this.isSupported||(this.isSupported=new Promise(function(n){const t=new Image;t.src="data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=",t.onload=t.onerror=function(){n(t.height===1)}})),this.isSupported}}class Ed{constructor(n){this.name=Ue.EXT_MESHOPT_COMPRESSION,this.parser=n}loadBufferView(n){const t=this.parser.json,i=t.bufferViews[n];if(i.extensions&&i.extensions[this.name]){const r=i.extensions[this.name],a=this.parser.getDependency("buffer",r.buffer),o=this.parser.options.meshoptDecoder;if(!o||!o.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return a.then(function(s){const f=r.byteOffset||0,l=r.byteLength||0,m=r.count,h=r.byteStride,g=new Uint8Array(s,f,l);return o.decodeGltfBufferAsync?o.decodeGltfBufferAsync(m,h,g,r.mode,r.filter).then(function(v){return v.buffer}):o.ready.then(function(){const v=new ArrayBuffer(m*h);return o.decodeGltfBuffer(new Uint8Array(v),m,h,g,r.mode,r.filter),v})})}else return null}}class Sd{constructor(n){this.name=Ue.EXT_MESH_GPU_INSTANCING,this.parser=n}createNodeMesh(n){const t=this.parser.json,i=t.nodes[n];if(!i.extensions||!i.extensions[this.name]||i.mesh===void 0)return null;const r=t.meshes[i.mesh];for(const l of r.primitives)if(l.mode!==gt.TRIANGLES&&l.mode!==gt.TRIANGLE_STRIP&&l.mode!==gt.TRIANGLE_FAN&&l.mode!==void 0)return null;const o=i.extensions[this.name].attributes,s=[],f={};for(const l in o)s.push(this.parser.getDependency("accessor",o[l]).then(m=>(f[l]=m,f[l])));return s.length<1?null:(s.push(this.parser.createNodeMesh(n)),Promise.all(s).then(l=>{const m=l.pop(),h=m.isGroup?m.children:[m],g=l[0].count,v=[];for(const C of h){const A=new Et,u=new we,c=new _i,P=new we(1,1,1),x=new jo(C.geometry,C.material,g);for(let T=0;T<g;T++)f.TRANSLATION&&u.fromBufferAttribute(f.TRANSLATION,T),f.ROTATION&&c.fromBufferAttribute(f.ROTATION,T),f.SCALE&&P.fromBufferAttribute(f.SCALE,T),x.setMatrixAt(T,A.compose(u,c,P));for(const T in f)if(T==="_COLOR_0"){const F=f[T];x.instanceColor=new $o(F.array,F.itemSize,F.normalized)}else T!=="TRANSLATION"&&T!=="ROTATION"&&T!=="SCALE"&&C.geometry.setAttribute(T,f[T]);ia.prototype.copy.call(x,C),this.parser.assignFinalMaterial(x),v.push(x)}return m.isGroup?(m.clear(),m.add(...v),m):v[0]}))}}const ha="glTF",ln=12,wr={JSON:1313821514,BIN:5130562};class Td{constructor(n){this.name=Ue.KHR_BINARY_GLTF,this.content=null,this.body=null;const t=new DataView(n,0,ln),i=new TextDecoder;if(this.header={magic:i.decode(new Uint8Array(n.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==ha)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");const r=this.header.length-ln,a=new DataView(n,ln);let o=0;for(;o<r;){const s=a.getUint32(o,!0);o+=4;const f=a.getUint32(o,!0);if(o+=4,f===wr.JSON){const l=new Uint8Array(n,ln+o,s);this.content=i.decode(l)}else if(f===wr.BIN){const l=ln+o;this.body=n.slice(l,l+s)}o+=s}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}}class Md{constructor(n,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=Ue.KHR_DRACO_MESH_COMPRESSION,this.json=n,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(n,t){const i=this.json,r=this.dracoLoader,a=n.extensions[this.name].bufferView,o=n.extensions[this.name].attributes,s={},f={},l={};for(const m in o){const h=di[m]||m.toLowerCase();s[h]=o[m]}for(const m in n.attributes){const h=di[m]||m.toLowerCase();if(o[m]!==void 0){const g=i.accessors[n.attributes[m]],v=en[g.componentType];l[h]=v.name,f[h]=g.normalized===!0}}return t.getDependency("bufferView",a).then(function(m){return new Promise(function(h,g){r.decodeDracoFile(m,function(v){for(const C in v.attributes){const A=v.attributes[C],u=f[C];u!==void 0&&(A.normalized=u)}h(v)},s,l,pt,g)})})}}class xd{constructor(){this.name=Ue.KHR_TEXTURE_TRANSFORM}extendTexture(n,t){return(t.texCoord===void 0||t.texCoord===n.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0||(n=n.clone(),t.texCoord!==void 0&&(n.channel=t.texCoord),t.offset!==void 0&&n.offset.fromArray(t.offset),t.rotation!==void 0&&(n.rotation=t.rotation),t.scale!==void 0&&n.repeat.fromArray(t.scale),n.needsUpdate=!0),n}}class Ad{constructor(){this.name=Ue.KHR_MESH_QUANTIZATION}}class ma extends ps{constructor(n,t,i,r){super(n,t,i,r)}copySampleValue_(n){const t=this.resultBuffer,i=this.sampleValues,r=this.valueSize,a=n*r*3+r;for(let o=0;o!==r;o++)t[o]=i[a+o];return t}interpolate_(n,t,i,r){const a=this.resultBuffer,o=this.sampleValues,s=this.valueSize,f=s*2,l=s*3,m=r-t,h=(i-t)/m,g=h*h,v=g*h,C=n*l,A=C-l,u=-2*v+3*g,c=v-g,P=1-u,x=c-g+h;for(let T=0;T!==s;T++){const F=o[A+T+s],D=o[A+T+f]*m,y=o[C+T+s],B=o[C+T]*m;a[T]=P*F+x*D+u*y+c*B}return a}}const Rd=new _i;class bd extends ma{interpolate_(n,t,i,r){const a=super.interpolate_(n,t,i,r);return Rd.fromArray(a).normalize().toArray(a),a}}const gt={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},en={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Dr={9728:Wt,9729:wt,9984:Gr,9985:Mn,9986:fn,9987:Gt},Ur={33071:Hr,33648:Br,10497:Cn},jn={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},di={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},Dt={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},Cd={CUBICSPLINE:void 0,LINEAR:aa,STEP:us},$n={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function Ld(e){return e.DefaultMaterial===void 0&&(e.DefaultMaterial=new ra({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:rn})),e.DefaultMaterial}function Ft(e,n,t){for(const i in t.extensions)e[i]===void 0&&(n.userData.gltfExtensions=n.userData.gltfExtensions||{},n.userData.gltfExtensions[i]=t.extensions[i])}function Ct(e,n){n.extras!==void 0&&(typeof n.extras=="object"?Object.assign(e.userData,n.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+n.extras))}function Pd(e,n,t){let i=!1,r=!1,a=!1;for(let l=0,m=n.length;l<m;l++){const h=n[l];if(h.POSITION!==void 0&&(i=!0),h.NORMAL!==void 0&&(r=!0),h.COLOR_0!==void 0&&(a=!0),i&&r&&a)break}if(!i&&!r&&!a)return Promise.resolve(e);const o=[],s=[],f=[];for(let l=0,m=n.length;l<m;l++){const h=n[l];if(i){const g=h.POSITION!==void 0?t.getDependency("accessor",h.POSITION):e.attributes.position;o.push(g)}if(r){const g=h.NORMAL!==void 0?t.getDependency("accessor",h.NORMAL):e.attributes.normal;s.push(g)}if(a){const g=h.COLOR_0!==void 0?t.getDependency("accessor",h.COLOR_0):e.attributes.color;f.push(g)}}return Promise.all([Promise.all(o),Promise.all(s),Promise.all(f)]).then(function(l){const m=l[0],h=l[1],g=l[2];return i&&(e.morphAttributes.position=m),r&&(e.morphAttributes.normal=h),a&&(e.morphAttributes.color=g),e.morphTargetsRelative=!0,e})}function wd(e,n){if(e.updateMorphTargets(),n.weights!==void 0)for(let t=0,i=n.weights.length;t<i;t++)e.morphTargetInfluences[t]=n.weights[t];if(n.extras&&Array.isArray(n.extras.targetNames)){const t=n.extras.targetNames;if(e.morphTargetInfluences.length===t.length){e.morphTargetDictionary={};for(let i=0,r=t.length;i<r;i++)e.morphTargetDictionary[t[i]]=i}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function Dd(e){let n;const t=e.extensions&&e.extensions[Ue.KHR_DRACO_MESH_COMPRESSION];if(t?n="draco:"+t.bufferView+":"+t.indices+":"+Zn(t.attributes):n=e.indices+":"+Zn(e.attributes)+":"+e.mode,e.targets!==void 0)for(let i=0,r=e.targets.length;i<r;i++)n+=":"+Zn(e.targets[i]);return n}function Zn(e){let n="";const t=Object.keys(e).sort();for(let i=0,r=t.length;i<r;i++)n+=t[i]+":"+e[t[i]]+";";return n}function pi(e){switch(e){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function Ud(e){return e.search(/\.jpe?g($|\?)/i)>0||e.search(/^data\:image\/jpeg/)===0?"image/jpeg":e.search(/\.webp($|\?)/i)>0||e.search(/^data\:image\/webp/)===0?"image/webp":e.search(/\.ktx2($|\?)/i)>0||e.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}const yd=new Et;class Id{constructor(n={},t={}){this.json=n,this.extensions={},this.plugins={},this.options=t,this.cache=new nd,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let i=!1,r=-1,a=!1,o=-1;if(typeof navigator<"u"){const s=navigator.userAgent;i=/^((?!chrome|android).)*safari/i.test(s)===!0;const f=s.match(/Version\/(\d+)/);r=i&&f?parseInt(f[1],10):-1,a=s.indexOf("Firefox")>-1,o=a?s.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||i&&r<17||a&&o<98?this.textureLoader=new Zo(this.options.manager):this.textureLoader=new Qo(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new na(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(n){this.extensions=n}setPlugins(n){this.plugins=n}parse(n,t){const i=this,r=this.json,a=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(o){return o._markDefs&&o._markDefs()}),Promise.all(this._invokeAll(function(o){return o.beforeRoot&&o.beforeRoot()})).then(function(){return Promise.all([i.getDependencies("scene"),i.getDependencies("animation"),i.getDependencies("camera")])}).then(function(o){const s={scene:o[0][r.scene||0],scenes:o[0],animations:o[1],cameras:o[2],asset:r.asset,parser:i,userData:{}};return Ft(a,s,r),Ct(s,r),Promise.all(i._invokeAll(function(f){return f.afterRoot&&f.afterRoot(s)})).then(function(){for(const f of s.scenes)f.updateMatrixWorld();n(s)})}).catch(t)}_markDefs(){const n=this.json.nodes||[],t=this.json.skins||[],i=this.json.meshes||[];for(let r=0,a=t.length;r<a;r++){const o=t[r].joints;for(let s=0,f=o.length;s<f;s++)n[o[s]].isBone=!0}for(let r=0,a=n.length;r<a;r++){const o=n[r];o.mesh!==void 0&&(this._addNodeRef(this.meshCache,o.mesh),o.skin!==void 0&&(i[o.mesh].isSkinnedMesh=!0)),o.camera!==void 0&&this._addNodeRef(this.cameraCache,o.camera)}}_addNodeRef(n,t){t!==void 0&&(n.refs[t]===void 0&&(n.refs[t]=n.uses[t]=0),n.refs[t]++)}_getNodeRef(n,t,i){if(n.refs[t]<=1)return i;const r=i.clone(),a=(o,s)=>{const f=this.associations.get(o);f!=null&&this.associations.set(s,f);for(const[l,m]of o.children.entries())a(m,s.children[l])};return a(i,r),r.name+="_instance_"+n.uses[t]++,r}_invokeOne(n){const t=Object.values(this.plugins);t.push(this);for(let i=0;i<t.length;i++){const r=n(t[i]);if(r)return r}return null}_invokeAll(n){const t=Object.values(this.plugins);t.unshift(this);const i=[];for(let r=0;r<t.length;r++){const a=n(t[r]);a&&i.push(a)}return i}getDependency(n,t){const i=n+":"+t;let r=this.cache.get(i);if(!r){switch(n){case"scene":r=this.loadScene(t);break;case"node":r=this._invokeOne(function(a){return a.loadNode&&a.loadNode(t)});break;case"mesh":r=this._invokeOne(function(a){return a.loadMesh&&a.loadMesh(t)});break;case"accessor":r=this.loadAccessor(t);break;case"bufferView":r=this._invokeOne(function(a){return a.loadBufferView&&a.loadBufferView(t)});break;case"buffer":r=this.loadBuffer(t);break;case"material":r=this._invokeOne(function(a){return a.loadMaterial&&a.loadMaterial(t)});break;case"texture":r=this._invokeOne(function(a){return a.loadTexture&&a.loadTexture(t)});break;case"skin":r=this.loadSkin(t);break;case"animation":r=this._invokeOne(function(a){return a.loadAnimation&&a.loadAnimation(t)});break;case"camera":r=this.loadCamera(t);break;default:if(r=this._invokeOne(function(a){return a!=this&&a.getDependency&&a.getDependency(n,t)}),!r)throw new Error("Unknown type: "+n);break}this.cache.add(i,r)}return r}getDependencies(n){let t=this.cache.get(n);if(!t){const i=this,r=this.json[n+(n==="mesh"?"es":"s")]||[];t=Promise.all(r.map(function(a,o){return i.getDependency(n,o)})),this.cache.add(n,t)}return t}loadBuffer(n){const t=this.json.buffers[n],i=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&n===0)return Promise.resolve(this.extensions[Ue.KHR_BINARY_GLTF].body);const r=this.options;return new Promise(function(a,o){i.load(pn.resolveURL(t.uri,r.path),a,void 0,function(){o(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(n){const t=this.json.bufferViews[n];return this.getDependency("buffer",t.buffer).then(function(i){const r=t.byteLength||0,a=t.byteOffset||0;return i.slice(a,a+r)})}loadAccessor(n){const t=this,i=this.json,r=this.json.accessors[n];if(r.bufferView===void 0&&r.sparse===void 0){const o=jn[r.type],s=en[r.componentType],f=r.normalized===!0,l=new s(r.count*o);return Promise.resolve(new zt(l,o,f))}const a=[];return r.bufferView!==void 0?a.push(this.getDependency("bufferView",r.bufferView)):a.push(null),r.sparse!==void 0&&(a.push(this.getDependency("bufferView",r.sparse.indices.bufferView)),a.push(this.getDependency("bufferView",r.sparse.values.bufferView))),Promise.all(a).then(function(o){const s=o[0],f=jn[r.type],l=en[r.componentType],m=l.BYTES_PER_ELEMENT,h=m*f,g=r.byteOffset||0,v=r.bufferView!==void 0?i.bufferViews[r.bufferView].byteStride:void 0,C=r.normalized===!0;let A,u;if(v&&v!==h){const c=Math.floor(g/v),P="InterleavedBuffer:"+r.bufferView+":"+r.componentType+":"+c+":"+r.count;let x=t.cache.get(P);x||(A=new l(s,c*v,r.count*v/m),x=new Jo(A,v/m),t.cache.add(P,x)),u=new ds(x,f,g%v/m,C)}else s===null?A=new l(r.count*f):A=new l(s,g,r.count*f),u=new zt(A,f,C);if(r.sparse!==void 0){const c=jn.SCALAR,P=en[r.sparse.indices.componentType],x=r.sparse.indices.byteOffset||0,T=r.sparse.values.byteOffset||0,F=new P(o[1],x,r.sparse.count*c),D=new l(o[2],T,r.sparse.count*f);s!==null&&(u=new zt(u.array.slice(),u.itemSize,u.normalized)),u.normalized=!1;for(let y=0,B=F.length;y<B;y++){const S=F[y];if(u.setX(S,D[y*f]),f>=2&&u.setY(S,D[y*f+1]),f>=3&&u.setZ(S,D[y*f+2]),f>=4&&u.setW(S,D[y*f+3]),f>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}u.normalized=C}return u})}loadTexture(n){const t=this.json,i=this.options,a=t.textures[n].source,o=t.images[a];let s=this.textureLoader;if(o.uri){const f=i.manager.getHandler(o.uri);f!==null&&(s=f)}return this.loadTextureImage(n,a,s)}loadTextureImage(n,t,i){const r=this,a=this.json,o=a.textures[n],s=a.images[t],f=(s.uri||s.bufferView)+":"+o.sampler;if(this.textureCache[f])return this.textureCache[f];const l=this.loadImageSource(t,i).then(function(m){m.flipY=!1,m.name=o.name||s.name||"",m.name===""&&typeof s.uri=="string"&&s.uri.startsWith("data:image/")===!1&&(m.name=s.uri);const g=(a.samplers||{})[o.sampler]||{};return m.magFilter=Dr[g.magFilter]||wt,m.minFilter=Dr[g.minFilter]||Gt,m.wrapS=Ur[g.wrapS]||Cn,m.wrapT=Ur[g.wrapT]||Cn,m.generateMipmaps=!m.isCompressedTexture&&m.minFilter!==Wt&&m.minFilter!==wt,r.associations.set(m,{textures:n}),m}).catch(function(){return null});return this.textureCache[f]=l,l}loadImageSource(n,t){const i=this,r=this.json,a=this.options;if(this.sourceCache[n]!==void 0)return this.sourceCache[n].then(h=>h.clone());const o=r.images[n],s=self.URL||self.webkitURL;let f=o.uri||"",l=!1;if(o.bufferView!==void 0)f=i.getDependency("bufferView",o.bufferView).then(function(h){l=!0;const g=new Blob([h],{type:o.mimeType});return f=s.createObjectURL(g),f});else if(o.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+n+" is missing URI and bufferView");const m=Promise.resolve(f).then(function(h){return new Promise(function(g,v){let C=g;t.isImageBitmapLoader===!0&&(C=function(A){const u=new Pn(A);u.needsUpdate=!0,g(u)}),t.load(pn.resolveURL(h,a.path),C,void 0,v)})}).then(function(h){return l===!0&&s.revokeObjectURL(f),Ct(h,o),h.userData.mimeType=o.mimeType||Ud(o.uri),h}).catch(function(h){throw console.error("THREE.GLTFLoader: Couldn't load texture",f),h});return this.sourceCache[n]=m,m}assignTexture(n,t,i,r){const a=this;return this.getDependency("texture",i.index).then(function(o){if(!o)return null;if(i.texCoord!==void 0&&i.texCoord>0&&(o=o.clone(),o.channel=i.texCoord),a.extensions[Ue.KHR_TEXTURE_TRANSFORM]){const s=i.extensions!==void 0?i.extensions[Ue.KHR_TEXTURE_TRANSFORM]:void 0;if(s){const f=a.associations.get(o);o=a.extensions[Ue.KHR_TEXTURE_TRANSFORM].extendTexture(o,s),a.associations.set(o,f)}}return r!==void 0&&(o.colorSpace=r),n[t]=o,o})}assignFinalMaterial(n){const t=n.geometry;let i=n.material;const r=t.attributes.tangent===void 0,a=t.attributes.color!==void 0,o=t.attributes.normal===void 0;if(n.isPoints){const s="PointsMaterial:"+i.uuid;let f=this.cache.get(s);f||(f=new es,Vn.prototype.copy.call(f,i),f.color.copy(i.color),f.map=i.map,f.sizeAttenuation=!1,this.cache.add(s,f)),i=f}else if(n.isLine){const s="LineBasicMaterial:"+i.uuid;let f=this.cache.get(s);f||(f=new ts,Vn.prototype.copy.call(f,i),f.color.copy(i.color),f.map=i.map,this.cache.add(s,f)),i=f}if(r||a||o){let s="ClonedMaterial:"+i.uuid+":";r&&(s+="derivative-tangents:"),a&&(s+="vertex-colors:"),o&&(s+="flat-shading:");let f=this.cache.get(s);f||(f=i.clone(),a&&(f.vertexColors=!0),o&&(f.flatShading=!0),r&&(f.normalScale&&(f.normalScale.y*=-1),f.clearcoatNormalScale&&(f.clearcoatNormalScale.y*=-1)),this.cache.add(s,f),this.associations.set(f,this.associations.get(i))),i=f}n.material=i}getMaterialType(){return ra}loadMaterial(n){const t=this,i=this.json,r=this.extensions,a=i.materials[n];let o;const s={},f=a.extensions||{},l=[];if(f[Ue.KHR_MATERIALS_UNLIT]){const h=r[Ue.KHR_MATERIALS_UNLIT];o=h.getMaterialType(),l.push(h.extendParams(s,a,t))}else{const h=a.pbrMetallicRoughness||{};if(s.color=new Ve(1,1,1),s.opacity=1,Array.isArray(h.baseColorFactor)){const g=h.baseColorFactor;s.color.setRGB(g[0],g[1],g[2],pt),s.opacity=g[3]}h.baseColorTexture!==void 0&&l.push(t.assignTexture(s,"map",h.baseColorTexture,tn)),s.metalness=h.metallicFactor!==void 0?h.metallicFactor:1,s.roughness=h.roughnessFactor!==void 0?h.roughnessFactor:1,h.metallicRoughnessTexture!==void 0&&(l.push(t.assignTexture(s,"metalnessMap",h.metallicRoughnessTexture)),l.push(t.assignTexture(s,"roughnessMap",h.metallicRoughnessTexture))),o=this._invokeOne(function(g){return g.getMaterialType&&g.getMaterialType(n)}),l.push(Promise.all(this._invokeAll(function(g){return g.extendMaterialParams&&g.extendMaterialParams(n,s)})))}a.doubleSided===!0&&(s.side=xt);const m=a.alphaMode||$n.OPAQUE;if(m===$n.BLEND?(s.transparent=!0,s.depthWrite=!1):(s.transparent=!1,m===$n.MASK&&(s.alphaTest=a.alphaCutoff!==void 0?a.alphaCutoff:.5)),a.normalTexture!==void 0&&o!==Qt&&(l.push(t.assignTexture(s,"normalMap",a.normalTexture)),s.normalScale=new st(1,1),a.normalTexture.scale!==void 0)){const h=a.normalTexture.scale;s.normalScale.set(h,h)}if(a.occlusionTexture!==void 0&&o!==Qt&&(l.push(t.assignTexture(s,"aoMap",a.occlusionTexture)),a.occlusionTexture.strength!==void 0&&(s.aoMapIntensity=a.occlusionTexture.strength)),a.emissiveFactor!==void 0&&o!==Qt){const h=a.emissiveFactor;s.emissive=new Ve().setRGB(h[0],h[1],h[2],pt)}return a.emissiveTexture!==void 0&&o!==Qt&&l.push(t.assignTexture(s,"emissiveMap",a.emissiveTexture,tn)),Promise.all(l).then(function(){const h=new o(s);return a.name&&(h.name=a.name),Ct(h,a),t.associations.set(h,{materials:n}),a.extensions&&Ft(r,h,a),h})}createUniqueName(n){const t=ns.sanitizeNodeName(n||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(n){const t=this,i=this.extensions,r=this.primitiveCache;function a(s){return i[Ue.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(s,t).then(function(f){return yr(f,s,t)})}const o=[];for(let s=0,f=n.length;s<f;s++){const l=n[s],m=Dd(l),h=r[m];if(h)o.push(h.promise);else{let g;l.extensions&&l.extensions[Ue.KHR_DRACO_MESH_COMPRESSION]?g=a(l):g=yr(new mi,l,t),r[m]={primitive:l,promise:g},o.push(g)}}return Promise.all(o)}loadMesh(n){const t=this,i=this.json,r=this.extensions,a=i.meshes[n],o=a.primitives,s=[];for(let f=0,l=o.length;f<l;f++){const m=o[f].material===void 0?Ld(this.cache):this.getDependency("material",o[f].material);s.push(m)}return s.push(t.loadGeometries(o)),Promise.all(s).then(function(f){const l=f.slice(0,f.length-1),m=f[f.length-1],h=[];for(let v=0,C=m.length;v<C;v++){const A=m[v],u=o[v];let c;const P=l[v];if(u.mode===gt.TRIANGLES||u.mode===gt.TRIANGLE_STRIP||u.mode===gt.TRIANGLE_FAN||u.mode===void 0)c=a.isSkinnedMesh===!0?new is(A,P):new Pt(A,P),c.isSkinnedMesh===!0&&c.normalizeSkinWeights(),u.mode===gt.TRIANGLE_STRIP?c.geometry=Pr(c.geometry,ta):u.mode===gt.TRIANGLE_FAN&&(c.geometry=Pr(c.geometry,li));else if(u.mode===gt.LINES)c=new rs(A,P);else if(u.mode===gt.LINE_STRIP)c=new as(A,P);else if(u.mode===gt.LINE_LOOP)c=new os(A,P);else if(u.mode===gt.POINTS)c=new ss(A,P);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+u.mode);Object.keys(c.geometry.morphAttributes).length>0&&wd(c,a),c.name=t.createUniqueName(a.name||"mesh_"+n),Ct(c,a),u.extensions&&Ft(r,c,u),t.assignFinalMaterial(c),h.push(c)}for(let v=0,C=h.length;v<C;v++)t.associations.set(h[v],{meshes:n,primitives:v});if(h.length===1)return a.extensions&&Ft(r,h[0],a),h[0];const g=new Vt;a.extensions&&Ft(r,g,a),t.associations.set(g,{meshes:n});for(let v=0,C=h.length;v<C;v++)g.add(h[v]);return g})}loadCamera(n){let t;const i=this.json.cameras[n],r=i[i.type];if(!r){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return i.type==="perspective"?t=new dn(cs.radToDeg(r.yfov),r.aspectRatio||1,r.znear||1,r.zfar||2e6):i.type==="orthographic"&&(t=new Or(-r.xmag,r.xmag,r.ymag,-r.ymag,r.znear,r.zfar)),i.name&&(t.name=this.createUniqueName(i.name)),Ct(t,i),Promise.resolve(t)}loadSkin(n){const t=this.json.skins[n],i=[];for(let r=0,a=t.joints.length;r<a;r++)i.push(this._loadNodeShallow(t.joints[r]));return t.inverseBindMatrices!==void 0?i.push(this.getDependency("accessor",t.inverseBindMatrices)):i.push(null),Promise.all(i).then(function(r){const a=r.pop(),o=r,s=[],f=[];for(let l=0,m=o.length;l<m;l++){const h=o[l];if(h){s.push(h);const g=new Et;a!==null&&g.fromArray(a.array,l*16),f.push(g)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[l])}return new ls(s,f)})}loadAnimation(n){const t=this.json,i=this,r=t.animations[n],a=r.name?r.name:"animation_"+n,o=[],s=[],f=[],l=[],m=[];for(let h=0,g=r.channels.length;h<g;h++){const v=r.channels[h],C=r.samplers[v.sampler],A=v.target,u=A.node,c=r.parameters!==void 0?r.parameters[C.input]:C.input,P=r.parameters!==void 0?r.parameters[C.output]:C.output;A.node!==void 0&&(o.push(this.getDependency("node",u)),s.push(this.getDependency("accessor",c)),f.push(this.getDependency("accessor",P)),l.push(C),m.push(A))}return Promise.all([Promise.all(o),Promise.all(s),Promise.all(f),Promise.all(l),Promise.all(m)]).then(function(h){const g=h[0],v=h[1],C=h[2],A=h[3],u=h[4],c=[];for(let P=0,x=g.length;P<x;P++){const T=g[P],F=v[P],D=C[P],y=A[P],B=u[P];if(T===void 0)continue;T.updateMatrix&&T.updateMatrix();const S=i._createAnimationTracks(T,F,D,y,B);if(S)for(let _=0;_<S.length;_++)c.push(S[_])}return new ea(a,void 0,c)})}createNodeMesh(n){const t=this.json,i=this,r=t.nodes[n];return r.mesh===void 0?null:i.getDependency("mesh",r.mesh).then(function(a){const o=i._getNodeRef(i.meshCache,r.mesh,a);return r.weights!==void 0&&o.traverse(function(s){if(s.isMesh)for(let f=0,l=r.weights.length;f<l;f++)s.morphTargetInfluences[f]=r.weights[f]}),o})}loadNode(n){const t=this.json,i=this,r=t.nodes[n],a=i._loadNodeShallow(n),o=[],s=r.children||[];for(let l=0,m=s.length;l<m;l++)o.push(i.getDependency("node",s[l]));const f=r.skin===void 0?Promise.resolve(null):i.getDependency("skin",r.skin);return Promise.all([a,Promise.all(o),f]).then(function(l){const m=l[0],h=l[1],g=l[2];g!==null&&m.traverse(function(v){v.isSkinnedMesh&&v.bind(g,yd)});for(let v=0,C=h.length;v<C;v++)m.add(h[v]);return m})}_loadNodeShallow(n){const t=this.json,i=this.extensions,r=this;if(this.nodeCache[n]!==void 0)return this.nodeCache[n];const a=t.nodes[n],o=a.name?r.createUniqueName(a.name):"",s=[],f=r._invokeOne(function(l){return l.createNodeMesh&&l.createNodeMesh(n)});return f&&s.push(f),a.camera!==void 0&&s.push(r.getDependency("camera",a.camera).then(function(l){return r._getNodeRef(r.cameraCache,a.camera,l)})),r._invokeAll(function(l){return l.createNodeAttachment&&l.createNodeAttachment(n)}).forEach(function(l){s.push(l)}),this.nodeCache[n]=Promise.all(s).then(function(l){let m;if(a.isBone===!0?m=new fs:l.length>1?m=new Vt:l.length===1?m=l[0]:m=new ia,m!==l[0])for(let h=0,g=l.length;h<g;h++)m.add(l[h]);if(a.name&&(m.userData.name=a.name,m.name=o),Ct(m,a),a.extensions&&Ft(i,m,a),a.matrix!==void 0){const h=new Et;h.fromArray(a.matrix),m.applyMatrix4(h)}else a.translation!==void 0&&m.position.fromArray(a.translation),a.rotation!==void 0&&m.quaternion.fromArray(a.rotation),a.scale!==void 0&&m.scale.fromArray(a.scale);return r.associations.has(m)||r.associations.set(m,{}),r.associations.get(m).nodes=n,m}),this.nodeCache[n]}loadScene(n){const t=this.extensions,i=this.json.scenes[n],r=this,a=new Vt;i.name&&(a.name=r.createUniqueName(i.name)),Ct(a,i),i.extensions&&Ft(t,a,i);const o=i.nodes||[],s=[];for(let f=0,l=o.length;f<l;f++)s.push(r.getDependency("node",o[f]));return Promise.all(s).then(function(f){for(let m=0,h=f.length;m<h;m++)a.add(f[m]);const l=m=>{const h=new Map;for(const[g,v]of r.associations)(g instanceof Vn||g instanceof Pn)&&h.set(g,v);return m.traverse(g=>{const v=r.associations.get(g);v!=null&&h.set(g,v)}),h};return r.associations=l(a),a})}_createAnimationTracks(n,t,i,r,a){const o=[],s=n.name?n.name:n.uuid,f=[];Dt[a.path]===Dt.weights?n.traverse(function(g){g.morphTargetInfluences&&f.push(g.name?g.name:g.uuid)}):f.push(s);let l;switch(Dt[a.path]){case Dt.weights:l=rr;break;case Dt.rotation:l=ci;break;case Dt.position:case Dt.scale:l=si;break;default:switch(i.itemSize){case 1:l=rr;break;case 2:case 3:default:l=si;break}break}const m=r.interpolation!==void 0?Cd[r.interpolation]:aa,h=this._getArrayFromAccessor(i);for(let g=0,v=f.length;g<v;g++){const C=new l(f[g]+"."+Dt[a.path],t.array,h,m);r.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(C),o.push(C)}return o}_getArrayFromAccessor(n){let t=n.array;if(n.normalized){const i=pi(t.constructor),r=new Float32Array(t.length);for(let a=0,o=t.length;a<o;a++)r[a]=t[a]*i;t=r}return t}_createCubicSplineTrackInterpolant(n){n.createInterpolant=function(i){const r=this instanceof ci?bd:ma;return new r(this.times,this.values,this.getValueSize()/3,i)},n.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function Nd(e,n,t){const i=n.attributes,r=new hs;if(i.POSITION!==void 0){const s=t.json.accessors[i.POSITION],f=s.min,l=s.max;if(f!==void 0&&l!==void 0){if(r.set(new we(f[0],f[1],f[2]),new we(l[0],l[1],l[2])),s.normalized){const m=pi(en[s.componentType]);r.min.multiplyScalar(m),r.max.multiplyScalar(m)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;const a=n.targets;if(a!==void 0){const s=new we,f=new we;for(let l=0,m=a.length;l<m;l++){const h=a[l];if(h.POSITION!==void 0){const g=t.json.accessors[h.POSITION],v=g.min,C=g.max;if(v!==void 0&&C!==void 0){if(f.setX(Math.max(Math.abs(v[0]),Math.abs(C[0]))),f.setY(Math.max(Math.abs(v[1]),Math.abs(C[1]))),f.setZ(Math.max(Math.abs(v[2]),Math.abs(C[2]))),g.normalized){const A=pi(en[g.componentType]);f.multiplyScalar(A)}s.max(f)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}r.expandByVector(s)}e.boundingBox=r;const o=new ms;r.getCenter(o.center),o.radius=r.min.distanceTo(r.max)/2,e.boundingSphere=o}function yr(e,n,t){const i=n.attributes,r=[];function a(o,s){return t.getDependency("accessor",o).then(function(f){e.setAttribute(s,f)})}for(const o in i){const s=di[o]||o.toLowerCase();s in e.attributes||r.push(a(i[o],s))}if(n.indices!==void 0&&!e.index){const o=t.getDependency("accessor",n.indices).then(function(s){e.setIndex(s)});r.push(o)}return et.workingColorSpace!==pt&&"COLOR_0"in i&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${et.workingColorSpace}" not supported.`),Ct(e,n),Nd(e,n,t),Promise.all(r).then(function(){return n.targets!==void 0?Pd(e,n.targets,t):e})}const Hd=Object.freeze(Object.defineProperty({__proto__:null,GLTFLoader:td},Symbol.toStringTag,{value:"Module"}));export{Hd as G,cr as P,Bd as S,Fd as W};
/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
