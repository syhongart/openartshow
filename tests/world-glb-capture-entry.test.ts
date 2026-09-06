// 캡처 진입(`?cam=`) — 6 고정 시점 캡처의 부팅 시작 위치·시선. 팀장 판정 2026-09-06 하위 3(조건부 허용):
// 캡처 페이지 부트 **하나**만 읽고, 라이브 페이지·world7·8 부트·world2 트리는 무시한다.
// 그 «하나» 를 이 파일이 호출처 축으로 지킨다 — 산문이 아니라 grep 이다.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseCam, formatCam, CAM_ABS_MAX, CAM_PITCH_MAX_DEG, V1_START } from '../frontend/js/world-glb/decide/capture-entry.js';

describe('parseCam — 순수 판정', () => {
  it('네 값이 전부 있어야 하고 각도는 deg → rad', () => {
    const s = parseCam('?cam=12.5,-3,90,-10');
    expect(s).not.toBeNull();
    expect(s!.x).toBe(12.5);
    expect(s!.z).toBe(-3);
    expect(s!.yaw).toBeCloseTo(Math.PI / 2, 10);
    expect(s!.pitch).toBeCloseTo(-10 * Math.PI / 180, 10);
  });
  it('없음·빈 값·개수 부족·비수·범위 밖은 null — 트리 기본 스폰으로 간다', () => {
    expect(parseCam('')).toBeNull();
    expect(parseCam('?cam=')).toBeNull();
    expect(parseCam('?cam=1,2,3')).toBeNull();
    expect(parseCam('?cam=1,2,3,x')).toBeNull();
    expect(parseCam(`?cam=${CAM_ABS_MAX + 1},0,0,0`)).toBeNull();
    expect(parseCam(`?cam=0,0,0,${CAM_PITCH_MAX_DEG + 1}`)).toBeNull();
  });
  it('yaw 는 0~2π 로 정규화, 다른 노브와 섞여도 읽는다', () => {
    expect(parseCam('?glb=1&cam=0,0,-90,0&x=1')!.yaw).toBeCloseTo(Math.PI * 1.5, 10);
    expect(parseCam('?cam=0,0,450,0')!.yaw).toBeCloseTo(Math.PI / 2, 10);
  });
  it('V1_START 는 +x(동쪽)를 본다 — facing 규약 (−sin, −cos)', () => {
    expect(-Math.sin(V1_START.yaw)).toBeCloseTo(1, 10);
    expect(-Math.cos(V1_START.yaw)).toBeCloseTo(0, 10);
  });
  it('V1_START 는 디자이너 판정 2026-09-06(P1): x 4 · z 0 · yaw 270° · pitch −6°', () => {
    expect(V1_START.x).toBe(4);
    expect(V1_START.z).toBe(0);
    expect(V1_START.yaw).toBeCloseTo((270 * Math.PI) / 180, 10);
    expect(V1_START.pitch).toBeCloseTo((-6 * Math.PI) / 180, 10);
  });
  it('formatCam 은 parseCam 의 역이다(소수 3자리)', () => {
    const s = parseCam('?cam=1.234,-5.678,123.4,-12.3')!;
    expect(parseCam('?cam=' + formatCam(s))).toEqual(s);
  });
});

describe('호출처 — 캡처 페이지 부트 하나만 읽는다 (팀장 조건)', () => {
  const ROOT = join(__dirname, '..', 'frontend', 'js');
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|js)$/.test(name)) out.push(p);
    }
    return out;
  };
  it('capture-entry 를 import 하는 파일은 world10-boot.ts 뿐이다', () => {
    const importers = walk(ROOT).filter((p) => /capture-entry\.js['"]/.test(readFileSync(p, 'utf8')));
    expect(importers.map((p) => p.slice(ROOT.length + 1)).sort()).toEqual(['world10-boot.ts']);
  });
  it('world7·8 부트는 start 를 넘기지 않는다 · world10 부트만 넘긴다', () => {
    const w7 = readFileSync(join(ROOT, 'world7-boot.ts'), 'utf8');
    const w8 = readFileSync(join(ROOT, 'world8-boot.ts'), 'utf8');
    const w9 = readFileSync(join(ROOT, 'world10-boot.ts'), 'utf8');
    expect(w7).not.toMatch(/\bstart\b\s*:/);
    expect(w8).not.toMatch(/\bstart\b\s*:/);
    expect(w9).toMatch(/start: cam \?\? V1_START/);
    expect(w9).toMatch(/tag: 'world10'/);
    // 거리 페이지 기본값 — 미술관 1채·링 잔디를 끈다(부트가 채우는 노브, 트리 분기 아님)
    expect(w9).toMatch(/DEFAULTS[^=]*=\s*\{\s*glb: '0', grass: '0'\s*\}/);
  });
  it('트리 안에 `tag ===` 분기가 없다 — 경계(options.ts 헤더)', () => {
    const tree = walk(join(ROOT, 'world-glb'));
    const hits = tree.filter((p) => /tag\s*===?\s*['"]world/.test(readFileSync(p, 'utf8')));
    expect(hits).toEqual([]);
  });
});
