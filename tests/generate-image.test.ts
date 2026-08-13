// `scripts/generate-image.mjs` + `scripts/png-chunks.mjs` — **키가 안 새는가, 오타가 안 통하는가.**
//
// ── 왜 이 파일이 생겼나 (검수관 조건 C1 · 보안담당 P1, 2026-08-13) ──────────
// 첫 판본은 파일 헤더에 *"응답 본문을 통째로 찍지 않는다"* 라고 **단언**했는데,
// 그 단언을 검사하는 것이 하나도 없었다. 두 리뷰어가 각자 뮤테이션을 돌려 뚫었다:
//
//   · `sk-proj-…` 형태의 토큰이 **평문 통과**했다 — 마스킹이 `AIza` **접두 추측**에
//     의존했기 때문이다. 우리는 실제 키 값을 갖고 있는데 그것으로 치환하지 않았다.
//   · `res.ok` 경로의 `JSON.parse` 가 `safeError` 를 **안 거쳤고**, Node 는 비-JSON
//     본문의 **앞 10자를 에러 메시지에 반향**한다.
//   · `IMAGE_OUT=frontend/js/main.js` 가 보호파일을 이미지 바이너리로 덮어쓰고
//     **PR 까지 만들어졌다.**
//
// 이 저장소는 *"정규식 한 글자가 깨지면 보호가 조용히 사라진다"* 를 hookify 회차에서
// 이미 배웠다(검수관 반려 B1·B4). 그래서 여기서는 **마스킹을 뚫으려는 쪽**으로 쓴다 —
// "가려졌다" 를 확인하는 것이 아니라 **원문이 출력에 남아 있지 않은지**를 본다.
//
// ⚠ **이 파일이 못 보는 것**: 네트워크 왕복 전체, 실제 Gemini 응답의 모양,
//    `main()` 의 흐름. `pickImageModels` 는 우리가 지어낸 목록에 대한 **순서**만 검사한다.
//    ⚠ run #1 이 그 한계를 실물로 보여줬다 — 메서드 목록이 `predict` 라고 말한 모델이
//    `HTTP 404` 를 냈다. **목록이 말하는 것과 서버가 받아 주는 것은 다르고, 그 차이는
//    불러 봐야만 안다.** 그래서 호출부에 폴백을 넣었고 그 폴백은 여기서 안 잰다.

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import {
  safeError,
  maskSecrets,
  resolveOutPath,
  assertImageBytes,
  detectImageFormat,
  reconcileExtension,
  pickImageModels,
  generateWithFallback,
  call,
  ALLOWED_EXT,
  MAX_BYTES,
} from '../scripts/generate-image.mjs';
import { inspect, pngChunks, jpegSegments, findExtra, peek, ACCEPTED, RENDER } from '../scripts/png-chunks.mjs';

const KEY = 'AIzaSyTESTKEY_0123456789abcdefghijkl';
const ODD_KEY = 'sk-proj-9f2b7c1d4e-NOTGOOGLESHAPED';

describe('G-KEY 키 마스킹 — 출력에 원문이 남지 않는가', () => {
  it('error.status 경로: 키가 애초에 안 실린다', () => {
    const body = JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: `key ${KEY} bad` } });
    const out = safeError(400, body, KEY);
    expect(out).toBe('HTTP 400 · INVALID_ARGUMENT');
    expect(out).not.toContain(KEY);
  });

  it('message 에 키가 반향돼도 원문이 안 남는다', () => {
    const body = JSON.stringify({ error: { message: `API key ${KEY} is invalid` } });
    const out = safeError(400, body, KEY);
    expect(out).not.toContain(KEY);
    expect(out).toContain('[KEY]');
  });

  // ⚠ **이 케이스가 첫 판본을 뚫은 것이다.** `AIza` 정규식만 있으면 통과한다 —
  //   그래서 여기서 깨지지 않으면 마스킹은 형식 추측으로 되돌아간 것이다.
  it('구글 형식이 아닌 키도 가려진다 (접두 추측에 의존하지 않는다)', () => {
    const body = JSON.stringify({ error: { message: `bad token ${ODD_KEY} denied` } });
    const out = safeError(403, body, ODD_KEY);
    expect(out).not.toContain(ODD_KEY);
    expect(out).toContain('[KEY]');
  });

  it('본문이 JSON 이 아니면 본문 조각이 안 새어 나온다', () => {
    const out = safeError(502, `<html>proxy error ${KEY}</html>`, KEY);
    expect(out).toBe('HTTP 502');
    expect(out).not.toContain(KEY);
    expect(out).not.toContain('proxy');
  });

  it('키를 안 넘겨도 AIza 계열은 정규식이 잡는다 (두 겹 중 둘째)', () => {
    expect(maskSecrets(`see ${KEY} here`, undefined)).not.toContain(KEY);
  });

  // 짧은 문자열로 split 하면 무관한 곳까지 쪼개진다 — 키다운 길이일 때만 치환한다.
  it('짧은 키 값은 치환 대상이 아니다 (오탐 방지)', () => {
    expect(maskSecrets('abcabc', 'abc')).toBe('abcabc');
  });

  it('message 는 120자에서 잘린다 — 긴 본문이 통째로 안 나간다', () => {
    const body = JSON.stringify({ error: { message: 'x'.repeat(500) } });
    expect(safeError(400, body, KEY).length).toBeLessThan(140);
  });
});

describe('G-PATH 출력 경로 — 감독의 오타가 저장소를 안 망가뜨리는가', () => {
  const ROOT = '/repo';

  it('정상 경로는 통과한다', () => {
    expect(resolveOutPath('frontend/img/hero.png', ROOT)).toBe('/repo/frontend/img/hero.png');
  });

  it.each(['../outside.png', '../../etc/x.png', '/etc/passwd.png'])(
    '저장소 밖은 거부한다: %s',
    (p) => {
      expect(() => resolveOutPath(p, ROOT)).toThrow(/저장소 밖/);
    },
  );

  // ⚠ **이것이 검수관 P2 가 실측한 사고다.** 확장자 화이트리스트가 이 축을 닫는다 —
  //   보호파일 목록을 여기 다시 적으면 값 미러링이라 그렇게 하지 않았다.
  it.each([
    'frontend/js/main.js',
    '.github/workflows/ci.yml',
    'frontend/img/hero.svg',
    'frontend/img/hero',
  ])('이미지가 아닌 확장자는 거부한다: %s', (p) => {
    expect(() => resolveOutPath(p, ROOT)).toThrow(/확장자/);
  });

  // ⚠ **이 케이스는 두 검사가 겹쳐 있어 어느 쪽의 증거도 되지 못한다.**
  //   뮤테이션 M6 실측(2026-08-13): `rel === '' || rel.startsWith('..')` 블록을 통째로
  //   지워도 이 케이스는 **안 깨졌다.** 코드 그대로면 `rel === ''` 가 먼저 잡고(실측:
  //   "저장소 밖이다"), 그 블록을 지우면 `.` 의 확장자가 빈 문자열이라 **확장자 검사가
  //   대신 잡는다.** 즉 **하나가 사라져도 다른 하나가 통과시켜 준다.**
  //   그래서 어느 메시지를 단언해도 검출력이 없다 — 남겨 두되 **무엇의 증거가 아닌지**를
  //   적는다. 경로 검사의 검출력은 위 `저장소 밖은 거부한다` 3건이 담당한다.
  it('루트 자신도 거부한다 (두 검사가 겹친 자리 — 어느 쪽 증거도 아니다)', () => {
    expect(() => resolveOutPath('.', ROOT)).toThrow();
  });

  // ⚠ **run #2 수정이 새로 연 표면**(검수관 P1). `path.extname` 이 `.png` 를 내므로
  //   확장자 검사만으로는 통과한다. 그 값이 `GITHUB_ENV` 에 append 되면 **개행 뒤에
  //   임의의 `key=value` 줄**이 들어간다.
  it.each([
    'frontend/img/a\nfoo=bar.png',
    'frontend/img/a\rb.png',
    'frontend/img/a\u0000b.png',
  ])('제어문자가 든 경로는 거부한다: %j', (p) => {
    expect(() => resolveOutPath(p, ROOT)).toThrow(/제어문자/);
  });

  it('허용 확장자는 이미지뿐이다 — .svg 는 일부러 빠져 있다', () => {
    expect([...ALLOWED_EXT].sort()).toEqual(['.jpeg', '.jpg', '.png', '.webp']);
    expect(ALLOWED_EXT.has('.svg')).toBe(false);
  });
});

