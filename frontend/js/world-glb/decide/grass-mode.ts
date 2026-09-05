// world-glb/decide/grass-mode.ts — **잎을 몇 개의 삼각형으로 그리는가.** 순수 함수만.
//
// ── 왜 생겼나 (감독 카드 답 2026-09-05) ─────────────────────────────────────
// 삼각형 실측(백로그 G-W8N 표): world2 1,339,882 중 **잔디가 1,204,968(90%)**, world8 도
// 83%. 잎당 8tri × 150,573 포기다. 감독: *"2디 잔디로 가볍게 안될까"* · 월드8 불편 →
// *"잔디부터"*. 팀장 판정(2026-09-05): 후보를 노브로 열어 링크 5개로 룩을 판정한다 —
// 대조군(3D) · 2D 잎(quad) · 십자(cross) · 발치만 3D 나머지 2D(`?glod=`) · 잔디 끔.
//
// ── 무엇을 정하는가 ─────────────────────────────────────────────────────────
// 모드마다 잎 하나의 지오메트리가 다르다. **인스턴스 수·링·밀도·바람·색은 그대로다** —
// 이 파일은 «어느 링을 어느 모드로 그리는가» 와 «2D 잎의 실루엣 마스크» 만 정한다.
//
//   blade  마디 5 × 2정점 = 8tri. 지금 라이브(감독 판정 4회의 결과물).
//   quad   사각 1장(세로 마디 `?gseg=`, 기본 3 → 6tri) + 알파 마스크. 실루엣은 **같은 잎 프로파일에서 유도**한다
//          (팀장 조건 C-3 — 캔버스에 딴 모양을 다시 그리지 않는다).
//   cross  quad 두 장을 90° 교차(마디 3 → 12tri). 위에서 봐도 판이 아니다.
//
// ── 기본값은 라이브 그대로 (팀장 조건 C-1) ──────────────────────────────────
// `GRASS_MODE_DEFAULT = 'blade'` · `GRASS_LOD_DEFAULT = 0` 이면 그룹이 하나(blade)라
// 조립 경로가 종전과 같다 — 메시 1개·지오 8tri·재질에 알파맵 없음. 감독이 링크로 고르면
// 그 값을 여기로 옮기고 판정을 이 주석에 적는다. 기각된 모드의 코드는 그때 지운다
// (팀장 조건 C-6 — 노브 누적 금지).
//
// ── 헤드리스가 못 보는 것 ───────────────────────────────────────────────────
// 스모크는 `grass=0` 이라 잔디 자체가 없다. 여기 테스트가 재는 것은 링 배정·삼각형 수·
// 마스크 배열이고, 룩은 감독 실기기 링크가 유일한 판정이다.

import { BLADE_NODES, halfWidthProfile } from './blade-shape.js';
import { GRASS_RINGS, type GrassRing } from './grass.js';

export const GRASS_MODES = ['blade', 'quad', 'cross'] as const;
export type GrassMode = (typeof GRASS_MODES)[number];

