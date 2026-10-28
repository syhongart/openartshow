// 캡처 메타 병합 — **유실 사고에서 나온 검사다.**
//
// `scripts/nyc/capture.mjs` 가 `--out` 의 `capture.json` 을 호출마다 통째로 덮어썼고,
// 2026-09-06 강도 스윕에서 같은 디렉터리에 5번 부르는 동안 V1~V4 의 메타가 사라졌다
// (마지막 한 건만 남았다). 스크린샷은 파일 이름이 갈려 살아남아서 유실이 안 보였다.
//
// 아래 단언은 그 형태를 막는다 — 보존·갱신·격리 세 축이다.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  mergeCaptureResults, loadCaptureResults, writeCaptureResults, CAPTURE_FILE,
} from '../scripts/nyc/capture-merge.mjs';

/** 저장소 밖 임시 디렉터리. 검사가 저장소 파일을 만들지 않는다. */
function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nyc-capture-'));
}
const readJson = (dir: string) => JSON.parse(fs.readFileSync(path.join(dir, CAPTURE_FILE), 'utf8'));

describe('mergeCaptureResults — 순수 병합', () => {
  it('다른 이름은 보존한다 — 이것이 유실을 막는 축이다', () => {
    const prev = [{ name: 'V1', bytes: 1 }, { name: 'V2', bytes: 2 }];
    const next = [{ name: 'V3', bytes: 3 }];
    const out = mergeCaptureResults(prev, next) as Array<{ name: string; bytes: number }>;
    expect(out.map((r) => r.name)).toEqual(['V1', 'V2', 'V3']);
    expect(out.map((r) => r.bytes)).toEqual([1, 2, 3]);
  });

  it('같은 이름은 이번 것으로 갱신하고 자리를 지킨다(중복 항목이 생기지 않는다)', () => {
    const prev = [{ name: 'V1', bytes: 1 }, { name: 'V2', bytes: 2 }];
    const next = [{ name: 'V2', bytes: 22 }, { name: 'V4', bytes: 4 }];
    const out = mergeCaptureResults(prev, next) as Array<{ name: string; bytes: number }>;
    expect(out.map((r) => r.name)).toEqual(['V1', 'V2', 'V4']);
    expect(out.find((r) => r.name === 'V2')!.bytes).toBe(22);
    expect(out.filter((r) => r.name === 'V2')).toHaveLength(1);
  });

  it('인자를 건드리지 않는다(순수) · 이전이 비어 있으면 이번 것 그대로', () => {
    const prev = [{ name: 'V1', bytes: 1 }];
    const next = [{ name: 'V1', bytes: 9 }];
    const out = mergeCaptureResults(prev, next);
    expect(prev).toEqual([{ name: 'V1', bytes: 1 }]);   // 원본 무변경
    expect(out).not.toBe(prev);
    expect(mergeCaptureResults([], next)).toEqual(next);
  });

  it('name 없는 항목도 버리지 않는다(키가 없을 뿐이다)', () => {
    const out = mergeCaptureResults([{ bytes: 1 }], [{ bytes: 2 }]);
    expect(out).toHaveLength(2);
  });
});

describe('writeCaptureResults — 두 번 부르면 둘 다 남는다(사고 재현 형태)', () => {
  it('같은 디렉터리에 연속 호출해도 앞선 회차가 살아 있다', () => {
    const dir = tmpDir();
    writeCaptureResults(dir, [{ name: 'V1', bytes: 1 }, { name: 'V2', bytes: 2 }]);
    writeCaptureResults(dir, [{ name: 'V4-I24', bytes: 4 }]);
    const saved = readJson(dir) as Array<{ name: string }>;
    // 옛 동작이면 여기서 ['V4-I24'] 하나만 남는다 — 그것이 유실 사고였다.
    expect(saved.map((r) => r.name)).toEqual(['V1', 'V2', 'V4-I24']);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('파일이 없으면 새로 쓴다(첫 회차)', () => {
    const dir = tmpDir();
    const { quarantined } = writeCaptureResults(dir, [{ name: 'V1' }]);
    expect(quarantined).toBeNull();
    expect(readJson(dir)).toEqual([{ name: 'V1' }]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('깨진 capture.json — 덮어쓰지 않고 격리한다', () => {
  const NOW = new Date('2026-09-06T12:34:56.789Z');
  const BAD_NAME = `${CAPTURE_FILE}.bad-2026-09-06T12-34-56-789Z`;

  it('파싱 불가면 .bad-<timestamp> 로 옮기고 새로 쓴다 — 원본 내용이 그 파일에 그대로 남는다', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, CAPTURE_FILE), '{ 깨진 JSON');
    const { quarantined } = writeCaptureResults(dir, [{ name: 'V1' }], { now: NOW });

    expect(quarantined).toBe(path.join(dir, BAD_NAME));
    expect(fs.readFileSync(path.join(dir, BAD_NAME), 'utf8')).toBe('{ 깨진 JSON');
    expect(readJson(dir)).toEqual([{ name: 'V1' }]);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('JSON 이지만 배열이 아니면 같은 격리를 한다(병합 키가 성립하지 않는다)', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, CAPTURE_FILE), '{"name":"V1"}');
    const { quarantined } = writeCaptureResults(dir, [{ name: 'V2' }], { now: NOW });

    expect(quarantined).toBe(path.join(dir, BAD_NAME));
    expect(readJson(dir)).toEqual([{ name: 'V2' }]);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('멀쩡한 파일은 격리하지 않는다(오탐 0)', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, CAPTURE_FILE), JSON.stringify([{ name: 'V1' }]));
    const { prev, quarantined } = loadCaptureResults(dir, { now: NOW });
    expect(quarantined).toBeNull();
    expect(prev).toEqual([{ name: 'V1' }]);
    expect(fs.existsSync(path.join(dir, BAD_NAME))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
