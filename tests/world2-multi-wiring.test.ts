// @vitest-environment node
//
// **다문서 로더의 집행 배선** — 계획이 실제로 소비되는가.
//
// ── 왜 이 파일이 따로 있나 ─────────────────────────────────────────────────
// `decide/multi-overlay.ts` 는 순수해서 **계획이 옳은지**를 실제로 돌려 확인한다
// (`world2-multi-overlay.test.ts`). 하지만 그 계획을 **`features/overlay.ts` 가 실제로
// 쓰는지**는 그 테스트가 못 본다 — 이 저장소가 이름 붙인 *"계산된 값이 실제로 소비되는가"*
// 그대로다.
//
// `features/` 는 three 를 import 하므로 노드가 실행할 수 없다. 그래서 **소스 텍스트**로
// 배선을 본다. 텍스트 검사의 한계(제어흐름을 안 본다)를 알고 쓰되, **끊기면 잡히는**
// 최소치는 지킨다.
//
// ── 지키는 명제 넷 ─────────────────────────────────────────────────────────
// ① **하위호환** — 대장이 없으면 옛 단일 문서 경로. 그 분기가 사라지면 라이브 회귀다
// ② **`setAll` 은 한 번** — 루프 안에서 부르면 마지막 작가 것만 남는다
// ③ **문서를 하나씩 받는다** — `Promise.all` 은 한 요청의 예외가 전부를 reject 한다
// ④ **경로는 저장소가 소유한다** — 이 파일이 직접 `fetch` 하면 어댑터가 무의미해진다

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = readFileSync(
  fileURLToPath(new URL('../frontend/js/world2/features/overlay.ts', import.meta.url)), 'utf8',
);
/** 주석을 걷은 본문. 배선은 **실행되는 것**만 본다 */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('계획을 실제로 쓴다', () => {
  it('★ `planMerge` 로 계획을 만든다 — 안 쓰면 순수 테스트가 전부 장식이다', () => {
    expect(CODE, '★ 계획을 안 만든다').toMatch(/planMerge\(\s*ledger\s*,\s*docs\s*\)/);
  });

  it('★ `want` 를 계획 총량에서 받는다 — 한 문서 개수만 세면 완주 판정이 틀린다', () => {
    expect(CODE, '★ `beginAttach` 가 계획을 안 본다').toMatch(/beginAttach\(diag,\s*totalItems\(plan\)\)/);
  });

  it('★ 그룹마다 붙인다 — 하나로 합쳐 돌리면 한 작가 실패가 뒤를 막는다', () => {
    expect(CODE, '★ 그룹 루프가 없다').toMatch(/for\s*\(const group of plan\.groups\)/);
    expect(CODE, '★ 그룹의 items 를 안 넘긴다').toMatch(/items:\s*group\.items/);
  });

  it('★ `setAll` 을 **한 번만** 부른다 — 루프 안에 있으면 마지막 것만 남는다', () => {
    const calls = [...CODE.matchAll(/village\.setAll\(/g)];
    expect(calls, `★ setAll 호출이 ${calls.length}회다`).toHaveLength(1);
    expect(CODE, '★ 합쳐진 파셀이 아니라 한 문서 것을 넣는다')
      .toMatch(/village\.setAll\(plan\.parcels\)/);

    // 그룹 루프 **밖**이어야 한다. 루프 시작 위치보다 앞이면 안전하다.
    const setAllAt = CODE.indexOf('village.setAll(');
    const loopAt = CODE.indexOf('for (const group of plan.groups)');
    expect(setAllAt, '★ setAll 이 그룹 루프 안으로 들어갔다').toBeLessThan(loopAt);
  });
});

describe('★ 하위호환 — 대장이 없으면 지금과 똑같이 뜬다', () => {
  it('★ 옛 단일 문서 경로가 남아 있다', () => {
    expect(CODE, '★ 옛 경로가 사라졌다 — 대장 없는 지금 라이브가 빈 마을이 된다')
      .toContain('loadLegacyOverlay()');
  });

  it('★ 작가가 0명일 때 그 경로로 간다', () => {
    expect(CODE, '★ 분기 조건이 없다').toMatch(/who\.length === 0/);
  });

  it('★ 옛 경로에서는 `surfaces` 를 그대로 쓴다 — 그것이 지금 라이브 동작이다', () => {
    expect(CODE, '★ 단일 문서의 재질을 버린다 — 감독이 칠한 마을이 회색이 된다')
      .toMatch(/setSurfaces\(one\.surfaces\)/);
  });

  it('★ 여러 작가일 때는 작가 문서의 재질을 안 쓴다 (감독 카드 「마을 공통」)', () => {
    // ⚠ **호출 횟수를 세면 안 된다.** 첫 판본이 그랬고 빨간불이 났다 — `OverlayHost` 가
    // 편집용 `setSurfaces` 메서드를 **정의**하는 자리(`s => env.setSurfaces(s)`)까지 함께
    // 세었기 때문이다. 그것은 부팅 경로가 아니라 **편집이 재질을 바꿀 때 쓰는 문**이다.
    //
    // 재는 축은 «작가 문서에서 온 재질이 흘러 들어가는가» 다. 그 형태만 본다.
    for (const bad of ['parsed.surfaces', 'group.surfaces', 'doc.surfaces', 'plan.surfaces']) {
      expect(CODE, `★ 작가 문서의 재질(${bad})이 마을에 들어간다`).not.toContain(bad);
    }
    // 부팅이 넘기는 것은 **옛 단일 문서의 것 하나뿐**이다.
    const bootCalls = [...CODE.matchAll(/env\.setSurfaces\(([^)]*)\)/g)].map((m) => m[1].trim());
    expect(bootCalls.filter((a) => a !== 's'), '★ 부팅이 넘기는 재질이 하나가 아니다')
      .toEqual(['one.surfaces']);
  });
});

