import { MultiplayerManager } from "./multiplayer.js";
function createMultiplayerController(ctx) {
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
    npcProvider
  } = ctx;
  let mp = null;
  let guestbookSentOnce = false;
  function handleMultiplayerStatus(statusText) {
    setStatus(statusText);
    if (guestbookSentOnce || !mp) return;
    if (statusText === "\uD638\uC2A4\uD2B8\uB85C \uAC1C\uC124\uB428" || statusText.startsWith("\uC811\uC18D\uB428")) {
      guestbookSentOnce = true;
      try {
        mp.sendGuestbook(getGuestbookNotes());
      } catch (err) {
        console.error("\uBC29\uBA85\uB85D \uB3D9\uAE30\uD654 \uC804\uC1A1 \uC2E4\uD328:", err);
      }
    }
  }
  function connect({ nickname, color, char, roomId }) {
    try {
      mp = new MultiplayerManager(
        getScene(),
        { nickname, color, char, roomId }
      );
      mp.onVisitor = (id, info) => onVisitor(id, info);
      mp.onPhoto = (item) => onPhoto(item);
      mp.onChat = (name, text) => onChat(name, text);
      mp.onPlayerCount = (n) => onPlayerCount(n);
      mp.onStatus = handleMultiplayerStatus;
      mp.onGuestbook = (notes) => onRemoteGuestbook(notes);
      mp.onSelfHit = (level) => onSelfHit(level);
      mp.onNpcHit = (id, level, hitter) => onNpcHit(id, level, hitter);
      mp.npcProvider = (delta, humans) => npcProvider(delta, humans);
      mp.connect();
      return true;
    } catch (err) {
      console.error("\uBA40\uD2F0\uD50C\uB808\uC774\uC5B4 \uCD08\uAE30\uD654 \uC2E4\uD328:", err);
      mp = null;
      return false;
    }
  }
  function tick(delta) {
    if (!mp) return;
    mp.sendState(getPlayer().getState());
    mp.update(delta);
  }
  function getMp() {
    return mp;
  }
  return { connect, tick, getMp };
}
export {
  createMultiplayerController
};
