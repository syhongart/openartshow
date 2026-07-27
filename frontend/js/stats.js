const STATS_PREFIX = "lu-stats-v1-";
const DWELL_RADIUS = 3;
function todayKey() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function emptyStats() {
  return { totalVisits: 0, days: {}, dwell: {} };
}
class GalleryStats {
  key;
  _seen;
  data;
  _saveTimer;
  /** @param galleryKey - 전시별 키 (룸 suffix와 동일 규약) */
  constructor(galleryKey) {
    this.key = STATS_PREFIX + String(galleryKey || "default");
    this._seen = /* @__PURE__ */ new Set();
    this.data = emptyStats();
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          this.data = {
            totalVisits: parsed.totalVisits | 0,
            days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
            dwell: parsed.dwell && typeof parsed.dwell === "object" ? parsed.dwell : {}
          };
        }
      }
    } catch (_) {
    }
    this._saveTimer = null;
  }
  _save() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      try {
        localStorage.setItem(this.key, JSON.stringify(this.data));
      } catch (_) {
      }
    }, 2e3);
  }
  /** 새 방문자 관측 (원격 사람 아바타 생성 시 1회) */
  addVisit(visitorId) {
    if (!visitorId || this._seen.has(visitorId)) return;
    this._seen.add(visitorId);
    this.data.totalVisits += 1;
    const day = todayKey();
    this.data.days[day] = (this.data.days[day] | 0) + 1;
    const keys = Object.keys(this.data.days).sort();
    while (keys.length > 60) delete this.data.days[keys.shift()];
    this._save();
  }
  /**
   * 감상 체류 적립 — 주기 호출. 원격 사람 아바타들의 위치를 받아 가장 가까운
   * 작품(반경 내)에 seconds를 더한다.
   * @param humanPositions
   * @param artworks
   * @param seconds
   */
  addDwell(humanPositions, artworks, seconds) {
    if (!humanPositions || !humanPositions.length || !artworks || !artworks.length) return;
    let changed = false;
    for (const h of humanPositions) {
      let best = null;
      let bestD = DWELL_RADIUS;
      for (const art of artworks) {
        const d = Math.hypot(art.pos.x - h.x, art.pos.z - h.z);
        if (d < bestD) {
          bestD = d;
          best = art;
        }
      }
      if (best && best.title) {
        this.data.dwell[best.title] = (this.data.dwell[best.title] || 0) + seconds;
        changed = true;
      }
    }
    if (changed) this._save();
  }
  /** 방명록 패널용 요약 한 줄. guestbookCount는 호출부(main.js)가 넘긴다. */
  summary(guestbookCount) {
    const today = this.data.days[todayKey()] | 0;
    const parts = [`\uC624\uB298 \uBC29\uBB38 ${today}`, `\uB204\uC801 ${this.data.totalVisits}`];
    if (typeof guestbookCount === "number") parts.push(`\uBC29\uBA85\uB85D ${guestbookCount}`);
    const top = Object.entries(this.data.dwell).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 10) {
      const mins = top[1] >= 60 ? `${Math.round(top[1] / 60)}\uBD84` : `${Math.round(top[1])}\uCD08`;
      parts.push(`\uC778\uAE30\uC791 \u300C${top[0]}\u300D ${mins}`);
    }
    return parts.join(" \xB7 ");
  }
}
export {
  GalleryStats
};
