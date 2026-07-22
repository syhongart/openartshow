// @ts-nocheck — main.js 분해 3차(세 번째 군, 최종): 멀티플레이어(P2P) 오케스트레이션
// 컨트롤러 모듈화. strict 타입은 후속.
// main-multiplayer.js — MultiplayerManager 인스턴스(mp)의 "생성 · 콜백 배선 · 게임루프
//   tick(sendState/update) · 연결 직후 방명록 1회 동기화"를 main.js에서 추출한다. 투어·
//   셀프뷰 군과 동일한 "상태 소유권 이전 + tick 위임 + 조립점 재배선" 패턴이되, mp는 여러
//   도메인(방명록·채팅·통계·NPC·사진·아바타)의 허브라서 순수 이동이 아니라 main-events와
//   같은 "배선 오케스트레이션 + ctx 주입" 방식으로 분리한다. 즉 이 컨트롤러는 mp의 생명주기와
//   배선만 소유하고, 각 콜백의 도메인 본체(stats.addVisit·photoWall.addRemote·npcCrowd 등)는
//   ctx로 주입받아 호출한다 — 컨트롤러가 God object가 되지 않도록 경계를 도메인에 둔다.
//
//   소유 상태(이 클로저가 SSOT):
//     - mp: MultiplayerManager | null. 입장 전 null. getMp()로 노출하며, 입장 후 main.js의
//           격리 로직(hit tap·npc culling·채팅·방명록·아바타 변경·몸충돌)이 getMp()로 읽고
//           각자 null 가드한다. tick은 mp가 null이면 즉시 no-op(입장 전 게임루프 안전).
//     - guestbookSentOnce: 연결이 처음 성립되는 순간('호스트로 개설됨'/'접속됨…')에 로컬
//           방명록 전체를 1회만 전송하기 위한 플래그. 순수 mp 연결 생명주기 상태라 컨트롤러가
//           소유한다(방명록 노트 자체는 main.js 방명록 도메인 소유 — getGuestbookNotes로 읽음).
//
//   main.js에 남는 것(경계): 입장 로직 자체(myNickname·selfInfo·entered·player 활성화·UI
//     전환)는 핵심 초기화라 잔류하고, 이 컨트롤러의 connect()를 호출만 한다. myNickname도
//     main.js 소유 유지 — 입장·채팅·방명록·사진 4개 도메인이 쓰고 여기로 옮겨지는 콜백은 아무도
//     쓰지 않으므로, 컨트롤러로 끌어오면 결합만 늘어난다(SSOT는 main.js 한 곳 유지). 통계
//     (stats·statsDwellTimer)와 NPC(npcCrowd)도 mp 오케스트레이션이 아닌 별개 도메인이라
//     main.js에 남고, 콜백 본체를 ctx로 주입한다.
//
//   ctx 주입 규율(투어·셀프뷰·사진 군과 동일): 재대입되는 module-scope let(scene·player)은
//     값 캡처가 아니라 ctx의 getter로 매 호출 읽어 stale 참조를 원천 차단한다. 안정 참조
//     (setStatus)와 도메인 콜백 본체(onVisitor·onPhoto·onChat·onPlayerCount·onRemoteGuestbook·
//     onSelfHit·onNpcHit·npcProvider)는 값으로 주입받는다. MultiplayerManager 생성자 인자
//     계약(new MultiplayerManager(scene, { nickname, color, char, roomId }))과 각 콜백 시그니처는
//     원본과 1바이트 동치를 유지한다.
//
//   조립점 재배선(main.js): 사진 컨트롤러(main-photo.js)의 photoCtx.getMp와 이벤트 핸들러
//     (main-events.js)의 eventsCtx.getMp를 () => multiplayerController.getMp()로 재배선한다
//     (mp 소유가 이 컨트롤러로 이전됨 — 조립점이 중재, 두 파일 무수정). getMyNickname은
//     myNickname이 main.js 소유로 남으므로 재배선하지 않는다.
import { MultiplayerManager } from './multiplayer.js';

