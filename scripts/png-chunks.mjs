#!/usr/bin/env node
// scripts/png-chunks.mjs — 생성된 이미지에 **무엇이 딸려 왔는지** 열거한다.
//
// ── 왜 필요한가 ───────────────────────────────────────────────────────────
// Gemini/Imagen 출력에는 **C2PA 매니페스트 + SynthID 워터마크**가 실린다(보안담당
// 2026-08-13 웹 확인). 우리는 base64 를 그대로 파일로 굽기 때문에 구글이 넣은 것이
// **그대로 공개 저장소에 영구 커밋**된다 — 공개 저장소는 한 번 병합되면 되돌려도
// blob 이 남는다.
//
// ── 이 스크립트가 하지 **않는** 것 ────────────────────────────────────────
// **스트립하지 않는다.** 팀장 판정 2026-08-13(분기 A) = **보존**.
//
// 판정 근거가 "위생" 이 아니라 **비가역성** 이라는 점을 값 옆에 적어 둔다 — 법무는
// *"가시적 크레딧 문구가 있으면 양쪽이 법적으로 동일하니 저장소 위생 판단"* 으로 성격을
// 낮췄는데, 팀장이 그 프레임을 **절반만 맞다**고 정정했다:
//
//   보존 → 스트립은 언제든 가능(신규분부터). **스트립 → 보존은 불가능하다** — 원본이
//   없고 다시 생성하면 다른 그림이 나온다. 되돌릴 수 없는 쪽을 기본값으로 삼지 않는다.
//
// 부수 근거: 스트립해도 **SynthID 는 픽셀에 남는다.** "표시를 제거한다" 는 프레임 자체가
// 절반만 참이고, 그래서 스트립은 비용만 있고 이득이 없는 선택지다.
//
// ── 팀장 조건 — 첫 실물을 사람이 보기 전에는 영구화하지 않는다 ────────────
// *"워크플로가 로그를 「찍기만」 하고 자동 커밋한다면 확인 없는 영구 blob 이다."*
// 그래서 `--fail-on-extra` 를 만들었다. 비-필수 청크가 하나라도 있으면 **커밋 전에**
// job 을 세운다 — 그때 사람이 로그를 읽고, 유형이 예상대로(C2PA·XMP 등)면 아래
// `ACCEPTED` 에 근거와 함께 올려 통과시킨다. 예상 밖이면 팀장 재상신이다.
// ⚠ 이 자리는 오래 *"목록을 비워 둔 채 시작하는 것이 요점이다 — 아직 못 봤다"* 였다.
//   **그 시기는 지났다**(검수관 B-3): run #4 에서 APP11 을 보고 규칙 하나가 올라갔다.
//   지금 요점은 목록이 비어 있는 것이 아니라 **올릴 때 규격 위치까지 요구하는 것**이다.
//
// ── 한계 (통과로 적지 않기 위해 적는다) ──────────────────────────────────
//  · [표: 청크 내용] **청크 이름 · 바이트 수 · 페이로드 선두**까지만 본다 — 판별은 `MATCH_WINDOW`
//    (45B), 로그는 64B. C2PA 매니페스트가 무엇을 주장하는지, SynthID 가 픽셀에 어떻게
//    박혔는지는 **이 축으로 안 보인다.**
//    ⚠ 이 줄은 오래 *"이름과 바이트 수만 본다 → 그래서 `ACCEPTED` 로 통과시킨 **타입**은
//    회차마다 내용이 달라도 통과한다"* 라고 적혀 있었고, 팀장 조건 3(내용 판별)을 넣으면서
//    **거짓이 됐다.** 지금 남는 한계는 더 좁고 여전히 실재한다: 규칙이 보는 것은 **선두
//    45B 의 구조 헤더**뿐이라, 그 뒤 수 KB 의 **매니페스트 본문은 무엇이 바뀌어도 통과한다.**
//    실물 확인은 이 스크립트가 아니라 **워크플로의 artifact** 가 담당한다(검수관 B-3).
//  · [표: 손상·절단된 파일] **잘리거나 손상된 파일을 못 잡는다.** `IEND` 없이 끝나도 extra 가 0이면 통과다.
//    길이 필드가 거짓이면 열거가 어긋나 **뒤쪽 청크가 통째로 안 보인다** — 그때도
//    "0개" 로 보인다. 구조 검증은 이 축의 일이 아니다(검수관 P-6).
//  · [표: 트레일러에 붙은 것] ⚠ **트레일러를 아예 안 본다 — 파일이 정상이어도 그렇다**(검수관 C-4 실측).
//    `pngChunks` 는 `IEND` 에서, `jpegSegments` 는 **첫 SOS** 에서 멈춘다. 그 뒤에 붙은
//    것은 구조적으로 시야 밖이다: PNG `IEND` 뒤에 `caBX` 를, JPEG 첫 SOS 뒤에 `APP11`
//    (JUMBF)을 넣어 실측했더니 **둘 다 exit 0 · "확인되지 않은 청크 0개"** 였다.
//    위 「길이 필드가 거짓이면」과 **다른 사건**이다 — 저건 손상된 파일, 이건 무결한 파일.
//  · [표: SynthID 워터마크] **픽셀에 박힌 워터마크는 원리상 못 잡는다.** SynthID 는 메타데이터가 아니라
//    이미지 데이터 자체를 건드리므로 청크를 다 지워도 남는다.
//  · [표: -] `--fail-on-extra` 없이는 종료코드가 **항상 0** 이다 — 그때는 게이트가 아니라 관측이다.
//    ⚠ 이 줄은 첫 판본에서 *"종료코드는 항상 0"* 이라고만 적혀 있었고, 같은 회차에
//    `--fail-on-extra` 를 얹으면서 **거짓이 됐다.** 값과 문장을 같이 고친다.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const KB = (n) => `${(n / 1024).toFixed(1)}KB`;