describe('★ 실패 격리가 배선에서도 지켜진다', () => {
  it('★ 문서를 하나씩 받는다 — `Promise.all` 은 한 요청 실패가 전부를 죽인다', () => {
    expect(CODE, '★ 문서 로드를 Promise.all 로 묶었다 — 실패 격리가 깨진다')
      .not.toMatch(/Promise\.all\([^)]*loadOverlay/);
    expect(CODE, '★ 작가 루프가 없다').toMatch(/for\s*\(const owner of who\)/);
  });

  it('★ 저장소가 사유를 그대로 넘긴다 — 「왜 빠졌나」가 계획까지 흘러야 한다', () => {
    expect(CODE).toMatch(/failure:\s*got\.failure/);
  });
});

describe('★ 경로는 저장소가 소유한다', () => {
  it('★ 이 파일이 배치 파일을 직접 fetch 하지 않는다 — 어댑터가 무의미해진다', () => {
    expect(CODE, '★ 옛 경로 상수가 되살아났다')
      .not.toMatch(/['"]assets\/world2-overlay\.json['"]/);
    expect(CODE, '★ 저장소를 안 쓴다').toContain('createStaticStore()');
  });

  it('진단이 여러 작가를 말한다 — 스모크가 판정할 수 있어야 한다', () => {
    for (const f of ['diag.owners', 'diag.ledgerIssues', 'diag.mergeIssues']) {
      expect(CODE, `★ ${f} 를 안 채운다`).toContain(f);
    }
  });
});

describe('★ 내보내기가 작품을 들고 나간다 (W8-4 D1.5)', () => {
  // 🔴 **이 축이 0이라서 작품이 조용히 사라지고 있었다.** `toRaw()` 반환에 `arts` 가
  // 없었고, 계약이 `undefined` 를 issue 없이 `[]` 로 채워 **`clean === true`·화면은
  // 「무손실」**이었다. 같은 함수의 주석이 *"읽은 것이 그대로 나가야 한다"* 를 두 번
  // 적고 있었으니 **문장이 거짓**이던 것이다.
  //
  // ⚠ **이 검사는 텍스트다 — 약한 축인 것을 알고 쓴다.** `toRaw()` 를 실제로 돌리려면
  // `overlayFeature.create(env)` 가 필요하고 `FeatureEnv` 는 `scene`·`adapter`·`player`·
  // `pools`·`village` 를 요구해 스텁 비용이 이 회차 범위를 넘는다. 그래서 **0을 1로**
  // 만들되, 실물 왕복(브라우저에서 실제로 내보내기를 눌러 `arts` 가 나오는지)은 **D4 가**
  // 잰다. 그때까지 이 축은 「지워지면 안다」까지만 보증한다.
  // 더 강한 처방(=`toRaw` 를 순수 함수로 분리해 실행으로 재기)은 태스크로 남겼다.
  it('★ `toRaw` 가 `arts` 를 낸다 — 빠지면 작품이 사라지는데 화면은 「무손실」이라 한다', () => {
    const from = CODE.indexOf('function toRaw(');
    expect(from, '★ toRaw 를 못 찾았다 — 이 검사가 헛돈다').toBeGreaterThan(-1);
    const body = CODE.slice(from, CODE.indexOf('\n    }', from));
    expect(body, '★ 내보내기에서 작품이 빠졌다').toMatch(/arts:/);
  });

  it('★ 로드한 작품을 포트에 넣는다 — 통로가 끊기면 언제나 빈 배열이 나간다', () => {
    // ⚠ D2 에서 형태가 바뀌었다: 지역 변수(`loadedArts`)가 아니라
    // `systems/art-port.ts` 가 목록을 **소유한다**. 편집이 같은 목록에 더해야 해서다.
    // 재는 것은 여전히 하나 — 「읽은 것이 실제로 보관되는가」.
    expect(CODE, '★ plan.arts 를 포트에 안 넣는다').toMatch(/arts\.set\(plan\.arts\)/);
  });
});

describe('★ 벽에 건 작품이 부팅에 꽂혔다 (W8-4)', () => {
  it('★ 씬을 만들고 **포트에 물린다** — 안 물리면 목록만 바뀌고 화면은 그대로다', () => {
    expect(CODE, '★ 액자 씬을 안 만든다').toContain('mountArtworks(');
    expect(CODE, '★ 씬을 포트에 안 물린다 — 편집으로 건 작품이 화면에 안 뜬다')
      .toMatch(/arts\.attach\(artScene\)/);
  });

  it('★ **편집 세션은 작품 0개여도 로더를 받는다** (W8-4 D2)', () => {
    // 🔴 검수관 B3-2 가 실측한 구멍이 여기였다: `arts` 0 · GLB 0 이면 `ensureLoader()` 가
    // 안 불려 `THREE` 가 null 이고 씬이 아예 안 선다. 라이브는 그래도 되지만 **편집은
    // 그 순간 걸 곳이 없다** — 걸어도 목록만 늘고 화면에는 아무것도 안 뜬다.
    expect(CODE, '★ 편집인데 three 를 안 받는다 — 걸어도 화면에 안 뜬다')
      .toMatch(/plan\.arts\.length > 0 \|\| wantEdit/);
  });

  it('★ 편집에 작품 포트를 넘긴다 — 안 넘기면 이미지 드롭이 통째로 없다', () => {
    const from = CODE.indexOf('startEditMode(host, {');
    expect(from, '★ startEditMode 호출을 못 찾았다 — 이 검사가 헛돈다').toBeGreaterThan(-1);
    expect(CODE.slice(from, CODE.indexOf('});', from)), '★ arts 를 안 넘긴다')
      .toMatch(/\barts\b/);
  });

  it('★ **작품이 0개여도 씬을 만든다** — 라이트 풀이 부팅에 서야 개수 불변식이 성립한다', () => {
    // 조건 1 의 집행 지점이다. `plan.arts.length > 0` 로 **씬 생성 자체**를 감싸면
    // 작품이 생기는 순간 라이트가 늘어 `[7]` 이 증식으로 읽는다.
    // ⚠ 첫 판본은 `if (plan.arts.length > 0)` 라는 **문자열을 찾아** 그 줄만 봤고,
    // `if (THREE && plan.arts.length > 0)` 로 감싸는 뮤테이션(C8)을 **놓쳤다**
    // — 원본의 `ensureLoader` 줄이 먼저 잡혀 검사가 거기서 끝났기 때문이다.
    // 축을 바꾼다: **씬 생성을 감싸는 조건문에 작품 개수가 나오면 안 된다.**
    const make = CODE.indexOf('mountArtworks(');
    expect(make).toBeGreaterThan(-1);
    const head = CODE.lastIndexOf('if (', make);
    expect(head, '★ 씬 생성이 조건문 밖에 있다 — 이 검사가 헛돈다').toBeGreaterThan(-1);
    const cond = CODE.slice(head, make);
    expect(cond, '★ 작품 유무가 씬 생성을 가른다 — 라이트 풀이 나중에 서서 개수가 변한다')
      .not.toMatch(/arts[.\s]*\.?length/);
  });

  it('★ 경로 결합기로 **포트의 `resolve`** 를 넘긴다 — 미리보기가 그 자리에서 갈린다', () => {
    // 로더 자체의 배선은 `systems/artwork-scene.ts` 가 소유하고, 그것이 실제로 붙는지는
    // `world2-artwork-scene.test.ts` 가 **실행으로** 잰다(텍스트보다 강한 축이다).
    // 여기서는 부팅이 결합기를 넘기는지만 본다.
    //
    // ⚠ D2 에서 `assetUrl` → `arts.resolve` 로 바뀌었다. 편집으로 건 작품은 저장소에
    // 아직 없는 경로를 갖고 세션 안에서는 `blob:` 로만 보인다 — `assetUrl` 을 그대로
    // 넘기면 그 미리보기가 404 가 되고 **액자가 회색으로 뜬다**(W8-4 C 가 겪은 증상).
    expect(CODE, '★ 결합기를 안 넘긴다').toMatch(/mountArtworks\([^)]*arts\.resolve/);
  });

  it('★ 진단이 작품·조명을 말한다 — 스모크가 판정할 수 있어야 한다', () => {
    expect(CODE).toMatch(/art: artScene\?\.stats\(\)/);
  });

  it('★ 떠날 때 정리한다', () => {
    expect(CODE).toContain('artScene?.dispose()');
  });
});