// 테스트용 최소 PNG. 청크를 덧붙일 수 있게 조립기로 만든다.
function crc32(buf: Buffer): number {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = t[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makePng(extra: Array<[string, Buffer]> = []): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    ...extra.map(([t, d]) => chunk(t, d)),
    chunk('IDAT', zlib.deflateSync(Buffer.from([0, 128, 128, 128]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('G-BYTES 내용 검증 — 확장자와 실제 형식이 어긋나면 잡는가', () => {
  it('PNG 는 통과한다', () => {
    expect(assertImageBytes(makePng(), '.png')).toBe('PNG');
  });

  it('PNG 내용을 .jpg 로 저장하려 하면 거부한다', () => {
    expect(() => assertImageBytes(makePng(), '.jpg')).toThrow(/JPEG 이 아니다/);
  });

  it('JPEG 내용을 .png 로 저장하려 하면 거부한다', () => {
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
    expect(() => assertImageBytes(jpeg, '.png')).toThrow(/PNG 이 아니다/);
  });

  it('0바이트를 거부한다', () => {
    expect(() => assertImageBytes(Buffer.alloc(0), '.png')).toThrow(/0바이트/);
  });

  // git 히스토리는 파일을 지워도 blob 이 남는다 — 커밋 **전에** 막아야 한다.
  it('상한을 넘는 파일을 거부한다', () => {
    const big = Buffer.alloc(MAX_BYTES + 1);
    big.set([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(() => assertImageBytes(big, '.png')).toThrow(/상한/);
  });

  it('WebP 는 RIFF/WEBP 두 자리를 다 본다', () => {
    const ok = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)]);
    expect(assertImageBytes(ok, '.webp')).toBe('WEBP');
    const bad = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE'), Buffer.alloc(8)]);
    expect(() => assertImageBytes(bad, '.webp')).toThrow(/WebP 가 아니다/);
  });
});

describe('G-EXT 실제 형식에 확장자를 맞추는가 (run #2 가 죽은 자리)', () => {
  const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
  const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)]);

  it.each([
    ['PNG', () => makePng(), '.png'],
    ['JPEG', () => JPEG, '.jpg'],
    ['WEBP', () => WEBP, '.webp'],
  ])('바이트로 형식을 판정한다 — %s', (label, make, ext) => {
    expect(detectImageFormat((make as () => Buffer)())).toEqual({ label, ext });
  });

  it('알 수 없는 바이트는 null 이다 — 짐작하지 않는다', () => {
    expect(detectImageFormat(Buffer.from('not an image'))).toBeNull();
  });

  // ⚠⚠ **run #2 가 여기서 죽었다.** Imagen 이 전부 404 라 Gemini 로 폴백했고, 그 모델이
  //   이미지를 돌려줬는데 요청 경로가 `hero.png` 여서 `내용이 PNG 이 아니다` 로 거부됐다.
  //   **모델이 무슨 형식을 줄지 우리가 정할 수 없다.**
  it('요청이 .png 인데 JPEG 이 오면 확장자를 바꾼다', () => {
    const r = reconcileExtension('/repo/frontend/img/hero.png', JPEG);
    expect(r.path).toBe('/repo/frontend/img/hero.jpg');
    expect(r.changed).toBe(true);
    expect(r.label).toBe('JPEG');
  });

  it('형식이 맞으면 경로를 안 건드린다', () => {
    const r = reconcileExtension('/repo/frontend/img/hero.png', makePng());
    expect(r.path).toBe('/repo/frontend/img/hero.png');
    expect(r.changed).toBe(false);
  });

  // `.jpeg` 와 `.jpg` 는 둘 다 맞다 — 굳이 바꾸면 요청한 이름이 사라진다.
  it('.jpeg 요청에 JPEG 이 오면 그대로 둔다', () => {
    expect(reconcileExtension('/repo/a/b.jpeg', JPEG).changed).toBe(false);
  });

  it('알 수 없는 형식이면 던진다 — 아무 확장자나 붙이지 않는다', () => {
    expect(() => reconcileExtension('/repo/a/b.png', Buffer.from('nope'))).toThrow(/알려진 이미지 형식이 아니다/);
  });

  // 디렉터리 이름에 점이 있어도 파일 확장자만 바꾼다.
  it('경로 중간의 점을 건드리지 않는다', () => {
    expect(reconcileExtension('/repo/v1.2/hero.png', JPEG).path).toBe('/repo/v1.2/hero.jpg');
  });
});

describe('G-MODEL 모델 후보 — 순서가 재현 가능한가, 변종이 앞서지 않는가', () => {
  const M = (name: string, methods: string[]) => ({ name: `models/${name}`, supportedGenerationMethods: methods });
  const first = (list: unknown[]) => pickImageModels(list as never).candidates[0];

  it('predict 를 지원하는 imagen 을 최우선으로 고른다', () => {
    const c = first([
      M('gemini-2.5-flash-image', ['generateContent']),
      M('imagen-4.0-generate-001', ['predict']),
    ]);
    expect(c.model).toBe('imagen-4.0-generate-001');
    expect(c.kind).toBe('predict');
  });

  // ⚠⚠ **run #1 이 죽은 자리다**(2026-08-13 실측). 이름 내림차순 정렬이라
  //   `ultra`(u) 가 `generate`(g) 를 앞섰고, 그 모델이 `HTTP 404 · NOT_FOUND` 를 냈다.
  //   재현성을 위해 넣은 정렬이 **하필 접근 안 되는 변종을 최우선으로 만들었다.**
  // ⚠⚠ **표준 짝의 버전을 일부러 낮춘다.** 같은 버전(`4.0`)으로 두면 변종 판정이
  //   무너져도 이름 내림차순이 우연히 같은 답을 내서 **검출력이 0**이 된다 —
  //   실측: `experimental` 대안을 지워도 **0 failed** 였다(검수관 N-1).
  //   버전을 낮추면 갈린다: 변종 판정이 살아 있으면 `3.0` 표준이 앞서고, 판정이
  //   무너지면 둘 다 표준이 되어 **버전 내림차순으로 `4.0` 변종이 앞선다.**
  //   *"내가 만든 케이스가 우연히 통과한다"* 는 오늘 **세 번째**다.
  it.each(['ultra', 'fast', 'preview', 'exp', 'experimental'])(
    '%s 변종은 표준 모델보다 뒤에 온다 (run #1 이 죽은 자리)',
    (v) => {
      const c = first([
        M(`imagen-4.0-${v}-generate-001`, ['predict']),
        M('imagen-3.0-generate-001', ['predict']),
      ]);
      expect(c.model).toBe('imagen-3.0-generate-001');
    },
  );

  // ⚠ 변종이 **사라지는** 것은 아니다 — 뒤로 갈 뿐이다. 표준이 404 를 내면 시도한다.
  it('변종도 후보에는 남는다 — 표준이 실패하면 써야 한다', () => {
    const { candidates } = pickImageModels([
      M('imagen-4.0-ultra-generate-001', ['predict']),
      M('imagen-4.0-generate-001', ['predict']),
    ] as never);
    expect(candidates.map((c) => c.model)).toEqual([
      'imagen-4.0-generate-001',
      'imagen-4.0-ultra-generate-001',
    ]);
  });

  // ⚠ 첫 판본은 `supportedGenerationMethods` 를 **안 읽으면서** 주석에 *"실제로 쓸 수
  //   있는"* 이라고 적었다(검수관 P4). 목록에 있다는 것과 부를 수 있다는 것은 다르다.
  //   ⚠⚠ 그리고 **메서드가 맞아도 부를 수 있는 것은 아니다** — run #1 의 404 가 그것이다.
  //   그래서 이 검사는 「고른다」가 아니라 「순서」만 보증한다. 실제 가부는 호출부가
  //   차례로 시도해서 확인한다.
  it('predict 를 지원하지 않는 imagen 은 predict 후보에 안 넣는다', () => {
    const c = first([
      M('imagen-3.0-nope', ['embedContent']),
      M('gemini-2.5-flash-image', ['generateContent']),
    ]);
    expect(c.model).toBe('gemini-2.5-flash-image');
    expect(c.kind).toBe('generateContent');
  });

  // 같은 키로 두 번 돌렸을 때 순서가 달라지면 안 된다.
  it('응답 배열 순서가 바뀌어도 후보 순서가 같다', () => {
    const a = [M('imagen-3.0-generate-002', ['predict']), M('imagen-4.0-generate-001', ['predict'])];
    const names = (l: unknown[]) => pickImageModels(l as never).candidates.map((c) => c.model);
    expect(names(a)).toEqual(names([...a].reverse()));
  });

  it('버전이 높은 쪽을 먼저 시도한다 — 숫자로 비교한다', () => {
    const c = first([
      M('imagen-4.0-generate-001', ['predict']),
      M('imagen-10.0-generate-001', ['predict']),
    ]);
    expect(c.model).toBe('imagen-10.0-generate-001');
  });

  it('메서드 목록이 아예 없는 응답이면 이름으로 폴백하고 그 사실을 알린다', () => {
    const r = pickImageModels([{ name: 'models/imagen-4.0-generate-001' }] as never);
    expect(r.candidates[0].model).toBe('imagen-4.0-generate-001');
    expect(r.hasMethods).toBe(false);
  });

  it('이미지 모델이 없으면 후보 0개다 — 아무거나 고르지 않는다', () => {
    expect(pickImageModels([M('gemini-2.5-pro', ['generateContent'])] as never).candidates).toHaveLength(0);
  });

  // ⚠⚠ **검수관 B-1 이 실측한 회귀다 — 내가 폴백을 넣으면서 만들었다.**
  //   `imagen` 안에 `image` 가 들어 있어 tier1(`/^imagen-\d/`)과 tier2(`/image/`)가
  //   **같은 모델에 동시 매치**한다. 이전 판본은 첫 tier 에서 `return` 해 구조적으로
  //   불가능했는데, 누적으로 바꾸면서 열렸다. `hasMethods=false` 면 `supports()` 가
  //   항상 참이라 **모든 imagen 이 반드시 2배**가 되고, `imagen-x:generateContent` 는
  //   거의 확실히 실패할 호출이라 `failures` 목록에 **구조적 노이즈**를 넣는다.
  //   이번 개정의 존재 이유가 *"실패 사유 목록이 다음 진단의 근거"* 인데 그 근거를 갉는다.
  it('메서드 목록이 없어도 같은 모델이 두 번 오지 않는다', () => {
    const { candidates } = pickImageModels([
      { name: 'models/imagen-4.0-generate-001' },
      { name: 'models/imagen-4.0-ultra-generate-001' },
    ] as never);
    expect(new Set(candidates.map((c) => c.model)).size).toBe(candidates.length);
  });

  it('imagen 이 generateContent 도 신고해도 두 번 오지 않는다', () => {
    const { candidates } = pickImageModels([
      M('imagen-4.0-generate-001', ['predict', 'generateContent']),
    ] as never);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].kind).toBe('predict');
  });

  // ⚠ **검수관 N-3**: 첫 수정은 이름(`!/^imagen-\d/`)으로 배제해 **커버리지를 줄였다** —
  //   `imagen` 이 `generateContent` 만 신고하면 후보에서 완전히 탈락했다. `imagen` 이
  //   predict 전용이라는 것은 **실물 응답을 본 적 없는 가정**이다.
  it('imagen 이 generateContent 만 신고하면 그 후보로 살아남는다', () => {
    const { candidates } = pickImageModels([
      M('imagen-5.0-generate-001', ['generateContent']),
    ] as never);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].kind).toBe('generateContent');
  });

  it('imagen 이 아닌 이미지 모델은 generateContent 후보로 남는다', () => {
    const { candidates } = pickImageModels([
      M('gemini-2.5-flash-image', ['generateContent']),
    ] as never);
    expect(candidates.map((c) => c.kind)).toEqual(['generateContent']);
  });

  // ⚠ `exp`·`fast` 는 부분 문자열이라 경계가 없으면 표준 이름에 우연히 들어갔을 때
  //   오탐한다(검수관 P-1). 하이픈 경계를 쓰는지 본다.
  // ⚠⚠ **첫 판본은 이 케이스가 우연히 통과했다**(내 뮤테이션 R-2 = 0 failed).
  //   `fastidious` 와 `fast-001` 을 나란히 뒀는데, 경계를 지우면 **둘 다** 변종이 되어
  //   순서가 그대로였다 — 즉 경계가 있으나 없으나 결과가 같아 **검출력이 0**이었다.
  //   짝을 **변종이 아닌 표준**과 맞춰야 갈린다: 경계가 있으면 `ultrasonic` 은 표준이라
  //   이름 내림차순으로 앞서고, 경계를 지우면 변종으로 몰려 뒤로 밀린다.
  //   *"내가 만든 케이스가 우연히 통과한다"* 는 오늘 이 회차에서 두 번째다.
  it('변종 판정은 하이픈 경계를 쓴다 — 부분 문자열로 오탐하지 않는다', () => {
    const { candidates } = pickImageModels([
      M('imagen-4.0-generate-001', ['predict']),     // 표준
      M('imagen-4.0-ultrasonic-001', ['predict']),   // 'ultra' 를 품지만 변종이 아니다
    ] as never);
    expect(candidates[0].model).toBe('imagen-4.0-ultrasonic-001');
  });

  it('진짜 변종은 표준보다 뒤다 — 위 케이스가 경계 때문임을 못 박는다', () => {
    const { candidates } = pickImageModels([
      M('imagen-4.0-ultra-001', ['predict']),
      M('imagen-4.0-generate-001', ['predict']),
    ] as never);
    expect(candidates[0].model).toBe('imagen-4.0-generate-001');
  });

  it('빈 응답에도 안 죽는다', () => {
    expect(pickImageModels(undefined as never).candidates).toHaveLength(0);
    expect(pickImageModels([] as never).candidates).toHaveLength(0);
  });
});