/** PNG 청크 열거. 반환 `[{ type, length }]`. */
export function pngChunks(buf) {
  const out = [];
  let off = 8; // 시그니처
  while (off + 8 <= buf.length) {
    const length = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('latin1');
    out.push({ type, length, at: off + 8 });  // at = 데이터 시작(len 4 + type 4)
    if (type === 'IEND') break;
    off += 12 + length; // len(4) + type(4) + data + crc(4)
    // ⚠ 여기 있던 `if (length < 0 || off <= 0) break; // 무한루프 방지` 를 지웠다.
    //   **도달 불가였다**(검수관 P-3 실측: `readUInt32BE` 치역이 `[0, 2³²-1]` 이라 음수가
    //   될 수 없고 `off` 는 8부터 단조증가한다 — 무작위 20만 케이스에서 참 0회).
    //   실제 종료 보장은 위 `off + 8 <= buf.length` 다. 죽은 방어를 "무한루프 방지" 라고
    //   적어 두면 다음 사람이 그것을 믿고 진짜 방어를 건드린다.
  }
  return out;
}

/**
 * JPEG 마커 이름. 숫자 그대로 두면 이미지 데이터가 "정체불명" 으로 보인다.
 *
 * ⚠ **여기의 도달 불가 항목은 `RENDER.jpeg` 의 유령과 방향이 반대라 남겨 둔다**(검수관 P-i).
 * `RST*`·`SOI`·`EOI`·`DNL` 은 **정상 JPEG 에서는** 안 나온다 — 파서가 첫 SOS 에서 멈추고
 * 그 마커들은 그 뒤에 오기 때문이다.
 * ⚠⚠ **"안 나온다" 를 무조건으로 적지 않는다** — 첫 판본이 그랬고 검수관이 실측으로
 * 뒤집었다(5차 C-7). SOS **앞에** 그 마커를 둔 파일을 만들면 그대로 열거된다:
 *     열거 `["SOI","EOI","RST0","DNL","SOS"]` · extra `["SOI","EOI","RST0","DNL"]`
 * 조작·손상 파일에서 도달한다. 그래도 **결론은 그대로 옳다** — 이름이 붙어도 `RENDER` 에
 * 없으니 전부 `extra` 로 잡혀 fail-closed 다. **전제만 틀렸었다.**
 * 다른 것은 **지웠을 때 무슨 일이 나는가**다:
 *   · `RENDER` 의 유령을 두면 → 오분류된 이름이 **렌더로 통과**한다(거짓 PASS, 검출력 흡수).
 *   · 여기의 매핑을 지우면 → 숫자 이름(`0xd0`)이 나와 **확인 대상으로 잡힌다**(fail-closed).
 * 그래서 `pngChunks` 의 도달 불가 방어를 지운 그 기준과 겉보기에 충돌하지만 충돌이 아니다.
 * 파서를 넓혀 SOS 뒤를 읽게 되면 이 매핑들이 **실제로 쓰인다.**
 */
function jpegMarkerName(m) {
  if (m >= 0xe0 && m <= 0xef) return `APP${m - 0xe0}`;
  if (m >= 0xd0 && m <= 0xd7) return `RST${m - 0xd0}`;
  // SOFn — 프레임 헤더. 0xc4·0xc8·0xcc 는 SOF 가 아니라 아래 표에 있다.
  if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return `SOF${m - 0xc0}`;
  return {
    0xc4: 'DHT', 0xc8: 'JPG', 0xcc: 'DAC', 0xd8: 'SOI', 0xd9: 'EOI',
    0xda: 'SOS', 0xdb: 'DQT', 0xdc: 'DNL', 0xdd: 'DRI', 0xde: 'DHP',
    0xdf: 'EXP', 0xfe: 'COM',
  }[m] || `0x${m.toString(16)}`;
}

/**
 * JPEG 마커 세그먼트 열거.
 * ⚠ 첫 판본은 `APPn`·`COM` 만 이름 붙이고 나머지를 `0xdb` 처럼 숫자로 뒀는데, 그러면
 * **DQT(양자화 테이블)·DHT(허프만 테이블) 같은 순수 이미지 데이터가 「정체불명」으로
 * 분류돼 정상 JPEG 이 100% 막혔다**(검수관 B-1 실측). 이름을 다 붙인다.
 */
export function jpegSegments(buf) {
  const out = [];
  let off = 2; // SOI
  while (off + 4 <= buf.length) {
    if (buf[off] !== 0xff) break;
    const marker = buf[off + 1];
    // ⚠ `at` 은 다른 세그먼트와 **같은 규약**(마커 2 + 길이필드 2 뒤)이어야 한다. 첫 판본은
    //   `off + 2` 라 혼자 길이 필드를 가리켰다(검수관 P-6). SOS 는 렌더 청크라 지금은
    //   `peek` 을 안 타서 무해하지만, 파서를 SOS 뒤까지 넓히면 그 순간 어긋난다.
    //   `length` 가 「나머지 전부」인 것은 의도다 — 스캔 데이터는 길이 필드로 안 끝난다.
    if (marker === 0xda) { out.push({ type: 'SOS', length: buf.length - off, at: off + 4 }); break; }
    const length = buf.readUInt16BE(off + 2);
    // at = 페이로드 시작(마커 2 + 길이필드 2). 길이필드는 자기 자신을 포함한다.
    out.push({ type: jpegMarkerName(marker), length, at: off + 4 });
    off += 2 + length;
  }
  return out;
}

