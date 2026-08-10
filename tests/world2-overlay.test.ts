// 오버레이 계약 v1 — **경계는 `src` 검증 한 곳이다.**
//
// ── 이 테스트가 실제로 무엇을 지키는가 ───────────────────────────────────────
// 나머지(좌표 클램프·기본값)는 화면이 이상해지면 눈에 띈다. 그러나 `src` 가 새는 것은
// **눈에 안 띈다** — 편집 세션에서는 `blob:` URL 로도 모델이 멀쩡히 보이고, 그 상태로
// 내보낸 JSON 이 커밋되면 다른 사람 브라우저에서만 조용히 깨진다(자기완결 위반).
// 그래서 거부 케이스를 스킴·호스트·상위탈출·확장자로 **나눠서** 센다.
//
// ── 뮤테이션 실측 (2026-08-10, executor) ────────────────────────────────────
// 19개가 통과하는 것은 검출력의 증거가 아니다. 결함을 하나씩 되살려 실제로 FAIL 이 나는지
// 쟀다 — **4/4 전부 검출**, 0 failed 케이스 없음:
//
//   ① `isSafeSrc` 의 `src.includes('..')` 줄 삭제        → 1 failed  (상위 탈출)
//   ② `SRC_RE` 의 선두 `^` 삭제                          → 2 failed  (스킴 / 호스트상대·절대)
//   ③ `normalizeOverlay` 의 `if (!isSafeSrc(…)) continue` → 2 failed  (필터링 / issues)
//   ④ 스케일 클램프 `S_MIN` 0.01 → 0                     → 1 failed  (스케일)
//
// ②가 가장 중요했다 — 선두 고정이 없으면 `blob:http://x/assets/models/a.glb` 가 통과하는데,
// **정규식이 그대로 있는 채로** 열리는 구멍이라 코드를 읽어서는 안 보인다. 그리고 실제로
// 이 뮤테이션이 워킹트리에 얹혀 있는 동안 자동 훅이 *"미커밋 변경을 커밋하라"* 고 요구했다
// — 그대로 따랐으면 **구멍 뚫린 정규식이 커밋될 뻔했다.** 뮤테이션 중 워킹트리는 커밋
// 대상이 아니다.

import { describe, it, expect } from 'vitest';
import {
  OVERLAY_VERSION, EMPTY_OVERLAY,
  isSafeSrc, normalizeOverlay, migrateOverlay, validateOverlay,
} from '../frontend/js/world2/decide/overlay.js';

describe('isSafeSrc — 자산 경로 경계', () => {
  it('저장소 상대경로를 허용한다', () => {
    expect(isSafeSrc('assets/models/lab-space.glb')).toBe(true);
    expect(isSafeSrc('assets/models/village/hall.glb')).toBe(true);
    expect(isSafeSrc('assets/models/a_b-c.1.glb')).toBe(true);
  });

  it('스킴이 붙은 것을 전부 거부한다 — 자기완결 경계', () => {
    expect(isSafeSrc('blob:http://x/assets/models/a.glb')).toBe(false);
    expect(isSafeSrc('http://x/assets/models/a.glb')).toBe(false);
    expect(isSafeSrc('https://x/assets/models/a.glb')).toBe(false);
    expect(isSafeSrc('data:application/octet-stream;base64,AAAA')).toBe(false);
  });

  it('호스트 상대(//) 와 절대 경로를 거부한다', () => {
    expect(isSafeSrc('//evil.example/assets/models/a.glb')).toBe(false);
    expect(isSafeSrc('/assets/models/a.glb')).toBe(false);
  });

  it('상위 탈출을 거부한다', () => {
    expect(isSafeSrc('assets/models/../../secrets.glb')).toBe(false);
    expect(isSafeSrc('assets/models/..%2Fx.glb')).toBe(false);
  });

  it('디렉터리와 확장자를 강제한다', () => {
    expect(isSafeSrc('assets/textures/a.glb')).toBe(false); // 다른 디렉터리
    expect(isSafeSrc('assets/models/a.gltf')).toBe(false);  // .glb 아님
    expect(isSafeSrc('assets/models/')).toBe(false);        // 파일명 없음
  });

  it('문자열이 아닌 것을 거부한다', () => {
    for (const v of [null, undefined, 42, {}, ['assets/models/a.glb']]) {
      expect(isSafeSrc(v)).toBe(false);
    }
  });
});