/**
 * **월드7·8 의 기본은 2D 잎(quad)이다 — 감독 판정 2026-09-05.** 단, 아래 사고를 함께 읽어라.
 *
 * 감독은 링크(잔디 없음 · 「3D」 · quad · cross · quad+glod=14)를 실기기(WebGPU)로 보고
 * 카드로 답했다: 룩 = **「2D 잎(마디 3)」**, 원인 = **「잔디 없으면 부드럽다」**.
 *
 * ⚠ **사고 — 그 「3D」 링크는 실제로는 이 값이 이미 `quad` 인 채 배포된 것이었다.**
 * 커밋 `5f217ba2`(세로 마디)에서 이 상수가 `'blade'` → `'quad'` 로 바뀌어 들어갔다.
 * 경위: 검수관이 **원본 워킹트리**에서 뮤테이션(M1: 기본값을 `quad` 로)을 심은 순간, 부팀장의
 * world2 → world-glb 동기 복사가 그 파일을 읽어 갔다. 검수관은 world2 만 원본으로 되돌렸고
 * world-glb 사본에는 뮤테이션이 남은 채 `git add -A` 로 커밋·배포됐다. 두 프로세스가 같은
 * 워킹트리를 쓴 사고(백로그 G-LOCK 의 형태)이고, 검수관에게 «원본에서 치환 + 복원» 을
 * 지시한 것은 부팀장이다 — 뮤테이션은 별도 클론에서(DELEGATION B-1).
 *
 * 그래서 감독 판정의 유효 범위는 이렇다: ① 「잔디 없으면 부드럽다」 = **quad 잔디(0.9M tri)
 * 로도 아직 끊긴다** — 잔디가 원인이라는 실기기 판정(유효). ② 「2D 잎」 선택은 월드8 에서
 * 3D 와 **비교하지 않은** 선택이다(3D 링크가 3D 가 아니었다). 값은 감독 판정대로 `quad` 로
 * 두되, 진짜 3D(`?gmode=blade`)·더 가벼운 후보(`?gseg=1`, `?gden=0.5`)를 링크로 다시 드린다.
 *
 * world2(라이브)는 `blade` 그대로(2026-08-21 승인 화면, 0번 원칙). 두 트리의 이 파일이
 * **이 상수 한 줄만** 다르다는 것을 `tests/world-glb-grass-default.test.ts` 가 지킨다.
 * 기각 cross·glod 코드 제거는 다음 PR 팀장 확인 1회(C-6).
 */
export const GRASS_MODE_DEFAULT: GrassMode = 'quad';

/**
 * `?glod=` — 이 반경(m) 이하의 링은 **blade 를 유지**하고 그 밖만 `?gmode=` 로 그린다.
 * 0 이면 전 링이 같은 모드. 링 반경(14·34·70)과 맞춰 `glod=14` 면 링1만 3D 다.
 */
export const GRASS_LOD_DEFAULT = 0;
export const GRASS_LOD_MAX = 200;

/**
 * 2D 잎의 세로 마디 수 (`?gseg=`). **감독 지시 2026-09-05: *"2디 잔디여도 살랑살랑 게임
 * 쉐이더 처럼 해줘."*** 바람은 정점 셰이더가 `uv.y²` 로 굽히므로 정점이 밑동·끝 두 줄뿐이면
 * 잎이 휘지 않고 **직선으로 기울기만** 한다 — 살랑거림은 마디에서 나온다. 3D 잎은 마디 5
 * (`BLADE_NODES`)다. 기본 3 이면 quad 가 6tri(3D 의 3/4), 1 이면 2tri 인데 뻣뻣하다.
 * 채택값은 감독 링크 판정 뒤 여기로 옮긴다.
 */
/**
 * **월드7·8 은 마디 1 (2tri) — 감독 판정 2026-09-05 (링크 5 재비교).**
 * 사고 정정 뒤 링크(진짜 3D · 2D 마디 3 · 2D 마디 1 · 밀도 절반 · 마디 1+밀도 절반)를 다시
 * 보고 카드로 답했다: 기본 = **「③ 2D 마디 1」**, 그리고 3D 대비 체감은 **「차이 모르겠다」**.
 * 즉 잔디 삼각형 1.2M → 0.3M 인데 끊김 체감의 차이는 감독이 못 느꼈다 — 팀장 반대 의견
 * (*"잔디가 world8 불편의 원인이라는 실측이 없다"*)이 그대로 남는다. 「잔디 없으면 부드럽다」
 * (앞 카드)와 「3D vs 2D 차이 모르겠다」 는 양립한다: 잔디의 **정점 셰이더(바람)·오버드로우**가
 * 삼각형 수보다 큰 몫일 수 있다. **여기서 잔디 축은 멈춘다**(팀장 C-6 경계) — 다음은 P3
 * (GLB 패킹·로딩)이고, 잔디를 더 깎는 것은 감독이 다시 발화할 때다.
 * world2 는 3 그대로(2D 는 world2 기본이 아니다 — 노브로 켤 때의 기본값일 뿐).
 */
export const GRASS_SEG_DEFAULT = 1;
export const GRASS_SEG_MIN = 1;
export const GRASS_SEG_MAX = 4;

