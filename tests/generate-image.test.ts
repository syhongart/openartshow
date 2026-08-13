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
  pickImageModels,
  generateWithFallback,
  call,
  ALLOWED_EXT,
  MAX_BYTES,
} from '../scripts/generate-image.mjs';
import { inspect, pngChunks, jpegSegments, findExtra, ACCEPTED, RENDER } from '../scripts/png-chunks.mjs';

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
});

// ⚠ **이 절은 뮤테이션 N10 이 만든 것이다**(2026-08-13). `main()` 안에서
//   `&& !ACCEPTED.has(c.type)` 를 지워도 **아무 테스트도 안 깨졌다** — `ACCEPTED` 가 빈
//   집합이라 조건이 항상 참이어서다. 팀장 조건의 핵심 장치(*"사람이 실물을 보고 통과"*)에
//   **검사가 0** 이었고, 목록에 항목을 넣는 날 그것이 동작하는지 아무도 몰랐을 것이다.
//   "통과는 검출력의 증거가 아니다" 가 정확히 이 형태다 — 72개가 전부 초록이었다.
describe('G-ACCEPT 사람이 통과시킨 청크만 통과하는가 (N10 이 뚫은 자리)', () => {
  const chunks = [
    { type: 'IHDR', length: 13 },
    { type: 'caBX', length: 999 },
    { type: 'tEXt', length: 20 },
  ];

  it('빈 목록이면 렌더가 아닌 것이 전부 잡힌다', () => {
    expect(findExtra(chunks, 'png', new Set()).map((c) => c.type)).toEqual(['caBX', 'tEXt']);
  });

  // ⚠ 이것이 N10 이 못 보던 축이다 — **목록이 비어 있지 않을 때** 실제로 걸러지는가.
  it('통과시킨 것만 빠지고 나머지는 남는다', () => {
    expect(findExtra(chunks, 'png', new Set(['caBX'])).map((c) => c.type)).toEqual(['tEXt']);
  });

  it('둘 다 통과시키면 0개가 된다', () => {
    expect(findExtra(chunks, 'png', new Set(['caBX', 'tEXt']))).toHaveLength(0);
  });

  it('렌더 청크는 통과 목록과 무관하게 애초에 안 잡힌다', () => {
    expect(findExtra(chunks, 'png', new Set()).some((c) => c.type === 'IHDR')).toBe(false);
  });

  // 목록이 늘어나는 것 자체가 위험 신호다 — 근거 없이 늘면 통과 도장이 된다.
  it('기본 ACCEPTED 는 비어 있다 — 아직 실물을 본 적이 없다', () => {
    expect(ACCEPTED.size).toBe(0);
  });

  it('알 수 없는 형식이면 전부 확인 대상이다 — 조용히 0개로 만들지 않는다', () => {
    expect(findExtra(chunks, 'gif' as 'png', new Set())).toHaveLength(3);
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
    expect(findExtra([{ type: 'SOF4', length: 100 }], 'jpeg', new Set())).toHaveLength(1);
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
    expect(findExtra(jpegSegments(JPEG_FIXTURE), 'jpeg', new Set()).map((c) => c.type)).toEqual(['APP2']);
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
