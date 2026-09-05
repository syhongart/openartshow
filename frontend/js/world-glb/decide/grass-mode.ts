
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
//   card   **다발 카드** — 게임 잔디의 표준. 넓은 사각 두 장 교차에 가는 잎 여러 개를 절차적으로
//          그린 마스크. 카드 하나가 잎 N 개 몫이라 **인스턴스 수를 1/N 로** 줄인다(정점 셰이더
//          호출도 1/N). 감독 신고 2026-09-05 *"우리 풀이 옆으로 넓은것 같아. 게임회사는 어떻게
//          해?"* → 팀장 판정 B-3(카드 구현 + 폭 노브를 한 카드로 비교). 잎 실루엣은 여전히
//          `halfWidthProfile` 에서 유도(C-3). 밑동 색·뭉침·거리 페이드는 이번 축이 아니다(C-6).
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
import { GRASS_RINGS, bladeHash, type GrassRing } from './grass.js';

export const GRASS_MODES = ['blade', 'quad', 'cross', 'card'] as const;
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

/** 잎 하나(카드 모드에서는 카드 하나)의 삼각형 수. blade 는 마디 수에서 **유도**한다 */
export function triPerBlade(mode: GrassMode, seg: number = GRASS_SEG_DEFAULT): number {
  if (mode === 'blade') return (BLADE_NODES.length - 1) * 2;
  const perSheet = 2 * Math.max(1, Math.round(seg));
  return mode === 'cross' || mode === 'card' ? perSheet * 2 : perSheet;
}

// ── 다발 카드 (`gmode=card`) ─────────────────────────────────────────────────

/** 카드 한 장에 그리는 잎 수(`?gcard=`). 감독 링크 판정 뒤 굽는다 */
export const CARD_BLADES_DEFAULT = 6;
export const CARD_BLADES_MIN = 3;
export const CARD_BLADES_MAX = 12;
/**
 * 카드 폭 = 잎 폭 × 이 배수. 잎 폭 `BLADE_W` 0.13m × 2.7 ≈ 0.35m — 게임 카드의 흔한 크기.
 * 폭 노브(`?gw=`)는 이 위에 곱해진다.
 */
export const CARD_WIDTH_MUL = 2.7;
/**
 * 카드 안 잎 하나의 반폭 배율(카드 폭 = 1 기준). 프로파일 최대 반폭 0.5 × 0.08 = 0.04 →
 * 카드 0.35m 에서 잎 폭 ≈ 2.8cm. 게임 잔디 잎은 1~3cm 로 가늘다 — 지금 우리 잎(13cm)이
 * *"옆으로 넓다"* 로 읽힌 지점이 이 값이다.
 */
export const CARD_LEAF_SCALE = 0.08;

//
// ── «BLADE_W 재판정» — ⚠ 전제가 바뀌었다 (2026-09-05, 팀장 조건 C-5) ───────────────
// ⚠ 이 절은 `grass.ts` `BLADE_W` 의 판정 기록이다. 그 파일이 동결이라 여기 있다(팀장 추인 C-5a — 모드
// 판정과 무관해 보여도 지우지 마라. 양방향 포인터: `grass.ts` BLADE_W 주석 ↔ 이 절).
// `decide/grass.ts` 의 `BLADE_W` 8-18 판정(*"뾰족가시같아"* → 2.4배)은 **그 자리에 그대로**
// 있고, 이 절이 그 밑에 이어질 문단이었다 — `check:filesize`(baseline 동결)가 그 파일에 줄을
// 못 더하게 해 여기로 왔다. 수단만 바꿨고 목적(판정 보존 + 이어 적기)은 같다.
// 위 2.4배는 **마디 5 짜리 3D 잎** 위에서 난 판정이다. 월드7·8 은 감독 판정으로 **2D 사각
// 마디 1**(`decide/grass-mode.ts`)이 됐고, 그 위에서 감독이 *"우리 풀이 옆으로 넓은것 같아.
// 게임회사는 어떻게 해?"* 라고 신고했다. 같은 13cm 가 3D 에서는 «뭉텅이» 였고 2D 판에서는
// «넓적한 판» 으로 읽힌 것이다 — 값이 틀린 게 아니라 **전제(잎의 형태)가 바뀌어 같은 값이
// 다른 화면을 만든다.** 재판정은 폭 노브(`?gw=0.4·0.6`)와 다발 카드(`?gmode=card`, 잎 하나가
// 카드 안에서 ≈2.8cm)를 한 카드로 비교해 받는다. 결과는 여기 이어 적는다.

