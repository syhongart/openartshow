import * as THREE from "three";
const DEFAULT_LOD_CONFIG = {
  lod0Distance: 5,
  lod0Vertices: 1200,
  lod1Distance: 15,
  lod1Vertices: 600,
  lod2Distance: Infinity,
  lod2Vertices: 200
};
class ChibiLODManager {
  camera;
  mesh;
  config;
  originalGeometry;
  lodGeometries = /* @__PURE__ */ new Map();
  currentLOD = 0;
  constructor(mesh, camera, config = {}) {
    this.mesh = mesh;
    this.camera = camera;
    this.config = { ...DEFAULT_LOD_CONFIG, ...config };
    this.originalGeometry = mesh.geometry.clone();
    this.generateLODGeometries();
  }
  /**
   * LOD 지오메트리 생성 (Simplify 또는 수동 감소)
   * 실제 구현에서는 simplify-modifier library 또는 Blender decimation 사용
   */
  generateLODGeometries() {
    this.lodGeometries.set(0, this.originalGeometry);
    const lod1Geo = this.simplifyGeometry(this.originalGeometry, 0.5);
    this.lodGeometries.set(1, lod1Geo);
    const lod2Geo = this.simplifyGeometry(this.originalGeometry, 0.2);
    this.lodGeometries.set(2, lod2Geo);
  }
  /**
   * 단순 정점 감소 (프로토타입)
   * 실제로는 simplify-modifier 또는 고급 메시 축소 라이브러리 사용 권장
   */
  simplifyGeometry(original, ratio) {
    const simplified = original.clone();
    const posAttr = simplified.getAttribute("position");
    const indexAttr = simplified.getIndex();
    if (!indexAttr) {
      console.warn("Geometry has no index, LOD simplification skipped");
      return simplified;
    }
    const newVertexCount = Math.max(10, Math.floor(posAttr.count * ratio));
    const step = Math.floor(posAttr.count / newVertexCount);
    const newIndices = [];
    for (let i = 0; i < posAttr.count; i += step) {
      newIndices.push(i);
    }
    const newFaceIndices = [];
    for (let i = 0; i < newIndices.length - 2; i += 3) {
      newFaceIndices.push(newIndices[i], newIndices[i + 1], newIndices[i + 2]);
    }
    simplified.setIndex(new THREE.BufferAttribute(new Uint32Array(newFaceIndices), 1));
    if (simplified.hasAttribute("skinIndex")) {
    }
    if (simplified.hasAttribute("skinWeight")) {
    }
    simplified.computeVertexNormals();
    return simplified;
  }
  /**
   * 프레임별 호출 - 거리 기반 LOD 업데이트
   */
  update() {
    const distance = this.camera.position.distanceTo(this.mesh.position);
    let newLOD = 0;
    if (distance > this.config.lod1Distance) {
      newLOD = 2;
    } else if (distance > this.config.lod0Distance) {
      newLOD = 1;
    } else {
      newLOD = 0;
    }
    if (newLOD !== this.currentLOD) {
      this.setLOD(newLOD);
    }
  }
  /**
   * LOD 레벨 설정
   */
  setLOD(level) {
    const geometry = this.lodGeometries.get(level);
    if (geometry) {
      this.mesh.geometry = geometry;
      this.currentLOD = level;
      console.log(`[LOD] Switched to LOD ${level}`);
    }
  }
  /**
   * 현재 LOD 레벨 반환
   */
  getCurrentLOD() {
    return this.currentLOD;
  }
  /**
   * 자원 정리
   */
  dispose() {
    this.lodGeometries.forEach((geo) => geo.dispose());
    this.originalGeometry.dispose();
  }
}
class ChibiLODGroup {
  managers = /* @__PURE__ */ new Map();
  camera;
  constructor(camera) {
    this.camera = camera;
  }
  /**
   * LOD 매니저 등록
   */
  registerMesh(mesh, config) {
    const manager = new ChibiLODManager(mesh, this.camera, config);
    this.managers.set(mesh, manager);
    return manager;
  }
  /**
   * 모든 LOD 메니저 업데이트
   */
  updateAll() {
    this.managers.forEach((manager) => manager.update());
  }
  /**
   * 메시 제거
   */
  unregisterMesh(mesh) {
    const manager = this.managers.get(mesh);
    if (manager) {
      manager.dispose();
      this.managers.delete(mesh);
    }
  }
  /**
   * 모든 자원 정리
   */
  dispose() {
    this.managers.forEach((manager) => manager.dispose());
    this.managers.clear();
  }
}
class LODStats {
  lodTransitions = /* @__PURE__ */ new Map();
  recordTransition(lod) {
    this.lodTransitions.set(lod, (this.lodTransitions.get(lod) || 0) + 1);
  }
  getStats() {
    return {
      lod0: this.lodTransitions.get(0) || 0,
      lod1: this.lodTransitions.get(1) || 0,
      lod2: this.lodTransitions.get(2) || 0
    };
  }
  reset() {
    this.lodTransitions.clear();
  }
}
export {
  ChibiLODGroup,
  ChibiLODManager,
  DEFAULT_LOD_CONFIG,
  LODStats
};
