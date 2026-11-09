export type StyleLayer = { id: string; type: string; source?: string; "source-layer"?: string; [key: string]: unknown };
export type StyleSpec = { layers: StyleLayer[]; [key: string]: unknown };

// Preserve the provider's full style. POIs (restaurants, attractions,
// schools, hospitals), settlements, boundaries and road labels should all
// remain visible at their provider-configured zoom thresholds.
export async function loadFullStyle(url: string, fetcher: typeof fetch = fetch): Promise<StyleSpec | string> {
  try {
    const response = await fetcher(url);
    if (!response.ok) return url;
    const style = await response.json() as StyleSpec;
    return Array.isArray(style.layers) ? style : url;
  } catch {
    // MapLibre loads this style itself if cross-origin prefetch is not allowed.
    return url;
  }
}