describe('G-FALLBACK 후보가 실패하면 다음으로 가는가 (run #1 이 죽은 자리)', () => {
  const C = (model: string) => ({ model, kind: 'predict' });

  it('첫 후보가 성공하면 거기서 멈춘다 — 요금을 더 쓰지 않는다', async () => {
    const tried: string[] = [];
    const r = await generateWithFallback([C('a'), C('b')], async (c) => {
      tried.push(c.model);
      return { b64: 'x' };
    });
    expect(tried).toEqual(['a']);
    expect(r.picked!.model).toBe('a');
  });

  // ⚠ run #1 실물: `imagen-4.0-ultra-generate-001` 이 `HTTP 404 · NOT_FOUND` 를 냈다.
  it('404 를 내면 다음 후보로 간다', async () => {
    const r = await generateWithFallback([C('ultra'), C('std')], async (c) => {
      if (c.model === 'ultra') throw new Error('HTTP 404 · NOT_FOUND');
      return { b64: 'ok' };
    });
    expect(r.picked!.model).toBe('std');
    expect(r.out.b64).toBe('ok');
  });

  it('실패 사유를 모아 둔다 — 왜 이 모델이 됐는지 다음 사람이 봐야 한다', async () => {
    const r = await generateWithFallback([C('a'), C('b')], async (c) => {
      if (c.model === 'a') throw new Error('HTTP 404 · NOT_FOUND');
      return { b64: 'ok' };
    });
    expect(r.failures).toEqual(['a: HTTP 404 · NOT_FOUND']);
  });

  it('전부 실패하면 picked 가 null 이고 사유가 전부 남는다', async () => {
    const r = await generateWithFallback([C('a'), C('b')], async () => {
      throw new Error('HTTP 403 · PERMISSION_DENIED');
    });
    expect(r.picked).toBeNull();
    expect(r.failures).toHaveLength(2);
  });

  // ⚠ 429 는 후보를 바꿔도 안 풀리고 N번 두드리면 악화된다(검수관 P-3).
  it('429 를 만나면 남은 후보를 두드리지 않는다', async () => {
    const tried: string[] = [];
    const r = await generateWithFallback([C('a'), C('b'), C('c')], async (c) => {
      tried.push(c.model);
      throw new Error('HTTP 429 · RESOURCE_EXHAUSTED');
    });
    expect(tried).toEqual(['a']);
    expect(r.picked).toBeNull();
  });

  it('429 가 아닌 실패는 계속 시도한다 — 429 만 특별하다', async () => {
    const tried: string[] = [];
    const r = await generateWithFallback([C('a'), C('b'), C('c')], async (c) => {
      tried.push(c.model);
      throw new Error('HTTP 404 · NOT_FOUND');
    });
    expect(tried).toEqual(['a', 'b', 'c']);
    expect(r.picked).toBeNull();
  });

  // ⚠ **검수관 N-2 / G-LOG1**: 429 로 중단하면 시도한 수 < 후보 수다. 로그가
  //   "후보 N개가 전부 실패했다" 라고 적으면 **시도하지 않은 것을 실패로 적는 것**이다.
  //   문구가 아니라 **개수의 출처**를 잰다 — `failures` 가 실제 시도 수와 같은가.
  it('429 로 중단하면 failures 가 시도한 수만큼만 쌓인다', async () => {
    const r = await generateWithFallback([C('a'), C('b'), C('c')], async () => {
      throw new Error('HTTP 429 · RESOURCE_EXHAUSTED');
    });
    expect(r.failures).toHaveLength(1);
  });

  it('후보가 0개면 조용히 성공하지 않는다', async () => {
    const r = await generateWithFallback([], async () => ({ b64: 'x' }));
    expect(r.picked).toBeNull();
  });

  it('실패를 로그로 알린다 — 조용히 넘어가지 않는다', async () => {
    const lines: string[] = [];
    await generateWithFallback([C('a'), C('b')], async (c) => {
      if (c.model === 'a') throw new Error('HTTP 404 · NOT_FOUND');
      return { b64: 'ok' };
    }, (m) => lines.push(m));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('404');
    expect(lines[0]).toContain('다음 후보로 간다');
  });
});

describe('G-META 메타데이터 열거 — 딸려 온 것이 보이는가', () => {
  it('평범한 PNG 는 필수 청크만 나온다', () => {
    const { kind, chunks } = inspect(makePng());
    expect(kind).toBe('png');
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
  });

  // C2PA 매니페스트는 이런 형태로 실린다(`caBX`). 이름과 크기가 보여야 한다.
  it('덧붙은 메타데이터 청크를 이름과 크기로 잡는다', () => {
    const payload = Buffer.from('c2pa manifest here');
    const { chunks } = inspect(makePng([['caBX', payload]]));
    const hit = chunks.find((c) => c.type === 'caBX');
    expect(hit).toBeDefined();
    expect(hit!.length).toBe(payload.length);
  });

  it('iTXt(XMP) 도 잡는다', () => {
    const { chunks } = inspect(makePng([['iTXt', Buffer.from('XML:com.adobe.xmp')]]));
    expect(chunks.map((c) => c.type)).toContain('iTXt');
  });

  // ⚠ **첫 판본은 여기서 아무것도 안 지켰다.** 뮤테이션 M11 실측(2026-08-13):
  //   `if (type === 'IEND') break;` 를 지워도 **안 깨졌다.** 꼬리가 `'GARBAGE'` 7바이트라
  //   `off + 8 <= buf.length` 경계 검사가 먼저 루프를 끝냈기 때문이다 — **break 가 필요한
  //   상황을 만들지 못한 것**이지 break 가 동작한 것이 아니었다.
  //   그래서 꼬리를 **유효한 청크 모양**으로 바꾼다. 이제 break 가 없으면 실제로 더 읽는다.
  it('IEND 뒤로는 읽지 않는다 — 뒤에 유효한 청크가 있어도', () => {
    const withTail = Buffer.concat([makePng(), chunk('tEXt', Buffer.from('청크처럼 생긴 꼬리'))]);
    const types = pngChunks(withTail).map((c) => c.type);
    expect(types.at(-1)).toBe('IEND');
    expect(types).not.toContain('tEXt');
  });

  it('알 수 없는 형식은 kind 가 null 이다 — 깨끗하다고 적지 않는다', () => {
    expect(inspect(Buffer.from('not an image at all')).kind).toBeNull();
  });
});

