// @ts-nocheck — main.js 분해 4차 B군: 카메라 뷰 보조(ViewFx) 모듈화. strict 타입은 후속.
// main-viewfx.js — animate 게임루프에 매 프레임 결합된 "카메라 뷰 보조" 세 도메인을
//   main.js에서 추출한다. A군(perf)·투어·셀프뷰와 동일한 "상태 소유 이전 + tick 위임"
//   패턴이되, 세 항목이 게임루프에 흩어져(트윈은 tour.tick 앞, 층/온보딩은 그 뒤) 있어
//   단일 tick으로 몰지 않고 원래 위치에 대응하는 개별 메서드를 노출한다(순서 1바이트 보존).
//
//   묶은 이유(1모듈): 셋 다 "카메라 뷰 보조"라는 공통 결이고(트윈=카메라 보간, 층안내=
//   카메라 y 판정 안내, 온보딩=이동/시점 힌트), 상태가 서로 독립(데이터 의존 0)이라
//   같은 모듈에 소규모로 응집시켜도 God object가 되지 않는다. tour와 얽히는 건 트윈뿐이라
//   1모듈이어도 재배선면이 좁다.
//
//   소유 이전 상태:
//     트윈   : tween(텔레포트/투어 카메라 보간 상태) + tweenEuler(재사용 객체)
//     온보딩 : onboardStep·onboardRing·onboardPos0·onboardYaw0·onboardDoneT
//     층안내 : currentFloorId
//   상수 TWEEN_MIN/MAX_DURATION·ONBOARD_KEY는 모듈 내부로.
//
//   ctx 주입(A군 선례): init에서 1회 대입 후 재대입 없는 안정 참조(camera·player)는 값 주입
//   (프레임당 getter 회피). 동적(entered)은 getter(A군 isEntered와 동일 선례). UI(setStatus)는
//   값. 순수 leaf(easeInOutCubic·lerpAngle·BUILDING·EYE_HEIGHT·THREE)는 직접 import.
//
//   ⚠️ 교차 재배선: tween 소유가 여기로 오면서, 이미 배포된 tour 컨트롤러(main-tour.js
//   무수정)의 ctx.getTween/clearTween/startTween을 조립점(main.js)이 이 컨트롤러 메서드로
//   재배선한다. getTween()·clearTween()·startTween()을 공개 메서드로 제공한다.

import * as THREE from 'three';
import { easeInOutCubic, lerpAngle } from './main-math.js';
import { BUILDING, EYE_HEIGHT } from './config.js';

