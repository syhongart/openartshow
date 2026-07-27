import{c as Ur,S as Dr,N as At,V as ct,C as Ke,F as nr,M as Vt,a as ke,R as wr,W as kt,b as tt,L as qt,H as _n,U as It,D as Mt,B as _t,d as Zt,t as Ir,e as yr,f as mn,p as Nr,w as Ft,g as Or,E as Fr,h as ft,P as ln,A as Br,i as Tt,j as un,k as zn,l as Qt,m as Jt,n as ir,o as Gr,q as jt,r as Wt,s as xt,O as Hr,u as Vr,v as rr,x as Bt,y as pn,z as kr,G as Wr,I as Yt,J as zr,K as Xr,Q as Yr,T as qr,X as Kr,Y as $r,Z as Zr,_ as Qr,$ as Jr,a0 as jr,a1 as ea,a2 as ta,a3 as na,a4 as ia,a5 as ra,a6 as aa,a7 as oa,a8 as sa,a9 as Mn,aa as Gt,ab as nn,ac as la,ad as $t,ae as ca,af as fa,ag as da,ah as ua,ai as ar,aj as pa,ak as ha,al as _a,am as ma,an as Be,ao as va,ap as ga,aq as Ea,ar as yt,as as or,at as cn,au as sr,av as wt,aw as St,ax as hn,ay as lr,az as cr,aA as rn,aB as fr,aC as dr,aD as vn,aE as Sa,aF as Ma,aG as Ta,aH as ur,aI as Dt,aJ as xa,aK as Aa,aL as Ra,aM as Ca,aN as ba,aO as pr,aP as Pa,aQ as hr,aR as _r,aS as Tn,aT as xn,aU as An,aV as Rn,aW as Ye,aX as jn,aY as ei,aZ as ti,a_ as ni,a$ as ii,b0 as ri,b1 as ai,b2 as oi,b3 as si,b4 as li,b5 as ci,b6 as fi,b7 as di,b8 as ui,b9 as pi,ba as hi,bb as _i,bc as mi,bd as vi,be as gi,bf as Ei,bg as Cn,bh as Si,bi as Mi,bj as La,bk as Ti,bl as xi,bm as Ai,bn as yn,bo as Nn,bp as On,bq as Fn,br as Bn,bs as Gn,bt as Hn,bu as Ua,bv as Ri,bw as Da,bx as fn,by as wa,bz as Ci,bA as bi,bB as Pi,bC as Vn,bD as kn,bE as Ia,bF as mr,bG as ya,bH as Na,bI as Oa,bJ as vr,bK as Li,bL as gr,bM as Ui,bN as Er,bO as Fa,bP as Ba,bQ as Ga,bR as Di,bS as lt,bT as Ha,bU as Va,bV as ka,bW as Wa,bX as za,bY as Xa,bZ as Ya,b_ as qa,b$ as Ka,c0 as $a,c1 as Za,c2 as Qa,c3 as Ja,c4 as ja,c5 as eo,c6 as to,c7 as no}from"./vendor-three-core-Cgv7Cwbx.js";/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Sr(){let e=null,n=!1,t=null,i=null;function l(o,h){t(o,h),i=e.requestAnimationFrame(l)}return{start:function(){n!==!0&&t!==null&&(i=e.requestAnimationFrame(l),n=!0)},stop:function(){e.cancelAnimationFrame(i),n=!1},setAnimationLoop:function(o){t=o},setContext:function(o){e=o}}}function io(e){const n=new WeakMap;function t(f,C){const g=f.array,b=f.usage,R=g.byteLength,E=e.createBuffer();e.bindBuffer(C,E),e.bufferData(C,g,b),f.onUploadCallback();let x;if(g instanceof Float32Array)x=e.FLOAT;else if(g instanceof Uint16Array)f.isFloat16BufferAttribute?x=e.HALF_FLOAT:x=e.UNSIGNED_SHORT;else if(g instanceof Int16Array)x=e.SHORT;else if(g instanceof Uint32Array)x=e.UNSIGNED_INT;else if(g instanceof Int32Array)x=e.INT;else if(g instanceof Int8Array)x=e.BYTE;else if(g instanceof Uint8Array)x=e.UNSIGNED_BYTE;else if(g instanceof Uint8ClampedArray)x=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+g);return{buffer:E,type:x,bytesPerElement:g.BYTES_PER_ELEMENT,version:f.version,size:R}}function i(f,C,g){const b=C.array,R=C.updateRanges;if(e.bindBuffer(g,f),R.length===0)e.bufferSubData(g,0,b);else{R.sort((x,N)=>x.start-N.start);let E=0;for(let x=1;x<R.length;x++){const N=R[E],P=R[x];P.start<=N.start+N.count+1?N.count=Math.max(N.count,P.start+P.count-N.start):(++E,R[E]=P)}R.length=E+1;for(let x=0,N=R.length;x<N;x++){const P=R[x];e.bufferSubData(g,P.start*b.BYTES_PER_ELEMENT,b,P.start,P.count)}C.clearUpdateRanges()}C.onUploadCallback()}function l(f){return f.isInterleavedBufferAttribute&&(f=f.data),n.get(f)}function o(f){f.isInterleavedBufferAttribute&&(f=f.data);const C=n.get(f);C&&(e.deleteBuffer(C.buffer),n.delete(f))}function h(f,C){if(f.isInterleavedBufferAttribute&&(f=f.data),f.isGLBufferAttribute){const b=n.get(f);(!b||b.version<f.version)&&n.set(f,{buffer:f.buffer,type:f.type,bytesPerElement:f.elementSize,version:f.version});return}const g=n.get(f);if(g===void 0)n.set(f,t(f,C));else if(g.version<f.version){if(g.size!==f.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(g.buffer,f,C),g.version=f.version}}return{get:l,remove:o,update:h}}var ro=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ao=`#ifdef USE_ALPHAHASH
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
#endif`,oo=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,so=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,lo=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,co=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,fo=`#ifdef USE_AOMAP
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
#endif`,uo=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,po=`#ifdef USE_BATCHING
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
#endif`,ho=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,_o=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,mo=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,vo=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,go=`#ifdef USE_IRIDESCENCE
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
#endif`,Eo=`#ifdef USE_BUMPMAP
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
#endif`,So=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Mo=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,To=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,xo=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ao=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Ro=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Co=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,bo=`#if defined( USE_COLOR_ALPHA )
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
#endif`,Po=`#define PI 3.141592653589793
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
} // validated`,Lo=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Uo=`vec3 transformedNormal = objectNormal;
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
#endif`,Do=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,wo=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Io=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,yo=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,No="gl_FragColor = linearToOutputTexel( gl_FragColor );",Oo=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Fo=`#ifdef USE_ENVMAP
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
#endif`,Bo=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Go=`#ifdef USE_ENVMAP
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
#endif`,Ho=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Vo=`#ifdef USE_ENVMAP
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
#endif`,ko=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Wo=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,zo=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Xo=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Yo=`#ifdef USE_GRADIENTMAP
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
}`,qo=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Ko=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,$o=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Zo=`uniform bool receiveShadow;
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
#endif`,Qo=`#ifdef USE_ENVMAP
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
#endif`,Jo=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,jo=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,es=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,ts=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,ns=`PhysicalMaterial material;
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
#endif`,is=`struct PhysicalMaterial {
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
}`,rs=`
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
#endif`,as=`#if defined( RE_IndirectDiffuse )
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
#endif`,os=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,ss=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,ls=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,cs=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,fs=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,ds=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,us=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,ps=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,hs=`#if defined( USE_POINTS_UV )
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
#endif`,_s=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,ms=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,vs=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,gs=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Es=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ss=`#ifdef USE_MORPHTARGETS
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
#endif`,Ms=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ts=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,xs=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,As=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Rs=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Cs=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,bs=`#ifdef USE_NORMALMAP
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
#endif`,Ps=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Ls=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Us=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Ds=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,ws=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Is=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,ys=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Ns=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Os=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Fs=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Bs=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Gs=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Hs=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Vs=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,ks=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Ws=`float getShadowMask() {
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
}`,zs=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Xs=`#ifdef USE_SKINNING
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
#endif`,Ys=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,qs=`#ifdef USE_SKINNING
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
#endif`,Ks=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,$s=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Zs=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Qs=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Js=`#ifdef USE_TRANSMISSION
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
#endif`,js=`#ifdef USE_TRANSMISSION
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
#endif`,el=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,tl=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,nl=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,il=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const rl=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,al=`uniform sampler2D t2D;
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
}`,ol=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,sl=`#ifdef ENVMAP_TYPE_CUBE
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
}`,ll=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cl=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,fl=`#include <common>
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
}`,dl=`#if DEPTH_PACKING == 3200
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
}`,ul=`#define DISTANCE
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
}`,pl=`#define DISTANCE
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
}`,hl=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,_l=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ml=`uniform float scale;
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
}`,vl=`uniform vec3 diffuse;
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
}`,gl=`#include <common>
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
}`,El=`uniform vec3 diffuse;
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
}`,Sl=`#define LAMBERT
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
}`,Ml=`#define LAMBERT
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
}`,Tl=`#define MATCAP
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
}`,xl=`#define MATCAP
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
}`,Al=`#define NORMAL
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
}`,Rl=`#define NORMAL
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
}`,Cl=`#define PHONG
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
}`,bl=`#define PHONG
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
}`,Pl=`#define STANDARD
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
}`,Ll=`#define STANDARD
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
}`,Ul=`#define TOON
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
}`,Dl=`#define TOON
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
}`,wl=`uniform float size;
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
}`,Il=`uniform vec3 diffuse;
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
}`,yl=`#include <common>
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
}`,Nl=`uniform vec3 color;
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
}`,Ol=`uniform float rotation;
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
}`,Fl=`uniform vec3 diffuse;
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
}`,Pe={alphahash_fragment:ro,alphahash_pars_fragment:ao,alphamap_fragment:oo,alphamap_pars_fragment:so,alphatest_fragment:lo,alphatest_pars_fragment:co,aomap_fragment:fo,aomap_pars_fragment:uo,batching_pars_vertex:po,batching_vertex:ho,begin_vertex:_o,beginnormal_vertex:mo,bsdfs:vo,iridescence_fragment:go,bumpmap_pars_fragment:Eo,clipping_planes_fragment:So,clipping_planes_pars_fragment:Mo,clipping_planes_pars_vertex:To,clipping_planes_vertex:xo,color_fragment:Ao,color_pars_fragment:Ro,color_pars_vertex:Co,color_vertex:bo,common:Po,cube_uv_reflection_fragment:Lo,defaultnormal_vertex:Uo,displacementmap_pars_vertex:Do,displacementmap_vertex:wo,emissivemap_fragment:Io,emissivemap_pars_fragment:yo,colorspace_fragment:No,colorspace_pars_fragment:Oo,envmap_fragment:Fo,envmap_common_pars_fragment:Bo,envmap_pars_fragment:Go,envmap_pars_vertex:Ho,envmap_physical_pars_fragment:Qo,envmap_vertex:Vo,fog_vertex:ko,fog_pars_vertex:Wo,fog_fragment:zo,fog_pars_fragment:Xo,gradientmap_pars_fragment:Yo,lightmap_pars_fragment:qo,lights_lambert_fragment:Ko,lights_lambert_pars_fragment:$o,lights_pars_begin:Zo,lights_toon_fragment:Jo,lights_toon_pars_fragment:jo,lights_phong_fragment:es,lights_phong_pars_fragment:ts,lights_physical_fragment:ns,lights_physical_pars_fragment:is,lights_fragment_begin:rs,lights_fragment_maps:as,lights_fragment_end:os,logdepthbuf_fragment:ss,logdepthbuf_pars_fragment:ls,logdepthbuf_pars_vertex:cs,logdepthbuf_vertex:fs,map_fragment:ds,map_pars_fragment:us,map_particle_fragment:ps,map_particle_pars_fragment:hs,metalnessmap_fragment:_s,metalnessmap_pars_fragment:ms,morphinstance_vertex:vs,morphcolor_vertex:gs,morphnormal_vertex:Es,morphtarget_pars_vertex:Ss,morphtarget_vertex:Ms,normal_fragment_begin:Ts,normal_fragment_maps:xs,normal_pars_fragment:As,normal_pars_vertex:Rs,normal_vertex:Cs,normalmap_pars_fragment:bs,clearcoat_normal_fragment_begin:Ps,clearcoat_normal_fragment_maps:Ls,clearcoat_pars_fragment:Us,iridescence_pars_fragment:Ds,opaque_fragment:ws,packing:Is,premultiplied_alpha_fragment:ys,project_vertex:Ns,dithering_fragment:Os,dithering_pars_fragment:Fs,roughnessmap_fragment:Bs,roughnessmap_pars_fragment:Gs,shadowmap_pars_fragment:Hs,shadowmap_pars_vertex:Vs,shadowmap_vertex:ks,shadowmask_pars_fragment:Ws,skinbase_vertex:zs,skinning_pars_vertex:Xs,skinning_vertex:Ys,skinnormal_vertex:qs,specularmap_fragment:Ks,specularmap_pars_fragment:$s,tonemapping_fragment:Zs,tonemapping_pars_fragment:Qs,transmission_fragment:Js,transmission_pars_fragment:js,uv_pars_fragment:el,uv_pars_vertex:tl,uv_vertex:nl,worldpos_vertex:il,background_vert:rl,background_frag:al,backgroundCube_vert:ol,backgroundCube_frag:sl,cube_vert:ll,cube_frag:cl,depth_vert:fl,depth_frag:dl,distanceRGBA_vert:ul,distanceRGBA_frag:pl,equirect_vert:hl,equirect_frag:_l,linedashed_vert:ml,linedashed_frag:vl,meshbasic_vert:gl,meshbasic_frag:El,meshlambert_vert:Sl,meshlambert_frag:Ml,meshmatcap_vert:Tl,meshmatcap_frag:xl,meshnormal_vert:Al,meshnormal_frag:Rl,meshphong_vert:Cl,meshphong_frag:bl,meshphysical_vert:Pl,meshphysical_frag:Ll,meshtoon_vert:Ul,meshtoon_frag:Dl,points_vert:wl,points_frag:Il,shadow_vert:yl,shadow_frag:Nl,sprite_vert:Ol,sprite_frag:Fl},ee={common:{diffuse:{value:new Ke(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Be}},envmap:{envMap:{value:null},envMapRotation:{value:new Be},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Be}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Be}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Be},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Be},normalScale:{value:new ft(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Be},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Be}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Be}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Be}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ke(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ke(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0},uvTransform:{value:new Be}},sprite:{diffuse:{value:new Ke(16777215)},opacity:{value:1},center:{value:new ft(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}}},gt={basic:{uniforms:lt([ee.common,ee.specularmap,ee.envmap,ee.aomap,ee.lightmap,ee.fog]),vertexShader:Pe.meshbasic_vert,fragmentShader:Pe.meshbasic_frag},lambert:{uniforms:lt([ee.common,ee.specularmap,ee.envmap,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.fog,ee.lights,{emissive:{value:new Ke(0)}}]),vertexShader:Pe.meshlambert_vert,fragmentShader:Pe.meshlambert_frag},phong:{uniforms:lt([ee.common,ee.specularmap,ee.envmap,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.fog,ee.lights,{emissive:{value:new Ke(0)},specular:{value:new Ke(1118481)},shininess:{value:30}}]),vertexShader:Pe.meshphong_vert,fragmentShader:Pe.meshphong_frag},standard:{uniforms:lt([ee.common,ee.envmap,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.roughnessmap,ee.metalnessmap,ee.fog,ee.lights,{emissive:{value:new Ke(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Pe.meshphysical_vert,fragmentShader:Pe.meshphysical_frag},toon:{uniforms:lt([ee.common,ee.aomap,ee.lightmap,ee.emissivemap,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.gradientmap,ee.fog,ee.lights,{emissive:{value:new Ke(0)}}]),vertexShader:Pe.meshtoon_vert,fragmentShader:Pe.meshtoon_frag},matcap:{uniforms:lt([ee.common,ee.bumpmap,ee.normalmap,ee.displacementmap,ee.fog,{matcap:{value:null}}]),vertexShader:Pe.meshmatcap_vert,fragmentShader:Pe.meshmatcap_frag},points:{uniforms:lt([ee.points,ee.fog]),vertexShader:Pe.points_vert,fragmentShader:Pe.points_frag},dashed:{uniforms:lt([ee.common,ee.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Pe.linedashed_vert,fragmentShader:Pe.linedashed_frag},depth:{uniforms:lt([ee.common,ee.displacementmap]),vertexShader:Pe.depth_vert,fragmentShader:Pe.depth_frag},normal:{uniforms:lt([ee.common,ee.bumpmap,ee.normalmap,ee.displacementmap,{opacity:{value:1}}]),vertexShader:Pe.meshnormal_vert,fragmentShader:Pe.meshnormal_frag},sprite:{uniforms:lt([ee.sprite,ee.fog]),vertexShader:Pe.sprite_vert,fragmentShader:Pe.sprite_frag},background:{uniforms:{uvTransform:{value:new Be},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Pe.background_vert,fragmentShader:Pe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Be}},vertexShader:Pe.backgroundCube_vert,fragmentShader:Pe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Pe.cube_vert,fragmentShader:Pe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Pe.equirect_vert,fragmentShader:Pe.equirect_frag},distanceRGBA:{uniforms:lt([ee.common,ee.displacementmap,{referencePosition:{value:new ke},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Pe.distanceRGBA_vert,fragmentShader:Pe.distanceRGBA_frag},shadow:{uniforms:lt([ee.lights,ee.fog,{color:{value:new Ke(0)},opacity:{value:1}}]),vertexShader:Pe.shadow_vert,fragmentShader:Pe.shadow_frag}};gt.physical={uniforms:lt([gt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Be},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Be},clearcoatNormalScale:{value:new ft(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Be},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Be},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Be},sheen:{value:0},sheenColor:{value:new Ke(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Be},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Be},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Be},transmissionSamplerSize:{value:new ft},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Be},attenuationDistance:{value:0},attenuationColor:{value:new Ke(0)},specularColor:{value:new Ke(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Be},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Be},anisotropyVector:{value:new ft},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Be}}]),vertexShader:Pe.meshphysical_vert,fragmentShader:Pe.meshphysical_frag};const an={r:0,b:0,g:0},bt=new gr,Bl=new Vt;function Gl(e,n,t,i,l,o,h){const f=new Ke(0);let C=o===!0?0:1,g,b,R=null,E=0,x=null;function N(T){let m=T.isScene===!0?T.background:null;return m&&m.isTexture&&(m=(T.backgroundBlurriness>0?t:n).get(m)),m}function P(T){let m=!1;const H=N(T);H===null?r(f,C):H&&H.isColor&&(r(H,1),m=!0);const U=e.xr.getEnvironmentBlendMode();U==="additive"?i.buffers.color.setClear(0,0,0,1,h):U==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,h),(e.autoClear||m)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function c(T,m){const H=N(m);H&&(H.isCubeTexture||H.mapping===vn)?(b===void 0&&(b=new xt(new rr(1,1,1),new yt({name:"BackgroundCubeMaterial",uniforms:Li(gt.backgroundCube.uniforms),vertexShader:gt.backgroundCube.vertexShader,fragmentShader:gt.backgroundCube.fragmentShader,side:_t,depthTest:!1,depthWrite:!1,fog:!1})),b.geometry.deleteAttribute("normal"),b.geometry.deleteAttribute("uv"),b.onBeforeRender=function(U,y,B){this.matrixWorld.copyPosition(B.matrixWorld)},Object.defineProperty(b.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),l.update(b)),bt.copy(m.backgroundRotation),bt.x*=-1,bt.y*=-1,bt.z*=-1,H.isCubeTexture&&H.isRenderTargetTexture===!1&&(bt.y*=-1,bt.z*=-1),b.material.uniforms.envMap.value=H,b.material.uniforms.flipEnvMap.value=H.isCubeTexture&&H.isRenderTargetTexture===!1?-1:1,b.material.uniforms.backgroundBlurriness.value=m.backgroundBlurriness,b.material.uniforms.backgroundIntensity.value=m.backgroundIntensity,b.material.uniforms.backgroundRotation.value.setFromMatrix4(Bl.makeRotationFromEuler(bt)),b.material.toneMapped=tt.getTransfer(H.colorSpace)!==Ye,(R!==H||E!==H.version||x!==e.toneMapping)&&(b.material.needsUpdate=!0,R=H,E=H.version,x=e.toneMapping),b.layers.enableAll(),T.unshift(b,b.geometry,b.material,0,0,null)):H&&H.isTexture&&(g===void 0&&(g=new xt(new dr(2,2),new yt({name:"BackgroundMaterial",uniforms:Li(gt.background.uniforms),vertexShader:gt.background.vertexShader,fragmentShader:gt.background.fragmentShader,side:Zt,depthTest:!1,depthWrite:!1,fog:!1})),g.geometry.deleteAttribute("normal"),Object.defineProperty(g.material,"map",{get:function(){return this.uniforms.t2D.value}}),l.update(g)),g.material.uniforms.t2D.value=H,g.material.uniforms.backgroundIntensity.value=m.backgroundIntensity,g.material.toneMapped=tt.getTransfer(H.colorSpace)!==Ye,H.matrixAutoUpdate===!0&&H.updateMatrix(),g.material.uniforms.uvTransform.value.copy(H.matrix),(R!==H||E!==H.version||x!==e.toneMapping)&&(g.material.needsUpdate=!0,R=H,E=H.version,x=e.toneMapping),g.layers.enableAll(),T.unshift(g,g.geometry,g.material,0,0,null))}function r(T,m){T.getRGB(an,vr(e)),i.buffers.color.setClear(an.r,an.g,an.b,m,h)}function I(){b!==void 0&&(b.geometry.dispose(),b.material.dispose()),g!==void 0&&(g.geometry.dispose(),g.material.dispose())}return{getClearColor:function(){return f},setClearColor:function(T,m=1){f.set(T),C=m,r(f,C)},getClearAlpha:function(){return C},setClearAlpha:function(T){C=T,r(f,C)},render:P,addToRenderList:c,dispose:I}}function Hl(e,n){const t=e.getParameter(e.MAX_VERTEX_ATTRIBS),i={},l=E(null);let o=l,h=!1;function f(d,A,q,V,Y){let Q=!1;const W=R(V,q,A);o!==W&&(o=W,g(o.object)),Q=x(d,V,q,Y),Q&&N(d,V,q,Y),Y!==null&&n.update(Y,e.ELEMENT_ARRAY_BUFFER),(Q||h)&&(h=!1,m(d,A,q,V),Y!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,n.get(Y).buffer))}function C(){return e.createVertexArray()}function g(d){return e.bindVertexArray(d)}function b(d){return e.deleteVertexArray(d)}function R(d,A,q){const V=q.wireframe===!0;let Y=i[d.id];Y===void 0&&(Y={},i[d.id]=Y);let Q=Y[A.id];Q===void 0&&(Q={},Y[A.id]=Q);let W=Q[V];return W===void 0&&(W=E(C()),Q[V]=W),W}function E(d){const A=[],q=[],V=[];for(let Y=0;Y<t;Y++)A[Y]=0,q[Y]=0,V[Y]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:A,enabledAttributes:q,attributeDivisors:V,object:d,attributes:{},index:null}}function x(d,A,q,V){const Y=o.attributes,Q=A.attributes;let W=0;const j=q.getAttributes();for(const F in j)if(j[F].location>=0){const Se=Y[F];let Le=Q[F];if(Le===void 0&&(F==="instanceMatrix"&&d.instanceMatrix&&(Le=d.instanceMatrix),F==="instanceColor"&&d.instanceColor&&(Le=d.instanceColor)),Se===void 0||Se.attribute!==Le||Le&&Se.data!==Le.data)return!0;W++}return o.attributesNum!==W||o.index!==V}function N(d,A,q,V){const Y={},Q=A.attributes;let W=0;const j=q.getAttributes();for(const F in j)if(j[F].location>=0){let Se=Q[F];Se===void 0&&(F==="instanceMatrix"&&d.instanceMatrix&&(Se=d.instanceMatrix),F==="instanceColor"&&d.instanceColor&&(Se=d.instanceColor));const Le={};Le.attribute=Se,Se&&Se.data&&(Le.data=Se.data),Y[F]=Le,W++}o.attributes=Y,o.attributesNum=W,o.index=V}function P(){const d=o.newAttributes;for(let A=0,q=d.length;A<q;A++)d[A]=0}function c(d){r(d,0)}function r(d,A){const q=o.newAttributes,V=o.enabledAttributes,Y=o.attributeDivisors;q[d]=1,V[d]===0&&(e.enableVertexAttribArray(d),V[d]=1),Y[d]!==A&&(e.vertexAttribDivisor(d,A),Y[d]=A)}function I(){const d=o.newAttributes,A=o.enabledAttributes;for(let q=0,V=A.length;q<V;q++)A[q]!==d[q]&&(e.disableVertexAttribArray(q),A[q]=0)}function T(d,A,q,V,Y,Q,W){W===!0?e.vertexAttribIPointer(d,A,q,Y,Q):e.vertexAttribPointer(d,A,q,V,Y,Q)}function m(d,A,q,V){P();const Y=V.attributes,Q=q.getAttributes(),W=A.defaultAttributeValues;for(const j in Q){const F=Q[j];if(F.location>=0){let he=Y[j];if(he===void 0&&(j==="instanceMatrix"&&d.instanceMatrix&&(he=d.instanceMatrix),j==="instanceColor"&&d.instanceColor&&(he=d.instanceColor)),he!==void 0){const Se=he.normalized,Le=he.itemSize,Ge=n.get(he);if(Ge===void 0)continue;const Ze=Ge.buffer,k=Ge.type,J=Ge.bytesPerElement,ue=k===e.INT||k===e.UNSIGNED_INT||he.gpuType===ur;if(he.isInterleavedBufferAttribute){const ie=he.data,Me=ie.stride,Re=he.offset;if(ie.isInstancedInterleavedBuffer){for(let Ue=0;Ue<F.locationSize;Ue++)r(F.location+Ue,ie.meshPerAttribute);d.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=ie.meshPerAttribute*ie.count)}else for(let Ue=0;Ue<F.locationSize;Ue++)c(F.location+Ue);e.bindBuffer(e.ARRAY_BUFFER,Ze);for(let Ue=0;Ue<F.locationSize;Ue++)T(F.location+Ue,Le/F.locationSize,k,Se,Me*J,(Re+Le/F.locationSize*Ue)*J,ue)}else{if(he.isInstancedBufferAttribute){for(let ie=0;ie<F.locationSize;ie++)r(F.location+ie,he.meshPerAttribute);d.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let ie=0;ie<F.locationSize;ie++)c(F.location+ie);e.bindBuffer(e.ARRAY_BUFFER,Ze);for(let ie=0;ie<F.locationSize;ie++)T(F.location+ie,Le/F.locationSize,k,Se,Le*J,Le/F.locationSize*ie*J,ue)}}else if(W!==void 0){const Se=W[j];if(Se!==void 0)switch(Se.length){case 2:e.vertexAttrib2fv(F.location,Se);break;case 3:e.vertexAttrib3fv(F.location,Se);break;case 4:e.vertexAttrib4fv(F.location,Se);break;default:e.vertexAttrib1fv(F.location,Se)}}}}I()}function H(){B();for(const d in i){const A=i[d];for(const q in A){const V=A[q];for(const Y in V)b(V[Y].object),delete V[Y];delete A[q]}delete i[d]}}function U(d){if(i[d.id]===void 0)return;const A=i[d.id];for(const q in A){const V=A[q];for(const Y in V)b(V[Y].object),delete V[Y];delete A[q]}delete i[d.id]}function y(d){for(const A in i){const q=i[A];if(q[d.id]===void 0)continue;const V=q[d.id];for(const Y in V)b(V[Y].object),delete V[Y];delete q[d.id]}}function B(){p(),h=!0,o!==l&&(o=l,g(o.object))}function p(){l.geometry=null,l.program=null,l.wireframe=!1}return{setup:f,reset:B,resetDefaultState:p,dispose:H,releaseStatesOfGeometry:U,releaseStatesOfProgram:y,initAttributes:P,enableAttribute:c,disableUnusedAttributes:I}}function Vl(e,n,t){let i;function l(g){i=g}function o(g,b){e.drawArrays(i,g,b),t.update(b,i,1)}function h(g,b,R){R!==0&&(e.drawArraysInstanced(i,g,b,R),t.update(b,i,R))}function f(g,b,R){if(R===0)return;n.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,g,0,b,0,R);let x=0;for(let N=0;N<R;N++)x+=b[N];t.update(x,i,1)}function C(g,b,R,E){if(R===0)return;const x=n.get("WEBGL_multi_draw");if(x===null)for(let N=0;N<g.length;N++)h(g[N],b[N],E[N]);else{x.multiDrawArraysInstancedWEBGL(i,g,0,b,0,E,0,R);let N=0;for(let P=0;P<R;P++)N+=b[P]*E[P];t.update(N,i,1)}}this.setMode=l,this.render=o,this.renderInstances=h,this.renderMultiDraw=f,this.renderMultiDrawInstances=C}function kl(e,n,t,i){let l;function o(){if(l!==void 0)return l;if(n.has("EXT_texture_filter_anisotropic")===!0){const y=n.get("EXT_texture_filter_anisotropic");l=e.getParameter(y.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else l=0;return l}function h(y){return!(y!==Tt&&i.convert(y)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function f(y){const B=y===_n&&(n.has("EXT_color_buffer_half_float")||n.has("EXT_color_buffer_float"));return!(y!==It&&i.convert(y)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&y!==Dt&&!B)}function C(y){if(y==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";y="mediump"}return y==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let g=t.precision!==void 0?t.precision:"highp";const b=C(g);b!==g&&(console.warn("THREE.WebGLRenderer:",g,"not supported, using",b,"instead."),g=b);const R=t.logarithmicDepthBuffer===!0,E=t.reverseDepthBuffer===!0&&n.has("EXT_clip_control"),x=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),N=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),P=e.getParameter(e.MAX_TEXTURE_SIZE),c=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),r=e.getParameter(e.MAX_VERTEX_ATTRIBS),I=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),T=e.getParameter(e.MAX_VARYING_VECTORS),m=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),H=N>0,U=e.getParameter(e.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:o,getMaxPrecision:C,textureFormatReadable:h,textureTypeReadable:f,precision:g,logarithmicDepthBuffer:R,reverseDepthBuffer:E,maxTextures:x,maxVertexTextures:N,maxTextureSize:P,maxCubemapSize:c,maxAttributes:r,maxVertexUniforms:I,maxVaryings:T,maxFragmentUniforms:m,vertexTextures:H,maxSamples:U}}function Wl(e){const n=this;let t=null,i=0,l=!1,o=!1;const h=new ma,f=new Be,C={value:null,needsUpdate:!1};this.uniform=C,this.numPlanes=0,this.numIntersection=0,this.init=function(R,E){const x=R.length!==0||E||i!==0||l;return l=E,i=R.length,x},this.beginShadows=function(){o=!0,b(null)},this.endShadows=function(){o=!1},this.setGlobalState=function(R,E){t=b(R,E,0)},this.setState=function(R,E,x){const N=R.clippingPlanes,P=R.clipIntersection,c=R.clipShadows,r=e.get(R);if(!l||N===null||N.length===0||o&&!c)o?b(null):g();else{const I=o?0:i,T=I*4;let m=r.clippingState||null;C.value=m,m=b(N,E,T,x);for(let H=0;H!==T;++H)m[H]=t[H];r.clippingState=m,this.numIntersection=P?this.numPlanes:0,this.numPlanes+=I}};function g(){C.value!==t&&(C.value=t,C.needsUpdate=i>0),n.numPlanes=i,n.numIntersection=0}function b(R,E,x,N){const P=R!==null?R.length:0;let c=null;if(P!==0){if(c=C.value,N!==!0||c===null){const r=x+P*4,I=E.matrixWorldInverse;f.getNormalMatrix(I),(c===null||c.length<r)&&(c=new Float32Array(r));for(let T=0,m=x;T!==P;++T,m+=4)h.copy(R[T]).applyMatrix4(I,f),h.normal.toArray(c,m),c[m+3]=h.constant}C.value=c,C.needsUpdate=!0}return n.numPlanes=P,n.numIntersection=0,c}}function zl(e){let n=new WeakMap;function t(h,f){return f===Vn?h.mapping=jt:f===kn&&(h.mapping=Wt),h}function i(h){if(h&&h.isTexture){const f=h.mapping;if(f===Vn||f===kn)if(n.has(h)){const C=n.get(h).texture;return t(C,h.mapping)}else{const C=h.image;if(C&&C.height>0){const g=new Ia(C.height);return g.fromEquirectangularTexture(e,h),n.set(h,g),h.addEventListener("dispose",l),t(g.texture,h.mapping)}else return null}}return h}function l(h){const f=h.target;f.removeEventListener("dispose",l);const C=n.get(f);C!==void 0&&(n.delete(f),C.dispose())}function o(){n=new WeakMap}return{get:i,dispose:o}}const Ht=4,wi=[.125,.215,.35,.446,.526,.582],Ut=20,bn=new Hr,Ii=new Ke;let Pn=null,Ln=0,Un=0,Dn=!1;const Lt=(1+Math.sqrt(5))/2,Ot=1/Lt,yi=[new ke(-Lt,Ot,0),new ke(Lt,Ot,0),new ke(-Ot,0,Lt),new ke(Ot,0,Lt),new ke(0,Lt,-Ot),new ke(0,Lt,Ot),new ke(-1,1,-1),new ke(1,1,-1),new ke(-1,1,1),new ke(1,1,1)];class Ni{constructor(n){this._renderer=n,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(n,t=0,i=.1,l=100){Pn=this._renderer.getRenderTarget(),Ln=this._renderer.getActiveCubeFace(),Un=this._renderer.getActiveMipmapLevel(),Dn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const o=this._allocateTargets();return o.depthBuffer=!0,this._sceneToCubeUV(n,i,l,o),t>0&&this._blur(o,0,0,t),this._applyPMREM(o),this._cleanup(o),o}fromEquirectangular(n,t=null){return this._fromTexture(n,t)}fromCubemap(n,t=null){return this._fromTexture(n,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Bi(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Fi(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(n){this._lodMax=Math.floor(Math.log2(n)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let n=0;n<this._lodPlanes.length;n++)this._lodPlanes[n].dispose()}_cleanup(n){this._renderer.setRenderTarget(Pn,Ln,Un),this._renderer.xr.enabled=Dn,n.scissorTest=!1,on(n,0,0,n.width,n.height)}_fromTexture(n,t){n.mapping===jt||n.mapping===Wt?this._setSize(n.image.length===0?16:n.image[0].width||n.image[0].image.width):this._setSize(n.image.width/4),Pn=this._renderer.getRenderTarget(),Ln=this._renderer.getActiveCubeFace(),Un=this._renderer.getActiveMipmapLevel(),Dn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(n,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const n=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Gt,minFilter:Gt,generateMipmaps:!1,type:_n,format:Tt,colorSpace:mn,depthBuffer:!1},l=Oi(n,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==n||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Oi(n,t,i);const{_lodMax:o}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Xl(o)),this._blurMaterial=Yl(o,n,t)}return l}_compileMaterial(n){const t=new xt(this._lodPlanes[0],n);this._renderer.compile(t,bn)}_sceneToCubeUV(n,t,i,l){const f=new ln(90,1,t,i),C=[1,-1,1,1,1,1],g=[1,1,1,-1,-1,-1],b=this._renderer,R=b.autoClear,E=b.toneMapping;b.getClearColor(Ii),b.toneMapping=At,b.autoClear=!1;const x=new Vr({name:"PMREM.Background",side:_t,depthWrite:!1,depthTest:!1}),N=new xt(new rr,x);let P=!1;const c=n.background;c?c.isColor&&(x.color.copy(c),n.background=null,P=!0):(x.color.copy(Ii),P=!0);for(let r=0;r<6;r++){const I=r%3;I===0?(f.up.set(0,C[r],0),f.lookAt(g[r],0,0)):I===1?(f.up.set(0,0,C[r]),f.lookAt(0,g[r],0)):(f.up.set(0,C[r],0),f.lookAt(0,0,g[r]));const T=this._cubeSize;on(l,I*T,r>2?T:0,T,T),b.setRenderTarget(l),P&&b.render(N,f),b.render(n,f)}N.geometry.dispose(),N.material.dispose(),b.toneMapping=E,b.autoClear=R,n.background=c}_textureToCubeUV(n,t){const i=this._renderer,l=n.mapping===jt||n.mapping===Wt;l?(this._cubemapMaterial===null&&(this._cubemapMaterial=Bi()),this._cubemapMaterial.uniforms.flipEnvMap.value=n.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Fi());const o=l?this._cubemapMaterial:this._equirectMaterial,h=new xt(this._lodPlanes[0],o),f=o.uniforms;f.envMap.value=n;const C=this._cubeSize;on(t,0,0,3*C,2*C),i.setRenderTarget(t),i.render(h,bn)}_applyPMREM(n){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const l=this._lodPlanes.length;for(let o=1;o<l;o++){const h=Math.sqrt(this._sigmas[o]*this._sigmas[o]-this._sigmas[o-1]*this._sigmas[o-1]),f=yi[(l-o-1)%yi.length];this._blur(n,o-1,o,h,f)}t.autoClear=i}_blur(n,t,i,l,o){const h=this._pingPongRenderTarget;this._halfBlur(n,h,t,i,l,"latitudinal",o),this._halfBlur(h,n,i,i,l,"longitudinal",o)}_halfBlur(n,t,i,l,o,h,f){const C=this._renderer,g=this._blurMaterial;h!=="latitudinal"&&h!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const b=3,R=new xt(this._lodPlanes[l],g),E=g.uniforms,x=this._sizeLods[i]-1,N=isFinite(o)?Math.PI/(2*x):2*Math.PI/(2*Ut-1),P=o/N,c=isFinite(o)?1+Math.floor(b*P):Ut;c>Ut&&console.warn(`sigmaRadians, ${o}, is too large and will clip, as it requested ${c} samples when the maximum is set to ${Ut}`);const r=[];let I=0;for(let y=0;y<Ut;++y){const B=y/P,p=Math.exp(-B*B/2);r.push(p),y===0?I+=p:y<c&&(I+=2*p)}for(let y=0;y<r.length;y++)r[y]=r[y]/I;E.envMap.value=n.texture,E.samples.value=c,E.weights.value=r,E.latitudinal.value=h==="latitudinal",f&&(E.poleAxis.value=f);const{_lodMax:T}=this;E.dTheta.value=N,E.mipInt.value=T-i;const m=this._sizeLods[l],H=3*m*(l>T-Ht?l-T+Ht:0),U=4*(this._cubeSize-m);on(t,H,U,3*m,2*m),C.setRenderTarget(t),C.render(R,bn)}}function Xl(e){const n=[],t=[],i=[];let l=e;const o=e-Ht+1+wi.length;for(let h=0;h<o;h++){const f=Math.pow(2,l);t.push(f);let C=1/f;h>e-Ht?C=wi[h-e+Ht-1]:h===0&&(C=0),i.push(C);const g=1/(f-2),b=-g,R=1+g,E=[b,b,R,b,R,R,b,b,R,R,b,R],x=6,N=6,P=3,c=2,r=1,I=new Float32Array(P*N*x),T=new Float32Array(c*N*x),m=new Float32Array(r*N*x);for(let U=0;U<x;U++){const y=U%3*2/3-1,B=U>2?0:-1,p=[y,B,0,y+2/3,B,0,y+2/3,B+1,0,y,B,0,y+2/3,B+1,0,y,B+1,0];I.set(p,P*N*U),T.set(E,c*N*U);const d=[U,U,U,U,U,U];m.set(d,r*N*U)}const H=new or;H.setAttribute("position",new cn(I,P)),H.setAttribute("uv",new cn(T,c)),H.setAttribute("faceIndex",new cn(m,r)),n.push(H),l>Ht&&l--}return{lodPlanes:n,sizeLods:t,sigmas:i}}function Oi(e,n,t){const i=new kt(e,n,t);return i.texture.mapping=vn,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function on(e,n,t,i,l){e.viewport.set(n,t,i,l),e.scissor.set(n,t,i,l)}function Yl(e,n,t){const i=new Float32Array(Ut),l=new ke(0,1,0);return new yt({name:"SphericalGaussianBlur",defines:{n:Ut,CUBEUV_TEXEL_WIDTH:1/n,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:l}},vertexShader:Xn(),fragmentShader:`

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
		`,blending:wt,depthTest:!1,depthWrite:!1})}function Fi(){return new yt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Xn(),fragmentShader:`

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
		`,blending:wt,depthTest:!1,depthWrite:!1})}function Bi(){return new yt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Xn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:wt,depthTest:!1,depthWrite:!1})}function Xn(){return`

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
	`}function ql(e){let n=new WeakMap,t=null;function i(f){if(f&&f.isTexture){const C=f.mapping,g=C===Vn||C===kn,b=C===jt||C===Wt;if(g||b){let R=n.get(f);const E=R!==void 0?R.texture.pmremVersion:0;if(f.isRenderTargetTexture&&f.pmremVersion!==E)return t===null&&(t=new Ni(e)),R=g?t.fromEquirectangular(f,R):t.fromCubemap(f,R),R.texture.pmremVersion=f.pmremVersion,n.set(f,R),R.texture;if(R!==void 0)return R.texture;{const x=f.image;return g&&x&&x.height>0||b&&x&&l(x)?(t===null&&(t=new Ni(e)),R=g?t.fromEquirectangular(f):t.fromCubemap(f),R.texture.pmremVersion=f.pmremVersion,n.set(f,R),f.addEventListener("dispose",o),R.texture):null}}}return f}function l(f){let C=0;const g=6;for(let b=0;b<g;b++)f[b]!==void 0&&C++;return C===g}function o(f){const C=f.target;C.removeEventListener("dispose",o);const g=n.get(C);g!==void 0&&(n.delete(C),g.dispose())}function h(){n=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:h}}function Kl(e){const n={};function t(i){if(n[i]!==void 0)return n[i];let l;switch(i){case"WEBGL_depth_texture":l=e.getExtension("WEBGL_depth_texture")||e.getExtension("MOZ_WEBGL_depth_texture")||e.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":l=e.getExtension("EXT_texture_filter_anisotropic")||e.getExtension("MOZ_EXT_texture_filter_anisotropic")||e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":l=e.getExtension("WEBGL_compressed_texture_s3tc")||e.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":l=e.getExtension("WEBGL_compressed_texture_pvrtc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:l=e.getExtension(i)}return n[i]=l,l}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const l=t(i);return l===null&&Ft("THREE.WebGLRenderer: "+i+" extension not supported."),l}}}function $l(e,n,t,i){const l={},o=new WeakMap;function h(R){const E=R.target;E.index!==null&&n.remove(E.index);for(const N in E.attributes)n.remove(E.attributes[N]);E.removeEventListener("dispose",h),delete l[E.id];const x=o.get(E);x&&(n.remove(x),o.delete(E)),i.releaseStatesOfGeometry(E),E.isInstancedBufferGeometry===!0&&delete E._maxInstanceCount,t.memory.geometries--}function f(R,E){return l[E.id]===!0||(E.addEventListener("dispose",h),l[E.id]=!0,t.memory.geometries++),E}function C(R){const E=R.attributes;for(const x in E)n.update(E[x],e.ARRAY_BUFFER)}function g(R){const E=[],x=R.index,N=R.attributes.position;let P=0;if(x!==null){const I=x.array;P=x.version;for(let T=0,m=I.length;T<m;T+=3){const H=I[T+0],U=I[T+1],y=I[T+2];E.push(H,U,U,y,y,H)}}else if(N!==void 0){const I=N.array;P=N.version;for(let T=0,m=I.length/3-1;T<m;T+=3){const H=T+0,U=T+1,y=T+2;E.push(H,U,U,y,y,H)}}else return;const c=new(Ga(E)?Fa:Ba)(E,1);c.version=P;const r=o.get(R);r&&n.remove(r),o.set(R,c)}function b(R){const E=o.get(R);if(E){const x=R.index;x!==null&&E.version<x.version&&g(R)}else g(R);return o.get(R)}return{get:f,update:C,getWireframeAttribute:b}}function Zl(e,n,t){let i;function l(E){i=E}let o,h;function f(E){o=E.type,h=E.bytesPerElement}function C(E,x){e.drawElements(i,x,o,E*h),t.update(x,i,1)}function g(E,x,N){N!==0&&(e.drawElementsInstanced(i,x,o,E*h,N),t.update(x,i,N))}function b(E,x,N){if(N===0)return;n.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,x,0,o,E,0,N);let c=0;for(let r=0;r<N;r++)c+=x[r];t.update(c,i,1)}function R(E,x,N,P){if(N===0)return;const c=n.get("WEBGL_multi_draw");if(c===null)for(let r=0;r<E.length;r++)g(E[r]/h,x[r],P[r]);else{c.multiDrawElementsInstancedWEBGL(i,x,0,o,E,0,P,0,N);let r=0;for(let I=0;I<N;I++)r+=x[I]*P[I];t.update(r,i,1)}}this.setMode=l,this.setIndex=f,this.render=C,this.renderInstances=g,this.renderMultiDraw=b,this.renderMultiDrawInstances=R}function Ql(e){const n={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(o,h,f){switch(t.calls++,h){case e.TRIANGLES:t.triangles+=f*(o/3);break;case e.LINES:t.lines+=f*(o/2);break;case e.LINE_STRIP:t.lines+=f*(o-1);break;case e.LINE_LOOP:t.lines+=f*o;break;case e.POINTS:t.points+=f*o;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",h);break}}function l(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:n,render:t,programs:null,autoReset:!0,reset:l,update:i}}function Jl(e,n,t){const i=new WeakMap,l=new ct;function o(h,f,C){const g=h.morphTargetInfluences,b=f.morphAttributes.position||f.morphAttributes.normal||f.morphAttributes.color,R=b!==void 0?b.length:0;let E=i.get(f);if(E===void 0||E.count!==R){let p=function(){y.dispose(),i.delete(f),f.removeEventListener("dispose",p)};E!==void 0&&E.texture.dispose();const x=f.morphAttributes.position!==void 0,N=f.morphAttributes.normal!==void 0,P=f.morphAttributes.color!==void 0,c=f.morphAttributes.position||[],r=f.morphAttributes.normal||[],I=f.morphAttributes.color||[];let T=0;x===!0&&(T=1),N===!0&&(T=2),P===!0&&(T=3);let m=f.attributes.position.count*T,H=1;m>n.maxTextureSize&&(H=Math.ceil(m/n.maxTextureSize),m=n.maxTextureSize);const U=new Float32Array(m*H*4*R),y=new mr(U,m,H,R);y.type=Dt,y.needsUpdate=!0;const B=T*4;for(let d=0;d<R;d++){const A=c[d],q=r[d],V=I[d],Y=m*H*4*d;for(let Q=0;Q<A.count;Q++){const W=Q*B;x===!0&&(l.fromBufferAttribute(A,Q),U[Y+W+0]=l.x,U[Y+W+1]=l.y,U[Y+W+2]=l.z,U[Y+W+3]=0),N===!0&&(l.fromBufferAttribute(q,Q),U[Y+W+4]=l.x,U[Y+W+5]=l.y,U[Y+W+6]=l.z,U[Y+W+7]=0),P===!0&&(l.fromBufferAttribute(V,Q),U[Y+W+8]=l.x,U[Y+W+9]=l.y,U[Y+W+10]=l.z,U[Y+W+11]=V.itemSize===4?l.w:1)}}E={count:R,texture:y,size:new ft(m,H)},i.set(f,E),f.addEventListener("dispose",p)}if(h.isInstancedMesh===!0&&h.morphTexture!==null)C.getUniforms().setValue(e,"morphTexture",h.morphTexture,t);else{let x=0;for(let P=0;P<g.length;P++)x+=g[P];const N=f.morphTargetsRelative?1:1-x;C.getUniforms().setValue(e,"morphTargetBaseInfluence",N),C.getUniforms().setValue(e,"morphTargetInfluences",g)}C.getUniforms().setValue(e,"morphTargetsTexture",E.texture,t),C.getUniforms().setValue(e,"morphTargetsTextureSize",E.size)}return{update:o}}function jl(e,n,t,i){let l=new WeakMap;function o(C){const g=i.render.frame,b=C.geometry,R=n.get(C,b);if(l.get(R)!==g&&(n.update(R),l.set(R,g)),C.isInstancedMesh&&(C.hasEventListener("dispose",f)===!1&&C.addEventListener("dispose",f),l.get(C)!==g&&(t.update(C.instanceMatrix,e.ARRAY_BUFFER),C.instanceColor!==null&&t.update(C.instanceColor,e.ARRAY_BUFFER),l.set(C,g))),C.isSkinnedMesh){const E=C.skeleton;l.get(E)!==g&&(E.update(),l.set(E,g))}return R}function h(){l=new WeakMap}function f(C){const g=C.target;g.removeEventListener("dispose",f),t.remove(g.instanceMatrix),g.instanceColor!==null&&t.remove(g.instanceColor)}return{update:o,dispose:h}}const Mr=new fr,Gi=new ir(1,1),Tr=new mr,xr=new Za,Ar=new $a,Hi=[],Vi=[],ki=new Float32Array(16),Wi=new Float32Array(9),zi=new Float32Array(4);function zt(e,n,t){const i=e[0];if(i<=0||i>0)return e;const l=n*t;let o=Hi[l];if(o===void 0&&(o=new Float32Array(l),Hi[l]=o),n!==0){i.toArray(o,0);for(let h=1,f=0;h!==n;++h)f+=t,e[h].toArray(o,f)}return o}function nt(e,n){if(e.length!==n.length)return!1;for(let t=0,i=e.length;t<i;t++)if(e[t]!==n[t])return!1;return!0}function it(e,n){for(let t=0,i=n.length;t<i;t++)e[t]=n[t]}function gn(e,n){let t=Vi[n];t===void 0&&(t=new Int32Array(n),Vi[n]=t);for(let i=0;i!==n;++i)t[i]=e.allocateTextureUnit();return t}function ec(e,n){const t=this.cache;t[0]!==n&&(e.uniform1f(this.addr,n),t[0]=n)}function tc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2f(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(nt(t,n))return;e.uniform2fv(this.addr,n),it(t,n)}}function nc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3f(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else if(n.r!==void 0)(t[0]!==n.r||t[1]!==n.g||t[2]!==n.b)&&(e.uniform3f(this.addr,n.r,n.g,n.b),t[0]=n.r,t[1]=n.g,t[2]=n.b);else{if(nt(t,n))return;e.uniform3fv(this.addr,n),it(t,n)}}function ic(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4f(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(nt(t,n))return;e.uniform4fv(this.addr,n),it(t,n)}}function rc(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(nt(t,n))return;e.uniformMatrix2fv(this.addr,!1,n),it(t,n)}else{if(nt(t,i))return;zi.set(i),e.uniformMatrix2fv(this.addr,!1,zi),it(t,i)}}function ac(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(nt(t,n))return;e.uniformMatrix3fv(this.addr,!1,n),it(t,n)}else{if(nt(t,i))return;Wi.set(i),e.uniformMatrix3fv(this.addr,!1,Wi),it(t,i)}}function oc(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(nt(t,n))return;e.uniformMatrix4fv(this.addr,!1,n),it(t,n)}else{if(nt(t,i))return;ki.set(i),e.uniformMatrix4fv(this.addr,!1,ki),it(t,i)}}function sc(e,n){const t=this.cache;t[0]!==n&&(e.uniform1i(this.addr,n),t[0]=n)}function lc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2i(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(nt(t,n))return;e.uniform2iv(this.addr,n),it(t,n)}}function cc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3i(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(nt(t,n))return;e.uniform3iv(this.addr,n),it(t,n)}}function fc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4i(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(nt(t,n))return;e.uniform4iv(this.addr,n),it(t,n)}}function dc(e,n){const t=this.cache;t[0]!==n&&(e.uniform1ui(this.addr,n),t[0]=n)}function uc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2ui(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(nt(t,n))return;e.uniform2uiv(this.addr,n),it(t,n)}}function pc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3ui(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(nt(t,n))return;e.uniform3uiv(this.addr,n),it(t,n)}}function hc(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4ui(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(nt(t,n))return;e.uniform4uiv(this.addr,n),it(t,n)}}function _c(e,n,t){const i=this.cache,l=t.allocateTextureUnit();i[0]!==l&&(e.uniform1i(this.addr,l),i[0]=l);let o;this.type===e.SAMPLER_2D_SHADOW?(Gi.compareFunction=ar,o=Gi):o=Mr,t.setTexture2D(n||o,l)}function mc(e,n,t){const i=this.cache,l=t.allocateTextureUnit();i[0]!==l&&(e.uniform1i(this.addr,l),i[0]=l),t.setTexture3D(n||xr,l)}function vc(e,n,t){const i=this.cache,l=t.allocateTextureUnit();i[0]!==l&&(e.uniform1i(this.addr,l),i[0]=l),t.setTextureCube(n||Ar,l)}function gc(e,n,t){const i=this.cache,l=t.allocateTextureUnit();i[0]!==l&&(e.uniform1i(this.addr,l),i[0]=l),t.setTexture2DArray(n||Tr,l)}function Ec(e){switch(e){case 5126:return ec;case 35664:return tc;case 35665:return nc;case 35666:return ic;case 35674:return rc;case 35675:return ac;case 35676:return oc;case 5124:case 35670:return sc;case 35667:case 35671:return lc;case 35668:case 35672:return cc;case 35669:case 35673:return fc;case 5125:return dc;case 36294:return uc;case 36295:return pc;case 36296:return hc;case 35678:case 36198:case 36298:case 36306:case 35682:return _c;case 35679:case 36299:case 36307:return mc;case 35680:case 36300:case 36308:case 36293:return vc;case 36289:case 36303:case 36311:case 36292:return gc}}function Sc(e,n){e.uniform1fv(this.addr,n)}function Mc(e,n){const t=zt(n,this.size,2);e.uniform2fv(this.addr,t)}function Tc(e,n){const t=zt(n,this.size,3);e.uniform3fv(this.addr,t)}function xc(e,n){const t=zt(n,this.size,4);e.uniform4fv(this.addr,t)}function Ac(e,n){const t=zt(n,this.size,4);e.uniformMatrix2fv(this.addr,!1,t)}function Rc(e,n){const t=zt(n,this.size,9);e.uniformMatrix3fv(this.addr,!1,t)}function Cc(e,n){const t=zt(n,this.size,16);e.uniformMatrix4fv(this.addr,!1,t)}function bc(e,n){e.uniform1iv(this.addr,n)}function Pc(e,n){e.uniform2iv(this.addr,n)}function Lc(e,n){e.uniform3iv(this.addr,n)}function Uc(e,n){e.uniform4iv(this.addr,n)}function Dc(e,n){e.uniform1uiv(this.addr,n)}function wc(e,n){e.uniform2uiv(this.addr,n)}function Ic(e,n){e.uniform3uiv(this.addr,n)}function yc(e,n){e.uniform4uiv(this.addr,n)}function Nc(e,n,t){const i=this.cache,l=n.length,o=gn(t,l);nt(i,o)||(e.uniform1iv(this.addr,o),it(i,o));for(let h=0;h!==l;++h)t.setTexture2D(n[h]||Mr,o[h])}function Oc(e,n,t){const i=this.cache,l=n.length,o=gn(t,l);nt(i,o)||(e.uniform1iv(this.addr,o),it(i,o));for(let h=0;h!==l;++h)t.setTexture3D(n[h]||xr,o[h])}function Fc(e,n,t){const i=this.cache,l=n.length,o=gn(t,l);nt(i,o)||(e.uniform1iv(this.addr,o),it(i,o));for(let h=0;h!==l;++h)t.setTextureCube(n[h]||Ar,o[h])}function Bc(e,n,t){const i=this.cache,l=n.length,o=gn(t,l);nt(i,o)||(e.uniform1iv(this.addr,o),it(i,o));for(let h=0;h!==l;++h)t.setTexture2DArray(n[h]||Tr,o[h])}function Gc(e){switch(e){case 5126:return Sc;case 35664:return Mc;case 35665:return Tc;case 35666:return xc;case 35674:return Ac;case 35675:return Rc;case 35676:return Cc;case 5124:case 35670:return bc;case 35667:case 35671:return Pc;case 35668:case 35672:return Lc;case 35669:case 35673:return Uc;case 5125:return Dc;case 36294:return wc;case 36295:return Ic;case 36296:return yc;case 35678:case 36198:case 36298:case 36306:case 35682:return Nc;case 35679:case 36299:case 36307:return Oc;case 35680:case 36300:case 36308:case 36293:return Fc;case 36289:case 36303:case 36311:case 36292:return Bc}}class Hc{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.setValue=Ec(t.type)}}class Vc{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Gc(t.type)}}class kc{constructor(n){this.id=n,this.seq=[],this.map={}}setValue(n,t,i){const l=this.seq;for(let o=0,h=l.length;o!==h;++o){const f=l[o];f.setValue(n,t[f.id],i)}}}const wn=/(\w+)(\])?(\[|\.)?/g;function Xi(e,n){e.seq.push(n),e.map[n.id]=n}function Wc(e,n,t){const i=e.name,l=i.length;for(wn.lastIndex=0;;){const o=wn.exec(i),h=wn.lastIndex;let f=o[1];const C=o[2]==="]",g=o[3];if(C&&(f=f|0),g===void 0||g==="["&&h+2===l){Xi(t,g===void 0?new Hc(f,e,n):new Vc(f,e,n));break}else{let R=t.map[f];R===void 0&&(R=new kc(f),Xi(t,R)),t=R}}}class dn{constructor(n,t){this.seq=[],this.map={};const i=n.getProgramParameter(t,n.ACTIVE_UNIFORMS);for(let l=0;l<i;++l){const o=n.getActiveUniform(t,l),h=n.getUniformLocation(t,o.name);Wc(o,h,this)}}setValue(n,t,i,l){const o=this.map[t];o!==void 0&&o.setValue(n,i,l)}setOptional(n,t,i){const l=t[i];l!==void 0&&this.setValue(n,i,l)}static upload(n,t,i,l){for(let o=0,h=t.length;o!==h;++o){const f=t[o],C=i[f.id];C.needsUpdate!==!1&&f.setValue(n,C.value,l)}}static seqWithValue(n,t){const i=[];for(let l=0,o=n.length;l!==o;++l){const h=n[l];h.id in t&&i.push(h)}return i}}function Yi(e,n,t){const i=e.createShader(n);return e.shaderSource(i,t),e.compileShader(i),i}const zc=37297;let Xc=0;function Yc(e,n){const t=e.split(`
`),i=[],l=Math.max(n-6,0),o=Math.min(n+6,t.length);for(let h=l;h<o;h++){const f=h+1;i.push(`${f===n?">":" "} ${f}: ${t[h]}`)}return i.join(`
`)}const qi=new Be;function qc(e){tt._getMatrix(qi,tt.workingColorSpace,e);const n=`mat3( ${qi.elements.map(t=>t.toFixed(4))} )`;switch(tt.getTransfer(e)){case Er:return[n,"LinearTransferOETF"];case Ye:return[n,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",e),[n,"LinearTransferOETF"]}}function Ki(e,n,t){const i=e.getShaderParameter(n,e.COMPILE_STATUS),l=e.getShaderInfoLog(n).trim();if(i&&l==="")return"";const o=/ERROR: 0:(\d+)/.exec(l);if(o){const h=parseInt(o[1]);return t.toUpperCase()+`

`+l+`

`+Yc(e.getShaderSource(n),h)}else return l}function Kc(e,n){const t=qc(n);return[`vec4 ${e}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function $c(e,n){let t;switch(n){case Ka:t="Linear";break;case qa:t="Reinhard";break;case Ya:t="Cineon";break;case Xa:t="ACESFilmic";break;case za:t="AgX";break;case Wa:t="Neutral";break;case ka:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",n),t="Linear"}return"vec3 "+e+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const sn=new ke;function Zc(){tt.getLuminanceCoefficients(sn);const e=sn.x.toFixed(4),n=sn.y.toFixed(4),t=sn.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${e}, ${n}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Qc(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",e.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Kt).join(`
`)}function Jc(e){const n=[];for(const t in e){const i=e[t];i!==!1&&n.push("#define "+t+" "+i)}return n.join(`
`)}function jc(e,n){const t={},i=e.getProgramParameter(n,e.ACTIVE_ATTRIBUTES);for(let l=0;l<i;l++){const o=e.getActiveAttrib(n,l),h=o.name;let f=1;o.type===e.FLOAT_MAT2&&(f=2),o.type===e.FLOAT_MAT3&&(f=3),o.type===e.FLOAT_MAT4&&(f=4),t[h]={type:o.type,location:e.getAttribLocation(n,h),locationSize:f}}return t}function Kt(e){return e!==""}function $i(e,n){const t=n.numSpotLightShadows+n.numSpotLightMaps-n.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,n.numDirLights).replace(/NUM_SPOT_LIGHTS/g,n.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,n.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,n.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,n.numPointLights).replace(/NUM_HEMI_LIGHTS/g,n.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,n.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,n.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,n.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,n.numPointLightShadows)}function Zi(e,n){return e.replace(/NUM_CLIPPING_PLANES/g,n.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,n.numClippingPlanes-n.numClipIntersection)}const ef=/^[ \t]*#include +<([\w\d./]+)>/gm;function Wn(e){return e.replace(ef,nf)}const tf=new Map;function nf(e,n){let t=Pe[n];if(t===void 0){const i=tf.get(n);if(i!==void 0)t=Pe[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',n,i);else throw new Error("Can not resolve #include <"+n+">")}return Wn(t)}const rf=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Qi(e){return e.replace(rf,af)}function af(e,n,t,i){let l="";for(let o=parseInt(n);o<parseInt(t);o++)l+=i.replace(/\[\s*i\s*\]/g,"[ "+o+" ]").replace(/UNROLLED_LOOP_INDEX/g,o);return l}function Ji(e){let n=`precision ${e.precision} float;
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
#define LOW_PRECISION`),n}function of(e){let n="SHADOWMAP_TYPE_BASIC";return e.shadowMapType===sr?n="SHADOWMAP_TYPE_PCF":e.shadowMapType===Va?n="SHADOWMAP_TYPE_PCF_SOFT":e.shadowMapType===St&&(n="SHADOWMAP_TYPE_VSM"),n}function sf(e){let n="ENVMAP_TYPE_CUBE";if(e.envMap)switch(e.envMapMode){case jt:case Wt:n="ENVMAP_TYPE_CUBE";break;case vn:n="ENVMAP_TYPE_CUBE_UV";break}return n}function lf(e){let n="ENVMAP_MODE_REFLECTION";if(e.envMap)switch(e.envMapMode){case Wt:n="ENVMAP_MODE_REFRACTION";break}return n}function cf(e){let n="ENVMAP_BLENDING_NONE";if(e.envMap)switch(e.combine){case eo:n="ENVMAP_BLENDING_MULTIPLY";break;case ja:n="ENVMAP_BLENDING_MIX";break;case Ja:n="ENVMAP_BLENDING_ADD";break}return n}function ff(e){const n=e.envMapCubeUVHeight;if(n===null)return null;const t=Math.log2(n)-2,i=1/n;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function df(e,n,t,i){const l=e.getContext(),o=t.defines;let h=t.vertexShader,f=t.fragmentShader;const C=of(t),g=sf(t),b=lf(t),R=cf(t),E=ff(t),x=Qc(t),N=Jc(o),P=l.createProgram();let c,r,I=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(c=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,N].filter(Kt).join(`
`),c.length>0&&(c+=`
`),r=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,N].filter(Kt).join(`
`),r.length>0&&(r+=`
`)):(c=[Ji(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,N,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+b:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+C:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Kt).join(`
`),r=[Ji(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,N,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+g:"",t.envMap?"#define "+b:"",t.envMap?"#define "+R:"",E?"#define CUBEUV_TEXEL_WIDTH "+E.texelWidth:"",E?"#define CUBEUV_TEXEL_HEIGHT "+E.texelHeight:"",E?"#define CUBEUV_MAX_MIP "+E.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+C:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==At?"#define TONE_MAPPING":"",t.toneMapping!==At?Pe.tonemapping_pars_fragment:"",t.toneMapping!==At?$c("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Pe.colorspace_pars_fragment,Kc("linearToOutputTexel",t.outputColorSpace),Zc(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Kt).join(`
`)),h=Wn(h),h=$i(h,t),h=Zi(h,t),f=Wn(f),f=$i(f,t),f=Zi(f,t),h=Qi(h),f=Qi(f),t.isRawShaderMaterial!==!0&&(I=`#version 300 es
`,c=[x,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+c,r=["#define varying in",t.glslVersion===Di?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Di?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+r);const T=I+c+h,m=I+r+f,H=Yi(l,l.VERTEX_SHADER,T),U=Yi(l,l.FRAGMENT_SHADER,m);l.attachShader(P,H),l.attachShader(P,U),t.index0AttributeName!==void 0?l.bindAttribLocation(P,0,t.index0AttributeName):t.morphTargets===!0&&l.bindAttribLocation(P,0,"position"),l.linkProgram(P);function y(A){if(e.debug.checkShaderErrors){const q=l.getProgramInfoLog(P).trim(),V=l.getShaderInfoLog(H).trim(),Y=l.getShaderInfoLog(U).trim();let Q=!0,W=!0;if(l.getProgramParameter(P,l.LINK_STATUS)===!1)if(Q=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(l,P,H,U);else{const j=Ki(l,H,"vertex"),F=Ki(l,U,"fragment");console.error("THREE.WebGLProgram: Shader Error "+l.getError()+" - VALIDATE_STATUS "+l.getProgramParameter(P,l.VALIDATE_STATUS)+`

Material Name: `+A.name+`
Material Type: `+A.type+`

Program Info Log: `+q+`
`+j+`
`+F)}else q!==""?console.warn("THREE.WebGLProgram: Program Info Log:",q):(V===""||Y==="")&&(W=!1);W&&(A.diagnostics={runnable:Q,programLog:q,vertexShader:{log:V,prefix:c},fragmentShader:{log:Y,prefix:r}})}l.deleteShader(H),l.deleteShader(U),B=new dn(l,P),p=jc(l,P)}let B;this.getUniforms=function(){return B===void 0&&y(this),B};let p;this.getAttributes=function(){return p===void 0&&y(this),p};let d=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return d===!1&&(d=l.getProgramParameter(P,zc)),d},this.destroy=function(){i.releaseStatesOfProgram(this),l.deleteProgram(P),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Xc++,this.cacheKey=n,this.usedTimes=1,this.program=P,this.vertexShader=H,this.fragmentShader=U,this}let uf=0;class pf{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(n){const t=n.vertexShader,i=n.fragmentShader,l=this._getShaderStage(t),o=this._getShaderStage(i),h=this._getShaderCacheForMaterial(n);return h.has(l)===!1&&(h.add(l),l.usedTimes++),h.has(o)===!1&&(h.add(o),o.usedTimes++),this}remove(n){const t=this.materialCache.get(n);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(n),this}getVertexShaderID(n){return this._getShaderStage(n.vertexShader).id}getFragmentShaderID(n){return this._getShaderStage(n.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(n){const t=this.materialCache;let i=t.get(n);return i===void 0&&(i=new Set,t.set(n,i)),i}_getShaderStage(n){const t=this.shaderCache;let i=t.get(n);return i===void 0&&(i=new hf(n),t.set(n,i)),i}}class hf{constructor(n){this.id=uf++,this.code=n,this.usedTimes=0}}function _f(e,n,t,i,l,o,h){const f=new Ha,C=new pf,g=new Set,b=[],R=l.logarithmicDepthBuffer,E=l.vertexTextures;let x=l.precision;const N={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function P(p){return g.add(p),p===0?"uv":`uv${p}`}function c(p,d,A,q,V){const Y=q.fog,Q=V.geometry,W=p.isMeshStandardMaterial?q.environment:null,j=(p.isMeshStandardMaterial?t:n).get(p.envMap||W),F=j&&j.mapping===vn?j.image.height:null,he=N[p.type];p.precision!==null&&(x=l.getMaxPrecision(p.precision),x!==p.precision&&console.warn("THREE.WebGLProgram.getParameters:",p.precision,"not supported, using",x,"instead."));const Se=Q.morphAttributes.position||Q.morphAttributes.normal||Q.morphAttributes.color,Le=Se!==void 0?Se.length:0;let Ge=0;Q.morphAttributes.position!==void 0&&(Ge=1),Q.morphAttributes.normal!==void 0&&(Ge=2),Q.morphAttributes.color!==void 0&&(Ge=3);let Ze,k,J,ue;if(he){const We=gt[he];Ze=We.vertexShader,k=We.fragmentShader}else Ze=p.vertexShader,k=p.fragmentShader,C.update(p),J=C.getVertexShaderID(p),ue=C.getFragmentShaderID(p);const ie=e.getRenderTarget(),Me=e.state.buffers.depth.getReversed(),Re=V.isInstancedMesh===!0,Ue=V.isBatchedMesh===!0,$e=!!p.map,ye=!!p.matcap,je=!!j,_=!!p.aoMap,ut=!!p.lightMap,De=!!p.bumpMap,we=!!p.normalMap,_e=!!p.displacementMap,Xe=!!p.emissiveMap,me=!!p.metalnessMap,u=!!p.roughnessMap,a=p.anisotropy>0,L=p.clearcoat>0,z=p.dispersion>0,K=p.iridescence>0,G=p.sheen>0,pe=p.transmission>0,re=a&&!!p.anisotropyMap,le=L&&!!p.clearcoatMap,Ne=L&&!!p.clearcoatNormalMap,Z=L&&!!p.clearcoatRoughnessMap,ce=K&&!!p.iridescenceMap,Ee=K&&!!p.iridescenceThicknessMap,Te=G&&!!p.sheenColorMap,fe=G&&!!p.sheenRoughnessMap,Ie=!!p.specularMap,be=!!p.specularColorMap,ze=!!p.specularIntensityMap,v=pe&&!!p.transmissionMap,te=pe&&!!p.thicknessMap,O=!!p.gradientMap,X=!!p.alphaMap,oe=p.alphaTest>0,ae=!!p.alphaHash,Ce=!!p.extensions;let Qe=At;p.toneMapped&&(ie===null||ie.isXRRenderTarget===!0)&&(Qe=e.toneMapping);const at={shaderID:he,shaderType:p.type,shaderName:p.name,vertexShader:Ze,fragmentShader:k,defines:p.defines,customVertexShaderID:J,customFragmentShaderID:ue,isRawShaderMaterial:p.isRawShaderMaterial===!0,glslVersion:p.glslVersion,precision:x,batching:Ue,batchingColor:Ue&&V._colorsTexture!==null,instancing:Re,instancingColor:Re&&V.instanceColor!==null,instancingMorph:Re&&V.morphTexture!==null,supportsVertexTextures:E,outputColorSpace:ie===null?e.outputColorSpace:ie.isXRRenderTarget===!0?ie.texture.colorSpace:mn,alphaToCoverage:!!p.alphaToCoverage,map:$e,matcap:ye,envMap:je,envMapMode:je&&j.mapping,envMapCubeUVHeight:F,aoMap:_,lightMap:ut,bumpMap:De,normalMap:we,displacementMap:E&&_e,emissiveMap:Xe,normalMapObjectSpace:we&&p.normalMapType===Oa,normalMapTangentSpace:we&&p.normalMapType===Na,metalnessMap:me,roughnessMap:u,anisotropy:a,anisotropyMap:re,clearcoat:L,clearcoatMap:le,clearcoatNormalMap:Ne,clearcoatRoughnessMap:Z,dispersion:z,iridescence:K,iridescenceMap:ce,iridescenceThicknessMap:Ee,sheen:G,sheenColorMap:Te,sheenRoughnessMap:fe,specularMap:Ie,specularColorMap:be,specularIntensityMap:ze,transmission:pe,transmissionMap:v,thicknessMap:te,gradientMap:O,opaque:p.transparent===!1&&p.blending===fn&&p.alphaToCoverage===!1,alphaMap:X,alphaTest:oe,alphaHash:ae,combine:p.combine,mapUv:$e&&P(p.map.channel),aoMapUv:_&&P(p.aoMap.channel),lightMapUv:ut&&P(p.lightMap.channel),bumpMapUv:De&&P(p.bumpMap.channel),normalMapUv:we&&P(p.normalMap.channel),displacementMapUv:_e&&P(p.displacementMap.channel),emissiveMapUv:Xe&&P(p.emissiveMap.channel),metalnessMapUv:me&&P(p.metalnessMap.channel),roughnessMapUv:u&&P(p.roughnessMap.channel),anisotropyMapUv:re&&P(p.anisotropyMap.channel),clearcoatMapUv:le&&P(p.clearcoatMap.channel),clearcoatNormalMapUv:Ne&&P(p.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Z&&P(p.clearcoatRoughnessMap.channel),iridescenceMapUv:ce&&P(p.iridescenceMap.channel),iridescenceThicknessMapUv:Ee&&P(p.iridescenceThicknessMap.channel),sheenColorMapUv:Te&&P(p.sheenColorMap.channel),sheenRoughnessMapUv:fe&&P(p.sheenRoughnessMap.channel),specularMapUv:Ie&&P(p.specularMap.channel),specularColorMapUv:be&&P(p.specularColorMap.channel),specularIntensityMapUv:ze&&P(p.specularIntensityMap.channel),transmissionMapUv:v&&P(p.transmissionMap.channel),thicknessMapUv:te&&P(p.thicknessMap.channel),alphaMapUv:X&&P(p.alphaMap.channel),vertexTangents:!!Q.attributes.tangent&&(we||a),vertexColors:p.vertexColors,vertexAlphas:p.vertexColors===!0&&!!Q.attributes.color&&Q.attributes.color.itemSize===4,pointsUvs:V.isPoints===!0&&!!Q.attributes.uv&&($e||X),fog:!!Y,useFog:p.fog===!0,fogExp2:!!Y&&Y.isFogExp2,flatShading:p.flatShading===!0,sizeAttenuation:p.sizeAttenuation===!0,logarithmicDepthBuffer:R,reverseDepthBuffer:Me,skinning:V.isSkinnedMesh===!0,morphTargets:Q.morphAttributes.position!==void 0,morphNormals:Q.morphAttributes.normal!==void 0,morphColors:Q.morphAttributes.color!==void 0,morphTargetsCount:Le,morphTextureStride:Ge,numDirLights:d.directional.length,numPointLights:d.point.length,numSpotLights:d.spot.length,numSpotLightMaps:d.spotLightMap.length,numRectAreaLights:d.rectArea.length,numHemiLights:d.hemi.length,numDirLightShadows:d.directionalShadowMap.length,numPointLightShadows:d.pointShadowMap.length,numSpotLightShadows:d.spotShadowMap.length,numSpotLightShadowsWithMaps:d.numSpotLightShadowsWithMaps,numLightProbes:d.numLightProbes,numClippingPlanes:h.numPlanes,numClipIntersection:h.numIntersection,dithering:p.dithering,shadowMapEnabled:e.shadowMap.enabled&&A.length>0,shadowMapType:e.shadowMap.type,toneMapping:Qe,decodeVideoTexture:$e&&p.map.isVideoTexture===!0&&tt.getTransfer(p.map.colorSpace)===Ye,decodeVideoTextureEmissive:Xe&&p.emissiveMap.isVideoTexture===!0&&tt.getTransfer(p.emissiveMap.colorSpace)===Ye,premultipliedAlpha:p.premultipliedAlpha,doubleSided:p.side===Mt,flipSided:p.side===_t,useDepthPacking:p.depthPacking>=0,depthPacking:p.depthPacking||0,index0AttributeName:p.index0AttributeName,extensionClipCullDistance:Ce&&p.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ce&&p.extensions.multiDraw===!0||Ue)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:p.customProgramCacheKey()};return at.vertexUv1s=g.has(1),at.vertexUv2s=g.has(2),at.vertexUv3s=g.has(3),g.clear(),at}function r(p){const d=[];if(p.shaderID?d.push(p.shaderID):(d.push(p.customVertexShaderID),d.push(p.customFragmentShaderID)),p.defines!==void 0)for(const A in p.defines)d.push(A),d.push(p.defines[A]);return p.isRawShaderMaterial===!1&&(I(d,p),T(d,p),d.push(e.outputColorSpace)),d.push(p.customProgramCacheKey),d.join()}function I(p,d){p.push(d.precision),p.push(d.outputColorSpace),p.push(d.envMapMode),p.push(d.envMapCubeUVHeight),p.push(d.mapUv),p.push(d.alphaMapUv),p.push(d.lightMapUv),p.push(d.aoMapUv),p.push(d.bumpMapUv),p.push(d.normalMapUv),p.push(d.displacementMapUv),p.push(d.emissiveMapUv),p.push(d.metalnessMapUv),p.push(d.roughnessMapUv),p.push(d.anisotropyMapUv),p.push(d.clearcoatMapUv),p.push(d.clearcoatNormalMapUv),p.push(d.clearcoatRoughnessMapUv),p.push(d.iridescenceMapUv),p.push(d.iridescenceThicknessMapUv),p.push(d.sheenColorMapUv),p.push(d.sheenRoughnessMapUv),p.push(d.specularMapUv),p.push(d.specularColorMapUv),p.push(d.specularIntensityMapUv),p.push(d.transmissionMapUv),p.push(d.thicknessMapUv),p.push(d.combine),p.push(d.fogExp2),p.push(d.sizeAttenuation),p.push(d.morphTargetsCount),p.push(d.morphAttributeCount),p.push(d.numDirLights),p.push(d.numPointLights),p.push(d.numSpotLights),p.push(d.numSpotLightMaps),p.push(d.numHemiLights),p.push(d.numRectAreaLights),p.push(d.numDirLightShadows),p.push(d.numPointLightShadows),p.push(d.numSpotLightShadows),p.push(d.numSpotLightShadowsWithMaps),p.push(d.numLightProbes),p.push(d.shadowMapType),p.push(d.toneMapping),p.push(d.numClippingPlanes),p.push(d.numClipIntersection),p.push(d.depthPacking)}function T(p,d){f.disableAll(),d.supportsVertexTextures&&f.enable(0),d.instancing&&f.enable(1),d.instancingColor&&f.enable(2),d.instancingMorph&&f.enable(3),d.matcap&&f.enable(4),d.envMap&&f.enable(5),d.normalMapObjectSpace&&f.enable(6),d.normalMapTangentSpace&&f.enable(7),d.clearcoat&&f.enable(8),d.iridescence&&f.enable(9),d.alphaTest&&f.enable(10),d.vertexColors&&f.enable(11),d.vertexAlphas&&f.enable(12),d.vertexUv1s&&f.enable(13),d.vertexUv2s&&f.enable(14),d.vertexUv3s&&f.enable(15),d.vertexTangents&&f.enable(16),d.anisotropy&&f.enable(17),d.alphaHash&&f.enable(18),d.batching&&f.enable(19),d.dispersion&&f.enable(20),d.batchingColor&&f.enable(21),p.push(f.mask),f.disableAll(),d.fog&&f.enable(0),d.useFog&&f.enable(1),d.flatShading&&f.enable(2),d.logarithmicDepthBuffer&&f.enable(3),d.reverseDepthBuffer&&f.enable(4),d.skinning&&f.enable(5),d.morphTargets&&f.enable(6),d.morphNormals&&f.enable(7),d.morphColors&&f.enable(8),d.premultipliedAlpha&&f.enable(9),d.shadowMapEnabled&&f.enable(10),d.doubleSided&&f.enable(11),d.flipSided&&f.enable(12),d.useDepthPacking&&f.enable(13),d.dithering&&f.enable(14),d.transmission&&f.enable(15),d.sheen&&f.enable(16),d.opaque&&f.enable(17),d.pointsUvs&&f.enable(18),d.decodeVideoTexture&&f.enable(19),d.decodeVideoTextureEmissive&&f.enable(20),d.alphaToCoverage&&f.enable(21),p.push(f.mask)}function m(p){const d=N[p.type];let A;if(d){const q=gt[d];A=ya.clone(q.uniforms)}else A=p.uniforms;return A}function H(p,d){let A;for(let q=0,V=b.length;q<V;q++){const Y=b[q];if(Y.cacheKey===d){A=Y,++A.usedTimes;break}}return A===void 0&&(A=new df(e,d,p,o),b.push(A)),A}function U(p){if(--p.usedTimes===0){const d=b.indexOf(p);b[d]=b[b.length-1],b.pop(),p.destroy()}}function y(p){C.remove(p)}function B(){C.dispose()}return{getParameters:c,getProgramCacheKey:r,getUniforms:m,acquireProgram:H,releaseProgram:U,releaseShaderCache:y,programs:b,dispose:B}}function mf(){let e=new WeakMap;function n(h){return e.has(h)}function t(h){let f=e.get(h);return f===void 0&&(f={},e.set(h,f)),f}function i(h){e.delete(h)}function l(h,f,C){e.get(h)[f]=C}function o(){e=new WeakMap}return{has:n,get:t,remove:i,update:l,dispose:o}}function vf(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.material.id!==n.material.id?e.material.id-n.material.id:e.z!==n.z?e.z-n.z:e.id-n.id}function ji(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.z!==n.z?n.z-e.z:e.id-n.id}function er(){const e=[];let n=0;const t=[],i=[],l=[];function o(){n=0,t.length=0,i.length=0,l.length=0}function h(R,E,x,N,P,c){let r=e[n];return r===void 0?(r={id:R.id,object:R,geometry:E,material:x,groupOrder:N,renderOrder:R.renderOrder,z:P,group:c},e[n]=r):(r.id=R.id,r.object=R,r.geometry=E,r.material=x,r.groupOrder=N,r.renderOrder=R.renderOrder,r.z=P,r.group=c),n++,r}function f(R,E,x,N,P,c){const r=h(R,E,x,N,P,c);x.transmission>0?i.push(r):x.transparent===!0?l.push(r):t.push(r)}function C(R,E,x,N,P,c){const r=h(R,E,x,N,P,c);x.transmission>0?i.unshift(r):x.transparent===!0?l.unshift(r):t.unshift(r)}function g(R,E){t.length>1&&t.sort(R||vf),i.length>1&&i.sort(E||ji),l.length>1&&l.sort(E||ji)}function b(){for(let R=n,E=e.length;R<E;R++){const x=e[R];if(x.id===null)break;x.id=null,x.object=null,x.geometry=null,x.material=null,x.group=null}}return{opaque:t,transmissive:i,transparent:l,init:o,push:f,unshift:C,finish:b,sort:g}}function gf(){let e=new WeakMap;function n(i,l){const o=e.get(i);let h;return o===void 0?(h=new er,e.set(i,[h])):l>=o.length?(h=new er,o.push(h)):h=o[l],h}function t(){e=new WeakMap}return{get:n,dispose:t}}function Ef(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={direction:new ke,color:new Ke};break;case"SpotLight":t={position:new ke,direction:new ke,color:new Ke,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new ke,color:new Ke,distance:0,decay:0};break;case"HemisphereLight":t={direction:new ke,skyColor:new Ke,groundColor:new Ke};break;case"RectAreaLight":t={color:new Ke,position:new ke,halfWidth:new ke,halfHeight:new ke};break}return e[n.id]=t,t}}}function Sf(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ft,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[n.id]=t,t}}}let Mf=0;function Tf(e,n){return(n.castShadow?2:0)-(e.castShadow?2:0)+(n.map?1:0)-(e.map?1:0)}function xf(e){const n=new Ef,t=Sf(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let g=0;g<9;g++)i.probe.push(new ke);const l=new ke,o=new Vt,h=new Vt;function f(g){let b=0,R=0,E=0;for(let p=0;p<9;p++)i.probe[p].set(0,0,0);let x=0,N=0,P=0,c=0,r=0,I=0,T=0,m=0,H=0,U=0,y=0;g.sort(Tf);for(let p=0,d=g.length;p<d;p++){const A=g[p],q=A.color,V=A.intensity,Y=A.distance,Q=A.shadow&&A.shadow.map?A.shadow.map.texture:null;if(A.isAmbientLight)b+=q.r*V,R+=q.g*V,E+=q.b*V;else if(A.isLightProbe){for(let W=0;W<9;W++)i.probe[W].addScaledVector(A.sh.coefficients[W],V);y++}else if(A.isDirectionalLight){const W=n.get(A);if(W.color.copy(A.color).multiplyScalar(A.intensity),A.castShadow){const j=A.shadow,F=t.get(A);F.shadowIntensity=j.intensity,F.shadowBias=j.bias,F.shadowNormalBias=j.normalBias,F.shadowRadius=j.radius,F.shadowMapSize=j.mapSize,i.directionalShadow[x]=F,i.directionalShadowMap[x]=Q,i.directionalShadowMatrix[x]=A.shadow.matrix,I++}i.directional[x]=W,x++}else if(A.isSpotLight){const W=n.get(A);W.position.setFromMatrixPosition(A.matrixWorld),W.color.copy(q).multiplyScalar(V),W.distance=Y,W.coneCos=Math.cos(A.angle),W.penumbraCos=Math.cos(A.angle*(1-A.penumbra)),W.decay=A.decay,i.spot[P]=W;const j=A.shadow;if(A.map&&(i.spotLightMap[H]=A.map,H++,j.updateMatrices(A),A.castShadow&&U++),i.spotLightMatrix[P]=j.matrix,A.castShadow){const F=t.get(A);F.shadowIntensity=j.intensity,F.shadowBias=j.bias,F.shadowNormalBias=j.normalBias,F.shadowRadius=j.radius,F.shadowMapSize=j.mapSize,i.spotShadow[P]=F,i.spotShadowMap[P]=Q,m++}P++}else if(A.isRectAreaLight){const W=n.get(A);W.color.copy(q).multiplyScalar(V),W.halfWidth.set(A.width*.5,0,0),W.halfHeight.set(0,A.height*.5,0),i.rectArea[c]=W,c++}else if(A.isPointLight){const W=n.get(A);if(W.color.copy(A.color).multiplyScalar(A.intensity),W.distance=A.distance,W.decay=A.decay,A.castShadow){const j=A.shadow,F=t.get(A);F.shadowIntensity=j.intensity,F.shadowBias=j.bias,F.shadowNormalBias=j.normalBias,F.shadowRadius=j.radius,F.shadowMapSize=j.mapSize,F.shadowCameraNear=j.camera.near,F.shadowCameraFar=j.camera.far,i.pointShadow[N]=F,i.pointShadowMap[N]=Q,i.pointShadowMatrix[N]=A.shadow.matrix,T++}i.point[N]=W,N++}else if(A.isHemisphereLight){const W=n.get(A);W.skyColor.copy(A.color).multiplyScalar(V),W.groundColor.copy(A.groundColor).multiplyScalar(V),i.hemi[r]=W,r++}}c>0&&(e.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ee.LTC_FLOAT_1,i.rectAreaLTC2=ee.LTC_FLOAT_2):(i.rectAreaLTC1=ee.LTC_HALF_1,i.rectAreaLTC2=ee.LTC_HALF_2)),i.ambient[0]=b,i.ambient[1]=R,i.ambient[2]=E;const B=i.hash;(B.directionalLength!==x||B.pointLength!==N||B.spotLength!==P||B.rectAreaLength!==c||B.hemiLength!==r||B.numDirectionalShadows!==I||B.numPointShadows!==T||B.numSpotShadows!==m||B.numSpotMaps!==H||B.numLightProbes!==y)&&(i.directional.length=x,i.spot.length=P,i.rectArea.length=c,i.point.length=N,i.hemi.length=r,i.directionalShadow.length=I,i.directionalShadowMap.length=I,i.pointShadow.length=T,i.pointShadowMap.length=T,i.spotShadow.length=m,i.spotShadowMap.length=m,i.directionalShadowMatrix.length=I,i.pointShadowMatrix.length=T,i.spotLightMatrix.length=m+H-U,i.spotLightMap.length=H,i.numSpotLightShadowsWithMaps=U,i.numLightProbes=y,B.directionalLength=x,B.pointLength=N,B.spotLength=P,B.rectAreaLength=c,B.hemiLength=r,B.numDirectionalShadows=I,B.numPointShadows=T,B.numSpotShadows=m,B.numSpotMaps=H,B.numLightProbes=y,i.version=Mf++)}function C(g,b){let R=0,E=0,x=0,N=0,P=0;const c=b.matrixWorldInverse;for(let r=0,I=g.length;r<I;r++){const T=g[r];if(T.isDirectionalLight){const m=i.directional[R];m.direction.setFromMatrixPosition(T.matrixWorld),l.setFromMatrixPosition(T.target.matrixWorld),m.direction.sub(l),m.direction.transformDirection(c),R++}else if(T.isSpotLight){const m=i.spot[x];m.position.setFromMatrixPosition(T.matrixWorld),m.position.applyMatrix4(c),m.direction.setFromMatrixPosition(T.matrixWorld),l.setFromMatrixPosition(T.target.matrixWorld),m.direction.sub(l),m.direction.transformDirection(c),x++}else if(T.isRectAreaLight){const m=i.rectArea[N];m.position.setFromMatrixPosition(T.matrixWorld),m.position.applyMatrix4(c),h.identity(),o.copy(T.matrixWorld),o.premultiply(c),h.extractRotation(o),m.halfWidth.set(T.width*.5,0,0),m.halfHeight.set(0,T.height*.5,0),m.halfWidth.applyMatrix4(h),m.halfHeight.applyMatrix4(h),N++}else if(T.isPointLight){const m=i.point[E];m.position.setFromMatrixPosition(T.matrixWorld),m.position.applyMatrix4(c),E++}else if(T.isHemisphereLight){const m=i.hemi[P];m.direction.setFromMatrixPosition(T.matrixWorld),m.direction.transformDirection(c),P++}}}return{setup:f,setupView:C,state:i}}function tr(e){const n=new xf(e),t=[],i=[];function l(b){g.camera=b,t.length=0,i.length=0}function o(b){t.push(b)}function h(b){i.push(b)}function f(){n.setup(t)}function C(b){n.setupView(t,b)}const g={lightsArray:t,shadowsArray:i,camera:null,lights:n,transmissionRenderTarget:{}};return{init:l,state:g,setupLights:f,setupLightsView:C,pushLight:o,pushShadow:h}}function Af(e){let n=new WeakMap;function t(l,o=0){const h=n.get(l);let f;return h===void 0?(f=new tr(e),n.set(l,[f])):o>=h.length?(f=new tr(e),h.push(f)):f=h[o],f}function i(){n=new WeakMap}return{get:t,dispose:i}}const Rf=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Cf=`uniform sampler2D shadow_pass;
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
}`;function bf(e,n,t){let i=new nr;const l=new ft,o=new ft,h=new ct,f=new va({depthPacking:ga}),C=new Ea,g={},b=t.maxTextureSize,R={[Zt]:_t,[_t]:Zt,[Mt]:Mt},E=new yt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ft},radius:{value:4}},vertexShader:Rf,fragmentShader:Cf}),x=E.clone();x.defines.HORIZONTAL_PASS=1;const N=new or;N.setAttribute("position",new cn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const P=new xt(N,E),c=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=sr;let r=this.type;this.render=function(U,y,B){if(c.enabled===!1||c.autoUpdate===!1&&c.needsUpdate===!1||U.length===0)return;const p=e.getRenderTarget(),d=e.getActiveCubeFace(),A=e.getActiveMipmapLevel(),q=e.state;q.setBlending(wt),q.buffers.color.setClear(1,1,1,1),q.buffers.depth.setTest(!0),q.setScissorTest(!1);const V=r!==St&&this.type===St,Y=r===St&&this.type!==St;for(let Q=0,W=U.length;Q<W;Q++){const j=U[Q],F=j.shadow;if(F===void 0){console.warn("THREE.WebGLShadowMap:",j,"has no shadow.");continue}if(F.autoUpdate===!1&&F.needsUpdate===!1)continue;l.copy(F.mapSize);const he=F.getFrameExtents();if(l.multiply(he),o.copy(F.mapSize),(l.x>b||l.y>b)&&(l.x>b&&(o.x=Math.floor(b/he.x),l.x=o.x*he.x,F.mapSize.x=o.x),l.y>b&&(o.y=Math.floor(b/he.y),l.y=o.y*he.y,F.mapSize.y=o.y)),F.map===null||V===!0||Y===!0){const Le=this.type!==St?{minFilter:$t,magFilter:$t}:{};F.map!==null&&F.map.dispose(),F.map=new kt(l.x,l.y,Le),F.map.texture.name=j.name+".shadowMap",F.camera.updateProjectionMatrix()}e.setRenderTarget(F.map),e.clear();const Se=F.getViewportCount();for(let Le=0;Le<Se;Le++){const Ge=F.getViewport(Le);h.set(o.x*Ge.x,o.y*Ge.y,o.x*Ge.z,o.y*Ge.w),q.viewport(h),F.updateMatrices(j,Le),i=F.getFrustum(),m(y,B,F.camera,j,this.type)}F.isPointLightShadow!==!0&&this.type===St&&I(F,B),F.needsUpdate=!1}r=this.type,c.needsUpdate=!1,e.setRenderTarget(p,d,A)};function I(U,y){const B=n.update(P);E.defines.VSM_SAMPLES!==U.blurSamples&&(E.defines.VSM_SAMPLES=U.blurSamples,x.defines.VSM_SAMPLES=U.blurSamples,E.needsUpdate=!0,x.needsUpdate=!0),U.mapPass===null&&(U.mapPass=new kt(l.x,l.y)),E.uniforms.shadow_pass.value=U.map.texture,E.uniforms.resolution.value=U.mapSize,E.uniforms.radius.value=U.radius,e.setRenderTarget(U.mapPass),e.clear(),e.renderBufferDirect(y,null,B,E,P,null),x.uniforms.shadow_pass.value=U.mapPass.texture,x.uniforms.resolution.value=U.mapSize,x.uniforms.radius.value=U.radius,e.setRenderTarget(U.map),e.clear(),e.renderBufferDirect(y,null,B,x,P,null)}function T(U,y,B,p){let d=null;const A=B.isPointLight===!0?U.customDistanceMaterial:U.customDepthMaterial;if(A!==void 0)d=A;else if(d=B.isPointLight===!0?C:f,e.localClippingEnabled&&y.clipShadows===!0&&Array.isArray(y.clippingPlanes)&&y.clippingPlanes.length!==0||y.displacementMap&&y.displacementScale!==0||y.alphaMap&&y.alphaTest>0||y.map&&y.alphaTest>0){const q=d.uuid,V=y.uuid;let Y=g[q];Y===void 0&&(Y={},g[q]=Y);let Q=Y[V];Q===void 0&&(Q=d.clone(),Y[V]=Q,y.addEventListener("dispose",H)),d=Q}if(d.visible=y.visible,d.wireframe=y.wireframe,p===St?d.side=y.shadowSide!==null?y.shadowSide:y.side:d.side=y.shadowSide!==null?y.shadowSide:R[y.side],d.alphaMap=y.alphaMap,d.alphaTest=y.alphaTest,d.map=y.map,d.clipShadows=y.clipShadows,d.clippingPlanes=y.clippingPlanes,d.clipIntersection=y.clipIntersection,d.displacementMap=y.displacementMap,d.displacementScale=y.displacementScale,d.displacementBias=y.displacementBias,d.wireframeLinewidth=y.wireframeLinewidth,d.linewidth=y.linewidth,B.isPointLight===!0&&d.isMeshDistanceMaterial===!0){const q=e.properties.get(d);q.light=B}return d}function m(U,y,B,p,d){if(U.visible===!1)return;if(U.layers.test(y.layers)&&(U.isMesh||U.isLine||U.isPoints)&&(U.castShadow||U.receiveShadow&&d===St)&&(!U.frustumCulled||i.intersectsObject(U))){U.modelViewMatrix.multiplyMatrices(B.matrixWorldInverse,U.matrixWorld);const V=n.update(U),Y=U.material;if(Array.isArray(Y)){const Q=V.groups;for(let W=0,j=Q.length;W<j;W++){const F=Q[W],he=Y[F.materialIndex];if(he&&he.visible){const Se=T(U,he,p,d);U.onBeforeShadow(e,U,y,B,V,Se,F),e.renderBufferDirect(B,null,V,Se,U,F),U.onAfterShadow(e,U,y,B,V,Se,F)}}}else if(Y.visible){const Q=T(U,Y,p,d);U.onBeforeShadow(e,U,y,B,V,Q,null),e.renderBufferDirect(B,null,V,Q,U,null),U.onAfterShadow(e,U,y,B,V,Q,null)}}const q=U.children;for(let V=0,Y=q.length;V<Y;V++)m(q[V],y,B,p,d)}function H(U){U.target.removeEventListener("dispose",H);for(const B in g){const p=g[B],d=U.target.uuid;d in p&&(p[d].dispose(),delete p[d])}}}const Pf={[Hn]:Gn,[Bn]:Nn,[Fn]:yn,[pn]:On,[Gn]:Hn,[Nn]:Bn,[yn]:Fn,[On]:pn};function Lf(e,n){function t(){let v=!1;const te=new ct;let O=null;const X=new ct(0,0,0,0);return{setMask:function(oe){O!==oe&&!v&&(e.colorMask(oe,oe,oe,oe),O=oe)},setLocked:function(oe){v=oe},setClear:function(oe,ae,Ce,Qe,at){at===!0&&(oe*=Qe,ae*=Qe,Ce*=Qe),te.set(oe,ae,Ce,Qe),X.equals(te)===!1&&(e.clearColor(oe,ae,Ce,Qe),X.copy(te))},reset:function(){v=!1,O=null,X.set(-1,0,0,0)}}}function i(){let v=!1,te=!1,O=null,X=null,oe=null;return{setReversed:function(ae){if(te!==ae){const Ce=n.get("EXT_clip_control");te?Ce.clipControlEXT(Ce.LOWER_LEFT_EXT,Ce.ZERO_TO_ONE_EXT):Ce.clipControlEXT(Ce.LOWER_LEFT_EXT,Ce.NEGATIVE_ONE_TO_ONE_EXT);const Qe=oe;oe=null,this.setClear(Qe)}te=ae},getReversed:function(){return te},setTest:function(ae){ae?ie(e.DEPTH_TEST):Me(e.DEPTH_TEST)},setMask:function(ae){O!==ae&&!v&&(e.depthMask(ae),O=ae)},setFunc:function(ae){if(te&&(ae=Pf[ae]),X!==ae){switch(ae){case Hn:e.depthFunc(e.NEVER);break;case Gn:e.depthFunc(e.ALWAYS);break;case Bn:e.depthFunc(e.LESS);break;case pn:e.depthFunc(e.LEQUAL);break;case Fn:e.depthFunc(e.EQUAL);break;case On:e.depthFunc(e.GEQUAL);break;case Nn:e.depthFunc(e.GREATER);break;case yn:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}X=ae}},setLocked:function(ae){v=ae},setClear:function(ae){oe!==ae&&(te&&(ae=1-ae),e.clearDepth(ae),oe=ae)},reset:function(){v=!1,O=null,X=null,oe=null,te=!1}}}function l(){let v=!1,te=null,O=null,X=null,oe=null,ae=null,Ce=null,Qe=null,at=null;return{setTest:function(We){v||(We?ie(e.STENCIL_TEST):Me(e.STENCIL_TEST))},setMask:function(We){te!==We&&!v&&(e.stencilMask(We),te=We)},setFunc:function(We,mt,Et){(O!==We||X!==mt||oe!==Et)&&(e.stencilFunc(We,mt,Et),O=We,X=mt,oe=Et)},setOp:function(We,mt,Et){(ae!==We||Ce!==mt||Qe!==Et)&&(e.stencilOp(We,mt,Et),ae=We,Ce=mt,Qe=Et)},setLocked:function(We){v=We},setClear:function(We){at!==We&&(e.clearStencil(We),at=We)},reset:function(){v=!1,te=null,O=null,X=null,oe=null,ae=null,Ce=null,Qe=null,at=null}}}const o=new t,h=new i,f=new l,C=new WeakMap,g=new WeakMap;let b={},R={},E=new WeakMap,x=[],N=null,P=!1,c=null,r=null,I=null,T=null,m=null,H=null,U=null,y=new Ke(0,0,0),B=0,p=!1,d=null,A=null,q=null,V=null,Y=null;const Q=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let W=!1,j=0;const F=e.getParameter(e.VERSION);F.indexOf("WebGL")!==-1?(j=parseFloat(/^WebGL (\d)/.exec(F)[1]),W=j>=1):F.indexOf("OpenGL ES")!==-1&&(j=parseFloat(/^OpenGL ES (\d)/.exec(F)[1]),W=j>=2);let he=null,Se={};const Le=e.getParameter(e.SCISSOR_BOX),Ge=e.getParameter(e.VIEWPORT),Ze=new ct().fromArray(Le),k=new ct().fromArray(Ge);function J(v,te,O,X){const oe=new Uint8Array(4),ae=e.createTexture();e.bindTexture(v,ae),e.texParameteri(v,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(v,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let Ce=0;Ce<O;Ce++)v===e.TEXTURE_3D||v===e.TEXTURE_2D_ARRAY?e.texImage3D(te,0,e.RGBA,1,1,X,0,e.RGBA,e.UNSIGNED_BYTE,oe):e.texImage2D(te+Ce,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,oe);return ae}const ue={};ue[e.TEXTURE_2D]=J(e.TEXTURE_2D,e.TEXTURE_2D,1),ue[e.TEXTURE_CUBE_MAP]=J(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ue[e.TEXTURE_2D_ARRAY]=J(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ue[e.TEXTURE_3D]=J(e.TEXTURE_3D,e.TEXTURE_3D,1,1),o.setClear(0,0,0,1),h.setClear(1),f.setClear(0),ie(e.DEPTH_TEST),h.setFunc(pn),De(!1),we(Ri),ie(e.CULL_FACE),_(wt);function ie(v){b[v]!==!0&&(e.enable(v),b[v]=!0)}function Me(v){b[v]!==!1&&(e.disable(v),b[v]=!1)}function Re(v,te){return R[v]!==te?(e.bindFramebuffer(v,te),R[v]=te,v===e.DRAW_FRAMEBUFFER&&(R[e.FRAMEBUFFER]=te),v===e.FRAMEBUFFER&&(R[e.DRAW_FRAMEBUFFER]=te),!0):!1}function Ue(v,te){let O=x,X=!1;if(v){O=E.get(te),O===void 0&&(O=[],E.set(te,O));const oe=v.textures;if(O.length!==oe.length||O[0]!==e.COLOR_ATTACHMENT0){for(let ae=0,Ce=oe.length;ae<Ce;ae++)O[ae]=e.COLOR_ATTACHMENT0+ae;O.length=oe.length,X=!0}}else O[0]!==e.BACK&&(O[0]=e.BACK,X=!0);X&&e.drawBuffers(O)}function $e(v){return N!==v?(e.useProgram(v),N=v,!0):!1}const ye={[Yt]:e.FUNC_ADD,[Wr]:e.FUNC_SUBTRACT,[kr]:e.FUNC_REVERSE_SUBTRACT};ye[to]=e.MIN,ye[no]=e.MAX;const je={[ra]:e.ZERO,[ia]:e.ONE,[na]:e.SRC_COLOR,[ta]:e.SRC_ALPHA,[ea]:e.SRC_ALPHA_SATURATE,[jr]:e.DST_COLOR,[Jr]:e.DST_ALPHA,[Qr]:e.ONE_MINUS_SRC_COLOR,[Zr]:e.ONE_MINUS_SRC_ALPHA,[$r]:e.ONE_MINUS_DST_COLOR,[Kr]:e.ONE_MINUS_DST_ALPHA,[qr]:e.CONSTANT_COLOR,[Yr]:e.ONE_MINUS_CONSTANT_COLOR,[Xr]:e.CONSTANT_ALPHA,[zr]:e.ONE_MINUS_CONSTANT_ALPHA};function _(v,te,O,X,oe,ae,Ce,Qe,at,We){if(v===wt){P===!0&&(Me(e.BLEND),P=!1);return}if(P===!1&&(ie(e.BLEND),P=!0),v!==wa){if(v!==c||We!==p){if((r!==Yt||m!==Yt)&&(e.blendEquation(e.FUNC_ADD),r=Yt,m=Yt),We)switch(v){case fn:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Pi:e.blendFunc(e.ONE,e.ONE);break;case bi:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case Ci:e.blendFuncSeparate(e.ZERO,e.SRC_COLOR,e.ZERO,e.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",v);break}else switch(v){case fn:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Pi:e.blendFunc(e.SRC_ALPHA,e.ONE);break;case bi:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case Ci:e.blendFunc(e.ZERO,e.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",v);break}I=null,T=null,H=null,U=null,y.set(0,0,0),B=0,c=v,p=We}return}oe=oe||te,ae=ae||O,Ce=Ce||X,(te!==r||oe!==m)&&(e.blendEquationSeparate(ye[te],ye[oe]),r=te,m=oe),(O!==I||X!==T||ae!==H||Ce!==U)&&(e.blendFuncSeparate(je[O],je[X],je[ae],je[Ce]),I=O,T=X,H=ae,U=Ce),(Qe.equals(y)===!1||at!==B)&&(e.blendColor(Qe.r,Qe.g,Qe.b,at),y.copy(Qe),B=at),c=v,p=!1}function ut(v,te){v.side===Mt?Me(e.CULL_FACE):ie(e.CULL_FACE);let O=v.side===_t;te&&(O=!O),De(O),v.blending===fn&&v.transparent===!1?_(wt):_(v.blending,v.blendEquation,v.blendSrc,v.blendDst,v.blendEquationAlpha,v.blendSrcAlpha,v.blendDstAlpha,v.blendColor,v.blendAlpha,v.premultipliedAlpha),h.setFunc(v.depthFunc),h.setTest(v.depthTest),h.setMask(v.depthWrite),o.setMask(v.colorWrite);const X=v.stencilWrite;f.setTest(X),X&&(f.setMask(v.stencilWriteMask),f.setFunc(v.stencilFunc,v.stencilRef,v.stencilFuncMask),f.setOp(v.stencilFail,v.stencilZFail,v.stencilZPass)),Xe(v.polygonOffset,v.polygonOffsetFactor,v.polygonOffsetUnits),v.alphaToCoverage===!0?ie(e.SAMPLE_ALPHA_TO_COVERAGE):Me(e.SAMPLE_ALPHA_TO_COVERAGE)}function De(v){d!==v&&(v?e.frontFace(e.CW):e.frontFace(e.CCW),d=v)}function we(v){v!==Ua?(ie(e.CULL_FACE),v!==A&&(v===Ri?e.cullFace(e.BACK):v===Da?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):Me(e.CULL_FACE),A=v}function _e(v){v!==q&&(W&&e.lineWidth(v),q=v)}function Xe(v,te,O){v?(ie(e.POLYGON_OFFSET_FILL),(V!==te||Y!==O)&&(e.polygonOffset(te,O),V=te,Y=O)):Me(e.POLYGON_OFFSET_FILL)}function me(v){v?ie(e.SCISSOR_TEST):Me(e.SCISSOR_TEST)}function u(v){v===void 0&&(v=e.TEXTURE0+Q-1),he!==v&&(e.activeTexture(v),he=v)}function a(v,te,O){O===void 0&&(he===null?O=e.TEXTURE0+Q-1:O=he);let X=Se[O];X===void 0&&(X={type:void 0,texture:void 0},Se[O]=X),(X.type!==v||X.texture!==te)&&(he!==O&&(e.activeTexture(O),he=O),e.bindTexture(v,te||ue[v]),X.type=v,X.texture=te)}function L(){const v=Se[he];v!==void 0&&v.type!==void 0&&(e.bindTexture(v.type,null),v.type=void 0,v.texture=void 0)}function z(){try{e.compressedTexImage2D.apply(e,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function K(){try{e.compressedTexImage3D.apply(e,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function G(){try{e.texSubImage2D.apply(e,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function pe(){try{e.texSubImage3D.apply(e,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function re(){try{e.compressedTexSubImage2D.apply(e,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function le(){try{e.compressedTexSubImage3D.apply(e,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function Ne(){try{e.texStorage2D.apply(e,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function Z(){try{e.texStorage3D.apply(e,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function ce(){try{e.texImage2D.apply(e,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function Ee(){try{e.texImage3D.apply(e,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function Te(v){Ze.equals(v)===!1&&(e.scissor(v.x,v.y,v.z,v.w),Ze.copy(v))}function fe(v){k.equals(v)===!1&&(e.viewport(v.x,v.y,v.z,v.w),k.copy(v))}function Ie(v,te){let O=g.get(te);O===void 0&&(O=new WeakMap,g.set(te,O));let X=O.get(v);X===void 0&&(X=e.getUniformBlockIndex(te,v.name),O.set(v,X))}function be(v,te){const X=g.get(te).get(v);C.get(te)!==X&&(e.uniformBlockBinding(te,X,v.__bindingPointIndex),C.set(te,X))}function ze(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),h.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),b={},he=null,Se={},R={},E=new WeakMap,x=[],N=null,P=!1,c=null,r=null,I=null,T=null,m=null,H=null,U=null,y=new Ke(0,0,0),B=0,p=!1,d=null,A=null,q=null,V=null,Y=null,Ze.set(0,0,e.canvas.width,e.canvas.height),k.set(0,0,e.canvas.width,e.canvas.height),o.reset(),h.reset(),f.reset()}return{buffers:{color:o,depth:h,stencil:f},enable:ie,disable:Me,bindFramebuffer:Re,drawBuffers:Ue,useProgram:$e,setBlending:_,setMaterial:ut,setFlipSided:De,setCullFace:we,setLineWidth:_e,setPolygonOffset:Xe,setScissorTest:me,activeTexture:u,bindTexture:a,unbindTexture:L,compressedTexImage2D:z,compressedTexImage3D:K,texImage2D:ce,texImage3D:Ee,updateUBOMapping:Ie,uniformBlockBinding:be,texStorage2D:Ne,texStorage3D:Z,texSubImage2D:G,texSubImage3D:pe,compressedTexSubImage2D:re,compressedTexSubImage3D:le,scissor:Te,viewport:fe,reset:ze}}function Uf(e,n,t,i,l,o,h){const f=n.has("WEBGL_multisampled_render_to_texture")?n.get("WEBGL_multisampled_render_to_texture"):null,C=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),g=new ft,b=new WeakMap;let R;const E=new WeakMap;let x=!1;try{x=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function N(u,a){return x?new OffscreenCanvas(u,a):Qa("canvas")}function P(u,a,L){let z=1;const K=me(u);if((K.width>L||K.height>L)&&(z=L/Math.max(K.width,K.height)),z<1)if(typeof HTMLImageElement<"u"&&u instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&u instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&u instanceof ImageBitmap||typeof VideoFrame<"u"&&u instanceof VideoFrame){const G=Math.floor(z*K.width),pe=Math.floor(z*K.height);R===void 0&&(R=N(G,pe));const re=a?N(G,pe):R;return re.width=G,re.height=pe,re.getContext("2d").drawImage(u,0,0,G,pe),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+K.width+"x"+K.height+") to ("+G+"x"+pe+")."),re}else return"data"in u&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+K.width+"x"+K.height+")."),u;return u}function c(u){return u.generateMipmaps}function r(u){e.generateMipmap(u)}function I(u){return u.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:u.isWebGL3DRenderTarget?e.TEXTURE_3D:u.isWebGLArrayRenderTarget||u.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function T(u,a,L,z,K=!1){if(u!==null){if(e[u]!==void 0)return e[u];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+u+"'")}let G=a;if(a===e.RED&&(L===e.FLOAT&&(G=e.R32F),L===e.HALF_FLOAT&&(G=e.R16F),L===e.UNSIGNED_BYTE&&(G=e.R8)),a===e.RED_INTEGER&&(L===e.UNSIGNED_BYTE&&(G=e.R8UI),L===e.UNSIGNED_SHORT&&(G=e.R16UI),L===e.UNSIGNED_INT&&(G=e.R32UI),L===e.BYTE&&(G=e.R8I),L===e.SHORT&&(G=e.R16I),L===e.INT&&(G=e.R32I)),a===e.RG&&(L===e.FLOAT&&(G=e.RG32F),L===e.HALF_FLOAT&&(G=e.RG16F),L===e.UNSIGNED_BYTE&&(G=e.RG8)),a===e.RG_INTEGER&&(L===e.UNSIGNED_BYTE&&(G=e.RG8UI),L===e.UNSIGNED_SHORT&&(G=e.RG16UI),L===e.UNSIGNED_INT&&(G=e.RG32UI),L===e.BYTE&&(G=e.RG8I),L===e.SHORT&&(G=e.RG16I),L===e.INT&&(G=e.RG32I)),a===e.RGB_INTEGER&&(L===e.UNSIGNED_BYTE&&(G=e.RGB8UI),L===e.UNSIGNED_SHORT&&(G=e.RGB16UI),L===e.UNSIGNED_INT&&(G=e.RGB32UI),L===e.BYTE&&(G=e.RGB8I),L===e.SHORT&&(G=e.RGB16I),L===e.INT&&(G=e.RGB32I)),a===e.RGBA_INTEGER&&(L===e.UNSIGNED_BYTE&&(G=e.RGBA8UI),L===e.UNSIGNED_SHORT&&(G=e.RGBA16UI),L===e.UNSIGNED_INT&&(G=e.RGBA32UI),L===e.BYTE&&(G=e.RGBA8I),L===e.SHORT&&(G=e.RGBA16I),L===e.INT&&(G=e.RGBA32I)),a===e.RGB&&L===e.UNSIGNED_INT_5_9_9_9_REV&&(G=e.RGB9_E5),a===e.RGBA){const pe=K?Er:tt.getTransfer(z);L===e.FLOAT&&(G=e.RGBA32F),L===e.HALF_FLOAT&&(G=e.RGBA16F),L===e.UNSIGNED_BYTE&&(G=pe===Ye?e.SRGB8_ALPHA8:e.RGBA8),L===e.UNSIGNED_SHORT_4_4_4_4&&(G=e.RGBA4),L===e.UNSIGNED_SHORT_5_5_5_1&&(G=e.RGB5_A1)}return(G===e.R16F||G===e.R32F||G===e.RG16F||G===e.RG32F||G===e.RGBA16F||G===e.RGBA32F)&&n.get("EXT_color_buffer_float"),G}function m(u,a){let L;return u?a===null||a===Jt||a===Qt?L=e.DEPTH24_STENCIL8:a===Dt?L=e.DEPTH32F_STENCIL8:a===hn&&(L=e.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):a===null||a===Jt||a===Qt?L=e.DEPTH_COMPONENT24:a===Dt?L=e.DEPTH_COMPONENT32F:a===hn&&(L=e.DEPTH_COMPONENT16),L}function H(u,a){return c(u)===!0||u.isFramebufferTexture&&u.minFilter!==$t&&u.minFilter!==Gt?Math.log2(Math.max(a.width,a.height))+1:u.mipmaps!==void 0&&u.mipmaps.length>0?u.mipmaps.length:u.isCompressedTexture&&Array.isArray(u.image)?a.mipmaps.length:1}function U(u){const a=u.target;a.removeEventListener("dispose",U),B(a),a.isVideoTexture&&b.delete(a)}function y(u){const a=u.target;a.removeEventListener("dispose",y),d(a)}function B(u){const a=i.get(u);if(a.__webglInit===void 0)return;const L=u.source,z=E.get(L);if(z){const K=z[a.__cacheKey];K.usedTimes--,K.usedTimes===0&&p(u),Object.keys(z).length===0&&E.delete(L)}i.remove(u)}function p(u){const a=i.get(u);e.deleteTexture(a.__webglTexture);const L=u.source,z=E.get(L);delete z[a.__cacheKey],h.memory.textures--}function d(u){const a=i.get(u);if(u.depthTexture&&(u.depthTexture.dispose(),i.remove(u.depthTexture)),u.isWebGLCubeRenderTarget)for(let z=0;z<6;z++){if(Array.isArray(a.__webglFramebuffer[z]))for(let K=0;K<a.__webglFramebuffer[z].length;K++)e.deleteFramebuffer(a.__webglFramebuffer[z][K]);else e.deleteFramebuffer(a.__webglFramebuffer[z]);a.__webglDepthbuffer&&e.deleteRenderbuffer(a.__webglDepthbuffer[z])}else{if(Array.isArray(a.__webglFramebuffer))for(let z=0;z<a.__webglFramebuffer.length;z++)e.deleteFramebuffer(a.__webglFramebuffer[z]);else e.deleteFramebuffer(a.__webglFramebuffer);if(a.__webglDepthbuffer&&e.deleteRenderbuffer(a.__webglDepthbuffer),a.__webglMultisampledFramebuffer&&e.deleteFramebuffer(a.__webglMultisampledFramebuffer),a.__webglColorRenderbuffer)for(let z=0;z<a.__webglColorRenderbuffer.length;z++)a.__webglColorRenderbuffer[z]&&e.deleteRenderbuffer(a.__webglColorRenderbuffer[z]);a.__webglDepthRenderbuffer&&e.deleteRenderbuffer(a.__webglDepthRenderbuffer)}const L=u.textures;for(let z=0,K=L.length;z<K;z++){const G=i.get(L[z]);G.__webglTexture&&(e.deleteTexture(G.__webglTexture),h.memory.textures--),i.remove(L[z])}i.remove(u)}let A=0;function q(){A=0}function V(){const u=A;return u>=l.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+u+" texture units while this GPU supports only "+l.maxTextures),A+=1,u}function Y(u){const a=[];return a.push(u.wrapS),a.push(u.wrapT),a.push(u.wrapR||0),a.push(u.magFilter),a.push(u.minFilter),a.push(u.anisotropy),a.push(u.internalFormat),a.push(u.format),a.push(u.type),a.push(u.generateMipmaps),a.push(u.premultiplyAlpha),a.push(u.flipY),a.push(u.unpackAlignment),a.push(u.colorSpace),a.join()}function Q(u,a){const L=i.get(u);if(u.isVideoTexture&&_e(u),u.isRenderTargetTexture===!1&&u.version>0&&L.__version!==u.version){const z=u.image;if(z===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(z.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{k(L,u,a);return}}t.bindTexture(e.TEXTURE_2D,L.__webglTexture,e.TEXTURE0+a)}function W(u,a){const L=i.get(u);if(u.version>0&&L.__version!==u.version){k(L,u,a);return}t.bindTexture(e.TEXTURE_2D_ARRAY,L.__webglTexture,e.TEXTURE0+a)}function j(u,a){const L=i.get(u);if(u.version>0&&L.__version!==u.version){k(L,u,a);return}t.bindTexture(e.TEXTURE_3D,L.__webglTexture,e.TEXTURE0+a)}function F(u,a){const L=i.get(u);if(u.version>0&&L.__version!==u.version){J(L,u,a);return}t.bindTexture(e.TEXTURE_CUBE_MAP,L.__webglTexture,e.TEXTURE0+a)}const he={[sa]:e.REPEAT,[oa]:e.CLAMP_TO_EDGE,[aa]:e.MIRRORED_REPEAT},Se={[$t]:e.NEAREST,[la]:e.NEAREST_MIPMAP_NEAREST,[nn]:e.NEAREST_MIPMAP_LINEAR,[Gt]:e.LINEAR,[Mn]:e.LINEAR_MIPMAP_NEAREST,[qt]:e.LINEAR_MIPMAP_LINEAR},Le={[_a]:e.NEVER,[ha]:e.ALWAYS,[pa]:e.LESS,[ar]:e.LEQUAL,[ua]:e.EQUAL,[da]:e.GEQUAL,[fa]:e.GREATER,[ca]:e.NOTEQUAL};function Ge(u,a){if(a.type===Dt&&n.has("OES_texture_float_linear")===!1&&(a.magFilter===Gt||a.magFilter===Mn||a.magFilter===nn||a.magFilter===qt||a.minFilter===Gt||a.minFilter===Mn||a.minFilter===nn||a.minFilter===qt)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),e.texParameteri(u,e.TEXTURE_WRAP_S,he[a.wrapS]),e.texParameteri(u,e.TEXTURE_WRAP_T,he[a.wrapT]),(u===e.TEXTURE_3D||u===e.TEXTURE_2D_ARRAY)&&e.texParameteri(u,e.TEXTURE_WRAP_R,he[a.wrapR]),e.texParameteri(u,e.TEXTURE_MAG_FILTER,Se[a.magFilter]),e.texParameteri(u,e.TEXTURE_MIN_FILTER,Se[a.minFilter]),a.compareFunction&&(e.texParameteri(u,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(u,e.TEXTURE_COMPARE_FUNC,Le[a.compareFunction])),n.has("EXT_texture_filter_anisotropic")===!0){if(a.magFilter===$t||a.minFilter!==nn&&a.minFilter!==qt||a.type===Dt&&n.has("OES_texture_float_linear")===!1)return;if(a.anisotropy>1||i.get(a).__currentAnisotropy){const L=n.get("EXT_texture_filter_anisotropic");e.texParameterf(u,L.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,l.getMaxAnisotropy())),i.get(a).__currentAnisotropy=a.anisotropy}}}function Ze(u,a){let L=!1;u.__webglInit===void 0&&(u.__webglInit=!0,a.addEventListener("dispose",U));const z=a.source;let K=E.get(z);K===void 0&&(K={},E.set(z,K));const G=Y(a);if(G!==u.__cacheKey){K[G]===void 0&&(K[G]={texture:e.createTexture(),usedTimes:0},h.memory.textures++,L=!0),K[G].usedTimes++;const pe=K[u.__cacheKey];pe!==void 0&&(K[u.__cacheKey].usedTimes--,pe.usedTimes===0&&p(a)),u.__cacheKey=G,u.__webglTexture=K[G].texture}return L}function k(u,a,L){let z=e.TEXTURE_2D;(a.isDataArrayTexture||a.isCompressedArrayTexture)&&(z=e.TEXTURE_2D_ARRAY),a.isData3DTexture&&(z=e.TEXTURE_3D);const K=Ze(u,a),G=a.source;t.bindTexture(z,u.__webglTexture,e.TEXTURE0+L);const pe=i.get(G);if(G.version!==pe.__version||K===!0){t.activeTexture(e.TEXTURE0+L);const re=tt.getPrimaries(tt.workingColorSpace),le=a.colorSpace===Bt?null:tt.getPrimaries(a.colorSpace),Ne=a.colorSpace===Bt||re===le?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,a.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,a.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ne);let Z=P(a.image,!1,l.maxTextureSize);Z=Xe(a,Z);const ce=o.convert(a.format,a.colorSpace),Ee=o.convert(a.type);let Te=T(a.internalFormat,ce,Ee,a.colorSpace,a.isVideoTexture);Ge(z,a);let fe;const Ie=a.mipmaps,be=a.isVideoTexture!==!0,ze=pe.__version===void 0||K===!0,v=G.dataReady,te=H(a,Z);if(a.isDepthTexture)Te=m(a.format===un,a.type),ze&&(be?t.texStorage2D(e.TEXTURE_2D,1,Te,Z.width,Z.height):t.texImage2D(e.TEXTURE_2D,0,Te,Z.width,Z.height,0,ce,Ee,null));else if(a.isDataTexture)if(Ie.length>0){be&&ze&&t.texStorage2D(e.TEXTURE_2D,te,Te,Ie[0].width,Ie[0].height);for(let O=0,X=Ie.length;O<X;O++)fe=Ie[O],be?v&&t.texSubImage2D(e.TEXTURE_2D,O,0,0,fe.width,fe.height,ce,Ee,fe.data):t.texImage2D(e.TEXTURE_2D,O,Te,fe.width,fe.height,0,ce,Ee,fe.data);a.generateMipmaps=!1}else be?(ze&&t.texStorage2D(e.TEXTURE_2D,te,Te,Z.width,Z.height),v&&t.texSubImage2D(e.TEXTURE_2D,0,0,0,Z.width,Z.height,ce,Ee,Z.data)):t.texImage2D(e.TEXTURE_2D,0,Te,Z.width,Z.height,0,ce,Ee,Z.data);else if(a.isCompressedTexture)if(a.isCompressedArrayTexture){be&&ze&&t.texStorage3D(e.TEXTURE_2D_ARRAY,te,Te,Ie[0].width,Ie[0].height,Z.depth);for(let O=0,X=Ie.length;O<X;O++)if(fe=Ie[O],a.format!==Tt)if(ce!==null)if(be){if(v)if(a.layerUpdates.size>0){const oe=Ui(fe.width,fe.height,a.format,a.type);for(const ae of a.layerUpdates){const Ce=fe.data.subarray(ae*oe/fe.data.BYTES_PER_ELEMENT,(ae+1)*oe/fe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,O,0,0,ae,fe.width,fe.height,1,ce,Ce)}a.clearLayerUpdates()}else t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,O,0,0,0,fe.width,fe.height,Z.depth,ce,fe.data)}else t.compressedTexImage3D(e.TEXTURE_2D_ARRAY,O,Te,fe.width,fe.height,Z.depth,0,fe.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else be?v&&t.texSubImage3D(e.TEXTURE_2D_ARRAY,O,0,0,0,fe.width,fe.height,Z.depth,ce,Ee,fe.data):t.texImage3D(e.TEXTURE_2D_ARRAY,O,Te,fe.width,fe.height,Z.depth,0,ce,Ee,fe.data)}else{be&&ze&&t.texStorage2D(e.TEXTURE_2D,te,Te,Ie[0].width,Ie[0].height);for(let O=0,X=Ie.length;O<X;O++)fe=Ie[O],a.format!==Tt?ce!==null?be?v&&t.compressedTexSubImage2D(e.TEXTURE_2D,O,0,0,fe.width,fe.height,ce,fe.data):t.compressedTexImage2D(e.TEXTURE_2D,O,Te,fe.width,fe.height,0,fe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):be?v&&t.texSubImage2D(e.TEXTURE_2D,O,0,0,fe.width,fe.height,ce,Ee,fe.data):t.texImage2D(e.TEXTURE_2D,O,Te,fe.width,fe.height,0,ce,Ee,fe.data)}else if(a.isDataArrayTexture)if(be){if(ze&&t.texStorage3D(e.TEXTURE_2D_ARRAY,te,Te,Z.width,Z.height,Z.depth),v)if(a.layerUpdates.size>0){const O=Ui(Z.width,Z.height,a.format,a.type);for(const X of a.layerUpdates){const oe=Z.data.subarray(X*O/Z.data.BYTES_PER_ELEMENT,(X+1)*O/Z.data.BYTES_PER_ELEMENT);t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,X,Z.width,Z.height,1,ce,Ee,oe)}a.clearLayerUpdates()}else t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,Z.width,Z.height,Z.depth,ce,Ee,Z.data)}else t.texImage3D(e.TEXTURE_2D_ARRAY,0,Te,Z.width,Z.height,Z.depth,0,ce,Ee,Z.data);else if(a.isData3DTexture)be?(ze&&t.texStorage3D(e.TEXTURE_3D,te,Te,Z.width,Z.height,Z.depth),v&&t.texSubImage3D(e.TEXTURE_3D,0,0,0,0,Z.width,Z.height,Z.depth,ce,Ee,Z.data)):t.texImage3D(e.TEXTURE_3D,0,Te,Z.width,Z.height,Z.depth,0,ce,Ee,Z.data);else if(a.isFramebufferTexture){if(ze)if(be)t.texStorage2D(e.TEXTURE_2D,te,Te,Z.width,Z.height);else{let O=Z.width,X=Z.height;for(let oe=0;oe<te;oe++)t.texImage2D(e.TEXTURE_2D,oe,Te,O,X,0,ce,Ee,null),O>>=1,X>>=1}}else if(Ie.length>0){if(be&&ze){const O=me(Ie[0]);t.texStorage2D(e.TEXTURE_2D,te,Te,O.width,O.height)}for(let O=0,X=Ie.length;O<X;O++)fe=Ie[O],be?v&&t.texSubImage2D(e.TEXTURE_2D,O,0,0,ce,Ee,fe):t.texImage2D(e.TEXTURE_2D,O,Te,ce,Ee,fe);a.generateMipmaps=!1}else if(be){if(ze){const O=me(Z);t.texStorage2D(e.TEXTURE_2D,te,Te,O.width,O.height)}v&&t.texSubImage2D(e.TEXTURE_2D,0,0,0,ce,Ee,Z)}else t.texImage2D(e.TEXTURE_2D,0,Te,ce,Ee,Z);c(a)&&r(z),pe.__version=G.version,a.onUpdate&&a.onUpdate(a)}u.__version=a.version}function J(u,a,L){if(a.image.length!==6)return;const z=Ze(u,a),K=a.source;t.bindTexture(e.TEXTURE_CUBE_MAP,u.__webglTexture,e.TEXTURE0+L);const G=i.get(K);if(K.version!==G.__version||z===!0){t.activeTexture(e.TEXTURE0+L);const pe=tt.getPrimaries(tt.workingColorSpace),re=a.colorSpace===Bt?null:tt.getPrimaries(a.colorSpace),le=a.colorSpace===Bt||pe===re?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,a.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,a.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,le);const Ne=a.isCompressedTexture||a.image[0].isCompressedTexture,Z=a.image[0]&&a.image[0].isDataTexture,ce=[];for(let X=0;X<6;X++)!Ne&&!Z?ce[X]=P(a.image[X],!0,l.maxCubemapSize):ce[X]=Z?a.image[X].image:a.image[X],ce[X]=Xe(a,ce[X]);const Ee=ce[0],Te=o.convert(a.format,a.colorSpace),fe=o.convert(a.type),Ie=T(a.internalFormat,Te,fe,a.colorSpace),be=a.isVideoTexture!==!0,ze=G.__version===void 0||z===!0,v=K.dataReady;let te=H(a,Ee);Ge(e.TEXTURE_CUBE_MAP,a);let O;if(Ne){be&&ze&&t.texStorage2D(e.TEXTURE_CUBE_MAP,te,Ie,Ee.width,Ee.height);for(let X=0;X<6;X++){O=ce[X].mipmaps;for(let oe=0;oe<O.length;oe++){const ae=O[oe];a.format!==Tt?Te!==null?be?v&&t.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,0,0,ae.width,ae.height,Te,ae.data):t.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,Ie,ae.width,ae.height,0,ae.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):be?v&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,0,0,ae.width,ae.height,Te,fe,ae.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe,Ie,ae.width,ae.height,0,Te,fe,ae.data)}}}else{if(O=a.mipmaps,be&&ze){O.length>0&&te++;const X=me(ce[0]);t.texStorage2D(e.TEXTURE_CUBE_MAP,te,Ie,X.width,X.height)}for(let X=0;X<6;X++)if(Z){be?v&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,0,0,ce[X].width,ce[X].height,Te,fe,ce[X].data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,Ie,ce[X].width,ce[X].height,0,Te,fe,ce[X].data);for(let oe=0;oe<O.length;oe++){const Ce=O[oe].image[X].image;be?v&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,0,0,Ce.width,Ce.height,Te,fe,Ce.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,Ie,Ce.width,Ce.height,0,Te,fe,Ce.data)}}else{be?v&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,0,0,Te,fe,ce[X]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,0,Ie,Te,fe,ce[X]);for(let oe=0;oe<O.length;oe++){const ae=O[oe];be?v&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,0,0,Te,fe,ae.image[X]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+X,oe+1,Ie,Te,fe,ae.image[X])}}}c(a)&&r(e.TEXTURE_CUBE_MAP),G.__version=K.version,a.onUpdate&&a.onUpdate(a)}u.__version=a.version}function ue(u,a,L,z,K,G){const pe=o.convert(L.format,L.colorSpace),re=o.convert(L.type),le=T(L.internalFormat,pe,re,L.colorSpace),Ne=i.get(a),Z=i.get(L);if(Z.__renderTarget=a,!Ne.__hasExternalTextures){const ce=Math.max(1,a.width>>G),Ee=Math.max(1,a.height>>G);K===e.TEXTURE_3D||K===e.TEXTURE_2D_ARRAY?t.texImage3D(K,G,le,ce,Ee,a.depth,0,pe,re,null):t.texImage2D(K,G,le,ce,Ee,0,pe,re,null)}t.bindFramebuffer(e.FRAMEBUFFER,u),we(a)?f.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,z,K,Z.__webglTexture,0,De(a)):(K===e.TEXTURE_2D||K>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&K<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,z,K,Z.__webglTexture,G),t.bindFramebuffer(e.FRAMEBUFFER,null)}function ie(u,a,L){if(e.bindRenderbuffer(e.RENDERBUFFER,u),a.depthBuffer){const z=a.depthTexture,K=z&&z.isDepthTexture?z.type:null,G=m(a.stencilBuffer,K),pe=a.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,re=De(a);we(a)?f.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,re,G,a.width,a.height):L?e.renderbufferStorageMultisample(e.RENDERBUFFER,re,G,a.width,a.height):e.renderbufferStorage(e.RENDERBUFFER,G,a.width,a.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,pe,e.RENDERBUFFER,u)}else{const z=a.textures;for(let K=0;K<z.length;K++){const G=z[K],pe=o.convert(G.format,G.colorSpace),re=o.convert(G.type),le=T(G.internalFormat,pe,re,G.colorSpace),Ne=De(a);L&&we(a)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,Ne,le,a.width,a.height):we(a)?f.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Ne,le,a.width,a.height):e.renderbufferStorage(e.RENDERBUFFER,le,a.width,a.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Me(u,a){if(a&&a.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(e.FRAMEBUFFER,u),!(a.depthTexture&&a.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const z=i.get(a.depthTexture);z.__renderTarget=a,(!z.__webglTexture||a.depthTexture.image.width!==a.width||a.depthTexture.image.height!==a.height)&&(a.depthTexture.image.width=a.width,a.depthTexture.image.height=a.height,a.depthTexture.needsUpdate=!0),Q(a.depthTexture,0);const K=z.__webglTexture,G=De(a);if(a.depthTexture.format===zn)we(a)?f.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,K,0,G):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,K,0);else if(a.depthTexture.format===un)we(a)?f.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,K,0,G):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,K,0);else throw new Error("Unknown depthTexture format")}function Re(u){const a=i.get(u),L=u.isWebGLCubeRenderTarget===!0;if(a.__boundDepthTexture!==u.depthTexture){const z=u.depthTexture;if(a.__depthDisposeCallback&&a.__depthDisposeCallback(),z){const K=()=>{delete a.__boundDepthTexture,delete a.__depthDisposeCallback,z.removeEventListener("dispose",K)};z.addEventListener("dispose",K),a.__depthDisposeCallback=K}a.__boundDepthTexture=z}if(u.depthTexture&&!a.__autoAllocateDepthBuffer){if(L)throw new Error("target.depthTexture not supported in Cube render targets");Me(a.__webglFramebuffer,u)}else if(L){a.__webglDepthbuffer=[];for(let z=0;z<6;z++)if(t.bindFramebuffer(e.FRAMEBUFFER,a.__webglFramebuffer[z]),a.__webglDepthbuffer[z]===void 0)a.__webglDepthbuffer[z]=e.createRenderbuffer(),ie(a.__webglDepthbuffer[z],u,!1);else{const K=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,G=a.__webglDepthbuffer[z];e.bindRenderbuffer(e.RENDERBUFFER,G),e.framebufferRenderbuffer(e.FRAMEBUFFER,K,e.RENDERBUFFER,G)}}else if(t.bindFramebuffer(e.FRAMEBUFFER,a.__webglFramebuffer),a.__webglDepthbuffer===void 0)a.__webglDepthbuffer=e.createRenderbuffer(),ie(a.__webglDepthbuffer,u,!1);else{const z=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,K=a.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,K),e.framebufferRenderbuffer(e.FRAMEBUFFER,z,e.RENDERBUFFER,K)}t.bindFramebuffer(e.FRAMEBUFFER,null)}function Ue(u,a,L){const z=i.get(u);a!==void 0&&ue(z.__webglFramebuffer,u,u.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),L!==void 0&&Re(u)}function $e(u){const a=u.texture,L=i.get(u),z=i.get(a);u.addEventListener("dispose",y);const K=u.textures,G=u.isWebGLCubeRenderTarget===!0,pe=K.length>1;if(pe||(z.__webglTexture===void 0&&(z.__webglTexture=e.createTexture()),z.__version=a.version,h.memory.textures++),G){L.__webglFramebuffer=[];for(let re=0;re<6;re++)if(a.mipmaps&&a.mipmaps.length>0){L.__webglFramebuffer[re]=[];for(let le=0;le<a.mipmaps.length;le++)L.__webglFramebuffer[re][le]=e.createFramebuffer()}else L.__webglFramebuffer[re]=e.createFramebuffer()}else{if(a.mipmaps&&a.mipmaps.length>0){L.__webglFramebuffer=[];for(let re=0;re<a.mipmaps.length;re++)L.__webglFramebuffer[re]=e.createFramebuffer()}else L.__webglFramebuffer=e.createFramebuffer();if(pe)for(let re=0,le=K.length;re<le;re++){const Ne=i.get(K[re]);Ne.__webglTexture===void 0&&(Ne.__webglTexture=e.createTexture(),h.memory.textures++)}if(u.samples>0&&we(u)===!1){L.__webglMultisampledFramebuffer=e.createFramebuffer(),L.__webglColorRenderbuffer=[],t.bindFramebuffer(e.FRAMEBUFFER,L.__webglMultisampledFramebuffer);for(let re=0;re<K.length;re++){const le=K[re];L.__webglColorRenderbuffer[re]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,L.__webglColorRenderbuffer[re]);const Ne=o.convert(le.format,le.colorSpace),Z=o.convert(le.type),ce=T(le.internalFormat,Ne,Z,le.colorSpace,u.isXRRenderTarget===!0),Ee=De(u);e.renderbufferStorageMultisample(e.RENDERBUFFER,Ee,ce,u.width,u.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+re,e.RENDERBUFFER,L.__webglColorRenderbuffer[re])}e.bindRenderbuffer(e.RENDERBUFFER,null),u.depthBuffer&&(L.__webglDepthRenderbuffer=e.createRenderbuffer(),ie(L.__webglDepthRenderbuffer,u,!0)),t.bindFramebuffer(e.FRAMEBUFFER,null)}}if(G){t.bindTexture(e.TEXTURE_CUBE_MAP,z.__webglTexture),Ge(e.TEXTURE_CUBE_MAP,a);for(let re=0;re<6;re++)if(a.mipmaps&&a.mipmaps.length>0)for(let le=0;le<a.mipmaps.length;le++)ue(L.__webglFramebuffer[re][le],u,a,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+re,le);else ue(L.__webglFramebuffer[re],u,a,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+re,0);c(a)&&r(e.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(pe){for(let re=0,le=K.length;re<le;re++){const Ne=K[re],Z=i.get(Ne);t.bindTexture(e.TEXTURE_2D,Z.__webglTexture),Ge(e.TEXTURE_2D,Ne),ue(L.__webglFramebuffer,u,Ne,e.COLOR_ATTACHMENT0+re,e.TEXTURE_2D,0),c(Ne)&&r(e.TEXTURE_2D)}t.unbindTexture()}else{let re=e.TEXTURE_2D;if((u.isWebGL3DRenderTarget||u.isWebGLArrayRenderTarget)&&(re=u.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),t.bindTexture(re,z.__webglTexture),Ge(re,a),a.mipmaps&&a.mipmaps.length>0)for(let le=0;le<a.mipmaps.length;le++)ue(L.__webglFramebuffer[le],u,a,e.COLOR_ATTACHMENT0,re,le);else ue(L.__webglFramebuffer,u,a,e.COLOR_ATTACHMENT0,re,0);c(a)&&r(re),t.unbindTexture()}u.depthBuffer&&Re(u)}function ye(u){const a=u.textures;for(let L=0,z=a.length;L<z;L++){const K=a[L];if(c(K)){const G=I(u),pe=i.get(K).__webglTexture;t.bindTexture(G,pe),r(G),t.unbindTexture()}}}const je=[],_=[];function ut(u){if(u.samples>0){if(we(u)===!1){const a=u.textures,L=u.width,z=u.height;let K=e.COLOR_BUFFER_BIT;const G=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,pe=i.get(u),re=a.length>1;if(re)for(let le=0;le<a.length;le++)t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+le,e.RENDERBUFFER,null),t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+le,e.TEXTURE_2D,null,0);t.bindFramebuffer(e.READ_FRAMEBUFFER,pe.__webglMultisampledFramebuffer),t.bindFramebuffer(e.DRAW_FRAMEBUFFER,pe.__webglFramebuffer);for(let le=0;le<a.length;le++){if(u.resolveDepthBuffer&&(u.depthBuffer&&(K|=e.DEPTH_BUFFER_BIT),u.stencilBuffer&&u.resolveStencilBuffer&&(K|=e.STENCIL_BUFFER_BIT)),re){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,pe.__webglColorRenderbuffer[le]);const Ne=i.get(a[le]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,Ne,0)}e.blitFramebuffer(0,0,L,z,0,0,L,z,K,e.NEAREST),C===!0&&(je.length=0,_.length=0,je.push(e.COLOR_ATTACHMENT0+le),u.depthBuffer&&u.resolveDepthBuffer===!1&&(je.push(G),_.push(G),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,_)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,je))}if(t.bindFramebuffer(e.READ_FRAMEBUFFER,null),t.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),re)for(let le=0;le<a.length;le++){t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+le,e.RENDERBUFFER,pe.__webglColorRenderbuffer[le]);const Ne=i.get(a[le]).__webglTexture;t.bindFramebuffer(e.FRAMEBUFFER,pe.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+le,e.TEXTURE_2D,Ne,0)}t.bindFramebuffer(e.DRAW_FRAMEBUFFER,pe.__webglMultisampledFramebuffer)}else if(u.depthBuffer&&u.resolveDepthBuffer===!1&&C){const a=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[a])}}}function De(u){return Math.min(l.maxSamples,u.samples)}function we(u){const a=i.get(u);return u.samples>0&&n.has("WEBGL_multisampled_render_to_texture")===!0&&a.__useRenderToTexture!==!1}function _e(u){const a=h.render.frame;b.get(u)!==a&&(b.set(u,a),u.update())}function Xe(u,a){const L=u.colorSpace,z=u.format,K=u.type;return u.isCompressedTexture===!0||u.isVideoTexture===!0||L!==mn&&L!==Bt&&(tt.getTransfer(L)===Ye?(z!==Tt||K!==It)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",L)),a}function me(u){return typeof HTMLImageElement<"u"&&u instanceof HTMLImageElement?(g.width=u.naturalWidth||u.width,g.height=u.naturalHeight||u.height):typeof VideoFrame<"u"&&u instanceof VideoFrame?(g.width=u.displayWidth,g.height=u.displayHeight):(g.width=u.width,g.height=u.height),g}this.allocateTextureUnit=V,this.resetTextureUnits=q,this.setTexture2D=Q,this.setTexture2DArray=W,this.setTexture3D=j,this.setTextureCube=F,this.rebindTextures=Ue,this.setupRenderTarget=$e,this.updateRenderTargetMipmap=ye,this.updateMultisampleRenderTarget=ut,this.setupDepthRenderbuffer=Re,this.setupFrameBufferTexture=ue,this.useMultisampledRTT=we}function Df(e,n){function t(i,l=Bt){let o;const h=tt.getTransfer(l);if(i===It)return e.UNSIGNED_BYTE;if(i===lr)return e.UNSIGNED_SHORT_4_4_4_4;if(i===cr)return e.UNSIGNED_SHORT_5_5_5_1;if(i===Sa)return e.UNSIGNED_INT_5_9_9_9_REV;if(i===Ma)return e.BYTE;if(i===Ta)return e.SHORT;if(i===hn)return e.UNSIGNED_SHORT;if(i===ur)return e.INT;if(i===Jt)return e.UNSIGNED_INT;if(i===Dt)return e.FLOAT;if(i===_n)return e.HALF_FLOAT;if(i===xa)return e.ALPHA;if(i===Aa)return e.RGB;if(i===Tt)return e.RGBA;if(i===Ra)return e.LUMINANCE;if(i===Ca)return e.LUMINANCE_ALPHA;if(i===zn)return e.DEPTH_COMPONENT;if(i===un)return e.DEPTH_STENCIL;if(i===ba)return e.RED;if(i===pr)return e.RED_INTEGER;if(i===Pa)return e.RG;if(i===hr)return e.RG_INTEGER;if(i===_r)return e.RGBA_INTEGER;if(i===Tn||i===xn||i===An||i===Rn)if(h===Ye)if(o=n.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(i===Tn)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===xn)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===An)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Rn)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=n.get("WEBGL_compressed_texture_s3tc"),o!==null){if(i===Tn)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===xn)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===An)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Rn)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===jn||i===ei||i===ti||i===ni)if(o=n.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(i===jn)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===ei)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===ti)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===ni)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===ii||i===ri||i===ai)if(o=n.get("WEBGL_compressed_texture_etc"),o!==null){if(i===ii||i===ri)return h===Ye?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(i===ai)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===oi||i===si||i===li||i===ci||i===fi||i===di||i===ui||i===pi||i===hi||i===_i||i===mi||i===vi||i===gi||i===Ei)if(o=n.get("WEBGL_compressed_texture_astc"),o!==null){if(i===oi)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===si)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===li)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===ci)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===fi)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===di)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===ui)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===pi)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===hi)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===_i)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===mi)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===vi)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===gi)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Ei)return h===Ye?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Cn||i===Si||i===Mi)if(o=n.get("EXT_texture_compression_bptc"),o!==null){if(i===Cn)return h===Ye?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Si)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Mi)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===La||i===Ti||i===xi||i===Ai)if(o=n.get("EXT_texture_compression_rgtc"),o!==null){if(i===Cn)return o.COMPRESSED_RED_RGTC1_EXT;if(i===Ti)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===xi)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Ai)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Qt?e.UNSIGNED_INT_24_8:e[i]!==void 0?e[i]:null}return{convert:t}}const wf={type:"move"};class In{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new rn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new rn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new ke,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new ke),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new rn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new ke,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new ke),this._grip}dispatchEvent(n){return this._targetRay!==null&&this._targetRay.dispatchEvent(n),this._grip!==null&&this._grip.dispatchEvent(n),this._hand!==null&&this._hand.dispatchEvent(n),this}connect(n){if(n&&n.hand){const t=this._hand;if(t)for(const i of n.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:n}),this}disconnect(n){return this.dispatchEvent({type:"disconnected",data:n}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(n,t,i){let l=null,o=null,h=null;const f=this._targetRay,C=this._grip,g=this._hand;if(n&&t.session.visibilityState!=="visible-blurred"){if(g&&n.hand){h=!0;for(const P of n.hand.values()){const c=t.getJointPose(P,i),r=this._getHandJoint(g,P);c!==null&&(r.matrix.fromArray(c.transform.matrix),r.matrix.decompose(r.position,r.rotation,r.scale),r.matrixWorldNeedsUpdate=!0,r.jointRadius=c.radius),r.visible=c!==null}const b=g.joints["index-finger-tip"],R=g.joints["thumb-tip"],E=b.position.distanceTo(R.position),x=.02,N=.005;g.inputState.pinching&&E>x+N?(g.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:n.handedness,target:this})):!g.inputState.pinching&&E<=x-N&&(g.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:n.handedness,target:this}))}else C!==null&&n.gripSpace&&(o=t.getPose(n.gripSpace,i),o!==null&&(C.matrix.fromArray(o.transform.matrix),C.matrix.decompose(C.position,C.rotation,C.scale),C.matrixWorldNeedsUpdate=!0,o.linearVelocity?(C.hasLinearVelocity=!0,C.linearVelocity.copy(o.linearVelocity)):C.hasLinearVelocity=!1,o.angularVelocity?(C.hasAngularVelocity=!0,C.angularVelocity.copy(o.angularVelocity)):C.hasAngularVelocity=!1));f!==null&&(l=t.getPose(n.targetRaySpace,i),l===null&&o!==null&&(l=o),l!==null&&(f.matrix.fromArray(l.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,l.linearVelocity?(f.hasLinearVelocity=!0,f.linearVelocity.copy(l.linearVelocity)):f.hasLinearVelocity=!1,l.angularVelocity?(f.hasAngularVelocity=!0,f.angularVelocity.copy(l.angularVelocity)):f.hasAngularVelocity=!1,this.dispatchEvent(wf)))}return f!==null&&(f.visible=l!==null),C!==null&&(C.visible=o!==null),g!==null&&(g.visible=h!==null),this}_getHandJoint(n,t){if(n.joints[t.jointName]===void 0){const i=new rn;i.matrixAutoUpdate=!1,i.visible=!1,n.joints[t.jointName]=i,n.add(i)}return n.joints[t.jointName]}}const If=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,yf=`
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

}`;class Nf{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(n,t,i){if(this.texture===null){const l=new fr,o=n.properties.get(l);o.__webglTexture=t.texture,(t.depthNear!=i.depthNear||t.depthFar!=i.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=l}}getMesh(n){if(this.texture!==null&&this.mesh===null){const t=n.cameras[0].viewport,i=new yt({vertexShader:If,fragmentShader:yf,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new xt(new dr(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Of extends Fr{constructor(n,t){super();const i=this;let l=null,o=1,h=null,f="local-floor",C=1,g=null,b=null,R=null,E=null,x=null,N=null;const P=new Nf,c=t.getContextAttributes();let r=null,I=null;const T=[],m=[],H=new ft;let U=null;const y=new ln;y.viewport=new ct;const B=new ln;B.viewport=new ct;const p=[y,B],d=new Br;let A=null,q=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(k){let J=T[k];return J===void 0&&(J=new In,T[k]=J),J.getTargetRaySpace()},this.getControllerGrip=function(k){let J=T[k];return J===void 0&&(J=new In,T[k]=J),J.getGripSpace()},this.getHand=function(k){let J=T[k];return J===void 0&&(J=new In,T[k]=J),J.getHandSpace()};function V(k){const J=m.indexOf(k.inputSource);if(J===-1)return;const ue=T[J];ue!==void 0&&(ue.update(k.inputSource,k.frame,g||h),ue.dispatchEvent({type:k.type,data:k.inputSource}))}function Y(){l.removeEventListener("select",V),l.removeEventListener("selectstart",V),l.removeEventListener("selectend",V),l.removeEventListener("squeeze",V),l.removeEventListener("squeezestart",V),l.removeEventListener("squeezeend",V),l.removeEventListener("end",Y),l.removeEventListener("inputsourceschange",Q);for(let k=0;k<T.length;k++){const J=m[k];J!==null&&(m[k]=null,T[k].disconnect(J))}A=null,q=null,P.reset(),n.setRenderTarget(r),x=null,E=null,R=null,l=null,I=null,Ze.stop(),i.isPresenting=!1,n.setPixelRatio(U),n.setSize(H.width,H.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(k){o=k,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(k){f=k,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return g||h},this.setReferenceSpace=function(k){g=k},this.getBaseLayer=function(){return E!==null?E:x},this.getBinding=function(){return R},this.getFrame=function(){return N},this.getSession=function(){return l},this.setSession=async function(k){if(l=k,l!==null){if(r=n.getRenderTarget(),l.addEventListener("select",V),l.addEventListener("selectstart",V),l.addEventListener("selectend",V),l.addEventListener("squeeze",V),l.addEventListener("squeezestart",V),l.addEventListener("squeezeend",V),l.addEventListener("end",Y),l.addEventListener("inputsourceschange",Q),c.xrCompatible!==!0&&await t.makeXRCompatible(),U=n.getPixelRatio(),n.getSize(H),l.renderState.layers===void 0){const J={antialias:c.antialias,alpha:!0,depth:c.depth,stencil:c.stencil,framebufferScaleFactor:o};x=new XRWebGLLayer(l,t,J),l.updateRenderState({baseLayer:x}),n.setPixelRatio(1),n.setSize(x.framebufferWidth,x.framebufferHeight,!1),I=new kt(x.framebufferWidth,x.framebufferHeight,{format:Tt,type:It,colorSpace:n.outputColorSpace,stencilBuffer:c.stencil})}else{let J=null,ue=null,ie=null;c.depth&&(ie=c.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,J=c.stencil?un:zn,ue=c.stencil?Qt:Jt);const Me={colorFormat:t.RGBA8,depthFormat:ie,scaleFactor:o};R=new XRWebGLBinding(l,t),E=R.createProjectionLayer(Me),l.updateRenderState({layers:[E]}),n.setPixelRatio(1),n.setSize(E.textureWidth,E.textureHeight,!1),I=new kt(E.textureWidth,E.textureHeight,{format:Tt,type:It,depthTexture:new ir(E.textureWidth,E.textureHeight,ue,void 0,void 0,void 0,void 0,void 0,void 0,J),stencilBuffer:c.stencil,colorSpace:n.outputColorSpace,samples:c.antialias?4:0,resolveDepthBuffer:E.ignoreDepthValues===!1})}I.isXRRenderTarget=!0,this.setFoveation(C),g=null,h=await l.requestReferenceSpace(f),Ze.setContext(l),Ze.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(l!==null)return l.environmentBlendMode},this.getDepthTexture=function(){return P.getDepthTexture()};function Q(k){for(let J=0;J<k.removed.length;J++){const ue=k.removed[J],ie=m.indexOf(ue);ie>=0&&(m[ie]=null,T[ie].disconnect(ue))}for(let J=0;J<k.added.length;J++){const ue=k.added[J];let ie=m.indexOf(ue);if(ie===-1){for(let Re=0;Re<T.length;Re++)if(Re>=m.length){m.push(ue),ie=Re;break}else if(m[Re]===null){m[Re]=ue,ie=Re;break}if(ie===-1)break}const Me=T[ie];Me&&Me.connect(ue)}}const W=new ke,j=new ke;function F(k,J,ue){W.setFromMatrixPosition(J.matrixWorld),j.setFromMatrixPosition(ue.matrixWorld);const ie=W.distanceTo(j),Me=J.projectionMatrix.elements,Re=ue.projectionMatrix.elements,Ue=Me[14]/(Me[10]-1),$e=Me[14]/(Me[10]+1),ye=(Me[9]+1)/Me[5],je=(Me[9]-1)/Me[5],_=(Me[8]-1)/Me[0],ut=(Re[8]+1)/Re[0],De=Ue*_,we=Ue*ut,_e=ie/(-_+ut),Xe=_e*-_;if(J.matrixWorld.decompose(k.position,k.quaternion,k.scale),k.translateX(Xe),k.translateZ(_e),k.matrixWorld.compose(k.position,k.quaternion,k.scale),k.matrixWorldInverse.copy(k.matrixWorld).invert(),Me[10]===-1)k.projectionMatrix.copy(J.projectionMatrix),k.projectionMatrixInverse.copy(J.projectionMatrixInverse);else{const me=Ue+_e,u=$e+_e,a=De-Xe,L=we+(ie-Xe),z=ye*$e/u*me,K=je*$e/u*me;k.projectionMatrix.makePerspective(a,L,z,K,me,u),k.projectionMatrixInverse.copy(k.projectionMatrix).invert()}}function he(k,J){J===null?k.matrixWorld.copy(k.matrix):k.matrixWorld.multiplyMatrices(J.matrixWorld,k.matrix),k.matrixWorldInverse.copy(k.matrixWorld).invert()}this.updateCamera=function(k){if(l===null)return;let J=k.near,ue=k.far;P.texture!==null&&(P.depthNear>0&&(J=P.depthNear),P.depthFar>0&&(ue=P.depthFar)),d.near=B.near=y.near=J,d.far=B.far=y.far=ue,(A!==d.near||q!==d.far)&&(l.updateRenderState({depthNear:d.near,depthFar:d.far}),A=d.near,q=d.far),y.layers.mask=k.layers.mask|2,B.layers.mask=k.layers.mask|4,d.layers.mask=y.layers.mask|B.layers.mask;const ie=k.parent,Me=d.cameras;he(d,ie);for(let Re=0;Re<Me.length;Re++)he(Me[Re],ie);Me.length===2?F(d,y,B):d.projectionMatrix.copy(y.projectionMatrix),Se(k,d,ie)};function Se(k,J,ue){ue===null?k.matrix.copy(J.matrixWorld):(k.matrix.copy(ue.matrixWorld),k.matrix.invert(),k.matrix.multiply(J.matrixWorld)),k.matrix.decompose(k.position,k.quaternion,k.scale),k.updateMatrixWorld(!0),k.projectionMatrix.copy(J.projectionMatrix),k.projectionMatrixInverse.copy(J.projectionMatrixInverse),k.isPerspectiveCamera&&(k.fov=Gr*2*Math.atan(1/k.projectionMatrix.elements[5]),k.zoom=1)}this.getCamera=function(){return d},this.getFoveation=function(){if(!(E===null&&x===null))return C},this.setFoveation=function(k){C=k,E!==null&&(E.fixedFoveation=k),x!==null&&x.fixedFoveation!==void 0&&(x.fixedFoveation=k)},this.hasDepthSensing=function(){return P.texture!==null},this.getDepthSensingMesh=function(){return P.getMesh(d)};let Le=null;function Ge(k,J){if(b=J.getViewerPose(g||h),N=J,b!==null){const ue=b.views;x!==null&&(n.setRenderTargetFramebuffer(I,x.framebuffer),n.setRenderTarget(I));let ie=!1;ue.length!==d.cameras.length&&(d.cameras.length=0,ie=!0);for(let Re=0;Re<ue.length;Re++){const Ue=ue[Re];let $e=null;if(x!==null)$e=x.getViewport(Ue);else{const je=R.getViewSubImage(E,Ue);$e=je.viewport,Re===0&&(n.setRenderTargetTextures(I,je.colorTexture,E.ignoreDepthValues?void 0:je.depthStencilTexture),n.setRenderTarget(I))}let ye=p[Re];ye===void 0&&(ye=new ln,ye.layers.enable(Re),ye.viewport=new ct,p[Re]=ye),ye.matrix.fromArray(Ue.transform.matrix),ye.matrix.decompose(ye.position,ye.quaternion,ye.scale),ye.projectionMatrix.fromArray(Ue.projectionMatrix),ye.projectionMatrixInverse.copy(ye.projectionMatrix).invert(),ye.viewport.set($e.x,$e.y,$e.width,$e.height),Re===0&&(d.matrix.copy(ye.matrix),d.matrix.decompose(d.position,d.quaternion,d.scale)),ie===!0&&d.cameras.push(ye)}const Me=l.enabledFeatures;if(Me&&Me.includes("depth-sensing")){const Re=R.getDepthInformation(ue[0]);Re&&Re.isValid&&Re.texture&&P.init(n,Re,l.renderState)}}for(let ue=0;ue<T.length;ue++){const ie=m[ue],Me=T[ue];ie!==null&&Me!==void 0&&Me.update(ie,J,g||h)}Le&&Le(k,J),J.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:J}),N=null}const Ze=new Sr;Ze.setAnimationLoop(Ge),this.setAnimationLoop=function(k){Le=k},this.dispose=function(){}}}const Pt=new gr,Ff=new Vt;function Bf(e,n){function t(c,r){c.matrixAutoUpdate===!0&&c.updateMatrix(),r.value.copy(c.matrix)}function i(c,r){r.color.getRGB(c.fogColor.value,vr(e)),r.isFog?(c.fogNear.value=r.near,c.fogFar.value=r.far):r.isFogExp2&&(c.fogDensity.value=r.density)}function l(c,r,I,T,m){r.isMeshBasicMaterial||r.isMeshLambertMaterial?o(c,r):r.isMeshToonMaterial?(o(c,r),R(c,r)):r.isMeshPhongMaterial?(o(c,r),b(c,r)):r.isMeshStandardMaterial?(o(c,r),E(c,r),r.isMeshPhysicalMaterial&&x(c,r,m)):r.isMeshMatcapMaterial?(o(c,r),N(c,r)):r.isMeshDepthMaterial?o(c,r):r.isMeshDistanceMaterial?(o(c,r),P(c,r)):r.isMeshNormalMaterial?o(c,r):r.isLineBasicMaterial?(h(c,r),r.isLineDashedMaterial&&f(c,r)):r.isPointsMaterial?C(c,r,I,T):r.isSpriteMaterial?g(c,r):r.isShadowMaterial?(c.color.value.copy(r.color),c.opacity.value=r.opacity):r.isShaderMaterial&&(r.uniformsNeedUpdate=!1)}function o(c,r){c.opacity.value=r.opacity,r.color&&c.diffuse.value.copy(r.color),r.emissive&&c.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(c.map.value=r.map,t(r.map,c.mapTransform)),r.alphaMap&&(c.alphaMap.value=r.alphaMap,t(r.alphaMap,c.alphaMapTransform)),r.bumpMap&&(c.bumpMap.value=r.bumpMap,t(r.bumpMap,c.bumpMapTransform),c.bumpScale.value=r.bumpScale,r.side===_t&&(c.bumpScale.value*=-1)),r.normalMap&&(c.normalMap.value=r.normalMap,t(r.normalMap,c.normalMapTransform),c.normalScale.value.copy(r.normalScale),r.side===_t&&c.normalScale.value.negate()),r.displacementMap&&(c.displacementMap.value=r.displacementMap,t(r.displacementMap,c.displacementMapTransform),c.displacementScale.value=r.displacementScale,c.displacementBias.value=r.displacementBias),r.emissiveMap&&(c.emissiveMap.value=r.emissiveMap,t(r.emissiveMap,c.emissiveMapTransform)),r.specularMap&&(c.specularMap.value=r.specularMap,t(r.specularMap,c.specularMapTransform)),r.alphaTest>0&&(c.alphaTest.value=r.alphaTest);const I=n.get(r),T=I.envMap,m=I.envMapRotation;T&&(c.envMap.value=T,Pt.copy(m),Pt.x*=-1,Pt.y*=-1,Pt.z*=-1,T.isCubeTexture&&T.isRenderTargetTexture===!1&&(Pt.y*=-1,Pt.z*=-1),c.envMapRotation.value.setFromMatrix4(Ff.makeRotationFromEuler(Pt)),c.flipEnvMap.value=T.isCubeTexture&&T.isRenderTargetTexture===!1?-1:1,c.reflectivity.value=r.reflectivity,c.ior.value=r.ior,c.refractionRatio.value=r.refractionRatio),r.lightMap&&(c.lightMap.value=r.lightMap,c.lightMapIntensity.value=r.lightMapIntensity,t(r.lightMap,c.lightMapTransform)),r.aoMap&&(c.aoMap.value=r.aoMap,c.aoMapIntensity.value=r.aoMapIntensity,t(r.aoMap,c.aoMapTransform))}function h(c,r){c.diffuse.value.copy(r.color),c.opacity.value=r.opacity,r.map&&(c.map.value=r.map,t(r.map,c.mapTransform))}function f(c,r){c.dashSize.value=r.dashSize,c.totalSize.value=r.dashSize+r.gapSize,c.scale.value=r.scale}function C(c,r,I,T){c.diffuse.value.copy(r.color),c.opacity.value=r.opacity,c.size.value=r.size*I,c.scale.value=T*.5,r.map&&(c.map.value=r.map,t(r.map,c.uvTransform)),r.alphaMap&&(c.alphaMap.value=r.alphaMap,t(r.alphaMap,c.alphaMapTransform)),r.alphaTest>0&&(c.alphaTest.value=r.alphaTest)}function g(c,r){c.diffuse.value.copy(r.color),c.opacity.value=r.opacity,c.rotation.value=r.rotation,r.map&&(c.map.value=r.map,t(r.map,c.mapTransform)),r.alphaMap&&(c.alphaMap.value=r.alphaMap,t(r.alphaMap,c.alphaMapTransform)),r.alphaTest>0&&(c.alphaTest.value=r.alphaTest)}function b(c,r){c.specular.value.copy(r.specular),c.shininess.value=Math.max(r.shininess,1e-4)}function R(c,r){r.gradientMap&&(c.gradientMap.value=r.gradientMap)}function E(c,r){c.metalness.value=r.metalness,r.metalnessMap&&(c.metalnessMap.value=r.metalnessMap,t(r.metalnessMap,c.metalnessMapTransform)),c.roughness.value=r.roughness,r.roughnessMap&&(c.roughnessMap.value=r.roughnessMap,t(r.roughnessMap,c.roughnessMapTransform)),r.envMap&&(c.envMapIntensity.value=r.envMapIntensity)}function x(c,r,I){c.ior.value=r.ior,r.sheen>0&&(c.sheenColor.value.copy(r.sheenColor).multiplyScalar(r.sheen),c.sheenRoughness.value=r.sheenRoughness,r.sheenColorMap&&(c.sheenColorMap.value=r.sheenColorMap,t(r.sheenColorMap,c.sheenColorMapTransform)),r.sheenRoughnessMap&&(c.sheenRoughnessMap.value=r.sheenRoughnessMap,t(r.sheenRoughnessMap,c.sheenRoughnessMapTransform))),r.clearcoat>0&&(c.clearcoat.value=r.clearcoat,c.clearcoatRoughness.value=r.clearcoatRoughness,r.clearcoatMap&&(c.clearcoatMap.value=r.clearcoatMap,t(r.clearcoatMap,c.clearcoatMapTransform)),r.clearcoatRoughnessMap&&(c.clearcoatRoughnessMap.value=r.clearcoatRoughnessMap,t(r.clearcoatRoughnessMap,c.clearcoatRoughnessMapTransform)),r.clearcoatNormalMap&&(c.clearcoatNormalMap.value=r.clearcoatNormalMap,t(r.clearcoatNormalMap,c.clearcoatNormalMapTransform),c.clearcoatNormalScale.value.copy(r.clearcoatNormalScale),r.side===_t&&c.clearcoatNormalScale.value.negate())),r.dispersion>0&&(c.dispersion.value=r.dispersion),r.iridescence>0&&(c.iridescence.value=r.iridescence,c.iridescenceIOR.value=r.iridescenceIOR,c.iridescenceThicknessMinimum.value=r.iridescenceThicknessRange[0],c.iridescenceThicknessMaximum.value=r.iridescenceThicknessRange[1],r.iridescenceMap&&(c.iridescenceMap.value=r.iridescenceMap,t(r.iridescenceMap,c.iridescenceMapTransform)),r.iridescenceThicknessMap&&(c.iridescenceThicknessMap.value=r.iridescenceThicknessMap,t(r.iridescenceThicknessMap,c.iridescenceThicknessMapTransform))),r.transmission>0&&(c.transmission.value=r.transmission,c.transmissionSamplerMap.value=I.texture,c.transmissionSamplerSize.value.set(I.width,I.height),r.transmissionMap&&(c.transmissionMap.value=r.transmissionMap,t(r.transmissionMap,c.transmissionMapTransform)),c.thickness.value=r.thickness,r.thicknessMap&&(c.thicknessMap.value=r.thicknessMap,t(r.thicknessMap,c.thicknessMapTransform)),c.attenuationDistance.value=r.attenuationDistance,c.attenuationColor.value.copy(r.attenuationColor)),r.anisotropy>0&&(c.anisotropyVector.value.set(r.anisotropy*Math.cos(r.anisotropyRotation),r.anisotropy*Math.sin(r.anisotropyRotation)),r.anisotropyMap&&(c.anisotropyMap.value=r.anisotropyMap,t(r.anisotropyMap,c.anisotropyMapTransform))),c.specularIntensity.value=r.specularIntensity,c.specularColor.value.copy(r.specularColor),r.specularColorMap&&(c.specularColorMap.value=r.specularColorMap,t(r.specularColorMap,c.specularColorMapTransform)),r.specularIntensityMap&&(c.specularIntensityMap.value=r.specularIntensityMap,t(r.specularIntensityMap,c.specularIntensityMapTransform))}function N(c,r){r.matcap&&(c.matcap.value=r.matcap)}function P(c,r){const I=n.get(r).light;c.referencePosition.value.setFromMatrixPosition(I.matrixWorld),c.nearDistance.value=I.shadow.camera.near,c.farDistance.value=I.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:l}}function Gf(e,n,t,i){let l={},o={},h=[];const f=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function C(I,T){const m=T.program;i.uniformBlockBinding(I,m)}function g(I,T){let m=l[I.id];m===void 0&&(N(I),m=b(I),l[I.id]=m,I.addEventListener("dispose",c));const H=T.program;i.updateUBOMapping(I,H);const U=n.render.frame;o[I.id]!==U&&(E(I),o[I.id]=U)}function b(I){const T=R();I.__bindingPointIndex=T;const m=e.createBuffer(),H=I.__size,U=I.usage;return e.bindBuffer(e.UNIFORM_BUFFER,m),e.bufferData(e.UNIFORM_BUFFER,H,U),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,T,m),m}function R(){for(let I=0;I<f;I++)if(h.indexOf(I)===-1)return h.push(I),I;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function E(I){const T=l[I.id],m=I.uniforms,H=I.__cache;e.bindBuffer(e.UNIFORM_BUFFER,T);for(let U=0,y=m.length;U<y;U++){const B=Array.isArray(m[U])?m[U]:[m[U]];for(let p=0,d=B.length;p<d;p++){const A=B[p];if(x(A,U,p,H)===!0){const q=A.__offset,V=Array.isArray(A.value)?A.value:[A.value];let Y=0;for(let Q=0;Q<V.length;Q++){const W=V[Q],j=P(W);typeof W=="number"||typeof W=="boolean"?(A.__data[0]=W,e.bufferSubData(e.UNIFORM_BUFFER,q+Y,A.__data)):W.isMatrix3?(A.__data[0]=W.elements[0],A.__data[1]=W.elements[1],A.__data[2]=W.elements[2],A.__data[3]=0,A.__data[4]=W.elements[3],A.__data[5]=W.elements[4],A.__data[6]=W.elements[5],A.__data[7]=0,A.__data[8]=W.elements[6],A.__data[9]=W.elements[7],A.__data[10]=W.elements[8],A.__data[11]=0):(W.toArray(A.__data,Y),Y+=j.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,q,A.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function x(I,T,m,H){const U=I.value,y=T+"_"+m;if(H[y]===void 0)return typeof U=="number"||typeof U=="boolean"?H[y]=U:H[y]=U.clone(),!0;{const B=H[y];if(typeof U=="number"||typeof U=="boolean"){if(B!==U)return H[y]=U,!0}else if(B.equals(U)===!1)return B.copy(U),!0}return!1}function N(I){const T=I.uniforms;let m=0;const H=16;for(let y=0,B=T.length;y<B;y++){const p=Array.isArray(T[y])?T[y]:[T[y]];for(let d=0,A=p.length;d<A;d++){const q=p[d],V=Array.isArray(q.value)?q.value:[q.value];for(let Y=0,Q=V.length;Y<Q;Y++){const W=V[Y],j=P(W),F=m%H,he=F%j.boundary,Se=F+he;m+=he,Se!==0&&H-Se<j.storage&&(m+=H-Se),q.__data=new Float32Array(j.storage/Float32Array.BYTES_PER_ELEMENT),q.__offset=m,m+=j.storage}}}const U=m%H;return U>0&&(m+=H-U),I.__size=m,I.__cache={},this}function P(I){const T={boundary:0,storage:0};return typeof I=="number"||typeof I=="boolean"?(T.boundary=4,T.storage=4):I.isVector2?(T.boundary=8,T.storage=8):I.isVector3||I.isColor?(T.boundary=16,T.storage=12):I.isVector4?(T.boundary=16,T.storage=16):I.isMatrix3?(T.boundary=48,T.storage=48):I.isMatrix4?(T.boundary=64,T.storage=64):I.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",I),T}function c(I){const T=I.target;T.removeEventListener("dispose",c);const m=h.indexOf(T.__bindingPointIndex);h.splice(m,1),e.deleteBuffer(l[T.id]),delete l[T.id],delete o[T.id]}function r(){for(const I in l)e.deleteBuffer(l[I]);h=[],l={},o={}}return{bind:C,update:g,dispose:r}}class Vf{constructor(n={}){const{canvas:t=Ur(),context:i=null,depth:l=!0,stencil:o=!1,alpha:h=!1,antialias:f=!1,premultipliedAlpha:C=!0,preserveDrawingBuffer:g=!1,powerPreference:b="default",failIfMajorPerformanceCaveat:R=!1,reverseDepthBuffer:E=!1}=n;this.isWebGLRenderer=!0;let x;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");x=i.getContextAttributes().alpha}else x=h;const N=new Uint32Array(4),P=new Int32Array(4);let c=null,r=null;const I=[],T=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Dr,this.toneMapping=At,this.toneMappingExposure=1;const m=this;let H=!1,U=0,y=0,B=null,p=-1,d=null;const A=new ct,q=new ct;let V=null;const Y=new Ke(0);let Q=0,W=t.width,j=t.height,F=1,he=null,Se=null;const Le=new ct(0,0,W,j),Ge=new ct(0,0,W,j);let Ze=!1;const k=new nr;let J=!1,ue=!1;const ie=new Vt,Me=new Vt,Re=new ke,Ue=new ct,$e={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ye=!1;function je(){return B===null?F:1}let _=i;function ut(s,S){return t.getContext(s,S)}try{const s={alpha:!0,depth:l,stencil:o,antialias:f,premultipliedAlpha:C,preserveDrawingBuffer:g,powerPreference:b,failIfMajorPerformanceCaveat:R};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${wr}`),t.addEventListener("webglcontextlost",X,!1),t.addEventListener("webglcontextrestored",oe,!1),t.addEventListener("webglcontextcreationerror",ae,!1),_===null){const S="webgl2";if(_=ut(S,s),_===null)throw ut(S)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(s){throw console.error("THREE.WebGLRenderer: "+s.message),s}let De,we,_e,Xe,me,u,a,L,z,K,G,pe,re,le,Ne,Z,ce,Ee,Te,fe,Ie,be,ze,v;function te(){De=new Kl(_),De.init(),be=new Df(_,De),we=new kl(_,De,n,be),_e=new Lf(_,De),we.reverseDepthBuffer&&E&&_e.buffers.depth.setReversed(!0),Xe=new Ql(_),me=new mf,u=new Uf(_,De,_e,me,we,be,Xe),a=new zl(m),L=new ql(m),z=new io(_),ze=new Hl(_,z),K=new $l(_,z,Xe,ze),G=new jl(_,K,z,Xe),Te=new Jl(_,we,u),Z=new Wl(me),pe=new _f(m,a,L,De,we,ze,Z),re=new Bf(m,me),le=new gf,Ne=new Af(De),Ee=new Gl(m,a,L,_e,G,x,C),ce=new bf(m,G,we),v=new Gf(_,Xe,we,_e),fe=new Vl(_,De,Xe),Ie=new Zl(_,De,Xe),Xe.programs=pe.programs,m.capabilities=we,m.extensions=De,m.properties=me,m.renderLists=le,m.shadowMap=ce,m.state=_e,m.info=Xe}te();const O=new Of(m,_);this.xr=O,this.getContext=function(){return _},this.getContextAttributes=function(){return _.getContextAttributes()},this.forceContextLoss=function(){const s=De.get("WEBGL_lose_context");s&&s.loseContext()},this.forceContextRestore=function(){const s=De.get("WEBGL_lose_context");s&&s.restoreContext()},this.getPixelRatio=function(){return F},this.setPixelRatio=function(s){s!==void 0&&(F=s,this.setSize(W,j,!1))},this.getSize=function(s){return s.set(W,j)},this.setSize=function(s,S,D=!0){if(O.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}W=s,j=S,t.width=Math.floor(s*F),t.height=Math.floor(S*F),D===!0&&(t.style.width=s+"px",t.style.height=S+"px"),this.setViewport(0,0,s,S)},this.getDrawingBufferSize=function(s){return s.set(W*F,j*F).floor()},this.setDrawingBufferSize=function(s,S,D){W=s,j=S,F=D,t.width=Math.floor(s*D),t.height=Math.floor(S*D),this.setViewport(0,0,s,S)},this.getCurrentViewport=function(s){return s.copy(A)},this.getViewport=function(s){return s.copy(Le)},this.setViewport=function(s,S,D,w){s.isVector4?Le.set(s.x,s.y,s.z,s.w):Le.set(s,S,D,w),_e.viewport(A.copy(Le).multiplyScalar(F).round())},this.getScissor=function(s){return s.copy(Ge)},this.setScissor=function(s,S,D,w){s.isVector4?Ge.set(s.x,s.y,s.z,s.w):Ge.set(s,S,D,w),_e.scissor(q.copy(Ge).multiplyScalar(F).round())},this.getScissorTest=function(){return Ze},this.setScissorTest=function(s){_e.setScissorTest(Ze=s)},this.setOpaqueSort=function(s){he=s},this.setTransparentSort=function(s){Se=s},this.getClearColor=function(s){return s.copy(Ee.getClearColor())},this.setClearColor=function(){Ee.setClearColor.apply(Ee,arguments)},this.getClearAlpha=function(){return Ee.getClearAlpha()},this.setClearAlpha=function(){Ee.setClearAlpha.apply(Ee,arguments)},this.clear=function(s=!0,S=!0,D=!0){let w=0;if(s){let M=!1;if(B!==null){const $=B.texture.format;M=$===_r||$===hr||$===pr}if(M){const $=B.texture.type,ne=$===It||$===Jt||$===hn||$===Qt||$===lr||$===cr,se=Ee.getClearColor(),de=Ee.getClearAlpha(),xe=se.r,Ae=se.g,ve=se.b;ne?(N[0]=xe,N[1]=Ae,N[2]=ve,N[3]=de,_.clearBufferuiv(_.COLOR,0,N)):(P[0]=xe,P[1]=Ae,P[2]=ve,P[3]=de,_.clearBufferiv(_.COLOR,0,P))}else w|=_.COLOR_BUFFER_BIT}S&&(w|=_.DEPTH_BUFFER_BIT),D&&(w|=_.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),_.clear(w)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",X,!1),t.removeEventListener("webglcontextrestored",oe,!1),t.removeEventListener("webglcontextcreationerror",ae,!1),Ee.dispose(),le.dispose(),Ne.dispose(),me.dispose(),a.dispose(),L.dispose(),G.dispose(),ze.dispose(),v.dispose(),pe.dispose(),O.dispose(),O.removeEventListener("sessionstart",Yn),O.removeEventListener("sessionend",qn),Rt.stop()};function X(s){s.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),H=!0}function oe(){console.log("THREE.WebGLRenderer: Context Restored."),H=!1;const s=Xe.autoReset,S=ce.enabled,D=ce.autoUpdate,w=ce.needsUpdate,M=ce.type;te(),Xe.autoReset=s,ce.enabled=S,ce.autoUpdate=D,ce.needsUpdate=w,ce.type=M}function ae(s){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",s.statusMessage)}function Ce(s){const S=s.target;S.removeEventListener("dispose",Ce),Qe(S)}function Qe(s){at(s),me.remove(s)}function at(s){const S=me.get(s).programs;S!==void 0&&(S.forEach(function(D){pe.releaseProgram(D)}),s.isShaderMaterial&&pe.releaseShaderCache(s))}this.renderBufferDirect=function(s,S,D,w,M,$){S===null&&(S=$e);const ne=M.isMesh&&M.matrixWorld.determinant()<0,se=Rr(s,S,D,w,M);_e.setMaterial(w,ne);let de=D.index,xe=1;if(w.wireframe===!0){if(de=K.getWireframeAttribute(D),de===void 0)return;xe=2}const Ae=D.drawRange,ve=D.attributes.position;let Oe=Ae.start*xe,He=(Ae.start+Ae.count)*xe;$!==null&&(Oe=Math.max(Oe,$.start*xe),He=Math.min(He,($.start+$.count)*xe)),de!==null?(Oe=Math.max(Oe,0),He=Math.min(He,de.count)):ve!=null&&(Oe=Math.max(Oe,0),He=Math.min(He,ve.count));const et=He-Oe;if(et<0||et===1/0)return;ze.setup(M,w,se,D,de);let Je,Fe=fe;if(de!==null&&(Je=z.get(de),Fe=Ie,Fe.setIndex(Je)),M.isMesh)w.wireframe===!0?(_e.setLineWidth(w.wireframeLinewidth*je()),Fe.setMode(_.LINES)):Fe.setMode(_.TRIANGLES);else if(M.isLine){let ge=w.linewidth;ge===void 0&&(ge=1),_e.setLineWidth(ge*je()),M.isLineSegments?Fe.setMode(_.LINES):M.isLineLoop?Fe.setMode(_.LINE_LOOP):Fe.setMode(_.LINE_STRIP)}else M.isPoints?Fe.setMode(_.POINTS):M.isSprite&&Fe.setMode(_.TRIANGLES);if(M.isBatchedMesh)if(M._multiDrawInstances!==null)Fe.renderMultiDrawInstances(M._multiDrawStarts,M._multiDrawCounts,M._multiDrawCount,M._multiDrawInstances);else if(De.get("WEBGL_multi_draw"))Fe.renderMultiDraw(M._multiDrawStarts,M._multiDrawCounts,M._multiDrawCount);else{const ge=M._multiDrawStarts,rt=M._multiDrawCounts,Ve=M._multiDrawCount,vt=de?z.get(de).bytesPerElement:1,Nt=me.get(w).currentProgram.getUniforms();for(let dt=0;dt<Ve;dt++)Nt.setValue(_,"_gl_DrawID",dt),Fe.render(ge[dt]/vt,rt[dt])}else if(M.isInstancedMesh)Fe.renderInstances(Oe,et,M.count);else if(D.isInstancedBufferGeometry){const ge=D._maxInstanceCount!==void 0?D._maxInstanceCount:1/0,rt=Math.min(D.instanceCount,ge);Fe.renderInstances(Oe,et,rt)}else Fe.render(Oe,et)};function We(s,S,D){s.transparent===!0&&s.side===Mt&&s.forceSinglePass===!1?(s.side=_t,s.needsUpdate=!0,tn(s,S,D),s.side=Zt,s.needsUpdate=!0,tn(s,S,D),s.side=Mt):tn(s,S,D)}this.compile=function(s,S,D=null){D===null&&(D=s),r=Ne.get(D),r.init(S),T.push(r),D.traverseVisible(function(M){M.isLight&&M.layers.test(S.layers)&&(r.pushLight(M),M.castShadow&&r.pushShadow(M))}),s!==D&&s.traverseVisible(function(M){M.isLight&&M.layers.test(S.layers)&&(r.pushLight(M),M.castShadow&&r.pushShadow(M))}),r.setupLights();const w=new Set;return s.traverse(function(M){if(!(M.isMesh||M.isPoints||M.isLine||M.isSprite))return;const $=M.material;if($)if(Array.isArray($))for(let ne=0;ne<$.length;ne++){const se=$[ne];We(se,D,M),w.add(se)}else We($,D,M),w.add($)}),T.pop(),r=null,w},this.compileAsync=function(s,S,D=null){const w=this.compile(s,S,D);return new Promise(M=>{function $(){if(w.forEach(function(ne){me.get(ne).currentProgram.isReady()&&w.delete(ne)}),w.size===0){M(s);return}setTimeout($,10)}De.get("KHR_parallel_shader_compile")!==null?$():setTimeout($,10)})};let mt=null;function Et(s){mt&&mt(s)}function Yn(){Rt.stop()}function qn(){Rt.start()}const Rt=new Sr;Rt.setAnimationLoop(Et),typeof self<"u"&&Rt.setContext(self),this.setAnimationLoop=function(s){mt=s,O.setAnimationLoop(s),s===null?Rt.stop():Rt.start()},O.addEventListener("sessionstart",Yn),O.addEventListener("sessionend",qn),this.render=function(s,S){if(S!==void 0&&S.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(H===!0)return;if(s.matrixWorldAutoUpdate===!0&&s.updateMatrixWorld(),S.parent===null&&S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),O.enabled===!0&&O.isPresenting===!0&&(O.cameraAutoUpdate===!0&&O.updateCamera(S),S=O.getCamera()),s.isScene===!0&&s.onBeforeRender(m,s,S,B),r=Ne.get(s,T.length),r.init(S),T.push(r),Me.multiplyMatrices(S.projectionMatrix,S.matrixWorldInverse),k.setFromProjectionMatrix(Me),ue=this.localClippingEnabled,J=Z.init(this.clippingPlanes,ue),c=le.get(s,I.length),c.init(),I.push(c),O.enabled===!0&&O.isPresenting===!0){const $=m.xr.getDepthSensingMesh();$!==null&&En($,S,-1/0,m.sortObjects)}En(s,S,0,m.sortObjects),c.finish(),m.sortObjects===!0&&c.sort(he,Se),ye=O.enabled===!1||O.isPresenting===!1||O.hasDepthSensing()===!1,ye&&Ee.addToRenderList(c,s),this.info.render.frame++,J===!0&&Z.beginShadows();const D=r.state.shadowsArray;ce.render(D,s,S),J===!0&&Z.endShadows(),this.info.autoReset===!0&&this.info.reset();const w=c.opaque,M=c.transmissive;if(r.setupLights(),S.isArrayCamera){const $=S.cameras;if(M.length>0)for(let ne=0,se=$.length;ne<se;ne++){const de=$[ne];$n(w,M,s,de)}ye&&Ee.render(s);for(let ne=0,se=$.length;ne<se;ne++){const de=$[ne];Kn(c,s,de,de.viewport)}}else M.length>0&&$n(w,M,s,S),ye&&Ee.render(s),Kn(c,s,S);B!==null&&(u.updateMultisampleRenderTarget(B),u.updateRenderTargetMipmap(B)),s.isScene===!0&&s.onAfterRender(m,s,S),ze.resetDefaultState(),p=-1,d=null,T.pop(),T.length>0?(r=T[T.length-1],J===!0&&Z.setGlobalState(m.clippingPlanes,r.state.camera)):r=null,I.pop(),I.length>0?c=I[I.length-1]:c=null};function En(s,S,D,w){if(s.visible===!1)return;if(s.layers.test(S.layers)){if(s.isGroup)D=s.renderOrder;else if(s.isLOD)s.autoUpdate===!0&&s.update(S);else if(s.isLight)r.pushLight(s),s.castShadow&&r.pushShadow(s);else if(s.isSprite){if(!s.frustumCulled||k.intersectsSprite(s)){w&&Ue.setFromMatrixPosition(s.matrixWorld).applyMatrix4(Me);const ne=G.update(s),se=s.material;se.visible&&c.push(s,ne,se,D,Ue.z,null)}}else if((s.isMesh||s.isLine||s.isPoints)&&(!s.frustumCulled||k.intersectsObject(s))){const ne=G.update(s),se=s.material;if(w&&(s.boundingSphere!==void 0?(s.boundingSphere===null&&s.computeBoundingSphere(),Ue.copy(s.boundingSphere.center)):(ne.boundingSphere===null&&ne.computeBoundingSphere(),Ue.copy(ne.boundingSphere.center)),Ue.applyMatrix4(s.matrixWorld).applyMatrix4(Me)),Array.isArray(se)){const de=ne.groups;for(let xe=0,Ae=de.length;xe<Ae;xe++){const ve=de[xe],Oe=se[ve.materialIndex];Oe&&Oe.visible&&c.push(s,ne,Oe,D,Ue.z,ve)}}else se.visible&&c.push(s,ne,se,D,Ue.z,null)}}const $=s.children;for(let ne=0,se=$.length;ne<se;ne++)En($[ne],S,D,w)}function Kn(s,S,D,w){const M=s.opaque,$=s.transmissive,ne=s.transparent;r.setupLightsView(D),J===!0&&Z.setGlobalState(m.clippingPlanes,D),w&&_e.viewport(A.copy(w)),M.length>0&&en(M,S,D),$.length>0&&en($,S,D),ne.length>0&&en(ne,S,D),_e.buffers.depth.setTest(!0),_e.buffers.depth.setMask(!0),_e.buffers.color.setMask(!0),_e.setPolygonOffset(!1)}function $n(s,S,D,w){if((D.isScene===!0?D.overrideMaterial:null)!==null)return;r.state.transmissionRenderTarget[w.id]===void 0&&(r.state.transmissionRenderTarget[w.id]=new kt(1,1,{generateMipmaps:!0,type:De.has("EXT_color_buffer_half_float")||De.has("EXT_color_buffer_float")?_n:It,minFilter:qt,samples:4,stencilBuffer:o,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:tt.workingColorSpace}));const $=r.state.transmissionRenderTarget[w.id],ne=w.viewport||A;$.setSize(ne.z,ne.w);const se=m.getRenderTarget();m.setRenderTarget($),m.getClearColor(Y),Q=m.getClearAlpha(),Q<1&&m.setClearColor(16777215,.5),m.clear(),ye&&Ee.render(D);const de=m.toneMapping;m.toneMapping=At;const xe=w.viewport;if(w.viewport!==void 0&&(w.viewport=void 0),r.setupLightsView(w),J===!0&&Z.setGlobalState(m.clippingPlanes,w),en(s,D,w),u.updateMultisampleRenderTarget($),u.updateRenderTargetMipmap($),De.has("WEBGL_multisampled_render_to_texture")===!1){let Ae=!1;for(let ve=0,Oe=S.length;ve<Oe;ve++){const He=S[ve],et=He.object,Je=He.geometry,Fe=He.material,ge=He.group;if(Fe.side===Mt&&et.layers.test(w.layers)){const rt=Fe.side;Fe.side=_t,Fe.needsUpdate=!0,Zn(et,D,w,Je,Fe,ge),Fe.side=rt,Fe.needsUpdate=!0,Ae=!0}}Ae===!0&&(u.updateMultisampleRenderTarget($),u.updateRenderTargetMipmap($))}m.setRenderTarget(se),m.setClearColor(Y,Q),xe!==void 0&&(w.viewport=xe),m.toneMapping=de}function en(s,S,D){const w=S.isScene===!0?S.overrideMaterial:null;for(let M=0,$=s.length;M<$;M++){const ne=s[M],se=ne.object,de=ne.geometry,xe=w===null?ne.material:w,Ae=ne.group;se.layers.test(D.layers)&&Zn(se,S,D,de,xe,Ae)}}function Zn(s,S,D,w,M,$){s.onBeforeRender(m,S,D,w,M,$),s.modelViewMatrix.multiplyMatrices(D.matrixWorldInverse,s.matrixWorld),s.normalMatrix.getNormalMatrix(s.modelViewMatrix),M.onBeforeRender(m,S,D,w,s,$),M.transparent===!0&&M.side===Mt&&M.forceSinglePass===!1?(M.side=_t,M.needsUpdate=!0,m.renderBufferDirect(D,S,w,M,s,$),M.side=Zt,M.needsUpdate=!0,m.renderBufferDirect(D,S,w,M,s,$),M.side=Mt):m.renderBufferDirect(D,S,w,M,s,$),s.onAfterRender(m,S,D,w,M,$)}function tn(s,S,D){S.isScene!==!0&&(S=$e);const w=me.get(s),M=r.state.lights,$=r.state.shadowsArray,ne=M.state.version,se=pe.getParameters(s,M.state,$,S,D),de=pe.getProgramCacheKey(se);let xe=w.programs;w.environment=s.isMeshStandardMaterial?S.environment:null,w.fog=S.fog,w.envMap=(s.isMeshStandardMaterial?L:a).get(s.envMap||w.environment),w.envMapRotation=w.environment!==null&&s.envMap===null?S.environmentRotation:s.envMapRotation,xe===void 0&&(s.addEventListener("dispose",Ce),xe=new Map,w.programs=xe);let Ae=xe.get(de);if(Ae!==void 0){if(w.currentProgram===Ae&&w.lightsStateVersion===ne)return Jn(s,se),Ae}else se.uniforms=pe.getUniforms(s),s.onBeforeCompile(se,m),Ae=pe.acquireProgram(se,de),xe.set(de,Ae),w.uniforms=se.uniforms;const ve=w.uniforms;return(!s.isShaderMaterial&&!s.isRawShaderMaterial||s.clipping===!0)&&(ve.clippingPlanes=Z.uniform),Jn(s,se),w.needsLights=br(s),w.lightsStateVersion=ne,w.needsLights&&(ve.ambientLightColor.value=M.state.ambient,ve.lightProbe.value=M.state.probe,ve.directionalLights.value=M.state.directional,ve.directionalLightShadows.value=M.state.directionalShadow,ve.spotLights.value=M.state.spot,ve.spotLightShadows.value=M.state.spotShadow,ve.rectAreaLights.value=M.state.rectArea,ve.ltc_1.value=M.state.rectAreaLTC1,ve.ltc_2.value=M.state.rectAreaLTC2,ve.pointLights.value=M.state.point,ve.pointLightShadows.value=M.state.pointShadow,ve.hemisphereLights.value=M.state.hemi,ve.directionalShadowMap.value=M.state.directionalShadowMap,ve.directionalShadowMatrix.value=M.state.directionalShadowMatrix,ve.spotShadowMap.value=M.state.spotShadowMap,ve.spotLightMatrix.value=M.state.spotLightMatrix,ve.spotLightMap.value=M.state.spotLightMap,ve.pointShadowMap.value=M.state.pointShadowMap,ve.pointShadowMatrix.value=M.state.pointShadowMatrix),w.currentProgram=Ae,w.uniformsList=null,Ae}function Qn(s){if(s.uniformsList===null){const S=s.currentProgram.getUniforms();s.uniformsList=dn.seqWithValue(S.seq,s.uniforms)}return s.uniformsList}function Jn(s,S){const D=me.get(s);D.outputColorSpace=S.outputColorSpace,D.batching=S.batching,D.batchingColor=S.batchingColor,D.instancing=S.instancing,D.instancingColor=S.instancingColor,D.instancingMorph=S.instancingMorph,D.skinning=S.skinning,D.morphTargets=S.morphTargets,D.morphNormals=S.morphNormals,D.morphColors=S.morphColors,D.morphTargetsCount=S.morphTargetsCount,D.numClippingPlanes=S.numClippingPlanes,D.numIntersection=S.numClipIntersection,D.vertexAlphas=S.vertexAlphas,D.vertexTangents=S.vertexTangents,D.toneMapping=S.toneMapping}function Rr(s,S,D,w,M){S.isScene!==!0&&(S=$e),u.resetTextureUnits();const $=S.fog,ne=w.isMeshStandardMaterial?S.environment:null,se=B===null?m.outputColorSpace:B.isXRRenderTarget===!0?B.texture.colorSpace:mn,de=(w.isMeshStandardMaterial?L:a).get(w.envMap||ne),xe=w.vertexColors===!0&&!!D.attributes.color&&D.attributes.color.itemSize===4,Ae=!!D.attributes.tangent&&(!!w.normalMap||w.anisotropy>0),ve=!!D.morphAttributes.position,Oe=!!D.morphAttributes.normal,He=!!D.morphAttributes.color;let et=At;w.toneMapped&&(B===null||B.isXRRenderTarget===!0)&&(et=m.toneMapping);const Je=D.morphAttributes.position||D.morphAttributes.normal||D.morphAttributes.color,Fe=Je!==void 0?Je.length:0,ge=me.get(w),rt=r.state.lights;if(J===!0&&(ue===!0||s!==d)){const ot=s===d&&w.id===p;Z.setState(w,s,ot)}let Ve=!1;w.version===ge.__version?(ge.needsLights&&ge.lightsStateVersion!==rt.state.version||ge.outputColorSpace!==se||M.isBatchedMesh&&ge.batching===!1||!M.isBatchedMesh&&ge.batching===!0||M.isBatchedMesh&&ge.batchingColor===!0&&M.colorTexture===null||M.isBatchedMesh&&ge.batchingColor===!1&&M.colorTexture!==null||M.isInstancedMesh&&ge.instancing===!1||!M.isInstancedMesh&&ge.instancing===!0||M.isSkinnedMesh&&ge.skinning===!1||!M.isSkinnedMesh&&ge.skinning===!0||M.isInstancedMesh&&ge.instancingColor===!0&&M.instanceColor===null||M.isInstancedMesh&&ge.instancingColor===!1&&M.instanceColor!==null||M.isInstancedMesh&&ge.instancingMorph===!0&&M.morphTexture===null||M.isInstancedMesh&&ge.instancingMorph===!1&&M.morphTexture!==null||ge.envMap!==de||w.fog===!0&&ge.fog!==$||ge.numClippingPlanes!==void 0&&(ge.numClippingPlanes!==Z.numPlanes||ge.numIntersection!==Z.numIntersection)||ge.vertexAlphas!==xe||ge.vertexTangents!==Ae||ge.morphTargets!==ve||ge.morphNormals!==Oe||ge.morphColors!==He||ge.toneMapping!==et||ge.morphTargetsCount!==Fe)&&(Ve=!0):(Ve=!0,ge.__version=w.version);let vt=ge.currentProgram;Ve===!0&&(vt=tn(w,S,M));let Nt=!1,dt=!1,Xt=!1;const qe=vt.getUniforms(),pt=ge.uniforms;if(_e.useProgram(vt.program)&&(Nt=!0,dt=!0,Xt=!0),w.id!==p&&(p=w.id,dt=!0),Nt||d!==s){_e.buffers.depth.getReversed()?(ie.copy(s.projectionMatrix),Ir(ie),yr(ie),qe.setValue(_,"projectionMatrix",ie)):qe.setValue(_,"projectionMatrix",s.projectionMatrix),qe.setValue(_,"viewMatrix",s.matrixWorldInverse);const st=qe.map.cameraPosition;st!==void 0&&st.setValue(_,Re.setFromMatrixPosition(s.matrixWorld)),we.logarithmicDepthBuffer&&qe.setValue(_,"logDepthBufFC",2/(Math.log(s.far+1)/Math.LN2)),(w.isMeshPhongMaterial||w.isMeshToonMaterial||w.isMeshLambertMaterial||w.isMeshBasicMaterial||w.isMeshStandardMaterial||w.isShaderMaterial)&&qe.setValue(_,"isOrthographic",s.isOrthographicCamera===!0),d!==s&&(d=s,dt=!0,Xt=!0)}if(M.isSkinnedMesh){qe.setOptional(_,M,"bindMatrix"),qe.setOptional(_,M,"bindMatrixInverse");const ot=M.skeleton;ot&&(ot.boneTexture===null&&ot.computeBoneTexture(),qe.setValue(_,"boneTexture",ot.boneTexture,u))}M.isBatchedMesh&&(qe.setOptional(_,M,"batchingTexture"),qe.setValue(_,"batchingTexture",M._matricesTexture,u),qe.setOptional(_,M,"batchingIdTexture"),qe.setValue(_,"batchingIdTexture",M._indirectTexture,u),qe.setOptional(_,M,"batchingColorTexture"),M._colorsTexture!==null&&qe.setValue(_,"batchingColorTexture",M._colorsTexture,u));const ht=D.morphAttributes;if((ht.position!==void 0||ht.normal!==void 0||ht.color!==void 0)&&Te.update(M,D,vt),(dt||ge.receiveShadow!==M.receiveShadow)&&(ge.receiveShadow=M.receiveShadow,qe.setValue(_,"receiveShadow",M.receiveShadow)),w.isMeshGouraudMaterial&&w.envMap!==null&&(pt.envMap.value=de,pt.flipEnvMap.value=de.isCubeTexture&&de.isRenderTargetTexture===!1?-1:1),w.isMeshStandardMaterial&&w.envMap===null&&S.environment!==null&&(pt.envMapIntensity.value=S.environmentIntensity),dt&&(qe.setValue(_,"toneMappingExposure",m.toneMappingExposure),ge.needsLights&&Cr(pt,Xt),$&&w.fog===!0&&re.refreshFogUniforms(pt,$),re.refreshMaterialUniforms(pt,w,F,j,r.state.transmissionRenderTarget[s.id]),dn.upload(_,Qn(ge),pt,u)),w.isShaderMaterial&&w.uniformsNeedUpdate===!0&&(dn.upload(_,Qn(ge),pt,u),w.uniformsNeedUpdate=!1),w.isSpriteMaterial&&qe.setValue(_,"center",M.center),qe.setValue(_,"modelViewMatrix",M.modelViewMatrix),qe.setValue(_,"normalMatrix",M.normalMatrix),qe.setValue(_,"modelMatrix",M.matrixWorld),w.isShaderMaterial||w.isRawShaderMaterial){const ot=w.uniformsGroups;for(let st=0,Sn=ot.length;st<Sn;st++){const Ct=ot[st];v.update(Ct,vt),v.bind(Ct,vt)}}return vt}function Cr(s,S){s.ambientLightColor.needsUpdate=S,s.lightProbe.needsUpdate=S,s.directionalLights.needsUpdate=S,s.directionalLightShadows.needsUpdate=S,s.pointLights.needsUpdate=S,s.pointLightShadows.needsUpdate=S,s.spotLights.needsUpdate=S,s.spotLightShadows.needsUpdate=S,s.rectAreaLights.needsUpdate=S,s.hemisphereLights.needsUpdate=S}function br(s){return s.isMeshLambertMaterial||s.isMeshToonMaterial||s.isMeshPhongMaterial||s.isMeshStandardMaterial||s.isShadowMaterial||s.isShaderMaterial&&s.lights===!0}this.getActiveCubeFace=function(){return U},this.getActiveMipmapLevel=function(){return y},this.getRenderTarget=function(){return B},this.setRenderTargetTextures=function(s,S,D){me.get(s.texture).__webglTexture=S,me.get(s.depthTexture).__webglTexture=D;const w=me.get(s);w.__hasExternalTextures=!0,w.__autoAllocateDepthBuffer=D===void 0,w.__autoAllocateDepthBuffer||De.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),w.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(s,S){const D=me.get(s);D.__webglFramebuffer=S,D.__useDefaultFramebuffer=S===void 0},this.setRenderTarget=function(s,S=0,D=0){B=s,U=S,y=D;let w=!0,M=null,$=!1,ne=!1;if(s){const de=me.get(s);if(de.__useDefaultFramebuffer!==void 0)_e.bindFramebuffer(_.FRAMEBUFFER,null),w=!1;else if(de.__webglFramebuffer===void 0)u.setupRenderTarget(s);else if(de.__hasExternalTextures)u.rebindTextures(s,me.get(s.texture).__webglTexture,me.get(s.depthTexture).__webglTexture);else if(s.depthBuffer){const ve=s.depthTexture;if(de.__boundDepthTexture!==ve){if(ve!==null&&me.has(ve)&&(s.width!==ve.image.width||s.height!==ve.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");u.setupDepthRenderbuffer(s)}}const xe=s.texture;(xe.isData3DTexture||xe.isDataArrayTexture||xe.isCompressedArrayTexture)&&(ne=!0);const Ae=me.get(s).__webglFramebuffer;s.isWebGLCubeRenderTarget?(Array.isArray(Ae[S])?M=Ae[S][D]:M=Ae[S],$=!0):s.samples>0&&u.useMultisampledRTT(s)===!1?M=me.get(s).__webglMultisampledFramebuffer:Array.isArray(Ae)?M=Ae[D]:M=Ae,A.copy(s.viewport),q.copy(s.scissor),V=s.scissorTest}else A.copy(Le).multiplyScalar(F).floor(),q.copy(Ge).multiplyScalar(F).floor(),V=Ze;if(_e.bindFramebuffer(_.FRAMEBUFFER,M)&&w&&_e.drawBuffers(s,M),_e.viewport(A),_e.scissor(q),_e.setScissorTest(V),$){const de=me.get(s.texture);_.framebufferTexture2D(_.FRAMEBUFFER,_.COLOR_ATTACHMENT0,_.TEXTURE_CUBE_MAP_POSITIVE_X+S,de.__webglTexture,D)}else if(ne){const de=me.get(s.texture),xe=S||0;_.framebufferTextureLayer(_.FRAMEBUFFER,_.COLOR_ATTACHMENT0,de.__webglTexture,D||0,xe)}p=-1},this.readRenderTargetPixels=function(s,S,D,w,M,$,ne){if(!(s&&s.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let se=me.get(s).__webglFramebuffer;if(s.isWebGLCubeRenderTarget&&ne!==void 0&&(se=se[ne]),se){_e.bindFramebuffer(_.FRAMEBUFFER,se);try{const de=s.texture,xe=de.format,Ae=de.type;if(!we.textureFormatReadable(xe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!we.textureTypeReadable(Ae)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}S>=0&&S<=s.width-w&&D>=0&&D<=s.height-M&&_.readPixels(S,D,w,M,be.convert(xe),be.convert(Ae),$)}finally{const de=B!==null?me.get(B).__webglFramebuffer:null;_e.bindFramebuffer(_.FRAMEBUFFER,de)}}},this.readRenderTargetPixelsAsync=async function(s,S,D,w,M,$,ne){if(!(s&&s.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let se=me.get(s).__webglFramebuffer;if(s.isWebGLCubeRenderTarget&&ne!==void 0&&(se=se[ne]),se){const de=s.texture,xe=de.format,Ae=de.type;if(!we.textureFormatReadable(xe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!we.textureTypeReadable(Ae))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(S>=0&&S<=s.width-w&&D>=0&&D<=s.height-M){_e.bindFramebuffer(_.FRAMEBUFFER,se);const ve=_.createBuffer();_.bindBuffer(_.PIXEL_PACK_BUFFER,ve),_.bufferData(_.PIXEL_PACK_BUFFER,$.byteLength,_.STREAM_READ),_.readPixels(S,D,w,M,be.convert(xe),be.convert(Ae),0);const Oe=B!==null?me.get(B).__webglFramebuffer:null;_e.bindFramebuffer(_.FRAMEBUFFER,Oe);const He=_.fenceSync(_.SYNC_GPU_COMMANDS_COMPLETE,0);return _.flush(),await Nr(_,He,4),_.bindBuffer(_.PIXEL_PACK_BUFFER,ve),_.getBufferSubData(_.PIXEL_PACK_BUFFER,0,$),_.deleteBuffer(ve),_.deleteSync(He),$}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(s,S=null,D=0){s.isTexture!==!0&&(Ft("WebGLRenderer: copyFramebufferToTexture function signature has changed."),S=arguments[0]||null,s=arguments[1]);const w=Math.pow(2,-D),M=Math.floor(s.image.width*w),$=Math.floor(s.image.height*w),ne=S!==null?S.x:0,se=S!==null?S.y:0;u.setTexture2D(s,0),_.copyTexSubImage2D(_.TEXTURE_2D,D,0,0,ne,se,M,$),_e.unbindTexture()};const Pr=_.createFramebuffer(),Lr=_.createFramebuffer();this.copyTextureToTexture=function(s,S,D=null,w=null,M=0,$=null){s.isTexture!==!0&&(Ft("WebGLRenderer: copyTextureToTexture function signature has changed."),w=arguments[0]||null,s=arguments[1],S=arguments[2],$=arguments[3]||0,D=null),$===null&&(M!==0?(Ft("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),$=M,M=0):$=0);let ne,se,de,xe,Ae,ve,Oe,He,et;const Je=s.isCompressedTexture?s.mipmaps[$]:s.image;if(D!==null)ne=D.max.x-D.min.x,se=D.max.y-D.min.y,de=D.isBox3?D.max.z-D.min.z:1,xe=D.min.x,Ae=D.min.y,ve=D.isBox3?D.min.z:0;else{const ht=Math.pow(2,-M);ne=Math.floor(Je.width*ht),se=Math.floor(Je.height*ht),s.isDataArrayTexture?de=Je.depth:s.isData3DTexture?de=Math.floor(Je.depth*ht):de=1,xe=0,Ae=0,ve=0}w!==null?(Oe=w.x,He=w.y,et=w.z):(Oe=0,He=0,et=0);const Fe=be.convert(S.format),ge=be.convert(S.type);let rt;S.isData3DTexture?(u.setTexture3D(S,0),rt=_.TEXTURE_3D):S.isDataArrayTexture||S.isCompressedArrayTexture?(u.setTexture2DArray(S,0),rt=_.TEXTURE_2D_ARRAY):(u.setTexture2D(S,0),rt=_.TEXTURE_2D),_.pixelStorei(_.UNPACK_FLIP_Y_WEBGL,S.flipY),_.pixelStorei(_.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),_.pixelStorei(_.UNPACK_ALIGNMENT,S.unpackAlignment);const Ve=_.getParameter(_.UNPACK_ROW_LENGTH),vt=_.getParameter(_.UNPACK_IMAGE_HEIGHT),Nt=_.getParameter(_.UNPACK_SKIP_PIXELS),dt=_.getParameter(_.UNPACK_SKIP_ROWS),Xt=_.getParameter(_.UNPACK_SKIP_IMAGES);_.pixelStorei(_.UNPACK_ROW_LENGTH,Je.width),_.pixelStorei(_.UNPACK_IMAGE_HEIGHT,Je.height),_.pixelStorei(_.UNPACK_SKIP_PIXELS,xe),_.pixelStorei(_.UNPACK_SKIP_ROWS,Ae),_.pixelStorei(_.UNPACK_SKIP_IMAGES,ve);const qe=s.isDataArrayTexture||s.isData3DTexture,pt=S.isDataArrayTexture||S.isData3DTexture;if(s.isDepthTexture){const ht=me.get(s),ot=me.get(S),st=me.get(ht.__renderTarget),Sn=me.get(ot.__renderTarget);_e.bindFramebuffer(_.READ_FRAMEBUFFER,st.__webglFramebuffer),_e.bindFramebuffer(_.DRAW_FRAMEBUFFER,Sn.__webglFramebuffer);for(let Ct=0;Ct<de;Ct++)qe&&(_.framebufferTextureLayer(_.READ_FRAMEBUFFER,_.COLOR_ATTACHMENT0,me.get(s).__webglTexture,M,ve+Ct),_.framebufferTextureLayer(_.DRAW_FRAMEBUFFER,_.COLOR_ATTACHMENT0,me.get(S).__webglTexture,$,et+Ct)),_.blitFramebuffer(xe,Ae,ne,se,Oe,He,ne,se,_.DEPTH_BUFFER_BIT,_.NEAREST);_e.bindFramebuffer(_.READ_FRAMEBUFFER,null),_e.bindFramebuffer(_.DRAW_FRAMEBUFFER,null)}else if(M!==0||s.isRenderTargetTexture||me.has(s)){const ht=me.get(s),ot=me.get(S);_e.bindFramebuffer(_.READ_FRAMEBUFFER,Pr),_e.bindFramebuffer(_.DRAW_FRAMEBUFFER,Lr);for(let st=0;st<de;st++)qe?_.framebufferTextureLayer(_.READ_FRAMEBUFFER,_.COLOR_ATTACHMENT0,ht.__webglTexture,M,ve+st):_.framebufferTexture2D(_.READ_FRAMEBUFFER,_.COLOR_ATTACHMENT0,_.TEXTURE_2D,ht.__webglTexture,M),pt?_.framebufferTextureLayer(_.DRAW_FRAMEBUFFER,_.COLOR_ATTACHMENT0,ot.__webglTexture,$,et+st):_.framebufferTexture2D(_.DRAW_FRAMEBUFFER,_.COLOR_ATTACHMENT0,_.TEXTURE_2D,ot.__webglTexture,$),M!==0?_.blitFramebuffer(xe,Ae,ne,se,Oe,He,ne,se,_.COLOR_BUFFER_BIT,_.NEAREST):pt?_.copyTexSubImage3D(rt,$,Oe,He,et+st,xe,Ae,ne,se):_.copyTexSubImage2D(rt,$,Oe,He,xe,Ae,ne,se);_e.bindFramebuffer(_.READ_FRAMEBUFFER,null),_e.bindFramebuffer(_.DRAW_FRAMEBUFFER,null)}else pt?s.isDataTexture||s.isData3DTexture?_.texSubImage3D(rt,$,Oe,He,et,ne,se,de,Fe,ge,Je.data):S.isCompressedArrayTexture?_.compressedTexSubImage3D(rt,$,Oe,He,et,ne,se,de,Fe,Je.data):_.texSubImage3D(rt,$,Oe,He,et,ne,se,de,Fe,ge,Je):s.isDataTexture?_.texSubImage2D(_.TEXTURE_2D,$,Oe,He,ne,se,Fe,ge,Je.data):s.isCompressedTexture?_.compressedTexSubImage2D(_.TEXTURE_2D,$,Oe,He,Je.width,Je.height,Fe,Je.data):_.texSubImage2D(_.TEXTURE_2D,$,Oe,He,ne,se,Fe,ge,Je);_.pixelStorei(_.UNPACK_ROW_LENGTH,Ve),_.pixelStorei(_.UNPACK_IMAGE_HEIGHT,vt),_.pixelStorei(_.UNPACK_SKIP_PIXELS,Nt),_.pixelStorei(_.UNPACK_SKIP_ROWS,dt),_.pixelStorei(_.UNPACK_SKIP_IMAGES,Xt),$===0&&S.generateMipmaps&&_.generateMipmap(rt),_e.unbindTexture()},this.copyTextureToTexture3D=function(s,S,D=null,w=null,M=0){return s.isTexture!==!0&&(Ft("WebGLRenderer: copyTextureToTexture3D function signature has changed."),D=arguments[0]||null,w=arguments[1]||null,s=arguments[2],S=arguments[3],M=arguments[4]||0),Ft('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(s,S,D,w,M)},this.initRenderTarget=function(s){me.get(s).__webglFramebuffer===void 0&&u.setupRenderTarget(s)},this.initTexture=function(s){s.isCubeTexture?u.setTextureCube(s,0):s.isData3DTexture?u.setTexture3D(s,0):s.isDataArrayTexture||s.isCompressedArrayTexture?u.setTexture2DArray(s,0):u.setTexture2D(s,0),_e.unbindTexture()},this.resetState=function(){U=0,y=0,B=null,_e.reset(),ze.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Or}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(n){this._outputColorSpace=n;const t=this.getContext();t.drawingBufferColorspace=tt._getDrawingBufferColorSpace(n),t.unpackColorSpace=tt._getUnpackColorSpace()}}export{Ni as P,Vf as W};