/** WebP(RIFF) 청크 열거. `EXIF`·`XMP ` 가 메타데이터 자리다. */
export function webpChunks(buf) {
  const out = [];
  let off = 12; // RIFF(4) + size(4) + WEBP(4)
  while (off + 8 <= buf.length) {
    const type = buf.subarray(off, off + 4).toString('latin1');
    const length = buf.readUInt32LE(off + 4);
    out.push({ type, length, at: off + 8 });
    off += 8 + length + (length % 2); // 홀수면 패딩 1
  }
  return out;
}

// 화면을 그리는 데 쓰이는 것. **여기 없는 것이 "딸려 온 것"** 이다.
//
// ⚠ **첫 판본은 이 목록이 부실해 정상 파일을 막았다**(검수관 B-1, 전부 실측):
//   · JPEG 은 `APP0`·`SOS` 둘뿐이라 **DQT(양자화 테이블)·DHT(허프만 테이블)·SOF0 이
//     extra 로 잡혀 정상 JPEG 이 100% FAIL** 했다. 문자 그대로 이미지 데이터인 것을
//     스크립트가 *"이미지 데이터가 아닌 것"* 이라고 출력했다.
//   · PNG 은 `iCCP`(ICC 색 프로파일)·`sBIT`·`sPLT`·`hIST` 가 빠져 FAIL 했다.
//   위험은 job 이 죽는 것이 아니라 **사람이 그것들을 `ACCEPTED` 에 올리게 유도되는 것**
//   이다 — 그러면 아래 `ACCEPTED` 가 첫 회차에 통과 도장이 된다.
//
// **분류 기준**: 화면을 그리거나 색을 맞추는 데 쓰이면 여기. **텍스트·시각·서명처럼
// 「이미지가 아닌 것을 실어 나르는」 청크는 일부러 뺐다** — `tEXt`·`zTXt`·`iTXt`·`eXIf`·
// `tIME` 이 그것이고, C2PA 매니페스트(`caBX`)처럼 표준에 없는 것도 자동으로 걸린다.
export const RENDER = {
  // PNG 1.2 + 3rd edition(HDR: cICP·mDCv·cLLi) + APNG(acTL·fcTL·fdAT).
  // ⚠ **Extensions 1.5 계열(`oFFs`·`sCAL`·`sTER`)은 일부러 안 넣었다** — 생성 API 가
  //   낼 이유가 없고, 빠져 있으면 fail-closed(막고 사람이 본다) 방향이라 무해하다.
  //   *의도적으로 뺐는지 몰라서 뺐는지*가 구별되게 적어 둔다(검수관 P-d).
  png: new Set([
    'IHDR', 'PLTE', 'IDAT', 'IEND',
    'tRNS', 'cHRM', 'gAMA', 'iCCP', 'sBIT', 'sRGB', 'bKGD', 'hIST', 'pHYs', 'sPLT',
    'cICP', 'mDCv', 'cLLi',
    'acTL', 'fcTL', 'fdAT',
  ]),
  // SOFn·DHT·DQT·DRI 등은 전부 압축 구조다. APP0(JFIF)·APP14(Adobe 색변환)는 렌더에
  // 필요하므로 포함하고, **나머지 APPn 은 메타데이터 자리라 뺀다**(APP1=EXIF,
  // APP2=ICC/C2PA, APP11=JUMBF/C2PA — 아래 ⚠⚠⚠ 참조).
  //
  // ⚠⚠ **`jpegSegments` 가 실제로 내놓을 수 있는 이름만 적는다.** 첫 판본은 `SOI`·`EOI`·
  //   `RST0~7`·`DNL` 과 `SOF4`·`SOF8`·`SOF12` 를 넣었는데 **전부 유령**이었다 — 파서는
  //   `off=2`(SOI 다음)부터 시작해 **첫 SOS 에서 멈추므로** 그것들을 안 내고,
  //   `jpegMarkerName` 이 `0xc4`·`0xc8`·`0xcc` 를 DHT·JPG·DAC 로 빼므로 `SOF4/8/12` 라는
  //   이름은 **생성될 수 없다.**
  //   **유령 항목은 검출력을 흡수한다**(검수관 P-a 실측): 그 상태에서 `jpegMarkerName` 의
  //   `m !== 0xc4` 를 지워 **DHT 를 SOF4 로 오분류시켜도 테스트 78개가 전부 초록이었고
  //   CLI 도 exit 0** 이었다. 반대로 `RST0` 을 지우면 테스트가 **1 failed** 로 막았다 —
  //   검사가 죽은 항목을 지키고 산 결함을 놓친 것이다. 같은 회차에 `pngChunks` 의 도달
  //   불가 방어를 지우면서(P-3) 여기에 죽은 항목을 새로 넣었다.
  //   **파서를 고치면 이 목록을 반드시 같이 본다.**
  //
  // ⚠⚠⚠ **`APP2` 를 일부러 뺐다 — PNG `iCCP`·WebP `ICCP` 와 비대칭인 것이 의도다.**
  //   그래서 **ICC 프로파일이 붙은 정상 JPEG 은 FAIL 한다**(검수관 실측). 그럼에도 안 넣는
  //   이유: `APP2`·`APP11` 은 단일 종류가 아니라 **컨테이너 마커**다(APP2 = ICC **그리고**
  //   C2PA, APP11 = JUMBF). 렌더로 넣으면 **APP2 에 실린 C2PA 매니페스트가 통째로 통과한다.**
  //   👉 **첫 dispatch 에서 `APP2` 가 뜨거든 "ICC 프로파일이네" 하고 `ACCEPTED` 에 올리지
  //   마라.** 그 순간부터 C2PA 도 함께 통과한다 — 타입 화이트리스트의 최악 사례이고,
  //   위 `:120-121` 이 적어 둔 *"사람이 올리게 유도되는 것이 위험"* 이 가장 구체적으로
  //   성립하는 자리다. ICC 만 통과시키려면 마커 이름이 아니라 **페이로드 접두**
  //   (`ICC_PROFILE\0`)로 갈라야 하고, 그것은 이 스크립트의 범위 밖이다(팀장 사안).
  jpeg: new Set([
    'SOS', 'DQT', 'DHT', 'DRI', 'DHP', 'EXP', 'DAC', 'JPG',
    // 0xc4·0xc8·0xcc 는 SOF 가 아니므로 SOF4·SOF8·SOF12 는 만들어지지 않는다.
    ...[0, 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15].map((i) => `SOF${i}`),
    'APP0',   // JFIF
    'APP14',  // Adobe 색 변환(YCbCr/YCCK/CMYK) — 없으면 CMYK 계열 색이 뒤집힌다
  ]),
  // `ICCP` 는 색 프로파일이라 렌더. `EXIF`·`XMP ` 는 메타라 뺀다.
  webp: new Set(['VP8 ', 'VP8L', 'VP8X', 'ALPH', 'ANIM', 'ANMF', 'ICCP']),
};

