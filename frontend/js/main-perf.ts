// main-perf.js — animate 게임루프에서 "매 프레임 성능/렌더 관리" 응집 덩어리를 추출한다.
//   투어·셀프뷰 컨트롤러와 동일한 "상태 소유권 이전 + tick 위임" 방식이되, 이 덩어리는
//   render()·프레임 순서와 독립(A군은 render 무관)이라 가장 안전한 첫 단위다.
//
//   소유 이전 상태 9개(전부 게임루프 안에서만 read/write였다 — 감사 확인):
//     liteMode·liteToggleCooldown·liteCullAccum   (저사양 히스테리시스·NPC 컬링)
//     shadowRebakeInterval·shadowRebakeAccum·shadowWarmupDone (섀도 재베이크)
//     specFastTicks                                 (품질 승급 연속 카운트)
//     fpsFrames·fpsElapsed                          (FPS 집계 누적)
//   applyNpcCulling도 함께 이전(호출처가 전부 이 컨트롤러 안 — 외부 노출 불필요).
//
//   ctx 주입 규율(투어·셀프뷰와 동일): init에서 1회 대입 후 재대입 없는 안정 참조
//   (renderer·camera·gpuInfo)는 값으로 주입해 프레임당 getter 오버헤드를 없앤다.
//   동적으로 바뀌는 참조(entered·mp)는 getter로 매 호출 읽어 stale을 원천 차단한다.
//   UI(setFPS·setStatus)·spec 학습(writeSpec·readSpec)은 안정 참조라 값으로 받는다.
//   FPS 임계·픽셀 예산·컬링 인원 상수는 main-spec.js에서 직접 import(순수 상수 leaf).
//
//   tick(delta)는 원본 animate의 #13(FPS 집계+lite 히스테리시스+spec 학습+pixelRatio
//   라이브 조정) → #14(NPC 컬링) → #15(섀도 재베이크+warmup) 세 블록을 순서·조건·임계·
//   부작용 1바이트 동치로 소유한다. render()는 건드리지 않는다(A군은 render 독립).
//   섀도 초기 주기(resolvedTheme로 결정)는 setShadowInterval()로 결선한다.

import { readSpec, writeSpec, PX_BUDGET, MOBILE_PX_CAP, LITE_ENTER_FPS, LITE_EXIT_FPS, LITE_VISIBLE_NPCS } from './main-spec.js';

// 모바일(터치) 판정 — 주 포인터가 coarse일 때만 true(진짜 폰/태블릿). 마우스가 주
// 입력인 터치 노트북·데스크톱은 fine이라 false → 데스크톱 런타임 경로 무변화.
// 처방 A: lite 하드가드·high 승급 차단을 모바일에만 적용하는 게이트.
const IS_MOBILE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

// main.js의 perfCtx가 주입하는 계약(안정 참조는 값, 동적 참조는 getter — 사용 멤버만 최소 선언).
interface PerfAvatar { group: { visible: boolean; position: { distanceTo(p: object): number } } }
interface PerfCtx {
  renderer: { setPixelRatio(r: number): void; getPixelRatio(): number; shadowMap: { needsUpdate: boolean } };
  camera: { position: object };
  gpuInfo: { soft: boolean };
  getMp(): { remoteAvatars: Map<string, PerfAvatar> } | null;
  isEntered(): boolean;
  setFPS(n: number): void;
  setStatus(s: string): void;
}