// ⚠ **여기부터가 재검수에서 「검사 0건」으로 반려된 축이다**(검수관 B-2·P-1).
//   앞의 순수 함수 검사가 아무리 촘촘해도, **그 값이 실제로 소비되는가**와
//   **게이트가 exit 1 을 내는가**는 별개의 축이고 둘 다 0이었다.

describe('G-CALL safeError 가 실제로 소비되는가 (순수 함수 검사와 별개 축)', () => {
  const res = (status: number, body: string) => ({ ok: status < 400, status, text: async () => body });

  it('에러 응답이 safeError 를 거쳐 나온다 — 본문이 안 샌다', async () => {
    const fake = (async () => res(400, JSON.stringify({ error: { message: `key ${KEY} bad` } }))) as unknown as typeof fetch;
    await expect(call('/models', { method: 'GET' }, KEY, fake)).rejects.toThrow(/\[KEY\]/);
    await expect(call('/models', { method: 'GET' }, KEY, fake)).rejects.not.toThrow(new RegExp(KEY.slice(4)));
  });

  // 200 인데 JSON 이 아닌 응답(프록시 인터셉트 등). Node 의 JSON.parse 에러 메시지는
  // **본문 앞 10자를 반향**하므로 그것을 그대로 던지면 새어 나간다.
  it('200 인데 비-JSON 이면 본문 조각이 안 새어 나온다', async () => {
    const leak = `<html>proxy ${KEY}</html>`;
    const fake = (async () => res(200, leak)) as unknown as typeof fetch;
    await expect(call('/models', { method: 'GET' }, KEY, fake)).rejects.toThrow(/응답이 JSON 이 아니다/);
    await expect(call('/models', { method: 'GET' }, KEY, fake)).rejects.not.toThrow(/html|proxy/);
  });

  it('키는 헤더로만 간다 — URL 에 안 실린다', async () => {
    let seenUrl = '';
    let seenHeaders: Record<string, string> = {};
    const fake = (async (url: string, init: RequestInit) => {
      seenUrl = url;
      seenHeaders = init.headers as Record<string, string>;
      return res(200, '{"models":[]}');
    }) as unknown as typeof fetch;
    await call('/models', { method: 'GET' }, KEY, fake);
    expect(seenUrl).not.toContain(KEY);
    expect(seenUrl).not.toContain('key=');
    expect(seenHeaders['x-goog-api-key']).toBe(KEY);
  });

  it('정상 JSON 은 파싱해서 돌려준다 — 실패 경로만 있는 검사가 아니다', async () => {
    const fake = (async () => res(200, '{"models":[{"name":"models/x"}]}')) as unknown as typeof fetch;
    expect((await call('/models', { method: 'GET' }, KEY, fake)).models).toHaveLength(1);
  });
});

// ⚠⚠ **이 픽스처가 4차 반려의 본체다**(검수관 B-5). 첫 판본은 `DQT`·`SOF0`·`SOS` 셋뿐
//   이었고, 그래서 `jpegMarkerName` 의 **DHT·APPn 계열 매핑에 검출력이 0** 이었다.
//   검수관이 실물 JPEG 으로 뮤테이션 둘을 돌려 갈랐다:
//     · M-A `m !== 0xc4` 제거(DHT→SOF4, **거짓 FAIL** 방향) → CLI exit 1 로 잡힘,
//       그러나 **테스트 86개는 전부 초록**
//     · M-B APPn 을 전부 `'APP0'` 으로(APP2·APP11 이 렌더로, **거짓 PASS** 방향)
//       → **CLI 도 exit 0, 테스트도 초록 — 양쪽 다 0**
//   M-B 가 본체다. 한 줄 회귀로 **C2PA 매니페스트가 게이트를 통과**하는데, 이 게이트의
//   존재 이유가 바로 그것을 막는 것이다. M-A 는 빨간불이라 사람이 알아채지만
//   **M-B 는 조용하다.**
//   그래서 픽스처에 **DHT 와 APP2 를 넣는다.** `toContain` 이 아니라 `toEqual` 인 것도
//   조건이다 — 오분류는 "빠지고 다른 것이 들어오는" 형태라 포함 검사로는 안 잡힌다.
const JPEG_FIXTURE = Buffer.from([
  0xff, 0xd8,                                // SOI (파서는 여기 다음부터 읽는다)
  0xff, 0xdb, 0x00, 0x04, 0, 0,              // DQT
  0xff, 0xe2, 0x00, 0x06, 0x49, 0x43, 0x43, 0x00, // APP2 — ICC 이자 C2PA 컨테이너
  0xff, 0xc0, 0x00, 0x04, 0, 0,              // SOF0
  0xff, 0xc4, 0x00, 0x04, 0, 0,              // DHT  ← 0xc4 는 SOF4 가 아니다
  0xff, 0xda, 0x00, 0x08, 1, 0, 0, 0,        // SOS
  0x12, 0x34, 0x56, 0x78,                    // 압축 데이터
  // ⚠ 압축데이터를 붙이는 것은 장식이 아니다 — 루프가 `off + 4 <= length` 라
  //   SOS 가 파일 끝 2바이트면 **읽히지 않는다.** 실물 모양에 맞춘다.
]);
describe('G-META2 게이트가 실제로 exit 1 을 내는가 (--fail-on-extra)', () => {
  // ⚠ 파일명이 `.png` 인데 JPEG 버퍼도 넣는다(검수관 P-l). 의도다 — `inspect` 는
  //   **매직 바이트**로 형식을 가르지 확장자를 안 본다. 확장자를 맞추면 그 사실이
  //   가려지고, 다음 사람이 "확장자로 판정하나" 로 읽는다.
  const run = (buf: Buffer, extraArgs: string[] = []) => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'oas-chunk-')), 'x.png');
    fs.writeFileSync(f, buf);
    const r = spawnSync('node', [path.resolve(__dirname, '../scripts/png-chunks.mjs'), f, ...extraArgs], {
      encoding: 'utf8',
    });
    fs.rmSync(path.dirname(f), { recursive: true, force: true });
    return r;
  };

  it('깨끗한 PNG 는 통과한다', () => {
    expect(run(makePng(), ['--fail-on-extra']).status).toBe(0);
  });

  it('C2PA 매니페스트가 있으면 커밋 전에 죽는다', () => {
    const r = run(makePng([['caBX', Buffer.from('manifest')]]), ['--fail-on-extra']);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/커밋 전에 세운다/);
  });

  it('플래그가 없으면 열거만 하고 안 죽는다 — 관측 모드', () => {
    expect(run(makePng([['caBX', Buffer.from('manifest')]])).status).toBe(0);
  });

  // **못 읽은 것을 「깨끗하다」로 적지 않는다** — 형식 미판독은 fail-closed 여야 한다.
  it('형식을 못 읽으면 통과시키지 않는다', () => {
    expect(run(Buffer.from('this is not an image'), ['--fail-on-extra']).status).toBe(1);
  });

  it('텍스트 청크(tEXt)도 잡는다 — 메타데이터는 렌더 목록에 없다', () => {
    expect(run(makePng([['tEXt', Buffer.from('Comment\0hello')]]), ['--fail-on-extra']).status).toBe(1);
  });

  // ⚠ **CLI 축의 거짓 PASS 를 잡는 자리**(검수관 B-5 / 뮤테이션 M-B). APPn 매핑이
  //   무너져 `APP2` 가 `APP0`(렌더)으로 읽히면 **C2PA 컨테이너가 통째로 통과한다.**
  //   검수관 실측에서는 CLI 도 테스트도 그것을 못 잡았다 — 이 케이스가 CLI 쪽을 닫는다.
  it('APP2 가 있는 JPEG 은 커밋 전에 죽는다 — C2PA 컨테이너 자리다', () => {
    const r = run(JPEG_FIXTURE, ['--fail-on-extra']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('APP2');
  });

  it('APP2 가 없는 JPEG 은 통과한다 — 위 케이스가 형식 탓이 아님을 못 박는다', () => {
    const noApp2 = Buffer.concat([JPEG_FIXTURE.subarray(0, 8), JPEG_FIXTURE.subarray(16)]);
    expect(run(noApp2, ['--fail-on-extra']).status).toBe(0);
  });

  // ⚠⚠ **팀장 조건 3 의 뮤테이션을 CLI 축에서 못 박는다**(2026-08-13).
  //   *"c2pa 가 아닌 가짜 APP11 로 게이트가 실제로 빨간불이 되는지 실측하고 기록한다."*
  //   위 `G-ACCEPT` 는 `findExtra` 를 **직접** 부르므로 `main()` 이 `buf` 를 넘기는지,
  //   기본 `ACCEPTED` 를 쓰는지는 안 본다 — 워크플로가 부르는 것은 **CLI** 다.
  //   스크래치에서 6케이스를 돌려 6/6 을 봤지만 **스크래치는 지워진다.** 남겨야 검사다.
  describe('APP11 통과 규칙 — 이름이 같아도 내용이 다르면 CLI 가 죽는다', () => {
    const seg = (marker: number, payload: Buffer) => {
      const len = Buffer.alloc(2);
      len.writeUInt16BE(payload.length + 2);
      return Buffer.concat([Buffer.from([0xff, marker]), len, payload]);
    };
    /** 렌더 청크만 있는 최소 JPEG + 끼워 넣을 세그먼트. */
    const jpegWith = (...extra: Buffer[]) => Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      seg(0xe0, Buffer.from('JFIF\0\x01\x02\0\0\x01\0\x01\0\0', 'latin1')),
      seg(0xdb, Buffer.alloc(65)), seg(0xc0, Buffer.alloc(15)), seg(0xc4, Buffer.alloc(29)),
      ...extra,
      Buffer.from([0xff, 0xda, 0x00, 0x0c, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    ]);
    /** APP11: CI2+En2+Z4 → jumb 슈퍼박스 → jumd 설명박스 → UUID16+toggles1 → label. */
    const app11 = (label: string, pad = 17) => seg(0xeb, Buffer.concat([
      Buffer.from('JP', 'latin1'), Buffer.alloc(6),
      Buffer.alloc(4), Buffer.from('jumb', 'latin1'),
      Buffer.alloc(4), Buffer.from('jumd', 'latin1'),
      Buffer.alloc(pad),
      Buffer.from(`${label}\0`, 'latin1'), Buffer.alloc(200),
    ]));

    it('진짜 C2PA(jumb + c2pa)는 통과한다', () => {
      expect(run(jpegWith(app11('c2pa')), ['--fail-on-extra']).status).toBe(0);
    });

    it('JUMBF 인데 label 이 c2pa 가 아니면 죽는다', () => {
      expect(run(jpegWith(app11('xmp ')), ['--fail-on-extra']).status).toBe(1);
    });

    it('c2pa 문자열만 있고 jumb 가 없으면 죽는다 — 부분일치로 안 뚫린다', () => {
      const fake = seg(0xeb, Buffer.concat([
        Buffer.from('JP', 'latin1'), Buffer.alloc(6),
        Buffer.from('Adobe XMP Core 5.6 c2pa', 'latin1'), Buffer.alloc(200),
      ]));
      expect(run(jpegWith(fake), ['--fail-on-extra']).status).toBe(1);
    });

    // 64B 창의 **경계 자체**를 검사한다. 창이 넓어지면 이 케이스가 통과로 뒤집히므로,
    // `peek` 기본값을 손대는 사람이 여기서 멈춘다.
    it('c2pa 가 64바이트 창 밖이면 못 본 것이다 — fail-closed', () => {
      expect(run(jpegWith(app11('c2pa', 80)), ['--fail-on-extra']).status).toBe(1);
    });

    it('APP11 이 아예 없으면 통과한다 — 위 케이스들이 형식 탓이 아니다', () => {
      expect(run(jpegWith(), ['--fail-on-extra']).status).toBe(0);
    });

    // 통과한 회차에도 **무엇이 통과했는지 로그에 남는다.** 안 남기면 팀장 조건의 취지
    // (*"사람이 실물을 보고 통과시킨다"*)가 정작 통과하는 회차에 깨진다 — 규칙이 보는
    // 것은 선두 64B 뿐이고 그 뒤 매니페스트 본문은 회차마다 달라도 통과하기 때문이다.
    it('통과시킨 것도 선두 64바이트를 찍는다', () => {
      const r = run(jpegWith(app11('c2pa')), ['--fail-on-extra']);
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/사람이 근거를 적어 통과시킨 것/);
      expect(r.stdout).toMatch(/APP11\s+JP\.+jumb\.+jumd/);
    });
  });
});