export function createViewFx(ctx) {
  const {
    camera,     // 값 — init 1회 대입 후 안정
    player,     // 값 — init 1회 대입 후 안정
    isEntered,  // getter — 입장 여부 (층안내 게이트)
    setStatus,  // 값 — UI
  } = ctx;

  // ---------------------------------------------------------------------------
  // 트윈 (텔레포트/투어 공용) — 게임루프 안에서 매 프레임 갱신된다.
  // ---------------------------------------------------------------------------
  let tween = null; // { fromX, fromZ, fromRy, toX, toZ, toRy, duration, elapsed, onDone }

  const TWEEN_MIN_DURATION = 0.8; // s
  const TWEEN_MAX_DURATION = 2.2; // s
  const tweenEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  // 현재 카메라 pose → 목표 pose로 부드럽게 이동을 시작한다. 이동 중에는
  // player.disable()을 유지하고, 완료 시 onDone(목표 pose)을 호출한다.
  function startTween(toPose, onDone) {
    const cur = player.getState();
    const toY = typeof toPose.y === 'number' ? toPose.y : cur.y;
    const dx = toPose.x - cur.x;
    const dy = toY - cur.y;
    const dz = toPose.z - cur.z;
    const dist = Math.hypot(dx, dy, dz);
    const duration = THREE.MathUtils.clamp(
      TWEEN_MIN_DURATION + dist * 0.035,
      TWEEN_MIN_DURATION,
      TWEEN_MAX_DURATION
    );
    player.disable();
    tween = {
      fromX: cur.x,
      fromY: cur.y,
      fromZ: cur.z,
      fromRy: cur.ry,
      toX: toPose.x,
      toY: toY,
      toZ: toPose.z,
      toRy: toPose.ry,
      duration,
      elapsed: 0,
      onDone: onDone || null,
    };
  }

  function updateTween(delta) {
    if (!tween) return;
    tween.elapsed += delta;
    const t = Math.min(1, tween.elapsed / tween.duration);
    const e = easeInOutCubic(t);
    const x = tween.fromX + (tween.toX - tween.fromX) * e;
    const y = tween.fromY + (tween.toY - tween.fromY) * e;
    const z = tween.fromZ + (tween.toZ - tween.fromZ) * e;
    const ry = lerpAngle(tween.fromRy, tween.toRy, e);
    camera.position.set(x, y, z);
    tweenEuler.set(0, ry, 0, 'YXZ');
    camera.quaternion.setFromEuler(tweenEuler);
    if (t >= 1) {
      const done = tween.onDone;
      tween = null;
      if (done) done();
    }
  }

  // tour 컨트롤러 재배선용 — tick의 `!getTween()` 판정, exitTour의 즉시정지.
  function getTween() {
    return tween;
  }
  function clearTween() {
    tween = null;
  }

  // ---------------------------------------------------------------------------
  // 층안내 — 카메라 y가 어느 층 대역에 있는지 (계단 중간은 아래층 유지)
  // ---------------------------------------------------------------------------
  let currentFloorId = null;
  function updateFloorIndicator() {
    if (!isEntered()) return;
    const y = camera.position.y - EYE_HEIGHT;
    let best = null;
    for (const f of BUILDING.floors) {
      if (y >= f.y - 0.9 && (best === null || f.y > best.y)) best = f;
    }
    if (!best) return;
    if (currentFloorId === null) {
      currentFloorId = best.id; // 스폰 층은 조용히 기록
      return;
    }
    if (best.id !== currentFloorId) {
      currentFloorId = best.id;
      setStatus(best.name);
    }
  }

  // ---------------------------------------------------------------------------
  // 첫 방문 행동 온보딩 (터치 전용) — 모달 대신 "행동으로 배우는" 3단계:
  // 이동 힌트(맥동 링) → 시점 스와이프 힌트 → 투어 안전망 안내. 각 단계는 실제
  // 행동(이동/회전) 감지 시 넘어가며 localStorage로 1회만.
  // ---------------------------------------------------------------------------
  const ONBOARD_KEY = 'lu-onboard-v1';
  let onboardStep = -1; // -1: 비활성
  let onboardRing = null;
  let onboardPos0 = null;
  let onboardYaw0 = 0;
  let onboardDoneT = 0;

  function startOnboarding() {
    try {
      if (localStorage.getItem(ONBOARD_KEY)) return;
    } catch (_) { /* 접근 불가 시 매번 떠도 무해 */ }
    if (!(typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)) return;
    onboardStep = 0;
    const st = player.getState();
    onboardPos0 = { x: st.x, z: st.z };
    // 맥동하는 조이스틱 프리뷰 링 — 플로팅 조이스틱이라 위치가 달라도 동작 일치
    const styleTag = document.createElement('style');
    styleTag.textContent = '@keyframes lu-ob-pulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} 70%{transform:translate(-50%,-50%) scale(1.25);opacity:0.2;} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} }';
    document.head.appendChild(styleTag);
    onboardRing = document.createElement('div');
    onboardRing.style.cssText =
      'position:fixed;left:24%;bottom:22%;width:110px;height:110px;border-radius:50%;' +
      'border:3px solid rgba(255,253,247,0.85);pointer-events:none;z-index:60;' +
      'transform:translate(-50%,-50%);animation:lu-ob-pulse 1.6s ease-in-out infinite;';
    document.body.appendChild(onboardRing);
    setStatus('왼쪽 화면을 누른 채 밀면 걸어요 🚶');
  }

  function tickOnboarding() {
    if (onboardStep < 0) return;
    const st = player.getState();
    if (onboardStep === 0) {
      if (Math.hypot(st.x - onboardPos0.x, st.z - onboardPos0.z) > 1.5) {
        onboardStep = 1;
        onboardYaw0 = st.ry;
        if (onboardRing) {
          onboardRing.remove();
          onboardRing = null;
        }
        setStatus('잘했어요! 오른쪽 화면을 쓸면 주위를 둘러봐요 👀');
      }
    } else if (onboardStep === 1) {
      let dy = st.ry - onboardYaw0;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      if (Math.abs(dy) > 0.6) {
        onboardStep = 2;
        onboardDoneT = 0;
        setStatus('작품에 다가가면 설명이 나타나요 — 어려우면 [투어] 버튼을 눌러요 🖼️');
      }
    } else if (onboardStep === 2) {
      onboardDoneT += 1;
      if (onboardDoneT > 420) { // ~7초(60fps 기준) 후 종료
        onboardStep = -1;
        try { localStorage.setItem(ONBOARD_KEY, '1'); } catch (_) { /* 무시 */ }
      }
    }
  }

  return {
    // 트윈
    startTween,
    updateTween,
    getTween,
    clearTween,
    // 층안내
    updateFloorIndicator,
    // 온보딩
    startOnboarding,
    tickOnboarding,
  };
}
