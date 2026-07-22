// OpenArtShow Metaverse — 공통 설정
// 소유자: config.js / scene.js 담당 에이전트

// ---------------------------------------------------------------------------
// 타입 정의 — P1-④(main-* 컨트롤러 타입화)가 import해 재사용한다.
// floors id는 유니온(FloorId)으로 좁혀 slabHoles 키·spawn.floor·artworkSlots[].floor가
// 전부 동일 유니온을 공유하도록 강제(불일치 시 tsc 에러). 데이터가 4개 층으로 완전 일관.
// ---------------------------------------------------------------------------
export type FloorId = 'b1' | 'f1' | 'f2' | 'roof';

export interface Room {
  size: number;
  wallHeight: number;
  bound: number;
}

export interface Floor {
  id: FloorId;
  y: number;
  name: string;
}

export interface Stair {
  id: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  yFrom: number;
  yTo: number;
}

export interface SlabHole {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface ArtworkSlot {
  floor: FloorId;
  x: number;
  z: number;
  rotY: number;
  featured?: boolean;
  size?: { w: number; h: number };
}

export interface Spawn {
  x: number;
  z: number;
  floor: FloorId;
  ry: number;
}

export interface Building {
  // 풋프린트 (모든 층 공통, 벽 중심선 기준)
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  wallT: number;
  slabT: number;
  storyH: number;
  clearH: number;
  floors: Floor[];
  stairs: Stair[];
  slabHoles: Record<FloorId, SlabHole[]>;
  artworkSlots: ArtworkSlot[];
  spawn: Spawn;
}

export const ROOM: Room = { size: 50, wallHeight: 6, bound: 24 }; // (구) 단층 홀 — 실외 지형 스케일 기준으로만 사용
export const EYE_HEIGHT = 1.7;

// ---------------------------------------------------------------------------
// BUILDING — 다층 미술관 청사진 (단일 진실 소스)
// scene.js(건축), player.js(이동/충돌), artworks.js(작품 슬롯), main.js(스폰/투어)가
// 전부 이 데이터를 소비한다. 좌표계: 바닥 y=층 slab 상면, 실내 x/z는 벽 안쪽 기준.
// ---------------------------------------------------------------------------
export const BUILDING: Building = {
  // 풋프린트 (모든 층 공통, 벽 중심선 기준)
  minX: -11, maxX: 11, minZ: -8, maxZ: 8,
  wallT: 0.3,       // 벽 두께
  slabT: 0.6,       // 슬래브 두께
  storyH: 4.2,      // 층간 높이 (바닥면→바닥면)
  clearH: 3.6,      // 층고 (바닥→천장 코퍼 밑면)

  floors: [
    { id: 'b1', y: -4.2, name: 'B1 미디어 갤러리' },
    { id: 'f1', y: 0, name: '1F 메인 갤러리' },
    { id: 'f2', y: 4.2, name: '2F 갤러리' },
    { id: 'roof', y: 8.4, name: '옥상 테라스' },
  ],

  // 계단 (직선 런): x0..x1 밴드에서 z0(yFrom) → z1(yTo)로 선형 상승.
  // 계단 위 지면 y = yFrom + (z - z0) / (z1 - z0) * (yTo - yFrom)
  stairs: [
    { id: 'b1-f1', x0: -10.7, x1: -8.7, z0: -7, z1: -1, yFrom: -4.2, yTo: 0 },
    { id: 'f1-f2', x0: -10.7, x1: -8.7, z0: 1, z1: 7, yFrom: 0, yTo: 4.2 },
    { id: 'f2-roof', x0: 8.7, x1: 10.7, z0: 1, z1: 7, yFrom: 4.2, yTo: 8.4 },
  ],

  // 슬래브 개구부 (해당 층 '바닥'에 뚫린 구멍) — 아래층 계단 상부 / 보이드
  slabHoles: {
    b1: [],
    f1: [{ x0: -10.7, x1: -8.7, z0: -7, z1: -1 }],
    f2: [
      { x0: -10.7, x1: -8.7, z0: 1, z1: 7 },
      { x0: -4, x1: 5, z0: -3, z1: 3 }, // 중앙 보이드 — 1F가 내려다보인다
    ],
    roof: [{ x0: 8.7, x1: 10.7, z0: 1, z1: 7 }],
  },

  // 작품 슬롯 — floor의 y + 아래 오프셋으로 배치 (artworks.js가 소비)
  // artY: 작품 중심 = floorY + 1.6 / 스포트라이트 = floorY + 3.35
  artworkSlots: [
    // B1 (어두운 미디어룸): 북벽 3 — 중앙이 대형 영상 featured
    { floor: 'b1', x: -6, z: -7.55, rotY: 0 },
    { floor: 'b1', x: 0, z: -7.55, rotY: 0, featured: true, size: { w: 3.6, h: 2.0 } },
    { floor: 'b1', x: 6, z: -7.55, rotY: 0 },
    // 1F: 북벽 3 (중앙 featured), 동벽 2, 서벽 1
    { floor: 'f1', x: -6, z: -7.55, rotY: 0 },
    { floor: 'f1', x: 0, z: -7.55, rotY: 0, featured: true },
    { floor: 'f1', x: 6, z: -7.55, rotY: 0 },
    { floor: 'f1', x: 10.55, z: -3, rotY: -Math.PI / 2 },
    { floor: 'f1', x: 10.55, z: 3, rotY: -Math.PI / 2 },
    { floor: 'f1', x: -10.55, z: -4, rotY: Math.PI / 2 },
    // 2F: 북벽 3, 동벽 1, 서벽 1
    { floor: 'f2', x: -6, z: -7.55, rotY: 0 },
    { floor: 'f2', x: 0, z: -7.55, rotY: 0 },
    { floor: 'f2', x: 6, z: -7.55, rotY: 0 },
    { floor: 'f2', x: 10.55, z: -3, rotY: -Math.PI / 2 },
    { floor: 'f2', x: -10.55, z: -4, rotY: Math.PI / 2 },
  ],

  // 스폰: 1F 남측 중앙, 북쪽(작품 벽)을 바라봄
  spawn: { x: 0, z: 5.5, floor: 'f1', ry: 0 },
};
export const PEER_ROOM_ID = 'artshow-museum-v1';
export const AVATAR_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e91e63','#607d8b'];
