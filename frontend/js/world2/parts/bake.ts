// 여러 지오메트리를 **한 덩어리로 굽는다.** three 를 인자로만 받는다.
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────────────
// world2 파츠는 **종류당 지오 하나·재질 하나**다(개수 불변식). 그런데 실제 물건은
// 조각이 여럿이다 — 가로등은 기둥과 갓, 벤치는 좌석과 다리 둘, 화분은 통과 덤불.
// world1 은 `mergeGeometries`(three/addons)로 합쳤지만 파츠는 애드온을 import 하지
// 않으므로(런타임 의존 0 규율) 정점 배열을 직접 잇는다.
//
// 나무가 재귀 가지를 구우면서 이 코드를 처음 썼고, 가로등·벤치·화분이 같은 것을
// 필요로 하면서 여기로 올렸다. **두 번째 소비자가 생기는 순간이 공용으로 옮길 때다** —
// 그 전에 옮기면 쓰이지 않을 추상을 미리 만드는 것이고, 세 번째까지 기다리면 이미
// 복사본이 둘이다.
//
// ── 색은 정점에 굽는다 ──────────────────────────────────────────────────────
// 조각마다 색이 다른데 재질은 하나다. `instanceColor` 는 인스턴스 단위라 한 물건 안에서
// 두 색을 못 쓴다. 그래서 정점색으로 굽고, 재질에 `vertexColors: true` 를 준다.
// 그러면 `tones` 는 **곱셈기**가 되므로 흰색 근처여야 한다(그 규약은 파츠 자산 테스트가
// 지킨다).

import type { ThreeNS } from './types.js';

/** 굽기 전 조각 하나 — 지오와 그 지오 전체에 칠할 색(0~1 RGB) */
export interface Piece {
  geo: InstanceType<ThreeNS['BufferGeometry']>;
  color: readonly [number, number, number];
  /**
   * 이 조각의 UV 를 **한 점으로 고정**한다(0~1). 없으면 원본 UV 를 그대로 쓴다.
   *
   * ── 무엇에 쓰나 ──────────────────────────────────────────────────────────
   * 조각마다 **다른 마스크 값**을 읽게 하려는 것이다. 가로등이 첫 소비자다: 갓만
   * 빛나야 하는데 재질은 하나뿐이라, 작은 마스크 텍스처를 `emissiveMap` 으로 깔고
   * 기둥은 검은 텍셀을, 갓은 흰 텍셀을 보게 한다.
   *
   * 구간이 아니라 **한 점**인 것이 핵심이다. 구간으로 압축하면 텍셀 경계에서 보간이
   * 섞여 기둥 끝이 어중간하게 빛난다. 텍셀 중앙 한 점만 읽으면 필터링과 무관하게
   * 정확한 값이 나온다.
   */
  u?: number;
}

/**
 * 조각들을 한 지오메트리로 합친다. **입력 지오는 소비되어 반납된다.**
 *
 * 전부 non-indexed 로 통일하는 이유: 인덱스가 있는 것과 없는 것을 섞으면 인덱스 오프셋을
 * 다시 계산해야 하는데, 이 규모(수백 삼각형)에서는 그 복잡도가 정점 몇 개보다 비싸다.
 *
 * `uv` 는 있는 조각만 이어붙이지 않는다 — 하나라도 빠지면 매핑이 통째로 밀리므로,
 * 전부 있거나 전부 없어야 한다. three 의 기본 지오는 모두 uv 를 가지므로 실제로는
 * 항상 있는 쪽이다.
 */
export function bakePieces(T: ThreeNS, pieces: readonly Piece[]) {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const uvs: number[] = [];

  for (const { geo, color, u: pieceU } of pieces) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    const u = g.attributes.uv?.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    if (typeof pieceU === 'number') {
      // UV 고정 — 정점마다 (u, 0.5). 세로 중앙을 쓰는 것은 마스크가 가로 1줄이라서다.
      for (let i = 0; i < p.length / 3; i++) uvs.push(pieceU, 0.5);
    } else if (u) {
      for (let i = 0; i < u.length; i++) uvs.push(u[i]);
    }
    for (let i = 0; i < p.length / 3; i++) col.push(color[0], color[1], color[2]);
    if (g !== geo) g.dispose();
    geo.dispose();
  }

  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  if (uvs.length === (pos.length / 3) * 2) {
    out.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  }
  return out;
}

/** 16진 색을 정점색용 0~1 삼원색으로 */
export function rgb(hex: number): readonly [number, number, number] {
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255];
}
