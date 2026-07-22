// @ts-nocheck — main.js 분해 3차(세 번째 군): 셀프뷰(3인칭 자기시점) 컨트롤러 모듈화. strict 타입은 후속.
// main-selfview.js — 3인칭 '내 모습 보기'를 main.js에서 추출. 투어 군(main-tour.js)과
//   동일한 "상태 소유권 이전 + 게임루프 tick 위임" 방식. 셀프뷰 상태(thirdPerson·
//   selfAvatar·selfPrev·selfSpeed)와 셀프캠 임계 상수(SELF_CAM_DIST/RISE/TILT), 셀프캠
//   저장용 재사용 THREE 객체를 이 클로저가 SSOT로 소유한다. main.js에는 해당 let이 남지 않는다.
//
//   selfSpeed는 외부에서 주입되지 않는다 — tick(delta) 안에서 프레임 간 이동거리(selfPrev
//   기준)를 평활(EMA)하여 자체 계산한다. selfAvatar.update(delta, selfSpeed)에만 소비되는
//   완전 내부 상태다. tick 판정·인자·순서는 원본 animate 블록과 1바이트 동치를 유지한다.
//
//   ctx 주입 규율(투어·사진 군과 동일): 재대입되는 module-scope let(scene·camera·player·
//   selfInfo·entered)은 값 캡처가 아니라 ctx의 getter로 매 호출 읽어 stale 참조를 원천
//   차단한다. 안정 참조(createAvatarInstance·EYE_HEIGHT·setStatus·setDockActive)는 값으로
//   주입받는다. selfInfo는 이 컨트롤러가 소유하지 않는다(입장 로직이 세팅, handleAvatarChange가
//   재대입) — 읽기만 getSelfInfo() getter로 한다.
//
//   교차 의존: 사진 군(main-photo.js)의 capturePhoto가 3인칭일 때 셀프캠 오프셋을 적용한다.
//   isThirdPerson()·getSelfAvatar()·applySelfCamOffset()·restoreSelfCamOffset()를 공개 메서드로
//   제공하고, main.js(조립점)가 photoCtx의 해당 4개를 이 컨트롤러 메서드로 재배선한다
//   (컨트롤러 간 직접 의존이 아니라 조립점 중재). 아바타 재빌드(꾸미기 저장)는 rebuildAvatar(char)로
//   위임받는다 — selfAvatar를 소유하므로 main.js가 직접 조작하지 않는다.

import * as THREE from 'three';