/** 잎 하나의 삼각형 수. blade 는 마디 수에서 **유도**한다(값을 다시 적지 않는다) */
export function triPerBlade(mode: GrassMode, seg: number = GRASS_SEG_DEFAULT): number {
  if (mode === 'blade') return (BLADE_NODES.length - 1) * 2;
  const perSheet = 2 * Math.max(1, Math.round(seg));
  return mode === 'cross' ? perSheet * 2 : perSheet;
}

/** 링마다 모드를 배정한다. `lod` 안쪽 링은 blade */
export function ringModes(
  mode: GrassMode, lod: number, rings: readonly GrassRing[] = GRASS_RINGS,
): GrassMode[] {
  return rings.map((r) => (lod > 0 && r.radius <= lod ? 'blade' : mode));
}

/** 같은 모드의 링을 한 메시로 묶는다. 순서는 첫 등장 링 순 */
export interface MeshGroup { readonly mode: GrassMode; readonly rings: number[] }
export function meshGroups(modes: readonly GrassMode[]): MeshGroup[] {
  const out: MeshGroup[] = [];
  modes.forEach((m, i) => {
    const g = out.find((x) => x.mode === m);
    if (g) g.rings.push(i);
    else out.push({ mode: m, rings: [i] });
  });
  return out;
}

/** 그룹들의 삼각형 총합(포기 수 × 잎당 tri) — 표·진단용 */
export function groupTriangles(
  groups: readonly MeshGroup[], counts: readonly number[], seg: number = GRASS_SEG_DEFAULT,
): number {
  return groups.reduce(
    (sum, g) => sum + g.rings.reduce((s, r) => s + (counts[r] ?? 0), 0) * triPerBlade(g.mode, seg),
    0,
  );
}

/**
 * 2D 잎의 실루엣 — 행 `t`(0 밑동 → 1 끝)마다 **반폭을 최대 반폭으로 나눈 비율**.
 * `halfWidthProfile` 그대로다(팀장 C-3: 유도, 미러링 금지). 사각 지오의 폭이 최대 반폭
 * 이므로 마스크가 1 인 열이 곧 원본 잎의 윤곽이다.
 */
export function bladeMaskProfile(rows: number, tip: number, belly: number): number[] {
  const raw: number[] = [];
  for (let i = 0; i < rows; i++) raw.push(halfWidthProfile(i / Math.max(1, rows - 1), tip, belly));
  const max = Math.max(...raw, 1e-6);
  return raw.map((v) => v / max);
}

/** 사각 지오의 반폭 = 프로파일 최대 반폭(원본 잎과 같은 폭) */
export function quadHalfWidth(tip: number, belly: number, samples = 64): number {
  let max = 0;
  for (let i = 0; i < samples; i++) max = Math.max(max, halfWidthProfile(i / (samples - 1), tip, belly));
  return max;
}

/**
 * 알파 마스크 픽셀(RGBA, 행 0 = 밑동). 세 채널을 같은 값으로 채운다 — 첫 판본 주석은
 * *"three 의 `alphaMap` 은 G 채널을 읽는다"* 라고 적었고 **틀렸다**(검수관 실측 2026-09-05:
 * `nodes/accessors/MaterialNode.js` 의 alphaMap 경로에는 `.g` 스위즐이 없다 — roughness·
 * thickness 만 `.g` 를 명시한다). 결과가 안 틀린 이유는 채널을 전부 같게 채웠기 때문이지
 * 가정이 맞아서가 아니다. 캔버스가 아니라 배열로 만드는 이유는 jsdom(테스트)에 캔버스가
 * 없어서이고, `DataTexture` 는 양 백엔드 공통 수단이다.
 */
export function bladeMaskPixels(width: number, height: number, tip: number, belly: number): Uint8Array {
  const prof = bladeMaskProfile(height, tip, belly);
  const px = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const half = prof[y] * (width / 2);
    for (let x = 0; x < width; x++) {
      const d = Math.abs(x + 0.5 - width / 2);
      const on = d <= half ? 255 : 0;
      const o = (y * width + x) * 4;
      px[o] = on; px[o + 1] = on; px[o + 2] = on; px[o + 3] = 255;
    }
  }
  return px;
}
