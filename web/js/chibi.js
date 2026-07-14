// chibi.js — 자체 제작 치비(SD) 캐릭터 생성기
// OpenArtShow Metaverse — 외부 에셋 0: three.js 프리미티브 + 캔버스 얼굴 텍스처만으로
// "애니멀 크로싱 공식"(큰 머리 + 왕눈이 + 단순한 몸)을 코드로 조립한다.
//
// 설계 원칙
// - 스키닝/리타게팅 없음: 뼈 대신 피벗 Group 계층에 파츠를 강체로 붙이고,
//   걷기/숨쉬기/찰랑임은 update()에서 사인파로 직접 구동한다. GLB 리깅 계열
//   버그(스프링본 동결·문워크·손목 붕괴)가 구조적으로 발생하지 않는다.
// - 파라미터가 곧 아바타: look 객체(JSON)만 주고받으면 어디서든 동일하게 재조립
//   가능 — 멀티플레이 동기화는 'chibi:'+JSON 문자열 하나로 끝난다.
// - 전방 +Z 저작: KayKit/DCL과 동일하게 π 래퍼로 감싸 게임 관례(yaw=0 → -Z)에 맞춘다.

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from '../utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// 파라미터 정의 (UI와 공유하는 단일 진실 소스)
// ---------------------------------------------------------------------------
export const CHIBI_HAIR_STYLES = [
  { id: 'twintail', name: '트윈테일' },
  { id: 'bob', name: '단발' },
  { id: 'ponytail', name: '포니테일' },
  { id: 'buns', name: '경단머리' },
  { id: 'short', name: '숏컷' },
  { id: 'bald', name: '대머리' },
];
// 수염 — 사람 전용, 얼굴 캔버스에 그린다(3D 파츠 0). 성별 무관 자유 선택.
export const CHIBI_BEARD_STYLES = [
  { id: 'none', name: '없음' },
  { id: 'stubble', name: '까칠' },
  { id: 'mustache', name: '콧수염' },
  { id: 'goatee', name: '턱수염' },
  { id: 'full', name: '풍성' },
];
export const CHIBI_EYE_STYLES = [
  { id: 'sparkle', name: '반짝' },
  { id: 'round', name: '동글' },
  { id: 'happy', name: '스마일' },
];
export const CHIBI_MOUTH_STYLES = [
  { id: 'smile', name: '미소' },
  { id: 'cat', name: '고양이' },
  { id: 'open', name: '벌림' },
];
export const CHIBI_BOTTOM_TYPES = [
  { id: 'skirt', name: '치마' },
  { id: 'pants', name: '바지' },
  { id: 'dress', name: '원피스' },
  { id: 'overall', name: '멜빵바지' },
  { id: 'swimsuit', name: '수영복' },
];
// 상의 패턴 — 무지/줄무늬/물방울(땡땡이)/하트프린트 (torso·소매 캔버스 텍스처)
export const CHIBI_TOP_PATTERNS = [
  { id: 'plain', name: '무지' },
  { id: 'stripe', name: '줄무늬' },
  { id: 'dot', name: '땡땡이' },
  { id: 'heart', name: '하트' },
];
// 의상 세트 — 추가 파츠(칼라·넥타이·단추·교련모)가 붙는 특수 복장
export const CHIBI_OUTFITS = [
  { id: 'none', name: '기본' },
  { id: 'suit', name: '정장' },
  { id: 'gyoryeon', name: '교련복' },
];
export const CHIBI_ACCESSORIES = [
  { id: 'none', name: '없음' },
  { id: 'ribbon', name: '리본' },
  { id: 'flower', name: '꽃' },
  { id: 'horns', name: '뿔' },
];
// 색 팔레트 — 꾸미기 스와치와 랜덤 생성기가 공유하는 단일 원본(SSOT).
// (예전엔 ui.js·npc.js에 흩어져 복제됐다 → chibi.js로 통합.)
export const SKIN_TONES = ['#ffe0c8', '#ffd9bd', '#f0c8a8', '#e0b090', '#c98d66', '#a06844', '#7a4a2f'];
export const HAIR_COLORS = ['#2b2b33', '#6b4530', '#8a5a3b', '#c9a227', '#d96c2c', '#8a4be0', '#4a5568', '#d8d3ca'];
export const EYE_COLORS = ['#2b2b33', '#7a4a2f', '#3f6f8f', '#4f7a3a', '#b02e2e', '#6a4c93'];
export const CHIBI_CLOTH_COLORS = [
  // 파스텔
  '#ff8fab', '#ffb3c1', '#a9d6e8', '#bfe3ec', '#c8ecd9',
  '#95d5b2', '#ffe08a', '#ffd166', '#d9c9f5', '#b799ff',
  // 선명
  '#5468c4', '#7a9cc4', '#e0596e', '#d96c2c', '#4f7a3a',
  // 무채·정장
  '#fffdf7', '#c7ccd4', '#7d7d54', '#39414f', '#2c3038',
];
export const CHIBI_FACE_SHAPES = [
  { id: 'round', name: '동글' },
  { id: 'slim', name: '갸름' },
  { id: 'square', name: '각짐' },
  { id: 'vline', name: '브이라인' },
];
// 종족 — 사람 + 동물 7종. 사람은 헤어, 동물은 귀/코/꼬리(헤어 대체).
export const CHIBI_SPECIES = [
  { id: 'human', name: '사람' },
  { id: 'cat', name: '고양이' },
  { id: 'dog', name: '강아지' },
  { id: 'rabbit', name: '토끼' },
  { id: 'bear', name: '곰' },
  { id: 'sheep', name: '양' },
  { id: 'fox', name: '여우' },
  { id: 'panda', name: '판다' },
  { id: 'lion', name: '사자' },
  { id: 'penguin', name: '펭귄' },
  { id: 'chick', name: '병아리' },
  { id: 'frog', name: '개구리' },
  { id: 'hamster', name: '햄스터' },
  { id: 'raccoon', name: '너구리' },
  { id: 'koala', name: '코알라' },
  { id: 'pig', name: '돼지' },
  { id: 'robot', name: '로봇' },
  { id: 'ghost', name: '귀신' },
];
// 사람도 동물도 아닌 제3종족 — 동물 귀/코/꼬리·사람 헤어 분기에 진입하지 않는다.
const NONHUMAN = new Set(['robot', 'ghost']);
// 성별 — 지오메트리 분기 아님. 진입 시 기본 프리셋 선택자(이후 자유 커스터마이즈).
export const CHIBI_GENDERS = [
  { id: 'girl', name: '여아' },
  { id: 'boy', name: '남아' },
  { id: 'neutral', name: '중성' },
];
// 종족별 기본 팔레트(진입 시 프리셋으로 적용). skin=기본 털색, hairColor=포인트색(귀 안쪽·꼬리 끝 등).
export const SPECIES_PRESET = {
  cat: { skin: '#f5e6c8', hairColor: '#e8a15c' },
  dog: { skin: '#f0c869', hairColor: '#8a5a3b' },
  rabbit: { skin: '#fdfaf3', hairColor: '#ead9d6' },
  bear: { skin: '#d9a066', hairColor: '#f5e6c8' },
  sheep: { skin: '#fdfaf3', hairColor: '#f3d9cf' },
  fox: { skin: '#e8834f', hairColor: '#3a2c22' },
  panda: { skin: '#fbfaf7', hairColor: '#2a2724' },
  lion: { skin: '#e6b25e', hairColor: '#b5732e' },
  penguin: { skin: '#3b4652', hairColor: '#f4a83a' },
  chick: { skin: '#ffe066', hairColor: '#f4a83a' },
  frog: { skin: '#8fce6b', hairColor: '#5fa03f' },
  hamster: { skin: '#f0d6a8', hairColor: '#c98f5a' },
  raccoon: { skin: '#b8b2a6', hairColor: '#3a352f' },
  koala: { skin: '#aeb0b2', hairColor: '#7d7f82' },
  pig: { skin: '#f4b6c2', hairColor: '#e58ba0' },
  robot: { skin: '#aab0ba', hairColor: '#5fd0e0' }, // 본체 스틸그레이 + 사이언 LED 포인트
  ghost: { skin: '#eef6f5', hairColor: '#bfe3ec' }, // 반투명 몸체 + 옷단 트림색
};
// 성별 기본 룩 프리셋(사람). girl은 기존 DEFAULT_CHIBI와 동일 → 기존 사용자 시각 변화 0.
export const GENDER_PRESET = {
  girl: { gender: 'girl', hairStyle: 'twintail', hairColor: '#6b4530', top: '#ff8fab', bottom: '#5468c4', bottomType: 'skirt', acc: 'ribbon', eyeStyle: 'sparkle' },
  boy: { gender: 'boy', hairStyle: 'short', hairColor: '#3a2c22', top: '#7ec4cf', bottom: '#3a3f4a', bottomType: 'pants', acc: 'none', eyeStyle: 'round' },
  neutral: { gender: 'neutral', hairStyle: 'bob', hairColor: '#8a5a3b', top: '#95d5b2', bottom: '#ffd166', bottomType: 'pants', acc: 'flower', eyeStyle: 'happy' },
};
// 완성 룩 프리셋 — 고객이 골라서 바로 적용 후 세부 커스터마이즈하는 시작점.
// 종족별 의상 색 배합 (자연 배색 참고: 털 바탕 + 포인트 + 보색/대비 의상). _sp() 프리셋에 병합.
export const SPECIES_OUTFIT = {
  cat: { top: '#e0a45c', bottom: '#6b4530' },
  dog: { top: '#5c7fa6', bottom: '#a68a5c' },
  rabbit: { top: '#b7a4d1', bottom: '#f3e6d8' },
  bear: { top: '#4f7a5c', bottom: '#6b4530' },
  sheep: { top: '#8fb8d6', bottom: '#f3e6d8' },
  fox: { top: '#d97b3f', bottom: '#f3e6d8' },
  panda: { top: '#c0392b', bottom: '#39352f' },
  lion: { top: '#3a5faa', bottom: '#f3e6d8' },
  penguin: { top: '#7ec4cf', bottom: '#fbfaf7' },
  chick: { top: '#7ec4cf', bottom: '#fbfaf7' },
  frog: { top: '#ffd166', bottom: '#6b4530' },
  hamster: { top: '#8fd6b4', bottom: '#f3e6d8' },
  raccoon: { top: '#e0a45c', bottom: '#4a6fa5' },
  koala: { top: '#7fa88f', bottom: '#444548' },
  pig: { top: '#8fd6b4', bottom: '#fbead0' },
  robot: { top: '#39414f', bottom: '#2c3038' }, // 무채 패널 계열(기존 옷색 재사용)
  ghost: { top: '#eef6f5', bottom: '#dcefee' },   // 실사용 거의 없음(시트가 대체)
};
const _sp = (id, name, extra) => ({ id, name, look: Object.assign({ species: id, eyeStyle: 'happy' }, SPECIES_PRESET[id] || {}, SPECIES_OUTFIT[id] || {}, extra || {}) });
// 종족 색 변형 프리셋(같은 종 다른 개체 — 자연 배색식). id는 고유해야 하므로 별도 지정.
const _spv = (id, species, name, over) => ({ id, name, look: Object.assign({ species, eyeStyle: 'happy' }, SPECIES_PRESET[species] || {}, SPECIES_OUTFIT[species] || {}, over || {}) });
export const CHIBI_PRESETS = [
  // ── 사람 완성 룩 ──
  { id: 'girl', name: '기본 여아', look: {} },
  { id: 'boy', name: '기본 남아', look: Object.assign({}, GENDER_PRESET.boy) },
  { id: 'angel', name: '엔젤이', look: { hairStyle: 'bob', hairColor: '#6e4632', skin: '#f7e7d2', eyeStyle: 'happy', top: '#a9d6e8', bottom: '#a9d6e8', bottomType: 'dress', acc: 'none', halo: true, wings: true, heart: true } },
  { id: 'angel_pink', name: '핑크 엔젤', look: { hairStyle: 'twintail', hairColor: '#6b4530', top: '#ffb3c1', bottom: '#ffb3c1', bottomType: 'dress', halo: true, wings: true, heart: true, eyeStyle: 'happy', acc: 'none' } },
  { id: 'dots', name: '땡땡이 원피스', look: { top: '#ff8fab', pattern: 'dot', bottomType: 'dress', eyeStyle: 'happy', acc: 'ribbon' } },
  { id: 'dots_blue', name: '하늘 땡땡이', look: { top: '#a9d6e8', pattern: 'dot', bottomType: 'skirt', bottom: '#5468c4', hairStyle: 'bob', eyeStyle: 'sparkle' } },
  { id: 'heart_girl', name: '하트 소녀', look: { top: '#ff8fab', pattern: 'heart', bottomType: 'dress', acc: 'ribbon', eyeStyle: 'happy' } },
  { id: 'stripe_girl', name: '줄무늬 소녀', look: { top: '#7ec4cf', pattern: 'stripe', bottomType: 'skirt', bottom: '#3a3f4a', hairStyle: 'twintail', eyeStyle: 'sparkle' } },
  { id: 'mint_dress', name: '민트 원피스', look: { top: '#c8ecd9', bottomType: 'dress', hairStyle: 'bob', eyeStyle: 'happy', acc: 'flower' } },
  { id: 'lavender', name: '라벤더 소녀', look: { top: '#d9c9f5', bottomType: 'skirt', bottom: '#b799ff', hairStyle: 'ponytail', acc: 'flower', eyeStyle: 'happy' } },
  { id: 'sunny', name: '햇살 소녀', look: { top: '#ffd166', bottomType: 'skirt', bottom: '#ff8fab', hairStyle: 'buns', acc: 'ribbon', eyeStyle: 'sparkle' } },
  { id: 'suit', name: '정장', look: { gender: 'boy', hairStyle: 'short', hairColor: '#2a2320', top: '#39414f', bottom: '#2c3038', bottomType: 'pants', outfit: 'suit', acc: 'none', eyeStyle: 'round' } },
  { id: 'gyoryeon', name: '교련복', look: { gender: 'boy', hairStyle: 'short', hairColor: '#2a2320', top: '#7d7d54', bottom: '#6b6b47', bottomType: 'pants', outfit: 'gyoryeon', acc: 'none', eyeStyle: 'round' } },
  { id: 'overall_boy', name: '멜빵 소년', look: { gender: 'boy', hairStyle: 'short', top: '#ffe08a', bottom: '#7a9cc4', bottomType: 'overall', acc: 'none', eyeStyle: 'round' } },
  { id: 'glasses', name: '안경 소녀', look: { glasses: true, eyeStyle: 'round', top: '#c8ecd9', bottomType: 'skirt' } },
  { id: 'glasses_boy', name: '안경 소년', look: { gender: 'boy', hairStyle: 'short', top: '#5468c4', bottom: '#2c3038', bottomType: 'pants', glasses: true, eyeStyle: 'round', acc: 'none' } },
  // ── 동물 (기본) ──
  _sp('cat', '고양이'), _sp('dog', '강아지', { mouth: 'open' }), _sp('rabbit', '토끼', { eyeStyle: 'sparkle' }),
  _sp('bear', '곰'), _sp('sheep', '양'), _sp('panda', '판다'),
  _sp('fox', '여우', { mouth: 'cat' }), _sp('lion', '사자'), _sp('penguin', '펭귄'),
  _sp('chick', '병아리'), _sp('frog', '개구리', { mouth: 'open' }), _sp('hamster', '햄스터', { eyeStyle: 'sparkle' }),
  _sp('raccoon', '너구리', { eyeStyle: 'round' }), _sp('koala', '코알라'), _sp('pig', '돼지'),
  // ── 제3종족 ──
  _sp('robot', '로봇', { bottomType: 'pants', shoes: '#2c3038', hairStyle: 'bald', mouth: 'smile' }),
  _sp('ghost', '귀신', { mouth: 'open', hairStyle: 'bald' }),
  // ── 동물 색 변형(같은 종 다른 개체) ──
  _spv('cat_black', 'cat', '검은 고양이', { skin: '#3a352f', hairColor: '#f5e6c8', eyeStyle: 'round' }),
  _spv('cat_grey', 'cat', '회색 고양이', { skin: '#c9c3ba', hairColor: '#8a8078' }),
  _spv('cat_calico', 'cat', '삼색 고양이', { skin: '#f0ddc0', hairColor: '#c96b3b', mouth: 'cat' }),
  _spv('dog_cream', 'dog', '크림 강아지', { skin: '#f5ede0', hairColor: '#6b4530', mouth: 'open' }),
  _spv('dog_choco', 'dog', '초코 강아지', { skin: '#a06a44', hairColor: '#5a3a26' }),
  _spv('bear_black', 'bear', '흑곰', { skin: '#4a3a2c', hairColor: '#c9a876' }),
  _spv('bear_polar', 'bear', '백곰', { skin: '#f2efe8', hairColor: '#d8d0c4' }),
  _spv('rabbit_brown', 'rabbit', '갈색 토끼', { skin: '#d9b48c', hairColor: '#8a5a3b', eyeStyle: 'sparkle' }),
  _spv('rabbit_grey', 'rabbit', '회색 토끼', { skin: '#cfc9c0', hairColor: '#9a9088' }),
  _spv('fox_arctic', 'fox', '흰 여우', { skin: '#eef0f2', hairColor: '#c8ccd0', mouth: 'cat' }),
  _spv('hamster_grey', 'hamster', '회색 햄스터', { skin: '#cfc7bb', hairColor: '#9a9088' }),
  _spv('pig_choco', 'pig', '초코 돼지', { skin: '#c98f8f', hairColor: '#b06a6a' }),
];
// 두상 변형 정의 — 스케일(x,y,z 배수) + 턱 테이퍼 + 턱 플랫(각진 턱)
// 감독 지시: 뚱뚱하게 만들지 않는다 — 전 형태 은은한 변형만, 살찌는 확대 금지.
const FACE_SHAPE_DEF = {
  round: { sx: 1, sy: 1, sz: 1, taper: 0, flat: 0 },
  slim: { sx: 0.95, sy: 1.05, sz: 0.98, taper: 0.05, flat: 0 },
  square: { sx: 1.03, sy: 0.97, sz: 1.0, taper: 0, flat: 0.5 },
  vline: { sx: 0.97, sy: 1.03, sz: 0.98, taper: 0.3, flat: 0 },
};
// 종족별 기본 두상 — "얼굴이 다 동그라미가 아니어도" (다양한 마스코트 두상 참고). 사용자가 고르는
// FACE_SHAPE_DEF는 이 위에 미세 보정으로 얹힌다. human은 기존 하드코딩값(1/0.95/0.97)과
// 동일 → 기존 사용자 시각 변화 0.
const SPECIES_HEAD_BASE = {
  human: { sx: 1.0, sy: 0.95, sz: 0.97, taper: 0, flat: 0 },
  cat: { sx: 1.0, sy: 0.97, sz: 0.96, taper: 0.14, flat: 0 },
  dog: { sx: 1.02, sy: 0.94, sz: 1.05, taper: 0.08, flat: 0.12 },
  rabbit: { sx: 0.95, sy: 1.07, sz: 0.98, taper: 0.1, flat: 0 },
  bear: { sx: 1.06, sy: 0.96, sz: 1.02, taper: 0, flat: 0.22 },
  sheep: { sx: 1.0, sy: 0.97, sz: 0.95, taper: 0, flat: 0.18 },
  fox: { sx: 0.96, sy: 1.0, sz: 1.04, taper: 0.22, flat: 0 },
  panda: { sx: 1.05, sy: 0.98, sz: 0.99, taper: 0, flat: 0.1 },
  lion: { sx: 1.06, sy: 0.94, sz: 1.0, taper: 0, flat: 0.32 },
  penguin: { sx: 0.95, sy: 1.06, sz: 0.96, taper: 0.05, flat: 0 },
  chick: { sx: 1.0, sy: 1.02, sz: 0.98, taper: 0, flat: 0 },
  frog: { sx: 1.1, sy: 0.85, sz: 0.93, taper: 0, flat: 0.4 },
  hamster: { sx: 1.04, sy: 0.97, sz: 1.0, taper: 0, flat: 0.14 },
  raccoon: { sx: 0.98, sy: 0.99, sz: 1.03, taper: 0.14, flat: 0 },
  koala: { sx: 1.07, sy: 0.97, sz: 0.97, taper: 0, flat: 0.1 },
  pig: { sx: 1.03, sy: 0.96, sz: 1.0, taper: 0, flat: 0.28 },
  robot: { sx: 1.05, sy: 0.97, sz: 1.0, taper: 0, flat: 0.45 }, // 각진 금속 두상
  ghost: { sx: 0.97, sy: 1.05, sz: 0.97, taper: 0, flat: 0 },   // 매끈한 타원(턱선 없음)
};

