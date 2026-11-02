export const CAO_BANG_CAMERA = {
  center: [106.2588, 22.6666] as [number, number],
  zoom: 9.2,
  minZoom: 5,
  maxZoom: 18,
} as const;

export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/bright";