// ⚠ **이 절은 뮤테이션 N10 이 만든 것이다**(2026-08-13). `main()` 안에서
//   `&& !ACCEPTED.has(c.type)` 를 지워도 **아무 테스트도 안 깨졌다** — `ACCEPTED` 가 빈
//   집합이라 조건이 항상 참이어서다. 팀장 조건의 핵심 장치(*"사람이 실물을 보고 통과"*)에
//   **검사가 0** 이었고, 목록에 항목을 넣는 날 그것이 동작하는지 아무도 몰랐을 것이다.
//   "통과는 검출력의 증거가 아니다" 가 정확히 이 형태다 — 72개가 전부 초록이었다.
describe('G-ACCEPT 통과 규칙이 이름이 아니라 내용을 보는가 (팀장 조건 3)', () => {
  // ⚠⚠ **팀장 판정 2026-08-13(조건 3)으로 성격이 바뀐 절이다.** 전에는 `ACCEPTED` 가
  //   **타입 화이트리스트**였고, 검수관이 반복해서 경고했다: `APP11`·`APP2` 는
  //   **컨테이너 마커**라 여러 종류가 같은 이름으로 온다 — 이름만 올리면 *"그 이름으로
  //   오는 것은 앞으로 뭐든 통과한다."* 팀장이 그 경고를 **주석이 아니라 검사로**
  //   해소하라고 판정했다: `type` + `match(페이로드 선두)` 둘 다 맞아야 통과한다.
  const PAYLOAD = Buffer.from('....jumb....jumd..................c2pa\0manifest-body');
  const pngWith = (type: string) => {
    const buf = makePng([[type, PAYLOAD]]);
    return { buf, chunks: inspect(buf).chunks };
  };
  const RULE = { type: 'caBX', match: (h: string) => h.includes('jumb') && h.includes('c2pa') };

  it('규칙이 있어도 buf 가 없으면 통과시키지 않는다 (fail-closed)', () => {
    // **"못 봤다" 와 "봤는데 괜찮다" 를 같게 취급하지 않는다.**
    const { chunks } = pngWith('caBX');
    expect(findExtra(chunks, 'png', null, [RULE]).map((c) => c.type)).toContain('caBX');
  });

  it('buf 가 있고 내용이 맞으면 통과한다', () => {
    const { buf, chunks } = pngWith('caBX');
    expect(findExtra(chunks, 'png', buf, [RULE]).map((c) => c.type)).not.toContain('caBX');
  });

  // ⚠ **이것이 검수관 경고를 닫는 케이스다.** 이름은 같은데 내용이 다르면 막혀야 한다.
  it('이름이 같아도 내용이 다르면 막힌다 — 컨테이너 마커의 최악 사례', () => {
    const buf = makePng([['caBX', Buffer.from('some other payload entirely')]]);
    const { chunks } = inspect(buf);
    expect(findExtra(chunks, 'png', buf, [RULE]).map((c) => c.type)).toContain('caBX');
  });

  it('규칙에 없는 타입은 내용과 무관하게 막힌다', () => {
    const { buf, chunks } = pngWith('tEXt');
    expect(findExtra(chunks, 'png', buf, [RULE]).map((c) => c.type)).toContain('tEXt');
  });

  it('렌더 청크는 규칙과 무관하게 애초에 안 잡힌다', () => {
    const { buf, chunks } = pngWith('caBX');
    expect(findExtra(chunks, 'png', buf, [RULE]).some((c) => c.type === 'IHDR')).toBe(false);
  });

  it('알 수 없는 형식이면 전부 확인 대상이다 — 조용히 0개로 만들지 않는다', () => {
    const chunks = [{ type: 'IHDR', length: 13, at: 0 }, { type: 'caBX', length: 9, at: 0 }];
    expect(findExtra(chunks, 'gif' as 'png', null, [])).toHaveLength(2);
  });

  // 실물 규칙 자체를 못 박는다 — 근거 없이 늘어나면 통과 도장이 된다.
  it('기본 ACCEPTED 는 APP11 규칙 하나이고 c2pa 를 요구한다', () => {
    expect(ACCEPTED).toHaveLength(1);
    expect(ACCEPTED[0].type).toBe('APP11');
    expect(ACCEPTED[0].match('....jumb....jumd....c2pa')).toBe(true);
    expect(ACCEPTED[0].match('....jumb....jumd....xxxx')).toBe(false);  // c2pa 없음
    expect(ACCEPTED[0].match('....xxxx....jumd....c2pa')).toBe(false);  // jumb 없음
    expect(ACCEPTED[0].why).toMatch(/run #4/);
  });
});

describe('G-PEEK 페이로드 선두를 안전하게 찍는가 (팀장 조건 1)', () => {
  it('인쇄 가능 문자만 통과하고 나머지는 점이다', () => {
    const buf = Buffer.from([0x00, 0x01, 0x41, 0x42, 0x1f, 0x43, 0x7f, 0x80]);
    expect(peek(buf, { type: 'x', length: 8, at: 0 })).toBe('..AB.C..');
  });

  // ⚠ 64는 여유치가 아니라 **유도값**이다(팀장 조건 1): JUMBF 판별에 필요한 구조가
  //   46바이트이고 정렬 여유를 더해 64다. 그 자리에 오는 것은 규격상 **구조 헤더**이지
  //   서명·키 자료가 아니다 — 그것들은 수 KB 뒤다.
  it('기본 64바이트를 넘지 않는다 — 「모르는 것을 로그에」의 상한이다', () => {
    expect(peek(Buffer.alloc(1000, 0x41), { type: 'x', length: 1000, at: 0 })).toHaveLength(64);
  });

  it('파일 끝을 넘어가지 않는다', () => {
    expect(peek(Buffer.from('AB'), { type: 'x', length: 2, at: 0 })).toBe('AB');
  });

  it('오프셋이 음수여도 안 죽는다', () => {
    expect(() => peek(Buffer.from('AB'), { type: 'x', length: 2, at: -5 })).not.toThrow();
  });

  // ⚠⚠ **위 넷은 `at` 을 손으로 넣는다 — 그래서 파서가 계산한 `at` 이 맞는지는 검사가 0이다.**
  //   이것이 조용한 축이 아니다: `at` 이 몇 바이트 어긋나면 `peek` 이 엉뚱한 자리를 읽고
  //   **진짜 C2PA 도 `jumb` 판별에 실패해 계속 FAIL** 한다. 실패 방향은 안전하지만
  //   **사람을 「규칙을 넓히자」로 유도한다** — 이 파일이 내내 경계해 온 그 동선이다.
  //   각 형식의 헤더 크기가 다르므로(PNG len4+type4, JPEG 마커2+길이2, WebP fourcc4+size4)
  //   **셋을 따로 못 박는다.** 한 곳만 맞아도 나머지가 조용히 어긋날 수 있다.
  describe('파서가 계산한 at 이 실제 페이로드 선두를 가리키는가', () => {
    const MARK = 'PAYLOAD-STARTS-HERE';

    it('PNG', () => {
      const buf = makePng([['tEXt', Buffer.from(MARK)]]);
      const c = inspect(buf).chunks.find((x) => x.type === 'tEXt')!;
      expect(peek(buf, c)).toMatch(new RegExp(`^${MARK}`));
    });

    it('JPEG', () => {
      const payload = Buffer.from(MARK);
      const len = Buffer.alloc(2);
      len.writeUInt16BE(payload.length + 2);
      const buf = Buffer.concat([
        Buffer.from([0xff, 0xd8]),
        Buffer.from([0xff, 0xeb]), len, payload,        // APP11
        Buffer.from([0xff, 0xda, 0x00, 0x08, 1, 0, 0, 0, 0x12, 0x34]), // SOS
      ]);
      const c = inspect(buf).chunks.find((x) => x.type === 'APP11')!;
      expect(peek(buf, c)).toMatch(new RegExp(`^${MARK}`));
    });

    it('WebP', () => {
      const payload = Buffer.from(`${MARK}!`);            // 짝수 길이(패딩 회피)
      const size = Buffer.alloc(4);
      size.writeUInt32LE(payload.length);
      const buf = Buffer.concat([
        Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'),
        Buffer.from('XMP '), size, payload,
      ]);
      const c = inspect(buf).chunks.find((x) => x.type === 'XMP ')!;
      expect(peek(buf, c)).toMatch(new RegExp(`^${MARK}`));
    });
  });
});

describe('G-RENDER 렌더 청크 목록 — 정상 파일을 막지 않는가', () => {
  // ⚠ 첫 판본은 이 목록이 부실해 **정상 JPEG 이 100% FAIL** 했다(검수관 B-1 실측).
  //   DQT·DHT·SOF0 은 문자 그대로 이미지 데이터인데 "이미지가 아닌 것" 으로 분류됐다.
  it.each(['DQT', 'DHT', 'SOF0', 'SOF2', 'SOS', 'APP0', 'APP14'])(
    'JPEG 의 %s 는 렌더 데이터다',
    (t) => expect(RENDER.jpeg.has(t)).toBe(true),
  );

  // ⚠ **첫 판본은 `RST0` 도 여기 있었고 그것이 결함이었다**(검수관 P-a 실측).
  //   파서가 첫 SOS 에서 멈추므로 `RST0`·`SOI`·`EOI`·`DNL` 은 **절대 열거되지 않고**,
  //   `SOF4`·`SOF8`·`SOF12` 는 `jpegMarkerName` 이 그 코드를 DHT·JPG·DAC 로 빼므로
  //   **이름 자체가 만들어질 수 없다.** 그런데 목록에 있으면 오분류를 통과시킨다 —
  //   `m !== 0xc4` 를 지워 DHT 를 SOF4 로 오분류시켜도 **78개가 전부 초록**이었다.
  //   유령 항목을 지우고, 그것들이 **다시 들어오지 못하게** 여기서 세운다.
  // ⚠ 이름을 **"낼 수 없는"** 에서 **"정상 파일에서는 안 내는"** 으로 좁힌다(검수관 C-7).
  //   전자는 실측으로 거짓이다 — SOS **앞에** 그 마커를 둔 조작 파일에서는 열거된다.
  //   테스트 이름은 **실패했을 때 사람이 읽는 문장**이고, 파서를 SOS 뒤까지 넓히려는
  //   사람이 읽는 자리다. 거기 틀린 전제가 있으면 그 사람이 잘못된 판단을 한다.
  it.each(['SOI', 'EOI', 'RST0', 'RST7', 'DNL'])(
    'JPEG 의 %s 는 목록에 없다 — 정상 파일에서는 안 나오고, 나와도 확인 대상이면 된다',
    (t) => expect(RENDER.jpeg.has(t)).toBe(false),
  );

  it.each(['SOF4', 'SOF8', 'SOF12'])(
    '%s 는 존재할 수 없는 이름이다 — 그 코드는 DHT·JPG·DAC 다',
    (t) => expect(RENDER.jpeg.has(t)).toBe(false),
  );

  // ⚠ **이 케이스가 잡는 것은 「목록 회귀」뿐이다 — 파서 오분류가 아니다.**
  //   첫 판본은 여기 *"이제 오분류가 실제로 잡힌다"* 라고 적었고 **실측을 앞선 단언**이었다
  //   (검수관 B-5). 파서가 DHT 를 SOF4 로 읽어도 이 케이스는 안 깨진다 — `SOF4` 라는
  //   **입력을 내가 직접 넣어 주기** 때문이다. 파서 축은 아래 `G-RENDER` 의 `JPEG_FIXTURE`
  //   세 케이스가 담당한다.
  //   같은 회차의 C-3 에서는 *"절반, 원리상 못 잰다"* 로 정확히 적었는데 여기엔 그 정직함이
  //   안 갔다. **보고는 사라지고 주석은 남는다.**
  it('RENDER.jpeg 에 SOF4 가 되돌아오면 잡힌다 (목록 회귀 축 — 파서 축이 아니다)', () => {
    expect(findExtra([{ type: 'SOF4', length: 100, at: 0 }], 'jpeg', null, [])).toHaveLength(1);
  });

  it.each(['iCCP', 'sBIT', 'sPLT', 'hIST', 'cICP', 'acTL', 'fcTL', 'fdAT'])(
    'PNG 의 %s 는 렌더 데이터다',
    (t) => expect(RENDER.png.has(t)).toBe(true),
  );

  it('WebP 의 ICCP 는 렌더 데이터다 (색 프로파일)', () => {
    expect(RENDER.webp.has('ICCP')).toBe(true);
  });

  // 반대 방향 — 이것들이 렌더에 들어가면 게이트가 통과 도장이 된다.
  it.each(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'caBX'])(
    'PNG 의 %s 는 렌더가 아니다 — 잡혀야 한다',
    (t) => expect(RENDER.png.has(t)).toBe(false),
  );

  it.each(['APP1', 'APP2', 'APP11', 'COM'])(
    'JPEG 의 %s 는 렌더가 아니다 — 메타데이터 자리다',
    (t) => expect(RENDER.jpeg.has(t)).toBe(false),
  );


  it('JPEG 마커에 이름이 붙는다 — 숫자로 남으면 정체불명으로 분류된다', () => {
    expect(jpegSegments(JPEG_FIXTURE).map((s) => s.type)).toEqual(['DQT', 'APP2', 'SOF0', 'DHT', 'SOS']);
  });

  // M-A 를 잡는 축. DHT 가 SOF4 로 읽히면 위 `toEqual` 이 깨진다.
  it('0xc4 는 DHT 다 — SOF4 로 읽히면 안 된다', () => {
    expect(jpegSegments(JPEG_FIXTURE).map((s) => s.type)).not.toContain('SOF4');
  });

  // M-B 를 잡는 축. APP2 가 APP0 으로 읽히면 **C2PA 가 렌더로 통과한다.**
  it('APP2 가 APP0 으로 읽히지 않는다 — 그러면 C2PA 컨테이너가 통과한다', () => {
    const types = jpegSegments(JPEG_FIXTURE).map((s) => s.type);
    expect(types).toContain('APP2');
    expect(findExtra(jpegSegments(JPEG_FIXTURE), 'jpeg', null, []).map((c) => c.type)).toEqual(['APP2']);
  });
});

