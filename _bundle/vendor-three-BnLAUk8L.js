import{c as Nr,S as Or,N as At,V as ct,C as Ke,F as rr,M as Rt,a as Ge,R as Fr,W as kt,b as tt,L as qt,H as _n,U as yt,D as Mt,B as mt,d as Zt,t as Br,e as Gr,f as vn,p as Hr,w as Bt,g as Vr,E as kr,h as ft,P as ln,A as Wr,i as Tt,j as un,k as Yn,l as Qt,m as Jt,n as ar,o as zr,q as jt,r as Wt,s as xt,O as Xr,u as Yr,v as or,x as Gt,y as pn,z as qr,G as Kr,I as Yt,J as $r,K as Zr,Q as Qr,T as Jr,X as jr,Y as ea,Z as ta,_ as na,$ as ia,a0 as ra,a1 as aa,a2 as oa,a3 as sa,a4 as la,a5 as ca,a6 as fa,a7 as da,a8 as ua,a9 as Tn,aa as Ht,ab as nn,ac as pa,ad as $t,ae as ha,af as ma,ag as _a,ah as va,ai as sr,aj as ga,ak as Ea,al as Sa,am as Ma,an as Be,ao as Ta,ap as xa,aq as Aa,ar as Nt,as as lr,at as cn,au as cr,av as It,aw as St,ax as hn,ay as fr,az as dr,aA as rn,aB as ur,aC as pr,aD as gn,aE as Ra,aF as Ca,aG as ba,aH as hr,aI as wt,aJ as Pa,aK as La,aL as Ua,aM as Da,aN as wa,aO as mr,aP as Ia,aQ as _r,aR as vr,aS as xn,aT as An,aU as Rn,aV as Cn,aW as Ye,aX as ti,aY as ni,aZ as ii,a_ as ri,a$ as ai,b0 as oi,b1 as si,b2 as li,b3 as ci,b4 as fi,b5 as di,b6 as ui,b7 as pi,b8 as hi,b9 as mi,ba as _i,bb as vi,bc as gi,bd as Ei,be as Si,bf as Mi,bg as bn,bh as Ti,bi as xi,bj as ya,bk as Ai,bl as Ri,bm as Ci,bn as Nn,bo as On,bp as Fn,bq as Bn,br as Gn,bs as Hn,bt as Vn,bu as Na,bv as bi,bw as Oa,bx as fn,by as Fa,bz as Pi,bA as Li,bB as Ui,bC as kn,bD as Wn,bE as Ba,bF as gr,bG as Ga,bH as Ha,bI as Va,bJ as Er,bK as Di,bL as Sr,bM as wi,bN as Mr,bO as ka,bP as Wa,bQ as za,bR as Ii,bS as lt,bT as Xa,bU as Ya,bV as qa,bW as Ka,bX as $a,bY as Za,bZ as Qa,b_ as Ja,b$ as ja,c0 as eo,c1 as to,c2 as no,c3 as io,c4 as ro,c5 as ao,c6 as oo,c7 as so,c8 as lo,c9 as co,ca as fo,cb as uo,cc as po,cd as ho}from"./vendor-three-core-BIMA2zFq.js";/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Tr(){let e=null,n=!1,t=null,i=null;function s(a,p){t(a,p),i=e.requestAnimationFrame(s)}return{start:function(){n!==!0&&t!==null&&(i=e.requestAnimationFrame(s),n=!0)},stop:function(){e.cancelAnimationFrame(i),n=!1},setAnimationLoop:function(a){t=a},setContext:function(a){e=a}}}function mo(e){const n=new WeakMap;function t(f,R){const _=f.array,b=f.usage,T=_.byteLength,E=e.createBuffer();e.bindBuffer(R,E),e.bufferData(R,_,b),f.onUploadCallback();let m;if(_ instanceof Float32Array)m=e.FLOAT;else if(_ instanceof Uint16Array)f.isFloat16BufferAttribute?m=e.HALF_FLOAT:m=e.UNSIGNED_SHORT;else if(_ instanceof Int16Array)m=e.SHORT;else if(_ instanceof Uint32Array)m=e.UNSIGNED_INT;else if(_ instanceof Int32Array)m=e.INT;else if(_ instanceof Int8Array)m=e.BYTE;else if(_ instanceof Uint8Array)m=e.UNSIGNED_BYTE;else if(_ instanceof Uint8ClampedArray)m=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+_);return{buffer:E,type:m,bytesPerElement:_.BYTES_PER_ELEMENT,version:f.version,size:T}}function i(f,R,_){const b=R.array,T=R.updateRanges;if(e.bindBuffer(_,f),T.length===0)e.bufferSubData(_,0,b);else{T.sort((m,N)=>m.start-N.start);let E=0;for(let m=1;m<T.length;m++){const N=T[E],P=T[m];P.start<=N.start+N.count+1?N.count=Math.max(N.count,P.start+P.count-N.start):(++E,T[E]=P)}T.length=E+1;for(let m=0,N=T.length;m<N;m++){const P=T[m];e.bufferSubData(_,P.start*b.BYTES_PER_ELEMENT,b,P.start,P.count)}R.clearUpdateRanges()}R.onUploadCallback()}function s(f){return f.isInterleavedBufferAttribute&&(f=f.data),n.get(f)}function a(f){f.isInterleavedBufferAttribute&&(f=f.data);const R=n.get(f);R&&(e.deleteBuffer(R.buffer),n.delete(f))}function p(f,R){if(f.isInterleavedBufferAttribute&&(f=f.data),f.isGLBufferAttribute){const b=n.get(f);(!b||b.version<f.version)&&n.set(f,{buffer:f.buffer,type:f.type,bytesPerElement:f.elementSize,version:f.version});return}const _=n.get(f);if(_===void 0)n.set(f,t(f,R));else if(_.version<f.version){if(_.size!==f.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(_.buffer,f,R),_.version=f.version}}return{get:s,remove:a,update:p}}var _o=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,vo=`#ifdef USE_ALPHAHASH
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
#endif`,go=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Eo=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,So=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Mo=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,To=`#ifdef USE_AOMAP
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
#endif`,xo=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Ao=`#ifdef USE_BATCHING
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
#endif`,Ro=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Co=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,bo=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Po=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Lo=`#ifdef USE_IRIDESCENCE
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
#endif`,Uo=`#ifdef USE_BUMPMAP
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
#endif`,Do=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,wo=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Io=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,yo=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,No=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Oo=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Fo=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Bo=`#if defined( USE_COLOR_ALPHA )
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
#endif`,Go=`#define PI 3.141592653589793
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
} // validated`,Ho=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Vo=`vec3 transformedNormal = objectNormal;
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
#endif`,ko=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Wo=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,zo=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Xo=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Yo="gl_FragColor = linearToOutputTexel( gl_FragColor );",qo=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Ko=`#ifdef USE_ENVMAP
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
#endif`,$o=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Zo=`#ifdef USE_ENVMAP
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
#endif`,Qo=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Jo=`#ifdef USE_ENVMAP
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
#endif`,jo=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,es=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,ts=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,ns=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,is=`#ifdef USE_GRADIENTMAP
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
}`,rs=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,as=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,os=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,ss=`uniform bool receiveShadow;
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
#endif`,ls=`#ifdef USE_ENVMAP
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
#endif`,cs=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,fs=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,ds=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,us=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,ps=`PhysicalMaterial material;
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
#endif`,hs=`struct PhysicalMaterial {
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
}`,ms=`
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
#endif`,_s=`#if defined( RE_IndirectDiffuse )
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
#endif`,vs=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,gs=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Es=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ss=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ms=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Ts=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,xs=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,As=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Rs=`#if defined( USE_POINTS_UV )
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
#endif`,Cs=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,bs=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Ps=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Ls=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Us=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ds=`#ifdef USE_MORPHTARGETS
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
#endif`,ws=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Is=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,ys=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Ns=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Os=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Fs=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Bs=`#ifdef USE_NORMALMAP
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
#endif`,Gs=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Hs=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Vs=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,ks=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Ws=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,zs=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,Xs=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Ys=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,qs=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Ks=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,$s=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Zs=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Qs=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Js=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,js=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,el=`float getShadowMask() {
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
}`,tl=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,nl=`#ifdef USE_SKINNING
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
#endif`,il=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,rl=`#ifdef USE_SKINNING
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
#endif`,al=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,ol=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,sl=`#if defined( TONE_MAPPING )
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,cl=`#ifdef USE_TRANSMISSION
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
#endif`,fl=`#ifdef USE_TRANSMISSION
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
#endif`,ul=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,pl=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,hl=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const ml=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,_l=`uniform sampler2D t2D;
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
}`,gl=`#ifdef ENVMAP_TYPE_CUBE
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
}`,El=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Sl=`uniform samplerCube tCube;
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
}`,Tl=`#if DEPTH_PACKING == 3200
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
}`,xl=`#define DISTANCE
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
}`,Al=`#define DISTANCE
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
}`,Rl=`varying vec3 vWorldDirection;
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
}`,bl=`uniform float scale;
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
}`,Ll=`#include <common>
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
}`,Ul=`uniform vec3 diffuse;
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
}`,Dl=`#define LAMBERT
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
}`,wl=`#define LAMBERT
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
}`,yl=`#define MATCAP
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
}`,Nl=`#define NORMAL
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
}`,Ol=`#define NORMAL
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
}`,Fl=`#define PHONG
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
}`,Bl=`#define PHONG
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
}`,Hl=`#define STANDARD
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
}`,Vl=`#define TOON
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
}`,kl=`#define TOON
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
}`,Wl=`uniform float size;
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
}`,zl=`uniform vec3 diffuse;
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
}`,Xl=`#include <common>
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
}`,Yl=`uniform vec3 color;
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
}`,ql=`uniform float rotation;
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
}`,Kl=`uniform vec3 diffuse;
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
}`,Pe={alphahash_fragment:_o,alphahash_pars_fragment:vo,alphamap_fragment:go,alphamap_pars_fragment:Eo,alphatest_fragment:So,alphatest_pars_fragment:Mo,aomap_fragment:To,aomap_pars_fragment:xo,batching_pars_vertex:Ao,batching_vertex:Ro,begin_vertex:Co,beginnormal_vertex:bo,bsdfs:Po,iridescence_fragment:Lo,bumpmap_pars_fragment:Uo,clipping_planes_fragment:Do,clipping_planes_pars_fragment:wo,clipping_planes_pars_vertex:Io,clipping_planes_vertex:yo,color_fragment:No,color_pars_fragment:Oo,color_pars_vertex:Fo,color_vertex:Bo,common:Go,cube_uv_reflection_fragment:Ho,defaultnormal_vertex:Vo,displacementmap_pars_vertex:ko,displacementmap_vertex:Wo,emissivemap_fragment:zo,emissivemap_pars_fragment:Xo,colorspace_fragment:Yo,colorspace_pars_fragment:qo,envmap_fragment:Ko,envmap_common_pars_fragment:$o,envmap_pars_fragment:Zo,envmap_pars_vertex:Qo,envmap_physical_pars_fragment:ls,envmap_vertex:Jo,fog_vertex:jo,fog_pars_vertex:es,fog_fragment:ts,fog_pars_fragment:ns,gradientmap_pars_fragment:is,lightmap_pars_fragment:rs,lights_lambert_fragment:as,lights_lambert_pars_fragment:os,lights_pars_begin:ss,lights_toon_fragment:cs,lights_toon_pars_fragment:fs,lights_phong_fragment:ds,lights_phong_pars_fragment:us,lights_physical_fragment:ps,lights_physical_pars_fragment:hs,lights_fragment_begin:ms,lights_fragment_maps:_s,lights_fragment_end:vs,logdepthbuf_fragment:gs,logdepthbuf_pars_fragment:Es,logdepthbuf_pars_vertex:Ss,logdepthbuf_vertex:Ms,map_fragment:Ts,map_pars_fragment:xs,map_particle_fragment:As,map_particle_pars_fragment:Rs,metalnessmap_fragment:Cs,metalnessmap_pars_fragment:bs,morphinstance_vertex:Ps,morphcolor_vertex:Ls,morphnormal_vertex:Us,morphtarget_pars_vertex:Ds,morphtarget_vertex:ws,normal_fragment_begin:Is,normal_fragment_maps:ys,normal_pars_fragment:Ns,normal_pars_vertex:Os,normal_vertex:Fs,normalmap_pars_fragment:Bs,clearcoat_normal_fragment_begin:Gs,clearcoat_normal_fragment_maps:Hs,clearcoat_pars_fragment:Vs,iridescence_pars_fragment:ks,opaque_fragment:Ws,packing:zs,premultiplied_alpha_fragment:Xs,project_vertex:Ys,dithering_fragment:qs,dithering_pars_fragment:Ks,roughnessmap_fragment:$s,roughnessmap_pars_fragment:Zs,shadowmap_pars_fragment:Qs,shadowmap_pars_vertex:Js,shadowmap_vertex:js,shadowmask_pars_fragment:el,skinbase_vertex:tl,skinning_pars_vertex:nl,skinning_vertex:il,skinnormal_vertex:rl,specularmap_fragment:al,specularmap_pars_fragment:ol,tonemapping_fragment:sl,tonemapping_pars_fragment:ll,transmission_fragment:cl,transmission_pars_fragment:fl,uv_pars_fragment:dl,uv_pars_vertex:ul,uv_vertex:pl,worldpos_vertex:hl,background_vert:ml,background_frag:_l,backgroundCube_vert:vl,backgroundCube_frag:gl,cube_vert:El,cube_frag:Sl,depth_vert:Ml,depth_frag:Tl,distanceRGBA_vert:xl,distanceRGBA_frag:Al,equirect_vert:Rl,equirect_frag:Cl,linedashed_vert:bl,linedashed_frag:Pl,meshbasic_vert:Ll,meshbasic_frag:Ul,meshlambert_vert:Dl,meshlambert_frag:wl,meshmatcap_vert:Il,meshmatcap_frag:yl,meshnormal_vert:Nl,meshnormal_frag:Ol,meshphong_vert:Fl,meshphong_frag:Bl,meshphysical_vert:Gl,meshphysical_frag:Hl,meshtoon_vert:Vl,meshtoon_frag:kl,points_vert:Wl,points_frag:zl,shadow_vert:Xl,shadow_frag:Yl,sprite_vert:ql,sprite_frag:Kl},ee={common:{diffuse:{value:new Ke(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Be}},envmap:{envMap:{value:null},envMapRotation:{value:new Be},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Be}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Be}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Be},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Be},normalScale:{value:new ft(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Be},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Be}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Be}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Be}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ke(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ke(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0},uvTransform:{value:new Be}},sprite:{diffuse:{value:new Ke(16777215)},opacity:{value:1},center:{value:new ft(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}}},gt={basic:{uniforms:lt([ee.common,ee.specularmap,ee.envmap,ee.aomap,ee.lightmap,ee.fog]),vertexShader:Pe.meshbasic_vert,fragmentShader:Pe.meshbasic_frag},lambert:{uniforms:lt([ee.common,ee.specularmap,ee.envmap,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.fog,ee.lights,{emissive:{value:new Ke(0)}}]),vertexShader:Pe.meshlambert_vert,fragmentShader:Pe.meshlambert_frag},phong:{uniforms:lt([ee.common,ee.specularmap,ee.envmap,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.fog,ee.lights,{emissive:{value:new Ke(0)},specular:{value:new Ke(1118481)},shininess:{value:30}}]),vertexShader:Pe.meshphong_vert,fragmentShader:Pe.meshphong_frag},standard:{uniforms:lt([ee.common,ee.envmap,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.roughnessmap,ee.metalnessmap,ee.fog,ee.lights,{emissive:{value:new Ke(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Pe.meshphysical_vert,fragmentShader:Pe.meshphysical_frag},toon:{uniforms:lt([ee.common,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.gradientmap,ee.fog,ee.lights,{emissive:{value:new Ke(0)}}]),vertexShader:Pe.meshtoon_vert,fragmentShader:Pe.meshtoon_frag},matcap:{uniforms:lt([ee.common,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.fog,{matcap:{value:null}}]),vertexShader:Pe.meshmatcap_vert,fragmentShader:Pe.meshmatcap_frag},points:{uniforms:lt([ee.points,ee.fog]),vertexShader:Pe.points_vert,fragmentShader:Pe.points_frag},dashed:{uniforms:lt([ee.common,ee.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Pe.linedashed_vert,fragmentShader:Pe.linedashed_frag},depth:{uniforms:lt([ee.common,ee.displacementmap]),vertexShader:Pe.depth_vert,fragmentShader:Pe.depth_frag},normal:{uniforms:lt([ee.common,ee.bumpmap,ee.normalmap,ee.displacementmap,{opacity:{value:1}}]),vertexShader:Pe.meshnormal_vert,fragmentShader:Pe.meshnormal_frag},sprite:{uniforms:lt([ee.sprite,ee.fog]),vertexShader:Pe.sprite_vert,fragmentShader:Pe.sprite_frag},background:{uniforms:{uvTransform:{value:new Be},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Pe.background_vert,fragmentShader:Pe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Be}},vertexShader:Pe.backgroundCube_vert,fragmentShader:Pe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Pe.cube_vert,fragmentShader:Pe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Pe.equirect_vert,fragmentShader:Pe.equirect_frag},distanceRGBA:{uniforms:lt([ee.common,ee.displacementmap,{referencePosition:{value:new Ge},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Pe.distanceRGBA_vert,fragmentShader:Pe.distanceRGBA_frag},shadow:{uniforms:lt([ee.lights,ee.fog,{color:{value:new Ke(0)},opacity:{value:1}}]),vertexShader:Pe.shadow_vert,fragmentShader:Pe.shadow_frag}};gt.physical={uniforms:lt([gt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Be},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Be},clearcoatNormalScale:{value:new ft(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Be},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Be},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Be},sheen:{value:0},sheenColor:{value:new Ke(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Be},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Be},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Be},transmissionSamplerSize:{value:new ft},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Be},attenuationDistance:{value:0},attenuationColor:{value:new Ke(0)},specularColor:{value:new Ke(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Be},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Be},anisotropyVector:{value:new ft},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Be}}]),vertexShader:Pe.meshphysical_vert,fragmentShader:Pe.meshphysical_frag};const an={r:0,b:0,g:0},Pt=new Sr,$l=new Rt;function Zl(e,n,t,i,s,a,p){const f=new Ke(0);let R=a===!0?0:1,_,b,T=null,E=0,m=null;function N(x){let g=x.isScene===!0?x.background:null;return g&&g.isTexture&&(g=(x.backgroundBlurriness>0?t:n).get(g)),g}function P(x){let g=!1;const H=N(x);H===null?r(f,R):H&&H.isColor&&(r(H,1),g=!0);const U=e.xr.getEnvironmentBlendMode();U==="additive"?i.buffers.color.setClear(0,0,0,1,p):U==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,p),(e.autoClear||g)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function c(x,g){const H=N(g);H&&(H.isCubeTexture||H.mapping===gn)?(b===void 0&&(b=new xt(new or(1,1,1),new Nt({name:"BackgroundCubeMaterial",uniforms:Di(gt.backgroundCube.uniforms),vertexShader:gt.backgroundCube.vertexShader,fragmentShader:gt.backgroundCube.fragmentShader,side:mt,depthTest:!1,depthWrite:!1,fog:!1})),b.geometry.deleteAttribute("normal"),b.geometry.deleteAttribute("uv"),b.onBeforeRender=function(U,y,B){this.matrixWorld.copyPosition(B.matrixWorld)},Object.defineProperty(b.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(b)),Pt.copy(g.backgroundRotation),Pt.x*=-1,Pt.y*=-1,Pt.z*=-1,H.isCubeTexture&&H.isRenderTargetTexture===!1&&(Pt.y*=-1,Pt.z*=-1),b.material.uniforms.envMap.value=H,b.material.uniforms.flipEnvMap.value=H.isCubeTexture&&H.isRenderTargetTexture===!1?-1:1,b.material.uniforms.backgroundBlurriness.value=g.backgroundBlurriness,b.material.uniforms.backgroundIntensity.value=g.backgroundIntensity,b.material.uniforms.backgroundRotation.value.setFromMatrix4($l.makeRotationFromEuler(Pt)),b.material.toneMapped=tt.getTransfer(H.colorSpace)!==Ye,(T!==H||E!==H.version||m!==e.toneMapping)&&(b.material.needsUpdate=!0,T=H,E=H.version,m=e.toneMapping),b.layers.enableAll(),x.unshift(b,b.geometry,b.material,0,0,null)):H&&H.isTexture&&(_===void 0&&(_=new xt(new pr(2,2),new Nt({name:"BackgroundMaterial",uniforms:Di(gt.background.uniforms),vertexShader:gt.background.vertexShader,fragmentShader:gt.background.fragmentShader,side:Zt,depthTest:!1,depthWrite:!1,fog:!1})),_.geometry.deleteAttribute("normal"),Object.defineProperty(_.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(_)),_.material.uniforms.t2D.value=H,_.material.uniforms.backgroundIntensity.value=g.backgroundIntensity,_.material.toneMapped=tt.getTransfer(H.colorSpace)!==Ye,H.matrixAutoUpdate===!0&&H.updateMatrix(),_.material.uniforms.uvTransform.value.copy(H.matrix),(T!==H||E!==H.version||m!==e.toneMapping)&&(_.material.needsUpdate=!0,T=H,E=H.version,m=e.toneMapping),_.layers.enableAll(),x.unshift(_,_.geometry,_.material,0,0,null))}function r(x,g){x.getRGB(an,Er(e)),i.buffers.color.setClear(an.r,an.g,an.b,g,p)}function D(){b!==void 0&&(b.geometry.dispose(),b.material.dispose()),_!==void 0&&(_.geometry.dispose(),_.material.dispose())}return{getClearColor:function(){return f},setClearColor:function(x,g=1){f.set(x),R=g,r(f,R)},getClearAlpha:function(){return R},setClearAlpha:function(x){R=x,r(f,R)},render:P,addToRenderList:c,dispose:D}}function Ql(e,n){const t=e.getParameter(e.MAX_VERTEX_ATTRIBS),i={},s=E(null);let a=s,p=!1;function f(d,C,q,V,Y){let Q=!1;const W=T(V,q,C);a!==W&&(a=W,_(a.object)),Q=m(d,V,q,Y),Q&&N(d,V,q,Y),Y!==null&&n.update(Y,e.ELEMENT_ARRAY_BUFFER),(Q||p)&&(p=!1,g(d,C,q,V),Y!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,n.get(Y).buffer))}function R(){return e.createVertexArray()}function _(d){return e.bindVertexArray(d)}function b(d){return e.deleteVertexArray(d)}function T(d,C,q){const V=q.wireframe===!0;let Y=i[d.id];Y===void 0&&(Y={},i[d.id]=Y);let Q=Y[C.id];Q===void 0&&(Q={},Y[C.id]=Q);let W=Q[V];return W===void 0&&(W=E(R()),Q[V]=W),W}function E(d){const C=[],q=[],V=[];for(let Y=0;Y<t;Y++)C[Y]=0,q[Y]=0,V[Y]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:C,enabledAttributes:q,attributeDivisors:V,object:d,attributes:{},index:null}}function m(d,C,q,V){const Y=a.attributes,Q=C.attributes;let W=0;const j=q.getAttributes();for(const F in j)if(j[F].location>=0){const Se=Y[F];let Le=Q[F];if(Le===void 0&&(F==="instanceMatrix"&&d.instanceMatrix&&(Le=d.instanceMatrix),F==="instanceColor"&&d.instanceColor&&(Le=d.instanceColor)),Se===void 0||Se.attribute!==Le||Le&&Se.data!==Le.data)return!0;W++}return a.attributesNum!==W||a.index!==V}function N(d,C,q,V){const Y={},Q=C.attributes;let W=0;const j=q.getAttributes();for(const F in j)if(j[F].location>=0){let Se=Q[F];Se===void 0&&(F==="instanceMatrix"&&d.instanceMatrix&&(Se=d.instanceMatrix),F==="instanceColor"&&d.instanceColor&&(Se=d.instanceColor));const Le={};Le.attribute=Se,Se&&Se.data&&(Le.data=Se.data),Y[F]=Le,W++}a.attributes=Y,a.attributesNum=W,a.index=V}function P(){const d=a.newAttributes;for(let C=0,q=d.length;C<q;C++)d[C]=0}function c(d){r(d,0)}function r(d,C){const q=a.newAttributes,V=a.enabledAttributes,Y=a.attributeDivisors;q[d]=1,V[d]===0&&(e.enableVertexAttribArray(d),V[d]=1),Y[d]!==C&&(e.vertexAttribDivisor(d,C),Y[d]=C)}function D(){const d=a.newAttributes,C=a.enabledAttributes;for(let q=0,V=C.length;q<V;q++)C[q]!==d[q]&&(e.disableVertexAttribArray(q),C[q]=0)}function x(d,C,q,V,Y,Q,W){W===!0?e.vertexAttribIPointer(d,C,q,Y,Q):e.vertexAttribPointer(d,C,q,V,Y,Q)}function g(d,C,q,V){P();const Y=V.attributes,Q=q.getAttributes(),W=C.defaultAttributeValues;for(const j in Q){const F=Q[j];if(F.location>=0){let he=Y[j];if(he===void 0&&(j==="instanceMatrix"&&d.instanceMatrix&&(he=d.instanceMatrix),j==="instanceColor"&&d.instanceColor&&(he=d.instanceColor)),he!==void 0){const Se=he.normalized,Le=he.itemSize,He=n.get(he);if(He===void 0)continue;const Ze=He.buffer,k=He.type,J=He.bytesPerElement,ue=k===e.INT||k===e.UNSIGNED_INT||he.gpuType===hr;if(he.isInterleavedBufferAttribute){const ie=he.data,Me=ie.stride,Re=he.offset;if(ie.isInstancedInterleavedBuffer){for(let Ue=0;Ue<F.locationSize;Ue++)r(F.location+Ue,ie.meshPerAttribute);d.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=ie.meshPerAttribute*ie.count)}else for(let Ue=0;Ue<F.locationSize;Ue++)c(F.location+Ue);e.bindBuffer(e.ARRAY_BUFFER,Ze);for(let Ue=0;Ue<F.locationSize;Ue++)x(F.location+Ue,Le/F.locationSize,k,Se,Me*J,(Re+Le/F.locationSize*Ue)*J,ue)}else{if(he.isInstancedBufferAttribute){for(let ie=0;ie<F.locationSize;ie++)r(F.location+ie,he.meshPerAttribute);d.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let ie=0;ie<F.locationSize;ie++)c(F.location+ie);e.bindBuffer(e.ARRAY_BUFFER,Ze);for(let ie=0;ie<F.locationSize;ie++)x(F.location+ie,Le/F.locationSize,k,Se,Le*J,Le/F.locationSize*ie*J,ue)}}else if(W!==void 0){const Se=W[j];if(Se!==void 0)switch(Se.length){case 2:e.vertexAttrib2fv(F.location,Se);break;case 3:e.vertexAttrib3fv(F.location,Se);break;case 4:e.vertexAttrib4fv(F.location,Se);break;default:e.vertexAttrib1fv(F.location,Se)}}}}D()}function H(){B();for(const d in i){const C=i[d];for(const q in C){const V=C[q];for(const Y in V)b(V[Y].object),delete V[Y];delete C[q]}delete i[d]}}function U(d){if(i[d.id]===void 0)return;const C=i[d.id];for(const q in C){const V=C[q];for(const Y in V)b(V[Y].object),delete V[Y];delete C[q]}delete i[d.id]}function y(d){for(const C in i){const q=i[C];if(q[d.id]===void 0)continue;const V=q[d.id];for(const Y in V)b(V[Y].object),delete V[Y];delete q[d.id]}}function B(){h(),p=!0,a!==s&&(a=s,_(a.object))}function h(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:f,reset:B,resetDefaultState:h,dispose:H,releaseStatesOfGeometry:U,releaseStatesOfProgram:y,initAttributes:P,enableAttribute:c,disableUnusedAttributes:D}}function Jl(e,n,t){let i;function s(_){i=_}function a(_,b){e.drawArrays(i,_,b),t.update(b,i,1)}function p(_,b,T){T!==0&&(e.drawArraysInstanced(i,_,b,T),t.update(b,i,T))}function f(_,b,T){if(T===0)return;n.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,_,0,b,0,T);let m=0;for(let N=0;N<T;N++)m+=b[N];t.update(m,i,1)}function R(_,b,T,E){if(T===0)return;const m=n.get("WEBGL_multi_draw");if(m===null)for(let N=0;N<_.length;N++)p(_[N],b[N],E[N]);else{m.multiDrawArraysInstancedWEBGL(i,_,0,b,0,E,0,T);let N=0;for(let P=0;P<T;P++)N+=b[P]*E[P];t.update(N,i,1)}}this.setMode=s,this.render=a,this.renderInstances=p,this.renderMultiDraw=f,this.renderMultiDrawInstances=R}function jl(e,n,t,i){let s;function a(){if(s!==void 0)return s;if(n.has("EXT_texture_filter_anisotropic")===!0){const y=n.get("EXT_texture_filter_anisotropic");s=e.getParameter(y.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function p(y){return!(y!==Tt&&i.convert(y)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function f(y){const B=y===_n&&(n.has("EXT_color_buffer_half_float")||n.has("EXT_color_buffer_float"));return!(y!==yt&&i.convert(y)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&y!==wt&&!B)}function R(y){if(y==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";y="mediump"}return y==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let _=t.precision!==void 0?t.precision:"highp";const b=R(_);b!==_&&(console.warn("THREE.WebGLRenderer:",_,"not supported, using",b,"instead."),_=b);const T=t.logarithmicDepthBuffer===!0,E=t.reverseDepthBuffer===!0&&n.has("EXT_clip_control"),m=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),N=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),P=e.getParameter(e.MAX_TEXTURE_SIZE),c=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),r=e.getParameter(e.MAX_VERTEX_ATTRIBS),D=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),x=e.getParameter(e.MAX_VARYING_VECTORS),g=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),H=N>0,U=e.getParameter(e.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:R,textureFormatReadable:p,textureTypeReadable:f,precision:_,logarithmicDepthBuffer:T,reverseDepthBuffer:E,maxTextures:m,maxVertexTextures:N,maxTextureSize:P,maxCubemapSize:c,maxAttributes:r,maxVertexUniforms:D,maxVaryings:x,maxFragmentUniforms:g,vertexTextures:H,maxSamples:U}}function ec(e){const n=this;let t=null,i=0,s=!1,a=!1;const p=new Ma,f=new Be,R={value:null,needsUpdate:!1};this.uniform=R,this.numPlanes=0,this.numIntersection=0,this.init=function(T,E){const m=T.length!==0||E||i!==0||s;return s=E,i=T.length,m},this.beginShadows=function(){a=!0,b(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(T,E){t=b(T,E,0)},this.setState=function(T,E,m){const N=T.clippingPlanes,P=T.clipIntersection,c=T.clipShadows,r=e.get(T);if(!s||N===null||N.length===0||a&&!c)a?b(null):_();else{const D=a?0:i,x=D*4;let g=r.clippingState||null;R.value=g,g=b(N,E,x,m);for(let H=0;H!==x;++H)g[H]=t[H];r.clippingState=g,this.numIntersection=P?this.numPlanes:0,this.numPlanes+=D}};function _(){R.value!==t&&(R.value=t,R.needsUpdate=i>0),n.numPlanes=i,n.numIntersection=0}function b(T,E,m,N){const P=T!==null?T.length:0;let c=null;if(P!==0){if(c=R.value,N!==!0||c===null){const r=m+P*4,D=E.matrixWorldInverse;f.getNormalMatrix(D),(c===null||c.length<r)&&(c=new Float32Array(r));for(let x=0,g=m;x!==P;++x,g+=4)p.copy(T[x]).applyMatrix4(D,f),p.normal.toArray(c,g),c[g+3]=p.constant}R.value=c,R.needsUpdate=!0}return n.numPlanes=P,n.numIntersection=0,c}}function tc(e){let n=new WeakMap;function t(p,f){return f===kn?p.mapping=jt:f===Wn&&(p.mapping=Wt),p}function i(p){if(p&&p.isTexture){const f=p.mapping;if(f===kn||f===Wn)if(n.has(p)){const R=n.get(p).texture;return t(R,p.mapping)}else{const R=p.image;if(R&&R.height>0){const _=new Ba(R.height);return _.fromEquirectangularTexture(e,p),n.set(p,_),p.addEventListener("dispose",s),t(_.texture,p.mapping)}else return null}}return p}function s(p){const f=p.target;f.removeEventListener("dispose",s);const R=n.get(f);R!==void 0&&(n.delete(f),R.dispose())}function a(){n=new WeakMap}return{get:i,dispose:a}}const Vt=4,yi=[.125,.215,.35,.446,.526,.582],Dt=20,Pn=new Xr,Ni=new Ke;let Ln=null,Un=0,Dn=0,wn=!1;const Ut=(1+Math.sqrt(5))/2,Ft=1/Ut,Oi=[new Ge(-Ut,Ft,0),new Ge(Ut,Ft,0),new Ge(-Ft,0,Ut),new Ge(Ft,0,Ut),new Ge(0,Ut,-Ft),new Ge(0,Ut,Ft),new Ge(-1,1,-1),new Ge(1,1,-1),new Ge(-1,1,1),new Ge(1,1,1)];class Fi{constructor(n){this._renderer=n,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(n,t=0,i=.1,s=100){Ln=this._renderer.getRenderTarget(),Un=this._renderer.getActiveCubeFace(),Dn=this._renderer.getActiveMipmapLevel(),wn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const a=this._allocateTargets();return a.depthBuffer=!0,this._sceneToCubeUV(n,i,s,a),t>0&&this._blur(a,0,0,t),this._applyPMREM(a),this._cleanup(a),a}fromEquirectangular(n,t=null){return this._fromTexture(n,t)}fromCubemap(n,t=null){return this._fromTexture(n,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Hi(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Gi(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(n){this._lodMax=Math.floor(Math.log2(n)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let n=0;n<this._lodPlanes.length;n++)this._lodPlanes[n].dispose()}_cleanup(n){this._renderer.setRenderTarget(Ln,Un,Dn),this._renderer.xr.enabled=wn,n.scissorTest=!1,on(n,0,0,n.width,n.height)}_fromTexture(n,t){n.mapping===jt||n.mapping===Wt?this._setSize(n.image.length===0?16:n.image[0].width||n.image[0].image.width):this._setSize(n.image.width/4),Ln=this._renderer.getRenderTarget(),Un=this._renderer.getActiveCubeFace(),Dn=this._renderer.getActiveMipmapLevel(),wn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(n,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const n=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Ht,minFilter:Ht,generateMipmaps:!1,type:_n,format:Tt,colorSpace:vn,depthBuffer:!1},s=Bi(n,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==n||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Bi(n,t,i);const{_lodMax:a}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=nc(a)),this._blurMaterial=ic(a,n,t)}return s}_compileMaterial(n){const t=new xt(this._lodPlanes[0],n);this._renderer.compile(t,Pn)}_sceneToCubeUV(n,t,i,s){const f=new ln(90,1,t,i),R=[1,-1,1,1,1,1],_=[1,1,1,-1,-1,-1],b=this._renderer,T=b.autoClear,E=b.toneMapping;b.getClearColor(Ni),b.toneMapping=At,b.autoClear=!1;const m=new Yr({name:"PMREM.Background",side:mt,depthWrite:!1,depthTest:!1}),N=new xt(new or,m);let P=!1;const c=n.background;c?c.isColor&&(m.color.copy(c),n.background=null,P=!0):(m.color.copy(Ni),P=!0);for(let r=0;r<6;r++){const D=r%3;D===0?(f.up.set(0,R[r],0),f.lookAt(_[r],0,0)):D===1?(f.up.set(0,0,R[r]),f.lookAt(0,_[r],0)):(f.up.set(0,R[r],0),f.lookAt(0,0,_[r]));const x=this._cubeSize;on(s,D*x,r>2?x:0,x,x),b.setRenderTarget(s),P&&b.render(N,f),b.render(n,f)}N.geometry.dispose(),N.material.dispose(),b.toneMapping=E,b.autoClear=T,n.background=c}_textureToCubeUV(n,t){const i=this._renderer,s=n.mapping===jt||n.mapping===Wt;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Hi()),this._cubemapMaterial.uniforms.flipEnvMap.value=n.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Gi());const a=s?this._cubemapMaterial:this._equirectMaterial,p=new xt(this._lodPlanes[0],a),f=a.uniforms;f.envMap.value=n;const R=this._cubeSize;on(t,0,0,3*R,2*R),i.setRenderTarget(t),i.render(p,Pn)}_applyPMREM(n){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const s=this._lodPlanes.length;for(let a=1;a<s;a++){const p=Math.sqrt(this._sigmas[a]*this._sigmas[a]-this._sigmas[a-1]*this._sigmas[a-1]),f=Oi[(s-a-1)%Oi.length];this._blur(n,a-1,a,p,f)}t.autoClear=i}_blur(n,t,i,s,a){const p=this._pingPongRenderTarget;this._halfBlur(n,p,t,i,s,"latitudinal",a),this._halfBlur(p,n,i,i,s,"longitudinal",a)}_halfBlur(n,t,i,s,a,p,f){const R=this._renderer,_=this._blurMaterial;p!=="latitudinal"&&p!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const b=3,T=new xt(this._lodPlanes[s],_),E=_.uniforms,m=this._sizeLods[i]-1,N=isFinite(a)?Math.PI/(2*m):2*Math.PI/(2*Dt-1),P=a/N,c=isFinite(a)?1+Math.floor(b*P):Dt;c>Dt&&console.warn(`sigmaRadians, ${a}, is too large and will clip, as it requested ${c} samples when the maximum is set to ${Dt}`);const r=[];let D=0;for(let y=0;y<Dt;++y){const B=y/P,h=Math.exp(-B*B/2);r.push(h),y===0?D+=h:y<c&&(D+=2*h)}for(let y=0;y<r.length;y++)r[y]=r[y]/D;E.envMap.value=n.texture,E.samples.value=c,E.weights.value=r,E.latitudinal.value=p==="latitudinal",f&&(E.poleAxis.value=f);const{_lodMax:x}=this;E.dTheta.value=N,E.mipInt.value=x-i;const g=this._sizeLods[s],H=3*g*(s>x-Vt?s-x+Vt:0),U=4*(this._cubeSize-g);on(t,H,U,3*g,2*g),R.setRenderTarget(t),R.render(T,Pn)}}function nc(e){const n=[],t=[],i=[];let s=e;const a=e-Vt+1+yi.length;for(let p=0;p<a;p++){const f=Math.pow(2,s);t.push(f);let R=1/f;p>e-Vt?R=yi[p-e+Vt-1]:p===0&&(R=0),i.push(R);const _=1/(f-2),b=-_,T=1+_,E=[b,b,T,b,T,T,b,b,T,T,b,T],m=6,N=6,P=3,c=2,r=1,D=new Float32Array(P*N*m),x=new Float32Array(c*N*m),g=new Float32Array(r*N*m);for(let U=0;U<m;U++){const y=U%3*2/3-1,B=U>2?0:-1,h=[y,B,0,y+2/3,B,0,y+2/3,B+1,0,y,B,0,y+2/3,B+1,0,y,B+1,0];D.set(h,P*N*U),x.set(E,c*N*U);const d=[U,U,U,U,U,U];g.set(d,r*N*U)}const H=new lr;H.setAttribute("position",new cn(D,P)),H.setAttribute("uv",new cn(x,c)),H.setAttribute("faceIndex",new cn(g,r)),n.push(H),s>Vt&&s--}return{lodPlanes:n,sizeLods:t,sigmas:i}}function Bi(e,n,t){const i=new kt(e,n,t);return i.texture.mapping=gn,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function on(e,n,t,i,s){e.viewport.set(n,t,i,s),e.scissor.set(n,t,i,s)}function ic(e,n,t){const i=new Float32Array(Dt),s=new Ge(0,1,0);return new Nt({name:"SphericalGaussianBlur",defines:{n:Dt,CUBEUV_TEXEL_WIDTH:1/n,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:qn(),fragmentShader:`

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
		`,blending:It,depthTest:!1,depthWrite:!1})}function Gi(){return new Nt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:qn(),fragmentShader:`

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
		`,blending:It,depthTest:!1,depthWrite:!1})}function Hi(){return new Nt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:qn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:It,depthTest:!1,depthWrite:!1})}function qn(){return`

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
	`}function rc(e){let n=new WeakMap,t=null;function i(f){if(f&&f.isTexture){const R=f.mapping,_=R===kn||R===Wn,b=R===jt||R===Wt;if(_||b){let T=n.get(f);const E=T!==void 0?T.texture.pmremVersion:0;if(f.isRenderTargetTexture&&f.pmremVersion!==E)return t===null&&(t=new Fi(e)),T=_?t.fromEquirectangular(f,T):t.fromCubemap(f,T),T.texture.pmremVersion=f.pmremVersion,n.set(f,T),T.texture;if(T!==void 0)return T.texture;{const m=f.image;return _&&m&&m.height>0||b&&m&&s(m)?(t===null&&(t=new Fi(e)),T=_?t.fromEquirectangular(f):t.fromCubemap(f),T.texture.pmremVersion=f.pmremVersion,n.set(f,T),f.addEventListener("dispose",a),T.texture):null}}}return f}function s(f){let R=0;const _=6;for(let b=0;b<_;b++)f[b]!==void 0&&R++;return R===_}function a(f){const R=f.target;R.removeEventListener("dispose",a);const _=n.get(R);_!==void 0&&(n.delete(R),_.dispose())}function p(){n=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:p}}function ac(e){const n={};function t(i){if(n[i]!==void 0)return n[i];let s;switch(i){case"WEBGL_depth_texture":s=e.getExtension("WEBGL_depth_texture")||e.getExtension("MOZ_WEBGL_depth_texture")||e.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=e.getExtension("EXT_texture_filter_anisotropic")||e.getExtension("MOZ_EXT_texture_filter_anisotropic")||e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=e.getExtension("WEBGL_compressed_texture_s3tc")||e.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=e.getExtension("WEBGL_compressed_texture_pvrtc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=e.getExtension(i)}return n[i]=s,s}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const s=t(i);return s===null&&Bt("THREE.WebGLRenderer: "+i+" extension not supported."),s}}}function oc(e,n,t,i){const s={},a=new WeakMap;function p(T){const E=T.target;E.index!==null&&n.remove(E.index);for(const N in E.attributes)n.remove(E.attributes[N]);E.removeEventListener("dispose",p),delete s[E.id];const m=a.get(E);m&&(n.remove(m),a.delete(E)),i.releaseStatesOfGeometry(E),E.isInstancedBufferGeometry===!0&&delete E._maxInstanceCount,t.memory.geometries--}function f(T,E){return s[E.id]===!0||(E.addEventListener("dispose",p),s[E.id]=!0,t.memory.geometries++),E}function R(T){const E=T.attributes;for(const m in E)n.update(E[m],e.ARRAY_BUFFER)}function _(T){const E=[],m=T.index,N=T.attributes.position;let P=0;if(m!==null){const D=m.array;P=m.version;for(let x=0,g=D.length;x<g;x+=3){const H=D[x+0],U=D[x+1],y=D[x+2];E.push(H,U,U,y,y,H)}}else if(N!==void 0){const D=N.array;P=N.version;for(let x=0,g=D.length/3-1;x<g;x+=3){const H=x+0,U=x+1,y=x+2;E.push(H,U,U,y,y,H)}}else return;const c=new(za(E)?ka:Wa)(E,1);c.version=P;const r=a.get(T);r&&n.remove(r),a.set(T,c)}function b(T){const E=a.get(T);if(E){const m=T.index;m!==null&&E.version<m.version&&_(T)}else _(T);return a.get(T)}return{get:f,update:R,getWireframeAttribute:b}}function sc(e,n,t){let i;function s(E){i=E}let a,p;function f(E){a=E.type,p=E.bytesPerElement}function R(E,m){e.drawElements(i,m,a,E*p),t.update(m,i,1)}function _(E,m,N){N!==0&&(e.drawElementsInstanced(i,m,a,E*p,N),t.update(m,i,N))}function b(E,m,N){if(N===0)return;n.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,m,0,a,E,0,N);let c=0;for(let r=0;r<N;r++)c+=m[r];t.update(c,i,1)}function T(E,m,N,P){if(N===0)return;const c=n.get("WEBGL_multi_draw");if(c===null)for(let r=0;r<E.length;r++)_(E[r]/p,m[r],P[r]);else{c.multiDrawElementsInstancedWEBGL(i,m,0,a,E,0,P,0,N);let r=0;for(let D=0;D<N;D++)r+=m[D]*P[D];t.update(r,i,1)}}this.setMode=s,this.setIndex=f,this.render=R,this.renderInstances=_,this.renderMultiDraw=b,this.renderMultiDrawInstances=T}function lc(e){const n={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(a,p,f){switch(t.calls++,p){case e.TRIANGLES:t.triangles+=f*(a/3);break;case e.LINES:t.lines+=f*(a/2);break;case e.LINE_STRIP:t.lines+=f*(a-1);break;case e.LINE_LOOP:t.lines+=f*a;break;case e.POINTS:t.points+=f*a;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",p);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:n,render:t,programs:null,autoReset:!0,reset:s,update:i}}function cc(e,n,t){const i=new WeakMap,s=new ct;function a(p,f,R){const _=p.morphTargetInfluences,b=f.morphAttributes.position||f.morphAttributes.normal||f.morphAttributes.color,T=b!==void 0?b.length:0;let E=i.get(f);if(E===void 0||E.count!==T){let h=function(){y.dispose(),i.delete(f),f.removeEventListener("dispose",h)};E!==void 0&&E.texture.dispose();const m=f.morphAttributes.position!==void 0,N=f.morphAttributes.normal!==void 0,P=f.morphAttributes.color!==void 0,c=f.morphAttributes.position||[],r=f.morphAttributes.normal||[],D=f.morphAttributes.color||[];let x=0;m===!0&&(x=1),N===!0&&(x=2),P===!0&&(x=3);let g=f.attributes.position.count*x,H=1;g>n.maxTextureSize&&(H=Math.ceil(g/n.maxTextureSize),g=n.maxTextureSize);const U=new Float32Array(g*H*4*T),y=new gr(U,g,H,T);y.type=wt,y.needsUpdate=!0;const B=x*4;for(let d=0;d<T;d++){const C=c[d],q=r[d],V=D[d],Y=g*H*4*d;for(let Q=0;Q<C.count;Q++){const W=Q*B;m===!0&&(s.fromBufferAttribute(C,Q),U[Y+W+0]=s.x,U[Y+W+1]=s.y,U[Y+W+2]=s.z,U[Y+W+3]=0),N===!0&&(s.fromBufferAttribute(q,Q),U[Y+W+4]=s.x,U[Y+W+5]=s.y,U[Y+W+6]=s.z,U[Y+W+7]=0),P===!0&&(s.fromBufferAttribute(V,Q),U[Y+W+8]=s.x,U[Y+W+9]=s.y,U[Y+W+10]=s.z,U[Y+W+11]=V.itemSize===4?s.w:1)}}E={count:T,texture:y,size:new ft(g,H)},i.set(f,E),f.addEventListener("dispose",h)}if(p.isInstancedMesh===!0&&p.morphTexture!==null)R.getUniforms().setValue(e,"morphTexture",p.morphTexture,t);else{let m=0;for(let P=0;P<_.length;P++)m+=_[P];const N=f.morphTargetsRelative?1:1-m;R.getUniforms().setValue(e,"morphTargetBaseInfluence",N),R.getUniforms().setValue(e,"morphTargetInfluences",_)}R.getUniforms().setValue(e,"morphTargetsTexture",E.texture,t),R.getUniforms().setValue(e,"morphTargetsTextureSize",E.size)}return{update:a}}function fc(e,n,t,i){let s=new WeakMap;function a(R){const _=i.render.frame,b=R.geometry,T=n.get(R,b);if(s.get(T)!==_&&(n.update(T),s.set(T,_)),R.isInstancedMesh&&(R.hasEventListener("dispose",f)===!1&&R.addEventListener("dispose",f),s.get(R)!==_&&(t.update(R.instanceMatrix,e.ARRAY_BUFFER),R.instanceColor!==null&&t.update(R.instanceColor,e.ARRAY_BUFFER),s.set(R,_))),R.isSkinnedMesh){const E=R.skeleton;s.get(E)!==_&&(E.update(),s.set(E,_))}return T}function p(){s=new WeakMap}function f(R){const _=R.target;_.removeEventListener("dispose",f),t.remove(_.instanceMatrix),_.instanceColor!==null&&t.remove(_.instanceColor)}return{update:a,dispose:p}}const xr=new ur,Vi=new ar(1,1),Ar=new gr,Rr=new to,Cr=new eo,ki=[],Wi=[],zi=new Float32Array(16),Xi=new Float32Array(9),Yi=new Float32Array(4);function zt(e,n,t){const i=e[0];if(i<=0||i>0)return e;const s=n*t;let a=ki[s];if(a===void 0&&(a=new Float32Array(s),ki[s]=a),n!==0){i.toArray(a,0);for(let p=1,f=0;p!==n;++p)f+=t,e[p].toArray(a,f)}return a}function nt(e,n){if(e.length!==n.length)return!1;for(let t=0,i=e.length;t<i;t++)if(e[t]!==n[t])return!1;return!0}function it(e,n){for(let t=0,i=n.length;t<i;t++)e[t]=n[t]}function En(e,n){let t=Wi[n];t===void 0&&(t=new Int32Array(n),Wi[n]=t);for(let i=0;i!==n;++i)t[i]=e.allocateTextureUnit();return t}function dc(e,n){const t=this.cache;t[0]!==n&&(e.uniform1f(this.addr,n),t[0]=n)}function uc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2f(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(nt(t,n))return;e.uniform2fv(this.addr,n),it(t,n)}}function pc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3f(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else if(n.r!==void 0)(t[0]!==n.r||t[1]!==n.g||t[2]!==n.b)&&(e.uniform3f(this.addr,n.r,n.g,n.b),t[0]=n.r,t[1]=n.g,t[2]=n.b);else{if(nt(t,n))return;e.uniform3fv(this.addr,n),it(t,n)}}function hc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4f(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(nt(t,n))return;e.uniform4fv(this.addr,n),it(t,n)}}function mc(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(nt(t,n))return;e.uniformMatrix2fv(this.addr,!1,n),it(t,n)}else{if(nt(t,i))return;Yi.set(i),e.uniformMatrix2fv(this.addr,!1,Yi),it(t,i)}}function _c(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(nt(t,n))return;e.uniformMatrix3fv(this.addr,!1,n),it(t,n)}else{if(nt(t,i))return;Xi.set(i),e.uniformMatrix3fv(this.addr,!1,Xi),it(t,i)}}function vc(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(nt(t,n))return;e.uniformMatrix4fv(this.addr,!1,n),it(t,n)}else{if(nt(t,i))return;zi.set(i),e.uniformMatrix4fv(this.addr,!1,zi),it(t,i)}}function gc(e,n){const t=this.cache;t[0]!==n&&(e.uniform1i(this.addr,n),t[0]=n)}function Ec(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2i(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(nt(t,n))return;e.uniform2iv(this.addr,n),it(t,n)}}function Sc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3i(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(nt(t,n))return;e.uniform3iv(this.addr,n),it(t,n)}}function Mc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4i(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(nt(t,n))return;e.uniform4iv(this.addr,n),it(t,n)}}function Tc(e,n){const t=this.cache;t[0]!==n&&(e.uniform1ui(this.addr,n),t[0]=n)}function xc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2ui(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(nt(t,n))return;e.uniform2uiv(this.addr,n),it(t,n)}}function Ac(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3ui(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(nt(t,n))return;e.uniform3uiv(this.addr,n),it(t,n)}}function Rc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4ui(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(nt(t,n))return;e.uniform4uiv(this.addr,n),it(t,n)}}function Cc(e,n,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(e.uniform1i(this.addr,s),i[0]=s);let a;this.type===e.SAMPLER_2D_SHADOW?(Vi.compareFunction=sr,a=Vi):a=xr,t.setTexture2D(n||a,s)}function bc(e,n,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(e.uniform1i(this.addr,s),i[0]=s),t.setTexture3D(n||Rr,s)}function Pc(e,n,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(e.uniform1i(this.addr,s),i[0]=s),t.setTextureCube(n||Cr,s)}function Lc(e,n,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(e.uniform1i(this.addr,s),i[0]=s),t.setTexture2DArray(n||Ar,s)}function Uc(e){switch(e){case 5126:return dc;case 35664:return uc;case 35665:return pc;case 35666:return hc;case 35674:return mc;case 35675:return _c;case 35676:return vc;case 5124:case 35670:return gc;case 35667:case 35671:return Ec;case 35668:case 35672:return Sc;case 35669:case 35673:return Mc;case 5125:return Tc;case 36294:return xc;case 36295:return Ac;case 36296:return Rc;case 35678:case 36198:case 36298:case 36306:case 35682:return Cc;case 35679:case 36299:case 36307:return bc;case 35680:case 36300:case 36308:case 36293:return Pc;case 36289:case 36303:case 36311:case 36292:return Lc}}function Dc(e,n){e.uniform1fv(this.addr,n)}function wc(e,n){const t=zt(n,this.size,2);e.uniform2fv(this.addr,t)}function Ic(e,n){const t=zt(n,this.size,3);e.uniform3fv(this.addr,t)}function yc(e,n){const t=zt(n,this.size,4);e.uniform4fv(this.addr,t)}function Nc(e,n){const t=zt(n,this.size,4);e.uniformMatrix2fv(this.addr,!1,t)}function Oc(e,n){const t=zt(n,this.size,9);e.uniformMatrix3fv(this.addr,!1,t)}function Fc(e,n){const t=zt(n,this.size,16);e.uniformMatrix4fv(this.addr,!1,t)}function Bc(e,n){e.uniform1iv(this.addr,n)}function Gc(e,n){e.uniform2iv(this.addr,n)}function Hc(e,n){e.uniform3iv(this.addr,n)}function Vc(e,n){e.uniform4iv(this.addr,n)}function kc(e,n){e.uniform1uiv(this.addr,n)}function Wc(e,n){e.uniform2uiv(this.addr,n)}function zc(e,n){e.uniform3uiv(this.addr,n)}function Xc(e,n){e.uniform4uiv(this.addr,n)}function Yc(e,n,t){const i=this.cache,s=n.length,a=En(t,s);nt(i,a)||(e.uniform1iv(this.addr,a),it(i,a));for(let p=0;p!==s;++p)t.setTexture2D(n[p]||xr,a[p])}function qc(e,n,t){const i=this.cache,s=n.length,a=En(t,s);nt(i,a)||(e.uniform1iv(this.addr,a),it(i,a));for(let p=0;p!==s;++p)t.setTexture3D(n[p]||Rr,a[p])}function Kc(e,n,t){const i=this.cache,s=n.length,a=En(t,s);nt(i,a)||(e.uniform1iv(this.addr,a),it(i,a));for(let p=0;p!==s;++p)t.setTextureCube(n[p]||Cr,a[p])}function $c(e,n,t){const i=this.cache,s=n.length,a=En(t,s);nt(i,a)||(e.uniform1iv(this.addr,a),it(i,a));for(let p=0;p!==s;++p)t.setTexture2DArray(n[p]||Ar,a[p])}function Zc(e){switch(e){case 5126:return Dc;case 35664:return wc;case 35665:return Ic;case 35666:return yc;case 35674:return Nc;case 35675:return Oc;case 35676:return Fc;case 5124:case 35670:return Bc;case 35667:case 35671:return Gc;case 35668:case 35672:return Hc;case 35669:case 35673:return Vc;case 5125:return kc;case 36294:return Wc;case 36295:return zc;case 36296:return Xc;case 35678:case 36198:case 36298:case 36306:case 35682:return Yc;case 35679:case 36299:case 36307:return qc;case 35680:case 36300:case 36308:case 36293:return Kc;case 36289:case 36303:case 36311:case 36292:return $c}}class Qc{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.setValue=Uc(t.type)}}class Jc{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Zc(t.type)}}class jc{constructor(n){this.id=n,this.seq=[],this.map={}}setValue(n,t,i){const s=this.seq;for(let a=0,p=s.length;a!==p;++a){const f=s[a];f.setValue(n,t[f.id],i)}}}const In=/(\w+)(\])?(\[|\.)?/g;function qi(e,n){e.seq.push(n),e.map[n.id]=n}function ef(e,n,t){const i=e.name,s=i.length;for(In.lastIndex=0;;){const a=In.exec(i),p=In.lastIndex;let f=a[1];const R=a[2]==="]",_=a[3];if(R&&(f=f|0),_===void 0||_==="["&&p+2===s){qi(t,_===void 0?new Qc(f,e,n):new Jc(f,e,n));break}else{let T=t.map[f];T===void 0&&(T=new jc(f),qi(t,T)),t=T}}}class dn{constructor(n,t){this.seq=[],this.map={};const i=n.getProgramParameter(t,n.ACTIVE_UNIFORMS);for(let s=0;s<i;++s){const a=n.getActiveUniform(t,s),p=n.getUniformLocation(t,a.name);ef(a,p,this)}}setValue(n,t,i,s){const a=this.map[t];a!==void 0&&a.setValue(n,i,s)}setOptional(n,t,i){const s=t[i];s!==void 0&&this.setValue(n,i,s)}static upload(n,t,i,s){for(let a=0,p=t.length;a!==p;++a){const f=t[a],R=i[f.id];R.needsUpdate!==!1&&f.setValue(n,R.value,s)}}static seqWithValue(n,t){const i=[];for(let s=0,a=n.length;s!==a;++s){const p=n[s];p.id in t&&i.push(p)}return i}}function Ki(e,n,t){const i=e.createShader(n);return e.shaderSource(i,t),e.compileShader(i),i}const tf=37297;let nf=0;function rf(e,n){const t=e.split(`