/**
 * 카드 한 장(교차 두 시트)이 시야에 내는 **실효 시트 수**. 시트 두 장이 직교하므로 보는 각 θ
 * 에서 투영 폭의 합은 |cos θ|+|sin θ| 이고 0~90° 평균이 4/π ≈ 1.27 이다 — 두 장을 2 로 세면
 * 정면에서 한 장이 옆면(폭 0)인 것을 무시한 값이다(첫 판본이 그랬고 헤드리스 대조에서 현행보다
 * 성겼다). 시트 수 자체(`flatGeometry` 의 두 장)는 지오메트리 사실이고 이 값은 **덮임 환산**이다.
 */
export const CARD_SHEETS = 4 / Math.PI;
/**
 * 카드 모드의 밀도 환산 — **잎 면적 등가**로 유도한다.
 *
 * 카드 잎 하나의 폭 = quad 잎 폭 × `CARD_LEAF_SCALE × CARD_WIDTH_MUL`(같은 `halfWidthProfile`
 * 이라 높이·프로파일은 상쇄되고 폭 비만 남는다). 시트 `CARD_SHEETS` 장에 잎 N 개씩이므로 카드
 * 하나의 잎 면적은 quad 잎 `N × CARD_SHEETS × CARD_LEAF_SCALE × CARD_WIDTH_MUL` 개분이고, 그
 * 역수가 같은 덮임을 내는 인스턴스 배율이다. N=6 → 0.61, N=10 → 0.36.
 *
 * ⚠ 첫 판본은 `1/N` 이었다 — «카드 하나가 잎 N 개 몫» 을 **삼각형** 등가로 읽었고, 화면은
 * 잎 **면적**으로 덮임을 본다. 잎이 카드 폭의 8% 라 N=6 카드의 잎 면적은 quad 잎 2.6 개분인데
 * 인스턴스를 6 분의 1 로 줄여 덮임이 43% 가 됐다(N=10 은 43%×… 더 줄었다). 감독이 라이브
 * 링크에서 *"마지막 링크 들어가면 이상해"*(2026-09-05, `?gcard=10`) 로 잡았고 헤드리스 대조
 * 스크린샷에서 맨땅이 드러났다 — **수치(삼각형 예산)가 맞아도 화면이 틀릴 수 있다.**
 * 삼각형은 카드 4tri × 배율이라 N=6 은 quad 대비 **+22%**(경량이 아니다), N=10 은 −27% —
 * 카드가 가벼운 것은 잎이 많을 때뿐이다. 이 표는 팀장·감독 보고에 그대로 간다.
 */
export function cardDensityMul(blades: number): number {
  const n = Math.max(1, Math.round(blades));
  return 1 / (n * CARD_SHEETS * CARD_LEAF_SCALE * CARD_WIDTH_MUL);
}