describe('G-WF 워크플로가 스크립트와 어긋나지 않는가', () => {
  // 워크플로의 기본 경로가 스크립트의 검증을 통과하지 못하면, 감독이 기본값 그대로
  // 눌렀을 때 요금만 나가고 죽는다. 값을 여기 다시 적지 않고 **워크플로에서 읽는다.**
  it('workflow 의 기본 out 이 resolveOutPath 를 통과한다', async () => {
    const { readFileSync } = await import('node:fs');
    const yml = readFileSync(path.resolve(__dirname, '../.github/workflows/generate-image.yml'), 'utf8');
    // ⚠ **`out:` 블록으로 앵커를 좁힌다**(검수관 P-5). 첫 판본은 파일의 **첫 매치**를
    //   썼는데, `prompt` 의 default 가 `out` 보다 **앞에** 온다. 지금은 프롬프트에
    //   그 확장자로 끝나는 조각이 없어 **우연히** 통과할 뿐이고, 프롬프트에 `hero.png`
    //   같은 단어가 들어가는 순간 엉뚱한 값을 검사하게 된다.
    const m = yml.match(/\n      out:[\s\S]{0,400}?default:\s*'([^']+)'/);
    expect(m, '워크플로에서 기본 out 을 못 찾았다 — 형식이 바뀌었는지 보라').not.toBeNull();
    expect(() => resolveOutPath(m![1], '/repo')).not.toThrow();
  });
});