`),i=[],s=Math.max(n-6,0),a=Math.min(n+6,t.length);for(let p=s;p<a;p++){const f=p+1;i.push(`${f===n?">":" "} ${f}: ${t[p]}`)}return i.join(`
`)}const $i=new Be;function af(e){tt._getMatrix($i,tt.workingColorSpace,e);const n=`mat3( ${$i.elements.map(t=>t.toFixed(4))} )`;switch(tt.getTransfer(e)){case Mr:return[n,"LinearTransferOETF"];case Ye:return[n,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",e),[n,"LinearTransferOETF"]}}function Zi(e,n,t){const i=e.getShaderParameter(n,e.COMPILE_STATUS),s=e.getShaderInfoLog(n).trim();if(i&&s==="")return"";const a=/ERROR: 0:(\d+)/.exec(s);if(a){const p=parseInt(a[1]);return t.toUpperCase()+`

`+s+`

`+rf(e.getShaderSource(n),p)}else return s}function of(e,n){const t=af(n);return[`vec4 ${e}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function sf(e,n){let t;switch(n){case ja:t="Linear";break;case Ja:t="Reinhard";break;case Qa:t="Cineon";break;case Za:t="ACESFilmic";break;case $a:t="AgX";break;case Ka:t="Neutral";break;case qa:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",n),t="Linear"}return"vec3 "+e+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const sn=new Ge;function lf(){tt.getLuminanceCoefficients(sn);const e=sn.x.toFixed(4),n=sn.y.toFixed(4),t=sn.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${e}, ${n}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function cf(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",e.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Kt).join(`
`)}function ff(e){const n=[];for(const t in e){const i=e[t];i!==!1&&n.push("#define "+t+" "+i)}return n.join(`
`)}function df(e,n){const t={},i=e.getProgramParameter(n,e.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){const a=e.getActiveAttrib(n,s),p=a.name;let f=1;a.type===e.FLOAT_MAT2&&(f=2),a.type===e.FLOAT_MAT3&&(f=3),a.type===e.FLOAT_MAT4&&(f=4),t[p]={type:a.type,location:e.getAttribLocation(n,p),locationSize:f}}return t}function Kt(e){return e!==""}function Qi(e,n){const t=n.numSpotLightShadows+n.numSpotLightMaps-n.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,n.numDirLights).replace(/NUM_SPOT_LIGHTS/g,n.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,n.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,n.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,n.numPointLights).replace(/NUM_HEMI_LIGHTS/g,n.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,n.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,n.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,n.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,n.numPointLightShadows)}function Ji(e,n){return e.replace(/NUM_CLIPPING_PLANES/g,n.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,n.numClippingPlanes-n.numClipIntersection)}const uf=/^[ \t]*#include +<([\w\d./]+)>/gm;function zn(e){return e.replace(uf,hf)}const pf=new Map;function hf(e,n){let t=Pe[n];if(t===void 0){const i=pf.get(n);if(i!==void 0)t=Pe[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',n,i);else throw new Error("Can not resolve #include <"+n+">")}return zn(t)}const mf=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ji(e){return e.replace(mf,_f)}function _f(e,n,t,i){let s="";for(let a=parseInt(n);a<parseInt(t);a++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return s}function er(e){let n=`precision ${e.precision} float;
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
#define LOW_PRECISION`),n}function vf(e){let n="SHADOWMAP_TYPE_BASIC";return e.shadowMapType===cr?n="SHADOWMAP_TYPE_PCF":e.shadowMapType===Ya?n="SHADOWMAP_TYPE_PCF_SOFT":e.shadowMapType===St&&(n="SHADOWMAP_TYPE_VSM"),n}function gf(e){let n="ENVMAP_TYPE_CUBE";if(e.envMap)switch(e.envMapMode){case jt:case Wt:n="ENVMAP_TYPE_CUBE";break;case gn:n="ENVMAP_TYPE_CUBE_UV";break}return n}function Ef(e){let n="ENVMAP_MODE_REFLECTION";if(e.envMap)switch(e.envMapMode){case Wt:n="ENVMAP_MODE_REFRACTION";break}return n}function Sf(e){let n="ENVMAP_BLENDING_NONE";if(e.envMap)switch(e.combine){case ao:n="ENVMAP_BLENDING_MULTIPLY";break;case ro:n="ENVMAP_BLENDING_MIX";break;case io:n="ENVMAP_BLENDING_ADD";break}return n}function Mf(e){const n=e.envMapCubeUVHeight;if(n===null)return null;const t=Math.log2(n)-2,i=1/n;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function Tf(e,n,t,i){const s=e.getContext(),a=t.defines;let p=t.vertexShader,f=t.fragmentShader;const R=vf(t),_=gf(t),b=Ef(t),T=Sf(t),E=Mf(t),m=cf(t),N=ff(a),P=s.createProgram();let c,r,D=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(c=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,N].filter(Kt).join(`
`),c.length>0&&(c+=`
`),r=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,N].filter(Kt).join(`
`),r.length>0&&(r+=`
`)):(c=[er(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,N,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+b:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+R:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Kt).join(`
`),r=[er(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,N,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+_:"",t.envMap?"#define "+b:"",t.envMap?"#define "+T:"",E?"#define CUBEUV_TEXEL_WIDTH "+E.texelWidth:"",E?"#define CUBEUV_TEXEL_HEIGHT "+E.texelHeight:"",E?"#define CUBEUV_MAX_MIP "+E.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+R:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==At?"#define TONE_MAPPING":"",t.toneMapping!==At?Pe.tonemapping_pars_fragment:"",t.toneMapping!==At?sf("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Pe.colorspace_pars_fragment,of("linearToOutputTexel",t.outputColorSpace),lf(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Kt).join(`
`)),p=zn(p),p=Qi(p,t),p=Ji(p,t),f=zn(f),f=Qi(f,t),f=Ji(f,t),p=ji(p),f=ji(f),t.isRawShaderMaterial!==!0&&(D=`#version 300 es
`,c=[m,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+c,r=["#define varying in",t.glslVersion===Ii?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Ii?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+r);const x=D+c+p,g=D+r+f,H=Ki(s,s.VERTEX_SHADER,x),U=Ki(s,s.FRAGMENT_SHADER,g);s.attachShader(P,H),s.attachShader(P,U),t.index0AttributeName!==void 0?s.bindAttribLocation(P,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(P,0,"position"),s.linkProgram(P);function y(C){if(e.debug.checkShaderErrors){const q=s.getProgramInfoLog(P).trim(),V=s.getShaderInfoLog(H).trim(),Y=s.getShaderInfoLog(U).trim();let Q=!0,W=!0;if(s.getProgramParameter(P,s.LINK_STATUS)===!1)if(Q=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(s,P,H,U);else{const j=Zi(s,H,"vertex"),F=Zi(s,U,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(P,s.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+q+`
`+j+`
`+F)}else q!==""?console.warn("THREE.WebGLProgram: Program Info Log:",q):(V===""||Y==="")&&(W=!1);W&&(C.diagnostics={runnable:Q,programLog:q,vertexShader:{log:V,prefix:c},fragmentShader:{log:Y,prefix:r}})}s.deleteShader(H),s.deleteShader(U),B=new dn(s,P),h=df(s,P)}let B;this.getUniforms=function(){return B===void 0&&y(this),B};let h;this.getAttributes=function(){return h===void 0&&y(this),h};let d=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return d===!1&&(d=s.getProgramParameter(P,tf)),d},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(P),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=nf++,this.cacheKey=n,this.usedTimes=1,this.program=P,this.vertexShader=H,this.fragmentShader=U,this}let xf=0;class Af{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(n){const t=n.vertexShader,i=n.fragmentShader,s=this._getShaderStage(t),a=this._getShaderStage(i),p=this._getShaderCacheForMaterial(n);return p.has(s)===!1&&(p.add(s),s.usedTimes++),p.has(a)===!1&&(p.add(a),a.usedTimes++),this}remove(n){const t=this.materialCache.get(n);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(n),this}getVertexShaderID(n){return this._getShaderStage(n.vertexShader).id}getFragmentShaderID(n){return this._getShaderStage(n.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(n){const t=this.materialCache;let i=t.get(n);return i===void 0&&(i=new Set,t.set(n,i)),i}_getShaderStage(n){const t=this.shaderCache;let i=t.get(n);return i===void 0&&(i=new Rf(n),t.set(n,i)),i}}class Rf{constructor(n){this.id=xf++,this.code=n,this.usedTimes=0}}function Cf(e,n,t,i,s,a,p){const f=new Xa,R=new Af,_=new Set,b=[],T=s.logarithmicDepthBuffer,E=s.vertexTextures;let m=s.precision;const N={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function P(h){return _.add(h),h===0?"uv":`uv${h}`}function c(h,d,C,q,V){const Y=q.fog,Q=V.geometry,W=h.isMeshStandardMaterial?q.environment:null,j=(h.isMeshStandardMaterial?t:n).get(h.envMap||W),F=j&&j.mapping===gn?j.image.height:null,he=N[h.type];h.precision!==null&&(m=s.getMaxPrecision(h.precision),m!==h.precision&&console.warn("THREE.WebGLProgram.getParameters:",h.precision,"not supported, using",m,"instead."));const Se=Q.morphAttributes.position||Q.morphAttributes.normal||Q.morphAttributes.color,Le=Se!==void 0?Se.length:0;let He=0;Q.morphAttributes.position!==void 0&&(He=1),Q.morphAttributes.normal!==void 0&&(He=2),Q.morphAttributes.color!==void 0&&(He=3);let Ze,k,J,ue;if(he){const We=gt[he];Ze=We.vertexShader,k=We.fragmentShader}else Ze=h.vertexShader,k=h.fragmentShader,R.update(h),J=R.getVertexShaderID(h),ue=R.getFragmentShaderID(h);const ie=e.getRenderTarget(),Me=e.state.buffers.depth.getReversed(),Re=V.isInstancedMesh===!0,Ue=V.isBatchedMesh===!0,$e=!!h.map,ye=!!h.matcap,je=!!j,v=!!h.aoMap,ut=!!h.lightMap,De=!!h.bumpMap,we=!!h.normalMap,me=!!h.displacementMap,Xe=!!h.emissiveMap,_e=!!h.metalnessMap,u=!!h.roughnessMap,o=h.anisotropy>0,L=h.clearcoat>0,z=h.dispersion>0,K=h.iridescence>0,G=h.sheen>0,pe=h.transmission>0,re=o&&!!h.anisotropyMap,le=L&&!!h.clearcoatMap,Ne=L&&!!h.clearcoatNormalMap,Z=L&&!!h.clearcoatRoughnessMap,ce=K&&!!h.iridescenceMap,Ee=K&&!!h.iridescenceThicknessMap,Te=G&&!!h.sheenColorMap,fe=G&&!!h.sheenRoughnessMap,Ie=!!h.specularMap,be=!!h.specularColorMap,ze=!!h.specularIntensityMap,S=pe&&!!h.transmissionMap,te=pe&&!!h.thicknessMap,O=!!h.gradientMap,X=!!h.alphaMap,oe=h.alphaTest>0,ae=!!h.alphaHash,Ce=!!h.extensions;let Qe=At;h.toneMapped&&(ie===null||ie.isXRRenderTarget===!0)&&(Qe=e.toneMapping);const at={shaderID:he,shaderType:h.type,shaderName:h.name,vertexShader:Ze,fragmentShader:k,defines:h.defines,customVertexShaderID:J,customFragmentShaderID:ue,isRawShaderMaterial:h.isRawShaderMaterial===!0,glslVersion:h.glslVersion,precision:m,batching:Ue,batchingColor:Ue&&V._colorsTexture!==null,instancing:Re,instancingColor:Re&&V.instanceColor!==null,instancingMorph:Re&&V.morphTexture!==null,supportsVertexTextures:E,outputColorSpace:ie===null?e.outputColorSpace:ie.isXRRenderTarget===!0?ie.texture.colorSpace:vn,alphaToCoverage:!!h.alphaToCoverage,map:$e,matcap:ye,envMap:je,envMapMode:je&&j.mapping,envMapCubeUVHeight:F,aoMap:v,lightMap:ut,bumpMap:De,normalMap:we,displacementMap:E&&me,emissiveMap:Xe,normalMapObjectSpace:we&&h.normalMapType===Va,normalMapTangentSpace:we&&h.normalMapType===Ha,metalnessMap:_e,roughnessMap:u,anisotropy:o,anisotropyMap:re,clearcoat:L,clearcoatMap:le,clearcoatNormalMap:Ne,clearcoatRoughnessMap:Z,dispersion:z,iridescence:K,iridescenceMap:ce,iridescenceThicknessMap:Ee,sheen:G,sheenColorMap:Te,sheenRoughnessMap:fe,specularMap:Ie,specularColorMap:be,specularIntensityMap:ze,transmission:pe,transmissionMap:S,thicknessMap:te,gradientMap:O,opaque:h.transparent===!1&&h.blending===fn&&h.alphaToCoverage===!1,alphaMap:X,alphaTest:oe,alphaHash:ae,combine:h.combine,mapUv:$e&&P(h.map.channel),aoMapUv:v&&P(h.aoMap.channel),lightMapUv:ut&&P(h.lightMap.channel),bumpMapUv:De&&P(h.bumpMap.channel),normalMapUv:we&&P(h.normalMap.channel),displacementMapUv:me&&P(h.displacementMap.channel),emissiveMapUv:Xe&&P(h.emissiveMap.channel),metalnessMapUv:_e&&P(h.metalnessMap.channel),roughnessMapUv:u&&P(h.roughnessMap.channel),anisotropyMapUv:re&&P(h.anisotropyMap.channel),clearcoatMapUv:le&&P(h.clearcoatMap.channel),clearcoatNormalMapUv:Ne&&P(h.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Z&&P(h.clearcoatRoughnessMap.channel),iridescenceMapUv:ce&&P(h.iridescenceMap.channel),iridescenceThicknessMapUv:Ee&&P(h.iridescenceThicknessMap.channel),sheenColorMapUv:Te&&P(h.sheenColorMap.channel),sheenRoughnessMapUv:fe&&P(h.sheenRoughnessMap.channel),specularMapUv:Ie&&P(h.specularMap.channel),specularColorMapUv:be&&P(h.specularColorMap.channel),specularIntensityMapUv:ze&&P(h.specularIntensityMap.channel),transmissionMapUv:S&&P(h.transmissionMap.channel),thicknessMapUv:te&&P(h.thicknessMap.channel),alphaMapUv:X&&P(h.alphaMap.channel),vertexTangents:!!Q.attributes.tangent&&(we||o),vertexColors:h.vertexColors,vertexAlphas:h.vertexColors===!0&&!!Q.attributes.color&&Q.attributes.color.itemSize===4,pointsUvs:V.isPoints===!0&&!!Q.attributes.uv&&($e||X),fog:!!Y,useFog:h.fog===!0,fogExp2:!!Y&&Y.isFogExp2,flatShading:h.flatShading===!0,sizeAttenuation:h.sizeAttenuation===!0,logarithmicDepthBuffer:T,reverseDepthBuffer:Me,skinning:V.isSkinnedMesh===!0,morphTargets:Q.morphAttributes.position!==void 0,morphNormals:Q.morphAttributes.normal!==void 0,morphColors:Q.morphAttributes.color!==void 0,morphTargetsCount:Le,morphTextureStride:He,numDirLights:d.directional.length,numPointLights:d.point.length,numSpotLights:d.spot.length,numSpotLightMaps:d.spotLightMap.length,numRectAreaLights:d.rectArea.length,numHemiLights:d.hemi.length,numDirLightShadows:d.directionalShadowMap.length,numPointLightShadows:d.pointShadowMap.length,numSpotLightShadows:d.spotShadowMap.length,numSpotLightShadowsWithMaps:d.numSpotLightShadowsWithMaps,numLightProbes:d.numLightProbes,numClippingPlanes:p.numPlanes,numClipIntersection:p.numIntersection,dithering:h.dithering,shadowMapEnabled:e.shadowMap.enabled&&C.length>0,shadowMapType:e.shadowMap.type,toneMapping:Qe,decodeVideoTexture:$e&&h.map.isVideoTexture===!0&&tt.getTransfer(h.map.colorSpace)===Ye,decodeVideoTextureEmissive:Xe&&h.emissiveMap.isVideoTexture===!0&&tt.getTransfer(h.emissiveMap.colorSpace)===Ye,premultipliedAlpha:h.premultipliedAlpha,doubleSided:h.side===Mt,flipSided:h.side===mt,useDepthPacking:h.depthPacking>=0,depthPacking:h.depthPacking||0,index0AttributeName:h.index0AttributeName,extensionClipCullDistance:Ce&&h.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ce&&h.extensions.multiDraw===!0||Ue)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:h.customProgramCacheKey()};return at.vertexUv1s=_.has(1),at.vertexUv2s=_.has(2),at.vertexUv3s=_.has(3),_.clear(),at}function r(h){const d=[];if(h.shaderID?d.push(h.shaderID):(d.push(h.customVertexShaderID),d.push(h.customFragmentShaderID)),h.defines!==void 0)for(const C in h.defines)d.push(C),d.push(h.defines[C]);return h.isRawShaderMaterial===!1&&(D(d,h),x(d,h),d.push(e.outputColorSpace)),d.push(h.customProgramCacheKey),d.join()}function D(h,d){h.push(d.precision),h.push(d.outputColorSpace),h.push(d.envMapMode),h.push(d.envMapCubeUVHeight),h.push(d.mapUv),h.push(d.alphaMapUv),h.push(d.lightMapUv),h.push(d.aoMapUv),h.push(d.bumpMapUv),h.push(d.normalMapUv),h.push(d.displacementMapUv),h.push(d.emissiveMapUv),h.push(d.metalnessMapUv),h.push(d.roughnessMapUv),h.push(d.anisotropyMapUv),h.push(d.clearcoatMapUv),h.push(d.clearcoatNormalMapUv),h.push(d.clearcoatRoughnessMapUv),h.push(d.iridescenceMapUv),h.push(d.iridescenceThicknessMapUv),h.push(d.sheenColorMapUv),h.push(d.sheenRoughnessMapUv),h.push(d.specularMapUv),h.push(d.specularColorMapUv),h.push(d.specularIntensityMapUv),h.push(d.transmissionMapUv),h.push(d.thicknessMapUv),h.push(d.combine),h.push(d.fogExp2),h.push(d.sizeAttenuation),h.push(d.morphTargetsCount),h.push(d.morphAttributeCount),h.push(d.numDirLights),h.push(d.numPointLights),h.push(d.numSpotLights),h.push(d.numSpotLightMaps),h.push(d.numHemiLights),h.push(d.numRectAreaLights),h.push(d.numDirLightShadows),h.push(d.numPointLightShadows),h.push(d.numSpotLightShadows),h.push(d.numSpotLightShadowsWithMaps),h.push(d.numLightProbes),h.push(d.shadowMapType),h.push(d.toneMapping),h.push(d.numClippingPlanes),h.push(d.numClipIntersection),h.push(d.depthPacking)}function x(h,d){f.disableAll(),d.supportsVertexTextures&&f.enable(0),d.instancing&&f.enable(1),d.instancingColor&&f.enable(2),d.instancingMorph&&f.enable(3),d.matcap&&f.enable(4),d.envMap&&f.enable(5),d.normalMapObjectSpace&&f.enable(6),d.normalMapTangentSpace&&f.enable(7),d.clearcoat&&f.enable(8),d.iridescence&&f.enable(9),d.alphaTest&&f.enable(10),d.vertexColors&&f.enable(11),d.vertexAlphas&&f.enable(12),d.vertexUv1s&&f.enable(13),d.vertexUv2s&&f.enable(14),d.vertexUv3s&&f.enable(15),d.vertexTangents&&f.enable(16),d.anisotropy&&f.enable(17),d.alphaHash&&f.enable(18),d.batching&&f.enable(19),d.dispersion&&f.enable(20),d.batchingColor&&f.enable(21),h.push(f.mask),f.disableAll(),d.fog&&f.enable(0),d.useFog&&f.enable(1),d.flatShading&&f.enable(2),d.logarithmicDepthBuffer&&f.enable(3),d.reverseDepthBuffer&&f.enable(4),d.skinning&&f.enable(5),d.morphTargets&&f.enable(6),d.morphNormals&&f.enable(7),d.morphColors&&f.enable(8),d.premultipliedAlpha&&f.enable(9),d.shadowMapEnabled&&f.enable(10),d.doubleSided&&f.enable(11),d.flipSided&&f.enable(12),d.useDepthPacking&&f.enable(13),d.dithering&&f.enable(14),d.transmission&&f.enable(15),d.sheen&&f.enable(16),d.opaque&&f.enable(17),d.pointsUvs&&f.enable(18),d.decodeVideoTexture&&f.enable(19),d.decodeVideoTextureEmissive&&f.enable(20),d.alphaToCoverage&&f.enable(21),h.push(f.mask)}function g(h){const d=N[h.type];let C;if(d){const q=gt[d];C=Ga.clone(q.uniforms)}else C=h.uniforms;return C}function H(h,d){let C;for(let q=0,V=b.length;q<V;q++){const Y=b[q];if(Y.cacheKey===d){C=Y,++C.usedTimes;break}}return C===void 0&&(C=new Tf(e,d,h,a),b.push(C)),C}function U(h){if(--h.usedTimes===0){const d=b.indexOf(h);b[d]=b[b.length-1],b.pop(),h.destroy()}}function y(h){R.remove(h)}function B(){R.dispose()}return{getParameters:c,getProgramCacheKey:r,getUniforms:g,acquireProgram:H,releaseProgram:U,releaseShaderCache:y,programs:b,dispose:B}}function bf(){let e=new WeakMap;function n(p){return e.has(p)}function t(p){let f=e.get(p);return f===void 0&&(f={},e.set(p,f)),f}function i(p){e.delete(p)}function s(p,f,R){e.get(p)[f]=R}function a(){e=new WeakMap}return{has:n,get:t,remove:i,update:s,dispose:a}}function Pf(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.material.id!==n.material.id?e.material.id-n.material.id:e.z!==n.z?e.z-n.z:e.id-n.id}function tr(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.z!==n.z?n.z-e.z:e.id-n.id}function nr(){const e=[];let n=0;const t=[],i=[],s=[];function a(){n=0,t.length=0,i.length=0,s.length=0}function p(T,E,m,N,P,c){let r=e[n];return r===void 0?(r={id:T.id,object:T,geometry:E,material:m,groupOrder:N,renderOrder:T.renderOrder,z:P,group:c},e[n]=r):(r.id=T.id,r.object=T,r.geometry=E,r.material=m,r.groupOrder=N,r.renderOrder=T.renderOrder,r.z=P,r.group=c),n++,r}function f(T,E,m,N,P,c){const r=p(T,E,m,N,P,c);m.transmission>0?i.push(r):m.transparent===!0?s.push(r):t.push(r)}function R(T,E,m,N,P,c){const r=p(T,E,m,N,P,c);m.transmission>0?i.unshift(r):m.transparent===!0?s.unshift(r):t.unshift(r)}function _(T,E){t.length>1&&t.sort(T||Pf),i.length>1&&i.sort(E||tr),s.length>1&&s.sort(E||tr)}function b(){for(let T=n,E=e.length;T<E;T++){const m=e[T];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:i,transparent:s,init:a,push:f,unshift:R,finish:b,sort:_}}function Lf(){let e=new WeakMap;function n(i,s){const a=e.get(i);let p;return a===void 0?(p=new nr,e.set(i,[p])):s>=a.length?(p=new nr,a.push(p)):p=a[s],p}function t(){e=new WeakMap}return{get:n,dispose:t}}function Uf(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={direction:new Ge,color:new Ke};break;case"SpotLight":t={position:new Ge,direction:new Ge,color:new Ke,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new Ge,color:new Ke,distance:0,decay:0};break;case"HemisphereLight":t={direction:new Ge,skyColor:new Ke,groundColor:new Ke};break;case"RectAreaLight":t={color:new Ke,position:new Ge,halfWidth:new Ge,halfHeight:new Ge};break}return e[n.id]=t,t}}}function Df(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[n.id]=t,t}}}let wf=0;function If(e,n){return(n.castShadow?2:0)-(e.castShadow?2:0)+(n.map?1:0)-(e.map?1:0)}function yf(e){const n=new Uf,t=Df(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let _=0;_<9;_++)i.probe.push(new Ge);const s=new Ge,a=new Rt,p=new Rt;function f(_){let b=0,T=0,E=0;for(let h=0;h<9;h++)i.probe[h].set(0,0,0);let m=0,N=0,P=0,c=0,r=0,D=0,x=0,g=0,H=0,U=0,y=0;_.sort(If);for(let h=0,d=_.length;h<d;h++){const C=_[h],q=C.color,V=C.intensity,Y=C.distance,Q=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)b+=q.r*V,T+=q.g*V,E+=q.b*V;else if(C.isLightProbe){for(let W=0;W<9;W++)i.probe[W].addScaledVector(C.sh.coefficients[W],V);y++}else if(C.isDirectionalLight){const W=n.get(C);if(W.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const j=C.shadow,F=t.get(C);F.shadowIntensity=j.intensity,F.shadowBias=j.bias,F.shadowNormalBias=j.normalBias,F.shadowRadius=j.radius,F.shadowMapSize=j.mapSize,i.directionalShadow[m]=F,i.directionalShadowMap[m]=Q,i.directionalShadowMatrix[m]=C.shadow.matrix,D++}i.directional[m]=W,m++}else if(C.isSpotLight){const W=n.get(C);W.position.setFromMatrixPosition(C.matrixWorld),W.color.copy(q).multiplyScalar(V),W.distance=Y,W.coneCos=Math.cos(C.angle),W.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),W.decay=C.decay,i.spot[P]=W;const j=C.shadow;if(C.map&&(i.spotLightMap[H]=C.map,H++,j.updateMatrices(C),C.castShadow&&U++),i.spotLightMatrix[P]=j.matrix,C.castShadow){const F=t.get(C);F.shadowIntensity=j.intensity,F.shadowBias=j.bias,F.shadowNormalBias=j.normalBias,F.shadowRadius=j.radius,F.shadowMapSize=j.mapSize,i.spotShadow[P]=F,i.spotShadowMap[P]=Q,g++}P++}else if(C.isRectAreaLight){const W=n.get(C);W.color.copy(q).multiplyScalar(V),W.halfWidth.set(C.width*.5,0,0),W.halfHeight.set(0,C.height*.5,0),i.rectArea[c]=W,c++}else if(C.isPointLight){const W=n.get(C);if(W.color.copy(C.color).multiplyScalar(C.intensity),W.distance=C.distance,W.decay=C.decay,C.castShadow){const j=C.shadow,F=t.get(C);F.shadowIntensity=j.intensity,F.shadowBias=j.bias,F.shadowNormalBias=j.normalBias,F.shadowRadius=j.radius,F.shadowMapSize=j.mapSize,F.shadowCameraNear=j.camera.near,F.shadowCameraFar=j.camera.far,i.pointShadow[N]=F,i.pointShadowMap[N]=Q,i.pointShadowMatrix[N]=C.shadow.matrix,x++}i.point[N]=W,N++}else if(C.isHemisphereLight){const W=n.get(C);W.skyColor.copy(C.color).multiplyScalar(V),W.groundColor.copy(C.groundColor).multiplyScalar(V),i.hemi[r]=W,r++}}c>0&&(e.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ee.LTC_FLOAT_1,i.rectAreaLTC2=ee.LTC_FLOAT_2):(i.rectAreaLTC1=ee.LTC_HALF_1,i.rectAreaLTC2=ee.LTC_HALF_2)),i.ambient[0]=b,i.ambient[1]=T,i.ambient[2]=E;const B=i.hash;(B.directionalLength!==m||B.pointLength!==N||B.spotLength!==P||B.rectAreaLength!==c||B.hemiLength!==r||B.numDirectionalShadows!==D||B.numPointShadows!==x||B.numSpotShadows!==g||B.numSpotMaps!==H||B.numLightProbes!==y)&&(i.directional.length=m,i.spot.length=P,i.rectArea.length=c,i.point.length=N,i.hemi.length=r,i.directionalShadow.length=D,i.directionalShadowMap.length=D,i.pointShadow.length=x,i.pointShadowMap.length=x,i.spotShadow.length=g,i.spotShadowMap.length=g,i.directionalShadowMatrix.length=D,i.pointShadowMatrix.length=x,i.spotLightMatrix.length=g+H-U,i.spotLightMap.length=H,i.numSpotLightShadowsWithMaps=U,i.numLightProbes=y,B.directionalLength=m,B.pointLength=N,B.spotLength=P,B.rectAreaLength=c,B.hemiLength=r,B.numDirectionalShadows=D,B.numPointShadows=x,B.numSpotShadows=g,B.numSpotMaps=H,B.numLightProbes=y,i.version=wf++)}function R(_,b){let T=0,E=0,m=0,N=0,P=0;const c=b.matrixWorldInverse;for(let r=0,D=_.length;r<D;r++){const x=_[r];if(x.isDirectionalLight){const g=i.directional[T];g.direction.setFromMatrixPosition(x.matrixWorld),s.setFromMatrixPosition(x.target.matrixWorld),g.direction.sub(s),g.direction.transformDirection(c),T++}else if(x.isSpotLight){const g=i.spot[m];g.position.setFromMatrixPosition(x.matrixWorld),g.position.applyMatrix4(c),g.direction.setFromMatrixPosition(x.matrixWorld),s.setFromMatrixPosition(x.target.matrixWorld),g.direction.sub(s),g.direction.transformDirection(c),m++}else if(x.isRectAreaLight){const g=i.rectArea[N];g.position.setFromMatrixPosition(x.matrixWorld),g.position.applyMatrix4(c),p.identity(),a.copy(x.matrixWorld),a.premultiply(c),p.extractRotation(a),g.halfWidth.set(x.width*.5,0,0),g.halfHeight.set(0,x.height*.5,0),g.halfWidth.applyMatrix4(p),g.halfHeight.applyMatrix4(p),N++}else if(x.isPointLight){const g=i.point[E];g.position.setFromMatrixPosition(x.matrixWorld),g.position.applyMatrix4(c),E++}else if(x.isHemisphereLight){const g=i.hemi[P];g.direction.setFromMatrixPosition(x.matrixWorld),g.direction.transformDirection(c),P++}}}return{setup:f,setupView:R,state:i}}function ir(e){const n=new yf(e),t=[],i=[];function s(b){_.camera=b,t.length=0,i.length=0}function a(b){t.push(b)}function p(b){i.push(b)}function f(){n.setup(t)}function R(b){n.setupView(t,b)}const _={lightsArray:t,shadowsArray:i,camera:null,lights:n,transmissionRenderTarget:{}};return{init:s,state:_,setupLights:f,setupLightsView:R,pushLight:a,pushShadow:p}}function Nf(e){let n=new WeakMap;function t(s,a=0){const p=n.get(s);let f;return p===void 0?(f=new ir(e),n.set(s,[f])):a>=p.length?(f=new ir(e),p.push(f)):f=p[a],f}function i(){n=new WeakMap}return{get:t,dispose:i}}const Of=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Ff=`uniform sampler2D shadow_pass;
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
}`;function Bf(e,n,t){let i=new rr;const s=new ft,a=new ft,p=new ct,f=new Ta({depthPacking:xa}),R=new Aa,_={},b=t.maxTextureSize,T={[Zt]:mt,[mt]:Zt,[Mt]:Mt},E=new Nt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ft},radius:{value:4}},vertexShader:Of,fragmentShader:Ff}),m=E.clone();m.defines.HORIZONTAL_PASS=1;const N=new lr;N.setAttribute("position",new cn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const P=new xt(N,E),c=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=cr;let r=this.type;this.render=function(U,y,B){if(c.enabled===!1||c.autoUpdate===!1&&c.needsUpdate===!1||U.length===0)return;const h=e.getRenderTarget(),d=e.getActiveCubeFace(),C=e.getActiveMipmapLevel(),q=e.state;q.setBlending(It),q.buffers.color.setClear(1,1,1,1),q.buffers.depth.setTest(!0),q.setScissorTest(!1);const V=r!==St&&this.type===St,Y=r===St&&this.type!==St;for(let Q=0,W=U.length;Q<W;Q++){const j=U[Q],F=j.shadow;if(F===void 0){console.warn("THREE.WebGLShadowMap:",j,"has no shadow.");continue}if(F.autoUpdate===!1&&F.needsUpdate===!1)continue;s.copy(F.mapSize);const he=F.getFrameExtents();if(s.multiply(he),a.copy(F.mapSize),(s.x>b||s.y>b)&&(s.x>b&&(a.x=Math.floor(b/he.x),s.x=a.x*he.x,F.mapSize.x=a.x),s.y>b&&(a.y=Math.floor(b/he.y),s.y=a.y*he.y,F.mapSize.y=a.y)),F.map===null||V===!0||Y===!0){const Le=this.type!==St?{minFilter:$t,magFilter:$t}:{};F.map!==null&&F.map.dispose(),F.map=new kt(s.x,s.y,Le),F.map.texture.name=j.name+".shadowMap",F.camera.updateProjectionMatrix()}e.setRenderTarget(F.map),e.clear();const Se=F.getViewportCount();for(let Le=0;Le<Se;Le++){const He=F.getViewport(Le);p.set(a.x*He.x,a.y*He.y,a.x*He.z,a.y*He.w),q.viewport(p),F.updateMatrices(j,Le),i=F.getFrustum(),g(y,B,F.camera,j,this.type)}F.isPointLightShadow!==!0&&this.type===St&&D(F,B),F.needsUpdate=!1}r=this.type,c.needsUpdate=!1,e.setRenderTarget(h,d,C)};function D(U,y){const B=n.update(P);E.defines.VSM_SAMPLES!==U.blurSamples&&(E.defines.VSM_SAMPLES=U.blurSamples,m.defines.VSM_SAMPLES=U.blurSamples,E.needsUpdate=!0,m.needsUpdate=!0),U.mapPass===null&&(U.mapPass=new kt(s.x,s.y)),E.uniforms.shadow_pass.value=U.map.texture,E.uniforms.resolution.value=U.mapSize,E.uniforms.radius.value=U.radius,e.setRenderTarget(U.mapPass),e.clear(),e.renderBufferDirect(y,null,B,E,P,null),m.uniforms.shadow_pass.value=U.mapPass.texture,m.uniforms.resolution.value=U.mapSize,m.uniforms.radius.value=U.radius,e.setRenderTarget(U.map),e.clear(),e.renderBufferDirect(y,null,B,m,P,null)}function x(U,y,B,h){let d=null;const C=B.isPointLight===!0?U.customDistanceMaterial:U.customDepthMaterial;if(C!==void 0)d=C;else if(d=B.isPointLight===!0?R:f,e.localClippingEnabled&&y.clipShadows===!0&&Array.isArray(y.clippingPlanes)&&y.clippingPlanes.length!==0||y.displacementMap&&y.displacementScale!==0||y.alphaMap&&y.alphaTest>0||y.map&&y.alphaTest>0){const q=d.uuid,V=y.uuid;let Y=_[q];Y===void 0&&(Y={},_[q]=Y);let Q=Y[V];Q===void 0&&(Q=d.clone(),Y[V]=Q,y.addEventListener("dispose",H)),d=Q}if(d.visible=y.visible,d.wireframe=y.wireframe,h===St?d.side=y.shadowSide!==null?y.shadowSide:y.side:d.side=y.shadowSide!==null?y.shadowSide:T[y.side],d.alphaMap=y.alphaMap,d.alphaTest=y.alphaTest,d.map=y.map,d.clipShadows=y.clipShadows,d.clippingPlanes=y.clippingPlanes,d.clipIntersection=y.clipIntersection,d.displacementMap=y.displacementMap,d.displacementScale=y.displacementScale,d.displacementBias=y.displacementBias,d.wireframeLinewidth=y.wireframeLinewidth,d.linewidth=y.linewidth,B.isPointLight===!0&&d.isMeshDistanceMaterial===!0){const q=e.properties.get(d);q.light=B}return d}function g(U,y,B,h,d){if(U.visible===!1)return;if(U.layers.test(y.layers)&&(U.isMesh||U.isLine||U.isPoints)&&(U.castShadow||U.receiveShadow&&d===St)&&(!U.frustumCulled||i.intersectsObject(U))){U.modelViewMatrix.multiplyMatrices(B.matrixWorldInverse,U.matrixWorld);const V=n.update(U),Y=U.material;if(Array.isArray(Y)){const Q=V.groups;for(let W=0,j=Q.length;W<j;W++){const F=Q[W],he=Y[F.materialIndex];if(he&&he.visible){const Se=x(U,he,h,d);U.onBeforeShadow(e,U,y,B,V,Se,F),e.renderBufferDirect(B,null,V,Se,U,F),U.onAfterShadow(e,U,y,B,V,Se,F)}}}else if(Y.visible){const Q=x(U,Y,h,d);U.onBeforeShadow(e,U,y,B,V,Q,null),e.renderBufferDirect(B,null,V,Q,U,null),U.onAfterShadow(e,U,y,B,V,Q,null)}}const q=U.children;for(let V=0,Y=q.length;V<Y;V++)g(q[V],y,B,h,d)}function H(U){U.target.removeEventListener("dispose",H);for(const B in _){const h=_[B],d=U.target.uuid;d in h&&(h[d].dispose(),delete h[d])}}}const Gf={[Vn]:Hn,[Gn]:On,[Bn]:Nn,[pn]:Fn,[Hn]:Vn,[On]:Gn,[Nn]:Bn,[Fn]:pn};function Hf(e,n){function t(){let S=!1;const te=new ct;let O=null;const X=new ct(0,0,0,0);return{setMask:function(oe){O!==oe&&!S&&(e.colorMask(oe,oe,oe,oe),O=oe)},setLocked:function(oe){S=oe},setClear:function(oe,ae,Ce,Qe,at){at===!0&&(oe*=Qe,ae*=Qe,Ce*=Qe),te.set(oe,ae,Ce,Qe),X.equals(te)===!1&&(e.clearColor(oe,ae,Ce,Qe),X.copy(te))},reset:function(){S=!1,O=null,X.set(-1,0,0,0)}}}function i(){let S=!1,te=!1,O=null,X=null,oe=null;return{setReversed:function(ae){if(te!==ae){const Ce=n.get("EXT_clip_control");te?Ce.clipControlEXT(Ce.LOWER_LEFT_EXT,Ce.ZERO_TO_ONE_EXT):Ce.clipControlEXT(Ce.LOWER_LEFT_EXT,Ce.NEGATIVE_ONE_TO_ONE_EXT);const Qe=oe;oe=null,this.setClear(Qe)}te=ae},getReversed:function(){return te},setTest:function(ae){ae?ie(e.DEPTH_TEST):Me(e.DEPTH_TEST)},setMask:function(ae){O!==ae&&!S&&(e.depthMask(ae),O=ae)},setFunc:function(ae){if(te&&(ae=Gf[ae]),X!==ae){switch(ae){case Vn:e.depthFunc(e.NEVER);break;case Hn:e.depthFunc(e.ALWAYS);break;case Gn:e.depthFunc(e.LESS);break;case pn:e.depthFunc(e.LEQUAL);break;case Bn:e.depthFunc(e.EQUAL);break;case Fn:e.depthFunc(e.GEQUAL);break;case On:e.depthFunc(e.GREATER);break;case Nn:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}X=ae}},setLocked:function(ae){S=ae},setClear:function(ae){oe!==ae&&(te&&(ae=1-ae),e.clearDepth(ae),oe=ae)},reset:function(){S=!1,O=null,X=null,oe=null,te=!1}}}function s(){let S=!1,te=null,O=null,X=null,oe=null,ae=null,Ce=null,Qe=null,at=null;return{setTest:function(We){S||(We?ie(e.STENCIL_TEST):Me(e.STENCIL_TEST))},setMask:function(We){te!==We&&!S&&(e.stencilMask(We),te=We)},setFunc:function(We,_t,Et){(O!==We||X!==_t||oe!==Et)&&(e.stencilFunc(We,_t,Et),O=We,X=_t,oe=Et)},setOp:function(We,_t,Et){(ae!==We||Ce!==_t||Qe!==Et)&&(e.stencilOp(We,_t,Et),ae=We,Ce=_t,Qe=Et)},setLocked:function(We){S=We},setClear:function(We){at!==We&&(e.clearStencil(We),at=We)},reset:function(){S=!1,te=null,O=null,X=null,oe=null,ae=null,Ce=null,Qe=null,at=null}}}const a=new t,p=new i,f=new s,R=new WeakMap,_=new WeakMap;let b={},T={},E=new WeakMap,m=[],N=null,P=!1,c=null,r=null,D=null,x=null,g=null,H=null,U=null,y=new Ke(0,0,0),B=0,h=!1,d=null,C=null,q=null,V=null,Y=null;const Q=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let W=!1,j=0;const F=e.getParameter(e.VERSION);F.indexOf("WebGL")!==-1?(j=parseFloat(/^WebGL (\d)/.exec(F)[1]),W=j>=1):F.indexOf("OpenGL ES")!==-1&&(j=parseFloat(/^OpenGL ES (\d)/.exec(F)[1]),W=j>=2);let he=null,Se={};const Le=e.getParameter(e.SCISSOR_BOX),He=e.getParameter(e.VIEWPORT),Ze=new ct().fromArray(Le),k=new ct().fromArray(He);function J(S,te,O,X){const oe=new Uint8Array(4),ae=e.createTexture();e.bindTexture(S,ae),e.texParameteri(S,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(S,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let Ce=0;Ce<O;Ce++)S===e.TEXTURE_3D||S===e.TEXTURE_2D_ARRAY?e.texImage3D(te,0,e.RGBA,1,1,X,0,e.RGBA,e.UNSIGNED_BYTE,oe):e.texImage2D(te+Ce,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,oe);return ae}const ue={};ue[e.TEXTURE_2D]=J(e.TEXTURE_2D,e.TEXTURE_2D,1),ue[e.TEXTURE_CUBE_MAP]=J(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ue[e.TEXTURE_2D_ARRAY]=J(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ue[e.TEXTURE_3D]=J(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),p.setClear(1),f.setClear(0),ie(e.DEPTH_TEST),p.setFunc(pn),De(!1),we(bi),ie(e.CULL_FACE),v(It);function ie(S){b[S]!==!0&&(e.enable(S),b[S]=!0)}function Me(S){b[S]!==!1&&(e.disable(S),b[S]=!1)}function Re(S,te){return T[S]!==te?(e.bindFramebuffer(S,te),T[S]=te,S===e.DRAW_FRAMEBUFFER&&(T[e.FRAMEBUFFER]=te),S===e.FRAMEBUFFER&&(T[e.DRAW_FRAMEBUFFER]=te),!0):!1}function Ue(S,te){let O=m,X=!1;if(S){O=E.get(te),O===void 0&&(O=[],E.set(te,O));const oe=S.textures;if(O.length!==oe.length||O[0]!==e.COLOR_ATTACHMENT0){for(let ae=0,Ce=oe.length;ae<Ce;ae++)O[ae]=e.COLOR_ATTACHMENT0+ae;O.length=oe.length,X=!0}}else O[0]!==e.BACK&&(O[0]=e.BACK,X=!0);X&&e.drawBuffers(O)}function $e(S){return N!==S?(e.useProgram(S),N=S,!0):!1}const ye={[Yt]:e.FUNC_ADD,[Kr]:e.FUNC_SUBTRACT,[qr]:e.FUNC_REVERSE_SUBTRACT};ye[oo]=e.MIN,ye[so]=e.MAX;const je={[ca]:e.ZERO,[la]:e.ONE,[sa]:e.SRC_COLOR,[oa]:e.SRC_ALPHA,[aa]:e.SRC_ALPHA_SATURATE,[ra]:e.DST_COLOR,[ia]:e.DST_ALPHA,[na]:e.ONE_MINUS_SRC_COLOR,[ta]:e.ONE_MINUS_SRC_ALPHA,[ea]:e.ONE_MINUS_DST_COLOR,[jr]:e.ONE_MINUS_DST_ALPHA,[Jr]:e.CONSTANT_COLOR,[Qr]:e.ONE_MINUS_CONSTANT_COLOR,[Zr]:e.CONSTANT_ALPHA,[$r]:e.ONE_MINUS_CONSTANT_ALPHA};function v(S,te,O,X,oe,ae,Ce,Qe,at,We){if(S===It){P===!0&&(Me(e.BLEND),P=!1);return}if(P===!1&&(ie(e.BLEND),P=!0),S!==Fa){if(S!==c||We!==h){if((r!==Yt||g!==Yt)&&(e.blendEquation(e.FUNC_ADD),r=Yt,g=Yt),We)switch(S){case fn:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Ui:e.blendFunc(e.ONE,e.ONE);break;case Li:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case Pi:e.blendFuncSeparate(e.ZERO,e.SRC_COLOR,e.ZERO,e.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",S);break}else switch(S){case fn:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Ui:e.blendFunc(e.SRC_ALPHA,e.ONE);break;case Li:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case Pi:e.blendFunc(e.ZERO,e.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",S);break}D=null,x=null,H=null,U=null,y.set(0,0,0),B=0,c=S,h=We}return}oe=oe||te,ae=ae||O,Ce=Ce||X,(te!==r||oe!==g)&&(e.blendEquationSeparate(ye[te],ye[oe]),r=te,g=oe),(O!==D||X!==x||ae!==H||Ce!==U)&&(e.blendFuncSeparate(je[O],je[X],je[ae],je[Ce]),D=O,x=X,H=ae,U=Ce),(Qe.equals(y)===!1||at!==B)&&(e.blendColor(Qe.r,Qe.g,Qe.b,at),y.copy(Qe),B=at),c=S,h=!1}function ut(S,te){S.side===Mt?Me(e.CULL_FACE):ie(e.CULL_FACE);let O=S.side===mt;te&&(O=!O),De(O),S.blending===fn&&S.transparent===!1?v(It):v(S.blending,S.blendEquation,S.blendSrc,S.blendDst,S.blendEquationAlpha,S.blendSrcAlpha,S.blendDstAlpha,S.blendColor,S.blendAlpha,S.premultipliedAlpha),p.setFunc(S.depthFunc),p.setTest(S.depthTest),p.setMask(S.depthWrite),a.setMask(S.colorWrite);const X=S.stencilWrite;f.setTest(X),X&&(f.setMask(S.stencilWriteMask),f.setFunc(S.stencilFunc,S.stencilRef,S.stencilFuncMask),f.setOp(S.stencilFail,S.stencilZFail,S.stencilZPass)),Xe(S.polygonOffset,S.polygonOffsetFactor,S.polygonOffsetUnits),S.alphaToCoverage===!0?ie(e.SAMPLE_ALPHA_TO_COVERAGE):Me(e.SAMPLE_ALPHA_TO_COVERAGE)}function De(S){d!==S&&(S?e.frontFace(e.CW):e.frontFace(e.CCW),d=S)}function we(S){S!==Na?(ie(e.CULL_FACE),S!==C&&(S===bi?e.cullFace(e.BACK):S===Oa?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):Me(e.CULL_FACE),C=S}function me(S){S!==q&&(W&&e.lineWidth(S),q=S)}function Xe(S,te,O){S?(ie(e.POLYGON_OFFSET_FILL),(V!==te||Y!==O)&&(e.polygonOffset(te,O),V=te,Y=O)):Me(e.POLYGON_OFFSET_FILL)}function _e(S){S?ie(e.SCISSOR_TEST):Me(e.SCISSOR_TEST)}function u(S){S===void 0&&(S=e.TEXTURE0+Q-1),he!==S&&(e.activeTexture(S),he=S)}function o(S,te,O){O===void 0&&(he===null?O=e.TEXTURE0+Q-1:O=he);let X=Se[O];X===void 0&&(X={type:void 0,texture:void 0},Se[O]=X),(X.type!==S||X.texture!==te)&&(he!==O&&(e.activeTexture(O),he=O),e.bindTexture(S,te||ue[S]),X.type=S,X.texture=te)}function L(){const S=Se[he];S!==void 0&&S.type!==void 0&&(e.bindTexture(S.type,null),S.type=void 0,S.texture=void 0)}function z(){try{e.compressedTexImage2D.apply(e,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function K(){try{e.compressedTexImage3D.apply(e,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function G(){try{e.texSubImage2D.apply(e,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function pe(){try{e.texSubImage3D.apply(e,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function re(){try{e.compressedTexSubImage2D.apply(e,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function le(){try{e.compressedTexSubImage3D.apply(e,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function Ne(){try{e.texStorage2D.apply(e,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function Z(){try{e.texStorage3D.apply(e,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function ce(){try{e.texImage2D.apply(e,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function Ee(){try{e.texImage3D.apply(e,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function Te(S){Ze.equals(S)===!1&&(e.scissor(S.x,S.y,S.z,S.w),Ze.copy(S))}function fe(S){k.equals(S)===!1&&(e.viewport(S.x,S.y,S.z,S.w),k.copy(S))}function Ie(S,te){let O=_.get(te);O===void 0&&(O=new WeakMap,_.set(te,O));let X=O.get(S);X===void 0&&(X=e.getUniformBlockIndex(te,S.name),O.set(S,X))}function be(S,te){const X=_.get(te).get(S);R.get(te)!==X&&(e.uniformBlockBinding(te,X,S.__bindingPointIndex),R.set(te,X))}function ze(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),p.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),b={},he=null,Se={},T={},E=new WeakMap,m=[],N=null,P=!1,c=null,r=null,D=null,x=null,g=null,H=null,U=null,y=new Ke(0,0,0),B=0,h=!1,d=null,C=null,q=null,V=null,Y=null,Ze.set(0,0,e.canvas.width,e.canvas.height),k.set(0,0,e.canvas.width,e.canvas.height),a.reset(),p.reset(),f.reset()}return{buffers:{color:a,depth:p,stencil:f},enable:ie,disable:Me,bindFramebuffer:Re,drawBuffers:Ue,useProgram:$e,setBlending:v,setMaterial:ut,setFlipSided:De,setCullFace:we,setLineWidth:me,setPolygonOffset:Xe,setScissorTest:_e,activeTexture:u,bindTexture:o,unbindTexture:L,compressedTexImage2D:z,compressedTexImage3D:K,texImage2D:ce,texImage3D:Ee,updateUBOMapping:Ie,uniformBlockBinding:be,texStorage2D:Ne,texStorage3D:Z,texSubImage2D:G,texSubImage3D:pe,compressedTexSubImage2D:re,compressedTexSubImage3D:le,scissor:Te,viewport:fe,reset:ze}}function Vf(e,n,t,i,s,a,p){const f=n.has("WEBGL_multisampled_render_to_texture")?n.get("WEBGL_multisampled_render_to_texture"):null,R=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),_=new ft,b=new WeakMap;let T;const E=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function N(u,o){return m?new OffscreenCanvas(u,o):no("canvas")}function P(u,o,L){let z=1;const K=_e(u);if((K.width>L||K.height>L)&&(z=L/Math.max(K.width,K.height)),z<1)if(typeof HTMLImageElement<"u"&&u instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&u instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&u instanceof ImageBitmap||typeof VideoFrame<"u"&&u instanceof VideoFrame){const G=Math.floor(z*K.width),pe=Math.floor(z*K.height);T===void 0&&(T=N(G,pe));const re=o?N(G,pe):T;return re.width=G,re.height=pe,re.getContext("2d").drawImage(u,0,0,G,pe),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+K.width+"x"+K.height+") to ("+G+"x"+pe+")."),re}else return"data"in u&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+K.width+"x"+K.height+")."),u;return u}function c(u){return u.generateMipmaps}function r(u){e.generateMipmap(u)}function D(u){return u.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:u.isWebGL3DRenderTarget?e.TEXTURE_3D:u.isWebGLArrayRenderTarget||u.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function x(u,o,L,z,K=!1){if(u!==null){if(e[u]!==void 0)return e[u];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+u+"'")}let G=o;if(o===e.RED&&(L===e.FLOAT&&(G=e.R32F),L===e.HALF_FLOAT&&(G=e.R16F),L===e.UNSIGNED_BYTE&&(G=e.R8)),o===e.RED_INTEGER&&(L===e.UNSIGNED_BYTE&&(G=e.R8UI),L===e.UNSIGNED_SHORT&&(G=e.R16UI),L===e.UNSIGNED_INT&&(G=e.R32UI),L===e.BYTE&&(G=e.R8I),L===e.SHORT&&(G=e.R16I),L===e.INT&&(G=e.R32I)),o===e.RG&&(L===e.FLOAT&&(G=e.RG32F),L===e.HALF_FLOAT&&(G=e.RG16F),L===e.UNSIGNED_BYTE&&(G=e.RG8)),o===e.RG_INTEGER&&(L===e.UNSIGNED_BYTE&&(G=e.RG8UI),L===e.UNSIGNED_SHORT&&(G=e.RG16UI),L===e.UNSIGNED_INT&&(G=e.RG32UI),L===e.BYTE&&(G=e.RG8I),L===e.SHORT&&(G=e.RG16I),L===e.INT&&(G=e.RG32I)),o===e.RGB_INTEGER&&(L===e.UNSIGNED_BYTE&&(G=e.RGB8UI),L===e.UNSIGNED_SHORT&&(G=e.RGB16UI),L===e.UNSIGNED_INT&&(G=e.RGB32UI),L===e.BYTE&&(G=e.RGB8I),L===e.SHORT&&(G=e.RGB16I),L===e.INT&&(G=e.RGB32I)),o===e.RGBA_INTEGER&&(L===e.UNSIGNED_BYTE&&(G=e.RGBA8UI),L===e.UNSIGNED_SHORT&&(G=e.RGBA16UI),L===e.UNSIGNED_INT&&(G=e.RGBA32UI),L===e.BYTE&&(G=e.RGBA8I),L===e.SHORT&&(G=e.RGBA16I),L===e.INT&&(G=e.RGBA32I)),o===e.RGB&&L===e.UNSIGNED_INT_5_9_9_9_REV&&(G=e.RGB9_E5),o===e.RGBA){const pe=K?Mr:tt.getTransfer(z);L===e.FLOAT&&(G=e.RGBA32F),L===e.HALF_FLOAT&&(G=e.RGBA16F),L===e.UNSIGNED_BYTE&&(G=pe===Ye?e.SRGB8_ALPHA8:e.RGBA8),L===e.UNSIGNED_SHORT_4_4_4_4&&(G=e.RGBA4),L===e.UNSIGNED_SHORT_5_5_5_1&&(G=e.RGB5_A1)}return(G===e.R16F||G===e.R32F||G===e.RG16F||G===e.RG32F||G===e.RGBA16F||G===e.RGBA32F)&&n.get("EXT_color_buffer_float"),G}function g(u,o){let L;return u?o===null||o===Jt||o===Qt?L=e.DEPTH24_STENCIL8:o===wt?L=e.DEPTH32F_STENCIL8:o===hn&&(L=e.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):o===null||o===Jt||o===Qt?L=e.DEPTH_COMPONENT24:o===wt?L=e.DEPTH_COMPONENT32F:o===hn&&(L=e.DEPTH_COMPONENT16),L}function H(u,o){return c(u)===!0||u.isFramebufferTexture&&u.minFilter!==$t&&u.minFilter!==Ht?Math.log2(Math.max(o.width,o.height))+1:u.mipmaps!==void 0&&u.mipmaps.length>0?u.mipmaps.length:u.isCompressedTexture&&Array.isArray(u.image)?o.mipmaps.length:1}function U(u){const o=u.target;o.removeEventListener("dispose",U),B(o),o.isVideoTexture&&b.delete(o)}function y(u){const o=u.target;o.removeEventListener("dispose",y),d(o)}function B(u){const o=i.get(u);if(o.__webglInit===void 0)return;const L=u.source,z=E.get(L);if(z){const K=z[o.__cacheKey];K.usedTimes--,K.usedTimes===0&&h(u),Object.keys(z).length===0&&E.delete(L)}i.remove(u)}function h(u){const o=i.get(u);e.deleteTexture(o.__webglTexture);const L=u.source,z=E.get(L);delete z[o.__cacheKey],p.memory.textures--}function d(u){const o=i.get(u);if(u.depthTexture&&(u.depthTexture.dispose(),i.remove(u.depthTexture)),u.isWebGLCubeRenderTarget)for(let z=0;z<6;z++){if(Array.isArray(o.__webglFramebuffer[z]))for(let K=0;K<o.__webglFramebuffer[z].length;K++)e.deleteFramebuffer(o.__webglFramebuffer[z][K]);else e.deleteFramebuffer(o.__webglFramebuffer[z]);o.__webglDepthbuffer&&e.deleteRenderbuffer(o.__webglDepthbuffer[z])}else{if(Array.isArray(o.__webglFramebuffer))for(let z=0;z<o.__webglFramebuffer.length;z++)e.deleteFramebuffer(o.__webglFramebuffer[z]);else e.deleteFramebuffer(o.__webglFramebuffer);if(o.__webglDepthbuffer&&e.deleteRenderbuffer(o.__webglDepthbuffer),o.__webglMultisampledFramebuffer&&e.deleteFramebuffer(o.__webglMultisampledFramebuffer),o.__webglColorRenderbuffer)for(let z=0;z<o.__webglColorRenderbuffer.length;z++)o.__webglColorRenderbuffer[z]&&e.deleteRenderbuffer(o.__webglColorRenderbuffer[z]);o.__webglDepthRenderbuffer&&e.deleteRenderbuffer(o.__webglDepthRenderbuffer)}const L=u.textures;for(let z=0,K=L.length;z<K;z++){const G=i.get(L[z]);G.__webglTexture&&(e.deleteTexture(G.__webglTexture),p.memory.textures--),i.remove(L[z])}i.remove(u)}let C=0;function q(){C=0}function V(){const u=C;return u>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+u+" texture units while this GPU supports only "+s.maxTextures),C+=1,u}function Y(u){const o=[];return o.push(u.wrapS),o.push(u.wrapT),o.push(u.wrapR||0),o.push(u.magFilter),o.push(u.minFilter),o.push(u.anisotropy),o.push(u.internalFormat),o.push(u.format),o.push(u.type),o.push(u.generateMipmaps),o.push(u.premultiplyAlpha),o.push(u.flipY),o.push(u.unpackAlignment),o.push(u.colorSpace),o.join()}function Q(u,o){const L=i.get(u);if(u.isVideoTexture&&me(u),u.isRenderTargetTexture===!1&&u.version>0&&L.__version!==u.version){const z=u.image;if(z===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(z.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{k(L,u,o);return}}t.bindTexture(e.TEXTURE_2D,L.__webglTexture,e.TEXTURE0+o)}function W(u,o){const L=i.get(u);if(u.version>0&&L.__version!==u.version){k(L,u,o);return}t.bindTexture(e.TEXTURE_2D_ARRAY,L.__webglTexture,e.TEXTURE0+o)}function j(u,o){const L=i.get(u);if(u.version>0&&L.__version!==u.version){k(L,u,o);return}t.bindTexture(e.TEXTURE_3D,L.__webglTexture,e.TEXTURE0+o)}function F(u,o){const L=i.get(u);if(u.version>0&&L.__version!==u.version){J(L,u,o);return}t.bindTexture(e.TEXTURE_CUBE_MAP,L.__webglTexture,e.TEXTURE0+o)}const he={[ua]:e.REPEAT,[da]:e.CLAMP_TO_EDGE,[fa]:e.MIRRORED_REPEAT},Se={[$t]:e.NEAREST,[pa]:e.NEAREST_MIPMAP_NEAREST,[nn]:e.NEAREST_MIPMAP_LINEAR,[Ht]:e.LINEAR,[Tn]:e.LINEAR_MIPMAP_NEAREST,[qt]:e.LINEAR_MIPMAP_LINEAR},Le={[Sa]:e.NEVER,[Ea]:e.ALWAYS,[ga]:e.LESS,[sr]:e.LEQUAL,[va]:e.EQUAL,[_a]:e.GEQUAL,[ma]:e.GREATER,[ha]:e.NOTEQUAL};function He(u,o){if(o.type===wt&&n.has("OES_texture_float_linear")===!1&&(o.magFilter===Ht||o.magFilter===Tn||o.magFilter===nn||o.magFilter===qt||o.minFilter===Ht||o.minFilter===Tn||o.minFilter===nn||o.minFilter===qt)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),e.texParameteri(u,e.TEXTURE_WRAP_S,he[o.wrapS]),e.texParameteri(u,e.TEXTURE_WRAP_T,he[o.wrapT]),(u===e.TEXTURE_3D||u===e.TEXTURE_2D_ARRAY)&&e.texParameteri(u,e.TEXTURE_WRAP_R,he[o.wrapR]),e.texParameteri(u,e.TEXTURE_MAG_FILTER,Se[o.magFilter]),e.texParameteri(u,e.TEXTURE_MIN_FILTER,Se[o.minFilter]),o.compareFunction&&(e.texParameteri(u,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(u,e.TEXTURE_COMPARE_FUNC,Le[o.compareFunction])),n.has("EXT_texture_filter_anisotropic")===!0){if(o.magFilter===$t||o.minFilter!==nn&&o.minFilter!==qt||o.type===wt&&n.has("OES_texture_float_linear")===!1)return;if(o.anisotropy>1||i.get(o).__currentAnisotropy){const L=n.get("EXT_texture_filter_anisotropic");e.texParameterf(u,L.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(o.anisotropy,s.getMaxAnisotropy())),i.get(o).__currentAnisotropy=o.anisotropy}}}function Ze(u,o){let L=!1;u.__webglInit===void 0&&(u.__webglInit=!0,o.addEventListener("dispose",U));const z=o.source;let K=E.get(z);K===void 0&&(K={},E.set(z,K));const G=Y(o);if(G!==u.__cacheKey){K[G]===void 0&&(K[G]={texture:e.createTexture(),usedTimes:0},p.memory.textures++,L=!0),K[G].usedTimes++;const pe=K[u.__cacheKey];pe!==void 0&&(K[u.__cacheKey].usedTimes--,pe.usedTimes===0&&h(o)),u.__cacheKey=G,u.__webglTexture=K[G].texture}return L}function k(u,o,L){let z=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(z=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(z=e.TEXTURE_3D);const K=Ze(u,o),G=o.source;t.bindTexture(z,u.__webglTexture,e.TEXTURE0+L);const pe=i.get(G);if(G.version!==pe.__version||K===!0){t.activeTexture(e.TEXTURE0+L);const re=tt.getPrimaries(tt.workingColorSpace),le=o.colorSpace===Gt?null:tt.getPrimaries(o.colorSpace),Ne=o.colorSpace===Gt||re===le?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ne);let Z=P(o.image,!1,s.maxTextureSize);Z=Xe(o,Z);const ce=a.convert(o.format,o.colorSpace),Ee=a.convert(o.type);let Te=x(o.internalFormat,ce,Ee,o.colorSpace,o.isVideoTexture);He(z,o);let fe;const Ie=o.mipmaps,be=o.isVideoTexture!==!0,ze=pe.__version===void 0||K===!0,S=G.dataReady,te=H(o,Z);if(o.isDepthTexture)Te=g(o.format===un,o.type),ze&&(be?t.texStorage2D(e.TEXTURE_2D,1,Te,Z.width,Z.height):t.texImage2D(e.TEXTURE_2D,0,Te,Z.width,Z.height,0,ce,Ee,null));else if(o.isDataTexture)if(Ie.length>0){be&&ze&&t.texStorage2D(e.TEXTURE_2D,te,Te,Ie[0].width,Ie[0].height);for(let O=0,X=Ie.length;O<X;O++)fe=Ie[O],be?S&&t.texSubImage2D(e.TEXTURE_2D,O,0,0,fe.width,fe.height,ce,Ee,fe.data):t.texImage2D(e.TEXTURE_2D,O,Te,fe.width,fe.height,0,ce,Ee,fe.data);o.generateMipmaps=!1}else be?(ze&&t.texStorage2D(e.TEXTURE_2D,te,Te,Z.width,Z.height),S&&t.texSubImage2D(e.TEXTURE_2D,0,0,0,Z.width,Z.height,ce,Ee,Z.data)):t.texImage2D(e.TEXTURE_2D,0,Te,Z.width,Z.height,0,ce,Ee,Z.data);else if(o.isCompressedTexture)if(o.isCompressedArrayTexture){be&&ze&&t.texStorage3D(e.TEXTURE_2D_ARRAY,te,Te,Ie[0].width,Ie[0].height,Z.depth);for(let O=0,X=Ie.length;O<X;O++)if(fe=Ie[O],o.format!==Tt)if(ce!==null)if(be){if(S)if(o.layerUpdates.size>0){const oe=wi(fe.width,fe.height,o.format,o.type);for(const ae of o.layerUpdates){const Ce=fe.data.subarray(ae*oe/fe.data.BYTES_PER_ELEMENT,(ae+1)*oe/fe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,O,0,0,ae,fe.width,fe.height,1,ce,Ce)}o.clearLayerUpdates()}else t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,O,0,0,0,fe.width,fe.height,Z.depth,ce,fe.data)}else t.compressedTexImage3D(e.TEXTURE_2D_ARRAY,O,Te,fe.width,fe.height,Z.depth,0,fe.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else be?S&&t.texSubImage3D(e.TEXTURE_2D_ARRAY,O,0,0,0,fe.width,fe.height,Z.depth,ce,Ee,fe.data):t.texImage3D(e.TEXTURE_2D_ARRAY,O,Te,fe.width,fe.height,Z.depth,0,ce,Ee,fe.data)}else{be&&ze&&t.texStorage2D(e.TEXTURE_2D,te,Te,Ie[0].width,Ie[0].height);for(let O=0,X=Ie.length;O<X;O++)fe=Ie[O],o.format!==Tt?ce!==null?be?S&&t.compressedTexSubImage2D(e.TEXTURE_2D,O,0,0,fe.width,fe.height,ce,fe.data):t.compressedTexImage2D(e.TEXTURE_2D,O,Te,fe.width,fe.height,0,fe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):be?S&&t.texSubImage2D(e.TEXTURE_2D,O,0,0,fe.width,fe.height,ce,Ee,fe.data):t.texImage2D(e.TEXTURE_2D,O,Te,fe.width,fe.height,0,ce,Ee,fe.data)}else if(o.isDataArrayTexture)if(be){if(ze&&t.texStorage3D(e.TEXTURE_2D_ARRAY,te,Te,Z.width,Z.height,Z.depth),S)if(o.layerUpdates.size>0){const O=wi(Z.width,Z.height,o.format,o.type);for(const X of o.layerUpdates){const oe=Z.data.subarray(X*O/Z.data.BYTES_PER_ELEMENT,(X+1)*O/Z.data.BYTES_PER_ELEMENT);t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,X,Z.width,Z.height,1,ce,Ee,oe)}o.clearLayerUpdates()}else t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,Z.width,Z.height,Z.depth,ce,Ee,Z.data)}else t.texImage3D(e.TEXTURE_2D_ARRAY,0,Te,Z.width,Z.height,Z.depth,0,ce,Ee,Z.data);else if(o.isData3DTexture)be?(ze&&t.texStorage3D(e.TEXTURE_3D,te,Te,Z.width,Z.height,Z.depth),S&&t.texSubImage3D(e.TEXTURE_3D,0,0,0,0,Z.width,Z.height,Z.depth,ce,Ee,Z.data)):t.texImage3D(e.TEXTURE_3D,0,Te,Z.width,Z.height,Z.depth,0,ce,Ee,Z.data);else if(o.isFramebufferTexture){if(ze)if(be)t.texStorage2D(e.TEXTURE_2D,te,Te,Z.width,Z.height);else{let O=Z.width,X=Z.height;for(let oe=0;oe<te;oe++)t.texImage2D(e.TEXTURE_2D,oe,Te,O,X,0,ce,Ee,null),O>>=1,X>>=1}}else if(Ie.length>0){if(be&&ze){const O=_e(Ie[0]);t.texStorage2D(e.TEXTURE_2D,te,Te,O.width,O.height)}for(let O=0,X=Ie.length;O<X;O++)fe=Ie[O],be?S&&t.texSubImage2D(e.TEXTURE_2D,O,0,0,ce,Ee,fe):t.texImage2D(e.TEXTURE_2D,O,Te,ce,Ee,fe);o.generateMipmaps=!1}else if(be){if(ze){const O=_e(Z);t.texStorage2D(e.TEXTURE_2D,te,Te,O.width,O.height)}S&&t.texSubImage2D(e.TEXTURE_2D,0,0,0,ce,Ee,Z)}else t.texImage2D(e.TEXTURE_2D,0,Te,ce,Ee,Z);c(o)&&r(z),pe.__version=G.version,o.onUpdate&&o.onUpdate(o)}u.__version=o.version}function J(u,o,L){if(o.image.length!==6)return;const z=Ze(u,o),K=o.source;t.bindTexture(e.TEXTURE_CUBE_MAP,u.__webglTexture,e.TEXTURE0+L);const G=i.get(K);if(K.version!==G.__version||z===!0){t.activeTexture(e.TEXTURE0+L);const pe=tt.getPrimaries(tt.workingColorSpace),re=o.colorSpace===Gt?null:tt.getPrimaries(o.colorSpace),le=o.colorSpace===Gt||pe===re?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,le);const Ne=o.isCompressedTexture||o.image[0].isCompressedTexture,Z=o.image[0]&&o.image[0].isDataTexture,ce=[];for(let X=0;X<6;X++)!Ne&&!Z?ce[X]=P(o.image[X],!0,s.maxCubemapSize):ce[X]=Z?o.image[X].image:o.image[X],ce[X]=Xe(o,ce[X]);const Ee=ce[0],Te=a.convert(o.format,o.colorSpace),fe=a.convert(o.type),Ie=x(o.internalFormat,Te,fe,o.colorSpace),be=o.isVideoTexture!==!0,ze=G.__version===void 0||z===!0,S=K.dataReady;let te=H(o,Ee);He(e.TEXTURE_CUBE_MAP,o);let O;if(Ne){be&&ze&&t.texStorage2D(e.TEXTURE_CUBE_MAP,te,Ie,Ee.width,Ee.height);for(let X=0;X<6;X++){O=ce[X].mipmaps;for(let oe=0;oe<O.length;oe++){const ae=O[oe];o.format!==Tt?Te!==null?be?S&&t.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,0,0,ae.width,ae.height,Te,ae.data):t.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,Ie,ae.width,ae.height,0,ae.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):be?S&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,0,0,ae.width,ae.height,Te,fe,ae.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,Ie,ae.width,ae.height,0,Te,fe,ae.data)}}}else{if(O=o.mipmaps,be&&ze){O.length>0&&te++;const X=_e(ce[0]);t.texStorage2D(e.TEXTURE_CUBE_MAP,te,Ie,X.width,X.height)}for(let X=0;X<6;X++)if(Z){be?S&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,0,0,ce[X].width,ce[X].height,Te,fe,ce[X].data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,Ie,ce[X].width,ce[X].height,0,Te,fe,ce[X].data);for(let oe=0;oe<O.length;oe++){const Ce=O[oe].image[X].image;be?S&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,0,0,Ce.width,Ce.height,Te,fe,Ce.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,Ie,Ce.width,Ce.height,0,Te,fe,Ce.data)}}else{be?S&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,0,0,Te,fe,ce[X]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,Ie,Te,fe,ce[X]);for(let oe=0;oe<O.length;oe++){const ae=O[oe];be?S&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,0,0,Te,fe,ae.image[X]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,Ie,Te,fe,ae.image[X])}}}c(o)&&r(e.TEXTURE_CUBE_MAP),G.__version=K.version,o.onUpdate&&o.onUpdate(o)}u.__version=o.version}function ue(u,o,L,z,K,G){const pe=a.convert(L.format,L.colorSpace),re=a.convert(L.type),le=x(L.internalFormat,pe,re,L.colorSpace),Ne=i.get(o),Z=i.get(L);if(Z.__renderTarget=o,!Ne.__hasExternalTextures){const ce=Math.max(1,o.width>>G),Ee=Math.max(1,o.height>>G);K===e.TEXTURE_3D||K===e.TEXTURE_2D_ARRAY?t.texImage3D(K,G,le,ce,Ee,o.depth,0,pe,re,null):t.texImage2D(K,G,le,ce,Ee,0,pe,re,null)}t.bindFramebuffer(e.FRAMEBUFFER,u),we(o)?f.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,z,K,Z.__webglTexture,0,De(o)):(K===e.TEXTURE_2D||K>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&K<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,z,K,Z.__webglTexture,G),t.bindFramebuffer(e.FRAMEBUFFER,null)}function ie(u,o,L){if(e.bindRenderbuffer(e.RENDERBUFFER,u),o.depthBuffer){const z=o.depthTexture,K=z&&z.isDepthTexture?z.type:null,G=g(o.stencilBuffer,K),pe=o.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,re=De(o);we(o)?f.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,re,G,o.width,o.height):L?e.renderbufferStorageMultisample(e.RENDERBUFFER,re,G,o.width,o.height):e.renderbufferStorage(e.RENDERBUFFER,G,o.width,o.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,pe,e.RENDERBUFFER,u)}else{const z=o.textures;for(let K=0;K<z.length;K++){const G=z[K],pe=a.convert(G.format,G.colorSpace),re=a.convert(G.type),le=x(G.internalFormat,pe,re,G.colorSpace),Ne=De(o);L&&we(o)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,Ne,le,o.width,o.height):we(o)?f.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Ne,le,o.width,o.height):e.renderbufferStorage(e.RENDERBUFFER,le,o.width,o.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Me(u,o){if(o&&o.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(e.FRAMEBUFFER,u),!(o.depthTexture&&o.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const z=i.get(o.depthTexture);z.__renderTarget=o,(!z.__webglTexture||o.depthTexture.image.width!==o.width||o.depthTexture.image.height!==o.height)&&(o.depthTexture.image.width=o.width,o.depthTexture.image.height=o.height,o.depthTexture.needsUpdate=!0),Q(o.depthTexture,0);const K=z.__webglTexture,G=De(o);if(o.depthTexture.format===Yn)we(o)?f.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,K,0,G):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,K,0);else if(o.depthTexture.format===un)we(o)?f.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,K,0,G):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,K,0);else throw new Error("Unknown depthTexture format")}function Re(u){const o=i.get(u),L=u.isWebGLCubeRenderTarget===!0;if(o.__boundDepthTexture!==u.depthTexture){const z=u.depthTexture;if(o.__depthDisposeCallback&&o.__depthDisposeCallback(),z){const K=()=>{delete o.__boundDepthTexture,delete o.__depthDisposeCallback,z.removeEventListener("dispose",K)};z.addEventListener("dispose",K),o.__depthDisposeCallback=K}o.__boundDepthTexture=z}if(u.depthTexture&&!o.__autoAllocateDepthBuffer){if(L)throw new Error("target.depthTexture not supported in Cube render targets");Me(o.__webglFramebuffer,u)}else if(L){o.__webglDepthbuffer=[];for(let z=0;z<6;z++)if(t.bindFramebuffer(e.FRAMEBUFFER,o.__webglFramebuffer[z]),o.__webglDepthbuffer[z]===void 0)o.__webglDepthbuffer[z]=e.createRenderbuffer(),ie(o.__webglDepthbuffer[z],u,!1);else{const K=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,G=o.__webglDepthbuffer[z];e.bindRenderbuffer(e.RENDERBUFFER,G),e.framebufferRenderbuffer(e.FRAMEBUFFER,K,e.RENDERBUFFER,G)}}else if(t.bindFramebuffer(e.FRAMEBUFFER,o.__webglFramebuffer),o.__webglDepthbuffer===void 0)o.__webglDepthbuffer=e.createRenderbuffer(),ie(o.__webglDepthbuffer,u,!1);else{const z=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,K=o.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,K),e.framebufferRenderbuffer(e.FRAMEBUFFER,z,e.RENDERBUFFER,K)}t.bindFramebuffer(e.FRAMEBUFFER,null)}function Ue(u,o,L){const z=i.get(u);o!==void 0&&ue(z.__webglFramebuffer,u,u.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),L!==void 0&&Re(u)}function $e(u){const o=u.texture,L=i.get(u),z=i.get(o);u.addEventListener("dispose",y);const K=u.textures,G=u.isWebGLCubeRenderTarget===!0,pe=K.length>1;if(pe||(z.__webglTexture===void 0&&(z.__webglTexture=e.createTexture()),z.__version=o.version,p.memory.textures++),G){L.__webglFramebuffer=[];for(let re=0;re<6;re++)if(o.mipmaps&&o.mipmaps.length>0){L.__webglFramebuffer[re]=[];for(let le=0;le<o.mipmaps.length;le++)L.__webglFramebuffer[re][le]=e.createFramebuffer()}else L.__webglFramebuffer[re]=e.createFramebuffer()}else{if(o.mipmaps&&o.mipmaps.length>0){L.__webglFramebuffer=[];for(let re=0;re<o.mipmaps.length;re++)L.__webglFramebuffer[re]=e.createFramebuffer()}else L.__webglFramebuffer=e.createFramebuffer();if(pe)for(let re=0,le=K.length;re<le;re++){const Ne=i.get(K[re]);Ne.__webglTexture===void 0&&(Ne.__webglTexture=e.createTexture(),p.memory.textures++)}if(u.samples>0&&we(u)===!1){L.__webglMultisampledFramebuffer=e.createFramebuffer(),L.__webglColorRenderbuffer=[],t.bindFramebuffer(e.FRAMEBUFFER,L.__webglMultisampledFramebuffer);for(let re=0;re<K.length;re++){const le=K[re];L.__webglColorRenderbuffer[re]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,L.__webglColorRenderbuffer[re]);const Ne=a.convert(le.format,le.colorSpace),Z=a.convert(le.type),ce=x(le.internalFormat,Ne,Z,le.colorSpace,u.isXRRenderTarget===!0),Ee=De(u);e.renderbufferStorageMultisample(e.RENDERBUFFER,Ee,ce,u.width,u.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+re,e.RENDERBUFFER,L.__webglColorRenderbuffer[re])}e.bindRenderbuffer(e.RENDERBUFFER,null),u.depthBuffer&&(L.__webglDepthRenderbuffer=e.createRenderbuffer(),ie(L.__webglDepthRenderbuffer,u,!0)),t.bindFramebuffer(e.FRAMEBUFFER,null)}}if(G){t.bindTexture(e.TEXTURE_CUBE_MAP,z.__webglTexture),He(e.TEXTURE_CUBE_MAP,o);for(let re=0;re<6;re++)if(o.mipmaps&&o.mipmaps.length>0)for(let le=0;le<o.mipmaps.length;le++)ue(L.__webglFramebuffer[re][le],u,o,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+re,le);else ue(L.__webglFramebuffer[re],u,o,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+re,0);c(o)&&r(e.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(pe){for(let re=0,le=K.length;re<le;re++){const Ne=K[re],Z=i.get(Ne);t.bindTexture(e.TEXTURE_2D,Z.__webglTexture),He(e.TEXTURE_2D,Ne),ue(L.__webglFramebuffer,u,Ne,e.COLOR_ATTACHMENT0+re,e.TEXTURE_2D,0),c(Ne)&&r(e.TEXTURE_2D)}t.unbindTexture()}else{let re=e.TEXTURE_2D;if((u.isWebGL3DRenderTarget||u.isWebGLArrayRenderTarget)&&(re=u.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),t.bindTexture(re,z.__webglTexture),He(re,o),o.mipmaps&&o.mipmaps.length>0)for(let le=0;le<o.mipmaps.length;le++)ue(L.__webglFramebuffer[le],u,o,e.COLOR_ATTACHMENT0,re,le);else ue(L.__webglFramebuffer,u,o,e.COLOR_ATTACHMENT0,re,0);c(o)&&r(re),t.unbindTexture()}u.depthBuffer&&Re(u)}function ye(u){const o=u.textures;for(let L=0,z=o.length;L<z;L++){const K=o[L];if(c(K)){const G=D(u),pe=i.get(K).__webglTexture;t.bindTexture(G,pe),r(G),t.unbindTexture()}}}const je=[],v=[];function ut(u){if(u.samples>0){if(we(u)===!1){const o=u.textures,L=u.width,z=u.height;let K=e.COLOR_BUFFER_BIT;const G=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,pe=i.get(u),re=o.length>1;if(re)for(let le=0;le<o.length;le++)t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+le,e.RENDERBUFFER,null),t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+le,e.TEXTURE_2D,null,0);t.bindFramebuffer(e.READ_FRAMEBUFFER,pe.__webglMultisampledFramebuffer),t.bindFramebuffer(e.DRAW_FRAMEBUFFER,pe.__webglFramebuffer);for(let le=0;le<o.length;le++){if(u.resolveDepthBuffer&&(u.depthBuffer&&(K|=e.DEPTH_BUFFER_BIT),u.stencilBuffer&&u.resolveStencilBuffer&&(K|=e.STENCIL_BUFFER_BIT)),re){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,pe.__webglColorRenderbuffer[le]);const Ne=i.get(o[le]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,Ne,0)}e.blitFramebuffer(0,0,L,z,0,0,L,z,K,e.NEAREST),R===!0&&(je.length=0,v.length=0,je.push(e.COLOR_ATTACHMENT0+le),u.depthBuffer&&u.resolveDepthBuffer===!1&&(je.push(G),v.push(G),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,v)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,je))}if(t.bindFramebuffer(e.READ_FRAMEBUFFER,null),t.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),re)for(let le=0;le<o.length;le++){t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+le,e.RENDERBUFFER,pe.__webglColorRenderbuffer[le]);const Ne=i.get(o[le]).__webglTexture;t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+le,e.TEXTURE_2D,Ne,0)}t.bindFramebuffer(e.DRAW_FRAMEBUFFER,pe.__webglMultisampledFramebuffer)}else if(u.depthBuffer&&u.resolveDepthBuffer===!1&&R){const o=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[o])}}}function De(u){return Math.min(s.maxSamples,u.samples)}function we(u){const o=i.get(u);return u.samples>0&&n.has("WEBGL_multisampled_render_to_texture")===!0&&o.__useRenderToTexture!==!1}function me(u){const o=p.render.frame;b.get(u)!==o&&(b.set(u,o),u.update())}function Xe(u,o){const L=u.colorSpace,z=u.format,K=u.type;return u.isCompressedTexture===!0||u.isVideoTexture===!0||L!==vn&&L!==Gt&&(tt.getTransfer(L)===Ye?(z!==Tt||K!==yt)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",L)),o}function _e(u){return typeof HTMLImageElement<"u"&&u instanceof HTMLImageElement?(_.width=u.naturalWidth||u.width,_.height=u.naturalHeight||u.height):typeof VideoFrame<"u"&&u instanceof VideoFrame?(_.width=u.displayWidth,_.height=u.displayHeight):(_.width=u.width,_.height=u.height),_}this.allocateTextureUnit=V,this.resetTextureUnits=q,this.setTexture2D=Q,this.setTexture2DArray=W,this.setTexture3D=j,this.setTextureCube=F,this.rebindTextures=Ue,this.setupRenderTarget=$e,this.updateRenderTargetMipmap=ye,this.updateMultisampleRenderTarget=ut,this.setupDepthRenderbuffer=Re,this.setupFrameBufferTexture=ue,this.useMultisampledRTT=we}function kf(e,n){function t(i,s=Gt){let a;const p=tt.getTransfer(s);if(i===yt)return e.UNSIGNED_BYTE;if(i===fr)return e.UNSIGNED_SHORT_4_4_4_4;if(i===dr)return e.UNSIGNED_SHORT_5_5_5_1;if(i===Ra)return e.UNSIGNED_INT_5_9_9_9_REV;if(i===Ca)return e.BYTE;if(i===ba)return e.SHORT;if(i===hn)return e.UNSIGNED_SHORT;if(i===hr)return e.INT;if(i===Jt)return e.UNSIGNED_INT;if(i===wt)return e.FLOAT;if(i===_n)return e.HALF_FLOAT;if(i===Pa)return e.ALPHA;if(i===La)return e.RGB;if(i===Tt)return e.RGBA;if(i===Ua)return e.LUMINANCE;if(i===Da)return e.LUMINANCE_ALPHA;if(i===Yn)return e.DEPTH_COMPONENT;if(i===un)return e.DEPTH_STENCIL;if(i===wa)return e.RED;if(i===mr)return e.RED_INTEGER;if(i===Ia)return e.RG;if(i===_r)return e.RG_INTEGER;if(i===vr)return e.RGBA_INTEGER;if(i===xn||i===An||i===Rn||i===Cn)if(p===Ye)if(a=n.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(i===xn)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===An)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Rn)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Cn)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=n.get("WEBGL_compressed_texture_s3tc"),a!==null){if(i===xn)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===An)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Rn)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Cn)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===ti||i===ni||i===ii||i===ri)if(a=n.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(i===ti)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===ni)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===ii)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===ri)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===ai||i===oi||i===si)if(a=n.get("WEBGL_compressed_texture_etc"),a!==null){if(i===ai||i===oi)return p===Ye?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(i===si)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===li||i===ci||i===fi||i===di||i===ui||i===pi||i===hi||i===mi||i===_i||i===vi||i===gi||i===Ei||i===Si||i===Mi)if(a=n.get("WEBGL_compressed_texture_astc"),a!==null){if(i===li)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===ci)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===fi)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===di)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===ui)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===pi)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===hi)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===mi)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===_i)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===vi)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===gi)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Ei)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Si)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Mi)return p===Ye?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===bn||i===Ti||i===xi)if(a=n.get("EXT_texture_compression_bptc"),a!==null){if(i===bn)return p===Ye?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Ti)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===xi)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===ya||i===Ai||i===Ri||i===Ci)if(a=n.get("EXT_texture_compression_rgtc"),a!==null){if(i===bn)return a.COMPRESSED_RED_RGTC1_EXT;if(i===Ai)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Ri)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Ci)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Qt?e.UNSIGNED_INT_24_8:e[i]!==void 0?e[i]:null}return{convert:t}}const Wf={type:"move"};class yn{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new rn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new rn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new Ge,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new Ge),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new rn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new Ge,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new Ge),this._grip}dispatchEvent(n){return this._targetRay!==null&&this._targetRay.dispatchEvent(n),this._grip!==null&&this._grip.dispatchEvent(n),this._hand!==null&&this._hand.dispatchEvent(n),this}connect(n){if(n&&n.hand){const t=this._hand;if(t)for(const i of n.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:n}),this}disconnect(n){return this.dispatchEvent({type:"disconnected",data:n}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(n,t,i){let s=null,a=null,p=null;const f=this._targetRay,R=this._grip,_=this._hand;if(n&&t.session.visibilityState!=="visible-blurred"){if(_&&n.hand){p=!0;for(const P of n.hand.values()){const c=t.getJointPose(P,i),r=this._getHandJoint(_,P);c!==null&&(r.matrix.fromArray(c.transform.matrix),r.matrix.decompose(r.position,r.rotation,r.scale),r.matrixWorldNeedsUpdate=!0,r.jointRadius=c.radius),r.visible=c!==null}const b=_.joints["index-finger-tip"],T=_.joints["thumb-tip"],E=b.position.distanceTo(T.position),m=.02,N=.005;_.inputState.pinching&&E>m+N?(_.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:n.handedness,target:this})):!_.inputState.pinching&&E<=m-N&&(_.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:n.handedness,target:this}))}else R!==null&&n.gripSpace&&(a=t.getPose(n.gripSpace,i),a!==null&&(R.matrix.fromArray(a.transform.matrix),R.matrix.decompose(R.position,R.rotation,R.scale),R.matrixWorldNeedsUpdate=!0,a.linearVelocity?(R.hasLinearVelocity=!0,R.linearVelocity.copy(a.linearVelocity)):R.hasLinearVelocity=!1,a.angularVelocity?(R.hasAngularVelocity=!0,R.angularVelocity.copy(a.angularVelocity)):R.hasAngularVelocity=!1));f!==null&&(s=t.getPose(n.targetRaySpace,i),s===null&&a!==null&&(s=a),s!==null&&(f.matrix.fromArray(s.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,s.linearVelocity?(f.hasLinearVelocity=!0,f.linearVelocity.copy(s.linearVelocity)):f.hasLinearVelocity=!1,s.angularVelocity?(f.hasAngularVelocity=!0,f.angularVelocity.copy(s.angularVelocity)):f.hasAngularVelocity=!1,this.dispatchEvent(Wf)))}return f!==null&&(f.visible=s!==null),R!==null&&(R.visible=a!==null),_!==null&&(_.visible=p!==null),this}_getHandJoint(n,t){if(n.joints[t.jointName]===void 0){const i=new rn;i.matrixAutoUpdate=!1,i.visible=!1,n.joints[t.jointName]=i,n.add(i)}return n.joints[t.jointName]}}const zf=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Xf=`
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

}`;class Yf{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(n,t,i){if(this.texture===null){const s=new ur,a=n.properties.get(s);a.__webglTexture=t.texture,(t.depthNear!=i.depthNear||t.depthFar!=i.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=s}}getMesh(n){if(this.texture!==null&&this.mesh===null){const t=n.cameras[0].viewport,i=new Nt({vertexShader:zf,fragmentShader:Xf,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new xt(new pr(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class qf extends kr{constructor(n,t){super();const i=this;let s=null,a=1,p=null,f="local-floor",R=1,_=null,b=null,T=null,E=null,m=null,N=null;const P=new Yf,c=t.getContextAttributes();let r=null,D=null;const x=[],g=[],H=new ft;let U=null;const y=new ln;y.viewport=new ct;const B=new ln;B.viewport=new ct;const h=[y,B],d=new Wr;let C=null,q=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(k){let J=x[k];return J===void 0&&(J=new yn,x[k]=J),J.getTargetRaySpace()},this.getControllerGrip=function(k){let J=x[k];return J===void 0&&(J=new yn,x[k]=J),J.getGripSpace()},this.getHand=function(k){let J=x[k];return J===void 0&&(J=new yn,x[k]=J),J.getHandSpace()};function V(k){const J=g.indexOf(k.inputSource);if(J===-1)return;const ue=x[J];ue!==void 0&&(ue.update(k.inputSource,k.frame,_||p),ue.dispatchEvent({type:k.type,data:k.inputSource}))}function Y(){s.removeEventListener("select",V),s.removeEventListener("selectstart",V),s.removeEventListener("selectend",V),s.removeEventListener("squeeze",V),s.removeEventListener("squeezestart",V),s.removeEventListener("squeezeend",V),s.removeEventListener("end",Y),s.removeEventListener("inputsourceschange",Q);for(let k=0;k<x.length;k++){const J=g[k];J!==null&&(g[k]=null,x[k].disconnect(J))}C=null,q=null,P.reset(),n.setRenderTarget(r),m=null,E=null,T=null,s=null,D=null,Ze.stop(),i.isPresenting=!1,n.setPixelRatio(U),n.setSize(H.width,H.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(k){a=k,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(k){f=k,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return _||p},this.setReferenceSpace=function(k){_=k},this.getBaseLayer=function(){return E!==null?E:m},this.getBinding=function(){return T},this.getFrame=function(){return N},this.getSession=function(){return s},this.setSession=async function(k){if(s=k,s!==null){if(r=n.getRenderTarget(),s.addEventListener("select",V),s.addEventListener("selectstart",V),s.addEventListener("selectend",V),s.addEventListener("squeeze",V),s.addEventListener("squeezestart",V),s.addEventListener("squeezeend",V),s.addEventListener("end",Y),s.addEventListener("inputsourceschange",Q),c.xrCompatible!==!0&&await t.makeXRCompatible(),U=n.getPixelRatio(),n.getSize(H),s.renderState.layers===void 0){const J={antialias:c.antialias,alpha:!0,depth:c.depth,stencil:c.stencil,framebufferScaleFactor:a};m=new XRWebGLLayer(s,t,J),s.updateRenderState({baseLayer:m}),n.setPixelRatio(1),n.setSize(m.framebufferWidth,m.framebufferHeight,!1),D=new kt(m.framebufferWidth,m.framebufferHeight,{format:Tt,type:yt,colorSpace:n.outputColorSpace,stencilBuffer:c.stencil})}else{let J=null,ue=null,ie=null;c.depth&&(ie=c.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,J=c.stencil?un:Yn,ue=c.stencil?Qt:Jt);const Me={colorFormat:t.RGBA8,depthFormat:ie,scaleFactor:a};T=new XRWebGLBinding(s,t),E=T.createProjectionLayer(Me),s.updateRenderState({layers:[E]}),n.setPixelRatio(1),n.setSize(E.textureWidth,E.textureHeight,!1),D=new kt(E.textureWidth,E.textureHeight,{format:Tt,type:yt,depthTexture:new ar(E.textureWidth,E.textureHeight,ue,void 0,void 0,void 0,void 0,void 0,void 0,J),stencilBuffer:c.stencil,colorSpace:n.outputColorSpace,samples:c.antialias?4:0,resolveDepthBuffer:E.ignoreDepthValues===!1})}D.isXRRenderTarget=!0,this.setFoveation(R),_=null,p=await s.requestReferenceSpace(f),Ze.setContext(s),Ze.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return P.getDepthTexture()};function Q(k){for(let J=0;J<k.removed.length;J++){const ue=k.removed[J],ie=g.indexOf(ue);ie>=0&&(g[ie]=null,x[ie].disconnect(ue))}for(let J=0;J<k.added.length;J++){const ue=k.added[J];let ie=g.indexOf(ue);if(ie===-1){for(let Re=0;Re<x.length;Re++)if(Re>=g.length){g.push(ue),ie=Re;break}else if(g[Re]===null){g[Re]=ue,ie=Re;break}if(ie===-1)break}const Me=x[ie];Me&&Me.connect(ue)}}const W=new Ge,j=new Ge;function F(k,J,ue){W.setFromMatrixPosition(J.matrixWorld),j.setFromMatrixPosition(ue.matrixWorld);const ie=W.distanceTo(j),Me=J.projectionMatrix.elements,Re=ue.projectionMatrix.elements,Ue=Me[14]/(Me[10]-1),$e=Me[14]/(Me[10]+1),ye=(Me[9]+1)/Me[5],je=(Me[9]-1)/Me[5],v=(Me[8]-1)/Me[0],ut=(Re[8]+1)/Re[0],De=Ue*v,we=Ue*ut,me=ie/(-v+ut),Xe=me*-v;if(J.matrixWorld.decompose(k.position,k.quaternion,k.scale),k.translateX(Xe),k.translateZ(me),k.matrixWorld.compose(k.position,k.quaternion,k.scale),k.matrixWorldInverse.copy(k.matrixWorld).invert(),Me[10]===-1)k.projectionMatrix.copy(J.projectionMatrix),k.projectionMatrixInverse.copy(J.projectionMatrixInverse);else{const _e=Ue+me,u=$e+me,o=De-Xe,L=we+(ie-Xe),z=ye*$e/u*_e,K=je*$e/u*_e;k.projectionMatrix.makePerspective(o,L,z,K,_e,u),k.projectionMatrixInverse.copy(k.projectionMatrix).invert()}}function he(k,J){J===null?k.matrixWorld.copy(k.matrix):k.matrixWorld.multiplyMatrices(J.matrixWorld,k.matrix),k.matrixWorldInverse.copy(k.matrixWorld).invert()}this.updateCamera=function(k){if(s===null)return;let J=k.near,ue=k.far;P.texture!==null&&(P.depthNear>0&&(J=P.depthNear),P.depthFar>0&&(ue=P.depthFar)),d.near=B.near=y.near=J,d.far=B.far=y.far=ue,(C!==d.near||q!==d.far)&&(s.updateRenderState({depthNear:d.near,depthFar:d.far}),C=d.near,q=d.far),y.layers.mask=k.layers.mask|2,B.layers.mask=k.layers.mask|4,d.layers.mask=y.layers.mask|B.layers.mask;const ie=k.parent,Me=d.cameras;he(d,ie);for(let Re=0;Re<Me.length;Re++)he(Me[Re],ie);Me.length===2?F(d,y,B):d.projectionMatrix.copy(y.projectionMatrix),Se(k,d,ie)};function Se(k,J,ue){ue===null?k.matrix.copy(J.matrixWorld):(k.matrix.copy(ue.matrixWorld),k.matrix.invert(),k.matrix.multiply(J.matrixWorld)),k.matrix.decompose(k.position,k.quaternion,k.scale),k.updateMatrixWorld(!0),k.projectionMatrix.copy(J.projectionMatrix),k.projectionMatrixInverse.copy(J.projectionMatrixInverse),k.isPerspectiveCamera&&(k.fov=zr*2*Math.atan(1/k.projectionMatrix.elements[5]),k.zoom=1)}this.getCamera=function(){return d},this.getFoveation=function(){if(!(E===null&&m===null))return R},this.setFoveation=function(k){R=k,E!==null&&(E.fixedFoveation=k),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=k)},this.hasDepthSensing=function(){return P.texture!==null},this.getDepthSensingMesh=function(){return P.getMesh(d)};let Le=null;function He(k,J){if(b=J.getViewerPose(_||p),N=J,b!==null){const ue=b.views;m!==null&&(n.setRenderTargetFramebuffer(D,m.framebuffer),n.setRenderTarget(D));let ie=!1;ue.length!==d.cameras.length&&(d.cameras.length=0,ie=!0);for(let Re=0;Re<ue.length;Re++){const Ue=ue[Re];let $e=null;if(m!==null)$e=m.getViewport(Ue);else{const je=T.getViewSubImage(E,Ue);$e=je.viewport,Re===0&&(n.setRenderTargetTextures(D,je.colorTexture,E.ignoreDepthValues?void 0:je.depthStencilTexture),n.setRenderTarget(D))}let ye=h[Re];ye===void 0&&(ye=new ln,ye.layers.enable(Re),ye.viewport=new ct,h[Re]=ye),ye.matrix.fromArray(Ue.transform.matrix),ye.matrix.decompose(ye.position,ye.quaternion,ye.scale),ye.projectionMatrix.fromArray(Ue.projectionMatrix),ye.projectionMatrixInverse.copy(ye.projectionMatrix).invert(),ye.viewport.set($e.x,$e.y,$e.width,$e.height),Re===0&&(d.matrix.copy(ye.matrix),d.matrix.decompose(d.position,d.quaternion,d.scale)),ie===!0&&d.cameras.push(ye)}const Me=s.enabledFeatures;if(Me&&Me.includes("depth-sensing")){const Re=T.getDepthInformation(ue[0]);Re&&Re.isValid&&Re.texture&&P.init(n,Re,s.renderState)}}for(let ue=0;ue<x.length;ue++){const ie=g[ue],Me=x[ue];ie!==null&&Me!==void 0&&Me.update(ie,J,_||p)}Le&&Le(k,J),J.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:J}),N=null}const Ze=new Tr;Ze.setAnimationLoop(He),this.setAnimationLoop=function(k){Le=k},this.dispose=function(){}}}const Lt=new Sr,Kf=new Rt;function $f(e,n){function t(c,r){c.matrixAutoUpdate===!0&&c.updateMatrix(),r.value.copy(c.matrix)}function i(c,r){r.color.getRGB(c.fogColor.value,Er(e)),r.isFog?(c.fogNear.value=r.near,c.fogFar.value=r.far):r.isFogExp2&&(c.fogDensity.value=r.density)}function s(c,r,D,x,g){r.isMeshBasicMaterial||r.isMeshLambertMaterial?a(c,r):r.isMeshToonMaterial?(a(c,r),T(c,r)):r.isMeshPhongMaterial?(a(c,r),b(c,r)):r.isMeshStandardMaterial?(a(c,r),E(c,r),r.isMeshPhysicalMaterial&&m(c,r,g)):r.isMeshMatcapMaterial?(a(c,r),N(c,r)):r.isMeshDepthMaterial?a(c,r):r.isMeshDistanceMaterial?(a(c,r),P(c,r)):r.isMeshNormalMaterial?a(c,r):r.isLineBasicMaterial?(p(c,r),r.isLineDashedMaterial&&f(c,r)):r.isPointsMaterial?R(c,r,D,x):r.isSpriteMaterial?_(c,r):r.isShadowMaterial?(c.color.value.copy(r.color),c.opacity.value=r.opacity):r.isShaderMaterial&&(r.uniformsNeedUpdate=!1)}function a(c,r){c.opacity.value=r.opacity,r.color&&c.diffuse.value.copy(r.color),r.emissive&&c.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(c.map.value=r.map,t(r.map,c.mapTransform)),r.alphaMap&&(c.alphaMap.value=r.alphaMap,t(r.alphaMap,c.alphaMapTransform)),r.bumpMap&&(c.bumpMap.value=r.bumpMap,t(r.bumpMap,c.bumpMapTransform),c.bumpScale.value=r.bumpScale,r.side===mt&&(c.bumpScale.value*=-1)),r.normalMap&&(c.normalMap.value=r.normalMap,t(r.normalMap,c.normalMapTransform),c.normalScale.value.copy(r.normalScale),r.side===mt&&c.normalScale.value.negate()),r.displacementMap&&(c.displacementMap.value=r.displacementMap,t(r.displacementMap,c.displacementMapTransform),c.displacementScale.value=r.displacementScale,c.displacementBias.value=r.displacementBias),r.emissiveMap&&(c.emissiveMap.value=r.emissiveMap,t(r.emissiveMap,c.emissiveMapTransform)),r.specularMap&&(c.specularMap.value=r.specularMap,t(r.specularMap,c.specularMapTransform)),r.alphaTest>0&&(c.alphaTest.value=r.alphaTest);const D=n.get(r),x=D.envMap,g=D.envMapRotation;x&&(c.envMap.value=x,Lt.copy(g),Lt.x*=-1,Lt.y*=-1,Lt.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(Lt.y*=-1,Lt.z*=-1),c.envMapRotation.value.setFromMatrix4(Kf.makeRotationFromEuler(Lt)),c.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,c.reflectivity.value=r.reflectivity,c.ior.value=r.ior,c.refractionRatio.value=r.refractionRatio),r.lightMap&&(c.lightMap.value=r.lightMap,c.lightMapIntensity.value=r.lightMapIntensity,t(r.lightMap,c.lightMapTransform)),r.aoMap&&(c.aoMap.value=r.aoMap,c.aoMapIntensity.value=r.aoMapIntensity,t(r.aoMap,c.aoMapTransform))}function p(c,r){c.diffuse.value.copy(r.color),c.opacity.value=r.opacity,r.map&&(c.map.value=r.map,t(r.map,c.mapTransform))}function f(c,r){c.dashSize.value=r.dashSize,c.totalSize.value=r.dashSize+r.gapSize,c.scale.value=r.scale}function R(c,r,D,x){c.diffuse.value.copy(r.color),c.opacity.value=r.opacity,c.size.value=r.size*D,c.scale.value=x*.5,r.map&&(c.map.value=r.map,t(r.map,c.uvTransform)),r.alphaMap&&(c.alphaMap.value=r.alphaMap,t(r.alphaMap,c.alphaMapTransform)),r.alphaTest>0&&(c.alphaTest.value=r.alphaTest)}function _(c,r){c.diffuse.value.copy(r.color),c.opacity.value=r.opacity,c.rotation.value=r.rotation,r.map&&(c.map.value=r.map,t(r.map,c.mapTransform)),r.alphaMap&&(c.alphaMap.value=r.alphaMap,t(r.alphaMap,c.alphaMapTransform)),r.alphaTest>0&&(c.alphaTest.value=r.alphaTest)}function b(c,r){c.specular.value.copy(r.specular),c.shininess.value=Math.max(r.shininess,1e-4)}function T(c,r){r.gradientMap&&(c.gradientMap.value=r.gradientMap)}function E(c,r){c.metalness.value=r.metalness,r.metalnessMap&&(c.metalnessMap.value=r.metalnessMap,t(r.metalnessMap,c.metalnessMapTransform)),c.roughness.value=r.roughness,r.roughnessMap&&(c.roughnessMap.value=r.roughnessMap,t(r.roughnessMap,c.roughnessMapTransform)),r.envMap&&(c.envMapIntensity.value=r.envMapIntensity)}function m(c,r,D){c.ior.value=r.ior,r.sheen>0&&(c.sheenColor.value.copy(r.sheenColor).multiplyScalar(r.sheen),c.sheenRoughness.value=r.sheenRoughness,r.sheenColorMap&&(c.sheenColorMap.value=r.sheenColorMap,t(r.sheenColorMap,c.sheenColorMapTransform)),r.sheenRoughnessMap&&(c.sheenRoughnessMap.value=r.sheenRoughnessMap,t(r.sheenRoughnessMap,c.sheenRoughnessMapTransform))),r.clearcoat>0&&(c.clearcoat.value=r.clearcoat,c.clearcoatRoughness.value=r.clearcoatRoughness,r.clearcoatMap&&(c.clearcoatMap.value=r.clearcoatMap,t(r.clearcoatMap,c.clearcoatMapTransform)),r.clearcoatRoughnessMap&&(c.clearcoatRoughnessMap.value=r.clearcoatRoughnessMap,t(r.clearcoatRoughnessMap,c.clearcoatRoughnessMapTransform)),r.clearcoatNormalMap&&(c.clearcoatNormalMap.value=r.clearcoatNormalMap,t(r.clearcoatNormalMap,c.clearcoatNormalMapTransform),c.clearcoatNormalScale.value.copy(r.clearcoatNormalScale),r.side===mt&&c.clearcoatNormalScale.value.negate())),r.dispersion>0&&(c.dispersion.value=r.dispersion),r.iridescence>0&&(c.iridescence.value=r.iridescence,c.iridescenceIOR.value=r.iridescenceIOR,c.iridescenceThicknessMinimum.value=r.iridescenceThicknessRange[0],c.iridescenceThicknessMaximum.value=r.iridescenceThicknessRange[1],r.iridescenceMap&&(c.iridescenceMap.value=r.iridescenceMap,t(r.iridescenceMap,c.iridescenceMapTransform)),r.iridescenceThicknessMap&&(c.iridescenceThicknessMap.value=r.iridescenceThicknessMap,t(r.iridescenceThicknessMap,c.iridescenceThicknessMapTransform))),r.transmission>0&&(c.transmission.value=r.transmission,c.transmissionSamplerMap.value=D.texture,c.transmissionSamplerSize.value.set(D.width,D.height),r.transmissionMap&&(c.transmissionMap.value=r.transmissionMap,t(r.transmissionMap,c.transmissionMapTransform)),c.thickness.value=r.thickness,r.thicknessMap&&(c.thicknessMap.value=r.thicknessMap,t(r.thicknessMap,c.thicknessMapTransform)),c.attenuationDistance.value=r.attenuationDistance,c.attenuationColor.value.copy(r.attenuationColor)),r.anisotropy>0&&(c.anisotropyVector.value.set(r.anisotropy*Math.cos(r.anisotropyRotation),r.anisotropy*Math.sin(r.anisotropyRotation)),r.anisotropyMap&&(c.anisotropyMap.value=r.anisotropyMap,t(r.anisotropyMap,c.anisotropyMapTransform))),c.specularIntensity.value=r.specularIntensity,c.specularColor.value.copy(r.specularColor),r.specularColorMap&&(c.specularColorMap.value=r.specularColorMap,t(r.specularColorMap,c.specularColorMapTransform)),r.specularIntensityMap&&(c.specularIntensityMap.value=r.specularIntensityMap,t(r.specularIntensityMap,c.specularIntensityMapTransform))}function N(c,r){r.matcap&&(c.matcap.value=r.matcap)}function P(c,r){const D=n.get(r).light;c.referencePosition.value.setFromMatrixPosition(D.matrixWorld),c.nearDistance.value=D.shadow.camera.near,c.farDistance.value=D.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function Zf(e,n,t,i){let s={},a={},p=[];const f=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function R(D,x){const g=x.program;i.uniformBlockBinding(D,g)}function _(D,x){let g=s[D.id];g===void 0&&(N(D),g=b(D),s[D.id]=g,D.addEventListener("dispose",c));const H=x.program;i.updateUBOMapping(D,H);const U=n.render.frame;a[D.id]!==U&&(E(D),a[D.id]=U)}function b(D){const x=T();D.__bindingPointIndex=x;const g=e.createBuffer(),H=D.__size,U=D.usage;return e.bindBuffer(e.UNIFORM_BUFFER,g),e.bufferData(e.UNIFORM_BUFFER,H,U),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,x,g),g}function T(){for(let D=0;D<f;D++)if(p.indexOf(D)===-1)return p.push(D),D;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function E(D){const x=s[D.id],g=D.uniforms,H=D.__cache;e.bindBuffer(e.UNIFORM_BUFFER,x);for(let U=0,y=g.length;U<y;U++){const B=Array.isArray(g[U])?g[U]:[g[U]];for(let h=0,d=B.length;h<d;h++){const C=B[h];if(m(C,U,h,H)===!0){const q=C.__offset,V=Array.isArray(C.value)?C.value:[C.value];let Y=0;for(let Q=0;Q<V.length;Q++){const W=V[Q],j=P(W);typeof W=="number"||typeof W=="boolean"?(C.__data[0]=W,e.bufferSubData(e.UNIFORM_BUFFER,q+Y,C.__data)):W.isMatrix3?(C.__data[0]=W.elements[0],C.__data[1]=W.elements[1],C.__data[2]=W.elements[2],C.__data[3]=0,C.__data[4]=W.elements[3],C.__data[5]=W.elements[4],C.__data[6]=W.elements[5],C.__data[7]=0,C.__data[8]=W.elements[6],C.__data[9]=W.elements[7],C.__data[10]=W.elements[8],C.__data[11]=0):(W.toArray(C.__data,Y),Y+=j.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,q,C.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function m(D,x,g,H){const U=D.value,y=x+"_"+g;if(H[y]===void 0)return typeof U=="number"||typeof U=="boolean"?H[y]=U:H[y]=U.clone(),!0;{const B=H[y];if(typeof U=="number"||typeof U=="boolean"){if(B!==U)return H[y]=U,!0}else if(B.equals(U)===!1)return B.copy(U),!0}return!1}function N(D){const x=D.uniforms;let g=0;const H=16;for(let y=0,B=x.length;y<B;y++){const h=Array.isArray(x[y])?x[y]:[x[y]];for(let d=0,C=h.length;d<C;d++){const q=h[d],V=Array.isArray(q.value)?q.value:[q.value];for(let Y=0,Q=V.length;Y<Q;Y++){const W=V[Y],j=P(W),F=g%H,he=F%j.boundary,Se=F+he;g+=he,Se!==0&&H-Se<j.storage&&(g+=H-Se),q.__data=new Float32Array(j.storage/Float32Array.BYTES_PER_ELEMENT),q.__offset=g,g+=j.storage}}}const U=g%H;return U>0&&(g+=H-U),D.__size=g,D.__cache={},this}function P(D){const x={boundary:0,storage:0};return typeof D=="number"||typeof D=="boolean"?(x.boundary=4,x.storage=4):D.isVector2?(x.boundary=8,x.storage=8):D.isVector3||D.isColor?(x.boundary=16,x.storage=12):D.isVector4?(x.boundary=16,x.storage=16):D.isMatrix3?(x.boundary=48,x.storage=48):D.isMatrix4?(x.boundary=64,x.storage=64):D.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",D),x}function c(D){const x=D.target;x.removeEventListener("dispose",c);const g=p.indexOf(x.__bindingPointIndex);p.splice(g,1),e.deleteBuffer(s[x.id]),delete s[x.id],delete a[x.id]}function r(){for(const D in s)e.deleteBuffer(s[D]);p=[],s={},a={}}return{bind:R,update:_,dispose:r}}class td{constructor(n={}){const{canvas:t=Nr(),context:i=null,depth:s=!0,stencil:a=!1,alpha:p=!1,antialias:f=!1,premultipliedAlpha:R=!0,preserveDrawingBuffer:_=!1,powerPreference:b="default",failIfMajorPerformanceCaveat:T=!1,reverseDepthBuffer:E=!1}=n;this.isWebGLRenderer=!0;let m;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=i.getContextAttributes().alpha}else m=p;const N=new Uint32Array(4),P=new Int32Array(4);let c=null,r=null;const D=[],x=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Or,this.toneMapping=At,this.toneMappingExposure=1;const g=this;let H=!1,U=0,y=0,B=null,h=-1,d=null;const C=new ct,q=new ct;let V=null;const Y=new Ke(0);let Q=0,W=t.width,j=t.height,F=1,he=null,Se=null;const Le=new ct(0,0,W,j),He=new ct(0,0,W,j);let Ze=!1;const k=new rr;let J=!1,ue=!1;const ie=new Rt,Me=new Rt,Re=new Ge,Ue=new ct,$e={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ye=!1;function je(){return B===null?F:1}let v=i;function ut(l,M){return t.getContext(l,M)}try{const l={alpha:!0,depth:s,stencil:a,antialias:f,premultipliedAlpha:R,preserveDrawingBuffer:_,powerPreference:b,failIfMajorPerformanceCaveat:T};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Fr}`),t.addEventListener("webglcontextlost",X,!1),t.addEventListener("webglcontextrestored",oe,!1),t.addEventListener("webglcontextcreationerror",ae,!1),v===null){const M="webgl2";if(v=ut(M,l),v===null)throw ut(M)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(l){throw console.error("THREE.WebGLRenderer: "+l.message),l}let De,we,me,Xe,_e,u,o,L,z,K,G,pe,re,le,Ne,Z,ce,Ee,Te,fe,Ie,be,ze,S;function te(){De=new ac(v),De.init(),be=new kf(v,De),we=new jl(v,De,n,be),me=new Hf(v,De),we.reverseDepthBuffer&&E&&me.buffers.depth.setReversed(!0),Xe=new lc(v),_e=new bf,u=new Vf(v,De,me,_e,we,be,Xe),o=new tc(g),L=new rc(g),z=new mo(v),ze=new Ql(v,z),K=new oc(v,z,Xe,ze),G=new fc(v,K,z,Xe),Te=new cc(v,we,u),Z=new ec(_e),pe=new Cf(g,o,L,De,we,ze,Z),re=new $f(g,_e),le=new Lf,Ne=new Nf(De),Ee=new Zl(g,o,L,me,G,m,R),ce=new Bf(g,G,we),S=new Zf(v,Xe,we,me),fe=new Jl(v,De,Xe),Ie=new sc(v,De,Xe),Xe.programs=pe.programs,g.capabilities=we,g.extensions=De,g.properties=_e,g.renderLists=le,g.shadowMap=ce,g.state=me,g.info=Xe}te();const O=new qf(g,v);this.xr=O,this.getContext=function(){return v},this.getContextAttributes=function(){return v.getContextAttributes()},this.forceContextLoss=function(){const l=De.get("WEBGL_lose_context");l&&l.loseContext()},this.forceContextRestore=function(){const l=De.get("WEBGL_lose_context");l&&l.restoreContext()},this.getPixelRatio=function(){return F},this.setPixelRatio=function(l){l!==void 0&&(F=l,this.setSize(W,j,!1))},this.getSize=function(l){return l.set(W,j)},this.setSize=function(l,M,w=!0){if(O.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}W=l,j=M,t.width=Math.floor(l*F),t.height=Math.floor(M*F),w===!0&&(t.style.width=l+"px",t.style.height=M+"px"),this.setViewport(0,0,l,M)},this.getDrawingBufferSize=function(l){return l.set(W*F,j*F).floor()},this.setDrawingBufferSize=function(l,M,w){W=l,j=M,F=w,t.width=Math.floor(l*w),t.height=Math.floor(M*w),this.setViewport(0,0,l,M)},this.getCurrentViewport=function(l){return l.copy(C)},this.getViewport=function(l){return l.copy(Le)},this.setViewport=function(l,M,w,I){l.isVector4?Le.set(l.x,l.y,l.z,l.w):Le.set(l,M,w,I),me.viewport(C.copy(Le).multiplyScalar(F).round())},this.getScissor=function(l){return l.copy(He)},this.setScissor=function(l,M,w,I){l.isVector4?He.set(l.x,l.y,l.z,l.w):He.set(l,M,w,I),me.scissor(q.copy(He).multiplyScalar(F).round())},this.getScissorTest=function(){return Ze},this.setScissorTest=function(l){me.setScissorTest(Ze=l)},this.setOpaqueSort=function(l){he=l},this.setTransparentSort=function(l){Se=l},this.getClearColor=function(l){return l.copy(Ee.getClearColor())},this.setClearColor=function(){Ee.setClearColor.apply(Ee,arguments)},this.getClearAlpha=function(){return Ee.getClearAlpha()},this.setClearAlpha=function(){Ee.setClearAlpha.apply(Ee,arguments)},this.clear=function(l=!0,M=!0,w=!0){let I=0;if(l){let A=!1;if(B!==null){const $=B.texture.format;A=$===vr||$===_r||$===mr}if(A){const $=B.texture.type,ne=$===yt||$===Jt||$===hn||$===Qt||$===fr||$===dr,se=Ee.getClearColor(),de=Ee.getClearAlpha(),xe=se.r,Ae=se.g,ve=se.b;ne?(N[0]=xe,N[1]=Ae,N[2]=ve,N[3]=de,v.clearBufferuiv(v.COLOR,0,N)):(P[0]=xe,P[1]=Ae,P[2]=ve,P[3]=de,v.clearBufferiv(v.COLOR,0,P))}else I|=v.COLOR_BUFFER_BIT}M&&(I|=v.DEPTH_BUFFER_BIT),w&&(I|=v.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),v.clear(I)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",X,!1),t.removeEventListener("webglcontextrestored",oe,!1),t.removeEventListener("webglcontextcreationerror",ae,!1),Ee.dispose(),le.dispose(),Ne.dispose(),_e.dispose(),o.dispose(),L.dispose(),G.dispose(),ze.dispose(),S.dispose(),pe.dispose(),O.dispose(),O.removeEventListener("sessionstart",Kn),O.removeEventListener("sessionend",$n),Ct.stop()};function X(l){l.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),H=!0}function oe(){console.log("THREE.WebGLRenderer: Context Restored."),H=!1;const l=Xe.autoReset,M=ce.enabled,w=ce.autoUpdate,I=ce.needsUpdate,A=ce.type;te(),Xe.autoReset=l,ce.enabled=M,ce.autoUpdate=w,ce.needsUpdate=I,ce.type=A}function ae(l){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",l.statusMessage)}function Ce(l){const M=l.target;M.removeEventListener("dispose",Ce),Qe(M)}function Qe(l){at(l),_e.remove(l)}function at(l){const M=_e.get(l).programs;M!==void 0&&(M.forEach(function(w){pe.releaseProgram(w)}),l.isShaderMaterial&&pe.releaseShaderCache(l))}this.renderBufferDirect=function(l,M,w,I,A,$){M===null&&(M=$e);const ne=A.isMesh&&A.matrixWorld.determinant()<0,se=Ur(l,M,w,I,A);me.setMaterial(I,ne);let de=w.index,xe=1;if(I.wireframe===!0){if(de=K.getWireframeAttribute(w),de===void 0)return;xe=2}const Ae=w.drawRange,ve=w.attributes.position;let Oe=Ae.start*xe,Ve=(Ae.start+Ae.count)*xe;$!==null&&(Oe=Math.max(Oe,$.start*xe),Ve=Math.min(Ve,($.start+$.count)*xe)),de!==null?(Oe=Math.max(Oe,0),Ve=Math.min(Ve,de.count)):ve!=null&&(Oe=Math.max(Oe,0),Ve=Math.min(Ve,ve.count));const et=Ve-Oe;if(et<0||et===1/0)return;ze.setup(A,I,se,w,de);let Je,Fe=fe;if(de!==null&&(Je=z.get(de),Fe=Ie,Fe.setIndex(Je)),A.isMesh)I.wireframe===!0?(me.setLineWidth(I.wireframeLinewidth*je()),Fe.setMode(v.LINES)):Fe.setMode(v.TRIANGLES);else if(A.isLine){let ge=I.linewidth;ge===void 0&&(ge=1),me.setLineWidth(ge*je()),A.isLineSegments?Fe.setMode(v.LINES):A.isLineLoop?Fe.setMode(v.LINE_LOOP):Fe.setMode(v.LINE_STRIP)}else A.isPoints?Fe.setMode(v.POINTS):A.isSprite&&Fe.setMode(v.TRIANGLES);if(A.isBatchedMesh)if(A._multiDrawInstances!==null)Fe.renderMultiDrawInstances(A._multiDrawStarts,A._multiDrawCounts,A._multiDrawCount,A._multiDrawInstances);else if(De.get("WEBGL_multi_draw"))Fe.renderMultiDraw(A._multiDrawStarts,A._multiDrawCounts,A._multiDrawCount);else{const ge=A._multiDrawStarts,rt=A._multiDrawCounts,ke=A._multiDrawCount,vt=de?z.get(de).bytesPerElement:1,Ot=_e.get(I).currentProgram.getUniforms();for(let dt=0;dt<ke;dt++)Ot.setValue(v,"_gl_DrawID",dt),Fe.render(ge[dt]/vt,rt[dt])}else if(A.isInstancedMesh)Fe.renderInstances(Oe,et,A.count);else if(w.isInstancedBufferGeometry){const ge=w._maxInstanceCount!==void 0?w._maxInstanceCount:1/0,rt=Math.min(w.instanceCount,ge);Fe.renderInstances(Oe,et,rt)}else Fe.render(Oe,et)};function We(l,M,w){l.transparent===!0&&l.side===Mt&&l.forceSinglePass===!1?(l.side=mt,l.needsUpdate=!0,tn(l,M,w),l.side=Zt,l.needsUpdate=!0,tn(l,M,w),l.side=Mt):tn(l,M,w)}this.compile=function(l,M,w=null){w===null&&(w=l),r=Ne.get(w),r.init(M),x.push(r),w.traverseVisible(function(A){A.isLight&&A.layers.test(M.layers)&&(r.pushLight(A),A.castShadow&&r.pushShadow(A))}),l!==w&&l.traverseVisible(function(A){A.isLight&&A.layers.test(M.layers)&&(r.pushLight(A),A.castShadow&&r.pushShadow(A))}),r.setupLights();const I=new Set;return l.traverse(function(A){if(!(A.isMesh||A.isPoints||A.isLine||A.isSprite))return;const $=A.material;if($)if(Array.isArray($))for(let ne=0;ne<$.length;ne++){const se=$[ne];We(se,w,A),I.add(se)}else We($,w,A),I.add($)}),x.pop(),r=null,I},this.compileAsync=function(l,M,w=null){const I=this.compile(l,M,w);return new Promise(A=>{function $(){if(I.forEach(function(ne){_e.get(ne).currentProgram.isReady()&&I.delete(ne)}),I.size===0){A(l);return}setTimeout($,10)}De.get("KHR_parallel_shader_compile")!==null?$():setTimeout($,10)})};let _t=null;function Et(l){_t&&_t(l)}function Kn(){Ct.stop()}function $n(){Ct.start()}const Ct=new Tr;Ct.setAnimationLoop(Et),typeof self<"u"&&Ct.setContext(self),this.setAnimationLoop=function(l){_t=l,O.setAnimationLoop(l),l===null?Ct.stop():Ct.start()},O.addEventListener("sessionstart",Kn),O.addEventListener("sessionend",$n),this.render=function(l,M){if(M!==void 0&&M.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(H===!0)return;if(l.matrixWorldAutoUpdate===!0&&l.updateMatrixWorld(),M.parent===null&&M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),O.enabled===!0&&O.isPresenting===!0&&(O.cameraAutoUpdate===!0&&O.updateCamera(M),M=O.getCamera()),l.isScene===!0&&l.onBeforeRender(g,l,M,B),r=Ne.get(l,x.length),r.init(M),x.push(r),Me.multiplyMatrices(M.projectionMatrix,M.matrixWorldInverse),k.setFromProjectionMatrix(Me),ue=this.localClippingEnabled,J=Z.init(this.clippingPlanes,ue),c=le.get(l,D.length),c.init(),D.push(c),O.enabled===!0&&O.isPresenting===!0){const $=g.xr.getDepthSensingMesh();$!==null&&Sn($,M,-1/0,g.sortObjects)}Sn(l,M,0,g.sortObjects),c.finish(),g.sortObjects===!0&&c.sort(he,Se),ye=O.enabled===!1||O.isPresenting===!1||O.hasDepthSensing()===!1,ye&&Ee.addToRenderList(c,l),this.info.render.frame++,J===!0&&Z.beginShadows();const w=r.state.shadowsArray;ce.render(w,l,M),J===!0&&Z.endShadows(),this.info.autoReset===!0&&this.info.reset();const I=c.opaque,A=c.transmissive;if(r.setupLights(),M.isArrayCamera){const $=M.cameras;if(A.length>0)for(let ne=0,se=$.length;ne<se;ne++){const de=$[ne];Qn(I,A,l,de)}ye&&Ee.render(l);for(let ne=0,se=$.length;ne<se;ne++){const de=$[ne];Zn(c,l,de,de.viewport)}}else A.length>0&&Qn(I,A,l,M),ye&&Ee.render(l),Zn(c,l,M);B!==null&&(u.updateMultisampleRenderTarget(B),u.updateRenderTargetMipmap(B)),l.isScene===!0&&l.onAfterRender(g,l,M),ze.resetDefaultState(),h=-1,d=null,x.pop(),x.length>0?(r=x[x.length-1],J===!0&&Z.setGlobalState(g.clippingPlanes,r.state.camera)):r=null,D.pop(),D.length>0?c=D[D.length-1]:c=null};function Sn(l,M,w,I){if(l.visible===!1)return;if(l.layers.test(M.layers)){if(l.isGroup)w=l.renderOrder;else if(l.isLOD)l.autoUpdate===!0&&l.update(M);else if(l.isLight)r.pushLight(l),l.castShadow&&r.pushShadow(l);else if(l.isSprite){if(!l.frustumCulled||k.intersectsSprite(l)){I&&Ue.setFromMatrixPosition(l.matrixWorld).applyMatrix4(Me);const ne=G.update(l),se=l.material;se.visible&&c.push(l,ne,se,w,Ue.z,null)}}else if((l.isMesh||l.isLine||l.isPoints)&&(!l.frustumCulled||k.intersectsObject(l))){const ne=G.update(l),se=l.material;if(I&&(l.boundingSphere!==void 0?(l.boundingSphere===null&&l.computeBoundingSphere(),Ue.copy(l.boundingSphere.center)):(ne.boundingSphere===null&&ne.computeBoundingSphere(),Ue.copy(ne.boundingSphere.center)),Ue.applyMatrix4(l.matrixWorld).applyMatrix4(Me)),Array.isArray(se)){const de=ne.groups;for(let xe=0,Ae=de.length;xe<Ae;xe++){const ve=de[xe],Oe=se[ve.materialIndex];Oe&&Oe.visible&&c.push(l,ne,Oe,w,Ue.z,ve)}}else se.visible&&c.push(l,ne,se,w,Ue.z,null)}}const $=l.children;for(let ne=0,se=$.length;ne<se;ne++)Sn($[ne],M,w,I)}function Zn(l,M,w,I){const A=l.opaque,$=l.transmissive,ne=l.transparent;r.setupLightsView(w),J===!0&&Z.setGlobalState(g.clippingPlanes,w),I&&me.viewport(C.copy(I)),A.length>0&&en(A,M,w),$.length>0&&en($,M,w),ne.length>0&&en(ne,M,w),me.buffers.depth.setTest(!0),me.buffers.depth.setMask(!0),me.buffers.color.setMask(!0),me.setPolygonOffset(!1)}function Qn(l,M,w,I){if((w.isScene===!0?w.overrideMaterial:null)!==null)return;r.state.transmissionRenderTarget[I.id]===void 0&&(r.state.transmissionRenderTarget[I.id]=new kt(1,1,{generateMipmaps:!0,type:De.has("EXT_color_buffer_half_float")||De.has("EXT_color_buffer_float")?_n:yt,minFilter:qt,samples:4,stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:tt.workingColorSpace}));const $=r.state.transmissionRenderTarget[I.id],ne=I.viewport||C;$.setSize(ne.z,ne.w);const se=g.getRenderTarget();g.setRenderTarget($),g.getClearColor(Y),Q=g.getClearAlpha(),Q<1&&g.setClearColor(16777215,.5),g.clear(),ye&&Ee.render(w);const de=g.toneMapping;g.toneMapping=At;const xe=I.viewport;if(I.viewport!==void 0&&(I.viewport=void 0),r.setupLightsView(I),J===!0&&Z.setGlobalState(g.clippingPlanes,I),en(l,w,I),u.updateMultisampleRenderTarget($),u.updateRenderTargetMipmap($),De.has("WEBGL_multisampled_render_to_texture")===!1){let Ae=!1;for(let ve=0,Oe=M.length;ve<Oe;ve++){const Ve=M[ve],et=Ve.object,Je=Ve.geometry,Fe=Ve.material,ge=Ve.group;if(Fe.side===Mt&&et.layers.test(I.layers)){const rt=Fe.side;Fe.side=mt,Fe.needsUpdate=!0,Jn(et,w,I,Je,Fe,ge),Fe.side=rt,Fe.needsUpdate=!0,Ae=!0}}Ae===!0&&(u.updateMultisampleRenderTarget($),u.updateRenderTargetMipmap($))}g.setRenderTarget(se),g.setClearColor(Y,Q),xe!==void 0&&(I.viewport=xe),g.toneMapping=de}function en(l,M,w){const I=M.isScene===!0?M.overrideMaterial:null;for(let A=0,$=l.length;A<$;A++){const ne=l[A],se=ne.object,de=ne.geometry,xe=I===null?ne.material:I,Ae=ne.group;se.layers.test(w.layers)&&Jn(se,M,w,de,xe,Ae)}}function Jn(l,M,w,I,A,$){l.onBeforeRender(g,M,w,I,A,$),l.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,l.matrixWorld),l.normalMatrix.getNormalMatrix(l.modelViewMatrix),A.onBeforeRender(g,M,w,I,l,$),A.transparent===!0&&A.side===Mt&&A.forceSinglePass===!1?(A.side=mt,A.needsUpdate=!0,g.renderBufferDirect(w,M,I,A,l,$),A.side=Zt,A.needsUpdate=!0,g.renderBufferDirect(w,M,I,A,l,$),A.side=Mt):g.renderBufferDirect(w,M,I,A,l,$),l.onAfterRender(g,M,w,I,A,$)}function tn(l,M,w){M.isScene!==!0&&(M=$e);const I=_e.get(l),A=r.state.lights,$=r.state.shadowsArray,ne=A.state.version,se=pe.getParameters(l,A.state,$,M,w),de=pe.getProgramCacheKey(se);let xe=I.programs;I.environment=l.isMeshStandardMaterial?M.environment:null,I.fog=M.fog,I.envMap=(l.isMeshStandardMaterial?L:o).get(l.envMap||I.environment),I.envMapRotation=I.environment!==null&&l.envMap===null?M.environmentRotation:l.envMapRotation,xe===void 0&&(l.addEventListener("dispose",Ce),xe=new Map,I.programs=xe);let Ae=xe.get(de);if(Ae!==void 0){if(I.currentProgram===Ae&&I.lightsStateVersion===ne)return ei(l,se),Ae}else se.uniforms=pe.getUniforms(l),l.onBeforeCompile(se,g),Ae=pe.acquireProgram(se,de),xe.set(de,Ae),I.uniforms=se.uniforms;const ve=I.uniforms;return(!l.isShaderMaterial&&!l.isRawShaderMaterial||l.clipping===!0)&&(ve.clippingPlanes=Z.uniform),ei(l,se),I.needsLights=wr(l),I.lightsStateVersion=ne,I.needsLights&&(ve.ambientLightColor.value=A.state.ambient,ve.lightProbe.value=A.state.probe,ve.directionalLights.value=A.state.directional,ve.directionalLightShadows.value=A.state.directionalShadow,ve.spotLights.value=A.state.spot,ve.spotLightShadows.value=A.state.spotShadow,ve.rectAreaLights.value=A.state.rectArea,ve.ltc_1.value=A.state.rectAreaLTC1,ve.ltc_2.value=A.state.rectAreaLTC2,ve.pointLights.value=A.state.point,ve.pointLightShadows.value=A.state.pointShadow,ve.hemisphereLights.value=A.state.hemi,ve.directionalShadowMap.value=A.state.directionalShadowMap,ve.directionalShadowMatrix.value=A.state.directionalShadowMatrix,ve.spotShadowMap.value=A.state.spotShadowMap,ve.spotLightMatrix.value=A.state.spotLightMatrix,ve.spotLightMap.value=A.state.spotLightMap,ve.pointShadowMap.value=A.state.pointShadowMap,ve.pointShadowMatrix.value=A.state.pointShadowMatrix),I.currentProgram=Ae,I.uniformsList=null,Ae}function jn(l){if(l.uniformsList===null){const M=l.currentProgram.getUniforms();l.uniformsList=dn.seqWithValue(M.seq,l.uniforms)}return l.uniformsList}function ei(l,M){const w=_e.get(l);w.outputColorSpace=M.outputColorSpace,w.batching=M.batching,w.batchingColor=M.batchingColor,w.instancing=M.instancing,w.instancingColor=M.instancingColor,w.instancingMorph=M.instancingMorph,w.skinning=M.skinning,w.morphTargets=M.morphTargets,w.morphNormals=M.morphNormals,w.morphColors=M.morphColors,w.morphTargetsCount=M.morphTargetsCount,w.numClippingPlanes=M.numClippingPlanes,w.numIntersection=M.numClipIntersection,w.vertexAlphas=M.vertexAlphas,w.vertexTangents=M.vertexTangents,w.toneMapping=M.toneMapping}function Ur(l,M,w,I,A){M.isScene!==!0&&(M=$e),u.resetTextureUnits();const $=M.fog,ne=I.isMeshStandardMaterial?M.environment:null,se=B===null?g.outputColorSpace:B.isXRRenderTarget===!0?B.texture.colorSpace:vn,de=(I.isMeshStandardMaterial?L:o).get(I.envMap||ne),xe=I.vertexColors===!0&&!!w.attributes.color&&w.attributes.color.itemSize===4,Ae=!!w.attributes.tangent&&(!!I.normalMap||I.anisotropy>0),ve=!!w.morphAttributes.position,Oe=!!w.morphAttributes.normal,Ve=!!w.morphAttributes.color;let et=At;I.toneMapped&&(B===null||B.isXRRenderTarget===!0)&&(et=g.toneMapping);const Je=w.morphAttributes.position||w.morphAttributes.normal||w.morphAttributes.color,Fe=Je!==void 0?Je.length:0,ge=_e.get(I),rt=r.state.lights;if(J===!0&&(ue===!0||l!==d)){const ot=l===d&&I.id===h;Z.setState(I,l,ot)}let ke=!1;I.version===ge.__version?(ge.needsLights&&ge.lightsStateVersion!==rt.state.version||ge.outputColorSpace!==se||A.isBatchedMesh&&ge.batching===!1||!A.isBatchedMesh&&ge.batching===!0||A.isBatchedMesh&&ge.batchingColor===!0&&A.colorTexture===null||A.isBatchedMesh&&ge.batchingColor===!1&&A.colorTexture!==null||A.isInstancedMesh&&ge.instancing===!1||!A.isInstancedMesh&&ge.instancing===!0||A.isSkinnedMesh&&ge.skinning===!1||!A.isSkinnedMesh&&ge.skinning===!0||A.isInstancedMesh&&ge.instancingColor===!0&&A.instanceColor===null||A.isInstancedMesh&&ge.instancingColor===!1&&A.instanceColor!==null||A.isInstancedMesh&&ge.instancingMorph===!0&&A.morphTexture===null||A.isInstancedMesh&&ge.instancingMorph===!1&&A.morphTexture!==null||ge.envMap!==de||I.fog===!0&&ge.fog!==$||ge.numClippingPlanes!==void 0&&(ge.numClippingPlanes!==Z.numPlanes||ge.numIntersection!==Z.numIntersection)||ge.vertexAlphas!==xe||ge.vertexTangents!==Ae||ge.morphTargets!==ve||ge.morphNormals!==Oe||ge.morphColors!==Ve||ge.toneMapping!==et||ge.morphTargetsCount!==Fe)&&(ke=!0):(ke=!0,ge.__version=I.version);let vt=ge.currentProgram;ke===!0&&(vt=tn(I,M,A));let Ot=!1,dt=!1,Xt=!1;const qe=vt.getUniforms(),pt=ge.uniforms;if(me.useProgram(vt.program)&&(Ot=!0,dt=!0,Xt=!0),I.id!==h&&(h=I.id,dt=!0),Ot||d!==l){me.buffers.depth.getReversed()?(ie.copy(l.projectionMatrix),Br(ie),Gr(ie),qe.setValue(v,"projectionMatrix",ie)):qe.setValue(v,"projectionMatrix",l.projectionMatrix),qe.setValue(v,"viewMatrix",l.matrixWorldInverse);const st=qe.map.cameraPosition;st!==void 0&&st.setValue(v,Re.setFromMatrixPosition(l.matrixWorld)),we.logarithmicDepthBuffer&&qe.setValue(v,"logDepthBufFC",2/(Math.log(l.far+1)/Math.LN2)),(I.isMeshPhongMaterial||I.isMeshToonMaterial||I.isMeshLambertMaterial||I.isMeshBasicMaterial||I.isMeshStandardMaterial||I.isShaderMaterial)&&qe.setValue(v,"isOrthographic",l.isOrthographicCamera===!0),d!==l&&(d=l,dt=!0,Xt=!0)}if(A.isSkinnedMesh){qe.setOptional(v,A,"bindMatrix"),qe.setOptional(v,A,"bindMatrixInverse");const ot=A.skeleton;ot&&(ot.boneTexture===null&&ot.computeBoneTexture(),qe.setValue(v,"boneTexture",ot.boneTexture,u))}A.isBatchedMesh&&(qe.setOptional(v,A,"batchingTexture"),qe.setValue(v,"batchingTexture",A._matricesTexture,u),qe.setOptional(v,A,"batchingIdTexture"),qe.setValue(v,"batchingIdTexture",A._indirectTexture,u),qe.setOptional(v,A,"batchingColorTexture"),A._colorsTexture!==null&&qe.setValue(v,"batchingColorTexture",A._colorsTexture,u));const ht=w.morphAttributes;if((ht.position!==void 0||ht.normal!==void 0||ht.color!==void 0)&&Te.update(A,w,vt),(dt||ge.receiveShadow!==A.receiveShadow)&&(ge.receiveShadow=A.receiveShadow,qe.setValue(v,"receiveShadow",A.receiveShadow)),I.isMeshGouraudMaterial&&I.envMap!==null&&(pt.envMap.value=de,pt.flipEnvMap.value=de.isCubeTexture&&de.isRenderTargetTexture===!1?-1:1),I.isMeshStandardMaterial&&I.envMap===null&&M.environment!==null&&(pt.envMapIntensity.value=M.environmentIntensity),dt&&(qe.setValue(v,"toneMappingExposure",g.toneMappingExposure),ge.needsLights&&Dr(pt,Xt),$&&I.fog===!0&&re.refreshFogUniforms(pt,$),re.refreshMaterialUniforms(pt,I,F,j,r.state.transmissionRenderTarget[l.id]),dn.upload(v,jn(ge),pt,u)),I.isShaderMaterial&&I.uniformsNeedUpdate===!0&&(dn.upload(v,jn(ge),pt,u),I.uniformsNeedUpdate=!1),I.isSpriteMaterial&&qe.setValue(v,"center",A.center),qe.setValue(v,"modelViewMatrix",A.modelViewMatrix),qe.setValue(v,"normalMatrix",A.normalMatrix),qe.setValue(v,"modelMatrix",A.matrixWorld),I.isShaderMaterial||I.isRawShaderMaterial){const ot=I.uniformsGroups;for(let st=0,Mn=ot.length;st<Mn;st++){const bt=ot[st];S.update(bt,vt),S.bind(bt,vt)}}return vt}function Dr(l,M){l.ambientLightColor.needsUpdate=M,l.lightProbe.needsUpdate=M,l.directionalLights.needsUpdate=M,l.directionalLightShadows.needsUpdate=M,l.pointLights.needsUpdate=M,l.pointLightShadows.needsUpdate=M,l.spotLights.needsUpdate=M,l.spotLightShadows.needsUpdate=M,l.rectAreaLights.needsUpdate=M,l.hemisphereLights.needsUpdate=M}function wr(l){return l.isMeshLambertMaterial||l.isMeshToonMaterial||l.isMeshPhongMaterial||l.isMeshStandardMaterial||l.isShadowMaterial||l.isShaderMaterial&&l.lights===!0}this.getActiveCubeFace=function(){return U},this.getActiveMipmapLevel=function(){return y},this.getRenderTarget=function(){return B},this.setRenderTargetTextures=function(l,M,w){_e.get(l.texture).__webglTexture=M,_e.get(l.depthTexture).__webglTexture=w;const I=_e.get(l);I.__hasExternalTextures=!0,I.__autoAllocateDepthBuffer=w===void 0,I.__autoAllocateDepthBuffer||De.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),I.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(l,M){const w=_e.get(l);w.__webglFramebuffer=M,w.__useDefaultFramebuffer=M===void 0},this.setRenderTarget=function(l,M=0,w=0){B=l,U=M,y=w;let I=!0,A=null,$=!1,ne=!1;if(l){const de=_e.get(l);if(de.__useDefaultFramebuffer!==void 0)me.bindFramebuffer(v.FRAMEBUFFER,null),I=!1;else if(de.__webglFramebuffer===void 0)u.setupRenderTarget(l);else if(de.__hasExternalTextures)u.rebindTextures(l,_e.get(l.texture).__webglTexture,_e.get(l.depthTexture).__webglTexture);else if(l.depthBuffer){const ve=l.depthTexture;if(de.__boundDepthTexture!==ve){if(ve!==null&&_e.has(ve)&&(l.width!==ve.image.width||l.height!==ve.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");u.setupDepthRenderbuffer(l)}}const xe=l.texture;(xe.isData3DTexture||xe.isDataArrayTexture||xe.isCompressedArrayTexture)&&(ne=!0);const Ae=_e.get(l).__webglFramebuffer;l.isWebGLCubeRenderTarget?(Array.isArray(Ae[M])?A=Ae[M][w]:A=Ae[M],$=!0):l.samples>0&&u.useMultisampledRTT(l)===!1?A=_e.get(l).__webglMultisampledFramebuffer:Array.isArray(Ae)?A=Ae[w]:A=Ae,C.copy(l.viewport),q.copy(l.scissor),V=l.scissorTest}else C.copy(Le).multiplyScalar(F).floor(),q.copy(He).multiplyScalar(F).floor(),V=Ze;if(me.bindFramebuffer(v.FRAMEBUFFER,A)&&I&&me.drawBuffers(l,A),me.viewport(C),me.scissor(q),me.setScissorTest(V),$){const de=_e.get(l.texture);v.framebufferTexture2D(v.FRAMEBUFFER,v.COLOR_ATTACHMENT0,v.TEXTURE_CUBE_MAP_POSITIVE_X+M,de.__webglTexture,w)}else if(ne){const de=_e.get(l.texture),xe=M||0;v.framebufferTextureLayer(v.FRAMEBUFFER,v.COLOR_ATTACHMENT0,de.__webglTexture,w||0,xe)}h=-1},this.readRenderTargetPixels=function(l,M,w,I,A,$,ne){if(!(l&&l.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let se=_e.get(l).__webglFramebuffer;if(l.isWebGLCubeRenderTarget&&ne!==void 0&&(se=se[ne]),se){me.bindFramebuffer(v.FRAMEBUFFER,se);try{const de=l.texture,xe=de.format,Ae=de.type;if(!we.textureFormatReadable(xe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!we.textureTypeReadable(Ae)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}M>=0&&M<=l.width-I&&w>=0&&w<=l.height-A&&v.readPixels(M,w,I,A,be.convert(xe),be.convert(Ae),$)}finally{const de=B!==null?_e.get(B).__webglFramebuffer:null;me.bindFramebuffer(v.FRAMEBUFFER,de)}}},this.readRenderTargetPixelsAsync=async function(l,M,w,I,A,$,ne){if(!(l&&l.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let se=_e.get(l).__webglFramebuffer;if(l.isWebGLCubeRenderTarget&&ne!==void 0&&(se=se[ne]),se){const de=l.texture,xe=de.format,Ae=de.type;if(!we.textureFormatReadable(xe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!we.textureTypeReadable(Ae))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(M>=0&&M<=l.width-I&&w>=0&&w<=l.height-A){me.bindFramebuffer(v.FRAMEBUFFER,se);const ve=v.createBuffer();v.bindBuffer(v.PIXEL_PACK_BUFFER,ve),v.bufferData(v.PIXEL_PACK_BUFFER,$.byteLength,v.STREAM_READ),v.readPixels(M,w,I,A,be.convert(xe),be.convert(Ae),0);const Oe=B!==null?_e.get(B).__webglFramebuffer:null;me.bindFramebuffer(v.FRAMEBUFFER,Oe);const Ve=v.fenceSync(v.SYNC_GPU_COMMANDS_COMPLETE,0);return v.flush(),await Hr(v,Ve,4),v.bindBuffer(v.PIXEL_PACK_BUFFER,ve),v.getBufferSubData(v.PIXEL_PACK_BUFFER,0,$),v.deleteBuffer(ve),v.deleteSync(Ve),$}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(l,M=null,w=0){l.isTexture!==!0&&(Bt("WebGLRenderer: copyFramebufferToTexture function signature has changed."),M=arguments[0]||null,l=arguments[1]);const I=Math.pow(2,-w),A=Math.floor(l.image.width*I),$=Math.floor(l.image.height*I),ne=M!==null?M.x:0,se=M!==null?M.y:0;u.setTexture2D(l,0),v.copyTexSubImage2D(v.TEXTURE_2D,w,0,0,ne,se,A,$),me.unbindTexture()};const Ir=v.createFramebuffer(),yr=v.createFramebuffer();this.copyTextureToTexture=function(l,M,w=null,I=null,A=0,$=null){l.isTexture!==!0&&(Bt("WebGLRenderer: copyTextureToTexture function signature has changed."),I=arguments[0]||null,l=arguments[1],M=arguments[2],$=arguments[3]||0,w=null),$===null&&(A!==0?(Bt("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),$=A,A=0):$=0);let ne,se,de,xe,Ae,ve,Oe,Ve,et;const Je=l.isCompressedTexture?l.mipmaps[$]:l.image;if(w!==null)ne=w.max.x-w.min.x,se=w.max.y-w.min.y,de=w.isBox3?w.max.z-w.min.z:1,xe=w.min.x,Ae=w.min.y,ve=w.isBox3?w.min.z:0;else{const ht=Math.pow(2,-A);ne=Math.floor(Je.width*ht),se=Math.floor(Je.height*ht),l.isDataArrayTexture?de=Je.depth:l.isData3DTexture?de=Math.floor(Je.depth*ht):de=1,xe=0,Ae=0,ve=0}I!==null?(Oe=I.x,Ve=I.y,et=I.z):(Oe=0,Ve=0,et=0);const Fe=be.convert(M.format),ge=be.convert(M.type);let rt;M.isData3DTexture?(u.setTexture3D(M,0),rt=v.TEXTURE_3D):M.isDataArrayTexture||M.isCompressedArrayTexture?(u.setTexture2DArray(M,0),rt=v.TEXTURE_2D_ARRAY):(u.setTexture2D(M,0),rt=v.TEXTURE_2D),v.pixelStorei(v.UNPACK_FLIP_Y_WEBGL,M.flipY),v.pixelStorei(v.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),v.pixelStorei(v.UNPACK_ALIGNMENT,M.unpackAlignment);const ke=v.getParameter(v.UNPACK_ROW_LENGTH),vt=v.getParameter(v.UNPACK_IMAGE_HEIGHT),Ot=v.getParameter(v.UNPACK_SKIP_PIXELS),dt=v.getParameter(v.UNPACK_SKIP_ROWS),Xt=v.getParameter(v.UNPACK_SKIP_IMAGES);v.pixelStorei(v.UNPACK_ROW_LENGTH,Je.width),v.pixelStorei(v.UNPACK_IMAGE_HEIGHT,Je.height),v.pixelStorei(v.UNPACK_SKIP_PIXELS,xe),v.pixelStorei(v.UNPACK_SKIP_ROWS,Ae),v.pixelStorei(v.UNPACK_SKIP_IMAGES,ve);const qe=l.isDataArrayTexture||l.isData3DTexture,pt=M.isDataArrayTexture||M.isData3DTexture;if(l.isDepthTexture){const ht=_e.get(l),ot=_e.get(M),st=_e.get(ht.__renderTarget),Mn=_e.get(ot.__renderTarget);me.bindFramebuffer(v.READ_FRAMEBUFFER,st.__webglFramebuffer),me.bindFramebuffer(v.DRAW_FRAMEBUFFER,Mn.__webglFramebuffer);for(let bt=0;bt<de;bt++)qe&&(v.framebufferTextureLayer(v.READ_FRAMEBUFFER,v.COLOR_ATTACHMENT0,_e.get(l).__webglTexture,A,ve+bt),v.framebufferTextureLayer(v.DRAW_FRAMEBUFFER,v.COLOR_ATTACHMENT0,_e.get(M).__webglTexture,$,et+bt)),v.blitFramebuffer(xe,Ae,ne,se,Oe,Ve,ne,se,v.DEPTH_BUFFER_BIT,v.NEAREST);me.bindFramebuffer(v.READ_FRAMEBUFFER,null),me.bindFramebuffer(v.DRAW_FRAMEBUFFER,null)}else if(A!==0||l.isRenderTargetTexture||_e.has(l)){const ht=_e.get(l),ot=_e.get(M);me.bindFramebuffer(v.READ_FRAMEBUFFER,Ir),me.bindFramebuffer(v.DRAW_FRAMEBUFFER,yr);for(let st=0;st<de;st++)qe?v.framebufferTextureLayer(v.READ_FRAMEBUFFER,v.COLOR_ATTACHMENT0,ht.__webglTexture,A,ve+st):v.framebufferTexture2D(v.READ_FRAMEBUFFER,v.COLOR_ATTACHMENT0,v.TEXTURE_2D,ht.__webglTexture,A),pt?v.framebufferTextureLayer(v.DRAW_FRAMEBUFFER,v.COLOR_ATTACHMENT0,ot.__webglTexture,$,et+st):v.framebufferTexture2D(v.DRAW_FRAMEBUFFER,v.COLOR_ATTACHMENT0,v.TEXTURE_2D,ot.__webglTexture,$),A!==0?v.blitFramebuffer(xe,Ae,ne,se,Oe,Ve,ne,se,v.COLOR_BUFFER_BIT,v.NEAREST):pt?v.copyTexSubImage3D(rt,$,Oe,Ve,et+st,xe,Ae,ne,se):v.copyTexSubImage2D(rt,$,Oe,Ve,xe,Ae,ne,se);me.bindFramebuffer(v.READ_FRAMEBUFFER,null),me.bindFramebuffer(v.DRAW_FRAMEBUFFER,null)}else pt?l.isDataTexture||l.isData3DTexture?v.texSubImage3D(rt,$,Oe,Ve,et,ne,se,de,Fe,ge,Je.data):M.isCompressedArrayTexture?v.compressedTexSubImage3D(rt,$,Oe,Ve,et,ne,se,de,Fe,Je.data):v.texSubImage3D(rt,$,Oe,Ve,et,ne,se,de,Fe,ge,Je):l.isDataTexture?v.texSubImage2D(v.TEXTURE_2D,$,Oe,Ve,ne,se,Fe,ge,Je.data):l.isCompressedTexture?v.compressedTexSubImage2D(v.TEXTURE_2D,$,Oe,Ve,Je.width,Je.height,Fe,Je.data):v.texSubImage2D(v.TEXTURE_2D,$,Oe,Ve,ne,se,Fe,ge,Je);v.pixelStorei(v.UNPACK_ROW_LENGTH,ke),v.pixelStorei(v.UNPACK_IMAGE_HEIGHT,vt),v.pixelStorei(v.UNPACK_SKIP_PIXELS,Ot),v.pixelStorei(v.UNPACK_SKIP_ROWS,dt),v.pixelStorei(v.UNPACK_SKIP_IMAGES,Xt),$===0&&M.generateMipmaps&&v.generateMipmap(rt),me.unbindTexture()},this.copyTextureToTexture3D=function(l,M,w=null,I=null,A=0){return l.isTexture!==!0&&(Bt("WebGLRenderer: copyTextureToTexture3D function signature has changed."),w=arguments[0]||null,I=arguments[1]||null,l=arguments[2],M=arguments[3],A=arguments[4]||0),Bt('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(l,M,w,I,A)},this.initRenderTarget=function(l){_e.get(l).__webglFramebuffer===void 0&&u.setupRenderTarget(l)},this.initTexture=function(l){l.isCubeTexture?u.setTextureCube(l,0):l.isData3DTexture?u.setTexture3D(l,0):l.isDataArrayTexture||l.isCompressedArrayTexture?u.setTexture2DArray(l,0):u.setTexture2D(l,0),me.unbindTexture()},this.resetState=function(){U=0,y=0,B=null,me.reset(),ze.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Vr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(n){this._outputColorSpace=n;const t=this.getContext();t.drawingBufferColorspace=tt._getDrawingBufferColorSpace(n),t.unpackColorSpace=tt._getUnpackColorSpace()}}function Xn(e,n){return n.getBoneName!==void 0?n.getBoneName(e):n.names[e.name]}function br(e,n,t={}){const i=new lo,s=new Ge,a=new Rt,p=new Rt;t.preserveBoneMatrix=t.preserveBoneMatrix!==void 0?t.preserveBoneMatrix:!0,t.preserveBonePositions=t.preserveBonePositions!==void 0?t.preserveBonePositions:!0,t.useTargetMatrix=t.useTargetMatrix!==void 0?t.useTargetMatrix:!1,t.hip=t.hip!==void 0?t.hip:"hip",t.hipInfluence=t.hipInfluence!==void 0?t.hipInfluence:new Ge(1,1,1),t.scale=t.scale!==void 0?t.scale:1,t.names=t.names||{};const f=n.isObject3D?n.skeleton.bones:mn(n),R=e.isObject3D?e.skeleton.bones:mn(e);let _,b,T,E;if(e.isObject3D?e.skeleton.pose():(t.useTargetMatrix=!0,t.preserveBoneMatrix=!1),t.preserveBonePositions){E=[];for(let m=0;m<R.length;m++)E.push(R[m].position.clone())}if(t.preserveBoneMatrix){e.updateMatrixWorld(),e.matrixWorld.identity();for(let m=0;m<e.children.length;++m)e.children[m].updateMatrixWorld(!0)}for(let m=0;m<R.length;++m)_=R[m],b=Xn(_,t),T=Pr(b,f),p.copy(_.matrixWorld),T&&(T.updateMatrixWorld(),t.useTargetMatrix?a.copy(T.matrixWorld):(a.copy(e.matrixWorld).invert(),a.multiply(T.matrixWorld)),s.setFromMatrixScale(a),a.scale(s.set(1/s.x,1/s.y,1/s.z)),p.makeRotationFromQuaternion(i.setFromRotationMatrix(a)),e.isObject3D&&t.localOffsets&&t.localOffsets[_.name]&&p.multiply(t.localOffsets[_.name]),p.copyPosition(a)),b===t.hip&&(p.elements[12]*=t.scale*t.hipInfluence.x,p.elements[13]*=t.scale*t.hipInfluence.y,p.elements[14]*=t.scale*t.hipInfluence.z,t.hipPosition!==void 0&&(p.elements[12]+=t.hipPosition.x*t.scale,p.elements[13]+=t.hipPosition.y*t.scale,p.elements[14]+=t.hipPosition.z*t.scale)),_.parent?(_.matrix.copy(_.parent.matrixWorld).invert(),_.matrix.multiply(p)):_.matrix.copy(p),_.matrix.decompose(_.position,_.quaternion,_.scale),_.updateMatrixWorld();if(t.preserveBonePositions)for(let m=0;m<R.length;++m)_=R[m],b=Xn(_,t)||_.name,b!==t.hip&&_.position.copy(E[m]);t.preserveBoneMatrix&&e.updateMatrixWorld(!0)}function Qf(e,n,t,i={}){i.useFirstFramePosition=i.useFirstFramePosition!==void 0?i.useFirstFramePosition:!1,i.fps=i.fps!==void 0?i.fps:Math.max(...t.tracks.map(r=>r.times.length))/t.duration,i.names=i.names||[],n.isObject3D||(n=jf(n));const s=Math.round(t.duration*(i.fps/1e3)*1e3),a=t.duration/(s-1),p=[],f=new co(n),R=mn(e.skeleton),_=[];let b,T,E,m,N;f.clipAction(t).play();let P=0,c=s;i.trim!==void 0?(P=Math.round(i.trim[0]*i.fps),c=Math.min(Math.round(i.trim[1]*i.fps),s)-P,f.update(i.trim[0])):f.update(0),n.updateMatrixWorld();for(let r=0;r<c;++r){const D=r*a;br(e,n,i);for(let x=0;x<R.length;++x)T=R[x],N=Xn(T,i)||T.name,E=Pr(N,n.skeleton),E&&(m=_[x]=_[x]||{bone:T},i.hip===N&&(m.pos||(m.pos={times:new Float32Array(c),values:new Float32Array(c*3)}),i.useFirstFramePosition&&(r===0&&(b=T.position.clone()),T.position.sub(b)),m.pos.times[r]=D,T.position.toArray(m.pos.values,r*3)),m.quat||(m.quat={times:new Float32Array(c),values:new Float32Array(c*4)}),m.quat.times[r]=D,T.quaternion.toArray(m.quat.values,r*4));r===c-2?f.update(a-1e-7):f.update(a),n.updateMatrixWorld()}for(let r=0;r<_.length;++r)m=_[r],m&&(m.pos&&p.push(new fo(".bones["+m.bone.name+"].position",m.pos.times,m.pos.values)),p.push(new uo(".bones["+m.bone.name+"].quaternion",m.quat.times,m.quat.values)));return f.uncacheAction(t),new po(t.name,-1,p)}function Jf(e){const n=new Map,t=new Map,i=e.clone();return Lr(e,i,function(s,a){n.set(a,s),t.set(s,a)}),i.traverse(function(s){if(!s.isSkinnedMesh)return;const a=s,p=n.get(s),f=p.skeleton.bones;a.skeleton=p.skeleton.clone(),a.bindMatrix.copy(p.bindMatrix),a.skeleton.bones=f.map(function(R){return t.get(R)}),a.bind(a.skeleton,a.bindMatrix)}),i}function Pr(e,n){for(let t=0,i=mn(n);t<i.length;t++)if(e===i[t].name)return i[t]}function mn(e){return Array.isArray(e)?e:e.bones}function jf(e){const n=new ho(e.bones[0]);return n.skeleton=e,n}function Lr(e,n,t){t(e,n);for(let i=0;i<e.children.length;i++)Lr(e.children[i],n.children[i],t)}const nd=Object.freeze(Object.defineProperty({__proto__:null,clone:Jf,retarget:br,retargetClip:Qf},Symbol.toStringTag,{value:"Module"}));export{Fi as P,nd as S,td as W};
