// scripts/lib/code-metrics.mjs
// 코드베이스 규모의 **분류·집계**. 순수 함수 — I/O 없음(파일 목록과 줄 수를 받아 계산만 한다).
//
// ── 왜 순수 함수로 떼어냈나 ────────────────────────────────────────────────
// 이 저장소는 *"판정/집행 분리의 구멍 — 경계를 건너는 지점은 아무도 안 본다"* 로 여러 번
// 사고를 냈다. 그래서 반대로 간다: **분류 규칙은 여기서 테스트하고**, 파일을 읽어 넘기는
// 집행부(`build-architecture.mjs`)는 이 함수를 실제로 호출한다.
//
// ── 이 모듈이 재는 것과 못 재는 것 ────────────────────────────────────────
// 잰다:   추적 파일의 **줄 수**와 영역 분포.
// 못 잰다: 복잡도·중복·죽은 코드. **줄 수는 규모이지 품질이 아니다** — 이 저장소는
//          *"파일 분해 기준을 줄 수 목록으로 삼는 것"* 을 팀장이 명시적으로 기각했다
//          (2026-07-29, 태스크 #111). 기준은 **책임의 혼재**다. 그러니 이 수치는
//          "어디가 큰가" 를 보여줄 뿐 "어디를 쪼개야 하는가" 를 말하지 않는다.

/**
 * 영역 분류 규칙. **순서가 의미를 가진다** — 위에서부터 첫 매치를 쓴다.
 * 좁은 규칙(`world2/`)이 넓은 규칙(`frontend/js/`)보다 **반드시 앞**에 있어야 한다.
 *
 * `vendor` 는 제3자 코드라 따로 뺀다 — 자기완결(외부 호스트 0) 규율의 **대가**가
 * 저장소 안에 그대로 보이는 자리이고, 자체 코드와 섞으면 규모 인식이 왜곡된다.
 */
export const AREAS = [
  { key: 'vendor', label: '벤더(제3자)', vendor: true, test: (p) => /^frontend\/(vendor|utils)\//.test(p) },
  { key: 'world2', label: '오픈월드 world2', test: (p) => p.startsWith('frontend/js/world2/') },
  { key: 'app', label: '앱 코어 frontend/js', test: (p) => p.startsWith('frontend/js/') },
  { key: 'html', label: 'HTML 페이지', test: (p) => /^frontend\/.*\.html$/.test(p) },
  { key: 'front-etc', label: 'frontend 기타', test: (p) => p.startsWith('frontend/') },
  { key: 'smoke', label: '스모크·게이트', test: (p) => p.startsWith('scripts/smoke/') },
  { key: 'scripts', label: '빌드 스크립트', test: (p) => p.startsWith('scripts/') },
  { key: 'tests', label: '테스트', test: (p) => p.startsWith('tests/') },
  { key: 'docs', label: '문서', test: (p) => p.startsWith('docs/') || /^[A-Z]+\.md$/.test(p) },
  { key: 'ci', label: 'CI 워크플로', test: (p) => p.startsWith('.github/') },
  { key: 'etc', label: '기타', test: () => true },
];

/** 경로 → 영역 키. 규칙이 전부 안 맞는 일은 없다(마지막이 catch-all). */
export function classify(path) {
  return AREAS.find((a) => a.test(path)).key;
}

/**
 * 파일별 줄 수를 영역으로 접는다.
 *
 * @param {{path: string, lines: number}[]} entries
 * @returns {{
 *   areas: {key,label,vendor,lines,files,share}[],
 *   total: {lines,files},
 *   own: {lines,files},      // vendor 제외 — "우리가 쓴 것"
 *   vendor: {lines,files},
 * }}
 */
export function aggregate(entries) {
  const byKey = new Map(AREAS.map((a) => [a.key, { ...a, lines: 0, files: 0 }]));
  for (const e of entries) {
    const bucket = byKey.get(classify(e.path));
    bucket.lines += e.lines;
    bucket.files += 1;
  }
  const areas = [...byKey.values()].filter((a) => a.files > 0);
  const sum = (list, f) => list.reduce((n, a) => n + a[f], 0);
  const ownAreas = areas.filter((a) => !a.vendor);
  const vendorAreas = areas.filter((a) => a.vendor);
  const own = { lines: sum(ownAreas, 'lines'), files: sum(ownAreas, 'files') };

  // ⚠ 비중의 분모는 **자체 코드**다(벤더 제외). 벤더를 넣으면 three.module.js 하나가
  //   35% 를 먹어 나머지가 전부 납작해진다 — 보여주려는 것은 "우리 코드의 분포" 다.
  //   벤더 행은 분모 밖이므로 share 를 주지 않는다(0 이 아니라 null — 0 은 "작다" 로
  //   읽히지만 실제로는 "이 축에 속하지 않는다" 이다).
  for (const a of areas) a.share = a.vendor ? null : (own.lines ? a.lines / own.lines : 0);

  return {
    areas: areas.sort((x, y) => y.lines - x.lines),
    total: { lines: sum(areas, 'lines'), files: sum(areas, 'files') },
    own,
    vendor: { lines: sum(vendorAreas, 'lines'), files: sum(vendorAreas, 'files') },
  };
}

/**
 * "큰 파일" 목록에 넣을 수 있는 확장자. **코드만이다.**
 *
 * ⚠ 처음엔 필터가 없었고, 화면을 열어 보니 1·2위가 `docs/DEVLOG.md`(5,781)와
 * `package-lock.json`(3,787)이었다. 둘 다 큰 것이 **정상**이다 — 개발일지는 쌓이는
 * 것이고 lock 파일은 도구가 쓴다. 그것들이 목록에 있으면 "큰 파일 = 손봐야 할 곳"
 * 이라는 읽는 이의 기대를 배신하고, 정작 봐야 할 코드가 아래로 밀린다.
 */
const CODE_EXT = /\.(ts|js|mjs|html|css)$/;

/** 자체 **코드** 중 큰 순서로 N개. 벤더·문서·lock 은 뺀다. */
export function topOwnFiles(entries, n = 10) {
  return entries
    .filter((e) => classify(e.path) !== 'vendor' && CODE_EXT.test(e.path))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, n);
}

/**
 * 테스트 대 구현 비율. **품질 지표가 아니다** — 안전망의 두께를 보여줄 뿐이고,
 * 이 저장소는 *"테스트 통과는 검출력의 증거가 아니다"* 를 규율로 갖고 있다
 * (그래서 뮤테이션으로 확인한다). 그 문장을 페이지에도 같이 싣는다.
 */
export function testRatio(agg) {
  const t = agg.areas.find((a) => a.key === 'tests');
  if (!t) return null;
  const impl = agg.own.lines - t.lines;
  return impl > 0 ? t.lines / impl : null;
}
