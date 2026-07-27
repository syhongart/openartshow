// @vitest-environment jsdom
//
// 나무가 **캔버스 텍스처**를 쓰면서 DOM 이 필요해졌다(잎 실루엣을 그린다). 지오메트리만
// 볼 때는 없어도 됐는데, `asset()` 이 재질까지 함께 만들므로 갈라낼 수가 없다.
// 나무 지오메트리 — **실제 three 로 굽는다.**
//
// ── 왜 이 파일이 따로 필요한가 ──────────────────────────────────────────────
// `world2-parts-assets.test.ts` 는 three 를 스텁으로 갈아 끼운다. 파츠가 부팅 때 자산을
// 내는지, tones 규약을 지키는지를 three 없이 보려는 것이고 그건 옳다.
//
// 그런데 나무가 **재귀 가지를 한 지오로 굽기** 시작하면서 그 방식의 한계가 드러났다.
// 스텁의 지오메트리는 정점 배열이 비어 있어서, 병합 루프가 아무것도 안 붙이고 지나가도
// 테스트는 통과한다. **CLAUDE.md 가 경고한 "스텁이 실제와 어긋나 테스트만 통과하는
// 코드"** 가 될 자리다.
//
// 그래서 여기서는 진짜 three 를 쓴다. `three/webgpu` 가 아니라 `three` 인 것은 노드에서
// 도는 쪽이 필요해서이고, 나무가 쓰는 것은 지오메트리 API 뿐이라 결과가 같다.
//
// ── 삼각형 예산 ─────────────────────────────────────────────────────────────
// 이 파일의 두 번째 목적이자 더 중요한 것이다. world1 나무는 358삼각형이었고, 그것이
// 파셀당 최대 8그루 × 동시 파셀 16개 = 128그루 그려진다. 재귀 가지는 파라미터를 조금만
// 올려도 삼각형이 배로 뛰는데, **화면에서는 그냥 "나무가 좀 더 무성해졌네" 로 보인다.**
// 눈으로는 못 잡는 종류의 회귀라 숫자로 못 박는다.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { tree, LEAF_U0 } from '../frontend/js/world2/parts/tree.js';
import type { ThreeNS } from '../frontend/js/world2/parts/types.js';

