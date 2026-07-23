const YT_ID = /^[A-Za-z0-9_-]{11}$/;
function youtubeId(input) {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (YT_ID.test(s)) return s;
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  let id = null;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "www.youtube.com" || host === "youtube.com" || host === "m.youtube.com" || host === "www.youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
  } else return null;
  return id && YT_ID.test(id) ? id : null;
}
function embedUrl(id) {
  return YT_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : null;
}
function createYouTubeSurface(rawSrc, { width = 640, height = 360 } = {}) {
  const el = document.createElement("div");
  el.style.cssText = `position:relative;width:${width}px;height:${height}px;background:#0e0e16;overflow:hidden;border-radius:6px`;
  const id = youtubeId(rawSrc);
  if (!id) {
    el.innerHTML = '<div style="color:#6b6a78;font:13px sans-serif;display:grid;place-items:center;height:100%">\uC601\uC0C1 \uC5C6\uC74C</div>';
    return { el };
  }
  const btn = document.createElement("button");
  btn.type = "button";
  btn.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;cursor:pointer;background:#0e0e16;color:#e7e5ee;font:600 14px sans-serif;display:grid;place-items:center;gap:6px";
  btn.innerHTML = '<div style="font-size:34px">\u25B6</div><div>\uC720\uD29C\uBE0C \uC601\uC0C1 \uC7AC\uC0DD</div><div style="font:12px sans-serif;color:#9b99a8">\uD074\uB9AD\uD558\uBA74 YouTube\uC5D0\uC11C \uBD88\uB7EC\uC635\uB2C8\uB2E4</div>';
  btn.addEventListener("click", () => {
    const id2 = youtubeId(rawSrc);
    if (!id2) return;
    const iframe = document.createElement("iframe");
    iframe.src = embedUrl(id2) + "&autoplay=1";
    iframe.width = String(width);
    iframe.height = String(height);
    iframe.style.cssText = "position:absolute;inset:0;border:0;width:100%;height:100%";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
    iframe.setAttribute("allow", "encrypted-media; fullscreen; picture-in-picture; autoplay");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("title", "YouTube video");
    el.replaceChildren(iframe);
  });
  el.appendChild(btn);
  return { el };
}
export {
  YT_ID,
  createYouTubeSurface,
  embedUrl,
  youtubeId
};
