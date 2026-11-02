// OSM/OpenFreeMap chỉ làm basemap định hướng. Địa điểm hiển thị trên 11Local
// phải đến từ database 11Local, nên mọi layer POI của nguồn bản đồ bị loại ở đây.

export type StyleLayer = {
  id: string;
  type: string;
  source?: string;
  "source-layer"?: string;
  [key: string]: unknown;
};

export type StyleSpec = {
  layers: StyleLayer[];
  [key: string]: unknown;
};

// Source-layer của OpenMapTiles chứa địa điểm/doanh nghiệp (amenity, shop, tourism...).
const POI_SOURCE_LAYERS: ReadonlySet<string> = new Set([
  "poi",
  "aerodrome_label",
]);

// Layer id khớp mẫu POI phòng khi upstream đổi source-layer.
const POI_ID_PATTERN = /^poi[_-]|[_-]poi([_-]|$)/;

// Vùng tô màu gắn với loại địa điểm cụ thể (bệnh viện, trường học).
const POI_AREA_LAYER_IDS: ReadonlySet<string> = new Set([
  "landuse-hospital",
  "landuse-school",
]);

export function isPoiLayer(layer: StyleLayer): boolean {
  const sourceLayer = layer["source-layer"];

  return (
    (sourceLayer !== undefined && POI_SOURCE_LAYERS.has(sourceLayer)) ||
    POI_ID_PATTERN.test(layer.id) ||
    POI_AREA_LAYER_IDS.has(layer.id)
  );
}

export function sanitizeStyle<T extends StyleSpec>(style: T): T {
  return { ...style, layers: style.layers.filter((layer) => !isPoiLayer(layer)) };
}

export async function loadCleanStyle(
  styleUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<StyleSpec | string> {
  try {
    const response = await fetchImpl(styleUrl);
    if (!response.ok) {
      return styleUrl;
    }
    const style = (await response.json()) as StyleSpec;
    if (!Array.isArray(style.layers)) {
      return styleUrl;
    }
    return sanitizeStyle(style);
  } catch {
    // Fallback: dùng URL gốc; map-canvas sẽ gỡ POI sau khi style tải xong.
    return styleUrl;
  }
}