export function inspect(buf) {
  if (buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { kind: 'png', chunks: pngChunks(buf) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) return { kind: 'jpeg', chunks: jpegSegments(buf) };
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return { kind: 'webp', chunks: webpChunks(buf) };
  }
  return { kind: null, chunks: [] };
}

// 사람이 실물을 보고 통과시킨 청크. 채울 때는 반드시 **어느 run 에서 무엇을 보고 넣었는지**
// 를 옆에 적는다. 근거 없이 늘어나면 이 목록은 게이트가 아니라 통과 도장이 된다.
//
// ⚠ **이 줄은 오래 *"비어 있는 채로 시작한다 — 아직 아무것도 안 봤다"* 였고 2026-08-13 에
//   거짓이 됐다**(검수관 B-3). run #4(`31717695950`)에서 APP11 이 관측돼 아래 규칙이 올라갔다.
//   *"비어 있는 것이 요점"* 이라는 설계 서술은 **첫 dispatch 이전의 상태**를 말한 것이고,
//   그 시기는 지났다. 지금의 요점은 「비어 있다」가 아니라 **「올릴 때 무엇을 요구하는가」** 다.
//
// 🛑 **여기에 무언가를 올리기 전에 `RENDER.jpeg` 위의 ⚠⚠⚠ 를 읽어라.**
//    ⚠ 이 자리는 오래 *"`APP2`·`APP11` 은 **절대** 올리지 마라"* 였고, 아래 코드가 APP11 을
//    올리면서 **주석이 코드를 금지하는 상태**가 됐다(검수관 B-3). 금지를 정확히 다시 적는다:
//    **이름만으로는 절대 올리지 마라.** 컨테이너 마커라 ICC 프로파일도 C2PA 매니페스트도
//    같은 이름으로 온다. "ICC 네" 하고 이름만 올리는 순간 C2PA 가 함께 통과한다.
//    올리려면 **규격 위치를 고정한 내용 판별**이 있어야 한다 — 아래 APP11 규칙이 그 형태이고,
//    그 규칙의 첫 판본이 `includes` 두 번이었다가 **fail-open 으로 반려됐다.**
//    *"내용을 본다"* 로는 부족하고 *"어디에 있는지까지 본다"* 여야 한다.
//    (검수관 C-6: 사람의 동선은 *로그 → 아래 stderr 안내 → **이 상수*** 다. 경고가
//    `RENDER` 안에만 있으면 **목록을 고치는 사람**은 읽고 **올릴지 판단하는 사람**은 못 읽는다.
//    조건부 경고를 `main()` 로그에 넣는 방법도 있었으나 그러면 `'APP2'`·`'APP11'` 이라는
//    **두 번째 값 목록**이 생겨 미러링이 된다 — 그래서 값이 아니라 **포인터**를 둔다.)
//    실측 참고(검수관 5차 P-k): 저장소 JPEG **13개 중 12개**가 APP2 를 갖고 있다
//    (`aw-01.jpg` = APP2 472B). **후보가 APP2 만이 아니다** — 나머지 하나
//    `frontend/assets/sky/night.jpg` 는 `APP1`(EXIF)·`APP13`(Photoshop IRB)·`APP14` 이고,
//    APP1·APP13 도 `RENDER` 에 없어 **똑같이 이 판단을 요구한다.** EXIF 는 촬영 기기·위치가
//    들어가는 자리라 올릴 때 특히 조심하라. 첫 dispatch 에서 마주칠 확률이 높다.
export const ACCEPTED = [
  {
    type: 'APP11',
    // ⚠ **이름만으로 통과시키지 않는다 — 내용까지 본다**(팀장 조건 2026-08-13, 조건 3).
    //   검수관이 반복해서 경고한 자리다: `APP11` 은 **컨테이너 마커**라 C2PA 말고 다른
    //   것도 같은 이름으로 온다. 이름만 올리면 *"그 이름으로 오는 것은 앞으로 뭐든
    //   통과한다."* 그 경고를 **주석이 아니라 검사로** 해소한다.
    //   판별: JUMBF 구조가 **규격 위치에** 있고 label 이 `c2pa` 인가.
    //
    //   ⚠⚠⚠ **첫 판본은 `head.includes('jumb') && head.includes('c2pa')` 였고 그것은
    //   fail-OPEN 이었다**(검수관 B-1 반려 2026-08-13, 부팀장 재현). C2PA manifest store 의
    //   JUMBF content-type UUID 는 `63 32 70 61 00 11 …` 이고 **앞 4바이트가 ASCII `c2pa`** 다.
    //   즉 페이로드 24번지에 `c2pa` 가 **항상 있다.** 그래서 `includes('c2pa')` 는 label 을
    //   보지 않는다 — 실측(실물 UUID 를 넣은 픽스처, CLI `--fail-on-extra`):
    //
    //       label 이 `xmp ` 여도        → exit 0   ← 막아야 하는데 통과
    //       label 이 아예 없어도        → exit 0
    //       `c2pa`·`jumb` 순서가 역전돼도 → exit 0
    //
    //   **가장 값진 것은 값이 아니라 내가 틀린 방식이다.** 나는 *"실물을 못 봤지만 규격에서
    //   유도했고, 틀렸으면 fail-closed 라 사람이 알아챈다"* 고 적었다. 실측 방향은
    //   **fail-open** 이었다 — 유도할 때 UUID 의 ASCII 성질을 안 봤기 때문이다.
    //   **「틀려도 안전한 방향」이라는 판단 자체가 실측 대상이다.**
    //   테스트가 이것을 못 본 이유도 기록해 둔다: 픽스처가 UUID 자리를 `alloc(17)`(0바이트)로
    //   채워 **실물의 핵심 성질이 대역에 없었다.** 게시판이 이름 붙인 「네 번째 원인」이다.
    //
    //   그래서 **오프셋을 고정한다.** 문자열이 어디에 있든 상관없다는 판별은 판별이 아니다.
    //     idx 12..15 `jumb` — JUMBF 슈퍼박스 타입 (앞 8B = CI/En/Z, 이어 box length 4B)
    //     idx 20..23 `jumd` — description box 타입
    //     idx 41..44 `c2pa` — label (UUID 16B + toggles 1B 뒤)
    //   UUID 자리(24..27)는 **일부러 판별에 안 넣는다.** 실물을 아직 못 봤고, 규격값이
    //   버전에 따라 다를 여지를 배제 못 한다. 넣으면 더 좁아지지만 거짓 FAIL 이 늘고,
    //   거짓 FAIL 이 반복되면 사람이 *"규칙을 넓히자"* 로 유도된다 — 이 파일이 내내
    //   경계한 동선이다. 위 세 자리만으로 위 실측 3건이 전부 막힌다.
    //   **뮤테이션 실측 (2차 — 반려 해소분)**. `npx vitest run tests/generate-image.test.ts`:
    //     R1  `includes` 로 원상복구       → 7 failed   ← 반려의 본체가 되살아난다
    //     R2  label 위치 검사만 제거       → 6 failed
    //     R3  `jumb` 위치 검사만 제거      → 1 failed
    //     R15 `jumd` 위치 검사만 제거      → 1 failed
    //     R4  `MATCH_WINDOW` 45→44        → 5 failed
    //     R6  `passed` 에서 `!essential`   → 3 failed
    //     R7  `passed` 에서 `!extraSet`    → 2 failed
    //     R8  `extraSet` 을 타입 집합으로  → 1 failed
    //     R9  근거(`why`) 로그 제거        → 1 failed
    //     R10 SOS `at` 을 `off+2` 로       → 1 failed
    //     R11 워크플로 표 행 제거          → 1 failed
    //     R12 헤더 마커 제거               → 2 failed
    //     R13 `peek` 로그 폭 64→128       → 1 failed
    //     R5  판별 창을 기본값으로         → **0 failed(등가)** — `MATCH_WINDOW` 주석 참조
    //   ⚠ **R3·R15 는 처음에 0 failed 였다.** 기존 케이스들이 나머지 두 조건만으로도 전부
    //     갈려서 `jumb`/`jumd` 는 있으나 없으나 결과가 같았다 — 세 검사를 한 케이스로
    //     뭉뚱그려 재면 늘 이렇게 된다(뮤테이션 N10 이 처음 지적한 형태). **각 조건만
    //     어긋난 입력**을 따로 넣어 닫았다.
    //   ⚠ 1차 실측(M1~M8: `at` 오프셋·`main()` 배선)은 그대로 유효하다. 다만 **M6·M7 은
    //     이 개정으로 형태가 바뀌어 R3/R15·R13 이 대신한다** — 옛 이름으로 재현하려 하면
    //     치환 문자열이 없다.
    match: (head) =>
      head.slice(12, 16) === 'jumb'
      && head.slice(20, 24) === 'jumd'
      && head.slice(41, 45) === 'c2pa',
    // ⚠ `why` 첫 줄은 **CLI 로그에 그대로 찍힌다**(검수관 P-2). 사람이 통과 판정을 읽는
    //   자리이므로 규칙의 실제 동작과 어긋나면 안 된다 — 첫 판본은 *"선두에 jumb+c2pa 가
    //   없으면"* 이라고 적어 **위치를 안 보는 것처럼** 말했고, 그것이 곧 반려된 그 구현이다.
    why: '규격 위치 고정 — idx12 `jumb` · idx20 `jumd` · idx41 label `c2pa`. run #4\n'
      + '         (31717695950) 에서 APP11 5.9KB 로 처음 관측됐고 팀장 판정 A(보존)의\n'
      + '         대상이다. 실제 선두 문자열은 그 run 로그에 남는다.\n'
      + '         ⚠ **fail-closed** — 셋 중 하나라도 위치가 어긋나면 통과하지 않고 팀장\n'
      + '         재상신으로 간다(팀장 조건 2). 이름만 맞는 APP11 은 통과 못 한다.',
  },
];