export function createMultiplayerController(ctx) {
  const {
    getScene,
    getPlayer,
    setStatus,
    getGuestbookNotes,
    onVisitor,
    onPhoto,
    onChat,
    onPlayerCount,
    onRemoteGuestbook,
    onSelfHit,
    onNpcHit,
    npcProvider,
  } = ctx;

  let mp = null; // MultiplayerManager — 입장(connect) 전에는 null
  let guestbookSentOnce = false; // 연결 성공 직후 로컬 방명록을 1회만 전송하기 위한 플래그

  // mp.onStatus 래퍼 — 상태 표시는 그대로 위임하되, 연결이 처음 성립되는 시점
  // ('호스트로 개설됨' 또는 '접속됨(게스트)')에 로컬 방명록 전체를 1회만 전송한다.
  // 방명록 노트는 main.js 소유이므로 getGuestbookNotes()로 읽는다.
  function handleMultiplayerStatus(statusText) {
    setStatus(statusText);
    if (guestbookSentOnce || !mp) return;
    if (statusText === '호스트로 개설됨' || statusText.startsWith('접속됨')) {
      guestbookSentOnce = true;
      try {
        mp.sendGuestbook(getGuestbookNotes());
      } catch (err) {
        console.error('방명록 동기화 전송 실패:', err);
      }
    }
  }

  // 입장(enter) 흐름이 호출 — mp 생성 + 전체 콜백 배선 + 피어 연결 시작을 한 단위로 캡슐화한다.
  // 원본 handleEnter try/catch 블록의 mp 부분과 1:1 대응한다. 콜백 본체는 ctx로 주입받은
  // 도메인 함수를 호출한다(배선만 이 컨트롤러 책임, 로직은 main.js 도메인). roomId는 main.js가
  // PEER_ROOM_ID+roomSuffix로 합성해 넘긴다(통계 키가 동일 suffix를 공유하므로 조립점에서 계산).
  // 반환값: 연결 성공 여부(false면 main.js가 '혼자 관람 모드' 안내를 띄운다).
  function connect({ nickname, color, char, roomId }) {
    try {
      mp = new MultiplayerManager(getScene(), { nickname, color, char, roomId });
      mp.onVisitor = (id, info) => onVisitor(id, info);
      mp.onPhoto = (item) => onPhoto(item);
      // onChat은 원격 메시지 전용 (자기 메시지는 handleChatSend가 로컬 표시,
      // 에코는 senderId 필터로 차단됨) — 닉네임이 겹쳐도 안전
      mp.onChat = (name, text) => onChat(name, text);
      mp.onPlayerCount = (n) => onPlayerCount(n);
      mp.onStatus = handleMultiplayerStatus;
      mp.onGuestbook = (notes) => onRemoteGuestbook(notes);
      // 내가 맞았을 때 / NPC가 맞았을 때 — 본체는 main.js 도메인(셀프 아바타·npcCrowd)
      mp.onSelfHit = (level) => onSelfHit(level);
      mp.onNpcHit = (id, level, hitter) => onNpcHit(id, level, hitter);
      // AI 관객 — 호스트가 된 클라이언트만 mp.update()가 매 프레임 npcProvider를 호출한다.
      // 지연 생성·NpcCrowd 소유는 main.js(npcProvider 본체) 책임.
      mp.npcProvider = (delta, humans) => npcProvider(delta, humans);
      mp.connect();
      return true;
    } catch (err) {
      console.error('멀티플레이어 초기화 실패:', err);
      mp = null;
      return false;
    }
  }

  // 게임루프 위임 — 입장 전(mp=null)이면 즉시 no-op(원본 `if (mp)` 가드와 동치).
  // 매 프레임 호출이므로 내부 객체 할당은 없다(player.getState()만 원본 그대로).
  function tick(delta) {
    if (!mp) return;
    mp.sendState(getPlayer().getState());
    mp.update(delta);
  }

  // 입장 전에는 null. main.js 격리 로직·photoCtx·eventsCtx가 이 getter로 읽고 각자 null 가드한다.
  function getMp() {
    return mp;
  }

  return { connect, tick, getMp };
}