export const DEFAULT_CHIBI = {
  species: 'human',
  gender: 'girl',
  skin: '#ffd9bd',
  hairStyle: 'twintail',
  hairColor: '#6b4530',
  eyeStyle: 'sparkle',
  eyeColor: '#7a4a2f',
  mouth: 'smile',
  beardStyle: 'none',
  face: 'round',
  blush: true,
  top: '#ff8fab',
  pattern: 'plain',
  outfit: 'none',
  bottom: '#5468c4',
  bottomType: 'skirt',
  shoes: '#fffdf7',
  acc: 'ribbon',
  halo: false,
  wings: false,
  heart: false,
  glasses: false,
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ID_OF = (list) => new Set(list.map((x) => x.id));
const HAIR_IDS = ID_OF(CHIBI_HAIR_STYLES);
const FACE_IDS = ID_OF(CHIBI_FACE_SHAPES);
const EYE_IDS = ID_OF(CHIBI_EYE_STYLES);
const MOUTH_IDS = ID_OF(CHIBI_MOUTH_STYLES);
const BEARD_IDS = ID_OF(CHIBI_BEARD_STYLES);
const BOTTOM_IDS = ID_OF(CHIBI_BOTTOM_TYPES);
const PATTERN_IDS = ID_OF(CHIBI_TOP_PATTERNS);
const OUTFIT_IDS = ID_OF(CHIBI_OUTFITS);
const ACC_IDS = ID_OF(CHIBI_ACCESSORIES);
const SPECIES_IDS = ID_OF(CHIBI_SPECIES);
const GENDER_IDS = ID_OF(CHIBI_GENDERS);

/** 임의 입력을 안전한 치비 파라미터로 정규화한다. */
export function normalizeChibi(p) {
  const src = p && typeof p === 'object' ? p : {};
  const hex = (v, d) => (typeof v === 'string' && HEX_RE.test(v) ? v : d);
  const pick = (v, ids, d) => (typeof v === 'string' && ids.has(v) ? v : d);
  return {
    species: pick(src.species, SPECIES_IDS, DEFAULT_CHIBI.species),
    gender: pick(src.gender, GENDER_IDS, DEFAULT_CHIBI.gender),
    skin: hex(src.skin, DEFAULT_CHIBI.skin),
    hairStyle: pick(src.hairStyle, HAIR_IDS, DEFAULT_CHIBI.hairStyle),
    hairColor: hex(src.hairColor, DEFAULT_CHIBI.hairColor),
    eyeStyle: pick(src.eyeStyle, EYE_IDS, DEFAULT_CHIBI.eyeStyle),
    eyeColor: hex(src.eyeColor, DEFAULT_CHIBI.eyeColor),
    mouth: pick(src.mouth, MOUTH_IDS, DEFAULT_CHIBI.mouth),
    beardStyle: pick(src.beardStyle, BEARD_IDS, DEFAULT_CHIBI.beardStyle),
    face: pick(src.face === 'chubby' ? 'square' : src.face, FACE_IDS, DEFAULT_CHIBI.face),
    blush: src.blush !== false,
    top: hex(src.top, DEFAULT_CHIBI.top),
    pattern: pick(src.pattern, PATTERN_IDS, DEFAULT_CHIBI.pattern),
    outfit: pick(src.outfit, OUTFIT_IDS, DEFAULT_CHIBI.outfit),
    bottom: hex(src.bottom, DEFAULT_CHIBI.bottom),
    bottomType: pick(src.bottomType, BOTTOM_IDS, DEFAULT_CHIBI.bottomType),
    shoes: hex(src.shoes, DEFAULT_CHIBI.shoes),
    acc: pick(src.acc, ACC_IDS, DEFAULT_CHIBI.acc),
    halo: src.halo === true,
    wings: src.wings === true,
    heart: src.heart === true,
    glasses: src.glasses === true,
  };
}

export const CHIBI_CHAR_PREFIX = 'chibi:';

export function encodeChibi(p) {
  return CHIBI_CHAR_PREFIX + JSON.stringify(normalizeChibi(p));
}

/** 'chibi:'+JSON 문자열 → 파라미터 객체 (실패 시 null) */
export function decodeChibi(charId) {
  if (typeof charId !== 'string' || !charId.startsWith(CHIBI_CHAR_PREFIX)) return null;
  try {
    return normalizeChibi(JSON.parse(charId.slice(CHIBI_CHAR_PREFIX.length)));
  } catch {
    return null;
  }
}

const _pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * 랜덤 아야모 룩 — "다양한 아야모 만드는 법"의 단일 원본(SSOT).
 * AI 관객(npc.js) 등 아야모가 필요한 모든 곳이 이 함수를 가져다 쓴다. 종족·프리셋·
 * 팔레트가 늘어나면 여기 한 곳만 바뀌고 모든 소비자가 자동으로 새 아야모를 반영한다.
 * @param {{ presetBias?: number, noPreset?: boolean }} [opts]
 *   presetBias: 큐레이트 프리셋(동물 포함)에서 뽑을 확률(기본 0.66). 나머지는 랜덤 종족.
 *   noPreset: true면 항상 랜덤 종족 조합.
 * @returns {object} normalizeChibi를 통과한 look 파라미터
 */
export function randomChibiLook(opts = {}) {
  const presetBias = typeof opts.presetBias === 'number' ? opts.presetBias : 0.66;
  if (!opts.noPreset && CHIBI_PRESETS.length && Math.random() < presetBias) {
    return normalizeChibi(Object.assign({}, _pick(CHIBI_PRESETS).look));
  }
  const species = _pick(CHIBI_SPECIES).id;
  // 동물이면 종족 팔레트(털색·포인트색)+기본 배색을 얹어 사람 피부색이 남지 않게 한다.
  const speciesBase = species === 'human'
    ? {}
    : Object.assign({}, SPECIES_PRESET[species] || {}, SPECIES_OUTFIT[species] || {});
  return normalizeChibi(Object.assign({
    skin: _pick(SKIN_TONES),
    hairStyle: _pick(CHIBI_HAIR_STYLES).id,
    hairColor: _pick(HAIR_COLORS),
    eyeStyle: _pick(CHIBI_EYE_STYLES).id,
    eyeColor: _pick(EYE_COLORS),
    mouth: _pick(CHIBI_MOUTH_STYLES).id,
    beardStyle: Math.random() < 0.15 ? _pick(CHIBI_BEARD_STYLES).id : 'none', // 대부분 무수염
    blush: Math.random() < 0.75,
    top: _pick(CHIBI_CLOTH_COLORS),
    bottom: _pick(CHIBI_CLOTH_COLORS),
    bottomType: _pick(CHIBI_BOTTOM_TYPES).id,
    shoes: _pick(CHIBI_CLOTH_COLORS),
    acc: _pick(CHIBI_ACCESSORIES).id,
  }, { species }, speciesBase));
}

/** 랜덤 아야모를 'chibi:'+JSON 문자열로 — randomChibiLook은 이미 정규화된 룩을
 *  돌려주므로 여기서 재정규화(encodeChibi)하지 않고 바로 직렬화한다(이중 정규화 방지). */
export function randomChibiChar(opts) {
  return CHIBI_CHAR_PREFIX + JSON.stringify(randomChibiLook(opts));
}

// ---------------------------------------------------------------------------
// 얼굴 캔버스 — 귀여움의 8할. 512² 투명 캔버스에 왕눈이/입/볼터치를 그려
// 머리 구의 전면 캡에 매핑한다.
// ---------------------------------------------------------------------------
function shade(hexColor, factor) {
  const c = new THREE.Color(hexColor);
  c.multiplyScalar(factor);
  return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
}
// 수염색 — 머리색을 어둡게. 피부색과 대비가 약하면 더 어둡게(가독 세이프가드).
function shadeAlpha(hexColor, factor, alpha) {
  const c = new THREE.Color(hexColor);
  c.multiplyScalar(factor);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
}
function beardColor(p, alpha) {
  let factor = 0.6;
  const hc = new THREE.Color(p.hairColor);
  const sk = new THREE.Color(p.skin);
  const lumHC = 0.2126 * hc.r + 0.7152 * hc.g + 0.0722 * hc.b;
  const lumSK = 0.2126 * sk.r + 0.7152 * sk.g + 0.0722 * sk.b;
  if (Math.abs(lumHC * factor - lumSK) < 0.15) factor = 0.4; // 피부와 대비 부족 시 더 어둡게
  return shadeAlpha(p.hairColor, factor, alpha);
}
// 수염 (사람 전용, 얼굴 캔버스). ouch(피격) 시엔 입이 크게 벌어지므로 호출부에서 끈다.
function drawBeard(ctx, p) {
  if (p.species !== 'human' || !p.beardStyle || p.beardStyle === 'none') return;
  // 하관을 감싸는 연속 수염 — 좌 구레나룻→턱→우 구레나룻(한 덩어리), 윗선은 입 아래로
  // 처져 입을 비운다. 분리된 볼 얼룩이 아니라 "수염"으로 3초 안에 읽히게.
  const drawJawBeard = (alpha) => {
    ctx.fillStyle = beardColor(p, alpha);
    ctx.beginPath();
    ctx.moveTo(256 - 156, 322);
    ctx.quadraticCurveTo(256 - 168, 420, 256 - 78, 462);
    ctx.quadraticCurveTo(256, 480, 256 + 78, 462);
    ctx.quadraticCurveTo(256 + 168, 420, 256 + 156, 322);
    ctx.quadraticCurveTo(256 + 120, 348, 256 + 52, 392); // 윗 경계(입 비우는 아치)
    ctx.quadraticCurveTo(256 + 26, 384, 256, 388);
    ctx.quadraticCurveTo(256 - 26, 384, 256 - 52, 392);
    ctx.quadraticCurveTo(256 - 120, 348, 256 - 156, 322);
    ctx.closePath();
    ctx.fill();
  };
  // 턱수염(goatee) — 소울패치(입 아래)에서 턱까지 좁게 연결된 한 덩어리.
  const drawGoatee = (alpha) => {
    ctx.fillStyle = beardColor(p, alpha);
    ctx.beginPath();
    ctx.moveTo(256 - 34, 392);
    ctx.quadraticCurveTo(256 - 48, 444, 256, 470);
    ctx.quadraticCurveTo(256 + 48, 444, 256 + 34, 392);
    ctx.quadraticCurveTo(256, 404, 256 - 34, 392);
    ctx.closePath();
    ctx.fill();
  };
  const drawMustache = () => {
    ctx.strokeStyle = beardColor(p, 0.92);
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(256 - 34, 344);
    ctx.quadraticCurveTo(256 - 14, 332, 256, 338);
    ctx.quadraticCurveTo(256 + 14, 332, 256 + 34, 344);
    ctx.stroke();
  };
  if (p.beardStyle === 'stubble') {
    ctx.fillStyle = beardColor(p, 0.32);
    for (let row = 0; row < 6; row++) {
      const t = row / 5;
      const y = 392 + t * (448 - 392);
      const halfW = 132 * (1 - t) + 46 * t; // 볼폭132→턱폭46 테이퍼
      const n = 10 - row;
      for (let i = 0; i < n; i++) {
        const jitter = ((i * 7 + row * 13) % 5) - 2;
        const x = 256 - halfW + (2 * halfW) * (n === 1 ? 0.5 : i / (n - 1)) + jitter;
        ctx.beginPath();
        ctx.arc(x, y + jitter * 0.6, 2 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (p.beardStyle === 'mustache') {
    drawMustache();
  } else if (p.beardStyle === 'goatee') {
    drawGoatee(0.85);
    drawMustache();
  } else if (p.beardStyle === 'full') {
    drawJawBeard(0.85);
    drawMustache();
  }
}

// 4쪽 별 반짝임 — 왕눈이 초롱초롱 트윈클
function drawSparkle(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.28, y - r * 0.28);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.28, y + r * 0.28);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.28, y + r * 0.28);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.28, y - r * 0.28);
  ctx.closePath();
  ctx.fill();
}

function drawEye(ctx, cx, cy, p) {
  const EW = 44, EH = 64; // 반지름 (가로/세로) — 대두 리튠에 맞춰 왕눈이 확대
  if (p.eyeStyle === 'happy') {
    // 감은 웃는 눈 (∩) — 엔젤이식, 더 두껍고 둥글게
    ctx.strokeStyle = '#2a2320';
    ctx.lineCap = 'round';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(cx, cy + 26, EW + 6, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    return;
  }
  // 흰자 — 살짝만 (없으면 스티커 같고, 크면 무서움)
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, EW + 7, EH + 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 홍채 — 위가 밝고 아래로 갈수록 짙은 세로 그라디언트
  const grad = ctx.createLinearGradient(cx, cy - EH, cx, cy + EH);
  grad.addColorStop(0, shade(p.eyeColor, 1.25));
  grad.addColorStop(0.55, p.eyeColor);
  grad.addColorStop(1, shade(p.eyeColor, 0.45));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, EW, EH, 0, 0, Math.PI * 2);
  ctx.fill();
  // 동공
  ctx.fillStyle = 'rgba(25,18,14,0.9)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, EW * 0.42, EH * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  // 하이라이트 — 큰 것 좌상 + 작은 것 우하 (생기의 핵심)
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy - 22, 15, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 13, cy + 20, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // 반짝 스타일 — 4쪽 별 트윈클 추가 (초롱초롱)
  if (p.eyeStyle === 'sparkle') drawSparkle(ctx, cx + 21, cy - 34, 7);
  // 윗눈꺼풀 라인 (속눈썹 느낌)
  ctx.strokeStyle = '#2a2320';
  ctx.lineCap = 'round';
  ctx.lineWidth = p.eyeStyle === 'round' ? 9 : 14;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, EW + 9, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

// 동물 코/부리/주둥이 + 수염 — 3D 귀/꼬리와 함께 종족 정체성을 캔버스에서 보강.
function drawAnimalFace(ctx, species, MY) {
  const NY = 302; // 코 y (눈과 입 사이)

  // 부리(병아리·펭귄)·돼지 주둥이는 이제 3D 파츠라 캔버스에선 그리지 않음(겹침 방지).
  if (species === 'chick' || species === 'penguin' || species === 'pig') return;

  // 3D 코끝/주둥이가 붙는 종은 캔버스 코·인중 생략(고양이·코알라도 3D 코로 승격 — 감독 지적).
  const NOSE_3D = species === 'dog' || species === 'fox' || species === 'bear'
    || species === 'raccoon' || species === 'panda' || species === 'rabbit'
    || species === 'cat' || species === 'koala';
  if (!NOSE_3D) {
    const bigNose = species === 'koala';
    const pinkNose = species === 'cat' || species === 'hamster';
    const noseCol = pinkNose ? '#e88ba0' : '#2a2724';
    const nk = bigNose ? 2.0 : 1;
    ctx.fillStyle = noseCol;
    ctx.beginPath();
    ctx.moveTo(256 - 15 * nk, NY - 8 * nk);
    ctx.quadraticCurveTo(256 - 17 * nk, NY + 6 * nk, 256, NY + 15 * nk);
    ctx.quadraticCurveTo(256 + 17 * nk, NY + 6 * nk, 256 + 15 * nk, NY - 8 * nk);
    ctx.quadraticCurveTo(256, NY - 13 * nk, 256 - 15 * nk, NY - 8 * nk);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,58,48,0.5)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(256, NY + 14);
    ctx.lineTo(256, MY - 18);
    ctx.stroke();
  }
  // 호랑이 이마·볼 줄무늬 (몸 털 줄무늬 텍스처와 함께 확실한 호랑이 인상)
  if (species === 'tiger') {
    ctx.strokeStyle = 'rgba(38,26,18,0.85)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 10;
    for (const [x, y1, y2] of [[256 - 44, 148, 196], [256 + 44, 148, 196], [256 - 88, 166, 206], [256 + 88, 166, 206]]) {
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
    }
    ctx.lineWidth = 8;
    for (const s of [-1, 1]) for (const dy of [0, 26]) {
      ctx.beginPath();
      ctx.moveTo(256 + s * 128, 300 + dy);
      ctx.lineTo(256 + s * 172, 296 + dy);
      ctx.stroke();
    }
  }
  // 수염 — 고양이·여우·호랑이
  if (species === 'cat' || species === 'fox' || species === 'tiger') {
    ctx.strokeStyle = 'rgba(70,58,48,0.45)';
    ctx.lineWidth = 4;
    for (const s of [-1, 1]) {
      for (const [dy, len, curve] of [[-10, 96, -14], [4, 104, 0], [18, 96, 14]]) {
        ctx.beginPath();
        ctx.moveTo(256 + s * 30, NY + dy);
        ctx.quadraticCurveTo(256 + s * (30 + len * 0.5), NY + dy + curve * 0.3, 256 + s * (30 + len), NY + dy + curve);
        ctx.stroke();
      }
    }
  }
  // 토끼 앞니 — 입 아래 흰 사각
  if (species === 'rabbit') {
    ctx.fillStyle = '#fffdf7';
    ctx.strokeStyle = 'rgba(70,58,48,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(256 - 13, MY + 2, 26, 22, 5) : ctx.rect(256 - 13, MY + 2, 26, 22);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(256, MY + 2);
    ctx.lineTo(256, MY + 24);
    ctx.stroke();
  }
}

// 라운드 사각 헬퍼 (roundRect 미지원 시 rect 폴백)
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}
// 로봇 눈 — 각진 렌즈(소켓+발광 렌즈+스캔라인+하이라이트). 사이언 hairColor 포인트.
function drawRobotEyes(ctx, p) {
  const EYE_Y = 252, EYE_X = 84;
  for (const s of [-1, 1]) {
    const cx = 256 + s * EYE_X, cy = EYE_Y;
    ctx.fillStyle = shade(p.skin, 0.45);
    rrect(ctx, cx - 38, cy - 46, 76, 92, 16); ctx.fill();
    const g = ctx.createLinearGradient(cx, cy - 38, cx, cy + 38);
    g.addColorStop(0, shade(p.hairColor, 1.3));
    g.addColorStop(1, vivid(p.hairColor).getStyle());
    ctx.fillStyle = g;
    rrect(ctx, cx - 30, cy - 38, 60, 76, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 26, cy); ctx.lineTo(cx + 26, cy); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.ellipse(cx - 12, cy - 20, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
  }
}
// 로봇 입 — 스피커 그릴(가로 슬릿 3줄)
function drawRobotMouth(ctx, p) {
  const MY = 364;
  ctx.fillStyle = shade(p.skin, 0.4);
  for (const y of [MY - 14, MY, MY + 14]) { rrect(ctx, 256 - 26, y - 4, 52, 8, 4); ctx.fill(); }
}
// 귀신 눈 — 흰자 없는 큰 단색 동글눈 + 하이라이트
function drawGhostEyes(ctx) {
  const EYE_Y = 252, EYE_X = 84;
  for (const s of [-1, 1]) {
    const cx = 256 + s * EYE_X;
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath(); ctx.ellipse(cx, EYE_Y, 34, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.ellipse(cx - 10, EYE_Y - 14, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * 얼굴을 캔버스에 그린다. fx로 아픔/상처 상태를 표현한다:
 *   fx.ouch  — 맞은 직후 >_< 표정 (눈·입 오버라이드)
 *   fx.wound — 누적 상처 0~3 (1: 반창고, 2: +멍/처진 눈썹, 3: +눈물)
 */
function drawFaceInto(canvas, p, fx) {
  const wound = (fx && fx.wound) || 0;
  const ouch = !!(fx && fx.ouch);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  const EYE_Y = 252;
  const EYE_X = 84; // 눈 간격 — 살짝 좁혀 유아형 인상 (대두 리튠)
  const isAnimal = p.species && p.species !== 'human' && !NONHUMAN.has(p.species);

  // 호랑이 — 몸통 줄무늬 텍스처가 얼굴 정면까지 번지지 않게, 얼굴 중앙을 깔끔한 주황으로
  // 채운다(가장자리는 투명 → 옆머리 줄무늬가 자연스레 이어짐). 그 위에 이마·볼 줄무늬만.
  if (p.species === 'tiger' && !ouch) {
    const oc = vivid(p.skin).getStyle();
    const g = ctx.createRadialGradient(256, 300, 70, 256, 300, 250);
    g.addColorStop(0, oc);
    g.addColorStop(0.68, oc);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
  }

  // 종족 얼굴 배경 (눈보다 먼저) — 판다 눈패치 / 너구리 밴딧 마스크 / 펭귄 흰 얼굴
  if (!ouch) {
    if (p.species === 'panda') {
      ctx.fillStyle = '#2a2724';
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(256 + s * EYE_X, EYE_Y + 4);
        ctx.rotate(s * 0.32);
        ctx.beginPath();
        ctx.ellipse(0, 0, 58, 72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (p.species === 'raccoon') {
      // 밴딧 마스크 — 눈마다 짙은 패치(콧대는 밝게 비움) + 이마 쪽 살짝 위로
      ctx.fillStyle = '#43392f';
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(256 + s * (EYE_X + 6), EYE_Y);
        ctx.rotate(s * 0.28);
        ctx.beginPath();
        ctx.ellipse(0, 0, 50, 60, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (p.species === 'penguin') {
      // 흰 얼굴 판 — 어두운 머리색(후드) 위에 크게 크림 얼굴을 얹어 "펭귄"으로 확실히
      // 읽히게(감독 보고: 검은 덩어리로 보임). 이마~턱을 넉넉히 덮는다.
      ctx.fillStyle = '#fbfaf7';
      ctx.beginPath();
      ctx.ellipse(256, EYE_Y + 44, 188, 210, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 개구리는 눈이 3D 돌출(머리 위)이라 캔버스 눈을 생략
  const canvasEyes = p.species !== 'frog';
  // ouch >_< 도 캔버스 눈을 쓰는 종만 — 3D 눈(개구리)은 눈 메쉬가 따로 찡긋하므로
  // 여기서 또 그리면 눈이 4개가 된다(감독 지적 버그). canvasEyes로 게이트한다.
  if (ouch && canvasEyes) {
    // >_< 눈 — 아픔의 만국 공통어
    ctx.strokeStyle = '#2a2320';
    ctx.lineCap = 'round';
    ctx.lineWidth = 15;
    for (const s of [-1, 1]) {
      const cx = 256 + s * EYE_X;
      ctx.beginPath();
      ctx.moveTo(cx - s * 34, EYE_Y - 30);
      ctx.lineTo(cx + s * 24, EYE_Y + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 34, EYE_Y + 34);
      ctx.lineTo(cx + s * 24, EYE_Y + 2);
      ctx.stroke();
    }
  } else if (canvasEyes) {
    if (p.species === 'robot') drawRobotEyes(ctx, p);
    else if (p.species === 'ghost') drawGhostEyes(ctx);
    else {
      drawEye(ctx, 256 - EYE_X, EYE_Y, p);
      drawEye(ctx, 256 + EYE_X, EYE_Y, p);
    }
  }

  // 눈썹 — 평소 아치, 상처 2+ 는 팔자(슬픔), 아픔 순간은 안쪽으로 찌푸림.
  // 동물은 원색 눈썹이 어색해 털색(skin) 기준 은은하게, 판다·개구리는 생략.
  if (canvasEyes && !NONHUMAN.has(p.species) && !(p.species === 'panda' && !ouch && !(wound >= 2))) {
    ctx.strokeStyle = isAnimal ? shade(p.skin, 0.55) : shade(p.hairColor, 0.8);
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (ouch) {
        ctx.moveTo(256 + s * 58, EYE_Y - 92);
        ctx.lineTo(256 + s * 112, EYE_Y - 72);
      } else if (wound >= 2) {
        ctx.moveTo(256 + s * 60, EYE_Y - 74);
        ctx.lineTo(256 + s * 112, EYE_Y - 94);
      } else {
        ctx.arc(256 + s * EYE_X, EYE_Y - 58, 36, Math.PI * 1.25, Math.PI * 1.75);
      }
      ctx.stroke();
    }
  }

  // 입 — 대두 리튠에 맞춰 작게(귀여움), 살짝 위로
  const MY = 364;
  ctx.strokeStyle = '#b0605a';
  ctx.lineCap = 'round';
  if (!ouch && p.species === 'robot') {
    drawRobotMouth(ctx, p); // 스피커 그릴
  } else if (ouch) {
    // 크게 벌린 울상
    ctx.fillStyle = '#a14a44';
    ctx.beginPath();
    ctx.ellipse(256, MY, 34, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e58a80';
    ctx.beginPath();
    ctx.ellipse(256, MY + 12, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.mouth === 'cat') {
    ctx.lineWidth = 8;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(256 + s * 12, MY - 6, 13, s === -1 ? 0.15 * Math.PI : 0.35 * Math.PI, s === -1 ? 0.65 * Math.PI : 0.85 * Math.PI);
      ctx.stroke();
    }
  } else if (p.mouth === 'open') {
    ctx.fillStyle = '#a14a44';
    ctx.beginPath();
    ctx.ellipse(256, MY, 19, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e58a80';
    ctx.beginPath();
    ctx.ellipse(256, MY + 7, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, MY - 10, 20, 0.22 * Math.PI, 0.78 * Math.PI);
    ctx.stroke();
  }

  // 동물 코·수염 (사람 아님). 코는 눈과 입 사이, 3D 귀·꼬리와 함께 종족을 읽게 한다.
  if (isAnimal && !ouch) drawAnimalFace(ctx, p.species, MY);

  // 사람 수염 (얼굴 캔버스). 피격 시 입이 크게 벌어지므로 그리지 않는다.
  if (!ouch) drawBeard(ctx, p);

  // 볼터치 — 더 크고 진하게(엔젤이식), 눈 아래 밀착. 로봇은 홍조 어색해서 제외.
  if (p.blush && !ouch && p.species !== 'robot') {
    ctx.fillStyle = 'rgba(255,120,120,0.5)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(256 + s * 150, 338, 46, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 상처 1+: 오른쪽 볼 반창고
  if (wound >= 1) {
    ctx.save();
    ctx.translate(256 + 152, 326);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#e8c9a0';
    ctx.fillRect(-40, -13, 80, 26);
    ctx.fillStyle = '#d9b88d';
    ctx.fillRect(-15, -13, 30, 26);
    ctx.restore();
  }
  // 상처 2+: 왼쪽 볼 멍
  if (wound >= 2) {
    ctx.fillStyle = 'rgba(110,90,200,0.45)';
    ctx.beginPath();
    ctx.ellipse(256 - 152, 320, 32, 21, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // 상처 3: 그렁그렁 눈물
  if (wound >= 3 && !ouch) {
    ctx.fillStyle = 'rgba(130,185,255,0.85)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(256 + s * 88, EYE_Y + 80, 10, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFaceCanvas(p) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  drawFaceInto(canvas, p, null);
  return canvas;
}

// ---------------------------------------------------------------------------
// 파츠 빌더
// ---------------------------------------------------------------------------
// 플랫 셀셰이딩 램프 — 레퍼런스(엔젤이)식 "단색 채움 + 그림자 1겹" 룩.
// 2톤(그림자/본색) hard step: 3D 그라디언트를 없애 스티커 일러스트처럼 평면화한다.
// 모듈 1회 생성·공유(개체별 dispose 대상 아님).
let _toonRamp = null;
function toonRamp() {
  if (_toonRamp) return _toonRamp;
  // 스티커 인쇄물처럼 거의 평면 — 그림자를 아주 얕게(0.9)만 남겨 형태 힌트만.
  const data = new Uint8Array([230, 255]); // 2스텝(RedFormat): 그림자 0.9 / 본색 1.0
  const tex = new THREE.DataTexture(data, 2, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  _toonRamp = tex;
  return tex;
}
// 채도 부스트 — 스티커 톤 유지하며 색만 또렷하게. HSL의 S만 올려 흰/회색(저채도)은
// 거의 그대로, 유채색만 선명해진다(감독: "채도 더 올려"). L·H는 보존.
const SAT_BOOST = 1.5;
function vivid(color, mul) {
  const c = new THREE.Color(color);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * (mul || SAT_BOOST)), hsl.l);
  return c;
}
function toon(color, doubleSide) {
  // 회전체(치마/꽁지머리)와 열린 구 세그먼트(뒷머리 커튼)는 프로파일 방향에 따라
  // 법선이 안쪽을 향할 수 있어 DoubleSide가 필수다 — 앞면 컬링으로 "안 보이는
  // 치마" 버그가 났던 실측 교훈.
  return new THREE.MeshToonMaterial({
    color: vivid(color),
    gradientMap: toonRamp(),
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
}

/**
 * 외곽선 — 법선 방향으로 "고정 두께"만큼 밀어낸 백페이스 셸. 스케일 배수 방식과 달리
 * 파츠 크기와 무관하게 일정한 선 두께를 만들어(스티커 일러스트식 균일 외곽선), 큰 파츠와
 * 작은 파츠의 외곽선이 같은 굵기로 보인다. thickness는 월드 단위(≈0.012 = 굵은 만화 선).
 */
function addOutline(mesh, thickness, matCollect, geoCollect) {
  let g = mesh.geometry.clone();
  // 하드에지 저폴리(고깔 등)에서 면법선이 갈라지면 오프셋 셸이 뾰족뾰족 찢어진다.
  // 위치 기준으로 정점을 용접(법선/uv 제거 후 mergeVertices)하고 부드러운 법선을
  // 재계산해, 오프셋 셸이 연속된 매끈한 외곽선이 되도록 한다(마감 정리).
  try {
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    const welded = mergeVertices(g);
    welded.computeVertexNormals();
    g.dispose();       // 용접 성공 시 용접 전 클론은 버린다(GPU/메모리 누수 방지)
    g = welded;
  } catch (_) {
    if (!g.attributes.normal) g.computeVertexNormals();
  }
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  if (nor) {
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) + nor.getX(i) * thickness,
        pos.getY(i) + nor.getY(i) * thickness,
        pos.getZ(i) + nor.getZ(i) * thickness
      );
    }
    pos.needsUpdate = true;
  }
  // 외곽선 색 = 파츠 자기 색을 어둡게(밝기 차등). 흰 얼굴→회색, 파란 옷→짙은 파랑 등.
  // 패턴 상의처럼 재질색이 흰색인 경우 userData.outlineBase 힌트로 실제 옷색을 쓴다.
  const base = mesh.userData && mesh.userData.outlineBase
    ? new THREE.Color(mesh.userData.outlineBase)
    : mesh.material && mesh.material.color ? mesh.material.color.clone() : new THREE.Color('#3f2d22');
  const lum = 0.2126 * base.r + 0.7152 * base.g + 0.0722 * base.b;
  base.multiplyScalar(lum > 0.6 ? 0.5 : lum > 0.3 ? 0.55 : 0.65);
  const mat = new THREE.MeshBasicMaterial({ color: base, side: THREE.BackSide });
  const outline = new THREE.Mesh(g, mat);
  mesh.add(outline);
  matCollect.push(mat);
  if (geoCollect) geoCollect.push(g);
}

function lathePoints(pairs) {
  return pairs.map(([x, y]) => new THREE.Vector2(x, y));
}

// 작은 하트(하트 프린트용)
function drawMiniHeart(x, cx, cy, r) {
  x.beginPath();
  x.moveTo(cx, cy + r * 0.85);
  x.bezierCurveTo(cx - r * 1.4, cy - r * 0.35, cx - r * 0.5, cy - r * 1.2, cx, cy - r * 0.35);
  x.bezierCurveTo(cx + r * 0.5, cy - r * 1.2, cx + r * 1.4, cy - r * 0.35, cx, cy + r * 0.85);
  x.closePath();
  x.fill();
}

// 상의 패턴 텍스처 — bg=옷색, 위에 흰 줄무늬/물방울/하트. 반복 래핑으로 몸통·소매에 감싼다.
function shirtTexture(topHex, pattern) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = vivid(topHex).getStyle(); // 무지 상의와 동일 채도 부스트
  x.fillRect(0, 0, 128, 128);
  if (pattern === 'stripe') {
    x.fillStyle = 'rgba(255,255,255,0.5)';
    for (let y = 0; y < 128; y += 34) x.fillRect(0, y, 128, 17);
  } else if (pattern === 'dot') {
    x.fillStyle = 'rgba(255,255,255,0.72)';
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cx = (col * 32 + (row % 2 ? 16 : 0) + 16) % 128;
        x.beginPath();
        x.arc(cx, row * 32 + 16, 7, 0, Math.PI * 2);
        x.fill();
      }
    }
  } else if (pattern === 'heart') {
    x.fillStyle = 'rgba(255,255,255,0.82)';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cx = (col * 43 + (row % 2 ? 21 : 0) + 14) % 128;
        drawMiniHeart(x, cx, row * 43 + 22, 8);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.4, 2.4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 호랑이 털 줄무늬 텍스처 — 오렌지 바탕 + 물결 세로 검정 줄. skull·팔·다리·귀에 감긴다.
function furStripeTexture(baseHex) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = vivid(baseHex).getStyle();
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(46,28,14,0.72)'; // 더 진하게 — 줄무늬가 탁하지 않고 또렷하게(감독 보고)
  // 굵기 변주 세로 줄 5개(살짝 물결). 성기되 대비를 살려 "호랑이"로 확실히 읽히게.
  for (const [bx, w] of [[8, 6], [33, 9], [59, 5], [85, 9], [110, 6]]) {
    x.beginPath();
    x.moveTo(bx, 0);
    x.quadraticCurveTo(bx + 6, 64, bx, 128);
    x.lineTo(bx + w, 128);
    x.quadraticCurveTo(bx + 6 + w, 64, bx + w, 0);
    x.closePath();
    x.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.4, 1.1);
  tex.offset.set(0.2, 0); // 정면 중앙에 줄이 딱 걸리지 않게 오프셋
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 종족별 주둥이 지오메트리 (skull 로컬 좌표, 털색 병합용). 없으면 null.
function buildMuzzleGeo(species, R) {
  let g = null;
  if (species === 'dog') {
    // 뾰족한 강아지 코 — 얇고 긴 캡슐(taper와 합쳐 더 뾰족)
    g = new THREE.CapsuleGeometry(0.11 * R, 0.34 * R, 4, 10);
    g.rotateX(Math.PI / 2);
    g.translate(0, -0.13 * R, 0.74 * R);
  } else if (species === 'fox') {
    g = new THREE.ConeGeometry(0.15 * R, 0.4 * R, 14);
    g.rotateX(-Math.PI / 2);
    g.translate(0, -0.06 * R, 0.74 * R);
  } else if (species === 'bear') {
    g = new THREE.SphereGeometry(0.24 * R, 16, 12);
    g.scale(1, 0.85, 1.25);
    g.translate(0, -0.1 * R, 0.74 * R);
  } else if (species === 'raccoon') {
    g = new THREE.SphereGeometry(0.2 * R, 14, 12);
    g.scale(0.9, 0.8, 1.2);
    g.translate(0, -0.08 * R, 0.76 * R);
  } else if (species === 'panda') {
    g = new THREE.SphereGeometry(0.14 * R, 12, 10);
    g.scale(1, 0.82, 0.95);
    g.translate(0, -0.05 * R, 0.74 * R);
  }
  return g;
}

/**
 * 치비 아바타를 조립한다 (동기 — 로드 없음).
 * @param {object} params - normalizeChibi 형태의 파라미터 (생략 시 기본 룩)
 * @returns {{group: THREE.Group, height: number, update: (delta:number, speed:number)=>void, dispose: ()=>void}}
 */
export function buildChibi(params) {
  const p = normalizeChibi(params);
  const mats = []; // dispose 대상
  const geos = [];
  const texs = [];

  const mkGeo = (g) => {
    geos.push(g);
    return g;
  };
  const mkMat = (m) => {
    mats.push(m);
    return m;
  };

  // ---- 루트/래퍼 (전방 +Z 저작 → π 보정) ----
  const group = new THREE.Group();
  const wrapper = new THREE.Group();
  wrapper.rotation.y = Math.PI;
  group.add(wrapper);

  let skinMat;
  if (p.species === 'tiger') {
    const tex = furStripeTexture(p.skin);
    texs.push(tex);
    skinMat = mkMat(new THREE.MeshToonMaterial({ map: tex, gradientMap: toonRamp() }));
  } else {
    skinMat = mkMat(toon(p.skin));
  }
  const hairMat = mkMat(toon(p.hairColor, true));
  let topMat;
  if (p.pattern && p.pattern !== 'plain') {
    const tex = shirtTexture(p.top, p.pattern);
    texs.push(tex);
    topMat = mkMat(new THREE.MeshToonMaterial({ map: tex, gradientMap: toonRamp() }));
  } else {
    topMat = mkMat(toon(p.top));
  }
  const bottomMat = mkMat(toon(p.bottom, true));
  const shoeMat = mkMat(toon(p.shoes));

  // 귀신 전용 반투명 재질 (몸/팔/시트) — 얼굴 텍스처는 불투명 유지해 안 뭉개진다.
  const isGhost = p.species === 'ghost';
  const ghostSkinMat = isGhost ? mkMat(new THREE.MeshToonMaterial({ color: vivid(p.skin), gradientMap: toonRamp(), side: THREE.DoubleSide, transparent: true, opacity: 0.74 })) : null;
  const ghostTrimMat = isGhost ? mkMat(new THREE.MeshToonMaterial({ color: vivid(p.hairColor), gradientMap: toonRamp(), side: THREE.DoubleSide, transparent: true, opacity: 0.8 })) : null;

  // ---- 하반신: 다리 피벗(고관절) ----
  // 대두(1.8등신) 리튠 — 다리·몸통·팔을 줄이고 머리를 키운다.
  const HIP_Y = 0.375;
  const legPivots = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.085, HIP_Y, 0);
    if (!isGhost) { // 귀신은 다리 없음 — 빈 피벗만(걷기 애니 인덱스 안전)
      const legMat = p.bottomType === 'pants' || p.bottomType === 'overall' ? bottomMat : skinMat;
      const leg = new THREE.Mesh(mkGeo(new THREE.CapsuleGeometry(0.055, 0.145, 6, 12)), legMat);
      leg.position.y = -0.155;
      if (p.species === 'tiger' && legMat === skinMat) leg.userData.outlineBase = p.skin; // (호랑이 제외됨—사장코드지만 torso/skull과 일관 유지)
      addOutline(leg, 0.011, mats, geos);
      pivot.add(leg);
      const foot = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.082, 16, 12)), shoeMat);
      foot.scale.set(1, 0.72, 1.25);
      foot.position.set(0, -0.305, 0.03);
      addOutline(foot, 0.011, mats, geos);
      pivot.add(foot);
    }
    wrapper.add(pivot);
    legPivots.push(pivot);
  }

  // ---- 몸통 (귀신은 몸-하반신 겸용 시트로 대체) ----
  if (isGhost) {
    const sheet = new THREE.Mesh(
      mkGeo(new THREE.LatheGeometry(lathePoints([[0.17, 0.10], [0.20, 0.02], [0.235, -0.10], [0.24, -0.22], [0.20, -0.32], [0.15, -0.38]]), 24)),
      ghostSkinMat
    );
    sheet.position.y = 0.50;
    addOutline(sheet, 0.013, mats, geos);
    wrapper.add(sheet);
    // 하단 물결단(스캘럽 힘) 5개 — 병합 1드로우콜, 트림색
    const hemGeos = [];
    for (let i = 0; i < 5; i++) {
      const th = i * (Math.PI * 2 / 5);
      const nub = new THREE.SphereGeometry(0.045, 10, 8);
      nub.scale(1, 1.3, 1);
      nub.translate(0.15 * Math.cos(th), -0.38, 0.15 * Math.sin(th));
      hemGeos.push(nub);
    }
    const hem = new THREE.Mesh(mkGeo(mergeGeometries(hemGeos)), ghostTrimMat);
    hemGeos.forEach((g) => g.dispose());
    hem.position.y = 0.50;
    addOutline(hem, 0.009, mats, geos);
    wrapper.add(hem);
  } else {
    const torso = new THREE.Mesh(mkGeo(new THREE.CapsuleGeometry(0.155, 0.115, 8, 16)), topMat);
    torso.position.y = 0.52;
    torso.scale.set(1, 1, 0.9);
    torso.userData.outlineBase = vivid(p.top); // 패턴 상의(재질색 흰색)여도 외곽선은 옷색 기준
    addOutline(torso, 0.013, mats, geos);
    wrapper.add(torso);
  }

  if (!isGhost && (p.bottomType === 'skirt' || p.bottomType === 'dress' || p.bottomType === 'swimsuit')) {
    const isDress = p.bottomType === 'dress';
    const isSwim = p.bottomType === 'swimsuit';
    const profile = isDress
      ? [[0.15, 0.09], [0.2, 0.02], [0.27, -0.12], [0.31, -0.24], [0.3, -0.27]]   // 원피스 — 길게
      : isSwim
        ? [[0.15, 0.08], [0.165, 0.0], [0.16, -0.09], [0.135, -0.13]]             // 수영복 — 몸 밀착·하이컷
        : [[0.165, 0.03], [0.22, -0.03], [0.29, -0.13], [0.3, -0.155]];           // 치마
    const skirt = new THREE.Mesh(
      mkGeo(new THREE.LatheGeometry(lathePoints(profile), 24)),
      (isDress || isSwim) ? topMat : bottomMat // 원피스·수영복은 상의(색·패턴)와 한 벌
    );
    skirt.position.y = isSwim ? 0.50 : (isDress ? 0.53 : 0.50);
    skirt.userData.outlineBase = (isDress || isSwim) ? vivid(p.top) : vivid(p.bottom);
    addOutline(skirt, 0.012, mats, geos);
    wrapper.add(skirt);
    if (isSwim) {
      // 어깨끈 2가닥 + 허리 프릴 트림 — 몸판(topMat)과 같은 톤으로 통일
      for (const s of [-1, 1]) {
        const strap = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.03, 0.16, 0.02)), topMat);
        strap.position.set(s * 0.09, 0.60, 0.10);
        strap.rotation.z = s * 0.15;
        addOutline(strap, 0.008, mats, geos);
        wrapper.add(strap);
      }
      const frill = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(0.158, 0.018, 8, 20)), mkMat(toon(shade(p.top, 0.8))));
      frill.rotation.x = Math.PI / 2;
      frill.position.y = 0.505;
      addOutline(frill, 0.007, mats, geos);
      wrapper.add(frill);
    }
  } else if (!isGhost) {
    // 바지/멜빵바지: 골반 덮개 (귀신은 하반신이 시트라 없음)
    const shorts = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.35)), bottomMat);
    shorts.position.y = 0.44;
    wrapper.add(shorts);
    if (p.bottomType === 'overall') {
      // 멜빵 2가닥 — 허리 앞에서 어깨로
      for (const s of [-1, 1]) {
        const strap = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.035, 0.22, 0.022)), bottomMat);
        strap.position.set(s * 0.07, 0.56, 0.135);
        strap.rotation.z = s * 0.1;
        addOutline(strap, 0.009, mats, geos);
        wrapper.add(strap);
      }
    }
  }

  // ---- 가슴 하트 (옵션) — 레퍼런스 원피스 하트 모티프 ----
  if (p.heart) {
    const heartMat = mkMat(toon('#e8619a'));
    const hg = new THREE.Group();
    hg.position.set(0, 0.55, 0.15); // 몸통 전면
    for (const s of [-1, 1]) {
      const lobe = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.042, 12, 10)), heartMat);
      lobe.position.set(s * 0.03, 0.018, 0);
      lobe.scale.set(1, 1, 0.5);
      hg.add(lobe);
    }
    const tip = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.058, 0.085, 14)), heartMat);
    tip.rotation.x = Math.PI; // 아래로 뾰족
    tip.position.set(0, -0.028, 0);
    tip.scale.set(1, 1, 0.5);
    hg.add(tip);
    wrapper.add(hg);
  }

  // ---- 팔 피벗(어깨) ----
  const armPivots = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.172, 0.625, 0);
    pivot.rotation.z = s * 0.5; // 살짝 벌린 기본 자세
    if (isGhost) {
      // 귀신 — 뭉툭 nub 팔(소매·손 없음)
      const nub = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.06, 12, 10)), ghostSkinMat);
      nub.scale.set(1, 1.3, 1);
      nub.position.y = -0.05;
      addOutline(nub, 0.010, mats, geos);
      pivot.add(nub);
    } else {
      const arm = new THREE.Mesh(mkGeo(new THREE.CapsuleGeometry(0.05, 0.115, 6, 12)), skinMat);
      arm.position.y = -0.095;
      if (p.species === 'tiger') arm.userData.outlineBase = p.skin; // (호랑이 제외됨—사장코드지만 일관 유지)
      addOutline(arm, 0.011, mats, geos);
      pivot.add(arm);
      // 소매 캡 (상의색)
      const sleeve = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.07, 12, 10)), topMat);
      sleeve.position.y = -0.02;
      sleeve.scale.set(1, 0.8, 1);
      pivot.add(sleeve);
    }
    wrapper.add(pivot);
    armPivots.push(pivot);
  }

  // ---- 머리 피벗(목) ----
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.70;
  wrapper.add(headPivot);

  const HEAD_R = 0.35;
  const fsDef = FACE_SHAPE_DEF[p.face] || FACE_SHAPE_DEF.round;
  const headBase = SPECIES_HEAD_BASE[p.species] || SPECIES_HEAD_BASE.human;
  // 종족 기본 두상 × 사용자 얼굴형. human은 headBase.taper/flat=0이라 기존과 동일(회귀 0).
  const sX = headBase.sx * fsDef.sx, sY = headBase.sy * fsDef.sy, sZ = headBase.sz * fsDef.sz;
  const effTaper = p.species === 'human' ? fsDef.taper : Math.min(0.42, headBase.taper + fsDef.taper * 0.6);
  const effFlat = p.species === 'human' ? fsDef.flat : Math.max(headBase.flat, fsDef.flat * 0.7);
  // 턱 성형 — 테이퍼(아래 반구 조임)와 플랫(하단 눌러 각진 턱). 종족×얼굴형 합성값 사용.
  const taperJaw = (geo) => {
    if (!effTaper && !effFlat) return geo;
    const pos = geo.attributes.position;
    const FLAT_Y = -HEAD_R * 0.72;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y >= 0) continue;
      if (effTaper) {
        const f = 1 - effTaper * Math.min(1, -y / HEAD_R);
        pos.setX(i, pos.getX(i) * f);
        pos.setZ(i, pos.getZ(i) * f);
      }
      if (effFlat && y < FLAT_Y) {
        pos.setY(i, FLAT_Y + (y - FLAT_Y) * (1 - effFlat));
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  };
  // 종족별 주둥이를 skull에 병합 — 같은 털색이라 드로우콜 증가 0 (자연스러운 두상 다양화).
  const skullGeo = new THREE.SphereGeometry(HEAD_R, 32, 24);
  const muzzleGeo = buildMuzzleGeo(p.species, HEAD_R);
  let mergedSkull = skullGeo;
  if (muzzleGeo) {
    mergedSkull = mergeGeometries([skullGeo, muzzleGeo]);
    skullGeo.dispose();
    muzzleGeo.dispose();
  }
  const skull = new THREE.Mesh(mkGeo(taperJaw(mergedSkull)), skinMat);
  skull.scale.set(sX, sY, sZ);
  skull.position.y = 0.25;
  if (p.species === 'tiger') skull.userData.outlineBase = p.skin; // 줄무늬 텍스처(흰 재질색) 외곽선 보정
  addOutline(skull, 0.013, mats, geos);
  headPivot.add(skull);

  // 얼굴 캡 (+Z 전면) — 캔버스 텍스처 (상처/아픔 시 제자리에서 다시 그린다)
  const faceCanvas = drawFaceCanvas(p);
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  texs.push(faceTex);
  const FACE_PHI = 1.85;
  const faceGeo = mkGeo(
    taperJaw(new THREE.SphereGeometry(HEAD_R * 1.012, 32, 24, Math.PI / 2 - FACE_PHI / 2, FACE_PHI, Math.PI * 0.33, Math.PI * 0.4))
  );
  const faceMat = mkMat(
    new THREE.MeshToonMaterial({ map: faceTex, gradientMap: toonRamp(), transparent: true, alphaTest: 0.02 })
  );
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.scale.copy(skull.scale);
  face.position.copy(skull.position);
  headPivot.add(face);

  // ---- 헤어 ----
  const HAIR_R = HEAD_R * 1.07;
  const hairRoot = new THREE.Group();
  hairRoot.position.copy(skull.position);
  // 헤어(셸·꼬리·액세서리 전부 hairRoot 자식)는 두상 스케일을 따라간다 —
  // 안 그러면 통통/갸름에서 두피가 헤어를 뚫는다
  // 사람은 기존 그대로(회귀 0), 동물은 종족 두상 스케일을 따라가 귀/털이 얼굴 형태에 맞게.
  if (p.species === 'human') hairRoot.scale.set(fsDef.sx, fsDef.sy, fsDef.sz);
  else hairRoot.scale.set(sX, sY, sZ);
  headPivot.add(hairRoot);
  const tailPivots = []; // 찰랑임 애니메이션 대상
  const ouchEyes = [];   // 3D 눈(개구리) — ouch 때 찡긋(납작). {mesh, baseY} 저장

  if (p.species === 'human') {
  if (p.hairStyle !== 'bald') {
  // 공통 헬멧 셸 (앞이마 위 ~ 뒤통수)
  const shell = new THREE.Mesh(
    mkGeo(new THREE.SphereGeometry(HAIR_R, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.44)),
    hairMat
  );
  addOutline(shell, 0.012, mats, geos);
  hairRoot.add(shell);
  // 뒷머리 커튼 + 앞머리(뱅) — 같은 재질의 정적 파츠라 지오메트리 병합으로
  // 1드로우콜에 그린다 (아바타당 3~4콜 절약, 관객 7명이면 25콜+).
  const staticHairGeos = [];
  if (p.hairStyle !== 'short') {
    const FRONT_OPEN = 1.95;
    staticHairGeos.push(
      new THREE.SphereGeometry(HAIR_R * 0.995, 32, 16, Math.PI / 2 + FRONT_OPEN / 2, Math.PI * 2 - FRONT_OPEN, Math.PI * 0.3, Math.PI * (p.hairStyle === 'bob' ? 0.42 : 0.34))
    );
  }
  for (const [bx, bs] of [[-0.13, 0.105], [0.0, 0.12], [0.13, 0.105]]) {
    const bang = new THREE.SphereGeometry(bs, 14, 10);
    bang.scale(1, 0.52, 0.5);
    bang.translate(bx, 0.21, 0.235);
    staticHairGeos.push(bang);
  }
  if (staticHairGeos.length) {
    const mergedHair = new THREE.Mesh(mkGeo(mergeGeometries(staticHairGeos)), hairMat);
    staticHairGeos.forEach((g) => g.dispose());
    addOutline(mergedHair, 0.011, mats, geos);
    hairRoot.add(mergedHair);
  }

  const tailProfile = lathePoints([[0.015, 0.03], [0.075, -0.03], [0.085, -0.14], [0.055, -0.26], [0.008, -0.36]]);
  if (p.hairStyle === 'twintail') {
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.27, 0.22, -0.07);
      pivot.rotation.z = s * 0.35;
      const tail = new THREE.Mesh(mkGeo(new THREE.LatheGeometry(tailProfile, 16)), hairMat);
      tail.scale.setScalar(1.15);
      addOutline(tail, 0.011, mats, geos);
      pivot.add(tail);
      // 묶은 자리 방울
      const tie = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.06, 10, 8)), mkMat(toon('#ffd166')));
      tie.position.y = 0.03;
      pivot.add(tie);
      hairRoot.add(pivot);
      tailPivots.push({ pivot, baseZ: pivot.rotation.z, baseX: 0 });
    }
  } else if (p.hairStyle === 'ponytail') {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.16, -0.26);
    pivot.rotation.x = -0.5;
    const tail = new THREE.Mesh(mkGeo(new THREE.LatheGeometry(tailProfile, 16)), hairMat);
    tail.scale.setScalar(1.25);
    addOutline(tail, 0.011, mats, geos);
    pivot.add(tail);
    hairRoot.add(pivot);
    tailPivots.push({ pivot, baseZ: 0, baseX: pivot.rotation.x });
  } else if (p.hairStyle === 'buns') {
    for (const s of [-1, 1]) {
      const bun = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.1, 14, 12)), hairMat);
      bun.position.set(s * 0.2, 0.26, -0.04);
      addOutline(bun, 0.012, mats, geos);
      hairRoot.add(bun);
    }
  }
  // 'bob'/'short'는 셸+커튼(+뱅)으로 완성
  } else {
    // 대머리 — 헤어 파츠 전부 생략, 두피(skinMat 두상)가 그대로 노출된다(skull이 이미
    // 피부색으로 전체 두상을 덮으므로 셸만 빼면 됨). 만화적 정수리 하이라이트만 얹는다.
    const shine = new THREE.Mesh(
      mkGeo(new THREE.SphereGeometry(HEAD_R * 0.16, 12, 8)),
      mkMat(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3 }))
    );
    shine.scale.set(1, 0.45, 0.85);
    shine.position.set(-0.04, HEAD_R * 0.88, HEAD_R * 0.22);
    hairRoot.add(shine);
  }
  } else if (p.species === 'robot') {
    // ---- 로봇: 안테나 + 목칼라 + 어깨볼트 + 가슴패널 (몸/팔다리는 기본 파츠 재사용) ----
    const rod = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.011, 0.014, 0.15, 8)), skinMat);
    rod.position.set(0, 0.432, -0.02);
    addOutline(rod, 0.008, mats, geos);
    hairRoot.add(rod);
    const bead = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.034, 12, 10)), hairMat); // 사이언 발광 — 아웃라인 생략
    bead.position.set(0, 0.541, -0.02);
    hairRoot.add(bead);
    const collar = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(0.31, 0.016, 8, 20)), mkMat(toon(shade(p.skin, 0.55))));
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, -0.06, 0);
    addOutline(collar, 0.010, mats, geos);
    headPivot.add(collar);
    const boltMat = mkMat(toon(shade(p.skin, 0.5)));
    for (const s of [-1, 1]) for (const z of [0.06, -0.06]) {
      const bolt = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.02, 8, 8)), boltMat);
      bolt.position.set(s * 0.172, 0.66, z);
      wrapper.add(bolt);
    }
    const panel = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.09, 0.07, 0.012)), mkMat(toon(shade(p.skin, 0.6))));
    panel.position.set(0, 0.56, 0.135);
    addOutline(panel, 0.007, mats, geos);
    wrapper.add(panel);
    for (const bx of [-0.025, 0.025]) {
      const btn = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10)), hairMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(bx, 0.56, 0.145);
      wrapper.add(btn);
    }
  } else if (p.species === 'ghost') {
    // 귀신 — 헤어/귀 없음. 시트·nub·머리는 몸통·머리 섹션에서 이미 생성됨(추가 파츠 없음).
  } else {
    // ---- 동물 종족: 헤어 대신 귀/털/꼬리 (머리는 skin=털색 그대로 노출) ----
    const sp = p.species;
    const furMat = skinMat;                 // 기본 털색
    const pointMat = hairMat;               // 포인트색(귀 안쪽·꼬리 끝)
    const R = HEAD_R;                        // 로컬 기준 반지름 (hairRoot 중심)

    // 귀 부착 헬퍼 — geo를 만들어 위치/회전 후 hairRoot에 추가
    const addPart = (geo, mat, x, y, z, rz, rx, sc, outline) => {
      const m = new THREE.Mesh(mkGeo(geo), mat);
      m.position.set(x, y, z);
      if (rz) m.rotation.z = rz;
      if (rx) m.rotation.x = rx;
      if (sc) m.scale.setScalar(sc);
      if (outline !== false) addOutline(m, 0.011, mats, geos);
      hairRoot.add(m);
      return m;
    };

    const M = (col) => mkMat(toon(col)); // 즉석 재질
    const PINK_INNER = '#f2b3c4'; // 귀여운 분홍 안쪽 귀
    // 귀 헬퍼 — 뾰족(고깔): 둥근 귀끝 캡 + 큼직한 안쪽 귀(분홍/포인트)
    // 귀 확대 배율 — 감독 지시("동물 귀 더 과장"). cone·round 귀 공통(토끼는 직접 생성이라 무관).
    const EAR_K = 1.34;
    const coneEars = (earR, earH, x, y, z, tilt, innerScale, outerMat, innerCol) => {
      earR *= EAR_K; earH *= EAR_K;
      const inMat = innerCol ? M(innerCol) : pointMat;
      for (const s of [-1, 1]) {
        addPart(new THREE.ConeGeometry(earR, earH, 16), outerMat || furMat, s * x, y, z, -s * tilt, -0.12);
        // 큼직한 안쪽 귀(분홍/포인트) — 앞으로 도드라지게, 외곽선 없이
        if (innerScale) addPart(new THREE.ConeGeometry(earR * innerScale, earH * 0.72, 16), inMat, s * x, y - earH * 0.02, z + R * 0.1, -s * tilt, -0.12, undefined, false);
      }
    };
    // 둥근 귀 — 겉귀 + 앞쪽 안쪽 귀(분홍/밝은색)
    const roundEars = (er, x, y, z, m, innerCol) => {
      er *= EAR_K;
      for (const s of [-1, 1]) {
        addPart(new THREE.SphereGeometry(er, 14, 12), m || furMat, s * x, y, z);
        if (innerCol) addPart(new THREE.SphereGeometry(er * 0.62, 12, 10), M(innerCol), s * x, y, z + er * 0.6, 0, 0, 0, false).scale.set(1, 1, 0.55);
      }
    };
    // 갈기/털 링 — 상반구 퍼프 병합(양·사자 공용)
    const puffMass = (count, cover, base, yOff, col, dbl) => {
      const puffs = [];
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(1 - cover * (i + 0.5) / count);
        const theta = i * 2.399963;
        const rr = R * 1.04;
        const g = new THREE.SphereGeometry(R * base * (1 + (i % 3) * 0.12), 8, 6);
        g.translate(rr * Math.sin(phi) * Math.cos(theta), rr * Math.cos(phi) + R * yOff, rr * Math.sin(phi) * Math.sin(theta));
        puffs.push(g);
      }
      const mesh = new THREE.Mesh(mkGeo(mergeGeometries(puffs)), mkMat(toon(col, dbl)));
      puffs.forEach((g) => g.dispose());
      addOutline(mesh, 0.012, mats, geos);
      hairRoot.add(mesh);
      return mesh;
    };

    if (sp === 'sheep') {
      puffMass(24, 0.82, 0.24, 0.08, p.skin, true); // 뭉게 털
      for (const s of [-1, 1]) {
        addPart(new THREE.SphereGeometry(R * 0.18, 12, 10), pointMat, s * R * 0.72, R * 0.22, R * 0.08, -s * 0.62).scale.set(1, 0.5, 0.44);
        addPart(new THREE.SphereGeometry(R * 0.1, 10, 8), M('#f2c4c4'), s * R * 0.66, R * 0.2, R * 0.16, -s * 0.62, 0, 0, false).scale.set(1, 0.5, 0.3);
      }
    } else if (sp === 'lion') {
      // 갈기 — 얼굴 둘레 2겹(안/바깥) 스태거 퍼프로 빈틈 없이 풍성하게. 크기를 변주해
      // "기어/톱니"처럼 딱딱해 보이던 균일 링 문제를 없앤다(감독 보고). 얼굴 중앙은 비운다.
      const maneGeos = [];
      const MN = 18;
      for (let i = 0; i < MN; i++) {
        const a = (i / MN) * Math.PI * 2 - Math.PI / 2;
        const outer = i % 2 === 0;
        const rr = R * (outer ? 1.12 : 0.98);
        const sz = R * (outer ? 0.26 : 0.205) * (0.88 + 0.22 * (((i * 7) % 5) / 4));
        const g = new THREE.SphereGeometry(sz, 8, 6);
        g.scale(1, 1, 0.82);
        g.translate(Math.cos(a) * rr, Math.sin(a) * rr + R * 0.04, R * 0.06);
        maneGeos.push(g);
      }
      const mane = new THREE.Mesh(mkGeo(mergeGeometries(maneGeos)), mkMat(toon(p.hairColor, true)));
      maneGeos.forEach((g) => g.dispose());
      addOutline(mane, 0.012, mats, geos);
      hairRoot.add(mane);
      roundEars(R * 0.16, R * 0.52, R * 0.8, R * 0.05, furMat, '#e8c9a0'); // 작은 둥근 귀 + 크림 안쪽
    } else if (sp === 'cat' || sp === 'tiger') {
      coneEars(R * 0.3, sp === 'tiger' ? R * 0.46 : R * 0.54, R * 0.58, R * 0.86, R * 0.05, 0.3, 0.62, undefined, PINK_INNER);
    } else if (sp === 'fox') {
      coneEars(R * 0.27, R * 0.6, R * 0.58, R * 0.88, R * 0.05, 0.3, 0.55, undefined, '#fff1e0');
    } else if (sp === 'raccoon') {
      coneEars(R * 0.26, R * 0.56, R * 0.6, R * 0.88, R * 0.05, 0.3, 0.5, undefined, '#d8d0c4');
    } else if (sp === 'dog') {
      // 크고 축 늘어진 귀 — 강아지의 포인트. 옆에서 아래로 늘어지는 갈색 겉귀 + 분홍 안쪽.
      for (const s of [-1, 1]) {
        const ear = addPart(new THREE.SphereGeometry(R * 0.34, 14, 12), pointMat, s * R * 0.72, R * 0.3, R * 0.0, -s * 0.12, 0.05);
        ear.scale.set(0.55, 1.7, 0.42); // 세로로 길게 → 뺨 옆으로 축 늘어짐
        addPart(new THREE.SphereGeometry(R * 0.19, 12, 10), M('#f2c4c0'), s * R * 0.68, R * 0.26, R * 0.09, -s * 0.12, 0.05, 0, false).scale.set(0.5, 1.55, 0.26);
      }
    } else if (sp === 'rabbit') {
      for (const s of [-1, 1]) {
        addPart(new THREE.CapsuleGeometry(R * 0.12, R * 0.82, 4, 8), furMat, s * R * 0.34, R * 1.08, 0, -s * 0.1);
        addPart(new THREE.CapsuleGeometry(R * 0.065, R * 0.62, 4, 8), M(PINK_INNER), s * R * 0.34, R * 1.11, R * 0.07, -s * 0.1, 0, 0, false);
      }
    } else if (sp === 'koala') {
      roundEars(R * 0.36, R * 0.76, R * 0.44, 0, furMat, '#f2c4d0'); // 크고 복슬한 귀 + 분홍 안쪽
      // 복슬 퍼프 — 귀 둘레 작은 털뭉치
      for (const s of [-1, 1]) for (const [ox, oy] of [[-0.12, 0.14], [0.12, 0.1], [0, -0.16]]) {
        addPart(new THREE.SphereGeometry(R * 0.11, 8, 6), furMat, s * (R * 0.76 + ox * R), R * 0.44 + oy * R, R * 0.02, 0, 0, 0, false);
      }
    } else if (sp === 'hamster') {
      roundEars(R * 0.19, R * 0.5, R * 0.9, R * 0.05, furMat, PINK_INNER); // 둥근 귀 + 분홍 안쪽
    } else if (sp === 'pig') {
      for (const s of [-1, 1]) {
        addPart(new THREE.ConeGeometry(R * 0.17, R * 0.28, 12), furMat, s * R * 0.5, R * 0.9, R * 0.12, -s * 0.15, -0.7); // 앞으로 접힌 삼각 귀
        addPart(new THREE.ConeGeometry(R * 0.09, R * 0.18, 10), M('#efa0b2'), s * R * 0.5, R * 0.86, R * 0.19, -s * 0.15, -0.7, 0, false);
      }
    } else if (sp === 'chick') {
      for (const dx of [-1, 0, 1]) addPart(new THREE.ConeGeometry(R * 0.07, R * 0.22, 12), furMat, dx * R * 0.13, R * 1.0, 0, dx * 0.25, -0.1); // 정수리 솜털
    } else if (sp === 'frog') {
      // 눈이 머리 위로 튀어나온 개구리 — 흰 구 + 검은 동공(캔버스 눈은 생략됨)
      for (const s of [-1, 1]) {
        const ball = addPart(new THREE.SphereGeometry(R * 0.26, 14, 12), skinMat, s * R * 0.42, R * 0.62, R * 0.34);
        const white = addPart(new THREE.SphereGeometry(R * 0.15, 12, 10), mkMat(toon('#fbfbfa')), s * R * 0.42, R * 0.66, R * 0.5, 0, 0, 0, false);
        const pup = addPart(new THREE.SphereGeometry(R * 0.075, 10, 8), mkMat(toon('#1a1a1a')), s * R * 0.42, R * 0.66, R * 0.62, 0, 0, 0, false);
        // ouch 때 통째로 세로 납작 → 질끈 감은 눈. 위치도 살짝 내려 눌린 느낌.
        for (const m of [ball, white, pup]) ouchEyes.push({ mesh: m, baseY: m.position.y });
      }
    } else if (sp === 'penguin') {
      // 귀 없음 — 정수리 살짝 각진 머리깃만
      addPart(new THREE.SphereGeometry(R * 0.14, 10, 8), furMat, 0, R * 0.98, -R * 0.1).scale.set(0.8, 0.6, 0.8);
    } else if (sp === 'panda') {
      roundEars(R * 0.26, R * 0.68, R * 0.82, R * 0.05, pointMat); // 검정 둥근 귀
    } else {
      // bear — 둥근 테디 귀 + 크림 안쪽
      roundEars(R * 0.26, R * 0.68, R * 0.82, R * 0.05, furMat, '#f0d6b8');
    }

    // ---- 종족 코끝/부리/주둥이 디테일 (3D 주둥이 종은 캔버스 코를 drawAnimalFace에서 생략) ----
    const darkNose = () => mkMat(toon('#2a2724'));
    // 코끝/작은 파츠 — 외곽선 없이(주둥이 실루엣이 이미 외곽선 있음)
    const tip = (geo, mat, x, y, z) => addPart(geo, mat, x, y, z, 0, 0, 0, false);
    if (sp === 'dog') tip(new THREE.SphereGeometry(R * 0.06, 10, 8), darkNose(), 0, -0.12 * R, 1.0 * R);
    else if (sp === 'fox') tip(new THREE.SphereGeometry(R * 0.055, 10, 8), mkMat(toon('#fff6ea')), 0, -0.06 * R, 1.12 * R);
    else if (sp === 'bear') tip(new THREE.SphereGeometry(R * 0.07, 10, 8), darkNose(), 0, -0.1 * R, 1.02 * R);
    else if (sp === 'raccoon') tip(new THREE.SphereGeometry(R * 0.055, 10, 8), darkNose(), 0, -0.08 * R, 1.0 * R);
    else if (sp === 'panda') tip(new THREE.SphereGeometry(R * 0.05, 10, 8), darkNose(), 0, -0.05 * R, 0.9 * R);
    else if (sp === 'rabbit') tip(new THREE.SphereGeometry(R * 0.075, 10, 8), mkMat(toon('#e88ba0')), 0, 0.02 * R, 0.9 * R);
    else if (sp === 'cat') tip(new THREE.SphereGeometry(R * 0.045, 10, 8), mkMat(toon('#e88ba0')), 0, -0.02 * R, 1.0 * R).scale.set(1.4, 0.85, 1);
    else if (sp === 'koala') tip(new THREE.SphereGeometry(R * 0.13, 12, 10), darkNose(), 0, -0.03 * R, 0.98 * R).scale.set(1.05, 1.3, 0.95);
    else if (sp === 'pig') {
      // 돌출 스노우트 — 납작 디스크(구버전, 얼굴에 묻혀 안 보임)를 앞으로 튀어나온 원통으로.
      const snout = addPart(new THREE.CylinderGeometry(R * 0.2, R * 0.21, R * 0.18, 18), mkMat(toon('#efa0b2')), 0, -0.05 * R, 0.98 * R, 0, Math.PI / 2, 0, true);
      snout.userData.outlineBase = '#c07a90';
      for (const s of [-1, 1]) tip(new THREE.SphereGeometry(R * 0.032, 8, 6), mkMat(toon('#a85670')), s * 0.06 * R, -0.05 * R, 1.08 * R);
    } else if (sp === 'chick' || sp === 'penguin') {
      const beak = addPart(new THREE.ConeGeometry(sp === 'penguin' ? R * 0.11 : R * 0.1, sp === 'penguin' ? R * 0.16 : R * 0.17, 4), mkMat(toon('#f4a83a')), 0, -0.02 * R, 0.86 * R, 0, -Math.PI / 2, 0, false);
      beak.scale.set(sp === 'penguin' ? 1.6 : 1.4, 0.6, 1);
    } else if (sp === 'hamster') {
      for (const s of [-1, 1]) addPart(new THREE.SphereGeometry(R * 0.16, 12, 10), furMat, s * 0.6 * R, -0.06 * R, 0.55 * R, 0, 0, 0, true).scale.set(1, 0.8, 0.7);
    }

    // ---- 동물 꼬리 (몸 뒤 · wrapper) ----
    const STUB = new Set(['bear', 'panda', 'hamster', 'koala', 'penguin', 'chick']);
    const LATHE = new Set(['cat', 'dog', 'fox', 'sheep', 'tiger', 'lion', 'raccoon']);
    // (끝뭉치 포인트색은 종별 spec.tip으로 이동 — 구 TIP set 제거)
    if (sp !== 'frog') {
      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 0.46, -0.2);
      let baseX = -0.4;
      if (sp === 'rabbit') {
        const puff = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(HEAD_R * 0.22, 12, 10)), furMat);
        addOutline(puff, 0.011, mats, geos);
        tailPivot.add(puff);
        baseX = 0;
      } else if (sp === 'pig') {
        const curl = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(HEAD_R * 0.11, HEAD_R * 0.035, 8, 16, Math.PI * 1.6)), furMat);
        tailPivot.add(curl);
        baseX = 0;
      } else if (STUB.has(sp)) {
        const stub = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(HEAD_R * 0.12, 10, 8)), sp === 'panda' ? pointMat : furMat);
        addOutline(stub, 0.011, mats, geos);
        tailPivot.add(stub);
        baseX = 0;
      } else if (LATHE.has(sp)) {
        // 위로 휜 테이퍼 꼬리 — 구버전(프로필 회전 = 아래로 늘어진 물방울)을 폐기하고
        // 곡선(CatmullRom)을 따라 감긴 튜브 + 둥근 끝뭉치로 자연스러운 꼬리를 만든다.
        // 뿌리를 엉덩이 뒷면(y≈0.40·z≈-0.13)에 붙인다 — 이전엔 z=-0.28로 과하게 밀어
        // 몸과 꼬리가 벌어져 "떠 있는"(공중 부양) 버그가 났었다(감독 보고). 클리어런스는
        // 곡선이 뒤로 뻗는 형태와 스윙 진폭으로 확보하고, 뿌리는 표면에 접하게 둔다.
        tailPivot.position.set(0, 0.40, -0.13);
        const spec = ({
          fox:     { rad: R * 0.17, len: 1.35, up: 1.0, tip: '#fff6ea', bushy: true },
          cat:     { rad: R * 0.075, len: 1.1, up: 1.15 },
          lion:    { rad: R * 0.085, len: 1.22, up: 0.75, tip: p.hairColor },
          raccoon: { rad: R * 0.13, len: 1.15, up: 0.72, tip: '#3a3632', bushy: true },
          dog:     { rad: R * 0.09, len: 1.0, up: 1.0 },
          sheep:   { rad: R * 0.1, len: 0.68, up: 0.5 },
        })[sp] || { rad: R * 0.09, len: 1.05, up: 0.9 };
        const L = spec.len;
        // 꼬리가 몸 뒤로 크게 뻗었다가 위로 휘어 올라간다(치마·상의에 묻히지 않게 뒤로 충분히).
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0.10 * L, -0.16 * L),
          new THREE.Vector3(0, 0.26 * L * spec.up, -0.20 * L),
          new THREE.Vector3(0, 0.42 * L * spec.up, -0.12 * L),
        ]);
        const tube = new THREE.Mesh(mkGeo(new THREE.TubeGeometry(curve, 22, spec.rad, 12, false)), furMat);
        addOutline(tube, 0.011, mats, geos);
        tailPivot.add(tube);
        if (spec.bushy) { // 여우·너구리 — 볼륨 퍼프 몇 덩이
          for (const tt of [0.45, 0.68, 0.86]) {
            const pp = curve.getPoint(tt);
            const puff = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(spec.rad * 1.3, 12, 10)), furMat);
            puff.position.copy(pp); addOutline(puff, 0.011, mats, geos); tailPivot.add(puff);
          }
        }
        // 끝뭉치(둥근 마감 + 포인트색 옵션)
        const endBall = new THREE.Mesh(
          mkGeo(new THREE.SphereGeometry(spec.rad * (spec.bushy ? 1.55 : 1.2), 12, 10)),
          spec.tip ? mkMat(toon(spec.tip)) : furMat
        );
        endBall.position.copy(curve.getPoint(1));
        addOutline(endBall, 0.011, mats, geos);
        tailPivot.add(endBall);
        baseX = 0; // 곡선이 방향을 정의하므로 pivot 틸트 제거
      }
      tailPivot.rotation.x = baseX;
      wrapper.add(tailPivot);
      tailPivots.push({ pivot: tailPivot, baseZ: 0, baseX });
    }
  }

  // ---- 안경 (옵션) — 얼굴 앞 두 렌즈 + 브리지. 눈 높이(≈y0.21)·얼굴 표면 앞으로. ----
  if (p.glasses) {
    const frameMat = mkMat(toon('#3a352f'));
    const gGroup = new THREE.Group();
    gGroup.position.set(0, 0.21, HEAD_R * 1.05); // 눈 높이, 얼굴 구 표면 바로 앞
    gGroup.scale.copy(skull.scale);
    for (const s of [-1, 1]) {
      const lens = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(0.072, 0.0095, 12, 28)), frameMat);
      lens.position.set(s * 0.09, 0, 0);
      gGroup.add(lens);
    }
    const bridge = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.05, 0.014, 0.014)), frameMat);
    gGroup.add(bridge);
    headPivot.add(gGroup);
  }

  // ---- 의상 세트 (정장 / 교련복) ----
  if (p.outfit === 'suit') {
    // 흰 셔츠 V칼라 + 넥타이 (몸통 전면)
    const collarMat = mkMat(toon('#fbfbfa'));
    for (const s of [-1, 1]) {
      const flap = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.05, 0.11, 0.02)), collarMat);
      flap.position.set(s * 0.035, 0.6, 0.145);
      flap.rotation.z = s * 0.5;
      addOutline(flap, 0.008, mats, geos);
      wrapper.add(flap);
    }
    const tieMat = mkMat(toon('#c0392b'));
    const knot = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.03, 0.03, 0.02)), tieMat);
    knot.position.set(0, 0.605, 0.15);
    wrapper.add(knot);
    const tie = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.028, 0.14, 4)), tieMat);
    tie.rotation.x = Math.PI;
    tie.position.set(0, 0.52, 0.15);
    tie.scale.set(1, 1, 0.4);
    addOutline(tie, 0.007, mats, geos);
    wrapper.add(tie);
  } else if (p.outfit === 'gyoryeon') {
    // 교련복 — 단추 세로줄 + 스탠드 칼라 + 교련모
    const trimMat = mkMat(toon(shade(p.top, 0.75)));
    const btnMat = mkMat(toon('#3a352f'));
    for (let i = 0; i < 4; i++) {
      const btn = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.016, 8, 6)), btnMat);
      btn.position.set(0, 0.585 - i * 0.038, 0.152);
      wrapper.add(btn);
    }
    for (const s of [-1, 1]) {
      const collar = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.07, 0.03, 0.02)), trimMat);
      collar.position.set(s * 0.05, 0.62, 0.14);
      collar.rotation.z = s * 0.2;
      wrapper.add(collar);
    }
    // 교련모 — 올리브 납작 군모 (머리 위)
    const crown = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(HEAD_R * 0.82, HEAD_R * 0.9, 0.11, 20)), mkMat(toon(p.top)));
    crown.position.set(0, skull.position.y + HEAD_R * 0.72, -0.01);
    crown.userData.outlineBase = vivid(p.top);
    addOutline(crown, 0.012, mats, geos);
    headPivot.add(crown);
    const brim = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(HEAD_R * 0.5, HEAD_R * 0.5, 0.02, 18, 1, false, 0, Math.PI)), mkMat(toon(shade(p.top, 0.8))));
    brim.position.set(0, skull.position.y + HEAD_R * 0.66, HEAD_R * 0.62);
    brim.rotation.x = -0.15;
    addOutline(brim, 0.01, mats, geos);
    headPivot.add(brim);
  }

  // ---- 액세서리 ----
  if (p.acc === 'ribbon') {
    const rib = new THREE.Group();
    // 헤어 표면(HAIR_R=HEAD_R*1.07) 바깥에 얹히도록 반경을 키우고, 바깥(방사)을
    // 향하게 틸트한다 — 기존엔 반경이 머리보다 작고(≈0.344<0.374) 안쪽 날개가
    // 머리를 향해 리본이 머리에 박혀 보였다(감독 보고).
    rib.position.set(0.205, 0.315, 0.205);
    rib.rotation.set(0.12, 0.62, -0.2);
    const ribMat = mkMat(toon('#ff5d73'));
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.05, 0.1, 10)), ribMat);
      wing.rotation.z = s * (Math.PI / 2);
      wing.position.x = s * 0.055;
      addOutline(wing, 0.007, mats, geos);
      rib.add(wing);
    }
    const knot = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.032, 10, 8)), ribMat);
    addOutline(knot, 0.007, mats, geos);
    rib.add(knot);
    hairRoot.add(rib);
  } else if (p.acc === 'horns') {
    const hornMat = mkMat(toon('#c0392b'));
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.055, 0.17, 10)), hornMat);
      horn.position.set(s * 0.17, 0.33, 0.04);
      horn.rotation.z = -s * 0.42; // 바깥쪽으로 벌어진 도깨비 뿔
      addOutline(horn, 0.012, mats, geos);
      hairRoot.add(horn);
    }
  } else if (p.acc === 'flower') {
    // 리본과 동일 교정 — 헤어 표면(HAIR_R) 바깥에 얹히도록 반경을 키우고 바깥을 향하게
    // 틸트 + 아웃라인. 기존엔 반경이 작아(0.18,0.25,0.15≈0.34) 꽃이 머리에 박혀 뭉개졌다.
    const fl = new THREE.Group();
    fl.position.set(0.205, 0.315, 0.205);
    fl.rotation.set(0.12, 0.62, -0.15);
    const petalMat = mkMat(toon('#ffd166'));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.038, 8, 6)), petalMat);
      petal.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0);
      petal.scale.z = 0.5;
      addOutline(petal, 0.006, mats, geos);
      fl.add(petal);
    }
    const core = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.03, 8, 6)), mkMat(toon('#ff8c42')));
    core.position.z = 0.02;
    addOutline(core, 0.006, mats, geos);
    fl.add(core);
    hairRoot.add(fl);
  }

  // ---- 엔젤 키트 (옵션 · 리본/뿔/꽃과 동시 장착 가능) ----
  let haloPivot = null;
  const wingPivots = [];
  if (p.halo) {
    haloPivot = new THREE.Group();
    haloPivot.position.set(0, skull.position.y + HEAD_R * 1.5, 0); // headPivot 직속(얼굴형 왜곡 회피)
    // 링을 바닥과 나란히 눕힌다(≈ -78°). 살짝만 앞으로 틸트해 정면·3/4에서 '떠 있는 고리'로 보이게.
    // (기존 -0.35는 거의 수직 → 머리에 꽂힌 것처럼 보였음)
    haloPivot.rotation.x = -Math.PI / 2 + 0.2;
    const halo = new THREE.Mesh(
      mkGeo(new THREE.TorusGeometry(HEAD_R * 0.52, HEAD_R * 0.055, 12, 28)),
      // 무조명 MeshBasic은 어두운 공간에서 홀로 쨍(떠 보임). 은은한 발광 스탠다드로 → 빛도 받고 살짝 빛난다.
      mkMat(new THREE.MeshStandardMaterial({ color: '#caa23a', emissive: '#ffcf4d', emissiveIntensity: 0.5, roughness: 0.45, metalness: 0.1 }))
    );
    haloPivot.add(halo);
    headPivot.add(haloPivot);
  }
  if (p.wings) {
    // 깃털 부챗살 천사 날개 — 뿌리(어깨뼈)에서 위·바깥으로 펼쳐지고 위로 갈수록
    // 긴 깃털이 날개 끝(뾰족)을 이룬다. (기존엔 작은 흰 솜뭉치라 날개로 안 보였음.)
    const wingMat = mkMat(toon('#fff8ef', true));
    const N = 6;
    for (const s of [-1, 1]) {
      const feathers = [];
      for (let k = 0; k < N; k++) {
        const t = k / (N - 1);                          // 0 아래(짧음) → 1 위(날개끝·김)
        const len = 0.24 + 0.34 * t;                    // 위로 갈수록 긴 깃털
        const wid = 0.09 - 0.03 * t;                    // 끝으로 갈수록 좁게(뾰족)
        const ang = (94 - 74 * t) * Math.PI / 180;      // 아래=수평 바깥, 위=세움
        const g = new THREE.SphereGeometry(1, 12, 8);
        g.scale(wid, len, wid * 0.5);                   // 납작·길쭉한 깃털
        g.translate(0, len * 0.9, 0);                   // 뿌리를 원점에(+y로 뻗음)
        g.rotateZ(-s * ang);                            // 좌우 대칭 부챗살
        g.translate(0, 0, -0.02 * (N - 1 - k));         // 아래 깃털일수록 뒤로 — 겹층 깊이
        feathers.push(g);
      }
      const wing = new THREE.Mesh(mkGeo(mergeGeometries(feathers)), wingMat);
      feathers.forEach((g) => g.dispose());
      const wp = new THREE.Group();
      wp.position.set(s * 0.05, 0.64, -0.12);           // 어깨뼈 높이, 등 뒤
      wp.rotation.y = s * 0.5;                          // 바깥으로 펼침
      const baseZ = s * -0.06;                          // 살짝 위로 세움
      wp.rotation.z = baseZ;
      wp.add(wing);
      wrapper.add(wp);
      wingPivots.push({ pivot: wp, s, baseZ });
    }
  }

  // ---------------------------------------------------------------------------
  // 절차 애니메이션 — 사인파 워크사이클 + 아이들 호흡/살랑임
  // ---------------------------------------------------------------------------
  let t = Math.random() * 10; // 개체별 위상 오프셋 (군집 동기화 방지)
  let walkPhase = 0;
  const HEIGHT = 1.18; // 대두 리튠 반영 (기존 1.34)
  const haloBaseY = haloPivot ? haloPivot.position.y : 0;

  // ---- 맞기 리액션 상태 ----
  const SQUASH_DUR = 0.55;
  let wound = 0;   // 누적 상처 0~3 (얼굴에 반창고/멍/눈물)
  let ouchT = 0;   // >_< 표정 남은 시간
  let squashT = 0; // 움찔 스쿼시 남은 시간

  function refreshFace() {
    drawFaceInto(faceCanvas, p, { wound, ouch: ouchT > 0 });
    faceTex.needsUpdate = true;
  }

  /** 누적 상처 단계 설정 (0~3) — 회복 감쇠에서도 호출된다 */
  function setWound(level) {
    const next = Math.max(0, Math.min(3, Math.floor(level) || 0));
    if (next === wound) return;
    wound = next;
    refreshFace();
  }

  /** 맞았다! — 움찔 + >_< 표정 (표정은 잠시 후 자동 복귀) */
  function ouch() {
    ouchT = 0.85;
    squashT = SQUASH_DUR;
    refreshFace();
  }

  function update(delta, speed) {
    const d = Math.min(delta || 0, 0.1);
    t += d;

    // 아픔 표정 타이머 — 끝나면 평상 얼굴(상처 반영)로 복귀
    if (ouchT > 0) {
      ouchT -= d;
      if (ouchT <= 0) {
        ouchT = 0;
        refreshFace();
        for (const e of ouchEyes) { e.mesh.scale.y = 1; e.mesh.position.y = e.baseY; } // 3D 눈 원복
      }
    }
    // 3D 눈(개구리) 찡긋 — ouch 동안 세로로 질끈 눌러 감는다(캔버스 >_<는 안 그리므로 4개 안 됨)
    if (ouchEyes.length && ouchT > 0) {
      for (const e of ouchEyes) { e.mesh.scale.y = 0.32; e.mesh.position.y = e.baseY - HEAD_R * 0.05; }
    }
    // 움찔 스쿼시 — 눌렸다 통통 복귀
    if (squashT > 0) {
      squashT = Math.max(0, squashT - d);
      const k = Math.sin((squashT / SQUASH_DUR) * Math.PI);
      wrapper.scale.set(1 + 0.1 * k, 1 - 0.18 * k, 1 + 0.1 * k);
    } else if (wrapper.scale.y !== 1) {
      wrapper.scale.set(1, 1, 1);
    }
    const spd = Math.max(0, speed || 0);
    const w = Math.min(1, spd / 1.3); // 걷기 블렌드 0~1
    walkPhase += d * (3 + 8.5 * Math.min(spd, 2.4));

    const swing = Math.sin(walkPhase);
    if (legPivots.length) { // 귀신은 다리 없음(빈 피벗) — 방어 가드
      legPivots[0].rotation.x = swing * 0.78 * w;
      legPivots[1].rotation.x = -swing * 0.78 * w;
    }
    armPivots[0].rotation.x = -swing * 0.5 * w;
    armPivots[1].rotation.x = swing * 0.5 * w;
    // 아이들: 팔 살짝 흔들 + 호흡
    const idle = 1 - w;
    armPivots[0].rotation.z = -0.5 - Math.sin(t * 1.7) * 0.05 * idle;
    armPivots[1].rotation.z = 0.5 + Math.sin(t * 1.7 + 1.3) * 0.05 * idle;

    // 통통 튀는 보행 바운스 + 아이들 호흡 — 래퍼 전체 y
    wrapper.position.y = Math.abs(Math.cos(walkPhase)) * 0.045 * w + Math.sin(t * 2.1) * 0.007 * idle;
    // 몸통 좌우 흔들
    wrapper.rotation.z = Math.sin(walkPhase) * 0.045 * w;

    // 머리: 아이들 갸웃 + 걷기 시 살짝 앞으로
    headPivot.rotation.z = Math.sin(t * 1.1) * 0.05 * idle;
    headPivot.rotation.x = 0.06 * w + Math.sin(t * 2.1) * 0.012 * idle;

    // 꽁지머리/꼬리 찰랑임 — 아이들은 느긋하게, 걸을 땐 통통
    for (let i = 0; i < tailPivots.length; i++) {
      const tp = tailPivots[i];
      const sway = Math.sin(t * 2.3 + i * 2.1) * 0.09 * idle + Math.sin(walkPhase * 2 + i) * 0.14 * w;
      tp.pivot.rotation.z = tp.baseZ + sway;
      tp.pivot.rotation.x = tp.baseX + Math.abs(Math.cos(walkPhase * 2)) * 0.12 * w;
    }

    // 헤일로 — 머리 위 부유(살짝 상하 + 기울임 흔들)
    if (haloPivot) {
      haloPivot.position.y = haloBaseY + Math.sin(t * 1.3) * 0.008;
      haloPivot.rotation.z = Math.sin(t * 0.7) * 0.05;
    }
    // 날개 — 아이들 팔락 + 걷기 시 크게
    for (const wp of wingPivots) {
      wp.pivot.rotation.z = wp.baseZ + Math.sin(t * 2.4 + wp.s) * (0.08 + 0.12 * w);
    }
  }

  function dispose() {
    for (const g of geos) g.dispose();
    for (const m of mats) {
      if (m.map) m.map.dispose();
      m.dispose();
    }
    for (const tx of texs) tx.dispose();
  }

  return { group, height: HEIGHT, update, dispose, setWound, ouch };
}
