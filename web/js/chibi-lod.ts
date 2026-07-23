/**
 * LOD (Level of Detail) 매니저
 * 카메라 거리에 따라 캐릭터 메시 복잡도 조절
 */

import * as THREE from 'three';

export interface LODConfig {
  // LOD 0: 근거리 (< 5m) - 전체 세부사항
  lod0Distance: number;
  lod0Vertices: number;

  // LOD 1: 중거리 (5~15m) - 간소화
  lod1Distance: number;
  lod1Vertices: number;

  // LOD 2: 원거리 (> 15m) - 극도 간단화
  lod2Distance: number;
  lod2Vertices: number;
}

export const DEFAULT_LOD_CONFIG: LODConfig = {
  lod0Distance: 5,
  lod0Vertices: 1200,

  lod1Distance: 15,
  lod1Vertices: 600,

  lod2Distance: Infinity,
  lod2Vertices: 200,
};

/**
 * SkinnedMesh를 위한 단순 LOD 관리자
 * (THREE.LOD은 mesh swap 기반이므로 스켈레톤 기반 캐릭터에는 별도 처리 필요)
 */
export class ChibiLODManager {
  private camera: THREE.Camera;
  private mesh: THREE.SkinnedMesh;
  private config: LODConfig;
  private originalGeometry: THREE.BufferGeometry;
  private lodGeometries: Map<number, THREE.BufferGeometry> = new Map();
  private currentLOD: number = 0;

  constructor(
    mesh: THREE.SkinnedMesh,
    camera: THREE.Camera,
    config: Partial<LODConfig> = {}
  ) {
    this.mesh = mesh;
    this.camera = camera;
    this.config = { ...DEFAULT_LOD_CONFIG, ...config };
    this.originalGeometry = mesh.geometry.clone();

    // LOD 지오메트리 사전 생성
    this.generateLODGeometries();
  }

  /**
   * LOD 지오메트리 생성 (Simplify 또는 수동 감소)
   * 실제 구현에서는 simplify-modifier library 또는 Blender decimation 사용
   */
  private generateLODGeometries() {
    // LOD 0: 원본
    this.lodGeometries.set(0, this.originalGeometry);

    // LOD 1: 정점 50% 감소 (간단 구현: 랜덤 샘플링)
    const lod1Geo = this.simplifyGeometry(this.originalGeometry, 0.5);
    this.lodGeometries.set(1, lod1Geo);

    // LOD 2: 정점 80% 감소
    const lod2Geo = this.simplifyGeometry(this.originalGeometry, 0.2);
    this.lodGeometries.set(2, lod2Geo);
  }

  /**
   * 단순 정점 감소 (프로토타입)
   * 실제로는 simplify-modifier 또는 고급 메시 축소 라이브러리 사용 권장
   */
  private simplifyGeometry(
    original: THREE.BufferGeometry,
    ratio: number
  ): THREE.BufferGeometry {
    const simplified = original.clone();

    // 정점 및 인덱스를 ratio 비율로 감소
    const posAttr = simplified.getAttribute('position');
    const indexAttr = simplified.getIndex();

    if (!indexAttr) {
      console.warn('Geometry has no index, LOD simplification skipped');
      return simplified;
    }

    const newVertexCount = Math.max(10, Math.floor(posAttr.count * ratio));
    const step = Math.floor(posAttr.count / newVertexCount);

    // 새로운 인덱스 생성 (매 step번째 정점만 선택)
    const newIndices: number[] = [];
    for (let i = 0; i < posAttr.count; i += step) {
      newIndices.push(i);
    }

    // 면 재구성 (3개씩 그룹화)
    const newFaceIndices: number[] = [];
    for (let i = 0; i < newIndices.length - 2; i += 3) {
      newFaceIndices.push(newIndices[i], newIndices[i + 1], newIndices[i + 2]);
    }

    simplified.setIndex(new THREE.BufferAttribute(new Uint32Array(newFaceIndices), 1));

    // 정점 속성 정리 (Bone Weight 유지)
    if (simplified.hasAttribute('skinIndex')) {
      // Bone indices 유지 (중요!)
    }
    if (simplified.hasAttribute('skinWeight')) {
      // Bone weights 유지 (중요!)
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
  private setLOD(level: number) {
    const geometry = this.lodGeometries.get(level);
    if (geometry) {
      this.mesh.geometry = geometry;
      this.currentLOD = level;
      // 필요시 이벤트 발생
      console.log(`[LOD] Switched to LOD ${level}`);
    }
  }

  /**
   * 현재 LOD 레벨 반환
   */
  getCurrentLOD(): number {
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

/**
 * 월드 스트리밍과 통합된 LOD 그룹 관리
 */
export class ChibiLODGroup {
  private managers: Map<THREE.SkinnedMesh, ChibiLODManager> = new Map();
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  /**
   * LOD 매니저 등록
   */
  registerMesh(mesh: THREE.SkinnedMesh, config?: Partial<LODConfig>) {
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
  unregisterMesh(mesh: THREE.SkinnedMesh) {
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

/**
 * 성능 분석: LOD 전환 통계
 */
export class LODStats {
  private lodTransitions: Map<number, number> = new Map();

  recordTransition(lod: number) {
    this.lodTransitions.set(lod, (this.lodTransitions.get(lod) || 0) + 1);
  }

  getStats() {
    return {
      lod0: this.lodTransitions.get(0) || 0,
      lod1: this.lodTransitions.get(1) || 0,
      lod2: this.lodTransitions.get(2) || 0,
    };
  }

  reset() {
    this.lodTransitions.clear();
  }
}
