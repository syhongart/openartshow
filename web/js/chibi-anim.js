const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const easeInCubic = (x) => x * x * x;
const easeInOutCubic = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeOutBack = (x) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const CHIBI_ACTION_DUR = {
  // 기존 6 — P1~P6
  wave: 1.7,
  jump: 0.72,
  bow: 1.5,
  clap: 1.6,
  dance: 2.6,
  kick: 0.85,
  // 신규 6 — 무릎 세분화(감독 착수 지시)로 가능해진 동작. 총 12개.
  breakdance: 2.8,
  run: 1.8,
  sit: 1.8,
  jumpingjack: 1.6,
  heart: 1.6,
  sulk: 1.8
};
const CHIBI_ACTIONS = Object.keys(CHIBI_ACTION_DUR);
const CHIBI_ACTION_LABELS = {
  wave: "\uC778\uC0AC",
  jump: "\uC810\uD504",
  bow: "\uC808",
  clap: "\uBC15\uC218",
  dance: "\uCDA4",
  kick: "\uBC1C\uCC28\uAE30",
  breakdance: "\uBE0C\uB808\uC774\uD06C\uB304\uC2A4",
  run: "\uB2EC\uB9AC\uAE30",
  sit: "\uC549\uAE30",
  jumpingjack: "\uD314\uBC8C\uB824\uB6F0\uAE30",
  heart: "\uD558\uD2B8",
  sulk: "\uC090\uC9D0"
};
const SIT_WY_TABLE = [
  0.012,
  0.0223,
  0.0312,
  0.0386,
  0.0446,
  0.049,
  0.0519,
  0.0533,
  0.053,
  0.0512,
  0.0479,
  0.0429,
  0.0365,
  0.0285,
  0.0191,
  83e-4,
  -38e-4,
  -0.0172,
  -0.0319,
  -0.0477,
  -0.0645
];
function sitWrapperY(k) {
  const kk = Math.max(0, Math.min(1, k)) * (SIT_WY_TABLE.length - 1);
  const i0 = Math.floor(kk);
  const i1 = Math.min(SIT_WY_TABLE.length - 1, i0 + 1);
  const f = kk - i0;
  return SIT_WY_TABLE[i0] * (1 - f) + SIT_WY_TABLE[i1] * f;
}
export {
  CHIBI_ACTIONS,
  CHIBI_ACTION_DUR,
  CHIBI_ACTION_LABELS,
  SIT_WY_TABLE,
  easeInCubic,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  sitWrapperY
};
