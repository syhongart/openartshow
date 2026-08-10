// 오버레이 계약 v1 — **경계는 `src` 검증 한 곳, 그리고 진입점 순서 한 곳이다.**
//
// ── 이 테스트가 실제로 무엇을 지키는가 ───────────────────────────────────────
// 나머지(좌표 클램프·기본값)는 화면이 이상해지면 눈에 띈다. 그러나 두 가지는 **눈에 안
// 띈다**:
//   ① `src` 가 새는 것 — 편집 세션에서는 `blob:` URL 로도 모델이 멀쩡히 보이고, 그 상태로
//      내보낸 JSON 이 커밋되면 다른 사람 브라우저에서만 조용히 깨진다(자기완결 위반).
//   ② **진입점 순서** — 버전 판정이 정규화 뒤로 가면 마이그레이션이 통째로 죽는데,
//      각 함수를 따로 부르는 단위 테스트는 그때도 전부 통과한다.
//
// ②는 실제로 일어났다(검수관 B1 반려). 첫 판본은 소비자 진입점을
// `migrateOverlay(normalizeOverlay(json))` 로 적었고, `normalizeOverlay` 가 version 을
// 현재 값으로 덮어써서 **미래 버전 가드가 한 번도 발화하지 않았다.** 단위 테스트는
// `migrateOverlay` 를 직접 불러서 통과했다 — 이 저장소가 이름 붙인 *"순수 함수 안에서만
// 참이었고 정작 통합 지점은 아무 테스트도 안 봤다"* 그 형태다. 그래서 아래 통합 단언은
// **반드시 `loadOverlay` 한 번**으로만 건다.
//
// ── 뮤테이션 실측 (2026-08-10, executor) ────────────────────────────────────
// 초판(19개)에 대해 4건을 돌려 **4/4 검출**했다: `..` 체크 삭제 → 1 failed / `SRC_RE`
// 선두 `^` 삭제 → 2 failed / `isSafeSrc` 가드 삭제 → 2 failed / `S_MIN` 0.01→0 → 1 failed.
// ⚠ **검수관 반려 후 추가한 축(진입점 순서·`clamped`·`items-not-array`·상수 참조)은 아직
// 안 쟀다.** 재측정 항목은 아래 커밋에서 채운다.
//
// ⚠ 그리고 그 뮤테이션이 워킹트리에 얹혀 있는 동안 자동 훅이 *"미커밋 변경을 커밋하라"* 고
// 요구했다 — 그대로 따랐으면 **구멍 뚫린 정규식이 커밋될 뻔했다.** 뮤테이션 중 워킹트리는
// 커밋 대상이 아니다.

