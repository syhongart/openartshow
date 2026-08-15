// @vitest-environment node
//
// 커밋된 텍스처와 그 목록이 **짝인가**.
//
// ── 왜 필요한가 ────────────────────────────────────────────────────────────
// `assets/models/index.json` 이 이미 같은 형태의 사고를 겪었다(`world2-overlay-wiring.test.ts`
// 의 「팔레트 매니페스트는 실제 파일과 짝이다」): 손으로 관리하는 목록이 어긋나면 **팔레트
// 버튼이 404 를 부르는데 화면에는 「로드 실패」만 뜨고 원인이 목록이라는 것은 안 보인다.**
//
// 텍스처 목록은 생성기(`scripts/gen-textures.mjs`)가 파일과 함께 굽지만, 그것이 **손 편집을
// 막지는 않는다** — 감독이 준 파일을 내가 손으로 넣으면 목록을 같이 안 고칠 수 있다.
// 그리고 그 GLB 축은 `.glb` 필터라 **텍스처를 못 본다**(실측) — 별 축이 필요한 이유다.
//
// ── 계약과도 짝이어야 한다 ─────────────────────────────────────────────────
// 파일명이 `isSafeTextureSrc` 를 통과하지 못하면, 목록에는 뜨는데 **고르는 순간 계약이
// 조용히 버린다.** 그 증상은 «저 텍스처만 안 먹는다» 라 원인을 짚기 어렵다.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSafeTextureSrc } from '../frontend/js/world2/decide/surface-material.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'frontend/assets/textures');

const manifest = JSON.parse(
  fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'),
) as { textures: string[] };

/** 실제로 있는 이미지 파일 */
const actual = fs.readdirSync(DIR)
  .filter((f) => /\.(png|jpg|jpeg|webp)$/.test(f))
  .sort();

describe('텍스처 매니페스트', () => {
  it('★ index.json 이 실제 파일 집합과 같다', () => {
    expect([...manifest.textures].sort(),
      '★ 목록과 파일이 어긋났다 — 화면에는 「로드 실패」만 뜨고 원인이 안 보인다.')
      .toEqual(actual);
  });

  it('★ 목록의 이름이 전부 계약을 통과한다 — 아니면 고르는 순간 조용히 버려진다', () => {
    for (const name of manifest.textures) {
      expect(isSafeTextureSrc(`assets/textures/${name}`), `★ 「${name}」 이 계약에서 버려진다`)
        .toBe(true);
    }
  });

  it('시작점이 비어 있지 않다 — 0장이면 화면에 고를 것이 없다', () => {
    // 감독이 자기 텍스처를 주는 것이 본류이지만, 처음 열었을 때 아무것도 못 고르면
    // 「되는지」를 판정할 수가 없다. 생성기가 굽는 셋이 그 시작점이다.
    expect(actual.length).toBeGreaterThan(0);
  });

  it('생성기가 이 목록을 만든다 — 손으로 채우는 자리가 아니다', () => {
    // ⚠ 첫 판본은 여기서 `if (!gen.includes(name)) continue; expect(gen).toContain(name);`
    //   를 돌렸고 그것은 **항등 단언이라 검출력이 0** 이었다(검수관 P2). 지웠다.
    //
    //   개별 파일이 생성기 산출인지 손 커밋인지는 **여기서 가릴 수 없다** — 감독이 준
    //   파일을 내가 손으로 넣는 것이 정상 경로이기 때문이다(그것이 이 기능의 본류다).
    //   그래서 이 축이 지키는 것은 «목록을 굽는 자리가 생성기에 있다» 하나로 좁힌다.
    const gen = fs.readFileSync(path.join(ROOT, 'scripts/gen-textures.mjs'), 'utf8');
    expect(gen, '★ 생성기가 index.json 을 안 굽는다').toContain('index.json');
  });
});
