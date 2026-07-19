// space-presets.js — 방/공간 프리셋 (심즈식 "완성된 방으로 시작") [빌더 behind-flag]
// -----------------------------------------------------------------------------
// [팀장 조건] 기존 스키마(space.js v2)·기존 PART_TYPES/FINISH만 사용 — 신규 필드 0.
// 각 프리셋은 그냥 space 문서다. 빌더가 normalizeSpace로 정규화해 로드하면 끝
// (하위호환·검증 자동). 좌표는 방 중심 원점·바닥 y=0(BUILDING/DEFAULT_SPACE 계승).
// 썸네일은 런타임 캔버스 탑다운 플랜(외부 이미지 0) — presetThumb.
// -----------------------------------------------------------------------------
import { FOOTPRINT, PART_TYPES } from './space.js';

// 북벽(z<0) 3작품 헬퍼 (world-gen.js 절차생성도 재사용 — export)
export const northArt = (z = -3.4) => ([
  { t: 'artwork', x: -3.0, z, ry: 0, frame: 'minimal', src: '' },
  { t: 'artwork', x: 0.0, z, ry: 0, frame: 'minimal', src: '', featured: true },
  { t: 'artwork', x: 3.0, z, ry: 0, frame: 'minimal', src: '' },
]);

export const SPACE_PRESETS = [
  {
    id: 'minimal-white',
    name: '미니멀 화이트',
    desc: '화이트 벽 · 파케 바닥 · 딥바이올렛 피처월',
    space: {
      version: 2,
      meta: { name: '미니멀 화이트', author: '' },
      shell: { footprint: 'medium', storyH: 'gallery', wallT: 0.2, finish: { wall: 'white', floor: 'parquet', ceiling: 'whiteflat', trim: 'brass', featureWall: 'north', featureFinish: 'deepviolet' } },
      spawn: { x: 0, z: 3.0, ry: 0 },
      parts: [
        ...northArt(),
        { t: 'pedestal', x: -1.4, z: -0.4, ry: 0 },
        { t: 'pedestal', x: 1.4, z: -0.4, ry: 0 },
        { t: 'bench', x: 0.0, z: 1.0, ry: 0, size: 1.8 },
        { t: 'rug', x: 0.0, z: 0.2, ry: 0, variant: 'rect', color: '#c9bfae' },
        { t: 'trackLight', x: -3.0, z: -3.0, ry: 0 },
        { t: 'trackLight', x: 0.0, z: -3.0, ry: 0 },
        { t: 'trackLight', x: 3.0, z: -3.0, ry: 0 },
      ],
    },
  },
  {
    id: 'kintsugi-lounge',
    name: '금계 라운지',
    desc: '웜샌드 벽 · 테라조 바닥 · 금계 피처월',
    space: {
      version: 2,
      meta: { name: '금계 라운지', author: '' },
      shell: { footprint: 'medium', storyH: 'gallery', wallT: 0.2, finish: { wall: 'warmsand', floor: 'terrazzo', ceiling: 'whiteflat', trim: 'brass', featureWall: 'north', featureFinish: 'kintsugi' } },
      spawn: { x: 0, z: 3.0, ry: 0 },
      parts: [
        ...northArt(),
        { t: 'bench', x: -1.2, z: 0.6, ry: 0, size: 1.2 },
        { t: 'bench', x: 1.2, z: 0.6, ry: 0, size: 1.2 },
        { t: 'planter', x: -3.8, z: 2.3, ry: 0 },
        { t: 'planter', x: 3.8, z: 2.3, ry: 0 },
        { t: 'rug', x: 0.0, z: 0.4, ry: 0, variant: 'round', color: '#d8c6a6' },
        { t: 'pendantLight', x: -1.5, z: -1.4, ry: 0 },
        { t: 'pendantLight', x: 1.5, z: -1.4, ry: 0 },
        { t: 'trackLight', x: -3.0, z: -3.0, ry: 0 },
        { t: 'trackLight', x: 0.0, z: -3.0, ry: 0 },
        { t: 'trackLight', x: 3.0, z: -3.0, ry: 0 },
      ],
    },
  },
  {
    id: 'garden-gallery',
    name: '정원 갤러리',
    desc: '잔디 바닥 · 화이트 벽 · 화분 정원',
    space: {
      version: 2,
      meta: { name: '정원 갤러리', author: '' },
      shell: { footprint: 'medium', storyH: 'gallery', wallT: 0.2, finish: { wall: 'white', floor: 'grass', ceiling: 'whiteflat', trim: 'brass', featureWall: 'north', featureFinish: 'deepviolet' } },
      spawn: { x: 0, z: 3.0, ry: 0 },
      parts: [
        ...northArt(),
        { t: 'planter', x: -3.6, z: 0.0, ry: 0 },
        { t: 'planter', x: 3.6, z: 0.0, ry: 0 },
        { t: 'planter', x: -2.0, z: 2.2, ry: 0 },
        { t: 'planter', x: 2.0, z: 2.2, ry: 0 },
        { t: 'pedestal', x: 0.0, z: -0.2, ry: 0 },
        { t: 'labelStand', x: 0.9, z: -0.2, ry: 0 },
        { t: 'bench', x: 0.0, z: 1.4, ry: 0, size: 1.8 },
        { t: 'trackLight', x: -3.0, z: -3.0, ry: 0 },
        { t: 'trackLight', x: 0.0, z: -3.0, ry: 0 },
        { t: 'trackLight', x: 3.0, z: -3.0, ry: 0 },
      ],
    },
  },
  {
    id: 'water-meditation',
    name: '명상 수반',
    desc: '물 바닥 · 차콜 벽 · 절제된 젠 공간',
    space: {
      version: 2,
      meta: { name: '명상 수반', author: '' },
      shell: { footprint: 'small', storyH: 'studio', wallT: 0.2, finish: { wall: 'charcoal', floor: 'water', ceiling: 'darkmatte', trim: 'charcoal', featureWall: 'north', featureFinish: 'deepviolet' } },
      spawn: { x: 0, z: 2.2, ry: 0 },
      parts: [
        { t: 'artwork', x: -1.4, z: -2.4, ry: 0, frame: 'frameless', src: '' },
        { t: 'artwork', x: 1.4, z: -2.4, ry: 0, frame: 'frameless', src: '', featured: true },
        { t: 'pedestal', x: 0.0, z: 0.0, ry: 0 },
        { t: 'trackLight', x: -1.4, z: -2.1, ry: 0 },
        { t: 'trackLight', x: 1.4, z: -2.1, ry: 0 },
      ],
    },
  },
  {
    id: 'grand-hall',
    name: '대형 전시홀',
    desc: '콘크리트 바닥 · 차콜 벽 · 기둥·파티션 대공간',
    space: {
      version: 2,
      meta: { name: '대형 전시홀', author: '' },
      shell: { footprint: 'large', storyH: 'grand', wallT: 0.2, finish: { wall: 'charcoal', floor: 'concrete', ceiling: 'darkmatte', trim: 'charcoal', featureWall: 'north', featureFinish: 'deepviolet' } },
      spawn: { x: 0, z: 4.4, ry: 0 },
      parts: [
        { t: 'artwork', x: -4.5, z: -4.7, ry: 0, frame: 'classic', src: '' },
        { t: 'artwork', x: -1.5, z: -4.7, ry: 0, frame: 'classic', src: '', featured: true },
        { t: 'artwork', x: 1.5, z: -4.7, ry: 0, frame: 'classic', src: '' },
        { t: 'artwork', x: 4.5, z: -4.7, ry: 0, frame: 'classic', src: '' },
        { t: 'pillar', x: -3.5, z: -1.0, ry: 0 },
        { t: 'pillar', x: 3.5, z: -1.0, ry: 0 },
        { t: 'partition', x: 0.0, z: -1.5, ry: 0 },
        { t: 'pedestal', x: -1.8, z: 0.6, ry: 0 },
        { t: 'pedestal', x: 1.8, z: 0.6, ry: 0 },
        { t: 'bench', x: 0.0, z: 2.4, ry: 0, size: 1.8 },
        { t: 'rug', x: 0.0, z: 0.6, ry: 0, variant: 'rect', color: '#8f8d88' },
        { t: 'trackLight', x: -4.5, z: -4.3, ry: 0 },
        { t: 'trackLight', x: -1.5, z: -4.3, ry: 0 },
        { t: 'trackLight', x: 1.5, z: -4.3, ry: 0 },
        { t: 'trackLight', x: 4.5, z: -4.3, ry: 0 },
      ],
    },
  },
];

