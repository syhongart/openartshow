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
//    `main()` 의 흐름. `pickImageModel` 은 우리가 지어낸 목록에 대한 **우선순위**만
//    검사한다 — 실제 `/models` 응답이 그 모양인지는 **키가 없어 못 쟀다**.

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  safeError,
  maskSecrets,
  resolveOutPath,
  assertImageBytes,
  pickImageModel,
  ALLOWED_EXT,
  MAX_BYTES,
} from '../scripts/generate-image.mjs';
import { inspect, pngChunks } from '../scripts/png-chunks.mjs';

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

describe('G-MODEL 모델 선택 — 재현 가능한가, 지원 여부를 보는가', () => {
  const M = (name: string, methods: string[]) => ({ name: `models/${name}`, supportedGenerationMethods: methods });

  it('predict 를 지원하는 imagen 을 최우선으로 고른다', () => {
    const r = pickImageModel([
      M('gemini-2.5-flash-image', ['generateContent']),
      M('imagen-4.0-generate-001', ['predict']),
    ]);
    expect(r.model).toBe('imagen-4.0-generate-001');
    expect(r.kind).toBe('predict');
  });

  // ⚠ 첫 판본은 `supportedGenerationMethods` 를 **안 읽으면서** 주석에 *"실제로 쓸 수
  //   있는"* 이라고 적었다(검수관 P4). 목록에 있다는 것과 부를 수 있다는 것은 다르다.
  it('predict 를 지원하지 않는 imagen 은 고르지 않는다', () => {
    const r = pickImageModel([
      M('imagen-3.0-fast', ['embedContent']),
      M('gemini-2.5-flash-image', ['generateContent']),
    ]);
    expect(r.model).toBe('gemini-2.5-flash-image');
    expect(r.kind).toBe('generateContent');
  });

  // 같은 키로 두 번 돌렸을 때 다른 모델이 뽑히면 안 된다.
  it('응답 배열 순서가 바뀌어도 같은 모델이 나온다', () => {
    const a = [M('imagen-3.0-generate-002', ['predict']), M('imagen-4.0-generate-001', ['predict'])];
    expect(pickImageModel(a).model).toBe(pickImageModel([...a].reverse()).model);
  });

  it('버전이 높은 쪽을 고른다 — 숫자로 비교한다', () => {
    const r = pickImageModel([
      M('imagen-4.0-generate-001', ['predict']),
      M('imagen-10.0-generate-001', ['predict']),
    ]);
    expect(r.model).toBe('imagen-10.0-generate-001');
  });

  it('메서드 목록이 아예 없는 응답이면 이름으로 폴백하고 그 사실을 알린다', () => {
    const r = pickImageModel([{ name: 'models/imagen-4.0-generate-001' }]);
    expect(r.model).toBe('imagen-4.0-generate-001');
    expect(r.hasMethods).toBe(false);
  });

  it('이미지 모델이 없으면 null 이다 — 아무거나 고르지 않는다', () => {
    expect(pickImageModel([M('gemini-2.5-pro', ['generateContent'])]).model).toBeNull();
  });

  it('빈 응답에도 안 죽는다', () => {
    expect(pickImageModel(undefined).model).toBeNull();
    expect(pickImageModel([]).model).toBeNull();
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

describe('G-WF 워크플로가 스크립트와 어긋나지 않는가', () => {
  // 워크플로의 기본 경로가 스크립트의 검증을 통과하지 못하면, 감독이 기본값 그대로
  // 눌렀을 때 요금만 나가고 죽는다. 값을 여기 다시 적지 않고 **워크플로에서 읽는다.**
  it('workflow 의 기본 out 이 resolveOutPath 를 통과한다', async () => {
    const { readFileSync } = await import('node:fs');
    const yml = readFileSync(path.resolve(__dirname, '../.github/workflows/generate-image.yml'), 'utf8');
    const m = yml.match(/default:\s*'([^']+\.(?:png|jpg|jpeg|webp))'/);
    expect(m, '워크플로에서 기본 out 을 못 찾았다 — 형식이 바뀌었는지 보라').not.toBeNull();
    expect(() => resolveOutPath(m![1], '/repo')).not.toThrow();
  });
});
