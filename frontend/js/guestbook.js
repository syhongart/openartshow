const MAX_NOTES = 200;
const MAX_TEXT_LEN = 120;
function storageKey(galleryId) {
  return `lu-guestbook-${galleryId ?? "shared"}`;
}
function loadNotes(galleryId) {
  try {
    const raw = localStorage.getItem(storageKey(galleryId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => n && typeof n === "object" && typeof n.id === "string");
  } catch (e) {
    return [];
  }
}
function saveNotes(galleryId, notes) {
  const sorted = [...notes].sort((a, b) => b.ts - a.ts).slice(0, MAX_NOTES);
  try {
    localStorage.setItem(storageKey(galleryId), JSON.stringify(sorted));
  } catch (e) {
  }
}
function mergeNotes(a, b) {
  const map = /* @__PURE__ */ new Map();
  for (const n of [...a, ...b]) {
    if (!n || typeof n.id !== "string") continue;
    map.set(n.id, n);
  }
  return Array.from(map.values()).sort((x, y) => y.ts - x.ts);
}
function makeNote(name, text) {
  return {
    id: randomHexId(8),
    name: String(name || "\uC775\uBA85").slice(0, 40),
    text: String(text || "").slice(0, MAX_TEXT_LEN),
    ts: Date.now()
  };
}
function randomHexId(len) {
  const bytes = new Uint8Array(Math.ceil(len / 2));
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}
export {
  loadNotes,
  makeNote,
  mergeNotes,
  saveNotes
};
