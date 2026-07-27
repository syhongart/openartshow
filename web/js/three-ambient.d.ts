// three 앰비언트 선언 — tsc 타입체크 전용(런타임·번들 무영향).
// 배경: 번들은 vite.config가 'three'를 /vendor/three.module.js 별칭으로 해석하고,
// @types/three(방대·버전 민감)는 self-contained/CSP 원칙상 도입하지 않는다. .ts 모듈이
// three를 import 하기 시작하면(C-1 단계3 ui-avatar-editor.ts가 첫 사례) tsc가 타입 선언을
// 못 찾아 TS7016을 낸다. 이를 any 모듈로 선언해 타입체크만 통과시킨다(구 .js checkJs:false
// 시절의 타입 안전성 수준을 그대로 유지 — 기능·값 무변경).
declare module 'three';
// three/addons/* — TiledLighting 등 부속 모듈. 값만 쓰므로 shorthand로 충분하다.
declare module 'three/addons/*';

// ── three/webgpu ────────────────────────────────────────────────────────────
// 신형 통합 Renderer 번들(WebGPURenderer + 노드 재질). 오픈월드가 이 진입점을 쓴다.
// world2의 .ts 모듈이 처음으로 tsc 검사 대상이 되면서 선언이 필요해졌다 — 기존 world.js는
// .js라 checkJs:false로 검사 밖이었고, 그게 이 파일에서 타입 사각을 만들던 지점이다.
//
// shorthand(`declare module 'three/webgpu';`)로는 **타입 위치**에서 멤버 접근이 안 된다
// (값으로는 any가 되지만 `THREE.Object3D`처럼 타입으로 쓰면 TS2694). 그래서 world2가 타입으로
// 참조하는 심볼만 골라 느슨한 클래스로 선언한다. 멤버는 index signature로 any —
// @types/three(방대·버전 민감)를 도입하지 않는 self-contained 원칙을 지키면서, 구 .js
// checkJs:false 시절과 같은 안전성 수준에 "타입 자리에 쓸 수 있다"만 더한 것이다.
declare module 'three/webgpu' {
  class Base { [k: string]: any; }
  export class Object3D extends Base {}
  export class Group extends Base {}
  export class Scene extends Base {}
  export class Camera extends Base {}
  export class BufferGeometry extends Base {}
  export class Material extends Base {}
  // 하늘 돔(ShaderMaterial)·구름(MeshBasicMaterial)이 타입 위치에서 쓴다.
  export class ShaderMaterial extends Base { constructor(p?: any); }
  export class MeshBasicMaterial extends Base { constructor(p?: any); }
  export class Mesh extends Base {}
  export class InstancedMesh extends Base { constructor(g: any, m: any, count: number); }
  export class InstancedBufferAttribute extends Base { constructor(a: any, itemSize: number); }
  export class Texture extends Base {}
  export class DirectionalLight extends Base {}
  export class Color extends Base { constructor(...a: any[]); }
  export class Matrix4 extends Base {}
  export class Quaternion extends Base {}
  export class Vector3 extends Base { constructor(...a: any[]); }
  export class Vector2 extends Base { constructor(...a: any[]); }
  export class WebGPURenderer extends Base { constructor(p?: any); }
  export class PMREMGenerator extends Base { constructor(r: any); }
  // 나머지(상수·기타 클래스)는 any로 통과시킨다.
  const rest: any;
  export = rest;
}
