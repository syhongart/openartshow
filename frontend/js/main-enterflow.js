import { GalleryStats } from "./stats.js";
import { djb2 } from "./main-math.js";
import { getPlacedArtworks } from "./artworks.js";
function createEnterFlow(ctx) {
  const {
    getMp,
    // getter — dwell 타이머가 원격 아바타 위치를 읽음
    getGuestbookNotesLength,
    // getter — 방명록 통계에 노트 수 반영 (main.js 방명록 소유)
    setGuestbookStats
    // 값 — UI
  } = ctx;
  let stats = null;
  let statsDwellTimer = null;
  function computeRoomSuffix(galleryInfo) {
    return galleryInfo && galleryInfo.id || "link-" + djb2(window.location.hash || "");
  }
  function begin(roomSuffix) {
    stats = new GalleryStats(roomSuffix);
    if (statsDwellTimer) clearInterval(statsDwellTimer);
    statsDwellTimer = setInterval(() => {
      const mp = getMp();
      if (!mp || !stats) return;
      const humans = [];
      for (const [rid, av] of mp.remoteAvatars) {
        if (!rid.startsWith("npc-")) humans.push({ x: av.group.position.x, z: av.group.position.z });
      }
      stats.addDwell(humans, getPlacedArtworks(), 2);
      setGuestbookStats(stats.summary(getGuestbookNotesLength()));
    }, 2e3);
  }
  function recordVisit(id) {
    stats?.addVisit(id);
  }
  return {
    computeRoomSuffix,
    begin,
    recordVisit
  };
}
export {
  createEnterFlow
};