export function createSelfViewController(ctx) {
  const {
    getScene,
    getCamera,
    getPlayer,
    getSelfInfo,
    isEntered,
    createAvatarInstance,
    EYE_HEIGHT,
    setStatus,
    setDockActive,
  } = ctx;

  // --- 셀프캠 임계 상수 (main.js에서 이전) ---
  // 플레이어 제어는 1인칭 그대로 두고, 렌더 직전에만 카메라를 시선 반대 방향으로
  // 당겼다가 복원한다 — player.js가 camera.position을 눈 위치로 소유하는 계약을
  // 깨지 않는다(이동·충돌·상태 전송 모두 눈 위치 기준 유지).
  const SELF_CAM_DIST = 3.0;
  const SELF_CAM_RISE = 0.7;
  const SELF_CAM_TILT = -0.2; // 살짝 내려다보는 오버숄더 앵글(rad)

  // --- 셀프뷰 상태 SSOT (main.js에서 이전) ---
  let thirdPerson = false;
  let selfAvatar = null;  // createAvatarInstance() 결과 — 최초 토글 시 지연 생성
  let selfPrev = null;    // 자기 속도 산출용 직전 (x,z)
  let selfSpeed = 0;

  // 셀프캠 오프셋 저장용 재사용 객체 — 매 프레임 render 직전 apply/restore에서 쓰인다.
  // 프레임 내 신규 THREE 할당을 피하려 모듈 클로저에 1회 생성해 재사용한다.
  const _selfCamSaved = new THREE.Vector3();
  const _selfCamBack = new THREE.Vector3();
  const _selfCamQuatSaved = new THREE.Quaternion();

  // V키 / 터치 독 '시점' 버튼 — 3인칭 셀프뷰 토글. 원본 toggleSelfView와 1바이트 동치.
  function toggle() {
    if (!isEntered()) return;
    thirdPerson = !thirdPerson;
    if (thirdPerson) {
      const info = getSelfInfo();
      if (!selfAvatar && info) {
        try {
          selfAvatar = createAvatarInstance(info.char, info.color, ' ');
          // 닉네임 라벨 스프라이트 숨김 — 3인칭 화면 중앙을 빈 알약이 가리지 않게
          selfAvatar.group.traverse((o) => {
            if (o.isSprite) o.visible = false;
          });
          getScene().add(selfAvatar.group);
        } catch (err) {
          console.warn('내 아바타 생성 실패:', err);
          selfAvatar = null;
          thirdPerson = false;
          return;
        }
      }
      if (!selfAvatar) {
        thirdPerson = false;
        return;
      }
      selfAvatar.group.visible = true;
      setDockActive('self', true);
      selfPrev = null;
      selfSpeed = 0;
      setStatus('내 모습 보기 — V키 또는 [시점] 버튼으로 복귀');
    } else if (selfAvatar) {
      selfAvatar.group.visible = false;
      setDockActive('self', false);
    }
  }

  // 꾸미기 창에서 [저장하고 사용]을 누르면 handleAvatarChange가 이 메서드로 위임한다.
  // 3인칭 아바타가 이미 생성돼 있으면 즉시 재빌드(위치·시점 유지). selfAvatar를 소유하므로
  // main.js가 아니라 컨트롤러가 dispose·재대입을 처리한다. 원본 handleAvatarChange의
  // selfAvatar 재빌드 블록과 1바이트 동치(색은 getSelfInfo().color로 읽는다).
  function rebuildAvatar(char) {
    if (!selfAvatar) return;
    const prevGroup = selfAvatar.group;
    const wasVisible = prevGroup.visible;
    const pos = prevGroup.position.clone();
    const ry = prevGroup.rotation.y;
    try {
      const info = getSelfInfo();
      const next = createAvatarInstance(char, (info && info.color) || '#3498db', ' ');
      next.group.traverse((o) => { if (o.isSprite) o.visible = false; });
      next.group.position.copy(pos);
      next.group.rotation.y = ry;
      next.group.visible = wasVisible;
      getScene().add(next.group);
      getScene().remove(prevGroup);
      selfAvatar.dispose();
      selfAvatar = next;
    } catch (err) {
      console.warn('내 아바타 갱신 실패:', err);
    }
  }

  // 렌더 직전 카메라 오프셋 — main.js animate의 render 분기와 사진 군(capturePhoto)이 호출한다.
  function applySelfCamOffset() {
    const camera = getCamera();
    _selfCamSaved.copy(camera.position);
    _selfCamQuatSaved.copy(camera.quaternion);
    _selfCamBack.set(0, 0, 1).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(_selfCamBack, SELF_CAM_DIST);
    camera.position.y += SELF_CAM_RISE;
    camera.rotateX(SELF_CAM_TILT);
  }
  function restoreSelfCamOffset() {
    const camera = getCamera();
    camera.position.copy(_selfCamSaved);
    camera.quaternion.copy(_selfCamQuatSaved);
  }

  // 게임루프 위임 — animate 매 프레임 호출. 원본 animate 아바타 갱신 블록과 1바이트 동치:
  //   thirdPerson && selfAvatar 일 때 눈 위치/yaw를 발밑 기준으로 반영 + 속도 평활(EMA).
  // selfSpeed는 여기서 selfPrev(직전 x,z) 대비 이동거리를 delta로 나눠 자체 산출한다.
  // 프레임 내 THREE 객체 신규 할당 없음(selfPrev = {x,z}는 셀프뷰 진입당 최초 1회, 매 프레임 아님).
  function tick(delta) {
    if (thirdPerson && selfAvatar) {
      const st = getPlayer().getState();
      selfAvatar.group.position.set(st.x, st.y - EYE_HEIGHT, st.z);
      selfAvatar.group.rotation.y = st.ry;
      if (!selfPrev) selfPrev = { x: st.x, z: st.z };
      const raw = delta > 0 ? Math.hypot(st.x - selfPrev.x, st.z - selfPrev.z) / delta : 0;
      selfSpeed += (raw - selfSpeed) * Math.min(1, 10 * delta);
      selfPrev.x = st.x;
      selfPrev.z = st.z;
      selfAvatar.update(delta, selfSpeed);
    }
  }

  return {
    tick,
    toggle,
    rebuildAvatar,
    applySelfCamOffset,
    restoreSelfCamOffset,
    isThirdPerson: () => thirdPerson,
    getSelfAvatar: () => selfAvatar,
    // 셀프캠 후퇴 거리 — 때리기(bindHitTap) 레이캐스터가 3인칭 카메라 후퇴분을 사거리에
    // 더할 때 읽는다. 셀프캠 상수의 SSOT는 이 컨트롤러이므로 값 복제 대신 getter로 노출한다.
    getSelfCamDist: () => SELF_CAM_DIST,
  };
}
