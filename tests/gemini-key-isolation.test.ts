// tests/gemini-key-isolation.test.ts — Gemini API 키가 **밖으로 나가는 경로에 실리지
// 않는다**를 단언한다 (팀장 조건 2026-08-10 (나)②③).
//
// ── 무엇이 위험한가 ────────────────────────────────────────────────────────
// 이 저장소는 상태를 **URL 로 실어 나른다**(`studio-storage.ts` 의 `#gz=`). 그리고
// **손으로 조작한 링크는 발행 관문을 안 탄다**(보안담당 R-4). 키가 직렬화 대상에
// 한 번이라도 들어가면 **링크를 받은 사람 전부가 감독의 키를 갖는다.**
//
// 멀티플레이어도 같은 축이다 — `multiplayer.js` 가 PeerJS 데이터채널로 상태를 뿌린다.
// 거기 실리면 **같은 방의 관람객 전원**에게 간다.
//
// ── 왜 「산문 선언」으로 두지 않는가 ───────────────────────────────────────
// `gemini-key.ts` 헤더가 *"어떤 직렬화기에도 자기를 넘기지 않는다"* 라고 적고 있다.
// **그 문장은 게이트가 아니다.** 이 저장소는 산문이 참인 줄 알았다가 거짓으로 드러난
// 전례가 여러 번이다(GS-3 신설 사유). 그래서 검사로 만든다.
import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const KEY_MODULE = 'frontend/js/mypage/gemini-key.ts';

/** 키 상수의 실제 값을 소스에서 읽는다 — 값을 여기 다시 적으면 그것이 값 미러링이다. */
function keyName(): string {
  const src = fs.readFileSync(path.join(ROOT, KEY_MODULE), 'utf8');
  const m = /export const GEMINI_KEY\s*=\s*'([^']+)'/.exec(src);
  if (!m) throw new Error('GEMINI_KEY 선언을 못 찾았다 — 이 검사가 대상을 놓치고 있다');
  return m[1];
}

/** 밖으로 나가는 경로들. **여기 없는 새 경로가 생기면 이 검사는 그것을 못 본다.** */
const OUTBOUND = [
  'frontend/js/studio-storage.ts', // `#gz=` 공유 링크
  'frontend/js/multiplayer.js', // PeerJS 데이터채널
];

describe('Gemini 키 격리 — 밖으로 나가는 경로에 안 실린다', () => {
  it('키 상수 이름을 소스에서 읽을 수 있다 (이 검사의 전제)', () => {
    expect(keyName()).toMatch(/gemini/i);
  });

  it.each(OUTBOUND)('%s 가 키 모듈을 import 하지 않는다', (rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    // 경로를 끊는다 — 값이 아니라 **구조**로 막는 것이 팀장 조건이다.
    expect(src).not.toMatch(/gemini-key/);
  });

  it.each(OUTBOUND)('%s 가 키 이름 문자열을 갖지 않는다', (rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    expect(src).not.toContain(keyName());
  });

  it('키 모듈은 스스로 어떤 직렬화·전송도 하지 않는다', () => {
    const src = fs.readFileSync(path.join(ROOT, KEY_MODULE), 'utf8');
    // 이 모듈이 키를 **반환만** 하는지 본다. 전송·직렬화 수단이 들어오면 잡는다.
    // (주석에 등장하는 낱말은 걷어낸다 — 브라우저가 안 읽는 것은 규칙이 아니다.)
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const forbidden of ['fetch(', 'XMLHttpRequest', 'navigator.sendBeacon', 'location.hash', 'JSON.stringify']) {
      expect(code).not.toContain(forbidden);
    }
  });

  it('로그아웃 정리에 키 삭제가 배선돼 있다', () => {
    const src = fs.readFileSync(path.join(ROOT, 'frontend/js/auth.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).toContain('clearGeminiKeyOnLogout');
    // 프로필 정리와 **같은 함수 안**에 있어야 한다 — 따로 떨어지면 한쪽만 도는 날이 온다.
    expect(code).toMatch(/clearProfilesOnLogout\(\);[\s\S]{0,400}clearGeminiKeyOnLogout\(\);/);
  });
});

// ── 이 검사가 **못 잡는 것** ────────────────────────────────────────────────
//  · `OUTBOUND` 목록에 **없는 새 전송 경로**(구조적 한계 — 새 경로를 만드는 사람이
//    이 목록에 추가해야 한다. 그것을 강제하는 축은 없다)
//  · 런타임에 조립된 키 이름(`'lu-' + 'gemini' + …`) — 문자열 검사라 못 본다
//  · 키를 **읽어서 다른 변수에 담아** 내보내는 경로(이 검사는 import·문자열만 본다)
//  · 브라우저 확장·개발자도구 등 오리진 안에서 도는 남의 코드(구조적으로 못 막는다)