/**
 * 확인되지 않은 청크를 고른다. **판정 로직을 여기로 뺀 이유가 검출력이다.**
 *
 * ⚠ 뮤테이션 N10 실측(2026-08-13): `main()` 안에서 `&& !ACCEPTED.has(c.type)` 를 **지워도
 * 테스트가 안 깨졌다.** `ACCEPTED` 가 빈 집합이라 그 조건이 항상 참이어서, 있으나 없으나
 * 결과가 같았기 때문이다. 즉 **팀장 조건의 핵심 장치(사람이 실물을 보고 통과시킨다)에
 * 검사가 0이었다** — 목록에 항목을 넣는 날 그것이 동작하는지 아무도 모르는 상태였다.
 *
 * 순수 함수로 빼고 `accepted` 를 주입 가능하게 하면, **비어 있지 않은 목록**에 대해서도
 * 검사할 수 있다. 환경변수로 목록을 넓히는 방법도 있었지만 그건 게이트를 우회하는
 * 구멍이 된다 — 검사를 위해 보호를 뚫지 않는다.
 *
 * ⚠ **이 자리는 오래 "절반만 닫혔다" 였고 2026-08-13 에 닫혔다**(검수관 C-3 → 실측 해소).
 * 그때 적혀 있던 것은 *"`main()` 이 기본 인자를 넘기는가는 여전히 검사가 0이고, 그 축이
 * 처음 동작하는 날은 목록에 항목을 올리는 날"* 이었다. **그 날이 왔다** — `ACCEPTED` 에
 * APP11 규칙이 생겼고, 그러자 원리상 못 재던 것이 재진다. 뮤테이션 둘로 실측했다:
 *   · `main()` 이 `buf` 를 안 넘김        → 2 failed (fail-closed 로 뒤집혀 진짜도 막힌다)
 *   · `main()` 이 `accepted` 를 `[]` 로   → 2 failed
 * 검수관의 진단은 맞았고 **처방도 맞았다** — 목록이 비어 있는 동안 못 재는 것은 이 설계의
 * 성질이었지, 고쳐야 할 결함이 아니었다. 다시 비면 다시 못 잰다: **항목을 지우는 사람은
 * 이 두 뮤테이션이 함께 죽는다는 것을 알고 지워라.**
 *
 * @param {Array<{type:string,length:number,at:number}>} chunks
 * @param {'png'|'jpeg'|'webp'} kind
 * @param {Buffer|null} [buf] 원본 바이트. **없으면 내용을 못 보므로 아무것도 통과 못 한다.**
 * @param {Array<{type:string,match:(head:string)=>boolean}>} [accepted]
 *   사람이 실물을 보고 통과시킨 규칙. **타입 집합이 아니라 내용 판별 규칙이다**(팀장 조건 3).
 *   테스트에서 주입한다.
 */