export function createPerfGovernor(ctx: PerfCtx) {
  const {
    renderer,   // 값 — init 1회 대입 후 안정
    camera,     // 값 — init 1회 대입 후 안정 (applyNpcCulling 거리 정렬용)
    gpuInfo,    // 값 — init probeGpu() 후 안정 ({ name, soft })
    getMp,      // getter — 입장 전 null, 동적
    isEntered,  // getter — 입장 여부 (lite 전환·섀도 warmup 게이트)
    setFPS,     // 값 — UI
    setStatus,  // 값 — UI
  } = ctx;

  // --- 성능/렌더 상태 SSOT (main.js에서 이전) ---
  // 적응형 저사양 모드 — 실측 FPS가 낮으면 화면에서 먼 AI 관객을 잠시 숨긴다.
  // (시뮬레이션·다른 접속자에게는 영향 없음 — 순수 로컬 렌더 절약)
  let liteMode = false;
  let liteToggleCooldown = 0;
  let liteCullAccum = 0;
  // 섀도맵 재베이크 주기(초) — 0이면 정적 테마(프리즈 유지), cycle 테마는 2초
  let shadowRebakeInterval = 0;
  let shadowRebakeAccum = 0;
  let shadowWarmupDone = false; // 입장 직후 텍스처/지오메트리 지연 생성분 1회 재베이크
  let specFastTicks = 0; // 승급용 고FPS 연속 카운트
  // FPS 집계
  let fpsFrames = 0;
  let fpsElapsed = 0;

  function applyNpcCulling() {
    const mp = getMp();
    if (!mp) return;
    const npcs: PerfAvatar[] = [];
    for (const [rid, av] of mp.remoteAvatars) {
      if (rid.startsWith('npc-')) npcs.push(av);
    }
    if (!liteMode) {
      for (const av of npcs) av.group.visible = true;
      return;
    }
    npcs.sort((a, b) => a.group.position.distanceTo(camera.position) - b.group.position.distanceTo(camera.position));
    npcs.forEach((av, i) => {
      av.group.visible = i < LITE_VISIBLE_NPCS;
    });
  }

  // 섀도 초기 재베이크 주기 결선 — init에서 resolvedTheme('cycle'이면 2, 아니면 0)로 호출.
  function setShadowInterval(seconds: number) {
    shadowRebakeInterval = seconds;
  }

  // 게임루프 위임 — animate 매 프레임 호출. 원본 #13→#14→#15 블록과 순서·조건·임계·
  // 부작용(setFPS·writeSpec(localStorage)·renderer.setPixelRatio·setStatus·
  // shadowMap.needsUpdate) 1바이트 동치. render()는 소유하지 않는다.
  function tick(delta: number) {
    const entered = isEntered();

    // #13 FPS 집계 (0.5초마다 갱신)
    fpsFrames += 1;
    fpsElapsed += delta;
    if (fpsElapsed >= 0.5) {
      const fpsNow = fpsFrames / fpsElapsed;
      setFPS(Math.round(fpsNow));
      fpsFrames = 0;
      fpsElapsed = 0;
      // 저사양 자동 전환 (히스테리시스 + 10초 재전환 금지로 깜빡임 방지)
      liteToggleCooldown = Math.max(0, liteToggleCooldown - 0.5);
      if (liteToggleCooldown === 0 && entered) {
        if (!liteMode && fpsNow < LITE_ENTER_FPS) {
          liteMode = true;
          liteToggleCooldown = 10;
          // 영구 학습(다음 접속 AA off)은 진짜 바닥에서만 — 20fps대 기기가
          // 다음 방문부터 계속 뿌옇게 시작하는 부작용 방지 (실기기 제보)
          if (fpsNow < 16) writeSpec('low');
          // 즉시 응급 처치 — 재접속 없이 해상도 배율을 강등한다.
          // [처방 A 하드가드] 모바일(터치)은 spec 'high' 학습값과 무관하게
          // MOBILE_PX_CAP(≤1.5)로 강제 상한. 기존 dpr*0.75 하한이 고DPR 폰(dpr3→
          // 2.25)에서 lite가 배율을 못 내리던 실측 버그(index 30fps·px2.25)를 차단.
          // 데스크톱은 OS 배율(dpr>1)에서 1.0 밑돌면 뿌옇던 제보대로 dpr 비례 하한
          // (Math.max(1, dpr*0.75))을 그대로 유지 — 회귀 없음.
          const dprNow = window.devicePixelRatio || 1;
          const liteCap = IS_MOBILE ? MOBILE_PX_CAP : Math.max(1, dprNow * 0.75);
          renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), liteCap));
          setStatus('원활한 관람을 위해 화질을 잠시 낮췄어요');
        } else if (liteMode && fpsNow > LITE_EXIT_FPS) {
          liteMode = false;
          liteToggleCooldown = 10;
          applyNpcCulling();
        }
        // 품질 승급 — 고FPS(55+)가 10초(0.5s 틱 × 20) 지속되면 한 단계 위로
        // (low → 기본 → high). 다음 접속부터 적용된다.
        if (!liteMode && fpsNow > 55) {
          specFastTicks += 1;
          if (specFastTicks >= 20) {
            const cur = readSpec();
            if (cur === 'low') writeSpec(null); // 저사양 벗어남 → 기본 복귀는 모바일도 허용(뿌옇게 남지 않게)
            // [처방 A] 모바일(터치)은 'high' 승급 차단 — 순간 고FPS(저전력 캡 해제
            // 등)로 학습해 다음 접속부터 슈퍼샘플 2.x를 이고 시작하는 fill-rate
            // 병목을 원천 차단. 데스크톱은 기존대로 high 승급 허용(무변화).
            else if (cur === null && !IS_MOBILE) writeSpec('high');
            // 라이브 샤프닝 — 재접속을 기다리지 않고 배율을 한 단계(+0.25)씩
            // 상향한다. 55fps+가 유지되는 한 10초마다 반복되고, 떨어지면
            // lite 강등이 되돌리므로 히스테리시스로 안전 (알리아싱 제보 대응).
            const maxHigh = Math.min(
              2.5,
              Math.sqrt(PX_BUDGET.high / (window.innerWidth * window.innerHeight))
            );
            const nowRatio = renderer.getPixelRatio();
            // [처방 A] 모바일은 라이브 샤프닝(+0.25)도 차단 — 켜두면 처방 B의
            // MOBILE_PX_CAP(≤1.5) 상한이 무력화되어 배율이 다시 2.x로 기어오른다.
            // 데스크톱(!IS_MOBILE)은 기존 샤프닝 그대로(무변화).
            if (!gpuInfo.soft && !IS_MOBILE && nowRatio < maxHigh) {
              renderer.setPixelRatio(Math.min(maxHigh, nowRatio + 0.25));
              setStatus('화질을 한 단계 높였어요 ✨');
            }
            specFastTicks = 0;
          }
        } else {
          specFastTicks = 0;
        }
      }
    }

    // #14 저사양 모드 컬링 — 2초마다 가까운 관객 3명만 표시
    liteCullAccum += delta;
    if (liteCullAccum >= 2) {
      liteCullAccum = 0;
      if (liteMode) applyNpcCulling();
    }

    // #15 섀도맵 재베이크 — cycle 테마는 태양이 움직이므로 저빈도 갱신,
    // 정적 테마는 입장 직후 1회(지연 로드된 액자 등 반영)로 끝.
    if (shadowRebakeInterval > 0) {
      shadowRebakeAccum += delta;
      if (shadowRebakeAccum >= shadowRebakeInterval) {
        shadowRebakeAccum = 0;
        renderer.shadowMap.needsUpdate = true;
      }
    }
    if (!shadowWarmupDone && entered) {
      shadowWarmupDone = true;
      renderer.shadowMap.needsUpdate = true;
    }
  }

  return {
    tick,
    setShadowInterval,
    getLite: () => liteMode, // ?debug=perf HUD 전용 접근자 — 적응형 저사양(lite) 실시간 상태 노출(로직 무변경, 순수 getter)
  };
}
