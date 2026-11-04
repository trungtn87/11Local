import type { Coordinates } from "../distance/distance-service";

export type NavigationDestination = Coordinates & {
  navigation_latitude?: number | null; navigation_longitude?: number | null;
};
export function getGoogleMapsDirectionsUrl(destination: NavigationDestination) {
  const nLat = destination.navigation_latitude;
  const nLng = destination.navigation_longitude;
  const validNav = typeof nLat === "number" && typeof nLng === "number" &&
    Number.isFinite(nLat) && Number.isFinite(nLng) &&
    nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
  const latitude = validNav ? nLat : destination.latitude;
  const longitude = validNav ? nLng : destination.longitude;
  // Deep-link to Google Maps; no self-hosted routing or Directions API billing.
  return "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(String(latitude) + "," + String(longitude));
}