// ⚠⚠ **이 절은 백로그 `G-META3` 이다 — 검수관 5차 권고 P-j 가 지정한 처리 시점(첫 dispatch
//   회차)에 도달해서 만들었다.** `png-chunks.mjs` 헤더의 한계 목록과 `generate-image.yml` 이
//   PR 본문에 찍는 「못 본 것」 표가 **같은 내용을 각각 손으로** 적고 있었고, 검수관이
//   **같은 자리에서 두 번** 어긋난 것을 잡았다(4차 "4/3", 5차 "4/5"). 세 번째로는 이번
//   회차에 어긋났다 — 팀장 조건 3 으로 헤더를 정정하면서 표의 「청크 내용」 행을 안 고쳐
//   **거짓 진술이 담긴 PR 본문**이 될 뻔했다. 위험이 세 번 현실화된 뒤에야 검사가 생긴다.
//
//   **자유 산문 정규식을 쓰지 않는다**(검수관 명세). 헤더 불릿의 `[표: …]` 마커라는
//   **구조**를 읽는다 — hookify 회차에서 산문 정규식의 검출력이 조용히 0이 된 그 형태를
//   피한다.
//
//   ⚠ **이 게이트가 못 잡는 것**(검수관이 명세에 미리 적어 둔 둘 + 내가 하나 더 닫았다):
//     ① **표 행의 내용이 맞는가** — 대응 **존재**만 본다. 「청크 내용」 행의 설명이 다시
//        거짓이 돼도 키가 살아 있으면 통과한다.
//     ② **양쪽에 다 없는 한계** — 헤더에 안 적으면 통과한다. 즉 *"한계를 빠뜨리지 않았다"*
//        가 아니라 *"두 곳이 어긋나지 않았다"* 만 보증한다.
//     ③ (닫음) **마커를 안 단 새 불릿** — 이건 ②로 새어 나갈 수 있었다. 불릿 총수와 마커
//        총수를 대조해 막는다. 마커 없는 불릿을 추가하면 빨간불이다.
//
//   **뮤테이션 실측 2026-08-13 — 6종 전부 빨간불** (`npx vitest run tests/generate-image.test.ts`):
//     N1 헤더 마커 하나 제거          → 2 failed
//     N2 표 행 하나 제거              → 1 failed
//     N3 표 헤더 문구 변경(못 찾게)   → 2 failed   ← 빈 집합끼리 비교로 새지 않는다
//     N4 마커 키 오타                 → 1 failed
//     N5 제외 마커 `-` 를 실제 키로   → 2 failed
//     N6 마커 없는 새 불릿 추가       → 1 failed   ← 위 ③ 이 참임을 재는 유일한 케이스
//   N6 이 없으면 ③ 은 **주장일 뿐**이다. 이 저장소가 반복해서 넘어진 형태가 그것이다 —
//   *"이제 잡힌다"* 를 실측 없이 적고, 보고는 사라지고 주석만 남는다.
describe('G-MIRROR 한계 목록이 두 곳에서 어긋나지 않는가 (G-META3)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '../scripts/png-chunks.mjs'), 'utf8');
  const YML = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/generate-image.yml'), 'utf8');

  /** 헤더 한계 절의 불릿 접두. 마커는 `[표: 키]`, 표 대상이 아니면 키가 `-`. */
  const BULLET = /^\/\/ {2}· /gm;
  const MARKED = /^\/\/ {2}· \[표: (.+?)\]/gm;

  const markers = [...SRC.matchAll(MARKED)].map((m) => m[1]);
  const headerKeys = markers.filter((k) => k !== '-');

  /**
   * PR 본문의 「못 본 것」 표에서 첫 열을 뽑는다.
   * ⚠ **블록으로 좁힌다** — 이 워크플로에는 표가 둘이고(위쪽은 요청/값 표), 파일 전체를
   *   훑으면 `| **요청** 경로 |` 같은 다른 표 행이 섞인다(`G-WF` 의 P-5 와 같은 형태).
   *   행이 아닌 줄을 만나면 **멈춘다** — 뒤에 오는 표까지 먹지 않기 위해서다.
   */
  const tableKeys = (() => {
    const at = YML.indexOf('| 못 본 것 | 왜 |');
    if (at < 0) return null;
    const out: string[] = [];
    for (const line of YML.slice(at).split('\n').slice(2)) {
      const m = line.match(/echo "\| \*\*(.+?)\*\* \|/);
      if (!m) break;
      out.push(m[1]);
    }
    return out;
  })();

  it('헤더의 모든 불릿에 마커가 붙어 있다 — 마커 없는 불릿은 대조를 빠져나간다', () => {
    expect(markers).toHaveLength([...SRC.matchAll(BULLET)].length);
  });

  it('「못 본 것」 표를 워크플로에서 찾을 수 있다', () => {
    // 표를 못 찾으면 아래 대조가 **빈 집합끼리 비교해 통과**한다 — 검출력이 조용히 0이
    // 되는 그 형태다. 그래서 못 찾은 것 자체를 실패로 만든다.
    expect(tableKeys, '워크플로에서 「못 본 것」 표를 못 찾았다 — 형식이 바뀌었는지 보라').not.toBeNull();
    expect(tableKeys!.length).toBeGreaterThan(0);
  });

  it('헤더 마커와 표의 키가 정확히 일치한다', () => {
    expect([...tableKeys!].sort()).toEqual([...headerKeys].sort());
  });

  it('표 대상이 아닌 항목이 표에 없다 — `-` 마커가 실제로 제외로 동작한다', () => {
    expect(markers).toContain('-');          // 제외 케이스가 있어야 이 축이 의미를 갖는다
    expect(headerKeys.length).toBeLessThan(markers.length);
  });
});

