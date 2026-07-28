// world2/avatars/registry.ts — 어떤 아바타를 쓰는가. **교체 지점 SSOT.**
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"치비랑 내가 VRM 준 거… 그것도 나중에 다 갈아치울 수 있는 거니까 파일 관리 잘해."*
//
// 그래서 "무엇을 세울지" 를 코드 곳곳이 아니라 여기 한 곳에서 정한다. 아바타를 바꾸는
// 일이 **이 파일의 목록을 고치는 일**이 되어야 하고, `features/npc.ts` 를 열어 URL
// 문자열을 찾아다니는 일이 되면 안 된다.
//
// 그 전까지는 `VRM_URL` 이 `features/npc.ts` 안에 상수로 박혀 있었다. 아바타가 둘만
// 넘어가도 그 파일이 자산 목록을 겸하게 된다.
//
// ── 자산 경로 규약 ──────────────────────────────────────────────────────────
// `frontend/assets/` 아래에 둔다. vite 의 `selfContained` 플러그인이 이 디렉터리를
// 통째로 `dist/app/assets/` 로 복사하므로, 페이지에서 본 상대경로가 `./assets/…` 로
// 그대로 맞는다. 번들에 넣지 않는 이유는 833KB 짜리를 JS 청크에 섞으면 첫 페인트까지
// 기다려야 하기 때문이다 — 아바타는 늦게 와도 되는 것이다.

import type { AvatarCost } from './types.js';

/** 아바타 하나의 선언 */
export interface AvatarSource {
  /** 진단·드로우콜 그룹 키에 쓰는 짧은 이름 */
  readonly id: string;
  /** 사람이 읽는 이름 */
  readonly label: string;
  /**
   * 어디서 오는가.
   *   `builtin` — 코드가 절차적으로 만든다(치비). 자산 파일이 없다.
   *   `file`    — 런타임에 받아 온다(VRM). `url` 이 있다.
   */
  readonly kind: 'builtin' | 'file';
  readonly url?: string;
  /** 몇 체를 세울 것인가(기본값). URL 파라미터가 이걸 덮어쓸 수 있다 */
  readonly count: number;
  /** 알려진 실측 비용. `file` 은 로드해 봐야 알므로 비워 둔다 */
  readonly cost?: AvatarCost;
}

/**
 * 치비 기본 인원. world1 의 거리 배회 상한(`world.js:1064` — *"총원 ≤6"*)을 계승한다.
 *
 * 이 값이 곧 드로우콜 예산이다. 치비 한 체가 보일 때 45 드로우콜이므로 6명이면 270 이고,
 * 실제로는 시야에 든 것만 그려져 그보다 적다(헤드리스 실측 +90).
 */
export const DEFAULT_CHIBI_COUNT = 6;

/**
 * 감독이 보낸 VRM. **한 체만** 세운다 — 스킨드 메시를 복제하려면
 * `SkeletonUtils.clone`(three/addons)이 필요한데 vendor 에 없다.
 *
 * 라이선스: 파일 안 `VRMC_vrm` 메타가 `allowRedistribution: false` ·
 * `modification: prohibited` · `commercialUsage: personalNonProfit` 이다. 감독 확인을
 * 받아 배포하되, 구매·재배포 조건이 정리되기 전까지 다른 페이지에서 참조하거나
 * sitemap 에 올리지 않는다.
 */
export const VRM_MALE: AvatarSource = {
  id: 'vrm',
  label: '남성 아바타(VRM)',
  kind: 'file',
  url: './assets/avatars/male.vrm',
  count: 1,
};

export const CHIBI: AvatarSource = {
  id: 'chibi',
  label: '아야모(치비)',
  kind: 'builtin',
  count: DEFAULT_CHIBI_COUNT,
  cost: { meshes: 45, materials: 29, triangles: 24360 },
};

/** 거리에 세울 것들. 여기서 한 줄을 빼면 그 아바타가 사라진다 */
export const AVATAR_SOURCES: readonly AvatarSource[] = [CHIBI, VRM_MALE];

/** 안전 상한. URL 로 아무 값이나 넣어도 여기서 잘린다 — 실수로 60을 넣으면 기기가 멎는다 */
export const MAX_TOTAL_AVATARS = 12;