export function findExtra(chunks, kind, buf = null, accepted = ACCEPTED) {
  const render = RENDER[kind];
  if (!render) return chunks;
  return chunks.filter((c) => {
    if (render.has(c.type)) return false;
    // ⚠ `buf` 가 없으면 내용을 못 보므로 **통과시키지 않는다**(fail-closed).
    //   "못 봤다" 와 "봤는데 괜찮다" 를 같게 취급하지 않는다.
    // ⚠⚠ 판별에는 **`MATCH_WINDOW`(유도값)** 를 넘긴다 — `peek` 의 기본값 64는 로그 표시용
    //   선택이라 판별 근거가 될 수 없다. 두 값을 갈라 두면 로그 폭을 만지는 사람이
    //   판별을 건드리지 못한다.
    return !accepted.some((rule) => rule.type === c.type && buf && rule.match(peek(buf, c, MATCH_WINDOW)));
  });
}

/**
 * 판별에 필요한 창 — **유도값이다**(팀장 조건 1).
 *
 * `ACCEPTED` 의 APP11 규칙이 보는 최대 인덱스는 label 끝인 **44** 이고, 문자열 길이로는
 * 45 다. 유도 표(전부 규격 고정 크기):
 *
 *     CI 2B + En 2B + Z 4B         = 8B    → idx 0..7    APP11 공통 헤더
 *     box length 4B + `jumb` 4B    = 8B    → idx 8..15   (타입은 12..15)
 *     box length 4B + `jumd` 4B    = 8B    → idx 16..23  (타입은 20..23)
 *     UUID 16B                     = 16B   → idx 24..39
 *     toggles 1B                   = 1B    → idx 40
 *     label `c2pa`                 = 4B    → idx 41..44
 *                                  ─────
 *                                    45B   ← 이 값
 *
 * **45 보다 크게 잡아도 판별 결과는 같다**(오프셋 고정이라 뒤쪽을 안 본다). 작으면 label
 * 비교가 짧아져 **전부 막힌다** — 틀리는 방향이 fail-closed 다.
 *
 * 뮤테이션 실측:
 *   · R4 `45 → 44`                                → 5 failed  (값에는 검출력이 있다)
 *   · R5 판별 호출을 `peek(buf,c)`(기본 64)로 되돌림 → **0 failed — 등가 뮤테이션이다**
 *   · Z4 `45 → 60`(검수관 실측)                     → **0 failed**
 *
 * ⚠ **검출력은 한 방향뿐이다**(검수관 Q-1). 줄이면 잡히고(R4) **늘리면 아무도 안 잡는다**(Z4).
 * 위 *"45 보다 크게 잡아도 결과는 같다"* 가 곧 그 뜻인데, 성질만 적고 **검사가 없다는 말은
 * 안 적혀 있었다.** 이 값을 키우는 변경은 게이트를 통과한다 — 그것이 무해하다는 근거는
 * 오프셋 고정뿐이고, 판별을 다시 위치 무관하게 바꾸는 순간 그 근거도 사라진다.
 *
 * ⚠ **R5 가 0인 것을 숨기지 않는다.** 오프셋 고정이라 창이 45 이상이면 무엇이든 결과가
 * 같으므로, 판별에 이 상수를 넘기는 것은 **런타임 동작을 바꾸지 않는다.** 그런데도 나누어
 * 둔 이유는 하나뿐이다 — **어느 값이 유도값인가**를 코드가 말하게 하려는 것이고, 팀장
 * 조건 1 이 요구한 것이 정확히 그 구분이다(`peek` 의 64는 유도가 아니라 표시상의 선택이다).
 * 즉 이 분리가 지키는 것은 동작이 아니라 **근거의 소재**다. 그것을 「검출력 있음」으로
 * 적으면 다음 사람이 없는 방어를 믿는다.
 */
