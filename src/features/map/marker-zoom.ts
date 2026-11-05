/**
 * Consistent marker label density across 11Local maps.
 * On wide-area views we retain the category pins but hide text labels.
 */
export const PLACE_LABEL_MIN_ZOOM = 13;

type ZoomMap = {
  getZoom(): number;
  getContainer(): { classList: { toggle(token: string, force: boolean): void; remove(token: string): void } };
  on(type: "zoom", listener: () => void): unknown;
  off(type: "zoom", listener: () => void): unknown;
};

const compactClass = "local-place-labels-compact";

export function shouldShowPlaceNames(zoom: number): boolean {
  return Number.isFinite(zoom) && zoom >= PLACE_LABEL_MIN_ZOOM;
}

export function attachPlaceLabelZoom(map: ZoomMap): () => void {
  const container = map.getContainer();
  const update = () => {
    container.classList.toggle(compactClass, !shouldShowPlaceNames(map.getZoom()));
  };
  update();
  map.on("zoom", update);
  return () => {
    map.off("zoom", update);
    container.classList.remove(compactClass);
  };
}
