// tests/world2-overlay-wiring.test.ts — 오버레이 소비자·편집 모드의 **배선**을 잰다.
//
// 계약 자체는 `world2-overlay.test.ts` 가 본다. 여기서 보는 것은 그 계약이 실제로
// 소비되는 경로에서만 깨지는 것들이다 — 순수 함수 테스트가 원리상 못 보는 자리.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ndcOf, rayPlaneY, snapTo, parcelOf, scaleBy } from '../frontend/js/world2/decide/edit-pick.js';
import { reviewOverlay } from '../frontend/js/world2/edit/export.js';
import { loadOverlay, validateOverlay } from '../frontend/js/world2/decide/overlay.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('라이브 격리 — `?edit=1` 없는 세션이 편집 코드를 안 받는다', () => {
  // 이 축이 무너지는 방식은 하나다: 누군가 동적 import 를 정적 import 로 "정리"한다.
  // 그러면 편집 모듈이 기본 번들에 들어가고, 그 사실은 **배포 뒤 번들 크기로만** 드러난다.
  it('features/overlay.ts 에 편집 모듈 정적 import 가 없다', () => {
    const src = read('frontend/js/world2/features/overlay.ts');
    const staticImports = [...src.matchAll(/^\s*import\s[^\n]*from\s+'([^']+)'/gm)].map((m) => m[1]);
    const editImports = staticImports.filter((s) => s.includes('/edit/') || s.startsWith('../edit/'));
    // 타입 전용은 번들에 안 남는다 — 값 import 만 문제다.
    const valueEditImports = editImports.filter((s) => {
      const line = src.split('\n').find((l) => l.includes(`from '${s}'`)) ?? '';
      return !/^\s*import\s+type\b/.test(line);
    });
    expect(
      valueEditImports,
      '★ `edit/` 를 값으로 정적 import 하면 편집 코드가 기본 번들에 들어간다.'
      + ' 동적 `await import(...)` 를 유지할 것.',
    ).toEqual([]);
  });

  it('동적 import 자체는 남아 있다 — 게이트가 빈 주장을 하지 않게', () => {
    const src = read('frontend/js/world2/features/overlay.ts');
    expect(src).toMatch(/await import\('\.\.\/edit\/mode\.js'\)/);
  });
});

