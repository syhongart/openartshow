// 월드7·8 잔디 기본값 — **감독 판정(2026-09-05 «2D 잎») 은 월드8 에만, world2 는 3D 그대로.**
//
// 두 트리의 `decide/grass-mode.ts` 는 헤더 경로 주석과 `GRASS_MODE_DEFAULT` 독블록·값을 빼면
// 같아야 한다. 조용히 갈리면 no-sync 포크가 세 번 겪은 그 형태다 — 실제로 `5f217ba2` 에서
// 검수관 뮤테이션이 동기 복사에 섞여 world-glb 만 `quad` 로 커밋됐고 아무 검사도 못 잡았다.
// 이 검사는 «어느 값이어야 하는가» 를 못 박아 그 형태를 다시 못 지나가게 한다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GRASS_MODE_DEFAULT as W2 } from '../frontend/js/world2/decide/grass-mode.js';
import { GRASS_MODE_DEFAULT as W8 } from '../frontend/js/world-glb/decide/grass-mode.js';

describe('잔디 기본 모드 — 세계별 감독 판정', () => {
  it('world2(라이브)는 blade — 2026-08-21 승인 화면 그대로', () => {
    expect(W2).toBe('blade');
  });

  it('world-glb(월드7·8)는 quad — 2026-09-05 감독 카드 «2D 잎(마디 3)»', () => {
    expect(W8).toBe('quad');
  });

  it('두 트리의 grass-mode.ts 는 헤더·기본값 독블록 밖에서 같다', () => {
    const strip = (p: string) => readFileSync(p, 'utf8')
      .split('\n').slice(1).join('\n')
      .replace(/\/\*\*[^]*?\*\/\nexport const GRASS_MODE_DEFAULT[^\n]*\n/, 'DEFAULT\n');
    expect(strip('frontend/js/world-glb/decide/grass-mode.ts')).toBe(strip('frontend/js/world2/decide/grass-mode.ts'));
  });
});
