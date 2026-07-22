// main-enterflow.js — handleEnter 안에서 "전시별 입장 세션 셋업"(mp 오케스트레이션이
//   아닌 도메인)을 main.js에서 추출한다: 멀티플레이 룸 키(roomSuffix) 산출 + 작가 리포트
//   통계(GalleryStats) 생성 + 2초 dwell 타이머(체류 통계 + 방명록 통계 갱신).
//
//   소유 판단(3차 myNickname 선례): stats는 handleEnter(생성·타이머)와 mpCtx.onVisitor
//   (addVisit) 두 곳에서만 참조된다. onVisitor 콜백 본체(visitorLog 등)는 main.js 도메인이라
//   잔류하고 stats 부분만 recordVisit()로 위임하면 되므로, stats 이전이 결합을 최소로 늘린다
//   → EnterFlow가 stats·statsDwellTimer를 SSOT로 소유. 반대로 startAmbient·startOnboarding·
//   entered·player.enable·connect·hideLobby·myNickname·selfInfo는 handleEnter에 잔류한다
//   (제스처 타이밍·입장 진입 계약·다수 게이트가 읽는 전역 — 옮기면 ambient/viewfx 두 도메인을
//   더 알게 되어 God 경향). C는 handleEnter 도메인만 만지고 animate 게임루프는 무수정.
//
//   ctx: 동적 참조(mp·방명록 노트 수)는 getter, UI(setGuestbookStats)는 값. GalleryStats·djb2·
//   getPlacedArtworks는 순수 leaf라 직접 import(자기완결). connect 실패(false) 시 handleEnter가
//   begin()을 호출하지 않으므로 stats/timer 미생성 경로는 원본 try/catch와 동치로 보존된다.

import { GalleryStats } from './stats.js';
import { djb2 } from './main-math.js';
import { getPlacedArtworks } from './artworks.js';

// main.js의 enterCtx가 주입하는 계약(사용 멤버만 최소 선언).
interface EnterFlowCtx {
  getMp(): { remoteAvatars: Map<string, { group: { position: { x: number; z: number } } }> } | null | undefined;
  getGuestbookNotesLength(): number;
  setGuestbookStats(summary: unknown): void;
}

export function createEnterFlow(ctx: EnterFlowCtx) {
  const {
    getMp,                    // getter — dwell 타이머가 원격 아바타 위치를 읽음
    getGuestbookNotesLength,  // getter — 방명록 통계에 노트 수 반영 (main.js 방명록 소유)
    setGuestbookStats,        // 값 — UI
  } = ctx;

  // --- 입장 세션 상태 SSOT (main.js에서 이전) ---
  let stats: GalleryStats | null = null;   // 작가 리포트 (전시별 방문·감상 통계 — stats.js)
  let statsDwellTimer: ReturnType<typeof setInterval> | null = null;

  // 전시별 멀티플레이 룸 키 — 같은 전시 링크로 들어온 사람끼리만 만난다.
  // 디렉터리 전시는 id, 공유 링크(#gd=/#gz=) 전시는 해시 데이터의 djb2 요약을 쓴다.
  // (connect의 roomId 재료 + stats 전시 키로 동일 규약 공유 — handleEnter가 받아서 쓴다.)
  function computeRoomSuffix(galleryInfo: { id?: string } | null | undefined) {
    return (galleryInfo && galleryInfo.id) || 'link-' + djb2(window.location.hash || '');
  }

  // connect 성공 후 handleEnter가 호출 — 작가 리포트 통계 + 2초 dwell 타이머 시작.
  // 전시 키는 룸 suffix와 동일 규약.
  function begin(roomSuffix: string) {
    stats = new GalleryStats(roomSuffix);
    if (statsDwellTimer) clearInterval(statsDwellTimer);
    statsDwellTimer = setInterval(() => {
      const mp = getMp();
      if (!mp || !stats) return;
      const humans: { x: number; z: number }[] = [];
      for (const [rid, av] of mp.remoteAvatars) {
        if (!rid.startsWith('npc-')) humans.push({ x: av.group.position.x, z: av.group.position.z });
      }
      stats.addDwell(humans, getPlacedArtworks(), 2);
      setGuestbookStats(stats.summary(getGuestbookNotesLength()));
    }, 2000);
  }

  // mpCtx.onVisitor 위임 — 원격 방문자 입장 시 방문 기록. 정상 경로(connect 성공 후에만
  // onVisitor가 발생 → stats는 이미 생성됨)에서는 stats?.addVisit(id) === stats.addVisit(id)로
  // 동작 무변경. connect 실패(혼자 관람 모드, begin 미호출 → stats=null)에서 콜백이 이론상
  // 도달해도 옵셔널 체이닝으로 무해 no-op — 검수관 권고(C-3(9) 우려1) 방어 심층 가드.
  function recordVisit(id: string) {
    stats?.addVisit(id);
  }

  return {
    computeRoomSuffix,
    begin,
    recordVisit,
  };
}
