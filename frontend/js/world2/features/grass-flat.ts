// features/grass-flat.ts — **2D 잎·다발 카드의 지오메트리와 알파 마스크.** `grass.ts` 에서 갈라냈다.
//
// ── 왜 갈라냈나 (2026-09-05) ─────────────────────────────────────────────────
// 카드 모드를 더하자 `features/grass.ts` 가 514줄이 돼 `check:filesize`(상한 501)가 막았다.
// 감독 지시 2026-08-16 *"파일사이즈 폭주 안되고 모듈 관리 잘되게"*. 여기 있는 것은
// «잎 하나를 어떤 정점·마스크로 그리나» 이고, `grass.ts` 는 «세계에 어떻게 세우고 흔드나»
// 다 — 관심사가 다르다. 판정(모드·마디·카드 잎 배치)은 `decide/grass-mode.ts` 가 소유하고
// 여기는 three 객체로 **집행**만 한다. ⚠ world2 와 world-glb 에 같은 파일이 하나씩 있다.

import * as THREE from 'three/webgpu';
import { bladeShade } from '../decide/blade-shape.js';
import {
  CARD_WIDTH_MUL, cardMaskPixels, bladeMaskPixels, quadHalfWidth, type GrassMode,
} from '../decide/grass-mode.js';

// ── 2D 잎 (감독 *"2디 잔디로 가볍게"*, 팀장 판정 2026-09-05) ─────────────────
//
// 사각 한 장(quad, 2tri) 또는 두 장 교차(cross, 4tri). **폭·높이·음영·법선 벌림은 blade 와
// 같은 함수에서 나온다** — 실루엣만 정점이 아니라 알파 마스크가 깎는다. 마스크도 같은
// `halfWidthProfile` 에서 유도되므로(`decide/grass-mode.ts`), 감독이 8-18 에 네 번 다듬은
// 잎 모양 축(`gtip`·`gbelly`)이 2D 에서도 그대로 산다(팀장 조건 C-3 — «무시» 는 반려됐다).
// 바람은 `positionNode` 가 `uv.y` 로 굽히므로 정점이 2줄뿐이어도 끝이 밀린다.

/** 마스크 해상도. 잎 폭 13cm 가 화면에서 몇 px 안 되므로 16×64 면 계단이 안 보인다 */
const MASK_W = 16;
const MASK_H = 64;
/** 다발 카드는 잎 여러 개라 가로 해상도가 더 필요하다 */
const CARD_MASK_W = 64;
const CARD_MASK_H = 64;
/** 이 밑은 버린다. 0.5 = 마스크 경계 그대로(양 백엔드 공통 수단 — `ShaderMaterial` 아님) */
export const MASK_ALPHA_TEST = 0.5;

/** 모드별 마스크 픽셀 — 카드는 잎 N 개, 나머지는 잎 하나 */
export function maskPixels(mode: GrassMode, tip: number, belly: number, cardBlades: number): { data: Uint8Array; w: number; h: number } {
  return mode === 'card'
    ? { data: cardMaskPixels(CARD_MASK_W, CARD_MASK_H, tip, belly, cardBlades), w: CARD_MASK_W, h: CARD_MASK_H }
    : { data: bladeMaskPixels(MASK_W, MASK_H, tip, belly), w: MASK_W, h: MASK_H };
}

export function maskTexture(mode: GrassMode, tip: number, belly: number, cardBlades: number): THREE.Texture {
  const m = maskPixels(mode, tip, belly, cardBlades);
  const tex = new THREE.DataTexture(m.data, m.w, m.h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** 슬라이더가 잎 배(`gbelly`)를 바꾸면 마스크도 같은 프로파일로 다시 채운다 — 텍스처 개수 불변 */
export function refillMask(tex: THREE.Texture, mode: GrassMode, tip: number, belly: number, cardBlades: number): void {
  (tex.image as { data: Uint8Array }).data.set(maskPixels(mode, tip, belly, cardBlades).data);
  tex.needsUpdate = true;
}

export function flatGeometry(mode: Exclude<GrassMode, 'blade'>, tip: number, belly: number, spread: number, ao: number, seg: number): THREE.BufferGeometry {
  // 카드는 잎 폭의 CARD_WIDTH_MUL 배 — 잎 여러 개가 그 안에 그려진다(마스크가 실루엣을 깎는다)
  const hw = quadHalfWidth(tip, belly) * (mode === 'card' ? CARD_WIDTH_MUL : 1);
  const nx = Math.sin(spread);
  const ny = Math.cos(spread);
  const n = Math.max(1, Math.round(seg));
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  // 세로 마디 — 감독 *"살랑살랑 게임 쉐이더 처럼"*. 바람이 `uv.y²` 로 굽히므로 마디가 있어야
  // 잎이 **휜다**(두 줄이면 기울기만). 높이·음영은 blade 와 같은 식(`bladeArc` 는 curve 0 이라 y=t).
  const sheet = (rotated: boolean) => {
    const base = pos.length / 3;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const g = bladeShade(t, ao);
      for (const sx of [-1, 1] as const) {
        const x = sx * hw;
        if (rotated) { pos.push(0, t, x); nor.push(0, ny, sx * nx); }
        else { pos.push(x, t, 0); nor.push(sx * nx, ny, 0); }
        uv.push(sx < 0 ? 0 : 1, t);
        col.push(g, g, g);
      }
    }
    for (let k = 0; k < n; k++) {
      const a = base + k * 2;
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  };
  sheet(false);
  if (mode === 'cross' || mode === 'card') sheet(true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

