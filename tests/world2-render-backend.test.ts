// 렌더 백엔드 라벨 판정 — `classifyBackend` 회귀 테스트
//
// ── 왜 이 파일이 있나 (검수관 블로커 2026-07-31) ─────────────────────────────
// `classifyBackend` 를 순수 함수로 뺀 이유가 "테스트가 브라우저 없이 이 판정을 직접
// 재도록" 이었는데, **정작 테스트를 커밋하지 않았다.** 주석은 있는데 테스트가 없으니
// 그 주석이 없는 것을 있다고 서술하는 꼴이었고, PR 본문의 "8케이스 + 뮤테이션 확인" 은
// 스크래치에서 돌리고 지운 **재현 불가능한 자기신고**였다.
//
// 그 상태로 병합하면 `SOFTWARE_GL` 정규식이나 분기를 누가 고쳐도 아무것도 안 깨진다.
// 이 저장소의 규율("테스트 통과는 검출력의 증거가 아니다")은 테스트가 있어야 적용되는데,
// 애초에 없어서 적용조차 안 되는 상태였다.
//
// ── 이 테스트가 지키는 것 ────────────────────────────────────────────────────
// ① 실측값(이 컨테이너의 SwiftShader 문자열)이 `webgl-software` 로 판정되는가
// ② 근거가 없을 때 **낙관 해석하지 않고 `unknown`** 이 되는가 — 이것이 설계의 핵심이다
// ③ 소프트웨어 서명이 vendor 쪽에만 있어도 잡히는가
//
// ── 못 지키는 것 ─────────────────────────────────────────────────────────────
// 실기기 WebGPU 에서 `adapter.info` 가 실제로 어떤 문자열을 주는지는 모른다. 아래
// `webgpu-hardware` 케이스는 **가정**이고, 감독 실기기 확인 전까지 그 이상이 아니다.

import { describe, it, expect } from 'vitest';
// 확장자는 `.js` 로 쓴다 — 이 저장소의 리졸브 관례이고(`tests/*.test.ts` 전부 동일),
// `.ts` 로 쓰면 `allowImportingTsExtensions` 미설정이라 typecheck 가 막는다(실제로 막혔다).
import { classifyBackend } from '../frontend/js/world2/adapters/renderer.js';

/** 이 컨테이너에서 실제로 읽은 문자열(2026-07-31 실측) */
const SWIFTSHADER_GL =
  'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)';

describe('classifyBackend — WebGL 경로', () => {
  it('SwiftShader 는 소프트웨어다 (이 컨테이너 실측값)', () => {
    expect(classifyBackend({
      backend: 'WebGL', isFallbackAdapter: null, adapterInfo: null, glRenderer: SWIFTSHADER_GL,
    })).toBe('webgl-software');
  });

  it('llvmpipe(Mesa 소프트 래스터라이저)도 소프트웨어다', () => {
    expect(classifyBackend({
      backend: 'WebGL', isFallbackAdapter: null, adapterInfo: null,
      glRenderer: 'llvmpipe (LLVM 15.0.7, 256 bits)',
    })).toBe('webgl-software');
  });

  it('실기기 GPU 는 하드웨어다', () => {
    expect(classifyBackend({
      backend: 'WebGL', isFallbackAdapter: null, adapterInfo: null,
      glRenderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)',
    })).toBe('webgl-hardware');
  });

  it('렌더러 문자열을 못 읽으면 unknown 이다 — 하드웨어로 낙관하지 않는다', () => {
    expect(classifyBackend({
      backend: 'WebGL', isFallbackAdapter: null, adapterInfo: null, glRenderer: null,
    })).toBe('unknown');
  });
});

describe('classifyBackend — WebGPU 경로', () => {
  it('어댑터가 폴백이라고 밝히면 소프트웨어다', () => {
    expect(classifyBackend({
      backend: 'WebGPU', isFallbackAdapter: true, adapterInfo: null, glRenderer: null,
    })).toBe('webgpu-software');
  });

  it('isFallbackAdapter=false 면 하드웨어다 (실기기 가정 — 실측 아님)', () => {
    expect(classifyBackend({
      backend: 'WebGPU', isFallbackAdapter: false,
      adapterInfo: { vendor: 'nvidia', architecture: 'ampere' }, glRenderer: null,
    })).toBe('webgpu-hardware');
  });

  it('isFallbackAdapter 가 없어도 vendor 에 소프트웨어 서명이 있으면 잡는다', () => {
    expect(classifyBackend({
      backend: 'WebGPU', isFallbackAdapter: null,
      adapterInfo: { vendor: 'google', device: 'SwiftShader Device' }, glRenderer: null,
    })).toBe('webgpu-software');
  });

  it('★ 근거가 하나도 없으면 unknown 이다 — WebGPU 가 떴다는 것만으로 하드웨어라 적지 않는다', () => {
    // 이 케이스가 설계의 핵심이다. "WebGPU 가 초기화됐다" 와 "그것이 GPU 다" 는 다른 일이다.
    // 여기가 `webgpu-hardware` 로 새면 리포트가 CPU 래스터라이저를 실기기라고 말하게 된다.
    expect(classifyBackend({
      backend: 'WebGPU', isFallbackAdapter: null, adapterInfo: null, glRenderer: null,
    })).toBe('unknown');
  });

  it('폴백 선언이 vendor 문자열보다 우선한다', () => {
    // 어댑터가 스스로 밝힌 값이 가장 강한 근거다. vendor 가 그럴듯해도 뒤집지 않는다.
    expect(classifyBackend({
      backend: 'WebGPU', isFallbackAdapter: true,
      adapterInfo: { vendor: 'nvidia', architecture: 'ampere' }, glRenderer: null,
    })).toBe('webgpu-software');
  });
});

describe('classifyBackend — 검출력(뮤테이션 대응)', () => {
  // 이 테스트들은 "정규식이나 분기를 느슨하게 고치면 깨진다" 를 보증한다.
  // 검수관 지적: 뮤테이션을 스크래치에서만 돌리면 다음 사람이 고칠 때 아무것도 안 깨진다.

  it('SOFTWARE_GL 에서 swiftshader 를 빼면 이 케이스가 깨진다', () => {
    // 실제 뮤테이션 실행 결과(2026-07-31): `swiftshader` 를 패턴에서 제거하면
    // 이 컨테이너가 `webgl-hardware` 로 **오판정**됐다. 그 오판정을 이 단언이 막는다.
    const got = classifyBackend({
      backend: 'WebGL', isFallbackAdapter: null, adapterInfo: null, glRenderer: SWIFTSHADER_GL,
    });
    expect(got).not.toBe('webgl-hardware');
    expect(got).toBe('webgl-software');
  });

  it('unknown 을 낙관 해석하는 변경이 들어오면 깨진다', () => {
    // `unknown` 을 `webgl-hardware`/`webgpu-hardware` 로 바꾸는 "친절한" 기본값이
    // 들어오는 순간 이 두 단언이 동시에 깨진다.
    expect(classifyBackend({
      backend: 'WebGL', isFallbackAdapter: null, adapterInfo: null, glRenderer: null,
    })).toBe('unknown');
    expect(classifyBackend({
      backend: 'WebGPU', isFallbackAdapter: null, adapterInfo: null, glRenderer: null,
    })).toBe('unknown');
  });

  it('대소문자 무시 — SWIFTSHADER 로 와도 잡는다', () => {
    expect(classifyBackend({
      backend: 'WebGL', isFallbackAdapter: null, adapterInfo: null,
      glRenderer: 'ANGLE (SWIFTSHADER Device)',
    })).toBe('webgl-software');
  });
});
