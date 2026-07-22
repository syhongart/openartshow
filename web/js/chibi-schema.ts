// @ts-nocheck — 순수 이동(C-3 chibi 분해), strict 타입은 후속 작업.
// chibi-schema.js — 치비 파라미터 SSOT(저장 look). 스타일/팔레트/종족/성별/프리셋 +
//   DEFAULT_CHIBI·normalizeChibi·encode/decodeChibi·CHIBI_CHAR_PREFIX·random*.
//   순수(THREE 미참조). 저장 키·'chibi:' 프리픽스·스키마 1바이트 불변(C-3 S2).

// ---------------------------------------------------------------------------
// 파라미터 정의 (UI와 공유하는 단일 진실 소스)
// ---------------------------------------------------------------------------
export const CHIBI_HAIR_STYLES = [
  { id: 'twintail', name: '트윈테일' },
  { id: 'bob', name: '단발' },
  { id: 'ponytail', name: '포니테일' },
  { id: 'buns', name: '경단머리' },
  { id: 'short', name: '숏컷' },
  { id: 'long', name: '롱' },
  { id: 'wave', name: '웨이브' },
  { id: 'halfup', name: '반묶음' },
  { id: 'heart', name: '하트' },
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
  { id: 'artist', name: '화가' },
  { id: 'hanbok', name: '한복' },
  { id: 'hoodie', name: '후드' },
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
export const NONHUMAN = new Set(['robot', 'ghost']);
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
// cat = 프리셋 줄 카테고리(UI 전용 메타 — look 직렬화·정규화와 무관). 미지정은 'human'.
const _sp = (id, name, extra, cat) => ({ id, name, cat: cat || 'animal', look: Object.assign({ species: id, eyeStyle: 'happy' }, SPECIES_PRESET[id] || {}, SPECIES_OUTFIT[id] || {}, extra || {}) });
// 종족 색 변형 프리셋(같은 종 다른 개체 — 자연 배색식). id는 고유해야 하므로 별도 지정.
const _spv = (id, species, name, over) => ({ id, name, cat: 'variant', look: Object.assign({ species, eyeStyle: 'happy' }, SPECIES_PRESET[species] || {}, SPECIES_OUTFIT[species] || {}, over || {}) });
// 프리셋 줄 카테고리 정의 — presetRow(ui.js)가 이 순서대로 섹션을 그린다.
export const CHIBI_PRESET_GROUPS = [
  { id: 'new', name: '✨ 신작' },
  { id: 'human', name: '사람' },
  { id: 'animal', name: '동물 친구' },
  { id: 'special', name: '로봇 · 귀신' },
  { id: 'variant', name: '동물 색 변형' },
];
export const CHIBI_PRESETS = [
  // ── 사람 완성 룩 ──
  { id: 'girl', name: '기본 여아', look: {} },
  { id: 'boy', name: '기본 남아', look: Object.assign({}, GENDER_PRESET.boy) },
  // 신작 룩 — 줄 앞쪽 배치(발견성). 모달 패널은 세로 스크롤이라 뒤쪽 카드는 폴드에
  // 잘려 "새 캐릭터가 없다"로 인지됨(감독 신고) → 기본 2종 바로 뒤가 정위치.
  { id: 'long_girl', name: '긴 머리 소녀', cat: 'new', look: { hairStyle: 'wave', hairColor: '#6b4530', top: '#ffb3c1', bottomType: 'dress', eyeStyle: 'sparkle', acc: 'flower' } },
  { id: 'long_black', name: '흑발 롱', cat: 'new', look: { hairStyle: 'long', hairColor: '#2b2b33', top: '#a9d6e8', bottom: '#39414f', bottomType: 'skirt', eyeStyle: 'happy' } },
  { id: 'halfup_girl', name: '반묶음 소녀', cat: 'new', look: { hairStyle: 'halfup', hairColor: '#8a5a3b', top: '#c8ecd9', bottomType: 'skirt', bottom: '#95d5b2', eyeStyle: 'happy', acc: 'ribbon' } },
  { id: 'heart_head', name: '하트 머리', cat: 'new', look: { hairStyle: 'heart', hairColor: '#ff8fab', top: '#fffdf7', bottom: '#95d5b2', bottomType: 'skirt', eyeStyle: 'happy', mouth: 'open' } },
  { id: 'heart_head_orange', name: '주황 하트 머리', cat: 'new', look: { hairStyle: 'heart', hairColor: '#f0a05c', top: '#ffb3c1', bottom: '#ff8fab', bottomType: 'dress', eyeStyle: 'happy', mouth: 'smile' } },
  { id: 'artist', name: '화가', cat: 'new', look: { outfit: 'artist', top: '#c7ccd4', bottom: '#39414f', bottomType: 'pants', hairStyle: 'short', hairColor: '#3a2c22', eyeStyle: 'round' } },
  { id: 'artist_girl', name: '화가 소녀', cat: 'new', look: { outfit: 'artist', top: '#a9d6e8', bottom: '#5468c4', bottomType: 'skirt', hairStyle: 'wave', hairColor: '#6b4530', eyeStyle: 'happy' } },
  { id: 'hanbok_f', name: '한복(여)', cat: 'new', look: { outfit: 'hanbok', top: '#c8ecd9', bottom: '#e0596e', bottomType: 'dress', hairStyle: 'buns', hairColor: '#2b2b33', eyeStyle: 'happy', acc: 'flower' } },
  { id: 'hanbok_m', name: '한복(남)', cat: 'new', look: { gender: 'boy', outfit: 'hanbok', top: '#a9d6e8', bottom: '#39414f', bottomType: 'pants', hairStyle: 'short', hairColor: '#2b2b33', eyeStyle: 'round' } },
  { id: 'hoodie', name: '후드', cat: 'new', look: { outfit: 'hoodie', top: '#5468c4', bottom: '#2c3038', bottomType: 'pants', hairStyle: 'short', hairColor: '#2a2320', eyeStyle: 'round', acc: 'none' } },
  { id: 'hoodie_pink', name: '핑크 후드', cat: 'new', look: { outfit: 'hoodie', top: '#ff8fab', bottom: '#39414f', bottomType: 'pants', hairStyle: 'short', hairColor: '#6b4530', eyeStyle: 'happy' } },
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
  _sp('robot', '로봇', { bottomType: 'pants', shoes: '#2c3038', hairStyle: 'bald', mouth: 'smile' }, 'special'),
  _sp('ghost', '귀신', { mouth: 'open', hairStyle: 'bald' }, 'special'),
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
export const FACE_SHAPE_DEF = {
  round: { sx: 1, sy: 1, sz: 1, taper: 0, flat: 0 },
  slim: { sx: 0.95, sy: 1.05, sz: 0.98, taper: 0.05, flat: 0 },
  square: { sx: 1.03, sy: 0.97, sz: 1.0, taper: 0, flat: 0.5 },
  vline: { sx: 0.97, sy: 1.03, sz: 0.98, taper: 0.3, flat: 0 },
};
// 종족별 기본 두상 — "얼굴이 다 동그라미가 아니어도" (다양한 마스코트 두상 참고). 사용자가 고르는
// FACE_SHAPE_DEF는 이 위에 미세 보정으로 얹힌다. human은 기존 하드코딩값(1/0.95/0.97)과
// 동일 → 기존 사용자 시각 변화 0.
export const SPECIES_HEAD_BASE = {
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