describe('편집 패널의 화면 위치 — CSS 는 소스로만 잴 수 있다', () => {
  // ── 여기 있던 다섯 축은 **행위 테스트로 승격됐다**(2026-08-13) ───────────────
  // `tests/world2-edit-listeners.test.ts` 가 `startEditMode` 를 스텁 host 로 돌리고
  // 살아 있는 리스너 수를 직접 센다. 대조표(하나도 버리지 않았다):
  //
  //   옛 축(소스 텍스트)                    → 새 축(행위)
  //   ① 등록이 전부 bindEditListeners 안에  → 「부팅 직후 … 리스너가 하나도 없다」
  //   ② bind/unbind 가 같은 집합            → 「켜면 붙고, 끄면 **전부** 뗀다」
  //                                          + 「여러 번 켜고 꺼도 새지 않는다」(신규)
  //   ③ 부팅 직후는 주행 모드                → 「부팅 직후 … 리스너가 하나도 없다」
  //   ④ 맥 키보드 Delete/Backspace          → 「Backspace 가 실제로 삭제를 부른다」
  //   ⑤ pointercancel 이 드래그 정리         → 「pointercancel 뒤 이동이 물건을 안 끈다」
  //
  // **왜 옮겼나 — 두 가지가 겹쳤다.**
  // (a) 소스 텍스트 축이 약하다는 것은 이미 실측돼 있었다: 검수관이 뮤테이션 4종으로
  //     두들겨 **넷째가 안 잡히는 것을 확인했다**(2026-08-12). 부팅부에서 bind 를 무조건
  //     부르면 주행이 그대로 죽는데 20/20 통과였다 — 등록 코드의 **위치**는 정상이었기
  //     때문이다. 새 축 ①③은 그 형태를 잡는다(리스너를 세므로 «언제 불렸나» 를 본다).
  // (b) 2026-08-13 의 파일 분해에서 이 다섯이 **일제히 빨간불**이 됐다. 동작은 하나도
  //     안 바뀌었는데 코드가 `input.ts` 로 옮겨갔을 뿐이다. 경로만 고쳐 옮기면 이번
  //     구현 형태(`bindEditListeners` 라는 이름, 그 두 함수의 전후 관계)를 박제할 뿐이라
  //     다음 리팩터에 또 깨진다. 태스크 #43 이 이 승격을 이미 열어 두고 있었다.
  //
  // **아래 한 축만 여기 남는다** — CSS 는 jsdom 이 레이아웃을 계산하지 않아 행위로 잴
  // 수단이 없다. 소스 텍스트가 유일한 축이므로 그 한계를 안 채로 남긴다.
  const css = () => read('frontend/js/world2/edit/panel/css.ts');

  it('패널이 왼쪽에 붙지 않는다 — 터치 이동 판정이 화면 왼쪽 절반이다', () => {
    // `decide/touch.ts` 의 `x < viewportWidth / 2` 가 이동 영역이고 조이스틱은 캔버스가
    // 받는다. 폭 212px 패널을 왼쪽에 두면 가로 모드에서 엄지 기둥을 통째로 덮는다.
    const s = css();
    const at = s.indexOf('#w2-edit{');
    expect(at, '#w2-edit 규칙을 못 찾았다 — 이 검사가 공허해진다').toBeGreaterThan(-1);
    const panelRule = s.slice(at, s.indexOf('}', at));
    expect(panelRule, '★ 편집 패널이 화면 왼쪽에 붙었다 — 모바일 이동 조이스틱을 덮는다.')
      .not.toMatch(/(^|;)\s*left:/);
    expect(panelRule).toMatch(/right:/);
    expect(panelRule, '★ safe-area 를 안 쓴다 — iOS 노치·홈 인디케이터와 겹친다.')
      .toMatch(/env\(safe-area-inset-/);
  });
});

describe('팔레트 매니페스트는 실제 파일과 짝이다', () => {
  // 손으로 관리하는 목록이라 어긋난다. 어긋나면 팔레트 버튼이 404 를 부르는데, 화면에는
  // "로드 실패" 만 뜨고 원인이 목록이라는 것은 안 보인다.
  it('index.json 의 models 가 assets/models 의 .glb 집합과 같다', () => {
    const manifest = JSON.parse(read('frontend/assets/models/index.json')) as { models: string[] };
    const actual = fs.readdirSync(path.join(ROOT, 'frontend/assets/models'))
      .filter((f) => f.endsWith('.glb')).sort();
    expect([...manifest.models].sort()).toEqual(actual);
  });
});

describe('작품 이미지 목록은 실제 파일과 짝이다', () => {
  // ⚠ **이 검사가 없던 동안 실패의 모습은 「회색 빈 액자」였다.** 로더가 실패하면 `null` 을
  // 내고 액자는 그대로 서므로(`systems/artwork-scene.ts` 의 「빈 액자가 로드 실패의 표시」),
  // 콘솔 에러도 안 나고 스모크 `[4]` 도 못 본다 — **배포 후 라이브에 가서야** 안다.
  //
  // 위 「팔레트 매니페스트」 검사와 **같은 형태**다(GLB 는 이미 이렇게 지키고 있었는데
  // 작품 이미지만 빠져 있었다, W8-4~W8-7 내내).
  //
  // ⚠⚠ **파일명을 하드코딩하지 않는다**(팀장 조건, W8-8). 지금 걸린 것은 임시 이미지고
  // 감독 실물 작품이 오면 교체된다 — 배치 문서에서 읽어 대조하므로 그때도 그대로 돈다.
  it('world2-overlay.json 의 arts[].src 가 전부 실재한다', () => {
    const raw = JSON.parse(read('frontend/assets/world2-overlay.json')) as {
      arts?: { src?: unknown }[];
    };
    const srcs = (raw.arts ?? []).map((a) => a.src).filter((s): s is string => typeof s === 'string');
    const missing = srcs.filter((src) => {
      // `src` 는 `assets/...` 상대경로다(`decide/artwork.ts` 의 `ART_PREFIX`).
      // 배포에서는 `frontend/assets/` 가 `dist/app/assets` 로 통째 복사된다.
      const rel = src.replace(/^assets\//, '');
      return !fs.existsSync(path.join(ROOT, 'frontend/assets', rel));
    });
    expect(missing, '★ 배치 문서가 가리키는 작품 이미지가 저장소에 없다 — 라이브에서 빈 액자가 된다')
      .toEqual([]);
  });

  it('★ 걸린 작품이 **0개가 아니다** — 이 축이 비면 위 검사가 통과해도 의미가 없다', () => {
    // ⚠ 빈 배열은 `missing` 도 빈 배열이라 위 검사를 **공짜로 통과한다.** 그리고 그것이
    // W8-7 까지의 실제 상태였다(`items: []`) — 그동안 CI 는 그림 재질 경로를 한 줄도
    // 실행하지 않았고, 아무 검사도 그 사실을 말해 주지 않았다.
    const raw = JSON.parse(read('frontend/assets/world2-overlay.json')) as { arts?: unknown[] };
    expect((raw.arts ?? []).length, '★ 라이브 작품이 0개다 — 스모크가 place() 를 안 탄다')
      .toBeGreaterThan(0);
  });

  /**
   * 🔴 **라이브 작품 수의 상한 — 이 값은 판정이다** (팀장 판정 2026-08-18).
   *
   * JSON 에는 주석을 못 다니 **판정을 여기 둔다.** 장수를 올리면 이 테스트가 먼저
   * 빨간불이 되고, 올리는 사람이 아래를 읽게 된다 — 그것이 이 단언의 목적이다.
   *
   * ── 왜 상한이 있나 ─────────────────────────────────────────────────────
   * W8-8 이 작품 3장을 세우자 **CI 스모크가 두 번 연속 FAIL** 했다. `[7]`·`[7.6]` 이
   * 둘 다 *"세션이 안 돌아다녔다(파셀 2개·재방문 1)"* 였다 — 세션이 느려져 leg 예산
   * 안에 목표 파셀을 못 밟은 것이다.
   *
   * 원인을 대조로 갈랐다(`npm run measure:invariants`, 이 컨테이너):
   *
   *   작품 3장 + 조명 4   커버리지 2/3   FAIL   240초
   *   작품 0장 + 조명 4   커버리지 3/3   PASS   105초   ← 작품이 지배 변수다
   *   작품 3장 + 조명 0   커버리지 3/3   PASS   105초
   *
   * 조명을 4 → 1 로 줄여 **로컬은 3/3 으로 통과했지만 CI 는 2/3 으로 떨어졌다**
   * (`23d1a10`, job 95596036919·95596028381 둘 다). 그래서 작품 수를 줄인다.
   *
   * ⚠⚠ **로컬 PASS 는 CI PASS 를 보증하지 않는다.** 같은 조건에서 로컬 3/3 · CI 2/3
   * 이었다 — 이 저장소 규율(*"로컬 스모크 PASS 를 배포 판정 근거로 기재하지 않는다"*)의
   * 실증이고, 「CI 러너가 더 빠르다」는 내 이전 진술은 **틀렸다**(정정: 태스크 #107).
   *
   * ── 🔴 이 상한을 올리려면 무엇이 선행하는가 ────────────────────────────
   * **작품을 늘리는 것 자체는 목적이다** — 감독의 전시가 두 장으로 끝날 리 없다.
   * 그런데 지금 막고 있는 것은 작품도 조명도 아니라 **하네스의 시간 기반 leg 예산**이다:
   * `WALK_MS` 가 고정이라 **프레임률이 곧 이동 거리**가 되고, 그래서 «세계가 무거워지면
   * 커버리지가 떨어진다» 는 결합이 생긴다 — **측정 장치가 측정 대상과 묶여 있다.**
   *
   * 그러므로 **leg 를 거리 기반으로 고치는 것(태스크 #111)이 선행 조건**이다. 그것 없이
   * 장수만 올리면 CI 가 다시 빨간불이 되고, 그때 「작품을 줄이는」 방향으로 되돌아가게
   * 된다 — 목적과 반대 방향이다.
   *
   * ── ⚠ 같은 회차에 이 상한의 근거가 한 번 바뀌었다 ────────────────────────
   * 처음 2로 정한 근거는 **「작품 수를 줄이면 세션이 가벼워진다」** 였는데, 그것이
   * **틀렸다** — 풀 유도식에 작품 수가 안 들어가서 1·2·3장이 전부 풀 7 로 같았고,
   * 로컬 전진 leg 도 23~24 로 평평했다. 작품 수 축소는 원리적으로 효과가 없었다.
   *
   * 실제로 효과를 낸 것은 **조건 2 개정**(풀 = `perParcel × min(작품 파셀 수, 상한)`,
   * `art-light.ts`)이다 — 이 오버레이의 작품 2장이 2파셀이라 풀이 7 → **2** 로 줄었고
   * 로컬 전진 leg 가 23 → **17** 이 됐다(작품 0장일 때가 14다).
   *
   * **그래서 이 상한 2 는 이제 「작품 수가 비용이라서」가 아니라 「CI 로 실측한 지점이
   * 여기까지라서」다.** 올리려면 여전히 CI 실측이 필요하고, 크게 올리려면 #111 이
   * 선행한다(파셀이 흩어지면 풀도 상한까지 다시 는다).
   *
   * ⚠ 팀장 조건: **0장은 부팀장 선에서 결정 금지**(프로젝트 목적 위반). 1장마저 CI 가
   * 실패하면 재에스컬레이션한다.
   */
  it('★ 라이브 작품 수가 상한 안이다 — 올리려면 위 주석을 읽어라', () => {
    const raw = JSON.parse(read('frontend/assets/world2-overlay.json')) as { arts?: unknown[] };
    expect((raw.arts ?? []).length, '★ 작품 수를 올렸다 — CI 스모크 커버리지가 다시 떨어질 수 있다. 태스크 #111 선행')
      .toBeLessThanOrEqual(2);
  });
});

describe('배포되는 배치 파일이 계약을 통과한다', () => {
  // 감독이 내보낸 JSON 을 내가 커밋하는 흐름이라, 깨진 파일이 들어오면 라이브에서
  // **조용히** 빈 오버레이가 된다(`loadOverlay` 는 던지지 않는다). 커밋 시점에 잡는다.
  it('world2-overlay.json 이 무손실이다', () => {
    const raw = JSON.parse(read('frontend/assets/world2-overlay.json'));
    const { issues } = validateOverlay(raw);
    expect(issues, '★ 커밋된 배치 파일에 손실이 있다 — 편집 화면의 내보내기 관문을 다시 거칠 것.')
      .toEqual([]);
    // 두 함수가 같은 말을 하는지도 본다. 계약 헤더가 *"issues 가 비면 무손실"* 이라고
    // 약속한 그 문장이 이 파일에서 실제로 참인가를 재는 자리다.
    expect(loadOverlay(raw).items.length).toBe(validateOverlay(raw).overlay.items.length);
  });
});

describe('내보내기 관문 — 손실이 있으면 clean 이 아니다', () => {
  const ok = { version: 1, items: [{ src: 'assets/models/a.glb', x: 1, y: 0, z: 2, ry: 0, s: 1 }] };

  it('무손실이면 clean', () => {
    const r = reviewOverlay(ok);
    expect(r.clean).toBe(true);
    expect(r.badIndexes).toEqual([]);
    expect(JSON.parse(r.json).items).toHaveLength(1);
  });

  it('값이 잘리면 clean 이 아니고 그 항목을 가리킨다', () => {
    const r = reviewOverlay({ version: 1, items: [ok.items[0], { ...ok.items[0], s: 0 }] });
    expect(r.clean).toBe(false);
    expect(r.badIndexes).toEqual([1]);
    expect(r.summary).toContain('잘림');
  });

  it('경로가 안전하지 않으면 clean 이 아니다 — blob 이 커밋되는 경로', () => {
    const r = reviewOverlay({ version: 1, items: [{ src: 'blob:http://x/y', x: 0, y: 0, z: 0, ry: 0, s: 1 }] });
    expect(r.clean).toBe(false);
    expect(r.summary).toContain('커밋 불가');
  });

  it('관문을 loadOverlay 로 바꾸면 죽는 축 — 깨진 항목이 조용히 살아난다', () => {
    // 계약 헤더 GS-O2 가 경고한 그 갈림이다. `loadOverlay` 는 `x:'NaN'` 을 0 으로
    // **살리고** `validateOverlay` 는 항목째 버린다. 관문이 전자면 화면과 파일이 달라진다.
    const bad = { version: 1, items: [{ src: 'assets/models/a.glb', x: 'NaN', y: 0, z: 0, ry: 0, s: 1 }] };
    expect(loadOverlay(bad).items).toHaveLength(1);
    expect(reviewOverlay(bad).clean).toBe(false);
  });
});

describe('편집 좌표 산술', () => {
  it('NDC — 캔버스 중앙이 0,0 이고 폭이 0 이면 null', () => {
    const rect = { left: 0, top: 0, width: 200, height: 100 };
    // `-0` 이 나오는 자리다(`-(0)`). 레이캐스터에는 무해하므로 부호 0 은 안 가른다.
    const mid = ndcOf(100, 50, rect)!;
    expect(mid.x).toBeCloseTo(0, 12);
    expect(mid.y).toBeCloseTo(0, 12);
    expect(ndcOf(200, 0, rect)).toEqual({ x: 1, y: 1 });
    expect(ndcOf(0, 0, { left: 0, top: 0, width: 0, height: 100 })).toBeNull();
  });

  it('광선 ∩ 지면 — 카메라 뒤쪽 교차는 버린다', () => {
    const down = { ox: 0, oy: 10, oz: 0, dx: 0, dy: -1, dz: 0 };
    expect(rayPlaneY(down, 0)).toEqual({ x: 0, z: 0 });
    // 위를 보는 광선은 y=0 을 **뒤에서** 만난다. 안 거르면 등 뒤에 물건이 쌓인다.
    expect(rayPlaneY({ ...down, dy: 1 }, 0)).toBeNull();
    // 수평 광선은 평면과 평행이다.
    expect(rayPlaneY({ ...down, dy: 0, dx: 1 }, 0)).toBeNull();
  });

  it('스냅 — step 이 0 이하면 그대로', () => {
    expect(snapTo(1.3, 0.5)).toBe(1.5);
    expect(snapTo(1.3, 0)).toBe(1.3);
    expect(snapTo(-1.3, 0.5)).toBe(-1.5);
  });

  it('파셀 변환이 parcel-builder 의 ox = px*cellX 와 짝이다', () => {
    // 원점은 파셀 (0,0) 의 중심이다.
    expect(parcelOf(0, 0, 32, 32)).toEqual({ px: 0, pz: 0, lx: 0, lz: 0 });
    // 셀 하나를 넘어가면 인덱스가 오르고 로컬은 다시 0 근처로 돌아온다.
    expect(parcelOf(32, 0, 32, 32)).toEqual({ px: 1, pz: 0, lx: 0, lz: 0 });
    expect(parcelOf(20, 0, 32, 32)).toEqual({ px: 1, pz: 0, lx: -12, lz: 0 });
    expect(parcelOf(-20, 0, 32, 32)).toEqual({ px: -1, pz: 0, lx: 12, lz: 0 });
  });

  it('크기는 곱셈이라 작은 물건과 큰 물건의 손맛이 같다', () => {
    expect(scaleBy(1, 2)).toBe(2);
    expect(scaleBy(0.05, 2)).toBeCloseTo(0.1, 10);
    // 0 이나 음수가 되는 곱은 무시한다 — 지오메트리가 뒤집히거나 사라진다.
    expect(scaleBy(1, 0)).toBe(1);
    expect(scaleBy(1, -1)).toBe(1);
  });
});

describe('기능 등록', () => {
  it('features/index.ts 가 overlay 를 켠다', () => {
    const src = read('frontend/js/world2/features/index.ts');
    expect(src).toMatch(/import \{ overlayFeature \} from '\.\/overlay\.js'/);
    expect(src).toMatch(/^\s*overlayFeature,\s*$/m);
  });
});