// ── 잎 윤곽 안티알리아싱 (`?gaa=`) — 감독 *"나뭇잎에 알리아싱이 눈에 거슬리는데. 안티알리아싱하면 비용이 크지?"* (2026-09-05)
//
// 답은 **거의 0** 이다. 렌더러는 이미 MSAA 4x(`adapters/renderer.ts` `antialias: true`)를
// 켜고 있고 그 비용은 지불 중이다. 그런데 MSAA 는 **삼각형 가장자리**만 부드럽게 한다 —
// 2D 잎·카드의 윤곽은 삼각형이 아니라 `alphaTest` 가 **픽셀 단위로 버린** 자리라 4 샘플이
// 전부 같은 판정을 받고 계단이 그대로 남는다. 그 자리를 잡는 수단이 셋이고 전부 파이프라인
// 재구성 없이 붙는다:
//   ① alpha-to-coverage — 알파값을 MSAA 커버리지 마스크로 바꾼다. 컷 윤곽이 4단계로 섞인다.
//      GPU 가 이미 하는 MSAA 리졸브를 그대로 쓰므로 추가 비용 0. three WebGPU 빌드가 지원한다
//      (`three.webgpu.js` `if (this.alphaToCoverage && samples > 1)`).
//   ② 밉맵 — 마스크가 화면에서 텍셀보다 작아지면(멀리) 반짝임 알리아싱이 난다. 밉맵은 텍스처
//      1장의 1/3 메모리. ⚠ 알파테스트 + 밉맵은 멀리서 **잎이 사라지는** 흔한 문제가 있다
//      (평균화된 알파가 0.5 아래로 내려간다). 후보로 열어 화면으로 본다.
//   ③ 마스크 해상도 — 카드 0.35m 에 64px 면 잎 폭 2.8cm 가 5px 이라 가까이서 계단. 4배면
//      256×256 RGBA = 256KB, 텍스처 개수는 그대로 1.
// 비용이 **큰** 안티알리아싱은 TAA·SSAA 이고 여기서는 필요 없다 — 문제가 알파 컷 윤곽이라서다.
// 후보는 누적형이다(레벨이 오르면 앞 수단을 포함한다). 기본값은 판정 뒤 굽는다.

export const GRASS_AA_DEFAULT = 0;
export const GRASS_AA_MAX = 3;
export const AA_MASK_SCALE = 4;
export interface EdgeAA {
  alphaToCoverage: boolean;
  mipmaps: boolean;
  /** 마스크 해상도 배율(가로·세로) */
  maskScale: number;
}
export function edgeAA(level: number): EdgeAA {
  const l = Math.max(0, Math.min(GRASS_AA_MAX, Math.round(level)));
  return { alphaToCoverage: l >= 1, mipmaps: l >= 2, maskScale: l >= 3 ? AA_MASK_SCALE : 1 };
}

/** 카드 안 잎 하나의 배치(결정적 난수 — 같은 인자면 같은 카드) */
export interface CardLeaf {
  /** 밑동 x (카드 폭 비율 0~1) */ cx: number;
  /** 높이 비율 0.55~1 */ h: number;
  /** 끝의 x 기울기(카드 폭 비율, ±0.17) */ lean: number;
}
export function cardLeaves(blades: number, seed = 1): CardLeaf[] {
  const out: CardLeaf[] = [];
  for (let i = 0; i < blades; i++) {
    out.push({
      cx: 0.08 + 0.84 * bladeHash(i * 3 + 1, seed),
      h: 0.55 + 0.45 * bladeHash(i * 3 + 2, seed),
      lean: (bladeHash(i * 3 + 3, seed) - 0.5) * 0.35,
    });
  }
  return out;
}

/**
 * 다발 카드 마스크 픽셀(RGBA, 행 0 = 밑동). 잎마다 **같은 `halfWidthProfile`** 을
 * `CARD_LEAF_SCALE` 로 가늘게 쓴다(C-3 유도 — 프로파일을 바꾸면 이 마스크도 바뀐다).
 */
export function cardMaskPixels(
  width: number, height: number, tip: number, belly: number, blades: number, seed = 1,
): Uint8Array {
  const leaves = cardLeaves(blades, seed);
  const px = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const t = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      let on = 0;
      for (const L of leaves) {
        if (t > L.h) continue;
        const tt = t / L.h;
        const cx = L.cx + L.lean * tt;
        const half = halfWidthProfile(tt, tip, belly) * CARD_LEAF_SCALE;
        if (Math.abs(u - cx) <= half) { on = 255; break; }
      }
      const o = (y * width + x) * 4;
      px[o] = on; px[o + 1] = on; px[o + 2] = on; px[o + 3] = 255;
    }
  }
  return px;
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