export const MATCH_WINDOW = 45;

/**
 * 청크 페이로드 선두를 인쇄 가능 문자로만 찍는다. 나머지는 `.`.
 *
 * ⚠ **기본값 64는 유도값이 아니라 로그 표시상의 선택이다** — 정직하게 적는다(검수관 B-2).
 * 첫 판본은 *"46B + 정렬 여유 → 64B"* 라고 적으면서 바로 위에서 *"경계는 유도값이다 —
 * 여유를 얹은 값이 아니다"* 라고 단언했다. **같은 블록 안에서 모순**이었고, 18B 는 어떤
 * 규격 항목에서도 안 나온다(46을 8·16바이트 정렬해도 48이다). 규율이 지목한 형태 그대로다:
 * *"실측에 여유를 얹은 값은 근거가 아니다."*
 *
 * 유도값은 위 `MATCH_WINDOW`(45) 이고 **판별은 그것만 쓴다.** 여기 64는 사람이 로그를 읽을
 * 때 label 뒤 몇 바이트를 더 보면 *왜* 판별에 실패했는지 보이기 때문에 고른 값이다 —
 * 근거가 아니라 판단이고, 판별에는 영향이 없다.
 *
 * 넓혀도 위험이 늘지 않는 이유: 그 구간은 여전히 JUMBF 구조 헤더이고 서명·키 자료는 수 KB
 * 뒤다. ⚠ 단 **이 상한은 `ACCEPTED` 가 통과시킨 청크에 대해서만 성립한다** — `peek` 은
 * extra(정의상 *모르는 것*) 에도 쓰이고 그쪽에는 이런 보장이 없다(검수관 P-3).
 * 생성 이미지라 촬영 EXIF 같은 경로가 없어 실질 위험은 낮지만, **낮은 것과 없는 것은 다르다.**
 * hex 는 안 찍는다 — 판별에 필요한 것은 고정 위치의 문자열뿐이고, 인쇄 필터가 바이너리를 가린다.
 */
