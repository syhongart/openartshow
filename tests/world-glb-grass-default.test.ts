// 월드7·8 잔디 기본값 — **감독 판정(2026-09-05 «2D 잎») 은 월드8 에만, world2 는 3D 그대로.**
//
// 두 트리의 `decide/grass-mode.ts` 는 헤더 경로 주석과 `GRASS_MODE_DEFAULT` 독블록·값을 빼면
// 같아야 한다. 조용히 갈리면 no-sync 포크가 세 번 겪은 그 형태다 — 실제로 `5f217ba2` 에서
// 검수관 뮤테이션이 동기 복사에 섞여 world-glb 만 `quad` 로 커밋됐고 아무 검사도 못 잡았다.
// 이 검사는 «어느 값이어야 하는가» 를 못 박아 그 형태를 다시 못 지나가게 한다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GRASS_MODE_DEFAULT as W2, GRASS_SEG_DEFAULT as S2 } from '../frontend/js/world2/decide/grass-mode.js';
import { GRASS_MODE_DEFAULT as W8, GRASS_SEG_DEFAULT as S8 } from '../frontend/js/world-glb/decide/grass-mode.js';

describe('잔디 기본 모드 — 세계별 감독 판정', () => {
  it('world2(라이브)는 blade — 2026-08-21 승인 화면 그대로', () => {
    expect(W2).toBe('blade');
  });

  it('world-glb(월드7·8)는 quad · 마디 1 — 2026-09-05 감독 카드 «2D 잎» → 재비교 «③ 2D 마디 1»', () => {
    expect(W8).toBe('quad');
    expect(S8).toBe(1);
  });

  it('world2 의 2D 노브 기본 마디는 3 그대로 — 감독 «살랑살랑» 이 만든 값, world2 기본은 어차피 blade', () => {
    expect(S2).toBe(3);
  });

  it('두 트리의 grass-mode.ts 는 주석을 걷어낸 코드가 기본값 2줄(모드·마디) 빼고 같다', () => {
    // ⚠ 첫 판본은 «기본값 독블록을 정규식으로 벗기고 나머지를 비교» 했고 **구멍이 있었다**
    // (검수관 블로커 2026-09-05): 비탐욕 `[^]*?` 가 가장 왼쪽 `/**` 부터 매치해 그 사이의
    // `GRASS_LOD_DEFAULT`·`GRASS_LOD_MAX` **코드 줄까지 삼켰다** — LOD 값을 0→99 로 갈라도 4/4 PASS.
    // 그래서 주석을 전부 걷어내고 **코드 줄만** 비교한다. 다르게 둘 값은 이름으로 지목한다 —
    // 새 세계별 상수가 생기면 여기 목록에 넣어야 하고, 안 넣으면 빨간불이 그것을 알린다.
    const PER_WORLD = ['GRASS_MODE_DEFAULT', 'GRASS_SEG_DEFAULT'];
    const code = (p: string) => readFileSync(p, 'utf8')
      .split('\n').slice(1).join('\n')                                  // 헤더 경로 주석 1줄
      .replace(/\/\*[^*]*\*+(?:[^*/][^*]*\*+)*\//g, '')                  // 블록 주석(중첩 없음) 정확 매칭
      .replace(/\/\/[^\n]*/g, '')                                        // 행 주석
      .split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== '')
      .map((l) => {
        const m = /^export const (\w+)/.exec(l);
        return m && PER_WORLD.includes(m[1]) ? `PER_WORLD ${m[1]}` : l;
      });
    const a = code('frontend/js/world2/decide/grass-mode.ts');
    const b = code('frontend/js/world-glb/decide/grass-mode.ts');
    expect(b).toEqual(a);
    // 비교가 실제로 코드를 보고 있는가 — 상수 줄이 표본에 들어 있어야 한다
    expect(a.some((l) => l.startsWith('export const GRASS_LOD_DEFAULT'))).toBe(true);
    expect(a.some((l) => l.startsWith('export const CARD_LEAF_SCALE'))).toBe(true);
  });
});