// ⚠⚠ **이 절은 실제 사고에서 나왔다**(2026-08-13, run #2 수정 회차).
//   내가 `resolveOutPath` 에 제어문자 거부를 넣으면서 **정규식 안에 리터럴 제어문자를
//   그대로 써 넣었다**(`0x00`·`0x1f`·`0x7f` 3바이트). 그러면:
//     · `grep` 이 그 파일을 **binary file** 로 취급해 검색이 안 된다
//     · diff·리뷰 화면에서 안 보인다
//     · **게이트 6종이 전부 통과했다** — eslint 는 제어문자 정규식을 안 잡고(실측 exit 0),
//       typecheck 는 `checkJs:false` 라 `.mjs` 를 안 보고, 동작은 같아서 테스트도 통과했다
//   즉 **아무도 못 보는 오염**이 커밋 직전까지 갔다. 그 뒤 뮤테이션을 돌리려 했더니
//   `grep: binary file matches` 가 떠서 발견했다 — 우연히 잡은 것이다.
//   ⚠ 이 검사가 **못 잡는 것**: 여기 적은 경로 밖(범위를 좁게 잡았다) · 탭·개행은 정상이라
//   통과 · 제어문자가 **문자열 리터럴** 안에 의도적으로 필요한 경우(그런 코드가 생기면
//   이 검사를 고쳐야 한다 — 지금은 0건이다).
// ⚠⚠ **이 절은 검수관이 낸 처방이 블로커를 만든 데서 나왔다**(2026-08-13, B3).
//   `GITHUB_OUTPUT` 표현식 미러링 3곳을 없애려고 `GITHUB_ENV` 로 옮겼는데, 그때 쓴 이름이
//   워크플로 job 레벨 `env: OUT` 과 **같았다.** 그러면 둘이 충돌하고 **어느 쪽이 이기는지에
//   의존**하게 되는데, 그 우선순위를 이 저장소는 확인한 적이 없다(실행 0 · actionlint 0 ·
//   **`GITHUB_ENV` 선례 0건**). 워크플로 `env:` 가 이긴다면 **확장자가 바뀐 회차에만**
//   뒷 스텝이 원본 경로를 보고 ENOENT 로 죽는다 — 이번 수정이 대비한 그 케이스에서만.
//   → 처방은 우선순위 판정이 아니라 **충돌 금지**다. 이름을 가르면 어느 쪽이 참이든
//   정답이 나온다(fail-closed). 그 규칙을 여기서 지킨다.
//   ⚠ **못 잡는 것**: 우선순위 자체는 여전히 못 잰다. 이 검사는 *"충돌을 만들지 않는다"*
//   만 보증한다 — 그래서 충돌을 금지하는 것이 처방이다.
describe('G-WF2 워크플로 env 키와 GITHUB_ENV 가 충돌하지 않는가', () => {
  const YML = fs.readFileSync(
    path.resolve(__dirname, '../.github/workflows/generate-image.yml'), 'utf8',
  );
  const SCRIPT = fs.readFileSync(path.resolve(__dirname, '../scripts/generate-image.mjs'), 'utf8');

  // 스크립트가 `GITHUB_ENV` 에 append 하는 변수명을 뽑는다.
  const written = [...SCRIPT.matchAll(/GITHUB_ENV,\s*`(\w+)=/g)].map((m) => m[1]);

  it('스크립트가 GITHUB_ENV 에 쓰는 이름을 찾을 수 있다', () => {
    // ⚠ 못 찾으면 아래 교집합이 **공집합이 되어 통과**한다 — 거짓 PASS 방향이다.
    //   그래서 "찾았는가" 를 먼저 단언한다(검수관 명세의 거짓 FAIL 항).
    expect(written.length, 'GITHUB_ENV append 형태가 바뀌었다 — 정규식을 고쳐라').toBeGreaterThan(0);
  });

  it('그 이름이 워크플로의 어떤 env: 키와도 겹치지 않는다', () => {
    // 워크플로의 `env:` 블록 아래 키들. 값은 안 본다 — 이름만 필요하다.
    const envKeys = new Set<string>();
    const lines = YML.split(String.fromCharCode(10));
    for (let i = 0; i < lines.length; i++) {
      if (!/^\s*env:\s*$/.test(lines[i])) continue;
      const indent = lines[i].search(/\S/);
      for (let j = i + 1; j < lines.length; j++) {
        const l = lines[j];
        if (!l.trim() || l.trim().startsWith('#')) continue;
        if (l.search(/\S/) <= indent) break;
        const m = l.match(/^\s*([A-Za-z_]\w*):/);
        if (m) envKeys.add(m[1]);
      }
    }
    expect(envKeys.size, 'env: 블록을 하나도 못 찾았다 — 파싱이 깨졌다').toBeGreaterThan(0);
    const clash = written.filter((w) => envKeys.has(w));
    expect(clash, `GITHUB_ENV 이름이 워크플로 env: 키와 충돌한다 — 우선순위에 의존하게 된다`).toEqual([]);
  });
});

// ⚠⚠ **셸 인젝션이 실제로 성립했던 자리다**(2026-08-13, 검수관 B4).
//   PR 본문 표를 고치며 `${{ inputs.out }}` 를 `run:` 셸 본문에 직접 보간했다.
//   `frontend/img/a";whoami;#.png` 는 `resolveOutPath` 를 **통과한다**(제어문자 없음 ·
//   루트 하위 · `path.extname` 이 `.png` 를 낸다). 그 값으로 `echo` 를 돌리니
//   **`whoami` 가 실행됐다.** 그 스텝 env 에는 `GH_TOKEN`(contents·PR write)이 있다.
//   저장소 전체에서 `run:` 안에 표현식을 보간한 자리는 **그 한 곳뿐**이었다 —
//   확립된 규율에서 벗어난 유일한 자리를 그 수정이 만들었다.
//   → 규율을 검사로 만든다. **기준선이 0이라 지금이 붙이기 가장 싼 시점이다.**
//   ⚠ **못 잡는 것**: `env:` 로 넘긴 뒤 셸에서 **인용 없이** 쓰는 것(`$VAR` vs `"$VAR"`) ·
//   `eval` · 액션 `with:` 입력을 통한 경로. 이 검사는 *"본문에 보간하지 않는다"* 만 본다.
describe('G-WF3 run: 안에 표현식을 보간하지 않는가', () => {
  const DIR = path.resolve(__dirname, '../.github/workflows');
  const FILES = fs.readdirSync(DIR).filter((f) => f.endsWith('.yml'));

  /** 한 워크플로에서 셸로 실행되는 줄들을 모은다. 반환 `[줄번호, 내용]`. */
  function shellLines(yml: string): Array<[number, string]> {
    const lines = yml.split(String.fromCharCode(10));
    const out: Array<[number, string]> = [];
    let i = 0;
    while (i < lines.length) {
      // ⚠⚠ **두 형태를 다 본다**(검수관 C5). 첫 판본은 블록 스칼라 `run: |` 만 잡았고,
      //   저장소의 `run:` 31개 중 일부만 검사했다(정확한 분포: 블록 4 · 단일 20 ·
      //   `- run:` 7 — 검수관 첫 보고의 「31개 중 4개」는 `run: |-` 를 단일로 센 값이었다). 단일 라인 `run: node …` 은
      //   블록과 **똑같이 셸로 실행되는데** 시야 밖이었다 — 실증으로 인젝션을 주입해도
      //   통과했다. 게다가 `ci.yml`·`deploy.yml`·`review-record.yml` 은 블록 스칼라가
      //   **0개**라 그 세 파일은 **아무것도 검사하지 않은 채 초록**이었다.
      // ⚠ **블록을 먼저 본다.** `run: |` 은 단일 라인 패턴(`\S.*`)에도 걸리므로 순서가
      //   반대면 블록 본문이 통째로 안 읽힌다 — 첫 판본이 그랬고, 총합 단언이 잡았다.
      // ⚠⚠ **`- run:` 도 잡는다**(검수관 C6). 첫 판본은 두 정규식 모두 `\s*` 뒤에 바로
      //   `run:` 을 요구해 YAML 시퀀스 항목 형태를 **못 봤다** — 놓친 것 7개이고 그중
      //   `deploy.yml` 의 `- run: |` **블록 두 개는 본문 전체가 시야 밖**이었다.
      //   실증: 그 블록에 `${{ github.event.head_commit.message }}` 를 주입해도 통과했다.
      //   `deploy.yml` 은 **배포 매니페스트**이고 그 값은 이 검사가 막겠다고 선언한
      //   바로 그 벡터다. `P6`(파일마다 하나라도 찾았는가) 도 이것을 못 막았다 —
      //   `deploy.yml` 에서 3줄은 찾으므로 통과한다(**부분적으로 찾으면 통과**하는 형태).
      const block = lines[i].match(/^(\s*)(- )?run:\s*[|>]-?\s*$/);
      if (!block) {
        const single = lines[i].match(/^\s*(?:- )?run:\s+(\S.*)$/);
        if (single) out.push([i + 1, single[1]]);
        i += 1;
        continue;
      }
      // ⚠ `- run: |` 에서 `run` 키의 실제 컬럼은 `- ` 만큼 오른쪽이다. 안 더하면 본문
      //   경계 판정이 어긋난다 — 이 회차가 이미 한 번 겪은 경계 버그의 재발 자리다.
      const indent = block[1].length + (block[2] ? block[2].length : 0);
      let j = i + 1;
      for (; j < lines.length; j++) {
        const l = lines[j];
        if (l.trim() && l.search(/\S/) <= indent) break;
        if (l.trim()) out.push([j + 1, l.trim()]);
      }
      i = j;
    }
    return out;
  }

  it.each(FILES)('%s 의 run: 안에 ${{ }} 가 없다', (file) => {
    const found = shellLines(fs.readFileSync(path.join(DIR, file), 'utf8'));
    // ⚠ **파일마다** 하나라도 찾았는지 먼저 본다(검수관 P6). 합산으로만 보면
    //   `ci.yml` 처럼 한 형태만 쓰는 파일이 **0건을 검사하며 초록**인 것을 못 잡는다.
    expect(found.length, `${file} 에서 run: 을 하나도 못 찾았다 — 파싱이 깨졌다`).toBeGreaterThan(0);
    const hits = found
      // 이 저장소는 `${{ }}` 를 **문서화 목적으로 주석에 적는다**(거짓 FAIL 위험 ②).
      .filter(([, l]) => !l.startsWith('#') && l.includes('${{'))
      .map(([n, l]) => `${file}:${n}: ${l.slice(0, 60)}`);
    expect(hits, '외부 입력은 예외 없이 env: 로 넘긴다 — 본문 보간은 셸 인젝션이다').toEqual([]);
  });

  // ⚠ `toBeGreaterThan(3)` 은 **실측 4에 맞춘 값**이었다(검수관 P5) — 블록 하나만 줄어도
  //   거짓 FAIL 이고, `CLAUDE.md` 가 *"「실측에 여유를 얹은 값」은 근거가 아니다"* 로 못 박은
  //   형태다. 두 형태를 다 세면 분모가 31로 커져 그 취약함이 사라진다.
  // ⚠ **임계값을 실측에 맞추지 않는다**(검수관 P5). 첫 판본은 `toBeGreaterThan(3)` 이었고
  //   실측 4에 아슬아슬하게 맞춘 값이라 블록 하나만 줄어도 거짓 FAIL 이었다 —
  //   `CLAUDE.md` 가 *"「실측에 여유를 얹은 값」은 근거가 아니다"* 로 못 박은 형태다.
  //   대신 **두 방식을 계산해 관계를 단언한다**: 두 형태를 다 세면 블록만 셀 때보다 많다.
  //   숫자가 바뀌어도 저절로 따라오고, 전제(파일 구성)가 바뀌어도 다시 실측할 필요가 없다.
  it('블록 스칼라만 세는 것보다 많이 잡는다 — 사각이 닫혔다', () => {
    const blockOnly = FILES.reduce((n, f) => {
      const lines = fs.readFileSync(path.join(DIR, f), 'utf8').split(String.fromCharCode(10));
      return n + lines.filter((l) => /^\s*(?:- )?run:\s*[|>]-?\s*$/.test(l)).length;
    }, 0);
    const both = FILES.reduce((n, f) => n + shellLines(fs.readFileSync(path.join(DIR, f), 'utf8')).length, 0);
    expect(blockOnly, '블록 스칼라를 하나도 못 찾았다 — 대조 자체가 성립 안 한다').toBeGreaterThan(0);
    expect(both).toBeGreaterThan(blockOnly);
  });
});

describe('G-CTRL 소스에 리터럴 제어문자가 없는가 (실제 오염 사고)', () => {
  const ROOT = path.resolve(__dirname, '..');
  const TARGETS = [
    'scripts/generate-image.mjs',
    'scripts/png-chunks.mjs',
    'tests/generate-image.test.ts',
    '.github/workflows/generate-image.yml',
  ];

  it.each(TARGETS)('%s 에 제어문자가 없다', (rel) => {
    const raw = fs.readFileSync(path.join(ROOT, rel));
    const bad: string[] = [];
    for (let i = 0; i < raw.length; i++) {
      const b = raw[i];
      // 탭(0x09)·개행(0x0a)·복귀(0x0d)만 허용한다.
      if (b < 0x09 || b === 0x0b || b === 0x0c || (b >= 0x0e && b < 0x20) || b === 0x7f) {
        bad.push(`offset ${i}: 0x${b.toString(16).padStart(2, '0')}`);
      }
    }
    expect(bad, `${rel} 에 제어문자가 있다 — grep 이 binary 로 취급하고 리뷰에서 안 보인다`).toEqual([]);
  });
});
