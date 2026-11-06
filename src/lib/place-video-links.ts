/** Strict URL parsing for editorial video links. Never store arbitrary iframe HTML. */
export type VideoProvider = "tiktok" | "facebook" | "youtube";
export type ParsedVideoLink = {
  provider: VideoProvider;
  sourceUrl: string;
  normalizedKey: string;
  embedUrl: string | null;
};
const YT_ID = /^[a-zA-Z0-9_-]{11}$/;
const TIKTOK_ID = /^\d{10,30}$/;

export function parsePlaceVideoLink(raw: unknown): ParsedVideoLink {
  if (typeof raw !== "string" || raw.trim().length > 1024) throw new Error("INVALID_VIDEO_URL");
  let u: URL;
  try { u = new URL(raw.trim()); }
  catch { throw new Error("INVALID_VIDEO_URL"); }
  if (u.protocol !== "https:" || u.username || u.password || u.port || u.hostname.endsWith(".")) {
    throw new Error("INVALID_VIDEO_URL");
  }
  const host = u.hostname.toLowerCase();
  u.hash = "";
  // Remove harmless share/tracking parameters; keep video identity parameters when necessary.
  if (["youtu.be", "youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
    const id = host === "youtu.be" ? u.pathname.split("/")[1]
      : u.pathname === "/watch" ? u.searchParams.get("v")
      : /^\/(shorts|live|embed)\//.test(u.pathname) ? u.pathname.split("/")[2] : null;
    if (!id || !YT_ID.test(id)) throw new Error("UNSUPPORTED_VIDEO_LINK");
    return { provider: "youtube", sourceUrl: "https://www.youtube.com/watch?v=" + id,
      normalizedKey: "youtube:" + id, embedUrl: "https://www.youtube-nocookie.com/embed/" + id };
  }
  if (["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(host)) {
    const match = u.pathname.match(/^\/@[^/]+\/video\/(\d{10,30})(?:\/|$)/) ||
      u.pathname.match(/^\/player\/v1\/(\d{10,30})(?:\/|$)/);
    if (match && TIKTOK_ID.test(match[1])) {
      return { provider: "tiktok", sourceUrl: "https://www.tiktok.com/player/v1/" + match[1],
        normalizedKey: "tiktok:" + match[1],
        embedUrl: "https://www.tiktok.com/player/v1/" + match[1] };
    }
    // Short TikTok shares are intentionally link-only until a full post URL is supplied.
    if (["vt.tiktok.com", "vm.tiktok.com"].includes(host) &&
      /^\/[a-zA-Z0-9_-]{4,50}\/?$/.test(u.pathname)) {
      return { provider: "tiktok", sourceUrl: "https://" + host + u.pathname,
        normalizedKey: "tiktok-short:" + host + u.pathname, embedUrl: null };
    }
    throw new Error("UNSUPPORTED_VIDEO_LINK");
  }
  if (["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.watch", "fb.com"].includes(host)) {
    if (host === "fb.watch") {
      if (!/^\/[a-zA-Z0-9_-]{3,80}\/?$/.test(u.pathname)) throw new Error("UNSUPPORTED_VIDEO_LINK");
      return { provider: "facebook", sourceUrl: "https://fb.watch" + u.pathname,
        normalizedKey: "facebook:fb.watch" + u.pathname, embedUrl: null };
    }
    const video = /\/(videos|reel|reels|share\/v|share\/r)\//.test(u.pathname) ||
      (u.pathname === "/watch/" || u.pathname === "/watch") && Boolean(u.searchParams.get("v"));
    const post = /\/(posts|permalink|share\/p)\//.test(u.pathname) ||
      u.pathname === "/permalink.php" && Boolean(u.searchParams.get("story_fbid"));
    if (!video && !post) throw new Error("UNSUPPORTED_VIDEO_LINK");
    const link = new URL("https://www.facebook.com" + u.pathname);
    if (u.searchParams.has("v") && /\/watch\/?$/.test(u.pathname)) link.searchParams.set("v", u.searchParams.get("v")!);
    if (u.pathname === "/permalink.php") {
      for (const key of ["story_fbid", "id"]) {
        const value = u.searchParams.get(key);
        if (value) link.searchParams.set(key, value);
      }
    }
    const src = link.toString();
    const plugin = video ? "video.php" : "post.php";
    return { provider: "facebook", sourceUrl: src, normalizedKey: "facebook:" + src,
      embedUrl: "https://www.facebook.com/plugins/" + plugin + "?href=" + encodeURIComponent(src) + "&show_text=false&width=560" };
  }
  throw new Error("UNSUPPORTED_VIDEO_LINK");
}

export function publicVideoEmbed(source: unknown): string | null {
  try { return parsePlaceVideoLink(source).embedUrl; } catch { return null; }
}