export function peek(buf, chunk, n = 64) {
  const start = Math.max(0, chunk.at | 0);
  const end = Math.min(buf.length, start + n);
  let out = '';
  for (let i = start; i < end; i++) {
    const b = buf[i];
    out += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.';
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const failOnExtra = args.includes('--fail-on-extra');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('사용법: node scripts/png-chunks.mjs <이미지 경로> [--fail-on-extra]');
    process.exit(2);
  }
  const buf = fs.readFileSync(file);
  const { kind, chunks } = inspect(buf);
  console.log(`파일: ${file} (${KB(buf.length)})`);
  if (!kind) {
    // **못 읽은 것을 "깨끗하다" 로 적지 않는다.** 그러므로 fail 모드에서는 세운다 —
    // 형식을 모른다는 것은 메타데이터가 없다는 뜻이 아니라 **못 봤다**는 뜻이다.
    console.log('⚠ 알려진 이미지 형식이 아니다 — 메타데이터를 열거하지 못했다.');
    if (failOnExtra) {
      console.error('::error::형식을 못 읽어 메타데이터를 확인하지 못했다 — 못 잰 것을 통과로 적지 않는다.');
      process.exit(1);
    }
    return;
  }
  const essential = RENDER[kind];
  const extra = findExtra(chunks, kind, buf);
  // ⚠ 화면 표시는 **`extra` 를 기준으로** 정한다. 첫 판본은 `essential`·`ACCEPTED` 를
  //   여기서 다시 조회해 **같은 판정을 두 곳에서** 했고(검수관 P-c), 그러면 판정 로직을
  //   고칠 때 화면의 `＋` 와 실제 차단 목록이 어긋난다 — 값 미러링과 같은 형태다.
  // ⚠⚠ **타입 집합이 아니라 청크 객체로 가른다**(검수관 P-1). 첫 판본은
  //   `new Set(extra.map((c) => c.type))` 였고, **같은 타입이 여럿일 때 무너졌다** —
  //   C2PA 매니페스트가 64KB 를 넘으면 JPEG XT 규격상 `APP11` 이 여러 세그먼트로 쪼개지고
  //   2번째부터는 `jumb` 헤더가 없다. 그러면 하나는 extra 인데 타입이 같아서 **통과한
  //   세그먼트까지 `＋` 로 찍히고**, 동시에 `passed` 에서도 빠져 **그 peek 로그가 사라진다.**
  //   `extra` 는 `chunks` 를 필터한 결과라 같은 객체 참조다 — 그것으로 가르면 정확하다.
  const extraSet = new Set(extra);
  console.log(`형식: ${kind.toUpperCase()} · 청크 ${chunks.length}개`);
  for (const c of chunks) {
    const mark = extraSet.has(c) ? '＋' : essential.has(c.type) ? ' ' : '·';
    console.log(`  ${mark} ${c.type.padEnd(22)} ${String(c.length).padStart(9)} bytes`);
  }
  // **통과한 것도 찍는다.** 첫 판본은 `·`(ACCEPTED 통과)를 마크만 하고 지나갔는데, 그러면
  // 팀장 조건의 취지 —*"사람이 실물을 보고 통과시킨다"*— 가 **정작 통과하는 회차에** 깨진다:
  // 규칙이 보는 것은 선두 `MATCH_WINDOW` 바이트뿐이고 그 뒤 수 KB 의 매니페스트 본문은
  // 회차마다 달라도 통과한다. 로그에 안 남으면 *"그때 무엇이 통과했나"* 를 물을 자리가 없다.
  // ⚠ 판정은 `extraSet`·`essential` 에서 **유도**한다 — `ACCEPTED` 를 여기서 다시 조회하면
  //   같은 판정이 두 곳에 생긴다(검수관 P-c 가 지적한 그 형태).
  const passed = chunks.filter((c) => !extraSet.has(c) && !essential.has(c.type));
  if (passed.length) {
    console.log(`\n· 로 표시한 ${passed.length}개는 **사람이 근거를 적어 통과시킨 것**이다(ACCEPTED): ${passed.map((c) => c.type).join(', ')}`);
    // ⚠ `why` 를 **함께 찍는다**(검수관 P-2). 안 찍으면 사람의 동선이 로그에서 끊긴다 —
    //   로그는 *"통과했다"* 만 말하고 *"무슨 근거로"* 는 소스를 열어야 나온다.
    for (const c of passed) {
      console.log(`    ${c.type.padEnd(8)} ${peek(buf, c)}`);
      // ⚠ **지금은 `ACCEPTED[0]` 와 등가라 이 `find` 에 검출력이 0이다**(검수관 Q-2 실측:
      //   `ACCEPTED[0]` 로 바꿔도 0 failed). 규칙이 하나뿐이어서다. **항목이 둘이 되는 날 —
      //   PNG 회차의 `caBX` 규칙을 넣는 날 — 엉뚱한 근거가 로그에 찍힌다.** 뮤테이션 N10 이
      //   지적한 형태(*"목록이 비어 있는 동안은 원리상 못 잰다"*)가 한 칸 옮겨 온 것이고,
      //   그때 이 줄을 지키는 검사를 함께 넣어야 한다.
      const rule = ACCEPTED.find((r) => r.type === c.type);
      if (rule) console.log(`      근거: ${rule.why.split('\n')[0].trim()}`);
    }
  }
  if (extra.length) {
    const bytes = extra.reduce((a, c) => a + c.length, 0);
    console.log(`\n＋ 로 표시한 ${extra.length}개(${KB(bytes)})가 **이미지 데이터가 아닌 것**이다: ${extra.map((c) => c.type).join(', ')}`);
    // 판별 창(45B)이 아니라 **로그 폭**(peek 기본값)이다 — 둘을 섞어 말하지 않는다.
    console.log('  이름과 크기 말고 **선두 64바이트의 인쇄 가능 문자**를 함께 찍는다(판별은 앞 45바이트만 쓴다):');
    for (const c of extra) console.log(`    ${c.type.padEnd(8)} ${peek(buf, c)}`);
    if (failOnExtra) {
      console.error('::error::확인되지 않은 메타데이터가 있어 커밋 전에 세운다(팀장 조건 2026-08-13, 분기 A).');
      console.error('  사람이 위 목록을 읽고 판정하라. 예상대로면 png-chunks.mjs 의 ACCEPTED 에 근거와 함께 올린다.');
      console.error('  예상 밖이면 커밋하지 말고 팀장 재상신 — 공개 저장소는 한 번 커밋되면 blob 이 안 지워진다.');
      process.exit(1);
    }
  } else {
    console.log('\n확인되지 않은 청크 0개. 단 **픽셀에 박힌 워터마크(SynthID 등)는 이 축으로 안 보인다.**');
  }
}

// 경로에 공백·특수문자가 있어도 맞도록 `pathToFileURL` 을 쓴다(손으로 `file://` 를
// 붙이면 인코딩이 어긋나 CLI 가 조용히 아무 일도 안 하게 된다).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
