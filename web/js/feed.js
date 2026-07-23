const VISITOR_KEY = "lu-feed-visitors-v1";
const PHOTO_KEY = "lu-feed-photos-v1";
const MAX_VISITORS = 40;
const MAX_PHOTOS = 12;
const MAX_THUMB_BYTES = 12e4;
function makeId(prefix) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}
class JsonListStore {
  key;
  max;
  storage;
  constructor(key, max, storage) {
    this.key = key;
    this.max = max;
    this.storage = storage || (typeof localStorage !== "undefined" ? localStorage : null);
  }
  load() {
    if (!this.storage) return [];
    try {
      const raw = this.storage.getItem(this.key);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }
  merge(items) {
    const cur = this.load();
    const byId = new Map(cur.map((x) => [x.id, x]));
    for (const it of items || []) {
      if (it && typeof it.id === "string" && !byId.has(it.id)) byId.set(it.id, it);
    }
    const merged = [...byId.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, this.max);
    if (this.storage) {
      try {
        this.storage.setItem(this.key, JSON.stringify(merged));
      } catch (_) {
        try {
          this.storage.setItem(this.key, JSON.stringify(merged.slice(0, Math.ceil(this.max / 2))));
        } catch (_2) {
        }
      }
    }
    return merged;
  }
}
class VisitorLog {
  _store;
  constructor(storage) {
    this._store = new JsonListStore(VISITOR_KEY, MAX_VISITORS, storage);
  }
  add(nickname, galleryName) {
    return this._store.merge([
      {
        id: makeId("v"),
        name: String(nickname || "\uAC8C\uC2A4\uD2B8").slice(0, 20),
        g: String(galleryName || "").slice(0, 40),
        ts: Date.now()
      }
    ]);
  }
  list() {
    return this._store.load();
  }
}
function isValidPhotoItem(item) {
  return !!(item && typeof item.id === "string" && item.id.length <= 40 && typeof item.thumb === "string" && item.thumb.startsWith("data:image/jpeg;base64,") && item.thumb.length <= MAX_THUMB_BYTES);
}
class PhotoWall {
  _store;
  constructor(storage) {
    this._store = new JsonListStore(PHOTO_KEY, MAX_PHOTOS, storage);
  }
  /** 내 캡처 등록 → 병합된 항목(전파용) 반환 */
  addLocal(nickname, galleryName, thumbDataUrl) {
    const item = {
      id: makeId("p"),
      name: String(nickname || "\uAC8C\uC2A4\uD2B8").slice(0, 20),
      g: String(galleryName || "").slice(0, 40),
      thumb: String(thumbDataUrl || ""),
      ts: Date.now()
    };
    if (!isValidPhotoItem(item)) return null;
    this._store.merge([item]);
    return item;
  }
  /** 원격 전파 수신 — 검증 통과분만 병합 */
  addRemote(item) {
    if (!isValidPhotoItem(item)) return;
    this._store.merge([
      {
        id: item.id,
        name: String(item.name || "\uAC8C\uC2A4\uD2B8").slice(0, 20),
        g: String(item.g || "").slice(0, 40),
        thumb: item.thumb,
        ts: Number(item.ts) || Date.now()
      }
    ]);
  }
  list() {
    return this._store.load();
  }
}
export {
  PhotoWall,
  VisitorLog,
  isValidPhotoItem
};