export const PRESET_IDS = new Set(SPACE_PRESETS.map((p) => p.id));
export function getPreset(id) { return SPACE_PRESETS.find((p) => p.id === id) || null; }

// ── 탑다운 미니 플랜 썸네일 (런타임 캔버스, 외부 이미지 0) ─────────────────────
const FLOOR_COL = { parquet: '#b98a53', terrazzo: '#d8d2c6', concrete: '#8f8d88', grass: '#5b8746', water: '#22505f' };
const CAT_COL = { structure: '#9aa0aa', exhibit: '#8b72ff', ambience: '#72e6e1', event: '#f4a3ab', finish: '#cbb994' };
const FEATURE_COL = { deepviolet: '#4a4560', kintsugi: '#c39a4a', charcoal: '#3a3a40', warmsand: '#e6d8bf' };

/** space 문서 → 탑다운 플랜 dataURL(정사각 size). 비-DOM이면 null. */
export function presetThumb(space, size = 132) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const [fw, fd] = FOOTPRINT[space.shell.footprint] || [9, 7];
  x.fillStyle = '#14151a'; x.fillRect(0, 0, size, size);            // 배경
  const pad = 12, span = size - pad * 2;
  const s = span / Math.max(fw, fd);                                // 월드→픽셀 스케일(방 비율 유지)
  const rw = fw * s, rh = fd * s, ox = (size - rw) / 2, oy = (size - rh) / 2;
  const wx = (wx0) => ox + (wx0 + fw / 2) * s, wz = (wz0) => oy + (wz0 + fd / 2) * s;
  // 바닥
  x.fillStyle = FLOOR_COL[space.shell.finish.floor] || '#b98a53'; x.fillRect(ox, oy, rw, rh);
  // 벽 테두리
  x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 2; x.strokeRect(ox, oy, rw, rh);
  // 피처월(북=위쪽 변) 강조
  const fwSide = space.shell.finish.featureWall;
  if (fwSide && fwSide !== 'none') {
    x.strokeStyle = FEATURE_COL[space.shell.finish.featureFinish] || '#4a4560'; x.lineWidth = 3.5;
    x.beginPath();
    if (fwSide === 'north') { x.moveTo(ox + 3, oy + 1.5); x.lineTo(ox + rw - 3, oy + 1.5); }
    else if (fwSide === 'south') { x.moveTo(ox + 3, oy + rh - 1.5); x.lineTo(ox + rw - 3, oy + rh - 1.5); }
    else if (fwSide === 'west') { x.moveTo(ox + 1.5, oy + 3); x.lineTo(ox + 1.5, oy + rh - 3); }
    else if (fwSide === 'east') { x.moveTo(ox + rw - 1.5, oy + 3); x.lineTo(ox + rw - 1.5, oy + rh - 3); }
    x.stroke();
  }
  // 파츠 마크(카테고리 색)
  for (const p of space.parts) {
    const spec = PART_TYPES[p.t]; if (!spec) continue;
    x.fillStyle = CAT_COL[spec.cat] || '#cbb994';
    const px = wx(p.x), pz = wz(p.z), r = spec.art ? 2.6 : 2.0;
    x.beginPath(); x.arc(px, pz, r, 0, 6.2832); x.fill();
  }
  return c.toDataURL('image/png');
}