import { describe, it, expect } from 'vitest';
import {
  OVERLAY_VERSION, S_MIN, S_MAX, POS_LIMIT,
  emptyOverlay, isSafeSrc, normalizeOverlay, loadOverlay, validateOverlay,
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

  it('같은 파일의 철자를 늘리는 세그먼트를 거부한다 — 캐시·dedupe 가 어긋난다', () => {
    expect(isSafeSrc('assets/models/./x.glb')).toBe(false);
    expect(isSafeSrc('assets/models//x.glb')).toBe(false);
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

describe('loadOverlay — 소비자 진입점 (통합 경로)', () => {
  // ★ 검수관 B1 이 만든 단언이다. 각 함수를 따로 부르면 통과하지만 **진입점 1회로는
  //   실패하던** 결함이 여기서만 잡힌다.
  it('미래 버전 파일은 진입점 한 번으로 비워진다 — 반쯤 해석하지 않는다', () => {
    const raw = {
      version: OVERLAY_VERSION + 1,
      items: [{ src: 'assets/models/a.glb', x: 1, y: 2, z: 3, ry: 0, s: 1 }],
    };
    expect(loadOverlay(raw).items).toHaveLength(0);
    expect(loadOverlay(raw).version).toBe(OVERLAY_VERSION);
  });

  it('현재 버전 파일은 그대로 실린다', () => {
    const raw = {
      version: OVERLAY_VERSION,
      items: [{ src: 'assets/models/a.glb', x: 1, y: 2, z: 3, ry: 0, s: 1 }],
    };
    expect(loadOverlay(raw).items).toHaveLength(1);
  });

  it('version 이 없거나 숫자가 아니면 v1 로 받아 준다 — 손으로 쓴 파일', () => {
    expect(loadOverlay({ items: [{ src: 'assets/models/a.glb' }] }).items).toHaveLength(1);
    expect(loadOverlay({ version: 'x', items: [{ src: 'assets/models/a.glb' }] }).items).toHaveLength(1);
  });

  it('쓰레기 입력에도 빈 오버레이를 돌려준다', () => {
    for (const v of [null, undefined, 42, 'x', [], {}]) {
      expect(loadOverlay(v)).toEqual({ version: OVERLAY_VERSION, items: [] });
    }
  });
});

describe('emptyOverlay — 공유되지 않는다', () => {
  it('호출할 때마다 새 객체를 준다 — 한 소비자의 push 가 다른 소비자에게 보이면 안 된다', () => {
    const a = emptyOverlay();
    a.items.push({ src: 'assets/models/x.glb', x: 0, y: 0, z: 0, ry: 0, s: 1 });
    expect(emptyOverlay().items).toHaveLength(0);
  });
});

describe('normalizeOverlay — 던지지 않고 정규화한다', () => {
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

  // 상수를 리터럴로 미러링하지 않는다(검수관 P2). `toBeLessThanOrEqual(100)` 로 적으면
  // 상수를 **낮추는** 변경에 검출력이 0이다 — 정확히 경계값과 같은지를 본다.
  it('스케일을 정확히 경계값으로 클램프한다 — 0·음수는 모델을 사라지게 하거나 뒤집는다', () => {
    const out = normalizeOverlay({
      items: [
        { src: 'assets/models/a.glb', s: 0 },
        { src: 'assets/models/b.glb', s: -5 },
        { src: 'assets/models/c.glb', s: 1e9 },
      ],
    });
    expect(out.items.map((i) => i.s)).toEqual([S_MIN, S_MIN, S_MAX]);
  });

  it('좌표를 정확히 경계값으로 클램프하고 NaN·Infinity 를 기본값으로 떨어뜨린다', () => {
    const out = normalizeOverlay({
      items: [{ src: 'assets/models/a.glb', x: 1e12, y: NaN, z: Infinity }],
    });
    expect(out.items[0].x).toBe(POS_LIMIT);
    expect(out.items[0].y).toBe(0);
    expect(out.items[0].z).toBe(0);
  });

  it('음수 방향 좌표도 경계값으로 클램프한다', () => {
    const out = normalizeOverlay({ items: [{ src: 'assets/models/a.glb', x: -1e12 }] });
    expect(out.items[0].x).toBe(-POS_LIMIT);
  });

  it('항목이 객체가 아니면 건너뛴다', () => {
    const out = normalizeOverlay({ items: [null, 'x', 42, { src: 'assets/models/a.glb' }] });
    expect(out.items).toHaveLength(1);
  });

  it('출력 version 은 항상 현재 버전이다 — 그래서 버전 판정은 이 함수보다 앞이어야 한다', () => {
    expect(normalizeOverlay({ version: 999, items: [] }).version).toBe(OVERLAY_VERSION);
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
    // 3번은 `src` 가 안전하므로 `overlay` 에는 안 실리지만(bad-number 로 조기 반환)
    // 0번만 살아남는다. 즉 issues 에 오르는 것과 버려지는 것은 **같지 않다**.
    expect(overlay.items.map((i) => i.src)).toEqual(['assets/models/ok.glb']);
    expect(issues).toEqual([
      { index: 1, reason: 'unsafe-src' },
      { index: 2, reason: 'not-object' },
      { index: 3, reason: 'bad-number' },
    ]);
  });

  // ★ 검수관 B2 가 만든 단언. 관문이 "커밋 가능" 이라 말하면서 값을 바꾸면 화면과 파일이
  //   달라지고, 감독은 배포한 뒤에야 안다.
  it('클램프로 값이 바뀌면 그것도 사유로 보고한다 — 관문 통과 = 무손실', () => {
    const { overlay, issues } = validateOverlay({
      items: [{ src: 'assets/models/a.glb', x: 1e9, y: 0, z: 0, ry: 0, s: 0 }],
    });
    expect(issues).toEqual([{ index: 0, reason: 'clamped' }]);
    expect(overlay.items[0].s).toBe(S_MIN);
    expect(overlay.items[0].x).toBe(POS_LIMIT);
  });

  it('items 가 배열이 아니면 사유로 보고한다 — "issues 0 = 안전" 이 거짓이면 안 된다', () => {
    for (const raw of [null, undefined, 42, {}, { items: 'x' }, { items: null }]) {
      const { overlay, issues } = validateOverlay(raw);
      expect(overlay).toEqual({ version: OVERLAY_VERSION, items: [] });
      expect(issues).toEqual([{ reason: 'items-not-array' }]);
    }
  });

  it('전부 정상이면 issues 가 비어 있다 — 이것이 커밋 가능 조건이다', () => {
    const { issues } = validateOverlay({
      version: OVERLAY_VERSION,
      items: [{ src: 'assets/models/a.glb', x: 1, y: 0, z: 2, ry: 0, s: 1 }],
    });
    expect(issues).toEqual([]);
  });

  it('issues 가 비면 수치가 입력 그대로다 — 무손실 계약의 실제 단언', () => {
    const raw = { items: [{ src: 'assets/models/a.glb', x: 12.5, y: -3, z: 7, ry: 1.25, s: 0.5 }] };
    const { overlay, issues } = validateOverlay(raw);
    expect(issues).toEqual([]);
    expect(overlay.items[0]).toEqual({ src: 'assets/models/a.glb', ...{ x: 12.5, y: -3, z: 7, ry: 1.25, s: 0.5 } });
  });
});