describe('normalizeOverlay — 던지지 않고 정규화한다', () => {
  it('쓰레기 입력에도 빈 오버레이를 돌려준다', () => {
    for (const v of [null, undefined, 42, 'x', [], {}]) {
      expect(normalizeOverlay(v)).toEqual({ version: OVERLAY_VERSION, items: [] });
    }
  });

  it('안전하지 않은 src 를 가진 항목만 버리고 나머지는 살린다', () => {
    const out = normalizeOverlay({
      version: 1,
      items: [
        { src: 'assets/models/ok.glb', x: 1, y: 2, z: 3, ry: 0.5, s: 2 },
        { src: 'blob:http://x/a.glb', x: 9, y: 9, z: 9, ry: 0, s: 1 },
        { src: 'assets/models/ok2.glb', x: 0, y: 0, z: 0, ry: 0, s: 1 },
      ],
    });
    expect(out.items.map((i) => i.src)).toEqual(['assets/models/ok.glb', 'assets/models/ok2.glb']);
    expect(out.items[0]).toEqual({ src: 'assets/models/ok.glb', x: 1, y: 2, z: 3, ry: 0.5, s: 2 });
  });

  it('빠진 수치는 기본값으로 채운다', () => {
    const out = normalizeOverlay({ items: [{ src: 'assets/models/a.glb' }] });
    expect(out.items[0]).toEqual({ src: 'assets/models/a.glb', x: 0, y: 0, z: 0, ry: 0, s: 1 });
  });

  it('스케일을 클램프한다 — 0·음수는 모델을 사라지게 하거나 뒤집는다', () => {
    const out = normalizeOverlay({
      items: [
        { src: 'assets/models/a.glb', s: 0 },
        { src: 'assets/models/b.glb', s: -5 },
        { src: 'assets/models/c.glb', s: 1e9 },
      ],
    });
    expect(out.items.every((i) => i.s > 0)).toBe(true);
    expect(out.items[2].s).toBeLessThanOrEqual(100);
  });

  it('좌표를 클램프하고 NaN·Infinity 를 기본값으로 떨어뜨린다', () => {
    const out = normalizeOverlay({
      items: [{ src: 'assets/models/a.glb', x: 1e12, y: NaN, z: Infinity }],
    });
    expect(Number.isFinite(out.items[0].x)).toBe(true);
    expect(out.items[0].x).toBeLessThanOrEqual(100_000);
    expect(out.items[0].y).toBe(0);
    expect(out.items[0].z).toBe(0);
  });

  it('항목이 객체가 아니면 건너뛴다', () => {
    const out = normalizeOverlay({ items: [null, 'x', 42, { src: 'assets/models/a.glb' }] });
    expect(out.items).toHaveLength(1);
  });

  it('출력 version 은 항상 현재 버전이다', () => {
    expect(normalizeOverlay({ version: 999, items: [] }).version).toBe(OVERLAY_VERSION);
  });
});

describe('migrateOverlay', () => {
  it('현재 버전은 그대로 통과시킨다', () => {
    const o = { version: OVERLAY_VERSION, items: [] };
    expect(migrateOverlay(o)).toBe(o);
  });

  it('미래 버전은 비운다 — 반쯤 해석한 마을을 보여주지 않는다', () => {
    const out = migrateOverlay({
      version: OVERLAY_VERSION + 1,
      items: [{ src: 'assets/models/a.glb', x: 0, y: 0, z: 0, ry: 0, s: 1 }],
    });
    expect(out.items).toHaveLength(0);
    expect(out.version).toBe(OVERLAY_VERSION);
  });

  it('EMPTY_OVERLAY 는 계약을 만족한다', () => {
    expect(migrateOverlay(normalizeOverlay(EMPTY_OVERLAY))).toEqual(EMPTY_OVERLAY);
  });
});

describe('validateOverlay — 내보내기 관문', () => {
  it('무엇이 왜 거부됐는지 인덱스와 함께 돌려준다', () => {
    const { overlay, issues } = validateOverlay({
      items: [
        { src: 'assets/models/ok.glb' },
        { src: 'blob:http://x/a.glb' },
        null,
        { src: 'assets/models/ok2.glb', x: 'NaN' },
      ],
    });
    // 버려지는 것은 1·2번뿐이다 — 3번은 `src` 가 안전하므로 살아남고 `x` 만 기본값이 된다.
    // 즉 `issues` 에 오르는 것과 버려지는 것은 **같지 않다**. 편집 UI 는 그래서 issues 를
    // 봐야 한다(내보내기가 조용히 값을 바꾼 것도 감독에게 보여야 한다).
    expect(overlay.items).toHaveLength(2);
    expect(issues).toEqual([
      { index: 1, reason: 'unsafe-src' },
      { index: 2, reason: 'not-object' },
      { index: 3, reason: 'bad-number' },
    ]);
  });

  it('전부 정상이면 issues 가 비어 있다 — 이것이 커밋 가능 조건이다', () => {
    const { issues } = validateOverlay({
      version: OVERLAY_VERSION,
      items: [{ src: 'assets/models/a.glb', x: 1, y: 0, z: 2, ry: 0, s: 1 }],
    });
    expect(issues).toEqual([]);
  });

  // ⚠️ 여기 원래 *"`normalizeOverlay` 와 결과가 일치한다"* 를 넣었다가 지웠다.
  // `validateOverlay` 가 `normalizeOverlay(raw)` 를 **그대로 부르는** 구현이라 그 단언은
  // 어떤 결함을 넣어도 안 깨진다 — 검출력이 구조적으로 0인 장식이었다.

  it('items 가 배열이 아니면 빈 오버레이와 빈 issues 를 돌려준다', () => {
    for (const raw of [null, undefined, 42, {}, { items: 'x' }, { items: null }]) {
      const { overlay, issues } = validateOverlay(raw);
      expect(overlay).toEqual({ version: OVERLAY_VERSION, items: [] });
      expect(issues).toEqual([]);
    }
  });
});