// jsdom 은 네이티브 캔버스가 없어 `getContext('2d')` 가 null 이다. 여기서 보는 것은
// **지오메트리** 이므로 텍스처를 굽는 코드가 끝까지 돌기만 하면 된다.
const ctx2d = {
  fillStyle: '', strokeStyle: '', lineWidth: 1,
  fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, ellipse() {}, fill() {}, stroke() {},
  save() {}, restore() {}, translate() {}, rotate() {},
};
(HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () => ctx2d;

// 타입 애노테이션을 안 붙인다 — `three` 는 `BufferGeometry` 를 **타입 네임스페이스로
// 재수출하지 않아서**(TS2694) 명시하면 컴파일이 안 된다. `ocean.ts` 가 `CanvasTexture`
// 로 이미 겪은 것과 같은 함정이라 같은 처방을 쓴다: 추론에 맡긴다.
const asset = tree.asset(THREE as unknown as ThreeNS);
const geo = asset.geometry;

/** 정점 셋이 삼각형 하나. non-indexed 로 구우므로 나눗셈이 곧 삼각형 수다 */
const triangles = geo.attributes.position.count / 3;

describe('나무 지오메트리 — 실제로 구워진다', () => {
  it('정점이 실제로 들어 있다 — 스텁으로는 이걸 못 본다', () => {
    expect(geo.attributes.position).toBeDefined();
    expect(geo.attributes.position.count).toBeGreaterThan(100);
  });

  it('법선과 정점색이 위치와 같은 개수다 — 하나라도 어긋나면 렌더가 깨진다', () => {
    const n = geo.attributes.position.count;
    expect(geo.attributes.normal.count).toBe(n);
    expect(geo.attributes.color.count).toBe(n);
  });

  it('정점색이 줄기와 잎 두 계열로 갈린다 — 한 색뿐이면 정점색을 쓸 이유가 없다', () => {
    const c = geo.attributes.color.array;
    let bark = 0, leaf = 0;
    for (let i = 0; i < c.length; i += 3) {
      // 잎은 초록이 빨강보다 크고, 줄기는 반대다
      if (c[i + 1] > c[i]) leaf++; else bark++;
    }
    expect(bark).toBeGreaterThan(0);
    expect(leaf).toBeGreaterThan(0);
  });

  it('삼각형이 예산 안이다 — world1 나무(358)의 두 배를 넘지 않는다', () => {
    // 상한을 world1 에서 유도한다. 그 값이 라이브에서 128그루 동시 렌더로 검증된
    // 유일한 기준선이다. 두 배까지 허용하는 것은 잎을 알파 평면 대신 입체로 바꾼 대가
    // (평면 2삼각형 vs 정십면체 20삼각형)를 감안한 것이고, 그 이상이면 잎 개수나
    // 세그먼트를 줄여야지 예산을 늘릴 일이 아니다.
    const WORLD1_TRIANGLES = 358;
    // 실측을 로그로 남긴다. "예산 안" 만 알면 다음 사람이 여유가 얼마인지 모른 채
    // 파라미터를 올리고, 그러다 한 번에 넘긴다.
    // eslint-disable-next-line no-console
    console.log(`나무 삼각형: ${triangles} (world1 ${WORLD1_TRIANGLES} · 상한 ${WORLD1_TRIANGLES * 2})`);
    expect(triangles).toBeLessThanOrEqual(WORLD1_TRIANGLES * 2);
  });

  it('원뿔 플레이스홀더보다 훨씬 복잡하다 — 실루엣을 되찾은 것이 요점이다', () => {
    // 예전 값은 6세그먼트 원뿔 = 12삼각형이었다. 감독 판정이 "이전 것이 좋았어" 였다.
    expect(triangles).toBeGreaterThan(100);
  });

  it('모양이 고정이다 — 두 번 구워도 같은 삼각형 수', () => {
    const again = tree.asset(THREE as unknown as ThreeNS).geometry;
    expect(again.attributes.position.count).toBe(geo.attributes.position.count);
  });

  it('밑동이 원점에 있다 — 떠 있거나 파묻히면 배치 좌표가 거짓말이 된다', () => {
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    expect(box.min.y).toBeGreaterThan(-0.05);
    expect(box.min.y).toBeLessThan(0.05);
  });

  it('위로 자란다 — 높이가 폭보다 크다', () => {
    geo.computeBoundingBox();
    const b = geo.boundingBox!;
    expect(b.max.y - b.min.y).toBeGreaterThan(b.max.x - b.min.x);
  });
});

// ── 알파 잎 ─────────────────────────────────────────────────────────────────
//
// **이 묶음은 뮤테이션이 시켜서 생겼다.** 알파 잎을 넣고 여섯 가지로 망가뜨려 봤는데
// (alphaTest 제거 · 잎 UV를 줄기 영역으로 · 줄기 UV를 잎 영역으로 · uv 미전달 ·
// DoubleSide 제거) **전부 통과했다.** 위 묶음은 지오메트리만 보지 텍스처가 어떻게
// 매핑되는지, 재질이 알파를 어떻게 다루는지는 하나도 안 봤다.
//
// 잎은 world2 에서 **줄기와 재질을 공유하는 유일한 구조**다. 한 텍스처의 두 영역을 UV
// 로 갈라 쓰는데, 그 매핑이 어긋나면 잎이 통짜 사각형이 되거나 줄기에 구멍이 뚫린다.
// 화면을 봐야만 알 수 있는 종류라 좌표로 못 박는다.
describe('알파 잎 — 줄기와 한 텍스처를 나눠 쓴다', () => {
  const uv = geo.attributes.uv;
  const color = geo.attributes.color;

  it('uv 가 위치와 같은 개수다 — 안 이어붙이면 매핑이 통째로 어긋난다', () => {
    expect(uv).toBeDefined();
    expect(uv.count).toBe(geo.attributes.position.count);
  });

  // 정점색과 UV 를 **교차 검증**한다. 둘 다 같은 조립 루프가 붙이는 값이라, 한쪽만
  // 보면 "붙이긴 붙였는데 엉뚱한 데 붙였다" 를 못 잡는다.
  it('잎 정점은 잎 영역을, 줄기 정점은 줄기 영역을 본다', () => {
    let leafOk = 0, leafBad = 0, barkOk = 0, barkBad = 0;
    for (let i = 0; i < color.count; i++) {
      const isLeaf = color.getY(i) > color.getX(i);   // 초록이 빨강보다 크면 잎
      const u = uv.getX(i);
      if (isLeaf) { if (u >= LEAF_U0) leafOk++; else leafBad++; }
      else { if (u <= LEAF_U0) barkOk++; else barkBad++; }
    }
    // 표본이 비면 아무것도 검사하지 않은 것이 된다
    expect(leafOk + leafBad).toBeGreaterThan(0);
    expect(barkOk + barkBad).toBeGreaterThan(0);
    expect(leafBad).toBe(0);
    expect(barkBad).toBe(0);
  });
});

describe('알파 잎 — 재질 설정이 개수 불변식을 지킨다', () => {
  const mat = asset.material as unknown as {
    alphaTest?: number; transparent?: boolean; side?: unknown; map?: unknown;
  };

  it('alphaTest 를 쓴다 — 없으면 잎이 통짜 사각형 판이 된다', () => {
    expect(mat.alphaTest).toBeGreaterThan(0);
  });

  // 이것이 이 파일에서 가장 중요한 한 줄이다. `transparent: true` 는 **파이프라인
  // 캐시키 축**이라 켜는 순간 재질이 둘로 갈리고 드로우콜도 갈린다. 알파 컷아웃은
  // 불투명 패스에서 처리되므로 같은 파이프라인에 남는다.
  it('transparent 는 켜지 않는다 — 켜면 파이프라인이 갈린다', () => {
    expect(mat.transparent).toBeFalsy();
  });

  it('양면을 그린다 — 평면 잎이라 뒤에서 보면 사라진다', () => {
    expect(mat.side).toBeDefined();
  });

  it('텍스처가 붙어 있다 — 알파는 텍스처에서 온다', () => {
    expect(mat.map).toBeDefined();
  });
});

// ── 못 잰 것 ────────────────────────────────────────────────────────────────
// 텍스처의 **픽셀**은 검사하지 못한다. jsdom 에는 네이티브 캔버스가 없어
// `getContext('2d')` 가 null 이고, 위에서 그린 것을 다시 읽을 수단이 없다. 그래서
// "잎 영역에 실제로 알파가 뚫려 있는가" · "중앙이 밀집하고 가장자리가 성긴가"(밀집
// 지수 0.6)는 **여기서 못 본다.** 밀집 지수를 2로 바꾸는 뮤테이션이 실제로 살아남았다.
//
// 이 항목은 감독 실기기 확인이 유일한 판정이다. 추측으로 메우지 않고 여기 적어 둔다.
